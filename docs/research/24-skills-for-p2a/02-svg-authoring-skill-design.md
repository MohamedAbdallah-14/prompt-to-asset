---
title: "SVG authoring skill design for P2A inline_svg mode"
category: skills-for-p2a
date: 2026-04-21
---

# SVG Authoring Skill Design for P2A `inline_svg` Mode

## Overview

The P2A asset-enhancer skill currently gates direct SVG authoring to a minimal guidance note in the asset-enhancer SKILL.md: "LLM-author SVG for simple geometry (fixed viewBox, no `<image>`, palette hex list, ≤40 paths)". A dedicated `svg-authoring` skill would elevate this to production-grade guidance, enabling Claude to write retail-quality logos, favicons, icons, and stickers without diffusion sampling—zero API cost, fully editable, resolution-independent.

This document specifies what that skill should contain: design principles, technical constraints per asset type, a taxonomy of SVG styles with implementation patterns, typography strategy, color systems, optimization rules, and documented failure patterns. It synthesizes P2A's research (especially 12d and 12e) with practitioner patterns from Simon Willison's pelican-on-a-bicycle benchmark, SGP-Bench, StarVector, and production skills already in circulation.

---

## 1. SVG Design Principles for Logos and Icons

SVG-authored logos and icons succeed when they obey five overlapping principles rooted in both visual design and the constraints of small coordinate spaces:

### 1.1 Negative Space as Structure

The most recognizable logos use negative space as actively as positive space. In SVG this means:

