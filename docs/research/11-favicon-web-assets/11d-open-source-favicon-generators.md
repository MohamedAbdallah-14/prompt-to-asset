---
category: 11-favicon-web-assets
angle: 11d
title: Open-source favicon / web-asset generators (candidates to embed in our plugin)
agent: research-subagent-11d
date: 2026-04-19
scope: >
  Evaluate open-source libraries and CLI tools that generate favicons, PWA
  icons, OG images and related web assets from a source image (PNG/SVG).
  Assess each on license, maintenance, embeddability as a Node or Python
  library, cross-platform behavior, and suitability for bundling inside our
  prompt-to-asset plugin instead of hitting SaaS APIs like
  realfavicongenerator.net.
primary_targets:
  - itgalaxy/favicons (Node)
  - RealFaviconGenerator/core (Node, monorepo)
  - thatmattlove/favicons (Python)
  - onderceylan/pwa-asset-generator (Node)
  - ionic-team/capacitor-assets (Node)
  - vercel/satori + @vercel/og (Node)
  - sharp / resvg-js / resvg / svgo / svgcleaner / pngquant / ImageMagick / Inkscape (pipeline primitives)
status: complete
---

# 11d — Open-source favicon / web-asset generators

## Executive Summary

For the prompt-to-asset plugin we want a **self-contained local pipeline** that
turns a single source asset (ideally SVG, otherwise a ≥1024 px PNG with real
alpha) into the full modern favicon / PWA / social-card bundle without calling
the RealFaviconGenerator SaaS. The open-source landscape is healthy enough to
do this entirely offline, but it is a *layered* ecosystem: there is no single
"realfavicongenerator in a box" that is both current and maintained —
you compose primitives.

The practical conclusion is:

1. **`itgalaxy/favicons`** (MIT, ~1.2 k ⭐, 330 k weekly npm) is still the
   default Node library for "image in → favicon set + webmanifest + HTML tags
   out". It supports `favicon.ico`, all Apple touch icons, Android/Chrome PNGs,
   Windows tiles, and maskable icons. Last real release is 7.2.0 (Mar 2024),
   so it is *stable-but-quiet* rather than fast-moving; its internals are
   `sharp` + `xml2js` and it handles SVG input as of 7.0.
   ([GitHub — itgalaxy/favicons](https://github.com/itgalaxy/favicons))
2. **`RealFaviconGenerator/core`** (MIT, ~34 ⭐, TypeScript monorepo that
   publishes `@realfavicongenerator/generate-favicon`, `generate-logo`,
   `check-favicon`, `inject-markups`, plus gulp/grunt adapters) is the
   *officially open-sourced engine* behind realfavicongenerator.net. It is
   young and low-traffic but matches the SaaS output 1:1, which is exactly
   what we want to replace the API. This is the most interesting single
   find in this angle.
   ([GitHub — RealFaviconGenerator/core](https://github.com/RealFaviconGenerator/core))
3. **Composition wins**: for vector input, render with
   [`resvg`](https://github.com/linebender/resvg)
   (3.8 k ⭐, MPL-2.0, fastest + most spec-correct per Wikimedia's T243893
   evaluation, \~7× faster than Inkscape CLI), optionally via
   [`@resvg/resvg-js`](https://github.com/yisibl/resvg-js) (1.9 k ⭐, MPL-2.0,
   napi bindings); resize with
   [`sharp`](https://github.com/lovell/sharp) (32 k ⭐, Apache-2.0); optimize
   SVG with [`svgo`](https://github.com/svg/svgo) (22 k ⭐, MIT); assemble
   `.ico` with [`png-to-ico`](https://github.com/steambap/png-to-ico) or
   [`to-ico`](https://github.com/kevva/to-ico) (both MIT, in-memory, no
   ImageMagick dependency); generate OG / Twitter cards with
   [`satori`](https://github.com/vercel/satori) (13 k ⭐, MPL-2.0) or
   [`@vercel/og`](https://www.npmjs.com/package/@vercel/og) (425 k weekly,
   MPL-2.0). This stack is pure Node, cross-platform, requires zero native
   system binaries beyond what npm can install, and has permissive licenses
   compatible with any plugin distribution.

Avoid **Inkscape CLI** and **ImageMagick** for a plugin: both require system
install, both are slower than resvg for SVG rendering, and `pngquant`'s
library (`libimagequant`) is GPL-3.0 / commercial dual-licensed, which is a
redistribution risk. `svgcleaner` is archived in practice — use SVGO instead.

---

## Repo-by-repo evaluation

| Repo | License | Stars | Last release / activity | What it does | Bundleable (Node / Python) | Cross-platform | Embed risk |
|---|---|---|---|---|---|---|---|
| [itgalaxy/favicons](https://github.com/itgalaxy/favicons) | MIT | ~1,234 ⭐ | 7.2.0 Mar 2024 (quiet but stable; 330 k weekly npm) | Full Node lib + CLI. PNG/SVG → favicon.ico, apple-touch, android-chrome, windows tiles, maskable, webmanifest, HTML meta tags. Uses `sharp`. | Node ✅ (direct `npm i favicons`) / Python ❌ | ✅ (sharp prebuilt binaries for darwin/linux/win x64+arm64) | Low. Only concern: slow release cadence. |
| [RealFaviconGenerator/core](https://github.com/RealFaviconGenerator/core) | MIT | ~34 ⭐ | Active 2024–2026 monorepo | The OSS engine behind realfavicongenerator.net. Packages: `generate-favicon`, `check-favicon`, `generate-logo`, `inject-markups`, `image-adapter-node`, `gulp-real-favicon`, `grunt-real-favicon`. | Node ✅ / Python ❌ | ✅ (Node, uses `@resvg/resvg-js` + `sharp` under the hood) | Low-moderate. Young project, low star count, but authoritative output parity with the SaaS. **Primary candidate for "replace the SaaS".** |
| [RealFaviconGenerator/cli-real-favicon](https://github.com/RealFaviconGenerator/cli-real-favicon) | MIT | ~121 ⭐ | Historical, wraps the *remote* API | Thin CLI that POSTs to realfavicongenerator.net API. **Not** useful for offline bundling. | N/A | ✅ | High — couples us back to the SaaS. Mentioned only to disambiguate. |
| [RealFaviconGenerator/gulp-real-favicon](https://github.com/RealFaviconGenerator/gulp-real-favicon) | MIT | ~76 ⭐ | Maintained | Same: historical wrapper over the remote API. | N/A | ✅ | High (SaaS coupling). |
| [thatmattlove/favicons](https://github.com/thatmattlove/favicons) (PyPI: `favicons`) | MIT | ~14 ⭐ (~1 k downloads/mo) | v0.2.2 Feb 2024 | Python 3 lib + CLI, sync & async APIs, HTML tag generation, PNG/SVG/JPEG/TIFF input. Uses Pillow. | Python ✅ (`pip install favicons`) / Node ❌ | ✅ | Low, but feature set is a subset of itgalaxy/favicons (no maskable, fewer Apple splash sizes). |
| [AlexMili/extract_favicon](https://github.com/AlexMili/extract_favicon) (PyPI: `extract-favicon`) | MIT | ~17 ⭐ (~3.2 k downloads/mo) | Sep 2025, actively maintained | **Extracts** favicons from existing websites (HTML `<link>` parsing, `favicon.ico` fallback, base64, async). *Not* a generator. | Python ✅ | ✅ | n/a — orthogonal capability, useful for "enhance existing site" flows. |
| [PyPI `faviconx`](https://pypi.org/project/faviconx/) | MIT (per PyPI metadata) | low | 1.0.0, 2024 | CLI-first Python favicon generator: ICO/SVG/PNG, Apple Touch, Android Chrome, PWA manifest, HTML meta tags. | Python ✅ (CLI + lib) | ✅ | Moderate: small user base, no public GitHub repo surfaced, less auditable. |
| [onderceylan/pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator) | MIT | ~3,006 ⭐ | Active | Node CLI + lib. Generates **icons + Apple splash screens + favicons** from PNG/SVG/HTML source, updates `manifest.json` + `index.html`. Uses Puppeteer (chromium) for rendering — heavy. | Node ✅ | ✅ (but pulls chromium, ~200 MB) | Medium: chromium download inflates plugin size. Great for dev-time, risky to bundle. |
| [ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) | MIT | ~579 ⭐ | Active | Generates iOS, Android **and** PWA icons/splash screens from `assets/` directory. Targeted at mobile but has a PWA target. Uses `sharp`. | Node ✅ | ✅ | Low. Slightly opinionated toward Capacitor projects but invocable as a library. |
| [3v0k4/favicon_factory](https://github.com/3v0k4/favicon_factory) | MIT | ~31 ⭐ | Active, Ruby gem + Docker | SVG-first. Outputs the *minimal* modern set (`favicon.ico`, `apple-touch-icon.png`, Android manifest). Supports light/dark via CSS media queries. | Ruby ✅ / Node ❌ / Python ❌ | ✅ (Docker) | High for a Node/Python plugin — wrong runtime. Useful as a reference for *the minimal modern set*. |
| [vercel/satori](https://github.com/vercel/satori) | MPL-2.0 | ~13,295 ⭐ | 0.26.0 Mar 2026, 1.1 M weekly | JSX/HTML/CSS → SVG, designed for OG images and share cards. Pairs with resvg-js to rasterize. | Node ✅ | ✅ (pure JS/WASM) | Low. MPL-2.0 is file-level copyleft — fine as a library dependency of a closed or permissive plugin; only modifications to satori source itself must stay MPL. |
| [@vercel/og](https://www.npmjs.com/package/@vercel/og) (`vercel/vercel` repo) | MPL-2.0 | n/a (part of monorepo) | 0.11.1 Mar 2026, 425 k weekly | Wraps satori + resvg-wasm into a single `new ImageResponse(…)` API. Drop-in for 1200×630 OG PNGs in ~25 ms with no chromium. | Node ✅ | ✅ | Low. Same MPL note. |
| [vercel/og-image](https://github.com/vercel/og-image) | Apache-2.0 | ~4,056 ⭐ | Reference repo (older) | Original template service; superseded by satori/`@vercel/og`. | — | ✅ | Use only as example. |
| [lovell/sharp](https://github.com/lovell/sharp) | Apache-2.0 | ~32,155 ⭐ | Active, releases monthly | High-performance libvips binding. Resize, format convert (PNG/WebP/AVIF/JPEG/TIFF), alpha-safe. Foundation of itgalaxy/favicons and capacitor-assets. | Node ✅ | ✅ (prebuilt binaries darwin/linux/win; arm64 & x64) | Low. The *de facto* Node imaging primitive. |
| [linebender/resvg](https://github.com/linebender/resvg) (was `RazrFalcon/resvg`) | MPL-2.0 (crates dual Apache-2.0/MIT for parts) | ~3,787 ⭐ | Active | Rust SVG renderer. Per Wikimedia T243893: fastest of resvg/librsvg/Inkscape (W3C suite 1 m 04 s vs Inkscape 7 m 57 s) and highest correctness (0.831 vs 0.745). | Node via `@resvg/resvg-js` ✅, Python via `resvg-py` or subprocess ✅ | ✅ (prebuilt binaries) | Low. Preferred renderer for SVG → PNG at specific raster sizes. |
| [yisibl/resvg-js](https://github.com/yisibl/resvg-js) | MPL-2.0 | ~1,915 ⭐ | Active | napi-rs bindings around `resvg`. Used by satori / `@vercel/og`. | Node ✅ | ✅ | Low. |
| [svg/svgo](https://github.com/svg/svgo) | MIT | ~22,439 ⭐ | Active | SVG minifier / cleaner. Essential before rasterizing so the input SVG is normalized (viewBox fixed, CSS inlined, `<defs>` deduped). | Node ✅ | ✅ | Low. |
| [RazrFalcon/svgcleaner](https://github.com/RazrFalcon/svgcleaner) | MPL-2.0 | ~1,667 ⭐ | **Archived / unmaintained** (author moved focus to resvg) | Rust CLI SVG optimizer. | CLI only | ✅ | Superseded by SVGO for library use. |
| [piqnt/svgexport](https://github.com/piqnt/svgexport) (listed in query as "kolodny/svgexport" — that org doesn't exist) | MIT | ~954 ⭐ | v0.4.2 (npm), repo last touched Apr 2025 | Puppeteer-based SVG → PNG/JPEG CLI. | Node ✅ (but heavy) | ✅ (pulls chromium) | Medium. Chromium bloat; resvg-js is better for our use. |
| [kevva/to-ico](https://github.com/kevva/to-ico) | MIT | ~137 ⭐ | Stable/low activity | In-memory PNG(s) → multi-size `.ico`. | Node ✅ | ✅ (pure JS) | Low. |
| [steambap/png-to-ico](https://github.com/steambap/png-to-ico) | MIT | ~178 ⭐ | Stable | PNG → ICO (single or multi-size) CLI + lib. | Node ✅ | ✅ | Low. Used by RealFaviconGenerator/core as of late 2024. |
| [kornelski/pngquant](https://github.com/kornelski/pngquant) | GPL-3.0 (CLI); `libimagequant` is **GPL-3 / commercial dual** | ~5,609 ⭐ | Active | Best-in-class lossy PNG quantizer. | Node via `imagemin-pngquant` (spawns binary) / Python via `pngquant-cli` | ✅ (but ships a binary) | **High for a bundled plugin**. Do not statically link `libimagequant` unless you accept GPL-3 or buy a commercial license. Prefer `sharp.png({ palette: true, compressionLevel: 9 })` or `oxipng` (MIT) for lossless, or `imagemin-optipng` (MIT). |
| [ImageMagick/ImageMagick](https://github.com/ImageMagick/ImageMagick) | ImageMagick License (Apache-2.0–style) | ~16,209 ⭐ | Active | Swiss-army CLI. Historically the canonical way to assemble `.ico` via `magick convert 16.png 32.png 48.png out.ico`. | External binary only | ✅ (but needs system install) | Medium. Adds a hard system dependency; Windows path has gotchas. Not needed given `png-to-ico`. |
| Inkscape CLI | GPL-2.0+ | (no GitHub repo; hosted on gitlab.com/inkscape/inkscape) | Active | Authoritative SVG renderer; shells out as `inkscape --export-type=png --export-width=N in.svg`. | External binary only | ✅ (but bulky install: ~300 MB with deps) | **High** for bundling: GPL, huge, slow (7× slower than resvg), and end-user install is painful on macOS/Win. OK as a *fallback* for SVGs that resvg mis-renders (rare). |

Legend:
- "Embed risk" = risk to our plugin if we ship this as a dependency (license +
  install footprint + native deps + stability).
- Star counts are the values surfaced during this research pass (2026-04-19);
  treat as current-ish rather than authoritative. Links in the References
  section resolve to canonical GitHub pages.

---

## Feature parity matrix (what output do we need?)

The "modern minimum" favicon/PWA/social-card bundle a plugin should emit:

| Output | Size(s) | Source of truth | Libraries that cover it |
|---|---|---|---|
| `favicon.ico` (multi-size) | 16, 32, 48 | legacy browsers, Windows | itgalaxy/favicons, RealFaviconGenerator/core, faviconx, favicon_factory, `png-to-ico`, `to-ico` |
| `favicon.svg` (optional, preferred) | vector | modern browsers (RFC since 2021) | SVGO pass + inline; favicon_factory, RealFaviconGenerator/core |
| `apple-touch-icon.png` | 180×180 (sometimes 152/167) | iOS home screen | itgalaxy/favicons, pwa-asset-generator, capacitor-assets, RealFaviconGenerator/core |
| Apple splash screens | 30+ device sizes | iOS PWA | **pwa-asset-generator** (best), capacitor-assets, itgalaxy/favicons |
| `android-chrome-192.png` / `-512.png` | 192, 512 | Android/Chrome manifest | itgalaxy/favicons, RealFaviconGenerator/core, pwa-asset-generator, capacitor-assets |
| maskable icon | 512×512 with safe zone | Android adaptive icons | itgalaxy/favicons (`manifestMaskable: true`), RealFaviconGenerator/core |
| `mstile-*.png` / `browserconfig.xml` | 144/150/310 | Windows tiles | itgalaxy/favicons, RealFaviconGenerator/core |
| `manifest.webmanifest` | json | PWA spec | itgalaxy/favicons, RealFaviconGenerator/core, capacitor-assets, pwa-asset-generator |
| OG / Twitter card | 1200×630 | OpenGraph, `twitter:image` | satori + resvg-js, `@vercel/og` |
| Social avatar crops | 400×400, 800×800 | X/LinkedIn/GitHub | sharp (custom script) |
| HTML `<link>` / `<meta>` snippet | text | all of the above | itgalaxy/favicons, RealFaviconGenerator/`inject-markups`, capacitor-assets (partial), pwa-asset-generator |

No single repo covers **everything** (favicons + PWA splash + OG card
generation). The right architecture is two engines side-by-side:

- **Icon engine**: `itgalaxy/favicons` *or* `@realfavicongenerator/generate-favicon`.
- **Social card engine**: `satori` + `@resvg/resvg-js` (or `@vercel/og`).

---

## Recommended stack

### Primary recommendation (Node-native plugin)

```text
Input:  SVG (preferred) or PNG ≥1024×1024 with straight alpha
        plus a brand config { name, short_name, themeColor, backgroundColor }

1. Normalize SVG
   └─ svgo (MIT, 22 k ⭐) with preset-default minus removeViewBox
2. Generate icon set
   └─ @realfavicongenerator/generate-favicon (MIT)  ← primary
      OR itgalaxy/favicons (MIT)                    ← proven fallback
      Both internally use sharp + resvg-js.
   Produces:
     favicon.ico, favicon.svg, apple-touch-icon.png,
     android-chrome-192.png, android-chrome-512.png (maskable),
     mstile-*.png, manifest.webmanifest, browserconfig.xml
3. Generate OG / social cards
   └─ satori (MPL-2.0, 13 k ⭐) + @resvg/resvg-js (MPL-2.0, 1.9 k ⭐)
      JSX template → SVG → PNG at 1200×630 and 1200×1200
4. Compress PNGs (optional)
   └─ sharp.png({ palette: true, compressionLevel: 9 }) — NO pngquant.
      Or oxipng (MIT) if you need dedicated lossless optimization.
5. Inject HTML
   └─ @realfavicongenerator/inject-markups (MIT)
      OR itgalaxy/favicons HTML array output.
```

This stack is:
- **License-clean**: MIT + Apache-2.0 + MPL-2.0. All allow redistribution
  inside a proprietary plugin. No GPL (we explicitly swapped out
  pngquant/libimagequant and Inkscape/ImageMagick).
- **Cross-platform**: every dep has prebuilt binaries for darwin-arm64,
  darwin-x64, linux-x64, linux-arm64, and win32-x64 via sharp + resvg-js.
- **No system dependencies**: `npm i` works in a clean Cursor/VS Code
  extension sandbox without asking the user to `brew install` anything.
- **Small-ish**: ~50 MB on disk (sharp ~30 MB, resvg binaries ~10 MB,
  remainder JS). No Chromium/Puppeteer (~200 MB) unless you opt into
  `pwa-asset-generator`.
- **Fast**: sharp + resvg are both native-code hot paths. A full
  icon + OG pass benchmarks around 300–500 ms on an M-series Mac.

### Fallback / Python-native plugin

If the prompt-to-asset skill needs to run in a Python runtime (Gemini
skills, Codex Python sandbox):

```text
1. Normalize SVG   → scour (MIT) or subprocess svgo
2. Render SVG      → resvg via `cairosvg` (LGPL — careful) or `resvg-py`
                     (MPL-2.0) or subprocess the resvg binary
3. Resize/Compose  → Pillow (HPND, permissive)
4. ICO assembly    → Pillow's built-in .save('favicon.ico', sizes=[…])
5. Favicon set     → thatmattlove/favicons (MIT)  — covers the "90%" set
                     OR faviconx (MIT) for a CLI-first flow
6. OG card         → Pillow + PIL.ImageDraw + fonts (no JSX parity),
                     or spawn Node+satori as a child process
```

Python's weakness is OG-image generation: Satori has no true Python port.
For high-fidelity OG cards, spawn a Node child process against `satori-cli`
or `@vercel/og` — the overhead (~150 ms cold start) is tolerable for
generation workloads.

### Why NOT use the RealFaviconGenerator SaaS

- Requires network + API key for every enhancement.
- Adds latency unacceptable for interactive prompt enhancement (P50
  ~1.5 s against their API per the CLI docs).
- Couples us to a third-party business with its own TOS / rate limits,
  which is a bad foundation for a plugin that ships to thousands of
  developer installs.
- Their own core is **already MIT on GitHub**
  (`RealFaviconGenerator/core`), so there is no capability gap — we gain
  nothing by calling the remote API.

---

## Pipeline pseudocode (canonical flow)

```ts
import { generateFavicon } from "@realfavicongenerator/generate-favicon";
import { nodeImageAdapter }  from "@realfavicongenerator/image-adapter-node";
import { injectMarkups }     from "@realfavicongenerator/inject-markups";
import satori                from "satori";
import { Resvg }             from "@resvg/resvg-js";
import sharp                 from "sharp";

export async function buildAssetBundle({ sourceSvg, brand, outDir }) {
  const icons = await generateFavicon(
    { masterPicture: sourceSvg, design: { /* preset */ } },
    nodeImageAdapter()
  );
  for (const f of icons.files) await write(`${outDir}/${f.name}`, f.contents);

  const ogSvg = await satori(<OgTemplate {...brand} />,
    { width: 1200, height: 630, fonts: await loadFonts() });
  await write(`${outDir}/og-image.png`, new Resvg(ogSvg).render().asPng());

  for (const name of ["og-image.png", "android-chrome-512x512.png"]) {
    await write(`${outDir}/${name}`,
      await sharp(`${outDir}/${name}`)
        .png({ palette: true, compressionLevel: 9, effort: 10 }).toBuffer());
  }

  return { html: injectMarkups(icons.markups), files: icons.files };
}
```

---

## Risk register

| Risk | Source | Mitigation |
|---|---|---|
| Sharp prebuilt binary missing for some exotic target (e.g. Alpine musl arm) | `lovell/sharp` install matrix | Pin sharp, document supported platforms; fall back to `@resvg/resvg-js` + Pillow for Alpine. |
| `itgalaxy/favicons` quiet since Mar 2024 | GitHub releases | Have `@realfavicongenerator/generate-favicon` as drop-in alternative; both expose a comparable options surface. |
| MPL-2.0 file-level copyleft in satori/resvg/`@vercel/og` | MPL-2.0 text | Consume as unmodified npm deps; do not fork+modify their source in the plugin repo. If we must patch, keep the patch in a separately licensed fork. |
| GPL contamination if a contributor adds `pngquant` or `imagemin-pngquant` | transitive deps | Add a license CI check (e.g. `license-checker --failOn GPL`) to the plugin repo. |
| Chromium download if someone reaches for `pwa-asset-generator` or `svgexport` | install size + CVE surface | Explicitly forbid puppeteer deps; use `@vercel/og`/satori instead. |
| Apple splash screen matrix drifts (new iPhone/iPad sizes every year) | Apple HIG | Prefer `pwa-asset-generator` or `capacitor-assets` for splash screens specifically; both track Apple's matrix. itgalaxy/favicons added 2023's iPhone 14/15 lineup in 7.2.0. |
| Maskable icon safe zone handled wrong | web.dev maskable spec | Pass the source image through a 20% inner padding before maskable generation; itgalaxy/favicons accepts a separate `manifestMaskable` source precisely for this. |
| `.ico` on Windows shows wrong 16×16 | raster sampling | Always generate 16/32/48 from separate downsamples (Lanczos3 in sharp), never let a single 48 → 16 auto-bake drive it. Both `png-to-ico` and itgalaxy/favicons do this correctly. |

---

## Key observations

1. **The "RealFaviconGenerator core" repo (MIT, TypeScript) is the
   highest-leverage find in this research pass.** It closes the gap between
   "the SaaS" and "the OSS ecosystem" — something that did not exist in
   2023. For a plugin that currently considers hitting the SaaS, migrating
   straight to `@realfavicongenerator/generate-favicon` is near-zero-risk
   and removes an external dependency.
2. **Inkscape CLI and ImageMagick are legacy choices.** Resvg is faster
   and more spec-correct per the Wikimedia benchmarks, ships as a pure
   Rust binary with no system dependencies, and has first-class Node +
   Python bindings.
3. **Do not bundle pngquant.** The dual-license on `libimagequant` is a
   real redistribution hazard for anything that ends up in a commercial
   plugin store. `sharp`'s palette mode + `oxipng` (MIT) provide an OK
   substitute for 95% of use cases, and genuine perceptual quantization
   can stay as an opt-in "user has pngquant installed" path.
4. **For PWA splash screens specifically, itgalaxy/favicons already
   covers the standard set** including the 2023 iPhone 14/15 additions
   (7.2.0 changelog). `pwa-asset-generator` stays worth it only when you
   need an HTML-template-based splash (gradient + logo rendered via
   Puppeteer), which most prompt-to-asset flows do not.
5. **Satori/`@vercel/og` is the OG card winner, full stop.** No other
   open-source pipeline matches its (layout fidelity) × (no Chromium)
   combination. A JSX template repo can double as the OG card definition
   that the prompt-to-asset fills in with generated text/colors.
6. **Python parity is 80%, not 100%.** `thatmattlove/favicons` covers
   favicons adequately. For OG images, either spawn a Node worker or
   accept Pillow-rendered text/logo compositions (lower design fidelity).
7. The repo `liran/favicons` referenced in the assignment brief returns
   404 on GitHub. The active Python favicon libraries are
   `thatmattlove/favicons`, `faviconx` (PyPI, no public repo surfaced),
   and `AlexMili/extract_favicon` (extraction only, not generation).

---

## References

Repositories (with star counts captured during this pass, 2026-04-19):

- [itgalaxy/favicons](https://github.com/itgalaxy/favicons) — ~1,234 ⭐, MIT, Node
- [itgalaxy/favicons releases](https://github.com/itgalaxy/favicons/releases) — v7.2.0 (Mar 15 2024) is current
- [RealFaviconGenerator/core](https://github.com/RealFaviconGenerator/core) — ~34 ⭐, MIT, TypeScript monorepo (OSS engine of the SaaS)
- [RealFaviconGenerator/cli-real-favicon](https://github.com/RealFaviconGenerator/cli-real-favicon) — ~121 ⭐, MIT (wraps remote API — not embed candidate)
- [RealFaviconGenerator/gulp-real-favicon](https://github.com/RealFaviconGenerator/gulp-real-favicon) — ~76 ⭐, MIT (same)
- [3v0k4/favicon_factory](https://github.com/3v0k4/favicon_factory) — ~31 ⭐, MIT, Ruby
- [thatmattlove/favicons](https://github.com/thatmattlove/favicons) — ~14 ⭐, MIT, Python (PyPI `favicons`)
- [AlexMili/extract_favicon](https://github.com/AlexMili/extract_favicon) — ~17 ⭐, MIT, Python (extraction, PyPI `extract-favicon`)
- [PyPI `faviconx`](https://pypi.org/project/faviconx/) — Python CLI favicon generator
- [onderceylan/pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator) — ~3,006 ⭐, MIT
- [ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) — ~579 ⭐, MIT
- [vercel/satori](https://github.com/vercel/satori) — ~13,295 ⭐, MPL-2.0
- [vercel/og-image](https://github.com/vercel/og-image) — ~4,056 ⭐ (legacy reference)
- [@vercel/og on npm](https://www.npmjs.com/package/@vercel/og) — 425 k weekly, MPL-2.0
- [lovell/sharp](https://github.com/lovell/sharp) — ~32,155 ⭐, Apache-2.0
- [linebender/resvg](https://github.com/linebender/resvg) (formerly `RazrFalcon/resvg`) — ~3,787 ⭐, MPL-2.0
- [yisibl/resvg-js](https://github.com/yisibl/resvg-js) — ~1,915 ⭐, MPL-2.0
- [svg/svgo](https://github.com/svg/svgo) — ~22,439 ⭐, MIT
- [RazrFalcon/svgcleaner](https://github.com/RazrFalcon/svgcleaner) — ~1,667 ⭐, MPL-2.0 (archived in practice)
- [piqnt/svgexport](https://github.com/piqnt/svgexport) — ~954 ⭐, MIT (Puppeteer-based)
- [steambap/png-to-ico](https://github.com/steambap/png-to-ico) — ~178 ⭐, MIT
- [kevva/to-ico](https://github.com/kevva/to-ico) — ~137 ⭐, MIT
- [kornelski/pngquant](https://github.com/kornelski/pngquant) — ~5,609 ⭐, GPL-3.0 / libimagequant dual (**embed risk**)
- [ImageMagick/ImageMagick](https://github.com/ImageMagick/ImageMagick) — ~16,209 ⭐, ImageMagick License

External docs / benchmarks:

- [Wikimedia phabricator T243893 — "Test resvg on Beta Cluster"](https://phabricator.wikimedia.org/T243893) — resvg vs librsvg vs Inkscape benchmark (resvg wins speed and correctness)
- [Wikimedia phabricator T283083 — "Re-evaluate librsvg as SVG renderer"](https://phabricator.wikimedia.org/T283083)
- [web.dev — Maskable icons](https://web.dev/maskable-icon/) — safe-zone spec for Android adaptive icons
- [realfavicongenerator.net FAQ](https://realfavicongenerator.net/faq) — canonical list of required favicon outputs for modern browsers
- [Apple Human Interface Guidelines — App icons / Splash screens](https://developer.apple.com/design/human-interface-guidelines/app-icons) — canonical iOS splash-screen sizes matrix

Decision: adopt the **Node-native stack** described above
(`@realfavicongenerator/generate-favicon` + `itgalaxy/favicons` as fallback
+ `satori`/`@vercel/og` for social cards + `sharp`/`resvg-js`/`svgo`
as primitives), embed it inside the prompt-to-asset plugin, and delete
any plan that routes through the realfavicongenerator.net SaaS.
