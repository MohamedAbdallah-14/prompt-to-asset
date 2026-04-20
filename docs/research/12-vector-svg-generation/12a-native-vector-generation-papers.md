---
category: 12-vector-svg-generation
angle: 12a
title: "Academic landscape of native vector (SVG) generation: DiffVG → StarVector → Chat2SVG"
slug: 12a-native-vector-generation-papers
status: draft
wave: 3
date: 2026-04-19
author: research-subagent-12a
tags: [svg, vector-graphics, diffvg, vectorfusion, svgdreamer, starvector, chat2svg, clipdraw, clipasso, layerdiffuse, raster-to-vector, potrace, vtracer]
primary_sources:
  - arXiv:2005.00491   # DiffVG
  - arXiv:2106.14843   # CLIPDraw
  - arXiv:2202.05822   # CLIPasso
  - arXiv:2211.11319   # VectorFusion
  - arXiv:2312.11556   # StarVector
  - arXiv:2312.16476   # SVGDreamer
  - arXiv:2404.00412   # SVGCraft
  - arXiv:2405.02962   # VectorPainter
  - arXiv:2411.16602   # Chat2SVG
  - arXiv:2402.17113   # LayerDiffuse
---

# Academic landscape of native vector / SVG generation

> Scope: the published academic line of work on generating SVG (or SVG-like parametric vector representations) directly from text, images, or code — plus the LayerDiffuse/transparency work that is increasingly being stitched into "vector-like" pipelines. Non-academic commercial tools (Recraft, Ideogram vector export, Adobe Illustrator's generative features) are covered in sibling angle 12c and are only referenced here for context.

## Executive summary

The native text/image-to-SVG literature is essentially one long thread with two hinges:

1. **Differentiable rasterization (DiffVG, SIGGRAPH Asia 2020)** made vector graphics optimizable by gradient descent. Every method below that generates SVG by "painting" parametric Béziers — CLIPDraw, CLIPasso, VectorFusion, SVGDreamer, SVGCraft, VectorPainter — is a DiffVG client at heart.
2. **Code/LLM-based generation (StarVector 2023 → Chat2SVG 2024)** reframes SVG generation as *code generation* rather than curve optimization. This gives you clean, editable, layer-named SVG out of the box at the cost of less pixel-faithful rendering, and it plugs directly into LLM tool-use flows — which is what we care about for a prompt-to-asset + agent product.

The practical landscape for 2026 is therefore bifurcated:

- **Optimization-based (DiffVG descendants).** High visual fidelity, infinitely scalable, but produces thousands of unnamed Béziers that no designer can meaningfully edit. Slow (minutes to hours per asset). Dominant in research benchmarks.
- **Code/LLM-based (StarVector, Chat2SVG, LLM-in-the-loop).** Orders of magnitude faster, produces short, human-readable, layer-named SVG, but visual fidelity is bounded by the model's SVG code knowledge and usually needs a diffusion refinement pass. Dominant in shipping products in 2025–2026.

A third practical path — **raster → potrace / vtracer** — is still the default in production (Recraft, Canva, most "SVG generator" SaaS in 2025–2026 do this behind the curtain). It's cheap and reliable but produces topologically ugly SVGs that don't match anyone's intuition of "vector": everything becomes stacked filled polygons with no strokes, no gradients, no semantic layer names.

For our prompt-to-asset + MCP skill, the implication is that **we should prefer Chat2SVG-style LLM-first pipelines for logos/icons/favicons** (clean editable SVG), fall back to **StarVector for image→SVG** (photograph-to-SVG), and expose **potrace/vtracer as a last-resort raster→SVG path** — with explicit warnings about topology quality. The optimization-based DiffVG line is academically important but currently too slow/unedit­able to ship as a user-facing skill.

## Paper chronology

| Year | Paper | Venue | Contribution (1-line) | arXiv | Repo / Model |
| ---- | ----- | ----- | -------------------- | ----- | ------------ |
| 2020 | **DiffVG** – Li, Lukáč, Gharbi, Ragan-Kelley | SIGGRAPH Asia 2020 | Differentiable rasterizer; lets you backprop a loss into SVG control points | [2005.00491](https://arxiv.org/abs/2005.00491) | [BachiLi/diffvg](https://github.com/BachiLi/diffvg) |
| 2021 | **CLIPDraw** – Frans, Soros, Witkowski | NeurIPS 2022 | Text → RGBA Bézier curves by optimizing CLIP similarity on a DiffVG raster, no training needed | [2106.14843](https://arxiv.org/abs/2106.14843) | [kvfrans/clipdraw](https://github.com/kvfrans/clipdraw) |
| 2022 | **CLIPasso** – Vinker et al. | SIGGRAPH 2022 | Image → abstract sketch; semantic-aware stroke removal; CLIP perceptual loss via DiffVG | [2202.05822](https://arxiv.org/abs/2202.05822) | [yael-vinker/CLIPasso](https://github.com/yael-vinker/CLIPasso) |
| 2022 | **VectorFusion** – Jain, Xie, Abbeel | CVPR 2023 | Score-distillation sampling (SDS) from Stable Diffusion → SVG via DiffVG | [2211.11319](https://arxiv.org/abs/2211.11319) | [vectorfusion.github.io](https://vectorfusion.github.io/) (no full official code; many re-impls) |
| 2023 | **Word-as-Image** – Iluz, Vinker et al. | SIGGRAPH 2023 | Semantic typography: deforms a font glyph into a shape via SDS+DiffVG | [2303.01818](https://arxiv.org/abs/2303.01818) | [Shiriluz/Word-As-Image](https://github.com/Shiriluz/Word-As-Image) |
| 2023 | **StarVector** – Rodriguez et al. (ServiceNow) | CVPR 2025 | Vision-LLM that emits SVG *code* from images or text; trained on SVG-Stack (2M SVGs) | [2312.11556](https://arxiv.org/abs/2312.11556) | [joanrod/star-vector](https://github.com/joanrod/star-vector), HF: `starvector/starvector-8b-im2svg` |
| 2023 | **SVGDreamer** – Xing et al. | CVPR 2024 | Particle-based VPSD + SIVE foreground/background decomposition; best-in-class optimization-based T2SVG | [2312.16476](https://arxiv.org/abs/2312.16476) | [ximinng/SVGDreamer](https://github.com/ximinng/SVGDreamer) |
| 2024 | **SVGCraft** – Banerjee, Mathur et al. | CVPR 2024 Workshop (AI4CC) | LLM-planned layout → masked latent diffusion → LPIPS-guided DiffVG for multi-object scenes | [2404.00412](https://arxiv.org/abs/2404.00412) | [ayanban011/svgcraft](https://github.com/ayanban011/svgcraft) |
| 2024 | **VectorPainter** – Hu et al. | ICME 2025 | Reference-image stroke style transfer into T2SVG via imitation-learned vectorization | [2405.02962](https://arxiv.org/abs/2405.02962) | [hjc-owo/VectorPainter](https://github.com/hjc-owo/VectorPainter) |
| 2024 | **LayerDiffuse** – Zhang, Agrawala | SIGGRAPH 2024 | Natively generates RGBA-transparent layered images from latent-space alpha; "vector-adjacent" | [2402.17113](https://arxiv.org/abs/2402.17113) | [lllyasviel/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse) |
| 2024 | **Chat2SVG** – Wu, Su, Liao | CVPR 2025 | LLM drafts SVG primitive template → latent inversion + ControlNet refines → point-level DiffVG polish | [2411.16602](https://arxiv.org/abs/2411.16602) | [chat2svg.github.io](https://chat2svg.github.io/) |

Note on attribution: the research-fleet assignment attributes VectorFusion to "Iluz et al.", but the VectorFusion authors are **Ajay Jain, Amber Xie, Pieter Abbeel** (UC Berkeley; [CVPR 2023 paper](https://openaccess.thecvf.com/content/CVPR2023/papers/Jain_VectorFusion_Text-to-SVG_by_Abstracting_Pixel-Based_Diffusion_Models_CVPR_2023_paper.pdf)). "Iluz et al." refers to the closely related **Word-as-Image** work (SIGGRAPH 2023, arXiv:2303.01818) by Shir Iluz & Yael Vinker, which is included above as part of the same DiffVG+SDS family.

## Method-by-method summaries

### DiffVG (Li et al., SIGGRAPH Asia 2020)

The foundational work. Vector rasterization is fundamentally non-differentiable because a pixel either is or isn't covered by a shape. DiffVG solves this by **prefiltering the rasterization** (either analytically or via MSAA) so that pixel values become smooth functions of shape parameters, making `∂pixel / ∂control_point` well-defined.

The practical consequence is that you can put *any* differentiable loss on the rasterized output — CLIP similarity, LPIPS, SDS, MSE against a target image — and the gradient flows back into the SVG's control points, colors, stroke widths, and opacities. Every "native SVG generator" paper from 2021–2024 is at heart "what loss do I stick on top of DiffVG?"

- **Repo status (2026):** `BachiLi/diffvg` on GitHub, ~1.3k stars, C++/CUDA + Python bindings, still compiles but increasingly painful on modern CUDA/PyTorch (many 2024+ users pin CUDA 11.8 / torch 2.0). This is the #1 friction point in the whole ecosystem.
- **Why it matters to us:** any optimization-based SVG pipeline we embed will drag DiffVG as a dependency. Plan accordingly — prefer LLM/code pipelines for production.

### CLIPDraw (Frans et al., NeurIPS 2022)

The "hello world" of optimization-based vector generation. Initialize N random RGBA Bézier curves, rasterize with DiffVG, augment the raster with random crops and perspective distortions, compute CLIP text-image similarity against the prompt, backprop, repeat for ~1000 iterations. No training.

- Stroke count controls abstraction — 16 strokes give a minimalist icon-like output; 256 strokes give a "detailed drawing."
- Tends to embed words as literal text pixels in outputs (a well-documented CLIP-prompting quirk, not a bug in CLIPDraw itself).
- **Still the cheapest baseline for "text → vector sketch" in 2026** (~1 min on a T4). Limited fidelity vs diffusion-based successors but trivially deployable.

### CLIPasso (Vinker et al., SIGGRAPH 2022)

Image → abstract sketch instead of text → drawing. The clever bit is **saliency-based stroke initialization** (Béziers get placed along the most salient edges of the input image, not randomly) and a **CLIP-based perceptual loss** that cares about semantic content rather than pixel fidelity. You get Picasso-style line drawings of arbitrary photographs with controllable abstraction.

Important for us because it's the cleanest academic demonstration that **you can go from a reference photo to a stylized vector asset** without a training dataset of "photo ↔ sketch" pairs — interesting for "match my brand's existing hand-drawn style" workflows.

### VectorFusion (Jain, Xie, Abbeel — CVPR 2023)

The first method that really looks like a "text-to-SVG diffusion model." Replaces CLIP loss with **Score Distillation Sampling (SDS)** from Stable Diffusion (same trick as DreamFusion for 3D). Pipeline:

1. Sample a raster image from Stable Diffusion for the text prompt.
2. Auto-trace it to SVG using [LIVE (Ma et al., CVPR 2022)](https://arxiv.org/abs/2203.12780).
3. Refine the SVG with DiffVG + SDS loss against the prompt.

Style control is via prompt suffixes: "iconography", "pixel art", "line drawing", "vector art." Output is markedly more coherent than CLIPDraw. **No full official open-source release** — the project page ships only evaluations; community re-implementations (e.g. [ximinng/PyTorch-SVGRender](https://github.com/ximinng/PyTorch-SVGRender)) are the de-facto reference.

### SVGDreamer (Xing et al. — CVPR 2024)

State-of-the-art optimization-based text-to-SVG as of 2024–2026, and the one most worth studying if we ever ship an optimization path.

Two contributions:

- **SIVE (Semantic-driven Image Vectorization):** decomposes the scene into foreground objects and background using cross-attention masks from the diffusion U-Net, then optimizes each region's primitives separately. This is what gives it clean, *editable* multi-object SVGs instead of a tangled ball of 4000 Béziers.
- **VPSD (Vectorized Particle-based Score Distillation):** models SVGs as a *distribution* of control points + colors and maintains a small population of "particles" that a reward model reweights. Fixes VectorFusion's known failure modes: over-smoothing, over-saturation, low diversity, and slow convergence.

Supports six output styles (iconography, pixel art, low-poly, painting, sketch, ink). Official code at [ximinng/SVGDreamer](https://github.com/ximinng/SVGDreamer) (actively maintained, part of the broader PyTorch-SVGRender umbrella). Still slow — ~20–30 minutes on an A100 for a single asset — so **not** a live-user workflow, but a strong "batch generate a brand kit overnight" tool.

### StarVector (Rodriguez et al. — CVPR 2025)

The most important pivot in the field: **treat SVG generation as code generation**, not curve optimization. StarVector is a vision-language model (SigLIP image encoder + StarCoder LLM backbone) fine-tuned on **SVG-Stack**, a 2M-sample dataset of diverse SVGs, with a benchmark suite called **SVG-Bench**.

- Inputs: image (Im2SVG) *or* text (Text2SVG). Outputs: raw SVG code.
- Uses the full SVG primitive vocabulary — `<circle>`, `<rect>`, `<polygon>`, `<path>`, `<text>` — instead of reducing everything to Béziers. So outputs are compact and editable.
- Two released checkpoints on HuggingFace: `starvector/starvector-1b-im2svg` and `starvector/starvector-8b-im2svg` (both actively downloaded in 2025–2026; paper moved from arXiv preprint to **CVPR 2025** accept).
- Great for: icons, UI symbols, and "vectorize this logo PNG for me." Weaker on: complex photographic scenes (out of distribution for SVG-Stack).

For a prompt-to-asset MCP skill this is arguably the single most practical open model available today.

### SVGCraft (Banerjee, Mathur et al. — CVPR 2024 Workshop)

Addresses VectorFusion/SVGDreamer's single-object bias. Multi-object scenes need explicit layout.

Pipeline:

1. LLM (GPT-4) parses the text prompt into bounding boxes + object labels + background label.
2. Masked-latent diffusion U-Net produces per-object masked latents with attention-map fusion.
3. DiffVG + LPIPS loss + opacity modulation paints Bézier curves over the per-object regions, starting translucent and intensifying by semantic relevance (mimics how a human draws).

Supports three render modes: detailed sketch, primitive shapes (constrained environments), or colored output. Reported CLIP-T 0.456 and aesthetic score 6.78 on their eval — best-in-class for multi-object T2SVG at publication. Code at [ayanban011/svgcraft](https://github.com/ayanban011/svgcraft).

### VectorPainter (Hu et al. — ICME 2025)

The only method in the list with a clear **brand/style transfer** use case. Takes a *reference image* (say, your brand's illustration), extracts "stroke style" via an imitation-learning vectorizer, and conditions a text-to-SVG optimization on preserving that stroke style.

Useful signal for us: reference-image-driven vector style transfer is an active research topic, not a solved one. The closest shipping analogue is Recraft's "style references" feature.

Official code at [hjc-owo/VectorPainter](https://github.com/hjc-owo/VectorPainter), released March 2025. Needs a Stable Diffusion checkpoint to run.

### LayerDiffuse (Zhang, Agrawala — SIGGRAPH 2024)

Not a vector generator, but ships the prerequisite that every vector asset actually needs: **true transparency**. The key technical idea is "latent transparency" — the alpha channel is encoded as a learned offset in Stable Diffusion's latent manifold so that the VAE decoder can natively emit RGBA without breaking the original RGB prior. Can be fine-tuned from any SD 1.5 / SDXL / Flux checkpoint.

Why it matters here: the most common "vector" request in our domain — *"a transparent logo for my note-taking app"* — does not actually need a scalable format. It needs a transparent PNG. LayerDiffuse directly solves the "checkered box in the background" failure mode from the top-level PLAN.md, and when chained into vtracer or StarVector it gives a clean raster→SVG with real transparency. User study reports 97% preference over "generate then matte" workflows and quality comparable to Adobe Stock.

**Most directly shippable paper in this entire angle** for our product. Actively maintained at [lllyasviel/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse), Apache 2.0, integrated into A1111/ComfyUI.

### Chat2SVG (Wu, Su, Liao — CVPR 2025)

The cleanest example of the LLM-first, diffusion-refined paradigm and the most direct inspiration for what we'd want to build.

Pipeline:

1. **LLM template stage.** GPT-4 generates a semantically meaningful SVG *template* — composed of named primitives (`<circle id="head">`, `<rect id="body">`, etc.) — from the text prompt. This alone produces an editable, hand-adjustable SVG; it's typically crude but topologically correct.
2. **Dual-stage refinement.**
   - Primitives → latent embeddings via latent inversion. Visual attributes (colors, strokes, transforms) optimized jointly.
   - Point-level DiffVG optimization refines the actual path control points against a ControlNet-guided diffusion reconstruction of the prompt.

Result: SVGs that are *both* semantically layered (edit "the ears" not "path_1483") *and* visually faithful. Reports SOTA on visual fidelity, path regularity, and semantic alignment vs SVGDreamer. Supports natural-language edits ("make the cat orange", "add a hat").

For a prompt-to-asset + skill architecture, Chat2SVG is the blueprint. The LLM step is already what our enhancer is doing, and the diffusion-refinement step is a clean boundary where we can swap in Gemini, SDXL, or Flux.

## Quality vs usability matrix

Rough assessment for our use-case (prompting-layer + MCP skill generating production logos/icons/illustrations in 2026):

| Method | Visual quality | Editability of output SVG | Runtime / asset | OSS today? | Good fit for our skill? |
| ------ | -------------- | ------------------------- | --------------- | ---------- | ----------------------- |
| CLIPDraw | Low (2021 CLIP) | Low (flat Béziers) | ~1 min | Yes | Baseline only |
| CLIPasso | Medium (sketch) | Low | ~1–5 min | Yes | Niche (sketch style) |
| VectorFusion | Medium-high | Low (LIVE trace → messy) | ~10–30 min | Partial (re-impls) | No |
| Word-as-Image | High (typography) | Medium (single glyph) | ~5–10 min | Yes | Niche (wordmarks) |
| SVGDreamer | High | Medium (SIVE decomp) | ~20–30 min | **Yes, active** | Batch only, too slow for live |
| SVGCraft | Medium-high | Medium-high (per-object layers) | ~15 min | Yes | Promising for scenes |
| VectorPainter | Medium-high, stylized | Medium | ~10–20 min | Yes | Niche (style transfer) |
| **StarVector** | Medium (icon-like) | **High (native SVG primitives)** | **<10 s (inference)** | **Yes, HF models** | **Yes — image→SVG path** |
| **Chat2SVG** | High | **High (named layers)** | ~1–3 min | Repo available | **Yes — text→SVG flagship** |
| LayerDiffuse | High (raster RGBA) | N/A (it's raster) | ~30 s | **Yes, mature** | **Yes — transparency fix** |
| raster → potrace | Low-medium | Low (B&W polygons only) | <1 s | Yes | Last-resort fallback |
| raster → vtracer | Medium (colored) | Low (hierarchical polygons, no semantic layers) | <1 s | Yes | Default production fallback |

## Comparison with raster → potrace / vtracer pipelines

The "raster → trace" path is what most shipped "AI SVG generator" SaaS products actually do. Trade-offs:

- **Topology:** potrace / vtracer produce stacks of filled polygons with *no* strokes, *no* gradients beyond flat fills, *no* semantic layer names. SVGs are valid and scalable but a designer opening one in Figma sees "~400 unnamed paths" — not an editable asset.
- **Colors:** potrace is strictly black-and-white. vtracer supports full color via hierarchical clustering and runs in O(n) (vs potrace's O(n²)), so vtracer is the better default.
- **Transparency:** potrace ignores it; vtracer can preserve alpha if the input PNG has it, which is why LayerDiffuse → vtracer is a surprisingly strong stack.
- **Gradients and text:** both traces kill gradients (approximated as polygon banding) and convert all text to paths (loses selectability, accessibility, SEO for inline SVG).

**Practical advice for our pipeline:**
- If the user wants a *logo* or *icon* and says "SVG": Chat2SVG-style LLM-first is the right default. StarVector is the right fallback when we already have a raster.
- If the user wants a transparent *raster* (the actual intent behind most "SVG" requests for app icons / OG images): LayerDiffuse + downstream uses, no SVG at all.
- Only use potrace/vtracer when we *must* go raster-first (e.g. user uploaded a scanned sketch) and warn in the skill's response about topology quality.

## OSS release status (as of April 2026)

Actively usable today (verified repo/HF presence):

- **DiffVG** — [github.com/BachiLi/diffvg](https://github.com/BachiLi/diffvg). Still the base layer. Painful install on CUDA 12+; community forks exist.
- **CLIPDraw** — [github.com/kvfrans/clipdraw](https://github.com/kvfrans/clipdraw). Tiny, readable, runs out of the box.
- **CLIPasso** — [github.com/yael-vinker/CLIPasso](https://github.com/yael-vinker/CLIPasso). Works; docker image provided.
- **Word-as-Image** — [github.com/Shiriluz/Word-As-Image](https://github.com/Shiriluz/Word-As-Image). Works; solid Colab notebook.
- **SVGDreamer** — [github.com/ximinng/SVGDreamer](https://github.com/ximinng/SVGDreamer) + unified umbrella [ximinng/PyTorch-SVGRender](https://github.com/ximinng/PyTorch-SVGRender) which also hosts reproductions of VectorFusion and DiffSketcher. Best single repo to clone if you want to evaluate the whole optimization family.
- **SVGCraft** — [github.com/ayanban011/svgcraft](https://github.com/ayanban011/svgcraft). Workshop-grade code, works but less polished.
- **VectorPainter** — [github.com/hjc-owo/VectorPainter](https://github.com/hjc-owo/VectorPainter). Released March 2025.
- **StarVector** — [github.com/joanrod/star-vector](https://github.com/joanrod/star-vector); HF models [`starvector/starvector-1b-im2svg`](https://huggingface.co/starvector/starvector-1b-im2svg) and [`starvector/starvector-8b-im2svg`](https://huggingface.co/starvector/starvector-8b-im2svg). **Single highest-leverage OSS drop in this list** — one `from_pretrained` call and you can vectorize images in the browser via a transformers.js port.
- **Chat2SVG** — project page [chat2svg.github.io](https://chat2svg.github.io/), code promised at CVPR 2025; expect community reproductions via PyTorch-SVGRender pattern.
- **LayerDiffuse** — [github.com/layerdiffusion/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse). Shipped with A1111 / Forge / ComfyUI. The single most mature repo in the list.

Not fully open:

- **VectorFusion** — no official code release; method reproduced in PyTorch-SVGRender.
- **Recraft / Ideogram vector export** — commercial only; out of scope here (see 12b/12c).

## References

- Li, Lukáč, Gharbi, Ragan-Kelley. "Differentiable Vector Graphics Rasterization for Editing and Learning." *SIGGRAPH Asia 2020*. [arXiv:2005.00491](https://arxiv.org/abs/2005.00491) · [project](https://people.csail.mit.edu/tzumao/diffvg/) · [code](https://github.com/BachiLi/diffvg)
- Frans, Soros, Witkowski. "CLIPDraw: Exploring Text-to-Drawing Synthesis through Language-Image Encoders." *NeurIPS 2022*. [arXiv:2106.14843](https://arxiv.org/abs/2106.14843)
- Vinker et al. "CLIPasso: Semantically-Aware Object Sketching." *SIGGRAPH 2022*. [arXiv:2202.05822](https://arxiv.org/abs/2202.05822)
- Jain, Xie, Abbeel. "VectorFusion: Text-to-SVG by Abstracting Pixel-Based Diffusion Models." *CVPR 2023*. [arXiv:2211.11319](https://arxiv.org/abs/2211.11319) · [project](https://vectorfusion.github.io/)
- Iluz, Vinker et al. "Word-as-Image for Semantic Typography." *SIGGRAPH 2023*. [arXiv:2303.01818](https://arxiv.org/abs/2303.01818)
- Rodriguez et al. "StarVector: Generating Scalable Vector Graphics Code from Images and Text." *CVPR 2025*. [arXiv:2312.11556](https://arxiv.org/abs/2312.11556) · [project](https://starvector.github.io/starvector/) · [code](https://github.com/joanrod/star-vector)
- Xing et al. "SVGDreamer: Text-Guided SVG Generation with Diffusion Model." *CVPR 2024*. [arXiv:2312.16476](https://arxiv.org/abs/2312.16476) · [code](https://github.com/ximinng/SVGDreamer)
- Banerjee, Mathur et al. "SVGCraft: Beyond Single Object Text-to-SVG Synthesis with Comprehensive Canvas Layout." *CVPR 2024 Workshop on AI for Content Creation*. [arXiv:2404.00412](https://arxiv.org/abs/2404.00412) · [code](https://github.com/ayanban011/svgcraft)
- Hu et al. "VectorPainter: Advanced Stylized Vector Graphics Synthesis Using Stroke-Style Priors." *ICME 2025*. [arXiv:2405.02962](https://arxiv.org/abs/2405.02962) · [code](https://github.com/hjc-owo/VectorPainter)
- Zhang, Agrawala. "Transparent Image Layer Diffusion using Latent Transparency." *SIGGRAPH 2024*. [arXiv:2402.17113](https://arxiv.org/abs/2402.17113) · [code](https://github.com/layerdiffusion/LayerDiffuse)
- Wu, Su, Liao. "Chat2SVG: Vector Graphics Generation with Large Language Models and Image Diffusion Models." *CVPR 2025*. [arXiv:2411.16602](https://arxiv.org/abs/2411.16602) · [project](https://chat2svg.github.io/)
- Ma et al. "Towards Layer-wise Image Vectorization (LIVE)." *CVPR 2022*. [arXiv:2203.12780](https://arxiv.org/abs/2203.12780) — used as init in VectorFusion.
- Selinger. "Potrace: a polygon-based tracing algorithm." 2003. [project](http://potrace.sourceforge.net/)
- VTracer / Vision Cortex. [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer) · [docs](https://www.visioncortex.org/vtracer-docs)
