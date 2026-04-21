---
category: 11-favicon-web-assets
angle: 11e
title: Performance, SEO, and Accessibility for Generated Web Assets
author: research-subagent-11e
date: 2026-04-19
status: draft
tags:
  - core-web-vitals
  - lcp
  - cls
  - seo
  - structured-data
  - wcag
  - en-301-549
  - compression
  - pngquant
  - oxipng
  - svgo
  - cwebp
  - favicon
  - og-image
  - knowledge-panel
sources_primary:
  - https://web.dev/articles/optimize-lcp
  - https://web.dev/fetch-priority/
  - https://web.dev/optimize-cls/
  - https://developers.google.com/search/docs/appearance/structured-data/logo
  - https://developers.google.com/search/docs/appearance/favicon-in-search
  - https://www.w3.org/TR/WCAG22/
  - https://www.w3.org/WAI/tutorials/images/decision-tree/
  - https://github.com/shssoichiro/oxipng
  - https://pngquant.org/
  - https://github.com/svg/svgo
  - https://developers.google.com/speed/webp/docs/cwebp
---

# 11e — Performance, SEO, and Accessibility for Generated Web Assets

## Executive Summary

An asset-generation system is only useful if its outputs survive the last mile: the browser, the search crawler, and the screen reader. A "perfect" transparent 4096×4096 PNG logo is a **net liability** if it ships unoptimized into a `<img>` tag without width/height attributes — it blows the LCP budget, triggers CLS, and may never appear in Google's Knowledge Panel because it doesn't satisfy the 112×112 structured-data minimum, or fails Bing's MIME-type checks. This document codifies what a prompt-enhancement / asset-generation pipeline must emit **alongside** the raw pixels so downstream tooling (`next/image`, Vite, Astro, hand-written HTML) has everything it needs:

1. **Size budgets per asset class** (favicon, apple-touch, manifest icons, OG, hero) in bytes, not just pixels.
2. **A deterministic compression pipeline** — pngquant → oxipng for raster, SVGO for vector, cwebp/avifenc for modern formats — with recommended flags.
3. **Core Web Vitals instrumentation** — `width`/`height`/`aspect-ratio` for CLS, `fetchpriority="high"` + `decoding="async"` + preload for LCP, `loading="lazy"` for below-the-fold.
4. **Accessible defaults** — WCAG 2.2 / EN 301 549 compliant `alt` conventions that distinguish decorative, informative, and functional images.
5. **SEO structured data** — `schema.org/Organization.logo` at ≥112×112 on a white background, favicon markup Bing and Google actually honor.

The rest of this file is intentionally a **reference**, not prose — it is written so the prompt-enhancement skill can paste numbers, flags, and HTML snippets directly into generated artifacts.

## Size Budget Table

Every number below is a **gzipped/brotli-encoded-on-the-wire** budget. Raster targets assume lossy-but-imperceptible compression. SVG budgets are *minified* bytes.

