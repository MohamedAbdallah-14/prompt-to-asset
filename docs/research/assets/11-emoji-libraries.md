# Open-Source Emoji Libraries for `prompt-to-asset`

Scope: sticker/emoji-style asset generation, fallback marks, decorative elements, OG image composition, and app-icon building blocks. Ratings reflect state as of early 2026.

---

## TL;DR recommendation for `prompt-to-asset`

- **Primary raster/vector pack: Microsoft Fluent Emoji (MIT).** Cleanest license, four distinct visual registers (Flat / Color / High-Contrast / 3D), and the only mainstream pack that ships a ready-made 3D set — useful for sticker-style assets and OG hero imagery.
- **Secondary / CDN-friendly: jdecked Twemoji (code MIT, art CC-BY 4.0).** Best-supported option in Satori / `@vercel/og` and the de facto OG-image emoji source. Use for fallback marks and inline decorative glyphs.
- **For greyscale UI and dense text layouts: Noto Emoji SVG (Apache-2.0).** Permissive license on the SVGs, predictable codepoint-based filenames, and a real B/W variable font.
- **Avoid in the product surface: JoyPixels (free tier is personal-use only), Mutant Standard (CC BY-NC-SA — non-commercial).**
- **Data layer: `unicode-emoji-json` (muan) as the lookup table; `emoji-datasource` only if you need sprite sheets or legacy vendor mappings.**

---

## 1. Library matrix

| Library | Repo | Code license | Art license | Variants | Formats | Unicode coverage | Notes |
|---|---|---|---|---|---|---|---|
| **Twemoji (jdecked fork)** | `jdecked/twemoji` | MIT | **CC-BY 4.0** | single flat-color style | **SVG + 72px PNG** | Unicode 17.0 / Emoji 17.0 (v17.0.2, Nov 2025) | Actively maintained fork after Twitter abandoned the original. Ships `@twemoji/api` (185 KB unpacked) with a `parse()` helper. |
| **OpenMoji** | `hfg-gmuend/openmoji` | MIT (build tools) | **CC BY-SA 4.0** | Color + Black (outline) | **SVG + PNG** (multiple sizes), font | Emoji 16.0 (OpenMoji 16.0.0); 4,292 emoji + 270 flags | ShareAlike is a real constraint: derivative assets must be relicensed CC BY-SA. Two visual registers (color + B/W outline) make it the best free pick if you want matched light/dark marks. |
| **Noto Emoji** | `googlefonts/noto-emoji` | Apache-2.0 (tools); **Apache-2.0 on SVGs**; OFL-1.1 on fonts | same | Color flat; monochrome variable font | **SVG + color font (CBDT/CBLC) + B/W variable font** | ~2,700 SVGs. Filename pattern `emoji_u<hex>[_<hex>…].svg` makes programmatic lookup trivial. |
| **Fluent Emoji (Microsoft)** | `microsoft/fluentui-emoji` | **MIT** | MIT | **Color, Flat, High-Contrast, 3D** | SVG (Color/Flat/HC), **PNG for 3D** | Broad RGI coverage; last refreshed Jan 2025 | 3D is rendered PNG, not source 3D. Webfont repackagings exist (`tetunori/fluent-emoji-webfont`). Cleanest license of any major set for a commercial product. |
| **JoyPixels** | `joypixels/emoji-toolkit` | — | **Proprietary** | single style | PNG (free tier capped at 64 px, 25 dl/mo) | Good | **SKIP for product.** Free license is explicitly personal-use only; commercial tiers start at $20/mo. Mention only as a comparison point. |
| **Mutant Standard** | `mutantstandard/*` | — | **CC BY-NC-SA 4.0** | stylised/inclusive set | SVG + PNG + fonts | Partial (custom set, not RGI-complete) | Non-commercial — **do not ship in a paid/SaaS product**. Usable for personal demos or OSS docs with attribution. |

### Data-only packages

| Package | License | Shape | Weekly dl | Use for |
|---|---|---|---|---|
| `unicode-emoji-json` (muan) | MIT | RGI-only JSON keyed by emoji, plus `data-by-group.json`, `data-ordered-emoji.json`, skin-tone flag | ~53 k | Source-of-truth lookup table. Zero deps, ~815 KB unpacked. |
| `emoji-datasource` (iamcal) | MIT | Single `emoji.json` (~10 GB full repo incl. sprites) with unified codepoints, shortnames, skin variations, legacy vendor mappings (docomo/au/softbank) | very high | Sprite-based rendering and legacy shortname compatibility (`:smile:`) — heavier than you probably need. |

---

## 2. Integration patterns

### 2.1 Emoji → SVG path lookup

The universal recipe for OG composition is: take the rendered character, strip variation selectors, convert surviving codepoints to lowercase hex separated by `-` (Twemoji/OpenMoji) or `_` (Noto), then request `{base}/{code}.svg`.

