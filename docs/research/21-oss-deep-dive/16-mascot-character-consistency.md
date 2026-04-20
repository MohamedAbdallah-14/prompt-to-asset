---
wave: 1
role: niche-discovery
slug: 16-mascot-character-consistency
title: "OSS mascot / character / logo-mark consistency"
date: 2026-04-19
sources:
  - https://github.com/tencent-ailab/IP-Adapter
  - https://github.com/tencent-ailab/IP-Adapter/blob/main/LICENSE
  - https://github.com/h94/IP-Adapter-FaceID
  - https://huggingface.co/h94/IP-Adapter-FaceID
  - https://github.com/InstantID/InstantID
  - https://arxiv.org/abs/2401.07519
  - https://github.com/TencentARC/PhotoMaker
  - https://github.com/TencentARC/PhotoMaker/blob/main/LICENSE
  - https://arxiv.org/abs/2312.04461
  - https://github.com/ToTheBeginning/PuLID
  - https://arxiv.org/abs/2404.16022
  - https://github.com/ostris/ai-toolkit
  - https://github.com/kohya-ss/sd-scripts
  - https://github.com/kohya-ss/sd-scripts/blob/sd3/docs/flux_train_network.md
  - https://github.com/bmaltais/kohya_ss
  - https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev
  - https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev/blob/main/LICENSE.md
  - https://replicate.com/black-forest-labs/flux-redux-dev
  - https://docs.bfl.ai/kontext/kontext_overview
  - https://styledrop.github.io/
  - https://arxiv.org/abs/2306.00983
  - https://github.com/zideliu/StyleDrop-PyTorch
  - https://github.com/google/style-aligned
  - https://arxiv.org/abs/2312.02133
  - https://github.com/HVision-NKU/StoryDiffusion
  - https://arxiv.org/abs/2405.01434
  - https://github.com/PKU-YuanGroup/ConsisID
  - https://arxiv.org/abs/2411.17440
  - https://www.recraft.ai/docs/api-reference/styles
  - https://recraft.ai/docs/using-recraft/styles/custom-styles/how-to-create-a-custom-style
  - https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai
  - https://docs.together.ai/docs/quickstart-flux-2
  - https://github.com/cubiq/ComfyUI_IPAdapter_plus
tags: [ip-adapter, dreambooth, instantid, photomaker, consistency, mascot]
---

# OSS mascot / character / logo-mark consistency techniques

## Why this niche matters for us

The user-facing job is "give us a consistent mascot across icon + favicon + OG + hero" — the same mark, pose-shifted and scale-shifted, across 5–15 output slots without model drift. Category 15 (`15-style-consistency-brand/INDEX.md`) and Category 20 (`20-open-source-repos-landscape/INDEX.md`) already classify this as a *subject consistency* problem (as opposed to *style* consistency) and nominate DreamBooth-LoRA, the IP-Adapter family, PhotoMaker, InstantID, and PuLID as the canonical stack. This dive pins repo/license/base-model/ref-image-count/quality/speed so we can actually choose.

## Training-free identity adapters (run at inference)

The "training-free" family injects one or more reference images into cross-attention at generation time. No per-brand training run, no LoRA file to manage. It is the right primitive when the mascot already exists as a single canonical PNG and we need to fan it out to many slots.

### IP-Adapter (tencent-ailab/IP-Adapter)
- **Repo:** <https://github.com/tencent-ailab/IP-Adapter>  • **License:** Apache-2.0.
- **Base models:** SD 1.5, SDXL; also has a SDXL-plus checkpoint and a FaceID variant. ComfyUI integration via `cubiq/ComfyUI_IPAdapter_plus`.
- **Reference images:** 1 works; 2–4 averaged gives a noticeably more stable identity.
- **Consistency quality:** mid/high for object/style (`weight=0.6–0.8`, `weight_type="style transfer precise"` is the community consensus per `ComfyUI_IPAdapter_plus` docs); low-to-mid for faces with the base model — for faces use the FaceID variant.
- **Speed:** adapter add-on, ~0ms extra latency beyond base SD/SDXL inference (≈2–6 s per image on an A100).

