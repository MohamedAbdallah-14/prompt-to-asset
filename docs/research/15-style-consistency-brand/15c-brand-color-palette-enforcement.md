---
category: 15-style-consistency-brand
angle: 15c
title: "Brand Color Enforcement: Recraft color API, IP-Adapter color, post-generation palette remap, LUTs"
slug: 15c-brand-color-palette-enforcement
status: draft
wave: 3
author: subagent-15c
date: 2026-04-19
tags:
  - brand-colors
  - palette-enforcement
  - recraft
  - ip-adapter
  - kmeans
  - deltaE2000
  - reinhard
  - 3d-lut
  - color-quantization
primary_sources:
  - https://www.recraft.ai/docs/api-reference/endpoints
  - https://recraft.ai/docs/using-recraft/color-palettes/using-color-palettes-in-generation
  - https://huggingface.co/docs/diffusers/main/en/using-diffusers/ip_adapter
  - https://github.com/jrosebr1/color_transfer
  - https://pillow-lut-tools.readthedocs.io/
  - https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
---

# Brand Color Enforcement (Angle 15c)

## Executive Summary

Text-to-image models do **not** natively honor hex codes. Telling Gemini, Imagen,
DALL·E, or SDXL that "the primary color is `#1E6FFF`" biases the output toward
"blue", but the generated pixels routinely land 10–40 ΔE away from the target in
CIELAB space — unacceptable for any brand system whose tolerance is typically
ΔE ≤ 2 on primary marks. To ship on-brand assets reliably we need a
**layered approach**: (1) a generator that accepts explicit palette
conditioning, (2) post-generation palette remapping for the colors the model
still drifts on, and (3) automated ΔE2000 validation before the asset is
released to downstream pipelines.

Among current generators, **Recraft v3** was the first major API to expose
a first-class `controls.colors` array of RGB triplets.

