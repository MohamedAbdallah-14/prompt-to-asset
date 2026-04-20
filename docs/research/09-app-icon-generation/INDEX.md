---
category: 09-app-icon-generation
title: "Category Index — App Icon Generation: iOS HIG, Android Adaptive, PWA Manifest, Safe Zones & the appicon.co-killer Pipeline"
slug: 09-app-icon-generation-index
indexer: category-indexer-09
date: 2026-04-19
status: complete
angles_indexed:
  - 9a-ios-app-icon-hig-specs
  - 9b-android-adaptive-themed-icons
  - 9c-pwa-web-app-manifest-icons
  - 9d-icon-generation-tools-survey
  - 9e-prompt-patterns-for-app-icons
tags:
  - app-icons
  - ios-hig
  - liquid-glass
  - android-adaptive
  - themed-icons
  - maskable-pwa
  - squircle
  - safe-zone
  - validation
  - actool
  - sharp
  - capacitor-assets
  - prompt-patterns
---

# 09 — App Icon Generation: Category Index

## Category Executive Summary

App icons are the hardest single asset category we have to target. Unlike a
marketing illustration or a hero shot, an icon must survive three brutal
compressions simultaneously — rendered at ~20 px in a spotlight result,
re-masked by the OS (iOS squircle, Android circle/teardrop/squircle/hexagon,
PWA maskable circle), and judged next to first-party icons whose style bar is
very high. The five research angles in this category converge on a common
shape for the solution: a deterministic, layered pipeline that takes a single
masters-of-masters source and emits platform-compliant packs whose layer
geometry, safe zones, and per-appearance variants are generated up front, not
split out post hoc.

Fifteen findings that matter for the `09-app-icon-generation` skill:

1. **Design one 1024 × 1024 master, let every OS mask it.** Apple, Google, and
   the PWA WebAPK pipeline all derive their full size matrix from a single
   square source (1088 × 1088 for watchOS Liquid Glass). Authors who pre-draw
   the squircle, round the corners, or bake in drop shadow get clipped
   *twice* and look worse than a plain square master. ([9a], [9d])
2. **The iOS squircle is a quintic superellipse (n ≈ 5), not a rounded
   rectangle.** Corner radius ≈ 22.37 % of width, corner smoothing ≈ 60 %, C∞
   continuous. A CSS `border-radius: 22%` looks subtly wrong next to system
   icons — which is why the prompt "squircle, 22% radius" is a trap that
   produces circular-arc corners and an Android-looking output. ([9a], [9e])
3. **iOS 18+ and iOS 26 / Liquid Glass ship three appearances.** Default,
   Dark, and Tinted are *independent* slots, not filters. Tinted is a single
   luminance channel the system recolors from wallpaper; shipping Default
   only forces an auto-fallback that routinely looks wrong. Icon Composer is
   the WWDC25-blessed authoring path; legacy per-size asset catalogs still
   work for older deployment targets. ([9a])
4. **Android's icon is a composite of 3–5 artifacts, not one image.** An
   adaptive launcher icon is a foreground + background + monochrome triple
   at 108 × 108 dp with a **66 dp guaranteed-visible safe zone**, plus legacy
   mipmap PNGs across the five density buckets (mdpi/hdpi/xhdpi/xxhdpi/
   xxxhdpi) and a separate 512 × 512 Play Store icon plus 1024 × 500 feature
   graphic. Asking a model for "an Android icon" returns a 1-layer image that
   fails on Samsung's squircle and Material You tinting. ([9b])
5. **The logomark must land between 48 and 66 dp on a 108 dp canvas.** Every
   OEM launcher mask shape (Pixel circle, Samsung squircle, teardrop, rounded
   square, hexagon) is required by AOSP to fully contain the 66 dp inscribed
   circle. Content in the outer 18 dp is bleed and is always cropped. ([9b])
6. **Android monochrome is a *structural* problem, not a tonal one.** The
   launcher discards the RGB and multiplies the Material You accent color by
   the alpha channel. Gradients, drop shadows, and two-tone brandmarks
   collapse; only solid-alpha silhouettes survive. The monochrome safe zone
   (90 × 90 dp outer, 36–60 dp mark) is tighter than the adaptive safe zone
   because the launcher adds its own tonal plate. ([9b])
