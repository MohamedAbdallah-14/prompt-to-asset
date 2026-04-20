---
category: 17-upscaling-refinement
angle: 17b
title: "Diffusion-based refinement & upscale: SUPIR, CCSR, DiffBIR, StableSR, SeeSR, SDXL-refiner, Magnific, Topaz"
status: draft
agent: research-subagent-17b
date: 2026-04-19
primary_sources:
  - "arXiv:2401.13627 (SUPIR, CVPR 2024)"
  - "arXiv:2401.00877 (CCSR)"
  - "arXiv:2308.15070 (DiffBIR)"
  - "arXiv:2305.07015 (StableSR, IJCV 2024)"
  - "arXiv:2311.16518 (SeeSR, CVPR 2024)"
  - "arXiv:2307.01952 (SDXL, Podell et al. 2023)"
tags: [upscaling, refinement, diffusion, super-resolution, SUPIR, CCSR, DiffBIR, StableSR, SeeSR, SDXL-refiner, Magnific, Topaz, Clarity]
---

# 17b — Diffusion-Based Refinement & Upscale

Scope of this angle: **generative** upscalers and refiners that use a latent-diffusion prior to *add* plausible high-frequency content, in contrast to the purely regressive upscalers (Real-ESRGAN, SwinIR, etc.) covered under 17a. The families we cover are:

1. Open research models: **SUPIR**, **CCSR** (v1/v2), **DiffBIR** (v1/v2), **StableSR**, **SeeSR**.
2. Built-in model pipelines: **SDXL base → refiner**, **Flux-dev low-strength img2img**.
3. Commercial products: **Magnific.ai** ("Creative Upscale"), **Topaz Gigapixel / Photo AI**.
4. Open-source "Magnific alternatives": **Clarity Upscaler** (SD1.5 tiled ControlNet + LoRA stack).

The target use case for this project is software-asset generation — logos, app icons, favicons, OG images, UI illustrations — so throughout we flag where a diffusion refiner *helps* (cleaning SDXL artifacts, adding material detail to product shots) and where it *hurts* (hallucinating type, destroying flat/vector aesthetics, breaking transparency).

## Executive Summary

- **Diffusion refiners are a different product category from regressive SR.** Regressive models (ESRGAN family) reconstruct what was probably there. Diffusion refiners *generate* what could plausibly be there — they will invent pores, threads, grain, wood texture, etc., guided by a text prompt. For natural photography this is magic; for **flat logos, icons, and type** it is almost always destructive.
- **SUPIR (SDXL + LLaVA caption + ControlNet-style adapter)** is the current research state of the art for "restore + upscale in the wild," but it is heavy: 24 GB VRAM is the practical floor for 2–3k outputs, and paper-quality results want an A100-class card. It ships with negative-quality prompts ("oil painting, cartoon, blur, lowres, dirty, messy, low quality") as first-class inputs.
- **DiffBIR v2 and StableSR are the "sane defaults"** for local pipelines — SD1.5-based, 8–12 GB VRAM, good quality on faces and real-world photos, weaker on graphic-design assets. **CCSR v2** is the fast option (1–2 diffusion steps, deterministic via GAN-finetuned VAE decoder) and the only one here that meaningfully supports batch throughput.
- **SeeSR fixes the "diffusion hallucinated wrong semantics" failure mode** by extracting tag-based soft/hard prompts from the LR image with a RAM (Recognize-Anything Model) encoder. This is the most useful diffusion SR for content where *identity preservation* matters (products, faces, recognizable logos).
- **SDXL base → refiner is a weak form of diffusion refinement**, not a true upscaler: it runs ~20 % of the steps on the already-decoded latent in image space and specializes in the last 200 noise scales. It polishes but does not enlarge, and it cannot fix composition errors from the base.
- **Flux-dev "refiner" is not an official mode.** What people call a Flux refiner is just `img2img` at denoise 0.15–0.30, optionally driven by a tile/depth ControlNet. It is highly effective at cleaning Flux's own small-scale artifacts and is surprisingly good at keeping type intact at denoise ≤ 0.20.
- **Magnific.ai and its OSS clone Clarity Upscaler treat upscale as a *creative* act.** Magnific exposes Creativity, HDR, Resemblance, Fractality sliders that amount to "how much hallucination is allowed." The OSS equivalent is a tiled SD1.5 workflow with Tile ControlNet + a LoRA stack, running at denoise ~0.35 on 512-px tiles.
- **Topaz Gigapixel / Photo AI are the commercial safe harbor** for non-diffusion, identity-preserving upscale. For asset pipelines where the agent is allowed to touch local binaries, Gigapixel is the *only* one of these tools that will not invent fake detail in a flat logo.
- **For our software-asset pipeline, the default posture should be: do not use a diffusion refiner on flat/vector/type assets.** Use diffusion refinement only for (a) photographic product shots that need material detail, (b) cleaning SDXL-base-level artifacts on stylized illustrations, and (c) up-ressing photography-style OG/hero images. For logos and icons, prefer regressive + vectorization (see 17a and 12).

