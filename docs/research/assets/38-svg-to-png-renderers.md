# 38 — SVG-to-PNG Renderers

**Research value: high** — The open-source SVG rasterizer space has a clear hierarchy, well-documented fidelity benchmarks, and a canonical pipeline (Satori → resvg) that already matches the `prompt-to-asset` use case.

## Context

`prompt-to-asset` rasterizes SVGs into PNGs across several skills (favicon, app-icon, og-image, logo, illustration, vectorize, transparent-bg). Inputs are two flavors:

1. **Satori output** — SVG where `<text>` is already flattened to vector paths (so font rendering is not on the hot path).
2. **Templated SVGs from users / brand kits** — may carry live `<text>` with `font-family` referring to custom webfonts (WOFF2/TTF), and may include gradients, `feGaussianBlur`, `mask`, `clipPath`, occasionally `foreignObject`.

The renderer must therefore handle both "text-as-paths" (trivial) and "text-with-custom-font" (the hard case) paths.

## Recommendation

- **Primary: `@resvg/resvg-js`** — Rust/NAPI bindings for `linebender/resvg`. Apache-2.0 / MIT. Ships programmatic font loading (`fontFiles`, `fontDirs`, `loadSystemFonts`, `defaultFontFamily`), 50–200 ms typical rendering, no system-font dependency. Dual-licensed and reproducible across Node/Deno/Bun/CI.
- **Fallback: Playwright headless Chromium** — invoked only when resvg declines a feature (notably `foreignObject`-with-HTML, rare SVG 2 filter primitives, or when the user pipeline explicitly asks for browser-faithful output). Apache-2.0.

## Candidate Matrix

### resvg (Rust) + `@resvg/resvg-js` (Node NAPI) — **recommended primary**

