---
category: 12-vector-svg-generation
angle: 12c
title: "SVG Spec Features That Matter for Asset Generation"
subtitle: "viewBox, preserveAspectRatio, gradients, filters, symbol/use, currentColor, animation, accessibility, and optimizer safety"
status: draft
last_updated: 2026-04-19
audience: prompt-to-asset skill authors, pipeline engineers, vector asset QA
related_angles:
  - 12a-vector-native-generation-models
  - 12b-raster-to-vector-pipelines
  - 12d-svg-generation-failures
  - 12e-svg-evaluation-and-postprocess
primary_sources:
  - "W3C — Scalable Vector Graphics (SVG) 2 Candidate Recommendation (2018, editor's draft updated through 2025), https://www.w3.org/TR/SVG2/"
  - "W3C — Scalable Vector Graphics (SVG) 1.1 Second Edition Recommendation (2011), https://www.w3.org/TR/SVG11/"
  - "W3C — CSS Masking Module Level 1 (CR 2021), https://www.w3.org/TR/css-masking-1/"
  - "W3C — Filter Effects Module Level 1 (WD 2022), https://www.w3.org/TR/filter-effects-1/"
  - "W3C — WAI-ARIA 1.2 & SVG Accessibility API Mappings (2024), https://www.w3.org/TR/svg-aam-1.0/"
  - "MDN — SVG element/attribute references, https://developer.mozilla.org/en-US/docs/Web/SVG"
  - "SVGO — SVG Optimizer README and plugin docs (v3.x, 2024), https://github.com/svg/svgo"
  - "Jake Archibald — 'Don't use preserveAspectRatio=\"none\"' and viewBox posts, https://jakearchibald.com/"
  - "Sara Soueidan — 'Understanding SVG Coordinate Systems and Transformations' series, https://www.sarasoueidan.com/blog/svg-coordinate-systems/"
  - "CSS-Tricks — 'A Complete Guide to SVG Fallbacks,' 'SVG `use` with External References, Take 2', https://css-tricks.com/"
  - "Chris Coyier — 'Cascading SVG Fill Color' (currentColor pattern), https://css-tricks.com/cascading-svg-fill-color/"
  - "web.dev — 'Optimize SVGs,' 'SVG and accessibility,' https://web.dev/"
  - "Can I Use — SMIL, CSS Houdini, clip-path, mask-image, filter support matrices (2026)"
  - "Chromium Bug 1067442 — SMIL animation deprecation status, https://bugs.chromium.org/p/chromium/issues/detail?id=1067442"
tags: [svg, viewBox, preserveAspectRatio, gradients, filters, symbol-use, currentColor, smil, css-animation, svgo, accessibility, aria]
---

## Executive Summary

SVG is the only raster-free format in the web asset stack. When a prompt-to-asset delivers an SVG, the file is not "a picture that scales" — it is a **document** with a coordinate system, a DOM, a styling cascade, an animation timeline, and an accessibility tree. Getting structure right is what separates a production asset (responsive logo, themeable icon, animatable illustration, screen-reader-announced hero) from a brittle blob that only looks right in one size and one color scheme.

The SVG 2 (and legacy SVG 1.1) features every asset pipeline must handle correctly:

1. **viewBox + preserveAspectRatio** — the single most common generator failure is a missing or mis-sized `viewBox`, making the asset un-scalable.
2. **`<symbol>` + `<use>`** — the only sane way to ship multiple icons in one file and the basis of every modern icon system (Heroicons, Lucide, Tabler, Material Symbols).
3. **`currentColor`** — the paint keyword that lets CSS `color` theme the icon. Trivially cheap and almost always omitted by generators.
4. **Gradients, clipPaths, masks, filters** — the expressive layer: filters for shadow/glow, clipPaths for hard cutouts, masks for soft alpha.
5. **Text: inline `<text>` vs paths** — editability/accessibility vs pixel-perfect cross-platform rendering. `@font-face` in SVG works in browsers but unreliably elsewhere.
6. **SMIL vs CSS keyframes vs JS** — SMIL is shipping but frozen, CSS is portable default, JS (GSAP, anime.js, Motion One, WAAPI) is where richness lives.
7. **SVGO safety** — default plugins silently strip IDs that `<use>` references, collapse animated groups, drop the `viewBox`, remove ARIA, and merge paths that CSS selectors target.
8. **Accessibility** — `<title>`, `<desc>`, `role="img"`, `aria-labelledby`, `aria-hidden`. Both missing and over-announced SVGs are common generator failures.

