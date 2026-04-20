# App Icon & Splash Screen Fan-Out — External Research

**Status:** Research digest for `asset_generate_app_icon` (MCP tool). Input: 1024² master PNG (+ optional foreground/background/monochrome variants). Output: platform-correct bundles for iOS `AppIcon.appiconset`, Android adaptive icons, PWA manifest icons, visionOS layered icon, and Windows/favicon artifacts.

**Research value: high** — The space has mature OSS fan-out tools, but none is a perfect fit for a stack-agnostic generator that emits file trees rather than mutating a host project. A **sharp-based custom generator that reuses the schemas codified by `@capacitor/assets` and `pwa-asset-generator`** is the right shape; this doc captures the spec truth needed to build and validate it.

---

## 1. Tool landscape

### 1.1 `@capacitor/assets` (Ionic)

- **License:** MIT. Repo: `ionic-team/capacitor-assets`. Latest: 3.0.5 (Mar 2024). Actively used (~250k weekly downloads) but slow release cadence.
- **Inputs:** `assets/icon-only.png` OR trio `icon-foreground.png` + `icon-background.png` (+`logo.png` dark mode), `splash.png`, `splash-dark.png`. Icons ≥ 1024², splash ≥ 2732².
- **Outputs:** Writes *directly into* `ios/App/App/Assets.xcassets/AppIcon.appiconset`, `android/app/src/main/res/mipmap-*`, and a `manifest.webmanifest` stub. Assumes a Capacitor project layout — it will not run as a pure "1024 in → file tree out" generator without stubbing the native folders.
- **Coverage:** iOS full `Contents.json`, Android 8+ adaptive icons (foreground + background), Android 12 splash-icon variant, PWA 192/512 + maskable. iOS splash uses storyboard + 2732² art.
- **Gotchas:**
  - **No monochrome/themed-icon (Android 13+) support.** Open issue [#428](https://github.com/ionic-team/capacitor-assets/issues/428) since 2022; none of three proposals (auto-threshold, user filter, separate asset) have landed.
  - Known adaptive-icon inset bug (`android:inset="16.7%"` → black edge; workaround `16.6%`, issue #522).
  - No visionOS layered-icon support.

### 1.2 `pwa-asset-generator` (elegantapp)

- **License:** MIT. Repo: `elegantapp/pwa-asset-generator`. Latest: 8.1.4 (Mar 2026). ~17.6k weekly downloads, 3k★.
- **Inputs:** Any raster/SVG/HTML source. Can take a URL.
- **Outputs:** Favicons, Apple touch icons, Apple splash images (full matrix of device resolutions w/ `media` queries), mstile, Android Chrome icons, plus auto-patches `manifest.json` and `index.html`.
- **Stack:** Puppeteer + headless Chromium — renders source into a browser canvas. This is the "heavy dependency" caveat; Chromium adds ~170 MB to a Node deployment.
- **Coverage:** Best-in-class for **web/PWA + iOS Safari splash** (no one else generates the full Apple launch-image matrix). No native Android adaptive icons, no Xcode `.xcassets`, no visionOS.
- **Gotchas:** Not a native-mobile tool. Mstile images are still emitted but MS retired pinned tiles. Chromium dependency is a deploy/CI footprint problem in a slim MCP server.

### 1.3 `@expo/cli prebuild` / EAS Build

- **License:** MIT (`expo/expo` monorepo).
- **Inputs:** `app.json` fields: `icon` (1024² PNG), `ios.icon` (object with `light`/`dark`/`tinted` or new `.icon` bundle from Apple's Icon Composer — SDK 54+), `android.adaptiveIcon.{foregroundImage, backgroundColor|backgroundImage, monochromeImage}`, `expo-splash-screen` plugin config.
- **Outputs:** Native `ios/` and `android/` projects populated with all sizes (EAS Build runs the fan-out at build time for managed workflows).
- **Coverage:** iOS (incl. dark/tinted since iOS 18), Android adaptive + **monochrome** (official config key), splash (Android 12 splash-icon API + iOS storyboard).
- **Gotchas:** Couples fan-out to Expo project conventions. Not a standalone CLI you can invoke against an arbitrary output dir. Irrelevant for non-Expo consumers.

### 1.4 `react-native-make`

- **Original (`@bam.tech/react-native-make`):** MIT. **Abandoned** — last release 3.0.3 in May 2021.
- **Active fork (`@coachcare/react-native-make`):** last update Apr 2024.
- **Commands:** `set-icon` (1024² source), `set-splash` (3000² source, uses iOS storyboard).
- **Coverage:** iOS + Android only. No PWA, no monochrome, no visionOS. Writes directly into an RN project.

### 1.5 `cordova-res`

- **License:** MIT. **Unmaintained** — last release 0.15.4 Dec 2021, Snyk health 51/100, Ionic explicitly says "migrate to Capacitor." Do **not** adopt for new work.

### 1.6 PWA Builder Image Generator (Microsoft)

- **License:** MIT (`pwa-builder/PWABuilder`, `pwa-builder/pwabuilder-Image-Generator`). Also exposed as a hosted web tool + REST API.
- **Inputs:** Source image + optional padding/background.
- **Outputs:** Android/Chrome/Firefox/iOS/Teams/Windows 10/Windows 11 raster sets; writes a `manifest.json` fragment.
- **Coverage:** Broad but web/Windows-centric. Good Windows 11 tile coverage that nobody else does.
- **Gotchas:**
  - PWABuilder itself warns against combining `"any maskable"` on one icon — **ship separate entries** for `any` and `maskable`.
  - Emits `monochrome` only if explicitly supplied; tool does not synthesize.
  - No iOS `.xcassets` or Android adaptive XML.

### 1.7 `icon-gen` (akabekobeko)

- **License:** MIT. v5.0.0 (Jul 2024). ~26.5k weekly downloads. Uses sharp internally.
- **Inputs:** SVG or PNG (needs specific sizes for ICNS).
- **Outputs:** Windows `.ico`, macOS `.icns`, favicon PNG set + `favicon.ico`. Default ICO sizes `[16,24,32,48,64,128,256]`, ICNS `[16,32,64,128,256,512,1024]`.
- **Use as a component library** for ICO/ICNS encoding; does not handle iOS `.xcassets`, Android adaptive, or PWA manifest.

### 1.8 "`icon-pack-generator`"

No canonical npm package under this exact name is widely used. What surfaces: the `iconpackgen.com` web service (AI style-pack generator, unrelated to app-icon fan-out) and `Iconpackr` (SVG → component lib). **Not applicable** for app-icon emission; skip.

### 1.9 Sharp-based custom generators

- **`sharp` (libvips):** MIT/Apache licensed core — the canonical resizer (bicubic/Lanczos, full alpha, premultiplied compositing). Already used by `icon-gen`, `@capacitor/assets`, `pwa-asset-generator` internals.
- **`sharp-ico`:** MIT. `sharpsToIco()` / `sharpsFromIco()` — multi-size ICO encode/decode as Sharp pipelines (default `[256,128,64,48,32,24,16]`).
- **`imgico`:** MIT, sharp-only dependency, PNG/JPG/SVG → ICO.
- **`pwa-icons`:** MIT, sharp-based, "118 icons in <1s", handles `apple-touch-icon` padding + white background.
- **Pros:** Zero native-project assumptions, tiny footprint, deterministic output, easy to unit-test. You own the schema mapping.
- **Cons:** You write (and maintain) the spec emitters yourself — `Contents.json`, `ic_launcher.xml`, manifest JSON, visionOS layered `Contents.json`. That is the real cost.

---

## 2. Spec truth (what the emitters must produce)

### 2.1 iOS `AppIcon.appiconset/Contents.json` — Xcode 14+ single-size form

Apple's "single size" mode accepts one 1024² PNG and lets Xcode downsample at build time. This is the **recommended default** for Xcode 14+ targets.

```json
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

For older Xcode or explicit pre-rendered sets you still emit per-idiom entries (`iphone`, `ipad`, `ios-marketing`) with `scale` (`2x`/`3x`) and explicit `size` (e.g. `60x60`, `76x76`, `83.5x83.5`, `1024x1024`). iOS 18 adds **dark** and **tinted** variants expressed via an `appearances` array inside each image entry (tinted is single-channel luminance; Apple auto-tints).

**visionOS layered icon (separate `.solidimagestack`):** up to 3 square 1024² PNG layers (back = opaque full-bleed, middle + front = transparent), system applies a circular mask and parallax. Minimum two layers required to trigger shadow/layering. Emit as its own asset inside the same `.xcassets`.

### 2.2 Android adaptive icon XML

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
```

- Layers are **108×108 dp**. Safe zone **66×66 dp** (never clipped). Visible mask zone **72×72 dp**. Logo **≥48×48 dp, ≤66×66 dp**. Outer 18 dp on each side reserved for parallax/pulse.
- **Android 13+ monochrome:** place the variant with `<monochrome>` in `res/mipmap-anydpi-v26/ic_launcher.xml` (not `v33` — v26 is still the folder; the monochrome element itself is read only on API 33+). Placing the monochrome-bearing file under `drawable-anydpi-v33/` is an unnecessary (and miscategorised) variant — avoid.
- **Monochrome source image:** a single-layer silhouette where *only the alpha channel matters*; Android tints it at runtime using Monet. It must not include color; treat non-alpha pixels as fill-white.
- Emit legacy `ic_launcher.png` at mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi (48/72/96/144/192 px) for pre-Oreo devices.
- Rendered Play Store icon is the 512² `playstore-icon.png` — **no** adaptive mask applied, so design must also read as a standalone square.

### 2.3 Web App Manifest `icons[]`

```json
{
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "icon-monochrome-512.png", "sizes": "512x512", "type": "image/png", "purpose": "monochrome" },
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

- **Do not combine `"any maskable"` on one entry.** web.dev and PWABuilder both explicitly warn — maskable icons add padding that shrinks the "any" use case. Emit **separate files and entries**.
- **Maskable safe zone:** central circle, radius = **40% of min(width,height)**. Outer 10% may be cropped by any platform mask. (w3c/manifest + web.dev.)
- **`purpose: "monochrome"`:** opaque shape, color discarded, alpha used as a mask. Useful for notification badges and pinned icons.
- Minimum set PWA installers expect: **192² + 512² `any`**, plus 512² `maskable` (Chrome/Edge) and a `monochrome` for Android notifications.
- For Safari iOS, manifest icons are **ignored**; emit `apple-touch-icon` (180² PNG on white, no transparency, no alpha) as a separate `<link>` tag. Apple splash images still require `<link rel="apple-touch-startup-image" media="...">` per-device — this is the pain point `pwa-asset-generator` exists to solve.

---

## 3. Recommendation for `asset_generate_app_icon`

**Build a sharp-based custom generator** (package: internal, e.g. `@prompt-to-asset/app-icon-fanout`). Rationale:

1. The MCP tool's contract is "1024² master → file tree output", not "mutate a Capacitor/Expo/RN project." Every turnkey tool (`@capacitor/assets`, `expo prebuild`, `react-native-make`) assumes the latter and would need stubbing + post-processing to fit.
2. Monochrome-layer support is the deciding feature for 2025+ Android, and `@capacitor/assets` still lacks it 3 years on. You must own this anyway.
3. Sharp is already the internal engine of the three leading tools; building on it directly removes the Puppeteer/Chromium footprint (`pwa-asset-generator`) that is wrong for a lightweight MCP server.
4. Spec emitters (`Contents.json`, `ic_launcher.xml`, manifest `icons[]`, visionOS layered catalog) are small, static, and testable.

**Compose, don't reinvent:**
- **`sharp`** — resize, composite, maskable padding.
- **`sharp-ico`** — favicon `.ico` multi-size.
- **`icon-gen`** — macOS `.icns` (Electron/macOS output lane), if relevant.
- Borrow the **input layout** and **naming** of `@capacitor/assets` (`icon-only`, `icon-foreground`, `icon-background`, plus an explicit `icon-monochrome`) so it is familiar to Ionic users.
- Borrow the **Apple splash media-query matrix** from `pwa-asset-generator`'s tables rather than regenerating via Chromium.

**Validation ladder:**
- Xcode's asset-catalog validator (run `xcrun actool --validate` in CI).
- Android Studio lint `MonochromeLauncherIcon` must not fire.
- Chrome DevTools → Application → "Show only minimum safe area for maskable icons".
- Lighthouse PWA audit for manifest `icons[]` completeness.

---

## 4. Sources

- Capacitor docs, *Splash Screens and Icons*: <https://capacitorjs.com/docs/guides/splash-screens-and-icons>
- `ionic-team/capacitor-assets` README + issues #428 (themed icons), #522 (inset bug): <https://github.com/ionic-team/capacitor-assets>
- `elegantapp/pwa-asset-generator` README: <https://github.com/elegantapp/pwa-asset-generator>
- Expo docs, *Splash screen and app icon*: <https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/>
- Android Developers, *Adaptive icons* (layer specs, safe zone, themed icons): <https://developer.android.com/develop/ui/views/launch/icon_design_adaptive>
- web.dev, *Adaptive icon support in PWAs with maskable icons* (40% safe zone, `purpose` semantics): <https://web.dev/articles/maskable-icon>
- MDN, *Web app manifest `icons`* (monochrome/maskable/any, multi-purpose, type hints): <https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/icons>
- Apple, *Asset Catalog Format Reference: App Icon Type* + Xcode 14 single-size workflow writeup: <https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html>
- Create with Swift, *Adapting your App Icon to visionOS* (3-layer 1024² spec, circular mask): <https://createwithswift.com/adapting-your-app-icon-to-visionos>
- `akabekobeko/npm-icon-gen` (ICO/ICNS): <https://github.com/akabekobeko/npm-icon-gen>
- `ssnangua/sharp-ico`: <https://github.com/ssnangua/sharp-ico>
- `pwa-builder/pwabuilder-Image-Generator` + quality-check guidance on not combining `any maskable`: <https://github.com/pwa-builder/PWABuilder/issues/1575>
- Snyk advisor, `cordova-res` (unmaintained): <https://snyk.io/advisor/npm-package/cordova-res>
