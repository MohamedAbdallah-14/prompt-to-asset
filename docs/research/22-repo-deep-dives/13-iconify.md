---
wave: 2
role: repo-deep-dive
slug: 13-iconify
title: "Deep dive: iconify/iconify"
repo: "https://github.com/iconify/iconify"
license: "MIT (framework); icon sets vary"
date: 2026-04-19
sources:
  - https://github.com/iconify/iconify
  - https://github.com/iconify/icon-sets
  - https://github.com/iconify/icon-sets/blob/master/collections.md
  - https://github.com/iconify/tools
  - https://github.com/iconify/api
  - https://iconify.design/docs/api/
  - https://iconify.design/docs/api/queries.html
  - https://iconify.design/docs/api/search.html
  - https://iconify.design/docs/api/icon-data.html
  - https://iconify.design/docs/api/cdn.html
  - https://iconify.design/docs/api/hosting.html
  - https://iconify.design/docs/api/hosting-js/
  - https://iconify.design/docs/iconify-icon/
  - https://iconify.design/docs/iconify-icon/react.html
  - https://iconify.design/docs/icon-components/
  - https://iconify.design/docs/libraries/utils/
  - https://iconify.design/docs/libraries/utils/get-icon-data.html
  - https://iconify.design/docs/libraries/tools/import/figma.html
  - https://iconify.design/docs/types/iconify-icon.html
  - https://iconify.design/docs/types/iconify-json.html
  - https://icon-sets.iconify.design/svg-spinners
  - https://github.com/n3r4zzurr0/svg-spinners
  - https://github.com/tailwindlabs/heroicons
tags: [iconify, icons, svg, composition, rest-api, web-component, mcp]
---

# Deep dive: `iconify/iconify`

## Why Iconify matters for this plugin

Iconify is the backbone of the **"iconic single-glyph fast path"** that our
`enhance_prompt` tool uses as the composition alternative to diffusion. When the
intent classifier decides that a request is a single-mark icon rather than a
brand-unique logo (the "sparkline icon for a trading app" class from [20b](../20-open-source-repos-landscape/20b-asset-generator-fullstack-repos.md)),
Iconify gives us **275,000+ curated, vector-perfect, commercially-licensable
marks across 200+ sets** behind one uniform JSON schema and one REST API. That is
an order of magnitude more coverage than SVGL's 400 brand marks or Lobe Icons'
~300 AI brand marks, and it is the single dependency `zhangyu1818/appicon-forge`
(981★) leans on for the same "deterministic composition" rail we want.

## Repo metrics

The `iconify/iconify` monorepo sits at **~6,017 stars, 189 forks, 30 contributors,
active commits through April 2026**, created February 2017. Primary language is
TypeScript (77%); the rest is Svelte, Vue, CSS. Top contributor `cyberalien`
(Vjacheslav Trushkin) authors the vast majority of commits — this is effectively
a solo-maintained project with a strong bus-factor concern. The ecosystem is
split across several GitHub orgs under `iconify/`:

> **Updated 2026-04-21:** The `@iconify/icon-sets` catalog now contains
> **291,749 icons across 209 icon sets** (up from 275k+ / 200+ sets as of early
> 2026), updated automatically three times a week. Active commits continue
> through April 2026, including SVG + CSS components for SolidJS (March 6) and
> React (March 4). The star count on `iconify/iconify` itself remains around
> 6k — growth has been slow because distribution is via npm (`@iconify/utils`,
> `@iconify/json`) rather than GitHub stars. Bus-factor concern unchanged:
> `cyberalien` is still the sole significant committer.

- `iconify/iconify` — framework, components, CSS tools, web component
- `iconify/icon-sets` — the 200+ curated JSON icon sets (`@iconify/json`)
- `iconify/tools` — the Node SDK for importing/cleaning/exporting sets
- `iconify/api` — the Node.js server that powers `api.iconify.design`

## License model: framework MIT, icon sets vary — and this matters

