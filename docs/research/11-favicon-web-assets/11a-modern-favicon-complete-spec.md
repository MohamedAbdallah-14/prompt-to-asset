---
category: 11-favicon-web-assets
angle: 11a
title: "Modern Favicon Complete Spec — SVG-first, .ico fallback, Apple Touch, Android Manifest, Safari Pinned Tab, Microsoft Tile"
status: research
audience: prompt-to-asset skill authors & site implementers
date: 2026-04-19
primary_sources:
  - https://realfavicongenerator.net/blog/new-favicon-package-less-is-more/
  - https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
  - https://web.dev/articles/building/an-adaptive-favicon
  - https://web.dev/articles/maskable-icon
  - https://developer.mozilla.org/en-US/docs/Web/Manifest/icons
  - https://caniuse.com/link-icon-svg
  - https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html
keywords:
  - favicon
  - svg favicon
  - apple-touch-icon
  - web app manifest
  - maskable icon
  - mask-icon
  - msapplication-TileColor
  - theme-color
  - dark mode favicon
---

# Modern Favicon Complete Spec (2024–2026)

## Executive Summary

The favicon landscape has fundamentally simplified over the past five years. The era of shipping 20+ PNG files for every imaginable device is over. Modern best practice, as codified by RealFaviconGenerator's "Less is More" package ([realfavicongenerator.net, 2016→ongoing](https://realfavicongenerator.net/blog/new-favicon-package-less-is-more/)) and Andrey Sitnik's "How to Favicon in 2026" ([evilmartians.com](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)), has converged on **three to five files plus a web app manifest**.

The modern stack is:

1. **`favicon.svg`** — a single vector icon with embedded `@media (prefers-color-scheme: dark)` CSS for adaptive light/dark rendering. Supported in Chrome 80+, Firefox 41+, and Edge 80+. Safari added SVG favicon support in Safari 17 (macOS Sonoma, Sept 2023), but **Safari ignores `prefers-color-scheme` media queries inside SVG favicons** — it renders the base (light) variant regardless of OS theme. iOS Safari does not use SVG favicons; it uses `apple-touch-icon` for home-screen icons. ([caniuse](https://caniuse.com/link-icon-svg))

> **Updated 2026-04-21:** Safari 17+ supports `<link rel="icon" type="image/svg+xml">` for tab favicons, but the embedded `@media (prefers-color-scheme: dark)` block inside SVG favicons is **not honoured** by Safari as of Safari 18/19. The dark-mode adaptive media query works only in Chrome/Firefox/Edge. For Safari dark-mode favicon support, you currently need a JS-based `<link href>` swap keyed on `matchMedia('(prefers-color-scheme: dark)')`, or accept the light variant on Safari. No fix is expected until Safari Technology Preview implements the relevant spec change.
2. **`favicon.ico`** — a multi-image ICO (16/32/48) at the document root as a legacy fallback, and because RSS readers, Slackbot, and crawlers still request `/favicon.ico` unconditionally.
3. **`apple-touch-icon.png`** — a single 180×180 flat PNG (no transparency, no rounded corners — iOS adds both).
4. **Web App Manifest** (`manifest.webmanifest`) referencing a 192×192 and a 512×512 PNG, plus a dedicated 512×512 `maskable` icon for Android 8+ adaptive launchers.
5. **(Optional) `theme-color` meta tag** with `prefers-color-scheme` media variants for Safari 15+ address-bar tinting.

Two formats that used to be "required" are now effectively dead:

- **Safari pinned-tab `mask-icon`** — Safari 12 (2018) fell back to regular favicons for pinned tabs; even `apple.com` no longer ships one. Harmless to include, but not needed.
- **Microsoft Tile / `browserconfig.xml`** — tied to IE11 (EOL June 2022) and Windows 8 Start-menu pins. Chromium Edge uses the web app manifest instead ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color)).

The prompt-to-asset system can therefore treat favicon generation as a **well-scoped, deterministic asset job**: given a square source SVG (or a sufficiently large raster), emit exactly five files plus a manifest, and inject a five-line `<head>` snippet. Anything beyond that is optional polish or legacy compatibility.

## Canonical HTML Head Snippet

This is the complete, current best-practice `<head>` block. Every line has a defensive purpose and is documented below.

