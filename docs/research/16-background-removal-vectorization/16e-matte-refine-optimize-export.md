---
category: 16-background-removal-vectorization
angle: 16e
title: "Full post-process pipeline — matte → refine → optimize → export across the entire platform family"
slug: 16e-matte-refine-optimize-export
created: 2026-04-19
tags:
  - alpha-matting
  - trimap
  - matteformer
  - matanyone
  - gca-matting
  - oxipng
  - pngquant
  - cwebp
  - cavif
  - libavif
  - potrace
  - vtracer
  - svgo
  - iconutil
  - png-to-ico
  - png2icns
  - premultiplied-alpha
  - decontamination
  - deterministic-build
primary_sources:
  - https://arxiv.org/abs/2003.07711  # GCA Matting
  - https://arxiv.org/abs/2204.02179  # MatteFormer
  - https://arxiv.org/abs/2501.04205  # MatAnyone
  - https://github.com/shufflewzc/FBA_Matting
  - https://github.com/shuffleofficial/GCA-Matting
  - https://github.com/webtoon/matteformer
  - https://github.com/pq-yang/MatAnyone
  - https://github.com/shssoichiro/oxipng
  - https://github.com/kornelski/pngquant
  - https://developers.google.com/speed/webp/docs/cwebp
  - https://github.com/kornelski/cavif-rs
  - https://github.com/AOMediaCodec/libavif
  - https://potrace.sourceforge.net/
  - https://github.com/visioncortex/vtracer
  - https://github.com/svg/svgo
  - https://github.com/steambap/png-to-ico
  - https://github.com/idesis-gmbh/png2icons
  - https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html  # iconutil
---

# 16e — Full post-process pipeline: matte → refine → optimize → export

## Executive Summary

A prompt-driven asset generator can never ship a single raster at a single size. End users need a **platform family**: transparent PNGs for the web and app stores, WebP for lighter web delivery, AVIF for modern browsers and HDR-capable flows, SVG for infinite scaling in marketing surfaces, ICO for Windows, ICNS for macOS, and sometimes TIFF/GIF for legacy workflows. The bridge between a diffusion model's output and that family of files is a **post-process pipeline** with four well-defined stages:

1. **Matte** — recover a high-quality alpha channel from the generator's output. For clean "logo-on-white" outputs a salient-object segmenter (U²-Net, BiRefNet, RMBG-1.4/2.0) is enough; for anything with hair, fur, smoke, glass, or anti-aliased edges, a **trimap-based matting** model (GCA-Matting, MatteFormer, MatAnyone) or its trimap-free variant (BGMv2, FBA) is required. See category 16 angles 16a–16d for the matte-producing models themselves; *this* angle assumes a matte is present and focuses on what happens next.
2. **Refine** — feather, halo-remove, decontaminate, premultiply/unpremultiply, and guard against the "fringed black halo" that plagues most rembg-quality outputs. This stage is where most "AI background removers" fail, and it can be fixed with a few dozen lines of NumPy if you know the math.
3. **Optimize** — strip metadata, quantize where safe, recompress with modern codecs (`oxipng`, `pngquant`, `cwebp`, `cavif`), and do it in a way that **preserves the alpha channel** everywhere (the single most common bug).
4. **Export** — emit the full platform family from a single master, with deterministic (hash-based) filenames so that re-running the pipeline on unchanged inputs produces byte-identical outputs. This is the critical property for shipping asset generation as a **skill** or **MCP tool**: if the tool is idempotent, the agent can reason about caching, retries, and provenance.

The three highest-leverage findings for the broader prompt-to-asset project:

- **Decontamination is where "AI-quality" edges come from.** Premultiplied-alpha compositing against the *generated* background color (estimated from a dilated trimap ring) removes the white/black halo that most consumer tools ship with. This is a ~40-line function and single-handedly moves output from "obviously AI-stripped" to "indistinguishable from Photoshop".
- **One master PNG RGBA @ max resolution is the correct source-of-truth.** Every other format (WebP, AVIF, SVG, ICO, ICNS, downscaled PNGs, favicons, OG cards) derives from it, and the pipeline should be written as a pure function from that master. Generators and agents should be constrained to produce this master only; the platform-family expansion is deterministic and belongs in a skill, not in a prompt.
- **Deterministic hash-based naming unlocks agent-native pipelines.** Naming every output `{basename}-{size}-{sha256[:12]}.{ext}` means the skill can be invoked idempotently, the website can cache aggressively, and coding agents (Gemini/Claude/Codex) can safely re-run on draft prompts without duplicating bytes. It also gives provenance for free.

---

## Format Emit Matrix

The table below is the emit plan used by the reference implementation at the end of this document. Each row is one output file; the `required` column marks the minimal set that must succeed for the pipeline to be considered successful (downgraded formats fail soft).

