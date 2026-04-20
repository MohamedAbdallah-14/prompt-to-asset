---
category: 17-upscaling-refinement
kind: category-index
title: "Category 17 — Upscaling & Refinement: Synthesis and Routing Guide"
status: draft
last_updated: 2026-04-19
angles:
  - 17a-esrgan-swinir-hat-family
  - 17b-supir-ccsr-diffbir-refinement
  - 17c-face-text-hand-targeted-refinement
  - 17d-logo-icon-sharpness-refinement
  - 17e-deployment-patterns-upscaling
tags:
  - upscaling
  - super-resolution
  - refinement
  - real-esrgan
  - swinir
  - hat
  - dat2
  - supir
  - ccsr
  - diffbir
  - stablesr
  - seesr
  - apisr
  - codeformer
  - gfpgan
  - handrefiner
  - textdiffuser
  - adetailer
  - vectorization
  - potrace
  - vtracer
  - spandrel
  - chainner
  - webgpu
  - webnn
  - onnx
  - coreml
  - tensorrt
  - modal
  - replicate
  - runpod
---

# Category 17 — Upscaling & Refinement

Synthesis of five research angles on post-generation refinement for a prompt-to-asset product that turns natural-language briefs into production assets (logos, app icons, favicons, OG images, illustrations, splash screens). Scope covers classical and SOTA super-resolution, diffusion-based refinement, targeted face/text/hand fixers, logo-specific sharpness and vector round-trips, and deployment patterns across WebGPU, CoreML, and serverless GPU.

## Category Executive Summary

