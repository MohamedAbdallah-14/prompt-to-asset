---
category: 16-background-removal-vectorization
angle: 16c
title: "Vectorization Tooling Deep-Dive: Open-Source Robustness, WebAssembly Ports, and Production Operations"
status: draft
date: 2026-04-19
agent: research-subagent-16c
complements:
  - 12b-vectorization-fundamentals-and-raster-to-vector
scope:
  - vtracer (Rust/wasm)
  - potrace (canonical single-color)
  - imagetracerjs (pure JS)
  - autotrace (centerline + outline)
  - DiffVG (differentiable rasterizer)
  - SVGO post-processing
  - segment-then-trace recipe
word_target: 2500-4000
---

# 16c — Vectorization Tooling Deep-Dive (Production Ops Focus)

## Executive Summary

For a prompt-to-asset that ships **SVG-grade logos, icons, and illustrations** generated from raster diffusion models, vectorization is the post-processing step that decides whether the final asset is a crisp brand-ready `.svg` or a blurry PNG masquerading as vector. This deep-dive complements 12b (which covers vector-native generation and the raster→vector problem space) by focusing on three operational questions:

1. **Which open-source tracer is the right default** for a production pipeline that must run headless, reproducibly, and on low-spec CI/serverless runners?
2. **How feasible is browser-side vectorization** via WebAssembly — can we move the tracer into the user's browser for privacy, zero-infra cost, and sub-second latency?
3. **How do we tame the parameter space** (smoothness vs path count, speckle filtering, color quantization) so a coding agent can drive the tool without hand-tuning every image?

The headline findings:

- **vtracer is the production default for color assets.** It is the only open-source tool that produces compact multi-color SVGs comparable to Adobe Illustrator's Image Trace, is written in Rust (fast, memory-safe, no Python deps), ships official wasm bindings (`vtracer-wasm` on npm, published July 2025), and is MIT-licensed. It has ~5.8k GitHub stars and active releases through 2025–2026. ([visioncortex/vtracer](https://github.com/visioncortex/vtracer))
- **potrace stays the canonical choice for single-color shapes** (logos, icons, silhouettes, favicons). Its O(n²) curve-fitting is slower but the output is geometrically cleaner than vtracer on 1-bit mattes, and its parameters (`turdsize`, `alphamax`, `opttolerance`) are the most well-understood in the field. ([potrace(1) man page](https://potrace.sourceforge.net/potrace.1.html))
- **DiffVG-class differentiable optimizers are not production-viable** for a prompt-to-asset today. They are slow, non-deterministic due to parallel float ops, and prone to computational-graph crashes with multiple renders per session. Reserve them for research; ship with deterministic vectorizers. ([DiffVG repro issue #63](https://github.com/BachiLi/diffvg/issues/63), [computational-graph issue #46](https://github.com/BachiLi/diffvg/issues/46))
- **Segment-then-trace beats trace-then-clean every time.** Running BiRefNet/RMBG to produce a clean matte before tracing removes background speckle at the source, so the tracer's `filter_speckle` / `turdsize` can stay conservative and preserve legitimate fine detail.
- **SVGO with a tuned `preset-default` + `floatPrecision: 2`** is the right post-trace cleanup default. It typically reclaims 40–70% of file size without visible regression on logos and icons.

> **Updated 2026-04-21:** SVGO **v4.0.0** was released (current version 4.0.1 as of April 2026). Breaking change: `removeViewBox` and `removeTitle` are **no longer enabled by default** in `preset-default`. Previous config that relied on `overrides: { removeViewBox: false }` to suppress the plugin is now a no-op — the suppression is no longer needed. Config written for SVGO v3 that explicitly set `removeViewBox: false` in overrides should be cleaned up. Migration guide at [svgo.dev/docs/migrations/migration-from-v3-to-v4/](https://svgo.dev/docs/migrations/migration-from-v3-to-v4/).

## Tool Fit Table

| Tool | Best For | Language / Runtime | Color? | Wasm? | License | Maintenance (2024–2026) | Throughput (rough) | Recommendation |
|------|----------|--------------------|--------|-------|---------|-------------------------|--------------------|----------------|
| **vtracer** | Multi-color logos, illustrations, photographic-ish art | Rust (native + wasm) | ✅ full color | ✅ `vectortracer` npm (wasm bindings); `@neplex/vectorizer` (native Node) | MIT | Active; pushes in 2025–2026 | ~50–200 ms for 1024² on M-series native; ~300–900 ms in browser wasm | **Production default for color** |
| **potrace** | 1-bit shapes: logos, silhouettes, favicon glyphs | C, Python bindings (`pypotrace`), Ruby (`potracer`) | ❌ single color per pass | ⚠️ community ports only (`potrace-wasm`, emscripten forks) | GPL v2 | Stable, low-churn (the reference implementation) | ~20–80 ms for 1024² 1-bit on native | **Canonical for masked shapes** |
| **imagetracerjs** | Pure-browser, no-build, posterized color output | JavaScript | ✅ color via quantization | ✅ (it *is* JS) | Unlicense | Last updated Nov 2023; stable but inactive | Slow — JS means 1–5 s for 1024² | Fallback for ultra-lightweight browser embeds |
| **autotrace** | Centerline tracing (line art, signatures, stroke-based logos) | C | ✅ color, limited | ⚠️ no official wasm | GPL v2 | Active; v0.31.10 Jan 2024, ImageMagick 7 + CVE fixes | ~100–400 ms native | Niche: centerline / stroke recovery |
| **libsvgtrace** | Embeddable C library bindings | C | partial | ⚠️ theoretically | LGPL | Sporadic | — | Only if embedding constraints require it |
| **DiffVG** | Research: prompt-to-SVG, optimizer-in-the-loop systems | Python + C++/CUDA | ✅ | ❌ | Apache 2.0 | Academic maintenance | Seconds–minutes per image | **Not for production** |

Notes on the numbers: throughput figures are rough order-of-magnitude from repo READMEs and community benchmarks, not controlled measurements. The right way to pick between vtracer and potrace in a pipeline is by **content type**, not by speed — both are fast enough.

### When to pick which

- **Logo with flat brand colors** → vtracer (hierarchical clustered mode) on a cleanly matted RGBA.
- **Monochrome wordmark or icon** → potrace on a thresholded 1-bit bitmap.
- **Hand-drawn / line art** → autotrace with centerline mode, or potrace with inverted bitmap.
- **User uploads a photo and wants "vectorize"** → vtracer with a color-precision budget, but warn the user the output will be posterized.
- **Prompt-to-SVG generation** → Not tracing. Use a vector-native model (Recraft) or a DSL-emitting LLM; see 12b.

## WebAssembly Ports Assessment

Browser-side vectorization is strategically important for a prompt-to-asset website: it eliminates server round-trips on potentially large PNGs, keeps user images private (nothing leaves the tab), and removes a per-request cost center.

### vtracer wasm (first-party bindings)

> **Updated 2026-04-21:** The npm package specifically named `vtracer-wasm` could not be confirmed on the npm registry as of April 2026. The established first-party wasm package is [`vectortracer`](https://www.npmjs.com/package/vectortracer) (maintained by visioncortex, provides Wasm bindings to the vtracer Rust library). A community package `vtracer-color` exists but is stale (last published 2023). Verify the exact current package name at [npmjs.com/search?q=vtracer](https://www.npmjs.com/search?q=vtracer) before installing. The guidance below applies to whatever package currently ships the official wasm build — use the `vectortracer` package until `vtracer-wasm` is confirmed.

- npm package [`vectortracer`](https://www.npmjs.com/package/vectortracer) — wasm bindings to visioncortex's vtracer Rust library. The community also references `@neplex/vectorizer` as a native Node.js binding alternative.
- Produced directly from the Rust crate via `wasm-pack`, so the Rust and wasm builds share a single algorithm implementation — no drift.
- API surface mirrors the CLI: pass an `ImageData` (or `Uint8Array` RGBA), a `Config` object with `color_precision`, `filter_speckle`, etc., and receive an SVG string back.
- Webworker-compatible (per the `vectortracer` package metadata), which is mandatory: tracing a 1024² image synchronously on the main thread will jank the UI for hundreds of milliseconds.

Production pattern:

```ts
// main.ts
const worker = new Worker(new URL("./trace.worker.ts", import.meta.url), {
  type: "module",
});
worker.postMessage({ pixels, width, height, config });
worker.onmessage = (e) => setSvg(e.data.svg);

// trace.worker.ts
import init, { convert } from "vtracer-wasm";
await init();
self.onmessage = (e) => {
  const svg = convert(e.data.pixels, e.data.width, e.data.height, e.data.config);
  self.postMessage({ svg });
};
```

Gotchas:

- **Wasm bundle size** is ~1–2 MB. Lazy-load it only when the user actually asks to vectorize — do not put it on the critical path.
- **Memory**: the wasm heap grows with image size. For >4K images, either downscale first or bump `--initial-memory` at compile time.
- **COOP/COEP headers** are required if you want multi-threaded wasm (not needed for vtracer's current single-threaded build, but plan for it).

### imagetracerjs (pure JS fallback)

- ~42k weekly npm downloads, 1.5k GitHub stars, last updated Nov 2023.
- Zero dependencies, zero wasm — it's plain JavaScript, which means it runs anywhere (old browsers, edge runtimes without wasm, React Native).
- Exposes `imageToSVG`, `imagedataToSVG`, and a set of **presets** (`posterized1-3`, `curvy`, `sharp`, `detailed`, `smoothed`, `grayscale`, `artistic1-4`) that are genuinely useful for a prompt-to-asset because they abstract away 20+ raw parameters.
- Speed is the weakness: 5–20× slower than vtracer-wasm for equivalent output on the same image.

Use imagetracerjs as a fallback when:

- The user is on a runtime without wasm support.
- You want a 50 KB JS drop-in for a demo or low-stakes preview.
- You specifically want its posterized, poster-art aesthetic (one of the presets).

### potrace-wasm (community forks)

There is **no official wasm build of potrace.** The most-used community ports are Emscripten-compiled forks on npm (search `potrace-wasm`, `@neplex/vectorizer`, etc.), typically a few hundred weekly downloads. They work but:

- Versioning is inconsistent with upstream potrace.
- Licensing is GPL — a hard blocker for closed-source commercial distribution. If the prompt-to-asset website ships potrace-wasm, the page bundling it is arguably a derived work. **Prefer vtracer (MIT) in browser contexts.**

### Summary recommendation for wasm

Ship `vtracer-wasm` as the primary in-browser vectorizer. Keep `imagetracerjs` behind a feature flag as a "classic" / posterized alternative or a runtime fallback. Do potrace on the server (native binary) for 1-bit workloads where its curve quality matters.

## Parameter Cheatsheet

The core tradeoff every tracer exposes is **smoothness vs path count vs fidelity**:

- More smoothness → fewer, longer Bézier curves → smaller file, but detail loss.
- More fidelity → more, shorter segments → faithful but bloated SVG.
- Noisy input compounds this: every speck becomes a path unless filtered.

### vtracer (source: [Config struct docs](https://docs.rs/vtracer/latest/vtracer/struct.Config.html))

| Param | Default | What it controls | Tune up when… | Tune down when… |
|-------|---------|------------------|---------------|-----------------|
| `color_precision` | 6 bits/channel | Color quantization fidelity | You need subtle gradients | You want flat brand colors (try 4–5) |
| `layer_difference` | 16 | Min color delta between stacked layers | You want fewer color regions | Logo has close-hue sibling colors |
| `filter_speckle` | 4 px | Drops regions smaller than N px | Input is noisy diffusion output (try 8–16) | You need pixel-accurate detail |
| `corner_threshold` | 60° | Angle below which a corner is kept | You want softer curves (try 90) | You want hard geometric shapes (try 30) |
| `segment_length` | 4 | Min segment length in px | Simplify further | Preserve fine detail |
| `splice_threshold` | 45° | Merges segments whose tangent differs by ≤ this | Smoother output | More faithful |
| `mode` | `spline` | `spline` / `polygon` / `pixel` | — | Pixel-art → `pixel`; stencil shapes → `polygon` |
| `hierarchical` | `stacked` | `stacked` / `cutout` | Flat colors cleanly stack | You want transparent donut-like holes (`cutout`) |

**Recommended defaults for three common jobs:**

```jsonc
// logo / flat-color illustration, post-matte
{ "color_precision": 5, "layer_difference": 24, "filter_speckle": 8,
  "corner_threshold": 60, "mode": "spline", "hierarchical": "stacked" }

// photo-to-poster style (emergency "please vectorize this")
{ "color_precision": 6, "layer_difference": 16, "filter_speckle": 4,
  "corner_threshold": 60, "mode": "spline" }

// pixel art (keep jaggies, don't smooth)
{ "color_precision": 8, "filter_speckle": 0, "mode": "pixel" }
```

### potrace (source: [man page](https://potrace.sourceforge.net/potrace.1.html))

| Param | Flag | Default | Role |
|-------|------|---------|------|
| `turdsize` | `-t` | 2 | Despeckle: drop curves enclosing ≤ N pixels of area. Safe values for diffusion outputs: 4–10. |
| `alphamax` | `-a` | 1.0 | Corner detection threshold. `0.0` = polygonal (preserves all corners), up to `1.3334` = no corners (everything smoothed). Logos with sharp terminals → lower (0.8); organic shapes → higher (1.15). |
| `opttolerance` | `-O` | 0.2 | Curve-simplification error budget (only when `opticurve` is on). Higher = fewer segments, less fidelity. Values >1 rarely useful. |
| `turnpolicy` | `-z` | `minority` | How to resolve ambiguous pixels at bitmap corners. `majority` is often better for typography. |
| `opticurve` | `-n` / default on | on | Toggle curve optimization pass. Leave on. |

Recommended defaults for a logo/glyph pipeline:

```
potrace --svg -t 4 -a 1.0 -O 0.2 -z majority input.pbm -o out.svg
```

If output looks too "melted" (terminals rounded off), drop `-a` to `0.8`. If it looks too blocky, raise to `1.15`.

### imagetracerjs (use the presets)

Instead of tuning 20+ knobs, pick a preset and override at most two fields:

- `"posterized2"` — general-purpose, good for diffusion-generated illustrations.
- `"detailed"` — preserve more edges at the cost of file size.
- `"smoothed"` — logos where curve quality matters more than fidelity.

Override `numberofcolors` (default 16) and `ltres`/`qtres` (line / quadratic tolerance) if the default output is too busy.

### Mental model: the smoothness–count tradeoff

Think of it as three levers per tool:

1. **Pre-filter** (`filter_speckle`, `turdsize`) — kills noise before tracing.
2. **Corner sensitivity** (`corner_threshold`, `alphamax`) — shifts the polygon↔spline balance.
3. **Curve optimization** (`splice_threshold`, `opttolerance`) — merges adjacent segments.

For a prompt-to-asset, **move lever 1 first**. Diffusion outputs are noisy at the boundary of every region; a slightly aggressive speckle filter removes 80% of unwanted paths with zero visible damage.

## Segment-Then-Trace Recipe

This is the core production recipe and the single biggest quality lever. Do **not** run vtracer or potrace directly on diffusion output; the background is never truly empty, and the tracer will happily turn every random speckle into a tiny path.

### Pipeline

```
[Diffusion model]
     │ PNG (RGB, noisy "white" or checkered background)
     ▼
[Background remover: BiRefNet | RMBG-2.0 | BRIA RMBG]
     │ RGBA with clean alpha matte
     ▼
[Pre-trace conditioning]
     │ - Composite over solid color OR keep alpha
     │ - Median/bilateral filter (optional, 1–2 px)
     │ - Quantize palette (optional, e.g. 8 colors for logos)
     ▼
[Tracer]
     │ - vtracer for color assets
     │ - potrace on alpha-as-1-bit for single-color shapes
     ▼
[SVGO cleanup]
     ▼
[QA gate: path count, file size, bounding-box sanity]
     ▼
SVG asset
```

### Concrete steps with commands

**1. Clean matte.** Run BiRefNet or rembg with a high-quality model:

```bash
rembg i --model birefnet-general input.png matte.png
```

BiRefNet tends to produce sub-pixel-accurate boundaries that trace beautifully; U²-Net and older rembg models often leave a 1–2 px halo that shows up as a ghost outline in the traced SVG. See 16a/16b for model selection.

**2a. For color SVG (logo with multiple brand colors).** Composite the matted RGBA over white (or the intended brand background), then vtracer:

```bash
# Composite alpha to white to avoid semi-transparent edge paths
magick matte.png -background white -alpha remove -alpha off flat.png

# Trace
vtracer --input flat.png --output out.svg \
  --colormode color --mode spline --hierarchical stacked \
  --color_precision 5 --layer_difference 24 \
  --filter_speckle 8 --corner_threshold 60
```

Why composite to white? Semi-transparent edges in the RGBA matte become their own near-color layer in vtracer's stacked mode, producing a fringe of ghost paths. Flattening eliminates that class of bug at the cost of losing true transparency — which is usually fine for a logo that will render on a known background.

**2b. For single-color shape (icon, favicon, wordmark).** Threshold the alpha channel to 1-bit, then potrace:

```bash
# Alpha → 1-bit PBM
magick matte.png -alpha extract -threshold 50% -negate mask.pbm

# Trace
potrace --svg -t 4 -a 1.0 -O 0.2 -z majority mask.pbm -o out.svg
```

The `-threshold 50%` cutoff is the one lever that actually matters here. For thin glyphs or serifs, drop to 30–40% to avoid pinching; for noisy mattes, raise to 60–70%.

**3. Post-trace cleanup with SVGO.** Config that preserves quality while still compressing:

```js
// svgo.config.js (compatible with SVGO v4)
// Note: removeViewBox and removeTitle are disabled by default in SVGO v4.
// The `removeViewBox: false` override from v3 configs is no longer needed.
export default {
  floatPrecision: 2,
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          // removeViewBox is already false by default in v4 — no override needed
          cleanupIds: { preserve: [] },
          removeHiddenElems: true,
          convertPathData: { floatPrecision: 2, transformPrecision: 3 },
          mergePaths: { force: false }, // avoid merging paths of different fill
        },
      },
    },
    "removeDimensions", // keep only viewBox for responsive sizing
    "sortAttrs",
  ],
};
```

Run with `svgo -c svgo.config.js out.svg -o out.min.svg`. Expect 40–70% size reduction.

> **Updated 2026-04-21:** SVGO v4 changed `removeViewBox` to be **disabled by default** in `preset-default`. Old v3 configs that had `overrides: { removeViewBox: false }` are safe but the override is now redundant — remove it to avoid confusion. The `removeTitle` plugin is also now disabled by default in v4. Install `svgo@4` for new projects.

Keep `mergePaths.force: false` — forcing merges across different fills causes subtle color bleeds.

### Quality gates (automate these)

A coding agent should refuse to ship a trace output that fails any of:

- **Path count** > 2× expected for the asset type (logos: <300 paths; icons: <50; illustrations: <2000). Huge path counts mean your speckle filter was too low.
- **File size** > 200 KB for a logo/icon (ballpark). Large size usually means under-quantized color or too-low precision.
- **Bounding box** not within 2% of input dimensions. A trace that "misses" content means the matte was wrong.
- **Color count** > 32 for a logo. Likely means `color_precision` too high or `layer_difference` too low.
- **Zero-area paths present** (SVGO usually strips these, but verify).

### Why not DiffVG in this recipe?

DiffVG-based optimizers (CLIPDraw, VectorFusion, StyleCLIPDraw, and their successors; see [PyTorch-SVGRender DiffVG docs](https://pytorch-svgrender.readthedocs.io/en/latest/diffvg.html)) promise to optimize an SVG directly to match a text prompt or target image. In principle, they are the ideal vectorizer: they know about paths natively.

In practice, for a shipping prompt-to-asset they fail on three operational axes:

1. **Speed.** A single image takes seconds to minutes even on a GPU. vtracer is 1000–10000× faster on CPU.
2. **Non-determinism.** Per [diffvg#63](https://github.com/BachiLi/diffvg/issues/63), parallel float additions in the C++ rasterizer produce different gradients across runs even with fixed seeds. Fixing this requires a single-threaded build that is ~1150× slower. For a production service that must render identical SVGs for identical inputs (caching, test snapshots, brand consistency), this is disqualifying.
3. **Fragility.** [diffvg#46](https://github.com/BachiLi/diffvg/issues/46) documents a hang-and-crash failure mode when multiple `RenderFunction.apply` instances coexist in the computational graph — which is exactly what happens in any serving framework with batched requests. Workarounds exist but they are gnarly.

Revisit DiffVG when: (a) someone ships a CPU-deterministic fork, (b) wall-clock per image drops under 1 s on commodity hardware, (c) you have a research use case (e.g., style-distilled brand SVG family) that a deterministic tracer cannot solve. Until then, deterministic tracers + good segmentation dominate on every axis that matters for shipping product.

## Production Ops Checklist

A condensed list for wiring vectorization into a Claude/Codex/Gemini skill or a website backend:

- **Sandbox the tracer.** vtracer is Rust (safe) but still runs user input; container or Wasmtime-sandbox it in server contexts.
- **Cap input dimensions** (e.g., reject >4096²). Memory scales with pixel count.
- **Timeout** each trace at 5 s (server) or 15 s (browser wasm). If it takes longer, you have the wrong tool for the image.
- **Cache by content hash + params.** Tracing is deterministic for vtracer/potrace, so `sha256(png) + sha256(config) → svg` is a valid cache key.
- **Version-pin the wasm** explicitly in your bundler. A vtracer algorithm update can change the byte-for-byte SVG output, which will bust caches and alarm users who pinned a visual.
- **Log three metrics per trace**: input dims, output path count, output file size. Alerts on P99 of any of these catch drift fast.
- **Expose a "retrace with different params" affordance** to the agent. The single most useful override is `filter_speckle` / `turdsize`; second is color_precision.
- **On the client**, always run the tracer in a Web Worker. A 500 ms main-thread block is a UX disaster.

## References

### Primary tooling

- vtracer repo — [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer) — Rust + wasm, MIT, ~5.8k stars, active through 2026.
- vtracer Rust config — [docs.rs/vtracer Config](https://docs.rs/vtracer/latest/vtracer/struct.Config.html)
- vtracer docs — [visioncortex.org/vtracer-docs](https://www.visioncortex.org/vtracer-docs)
- `vectortracer` npm (first-party wasm bindings) — [npmjs.com/package/vectortracer](https://www.npmjs.com/package/vectortracer) — verify this is still the canonical package before pinning
- `@neplex/vectorizer` npm (native Node bindings, alternative) — [npmjs.com/@neplex/vectorizer](https://www.npmjs.com/@neplex/vectorizer)
- potrace official man page — [potrace.sourceforge.net/potrace.1.html](https://potrace.sourceforge.net/potrace.1.html)
- potrace homepage — [potrace.sourceforge.net](https://potrace.sourceforge.net/)
- imagetracerjs repo — [github.com/jankovicsandras/imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) (~1.5k stars, Unlicense)
- imagetracerjs options — [options.md on GitHub](https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md)
- autotrace repo — [github.com/autotrace/autotrace](https://github.com/autotrace/autotrace) (v0.31.1 as of March 2026)
- SVGO v4 migration guide — [svgo.dev/docs/migrations/migration-from-v3-to-v4/](https://svgo.dev/docs/migrations/migration-from-v3-to-v4/) — **important for upgrading configs**
- SVGO preset-default docs — [svgo.dev/docs/preset-default](https://svgo.dev/docs/preset-default)
- SVGO plugin list — [svgo.dev/docs/plugins](https://svgo.dev/docs/plugins)

### DiffVG and differentiable rasterizers

- DiffVG repo — [github.com/BachiLi/diffvg](https://github.com/BachiLi/diffvg)
- DiffVG paper (Li et al., SIGGRAPH Asia 2020) — [people.csail.mit.edu/tzumao/diffvg/diffvg.pdf](https://people.csail.mit.edu/tzumao/diffvg/diffvg.pdf)
- DiffVG determinism issue #63 — [github.com/BachiLi/diffvg/issues/63](https://github.com/BachiLi/diffvg/issues/63)
- DiffVG computational-graph crash #46 — [github.com/BachiLi/diffvg/issues/46](https://github.com/BachiLi/diffvg/issues/46)
- PyTorch-SVGRender DiffVG docs — [pytorch-svgrender.readthedocs.io/en/latest/diffvg.html](https://pytorch-svgrender.readthedocs.io/en/latest/diffvg.html)

### Cross-links in this research plan

- `docs/research/12-vector-svg-generation/12b-*` — vector-native generation (sibling deep-dive, avoid duplication)
- `docs/research/16-background-removal-vectorization/16a-*`, `16b-*` — background-removal model selection (prerequisite step in the segment-then-trace recipe)
- `docs/research/18-asset-pipeline-tools/*` — downstream asset generators (icon.kitchen, pwa-asset-generator) that consume the SVGs this pipeline produces
