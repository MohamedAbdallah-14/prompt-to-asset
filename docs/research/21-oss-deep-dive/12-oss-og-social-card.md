---
wave: 1
role: niche-discovery
slug: 12-oss-og-social-card
title: "OSS OG / social-card image generators"
date: 2026-04-19
sources:
  - https://github.com/kane50613/takumi
  - https://nuxtseo.com/og-image/renderers/takumi
  - https://github.com/kvnang/workers-og
  - https://github.com/fabian-hiller/og-img
  - https://github.com/ogify/ogify
  - https://github.com/ogimg/ogimg
  - https://github.com/ascorbic/og-edge
  - https://github.com/nberlette/migo
  - https://github.com/vahlcode/vahlcode-og
  - https://github.com/JulianCataldo/og-images-generator
  - https://github.com/harlan-zw/nuxt-og-image
  - https://registry.npmjs.org/eleventy-plugin-og-image
  - https://github.com/chimbori/butterfly
  - https://github.com/jasonraimondi/url-to-png
  - https://github.com/micheleriva/gauguin
  - https://github.com/Ladicle/tcardgen
  - https://pkg.go.dev/github.com/barelyhuman/og-image
  - https://github.com/henrygd/social-image-server
  - https://github.com/yuzneri/HugoOGPImageGenerator
  - https://docs.rs/crates_io_og_image/latest/crates_io_og_image/
  - https://github.com/rust-lang/crates_io_og_image
  - https://github.com/twangodev/ogis
  - https://github.com/fjlein/typst-dynamic-og-image
  - https://lunnova.dev/articles/typst-opengraph-embed/
  - https://github.com/polotno-project/polotno-node
  - https://rendrkit.dev/
  - https://github.com/rendrkit
  - https://www.npmjs.com/package/@napi-rs/canvas
  - https://github.com/yisibl/resvg-js
  - https://github.com/vercel/satori/issues/621
  - https://github.com/vercel/satori/issues/367
  - https://github.com/linebender/resvg/issues/916
  - https://github.com/linebender/resvg/pull/1036
  - https://dev.to/devoresyah/6-pitfalls-of-dynamic-og-image-generation-on-cloudflare-workers-satori-resvg-wasm-1kle
  - https://dev.to/custodiaadmin/puppeteer-vs-hosted-screenshot-api-the-real-cost-comparison-in-2026-1i5b
  - https://dbushell.com/2024/11/15/generate-open-graph-images-with-playwright
  - https://gist.github.com/BurnedChris/616a72a6b41927b699de3564d4c51a12
tags: [og-image, social-card, satori, playwright, edge]
---

# OSS OG / social-card image generators beyond `@vercel/og`

Satori + resvg (shipped as `@vercel/og`) is the canonical engine and was
correctly selected as primary in 11b. Since then the field has moved: a
Rust-based drop-in replacement now claims 2–10× Satori's throughput with a
superset of its CSS, a Workers-specific fork solves `@vercel/og`'s
WASM-bundling failures on Cloudflare, and framework-agnostic / Deno / Bun /
TanStack shims have filled the holes around SvelteKit, Astro, Solid, Qwik,
Eleventy, and Nuxt. Below is the April-2026 shape of the niche.

## The new frontrunner: Takumi (Rust)

**`kane50613/takumi`** is the most important non-Satori finding. 1.6 k ★,
dual-licensed Apache-2.0 / MIT, written in Rust, designed as a drop-in for
`next/og` with an `ImageResponse`-shaped API. Three properties make it
interesting for our pipeline:

1. **Direct rasterisation** to PNG / JPEG / WebP with no SVG intermediate —
   roughly 2–10× faster than Satori + resvg per Nuxt SEO's benchmarks and
   `BurnedChris`'s public gist (~3.2 s/image Satori vs. well under 1 s Takumi
   for the same 87-image job).
2. **CSS superset**. Full Flexbox *and* CSS Grid, linear/radial/conic
   gradients, box & text shadows, 2D/3D transforms, filters, clip-path, masks,
   blend modes, variable fonts, WOFF/WOFF2, `line-clamp`, text-balance — none
   of which Satori's strict flex-only subset accepts.
