---
wave: 1
role: niche-discovery
slug: 02-vector-svg-diffusion-oss
title: "Vector-native / SVG-diffusion OSS"
date: 2026-04-19
sources:
  - https://github.com/ximinng/SVGDreamer
  - https://arxiv.org/abs/2312.16476
  - https://ximinng.github.io/SVGDreamer-project/
  - https://github.com/joanrod/star-vector
  - https://starvector.github.io/starvector/
  - https://huggingface.co/starvector/starvector-8b-im2svg
  - https://huggingface.co/starvector
  - https://huggingface.co/spaces/fradav/text2svg-demo-app
  - https://github.com/ximinng/VectorFusion-pytorch
  - https://arxiv.org/abs/2211.11319
  - https://vectorfusion.github.io/
  - https://github.com/BachiLi/diffvg
  - https://people.csail.mit.edu/tzumao/diffvg/
  - https://github.com/preddy5/Im2Vec
  - http://geometry.cs.ucl.ac.uk/projects/2021/im2vec/
  - https://github.com/yael-vinker/live_sketch
  - https://livesketch.github.io/
  - https://arxiv.org/html/2311.13608
  - https://github.com/SagiPolaczek/NeuralSVG
  - https://sagipolaczek.github.io/NeuralSVG/
  - https://arxiv.org/abs/2501.03992
  - https://github.com/yael-vinker/SketchAgent
  - https://yael-vinker.github.io/sketch-agent/
  - https://arxiv.org/abs/2411.17673
  - https://github.com/yael-vinker/CLIPasso
  - https://ximinng.github.io/DiffSketcher-project/
  - https://github.com/kingnobro/IconShop
  - https://arxiv.org/abs/2304.14400
  - https://github.com/OmniSVG/OmniSVG
  - https://arxiv.org/abs/2504.06263
  - https://omnisvg.github.io/
  - https://github.com/visioncortex/vtracer
  - https://github.com/autotrace/autotrace
  - https://potrace.sourceforge.net/
  - https://replicate.com/recraft-ai/recraft-v3-svg
tags: [svg, vector, diffusion, recraft-alternative]
---

# Vector-native / SVG-diffusion OSS — Alternatives to Recraft V3 and Illustroke

Recraft V3 SVG and Illustroke define the closed-source ceiling for "text → editable vector"
output: clean paths, controllable palettes, crisp text where present, and decomposition into
named layers. The open-source world has closed most of that gap since 2023, but the stack is
split across three philosophically different families: **optimization-based**
(DiffVG + Score Distillation), **autoregressive code generation** (StarVector, OmniSVG,
IconShop), and **classical tracing** (potrace, autotrace, vtracer). Each has a different
failure mode, licensing profile, and integration shape for a prompt-enhancement pipeline.

## 1. Optimization-based: DiffVG + Score Distillation

