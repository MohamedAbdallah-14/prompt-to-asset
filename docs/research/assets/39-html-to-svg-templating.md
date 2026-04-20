# 39 — HTML → SVG / JSX → SVG / SVG-Templating Tools

Research scan of the open-source layer for the `prompt-to-asset` asset
pipeline. Anchor is **Satori**, which we already use in the OG-image and
transparent-bg skills, but the neighborhood has several libraries worth
knowing — especially for non-JSX callers (HTML strings, captcha/badge
style "pure SVG" generators), for post-Satori manipulation (`svgson`),
and for a serious Satori competitor (**Takumi**, Rust/WASM) that is now
the default renderer in the Nuxt OG stack.

Current year: 2026. Recency is called out where it matters.

---

## TL;DR

- Keep **Satori** as the primary JSX → SVG engine (MPL-2, battle-tested,
  dynamic font/emoji loader, edge-friendly). Pair it with **satori-html**
  for any non-JSX templates we want to accept (Markdown-ish briefs,
  pasted HTML).
- Watch **Takumi** (Apache-2 / MIT). It is Satori-compatible at the JSX
  level but uses Taffy, supports CSS Grid + gradients + 3D transforms,
  and renders directly to PNG/WebP 2–10× faster. Worth piloting as an
  optional renderer behind a flag.
- For the **badge / captcha / shields** class of assets, do **not**
  reach for Satori. Use `badge-maker` (shields.io) or hand-written SVG
  templates — they are orders of magnitude simpler and already
  production-hardened.
- `svgson` is the right tool whenever we need to post-process the SVG
  that comes back (re-ID, subset palette, strip IDs, inject `<defs>`).
  It is the lightweight alternative to pulling a full DOM.
- For templates: **nuxt-og-image** and the **Satori playground** are
  the two gold-standard template galleries we should mine before
  writing our own.

---

## Library matrix

| Tool | License | Input | CSS / layout coverage | Fonts & emoji | Output | Fit for brand OG / badge from JSX+tokens |
|---|---|---|---|---|---|---|
| **Satori** (`vercel/satori`) | MPL-2.0 | React/JSX-like element tree, or tagged HTML via satori-html | Flexbox (Yoga), transforms, shadows, gradients, borders, backgrounds, style inheritance. No grid, no z-index, no external `<link>`/`<style>`, no `<script>`, no raw-HTML injection, no React hooks. | `fonts` array (TTF/OTF bytes). Async `loadAdditionalAsset` can fetch Google-Fonts subsets + emoji-image fallback per grapheme. | SVG string | **Primary**. Best fit for brand OG. Limited for complex layouts. |
| **satori-html** (`natemoo-re`) | MIT | HTML string (tagged-template or function) | Whatever Satori supports. Inline styles recommended; class selectors are ignored. | Inherited from Satori. | Satori VDOM → feed back into satori() | **Primary** adapter when authors want HTML templates (Markdown frontmatter → HTML → OG). |
| **Takumi** (`kane50613/takumi`) | Apache-2.0 + MIT (dual) | Satori-compatible JSX element tree (also via `tw` Tailwind prop) | Flexbox **and** CSS Grid, gradients, shadows, opacity, 2D/3D transforms. Claims "complete CSS" relative to Satori. | Variable fonts + WOFF2, RTL, COLR emoji fonts. | PNG / JPEG / WebP / SVG + animated WebP/APNG. Rust native (`@takumi-rs/core`) or WASM (`@takumi-rs/wasm`) for edge. | **Strong challenger**. Pilot as opt-in renderer — 2–10× Satori+resvg on the Nuxt benchmark. |
| **`@vercel/og`** | MPL-2.0 (wraps Satori + resvg) | JSX | Satori's | Satori's | `ImageResponse` (PNG via resvg) | Good for Next.js/Vercel; ties the template layer to Edge runtime conventions. |
| **svgson** | MIT | SVG string | — (AST tool, not a renderer) | — | JSON AST ↔ SVG string, sync & async, `transformNode`, `transformAttr`, `camelcase`. | **Post-processor** for Satori output — reliable without JSDOM. |
| **@svgr/core** | MIT | SVG string / file | — | — | JS/TS source emitting a React component | Inverse direction; useful for packaging brand-mark SVGs into the component layer, not for generation. |
| **badge-maker** (shields.io) | Creative Commons CC0 1.0 (public domain, shields repo) | Plain JS object `{label, message, color, style, logoBase64}` | Fixed "plastic / flat / flat-square / for-the-badge / social" templates | Verdana-metric width maths; logo as base64 | SVG string | **Best in class** for badges. Use it directly; do not re-implement in Satori. |
| **svg-captcha** | MIT | Options (size, chars, noise, color, font) | Hand-rolled SVG primitives | opentype.js; bring-your-own font | SVG string + answer | Fine for human-verification widgets; irrelevant for brand OG. |
| **preact-render-to-string** | MIT | Preact/JSX component tree | Whatever you hand-author; normalizes camelCase & kebab-case SVG attrs | N/A | HTML/SVG string | Good "JSX → static SVG string" pipeline when we want full control and are NOT constrained to Satori's CSS subset. |
| **hyperscript / hastscript** | MIT | `h(tag, attrs, children)` / `s()` for SVG | — | — | DOM nodes or hast AST | Substrate for DSLs and programmatic SVG trees. hastscript has separate `h()` / `s()` and a JSX runtime. |
| **hypersvg** | MIT | Hyperscript-compatible renderer | — | — | SVG via any `h`-like render | Thin SVG-attribute/namespace helper over any hyperscript. |
| **d3-selection** (+ jsdom) | ISC (BSD-3 equivalent) | Imperative | Whatever you write | Bring your own | SVG via jsdom `body.html()` | Powerful for **data-driven** SVG (charts, viz) but overkill for templated brand cards. |

