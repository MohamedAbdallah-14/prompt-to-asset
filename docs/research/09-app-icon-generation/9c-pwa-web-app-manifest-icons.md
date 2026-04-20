---
category: 09-app-icon-generation
angle: 9c
title: "PWA & Web App Icons — Manifest, Maskable, Apple Touch, Favicons"
slug: 9c-pwa-web-app-manifest-icons
status: draft
author: research-subagent-9c
date: 2026-04-19
sources:
  - https://www.w3.org/TR/appmanifest/
  - https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
  - https://web.dev/articles/add-manifest
  - https://web.dev/articles/maskable-icon
  - https://maskable.app/
  - https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
  - https://developer.apple.com/design/human-interface-guidelines/app-icons
  - https://realfavicongenerator.net/
  - https://favicon.io/
  - https://github.com/onderceylan/pwa-asset-generator
  - https://github.com/lovell/sharp
  - https://jakearchibald.com/2021/dark-mode-favicons/
  - https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide
  - https://developers.google.com/web/fundamentals/integration/webapks
  - https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/dn455106(v=vs.85)
keywords:
  - web app manifest
  - maskable icon
  - apple-touch-icon
  - favicon.ico
  - svg favicon
  - dark mode favicon
  - pwa icons
  - android twa icon
  - browserconfig.xml
  - realfavicongenerator
---

# PWA & Web App Icons — Manifest, Maskable, Apple Touch, Favicons

## Executive Summary

Shipping a web app means shipping an icon *pipeline*, not a single PNG. A correct,
installable-everywhere PWA needs (at minimum) a **Web App Manifest** with
`purpose=any` and `purpose=maskable` icon variants, an **Apple touch icon**
(because iOS still ignores the manifest for home-screen icons), a **multi-size
`favicon.ico`** for legacy browsers and tab UIs, and — increasingly — a
**dark-mode-aware SVG favicon**. Microsoft's `browserconfig.xml` /
`msapplication-TileImage` pipeline is now legacy but still worth emitting for
Windows Start-menu pins. Android installs via Chrome will package your manifest
icons into a **WebAPK** and a **Trusted Web Activity (TWA)** additionally
requires a full adaptive-icon pipeline inside the wrapping Android project.

Three findings matter most for a prompt-enhancement + generation system:

1. **Two sources of truth, not one.** The manifest covers Chromium/installable
   PWAs + Android/WebAPK, but Safari (iOS/iPadOS, still as of 17/18) reads its
   own `<link rel="apple-touch-icon">` chain, and every browser still hits
   `/favicon.ico` unconditionally. A generator that emits only manifest icons
   will produce a broken install experience on iOS and a blurry tab icon on
   legacy browsers.
2. **Maskable ≠ regular.** `purpose=maskable` is a *separately authored* icon
   with the visual content inside a circle at 80 % of the canvas; reusing a
   `purpose=any` icon as maskable produces clipped logos on Android (where
   launcher masks vary from circle → squircle → teardrop). The correct pattern
   is `"purpose": "any"` + `"purpose": "maskable"` as two icon entries, or
   `"purpose": "any maskable"` only when the source truly has a 20 % safe
   padding on all sides.
3. **SVG-first, raster-fallback is the modern default.** A single SVG favicon
   with a `<style>@media (prefers-color-scheme: dark)>` block covers every
   desktop browser released in the last four years; PNG/ICO fallbacks handle
   everything else. Tools like `realfavicongenerator.net` and
   `pwa-asset-generator` can emit the full set from one source, but a
   `sharp`-based pipeline gives a prompt-enhancement agent deterministic,
   reproducible output.

The rest of this document specifies the complete icon set, the exact HTML
head, the maskable safe zone, the SVG dark-mode trick, and a comparison of
generator tooling suitable for agent-driven workflows.

## Full Icon Set

The following table is the union of icons produced by
`realfavicongenerator.net` (the de-facto superset), `pwa-asset-generator`, and
the manifest/Apple/Microsoft specs. "Required" is calibrated for a modern PWA
shipped in 2026; "Legacy" is emit-if-cheap.

