---
category: 18-asset-pipeline-tools
angle: 18b
title: "Framework-Integrated Asset Generators — Capacitor, Expo, Flutter, React Native, Tauri, Electron, NativeScript, KMP"
status: draft
research_value: critical
date_compiled: 2026-04-19
tools_surveyed:
  - "@capacitor/assets (Ionic team) — easy & custom modes, adaptive icons, dark variants"
  - "expo-splash-screen + app.json `icon` / `android.adaptiveIcon` / `ios.icon` (Expo SDK 52/53)"
  - "flutter_launcher_icons v0.14.4 (pub.dev) — adaptive + monochrome (API 33+)"
  - "react-native-make (bamlab) — ARCHIVED Oct 2021 → icon-set-creator (npx)"
  - "tauri icon (Tauri CLI v2) — desktop + mobile, .ico/.icns/.png chain"
  - "Electron Forge packagerConfig.icon + electron-icon-builder (helper)"
  - "NativeScript CLI `ns resources generate icons|splashes`"
  - "KMP App Icon Generator Plugin (qamarelsafadi), IconSync (ansgrb) — Gradle plugins"
  - "pwa-asset-generator (elegantapp) — used by Capacitor/PWA flows, v8.1.4 Mar 2026"
primary_sources:
  - https://www.npmjs.com/package/@capacitor/assets
  - https://capacitorjs.com/docs/guides/splash-screens-and-icons
  - https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon
  - https://pub.dev/packages/flutter_launcher_icons
  - https://github.com/bamlab/react-native-make
  - https://tauri.app/develop/icons
  - https://www.electronforge.io/guides/create-and-add-icons
  - https://www.npmjs.com/package/electron-icon-builder
  - https://github.com/NativeScript/nativescript-cli/blob/master/docs/man_pages/project/configuration/resources/resources-generate-icons.md
  - https://github.com/qamarelsafadi/KMPAppIconGeneratorPlugin
  - https://github.com/ansgrb/iconsync
  - https://github.com/elegantapp/pwa-asset-generator
tags: [asset-pipeline, capacitor, expo, flutter, react-native, tauri, electron-forge, nativescript, kmp, adaptive-icons, splash-screens, app-icons, mipmap, assets-catalog, icon-generation, cross-platform]
---

# 18b — Framework-Integrated Asset Generators

## Executive Summary

Every cross-platform app framework ships (or blesses) a CLI that takes **one or two high-resolution source images** and explodes them into the 30–120 platform-specific variants iOS, Android, desktop, and PWA installers demand. These tools are the last mile between an AI-generated raster and a shippable build. For `prompt-to-asset`, they are also the **forcing function on output shape**: if the enhancer does not emit what these tools expect, the downstream build breaks in ways that are silent at prompt time and loud at the store-submission stage.

The three findings that matter for the product:

1. **The de-facto "feed" format across every modern framework generator is a 1024×1024 square PNG with transparency, plus optional dark-mode and adaptive-foreground variants.** `@capacitor/assets`, Expo `expo-splash-screen`, `flutter_launcher_icons`, `tauri icon`, `icon-set-creator`, NativeScript `ns resources generate`, and the KMP plugins all converge on this contract. The sole desktop outlier is Electron Forge, which wants **1024×1024 PNG → `.icns` for macOS / `.ico` (256+) for Windows / 512×512 PNG for Linux**, typically produced with `electron-icon-builder` as a pre-step. This means a single well-formed 1024² RGBA PNG is a universal interchange format for the entire "framework tool" tier. [[1]](https://www.npmjs.com/package/@capacitor/assets) [[3]](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon) [[4]](https://pub.dev/packages/flutter_launcher_icons) [[7]](https://tauri.app/develop/icons) [[10]](https://www.npmjs.com/package/electron-icon-builder)

2. **Android adaptive icons have escaped being a "nice to have" and are now a hard requirement in every modern generator — they demand a *separated foreground* on a transparent canvas, with a solid colour or bitmap background.** Google's guidance is that the foreground must live inside a 72dp safe zone on a 108dp canvas (66 %), because the launcher freely crops it into any shape. `@capacitor/assets` enforces this via `icon-foreground.png` + `icon-background.png`; `flutter_launcher_icons` via `adaptive_icon_foreground` + `adaptive_icon_background` (only generated when **both** are specified); Expo via `android.adaptiveIcon.foregroundImage` + `backgroundColor` + (SDK 50+) `monochromeImage` for Android 13 themed icons. An AI pipeline that emits only a flat icon will degrade on every Android 8+ device. [[1]](https://www.npmjs.com/package/@capacitor/assets) [[4]](https://pub.dev/packages/flutter_launcher_icons) [[3]](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon)

3. **`react-native-make` (bamlab) is dead — archived 7 Oct 2021 — and the community has not converged on a single replacement. `icon-set-creator` (`npx icon-set-creator create ./icon.png`) is the most mentioned 2024–2026 drop-in, but many React Native CLI projects now simply use `@capacitor/assets` in reverse, `pwa-asset-generator`, or the Expo workflow even on bare projects.** This is the one place where the prompt-to-asset skill should *not* pick a tool unilaterally — it should produce the clean 1024² PNG + foreground + background triple and let the user invoke whichever generator they prefer. [[5]](https://github.com/bamlab/react-native-make) [[6]](https://github.com/tadejpetric/icon-set-creator)

The rest of this report enumerates each tool's exact input contract, output tree, and config file, derives a universal "feed" specification, and maps it into the `prompt-to-asset` skill surface.

## Framework Table

| Tool | Framework | Input spec (canonical) | Output tree (abridged) | Config location |
|---|---|---|---|---|
| `@capacitor/assets` | Capacitor / Ionic | `assets/logo.png` (≥1024²) + optional `assets/logo-dark.png`; or custom set: `icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png` (≥2732²), `splash-dark.png` | `ios/App/App/Assets.xcassets/AppIcon.appiconset/*.png`, `android/app/src/main/res/mipmap-*/ic_launcher*.png` + `values/ic_launcher_background.xml`, `src/assets/icon/` (PWA) | CLI flags: `--iconBackgroundColor`, `--iconBackgroundColorDark`, `--splashBackgroundColor`, `--splashBackgroundColorDark`; no config file required |
| `expo-splash-screen` + app.json | Expo / EAS | `./assets/images/icon.png` 1024² transparent; `./assets/images/adaptive-icon.png` 1024² foreground (66 % safe zone); `./assets/images/splash-icon.png` ≤ ~200² inside a solid color | iOS: `ios/<App>/Images.xcassets/AppIcon.appiconset/*.png`, `SplashScreen.storyboard`; Android: `android/app/src/main/res/mipmap-*`, `drawable-*/splashscreen_logo.png` | `app.json` → `expo.icon`, `expo.android.adaptiveIcon`, `expo.ios.icon`, `expo.plugins` → `["expo-splash-screen", {...}]` |
| `flutter_launcher_icons` | Flutter | `assets/icon/icon.png` ≥1024²; optional `adaptive_icon_foreground`, `adaptive_icon_background` (hex or PNG), `adaptive_icon_monochrome`, `image_path_ios`, `remove_alpha_ios: true` | `android/app/src/main/res/mipmap-*/ic_launcher*.png` (+ `mipmap-anydpi-v26/ic_launcher.xml`, `values/colors.xml`), `ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png`, `web/icons/*`, `macos/Runner/Assets.xcassets/AppIcon.appiconset/*` | `pubspec.yaml` under `flutter_launcher_icons:` **or** standalone `flutter_launcher_icons.yaml` |
| `icon-set-creator` (RN replacement) | Bare React Native | `./icon.png` ≥1024²; optional `-b <bg>` `-f <fg>` `-A` for Android adaptive | iOS: `ios/<App>/Images.xcassets/AppIcon.appiconset/*`; Android: `android/app/src/main/res/mipmap-*/ic_launcher*.png` | CLI flags only; run once, commit output |
| `tauri icon` (Tauri CLI v2) | Tauri | `./app-icon.png` square ≥1024² with transparency (or SVG) | Desktop: `src-tauri/icons/32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png` (512²), `icon.ico`, `icon.icns`; Mobile: iOS asset catalog + Android `mipmap-*` inside native projects | `src-tauri/tauri.conf.json` → `bundle.icon: []`; CLI flags: `-p <size>`, `--ios-color`, `-o <dir>` |
| Electron Forge (`packagerConfig.icon`) | Electron | Per-platform: macOS `.icns` (from 1024²), Windows `.ico` (256²), Linux 512×512 `.png`; `@2x`/`@3x` DPI suffixes for Linux | Embedded in built apps via Electron Packager; no standalone "asset tree" — icons are referenced, not copied to `res/` | `forge.config.js` → `packagerConfig.icon: '/path/to/icon'` (extension inferred per platform) |
| `electron-icon-builder` (helper) | Electron pre-step | 1024² 1:1 PNG | `./icons/{icon.icns, icon.ico, icons/16x16.png …1024x1024.png}` | CLI: `electron-icon-builder --input=... --output=...`; no config file |
| `ns resources generate icons / splashes` | NativeScript | Path to single ≥1024² image; `--background` hex or named color | `App_Resources/Android/src/main/res/mipmap-*/ic_launcher*.png`, `App_Resources/iOS/Assets.xcassets/AppIcon.appiconset/*.png`, `App_Resources/Android/src/main/res/drawable-*/background.png`, `Assets.xcassets/LaunchImage.launchimage/*.png` | CLI only; outputs directly into `App_Resources/` |
| KMP App Icon Generator Plugin | Compose Multiplatform | `composeResources/drawable/icon.png` or `icon.svg` | Android adaptive + round in `androidMain/res/mipmap-*`; iOS `Assets.xcassets/AppIcon.appiconset/*` | Gradle: `plugins { id("io.github.qamarelsafadi.kmp.app.icon.generator") version "1.2.6" }` |
| IconSync | Compose Multiplatform | Uses *existing* Android launcher icon as source of truth | iOS `Assets.xcassets/AppIcon.appiconset/*.png` + `Contents.json` | Gradle: `plugins { id("io.github.ansgrb.iconsync") version "1.0.1" }` |
| `pwa-asset-generator` | PWA / web | Any PNG/SVG source | `icons/*.png` (Android + iOS touch icons + mstile), `splashscreens/apple-splash-*.png`, updates `manifest.json` + `index.html` meta tags | CLI; optional `.pwa-asset-generator.json` |

## Tool Deep Dives

### @capacitor/assets (Ionic / Capacitor)

The canonical tool for Capacitor 4/5/6/7 apps. Authored by the Ionic team, replaced `cordova-res` when Capacitor displaced Cordova. Two modes:

**Easy mode** — drop a single `assets/logo.png` (≥1024×1024, transparent) and optionally `assets/logo-dark.png`. Run `npx capacitor-assets generate` with background-colour flags and the tool synthesises adaptive-icon foreground/background, splash screens, and PWA manifest icons. [[1]](https://www.npmjs.com/package/@capacitor/assets)

**Custom mode** — when you need precise control over each surface. Place five files in `assets/`:

- `icon-only.png` — the flat iOS-style icon with its own background (1024² min)
- `icon-foreground.png` — the *Android adaptive* foreground layer, centred inside the safe zone on transparent canvas
- `icon-background.png` — the adaptive background layer (or specify a colour via flag)
- `splash.png` — 2732×2732 centred artwork (the 2732² square gets cropped per-device)
- `splash-dark.png` — dark-mode variant (optional)

It writes iOS `AppIcon.appiconset` (all iPhone/iPad sizes plus the 1024 App Store marketing asset), Android `mipmap-*` directories with round/square/adaptive XML, and PWA manifest icons. Known quirks (from the public issue tracker): adaptive-icon background colour handling was buggy until v3 resolved several issues [[2]](https://github.com/ionic-team/capacitor-assets/issues/290); monochrome icons for Android 13 themed icons are not first-class yet. [[1]](https://www.npmjs.com/package/@capacitor/assets)

### Expo — `app.json` + `expo-splash-screen`

Expo's model diverges from everyone else's because the *config itself* is the source of truth: you describe the icon in `app.json` and `expo prebuild` (or EAS Build) materialises the native projects. The relevant fields:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "ios": { "icon": "./assets/images/icon.png" },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FFFFFF",
        "monochromeImage": "./assets/images/adaptive-icon-mono.png"
      }
    },
    "plugins": [[
      "expo-splash-screen",
      {
        "image": "./assets/images/splash-icon.png",
        "backgroundColor": "#ffffff",
        "imageWidth": 200,
        "resizeMode": "contain",
        "dark": {
          "image": "./assets/images/splash-icon-dark.png",
          "backgroundColor": "#000000"
        }
      }
    ]]
  }
}
```

Input requirements: all images PNG, icon 1024×1024 (opaque or transparent; Expo will composite onto the listed background for iOS which forbids alpha), adaptive-icon foreground 1024² centred inside the 66 % safe zone, splash-icon 200–300 px centred artwork that Expo positions inside a solid colour field. The new "splash icon" model (SDK 50+) replaced the legacy "full-bleed splash image" because Android 12+ enforces the icon-on-solid-background splash API. [[3]](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon) `monochromeImage` was added for Android 13 themed icons but had validation issues in SDK 47/48 that were later resolved. [[3a]](https://github.com/expo/expo/issues/20549)

### flutter_launcher_icons

The dominant Flutter tool; v0.14.4 shipped June 2025. Configured via `pubspec.yaml`:

```yaml
flutter_launcher_icons:
  android: "launcher_icon"
  ios: true
  image_path: "assets/icon/icon.png"
  min_sdk_android: 21
  adaptive_icon_background: "#ffffff"           # colour or PNG path
  adaptive_icon_foreground: "assets/icon/icon-foreground.png"
  adaptive_icon_monochrome: "assets/icon/icon-mono.png"   # 0.14.0+, Android 13 themed
  adaptive_icon_foreground_inset: 16            # 0.14.0+
  remove_alpha_ios: true                         # App Store requires opaque
  web: { generate: true, image_path: "assets/icon/icon.png" }
  windows: { generate: true, image_path: "assets/icon/icon.png", icon_size: 48 }
  macos: { generate: true, image_path: "assets/icon/icon.png" }
