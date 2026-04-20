# Adaptive Icon Specifications & OSS Tooling

> External grounding digest for `prompt-to-asset` icon emission pipeline. Current as of 2026 (iOS 26, Android 14+, visionOS 2+).

---

## 1. iOS — `AppIcon.appiconset` + Icon Composer

### 1a. Legacy asset catalog (Xcode 14+, still required for iOS 17 / tvOS / visionOS fallback)

Since Xcode 14, iOS no longer needs per-device sizes — a single 1024×1024 "universal" icon is sufficient and Xcode downscales at build time. Dark + tinted variants were added in **iOS 18** (Xcode 16).

**`AppIcon.appiconset/Contents.json` (iOS 18+ with dark/tinted):**

```json
{
  "images": [
    {
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "icon-light.png"
    },
    {
      "appearances": [{ "appearance": "luminosity", "value": "dark" }],
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "icon-dark.png"
    },
    {
      "appearances": [{ "appearance": "luminosity", "value": "tinted" }],
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "icon-tinted.png"
    }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

### 1b. Alpha-channel rules (critical — App Store rejection trigger `ITMS-90717`)

| Variant        | Alpha channel              | Background          |
|----------------|----------------------------|---------------------|
| Light (main)   | **MUST NOT** contain alpha | Opaque, full-bleed  |
| Dark           | **MUST** be transparent    | System fills behind |
| Tinted         | **MUST NOT** contain alpha | Solid black; art in grayscale (opacity allowed within the grayscale values, but PNG file itself opaque) |

Additional PNG requirements for the 1024×1024 marketing/main icon:

- **Format:** PNG only (no JPEG, no indexed palette)
- **Color space:** sRGB IEC61966-2.1 — **not Display P3** (common Figma/Sketch default on M-series Macs; frequent rejection cause)
- **Color mode:** RGB TrueColor (24-bit), no indexed palette
- **No rounded corners baked in** — App Store applies its own mask

Verify with `sips --getProperty all icon.png` → expect `hasAlpha: no`, `profile: sRGB IEC61966-2.1`.

### 1c. Platform-specific sizes (still relevant for tvOS/watchOS/visionOS targets)

- **iOS/iPadOS:** 1024×1024 universal is enough from Xcode 14+.
- **watchOS:** 1088×1088 marketing canvas (Apple's new grid); asset catalog handles downscales.
- **macOS:** 1024×1024 (asset catalog generates `.icns` at build time).
- **tvOS:** Layered image stacks (front/middle/back) inside `.brandassets`, distinct from visionOS.
- **visionOS:** See §4.

### 1d. Xcode 26 + Icon Composer (`.icon` file) — replaces `AppIcon.appiconset`

Starting Xcode 26 (iOS 26, Liquid Glass), Apple introduced **Icon Composer**, a standalone editor emitting a single `.icon` bundle that replaces the asset catalog for iOS/iPadOS/macOS/watchOS. Key behavior:

- Single multi-layer file (max 4 groups); layers can be SVG or PNG
- System synthesizes: default, dark, clear light, clear dark, tinted light, tinted dark
- Canvas: 1024 for iPhone/iPad/Mac, 1088 for watchOS
- **If present, `.icon` replaces any `AppIcon.appiconset`** in the same target
- Xcode auto-generates legacy PNG variants for apps targeting pre-iOS-26 deployment
- `tvOS` and `visionOS` still use asset catalogs (NOT `.icon`) as of Xcode 26

---

## 2. Android — Adaptive Icons + Themed Monochrome (Android 13+)

### 2a. Canvas geometry (all layers)

```
┌─────────────────────────────────┐  108×108 dp  full canvas
│  ┌───────────────────────────┐  │
│  │  72×72 dp  viewport       │  │  ← what user actually sees after mask
│  │  ┌─────────────────────┐  │  │
│  │  │ 66×66 dp safe zone  │  │  │  ← never clipped by any OEM shape
│  │  │  (48–66 dp logo)    │  │  │  ← logo target area
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
│     18 dp outer bleed (parallax/pulse reserved)
└─────────────────────────────────┘
```

- **All three layers (foreground, background, monochrome) are 108×108 dp.**
- Outer 18 dp on each side is reserved for system parallax/pulse effects — will be cropped by every launcher mask.
- Inner 72×72 dp is the visible viewport after masking.
- 66×66 dp safe zone is guaranteed never-clipped by any OEM shape.
- Logo should fill 48–66 dp.

### 2b. Monochrome layer (Android 13+ themed icons)

- Must be a **solid-shape** drawable (VectorDrawable strongly recommended)
- System tints it based on wallpaper/Material You palette — do not bake in colors
- Specs: 90×90 dp container, 60×60 dp max logo, 36×36 dp recommended logo
- Any source color is discarded — only the alpha mask matters

### 2c. `res/mipmap-anydpi-v26/ic_launcher.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
```

`<background>` may be a `@color`, `@drawable`, or `@mipmap`. `<foreground>` and `<monochrome>` must be drawables (vector preferred).

### 2d. Required mipmap densities (legacy PNG fallback for pre-API-26 launchers)

| Folder              | Size (px) | Density multiplier |
|---------------------|-----------|--------------------|
| `mipmap-mdpi`       | 48×48     | 1.0×               |
| `mipmap-hdpi`       | 72×72     | 1.5×               |
| `mipmap-xhdpi`      | 96×96     | 2.0×               |
| `mipmap-xxhdpi`     | 144×144   | 3.0×               |
| `mipmap-xxxhdpi`    | 192×192   | 4.0×               |

Plus 512×512 PNG for Play Store listing (not in APK). Use **mipmap** not **drawable** — mipmap resources are preserved across density strips so launchers can upscale for "icon enlargement" modes.

---

## 3. PWA Web App Manifest

### 3a. `purpose` field semantics

| Purpose        | Behavior                                                                  |
|----------------|---------------------------------------------------------------------------|
| `"any"` (default) | Icon used as-is; on Android the browser pads it with a white background if not full-bleed |
| `"maskable"`   | Icon is cropped to the platform's adaptive shape (circle/squircle/teardrop). Requires safe zone. Must be opaque. |
| `"monochrome"` | Silhouette only; platform applies its own fill color (used for notifications/themed contexts) |

**Do not** combine `"any maskable"` on the same asset — it forces the maskable safe-zone padding onto contexts that would show the icon unmasked, making the logo look tiny. Ship two separate entries.

### 3b. Maskable safe zone (W3C standardized)

- Canvas: 512×512 recommended
- **Safe zone: centered circle with radius = 40% of icon width** (i.e. 205 px radius for 512)
- Outer 10% edge on every side may be cropped
- Must be **fully opaque** — transparent pixels break masking on some platforms
- Test at `maskable.app` or Chrome DevTools → Application → Manifest → "Show only the minimum safe area"

### 3c. `manifest.json` minimum viable icon set

```json
{
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-monochrome-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "monochrome"
    }
  ]
}
```

- **192×192 and 512×512 are the hard minimums** for installability (Chrome/Edge enforce).
- Apple iOS Safari ignores manifest icons on "Add to Home Screen" — you must also emit `<link rel="apple-touch-icon" sizes="180x180" href="…">` in HTML `<head>`, opaque PNG, no alpha.

---

## 4. visionOS — Layered Glass Icons

visionOS ships a distinct layered icon system (predates Liquid Glass; still uses asset catalog in Xcode 26):

### 4a. Structure: 3 layers (back → middle → front)

| Layer   | Transparency | Role                                     |
|---------|--------------|------------------------------------------|
| Back    | **Must be opaque, full-bleed** | Background plate; system masks to circle |
| Middle  | Transparent OK | Mid-depth graphics                      |
| Front   | Transparent OK | Top detail / logomark                    |

- Each layer: **1024×1024 px** PNG (or 512×512 @2x pair)
- System automatically applies glass highlights, parallax, shadow between layers — do **not** bake your own shadows
- Arranged in an `.solidimagestack` (or `.imagestack` for tvOS analog) inside the asset catalog

### 4b. Example asset catalog layout

```
AppIcon.solidimagestack/
├── Contents.json
├── Back.solidimagestacklayer/
│   ├── Contents.json
│   └── Content.imageset/
│       ├── Contents.json
│       └── Back.png       (1024×1024, opaque)
├── Middle.solidimagestacklayer/
│   └── Content.imageset/Middle.png   (1024×1024, transparent OK)
└── Front.solidimagestacklayer/
    └── Content.imageset/Front.png    (1024×1024, transparent OK)