| Filename                              | Size(s)            | Format | Purpose                                                      | Referenced by                                              | Required?         |
| ------------------------------------- | ------------------ | ------ | ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------- |
| `favicon.ico`                         | 16, 32, 48 (multi) | ICO    | Legacy tab / bookmark icon; IE/Edge pins; `/favicon.ico` fallback probe | `<link rel="icon" href="/favicon.ico" sizes="any">`        | Yes               |
| `favicon.svg`                         | vector             | SVG    | Modern vector tab icon; dark-mode via `prefers-color-scheme` | `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` | Yes (modern)      |
| `favicon-16x16.png`                   | 16×16              | PNG    | Fallback for browsers ignoring SVG + ICO                     | `<link rel="icon" sizes="16x16">`                          | Optional          |
| `favicon-32x32.png`                   | 32×32              | PNG    | High-DPI tab icon fallback                                   | `<link rel="icon" sizes="32x32">`                          | Optional          |
| `favicon-48x48.png`                   | 48×48              | PNG    | Windows + Chrome tab fallback                                | `<link rel="icon" sizes="48x48">`                          | Optional          |
| `apple-touch-icon.png`                | 180×180            | PNG    | iOS home screen; default if chain omitted                    | `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` | Yes (iOS)         |
| `apple-touch-icon-precomposed.png`    | 180×180            | PNG    | Pre-iOS-7 without automatic shine; harmless on modern iOS    | `<link rel="apple-touch-icon-precomposed">`                | Legacy            |
| `apple-touch-icon-{120,152,167}.png`  | 120/152/167        | PNG    | iPhone @2x, iPad, iPad Pro retina variants                   | `<link rel="apple-touch-icon" sizes="...">`                | Recommended       |
| `apple-touch-icon-57x57.png` → 144    | 57–144             | PNG    | Pre-iPhone-6 / iPad-1 devices                                | sized `<link rel="apple-touch-icon">` chain                | Legacy            |
| `icon-192.png`                        | 192×192            | PNG    | Manifest `icons[]`, `purpose=any`, min. size Chrome uses for install prompt | `manifest.webmanifest`                                     | Yes               |
| `icon-512.png`                        | 512×512            | PNG    | Manifest, required for splash screen generation & WebAPK     | `manifest.webmanifest`                                     | Yes               |
| `icon-maskable-192.png`               | 192×192            | PNG    | Manifest, `purpose=maskable`, 80 % safe zone                 | `manifest.webmanifest`                                     | Yes               |
| `icon-maskable-512.png`               | 512×512            | PNG    | Manifest, maskable, Android adaptive                         | `manifest.webmanifest`                                     | Yes               |
| `icon-monochrome-512.png`             | 512×512            | PNG    | Manifest, `purpose=monochrome`, Android themed icons (13+)   | `manifest.webmanifest`                                     | Recommended       |
| `icon-{72,96,128,144,152,384}.png`    | various            | PNG    | Legacy Android launcher density buckets pre-adaptive         | `manifest.webmanifest`                                     | Optional          |
| `mstile-150x150.png`                  | 150×150            | PNG    | Windows 8.1 / 10 pinned tile                                 | `browserconfig.xml`, `msapplication-TileImage`             | Legacy            |
| `mstile-{70,310x150,310x310}.png`     | various            | PNG    | Small / wide / large Windows tiles                           | `browserconfig.xml`                                        | Legacy            |
| `safari-pinned-tab.svg`               | vector             | SVG    | Safari macOS pinned tab (monochrome, single-color mask)      | `<link rel="mask-icon" color="#...">`                      | Legacy (Safari 17+ ignores) |
| `browserconfig.xml`                   | —                  | XML    | Points Windows tiles to mstile PNGs + tile color             | `<meta name="msapplication-config">`                       | Legacy            |
| `manifest.webmanifest`                | —                  | JSON   | Web App Manifest (icons, theme, display, orientation)        | `<link rel="manifest">`                                    | Yes               |

A minimum viable modern set (what a prompt-enhancement agent should emit by
default) is: `favicon.ico` (multi-size), `favicon.svg`, `apple-touch-icon.png`
(180), `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`,
`icon-maskable-512.png`, `icon-monochrome-512.png`, and
`manifest.webmanifest`. Everything else is for deeper cross-platform polish.

### Web App Manifest `icons[]` — field semantics

Per the W3C spec (§5 *Icons*), each entry is an `ImageResource` with:

- `src` — URL (relative allowed).
- `sizes` — WHATWG sizes string; `"any"` for vector; space-separated list
  allowed (`"48x48 96x96"`) but one-size-per-entry is the norm.
- `type` — MIME; optional but recommended for hinting (`image/png`, `image/svg+xml`).
- `purpose` — space-separated set of `any`, `maskable`, `monochrome`
  (Chromium), and historically `badge` (removed/ignored). Default is `any`.

The user agent picks the *best-fit* icon per display context; omitting
`type`/`sizes` forces it to download and inspect, which hurts install-prompt
latency.

## Maskable Icon Semantics

Android adaptive icons were introduced in Android 8.0 (API 26). Different
launcher OEMs apply different masks — circle (Pixel), squircle (Samsung One
UI), teardrop, rounded square — all inscribed inside a 108×108 dp bounding
box with a **72 dp safe zone** (66.6 % area). The Web App Manifest's
`purpose=maskable` mirrors this model:

- The manifest icon is assumed to be a square canvas.
- The launcher will apply a mask, centered, of diameter/size
  **≈ 80 % of the canvas edge**.
- Therefore, the *visually important part of your logo* must fit inside a
  circle of diameter 80 % of the icon canvas.
- The outer 10 % margin on each side is expected to be bleed (background
  color, not transparent) — the launcher will crop it.

Practical consequences:

- A logo that spans edge-to-edge (good for `purpose=any`) will be clipped as
  maskable.
- A transparent background is legal per spec but renders as solid black on
  some OEM launchers when themed icons are off; authors should fill the
  maskable canvas with the brand background color.
- You must author *two* files unless your logo naturally has a 20 % all-sides
  padding — only then is `"purpose": "any maskable"` safe.

