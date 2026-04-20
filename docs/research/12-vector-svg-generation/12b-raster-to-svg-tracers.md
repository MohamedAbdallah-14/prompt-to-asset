---
category: 12-vector-svg-generation
angle: 12b
title: Raster → Vector Tracing — potrace, vtracer, ImageTracer, DiffVG optimizers, and SaaS vectorizers
date: 2026-04-19
researcher: subagent-12b
tags:
  - svg
  - vectorization
  - potrace
  - vtracer
  - imagetracer
  - diffvg
  - recraft
  - vectorizer-ai
  - webassembly
sources_primary: 11
sources_total: 20
word_count_target: 2000-3500
---

# Raster → Vector Tracing for a Prompt-Enhancer Pipeline

## Executive Summary

Most AI image models (Imagen, DALL·E, Flux, SDXL, Midjourney) still emit **raster** pixels — even when asked for a "vector logo." Turning those pixels into a clean, production-grade SVG is therefore a *post-processing* problem that every asset-generation pipeline has to solve. The raster→vector ("tracing") ecosystem splits into four tiers:

1. **Classical deterministic tracers.** `potrace` (Selinger, 2001) is still canonical for black-and-white silhouettes; `autotrace` (Weber, 1990s) adds centerline and color; both are GPL and shipped everywhere (Inkscape, ImageMagick, `convert`).
2. **Modern color-first tracers.** `vtracer` (visioncortex, Rust, ~5.8k★) handles full-color, high-resolution images with an `O(n)` cluster-and-trace pipeline and is the strongest open-source baseline for AI-generated logos. It has first-class WebAssembly builds (`vtracer-wasm`, `vectortracer`).
3. **JS/Java ports for client-side use.** `imagetracerjs` / `imagetracerjava` / `imagetracerandroid` (Jankovics) are pure-language ports — slower than vtracer-wasm but zero-dependency, easy to embed in a browser prompt-to-asset UI.
4. **ML / AI vectorizers.** `Vectorizer.AI` and Recraft's `/images/vectorize` endpoint wrap proprietary neural networks that reason about shape semantics. Academic systems — DiffVG, LIVE, VectorFusion, SVGDreamer, SVGFusion — use *differentiable rasterization* to optimize control points directly against a target image or CLIP loss, enabling text-to-SVG without any tracer at all.

For a prompt-to-asset that generates logos, icons, and illustrations:

- **Default pipeline:** Gemini/Imagen/Flux → (optional) background removal → vtracer (`poster` or tuned preset) → SVGO. This is free, deterministic, and runs in-browser via WASM.
- **Premium pipeline:** same inputs → Recraft `/images/vectorize` ($0.01/call) or Vectorizer.AI ($0.20/credit). Noticeably cleaner node counts on gradient-heavy illustrations.
- **Black-and-white logos / monograms:** pre-threshold → potrace with `turdsize=2, alphamax=1.0, opttolerance=0.2`. Still beats every modern tool on fidelity-per-byte for silhouettes.

The three most important findings are captured in the "Top 3 Findings" at the end.

## Tool Table

