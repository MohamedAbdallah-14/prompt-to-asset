---
wave: 1
role: niche-discovery
slug: 10-oss-appicon-replacements
title: "OSS end-to-end appicon.co / icon.kitchen replacements"
date: 2026-04-19
sources:
  - https://github.com/zhangyu1818/appicon-forge
  - https://github.com/xcodeBn/app-icon-formatter
  - https://github.com/guillempuche/appicons
  - https://github.com/SuavePlan/iconz
  - https://github.com/sebinbenjamin/image-res-generator
  - https://github.com/devints47/pixel-forge
  - https://github.com/miguelcorderocollar/bundle-icon-generator
  - https://github.com/WebNaresh/expo-icon-generator
  - https://github.com/danielgwilson/makeicon
  - https://github.com/beplus/makeicon
  - https://github.com/Hkmu/icon-generator
  - https://github.com/drovp/icon-generator
  - https://github.com/genesistoxical/drop-icons
  - https://github.com/xsukax/xsukax-Favicon-Generator
  - https://github.com/corenominal/favicons.philipnewborough.co.uk
  - https://github.com/onmyway133/IconGenerator
  - https://github.com/safu9/electron-icon-builder
  - https://github.com/jaretburkett/electron-icon-maker
  - https://github.com/samafshari/AppIconMaker
  - https://github.com/tauri-apps/tauri
  - https://github.com/tauri-apps/tauricon
  - https://github.com/martiliones/icon-set-creator
  - https://github.com/itgalaxy/favicons
  - https://github.com/RealFaviconGenerator/realfavicongenerator
  - https://github.com/wighawag/pwag
  - https://github.com/niels-oz/icon-generator-mcp
  - https://github.com/albertnahas/icogenie-mcp
  - https://cmdsree.dev/projects/appiconly/
  - https://expo-assets-generator.vercel.app/
tags: [appicon, app-icon, ios, android, pwa, platform-spec]
---

# OSS end-to-end appicon.co / icon.kitchen replacements

**Research value: high** — the "drop-a-1024, get-every-platform-zip" niche is extremely crowded at the surface level but unoccupied at the agent-native layer, and the crowdedness itself is the main finding.

## Scope

Excludes `pwa-asset-generator`, `capacitor-assets`, `npm-icon-gen` (covered in [18/20](../18-asset-pipeline-tools/INDEX.md)). Target: *whole-pipeline* replacements — UI or CLI that take one source file and emit iOS `AppIcon.appiconset` + Android adaptive + PWA manifest + favicon ± OG/`.icns`/`.ico` — across hosted webapps, Electron GUIs, Rust/Go/Bun CLIs, Tauri apps, and MCP servers.

## Prior Art

### Hosted OSS webapps (the direct appicon.co/icon.kitchen clones)

