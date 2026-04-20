# Upscalers & Refiners for AI-Generated Software Assets

External research digest — grounding for the `prompt-to-asset` asset-polishing pipeline.
Scope: flat assets (logos, icons, UI spot illustrations) vs. photoreal (hero art,
marketing imagery). Focus on open-source, self-hostable tooling with clear licensing.

> **Key principle.** No single upscaler handles both regimes well. GAN-based
> ESRGAN derivatives (e.g. 4x-UltraSharp) oversharpen photographs; diffusion
> refiners (SUPIR, SD/Flux img2img) hallucinate on clean logos. The pipeline
> should route by asset type and never apply "just one model for everything".

---

## 1. Catalog

### 1.1 GAN / Transformer upscalers (deterministic, fast)

#### Real-ESRGAN (xinntao)
- **URL:** https://github.com/xinntao/Real-ESRGAN · HF mirror: https://huggingface.co/ai-forever/Real-ESRGAN
- **License:** BSD-3-Clause (permissive, commercial OK).
- **I/O:** RGB PNG/JPEG → RGB PNG, scales 2x/4x. Built-in models: `RealESRGAN_x4plus`
  (photo/general), `RealESRGAN_x4plus_anime_6B` (anime/flat line art),
  `realesr-animevideov3` (video frames).
- **Hardware:** ~1 GB VRAM for 1024→4096 in ~2 s on a consumer GPU; CPU fallback
  works but is slow. 4 GB VRAM comfortably handles tiled 4K output.
- **API:** Python CLI (`inference_realesrgan.py -n model -i input -o output -s 4`)
  plus importable `RealESRGANer` class. No official Node binding.
- **Best fit:** General-purpose baseline; anime-6B model is strong for flat/cartoon
  work. Degrades on already-clean vector-like logos (introduces texture).
- **Maintenance:** Last tagged release `v0.3.0` (Sept 2022); repo is in maintenance
  mode but actively receives community compatibility PRs through 2025.

#### Real-ESRGAN-ncnn-vulkan
- **URL:** https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan
- **License:** MIT.
- **I/O:** Same weights as upstream, shipped as standalone binaries (Win/macOS/Linux).
- **Hardware:** Vulkan on AMD/Intel/NVIDIA; no Python/CUDA dependency. Lower
  memory footprint than the PyTorch version. CPU-only runs are impractical.
- **API:** CLI only: `realesrgan-ncnn-vulkan -i in.png -o out.png -n model -s 4`.
- **Best fit:** Portable production workers, cross-GPU-vendor deployment, CI where
  installing CUDA/PyTorch is overkill.
- **Maintenance:** Low release cadence, but stable; effectively "done" software.

#### SwinIR (JingyunLiang)
- **URL:** https://github.com/JingyunLiang/SwinIR
- **License:** Apache-2.0 (commercial OK).
- **I/O:** 2x/3x/4x/8x; distinct checkpoints per task (classical SR, lightweight SR,
  real-world SR with `003_realSR_BSRGAN_DFOWMFC_s64w8_SwinIR-L_x4_GAN.pth`,
  denoising, JPEG-artifact removal).
- **Hardware:** ~2 GB VRAM at 4x on 1024 input; ~3–5x slower than Real-ESRGAN for
  comparable output.
- **API:** Python (`main_test_swinir.py`) + importable model. No first-party CLI.
- **Best fit:** Photo restoration with noise/JPEG cleanup in one pass. Good for
  degraded stock photography in hero art that needs both denoising and SR.
- **Maintenance:** Research code; repo stable, infrequent updates. Widely mirrored
  and integrated into third-party tools.

#### HAT — Hybrid Attention Transformer (XPixelGroup)
- **URL:** https://github.com/XPixelGroup/HAT
- **License:** Apache-2.0.
- **I/O:** 2x/3x/4x real-world SR; variants `HAT-L`, `HAT-S`, `Real-HAT-GAN`. `.pth`
  checkpoints; loadable via Spandrel.
- **Hardware:** ~3 GB VRAM at 4x on 1024 input; ~8 s per image, noticeably slower
  than Real-ESRGAN but state-of-the-art perceptual quality on photo benchmarks
  (e.g. ~22.6 PSNR on DIV2K for `Real-HAT-GAN`).
- **API:** Python via `basicsr`; or the generic Spandrel loader.
- **Best fit:** Highest-fidelity photoreal upscaling when SUPIR is overkill.
  Preserves micro-detail (skin, foliage, fabric) better than Real-ESRGAN.
- **Maintenance:** Active, peer-reviewed (CVPR 2023 / TPAMI).