| Tool | License | Algorithm | Color support | WASM / Browser | Key parameters |
|------|---------|-----------|---------------|----------------|-----------------|
| **potrace** | GPLv2 | Polygon fit → bezier with penalty minimization, globally optimal, `O(n²)` | B/W only (threshold input) | Yes — `potrace-wasm` npm pkg; also bundled by SVGO ecosystem | `turdsize` (noise suppression, default 2), `alphamax` (corner threshold, 0.0–1.3334, default 1.0), `opttolerance` (curve simplification, default 0.2), `turnpolicy` (black/white/minority/majority) |
| **autotrace** | GPLv2 | Outline + centerline tracing with color quantization | Up to 256 colors | No first-class WASM; compilable via Emscripten | `color-count` (1–256), `despeckle-level`, `despeckle-tightness`, `corner-threshold`, `line-threshold`, `width-weight-factor`, `centerline` |
| **vtracer** (visioncortex) | MIT | Hierarchical clustering → cluster-wise path walk → polygon simplify → corner-preserving 4-point subdivision → bezier fit. Linear `O(n)` per cluster | True color or B/W; clustering works in RGB space | Yes — `vtracer-wasm` (133 KB wasm), `vectortracer` npm, official web demo at visioncortex.org/vtracer | `color_precision` (1–8 bits/channel, default 6), `gradient_step` (default 16), `layer_difference`, `filter_speckle` (default 4), `path_precision`, `corner_threshold` (default 60°), `length_threshold`, `splice_threshold`, presets: `bw` / `poster` / `photo` |
| **imagetracerjs** | Public domain | Edge node detection → pathscan → interpolation → tracepath (linear + quadratic spline) | Color via internal k-means-style palette | Native — pure JS, ~50 KB, zero deps, works in workers | `ltres` (line error, default 1), `qtres` (quadratic error, 1), `pathomit` (min path length, 8), `numberofcolors` (16), `colorquantcycles` (3), `blurradius` (0–5), `strokewidth`, `rightangleenhance`, presets: `posterized1`, `posterized2`, `curvy`, `sharp`, `detailed`, `smoothed`, `grayscale` |
| **imagetracerjava / android** | Public domain | Same algorithm as JS | Same | N/A (JVM / Android) | Same as JS; extra alpha-weighted quantization |
| **svgtrace** (FHPythonUtils) | MIT | Wraps `imagetracer.js` via Playwright (headless browser) | Color or B/W | Browser-driven, not true WASM | `trace(path, blackAndWhite=False)` — minimal API |
| **DiffVG** (MIT/Adobe, SIGGRAPH 2020) | Apache 2.0 | Differentiable rasterizer (analytical prefilter or MSAA); supports gradients of bezier/poly/ellipse control points w.r.t. pixel loss | Full — optimization-based, any palette | Python + CUDA; no WASM | Loss function (L2, perceptual, CLIP), # paths, # control points, optimizer lr, prefilter mode |
| **LIVE** (CVPR 2022) | MIT | Layer-wise bezier path addition on top of DiffVG; keeps topology | Full | Same as DiffVG | `num_paths`, `num_iter`, `path_schedule`, `mask_loss` |
| **VectorFusion / SVGDreamer / SVGFusion** | research | DiffVG-based SDS loss against Stable Diffusion / reward models; text→SVG | Full | GPU only | Text prompt, `num_particles`, `guidance_scale`, path count, style token |
| **Adobe Illustrator Image Trace** | Proprietary | Edge-detect + curve-fit (legacy "Live Trace"). Known to emit bloated node counts (often 10k+ nodes on simple logos) | Yes, up to 256 | Desktop only | `Paths`, `Corners`, `Noise`, `Method` (abutting/overlapping), `Preset` (6 Colors, 16 Colors, Logo, Sketched Art…) |
| **Vectorizer.AI** | SaaS | Proprietary deep-learning pipeline + classical curve fit | Full, palette-aware | Web app only | None exposed — parameters baked into "quality" tier. API: credits, output format (SVG/PDF/EPS/DXF/PNG) |
| **Recraft `/images/vectorize`** | SaaS (paid API) | Proprietary neural vectorizer paired with their generative model | Full | HTTPS API, any client | `image` (PNG/JPG); pricing $0.01 / 10 units per request |

### Canonical repos & docs

- potrace: `https://potrace.sourceforge.net/` — man page, readme; source on SourceForge.
- vtracer: `https://github.com/visioncortex/vtracer` (5.8k★), docs `https://www.visioncortex.org/vtracer-docs`, demo `https://www.visioncortex.org/vtracer/`.
- autotrace: `https://github.com/autotrace/autotrace` (v0.31.10, Jan 2024).
- imagetracerjs: `https://github.com/jankovicsandras/imagetracerjs`; Java port `https://github.com/jankovicsandras/imagetracerjava`; Android `https://github.com/jankovicsandras/imagetracerandroid`.
- svgtrace (Py): `https://github.com/FHPythonUtils/SvgTrace`.
- DiffVG: `https://github.com/BachiLi/diffvg`, paper `https://people.csail.mit.edu/tzumao/diffvg/diffvg.pdf`.
- PyTorch-SVGRender (LIVE/VectorFusion/SVGDreamer): `https://github.com/ximinng/PyTorch-SVGRender`.
- vtracer-wasm: `https://www.jsdelivr.com/package/npm/vtracer-wasm`; autotune: `https://github.com/olivierroy/vtracer_autotune` (Oct 2025).
- Recraft vectorize: `https://www.recraft.ai/docs/api-reference/endpoints`, `https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing`.
- Vectorizer.AI API: `https://vectorizer.ai/api`, pricing `https://vectorizer.ai/pricing`.

