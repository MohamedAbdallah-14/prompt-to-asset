---
wave: 2
role: repo-deep-dive
slug: 10-pwa-asset-generator
title: "Deep dive: onderceylan/pwa-asset-generator"
repo: "https://github.com/onderceylan/pwa-asset-generator"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/elegantapp/pwa-asset-generator
  - https://raw.githubusercontent.com/elegantapp/pwa-asset-generator/master/README.md
  - https://raw.githubusercontent.com/elegantapp/pwa-asset-generator/master/CLAUDE.md
  - https://www.npmjs.com/package/pwa-asset-generator
  - https://itnext.io/pwa-splash-screen-and-icon-generator-a74ebb8a130
  - https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon/
  - https://web.dev/maskable-icon/
tags: [pwa, splash, apple-touch-icon, manifest, onderceylan]
---

# Deep dive: `onderceylan/pwa-asset-generator`

## Repo identity and metrics

Repository: [`elegantapp/pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator) (the `onderceylan/*` URL now redirects; the project moved into the `elegantapp` GitHub org but Önder Ceylan is still the sole author). License **MIT**, TypeScript (~197 KB unpacked, 52 files), **3,006 ★**, **17.6 k weekly npm downloads**, latest **v8.1.4 (2026-03-14)**. Nine runtime deps, semantic-release on master, Vitest suite with pixel-by-pixel visual snapshots, and a daily "Sanity Check" GitHub Action that monitors Apple's HIG page for spec changes. Maintained, narrow-scope, production-grade — the closest thing the PWA ecosystem has to a canonical spec-compliance layer.

> **Updated 2026-04-21:** v8.1.4 (2026-03-14) confirmed as latest release via npm and GitHub releases. Star count ~3,006 and weekly downloads ~17.6k confirmed against web sources. Active issue filed March 17, 2026, indicating maintainer monitoring. Status: **actively maintained**. No changes needed to adoption decision.

## What it actually does

Given **one source artifact** — a local or remote image (PNG/JPG/SVG/WebP) *or* a local/remote HTML file — and an output folder, PAG produces the **complete** image set and meta-tag wiring a PWA needs to look native on iOS, Android, Windows tile, and legacy favicon surfaces. The engine is Puppeteer + headless Chromium: PAG builds a throwaway shell HTML page as an "art board", centers the source over a configurable CSS background with configurable padding, opens it in Chromium at each target resolution, and screenshots the viewport. That is what lets HTML inputs use CSS gradients, SVG filters, variable fonts, and `prefers-color-scheme` media queries — every spec-sized screenshot comes out of a real browser, not a canvas approximation.

Output categories (each togglable):

- **Android / PWA manifest icons** — the standard icon sizes the Web App Manifest expects, written (or merged) into `manifest.json` with `"purpose": "any maskable"` when `--maskable` is on.
- **Apple touch icons** — `apple-touch-icon` home-screen icons at all sizes Apple's HIG currently requires.
- **Apple splash screens** — `apple-touch-startup-image` per device, **portrait and landscape**, with device-specific `media` queries (`device-width` × `device-height` × `-webkit-device-pixel-ratio` × `orientation`). Supports dual light/dark sets via `--dark-mode` + `prefers-color-scheme`.
- **Favicons** — `--favicon` generates the PNG + `<link rel="icon">` tag.
- **MS tiles** — `--mstile` generates Windows static tile icons + meta tags.

After generating pixels, PAG walks the user's existing `manifest.json` (via `cheerio`/JSON merge) and `index.html` (via `cheerio`), inserts or updates the generated entries in place, and re-formats the HTML with `pretty`. It can be told to serialize with `--xhtml` self-closing tags and `--single-quotes` so the output drops cleanly into JSX/TSX.

## Apple-spec sourcing: scrape + fallback

The iOS spec surface is the hard part — Apple publishes no machine-readable table, and `apple-touch-startup-image` media queries are under-documented in the Safari Web Content Guide. PAG solves this two ways: **live scrape** (default `--scrape true`) — Puppeteer opens Apple's HIG launch-screen page, parses the device table, emits `portrait`/`landscape` specs with `scaleFactor` (@2x/@3x); and **static fallback** (`src/config/apple-fallback-data.json`) if scraping fails or is disabled. CI diffs Apple's page daily and auto-updates the JSON before each release via `npm run update`. The static table is also exported on the module API as `appleDeviceSpecsForLaunchImages`, so consumers can render their own `<link rel="apple-touch-startup-image" …>` tags in JSX without invoking the generator. That export alone — an authoritative, kept-fresh list of every iOS device's launch-image spec — is a small standalone product.

## CLI surface (v8.x)

Parsed with [meow](https://github.com/sindresorhus/meow); entry point `src/cli.ts` → `src/main.ts#generateImages()`:

```
pwa-asset-generator [source] [output]
```

| Flag | Purpose | Default |
|---|---|---|
| `-b --background` | CSS background (`linear-gradient(...)`, `#fff`, etc.) | `transparent` |
| `-o --opaque` | White canvas, non-transparent output | `true` |
| `-p --padding` | CSS padding around source | `"10%"` |
| `-s --scrape` | Scrape Apple HIG live | `true` |
| `-m --manifest` | Path to manifest.json to update | — |
| `-i --index` | Path to index.html to update | — |
| `-a --path` | Href prefix (e.g. `%PUBLIC_URL%`) | — |
| `-v --path-override` | Hard override of href paths | — |
| `-t --type` | `png` \| `jpg` | `jpg` (manifest entries always PNG) |
| `-q --quality` | JPG quality 0-100 | `70` |
| `-h --splash-only` / `-c --icon-only` | Limit output category | `false` |
| `-f --favicon` / `-w --mstile` | Include favicon / MS tile | `false` |
| `-e --maskable` | Declare maskable in manifest | `true` |
| `-l --landscape-only` / `-r --portrait-only` | Orientation filter | `false` |
| `-d --dark-mode` | Emit `prefers-color-scheme: dark` media attr | `false` |
| `-u --single-quotes` / `-x --xhtml` | JSX-friendly tag serialization | `false` |
| `-g --log` | Step logging | `true` |
| `-n --no-sandbox` | Linux CI escape hatch (disables HTML inputs for security) | `false` |

## Node API surface (for programmatic use)

```js
import { generateImages, appleDeviceSpecsForLaunchImages } from 'pwa-asset-generator';

const { savedImages, htmlMeta, manifestJsonContent } = await generateImages(
  source,          // file path | URL | HTML path
  outputDir,       // string | undefined
  options          // camelCase mirror of CLI flags: scrape, background, splashOnly, ...
);
```

Three return fields are the entire contract:

- `savedImages: SavedImage[]` — `{ name, width, height, path, scaleFactor?, orientation?, platform? }` for every file written.
- `htmlMeta: { name: string; value: string }` — pre-rendered meta-tag blocks keyed by category (`favicon`, `appleMobileWebAppCapable`, `appleLaunchImage`, `appleTouchIcon`, `msTile`) so callers can splice into any template language, not only `index.html`.
- `manifestJsonContent: ManifestJsonIcon[]` — icon entries ready to be merged into an arbitrary manifest.json.

Architectural split (from `CLAUDE.md`): `main.ts` orchestrates; `helpers/puppets.ts` owns Puppeteer; `helpers/browser.ts` manages the browser lifecycle and Chromium install check; `helpers/meta.ts` produces HTML + manifest via Cheerio; `helpers/images.ts` builds the device-spec image list; `helpers/flags.ts` normalizes options and enforces mutually-exclusive pairs. The `saveImages` concurrency pool is tuned by CPU + free memory, with `PAG_SIMULATE_CPU_COUNT` / `PAG_SIMULATE_FREE_MEM_MB` env knobs for constrained environments.

## Chromium requirement and deployment shape

PAG uses `puppeteer-core`, not full `puppeteer`. Chromium is not bundled; the `bin/install.js` post-install step only downloads one if absent, saving 110-150 MB vs. naive Puppeteer use. Any container running PAG must either ship Chromium or accept a ~150 MB first-run download. **No official Docker image exists** — users typically extend `node:20-slim` + `chromium` or `ghcr.io/puppeteer/puppeteer`. The `--no-sandbox` flag is the documented Linux-CI escape hatch, with one caveat: **HTML inputs are disabled when sandbox is off**, for security; image inputs still work. Our wrapper should default to image inputs — which is what an upstream T2I model produces anyway — so the sandbox distinction never leaks into product UX.

## What this repo does *not* do

- No raster-to-vector conversion (we still need vtracer/Recraft for SVG output).
- No background removal — if the source has a checkered PNG background, PAG faithfully screenshots the checkered background. Alpha correctness is the caller's responsibility (`--opaque false --type png` is necessary but not sufficient).
- No Android **adaptive icon** XML/foreground-background layer emission (unlike `ionic-team/capacitor-assets`). PAG handles Material You through maskable manifest declarations but does not emit `ic_launcher_foreground.png` + `ic_launcher_background.png` pairs.
- No watchOS / tvOS / visionOS asset catalogs (those live in `guillempuche/appicons` and `ionic-team/capacitor-assets`).
- No Xcode `.appiconset` / `Contents.json` emission.
- No prompt, no LLM, no generation step — PAG is strictly a downstream resizer/manifester.

## Bindings we need for our MCP

Wrap PAG as a first-class capability behind our `resize_icon_set` / `emit_pwa_bundle` tool family:

1. **Node API in-process, not CLI spawn.** Import `generateImages`; CLI spawning adds startup cost and blunts error surfacing.
2. **MCP tool `emit_pwa_bundle`.** Parameters: `{ source, output_dir, background?, padding?, type?, quality?, include: { icons, splash, favicon, mstile, maskable }, orientation?, dark_mode?, path_prefix?, path_override?, xhtml?, single_quotes? }`. Return `{ saved_images, html_meta, manifest_json_content }` verbatim — already the right shape for agents.
3. **Zod schema mirrors PAG's options.ts.** Enforce mutually-exclusive pairs (`splash_only` vs `icon_only`, `landscape_only` vs `portrait_only`) at the schema layer.
4. **Chromium provisioning.** Bake Chromium into our Docker image, set `PUPPETEER_EXECUTABLE_PATH`, pass `--no-sandbox` in hosted environments. Warm the browser across calls via a shared `BrowserManager` singleton (PAG opens/closes per run; wrap it to amortize the 300-600 ms startup).
5. **Light/dark dual-run helper.** PAG requires two invocations for a light+dark splash pair. Expose `emit_pwa_bundle_dual(light_source, dark_source, ...)` that serializes the two runs and merges `htmlMeta.appleLaunchImage` blocks — otherwise every agent rediscovers this footgun.
6. **Resource: `appleDeviceSpecsForLaunchImages`.** Re-export as a read-only MCP resource / `get_apple_device_specs` tool for agents authoring head components in JSX without triggering generation.
7. **Alpha verifier upstream of PAG.** PAG faithfully screenshots whatever it's given, checkered background and all. Run BRIA RMBG 2.0 / rembg + alpha-coverage check on the source *before* invoking PAG.
8. **Concurrency ceiling.** Expose `PAG_SIMULATE_CPU_COUNT` / `PAG_SIMULATE_FREE_MEM_MB` in container env. Default hosted tier to `CPU=2, MEM=2048` per request so multi-tenant serverless does not thrash.
9. **Manifest merge + dry-run.** PAG merges `manifest.json` and `index.html` in place; our MCP should expose a dry-run mode returning the diff so agents can preview before writing to a user's repo.
10. **Offline fallback surfacing.** Pass `scrape: true` with a short navigation timeout; on timeout PAG auto-falls back to static data. Return `spec_source: "scraped" | "fallback" | "fallback_due_to_error"` so the agent can warn when running against stale specs.
11. **License.** MIT — depend via npm, no vendoring, no GPL/CC-BY-NC contamination risk.

## Complements in the stack

PAG covers PWA + iOS + favicon + MS tile. It does **not** cover native iOS `AppIcon.appiconset` (→ `akabekobeko/npm-icon-gen` or `ionic-team/capacitor-assets`), Android **adaptive icons** with foreground/background XML (→ `capacitor-assets` or `guillempuche/appicons`), or watchOS/tvOS/visionOS catalogs (→ `guillempuche/appicons`). Our `resize_icon_set` tool fans out: `{platforms: ["ios-native", "android-adaptive", "pwa", "favicon", "mstile", "watchos"]}` → PAG owns the PWA/iOS/favicon/mstile slice, native generators handle the rest, the MCP merges manifests.

## Decision

**Adopt as a first-party dependency for the PWA/iOS/favicon/mstile slice of `resize_icon_set` — wrap, do not reimplement.** PAG is the most rigorous, best-maintained, MIT-licensed answer to a problem (iOS splash-screen specs, maskable manifest entries, apple-touch-icon sizing) that keeps moving — Apple revises device resolutions yearly and PAG has daily CI monitoring it. Reimplementing is several weeks for zero differentiation. The scoped gaps — no Android adaptive, no `.appiconset`, no alpha validation, no dual light/dark wrapper, no MCP surface — are exactly the glue layers where our product adds value. Bind to the Node API in-process, bake Chromium into the container, expose the three-field return (`savedImages`, `htmlMeta`, `manifestJsonContent`) through `emit_pwa_bundle`, front it with an alpha-correctness pre-check and a dual-mode splash helper, and sit PAG alongside `capacitor-assets` + `npm-icon-gen` + `guillempuche/appicons` inside a platform-aware `resize_icon_set` fan-out. That closes the OSS `appicon.co` replacement gap (G11) in code.
