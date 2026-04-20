---
category: 09-app-icon-generation
angle: 9d
title: "Icon-generation tool landscape — SaaS, CLIs, and embeddable libraries for iOS/Android/web/desktop packs"
subagent: 9d
date: 2026-04-19
status: draft
primary_sources:
  - https://github.com/elegantapp/pwa-asset-generator
  - https://github.com/ionic-team/capacitor-assets
  - https://pub.dev/packages/flutter_launcher_icons
  - https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
  - https://tauri.app/reference/cli/
  - https://github.com/lovell/sharp
  - https://github.com/libvips/pyvips
  - https://developer.android.com/studio/write/create-app-icons
  - https://developer.apple.com/documentation/xcode/configuring-your-app-icon
  - https://icon.kitchen/
  - https://www.appicon.co/
  - https://makeappicon.com/
tags: [app-icons, splash-screens, capacitor, expo, flutter, tauri, pwa, sharp, libvips, imagemagick, pillow]
---

## Executive Summary

Turning a single high-resolution artwork into the dozens of platform-specific icon and splash-screen files that iOS, iPadOS, Android (including adaptive and monochrome), watchOS, macOS, Windows, PWAs and browser favicons demand is a **solved problem** — but it is solved across three very different tiers of tooling, each with different fitness for embedding inside an agentic prompt-enhancement pipeline:

1. **SaaS web generators** (`appicon.co`, `makeappicon.com`, `icon.kitchen`, `appiconmaker.co`, `appiconkitchen.com`). Zero-install, UI-first, good for humans but almost all are closed-source with no public HTTP API. They are useful as *reference implementations* for what a full output pack must contain, but they cannot be called from an agent.
2. **Open-source platform CLIs** that ship with the frameworks developers already use — `@capacitor/assets` (Ionic), `flutter_launcher_icons` (Dart/pub.dev), `npx expo prebuild` + `expo-splash-screen` (Expo/React Native), and `tauri icon` (Tauri). Each is MIT or Apache licensed and designed to be invoked programmatically from the terminal. These are the **right primitives to wrap** when a user's project is in that ecosystem.
3. **Low-level image libraries** that the CLIs above are built on — `sharp`/`libvips` (Node), `pyvips`/`Pillow` (Python), `@napi-rs/image`, `jimp`, and `ImageMagick`. These are what we reach for when we need to *implement* a cross-framework icon pipeline ourselves rather than delegate to a project-specific CLI.

For an embedded prompt-to-asset pipeline the recommended architecture is: (a) generate a single 1024×1024 (or 1240×1240) RGBA master, (b) dispatch to the *matching* project-specific CLI when one is detected (Capacitor, Expo, Flutter, Tauri), and (c) fall back to a `sharp`/`pyvips`-based in-house generator that mirrors the output contract of `icon.kitchen`/`@capacitor/assets` for plain-web and unknown projects. None of the big SaaS generators are viable to integrate directly.

## Tool Comparison Matrix

