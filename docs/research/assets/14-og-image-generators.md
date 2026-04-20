# OG-Image / HTML-to-Image Generators — External Research Digest

**Scope:** Grounding for `asset_generate_og_image` (non-diffusion, template-based, 1200×630). Evaluates OSS libraries that turn HTML/JSX/Vue/templates into PNG or SVG.

**Research value: high** — Mature OSS landscape with two clearly distinct families (Satori-class and headless-browser-class) and well-documented tradeoffs.

---

## 1. Library-by-Library

### 1.1 Satori (`vercel/satori`)

- **License:** MPL-2.0. Copyleft only at the file level, fine for most products, but note it's not MIT/Apache.
- **What it does:** Takes JSX-shaped VDOM + inline CSS and emits an SVG string. No browser; pure JS/Yoga.
- **CSS/layout coverage:**
  - Supports: Flexbox (`display: flex`), `display: none`, colors, borders, border-radius, padding/margin, box-shadow, absolute/relative positioning, linear/radial gradients, text decoration, basic transforms, fonts.
  - **Does NOT support:** `display: block`, `display: inline`, `display: grid`, pseudo-elements (`::before`/`::after`), media queries, CSS variables (only via prop interpolation), `calc()`, external stylesheets, animations, most filters/blend modes, `<script>`, `<link>`, `<img>` with external URLs beyond those resolved server-side.
  - `<span>` background rendering deviates from browser because there is no inline layout.
  - Borders (`border: Xpx solid`) have known regressions that can break image clipping.
- **Fonts:** Must pass font buffers explicitly (`fonts: [{ name, data: Buffer, weight, style }]`). Supports dynamic Google Fonts fallback via `loadAdditionalAsset` hook; built-in Noto fallback covers most scripts.
- **Emoji:** No native color-emoji rendering. Opt-in `graphemeImages` / `twemoji: true` downloads emoji SVGs on the fly from a CDN (original Twemoji CDN was killed; projects now point to Cloudflare or bundle locally).
- **Perf:** ~50–200 ms per 1200×630 SVG on warm Node. Output is a string; PNG conversion is a separate step (usually `resvg`).
- **Failure modes:** Throws on unsupported CSS (e.g., any non-flex container without children requires `display: flex`); silently mis-renders `<span>` backgrounds; emoji CDN is a live external dependency unless preloaded; rich text with per-character color requires splitting into many flex items.

### 1.2 `satori-html` (natemoo-re)

- **License:** MIT.
- **Role:** Adapter that parses an HTML string (via `ultrahtml`) into Satori's VDOM shape. Lets template engines (Mustache, EJS, Svelte SSR output) feed Satori without JSX.
- **Gotchas:** Inherits every Satori CSS limit; class-based styling is dropped — inline `style="..."` is required. Uses tagged-template (`html\`<div>…</div>\``) or function call form.

### 1.3 `@vercel/og`

