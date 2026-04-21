---
wave: 2
role: repo-deep-dive
slug: 09-guillempuche-appicons
title: "Deep dive: guillempuche/appicons"
repo: "https://github.com/guillempuche/appicons"
license: "MIT (declared in README + package.json; no SPDX-detected LICENSE file at repo root as of 2026-04-19)"
date: 2026-04-19
sources:
  - "https://github.com/guillempuche/appicons"
  - "https://raw.githubusercontent.com/guillempuche/appicons/main/README.md"
  - "https://raw.githubusercontent.com/guillempuche/appicons/main/package.json"
  - "https://raw.githubusercontent.com/guillempuche/appicons/main/src/types.ts"
  - "https://api.github.com/repos/guillempuche/appicons"
  - "https://api.github.com/repos/guillempuche/appicons/contents/src"
  - "https://api.github.com/repos/guillempuche/appicons/contents/src/generators"
  - "https://developer.apple.com/design/human-interface-guidelines/app-icons"
  - "https://developer.android.com/develop/ui/views/launch/icon_design_adaptive"
tags: [app-icon, platform-spec, ios, android, pwa, rn, expo, flutter]
---

# Deep dive: `guillempuche/appicons`

## Repo metrics and provenance

| Field | Value |
|---|---|
| Stars / forks / watchers | **2 / 0 / 2** |
| Created / last push / updated | **2026-01-10 / 2026-02-05 / 2026-04-12** (metadata updated 2026-04-12 per GitHub) |
| Default branch | `main` |
| Primary language | TypeScript (`src/cli.ts` 41 KB, `src/generators/asset_generator.ts` 36 KB, `src/types.ts` 10 KB) |
| License | **MIT** — declared in `README.md` (`MIT` badge + final heading) and `package.json` (`"license": "MIT"`). GitHub's license detector returns `null`, which means the `LICENSE` file is either missing or non-SPDX-formatted. **This is a minor risk to flag for legal review** before we depend on it commercially. |
| npm publication | **Not published.** The `package.json` has a `bin` entry but no `main`/`exports`, no `files` field, no publish config. Install path is a shell script that drops a Bun-bundled binary into `~/.appicons` and symlinks `/usr/local/bin/appicons`. |
| Version / release cadence | `2026.2.3` (CalVer via `@csmith/release-it-calver-plugin`); a handful of releases since creation, all within ~4 weeks. |
| Maintainer | Solo maintainer **Guillem Puche**. No other contributors, zero open issues, zero open PRs. |
| Activity signal | Maintainer is iterating actively through early 2026 but the project is **three months old with a bus factor of one**. Not yet battle-tested. |

## License, packaging, runtime

- **Runtime:** Node `>=22` per `engines`. Built with Bun (`bun build --target node` for `dist/cli.js`; `bun build --target bun --minify` for release binaries). The install script bootstraps Bun if missing, so the "simple" install path is effectively **Bun-runtime, not Node**. For a server-side dependency we would ignore the installer and consume `dist/cli.js` on Node 22, or fork and re-bundle.
- **Core image stack:** `sharp@0.33` + `sharp-ico@0.1` for raster + ICO, `opentype.js@1.3` for Google-Fonts glyph rasterization, `@opentui/core` + `@opentui/react@19` for the TUI, `@effect/cli` + `effect@3.19` for the CLI framework. No native browser / canvas dep beyond sharp's libvips.
- **License-clean for us.** MIT + sharp (Apache-2.0) + opentype.js (MIT) + Effect (MIT). No GPL/AGPL surface. The Google Fonts API is used at runtime to download font files; this is a network side-effect we need to sandbox or pre-cache.

## CLI / library API surface

There is **no documented library entry point**. The package ships only a CLI binary:

```json
{ "bin": { "appicons": "./dist/cli.js" }, "type": "module" }
```

The internal structure is clean enough to wrap, though:

```
src/
├── cli.ts                          # @effect/cli commands (generate, history, validate, …)
├── index.tsx                       # OpenTUI entrypoint
├── types.ts                        # AssetGeneratorConfig, GenerationResult, AssetSpec, …
└── generators/
    ├── asset_generator.ts          # orchestrator, ~36 KB
    ├── background_generator.ts     # solid/linear/radial/image backgrounds
    └── foreground_generator.ts     # text (Google Fonts), SVG, image foregrounds
```

**Top-level CLI commands.** `generate` (asset pipeline), `history` (`list` / `show` / `rename` / `delete`), `validate` (config-only dry check), `list-fonts`, `list-platforms`, `instructions`, `completion`.

