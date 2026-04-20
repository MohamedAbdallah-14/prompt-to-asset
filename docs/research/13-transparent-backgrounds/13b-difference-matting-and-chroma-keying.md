---
category: 13-transparent-backgrounds
angle: 13b
title: "Workaround Pipelines for RGBA: Triangulation Matting, Difference Matting, Chroma Keying, and Solid-Background Removal"
subagent: 13b
date: 2026-04-19
primary_sources:
  - "Smith & Blinn, 'Blue Screen Matting', SIGGRAPH 1996"
  - "Julien De Luca (Jidefr), 'Generating Transparent Background Images with Nano Banana Pro 2', Medium, Dec 2025"
  - "Julien De Luca, 'Nano Banana 2 with Transparency on Replicate', Medium, Mar 2026"
  - "PyMatting library (pymatting.github.io)"
  - "OpenAI Images API (gpt-image-1 `background` parameter)"
  - "FireRedTeam/LayerDiffuse-Flux"
related_angles:
  - 13a (native RGBA models & checker problem)
  - 16 (background removal / BiRefNet / rembg)
keywords:
  - triangulation matting
  - difference matting
  - chroma key
  - Smith-Blinn 1996
  - premultiplied alpha
  - Nano Banana Pro 2
  - gpt-image-1 transparent
  - LayerDiffuse
---

# Workaround Pipelines for RGBA: Triangulation Matting, Difference Matting, Chroma Keying, and Solid-Background-Then-Remove

## Executive Summary