7. **The Web App Manifest has two kinds of icon, not one.** `purpose=any`
   fills the canvas edge-to-edge; `purpose=maskable` must fit its logo inside
   a circle of diameter ≈ 80 % of the canvas because Chromium, Samsung, and
   other OEM launchers crop the outer 10 % on each side. Reusing a single
   file as `"any maskable"` is safe only when the logo already has 20 %
   all-sides padding. ([9c])
8. **iOS still ignores the manifest for home-screen icons.** Safari reads
   `<link rel="apple-touch-icon">` and — for legacy browsers — probes
   `/favicon.ico` unconditionally. A manifest-only generator produces broken
   iOS installs and blurry legacy tabs. The correct baseline is `favicon.ico`
   (multi-size), `favicon.svg` (with embedded `prefers-color-scheme`),
   `apple-touch-icon.png` (180 × 180), `icon-192.png`, `icon-512.png`, plus
   `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-monochrome-512.png`.
   ([9c])
9. **Apple forbids alpha on Default; iOS 18 Tinted *requires* alpha.** Every
   other HIG rule is a content rule — no photos, no screenshots, no
   interface chrome, no Apple hardware, no text (except when the logo *is* a
   wordmark) — and is enforced at App Review. The Tinted appearance is the
   one case where transparency is mandatory, because the OS composites the
   luminance channel over its own wallpaper-derived tint. ([9a])
10. **visionOS icons are 3-layer parallax stacks, not flat squares.** Back
    (opaque, no alpha) / Middle (alpha optional) / Front (alpha optional), all
    1024 × 1024, minimum two layers with drawn content. `actool` rejects
    single-layer submissions. The effective safe zone shrinks to an ≈ 890 px
    inscribed circle because the OS crops to circular. Prompt-enhancers must
    expand a single visionOS request into three parallel generations. ([9a])
11. **Play Store validators are strict about bit depth.** The 512 × 512 high-
    res icon must be **32-bit PNG with alpha**, exactly 512 × 512; the
    1024 × 500 feature graphic must be **24-bit (no alpha)** JPEG or PNG with
    nothing critical in the bottom-right 200 × 80 keep-out zone where a
    YouTube play button may overlay. Most upload rejections are bit-depth
    mismatches, not dimension mismatches. Verify with `identify` before
    handoff. ([9b])
12. **"App icon" is a poisoned prompt token.** Across T2I models, the literal
    string *app icon* is overrepresented in training data as screenshots of
    the App Store and home screens, not as the icon asset itself. Replacing
    it with *logomark*, *symbol*, or *flat vector mark on a solid field*
    eliminates the #1 failure mode (a phone or home-screen grid instead of an
    icon). ([9e])
13. **Never prompt the mask; describe the canvas.** Asking for "rounded
    square" or "inside a squircle" makes the model *draw* the mask outline,
    which the OS then re-masks to produce a thick dark ring. The correct
    pattern is "1024 × 1024 square canvas, solid fill, mark centered with
    15–20 % symmetric padding, no border, no frame, no rounded corners
    visible." ([9e])
14. **SaaS icon generators are prior art, not dependencies.** `appicon.co`,
    `makeappicon.com`, `appiconmaker.co`, `icon.kitchen`, `appiconkitchen.com`
    are all closed-source with no public API. The embeddable open-source
    path is: `sharp` / `libvips` at the bottom (Apache-2.0, 32k★, 32M weekly
    npm); `@capacitor/assets`, `pwa-asset-generator`, `vite-pwa/assets-
    generator`, `flutter_launcher_icons`, and `tauri icon` as project-
    specific adapters; Apple's `xcrun actool` and Android's Image Asset
    Studio output contract as the validation targets. ([9d])
15. **Validation is native and deterministic — use it.** `xcrun actool
    --compile ... --app-icon AppIcon --errors --warnings` catches the
    majority of iOS rejection causes pre-upload (missing sizes, wrong bit
    depth, alpha on opaque-required platforms, visionOS layer completeness).
    Lighthouse's PWA audit closes the web loop. A content-addressed cache
    keyed on `hash(master + flags)` makes re-runs idempotent. ([9a], [9d])

## Map of the Angles

The five subagents attacked complementary surfaces:

- **[9a — iOS App Icon HIG Specs][9a]** — platform-rules angle. Size matrix
  across iOS / iPadOS / macOS / watchOS / visionOS / tvOS / App Clip;
  squircle math; ≈ 10 % safe zone; Dark / Tinted appearance variants
  (iOS 18+); Liquid Glass / Icon Composer (iOS 26 / Xcode 26); visionOS
  3-layer parallax; HIG content blacklist; `actool` validation.
- **[9b — Android Adaptive & Themed Icons][9b]** — launcher angle.
  Decomposes the single-icon fiction into foreground / background /
  monochrome (API 33+); quantifies 108 dp / 72 dp / 66 dp / 48–66 dp
  geometry; maps the density matrix; documents Material You tinting and
  Play Console rules (512 × 512 32-bit PNG icon; 1024 × 500 24-bit feature
  graphic; play-button keep-out).
- **[9c — PWA & Web App Manifest Icons][9c]** — browser/install angle.
  Minimum modern set (`favicon.ico` + `favicon.svg` + `apple-touch-icon.png`
  + manifest with `any` / `maskable` / `monochrome`); maskable 80 % safe-
  zone geometry; dark-mode SVG favicon via embedded
  `prefers-color-scheme`; WebAPK / TWA / Microsoft tile interaction.
- **[9d — Icon Generation Tools Survey][9d]** — pipeline-tooling angle.
  Three-tier landscape (closed-API SaaS / framework CLIs / low-level image
  libs); recommends an orchestrator that dispatches to the matching
  adapter and falls back to a ~30-line `sharp` / `pyvips` pipeline
  mirroring the `@capacitor/assets` contract. Corrects a brief error: the
  canonical PWA generator is `elegantapp/pwa-asset-generator`.
- **[9e — Prompt Patterns for App Icons][9e]** — prompt-engineering angle.
  Drop-in templates for iOS HIG, Android adaptive, PWA maskable; six
  failure modes (F1 screenshot, F2 visible mask, F3 baked depth, F4 tiny
  mark, F5 baked text, F6 illustration-dense); model ranking Recraft V3
  > `gpt-image-1` > Flux + LoRA > Midjourney > Ideogram > DALL·E 3 >
  Gemini 2.5 Flash Image; multi-variant via IP-Adapter / `--sref` / seed.

**9e** governs what the model generates, **9a / 9b / 9c** govern what each
platform accepts, and **9d** governs how raw output becomes a validated,
shippable pack.

## Cross-Cutting Patterns

**One master, many derivatives.** iOS (Xcode 26), Android
(`@capacitor/assets`, `flutter_launcher_icons`), PWA (`pwa-asset-generator`,
`vite-pwa/assets-generator`), and desktop (`tauri icon`) all take a single
square PNG and expand it. The correct unit is one 1024 × 1024 RGBA master
plus one or two variant masters (foreground-only, monochrome, dark).
Pre-masked rounded-rectangles and pre-baked drop shadows lose fidelity at
every downstream step.

**Safe zone is a circle, not a rectangle.** iOS ≈ 820 × 820 inside 1024
(~ 10 % margin, optical-center ≈ 1–2 % above geometric center); Android
66 dp inscribed circle inside 108 dp; PWA maskable 80 %-diameter circle;
visionOS ≈ 890 px inscribed circle. Critical content lives inside the
inscribed circle of whatever square you are authoring.