## Method Table

| Model | Year | Base | Params / "weight class" | Stages | Key inputs | Typical VRAM (2k output) | Determinism | Creative vs faithful |
|---|---|---|---|---|---|---|---|---|
| **SUPIR** (Yu et al., arXiv:2401.13627) | 2024 (CVPR) | SDXL 1.0 | 2.6 B (base) + 600 M adapter | 1 (adapter-driven denoise) | LR image + LLaVA caption + neg-quality prompt + restoration-guidance scalar | 20–28 GB (fp16), 8–12 GB (fp8, tiled VAE) | Low (stochastic) | **Creative-leaning** but tunable |
| **CCSR v2** (csslc, arXiv:2401.00877) | 2024 | SD2.1 | ~900 M | 2 (non-uniform-step DM + GAN-finetuned VAE decoder) | LR image (no prompt required) | 8–12 GB | **High** (deterministic stage 2) | **Faithful-leaning**, very stable |
| **DiffBIR v2** (XPixelGroup, arXiv:2308.15070) | 2023/2024 | SD2.1 + IRControlNet | ~860 M + 360 M | 2 (Swin-IR deg-removal → IRControlNet regen) | LR image + optional prompt + region-adaptive guidance scale | 8–14 GB | Mid (tunable) | Balanced; handles BIR / BFR / denoise in one stack |
| **StableSR** (IceClear, arXiv:2305.07015) | 2023/2024 (IJCV) | SD2.1 | ~860 M + time-aware encoder | 1 + CFW | LR image + CFW scalar (fidelity↔realism) | 6–10 GB | Mid (progressive aggregation sampling gives stable large-image tiling) | Faithful-leaning |
| **SeeSR** (Wu et al., arXiv:2311.16518) | 2024 (CVPR) | SD2.1 + RAM encoder | ~900 M + RAM | 1 | LR image + auto-extracted hard/soft tag prompts; LR injected into init noise | 10–14 GB | Mid | **Semantics-preserving**; least likely to hallucinate wrong objects |
| **SDXL refiner** (Podell et al., arXiv:2307.01952) | 2023 | SDXL-specific | 2.3 B | 1 (SDEdit on base latent, first 200 noise scales) | base latent + prompt | 10–12 GB (on top of base) | N/A (polish only) | Faithful by design (low-noise regime only) |
| **Flux-dev "refiner"** (community, not an official mode) | 2024–2026 | Flux.1-dev | 12 B | 1 (img2img) | image + prompt + denoise 0.10–0.30 | 16–24 GB | Mid | Faithful at ≤0.20; creative at ≥0.35 |
| **Magnific.ai** (closed) | 2024 | Multiple (SD-family engines: illusio / sharpy / sparkle, plus Flux variant) | n/a | Tiled diffusion + prompt guidance | image + prompt + Creativity/HDR/Resemblance/Fractality/engine/optimization mode + 2/4/8/16× | Cloud | Low (stochastic) | **Creative by design** |
| **Clarity Upscaler** (philz1337x) | 2024 | SD1.5 + Tile ControlNet + LoRA stack | ~1 B | Tiled img2img | image + prompt + denoise + LoRA selection | 8–12 GB | Mid | Magnific-like; tunable |
| **Topaz Gigapixel / Photo AI** (closed) | 2024–2025 | Proprietary (regressive + optional "Redefine" generative mode from 2024) | n/a | 1 | image (+ optional text for Redefine) | Local GPU (3–8 GB) | High (regressive), mid (Redefine) | **Faithful by default**, creative only in Redefine mode |

