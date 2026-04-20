---
category: 12-vector-svg-generation
title: "Vector / SVG Generation — Category Index"
slug: 12-vector-svg-generation-index
status: complete
wave: 5
date: 2026-04-19
author: category-indexer-12
angles_indexed:
  - 12a-native-vector-generation-papers
  - 12b-raster-to-svg-tracers
  - 12c-svg-spec-features-for-assets
  - 12d-llm-direct-svg-code-generation
  - 12e-hybrid-vector-pipeline-architectures
tags:
  - svg
  - vector-graphics
  - diffvg
  - starvector
  - chat2svg
  - vtracer
  - potrace
  - recraft
  - llm-svg
  - pelican-bicycle
  - layerdiffuse
  - svgo
  - pipeline-architecture
word_count_target: 2000-3500
---

# Vector / SVG Generation — Category Index

## Category Executive Summary

The vector asset problem in 2026 has three legitimate solution paths — programmatic LLM-authored SVG, native vector models (Recraft / StarVector / Chat2SVG), and raster-then-trace — and the only product that survives contact with real users is a **router** that chooses between them per request. None of the three paths is strictly dominant, but their zones of competence are now well enough mapped that a principled decision tree outperforms any single model across every asset class we actually ship (logos, icons, favicons, illustrations, mascots).

Fifteen insights that orient the rest of the category:

1. **The field bifurcated cleanly in 2023–2025.** Optimization-based SVG (DiffVG → CLIPDraw → VectorFusion → SVGDreamer) gives high visual fidelity but unedit­able Bézier soup and minute-to-hour runtimes; code/LLM-based generation (StarVector 2023, Chat2SVG 2024) is 1–2 orders of magnitude faster and produces editable primitives, at the cost of lower raw fidelity. Our product lives entirely on the code/LLM side ([12a](./12a-native-vector-generation-papers.md)).
2. **LLM-direct SVG is production-viable for a narrow but high-frequency band** — simple logos, line icons, favicons, monograms, flat glyph app icons, architecture sketches. Claude Sonnet/Opus 4.x is the consensus leader on raw SVG-code quality; Gemini 2.5/3 Pro wins on compositional scenes; GPT-5 is strong but over-verbose ([12d](./12d-llm-direct-svg-code-generation.md)). Simon Willison's [pelican-on-a-bicycle benchmark](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/) is the most-cited informal eval, and [SGP-Bench (ICLR 2025 Spotlight)](https://arxiv.org/abs/2408.08313) plus [SVG-Bench](https://starvector.github.io/starvector/) provide formal rubrics.
3. **Prompt constraints move LLM-SVG quality more than model upgrades.** Explicit `viewBox`, integer-coordinate caps, element-count budgets, `currentColor`, stroke/fill mode, and style references ("Lucide / Heroicons outline, 2 px stroke") compress the solution space decisively ([12d](./12d-llm-direct-svg-code-generation.md)).
4. **vtracer — not potrace — is the correct open-source default for AI-generated rasters**, because everything Imagen / DALL·E / Flux emits is colored. potrace is still unbeaten for pure B/W silhouettes, but vtracer is linear-time, handles full color, has a 133 KB WASM build that runs in a Web Worker in ~250 ms on a 1024² image, and beats Illustrator Image Trace by roughly 10× on node count ([12b](./12b-raster-to-svg-tracers.md)).
5. **The commercial vectorizer market collapses to one decision: Recraft `/images/vectorize` at $0.01/call vs Vectorizer.AI at $0.20/credit.** Recraft is ~20× cheaper and the right "premium fallback" for gradient-heavy illustrations where classical tracers emit concentric shells instead of true `<linearGradient>` elements ([12b](./12b-raster-to-svg-tracers.md), [12e](./12e-hybrid-vector-pipeline-architectures.md)).
6. **Recraft V4 SVG / V4 Pro SVG is the category's only native-vector commercial diffusion model in 2026.** It returns real editable SVG (not traced bitmaps) for prompts up to 10,000 chars. Open-source substitutes — [SVGFusion](https://arxiv.org/abs/2412.10437), [IconShop](https://github.com/kingnobro/IconShop), community VectorFusion ports — exist but require GPUs and meaningful ops work ([12e](./12e-hybrid-vector-pipeline-architectures.md)).
7. **StarVector (CVPR 2025) is the single highest-leverage OSS drop in the academic line.** One `from_pretrained("starvector/starvector-8b-im2svg")` call vectorizes an image into clean primitive SVG with `<circle>`, `<rect>`, `<polygon>`, not Bézier soup; a transformers.js port is practical for in-browser use ([12a](./12a-native-vector-generation-papers.md)).
8. **Chat2SVG is the blueprint for our own pipeline.** LLM drafts a semantically named SVG template (`<circle id="head">`) → latent inversion refines visual attributes → point-level DiffVG polishes geometry. The LLM step is already what our prompt-to-asset does; the refinement step is a clean swap point for Gemini / SDXL / Flux ([12a](./12a-native-vector-generation-papers.md)).
9. **"Transparent logo for my note-taking app" usually does not need SVG at all.** It needs a transparent PNG. [LayerDiffuse (SIGGRAPH 2024)](https://arxiv.org/abs/2402.17113) generates RGBA natively from a learned latent-alpha manifold with reported 97% user preference over matte-after-the-fact workflows, and is the single most shippable paper in this category for our actual pain points ([12a](./12a-native-vector-generation-papers.md)).
10. **Path count is the most useful cheap quality signal.** Accept 5–60 paths for logos/icons, 60–600 for illustrations / vtracer output, auto-reject >1500 (almost always failed photoreal vectorization). This plus a bounding-box check (content must fill >30% of the viewBox) catches most generator failures without any ML ([12e](./12e-hybrid-vector-pipeline-architectures.md)).
11. **An SVG is a document, not a picture.** Correct `viewBox`, `preserveAspectRatio`, `currentColor`, `<title>`/`<desc>`, `role="img"`, and a resilient `font-family` stack are nearly free to emit and expensive to retrofit. Missing or mis-sized `viewBox` is the single most common generator failure ([12c](./12c-svg-spec-features-for-assets.md)).
12. **SVGO's defaults are hostile to interactive / animated SVGs.** `removeViewBox`, `cleanupIds`, `collapseGroups`, `mergePaths`, `removeHiddenElems`, `removeTitle`, `removeDesc` will silently destroy sprites, CSS animation hooks, and accessibility. Ship per-asset-class SVGO configs, not one global pass ([12c](./12c-svg-spec-features-for-assets.md)).
13. **Prompt engineering on the raster side determines vector quality on the trace side.** Phrases like "flat vector illustration, bold outlines, limited palette, plain background" collapse detail enough that vtracer emits O(100) paths instead of O(10,000) — meaning Pipeline C (Flux → vtracer) must own its prompt template, not just accept the user's words ([12e](./12e-hybrid-vector-pipeline-architectures.md)).
14. **Caching recovers 60–85% of spend on realistic prompt distributions.** Canonicalize `{model, prompt, params}` → SHA-256; layer Anthropic/OpenAI/Gemini provider-side prompt caching (90% / 50% / 75% discount on cached tokens); reuse seeds for brand variants; perceptual-hash final PNGs to dedupe convergent outputs ([12e](./12e-hybrid-vector-pipeline-architectures.md)).
15. **Every commercial tool operates a router, not a model.** Canva Magic Studio triages raster-first; Figma Vectorize ingests raster and lifts vector; Recraft is vector-first with a `/vectorize` escape hatch. The open-source blueprint must mirror this, not emulate a single model ([12e](./12e-hybrid-vector-pipeline-architectures.md)).

## Map of the Angles

| Angle | Focus | Primary question answered | Key artifact |
| ----- | ----- | ------------------------ | ------------ |
| [12a](./12a-native-vector-generation-papers.md) | Academic line: DiffVG → CLIPDraw → CLIPasso → VectorFusion → Word-as-Image → SVGDreamer → SVGCraft → VectorPainter → StarVector → LayerDiffuse → Chat2SVG | What methods have been published, which are OSS-usable today, which actually fit a shipping product? | Paper chronology + quality/usability matrix |
| [12b](./12b-raster-to-svg-tracers.md) | Tracers: potrace, autotrace, vtracer, imagetracerjs, svgtrace, Illustrator Image Trace, Recraft /vectorize, Vectorizer.AI, DiffVG/LIVE | Given a raster, which tracer produces the cleanest SVG per asset type, and at what parameter settings? | Per-asset tuning guide + node-count benchmark table |
| [12c](./12c-svg-spec-features-for-assets.md) | The SVG 2 / CSS Masking / ARIA features a generator must emit correctly | What does a "production-grade" SVG actually need in its markup, and which SVGO defaults will silently break it? | Feature reference table + safe-for-interactive SVGO preset |
| [12d](./12d-llm-direct-svg-code-generation.md) | Frontier LLMs (Claude, GPT-5, Gemini) writing SVG source directly | When does LLM-authored SVG beat diffusion-then-trace, which model wins at what, and what prompt constraints move quality? | Model tiering + prompt-constraint patterns + validation pipeline sketch |
| [12e](./12e-hybrid-vector-pipeline-architectures.md) | Pipeline architecture: routing, quality gates, caching, commercial case studies | How do you combine A/B/C/D into a single production system, and where do you spend vs save money? | Decision tree + three reference blueprints + cost/caching layers |

Angles 12a and 12d are the two "generation" surfaces; 12b is the "raster escape hatch"; 12c is the "what must come out of any of them"; 12e is the "how do you wire it all together."

## Cross-Cutting Patterns

**Pattern 1 — LLM-first, diffusion-refined is the dominant 2024–2026 paradigm.** Chat2SVG (12a), StarVector-adjacent agent flows (12d), Jeremy Watt's Claude logo-designer skill (12e), and tryopendata labs' "Claude as a logo agency" all use the same basic shape: an LLM produces a semantically layered template, then optionally a diffusion or optimization step refines visual attributes. This is convergent, not coincidental — it matches how designers actually work (compose → refine) and gives our product a clean architectural seam.

**Pattern 2 — Native SVG primitives beat Bézier soup at every editability axis.** 12a's quality/usability matrix, 12b's benchmark table, 12c's `<symbol>`/`<use>`/`currentColor` advice, and 12d's "prefer `<circle>`/`<rect>`/`<polygon>` over `<path>`" prompt constraint all point the same direction: the right answer is not more control points, it is fewer elements with higher semantics. StarVector reducing everything to primitives is the single biggest reason it's more practical than SVGDreamer, even though SVGDreamer scores higher on visual-fidelity benchmarks.

**Pattern 3 — Path count is the free lingua-franca quality signal.** 12b publishes it as a tuning metric (vtracer target: 15–40 paths for a flat logo); 12d lists "code bloat / 6+ decimal places" as a ~60% failure mode; 12e formalizes it into the 5/60/600/1500 band gate. Every serious pipeline uses it. Designers use it too — it maps to "how many things am I looking at when I open this in Figma?"

**Pattern 4 — Constraint injection is the high-leverage prompt technique.** 12d calls it "constraint stack" (viewBox / stroke / color / element budget); 12e routes it into the prompt-to-asset layer per asset class; 12c backs it with spec-level "always emit X" rules. The consistent finding is that unconstrained prompts produce broken `viewBox`, 500-node path strings, and mixed-style drift; constrained prompts produce editable 6-primitive logos. This generalizes beyond SVG to the whole asset-generation product.

**Pattern 5 — LayerDiffuse is the quiet giant.** It appears in 12a (the academic line), but its most important use is in 12e's Pipeline C and in the PLAN's "transparent checkered box" failure mode. Any time the user's real intent is "asset with true alpha" — which is most "SVG logo" requests — LayerDiffuse → (optional vtracer) is the shortest path.

**Pattern 6 — Router > model, at every layer.** 12a ends with "prefer Chat2SVG for logos, StarVector for image→SVG, potrace/vtracer as last resort"; 12b ends with a `vectorize(mode=...)` dispatch API; 12d recommends intent-detection routing inside the enhancer; 12e puts a full decision tree at its center. Canva, Figma, Recraft all do the same. Our product inherits this as its top-level architecture.

## Controversies

**Native-vector diffusion vs raster-then-trace.** The strongest live debate in the category is whether the "right" 2026 pipeline starts with a vector-native model (Recraft V4 SVG, SVGFusion, Chat2SVG, StarVector) or with a raster model followed by vtracer/potrace. The evidence:

- **Pro native-vector**: Recraft V4 SVG returns editable paths with real gradients; vtracer cannot invent a `<linearGradient>` from a traced PNG without heuristic post-processing ([12b](./12b-raster-to-svg-tracers.md), [12e](./12e-hybrid-vector-pipeline-architectures.md)). SVGFusion (Dec 2024) scales to real-world SVG corpora via a VP-VAE + VS-DiT architecture, avoiding the slow SDS loop that made VectorFusion impractical. StarVector outperforms VectorFusion/SVGDreamer on SVG-Bench text-to-SVG.
- **Pro raster-then-trace**: The raster models (Flux, SDXL, Imagen, Nano Banana) are vastly better-funded and iterate faster than vector models; their aesthetic priors cover every style a user has ever seen; vtracer is free, deterministic, runs client-side in WASM, and gets >80% of cases right. Most shipped "SVG generator" SaaS in 2025–2026 is actually raster-then-trace under the hood.
- **Where they agree**: At the two ends of the spectrum. For monochrome silhouettes, potrace beats every vector model alive. For photoreal hero imagery, no vector path is appropriate — the raster model wins by default (and you shouldn't be making SVG anyway).
- **Our resolution**: The decision tree in 12e. Route native-vector-first for logos/icons/stickers (Pipeline A/B); route raster-then-trace when the brand has an existing raster aesthetic to match (Pipeline C); skip SVG entirely for OG/splash/hero (Pipeline D). Do not adopt a single-model ideology.

**Optimization-based vs code-based SVG.** A narrower version of the same fight inside academia. SVGDreamer and SVGCraft remain the fidelity SOTA but take 15–30 min on an A100 and produce SVGs with hundreds of unnamed Béziers. StarVector and Chat2SVG are faster, editable, and fit LLM tool-use flows but lose on raw pixel fidelity. We take the code-based side unambiguously: the latency, editability, and interface-shape arguments all point one way for a user-facing product.

**SVGO aggressiveness.** Should the default pipeline emit interactive-safe SVGO (keeps IDs, groups, titles, viewBox) or byte-optimized SVGO (merges paths, collapses groups, strips metadata)? 12c argues interactive-safe as the default; 12b argues that `floatPrecision: 2` alone halves file size with no visible difference and is strictly worth it. The consensus: always do the precision/number-rounding pass, never do the structure-destroying passes unless you know the asset is static and non-interactive.

**`<text>` in generated SVGs.** 12c says inline `<text>` is accessible, selectable, searchable, and i18n-friendly but unreliable outside browsers (Figma, macOS Preview, PowerPoint). 12d notes that LLMs asked for wordmarks occasionally misspell or duplicate characters. 12e's quality gate says "flag any `<text>` element". Pragmatic resolution: path-outline logos/wordmarks, inline text for UI labels that ship in the same HTML document as the font, never rely on `@font-face` portability outside browsers.

## Gaps

1. **No shared benchmark for our actual asset classes.** SVG-Bench (12a/12d) and SGP-Bench (12d) evaluate generic SVGs and symbolic reasoning, not brand-identity or platform-spec (iOS HIG, Material) correctness. The pelican-on-a-bicycle eval is useful but not calibrated to logos/icons/favicons specifically. We'll need our own eval harness, ideally a small curated set of briefs with human-scored gold SVGs.
2. **vtracer parameter auto-tuning is pre-production.** [`vtracer_autotune`](https://github.com/olivierroy/vtracer_autotune) (Oct 2025) does an SSIM-scored search over `color_precision` / `gradient_step` / `layer_difference` / `color_count` but is alpha-quality. Until it stabilizes, our pipeline must ship per-asset-class vtracer presets and accept some manual tuning.
3. **Transparency in LLM-SVG is underspecified.** 12a/12d/13 all discuss RGBA, but nobody has a clean story for "LLM emits an SVG whose background is transparent *and* the SVG renders correctly when placed on both light and dark themes without a `<rect fill="...">` backdrop". `currentColor` helps; a disciplined style test (render at 16/64/1024 px on `#000`, `#fff`, and `#888` backgrounds) is the closest thing to a guarantee.
4. **No shared open-source `vectorize(image, mode)` tool.** 12b argues for it; every pipeline in 12e assumes it; no repo ships it end-to-end. Building the thin dispatcher (potrace/vtracer/Recraft-/Vectorizer.AI/StarVector behind a single MCP tool surface) is a concrete, tractable contribution we can ship.
5. **Reference-image brand-style transfer is research-grade only.** VectorPainter (ICME 2025) exists but needs SD to run; Recraft's "style references" is the only production option and is a black box. A reliable "match this existing brand illustration" feature requires either hosting VectorPainter or paying Recraft — there is no cheap OSS middle.
6. **LayerDiffuse + vtracer is a known-good stack but undocumented as an end-to-end recipe.** 12a names it ("LayerDiffuse → vtracer is a surprisingly strong stack"); 12e wires it into Pipeline C; no single place publishes exact flags, prompts, and failure modes. This is a write-up opportunity we should own.
7. **Agent-side choice between LLM-SVG and Recraft is left to heuristics.** 12e's decision tree is prose; no implementation ranks confidence. A concrete "if intent ∈ {logo, icon, wordmark, favicon, diagram} and element-count-estimate ≤ 20 → Pipeline A" classifier would close the loop, likely as a small Claude/GPT routing call.

## Actionable Recommendations for Our Vector Pipeline

### High-level architecture

Build a single MCP tool surface — call it `generate_vector_asset(brief, asset_class, constraints)` — backed by a router that dispatches to four pipelines (A = LLM-SVG, B = Recraft native-vector, C = raster + vtracer, D = raster-only). The router mirrors 12e's decision tree. Expose `vectorize(image_path, mode='auto'|'bw'|'color'|'illustration'|'premium')` as a separate MCP tool so agents can vectorize uploaded rasters without memorizing tracer flags.

### Decision tree: when to use LLM-SVG vs Recraft vs vtracer

```
brief arrives, parsed into {asset_class, style, brand_colors, text?, transparency?}
│
├── asset_class ∈ {og_image, splash, hero, marketing_photo}?
│   └── Pipeline D: raster only (Flux / Nano Banana / gpt-image-1 + LayerDiffuse for alpha)
│       STOP — SVG is wrong format.
│
├── asset_class == "favicon"?
│   └── Pipeline A (LLM-SVG with viewBox="0 0 32 32", ≤4 elements)
│       Rasterize at 16/32 px; re-author, never downsize.
│
├── asset_class ∈ {logo, wordmark, monogram, line_icon, flat_glyph_app_icon, diagram, badge}
│   AND estimated_element_count ≤ 30
│   AND (text absent OR text is short + brand-safe)?
│   └── Pipeline A: Claude Sonnet/Opus 4.x (primary) or GPT-5 / Gemini 2.5 Pro (fallback)
│       • Inject constraint stack: viewBox, integer coords, element budget,
│         currentColor, stroke/fill mode, style ref ("Lucide outline, 2px"),
│         <title>/<desc>/role="img".
│       • Generate n=3–5 candidates in parallel at varied temperatures.
│       • Validate: xmllint → SVGLint → resvg render at 16/32/64/256/1024 px.
│       • Score: path count in [5,60], bbox fills >30% of viewBox, CLIPScore vs brief.
│       • If all fail twice → escalate to Pipeline B.
│
├── asset_class ∈ {spot_illustration, sticker, mascot, character, mid_complexity_vector_art}?
│   └── Pipeline B: Recraft V4 SVG / V4 Pro SVG (primary)
│       Fallback: self-hosted SVGFusion or IconShop (GPU required).
│       • Validate: parseable, path_count ≤ 600, render-vs-prompt CLIPScore.
│       • If text is part of the brief → Recraft over LLM-SVG (stronger typographic priors).
│       • If fails twice → Pipeline C.
│
├── brief has an existing raster brand style that MUST be matched
│   (LoRA, IP-Adapter ref, illustration style guide)?
│   └── Pipeline C: Flux.1 [schnell] or SDXL + LoRA → LayerDiffuse (if alpha needed)
│       → color-quantize k=4..8 → vtracer (poster or photo preset) → SVGO.
│       • Prompt template owns "flat vector illustration, bold outlines,
│         limited palette, plain background" — do not let user prompts leak.
│       • If path_count > 1500 → auto-reject; fall back to Recraft /vectorize
│         or Vectorizer.AI.
│
├── isolated raster upload with no generation step (scanned sketch, existing PNG)?
│   └── vectorize(mode=...) MCP tool:
│       • mode='bw' (silhouette/monogram): potrace, supersampled 2× binary,
│         turdsize=2 alphamax=1.0 opttolerance=0.2.
│       • mode='color' (flat logo): vtracer poster, color_precision=6,
│         gradient_step=24, filter_speckle=4, mode=polygon if geometric.
│       • mode='illustration' (gradient-heavy): vtracer photo + pngquant pre-quantize,
│         SVGO mergePaths.
│       • mode='premium': Recraft /images/vectorize ($0.01/call).
│
└── ambiguous → fan out A+B in parallel, score both, keep best. Log decision for learning.
```

### Implementation priorities (ordered)

1. **Ship Pipeline A first.** It's the cheapest (≈$0.003/asset on Claude/GPT), most iterable, and covers the biggest chunk of our brief distribution (logos/icons/favicons/diagrams). Bake the constraint stack into skill prompts, not user-facing UI.
2. **Bundle `vtracer-wasm` in the web client.** 133 KB WASM + Web Worker is invisible to users; gives us a free "here's your brand kit as PNGs → here it is as SVGs" conversion button and a no-backend fallback.
3. **Plug in Recraft V4 SVG + `/images/vectorize` as the paid escape hatches.** Gate behind a "High Quality" toggle or auto-escalate on Pipeline A/C failures.
4. **Ship LayerDiffuse as a raster-alpha subsystem.** Directly solves the PLAN.md "checkered box" failure. Every Pipeline D output that claims transparency goes through LayerDiffuse, not matte-after-the-fact; every Pipeline C input that needs transparency starts there.
5. **Build the quality-gate stack** (xmllint → SVGLint → resvg render matrix → path-count band → bbox-fill → optional CLIPScore/LLM-judge). This is 12e's "cheap, automatable" list; reuse it verbatim.
6. **Ship the SVGO safety preset from 12c**. Do not adopt upstream defaults. Per-asset-class configs (sprite / logo / animated-illustration / static-hero).
7. **Add prompt-hash + perceptual-hash caching early.** 60–85% spend recovery on realistic duplicate distributions.
8. **Defer SVGDreamer / SVGFusion self-hosting** until we have a real need and GPU budget. StarVector is the one academic model worth preloading now, because it's one `from_pretrained` call and solves image→SVG for free.

## Primary Sources Aggregated

### Papers

- Li, Lukáč, Gharbi, Ragan-Kelley. "Differentiable Vector Graphics Rasterization for Editing and Learning." *SIGGRAPH Asia 2020*. [arXiv:2005.00491](https://arxiv.org/abs/2005.00491).
- Frans, Soros, Witkowski. "CLIPDraw." *NeurIPS 2022*. [arXiv:2106.14843](https://arxiv.org/abs/2106.14843).
- Vinker et al. "CLIPasso: Semantically-Aware Object Sketching." *SIGGRAPH 2022*. [arXiv:2202.05822](https://arxiv.org/abs/2202.05822).
- Ma et al. "Towards Layer-wise Image Vectorization (LIVE)." *CVPR 2022*. [arXiv:2203.12780](https://arxiv.org/abs/2203.12780).
- Jain, Xie, Abbeel. "VectorFusion: Text-to-SVG by Abstracting Pixel-Based Diffusion Models." *CVPR 2023*. [arXiv:2211.11319](https://arxiv.org/abs/2211.11319).
- Iluz, Vinker et al. "Word-as-Image for Semantic Typography." *SIGGRAPH 2023*. [arXiv:2303.01818](https://arxiv.org/abs/2303.01818).
- Rodriguez et al. "StarVector." *CVPR 2025*. [arXiv:2312.11556](https://arxiv.org/abs/2312.11556).
- Xing et al. "SVGDreamer." *CVPR 2024*. [arXiv:2312.16476](https://arxiv.org/abs/2312.16476).
- Banerjee, Mathur et al. "SVGCraft." *CVPR 2024 Workshop*. [arXiv:2404.00412](https://arxiv.org/abs/2404.00412).
- Hu et al. "VectorPainter." *ICME 2025*. [arXiv:2405.02962](https://arxiv.org/abs/2405.02962).
- Zhang, Agrawala. "Transparent Image Layer Diffusion using Latent Transparency (LayerDiffuse)." *SIGGRAPH 2024*. [arXiv:2402.17113](https://arxiv.org/abs/2402.17113).
- Wu, Su, Liao. "Chat2SVG." *CVPR 2025*. [arXiv:2411.16602](https://arxiv.org/abs/2411.16602).
- "SVGFusion: Scalable Text-to-SVG Generation via Vector Space Diffusion." [arXiv:2412.10437](https://arxiv.org/abs/2412.10437).
- Qiu et al. "Can Large Language Models Understand Symbolic Graphics Programs?" (SGP-Bench). *ICLR 2025 Spotlight*. [arXiv:2408.08313](https://arxiv.org/abs/2408.08313).
- Xing et al. "LLM4SVG — Empowering LLMs to Understand and Generate Complex Vector Graphics." [Project page](https://ximinng.github.io/LLM4SVGProject/).
- Selinger. "Potrace: a polygon-based tracing algorithm" (2003). [potrace.sourceforge.net](https://potrace.sourceforge.net/).

### Specs and standards

- W3C — [SVG 2 CR](https://www.w3.org/TR/SVG2/), [SVG 1.1 SE](https://www.w3.org/TR/SVG11/), [Filter Effects 1](https://www.w3.org/TR/filter-effects-1/), [CSS Masking 1](https://www.w3.org/TR/css-masking-1/), [SVG Accessibility API Mappings](https://www.w3.org/TR/svg-aam-1.0/).
- MDN — [SVG reference](https://developer.mozilla.org/en-US/docs/Web/SVG).
- Chromium Bug [1067442](https://bugs.chromium.org/p/chromium/issues/detail?id=1067442) — SMIL deprecation status.
- Can I Use — [SMIL](https://caniuse.com/), filter, mask, clip-path matrices.

### Repos (OSS core)

- [BachiLi/diffvg](https://github.com/BachiLi/diffvg) · [ximinng/PyTorch-SVGRender](https://github.com/ximinng/PyTorch-SVGRender) · [ximinng/SVGDreamer](https://github.com/ximinng/SVGDreamer) · [ximinng/VectorFusion-pytorch](https://github.com/ximinng/VectorFusion-pytorch).
- [joanrod/star-vector](https://github.com/joanrod/star-vector) + HF [`starvector/starvector-8b-im2svg`](https://huggingface.co/starvector/starvector-8b-im2svg).
- [kvfrans/clipdraw](https://github.com/kvfrans/clipdraw) · [yael-vinker/CLIPasso](https://github.com/yael-vinker/CLIPasso) · [Shiriluz/Word-As-Image](https://github.com/Shiriluz/Word-As-Image) · [ayanban011/svgcraft](https://github.com/ayanban011/svgcraft) · [hjc-owo/VectorPainter](https://github.com/hjc-owo/VectorPainter).
- [layerdiffusion/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse).
- [kingnobro/IconShop](https://github.com/kingnobro/IconShop).
- [visioncortex/vtracer](https://github.com/visioncortex/vtracer) · [vtracer-wasm](https://www.jsdelivr.com/package/npm/vtracer-wasm) · [olivierroy/vtracer_autotune](https://github.com/olivierroy/vtracer_autotune).
- [autotrace/autotrace](https://github.com/autotrace/autotrace) · [jankovicsandras/imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) · [FHPythonUtils/SvgTrace](https://github.com/FHPythonUtils/SvgTrace).
- [svg/svgo](https://github.com/svg/svgo) · [scour-project/scour](https://github.com/scour-project/scour) · [simple-icons/svglint](https://github.com/simple-icons/svglint) · [linebender/resvg](https://github.com/linebender/resvg).
- [danielgatis/rembg](https://github.com/danielgatis/rembg) · [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet).

### Commercial APIs & docs

- Recraft API — [docs](https://www.recraft.ai/docs/api-reference/getting-started), [`/images/vectorize`](https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing), Replicate [recraft-v4-svg](https://replicate.com/recraft-ai/recraft-v4-svg) / [recraft-v4-pro-svg](https://replicate.com/recraft-ai/recraft-v4-pro-svg).
- Vectorizer.AI — [API](https://vectorizer.ai/api), [pricing](https://vectorizer.ai/pricing).
- Vercel AI SDK — [image generation](https://vercel.com/docs/ai-gateway/capabilities/image-generation/ai-sdk), [template](https://examples.vercel.com/templates/next.js/ai-sdk-image-generator).

### Benchmarks and practitioner sources

- Willison — [pelican-on-a-bicycle](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/), [six-months retrospective](https://simonwillison.net/2025/Jun/6/six-months-in-llms/), [simonw/pelican-bicycle](https://github.com/simonw/pelican-bicycle).
- SGP-Bench — [site](https://sgp-bench.github.io/) · SVG-Bench — [StarVector project](https://starvector.github.io/starvector/).
- Glaser — [Agentic Pelican on a Bicycle](https://www.robert-glaser.de/agentic-pelican-on-a-bicycle/).
- tryopendata labs — [Using Claude as a Logo Design Agency](https://labs.tryopendata.ai/teaching-claude-to-design-our-logo).
- Neonwatty — [AI logo generator (Claude Code skill)](https://neonwatty.com/posts/ai-logo-generator-claude-code).
- Houtini — [SVGs with Claude and Gemini MCP](https://houtini.com/how-to-make-svgs-with-claude-and-gemini-mcp/).
- SVGMaker — [AI-generated SVG precision issues](https://svgmaker.io/docs/tutorials/understanding-precision-challenges-in-ai-generated-svg-and-solutions).
- llmkube — [VecSmith weekend text-to-SVG](https://llmkube.com/blog/vecsmith-weekend-text-to-svg).
- VisionCortex — [vtracer docs](https://www.visioncortex.org/vtracer-docs).
- aisvg.app — [image-to-SVG converter guide 2025](https://www.aisvg.app/blog/image-to-svg-converter-guide).
- Sara Soueidan — [SVG coordinate systems series](https://www.sarasoueidan.com/blog/svg-coordinate-systems/); Chris Coyier — [Cascading SVG Fill Color](https://css-tricks.com/cascading-svg-fill-color/); Jake Archibald — [preserveAspectRatio posts](https://jakearchibald.com/).