```html
<!-- Favicon (modern browsers, light/dark adaptive) -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">

<!-- Favicon (legacy + RSS/unfurl crawlers). sizes="32x32" prevents a Chrome bug
     where the ICO is preferred over the SVG. -->
<link rel="icon" href="/favicon.ico" sizes="32x32">

<!-- iOS home screen / Safari tab thumbnails. 180x180 flat PNG, no transparency. -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- PWA / Android install / splash -->
<link rel="manifest" href="/manifest.webmanifest">

<!-- Safari 15+ address bar tint (optional but cheap) -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)">
```

Notes on subtle details:

- **Order matters slightly.** Browsers walk the list and pick the first `<link rel="icon">` they understand. By putting the SVG first, modern browsers short-circuit before considering the ICO. ([CSS-Tricks](https://css-tricks.com/favicons-how-to-make-sure-browsers-only-download-the-svg-version/))
- **`sizes="32x32"` on the ICO is load-bearing.** Without it, Chrome has historically downloaded *both* the ICO and the SVG, wasting a round-trip. Evil Martians changed their recommendation from `sizes="any"` to `sizes="32x32"` in 2023 specifically to close this Chrome bug ([changelog 2023-07-11](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)).
- **No `rel="shortcut icon"`** — `shortcut` has never been a valid link relation; it is a 1999 IE relic ([Mathias Bynens, 2005](https://mathiasbynens.be/notes/rel-shortcut-icon)).
- **No `apple-touch-icon-precomposed`** — deprecated since iOS 7 (2013). Modern iOS ignores the gloss effect on both variants ([favicondl.com](https://favicondl.com/blog/apple-touch-icon-guide.html)).
- **No `apple-touch-icon` size matrix** (57/60/72/76/114/120/144/152/167/180). iOS downscales a single 180×180 with production-quality filtering ([RealFaviconGenerator test](https://realfavicongenerator.net/blog/how-ios-scales-the-apple-touch-icon)).
- **No `msapplication-*` meta tags** unless you have confirmed, current Windows-pinned-site users. They are not read by Chromium Edge in PWA contexts; manifest `theme_color` and `icons` take over ([Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color)).

## File Catalog

Every file a modern site *should* ship, every file it *may* ship, and every file it *should not* bother with.

### Required (ship these)

| Filename | Size / Format | Purpose | Deploy Path | Reference |
|---|---|---|---|---|
| `favicon.svg` | Vector SVG, square `viewBox` | Primary tab icon for Chrome 80+, Firefox 41+, Edge 80+, Safari 17+. Supports adaptive dark mode in Chrome/Firefox/Edge; Safari renders the base variant only (ignores embedded media queries as of Safari 18/19). | `/favicon.svg` or hashed under `/assets/` | [caniuse](https://caniuse.com/link-icon-svg) |
| `favicon.ico` | Multi-image ICO containing 16×16, 32×32, and 48×48 PNG-compressed entries | Legacy IE/old Safari; RSS readers; Slackbot; generic crawlers that only probe `/favicon.ico` | **Must** be at `/favicon.ico` (root) so `/favicon.ico` HEAD requests resolve | [ICO format spec (Wikipedia)](https://en.wikipedia.org/wiki/ICO_(file_format)) |
| `apple-touch-icon.png` | 180×180 PNG, **opaque** (no alpha), no rounded corners | iOS home-screen icon; Safari tab-group cover; many macOS system surfaces; also used as a high-res social fallback by some scrapers | `/apple-touch-icon.png` at root (iOS probes the root unconditionally) | [favicondl.com apple-touch-icon guide](https://favicondl.com/blog/apple-touch-icon-guide.html) |
| `icon-192.png` | 192×192 PNG, transparent OK | Android home-screen icon (`purpose: "any"`) | referenced by manifest | [MDN manifest/icons](https://developer.mozilla.org/en-US/docs/Web/Manifest/icons) |
| `icon-512.png` | 512×512 PNG, transparent OK | PWA splash screen; large surfaces | referenced by manifest | [web.dev add-web-app-manifest](https://web.dev/articles/add-manifest) |
| `icon-maskable-512.png` | 512×512 PNG, content inside a **409×409 center-safe circle** | Android 8+ adaptive icons; lets the launcher crop to circle/squircle/teardrop without chopping the logo | referenced by manifest with `purpose: "maskable"` | [web.dev maskable-icon](https://web.dev/articles/maskable-icon) |
| `manifest.webmanifest` | JSON | PWA metadata, icon registry, `theme_color`, `background_color` | `/manifest.webmanifest` | [W3C Manifest](https://www.w3.org/TR/appmanifest/) |

### Optional / defensive

| Filename | Size / Format | When to ship | Reference |
|---|---|---|---|
| `safari-pinned-tab.svg` | Single-path monochrome SVG, 100 % black fill, `viewBox="0 0 16 16"`, transparent background | Only if you still see Safari-pinned-tab traffic and want a custom tint; Safari 12+ falls back gracefully to the SVG/ICO favicon. | [Apple Pinned Tabs docs](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html) |
| `mstile-150x150.png` + `browserconfig.xml` | 150×150 PNG + XML manifest | Only if your analytics show Windows 8.1 / IE11 pinned-site users. Otherwise skip. | [MS pinned-site reference (archived)](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/dn255024(v=vs.85)) |
| `favicon-dev.ico` / `icon-dev.svg` | Same as prod, color-inverted | Staging/preview environments, so you do not ship the wrong env to production by accident. | [Evil Martians "Bonus tip"](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) |

### Retired — do NOT ship

- `apple-touch-icon-{57,60,72,76,114,120,144,152,167}.png` (iOS scales 180×180 well)
- `apple-touch-icon-precomposed.png` (deprecated iOS 7)
- `mstile-{70,310,310x150}.png` (Windows 8.0 tile set, EOL)
- `coast-228x228.png` (Opera Coast dead since 2017)
- `favicon-96x96.png` "Google TV" icon (product dead; [Firefox bug 751712](https://bugzilla.mozilla.org/show_bug.cgi?id=751712) made it actively harmful)
- `android-chrome-{36,48,72,96,144}.png` (not read since Chrome M51)

### Example `manifest.webmanifest`

```json
{
  "name": "Prompt Enhancer",
  "short_name": "Enhancer",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0b0b0b",
  "icons": [
    { "src": "/icon-192.png",           "type": "image/png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icon-512.png",           "type": "image/png", "sizes": "512x512", "purpose": "any" },
    { "src": "/icon-maskable-512.png",  "type": "image/png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

Key manifest rules ([web.dev maskable-icon](https://web.dev/articles/maskable-icon)):

- Keep `any` and `maskable` as **separate** entries. Declaring a single `"purpose": "any maskable"` asset forces unnecessary padding on non-masking surfaces and makes the core logo look small.
- Maskable safe zone = **circle of radius 0.4 × icon width**, centered. Outer ~10 % can be cropped. Test with [maskable.app](https://maskable.app/).
- Serve `manifest.webmanifest` with `Content-Type: application/manifest+json`. Some CDNs default to `application/octet-stream`, which Chrome will still accept but logs a warning.

## Dark-Mode SVG Recipe

A single SVG can flip colors based on the OS theme by embedding a `<style>` block with a `prefers-color-scheme` media query ([web.dev, Adam Argyle 2021](https://web.dev/articles/building/an-adaptive-favicon); [Thomas Steiner, 2019](https://blog.tomayac.com/2019/09/21/prefers-color-scheme-in-svg-favicons-for-dark-mode-icons/)).

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .bg   { fill: #ffffff; }
    .fg   { fill: #0b0b0b; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0b0b0b; }
      .fg { fill: #ffffff; }
    }
  </style>
  <rect class="bg" width="64" height="64" rx="12" />
  <path class="fg" d="M16 20h32v4H16zM16 30h32v4H16zM16 40h20v4H16z" />
</svg>
```

Rules that trip people up:

- **The media query reads the OS theme, not the per-site theme.** A user who sets the OS to dark but flips the site to light will still get the dark favicon. There is no workaround that survives Chrome's aggressive favicon caching ([Stack Overflow](https://stackoverflow.com/questions/67207095/issue-with-prefers-color-scheme-media-query)).
- **Safari ignores `prefers-color-scheme` media queries inside SVG favicons** across all current Safari versions including Safari 18/19 (2024–2025). Safari 17 added SVG favicon support for tabs, but the embedded `<style>` media query is silently skipped — Safari always renders the default (light) path. If a dark-mode favicon is business-critical on Safari, you must use a JS workaround that swaps the `<link>` `href` based on `matchMedia('(prefers-color-scheme: dark)')`.

> **Updated 2026-04-21:** No current stable Safari release (through Safari 19.x) honours `@media (prefers-color-scheme: dark)` inside an SVG favicon `<style>` block. This is a long-standing WebKit limitation. The JS `<link href>` swap remains the only cross-browser path if you need adaptive favicons on Safari.
- **Changes require a page reload.** Browsers cache favicons aggressively; flipping the OS theme mid-session rarely re-renders the tab icon. This is a Chromium/Firefox implementation limitation, not a spec requirement.
- **`xmlns` is mandatory.** Without `xmlns="http://www.w3.org/2000/svg"`, Firefox will fail to render the SVG as a favicon even though it happily renders it as an `<img>` source.
- **Optimize with SVGO but preserve `<style>`.** SVGO's default preset strips `<style>` blocks; pass `--disable=removeStyleElement` or use the `modern` preset. ([SVGO](https://github.com/svg/svgo))
- **Wide-gamut P3 is usable here too** via `@media (color-gamut: p3)` ([Evil Martians P3 in SVG](https://evilmartians.com/chronicles/how-to-use-p3-colors-in-svg)), since the SVG is rendered by the browser's color-managed pipeline.

## Edge Cases

Real-world favicon failures almost never come from browsers — they come from the *other* fetchers.

### RSS readers

Feedly, Inoreader, NewsBlur, NetNewsWire, and Feedbin all fetch `/favicon.ico` from the feed's root domain. They generally do **not** parse HTML for `<link rel="icon">` — they hit the `.ico` directly ([StackOverflow on Feedly/Feedbin](https://stackoverflow.com/questions/23879281/where-does-feedly-and-feedbin-get-their-feed-favicon-icons-from)). Some respect `<atom:icon>` inside the feed itself, but support is inconsistent. Inoreader serves cached favicons from `https://www.inoreader.com/cache/favicons/...` and re-fetches on a slow cycle. Action: **always keep `favicon.ico` at the document root**, never behind a hash.

### Slack / Discord / Teams unfurl

When a URL is pasted, Slackbot/Discord crawlers fetch the page and follow a metadata priority chain ([dev.to "URL Unfurling"](https://dev.to/eatyou_eatyou_d79d27e5622/url-unfurling-how-slack-discord-and-twitter-generate-link-previews-4144)):

1. Open Graph (`og:image`, `og:title`, `og:description`) — the big preview card.
2. Twitter Card tags (as fallback).
3. `<title>` and `<meta name="description">`.
4. `<link rel="icon">` → `<link rel="shortcut icon">` → `/favicon.ico` — for the tiny site-identity icon shown next to the title.

Critical constraints:

- **The first 32 KB of HTML must contain all meta tags.** Slackbot truncates the response and ignores anything after ([blog.daveallie.com](https://blog.daveallie.com/slack-link-unfurling/)).
- **Relative URLs fail.** `<meta property="og:image" content="/og.png">` will silently 404 in Slack. Always use absolute URLs.
- **No JavaScript execution.** Client-side rendered favicons / OG tags are invisible to unfurlers.
- **Slack caches per-workspace, Discord caches for minutes.** Re-paste the URL or use Slack's [cache-buster query-string trick](https://api.slack.com/docs/unfurling) to force a refresh.

### Safari / iOS weirdness

- iOS replaces transparent pixels in `apple-touch-icon` with **black**, not white ([favicondl.com](https://favicondl.com/blog/apple-touch-icon-guide.html)). Always bake a solid background into the 180×180.
- iOS applies its own 18 % corner radius. Do not pre-round, or you get a double-rounded look.
- Keep important content 10–15 % inside the edges. The 180×180 display size on device is ~60 pt, so fine detail vanishes.
- Safari 15+ also uses `apple-touch-icon` for its tab-group cover images and Start-page icons.

### Chromium favicon caching

Chrome caches favicons per origin with long TTLs. To force a refresh during development, either (a) bump the URL (`/favicon.svg?v=2`), (b) clear `chrome://settings/siteData`, or (c) restart Chrome with `--disable-application-cache`. This is the single most common cause of "my new favicon isn't showing up" bug reports ([realfavicongenerator.net/favicon_checker](https://realfavicongenerator.net/favicon_checker)).

### `sizes="any"` footgun

Historically many tutorials recommended `<link rel="icon" href="/favicon.ico" sizes="any">`. As of 2022–2023, Chrome interpreted `any` as "use for all sizes" and would prefer the ICO over the SVG, downloading both and rendering the ICO. The fix — documented in the Evil Martians 2023-07-11 changelog — is to pin the ICO to `sizes="32x32"`, forcing Chrome to pick the SVG for any non-32 context.

### `.ico` truly needs only 16 / 32 / 48

- 16×16 and 32×32 are the two bitmaps browser tabs actually request.
- 48×48 covers the Windows File Explorer "medium icon" view and old Windows taskbar shortcuts.
- Sizes above 48 inside an ICO are wasted bytes — modern OSes fetch the PNG / SVG variants for high-DPI surfaces ([premiumfavicon.com](https://www.premiumfavicon.com/blog/favicon-sizes-complete-guide); [favicon.io](https://favicon.io/tutorials/favicon-sizes/)).
- Use PNG-compressed ICO entries (supported since Vista, 2007) to keep total file size under ~15 KB.

## Generator Tool Comparison

| Tool | Output | Strengths | Weaknesses | Best for |
|---|---|---|---|---|
| [RealFaviconGenerator](https://realfavicongenerator.net/) | Full multi-platform package, adjustable per target (iOS background, Android theme, masking, Safari tint). Offers a "less is more" minimal mode. Built-in [Favicon Checker](https://realfavicongenerator.net/favicon_checker) diagnoses live sites. | Most thorough; still the de-facto reference. Open-source core ([github.com/RealFaviconGenerator](https://github.com/RealFaviconGenerator/realfavicongenerator)). Generates the correct, current HTML snippet. | UI is dated; opinionated defaults default toward the "big package" unless you pick minimal. | Production sites that want the safest, most defensive package. |
| [favicon.io](https://favicon.io/) | ICO + 16/32/192/512 PNG, `site.webmanifest`. Also generates text-based or emoji-based icons from scratch. | Fastest UX; free; great for prototypes. Text-to-favicon is genuinely useful. | No SVG favicon output; no maskable icon; no dark-mode variant; no Safari pinned-tab. | Quick MVP / internal tools. |
| [icon.kitchen (Google)](https://icon.kitchen/) | Launcher-style Android / iOS / favicon previews from SVG/PNG input. Great maskable preview. | Free, Google-authored, excellent live preview of how the icon renders under every Android launcher mask. | Focused on app icons, not a full web favicon pack; no HTML snippet. | Designing the maskable variant before feeding into a web generator. |
| [maskable.app](https://maskable.app/) | Editor + checker for maskable 512×512 PNG. | Only tool that visualizes the safe-circle against all actual launcher masks (Pixel, OnePlus, Samsung, teardrop, squircle). | Maskable only; does not emit the other files. | Verifying / authoring the `purpose: "maskable"` asset. |
| [Favicon Maker (faviconmaker.net)](https://faviconmaker.net/) | "5-line snippet" generator matching the minimal 2024+ convention. | Opinionated toward the modern minimal setup; clean output. | Newer, less battle-tested than RFG. | Developers who already know they want the minimal package. |
| CLI: `sharp` / ImageMagick / Inkscape | Arbitrary | Scriptable, reproducible, cache-bustable, fits CI/CD. Evil Martians' [recipe](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs#step-2-create-an-ico-file) is the canonical script. | You must implement the HTML snippet and manifest yourself. | Monorepos, design systems, agent-generated asset pipelines (recommended for the prompt-to-asset skill). |
| `pwa-asset-generator` npm | 40+ Apple splash sizes, iOS/Android icons. | Excellent for PWAs needing the full iOS splash matrix. | Overshoots for a plain favicon set. | PWA shops. |

**Recommendation for the prompt-to-asset skill:** emit files via a scripted pipeline (Node `sharp` + `ico-endec` + `svgo`) rather than shelling out to a web service, because (a) it is reproducible in CI, (b) it does not require network access, and (c) the agent can inject cache-busting hashes into both the file names and the head snippet atomically. Use RealFaviconGenerator's snippet format as the ground-truth template.

## References

### Primary sources

- RealFaviconGenerator. "New favicon package — Less is more." 2016 (kept current). <https://realfavicongenerator.net/blog/new-favicon-package-less-is-more/>
- RealFaviconGenerator. "How iOS scales the Apple Touch icon." <https://realfavicongenerator.net/blog/how-ios-scales-the-apple-touch-icon>
- RealFaviconGenerator. Favicon Checker (live-site diagnostic). <https://realfavicongenerator.net/favicon_checker>
- Sitnik, Andrey. "How to Favicon in 2026: Three files that fit most needs." Evil Martians Chronicles. 2021, rev. 2024–2026. <https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs>
- Argyle, Adam. "Building an adaptive favicon." web.dev. <https://web.dev/articles/building/an-adaptive-favicon>
- Steiner, Thomas. "prefers-color-scheme in SVG favicons for dark mode icons." 2019. <https://blog.tomayac.com/2019/09/21/prefers-color-scheme-in-svg-favicons-for-dark-mode-icons/>
- Paluzzi, Pete. "Adaptive icon support in PWAs with maskable icons." web.dev. <https://web.dev/articles/maskable-icon>
- MDN Web Docs. "Web app manifest — icons member." <https://developer.mozilla.org/en-US/docs/Web/Manifest/icons>
- W3C. "Web Application Manifest." <https://www.w3.org/TR/appmanifest/>
- Can I Use. "SVG favicons — link rel=icon type=image/svg+xml." <https://caniuse.com/link-icon-svg>
- Apple Developer. "Creating Pinned Tab Icons." (archived but still canonical). <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html>
- Microsoft Learn. "Define icons and a theme color" (Edge PWA docs; replaces `browserconfig.xml`). <https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color>
- Microsoft Learn (archive). "Pinned site metadata reference." <https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/platform-apis/dn255024(v=vs.85)>

### Secondary & corroborating

- Bynens, Mathias. "rel=shortcut icon — a useless link type." 2005. <https://mathiasbynens.be/notes/rel-shortcut-icon>
- CSS-Tricks. "Favicons: How to Make Sure Browsers Only Download the SVG Version." <https://css-tricks.com/favicons-how-to-make-sure-browsers-only-download-the-svg-version/>
- CSS-Tricks. "SVG, Favicons, and All the Fun Things We Can Do With Them." <https://css-tricks.com/svg-favicons-and-all-the-fun-things-we-can-do-with-them/>
- CSS-Tricks. "Dark Mode Favicons." <https://css-tricks.com/dark-mode-favicons/>
- favicondl.com. "Apple Touch Icon: Complete Setup Guide." <https://favicondl.com/blog/apple-touch-icon-guide.html>
- favicon.io. "Favicon Sizes — Complete Size Guide." <https://favicon.io/tutorials/favicon-sizes/>
- FaviconMaker.net. "Favicon HTML tags: a minimal snippet that works." <https://faviconmaker.net/blog/favicon-html-tags-minimal-snippet>
- Wikipedia. "ICO (file format) — Icon resource structure." <https://en.wikipedia.org/wiki/ICO_(file_format)>
- Bugzilla. "Firefox loads too many favicons." Bug 751712. <https://bugzilla.mozilla.org/show_bug.cgi?id=751712>
- Allie, Dave. "Debugging Slack Link Unfurling." <https://blog.daveallie.com/slack-link-unfurling/>
- Slack API. "Unfurling links in messages." <https://api.slack.com/docs/unfurling>
- dev.to. "URL Unfurling: How Slack, Discord and Twitter Generate Link Previews." <https://dev.to/eatyou_eatyou_d79d27e5622/url-unfurling-how-slack-discord-and-twitter-generate-link-previews-4144>
- Merchant, Amit. "Get your website ready for new tab bar theming of Safari 15." <https://www.amitmerchant.com/get-your-website-ready-tab-bar-theming-of-safari-15/>
- maskable.app. <https://maskable.app/>
- icon.kitchen. <https://icon.kitchen/>

### Tools / CLIs

- [SVGO](https://github.com/svg/svgo) — SVG optimizer; keep `<style>` blocks intact.
- [Squoosh](https://squoosh.app/) — PNG re-compression (OxiPNG + reduced palette).
- [sharp](https://github.com/lovell/sharp) — Node image processing (resize + PNG emit).
- [ico-endec](https://github.com/fiahfy/ico-endec) — pure-JS multi-image ICO writer.
- [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) — for PWAs that need the full iOS splash matrix.