1. **Upscaler choice is asset-type-dependent, not image-dependent.** Running `4x-UltraSharp` on a logo and on a photo produces two different kinds of failure (oversharpened halos vs plastic-skin smoothing). The highest-leverage design decision in this whole category is a routing layer keyed on asset type (logo / icon / illustration / photo / UI / text / pixelart / lineart), not a single "best model" choice (17a §2, 17d routing table).
2. **Diffusion refiners are a different product category from regressive SR.** Regressive models (ESRGAN, SwinIR, HAT, DAT2, DRCT) reconstruct what was probably there; diffusion refiners (SUPIR, CCSR, DiffBIR, StableSR, SeeSR, Magnific, Clarity) *generate* plausible new content guided by a text prompt. For natural photography this is magic; for flat logos, icons, favicons, and rendered text, it is almost always destructive (17b §ExecSum, 17d §Models-to-avoid).
3. **`spandrel` is the single highest-ROI infrastructure decision.** The unified PyTorch loader auto-detects 25+ SR architectures (RRDB, SwinIR, HAT, DAT, ATD, DRCT, OmniSR, SPAN, SCUNet, SAFMN, RGT, …) from a raw `.pth`/`.safetensors`, so a skill can accept OpenModelDB URLs and stay architecture-agnostic (17a §3.2).
4. **DAT2 has quietly become the 2024–2026 generalist default.** `4x-UltraSharpV2` (DAT2 retrain of the classic), `4xNomos2_hq_dat2`, and `4x-IllustrationJaNai_V1_DAT2` beat the old RRDB UltraSharp on logos, illustrations, *and* photos, with fewer halos and less oversharpening (17a §1.5, 17d Tier 1).
5. **SUPIR is state-of-the-art *and* actively hostile to flat art.** On photography it is a research SOTA for in-the-wild restoration; on a flat logo it invents shading, gradient banding, paper texture, and edge noise. SUPIR's own published negative prompt ("oil painting, cartoon, blur, lowres, dirty, messy, low quality") is the exact aesthetic of a brand mark (17b §SUPIR, 17d §Models-to-avoid).
6. **CCSR v2 is the only diffusion SR with something close to regressive-style determinism.** Two-stage split (non-uniform-step diffusion + GAN-finetuned VAE decoder) makes it the realistic local default for batch asset pipelines on a 12 GB GPU; SUPIR is opt-in "slow/high-quality" on A100-class hardware (17b §CCSR, §VRAM).
7. **Ultimate SD Upscale is a refiner, not an upscaler.** It's tile-based img2img that always needs a diffusion model and a prompt. At denoise ≥ 0.3 it hallucinates texture into flat fills; brand-safe usage is denoise ≤ 0.20, and it should not touch logos or icons at all (17a §3.4).
8. **Alpha channels are a silent failure mode.** Every upscaler in this category is RGB-only. The right default is split alpha → upscale RGB with the ML model → bilinear/Lanczos upscale of alpha → merge. This *also* eliminates the "weird checkerboard boxes" failure mode from the motivating user complaint, because the RGB network never sees the background channel (17a §3.6, 17d §Step 1).
9. **For anything genuinely flat, vectorize-then-rasterize beats raster upscaling.** Generate → BiRefNet matte → K-means quantize → potrace/vtracer → re-rasterize at every target size (16/32/48/180/192/512/1024). One SVG, mathematically sharp at any scale, 2–8 KB per logo, independent anti-aliasing at each icon slot (17d §Vectorize-then-rasterize).
10. **Targeted inpaint (adetailer / Impact Pack / HandRefiner) is 5–30× cheaper than regeneration** and preserves the good parts of the image. Rule: repair when only a small region (< ~25% of image) is broken and composition is right; regenerate when global structure is wrong or multiple adjacent regions fail together (17c §Decision-heuristics).
11. **Never let the diffusion model render brand text.** The highest-ROI text fix is prompting for a *text-free* asset and compositing real SVG/Canvas typography on top in the application layer. TextDiffuser-2 / AnyText2 are research curiosities for short non-brand captions; trademarks and wordmarks should never come out of a diffusion sampler (17c §Pipeline D, 17d Hybrid E).
12. **The refinement pipeline order is counter-intuitive: upscale last.** Canonical order is quality-gate → hand-fix → face-fix → CodeFormer/GFPGAN → eyes-only micro-fix → text strategy → global upscale. Upscaling before detailing locks in defects at higher resolution (17c §Order-of-operations).
13. **WebGPU is viable for previews and tiles, not for full production renders.** Swin2SR x4 takes 10–16 s just to *load* in the browser on an M1 Max; WebGPU is roughly half the speed of local CPU on small SR models, and CUDA is 6–14× faster than WebGPU on the same graphs. Ship WebGPU as the preview tier, route production output to a server (17e §WebGPU-reality-check).
14. **Cold start, not hourly rate, decides serverless economics.** Modal + memory snapshots can drop ComfyUI cold starts below 3 s; Runpod FlashBoot hits sub-200 ms on 48% of starts; Replicate's generic cold start is 15–90 s. At ~$0.0025/run on T4, `nightmareai/real-esrgan` on Replicate is cheaper than a Modal warm pool until sustained QPS crosses ~5k generations/day (17e §Deployment-matrix, §Cost-latency).
15. **License matrices bite commercial SaaS.** Real-ESRGAN/SwinIR/HAT are permissive (BSD-3 / Apache-2.0); APISR, chaiNNer, Clarity Upscaler, Upscayl are GPL / AGPL; CodeFormer weights are non-commercial research license; many OpenModelDB fine-tunes are CC-BY-4.0 or CC-BY-NC; adetailer is AGPL-3.0. The model registry must carry a per-model license tag and the pipeline must honor it (17a §5, 17c §Integration-notes).

## Map of the Angles

**[17a — ESRGAN / SwinIR / HAT family](./17a-esrgan-swinir-hat-family.md)** — Regressive SR zoo: Real-ESRGAN, SwinIR, HAT/Real-HAT/HAT-L, APISR, DAT, ATD, DRCT, SPAN, OmniSR, plus pixel-art specialists. Introduces `spandrel` (architecture-agnostic loader used by chaiNNer/ComfyUI/InvokeAI), chaiNNer as orchestrator, OpenModelDB as registry, an asset-type decision table, alpha-channel handling, and a minimal upscaling sub-pipeline.

