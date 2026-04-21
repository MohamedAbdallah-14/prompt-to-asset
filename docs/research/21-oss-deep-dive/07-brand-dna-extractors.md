---
wave: 1
role: niche-discovery
slug: 07-brand-dna-extractors
title: "OSS brand-DNA extractors (URL/Figma → brand bundle)"
date: 2026-04-19
sources:
  - https://github.com/dembrandt/dembrandt
  - https://www.dembrandt.com/
  - https://www.dembrandt.com/explorer
  - https://github.com/ethanjyx/OpenBrand
  - https://openbrand.sh/
  - https://registry.npmjs.org/openbrand
  - https://github.com/thebrandmd/brand.md
  - https://thebrand.md/
  - https://brandspec.dev/
  - https://github.com/brandspec/brandspec
  - https://brandspec.tools/
  - https://docs.adcontextprotocol.org/docs/brand-protocol
  - https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json
  - https://adcontextprotocol.org/brand/builder
  - https://github.com/adcontextprotocol/adcp
  - https://github.com/iamdanwi/brand-forge
  - https://github.com/lokesh/color-thief
  - https://lokeshdhakar.com/projects/color-thief
  - https://github.com/bramstein/fontfaceobserver
  - https://github.com/iocium/favicon-extractor
  - https://github.com/mikaelvesavuori/figmagic
  - https://github.com/klaufel/figma-tokens
  - https://www.designtokens.org/TR/drafts/format/
  - https://brand.dev/data/company-styleguide-api
  - https://designmd.app/en/what-is-design-md
tags: [brand, palette, typography, dembrandt, brand.md, brandspec]
---

# OSS brand-DNA extractors (URL / Figma → brand bundle)

## Scope

A **brand-DNA extractor** takes a live surface — a URL, a Figma file, an
uploaded logo — and returns a *machine-readable brand bundle*: palette,
typography, logo marks (raster + vector + favicon), spacing/shape tokens, and
ideally voice + guardrails. It is the input-side counterpart to the asset
generator that consumes it. The INDEX identifies this as a named gap
(**G10 — Brand-bundle consumer**): the *formats* exist (`brandspec`,
`brand.md`, AdCP `brand.json`), but almost nothing on the generation side
*consumes* them, and only a handful of repos *produce* them.

The landscape splits cleanly in two:

1. **Extractors** — turn a URL/Figma file into tokens. Real, working CLIs and
   APIs exist. Winner: `dembrandt`.
2. **Formats / spec harnesses** — define the schema humans and agents should
   read/write. Three live contenders: `brand.md`, `brandspec` (`brand.yaml`),
   AdCP `brand.json`. All three are young; none ship an automated URL-ingest
   extractor of their own.

Everything useful today sits on one of two execution paths: **headless browser
+ computed-style harvesting** (dembrandt, commercial brand.dev, BrandSpy) or
**HTML parse + asset fetch** (OpenBrand, favicon-extractor). The Figma-API
path is owned by token-export tools (Figmagic, Tokens Studio), not brand
tools.

## Extractors — URL/Figma to tokens

### `dembrandt/dembrandt` — the reference implementation

- **URL:** https://github.com/dembrandt/dembrandt · https://www.dembrandt.com
- **License:** MIT
- **Stars:** 1,668 (as of Apr 2026)
- **Stack:** TypeScript + Playwright (Chromium / Firefox), shipped as both a
  global CLI (`npm i -g dembrandt`) and a hosted MCP server.
- **Inputs:** `dembrandt <url>`, plus `--pages`, `--sitemap`, `--dark-mode`,
  `--mobile`.
- **Outputs:**
  - `design-system.json` (native shape)
  - `--dtcg` → **W3C Design Tokens Community Group** format
  - `--design-md` → DESIGN.md (the agent-readable markdown format introduced
    by Google Stitch in Mar 2026)
  - `--brand-guide` → PDF
  - MCP exposes seven tools: `get_design_tokens`, `get_color_palette`,
    `get_typography`, `get_component_styles`, `get_surfaces`, `get_spacing`,
    `get_brand_identity`.
- **What it extracts:** colors (semantic + CSS variables), typography
  (families/weights/sizes + font sources), spacing scale, border radius /
  widths / styles, shadows, button states (default/hover/active), components
  (buttons, badges, inputs, links), breakpoints, icons, framework detection
  (React/Next/Tailwind), logos.
- **Real-world quality:** dembrandt.com demos `stripe.com` and similar sites
  showing 12-color palettes with plausible role inference, 8-style type
  systems deduplicated into heading/body/label buckets, and
  hover-state swatches. On sites that use utility-CSS (Tailwind v4 `@theme`)
  or CSS custom properties, it recovers variable names; on opaque
  CSS-in-JS/atomic class outputs it falls back to computed styles and still
  produces clean tokens. Multi-page mode merges and deduplicates — the
  competitor-benchmark use case advertised on the site.
