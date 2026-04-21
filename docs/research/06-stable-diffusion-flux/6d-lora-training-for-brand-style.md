---
category: 06-stable-diffusion-flux
angle: 6d
title: "LoRA / LoKr / LoHA / DoRA Training for Brand Style, Icon Packs, and Asset Consistency (SDXL + Flux)"
slug: 6d-lora-training-for-brand-style
status: draft
last_updated: 2026-04-19
primary_sources:
  - "Hu et al., LoRA: Low-Rank Adaptation of Large Language Models — https://arxiv.org/abs/2106.09685"
  - "Liu et al., DoRA: Weight-Decomposed Low-Rank Adaptation — https://arxiv.org/abs/2402.09353"
  - "Kohya-ss / sd-scripts — https://github.com/kohya-ss/sd-scripts"
  - "Ostris ai-toolkit (Flux trainer) — https://github.com/ostris/ai-toolkit"
  - "Hugging Face diffusers + PEFT — https://huggingface.co/docs/peft/task_guides/lora_based_methods"
tags:
  - lora
  - dora
  - lokr
  - loha
  - flux
  - sdxl
  - style-training
  - brand-consistency
---

# LoRA / LoKr / LoHA / DoRA Training for Brand Style, Icon Packs, and Asset Consistency

## Executive Summary

For a prompt-enhancement product that emits production-grade brand assets (logos, app icons, illustrations, OG images), prompt engineering alone hits a ceiling: base SDXL and Flux.1 know *an* icon style, but not *your* icon style. The fastest durable path to brand-locked assets is a **small adapter**: 10–30 reference images, 1–4 hours on a 24 GB GPU (or $2–10 on Replicate/fal/RunPod), producing a 20–400 MB file that slots into any SDXL or Flux pipeline. Three findings drive the rest of this doc:

1. **Flux + ostris ai-toolkit is the new default for style LoRAs.** Flux.1 [dev] LoRAs trained with `ostris/ai-toolkit` at rank 16–32 on 15–25 captioned images with a rare trigger token (`TOK`, `sks`, or a coined word) consistently out-quality SDXL LoRAs for flat-vector, duotone, and illustrated brand styles — the Flux DiT backbone preserves line cleanliness and color palettes far better than SDXL's UNet, and the Replicate `ostris/flux-dev-lora-trainer` + fal.ai `flux-lora-fast-training` pipelines make 20-minute, $2 trainings a commodity.
2. **DoRA is the single biggest "free" quality upgrade over vanilla LoRA** for style tasks — decomposing weights into magnitude and direction gives denser style capture at the same rank, at ~2× training cost and zero inference cost when merged. LoKr is the right pick when you need *tiny* adapters (<10 MB) for edge/CDN shipping; LoHA helps on small datasets (<10 images) by expanding effective capacity without raising rank.
3. **Dataset quality dominates hyperparameters.** A curated 15-image set with consistent lighting, background treatment, and caption discipline (describe *content*, never the style — the style is what the trigger token absorbs) beats a 200-image noisy set at any rank. Rank 16 / alpha 16 (or alpha = rank) is a safe default; push to 32–64 only for painterly styles with fine texture; drop to 4–8 for flat/vector/mono icon sets.

A brand LoRA is the lowest-risk, highest-leverage consistency primitive for the prompt-to-asset: ship one per customer brand, activate with `<lora:brand_v1:0.9>` or the Flux equivalent, and the prompt enhancer just inserts the trigger token.

## Training Math (Brief)

**LoRA (Hu et al. 2021, arXiv:2106.09685).** For a frozen weight \(W_0 \in \mathbb{R}^{d \times k}\), LoRA learns a low-rank update \(\Delta W = B A\) where \(A \in \mathbb{R}^{r \times k}\), \(B \in \mathbb{R}^{d \times r}\), \(r \ll \min(d, k)\). The forward pass becomes \(h = W_0 x + \frac{\alpha}{r} B A x\). \(A\) is initialized to a Gaussian, \(B\) to zero, so training starts as a no-op. The scalar \(\alpha / r\) is the **LoRA alpha**; a convention is to set \(\alpha = r\) so the effective scale is 1, or \(\alpha = 2r\) to push updates harder. Parameters scale with \(r \cdot (d + k)\) — for SDXL cross-attention (d≈2048) at r=16, that's ~65 k params per layer, ~30–150 MB per full model depending on which modules are targeted.