- **License:** MPL-2.0 (bundles Satori + resvg-wasm).
- **Role:** Thin wrapper targeting Vercel Edge / Next.js that composes Satori → resvg-wasm → PNG `Response`. Ships a React-like `ImageResponse` class.
- **Portability:** Works outside Vercel (it's just npm), but the happy path assumes edge runtime; full Node deployments often prefer native `@resvg/resvg-js` over the WASM build for throughput.
- **Limits:** Same CSS ceiling as Satori.

### 1.4 `@resvg/resvg-js`

- **License:** MPL-2.0 (wraps the Rust `resvg` crate via napi-rs). Prebuilt binaries for common Node targets; WASM build also available.
- **Role:** SVG → PNG. Pairs naturally with Satori.
- **Perf:** Rust-native, fast on warm paths. Benchmarks vs `sharp`:
  - Bulk 400-icon conversion: `sharp` was ~3× faster on x86 (1,569 ms vs 5,472 ms) and ~1.2× on M1 Pro.
  - Large single SVGs: v2.6.0+ improved up to 115× (paris-30k.svg: ~290 ms vs ~33,760 ms on M1 Pro).
  - Reports of crashes when rendering >400 SVGs concurrently in-process.
- **Features:** font registration, background fill, DPI/scaling, crop, custom font fallback. DPI handling differs subtly from `sharp`, so expect to calibrate when swapping.

### 1.5 Playwright (`microsoft/playwright`)

- **License:** Apache-2.0. Chromium binary itself is BSD-family; no GPL exposure.
- **Role:** Full headless browser. Render any HTML/CSS/JS page and screenshot a viewport or element.
- **CSS coverage:** Everything Chromium supports — Grid, custom properties, `@font-face`, `clip-path`, SVG filters, `backdrop-filter`, animations (with timeline control), color-emoji via system/bundled fonts.
- **Perf:** 1–3 s per image cold, ~100–400 ms warm with a pool. Memory footprint is large (Chromium binary ~300 MB; resident memory per page ~100–200 MB).
- **Failure modes:** Cold starts on serverless; flaky font fallback if system fonts differ between dev and CI (must bundle); emoji rendering depends on OS font install (Linux containers need Noto Color Emoji); timeouts on very large DOMs; browser crashes under high concurrency without pooling.

### 1.6 `puppeteer` / `node-html-to-image`

- **License:** Apache-2.0 (puppeteer), MIT (node-html-to-image).
- **Role:** Same pattern as Playwright; `node-html-to-image` is a thin template+screenshot helper built on `puppeteer-cluster`.
- **Perf:** Baseline ~900 ms/image, steady ~350 ms/image with proper cluster config (`CONCURRENCY_CONTEXT`, `maxConcurrency: 10`, `--no-sandbox --headless --disable-gpu`). Default concurrency (2) under-utilizes hardware; stopping/starting clusters per request destroys throughput.
- **Known pain:** Output ordering not guaranteed in batch; HTML payloads >10 MB blow the 30 s timeout (configurable in 4.x+); can't easily share a single browser instance across many helper calls.

### 1.7 `puppeteer-cluster`

- **License:** MIT.
- **Role:** Worker pool around puppeteer (queue + concurrency model + retries). Essential for batch OG generation if you stay in the browser family. Provides `CONCURRENCY_PAGE`, `CONCURRENCY_CONTEXT`, `CONCURRENCY_BROWSER` trade-offs — `CONTEXT` is the practical sweet spot for OG workloads.

### 1.8 `html-to-image` / `dom-to-image`

- **License:** MIT.
- **Role:** Browser-side only. Clones DOM, inlines computed styles, serializes to SVG `<foreignObject>`, paints to canvas.
- **Not applicable for server-side OG generation** — they need a live DOM. Include for completeness: could power a user-side "download preview" feature but not the backend tool.
- **Caveats:** `<foreignObject>`-based rendering drops some filters/blend modes; `html2canvas` (a sibling) re-paints in JS and often breaks CSS variables and modern layout.

### 1.9 Framework wrappers — `next/og`, `nuxt-og-image`, Astro community modules

- **`next/og`** — official Next.js re-export of `@vercel/og`; same engine, same CSS ceiling.
- **`nuxt-og-image`** — Vue-component-based authoring; supports both Satori and **Takumi** renderers (Rust/WASM, Satori-compatible API built on the Taffy layout engine; claims 2–10× faster and better block-layout support). Adds emoji families, Google Fonts, Tailwind/UnoCSS preprocessing, and a DevTools playground. Ships edge adapters for Vercel/Netlify/Cloudflare.
- **Astro OG image modules** — community packages (`astro-og-canvas`, `@altano/astro-og-image`) — mostly Satori under the hood with Astro content-collection integration.
- **Takumi is the most important thing to watch**: it's a drop-in Satori alternative with a real path to block layout. If the project's template ever needs CSS Grid or block-flow text, Takumi closes that gap without jumping to Playwright.

---

## 2. Decision Matrix — Satori-class vs. Playwright-class for `asset_generate_og_image`

Project context: deliberately non-diffusion, 1200×630 from a small number of templates, runs inside the `asset_generate_og_image` tool (likely on developer machines, CI, and/or a backend worker).

| Dimension | Satori + resvg-js | Playwright (Chromium) |
|---|---|---|
| **License** | MPL-2.0 (permissive-ish, file-level copyleft) | Apache-2.0 (permissive) |
| **Binary / install footprint** | ~10 MB npm + WASM/native resvg | ~300 MB Chromium + Node bindings |
| **Cold start** | <100 ms | 500–2000 ms |
| **Warm render (1200×630)** | 50–200 ms SVG + 30–80 ms PNG | 100–400 ms per screenshot |
| **Peak throughput (one worker)** | 5–15 img/s | 2–5 img/s |
| **CSS coverage** | Flexbox subset only | Full Chromium |
| **Authoring ergonomics** | JSX/VDOM + inline styles; Tailwind only via preprocessor | Any HTML/CSS, including design systems, `<style>` blocks, `@font-face` |
| **Font control** | Explicit, reproducible (buffers) | System-dependent unless bundled |
| **Emoji** | Needs `twemoji`/preloaded grapheme images; CDN dependency | Works if Noto Color Emoji installed in container |
| **Determinism** | High (no renderer drift across OSes) | Lower (subpixel AA, font hinting vary by Chromium version / OS) |
| **Batch friendliness** | Trivial (stateless, in-process) | Requires `puppeteer-cluster` / pooled contexts |
| **Serverless fit** | Excellent (`@vercel/og` pattern) | Poor (binary size, cold start) |
| **Failure mode density** | Loud: throws on unsupported CSS | Quiet: silent font fallback, flaky timings |
| **Template complexity ceiling** | Flexbox layouts, gradients, shadows, basic SVG/icons | Anything (grid, animations captured as static, filters, masks) |

**Recommendation for this project's default path:** **Satori + `@resvg/resvg-js`** (not `@vercel/og` — skip the edge-runtime wrapper; call Satori and resvg directly for a backend-agnostic path). Reasons:

1. The tool is explicitly template-based and 1200×630 — exactly the shape Satori was designed for.
2. Deterministic output across dev/CI/prod matters for a reproducible CLI-ish tool; Satori gives that, Chromium does not.
3. Startup and memory footprint matter in a broader `asset_*` tool family; Chromium would dominate the process budget.
4. Emoji and i18n are solvable (preload twemoji SVGs + bundle Noto subsets) and the solution is static (no CDN at request time).

**Keep Playwright as a secondary renderer** behind the same interface for:

- Templates that need CSS Grid, complex text wrapping, inline mixed-color runs, or pixel-identical-to-browser screenshots.
- Any future "screenshot this URL" variant.

**Watch Takumi** (via `nuxt-og-image`'s engine list or standalone) — if block layout becomes a need, it's the cheapest migration from Satori and avoids a jump to Chromium.

---

## Sources

- `vercel/satori` — engine, CSS support matrix: https://github.com/vercel/satori
- Satori display/flex limitation discussion: https://github.com/vercel/satori/issues/455 and #710, discussion #324
- Satori emoji + Twemoji CDN issue: https://github.com/vercel/satori/issues/1 , #368
- `satori-html` package: https://github.com/natemoo-re/satori-html
- `@resvg/resvg-js` package + perf thread: https://www.npmjs.com/package/@resvg/resvg-js , https://github.com/yisibl/resvg-js/issues/145
- Playwright license: https://github.com/microsoft/playwright/blob/main/LICENSE
- `node-html-to-image` perf + cluster config: https://github.com/frinyvonnick/node-html-to-image/issues/80 , #85 , #164
- Comparison articles: https://devtoolsguide.com/screenshot-and-og-image-tools/ , https://www.pkgpulse.com/blog/ipx-vs-vercel-og-vs-satori-dynamic-image-generation-nodejs-2026
- Nuxt OG Image (Takumi + Satori): https://nuxtseo.com/docs/og-image , https://github.com/nuxt-modules/og-image
- `html-to-image` vs `html2canvas` vs `dom-to-image-more`: https://npm-compare.com/dom-to-image-more,html-to-image,html2canvas