| Tool | Type | License | Popularity | Source of truth | Key features | Programmable? |
|---|---|---|---|---|---|---|
| **appicon.co** | SaaS (browser-side) | Proprietary, ToS-restricted | Heavy third-party usage; no public stars | [appicon.co](https://www.appicon.co/) | Drop a 1024×1024, get iOS `Contents.json` + Android mipmap densities as a zip. Runs entirely in browser. | No public API, no repo |
| **makeappicon.com** | SaaS | Proprietary | Legacy tool | [makeappicon.com](https://makeappicon.com/) | iOS/Android pack generation, emails zip. | No API |
| **appiconmaker.co** | SaaS | Proprietary, ToS | Active | [appiconmaker.co](https://appiconmaker.co/) | Free web UI, iOS/Android/PWA. Adds watermark on free tier. | No API |
| **icon.kitchen** (Roman Nurik) | SaaS (static web app) | Proprietary (source not published); succeeded Apache-2.0 [romannurik/AndroidAssetStudio](https://github.com/romannurik/AndroidAssetStudio) (6.5k★, archived) | Widely used in Android community | [icon.kitchen](https://icon.kitchen/) | Designs *and* exports: adaptive Android icons, iOS, web/favicon, macOS. Clipart, text, textures, color backgrounds. | No. Android Asset Studio predecessor is OSS but archived |
| **Android Studio → Image Asset Studio** | IDE tool (part of Android Studio) | Apache-2.0 (bundled) | Default for Android devs | [developer.android.com](https://developer.android.com/studio/write/create-app-icons) | Generates adaptive (foreground+background layers), legacy, round, Play-Store 512×512 via GUI. Writes to `res/mipmap-*`. | Only via full Android Studio; no headless CLI |
| **@capacitor/assets** (ionic-team) | CLI (Node/TS) | MIT | ~578★, [ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) | npm [`@capacitor/assets`](https://www.npmjs.com/package/@capacitor/assets) | One source → iOS `.xcassets`, Android `ic_launcher*` (+adaptive), PWA `manifest.json` icons, dark/light splash; SVG input supported | **Yes** — `npx @capacitor/assets generate --ios --android --pwa …` |
| **pwa-asset-generator** (elegantapp, formerly onderceylan) | CLI (Node, Puppeteer) | MIT | **~3.0k★**, [elegantapp/pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator); latest v8.1.x (2025–26) | npm `pwa-asset-generator` | Generates PWA icons, Apple launch-image splash screens, favicons, mstile, and patches `manifest.json`/`index.html`. Uses a headless Chromium to render HTML/SVG inputs pixel-perfectly. | **Yes** — CLI & JS API. Requires Chromium. Note: the user's brief said `ivpusic/pwa-asset-generator`; the canonical repo is **elegantapp/pwa-asset-generator** (originally `onderceylan/`). `ivpusic` is the author of unrelated `docker-volume-backup`. |
| **vite-pwa/assets-generator** | CLI + Vite plugin | MIT | ~155★, [vite-pwa/assets-generator](https://github.com/vite-pwa/assets-generator) | | Sharp-based, zero-config, typed, presets (`minimal`, `minimal-2023`, `android`, `ios`). Replaces Puppeteer dependency of older gen. | **Yes** — CLI & node API, pairs with `vite-plugin-pwa` |
| **flutter_launcher_icons** | CLI (Dart) | MIT | Official [pub.dev](https://pub.dev/packages/flutter_launcher_icons), v0.14.4 (Jun 2025) | | Android (adaptive + monochrome for Material You), iOS (incl. iOS 18 tinted/dark), web, Windows, macOS. Configured via `pubspec.yaml` or `flutter_launcher_icons.yaml`. | **Yes** — `dart run flutter_launcher_icons` |
| **Expo: `expo-splash-screen` + `app.json` icon** | Config plugin | MIT | First-party Expo | [docs.expo.dev](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/) | Source a 1024×1024 PNG; `npx expo prebuild --clean` materialises native iOS/Android assets. Dark-mode variant, `imageWidth`, per-platform overrides. | **Yes** — config + `expo prebuild` CLI |
| **Tauri `tauri icon`** | CLI (Rust, bundled in `@tauri-apps/cli`) | Apache-2.0 / MIT | First-party; origin `tauri-apps/tauricon` folded into core in PR [#4992](https://github.com/tauri-apps/tauri/pull/4992) | [tauri.app](https://tauri.app/reference/cli/) | One 1024×1024/1240×1240 PNG → `src-tauri/icons/{32,128,128@2x,icon.icns,icon.ico,Square*…}`. | **Yes** — `cargo tauri icon ./source.png` or `npx @tauri-apps/cli icon` |
| **sharp** | Library (Node, C++ libvips wrapper) | Apache-2.0 | **32k★**, [lovell/sharp](https://github.com/lovell/sharp); ~32M weekly npm downloads | | Resize, crop, composite, AVIF/WebP/PNG/JPEG, pipeline API, streaming. 4–5× faster than ImageMagick. Default for Next.js, Gatsby, Capacitor Assets, Vite PWA. | **Yes** — programmatic, ideal for an in-house pipeline |
| **libvips / pyvips** | Library (C + Python bindings) | LGPL-2.1 (libvips), MIT (pyvips) | [libvips/pyvips](https://github.com/libvips/pyvips) | | Streaming image processing, ~3× faster and ~5× less RAM than ImageMagick, 300+ ops exposed via CFFI. | **Yes** — great Python alternative to sharp |
| **Pillow (PIL fork)** | Library (Python) | HPND/MIT-like | De-facto Python standard | [pillow.readthedocs.io](https://pillow.readthedocs.io/) | `resize()` with `Image.Resampling.LANCZOS`, compositing, RGBA, ICO/ICNS writers. Slower than libvips but dependency-light. | **Yes** |
| **Jimp** | Library (pure JS) | MIT | ~14.6k★, v1.6.0 (Sep 2024), [jimp-dev/jimp](https://github.com/jimp-dev/jimp) | | PNG/JPEG/BMP/GIF/TIFF, pluggable, **zero native deps** — runs in browsers & edge runtimes (Cloudflare Workers). Slower than sharp. | **Yes** |
| **@napi-rs/image** | Library (Node, Rust/napi-rs) | MIT | [image.napi.rs](https://image.napi.rs/) | | Transformer API, AVIF/WebP/PNG/JPEG/ICO, PNG quantization, SVG rasterization. Beats sharp on AVIF/WebP throughput in published benchmarks. | **Yes** |
| **ImageMagick / GraphicsMagick** | CLI + libs | ImageMagick License / Apache-2.0 | Ubiquitous | [imagemagick.org](https://imagemagick.org/) | `convert`, `magick`, enormous format coverage (PSD, RAW). Slowest of the three (≈7–8× slower than libvips on large TIFFs), highest RAM. | **Yes** — scripting-friendly CLI |

All star counts reflect what was publicly visible in late-2025/early-2026; treat them as order-of-magnitude indicators.

## What each tool actually outputs

**iOS (via Xcode asset catalogs).** Apple's [official docs](https://developer.apple.com/documentation/xcode/configuring-your-app-icon) say that modern Xcode 14+ accepts a **single 1024×1024 opaque PNG** (no transparency, no rounded corners, sRGB or P3) and generates every iPhone/iPad size. iOS 18 adds Light/Dark/Tinted variants. So any tool that writes a `*.xcassets/AppIcon.appiconset/Contents.json` with either single-size or the legacy 11-size matrix is correct. `@capacitor/assets`, `flutter_launcher_icons`, and Expo's prebuild all take this modern single-size path.

**Android adaptive icons.** Require *two* layers (foreground + background) at 108×108dp (432×432px at `xxxhdpi`) with an 18dp safe zone, rendered into `mipmap-*/ic_launcher.xml` adaptive drawables plus legacy PNG fallbacks and the 512×512 Play Store icon. Icon.kitchen, Android Studio Image Asset Studio, `@capacitor/assets` (when given `icon-foreground.png` + `icon-background.png`), and `flutter_launcher_icons` (with `adaptive_icon_foreground:` / `adaptive_icon_background:` / `adaptive_icon_monochrome:` keys) all produce proper adaptive sets. Single-image inputs to these tools quietly letterbox the art onto a flat background, which is *usually wrong* for modern Android.

**PWA / web.** The baseline is `manifest.json` icons at 192×192 and 512×512 (one `purpose: "any"`, one `purpose: "maskable"` with ~10% safe padding), plus favicons (16/32/48 ICO + SVG), `apple-touch-icon-180x180.png`, and `mstile-150x150.png`. `pwa-asset-generator` and `vite-pwa/assets-generator` both emit this full set and patch `manifest.json`/`index.html` inline. `@capacitor/assets` handles PWA when `--pwa` is passed.

**Desktop (Tauri, Electron, macOS).** Tauri writes `.icns` (macOS), `.ico` (Windows), and a full PNG ladder from a single source. Electron typically uses `electron-icon-builder` or `icon-gen` (both sharp-based) to do the same.

**Splash screens.** Expo's `expo-splash-screen` plugin derives splashes from the icon source + a background color. `@capacitor/assets` requires a `splash.png` at least 2732×2732 and produces all iOS storyboard and Android `drawable-*` variants. `pwa-asset-generator` renders 35+ Apple launch images (one per device resolution/orientation) by screenshotting a headless-Chrome page.

## SaaS vs open-source, at a glance

**Open-source, embeddable today:** `@capacitor/assets`, `pwa-asset-generator`, `vite-pwa/assets-generator`, `flutter_launcher_icons`, `tauri icon`, Expo `prebuild`, `sharp`, `libvips`/`pyvips`, `Pillow`, `Jimp`, `@napi-rs/image`, `ImageMagick`, `Android Asset Studio` (archived).

**SaaS with no embedding path:** `appicon.co`, `makeappicon.com`, `appiconmaker.co`, `icon.kitchen`, `appiconkitchen.com`, `iconikai.com`. None of these publish a documented public HTTP API; `icon.kitchen` does everything client-side (the entire zip is built in the browser) but does not publish source. Scraping or hidden endpoints would violate their ToS and be brittle — we should treat them as prior art, not dependencies.

**Mixed:** `Android Studio Image Asset Studio` is FOSS in the sense that Android Studio is, but there is no headless entrypoint — to embed its output we would need to re-implement its adaptive-icon and squircle logic, which is exactly what `@capacitor/assets` and `flutter_launcher_icons` already do.

## Open-Source Candidates to Embed

If the prompt-to-asset's pipeline needs to *ship* a production icon pack rather than hand a zip to a human, this is the shortlist, ranked by fit:

1. **`sharp`** — the single most valuable dependency. MIT-adjacent Apache-2.0, blessed by Next.js/Gatsby/Capacitor Assets, fastest in class for PNG/WebP/AVIF, exposes a clean chainable API. Anything the hosted SaaS tools do with resize-and-composite is a ~30-line sharp script. Its only real downside — native binaries per OS/arch — is already solved by its prebuilt binaries. (Rust alternative: `@napi-rs/image`. Python equivalent: `pyvips` first, `Pillow` as a dependency-light fallback.)

2. **`@capacitor/assets`** — best off-the-shelf CLI for "one source → iOS + Android + PWA" with dark-mode and adaptive-icon support, MIT, shell-invocable. We can call it from a worker and read the generated files back out. It accepts SVG, which pairs well with vector outputs from Recraft/Illustrator/Figma and with our own SVG prompt-enhancement path.

3. **`pwa-asset-generator` (elegantapp)** — best off-the-shelf for web/PWA, including Apple launch images. The Puppeteer dependency makes it heavier than `vite-pwa/assets-generator`, but it outputs strictly more (mstile, full Apple launch-image matrix, manifest+HTML patching).

4. **`vite-pwa/assets-generator`** — lighter, sharp-based alternative when Puppeteer is undesirable (serverless, containers without Chromium). Zero-config presets cover 95% of PWA needs.

5. **`flutter_launcher_icons`** and **`tauri icon`** — invoke when the detected project is Flutter or Tauri respectively. Both are first-party, supported, and do things no generic tool does (Flutter's iOS 18 tinted variant; Tauri's `.icns`+`.ico`+PNG-ladder bundle).

6. **`Jimp` / `@napi-rs/image`** — fallback libraries when `sharp`'s native binary cannot be installed (Cloudflare Workers, Deno Deploy, ARM/musl edge cases). Jimp is pure JS; `@napi-rs/image` ships single-file Rust-built addons.

7. **Legacy but useful:** `ImageMagick`/`GraphicsMagick` for format conversions libvips doesn't cover (PSD import, animated GIF edits). Keep out of the hot path because of performance.

## Recommended Architecture for an Embedded Pipeline

```
                ┌────────────────────────────────────────────┐
                │         Prompt-Enhancer (LLM layer)        │
                │  - decides target platforms from intent    │
                │  - generates/obtains 1 RGBA master (≥1024) │
                └──────────────────┬─────────────────────────┘
                                   │  master.png (+ optional
                                   │   foreground.svg/background)
                                   ▼
                ┌────────────────────────────────────────────┐
                │              Icon Orchestrator             │
                │  project-detect → adapter select → exec    │
                └─┬──────────┬────────────┬────────────┬─────┘
                  │          │            │            │
         ┌────────▼───┐ ┌────▼────────┐ ┌─▼─────────┐ ┌▼────────────┐
         │ Capacitor  │ │ Expo/RN     │ │ Flutter   │ │ Tauri       │
         │ adapter    │ │ adapter     │ │ adapter   │ │ adapter     │
         │ `npx       │ │ write app.  │ │ `dart run │ │ `cargo      │
         │  @cap…`    │ │ json →      │ │  flutter_ │ │  tauri      │
         │            │ │ `expo       │ │  launcher_│ │  icon`      │
         │            │ │  prebuild`  │ │  icons`   │ │             │
         └────────────┘ └─────────────┘ └───────────┘ └─────────────┘
                                   │
                                   ▼  (no matching framework)
                ┌────────────────────────────────────────────┐
                │        Generic pipeline (sharp-based)      │
                │   - iOS xcassets writer (1024 opaque PNG)  │
                │   - Android adaptive: fg+bg @ 432 px       │
                │   - PWA: maskable + any @192/512, favicons │
                │   - Windows .ico, macOS .icns              │
                │   - Splash compositor (color+logoScale)    │
                └────────────────────────────────────────────┘
```

### Concrete decisions

- **Master format.** Always a 1024×1024 RGBA PNG for the raster path, with an optional 2× (2048 px) for crisper downscaling. For vector assets (Recraft/Illustrator SVG), keep the SVG and rasterize on demand — sharp, `@napi-rs/image`, and `resvg` all do this.
- **Safe-zone enforcement.** Before handing off to any adapter, run a compositor step that (a) inscribes the master in a 66% safe circle for Android adaptive (18dp of padding on a 108dp canvas) and (b) applies no corner-rounding for iOS (iOS applies the squircle system mask itself). iconikai and iconbundlr docs both reiterate this — it is the #1 thing SaaS tools silently get wrong.
- **Adapter preference order.** If `package.json` contains `@capacitor/core` → Capacitor adapter. If `app.json`/`app.config.ts` with `"expo"` → Expo adapter. If `pubspec.yaml` → Flutter adapter. If `src-tauri/tauri.conf.json` → Tauri adapter. Otherwise → Generic.
- **Generic pipeline = sharp (Node runtime) or pyvips (Python runtime).** One implementation per runtime, both writing the same manifest (`iconset.json` describing every emitted file), so downstream agents can reason about outputs symbolically. pyvips is the better Python choice over Pillow for >1 MP sources; Pillow remains the safe fallback.
- **Distribution.** Ship the orchestrator as (i) a CLI (`prompt-to-asset icons ./master.png --project .`) and (ii) an MCP tool (`generate_app_icons`) so Claude/Gemini/Codex skills can call it. The MCP tool's schema should mirror `@capacitor/assets` flags (`ios`, `android`, `pwa`, `splash`, background colors) — that is already a well-understood contract for users who have seen Capacitor.
- **Never call SaaS generators.** They have no API, no SLA, and would leak source assets. Use them only as UX references.
- **Dark/tinted/monochrome.** Accept an optional `master-dark.png` and an optional `master-mono.svg`; propagate to Capacitor (`logo-dark.png`), Flutter (`adaptive_icon_monochrome`, `ios: true` + `remove_alpha_ios: true` for App Store), and Expo (`"dark": { "image": … }` plugin block).
- **Splash screens.** Treat them as a derived asset: `composite(background_color, logo, scale=logoScale)`. For Capacitor, defer to `@capacitor/assets`'s `--splashBackgroundColor`; for Expo, defer to the `expo-splash-screen` plugin; for Tauri/Electron, composite via sharp and write once.
- **Validation.** After generation, run a `sharp.metadata()` pass across all outputs and assert (size, channels, hasAlpha) against the expected contract. For iOS specifically, assert `hasAlpha === false` on the App Store 1024 — Apple rejects transparent submission icons, and many SaaS tools quietly pass transparency through.
- **Caching.** Hash the master + flags → content-addressed output directory. Re-running with an identical master is a no-op.
- **Licensing review.** All embeddable pieces above are MIT/Apache-2.0/LGPL-2.1 except `Pillow` (HPND, permissive) and `libvips` (LGPL-2.1 — fine for dynamic linking, needs attention if statically linked). No copyleft surprises in the recommended stack.

### Skeleton of the sharp-based generic fallback

```ts
import sharp from "sharp";

const IOS_MASTER = 1024;            // opaque, no alpha
const ANDROID_ADAPTIVE = 432;       // 108dp @ xxxhdpi
const SAFE_ZONE_RATIO = 0.66;       // center 66% visible after mask

export async function generate(master: Buffer, outDir: string) {
  const base = sharp(master).removeAlpha().resize(IOS_MASTER);
  await base.clone().toFile(`${outDir}/ios/AppIcon-1024.png`);

  const fg = sharp(master).resize(ANDROID_ADAPTIVE);
  const padded = await sharp({
    create: { width: ANDROID_ADAPTIVE, height: ANDROID_ADAPTIVE,
              channels: 4, background: "#00000000" },
  }).composite([{
    input: await fg.resize(Math.round(ANDROID_ADAPTIVE * SAFE_ZONE_RATIO)).toBuffer(),
    gravity: "center",
  }]).png().toBuffer();
  await sharp(padded).toFile(`${outDir}/android/ic_launcher_foreground.png`);

  for (const size of [192, 512]) {
    await sharp(master).resize(size).png().toFile(`${outDir}/web/icon-${size}.png`);
    await sharp(master).resize(Math.round(size * 0.8))
      .extend({ top: Math.round(size*0.1), bottom: Math.round(size*0.1),
                left: Math.round(size*0.1), right: Math.round(size*0.1),
                background: "#00000000" })
      .png().toFile(`${outDir}/web/icon-maskable-${size}.png`);
  }
}
```

This ~30 lines is structurally everything any SaaS generator does for the raster portion of an icon pack; the rest is `Contents.json`/`manifest.json` text templating and platform-specific file-layout.

## References

### SaaS generators
- [appicon.co](https://www.appicon.co/) — browser-side iOS/Android generator, no public source.
- [makeappicon.com](https://makeappicon.com/) — legacy SaaS.
- [appiconmaker.co](https://appiconmaker.co/) — free web tool, [ToS](https://appiconmaker.co/terms-of-service).
- [appiconkitchen.com](https://www.appiconkitchen.com/) — AI-assisted iOS/Android.
- [icon.kitchen](https://icon.kitchen/) — Roman Nurik's successor to Android Asset Studio.
- [appiconly.com 2025 comparison](https://www.appiconly.com/blogs/icon-generator-tools-2025-comparison) — third-party survey.

### Platform CLIs & configs
- [`@capacitor/assets` on npm](https://www.npmjs.com/package/@capacitor/assets) and [ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) (MIT, ~578★).
- [Capacitor docs — Splash Screens and Icons](https://capacitorjs.com/docs/guides/splash-screens-and-icons).
- [`pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator) (MIT, ~3.0k★) + [releases](https://github.com/elegantapp/pwa-asset-generator/releases).
- [`vite-pwa/assets-generator`](https://github.com/vite-pwa/assets-generator) (MIT, ~155★).
- [`flutter_launcher_icons` on pub.dev](https://pub.dev/packages/flutter_launcher_icons) (MIT, v0.14.4 Jun 2025).
- [Expo — Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).
- [Expo — `app.json` config](https://docs.expo.dev/workflow/configuration/).
- [Tauri CLI reference](https://tauri.app/reference/cli/) and the icon-command merge PR [#4992](https://github.com/tauri-apps/tauri/pull/4992).
- [tauri-apps/tauricon](https://github.com/tauri-apps/tauricon) — original tauricon before it was folded into Tauri CLI.
- [romannurik/AndroidAssetStudio](https://github.com/romannurik/AndroidAssetStudio) — Apache-2.0, archived, 6.5k★.
- [Android developers — Create app icons (Image Asset Studio)](https://developer.android.com/studio/write/create-app-icons).
- [Apple — Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon).

### Image libraries
- [`sharp` on npm](https://www.npmjs.com/package/sharp) and [lovell/sharp](https://github.com/lovell/sharp) (Apache-2.0, 32k★, ~32M weekly downloads).
- [libvips speed & memory wiki](https://github.com/libvips/libvips/wiki/Speed-and-memory-use).
- [libvips/pyvips](https://github.com/libvips/pyvips) (MIT bindings over LGPL-2.1 libvips).
- [`@napi-rs/image`](https://image.napi.rs/) and [Brooooooklyn/Image](https://github.com/Brooooooklyn/Image).
- [`jimp` on npm](https://www.npmjs.com/package/jimp) / [jimp-dev/jimp](https://github.com/jimp-dev/jimp) (MIT, ~14.6k★).
- [Pillow docs](https://pillow.readthedocs.io/).
- [ImageMagick](https://imagemagick.org/).

### Third-party benchmarks & guides
- PkgPulse, *[Sharp vs Jimp 2026](https://www.pkgpulse.com/blog/sharp-vs-jimp-2026)*.
- MacWww, *[Sharp vs libvips vs ImageMagick 2026](https://macwww.com/en/blog/articles/2026-remote-mac-sharp-libvips-imagemagick-ssg-concurrency-memory-matrix.html)*.
- IconBundlr, *[iOS App Icon Sizes in 2026](https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide)*.
- IconikAI, *[iOS App Icon Sizes 2026](https://www.iconikai.com/blog/ios-app-icon-size-guidelines-guide)*.

### Correction note
The assignment brief referred to `github.com/ivpusic/pwa-asset-generator`; the canonical repository is **`elegantapp/pwa-asset-generator`** (originally `onderceylan/pwa-asset-generator`). `ivpusic` does not maintain a PWA asset generator. This survey uses the correct upstream.
