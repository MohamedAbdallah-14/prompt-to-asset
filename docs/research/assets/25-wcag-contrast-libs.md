# WCAG Contrast & A11y Validation Libraries for `asset_validate`

Scope: pick a Node-friendly contrast implementation we can run on raw RGBA bitmaps (favicon 16×16, OG-image 1200×630) without a headless browser, plus a sampling strategy for "effective FG vs BG" when no DOM exists.

---

## 1. The specs we're measuring against

### WCAG 2.1 (SC 1.4.3, 1.4.6, 1.4.11)

- **Formula:** `CR = (L1 + 0.05) / (L2 + 0.05)`, where `L` is the relative luminance of an sRGB color: linearize each channel with `c ≤ 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`, then `L = 0.2126·R + 0.7152·G + 0.0722·B`. Output range `1:1 … 21:1`.
- **Thresholds:**
  - **1.4.3 Contrast (Minimum, AA)** — 4.5:1 normal text, 3:1 large text (≥18pt or ≥14pt bold ≈ 24px / 18.66px).
  - **1.4.6 Contrast (Enhanced, AAA)** — 7:1 normal, 4.5:1 large.
  - **1.4.11 Non-text Contrast (AA)** — 3:1 for UI components and "graphical objects required to understand content" against adjacent colors. Ratios must not be rounded (2.999:1 fails 3:1).
- **Favicons specifically:** there is no WCAG SC that mandates 4.5:1 on a favicon — it is visual identity, not text, and the browser chrome (not our asset) is the "UI component". The best we can *normatively* ground on is 1.4.11's 3:1 against adjacent browser chrome for the "understand the brand" use case. For recognizability at 16×16 we want to budget higher internally (see §5).

### APCA (candidate for WCAG 3)

- **Algorithm:** `APCA 0.0.98G-4g-base-W3`. Perceptually weighted luminance (`sRGBtoY`) with contrast-polarity awareness and soft-clipping near black/white. Output is a signed **Lc** value (~`-108 … +106`); positive = dark-on-light, negative = light-on-dark. Not a ratio — thresholds are ~`Lc 75` minimum for body text, `Lc 90` preferred, `Lc 60` for "large / non-body", `Lc 45` for "spot" text and for non-text (rough WCAG 3.0 draft mapping).
- **Status:** still a candidate; WCAG 3 is not a recommendation. Tools must not claim "WCAG 3 compliant". Good to *report* alongside WCAG 2 but don't gate on it alone.

---

## 2. Library comparison

All can run in plain Node with no browser, unless noted. All take colors, not pixels — bitmap sampling is our job (see §4).