Note on SDXL refiner: the refiner is trained on the "first 200 discrete noise scales" of the SDXL schedule, i.e. the low-noise, high-detail end. It is run as an SDEdit-style noising-denoising pass on the base output's latent, not as a super-resolution stage. Resolution is unchanged (1024² → 1024²).

## Architecture & Algorithm Notes

### SUPIR (arXiv:2401.13627)

SUPIR is the heaviest and highest-ceiling option. Key ingredients:

1. **SDXL as the generative prior** (2.6 B params). All restoration knowledge comes from SDXL's pre-training on ~billions of image-text pairs.
2. **A large-scale adapter** (~600 M params) that conditions SDXL on the LR image via a ControlNet-like branch, trained on ~20 M curated high-res/high-quality images with caption enrichment.
3. **LLaVA-generated captions** fed as positive prompt. The authors argue that text guidance is essential for "semantic awareness" during restoration — e.g. knowing that a degraded blob is supposed to be a ladybug, a bolt head, or a logo, so the generated detail is consistent.
4. **Negative-quality prompt** — a first-class input, typically `"oil painting, cartoon, blur, dirty, messy, low quality, deformed, lowres, over-smooth"`. This tells SDXL what to avoid during denoising.
5. **Restoration-guided sampling** — a custom scheduler that projects intermediate latents back toward the LR image to keep fidelity from drifting during the many-step generative process.

**Failure modes** specifically relevant to our asset pipeline:

- On **flat logos** SUPIR will add shading, gradient banding, faux paper/vector texture, and invent edge noise that destroys the mark.
- On **type** SUPIR will reshape letterforms if the caption or base prompt is even slightly wrong; letterform identity is not preserved unless the restoration-guidance scale is pushed up (at which point the output starts to look under-enhanced).
- On **transparent PNGs** SUPIR is RGB-only; alpha must be kept separately (matte the subject on a neutral fill, upscale, re-matte — and re-cut background with BiRefNet). See 13-transparent-backgrounds.

### CCSR v2 (arXiv:2401.00877)

CCSR's core insight is that diffusion SR is *unstable* — two runs on the same input give two different outputs. CCSR resolves this with a **two-stage split**:

1. **Diffusion stage** with a *non-uniform* timestep schedule: a single large-step jump extracts coarse structure, then a short reverse trajectory fills in mid-frequency content. The paper formulates this so the diffusion contribution can be truncated to as few as 1–2 steps without retraining.
2. **GAN-finetuned VAE decoder stage** replaces stochastic fine-detail synthesis with a deterministic adversarial decoder. This kills the "different detail every run" problem and gives CCSR its distinctive stability.

Consequences: CCSR v2 is the only diffusion SR in this list with something close to **regressive-style determinism and throughput**. For an agent pipeline where you want reproducible outputs from the same seed+input, CCSR is the strongest open option.

### DiffBIR v2 (arXiv:2308.15070)

DiffBIR is intentionally a *general* blind-restoration framework: blind SR, blind face restoration, blind denoising, all in one stack. The architecture:

1. **Stage 1: degradation removal** — a Swin-IR-style regressive restorer cleans the LR input into a "pre-restored" image with reduced noise, blur, JPEG, etc. This step is intentionally *conservative* (no hallucination).
2. **Stage 2: IRControlNet** — a ControlNet variant trained on the *cleaned* condition (not the raw LR), which is the key trick. By training on clean conditions the control signal doesn't carry degradation artifacts into the diffusion prior.
3. **Region-adaptive restoration guidance** — an inference-time knob that pulls the denoising trajectory toward the LR image in high-fidelity regions (flat areas, text) and lets it roam in low-fidelity regions (textures, hair).