Most frontier text-to-image models (Midjourney, Imagen/Gemini's "Nano Banana" family, Flux.1 [dev]/[pro], SDXL base) emit flat RGB — no alpha channel. When a user prompts for "transparent background", they receive one of three failure modes documented in 13a: (a) a checkerboard pattern burned into RGB, (b) a solid white/grey backdrop, or (c) an invented backdrop the model thought looked "neutral". Only a small set of pipelines currently produce true RGBA: OpenAI's `gpt-image-1` family with `background="transparent"`, the LayerDiffuse LoRA+VAE stack for SDXL and Flux, Recraft's vector endpoints, and Adobe Firefly's transparent-PNG toggle.

For every other model — including the ones users most often reach for — the practical answer is a **compositing workaround pipeline**. This document catalogs four such workarounds, in increasing order of fidelity:

1. **Chroma keying** (prompt a solid `#00FF00` backdrop, strip with `cv2.inRange`). Cheapest. Fails on anti-aliased edges, semi-transparency, and green-tinted subjects.
2. **Solid-background-then-remove** (prompt a clean white/grey backdrop, run rembg/BiRefNet/BRIA RMBG). Robust for opaque subjects. Binary-ish masks; fails on glass, smoke, hair, soft shadows.
3. **Difference (two-color) matting** — the practical consumer-grade version of Smith & Blinn's 1996 triangulation technique. Generate the same subject on pure white (`#FFFFFF`) and pure black (`#000000`), then solve for per-pixel alpha from the color delta: `α = 1 − ‖c_white − c_black‖ / ‖white − black‖`. Recovers true semi-transparency and soft shadows.
4. **Full triangulation matting** (Smith & Blinn 1996, Theorem 4). Generalizes (3) to two *arbitrary* backings as long as they differ everywhere. Solves the overdetermined linear system in least-squares form. Needed only when white/black is infeasible (e.g., prompt adherence issues on pure black).

The critical discovery of 2025 is that **modern image-editing models (Gemini 2.5/3 Flash Image, gpt-image-1 edit endpoint, Flux.1 Fill) can be coerced into preserving a subject pixel-for-pixel while only swapping the backdrop.** This is the missing ingredient that makes Smith & Blinn's 1996 technique — originally designed for locked-off film cameras with pin-registration — viable for AI-generated art. Julien De Luca's Dec 2025 Medium post and his two Replicate models (`jide/nano-banana-2-transparent`, `jide/nano-banana-2-bg-remove`, Mar 2026) are the canonical public demonstrations.

**Top recommendation for a production asset pipeline:** use native RGBA when available (`gpt-image-1` with `background="transparent"`, LayerDiffuse-Flux, Recraft). When the user demands a specific non-RGBA model for its aesthetic (Nano Banana Pro 2, Midjourney v7), fall back to **difference matting via the model's edit endpoint** — 2× the generation cost, but produces PNGs with real alpha including soft shadows and glass. Reserve chroma-key for quick one-offs and solid-background-then-remove for logos/icons where binary alpha is acceptable.

---

## Matte Math

### The Matting Equation

Compositing uses the Porter–Duff *over* operator. In premultiplied alpha form (the form used by Smith & Blinn, and the form every subsequent matting paper uses):

```
c_f = c_o + (1 − α_o) · c_k
```

where `c_f` is the foreground pixel as observed in the composite, `c_o` is the uncomposited foreground sprite (what we want to recover), `c_k` is the *known* backing color, and `α_o` is the per-pixel alpha we also want to recover. Each `c_*` is a 3-vector `(R, G, B)`. Primary colors are premultiplied by α.

One equation per channel: three equations, four unknowns `(R_o, G_o, B_o, α_o)`. Smith & Blinn's core result is a theorem: the system is **underdetermined**. Single-frame constant-color matting has an infinity of solutions. Chroma-keyers (Ultimatte, Primatte) work only because they impose additional color-space constraints (e.g., the Vlahos assumption: `B_o ≤ a₂·G_o`) that rule out most of the solution space heuristically.

### Triangulation: Two Equations, Two Backings

Smith & Blinn's Solution 3 (pp. 4–5 of the SIGGRAPH 1996 paper) breaks the ambiguity by shooting the subject against **two** known backings, `c_{k1}` and `c_{k2}`:

```
c_f1 = c_o + (1 − α_o) · c_k1
c_f2 = c_o + (1 − α_o) · c_k2
```

Subtracting the two:

```
c_f1 − c_f2 = (1 − α_o) · (c_k1 − c_k2)
```

`c_o` cancels cleanly. Solving for α_o on any channel where the backings differ:

```
α_o = 1 − (c_f1 − c_f2) / (c_k1 − c_k2)
```

For the canonical white/black pair (`c_k1 = (1,1,1)`, `c_k2 = (0,0,0)`), this collapses to the formula that every AI-art implementation quotes:

```
α = 1 − (c_white − c_black)            (per channel, in [0,1])
```

Or, in 8-bit integer pixel form:

```
α = 255 − (pixel_white − pixel_black)
```

### Generalizing: Theorem 4 for Arbitrary Backings

When the two backings are *any* two distinct colors (not just white/black), you have six equations (two RGB triples) and four unknowns — an **overdetermined** system. Smith & Blinn's Theorem 4 gives the least-squares solution:

```
α_o = 1 − [ (R_f1 − R_f2)(R_k1 − R_k2) + (G_f1 − G_f2)(G_k1 − G_k2) + (B_f1 − B_f2)(B_k1 − B_k2) ]
        / [ (R_k1 − R_k2)² + (G_k1 − G_k2)² + (B_k1 − B_k2)² ]
```

Geometrically: α_o is one minus the dot product of the observed-color delta onto the backing-color delta, normalized by the squared length of the backing delta. The white/black special case recovers the Euclidean-distance form Julien De Luca uses in his sharp-based TypeScript implementation:

```
α = 1 − ‖c_white − c_black‖₂ / ‖white − black‖₂
    = 1 − ‖c_white − c_black‖₂ / √(3 · 255²)
    = 1 − ‖c_white − c_black‖₂ / 441.67
```

Either formulation is acceptable; the Euclidean form is slightly more robust to per-channel noise because it averages across R, G, B.

### Color Recovery (Unpremultiplication)

Once α is known, recover the *unpremultiplied* foreground color from the image on black (trivially — the "over black" composite already gives you premultiplied `c_o` directly, because `(1−α)·(0,0,0) = 0`):

```
c_o_unpremul = c_black / α       (for α > ε)
```

Or from the image on white:

```
c_o_unpremul = (c_white − (1 − α) · (1, 1, 1)) / α
             = (c_white − 1 + α) / α
```

Julien De Luca uses 100% black-based recovery in his first post and a weighted (70% black / 30% white) blend in the Replicate production version to suppress edge contamination — when the two renders are not *perfectly* registered (AI models sometimes introduce sub-pixel drift), blending from both backgrounds averages out the mismatch.

### Why Premultiplied Matters

Downstream consumers of the PNG (browsers, Figma, Sketch, CSS `background-image`) almost universally expect **straight (unpremultiplied) alpha** in the file. Write `(R_o_unpremul, G_o_unpremul, B_o_unpremul, α · 255)` into the PNG. Internally, compositing libraries will re-premultiply at render time. The one exception is some game engines and WebGL pipelines, which prefer premultiplied; check consumer docs.

---

## Two-Color (Difference) Matting — Full Recipe

### Python (OpenCV + NumPy) implementation

```python
"""
difference_matting.py
Triangulation matting for AI-generated images.
Requires two pixel-aligned renders of the same subject
on pure white (#FFFFFF) and pure black (#000000) backgrounds.
"""
import numpy as np
import cv2
from pathlib import Path


def difference_matte(
    img_white_path: str | Path,
    img_black_path: str | Path,
    out_path: str | Path,
    *,
    black_weight: float = 0.7,
    edge_clean: bool = True,
    noise_floor: float = 0.02,
    noise_ceiling: float = 0.98,
) -> None:
    """Extract an RGBA PNG from two renders on white and black."""
    w = cv2.imread(str(img_white_path), cv2.IMREAD_COLOR).astype(np.float32) / 255.0
    b = cv2.imread(str(img_black_path), cv2.IMREAD_COLOR).astype(np.float32) / 255.0
    if w.shape != b.shape:
        raise ValueError("White and black renders must be identical size.")
    w = cv2.cvtColor(w, cv2.COLOR_BGR2RGB)
    b = cv2.cvtColor(b, cv2.COLOR_BGR2RGB)

    # Euclidean form of Smith-Blinn triangulation, white/black case.
    delta = np.linalg.norm(w - b, axis=2)       # 0..sqrt(3)
    alpha = 1.0 - delta / np.sqrt(3.0)
    alpha = np.clip(alpha, 0.0, 1.0)

    # Optional matte cleanup: snap very-low alpha to 0 and near-1 to 1.
    if edge_clean:
        alpha = np.where(alpha < noise_floor, 0.0, alpha)
        alpha = np.where(alpha > noise_ceiling, 1.0, alpha)

    # Color recovery.
    eps = 1e-3
    safe_alpha = np.maximum(alpha, eps)[..., None]
    rgb_from_black = b / safe_alpha                        # c = c_black / a
    rgb_from_white = (w - (1.0 - alpha[..., None])) / safe_alpha
    rgb = black_weight * rgb_from_black + (1 - black_weight) * rgb_from_white
    rgb = np.clip(rgb, 0.0, 1.0)

    rgba = np.concatenate([rgb, alpha[..., None]], axis=2)
    rgba = (rgba * 255.0).round().astype(np.uint8)
    rgba = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA)
    cv2.imwrite(str(out_path), rgba)


if __name__ == "__main__":
    import sys
    difference_matte(sys.argv[1], sys.argv[2], sys.argv[3])
```

### End-to-end pipeline (Gemini / Nano Banana Pro 2)

```python
"""
generate_transparent.py — Nano Banana Pro 2 + difference matting
"""
import os, io
from google import genai
from PIL import Image
from difference_matting import difference_matte

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def gen(prompt: str, image_bytes: bytes | None = None) -> bytes:
    parts = [prompt] if image_bytes is None else [
        prompt,
        {"inline_data": {"mime_type": "image/png", "data": image_bytes}},
    ]
    resp = client.models.generate_content(
        model="gemini-2.5-flash-image",  # or gemini-3-pro-image
        contents=parts,
    )
    for p in resp.candidates[0].content.parts:
        if getattr(p, "inline_data", None):
            return p.inline_data.data
    raise RuntimeError("no image returned")

# Step 1: generate on WHITE
white_bytes = gen(
    "A futuristic helmet, studio lighting, glass visor with reflections, "
    "on a pure solid white #FFFFFF background. No text. No logo."
)
Image.open(io.BytesIO(white_bytes)).save("helmet_white.png")

# Step 2: EDIT the white render to a black background (preserves subject)
black_bytes = gen(
    "Change the white background to a solid pure #000000 black. "
    "Keep everything else exactly unchanged. Do not re-render the subject. "
    "Do not change lighting, pose, proportions, or any pixel of the foreground.",
    image_bytes=white_bytes,
)
Image.open(io.BytesIO(black_bytes)).save("helmet_black.png")

# Step 3: matte
difference_matte("helmet_white.png", "helmet_black.png", "helmet.png")
```

### Seed-stability across backings: which models let you do this?

Smith & Blinn's original 1996 technique required **pin-registered film** (literally the film stock held against registration pins so it could not shift between exposures). The AI equivalent is per-pixel reproducibility across the two background renders. Options, ranked:

| Pipeline | Mechanism | Alignment quality | Notes |
|---|---|---|---|
| **Edit endpoint** (Nano Banana Pro 2, gpt-image-1 edits, Flux.1 Fill) | Re-render only masked/instructed region | Near-perfect; subject almost pixel-identical | Strongly preferred. This is the 2025 innovation. |
| **SDXL/Flux with fixed seed + guidance_scale** | Same noise, same schedule; change only the tail of the prompt (`"…on white bg"` → `"…on black bg"`) | Good but not pixel-exact; subject drifts slightly. Cross-attention to background token affects foreground tokens. | Works when edit endpoints unavailable; requires ControlNet reference for true lock. |
| **SD 1.5/2.x with fixed seed** | Same as above | Weaker composition lock than SDXL | Usable; needs extra guidance. |
| **ControlNet-locked** | Structure map (Canny/depth) held fixed across the two runs | Very good structural alignment | Adds a conditioning pipeline step. |
| **Midjourney** | `--seed` only rebuilds composition on V4+; fine-grained pixel reproducibility is not guaranteed | Poor | Difference matting essentially unusable. Use chroma-key or native (Recraft) instead. |
| **Imagen 3/4** | No seed exposed via public API at time of writing | Unusable | Requires edit endpoint workaround (Gemini 2.5/3 Flash Image) |

The edit-endpoint trick works because these models are trained on an objective that *preserves unmasked regions*. Flux.1 Fill is explicit about this; Gemini 2.5/3 Flash Image's image-conditioned mode is similarly preservation-biased. gpt-image-1's edit endpoint accepts a mask argument — set it to the background region for best fidelity, or trust the model's "keep foreground unchanged" instruction for a simpler flow.

### Cost accounting

Difference matting costs **2× generation** per asset. At Dec 2025 prices (Nano Banana Pro 2 on Gemini API ~$0.04/image, gpt-image-1 HQ ~$0.25/image) that's a $0.08–$0.50 hit per transparent asset. For bulk pipelines this is material; for one-off logo/hero-image work it's negligible compared to the time saved vs. manual Photoshop.

---

## Chroma-Key Recipe

### The prompt

```
Generate {SUBJECT}. Centered. Pure solid #00FF00 green background,
completely flat, no gradient, no shadow, no texture. No green tints or
highlights anywhere on the subject itself.
```

### The strip (OpenCV)

```python
"""
chroma_key.py — strip #00FF00 green from a flat AI render.
"""
import numpy as np
import cv2

def chroma_key(img_path: str, out_path: str, *,
               tol_h: int = 10, tol_s: int = 40, tol_v: int = 40,
               despill: bool = True, feather: int = 2) -> None:
    bgr = cv2.imread(img_path, cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    # OpenCV H is 0..180; pure green ≈ 60
    lower = np.array([60 - tol_h, 255 - tol_s, 255 - tol_v], dtype=np.uint8)
    upper = np.array([60 + tol_h, 255,         255        ], dtype=np.uint8)
    mask_bg = cv2.inRange(hsv, lower, upper)                 # 255 where green

    # Morphology — kill isolated speckles, close small holes in fg
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask_bg = cv2.morphologyEx(mask_bg, cv2.MORPH_OPEN, k, iterations=1)
    mask_bg = cv2.morphologyEx(mask_bg, cv2.MORPH_CLOSE, k, iterations=1)

    # Anti-alias the edge
    if feather:
        mask_bg = cv2.GaussianBlur(mask_bg, (2 * feather + 1, 2 * feather + 1), 0)

    alpha = 255 - mask_bg

    # Despill: subtract green channel bleed where green > max(R,B).
    if despill:
        b, g, r = cv2.split(bgr)
        green_excess = np.clip(g.astype(np.int16) - np.maximum(r, b), 0, 255).astype(np.uint8)
        g = np.clip(g.astype(np.int16) - green_excess, 0, 255).astype(np.uint8)
        bgr = cv2.merge([b, g, r])

    b, g, r = cv2.split(bgr)
    rgba = cv2.merge([b, g, r, alpha])
    cv2.imwrite(out_path, rgba)
```

### Tuning notes

- **HSV is non-negotiable.** RGB chroma-keying with Euclidean distance fails on shadow/shading. HSV isolates *hue* (≈60° for green) and lets you keep `S`, `V` generous.
- **`#00FF00` vs `#00B140` (broadcast "key green").** AI models render `#00FF00` more faithfully — it's the exact color name "pure green" in the model's vocabulary. Broadcast key-green is softer but models don't reproduce it accurately.
- **Despill is mandatory.** AI-generated green backgrounds leak green into subject edges (anti-aliasing with a green neighbor averages into the foreground). The despill step subtracts the per-pixel green excess.
- **Feather > 0 is a trade-off.** Sharp edges look AI-generated; a 1–2px Gaussian feather on the mask blends naturally onto new backgrounds.

### Magenta variant

If your subject is predominantly green (e.g., a plant), key on magenta (`#FF00FF`, H=150 in OpenCV's 0..180 scale) instead. For a subject that's *both* green and magenta, fall back to difference matting.

---

## When Each Fails

### Chroma-key fails when

- **The subject contains the key color.** Any green in a logo, plant, chrome reflection, etc.
- **Anti-aliased edges.** Strokes of text, thin lines, hair, fur — all pick up the key color in the sub-pixel blend. Despill helps but cannot fully reconstruct what the edge pixel "should" have been without a reference.
- **AI models produce non-flat greens.** Models introduce noise/texture into what *should* be a mathematically flat fill. The `cv2.inRange` tolerance has to be widened, which then eats into subject edges.
- **Soft shadows.** A shadow cast on the green backdrop is lost entirely — chroma-key treats it as "green-enough-to-remove".
- **Glass, smoke, fog, motion blur.** Anything genuinely semi-transparent. These pixels are a *blend* of foreground and backing color; chroma-key's binary mask cannot represent partial alpha, and even soft-keyers destroy the color information inside.
- **Julien De Luca reported (Dec 2025):** green leakage, solid-area texture artifacts, and 1-px jagged halos around text in every Nano Banana Pro 2 chroma-key attempt — the reason he moved to difference matting.

### Solid-background-then-remove (rembg/BiRefNet/BRIA RMBG) fails when

- **Semi-transparent subjects.** BiRefNet and U²-Net predict a binary-ish mask; they were trained on opaque-subject datasets. Glass bottles, smoke, fire, jewelry with gemstones, hair wisps — all receive the wrong mask.
- **Soft drop shadows the user wants to keep.** Background removers treat shadows as "not the subject" and delete them; the final composite then looks "floating" on any new background.
- **Low-contrast backgrounds.** A light-grey backdrop against a light-grey subject confuses contour detectors.
- **Background removal is the *right* choice when** the subject is opaque, shadows aren't desired, and the logo/icon just needs a hard silhouette.

### Difference matting fails when

- **The edit endpoint doesn't actually preserve the foreground.** Julien documented this as the dominant failure mode for Nano Banana Pro 2: occasionally the model "helps" by restyling the subject during the white→black edit. Mitigations: more constrained edit prompts ("do not alter any pixel of the subject"), lower temperature, image-editing-specific endpoints (Flux.1 Fill with a background mask), or fallback to ControlNet-locked fixed-seed generation.
- **The subject contains pure black or pure white pixels.** These pixels are ambiguous with the backing. A pure-black pixel on the black render looks identical to a transparent pixel on the black render. Mitigation: use the Theorem 4 form with two *non-neutral* backings (e.g., cyan and magenta) so no common subject color collides.
- **The model introduces sub-pixel drift between renders.** Manifests as ghostly halos along high-contrast edges. Mitigations: the 70/30 weighted color recovery (Julien's production fix), a morphological erode on very-low-α pixels, or the noise-floor/ceiling clamp shown in the Python code above.
- **Bright saturated subject colors near backing colors.** A neon-green element on a white backing may have its `(c_white − c_black)` difference reduced because the subject itself is already saturated; α gets underestimated. Arbitrary backings (Theorem 4) help.

### Full (Theorem 4) triangulation is needed when

- The subject reliably contains pure black or pure white and you cannot avoid it.
- The model refuses to render a clean `#000000` background (some models always introduce shading on black, treating it as "dark room" rather than "matte backing").
- You have access to three or more renders and want a least-squares fit for extra robustness. Over-determined systems fall out of the Theorem 4 matrix form (Smith & Blinn eq. for the 4×6 or 4×9 system); solve via `numpy.linalg.lstsq` or SVD.

---

## Implementations

### Reference / canonical

- **Smith & Blinn, "Blue Screen Matting", SIGGRAPH 1996.** Full derivations, including the Vlahos color-difference technique, Theorem 3 (sum-of-primaries form), and Theorem 4 (arbitrary-backings form). Free PDF at `alvyray.com/Papers/CG/blusig96.pdf`. Read Solutions 1–3 (pp. 3–5) for the core recipe and "Generalizations" (pp. 5–7) for the overdetermined least-squares form.

### AI-art workflows

- **Julien De Luca (`jidefr`)** — the public reference implementation:
  - Medium post 1 (Dec 1, 2025): "Generating transparent background images with Nano Banana Pro 2." Full TypeScript+`sharp` implementation using the Euclidean-distance form. The post walks the reader through his failed green-screen attempt and the pivot to difference matting.
  - Medium post 2 (Mar 11, 2026): "Nano Banana 2 with Transparency on Replicate." Describes the 70/30 weighted unpremultiply, noise floor/ceiling clamps, and the image-fitting pipeline for non-standard aspect ratios.
  - `replicate.com/jide/nano-banana-2-transparent` — text→RGBA PNG, ~$0.010 compute + 2× Nano Banana 2 cost.
  - `replicate.com/jide/nano-banana-2-bg-remove` — image→RGBA PNG; fits input to Nano Banana 2's supported formats, pads with white, mattes, crops back. Capped at 2K today.

### General-purpose matting libraries

- **PyMatting** (`pymatting/pymatting`, `pip install pymatting`). Trimap-based; implements Closed-Form Matting, KNN Matting, Large Kernel Matting, Random Walk, Shared Sampling. *Not* a Smith-Blinn triangulation implementation out of the box, but useful as a drop-in when you can produce a reasonable trimap from the white/black difference.
- **Matting-Anything (SHI-Labs, 2024)** — SAM-backed matting with 2.7M trainable params. Handles referring/instance/semantic matting. Heavier but needs no trimap.
- **DiffMatte** (`YihanHu-2022/DiffMatte`) — diffusion-based matting, +5% SAD / +15% MSE on Composition-1k. Useful when you already have a trimap or coarse alpha.

### Native-RGBA alternatives (so you can skip matting entirely when possible)

- **`gpt-image-1` / `gpt-image-1-mini` / `gpt-image-1.5`**: pass `background="transparent"` and `output_format="png"` (or `webp`). Returns a real RGBA PNG. Quality varies but no post-processing needed.
- **LayerDiffuse (SDXL)** — `lllyasviel/LayerDiffuse` — transparent-attention injection + transparent VAE decoder for SDXL. Native RGBA at generation time.
- **LayerDiffuse-Flux** (`FireRedTeam/LayerDiffuse-Flux`, Dec 2024, active through May 2025) — LoRA `layerlora.safetensors` + `TransparentVAE.pth`. Produces RGBA directly from Flux.1 [dev]. Supports T2I and I2I. Requires PyTorch 2.3.0+, Python 3.10.
- **Recraft API** — SVG/vector-native, so "transparent background" is intrinsic.
- **Adobe Firefly** — transparent-PNG toggle in the web UI and API.

### Background-removal stack (for comparison in hybrid pipelines)

- **rembg** — `pip install rembg`; wraps U²-Net/BiRefNet/BRIA RMBG weights. Fast, CPU-capable, binary alpha.
- **BRIA RMBG 1.4 / 2.0** — state-of-the-art commercial-grade background remover on HuggingFace.
- **BiRefNet** (ZhengPeng7/BiRefNet) — bilateral reference segmentation; best-in-class for tricky edges (hair) without being a full matting algorithm.
- Pair with difference matting for a hybrid: use BiRefNet to define a trimap (confident-fg / confident-bg / uncertain-band) and solve α *only* in the uncertain band using the white/black difference. This combines the two approaches' strengths.

---

## Decision Matrix (When to Use What)

| Scenario | Recommended pipeline |
|---|---|
| Opaque logo, hard edges, flat color | `gpt-image-1` RGBA native, OR Nano Banana Pro 2 + rembg |
| Logo with subtle drop shadow to preserve | Difference matting via edit endpoint |
| App icon with glass/glossy highlights | LayerDiffuse-Flux native RGBA; fallback to difference matting |
| Photorealistic product with soft shadow | Difference matting (preserves shadow as low-α black pixels) |
| Hair, fur, smoke, fire, glass | Difference matting; BRIA RMBG 2.0 / BiRefNet as secondary |
| Quick one-off, don't care about edge quality | Chroma-key `#00FF00` + `cv2.inRange` |
| Subject contains pure green or text | **Never** chroma-key; use difference or native |
| Subject contains both pure white and pure black | Full Theorem 4 triangulation with non-neutral backings (cyan/magenta) |
| Midjourney-only output | Native is unavailable; difference matting is unreliable due to weak seed reproducibility; chroma-key or Photoshop |

---

## References

### Primary sources

- Smith, A. R., & Blinn, J. F. (1996). *Blue Screen Matting*. SIGGRAPH '96 Conference Proceedings, pp. 259–268. Full PDF: `https://alvyray.com/Papers/CG/blusig96.pdf`. ACM DL: `https://dl.acm.org/doi/10.1145/237170.237263`.
- De Luca, J. (2025-12-01). *Generating transparent background images with Nano Banana Pro 2*. Medium. `https://jidefr.medium.com/generating-transparent-background-images-with-nano-banana-pro-2-1866c88a33c5`
- De Luca, J. (2026-03-11). *Nano Banana 2 with Transparency on Replicate*. Medium. `https://jidefr.medium.com/nano-banana-2-with-transparency-4673640bb9e6`
- Porter, T., & Duff, T. (1984). *Compositing Digital Images*. SIGGRAPH '84. (Foundational Porter-Duff `over` operator.)
- Vlahos, P. Various patents [US4344085, US4007487, US4100569] cited by Smith & Blinn, defining the Ultimatte color-difference technique.

### Implementations (GitHub)

- `replicate.com/jide/nano-banana-2-transparent` — Replicate model, production difference matting.
- `replicate.com/jide/nano-banana-2-bg-remove` — same technique applied as a background remover.
- `pymatting/pymatting` — PyPI: `pymatting`. Docs: `https://pymatting.github.io/`.
- `lllyasviel/LayerDiffuse` — native-RGBA SDXL.
- `FireRedTeam/LayerDiffuse-Flux` — native-RGBA Flux.1.
- `jnkl314/diffusers_LayerDiffuse` — diffusers integration.
- `YihanHu-2022/DiffMatte` — diffusion-based matting for Composition-1k.
- `SHI-Labs/Matting-Anything` — SAM-backed matting.
- `tobybreckon/chroma-keying` — reference OpenCV chroma-key.
- `danielgatis/rembg` — background removal stack.

### Vendor / API docs

- OpenAI Images API, `background` parameter: `https://developers.openai.com/api/docs/api-reference/images/createEdit`.
- Google Gemini 2.5/3 Flash Image API (image generation and editing): `https://ai.google.dev/`.
- Black Forest Labs, *Introducing FLUX.1 Tools* (Fill, Depth, Canny, Redux): `https://bfl.ai/flux-1-tools`.
- Stability AI SDXL readme (Replicate): `https://replicate.com/stability-ai/sdxl/readme`.

### Supporting references

- Quilez, I. *Premultiplied Alpha*. `https://iquilezles.org/articles/premultipliedalpha/`.
- Gritz, L. *Alpha Premultiplication* (Team Ten). `https://www.teamten.com/lawrence/graphics/premultiplication/`.
- Pillow issue #7079 on unpremultiplication precision: `https://github.com/python-pillow/Pillow/issues/7079`.

---

## Appendix: Why difference matting "just works" on AI outputs

The Smith & Blinn 1996 paper warns repeatedly that triangulation is **"quite sensitive to brightness and misregistration errors"** and requires **pin-registered** film stock, remote-controlled shutters, and identical exposure. Film-era practitioners essentially never used the technique outside research because meeting those constraints was onerous.

The 2025 AI pipeline accidentally satisfies all of them:

1. **"Pin registration"** is replaced by the edit endpoint's preservation bias. The model does not re-sample; it edits in-place.
2. **Identical exposure** is trivial — the model renders with deterministic tone-mapping given fixed parameters.
3. **Identical illumination** is trivial because the edit prompt explicitly says "keep the subject unchanged".
4. **Perfectly flat backing colors** are trivial — the subject's backdrop is whatever the model was told to render, not a physical lit surface with impurities.

In other words: the constraints that killed triangulation matting as a production film technique are *gone* in the AI setting. That's why a technique that was a theoretical curiosity in 1996 is, as of Dec 2025, the state-of-the-art workaround pipeline for RGBA asset generation from non-RGBA models.

The remaining failure modes — subject drift during edits, pure-black/white ambiguity, and edge contamination — are quantitatively smaller than the constraints Smith & Blinn were designing around, and are mitigable with the prompt engineering and weighted unpremultiply tricks documented above.

