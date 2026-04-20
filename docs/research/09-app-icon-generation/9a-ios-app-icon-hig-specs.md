---
angle: 9a
category: 09-app-icon-generation
title: "iOS App Icon Specs & Apple Human Interface Guidelines: Sizes, Masks, Safe Zones, Dark/Tinted, Liquid Glass, visionOS"
research_value: high
last_updated: 2026-04-19
status: complete
primary_sources: official-apple
---

# 9a — iOS App Icon Specs & Apple HIG: Sizes, Masks, Safe Zones, Dark/Tinted, Liquid Glass, visionOS

**Research value: high** — Apple publishes a first-party icon spec that is narrow, precise, and enforced by `actool`/App Store Connect at submission time. A prompt-to-asset that targets iOS icons can encode Apple's rules (square canvas, no alpha, single-focus subject, ≈22.37 % continuous corner radius applied by the OS, Liquid Glass layer architecture) directly into the generation prompt and rule out the most common rejection modes before the image ever leaves the model.

## Scope

This digest aggregates Apple's authoritative app-icon guidance as of Xcode 26 / iOS 26 (April 2026) and back-references the iOS 18 dark+tinted expansion that introduced the three-appearance model. Target platforms covered:

- **iOS / iPadOS** (iPhone, iPad, iPad Pro) — the primary focus of this angle.
- **visionOS** — 3D parallax layered icons (front / middle / back).
- **macOS** (Big Sur squircle lineage, now unified under Icon Composer).
- **watchOS** — 1088 × 1088 canvas, circular mask.
- **App Clip Codes** — adjacent asset, briefly.