Structural rule: **treat every SVG as if it will be resized, recolored, animated, and read aloud.** Writing correct structure is nearly free; retrofitting it later is expensive.

## Feature Reference Table

| SVG feature | Spec source | Browser support (2026) | Why it matters for assets | Typical failure when missing/wrong |
|---|---|---|---|---|
| `viewBox` | SVG 2 §8.2 | Universal since 2011 | Establishes the user coordinate system; without it the SVG is fixed-size and un-scalable | Asset renders at 300×150 default and refuses to grow; or scales but crops |
| `preserveAspectRatio` | SVG 2 §8.3 | Universal | Controls how `viewBox` maps into `width`/`height` when aspect ratios differ | Icon squashed in flexbox containers; `none` stretches logos |
| `width` / `height` attrs | SVG 2 §8 | Universal | Become the *intrinsic* size; removing them lets CSS fully control sizing | Removed by some SVGO configs → layout shift in `<img>` contexts |
| `<symbol>` | SVG 2 §5.5 | Universal | Defines a reusable graphic with its own viewport; inert until `<use>`d | Sprite "works" but does not scale because `<symbol>` lacks `viewBox` |
| `<use>` | SVG 2 §5.6 | Universal (same-doc); partial for external + shadow-DOM CSS piercing | Enables sprites and reuse; external `<use href="sprite.svg#id">` supported in Chrome/Firefox/Safari, but styling across the boundary is limited | CSS from the host doesn't reach into shadow tree of an external use; fallback needed |
| `currentColor` | SVG 2 §11.2 / CSS Color | Universal | Inherits `color` from CSS → themeable icons with one fill property | Generators hardcode `#000` so icon can't be recolored without rewriting SVG |
| `<linearGradient>`, `<radialGradient>` | SVG 2 §14.6 | Universal | Core expressive primitive for logos, illustrations | Generators inline gradients with hardcoded coordinates tied to viewBox assumptions; broken on resize when `gradientUnits="userSpaceOnUse"` without care |
| `<pattern>` | SVG 2 §14.5 | Universal | Tiled fills | Rarely generated correctly by T2I-to-SVG; watch for patterns pretending to be gradients |
| `<clipPath>` | SVG 2 §14.4 / CSS Masking | Universal; `clipPathUnits="objectBoundingBox"` widely supported | Hard-edged cutouts; how rounded-square icons get the squircle shape | Clip path ID collisions between multiple inlined SVGs on the same page |
| `<mask>` | CSS Masking 1 | Universal | Soft/alpha cutouts, knockouts, grayscale transitions | Mask units confusion (`userSpaceOnUse` vs `objectBoundingBox`) causing empty render |
| `<filter>` + primitives (`feGaussianBlur`, `feOffset`, `feComposite`, `feColorMatrix`, `feTurbulence`, `feMerge`, `feDropShadow`) | Filter Effects 1 | Universal core; `feDropShadow` shortcut SVG 2 only | Shadows, glows, inner shadows, duotone, chromatic aberration, noise | Expensive filters on thousands of icons tank scroll perf; `filter-region` defaults cut off blur edges |
| `<foreignObject>` | SVG 2 §25 | Universal | Embed HTML inside SVG (charts, rich text) | Inconsistent across Safari pre-17; doesn't export to PDF cleanly |
| Inline `<text>` + `<textPath>` | SVG 2 §12 | Universal | Accessible, selectable, searchable text | Depends on font availability at render time; falls back unpredictably |
| `@font-face` inside SVG | SVG 2 §12.1 (CSS via `<style>`) | Works in browsers, **not** in most standalone viewers, Figma, macOS Quick Look, PowerPoint | Custom typography in portable SVG | Font fails to load in non-browser contexts → letters collapse to default sans |
| SMIL `<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>` | SVG 1.1 §19 | Firefox/Safari yes; Chrome "unships-then-reinstates" history (Chromium 1067442), currently supported but discouraged for new work | Declarative animation that travels with the file | Lost when SVG is exported to PDF/PNG; Chromium has threatened removal for a decade |
| CSS animations on SVG | CSS Animations 1 | Universal | Portable, composable, works with media queries (`prefers-reduced-motion`) | Can't animate attributes that aren't CSS properties in older browsers; SVG 2 added presentation-attribute-as-property for many, finally unifying the model |
| Web Animations API / JS animation (GSAP, anime.js, Motion One) | WAAPI Level 1 | Universal | Timeline control, morphing, scroll-linked, physics | Requires JS runtime; not embeddable in "just an SVG file" |
| `<title>`, `<desc>` | SVG 2 §5.4 | Universal | Accessible name/description; tooltip in some UAs | Missing → SVG unannounced by screen readers |
| `role="img"`, `aria-label`, `aria-labelledby`, `aria-hidden` | SVG AAM 1.0 / ARIA 1.2 | Universal | Correct AT mapping | Decorative icon reads "graphic" out loud on every focus |