### IP-Adapter-FaceID (h94/IP-Adapter-FaceID)
- **Repo / weights:** <https://github.com/h94/IP-Adapter-FaceID>, weights on <https://huggingface.co/h94/IP-Adapter-FaceID>.
- **License:** Apache-2.0 for the IP-Adapter code; weights carry a non-commercial research tag on HF (check per-file before shipping).
- **Base models:** SD 1.5, SDXL; variants `FaceID`, `FaceID-Plus`, `FaceID-Plus-v2`, `FaceID-Portrait`.
- **Reference images:** 1 face photo minimum; Portrait/Plus variants benefit from 3–5 angles.
- **Consistency quality:** was SOTA for faces in late 2023; superseded by InstantID → PuLID. Still fine for mascots that *have* a face.
- **Speed:** same as IP-Adapter; adds one InsightFace embedding pass (<100 ms).

### InstantID
- **Repo:** <https://github.com/InstantID/InstantID>  • **Paper:** arXiv:2401.07519.
- **License:** Apache-2.0 on the code; pretrained weights on HuggingFace tagged for research/non-commercial (ControlNet weights are redistributed under their original licenses — verify per asset).
- **Base model:** SDXL (requires an `InstantID` IP-Adapter + a face-landmark ControlNet).
- **Reference images:** 1 — core selling point is single-shot, zero-finetune.
- **Consistency quality:** high on faces; preserves identity while changing pose/lighting far better than vanilla IP-Adapter-FaceID.
- **Speed:** single-pass SDXL (≈4–8 s on an A100); add ~200 ms for landmark + InsightFace.

### PhotoMaker (TencentARC/PhotoMaker)
- **Repo:** <https://github.com/TencentARC/PhotoMaker>  • **Paper:** arXiv:2312.04461.
- **License:** Apache-2.0 (code + v1 weights). v2 weights: check HF card.
- **Base model:** SDXL. PhotoMaker-v2 adds better ID fidelity + faster inference.
- **Reference images:** 1–4 (stacked into a single "ID embedding"); more refs ↑ identity fidelity at ~0 extra cost.
- **Consistency quality:** strong on humans; designed around photo realism. Less flexible than InstantID/PuLID for stylized mascots.
- **Speed:** single SDXL pass, ~5 s on A100.

### PuLID (ToTheBeginning/PuLID)
- **Repo:** <https://github.com/ToTheBeginning/PuLID>  • **Paper:** arXiv:2404.16022 (NeurIPS 2024).
- **License:** Apache-2.0 on the code.
- **Base models:** SDXL originally; a Flux.1-dev port (`PuLID-FLUX`) is the most-used 2025 variant. Flux port inherits Flux's non-commercial weight license.
- **Reference images:** 1 (accepts more and averages).
- **Consistency quality:** 2024 SOTA for tuning-free identity — contrastive alignment preserves prompt-following unlike earlier adapters. Best-in-class editability vs. fidelity trade-off.
- **Speed:** single SDXL/Flux pass; Flux port is ~8–15 s on a 24 GB GPU.

## Reference-image conditioning on Flux

### Flux.1-Redux-dev
- **Repo / weights:** <https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev>.
- **License:** FLUX.1 [dev] **Non-Commercial License v1.1.1** — personal/research use only when self-hosted; commercial use only via hosted endpoints (Replicate, fal, Together) that carry separate licensing.
- **Base model:** Flux.1 [dev].
- **Reference images:** 1 image → variations (+ optional text prompt). It is a *variation* adapter, not an identity adapter — great for "more like this" restyles of an approved mark.
- **Consistency quality:** excellent for compositional/stylistic variations; not trained to preserve identity landmarks the way PuLID does.
- **Speed:** ~5–10 s hosted, ~15 s local on a 24 GB GPU.

### Flux.1 Kontext (dev / pro / max)
- **Docs:** <https://docs.bfl.ai/kontext/kontext_overview>.
- **License:** Kontext [dev] weights = non-commercial; [pro] and [max] are hosted-API only, per-image pricing (~$0.04–0.08 / image in the BFL docs).
- **Reference images:** 1 primary reference, plus a second for compositional lock in some workflows; supports in-place edit and style transfer.
- **Consistency quality:** BFL's reference for "single mark across many edits" — locally-editable, text-editable-in-image, high subject stability.
- **Speed:** [pro] ≈ 5–6 s / image; [max] is slower but sharper typography.