#### DAT / DAT-2 — Dual Aggregation Transformer (zhengchen1999)
- **URL:** https://github.com/zhengchen1999/DAT
- **License:** Apache-2.0.
- **I/O:** 2x/3x/4x SR; `4x DAT-2` is the most deployed checkpoint, distributed via
  OpenModelDB.
- **Hardware:** Slightly heavier than SwinIR; similar footprint to HAT.
- **API:** PyTorch via `basicsr`; first-class support in Spandrel and chaiNNer.
- **Best fit:** Photo and mixed content where HAT is either unavailable or too
  slow; outperforms SwinIR on standard benchmarks.
- **Maintenance:** Paper accepted at ICCV 2023; community checkpoints still
  actively trained (e.g. `4xNomos8kDAT`, `RealWebPhoto` DAT variants).

#### waifu2x-ncnn-vulkan (nihui)
- **URL:** https://github.com/nihui/waifu2x-ncnn-vulkan
- **License:** MIT (binary); underlying `waifu2x` models MIT.
- **I/O:** 1x/2x/4x with noise reduction levels `-n 0..3`; designed for anime,
  line art, and flat illustration — not photo.
- **Hardware:** Vulkan GPU, or `-g -1` for explicit CPU inference. Very low
  footprint; fine on integrated GPUs and laptops.
- **API:** CLI only.
- **Best fit:** Flat assets, line art, pixel-clean logos where you want
  deterministic denoise+scale with no hallucination. The "safe" flat-art default.
- **Maintenance:** Mature, stable; still receives periodic updates from nihui.

### 1.2 Community checkpoints (ESRGAN architecture, OpenModelDB)

