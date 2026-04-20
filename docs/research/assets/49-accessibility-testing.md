# 49 — Accessibility & Visual-Quality Testing Tools for `asset_validate`

Scope: rendering-based programmatic checks for brand-asset bundles — favicons, app icons
(maskable + any), Apple touch icons, PWA manifests, OG images, illustrations. WCAG color
contrast on *source swatches* is handled elsewhere; this document focuses on checks that
require actually rasterizing / rendering the asset and inspecting pixels or DOM context.

**Research value: high** — the ecosystem is mature. axe-core, Lighthouse, Pa11y, Playwright,
pixelmatch, sharp, and `@capsizecss/metrics` compose into a nearly turnkey pipeline for the
validate step. The only novel piece `asset_validate` needs to build itself is the
small-size-recognizability comparison; everything else is library glue.

---

## 1. Tool landscape

### 1.1 axe-core (Deque)

- `@axe-core/cli` 4.11.x — headless Chrome wrapper, runs axe rulepack against URLs.
  Supports `--rules`, `--tags wcag2a,wcag2aa`, `--disable`, `--include/--exclude`,
  `--save results.json`, `--stdout`. Works only against *live pages*; for a validate step
  we would need to stand up a temp static server (or use `file://` URLs for Chromium).
- `@axe-core/playwright` 4.11.x — `new AxeBuilder({ page }).analyze()` returns a
  `{ violations, passes, incomplete, inapplicable }` report. Cleanest integration when
  `asset_validate` already has a Playwright dependency for screenshots.
- Scope: DOM-level a11y rules — landmarks, ARIA, alt text, name/role/value, color
  contrast on rendered text. It does **not** understand PWA manifests, maskable icons,
  or OG images. We use it for the HTML test harness that embeds the favicon/og-image.

### 1.2 Pa11y

- Puppeteer-based; defaults to HTMLCS, can run axe as an additional runner
  (`--runner axe --runner htmlcs`). Combined coverage ≈ 35% of WCAG issues.
- Use-case for `asset_validate`: belt-and-suspenders second opinion on any HTML
  harness page. Lower-priority than axe — axe alone is usually sufficient.

### 1.3 Lighthouse / Lighthouse CI

- The audits that matter for a brand-asset bundle (PWA/SEO/Best-Practices
  categories, even after the PWA category was deprecated in Lighthouse 12 the
  individual audits still ship):
  - `installable-manifest` — manifest parses, has required fields, icons reachable
  - `maskable-icon` — manifest contains at least one icon with `purpose` containing
    `"maskable"` *(does not inspect pixels — Lighthouse explicitly notes this)*
  - `apple-touch-icon` — `<link rel="apple-touch-icon">` present, reachable, opaque
  - `themed-omnibox` / `meta-theme-color` — `theme_color` in manifest + `<meta name="theme-color">`
  - `splash-screen` — `background_color` and an icon ≥ 512×512
  - `content-width` / viewport — not asset-specific but cheap to include
  - `image-aspect-ratio`, `image-size-responsive` — generic, useful on og:image
  - `meta-description` and OG/Twitter tags in Best-Practices
- CLI: `lighthouse <url> --only-audits=installable-manifest,maskable-icon,apple-touch-icon,...
  --output=json`. Lighthouse CI (`@lhci/cli`) adds assertion-style config.

### 1.4 Playwright accessibility snapshots

- `page.accessibility.snapshot()` returns the platform a11y tree. Useful to confirm
  that, e.g., an `<img>` OG preview exposes the right `role="img"` + accessible name.
  Cheaper and more stable than axe for single-node checks.

### 1.5 `@capsizecss/metrics`

- Zero-dependency font metrics (cap-height, x-height, ascent, descent, `xWidthAvg`)
  for all common system + Google fonts. Use-case in `asset_validate`:
  - Deterministic text layout in OG templates (Satori/resvg) — predict the actual
    rendered glyph box from `fontSize * capHeight / unitsPerEm` and assert the title
    fits in the safe area before shipping.
  - Estimate small-size favicon glyph legibility: compute expected stem width in
    pixels at 16 px; reject fonts whose stem is < 1 px.

### 1.6 Rendering + pixel comparison