> **Updated 2026-04-21:** **Recraft V4** (released February 2026) also supports `controls.colors` (RGB triplets and `background_color`), so the palette-enforcement feature is now available on both V3 and V4. However, **custom `style_id` (brand style) is not supported in V4** — it remains V3/V3 Vector only. V4 offers superior base generation quality but no trained brand-style anchor; for palette enforcement alone (without a custom style ID), V4 is preferred. Sources: [Recraft API docs](https://www.recraft.ai/docs/api-reference/styles), [Cloudflare Recraft V4 docs](https://developers.cloudflare.com/ai/models/recraft/recraftv4/). For open pipelines (SDXL / Flux),
**IP-Adapter conditioning on a 3×N swatch image** is the best prompt-time nudge
but is statistical, not exact. For everything else — including Gemini, DALL·E,
Midjourney, and even Recraft outputs that still drift — the reliable answer is a
**post-process remap** using K-means clustering in LAB space plus ΔE2000
nearest-palette lookup, optionally followed by a **3-D LUT** baked from the
brand palette. For photographic or illustrated backgrounds we layer
**Reinhard color transfer** on top so we only push global statistics, not
individual pixels, keeping natural gradients intact.

The key operational insight is that **"enforcement" is a validation problem,
not a generation problem**. No matter which generator we pick, the final gate
must be: extract the top-N dominant colors from the asset, compute ΔE2000 to
the nearest brand palette color, and fail the asset if any dominant cluster is
above threshold. Once we have that gate, we can pick the cheapest generator
that passes it instead of fighting the model.

## Enforcement Options, Ranked by Fidelity

| Rank | Technique | Where it runs | Typical ΔE2000 vs target | Fidelity | Destroys anti-aliasing? | Notes |
|---|---|---|---|---|---|---|
| 1 | **Post-process nearest-palette remap in LAB** (K-means → ΔE2000 swap) on a vector/flat illustration | CPU post | ~0 (exact hex) | Exact | **Yes** on raster; no on true SVG | The only technique that guarantees hex accuracy. Combine with edge-aware remap (only remap pixels whose cluster assignment is confident) to protect anti-aliased edges. |
| 2 | **Regenerate at vector level with Recraft**, then edit the SVG `fill=""` attributes programmatically to brand hex | Recraft API + svg parsing | 0 | Exact | No | Best for logos/icons. See `15-style-consistency-brand/15a`. |
| 3 | **Recraft v3/v4 `controls.colors`** (RGB triplets) + full raster/vector output | Recraft API | 1–5 most runs | High | No | Both V3 and V4 support `controls.colors`; V4 offers better quality but no custom `style_id`. |
| 4 | **3-D LUT bake** from a reference palette + apply to any image | Pillow-LUT / libvips | 2–8 | Good for photographic | No (smooth) | Preserves gradients, ideal for illustrations & photography. |
| 5 | **Reinhard color transfer** from a "hero on-brand" reference | `color_transfer` | 3–10 | Moderate | No | Photographic only; good for backgrounds. |
| 6 | **IP-Adapter color-palette swatch** conditioning | SD/SDXL/Flux local | 5–15 | Moderate | No | Biases generation; not exact. |
| 7 | **Prompt-only hex instruction** ("#1E6FFF") | Any | 10–40+ | Low | No | Do not rely on this alone. |
| 8 | **HSV hue-shift for monochrome logos** | PIL/numpy | ~0 for hue; ΔL can drift | High on single-color marks | No | Cheap trick for one-color logos only. |

## 1. Generation-Time Enforcement

### 1.1 Recraft v3 `controls.colors` (the primary lever)

Recraft's `/v1/images/generations` endpoint accepts an `extra_body.controls`
object whose `colors` field is an array of `{"rgb": [r, g, b]}` objects with
each channel `0..255`. The model is trained to use these as preferred
colors during generation; internal testing reported on the Recraft blog and
docs shows strong adherence for vector and icon outputs and moderate
adherence for photorealistic outputs. The call looks like:

```python
from openai import OpenAI

client = OpenAI(base_url="https://external.api.recraft.ai/v1",
                api_key=os.environ["RECRAFT_API_KEY"])

BRAND_PALETTE_RGB = [(30, 111, 255), (11, 19, 43), (245, 247, 250)]

response = client.images.generate(
    model="recraftv3",
    prompt="minimal flat illustration of a notebook icon, on white",
    size="1024x1024",
    extra_body={
        "style": "vector_illustration",
        "controls": {
            "colors": [{"rgb": list(c)} for c in BRAND_PALETTE_RGB],
        },
    },
)
```

**Best practices gathered from the Recraft docs and blog posts:**

- Pass 2–5 colors, ordered most-important first. Passing 10+ dilutes each.
- For monochrome brand marks, pass *only* the primary brand color plus a
  neutral background color — the model will stop inventing accents.
- Combine with `style="vector_illustration"` or `style_id=<custom>` so the
  model biases toward flat fills (easier to remap later if needed).
- The `controls.colors` param is orthogonal to `style_id` — you can stack a
  custom-uploaded style reference *and* a hex palette. This is the single
  highest-fidelity generation-time setup available today.

### 1.2 IP-Adapter Color Conditioning (SD/SDXL/Flux)

For open-weights pipelines, IP-Adapter's image-encoder cross-attention lets us
pass a **palette swatch image** alongside the text prompt. Construct the swatch
as a horizontal strip of the brand palette at equal weight (e.g. a 512×128 PNG
with each hex filling a column) and load it with `set_ip_adapter_scale(0.4)` —
high enough to bias the color distribution, low enough that the text prompt
still controls subject and composition.

```python
from diffusers import StableDiffusionXLPipeline
from diffusers.utils import load_image
import torch

pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16,
).to("cuda")
pipe.load_ip_adapter(
    "h94/IP-Adapter", subfolder="sdxl_models",
    weight_name="ip-adapter_sdxl.safetensors",
)
pipe.set_ip_adapter_scale(0.4)

swatch = load_image("brand_palette_swatch.png")
image = pipe(
    prompt="a flat illustration of an empty-state character waving, minimal",
    ip_adapter_image=swatch,
    num_inference_steps=30, guidance_scale=6.0,
).images[0]
```

Known limitations: IP-Adapter globally biases hue/saturation but does not
lock exact hex — expect ΔE2000 of 5–15 on primary regions. Always chase it
with a post-process remap.

### 1.3 Prompt-only hex instruction

Including hex codes in prompts (`"primary color #1E6FFF, accent #0B132B"`)
provides weak signal to Imagen, Gemini, DALL·E, and Midjourney. It is better
than nothing and costs nothing, but do not treat the output as on-brand until
it passes the ΔE2000 validation step in §4.

## 2. Post-Process Palette Remap (the reliable fallback)

This is the technique we should apply to **every** asset before we ship it,
regardless of generator. The pipeline:

1. Downsample the image to speed up clustering.
2. Cluster pixels with K-means (k = 6–12) in LAB space.
3. For each cluster centroid, find the nearest brand palette entry using
   ΔE2000 as the distance metric.
4. Replace each pixel with the hex of the brand palette entry whose centroid
   it was assigned to.
5. Optionally smooth boundaries (edge-aware blend) to preserve anti-aliasing.

Full reference implementation using `scikit-image`, `scikit-learn`, and
`colormath`:

```python
"""palette_remap.py — brand-palette enforcement via K-means + ΔE2000."""
from __future__ import annotations

import numpy as np
from PIL import Image
from sklearn.cluster import MiniBatchKMeans
from skimage import color as skcolor

try:
    from colormath.color_objects import LabColor
    from colormath.color_diff import delta_e_cie2000
    HAVE_COLORMATH = True
except ImportError:
    HAVE_COLORMATH = False


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))  # type: ignore


def _rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """rgb uint8 [..., 3] -> Lab float [..., 3]."""
    return skcolor.rgb2lab(rgb.astype(np.float32) / 255.0)


def _delta_e2000_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Vectorized ΔE2000 between Lab arrays a (N,3) and b (M,3) -> (N,M).

    Falls back to colormath per-pair if scikit-image lacks deltaE_ciede2000.
    """
    if hasattr(skcolor, "deltaE_ciede2000"):
        a_b = np.repeat(a[:, None, :], b.shape[0], axis=1)
        b_b = np.repeat(b[None, :, :], a.shape[0], axis=0)
        return skcolor.deltaE_ciede2000(a_b, b_b)
    assert HAVE_COLORMATH, "install scikit-image>=0.19 or colormath"
    out = np.zeros((a.shape[0], b.shape[0]))
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i, j] = delta_e_cie2000(
                LabColor(*ai), LabColor(*bj),
            )
    return out


def remap_to_palette(
    image: Image.Image,
    brand_hex: list[str],
    *,
    k: int = 8,
    protect_alpha: bool = True,
    max_delta_e_flag: float = 5.0,
    preserve_neutrals: bool = True,
) -> tuple[Image.Image, dict]:
    """Remap image colors to the nearest brand-palette entry in LAB space.

    Returns (remapped_image, diagnostics). Diagnostics include per-cluster
    ΔE2000 and any pixel clusters flagged as out-of-gamut (> max_delta_e_flag).
    """
    rgba = image.convert("RGBA")
    arr = np.asarray(rgba)
    h, w, _ = arr.shape
    rgb = arr[..., :3].reshape(-1, 3)
    alpha = arr[..., 3].reshape(-1)

    mask = alpha > 0 if protect_alpha else np.ones_like(alpha, dtype=bool)
    pixels = rgb[mask]

    if pixels.size == 0:
        return rgba, {"empty": True}

    lab = _rgb_to_lab(pixels)
    km = MiniBatchKMeans(n_clusters=min(k, len(pixels)), n_init=4,
                        random_state=0, batch_size=4096)
    labels = km.fit_predict(lab)
    centroids_lab = km.cluster_centers_

    palette_rgb = np.array([_hex_to_rgb(h) for h in brand_hex],
                           dtype=np.uint8)
    palette_lab = _rgb_to_lab(palette_rgb)

    if preserve_neutrals:
        # pin near-white and near-black clusters to the palette's extremes
        palette_lab = _extend_with_neutrals(palette_rgb, palette_lab)
        palette_rgb = _extend_rgb_with_neutrals(palette_rgb)

    d = _delta_e2000_matrix(centroids_lab, palette_lab)
    assign = d.argmin(axis=1)
    cluster_delta_e = d.min(axis=1)

    remapped_pixels = palette_rgb[assign[labels]]
    out_rgb = rgb.copy()
    out_rgb[mask] = remapped_pixels

    out = np.concatenate([out_rgb, alpha[:, None]], axis=1).reshape(h, w, 4)

    return (Image.fromarray(out.astype(np.uint8), mode="RGBA"),
            {
                "cluster_delta_e": cluster_delta_e.tolist(),
                "out_of_gamut_clusters": int((cluster_delta_e > max_delta_e_flag).sum()),
                "assign": assign.tolist(),
            })


def _extend_with_neutrals(rgb: np.ndarray, lab: np.ndarray) -> np.ndarray:
    extras_rgb = np.array([[255, 255, 255], [0, 0, 0]], dtype=np.uint8)
    extras_lab = _rgb_to_lab(extras_rgb)
    return np.concatenate([lab, extras_lab], axis=0)


def _extend_rgb_with_neutrals(rgb: np.ndarray) -> np.ndarray:
    extras_rgb = np.array([[255, 255, 255], [0, 0, 0]], dtype=np.uint8)
    return np.concatenate([rgb, extras_rgb], axis=0)


if __name__ == "__main__":
    import sys
    src, dst = sys.argv[1], sys.argv[2]
    brand = ["#1E6FFF", "#0B132B", "#F5F7FA"]
    img = Image.open(src)
    out, diag = remap_to_palette(img, brand, k=8)
    out.save(dst)
    print(diag)
```

### 2.1 Limits of hard remapping

The technique above is brutal on **anti-aliased edges**: a semi-transparent
blend between foreground and background becomes a hard palette edge. Two
mitigations:

- **Alpha-preserving remap** (`protect_alpha=True` above): keep the original
  alpha channel, only remap opaque pixels, and composite against a
  brand-neutral background before re-aliasing.
- **Edge-aware blending**: compute a confidence score per pixel
  (distance-to-second-nearest-centroid). Where confidence is low, blend the
  two candidate palette colors in proportion to that distance. This gives
  soft edges between palette regions, though it introduces off-palette
  colors in the transition band.
- **Gradient palettes**: define gradients as *pairs* of palette entries
  (`primary`→`primary-dark`) and skip remap for pixels whose cluster sits
  on the line between them in LAB space.

### 2.2 HSV hue-shift for monochrome logos

For single-color (two-tone) logos drifting off brand hue, a global HSV
hue-rotation + saturation/value clamp is cheaper and less destructive than
K-means remap:

```python
import numpy as np
from PIL import Image

def hue_shift_to_target(img: Image.Image, target_hex: str) -> Image.Image:
    import colorsys
    r, g, b = int(target_hex[1:3], 16), int(target_hex[3:5], 16), int(target_hex[5:7], 16)
    target_h, target_s, target_v = colorsys.rgb_to_hsv(r/255, g/255, b/255)

    rgba = np.asarray(img.convert("RGBA")).astype(np.float32) / 255.0
    rgb, a = rgba[..., :3], rgba[..., 3:]

    maxc = rgb.max(-1); minc = rgb.min(-1)
    v = maxc; s = np.where(maxc > 0, (maxc - minc) / (maxc + 1e-9), 0)

    out_rgb = np.stack([
        target_h * np.ones_like(v), s * target_s / max(target_s, 1e-6), v,
    ], axis=-1)
    from matplotlib.colors import hsv_to_rgb
    out = np.concatenate([hsv_to_rgb(out_rgb), a], axis=-1)
    return Image.fromarray((out * 255).astype(np.uint8), "RGBA")
```

## 3. LUT Pipeline (for gradients and photographic content)

Hard remap destroys subtle gradients. A **3-D LUT** built from the brand
palette applies a smooth transform that pulls every color toward the palette
while preserving local continuity. Pipeline:

1. Build an identity 33×33×33 LUT.
2. For each LUT input RGB, find nearest brand palette entry in LAB.
3. Blend the identity color toward the brand entry by `(1 - ΔE / ΔE_max)`
   so small drifts get pulled strongly, large drifts get pulled weakly
   (preserves semantic colors unrelated to the brand, e.g. skin tones).
4. Save as a `.cube` file.
5. Apply with Pillow-LUT at runtime.

```python
from pillow_lut import load_cube_file, sample_lut_cubic
from PIL import Image
import numpy as np
from skimage import color as skcolor


def build_brand_lut(brand_hex: list[str], size: int = 33, strength: float = 0.6) -> np.ndarray:
    palette_rgb = np.array([
        [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)] for h in brand_hex
    ], dtype=np.float32) / 255.0
    palette_lab = skcolor.rgb2lab(palette_rgb[None, :, :])[0]

    grid = np.linspace(0, 1, size)
    r, g, b = np.meshgrid(grid, grid, grid, indexing="ij")
    rgb = np.stack([r, g, b], axis=-1)
    lab = skcolor.rgb2lab(rgb)

    flat_lab = lab.reshape(-1, 3)
    dists = skcolor.deltaE_ciede2000(
        flat_lab[:, None, :].repeat(len(palette_lab), 1),
        palette_lab[None, :, :].repeat(len(flat_lab), 0),
    )
    idx = dists.argmin(axis=1)
    min_d = dists.min(axis=1)
    target = palette_rgb[idx]
    weight = strength * np.clip(1.0 - (min_d / 40.0), 0, 1)[:, None]
    out = (1 - weight) * rgb.reshape(-1, 3) + weight * target
    return out.reshape(size, size, size, 3)


def save_cube(lut: np.ndarray, path: str) -> None:
    s = lut.shape[0]
    with open(path, "w") as f:
        f.write(f"LUT_3D_SIZE {s}\n")
        for b in range(s):
            for g in range(s):
                for r in range(s):
                    rr, gg, bb = lut[r, g, b]
                    f.write(f"{rr:.6f} {gg:.6f} {bb:.6f}\n")


def apply_lut(img_path: str, cube_path: str, out_path: str) -> None:
    lut = load_cube_file(cube_path)
    img = Image.open(img_path).convert("RGB")
    out = img.filter(lut)
    out.save(out_path)
```

**Node.js note:** Sharp does not yet expose libvips' `maplut` operation for
3-D LUTs (open issue `lovell/sharp#1441` as of 2024), so in our Node-side
pipeline we either (a) shell out to ImageMagick's `-hald-clut`, or
(b) round-trip through Python for the LUT apply step. For simple grading
transforms we bake a Hald image with `pillow-lut` and apply it from Sharp via
`composite` with a custom blend, but this is lower quality than true
LUT interpolation.

### 3.1 Reinhard color transfer (photographic backgrounds only)

For photographic or illustrative content where we don't want to touch the
subject but we do want the overall palette to feel on-brand, apply
Reinhard statistics transfer in LAB space using a **reference image that is
itself on-brand** (e.g. your hero marketing image). This moves the mean
and standard deviation of each channel toward the reference:

```python
from color_transfer import color_transfer
import cv2

src = cv2.imread("generated_hero.png")
ref = cv2.imread("brand_reference.png")
out = color_transfer(ref, src, clip=True, preserve_paper=True)
cv2.imwrite("generated_hero_brand.png", out)
```

Reinhard is only appropriate for content with **natural gradients and
textures** — use it for photography and painterly illustrations, not
logos or icons (where hard palette remap is correct).

## 4. Validation

Validation is the linchpin that makes any of the above techniques trustworthy.

```python
def validate_palette(
    img: Image.Image, brand_hex: list[str], *,
    top_n: int = 6, threshold: float = 3.0,
) -> dict:
    """Return a pass/fail dict including per-cluster ΔE2000 to brand palette."""
    from sklearn.cluster import MiniBatchKMeans
    from skimage import color as skcolor
    import numpy as np

    rgba = np.asarray(img.convert("RGBA"))
    opaque = rgba[rgba[..., 3] > 0][:, :3]
    if opaque.size == 0:
        return {"pass": False, "reason": "fully transparent"}

    lab = skcolor.rgb2lab(opaque.astype(np.float32).reshape(-1, 1, 3) / 255.0).reshape(-1, 3)
    km = MiniBatchKMeans(n_clusters=min(top_n, len(lab)), random_state=0).fit(lab)

    palette_rgb = np.array([
        [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)] for h in brand_hex
    ], dtype=np.uint8)
    palette_lab = skcolor.rgb2lab(palette_rgb.astype(np.float32).reshape(-1, 1, 3) / 255.0).reshape(-1, 3)

    d = skcolor.deltaE_ciede2000(
        km.cluster_centers_[:, None, :].repeat(len(palette_lab), 1),
        palette_lab[None, :, :].repeat(len(km.cluster_centers_), 0),
    )
    min_d = d.min(axis=1)
    worst = float(min_d.max())
    mean = float(min_d.mean())

    return {
        "pass": worst <= threshold,
        "worst_cluster_delta_e": worst,
        "mean_cluster_delta_e": mean,
        "threshold": threshold,
        "per_cluster": min_d.tolist(),
    }
```

### Tolerances in practice

| Asset type | Target ΔE2000 on primary cluster | Notes |
|---|---|---|
| Logo / app icon primary fill | ≤ 1.0 | Treat > 1 as hard fail; regenerate or remap. |
| Secondary UI illustration fill | ≤ 2.5 | Humans cannot distinguish ≤ 2 in most contexts. |
| Marketing hero background | ≤ 5.0 | Allow more drift on photographic/gradient regions. |
| Social/OG image backgrounds | ≤ 5.0 | Foreground text/logo must be ≤ 1.0. |

### Out-of-gamut flags

Flag as "out of gamut" any cluster whose nearest brand-palette ΔE2000 is
> 10 — these are colors the model invented that are nowhere on-brand. Pipe
such assets back to (a) regeneration with stronger palette bias, (b) hard
remap, or (c) human review.

## 5. Recommended Pipeline (combined)

For the prompt-to-asset product, the default brand-asset generation pipeline
should be:

1. **If target is a flat/vector asset:** prefer Recraft V3 or V4 with `controls.colors` populated from the brand palette. Use `style_id` for additional visual-style anchoring (V3/V3 Vector only — `style_id` is not supported in V4 as of April 2026).
2. **If target is an illustration/photograph:** use the preferred generator
   (Imagen 4 / SDXL / Flux), optionally with IP-Adapter palette conditioning.
3. **Validate** with `validate_palette()` at threshold 3.0. If pass → ship.
4. **If fail and asset is vector-friendly:** run K-means+ΔE2000 hard remap
   (§2). Re-validate at threshold 1.0. Ship or fail hard.
5. **If fail and asset has gradients/photo:** apply a brand 3-D LUT (§3) at
   moderate strength. Re-validate at threshold 3.0. Ship.
6. **If still fail:** escalate (regenerate with stronger constraints or
   require human review).

This staged pipeline minimizes destructive edits (we only remap when
generation failed) while guaranteeing a measurable ΔE2000 contract on every
shipped asset.

## References

- Recraft API reference — endpoints, `controls.colors`: https://www.recraft.ai/docs/api-reference/endpoints
- Recraft palette generation guide: https://recraft.ai/docs/using-recraft/color-palettes/using-color-palettes-in-generation
- Recraft blog — "How to generate AI images in specific colors": https://recraft.ai/blog/how-to-generate-ai-images-in-specific-colors
- Diffusers IP-Adapter docs: https://huggingface.co/docs/diffusers/main/en/using-diffusers/ip_adapter
- `jrosebr1/color_transfer` (Reinhard Python implementation, 519★): https://github.com/jrosebr1/color_transfer
- `dstein64/colortrans` (Reinhard + histogram + PCA transfer): https://github.com/dstein64/colortrans
- `reinhard-color-transfer` on PyPI: https://pypi.org/project/reinhard-color-transfer/
- Pillow-LUT-tools docs (3-D LUT in Python): https://pillow-lut-tools.readthedocs.io/
- Sharp `maplut` feature request (Node.js 3-D LUT gap): https://github.com/lovell/sharp/issues/1441
- CIEDE2000 reference: https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
- scikit-image `deltaE_ciede2000`: https://scikit-image.org/docs/stable/api/skimage.color.html#skimage.color.deltaE_ciede2000
- scikit-learn `MiniBatchKMeans`: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MiniBatchKMeans.html
- `palette-remap` PyPI package (CLI + lib for palette remap): https://pypi.org/project/palette-remap/0.1.0/
- Real-time K-means + LAB + ΔE2000 palette extractor walkthrough: https://dev.to/ertugrulmutlu/real-time-image-color-palette-extractor-a-deep-dive-into-k-means-lab-and-de2000-4eoi
- Santopaolo — automated ΔE color correction for AI fashion photography: https://genmind.ch/posts/DeltaE-Automated-Color-Correction-for-AI-Generated-Fashion-Photography/
- Reinhard et al., "Color Transfer between Images", IEEE CG&A 2001: https://www.cs.tau.ac.il/~turkel/imagepapers/ColorTransfer.pdf
