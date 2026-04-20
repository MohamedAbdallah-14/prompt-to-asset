---
name: vectorize
description: Convert a raster image to SVG. Three paths — Recraft hosted vectorization, vtracer (multi-color polygon), potrace (1-bit). Optimizes with SVGO; validates path count as a quality signal.
trigger_phrases: [vectorize, convert to svg, trace image, raster to vector, svg from png]
---

# Vectorize

## Three paths

### 1. Recraft `/vectorize` (hosted, highest quality)

Input: any raster. Output: clean SVG, typically 20–100 paths for a mark, 200–500 for an illustration. Commercial tier only.

```ts
const svg = await recraft.vectorize({ image: pngBuffer });
```

### 2. `vtracer` (local, multi-color polygon)

- Rust binary; `npm install vtracer` for the Node wrapper.
- Modes: `polygon` (recommended for logos), `spline` (smoother curves), `pixel` (blocky).
- Color count controlled upstream via K-means quantization before vectorization.

```
pipeline:
  raster 1024²
  → BiRefNet matte (alpha the background)
  → K-means LAB 6-color palette
  → vtracer --mode polygon --filter-speckle 4 --color-precision 6
  → SVGO (conservative preset)
```

### 3. `potrace` (local, 1-bit)

- Classical Stan Ford vectorizer; binary output only (no color).
- Best for: icon packs (single-color), typography work, line art.
- Multi-color workaround: separate each color into its own 1-bit layer, vectorize each, stack SVG `<g>`s.

```
pipeline:
  raster 1024²
  → BiRefNet matte
  → per-color mask (binary threshold per palette entry)
  → potrace per mask → <g> wrapper
  → combine into single SVG
  → SVGO
```

## Choosing the path

| Use case | Path |
|---|---|
| Budget available, one-shot quality | Recraft vectorize |
| Multi-color logo, local | vtracer (polygon mode) |
| Single-color icon pack | potrace |
| Photorealistic illustration → vector | don't — keep as PNG/WebP. Vectorization of photoreal is lossy noise. |

## Path-count quality signal

After vectorization, count `<path>` elements:

- **≤40 paths** → clean, production-ready mark.
- **40–200 paths** → likely acceptable; scan for overlapping slivers.
- **>200 paths** → probably bad. Either the input has noise (regenerate), too many colors (reduce K-means), or the subject is inappropriate for vectorization (keep as raster).

## SVGO configuration

Conservative preset — **preserve:** viewBox, IDs, classes. **Strip:** metadata, editor comments, hidden elements.

```js
{
  multipass: true,
  plugins: [
    { name: 'preset-default', params: {
        overrides: { removeViewBox: false, cleanupIds: { minify: false } } } },
    'removeDimensions',     // prefer viewBox-only
    'sortAttrs',
    'removeScriptElement'   // security
  ]
}
```

Never enable `convertPathData` with default `floatPrecision` — it collapses small strokes.

## Validation

- SVG parses with `@resvg/resvg-js` without errors.
- `<path>` count ≤ 200 for logos, ≤ 500 for illustrations.
- No `<image>` tags (sneaking raster into SVG).
- No `<script>` tags.
- viewBox present.
- Rasterized at 1024 × 1024 should be visually identical (SSIM > 0.95) to source raster.

## Output
```
vector/
├── mark.svg         # primary vectorization
├── mark.svg.orig    # pre-SVGO original (for debugging)
└── meta.json        # paths_count, colors_used, svgo_savings_bytes
```