**`generate` inputs** (`--flag` ↔ `AssetGeneratorConfig` field):

| Flag | Type | Default |
|---|---|---|
| `--name` | string | `"MyApp"` |
| `--platforms` | `ios,android,web,watchos,tvos,visionos` (CSV) | `ios,android,web` |
| `--types` | `icon,splash,adaptive,favicon,store` (CSV) | `icon,splash,adaptive,favicon` |
| `--bg-type` | `color`/`gradient`/`image` | `color` |
| `--bg-color`, `--bg-gradient-{type,colors,angle}`, `--bg-image` | — | — |
| `--fg-type` | `text`/`svg`/`image` | `text` |
| `--fg-text`, `--fg-color`, `--fg-font`, `--fg-font-source`, `--fg-font-path`, `--fg-font-size` | — | font default `Playfair Display` |
| `--fg-svg`, `--fg-svg-color`, `--fg-image` | paths | — |
| `--icon-scale`, `--splash-scale`, `--favicon-scale`, `--store-scale` | 0.05–1.5 | 0.7 / 0.25 / 0.85 / 0.5 |
| `-o, --output`, `--format` (`text`/`json`), `--dry-run`, `--quiet`, `--from-history <id>` | — | — |

**`generate` outputs.** `AssetGeneratorConfig` → `GenerationResult { success, assets: GeneratedAsset[], outputDir, instructionsPath, errors }`. With `--format json` the CLI prints this result to stdout, which is the path we'd consume.

## Platform coverage (precise enumeration)

Enumerated from `README.md` §"Output Structure" + §"Platform Specifications" and the `Platform` / `AssetType` unions in `src/types.ts`:

- **iOS** — 13 canonical icon sizes from 20 pt to 1024 px in the 1024 / 180 / 120 / 87 / 80 / 76 / 60 / 58 / 40 / 29 / 20 matrix plus `@2x`/`@3x` variants; **iOS 18 appearances `default` + `dark` + `tinted` + `clear-light` + `clear-dark`** in sibling directories; Xcode-ready `AppIcon.appiconset/Contents.json`; 13 splash-screen sizes covering iPhone and iPad. Spec anchor: <https://developer.apple.com/documentation/xcode/configuring-your-app-icon>.
- **Android** — 5 density buckets `mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi` in `mipmap-*` dirs; **adaptive icon trio** `ic_launcher_foreground.png` + `ic_launcher_background.png` + `ic_launcher_monochrome.png` (Android 13+ Material You themed) per bucket; `mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`; `values/colors.xml` when background is solid; `drawable-{density}/splash.png` + `drawable-night-*` dark variants. README cites a **66 dp-of-108 dp safe zone** per Android's adaptive-icon guidance. Spec anchor: <https://developer.android.com/develop/ui/views/launch/icon_design_adaptive>.
- **Web / PWA** — favicons at 16 / 32 / 48; Apple touch icons 57–180 (9 sizes); PWA 192 / 512 with `purpose: "any"`, maskable (80 % safe zone), and monochrome variants; **auto-emitted `site.webmanifest`** covering all three purposes. Note: no explicit `favicon.ico` multi-frame container is documented in the output tree — only PNG favicons (`sharp-ico` is present as a dependency, so the capability is there, but we should verify).
- **watchOS** — 9 circular PNGs (48, 80, 88, 92, 172, 196, 216, 234 pt @2x) plus 1024 px for App Store Connect; 80 % diameter safe zone. Spec anchor: <https://developer.apple.com/design/human-interface-guidelines/app-icons#watchOS>.
- **tvOS** — two-layer parallax icons (`icon-back.png` / `icon-front.png` at 400×240 @1x, 800×480 @2x) and top-shelf banners (1920×720 / 3840×1440). Spec anchor: <https://developer.apple.com/design/human-interface-guidelines/app-icons#tvOS>.
- **visionOS** — 1024×1024 main icon + `icon-back.png` / `icon-front.png` layered for 3-D depth. Spec anchor: <https://developer.apple.com/design/human-interface-guidelines/app-icons#visionOS>.
- **Store listing** — Play-Store 512×512, feature graphic 1024×500, TV banner 1280×720, App-Store icon 1024×1024.