**[17b — SUPIR / CCSR / DiffBIR / StableSR / SeeSR / SDXL-refiner / Magnific / Clarity / Topaz](./17b-supir-ccsr-diffbir-refinement.md)** — Generative refinement. SUPIR's SDXL-adapter architecture, CCSR's two-stage determinism trick, DiffBIR's unified blind-restoration stack, StableSR's Controllable Feature Wrapping, SeeSR's RAM-tag semantic grounding, the misunderstood SDXL refiner, Flux low-denoise img2img, and the commercial layer (Magnific sliders, Clarity as OSS clone, Topaz as faithful safe harbor). Includes creative-vs-faithful quality matrix and VRAM profile.

**[17c — Face / text / hand targeted refinement](./17c-face-text-hand-targeted-refinement.md)** — Region-level fixers: GFPGAN, CodeFormer (with fidelity weight `w`), RestoreFormer++ for faces; HandRefiner (MANO→depth→ControlNet-depth inpaint) and MeshGraphormer-ControlNet for hands; TextDiffuser/2 and AnyText2 for glyphs. Four concrete pipelines (adetailer in A1111, Impact Pack in ComfyUI, hand-rolled Diffusers, OCR-driven text decision tree) and an eyes-only micro-fix that is the highest-ROI post step for mascot logos.

**[17d — Logo / icon sharpness and snap-to-grid](./17d-logo-icon-sharpness-refinement.md)** — The flat-art path. Logo-safe upscaler tiering (IllustrationJaNai_V1_DAT2, UltraSharpV2, Real-ESRGAN-anime-6B, Nomos2 HQ, SPAN, tier-0 nearest/hqx/xBR), then the superior pipeline: generate → BiRefNet/RMBG-2.0 matte → K-means quantize → potrace/vtracer → re-rasterize per icon slot. Deterministic edge-snapping (Sobel+Otsu+morph close+integer alignment) and five hybrid strategies.

**[17e — Deployment patterns](./17e-deployment-patterns-upscaling.md)** — Substrate matrix across WebGPU / WebNN, desktop ncnn+Vulkan (Upscayl), iOS/macOS CoreML, serverless GPU (Modal/Replicate/Runpod), dedicated VM. Cold-start numbers, per-image costs (Replicate `nightmareai/real-esrgan` $0.0025/run T4 vs $0.029 A100), client-vs-server decision tree, PyTorch→ONNX→{CoreML,TensorRT,ORT-Web,ncnn} export path, five serverless patterns, worked cost example at 10k upscales/day.

## Cross-Cutting Patterns

**Asset-type routing as the central abstraction.** 17a, 17b, and 17d independently arrive at the same conclusion: the skill should detect asset type from the prompt and pick a *branch*, not a model. Branches agreed across angles: logo/icon/favicon → vector-first (17d Hybrid A); flat illustration → DAT2 illustration model or APISR-DAT + vector-silhouette hybrid; photo → Real-HAT-Sharper or `RealESRGAN_x4plus` with optional CCSR/DiffBIR; UI screenshot → Real-HAT + Ultimate SD Upscale at denoise ≤ 0.1; pixel art → nearest-neighbor/xBRZ; text → overlay in application layer.

**Two-pass ≻ one-pass.** Every angle prefers two gentler passes over one aggressive one: Real-HAT 2× then DAT2 2× (17a); classical pre-upscale then Ultimate SD Upscale at low denoise (17b); detect-and-fix regions then global upscale (17c); vectorize then rasterize per-size (17d). An 8× model run is always worse than two 2×/4× passes.

**The matting primitive is a shared dependency.** 17a alpha-split, 17c "generate without text then composite," and 17d matte-before-vectorize all depend on a high-quality alpha matte. BiRefNet and BRIA RMBG-2.0 (category 16) are the cross-cutting backbone for brand-safe transparent deliverables.