The entire "neural text-to-SVG" line descends from DiffVG, Tzu-Mao Li's 2020 differentiable
vector rasterizer. DiffVG makes SVG parameters (control points, colors, widths) differentiable
with respect to raster-space losses, so any gradient-capable image loss — CLIP, SDS from a
pretrained T2I model — can drive vector optimization. The repo at
[`BachiLi/diffvg`](https://github.com/BachiLi/diffvg) (1.2k★, Apache-2.0, C++/CUDA + Python)
is still actively maintained through 2025 and is a hard dependency of every other project in
this family.

**[VectorFusion](https://github.com/ximinng/VectorFusion-pytorch)** (CVPR 2023,
[arXiv:2211.11319](https://arxiv.org/abs/2211.11319)) distills Stable Diffusion into a
DiffVG-parameterized SVG using Score Distillation Sampling — no SVG training data required.
An unofficial but maintained PyTorch implementation (ximinng, 180★, MIT) supports both
one-stage ("optimize paths from noise") and two-stage ("sample raster → LIVE trace → refine
via SDS") modes and can also emit pixel-art or stroke-only sketches.

**[SVGDreamer](https://github.com/ximinng/SVGDreamer)** (CVPR 2024, 435★, MIT,
[arXiv:2312.16476](https://arxiv.org/abs/2312.16476)) fixes VectorFusion's two worst failure
modes — color over-saturation and shape over-smoothing — with *Semantic-Driven Image
Vectorization* (attention-mask-guided fore/background split) and *Vectorized Particle-based
Score Distillation* (models SVGs as a distribution of control points rather than a single
set). Output is hierarchically editable. SVGDreamer++ (Nov 2024) adds stronger visual
representation. Runtime is the catch: 5–30 minutes per SVG on a single A100 in the reference
config. Not a hot path.

**[NeuralSVG](https://github.com/SagiPolaczek/NeuralSVG)** (ICCV 2025, 1.4k★, MIT,
[arXiv:2501.03992](https://arxiv.org/abs/2501.03992)) replaces the explicit
control-point parameterization with a small MLP that implicitly encodes the whole scene
(NeRF-style). Dropout regularization on layer indices produces genuinely *layered* output
where each shape stands alone — the property Recraft V3 charges for. Supports
inference-time conditioning (background color, aspect ratio, sketch vs filled) from a single
trained representation. Still SDS-based, so single-digit-minutes optimization per prompt.

**[DiffSketcher](https://ximinng.github.io/DiffSketcher-project/)** (NeurIPS 2023) and
**[CLIPasso](https://github.com/yael-vinker/CLIPasso)** (SIGGRAPH 2022, 947★) are the
stroke-only cousins: CLIPasso converts an input image into a Bézier-curve sketch via CLIP
loss; DiffSketcher does the same from text via SDS. Useful as style primitives for logos
with a hand-drawn aesthetic, not as general-purpose vector renderers.

**[LiveSketch](https://github.com/yael-vinker/live_sketch)** (CVPR 2024 Highlight, 478★,
Apache-2.0) animates an existing SVG sketch using a text-to-video diffusion prior — out of
scope for a still-image enhancer, but flagged for the roadmap when brand assets grow into
motion graphics.

## 2. Autoregressive code generation: treat SVG as a token stream

This line reframes vector generation as *code* generation. It produces orders-of-magnitude
faster results than SDS optimization but requires a large SVG corpus for training.

**[StarVector](https://github.com/joanrod/star-vector)** (CVPR 2025, 4.3k★) is the headline
repo: a vision-language model (ViT encoder + LLM adapter + code decoder) fine-tuned to emit
valid SVG markup. Checkpoints on HuggingFace —
[starvector-1b-im2svg](https://huggingface.co/starvector) (~1B params) and
[starvector-8b-im2svg](https://huggingface.co/starvector/starvector-8b-im2svg) (~8B params) —
target image-to-SVG vectorization; the matching
[SVG-Stack dataset](https://huggingface.co/starvector) holds 2M SVGs with SVG-Bench for
evaluation. A community text-to-SVG Space exists at
[`fradav/text2svg-demo-app`](https://huggingface.co/spaces/fradav/text2svg-demo-app).
StarVector dominates on icon-style inputs where potrace/vtracer would over-fit noise into
paths: it understands that a gear should be a closed polygon, not 400 stroke segments. A
RLRF follow-up was accepted to NeurIPS 2025.

**[OmniSVG](https://github.com/OmniSVG/OmniSVG)** (NeurIPS 2025, 2.45k★, Apache-2.0,
[arXiv:2504.06263](https://arxiv.org/abs/2504.06263)) is the strongest Recraft-V3 analog
shipped as open weights in 2025. It parameterizes SVG commands and coordinates as discrete
tokens and trains a VLM end-to-end for three modes: text-to-SVG, image-to-SVG, and
character-reference-to-SVG. Released checkpoints include
**OmniSVG1.1_8B** (17.2 GB, Dec 2025) and **OmniSVG1.1_4B**, plus the **MMSVG-2M** dataset
(904K icons + 255K illustrations as of Dec 2025) and **MMSVGBench** evaluation protocol.
OmniLottie (Mar 2026) adds Lottie animation generation. Quality on icons rivals or exceeds
Recraft V3 on MMSVGBench; on intricate illustrations Recraft V3 still wins on text rendering
and composition.

**[IconShop](https://github.com/kingnobro/IconShop)** (SIGGRAPH Asia 2023,
[arXiv:2304.14400](https://arxiv.org/abs/2304.14400)) is the autoregressive-transformer
predecessor, narrowly trained on the FIGR-8-SVG icon dataset. Useful as a domain-specific
fallback for single-glyph icons when a lightweight model is preferred over the 4B+ OmniSVG
variants. Pretrained weights are available but produce different output from the paper due
to dataset re-scaling.

**[Im2Vec](https://github.com/preddy5/Im2Vec)** (CVPR 2021 Oral, 298★, Apache-2.0, archived
Nov 2022) is the historical VAE approach: encode raster → latent → decode to closed Bézier
paths, with DiffVG as the rasterizer for supervision. Archived and superseded by StarVector
on every metric, but the code is still readable and useful as a baseline for small
domain-specific datasets (emoji, fonts, MNIST).

**[SketchAgent](https://github.com/yael-vinker/SketchAgent)** (CVPR 2025, 206★, MIT,
[arXiv:2411.17673](https://arxiv.org/abs/2411.17673)) is an unusual entry: no training
required, it prompts a multimodal LLM (Anthropic Claude) to emit stroke coordinates on a
numbered 50×50 grid, then fits cubic Béziers through the coordinate sequences. Interactive
("draw with the agent"), chat-editable, and zero-training — a natural fit for an
agent-native product with an LLM already in the loop.

## 3. Classical / learned-cleanup fallbacks

For flat logos, icons, and monochrome marks, the classical algorithms are still
state-of-the-art on speed and deterministic output — and they compose well as a
*post-processor* for raster-model outputs.

- **[visioncortex/vtracer](https://github.com/visioncortex/vtracer)** (5.7k★, MIT, Rust):
  O(n) full-color vectorization, WASM and CLI distributions, gigapixel-capable. Default
  choice for full-color or gradient-heavy inputs.
- **[autotrace/autotrace](https://github.com/autotrace/autotrace)** (~692★, GPL-2.0, C):
  outline + centerline tracing; supports color reduction and despeckling. GPL is a
  contamination risk if embedded; safe when shelled out.
- **[potrace](https://potrace.sourceforge.net/)** (GPL-2.0 / commercial): the canonical
  bitmap-to-curve tracer, binary-input only, bundled inside Inkscape. Best for crisp
  black-and-white logos and typography marks.
- **svgtrace** (Python wrappers around potrace; multiple packages on PyPI, MIT) — trivial to
  call, but inherits potrace's binary-input limitation.

The most productive *hybrid* pattern combines the two families: a raster diffusion model
(Flux, Imagen, SDXL + logo LoRA) generates a high-resolution candidate, then a learned
vectorizer (**StarVector-1B** for icon-style, **OmniSVG-4B** image-to-SVG for illustrations)
cleans the raster into structured SVG. This beats classical tracing on semantics (correct
number of paths, closed polygons, palette-snapped colors) and beats pure SDS on speed
(seconds vs minutes). It is also the pattern VectorFusion's "multi-stage" mode
pioneered — raster sample first, vectorize, refine — only with a learned cleanup step
replacing LIVE.

## Integration recommendations

Four concrete candidates plus one classical fallback for the prompt-enhancement pipeline:

1. **OmniSVG-4B as the primary text-to-SVG renderer (Apache-2.0).** Direct text-to-SVG,
   open weights, Recraft-V3-competitive on icons and illustrations per MMSVGBench. Wire
   behind a `generate_svg` tool with `intent` ∈ {icon, illustration, logo}. Run on fal /
   Replicate serverless when available, or self-host on an A100-grade GPU. Accept that text
   rendering inside the SVG is still a weak point; route prompts with literal text to
   Recraft V3 commercial or to a raster + Satori overlay path.

2. **StarVector-1B as the raster→SVG cleanup stage in the hybrid pipeline
   (MIT).** When the router picks a raster model (Flux, Imagen, SDXL), pass the output
   through StarVector-1B before shipping. The 1B variant is small enough to serve on a
   single consumer GPU and produces cleaner semantic paths than vtracer for icon-style
   inputs. This is the direct replacement for "generate raster → vtracer" pipelines in
   existing asset generators.

3. **NeuralSVG as the "editable-layered" premium path (MIT).** When the user asks for a
   logo with explicit named layers (icon-mark + wordmark + background) or wants to switch
   background color / aspect ratio after generation, NeuralSVG's implicit MLP gives exactly
   that behavior from a single trained representation. Runtime cost (several minutes) rules
   it out for the free tier; expose it as a "refine to editable SVG" upsell.

4. **SketchAgent as the agent-native stroke primitive (MIT).** Because our product already
   has an LLM in the loop, SketchAgent's zero-training "LLM emits stroke coordinates"
   approach composes for free: implement a `sketch_svg` tool that hands the prompt to the
   host agent (Claude/GPT/Gemini) via the existing connection, returns Bézier-fitted
   strokes, and uses DiffVG only as the final rasterizer. Perfect for stylized line-art
   logos and hand-drawn-feel illustrations without a third-party model call.

5. **Classical fallback: `visioncortex/vtracer` (MIT, Rust WASM/CLI).** Bundle the WASM
   build as the deterministic fallback vectorizer for (a) users on CPU-only or offline tiers,
   (b) paths where the learned models fail validation (open polygons, >1000 paths, palette
   drift), and (c) any time the intent is "convert *this exact raster* to SVG without
   semantic reinterpretation." Ship `autotrace` and `potrace` as shell-out options for
   centerline tracing and binary-input logos respectively, guarded by the GPL boundary.

The practical router, in one line: **OmniSVG-4B first for text-to-SVG; StarVector-1B after
any raster model; NeuralSVG when layered editability is requested; SketchAgent when the
intent is stroke-art; vtracer when everything else fails or speed trumps semantics.**