- **`sharp`** — rasterize SVG to PNG at any size. Use `{ density: 72 * target / viewBox }`
  (or just rely on auto-density in sharp ≥ 0.30). Also gives us per-pixel alpha sampling,
  channel histograms, and trimming.
- **`pixelmatch`** — 150-LoC perceptual (YIQ) pixel-diff. Returns number-of-different
  pixels; `threshold` 0.1 default. This is the core of the 16×16-vs-512 recognizability
  check.
- **`jest-image-snapshot`** (built on pixelmatch, optional SSIM mode) — can replace
  pixelmatch if we want SSIM / baseline-snapshot semantics.
- **`ssim.js`** — standalone structural-similarity index; better than raw pixel diff
  for "is the shape still recognizable" questions because it tolerates anti-aliasing
  differences.

### 1.7 Favicon / PWA specific

- **`@realfavicongenerator/check-favicon`** — TS library exposing `checkDesktopFavicon`,
  `checkTouchIcon`, `checkWebAppManifest`. Runs *against* a rendered HTML page, inspects
  `<link rel>` tags, fetches icons, reports logs/warnings/errors. Good fit for the
  HTML-harness stage of validate.
- **`realfavicon check <url>`** CLI — same checks, shell output with `-s cli`.
- **Maskable.app (NotWoods/maskable)** — open-source; the preview logic can be ported
  but there's no published npm for safe-zone pixel analysis. We implement it ourselves
  with sharp (see checklist #4).

---

## 2. Maskable-icon safe-zone validation (implementation recipe)

The W3C manifest spec defines the safe zone as a **circle centered on the icon with
radius = 40% of icon width**; the outer 10% may be cropped. Lighthouse does **not**
validate pixels — it only checks `purpose: "maskable"` is declared. So `asset_validate`
must do the pixel check itself:

1. Load the maskable PNG with sharp, extract raw RGBA at 512×512.
2. For each pixel outside the safe circle (distance from center > 0.4·width): record
   whether it is non-background. Build a 2D "content" mask from non-transparent /
   non-background-color pixels.
3. **Opacity check:** any pixel with alpha < 255 → fail. Maskable icons MUST be opaque
   (Android Oreo + iOS cannot render transparency in adaptive icons).
4. **Safe-zone coverage:** measure `content_pixels_inside_safe_circle /
   total_content_pixels`. Fail if < 0.95 — i.e. ≥ 95% of meaningful pixels must live
   inside the circle (per web.dev guidance; "80% coverage" refers to the *circle
   diameter* relative to the canvas, not a coverage ratio of content).
5. **Edge-bleed check:** foreground pixels at the extreme 0–3 px border → warn (they
   will be clipped on circular Android masks).

## 3. Small-size recognizability (implementation recipe)

No off-the-shelf tool does this. Build it in ~40 LoC:

1. Rasterize the source SVG at 512×512 and at 16×16 using sharp.
2. Upscale the 16×16 back to 512×512 using nearest-neighbor (preserves the "what the
   browser tab actually shows" look).
3. Compute SSIM (via `ssim.js`) between the upscaled-16 and the true-512. Threshold:
   **SSIM ≥ 0.55** indicates the silhouette survives downscaling. Pixelmatch on the
   edge-map (Sobel) is a cheaper alternative if SSIM is too slow.
4. Also compute connected-component count in the 16×16 binary alpha. If the 512 had
   *k* distinct shapes and the 16×16 has < 0.7·k, the glyph collapsed → fail.

This catches the common failure where a wordmark or a multi-stroke logo becomes a
blurry smudge at tab size.

## 4. Rendered-bitmap contrast

Source-swatch contrast (brand palette) is covered elsewhere. The rendered-bitmap
version matters for OG images and illustrations:

1. Render the OG image at 1200×630.
2. For each glyph bbox (obtained from the Satori / resvg layout tree, or from OCR via
   Tesseract if we don't own the compositor), sample the mean foreground luminance
   and the mean *local* background luminance (the 8 px ring around the glyph).
3. Assert WCAG AA contrast (4.5:1 for < 18 pt equivalent, 3:1 for ≥ 18 pt) against the
   *local* background, not the whole-image average. This is the only way to catch
   "white title over a hero photo that happens to be bright in that region."

---

## 5. Concrete programmatic checks for `asset_validate`

The ten checks below cover the brand-asset surface area with tools that already exist
in 2026 npm. Each check has an explicit pass/fail rule so `asset_validate` can emit a
machine-readable verdict.

1. **Manifest installability.** Run Lighthouse `installable-manifest` audit against a
   temp HTML harness. Fail on any "manifest" error; warn on "icons" warning.
2. **Maskable declaration.** Manifest has ≥ 1 icon object whose `purpose` includes the
   token `"maskable"` and whose `sizes` is ≥ 512×512. (Lighthouse `maskable-icon`.)
3. **Maskable opacity + safe zone.** Decode the maskable PNG with sharp; assert
   `min(alpha) === 255` and `content_inside_0.4r_circle / total_content ≥ 0.95`.
   Custom code per recipe above.
4. **Apple touch icon present and opaque.** `<link rel="apple-touch-icon">` resolves
   to a 180×180 PNG with no transparent pixels (sharp channel histogram: alpha
   channel min = 255). (Lighthouse `apple-touch-icon` + local alpha check.)
5. **Favicon bundle completeness.** Run `@realfavicongenerator/check-favicon` against
   the harness: requires `<link rel="icon" type="image/svg+xml">`, a
   multi-resolution `favicon.ico` containing 16/32/48, and PWA 192/512 entries.
6. **Small-size recognizability.** sharp-rasterize the favicon SVG at 16×16 and
   512×512, compute SSIM between upscaled-16 and 512; fail if SSIM < 0.55 or if the
   connected-component count at 16 px is < 70% of the count at 512 px.
7. **OG image dimensions & weight.** og:image and twitter:image resolve to a 1200×630
   (±0 px) PNG or JPEG ≤ 5 MB, with `og:image:width` and `og:image:height` meta tags
   matching actual pixel dimensions.
8. **OG text contrast (rendered).** For each text layer in the Satori layout tree
   (or each OCR-detected glyph region if composition is opaque), compute local WCAG
   contrast ratio against the 8 px ring; fail if ratio < 4.5:1 (< 24 px text) or
   < 3:1 (≥ 24 px text). Uses sharp for sampling + `@capsizecss/metrics` to compute
   the glyph box.
9. **Theme color + splash coherence.** Manifest `theme_color` is a valid hex,
   `<meta name="theme-color">` in HTML matches manifest, and `background_color`
   contrast against each icon's mean foreground color ≥ 2:1 (so the splash doesn't
   vanish into the icon). Lighthouse `themed-omnibox` + local computation.
10. **Harness a11y clean.** Render a minimal `<html>` that embeds every asset via its
    intended tag (`<link rel="icon">`, `<img>` for OG, manifest link, apple-touch),
    load it in Playwright, run `new AxeBuilder({ page }).tags(['wcag2aa']).analyze()`;
    fail on any violation with `impact` ∈ {serious, critical}. This catches missing
    `alt`, unresolved icon links, and mis-wired `aria-label` on OG preview images.

---

## Sources

- `@axe-core/cli` — https://www.npmjs.com/package/@axe-core/cli
- `@axe-core/playwright` — https://www.npmjs.com/package/@axe-core/playwright
- Playwright accessibility testing — https://playwright.dev/docs/accessibility-testing
- Pa11y + axe integration — https://accessibility-manual.dwp.gov.uk/best-practice/automated-testing-using-axe-core-and-pa11y
- Lighthouse maskable-icon audit — https://developer.chrome.com/docs/lighthouse/pwa/maskable-icon-audit
- web.dev maskable icon spec (40% radius safe circle) — https://web.dev/maskable-icon
- Maskable icon transparency concerns — https://github.com/GoogleChrome/lighthouse/issues/10409
- pixelmatch — https://www.npmjs.com/package/pixelmatch
- sharp SVG→PNG density — https://github.com/lovell/sharp/issues/1421
- `@capsizecss/metrics` — https://www.npmjs.com/package/@capsizecss/metrics
- `@realfavicongenerator/check-favicon` — https://www.npmjs.com/package/@realfavicongenerator/check-favicon
- Twitter Card / og:image 1200×630 spec — https://socialpreviewhub.com/guides/twitter-card-validator