**Spandrel + OpenModelDB as a model registry.** 17a and 17d assume a catalog keyed on (arch, scale, tags, license) with automatic architecture detection — the skill standardizes on this pair and adds new community upscalers without changing inference code.

**Low-denoise Flux img2img as a type-safe polish.** 17b and 17c both call out Flux-dev at denoise 0.12–0.20 as the best "clean up my own output" step, especially for rendered type. The SDXL refiner polishes on the base latent and does not enlarge.

**Repair beats regenerate when composition is right.** 17c's cost table (inpaint ≈ 0.4–0.5× a regeneration) matches 17b's seed-stability argument and 17d's "don't let diffusion touch the mark" discipline. Converges on: detect → crop → inpaint → paste, with global refinement last.

## Controversies

**SUPIR as a default vs an opt-in.** 17b positions SUPIR as "current research SOTA for restore + upscale in the wild" while 17a and 17d list it as "avoid for logos" and directly cite the Replicate model card describing SUPIR's output as looking "plastic and overly smooth." Both are correct; the resolution is routing, not model selection. SUPIR is right for legacy photo restoration and product shots, wrong for any flat-art asset.

**Diffusion refinement on illustrated assets.** 17b says SDXL refiner and Flux low-denoise are safe for illustrations; 17d argues that *any* diffusion pass on logos/icons risks edge drift and brand violation. The reconciliation: illustrations (empty-state art, marketing graphics) tolerate denoise ≤ 0.15–0.20; brand marks and app icons should never see a diffusion sampler after first generation.

**WebGPU viability.** 17e's headline "WebGPU is viable for tiles, not whole images" contradicts the optimistic framing common in HF / transformers.js marketing. The measured numbers (10–16 s model load on M1 Max, ~0.5× local CPU throughput, 6–14× slower than CUDA) are the decisive evidence; WebGPU is a *preview* tier, not a server replacement.

**Magnific / Clarity "creative upscale" semantics.** 17b treats creative upscale as a legitimate product mode for photography and marketing hero imagery; 17d treats the same mode as actively harmful for any brand asset. The product answer is a hard-gated `mode ∈ {faithful, balanced, creative}` parameter that the skill refuses to set to `creative` when the detected asset type is logo/icon/favicon.

**HAT-L vs DAT2 vs DRCT-L as the "best" transformer.** 17a's empirical ranking puts DAT2 first on flat-logo preservation and DRCT-L first on PSNR for clean photography; 17d calls DAT2 the generalist default. Community fine-tune maturity, not architecture, is the deciding factor — DAT2 has `4x-UltraSharpV2` and `4xNomos2_hq_dat2`; DRCT-L only recently gained `4xNomos2_hq_drct-l`. Worth re-evaluating in Q3 2026.

**CodeFormer's commercial license.** 17c flags CodeFormer weights as non-commercial; adetailer itself is AGPL-3.0. The pragmatic production path is GFPGAN + RestoreFormer++ (permissive) for face work, with CodeFormer only in self-hosted or licensed deployments. Clarity Upscaler (AGPL-3.0) has the same downstream obligation for any hosted service.

## Gaps