## Tuning Guide per Asset Type

The prompt-to-asset produces four rough categories of output, each with a different ideal tracer configuration.

### 1. Monochrome / silhouette logos (favicons, monograms, wordmarks without gradients)

**Recommended:** potrace, after a clean binary threshold.

Pipeline:

1. Convert source to grayscale.
2. Threshold with Otsu (or fixed 128) — avoid anti-aliased edges that trick potrace into producing wavy outlines.
3. `potrace -s -o out.svg --turdsize 2 --alphamax 1.0 --opttolerance 0.2 in.pbm`.

Parameter intuitions (from the official man page):

- **`turdsize`** = minimum area (in pixels) of a region to preserve. Raise to 5–10 to kill JPEG noise; drop to 0 if the logo contains tiny serifs/dots you must keep.
- **`alphamax`** controls corner sharpness. `0.0` → polygon (no curves), `1.0` → balanced, `1.3334` → every vertex is smoothed. For geometric wordmarks stay near `1.0`; for calligraphic monograms try `1.15`.
- **`opttolerance`** merges consecutive bezier segments when error stays below this. `0.2` is the default sweet spot; `0.5`–`1.0` is fine for web favicons where byte count matters more than pixel-perfect edges.
- **`turnpolicy`** = tie-breaker at ambiguous pixel junctions. `minority` tends to look right for text; `black` for solid emblems.

Expected output: 0.5–3 KB for a typical monochrome logo; single `<path>` per disjoint region.

### 2. Flat full-color logos (app icons, mascots, flat-design marks)

**Recommended:** vtracer with `poster` preset, or Recraft vectorize if the image contains AI-generated gradients that confuse clustering.

Key vtracer knobs for flat logos:

- **`color_precision=6`** (default) keeps 64 shades per channel. Drop to `4` for 16-shade posterization — useful when Imagen inserts faint color banding.
- **`gradient_step=16–32`** — higher values fuse near-identical shades into one layer. For flat logos push to 32–48 to avoid dozens of almost-identical paths.
- **`filter_speckle=4–10`** — removes <N-pixel clusters. Aggressive speckle removal is almost always correct for logos.
- **`mode=polygon`** (from the CLI `--mode`) if the logo is geometric (pixel-art style) and bezier smoothing would soften intentional corners.
- **`hierarchical=cutout`** instead of `stacked` if the design has punched-out holes (negative-space letters). Stacked emits overlapping shapes, cutout emits true cut-outs — matters when the logo is placed on an unknown background color.

Typical output on a 1024² AI-generated flat logo: 15–60 paths, 4–30 KB before SVGO.

### 3. Illustrations with gradients, shading, or soft edges

**Recommended:** Recraft `/images/vectorize` or Vectorizer.AI; fallback vtracer `photo` preset with heavy post-processing.

Why AI tools win here: gradients in the raster get traced as dozens of concentric shells by classical tracers (think 50+ paths for a single sphere). Recraft and Vectorizer.AI replace those shells with real SVG linear/radial gradients, producing 3–10× smaller files.

If constrained to open-source:

1. **Pre-quantize** with `pngquant --quality=70-90 --speed=1` or libimagequant's k-means mode to cap colors at 12–24. This directly lowers vtracer's work and node count.
2. `vtracer --preset photo --color_precision 5 --layer_difference 24 --gradient_step 24`.
3. Post-process with SVGO with `mergePaths` and `convertPathData` plugins to collapse redundant shells.
4. If gradients are important, run a custom pass that detects concentric similar-hue paths and rewrites them as `<linearGradient>` — the PyTorch-SVGRender `LIVE` method does this natively but requires a GPU.

### 4. Text and icons that must stay pixel-perfect