```ts
// Satori / vercel-og compatible code-code extraction (Twemoji style)
const U200D = "\u200D";           // zero-width joiner
const VS16  = /\uFE0F/g;          // variation selector-16

function emojiToCode(char: string): string {
  const stripped = char.indexOf(U200D) < 0 ? char.replace(VS16, "") : char;
  return [...stripped].map(c => c.codePointAt(0)!.toString(16)).join("-");
}
```

CDN URL shapes actually used by Satori / `@vercel/og`:

- **Twemoji:** `https://cdnjs.cloudflare.com/ajax/libs/twemoji/<ver>/svg/<code>.svg` (dash-separated)
- **OpenMoji:** `https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@3.2.0/svg/<UPPER>.svg`
- **Noto:** filename is `emoji_u<hex>[_<hex>…].svg` (underscore-prefixed, in `svg/` of `googlefonts/noto-emoji`)
- **Fluent:** per-emoji folder tree — `assets/<Name>/<Variant>/<slug>_<variant>.svg` (not codepoint-indexed; needs an index build step)

### 2.2 Satori / `@vercel/og` emoji selection

`@vercel/og` exposes an `emoji` option with the built-in set `'twemoji' | 'blobmoji' | 'noto' | 'openmoji'` (Twemoji default). For anything custom — Fluent 3D, local SVGs, self-hosted CDN — use Satori's `loadAdditionalAsset(code, segment)` callback: fetch the SVG, return a `data:image/svg+xml;base64,…` URL. The official Twemoji CDN was retired in 2024; pin to jsDelivr or cdnjs, or self-host.

### 2.3 Pre-bundled sprite packages

`@svgmoji/twemoji`, `@svgmoji/openmoji`, `@svgmoji/noto` (v3.2.0, MIT) wrap each set as SVG sprites with individual files (2–3 KB), subgroup bundles (9–31 KB), group bundles (182–417 KB), and full sprites (6.6–23.6 MB). Not updated since 2021 — use for Unicode ≤ 13 use cases or vendor them and bump.

### 2.4 Composition pipelines for OG / app icons

- **OG images:** Satori + Twemoji (or Fluent Flat for brand differentiation) — render SVG into JSX, rasterize with `@vercel/og` / `resvg-js`.
- **App icon / sticker generation:** Fluent 3D PNG at 512/1024 px as a base layer, composite with `sharp` or `@napi-rs/canvas`, then re-export to iOS/Android/Favicon sizes. (3D assets are rendered PNG — no upscaling headroom past source size.)
- **Fallback marks inside the app UI:** Twemoji SVG via `@twemoji/api` `parse()` (DOM mode, not string mode — string mode sets `innerHTML` and is an XSS footgun).

---

## 3. License guidance for a commercial product

Working assumption: `prompt-to-asset` is a commercial / SaaS-leaning project.

- **Safe to ship in product bundles (no attribution UI required by code license, but art licenses may):**
  - Fluent Emoji — MIT, no attribution obligation.
  - Noto Emoji SVG — Apache-2.0, attribution satisfied via NOTICE.
- **Safe but with attribution:**
  - Twemoji art — CC-BY 4.0. Include credit in app About / docs.
- **Safe but viral (ShareAlike):**
  - OpenMoji — CC BY-SA 4.0. Any *modified* emoji must be relicensed CC BY-SA. Unmodified use is fine with attribution; modifying + shipping inside proprietary assets is the trap.
- **Do not ship:**
  - JoyPixels free tier (non-commercial).
  - Mutant Standard (non-commercial).

Practical rule: default to Fluent + Noto for anything that gets re-exported as a brand asset; use Twemoji through CDN for runtime OG images where attribution is trivial.

---

## 4. Sources

- [jdecked/twemoji](https://github.com/jdecked/twemoji) — active Twemoji fork, v17.0.2, code MIT + art CC-BY 4.0.
- [@twemoji/api on npm](https://www.npmjs.com/package/@twemoji/api) — package metadata (size, parse API).
- [hfg-gmuend/openmoji](https://github.com/hfg-gmuend/openmoji) and [openmoji.org/faq](https://openmoji.org/faq/) — CC BY-SA 4.0, 4,292 emoji + 270 flags, SVG/PNG/font distribution.
- [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) and [svg/LICENSE](https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE) — Apache-2.0 on SVGs; filename convention `emoji_u<hex>.svg`.
- [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji) — MIT license; Color / Flat / High-Contrast / 3D variant directories; 3D delivered as PNG.
- [joypixels.com licenses](https://www.joypixels.com/licenses/terms) — free tier is personal-use only.
- [mutant.tech](https://mutant.tech/) — CC BY-NC-SA 4.0.
- [iamcal/emoji-data](https://github.com/iamcal/emoji-data) and [muan/unicode-emoji-json](https://github.com/muan/unicode-emoji-json) — data-package shapes and coverage.
- [svgmoji/svgmoji](https://github.com/svgmoji/svgmoji) — SVG sprite packages for Twemoji / OpenMoji / Noto / Blobmoji.
- [vercel/satori issue #368](https://github.com/vercel/satori/issues/368) and [@vercel/og reference](https://examples.vercel.com/docs/og-image-generation/og-image-api) — `emoji` option and `loadAdditionalAsset` callback for OG composition.