The framework code (`iconify/iconify`, `iconify/tools`, `iconify/api`,
`@iconify/utils`, `@iconify/json`) is **MIT**. The JSON icon sets, however,
retain the license of the upstream project the icons came from. For a commercial
SaaS that ships icons as part of a generated brand bundle, this is the single
most important piece of due diligence. Per [`iconify/icon-sets/collections.md`](https://github.com/iconify/icon-sets/blob/master/collections.md)
and per-set verification:

| Icon set | Prefix | Count | Author | License | Commercial-safe? |
|---|---|---|---|---|---|
| Material Design Icons | `mdi` | ~7,400 | Pictogrammers | Apache-2.0 | yes |
| Material Symbols | `material-symbols` | ~12,000 | Google | Apache-2.0 | yes |
| Lucide | `lucide` | ~1,400 | Lucide Contributors | ISC | yes |
| Tabler Icons | `tabler` | ~5,800 | Paweł Kuna | MIT | yes |
| Heroicons | `heroicons` | ~300 | Tailwind Labs | MIT | yes |
| Phosphor | `ph` | ~9,000 | Phosphor Icons | MIT | yes |
| Iconoir | `iconoir` | ~1,600 | Luca Burgio | MIT | yes |
| Remix Icon | `ri` | ~3,000 | Remix Design | Apache-2.0 | yes |
| Bootstrap Icons | `bi` | ~2,000 | Bootstrap | MIT | yes |
| SVG Spinners | `svg-spinners` | 46 | Utkarsh Verma | MIT | yes (animated) |
| Simple Icons (brand) | `simple-icons` | ~3,000 | Simple Icons | CC0-1.0 | yes, read brand-usage caveats |
| FontAwesome 6 Free | `fa6-solid` / `fa6-regular` / `fa6-brands` | ~2,000 | Fonticons | CC-BY-4.0 (icons) + MIT (code) | yes **with attribution** |
| Noto Emoji | `noto` | ~3,000 | Google | Apache-2.0 | yes |
| Emoji One | `emojione` | ~1,800 | EmojiOne | CC-BY-4.0 (v2) / proprietary (newer) | **check version** |
| Twemoji | `twemoji` | ~3,600 | Twitter/X | CC-BY-4.0 (graphics) | yes **with attribution** |
| Flat Color Icons | `flat-color-icons` | 329 | Icons8 | MIT | yes |
| Icons8 line-style sets | `icons8-*` | varies | Icons8 | **Linkware (Good Boy License)** | **attribution-required or paid license** |

The nine marquee UI sets (MDI, Material Symbols, Lucide, Tabler, Heroicons,
Phosphor, Iconoir, Remix, Bootstrap) are all permissive (Apache-2.0/MIT/ISC) —
**no attribution required in shipped product**, though source files must retain
copyright notices. SVG Spinners is MIT and gives us a rare, commercially-clean
set of **animated** loader icons — useful for empty-states and progress pieces.
The three traps are **Icons8 Linkware sets**, **FontAwesome CC-BY-4.0 icons**
(attribution required), and **Twemoji / Emoji One** graphics (CC-BY-4.0).
Our `enhance_prompt` iconic fast path must maintain an allowlist of prefixes
whose license is permissive-without-attribution, and surface the attribution
requirement to the user when routing outside that allowlist.

## The REST API (`api.iconify.design`)

Four endpoint families, all GET, all cache-friendly, all CORS-enabled:

1. **Icon data** — `/{prefix}.json?icons=home,user,cog` returns an
   `IconifyJSON` object: `{ prefix, icons: { name: { body, width, height } },
   width, height, aliases?, not_found? }`. The `body` field is the inner SVG
   markup without the outer `<svg>` tag — ready for direct templating.
2. **Rendered SVG** — `/{prefix}/{icon}.svg?color=%23f00&width=32&height=32`
   returns an `image/svg+xml` payload with viewBox pre-computed. Supports
   `color`, `width`, `height`, `rotate`, `flip`, `align`, `box`.
3. **CSS** — `/{prefix}.css?icons=home,user` returns CSS rules that use the
   icons as `mask-image` / `background-image` — useful for Tailwind-style icon
   classes with zero JS.
4. **Search & discovery** — `/search?query=chart+line&limit=64&prefixes=mdi,lucide,tabler`
   plus `/collections`, `/collection?prefix=mdi`, `/last-modified?prefixes=mdi`
   for cache invalidation.

Backup hosts `api.simplesvg.com` and `api.unisvg.com` serve the same data; the
client library fails over automatically. Infrastructure is **Amazon Route53
latency-based routing** across US-east/west, UK, Germany, Singapore, Japan, and
Australia — not AnyCast — giving us sub-50ms median response times from major
regions for cached icon data (<1KB typical).

## Search API (the key surface for us)

`GET /search?query=...` is the endpoint our `enhance_prompt` hits for intent
classification. Parameters:

- `query` (required, case-insensitive) — natural-language or keyword term
- `limit` (32–999, default 64) — **prefer 999 on subsequent pages** because the
  server re-walks all icons on every request regardless of `start`
- `prefixes` — comma-separated allowlist (we pin this to our license-safe nine)
- `category` — e.g. `"General"`, `"Brands / Social"`, `"Emoji"`
- `start` — pagination offset

Response schema:

```json
{
  "icons": ["mdi:chart-line", "tabler:chart-line", "lucide:line-chart", ...],
  "total": 1842,
  "limit": 64,
  "start": 0,
  "collections": {
    "mdi": { "name": "Material Design Icons", "license": {...} }
  },
  "request": { "query": "chart line", "limit": "64" }
}
```

Two important properties: (1) results return as `prefix:name` tuples that are
directly usable in the icon data endpoint with zero transformation, and (2) the
`collections` map ships the license block inline — we can enforce the
permissive-set allowlist by intersecting with `collections[prefix].license.spdx`
without a second round-trip.

## Node SDK: `@iconify/utils` and `@iconify/tools`

Two packages, two different jobs:

`@iconify/utils` (MIT) is the lightweight **runtime** library we embed in our
Next.js route handler. Key exports used by the fast path:

```typescript
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';

const iconData = getIconData(fullSet, 'chart-line');
const render    = iconToSVG(iconData);
const svg       = iconToHTML(replaceIDs(render.body), render.attributes);
```

`replaceIDs` is critical: it rewrites internal `<defs>` `id` attributes to be
unique per render, so multiple instances of the same icon on one page don't
break each other's gradients or clip-paths. Without it, composition-heavy pages
silently mis-render.

`@iconify/tools` is the **build-time** import pipeline — used only when we
ingest a user's Figma icon library into the brand bundle. Highlights:
`importDirectory()`, `importFromFigma()` (takes a Figma API token + file ID),
`cleanupSVG()`, `parseColors()` (replace fills with `currentColor` for
monotone), `runSVGO()`, `exportJSONPackage()`. The Figma path has built-in
caching (`cacheDir`, `cacheAPITTL`, `cacheSVGTTL`) which we reuse for the
"user uploads design system" flow. **v5 is ESM-only**; CommonJS consumers pin
v4.

## Framework integrations

The web-component strategy is the architectural win. `iconify-icon` is a
~15KB custom element that:

- renders SVG **in shadow DOM** — no CSS bleed, no hydration mismatch
- fetches icon data from `api.iconify.design` **on demand and batches**
  sibling requests on the same tick
- caches into `localStorage` by default
- is directly usable in Svelte, SvelteKit, Vue 2/3, Lit, Ember, vanilla HTML

For React we ship the `@iconify-icon/react` wrapper, which exists only because
React's `className` handling on custom elements is still broken; the wrapper
also adds typed props and JSX hints. Solid gets a dedicated wrapper. Svelte and
Vue need nothing. For SSR-sensitive paths (our Next.js server components) we
prefer `@iconify/utils` + direct SVG injection over the web component to avoid
the client-side fetch entirely.

The older `@iconify/react`, `@iconify/vue`, `@iconify/svelte` packages still
work but are in soft-maintenance — new work goes into the web component path.

## How `enhance_prompt` uses Iconify — the fast path

When the rewriter classifies an intent as `asset_type: "icon" ∧ complexity:
"single_glyph"`, we skip diffusion entirely and run this pipeline:

1. **Keyword extraction** from the enhanced prompt (`"a sparkline icon for a
   trading app"` → `["chart-line", "trending-up", "finance"]`) via a small
   local token extractor.
2. **Parallel search**: `GET /search?query=<each>&prefixes=<allowlist>&limit=32`
   — typically 2–5 queries, ~40–80ms each, run concurrently.
3. **Rank and dedupe** results by a composite score: exact name match > set
   affinity (if brand bundle pins `mdi`) > glyph coverage in the target palette.
4. **Fetch icon data** for the top-8 candidates via the bulk endpoint
   `/{prefix}.json?icons=<csv>` — one round-trip per distinct prefix, ~20–50ms
   cached, <10KB typical payload.
5. **Compose** via `@iconify/utils` + the brand-bundle tokens (gradient, stroke,
   radius, shadow) — roughly the `appicon-forge` recipe but driven by the
   rewriter, not a UI.
6. **Return** `{ svg, png_1024, source: { prefix, name, license, attribution_required } }`
   alongside the diffusion-based alternatives.

**Latency budget.** Cold `/search` hits are ~60–120ms; warm cache is <20ms.
Icon-data `/X.json` calls are <30ms warm. Total fast-path end-to-end: **under
250ms** from rewriter exit to SVG-in-hand, versus **5–30 seconds** for the
diffusion alternative. For interactive UI ("show me icon options as I type")
this is the difference between a usable product and a slow one.

**Caching strategy** — three tiers:

1. **Edge (Cloudflare Workers in front of our route handler)**: cache
   `/search` responses 60s, icon data 24h, `/last-modified` 5s; key includes
   the prefix allowlist so license filtering doesn't invalidate cross-tenant.
2. **Process-local LRU** (`@iconify/utils` + `lru-cache`, ~2000 icons): covers
   the "same user asking for variants of the same concept" hot path.
3. **Client `localStorage`** via the standard Iconify client for browser-side
   rendering in our web UI; inherits the library's delta-sync via
   `/last-modified`.

When we need full isolation (enterprise customers with no-egress policies) we
can self-host via `iconify/api` — a Node.js server, single binary, reads from
`@iconify/json` (~60MB of JSON for the full 200-set catalog), and exposes the
exact same REST surface. This is cheap enough to run as a single container
alongside the MCP server and eliminates the external dependency entirely.

## Decision

**Adopt `@iconify/utils` + `@iconify/json` as a first-class runtime dependency
of `enhance_prompt` for the iconic single-glyph fast path.** Embed the library
in the Next.js route handler so we can do search → fetch → compose in-process;
do not wire the browser web component through our MCP response because the
output contract needs to be static SVG/PNG not a live DOM element. Use the
hosted `api.iconify.design` with a thin edge cache in v1; plan a self-hosted
`iconify/api` container for the enterprise tier. Pin the license allowlist to
the nine permissive-without-attribution sets (MDI, Material Symbols, Lucide,
Tabler, Heroicons, Phosphor, Iconoir, Remix, Bootstrap) plus SVG Spinners for
loaders; surface attribution requirements to the user when routing to
FontAwesome, Twemoji, or Icons8 Linkware. Ship an MCP tool
`search_iconify_glyph(query, style, brand_bundle?) → { svg, png, source }` as
the composition counterpart to `generate_logo` so agents can pick the right
tool for the job — this is the concrete implementation of the **"composition
beats generation for iconic needs"** finding from [INDEX finding 7](../20-open-source-repos-landscape/INDEX.md)
and [20b controversy 3](../20-open-source-repos-landscape/INDEX.md).