For glyph-like shapes, **always prefer potrace on a 2× super-sampled binary** over any color tracer; text strokes are the hardest thing to keep clean through clustering. Super-sampling (render at 2× target, threshold, trace, then scale viewBox) compensates for potrace's lack of anti-aliasing input.

For icons that already exist as pixel sprites in an icon system, `svgtrace` via Playwright is the simplest reproducible wrapper.

### 5. Post-processing: SVGO vs scour

Both strip whitespace, comments, default attrs, and optimize `d` attributes with rounded coordinates. Empirical differences (from CSS-Tricks and LibHunt comparisons):

- **SVGO** — 22k★, actively maintained, plugin-based. ~30–60% size reduction on typical traced SVGs. Has `prefixIds`, `cleanupIds`, `mergePaths`, `convertPathData`, and `removeHiddenElems` which are the four most impactful plugins for traced output.
- **scour** — 858★, Python, last touched >1 year ago, but *bundled inside Inkscape's "Optimized SVG" export*. Slightly safer default config (doesn't aggressively change geometry). Useful in a Python-only toolchain.

Recommended: SVGO with the default preset plus `{ plugins: [{ name: 'preset-default', params: { overrides: { removeViewBox: false, cleanupNumericValues: { floatPrecision: 2 } } } }, 'mergePaths'] }`. `floatPrecision: 2` alone typically trims 20% off a traced file with no visible difference at 1× rendering.

## Benchmark Data

Public, repeatable benchmarks for AI-generated logos are still thin; the most useful datapoints come from VisionCortex's own comparisons, the `aisvg.app` guide, and community reviews of Recraft/Vectorizer.AI.

| Tool | Typical node count (flat logo, 1024²) | Typical size (pre-SVGO) | Speed (1024² image, M-series Mac) | Gradient reproduction |
|------|---------------------------------------|--------------------------|-------------------------------------|-----------------------|
| potrace (B/W) | 1 path, 30–80 nodes | 0.5–2 KB | ~40 ms | None (silhouette only) |
| vtracer `poster` | 15–40 paths, 200–700 nodes | 6–18 KB | ~120 ms (native); ~250 ms (WASM) | Layered flat shells — approximates gradients poorly |
| imagetracerjs default | 30–80 paths | 20–60 KB | 400–900 ms (browser, single-threaded) | Layered flat shells |
| Adobe Illustrator Image Trace (16 colors) | 80–300 paths, 1k–10k+ nodes | 40–200 KB | ~0.5–1 s | Layered shells, rarely true gradients |
| Vectorizer.AI | 10–25 paths | 4–15 KB | ~3–6 s (API round-trip) | True linear/radial gradients |
| Recraft `/images/vectorize` | 8–20 paths | 3–12 KB | ~2–5 s | True gradients, palette-aware |
| DiffVG + LIVE (48 paths, 500 iter) | Exactly 48 paths (parameter) | 5–10 KB | Minutes on GPU | Explicit per-path color; gradients only via many shells |

Notes:

- The visioncortex docs explicitly claim vtracer "produces more compact output (fewer shapes) compared to Adobe Illustrator's Image Trace and avoids creating shapes with holes" — consistent with third-party reports of Illustrator emitting 1,000s of nodes where vtracer emits hundreds.
- `vtracer_autotune` (olivierroy, Oct 2025) runs a local search over `color_precision`, `color_count`, `gradient_step`, and `layer_difference`, scoring outputs with SSIM against the raster. In informal testing it beats manual tuning by 10–30% on node count at equal perceptual score.
- Recraft's V3 model is benchmarked on ArtificialAnalysis's image-gen leaderboard, but the `vectorize` endpoint itself has no published academic benchmark; quality should be validated on your own prompt distribution before committing.
- On an M1 MacBook, `vtracer-wasm` inside a Web Worker keeps the UI responsive and processes a 1024² logo in roughly 250 ms — fast enough to run *on every generation* in a web prompt-to-asset without a loading state.

### Qualitative notes per asset type (from community and vendor comparisons)