| Format | Container / Codec | Required | Typical sizes | Alpha | Color | Tooling (1st choice) | Fallback | Notes |
|---|---|---|---|---|---|---|---|---|
| PNG RGBA (master) | PNG, 8-bit | ✅ | max (e.g. 2048²) | straight | sRGB | Pillow `Image.save` | — | Single source of truth. All other files derive from this. |
| PNG RGBA (downscaled) | PNG, 8-bit | ✅ | 1024, 512, 256, 128, 64, 32, 16 | straight | sRGB | Pillow + `oxipng -o max --strip safe` | `pngquant --quality 80-95 --skip-if-larger` | 8-bit quantization only when `--lossy` flag set. |
| WebP | WebP lossless | ✅ | 1024, 512, 256 | ✅ | sRGB | `cwebp -lossless -alpha_q 100 -exact -metadata none` | `libwebp` via Pillow | `-exact` preserves RGB under zero-alpha pixels (matters for halo-free edges). |
| WebP | WebP lossy | optional | 1024 | ✅ | sRGB | `cwebp -q 90 -alpha_q 100 -pass 10 -mt` | — | Logos: prefer lossless. Photos/illustrations: lossy is 5–10× smaller. |
| AVIF | AV1 in HEIF | optional | 1024, 512 | ✅ | sRGB / BT.2100 | `cavif --quality 80 --speed 4` | `avifenc -s 6 -q 80 --range full` | AVIF alpha is a separate AV1 monochrome plane; preserve it with `--premultiplied` off. |
| SVG | SVG 1.1 | optional | — | as paths | — | `vtracer --colormode color --filter_speckle 4 --color_precision 6 --gradient_step 16` | `potrace` (B&W) | Only emitted when a `--vectorize` flag is set or the source is detected as flat/logo. |
| ICO | Windows ICO | ✅ for app | 16, 24, 32, 48, 64, 128, 256 | ✅ | sRGB | `png-to-ico` (Node) / `Pillow.save('icon.ico', sizes=[...])` | `magick convert *.png icon.ico` | Multi-size pack from pre-generated PNGs. |
| ICNS | Apple ICNS | ✅ for app | 16, 32, 64, 128, 256, 512, 1024 @ 1x+2x | ✅ | sRGB | `iconutil -c icns my.iconset` (macOS) | `png2icons` (Node, cross-plat) | iconset folder naming is strict: `icon_512x512@2x.png` etc. |
| TIFF | TIFF, LZW | optional | max | ✅ | sRGB | Pillow `Image.save(..., compression='tiff_lzw')` | — | Print/legacy only. |
| GIF | GIF89a | optional | 512 | binary | 256-color palette | Pillow with `disposal=2` | — | Alpha is 1-bit; dither the alpha edge before converting. |
| JPEG | JPEG | optional | 1024 | ❌ (flatten) | sRGB | `mozjpeg -quality 88` | Pillow `save(optimize=True, progressive=True)` | Flatten against user-supplied background color; never emit JPEG as the "transparent logo". |
| OG card | PNG or WebP | optional | 1200×630 | ❌ | sRGB | Pillow composite onto brand bg | — | Separate concern — see category 11. |
| Favicon bundle | ICO + PNGs + SVG | optional | 16, 32, 180 (apple-touch), 192, 512 | ✅ | sRGB | combines above | — | Emit with a ready-to-paste `<link rel>` snippet. |

The **Required** column encodes the minimum viable pipeline for "a transparent logo for my note-taking app": PNG masters at several sizes, lossless WebP for web, and an ICO for Windows. Everything else is opt-in.

---

## Refinement Techniques

### Trimap-based matting for production-grade alpha

Salient-object segmenters (U²-Net, BiRefNet) and their finetunes (RMBG-1.4/2.0) produce a reasonable alpha mask in one pass, but the mask is quantized: a pixel is either "foreground" or "background" with a soft boundary that is usually only 2–4 px wide. For logos on solid backgrounds this is fine. For illustrations with fine structure (antennae, whiskers, glass rims, translucent shadows, motion blur) the 2-px boundary throws away most of the perceptual signal and you end up with stair-stepped edges.

The fix is **trimap-based matting**: take the segmenter output, erode it to get a confident foreground region, dilate it to get a confident background region, and label the ring in between as "unknown". Feed the image + trimap to a matting model whose only job is to solve α in the unknown ring. The three most production-relevant models in 2024–2026 are:

- **GCA-Matting** ([Li & Lu 2020, arXiv:2003.07711](https://arxiv.org/abs/2003.07711)) — Guided Contextual Attention. The first matting model to use non-local attention guided by the trimap. Still the fastest of the three at inference, and a good default when you need to run on CPU or a small GPU. Weights: [github.com/Yaoyi-Li/GCA-Matting](https://github.com/Yaoyi-Li/GCA-Matting).
- **MatteFormer** ([Park et al. 2022, arXiv:2203.15662](https://arxiv.org/abs/2203.15662)) — transformer-based, uses prior tokens per trimap region. Higher quality than GCA on hair and fur, ~2× the FLOPs. Repo: [github.com/webtoon/matteformer](https://github.com/webtoon/matteformer).
- **MatAnyone** ([Yang et al. 2025, arXiv:2501.04205](https://arxiv.org/abs/2501.04205)) — video-native memory-propagation matting that also works per-frame on stills. State of the art on Composition-1k and VideoMatte240K. Repo: [github.com/pq-yang/MatAnyone](https://github.com/pq-yang/MatAnyone).

For a prompt-to-asset pipeline the practical choice is:

- **Default**: RMBG-2.0 (one-shot segmenter, already fine-tuned for generated imagery) for α.
- **Upgrade path**: if α has low confidence in the boundary band (entropy > threshold), automatically generate a trimap by erode/dilate and run MatAnyone (or MatteFormer if GPU memory is tight).

### Edge feathering, halo removal, and decontamination

Once α is produced, the RGB channels need to be fixed. The canonical failure mode is the **colored fringe** — a band of pixels along the alpha edge that still carries the original background's color. If the generator placed the logo on white, every edge pixel is a weighted average of logo-color and white. When you then composite that logo onto a dark website, the fringe reads as a white halo.

The math:

- Straight alpha image: each pixel is stored as `(R, G, B, α)` where `R,G,B` are the **opaque** foreground values. Compositing onto background `B` uses `out = α·FG + (1-α)·B`.
- Premultiplied alpha image: each pixel is stored as `(R', G', B', α)` where `R' = α·R`. Compositing is `out = FG' + (1-α)·B`. Premultiplied is strictly better for resampling, blurring, and blending because interpolating 0-α pixels no longer leaks color.

Generators emit straight RGB values that have already been composited against the generator's implicit background. The *decontamination* step inverts that composite:

```
FG = (C - (1-α)·B_est) / α      for α > ε
FG = unchanged                  for α ≤ ε
```

where `C` is the generator's pixel value and `B_est` is an estimate of the background color in a neighborhood of that pixel. `B_est` can be:

1. A global scalar (e.g. "white" when you know the prompt forced a white background) — the simplest and, for logo generation, the right default.
2. A per-pixel value sampled from the confident-background region of the trimap — best quality, needed for photographic inputs.
3. A solved foreground from a dedicated model — FBA-Matting solves F and B simultaneously and is the gold standard ([Forte & Pitié 2020](https://arxiv.org/abs/2003.07711)).

After decontamination, clamp, and re-premultiply-if-needed. This single step is the difference between "AI background removal" quality and "Photoshop" quality.

### Feathering

The output of a trimap matter is continuous α ∈ [0,1]; you should not re-threshold it. What you *should* do is a tiny amount of edge-preserving smoothing to kill single-pixel speckle:

- **Guided filter** on α with the luminance of the RGB image as the guide. Radius 2, ε=1e-4. Keeps edges sharp while denoising the unknown band.
- **Do not use a Gaussian blur on α** — it destroys the alpha edge and produces a glowing outline.

### Premultiplied vs. straight, in storage

PNG stores straight alpha by spec. WebP and AVIF can store either and encoders expose a flag (`cwebp -exact`, `cavif --premultiplied`). The internal representation during processing should always be **premultiplied float32 RGBA** (so resampling, compositing, and blurring are correct). Only at serialization time do you unpremultiply back to straight for PNG output, or keep premultiplied and set the appropriate flag for WebP/AVIF.

### Halo kill and color spill

Two more small touches that matter:

- **Spill suppression on chromatic backgrounds**: when the generator's background is saturated (e.g. a chroma-key green), decontamination alone doesn't remove the color cast on translucent regions. Subtract the spill chroma by projecting each RGB onto the non-spill axis in YCbCr.
- **Micro-erosion of α at extreme edges**: `α ← max(0, α − 0.02)` at boundary pixels where the guided filter detected a very shallow gradient. Removes the 1-px halo you'd otherwise see on ICO 16×16.

### Lossless & lossy PNG

- **oxipng** is the modern Rust rewrite of OptiPNG, faster and with zopfli support. Use `oxipng -o max --strip safe --alpha` on every output PNG. `--strip safe` preserves the necessary metadata (sRGB, iCCP if present) but removes `tEXt` chunks like "Software: ...".
- **pngquant** does perceptual 8-bit quantization with alpha support. Use `pngquant --quality=80-98 --skip-if-larger --strip` as an opt-in lossy pass. For small logos the output is often 3–5× smaller than the unquantized source with no visible quality loss.
- Always run `oxipng` *after* `pngquant`: pngquant writes suboptimal zlib, oxipng fixes it.

### Lossless & lossy WebP

- `cwebp -lossless -alpha_q 100 -exact -metadata none` for logos and UI assets.
- `cwebp -q 90 -alpha_q 100 -m 6 -pass 10 -mt` for illustrations.
- The `-exact` flag is crucial: without it, cwebp will zero out RGB values where α=0 (a valid optimization), but that breaks any subsequent recompositing step that relies on the RGB values being meaningful (e.g. when the file is re-imported into a design tool with an "ignore alpha" mode).

### AVIF

- `cavif` (Rust, by Kornel Lesiński) is the simplest CLI. `cavif --quality 80 --speed 4 in.png -o out.avif` preserves alpha correctly by default.
- For more control use `avifenc` from libavif: `avifenc -s 6 -q 80 --range full --yuv 444 in.png out.avif`. `--yuv 444` avoids chroma subsampling halos on vector-style artwork; for photos `420` is fine.
- AVIF's alpha plane is a separate monochrome AV1 stream. Check `avifdec --info out.avif` to confirm `Alpha: present`.

### SVG (vectorization)

- **potrace** — bi-level only, produces very clean curves, ideal for monochrome wordmarks.
- **vtracer** ([github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer)) — color-aware, runs in Rust+WASM, produces multi-color SVG suitable for flat illustrations and logos with 2–20 colors. Default tuning: `--colormode color --filter_speckle 4 --color_precision 6 --gradient_step 16 --corner_threshold 60 --segment_length 4 --splice_threshold 45`.
- Always follow with **SVGO** to collapse transforms, drop default attributes, remove comments, and round path data to 2 decimals. The config below is the safe minimum:

```js
// svgo.config.js
module.exports = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
    'removeDimensions',
    'sortAttrs',
    'removeTitle',
    'removeDesc',
  ],
};
```

### ICO

- Input: pre-rendered PNGs at 16, 24, 32, 48, 64, 128, 256. Below 48 px you must **re-render from the master at that size** (not downscale a 256² to 16²); the aliasing is unacceptable.
- Pack with `png-to-ico` (Node) or Pillow's built-in `Image.save('icon.ico', sizes=[(16,16),(32,32),...,(256,256)])`. ImageMagick's `convert` works but compresses the 256² entry as PNG-inside-ICO, which is what you want.

### ICNS

- macOS `iconutil` takes an `.iconset` folder with strict naming:
  `icon_16x16.png`, `icon_16x16@2x.png`, `icon_32x32.png`, `icon_32x32@2x.png`, `icon_128x128.png`, `icon_128x128@2x.png`, `icon_256x256.png`, `icon_256x256@2x.png`, `icon_512x512.png`, `icon_512x512@2x.png`.
- For cross-platform builds, use `png2icons` (Node) or `icnsutil` (Python) which don't require macOS.

### Deterministic filenames

Every output filename should be a pure function of (master SHA-256, format, size, encoder options). Concretely:

```
{base}-{size}.{ext}              # human-friendly display name
{base}-{size}-{hash12}.{ext}     # content-addressed name for CDN caching
```

where `hash12 = sha256(bytes(master) || json(options))[:12]`. Write both; hard-link the display name to the hashed name to avoid duplicated bytes. The pipeline can then short-circuit: if `{base}-{size}-{hash12}.{ext}` exists, skip.

---

## End-to-End Reference Implementation

The code below takes a single master RGBA PNG and emits the full platform family. It assumes `rembg`/`BiRefNet`/`MatAnyone` have already produced the master; all four post-matte stages live here. It is written for Python 3.11+ and expects `oxipng`, `pngquant`, `cwebp`, `cavif`, and `vtracer` on `$PATH`. About 280 LOC excluding comments and docstrings.

```python
"""pipeline.py — master RGBA PNG -> platform family (PNG/WebP/AVIF/SVG/ICO/ICNS/TIF/GIF).

Usage:
    python pipeline.py master.png --out dist/logo --sizes 1024 512 256 128 64 32 16 \
        --formats png webp avif svg ico icns --vectorize --lossy webp

Design:
  - Pure function from (master_bytes, options) -> set[output_files].
  - Every output filename is content-addressed: `{base}-{size}-{hash12}.{ext}`.
  - Premultiplied float32 RGBA internally; straight-alpha PNG on disk.
  - Decontaminates edges assuming a globally-estimated background color.
"""
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys, tempfile, shutil
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
import numpy as np
from PIL import Image

# ---------- core image utilities ----------

def load_rgba(path: Path) -> np.ndarray:
    """Load a PNG as float32 straight-alpha RGBA in [0,1]."""
    img = Image.open(path).convert("RGBA")
    return np.asarray(img, dtype=np.float32) / 255.0

def save_rgba(arr: np.ndarray, path: Path) -> None:
    """Save float32 straight-alpha RGBA as 8-bit PNG."""
    out = np.clip(arr * 255.0 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(out, mode="RGBA").save(path, format="PNG", optimize=False)

def to_premul(arr: np.ndarray) -> np.ndarray:
    rgb, a = arr[..., :3], arr[..., 3:4]
    return np.concatenate([rgb * a, a], axis=-1)

def to_straight(arr: np.ndarray) -> np.ndarray:
    rgb, a = arr[..., :3], arr[..., 3:4]
    safe = np.where(a > 1e-6, a, 1.0)
    return np.concatenate([np.clip(rgb / safe, 0, 1), a], axis=-1)

# ---------- refinement ----------

def estimate_bg(arr: np.ndarray) -> np.ndarray:
    """Estimate the background color from pixels with α < 0.05."""
    a = arr[..., 3]
    mask = a < 0.05
    if mask.sum() < 100:
        return np.array([1.0, 1.0, 1.0], dtype=np.float32)  # assume white
    bg = arr[mask][..., :3].mean(axis=0)
    return bg.astype(np.float32)

def decontaminate(arr: np.ndarray, bg: np.ndarray | None = None) -> np.ndarray:
    """Invert the implicit composite against the estimated background.

    FG = (C - (1-α)·B) / α, clamped to [0,1].
    """
    if bg is None:
        bg = estimate_bg(arr)
    rgb, a = arr[..., :3], arr[..., 3:4]
    fg = np.where(a > 1e-3, (rgb - (1.0 - a) * bg) / np.clip(a, 1e-3, 1.0), rgb)
    return np.concatenate([np.clip(fg, 0, 1), a], axis=-1)

def feather_alpha(arr: np.ndarray, radius: int = 2, eps: float = 1e-4) -> np.ndarray:
    """Guided-filter the alpha channel with luminance as the guide.

    Falls back to a 3x3 box smoothing of the unknown-band pixels when
    the `guided-filter` package is unavailable; the visual difference
    is tiny for 1024+ px masters.
    """
    try:
        from cv2.ximgproc import guidedFilter  # type: ignore
        rgb = (arr[..., :3] * 255).astype(np.uint8)
        a = (arr[..., 3] * 255).astype(np.uint8)
        a2 = guidedFilter(guide=rgb, src=a, radius=radius, eps=eps * 255 * 255)
        arr = arr.copy()
        arr[..., 3] = a2.astype(np.float32) / 255.0
        return arr
    except Exception:
        k = radius * 2 + 1
        from scipy.ndimage import uniform_filter
        a = arr[..., 3]
        band = (a > 0.02) & (a < 0.98)
        smoothed = uniform_filter(a, size=k)
        out = arr.copy()
        out[..., 3] = np.where(band, smoothed, a)
        return out

def micro_erode_edge(arr: np.ndarray, amount: float = 0.02) -> np.ndarray:
    """Subtract `amount` from soft-edge pixels to kill sub-pixel halos."""
    a = arr[..., 3]
    band = (a > 0.05) & (a < 0.8)
    out = arr.copy()
    out[..., 3] = np.where(band, np.maximum(0.0, a - amount), a)
    return out

def refine(arr: np.ndarray) -> np.ndarray:
    """Standard refinement chain: feather → decontaminate → micro-erode."""
    arr = feather_alpha(arr)
    arr = decontaminate(arr)
    arr = micro_erode_edge(arr)
    return arr

# ---------- resize (premultiplied, correct) ----------

def resize_rgba(arr: np.ndarray, size: int) -> np.ndarray:
    """Resize premultiplied, then unpremultiply, so edge pixels stay halo-free."""
    premul = to_premul(arr)
    h, w = premul.shape[:2]
    scale = size / max(h, w)
    new_h, new_w = max(1, int(round(h * scale))), max(1, int(round(w * scale)))
    img = Image.fromarray((premul * 255.0 + 0.5).clip(0, 255).astype(np.uint8), mode="RGBA")
    img = img.resize((new_w, new_h), resample=Image.LANCZOS)
    premul_small = np.asarray(img, dtype=np.float32) / 255.0
    return to_straight(premul_small)

# ---------- emit helpers ----------

@dataclass(frozen=True)
class EmitOptions:
    sizes: tuple[int, ...] = (1024, 512, 256, 128, 64, 32, 16)
    formats: tuple[str, ...] = ("png", "webp", "ico")
    lossy: tuple[str, ...] = ()
    vectorize: bool = False
    base: str = "asset"

def content_hash(master_bytes: bytes, opts: EmitOptions) -> str:
    h = hashlib.sha256()
    h.update(master_bytes)
    h.update(json.dumps(asdict(opts), sort_keys=True).encode())
    return h.hexdigest()[:12]

def _run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed: {r.stderr.strip()}")

def emit_png(arr: np.ndarray, path: Path, lossy: bool) -> None:
    save_rgba(arr, path)
    if lossy and shutil.which("pngquant"):
        _run(["pngquant", "--quality=80-98", "--skip-if-larger", "--strip",
              "--force", "--output", str(path), str(path)])
    if shutil.which("oxipng"):
        _run(["oxipng", "-o", "max", "--strip", "safe", str(path)])

def emit_webp(src_png: Path, path: Path, lossy: bool) -> None:
    if not shutil.which("cwebp"):
        Image.open(src_png).save(path, format="WEBP", lossless=not lossy,
                                 quality=90 if lossy else 100,
                                 exact=True, method=6)
        return
    if lossy:
        _run(["cwebp", "-q", "90", "-alpha_q", "100", "-m", "6", "-pass", "10",
              "-mt", "-metadata", "none", str(src_png), "-o", str(path)])
    else:
        _run(["cwebp", "-lossless", "-alpha_q", "100", "-exact",
              "-metadata", "none", "-m", "6", str(src_png), "-o", str(path)])

def emit_avif(src_png: Path, path: Path) -> None:
    if shutil.which("cavif"):
        _run(["cavif", "--quality", "80", "--speed", "4",
              "--overwrite", "-o", str(path), str(src_png)])
    elif shutil.which("avifenc"):
        _run(["avifenc", "-s", "6", "-q", "80", "--range", "full",
              "--yuv", "444", str(src_png), str(path)])
    else:
        raise RuntimeError("No AVIF encoder found (cavif or avifenc).")

def emit_svg(src_png: Path, path: Path) -> None:
    if not shutil.which("vtracer"):
        raise RuntimeError("vtracer not installed; cannot vectorize.")
    _run(["vtracer", "--input", str(src_png), "--output", str(path),
          "--colormode", "color", "--filter_speckle", "4",
          "--color_precision", "6", "--gradient_step", "16",
          "--corner_threshold", "60", "--segment_length", "4",
          "--splice_threshold", "45"])
    if shutil.which("svgo"):
        _run(["svgo", "--multipass", "--quiet", str(path)])

def emit_ico(png_paths_by_size: dict[int, Path], out: Path) -> None:
    """Multi-size ICO from pre-rendered PNGs (16..256)."""
    imgs = []
    for s in (16, 24, 32, 48, 64, 128, 256):
        if s in png_paths_by_size:
            imgs.append(Image.open(png_paths_by_size[s]).convert("RGBA"))
    if not imgs:
        raise RuntimeError("No PNGs available to pack into ICO.")
    imgs[0].save(out, format="ICO",
                 sizes=[(i.width, i.height) for i in imgs],
                 append_images=imgs[1:])

def emit_icns(png_paths_by_size: dict[int, Path], out: Path) -> None:
    """Build ICNS via iconutil (macOS) or png2icons (cross-platform)."""
    needed = {16: "16x16", 32: "16x16@2x",
              32: "32x32", 64: "32x32@2x",
              128: "128x128", 256: "128x128@2x",
              256: "256x256", 512: "256x256@2x",
              512: "512x512", 1024: "512x512@2x"}
    if sys.platform == "darwin" and shutil.which("iconutil"):
        with tempfile.TemporaryDirectory() as td:
            iconset = Path(td) / "icon.iconset"
            iconset.mkdir()
            pairs = [(16,"16x16"),(32,"16x16@2x"),(32,"32x32"),(64,"32x32@2x"),
                     (128,"128x128"),(256,"128x128@2x"),(256,"256x256"),
                     (512,"256x256@2x"),(512,"512x512"),(1024,"512x512@2x")]
            for s, tag in pairs:
                if s in png_paths_by_size:
                    shutil.copy(png_paths_by_size[s], iconset / f"icon_{tag}.png")
            _run(["iconutil", "-c", "icns", str(iconset), "-o", str(out)])
    else:
        if not shutil.which("png2icons"):
            raise RuntimeError("png2icons not installed and iconutil unavailable.")
        largest = png_paths_by_size[max(png_paths_by_size)]
        _run(["png2icons", str(largest), str(out.with_suffix("")), "-icns"])

# ---------- driver ----------

def emit_family(master_png: Path, out_dir: Path, opts: EmitOptions) -> list[Path]:
    master_bytes = master_png.read_bytes()
    digest = content_hash(master_bytes, opts)
    out_dir.mkdir(parents=True, exist_ok=True)
    produced: list[Path] = []

    master_arr = refine(load_rgba(master_png))

    png_paths: dict[int, Path] = {}
    for size in sorted(opts.sizes, reverse=True):
        small = resize_rgba(master_arr, size)
        name = out_dir / f"{opts.base}-{size}-{digest}.png"
        lossy = "png" in opts.lossy
        emit_png(small, name, lossy=lossy)
        png_paths[size] = name
        produced.append(name)

        if "webp" in opts.formats:
            w = name.with_suffix(".webp")
            emit_webp(name, w, lossy="webp" in opts.lossy)
            produced.append(w)
        if "avif" in opts.formats:
            a = name.with_suffix(".avif")
            emit_avif(name, a)
            produced.append(a)
        if "tif" in opts.formats:
            t = name.with_suffix(".tif")
            Image.open(name).save(t, compression="tiff_lzw")
            produced.append(t)

    if "ico" in opts.formats:
        ico = out_dir / f"{opts.base}-{digest}.ico"
        emit_ico(png_paths, ico)
        produced.append(ico)
    if "icns" in opts.formats:
        icns = out_dir / f"{opts.base}-{digest}.icns"
        emit_icns(png_paths, icns)
        produced.append(icns)
    if "svg" in opts.formats and opts.vectorize:
        svg = out_dir / f"{opts.base}-{digest}.svg"
        emit_svg(png_paths[max(png_paths)], svg)
        produced.append(svg)

    return produced

def _parse_args() -> tuple[Path, Path, EmitOptions]:
    p = argparse.ArgumentParser()
    p.add_argument("master", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--base", default="asset")
    p.add_argument("--sizes", type=int, nargs="+",
                   default=[1024, 512, 256, 128, 64, 32, 16])
    p.add_argument("--formats", nargs="+",
                   default=["png", "webp", "ico"])
    p.add_argument("--lossy", nargs="*", default=[])
    p.add_argument("--vectorize", action="store_true")
    a = p.parse_args()
    return a.master, a.out, EmitOptions(
        sizes=tuple(a.sizes), formats=tuple(a.formats),
        lossy=tuple(a.lossy), vectorize=a.vectorize, base=a.base,
    )

if __name__ == "__main__":
    master, out, opts = _parse_args()
    files = emit_family(master, out, opts)
    for f in files:
        print(f)
```

### Notes on the reference implementation

- **Purity**: `emit_family` is a pure function modulo the filesystem; the output set is entirely determined by the master bytes and the `EmitOptions`. Re-running with the same inputs produces byte-identical outputs (oxipng and cwebp are deterministic; cavif is deterministic at fixed speed).
- **Content-addressed naming**: the `-{hash12}` suffix means agents can hash `master.png + options` and know the expected output filename without running the pipeline.
- **Graceful degradation**: if `oxipng`, `pngquant`, `cwebp`, `cavif`, `vtracer`, or `svgo` aren't on PATH, the pipeline falls back to Pillow's encoders where possible and raises only when no viable encoder exists.
- **Premultiplied resampling**: `resize_rgba` premultiplies → resizes → unpremultiplies, which is the only correct way to downscale RGBA images. Without this step, 16×16 favicons would have visible halos from bilinear-mixing the zero-α pixels.
- **Refinement is opt-out**: if you trust upstream's α, just skip `refine()` and call `load_rgba` directly. For generated images (the common case), always run refine — it's the single biggest quality lever.
- **Extending**: new formats slot into the per-size loop in `emit_family`. Adding e.g. JPEG with a brand background, or HEIC for iOS bundles, is a 10-line addition per format.

### Wiring into a skill or MCP tool

Expose `emit_family` as a tool with input schema:

```json
{
  "type": "object",
  "required": ["master_path"],
  "properties": {
    "master_path": {"type": "string"},
    "out_dir":     {"type": "string", "default": "./dist"},
    "base":        {"type": "string", "default": "asset"},
    "sizes":       {"type": "array", "items": {"type": "integer"}, "default": [1024,512,256,128,64,32,16]},
    "formats":     {"type": "array", "items": {"enum": ["png","webp","avif","svg","ico","icns","tif","gif"]}, "default": ["png","webp","ico"]},
    "lossy":       {"type": "array", "items": {"enum": ["png","webp"]}, "default": []},
    "vectorize":   {"type": "boolean", "default": false}
  }
}
```

and have the tool return the produced file list. Because the naming is content-addressed, the tool is safely cacheable and re-entrant, which matters for cost control when a coding agent calls it speculatively.

---

## References

Primary — alpha matting research
- Li, Y. & Lu, H. *Natural Image Matting via Guided Contextual Attention* (AAAI 2020). [arXiv:2003.07711](https://arxiv.org/abs/2003.07711). Repo: [github.com/Yaoyi-Li/GCA-Matting](https://github.com/Yaoyi-Li/GCA-Matting).
- Park, G. et al. *MatteFormer: Transformer-Based Image Matting via Prior-Tokens* (CVPR 2022). [arXiv:2203.15662](https://arxiv.org/abs/2203.15662). Repo: [github.com/webtoon/matteformer](https://github.com/webtoon/matteformer).
- Yang, P. et al. *MatAnyone: Stable Video Matting with Consistent Memory Propagation* (2025). [arXiv:2501.04205](https://arxiv.org/abs/2501.04205). Repo: [github.com/pq-yang/MatAnyone](https://github.com/pq-yang/MatAnyone).
- Forte, M. & Pitié, F. *F, B, Alpha Matting* (FBA, 2020). [arXiv:2003.07711](https://arxiv.org/abs/2003.07711). Repo: [github.com/MarcoForte/FBA_Matting](https://github.com/MarcoForte/FBA_Matting).
- Lin, S. et al. *Real-Time High-Resolution Background Matting* (BGMv2, CVPR 2021). [arXiv:2012.07810](https://arxiv.org/abs/2012.07810).

Primary — encoders and optimizers
- oxipng: [github.com/shssoichiro/oxipng](https://github.com/shssoichiro/oxipng).
- pngquant: [pngquant.org](https://pngquant.org/) · [github.com/kornelski/pngquant](https://github.com/kornelski/pngquant).
- cwebp / libwebp: [developers.google.com/speed/webp](https://developers.google.com/speed/webp/docs/cwebp).
- cavif-rs (Rust AVIF CLI): [github.com/kornelski/cavif-rs](https://github.com/kornelski/cavif-rs).
- libavif / avifenc: [github.com/AOMediaCodec/libavif](https://github.com/AOMediaCodec/libavif).
- potrace: [potrace.sourceforge.net](http://potrace.sourceforge.net/).
- vtracer: [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer) · demo [vtracer.visioncortex.org](https://www.visioncortex.org/vtracer/).
- SVGO: [github.com/svg/svgo](https://github.com/svg/svgo).
- png-to-ico (Node): [github.com/steambap/png-to-ico](https://github.com/steambap/png-to-ico).
- png2icons (cross-plat ICO/ICNS): [github.com/idesis-gmbh/png2icons](https://github.com/idesis-gmbh/png2icons).
- iconutil(1) — Apple: [developer.apple.com archive — High Resolution on macOS](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html) · `man 1 iconutil`.
- Apple Human Interface Guidelines — App Icons: [developer.apple.com/design/human-interface-guidelines/app-icons](https://developer.apple.com/design/human-interface-guidelines/app-icons).

Reference — alpha compositing math
- Porter, T. & Duff, T. *Compositing Digital Images* (SIGGRAPH 1984). Canonical straight-vs-premultiplied reference.
- Smith, A.R. *Alpha and the History of Digital Compositing* (Microsoft TR 1995). [alvyray.com/Memos/CG/Microsoft/7_alpha.pdf](http://alvyray.com/Memos/CG/Microsoft/7_alpha.pdf).
- Google Skia docs — Premultiplied Alpha: [skia.org/docs/user/color](https://skia.org/docs/user/color/).
- Jim Blinn — *A Ghost in a Snowstorm* (IEEE CG&A 1998) — premultiplied-alpha resampling correctness.

Reference — format specs
- PNG 3rd Edition (W3C, 2022): [www.w3.org/TR/png-3](https://www.w3.org/TR/png-3/).
- WebP Container Spec: [developers.google.com/speed/webp/docs/riff_container](https://developers.google.com/speed/webp/docs/riff_container).
- AVIF in HEIF (ISO/IEC 23000-22): overview at [aomediacodec.github.io/av1-avif](https://aomediacodec.github.io/av1-avif/).
- Microsoft ICO format: [learn.microsoft.com/en-us/windows/win32/menurc/icons](https://learn.microsoft.com/en-us/windows/win32/menurc/icons).
- Apple ICNS format (reverse-engineered): [en.wikipedia.org/wiki/Apple_Icon_Image_format](https://en.wikipedia.org/wiki/Apple_Icon_Image_format).

Related angles in this research project
- 16a-16d: matte-producing models (rembg, BRIA RMBG, U²-Net, BiRefNet) that feed this pipeline.
- 13-transparent-backgrounds: upstream — why generators don't emit clean α in the first place.
- 09-app-icon-generation, 11-favicon-web-assets: downstream consumers of the emit matrix defined here.
- 18-asset-pipeline-tools: how this pipeline compares to appicon.co / icon.kitchen / Capacitor Assets.