**DoRA (Liu et al. 2024, arXiv:2402.09353).** Decomposes \(W = m \cdot \frac{V}{\|V\|_c}\) into magnitude vector \(m\) and directional matrix \(V\), then applies LoRA only to the direction: \(W' = m \cdot \frac{V + BA}{\|V + BA\|_c}\). Empirically closes most of the gap between LoRA and full fine-tuning on commonsense reasoning and vision tasks at the same rank. For style LoRAs, practitioners report sharper color fidelity and less "style-leak" into unrelated concepts. Supported in `peft>=0.10` via `LoraConfig(use_dora=True)` and in kohya as `--network_args "dora_wd=True"`.

**LoKr (Low-Rank Kronecker).** Replaces the \(BA\) decomposition with a Kronecker product \(B \otimes A\), so the parameter count is \(r \cdot (\sqrt{d} + \sqrt{k})\) rather than \(r \cdot (d + k)\) — often **10–30× smaller** files at comparable quality. Originated in LyCORIS (`KohakuBlueleaf/LyCORIS`). Downside: slower to train, slightly harder to tune, and inference requires LyCORIS or a compatible loader.

**LoHA (Low-Rank Hadamard).** Uses a Hadamard product of two low-rank decompositions: \(\Delta W = (B_1 A_1) \odot (B_2 A_2)\). Effective rank \(r^2\) at parameter cost \(2r\). Best when you have very few images (5–10) and want capacity without overfitting a single rank-r subspace. More unstable than LoRA; use lower learning rates.

Practical heuristic for T2I style work: **start with LoRA + DoRA at r=16**; fall back to LoKr for tiny artifacts; reach for LoHA only on micro-datasets.

## Toolchain Comparison

| Tool | Models | Hardware floor | Strengths | Weaknesses |
|---|---|---|---|---|
| **ostris/ai-toolkit** | Flux.1 dev/schnell, Flux.2 dev, SDXL, SD3.5 (LoRA at 8-bit on 24 GB), Wan 2.1 video, Qwen-Image | 24 GB VRAM (12 GB with quant for Flux) | De facto Flux standard; clean YAML configs; active dev; good defaults; web UI included | Younger codebase than kohya; fewer optimizers |
| **kohya-ss/sd-scripts** | SD1.5, SD2, SDXL, SD3, SD3.5, Flux (production, merged from sd3 branch into main) | 8–12 GB (SDXL LoRA with xformers) | Mature; every knob exposed; bmaltais GUI; supports LoKr/LoHA via `--network_module=lycoris.kohya`; Flux training via `flux_train_network.py` | Config sprawl; Flux support now in main but less documented than ostris |
| **Hugging Face diffusers + PEFT** | All diffusers-supported | 8 GB+ | Pythonic; easy to embed in pipelines; PEFT native DoRA/LoKr | Less optimized than kohya for disk/VRAM |
| **Replicate `ostris/flux-dev-lora-trainer`** | Flux.1 dev | Cloud (A100/H100) | $2–4 per train; auto-captioning; outputs safetensors | Closed pipeline; rank/step defaults fixed unless you fork |
| **fal.ai `flux-lora-fast-training`** | Flux.1 dev | Cloud | ~5 min trains; API-first; good for product integration | $3–6 per run; fewer knobs |
| **RunPod + ai-toolkit template** | Anything | Rent H100 for ~$2/hr | Full control; cheapest per-quality | Ops overhead |
| **CivitAI on-site trainer** | SDXL, Flux | Cloud (Buzz credits) | Zero-setup; discovery boost | Caps on rank/steps; IP concerns for brand data |

**Decision rules for the prompt-to-asset product:**

- **Internal R&D / per-customer custom brand LoRA**: Replicate or fal.ai, pipe to S3, load at inference. Unit economics pencil at $2–6 per brand per training.
- **Self-hosted scaled service**: RunPod or bare-metal H100 + `ai-toolkit` queue.
- **User-owned GPU (enthusiast tier)**: kohya on SDXL (8–12 GB works) or ai-toolkit on Flux (needs 24 GB or quantized 12 GB path).

## Dataset Recipes

The 10–30 image "style LoRA rule" survives across SDXL, Flux.1, and Flux.2. What matters is what's *in* those images.

### Recipe A — Flat-Vector Icon Pack (SDXL or Flux)

- **Images**: 12–20 icons, transparent or uniform background, rendered at 1024×1024. Include both simple (single object) and compound (object + secondary element) to teach compositional style.
- **Consistency axes**: stroke weight (e.g., 4 px at 512), palette (lock to 3–6 hex values), corner radius, shadow treatment (none / single drop).
- **Captions**: `"TOK icon of a cloud"`, `"TOK icon of a document with a checkmark"`. Describe the subject noun only. Do **not** write "flat vector style" — the trigger token owns the style.
- **Rank / alpha**: r=8, α=8. Low-rank because the style is geometrically simple; higher rank overfits and memorizes specific icons.
- **Steps**: 1,500–2,500 (Flux), 2,000–4,000 (SDXL). Save every 250 and pick visually.
- **Learning rate**: 1e-4 UNet, 5e-5 text encoder (SDXL); 1e-4 transformer, text encoder frozen (Flux default).
- **Augmentation**: horizontal flip OK for symmetric glyphs; disable color jitter (it destroys the palette you're trying to lock).

### Recipe B — Painterly Marketing Illustration

- **Images**: 20–30 illustrations at 1024–1536. Variety of subjects but consistent texture, palette, and lighting.
- **Captions**: verbose — subject, pose, environment, but still omit style words.
- **Rank / alpha**: r=32, α=32 (LoRA) or r=16 with DoRA (comparable quality, half the file).
- **Steps**: 3,000–5,000.
- **Why DoRA here**: painterly styles live in high-frequency texture that vanilla LoRA at the same rank under-captures; DoRA's direction/magnitude split preserves it.

### Recipe C — Duotone / Monochrome Brand Style

- **Images**: 10–15 duotone illustrations in the exact two brand colors.
- **Trigger**: include the hex codes in the caption once per image as anchors, e.g. `"TOK illustration in #0A2540 and #F5E6C8 of a person reviewing a dashboard"`.
- **Rank**: r=8–16.
- **Watch-out**: if the base model strongly biases toward full color, blend the LoRA at 0.8–1.0 at inference and add a light negative prompt for "full color, rainbow, gradient".

### Recipe D — Logo / Mark Consistency (narrow brand lock)

- Treat as a **concept LoRA**, not a style LoRA. 5–10 images of the mark at different scales, orientations, and backgrounds.
- LoHA at r=4 often beats LoRA here because the effective rank is higher at the same parameter count, and the mark is a low-dimensional target.
- Train with regularization images (50–100 generic images with class caption like "a logo") to prevent catastrophic forgetting of "logo" as a concept.

### Captioning Strategy

- **Autocaption then edit.** Use BLIP-2 or CogVLM via ai-toolkit's built-in captioner, then hand-pass for 20 images (cheap). Remove any mention of the style. Add the trigger token as the first word.
- **Rare trigger token.** `TOK`, `sks`, a made-up word like `brndx`, or a 3–5 char string with no CLIP embedding history. Avoid real words and avoid the brand name itself (it bleeds in both directions at inference).
- **Caption dropout**: 5–10 % (set `caption_dropout_rate: 0.05`) improves generalization; 0 caption dropout overfits captions as style.

### Regularization / Class Images

- SDXL: often worth adding 50–200 regularization images when the target style is narrow (e.g. logos), to preserve base model ability.
- Flux: community consensus is regularization images are **usually not needed** — Flux's prior is strong enough that LoRA at reasonable rank doesn't wreck it.

## Style-Lock Patterns

Training the LoRA is half the job. "Style lock" = reliably reproducing the brand at inference across thousands of prompts.

1. **Trigger token discipline.** The prompt enhancer must always inject the trigger at a consistent position — usually first token. A/B test first-token vs. last-token placement; first-token typically gives 10–15 % stronger style pull.
2. **LoRA scale as a knob.** `<lora:brand:0.9>` (A1111 syntax) / `load_lora_weights(..., adapter_name="brand"); set_adapters("brand", weights=0.9)` (diffusers). Scales above 1.0 are legal and sometimes needed (Flux LoRAs commonly render best at 0.8–1.2). Below 0.5 the style barely surfaces.
3. **Multi-LoRA stacks.** Stack a brand-style LoRA with a format LoRA (e.g., "iOS app icon shape") at weights 1.0 / 0.7. Verify there is no rank-collision by testing each individually first.
4. **Block-weight merging (SDXL).** `lora-block-weight` lets you attenuate specific UNet blocks. Style is concentrated in mid/up blocks; content is in down blocks. Zero out down blocks of the style LoRA to avoid subject contamination.
5. **DoRA for cleaner blending.** Multiple stacked DoRA adapters interfere less than stacked LoRAs because the magnitude vector is dimension-wise rather than shared, so per-channel saturation is smoother.
6. **Negative prompts on SDXL** (Flux does not support negative prompts — the entire Flux family uses guidance distillation with no unconditional branch). Community workarounds exist: ComfyUI `FluxPseudoNegativePrompt` node rewrites negatives as affirmative antonyms; "true CFG" via double forward pass + dynamic thresholding is possible but costs ~2× inference time and is not exposed by any commercial endpoint. For Flux, convert all negatives to affirmative descriptions. For SDXL brand locks: `"photograph, 3d render, realistic, gradient, watermark, text"` depending on what the base model likes to insert.

> **Updated 2026-04-21:** The claim that Flux.1 [dev] "honors a weak negative via guidance_scale tricks" is misleading. Flux.1 [dev]'s guidance distillation means there is no unconditional branch to apply a negative to. The `guidance_scale` parameter is a conditioning scalar on the distilled model, not an extrapolation coefficient. Raising guidance_scale does not "hear" a negative prompt — it just makes the model follow the positive prompt more literally. Community CFG-restore experiments (Forge distillation CFG, inverse-cosine remapping) can partially re-enable true CFG but at 2× inference cost and reduced quality; none are available on commercial endpoints.
7. **Seed sweeps for QA.** For every brand LoRA, generate a 16-prompt × 4-seed matrix covering asset categories (icon, illustration, logo mark, OG header). Visually audit before shipping.
8. **Temperature / guidance.** SDXL: CFG 5–7 for style LoRAs. Flux.1 dev: guidance 3.0–4.0 is the sweet spot; higher than 5 saturates the style and hurts prompt adherence.

### Merging & Distilling LoRAs into the Base

Once a brand LoRA is stable, you can **merge** it into the base weights with a factor (`merge_and_unload()` in PEFT, or `sd-scripts` `networks/merge_lora.py`). Outputs a standalone checkpoint with zero inference overhead — useful when you're running a dedicated per-brand endpoint. Downside: lose dynamic scale control.

For multi-brand services, keep the base model shared and hot-swap adapters (`diffusers` supports this natively via `set_adapters([...])`; Flux inference servers like ComfyUI and Forge both support dynamic LoRA hotswap).

## Inference Tips

- **File size budget.** Rank-16 SDXL LoRA ≈ 150 MB, rank-16 Flux LoRA ≈ 300–700 MB depending on which Flux modules were targeted (`single_transformer_blocks` only vs. both). Ship compressed on CDN; decompression is negligible.
- **Prompt enhancer integration.** The enhancer should be LoRA-aware: when a brand LoRA is selected, (a) inject trigger token as first token, (b) choose a base prompt template tuned to the LoRA's dataset distribution (icon template vs. illustration template), (c) clamp negative prompts to the brand's approved list.
- **Known failure modes.**
  - *Style leak into subject*: caption discipline was poor. Retrain with cleaner captions or lower LoRA weight to 0.6.
  - *Trigger token ignored*: rank too low, or trigger token not rare (collided with CLIP embedding). Re-pick trigger.
  - *Checkerboard / artifact on transparent bg*: base model issue, not LoRA. Route to a transparent-native model (e.g. LayerDiffusion for SDXL) or post-process via rembg.
  - *Flat icons come out "3D-ish"*: Flux base model tilts toward photorealism; either train with higher rank and more examples, or switch to SDXL base which is more permissive of flat/vector aesthetics.

> **Updated 2026-04-21:** **kohya-ss/sd-scripts** Flux support is no longer experimental — the `sd3` branch was merged into `main`, and Flux training via `flux_train_network.py` is production-grade in 2025/2026. **ostris/ai-toolkit** added SD3.5 LoRA training support (8-bit on 24 GB GPU, October 2024) and continues to add models (Wan 2.1 video, Qwen-Image). The ai-toolkit web UI is now bundled, reducing the setup friction. **Stability AI** raised ~$80M in mid-2024 and stabilized financially; the API and DreamStudio remain operational as of April 2026, though two endpoints were discontinued in July 2025 (SD1.6 API path; users should migrate to SDXL or SD3.5). **Replicate** Flux LoRA trainer and **fal.ai** fast training remain the recommended $2–6 cloud paths for Flux LoRAs.

## Compute & Cost Table (as of Q1 2026)

| Target | Time | Cost (cloud) | Cost (owned 4090) |
|---|---|---|---|
| SDXL LoRA, r=16, 3k steps, 20 imgs | 45–90 min on 4090 | ~$1–2 RunPod | ~$0.30 power |
| Flux.1 dev LoRA, r=16, 2k steps, 20 imgs | 30–60 min on H100 | $2–4 Replicate/fal | OOM on 24 GB without quant |
| Flux.1 dev LoRA, quantized (ai-toolkit) | 60–120 min on 4090 | — | ~$0.60 power |
| DoRA (~2× LoRA training time) | +50–100 % | +50–100 % | +50–100 % |
| LoKr | ~LoRA time, smaller artifact | same | same |

Cloud pricing: Replicate Flux LoRA trainer is flat-rate per train; fal.ai charges per GPU-minute (~$0.00025/s on H100); RunPod H100 spot is ~$2/hr.

## References

- Hu, Edward J., et al. "LoRA: Low-Rank Adaptation of Large Language Models." arXiv:2106.09685. https://arxiv.org/abs/2106.09685
- Liu, Shih-Yang, et al. "DoRA: Weight-Decomposed Low-Rank Adaptation." arXiv:2402.09353 (2024). https://arxiv.org/abs/2402.09353
- Yeh, Shin-Ying, et al. "Navigating Text-to-Image Customization: From LyCORIS Fine-Tuning to Model Evaluation." arXiv:2309.14859 (LyCORIS / LoKr / LoHA). https://arxiv.org/abs/2309.14859
- Kohya-ss sd-scripts. https://github.com/kohya-ss/sd-scripts
- bmaltais kohya_ss GUI. https://github.com/bmaltais/kohya_ss
- LyCORIS. https://github.com/KohakuBlueleaf/LyCORIS
- Ostris ai-toolkit. https://github.com/ostris/ai-toolkit
- Ostris Flux LoRA training notebook. https://github.com/ostris/ai-toolkit/blob/main/notebooks/FLUX_1_dev_LoRA_Training.ipynb
- Hugging Face PEFT — LoRA methods (LoRA, DoRA, LoKr, LoHA, AdaLoRA). https://huggingface.co/docs/peft/task_guides/lora_based_methods
- diffusers LoRA inference & multi-adapter. https://huggingface.co/docs/diffusers/tutorials/using_peft_for_inference
- Replicate `ostris/flux-dev-lora-trainer`. https://replicate.com/ostris/flux-dev-lora-trainer
- fal.ai Flux LoRA fast training. https://fal.ai/models/fal-ai/flux-lora-fast-training
- Black Forest Labs Flux.1 model card. https://huggingface.co/black-forest-labs/FLUX.1-dev
- CivitAI — survey of "flat illustration", "app icon", "duotone" style LoRAs (community corroboration, not primary). https://civitai.com/tag/style
- AUTOMATIC1111 webui LoRA syntax docs. https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#lora
- ComfyUI LoRA loader + LoRA block weight. https://github.com/comfyanonymous/ComfyUI
- lora-block-weight. https://github.com/hako-mikan/sd-webui-lora-block-weight

---

*Subagent 6d, wave 2. Corroboration on dataset size and rank heuristics drawn from community reports on CivitAI and Reddit r/StableDiffusion; all technical claims tied to primary papers or official repos above.*