### Together FLUX.2 multi-reference
- **Docs:** <https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai>, <https://docs.together.ai/docs/quickstart-flux-2>.
- **API:** hosted, pay-per-image (FLUX.2 is closed-weight; OSS only via the SDK client).
- **Reference images:** **up to 8 via API** (9 MP input cap); Playground allows 10. Advertises hex-code color matching and character/product consistency.
- **Consistency quality:** strongest brand-asset reference surface of any hosted API in 2026; reads as "brand bundle in an API call".
- **Speed:** <10 s per image to 4 MP output.

## Per-brand LoRA training (tune once, reuse forever)

DreamBooth-LoRA on a rare trigger token remains the default when we have 10+ canonical mascot renders and want the cheapest per-call inference. Rank-16, prior-preservation, captions that describe *everything except* the subject, ~1500 steps. Ships as ~40 MB.

### ostris/ai-toolkit
- **Repo:** <https://github.com/ostris/ai-toolkit>  • **License:** MIT.
- **Trains on:** Flux.1-dev, SDXL, SD 3.5, HunyuanDit, etc.
- **Reference images:** 8–30 for a mascot; 15 is the sweet spot.
- **Consistency quality:** SOTA for open-weight mascot LoRA in 2025; the tool the Flux community standardized around.
- **Speed:** training ≈ 30–90 min on an A100 for Flux at 512–1024 px; inference adds ~0 s when LoRA is merged, ~5–10% slower when dynamically loaded.

### kohya-ss / sd-scripts (+ bmaltais/kohya_ss GUI)
- **Repos:** <https://github.com/kohya-ss/sd-scripts>, <https://github.com/bmaltais/kohya_ss>  • **License:** Apache-2.0.
- **Trains on:** SD 1.5 / SDXL / SD 3 / Flux (`flux_train_network.py`).
- **Reference images:** same as ai-toolkit (10–30); supports class+identifier and captioning.
- **Consistency quality:** battle-tested; widest community.
- **Speed:** Flux LoRA now trainable on 4 GB GPUs via FP8 + block-swap, at the cost of hours. A100: 45–120 min.

## Google-family style/character methods (research, mostly SDXL-era)

### StyleDrop
- **Project:** <https://styledrop.github.io/>  • **Paper:** arXiv:2306.00983.
- **License:** unofficial PyTorch at <https://github.com/zideliu/StyleDrop-PyTorch> (MIT/Apache-ish — check); official impl is Google-internal on **MUSE** (not released).
- **Reference images:** **1** — the flagship claim.
- **Consistency quality:** strong style lock; originally demonstrated on MUSE tokens, not diffusion. Community impls are research-grade, not production.
- **Speed:** MUSE was fast by design; PyTorch re-impls on SDXL run at SDXL speeds.

### StyleAligned (google/style-aligned)
- **Repo:** <https://github.com/google/style-aligned>  • **Paper:** arXiv:2312.02133 (CVPR 2024).
- **License:** Apache-2.0.
- **Base model:** SDXL.
- **Reference images:** 1 anchor; works by sharing attention across a *batch* of generations so they all inherit the anchor's style — genuinely training-free.
- **Consistency quality:** excellent for style, not for subject identity. Brilliant for "generate 10 illustrations that read as one set" but not "same mascot in 10 poses".
- **Speed:** ≈1.2–1.5× SDXL per image due to shared-attention batch.

### Story-Diffusion (HVision-NKU)
- **Repo:** <https://github.com/HVision-NKU/StoryDiffusion> (NeurIPS 2024 Spotlight, 6.4k★)  • **License:** Apache-2.0.
- **Base models:** SD 1.5 / SDXL.
- **Reference images:** 0 reference; seeded by 3+ text prompts (5–6 recommended) that share a subject description. "Consistent Self-Attention" is hot-pluggable.
- **Consistency quality:** strong mascot consistency across comic panels without any training or reference image — but requires well-crafted subject descriptors.
- **Speed:** single SDXL pass per frame; batching is the practical cost center.

### ConsisID (PKU-YuanGroup)
- **Repo:** <https://github.com/PKU-YuanGroup/ConsisID> (CVPR 2025 Highlight)  • **License:** Apache-2.0.
- **Base model:** DiT-based text-to-*video* (CogVideoX family).
- **Reference images:** 1 face image; frequency-decomposed for global proportions + local detail.
- **Consistency quality:** SOTA for identity-preserving T2V; for still-image mascot use this is overkill, but useful if we ever ship animated brand GIFs.
- **Speed:** video model — tens of seconds on an H100.

