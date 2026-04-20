# Iconify Ecosystem — Research for `prompt-to-asset`

**Research value: high** — Iconify is the single most leverage-rich dependency we could bolt onto the MCP's asset tooling. It gives us ~275k vetted SVG icons from 200+ sets with machine-readable licensing and a clean programmatic path (`@iconify/json` + `@iconify/utils`) that requires no network dependency at runtime.

---

## 1. iconify.design overview

Iconify (<https://iconify.design>) is an open-source icon delivery system that aggregates **275,000+ icons across 200+ open-source icon sets** (Material Symbols, Tabler, Lucide, Phosphor, Carbon, Heroicons, Simple Icons for brand marks, Twemoji, Noto Emoji, etc.). Each set:

- Has a unique **prefix** (e.g. `mdi`, `tabler`, `lucide`, `ph`, `carbon`, `logos`, `simple-icons`, `twemoji`).
- Ships with a consistent design grid, padding, and **one license** covering every icon in the set.
- Is validated, de-duplicated, and re-optimised by the Iconify team on a rolling schedule (updated 2–3× per week).

The full catalogue is browsable at <https://icon-sets.iconify.design>, with filters for license, category (general/emoji/thematic/brands), palette (monotone vs. full-colour), and tags.

## 2. `@iconify/json` — the data package

`@iconify/json` (npm, ~396 MB unpacked, ~220k weekly downloads) is the single package that bundles **every open-source Iconify set** as JSON. Structure:

```
@iconify/json/
  json/
    mdi.json
    tabler.json
    lucide.json
    ...  (one file per prefix)
  collections.json     # index of all sets with metadata (info only, no icons)
  locate()             # helper that resolves the on-disk path for a prefix
```

Each per-set file is an `IconifyJSON` document. The important shape:

```json
{
  "prefix": "mdi",
  "icons": {
    "rocket": {
      "body": "<path d='M13.13 22...' />",
      "width": 24,
      "height": 24
    }
  },
  "aliases": {
    "rocket-outline": { "parent": "rocket" }
  },
  "info": { ... IconifyInfo ... },
  "categories": { "Transport": ["rocket", "rocket-launch"] },
  "lastModified": 1725000000
}
```

Key traits:

- **Body-only SVG** — no `<svg>` wrapper. That is added at render time with the `viewBox` reconstructed from `width/height/left/top`.
- **Aliases** compress the file by referencing a parent icon plus optional `rotate`, `hFlip`, `vFlip`.
- **Transformations** (`rotate: 0–3`, `hFlip`, `vFlip`) are data, not runtime hacks — `iconToSVG()` bakes them into the output.

For lazily loading just one set, the sister packages `@iconify-json/<prefix>` (e.g. `@iconify-json/mdi`, `@iconify-json/lucide`) each export the same JSON as an ES module — dramatically cheaper than pulling the 400 MB monorepo.

## 3. `@iconify/utils` — programmatic access

`@iconify/utils` is the TypeScript toolbox for turning icon data into clean SVG strings. Headline functions:

| Function | Purpose |
|---|---|
| `getIconData(iconSet, name)` | Resolve a name (including aliases + transformations) into a fully-materialised `IconifyIcon`. |
| `iconToSVG(iconData, customisations?)` | Produce `{ attributes, body, viewBox }` — size/flip/rotate baked in. |
| `iconToHTML(body, attributes)` | Stringify into a final `<svg …>body</svg>`. |
| `replaceIDs(body, prefix?)` | Rewrite internal `id="…"` references so multiple inlined SVGs do not collide. |
| `getIcons(iconSet, names)` | Batch extract a filtered sub-set (useful to ship a trimmed icon bundle). |
| `parseIconSet(data, cb)` | Stream every icon in a set through a callback. |
| `convertParsedSVG()` / `wrapSVGContent()` | Import arbitrary SVG strings into Iconify format / wrap bodies for transformation. |

Customisations (`IconifyIconCustomisations` type):

- `width` / `height` — `number`, `"1em"`, `"auto"` (use the viewBox), or `"unset"` / `"none"` to omit the attribute.
- `rotate` — 0–3 (×90°).
- `hFlip` / `vFlip` — booleans.

Colour is not a customisation: monotone icons inherit `currentColor`, so you control them with CSS `color`. Multicolour icons (`info.palette === true`) ignore `currentColor`.

## 4. `iconify-icon` web component and `@iconify/react`

Three render-time flavours, with different trade-offs:

- **`iconify-icon`** — framework-agnostic custom element (`<iconify-icon icon="mdi:rocket">`), SSR-safe, fetches from the Iconify API by default. Preferred for Next.js / any SSR app.
- **`@iconify/react`** — native React 18+ component. Client-only, uses the API. Convenient but causes hydration mismatches with RSC.
- **`@iconify-icon/react`** — React wrapper around the web component. Adds TypeScript typings, `className`, and supports inline icon data (bundled, no API round-trip). Best of both.

All three accept either a string name (`"mdi:rocket"`, which triggers an API lookup) or a pre-resolved `IconifyIcon` object (fully offline). For the MCP we care mostly about the **offline path** via `@iconify/utils`; web component is only relevant if we emit front-end code to the caller.

## 5. `IconifyInfo` — licence, category, palette

`info` is the metadata block the MCP needs for **licence-aware filtering**. Shape (`@iconify/types`):

```ts
interface IconifyInfo {
  name: string;
  author: { name: string; url?: string };
  license: { title: string; spdx?: string; url?: string };
  total?: number;
  version?: string;
  samples?: string[];
  height?: number | number[];
  displayHeight?: number;
  category?: string;                 // e.g. "General", "Emoji", "Brands / Social"
  tags?: string[];
  palette?: boolean;                 // true = multi-colour, false = monotone (currentColor)
  hidden?: boolean;                  // deprecated sets
}
```

The aggregate `collections.json` in `@iconify/json` maps every prefix to its `IconifyInfo`. That's what powers the licence filter on icon-sets.iconify.design — and what we should reuse server-side.

## 6. Filtering sets by licence

There is no built-in `filterByLicense()` helper — you inspect `info.license.spdx` yourself. Known buckets (non-exhaustive):

| Licence | Example sets |
|---|---|
| **MIT** | Tabler, Lucide, Feather, Boxicons, Iconoir, Phosphor, Heroicons, Flowbite, Pixelarticons, Akar, Prime, EOS, SVG Spinners |
| **Apache-2.0** | Material Symbols, Material Symbols Light, Google Material (`ic`), Material Design Icons (`mdi`), Remix Icon, MingCute, Unicons |
| **CC0-1.0** | Radix Icons, Bootstrap Icons (MIT in newer versions — always check `spdx`), Simple Line Icons variants |
| **CC-BY-4.0** | Solar, IconaMoon, Basil, Coolicons, Lets Icons, Plump/Sharp/Ultimate free |
| **OFL-1.1** | Material Design Light, a handful of font-origin sets |
| **Brand marks (restricted)** | `logos`, `simple-icons`, `skill-icons`, `vscode-icons` — usually CC0 or CC-BY for the SVG *shapes*, but the underlying trademarks are **not** free to use. Treat these as "display only, do not re-brand". |

Recommended MCP policy: default allow-list is **MIT + Apache-2.0 + CC0** (the clean commercial-safe trio). CC-BY sets require the caller to opt in (they impose an attribution obligation). OFL sets are fine. `logos`/`simple-icons` behind a separate `allow_brand_marks` flag with an explicit warning that the *marks themselves* belong to the brand owners.

## 7. Self-hosting vs. public API

**Public API** (`https://api.iconify.design`, backups `api.simplesvg.com`, `api.unisvg.com`):

- Free, CDN-backed (US / EU / APAC / AU), CloudFlare fronted.
- Endpoints: SVG (`/{prefix}:{name}.svg?height=48&color=%23f00`), CSS (background/mask), JSON (per-icon data), search (`/search?query=…`), collection listing (`/collections`).
- **Uptime is good but not SLA-backed**; you are asked to sponsor if you drive serious traffic.

**Self-hosted API** (`@iconify/api`, Node.js, also Docker image `iconify/api`):

- Same query contract, runs on port 3000 behind an nginx reverse proxy.
- You choose which sets to include and can register **custom sets** with your own prefixes.
- Supports mixing in private brand packs alongside open-source ones.

**For `prompt-to-asset`**, the right default is neither — it's to **bundle `@iconify/json` (or a trimmed, licence-filtered sub-set) with the MCP server**. That way:

- No network dependency at tool-call time (important for offline/firewalled users).
- Deterministic, reproducible output for the same icon name.
- No rate limits, no surprise latency.
- We can still expose an opt-in `source: "api"` mode that proxies to the public API for sets we did not bundle.

## 8. Integration plan for `asset_generate_app_icon`

### Flow

When the caller invokes `asset_generate_app_icon({ concept: "rocket" })`:

1. **Primary path** (generative) still runs whatever image generator is configured.
2. **Fallback / opt-in path** (`allow_iconify_fallback: true` or `source: "iconify"`):
   1. Tokenise the `concept` string → candidate search terms (`["rocket", "launch", "space"]`).
   2. Query a pre-built local index of `{ prefix, name, tags, categories, license }` derived from `@iconify/json` at install time. Rank by: licence allow-list match → tag exactness → set popularity.
   3. Resolve the winner through `getIconData` + `iconToSVG` + `iconToHTML`.
   4. Optionally recolour: the MCP sets `color` on the wrapping `<svg>` via a `style="color: #RRGGBB"` attribute for monotone icons; for multicolour icons (`info.palette === true`), we return the SVG untouched and surface that fact in the response.
   5. Return `{ svg, prefix, name, license: { spdx, url, attribution_required } }` so the caller knows exactly what they got and under what terms.

### Tool surface additions

- New tool: `asset_search_iconify({ query, licenses?, category?, limit? })` → list candidate icons.
- New tool: `asset_get_iconify_icon({ name: "mdi:rocket", color?, size?, rotate?, flip? })` → return a clean standalone SVG.
- Extend `asset_generate_app_icon` with:
  - `source: "generative" | "iconify" | "auto"` (default `"generative"`, `"auto"` falls back to Iconify on generator failure).
  - `iconify_license_allowlist: string[]` (default `["MIT", "Apache-2.0", "CC0-1.0", "OFL-1.1"]`).
  - `allow_brand_marks: boolean` (default `false`).

### Licence surfacing

Every response that contains an Iconify-sourced SVG **must** carry the `license` block in its JSON envelope. For `CC-BY-4.0` we additionally include an `attribution` string the caller is responsible for displaying (`"<author> — <set name> (CC BY 4.0)"`). This is the same pattern icon-sets.iconify.design uses in its "Copy as SVG" dialog.

### Packaging

- Depend on `@iconify/utils` (small, ~40 KB).
- Instead of the full `@iconify/json` (~400 MB), bundle a **curated list of `@iconify-json/<prefix>` packages** (e.g. `mdi`, `lucide`, `tabler`, `ph`, `carbon`, `heroicons`, `simple-icons`, `twemoji`, `logos`). This keeps the MCP install under ~30 MB while still covering >80% of real-world concepts.
- At build time, generate a flat search index (`{ key: "mdi:rocket", tags, categories, license, palette }`) and ship it alongside. This avoids scanning 275k icons per query at runtime.

### Code snippet — core lookup helper

```ts
import { icons as mdi } from '@iconify-json/mdi';
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';

export function renderIconifyIcon(name: string, opts: { height?: number | string; color?: string } = {}): string {
  const data = getIconData(mdi, name);
  if (!data) throw new Error(`icon not found: mdi:${name}`);
  const render = iconToSVG(data, { height: opts.height ?? 'auto' });
  const attrs = { ...render.attributes, ...(opts.color ? { style: `color:${opts.color}` } : {}) };
  return iconToHTML(replaceIDs(render.body), attrs);
}
```

`replaceIDs` guards against clashing gradient/filter IDs when multiple SVGs are inlined into the same document — essential when the MCP response concatenates icons.

### Edge cases to handle

- **Missing icon** — `getIconData` returns `null` for both unknown names and unresolved aliases. Treat as "no Iconify match, fall back to generative or return `ICON_NOT_FOUND`".
- **Multicolour sets** — detect via `info.palette === true`; `color` option becomes a no-op and must be reported in the response.
- **Brand marks** — gated behind explicit opt-in; always include the brand owner's name + "trademark of …" disclaimer in the response.
- **Size semantics** — pass `"auto"` to preserve the source viewBox, pass a number to get a fixed pixel square. Avoid the default `"1em"` unless the caller is embedding into HTML.

---

## Sources

- <https://iconify.design/docs/icons/> — icon-set basics, prefix conventions.
- <https://iconify.design/docs/icons/all.html> — `@iconify/json` package layout.
- <https://iconify.design/docs/libraries/utils/> — `@iconify/utils` function reference.
- <https://iconify.design/docs/libraries/utils/icon-to-svg.html> — `iconToSVG()` contract and customisations.
- <https://iconify.design/docs/libraries/utils/get-icon-data.html> — `getIconData()` behaviour including aliases.
- <https://iconify.design/docs/types/iconify-info.html> — `IconifyInfo` shape (license/category/palette).
- <https://iconify.design/docs/types/iconify-json-metadata.html> — metadata (categories, themes, chars).
- <https://iconify.design/docs/api/> — public API surface, redundancy, self-hosting pointers.
- <https://iconify.design/docs/api/hosting.html> — `@iconify/api` self-hosting (Node/NPM/Docker).
- <https://iconify.design/docs/iconify-icon/> + <https://iconify.design/docs/icon-components/react> — web component and React wrappers.
- <https://icon-sets.iconify.design/> — live licence/category filters (source of truth for set-to-licence mapping).
- <https://github.com/iconify/icon-sets> — canonical repo backing `@iconify/json`.
