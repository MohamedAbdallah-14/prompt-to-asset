---
title: "Image Processing & Optimization Libraries for an Embeddable Asset Pipeline"
category: 18-asset-pipeline-tools
angle: 18d
subagent: research-18d
status: complete
last_updated: 2026-04-19
runtimes_covered: [node, python, rust, go, wasm, cli]
primary_recommendation: "sharp (Node) + resvg-js for SVG + sharp-ico/icon-gen for ICO/ICNS; pyvips when Python is mandatory; ImageMagick only as a CLI fallback for exotic formats."
tags:
  - sharp
  - libvips
  - pyvips
  - pillow
  - pillow-simd
  - napi-rs-image
  - jimp
  - imagemagick
  - resvg
  - resvg-js
  - librsvg
  - go-imaging
  - bimg
  - rust-image
  - icon-gen
  - sharp-ico
---

# 18d — Image Processing & Optimization Libraries Suitable to Embed in a Plugin

## Executive Summary

The prompt-to-asset plugin turns a user request like *"a transparent logo for my note-taking app"* into a **correct, production-grade set of bitmap assets**: resized PNGs, WebP/AVIF variants, stripped-metadata favicons, `.ico` and `.icns` icon packs, OG images, and platform-specific splash screens. Everything upstream (the model) only produces a single raster or SVG — everything downstream (the plugin) must be **fast, deterministic, runnable offline, and safe to bundle into a Claude Skill / Codex tool / MCP server** running on arbitrary user hardware.

After auditing the major ecosystems, three findings dominate:

