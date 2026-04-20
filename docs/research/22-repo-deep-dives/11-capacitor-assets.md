---
wave: 2
role: repo-deep-dive
slug: 11-capacitor-assets
title: "Deep dive: ionic-team/capacitor-assets"
repo: "https://github.com/ionic-team/capacitor-assets"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/ionic-team/capacitor-assets
  - https://www.npmjs.com/package/@capacitor/assets
  - https://capacitorjs.com/docs/guides/splash-screens-and-icons
  - https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/src/index.ts
  - https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/src/tasks/generate.ts
  - https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/src/platforms/ios/assets.ts
  - https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/src/platforms/android/assets.ts
  - https://raw.githubusercontent.com/ionic-team/capacitor-assets/main/src/platforms/pwa/assets.ts
  - https://github.com/ionic-team/capacitor-assets/issues/592
  - https://github.com/ionic-team/capacitor-assets/issues/291
tags: [capacitor, ionic, app-icon, splash]
---

# Deep dive: `ionic-team/capacitor-assets`

## Repo snapshot

`@capacitor/assets` is the Ionic-maintained, local-only asset generator for
Capacitor apps. It reads source image(s) from an `assets/` or `resources/`
folder, crops and resizes with `sharp`, and writes correctly-named icon and
splash variants directly into the native iOS and Android project folders plus
a PWA `manifest.(json|webmanifest)`. Despite a modest star count (≈579★) it
is a **heavy-traffic npm package — ~263k weekly downloads** (npm reports
251k–263k depending on the week), the de-facto tool inside the Capacitor
ecosystem. Latest release **3.0.5** (29 Mar 2024); quiet but not abandoned,
with issues triaged through 2024.

Under the hood it is a small TypeScript CLI plus a library surface:
`commander` for argument parsing, `sharp` for image manipulation, `plist` and
`@trapezedev/project` for patching iOS `Contents.json` and Android XML
resources, and `@ionic/utils-fs` for filesystem work. The published tarball
is **~118 KB** across 44 files — cheap to vendor or npx.

## License

**MIT** (per the npm record and `LICENSE`). Embed, fork, wrap, or copy modules
into our own code with only attribution obligations. Zero commercial-licensing
drama.

## CLI

The CLI is a single subcommand: `capacitor-assets generate`. In practice every
user invokes it via `npx`:

```shell
npx @capacitor/assets generate \
  --iconBackgroundColor '#eeeeee' \
  --iconBackgroundColorDark '#222222' \
  --splashBackgroundColor '#eeeeee' \
  --splashBackgroundColorDark '#111111'
```

The flags (from `src/index.ts`, authoritative):

- Platform selection: `--ios`, `--android`, `--pwa` (omit all three to target
  every detected Capacitor platform).
- Project paths: `--iosProject` (default `ios/App`), `--androidProject`
  (default `android`), `--assetPath` (default checks `assets/` then
  `resources/`), `--androidFlavor` (default `main`).
- Color theming: `--iconBackgroundColor`, `--iconBackgroundColorDark`,
  `--splashBackgroundColor`, `--splashBackgroundColorDark` (all hex).
- Splash composition: `--logoSplashScale` (default `0.2`) or
  `--logoSplashTargetWidth` (int, overrides scale).
- PWA specifics: `--pwaManifestPath` (explicit path; otherwise it searches
  `public/`, `src/`, `www/`), `--pwaNoAppleFetch` (skip live fetch of Apple
  device sizes, use the baked-in list).
- Diagnostics: `--verbose`, `--help`.

Two operating modes:

1. **Easy mode** — drop `assets/logo.(png|svg)` (+ optional `logo-dark.*`),
   supply the four background colors, get the full matrix. Icons are composed
   by drawing the logo centered on a generated background; splashes scale the
   logo by `logoSplashScale` against the splash background color.
2. **Custom / full-control mode** — drop
   `assets/icon-only.png` (≥1024²), `assets/icon-foreground.png` and
   `assets/icon-background.png` (both ≥1024²) for Android adaptive, and
   `assets/splash.png` / `assets/splash-dark.png` (≥2732²). Skip easy-mode
   flags and the tool uses each source as-is.

Input formats: **PNG or JPEG**, with **SVG** also accepted for the logo source
(sharp rasterises it). Output formats are PNG for iOS/Android and WebP for PWA
icons — which is worth flagging because it means our pipeline's "clean
1024×1024 PNG with alpha" maps into capacitor-assets' requirements exactly.

## Node / programmatic API