| Library | License | Formula | API surface | Fits `asset_validate`? |
|---|---|---|---|---|
| **`wcag-contrast`** (tmcw) | BSD-2-Clause | WCAG 2.x ratio only | `luminance(rgb)`, `rgb([r,g,b], [r,g,b])`, `hex('#fff','#000')`, `score(ratio)` → `'AAA'\|'AA'\|'AA Large'\|'Fail'` | Yes. Tiny (1 dep `relative-luminance`, ~24 KB), numeric-first, trivial to feed sampled RGB tuples. Unmaintained-looking (last publish 2019) but formula is frozen. |
| **`color-contrast-checker`** | Apache-2.0 | WCAG 2.0/2.1 ratio | Class with `isLevelAA(fg,bg,fontSize)`, `isLevelAAA`, `isLevelCustom`, `checkPairs` | Yes but heavier ergonomics; nice if we want built-in AA/AAA booleans with font size. No deps. |
| **`@adobe/leonardo-contrast-colors`** | Apache-2.0 | WCAG 2 **and** APCA (switchable) | `contrast([fr,fg,fb],[br,bg,bb], baseV?, method='wcag2'\|'wcag3')`, plus `Theme`/`Color`/`BackgroundColor` color-scale generators | Yes. Only lib in this list that gives **both** WCAG 2 and APCA behind one `contrast()` call. Pulls in `chroma-js` + d3 color deps (~MBs) — heavy for a CLI. |
| **`apca-w3`** (+ `colorparsley`) | Limited W3 License (web-content only; no medical/military/aerospace; commercial users must give Myndex audit access) | APCA reference implementation | `APCAcontrast(txtY, bgY)`, `sRGBtoY([r,g,b])`, `alphaBlend`, `calcAPCA`, `fontLookupAPCA`, `reverseAPCA` | Yes for code, but **license is non-standard** — not OSI-approved, restricts fields of use, and requires audit access from commercial users. Worth flagging before we depend on it directly. |
| **`colorjs.io`** | MIT | WCAG21, APCA, Weber, Michelson, Lstar, DeltaPhi | `color1.contrast(color2, 'WCAG21'\|'APCA'\|…)` or `contrastWCAG21` / `contrastAPCA` | Yes. MIT APCA re-implementation avoids the `apca-w3` license snag. Larger surface than we need. |
| **`culori`** | MIT | WCAG 2.1 ratio natively; APCA explicitly **not bundled** | `wcagContrast(a,b)`, `wcagLuminance(c)` | Yes for WCAG 2. For APCA, maintainer directs users to `apca-w3` (so it's not a one-stop option, but `wcagLuminance` + `APCAcontrast` combo is documented). |
| **`axe-core`** | MPL-2.0 | WCAG 2 ratio via DOM + occasional `getImageData` | `axe.run(context)` against a real DOM | **No for raw bitmaps.** Axe's `color-contrast` rule walks CSS-resolved DOM; when a background-image overlaps, it returns "needs review" (incomplete), not a result. Filters and canvas quirks cause known false positives/negatives. Requires jsdom/Playwright. |
| **Pa11y / Pa11y-CI** | LGPL-3.0 (Pa11y) | Wraps axe-core and HTML_CodeSniffer | URL / sitemap runner, headless Chromium | **No for raw bitmaps.** Pa11y inputs are URLs (or paths rendered as URLs). To use it on a PNG we'd have to wrap the asset in an HTML page — indirection with no added signal over calling a contrast function directly. |
| **Lighthouse / Lighthouse CI** | Apache-2.0 | Delegates to axe-core for a11y category | `lhci`, `lighthouse` CLI against a URL | **No for raw bitmaps.** Same shape as Pa11y: page-level, not pixel-level. |
| **`@axe-core/playwright`** | MPL-2.0 | axe-core | `new AxeBuilder({ page }).analyze()` | Only useful if we render the asset inside a real `<img>` on a real page with known surrounding CSS. Overkill for static asset validation; useful if we also want to verify the *site using* the favicon/OG image. |

---

## 3. Do any of these read pixels?

No. Every library in §2 is **color-in / score-out** — they assume you already have an FG and a BG color. Axe-core is the only one that tries to resolve colors from rendered pixels, and only via the CSS stack of a DOM element (plus a narrow canvas fallback that's flaky).

For `asset_validate`, we own the pixel→color step. `sharp` is the right Node tool:

- `sharp(buf).raw().toBuffer({ resolveWithObject: true })` → `Uint8Array` of RGBA + `{ width, height, channels }`.
- `sharp(buf).extract({...}).stats()` → `{ channels: [{mean,...}x4], dominant: {r,g,b} }` on any sub-rectangle. `dominant` is a 5×5×5-bin histogram peak, which is the cheap "majority color" we want.

---

## 4. Sampling: "effective FG vs BG" from a bitmap

Two cases, different strategies:

### 4a. Favicon (16×16 or 32×32)

1. **Background color** = `sharp.stats().dominant` computed on a 1-pixel-wide border strip (top row + bottom row + left col + right col, via four `extract` calls composited, or by reading the raw buffer and feeding edge pixels only). At 16×16, the outermost ring has 60 pixels — plenty of signal.
   - If the favicon is transparent at those edges (alpha < ~32), fall back to testing against **two reference backgrounds** `#ffffff` and `#0b0f14` (light + dark browser chrome) and require both to pass — this is what FaviconMaker and similar tools do.
2. **Foreground color** = `sharp.stats().dominant` on the **interior** with transparent/edge-matching pixels masked out. Practically: build a boolean mask where a pixel is "FG" iff its alpha ≥ 128 AND its ΔE (or simple max-channel distance) from the BG color is above a threshold (e.g. 24/255). Then take `dominant` over that masked subset by first compositing the mask to green pixels and extracting — or just compute it manually from the raw buffer with a bin histogram (faster).
3. **Score** = WCAG 2 ratio(`fg`, `bg`) via `culori.wcagContrast` or `@adobe/leonardo-contrast-colors.contrast`. Gate: we recommend a project rule of **≥3:1 against the sampled BG** and **≥3:1 against both `#fff` and `#0b0f14` when the favicon has a transparent background**. Optionally report APCA `Lc` alongside for the logbook.

### 4b. OG image (1200×630) with text overlay

We can't ask "is the whole image high-contrast" — text occupies a region. Two workable approaches:

1. **If the generator knows the text bbox** (we control the compositor), sample that rect only:
   - FG = dominant color of pixels matching the text mask (alpha from the text layer, pre-composite).
   - BG = `sharp.extract(bbox).stats().dominant` on the *underlying* image before the text layer was added, or on a dilated ring around the text.
   - Fail the asset if `wcagContrast(fg, bg) < 4.5` for body-sized text (≥24px effective) or `< 3` for headline-sized (≥48px, loosely "large").
2. **If we only have the final composited PNG** (e.g. third-party OG generator), fall back to the `overlaycontrast.com` approach: tile the image into N×N blocks (e.g. 24×12 ≈ 50px tiles), compute the per-tile dominant color, and for each tile under the known text region require `contrast(textColor, tileColor) ≥ 4.5`. This flags "text over a busy photo" failures that a single-sample average would miss.

---

## 5. Recommendation

- **Primary:** `culori`'s `wcagContrast(fg, bg)` for the gate — MIT, tiny, well-maintained, pairs naturally with `sharp` RGB tuples.
- **Report-only secondary:** `colorjs.io`'s `contrastAPCA` (MIT, no license strings). Log `Lc` alongside WCAG 2 ratio so we can migrate gates when WCAG 3 lands, without inheriting `apca-w3`'s restricted license.
- **Skip for this use case:** axe-core, Pa11y, Lighthouse, `@axe-core/playwright` — they need a real DOM and don't add signal over a direct contrast call on sampled colors. Keep them earmarked for the separate job of auditing *the site that embeds* our assets.
- **Favicon gate (16×16/32×32):** sample `dominant` on a 1-px edge ring for BG (or dual-check against `#ffffff` and `#0b0f14` when edge alpha is low) and `dominant` on the high-alpha interior for FG; require WCAG 2 contrast `≥ 3:1` (non-text, SC 1.4.11), internally budget `≥ 4.5:1` for recognizability. Warn on `2.999…`-style near-misses because WCAG explicitly forbids rounding.
- **OG text gate:** when we own the compositor, check `fg_text` against `extract(text_bbox).stats().dominant` on the pre-text layer; when we don't, tile the text region and require every tile to clear the threshold. Threshold: `≥4.5:1` for sub-24px text, `≥3:1` for large display text; mirror with APCA `|Lc| ≥ 75` for body / `≥ 60` for large as advisory.

---

## Sources

- [W3C — Understanding SC 1.4.3 Contrast (Minimum)](https://w3c.github.io/wcag21/understanding/contrast-minimum.html)
- [W3C — Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/understanding/non-text-contrast.html)
- [Myndex/SAPC-APCA (algorithm)](https://github.com/Myndex/SAPC-APCA)
- [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [`wcag-contrast` on npm](https://www.npmjs.com/package/wcag-contrast)
- [`color-contrast-checker` on npm](https://www.npmjs.com/package/color-contrast-checker)
- [`@adobe/leonardo-contrast-colors` on npm](https://www.npmjs.com/package/@adobe/leonardo-contrast-colors) / [README](https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md)
- [`apca-w3` on npm](https://www.npmjs.com/package/apca-w3) / [license](https://github.com/Myndex/apca-w3/blob/master/LICENSE.md)
- [Color.js contrast docs](https://colorjs.io/docs/contrast/)
- [culori API reference](https://culorijs.org/api/) / [APCA discussion](https://github.com/Evercoder/culori/issues/177)
- [axe-core image/contrast limitations — issues #3390, #3918, #3214](https://github.com/dequelabs/axe-core/issues/3390)
- [Pa11y-CI README (URL-based)](https://github.com/pa11y/pa11y-ci)
- [sharp — edge color sampling (issue #2708)](https://github.com/lovell/sharp/issues/2708), [dominant region (issue #3630)](https://github.com/lovell/sharp/issues/3630)
- [Favicon accessibility / WCAG guide](https://favicon.im/blog/favicon-accessibility-wcag-compliance-guide), [transparent vs solid favicon](https://faviconmaker.net/blog/transparent-vs-solid-background-favicon)
- [overlaycontrast.com — tile-based image+text contrast check](https://overlaycontrast.com/)
