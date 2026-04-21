---
category: 06-stable-diffusion-flux
angle: 6a
angle_title: SD 1.5 / 2.1 / XL architecture and canonical prompting conventions
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/2112.10752
  - https://arxiv.org/abs/2307.01952
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py
  - https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/stable_diffusion_xl
  - https://github.com/Comfy-Org/ComfyUI/discussions/1047
  - https://docs.comfy.org/built-in-nodes/ClipTextEncodeSdxl
  - https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax
  - https://github.com/huggingface/diffusers/issues/2136
  - https://github.com/huggingface/diffusers/issues/2201
  - https://civitai.com/articles/15104/advanced-on-site-prompting-syntax-composable-diffusion-prompt-scheduling-and-prompt-alternation
  - https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb
---

# Stable Diffusion 1.5 / 2.1 / XL Architecture and Canonical Prompting Conventions

## Executive Summary

- **Stable Diffusion is a latent diffusion model, and every prompting convention is downstream of three architectural choices: the frozen CLIP text encoder(s), the cross-attention-conditioned UNet, and the VAE that maps latents back to pixels.** The original paper (Rombach et al., *High-Resolution Image Synthesis with Latent Diffusion Models*, [arXiv:2112.10752](https://arxiv.org/abs/2112.10752)) establishes that text conditioning is injected via cross-attention at every UNet resolution block. Prompt weighting, BREAK, and token scheduling all manipulate the key/value tensors fed into those cross-attention layers — nothing more.
- **CLIP has a hard 77-token context (75 content + BOS + EOS), and A1111/ComfyUI/InvokeAI all silently chunk long prompts into 75-token segments that are encoded independently and concatenated along the sequence dimension before entering the UNet.** `BREAK` is a user-controlled chunk boundary: it pads the current chunk to 75 tokens with the padding token and starts a new one ([diffusers issue #2136](https://github.com/huggingface/diffusers/issues/2136); [A1111 `modules/prompt_parser.py`](https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py)). Because each chunk is encoded in isolation, tokens on opposite sides of `BREAK` cannot attend to each other in CLIP — only later in the UNet's cross-attention — so BREAK is the cleanest tool we have for separating subject from background or character A from character B.
- **A1111's prompt DSL is the de-facto industry standard.** `(word:1.2)` scales a token's attention weight by 1.2; bare `(word)` scales by 1.1; `[word]` scales by 1/1.1 ≈ 0.909; `[a:b:0.4]` schedules a swap at 40% of steps; `[a|b]` alternates per step; `AND` invokes composable diffusion (separate UNet passes summed with per-prompt weights). ComfyUI and InvokeAI understand the same surface syntax but **interpret weights differently** — A1111 normalizes token weights across the prompt, ComfyUI applies them raw, InvokeAI's `compel` defaults to `+`/`-` suffix syntax with different blending rules ([ComfyUI discussion #521](https://github.com/Comfy-Org/ComfyUI/discussions/521); [Invoke advanced syntax](https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax)).
- **SDXL's dual text encoder (OpenCLIP-G + CLIP-L) is not redundant — it is a concatenation along the channel axis that gives 2048-dim conditioning vs. SD 1.5's 768-dim.** ComfyUI exposes `text_g` and `text_l` as separate inputs to `CLIPTextEncodeSDXL`; community convention is to put high-level/compositional tokens in `text_g` (OpenCLIP-bigG, 1280-dim, trained on longer captions) and concrete/appearance tokens in `text_l` (OpenAI CLIP-L, 768-dim, same encoder as SD 1.5). Both encoders must also receive the *negative* prompt, and mismatches between the two sides are a common cause of "my SDXL prompt ignores half the words" bug reports ([ComfyUI built-in node docs](https://docs.comfy.org/built-in-nodes/ClipTextEncodeSdxl)).
- **SD 1.5, SD 2.1, and SDXL each have different tokenizers, different CLIP checkpoints, and different defaults for `clip_skip`, and prompts do not port one-for-one.** SD 1.5 uses ViT-L/14 with EOS-padding and responds well to `clip_skip=1` (final layer). SD 2.1 uses OpenCLIP ViT-H/14 with zero-padding and already defaults to the penultimate layer (`clip_skip=2` in A1111 terms, implemented by dropping the last CLIP layer during conversion). SDXL technically has `clip_skip=2` baked in for both encoders; extra `clip_skip` on SDXL is mostly a no-op or slightly hurts unless the checkpoint (e.g. Pony XL) was trained with it ([diffusers issue #2201](https://github.com/huggingface/diffusers/issues/2201); [Forge issue #387](https://github.com/lllyasviel/stable-diffusion-webui-forge/issues/387)).

> **Updated 2026-04-21:** This angle focuses on SD 1.5 / 2.1 / XL architecture and prompting. **Stability AI released SD 3.5** (Medium 2.6B, Large 8B, Large Turbo) in October 2024, continuing with the MM-DiT architecture introduced in SD3. SD 3.5 supports negative prompts (unlike Flux), has ControlNets (Blur, Canny, Depth released Nov 26, 2024), and ships under the Stability AI Community License allowing commercial use. Diffusers supports SD 3.5 via `StableDiffusion3Pipeline`; ostris `ai-toolkit` and kohya `sd-scripts` (main branch, merged from sd3 branch) both support SD 3.5 LoRA training. For SD 3.5 prompting, the architecture uses three text encoders (CLIP-L, OpenCLIP-bigG, T5-XXL) but the prompting contract is closer to Flux prose than SDXL tag-soup. This document does not cover SD 3.5 in depth — see the routing table for model selection guidance. Also: **AUTOMATIC1111 (A1111) has been in maintenance-only mode since v1.10.1 (last release July 2024)** — no new features, 44+ unmerged PRs. Most practitioners have migrated to ComfyUI or Forge for new workflows; A1111 remains functional but is not receiving active development as of April 2026.

## Architecture Context

### Latent diffusion: the 8× compression that makes everything feasible

Rombach et al.'s *High-Resolution Image Synthesis with Latent Diffusion Models* ([arXiv:2112.10752](https://arxiv.org/abs/2112.10752), CVPR 2022) proposes running the diffusion process in a perceptually-equivalent latent space produced by a pretrained autoencoder, rather than directly on pixels. For a 512×512×3 image, the VAE encoder produces a 64×64×4 latent — an ~48× reduction in compute per denoising step. Every Stable Diffusion checkpoint ships three weights: the VAE (encoder + decoder), the UNet (the trained diffusion model), and a text encoder. The text encoder is **frozen** at CLIP's pretrained weights, which is why prompt handling is so idiosyncratic — the model was never trained to parse English, only to match CLIP embeddings to UNet cross-attention queries.

Cross-attention injection happens at every resolution block: the text embedding tensor (`[batch, 77, 768]` for SD 1.5) is used as keys and values while UNet spatial features are queries. This is why prompt weighting works — scaling a token's embedding by `1.4` amplifies its key/value magnitude at every cross-attention layer.

### SD 1.5 vs 2.1 vs SDXL at a glance

| Axis | SD 1.5 | SD 2.1 | SDXL 1.0 |
|---|---|---|---|
| Text encoder | OpenAI CLIP ViT-L/14 | OpenCLIP ViT-H/14 | OpenCLIP ViT-bigG/14 + CLIP ViT-L/14 (concat) |
| Embedding dim | 768 | 1024 | 1280 + 768 = **2048** |
| Tokenizer padding | EOS (49407) | Zero (0) | Per-encoder (G: zero, L: EOS) |
| Default `clip_skip` | 1 (final layer) | 2 (penultimate, baked in) | 2-ish (baked in, extra skip mostly inert) |
| Native resolution | 512 | 768 | 1024, multi-aspect bucketed |
| UNet params | ~860 M | ~860 M | **~2.6 B** (3× larger) |
| Micro-conditioning | None | None | `original_size`, `crops_coords_top_left`, `target_size`, `aesthetic_score` |
| Refiner | — | — | Optional `stable-diffusion-xl-refiner-1.0` img2img expert |

Sources: Rombach 2022, Podell 2023 ([arXiv:2307.01952](https://arxiv.org/abs/2307.01952)), [SD 2.1 model card](https://huggingface.co/stabilityai/stable-diffusion-2-1-base/blob/main/README.md), [SDXL paper summary](https://hf.co/papers/2307.01952), [diffusers SDXL pipeline docs](https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/stable_diffusion_xl).

> **Updated 2026-04-21:** Stable Diffusion 3.5 (released October 2024) adds a fourth generation to the SD lineage with a significantly different architecture than SD 1.5/2.1/XL. SD 3.5 Large (8B params) uses an MM-DiT transformer with QK normalization and dual-attention blocks, three text encoders (CLIP-L + OpenCLIP-bigG + T5-XXL), and native 1 MP output. SD 3.5 Medium (2.6B) targets consumer hardware. Neither variant uses the UNet/CLIP-only architecture described in this angle — the A1111 DSL, `BREAK`, `clip_skip`, and SDXL micro-conditioning do not apply to SD 3.5. SD 3.5 does support negative prompts. ControlNets (Blur, Canny, Depth) were released for SD 3.5 Large on November 26, 2024 ([Stability AI announcement](https://stability.ai/news-updates/sd3-5-large-controlnets)). For SD 3.5-specific prompting and pipeline guidance, consult the `StableDiffusion3Pipeline` diffusers docs and the SD3.5 routing-table entry.

The tokenizer-padding difference between 1.5 and 2.1 is not cosmetic — it produces materially different pooled embeddings and image outputs ([diffusers issue #2201](https://github.com/huggingface/diffusers/issues/2201)), which is why porting a good SD 1.5 prompt to SD 2.1 often yields a worse image even before accounting for the training-data filtering that made SD 2.x controversial in the first place.

### SDXL: dual encoder, ensemble-of-experts refiner, micro-conditioning

Podell et al. made three architectural changes relative to SD 2.1:

1. **Two text encoders concatenated along the channel axis.** OpenCLIP ViT-bigG/14 (1280-dim) and OpenAI CLIP ViT-L/14 (768-dim) are concatenated to a 2048-dim sequence for cross-attention. The pooled output of OpenCLIP-G is separately concatenated with micro-conditioning embeddings into the timestep embedding.
2. **Micro-conditioning via additive embeddings.** `original_size`, `crops_coords_top_left`, `target_size`, and (refiner only) `aesthetic_score` are sinusoidally embedded and added to the timestep embedding at inference ([HackerNoon summary](https://hackernoon.com/micro-conditioning-strategies-for-superior-image-generation-in-sdxl); [diffusers PR #5155](https://github.com/huggingface/diffusers/pull/5155)). `crops_coords_top_left=(0, 0)` and `original_size=target_size=(1024, 1024)` is the "clean, centered training distribution" default.
3. **Optional refiner.** `stable-diffusion-xl-refiner-1.0` is a separate checkpoint specialized for the last ~20% of timesteps ([model card](https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/blob/main/README.md)). *Ensemble of experts* — base handles `t ∈ [1000, 200]`, refiner handles `t ∈ [200, 0]`, latents passed without decoding. *SDEdit / img2img* — fully denoise with base, decode, re-encode, run refiner as img2img.

The refiner only has the OpenCLIP-G encoder (no CLIP-L), so `text_l`-specific tokens are lost at the handoff. For logo/icon work where edge crispness matters, most practitioners skip the refiner (it softens flats) or use `denoising_end=0.85` / `denoising_start=0.85` with the same prompt on both sides.

## Prompt Syntax Reference

Every syntax below is parsed by A1111's `modules/prompt_parser.py` and the drop-in-compatible parsers in Forge, SD.Next, ComfyUI's AdvancedClipEncode, and partially InvokeAI. Unless noted, all apply to SD 1.5 / 2.1 / SDXL equivalently (the Unet cares about cross-attention tensors, which are the same shape regardless of model version).

| Syntax | Effect | Scope | Source |
|---|---|---|---|
| `word` | Baseline attention (weight 1.0) | Per-token | [A1111 Features wiki](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features) |
| `(word)` | Multiply attention by 1.1 | Per-token group | A1111 Features wiki |
| `((word))` | 1.1² ≈ 1.21 | Nested multiplicative | A1111 Features wiki |
| `(((word)))` | 1.1³ ≈ 1.331 | Nested multiplicative | A1111 Features wiki |
| `[word]` | Multiply by 1/1.1 ≈ 0.909 | Per-token group | A1111 Features wiki |
| `[[word]]` | ~0.826 | Nested | — |
| `(word:1.4)` | Set attention weight to **exactly** 1.4 | Per-token group | A1111 Features wiki |
| `(word:0.6)` | Set attention weight to 0.6 | Per-token group | — |
| `(a (b:1.4))` | `a` ≈ 1.1, `b` = 1.4 × 1.1 = 1.54 (multiplicative nesting) | Nested | [A1111 issue #10479](https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/10479) |
| `\(word\)` | Literal parentheses around `word`, no attention effect | Escape | A1111 Features wiki |
| `[from:to:when]` | Swap `from` for `to` at step `when` (int = step, float ∈ [0,1] = fraction) | Prompt editing | [prompt_parser.py](https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py) |
| `[word:10]` | Introduce `word` at step 10 | Delayed introduction | [civitai scheduling article](https://civitai.com/articles/15104/advanced-on-site-prompting-syntax-composable-diffusion-prompt-scheduling-and-prompt-alternation) |
| `[word::10]` | Drop `word` after step 10 | Early removal | civitai article |
| `[[a|b|c]::20]:5]` | Start alternating a/b/c at step 5, drop them at step 20 | Nested editing + alternation | civitai article |
| `[a|b]` | Alternate between `a` and `b` on every step | Prompt alternation | [A1111 PR #1733](https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/1733) |
| `[a|b|c|c]` | Weighted alternation (c occurs 2× as often as a or b) | Alternation | A1111 PR #1733 |
| `{a|b}` | Random pick at generation time (Dynamic Prompts extension **only**; not built-in) | Wildcard | [sd-dynamic-prompts](https://github.com/adieyal/sd-dynamic-prompts) |
| `__wildcard__` | Resolve to a random line from `wildcard.txt` (Dynamic Prompts extension) | Wildcard | sd-dynamic-prompts |
| `BREAK` (uppercase, whitespace-delimited) | Pad current CLIP chunk to 75 tokens, start new chunk | Chunking | [civitai article](https://civitai.com/articles/15104/advanced-on-site-prompting-syntax-composable-diffusion-prompt-scheduling-and-prompt-alternation) |
| `AND` (uppercase) | Composable diffusion: run UNet separately for each sub-prompt, sum the noise predictions | Per-prompt | [composable-diffusion paper / A1111 impl](https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py) |
| `AND prompt : w` | Composable diffusion with per-sub-prompt weight `w` | Per-prompt | A1111 prompt_parser.py |
| `|` (prompt matrix, separate X/Y feature, not in-prompt) | Cartesian product of prompt fragments across separate runs | Batching | [A1111 Features wiki](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features) |
| InvokeAI `word+` / `word++` | 1.1 / 1.21× weight (compel syntax) | Per-token | [Invoke syntax docs](https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax) |
| InvokeAI `word-` / `word--` | 0.909 / 0.826× weight | Per-token | Invoke syntax docs |
| InvokeAI `("p1", "p2").blend(1, 1)` | Spherical-interpolation blend of entire sub-prompt embeddings | Whole-prompt | Invoke syntax docs |
| InvokeAI `[banned]` | Ban concept (inserts into negative prompt branch) | Negative | [InvokeAI PROMPTS.md](https://github.com/invoke-ai/InvokeAI/blob/development/docs/features/PROMPTS.md) |
| ComfyUI `(word:1.2)` | Same syntax, **no normalization** across prompt | Per-token | [ComfyUI discussion #521](https://github.com/Comfy-Org/ComfyUI/discussions/521) |
| ComfyUI `embedding:filename` | Inline textual-inversion embedding | Per-prompt | [ComfyUI text prompts docs](https://blenderneko.github.io/ComfyUI-docs/Interface/Textprompts/) |
| A1111 `<lora:name:0.8>` / `<lyco:name:0.8>` | Load LoRA / LyCORIS with weight 0.8 at parse time | Per-prompt | A1111 Features wiki |

## Weighting Semantics

### What the parser actually does

A1111's parser (see [`modules/prompt_parser.py`](https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py)) produces a list of `(text, weight)` tuples, tokenizes each fragment, and then scales the corresponding **embedding vectors** by `weight`. Crucially, A1111 *then* renormalizes the mean embedding magnitude so that heavy weighting doesn't blow up the cross-attention norm:

```
for token_i with weight w_i:
    emb_i' = emb_i * w_i
mean_w = mean(|emb'|)
mean_original = mean(|emb|)
emb_final = emb' * (mean_original / mean_w)
```

ComfyUI's stock `CLIPTextEncode` node skips that renormalization, which is why identical prompts with identical seeds produce different images between the two UIs ([ComfyUI discussion #521](https://github.com/Comfy-Org/ComfyUI/discussions/521)). `BlenderNeko/ComfyUI_ADV_CLIP_emb` adds a `token_normalization` dropdown with `none`, `mean`, `length`, and `length+mean` modes; setting it to `mean` matches A1111's behavior and is the recommended option if you are porting prompts between UIs ([repo](https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb)).

### Practical weight ranges

Empirically, across SD 1.5 / SDXL, the useful weight band is **[0.6, 1.5]**. Above 1.5 the token's cross-attention contribution saturates and then the renormalization starts tearing the rest of the prompt apart, producing the "I asked for a red apple and now everything is red" artifact class. Below 0.5, the token's contribution is indistinguishable from absence, so `(word:0.3)` and just dropping the word entirely produce visually similar outputs. InvokeAI caps `+++++++++` at ~2.14× (i.e. `1.1⁸`), which is a reasonable upper bound.

A widely-used A1111 convention for quality tags is to stack `(masterpiece:1.2), (best quality:1.3)` at the head of the prompt — the renormalization means these effectively *pull attention mass from the rest of the prompt*, which works because the trailing quality tokens on 1.5-era anime/realism checkpoints were trained with those exact captions.

### Prompt scheduling is a rewrite, not a re-encoding

`[man:woman:0.5]` tells the sampler: "tokens encode as *man* for the first half of steps, then re-encode as *woman* for the second half." Under the hood this is implemented by running the CLIP text encoder **twice**, producing two separate `(1, 77, D)` tensors; at each denoising step the scheduler picks which tensor to feed into cross-attention. For SDXL this happens independently per encoder (`text_g` and `text_l` are both re-encoded). The practical consequence: scheduling is not free (extra text-encoder pass) and does not interpolate — it hard-swaps — so `[man:woman:0.5]` produces a clean transition around step 10 in a 20-step schedule, not a morph.

`[a|b]` alternation runs the encoder twice upfront but alternates which tensor is used per step. It is ideal for concept blending ("a cat-dog hybrid") where neither alternative should fully dominate.

## SDXL Dual-Encoder Tricks

SDXL's `CLIPTextEncodeSDXL` node in ComfyUI accepts **four** inputs: `text_g`, `text_l`, `clip` (the DualCLIP loader), and `width`/`height`/`target_width`/`target_height`/`crop_w`/`crop_h` for micro-conditioning ([ComfyUI docs](https://docs.comfy.org/built-in-nodes/ClipTextEncodeSdxl)). A1111 abstracts both encoders behind a single text box and sends the same prompt to both — which works but leaves performance on the table.

### The conventional split

Based on community experiments summarized in [ComfyUI discussion #1047](https://github.com/Comfy-Org/ComfyUI/discussions/1047) and [myByways SDXL dual-encoder write-up](https://mybyways.com/blog/two-text-prompts-text-encoders-in-sdxl-1-0):

- **OpenCLIP-bigG (`text_g`)** — trained on LAION-5B with longer, more descriptive captions; better at compositional reasoning, scene structure, action, and abstract concepts. *Use for: overall subject, scene, style, mood, camera framing.*
- **OpenAI CLIP-L (`text_l`)** — same encoder as SD 1.5; better at concrete appearance attributes and short tag-style prompts because it was trained on WIT alt-text captions. *Use for: colors, materials, named entities, fine-grained visual attributes.*

Example split for a logo prompt:

```
text_g: "flat vector logo for a note-taking app, centered symmetrical
composition, minimalist geometric construction, corporate brand identity
aesthetic, clean negative space, single focal mark on solid background"

text_l: "paper sheet with folded corner, indigo and violet gradient, thick
rounded strokes, pure white background, 1024x1024, crisp edges"
```

Both encoders must also receive the **negative** prompt, typically as the same string in both fields. Forgetting to set `negative_text_l` while setting `negative_text_g` (or vice versa) produces the "my negative prompt half-works" bug seen frequently in Forge/ComfyUI custom workflows.

### Micro-conditioning as a prompt-adjacent lever

Micro-conditioning values behave like invisible prompt tokens:

- `original_size=(1024, 1024), target_size=(1024, 1024), crop_coords=(0, 0)` — the "this is a centered, 1024-native training image" request. Default for clean, professional output.
- `original_size=(4096, 4096)` — tells SDXL "pretend this was cropped down from a much larger source," which increases perceived detail but can cause over-sharpening and extra texture. Helpful on illustration checkpoints that were over-regularized.
- `crop_coords=(256, 0)` — tells SDXL "this image was cropped 256 px from the top of a larger image." SDXL learned to compensate, so setting a non-zero crop is a way to ask for "uncropped-looking" subjects without changing the prompt ([Podell 2023 §2.2](https://arxiv.org/abs/2307.01952)).
- `aesthetic_score` (refiner only) — in `[0, 10]`, defaults to 6.0. Pushing to 7.5–8.5 on the refiner during the final 20% of steps is a reliable way to nudge toward "polished" illustration without prompt changes.

For asset generation (logos, icons, favicons) a reasonable recipe is:

```python
pipe(
    prompt=prompt,
    negative_prompt=neg,
    original_size=(1024, 1024),
    target_size=(1024, 1024),
    crops_coords_top_left=(0, 0),
    guidance_scale=6.5,
    num_inference_steps=28,
)
```

## Asset-Specific Patterns

### The BREAK-separated subject/background pattern

Because each CLIP chunk is encoded independently, `BREAK` is the industry-standard tool for preventing **token bleed** — where adjectives intended for the subject leak onto the background, or vice versa. For icon/logo work this is load-bearing:

```
minimalist app icon, single stylized paper sheet with folded corner,
indigo-to-violet gradient fill, thick rounded strokes, flat vector,
iOS-style, crisp anti-aliased edges
BREAK
pure white background, no texture, no noise, no pattern, no secondary
elements, empty negative space, clean canvas
```

Without `BREAK`, tokens like "indigo-to-violet gradient fill" often cause SDXL to render a gradient background, which is the exact opposite of intent. With `BREAK`, the second chunk is encoded in isolation and the cross-attention for background spatial regions attends cleanly to the "pure white, no texture" tokens.

### The `AND` composable-diffusion pattern for multi-subject icons

```
sun icon, radial rays, yellow AND moon icon, crescent, cool blue : 0.6
```

A1111's composable diffusion runs the UNet once per `AND` sub-prompt and sums the noise predictions weighted by the trailing `: w` (default 1.0). This is the most reliable way to request "two concepts, spatially distinct" without relying on the model's weaker inherent compositionality. For asset production it is useful when generating a family of icons (e.g. light/dark pair) in one pass.

### The weighted quality-tag header

SD 1.5 anime/illustration checkpoints (Anything v5, MeinaMix, Counterfeit) respond strongly to a weighted header; SDXL base largely does not, but community SDXL checkpoints (Juggernaut XL, RealVis XL) re-learn the pattern during fine-tuning:

```
(masterpiece:1.2), (best quality:1.3), (ultra detailed:1.1), (sharp focus:1.1),
<main prompt here>,
(detailed lighting:1.1), (intricate:1.1)
```

Civitai users converge on weights in [1.1, 1.4] because the A1111 renormalization means weights above 1.5 start to *hurt* by reducing the weight mass available to the rest of the prompt.

### The `clip_skip` choice

- **SD 1.5 realistic / photographic checkpoints**: `clip_skip=1` (use final layer). The final CLIP layer is slightly over-specialized, but on photographic data the signal outweighs the bias.
- **SD 1.5 anime/illustration checkpoints (NAI-lineage)**: `clip_skip=2` (penultimate). The original NovelAI leak trained with skip-2 because the final CLIP-L layer over-regularized toward photographic features. Every NAI-descended checkpoint expects skip-2 at inference.
- **SD 2.x**: skip-2 is **baked in** during conversion (24→23 layers), so `clip_skip=1` in A1111 on SD 2.x is already "final of 23 = penultimate of original 24." Extra skipping is rarely useful.
- **SDXL**: skip-2 is baked in; additional `clip_skip` is mostly inert on the base checkpoint. Exceptions: **Pony XL** was trained with explicit `clip_skip=2` and requires it at inference or produces "low-quality blobs" ([InvokeAI issue #4583](https://github.com/invoke-ai/InvokeAI/issues/4583)).

### Civitai/Lexica prompt grimoire patterns that matter for icon/logo production

From scraping top-rated SDXL logo/icon LoRAs (Vector illustration, Colored icons, App Icons SDXL on Civitai) plus Lexica's `?q=logo` and `?q=app icon` top results:

1. **"Trigger tokens for LoRAs are non-negotiable."** `color icon`, `flat vector`, `simple logo`, `corporate logo`, `app icon` are the most common, and LoRA recall drops ~40% without them ([Vector illustration SDXL](https://civitai.com/models/60132)).
2. **LoRA weights converge to [0.65, 0.9]** for style LoRAs; above 0.9 you start getting artifacts; below 0.65 the style doesn't stamp.
3. **Aspect-ratio lock.** For favicons and app icons, forcing `1024×1024` and setting `target_size=(1024,1024)` beats generating 768² and upscaling, because SDXL's multi-aspect bucketing is weakest at sub-native resolutions.
4. **The "no text" ritual.** SDXL cannot reliably render text; top icon generations all include `no text, no letters, no numbers, no signature, no watermark` in the negative prompt, usually duplicated in `text_g` and `text_l`.
5. **`BREAK` is used universally in top-rated logo prompts on Civitai** to separate the glyph/mark from the background/container.

## References

1. [Rombach et al., *High-Resolution Image Synthesis with Latent Diffusion Models*, arXiv:2112.10752 (CVPR 2022)](https://arxiv.org/abs/2112.10752) — the LDM paper; introduces the VAE+UNet+cross-attention architecture all downstream SD versions inherit.
2. [Podell et al., *SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis*, arXiv:2307.01952 (2023)](https://arxiv.org/abs/2307.01952) — SDXL paper; introduces dual text encoders, micro-conditioning, and the refiner.
3. [Stability AI, *stable-diffusion-2-1-base* model card](https://huggingface.co/stabilityai/stable-diffusion-2-1-base/blob/main/README.md) — confirms OpenCLIP ViT-H/14 encoder, 512/768 bases, v-prediction option.
4. [Stability AI, *stable-diffusion-xl-refiner-1.0* model card](https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/blob/main/README.md) — official description of the refiner ensemble-of-experts workflow.
5. [AUTOMATIC1111 stable-diffusion-webui Features wiki](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features) — canonical reference for `(word:1.2)`, `[word]`, prompt editing, alternation, prompt matrix, attention shortcuts.
6. [AUTOMATIC1111 `modules/prompt_parser.py`](https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py) — source of truth for A1111 prompt grammar, including `[from:to:when]`, `AND`, and renormalization logic.
7. [A1111 PR #1733 — alternate prompt feature](https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/1733) — original `[a|b]` alternation implementation.
8. [A1111 issue #10479 — nested emphasis weight calculation](https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/10479) — documents multiplicative nesting of `(a (b:1.4))`.
9. [ComfyUI discussion #521: A1111 prompt weighting and more](https://github.com/Comfy-Org/ComfyUI/discussions/521) — canonical comparison of A1111 vs ComfyUI weight interpretation; introduces AdvancedClipEncode.
10. [ComfyUI discussion #1047: Why different `text_l` and `text_g`?](https://github.com/Comfy-Org/ComfyUI/discussions/1047) — community explanation of SDXL dual-encoder roles.
11. [ComfyUI built-in `CLIPTextEncodeSDXL` docs](https://docs.comfy.org/built-in-nodes/ClipTextEncodeSdxl) — official parameter list including micro-conditioning fields.
12. [BlenderNeko/ComfyUI_ADV_CLIP_emb](https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb) — the cross-UI weight-normalization node; required for prompt portability.
13. [BlenderNeko ComfyUI Text Prompts manual](https://blenderneko.github.io/ComfyUI-docs/Interface/Textprompts/) — ComfyUI prompt-syntax reference including `embedding:` directives.
14. [InvokeAI *Advanced Prompting Syntax* support article](https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax) — compel syntax (`+`, `-`, `.blend()`, `.and()`).
15. [InvokeAI `docs/features/PROMPTS.md`](https://github.com/invoke-ai/InvokeAI/blob/development/docs/features/PROMPTS.md) — in-repo reference for prompt grammar including `[banned]` negative syntax.
16. [diffusers issue #2136: Overcoming the 77-token limit](https://github.com/huggingface/diffusers/issues/2136) — explains the chunk-and-concatenate mechanism used by A1111 and the Long Prompt Weighting community pipeline.
17. [diffusers issue #2201: Padding difference in SD tokenizers](https://github.com/huggingface/diffusers/issues/2201) — EOS vs zero padding between SD 1.5 and SD 2.x.
18. [diffusers PR #4901: Add support for CLIP-skip](https://github.com/huggingface/diffusers/pull/4901) — official CLIP-skip landing in diffusers, including SDXL behavior.
19. [InvokeAI issue #4583: SDXL CLIP Skip](https://github.com/invoke-ai/InvokeAI/issues/4583) — Pony XL's hard requirement for `clip_skip=2`.
20. [Forge issue #387: CLIP Skip nonfunctional on SDXL](https://github.com/lllyasviel/stable-diffusion-webui-forge/issues/387) — confirms that extra `clip_skip` on stock SDXL is inert.
21. [civitai article: *Advanced On-Site Prompting Syntax*](https://civitai.com/articles/15104/advanced-on-site-prompting-syntax-composable-diffusion-prompt-scheduling-and-prompt-alternation) — practitioner reference for `BREAK`, `AND`, scheduling, alternation, and what works on Civitai's generator.
22. [civitai *Vector illustration SDXL* LoRA](https://civitai.com/models/60132) — the most-downloaded icon/logo LoRA for SDXL; documents trigger tokens and weight ranges.
23. [myByways, *Two Text Prompts (Text Encoders) in SDXL 1.0*](https://mybyways.com/blog/two-text-prompts-text-encoders-in-sdxl-1-0) — practitioner deep-dive on `text_g`/`text_l` split.
24. [HackerNoon, *Micro-Conditioning Strategies for Superior Image Generation in SDXL*](https://hackernoon.com/micro-conditioning-strategies-for-superior-image-generation-in-sdxl) — expanded explanation of `original_size`, `crops_coords_top_left`, `target_size`.
25. [diffusers SDXL pipeline docs](https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/stable_diffusion_xl) — canonical API for `StableDiffusionXLPipeline` including micro-conditioning arguments, refiner chaining, and `denoising_end`/`denoising_start`.
