---
title: "Android Adaptive Icons, Themed Icons, and Play Store Asset Pipeline for AI-Assisted Generation"
category: 09-app-icon-generation
angle: 9b
author: research-subagent-9b
date: 2026-04-19
sources_primary:
  - https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
  - https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable
  - https://developer.android.com/studio/write/create-app-icons
  - https://developer.android.com/training/multiscreen/screendensities
  - https://developer.android.com/distribute/google-play/resources/icon-design-specifications
  - https://source.android.com/docs/core/display/adaptive-icons
  - https://support.google.com/googleplay/android-developer/answer/9866151
  - https://firebase.google.com/docs/ai-logic/generate-images-gemini
  - https://ai.google.dev/gemini-api/docs/image-generation
tags:
  - android
  - adaptive-icon
  - themed-icon
  - material-you
  - play-store
  - density-qualifiers
  - monochrome
  - ai-prompting
---

# Android Adaptive Icons, Themed Icons, and Play Store Asset Pipeline

## Executive Summary

Android iconography is the hardest platform to target with naive AI image generation because a single "app icon" is actually a **composite of at least five artifacts** that must render correctly across wildly different device conditions:

1. A **foreground vector/bitmap layer** (108×108 dp, with important content constrained to the center 72×72 dp safe zone).
2. A **background layer** (108×108 dp, edge-to-edge, pure graphic — no logo content).
3. A **monochrome layer** (same geometry, solid single-color silhouette, required for Android 13+ themed-icon / Material You tinting).
4. **Legacy mipmap PNGs** at five density qualifiers (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi) for pre–API 26 devices.
5. A **512×512 32-bit PNG "high-res icon"** plus optional 1024×500 feature graphic for the Play Store listing.

The OEM launcher then applies one of several **shape masks** — circle (Pixel), squircle (Samsung One UI), rounded square, teardrop, hexagon — and clips your foreground to that shape at runtime. Any design that places the logomark near the edge of the 108 dp canvas will get sliced off on Samsung devices, and any themed-icon layer that uses gradients, color, or anti-aliased shadow will render as blurry mud under Material You tinting.

**Top three findings for prompt-to-asset design:**

1. **Always prompt for layered output, not a "finished icon."** The correct AI artifact for Android is *two* (or three) images: `foreground` (transparent RGBA, subject centered in the middle 66 % of the frame), `background` (opaque pattern or solid color, full-bleed), and `monochrome` (single-color silhouette, transparent RGBA). Asking for "an Android app icon" and then splitting it post-hoc produces far worse results than conditioning the model on the three-layer spec up front.
2. **Enforce the 48–66 dp logomark constraint in the prompt.** The official [Adaptive icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) guidance says the logo should occupy **at least 48×48 dp and at most 66×66 dp** of the 108 dp canvas — roughly 44–61 % of the frame. Models left to their own devices will fill the canvas edge-to-edge and get clipped by every non-square mask.
3. **Monochrome is a structural, not tonal, problem.** Themed icons are recolored by the launcher by multiplying a single tint against the alpha channel; anything that relies on internal color contrast (two-tone logos, gradients, drop shadows) collapses. The monochrome layer must be a **solid-alpha silhouette of the primary mark only**, sized to the smaller 36–60 dp themed-icon safe zone, not the 66 dp adaptive safe zone.

The remainder of this document specifies the geometry, enumerates the density matrix, gives a concrete prompt strategy for Gemini / Imagen / DALL·E-class models, and documents the Play Store upload rules.

## Adaptive Icon Geometry

Adaptive icons shipped in **Android 8.0 (API 26)** via `AdaptiveIconDrawable` ([API reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)) and are mandatory for any modern launcher icon.

### Canvas