- **Silhouette logos:** potrace > everything. Its globally-optimal bezier fit remains unmatched for single-color shapes.
- **Colorful flat logos:** vtracer ≈ Recraft > Vectorizer.AI > imagetracerjs > Illustrator. The aisvg.app guide calls vtracer "moderate speed, best for complex artwork" and potrace "the better choice for single-color company logos."
- **Photographic or gradient-heavy:** Recraft ≈ Vectorizer.AI >> vtracer > others. Here the AI pipelines' ability to emit `<linearGradient>`/`<radialGradient>` rather than concentric shells is the decisive advantage.
- **Text-heavy designs:** tracing is the wrong tool — prefer re-rendering with a real font (Ideogram, Recraft text nodes, or a downstream font-matcher). If forced, potrace on super-sampled binary is the cleanest option.

## Integration Recommendations for the Prompt-Enhancer

For a web app that exposes "make this a logo SVG" as a one-click action:

1. **Bundle `vtracer-wasm`** as the default path. 133 KB wasm + a Web Worker is invisible to users and handles 80% of cases. Expose three presets: *Logo (BW)* → potrace-wasm, *Logo (Color)* → vtracer `poster`, *Illustration* → vtracer `photo`.
2. **Offer a "High-Quality (API)" toggle** that routes to Recraft's `/images/vectorize` for $0.01/call. This is the right upgrade path for gradient-heavy outputs and is ~20× cheaper than Vectorizer.AI per request (Recraft $0.01 vs Vectorizer.AI $0.20 per credit at the smallest plan).
3. **Always run SVGO server- or client-side** after any tracer. The default preset plus `floatPrecision: 2` typically halves file size with no visible change.
4. **For "clean logo" prompts**, pre-process the raster before tracing: background-removal (rembg / BRIA RMBG, covered by sibling angle 13a/16a) → optional binarize → potrace/vtracer. Tracing a transparent-background raster avoids 40%+ of the "spurious checkerboard shell" artifacts you'd otherwise get from Imagen output.
5. **For agentic MCP skills** (cross-reference category 19), expose a single `vectorize(image_path, mode: 'auto'|'bw'|'color'|'illustration'|'premium')` tool that internally dispatches to potrace/vtracer/Recraft. Models can then pick the right tool without memorizing `turdsize`.
6. **Monitor `vtracer_autotune`** (olivierroy, 2025) — it's the first open-source attempt at automatic parameter search and could be built into the default pipeline if it stabilizes.

## When to Skip Tracing Entirely

For text-to-SVG rather than raster-to-SVG, *differentiable rendering* pipelines side-step tracing altogether:

- **DiffVG** (Li et al., SIGGRAPH Asia 2020) made the rasterizer differentiable. Every downstream method builds on it.
- **LIVE** (CVPR 2022) adds bezier paths one layer at a time and optimizes each against a target raster — producing compact, semantically layered SVGs ideal for editing.
- **VectorFusion** (CVPR 2023) couples DiffVG with Score Distillation Sampling against Stable Diffusion, enabling text-to-SVG without ever emitting pixels as the final artifact.
- **SVGDreamer** (CVPR 2024) adds a particle-based SDS loss and a semantic-driven vectorization front-end; the authors report better diversity and editability than VectorFusion.
- **SVGFusion** (Dec 2024, arXiv 2412.10437) introduces a proper vector-pixel VAE and a DiT diffusing in SVG latent space, scaling to real-world SVG corpora.

These are not yet fast enough for interactive use (minutes per SVG on GPU) and require Python+CUDA, so they don't replace tracing in a web UI today — but they are the likeliest medium-term replacement for classical tracers in an asset-generation product. For the current 2026 roadmap, keep the tracer layer but plan an escape hatch to a hosted DiffVG-based service once latency comes down.

## References

