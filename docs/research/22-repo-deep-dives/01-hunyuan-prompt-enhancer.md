---
wave: 2
role: repo-deep-dive
slug: 01-hunyuan-prompt-to-asset
title: "Deep dive: Hunyuan-PromptEnhancer"
repo: "https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer"
license: "Apache-2.0 (weights, per model card) / NOASSERTION (repo) — see §4"
date: 2026-04-19
sources:
  - https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
  - https://arxiv.org/abs/2509.04545
  - https://arxiv.org/html/2509.04545v4
  - https://hunyuan-promptenhancer.github.io/
  - https://huggingface.co/papers/2509.04545
  - https://huggingface.co/PromptEnhancer/PromptEnhancer-32B
  - https://huggingface.co/PromptEnhancer/PromptEnhancer-7B
  - https://huggingface.co/datasets/PromptEnhancer/T2I-Keypoints-Eval
  - https://huggingface.co/mradermacher/PromptToAsset-Img2img-Edit-GGUF
  - https://huggingface.co/tencent/HunyuanImage-2.1
  - https://github.com/Tencent-Hunyuan/HunyuanImage-2.1/blob/main/LICENSE
  - https://github.com/ryan-seungyong-lee/ComfyUI-PromptEnhancer
  - https://github.com/leeooo001/comfyui-Hunyuan-PromptEnhancer
tags: [prompt-to-asset, hunyuan, grpo, align-evaluator, cot, qwen2_5_vl, cvpr-2026]
---

# Deep dive: Hunyuan-PromptEnhancer

## 1. One-paragraph summary

`Hunyuan-PromptEnhancer/PromptEnhancer` is Tencent Hunyuan's open-source, model-agnostic T2I prompt rewriter, accepted to **CVPR 2026** (arXiv [2509.04545](https://arxiv.org/abs/2509.04545)). As of April 2026 it is the only publicly released rewriter trained end-to-end with RL against an explicit, fine-grained T2I-alignment reward model (the **AlignEvaluator**, a 24-key-point failure-mode taxonomy). Two weight variants are public — a 7B Hunyuan-7B-Instruct fine-tune and a 32B Qwen2.5-VL-32B-Instruct fine-tune branded "PromptEnhancerV2" — plus a dedicated Img2Img-Edit variant and community GGUF quants. It is a plug-and-play Chain-of-Thought module that emits a long, structurally rich En/Zh prompt from any short input, validated on HunyuanImage 2.1 with +5.1 pp average prompt-following across 24 dimensions. For our product it is the **closest prior art to the "smart tier" of our enhancer**: the training recipe, reward taxonomy, and CoT scaffold are worth lifting; the weights are not, because they're tuned for generic T2I aesthetics and cannot reason about transparency, platform specs, or brand correctness.

## 2. Repo metrics (observed 2026-04-19)

| Metric | Value |
|---|---|
| Stars / Forks / Contributors | **3,667** / 316 / 3 |
| Primary language | Python (98.9%) |
| Repo created | 2025-09-09 |
| Release timeline | 7B (Sep 7 2025) → 32B (Sep 18) → GGUF (Sep 22) → Img2Img-Edit (Sep 30) |
| Paper / Venue | arXiv:2509.04545 (v4) / **CVPR 2026** |
| HF 32B downloads / likes | 2,654 all-time / 15 |

Six months post-release: ~600 stars/month, small contributor set (paper authors), downloads concentrated on the 32B. CVPR 2026 acceptance plus Tencent's stated intent to progressively open-source the dataset, reward model, and benchmark means iteration should continue through 2026.

## 3. Model variants, base models, and footprint

| Variant | Base model | Params | BF16 size | Notable details |
|---|---|---|---|---|
| **PromptEnhancer-7B** | Hunyuan-7B-Instruct | 7B | ~13 GB | Paper-reported variant; text-only CoT rewriter |
| **PromptEnhancer-32B ("V2")** | Qwen2.5-VL-32B-Instruct | 33.45B | ~67 GB | Multimodal (image+text in), higher rewrite quality, supports Zh+En |
| **PromptToAsset-Img2Img-Edit** | Qwen2.5-VL family | ~33B | ~64 GB | Image-conditioned prompt rewriting for edit tasks |
| **GGUF quants (community)** | Q2_K / Q4_K_S / Q8_0 | — | 12.4–33 GB | `mradermacher/PromptToAsset-Img2img-Edit-GGUF`, Q4_K_S recommended at ~18.9 GB |