## viewBox and preserveAspectRatio Correctness

`viewBox="min-x min-y width height"` establishes a user coordinate system and initial viewport mapping. Three rules cover most asset cases:

1. **Always emit a `viewBox`.** Without it, the SVG's intrinsic size is the `width`/`height` attributes, defaulting to `300×150` (SVG 2 §8.2). Omitting `width`/`height` while keeping `viewBox` is the preferred "fluid" form: CSS fully controls rendered size.
2. **Match the viewBox to the actual bounding box of drawn content.** A common failure is a `0 0 1024 1024` viewBox around a 48×48 icon — renders as a dot in one corner. Use the tight bounding box plus small optical padding (2–4 units for icons).
3. **Use `preserveAspectRatio` deliberately.** Default `xMidYMid meet` letterboxes (correct for logos/icons). `none` stretches to fill (destructive for logos, legitimate for decorative backgrounds). `slice` variants crop to fill (hero images, OG cards).

Non-square container gotcha: a 24×24 icon in a 32×24 flex item with `meet` letterboxes (icon smaller, centered); with `slice` it crops. One SVG cannot be both letterbox and banner without redrawing — supply two assets.

Text-layout gotcha: user-space units are not pixels. `font-size="14"` inside `viewBox="0 0 24 24"` is huge. Generators routinely miscalibrate this.

## Themeable Icons via `currentColor`

The `currentColor` keyword is the most important single feature for building icon systems that compose with modern CSS (including dark mode, accent colors, and design tokens). `fill="currentColor"` (and `stroke="currentColor"`) resolves to the computed value of the CSS `color` property on the element, which cascades from the host page.

The minimum viable themeable icon:

```svg
<svg viewBox="0 0 24 24" role="img" aria-label="Search" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 4a6 6 0 1 0 3.9 10.6l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0 0 10 4Z"
        fill="currentColor"/>
</svg>
```

Consumed by CSS: `.nav a { color: #64748b }`, `.nav a:hover { color: #0f172a }`, `@media (prefers-color-scheme: dark)` overrides. Every icon inside `.nav a` inherits without the SVG knowing. Compare to the naive `fill="#000000"` most T2I-to-SVG tools emit — that file is not an icon system, it is a bitmap wearing XML.

Generator rules:

- Default all glyph fills and strokes to `currentColor` unless the asset is a **polychrome** logo (what Heroicons and Material Symbols do).
- For two themeable colors, use CSS custom properties with `currentColor` fallback: `fill="var(--icon-accent, currentColor)"`.
- Avoid `style="fill: #000"` inline — inline style wins the cascade and breaks theming silently. Use the `fill` attribute so author CSS can override.

`<use>` sprites respect this: set `color` on the host `<svg>` and every referenced icon recolors in lockstep.

