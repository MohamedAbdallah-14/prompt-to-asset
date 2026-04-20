---
name: favicon
description: Generate a full favicon bundle — favicon.ico (16/32/48 multi-res), icon.svg with prefers-color-scheme dark support, apple-touch-icon.png 180×180 opaque, and PWA 192/512/512-maskable — from a brand mark or a mark prompt.
trigger_phrases: [favicon, browser icon, tab icon, apple touch icon, favicon.ico]
---

# Favicon generation

## What modern browsers actually want (see research 11)

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/svg+xml" href="/icon-dark.svg" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

| File | Size | Alpha | Notes |
|---|---|---|---|
| `favicon.ico` | 16, 32, 48 packed | yes | legacy compatibility; <15KB |
| `icon.svg` | vector | yes | primary modern icon |
| `icon-dark.svg` | vector | yes | `prefers-color-scheme: dark` |
| `apple-touch-icon.png` | 180×180 | **no** — opaque | iOS home-screen; transparent = black background on iOS |
| `pwa/192.png`, `pwa/512.png` | 192, 512 | yes | manifest `any` purpose |
| `pwa/512-maskable.png` | 512, 80% safe zone padding | opaque | manifest `maskable` purpose |

## Generation strategy

**SVG-first.** Three paths, in order of preference:

1. **Reuse existing mark.** If a brand `logo-mark.svg` exists in the brand bundle, use it directly. Optimize with SVGO. Generate color variants by re-coloring SVG paths.
2. **LLM-author SVG.** For simple geometric marks (letter, glyph, shape), ask Claude/GPT to emit raw SVG with fixed viewBox, ≤40 paths, palette as hex list. Validate with `@resvg/resvg-js` rasterization.
3. **Generate raster + vectorize.** Prompt at 1024² (see `skills/logo/SKILL.md`), BiRefNet matte, K-means 4-color (favicons benefit from low color count), `potrace --color` or `vtracer --mode polygon`, SVGO.

## Prompt scaffold for raster fallback

```
A simple, memorable [letter | glyph | shape] representing [SUBJECT].
Bold silhouette. Two or three colors maximum: [#primary, #bg].
Subject fills 70% of frame, centered.
Solid pure white background.
No text, no details that vanish at 16x16.
1:1 square, 1024x1024.
```

## Dark-mode variant

Option A (recommended): generate two separate SVGs — light on white, dark on black. Never algorithmically invert (loses WCAG contrast).

Option B (compromise): re-color SVG paths via data-driven palette swap from `brand.light` and `brand.dark`.

## Validation (critical for favicons)

- Render SVG at **16×16** with `@resvg/resvg-js`.
- WCAG AA contrast ratio ≥ 4.5:1 between foreground and both white and dark browser chrome.
- No detail <2px stroke at 16×16 size.
- `.ico` file size <15KB.
- `apple-touch-icon.png` is **opaque** — reject if alpha channel present.
- `pwa/512-maskable.png` subject fits inside 80% center circle.

## Output
```
favicon/
├── favicon.ico             # 16/32/48 packed
├── icon.svg                # primary modern icon
├── icon-dark.svg           # prefers-color-scheme dark
├── apple-touch-icon.png    # 180² opaque
├── pwa/192.png
├── pwa/512.png
├── pwa/512-maskable.png
├── head-snippet.html       # <link> tags ready to paste
└── meta.json
```