Critical fact: **the 32B is a Qwen2.5-VL fine-tune, not a Hunyuan fine-tune.** `AutoModelForImageTextToText` + the Qwen chat template confirm the backbone. The 7B is initialized from `Hunyuan-7B-Instruct` (paper §4.1). This is the single biggest gotcha for any integrator: the two variants have **different architectures, tokenizers, chat templates, and licenses**, and they are not drop-in interchangeable.

**Memory footprint** (community-reported via the `leeooo001/comfyui-Hunyuan-PromptEnhancer` wrapper; no official table): 7B fits on A10 24 GB in BF16 (~14 GB tight) or on a T4 16 GB at int8/Q4; 32B BF16 (~67 GB) needs A100 80 GB / H100, but 32B int8 (~20 GB) and 32B Q4 (~19 GB) fit on A10 24 GB / A100 40 GB.

**Latency** is not published; based on Qwen2.5-VL-32B on H100 with vLLM, expect ~2–6 s per rewrite for the 32B at temperature 0 and ~1k output tokens (CoT is verbose), and ~0.5–1.5 s for the 7B. GGUF-Q4 on a single A10 should land ~2–3 s for the 7B — the realistic self-hosted free-tier target. For < 500 ms we would need vLLM + prefix caching + truncated CoT, or a hosted API.

## 4. Licensing — the single most important caveat

This is where README marketing diverges from legal reality, and it matters for a commercial product.

- **HF card vs. tags.** The `PromptEnhancer-32B` card text says "License: Apache-2.0" but the HF tag panel simultaneously renders `license:other`; GitHub's repo metadata shows `Other (NOASSERTION)`.
- **32B weights.** Fine-tuned from `Qwen/Qwen2.5-VL-32B-Instruct` (Apache-2.0). Under Apache-2.0 §4 the derivative is generally Apache-2.0; practically commercial-safe, but the repo NOASSERTION means we should attribute both and not rely on the HF text alone.
- **7B weights.** Fine-tuned from `Hunyuan-7B-Instruct`, governed by the **Tencent Hunyuan Community License Agreement**. Key restrictions: **geographic exclusion — the license "shall not apply in the European Union, United Kingdom, or South Korea"** (shipping the 7B there is forbidden without a separate agreement); an Acceptable Use Policy similar to Meta's Llama license; Model Derivatives inherit the same terms (viralizing the EU/UK/KR exclusion into any student we train from it); and it is not OSI-approved, so downstream compatibility with Apache/MIT-only distributions is nonstandard.
- **Training data.** The 485k SFT triplets and 50k RL prompts were generated with **Gemini 2.5 Pro** (English) and **DeepSeek-V3** (Chinese) as teachers (paper §3.1). Gemini outputs fall under Google's gen-AI terms, which forbid using outputs "to develop machine-learning models or related technology" outside permitted cases — a well-known grey zone. Re-using Gemini-distilled data directly is risky for anyone competing with Google.
- **AlignEvaluator.** Not yet released as of 2026-04-19; license TBD.

**Net:** the **32B** and the codebase are commercially usable with modest attribution. The **7B** carries Tencent-specific geographic/AUP encumbrances. The **training dataset** is more problematic than the weights if we want to distill a student.

## 5. Training recipe — what we can actually reuse

Paper §2 defines a two-stage pipeline (hyperparams from Table 2):

**Stage 1 — SFT.** Initialize from Hunyuan-7B-Instruct (or Qwen2.5-VL-32B for V2). 2 epochs on 485,119 `(user_prompt, CoT, reprompt)` triplets. LR 1e-5, cosine, 10% warmup, batch 128, BF16, 8× H800. Input: short caption (from a captioner over a 3.26M-image pool, 1.53M Zh + 1.73M En). Output: explicit CoT reasoning + enriched prompt. The CoT system prompt (Fig. 8–9 of the paper) decomposes into **(I) a four-level sentence hierarchy** (macro → scene → composition → detail), **(II) seven grammatical rules** for objectivity, and **(III) nine constraints** preserving intent. Gemini-2.5-Pro generated candidates (one-to-many); Hunyuan-2.1 rendered each; professional annotators picked the best; Gemini-2.5-Pro re-filtered for semantic deviation. 1M → 611k → 485k final triplets.