These are fine-tuned ESRGAN weights served through **OpenModelDB**, a community
catalog of ~668+ upscaler checkpoints with per-model license metadata
(https://openmodeldb.info). OpenModelDB is the canonical place to discover and
audit weight licensing before shipping; each model card reports license, training
data, architecture, and scale. **Common pitfall:** many popular community models
(UltraSharp, AnimeSharp, Remacri) are **CC-BY-NC-SA-4.0**, i.e. non-commercial
only — verify before embedding in a commercial product.

| Model | License | Architecture | Best fit |
|---|---|---|---|
| **4x-UltraSharp** | CC-BY-NC-SA-4.0 | ESRGAN | General photo/illustration finishing; very popular SD companion, but NC-only. |
| **4x-AnimeSharp** | CC-BY-NC-SA-4.0 | ESRGAN (interp of UltraSharp + TextSharp) | Anime/flat art with crisp edges; good for UI illustrations. |
| **4x-Remacri** | CC-BY-NC-SA-4.0 | ESRGAN (BSRGAN-interp) | Photo; gentler than UltraSharp, less over-sharpening. |
| **4xNomos8k_* / 4xRealWebPhoto_* (DAT-2, RGT, SPAN)** | typically CC-BY-4.0 or CC0 | DAT2/RGT/SPAN | Modern photo checkpoints with commercial-friendly licenses. Preferred replacements for NC community models. |

**Loader:** use `spandrel` (https://github.com/chaiNNer-org/spandrel, MIT) to load
any of these `.pth` files in Python without hand-coding per-architecture glue.

### 1.3 Diffusion-based refiners (heavier, hallucinate detail)

#### SUPIR — Scaling Up Image Restoration (Fanghua-Yu)
- **URL:** https://github.com/Fanghua-Yu/SUPIR · mirror: https://github.com/chenxwh/SUPIR
- **License:** Upstream is "Other (NOASSERTION)" — SDXL-dependent and
  non-commercial-leaning; the chenxwh mirror is MIT but still inherits SDXL
  weight licensing. **Treat as research/internal-use until legal clears it.**
- **I/O:** Any resolution in, upscales with diffusion-based restoration. Uses
  SDXL as backbone; prompt-conditioned (optionally LLaVA-captioned).
- **Hardware:** 12 GB VRAM minimum (RTX 3060 confirmed, LLaVA-off); 24 GB+ for
  full quality. Minutes per image, not seconds.
- **API:** Python scripts; integrated into ComfyUI via `ComfyUI-SUPIR` nodes.
- **Best fit:** Photoreal hero art that needs restoration-grade detail, texture
  recovery, or upscaling past 4x. Photo-only — will ruin flat illustration.
- **Maintenance:** Actively developed through 2025; commercial SaaS at suppixel.ai.

#### SD img2img refine (tile-based, low denoise)
- **URL:** https://github.com/Coyote-A/ultimate-upscale-for-automatic1111 (A1111) ·
  Ultimate SD Upscale nodes for ComfyUI.
- **License:** GPL-ish for the extensions; SD/SDXL checkpoints vary.
- **I/O:** Any input → tiled img2img at 2x/4x. Typical recipe: first pass with a
  GAN upscaler (Real-ESRGAN, DAT) then tiled SD img2img at **denoise 0.2–0.35**
  with ControlNet Tile to avoid hallucination.
- **Hardware:** 8–12 GB VRAM depending on SD model and tile size (512/768).
- **API:** A1111 / ComfyUI workflows; scriptable via their APIs.
- **Best fit:** Photoreal polish after a GAN upscale — restores micro-texture
  without the full SUPIR cost. Stack multiple 2x passes rather than one 4x.

#### Flux img2img polish
- **Models:** `black-forest-labs/FLUX.1-dev`, `FLUX.1-schnell`; img2img workflows
  in ComfyUI.
- **License:** FLUX.1-dev is non-commercial; FLUX.1-schnell is Apache-2.0.
- **Quirk:** Flux does **not** behave like SD on denoise strength. Subtle edits
  land around denoise 0.91–0.94; below ~0.85 almost nothing changes. "Low denoise
  polish" in Flux therefore means 0.85–0.95, not 0.2–0.4. Useful for stylistic
  grading of hero art while keeping composition.
- **Best fit:** Photoreal or stylized hero imagery where you want a Flux-native
  look; not a first choice for flat logos.

### 1.4 Pipeline runners

#### chaiNNer (chaiNNer-org)
- **URL:** https://github.com/chaiNNer-org/chaiNNer
- **License:** GPL-3.0.
- **Role:** Node-graph runner for image pipelines. Speaks PyTorch, NCNN, ONNX,
  TensorRT; supports NVIDIA CUDA/TensorRT, AMD ROCm/NCNN, Apple MPS, Intel NCNN.
  Ships with ESRGAN / Real-ESRGAN / SwinIR / HAT / DAT / SPAN / OmniSR loaders.
- **Interface:** GUI **plus** CLI for batch/CI use; self-contained Python
  environment (no host Python required).
- **Best fit:** The reference runner for multi-stage pipelines: detect asset
  type → route model → tile → denoise → export. If you don't want to build
  this orchestration layer yourself in Python, chaiNNer + Spandrel is the
  shortest path.

#### Spandrel (chaiNNer-org)
- **URL:** https://github.com/chaiNNer-org/spandrel · PyPI `spandrel`
- **License:** MIT.
- **Role:** PyTorch loader that auto-detects architecture from `.pth` and
  exposes a single `ImageModelDescriptor` interface across ESRGAN / Real-ESRGAN /
  SwinIR / HAT / DAT / DAT-2 / SPAN / RGT / OmniSR / FDAT / AuraSR and more.
  The right abstraction if `prompt-to-asset` loads upscalers in-process.

---

## 2. Routing table: asset_type → recommended upscaler

Two-tier recommendation: a **primary** default and a **quality-max** fallback
when latency and VRAM are less constrained.

| Asset type | Primary (fast, permissive license) | Quality-max | Avoid |
|---|---|---|---|
| **Logo (flat, 2-tone / few-color)** | `waifu2x-ncnn-vulkan` `-n 1 -s 4` (or `2` then vectorize) | chaiNNer pipeline: `waifu2x` → edge-clean → optional vector trace | SUPIR, Flux img2img, `4x-UltraSharp` (all invent texture) |
| **Icon / UI spot illustration (flat color, line art)** | `RealESRGAN_x4plus_anime_6B` | `4xAnimeSharp` via Spandrel (NC only) or a commercial-licensed anime DAT checkpoint | Photo-trained models (HAT-L, SUPIR) |
| **Anime / stylized character art** | `RealESRGAN_x4plus_anime_6B` | `4x-AnimeSharp` (NC) or DAT anime finetune | Photo restoration models |
| **Photoreal hero art, moderate size (≤2K in)** | `RealESRGAN_x4plus` | `Real-HAT-GANv2` via Spandrel | `4x-AnimeSharp`, waifu2x |
| **Photoreal hero art, high fidelity / >2K out** | `DAT-2 4x` (Spandrel) + optional SD img2img tile polish (denoise 0.2–0.3) | `SUPIR` (when VRAM ≥ 12 GB and license reviewed) | Raw Real-ESRGAN (too smooth) |
| **Stylistic re-grading / look change** | Flux img2img (schnell, Apache) at denoise ≈0.9 | SDXL img2img with ControlNet Tile | GAN upscalers (can't restyle) |
| **Batch / CI / multi-GPU-vendor workers** | `realesrgan-ncnn-vulkan` CLI | chaiNNer CLI wrapping the above | PyTorch-only research repos |

### Pipeline shape

```
classify(asset)
  → if flat:   waifu2x-ncnn-vulkan  → (optional) vector trace
  → if anime:  RealESRGAN_x4plus_anime_6B
  → if photo:  Real-ESRGAN or DAT-2  →  (optional) SD tile img2img @ denoise 0.2–0.3
                                     →  (optional) SUPIR for hero-tier restores
```

Always run the deterministic GAN/transformer stage **first**; only pass to a
diffusion refiner if the asset is photoreal and the classifier is confident.

---

## 3. Licensing cheatsheet (production-relevant)

| Component | License | Commercial use? |
|---|---|---|
| Real-ESRGAN code + built-in weights | BSD-3-Clause | Yes |
| Real-ESRGAN-ncnn-vulkan | MIT | Yes |
| waifu2x-ncnn-vulkan | MIT | Yes |
| SwinIR | Apache-2.0 | Yes |
| HAT | Apache-2.0 | Yes |
| DAT | Apache-2.0 | Yes |
| Spandrel | MIT | Yes |
| chaiNNer | GPL-3.0 | Yes, but **copyleft runtime** — don't statically link into a proprietary binary; shelling out to the CLI is fine |
| OpenModelDB community weights | Per-model (commonly CC-BY-4.0, CC0, or CC-BY-NC-SA-4.0) | **Check each model card.** UltraSharp / AnimeSharp / Remacri are NC-only. |
| SUPIR | NOASSERTION + SDXL weight terms | **Treat as non-commercial until legal review.** |
| FLUX.1-dev | Non-commercial | No |
| FLUX.1-schnell | Apache-2.0 | Yes |
| Stable Diffusion 1.5 / SDXL weights | CreativeML Open RAIL-M / RAIL++-M | Yes, with usage restrictions; audit the RAIL clauses. |

> **Upscaled-image copyright.** Per OpenModelDB's docs, the model license does
> not extend to the upscaled output — that follows the **input** image's
> copyright. This matters when the input itself comes from a third-party
> generator with its own terms.

---

## 4. Sources

- https://github.com/xinntao/Real-ESRGAN — Real-ESRGAN repo, BSD-3-Clause, model zoo, v0.3.0 (Sep 2022), community maintenance through 2025.
- https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan — MIT, CLI, Vulkan GPU.
- https://github.com/nihui/waifu2x-ncnn-vulkan — MIT, explicit CPU mode via `-g -1`, anime/flat-art oriented.
- https://github.com/JingyunLiang/SwinIR — Apache-2.0; real-world `BSRGAN` variants for photo restoration.
- https://github.com/XPixelGroup/HAT — Apache-2.0; CVPR 2023 / TPAMI; state-of-the-art photo SR.
- https://github.com/zhengchen1999/DAT — Apache-2.0; ICCV 2023; DAT-2 deployed on OpenModelDB.
- https://github.com/Fanghua-Yu/SUPIR — diffusion-based photoreal restoration; 12 GB VRAM minimum; SDXL-backed; licensing not commercial-safe by default.
- https://github.com/chaiNNer-org/chaiNNer — GPL-3.0, node-based runner, CLI batch, multi-backend GPU.
- https://github.com/chaiNNer-org/spandrel — MIT, auto-detect loader for ESRGAN/SwinIR/HAT/DAT/SPAN/RGT/OmniSR/FDAT/AuraSR.
- https://openmodeldb.info — community catalog of ~668 upscalers with per-model license, architecture, scale metadata.
- https://openmodeldb.info/docs/licenses — canonical summary of common licenses (CC0, CC-BY-4.0, CC-BY-NC-SA-4.0) and the rule that license does not transfer to outputs.
- https://openmodeldb.info/models/4x-UltraSharp, `/4x-AnimeSharp`, `/4x-Remacri` — all CC-BY-NC-SA-4.0 (non-commercial only).
- https://openmodeldb.info/models/4x-DAT-2 — DAT-2 4x deployment weights.
- https://github.com/Coyote-A/ultimate-upscale-for-automatic1111 — Ultimate SD Upscale, tile+img2img recipe, denoise 0.2–0.5 guidance.
- https://apatero.com/blog/flux-2-klein-image-editing-guide / https://www.aifreeapi.com/en/posts/flux-img2img — Flux img2img denoise behavior (subtle edits only above ~0.85–0.9).