DiffBIR v2 (repo: XPixelGroup/DiffBIR) is the most "productionable" of the open options when you need a single model to handle heterogeneous input quality without retraining.

### StableSR (arXiv:2305.07015)

StableSR was the first to frame diffusion SR as a **frozen-SD + trainable adapter** problem and is still relevant because of two production-friendly contributions:

1. **Time-aware encoder** conditioning on LR — parameter-efficient, no SD weights change.
2. **Controllable Feature Wrapping (CFW)** — a scalar at inference time that interpolates between the VAE's encoder output and the LR image, trading realism for fidelity.
3. **Progressive aggregation sampling** — lets you tile an arbitrarily large image while keeping cross-tile consistency by overlapping diffusion trajectories. This is the antecedent of the "tiled diffusion" tricks Magnific/Clarity rely on.

### SeeSR (arXiv:2311.16518)

SeeSR tackles the "wrong semantics" failure mode. Because LR images destroy local structure, diffusion priors will sometimes restore a cat's whiskers onto a dog, or render a logo's negative space as leaves. SeeSR:

1. Uses a **RAM (Recognize Anything Model)** to extract reliable tags from the LR image even under heavy degradation.
2. Feeds *hard* tags (discrete labels) and *soft* tags (embedding tokens) as prompts into SD.
3. Injects the LR into the initial sampling noise rather than starting from pure Gaussian noise, which suppresses "too creative" detail generation.

For **logo and product upscale** SeeSR is the safest diffusion option among the research models because its prompt is grounded in what the image *is*, not in what the caller *says* it is.

### SDXL base → refiner

The SDXL paper (Podell et al. 2023, arXiv:2307.01952) describes the refiner as a separate latent diffusion model trained in the same latent space as the base, **specialized on the first 200 discrete noise scales** and run as a noising-denoising pass on the base output's latent. Three properties matter for our pipeline:

- The refiner has only **one text encoder** (OpenCLIP ViT-bigG) instead of the base's two; prompts are effectively truncated in capacity.
- It does **not** change resolution. It polishes 1024² outputs into cleaner 1024² outputs.
- Practical usage is to split the sampling schedule e.g. 80 % base / 20 % refiner ("ensemble of experts" in the paper). Many production pipelines skip the refiner entirely because the base SDXL plus a modern sampler already reaches the quality ceiling.

### Flux-dev "refiner"

There is no official Flux refiner. The community pattern is:

1. Generate at native resolution (or use a Flux SR LoRA).
2. Run `img2img` on the same model at denoise 0.12–0.25, same prompt, 1.5–2× upscaled image.
3. Optionally add a **Tile ControlNet** or depth controlnet to constrain structure.

This is surprisingly competitive on stylized assets — at denoise ≤ 0.20 Flux will fix its own small-scale artifacts (aliased edges, letterform micro-defects) without repainting. It is especially strong on **type** because Flux's type prior is already better than SDXL's; a low-denoise pass sharpens rather than mutates glyphs.

### Magnific.ai

Magnific does not publish an architecture paper, but the public API and product signals point to a **tiled SD + prompt-guided img2img** pipeline with multiple engines:

- `magnific_illusio` — heavier hallucination, best for painterly / stylized.
- `magnific_sharpy` — crisp detail, more faithful.
- `magnific_sparkle` — highlights/materials boost.
- A separate **Flux-based engine** launched in 2024 for faithful, type-preserving work.

Controls exposed to users:

- **Creativity** (−10…+10): how much hallucination.
- **HDR**: local contrast / tone compression boost.
- **Resemblance**: fidelity-toward-input weight.
- **Fractality**: small-scale detail multiplier.
- **Optimization modes**: portraits / illustrations / landscapes / 3D renders / interior / food.
- **Scale**: 2×/4×/8×/16×.

Magnific is the canonical "creative upscaler" UX and is worth studying as the interface model for our skill's "refine" action — the slider set maps cleanly to parameters in a Clarity-style open-source tiled pipeline.

### Clarity Upscaler (open-source Magnific clone)