- **Both layers are 108 × 108 dp.**
- A **18 dp margin** is reserved on every side for launcher visual effects (parallax on the Pixel Launcher, pulsing on notifications, zoom-on-open on some OEM launchers). This outer ring is *always clipped* by the mask.
- The central **72 × 72 dp "viewport"** is the only area guaranteed to be visible on every device.
- The safe zone is actually a **66 dp circle inscribed in the 72 dp square** (33 dp radius) — this is because every mask shape (circle, squircle, teardrop, rounded square, hexagon) is required by AOSP to fully contain that circle. The `IconShape.java` in [Launcher3 source](https://android.googlesource.com/platform/packages/apps/Launcher3/+/42a9ef0/src/com/android/launcher3/graphics/IconShape.java) defines the mask geometries.

### Logomark sizing

Per [developer.android.com](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive):

- **Logo minimum**: 48 × 48 dp.
- **Logo maximum**: 66 × 66 dp.
- **Recommended**: ~54–60 dp (keeps visual weight consistent with system icons).

Under 48 dp the mark looks lost inside the mask; over 66 dp the corners bleed into the parallax zone on Samsung's squircle.

### Layer structure

```xml
<!-- res/mipmap-anydpi-v26/ic_launcher.xml -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
```

- **Foreground**: branding element (logomark). Must have clean edges, **no baked-in drop shadow, no pre-rendered mask, no container shape** — the launcher supplies shadow and mask.
- **Background**: fills the entire 108 dp canvas. Solid color, gradient, or pattern. Must not contain text or the primary logomark (that belongs to the foreground, where parallax applies).
- **Monochrome**: solid-alpha silhouette, added in API 33 (Android 13). See [Themed Icon Requirements](#themed-icon-requirements) below.

Both background and foreground may be **vector drawables** (`<vector>`), **bitmap/WebP**, or a combination. Google strongly recommends vectors because a single file serves every density bucket. The [Create app icons](https://developer.android.com/studio/write/create-app-icons) Android Studio doc notes Image Asset Studio only emits `ic_launcher_foreground.xml` when source is Clip Art / Color / Text; uploading a raster PNG produces WebP bitmaps in each `mipmap-<density>` folder instead.

### Manifest wiring

```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ... >
```

Critical: **if you declare `android:roundIcon`, its XML must also contain the `<monochrome>` element** — otherwise themed-icon mode on a Samsung device (which picks `roundIcon`) will silently fall back to the non-themed colored icon. Multiple [Stack Overflow reports](https://stackoverflow.com/questions/78176570/how-do-i-fix-this-warning-in-android-studio-monochrome-icon-is-not-defined) document this as a "my themed icon doesn't work" failure mode.

### Mask shapes

Pixel Launcher applies a **circle**; Samsung One UI defaults to a **squircle**; OnePlus and Xiaomi expose user-selectable masks; AOSP reference launcher supports circle, square, rounded-square, squircle, and teardrop. Any asset created for Android must be visually robust under *all* of these. The practical heuristic: if the design works when cropped to a circle and also to a square, it works everywhere.

## Themed Icon Requirements

Themed icons arrived in **Android 13 (API 33)** as part of the Material You / Monet dynamic color system.

### How themed icons render

When a user enables "Themed icons" in Wallpaper & style, the launcher:

1. Ignores the adaptive icon's `<foreground>` and `<background>`.
2. Takes the `<monochrome>` drawable.
3. Fills it with a **tonal color derived from the current wallpaper** (`@android:color/system_accent1_100` / `_200` roughly, depending on light/dark mode).
4. Composites it onto a tinted circle background from the same tonal palette.

This means the monochrome layer is **purely alpha**: its RGB values are discarded and replaced. Any gradients, colored highlights, or anti-aliased shadows that depend on hue will be flattened to a single shade.

### Dimensions (from [developer.android.com](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) and [Adrián García's Medium write-up](https://medium.com/@adrian.gl/themed-app-icons-in-android-13-c1fd5208447c))

- **Canvas**: 108 × 108 dp (same as other layers).
- **Container / safe zone**: **90 × 90 dp** (tighter than the adaptive 72 dp because the launcher adds its own tonal plate).
- **Icon maximum**: 60 × 60 dp.
- **Icon recommended**: 36 × 36 dp.
- **Icon minimum**: 48 × 48 dp (matches the smaller adaptive minimum).

The themed-icon safe zone is **smaller than the adaptive safe zone** because the tonal background plate already provides visual weight — a mark that looked "right-sized" in the adaptive foreground will look bloated once the launcher wraps it in a tinted circle.

### Design rules for monochrome

- **Solid shape only.** No photos, no gradients, no strokes less than 3 dp.
- **Single logical silhouette.** If the foreground is a two-color brandmark, the monochrome should be the dominant glyph with inner detail expressed via alpha cut-outs, not color.
- **Clean edges.** No soft shadow falloff — the launcher's tint will smear any alpha gradient into a muddy halo.
- **Transparency preserved.** The monochrome drawable is RGBA; the launcher multiplies `accent1_100` against each pixel's alpha.

### XML

```xml
<adaptive-icon ...>
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
```

The monochrome drawable can be a vector `<vector>` with `android:fillColor="#FFFFFFFF"` (launcher replaces the color anyway) or a PNG with the silhouette in any single color on a transparent background.

### Gating

> **Updated 2026-04-21:** Android 16 QPR2 (shipped December 2025) changed the gating model significantly. See the section below.

Themed icons only display when **all four** conditions hold: device is on Android 13+, OEM has Monet enabled (all Pixels do; Samsung One UI 5+ does; Huawei EMUI does not), the launcher supports it, and the user has toggled "Themed icons" in Wallpaper & style. If any condition fails the launcher falls back to the regular adaptive icon. **This means the monochrome layer is an additive requirement, not a replacement** — never ship an app with only a monochrome layer.

### Android 16 QPR2 — mandatory auto-theming (December 2025+)

Android 16 QPR2 shipped in December 2025 and changed the optionality of themed icons:

- **Auto-theming is now mandatory.** If an app does not supply a `<monochrome>` layer, the OS applies a color-filtering algorithm to the existing adaptive foreground to generate one automatically. Developers cannot opt out.
- **Google Play DDA updated.** Revisions to DDA section 5.3, effective September 15 2025 for new developers and October 15 2025 for existing developers, require that apps "grant to users permission to modify colors or adjust themes of apps." This is now a Play Store policy requirement, not just a platform feature.
- **Three OS-generated icon modes:** Default (developer-authored icon), Minimal (auto-monochrome from foreground), and Create (user-customizable). The auto-generated monochrome fallback uses a color-filtering algorithm and is reliably inferior to a hand-authored `<monochrome>` layer for complex brandmarks.
- **Recommendation:** The `<monochrome>` layer has changed from "recommended" to effectively required for any app targeting Android 13+ and distributed through Google Play. Apps without a monochrome layer on Android 16 QPR2+ devices will display a system-generated monochrome that may not represent the brand correctly.

Sources: [Android 16 QPR2 Beta 1 blog post](https://android-developers.googleblog.com/2025/08/android-16-qpr2-beta-1-is-here.html), [Android Police — Google mandates themed icon support](https://www.androidpolice.com/google-forces-android-app-developers-to-play-nice-with-themed-icons/), [9to5Google — Android 16 auto-themed icons](https://9to5google.com/2025/09/16/android-16-auto-themed-icons-apps-cant-opt-out/).

## Density Matrix

Android's density system uses the **dp** (density-independent pixel) as its authoring unit; each physical device maps dp to px via a scale factor. All five density qualifiers must be considered for a complete icon package, though vector drawables (VectorDrawable / XML) collapse this matrix into a single file.

### Density bucket reference

| Qualifier | DPI | Scale | Screen example |
|-----------|-----|-------|----------------|
| `mdpi` | 160 | 1.0× | Baseline (no modern phones) |
| `hdpi` | 240 | 1.5× | Early Android phones, low-end tablets |
| `xhdpi` | 320 | 2.0× | Common in 2013–2015 phones |
| `xxhdpi` | 480 | 3.0× | Most modern phones |
| `xxxhdpi` | 640 | 4.0× | Pixel 6+, Galaxy S22+, flagship 2023–2026 |

Source: [Support different pixel densities](https://developer.android.com/training/multiscreen/screendensities).

### Legacy launcher icon sizes (pre-API 26, still required for backward compatibility)

Legacy icons live in `res/mipmap-<density>/` as PNG or WebP. Baseline 48 dp:

| Folder | Pixel size |
|--------|-----------|
| `mipmap-mdpi/` | 48 × 48 px |
| `mipmap-hdpi/` | 72 × 72 px |
| `mipmap-xhdpi/` | 96 × 96 px |
| `mipmap-xxhdpi/` | 144 × 144 px |
| `mipmap-xxxhdpi/` | 192 × 192 px |

Place in `mipmap-*` (not `drawable-*`) so that APK slicing tools do not strip higher-density variants when building for a lower-density target device.

### Adaptive layer sizes (API 26+, one pair per density)

The 108 dp canvas expands with density:

| Folder | Full layer (px) | Safe zone (px) | Logomark target (48–66 dp) |
|--------|-----------------|----------------|----------------------------|
| `mipmap-mdpi/` | 108 × 108 | 72 × 72 | 48–66 px |
| `mipmap-hdpi/` | 162 × 162 | 108 × 108 | 72–99 px |
| `mipmap-xhdpi/` | 216 × 216 | 144 × 144 | 96–132 px |
| `mipmap-xxhdpi/` | 324 × 324 | 216 × 216 | 144–198 px |
| `mipmap-xxxhdpi/` | 432 × 432 | 288 × 288 | 192–264 px |

The adaptive icon *XML* itself lives in a density-agnostic directory: `mipmap-anydpi-v26/ic_launcher.xml`. The `-v26` qualifier makes pre-Oreo devices fall back to the legacy PNGs automatically.

### Why prefer vector drawables

For AI-generated content, the tension is that models produce raster output, but the target is a vector-friendly pipeline. Practical decision rule:

- **Background layer**: almost always safe to render as vector (solid color, linear gradient, or simple geometric pattern). Use `<shape>` or `<vector>`.
- **Foreground layer**: if the logomark is a simple silhouette, vectorize (potrace / vtracer) from the AI raster; if it's illustrative, ship as bitmap WebP at `mipmap-xxxhdpi` (432×432 foreground) and let Android downscale.
- **Monochrome layer**: always vectorize — single color, crisp edges, tiny file.

## Prompt Strategy — Layered Generation

The core insight for a prompt-to-asset targeting Android is that a *single* image generation call is almost always wrong; the correct unit of work is **three parallel calls sharing a style anchor**. This section codifies that strategy for Gemini 3 Pro Image ("Nano Banana Pro"), Gemini 3.1 Flash Image (Nano Banana 2), Imagen 4, DALL·E 3, and GPT Image 1.5.

> **Updated 2026-04-21:** Gemini 2.5 Flash Image was shut down January 15, 2026; current model is Gemini 3.1 Flash Image. GPT Image 1.5 replaces gpt-image-1 as the primary OpenAI model. Both Gemini image models require billing as of December 2025 — the free API tier returns HTTP 429.

### Pattern A: Split generation (preferred)

> **Updated 2026-04-21:** Due to Android 16 QPR2's mandatory auto-theming, the monochrome layer has moved from optional to effectively required. Always generate all three layers. The auto-generated system fallback is typically inferior to a hand-authored monochrome for multi-element or gradient-heavy brandmarks.

Generate three separate images, all 1024 × 1024 (models oversample this better than 432×432), post-process to the density matrix.

**Shared style anchor** (prepended to each of the three prompts):

```
Style: flat vector, 2-color brand palette #0055FF primary + #FFFFFF,
clean geometric shapes, no drop shadow, no gradient, no text, no photorealism.
```

**Foreground prompt:**

```
<style anchor>
A centered, solid silhouette of a stylized paper airplane tilting 15° upward-right,
occupying exactly 55% of the square canvas (approximately 565x565 px of 1024x1024),
fully transparent background (RGBA, alpha=0 outside subject), no container shape,
no circle behind subject, clean hard edges.
```

**Background prompt:**

```
<style anchor>
A full-bleed 1024x1024 background: a smooth diagonal gradient from #0055FF
(top-left) to #0033CC (bottom-right). No subject, no logo, no text. Opaque.
```

**Monochrome prompt:**

```
<style anchor>
A solid-white silhouette of the SAME stylized paper airplane tilting 15° upward-right,
centered, occupying exactly 40% of the square canvas (approximately 410x410 px of 1024x1024),
fully transparent background, no inner detail except alpha cutouts,
no gradient, no stroke, no shadow. The silhouette must be pure white (#FFFFFF)
on transparent — it will be recolored by the system.
```

Key prompt-engineering observations:

- **Explicit pixel coordinates** outperform percentages on Imagen/Gemini; DALL·E 3 ignores pixel math and responds better to "occupying roughly half the frame."
- **"No container shape"** is essential — all three models default to drawing a colored circle or squircle behind the mark, which double-masks when the launcher applies its own shape.
- **"Transparent background (RGBA, alpha=0)"** must be stated explicitly. Per [category 13 research notes on transparency](../13-transparent-backgrounds/), Nano Banana Pro and GPT-image-1 reliably emit alpha channels; Imagen 4 does not and requires a rembg/BRIA RMBG post-pass.
- **Repeat the subject description verbatim** across the foreground and monochrome prompts so the silhouette geometry matches. Do not rely on "the same shape" referential language — each call is independent.

### Pattern B: Single generation + split

Generate one 1024×1024 "hero" icon, then programmatically:

1. Run background removal (BRIA RMBG 2.0 or `rembg -m birefnet-general`) → foreground RGBA.
2. Take the median color of the removed pixels → background solid color, OR generate a separate background via Pattern A's background prompt.
3. Take the alpha channel of the foreground, threshold at 0.5, fill with white → monochrome RGBA.
4. Resize to the density matrix.

This is what [icon.kitchen](https://www.appiconkitchen.com/android-adaptive-icon-generator) and similar tools automate. It's faster and gives consistent cross-layer composition, but yields a weaker monochrome layer because the alpha threshold often includes interior brandmark detail that should have been cut out.

### Pattern C: Vector-first generation

For brand-consistent icons, generate SVG via Recraft v3 or Claude's SVG output, then convert:

1. Render SVG → raster at 1024×1024 for preview.
2. Emit SVG directly as `ic_launcher_foreground.xml` via svg2vectordrawable.
3. Manually author the monochrome SVG by replacing all fills with `#FFFFFF` and flattening to the dominant path.

This bypasses the raster→vector lossy step entirely but requires a vector-capable model. Category 12 (vector-svg-generation) research covers this track in depth.

### Prompt anti-patterns to strip from user input

A prompt-to-asset should detect and rewrite these common user errors:

| User writes | Problem | Rewrite to |
|-------------|---------|-----------|
| "app icon for Android" | Implies finished mask, single layer | "adaptive icon foreground layer, transparent background" |
| "rounded square icon" | Bakes a container that double-masks | "centered logomark, no container shape" |
| "with a shadow" | Launcher adds shadow; baked-in shadow clips on teardrop mask | "no drop shadow" |
| "with the text 'MyApp'" | Text at icon sizes is illegible; against Play Store rules for text-only icons | Strip text; offer to generate a wordmark-free logomark |
| "full bleed logo" | Clips on every non-square mask | "logomark occupying 55% of canvas, centered" |

## Play Store Specs

The Play Store listing requires assets distinct from the in-APK launcher icon. Per [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) and [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151):

### High-res app icon

- **Dimensions**: exactly 512 × 512 pixels (no ±1 tolerance — upload will reject).
- **Format**: 32-bit PNG with alpha channel.
- **Color space**: sRGB.
- **Max file size**: 1024 KB (1 MB).
- **Shape**: full square canvas. Google Play applies **rounded corners with a 30 % radius** dynamically at render time.
- **Shadow**: do not bake in — Play Console applies the drop shadow in store listings.
- **No ranking/deal/incentive text** ("Top app", "Editor's choice", "Free for a limited time") — grounds for rejection.

Note: one frequently-cited [Stack Overflow case](https://stackoverflow.com/questions/54717087/google-play-isnt-accepting-high-res-icon-although-it-is-512x512-and-32-bit-rgba) shows rejection even for "correctly" sized assets because the uploaded image was actually 520×520 and 8-bit — Play Console's validator is strict about both dimension and bit depth. A prompt-to-asset pipeline must verify with `identify -format "%wx%h %z-bit"` before handoff.

### Feature graphic

- **Dimensions**: exactly 1024 × 500 pixels.
- **Format**: JPEG or 24-bit PNG. **No alpha channel** — uploading a 32-bit PNG with transparency is rejected.
- **Max file size**: 15 MB (practically, keep under 1 MB).
- **Keep-out zone**: the bottom-right 200 × 80 px may be overlaid by a YouTube play button if you attach a promo video — no critical text there.
- **No time-sensitive promos or pricing** — grounds for rejection.
- **Legibility**: all text must read at 50 % scale (Play Store renders this asset at many sizes).

This is the asset most commonly generated with text-in-image models (Ideogram, Nano Banana Pro, GPT-image-1) because it's essentially a landscape marketing banner. Prompt guidance: treat it as a hero graphic, not an icon — different design language entirely.

### Relationship between the 512×512 icon and the adaptive in-app icon

A common mistake: treating the 512×512 Play Store icon as "just resize the xxxhdpi foreground to 512×512." This produces a launcher-looking icon sitting inside Google Play's 30 %-radius mask, which is visually noisy. Correct approach:

- The 512×512 is a **composed, presentation-ready icon**: foreground + background pre-composited into a single PNG that fills the square.
- It is not clipped on upload — Google Play applies its own corner radius at display time.
- It should visually match what a user sees on a Pixel home screen (circle-masked preview of the adaptive icon), so you typically render it by inscribing a 30 %-radius-rounded-square of your background layer with the foreground composited on top.

A one-line ImageMagick composition:

```bash
convert ic_launcher_background.png ic_launcher_foreground.png \
  -composite -resize 512x512 playstore_icon.png
```

## Tooling and Manual Pipelines

- **Android Studio Image Asset Studio**: File → New → Image Asset. Accepts PNG/JPEG/SVG foreground + color or image background. Emits `mipmap-anydpi-v26/ic_launcher.xml`, `ic_launcher_round.xml`, and per-density WebPs. Does not emit monochrome; you must add `<monochrome>` manually. See [Create app icons](https://developer.android.com/studio/write/create-app-icons).
- **icon.kitchen / AppIconKitchen**: web tool; accepts a single source image, removes background via AI, emits Android + iOS + Play Store ZIP including `ic_launcher_background.xml` and monochrome. Good fit for AI-generated raster input.
- **Capacitor / Expo Assets**: `npx @expo/configure-splash-screen` and `capacitor-assets` both consume a single source and emit adaptive icon bundles; useful when the AI pipeline feeds a cross-platform project.
- **svg2vectordrawable**: convert SVG → Android `<vector>` drawable. Required for vector monochrome layers.

## References

### Primary (Android / Google)

- [Adaptive icons (developer.android.com)](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) — canonical 108 dp / 72 dp / 66 dp spec, monochrome guidance.
- [AdaptiveIconDrawable API reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable) — API 26 addition, XML schema.
- [Create app icons (Android Studio)](https://developer.android.com/studio/write/create-app-icons) — Image Asset Studio workflow, mipmap vs drawable folder rules.
- [Support different pixel densities](https://developer.android.com/training/multiscreen/screendensities) — density qualifier matrix.
- [Implement adaptive icons (AOSP)](https://source.android.com/docs/core/display/adaptive-icons) — OEM mask shape integration.
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications) — 512×512 PNG rules.
- [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151) — feature graphic 1024×500 rules.
- [Launcher3 IconShape.java](https://android.googlesource.com/platform/packages/apps/Launcher3/+/42a9ef0/src/com/android/launcher3/graphics/IconShape.java) — source of truth for mask geometries.

### Community / Corroborating

- [Themed app icons in Android 13 — Adrián García (Medium)](https://medium.com/@adrian.gl/themed-app-icons-in-android-13-c1fd5208447c) — 90 dp / 60 dp / 36 dp themed-icon sizing.
- [Supporting adaptive themed icons on Android 13 — Sid Patil](https://siddroid.com/post/android/supporting-adaptive-themed-icons-on-android-13/) — four-condition gating detail.
- [StackOverflow: Monochrome icon not defined warning](https://stackoverflow.com/questions/78176570/how-do-i-fix-this-warning-in-android-studio-monochrome-icon-is-not-defined) — `roundIcon` requires monochrome too.
- [StackOverflow: 512×512 Play Store rejection](https://stackoverflow.com/questions/54717087/google-play-isnt-accepting-high-res-icon-although-it-is-512x512-and-32-bit-rgba) — bit-depth validation strictness.
- [AppIconKitchen Android Adaptive Icon Generator](https://www.appiconkitchen.com/android-adaptive-icon-generator) — reference workflow for AI-generated input.

### AI Image Generation (for prompt strategy)

- [Firebase AI Logic: Generate images with Gemini](https://firebase.google.com/docs/ai-logic/generate-images-gemini) — Nano Banana / Nano Banana Pro model availability, `responseModalities` requirement.
- [Gemini API image generation](https://ai.google.dev/gemini-api/docs/image-generation) — official prompt guide.

> **Updated 2026-04-21:** The Gemini API image generation free tier changed significantly. As of December 7, 2025, the free tier for image-generation models has 0 IPM (images per minute) — every image request from an unbilled project returns HTTP 429 `RESOURCE_EXHAUSTED`. Enabling billing (even with a $0 spending cap) moves the account to Tier 1 and unlocks image generation. The Gemini 3.1 Flash Image (Nano Banana 2) model is available as of early 2026 but has no free-tier API access. The AI Studio web UI at `https://aistudio.google.com` remains free for interactive generation — use `asset_ingest_external` to round-trip those results. Do NOT point users to the API as a free image-gen path for Gemini/Imagen models.

---

**Top 3 findings (replying to dispatcher):**

1. **Android icon generation is a three-layer problem, not a single-image problem.** A prompt-to-asset must decompose user intent into foreground (transparent RGBA, 55 % canvas occupancy), background (opaque full-bleed), and monochrome (alpha-only silhouette at 36–60 dp) prompts sharing a style anchor — generating one image and splitting works but produces a weaker monochrome.
2. **The 48–66 dp logomark bound (≈44–61 % of the 108 dp canvas) must be enforced in the prompt.** Every mask shape (circle, squircle, teardrop, rounded square, hexagon) is guaranteed to contain only the central 66 dp circle; anything bleeding into the outer 18 dp margin will clip on Samsung, OnePlus, and Xiaomi launchers.
3. **Play Store assets have strict, validator-enforced format rules that differ between icon and feature graphic.** The 512×512 app icon must be 32-bit PNG *with* alpha, no shadow, no container, no ranking text; the 1024×500 feature graphic must be 24-bit (no alpha) with nothing critical in the bottom-right 200×80 play-button zone. A prompt-to-asset pipeline should verify dimensions and bit depth with `identify` before handoff — bit-depth mismatches are the #1 cause of Play Console upload rejections.

**File:** `/Users/mohamedabdallah/Work/Projects/prompt-to-asset/docs/research/09-app-icon-generation/9b-android-adaptive-themed-icons.md`