The canonical HIG entry is [Human Interface Guidelines → Foundations → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons). The authoring tool as of WWDC25 is **Icon Composer**, documented at [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer) and distributed at [developer.apple.com/icon-composer](https://developer.apple.com/icon-composer/).

## Executive summary

1. **Design at 1024 × 1024, let the OS mask.** Every modern Apple platform derives rendered sizes from a single 1024 × 1024 master (1088 × 1088 for watchOS Liquid Glass). Icons must be square, fully opaque, sRGB or Display P3, 8-bit PNG. The system applies the squircle mask, continuous corner smoothing, specular highlight, and (on iOS 26) the Liquid Glass material. ([HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), [Icon Composer doc](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer))
2. **Corners are a quintic superellipse (n ≈ 5), not a bezier rounded rectangle.** Corner radius ≈22.37 % of width, corner smoothing ≈60 %, C∞ continuous. A CSS `border-radius: 22%` looks subtly wrong next to system icons. ([Squircle.js](https://squircle.js.org/blog/squircles-in-apple-design))
3. **iOS 18 introduced three appearances: Default, Dark, Tinted.** iOS 26 inherits this and wraps all three in Liquid Glass. Tinted is a single-channel luminance image the system re-colors from wallpaper — not a filter over Default. Apps shipping only Default get an auto-tinted fallback that routinely looks wrong. ([Providing images for different appearances](https://developer.apple.com/documentation/uikit/providing-images-for-different-appearances))
4. **visionOS icons are 3-layer parallax stacks** (back opaque, middle/front alpha), not flat squares. The OS offsets layers in 3D and casts automatic shadows. ([Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon))
5. **HIG explicitly bans photos, screenshots, interface elements, and Apple hardware; words only if part of a logo.** Prompt templates that bake the company name into the icon are a common App Review failure. ([HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons))

## Size matrix (all Apple platforms)

Apple's Xcode 26 flow expects a single master; the older asset-catalog flow expects every size individually. Both are still valid. The table below lists every size Apple currently documents, in pixels, with the `@scale` and the context the system actually draws that size in.

### iOS / iPadOS

| Pixels | Points × scale | Usage | Required |
|---|---|---|---|
| 1024 × 1024 | 1024 @ 1x | App Store marketing asset (`AppStore` role) | **Yes** |
| 180 × 180 | 60 × 3 | iPhone home screen (Super Retina / Retina HD) | **Yes** |
| 167 × 167 | 83.5 × 2 | iPad Pro home screen | Yes (iPad build) |
| 152 × 152 | 76 × 2 | iPad / iPad mini home screen | Yes (iPad build) |
| 120 × 120 | 60 × 2, 40 × 3 | iPhone home (legacy), iPad Spotlight @3x | Yes |
| 87 × 87 | 29 × 3 | iPhone Settings | Yes |
| 80 × 80 | 40 × 2 | iPhone/iPad Spotlight | Yes |
| 76 × 76 | 76 × 1 | iPad home (1x, legacy) | Optional |
| 60 × 60 | 60 × 1, 20 × 3 | iPad notifications @3x | Optional |
| 58 × 58 | 29 × 2 | iPhone/iPad Settings | Yes |
| 40 × 40 | 40 × 1, 20 × 2 | Notifications @2x | Yes |
| 29 × 29 | 29 × 1 | Settings (1x, legacy) | Optional |
| 20 × 20 | 20 × 1 | Notifications (1x, legacy) | Optional |

Required sizes reconstructed from [Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon) and cross-checked against [IconikAI's 2026 iOS icon guide](https://www.iconikai.com/blog/ios-app-icon-size-guidelines-guide) and [IconBundlr's 2026 guide](https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide). Under Xcode 26 + Icon Composer you now provide only the 1024 master and the tooling emits the rest at build time.

### macOS

| Pixels | Usage |
|---|---|
| 1024 × 1024 | App Store / Finder Cover Flow |
| 512 × 512 (@1x, @2x source) | Finder icon, Launchpad |
| 256, 128, 64, 32, 16 × @1x/@2x | `.icns` slots |

macOS since Big Sur uses the same squircle mask as iOS and the same 1024 master, with system-applied materials and shadow. The older macOS "circle + hexagon + square" shape metaphors are gone as of Big Sur. ([Václav Vančura — macOS Big Sur icon template](https://vancura.design/blog/macos-big-sur-icon-template))

### watchOS

| Pixels | Usage |
|---|---|
| 1088 × 1088 | Icon Composer master for Liquid Glass watchOS |
| 216, 172, 80 | Apple Watch home circular clip (legacy asset catalog) |

Apple raised the watchOS canvas to 1088 × 1088 for Icon Composer because the watch home screen's circular mask crops more aggressively than a square; the extra 32 px on each edge is the bleed Apple wants the system, not you, to crop. ([Icon Composer doc](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer))

### visionOS

Three separate 1024 × 1024 layers: **Back** (opaque, no alpha), **Middle** (PNG with alpha, optional), **Front** (PNG with alpha, optional). Minimum 2 layers with drawn content required. See the visionOS section below for layer semantics.

### tvOS

Flat two-layer 1920 × 720 "top shelf" image plus a layered icon stack that mirrors the visionOS layering model.

### App Clip Code header image

`3:2` aspect, **1800 × 1200 px**, JPEG or PNG, for the App Clip card's hero. App Clip Codes themselves are generated as **SVG** and the visual code is configured through App Store Connect (color pattern + optional App Clip logo variant). ([Creating App Clip Codes with App Store Connect](https://developer.apple.com/documentation/appclip/creating-app-clip-codes-with-app-store-connect), [Offer a default App Clip experience](https://developer.apple.com/help/app-store-connect/offer-app-clip-experiences/offer-a-default-app-clip-experience/))

## Shape / mask semantics: the squircle is not a rounded rectangle

Apple's home-screen mask is a **quintic superellipse** — a Lamé curve |x/a|ⁿ + |y/b|ⁿ = 1 with n ≈ 5, not n = 2 (a circle) and not n = 4 (a true squircle). Practically:

- **Corner radius on a 1024 icon ≈ 229 px** (~22.37 % of width).
- **Corner smoothing ≈ 60 %** — the curve eases into the straight edge over about 60 % of the corner's quadrant rather than snapping at the tangent point of a circular arc.
- **Continuity is C∞** everywhere on the outline. A Figma/CSS rounded rectangle is C¹ at the arc-to-edge join and produces a subtle visible kink when tiled next to a system squircle.

This matters for prompts in three ways:

1. Telling the model "rounded square, 22% corner radius" reliably produces a **circular-arc** rounded rectangle, not a superellipse. The corners will look mildly pointy vs. system icons. Asking for "Apple squircle" or "iOS superellipse mask" in the negative space ("square composition, edges will be cropped by the system") is usually more effective than specifying the shape numerically.
2. Because the OS applies the mask, **you should not draw the squircle yourself.** HIG: "Keep icon corners square; the system applies rounding automatically." Icons with a pre-baked squircle get the mask applied a second time and lose ~3 px on each edge. ([HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons))
3. Apple's grid (on every template since iOS 7) aligns key elements to concentric squircles, not circles. When you overlay SF-style designs on the grid, the center-of-mass of the glyph should match the grid's geometric center, not the bounding-box center.

Sources: [Grida — Superellipse math](https://grida.co/docs/math/superellipse), [Squircle.js — How Apple Uses Squircles](https://squircle.js.org/blog/squircles-in-apple-design), [Jim Nielsen — Calculate the iOS Border Radius](https://blog.jim-nielsen.com/2012/calculate-the-ios-border-radius/).

## Safe zone rules

Apple has never published a numeric "safe zone" the way Android's adaptive-icon spec does, but the HIG grid and independent measurements converge on:

- **~10 % margin on all sides** for critical content on the 1024 canvas (i.e. primary glyph fits within the centered 820 × 820 area). This leaves room for the squircle crop plus Liquid Glass specular highlight inset.
- **Visual center, not geometric center.** Because the squircle is slightly fatter at the poles than at the corners, an optically-balanced logo sits ~1–2 % above the bounding-box center.
- **One focal element.** HIG: "Provide a single, centered focus point that either sits in the center or resides slightly above it, and that doesn't flow outside the icon."
- **Bleed the background to the edge.** The background must fill the full 1024; any gutter bands will be interpreted as part of the artwork and show as a hard border after the mask applies.

For iPad Pro (167 px), iPad (152 px), and the various notification/Settings sizes (29, 40, 58, 60, 80, 87), **details thinner than ~2 px at 1024** disappear. Rule of thumb: if your glyph contains strokes narrower than ~20 px on the 1024 master, they will not survive the 40 × 40 notification render. Community guides (IconikAI, AppIconKitchen) converge on a 90 % central safe zone for strokes and a 70–80 % central zone for typography. ([IconBundlr — iOS app icon sizes 2026](https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide), [AppIconKitchen — icon size guide 2026](https://www.appiconkitchen.com/posts/app-icon-size-guide-2026))

## Tinted and dark appearance (iOS 18+, iOS 26)

iOS 18 introduced three appearance variants users can switch between from the Home Screen long-press menu: **Default (Light)**, **Dark**, and **Tinted**. Xcode 16+ asset catalogs and Icon Composer files expose all three as independent image slots.

**Design rules Apple ships:**

- All three must use a **shared composition** so the glyph stays recognizable across modes. (HIG: "Keep variations visually related.")
- **Dark icons should not be a black box with a white glyph.** Apple's own system icons use gradients, opacity, and soft interior glows for the dark variant. Flat black + white glyph reads as an error state. ([Sketch Blog — Oh no, I need a tinted iOS 18 app icon](https://sketch.com/blog/tinted-app-icons))
- **Tinted is monochrome.** You provide a **single greyscale layer (no background)** that the system re-colors using the user's current wallpaper-derived tint. Transparency in the background is required — this is the one place the "no alpha" rule is inverted. The tint sampling is luminance-based, so mid-tones must carry the design (pure black goes fully dark, pure white goes fully saturated-tint).
- **Don't ship tinted = default's flattened grayscale.** Apple provides an automatic grayscale fallback; if yours isn't better than that, don't bother. Good tinted icons increase contrast, simplify gradients to solid fills, and often drop background ornamentation the default can carry. ([Koombea — Preparing App Icons for iOS 18 Dark and Tinted](https://www.koombea.com/blog/preparing-your-app-icon-for-ios-18-dark-and-tinted-modes/))

**Technical packaging:**

- In the Asset Catalog: three slots per icon set — `Any Appearance`, `Dark`, `Tinted`. Tinted expects a **single-channel luminance PNG** (background transparent).
- In Icon Composer: one file; each layer has `Default` / `Dark` / `Mono` fill settings, with `Mono` further splitting into `Clear` and `Tinted` previews. ([Icon Composer doc](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer))

## visionOS layered icons

visionOS renders app icons as a **parallax stack of up to three circular layers** that shift with head movement. Technical spec:

| Layer | Size | Alpha | Required | Role |
|---|---|---|---|---|
| Back | 1024 × 1024 | None (fully opaque) | Yes | Ground plane — background color, context, shadow receiver |
| Middle | 1024 × 1024 | PNG with transparency | Optional | Mid-depth elements, system casts a shadow onto back |
| Front | 1024 × 1024 | PNG with transparency | Optional | Hero glyph; system casts shadow onto middle / back |

- **Minimum 2 layers** with drawn content are required by `actool` validation. A single-layer submission fails with "visionOS icon appears not valid" in Xcode 16+. ([StackOverflow — visionOS icon appears not valid](https://stackoverflow.com/questions/79015178/visionos-icon-appears-not-valid-xcode-16))
- **Back must be fully opaque.** No alpha channel at all — even transparent pixels that pass PNG encoding will fail.
- **sRGB IEC61966-2.1** is the color profile `actool` expects.
- **No self-drawn shadows or parallax.** The OS creates both based on layer alpha edges. Designers who pre-bake shadows double them.
- Authoring tools: [Apple Parallax Previewer](https://developer.apple.com/download/more/?q=parallax) (LSR format) is still shipped for tvOS / visionOS as of 2026; Icon Composer also supports visionOS export starting Xcode 26. ([Amos Gyamfi — Making a visionOS App Icon and 3D Parallax Effects](https://www.linkedin.com/pulse/creating-layered-images-parallax-artwork-visionos-amos-gyamfi-kf5if), [Rudrank Riyam — Creating the visionOS App Icon](https://rudrank.com/vision-os-fundamentals-creating-app-icon))

Because visionOS applies a **circular** crop (vs. iOS's squircle), the effective safe zone shrinks to the inscribed circle of the 1024 square — roughly an 890 px diameter. Content in the four corners is always cropped.

## Liquid Glass (iOS / iPadOS / macOS 26) & Icon Composer

WWDC25 introduced **Icon Composer** as the supported authoring path for multilayer icons on all Apple platforms. It replaces the per-appearance asset catalog for apps targeting iOS 26+, macOS 26+, and watchOS 26+ (older releases get an auto-generated fallback from the same file). Key semantics:

- Up to **4 layer groups** (ordered back-to-front in the z-plane). Each group contains one or more layers. Apple caps complexity at 4 groups to keep the Liquid Glass shader predictable.
- **Input formats:** SVG preferred (vector, scales to every render size), PNG fallback. Text in SVGs must be converted to outlines because the pipeline doesn't embed fonts.
- **Do NOT bake these into the source artwork** (Icon Composer applies them, adjustably, as part of the Liquid Glass material):
  - Blurs
  - Shadows
  - Specular highlights
  - Opacity / translucency
  - Background colors and gradients on the canvas
- **Liquid Glass modes per group:**
  - `Individual` — every layer becomes its own glass lens.
  - `Combined` — the whole group is one glass slab.
- **Appearance per layer:** `Default` / `Dark` / `Mono` (which contains Clear and Tinted sub-states). Fill types per appearance: `Automatic` (keep source), `None`, `Solid`, `Gradient`.
- **Platform variation is composition-only.** You change position/scale/geometry per platform but *not* color per platform — because Apple wants brand color to stay consistent across iPhone, iPad, and Mac. ([Icon Composer doc](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer))

**Requirements.** macOS Sequoia 15.3+ to author. Xcode 26+ to bundle. The `.icon` file replaces any pre-existing `AppIcon` asset catalog in the target; both can co-exist only if named differently and the General pane's App Icon field points at the `.icon`.

HIG's Liquid Glass color guidance, confirmed against [Apple's Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass):

- **Vibrant, saturated, not neon.** Brand colors should "glow" rather than read as flat fills.
- **Avoid pure white backgrounds** — they wash out on bright wallpapers through the dock's glass.
- **Avoid near-black backgrounds** — they read as holes punched through the glass.
- **Avoid low-saturation grays** — they feel like placeholder assets.

## What the icon must NOT contain (App Review hit list)

Summarized directly from the HIG's "App icons" section and corroborated by Apple's iOS/iPadOS submission checklist:

1. **No photos** — photographic detail disintegrates below ~87 px and reads as noise. Apps built on a photo (e.g. camera apps) still ship stylized line art as the icon, not a photograph.
2. **No screenshots** — the icon is not a teaser for the UI.
3. **No interface elements** — no fake buttons, no fake status bars, no chrome.
4. **No Apple hardware** — no iPhone silhouettes, no MacBook frames, no Apple Watch mockups. Apple explicitly calls this out because hardware designs change and the icon would age badly.
5. **No Apple-owned trade dress** — no Apple logo, no SF Symbols rendered as-is without transformation, no System color swatches in place of brand colors.
6. **Words are reserved for logos.** The app name already appears below the icon. "Watch!", "Play", "Open App", and repeated brand names get rejected.
7. **No transparency in the Default variant.** Opaque PNG or submission fails.
8. **No square edges shown** — let the system apply the mask; don't pre-draw the squircle.

Source: [HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) and [Apple App Icon Guidelines roundup](https://asolytics.pro/blog/post/apple-app-icon-guidelines-dimensions-requirements-design-rules-and-mistakes-to-avoid/).

## How the prompt "design an iOS app icon, squircle, flat, centered, 1024x1024, safe zone 10%" actually performs

Against current T2I models (Imagen 4, GPT-Image-1, Flux 1.1 Pro, Ideogram 2.0) that prompt fails in predictable ways:

- **"Squircle" → circular-arc rounded rectangle.** Models don't know the Lamé curve; output reads as an Android icon. Don't pre-draw the mask; describe a square canvas and let the OS clip.
- **"Flat" fights "iOS 26."** Modern iOS icons have Liquid Glass depth cues; "flat" biases toward 2018-era Material Design.
- **"1024x1024" as pixel count is ignored** — describe ratio (`1:1 square`) instead.
- **"Safe zone 10 %" is ignored** — reframe as composition: "single centered glyph filling ~80 % of the canvas, background bleeds fully to all four edges, no visible border."
- **Output bakes the mask** (icon-inside-an-icon after OS clipping). Counter with: "edges extend fully to the four corners, no rounded-rectangle shape drawn."
- **Text contamination.** "App icon for Foo" often produces "FOO" inside the icon, violating HIG. Counter with "no text, no letters, no typography."

**Prompt pattern aligned to HIG:**

```text
A single-focus app icon glyph for {app_domain} — {concrete_subject_description}.
Composition: 1:1 square, centered, glyph fills roughly 80% of the frame, background
color or gradient bleeds continuously to all four edges, no visible border, no
rounded-rectangle shape drawn (the operating system will apply the mask).
Style: {liquid_glass_cues — subtle interior gradient, soft top-edge highlight,
slight depth via color temperature, not flat, not neon, not photographic}.
Color: {brand_color_1} to {brand_color_2} gradient, saturated but not neon.
Constraints: no text, no letters, no typography, no screenshots, no UI elements,
no Apple hardware silhouettes, no photographs, no drop shadows on the background,
fully opaque.
```

This pattern matches Google's Imagen prompt guide taxonomy (Subject → Context → Style) and survives Imagen 4's negative-prompt removal (all exclusions are folded as positive descriptors). See [4a-imagen-official-prompt-guides.md](../04-gemini-imagen-prompting/4a-imagen-official-prompt-guides.md) for the base prompt scaffolding.

**Variant prompts.** For iOS 18/26 dark: same composition, deep saturated brand color (not pure black), interior luminous gradient, glyph shifts to a lighter complementary tone for ≥4.5:1 contrast. For tinted: collapse to a single luminance channel on transparent background, mid-grey glyph, no gradient, no color — the OS applies the tint. For visionOS, split into three calls: back = opaque gradient fill with no glyph; middle = decorative shape on transparent background; front = hero glyph on transparent background. Keep the seed fixed across variants.

## Validation tools

- **`xcrun actool`** — The primary validator. Runs at build time inside Xcode; also invokable standalone. Relevant flags:
  - `--compile <dir>` — compile asset catalogs to `.car`, failing on missing required icon sizes.
  - `--app-icon <name>` — nominate the primary icon set.
  - `--errors --warnings` — surface everything to stderr.
  - `--output-partial-info-plist <path>` — writes the `CFBundleIcons` keys that go into Info.plist.
  - Validates: presence of 1024 @ 1x App Store icon, all required iPhone/iPad sizes for the platform deployment target, correct bit depth, no alpha on platforms that forbid it, visionOS layer completeness (minimum 2 layers with content), Icon Composer `.icon` schema.
  - Sources: [actool(1) man page](https://keith.github.io/xcode-man-pages/actool.1.html), [manpagez actool](https://www.manpagez.com/man/1/actool/).
- **`xcodebuild`** — Surfaces `actool` errors during `xcodebuild archive`; App Store Connect re-runs equivalent checks on upload and rejects with "Missing required icon file" / "Invalid App Icon" errors.
- **Icon Composer's built-in preview** — The canvas simulates iOS / macOS / watchOS rendering with Light/Dark/Mono (Clear + Tinted) variants, adjustable wallpaper background, and grid overlay. Use it as the pre-export check that the Liquid Glass material isn't producing visual bugs at small sizes.
- **`iconutil`** — macOS `.icns` packaging utility; validates the legacy `.iconset` folder structure if you still ship standalone Mac apps outside the App Store.
- **Third-party linters** (community, not official): **iconsur** CLI for Big Sur squircle conformance ([rikumi/iconsur](https://github.com/rikumi/iconsur)), **app-icon** npm package, **appiconmaker**/**icon.kitchen** web tools — useful for generating the full size matrix from a master but none validate HIG content rules (photos, text, hardware).

## Implications for a prompt-to-asset

- **Route by platform.** Separate scaffolds for iOS / iPadOS / macOS / watchOS / visionOS. No universal prompt.
- **Emit one 1024 master by default**; generate Dark and Tinted variants as separate calls with the same seed for composition consistency.
- **Fold HIG exclusions into positive descriptors** (Imagen 4 has no negative-prompt support): "fully opaque, edges bleed to corners, no rounded shape drawn, no text, no hardware, no photograph."
- **For visionOS, expand one request into a 3-call pipeline** (back/middle/front) and enforce per-layer opacity.
- **Avoid "squircle" as a prompt term** — it makes models draw the mask into the art. Describe a plain square canvas and let the OS clip.
- **Suggest `actool` validation** on the submission path; `xcrun actool --compile ... --app-icon AppIcon --errors` catches most rejection causes pre-upload.
- **Route to Icon Composer for iOS 26+ targets**; stay with the asset catalog for older deployment targets.

## Sources

Primary Apple sources:

1. [HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) — canonical icon-design guidelines.
2. [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer) — Xcode 26 / Icon Composer authoring guide.
3. [Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon) — legacy asset-catalog path, visionOS layer rules.
4. [Icon Composer download + overview](https://developer.apple.com/icon-composer/) — tool distribution page.
5. [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass) — iOS 26 material guidance.
6. [Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass) — material physics.
7. [Providing images for different appearances](https://developer.apple.com/documentation/uikit/providing-images-for-different-appearances) — iOS 18 appearance variants.
8. [Creating App Clip Codes](https://developer.apple.com/documentation/appclip/creating-app-clip-codes) — App Clip Code asset specs.
9. [Creating App Clip Codes with App Store Connect](https://developer.apple.com/documentation/appclip/creating-app-clip-codes-with-app-store-connect) — generation flow.
10. [Offer a default App Clip experience](https://developer.apple.com/help/app-store-connect/offer-app-clip-experiences/offer-a-default-app-clip-experience/) — 1800×1200 header image spec.
11. [actool(1) man page (mirror)](https://keith.github.io/xcode-man-pages/actool.1.html) — validator CLI reference.
12. [WWDC25 — Say hello to the new look of app icons](https://developer.apple.com/videos/play/wwdc2025/220/) — Apple's own Liquid Glass introduction.
13. [WWDC25 — Create icons with Icon Composer](https://developer.apple.com/videos/play/wwdc2025/361/) — Icon Composer walkthrough.

Community corroboration:

- [Squircle.js — How Apple Uses Squircles in iOS Design](https://squircle.js.org/blog/squircles-in-apple-design) — n ≈ 5, 22.37 % radius, 60 % smoothing.
- [Grida — Superellipse Mathematical Reference](https://grida.co/docs/math/superellipse) — Lamé-curve math.
- [Jim Nielsen — Calculate the iOS Border Radius](https://blog.jim-nielsen.com/2012/calculate-the-ios-border-radius/) — historical derivation of the ratio.
- [Václav Vančura — macOS Big Sur icon template](https://vancura.design/blog/macos-big-sur-icon-template) — macOS squircle grid.
- [Sketch Blog — tinted iOS 18 app icons](https://sketch.com/blog/tinted-app-icons), [Koombea — Preparing for iOS 18 Dark/Tinted](https://www.koombea.com/blog/preparing-your-app-icon-for-ios-18-dark-and-tinted-modes/), [Guillem Bruix — Dark and Tinted](https://medium.com/@GuillemBruix/design-your-dark-and-tinted-versions-of-your-app-icon-for-ios-18-827444a31851) — appearance-variant workflows.
- [IconikAI — iOS Sizes 2026](https://www.iconikai.com/blog/ios-app-icon-size-guidelines-guide), [IconBundlr — iOS Sizes 2026](https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide), [AppIconKitchen — Sizes 2026](https://www.appiconkitchen.com/posts/app-icon-size-guide-2026) — size-matrix triangulation.
- [Amos Gyamfi — visionOS Parallax Artwork](https://www.linkedin.com/pulse/creating-layered-images-parallax-artwork-visionos-amos-gyamfi-kf5if), [Rudrank Riyam — visionOS App Icon](https://rudrank.com/vision-os-fundamentals-creating-app-icon), [SO — visionOS icon not valid](https://stackoverflow.com/questions/79015178/visionos-icon-appears-not-valid-xcode-16) — visionOS layer workflow + actool failure modes.
- [Skyscraper — Liquid Glass icon guide](https://getskyscraper.com/blog/liquid-glass-app-icon-design-ios-26-guide.html), [OnlyFlutter — Liquid Glass Launcher Icons](https://onlyflutter.com/how-to-create-liquid-glass-launcher-icons-using-icon-composer/), [MobileAction — Liquid Glass ASO](https://www.mobileaction.co/blog/apple-liquid-glass-design/) — iOS 26 Icon Composer hands-on.
- [Asolytics — App Icon Guidelines](https://asolytics.pro/blog/post/apple-app-icon-guidelines-dimensions-requirements-design-rules-and-mistakes-to-avoid/) — HIG restriction roundup.
- [rikumi/iconsur](https://github.com/rikumi/iconsur) — CLI for Big Sur squircle Mac icons.