```

Inner `Contents.json` for each `solidimagestacklayer` declares the single universal image; outer `.solidimagestack/Contents.json` declares `info.author=xcode`, `info.version=1`.

---

## 5. OSS Tooling Landscape

### 5a. `@capacitor/assets` (Ionic Capacitor)

```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate \
  --iconBackgroundColor '#eeeeee' \
  --iconBackgroundColorDark '#222222' \
  --ios --android --pwa
```

- Input: `resources/icon.png` (≥1024×1024) + optional `icon-foreground.png` / `icon-background.png`
- Emits: iOS `AppIcon.appiconset`, Android adaptive mipmaps + `ic_launcher.xml`, PWA manifest icon set
- **Known bug:** thin black edge on adaptive icons from `android:inset="16.7%"` rounding — workaround is patching to `16.6%` (issue #522)
- Does **not** natively emit iOS 18 dark/tinted variants — must be added manually post-generation
- Does **not** emit visionOS layered stacks

### 5b. `pwa-asset-generator` (elegantapp, 3k+ stars)

```bash
npx pwa-asset-generator logo.svg ./public/icons \
  --manifest ./public/manifest.json \
  --index ./public/index.html \
  --maskable true \
  --favicon \
  --mstile
```

- Puppeteer-based: renders SVG/PNG/HTML through headless Chrome
- Emits manifest.json entries, `<link rel="apple-touch-icon">`, favicons, mstile, splash screens
- Maskable handling: `--maskable true` adds 10% padding and `purpose: "maskable"` — but no monochrome purpose support
- Best for: pure web PWAs; not for native iOS/Android asset catalogs

### 5c. Expo (`expo prebuild`)

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "ios": { "icon": { "light": "./assets/icon.png", "dark": "./assets/icon-dark.png", "tinted": "./assets/icon-tinted.png" } },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-foreground.png",
        "backgroundImage": "./assets/adaptive-background.png",
        "backgroundColor": "#ffffff",
        "monochromeImage": "./assets/adaptive-monochrome.png"
      }
    }
  }
}
```