**Stage 2 — GRPO.** 1 epoch on a disjoint 50k-prompt RL set. LR 1e-6 constant, KL coefficient 0.001 vs. the SFT model, **N = 8 rollouts per prompt**, global batch 64. For each prompt the policy samples 8 reprompts → frozen HunyuanImage-2.1 renders 8 images → AlignEvaluator scores each `(prompt, image)` on the 24 key points → group-relative advantage updates the policy. DeepSeek-style GRPO (Shao et al., 2024) — no value network, intra-group normalization. One fewer model to host; 8×A100-40 GB replication is plausible.

**The AlignEvaluator's 24 key points (paper Table 1), enumerated — the single most reusable artifact for our work.** Six super-categories:

1. **Linguistic Comprehension (3):** Negation · Attribute Consistency (one attr→many objects) · Pronoun Resolution
2. **Visual Attributes (5):** Counting (n ≥ 3) · Size (relative) · Material · Facial Expression · Artistic Style
3. **Action & Interaction (6):** Full-body Action · Hand Action · Animal Action · Contact Interaction · Interaction without Contact · Continuous State
4. **Relations & Structure (6):** Comparative · Compositional (entity of entities) · Containment · Similarity (shape-like) · Cross-Entity Attribute Binding · Entity Layout
5. **World Knowledge & Reasoning (2):** Knowledge Application (famous entities) · Counterfactual
6. **Scene Text & Typography (2):** Text Rendering · Text Layout

What's **missing** for our use case: no transparency correctness, no favicon/app-icon platform specs, no logo mark legibility, no brand-palette adherence, no safe-zone respect, no aspect-ratio validation, no SVG-friendliness. That is our wedge — extend the taxonomy with 6–8 asset-specific key points, train a head on each, fine-tune a student rewriter with the same SFT→GRPO recipe but our reward.

## 6. Input/output schema

- **Input.** Short natural-language prompt (5–40 words, En or Zh); for the 32B V2, optionally an image (via Qwen `<|vision_start|>…<|vision_end|>` placeholders). Max input ~4k tokens (Qwen2.5-VL context). No JSON input — string only.
- **Output.** Paragraph-form enriched prompt, typically 150–400 En words (denser in Zh). **No structured contract** — no JSON, no positive/negative split, no weights, no aspect-ratio, no model-family hint. Hunyuan emits natural sentences, not Fooocus tag-salad. **Good for Imagen / GPT-image-1 / DALL·E / Flux**, suboptimal for SDXL/Pony, which still want weighted tags and BREAK tokens.
- **Languages.** En + Zh only. Ja/Ko/Es/Fr/De not trained; users in Issues report code-switching to Zh on French input.

## 7. Integration options

| Surface | Status | Notes |
|---|---|---|
| **HF Transformers** | ✅ First-class | `AutoModelForImageTextToText` + `AutoProcessor`; inference helper at `inference/prompt_enhancer_v2.py` in the repo |
| **vLLM** | ⚠️ Untested officially | Both base models (Hunyuan-7B, Qwen2.5-VL-32B) are individually vLLM-supported; should work but no blessed config |
| **TGI** | ⚠️ Card says "endpoints_compatible" | No ship-ready Docker image provided |
| **Ollama** | ❌ No official support | No ModelFile published; community GGUF exists but Ollama adoption is nil |
| **llama.cpp / GGUF** | ✅ Community | `mradermacher/PromptToAsset-Img2img-Edit-GGUF` publishes Q2_K / Q4_K_S / Q8_0 |
| **ComfyUI** | ✅ Two community nodes | `ryan-seungyong-lee/ComfyUI-PromptEnhancer` (7B+32B, flash-attn for img2img), `leeooo001/comfyui-Hunyuan-PromptEnhancer` (int8 + fp16) |
| **Diffusers** | ❌ Not integrated | Rewriter sits upstream of the pipeline, not inside it |
| **HF Inference Endpoints** | ⚠️ Flagged compatible but no provider | HF card says "This model isn't deployed by any Inference Provider" |
| **Replicate / fal / Together** | ❌ Not hosted as of Apr 2026 | Would require bringing our own container |

Practical takeaway: **there is no hosted endpoint we can call today**. A production integration means self-hosting the 7B on A10/A100 with vLLM, or self-hosting the Q4-GGUF on CPU/consumer-GPU for a slower free tier.

## 8. Known failure modes and biases

