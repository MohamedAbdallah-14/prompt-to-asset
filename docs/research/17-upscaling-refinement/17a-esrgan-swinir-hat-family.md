---
category: 17-upscaling-refinement
angle: 17a
title: "Classic & SOTA Upscalers — ESRGAN / SwinIR / HAT family, APISR, chaiNNer, Ultimate-SD-Upscale"
status: draft
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/2107.10833            # Real-ESRGAN
  - https://arxiv.org/abs/2108.10257            # SwinIR
  - https://arxiv.org/abs/2205.04437            # HAT
  - https://arxiv.org/abs/2403.01598            # APISR
  - https://arxiv.org/abs/2404.00722            # DRCT
  - https://github.com/xinntao/Real-ESRGAN
  - https://github.com/JingyunLiang/SwinIR
  - https://github.com/XPixelGroup/HAT
  - https://github.com/Kiteretsu77/APISR
  - https://github.com/chaiNNer-org/chaiNNer
  - https://github.com/chaiNNer-org/spandrel
  - https://github.com/Coyote-A/ultimate-upscale-for-automatic1111
  - https://openmodeldb.info/
tags:
  - upscaling
  - super-resolution
  - esrgan
  - swinir
  - hat
  - apisr
  - chainner
  - spandrel
  - ultimate-sd-upscale
  - asset-generation
---

# Classic & SOTA Upscalers for Asset Pipelines
## Real-ESRGAN, SwinIR, HAT / Real-HAT, APISR, DRCT, DAT2, and how to orchestrate them for logos, icons, illustrations, and UI art

## Executive Summary

Modern asset generation pipelines rarely end at the diffusion sampler. Diffusion models (SD1.5, SDXL, Flux, Imagen, Nano Banana) consistently output at resolutions (512²–2048²) below what a production icon set, favicon, OG image, or vector-traced logo actually needs. Classical and modern upscalers close that gap — and the *choice* of upscaler is one of the highest-leverage decisions in the whole pipeline. Using "4x-UltraSharp" on a clean vector-style logo and using it on a photographic hero image produce two very different kinds of failure (over-sharpened halos vs. plastic-skin smoothing). For a system that turns *"a transparent logo for my note-taking app"* into a correct asset, the upscaler must be chosen per *asset class*, not per *image*.

This document catalogs the upscaler landscape that a skill/agent should understand and route through:

1. **ESRGAN family (CNN / RRDB)** — Real-ESRGAN (`x4plus`, `x4plus_anime_6B`, `animevideov3`), and community fine-tunes (4x-UltraSharp, 4x-UltraSharpV2, Remacri, NMKD-Siax, 4x-AnimeSharp). Fast, mature, well-supported everywhere; tends to oversmooth when pushed.
2. **Transformer-based SOTA** — SwinIR (ICCVW 2021), HAT / Real-HAT / HAT-L (CVPR 2023), DAT (Dense Attention Transformer), ATD, DRCT (CVPR-W 2024), and the emerging Nomos2 model line by Philip Hofmann (Helaman) — now the default high-quality tier.
3. **Anime / illustration-specialist models** — APISR (CVPR 2024, API dataset), RealESRGAN-anime-6B, 4xAnimeSharp, 2xHFA2kCompact — crucial for flat-shaded illustrations, UI stickers, and logo marks.
4. **Latent-diffusion-based refiners** — LDSR (legacy A1111), Ultimate SD Upscale (Coyote-A, tile-based img2img), SD/SDXL tiled refiner, SUPIR-style SDXL restoration (covered in 17b). These *hallucinate* detail — powerful for photos, dangerous for logos.
5. **Orchestrators** — chaiNNer (Electron/React node graph, now macOS/Win/Linux, v0.24+ with conditional branching), ComfyUI upscaler nodes, automatic1111 extras tab, spandrel (PyTorch unified loader used by both chaiNNer and ComfyUI).

### Top takeaways for a prompt-enhancement / asset-generation skill

- **The upscaler choice is asset-type-dependent.** Route logos/flat-art through edge-preserving models (DAT2, 4x-NMKD-Siax, 4xNomos2_hq_dat2, UltraSharpV2, AnimeSharp); route photographic hero imagery through Real-ESRGAN-x4plus or HAT-L; route pixel-art through dedicated pixel models (4xPixelPerfect, Lady0101_OmniSR) and **never** bilinear/bicubic/ESRGAN for it.
- **Don't use diffusion-based upscalers (Ultimate SD Upscale, SUPIR, LDSR) on logos or pure-flat illustrations at high denoise**. They *will* hallucinate texture into flat areas and break brand consistency. Use them on photos, UI screenshots, or cinematic hero art with `denoise` ≤ 0.2.
- **Use spandrel for implementation.** The library auto-detects >25 SR architectures from a `.pth` / `.safetensors` file, so the agent can accept an OpenModelDB URL and not care whether the underlying network is RRDB, SwinIR, HAT, DAT, ATD, DRCT, OmniSR, SPAN, or SCUNet. This is the single highest-ROI infra decision.