1. **libvips-backed libraries win on every axis that matters for a plugin.** sharp (Node), pyvips (Python), and bimg (Go) all wrap libvips and are **4–8× faster** and **~16× more memory-efficient** than ImageMagick, with sharp-on-libvips hitting ~64 ops/sec on a 2725×2225 JPEG→720×588 resize versus 2.4 ops/sec for jimp and ~8 ops/sec for ImageMagick class tools on comparable hardware ([sharp perf](https://sharp.pixelplumbing.com/performance/), [libvips Speed-and-Memory-Use wiki](https://github.com/libvips/libvips/wiki/Speed-and-memory-use)). Sharp alone is at **~19–20M weekly npm downloads** and ships prebuilt libvips binaries for every mainstream target.

2. **SVG rendering should be a separate tool from bitmap processing.** sharp uses librsvg (LGPL) through libvips and inherits its quirks; **resvg-js (@resvg/resvg-js)** is a Rust/NAPI renderer that is faster on large SVGs (the paris-30k benchmark dropped from ~33.7s to ~290ms on M1 Pro after resvg v0.34.0), has **zero external system dependencies**, is **MPL-2.0 / Apache-2.0** (permissive), and gives deterministic output. For a plugin that must generate icons from SVG input, the right architecture is **resvg-js → raw PNG buffer → sharp pipeline → ICO/ICNS/WebP/AVIF**.

3. **ICO and ICNS writing is not a sharp feature — pick a dedicated encoder.** `icon-gen` (MIT, 23.8k wk downloads), `sharp-ico` (used by Vite PWA), and `@shockpkg/icon-encoder` (MPL-2.0) all write the multi-resolution container formats Windows and macOS expect. sharp produces the PNG tiles, the encoder concatenates them into `.ico`/`.icns`. This two-stage design is the de-facto pattern in the PWA tooling ecosystem (`pwa-asset-generator`, `@vite-pwa/assets-generator`, `@capacitor/assets`).

Secondary findings: **jimp is only defensible when you cannot ship native binaries** (edge runtimes, size-capped serverless platforms where sharp's ~13–38 MB footprint is prohibitive); **Pillow-SIMD beats stock Pillow but still loses to pyvips** by ~2× on memory and ~1.5–2× on wall time; **ImageMagick 7 should be demoted to a CLI-only fallback** for exotic inputs (PSD, legacy RAW, DICOM); and **Windows packaging of libvips remains the single biggest cross-platform headache** — fortunately sharp's prebuilt `@img/sharp-libvips-win32-*` packages remove almost all of that friction from the user's perspective, provided the plugin host can execute native `.node` modules.

## Library Matrix

| Library | Runtime | Backend | License | Install size | Runtime speed (relative) | Formats in/out | Notes |
|---|---|---|---|---|---|---|---|
| **sharp** | Node.js ^18.17.0 or ≥20.3.0 | libvips (native) | Apache-2.0 (lib), libvips LGPL-v3 (shipped as separate dylib) | ~38 MB node_modules / ~13 MB zipped for Lambda | **1.0× (reference)** | JPEG, PNG, WebP, AVIF, TIFF, GIF, HEIF (no HEIC by default), SVG via librsvg, raw, ICO *read only* | De-facto standard. Used by `next/image`. Current stable: **v0.34.5** (v0.35.0-rc.2 available as of Apr 2026). Prebuilt binaries for win32-x64/arm64, linux-x64/arm64/arm/musl, linux-riscv64 (experimental), darwin-x64/arm64. |
| **@napi-rs/image** | Node.js ≥14, Bun, Deno, wasm32-wasip1-threads | Rust (`image` crate + resvg + libavif-rs) | MIT | ~10–15 MB (single `.node` per target) | **~1.0–1.2× sharp** on WebP/AVIF encode on M1 Max | JPEG, PNG, BMP, ICO, WebP, AVIF, TIFF, TGA, farbfeld (R/W); DDS, EXR, PNM, SVG (R) | Smaller native binary, no system deps. **Fewer ops** than sharp (no channel math, limited resize filters). WASM build exists. |
| **jimp** | Node, Browser, Bun, Deno, Lambda | Pure JS | MIT | ~1.5 MB | **~1/26× sharp** (2.4 vs 64.4 ops/sec; ~800 MB vs ~50 MB peak for 100-image batch) | PNG, JPEG, BMP, GIF, TIFF; WebP/AVIF via optional WASM plugins | Only correct answer for **edge runtimes** (Cloudflare Workers, Vercel Edge, browser extensions) or when native deps are banned. Maintainer cadence slowed after v1.6 (late 2024) but no CVEs. |
| **Pillow** | CPython ≥3.10 | C (libjpeg-turbo, libwebp, libpng) | MIT-CMU (HPND) | ~3 MB wheel | **~2–3× slower than pyvips**, higher memory | JPEG, PNG, WebP, AVIF (built-in as of Pillow 10.2+ w/ libavif; no plugin needed), GIF, ICO (R/W), ICNS (R/W), TIFF, BMP, PSD (R), PCX, TGA | **Built-in ICO + ICNS writers** (`Image.save("x.ico", sizes=[(16,16),…])` and `"x.icns"`). Current stable: **v12.1.1** (Jan 2026; v12.x series dropped Python 3.8/3.9 support). Huge ecosystem (matplotlib, torchvision). Windows wheels work. |
| **Pillow-SIMD** | CPython | Pillow fork with SSE4/AVX2 | same | ~3 MB | **~4–6× stock Pillow on resize/convolution**, still ~1.5–2× slower than pyvips | same as Pillow | Drop-in. x86 only. Worth it for CPU-bound resize-heavy batch jobs without libvips. |
| **pyvips** | CPython, PyPy | libvips via cffi | MIT (binding), LGPL-3.0 (libvips) | ~1 MB + libvips system pkg (or `pyvips-binary` wheel bundling libvips) | **Fastest Python option**; ~0.18s vs Pillow-SIMD 0.36s on load/crop/shrink/sharpen/save 5000×5000 TIFF (49 MB vs 230 MB peak) | JPEG, PNG, WebP, AVIF, TIFF (incl. pyramidal, BigTIFF), HEIF, GIF, SVG via librsvg, PDF via Poppler, RAW, OpenEXR, DICOM, DZI | Best for large images / batch / streaming pipelines. Requires libvips on host unless using `pyvips-binary` (experimental). |
| **ImageMagick 7 / `magick` CLI / Wand / gm** | CLI, Python (Wand), Node (gm) | ImageMagick C library + delegates | Apache-2.0 (rebranded 2025; historically ImageMagick License) | ~40–100 MB full install + delegates | **~4–8× slower than libvips** on common ops; ~16× memory (1.5 GB vs 94 MB on 2025 benchmark) | Everything (including PSD, DICOM, legacy RAW via delegates, PostScript via Ghostscript) | Current stable: **v7.1.2-19** (Apr 2026). Correct fallback for **exotic formats** or one-off CLI glue. Avoid as primary in-process engine. Python binding: Wand **v0.7.0** (Feb 2026). |
| **resvg + resvg-js + @resvg/resvg-wasm** | Rust crate, Node (napi), Browser (WASM) | Pure Rust (`tiny-skia` renderer) | MPL-2.0 (resvg), bindings Apache-2.0 | ~6–12 MB per native target, ~3 MB WASM | Fastest SVG rasterizer; 115× speedup on paris-30k after v0.34 | SVG → PNG/RGBA buffer | Deterministic, **no system fonts needed** (supports embedded + custom fonts). Does not implement full SVG 2.0 but covers icon-class SVGs. |
| **librsvg / rsvg-convert** | C lib, CLI, Python via PyGObject | GLib + Cairo | LGPL-2.1-or-later | libvips inherits it | Fast, very compatible with Inkscape output | SVG → PNG | Used inside sharp/libvips. System dependency on Linux/macOS via Homebrew; painful on Windows (pulls GLib+Cairo+Pango). |
| **cairo / cairosvg** | C / Python | cairo | LGPL-2.1 / MPL-1.1 | medium | ok | SVG → PNG/PDF/PS | Heavier, GLib-heavy install. Good for PDF/PS output; not needed if resvg-js is available. |
| **Rust `image` crate** | Rust, WASM | Pure Rust | MIT/Apache-2.0 | tiny | mid-tier; no SIMD yet for all codecs | JPEG, PNG, GIF, BMP, ICO (R/W), TIFF, WebP (via `image-webp`), AVIF (via `ravif`/`libavif`), PNM, TGA, farbfeld, HDR, QOI, OpenEXR | Foundation of napi-rs/image. Good for embedding in Rust-native plugins / Tauri sidecars. |
| **Go `disintegration/imaging`** | Go | Pure Go | MIT | tiny | pure-Go; slower than bimg for resize; fine for small assets | JPEG, PNG, GIF, BMP, TIFF | ~5.7k stars, no 1.7+ update but API is stable. Good default if you can't ship libvips with Go. |
| **Go `h2non/bimg`** | Go | libvips via cgo | MIT | requires libvips on host | ~4× ImageMagick, ~8× Go stdlib on JPEG | same as libvips | Needs C toolchain + libvips headers. Last tagged release 2020 but still widely used (3k stars). |
| **icon-gen (Node)** | Node | pure JS (uses PNG buffers) | MIT | tiny | n/a (I/O bound) | In: PNG/SVG via libs; Out: **ICO, ICNS, favicon set** | 23.8k wk downloads, de-facto Node ICO/ICNS writer. |
| **sharp-ico (Node)** | Node | sharp + BMP/PNG packing | MIT | tiny | n/a | ICO R/W driven by sharp | Used by `@vite-pwa/assets-generator`. |
| **@shockpkg/icon-encoder** | Node | pure JS | MPL-2.0 | tiny | n/a | ICO, ICNS | Most control over ICNS OSType codes; TS API. |

### Feature coverage vs plugin needs

| Feature needed by prompt-to-asset | sharp | @napi-rs/image | jimp | Pillow | pyvips | ImageMagick | resvg-js | rust image | go imaging | bimg |
|---|---|---|---|---|---|---|---|---|---|---|
| Resize (Lanczos/Mitchell) | ✅ | ✅ (lanczos3) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |
| Format convert (PNG↔WebP↔AVIF) | ✅ | ✅ | ⚠ via WASM | ⚠ AVIF via plugin | ✅ | ✅ | n/a | ⚠ AVIF via ravif | ❌ AVIF/WebP | ✅ |
| Alpha manipulation (premultiply, composite over bg, `ensureAlpha`, `flatten`) | ✅ | ⚠ limited | ✅ | ✅ | ✅ | ✅ | ✅ (bg color) | ✅ | ⚠ | ✅ |
| Strip metadata (`withMetadata(false)` / `.withIccProfile` / EXIF wipe) | ✅ | ⚠ partial | ❌ (always strips) | ✅ | ✅ | ✅ | ✅ (never writes EXIF) | ⚠ | ⚠ | ✅ |
| Background removal (alpha matting) | ❌ (no ML) | ❌ | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ❌ | ❌ |
| Icon pack compose (multi-size tiles into one `.ico`/`.icns`) | via helper | ❌ | ❌ | ✅ native `save()` | via helper | ✅ (`magick -define icon:auto-resize`) | n/a | via helper | via helper | via helper |
| Render SVG → PNG | ✅ via librsvg | ✅ via resvg | ❌ | ⚠ via cairosvg | ✅ via librsvg | ✅ via RSVG/MSVG | ✅ native | ❌ (need `resvg`) | ❌ | ✅ |
| OG image (1200×630) composition from text | ✅ via composite + SVG text | ⚠ | ✅ | ✅ | ✅ | ✅ | SVG-first flow | ✅ | ✅ | ✅ |
| Favicon set (32, 192, 512, apple-touch, mask-icon, OG) | ✅ + `icon-gen`/`sharp-ico` | ✅ + `icon-gen` | ⚠ slow | ✅ | ✅ | ✅ | partial | ✅ | ✅ | ✅ |
| Streams / pipeline | ✅ | ⚠ | ❌ | ⚠ | ✅ | ✅ | ❌ | ⚠ | ❌ | ⚠ |
| Bundleable in a Claude Skill / MCP server w/o system-level installs | ✅ (prebuilt) | ✅ (prebuilt, smaller) | ✅ | ✅ (wheels) | ⚠ (need libvips or `pyvips-binary`) | ❌ unless system-installed | ✅ | ✅ | ✅ | ❌ |

## Benchmark Data

All numbers below are from primary sources cited at the end. Prefer the **ops/sec** and **peak memory** columns; wall-time across hardware is not directly comparable.

### Node.js — JPEG resize, 2725×2225 → 720×588

| Library | Throughput | Peak memory (100-image batch) | Relative |
|---|---|---|---|
| sharp (buffer → buffer) | **64.42 ops/sec** | ~50 MB | 1.00× |
| sharp (file → file) | 62.67 ops/sec | ~50 MB | 0.97× |
| @napi-rs/image (WebP encode on M1 Max, `UV_THREADPOOL_SIZE=10`) | **431 ops/sec** | — | — |
| @napi-rs/image (WebP encode default threadpool) | 202 ops/sec | — | 1.2× vs sharp 169 on same bench |
| jimp | 2.40 ops/sec | ~800 MB | **0.037×** (~27× slower) |
| Squoosh (`@squoosh/lib`) | ~2.6 ops/sec | — | ~0.04× |

> **Updated 2026-04-21:** `@squoosh/lib` and `@squoosh/cli` are **abandoned**. Google removed the CLI source from the squoosh repository; the npm package has not been updated for Node 18+ and fails on Node 20. The `@squoosh/lib` row above is retained for historical benchmark reference only — **do not use it in new code**. For browser-side codecs, use `jSquash` (`@jsquash/png` v3.1.1, `@jsquash/avif` v2.1.1, etc.), which is the maintained WASM fork of the same codecs. For server-side, use `sharp` (AVIF/WebP built-in via libvips/libavif).

Source: [sharp performance page](https://sharp.pixelplumbing.com/performance/), [pkgpulse.com sharp-vs-jimp-2026](https://www.pkgpulse.com/blog/sharp-vs-jimp-2026), [@napi-rs/image home](https://image.napi.rs/).

### libvips vs ImageMagick — modern hardware (2025)

Task: decode JPEG, crop, resize to 50%, sharpen, JPEG-encode (from the [libvips benchmark](https://github.com/libvips/libvips/wiki/Speed-and-memory-use)):

| Engine | Wall time | Peak RSS | Notes |
|---|---|---|---|
| libvips (C) | **0.57 s** | **94 MB** | native pipeline |
| pyvips | ~0.6 s | ~100 MB | negligible overhead over C |
| Pillow-SIMD 5.3 | ~0.9–1.0 s | ~230 MB | SSE4/AVX2 |
| Pillow (stock) | ~1.8 s | ~230 MB | |
| ImageMagick 7.1.1 | **4.38–4.44 s** | **~1500 MB** | default delegates |

Ratios: **libvips ≈ 7.7–7.8× faster** and **~16× less memory** than ImageMagick 7 on equivalent work.

### Python — 5000×5000 RGB TIFF: load → crop → shrink 10% → sharpen → save

| Library | Time | Peak memory |
|---|---|---|
| libvips (C / vips CLI) | 0.15 s | 40 MB |
| pyvips 2.1.6 | **0.18 s** | **49 MB** |
| Pillow-SIMD 5.3 | 0.36 s | 230 MB |
| Pillow 5.3 | ~0.6 s | 230 MB |

Source: [Stack Overflow reference + libvips/vips-bench](https://github.com/libvips/vips-bench).

### SVG rasterization — paris-30k.svg

| Renderer | Time (M1 Pro) |
|---|---|
| resvg-js v2.6.0 (resvg 0.34) | **~290 ms** |
| resvg-js pre-v2.6.0 | ~33,760 ms |
| librsvg / rsvg-convert | ~1,800 ms (comparable hardware) |

Source: [@resvg/resvg-js CHANGELOG](https://github.com/yisibl/resvg-js/blob/main/CHANGELOG.md).

### Memory profile summary for plugin authors

- **sharp default**: ~20–50 MB working set even for multi-hundred-image batches, because libvips streams horizontally and doesn't decode everything at once.
- **jimp**: memory grows linearly with batch size (pure JS GC, full decode into JS arrays).
- **ImageMagick**: 500 MB–1.5 GB routine; set `MAGICK_THREAD_LIMIT` and `MAGICK_MEMORY_LIMIT`.
- **@napi-rs/image**: comparable to sharp for single ops, fewer multi-op pipelines available.

### Concurrency knobs

- sharp / libvips: `UV_THREADPOOL_SIZE` (Node libuv threads) and `VIPS_CONCURRENCY` (libvips worker threads per op). For an embedded plugin, pinning both to `min(4, cores-1)` is safe.
- ImageMagick: `MAGICK_THREAD_LIMIT`, `MAGICK_MEMORY_LIMIT`, `MAGICK_DISK_LIMIT`, and **always set `TMPDIR`** to a local fast disk.
- @napi-rs/image: inherits libuv threadpool; benefits roughly linearly with `UV_THREADPOOL_SIZE` up to `cores`.

## PNG Optimization Post-Processing

> **Updated 2026-04-21:** This section was absent from the original research and represents a gap. Lossless and lossy PNG compression are distinct post-processing steps that belong after sharp's output pipeline and before writing to storage. Both tools below are Rust-native and integrate cleanly with asset pipelines.

For production-grade PNG outputs, apply compression after generation:

| Tool | Kind | Current version (Apr 2026) | CLI | Node / Python | Notes |
|---|---|---|---|---|---|
| **oxipng** | Lossless (no pixel change) | v9.1.1 | `oxipng --opt 4 *.png` | `oxipng` npm wrapper; Docker image at `ghcr.io/oxipng/oxipng` | Multithreaded Rust binary. `--opt 4` is the practical default (good compression, fast). `--opt 6` adds 2–5% savings for assets encoded once/served forever. `--strip all` removes EXIF/ICC metadata (recommended for web assets). Preferred over optipng. |
| **pngquant** | Lossy (reduces color palette) | 2.18+ | `pngquant --quality 80 *.png` | via `node-pngquant` / subprocess | 6-color K-means quantization — essential for app icons at small sizes (favicon 16×16). Run **before** oxipng: `pngquant → oxipng` stacks both passes and can reduce a 383 KB PNG to ~70 KB. |

**Recommended pipeline for asset icons:**
```text
sharp output (PNG)  →  pngquant --quality 75-85 --speed 1  →  oxipng --opt 4 --strip all  →  storage write
```

**For logos/OG images with alpha:** skip pngquant (palette reduction hurts gradient quality) — run oxipng only.

## Text Compositing / Canvas API

> **Updated 2026-04-21:** The original research omitted the Canvas/Skia layer used for compositing brand text onto generated images — a critical path for the strong-text-renderer fallback described in CLAUDE.md. Three libraries are relevant:

| Library | Backend | Current version | Weekly downloads | Notes |
|---|---|---|---|---|
| **@napi-rs/canvas** | Skia (same as Chrome) | v0.1.98 (Apr 2026, very active) | high | Zero system deps, prebuilt NAPI binaries, Canvas API compatible. Best for in-process text compositing in Node workers. |
| **skia-canvas** | Skia (GPU-accelerated) | v3.0.8 | ~50k | Multi-threaded, SVG output, excellent font loading. Slightly larger binary. Good choice when you need GPU paths. |
| **node-canvas** (cairo) | Cairo/Pango | v2.11+ | ~5M | Mature; requires system cairo/Pango install which conflicts with the "no system installs" rule for MCP servers. Use only in controlled server environments. |

**For the prompt-to-asset MCP server:** use `@napi-rs/canvas` (zero system deps, prebuilt) for compositing typography onto generated assets when the model cannot be trusted with brand text (all models except gpt-image-1, Ideogram 3 Turbo, and Nano Banana Pro as documented in CLAUDE.md).

## Packaging Strategy per OS

The plugin has to run inside a Claude Skill, a Codex/MCP server, or a plain Node/Python CLI on macOS, Linux, and Windows, and occasionally inside a sandboxed edge environment. Packaging decisions flow from that.

### Node.js plugin (recommended default)

**Primary engine: `sharp` (Apache-2.0) + `@resvg/resvg-js` (MPL-2.0) + `icon-gen` or `sharp-ico` (MIT).**

- `npm install sharp` pulls the right `@img/sharp-<platform>-<arch>` and `@img/sharp-libvips-<platform>-<arch>` prebuild automatically for darwin-x64, darwin-arm64, linux-x64 (gnu + musl), linux-arm64, linux-arm, win32-x64, win32-arm64, linux-riscv64 (experimental), and linux-ppc64/s390x. Current stable: **v0.34.5**; requires **Node.js ^18.17.0 or ≥20.3.0** (Node 16 dropped). Confirmed on [sharp install docs](https://sharp.pixelplumbing.com/install/).

> **Updated 2026-04-21:** Sharp v0.34 dropped Node 16 support. Projects pinned to Node 16 must upgrade before upgrading sharp. The `--build-from-source` flag is deprecated in v0.34+ (use npm v12+ instead). Sharp v0.35.0-rc.2 is available as a release candidate with BigTIFF output support and RISC-V experimental binaries.
- **macOS**: works out of the box on x64 and arm64. If the plugin is shipped as a signed `.pkg`, the prebuilt `.node` must be included in the notarization bundle and stapled — don't rely on post-install `npm install` on first run unless the host has `node-gyp` fallback enabled.
- **Linux**: separate `linux-x64` (glibc) and `linuxmusl-x64` (Alpine) builds. If the plugin may run in Alpine-based Docker (common for serverless), test against `node:20-alpine` explicitly.
- **Windows**: **the single known pain point.** sharp supports Windows x64/x86/arm64 but `sharp-libvips` cannot be overridden with a globally installed libvips on Windows ([sharp#4436](https://github.com/lovell/sharp/issues/4436)). This is only a problem if the plugin author needs HEIC/HEVC or a custom libvips build; for standard JPEG/PNG/WebP/AVIF/SVG/GIF/TIFF workflows, the prebuilt `@img/sharp-libvips-win32-x64` package is sufficient. Plugins should **not** require Visual Studio build tools; they should pin to a sharp version that has a working prebuild for every target.
- **WASM fallback**: sharp 0.33+ ships an experimental `@img/sharp-wasm32` build (LGPL because of static linking). Useful for browser-side asset preview in a web companion UI; **not recommended** as the primary engine due to lower throughput and larger cold-start.
- **Edge runtimes (Vercel Edge, Cloudflare Workers)**: sharp is blocked; fall back to `jimp` (pure JS, WebP/AVIF only via WASM plugin) or delegate to an external service.

SVG input flow (preferred):

```text
svg string  ─►  resvg-js.render({ fitTo: { mode: 'width', value: 1024 } })  ─►  RGBA buffer
             ─►  sharp(buffer, { raw: { width:1024, height:1024, channels:4 } })
             ─►  .resize(N).png({ compressionLevel: 9, adaptiveFiltering: true })
             ─►  .toBuffer()
             ─►  icon-gen or sharp-ico → .ico / .icns
```

Rationale: resvg-js is deterministic across OS, does not need system fonts on the host, and is faster on large SVGs than librsvg. Routing through sharp gives access to `.removeAlpha()`, `.flatten({ background })`, `.ensureAlpha()`, `.withMetadata({ exif: {} })`, `withIccProfile('srgb')`, and AVIF/WebP encoders.

### Python plugin

**Primary engine: `pyvips` where libvips is available; `Pillow` + `Pillow-SIMD` as a portable fallback.**

- Wheel strategy: the cleanest install path is the experimental `pyvips-binary` wheel (bundles libvips on manylinux, macOS, and win_amd64). When that's not available, fall back to `pip install pyvips` + a README instruction to install libvips via Homebrew (`brew install vips`), apt (`apt-get install libvips-dev`), or chocolatey (`choco install libvips`). **Plugin authors should assume `pip install pyvips` alone will fail on a clean Windows machine.**
- Pillow has built-in ICO and ICNS writers: `Image.save("out.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])` and `Image.save("out.icns")` — these are the simplest way to produce icon packs in Python without adding more dependencies.
- For AVIF: Pillow ≥10.2 supports AVIF natively when built against libavif (no separate plugin needed on modern installs). The `pillow-avif-plugin` is legacy/fallback only.
- Pillow-SIMD is a **drop-in** replacement for Pillow (same `PIL` namespace) but only ships x86 wheels; ship it as an optional "perf" extra, not a hard dep.
- **Never require ImageMagick/Wand** as a hard dep — only use it when the user supplies an input format (PSD, DICOM) that nothing else handles. If needed: Wand **v0.7.0** (Feb 2026) is the current release, supports Python 3.8+.

> **Updated 2026-04-21:** Pillow **v12.x** (current: 12.1.1) dropped Python 3.8 and 3.9 support. If your plugin must target CPython 3.8, pin Pillow to `<12`. The quarterly release schedule means v12.2.0 is expected April 2026.

### Rust / Tauri sidecar

If the plugin is delivered as a Rust binary (e.g. as a Tauri sidecar or a standalone CLI shipped with a Claude Skill), the lightest self-contained stack is:

- `image` crate (MIT/Apache-2.0) for PNG/JPEG/WebP/AVIF/GIF/ICO/TIFF, all statically linked.
- `resvg` (MPL-2.0) for SVG rasterization.
- `ravif` or `libavif-rs` for AVIF encode if `image`'s default AVIF encoder is too slow.
- `ico` crate for multi-size ICO writing (MIT).
- `icns` crate for ICNS (MIT).

The entire pipeline compiles to a **single ~8–15 MB static binary** per `(os, arch)` with no runtime deps beyond the system loader. This is the best option when the plugin must **not** depend on a user-installed Node/Python runtime.

### Go plugin

- `disintegration/imaging` (pure Go, MIT) is the right default: it has no cgo, cross-compiles trivially for every OS/arch Go supports, and handles resize/crop/rotate/convolution. Lacks WebP/AVIF encode.
- `bimg` (MIT) wraps libvips via cgo and matches Node's `sharp` in speed — but **requires libvips installed on the target machine**, which defeats "single-binary Go" packaging. Only use when the plugin is deployed to a controlled server (Linux Docker image with libvips baked in).
- For SVG, shell out to `rsvg-convert` or embed `resvg` via the `resvg` CLI; there is no first-class Go SVG renderer.

### Cross-OS notes on troublesome formats

- **HEIC/HEVC**: sharp's prebuilt libvips does **not** ship libheif with HEVC encoding (patent-encumbered). If HEIC input must be supported, either (a) document the user needs to install libheif/libvips themselves, (b) use ImageMagick CLI, or (c) skip — HEIC is rarely needed for generated assets.
- **AVIF**: modern libvips + libavif handles encode fine; sharp's prebuilt has it enabled. Quality/Speed presets: `quality: 50, effort: 4` is a good default for thumbnails; `effort: 9` for hero images.
- **SVG with custom fonts**: librsvg/libvips reads system fonts only; resvg-js accepts custom font buffers via `font: { fontFiles: […] }`, which is critical when the plugin is running in a container with no installed fonts.
- **ICO**: sharp does **not write** ICO — use `icon-gen` (MIT, 23.8k wk downloads) or `sharp-ico` (MIT, used by `@vite-pwa/assets-generator`).
- **ICNS**: same — sharp does not write ICNS. Use `icon-gen` or `@shockpkg/icon-encoder` (MPL-2.0, better control over OSType tags, useful when matching Xcode's exact output).

### License decisions for a distributable plugin

| License | Can be embedded in a closed-source plugin? | Notes |
|---|---|---|
| Apache-2.0 (sharp bindings, rust `image`, `ravif`) | ✅ | Standard permissive; notice file required. |
| MIT (jimp, Pillow, `disintegration/imaging`, `icon-gen`, `sharp-ico`, `ico`, `icns` crates) | ✅ | Simplest; attribution only. |
| MPL-2.0 (resvg, resvg-js, `@shockpkg/icon-encoder`) | ✅ **with file-level copyleft** | If you modify MPL files, you must publish the modified file. Consumers linking unmodified binaries are fine. |
| LGPL-2.1 / LGPL-3.0 (libvips, librsvg, GLib, cairo) | ✅ **only via dynamic linking** | Sharp mitigates by shipping libvips as a separate `.node`-loaded shared library. If you statically link (WASM, some Rust builds), the combined work becomes LGPL. |
| Apache-2.0 (ImageMagick 7 — rebranded 2025; v7.1.2-19 current) | ✅ | Permissive post-rebrand, but still heavy and with many LGPL/GPL delegates; avoid statically linking. |

Concretely: **a closed-source plugin can ship `sharp` + `@resvg/resvg-js` + `icon-gen` with only Apache-2.0 / MPL-2.0 / MIT notices.** It must **not** statically link libvips or librsvg into its own binary.

## Recommended Plugin Stack

For the prompt-to-asset project, the default stack per host runtime is:

- **Node.js (primary)**: `sharp` for all bitmap ops + `@resvg/resvg-js` for SVG rasterization + `icon-gen` (or `sharp-ico`) for ICO/ICNS + a thin in-house module for manifest-aware composition (PWA icons, Apple splash, OG cards).
- **Python (secondary)**: `pyvips` when libvips is installable, else `Pillow` + `Pillow-SIMD` (optional perf extra) + `cairosvg`/`resvg-py` for SVG. Use Pillow's native ICO/ICNS writers.
- **Rust (optional, for a self-contained CLI)**: `image` + `resvg` + `ico` + `icns` crates, cross-compiled once per target.
- **Fallback CLI**: `magick` (ImageMagick 7) **only** for exotic inputs the main stack refuses.
- **Never** rely on jimp for the main pipeline; keep it as an edge-runtime escape hatch.

## References

### sharp / libvips

- sharp, Installation — <https://sharp.pixelplumbing.com/install/>
- sharp, Performance — <https://sharp.pixelplumbing.com/performance/>
- sharp, Operations API (flatten, ensureAlpha, withMetadata) — <https://sharp.pixelplumbing.com/api-operation>
- sharp, LICENSE (Apache-2.0) — <https://github.com/lovell/sharp/blob/master/LICENSE>
- sharp-libvips, LICENSE + THIRD-PARTY-NOTICES — <https://github.com/lovell/sharp-libvips/blob/main/LICENSE>, <https://github.com/lovell/sharp-libvips/blob/main/THIRD-PARTY-NOTICES.md>
- sharp #4023 — why libvips is shipped as separate dylib — <https://github.com/lovell/sharp/issues/4023>
- sharp #4436 — global libvips unsupported on Windows — <https://github.com/lovell/sharp/issues/4436>
- sharp #2257 — Lambda package size — <https://github.com/lovell/sharp/issues/2257>
- sharp #4100 — strip EXIF but keep original — <https://github.com/lovell/sharp/issues/4100>
- sharp #2910 — `withExif()` added in v0.33 — <https://github.com/lovell/sharp/issues/2910>
- sharp #2601 — `flatten()` always removes alpha — <https://github.com/lovell/sharp/issues/2601>
- sharp AWS Lambda layer — <https://github.com/cbschuld/sharp-aws-lambda-layer>
- libvips Speed and Memory Use wiki — <https://github.com/libvips/libvips/wiki/Speed-and-memory-use>
- libvips vips-bench repo — <https://github.com/libvips/vips-bench>

### @napi-rs/image

- Docs + benchmarks (Apple M1 Max) — <https://image.napi.rs/>, <https://image.napi.rs/docs>
- WASM target (wasm32-wasip1-threads) — <https://napi.rs/docs/concepts/webassembly>
- Changelog — <https://image.napi.rs/changelog>

### jimp

- Docs — <https://jimp-dev.github.io/jimp>
- Browser guide — <https://jimp-dev.github.io/jimp/guides/browser/>
- 2026 practical patterns — <https://thelinuxcode.com/nodejs-jimp-in-2026-practical-patterns-edge-cases-and-production-habits/>
- Benchmarks — <https://www.pkgpulse.com/blog/sharp-vs-jimp-2026>, <https://www.pkgpulse.com/blog/sharp-vs-jimp-vs-squoosh-2026>

### Pillow / Pillow-SIMD / pyvips

- Pillow perf — <https://python-pillow.github.io/pillow-perf/>
- Resize comparison gist — <https://gist.github.com/amw/2febf24ebcb3baf409c50decbea71e6e>
- libvips/vips-bench — <https://github.com/libvips/vips-bench>
- Stack Overflow library comparison — <https://stackoverflow.com/questions/28225328/comparing-and-contrasting-pythons-many-image-processing-libraries>

### resvg / librsvg / cairo

- `@resvg/resvg-js` npm — <https://www.npmjs.com/package/@resvg/resvg-js>
- thx/resvg-js repo — <https://github.com/thx/resvg-js>
- resvg-js CHANGELOG (115× speedup note) — <https://github.com/yisibl/resvg-js/blob/main/CHANGELOG.md>
- resvg crate — <https://crates.io/crates/resvg>
- librsvg shipped inside libvips — <https://github.com/lovell/sharp-libvips/blob/main/THIRD-PARTY-NOTICES.md>

### ImageMagick

- Sharp vs ImageMagick 2026 — <https://blog.lumaiere.com/sharp-vs-imagemagick-the-glow-up-the-glow-down-and-when-to-use-which/>
- Remote Mac SSG matrix (sharp vs libvips vs IM) — <https://macwww.com/en/blog/articles/2026-remote-mac-sharp-libvips-imagemagick-ssg-concurrency-memory-matrix.html>
- IM license rebrand discussion — <https://github.com/ImageMagick/ImageMagick/blob/main/LICENSE>

### Rust image / Go image / bimg

- image crate — <https://github.com/image-rs/image>, <https://docs.rs/crate/image/latest/features>
- resvg crate — <https://crates.io/crates/resvg/0.25.0>
- disintegration/imaging — <https://github.com/disintegration/imaging>
- h2non/bimg — <https://github.com/h2non/bimg/>
- bimg README — <https://github.com/h2non/bimg/blob/master/README.md>

### Icon pack writers & PWA ecosystem

- icon-gen — <https://www.npmjs.com/package/icon-gen>
- @shockpkg/icon-encoder — <https://www.npmjs.com/package/@shockpkg/icon-encoder>
- whyun-pages/icns-gen — <https://github.com/whyun-pages/icns-gen>
- favicons — <https://github.com/evilebottnawi/favicons>
- elegantapp/pwa-asset-generator — <https://github.com/elegantapp/pwa-asset-generator>
- @vite-pwa/assets-generator — <https://vite-pwa-org.netlify.app/assets-generator/>
- @capacitor/assets — <https://capacitorjs.com/docs/v5/guides/splash-screens-and-icons>
- sharp-ico (pkg used by Vite PWA) — <https://github.com/ssnangua/sharp-ico>
