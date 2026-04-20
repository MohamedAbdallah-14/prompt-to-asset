# 09 — Open-Source Icon Collections (Bundleable / Referenceable)

Scope: permissive-licensed icon libraries usable by `prompt-to-asset` for icon packs, fallback marks, logo composition, and demo content. Focus is on: repo URL, license, icon count, style axes, delivery format, and whether raw SVGs are available for programmatic composition (reading path data, compositing, restyling, recoloring).

> **License sanity check.** MIT / Apache-2.0 / ISC / CC0 are unambiguously safe for bundling *and* modification. CC-BY-3.0 (Game Icons) is safe but requires **attribution**. OFL (Open Font License) applies to font-packaged sets (Material Symbols) and is fine for bundling but with OFL redistribution rules. Brand-mark sets (Simple Icons) carry an extra **trademark** layer on top of the code license — the SVG path data is CC0, but the *marks themselves* remain the trademark holder's property.

---

## Quick-reference table

| Set | License | Count (approx) | Styles / Axes | Delivery | Raw SVGs for composition |
|---|---|---|---|---|---|
| Lucide | **ISC** (Feather-derived portions MIT) | ~1,600+ | Single stroke style, 24×24, 2px | `lucide` + framework pkgs (`lucide-react`, `lucide-vue-next`, …); Iconify `lucide` | Yes — per-icon SVG files in repo `/icons` |
| Heroicons | **MIT** | ~300 designs × 4 sizes (24 outline, 24 solid, 20 mini, 16 micro) | Outline + Solid, multiple pixel grids | `@heroicons/react`, `@heroicons/vue`; Iconify `heroicons` | Yes — `optimized/` SVG dirs by size |
| Tabler Icons | **MIT** | 6,092 (5,039 outline + 1,053 filled) | Outline + Filled, 24×24, 2px | `@tabler/icons`, `@tabler/icons-react`, `@tabler/icons-svg`; Iconify `tabler` | Yes — `icons/outline` + `icons/filled` SVG |
| Phosphor | **MIT** | 1,248 per weight | 6 weights: Thin/Light/Regular/Bold/Fill/**Duotone** | `@phosphor-icons/react`, `@phosphor-icons/web`, `@phosphor-icons/core`; Iconify `ph` | Yes — `raw/` dir, one folder per weight |
| Feather | **MIT** | ~287 | Single stroke, 24×24 | `feather-icons` npm; Iconify `feather` | Yes — `icons/` SVG dir (project low-activity) |
| Remix Icon | **⚠ Remix Icon License v1.0** (was Apache-2.0; changed Jan 2026) | 3,200+ | Outline (`-line`) + Filled (`-fill`), 24×24 | `remixicon` npm; Iconify `ri` | Yes — but **re-verify license** before shipping; new license disallows using marks as logos/brand identity and disallows repackaging as a competing icon library |
| Bootstrap Icons | **MIT** | 2,000+ | Mostly filled + some outline, 16×16 base | `bootstrap-icons` npm (SVG + font); Iconify `bi` | Yes — `icons/` dir |
| Ionicons | **MIT** | ~1,300 × 3 variants | Outline, Filled, Sharp | `ionicons` npm; Iconify `ion` | Yes — `src/svg/` |
| Material Symbols | **Apache-2.0** (font also under **OFL** for font packaging) | 2,500+ glyphs | **Variable font axes**: FILL (0–1), wght (100–700), GRAD (-50–200), opsz (20–48); 3 styles: Outlined / Rounded / Sharp | Google Fonts CSS + `material-symbols` npm (font) + `@material-symbols/svg-*` (SVG); Iconify `material-symbols` | Yes — `@material-symbols/svg-400` etc. ship raw SVG per weight; font is variable and stylable without swapping files |
| Fluent UI System Icons | **MIT** (Microsoft) | ~12,000 SVGs (designs × sizes) | Regular + Filled, multiple pixel sizes (16/20/24/28/32/48) | `@fluentui/svg-icons` + platform pkgs (`@fluentui/react-icons`, iOS/Android); Iconify `fluent` | Yes — `assets/<icon>/SVG/` per-size, per-theme |
| Octicons | **MIT** (GitHub) | ~250 design ideas × 2 sizes (12, 16, 24) | Outline-ish single style; sizes 12/16/24 | `@primer/octicons`, `@primer/octicons-react`; Iconify `octicon` | Yes — `icons/` SVGs by size |
| Simple Icons | **CC0-1.0** (SVG path data) — see trademark caveat | 3,400+ brand marks | Single-color SVG logos | `simple-icons` npm (JSON + SVG), CDN (jsDelivr / unpkg); Iconify `simple-icons` | Yes — `icons/` SVG + `_data/simple-icons.json` with hex colors & brand info. **But** brand logos are trademarks of their owners; CC0 covers the path data / repo, not the right to use a brand as your own identity |
| Carbon Icons | **Apache-2.0** (IBM) | ~2,000 designs → ~7,000 sized SVGs (16/20/24/32) | Outline-leaning, multi-size redraws | `@carbon/icons`, `@carbon/icons-react`, `@carbon/icons-vue`, `@carbon/pictograms`; Iconify `carbon` | Yes — per-size SVGs; pictograms are separate richer illustrations (Apache-2.0) |
| Radix Icons | **MIT** (WorkOS) | ~300 | Single style, crisp 15×15 grid | `@radix-ui/react-icons`; Iconify `radix-icons` | Yes — `packages/radix-icons/icons/` |
| Akar Icons | **MIT** | ~500 | Outline, 24×24 | `akar-icons` npm + `akar-icons-fonticon`; Iconify `akar-icons` | Yes — `src/` SVGs |
| MingCute | **Apache-2.0** | 3,000+ | Line + Fill, 24×24 | Iconify `mingcute`; direct SVG repo | Yes — repo SVG tree |
| Pixelarticons | **MIT** | 800 free (2,000+ paid tier) | Pixel-art, strict 24×24 grid | `pixelarticons` npm; Iconify `pixelarticons` | Yes — `svg/` dir; render at multiples of 24px for crisp pixels |
| Game Icons | **CC-BY-3.0** (some contributors' icons CC0) | ~4,000+ | Stylized game/fantasy glyphs | `game-icons.net` SVG export, Iconify `game-icons` | Yes — `game-icons/icons` repo; **attribution required** ("Icons made by {author}") unless a given author is marked CC0 |

---

## Per-set detail

### Lucide — `lucide-icons/lucide`
- **License:** ISC. Icons inherited from Feather remain MIT. Both are permissive, effectively equivalent for bundling.
- **Style:** single 24×24 stroke family, 2px stroke, very consistent geometry. Good default UI icon set.
- **Delivery:** first-class framework packages (`lucide-react`, `lucide-vue-next`, `lucide-svelte`, `lucide-preact`, `lucide-solid`, `lucide-angular`), plain JS (`lucide`), and web-component. Iconify prefix `lucide`. Raw SVGs in `/icons` — single-path-friendly and trivial to parse.
- **Why it matters for prompt-to-asset:** the modern default UI icon family; the stroke-consistent SVGs are ideal for programmatic restyling (recolor fill/stroke, swap widths, mask into logo marks).

### Heroicons — `tailwindlabs/heroicons`
- **License:** MIT.
- **Style:** two weights × multiple pixel grids. `outline` 24×24 stroke, `solid` 24×24 filled, `mini` 20×20 solid, `micro` 16×16 solid (introduced in v2.1.0, ~300 icons). Designed to pair with the solid/outline dual naturally.
- **Delivery:** `@heroicons/react`, `@heroicons/vue`; the repo's `optimized/` directory ships raw SVGs by size & style. Iconify prefix `heroicons`.
- **Notes:** smaller catalog than Tabler/Lucide, but pixel-grid-authentic sizes make it excellent for toolbar/menu/ UI chrome.

### Tabler Icons — `tabler/tabler-icons`
- **License:** MIT.
- **Counts:** 6,092 SVGs — 5,039 outline + 1,053 filled (as of 2026). Largest general-purpose permissive set with paired outline/filled.
- **Style:** strict 24×24 grid, 2px stroke, outline + filled where available.
- **Delivery:** `@tabler/icons` (SVG), `@tabler/icons-react`, `@tabler/icons-vue`, `@tabler/icons-webfont`. Iconify `tabler`.
- **Notes:** biggest "safe" permissive UI-icon catalog; paired outline/filled makes it ideal for toggle states.

### Phosphor — `phosphor-icons/core` (+ `/web`, `/react`)
- **License:** MIT across the family.
- **Style axes:** six **weights** of *every* icon — Thin, Light, Regular, Bold, Fill, Duotone. Duotone ships as two-path SVG with configurable secondary color.
- **Count:** 1,248 icons × 6 weights = ~7,500 SVGs.
- **Delivery:** `@phosphor-icons/react`, `@phosphor-icons/web`, `@phosphor-icons/core` (raw SVGs). Iconify prefix `ph`.
- **Notes:** the duotone weight is uniquely useful for app-icon composition (two-color fills, per-path gradient remapping).

### Feather — `feathericons/feather`
- **License:** MIT.
- **Count:** ~287 icons.
- **Status:** original project is low-activity; Lucide is the community-maintained fork. Prefer **Lucide** for new work but Feather is still a fine reference.

### Remix Icon — `Remix-Design/remixicon` ⚠ license change
- **License:** The npm package metadata says Apache-2.0, but the upstream repo **changed to a custom "Remix Icon License v1.0" in January 2026**. The new license still permits commercial use, modification, and bundling inside a larger product, but **forbids**: selling icons as a standalone product, repackaging into a competing icon library, and using Remix icons as logos / brand identities.
- **Count/Style:** 3,200+ icons, paired outline (`-line`) + filled (`-fill`), 24×24.
- **Action item:** before bundling into `prompt-to-asset`, pin to the last Apache-2.0 release if you want Apache-only dependencies, or review the v1.0 terms against your distribution model (bundling into a larger product is OK per the new license).
- **Delivery:** `remixicon` npm, Iconify `ri`. Raw SVGs in `icons/` grouped by category.

### Bootstrap Icons — `twbs/icons`
- **License:** MIT.
- **Count:** 2,000+ icons.
- **Style:** 16×16 base, mostly filled with many outline variants; visual style is heavier than Lucide/Tabler.
- **Delivery:** `bootstrap-icons` npm (SVG + web font), Iconify `bi`.

### Ionicons — `ionic-team/ionicons`
- **License:** MIT.
- **Count:** ~1,300 base icons × 3 variants (outline / filled / sharp).
- **Delivery:** `ionicons` npm ships web components + raw SVG under `src/svg/`. Iconify `ion`.
- **Notes:** three-variant design mirrors iOS/Android idioms — useful for mobile-ish demos.

### Material Symbols — `google/material-design-icons`
- **License:** Apache-2.0 (icons). When delivered as a font, OFL applies to the font packaging.
- **Count/Style:** 2,500+ glyphs in three families: Outlined, Rounded, Sharp. Modern **Material Symbols** version is a variable font with four axes — **FILL** (0–1), **wght** (100–700), **GRAD** (-50–200), **opsz** (20–48) — yielding effectively infinite stylistic variants from a single font file.
- **Delivery:** Google Fonts CSS, `material-symbols` npm (variable font), `@material-symbols/svg-100`, `@material-symbols/svg-400`, `@material-symbols/svg-700` (raw SVGs per weight). Iconify `material-symbols`.
- **Notes:** the variable font is a different kind of asset — don't treat it as SVG-only. For programmatic composition, use the `@material-symbols/svg-*` packages; for dynamic, axis-driven rendering in the UI, use the variable font.

### Fluent UI System Icons — `microsoft/fluentui-system-icons`
- **License:** MIT.
- **Count:** tens of thousands of SVGs once you multiply designs × sizes (16, 20, 24, 28, 32, 48) × themes (Regular, Filled). Microsoft publishes `icons_regular.md` and `icons_filled.md` manifest files.
- **Delivery:** `@fluentui/svg-icons` for raw SVG, `@fluentui/react-icons` for React (v2), plus iOS/Android/Flutter packages. Iconify `fluent`.
- **Notes:** Microsoft redraws per size — the 16-px version is *not* the 24-px version scaled down, it's hand-optimized. Best choice if you need pixel-authentic small icons in a dense UI.

### Octicons — `primer/octicons`
- **License:** MIT (GitHub / Primer).
- **Style:** single "Octicons" visual language; icons are provided at multiple sizes (12, 16, 24).
- **Delivery:** `@primer/octicons` (raw SVG + web font), `@primer/octicons-react`. Iconify `octicon`.
- **Notes:** smaller set, very developer-tool-coded (commit, branch, PR, repo, etc.). Perfect for "developer tool" demo content in a prompt-to-asset.

### Simple Icons — `simple-icons/simple-icons`
- **License:** CC0-1.0 for the repo contents (path data is public domain).
- **Count:** 3,400+ brand SVGs.
- **Delivery:** `simple-icons` npm (includes `_data/simple-icons.json` with brand hex color, aliases, source URL), CDN via jsDelivr / unpkg, Iconify `simple-icons`. Icons are single-path, single-color — designed to be recolored.
- **Trademark caveat (important):** CC0 releases the *code / path data*, not the trademark. You can render and redistribute the SVGs, but you cannot use a third party's logo to identify your own product, claim endorsement, or imply affiliation. Their upstream DISCLAIMER.md is explicit. For `prompt-to-asset`, Simple Icons is ideal for **reference / demo / autocomplete** of brand marks, not for presenting a brand as your own.

### Carbon Icons — `carbon-design-system/carbon` (+ IBM pictograms)
- **License:** Apache-2.0 (IBM).
- **Count:** ~2,000 designs redrawn per size (16/20/24/32) → many thousands of files. Separate **Carbon Pictograms** set (~700 richer illustrative marks, Apache-2.0) is worth knowing about for header/hero imagery.
- **Delivery:** `@carbon/icons`, `@carbon/icons-react`, `@carbon/icons-vue`, `@carbon/icons-angular`, `@carbon/pictograms`. Iconify `carbon`.
- **Notes:** highly enterprise-friendly look; strong outline icons optimized at each size.

### Radix Icons — `radix-ui/icons`
- **License:** MIT (WorkOS).
- **Count:** ~300.
- **Style:** crisp 15×15 grid, single stroke style. Deliberately minimal.
- **Delivery:** `@radix-ui/react-icons`; raw SVGs at `packages/radix-icons/icons/`. Iconify `radix-icons`.

### Akar Icons — `artcoholic/akar-icons`
- **License:** MIT.
- **Count:** ~500, outline only, 24×24.
- **Delivery:** `akar-icons` (React) + raw SVGs. Iconify `akar-icons`.

### MingCute — `Richard9394/MingCute`
- **License:** Apache-2.0.
- **Count:** 3,000+, paired Line + Fill, 24×24. Visually softer / rounder than Tabler.
- **Delivery:** SVG source repo; Iconify `mingcute`.

### Pixelarticons — `halfmage/pixelarticons`
- **License:** MIT (free 800-icon tier). Paid tier expands to 2,000+ but stays under MIT per the repo.
- **Style:** strict 24×24 pixel grid — *aliasing is the aesthetic*. Render at 24/48/72/96 etc. for crisp pixels.
- **Delivery:** `pixelarticons` npm, Iconify `pixelarticons`.
- **Notes:** the only truly retro/pixel-art set in this list; useful for "playful" logo demos.

### Game Icons — `game-icons/icons` (`game-icons.net`)
- **License:** **CC-BY-3.0** (default) with some contributors' work released CC0 (e.g., Viscious Speed, Zeromancer). Requires attribution ("Icons made by {author}") when using CC-BY-licensed icons.
- **Count:** ~4,000+ icons across fantasy/RPG/game themes — swords, potions, creatures, weapons, symbols, etc.
- **Delivery:** direct SVG repo, Iconify `game-icons`.
- **Notes:** unmatched for "rich symbolic imagery" generation cases — useful as raw material for composite logos and game-adjacent demo content. Attribution requirement is real — track per-icon author metadata if bundling.

---

## Aggregated delivery: Iconify

**`iconify/iconify`** is the de-facto aggregator. It ships **200+ icon sets, ~275,000 icons** behind a unified API (`api.iconify.design`) and per-set JSON data packages (`@iconify-json/lucide`, `@iconify-json/tabler`, `@iconify-json/ph`, `@iconify-json/simple-icons`, `@iconify-json/material-symbols`, `@iconify-json/carbon`, etc.). For a project like `prompt-to-asset`:

- **Do not** bundle every icon set individually. Depend on `@iconify-json/<set>` data packages and load icons on demand.
- `@iconify/utils` (Node) exposes raw SVG path data, making programmatic composition (recolor, resize, mask, combine into logos) straightforward.
- The Iconify API also offers on-the-fly SVG fetches, which is handy for demo/preview flows where caching a small set per session is enough.
- License metadata is embedded in each `@iconify-json/*` package (`info.license.title`, `info.license.spdx`, `info.license.url`) — trivial to surface in a UI.

---

## Recommendations for `prompt-to-asset`

1. **Default UI icon set:** **Lucide** (ISC). Stroke-consistent, widely recognized, easy to restyle programmatically.
2. **Paired outline/filled states:** **Tabler Icons** (MIT) when you need the largest permissive catalog with a matched filled variant, or **Heroicons** (MIT) when you want Tailwind-native pairing.
3. **Expressive weights (app-icon composition):** **Phosphor** (MIT) — especially the Duotone weight for two-color logo marks.
4. **Variable, axis-controlled rendering:** **Material Symbols** (Apache-2.0) via the variable font — single file, four axes, three families.
5. **Brand reference / autocomplete (not own-brand use):** **Simple Icons** (CC0 for path data). Respect trademarks — use to *reference* brands, not *as* your brand.
6. **Game / symbolic / richer motifs:** **Game Icons** (CC-BY-3.0) — best open-source corpus of symbolic imagery; track attribution.
7. **Pixel-art demo content:** **Pixelarticons** (MIT).
8. **Largest aggregator / fallback delivery:** **Iconify** (`@iconify-json/*` per-set data packages) — one API, every set above, license metadata included.

### CC0-only recommendation

If the requirement is strictly **CC0 / public-domain path data** (no attribution, no license notice, no trademark entanglement risk for the *code* you ship):

- **Simple Icons** is the only major set in this list whose repository is released under **CC0-1.0**. Use it for brand marks, **with the trademark caveat above** — CC0 covers the SVG; it does not grant you rights to anyone else's brand.

Everything else on this list is MIT / Apache-2.0 / ISC / OFL / CC-BY, which is permissive but **not** public-domain. Those all require either a LICENSE inclusion (MIT/Apache/ISC), font-redistribution rules (OFL), or attribution (CC-BY). If you want "zero ceremony" icons, **CC0 selections within Game Icons** (individual contributors marked CC0 in `license.txt`) are the other CC0 pool available.

---

## Sources

- `lucide-icons/lucide` — https://github.com/lucide-icons/lucide
- `tailwindlabs/heroicons` — https://github.com/tailwindlabs/heroicons
- `tabler/tabler-icons` — https://github.com/tabler/tabler-icons
- `phosphor-icons/core` (+ `/web`, `/react`) — https://github.com/phosphor-icons/core
- `feathericons/feather` — https://github.com/feathericons/feather
- `Remix-Design/RemixIcon` license-change issue — https://github.com/Remix-Design/RemixIcon/issues/1069
- `twbs/icons` — https://github.com/twbs/icons
- `ionic-team/ionicons` — https://github.com/ionic-team/ionicons
- Material Symbols guide — https://developers.google.com/fonts/docs/material_symbols
- `microsoft/fluentui-system-icons` — https://github.com/microsoft/fluentui-system-icons
- `primer/octicons` — https://github.com/primer/octicons
- `simple-icons/simple-icons` + DISCLAIMER — https://github.com/simple-icons/simple-icons/blob/master/DISCLAIMER.md
- `carbon-design-system/carbon` icons — https://github.com/carbon-design-system/carbon (+ `@carbon/pictograms`)
- `radix-ui/icons` — https://github.com/radix-ui/icons
- `artcoholic/akar-icons` — https://github.com/artcoholic/akar-icons
- `Richard9394/MingCute` — https://github.com/Richard9394/MingCute
- `halfmage/pixelarticons` — https://github.com/halfmage/pixelarticons
- `game-icons/icons` license — https://github.com/game-icons/icons/blob/master/license.txt
- `iconify/iconify` — https://github.com/iconify/iconify and https://iconify.design/docs/api/
