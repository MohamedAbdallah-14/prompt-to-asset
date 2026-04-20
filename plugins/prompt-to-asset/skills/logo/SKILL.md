---
name: logo
description: Generate a production-grade logo (primary brand mark). Returns RGBA PNG master + SVG vector + monochrome variant. Route by text-length; never render wordmarks past 3 words in a diffusion sampler.
trigger_phrases: [generate a logo, make a logo, design a logo, brand mark, logo for my app]
---

# Logo generation

## Spec
- **Master:** 1024×1024 RGBA PNG, transparent background, subject centered in 80% safe zone
- **Vector:** SVG, ≤200 paths, fixed viewBox, SVGO optimized
- **Monochrome:** 1-color mono variant (auto-derived via luminance threshold or separate generation)
- **No wordmark past 3 words in diffusion output** — composite SVG type

## Routing by intent
| text in mark? | vector needed? | primary | fallback |
|---|---|---|---|
| none | yes | Recraft V3 (native SVG) | `gpt-image-1` → BiRefNet → vtracer |
| none | no | `gpt-image-1` (`background:"transparent"`) | Ideogram 3 Turbo (`style:"transparent"`) |
| 1–3 words | yes | Ideogram 3 → raster 1024 → BiRefNet → K-means(6) → vtracer → SVGO | Recraft V3 |
| 1–3 words | no | Ideogram 3 | `gpt-image-1` |
| >3 words | any | Generate text-free mark, composite SVG type in app layer | — |

## Dialect-ready prompt scaffold
```
A [flat vector | isometric | brutalist | soft gradient] logo mark representing [SUBJECT, concrete noun phrase].
Centered composition. Clean silhouette, strong tight outline, high contrast.
Palette: [#hex, #hex, #hex] strictly.
["WORDMARK TEXT" in sans-serif, tight tracking | text-free mark].
Solid pure white background. Square 1:1 aspect. 1024x1024.
```

For SD: prepend `masterpiece, vector logo, flat design, minimalist, 8k, `.
For Flux: drop all quality modifiers; be concrete about subject and palette.

## Post-process
1. BiRefNet matte (or Recraft SVG → rasterize at 1024).
2. Checkerboard-pattern probe: reject if failed.
3. If SVG needed: K-means 6-color → `vtracer --mode polygon` → SVGO (conservative preset).
4. Monochrome variant: greyscale → Otsu threshold → tint brand black.
5. Validate: tight-bbox ≤ 80% safe zone, palette ΔE2000 ≤ 10, OCR matches wordmark if present.

## Failure → action
- Checkerboard → route to `gpt-image-1` (different provider).
- Wordmark garbled → regenerate mark text-free, composite SVG type.
- Palette drift → Recraft `controls.colors` or recolor post.
- >200 SVG paths → regenerate with "simpler geometry" or raise K-means color count.

## Output
```
logo/
├── master.png        # 1024² RGBA
├── mark.svg          # vector
├── mark-mono.svg     # monochrome
├── mark-inverse.png  # dark-mode variant
└── meta.json         # provenance + validations
```
