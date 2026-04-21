---
wave: 1
role: niche-discovery
slug: 11-oss-favicon-generators
title: "OSS favicon generators"
date: 2026-04-19
sources:
  - https://github.com/RealFaviconGenerator/core
  - https://github.com/RealFaviconGenerator/cli-real-favicon
  - https://www.npmjs.com/package/cli-real-favicon
  - https://github.com/itgalaxy/favicons
  - https://www.npmjs.com/package/favicons
  - https://github.com/jakejarvis/favsmith
  - https://github.com/3v0k4/favicon_factory
  - https://github.com/profullstack/favicon-generator
  - https://registry.npmjs.org/favigen
  - https://github.com/pixel-point/favpie
  - https://registry.npmjs.org/favium
  - https://github.com/SivaramPg/pwa-icons
  - https://blog.sivaramp.com/blog/pwa-icon-generator/
  - https://github.com/voxpelli/generate-favicon
  - https://github.com/Kookiejarz/svg-icon-gen
  - https://github.com/ACP-CODE/astro-favicons
  - https://www.npmjs.com/package/astro-favicons
  - https://github.com/anolilab/unplugin-favicons
  - https://github.com/ryoppippi/vite-plugin-favicons
  - https://favicon.io/emoji-favicons
  - https://github.com/asrvd/favmoji
  - https://github.com/twitter/twemoji
  - https://favicongenerator.io/
  - https://adaptivefavicon.com/
  - https://xvatar.vercel.app/
  - https://favicon-tools.vercel.app/generator
  - https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  - https://github.com/onderceylan/pwa-asset-generator
  - https://github.com/ionic-team/capacitor-assets
tags: [favicon, web-manifest, apple-touch, pwa]
---

# OSS Favicon Generators — Niche Deep-Dive

**Research value: high** — `realfavicongenerator.net` has *already* been OSS-ified as a TypeScript monorepo, and a second-generation of Sharp/Bun-based Node CLIs (2025–2026 vintage) has displaced the old Puppeteer-and-ImageMagick stack. There are enough credible candidates to both call one directly and fold ideas from another into our own tool.

## The canonical player: RealFaviconGenerator, unbundled

> **Updated 2026-04-21:** The `~34★` figure from the original write-up may be stale; the monorepo's exact star count could not be confirmed via public search (search results surfaced npm download counts like 4,986 rather than GitHub stars). The "low visibility, not low quality" characterization still likely holds — the package is not widely starred but remains the technically strongest self-hosted favicon pipeline. Latest release: v0.8.0 (April 2026), confirming active maintenance. Verify the current star count at https://github.com/RealFaviconGenerator/core before citing it.

