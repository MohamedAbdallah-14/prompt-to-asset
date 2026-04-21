---
category: 18-asset-pipeline-tools
angle: 18c
title: "Splash Screen Generators — Android 12+, iOS Launch Storyboard, PWA Startup Images, and pwa-asset-generator Deep Dive"
author: research-subagent-18c
date: 2026-04-19
status: research-draft
primary_sources:
  - https://developer.android.com/develop/ui/views/launch/splash-screen
  - https://developer.apple.com/documentation/uikit/responding-to-the-launch-of-your-app
  - https://developer.chrome.com/docs/lighthouse/pwa/splash-screen
  - https://github.com/elegantapp/pwa-asset-generator
  - https://github.com/zoontek/react-native-bootsplash
  - https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
  - https://github.com/ionic-team/capacitor-assets
  - https://capacitorjs.com/docs/guides/splash-screens-and-icons
tags: [splash, launch-screen, pwa, android-12, ios, apple-touch-startup-image, pwa-asset-generator, bootsplash, capacitor, expo, asset-pipeline]
---

# 18c — Splash Screen Generators

## Executive Summary

Splash (a.k.a. "launch") screens look trivial from outside — a logo on a colored background — but on every real app target (native Android, native iOS, React Native, Expo, Capacitor, PWA) the **asset contract is different**, and most AI image models and naive pipelines get at least one of the following wrong:

1. **Android 12+ silently masks everything outside a 192 dp circle.** Any text, tagline, or decorative element in the foreground icon disappears at runtime. It is an *icon* API, not a *splash image* API — the thing you ship is a vector drawable that behaves like an adaptive launcher icon.
2. **iOS flat-out discourages raster launch images.** Apple deprecated static launch images in the Asset Catalog in June 2020; the canonical way since iOS 14 is either a `LaunchScreen.storyboard` or a `UILaunchScreen` dictionary in `Info.plist`. Legacy PNG-based `LaunchImage` sets still work but are fragile and not future-proof.
3. **PWAs on iOS have no auto-generated splash.** Unlike Android Chrome, which composes a splash from `manifest.json` (`name` + `background_color` + `theme_color` + a ≥512 px icon), Safari requires an *exhaustive* matrix of `<link rel="apple-touch-startup-image" …>` tags — one PNG per device × orientation × pixel-ratio combination. As of 2025 this is ~26+ assets for a complete iPhone + iPad matrix, and new devices add more each year.
4. **Dark mode is not free.** Android 12+ does not pick up a `-night` qualifier reliably on all OEMs (notably MIUI/Xiaomi); iOS needs a second storyboard variant or dark-aware asset catalog entries; PWA splash is single-pixel-color only (`background_color`), so "dark PWA splash" means shipping a darker image or a second media-query matrix.
5. **`pwa-asset-generator` (elegantapp, v8.1.4, ~3 k ★, actively maintained as of 2026)** remains the de-facto open-source tool for generating this mess. It uses Puppeteer + headless Chrome as a rasterization canvas, reads a single source SVG/PNG/HTML, and emits the entire icon/splash matrix plus ready-to-paste `<link>` tags and `manifest.json` fragments. `@capacitor/assets`, `expo-splash-screen`, and `react-native-bootsplash`'s generator cover the hybrid/native cases with similar philosophy but different output conventions.

For an AI-powered "generate me a splash screen" skill, the practical implication is: **generate one clean, centered brand mark on a solid background, once per theme (light + dark), at ≥2732 × 2732 px with a transparent-or-solid center-safe logo** — then fan it out through one of these generators. Do *not* ask the model to render 26 iOS sizes; that path leads to blurry, mis-cropped, inconsistent art.

## Splash Spec per Platform

### Android 12+ (API 31+) — SplashScreen API

Android 12 introduced `Theme.SplashScreen` (and the AndroidX `androidx.core:core-splashscreen` compat library for API 23+). The API is **icon-only** — it composes a splash window from three attributes, and nothing else is guaranteed to render:

- `windowSplashScreenBackground` — a single opaque color. Drawables/images are **not** supported here.
- `windowSplashScreenAnimatedIcon` — a static or animated vector drawable. Animations must be ≤ 1,000 ms.
- `windowSplashScreenBrandingImage` — an optional 200 × 80 dp bottom image (Android 12+ only, must live in `values-v31`).

**Icon dimensions and the circular safe zone:**