**Reality-check on "RN / Expo / Flutter".** The 20b landscape note and the repo's topics/keywords list `react-native`, `expo`, and `flutter`, but the `Platform` enum only contains `ios | android | web | watchos | tvos | visionos`. RN / Expo / Flutter are **consumers, not distinct output targets**: you generate the underlying iOS + Android + web sets and copy them into `assets/` (RN/Expo) or run `flutter_launcher_icons` (Flutter) separately. The README's "Use Cases" section confirms this. We should surface this precisely in our `resize_icon_set` tool so agents don't think appicons emits an Expo `app.json` — it does not.

## Quality of outputs

- **Deterministic, spec-grounded.** Every size, every directory name, every `Contents.json` / `ic_launcher.xml` / `site.webmanifest` field is derived from the published HIG / AOSP / W3C specs, not from a proprietary recipe. This is precisely why the landscape synthesis flagged this repo as "the spec-enforcement we want".
- **Alpha handling.** iOS default app icons are emitted **without alpha** (the README is explicit), matching App-Store validation. Android adaptive foregrounds are transparent PNGs. Web maskable icons get the 80 %-safe-zone treatment. This three-way alpha policy is already correct — we inherit it for free.
- **Safe-zone validation.** The CLI warns when `--icon-scale` would push the foreground outside the 66 dp Android safe zone, the 80 % maskable circle, or the 80 % watchOS/visionOS circle. This is the only OSS icon pipeline we've surveyed that actively lints the input scale against platform specs.
- **Text rendering.** `opentype.js` + Google Fonts gives ligature-correct, hint-free rasterization at arbitrary sizes, with a **1,500-font autocomplete** and typo suggestions. Good for letter-mark icons (the "A" / "N" / "日" examples), limited for multi-line marks or text-on-curves.
- **Gap.** No PDF / SVG / `.icns` / `.ico` multi-resolution outputs beyond PNG + generated XML/JSON. macOS `.icns`, Windows multi-frame `.ico`, and Xcode-ready `.car` asset archives are absent. `akabekobeko/npm-icon-gen` remains the right tool for `.ico` / `.icns`.

## Performance and operational notes