- **Integration surface:** CLI (`child_process` / `execa`), npm module,
  **MCP server** (first-class for Claude Code / Cursor / Windsurf / any
  MCP client), plus a companion `dembrandt-skills` skills pack (30 UX
  skills) installed via `npx skills add dembrandt/dembrandt-skills`.

This is the closest thing to a dependency we can *shell out to* today.

### `ethanjyx/OpenBrand` — the HTML-parse extractor

- **URL:** https://github.com/ethanjyx/OpenBrand · https://openbrand.sh
- **License:** MIT · **Stars:** ~633 (as of 2026-04) · **npm:** `openbrand` (~8.9k weekly downloads; MCP server adoption driving growth)
- **Stack:** Next.js + TypeScript + **Cheerio + Sharp** (no browser
  automation — cheap and fast).
- **Inputs:** `extractBrandAssets("https://stripe.com")` or
  `GET https://openbrand.sh/api/extract?url=...` (free API key).
- **Outputs (JSON):**
  - `logos`: favicons, `apple-touch-icon`s, header/nav `<img>` + inline SVGs
  - `colors`: `theme-color` meta → `manifest.json` → **dominant colors of
    logo imagery** (Sharp-based quantization)
  - `backdrops`: `og:image`, CSS backgrounds, hero/banner images
  - `brandName`: from `og:site_name`, `application-name`, logo `alt`, title
- **Real-world quality:** self-describes as *"open-source alternative to
  brand.dev."* Shallower than dembrandt on tokens (no spacing/typography
  system, no button states) but **more accurate on logo mark extraction** —
  it prefers the semantic `<link rel="icon">`/Apple touch icon over rendered
  viewport screenshots, which is how professional brand APIs (brand.dev,
  Clearbit, Logo.dev) actually work.
- **Integration surface:** npm package (server-side, no key), REST API,
  **MCP server, agent skill, and 40+ agent integrations**. The best fit
  when we just want a logo + primary color in ~300 ms without spinning up
  Chromium.

### Long-tail extractors

