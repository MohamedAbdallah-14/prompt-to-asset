---
category: 01-prompt-engineering-theory
angle: 1d
angle_title: Prompt weighting syntax across ecosystems
last_updated: 2026-04-19
primary_sources:
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/2905
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py
  - https://github.com/damian0815/compel/blob/main/doc/syntax.md
  - https://huggingface.co/docs/diffusers/v0.22.1/en/using-diffusers/weighted_prompts
  - https://deepwiki.com/comfyanonymous/ComfyUI/6.3-embeddings-and-prompt-weighting
  - https://docs.comfy.org/built-in-nodes/ClipTextEncode
  - https://docs.comfy.org/built-in-nodes/ClipTextEncodeFlux
  - https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb
  - https://github.com/vladmandic/sdnext/wiki/Prompting
  - https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights
  - https://docs.midjourney.com/docs/stylize
  - https://arxiv.org/abs/2410.02416
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/2305
---

# 1d · Prompt weighting syntax across ecosystems

## Executive Summary

Prompt weighting is **not one feature** — it is a family of pre-encoder text parsers that each do something different to the token embeddings that feed a diffusion model's cross-attention layers. The same surface string can produce very different conditioning depending on which ecosystem parsed it, because the ecosystems disagree on three questions: (1) what does a weight multiply (the token embedding, the full sequence hidden state, or an interpolation coefficient against a neutral embedding?), (2) is weighting applied in the text encoder input space or in the cross-attention output space, and (3) how do multi-token words, the 77-token CLIP window, and secondary encoders (T5-XXL, CLIP-G, LLMs) interact with it?