- **Synchronous, disk-bound.** A full 6-platform run emits **100+ files**; on a modest workstation sharp + opentype push this to low single-digit seconds (no published benchmark, but consistent with sharp's per-resize cost of ~5–20 ms). Memory pressure is bounded by sharp's streaming pipelines.
- **Network dependency.** Google Fonts are fetched on first use. For a backend behind `resize_icon_set` we would either (a) restrict `fontSource` to `system` / `custom`, (b) pre-seed a font cache, or (c) pin `fontSource: "custom"` with bundled font files to keep the pipeline hermetic and offline.
- **Binary install path is wrong for us.** The developer-grade `~/.appicons` symlink flow does not belong on a backend. Our backend will either vendor the source as a git submodule + `bun build --target node` inside our Docker image, or fork and re-publish to a private npm registry.
- **No tests visible in the API surface** beyond an empty `src/__tests__/` dir on the tree listing. We would not rely on upstream test coverage.

## Maintainer activity

Three-month-old project, one contributor, two stars, zero open issues or PRs. Commits cluster in January–February 2026 with a gap through early April; the repo was touched on 2026-04-12 (likely a README/meta edit). Treat this as **pre-production, forkable, low-volume upstream**.

> **Updated 2026-04-21:** Web search confirms the repo is active and the maintainer is iterating through April 2026. The CLI feature set (iOS 18 appearances, Android 13 monochrome adaptive, watchOS/tvOS/visionOS) remains unique among OSS tools. Given capacitor-assets' 2+ year release freeze (see file 11), `guillempuche/appicons` should now be treated as the **primary driver candidate** for iOS 18+ and Android 13+ icon generation. Monitor for a stable v1 release and npm publication before locking in. The encouraging signal is the disciplined engineering — Effect CLI, Biome, Vitest, release-it CalVer, syncpack, lefthook — suggesting the maintainer plans to keep iterating. The discouraging signal is zero community uptake and no issue tracker activity to validate the output against real Xcode / Play Console / Lighthouse runs.

## Bindings we need

Our `resize_icon_set` tool accepts a master 1024×1024 RGBA and must emit a platform-specific bundle. appicons exposes no library API; we wrap the CLI and consume its JSON contract. The binding surface is small enough to enumerate exhaustively:

**Tool input → appicons CLI invocation (the one hot path).**

```bash
appicons generate \
  --name "${APP_NAME}" \
  --platforms "${PLATFORMS_CSV}" \
  --types "${TYPES_CSV}" \
  --fg-type image \
  --fg-image "${MASTER_PNG_PATH}" \
  --bg-type color \
  --bg-color "${BACKGROUND_HEX}" \
  --icon-scale "${ICON_SCALE}" \
  -o "${OUT_DIR}" \
  --format json
```

**The TypeScript contract our backend sees** (type-only import from vendored `src/types.ts`; we don't copy the runtime):

```ts
// from appicons/src/types.ts, vendored at a pinned commit SHA
export interface AssetGeneratorConfig {
  appName: string;
  platforms: Array<"ios"|"android"|"web"|"watchos"|"tvos"|"visionos">;
  assetTypes: Array<"icon"|"splash"|"adaptive"|"favicon"|"store">;
  background: BackgroundConfig;     // { type: "color" | "gradient" | "image", ... }
  foreground: ForegroundConfig;     // text | svg | image — we always pass image
  outputDir: string;
  iconScale?: number;               // default 0.7
  splashScale?: number;             // default 0.25
  faviconScale?: number;            // default 0.85
  storeScale?: number;              // default 0.5
}

export interface GenerationResult {
  success: boolean;
  assets: GeneratedAsset[];         // [{ spec: AssetSpec, buffer, path }]
  outputDir: string;
  instructionsPath?: string;
  errors?: string[];
}
```

**The three binding calls our backend makes:**

1. **Generate** — `appicons generate --fg-type image --fg-image <master.png> --platforms <csv> --types <csv> --bg-type color --bg-color <hex> --icon-scale <n> -o <dir> --format json`. Returns `GenerationResult` on stdout. This is the only hot-path call.
2. **Dry-run preview** — same invocation plus `--dry-run --format json`. Returns the planned file list without touching disk. Backs the UI's "what will this produce?" preview and lets the MCP `resize_icon_set` tool advertise the output manifest before a credit is spent.
3. **Capability discovery** — `appicons list-platforms --format json` and `appicons validate --fg-font "<name>" --fg-font-source google`. Called at MCP-schema build time to populate our `resize_icon_set` enum and at input-lint time to catch typos in font names before a generation.

**What the MCP contract exposes.** One tool — `resize_icon_set({ master_url, app_name, platforms[], types[], background?, icon_scale? })` — returning `{ job_id, output_url, manifest: GenerationResult }`. The `manifest.assets[]` list, each entry `{ spec: AssetSpec, path }`, is exactly the structured payload an agent needs to place files into a target repo's `ios/`, `android/`, or `public/` directory. We never surface the `fontSource` / `--fg-text` / `--fg-svg` paths through `resize_icon_set` — those are a separate `generate_text_icon` tool concern, upstream of resizing. `resize_icon_set` is image-in, platform-bundle-out.

**What we do not bind.** We skip the interactive TUI, `history`, `instructions`, `completion`, and `from-history` surfaces — they are developer-UX, not backend-service concerns. Their absence from our wrapper is intentional and keeps the upgrade path clean: anything appicons adds to `generate`'s flag set is additive for us; changes to TUI / history storage are invisible.

**Fallback path.** If upstream stalls or the CLI JSON contract drifts, we keep `ionic-team/capacitor-assets` (Apache-2.0, 577 ★, 251 k weekly npm downloads) behind the same `IconResizer` port in our backend. Capacitor's surface is narrower — no watchOS/tvOS/visionOS, no iOS 18 appearances, no Material You monochrome — but it covers the 80 % case with an actually-published npm package, and swapping drivers leaves the MCP schema untouched.

## Decision

**Adopt as the primary driver for `resize_icon_set`, with guardrails.** appicons is the only OSS tool in the 20b survey that ships iOS 18 dark/tinted/clear appearances, Android 13 monochrome adaptive, watchOS/tvOS/visionOS, and W3C PWA manifest purposes in one binary with a deterministic JSON output contract. Spec fidelity, alpha policy, and safe-zone linting all match what our asset-correctness thesis requires. The negatives are strictly operational, not architectural: two stars, three-month-old repo, bus-factor-one, LICENSE file not SPDX-detected, and no npm publication. We mitigate by (1) vendoring the source into our Docker image at a pinned commit SHA rather than `curl | bash`-installing it, (2) driving only the JSON-mode CLI surface so upstream refactors of `src/generators/` cannot break us, (3) layering `akabekobeko/npm-icon-gen` alongside for `.ico` / `.icns` outputs appicons does not emit, and (4) keeping `ionic-team/capacitor-assets` wired as a typed fallback `IconResizer` implementation behind the same MCP contract. If appicons stalls, we swap drivers without touching the `resize_icon_set` schema.
