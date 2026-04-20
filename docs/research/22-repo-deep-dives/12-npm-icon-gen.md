---
wave: 2
role: repo-deep-dive
slug: 12-npm-icon-gen
title: "Deep dive: akabekobeko/npm-icon-gen"
repo: "https://github.com/akabekobeko/npm-icon-gen"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/akabekobeko/npm-icon-gen
  - https://www.npmjs.com/package/icon-gen
  - https://github.com/akabekobeko/npm-icon-gen/pull/136
  - https://github.com/akabekobeko/npm-icon-gen/blob/main/CHANGELOG.md
  - https://gist.github.com/akabekobeko/3358ca68150c0318d53095ae622e2f0c
  - https://akabeko.me/blog/2016/02/npm-icon-gen-v1-0-0-release/
tags: [icon, icns, ico, favicon]
---

# Deep dive: akabekobeko/npm-icon-gen

## Repo metrics and status

`akabekobeko/npm-icon-gen` is a small, focused Node CLI + programmatic library
that generates Windows (`.ico`), macOS (`.icns`) and favicon (`.ico` + PNG set)
icon artifacts from a single SVG or from a directory of pre-rendered PNGs.
Metrics snapshot (April 2026):

- **Stars:** ~175 on GitHub — low in absolute terms but not the useful signal;
  distribution happens via npm.
- **npm weekly downloads:** ~26.5k as `icon-gen`, with 41 declared dependents —
  firmly in "boring plumbing that lots of Electron/Tauri build scripts quietly
  depend on" territory.
- **License:** **MIT**. Commercial-friendly, no copyleft, no attribution
  requirement beyond the standard notice.
- **Language:** TypeScript, shipped pre-compiled to CommonJS `dist/lib` +
  `dist/bin`. Unpacked package is ~60 KB and 21 files — genuinely minimal.
- **Runtime deps (v5.0.0):** `sharp@^0.33`, `pngjs@^7`, `commander@^12`.
  Three dependencies, all first-tier.
- **Node support:** LTS (v20+ since v5.0.0 breaking change, Aug 2024).
- **Maintainer activity:** Primary author `akabekobeko` since Feb 2016. Last
  release v5.0.0 on 2024-07-16. No releases in 2025–2026. ~11 open issues
  including a Dec 2025 request to bump to `sharp@0.34`. Characterization:
  **low-velocity maintenance mode**, not abandoned — the author merges
  occasionally and the problem space is stable.

## What it does, end-to-end

One function, one CLI command:

```js
const icongen = require('icon-gen');
await icongen('./sample.svg', './icons', { report: true });
```

Given an SVG, it renders a fan-out of PNGs at 16/24/32/48/64/128/256/512/1024
via `sharp`, then hand-writes the binary `.ico` and `.icns` containers from
those PNGs plus emits a favicon bundle (`favicon.ico` + `favicon-16.png` …
`favicon-228.png`). Given a directory of PNGs instead, it skips the sharp step
and goes straight to packing. Per-format size lists and filename prefixes are
configurable; if you omit all of `ico`/`icns`/`favicon` options, you get all
three with sensible defaults (including the Apple Human Interface Guidelines
and `audreyr/favicon-cheat-sheet` size tables).

The Node API is promise-based, idempotent, and side-effect-limited to the
`dest` directory plus an OS temp dir for intermediate PNGs. The CLI is a thin
commander-backed wrapper exposing the same options (`--ico-sizes 16,32,…`,
`--icns-name`, `--favicon-png-sizes`, etc.).

## How it's built internally

The `dist/lib` tree tells the whole story in four files:

- `png.js` (2 KB) — the sharp bridge: SVG → rasterised PNGs at a size list.
- `ico.js` (7.6 KB) — writes Windows ICO container (directory header + per-size
  `BITMAPINFOHEADER`/PNG payload) directly via Buffers.
- `icns.js` (8.3 KB) — writes macOS ICNS container, including Apple's type
  codes (`is32`, `il32`, `s8mk`, `l8mk`, `icp4/5/6`, `ic07/08/09/10/11/12/13/14`
  and retina `@2x` variants).
- `rle.js` (7.1 KB) — Apple-specific RLE24 compression for legacy ICNS types,
  ported from libicns's `icns_rle24.c`. This is the hard part: it is *not*
  PackBits, it is a per-channel RGB encoding with two run modes
  (same-byte `RL-1`, different-byte `RL+125`), and mask planes stored
  uncompressed alongside. Very few Node libraries get this right.

In other words, the project is **~40 KB of hand-written binary format
serialisers** plus a thin render step. That is exactly the kind of code you
want to inherit rather than rewrite.

## Sharp / libvips vs native ImageMagick