A1111 and its direct descendants (SD.Next "Native", most UI forks) scale the per-token embedding vector by a scalar multiplier after the transformer pass. ComfyUI instead **lerps between the real prompt embedding and an empty-prompt embedding**, so `weight=0` collapses to the unconditional branch instead of zeroing the vector. Compel (and therefore InvokeAI and diffusers' `prompt_embeds` path) adds a fourth mode: up-weighting scales the embedding, but down-weighting is implemented as a **masked blend**, producing a smoother falloff than simple division. Midjourney is an outlier — it exposes no in-prompt `(:w)` syntax at all; its "weights" are either `concept::w` *multi-prompts* (which split the prompt into independently-encoded fragments and blend them in latent space) or global creativity knobs (`--stylize`, `--chaos`, `--weird`). Flux has effectively no community consensus yet because the T5-XXL path is not a 77-token CLIP and most parsers only weight the CLIP-L keyword tube; heavy weights behave unpredictably.

The practical consequence for a prompt-enhancement tool is that a weight like `(red:1.5)` is **portable in surface form but not in meaning** — any system that accepts it will render it differently, and for Midjourney it has to be rewritten as `red::1.5` plus a balancing term. Any enhancer that emits weighted syntax must track (ecosystem, model family, parser) as a triple, not pick "a syntax" up front.

## Key Findings

### 1. Four distinct "what does weight mean" models

| Ecosystem / parser | Surface syntax | What the weight does to the conditioning | Reference |
|---|---|---|---|
| A1111 / SD.Next Native | `(word)`, `(word:1.3)`, `[word]` (÷1.1), `\(` escape | Finds the token index for `word`, multiplies that slice of the `(77, 768)` hidden state by the weight **after** the CLIP transformer pass | A1111 discussion #2905; `prompt_parser.parse_prompt_attention` |
| ComfyUI default (`comfy`) | `(word:1.2)`, `(word)` = 1.1 | Encodes the prompt twice — once real, once empty/padded — and **lerps** the two at `weight` per token. `weight=0` → unconditional embedding, not a zero vector | ComfyUI DeepWiki 6.3; `comfy/sd1_clip.py` `ClipTokenWeightEncoder` |
| Compel / InvokeAI / diffusers | `word+`, `word++`, `word-`, `(phrase)1.3`, `.blend()`, `.and()` | Up-weight ≈ A1111 scaling; **down-weight is a masked blend** against the "prompt without that word"; `.and()` encodes fragments independently and concatenates conditioning | compel `doc/syntax.md`; HF diffusers `weighted_prompts` |
| Midjourney | `a:: b::0.5`, `--stylize`, `--chaos`, `--weird`, `--no` (= `::-0.5`) | No per-word attention scaling. `::w` runs each fragment as a **separately conditioned prompt** and blends at the latent level; `--stylize/--chaos/--weird` are global sampler knobs | Midjourney docs: Multi-Prompts & Weights, Stylize |

### 2. The CLIP-embedding-scaling mechanism (A1111 canonical)

zwishenzug's canonical explanation (cited widely in the A1111 codebase): the string is tokenized to ~77 integer IDs, embedded to a `(77, 768)` tensor, run through the CLIP transformer, then the parser locates the index span that corresponds to the weighted word and multiplies that span by `1.1^n` (for `(((x)))`) or by the explicit number (for `(x:1.5)`). Nesting is multiplicative: `((a dog:1.5) with a (bone:1.5):1.5)` → `(a dog:3.375) (with a bone:2.25)` per the SD.Next wiki.

Because the scaling happens after the transformer, the attention mechanism inside CLIP sees the **unweighted** prompt; the downstream U-Net cross-attention is what actually "hears" the boosted vector. That is why stacking weights past ≈ 1.5–2.0 starts to distort composition globally rather than just enlarging the weighted concept (A1111 discussion #6325): the U-Net's cross-attention softmax sees a vector with unusually large norm, which pulls key/query dot products out of distribution.

### 3. ComfyUI's lerp-against-empty trick

From DeepWiki on `comfy/sd1_clip.py`: weights are applied via `out = z_empty + weight * (z - z_empty)` where `z` is the encoded prompt and `z_empty` is the encoded empty-string/padding sequence. Consequences:

- `weight = 0` gives the unconditional embedding, not zero — so `(word:0)` is roughly equivalent to omitting the word, not to violently suppressing it.
- `weight > 1` **extrapolates** past the real embedding, which is why ComfyUI's high weights feel "softer" than A1111's at the same number.
- ComfyUI also exposes the `embedding:name` syntax for textual inversion and has `<lora:...>` support via custom parsers (native Comfy uses a separate `Load LoRA` node).

The `ComfyUI_ADV_CLIP_emb` custom node (BlenderNeko) surfaces this directly with a `weight_interpretation` enum: `comfy` (default lerp), `A1111` (scale-by-weight), `compel` (masked down-weight), `comfy++` (lerp per-word presence/absence), `down_weight` (rescale so max=1). It is the de facto compatibility layer.

### 4. Compel's asymmetric weighting

Compel (Damian Stewart) is the library diffusers recommends for weighted prompts. Its suffix syntax is ergonomic:

- `word+` = ×1.1, `word++` = ×1.1² = ×1.21, `word-` = ×0.9, `word---` = ×0.9³.
- `(phrase)1.3` gives explicit numeric weight between ~0 and ~2.
- `.and()` takes a list of fragments and encodes each independently (bypassing the 77-token shared window), then concatenates conditioning and diffuses each per step.
- `.blend(w1, w2, ...)` does weighted sum in embedding space (by default normalized).

Compel's distinctive choice: **down-weighting is a masked blend, not a simple division**. Dividing an embedding by 2 pushes the vector toward the origin, which the U-Net interprets as "low-content" rather than "less of this concept." Compel instead blends `embed(prompt)` with `embed(prompt with word masked out)` at the per-token level, giving a smoother "less of X" effect. This is why InvokeAI and diffusers both standardize on compel and why ComfyUI_ADV_CLIP_emb offers `compel` and `comfy++` as distinct options.

### 5. Midjourney is structurally different

Midjourney does not expose the text encoder and has no per-token weighting. Its two related features:

- **Multi-prompts with `::`** — `space:: ship::0.5` tells the sampler to condition on "space" and "ship" as two independent prompts blended with weights `1` and `0.5`. Constraint: the sum of all weights **must be positive** or the job errors out. `--no red` is syntactic sugar for `:: red::-0.5`. Available on v4, Niji 4/5, 5, 5.1, 5.2, 6, 6.1 (decimal weights) and v1–3 (integers only).
- **Global creativity parameters** — `--stylize N` (default 100, range 0–1000) controls how much the house aesthetic overrides literal prompt adherence; `--chaos N` (0–100) randomizes across the initial grid; `--weird N` (0–3000) injects unusual aesthetics. These are sampler-level, not token-level.

For a prompt enhancer, the translation `(red:1.5)` → Midjourney is **not** `red::1.5` in isolation (that would make `red` dominant over the default-weighted rest of the prompt). It is `<original prompt>:: red::0.5` or a rewrite that keeps the prompt body at higher cumulative weight than the boosted concept.

### 6. Flux and long-context encoders break the old syntax

Flux.1 uses T5-XXL for the main conditioning stream and CLIP-L only for the pooled output. T5 has ~512 useful tokens in the default ComfyUI `CLIPTextEncodeFlux` node, while CLIP-L is still capped at 77. This has two direct effects on weighting:

- Parentheses-style weights in the `t5xxl` input are parsed by ComfyUI's tokenizer but the T5 encoder is less sensitive to them than CLIP — T5 was trained on natural-language spans, not SD-style tag lists, and scaling a single token's hidden state in a 4096-dim T5 output has smaller semantic impact than the same operation on a 768-dim CLIP-L vector.
- The community convention on Flux has shifted toward **natural-language descriptive prompts in `t5xxl`** and **comma-separated keywords in `clip_l`**, with weighting used sparingly on the CLIP-L side. SD.Next ships an `xHinker` parser specifically for T5-aware prompting.

SD3 has the same shape (CLIP-L + CLIP-G + optional T5), and SD.Next's wiki explicitly warns against attention modifiers on SD3, recommending "very descriptive language and completely stop using styles, keywords and attention-modifiers" because SD3's training replaced rather than augmented its captions.

### 7. LoRA tags are a different kind of "weight"

`<lora:filename:weight>` is an A1111 extension syntax, **not** attention weighting — the LoRA loader strips the tag from the prompt before it reaches the text encoder, then applies the LoRA's delta weights to the U-Net (and optionally the text encoder) scaled by `weight`. ComfyUI's native path uses a `Load LoRA` node with separate `strength_model` and `strength_clip` scalars. Some extensions (e.g., ComfyUI-Coziness `MultiLora Loader`, `comfyui-prompt-control`) re-expose the A1111 tag syntax and add features: dual weights `<lora:name:1.0:0.5>`, scheduling `[::0.25]`, trigger-word injection.

Mixing LoRA weight with attention weight is a common bug surface. `(<lora:x:1.0>:1.2)` does not "boost the LoRA" — the parser will either treat the whole token as a word (nonsense) or strip the LoRA tag first and apply 1.2 to an empty span.

## Concrete Prompt Examples

### Example 1 — same concept, four ecosystems

Goal: emphasize "red" ×1.5 on the subject "cat".

```text
# A1111 / SD.Next Native
a (red:1.5) cat playing with a ball

# ComfyUI default encoder (lerp semantics — same surface form but softer effect)
a (red:1.5) cat playing with a ball

# Compel / InvokeAI / diffusers
a red++ cat playing with a ball         # ×1.21, close to 1.5 in perceptual impact
a (red)1.5 cat playing with a ball      # explicit, asymmetric down-weight semantics

# Midjourney (must rewrite — there is no per-word weight)
a cat playing with a ball:: red::0.5    # adds red as a secondary-weighted concept
```

### Example 2 — prompt scheduling and alternation (A1111)

```text
# Switch from prompt_a to prompt_b at 50% of steps
[a dog:a wolf:0.5] in a forest

# Alternate every step
a [dog|wolf] in a forest

# Combining emphasis with alternation: [[dog|cat]] de-emphasizes both alternates
portrait of [[dog|cat]], studio lighting
```

### Example 3 — compel blend and conjunction vs. naive concatenation

```python
from compel import Compel
compel = Compel(tokenizer=pipe.tokenizer, text_encoder=pipe.text_encoder)

# Blend: weighted sum of two prompt embeddings (breaks 77-token window per prompt)
prompt = '("spider man", "robot mech").blend(1, 0.8)'

# Conjunction: each fragment is encoded independently and diffused independently,
# sidestepping the shared 77-token budget
prompt = '("A dream of a distant galaxy, by Caspar David Friedrich, matte painting", '\
         '"trending on artstation, HQ").and()'

conditioning = compel(prompt)
```

### Example 4 — Flux dual-encoder with minimal weighting

```text
# CLIPTextEncodeFlux node:
clip_l:  masterpiece, best quality, portrait, oil painting, dramatic lighting
t5xxl:   A highly detailed portrait in oil painting style, featuring dramatic
         chiaroscuro lighting that creates deep shadows and bright highlights,
         emphasizing the subject's features with renaissance-inspired composition.
guidance: 3.5
```

Weighting is intentionally absent on the T5 side; emphasis is achieved through descriptive phrasing and ordering rather than `()`-scaling.

### Example 5 — Midjourney multi-prompt with negative weight

```text
still life painting:: fruit::-0.5 --stylize 250 --chaos 10
# Equivalent to: still life painting --no fruit --stylize 250 --chaos 10
# Constraint: sum of weights (1 + -0.5 = 0.5) must be > 0
```

### Example 6 — A1111 BREAK for chunked 77-token windows

```text
close-up portrait of a woman, soft lighting, shallow depth of field
BREAK
wearing a red silk dress, gold jewelry, standing in a neon-lit Tokyo alley
BREAK
photorealistic, 4k, award-winning photography
```

Each `BREAK` pads to the next 75-token chunk boundary; CLIP encodes each chunk separately and the hidden states are concatenated. This is the canonical way to avoid "concept bleeding" across long prompts in A1111-family UIs.

## Known Failures & Artifacts

### F1 — Over-weighting collapse ("overbaked" images)

Symptom: at weights ≥ 2 (A1111 multiplicative scaling), and reliably at ≥ 4, images saturate, blur, or produce mangled anatomy; the boosted concept "blows away almost all other prompt weights" (A1111 discussion #6325). Root cause: Disney Research's 2024 paper "Eliminating Oversaturation and Artifacts of High Guidance Scales" (arXiv 2410.02416) shows that the parallel component of the CFG update with respect to the conditional prediction is what produces oversaturation; any mechanism that inflates the conditional signal (prompt weighting, high CFG, both together) drives the latent update further along that axis. Practical mitigations: keep weights in 0.7–2.0; prefer compel-style masked down-weighting to division; use Adaptive Projected Guidance (APG) where available.

### F2 — Multi-token words and tokenizer fragmentation

Symptom: `(pomegranate:1.4)` feels weaker than `(apple:1.4)`. Root cause: BPE tokenization splits "pomegranate" into multiple subword tokens; the A1111 parser applies the multiplier to **every** token in the span, but each per-token impact on CLIP's final pooled/hidden state is smaller than a single-token word. Compel normalizes by span length; ComfyUI_ADV_CLIP_emb offers `token_normalization = length` / `mean` / `length+mean` to correct this. A1111 does not normalize by default, so rare multi-token concepts are systematically under-weighted relative to common single-token ones.

### F3 — Negative-weight collapse in A1111 vs. graceful falloff in compel

Symptom: `(red:0.3)` in A1111 produces a desaturated-globally image, not "less red"; compel's `red---` gives a cleaner "less red" effect. Root cause: A1111 divides the token embedding by the weight, pushing the CLIP vector toward the origin; the U-Net interprets low-norm embeddings as "generic/uncommitted" for that slot rather than "not this concept." Compel masks the token and blends against the reduced prompt, keeping the other slots' semantics intact. Same failure class shows up in ComfyUI when users switch `weight_interpretation` from `comfy` (lerp-to-empty) to `A1111`.

### F4 — 77-token silent truncation

Symptom: words near the end of a long prompt have no effect. Root cause: CLIP's hard 77-token cap (75 content + start/end specials). A1111, SD.Next, and compatible tools silently truncate or chunk; vanilla diffusers just truncates. BREAK, compel `.and()`, long-CLIP custom nodes, and Flux's T5 path all exist specifically to route around this. Enhancers that emit long, heavily weighted prompts will see their tail weights disappear without error.

### F5 — LoRA-tag/attention-tag collision

Symptom: `(<lora:styleA:0.8>:1.2)` either errors or silently drops the LoRA. Root cause: most parsers remove `<lora:...>` tags *before* attention parsing, so the outer `(:1.2)` wraps an empty substring. ComfyUI's native path avoids this by separating LoRA loading from the prompt entirely; `comfyui-prompt-control` supports step-scheduled LoRA weights as a distinct syntax `[::0.25]`.

### F6 — Midjourney weight-sum negativity

Symptom: `--no red` combined with aggressive `red::-1.5` returns an error. Root cause: Midjourney requires the sum of all multi-prompt weights to be strictly positive, and `--no X` adds a `-0.5` contribution. Enhancers that mix `--no` and explicit negative `::` weights must track cumulative weight.

## Tools, Libraries, Code

- **compel** ([github.com/damian0815/compel](https://github.com/damian0815/compel)) — reference implementation for weighted/blended prompts in the diffusers stack. `CompelForSD`, `CompelForSDXL`, `.blend()`, `.and()`, `DiffusersTextualInversionManager`.
- **ComfyUI_ADV_CLIP_emb** ([github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb](https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb)) — ComfyUI node exposing `weight_interpretation` (`comfy`, `A1111`, `compel`, `comfy++`, `down_weight`) and `token_normalization` (`none`, `mean`, `length`, `length+mean`). The de facto compatibility layer if you want to emit prompts readable by code that expects a different parser.
- **A1111 `modules/prompt_parser.py`** — canonical reference for `parse_prompt_attention`, the `(…:w)` grammar, prompt editing `[a:b:N]`, alternation `[a|b]`, and BREAK handling.
- **`comfy/sd1_clip.py::ClipTokenWeightEncoder`** — canonical reference for the lerp-against-empty weighting implementation.
- **SD.Next `Prompting` wiki** ([github.com/vladmandic/sdnext/wiki/Prompting](https://github.com/vladmandic/sdnext/wiki/Prompting)) — documents the four parser modes (`Native`, `A1111`, `Compel`, `xHinker`) and model-specific prompting guidance for SD15, SDXL, SD3, Flux.
- **diffusers `weighted_prompts` guide** — official HF documentation pointing to compel as the canonical weighting path; shows the SDXL dual-tokenizer setup with `ReturnedEmbeddingsType.PENULTIMATE_HIDDEN_STATES_NON_NORMALIZED`.
- **comfyui-prompt-control** ([github.com/asagi4/comfyui-prompt-control](https://github.com/asagi4/comfyui-prompt-control)) — step-scheduled LoRA weights, scheduled prompts, and a richer prompt control grammar on top of ComfyUI.
- **lpw_stable_diffusion** (diffusers community pipeline) — long weighted prompt support for SD 1/2 (and a partial SDXL variant), bypassing the 77-token cap with chunking similar to A1111's.

## Open Questions

1. **Flux/T5 weighting**: there is no community consensus on what `(word:1.5)` should mean inside a T5-XXL span. Does lerp-against-empty still work when the "empty" T5 embedding is very different in shape and semantics from CLIP's? Needs empirical study; likely bounds-testing with the xHinker parser.
2. **Cross-parser round-tripping**: can an enhancer produce a single canonical weighted representation that renders perceptually similarly across A1111, ComfyUI (default), and compel? ComfyUI_ADV_CLIP_emb's existence suggests no — the modes are genuinely non-equivalent — but a calibrated mapping (e.g., "A1111 weight 1.5 ≈ compel ×1.35 ≈ Comfy default 1.7") may be derivable.
3. **Multi-token normalization default**: whether enhancers should preemptively rewrite multi-token concepts (substitute a single-token near-synonym, or apply compensating weight) to avoid F2.
4. **Negative weights on Flux / SD3**: neither model has well-behaved negative prompting via CFG (Flux uses distillation-style guidance). What does a Compel-style masked down-weight do inside a T5 conditioning stream, and is it actually useful?
5. **LoRA weight + attention weight interaction**: nobody has published a clean spec for whether compound syntaxes like `<lora:x:0.8>` combined with `(trigger_word:1.3)` in the prompt body compose linearly, multiplicatively, or unpredictably. Current behavior varies per loader.
6. **Midjourney mapping**: given the hard "sum must be positive" constraint, the ideal way to port a long A1111 prompt with several boosted terms to Midjourney's `::`-split form is an open problem — naive per-term rewriting overshoots weight budgets.

## Citations

1. AUTOMATIC1111 community. "How does attention/emphasis in prompts actually work?" Discussion #2905, `AUTOMATIC1111/stable-diffusion-webui`. https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/2905
2. AUTOMATIC1111. `modules/prompt_parser.py` (reference for `parse_prompt_attention`, prompt scheduling, BREAK). https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py
3. AUTOMATIC1111. "Unlimited Token Works — Implemented as BREAK" Issue #2305. https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/2305
4. Stewart, Damian. `compel` syntax documentation. https://github.com/damian0815/compel/blob/main/doc/syntax.md
5. Hugging Face. "Prompt weighting" (diffusers docs). https://huggingface.co/docs/diffusers/v0.22.1/en/using-diffusers/weighted_prompts
6. ComfyUI / DeepWiki. "Embeddings and Prompt Weighting" (annotated from `comfy/sd1_clip.py::ClipTokenWeightEncoder`). https://deepwiki.com/comfyanonymous/ComfyUI/6.3-embeddings-and-prompt-weighting
7. ComfyUI docs. "CLIP Text Encode (Prompt)" built-in node. https://docs.comfy.org/built-in-nodes/ClipTextEncode
8. ComfyUI docs. "CLIPTextEncodeFlux" built-in node (dual-encoder CLIP-L + T5-XXL, token limits). https://docs.comfy.org/built-in-nodes/ClipTextEncodeFlux
9. BlenderNeko. `ComfyUI_ADV_CLIP_emb` — `weight_interpretation` modes: `comfy`, `A1111`, `compel`, `comfy++`, `down_weight`; `token_normalization` modes. https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb
10. vladmandic. SD.Next `Prompting` wiki — four prompt parsers (Native, A1111, Compel, xHinker), model-specific prompting notes. https://github.com/vladmandic/sdnext/wiki/Prompting
11. Midjourney. "Multi-Prompts & Weights" documentation. https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights
12. Midjourney. "Stylize" parameter documentation. https://docs.midjourney.com/docs/stylize
13. Sadat, S. et al. "Eliminating Oversaturation and Artifacts of High Guidance Scales in Diffusion Models" (APG). arXiv 2410.02416, 2024. https://arxiv.org/abs/2410.02416
14. Invoke AI. "Advanced Prompting Syntax" (compel syntax surfaced in InvokeAI). https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax
15. asagi4. `comfyui-prompt-control` schedules (step-scheduled LoRA weights, scheduled prompts). https://github.com/asagi4/comfyui-prompt-control
