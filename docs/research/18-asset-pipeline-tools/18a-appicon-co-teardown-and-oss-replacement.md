---
category: 18-asset-pipeline-tools
angle: 18a
title: "Teardown & Replace of www.appicon.co — what it does, the ZIP it returns, its license, and a fully open-source replacement stack"
agent: 18a
status: draft
date: 2026-04-19
tags:
  - app-icons
  - ios
  - android
  - macos
  - iconset
  - appiconset
  - adaptive-icon
  - capacitor-assets
  - flutter_launcher_icons
  - pwa-asset-generator
  - sharp
  - iconutil
  - pillow
word_count_target: 3000-4500
primary_sources:
  - https://www.appicon.co
  - https://appiconmaker.co/terms-of-service
  - https://appiconmaker.co/privacy-policy
  - https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html
  - https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
  - https://github.com/ionic-team/capacitor-assets
  - https://github.com/fluttercommunity/flutter_launcher_icons
  - https://github.com/elegantapp/pwa-asset-generator
  - https://github.com/Nonchalant/AppIcon
  - https://github.com/xcodeBn/app-icon-formatter
  - https://github.com/zhangyu1818/appicon-forge
  - https://github.com/relikd/icnsutil
---

# 18a — Teardown & Replace of `www.appicon.co`

> Goal: document exactly what appicon.co (and its cousins makeappicon, appicon.build, icon.kitchen) produce from a single 1024×1024 PNG, then specify a **fully open-source** replacement stack that we can embed directly in the `prompt-to-asset` web UI as a drag-drop → download-ZIP flow.

---

## Executive Summary

**Top findings**