| Asset class                              | Pixel dimensions       | Format (primary / fallback) | Target file size    | Hard ceiling | Notes                                                                                   |
|------------------------------------------|------------------------|-----------------------------|---------------------|--------------|-----------------------------------------------------------------------------------------|
| `favicon.ico` (multi-res fallback)       | 16, 32, 48 packed      | ICO                         | 5–10 KB             | 15 KB        | Legacy-only; modern browsers prefer the SVG/PNG links.                                   |
| `icon.svg` (scalable tab favicon)        | viewBox-only           | SVG                         | 0.5–2 KB            | 5 KB         | Run through SVGO; inline embed if page is SSR/static.                                   |
| `icon-32.png`                            | 32×32                  | PNG8 (indexed)              | 0.5–2 KB            | 4 KB         | 8-bit palette is plenty; avoid 32-bit RGBA for this size.                               |
| `icon-192.png` (PWA manifest)            | 192×192                | PNG                         | 8–20 KB             | 30 KB        | Android install prompt; must *not* be a maskable-only icon.                             |
| `icon-512.png` (PWA splash)              | 512×512                | PNG                         | 20–40 KB            | 60 KB        | Also used by iOS 16+ web-app splash.                                                    |
| `apple-touch-icon.png`                   | 180×180                | PNG, **solid background**   | 15–35 KB            | 50 KB        | Apple composites against black → no transparency; avoid rounded corners (iOS masks).    |
| `maskable-icon.png` (PWA)                | 512×512 with 20% pad   | PNG                         | 20–40 KB            | 60 KB        | Safe zone = central 80%; outer ring gets cropped into circle/squircle/rounded.          |
| `og-image.jpg` (social share)            | 1200×630               | JPEG (q≈82) or WebP         | 80–180 KB           | 300 KB       | Facebook hard cap is 8 MB, but most scrapers timeout around 1 MB. Keep <300 KB.         |
| `twitter-card.jpg` (summary_large_image) | 1200×628               | JPEG or WebP                | 80–180 KB           | 300 KB       | Twitter/X internally re-encodes to JPEG; don't ship PNG unless you need transparency.   |
| Hero / LCP image                         | 2× device width, max 1600w | AVIF → WebP → JPEG       | 60–150 KB (1× DPR)  | 200 KB       | Drives LCP. Must ship `srcset` + `sizes` + explicit dimensions + `fetchpriority="high"`.|
| In-page illustration (below fold)        | 2× intrinsic           | AVIF → WebP → PNG           | 30–80 KB            | 150 KB       | `loading="lazy"` + `decoding="async"`.                                                  |
| Organization logo (structured data)      | ≥112×112, ideally 512² | PNG or WebP, **white bg**   | 10–50 KB            | 100 KB       | Must render correctly on a pure-white background (Google's 2021+ rule).                 |

Heuristic: for every pixel you render, budget roughly **0.05–0.15 bytes/pixel** for "fast-web" photos and **0.02–0.08 bytes/pixel** for UI illustrations. A 1200×630 OG image at 0.1 B/px ≈ 75 KB — match that with `-q 82` WebP or `-q 85` MozJPEG.

## Compression Pipeline

The pipeline is a **two-stage DAG**: (1) a *quality-reducing* pass that maps HD generator output to the target palette/precision, (2) a *lossless entropy* pass that squeezes every remaining byte. The pipeline must be idempotent — re-running it must not degrade further.

```
              ┌─────────────────────────┐
raster  ─────▶│ 1. pngquant  (lossy)    │──▶┐
(RGBA PNG)    │    --quality 65-85      │   │    ┌──────────────────────┐
              │    --speed 1            │   ├───▶│ 2. oxipng (lossless) │──▶ *.png
              │    --strip              │   │    │    -o max --strip safe│
              └─────────────────────────┘   │    │    --alpha            │
                                            │    └──────────────────────┘
raster  ──────────────────────────────────▶ │
(photo)                                     │    ┌──────────────────────┐
                                            ├───▶│ 2b. cwebp             │──▶ *.webp
                                            │    │    -q 80 -m 6         │
                                            │    │    -sharp_yuv         │
                                            │    └──────────────────────┘
                                            │
                                            │    ┌──────────────────────┐
                                            └───▶│ 2c. avifenc           │──▶ *.avif
                                                 │    -q 70 -s 4 -j all  │
                                                 └──────────────────────┘

vector  ─────▶ svgo --multipass --precision=2 --config=svgo.config.js ───▶ *.svg
```

### Recommended flags (copy-paste ready)

**pngquant** — lossy palette reduction for flat / UI graphics:

```bash
pngquant --quality=65-85 --speed 1 --strip --skip-if-larger --output out.png -- in.png
```

- `--quality=65-85`: if it can't hit quality ≥65, it fails (falls back to original).
- `--speed 1`: slowest, best quality (build-time tool, not request-time).
- `--strip`: drop metadata (EXIF, colorProfile, textual chunks).

**oxipng** — lossless PNG post-pass:

```bash
oxipng -o max --strip safe --alpha --zopfli out.png
```

- `-o max` (was `-o 6`): try every filter/strategy.
- `--strip safe`: keep only color profile & transparency chunks.
- `--alpha`: optimize alpha channel (sometimes reduces to tRNS).
- `--zopfli`: slow but produces the smallest deflate stream; drop it for hot dev loops.

**SVGO** — config for generated logos/icons:

```js
// svgo.config.js
module.exports = {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    { name: 'preset-default', params: { overrides: {
      removeViewBox: false,        // we need viewBox for responsive SVG
      cleanupIds: { minify: true },
      convertColors: { currentColor: false }, // keep literal colors for brand fidelity
    }}},
    'removeDimensions',            // prefer viewBox over width/height
    'sortAttrs',
    { name: 'removeAttrs', params: { attrs: '(data-name|sketch:.*|figma:.*)' }},
  ],
};
```

Typical reductions: Gemini/Recraft SVG output 40–90 KB → 2–6 KB after SVGO (90%+ savings from unused defs, rounded coordinates, duplicate paths).

**cwebp** — lossy WebP:

```bash
cwebp -q 80 -m 6 -mt -sharp_yuv -metadata none -o out.webp in.png
```

- `-q 80`: the sweet spot for web graphics (VMAF ≥95 vs source).
- `-m 6`: slowest method, best compression.
- `-sharp_yuv`: higher-quality RGB→YUV conversion, avoids color banding in gradients (critical for generated logos).

**avifenc** — AVIF:

```bash
avifenc --min 20 --max 30 --speed 4 --jobs all --yuv 420 in.png out.avif
# or simpler:
avifenc -q 70 -s 4 -j all in.png out.avif
```

AVIF beats WebP by ~20–30% at equivalent perceived quality but costs 5–10× encode time. Only worth it for hero images and OG cards that ship to millions of views.

### Pipeline budget guarantees

For a typical 1024×1024 Gemini-generated transparent logo:

| Stage                       | Output size (RGBA PNG) | Delta         |
|-----------------------------|------------------------|---------------|
| Generator raw output        | 1.8 – 3.2 MB           | —             |
| After pngquant `65-85`      | 180 – 450 KB           | −85%          |
| After oxipng `-o max`       | 150 – 380 KB           | −10% extra    |
| After cwebp `-q 85 -lossless` | 90 – 220 KB          | −40% vs PNG   |

If you're serving at 512×512 or 192×192 (the realistic PWA sizes), divide by 4–25×.

## CWV Impact Analysis

Core Web Vitals are the Google-ranking-signal floor for image-heavy pages. The three metrics image assets influence are **LCP** (Largest Contentful Paint — ≤2.5 s at p75), **CLS** (Cumulative Layout Shift — ≤0.1), and, indirectly, **INP** via decode cost on the main thread.

### LCP: image-as-LCP-element

~70–76% of webpages have an image as their LCP element (HTTPArchive 2024; `fotolince.com/blog/core-web-vitals-image-optimization-2025`). The LCP budget decomposes into four sub-phases: **TTFB** → **resource load delay** → **resource load duration** → **element render delay**. Asset generation can collapse the middle two:

1. **Discoverability.** The LCP image URL must be in the initial HTML so the browser's preload scanner can start the fetch before JS executes. CSS `background-image`, JS-set `src`, and React-only `<Image>` props defeat this. Emit plain `<img src=…>` for LCP elements.
2. **`fetchpriority="high"`.** Only 15% of sites use it (up from 0.03% in 2022; `unlighthouse.dev`). Typical win: 100–400 ms LCP reduction. Every generated hero snippet must include it.
3. **Preload link.** For responsive LCP images, emit a matching `<link rel="preload" imagesrcset="…" imagesizes="…" fetchpriority="high">` in `<head>`. This lets the browser pick the right size before it has parsed the `<img>` in the body.
4. **Format laddering.** AVIF (1.8–2.2 s typical LCP) → WebP (2.1–2.6 s) → JPEG (2.8–3.4 s). If your p75 LCP is stuck at 2.9 s on JPEG, switching formats is worth more than any CDN tweak.

**Generator-emitted LCP snippet (reference):**

```html
<link rel="preload" as="image"
      imagesrcset="/hero-640.avif 640w, /hero-1024.avif 1024w, /hero-1600.avif 1600w"
      imagesizes="(max-width: 768px) 100vw, 1024px"
      fetchpriority="high">

<picture>
  <source type="image/avif"
          srcset="/hero-640.avif 640w, /hero-1024.avif 1024w, /hero-1600.avif 1600w"
          sizes="(max-width: 768px) 100vw, 1024px">
  <source type="image/webp"
          srcset="/hero-640.webp 640w, /hero-1024.webp 1024w, /hero-1600.webp 1600w"
          sizes="(max-width: 768px) 100vw, 1024px">
  <img src="/hero-1024.jpg"
       width="1024" height="576"
       alt="Team reviewing quarterly dashboards on a shared screen"
       fetchpriority="high"
       decoding="async">
</picture>
```

### CLS: dimension-less images are 60–62% of the problem

CoreWebVitals.io and web.dev agree that images and embedded media account for the majority of CLS in the wild. The fix is cheap and deterministic:

- **Always emit `width` and `height` HTML attributes in CSS pixels** (the intrinsic ratio, not the rendered pixel ratio). Modern browsers compute `aspect-ratio: auto W / H` from these, reserving the box before the bytes arrive.
- **Pair with CSS** `img { height: auto; max-width: 100%; }`. Never set `width: auto` on a dimensional image — that voids the aspect-ratio reservation and the image renders 0×0 until load.
- **For art-directed `<picture>` sources** (different aspect ratios per breakpoint), use `aspect-ratio` on the wrapping element *per breakpoint* — HTML attributes alone describe only the `<img>` fallback.
- **Lazy images** still need dimensions; `loading="lazy"` doesn't fix CLS, it only delays when the layout shift *would* happen.

### INP / decode cost

`decoding="async"` tells the browser it may decode off the main thread — this is almost always what you want except for the single LCP image, where you want `decoding="sync"` or simply `fetchpriority="high"` (implicitly sync-ish). For below-the-fold: `loading="lazy" decoding="async"`.

### Favicon-specific CWV note

Favicons are blocking requests on the *critical path* in Chrome, Firefox, and Safari (the browser fetches `/favicon.ico` speculatively on most navigations). A 200 KB favicon hurts TTFB-adjacent timings, and a 404 favicon burns a full round-trip + retry. Always ship a real favicon — either `/favicon.ico` or an `<link rel="icon">` declaration — and keep its total wire size under 15 KB.

## WCAG / A11Y Checklist

WCAG 2.2 (operative since Oct 2023, approved as ISO/IEC international standard in 2025) and EN 301 549 v3.2.1 (EU public-sector requirement, currently normatively referencing WCAG 2.1 AA but commonly audited against 2.2) govern image accessibility.

> **Updated 2026-04-21:** EN 301 549 **v4.1.1** is expected in 2026 and will normatively incorporate WCAG 2.2 (in support of the European Accessibility Act, EU 2019/882). Until v4.1.1 is published, v3.2.1 (WCAG 2.1 AA) remains the legal baseline for EU public-sector web content, but auditors routinely apply WCAG 2.2 AA in practice. Treat WCAG 2.2 AA as your target ceiling to be compliant with both current and forthcoming EN 301 549. The relevant success criteria:

- **1.1.1 Non-text Content (Level A)** — every non-text element needs a programmatically determinable text alternative.
- **1.4.5 Images of Text (Level AA)** — avoid baking text into raster images unless (a) essential (logos/wordmarks) or (b) user-customizable.
- **1.4.11 Non-text Contrast (Level AA)** — UI components and meaningful graphics need ≥3:1 contrast against adjacent colors.
- **2.5.8 Target Size (Minimum) (Level AA, WCAG 2.2 new)** — 24×24 CSS-px minimum for interactive targets including image buttons/icons.

### Alt-text decision tree (generator defaults)

A prompt-to-asset should *automatically* classify each asset into one of these buckets and emit the corresponding default, then let the caller override:

| Image role                                  | `alt` default                                   | Example                                                       |
|---------------------------------------------|-------------------------------------------------|---------------------------------------------------------------|
| Decorative / purely visual                  | `alt=""` (empty, **not missing**)               | Background pattern, divider, brand flourish.                  |
| Informative (conveys content)               | Concise description of the *information*        | Chart: "Sales up 30% QoQ in EMEA".                            |
| Functional (inside a link/button)           | Describe the *action*, not the image            | Logo linking home: `alt="Home"` not `alt="Acme logo"`.        |
| Complex (chart, diagram)                    | Short alt + long description (`aria-describedby` / `<figcaption>`) | Architecture diagram with detailed `<figcaption>`. |
| Logo used as logo (not a link)              | Brand/org name                                  | `alt="Acme Inc."`                                             |
| Image of text (unavoidable)                 | The *text itself*, verbatim                     | Banner that reads "Sale ends Friday" → `alt="Sale ends Friday"`.|
| CAPTCHA                                     | Describe *purpose* + provide alternative        | `alt="Type the characters shown"` + audio CAPTCHA.            |

Rules the generator should enforce:

1. **Never emit `alt` with the filename** (`alt="hero-1024.jpg"`) — common default that is technically non-empty but communicates nothing.
2. **Never start alt with "Image of" / "Picture of"** — screen readers already announce the role.
3. **Length**: informative alts should be ≤125 chars (JAWS/NVDA cut-off); use `aria-describedby` or `<figcaption>` for longer descriptions.
4. **Decorative images used as CSS `background-image`** don't need alt, but make sure they're not conveying information that would then be missing for SR users.
5. **SVG with inline text**: set `role="img"` + `<title>`/`<desc>` children, or `aria-label` on the `<svg>` element. Remove decorative SVG from the accessibility tree with `aria-hidden="true"`.
6. **Logo in header that links to home**: one link with `alt="Home"` (not two links — the W3C Tutorial's "Functional Images" page is explicit on this).
7. **Color-only meaning** (e.g., a red status dot): add text or an icon; color alone violates 1.4.1.
8. **Target size** (WCAG 2.2): image buttons must be ≥24×24 CSS px of tappable area, with ≥24 px spacing if smaller.

### EN 301 549 specifics

EN 301 549 §9 inherits WCAG, but §5 (generic accessibility) and §6 (ICT with two-way voice) add procurement-level requirements. For generated web assets: treat WCAG 2.2 AA as your ceiling and you're compliant with EN 301 549 for web content.

### Automated lint checks the pipeline should run

- `html-validate` / `axe-core` / `pa11y` rule: `img-alt`, `img-redundant-alt`, `img-alt-long`.
- `svg-accessibility-checker` for inline SVG.
- A custom check: no image over 24×24 CSS px in an interactive context without a 3:1 contrast or visible border.

## SEO Structured Data Reference

Two distinct SEO surfaces consume generated assets: **favicons** (the little icon next to search results / browser tabs / Knowledge Panel thumbnails) and **`Organization.logo`** (the Google Knowledge Panel logo + "Sitelinks" tile).

### 1. Favicons that Google and Bing will actually use

Google's favicon documentation (`developers.google.com/search/docs/appearance/favicon-in-search`) requires (last updated 2026-02-04):

> **Updated 2026-04-21:** Google updated its favicon guidelines in late 2024. The hard minimum is now **8×8 px** (any square, at least 8 px per side), but Google recommends **≥48×48 px** and ideally a multiple of 48 (48, 96, 144, 192 …). SVG favicons have no specific size constraint. Google now accepts `rel="icon"` as the primary signal; `rel="shortcut icon"` and `rel="apple-touch-icon"` are also honoured as fallbacks. The "multiple of 48px" requirement that appeared in older documentation has been softened to a strong recommendation; an 8×8px favicon satisfies the minimum but will render poorly.

- **Minimum**: 8×8 px square raster, or SVG (no size constraint).
- **Recommended**: ≥48×48 px; ideally a multiple of 48 (48, 96, 144, 192 …) for crisp rendering across surfaces.
- The file must be crawlable (not blocked by robots.txt).
- `rel` attribute value of `icon`, `shortcut icon`, or `apple-touch-icon` are all accepted.
- Content-Type header matching the format (`image/png`, `image/svg+xml`, `image/x-icon`).
- A recognizable square logo — Google may ignore favicons that are "inappropriate" or replaced with a default globe icon.

**Bing** (from the Microsoft Q&A + Bing Webmaster FAQ):

- Minimum 16×16, but Bing also uses 144×144 tiles (`msapplication-TileImage` meta tag).
- Must return HTTP 200 (not 301/302 to a login, not 404), with correct MIME type.
- Accepts `.ico`, `.png`, `.svg`.

**Minimum generator-emitted HTML**:

> **Updated 2026-04-21:** Use `sizes="32x32"` (not `sizes="any"`) on the `.ico` link. The `sizes="any"` value causes Chrome to download **both** the ICO and SVG, preferring the ICO — the bug was documented by Evil Martians and the fix (pinning to `32x32`) has been the recommendation since mid-2023. The `msapplication-TileImage`/`msapplication-TileColor` meta tags are IE11 / Windows 8 legacy (IE11 EOL June 2022) and are no longer read by Chromium Edge in PWA contexts — the web app manifest `theme_color` takes over. They are retained here only as a reference for legacy-mode output.

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<!-- Legacy only (IE11 / Win8 pinned-site): -->
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-TileImage" content="/icon-144.png">
<meta name="theme-color" content="#ffffff">
```

### 2. `schema.org/Organization.logo` (the Knowledge Panel logo)

Per Google's Logo structured-data docs (`developers.google.com/search/docs/appearance/structured-data/logo`):

- **Minimum 112×112 pixels.**
- Uploaded at 512×512 gives Google the best rendering flexibility.
- Supported formats: PNG, WebP, SVG, JPEG, GIF. PNG/WebP preferred.
- **Must display correctly on a purely white background** (explicit since Nov 2021 — transparent logos with white content are rejected).
- URL must be crawlable (no robots.txt block) and served over **HTTPS**.
- File size: 10–100 KB optimal.

**Reference JSON-LD emitted by the pipeline**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Inc.",
  "url": "https://acme.example/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://acme.example/logo-512.png",
    "width": 512,
    "height": 512,
    "contentUrl": "https://acme.example/logo-512.png"
  },
  "sameAs": [
    "https://twitter.com/acme",
    "https://www.linkedin.com/company/acme"
  ]
}
</script>
```

Validation: **Rich Results Test** (`search.google.com/test/rich-results`) + **Schema Markup Validator** (`validator.schema.org`). The generator's "done" step should run both in CI against a staging URL.

### 3. OG / Twitter Card meta

```html
<meta property="og:type" content="website">
<meta property="og:title" content="Acme — AI notes for teams">
<meta property="og:description" content="Capture, link, and search every meeting.">
<meta property="og:image" content="https://acme.example/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Acme dashboard showing linked meeting notes">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://acme.example/og-image.jpg">
<meta name="twitter:image:alt" content="Acme dashboard showing linked meeting notes">
```

Common failures the generator must guard against:

- Relative URLs (Facebook scraper doesn't resolve them reliably) → always absolute HTTPS.
- Missing `og:image:width`/`height` → Facebook first render is a placeholder, shows stale image for hours.
- PNG with transparency → Twitter/X re-encodes with a black/white matte; ship JPG or pre-matted PNG.
- `og:image:alt` missing → fails accessibility audits *and* loses screen-reader context on mastodon/threads.

## References

### Core Web Vitals & performance
- Google — "Optimize Largest Contentful Paint": <https://web.dev/articles/optimize-lcp>
- Google — "Optimize Cumulative Layout Shift": <https://web.dev/optimize-cls/>
- Google — "Fetch Priority API": <https://web.dev/fetch-priority/>
- Google — "Responsive images": <https://web.dev/learn/images/responsive-images>
- CoreWebVitals.io — "Images and CLS": <https://www.corewebvitals.io/core-web-vitals/cumulative-layout-shift/images-and-media>
- Unlighthouse — "Preload & Prioritize LCP Image": <https://unlighthouse.dev/learn-lighthouse/lcp/prioritize-lcp-image>
- HTTPArchive Web Almanac (images chapter): <https://almanac.httparchive.org/en/latest/media/>

### Compression tooling (primary repos)
- pngquant: <https://pngquant.org/> + <https://github.com/kornelski/pngquant>
- oxipng: <https://github.com/oxipng/oxipng>
- SVGO: <https://github.com/svg/svgo>
- cwebp (libwebp): <https://developers.google.com/speed/webp/docs/cwebp>
- avifenc (libavif): <https://github.com/AOMediaCodec/libavif>
- MozJPEG: <https://github.com/mozilla/mozjpeg>
- op111.net — 2025 lossless-image-compression benchmarks: <https://op111.net/posts/2025/10/png-and-modern-formats-lossless-image-compression/>

### SEO & structured data
- Google Search Central — Logo structured data: <https://developers.google.com/search/docs/appearance/structured-data/logo>
- Google Search Central — Organization structured data: <https://developers.google.com/search/docs/appearance/structured-data/organization>
- Google Search Central — Define a favicon for Google Search: <https://developers.google.com/search/docs/appearance/favicon-in-search>
- Bing Webmaster Guidelines: <https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a>
- Facebook — Sharing best practices: <https://developers.facebook.com/docs/sharing/best-practices>
- Twitter/X Cards docs: <https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards>
- schema.org `ImageObject`: <https://schema.org/ImageObject>

### Accessibility
- W3C — WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- W3C WAI — Images Tutorial (decision tree): <https://www.w3.org/WAI/tutorials/images/decision-tree/>
- W3C WAI — Functional Images: <https://www.w3.org/WAI/tutorials/images/functional/>
- ETSI EN 301 549 v3.2.1: <https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf>
- WebAIM — Alternative Text guide: <https://webaim.org/techniques/alttext/>
- axe-core rules: <https://dequeuniversity.com/rules/axe/>

### Favicon, PWA manifest
- MDN — `<link rel="icon">`: <https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/icon>
- W3C — Web App Manifest spec: <https://www.w3.org/TR/appmanifest/>
- evilmartians — "How to favicon in 2024" (still current for 2025/26): <https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs>

### Corroborating community
- favicon.io — favicon sizes guide: <https://favicon.io/tutorials/favicon-sizes/>
- web.dev learn/images course: <https://web.dev/learn/images>