| Variant | Icon size | Circular mask diameter |
|---|---|---|
| With icon background | 240 × 240 dp | 160 dp |
| Without icon background (transparent) | 288 × 288 dp | 192 dp |

Everything **outside the safe circle is masked to invisible**, just like adaptive launcher icons. This is the most common AI-gen failure: the model produces a logotype with text or a horizontal wordmark, and at runtime the left/right edges vanish. Rule of thumb for prompts: the brand mark must fit inside a centered circle ≤ 66% of the canvas.

`windowSplashScreenIconBackgroundColor` fills the disc behind a transparent icon; `splashScreenIconSize` can override the default to, e.g., `@dimen/dp_100` when a tight logo reads poorly at 192 dp.

**Dark mode:** duplicate the theme under `res/values-night-v31/themes.xml` with inverted `windowSplashScreenBackground` / icon tint. Known bug: several MIUI builds ignore night-qualified resources for the splash theme; the documented workaround is to set `Theme.SplashScreen.Common` as parent rather than `Theme.SplashScreen`, and to explicitly set `windowSplashScreenBackground` in both themes.

Example `values-v31/themes.xml`:

```xml
<style name="Theme.App.Starting" parent="Theme.SplashScreen">
  <item name="windowSplashScreenBackground">@color/splash_bg</item>
  <item name="windowSplashScreenAnimatedIcon">@drawable/ic_splash</item>
  <item name="windowSplashScreenAnimationDuration">500</item>
  <item name="android:windowSplashScreenBrandingImage">@drawable/ic_brand</item>
  <item name="postSplashScreenTheme">@style/Theme.App</item>
</style>
```

For API 23–30 the AndroidX `core-splashscreen` compat library reads the same attributes and falls back to a normal themed activity, so the source of truth stays a single vector drawable + color.

### iOS 14+ — LaunchScreen.storyboard / UILaunchScreen

Apple's position, reaffirmed in current HIG and `UIKit`/`responding-to-the-launch-of-your-app` docs, is that the launch screen must render **instantly** from a declarative description — no code, no network, no runtime logic — and should closely match the first actual screen of the app rather than show a branded splash.

Three supported modes in 2025–2026:

1. **`LaunchScreen.storyboard`** — The traditional path. A minimal Interface Builder scene with a background color (asset catalog color) and optionally a centered `UIImageView` pointing to an asset-catalog image set. Supports Auto Layout; safe on every device because the layout is computed at run time.
2. **`UILaunchScreen` dictionary in `Info.plist` (iOS 14+)** — A storyboard-less replacement; set background color + image name, plus flags like `UINavigationBar`, `UITabBar`, `UIToolbar`, and `UIImageRespectsSafeAreaInsets`. Preferred in new projects because it has no `.xib` to break during file renames or Xcode upgrades.
3. **Legacy `LaunchImage` PNG set** — Still loads on iOS 13 and earlier, but Apple deprecated static launch images in the asset catalog in June 2020. New apps submitted today will be rejected if they rely solely on `LaunchImage` without either a storyboard or `UILaunchScreen`. Treat this as a compatibility-only path.

Apple has *not* deprecated storyboards themselves in 2025; what was deprecated is the old `LaunchImage` asset catalog. Rule: ship either a storyboard or `UILaunchScreen`, and if you ship an image inside it, put the image in a color/image asset set with light + dark appearances instead of burning theme into pixels.

**Dark mode:** handled via `Appearance = Any, Dark` variants in the asset catalog — both the background color asset and the image asset get two slots; the storyboard/`UILaunchScreen` picks the right one at launch based on `UIUserInterfaceStyle`. Disable dark launch by setting `UIUserInterfaceStyle = Light` in `Info.plist` if you do not want to maintain it.

**Size limit:** iOS 14+ enforces a 25 MB cap on the launch-screen payload, which matters if a team keeps packing 3× PNGs into the storyboard's asset set.

### Android legacy (pre-API 31)

Apps that must support API 23–30 without the AndroidX compat library fall back to either:

- A normal themed activity with `windowBackground` set to a layer-list drawable (classic "splash activity" pattern) — works but lives in the Android 11 era and does not integrate with the system's cold-start animation.
- The AndroidX compat library, which is the correct path: same `Theme.SplashScreen` attributes, graceful degradation.

The pre-12 legacy path matters because many AI-gen pipelines still produce a full-bleed 1080 × 1920 PNG "splash," which fits this older model and nothing else. Generators should explicitly *not* emit those by default in 2026.

### PWA — Android Chrome auto-splash