| Project | Stars | License | Platforms | UX | API/MCP |
|---|---|---|---|---|---|
| [`zhangyu1818/appicon-forge`](https://github.com/zhangyu1818/appicon-forge) | 983 | MIT | iOS + Android export w/ Iconify composition, gradient/shadow/border tokens | **Best-in-class**: real-time preview, ~275k Iconify marks, Tailwind UI | None |
| [`xcodeBn/app-icon-formatter`](https://github.com/xcodeBn/app-icon-formatter) | 0 | MIT | iOS (with `Contents.json`), Android, macOS, watchOS | Minimal but correct — explicitly "inspired by appicon.co" | None |
| [AppIconly](https://cmdsree.dev/projects/appiconly/) (cmdsree) | not on GH index | MIT claim | iOS, Android, PWA; ZIP | Vite/React + browser-only processing; also a Chrome extension | None |
| [`danielgwilson/makeicon`](https://github.com/danielgwilson/makeicon) (`makeicon.dev`) | 1 | MIT | Web favicons, PWA (inc. maskable), Next.js, Chrome extension, Slack/Discord | Next.js + shadcn, drag/paste/URL, all-client ZIP | None |
| [`miguelcorderocollar/bundle-icon-generator`](https://github.com/miguelcorderocollar/bundle-icon-generator) | 0 | MIT | Zendesk apps, Raycast ext., PWA, macOS, favicons | Next 16 App Router + React 19; preset-first UX | None |
| [`WebNaresh/expo-icon-generator`](https://github.com/WebNaresh/expo-icon-generator) | 36 | MIT | Expo (iOS/Android/web) + splash | Next.js 15 + `sharp`, crop + bulk ZIP | None |
| `expo-assets-generator.vercel.app` / `expo-icons-generator.vercel.app` | hosted | unclear | Expo triad (`icon.png`, `adaptive-icon.png`, `favicon.png`, `splash.png`) | Polished, 10 MB upload limit | None |
| [`xsukax/xsukax-Favicon-Generator`](https://github.com/xsukax/xsukax-Favicon-Generator) | — | GPL-3.0 | Favicon only (multi-res `.ico`) | Vanilla JS, zero deps, crop UI | None |
| [`genesistoxical/drop-icons`](https://github.com/genesistoxical/drop-icons) | 121 | MIT | Windows `.ico` only | Drop UI, v3.6.1 active | None |
| [`corenominal/favicons.philipnewborough.co.uk`](https://github.com/corenominal/favicons.philipnewborough.co.uk) | — | MIT | Favicons + manifest + PWA screenshots | PHP 8.2/CodeIgniter/Bootstrap 5 self-host | None |

### Electron / desktop GUI variants

| Project | Stars | License | Platforms | Notes |
|---|---|---|---|---|
| [`onmyway133/IconGenerator`](https://github.com/onmyway133/IconGenerator) | 1,429 | MIT | iPhone/iPad/macOS/tvOS/watchOS; outputs `AppIcon.appiconset` or `.icns` | **Most-starred of the bunch**, Electron + `sharp`, but last release v1.2.0 (Sep 2018) — effectively stale |
| [`safu9/electron-icon-builder`](https://github.com/safu9/electron-icon-builder) | 153 | MIT | macOS `.icns`, Windows `.ico`, PNG set | CLI, fed by 1024² PNG |
| [`jaretburkett/electron-icon-maker`](https://github.com/jaretburkett/electron-icon-maker) | 216 | MIT | Same as above; original project | Used by many Electron forges |
| [`samafshari/AppIconMaker`](https://github.com/samafshari/AppIconMaker) | — | MIT | iOS + Android (C#/.NET) | Alternative runtime target |

### Rust / Go / Dart / Bun CLIs

| Project | Lang | Stars | License | Coverage |
|---|---|---|---|---|
| [`Hkmu/icon-generator`](https://github.com/Hkmu/icon-generator) | Rust | 1 | MIT | Windows/macOS/Linux/iOS/Android + Tauri (`--tauri-desktop`) |
| `tauri icon` (built-in) | Rust | 88k (parent) | Apache-2.0/MIT | Desktop + mobile from single PNG/SVG; the de-facto Tauri path |
| [`tauri-apps/tauricon`](https://github.com/tauri-apps/tauricon) | TS | — | MIT | **Archived** — folded into `tauri` CLI |
| [`beplus/makeicon`](https://github.com/beplus/makeicon) | Go | 119 | MIT | iOS + Android only; Homebrew install; single flag |
| [`SuavePlan/iconz`](https://github.com/SuavePlan/iconz) | Bun/TS | 1 | MIT | iOS/Android/PWA/Windows/macOS, SVG input, plugins |
| [`guillempuche/appicons`](https://github.com/guillempuche/appicons) (aka `app-asset-generator`) | TS | 2 | MIT | **Widest OSS coverage**: iOS 18 (dark/tinted/clear), Android 13+ monochrome, watchOS/tvOS/visionOS, PWA, Google Fonts, TUI |
| [`martiliones/icon-set-creator`](https://github.com/martiliones/icon-set-creator) | TS | 315 | MIT | React Native iOS + Android + adaptive; sharp-powered; ~5k weekly dl |
| [`drovp/icon-generator`](https://github.com/drovp/icon-generator) | TS | 0 | MIT | `.ico`/`.icns`/PNG inside drovp host app; upscale from closest size |
| [`sebinbenjamin/image-res-generator`](https://github.com/sebinbenjamin/image-res-generator) | JS | 9 | MIT | Angular/Ionic/PWA + splash; SVG/PNG |
| [`devints47/pixel-forge`](https://github.com/devints47/pixel-forge) | TS | 3 | MIT | 5 favicons + 7 PWA + 3 OG/social + `meta-tags.html` |
| [`wighawag/pwag`](https://github.com/wighawag/pwag) | JS | — | MIT | PWA favicons + manifest + HTML meta injection |

### Libraries doing the heavy lifting (important because every tool above reduces to them)

- [`itgalaxy/favicons`](https://github.com/itgalaxy/favicons) — **~1,231★** (as of 2026-04), MIT, Node, powered by `sharp` since v7, covers Android homescreen + Apple touch + Windows 8 tiles + PWA manifest + maskable + iPhone 14/15 Pro and iPad Air/Mini splash. Current version v7.1.3 (April 2026); actively maintained. Every hosted webapp above re-skins this or writes thinner sharp code.
- [`RealFaviconGenerator/realfavicongenerator`](https://github.com/RealFaviconGenerator/realfavicongenerator) — 598★, MIT. The `@realfavicongenerator/*` npm monorepo (`generate-favicon`, `image-adapter-node`, `inject-markups`, `check-favicon`, `realfavicon` CLI) lets you self-host the exact pipeline `realfavicongenerator.net` runs.
- `@capacitor/assets`, `pwa-asset-generator`, `npm-icon-gen`, `@vite-pwa/assets-generator` — already covered in 18/20.

### MCP-surface tools

- [`niels-oz/icon-generator-mcp`](https://github.com/niels-oz/icon-generator-mcp) — **generates SVG icons from prompts**, not a multi-platform resizer. Zero-dep, Node 18+, stdio.
- [`albertnahas/icogenie-mcp`](https://github.com/albertnahas/icogenie-mcp) — 3★, wraps the proprietary IcoGenie API (credits-based, not fully self-hostable).
- No MCP server in the wild does the `drop 1024 → emit iOS+Android+PWA+favicon+OG zip` contract.

## Adjacent Solutions

- **Build-tool plugins** (`@vite-pwa/assets-generator`, `flutter_launcher_icons`, Expo prebuild, KMP `KMPAppIconGeneratorPlugin`, NativeScript `ns resources generate icons`) map "one master → N artifacts" into Gradle/Metro/Xcode — complements, not competitors.
- **Drovp** is a novel host-app-plus-plugins pattern; `@drovp/icon-generator` is a plugin, not a standalone app. A "local native" story without building our own Electron shell could ship as a Drovp plugin.
- **Sindresorhus `file-icon-cli`** (macOS-only): extracts icons *from* `.app` bundles — opposite direction, but inspires a "seed from existing app" feature.

## Market signals

- **Concentration at the ~1k-star tier.** `onmyway133/IconGenerator` (1,429★, stale since 2018), `itgalaxy/favicons` (1,234★, alive), `zhangyu1818/appicon-forge` (983★, alive) are the three gravity wells. Everything else is <320★, most are <10★ one-weekend builds. Cloned weekly, no moat anywhere.
- **Privacy wedge is universal.** Every webapp touts "all client-side": AppIconly, xsukax, `makeicon.dev`, `FaviconGenerator.io`. Table-stakes for browser mode.
- **Platform-spec drift is unaddressed.** Almost none of the <50★ webapps cover Android 13 monochrome, iOS 18 tinted/dark, or visionOS layered assets. Only `guillempuche/appicons` does — and it has 2 stars, no UI.
- **No tool combines full platform coverage + OG cards + favicon + brand-bundle input.** `pixel-forge` has favicon+PWA+OG but no native iOS/Android sets; `appicons` has every platform but no OG. Nobody does both.

## Gaps our plugin fills

1. **Agent-native surface.** Every competitor is a CLI or webapp; none expose MCP/Skills. A `generate_app_icons` MCP tool ([18 R9](../18-asset-pipeline-tools/INDEX.md)) is net-new.
2. **Prompt→1024→fan-out in one call.** All listed tools *start* with a user-supplied 1024². Our wedge: make the 1024 correctly too, in-pipeline, validated before fan-out.
3. **Current platform specs.** Android 13 monochrome, iOS 18 tinted/dark, visionOS layered — only `guillempuche/appicons` covers them, CLI-only.

## Integration recommendations

**Bundle / embed (do not rebuild).**

1. **[`itgalaxy/favicons`](https://github.com/itgalaxy/favicons)** — 1,234★, MIT, sharp-backed, active. The most battle-tested Node lib doing "one PNG → favicon + manifest + maskable + Apple startup matrix". Upstream of most clones in this survey; solves 5 of our 10 output variants for free. Call as primary favicon + PWA-manifest emitter.
2. **`@capacitor/assets`** (from 18a). Default iOS `AppIcon.appiconset` + Android `mipmap-*` + adaptive XML emitter. Write custom emitters only for its known gaps (legacy `Contents.json`, `<monochrome>`, iTunesArtwork, `.icns`).
3. **[`@realfavicongenerator/generate-favicon`](https://www.npmjs.com/package/@realfavicongenerator/generate-favicon)** as a *second* MIT favicon backend behind the same interface. Useful as a CI quality-diffing oracle against `itgalaxy/favicons` — byte-identical HTML/manifest → ship.

**Build ourselves.**

1. **The tri-surface wrapper** (web drop-zone + MCP tool + Skills slash-command) over `(itgalaxy/favicons ∪ @capacitor/assets ∪ custom Android13/iOS18/visionOS emitters)`. The moat: no existing project ships even two of the three surfaces.
2. **The prompt→1024 front half.** Every tool above begins where ours should *end* the generative phase. Our research corpus (transparency, safe zone, App-Store alpha rules) is what `appicon-forge` / AppIconly / makeicon.dev cannot have.
3. **Platform-spec linter + validation gate** ([18 R5](../18-asset-pipeline-tools/INDEX.md)). None of the 20+ projects enforces safe-zone compliance, alpha rejection for App Store 1024, or Android 12 circular-mask coverage. `validate_asset` before fan-out is differentiating on correctness, not coverage.

**Do not build.** Another sharp + JSZip webapp. The market has ~8 functional clones, all indistinguishable on features, all <1k stars. Without the agent/MCP surface and the generative front half, we are repo #9.

## Sources

Highest-signal: `itgalaxy/favicons` (library gravity well), `zhangyu1818/appicon-forge` (UX gravity well), `onmyway133/IconGenerator` (historical desktop reference), `guillempuche/appicons` (widest platform coverage), `niels-oz/icon-generator-mcp` + `albertnahas/icogenie-mcp` (the only MCP footprints — both addressing a different problem than ours). Full URL list in frontmatter.
