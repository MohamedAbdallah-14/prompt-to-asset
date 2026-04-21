---
name: transparent-bg
description: Produce a truly RGBA-transparent asset from a brief. Handles the #1 pain (Gemini/Imagen rendering checkerboard pixels instead of real alpha). Routes to native-RGBA providers; falls back to BiRefNet / BRIA RMBG / LayerDiffuse / difference matting.
trigger_phrases: [transparent background, transparent png, rgba, alpha channel, no background, cutout, isolated]
---

# Transparent background

## The problem (see research 13 + 04)

Almost every modern T2I VAE is **RGB-only**. Asking Imagen 3/4 or Gemini 2.5/3 Flash Image for a "transparent logo" triggers one of two failures:

1. **Flat background** — DALL·E 3, Stable Diffusion families render a white/gray background that must be matted.
2. **Checkerboard as RGB pixels** — Gemini/Imagen literally render the gray-and-white 8×8 tile pattern (because Photoshop screenshots in their training data show transparency that way). This is the "weird boxes" users report. **It cannot be fixed by prompting.**

## Fix hierarchy (apply first that fits)

### 1. Route to a native-RGBA provider

| Provider | Mechanism |
|---|---|
| **`gpt-image-1` / `gpt-image-1.5`** | API param `background: "transparent"` + `output_format: "png"` or `"webp"` |
| **Ideogram 3 Turbo** | Dedicated `/ideogram-v3/generate-transparent` endpoint; set `rendering_speed: "TURBO"` for Turbo tier |
| **Recraft V3** | native SVG output (alpha is trivial); rasterize if raster needed |
| **LayerDiffuse on SDXL / Flux** | In-diffusion-loop transparency adapter; better edges than post-matte |

### 2. Post-process matte (for everything else)

| Matting model | License | Strength |
|---|---|---|
| **BiRefNet** | MIT | Default choice 2026; best soft-edge handling |
| **BRIA RMBG-2.0** | CC-BY-NC-4.0 (hosted API for commercial) | Best overall quality |
| **U²-Net** | Apache-2.0 | Legacy fallback |
| **rembg** | wrapper around U²-Net / BiRefNet | Easy CLI integration |
| **SAM 2** | Apache-2.0 | For complex/multi-object scenes; 2-stage (segment → matte) |

### 3. Difference matting (for semi-transparency: glass, hair, smoke)

1. Generate the same subject on pure-white background.
2. Generate again with same seed on pure-black background.
3. `alpha = (white_version - black_version + 255) / 2` in luminance.
4. Works for true semi-transparent objects where `rembg`/BiRefNet produce hard-cutout artifacts.

### 4. Vectorize-and-drop (for flat marks)

1. Generate raster at 1024² on white background.
2. BiRefNet matte → K-means quantize to N colors → `vtracer` or `potrace`.
3. SVG has alpha trivially. Rasterize at target sizes with `@resvg/resvg-js` for RGBA PNGs.

## Validation (never ship without)

Tier-0 alpha validator (see `packages/mcp-server/src/pipeline/validate.ts`):

```
1. Check PNG/WebP header has alpha channel type (RGBA, not RGB).
2. Reject if no pixels have alpha < 255 (it's opaque).
3. Reject if >5% of pixels have alpha ∈ [0.05, 0.95] AND FFT signature shows gray-tile band frequency (Gemini fake checkerboard).
4. Alpha coverage: subject pixels (alpha > 0.5) should occupy 30–85% of frame (sanity check).
5. Premultiplied-alpha check: no RGB values where alpha==0 (cleanup artifacts).
```

## Prompt scaffold for fallback matting flow

**Do not ask for transparency in the prompt.** Ask for pure white:

```
[SUBJECT, concrete].
Centered, isolated, no surrounding context or props.
Solid pure white #FFFFFF background.
Clean silhouette with distinct outline.
No drop shadow, no ground plane, no reflection.
1:1 square, 1024x1024.
```

Then post-process with BiRefNet / BRIA.

## Never do this

- `"transparent background"` as a prompt to Imagen or Gemini (checkerboard result).
- Trust `output_format: "png"` alone to produce alpha (PNG supports alpha, but the model has to emit it).
- Algorithmic `#FFFFFF → alpha=0` thresholding (loses anti-aliasing, creates jagged edges).
- Post-resize RGBA with non-premultiplied alpha (dark fringes).

## Output
```
transparent/
├── mark.png         # RGBA, validated
├── mark@2x.png      # optional high-DPI
├── mark.svg         # if vector path chosen
└── meta.json        # alpha_coverage, matting_method, validation_hash
```