Chrome on Android synthesizes the splash from `manifest.webmanifest`:

```json
{
  "name": "My App",
  "short_name": "My",
  "background_color": "#ffffff",
  "theme_color": "#4338ca",
  "icons": [
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Lighthouse will flag a PWA as *"is not configured for a custom splash screen"* unless the manifest has a valid `name`, a CSS-parseable `background_color`, and at least one icon ≥ 512 × 512 px. The splash is composed at runtime: background color fill + largest icon centered + app name. There is no way to supply a pre-rendered Android PWA splash image. HTTPS is required; the splash never appears over `http://localhost` via port-forward.

### PWA — iOS Safari `apple-touch-startup-image`

iOS Safari does **not** read `background_color` or `theme_color` for splash. It requires a hand-authored `<link rel="apple-touch-startup-image" …>` per device and orientation, matched via media queries that pin `device-width`, `device-height`, `-webkit-device-pixel-ratio`, and `orientation`:

```html
<link rel="apple-touch-startup-image"
      href="/splash/iphone14pro-portrait.png"
      media="(device-width: 393px) and (device-height: 852px)
             and (-webkit-device-pixel-ratio: 3)
             and (orientation: portrait)" />
```

As of early 2026 the complete matrix is ~26–30 PNGs, covering iPhone SE, iPhone 6/7/8 class, iPhone X–17 series (including Pro and Pro Max), iPad 9.7"–13", iPad mini, iPad Air, and iPad Pro, each in portrait and landscape, at the correct device pixel ratio (2× or 3×). Missing a device size results in a black or white blank on launch from the home screen — there is no graceful fallback.

For **dark mode on iOS PWA**, append `(prefers-color-scheme: dark)` to the media query and ship a second matrix. This is a hard sell at 50+ images; most teams ship a single neutral splash that reads acceptably on both.

## Generator Tool Comparison

### pwa-asset-generator (elegantapp) — deep dive

- **Repo:** [`github.com/elegantapp/pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator/)
- **Version (confirmed 2026-04-21):** v8.1.4 — ~3.0 k stars, 155 forks, 83 releases across 20 contributors, MIT, 89% TypeScript. Actively maintained; open issues filed as recently as March 2026.
- **Tech stack:** Puppeteer + headless Chrome as the rasterization canvas. This means the source can be an **SVG, PNG, JPG, or HTML fragment** — Chrome renders it at every target size, so vector sources produce perfectly sharp output at any resolution.
- **What it generates:**
  - iOS home-screen icons (`apple-touch-icon` set)
  - iOS PWA splash screens (full `apple-touch-startup-image` matrix with media queries)
  - Android Chrome PWA icons (manifest entries at all `sizes`)
  - Favicons (multi-size `.ico` + PNG fallbacks)
  - Windows `mstile-*` tiles for Microsoft pinned sites
  - Ready-to-paste `<link>` and `<meta>` tags for `index.html`
  - Auto-patched `manifest.json` with an `icons` array

- **Breaking changes in 8.x (March 2025 – March 2026):**
  - v8.0.0 — full ESM migration, Node 18+ required. Breaking for consumers importing as a module.
  - v8.0.1 — fixed a Puppeteer bug where the screenshot was taken before the Chrome window was fully focused, which caused occasional blanks.
  - v8.1.0 — replaced `chalk` with `picocolors` for console output (no API change).
  - v8.1.3 / v8.1.4 — concurrency overload fix + security-only dependency updates.

- **Key CLI flags:**

  ```bash
  pwa-asset-generator <source> <output-dir> \
    --type png \
    --background "#ffffff" \
    --padding "10%" \
    --scrape=false \                # don't re-fetch Apple's device list
    --favicon \
    --opaque=false \                # RGBA output
    --maskable \                    # generate Android maskable icons
    --mstile \
    --preset minimal-2023 \         # or: minimal | android | windows | ios | all
    --path /assets/ \               # href prefix in emitted HTML
    --manifest ./manifest.json \
    --index ./index.html \
    --splash-only                    # skip icons
  ```

- **Presets:** `minimal` (default), `minimal-2023` (drops very old iPhones), `android`, `windows`, `ios`, and `all`. For a fresh 2026 PWA, `minimal-2023` is the right default; `all` produces ~80+ files and is mostly legacy.

- **Dark mode:** not a first-class flag as of v8.1.4. The documented pattern is to run the tool twice — once with a light background + light-mode HTML/SVG source, once with a dark-mode source and `--background` flipped — then manually merge the emitted `<link>` matrices, adding `(prefers-color-scheme: dark)` to the dark-matrix media queries. Several open issues have tracked a `--dark-mode` flag; none merged as of v8.1.4.

- **HTML-as-source trick:** because Puppeteer renders the input, you can pass a small HTML file with CSS that draws the logo + background gradient + padding, and the tool will rasterize that at every splash size. This is the cleanest way to get a single source of truth for both light and dark variants.

- **Known limits:** Puppeteer bundles Chromium (~200 MB install), which hurts CI cold starts. Concurrency bugs have appeared in 8.1.x; pin a known-good version in automation.

### Vite PWA Assets Generator (`@vite-pwa/assets-generator`)

Not the same package. Ships as part of the Vite PWA ecosystem (`vite-pwa-org.netlify.app/assets-generator/cli.html`), uses Sharp rather than Puppeteer, faster, lighter, and tightly integrated with `vite-plugin-pwa`. Does not attempt the full `apple-touch-startup-image` matrix by default — its philosophy is "let Chrome auto-generate Android, ship a minimal iOS icon set, and skip the PNG splash matrix." Good choice when targeting Android PWA only.

### `@capacitor/assets`

- **Repo:** [`github.com/ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets)
- **Source shape:** needs a splash source ≥ 2732 × 2732 px, plus an icon source ≥ 1024 × 1024 px.
- **Easy Mode:** one `logo.png` (+ optional `logo-dark.png`) + `--splashBackgroundColor` / `--splashBackgroundColorDark` flags. The tool composes the splash by centering the logo on the colored background and scaling to each target.
- **Custom Mode:** supply explicit `splash.png` + `splash-dark.png` files.
- **Key flags:**
  - `--logoSplashScale` (default 0.2) — logo occupies 20% of the shortest splash edge.
  - `--logoSplashTargetWidth` — override the above with an absolute pixel value.
  - `--splashBackgroundColor` / `--splashBackgroundColorDark`.