- **Alpha-aware upscalers.** No shipped SR model natively accepts RGBA input; everyone splits. A native RGBA model (anime stickers, transparent logos) is an open research gap — APISR could plausibly be fine-tuned with RGBA heads.
- **Semantic tiling.** Ultimate SD Upscale stitches tiles geometrically (mask-blur + offset). A content-aware approach that detects logo-vs-background and refines only the background would eliminate brand-damaging hallucination. Not yet a shipped product.
- **Root-cause of the "checkerboard boxes" failure.** The motivating user complaint is upstream of upscaling — Gemini / Imagen 4 / Nano Banana output fake checkerboard instead of real RGBA. Upscaling cannot fix this; it can only preserve whatever alpha the generator produced. Cross-link to category 13 (transparent backgrounds).
- **Brand-consistent refinement across asset sets.** 17d Hybrid D gestures at LoRA-guided tiled upscale for brand consistency but notes this is really a category-15 problem. The upscaling layer currently cannot guarantee that ten upscaled assets share a visual style.
- **Deterministic diffusion SR at scale.** CCSR v2 is the only option with reproducible outputs; SUPIR, DiffBIR, StableSR, SeeSR are all stochastic. Production pipelines that need byte-reproducibility for caching / audit / regression testing are constrained to CCSR or regressive models.
- **SDXL refiner as a real enlarge step.** The SDXL refiner polishes but does not enlarge; the community still lacks a first-class "increase resolution *and* stay on-model" pipeline for SDXL/Flux that is not diffusion-tiling (which loses semantics at ≥ 4× ratios).
- **WebNN op coverage for transformer SR.** WebGPU works for Real-ESRGAN family; WebNN is faster when ops are covered, but the op set for Swin/HAT/DAT blocks is patchy across Chrome (Windows ML / OpenVINO post-DirectML-deprecation) and Safari (CoreML). Expect fragmentation through 2026.

## Actionable Recommendations for Our Refinement Stage

### Which upscaler per asset type (default table)

| Asset | Primary upscaler | Fallback | Notes |
|---|---|---|---|
| Logo / wordmark / monogram | **Vectorize** (BiRefNet matte → K-means → vtracer → rasterize per size) | `4x-UltraSharpV2` (DAT2) + snap-to-grid | Never diffusion; never upscale the mark directly when the asset is truly flat. |
| App icon (source → 1024²) | Same as logo; then Apple Icon Composer / Android adaptive icon wrap | `4x-IllustrationJaNai_V1_DAT2` raster at 1024² + downsample | Downsample with Lanczos/AREA per size, not bicubic. |
| Favicon (16/32/48/180/192/512) | SVG rasterize per size | Vector → rasterize each size independently | Never upscale *to* 16². Rasterize from the SVG so each size gets its own anti-aliasing. |
| Flat illustration / sticker | `4x-IllustrationJaNai_V1_DAT2` or `APISR-DAT 4×` | `4x-UltraSharpV2` | Optional vector silhouette + raster interior hybrid (17d Hybrid B). |
| UI illustration (empty state) | `APISR-DAT 4×` | `4x-AnimeSharp` | Flux img2img denoise ≤ 0.15 is safe for style polish. |
| UI screenshot / dashboard | `Real-HAT-sharper` + Ultimate SD Upscale denoise ≤ 0.10 | `4x-UltraSharpV2` | Avoid legacy UltraSharp v1 (oversharpens text). |
| OG / hero photograph | `Real_HAT_GAN_SRx4_sharper` then CCSR v2 or Flux img2img denoise 0.15 | `4xNomos2_hq_drct-l`; SUPIR for legacy restoration only | Creative upscale (Magnific/Clarity) allowed for hero photography, gated off for brand assets. |
| OG / hero illustrated | SDXL refiner or Flux denoise ≤ 0.20 | `4xNomos2_hq_dat2` | Avoid Magnific creative. |
| Text crop (short caption, non-brand) | `4xNomos2_hq_atd` | SwinIR-realSR-L | Any diffusion upscaler with denoise > 0.15 garbles glyphs. |
| Brand text / wordmark | **SVG/Canvas overlay in application layer** | — | Never rendered by a diffusion model. |
| Pixel art / retro | `xBRZ` or `4x-PixelPerfect` | `Lady0101_OmniSR-pixelart` | Any RRDB/Swin/HAT blurs. |
| Line art / sketch | `4xHFA2kShallowESRGAN` | `APISR-RRDB 2×` | `Real-ESRGAN-x4plus` is too photographic. |

### SUPIR vs Real-ESRGAN decision rule