## Gradients, Clipping, Masking, Filters

**Gradients.** `<linearGradient>`/`<radialGradient>` go in `<defs>`, referenced via `fill="url(#brand-gradient)"`. Two unit modes:

- `gradientUnits="objectBoundingBox"` (default) maps `0–1` to the shape's bounding box. Stable under resize; recommended for icons.
- `gradientUnits="userSpaceOnUse"` uses absolute user coordinates. Required when one gradient spans multiple shapes, but breaks when viewBox is cropped.

Illustrator defaults to `userSpaceOnUse` with hardcoded coords — looks correct at export, breaks on crop.

**ClipPaths vs Masks.** `<clipPath>` is a hard geometric intersection (1-bit alpha); `<mask>` uses pixel luminance or alpha (`mask-type`) for soft cutouts. Rules:

- Rounded-square app-icon → `<clipPath>` with a `<rect rx="…">`.
- Soft fade or photo knockout → `<mask>`.
- App-icon safe zone → `<clipPath clipPathUnits="objectBoundingBox">` for a portable "clip to 88.2% of the square" (iOS squircle at 1024×1024).

**Filters.** The pipeline where shadows, glows, blurs, and color transforms live. Key primitives:

- `feGaussianBlur` (blur), `feOffset` (translate), `feFlood` + `feComposite operator="in"` (colorize), `feMerge` (stack), `feColorMatrix` (duotone/desaturate), `feTurbulence` (noise).
- `feDropShadow` (SVG 2 shortcut for offset + blur + flood + merge).

Default filter region `x="-10%" y="-10%" width="120%" height="120%"` clips blurs with `stdDeviation > ~5`. Emit explicit `x="-50%" y="-50%" width="200%" height="200%"` for larger blurs.

Filters are **expensive** — rasterization every paint. A page with 200 dropshadow-filtered icons chugs on scroll. Prefer CSS `filter: drop-shadow(...)` on the `<svg>` for UI shadows; reserve inline SVG filters for illustrations and hero art.

## Text and Font Embedding

Inline `<text>` is accessible, searchable, and i18n-friendly — and renders differently on any machine lacking the font. Three strategies:

1. **Inline text + host CSS web fonts.** Works in HTML with inline `<svg>`. Fails in `<img src>`, `background-image`, Figma, macOS Preview, PowerPoint — none inherit the page font stack.
2. **`@font-face` inside SVG `<style>`.** Works in browsers if the font URL is CORS-accessible. Base64-embedding makes it portable but 10×–50× larger. Non-browser renderers (Inkscape, rsvg, Illustrator, macOS Preview) have inconsistent support.
3. **Convert text to paths.** Identical rendering everywhere, no font needed. Loses selection/search/accessibility unless `<title>`/`<desc>` are added; larger for long text; not re-editable.

**Recommendation:** paths for **logos/wordmarks** (brand fidelity matters, text rarely edits); inline text for **icons/illustrations with short labels** only when they ship in the same HTML document as the font; offer text-to-paths as a pipeline post-step for portability. Always emit a resilient `font-family` stack (`"Inter", system-ui, sans-serif`).

## Animation Matrix