## Recraft custom style (hosted closed-weight, but the semantics matter)

- **Docs:** <https://www.recraft.ai/docs/api-reference/styles>, <https://recraft.ai/docs/using-recraft/styles/custom-styles/how-to-create-a-custom-style>.
- **API:** `POST https://external.api.recraft.ai/v1/styles` with up to **5** reference images + a style-level prompt + a style model (`Style essentials` or `Style and composition`) → returns a `style_id` UUID. That UUID is then passed to generation.
- **Reference images:** 1–5 at create time; reused implicitly on every subsequent generation.
- **Consistency quality:** the only mainstream hosted API where a "brand token" is a first-class persistent object. 15b and 15e of our research corpus flag it as the strongest hosted option for palette+style adherence.
- **Speed:** one-time style create (~seconds); per-image generation ~3–8 s.

## Cross-cutting notes

- **One mark, many scales ≠ one face, many poses.** Mascot/logo-mark consistency is a *2-axis* problem: (a) the mark itself must be identical (vector or raster-identical for favicon/appicon) and (b) hero art must carry the mark's geometry + palette + personality. Axis (a) is solved by determinism — render SVG once, resize. Axis (b) is what IP-Adapter/PuLID/Flux-Kontext/LoRA solve.
- **Non-commercial weight licenses are the silent trap.** Flux.1-dev, Flux.1 Redux-dev, Flux.1 Kontext-dev, IP-Adapter-FaceID v2 weights, RMBG-2.0 are all flagged non-commercial. Safe commercial paths: SDXL + IP-Adapter (Apache-2.0), PhotoMaker (Apache-2.0), StoryDiffusion (Apache-2.0), PuLID code (Apache-2.0) on Apache-2.0 base weights, hosted Flux endpoints (Replicate/fal/Together carry their own commercial licenses).
- **Reference-image floor.** Everything above works from **1 reference**; 3–5 references is the "no-regret" budget (matches Recraft's cap, PhotoMaker's sweet spot, and InstantID-multi's pattern). A per-brand LoRA becomes worth the training time only past ~200 assets/month per brand.

## Integration recommendations

For the "give us a consistent mascot across icon + favicon + OG + hero" use case we should ship a **3-tier router** behind a single `ensure_mascot_consistency(brand_id, slot, prompt)` tool:

1. **Default / paid tier — Together FLUX.2 multi-reference (hosted, up to 8 refs).**
   The fastest path to a production-quality, commercially-clean output: upload 2–8 canonical mascot renders once per brand bundle, pass the slot-specific prompt with a `brand.palette` hex list, get a <10 s 4 MP image back. Licensing is clean via Together's T&Cs, hex-code color matching is native, and 8 refs is the industry-leading ceiling today (Section: "Together FLUX.2 multi-reference"). This is the *default path* for app-icon source masters, OG cards, and hero art.

2. **Open-weight self-hosted tier — PuLID (Apache-2.0 code) on SDXL + IP-Adapter-Plus (Apache-2.0).**
   When a customer needs air-gapped generation or refuses hosted endpoints, we run SDXL with PuLID for identity lock and IP-Adapter-Plus for style lock. Commercially clean (Apache-2.0 + SDXL's OpenRAIL-M), 1–4 references, ~5–8 s per image on our GPU workers. This path doubles as the foundation for per-brand LoRAs (ostris/ai-toolkit) when a brand crosses the ~200-asset/month mark.

3. **Determinism tier — composition, not generation.**
   Favicons, iOS `AppIcon.appiconset` sizes, and Android adaptive icons must be *bit-identical* to the approved master mark, not regenerated. Once tier 1 or 2 produces an approved 1024×1024 mark, we vectorize (`vtracer`) and hand off to `npm-icon-gen` + `pwa-asset-generator` + `capacitor-assets` (already in our 20e dependency list) for all platform-spec sizes. No model is invoked for these slots — consistency is guaranteed by construction, and this is what commercial brand studios (Brandmark, Looka) actually do under the hood.

The critical decision: **never chain generations** (gen-N → gen-N+1 as reference) per the Gemini/PuLID guidance in Category 15. Every slot generates from the pinned canonical reference + the brand bundle; drift never accumulates. Recraft's `style_id` is worth shipping as a **fourth optional tier** for customers already inside the Recraft ecosystem — its persistent-brand-token semantics are the cleanest of any hosted API and map 1:1 to our `brand_token_id`.