---

## Deeper notes per tool

### Satori (anchor)

- Repo: `vercel/satori`, MPL-2.0, ~13k⭐, 0.26.x (2026-03). Yoga (C++
  compiled to WASM) does flexbox; Satori owns CSS style resolution,
  font shaping (via opentype.js / TTF tables), SVG emission.
- Limitations to design around: no CSS Grid (big one), no z-index
  (warns in console), no `<script>`/`<link>`/`<style>`, no external
  resources, no raw-HTML escape hatch, no React hooks — everything
  inline, including font bytes.
- Dynamic asset hook: `loadAdditionalAsset({ code, segment })` where
  `code` is `emoji` for emoji clusters or a language code like `ja`,
  `zh-CN` for unknown characters. Canonical pattern is to:
  1. Collect graphemes from the tree,
  2. Call Google Fonts `?text=<grapheme>` to get a subsetted woff2 (or
     hit a local Noto subset index we maintain),
  3. Return either a Satori font object or an `<img src="data:...">`
     replacement for emoji.
- Tailwind: Satori accepts `tw="…"` only for a specific subset (no
  arbitrary values, no layer selectors). For brand OG we should stick
  to explicit token-driven inline style objects.

### Takumi (the one to watch)

- Repo: `kane50613/takumi`, Apache-2 + MIT dual-license, started
  June 2025, ~1.5k⭐.
- Architecture: Rust core using `taffy` (modern Yoga successor —
  flex + grid + block) + `cosmic-text` + `tiny-skia` for rasterization,
  plus a WASM build for edge runtimes (Cloudflare, Vercel Edge,
  Deno Deploy).
- CSS story: flexbox, grid, gradients (incl. conic), shadows, 2D/3D
  transforms, opacity, `tw` prop. It is by construction a superset of
  Satori's layout surface.
- Output: direct to PNG/JPEG/WebP (no resvg round-trip), plus
  animated WebP / APNG and optional SVG emission.