- **Deliberate gaps** between elements create visual rhythm and prevent visual crowding (e.g., GitLab's three interlocking shapes with internal voids).
- **Silhouette clarity** — when viewed at 16×16 px or as a monochrome fill, the mark must remain readable. Test by rendering at 16, 24, 32 px and comparing against a reference at that size.
- **Avoid detail in enclosed shapes.** A filled circle inside another filled circle at icon sizes produces a solid blob. Use grouping and stroke instead.

**Prompt directive:** "The mark must be recognizable in silhouette (single color fill). Ensure negative space is intentional, not accidental."

### 1.2 Optical Balance

Geometric layouts are deceptive; visual weight is not the same as mathematical center. SVG tools make it easy to place elements at `cx="50" cy="50"` and assume balance. Reality:

- **Center positioning often reads low.** Text baseline is an optical hazard — "M" at y="50" often looks too high.
- **Weight asymmetry is acceptable and powerful.** A small dense element can balance a large light one (Slack's colorful letter).
- **Stroke weight creates visual density.** A 2px stroke on a 40×40 shape reads much heavier than a 1px stroke.

**Testing strategy:** Render at three scales (16, 64, 512 px). Verify the composition feels balanced at each, not just at 512.

### 1.3 Silhouette Clarity

All strong logos (Apple, Nike, Twitter, Dropbox) survive as a single-color silhouette. This is both a constraint and a quality gate.

- **The outline of the mark must be distinctive.** Two concentric circles are not a mark; they are a shape.
- **Avoid shape stacking without intentional differentiation.** If you layer triangle-on-triangle, the difference must be immediate.
- **Test: fill the entire SVG with black and print it. Does the outline of the mark jump out?**

**Prompt directive:** "Design a mark where the outer silhouette is distinctive and iconic—it should be recognizable even as a solid black shape."

### 1.4 Stroke Consistency

SVG strokes with varying widths read as "amateur" or "sketchy." Logos benefit from consistency.

- **One stroke width for all outline elements, or a deliberate two-tier system** (e.g., main outline 2px, accent detail 1px).
- **`stroke-linecap="round"` and `stroke-linejoin="round"`** are nearly always correct for icon-like marks. Sharp joins (`miter`) read as broken at 16×16.
- **Avoid sub-pixel strokes.** `stroke-width="1.5"` can render as either 1 or 2 px depending on rasterizer and zoom. Use integers or half-units (1, 1.5, 2) consistently.

**Implementation:** Always set `stroke-linecap="round"` and `stroke-linejoin="round"` at the root `<svg>` level; individual elements inherit.

### 1.5 Geometric Purity

SVG excels when shapes are described with primitives, not approximated with Bézier noise.

- **Prefer `<circle>`, `<rect>`, `<polygon>`, `<line>` over `<path d="M...">`.** A circle is a circle; approximate it with 8 quadratic Bézier segments and you have wasted bytes and precision.
- **Reuse transforms.** Don't copy-paste rotated elements; use `<g transform="rotate(45 cx cy)">`.
- **String together multi-element shapes in `<g>` with an `id` for future editing.**

**Example:** A five-pointed star is better described as a `<polygon points="...">` than as five separate bezier-drawn triangles.

---

## 2. Technical Constraints per Asset Type

The `inline_svg` mode has different budgets and viewBox conventions depending on the asset.

### 2.1 Logo

| Constraint | Value | Rationale |
|---|---|---|
| **viewBox** | `"0 0 120 120"` or `"0 0 200 200"` | Square 1:1; 120–200 is ergonomic for human-writable paths |
| **Safe zone** | 80% of canvas (inner 96×96 or 160×160) | Subject must clear frame; 20% breathing room on all edges |
| **Path budget** | ≤40 paths | Validated by asset-enhancer SKILL.md; practitioner limit for "simple" |
| **Color palette** | 2–4 colors hex list (e.g., `#1E1E1E`, `#F5A623`) | Flat fills only; no gradients, filters, shadows |
| **No external refs** | No `<image>`, `<foreignObject>`, data URIs, web fonts | Keeps SVG portable and small |
| **Coordinate precision** | Integer or 1 decimal place | Avoids 6-place bloat; rounding post-optimization is safe |

**Master dimensions:** P2A exports logos as 1024×1024 RGBA PNG masters; the SVG is the source-of-truth, rasterized on demand. The viewBox is abstract; the rendering size is up to the host.

### 2.2 Favicon

| Constraint | Value | Rationale |
|---|---|---|
| **viewBox** | `"0 0 64 64"` | Favicons must survive at 16×16; 64 gives headroom for detail |
| **Safe zone** | 70% (inner 44.8×44.8) | Smaller because favicons are seen at size; tight crops work |
| **Path budget** | ≤30 paths | Favicon grids stress-test density; less is more |
| **Color count** | 2–3 colors maximum | Favicons benefit from low color count; WCAG AA contrast at 16×16 is hard with many colors |
| **Stroke width** | 1–1.5 px (viewBox-relative) | At 16×16 render, this is 0.25–0.375 px; anything thinner vanishes |
| **Detail size** | No feature <4 units in viewBox space | At 16×16 render, 4 units ≈ 1 px. Smaller detail vanishes |

**Render validation:** P2A's favicon skill must render the SVG at 16, 32, 48, and 256 px and reject if important detail vanishes.

### 2.3 Icon (for Icon Pack or UI Set)

| Constraint | Value | Rationale |
|---|---|---|
| **viewBox** | `"0 0 24 24"` (industry standard for UI icon sets) | Lucide, Heroicons, Phosphor, Tabler all use 24×24 |
| **Safe zone** | 100% (use full canvas) | Icons are designed for their viewBox size; padding is user-configurable via external CSS |
| **Path budget** | ≤8 paths per icon | Icon packs are rendered hundreds of times; smaller is better |
| **Stroke-only or fill-only** | Declare upfront | Outline icons (`stroke`, no `fill`) → `stroke="currentColor"` (CSS-inheritable) |
| **Stroke width** | 2px standard (for outline) or inherit from `stroke-width` | Lucide/Heroicons standard |
| **Coordinate precision** | Integers only; round all `cx`, `cy`, `x`, `y`, `r` | Prevents sub-pixel rendering issues at small sizes |

**Style reference in prompt:** "In the style of Lucide" or "Heroicons outline" moves quality noticeably.

### 2.4 App Icon (Master)

| Constraint | Value | Rationale |
|---|---|---|
| **viewBox** | `"0 0 1024 1024"` (or `0 0 512 512`) | Large canvas; P2A exports to AppIcon.appiconset and Android formats |
| **Safe zone** | 824×824 center (from iOS HIG) | Apps are cropped differently per platform; 80% safe zone ensures visibility |
| **Path budget** | ≤40 paths (if SVG) or raster | App icons are usually raster-final; SVG used for vectorization only |
| **No transparency** | App icons on iOS 1024× are opaque | Transparent PNG app icons render as black on iOS home screen |
| **Background** | Solid color or pattern only | No gradients that fail under forced dark mode |

**Note:** App icons are primarily raster in the P2A pipeline. The `inline_svg` mode for app icons is validation-only; actual masters come from diffusion or Recraft.

### 2.5 Sticker

| Constraint | Value | Rationale |
|---|---|---|
| **viewBox** | `"0 0 200 200"` (or square dimensions proportional to aspect) | Stickers are often non-square; maintain aspect as specified |
| **Safe zone** | 80% center | Stickers can be cut; padding prevents cropping surprises |
| **Path budget** | ≤60 paths | Stickers are illustration-adjacent; more detail is acceptable |
| **Color palette** | 3–6 colors | Richer than logos; still flat and optimizable |
| **Stroke weight** | Consistent; 2–4 px | Stickers are rendered large; medium stroke weight reads well |

**Export validation:** Sticker SVGs are the master; P2A exports to PNG at multiple sizes (128, 256, 512) and to `.webp` for web use.

---

## 3. Style Taxonomy with SVG Implementation Patterns

SVG-authored assets cluster into recognizable stylistic families. Each has a characteristic element set and parameter pattern.

### 3.1 Flat / Geometric

**Defining characteristics:** No gradients, shadows, or strokes on fills. Pure flat colors with hard edges. Shapes are primitive or simple paths.

**Elements:** `<circle>`, `<rect>`, `<polygon>`, `<line>`, minimal `<path>`.

**Stroke rules:** Either outline-only (stroke, no fill) or fill-only (fill, no stroke). Rarely mixed.

**Typical palette:** 2–4 colors; high contrast.

**Example: Note-taking app logo**

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Paper/note sheet -->
  <rect x="20" y="20" width="80" height="80" fill="#F5A623" rx="4"/>
  <!-- Horizontal lines (faux text) -->
  <line x1="30" y1="40" x2="90" y2="40" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
  <line x1="30" y1="55" x2="90" y2="55" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
  <line x1="30" y1="70" x2="75" y2="70" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**Prompt formula:**
```
A flat-design logo mark for [SUBJECT].
Elements: [geometric primitives: circle, square, triangle].
Palette: [#hex, #hex].
No gradients, shadows, or strokes on fills.
Subject fills 70% of the viewBox, centered.
```

### 3.2 Outlined / Line Icon

**Defining characteristics:** Strokes define the shape; fills are absent or minimal. Emphasis on line weight consistency.

**Elements:** `<path>`, `<circle>`, `<line>`, `<polyline>` — all with `stroke` and no `fill` (or `fill="none"`).

**Stroke rules:** Consistent `stroke-width` (e.g., 2px), always `stroke-linecap="round"` and `stroke-linejoin="round"`.

**Typical use:** UI icons, favicons, system icons (Heroicons/Lucide style).

**Example: Shield with checkmark (Lucide-style)**

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Shield -->
    <path d="M 12 2 L 20 6 L 20 12 Q 20 18 12 22 Q 4 18 4 12 L 4 6 L 12 2 Z"/>
    <!-- Checkmark -->
    <path d="M 8 12 L 11 15 L 16 9"/>
  </g>
</svg>
```

**Prompt formula:**
```
Design a [CONCEPT] icon.
Requirements:
- viewBox="0 0 24 24"
- Outline style: stroke="currentColor", stroke-width="2", fill="none"
- stroke-linecap="round", stroke-linejoin="round"
- Lucide-style (clean, geometric, minimal detail)
- Integer coordinates only
- At most 2–3 paths
Output only the SVG.
```

### 3.3 Filled / Solid Icon

**Defining characteristics:** Solid fills with no strokes. Often used when icons are small or densely rendered.

**Elements:** `<path>`, `<circle>`, `<polygon>` — all with `fill` and no `stroke` (or `stroke="none"`).

**Color rule:** Often `fill="currentColor"` for CSS-driven theming, or explicit hex.

**Typical use:** Dashboard icons, app navigation, iOS system icons.

**Example: Star icon (Solid)**

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M 12 2 L 15.09 10.26 L 24 11.27 L 18 17.14 L 19.54 26.02 L 12 22.77 L 4.46 26.02 L 6 17.14 L 0 11.27 L 8.91 10.26 Z"/>
</svg>
```

**Prompt formula:**
```
Design a solid-fill [CONCEPT] icon.
- viewBox="0 0 24 24"
- Solid fills only (no strokes)
- fill="currentColor" for portability
- Simple geometric shapes, no interior detail that breaks at small sizes
```

### 3.4 Duotone

**Defining characteristics:** Two colors, often applied to foreground and background or outline vs. fill in a single shape.

**Elements:** Layered `<g>` elements with different fill colors, or multiple `<path>` with `fill` color per element.

**Typical structure:** A background shape (often circle or rounded square) + a foreground glyph, each with a distinct color from the brand palette.

**Example: Chat icon (Duotone)**

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer circle (background color) -->
  <circle cx="60" cy="60" r="55" fill="#E8F5E9"/>
  <!-- Chat bubble (foreground color) -->
  <g fill="#2E7D32">
    <path d="M 30 35 Q 30 30 35 30 L 85 30 Q 90 30 90 35 L 90 70 Q 90 75 85 75 L 50 75 L 40 85 L 45 75 L 35 75 Q 30 75 30 70 Z"/>
  </g>
</svg>
```

**Prompt formula:**
```
Design a duotone logo for [SUBJECT].
- Primary color: #hex (background/outline)
- Secondary color: #hex (foreground/glyph)
- Composition: [background shape] + [foreground element]
- Keep both layers simple and distinct
```

### 3.5 Isometric

**Defining characteristics:** Pseudo-3D with isometric projection (typically 30–45° angles, no perspective distortion). Requires careful path construction.

**Elements:** Mostly `<path>` for drawn geometry; `<polygon>` for face planes.

**Color rule:** Three tones — highlight (light), normal, shadow (dark) — applied to different faces of the 3D shape.

**Typical constraint:** Isometric favors raster diffusion over LLM-SVG (Claude struggles with projection geometry). When forced to SVG: keep it simple (cube, staircase, 2–3 blocks).

**Example: Isometric cube**

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <!-- Top face (light) -->
  <polygon points="60,30 90,45 60,60 30,45" fill="#FFD700"/>
  <!-- Right face (normal) -->
  <polygon points="90,45 90,75 60,90 60,60" fill="#FFA500"/>
  <!-- Left face (shadow) -->
  <polygon points="30,45 60,60 60,90 30,75" fill="#FF8C00"/>
</svg>
```

**Note:** This is a research gap in 12d. LLM-SVG can produce simple isometric blocks but struggles with multi-block arrangements. Route complex isometric requests to Recraft (native vector) or raster + vtracer.

**Prompt formula:**
```
Design a simple isometric [SUBJECT].
- Use three face tones: light #hex, normal #hex, shadow #hex
- Keep geometry minimal: at most 3–4 3D faces
- Isometric angles: 30° for diagonals
```

### 3.6 Minimal / Brutalist

**Defining characteristics:** Extreme geometric simplicity, often monocolor. Emphasis on the power of a single shape or line.

**Elements:** Single `<circle>`, `<rect>`, or one `<path>`.

**Color rule:** Monocolor (single hex) or high-contrast two-color.

**Spacing rule:** Often off-center or asymmetrically positioned to break expectation.

**Example: Minimal circle logo**

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="75" cy="45" r="35" fill="#1E1E1E"/>
</svg>
```

**Prompt formula:**
```
Design a brutalist, minimal logo for [SUBJECT].
- One or two geometric shapes only
- Monocolor or high-contrast two-color
- No detail; pure geometry
- Subject suggested by shape and positioning alone
```

### 3.7 Gradient (Simple)

**Defining characteristics:** One or two `<linearGradient>` or `<radialGradient>` definitions. Fills reference gradients, not colors.

**SVG structure:**
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF0000;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="45" fill="url(#grad1)"/>
</svg>
```

**Caution:** Gradients bloat SVG files and are hard to edit programmatically. Only use if brand explicitly requires it. Most "gradient-like" logos are better served with duotone fills.

**Prompt formula:**
```
Design a logo with a subtle gradient.
- Gradient: from #hex to #hex, [direction: left-to-right / top-to-bottom]
- One base shape, filled with the gradient
- Keep gradient smooth and minimal
```

---

## 4. Typography Handling in SVG Logos

Text in SVG is a minefield. LLM-authored text frequently has spelling errors, and web fonts don't always load in context. Four strategies:

### 4.1 No Text (Mark-Only)

**Best practice.** The logo is a glyph or icon; text is either composite (added by the host app) or handled separately.

**P2A guidance:** When a wordmark is needed, generate a text-free mark via LLM-SVG, then composite the text layer in a separate pass (e.g., with `satori`/`@resvg/resvg-js` or as a separate image element).

### 4.2 Simple `<text>` Elements (Risky)

If the mark must include text, use `<text>` with explicit font family and constraints:

```svg
<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
  <text x="50" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="#1E1E1E">
    SLATE
  </text>
</svg>
```

**Risks:**
- The font may not be available on the rendering machine (e.g., if the SVG is served on the web, sans-serif defaults to the host's fallback).
- LLMs misspell short strings surprisingly often ("LOGOS" → "LOGSO").
- Text positioning is optical: the `y` attribute is the *baseline*, not the center, leading to alignment surprises.

**Prompt constraints to add:**
- "Use only ASCII letters (no accents)."
- "Spell out the text character by character: L-O-G-O."
- "Font: sans-serif, bold, size 24."
- "Text baseline y position: [computed based on viewBox]."

**Validation:** Always OCR the rendered SVG and compute Levenshtein distance against the intended text. If error rate >10%, regenerate with tighter constraints or request mark-only.

### 4.3 Text as Outlines (Best for Portability)

Convert text to `<path>` outlines so no font is needed. This requires post-processing:

1. Generate `<text>` in SVG.
2. Rasterize with `@resvg/resvg-js` or similar.
3. Trace back to vector with vtracer or a font-outline extractor (e.g., fontkit + wasm).
4. Merge into the mark SVG.

This is heavy; P2A handles it via the `composite SVG type` route in the asset-enhancer SKILL.md.

### 4.4 Typed Text (Small-Caps, Geometric Fonts)

Prompt for geometric-style text that is more faithful when LLM-generated, e.g., "stencil-style letters" or "All-caps sans-serif blocky text." These have fewer ambiguous details than script fonts.

**Example prompt:**
```
Design a logo with text.
Text: "ACME" (all-caps, stencil-style sans-serif, bold, tight tracking).
Geometry: each letter is drawn as thick strokes, no serifs.
```

**Prompt formula for text-inclusive marks:**
```
Logo with wordmark: "[EXACT TEXT]" (spell character-by-character: X-Y-Z).
Text: all-caps, sans-serif, bold, tight tracking, positioned [above/below/beside] the mark.
Mark geometry: [describe the mark].
No serifs, no script, no fancy fonts.
```

---

## 5. Color System in SVG

### 5.1 Palette Application

SVG fills are atomic: each `<path>` or `<circle>` has a single `fill` color. Consistent palette application requires discipline:

**Single-color (monocolor):**
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="40" fill="#1E1E1E"/>
  <rect x="50" y="35" width="20" height="50" fill="#1E1E1E"/>
</svg>
```

**Multi-color (duotone, tricolor):**
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="40" cy="60" r="30" fill="#FF6B6B"/>
  <circle cx="80" cy="60" r="30" fill="#4ECDC4"/>
  <rect x="50" y="50" width="20" height="20" fill="#1E1E1E"/>
</svg>
```

**Prompt directive:** "Use exactly these colors and no others: [#hex, #hex]. Assign each color to logical parts of the composition."

### 5.2 CSS Variables (for Dark/Light Variants)

SVG supports CSS custom properties (variables). This is powerful for theming:

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="color-scheme: light dark;">
  <circle cx="60" cy="60" r="40" fill="var(--color-primary, #1E1E1E)"/>
  <rect x="50" y="35" width="20" height="50" fill="var(--color-accent, #F5A623)"/>
</svg>
```

**Host CSS:**
```css
:root {
  --color-primary: #1E1E1E;
  --color-accent: #F5A623;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #FFFFFF;
    --color-accent: #FFB84D;
  }
}
```

**P2A note:** This is a post-processing step. The LLM generates the SVG with explicit hex colors; P2A's tool chain converts named groups to `var(--color-*)` references.

### 5.3 Dark/Light Variants

Best practice for production: **generate two separate SVGs**, one tuned for light backgrounds, one for dark.

**Light variant:**
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="40" fill="#1E1E1E"/>
  <rect x="50" y="35" width="20" height="50" fill="#F5A623"/>
</svg>
```

**Dark variant:**
```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="40" fill="#FFFFFF"/>
  <rect x="50" y="35" width="20" height="50" fill="#FFB84D"/>
</svg>
```

**Contrast requirement:** WCAG AA (4.5:1) for the dark variant on a dark background, and the light variant on a light background.

**Prompt pattern for variants:**
```
Generate two versions of the logo:
1. Light version: foreground [#hex], background/accent [#hex]
2. Dark version: foreground [#hex], background/accent [#hex]
Ensure both meet WCAG AA contrast (4.5:1) on their intended backgrounds.
```

### 5.4 High-Contrast Mode (A11y)

In production, P2A should validate both versions against WCAG standards. The asset-enhancer SKILL.md lists this as tier-1 validation:

- Light variant: tested on white background; contrast ≥4.5:1.
- Dark variant: tested on #1a1a1a or black background; contrast ≥4.5:1.

**Validation code pattern (pseudo):**
```javascript
const lightOnWhite = contrastRatio(lightLogoFgColor, "#FFFFFF");
const darkOnBlack = contrastRatio(darkLogoFgColor, "#000000");
assert(lightOnWhite >= 4.5 && darkOnBlack >= 4.5);
```

---

## 6. SVG Optimization Rules

### 6.1 Path Simplification

Paths are the largest contributor to SVG file size. Optimization strategies:

**Use primitives:** A circle should never be approximated with a path:
```svg
<!-- Bad (≈30 bytes when minified) -->
<path d="M 60 20 Q 80 20 80 40 Q 80 60 60 60 Q 40 60 40 40 Q 40 20 60 20 Z" fill="#000"/>

<!-- Good (≈20 bytes) -->
<circle cx="60" cy="40" r="20" fill="#000"/>
```

**Merge same-color shapes:** If two adjacent `<path>` elements have the same fill, merge them (or use `<g fill="#...">` to group).

**Round coordinates:** Decimal precision bloat is common. SVGO post-processing typically rounds to 2 decimal places, but authoring with integers is better:
```svg
<!-- Bad -->
<circle cx="59.876543" cy="59.876543" r="39.876543" fill="#000"/>

<!-- Good -->
<circle cx="60" cy="60" r="40" fill="#000"/>
```

**Stroke width consistency:** Using a mix of 1, 1.5, and 2px strokes adds visual noise. Stick to one or two values.

### 6.2 SVGO Post-Processing

P2A's asset-save pipeline runs every SVG through [SVGO](https://github.com/svg/svgo) with a conservative preset. Configuration:

```json
{
  "plugins": [
    "preset-default",
    {
      "name": "convertPathData",
      "params": {
        "precision": 2,
        "transformPrecision": 5
      }
    },
    {
      "name": "mergePaths",
      "params": {
        "force": false
      }
    }
  ]
}
```

**Important:** SVGO's defaults remove `viewBox`, which breaks rescaling. P2A must use `{ preset-default: { removeViewBox: false } }`.

### 6.3 File-Size Targets

- **Logo:** <2 KB (unoptimized); <1.5 KB (after SVGO).
- **Favicon:** <1 KB.
- **Icon:** <500 bytes each (for a pack of 20+).
- **Sticker:** <3 KB.

Anything >5 KB unoptimized is a sign of over-complexity or decimal-place bloat.

### 6.4 Render Clarity at Multiple Scales

The same SVG must render cleanly at 16×16, 64×64, and 1024×1024. Quality gates:

1. **Render with resvg at 16, 64, 256, 1024 px.**
2. **Compute SSIM between downsampled 1024 and native 16 render.** Anything <0.95 suggests detail that vanishes at small sizes.
3. **Flag sub-pixel artifacts.** If the 16×16 render shows jagged edges or missing pixels, reject and regenerate with larger strokes or simpler geometry.

**Prompt directive:** "The logo must remain clear and recognizable at 16×16 px (favicon size). Avoid thin details that vanish at small sizes."

---

## 7. Failure Patterns and Remediation

Research 12d documents common LLM failure modes. P2A should surface these explicitly in the `svg-authoring` skill.

### 7.1 Gigantic Coordinates

**Symptom:** SVG rendered as blank or mostly-empty canvas. Bounding box of content is far outside viewBox (e.g., content at `(500, 500)` in `viewBox="0 0 100 100"`).

**Root cause:** LLM ignores or misunderstands viewBox constraint. Often happens with unconstrained prompts.

**Prevention:** Explicit constraint: "viewBox must be `0 0 120 120`. All coordinates between 0 and 120."

**Detection:** Rasterize and check: if >30% of the canvas is blank and content is crammed into one corner, reject.

**Remediation:** Regenerate with tighter prompt, including a viewBox size in the instructions.

### 7.2 Open Paths (Missing `Z`)

**Symptom:** Path doesn't close; outline has gaps or fill is incomplete.

**Root cause:** LLM forgets to append `Z` (closepath command) or misspells it.

**Prevention:** Prompt: "Every path must end with `Z` to close the shape."

**Detection:** Parse the SVG; scan for `<path d="...` without trailing `Z`. SVGO's parser catches malformed paths.

**Remediation:** Post-processing: append `Z` to any path that doesn't have it, if syntactically valid.

### 7.3 Overlapping Elements in Wrong Order

**Symptom:** A shape that should be in front is hidden behind another shape.

**Root cause:** SVG is rendered back-to-front in DOM order. LLM may generate elements in logical order, not visual order.

**Example (bad):**
```svg
<circle cx="60" cy="60" r="50" fill="#1E1E1E"/>
<circle cx="60" cy="60" r="30" fill="#F5A623"/>  <!-- This should be on top -->
```

Rendered, the orange circle is on top (correct by accident). If swapped:
```svg
<circle cx="60" cy="60" r="30" fill="#F5A623"/>
<circle cx="60" cy="60" r="50" fill="#1E1E1E"/>  <!-- Gray on top: wrong -->
```

**Prevention:** Prompt: "Elements are rendered in the order they appear in the SVG. Small elements should be after large ones so they appear on top."

**Detection:** Human review or VLM-judge on the rendered SVG.

**Remediation:** Reorder elements in the DOM tree (post-processing) or regenerate with explicit ordering instructions.

### 7.4 Mixed Stroke and Fill Styles

**Symptom:** Inconsistent appearance; some elements have 2px strokes, others 1.5px; some are filled, others outlined, in a way that breaks visual coherence.

**Root cause:** LLM doesn't maintain style consistency across multiple elements.

**Prevention:** Declare upfront: "All elements use the same stroke width (2px) and stroke-linecap/stroke-linejoin (round). No mixed fill and stroke on the same element."

**Detection:** Parse and histogram `stroke-width` and `fill` presence across all elements. Flag if more than two distinct stroke-widths or mixed fill/stroke per element.

**Remediation:** Normalize stroke width across elements and regenerate if style is critical.

### 7.5 Incorrect Boolean Operations

**Symptom:** Shapes that should be subtracted (hole in the middle) or intersected appear as overlapping instead.

**Root cause:** LLM does not understand SVG's fill-rule (`nonzero` vs. `evenodd`) and cannot express Boolean subtraction directly.

**Example:** To create a ring (outer circle minus inner circle), SVG needs `fill-rule="evenodd"` and a compound path:
```svg
<path d="M 60 20 A 40 40 0 1 1 60 100 A 40 40 0 1 1 60 20 M 60 40 A 20 20 0 1 0 60 80 A 20 20 0 1 0 60 40 Z" fill-rule="evenodd" fill="#000"/>
```

LLMs rarely produce this correctly without explicit instruction.

**Prevention:** Avoid Booleans in prompts. Use simpler shapes. If a ring is needed, generate it as a stroke-only circle (no fill): `<circle cx="60" cy="60" r="30" stroke="#000" stroke-width="5" fill="none"/>`.

**Detection:** VLM-judge on rendered output: does the ring look right, or does it look like two overlapping circles?

**Remediation:** Switch to stroke-only or regenerate with explicit `fill-rule="evenodd"` instruction in the prompt.

### 7.6 Literal Interpretation (Over-Detail)

**Symptom:** SVG has 40–100+ paths for a simple mark; many paths are "noise" that adds no visual value.

**Root cause:** LLM interprets the request too literally and adds unnecessary detail (shading, texture, multiple small strokes where one bold stroke would suffice).

**Prevention:** Prompt: "Use only 5–8 paths total. Favor bold, simple geometry over fine detail."

**Detection:** Count `<path>` elements. If >40 for a logo, likely over-detailed.

**Remediation:** Regenerate with explicit element budget: "Use at most 5 elements. Simplify all geometry."

### 7.7 Poor Optical Balance

**Symptom:** The rendered mark feels "off" — off-center, unbalanced, or unclear.

**Root cause:** LLM places elements mathematically centered but not optically centered. Text baselines are especially problematic.

**Prevention:** Prompt: "Position elements so the overall composition is optically balanced, not just mathematically centered. Test visually at 64×64 px."

**Detection:** Render at multiple sizes. Have a human (or VLM-judge) evaluate balance.

**Remediation:** Adjust individual element positions by 1–2 units or regenerate with more explicit positioning instructions.

### 7.8 Text Misspellings

**Symptom:** `<text>` element contains misspelled text ("SLATE" → "SLAT3").

**Root cause:** LLMs hallucinate characters, especially in short strings or when asked to spell out text verbally.

**Prevention:** 
- Avoid `<text>` entirely for critical wordmarks; use mark-only + composite.
- If `<text>` is necessary, prompt: "Spell the text character by character: S-L-A-T-E. Do not change any character."

**Detection:** OCR the rendered SVG at 256×256 px. Compute Levenshtein distance. If error > 1 character, flag.

**Remediation:** Regenerate mark-only; composite text separately or use a hand-authored `<text>` element with font embedding.

### 7.9 Broken ViewBox (Coordinate Overflow)

**Symptom:** SVG has a viewBox (e.g., `"0 0 100 100"`) but content extends beyond (e.g., a rect at `x="150" y="150"`).

**Root cause:** LLM misunderstands the viewBox as a suggestion or generates content outside its bounds.

**Prevention:** Prompt: "All coordinates must be within the viewBox. Content at coordinates outside `0..120` will be clipped."

**Detection:** Parse SVG; compute bounding box of all elements. Assert that all coordinates are within viewBox.

**Remediation:** Post-process: translate and scale offending elements to fit, or regenerate.

### 7.10 Sub-Pixel Rendering Issues

**Symptom:** At 16×16 or 32×32 render, the icon has jagged edges or appears thin/broken.

**Root cause:** Stroke widths or paths are designed for a large canvas and don't scale well. A 1px stroke at viewBox scale becomes 0.25px at 16×16.

**Prevention:** Prompt: "Stroke width must be at least 1 unit in viewBox space so it remains visible at 16×16 px."

**Detection:** Render at 16×16 px and visually inspect or compute pixel-level metrics (edge clarity).

**Remediation:** Increase stroke width or regenerate with bolder geometry.

---

## 8. The `svg-authoring` Skill Integration into P2A

### 8.1 Skill Anatomy

A dedicated `svg-authoring` skill would live alongside `logo`, `favicon`, `app_icon` in the skills directory and provide:

1. **Constraint system prompt.** The preamble that injects all geometry constraints, style rules, and failure-pattern awareness into Claude's context.

2. **Asset-type-specific templates.** Pre-filled prompts for each asset type (logo, favicon, icon, sticker, etc.) with the right viewBox, path budget, palette constraints.

3. **Validation checklist.** Post-generation checks (path count, coordinate range, render sanity) that Claude or the P2A pipeline runs automatically.

4. **Remediation recipes.** When generation fails (gigantic coordinates, misspelled text), explicit retry instructions rather than generic regenerate.

5. **Reference examples.** A library of 5–10 exemplary SVGs at each style level (flat, outlined, duotone, minimal) with annotations explaining why they work.

### 8.2 Skill Prompt (System Message)

```
You are an expert SVG author for production logos, icons, favicons, and brand marks.
Every SVG you write must:

CONSTRAINTS:
1. Use the specified viewBox and never exceed it.
2. Keep path/element count within budget (e.g., ≤40 for logos, ≤30 for favicons).
3. Use only the specified color palette (hex list).
4. Round all coordinates to integers (no decimals).
5. No external references: no <image>, <foreignObject>, data URIs, web fonts.
6. No gradients, filters, or shadows unless explicitly requested.

STYLE:
7. Choose one style from: flat/geometric, outlined, filled, duotone, isometric, minimal, brutalist.
8. Maintain stroke-width consistency across elements (or use 2–3 tiers deliberately).
9. Always set stroke-linecap="round" and stroke-linejoin="round" on outline elements.
10. Prefer <circle>, <rect>, <polygon>, <line> over <path> where possible.

COMPOSITION:
11. Center the subject in the safe zone (80% of viewBox for logos; 70% for favicons).
12. Ensure the mark is recognizable in silhouette (as a single-color fill).
13. Use negative space intentionally; avoid crowding.
14. Render mentally at 16×16, 64×64, and 1024×1024. Ask: is it still clear?

ACCESSIBILITY:
15. Include a <title> element: <title>Asset name</title>
16. Test contrast: if logo has text, ensure WCAG AA (4.5:1) on intended background.

QUALITY GATES:
- Do not emit gigantic coordinates outside the viewBox.
- Do not leave paths unclosed (all paths end with Z).
- Do not misspell text in <text> elements. If unsure, avoid <text>.
- Do not mix fill and stroke inconsistently across elements.
- Do not place small elements before large elements in the DOM (small = on top).

FAILURE RECOVERY:
If you cannot author an SVG within constraints (e.g., the concept requires photorealistic shading or dense detail):
- Say so explicitly: "This concept exceeds SVG authoring scope; recommend raster generation + vectorization."
- Suggest an alternative: "I can author a simplified geometric version, or route to diffusion + vtracer."
- Do not attempt and fail silently.

OUTPUT:
Emit a single ```svg code block with no explanation. No other text before or after.
```

### 8.3 Trigger Phrases and Routing

In the asset-enhancer SKILL.md, the router decides when to invoke `inline_svg` mode. The criteria:

- **Asset type** ∈ {logo, favicon, icon_pack, sticker, transparent_mark} AND
- **Complexity** ≤ 40 paths (heuristic based on concept description) AND
- **Text** is absent or simple (1–3 words, all-caps, sans-serif) AND
- **User signal** ("I want SVG", "make it editable", "flat design") OR
- **Fallback mode** (API key not available, must use LLM-only)

Trigger phrases for svg-authoring skill:
- "generate an svg logo"
- "write svg code for [asset]"
- "create a simple icon in svg"
- "make an editable favicon"
- "design an outlined icon"

### 8.4 Multi-Turn Iteration

One-shot SVG generation works for simple assets; iteration helps for complex ones. The skill should support:

1. **User feedback loop:** "Can you make the stroke thicker?" → LLM edits the SVG in-place (change `stroke-width="2"` to `stroke-width="3"`).
2. **Refinement prompts:** "Simplify the icon further" → LLM merges paths or removes detail.
3. **Variant generation:** "Show me the same logo in the dark-mode palette" → LLM swaps colors and regenerates.
4. **Export for production:** "I'll use this; please optimize it for the web" → P2A runs SVGO + renders at target sizes.

### 8.5 Integration with asset-enhancer

When `asset_enhance_prompt` is called:

```
user: "generate a logo for my note app"
↓ asset-enhancer classifies → asset_type="logo"
↓ checks: "Can this be inline_svg?" → YES (simple mark, no text)
↓ returns: modes_available=["inline_svg", "external_prompt_only", "api"]
↓ user selects "inline_svg"
↓ asset-enhancer calls svg-authoring skill with:
   - asset_type: "logo"
   - brief: "note app, flat design, blue and white"
   - svg_brief: {
       viewBox: "0 0 120 120",
       palette: ["#1E1E1E", "#F5A623"],
       path_budget: 40,
       safe_zone: 96,
       instructions: "Flat geometric design. Subject fills 70% of frame. No gradients."
     }
↓ svg-authoring emits: <svg>...</svg>
↓ asset_save_inline_svg validates + optimizes + exports
↓ returns: AssetBundle with master.svg, mark.png (1024²), favicon bundle
```

---

## 9. Prompt Examples by Asset Type

### Logo (Flat Geometric)

```
Design a logo mark for a note-taking app called "Slate".
Requirements:
- viewBox="0 0 120 120"
- Style: flat geometric
- Palette: #1E1E1E (dark), #F5A623 (accent)
- Maximum 5 elements
- Concept: Represent both "paper" (pages/notebook) and "slate" (edge/dark stone)
- Subject fills 70% of frame, centered
- No text
- Integer coordinates only
Output only the SVG.
```

### Favicon

```
Design a favicon for a productivity app.
Requirements:
- viewBox="0 0 64 64"
- Must be recognizable at 16×16 px
- Monocolor: #2563EB
- Outline style: stroke="currentColor", stroke-width="2", no fills
- stroke-linecap="round", stroke-linejoin="round"
- Maximum 3 paths
- Concept: A simple checklist or checkmark
Output only the SVG.
```

### Icon Pack (Multiple Icons, Lucide Style)

```
Design 5 icons for a fitness app in Lucide style.
Requirements:
- viewBox="0 0 24 24"
- Each icon: at most 2 paths
- Outline style: stroke="currentColor", stroke-width="2", fill="none"
- stroke-linecap="round", stroke-linejoin="round"
- Integer coordinates only
Concepts: [heart, dumbbell, running person, calendar, settings]
Output 5 separate <svg> blocks, one per icon.
```

### Sticker

```
Design a sticker for a meditation app.
Requirements:
- viewBox="0 0 200 160"
- Duotone: #4ECDC4 (teal), #FFE66D (yellow)
- Maximum 8 paths
- Concept: A serene figure in meditation pose with lotus flower
- Safe zone: 80% center (160×128)
- Rounded, friendly, no sharp angles
Output only the SVG.
```

### Minimal Logo (Single Concept)

```
Design a brutalist, minimal logo.
Requirements:
- viewBox="0 0 120 120"
- Monocolor: #000000
- Exactly one or two geometric shapes
- No detail or texture
- Brand: "Void" (a meditation/silence app)
Output only the SVG.
```

---

## 10. Research References and Decision Provenance

Every constraint and pattern in this skill is rooted in P2A research:

| Concept | Research Angle | Key Finding |
|---|---|---|
| LLM-SVG viability | 12d | Claude is the consensus leader for SVG code generation; constraint prompts move quality more than model upgrades |
| Prompt constraints | 12d | viewBox, element budget, stroke width, style reference (Lucide/Heroicons) are the quality levers |
| Failure modes | 12d | Gigantic coordinates, open paths, text misspellings, mixed styles are the dominant 70% of failures |
| Hybrid pipelines | 12e | Router-based dispatch beats single-model; LLM-SVG is tier-1 for simple marks; Recraft for complex; raster+vtracer for style-matched |
| Path budget by type | 12d + logo/favicon SKILLs | ≤40 paths logos, ≤30 favicons, ≤60 stickers is empirically valid |
| Favicon rendering | favicon SKILL.md | SVG must render clear at 16×16; stroke width ≥1 px in viewBox space; no detail <4 units |
| App icon safe zones | 9a (iOS HIG) | 824×824 center for 1024² canvas; 70% for favicons |
| WCAG contrast | asset-enhancer SKILL.md | Tier-1 validation; favicons must be ≥4.5:1 on white and dark backgrounds |
| SVGO optimization | 12d + 12e | Conservative preset; preserve viewBox; round to 2 decimals post-optimization |
| Style examples | 12d (pelican, practitioners) | Flat, outlined, duotone, isometric, minimal, brutalist are the six style families LLMs handle well |

---

## 11. Next Steps

To operationalize this skill:

1. **Create `skills/svg-authoring/SKILL.md`** with the full constraint system prompt and per-asset-type templates.

2. **Add `svg-authoring` to the skill registry** in asset-enhancer's `_skills.json` (or equivalent routing table).

3. **Write 10–15 reference SVGs** (one per style × asset type combination) and store them in `skills/svg-authoring/examples/`.

4. **Wire validation gates** in the P2A MCP server:
   - xmllint well-formedness check.
   - SVGLint with custom rules (no `<image>`, no gradients unless specified, viewBox presence).
   - resvg multi-size render (16, 64, 256, 1024) and sanity checks (bounding box, SSIM at small sizes).
   - SVGO post-process with conservative preset.

5. **Integrate with asset_save_inline_svg**:
   - Accept SVG string + asset_type.
   - Run validation pipeline.
   - Emit structured AssetBundle with variants (master.svg, master.png at 1024², favicon bundle if type=="favicon").

6. **Document the failure patterns** (Section 7) in the skill's troubleshooting guide so Claude can self-correct or escalate intelligently.

7. **Test against pelican-on-a-bicycle and other benchmarks** to validate that the constraints move Claude's output toward production-grade (simple, clean, commented, editable).

---

## Appendix: Comparative Costs and Model Choices

**LLM-SVG (inline_svg mode):**

> **Updated 2026-04-21:** Claude model references updated. The Claude 4.0-series (claude-sonnet-4-20250514, claude-opus-4-20250514) retires June 15, 2026 — migrate to claude-sonnet-4-6 or claude-opus-4-6 (released February 2026). Cost estimate below uses current Claude 4.6 pricing.

- Cost: ~$0.003 per request (Claude 4.6 / GPT-image-1.5 era LLM context, 2–5K tokens).
- Time: 1–3 seconds (including validation).
- Output: 400–2000 bytes (fully editable, resolution-independent).
- Best for: Logos, icons, favicons, stickers (simple geometry).

**Recraft V4 SVG (native vector, api mode):**

> **Updated 2026-04-21:** Recraft V4 is confirmed current production model family (released February 2026). V3 is superseded. V4 ships four variants: V4 (standard raster, ~10s), V4 Vector (native SVG, ~15s), V4 Pro (2048×2048 raster, ~30s), V4 Pro Vector (high-res native SVG, ~45s). Recraft remains the only model producing real editable SVG paths without raster-to-vector tracing. V4 Pro Vector handles more complex geometry than V3.

- Cost: ~$0.04 per request.
- Time: 10–20 seconds (V4 Vector); ~45s (V4 Pro Vector).
- Output: 1–10 KB (more complex, fully editable).
- Best for: Spot illustrations, mid-complexity marks, when LLM-SVG hits path budget or fails.

**Raster + vtracer (Pipeline C, api mode):**
- Cost: ~$0.005–$0.01 (Flux raster + local vtracer).
- Time: 30–60 seconds (includes rasterization and vectorization).
- Output: 10–50 KB (depends on vtracer settings and complexity).
- Best for: Style-matched assets, when the brand has a strong Flux/LoRA aesthetic.

**Decision tree:**
- **Try LLM-SVG first** (lowest cost, fastest). If success → done.
- **If LLM-SVG fails** (path budget exceeded, concept too complex, geometry broken) → escalate to Recraft.
- **If Recraft unavailable or user prefers style matching** → Flux + vtracer.
- **If asset is raster-destined** (OG image, hero, photo-realistic) → skip SVG, go raster.

---

## References

**Research documents (P2A):**
- 12d: "Programmatic SVG generation by LLMs"
- 12e: "Hybrid Vector Pipelines"
- 9a: "iOS App Icon HIG Specs"
- Favicon SKILL.md
- Logo SKILL.md
- asset-enhancer SKILL.md

**External sources:**
- Simon Willison's [pelican-on-a-bicycle benchmark](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/).
- [SGP-Bench](https://sgp-bench.github.io/) (Qiu et al., ICLR 2025).
- [StarVector](https://starvector.github.io/) (Rodriguez et al., CVPR 2025).
- SVGMaker docs: AI-Generated SVG Precision Issues.
- Houtini: How to Make SVGs with Claude and Gemini MCP.
- tryopendata labs: Using Claude as a Logo Design Agency.
- Rival.tips: Claude Opus 4.6 Minimalist Logo SVG.

> **Updated 2026-04-21:** "Claude Opus 4.1" reference above corrected to Claude Opus 4.6. Claude 4.0-series (claude-opus-4-20250514) retires June 15, 2026. Current model is claude-opus-4-6.

**Tooling:**
- [SVGO](https://github.com/svg/svgo) — SVG optimizer.
- [simple-icons/svglint](https://github.com/simple-icons/svglint) — SVG linter.
- [resvg](https://github.com/linebender/resvg) — fast SVG rasterizer.
- [vtracer](https://github.com/visioncortex/vtracer) — raster to SVG converter.