- **License:** Apache-2.0 / MIT (core) — no copyleft; safe to redistribute.
- **Fidelity:** 83.1% W3C SVG test-suite correctness (vs librsvg 66.2%, Inkscape 1.0 74.5%) in the most cited public comparison. On Wikimedia featured pictures, perfect 1.00 vs librsvg 0.92. [linebender/resvg](https://github.com/linebender/resvg), [Wikimedia SVG test suites](https://commons.wikimedia.org/wiki/User:JoKalliauer/SVG_test_suites).
- **Filters / masks / gradients:** Full linear + radial gradient support; `clipPath` and `mask` work; `feGaussianBlur` and common filter primitives supported (with `edgeMode` shipped in v0.33). Some SVG 2 filter modes (e.g. `feComposite operator="lighter"`) still pending. Text-on-path and variable fonts landed in 0.45/0.46 (2025/2026).
- **foreignObject:** **Not supported** when it contains HTML (known limitation; Mermaid/draw.io diagrams break unless exported with "Convert Labels to SVG").
- **Font loading:** First-class. Accepts TTF + WOFF2 via `fontFiles`, can disable system fonts for hermetic builds, has `preloadFonts` to avoid per-text I/O (up to ~100× faster on text-heavy SVGs). Sources: [npm @resvg/resvg-js](https://www.npmjs.com/package/@resvg/resvg-js), [PR #366 preload fonts](https://github.com/thx/resvg-js/pull/366).
- **Perf:** Fastest of the batch (well ahead of librsvg and Inkscape). Serverless-friendly, also available as `@resvg/resvg-wasm` for Edge/Workers.
- **API:** `new Resvg(svg, opts).render().asPng()` — deterministic and pure.
- **Caveat:** Minor `patternTransform` discrepancies vs browsers under heavy translations / scale thresholds (open issue #882). Not a blocker for icon/OG workloads.

### librsvg (via `rsvg-convert` or `sharp`)

- **License:** LGPL-2.1 (core library). Dynamic linking OK; static linking carries LGPL obligations.
- **Fidelity:** ~66% W3C; trails resvg visibly. Pango-driven text layout.
- **Filters / masks:** Mature but older; some SVG 2 features missing.
- **Font loading:** **System-only** via fontconfig — cannot load a font from a file path at the API level. Embedded `@font-face` / base64 fonts in the SVG are ignored. On Alpine/minimal containers you have to `apk add` or ship a fontconfig config; otherwise text silently falls back to Times New Roman or renders as `[]` boxes. Sources: [sharp#2838](https://github.com/lovell/sharp/issues/2838), [sharp#2458](https://github.com/lovell/sharp/issues/2458), [sharp#1162](https://github.com/lovell/sharp/issues/1162), [sharp#2051](https://github.com/lovell/sharp/issues/2051).
- **Verdict:** For a node-based, per-job, user-uploaded-font pipeline, librsvg's system-font model is an operational landmine. Use only as a raster-only path (no live text), or not at all.

### Inkscape CLI

- **License:** **GPL-2** (copyleft). Acceptable as a standalone external process; problematic if linked.
- **Fidelity:** ~74.5% W3C. Generally the most faithful to "what you see in Inkscape itself," especially for print-style effects, but it has open bugs around CLI PNG export: text truncation ([#5807](https://gitlab.com/inkscape/inbox/-/issues/5807)), missing background color since 1.3, no CLI antialias control until 1.4.
- **Perf:** Slowest by a wide margin — cold-starts a full GTK app per call. Unusable for per-request OG image generation.
- **Font loading:** System fonts only.
- **Verdict:** Keep as a last-resort manual fallback for authors debugging fidelity; never on the request path.

### Playwright (headless Chromium) — **recommended fallback**

- **License:** Apache-2.0.
- **Fidelity:** Browser-grade — best coverage for SVG 2, full filter set, full `foreignObject` (HTML renders natively), and matches what users see when they open the SVG in a tab.
- **Font loading:** Inject an HTML wrapper with `@font-face src: url(...)` pointing at local WOFF2 files; use `page.evaluate(() => document.fonts.ready)` before `screenshot({ omitBackground: true, type: 'png' })`. Headless font rendering is generally stable, but watch for the known container-variable-font regression ([playwright#29596](https://github.com/microsoft/playwright/issues/29596)) and fullpage font reload bug ([playwright#29968](https://github.com/microsoft/playwright/issues/29968)).
- **Perf:** 1–3 s/render (browser boot + font load + layout). Amortize by reusing a single browser context.
- **Verdict:** Only reach for this when resvg materially mis-renders — specifically `foreignObject`-with-HTML (Mermaid, draw.io, embedded diagrams), rare SVG 2 filter combos, or CSS-in-SVG that relies on browser-layout semantics.

### Puppeteer / `svgexport`

- Same browser-rendering idea as Playwright but the `svgexport` wrapper is last released in 2020 and pins Puppeteer ^3 (2020). It still works, but modern Playwright is strictly better maintained. Use Playwright.

### Apache Batik

- **License:** Apache-2.0.
- **Fidelity:** Decent, especially for classic SVG 1.1 filter chains.
- **Runtime:** Java (JVM). Heavy dependency surface for a Node project; Batik itself is in maintenance-mode at Apache XMLGraphics. Ruled out for this project on integration cost alone.

### canvaskit-wasm (Skia)

- **License:** BSD-3-Clause (Skia).
- **Not an SVG renderer.** It's a Canvas2D/WASM backend. It can render paths, text, gradients, but you must parse and hand-translate SVG yourself. That's a separate project, not a drop-in. Skip.

## Fidelity ranking (for this project's inputs)

For Satori-style SVGs (text already baked to paths, no filters, no `foreignObject`) — all renderers tie on correctness; resvg wins on perf and licensing.

For user-templated SVGs with live `<text>` + custom WOFF2:

1. **Playwright (Chromium)** — highest fidelity; browser sees the `@font-face`, handles kerning, ligatures, variable-font axes as the user designed them.
2. **resvg/resvg-js** — very close; needs the font file registered up front (`fontFiles`) and does not evaluate in-SVG `@font-face` stylesheets. If we pass font paths from the brand bundle alongside the SVG, output matches the browser within sub-pixel AA noise.
3. **librsvg/sharp** — acceptable **only** if the font is installed at the system level and SVG uses a plain `font-family` string; ignores `@font-face` entirely.
4. **Inkscape/Batik** — usable but operationally unattractive.

## Integration notes for `prompt-to-asset`

- Register fonts from the brand bundle up front before calling resvg: `new Resvg(svg, { font: { fontFiles: [...brandFonts], loadSystemFonts: false, defaultFontFamily: brand.font.primary, preloadFonts: true } })`. Disabling system fonts makes the render hermetic and reproducible on CI.
- For the OG pipeline (Satori → PNG), text is already vectorized — resvg is strictly mechanical rasterization, no font concerns.
- For favicon / app-icon / logo skills, inputs are either diffusion PNGs (no SVG rasterization) or Recraft/vtracer/potrace SVGs (vector shapes, no text) — again, resvg is overkill-accurate.
- Add a Playwright-backed fallback only behind a flag (`RENDERER=chromium`) or triggered automatically when the SVG contains `<foreignObject>` with HTML children.
- **Do not** adopt sharp's SVG-input path for anything involving user fonts; keep sharp in the bundle only for its raster pipeline (resize, composite, PNG/JPEG encode).

## Sources

- [linebender/resvg (README, license, test suite)](https://github.com/linebender/resvg) — primary project, Apache-2.0/MIT.
- [Wikimedia SVG test-suite comparison](https://commons.wikimedia.org/wiki/User:JoKalliauer/SVG_test_suites) — W3C correctness numbers for resvg vs librsvg vs Inkscape.
- [Wikimedia RFC: re-evaluate librsvg](https://phabricator.wikimedia.org/T283083) and [T243893](https://phabricator.wikimedia.org/T243893) — production-scale evaluation context.
- [`@resvg/resvg-js` on npm](https://www.npmjs.com/package/@resvg/resvg-js), [thx/resvg-js](https://github.com/thx/resvg-js), [PR #366 preloadFonts](https://github.com/thx/resvg-js/pull/366), [issue #367 font I/O perf](https://github.com/thx/resvg-js/issues/367).
- [resvg foreignObject limitation (typst#1421)](https://github.com/typst/typst/issues/1421).
- [resvg filter/clip issues #437, #881, #882](https://github.com/linebender/resvg/issues).
- sharp / librsvg font limitations: [#2838](https://github.com/lovell/sharp/issues/2838), [#2458](https://github.com/lovell/sharp/issues/2458), [#1162](https://github.com/lovell/sharp/issues/1162), [#2051](https://github.com/lovell/sharp/issues/2051), [#3720](https://github.com/lovell/sharp/issues/3720).
- Inkscape CLI PNG export bugs: [#5807 text truncation](https://gitlab.com/inkscape/inbox/-/issues/5807), [#8518 background color](https://gitlab.com/inkscape/inbox/-/issues/8518).
- [Apache Batik Rasterizer](https://xmlgraphics.apache.org/batik/tools/rasterizer.html).
- [svgexport (npm, last 2020)](https://www.npmjs.com/package/svgexport).
- [canvaskit-wasm (npm)](https://www.npmjs.com/package/canvaskit-wasm).
- Playwright headless rendering caveats: [#29596](https://github.com/microsoft/playwright/issues/29596), [#29968](https://github.com/microsoft/playwright/issues/29968), [#12683](https://github.com/microsoft/playwright/issues/12683).
- Satori + resvg canonical pipeline: [anasrar OG tutorial](https://anasrar.github.io/blog/generate-image-from-html-using-satori-and-resvg/), [Cloudflare Workers pitfalls](https://dev.to/devoresyah/6-pitfalls-of-dynamic-og-image-generation-on-cloudflare-workers-satori-resvg-wasm-1kle).