- Integration in the wild: **default** renderer in `nuxt-og-image` v6
  (supersedes Satori). They cite 2–10× speedup and a shorter bug tail
  on CSS edge cases.
- Risk/cost for us: Rust dep (`@takumi-rs/core` is a NAPI native
  module, ~MB-class install) or a 2–3 MB WASM chunk on edge. License
  is permissive.
- **Recommendation:** add as optional renderer behind `--renderer takumi`
  in the OG/illustration skills; keep Satori as default until we have a
  benchmark + snapshot-regression pass.

### satori-html (`natemoo-re/satori-html`)

- MIT, built on **ultrahtml** (1.75 kB HTML parser from the same
  author). Exposes `html\`<div>…</div>\`` and `html("<div>…</div>")`
  helpers that produce the Satori VDOM shape directly — no React
  runtime needed.
- 113–131 K weekly downloads (npm), last published ~0.3.2. Small and
  stable, which is what we want from a converter.
- Perfect for a "paste your HTML" authoring path, for Svelte/Astro
  callers, and for reading templates from Markdown/MDX where the body
  is already HTML-ish.

### @vercel/og

- Wraps Satori + resvg-js. Returns a standard `Response` with
  `Content-Type: image/png`. Same CSS constraints as Satori.
- Template gallery: the `playground/` folder inside `vercel/satori`
  (cards/components/pages), the archived `vercel/og-image` repo, and
  `og-playground.vercel.app`. Good reference material, not a
  drop-in theme library.

### svgson

- MIT, 155 K weekly downloads, sync + async parsing. Stable and tiny.
- Use cases in our pipeline:
  - Post-process Satori SVG to namespace/reprefix all `id=` so two
    OG cards can coexist in one HTML document (shields' `idSuffix`
    pattern).
  - Strip or rewrite `<defs>` gradients during palette swaps for
    dark-mode OG variants.
  - Extract `<text>` nodes to generate an OCR-style alt-text fallback.
- Preferred over JSDOM for SVG-only transforms: no DOM-spec overhead,
  serializes deterministically.

### @svgr/core

- MIT, 13.5 M weekly downloads. This is the "SVG → React component"
  direction — it's how we'd ship brand-mark assets as importable
  components. Not part of the generation hot path, but relevant as the
  closing move after we export an SVG from Satori/Takumi.

### badge-maker (shields.io)

- Part of the `badges/shields` monorepo. Supports `plastic`, `flat`,
  `flat-square`, `for-the-badge`, `social` styles. Exposes `logoBase64`
  for custom brand marks, `links` for up-to-two click targets, and an
  `idSuffix` to avoid CSS bleed when embedded in an HTML page.
- For any "status badge" or "version badge" request we should call
  `makeBadge()` directly and only fall back to Satori for truly custom
  pill shapes.

### svg-captcha

- MIT, self-contained. Generates the SVG with opentype.js — we can
  swap in a brand font via `loadFont(url)`. Irrelevant for marketing
  OG, useful if we ever want a lightweight bot-proofing visual.

### preact-render-to-string

- Zero-dep, 4.5 M weekly downloads. Worth considering as a "big SVG,
  no Satori" authoring path — e.g. for a tech-drawing / isometric-hero
  layout where we want grid + filters + z-index and are willing to
  hand-author the SVG primitives.
- Attribute normalization is handled (camelCase `strokeWidth`
  equivalence with kebab `stroke-width`).

### hyperscript family

- `hyperscript` (hyperhype), `hastscript` (unified collective,
  ~17 M wd/w — `h()` for HTML, `s()` for SVG, JSX runtime), and
  `hypersvg` (library-agnostic SVG helper usable with any `h`-shaped
  render fn).
- Reasonable when we want a tiny DSL internally without pulling React
  or Preact, or when writing SVG generators as unified/hast plugins.

### d3-selection (+ jsdom)