| Technique | Portability | Animatable properties | File-contained? | Pros | Cons |
|---|---|---|---|---|---|
| SMIL (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`) | Browsers (Chrome/FF/Safari); **no** in PDF, PNG export, most design tools | Any attribute, including geometry (`d`, `x`, `cx`) that CSS can't animate in old UAs | Yes | Declarative, file-local, path morphing works, `animateMotion` traces a path for free | Chromium threatened deprecation (Bug 1067442, 2015 → intent-to-remove paused); ecosystem treats it as frozen; tricky to coordinate with CSS transitions |
| CSS animations / transitions on SVG | Universal in browsers | Any SVG property exposed as CSS property in SVG 2 — includes `transform`, `opacity`, `fill`, `stroke`, `stroke-dashoffset`, `cx`/`cy`/`r` (SVG 2 promoted these to properties) | Yes (inside `<style>`) | Portable, composable, `prefers-reduced-motion` friendly, GPU-accelerated for `transform`/`opacity` | `d` attribute not universally animatable via CSS until recent browsers; no path morphing without JS |
| Web Animations API | Universal in browsers | Same as CSS + programmatic control | Requires JS in-page | Timeline control, reverse/pause, composable | Not embeddable in a standalone `.svg` file without inline script (which is often stripped) |
| GSAP (MorphSVG, DrawSVG, MotionPath plugins) | Browser with GSAP loaded | Arbitrary including path morphing | No (external dep) | Industry standard for rich motion; handles IE-era quirks gracefully (historical); path morphing, FLIP, scroll-trigger | Licensing for some plugins (Club GreenSock); size if you only use a little |
| anime.js v4 | Browser | Arbitrary, including SVG path stroke drawing | No (small dep) | Small, MIT, good SVG support | Less powerful morphing than GSAP MorphSVG |
| Motion One / Framer Motion (for React) | Browser | CSS-animatable + layout | No | Tiny (Motion One ~5 KB), declarative API | React ecosystem-coupled in Framer Motion's case |
| Lottie (Bodymovin export from After Effects) | Browser (lottie-web), native iOS/Android via Lottie SDKs | Richer than SVG: shape layers, masks, expressions, time-remap | External JSON + runtime | Designer-friendly workflow, cross-platform | Not an SVG; requires runtime; large files |

**Heuristic for generator output:**
- *Hover/focus/state transitions*: CSS animations inline.
- *Stroke-reveal drawing*: CSS animating `stroke-dasharray`/`stroke-dashoffset`, with SMIL fallback for legacy.
- *Shape morphing*: JS (GSAP MorphSVG, Flubber) or SMIL values-on-`d`.
- *Scroll- or gesture-driven*: JS.
- *Self-contained `<img src="…svg">` that must play*: SMIL (only technique that runs inside `<img>`; inline-SVG-CSS fires but JS is blocked).

Always pair motion with `@media (prefers-reduced-motion: reduce)`. Unconditional animation fails WCAG 2.3.3.

## SVGO Optimization Safety

SVGO cuts 30–80% from Illustrator output, but default plugins are hostile to interactivity and animation. Common silent breakage:

- **`removeViewBox`** — strips `viewBox` when `width`/`height` exist; SVG becomes non-responsive. **Always disable.** Modern SVGO v3+ defaults off; legacy pipelines and Illustrator SVGO-Web export still ship it on.
- **`cleanupIds` / `removeUnusedIds`** — drops IDs not referenced internally. Breaks external `<use xlink:href="sprite.svg#icon-foo">`, CSS `#id` selectors, JS animation hooks. Use with a `preserve` prefix list (`icon-`, `gradient-`).
- **`collapseGroups`** — removes `<g>` wrappers whose transforms fold into children. Breaks CSS animations and SMIL anchored to the group.
- **`mergePaths`** — merges sibling `<path>` elements; breaks per-path animation (letter-by-letter wordmark tween).
- **`removeHiddenElems`** — removes `opacity:0`/`display:none` elements that JS toggles later.
- **`convertShapeToPath`** — fine for static, breaks CSS animation of `cx`, `r`, etc.
- **`removeUnknownsAndDefaults`** — can strip `role`, `aria-*`. Set `keepRoleAttr: true`.
- **`removeTitle`**, **`removeDesc`** — **destroy accessibility.** Disable for user-facing SVGs.

Safe-for-interactive preset (pseudo-config):

```js
{
  plugins: [
    { name: 'preset-default', params: { overrides: {
      removeViewBox: false,
      cleanupIds: { preserve: ['icon-', 'gradient-', 'clip-', 'mask-', 'filter-'] },
      collapseGroups: false,
      mergePaths: false,
      removeHiddenElems: false,
      removeTitle: false,
      removeDesc: false,
      removeUnknownsAndDefaults: { keepRoleAttr: true, keepDataAttrs: true },
    } } },
    'removeDimensions',
  ],
}
```

`removeDimensions` deliberately strips `width`/`height` for fluid sizing while keeping `viewBox`. For static HTTP-served icon sprites, a separate "aggressive" preset (enabling `mergePaths`, `collapseGroups`) is fine if interactivity tests still pass.

## Accessibility Essentials

SVG accessibility is governed by SVG-AAM. The rules are small and almost universally ignored by generators.

**Informative SVGs** (logos, illustrations, meaningful icons):

```svg
<svg role="img" aria-labelledby="t d" viewBox="…">
  <title id="t">Acme logo</title>
  <desc id="d">Blue mountain mark with bold sans-serif wordmark.</desc>
</svg>
```

- `role="img"` — required; some older AT/browser combos (pre-2020 Safari/VoiceOver) ignore SVGs without it.
- `<title>` — accessible name; keep first child (SVG 1.1 convention, SVG 2 relaxes).
- `<desc>` — long description; recommended for illustrations.
- `aria-labelledby` — binds both as name/description across all engines.

**Decorative SVGs** (icon next to labeled text, pure ornament):

```svg
<svg aria-hidden="true" focusable="false" viewBox="…">…</svg>
```

`focusable="false"` prevents legacy IE focus-traversal surprises.

**Interactive SVGs** (custom slider, clickable map): use proper ARIA roles per element, label each, ensure keyboard reachability, respect `prefers-reduced-motion`. A "logo" that is also a link should have its accessible name on the enclosing `<a>`, not only on the SVG.

## Practical Takeaways for the Prompt-Enhancer

- **Template every SVG** with `xmlns`, `viewBox`, `role`, `<title>`, `<desc>`.
- **Default monochrome icons to `currentColor`.**
- **Reject output without a viewBox** — the best quality signal.
- **Never `preserveAspectRatio="none"`** outside background fills.
- **Configure SVGO per asset class** — sprites, logos, animated illustrations, hero art all differ.
- **Path-outline logos**, inline-text UI labels, warn on `@font-face` portability outside browsers.
- **Gate animation** behind `prefers-reduced-motion`.
- **Prefer CSS over SMIL** for new work, but keep SMIL for `<img src>` self-contained animation.

## References

- W3C — SVG 2 Candidate Recommendation: https://www.w3.org/TR/SVG2/
- W3C — SVG 1.1 Second Edition: https://www.w3.org/TR/SVG11/
- W3C — Filter Effects Module Level 1: https://www.w3.org/TR/filter-effects-1/
- W3C — CSS Masking Module Level 1: https://www.w3.org/TR/css-masking-1/
- W3C — SVG Accessibility API Mappings 1.0: https://www.w3.org/TR/svg-aam-1.0/
- MDN — SVG reference index: https://developer.mozilla.org/en-US/docs/Web/SVG
- MDN — `<use>`, `<symbol>`, `currentColor`, `preserveAspectRatio`, `filter`: https://developer.mozilla.org/en-US/docs/Web/SVG/Element
- SVGO — https://github.com/svg/svgo (README + `plugins/` docs)
- Sara Soueidan — "Understanding SVG Coordinate Systems and Transformations" (3-part series): https://www.sarasoueidan.com/blog/svg-coordinate-systems/
- Chris Coyier — "Cascading SVG Fill Color": https://css-tricks.com/cascading-svg-fill-color/
- CSS-Tricks — "SVG `use` with External References, Take 2": https://css-tricks.com/svg-use-external-reference-take-2/
- Jake Archibald — "preserveAspectRatio" posts: https://jakearchibald.com/
- Chromium Bug 1067442 — SMIL deprecation: https://bugs.chromium.org/p/chromium/issues/detail?id=1067442
- web.dev — "Optimize SVGs": https://web.dev/articles/optimize-svg-images
- Can I Use — SMIL, filter, mask, clip-path, `currentColor`, WAAPI: https://caniuse.com/
- GSAP — MorphSVG, DrawSVG, MotionPath: https://gsap.com/docs/v3/Plugins/
- anime.js v4 — https://animejs.com/
- Motion One — https://motion.dev/
- LottieFiles / lottie-web — https://github.com/airbnb/lottie-web