`philz1337x/clarity-upscaler` (5k+ stars, AGPL-3.0) is effectively a Magnific-shaped wrapper around Stable Diffusion 1.5 with:

- **Tile ControlNet** to preserve structure per-tile.
- A stack of LoRAs (detail, clarity, skin, etc.) that can be swapped per call.
- Tunable denoise (the "Creativity" analog), sharpen, steps, schedule.
- Multi-step mode: upscale→refine→upscale→refine.
- Up to 13k × 13k outputs.

Flux upscaling is **not** in the OSS repo; it is paywalled into the hosted ClarityAI.co service.

### Topaz Gigapixel / Photo AI

Topaz's tools are closed-source but architecturally distinct from everything above: they are **regressive** AI upscalers trained for fidelity. Since 2024 Gigapixel has added a **"Redefine"** generative mode that uses a diffusion-style prior with an optional text prompt and a creativity slider, putting it into direct comparison territory with Magnific — but the *default* mode is still faithful regression. For asset pipelines that must not hallucinate new geometry (e.g. an existing logo being upscaled for a vendor spec), Topaz in default mode is the safest commercial option.

## Quality Tradeoffs — Creative vs Faithful

We evaluate each tool on three asset-pipeline axes: **geometry fidelity** (does the mark / glyph / product silhouette survive), **micro-detail quality** (does fine structure look plausible), and **hallucination risk** (how likely it invents content that doesn't exist in the input).

| Tool | Geometry fidelity | Micro-detail quality | Hallucination risk | Best for | Avoid for |
|---|---|---|---|---|---|
| SUPIR (default) | Low | Very high | **High** | Degraded photography, product shots, legacy photo restoration | Logos, type, flat UI |
| SUPIR (high restoration-guidance) | Mid–high | High | Medium | Real-world photos where you need both | Heavily stylized illustrations |
| CCSR v2 | High | Mid | **Low** | Batch photo upscale, reproducible outputs | Cases where you want *added* detail |
| DiffBIR v2 (low guidance scale) | High | Mid–high | Low | Faces, denoise, general BIR | Flat logos (still some hallucination) |
| StableSR (high CFW) | High | Mid | Low | Faithful 4× photo upscale | Creative enhancement |
| SeeSR | **High** (semantics-grounded) | Mid–high | **Very low** | Products with recognizable identity | Unknown/abstract content |
| SDXL refiner | **Very high** (polish only) | Mid | Very low | Polishing SDXL base outputs | Up-ressing; doesn't enlarge |
| Flux img2img ≤0.20 denoise | **Very high** | High | Very low | Cleaning Flux outputs, type-safe refine | Big upscale ratios |
| Magnific Creative mode | Low | **Extreme** | **Very high** | Hero photography, product moodshots, painterly | Anything identity-sensitive |
| Magnific Faithful/Flux mode | High | High | Low–mid | Brand hero images, OG visuals | — |
| Clarity (denoise ~0.35) | Mid | High | High | OSS Magnific-style enhancement | Type-heavy assets |
| Topaz Gigapixel (default) | **Very high** | Mid–high | **Very low** | Logo/icon upscale when geometry matters | Adding non-existent detail |
| Topaz Redefine | Mid | High | Medium | Controlled "creative" upscale | Production logo work |

### When diffusion refinement wins

1. **Photographic product shots for OG / hero / marketing graphics.** A Flux- or SDXL-base output of "wireless earbuds in a marble bowl" will have plausible-looking surfaces but poor micro-detail (unrealistic reflections, vague material). SUPIR or Magnific at moderate creativity adds plausible brushed-metal, knurling, wire texture, bokeh particles — and the *wrongness* of added detail is perceptually acceptable because the viewer has no exact reference.
2. **Cleaning SDXL-base-level artifacts on stylized illustrations.** SDXL will produce soft edges, mild pointillism in flat areas, and micro-banding. A low-denoise SDXL-refiner pass (or Flux img2img at denoise 0.15) cleans these without reshaping content. This is a *polish*, not an *enlarge*.
3. **Up-ressing UI hero imagery (2k → 4k–8k).** Diffusion tiling (Clarity / Magnific) is the only way to get 4× upscale on a 2048-wide hero while keeping plausible fine structure; pure ESRGAN at that ratio looks plasticky.
4. **Face recovery on legacy photography.** DiffBIR blind face restoration and SUPIR both beat GFPGAN/CodeFormer on heavily degraded inputs.

### When diffusion refinement loses

1. **Flat logos, monograms, wordmarks.** Diffusion will add shading, texture, drop shadows, and micro-ornamentation. A 256-px logo should be vectorized (see 12) and rendered at target resolution, not diffused.
2. **App icons, favicons.** Same reason as logos plus strict platform geometry (safe zones, corner radii). Diffusion destroys these.
3. **Text-heavy assets.** SUPIR, Magnific creative, Clarity at denoise ≥ 0.3 will all corrupt glyphs. Flux at denoise ≤ 0.2, SDXL refiner, or non-diffusion methods are safer.
4. **Transparency (RGBA) assets.** Every diffusion refiner here is RGB-only. See 13-transparent-backgrounds for the matte → upscale → re-matte pipeline.
5. **Brand consistency.** Diffusion refiners do not carry brand identity; two calls on the same brand asset can produce different fine-detail personalities. For brand systems, use 15-style-consistency techniques or stick to regressive upscale.

## VRAM Profile (Practical, for Asset Pipelines)

All numbers below are approximate and taken from project READMEs, ComfyUI community threads (notably `kijai/ComfyUI-SUPIR` issues #12 and #93), and diffusers docs. They are "what works reliably without swapping" figures; hard minimums are lower but bring instability.

| Model | Input size | Output size | VRAM (fp16) | VRAM (fp8 / tiled VAE) | Notes |
|---|---|---|---|---|---|
| SUPIR | 512² | 2048² (4×) | ~14 GB | ~8 GB | LLaVA caption adds ~8 GB unless offloaded |
| SUPIR | 1024² | 3072² | 20–24 GB | 10–14 GB | 24 GB is marginal; reports of OOM |
| SUPIR | 2048² | 4096² | 28–36 GB | 18–24 GB | Effectively A100/H100 territory |
| CCSR v2 | 512² | 2048² | 6–8 GB | — | 1–2 step inference |
| DiffBIR v2 | 512² | 2048² | 8–10 GB | — | Stage 1 Swin-IR + Stage 2 SD |
| StableSR | 512² | 2048² | 6–8 GB | — | Progressive aggregation for >2k |
| SeeSR | 512² | 2048² | 10–12 GB | — | RAM tag encoder is small (~300 MB) |
| SDXL base + refiner | 1024² | 1024² | 10–14 GB | — | Not an upscaler; polish only |
| Flux-dev img2img | 1024² | 1536² | 16–20 GB | 10–14 GB (Q8 GGUF) | Q4–Q8 quantization widely used |
| Clarity (SD1.5 + Tile CN) | 512² tile | 4096² | 8–12 GB | — | Tiled, so scales to 13k² |
| Magnific | cloud | — | — | — | Per-image pricing |
| Topaz Gigapixel | — | — | 3–6 GB local | — | Regressive; modest VRAM |

Throughput for asset pipelines: CCSR v2 is the only model here that can plausibly batch many assets per minute on a single 12 GB GPU. SUPIR is closer to seconds-to-minutes per asset even on a 24 GB card. For a consumer-grade agent backend, **the realistic local default is CCSR or DiffBIR**; SUPIR should be an opt-in "high quality, slow" mode; Magnific / Topaz should be API-level escape hatches.

## Pipeline Recommendations for This Project

Given that our product generates logos, app icons, illustrations, favicons, OG images, and splash screens, the recommended refinement matrix is:

- **Logos / wordmarks / monograms** → no diffusion refiner. Vectorize (see 12) and render at target.
- **App icons** → no diffusion refiner. Regressive upscale + rigorous masking (see 09).
- **Favicons / PWA icons** → generate at target resolution. No refiner.
- **OG / Twitter / hero images (photographic)** → Flux-dev at denoise 0.12–0.18 for polish, then Clarity or Magnific 2× for final up-res. SUPIR is overkill.
- **OG / Twitter / hero images (illustrated)** → SDXL refiner or Flux low-denoise pass. Do not tile-upscale with Magnific-creative.
- **In-app illustrations (empty states, onboarding)** → Flux low-denoise pass only. Avoid SUPIR / Magnific creative — they break style consistency.
- **Product shots for marketing** → SUPIR or Magnific creative; this is the sweet spot for "invent plausible material detail."
- **Legacy photo restoration** (user-supplied photos) → DiffBIR v2 (blind face + general) or SUPIR with restoration-guidance pushed high.

Operationally, we expose this as a single tool call with a `mode` parameter — `faithful | balanced | creative` — mapping to (regressive | CCSR/DiffBIR | SUPIR/Magnific). The skill's job is to *refuse* creative mode on logo/icon/favicon asset categories automatically.

## References

**Primary papers (arXiv / CVPR / IJCV):**

- Yu, F. et al. *Scaling Up to Excellence: Practicing Model Scaling for Photo-Realistic Image Restoration In the Wild* (SUPIR). arXiv:2401.13627. CVPR 2024. https://arxiv.org/abs/2401.13627
- Sun, L. et al. *Improving the Stability of Diffusion Models for Content Consistent Super-Resolution* (CCSR). arXiv:2401.00877. https://arxiv.org/abs/2401.00877 · project: https://csslc.github.io/project-CCSR
- Lin, X. et al. *DiffBIR: Towards Blind Image Restoration with Generative Diffusion Prior*. arXiv:2308.15070. https://arxiv.org/abs/2308.15070
- Wang, J. et al. *Exploiting Diffusion Prior for Real-World Image Super-Resolution* (StableSR). arXiv:2305.07015. IJCV 2024. https://arxiv.org/abs/2305.07015 · project: https://iceclear.github.io/projects/stablesr/
- Wu, R. et al. *SeeSR: Towards Semantics-Aware Real-World Image Super-Resolution*. arXiv:2311.16518. CVPR 2024. https://arxiv.org/abs/2311.16518
- Podell, D. et al. *SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis*. arXiv:2307.01952. https://arxiv.org/abs/2307.01952

**Official repos:**

- SUPIR: https://github.com/Fanghua-Yu/SUPIR
- ComfyUI-SUPIR (Kijai): https://github.com/kijai/ComfyUI-SUPIR
- CCSR: https://github.com/csslc/CCSR
- DiffBIR: https://github.com/XPixelGroup/DiffBIR
- StableSR: https://github.com/IceClear/StableSR
- SeeSR: https://github.com/cswry/SeeSR
- SDXL generative-models: https://github.com/Stability-AI/generative-models
- Clarity Upscaler: https://github.com/philz1337x/clarity-upscaler · Replicate: https://replicate.com/philipp1337x/clarity-upscaler

**Commercial product pages:**

- Magnific.ai: https://magnific.ai · API: https://magnific.ai/api
- Scenario integration docs (Magnific parameters): https://docs.scenario.com/docs/image-upscale-models-magnific
- Topaz Gigapixel AI: https://www.topazlabs.com/gigapixel-ai
- Topaz Photo AI: https://www.topazlabs.com/topaz-photo-ai

**Corroborating community sources:**

- Topaz Gigapixel vs Photo AI (Arjen Roos, 2025): https://arjenroos.com/topaz-gigapixel-vs-photo-ai-which-upscaler-is-right-for-you-in-2025
- Topaz Photo AI vs Gigapixel (Aperlust): https://aperlust.com/topaz-photo-ai-vs-gigapixel-ai/
- SUPIR VRAM / fp8 discussion: https://github.com/kijai/ComfyUI-SUPIR/issues/12, https://github.com/kijai/ComfyUI-SUPIR/issues/93
- Flux advanced img2img / RF inversion (Civitai): https://civitai.com/models/886496

**Cross-references:** 17a (regressive upscalers), 13 (transparency / alpha), 12 (vectorization), 15 (brand consistency), 09 (app-icon geometry constraints).
