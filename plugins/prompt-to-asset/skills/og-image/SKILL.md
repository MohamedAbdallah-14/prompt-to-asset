---
name: og-image
description: Generate an Open Graph / Twitter Card social unfurler image — 1200×630 JPEG/PNG, <5MB, with deterministic typography. Defaults to Satori + @resvg/resvg-js template rendering (no diffusion). Diffusion is optional and only for the hero art layer composited behind the template.
trigger_phrases: [og image, open graph image, social card, twitter card, link preview]
---

# OG image generation

## Spec

- **Dimensions:** 1200×630 (OG 1.91:1) primary. Optional: 1080×1080 square (Instagram), 2:1 Twitter Card `summary_large_image`.
- **Format:** PNG or JPEG, <5MB, served over absolute HTTPS URL, no auth headers.
- **Text:** Deterministic — use Satori + real fonts. **Never sample typography from a diffusion model** for OG cards; headlines get garbled (see logo skill § 3-word rule).
- **Headline:** ≤8 words, 64–96pt. Subheadline: ≤15 words, 28–36pt.
- **Contrast:** WCAG AA min 4.5:1 (Slack/Discord render inside their own color backgrounds).

## Architecture

**Default: template-based, no diffusion.** The OG engine is:

1. **Satori** — converts JSX or HTML+CSS to SVG with real font shaping.
2. **`@resvg/resvg-js`** — rasterizes the SVG to PNG deterministically, no system fonts leaked.
3. **Optional hero layer** — if brief says "with illustration," diffusion-generate a 1200×630 background and composite the Satori-rendered text layer on top.
4. **`@vercel/og`** — reference Satori wrapper if running inside Next.js/Vercel.

```
brief + brand bundle
   ↓
pick template (centered hero, left-aligned, minimal)
   ↓
fill template slots:
   - title (required)
   - subtitle (optional)
   - logo.svg (optional, brand bundle)
   - accent color (brand palette)
   - background: solid | gradient | image
   ↓
[optional] generate background image (diffusion, see skills/hero or skills/illustration)
   ↓
satori(jsx) → SVG
   ↓
resvg.render(svg) → 1200×630 PNG
   ↓
validate: dimensions exact, <5MB, contrast, no-text-cropped
```

## Templates (canonical)

| Template id | Layout | Use for |
|---|---|---|
| `centered_hero` | title + subtitle centered; logo bottom-left | launch posts, generic pages |
| `left_title` | title left-aligned; hero image right | feature pages, blog posts |
| `minimal` | title + brand color block | landing pages |
| `quote` | pull-quote + attribution | blog, documentation |
| `product_card` | logo + product name + tagline + accent bar | product pages |

Templates live as JSX/TSX strings in `packages/mcp-server/src/templates/og/*.tsx`.

## Validation

- Width = 1200, height = 630 exactly.
- File <5MB.
- No text in outer 60px gutter (Slack/Twitter crop aggressively).
- WCAG AA contrast between headline and background (measure average luminance in the text-bbox region).
- If brand logo included: logo has a minimum size of 60×60px rendered.

## Output
```
og/
├── og.png        # 1200×630 PNG
├── og.jpg        # 1200×630 JPEG (higher compression)
├── og-2x.png     # 2400×1260 retina (optional)
└── meta.json
```