- **`iamdanwi/brand-forge`** — TS, 5★, MIT. Analyses a website and
  *generates marketing content*. Not a structured extractor; output is
  copy, not a schema. Useful as UX inspiration, not as a dependency.
  (https://github.com/iamdanwi/brand-forge)
- **`@iocium/favicon-extractor`** — TS npm, MIT, Cloudflare-Workers safe.
  Parses `<link>`/`<meta>`, follows `manifest`, groups icons by platform
  (standard / Apple / Android), picks the largest per MIME. The correct
  primitive if we only need favicons.
- **`mikaelvesavuori/figmagic`** — 857★, MIT, TypeScript. Generates design
  tokens, graphics, and React components *from a Figma document*. Uses the
  Figma REST API. The canonical OSS Figma → tokens path.
- **`klaufel/figma-tokens`** — small (25★), MIT, multi-format (CSS/SCSS/JS/
  JSON) via `figma-tokens api` + `figma-tokens build`.
- **Hosted/commercial:** `brand.dev` (closed, paid), Apify
  `ottosoftware/website-brand-extractor`, BrandSpy. All do roughly what
  dembrandt + OpenBrand do combined; none OSS.

### Palette & font primitives

- **`lokesh/color-thief`** — 12k★, MIT. Still the universal JS quantizer.
  Handles `<img>`/`<canvas>`/file paths; returns dominant + n-color palette;
  new versions expose `.hex()/.oklch()/.css()`, WCAG contrast, and semantic
  swatches (Vibrant, Muted, DarkVibrant). Both OpenBrand and hand-rolled
  puppeteer scripts use it underneath.
- **`bramstein/fontfaceobserver`** — 3.5 kB, MIT. **Loading detector, not an
  extractor** — tells you *whether* a named font is available, not *which*
  fonts a page uses. Real font extraction is done by parsing computed
  `font-family` + `src` URLs from CSSOM (what dembrandt does via Playwright)
  or by regex over `@font-face` declarations.

## Formats / spec harnesses

### `brand.md` (thebrandmd)

- **URL:** https://github.com/thebrandmd/brand.md · https://thebrand.md
- **License:** MIT · **Stars:** 4 (early)
- **Shape:** single Markdown file with YAML frontmatter; three layers —
  **Strategy** (positioning, personality, promise, guardrails), **Voice**
  (identity, tagline, pillars, phrases, tonal rules), **Visual** (colors,
  typography, photography, style). CLAUDE.md-style directory inheritance;
  four architecture types (`branded-house`, `endorsed`, `sub-brand`,
  `independent`).
- **Generator:** Claude Code plugin (`/plugin install brand-md@brand-md`,
  `/brand-md:brand`). **There is no URL-ingest extractor** — it's authored
  by interview with an LLM.

### `brandspec` (`brand.yaml`)

- **URL:** https://brandspec.dev · https://github.com/brandspec/brandspec ·
  https://brandspec.tools
- **License:** MIT · open JSON Schema
- **Shape:** one `brand.yaml` with `meta`, `core` (essence, personality,
  voice principles), `tokens` (colors in oklch, typography, spacing, radius
  — **W3C DTCG** compliant), `guidelines` (rules with severity levels),
  `assets` (logo primary/inverse, symbol, favicon).
- **Generators:** `npx brandspec init` or the "AI Workshop" (4 phases,
  model-agnostic — Claude / GPT / Gemini) that produces the yaml through
  dialogue. Output → CSS variables, Tailwind v4 `@theme`, Figma tokens JSON,
  Style Dictionary, `brand.md` — **brandspec positions itself as the
  canonical source that emits brand.md**, not a competitor.
- **No URL extractor**, but designed so "third-party tools and Style
  Dictionary / MCP servers build on the spec."

### AdCP `brand.json`

- **URL:** https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json
  · https://adcontextprotocol.org/brand/builder ·
  https://github.com/adcontextprotocol/adcp
- **License:** Apache 2.0 · **Well-known URI:** `/.well-known/brand.json`
- **Shape:** by far the richest schema of the three. Four variants
  (authoritative-redirect / house-redirect / brand-agent / house-portfolio),
  Keller-type brand architecture (`master` / `sub_brand` / `endorsed` /
  `independent`), localized `names[]`, `colors{}` with five canonical roles
  plus open `additionalProperties`, `fonts`, `tone` (voice, attributes, dos,
  donts), `tagline`, `visual_guidelines`, `rights_agent` for licensing.
- **Generator:** an interactive *web builder* at
  `adcontextprotocol.org/brand/builder` — guided form, live preview,
  download. No programmatic URL → brand.json extractor is published.

## Quality on real-world sites

Tested angles and what we observed from public demos and READMEs:

| Tool | Logo | Palette roles | Typography | Voice | Guardrails |
|---|---|---|---|---|---|
| dembrandt | decent (header/DOM) | good (12 role-inferred) | very good (heading/body/label) | *coming* (listed) | partial (DESIGN.md do/don't) |
| OpenBrand | excellent (favicon/SVG) | fair (theme-color + dominant) | none | none | none |
| brand-forge | none | none | none | generated | none |
| favicon-extractor | favicons only | none | none | none | none |
| Figmagic | from Figma | full | full | none | none |
| brand.md / brandspec / AdCP | *formats, not extractors* | — | — | native | native |

Big gap: **no OSS tool extracts voice/guardrails from a live site.** Voice is
only ever authored (brand.md workshop, brandspec workshop, AdCP builder), and
nobody parses "About" / "Press" / blog copy into tone attributes. Second
gap: **nobody round-trips brandspec ↔ brand.md ↔ brand.json in code**
despite the declared interop.

## Integration recommendations

**Call directly (2–3).**

1. **`dembrandt`** — the primary token extractor. Shell out via its CLI or
   wire its MCP server behind our `brand_bundle_extract` tool. It already
   emits DTCG and DESIGN.md, so our internal normalizer only has to map
   DTCG → brand.md frontmatter + brandspec `brand.yaml`.
2. **`OpenBrand`** — secondary, called in parallel for the logo mark, the
   `og:image`/backdrop, and the brand-name signals dembrandt's computed-style
   pass is weaker on. Cheap (no browser), MIT, npm-native.
3. **`@iocium/favicon-extractor`** — edge-safe fallback for the favicon /
   apple-touch / manifest icon triage when we don't need full brand
   extraction (e.g. MCP `get_favicon_set` tool).

**Fork or reimplement (1–2).**

1. **A brandspec/brand.md/brand.json normalizer.** None of the three format
   harnesses ship a URL → *their format* extractor, and the INDEX's G10
   names this as whitespace. We **reimplement a thin normalizer** that
   takes `dembrandt --dtcg` + `OpenBrand` output and emits all three
   canonical formats (`brand.yaml`, `brand.md`, `.well-known/brand.json`).
   This is the integration moat called out in the INDEX: *"nothing
   generates against them."*
2. **A voice extractor (new).** There's no OSS tool that reads a site's
   copy and produces `tone.voice` / `tone.attributes` / `dos` / `donts`.
   Fork **brand-forge**'s copy-analysis pass (or build from scratch with an
   LLM + Cheerio over the homepage + `/about` + the latest blog post) and
   emit the `tone` block for all three formats. Small and defensible: it
   closes the voice-layer gap in every brand-bundle format simultaneously.
