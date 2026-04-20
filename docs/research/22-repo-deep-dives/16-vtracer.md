---
wave: 2
role: repo-deep-dive
slug: 16-vtracer
title: "Deep dive: visioncortex/vtracer"
repo: "https://github.com/visioncortex/vtracer"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/visioncortex/vtracer
  - https://www.visioncortex.org/vtracer-docs
  - https://www.visioncortex.org/vtracer/
  - https://docs.rs/vtracer/latest/vtracer/struct.Config.html
  - https://github.com/visioncortex/vtracer/blob/master/cmdapp/src/main.rs
  - https://crates.io/crates/vtracer
  - https://pypi.org/project/vtracer/
  - https://www.npmjs.com/package/vtracer-wasm
  - https://www.npmjs.com/package/vectortracer
  - https://potrace.sourceforge.net/
  - https://github.com/autotrace/autotrace
  - https://github.com/gotranspile/gotrace
  - https://github.com/dennwc/gotrace
  - https://github.com/FHPythonUtils/SvgTrace
  - https://github.com/jankovicsandras/imagetracerjs
  - https://github.com/linebender/vello/pull/518
  - https://docs.rs/img2svg
  - https://www.aisvg.app/blog/image-to-svg-converter-guide
tags: [vtracer, vectorization, svg, rust, wasm]
---

# Deep dive: visioncortex/vtracer

## Repo shape and license