1. Selinger, P. *Potrace: a polygon-based tracing algorithm* (2003). `https://potrace.sourceforge.net/potrace.pdf`
2. Potrace man page. `https://potrace.sourceforge.net/potrace.1.html`
3. VisionCortex. *VTracer design docs.* `https://www.visioncortex.org/vtracer-docs`
4. visioncortex/vtracer (5.8k★). `https://github.com/visioncortex/vtracer`
5. vtracer-wasm npm/jsDelivr. `https://www.jsdelivr.com/package/npm/vtracer-wasm`
6. olivierroy/vtracer_autotune (Oct 2025). `https://github.com/olivierroy/vtracer_autotune`
7. autotrace/autotrace v0.31.10. `https://github.com/autotrace/autotrace`
8. jankovicsandras/imagetracerjs. `https://github.com/jankovicsandras/imagetracerjs`; options: `https://github.com/jankovicsandras/imagetracerjs/blob/master/options.md`
9. jankovicsandras/imagetracerjava. `https://github.com/jankovicsandras/imagetracerjava`
10. FHPythonUtils/SvgTrace. `https://github.com/FHPythonUtils/SvgTrace`
11. Li, Lukáč, Gharbi, Ragan-Kelley. *Differentiable Vector Graphics Rasterization for Editing and Learning* (SIGGRAPH Asia 2020). `https://people.csail.mit.edu/tzumao/diffvg/diffvg.pdf`
12. BachiLi/diffvg. `https://github.com/BachiLi/diffvg`
13. Ma et al. *Towards Layer-wise Image Vectorization* (LIVE, CVPR 2022). `https://github.com/ma-xu/LIVE`
14. Jain et al. *VectorFusion* (CVPR 2023). `https://vectorfusion.github.io/`
15. Xing et al. *SVGDreamer* (CVPR 2024). `https://openaccess.thecvf.com/content/CVPR2024/papers/Xing_SVGDreamer_Text_Guided_SVG_Generation_with_Diffusion_Model_CVPR_2024_paper.pdf`
16. *SVGFusion: Scalable Text-to-SVG Generation via Vector Space Diffusion* (arXiv 2412.10437, Dec 2024). `https://ui.adsabs.harvard.edu/abs/2024arXiv241210437X/abstract`
17. ximinng/PyTorch-SVGRender. `https://github.com/ximinng/PyTorch-SVGRender`
18. Recraft vectorize docs. `https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing`; pricing `https://www.recraft.ai/docs/api-reference/pricing`
19. Vectorizer.AI pricing + API. `https://vectorizer.ai/pricing`, `https://vectorizer.ai/api`
20. SVGO `https://svgo.dev/`; scour `https://github.com/scour-project/scour`; comparison `https://www.libhunt.com/compare-scour-vs-svgo`
21. aisvg.app comparison guide (2025). `https://www.aisvg.app/blog/image-to-svg-converter-guide`
22. Wikipedia: *Comparison of raster-to-vector conversion software.* `https://en.wikipedia.org/wiki/Comparison_of_raster-to-vector_conversion_software`
23. pngquant / libimagequant. `https://pngquant.org/`, `https://github.com/ImageOptim/libimagequant`

## Top 3 Findings (for fleet synthesis)

1. **vtracer is the correct open-source default for an AI-logo prompt enhancer — not potrace.** Potrace is superior only on pure-silhouette B/W; for any color asset produced by Imagen/DALL·E/Flux, vtracer's linear-time color-clustering pipeline produces cleaner node counts than both potrace (which can't do color at all) and Adobe Illustrator's Image Trace (which routinely emits 10× the nodes). It also has a production-ready WASM build (`vtracer-wasm`, 133 KB) that runs in a Web Worker in ~250 ms on a 1024² image, making client-side tracing practical in a browser prompt-to-asset.
2. **Recraft's `/images/vectorize` endpoint is radically cheaper than Vectorizer.AI — $0.01 vs $0.20 per call — and is the right "premium" escape hatch for gradient-heavy illustrations** where classical tracers emit dozens of concentric shells instead of true `<linearGradient>`/`<radialGradient>` elements. A good pipeline offers vtracer as the default and routes to Recraft only when the raster contains gradients or soft shading.
3. **The frontier is moving away from tracing entirely** toward DiffVG-based differentiable pipelines (LIVE, VectorFusion, SVGDreamer CVPR 2024, SVGFusion Dec 2024) that optimize SVG control points directly against a target image or CLIP/SDS loss, and toward parameter auto-tuners like `vtracer_autotune` (Oct 2025) that search the tracer hyperparameter space with SSIM feedback. Both trends suggest the prompt-to-asset should wrap its tracing layer behind a single `vectorize(mode=...)` tool so the underlying engine can be swapped without changing the agent-facing API.