- All source images 1024×1024 PNG
- Safe zone Expo enforces: **528×528 px centered** (conservative vs. Android's 66dp)
- Full adaptive + monochrome (Android 13+) support since PR #20074 (Nov 2022)
- iOS dark/tinted via object form of `ios.icon` (SDK 52+)
- Runs at `expo prebuild`; outputs go directly into the generated `ios/` and `android/` folders

### 5d. Android Studio Asset Studio (reference-only GUI)

- `File > New > Image Asset` inside Android Studio
- Three tabs: Foreground Layer, Background Layer, Options (where monochrome is added since Giraffe/Hedgehog)
- Generates everything under `mipmap-anydpi-v26/` + density-specific fallbacks + `ic_launcher.xml`
- Useful as source-of-truth reference for what the Android XML output should look like, even if the project generates assets from a different pipeline

### 5e. Apple Icon Composer (reference-only GUI)

- Bundled with Xcode 26: `Xcode > Open Developer Tool > Icon Composer`
- Outputs `.icon` bundle with SVG/PNG layers, per-appearance and per-platform overrides
- No CLI as of 2026 — GUI-only; OSS alternative does not yet exist
- Useful as spec reference for the `.icon` internal JSON structure if `prompt-to-asset` later emits it

---

## 6. Sources

- [Apple — Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer) — authoritative `.icon` / Xcode 26 behavior, replacement of asset catalogs
- [Apple — Asset Catalog Format Reference: AppIconType](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html) — legacy `Contents.json` schema
- [tva.sg — Fixing App Store Icon Rejections](https://www.tva.sg/insights/fixing-app-store-icon-rejections) — sRGB / alpha / indexed-palette rejection specifics (`ITMS-90717`)
- [Hybrid Heroes — iOS 18 Dark & Tinted Icons](https://hybridheroes.de/blog/ios18-app-icons) — dark/tinted `appearances` JSON schema and design rules
- [Android Developers — Adaptive Icons (icon_design_adaptive)](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) — 108/72/66 dp canvas spec
- [Android Developers — AdaptiveIconDrawable reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable) — XML element semantics
- [siddroid.com — Supporting adaptive themed icons on Android 13](https://siddroid.com/post/android/supporting-adaptive-themed-icons-on-android-13/) — `<monochrome>` practical implementation
- [web.dev — Maskable icons](https://web.dev/articles/maskable-icon) — 40% safe-zone spec, W3C standardized safe area, purpose field semantics
- [W3C WD-appmanifest-20250505](https://www.w3.org/TR/2025/WD-appmanifest-20250505/) — `purpose: monochrome` and manifest icon normative rules
- [Rudrank Riyam — visionOS App Icon Fundamentals](https://rudrank.com/vision-os-fundamentals-creating-app-icon) — 3-layer back/middle/front glass stack
- [GitHub — ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) + issue #522 / PR #417 — adaptive-icon inset bug and padding option
- [GitHub — elegantapp/pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) — maskable/apple-touch-icon generation
- [Expo docs — Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon) + [Expo PR #20074](https://github.com/expo/expo/pull/20074) — `monochromeImage` and 528×528 safe zone