**Negatives double as positive structure.** "No text, no photograph, no
hardware, no UI chrome, no phone, no home screen, no shadow, no bevel, no
3-D, no gloss, no border, no frame, no rounded corners visible" is both a
safety rail against App Store rejection and a style constraint that pushes
models toward flat, silhouette-legible output. Imagen 4 removed native
negative-prompt support, so **9a** and **9e** fold exclusions into
positives ("fully opaque, edges bleed to all four corners, single focal
element").

**Variants are a family, not a set.** Default, Dark, Tinted, Android
Monochrome, PWA Maskable, PWA Monochrome, favicon, notification, settings
glyph must read as the *same identity* at very different pixel counts.
The working patterns are IP-Adapter / style-reference / shared-seed
generation from a locked master, not independent reruns.

**Validators are cheap and authoritative.** `xcrun actool`, `xcodebuild
archive`, Play Console's bit-depth validator, Lighthouse PWA audit, and
`maskable.app` all ship as free, scriptable tools. Run them all before
declaring success.

## Controversies

- **`purpose: "any maskable"` vs two files.** W3C permits combining
  purposes, but 9c and web.dev agree this is safe only when the logo
  already has 20 %+ all-sides padding. Two files is the defensive default.
- **Transparency on Tinted.** HIG's blanket "no alpha" rule has an
  explicit Tinted carve-out where alpha is *required*. Generators that
  hard-enforce no-alpha produce broken Tinted submissions.
- **"Apple squircle" in prompts.** 9a and 9e argue strongly against
  mentioning the mask — it makes the model draw the squircle outline as
  pixels, which the OS then re-masks. Consensus: describe a plain square
  canvas and let the OS clip.
- **Single-generation-and-split vs per-layer on Android.** SaaS tools like
  icon.kitchen compute foreground / background / monochrome via background
  removal + alpha thresholding. 9b shows this yields a weaker monochrome
  because internal brandmark detail that should have been alpha-cut stays
  solid. 9e's per-layer generation with a shared style anchor is better
  but costs ~3× inference.
- **Flat vs Liquid Glass.** A 2018-era "flat, no gradients, no 3-D" prompt
  now fights iOS 26's Liquid Glass, which expects vibrant depth cues.
  9a's answer: leave depth to Icon Composer's material, keep the source
  flat. The skill must distinguish "flat source for Icon Composer" from
  "flat final asset for PWA / Android."
- **Vector-first vs raster-first.** Recraft V3 emits SVG; sharp pipelines
  are raster-first. Vector is lossless and editable but only a few models
  produce usable SVG. Raster works everywhere but needs a vectorization
  post-step for the Android monochrome `VectorDrawable`.
- **Dark favicon strategy.** The SVG-internal
  `@media (prefers-color-scheme: dark)` pattern is cross-browser; the
  dual-`<link media=...>` pattern is Chromium-only. Use the internal
  pattern; treat dual-link as additive.

## Gaps

- **Automated HIG content linting.** `actool` validates geometry and bit
  depth but does not detect iPhone silhouettes or embedded text. We need a
  vision-LLM post-check trained on Apple's rejection examples.
- **Android mask-robustness testing.** No scripted tool composites the
  foreground against all major launcher masks (Pixel / Samsung / OnePlus /
  Xiaomi / Huawei / AOSP) and flags content loss; `maskable.app` covers
  only PWA.
- **Liquid Glass fidelity.** iOS 26 Icon Composer's material layer is
  closed-source — we can cover "don't bake depth" but not "match Apple's
  finished specular / refractive glass layer."
- **Palette enforcement.** 9e assumes a fixed palette token list; we
  haven't specified a palette-extraction + palette-locking step on the
  master.
- **Splash-screen prompts.** 9d covers the toolchain; splash-screen prompt
  strategy lives in categories 10 and 11.
- **App Clip Code color pattern constraints** are not mapped beyond the
  1800 × 1200 header image spec.
- **Third-party trademark avoidance.** HIG forbids Apple trade dress;
  no curated list of third-party marks that also trigger App Review
  rejection.

## Actionable Recommendations for Our App-Icon Skill

The `09` category's specific deliverable is the `appicon.co-killer
pipeline` — a skill that turns "give me an app icon for a note-taking app
called Foo" into a production-ready, validated, multi-platform icon pack.
Based on the five angles the pipeline should look like:

### 1. Intake — platform target routing

Take a natural-language request and produce a structured target list.
Detect project type from workspace signals (`package.json` →
`@capacitor/core` / `"expo"`; `pubspec.yaml`; `src-tauri/tauri.conf.json`;
`manifest.webmanifest`) and cross-reference explicit intent. Default to
**{iOS, Android, PWA}** when unspecified. Route each target through its
own prompt + validation pipeline — HIG content rules disagree with
Material You layer rules. Expose `icon ios|android|pwa|all` subcommands
plus an MCP tool `generate_app_icons` whose schema mirrors
`@capacitor/assets` flags.

### 2. Master PNG generation — prompt-aware, model-routed

Rewrite the user's request before generation:

- **Token substitution.** Replace *app icon* → *logomark* / *symbol* /
  *flat vector mark on a solid field*.
- **Canvas directive.** "1024 × 1024 square canvas, solid fill, mark
  centered with 15–20 % symmetric padding, recognizable as a silhouette
  at 20 pixels, no border, no frame, no rounded corners visible."
- **Negatives folded as positives** (Imagen 4 has no negative-prompt):
  "fully opaque, edges bleed to all four corners, single focal element,
  no text, no photograph, no device silhouette, no UI chrome, no drop
  shadow."
- **Model routing.** Clean vector / icon-set → Recraft V3. Strict
  transparency or single-letter monogram → `gpt-image-1` `images.edit`
  with full-canvas mask. Local, matched family → Flux.1 [dev] + icon LoRA
  (strength 0.6–1.0, CFG 3.0–4.5). Avoid Gemini 2.5 Flash Image as
  *master* but use it for "same mark, new color scheme" variants.
- **Seed pinning.** Fix seed across SDXL / Flux variants; attach master as
  `--sref` / IP-Adapter-Plus / `reference_image` for MJ / Recraft /
  `gpt-image-1` / Gemini.

### 3. Split into layers — deterministic, per-platform

Emit each platform's layer bundle *before* emitting the size matrix —
downstream adapters expect layered inputs, not pre-composited ones.

- **iOS.** One opaque Default master; one Dark master (inverted palette,
  shared seed); one single-channel luminance Tinted on transparent.
  iOS 26 → Icon Composer `.icon` layer groups; older → per-appearance
  asset-catalog slots. visionOS → three parallel generations (Back
  opaque, Middle / Front RGBA), minimum-2-with-content rule.
- **Android.** Three parallel generations: foreground (RGBA, mark 55–61 %
  of 108 dp, transparent outside), background (opaque full-bleed solid or
  2-stop gradient, no mark), monochrome (solid white silhouette on RGBA,
  40 % of canvas, matching foreground geometry verbatim). Respect the
  48–66 dp logomark bound and 36–60 dp monochrome bound.
- **PWA.** `purpose=any` (edge-to-edge) and `purpose=maskable` (logo
  inside inner 80 % circle on opaque brand background); derive
  `purpose=monochrome` from the maskable alpha. Emit dark-aware
  `favicon.svg` with embedded `prefers-color-scheme: dark`.

### 4. Emit the full pack — adapter dispatch, sharp fallback

Dispatch to the matching CLI: Capacitor → `npx @capacitor/assets generate
--ios --android --pwa`; Expo → `app.json` + `npx expo prebuild --clean`;
Flutter → `flutter_launcher_icons.yaml` + `dart run flutter_launcher_icons`
(with `adaptive_icon_monochrome`, `remove_alpha_ios: true`); Tauri →
`cargo tauri icon`; plain web → `pwa-asset-generator` or
`vite-pwa/assets-generator`.

Fall back to a ~30-line `sharp` / `pyvips` pipeline mirroring
`@capacitor/assets`' contract: iOS `AppIcon-1024.png` opaque, Android
`ic_launcher_foreground.png` at 432 px, PWA `icon-{192,512}.png` plus
maskable (10 % padding), `favicon.ico` multi-size,
`apple-touch-icon.png` 180 × 180, `manifest.webmanifest` with `any` +
`maskable` + `monochrome`. Content-address the output directory with
`hash(master + flags)` for idempotent re-runs.

### 5. Validate against HIG and platform rules — hard gates

- **iOS:** `xcrun actool --compile ./build --app-icon AppIcon --errors
  --warnings`. Reject on missing sizes, alpha on opaque slots, or
  visionOS layer incompleteness. Assert 1024 master `hasAlpha === false`
  via `sharp.metadata()`; Tinted `channels === 1`.
- **Android:** Assert mipmap pixel sizes; monochrome has zero non-alpha
  content; mark bbox fits 66 dp inscribed circle at every density. Play
  Store 512 × 512 must be 32-bit PNG (the #1 rejection cause per 9b);
  feature graphic must be 24-bit.
- **PWA:** Parse `manifest.webmanifest` against W3C schema; assert ≥1
  `any` at 192 and 512, ≥1 `maskable` at both. Laplacian-convolve the
  outer 10 % of maskable icons; reject high-frequency borders (9c).
  Confirm `favicon.svg` embeds `prefers-color-scheme`. Run `lighthouse
  --only-categories=pwa --chrome-flags="--headless"`.
- **Content linting (fills 9a's gap):** Vision-LLM check for HIG blacklist
  (photos / screenshots / UI chrome / hardware silhouettes / Apple logos
  / app-name text) and Play Store blacklist (ranking / deal text).

Expose as `icon validate ./pack/` so users can run it against any existing
pack.

### 6. Self-correct — one regeneration pass on failure

On validator failure, build a scoped corrective prompt ("previous output
contained text; regenerate with no-text constraints and master as
IP-Adapter reference at 0.85"), rerun the relevant leg, re-validate. Cap
at one cycle; escalate to human after.

## Primary Sources Aggregated

### Apple (iOS / iPadOS / macOS / watchOS / visionOS / tvOS)

- [HIG → App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer)
- [Configuring your app icon using an asset catalog](https://developer.apple.com/documentation/xcode/configuring-your-app-icon)
- [Icon Composer download](https://developer.apple.com/icon-composer/)
- [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)
- [Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)
- [Providing images for different appearances](https://developer.apple.com/documentation/uikit/providing-images-for-different-appearances)
- [Creating App Clip Codes with App Store Connect](https://developer.apple.com/documentation/appclip/creating-app-clip-codes-with-app-store-connect)
- [`actool(1)` man page (mirror)](https://keith.github.io/xcode-man-pages/actool.1.html)
- [WWDC25 — Say hello to the new look of app icons](https://developer.apple.com/videos/play/wwdc2025/220/)
- [WWDC25 — Create icons with Icon Composer](https://developer.apple.com/videos/play/wwdc2025/361/)
- [Configuring Web Applications (apple-touch-icon)](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

### Google / Android

- [Adaptive icons — developer.android.com](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [`AdaptiveIconDrawable` API reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)
- [Create app icons — Android Studio](https://developer.android.com/studio/write/create-app-icons)
- [Support different pixel densities](https://developer.android.com/training/multiscreen/screendensities)
- [Implement adaptive icons — AOSP](https://source.android.com/docs/core/display/adaptive-icons)
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Add preview assets — Play Console help](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Launcher3 `IconShape.java`](https://android.googlesource.com/platform/packages/apps/Launcher3/+/42a9ef0/src/com/android/launcher3/graphics/IconShape.java)
- [Themed app icons — Chromium status](https://chromestatus.com/feature/5120331762106368)
- [Trusted Web Activity integration guide](https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide)
- [WebAPKs — Web apps packaged for Android](https://developers.google.com/web/fundamentals/integration/webapks)
- [Firebase AI Logic — generate images with Gemini](https://firebase.google.com/docs/ai-logic/generate-images-gemini)
- [Gemini API image generation](https://ai.google.dev/gemini-api/docs/image-generation)

### W3C / WHATWG / Browser Vendors

- [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [MDN — Web app manifests](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest)
- [MDN — `manifest.icons`](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons)
- [web.dev — Add a web app manifest](https://web.dev/articles/add-manifest)
- [web.dev — Adaptive icon support in PWAs with maskable icons](https://web.dev/articles/maskable-icon)
- [Maskable.app editor](https://maskable.app/editor)
- [Jake Archibald — Dark mode favicons (2021)](https://jakearchibald.com/2021/dark-mode-favicons/)
- [Microsoft `browserconfig.xml` schema reference](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/dn455106(v=vs.85))

### Open-Source Tooling (embeddable)

- [`lovell/sharp`](https://github.com/lovell/sharp) (Apache-2.0, 32k★)
- [`libvips/pyvips`](https://github.com/libvips/pyvips)
- [`ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets) + [npm `@capacitor/assets`](https://www.npmjs.com/package/@capacitor/assets)
- [`elegantapp/pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator)
- [`vite-pwa/assets-generator`](https://github.com/vite-pwa/assets-generator)
- [`flutter_launcher_icons` on pub.dev](https://pub.dev/packages/flutter_launcher_icons)
- [Expo — Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
- [Tauri CLI reference](https://tauri.app/reference/cli/) + [icon-command PR #4992](https://github.com/tauri-apps/tauri/pull/4992)
- [`itgalaxy/favicons`](https://github.com/itgalaxy/favicons) (4.5k★)
- [`jimp-dev/jimp`](https://github.com/jimp-dev/jimp)
- [`@napi-rs/image`](https://image.napi.rs/)
- [GoogleChromeLabs — Bubblewrap (TWA)](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWABuilder](https://www.pwabuilder.com/)
- [`romannurik/AndroidAssetStudio` (archived, 6.5k★)](https://github.com/romannurik/AndroidAssetStudio)

### SaaS Prior Art (do not integrate)

- [appicon.co](https://www.appicon.co/)
- [makeappicon.com](https://makeappicon.com/)
- [appiconmaker.co](https://appiconmaker.co/)
- [icon.kitchen](https://icon.kitchen/)
- [appiconkitchen.com](https://www.appiconkitchen.com/)
- [iconikai.com](https://www.iconikai.com/)
- [realfavicongenerator.net](https://realfavicongenerator.net/)
- [favicon.io](https://favicon.io/)

### Models & Prompting (for the master-generation step)

- [Recraft V3 model card](https://www.recraft.ai/docs/recraft-models/recraft-V3) + [Recraft V3 SVG on Replicate](https://replicate.com/recraft-ai/recraft-v3-svg)
- [OpenAI community — gpt-image-1 transparent backgrounds](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577)
- [Flux Icon Maker LoRA (Civitai)](https://civitai.com/models/722531/flux-icon-maker-psiclones-artforge-masterkit)
- [IP-Adapter — Tencent AILab](https://github.com/tencent-ailab/IP-Adapter)
- [BRIA RMBG 2.0](https://huggingface.co/briaai/RMBG-2.0)
- [BiRefNet](https://github.com/ZhengPeng7/BiRefNet)

### Community Corroboration

- [Squircle.js — How Apple Uses Squircles](https://squircle.js.org/blog/squircles-in-apple-design)
- [Grida — Superellipse Mathematical Reference](https://grida.co/docs/math/superellipse)
- [Jim Nielsen — Calculate the iOS Border Radius](https://blog.jim-nielsen.com/2012/calculate-the-ios-border-radius/)
- [Václav Vančura — macOS Big Sur icon template](https://vancura.design/blog/macos-big-sur-icon-template)
- [Sketch Blog — Tinted iOS 18 app icons](https://sketch.com/blog/tinted-app-icons)
- [Koombea — Preparing for iOS 18 Dark/Tinted](https://www.koombea.com/blog/preparing-your-app-icon-for-ios-18-dark-and-tinted-modes/)
- [IconikAI — iOS Sizes 2026](https://www.iconikai.com/blog/ios-app-icon-size-guidelines-guide)
- [IconBundlr — iOS Sizes 2026](https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide)
- [AppIconKitchen — Sizes 2026](https://www.appiconkitchen.com/posts/app-icon-size-guide-2026)
- [Adrián García — Themed app icons in Android 13 (Medium)](https://medium.com/@adrian.gl/themed-app-icons-in-android-13-c1fd5208447c)
- [StackOverflow — Monochrome icon not defined warning](https://stackoverflow.com/questions/78176570/how-do-i-fix-this-warning-in-android-studio-monochrome-icon-is-not-defined)
- [StackOverflow — Play Store 512×512 rejection](https://stackoverflow.com/questions/54717087/google-play-isnt-accepting-high-res-icon-although-it-is-512x512-and-32-bit-rgba)
- [adaptive-icons.com — Why Foreground and Background Layers Matter](https://www.adaptive-icons.com/why-foreground-and-background-layers-matter)
- [adaptive-icons.com — Using AI to Generate Adaptive Icons](https://www.adaptive-icons.com/using-ai-to-generate-adaptive-icons)
- [rikumi/iconsur](https://github.com/rikumi/iconsur) (Big Sur squircle CLI)
- [Skyscraper — Liquid Glass icon guide](https://getskyscraper.com/blog/liquid-glass-app-icon-design-ios-26-guide.html)
- [Tom's Guide — Pixel AI-generated app icons problem](https://www.tomsguide.com/phones/google-pixel-phones/i-just-tried-new-ai-generated-app-icons-for-pixel-phones-and-theres-a-huge-problem)

[9a]: ./9a-ios-app-icon-hig-specs.md
[9b]: ./9b-android-adaptive-themed-icons.md
[9c]: ./9c-pwa-web-app-manifest-icons.md
[9d]: ./9d-icon-generation-tools-survey.md
[9e]: ./9e-prompt-patterns-for-app-icons.md
