---
name: logo
description: Generate a production-grade logo (primary brand mark). Returns RGBA PNG master + SVG vector + monochrome variant. Route by text-length and per-model ceiling. Strong-text models render multi-word and even paragraph-length wordmarks reliably; weak-text models composite SVG type post-render.
trigger_phrases: [generate a logo, make a logo, design a logo, brand mark, logo for my app]
---

# Logo generation

## Spec
- **Master:** 1024×1024 RGBA PNG, transparent background, subject centered in 80% safe zone
- **Vector:** SVG, ≤200 paths, fixed viewBox, SVGO optimized
- **Monochrome:** 1-color mono variant (auto-derived via luminance threshold or separate generation)
- **Wordmark routing — model-specific, not blanket:**
  - **Paragraph-length OK:** `gpt-image-2`, `gemini-3-pro-image-preview` (Nano Banana Pro), `gpt-image-1.5`. Include the wordmark in the prompt; composite stays safer for pixel-exact UI copy.
  - **3–10 words reliable:** `ideogram-3` / `ideogram-3-turbo`, `gemini-3.1-flash-image-preview` (Nano Banana 2), `gpt-image-1`, `flux-2` family.
  - **≤3 words / ≤25 chars:** Imagen 4 family, Recraft V4.
  - **Composite always:** Flux 1.x, Flux Schnell, SDXL, SD 1.5, Mystic, Pollinations, original Nano Banana 1.

## Routing by intent
| text in mark? | vector needed? | primary | fallback |
|---|---|---|---|
| none | yes | Recraft V4 (native SVG) | `gpt-image-1.5` → BiRefNet → vtracer |
| none | no | `gpt-image-1.5` (`background:"transparent"`) | Ideogram 3 Turbo (dedicated `/v1/ideogram-v3/generate-transparent` endpoint, `rendering_speed:"TURBO"`) |
| 1–3 words | yes | Ideogram 3 → raster 1024 → BiRefNet → K-means(6) → vtracer → SVGO | Recraft V4 |
| 1–3 words | no | Ideogram 3 | `gpt-image-1.5` |
| 4–10 words | yes | `flux-2` / `gpt-image-2` → raster 1024 → BiRefNet → K-means(6) → vtracer → SVGO | Nano Banana Pro |
| 4–10 words | no | `flux-2` family or `gpt-image-2` (note: gpt-image-2 has no native RGBA — matte after) | Nano Banana Pro |
| paragraph | any | Nano Banana Pro or `gpt-image-2`; composite is still safer for pixel-exact UI copy | composite via `BrandBundle.typography` |

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