```

Run with `dart run flutter_launcher_icons`. Critical contract: **adaptive icons only generate when both `adaptive_icon_background` and `adaptive_icon_foreground` are set** — omit either and you get a flat icon, silently. [[4]](https://pub.dev/packages/flutter_launcher_icons) The `remove_alpha_ios: true` flag exists because the App Store rejects PNGs with alpha channels — a concrete example of why an AI enhancer must know *which surface* an asset is bound for before deciding whether to emit RGBA.

### react-native-make → icon-set-creator

`react-native-make` by bamlab was the canonical `react-native set-icon --path icon.png` tool. The repo was **archived 7 October 2021** and is read-only. [[5]](https://github.com/bamlab/react-native-make) For React Native CLI (non-Expo) projects in 2024–2026, the community patchwork is:

- **`icon-set-creator`** — `npx icon-set-creator create ./icon.png` with optional `-b` `-f` `-A` for adaptive icons. Lightweight, unopinionated.
- **`@bam.tech/react-native-make` fork** — some teams use community forks that revived the CLI.
- **Manually use `@capacitor/assets`** — nothing stops you from running it against a React Native project and copy-pasting the output.
- **Expo prebuild flow** — increasingly common even for non-Expo projects because it's the path of least resistance.
- **Online generators** (appicon.co, easyappicon.com) — out of scope for this angle but filed under 18a.

The practical implication: the prompt-to-asset skill cannot assume a single RN tool exists. It should produce a *canonical asset bundle* and emit tool-specific invocation snippets as secondary output.

### Tauri — `tauri icon`

Tauri CLI v2 ships `tauri icon` built in. Input: one square PNG (default `./app-icon.png`) or SVG, at least 1024². It emits:

- Desktop PNGs: `32x32.png`, `64x64.png` (added Jan 2025 via PR #12204), `128x128.png`, `128x128@2x.png` (= 256²), `icon.png` (512²)
- `icon.ico` — multi-resolution with 16, 24, 32, 48, 64, 256 layers
- `icon.icns` — Apple Icon Image format with all required layers for macOS
- Mobile: writes directly into the iOS Xcode asset catalog and the Android `mipmap-*` directories of the generated native projects

Config lives in `src-tauri/tauri.conf.json` under `bundle.icon` as an array of paths the bundler will pick from. CLI flags: `-p <size>` overrides default PNG sizes, `--ios-color <hex>` sets the iOS background (iOS doesn't allow transparency in app icons so Tauri composites), `-o <dir>` overrides output. [[7]](https://tauri.app/develop/icons) Splash screens are *not* part of `tauri icon` — Tauri's model shows a native window immediately, no splash surface to populate.

### Electron Forge + electron-icon-builder

Electron Forge itself does not generate icons — it *consumes* them. Config is under `packagerConfig.icon` in `forge.config.js`:

```javascript
module.exports = {
  packagerConfig: {
    icon: './assets/icon'   // no extension; Packager picks .icns/.ico per target
  }
}
```

Platform requirements: [[8]](https://www.electronforge.io/guides/create-and-add-icons)

- **macOS**: `icon.icns` built from a 1024² source; optional `.icon` (Icon Composer) for macOS 26+
- **Windows**: `icon.ico` with at least a 256×256 layer
- **Linux**: 512×512 `.png`; DPI-suffixed `icon@2x.png`, `icon@3x.png` etc. for Hi-DPI displays

The canonical pre-step is `electron-icon-builder`:

```bash
electron-icon-builder --input=/abs/path/icon.png --output=./build
```

Output: `build/icons/{16x16.png … 1024x1024.png, icon.icns, icon.ico}`. The safu9 package hasn't been updated since Dec 2020 (v2.0.1); the Hunlongyu fork has more recent maintenance. [[10]](https://www.npmjs.com/package/electron-icon-builder) [[11]](https://github.com/Hunlongyu/electron-icon-builder) Alternative production paths: `png2icons` (pure JS), `iconutil` + `sips` on macOS for .icns, `magick convert` with ICO layers for Windows.

### NativeScript — `ns resources generate`

NativeScript CLI provides two commands:

```
ns resources generate icons <path/to/image.png>
ns resources generate splashes <path/to/image.png> --background "#FF00FF"
```

They write directly into `App_Resources/Android/…` and `App_Resources/iOS/…` with the platform-appropriate mipmap/assets-catalog layout. Input recommendation is ≥1024². Splashes default to a white background; icons default to transparent. No YAML or JSON config — purely imperative CLI. [[12]](https://github.com/NativeScript/nativescript-cli/blob/master/docs/man_pages/project/configuration/resources/resources-generate-icons.md)

### Kotlin Multiplatform — KMP App Icon Generator + IconSync

Compose Multiplatform and KMM projects historically required manual icon work for each platform. Two 2024–2025 Gradle plugins automate it:

- **`io.github.qamarelsafadi.kmp.app.icon.generator`** (v1.2.6, Jun 2025). Drop `icon.png` or `icon.svg` into `composeResources/drawable/`, apply the plugin. Generates Android adaptive + round mipmaps and iOS `AppIcon.appiconset`. Requires Kotlin 1.9+, Gradle 8+. [[13]](https://github.com/qamarelsafadi/KMPAppIconGeneratorPlugin)
- **`io.github.ansgrb.iconsync`** (v1.0.1, Jul 2025). Uses the existing Android launcher icon as source of truth and synthesises the iOS asset catalog (+ `Contents.json`) from it. Good for teams where Android is the design pivot. [[14]](https://github.com/ansgrb/iconsync)

Both want a 1024²+ transparent PNG or a vector drawable. Neither handles splash screens — Compose Multiplatform uses its own system, and iOS still requires a `LaunchScreen.storyboard`.

### pwa-asset-generator (honourable mention)

Though primarily a web tool, `pwa-asset-generator` (elegantapp, v8.1.4, Mar 2026, 3k★) is the only open-source generator that handles the full matrix of PWA icons + iOS `apple-touch-startup-image` splash screens + mstile images *and* patches `manifest.json` / `index.html` atomically. Capacitor internally leans on similar Puppeteer-based rendering for PWA outputs. [[15]](https://github.com/elegantapp/pwa-asset-generator)

## Recommended "Feed" Format for AI-Generated Assets

Synthesising every tool above, the minimum viable contract an AI generation pipeline must produce to satisfy the framework-native tier is a **four-file bundle** + explicit colour metadata:

```
<bundle>/
├── icon.png                 # 1024×1024 RGBA, full artwork including background
├── icon-foreground.png      # 1024×1024 RGBA, subject only on transparent canvas,
│                            #   artwork centred inside a 676×676 safe zone (66%)
├── icon-monochrome.png      # 1024×1024 RGBA, single-channel silhouette
│                            #   (black on transparent; Android 13 themed icons)
├── splash-icon.png          # 400×400 RGBA, subject-only artwork, transparent bg
└── metadata.json
```

where `metadata.json` captures the fields every generator needs:

```json
{
  "icon_background_color": "#FFFFFF",
  "icon_background_color_dark": "#111111",
  "splash_background_color": "#FFFFFF",
  "splash_background_color_dark": "#000000",
  "source_prompt": "A transparent minimalist notebook icon...",
  "source_model": "gpt-image-1",
  "alpha_verified": true,
  "safe_zone_verified": true,
  "safe_zone_margin_px": 174
}
```

Why this exact shape:

- **1024×1024** is the universal *minimum* accepted by every generator surveyed; going larger (2048² or 4096²) adds latency without benefit because every tool down-samples. 1024² is also what the App Store demands as its "marketing" icon, so it is non-optional at some step of the pipeline.
- **RGBA** on the foreground is required by `@capacitor/assets`, `flutter_launcher_icons`, `tauri icon`, and Expo's adaptive-icon pipeline — all of them composite the foreground over their own background. Emitting opaque foregrounds produces double-background bugs.
- **66 % safe zone** is Google's adaptive-icon contract (artwork inside 72dp of a 108dp canvas). Violating it means the launcher can crop your brand mark when it applies its mask. Expo, Flutter, and Capacitor all silently assume this — they do not re-inset.
- **Monochrome silhouette** serves both Android 13 themed icons (`android.adaptiveIcon.monochromeImage` / `adaptive_icon_monochrome`) and iOS 18 tinted home-screen icons. Providing it is cheap once you already have the foreground; absent it, platforms fall back to an auto-generated mono that looks muddy.
- **Separate splash-icon** (not a full-bleed splash) because Android 12+ enforces the SplashScreen API which requires an icon-on-solid-colour model. Full-bleed splash PNGs are now a legacy code path; even Expo deprecated `splash.image` in favour of `splash-icon.png`. The 400² size is large enough that no generator needs to up-scale.
- **Explicit colour metadata**, not baked into the pixels, because every generator wants the background as a *parameter* (`--iconBackgroundColor`, `backgroundColor`, `adaptive_icon_background`). Baking a colour into the foreground pixels is one of the top causes of "adaptive icon looks wrong" bug reports across the issue trackers of all four major tools.
- **`alpha_verified: true`** flag is the signal that a post-processing matting pass (rembg, BRIA RMBG, or a LayerDiffuse-style native alpha model) has confirmed actual RGBA transparency, not the "checkered boxes" Gemini artifact described in the product plan. This is the seam where category 18b couples to category 13.

For **iOS-only** pipelines or App Store upload, add a fifth file `icon-opaque.png` (flattened 1024² RGB) because the App Store rejects alpha channels on the 1024 marketing icon. `flutter_launcher_icons`'s `remove_alpha_ios: true` exists to codify this — the enhancer should pre-flatten rather than ask each tool to do it.

For **desktop (Electron/Tauri)**, the bundle additionally needs derived `.icns` and `.ico` files. These are best produced by letting `tauri icon` or `electron-icon-builder` run against the `icon.png` — no benefit to generating them from the AI model directly, because the format is lossless and the tool cost is milliseconds.

## Integration into prompt-to-asset

The skill's `app_icon` and `splash_screen` intents should emit the bundle above, plus a `target_frameworks` vector that drives per-framework post-processing snippets the user can copy-paste. Concretely:

1. **Prompt shaping layer** — when the user says "generate an app icon for my note-taking app," the enhancer detects the app-icon intent (see category 09) and expands the prompt into *two* sub-prompts: one for the full `icon.png` with whatever background they specified, and one for the subject-only `icon-foreground.png` with the negative prompt augmented to force a transparent background (see category 13 for the RGBA-model selection heuristics). The monochrome is derivable by desaturating + thresholding the foreground in post, no separate generation call needed.

2. **Safe-zone enforcement** — the enhancer must inject explicit safe-zone guidance: `"centre the primary subject inside the middle 66 % of the canvas; leave at least 174 pixels of margin on every side"`. This works well on gpt-image-1 and reasonably well on Imagen 4, less so on Midjourney. A post-hoc verifier (bounding-box of non-transparent pixels) can catch violations; regenerate with stronger inset language if violated.

3. **Per-framework export recipe** — given `target_frameworks: ["expo"]`, the skill emits:

   ```
   # 1. Drop into your Expo project:
   cp bundle/icon.png            assets/images/icon.png
   cp bundle/icon-foreground.png assets/images/adaptive-icon.png
   cp bundle/icon-monochrome.png assets/images/adaptive-icon-mono.png
   cp bundle/splash-icon.png     assets/images/splash-icon.png

   # 2. Merge these app.json fragments:
   {...}

   # 3. Rebuild:
   npx expo prebuild --clean && eas build -p all
   ```

   Equivalent snippets for Capacitor (`npx capacitor-assets generate --iconBackgroundColor '#...'`), Flutter (`pubspec.yaml` diff + `dart run flutter_launcher_icons`), Tauri (`npm run tauri icon app-icon.png`), Electron (`electron-icon-builder --input=... --output=build && forge.config.js`).

4. **Validation hook** — before declaring done, the skill runs a validation matrix per target framework: does the 1024 icon have alpha? does the foreground's tight bbox fit in the 676×676 safe square? does the monochrome render to a single-channel silhouette? does the splash-icon fit inside its intended imageWidth? Any failure triggers a targeted regeneration or a post-process (matting, recentering, desaturation) before the tool invocation snippet is emitted. This is the concrete payoff of a research-driven enhancer: the model never sees *tool* errors, only *content* errors it can fix by reprompting.

5. **Framework detection** — if the user's workspace is available (e.g. running via MCP with filesystem access), detecting `capacitor.config.ts`, `pubspec.yaml` + `flutter:` stanza, `app.json` + `expo` key, `src-tauri/tauri.conf.json`, or `forge.config.js` lets the enhancer pick a sensible default `target_frameworks` without asking. Falling back to "emit the universal bundle + all snippets" is safe when ambiguous.

6. **Failure modes to guard against**:
   - Tool-specific silent downgrades (flutter_launcher_icons skipping adaptive icons when only one of fg/bg is present) — the skill should refuse to emit a Flutter snippet unless both keys are populated.
   - React Native CLI's abandonware tool chain — emit *two* RN snippets (`icon-set-creator` + manual `@capacitor/assets`) and let the user pick.
   - iOS alpha rejection at App Store Connect — always include the opaque flattened variant in the bundle even when all current targets accept alpha.
   - Android 12+ splash API mismatches — if the user's project has a legacy full-bleed splash plugin, warn them it'll be ignored on Android 12+ devices.

## References

1. `@capacitor/assets` — npm. https://www.npmjs.com/package/@capacitor/assets
2. Capacitor Assets issue tracker — adaptive-icon background bugs. https://github.com/ionic-team/capacitor-assets/issues/290 · https://github.com/ionic-team/capacitor-assets/issues/375 · https://github.com/ionic-team/capacitor-assets/issues/399
3. Expo — Splash screen and app icon. https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon
3a. Expo #20549 — monochromeImage docs/validation. https://github.com/expo/expo/issues/20549
4. flutter_launcher_icons — pub.dev. https://pub.dev/packages/flutter_launcher_icons · changelog https://pub.dev/packages/flutter_launcher_icons/changelog
5. react-native-make (bamlab, archived) — https://github.com/bamlab/react-native-make · set-icon docs https://github.com/bamlab/react-native-make/blob/master/docs/set-icon.md
6. icon-set-creator — https://www.npmjs.com/package/icon-set-creator
7. Tauri — App Icons guide. https://tauri.app/develop/icons · v2 https://v2.tauri.app/develop/icons
8. Electron Forge — Custom App Icons. https://www.electronforge.io/guides/create-and-add-icons
9. Electron Forge — Configuration overview. https://www.electronforge.io/config
10. electron-icon-builder (safu9) — https://www.npmjs.com/package/electron-icon-builder · https://github.com/safu9/electron-icon-builder
11. electron-icon-builder (Hunlongyu fork) — https://github.com/Hunlongyu/electron-icon-builder
12. NativeScript CLI — `ns resources generate icons`. https://github.com/NativeScript/nativescript-cli/blob/master/docs/man_pages/project/configuration/resources/resources-generate-icons.md
12a. NativeScript CLI — `ns resources generate splashes`. https://old.docs.nativescript.org/tooling/docs-cli/project/configuration/resources/resources-generate-splashes.html
13. KMP App Icon Generator Plugin — https://github.com/qamarelsafadi/KMPAppIconGeneratorPlugin
14. IconSync — https://github.com/ansgrb/iconsync
15. pwa-asset-generator — https://github.com/elegantapp/pwa-asset-generator · v8.1.4 https://github.com/elegantapp/pwa-asset-generator/releases/tag/v8.1.4
16. Tauri CLI PR #12204 — default 64×64 PNG added Jan 2025. https://github.com/tauri-apps/tauri/pull/12204
17. Capacitor docs — Splash Screens and Icons. https://capacitorjs.com/docs/guides/splash-screens-and-icons
18. expo-splash-screen — https://www.npmjs.com/package/expo-splash-screen · SDK reference https://docs.expo.dev/versions/latest/sdk/splash-screen
19. Android Developers — Adaptive icon design guidance (safe zone, 108dp canvas). https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
20. Apple HIG — App icons. https://developer.apple.com/design/human-interface-guidelines/app-icons