`RealFaviconGenerator/core` ([GitHub](https://github.com/RealFaviconGenerator/core)) is the most important find in this niche. It is the **actual engine behind realfavicongenerator.net**, extracted into a public MIT-licensed TypeScript monorepo in April 2024. Currently well-discovered (see note above), it ships four packages on npm: `@realfavicongenerator/generate-favicon` (the pipeline), `@realfavicongenerator/check-favicon` (a linter that mirrors the online Favicon Checker), `@realfavicongenerator/image-adapter-node` (Node-side Sharp adapter), and a `realfavicon` CLI. Inputs: SVG (preferred) or a ≥260×260 PNG. Outputs: the full RFG package — `favicon.ico` (multi-image 16/32/48), `favicon-48.png`, `apple-touch-icon.png` (180×180 opaque), `web-app-manifest-192.png` / `-512.png`, `site.webmanifest`, and the canonical HTML head snippet via `inject-markups`. Web manifest: yes. Apple-touch-icon: yes. Mask-icon (Safari pinned tab): supported only through the SaaS UI flow, not in core.

Alongside it sits **`RealFaviconGenerator/cli-real-favicon`** ([GitHub](https://github.com/RealFaviconGenerator/cli-real-favicon)) — 121★, 2.9k weekly downloads, MIT, last released May 2024. This is the *legacy* CLI that shells out to the hosted API (upload → editor → fetch). Not self-contained, but the most battle-tested path to SaaS-equivalent output.

## The workhorse: `itgalaxy/favicons`

> **Updated 2026-04-21:** v7.2.0 cited in the original write-up (March 2024) has been superseded. The latest release is **v7.1.3** (April 9, 2026), confirming the package remains actively maintained despite the slow PR cadence. The "~2 years old" characterization of the current version is no longer accurate.

`itgalaxy/favicons` ([GitHub](https://github.com/itgalaxy/favicons), [npm](https://www.npmjs.com/package/favicons)) is the Node standard: ~1,231★ (as of 2026-04), ~131k–220k weekly downloads (npm stats vary by window), 193 dependents, MIT, v7.1.3 (April 2026), last push April 2026. It was originally built for Google's Web Starter Kit, is now a TypeScript package with pure-JS internals (no ImageMagick, no Inkscape), and runs on Node 14+. Inputs: SVG, PNG, or a buffer. Outputs cover the full defensive matrix — Android home screen icons, Apple touch icons, Apple startup images (splash), regular favicons, Windows 8 tiles, `manifest.webmanifest`, `browserconfig.xml`, `yandex-browser-manifest.json`, and an HTML snippet per platform. Web manifest: yes, with `manifestMaskable: true` for the `purpose: "maskable"` entry. Apple-touch-icon: yes (configurable `appleStatusBarStyle`, `theme_color`). Mask-icon: yes (emits `safari-pinned-tab.svg` in the legacy config).

Tempo of maintenance has improved — v7.1.3 dropped April 2026, and the package is actively receiving updates. It still beats everything else on *coverage breadth*.

## Second-gen Sharp/Bun CLIs (2025–2026 vintage)

A cluster of new Node/Bun CLIs has emerged, all backed by `sharp` (libvips) or Sharp-via-Bun, explicitly rejecting the Puppeteer/Chromium/ImageMagick dependency chain:

- **`jakejarvis/favsmith`** ([GitHub](https://github.com/jakejarvis/favsmith)) — 0★, MIT, v0.1.0 (March 2026). Bun-first CLI by Jake Jarvis (author of the well-known `@jakejarvis/cli`). Commands: `generate`, `init`, `doctor`, `snippet`, `preview`. Outputs: `favicon.ico`, 16→512 PNGs, `apple-touch-icon.png`, android-chrome 192/512, maskable 512, `site.webmanifest`, plus framework snippets for Next.js/Vite/Astro/Remix. No server, no uploads. Nascent, but the cleanest design in the cohort.
- **`SivaramPg/pwa-icons`** ([GitHub](https://github.com/SivaramPg/pwa-icons), [blog post](https://blog.sivaramp.com/blog/pwa-icon-generator/)) — Bun+Sharp CLI that generates **118 icons in ~0.7 s**, interactive via `@clack/prompts`, with smart edge detection to synthesize opaque backgrounds from border pixel samples. Covers iOS (26 sizes, 16→1024 px), Android (6 sizes), Windows 11 (80+ tiles), favicons (multi-size ICO + `apple-touch-icon`). Emits `icons.json` ready to paste into a manifest. Formats: PNG/WebP/AVIF/JPEG with three optimization tiers. v1.1.3 (Jan 2026).
- **`pixel-point/favpie`** ([GitHub](https://github.com/pixel-point/favpie)) — Sharp-based Node CLI, MIT. Emits favicons + `webmanifest` + CSS integration snippets with app-name / short-name config. Good ergonomics (`npx favpie <file> -o <dir> -ap "App Name"`), but narrower coverage than `favicons`.
- **`favium`** ([npm](https://registry.npmjs.org/favium)), **`favigen`** ([npm](https://registry.npmjs.org/favigen)), **`@profullstack/favicon-generator`** ([GitHub](https://github.com/profullstack/favicon-generator)), **`@voxpelli/generate-favicon`** ([GitHub](https://github.com/voxpelli/generate-favicon)) — minor variants, all Sharp-backed, all ship ICO + PNG + webmanifest. `favigen` adds `browserconfig.xml`; `favium` has interactive presets.
- **`3v0k4/favicon_factory`** ([GitHub](https://github.com/3v0k4/favicon_factory)) — Ruby/MIT, last updated Dec 2025. Emits the *Evil Martians minimal set* (`favicon.ico` 32, `apple-touch-icon` 180, `manifest.webmanifest`, Android maskable) and explicitly honors `@media (prefers-color-scheme: dark)` embedded in the source SVG. Requires libvips or ImageMagick.
- **`Kookiejarz/svg-icon-gen`** ([GitHub](https://github.com/Kookiejarz/svg-icon-gen)) — Python CLI producing ICO/ICNS/PNG with automatic light+dark variants for Windows/macOS, plus a watch mode.

## Framework plugins

- **`astro-favicons`** ([GitHub](https://github.com/ACP-CODE/astro-favicons), [npm](https://www.npmjs.com/package/astro-favicons)) — 64★, MIT, v3.1.6 (March 2026), 2.2k weekly downloads. `npx astro add astro-favicons`, drop a `favicon.svg` in `public/`, and it injects ~20 `<head>` tags (manifest, `apple-touch-icon`, `mask-icon`, theme-color) on every page, with hot reload and localized app names. Best-in-class Astro integration.
- **`anolilab/unplugin-favicons`** ([GitHub](https://github.com/anolilab/unplugin-favicons)) — 8★, NOASSERTION license, built *on top of* `itgalaxy/favicons`. Wraps Vite/Rollup/Webpack/esbuild/Rspack/Nuxt/Vue-CLI/Svelte/SvelteKit/Astro with aggressive build caching. v1.1.0-alpha.1 (Dec 2024).
- **`ryoppippi/vite-plugin-favicons`** ([GitHub](https://github.com/ryoppippi/vite-plugin-favicons)) — Vite-specific, exposes a `FaviconsHead` Svelte/React component via `virtual:favicons`.
- **Next.js built-ins** — Not a plugin but worth naming: `app/icon.tsx`, `app/apple-icon.tsx`, and `app/opengraph-image.tsx` are [file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) that let the dev write a function returning an `ImageResponse` (Satori under the hood). Statically optimized by default. In practice, the Next.js convention displaces any third-party Next.js favicon plugin.

## Browser-based + emoji/text/monogram

- **`favicon.io`** — proprietary SaaS but useful as a spec reference: lets users pick from ~3,000 **Twemoji** glyphs (CC-BY 4.0 graphics, MIT code — `github.com/twitter/twemoji`, 17.5k★) and emits 16/32 PNG + `apple-touch-icon` + android-chrome 192/512 + `favicon.ico` + `site.webmanifest`. Not OSS, but the underlying Twemoji asset set *is*.
- **`asrvd/favmoji`** ([GitHub](https://github.com/asrvd/favmoji)) — tiny OSS lib that drops an emoji into a `<link>` tag; converts at runtime to a Twemoji SVG data URI. No build step.
- **`favicongenerator.io`** and **`adaptivefavicon.com`** — client-side SaaS (no uploads) that handle emoji/text/image/SVG → full set with explicit light/dark variants. Licenses not advertised; referenced as spec, not dependency.
- **`favicon-tools.vercel.app`** and **`xvatar.vercel.app`** — Vercel-hosted text-monogram / gradient-monogram generators (the Vercel-default-favicon aesthetic). `xvatar` exposes an HTTP API returning deterministic seed→gradient SVG. Ideal reference for a "user has no logo yet" fallback.

## Adjacent (cross-cited from related niches)

- **`onderceylan/pwa-asset-generator`** — now at **`elegantapp/pwa-asset-generator`** (~3k★, MIT, v8.1.4 March 2026, actively maintained). Puppeteer-based (pulls Chromium ~200 MB), tracks Apple's splash-screen matrix best. Include only for `pwaSplash` opt-in.

> **Updated 2026-04-21:** The repo moved from the `onderceylan` personal account to the `elegantapp` GitHub organisation. The old URL redirects but downstream tooling should reference `github.com/elegantapp/pwa-asset-generator`. Latest release v8.1.4 (March 2026) confirms active maintenance.
- **`ionic-team/capacitor-assets`** — 577★, MIT, ~251k weekly npm. Mobile-first; orthogonal to favicons but overlaps on PNG resizing.

## Cross-cutting observations

1. **`@realfavicongenerator/generate-favicon` is the pick-one-and-done answer** — it reproduces SaaS output deterministically from local Sharp with zero network calls, and ships its own linter. At v0.8.0 (April 2026) it is actively maintained; exact star count is unconfirmed (see note above on the RFG section) but the "hasn't been discovered" framing may be outdated. Verify current traction before treating as niche.
2. **The modern ecosystem has standardized on `sharp` + `resvg` + `png-to-ico`**; every post-2024 CLI bans Puppeteer/ImageMagick/Inkscape.
3. **Dark-mode SVG support is surprisingly rare** — only `favicon_factory`, `svg-icon-gen`, `adaptivefavicon.com`, and `favicongenerator.io` preserve `@media (prefers-color-scheme: dark)` through the pipeline. RFG/core and `itgalaxy/favicons` rasterize both variants to static PNGs and lose the SVG adaptivity.
4. **Mask-icon / Safari pinned tab is effectively vestigial** — only `itgalaxy/favicons` and `astro-favicons` still emit `safari-pinned-tab.svg` by default. Aligned with Apple's 2023 deprecation.
5. **Emoji-as-favicon is an underserved niche with a clean OSS answer** — Twemoji SVG + `png-to-ico` + `sharp` = an emoji-to-favicon pipeline in ~50 LOC.

## Integration recommendations

**Call directly (bundle as dependency):**

1. **`@realfavicongenerator/generate-favicon` + `@realfavicongenerator/image-adapter-node`** — the primary engine for our `generate_favicon` tool. SaaS-equivalent output, MIT, local-only, self-contained, and bundles RFG's own linter (`@realfavicongenerator/check-favicon`) so our `validate_asset` tool gets favicon-specific checks for free. Pin a version and diff outputs in CI against `itgalaxy/favicons` to catch regressions.
2. **`SivaramPg/pwa-icons`** — call as an optional backend when the user wants the *aggressive* 118-icon platform matrix (iOS 26 + Android 6 + Windows 11 80+ + favicons). Sub-second runtime makes it cheap to ship behind a `platforms: "all"` flag without hurting normal-case latency. Complements (does not replace) the RFG pipeline.

**Fold into our own `generate_favicon` tool (patterns to lift, not deps to ship):**

- **`3v0k4/favicon_factory`'s "minimal set + embedded `@media (prefers-color-scheme: dark)`" philosophy** — matches the Evil Martians 5-file recommendation from our own 11a findings and is the simplest correct default. Re-implement its pipeline on top of `sharp` + `@resvg/resvg-js` + `png-to-ico`, preserving the SVG's dark-mode media query through to `favicon.svg`. This is ~100 LOC and gives us a branded, opinionated default that RFG/core does not provide.
- **`xvatar.vercel.app`-style gradient-monogram fallback** — when a user has no logo, we should *generate* a plausible SVG monogram from brand name + palette rather than refusing. Deterministic seed→gradient, 1–2 glyphs centered, same SVG gets piped through the favicon pipeline. Zero-dependency, fits our "asset correctness is the product" thesis, and gives the `/enhance → /generate_favicon` loop a sensible cold-start path.
- **`favmoji`-style Twemoji-emoji pathway** — accept `{emoji: "🚀"}` as a first-class input to `generate_favicon`, resolve via Twemoji's SVG set (MIT/CC-BY-4.0, correctly attributed), then run through the same pipeline. This is the single most common indie-developer favicon use case and none of the bundleable OSS libraries cover it natively.
- **Framework snippet emitters from `favsmith`** — lift its `snippet` subcommand design for Next.js/Vite/Astro/Remix; maps directly onto our `html-head-snippet-emitter` skill.