---

## 1. Upscaler Zoo Catalog

### 1.1 ESRGAN / Real-ESRGAN family (RRDB CNN)

**Real-ESRGAN** (Wang et al., ICCV-W 2021, [arXiv:2107.10833](https://arxiv.org/abs/2107.10833)) introduced a synthesized second-order degradation pipeline (blur → noise → JPEG → resize, stacked twice) and a U-Net discriminator with spectral normalization, producing the first CNN upscaler that generalized well to in-the-wild low-quality photographs. The backbone is RRDB (Residual-in-Residual Dense Block) from ESRGAN (Wang 2018), kept identical so the entire ESRGAN model zoo is weight-compatible.

Key official models from [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN):

| Model | Scale | Params | Use case | Notes |
|---|---|---|---|---|
| `RealESRGAN_x4plus` | 4× | 16.7 M (23 RRDB) | Photos, general | Default baseline. Smooths skin aggressively. |
| `RealESRGAN_x2plus` | 2× | 16.7 M | Gentler 2× pass | Better for second-stage refinement. |
| `RealESRGAN_x4plus_anime_6B` | 4× | 4.4 M (6 RRDB) | Anime / flat illustration | ~17 MB; sharp clean lines. |
| `realesr-animevideov3` | 2/3/4× | 1.4 M | Anime video frames | Very fast; used by `realesrgan-ncnn-vulkan`. |
| `realesr-general-x4v3` | 4× | 4.7 M | General-purpose small | Good default for CPU / NCNN Vulkan. |

**Community fine-tunes on the RRDB backbone** (all listed on [openmodeldb.info](https://openmodeldb.info)):

- **4x-UltraSharp** (Kim2091) — trained heavily on JPEG-degraded stock photography. De-facto A1111 default for years. Tends to over-sharpen edges.
- **4x-UltraSharpV2** (Kim2091, 2024) — *retrained as a DAT2 model*, not ESRGAN; handles realistic, anime, cartoon, illustration uniformly. The creator calls it "easily the best model I've ever trained." A strong single-model default for the agent's default path.
- **4x-Remacri** (FoolhardyVEVO) — interpolation of Siax / Superscale / Remacri-Original; praised for preserving skin detail without the UltraSharp oversharpen halo.
- **4x-NMKD-Siax** (NMKD) — high-noise photography; fabric / texture / food.
- **4x-AnimeSharp** (Kim2091) — 2D art; cleaner than anime_6B on modern anime.
- **4x-FatalPixels / 4x-PixelPerfect / 4x-Alsa** — nearest-neighbor-preserving pixel-art upscalers.
- **4x-NomosUniDAT_otf** / **4xNomos2_hq_dat2** (Helaman / Philip Hofmann) — DAT2 models on the Nomos dataset (6000 curated high-quality images); state of the art for clean photography in 2024.

### 1.2 SwinIR — Swin Transformer Image Restoration

**SwinIR** (Liang et al., ICCV-W 2021, [arXiv:2108.10257](https://arxiv.org/abs/2108.10257), [repo](https://github.com/JingyunLiang/SwinIR)) replaced RRDB's convolutions with stacked Swin Transformer blocks (RSTBs) — shifted-window self-attention with residual paths — producing up to +0.45 dB PSNR over RCAN/ESRGAN baselines with up to 67 % fewer parameters. It set the template for all later transformer SR models.

Model variants the pipeline should recognize:

- `001_classicalSR_DF2K_s64w8_SwinIR-M_x[2,3,4,8]` — classical bicubic SR on DF2K.
- `003_realSR_BSRGAN_DF2K_s64w8_SwinIR-L_x4_GAN` — GAN-finetuned for real-world photos; closest SwinIR equivalent to Real-ESRGAN-x4plus.
- `004_grayDN_DFWB_s128w8_SwinIR-M_noise[15,25,50]` — grayscale denoising.
- `005_colorDN_DFWB_s128w8_SwinIR-M` — color denoising.
- `006_CAR_DFWB_s126w7_SwinIR-M_jpeg[10,20,30,40]` — JPEG-artifact reduction.

**Practical note:** SwinIR is noticeably slower than RRDB (~2–4× on the same GPU) because of window attention. For an asset pipeline where upscaling is a post step run once per final image, that cost is fine. For video or batch-of-hundreds workflows, stick with RRDB / SPAN / OmniSR.

### 1.3 HAT, HAT-L, Real-HAT, Real-HAT-Sharper

**HAT** (Chen et al., CVPR 2023, [arXiv:2205.04437](https://arxiv.org/abs/2205.04437), [repo](https://github.com/XPixelGroup/HAT)) — Hybrid Attention Transformer — combines *channel attention* (squeeze-and-excitation style, global) with *window self-attention* (local) and adds an *overlapping cross-attention* block so neighboring windows exchange information. It "activates more pixels" (the paper's phrase) than SwinIR, meaning more of the input image actually contributes to each output pixel. HAT was SOTA on the classical SR benchmarks (Set5/Set14/Urban100/Manga109) when published, and HAT-L (large) is still competitive with 2024 models like DAT / ATD / DRCT.

Model variants:

- **HAT-S** — small (~9 M params); the "drop-in SwinIR replacement".
- **HAT** — standard (~20 M).
- **HAT-L** — large (~40 M); the PSNR king.
- **Real_HAT_GAN_SRx4.pth** — GAN-fine-tuned on real-world degradation (Nov 2022); the real-world analogue to Real-ESRGAN-x4plus but with transformer backbone.
- **Real_HAT_GAN_SRx4_sharper.pth** (Aug 2023) — sharper variant; favored by the OpenModelDB community for photos and product shots.

HAT-L + Real-HAT-Sharper is, as of early 2026, the "best known safe default" for photographic content in a two-stage pipeline (initial 2× with Real-HAT, optional second 2× with DAT2 / DRCT).

### 1.4 APISR — Anime Production Inspired Real-World SR

**APISR** (Wang et al., CVPR 2024, [arXiv:2403.01598](https://arxiv.org/abs/2403.01598), [repo](https://github.com/Kiteretsu77/APISR), GPL-3.0) targets a problem the anime community has complained about for years: anime *isn't drawn frame-by-frame* — studios reuse key frames 2–3×, so naively training on video gives you three identical blurry frames and one crisp one. APISR:

1. Runs an anime-specific frame picker to find the *least-compressed, most-informative* frames from video sources.
2. Releases the **API dataset** (≈3000 high-quality anime frames).
3. Introduces a *prediction-oriented compression module* to model the distortions anime production actually produces (faint hand-drawn lines, JPEG+H.264 cascade, edge bleed).
4. Uses a *twin perceptual loss* — one LPIPS head trained on anime, another on photorealistic features — to kill color artifacts.

Released weights: **GRL (GRL-base 4×, "best quality"), RRDB (fastest, ESRGAN-compatible), DAT-small (best PSNR)** — all at 2× and 4×. For asset pipelines, the **RRDB** checkpoint is attractive because it's drop-in compatible with spandrel and Real-ESRGAN's inference code. For highest quality on flat illustration / UI stickers, use the **DAT-small 4×** checkpoint.

APISR is the right default for:
- Illustration-style mascots / logos with flat or cel-shaded fills.
- Anime-style UI illustrations (`undraw`-style, `popsy.co`-style, `humaaans`-style — not technically anime but share flat-shaded topology).
- Sticker generation.

APISR is *wrong* for:
- Photographic inputs (will hallucinate cel-shading edges).
- Small type / ui text overlays (clean-edge models like 4xHFA2kShallowESRGAN are better).

### 1.5 DAT, ATD, DRCT, SPAN, OmniSR — the 2023–2024 wave

These are all transformer (or SPAN-style hybrid) architectures that beat SwinIR on Set5/Manga109 benchmarks but haven't displaced HAT as the production default because of training cost and inconsistent real-world fine-tunes:

- **DAT** (Dense Attention Transformer, ICCV 2023) — basis of **4xNomos2_hq_dat2** and 4x-UltraSharpV2, the "best general upscaler of 2024" per the OpenModelDB community.
- **ATD** (Adaptive Token Dictionary, CVPR 2024) — strong on text / structured content; used in `4xNomos2_hq_atd`.
- **DRCT** (Dense Residual-Connected Transformer, [arXiv:2404.00722](https://arxiv.org/abs/2404.00722), CVPR-W NTIRE 2024) — fixes the "information bottleneck" problem by adding dense residuals between Swin/HAT blocks. Models like `4xNomos2_hq_drct-l` are now the PSNR leaders.
- **SPAN** (Swift Parameter-free Attention Network, ECCV-W 2024) — mobile-friendly, ~1 M params, runs on iGPU.
- **OmniSR** — focused on efficient deployment; favored by chaiNNer's "fast" preset.

**Agent-facing rule of thumb:** if speed doesn't matter and the input is clean, prefer DAT2 or DRCT-L at 4×. If the input is degraded (JPEG, small, noisy), prefer Real-HAT-Sharper or `RealESRGAN_x4plus`. If the input is anime/illustration, prefer APISR-DAT or 4x-UltraSharpV2.

### 1.6 Remacri, LDSR, Ultimate-SD-Upscale, SUPIR — refinement tier

**Remacri** — covered above; an ESRGAN interpolation that wins on perceptual "looks like a real photo" tests but loses on PSNR.

**LDSR** (Latent Diffusion Super Resolution) — the original SD1 upscaler (sd-v1-4 → LDSR decoder). Very slow, slightly painterly. Superseded by SD-upscale and Ultimate SD Upscale; included only because legacy workflows still reference it.

**Ultimate SD Upscale** (Coyote-A, [A1111 repo](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111), [ComfyUI port](https://github.com/ssitu/ComfyUI_UltimateSDUpscale)) — tile-based img2img. Pipeline: (1) classic upscale (e.g. 4x-UltraSharp) to a 4× base; (2) tile into 512²/1024² tiles; (3) run each tile through SD/SDXL img2img at `denoise` 0.15–0.35; (4) stitch with Linear / Chess / None seam-fix. **A refiner, not a plain upscaler** — always needs a diffusion model in the loop and is governed by the SD prompt.

**SUPIR** (CVPR 2024, [paper](https://openaccess.thecvf.com/content/CVPR2024/papers/Yu_Scaling_Up_to_Excellence_Practicing_Model_Scaling_for_Photo-Realistic_Image_CVPR_2024_paper.pdf)) — SDXL-based restoration trained on 20 M captioned high-res images. Accepts a prompt. Best-in-class for photographic restoration; covered in angle 17b.

### 1.7 Pixel-art & vector-friendly specialists

For pixel-art assets (game sprites, retro icons) the agent must *not* use any of the above — they all blur the sharp 1-pixel edges. Use:

- **xBRZ** (classical, non-ML, nearest-neighbor preserving).
- **4x-PixelPerfect** (OpenModelDB) — ESRGAN fine-tune constrained to preserve quantized palette.
- **Lady0101_OmniSR-pixelart** — OmniSR variant; preserves single-pixel features.
- **scale2x/HQx** (classical) — still useful for 2×-only NN doubling.

For vector-traced logos (raster → potrace/vtracer → SVG), the upscaler goal is *different*: you don't need 4K pixel perfection, you need *clean anti-aliased edges at 1024²* so the vectorizer produces few-control-point paths. For that path:

- **4xHFA2kShallowESRGAN** / **2xHFA2kCompact** — ultra-sharp without halos.
- **APISR-RRDB** at 2× — clean outlines for cartoon/mascot logos.
- Then feed into `vtracer --colormode binary --filter_speckle 10` or `potrace --turdsize 10` (see angle 16).

---

## 2. Asset-Type Picker (decision table for the agent / skill)

| Asset | Recommended upscaler (primary) | Fallback | Avoid |
|---|---|---|---|
| Photographic hero / OG image | `Real_HAT_GAN_SRx4_sharper` | `RealESRGAN_x4plus`, `4xNomos2_hq_drct-l` | `AnimeSharp` (over-linearizes), `LDSR` (too slow) |
| Product photo | `4xNomos2_hq_dat2` | `4x-UltraSharpV2` | `APISR` (cel-shading artifacts) |
| Flat vector-style logo | `4x-UltraSharpV2` (DAT2) → vtracer | `APISR-DAT 4×`, `4xHFA2kShallowESRGAN` | `Ultimate SD Upscale` at denoise > 0.2 (hallucinates texture) |
| Mascot / illustrated logo | `APISR-DAT 4×` | `4x-AnimeSharp`, `RealESRGAN_x4plus_anime_6B` | `Remacri` (photographic bias) |
| App icon (iOS/Android source) | `4x-UltraSharpV2` → crop → Capacitor/pwa-asset-generator | `4x-NMKD-Siax` | `realesr-animevideov3` (1.4 M params, low detail) |
| Favicon (16/32 px target) | Upscale first then *downsample* with Lanczos or Mitchell; do NOT upscale to 16² | — | Direct ML to 16² (destroys legibility) |
| UI illustration / empty state | `APISR-DAT 4×` | `4x-AnimeSharp` | `SwinIR-Real-L` (softens) |
| UI screenshot / dashboard | `Real-HAT-sharper` then Ultimate-SD-Upscale at denoise 0.1 | `4x-UltraSharpV2` | `4x-UltraSharp` v1 (oversharpens text) |
| Text / typography crop | `4xNomos2_hq_atd` (ATD is strong on structured content) | `SwinIR-realSR-L` | Any diffusion upscaler with denoise > 0.15 (garbles glyphs) |
| Pixel-art sprite / retro icon | `xBRZ` or `4x-PixelPerfect` | `Lady0101_OmniSR-pixelart` | Any RRDB/Swin/HAT model (blurs) |
| Line art / sketch | `4xHFA2kShallowESRGAN` | `APISR-RRDB 2×` | `Real-ESRGAN-x4plus` (too photographic) |
| AI-generated SDXL/Flux render, final polish | two-pass: Real-HAT 2× → Ultimate-SD-Upscale 2× @ denoise 0.2 | SUPIR (angle 17b) | Single 8× pass anything |

The agent should record the *asset type* as a structured field during prompt enhancement (logo / icon / illustration / photo / ui / text / pixelart / lineart) and use it to select one row of this table.

### 2.1 Specific notes on logos and sharp-edge preservation

Logos are the asset class where upscaler choice matters most because errors are *brand-visible*. Three concrete failure modes:

- **Halo artifacts / ringing** — UltraSharp v1 (very aggressive USM-equivalent), classic ESRGAN; visible as dark/bright rim around every vector edge at 300 % zoom. DAT2-based models (UltraSharpV2, 4xNomos2_hq_dat2) are much better.
- **Edge softening** — SwinIR-L classical, Remacri; fine for photos, deadly for logos where the whole identity is the edge.
- **Hallucinated texture in flat fills** — Ultimate SD Upscale at denoise ≥ 0.3, SUPIR without prompt discipline, LDSR. A solid `#0F172A` fill comes back as an organic gradient. Always use low-denoise or skip diffusion refiners entirely for flat brand colors.

Concrete empirical ranking on flat-logo preservation (community consensus from the OpenModelDB and ComfyUI-on-Discord evaluations, 2024–2026, confirmed by visual side-by-sides):

1. `4x-UltraSharpV2` (DAT2) — best overall balance.
2. `4xNomos2_hq_dat2` — slightly cleaner edges; sometimes too aggressive on small features.
3. `APISR-DAT 4×` — best on cel-shaded illustrated logos.
4. `4xHFA2kShallowESRGAN` — best on purely 2-color / 1-bit logos.
5. `Real_HAT_GAN_SRx4_sharper` — acceptable, slightly photographic bias.

---

## 3. Integration Layer

### 3.1 chaiNNer as the orchestrator

**chaiNNer** ([repo](https://github.com/chaiNNer-org/chaiNNer), [chainner.app](https://chainner.app)) is a node-based image processing GUI originally built for AI upscaling. Architecturally it is:

- Electron + React front-end (TypeScript).
- Python backend running in an isolated, auto-downloaded Python environment (`integrated_python` — no user Python dependency).
- GPU support via PyTorch (CUDA/MPS), NCNN (AMD/Intel/Apple), ONNX Runtime, and TensorRT.
- Cross-platform — Windows/macOS/Linux; Apple Silicon native.

Release 0.24 (June 2024) added conditional branching (Compare / Conditional nodes) and ~1.25× faster PyTorch upscaling. That makes chaiNNer usable as a *server-side batch processor* driven by a CLI export, which is exactly the pattern an agent wants.

> **Updated 2026-04-21:** chaiNNer's latest stable release is **v0.25.1** (January 7, 2026). Development had paused for over a year but resumed at reduced capacity, with active nightly builds continuing through early 2026.

Typical asset-generation upscale chain in chaiNNer:

```
[Load Image]
   → [Auto-detect alpha] ─── (split alpha node) ──┐
   → [RGB channels] → [Load Model (UltraSharpV2)] → [Upscale PyTorch]
   → [Sharpen (unsharp, small radius)]              ├── [Merge Alpha]
   → [Upscale alpha with bilinear x4] ──────────────┘
   → [Save Image (PNG RGBA)]
```

Key chaiNNer nodes a skill should reference:

- `Load Model` — accepts `.pth`/`.safetensors`/`.ckpt`; auto-detects architecture via spandrel.
- `Upscale Image` / `Upscale Image (PyTorch)` / `Upscale Image (NCNN)` — the main inference node.
- `Tile Size` — crucial for VRAM; chaiNNer handles overlapping tile merging.
- `Conditional` — if-then branching for routing by detected asset type (e.g. detect edge-count and branch).
- `Iterator` — for batch processing whole directories.

The chaiNNer graph can be exported as a `.chn` JSON file and invoked headless via CLI — this is what the asset-generation skill should actually ship: a library of `.chn` graphs (logo.chn, photo.chn, pixelart.chn, illustration.chn) plus a small router that picks one.

### 3.2 spandrel — the library everyone uses under the hood

[`chaiNNer-org/spandrel`](https://github.com/chaiNNer-org/spandrel) is the unified PyTorch loader that chaiNNer, ComfyUI, InvokeAI, and many others use. Given a `.pth` file, spandrel:

1. Sniffs the state-dict keys.
2. Identifies the architecture (ESRGAN/RRDB, SwinIR, HAT, DAT, ATD, DRCT, OmniSR, SPAN, SCUNet, SAFMN, RGT, etc. — 25+ architectures as of 0.4.x).
3. Infers hyperparameters (scale, number of blocks, feature channels, window size).
4. Returns an `ImageModelDescriptor` with a unified `.inference()` method.

```python
from spandrel import ModelLoader
model = ModelLoader().load_from_file("4x-UltraSharpV2.pth")
# model.scale, model.architecture.name, model.input_channels all populated
out = model(image_tensor)  # shape (1, 3, H*scale, W*scale)
```

Licensing note: `spandrel` (MIT/Apache/public-domain archs only) vs. `spandrel_extra_arches` (GPL/research-only archs, e.g. HAT/SRFormer in some versions). For a commercial SaaS, use the base `spandrel` and the MIT-licensed model set from OpenModelDB.

### 3.3 chainner-ext and Node.js wrappers

[`chainner-ext`](https://github.com/chaiNNer-org/chainner-ext) is a Rust-backed N-API extension providing the non-ML image ops chaiNNer uses (resize, color conversion, PNM I/O). For a TypeScript agent runtime it avoids shelling out to Python for simple resize/Lanczos ops around the ML step. A TS skill can shell out to a thin `python -m spandrel_cli` for ML inference and use `chainner-ext` + `sharp` for everything else; an all-Python skill can call chaiNNer headlessly with a saved `.chn` graph or use spandrel + PIL/OpenCV directly.

### 3.4 Ultimate SD Upscale integration

When diffusion-based refinement is desired (photos, UI mocks), the standard ComfyUI subgraph is:

```
[Load Image]
    ↓
[Upscale Image (4x-UltraSharpV2)]     ← classical pre-upscale
    ↓
[Ultimate SD Upscale]
    ├── model: SDXL (or SD1.5 for photos)
    ├── tile_width: 1024, tile_height: 1024
    ├── mask_blur: 8, tile_padding: 32
    ├── seam_fix_mode: "Half-tile offset + intersections"
    ├── denoise: 0.20  (never >0.35)
    └── prompt: "(from generation context)"
    ↓
[Save Image]
```

Critical parameter guidance:

- `denoise` 0.15–0.20 = **refinement** (safe).
- `denoise` 0.30–0.35 = **re-rendering** (use only on photos where you want new detail).
- `denoise` > 0.5 = **regeneration** (will destroy logo identity; only for hero-image "creative upscale").

For logos/icons, skip Ultimate-SD-Upscale entirely; tile refinement hallucinates micro-texture into flat colors. For UI illustrations, denoise 0.15 max.

### 3.5 OpenModelDB catalog integration

[OpenModelDB](https://openmodeldb.info) is the canonical metadata index for community upscaler models. Each model entry has:

- `name`, `author`, `architecture`, `scale`, `license`, `tags` (photo / anime / pixelart / text / general / compression-artifact / etc.).
- Pretrained checkpoint download URL (usually GitHub Release or HF Hub).
- Metrics (PSNR / SSIM on standard sets when available).
- Example input/output image pairs.

A prompt-enhancement skill should treat OpenModelDB's JSON (there is an unofficial but stable model list exported from the site) as a *model registry*:

```
registry: {
  "4x-UltraSharpV2": { url, sha256, arch: "DAT2", scale: 4, tags: ["general","illustration","photo"], license: "CC-BY-4.0" },
  "4xNomos2_hq_dat2": { ... },
  "APISR_RRDB_x4":    { ... },
  ...
}
```

and route by tag — `asset_type: "logo"` → `tags ⊇ {illustration, general}, arch ∈ {DAT, DAT2, DRCT}` → pick highest-scoring.

### 3.6 Alpha-channel handling — the often-missed step

Every upscaler listed here takes RGB in and returns RGB out. For transparent assets (logos, stickers, UI icons) the alpha channel must be handled explicitly. Two strategies:

1. **Split / Merge** (chaiNNer default): split alpha, upscale RGB with ML model, upscale alpha with bilinear or Lanczos (alpha is monotonic enough that an ML model just adds noise), merge.
2. **Premultiplied RGB with composite background**: composite on neutral gray, upscale, estimate alpha via matting model (BiRefNet / BRIA RMBG — angle 16). Used when the original alpha is very soft.

Strategy (1) is the right default for hard-edged logos and icons. Strategy (2) is better for generated images that had alpha faked via white-background + chroma key (the Nano Banana failure the user described).

---

## 4. Recommended Prompt-Enhancement-Skill Pipeline

Combining everything above, a minimal upscaling subsystem for the prompt-enhancement skill:

```
Input: generated_image, asset_type, target_resolution

1. Detect alpha:
   - if RGBA → split into RGB + A
   - elif RGB with near-white background and soft edges → send to BiRefNet (angle 16)
   - else → treat as RGB

2. Select upscaler by asset_type (from §2):
   - logo       → 4x-UltraSharpV2  (DAT2)
   - icon       → 4x-UltraSharpV2
   - illustration → APISR-DAT 4×
   - photo      → Real_HAT_GAN_SRx4_sharper
   - text       → 4xNomos2_hq_atd
   - pixelart   → 4x-PixelPerfect (or xBRZ)

3. Compute required scale:
   - scale_needed = ceil(target_resolution / current_resolution)
   - if scale_needed == 1 → skip
   - if scale_needed == 2 → run model at 2× (or 4× then Lanczos-down to 2×; usually cleaner)
   - if scale_needed > 4 → run twice (4× then 2× or another 4×), NOT a single 8× model

4. Run via spandrel:
   - model = ModelLoader().load_from_file(registry[model_id].path)
   - out = model(tile_iter(image, tile_size=512, overlap=32))

5. Alpha channel: bilinear upscale to same size, merge

6. Optional refinement (only for photo / UI screenshot):
   - Ultimate SD Upscale with SDXL, denoise ≤ 0.2, tile 1024
   - OR skip refinement

7. Final resize to exact target (Lanczos-3) and encode (PNG-24 with alpha if needed, WebP/AVIF for web deliverables)
```

This pipeline directly addresses the failure modes seen in the motivating use case: a `4x-UltraSharpV2` logo upscale with explicit alpha handling will not produce "weird boxes in the background" — it literally cannot, because the background channel is handled separately and never visited by the RGB model.

---

## 5. Open Questions / Gaps

- **SOTA-vs-production gap.** DRCT and ATD beat HAT on PSNR benchmarks but their OpenModelDB fine-tunes are younger; community trust still points to DAT2 and HAT-L. Worth revisiting in Q3 2026.
- **Alpha-aware upscalers.** No publicly released SR model *natively* accepts RGBA input; everyone splits. A native RGBA model (anime logos / stickers) is a research gap — APISR could plausibly be fine-tuned with RGBA heads.
- **Semantic tiling.** Ultimate SD Upscale's tile seams are handled geometrically (mask-blur + offset). A content-aware approach — detect logo vs. background, only refine background — would eliminate brand-damaging hallucination. Not yet a shipped product.
- **License matrix for commercial use.** HAT is Apache-2.0 (clean). SwinIR is Apache-2.0 (clean). ESRGAN / Real-ESRGAN is BSD-3 (clean). APISR is GPL-3 (viral — cannot embed in a closed-source commercial product, can ship via a separate subprocess). Many community fine-tunes on OpenModelDB are CC-BY-4.0 or CC-BY-NC — the latter blocks commercial SaaS use. The asset agent must carry a license tag per model and honor it.
- **Nano Banana / Imagen 4 alpha output.** The motivating user complaint ("weird boxes in the background") is upstream of upscaling — generative models are outputting fake checkerboard instead of real RGBA. Upscaling *cannot fix* this; it can only preserve whatever alpha the generator produced. Link to angle 13 (transparent backgrounds).

---

## 6. References

### Papers (primary)

- Wang, Xintao et al. "**Real-ESRGAN: Training Real-World Blind Super-Resolution with Pure Synthetic Data**." ICCV-W 2021. [arXiv:2107.10833](https://arxiv.org/abs/2107.10833).
- Liang, Jingyun et al. "**SwinIR: Image Restoration Using Swin Transformer**." ICCV-W 2021. [arXiv:2108.10257](https://arxiv.org/abs/2108.10257).
- Chen, Xiangyu et al. "**Activating More Pixels in Image Super-Resolution Transformer (HAT)**." CVPR 2023. [arXiv:2205.04437](https://arxiv.org/abs/2205.04437).
- Wang, Boyang et al. "**APISR: Anime Production Inspired Real-World Anime Super-Resolution**." CVPR 2024. [arXiv:2403.01598](https://arxiv.org/abs/2403.01598).
- Hsu, Chia-Yuan et al. "**DRCT: Saving Image Super-Resolution away from Information Bottleneck**." CVPR-W NTIRE 2024. [arXiv:2404.00722](https://arxiv.org/abs/2404.00722).
- Yu, Fanghua et al. "**Scaling Up to Excellence (SUPIR): Practicing Model Scaling for Photo-Realistic Image Restoration**." CVPR 2024. [PDF](https://openaccess.thecvf.com/content/CVPR2024/papers/Yu_Scaling_Up_to_Excellence_Practicing_Model_Scaling_for_Photo-Realistic_Image_CVPR_2024_paper.pdf).

### Repositories

- [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) — official Real-ESRGAN (BSD-3).
- [JingyunLiang/SwinIR](https://github.com/JingyunLiang/SwinIR) — official SwinIR (Apache-2.0).
- [XPixelGroup/HAT](https://github.com/XPixelGroup/HAT) — HAT, HAT-L, Real-HAT (Apache-2.0).
- [Kiteretsu77/APISR](https://github.com/Kiteretsu77/APISR) — APISR (GPL-3.0).
- [chaiNNer-org/chaiNNer](https://github.com/chaiNNer-org/chaiNNer) — node-graph orchestrator (GPL-3.0).
- [chaiNNer-org/spandrel](https://github.com/chaiNNer-org/spandrel) — unified SR model loader (MIT).
- [chaiNNer-org/chainner-ext](https://github.com/chaiNNer-org/chainner-ext) — Rust/Node image ops.
- [Coyote-A/ultimate-upscale-for-automatic1111](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111) — Ultimate SD Upscale, A1111.
- [ssitu/ComfyUI_UltimateSDUpscale](https://github.com/ssitu/ComfyUI_UltimateSDUpscale) — ComfyUI port.

### Model catalogs

- [OpenModelDB](https://openmodeldb.info/) — community upscaler metadata, model search, architecture tags, license info.
- [4x-UltraSharpV2 — OpenModelDB](https://openmodeldb.info/models/4x-UltraSharpV2).
- [4x-Remacri — OpenModelDB](https://openmodeldb.info/models/4x-Remacri).
- [4xNomos2_hq_dat2 — OpenModelDB](https://openmodeldb.info/models/4x-Nomos2-hq-dat2).
- [4xNomos2_hq_drct-l — OpenModelDB](https://openmodeldb.info/models/4x-Nomos2-hq-drct-l).
- [4xNomos2_hq_atd — OpenModelDB](https://openmodeldb.info/models/4x-Nomos2-hq-atd).
- [4x-AnimeSharp — OpenModelDB](https://openmodeldb.info/models/4x-AnimeSharp).
- [Acly/hat — Hugging Face mirror](https://huggingface.co/Acly/hat) of HAT / Real-HAT weights.

### Tutorials and community reference

- [ChaiNNer Guide: AI Image Processing & Batch Upscaling 2025 (Apatero)](https://apatero.com/blog/chainner-universal-toolkit-ai-image-processing-2025).
- [Jakob Stewart — Comparison of best upscalers on Stable Diffusion + SUPIR](https://www.jakobstewart.com/post/comparison-best-upscalers-stable-diffusion).
- [Ultimate SD Upscale — ComfyUI docs](https://comfyui.dev/docs/guides/nodes/ultimate-sd-upscale/).
- [spandrel PyPI](https://pypi.org/project/spandrel/), [spandrel API docs](https://chainner.app/spandrel/).