3. **Browser-grade text shaping**: RTL, CJK, COLR emoji fonts (Noto Color
   Emoji, Twemoji Mozilla) as a first-class option via the `emoji` dial
   (`"twemoji"` default, `"from-font"` to use system COLR glyphs). This
   directly addresses the two open bugs Satori still carries: stale
   `linebreak` dep blocking Unicode 15+ ZWJ sequences (satori#621) and regex-
   based Noto fallback fetching from Google Fonts (satori#367).

Runtime: `@takumi-rs/core` native bindings for Node / Bun / Lambda, `@takumi-rs/wasm`
for Cloudflare Workers / Vercel Edge / Netlify Edge / browsers. Bundle size on
edge is comparable to Satori+resvg-wasm. Only real con: raster-only (no SVG
output), irrelevant for OG cards.

Nuxt OG Image v6 already defaults to Takumi and keeps Satori as a fallback
renderer; that is the strongest validation of the claim.

## Cloudflare-Workers track: `workers-og` and friends

`@vercel/og` fails on Cloudflare Workers because Vercel's Edge runtime and
Workers differ in how they bundle WASM (dynamic `WebAssembly.instantiate` is
blocked on Workers; static `WebAssembly.Module` imports are required). Three
solutions exist:

- **`kvnang/workers-og`** — 329 ★, MIT. Same `ImageResponse` API as
  `@vercel/og`, ships with statically-compiled resvg-wasm, accepts HTML string
  input via `HTMLRewriter` (not just JSX). The de-facto choice on Workers.
- **`jillesme/cf-workers-og`** — tracks latest Satori (0.18.3) and uses
  `yoga-layout` native instead of the pure-JS fork; smaller and slightly
  faster.
- **`@vahlcode/og`** — Satori-powered, runtime-agnostic (Workers, Deno, Bun,
  TanStack Start), auto-fetches Google Fonts, built-in LRU cache for fonts and
  emoji sheets.

All three inherit the Cloudflare-specific pitfalls: images must be pre-fetched
and base64-embedded, fonts must be subsetted to fit the 1 MB / 10 MB script
cap, and dynamic WASM compilation is prohibited.

## Deno / Bun / framework-agnostic Satori wrappers

Eight npm packages matter here:

- **`ascorbic/og-edge`** — Deno port of `@vercel/og` for Deno Deploy and
  Netlify Edge Functions.
- **`nberlette/migo`** — hosted Deno Deploy microservice; URL-encoded
  parameters, 100 k+ Iconify marks inline, SVG→PNG rasterisation with edge
  caching.
- **`fabian-hiller/og-img`** — MPL-2.0, Satori + resvg, framework-agnostic via
  `satori-html`; first-class SvelteKit / Astro / SolidStart / Qwik bindings;
  lazy-loads WASM. 128 ★.
- **`ogify/ogify`** — MIT, zero-config for Next / Nuxt / Remix, built-in RTL
  support, smart caching for fonts, emojis, and images (updated Jan 2026).
- **`JulianCataldo/og-images-generator`** — ISC, CLI + plugins for Astro /
  Vite / Express / Rollup, HTML-CSS template input.
- **`harlan-zw/nuxt-og-image`** — Vue SFC templates, switchable between Satori,
  Takumi, and headless browser renderers.
- **`eleventy-plugin-og-image`** — the template-engine story. Nunjucks `.njk`
  files → Satori. The only mature OSS option where the author writes a
  template, not JSX.
- **`@react-email/render`** + Satori — for teams already running React Email,
  reuse the JSX component tree.

## Rust and Typst ecosystem

Three Rust paths beyond Takumi, each with a different philosophy:

- **`rust-lang/crates_io_og_image`** — Typst-based. Shells out to `typst`,
  renders PDF→PNG, optional `oxipng` pass. Designed for crates.io but the
  approach generalises: Typst gives real typesetting (ligatures, CJK, proper
  hyphenation), and the template is `.typ`, not JSX.
- **`fjlein/typst-dynamic-og-image`** — FastAPI + Typst, parameterised via
  query string; reproduces GitHub's repository OG card look.
- **`twangodev/ogis`** — general-purpose Rust service with multiple templates
  and URL-based generation.

Typst is the best OSS answer when the OG is **text-heavy** and
**typography-correct** (scientific titles, Chinese/Japanese, long subtitles
with ligatures). It's slower than Takumi but produces sharper text.

## Playwright / headless-Chrome tier

The 2024-2026 cost analyses (Custodia, DevTools Guide) are unanimous: headless
Chrome at scale is ~99 % more expensive than Satori/Takumi for OG specifically,
and serverless cold-starts are brutal (~5 s, 250 MB binary). Still relevant for
three cases: pixel-perfect re-rendering of existing brand marketing pages,
animated/video OG, and arbitrary-CSS templates from designers. Notable OSS:

- **`jasonraimondi/url-to-png`** — MIT, Playwright, parallel rendering, S3 /
  CouchDB cache.
- **`chimbori/butterfly`** — Apache-2.0, Go, headless Chrome, QR-code overlay,
  analytics dashboard.
- **`henrygd/social-image-server`** — `/capture` + `/template` endpoints,
  Docker, Chrome-based.
- **`micheleriva/gauguin`** — Go + chromedp, HTML templates, Dockerised.

## Go native (no Chrome)

- **`barelyhuman/og-image`** — CLI, `fogleman/gg` + `freetype`, imperative.
- **`Ladicle/tcardgen`** — blog-oriented, parses frontmatter, ships via Brew.
- **`yuzneri/HugoOGPImageGenerator`** — Hugo-specific, rich cascading config.

All three are Canvas-style imperative APIs. Simple, reliable, limited on
typography.

## Imperative Canvas / ImageMagick

- **`@napi-rs/canvas`** (Skia, 9.3 M weekly downloads), **`node-canvas`**
  (Cairo), and **`skia-canvas`** — browser-compatible Canvas 2D APIs for
  programmatic OG composition. Best when the "template" is mostly an uploaded
  hero image with text overlaid.
- **ImageMagick / `magick` CLI** — batch scripts for 1200×630 compositing; no
  templating, but useful for bulk backfills.

## Template-library / SaaS-alt tier

- **`polotno-project/polotno-node`** — JSON canvas definitions →
  PNG / PDF; powerful editor parity; **requires a paid key** — OSS code,
  non-OSS license gate.
- **RendrKit** (`github.com/rendrkit`) — Apache-licensed TS, 80+ templates,
  first-party MCP server. Closest match to "Bannerbear but for agents."
- **Openinary** — Cloudinary-class media transforms, AGPL-3.0, less
  template-focused.

## CJK / emoji / speed matrix

| Tool | Runtime | Template | CJK | Emoji | Speed/1200×630 |
|---|---|---|---|---|---|
| `@vercel/og` (Satori) | Node/Edge/Workers* | JSX (flex only) | Noto via GFonts regex | graphemeImages / Twemoji, Unicode ≤13 ZWJ bugs | ~50–200 ms |
| **Takumi** | Node/WASM/Rust | JSX / next-og-compat | native rustybuzz | COLR fonts + `"from-font"` / Twemoji | **~20–80 ms** |
| `workers-og` | Workers only | HTML string / JSX | Satori-tier | Satori-tier | ~80–250 ms (cold ~500 ms) |
| `og-img` | Node/Edge | `satori-html` | Satori-tier | Satori-tier | ~60–200 ms |
| Typst (`crates_io_og_image`) | Node shell-out | `.typ` DSL | first-class | Noto Color Emoji | ~200–600 ms |
| `url-to-png` / Butterfly / Gauguin | Docker+Chrome | HTML/CSS (anything) | full | full | ~1000–3000 ms |
| `@napi-rs/canvas` | Node | imperative JS | OS fonts | OS COLR fonts | ~30–150 ms |

(*via `workers-og`/`@vahlcode/og`; native `@vercel/og` breaks on Workers.)

## Integration recommendations

**At the edge (`/api/og/*`, Cloudflare Workers + Vercel Edge).**
Use **Takumi via `@takumi-rs/wasm`** as the primary engine. It handles Grid,
COLR emoji, CJK, and variable fonts natively and clears the Workers WASM
pitfalls (static `WebAssembly.Module` imports, no dynamic instantiation). Keep
`workers-og` wired as the compatibility fallback for any template we inherit
from a Satori-shaped caller. Subset Inter / Noto Sans CJK SC / Noto Sans
Arabic to the languages present in each title; cap the embedded font budget at
~350 KB to leave cold-start headroom on Workers.

**Server-side (Node runtime, `/api/og/server`, Lambda, our container).**
Primary: **Takumi via `@takumi-rs/core`** (native Rust, no cold-start
penalty). Pre-render only the top of the funnel (home, pricing, docs index);
render-on-demand + immutable-URL cache (`?v=contentHash`) for the long tail.
Reuse the **same JSX template** for both edge and server by keeping the
component in `lib/og/templates/` and swapping the engine at the adapter layer.

**Text-heavy / typography-critical (long CJK titles, academic citations, RTL).**
Escape hatch: a **Typst-based** path via `crates_io_og_image`-style
shell-out, running in a dev-time / build-time container. Pay the ~400 ms cost
for the ~1 % of pages where ligatures, kerning, and line-break quality
actually matter.

**Fallback chain** (matches 11b's 4-level contract):

1. Cached PNG keyed on content hash + brand-bundle hash (R2 / S3,
   `Cache-Control: public, immutable`).
2. Live **Takumi** with AI-generated hero background
   (`image_response` + `background: <url>`), 500 ms hero-fetch timeout.
3. Live **Takumi** with deterministic gradient (no hero).
4. Static `/og-default.png` committed to the repo.

**What we explicitly do *not* bundle.** Headless Chrome / Playwright — 99 %
more expensive at scale, >200 MB cold start, and the correctness gains over
Takumi are negligible for 1200×630 static cards. Polotno-node — OSS code, paid
license. ImageMagick — no templating story, useful only for occasional bulk
re-encodes.

The shortest summary: **Takumi is to Satori what Satori was to headless
Chrome** — a native-speed, correctness-preserving, edge-friendly rewrite that
removes the CSS-subset tax. Adopt Takumi as primary, keep `workers-og` as the
Satori-compatible fallback, reserve headless Chrome for one-off pixel-perfect
renders only.