[`maskable.app`](https://maskable.app/editor) is the canonical preview tool:
it overlays Pixel, Samsung, OnePlus, Huawei, etc. masks on the uploaded PNG,
and also emits a pre-sized maskable PNG from a source logo + background
color.

**Monochrome icons** (`purpose=monochrome`, introduced via Chromium for
Android 13 themed-icon support) are a *single-color silhouette on transparent
background* — treat it as a mask image: opaque = drawn, transparent = not
drawn. Android recolors it per the user's wallpaper-derived Material You
palette. Authors should flatten complex logos to a single-color glyph and
respect the same 80 % safe zone.

## Dark-Mode SVG Favicon

An SVG favicon can self-adapt to the browser's color scheme. The canonical
pattern (popularized by Jake Archibald in 2021 and now baseline across
Chromium, Safari, Firefox):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    :root { --fg: #111; --bg: transparent; }
    @media (prefers-color-scheme: dark) {
      :root { --fg: #fff; --bg: transparent; }
    }
    .glyph { fill: var(--fg); }
  </style>
  <rect width="64" height="64" fill="var(--bg)"/>
  <path class="glyph" d="M12 48 L32 12 L52 48 Z"/>
</svg>
```

Caveats a generator must encode:

- `<style>` inside SVG must *not* reference external CSS files (ignored by
  favicon renderers).
- Firefox evaluates `prefers-color-scheme` only if the SVG has an embedded
  `<style>` — external `media` attribute on `<link>` is ignored for icons.
- Safari supports SVG favicons only since 15.4 (2022); ship a PNG fallback.
- Some RSS readers / crawlers render favicons on arbitrary backgrounds —
  using `currentColor` instead of a hard `--fg` + always including a light
  fallback is the safest default.

Alternative: ship **two** SVGs and use `<link rel="icon" media="(prefers-color-scheme: dark)" ...>`.
This works on Chromium but is ignored by Firefox and Safari, so it is *additive*
to the in-SVG `@media` rule, not a replacement.

## HTML Head Reference

The canonical, minimal, modern head block — verified against current
(2025-2026) Chrome / Safari / Firefox / Edge behavior and reproduced by
`realfavicongenerator.net`'s 2025 output:

```html
<!-- Classic favicon (multi-size ICO) for legacy UAs -->
<link rel="icon" href="/favicon.ico" sizes="any">

<!-- Modern vector favicon with dark-mode styles embedded -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<!-- iOS / iPadOS home-screen icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Web App Manifest (PWA install, Android WebAPK) -->
<link rel="manifest" href="/manifest.webmanifest">

<!-- Theme color (address bar / splash) -->
<meta name="theme-color" content="#0f172a">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#020617">

<!-- Legacy Windows tile (optional) -->
<meta name="msapplication-TileColor" content="#0f172a">
<meta name="msapplication-config" content="/browserconfig.xml">
```

And the matching `manifest.webmanifest`:

```json
{
  "name": "Prompt Enhancer",
  "short_name": "Enhancer",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-monochrome-512.png", "sizes": "512x512", "type": "image/png", "purpose": "monochrome" }
  ]
}
```

Things frequently gotten wrong:

- `sizes="any"` on the ICO link is the documented way to prevent Chromium
  from ignoring it in favor of a lower-res manifest PNG for the tab.
- Manifest `start_url` must be same-origin and should include a `?source=pwa`
  query for analytics parity with WebAPK launches.
- `display: "standalone"` is the PWA default; `display_override: ["window-controls-overlay", "standalone"]`
  enables the newer WCO mode on Chromium desktop installs.
- Chrome now requires at least one `192×192` and one `512×512` icon with
  `purpose` containing `any` for the install prompt to trigger; maskable-only
  sets *do not* qualify.

## Apple Touch Icon Chain

Historically Apple documented a lookup chain for when no `<link>` is present:
the UA probes `/apple-touch-icon-precomposed.png`, `/apple-touch-icon.png`,
then sized variants, at the site root. In practice:

- iOS 7+ no longer applies the gloss overlay, making `-precomposed` a
  historical artifact; modern sites should just serve a single
  `apple-touch-icon.png` at 180×180.
- Full per-device chain (legacy, emit for completeness):
  - 57×57 — iPhone (pre-retina)
  - 60×60 — iPhone iOS 7
  - 72×72 — iPad (pre-retina)
  - 76×76 — iPad iOS 7
  - 114×114 — iPhone retina
  - 120×120 — iPhone retina iOS 7
  - 144×144 — iPad retina
  - 152×152 — iPad retina iOS 7
  - 167×167 — iPad Pro retina
  - 180×180 — iPhone 6 Plus+ retina / default modern
- Apple requires an **opaque background** — transparency is filled with
  black. Authors must composite the logo onto the brand color.
- Apple applies a slight rounded-corner mask (continuous corners ~
  superellipse squircle) automatically; do *not* pre-round the corners in
  the PNG.
- Apple Web App splash screens additionally use the icon plus
  `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style`
  meta tags; precise per-device splashes require the separate
  `apple-touch-startup-image` chain, which `pwa-asset-generator` automates.

## Microsoft Tile Icons (Legacy)

Introduced with IE 11 / Windows 8.1, `browserconfig.xml` is referenced via
`<meta name="msapplication-config" content="/browserconfig.xml">`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo   src="/mstile-70x70.png"/>
      <square150x150logo src="/mstile-150x150.png"/>
      <wide310x150logo   src="/mstile-310x150.png"/>
      <square310x310logo src="/mstile-310x310.png"/>
      <TileColor>#0f172a</TileColor>
    </tile>
  </msapplication>
</browserconfig>
```

Edge (Chromium) since 2020 treats the site as a Chromium-installable PWA and
uses the manifest — browserconfig is only consulted for legacy IE-mode tiles
and Windows 10 Start-menu pinning of non-installed sites. Most modern
generators still emit it because the marginal cost is trivial.

## Chrome Installable PWA & Android WebAPK

When a user installs a PWA on Android from Chrome, Chrome generates a
**WebAPK** — a minimal APK signed by Google Play's infra — that wraps the
manifest. The WebAPK generator:

- Consumes the `192×192` and `512×512` icons from `manifest.icons`.
- Prefers `purpose=maskable` for the adaptive-icon layer; falls back to
  `purpose=any` and auto-pads if absent, which produces the "icon-in-a-white-
  rounded-square" look users complain about.
- Uses `theme_color` + `background_color` for the splash screen; no separate
  splash asset is required.
- Caches icons at install time; changes require re-install (or a WebAPK
  update, which Chrome checks every ~24 h).

For desktop Chromium (Windows/macOS/Linux, ChromeOS), installed PWAs use the
same manifest icons but do **not** mask; they render the `purpose=any` 512×512
icon directly in the dock/launcher.

## Android Trusted Web Activity (TWA)

A TWA is a fully native Android app (Chrome Custom Tabs under the hood) that
ships through the Play Store, unlike the automatic WebAPK. The icon pipeline
is separate:

- You must build an Android adaptive icon: `ic_launcher_foreground.xml`
  (vector drawable, 108×108 dp, 72 dp safe zone) + `ic_launcher_background.xml`
  (solid color or vector), declared in `res/mipmap-anydpi-v26/ic_launcher.xml`.
- PNG fallbacks per density bucket: `mdpi` 48, `hdpi` 72, `xhdpi` 96, `xxhdpi`
  144, `xxxhdpi` 192.
- Play Store listing requires a separate 512×512 high-res icon.
- [**Bubblewrap**](https://github.com/GoogleChromeLabs/bubblewrap) and
  [**PWABuilder**](https://www.pwabuilder.com/) generate these from the web
  manifest automatically, but only if `purpose=maskable` is present — otherwise
  the output ships as a non-adaptive icon and is rejected by Play's 2022+
  quality guidelines.

The upshot: if you want to be Play-Store-shippable without manual rework,
**you must author maskable icons correctly from day one.**

## Tooling Comparison

| Tool                                  | Input          | Output                                                  | Offline/CLI | Maskable aware | Dark-mode SVG  | Notes                                                   |
| ------------------------------------- | -------------- | ------------------------------------------------------- | ----------- | -------------- | -------------- | ------------------------------------------------------- |
| [`realfavicongenerator.net`](https://realfavicongenerator.net/) | PNG/SVG upload | Full set: ico, svg, apple-touch chain, mstile, manifest | Web only (API available) | Yes (v8, 2023+) | Yes            | Industry superset; generates `site.webmanifest`; has a preview per-platform |
| [`favicon.io`](https://favicon.io/)   | PNG / text / emoji | ICO + PNG set + manifest                             | Web         | No             | No             | Fast, minimal; best for simple favicons, no PWA polish  |
| [`pwa-asset-generator`](https://github.com/onderceylan/pwa-asset-generator) | SVG/PNG/HTML | Apple splash + touch + manifest icons + maskable | Yes (CLI / Node API) | Yes | Partial (dark splash via `--dark-mode`) | Puppeteer-based; great for splash-screen matrix; 2.2k★ |
| [`sharp`](https://github.com/lovell/sharp) / `sharp-cli` | PNG/SVG | Anything (custom pipeline) | Yes (CLI / Node API) | DIY | DIY | libvips-backed; deterministic; best for agent pipelines |
| [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) | `icon-only.png` + `icon-foreground.png` | iOS + Android + PWA assets | Yes (CLI) | Yes | No | Ionic/Capacitor-focused; also covers splashes |
| [`icon.kitchen`](https://icon.kitchen/) | PNG/SVG/text | Android adaptive + web manifest + iOS            | Web         | Yes (native)   | No             | Roman Nurik's tool; best Android-first previews         |
| [`maskable.app`](https://maskable.app/editor) | PNG     | Maskable PNG + preview under OEM masks                  | Web         | Core feature   | N/A            | Validation/previewing, not full set generation          |
| [`pwabuilder`](https://www.pwabuilder.com/) | URL / manifest | Full PWA + TWA + Windows/iOS packages          | Web + CLI   | Yes            | No             | Also builds Bubblewrap TWA projects                      |
| [`favicons` npm](https://github.com/itgalaxy/favicons) | PNG/SVG | Full set incl. manifest, browserconfig          | Yes (CLI/Node) | Yes         | No             | Long-standing lib behind many other generators; 4.5k★   |

For an agent-driven prompt-enhancement system the pragmatic stack is:

1. Generation step produces a square source PNG (at least 1024×1024) plus a
   separate "safe-zone" PNG where the logo is pre-padded to 80 %.
2. `sharp` or `favicons` emits the PNG/ICO matrix deterministically.
3. The source SVG (or vectorized output — see category 16) is injected with
   a `prefers-color-scheme` `<style>` block to produce `favicon.svg`.
4. `maskable.app` preview (or `maskable` npm package) validates the maskable
   variant programmatically.
5. `pwa-asset-generator` optionally adds the Apple splash screen matrix.

This gives deterministic output (bit-identical across runs given the same
source), which is what agent regression tests need.

## Maskable-Specific Generation Prompts

When the generator is a T2I model (Gemini / gpt-image / SDXL), the prompt
should explicitly state the safe zone. Empirically-known-good patterns:

- *"Square icon, 1024×1024, solid `#0f172a` background filling edges, logo
  centered within the inner 80 % circle, no text outside the safe circle,
  no shadows or glows that extend to edges."*
- For monochrome: *"Single-color white silhouette on transparent background,
  solid silhouette only, no gradients, no halftones, centered within the
  inner 80 % circle, 1024×1024 PNG."*
- Explicitly negative-prompt ("no text near edges", "no square frame", "no
  rounded rectangle border") — launchers will add the frame.

These prompts interact with findings from categories **13 (transparent
backgrounds)** and **14 (negative prompting artifacts)**: maskable icons want
an *opaque* brand-color background, which sidesteps the common alpha-channel
failure modes, while monochrome icons require true RGBA transparency and thus
push against models that struggle with it.

## Validation Checklist (automatable)

A generator should assert the following before declaring success:

1. `manifest.webmanifest` parses as JSON and validates against the W3C schema.
2. At least one icon with `purpose` containing `any` and `sizes` ≥ 192×192.
3. At least one icon with `purpose` containing `any` and `sizes` ≥ 512×512.
4. At least one icon with `purpose` containing `maskable` at 192 and 512.
5. Maskable icons: non-transparent background color matches
   `manifest.background_color` (visual regression check).
6. Maskable icons: the outer 10 % border contains no high-frequency content
   (convolve with a Laplacian; reject if mean > threshold).
7. `favicon.ico` decodes as a multi-image ICO with 16, 32, 48 sub-images.
8. `favicon.svg` contains `<style>` referencing `prefers-color-scheme: dark`.
9. `apple-touch-icon.png` is exactly 180×180, opaque (no alpha channel in
   output PNG), and corners are square (not pre-rounded).
10. Lighthouse PWA audit (`installable` category) returns no icon warnings.

Scripting 10 with `lighthouse --only-categories=pwa --chrome-flags="--headless"`
in CI closes the loop for agent-generated sites.

## References

- W3C. *Web Application Manifest (Editor's Draft).* https://www.w3.org/TR/appmanifest/
- MDN Web Docs. *Web app manifests.* https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- MDN Web Docs. *manifest.icons.* https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons
- web.dev. *Add a web app manifest.* https://web.dev/articles/add-manifest
- web.dev. *Adaptive icon support in PWAs with maskable icons.* https://web.dev/articles/maskable-icon
- Maskable.app. *Editor & preview tool.* https://maskable.app/
- Apple. *Configuring Web Applications.* https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- Apple. *Human Interface Guidelines — App icons.* https://developer.apple.com/design/human-interface-guidelines/app-icons
- Jake Archibald. *Dark mode favicons.* 2021. https://jakearchibald.com/2021/dark-mode-favicons/
- Microsoft. *Browser configuration schema reference.* https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/dn455106(v=vs.85)
- Google / Chrome Developers. *Trusted Web Activity integration guide.* https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide
- Google. *WebAPKs — Web apps packaged for Android.* https://developers.google.com/web/fundamentals/integration/webapks
- RealFaviconGenerator. https://realfavicongenerator.net/
- favicon.io. https://favicon.io/
- Onder Ceylan. *pwa-asset-generator.* GitHub (≈2.2k★). https://github.com/onderceylan/pwa-asset-generator
- Lovell Fuller. *sharp (libvips Node binding).* GitHub (≈29k★). https://github.com/lovell/sharp
- Ionic team. *@capacitor/assets.* https://github.com/ionic-team/capacitor-assets
- itgalaxy. *favicons (Node generator).* GitHub (≈4.5k★). https://github.com/itgalaxy/favicons
- Google Chrome Labs. *Bubblewrap — TWA toolchain.* https://github.com/GoogleChromeLabs/bubblewrap
- PWABuilder. https://www.pwabuilder.com/
- Google. *Android adaptive icons.* https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Chromium. *Themed app icons (Android 13+).* https://chromestatus.com/feature/5120331762106368