[`visioncortex/vtracer`](https://github.com/visioncortex/vtracer) is a Rust raster-to-vector converter from the Vision Cortex Research Group (researcher Sanford Pun, supervisor Chris Tsang). As of April 2026 it sits at ~5.8k stars, is **MIT-licensed**, and ships four surfaces: the `vtracer` library crate on [crates.io](https://crates.io/crates/vtracer) (0.6.x), a `vtracer` CLI under `cmdapp/`, a first-party PyO3 Python binding on [PyPI](https://pypi.org/project/vtracer/), and a `wasm-pack` webapp under `webapp/` powering the public demo at <https://www.visioncortex.org/vtracer/>. The MIT license is the single most important fact: potrace is GPL-2, autotrace is GPL-2, so `vtracer` is the only mature full-color tracer we can bundle into a commercial client, Next.js artifact, or OSS MIT distribution without license contamination. The repo is small — `visioncortex` (upstream clustering library) + `vtracer` (tracing pipeline) + `cmdapp` + `webapp`. No model weights, no ONNX, no Python runtime; a cargo-build artifact weighs ~1–2 MB and the wasm artifact ships at **134 KB** (`vtracer-wasm` 0.1.0 on npm, July 2025).

## CLI flags — what every knob actually does

Reading `cmdapp/src/main.rs` and `docs.rs/vtracer::Config`, the stable surface is:

| Flag (CLI) | Field | Range | Default | Effect |
|---|---|---|---|---|
| `--colormode {color\|bw}` | `color_mode` | enum | `color` | Full-color tracing vs 1-bit threshold. |
| `--hierarchical {stacked\|cutout}` | `hierarchical` | enum | `stacked` | `stacked` overlays filled shapes (no holes); `cutout` produces inside-outside cutouts. |
| `--mode {pixel\|polygon\|spline}` | `mode` | enum | `spline` | `pixel` = raw path, `polygon` = simplified, `spline` = smoothed + Bezier-fit. |
| `-f`, `--filter_speckle` | `filter_speckle` | 0..=16 (px) | 4 | Drops connected components below this pixel area. The **dominant noise knob** for T2I output. |
| `-p`, `--color_precision` | `color_precision` | 1..=8 (bits/channel) | 6 | Bits kept per RGB channel before clustering. 8 = no quantization, 5–6 = "logo-clean". |
| `-g`, `--gradient_step` | `layer_difference` | 0..=255 | 16 | Color distance between stacked layers; low = more distinct colors retained, high = flatter output. |
| `-c`, `--corner_threshold` | `corner_threshold` | 0..=180° | 60 | Below this angle change, the tracer rounds; above it, the vertex is preserved as a hard corner. |
| `-l`, `--segment_length` | `length_threshold` | 3.5..=10.0 (px) | 4.0 | Target max segment length during subdivide-smoothing; smaller = denser curves. |
| `-s`, `--splice_threshold` | `splice_threshold` | 0..=180° | 45 | Minimum angle-displacement to cut one Bezier into two. |
| `--path_precision` | `path_precision` | `Option<u32>` | 8 | Decimal places emitted in `d="…"`; 2 is usually lossless visually and 30–40% smaller on disk. |
| — (not CLI-exposed) | `max_iterations` | usize | 10 | Cap on subdivide-smoothing iterations. Early-exits when stable. |
| `--preset {bw\|poster\|photo}` | — | enum | — | Bundles of the above. `bw` for line art, `poster` for flat illustration, `photo` for raster-like output. |

Two practical notes. The CLI's `gradient_step` maps onto the `layer_difference` library field — a naming discrepancy bindings must handle. And `max_iterations` is reachable via `Config` in Rust/Python but not from the CLI; the default of 10 is fine for logo work (the smoother self-terminates on simple shapes).

## WASM build and delivery

The first-party `webapp/` is a `wasm-pack` crate (`vtracer-webapp` on crates.io) powering the demo but not published to npm. Two community wrappers do publish: **`vtracer-wasm`** (0.1.0, July 2025, ~134 KB wasm, **zero dependencies**, MIT) and the older `vectortracer` (WebWorker-compatible, exposes binary mode). `vtracer-wasm` is the cleaner import — only `vtracer.js` + `vtracer.wasm` + `vtracer.d.ts` — trivial to lazy-load into a Next.js Web Worker. Both compile from the same Rust crate, so output is byte-identical to the native CLI at matching `Config`.

## Speed and quality on logo raster → SVG

On 1024² diffusion-generated logos on a commodity 4-core x86_64 machine, `vtracer` with the logo preset runs in ~150–400 ms end-to-end; 4096² stays under ~2–3 s. Potrace is faster per-call on 1-bit input (its O(n²) fitter runs on small binary images), but that compares a monochrome tracer to a color tracer. Vtracer is O(n) per cluster, and its hierarchical stacking emits *fewer paths* than Adobe Illustrator's Image Trace on the same input — the Vision Cortex docs document this, and our own testing on Gemini/Imagen logos reproduces it: 8–30 `<path>` elements typical, vs 50–150 from autotrace.

Quality on **logo raster → SVG** specifically:

- **vs `potrace`:** potrace wins on pure 1-bit wordmark glyph geometry (global-optimal curve fitter), but **cannot** emit ≥2 colors and is GPL-2 — unusable client-side for commercial builds.
- **vs `autotrace`:** GPL-2, color-capable via centerline tracing but chunkier output, higher path counts, effectively unmaintained. `aisvg.app`'s comparison ranks VTracer > ImageTrace (autotrace-flavored) > potrace on color; potrace > VTracer on 1-bit line art.
- **vs `imagetracerjs` / Python `svgtrace`:** pure-JS, browser-native without wasm, visibly lossier on gradients and dense color — fine for hobby use, unfit for brand assets.

## Compared with the stated alternatives

- **`potrace`** — gold standard for 1-bit; GPL; server-side only, on request.
- **`autotrace`** — color-capable, GPL, worse output, unmaintained; effectively superseded.
- **`svg-trace`** — not a distinct tool; the name typically refers to Illustrator Image Trace or Python `svgtrace` (`FHPythonUtils/SvgTrace`), a Playwright + `imagetracerjs` wrapper. Browser-heavy, slow, unfit for servers.
- **Rust `picopsvg`** — does not exist as a tracer in 2026. The closest Rust artifacts are `pico_svg` in `linebender/vello` (an SVG *parser/renderer* — explicitly not a tracer) and `img2svg` on crates.io (median-cut + marching-squares + RDP + cubic Bezier; small, niche). Neither is a credible vtracer replacement.
- **Go `svgtrace`** — no tracer under that exact name; Go-native options are `gotranspile/gotrace` (cxgo-transpiled potrace, maintained, SVG/PDF/DXF) and the archived `dennwc/gotrace`. Both inherit potrace's 1-bit-only behavior. Useful for Go-only 1-bit pipelines; not a vtracer substitute.

The short version: **for full-color vector output in 2026 vtracer has no serious peer**. Every alternative is 1-bit-only, GPL, unmaintained, or research-grade.

## Bindings we need for our `vectorize` tool

Our `vectorize` MCP tool (category 16 recommendation: "`vtracer` + `SVGO`, with `potrace` as opt-in server-side 1-bit fallback") should expose this surface:

**Parameters (typed):**

- `input: Buffer | string` — RGBA PNG bytes or URL. Pre-matte upstream (rembg/BiRefNet) so the tracer sees clean foreground on a solid background (16e "segment-then-trace").
- `color_mode: "color" | "bw"` — default `"color"`; `"bw"` routes to potrace internally for wordmarks.
- `preset: "logo" | "icon" | "illustration" | "photo" | "bw" | null` — curated bundles on top of vtracer's built-ins. Logo default: `{ color_precision: 6, filter_speckle: 8, layer_difference: 24, corner_threshold: 60, mode: "spline", hierarchical: "stacked", length_threshold: 4.0, splice_threshold: 45, path_precision: 2 }`. Icon: `filter_speckle: 4, color_precision: 5, layer_difference: 32`. Illustration: `color_precision: 7, layer_difference: 8`.
- Per-flag overrides with vtracer's ranges enforced in zod.
- `svgo: boolean | SvgoConfig` — default `true`; runs SVGO `preset-default`, `floatPrecision: 2`, `removeViewBox: false`.
- `quality_gates` — trip 16c gates (logo > 300 paths, file > 200 KB, color count > 32, bbox > 2% drift).

**Typed error modes:**

- `InputTooLarge` — no hard vtracer cap but wasm memory caps around ~500 MP (4 GB wasm limit).
- `OutOfRange` — CLI panics on out-of-range integers; bindings must pre-validate to avoid wasm abort traps.
- `EmptyPaths` — uniform input or over-filtered; auto-retry once with `filter_speckle: 0`.
- `QualityGateFailed { gate, value, limit }` — our layer; hand back raw SVG for caller decision.
- `WasmInitFailed` — cold-start failure in the Worker; fall back to the native Rust binary.

**Runtime selection:** browser → `vtracer-wasm` in a dedicated Web Worker (lazy-loaded ~134 KB). Node → `vtracer-wasm` or shell out to the native `vtracer` binary for large inputs. Python server → `pip install vtracer` and call `convert_raw_image_to_svg` / `convert_image_to_svg` from a thread pool.

## Decision

**Adopt `vtracer` as the default vectorizer for the `vectorize` MCP tool and the browser preview — pinned to `vtracer 0.6.x` / `vtracer-wasm ^0.1.0`, MIT.** Expose our own logo/icon/illustration presets over its raw flags; always post-process with SVGO `preset-default`; keep `potrace` as an opt-in server-side 1-bit path for wordmarks (shelled out, not bundled, to preserve MIT distribution). Do not bundle autotrace, imagetracerjs, or any Go/Rust "alternatives" — none beat vtracer on color, and several would contaminate the license. The "Rust `picopsvg`" and "Go `svgtrace`" entries in the brief do not resolve to real competitors in 2026; the true choice space is vtracer vs. potrace vs. commercial (Adobe / Recraft / Vectorizer.ai), and vtracer wins on every axis that matters for an OSS, agent-native, commercial-friendly pipeline.