The rasterisation path is **sharp** (libvips under the hood), not ImageMagick
and not GraphicsMagick. Historically (v1.x–v2.x, 2016–2020) it used `svg2png`,
which depended on the deprecated `phantomjs`. [PR #136](https://github.com/akabekobeko/npm-icon-gen/pull/136)
switched to sharp in v3.0.0 (Dec 2021). The README explicitly notes that "the
quality of PNG generated from SVG will change" across that cut, and pins v2.1.0
as the fallback for anyone who cares about byte-for-byte parity with the old
renderer. The author has also mused about adding a `puppeteer-core` (Chromium)
path for higher-fidelity SVG, but it has not shipped.

**Operational implications:**

- sharp ships **pre-built native binaries** for macOS arm64/x64, Linux x64/arm64
  (glibc and musl), Windows x64. On those platforms it is zero-config. On
  unusual hosts (Alpine on ARMv7, some FaaS layers, older glibc) you may need
  `--platform=linuxmusl` or a rebuild; this is the standard sharp caveat, not
  an icon-gen issue.
- **No ImageMagick dependency**, no `convert`/`magick` binary on `$PATH`
  required, no system-level install. This matters for serverless and Docker
  footprints — we do not want a 100-MB ImageMagick layer just to build an
  `.icns`.
- Memory/CPU profile inherits sharp's: streaming, fast, single-digit-millisecond
  per PNG for typical icon sizes. End-to-end wall clock for a single SVG →
  full ico+icns+favicon bundle is ~200–500 ms on a modern laptop; most of that
  is sharp's cold start, not icon-gen itself.

## Performance

The work is "render ≤ 17 small PNGs, then byte-level pack", so performance is
dominated by sharp's SVG rasteriser. The container writers are pure JS over
Buffers with no I/O in the hot path and no external processes. On a warm
serverless invocation, expect sub-200 ms for a full ico+icns+favicon bundle;
the only cold-start concern is sharp's native binary load, which is a solved
problem. Comfortably inside the "invisible side-effect of generating a logo"
budget — no need to background-queue this step.

## Bindings we need

Concretely, to integrate into the Prompt Enhancer's `resize_icon_set` /
`generate_platform_bundle` pipeline, we need exactly this surface:

1. **Thin async wrapper** around `icongen(src, dest, options)` that accepts a
   `Buffer`/`ReadableStream` master asset (from our generation pipeline) rather
   than a filesystem path, because our upstream outputs an in-memory RGBA PNG
   or SVG, not a file. Implementation: write to `os.tmpdir()` via
   `fs.mkdtemp` + `fs.writeFile`, call `icongen`, read results back, clean up.
2. **Size-list policy mapping** — our platform manifest (iOS, Android, Windows,
   macOS, PWA, favicon) into icon-gen's `{ ico.sizes, icns.sizes,
   favicon.pngSizes, favicon.icoSizes }`. icon-gen covers Windows + macOS +
   favicon; we pair it with `capacitor-assets`/`pwa-asset-generator`/`appicons`
   for iOS/Android/watchOS/visionOS coverage (per category index
   recommendation, G11).
3. **Alpha preservation guarantee** — icon-gen round-trips alpha because sharp
   preserves RGBA by default and the ICO/ICNS writers use 32-bit channels. Our
   `validate_asset` step checks alpha coverage on returned PNGs; a regression
   here would be an icon-gen bug, not ours.
4. **Report stream capture** — `options.report: true` prints to stdout; we
   intercept via `process.stdout` patch or a child-process invocation so our
   tool call returns a structured `{ files[], sizes[], duration_ms }` payload
   rather than console spew.
5. **Version pin** — pin `icon-gen@5.0.0` + `sharp@0.33.x` in our lockfile.
   The Dec 2025 `sharp@0.34` issue is open, so we wait or fork-patch if
   sharp's 0.34 line becomes mandatory for a security advisory.

## Risks

- **Bus factor of one.** Single maintainer, slow release cadence. Mitigation:
  the code is ~40 KB of stable binary-format serialisers; if it goes
  unmaintained we can vendor it. MIT makes that trivial.
- **No `@2x`-name-aware iOS/Android export.** icon-gen stops at Windows, macOS,
  and favicon. It is *not* a replacement for `capacitor-assets` or
  `pwa-asset-generator`; it is a **peer** that owns the desktop-OS corners
  those tools don't.
- **SVG renderer quality drift.** sharp's libvips SVG rendering is librsvg,
  which is good but not Chromium. For pathological SVGs (CSS animations,
  foreign objects, complex filters) we may need a puppeteer pre-pass; not an
  issue for AI-generated logo marks, which are structurally simple.

## Decision

**Adopt `icon-gen` as the `.ico` + `.icns` leg of our platform-spec stack**,
alongside `onderceylan/pwa-asset-generator` (PWA + favicon HTML), `ionic-team/
capacitor-assets` (iOS/Android easy mode), and `guillempuche/appicons`
(watchOS/tvOS/visionOS/RN/Flutter). MIT license, sharp-based (no ImageMagick
surface-area tax), tiny dependency graph, correct ICNS RLE24 implementation
(which is the part we absolutely do not want to rewrite), ~26.5k weekly npm
downloads as production evidence. Pin `icon-gen@5.0.0` + `sharp@0.33.x`, wrap
in a buffer-in/buffer-out adapter, and call it from `resize_icon_set`. If
upstream goes fully dormant for >12 months past the next sharp major, vendor
the four binary-writer files into our repo under MIT attribution — total cost
of takeover is an afternoon.