Use **Real-ESRGAN family (RRDB)** or **DAT2 fine-tunes** by default for every asset in this product. They are fast, deterministic, license-clean (BSD-3 / CC-BY-4.0), and preserve geometry. Use **SUPIR** only when all three are true: (a) the asset is a *photograph* or photo-realistic product render, (b) the input is degraded enough that regressive SR under-fills detail, and (c) deployment has access to an A100-class card (24 GB+). Even then, expose SUPIR's negative-quality prompt, set restoration-guidance scale toward fidelity, and never apply to logos, icons, favicons, or text. For the 95% case (asset generation from a clean diffusion output), **CCSR v2** is the right diffusion SR (deterministic, 8–12 GB VRAM, good batch throughput).

### Face / text / hand fixers

- Default face pass: **adetailer** with `face_yolov8n` → SDXL inpaint at denoise 0.3–0.5 → optional **RestoreFormer++** (Apache-2.0) for final skin. Avoid CodeFormer in commercial deployments unless self-licensed; do not stack GFPGAN on flat-illustration mascots (it photorealizes the style).
- Eyes-only micro-fix: adetailer `mediapipe_face_mesh_eyes_only` with prompt "clean symmetrical eyes, matching pupils, sharp iris detail" at denoise 0.5–0.7. Highest-ROI step for mascot logos.
- Hands: **HandRefiner** (MANO → depth → ControlNet-depth inpaint) when any hand is visible in a photo-realistic or illustrated asset. `hand_yolov8n` + SDXL inpaint is the fallback when MANO fit fails.
- Text: **do not render brand text in the diffusion model.** Prompt for text-free assets and composite via SVG/Skia/Canvas in the application layer using the brand font. TextDiffuser-2 / AnyText2 are acceptable for short non-brand captions; HTML/CSS rendering is the right answer for body copy and OG image headlines.
- Run in this order: quality-gate → hand → face → eyes → text strategy → global upscale. Upscale last.

### WebGPU client-side for small assets

Ship a **WebGPU preview tier** for 512²→1024² refinement using `transformers.js v3` + Swin2SR x2 (int8-quantized, ~15 MB) or an ONNX-exported Real-ESRGAN anime-6B via `onnxruntime-web` with the WebGPU EP. Hard rules:

- Feature-detect `navigator.gpu` before downloading weights. Fall back to WASM, then to server.
- Tile to 512² inputs; do not ship raw ≥ 2048² tensors to WebGPU (buffer-size limits on most devices).
- Do not attempt 4× upscales to ≥ 4096² in the browser; model load alone can exceed a server round-trip.
- Use the hybrid Pattern D from 17e: client runs Swin2SR x2 immediately for preview; server (Modal warm pool on A10G, `min_containers=1`, memory snapshots) runs the production 4× and swaps the canvas when HD returns.
- Route production output to `nightmareai/real-esrgan` on Replicate ($0.0025/run on T4) for the first ~5k generations/day; promote to Modal warm pool when sustained traffic justifies the ~$26/day warm-idle cost; pick Runpod serverless + FlashBoot + webhook if async UX is acceptable.
- Ship WebNN only when the op set is covered and you can gate on Chrome 122+ / Safari 18+ macOS. On iOS, CoreML WebNN is disabled by default — route iOS Safari to server.

For pro / local-first users, a **Pinokio** installer or a link to **Upscayl** (ncnn+Vulkan, 200 MB cross-platform, AGPL-3.0) gives 2–5 s wall-clock 4× upscales on consumer GPUs with zero per-generation cost.

## Primary Sources Aggregated

### Regressive SR papers