- ISC, de-facto for chart-style server-side SVG. Workflow is
  `const doc = new JSDOM().window.document; d3.select(doc.body).append('svg')…`
  and `fs.writeFileSync('out.svg', doc.body.innerHTML)`.
- Pick this when the asset is **data-driven** (charts embedded in
  release notes, sparklines in an OG card). For brand OG it's the
  wrong shape.

---

## Template libraries worth studying or extending

1. **`vercel/satori` → `playground/`** — Satori playground source (live
   at `og-playground.vercel.app`). Folders: `cards/`, `components/`,
   `pages/`, `utils/`. This is the reference gallery for what clean
   Satori JSX looks like. MPL-2.
2. **`nuxt-modules/og-image`** — Vue/Nuxt, MIT, 484 K wd/w. Built-in
   templates, a DevTools playground, fonts-via-Google, six emoji
   families, Satori/Takumi/browser renderers via `.satori.vue` /
   `.takumi.vue` filename suffixes. The renderer-suffix convention is
   worth stealing even if we don't use Vue.
3. **`railwayapp/og`** — Railway's fork of Vercel's original OG
   generator. MIT, React components as templates, supports multiple
   layouts via query params. Clean example of "component per layout +
   runtime param mapping", which is close to what our brand-OG skill
   needs.
4. **`vercel/og-image` (archived 2023-01)** — still useful as a
   gallery of the first generation of OG layouts, but API is outdated.
5. **`og-image.org`** — not a repo, but a maintained tutorial hub with
   current Satori patterns for 2026; good for cross-checking API
   shapes.
6. **`@vercel/examples` / OG.cool** — newsroom-style OG with headline
   typography tuned per outlet. Decent reference for headline fitting
   and accent-color extraction.

### Recommendation for our own template layer

- Ship a small `@prompt-to-asset/og-templates` package with:
  - A `Template` interface (`render(props, tokens) => SatoriNode`).
  - Three starters: `headline`, `quote`, `changelog`, plus a
    `badge` that delegates to `badge-maker`.
  - One optional `.takumi.tsx` twin per template, behind a feature
    flag, to start collecting side-by-side diffs for the renderer
    bake-off.
- Use **satori-html** as the fallback authoring path for users who want
  to paste raw HTML from a CMS.
- Always pipe Satori output through **svgson** once, for
  `idSuffix`-style collision prevention and for palette/token
  post-processing (so tokens can override gradient stops without
  re-running layout).

---

## Sources

- `vercel/satori` repo and README — https://github.com/vercel/satori
- Satori DeepWiki: CSS Support, Supported Properties, Font Matching,
  Emoji & Custom Graphemes — https://deepwiki.com/vercel/satori
- `natemoo-re/satori-html` — https://github.com/natemoo-re/satori-html
- `kane50613/takumi` and https://takumi.kane.tw
- Nuxt SEO Takumi renderer docs —
  https://nuxtseo.com/docs/og-image/renderers/takumi
- `nuxt-modules/og-image` — https://github.com/nuxt-modules/og-image
- `elrumordelaluz/svgson` — https://www.npmjs.com/package/svgson
- `gregberge/svgr` — https://github.com/gregberge/svgr
- `badges/shields` `badge-maker` —
  https://github.com/badges/shields/tree/master/badge-maker
- `produck/svg-captcha` — https://github.com/produck/svg-captcha
- `preactjs/preact-render-to-string` —
  https://github.com/preactjs/preact-render-to-string
- `hastscript` (unified) — https://www.npmjs.com/package/hastscript
- `spacejack/hypersvg` — https://github.com/spacejack/hypersvg
- D3 + jsdom server-rendering patterns (gregjopa.com, gist j-medland)
- `og-image.org` dynamic-OG guide, `ogmagic.dev` and `pkgpulse` 2026
  renderer comparisons
- `railwayapp/og` — https://github.com/railwayapp/og
- `@vercel/og` npm — https://www.npmjs.com/package/@vercel/og