- Emits fully populated native projects: Android `res/drawable*`, iOS Assets.xcassets splash image sets (light + dark), and updates for Capacitor's splash plugin. First-class dark-mode pipeline, unlike pwa-asset-generator.

### `expo-splash-screen` (config plugin)

- Config lives in `app.json` under `plugins`:

  ```json
  ["expo-splash-screen", {
    "image": "./assets/splash-light.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#ffffff",
    "dark": {
      "image": "./assets/splash-dark.png",
      "backgroundColor": "#000000"
    }
  }]
  ```

- `resizeMode`: `contain` (default, aspect-fit), `cover` (aspect-fill), `native` (Android only — centered, no scaling).
- Runs entirely at prebuild time; no manual Xcode or Gradle fiddling.
- Known issue in SDK 52 where the dark variant on Android is not generated unless the same `dark` block is *also* mirrored inside the `android` key — tracked in `expo/expo#32860`. Test on a real preview/production build; Expo Go masks the real splash.

### `react-native-bootsplash` (zoontek)

- For bare RN or custom workflows that want the Android 12+ API correctly wired without Expo.
- Ships a generator CLI: `npx react-native generate-bootsplash ./assets/logo.png --background-color=FFFFFF --logo-width=180`. Produces the full native asset tree including the Android 12 `values-v31` theme and the iOS storyboard.
- Supports animated/lottie-driven hide transitions. Complies with the Android 12 SplashScreen API (vector drawable + safe-zone sizing); does *not* try to ship a pre-rendered bitmap splash.
- Weekly downloads ≈ 173 k as of mid-2026; ~4.2 k stars; active.

### `react-native-splash-screen` (crazycodeboy) — **deprecated**

- 0 weekly downloads, ~5.6 k legacy stars, no Android 12 support. Do not start new projects with this.

### Hosted / Web tools

- **`appicon.co`**, **`makeappicon.com`**, **`icon.kitchen`** — mostly icon-focused; splash is an afterthought and usually produces the legacy bitmap splash shape. Fine for one-off exports, bad for CI.
- **Progressier**, **Imagcon**, **PWA Builder splash tab** — hosted generators that emit the iOS `apple-touch-startup-image` matrix from a single upload. Convenient for prototypes; ties your asset pipeline to an external service.

### Comparison matrix