- Wang, X. et al. *Real-ESRGAN*. ICCV-W 2021. [arXiv:2107.10833](https://arxiv.org/abs/2107.10833).
- Liang, J. et al. *SwinIR*. ICCV-W 2021. [arXiv:2108.10257](https://arxiv.org/abs/2108.10257).
- Chen, X. et al. *HAT — Activating More Pixels in Image Super-Resolution Transformer*. CVPR 2023. [arXiv:2205.04437](https://arxiv.org/abs/2205.04437).
- Wang, B. et al. *APISR*. CVPR 2024. [arXiv:2403.01598](https://arxiv.org/abs/2403.01598).
- Hsu, C.-Y. et al. *DRCT*. CVPR-W NTIRE 2024. [arXiv:2404.00722](https://arxiv.org/abs/2404.00722).

### Diffusion SR / refinement papers

- Yu, F. et al. *SUPIR — Scaling Up to Excellence*. CVPR 2024. [arXiv:2401.13627](https://arxiv.org/abs/2401.13627).
- Sun, L. et al. *CCSR — Improving the Stability of Diffusion Models for Content Consistent SR*. [arXiv:2401.00877](https://arxiv.org/abs/2401.00877).
- Lin, X. et al. *DiffBIR*. [arXiv:2308.15070](https://arxiv.org/abs/2308.15070).
- Wang, J. et al. *StableSR*. IJCV 2024. [arXiv:2305.07015](https://arxiv.org/abs/2305.07015).
- Wu, R. et al. *SeeSR — Semantics-Aware Real-World Image Super-Resolution*. CVPR 2024. [arXiv:2311.16518](https://arxiv.org/abs/2311.16518).
- Podell, D. et al. *SDXL*. [arXiv:2307.01952](https://arxiv.org/abs/2307.01952).

### Targeted refinement papers

- Wang, X. et al. *GFPGAN — Real-World Blind Face Restoration with Generative Facial Prior*. CVPR 2021. [arXiv:2101.04061](https://arxiv.org/abs/2101.04061).
- Zhou, S. et al. *CodeFormer*. NeurIPS 2022. [arXiv:2206.11253](https://arxiv.org/abs/2206.11253).
- Wang, Z. et al. *RestoreFormer++*. TPAMI 2023. [arXiv:2308.07228](https://arxiv.org/abs/2308.07228).
- Lu, W. et al. *HandRefiner*. [arXiv:2311.17957](https://arxiv.org/abs/2311.17957).
- Lin, K. et al. *MeshGraphormer*. ICCV 2021. [arXiv:2104.00272](https://arxiv.org/abs/2104.00272).
- Chen, J. et al. *TextDiffuser*. NeurIPS 2023. [arXiv:2305.10855](https://arxiv.org/abs/2305.10855).
- Chen, J. et al. *TextDiffuser-2*. [arXiv:2311.16465](https://arxiv.org/abs/2311.16465).
- Tuo, Y. et al. *AnyText*. [arXiv:2311.03054](https://arxiv.org/abs/2311.03054).

### Reference implementations & tooling

- [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) (BSD-3) · [JingyunLiang/SwinIR](https://github.com/JingyunLiang/SwinIR) (Apache-2.0) · [XPixelGroup/HAT](https://github.com/XPixelGroup/HAT) · [Kiteretsu77/APISR](https://github.com/Kiteretsu77/APISR) (GPL-3.0).
- [Fanghua-Yu/SUPIR](https://github.com/Fanghua-Yu/SUPIR) · [kijai/ComfyUI-SUPIR](https://github.com/kijai/ComfyUI-SUPIR) · [csslc/CCSR](https://github.com/csslc/CCSR) · [XPixelGroup/DiffBIR](https://github.com/XPixelGroup/DiffBIR) · [IceClear/StableSR](https://github.com/IceClear/StableSR) · [cswry/SeeSR](https://github.com/cswry/SeeSR).
- [TencentARC/GFPGAN](https://github.com/TencentARC/GFPGAN) · [sczhou/CodeFormer](https://github.com/sczhou/CodeFormer) · [Bing-su/adetailer](https://github.com/Bing-su/adetailer) (AGPL-3.0) · [ltdrdata/ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) · [wenquanlu/HandRefiner](https://github.com/wenquanlu/HandRefiner) · [microsoft/MeshGraphormer](https://github.com/microsoft/MeshGraphormer) · [microsoft/unilm/textdiffuser](https://github.com/microsoft/unilm/tree/master/textdiffuser).
- [chaiNNer-org/chaiNNer](https://github.com/chaiNNer-org/chaiNNer) · [chaiNNer-org/spandrel](https://github.com/chaiNNer-org/spandrel) (MIT) · [Coyote-A/ultimate-upscale-for-automatic1111](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111) · [ssitu/ComfyUI_UltimateSDUpscale](https://github.com/ssitu/ComfyUI_UltimateSDUpscale) · [philz1337x/clarity-upscaler](https://github.com/philz1337x/clarity-upscaler) (AGPL-3.0).
- [visioncortex/vtracer](https://github.com/visioncortex/vtracer) · [potrace](http://potrace.sourceforge.net/) · [briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0).
- [upscayl/upscayl](https://github.com/upscayl/upscayl) · [upscayl/upscayl-ncnn](https://github.com/upscayl/upscayl-ncnn) · [ultralytics/ultralytics](https://github.com/ultralytics/ultralytics) · [Google MediaPipe](https://github.com/google/mediapipe) · [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR).

### Model & deployment catalogs / product docs

- [OpenModelDB](https://openmodeldb.info/) — canonical upscaler metadata index.
- Replicate — [`nightmareai/real-esrgan`](https://replicate.com/nightmareai/real-esrgan/api), [`replicategithubwc/real-esrgan`](https://replicate.com/replicategithubwc/real-esrgan/api), [`philipp1337x/clarity-upscaler`](https://replicate.com/philipp1337x/clarity-upscaler), [`astramlco/supir`](https://replicate.com/astramlco/supir/readme).
- Modal — [Scaling ComfyUI](https://modal.com/blog/scaling-comfyui) · Tolga Oğuz, [ComfyUI cold starts under 3 s on Modal](https://tolgaoguz.dev/post/comfy-workflow-api-with-modal).
- Runpod / Introl — [Serverless GPU Platforms 2025](https://introl.com/blog/serverless-gpu-platforms-runpod-modal-beam-comparison-guide-2025).
- Microsoft — [ONNX Runtime Web + WebGPU](https://opensource.microsoft.com/blog/2024/02/29/onnx-runtime-web-unleashes-generative-ai-in-the-browser-using-webgpu/) · [WebNN Tech Community](https://techcommunity.microsoft.com/blog/aiplatformblog/webnn-bringing-ai-inference-to-the-browser/4175003) · [WebNN.io browser compatibility](https://webnn.io/en/api-reference/browser-compatibility/api).
- Magnific — [product](https://magnific.ai) · [API](https://magnific.ai/api) · [Scenario docs](https://docs.scenario.com/docs/image-upscale-models-magnific) · Topaz — [Gigapixel AI](https://www.topazlabs.com/gigapixel-ai) · [Photo AI](https://www.topazlabs.com/topaz-photo-ai).
- Apple — [Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer) · Bjango — [Illustrator snapping](https://bjango.com/articles/illustratorsnapping) · Icons8 — [pixel-perfect icons](https://blog.icons8.com/articles/make-pixel-perfect-icons).

### Cross-references to other categories

- **13 — transparent-backgrounds** — upstream root cause of "checkerboard" artifact; upscaling cannot fix what the generator outputs.
- **16 — background-removal-vectorization** — BiRefNet / RMBG-2.0 matting and potrace/vtracer used inside 17d's vectorize-then-rasterize pipeline.
- **12 — vector-svg-generation** — Recraft V4 SVG, Ideogram V3 text rendering; the generation half of the logo path that ends in this category.
- **15 — style-consistency-brand** — LoRA / IP-Adapter techniques that make upscaling on asset *sets* brand-consistent.
- **09 — app-icon-generation** — HIG/Material geometry constraints consumed by the rasterize-per-size step.