- **Training-distribution bias.** Pipeline pulls 1.53M Zh + 1.73M En images; HITL picks the "best" reprompt using Hunyuan-2.1's renders. This bakes in Hunyuan-2.1's rich/photographic/mildly-over-saturated aesthetic. The four dimensions that regressed or stayed flat in-domain (Text Layout −0.7%, Interaction w/o Contact −0.9%, Contact Interaction +0.0%, Size +0.0%) hint that the rewriter likes to "fill space", which over-specifies simple scenes.
- **Not SD tag-salad.** First mainstream OSS rewriter that emits prose, not `(weight:1.2)` tags. Great for Imagen/GPT-image-1/DALL·E/Flux; suboptimal for SDXL/Pony/Juggernaut.
- **Model-family agnosticism is overclaimed.** The training loop used HunyuanImage-2.1 as the reward target; the AlignEvaluator was trained on Hunyuan-rendered images. The rewriter *output* generalizes (it's text), but the *reward signal* was shaped by Hunyuan-2.1's failure modes. No independent repro on Flux, SDXL, Imagen 4, or GPT-image-1 exists. Expect the +5.1 pp headline to shrink on non-Hunyuan targets.
- **Asset-correctness blindness.** Nothing in the 24 key points rewards alpha validity, safe zones, favicon legibility, iOS rounded-square containment, minimum stroke weight, or palette adherence. "Transparent logo for a fintech startup" gets rewritten with *"set against a softly lit studio backdrop"* — the classic transparency failure (see `docs/research/13-transparent-backgrounds/*`). This is the single most important limitation for our product.

## 9. Benchmarks

**Author-reported (paper §4.3).** Evaluated on the authors' own **T2I-Keypoints-Eval** benchmark using HunyuanImage-2.1:

| Category | Δ vs. no rewriter |
|---|---|
| **Average across 24 KPs** | **+5.1 pp** |
| Similarity Relation | +17.3 pp |
| Counterfactual | +17.2 pp |
| Counting (n ≥ 3) | +15.0 pp |
| Pronoun Resolution | +13.9 pp |
| Expression | +12.0 pp |
| Cross-Entity Binding | +11.3 pp |
| Text Layout | **−0.7 pp** (regression) |
| Interaction w/o Contact | **−0.9 pp** (regression) |

15 of 24 gain > 5.0 pp; 20 of 24 gain something; 2 regress.

**Independent reproductions (as of 2026-04-19): none published.** No third-party repro on Flux, SDXL, Imagen, or GPT-image-1. The [T2I-Keypoints-Eval](https://huggingface.co/datasets/PromptEnhancer/T2I-Keypoints-Eval) dataset is on HF and could be used — a possible follow-up for us.

## 10. Alternatives / competitors

| Project | Params | License | Approach |
|---|---|---|---|
| microsoft/Promptist | 125M GPT-2 | MIT | SFT + PPO (CLIP + aesthetic reward); CPU fallback for SD 1.x |
| alibaba-pai BeautifulPrompt | 1.1B BLOOM | Apache-2.0 | SFT + PPO on aesthetic + consistency; emits `(weight:x)` for SD 1.x |
| Gustavosta MagicPrompt | 125M GPT-2 | MIT | SFT on 80k Lexica prompts; browser-side SD tag soup |
| roborovski SuperPrompt-v1 | 77M T5-small | MIT | SFT for prompt upsampling; always-on background |
| Fooocus expansion | 125M GPT-2 | **CC-BY-NC-4.0** model | Logits-processor + positive-word bias; non-commercial |
| shinpr/mcp-image | Hosted LLM | MIT | Subject-Context-Style CoT; MCP-native |
| **Hunyuan (this)** | 7B / 32B | Mixed (§4) | SFT + GRPO + AlignEvaluator; SOTA on Hunyuan-2.1 |

Hunyuan is 2–3 orders of magnitude larger than Promptist and is the only CoT+RL entry. BeautifulPrompt is the closest middle-ground but specializes in SD weight syntax. None of the alternatives are asset-aware.

## 11. Concrete integration plan for our product

**Option A — run the 7B ourselves (paid-tier today).** Self-host `PromptEnhancer-7B` via vLLM on A10 / A100-40. Target ~1–2 s/rewrite, ~$0.0004/rewrite on A10g. Expose behind our `enhance_prompt` tool. Catch: 7B license excludes EU/UK/KR — either geo-block the engine or ship 32B (Apache-2.0-leaning Qwen base) as the EU variant.

**Option B — hosted endpoint.** Not available today; revisit H2 2026 if Replicate / fal / Together list it.

**Option C — copy the recipe, train our own student (long-term moat).** SFT→GRPO with an asset-correctness-augmented reward. Three deltas vs. Hunyuan:

1. **Extend the taxonomy from 24 to ~32 KPs** by adding *Transparency Validity*, *Alpha-channel Cleanliness*, *Safe-zone Respect*, *Favicon Legibility*, *App-icon Platform Compliance*, *Brand-palette Adherence*, *Stroke-weight Vector-friendliness*, *Negative-space Respect*. Each gets a trainable head on the AlignEvaluator (Qwen2.5-VL-7B is a fine base for our reward model too).
2. **Re-source training data.** Replace Hunyuan-2.1-rendered images with a multi-model bake-off (Imagen 4, GPT-image-1, Flux, Recraft V3, SDXL-logo-LoRA) so the reward generalizes across families. 5k–20k `(intent, ideal_prompt, target_model, asset_type)` tuples is enough for SFT at 7B scale if CoT is high-quality. Use Claude / GPT-5 / DeepSeek as teachers; avoid Gemini-distilled data where we compete with Google.
3. **Emit structured JSON, not prose:**
   ```json
   {
     "positive_prompt": "...",
     "negative_prompt": "...",
     "weights": {"flat_vector": 1.2, "background": -1.0},
     "aspect_ratio": "1:1",
     "target_model_family": "imagen-4",
     "post_processing": ["bria_rmbg_2", "npm_icon_gen"],
     "rationale": "..."
   }
   ```
   Keep CoT internal, expose JSON externally.

**CoT prompt template to lift directly.** Paper Figs. 8–9. The four-level hierarchy (macro → scene → composition → detail) + seven grammatical rules + nine constraints scaffold translates cleanly: replace "macro" with `asset_type_and_intent`, "scene" with `style_system_and_palette`, "composition" with `layout_and_safe_zones`, "detail" with `mark_level_specifications`. Port the nine constraints verbatim; add a tenth: *"do not describe any background if the asset is transparent."*

**What to change for asset-awareness.** Swap the reward target from generic T2I alignment to asset correctness — weight transparency and platform-compliance for logo/icon intents, text rendering for OG cards, palette-adherence when a `brand.md` is present. Add an `asset_type` classifier head (logo / app-icon / favicon / OG / illustration / hero / sticker / transparent-png). Wire the rewriter into the `validate_asset` loop: if alpha coverage < 90% on a "transparent" intent, re-prompt with a stronger negative and regenerate.

**What not to ship.** Do not ship 7B weights in EU/UK/KR. Do not copy Gemini-distilled training data into a competitive product. Do not use the Hunyuan system prompt verbatim for SDXL/Pony (SDXL under-weights prose).

## 12. Decision

**INSPIRE-ONLY** (with one tactical FORK).

- **Why not USE.** The 7B has license encumbrances (Tencent Hunyuan Community License, EU/UK/KR exclusion) that make it unsafe as a default engine for global SaaS. The 32B is commercially usable but 67 GB + 2–6 s latency is too heavy for a free tier, and both variants are asset-blind — they will actively hurt transparency and platform-spec tasks by adding background descriptions and ignoring safe zones. Shipping unchanged reproduces the gap `20a` says this project exists to fill.
- **Why not SKIP.** The AlignEvaluator recipe is the most important single artifact in OSS prompt-enhancement. The 24-KP taxonomy, the GRPO-with-group-relative-advantage loop, the four-level CoT scaffold, the 485k SFT triplet pipeline, and the HITL-filtered dataset construction are directly transferable and save us 3–6 months of research.
- **Tactical FORK — AlignEvaluator + benchmark.** When Tencent releases the evaluator weights ("progressively"), fork it, add the 6–8 asset-specific heads from §11, publish as `asset-align-evaluator`. Use it as our internal validation target and credibility anchor. [T2I-Keypoints-Eval](https://huggingface.co/datasets/PromptEnhancer/T2I-Keypoints-Eval) is already on HF and can be used today as a baseline.
- **INSPIRE-ONLY — the rewriter itself.** Lift the CoT scaffold and SFT→GRPO recipe, retarget the reward toward asset correctness, train our own Apache-2.0, ~7B, EU-safe, schema-native, asset-aware rewriter. Call it `asset-prompt-to-asset-7B`, position honestly as "the Hunyuan recipe applied to asset correctness." That is the defensible position this project is scoped for.