| Tool | Platforms | Dark mode | Source | Output | CI-friendly | Status (2026) |
|---|---|---|---|---|---|---|
| pwa-asset-generator (elegantapp) | PWA + iOS startup + mstile + favicons | Manual two-pass | SVG/PNG/HTML | HTML + manifest + PNGs | Yes (Puppeteer) | v8.1.4, active |
| Vite PWA Assets Generator | PWA (Android-first) | Partial | SVG/PNG | Icons + minimal splash | Yes (Sharp) | Active |
| `@capacitor/assets` | iOS + Android (Capacitor) | First-class | PNG (+ dark PNG) | Native project assets | Yes | Active |
| `expo-splash-screen` | iOS + Android (Expo) | First-class | PNG per variant | Native via prebuild | Yes | Active |
| `react-native-bootsplash` | iOS + Android (bare RN) | First-class | PNG | Native project assets | Yes | Active |
| `react-native-splash-screen` | iOS + Android | No | PNG | Legacy | No | Deprecated |

## Input Requirements for AI-Gen

When a prompt-enhancement skill targets "generate a splash", the generator it ultimately hands the pixels to dictates what the image model must produce. From the tools above, three invariants hold:

1. **Square canvas ≥ 2732 × 2732 px.** `@capacitor/assets` requires exactly this; pwa-asset-generator and bootsplash happily upscale-down from 3000+. Non-square sources force every downstream tool to crop or pad unpredictably.
2. **Centered brand mark inside a disc ≤ 66% of canvas.** This satisfies Android 12's 192 dp circular mask (288 dp canvas × 192/288 ≈ 0.67) and keeps the PWA auto-splash from clipping. The mark should have its own transparent padding built in.
3. **Transparent background preferred; solid matte acceptable for iOS storyboards.** Transparent PNG lets the downstream tool recolor per theme. If transparency support is unreliable from the model (a common Gemini/Imagen failure with "checker-box" artifacts — see 13-transparent-backgrounds), fall back to matching the intended `backgroundColor` exactly in opaque RGB and feed that same color into the generator's `--background` / `splashBackgroundColor` flag.

**Prompt template (light variant):**

> A minimalist centered app splash icon for `{APP_NAME}`. Single `{BRAND_MARK}` — no text, no tagline, no decorative border. Flat vector style, high contrast against a solid `{LIGHT_BG_HEX}` background. Mark occupies ~45% of the frame, perfectly centered, with generous equal padding on all four sides. Output: 2732 × 2732 px square, PNG with transparent background, no gradient, no shadow unless the brand specifies one, no textured background. No checker pattern, no watermark, no UI chrome.

**Prompt template (dark variant):** identical except the brand mark is adjusted for contrast on `{DARK_BG_HEX}` (typically either an inverted fill or a knock-out outline), with background requested as either transparent or solid `{DARK_BG_HEX}`.

**Anti-prompts (negative):** `text, words, tagline, typography, letters, logo wordmark, multiple icons, collage, photograph, 3D render, drop shadow, outer glow, gradient mesh, checker background, transparency artifact, watermark, border, frame, grid, mockup, device mockup, phone frame, UI chrome, status bar`.

**Size math for each downstream target:**

| Target | Source canvas | Visible "safe" radius |
|---|---|---|
| Android 12+ (no bg) | 2732² | disc of 2732 × (192/288) ÷ 2 ≈ 911 px radius |
| Android 12+ (with bg) | 2732² | disc of 2732 × (160/240) ÷ 2 ≈ 910 px radius |
| iOS storyboard / UILaunchScreen | 2732² | ~45% frame fill — not masked, but must match first-screen layout |
| PWA Chrome Android auto | 512² icon (pulled from manifest) | same circle-safe area |
| PWA iOS startup image | 2732² downsampled per device | full frame; center-safe recommended |