This is the non-obvious, high-value part. The community perception —
reinforced by issue [#592](https://github.com/ionic-team/capacitor-assets/issues/592),
which resolved with "just call the CLI via `execSync`" — is that there is
**no** Node API. That perception is wrong. `src/index.ts` re-exports a large,
coherent surface:

```ts
export * from './definitions';        // AssetKind, Platform, IosIdiom,
                                      // AndroidDensity, Format, Theme, Orientation
export * from './asset-generator';    // AssetGenerator base + AssetGeneratorOptions
export * from './project';            // Project (loads capacitor.config, detects platforms)
export * from './input-asset';        // InputAsset (the logo/icon/splash source)
export * from './output-asset';       // OutputAsset (one generated file)
export * from './tasks/generate';     // run(ctx) — the same function the CLI invokes
export * from './platforms/ios';      // IosAssetGenerator + per-template consts
export * from './platforms/android';  // AndroidAssetGenerator + per-template consts
```

A minimal programmatic invocation that bypasses the CLI entirely:

```ts
import {
  Project,
  IosAssetGenerator,
  AndroidAssetGenerator,
  PwaAssetGenerator,
} from '@capacitor/assets';

const project = new Project(projectRoot, /* capacitorConfig */);
await project.load();
const assets = await project.loadInputAssets(); // reads assets/logo.png etc.

const generators = [
  new IosAssetGenerator({ iconBackgroundColor: '#fff', /* ... */ }),
  new AndroidAssetGenerator({ iconBackgroundColor: '#fff', /* ... */ }),
  new PwaAssetGenerator({ /* ... */ }),
];

for (const kind of Object.values(assets).filter(Boolean)) {
  await Promise.all(generators.map(g => kind.generate(g, project)));
}
```

Or shorter: import `run` from `tasks/generate` and pass a `Context` (from
`./ctx.loadContext()`) with the same args the CLI assembles. Issue #592 could
have been closed with a five-line example.

**Programmatic hooks** that matter:

- `InputAsset.generate(generator, project)` is the unit of work and is fully
  awaitable — parallelise per-asset and stream progress.
- `OutputAsset` exposes `template.platform`, `template.kind`,
  `getDestFilename(name)`, and `getOutputInfo(name)` (size in bytes) — enough
  to build a structured MCP result payload.
- `AssetKind` enum (`Logo`, `LogoDark`, `Icon`, `IconForeground`,
  `IconBackground`, `Splash`, `SplashDark`, `AdaptiveIcon`) lets us
  selectively regenerate a subset.
- Per-platform `*AssetGenerator` classes take `AssetGeneratorOptions`, which
  is just the CLI flag bag as a typed object.

## Supported project types

- **Capacitor 5.x+ iOS / Android / PWA.** The hard dependency is
  `@capacitor/cli ^5.3.0`; it reads `capacitor.config.(ts|json)` via `Project`
  to discover the iOS and Android project paths. Works with Ionic Angular /
  React / Vue apps because those are Capacitor apps in this layer.
- **Capacitor 6+ / 7+** — the Capacitor docs page (v8) still points at this
  tool, so it's compatible in practice even though the declared peer range is
  5.x.
- **Plain PWA** — `--pwa` writes WebP icons into the web project and patches
  the manifest file, no native project required.
- **Cordova — explicitly dropped.** The README calls this out: Cordova support
  was removed in 1.x. This is the opposite of `cordova-res`, which
  `capacitor-assets` was designed to replace. Anyone with a Cordova project
  has to use `cordova-res` or migrate.

## Inputs

- **Easy mode:** `assets/logo.(png|svg)` + optional `logo-dark.*`, plus four
  hex color flags. Raster logo ≥1024²; SVG any size.
- **Custom mode:** `icon-only.(png|jpg)` ≥1024²,
  `icon-foreground.(png|jpg)` ≥1024² (Android adaptive FG),
  `icon-background.(png|jpg)` ≥1024² (Android adaptive BG),
  `splash.(png|jpg)` ≥2732², `splash-dark.(png|jpg)` ≥2732².
- Any subset is allowed; `run` early-exits only if all of
  `{logo, icon, splash, splashDark}` are missing.

## Outputs

Reading `src/platforms/*/assets.ts` gives the exact matrix.

**iOS — `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:**

- One 1024×1024 `AppIcon-512@2x.png` (App Store icon, universal idiom). This
  is intentionally minimal: modern Xcode 14+ accepts a single 1024² source and
  generates the rest at build time, so capacitor-assets writes just the
  marketing icon plus a matching `Contents.json` entry.
- Universal-anyany splashes at 1×, 2×, 3× (`Default@{1,2,3}x~universal~anyany.png`,
  each 2732×2732) plus dark-mode twins
  (`Default@{1,2,3}x~universal~anyany-dark.png`). The Xcode storyboard then
  references the anyany trait set.

**Android — `android/app/src/{flavor}/res/`:**

- Icons (`mipmap-{l,m,h,xh,xxh,xxxh}dpi/ic_launcher.png`) at
  36/48/72/96/144/192 px — the six legacy densities.
- Adaptive icons (`mipmap-{density}/ic_launcher_foreground.png` and the
  background layer) at 81/108/162/216/324/432 px — the larger canvas required
  by Android 8.0+'s foreground/background separation, which the OS then masks
  into circle/squircle/teardrop. This is the hot path on modern Android.
- Splash screens (`drawable-{port,land}-{density}/splash.png`) at every
  density, portrait + landscape, plus full dark-mode (`-night`) variants.
  Twelve screens per theme. This matches Android 12's splash-screen API
  (a smaller icon over a colored background) once you also set the XML
  theme attributes, which the tool patches.

**PWA — project's `public/`/`src/`/`www/` + manifest:**

- WebP icons at 48/72/96/128/192/256/512 px (`icon-{size}.webp`).
- A 2048×2048 `apple-splash.webp`, plus the set of Apple device splashes
  fetched live from Apple's HIG page (13 portrait sizes hardcoded as a
  fallback list: 2048×2732, 1668×2388, …, 640×1136). `--pwaNoAppleFetch`
  disables the live fetch for offline or sandboxed builds.
- `manifest.webmanifest` (preferred) or `manifest.json` is created if missing
  and **merged in place** if present — it patches `icons[]` and
  `theme_color` without destroying existing fields, using
  `node-html-parser` to keep JSON ordering predictable.

## Bindings we need

This is the cleanest drop-in for the **app-icon / splash** slice of
`resize_icon_set` (gap **G11** in the 20-series index, confirmed by finding 6
and the 20b "platform-spec enforcement" section). The plugin should expose:

1. **`capacitorAssets.generate(options)`** — thin wrapper over
   `tasks/generate.run(ctx)` that accepts an in-memory logo buffer (written
   to a temp `assets/` dir), the four color strings, and platform filters.
   Return `OutputAsset[]` so we can surface filenames, dimensions, and byte
   sizes in the MCP response.
2. **`capacitorAssets.iconOnly(buffer)`** — wrap `IosAssetGenerator` +
   `AndroidAssetGenerator` against a synthetic `Project` in a temp directory,
   so we can run **without a real Capacitor project on disk** and zip the
   resulting folder tree. This is the missing "OSS appicon.co" UX;
   capacitor-assets already produces the right native-project layout, we
   just build the wrapper.
3. **Capability report in `route_model` / `validate_asset`.** Check the 1024²
   and 2732² minimums, and contrast between the generated logo and chosen
   background — checks the tool itself does not perform.
4. **Brand-bundle wiring.** `brand.md` → the four background colors
   (light/dark icon + splash), derived from palette surface tokens. Turns
   capacitor-assets from "user supplies colors" into "brand inherits colors".
5. **PWA manifest as a discovery artifact.** When we detect an existing
   `manifest.webmanifest`, feed it through capacitor-assets' merge path so we
   never clobber custom fields like `shortcuts`, `share_target`, or
   localized names.

Inherited deps: `sharp` (already in our stack), `plist`, `fs-extra`,
`node-fetch` (live Apple fetch, network-gated), `@trapezedev/project` (XML).
No GPL contamination; everything MIT / Apache-2.0.

One limitation worth flagging: capacitor-assets **does not regenerate every
Ionic-template Android file** — issue
[#399](https://github.com/ionic-team/capacitor-assets/issues/399) shows
`drawable/splash.png`, `ic_launcher_background.xml`, and
`ic_launcher_foreground.xml` sometimes left stale. Our wrapper should log
this and optionally overwrite the XML drawables in a second pass.

## Decision

**Adopt as the canonical iOS/Android native-project asset generator for the
`resize_icon_set` MCP tool and use its Node API directly — do not shell out.**
MIT, ~118 KB, precisely scoped, and already models the exact output matrix we
need (iOS `AppIcon.appiconset` with universal-anyany splashes; Android
six-density legacy icons + six-density adaptive layers + 24 splashes with
dark-mode twins; PWA WebP set + manifest merge). Crucially, `src/index.ts`
exposes `tasks/generate.run`, `IosAssetGenerator`, `AndroidAssetGenerator`,
`PwaAssetGenerator`, `Project`, `InputAsset`, and `OutputAsset` — a full
programmatic surface the community has under-utilised. Pair with
`onderceylan/pwa-asset-generator` (exhaustive favicon / mstile / Apple-touch)
and `akabekobeko/npm-icon-gen` (`.ico` / `.icns`), and the AI-generated 1024²
master mark drops cleanly into a drop-in-get-everything flow. No fork
required; v1 integration is `npm i @capacitor/assets` + a ~200-line wrapper.