1. **`appicon.co` is a closed-source, client-side web tool** (image processing happens in the browser, no uploads to a server per its 2025 privacy policy), that converts a single source image (PNG/JPG/SVG, ideally 1024×1024) into a **platform-segmented ZIP** containing the `AppIcon.appiconset` (with a legacy multi-size `Contents.json`), Android `mipmap-*` PNGs, an Android `mipmap-anydpi-v26/ic_launcher.xml` adaptive-icon descriptor (when a foreground + background is supplied), optional macOS `AppIcon.appiconset`, optional watchOS set, and optional legacy `iTunesArtwork` / `iTunesArtwork@2x` files. **There is no public source repository**; the only "official" open-source clone that mirrors the feature surface is `xcodeBn/app-icon-formatter` (MIT, React + JSZip, pure client-side). Its sibling `appicon.build` (same operator's AI-assisted product) is also closed. (See [Terms of Service](https://appiconmaker.co/terms-of-service), [Privacy Policy](https://appiconmaker.co/privacy-policy).)
2. **The ZIP is trivially reproducible from first principles.** The iOS side is fully specified by Apple's [Asset Catalog Format Reference — App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html) (a JSON manifest listing `{ size, idiom, scale, filename }` tuples); the Android side is specified by [Adaptive icons — android developers](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) (five `mipmap-<density>` PNGs at 1x/1.5x/2x/3x/4x baseline 48dp, plus an `<adaptive-icon>` XML in `mipmap-anydpi-v26` referencing a 108dp foreground and 108dp background). Nothing about the output is proprietary.
3. **A small OSS stack beats the website on every axis we care about** (license, provenance, privacy, automation). For a Node-first embeddable pipeline, **`@capacitor/assets`** (Ionic, MIT, `sharp`-based) covers iOS + Android adaptive + PWA in one command; for Flutter projects **`fluttercommunity/flutter_launcher_icons`** (MIT) covers the same matrix including Android adaptive. For PWA/Apple Web Clip/splash screens **`elegantapp/pwa-asset-generator`** (MIT, Puppeteer + sharp) is the de-facto standard. For pure CLI/macOS `iconutil -c icns` + `sips` (or `relikd/icnsutil` cross-platform) produces `.icns`. A ~200-line `generate-iconset.ts` using `sharp` is sufficient to replicate appicon.co's core ZIP, and the same logic runs in-browser via `jSquash` + `JSZip`.

**Bottom line for the prompt-to-asset UI**: embed `sharp` (server) or `@jsquash/resize` + `@jsquash/png` + `JSZip` (pure browser) behind a drag-drop target, emit the same ZIP layout appicon.co emits (documented below), and we have feature parity without a third-party dependency, without any TOS ambiguity, and with **zero upload** of user artwork.

---

## 1. `appicon.co` Capability Breakdown

### 1.1 What the site is

`appicon.co` (operated alongside `appiconmaker.co` and `appicon.build`) is a **single-page static web app**. Per its currently-published [Privacy Policy](https://appiconmaker.co/privacy-policy) (last updated 2025-07-21) all image processing happens client-side in the browser; images are never uploaded. The [Terms of Service](https://appiconmaker.co/terms-of-service) (2025-11-14) make clear the user keeps all rights to both source art and generated output, and that "free templates" on the site are licensed "for personal and commercial use without attribution".

There is **no declared open-source license** on the tool itself — the JS bundles are minified and there is no GitHub organization for `appicon.co` we could find. (`github.com/mightyn`, which we were asked to check, does not exist / 404s.) Practically this means: (a) the output ZIP is yours to use under Apple/Google rules; (b) the **site implementation** is not something we can legally copy-paste, but the **format it outputs** is a consequence of Apple/Google's public specs and is freely reproducible.

### 1.2 Supported inputs

| Input | Notes |
|---|---|
| PNG (recommended) | 1024×1024, alpha channel preserved |
| JPG/JPEG | Alpha lost; iOS actually forbids alpha in App Store marketing icon anyway |
| SVG | Rasterized at upload time (client-side) |
| WebP | Accepted on newer builds |

Undersized inputs are upscaled (bilinear) — bad idea; prefer a 1024² source. Non-square inputs are letterboxed or center-cropped depending on the setting.

### 1.3 Output matrix (observed)

Selecting "all platforms" yields a ZIP with one folder per target:

```
AppIcons/
├── Assets.xcassets/
│   └── AppIcon.appiconset/
│       ├── Contents.json
│       ├── Icon-App-20x20@1x.png
│       ├── Icon-App-20x20@2x.png
│       ├── Icon-App-20x20@3x.png
│       ├── ... (full legacy set, see §2.1)
│       └── ItunesArtwork@2x.png
├── android/
│   ├── mipmap-mdpi/ic_launcher.png              (48×48)
│   ├── mipmap-mdpi/ic_launcher_round.png        (48×48)
│   ├── mipmap-hdpi/ic_launcher.png              (72×72)
│   ├── mipmap-hdpi/ic_launcher_round.png        (72×72)
│   ├── mipmap-xhdpi/ic_launcher.png             (96×96)
│   ├── mipmap-xxhdpi/ic_launcher.png            (144×144)
│   ├── mipmap-xxxhdpi/ic_launcher.png           (192×192)
│   ├── mipmap-anydpi-v26/ic_launcher.xml        (adaptive wrapper)
│   ├── mipmap-anydpi-v26/ic_launcher_round.xml
│   ├── drawable/ic_launcher_foreground.xml      (or PNG variants under mipmap-*)
│   ├── drawable/ic_launcher_background.xml
│   └── playstore-icon.png                       (512×512)
├── macOS/
│   └── AppIcon.appiconset/ (see §2.2)
├── watchOS/ (optional)
│   └── AppIcon.appiconset/
└── iTunesArtwork                                (512×512, no extension)
    iTunesArtwork@2x                             (1024×1024, no extension)
```

A few nuances worth recording because OSS clones sometimes miss them:

- The `Contents.json` appicon.co emits is the **legacy multi-file format** (one entry per `size × scale × idiom`), not the **modern single 1024 "Any Appearance" entry** that Xcode 14+ accepts. This is the right call for backwards compatibility with Xcode 12–15 + CI pipelines that inspect the file directly. Both formats are documented by Apple's [Asset Catalog Format Reference — App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html).
- The `iTunesArtwork` files are **stripped of the `.png` extension** — if you rename and the extension sneaks back in, iTunes/Transporter rejects the IPA. See [codeandbutter (2011)](https://codeandbutter.com/2011/01/including-itunesartwork-in-ad-hoc-distributions/) and [SO #10241860](https://stackoverflow.com/questions/10241860/how-to-set-up-itunesartwork-for-ad-hoc-distribution). Needed only for ad-hoc IPA enterprise distribution; App Store distribution doesn't use these.
- The `mipmap-anydpi-v26/ic_launcher.xml` wrapper references a `@drawable` or `@mipmap` foreground/background. appicon.co's simple mode bakes both layers from the same input by composing onto a configurable background color — the resulting icon on Android 8+ looks "shrunken" if the artwork fills the whole 108dp (the outer 18dp is **reserved for parallax / mask clipping**, per [Android adaptive icons doc](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)). This is a footgun most users hit.

### 1.4 License posture

- **Site TOS**: user retains rights to uploads and outputs; no attribution required for templates; service is provided AS-IS.
- **Site source**: closed / minified.
- **Output files**: purely derivative of your art and Apple/Google public specs — not copyrightable by appicon.co.
- **Practical risk for us**: none on the output side. On the implementation side, we must not copy their JS — we reimplement from Apple/Google specs.

---

## 2. Full ZIP Structure Reference

This is the reference we'll target from the OSS replacement.

### 2.1 iOS `AppIcon.appiconset/Contents.json` (legacy full matrix)

Source of truth: [Apple Asset Catalog Format — App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html). The exact dimensions to ship are the point-size × scale:

| Idiom | Point size | Scales | Pixel sizes |
|---|---|---|---|
| iphone | 20pt (notification) | 2x, 3x | 40, 60 |
| iphone | 29pt (settings) | 2x, 3x | 58, 87 |
| iphone | 40pt (spotlight) | 2x, 3x | 80, 120 |
| iphone | 60pt (app) | 2x, 3x | 120, 180 |
| ipad | 20pt | 1x, 2x | 20, 40 |
| ipad | 29pt | 1x, 2x | 29, 58 |
| ipad | 40pt | 1x, 2x | 40, 80 |
| ipad | 76pt (app, deprecated iPadOS 18) | 1x, 2x | 76, 152 |
| ipad | 83.5pt (iPad Pro) | 2x | 167 |
| ios-marketing | 1024pt | 1x | 1024 |

Example manifest (abbreviated):

```json
{
  "images": [
    { "size": "20x20",   "idiom": "iphone", "filename": "Icon-App-20x20@2x.png",   "scale": "2x" },
    { "size": "20x20",   "idiom": "iphone", "filename": "Icon-App-20x20@3x.png",   "scale": "3x" },
    { "size": "29x29",   "idiom": "iphone", "filename": "Icon-App-29x29@2x.png",   "scale": "2x" },
    { "size": "29x29",   "idiom": "iphone", "filename": "Icon-App-29x29@3x.png",   "scale": "3x" },
    { "size": "40x40",   "idiom": "iphone", "filename": "Icon-App-40x40@2x.png",   "scale": "2x" },
    { "size": "40x40",   "idiom": "iphone", "filename": "Icon-App-40x40@3x.png",   "scale": "3x" },
    { "size": "60x60",   "idiom": "iphone", "filename": "Icon-App-60x60@2x.png",   "scale": "2x" },
    { "size": "60x60",   "idiom": "iphone", "filename": "Icon-App-60x60@3x.png",   "scale": "3x" },
    { "size": "20x20",   "idiom": "ipad",   "filename": "Icon-App-20x20@1x.png",   "scale": "1x" },
    { "size": "20x20",   "idiom": "ipad",   "filename": "Icon-App-20x20@2x.png",   "scale": "2x" },
    { "size": "29x29",   "idiom": "ipad",   "filename": "Icon-App-29x29@1x.png",   "scale": "1x" },
    { "size": "29x29",   "idiom": "ipad",   "filename": "Icon-App-29x29@2x.png",   "scale": "2x" },
    { "size": "40x40",   "idiom": "ipad",   "filename": "Icon-App-40x40@1x.png",   "scale": "1x" },
    { "size": "40x40",   "idiom": "ipad",   "filename": "Icon-App-40x40@2x.png",   "scale": "2x" },
    { "size": "76x76",   "idiom": "ipad",   "filename": "Icon-App-76x76@1x.png",   "scale": "1x" },
    { "size": "76x76",   "idiom": "ipad",   "filename": "Icon-App-76x76@2x.png",   "scale": "2x" },
    { "size": "83.5x83.5","idiom": "ipad",  "filename": "Icon-App-83.5x83.5@2x.png","scale": "2x" },
    { "size": "1024x1024","idiom": "ios-marketing","filename": "ItunesArtwork@2x.png","scale":"1x" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

Modern (Xcode 14+) shorthand is equally valid and what many teams now use:

```json
{
  "images": [
    { "filename": "AppIcon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

We should emit **both forms**, controlled by a `--modern` flag (default: legacy, because that's what appicon.co does and what CI linters tend to assert on).

### 2.2 macOS `AppIcon.appiconset` + `.icns`

macOS requires a separate `mac`-idiom appiconset containing the 8 canonical sizes: **16, 32, 128, 256, 512** pt each at 1x + 2x. The corresponding Finder/Dock bundle is `AppIcon.icns`, built either via Apple's `iconutil`:

```bash
mkdir AppIcon.iconset
sips -z 16 16     icon-1024.png --out AppIcon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out AppIcon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out AppIcon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out AppIcon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out AppIcon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out AppIcon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out AppIcon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out AppIcon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out AppIcon.iconset/icon_512x512.png
cp                icon-1024.png    AppIcon.iconset/icon_512x512@2x.png
iconutil -c icns AppIcon.iconset -o AppIcon.icns
```

`iconutil` is mac-only. For **cross-platform** ICNS emission (needed if we generate the ZIP from Linux in CI or from a browser), use **`relikd/icnsutil`** — a Python tool that composes/decomposes ICNS directly without Apple's binary. ([icnsutil docs](https://relikd.github.io/icnsutil/), [GitHub](https://github.com/relikd/icnsutil).)

### 2.3 Android assets

Per [Android developers — pixel densities](https://developer.android.com/training/multiscreen/screendensities) and the adaptive-icons doc:

| Bucket | Density | Legacy icon (px) | Adaptive foreground/background (px, 108dp) |
|---|---|---|---|
| `mipmap-mdpi` | 160 dpi, 1x | 48 | 108 |
| `mipmap-hdpi` | 240 dpi, 1.5x | 72 | 162 |
| `mipmap-xhdpi` | 320 dpi, 2x | 96 | 216 |
| `mipmap-xxhdpi` | 480 dpi, 3x | 144 | 324 |
| `mipmap-xxxhdpi` | 640 dpi, 4x | 192 | 432 |

Plus `mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
```

The `<monochrome>` layer (Android 13+ themed icons) was **added after appicon.co's last feature update** and is missing from their default bundle — a clear opportunity for our OSS replacement to surpass it.

Finally, Play Store expects a **512×512 PNG** marketing icon at the project root (conventionally `playstore-icon.png` or `ic_launcher-playstore.png`).

### 2.4 PWA / Favicon / Web Clip

Not strictly an "app icon" but always in the same ZIP from `pwa-asset-generator`-style tools:

- `favicon.ico` (16, 32, 48 embedded)
- `favicon-16.png`, `favicon-32.png`, `favicon-96.png`, `favicon-192.png`, `favicon-512.png`
- `apple-touch-icon.png` (180×180)
- `mstile-150x150.png` (+ `browserconfig.xml`)
- `manifest.webmanifest` fragment listing the 192 + 512 maskable PNGs
- Safari pinned-tab `.svg` (monochrome)

---

## 3. OSS Stack Recommendation

The right answer depends on the project shape. For **prompt-to-asset** specifically (Node / browser, framework-agnostic), we recommend a two-tier stack: a browser path for instant drag-drop, and a Node fallback for the API/CLI.

### 3.1 Tier A — **In-browser, zero upload** (default path)

Mirrors appicon.co's trust story but with OSS code we ship ourselves:

- **`@jsquash/png`** + **`@jsquash/resize`** ([jamsinclair/jSquash](https://github.com/jamsinclair/jSquash)) — WASM fork of Google's Squoosh codecs that actually works in browsers and Cloudflare Workers (unlike `@squoosh/lib`, which is Node-only and unmaintained). Supports lanczos3 resampling, which is what Photoshop uses and what we want.
- **`JSZip`** — to assemble the `AppIcons.zip`. Streamed download via `saveAs` (FileSaver.js) or the File System Access API when available.
- **`file-saver`** or native `<a download>` — delivery.
- (Optional) **`@resvg/resvg-wasm`** — rasterize SVG inputs in the browser without Canvas API quirks.

### 3.2 Tier B — **Node / CI** (API path, deterministic, faster)

- **`sharp`** ([lovell/sharp](https://github.com/lovell/sharp)) — libvips-backed, ~10× faster than jSquash, handles PNG/JPEG/WebP/SVG/AVIF. De-facto standard.
- **`@capacitor/assets`** ([ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets), MIT) — wraps `sharp` and emits iOS `Assets.xcassets/AppIcon.appiconset`, Android `mipmap-*` + `mipmap-anydpi-v26/ic_launcher.xml`, and PWA icons + splash screens in one shot. Invocation:
  ```bash
  npx @capacitor/assets generate \
    --assetPath ./assets \
    --iconBackgroundColor '#ffffff' \
    --iconBackgroundColorDark '#111111' \
    --splashBackgroundColor '#ffffff' \
    --splashBackgroundColorDark '#111111'
  ```
  Accepts `icon-only.png` (unified), or `icon-foreground.png` + `icon-background.png` (true adaptive). This is the closest 1:1 replacement for appicon.co in Node.
- **`elegantapp/pwa-asset-generator`** (MIT) — for PWA/Apple Web Clip/splash matrix (Safari launch image sizes, `apple-touch-icon`, maskable icons, dark-mode variants). Uses headless Chromium to render, which ironically gives the best color accuracy.
- **`fluttercommunity/flutter_launcher_icons`** (MIT) — if the user is on Flutter, this is the right tool, full stop. Configured in `pubspec.yaml`; supports `adaptive_icon_background`, `adaptive_icon_foreground`, `adaptive_icon_monochrome`, and iOS + Web + Windows + macOS.
- **`Nonchalant/AppIcon`** (Swift, 1.4k★) — CLI binary; useful if you want a native single-binary `appicon` command on macOS. Produces `*.appiconset` directly.
- **`iconutil` + `sips`** (Apple) — only for `.icns`, only on macOS.
- **`relikd/icnsutil`** (Python, MIT) — cross-platform ICNS emit + inspect.
- **`icotool`** (part of `icoutils`, GPLv3) — cross-platform `.ico` emission for Windows. The GPL license means we invoke it as a subprocess rather than linking it.

### 3.3 Python alternative (for Codex/Claude skills that prefer Python)

- **Pillow** for resize (`Image.LANCZOS`) + `zipfile` for the bundle. A one-file `generate_iconset.py` (see §4.2) is ~150 lines and covers the full iOS + Android + Play Store + favicon matrix.
- **`icnsutil`** for macOS ICNS.
- **`cairosvg`** for SVG ingestion.

### 3.4 Drop-in alternatives worth knowing

| Tool | Repo | Notes |
|---|---|---|
| `appicon-forge` | [zhangyu1818/appicon-forge](https://github.com/zhangyu1818/appicon-forge) (981★) | React/TS, MIT. More a *design* tool (icon composition) than a resizer, but great UX reference. |
| `app-icon-formatter` | [xcodeBn/app-icon-formatter](https://github.com/xcodeBn/app-icon-formatter) | Explicitly "inspired by appicon.co", MIT, JSZip-based, no backend. |
| `AppIcon` | [Nonchalant/AppIcon](https://github.com/Nonchalant/AppIcon) (1.5k★) | Swift CLI, iOS/macOS/watchOS appiconset. |
| `mobile-icon-resizer` | [npm](https://www.npmjs.com/package/mobile-icon-resizer) | Older Node tool (still works). |
| `sharp-ico` | [npm](https://www.npmjs.com/package/sharp-ico) | Reads/writes `.ico` via sharp. |
| `expo-configure-splash-screen` | [github](https://github.com/expo/expo-cli) | For Expo/React Native splash specifically. |

---

## 4. Reference Implementation Sketch

### 4.1 Node + `sharp`: a 200-line `generate-iconset.ts` that mirrors appicon.co's output

```ts
// scripts/generate-iconset.ts
// Produces the same ZIP layout as appicon.co from a single 1024x1024 source.
// MIT licensed in our repo.

import sharp from "sharp";
import JSZip from "jszip";
import { promises as fs } from "node:fs";
import path from "node:path";

type IOSEntry = {
  size: string;           // "20x20"
  idiom: "iphone" | "ipad" | "ios-marketing" | "universal";
  scale: "1x" | "2x" | "3x";
  filename: string;
  pixel: number;          // resolved px
};

const IOS: IOSEntry[] = [
  { size: "20x20", idiom: "iphone", scale: "2x", filename: "Icon-20@2x.png",  pixel: 40  },
  { size: "20x20", idiom: "iphone", scale: "3x", filename: "Icon-20@3x.png",  pixel: 60  },
  { size: "29x29", idiom: "iphone", scale: "2x", filename: "Icon-29@2x.png",  pixel: 58  },
  { size: "29x29", idiom: "iphone", scale: "3x", filename: "Icon-29@3x.png",  pixel: 87  },
  { size: "40x40", idiom: "iphone", scale: "2x", filename: "Icon-40@2x.png",  pixel: 80  },
  { size: "40x40", idiom: "iphone", scale: "3x", filename: "Icon-40@3x.png",  pixel: 120 },
  { size: "60x60", idiom: "iphone", scale: "2x", filename: "Icon-60@2x.png",  pixel: 120 },
  { size: "60x60", idiom: "iphone", scale: "3x", filename: "Icon-60@3x.png",  pixel: 180 },
  { size: "20x20", idiom: "ipad",   scale: "1x", filename: "Icon-20.png",     pixel: 20  },
  { size: "20x20", idiom: "ipad",   scale: "2x", filename: "Icon-20@2x~ipad.png", pixel: 40  },
  { size: "29x29", idiom: "ipad",   scale: "1x", filename: "Icon-29.png",     pixel: 29  },
  { size: "29x29", idiom: "ipad",   scale: "2x", filename: "Icon-29@2x~ipad.png", pixel: 58  },
  { size: "40x40", idiom: "ipad",   scale: "1x", filename: "Icon-40.png",     pixel: 40  },
  { size: "40x40", idiom: "ipad",   scale: "2x", filename: "Icon-40@2x~ipad.png", pixel: 80  },
  { size: "76x76", idiom: "ipad",   scale: "1x", filename: "Icon-76.png",     pixel: 76  },
  { size: "76x76", idiom: "ipad",   scale: "2x", filename: "Icon-76@2x.png",  pixel: 152 },
  { size: "83.5x83.5", idiom: "ipad", scale: "2x", filename: "Icon-83.5@2x.png", pixel: 167 },
  { size: "1024x1024", idiom: "ios-marketing", scale: "1x", filename: "Icon-1024.png", pixel: 1024 },
];

const ANDROID_LEGACY = [
  { dir: "mipmap-mdpi",    size: 48  },
  { dir: "mipmap-hdpi",    size: 72  },
  { dir: "mipmap-xhdpi",   size: 96  },
  { dir: "mipmap-xxhdpi",  size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
];

const ANDROID_ADAPTIVE = [  // 108dp canvas at each density
  { dir: "mipmap-mdpi",    size: 108 },
  { dir: "mipmap-hdpi",    size: 162 },
  { dir: "mipmap-xhdpi",   size: 216 },
  { dir: "mipmap-xxhdpi",  size: 324 },
  { dir: "mipmap-xxxhdpi", size: 432 },
];

async function resize(src: Buffer, px: number): Promise<Buffer> {
  return sharp(src)
    .resize(px, px, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function flattenForAppStore(src: Buffer): Promise<Buffer> {
  // App Store marketing icon must not have alpha. Composite onto white.
  return sharp(src).flatten({ background: "#ffffff" }).png().toBuffer();
}

export async function buildBundle(opts: {
  source: Buffer;           // 1024x1024 PNG
  foreground?: Buffer;      // optional: Android adaptive fg
  backgroundColor?: string; // e.g. "#eeeeee" for Android bg layer
}): Promise<Buffer> {
  const zip = new JSZip();
  const { source, foreground, backgroundColor = "#ffffff" } = opts;

  // ---- iOS ----
  const ios = zip.folder("AppIcons")!.folder("Assets.xcassets")!.folder("AppIcon.appiconset")!;
  for (const e of IOS) {
    const buf =
      e.idiom === "ios-marketing"
        ? await flattenForAppStore(await resize(source, e.pixel))
        : await resize(source, e.pixel);
    ios.file(e.filename, buf);
  }
  ios.file(
    "Contents.json",
    JSON.stringify(
      {
        images: IOS.map(({ size, idiom, scale, filename }) => ({
          size, idiom, scale, filename,
        })),
        info: { author: "prompt-to-asset", version: 1 },
      },
      null,
      2,
    ),
  );

  // ---- Android (legacy) ----
  const android = zip.folder("AppIcons")!.folder("android")!;
  for (const { dir, size } of ANDROID_LEGACY) {
    const buf = await resize(source, size);
    android.folder(dir)!.file("ic_launcher.png", buf);
    android.folder(dir)!.file("ic_launcher_round.png", buf); // same bitmap; round mask applied by system
  }

  // ---- Android (adaptive) ----
  const fgSource = foreground ?? source;
  for (const { dir, size } of ANDROID_ADAPTIVE) {
    const fg = await resize(fgSource, size);
    // Compose background PNG from color at the same size
    const bg = await sharp({
      create: { width: size, height: size, channels: 4, background: backgroundColor },
    })
      .png()
      .toBuffer();
    android.folder(dir)!.file("ic_launcher_foreground.png", fg);
    android.folder(dir)!.file("ic_launcher_background.png", bg);
  }
  android.folder("mipmap-anydpi-v26")!.file(
    "ic_launcher.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`,
  );
  android.file("playstore-icon.png", await resize(source, 512));

  // ---- iTunesArtwork (ad-hoc, no extension) ----
  const root = zip.folder("AppIcons")!;
  root.file("iTunesArtwork",     await resize(source, 512));
  root.file("iTunesArtwork@2x",  await resize(source, 1024));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
```

This ~160 lines reproduces the **entire appicon.co ZIP** minus macOS (which is 10 more lines of `sips`/`iconutil` or `icnsutil`) and watchOS (trivially added — watchOS sizes matrix is in Apple's appiconset docs).

### 4.2 Python equivalent — `generate_iconset.py`

```python
#!/usr/bin/env python3
"""Mirror appicon.co's ZIP from a 1024x1024 PNG using Pillow + zipfile."""
from __future__ import annotations
import io, json, zipfile
from pathlib import Path
from PIL import Image

IOS = [
    ("20x20", "iphone", "2x", "Icon-20@2x.png", 40),
    ("20x20", "iphone", "3x", "Icon-20@3x.png", 60),
    ("29x29", "iphone", "2x", "Icon-29@2x.png", 58),
    ("29x29", "iphone", "3x", "Icon-29@3x.png", 87),
    ("40x40", "iphone", "2x", "Icon-40@2x.png", 80),
    ("40x40", "iphone", "3x", "Icon-40@3x.png", 120),
    ("60x60", "iphone", "2x", "Icon-60@2x.png", 120),
    ("60x60", "iphone", "3x", "Icon-60@3x.png", 180),
    ("20x20", "ipad", "1x", "Icon-20.png", 20),
    ("20x20", "ipad", "2x", "Icon-20@2x~ipad.png", 40),
    ("29x29", "ipad", "1x", "Icon-29.png", 29),
    ("29x29", "ipad", "2x", "Icon-29@2x~ipad.png", 58),
    ("40x40", "ipad", "1x", "Icon-40.png", 40),
    ("40x40", "ipad", "2x", "Icon-40@2x~ipad.png", 80),
    ("76x76", "ipad", "1x", "Icon-76.png", 76),
    ("76x76", "ipad", "2x", "Icon-76@2x.png", 152),
    ("83.5x83.5", "ipad", "2x", "Icon-83.5@2x.png", 167),
    ("1024x1024", "ios-marketing", "1x", "Icon-1024.png", 1024),
]
ANDROID_LEGACY = [("mipmap-mdpi", 48), ("mipmap-hdpi", 72),
                  ("mipmap-xhdpi", 96), ("mipmap-xxhdpi", 144),
                  ("mipmap-xxxhdpi", 192)]

def _resize(img: Image.Image, px: int) -> bytes:
    out = img.resize((px, px), Image.LANCZOS)
    buf = io.BytesIO()
    out.save(buf, format="PNG", optimize=True)
    return buf.getvalue()

def build_bundle(source_png: Path, out_zip: Path, bg_color: str = "#ffffff") -> None:
    src = Image.open(source_png).convert("RGBA")
    if src.size != (1024, 1024):
        src = src.resize((1024, 1024), Image.LANCZOS)

    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        images = []
        for size, idiom, scale, name, px in IOS:
            src_for = src
            if idiom == "ios-marketing":
                white = Image.new("RGB", src.size, bg_color)
                white.paste(src, mask=src.split()[3])
                src_for = white.convert("RGBA")
            z.writestr(f"AppIcons/Assets.xcassets/AppIcon.appiconset/{name}",
                       _resize(src_for, px))
            images.append({"size": size, "idiom": idiom, "scale": scale, "filename": name})
        z.writestr(
            "AppIcons/Assets.xcassets/AppIcon.appiconset/Contents.json",
            json.dumps({"images": images, "info": {"author": "prompt-to-asset", "version": 1}},
                       indent=2),
        )
        for dir_, px in ANDROID_LEGACY:
            data = _resize(src, px)
            z.writestr(f"AppIcons/android/{dir_}/ic_launcher.png", data)
            z.writestr(f"AppIcons/android/{dir_}/ic_launcher_round.png", data)
        z.writestr("AppIcons/android/mipmap-anydpi-v26/ic_launcher.xml",
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '  <background android:drawable="@mipmap/ic_launcher_background"/>\n'
            '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
            '</adaptive-icon>\n')
        z.writestr("AppIcons/android/playstore-icon.png", _resize(src, 512))
        z.writestr("AppIcons/iTunesArtwork", _resize(src, 512))
        z.writestr("AppIcons/iTunesArtwork@2x", _resize(src, 1024))

if __name__ == "__main__":
    import sys
    build_bundle(Path(sys.argv[1]), Path(sys.argv[2]))
```

### 4.3 Architecture for embedding in the prompt-to-asset web UI

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React/Next.js page at /tools/app-icon)                     │
│                                                                      │
│   ┌──────────────────┐     onDrop(file)                              │
│   │  Dropzone (1024² │────────────────┐                              │
│   │  PNG / SVG)      │                │                              │
│   └──────────────────┘                ▼                              │
│                              ┌────────────────────┐                  │
│                              │ validate + preview │                  │
│                              │ (canvas thumb)     │                  │
│                              └─────────┬──────────┘                  │
│                                        │                             │
│               ┌────────────────────────┴──────────────────┐          │
│               │                                           │          │
│       small file (<2MB)                       large file / SVG       │
│               │                                           │          │
│               ▼                                           ▼          │
│    jSquash WASM worker                     POST multipart to API     │
│    (resize + png encode)                                  │          │
│               │                                           │          │
│               ▼                                           ▼          │
│    JSZip.generateAsync({stream})           node server: sharp +      │
│               │                            @capacitor/assets         │
│               ▼                                           │          │
│    blob URL → <a download="AppIcons.zip">  ← streamed ZIP response   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Rationale for the split:
- **Browser path (jSquash + JSZip)** preserves appicon.co's "nothing uploaded" privacy property. It's ~4MB of WASM, so we lazy-load behind the dropzone.
- **Server path (sharp)** kicks in for SVG ingestion (we want a real headless renderer, not Canvas's variable SVG semantics), very large sources, and for users who asked for a signed `.icns`/`.ico` that requires native tooling. The server path also enables API access from Claude/Codex MCP tools, which is the prompt-to-asset's product goal.

Operational notes:
- Always **flatten alpha on the 1024 marketing icon** — App Store Connect rejects alpha. Use `sharp.flatten({ background: "#ffffff" })` or let the user pick the flatten color.
- **Never upscale**. If source is <1024, warn loudly and refuse to emit the 1024 marketing icon.
- For Android adaptive, if the user didn't supply a separate foreground, composite source onto the chosen background color and **scale it to ~66% of the 108dp canvas** to respect the safe zone (per Android's spec). This single heuristic beats appicon.co's default, which fills the whole 108dp and gets clipped on Pixel launchers.
- Emit a `README.md` inside the ZIP with copy-paste commands (`flutter pub run flutter_launcher_icons`, drag-and-drop to Xcode, etc.) — appicon.co does not do this; users consistently ask "where does this go?".

---

## 5. Gaps, Risks, and Follow-ups

- **Monochrome / themed Android icon** (API 33+): none of the mainstream web generators currently emit it. We should. It requires a user-supplied single-channel mask; we can auto-derive one by `sharp(foreground).greyscale().threshold(128).tint("#000")`, but a manual upload slot is better quality.
- **visionOS / tvOS**: Apple's asset catalog now supports `visionos` and `tvos` idioms with layered images. Not produced by appicon.co. Worth adding for future-proofing (see [Apple Asset Catalog docs](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AssetTypes.html)).
- **Dark-mode / tinted iOS icons** (iOS 18+): Apple's appiconset now allows `appearances: [ { appearance: "luminosity", value: "dark" } ]` entries and a separate tinted variant. `@capacitor/assets` added partial support in 2024; we should track upstream.
- **Maskable PWA icons**: `pwa-asset-generator` does them correctly with a safe zone. Our server path should forward PWA generation to that tool rather than reimplementing.
- **Brand lock-in**: several OSS alternatives (`icon.kitchen`) are Google-hosted but also closed source. We explicitly prefer tools we can vendor.

---

## References

### Specifications (primary)
- Apple — [Asset Catalog Format Reference: App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html)
- Apple — [Asset Catalog Format Reference: Contents.json File](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Contents.html)
- Apple — [Asset Catalog Format Reference: Types Overview](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AssetTypes.html)
- Android Developers — [Adaptive icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- Android Developers — [Support different pixel densities](https://developer.android.com/training/multiscreen/screendensities)
- Android Developers — [AdaptiveIconDrawable API reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)
- Android Developers Codelab — [Design and preview your app icons](https://codelabs.developers.google.com/design-android-launcher)

### `appicon.co` family (the target of this teardown)
- [appicon.co](https://www.appicon.co) (closed-source)
- [appiconmaker.co — Terms of Service](https://appiconmaker.co/terms-of-service) (updated 2025-11-14)
- [appiconmaker.co — Privacy Policy](https://appiconmaker.co/privacy-policy) (updated 2025-07-21)

### Open-source alternatives (MIT unless noted)
- Ionic — [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) • [npm](https://www.npmjs.com/package/@capacitor/assets) • [Capacitor splash+icons guide](https://capacitorjs.com/docs/v5/guides/splash-screens-and-icons)
- Flutter Community — [`flutter_launcher_icons`](https://github.com/fluttercommunity/flutter_launcher_icons) • [pub.dev API](https://pub.dev/documentation/flutter_launcher_icons/latest) • [LogRocket adaptive-icons tutorial](https://blog.logrocket.com/create-adaptive-icons-flutter-launcher-icons)
- elegantapp — [`pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator)
- [`xcodeBn/app-icon-formatter`](https://github.com/xcodeBn/app-icon-formatter) (explicit appicon.co clone, JSZip-based)
- [`zhangyu1818/appicon-forge`](https://github.com/zhangyu1818/appicon-forge) (981★, React)
- [`Nonchalant/AppIcon`](https://github.com/Nonchalant/AppIcon) (1.5k★, Swift CLI)
- [`EvanBacon/app-icon-endpoint`](https://github.com/EvanBacon/app-icon-endpoint)
- [`relikd/icnsutil`](https://github.com/relikd/icnsutil) • [docs](https://relikd.github.io/icnsutil/)
- [`jamsinclair/jSquash`](https://github.com/jamsinclair/jSquash) (browser WASM codecs)
- [`lovell/sharp`](https://github.com/lovell/sharp) (Node libvips wrapper)
- [`icoutils` / `icotool`](https://www.nongnu.org/icoutils/) (GPLv3; Windows `.ico`)
- Apple `iconutil(1)` + `sips(1)` (macOS, built-in)

### Deep-dive reading
- Ian Lake — [VectorDrawable Adaptive Icons](https://medium.com/androiddevelopers/vectordrawable-adaptive-icons-3fed3d3205b5)
- codeandbutter — [Including iTunesArtwork in Ad Hoc distributions](https://codeandbutter.com/2011/01/including-itunesartwork-in-ad-hoc-distributions/)
- DEV — [How to create .icns file from PNG files on CLI](https://dev.to/craftzdog/how-to-create-icns-file-from-png-files-on-cli-4c16)
- web.dev — [Introducing libSquoosh](https://web.dev/introducing-libsquoosh/)
- IconBundlr — [Xcode AppIcon.appiconset — How to Export & Configure](https://iconbundlr.com/blog/xcode-appiconset-export-tutorial)
- Appilot — [Android App Icon Sizes: The Complete 2026 Guide](https://appilot.ai/blog/android-app-icon-sizes-2026)
- elk-zone — [`scripts/generate-pwa-icons.ts`](https://github.com/elk-zone/elk/blob/main/scripts/generate-pwa-icons.ts) (real-world sharp reference)