The same source therefore feeds every downstream generator *if* it respects the strictest constraint (Android 12's circle mask). Prompting for this directly — "fits inside a centered circle 66% of the canvas width" — eliminates the majority of cropping failures.

## Dark/Light Variant Strategy

Three practical patterns for shipping both themes without drowning in assets.

**1. Dual-source, tool-generated fan-out (recommended).** Generate one light source (`splash-light.png`) and one dark source (`splash-dark.png`) at 2732². Feed both into `@capacitor/assets` or bootsplash; they emit paired Android `drawable` / `drawable-night` and iOS asset-catalog Light/Dark entries. For PWA, run pwa-asset-generator twice with different `--background` and splice the two `<link>` matrices — the dark-matrix entries get `(prefers-color-scheme: dark)` appended to their media queries. This is the clean path and is what most 2025+ Ionic, Capacitor, Expo, and bare RN teams ship.

**2. Color-only dark variant.** If the brand mark is a single neutral color (pure white or pure black), a single source works: ship `splash.png` with a transparent background, and let the theme supply the color. Android 12 `windowSplashScreenBackground` plus a tinted `windowSplashScreenAnimatedIcon` handles this natively; iOS `UILaunchScreen` handles it via an asset-catalog "Any, Dark" color. PWA Chrome Android picks up `background_color` automatically; PWA iOS still needs the matrix but can reuse one source with two background fills. Fastest to ship, most brand-constrained.

**3. No dark variant (single-tone compromise).** Pick a splash that reads acceptably on both backgrounds — typically a mid-tone color or a two-tone mark. Ship one matrix, skip the duplication. Acceptable for early-stage apps and PWA-only projects; frowned on for flagship native apps because the first impression clashes with the user's system theme.

**Testing matrix** every splash pipeline should run: (a) Android 12 cold start with system night mode on and off, on at least one non-Pixel device (MIUI or Samsung OneUI) where the night-qualifier bug has historically surfaced; (b) iOS 17+ with `Settings > Display > Dark` toggled, verifying both storyboard and `UILaunchScreen` paths; (c) iOS Safari "Add to Home Screen" launch with and without dark mode enabled, for each splash PNG in the matrix; (d) Chrome Android install from `manifest.webmanifest` with both light and dark system themes.

## References

- **Android SplashScreen API** — [`developer.android.com/develop/ui/views/launch/splash-screen`](https://developer.android.com/develop/ui/views/launch/splash-screen)
- **AndroidX core-splashscreen reference** — [`developer.android.com/reference/androidx/core/splashscreen/SplashScreen`](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen)
- **Apple "Responding to the launch of your app"** — [`developer.apple.com/documentation/uikit/responding-to-the-launch-of-your-app`](https://developer.apple.com/documentation/uikit/responding-to-the-launch-of-your-app)
- **"Dropping launch storyboards" (useyourloaf, 2024)** — [`useyourloaf.com/blog/dropping-launch-storyboards/`](https://useyourloaf.com/blog/dropping-launch-storyboards/)
- **Lighthouse — custom splash configuration** — [`developer.chrome.com/docs/lighthouse/pwa/splash-screen`](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen)
- **pwa-asset-generator (elegantapp) repo + README** — [`github.com/elegantapp/pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator/)
- **pwa-asset-generator releases (v8.x)** — [`github.com/elegantapp/pwa-asset-generator/releases`](https://github.com/elegantapp/pwa-asset-generator/releases)
- **Vite PWA Assets Generator CLI** — [`vite-pwa-org.netlify.app/assets-generator/cli.html`](https://vite-pwa-org.netlify.app/assets-generator/cli.html)
- **`@capacitor/assets` npm** — [`npmjs.com/package/@capacitor/assets`](https://www.npmjs.com/package/@capacitor/assets)
- **`@capacitor/assets` repo** — [`github.com/ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets)
- **Capacitor Splash Screens & Icons guide** — [`capacitorjs.com/docs/guides/splash-screens-and-icons`](https://capacitorjs.com/docs/guides/splash-screens-and-icons)
- **Expo — Splash screen and app icon** — [`docs.expo.dev/develop/user-interface/splash-screen-and-app-icon`](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon)
- **`expo-splash-screen` npm** — [`npmjs.com/package/expo-splash-screen`](https://www.npmjs.com/package/expo-splash-screen)
- **Expo dark-mode splash bug (SDK 52)** — [`github.com/expo/expo/issues/32860`](https://github.com/expo/expo/issues/32860)
- **`react-native-bootsplash` repo** — [`github.com/zoontek/react-native-bootsplash`](https://github.com/zoontek/react-native-bootsplash)
- **RN splash libraries comparison** — [`blog.logrocket.com/best-react-native-splash-screen-libraries`](https://blog.logrocket.com/best-react-native-splash-screen-libraries)
- **PWA & TWA splash sizing (Imagcon, 2025)** — [`imagcon.app/pwa-size-requirements/`](https://imagcon.app/pwa-size-requirements/)
- **Android 12 dark-mode splash bug thread** — [`stackoverflow.com/questions/74655886`](https://stackoverflow.com/questions/74655886/android-12-splash-screen-background-color-is-ignored-in-dark-mode)
