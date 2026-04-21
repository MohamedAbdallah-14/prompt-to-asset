---
category: 12-vector-svg-generation
angle: 12d
title: "Programmatic SVG generation by LLMs: writing SVG code directly for logos, icons, and diagrams"
subagent: 12d
status: complete
tags:
  - svg
  - llm
  - claude
  - gpt
  - gemini
  - pelican-benchmark
  - prompt-engineering
  - icon-generation
  - logo-generation
  - code-generation
sources_tier:
  primary:
    - Simon Willison's pelican-on-a-bicycle blog posts
    - arXiv papers (SGP-Bench, StarVector, LLM4SVG, Chat2SVG)
    - Anthropic / OpenAI / Google official guidance
  secondary:
    - Practitioner blogs (tryopendata labs, Houtini, svgmaker.io)
    - GitHub repos (simonw/pelican-bicycle, sgp-bench, StarVector)
word_count_target: 2500
---

# Programmatic SVG generation by LLMs

## Executive Summary

A quiet but important capability has emerged in 2024–2026: frontier LLMs write SVG source code well enough to be *the preferred path* for a specific band of visual assets — simple logos, monochrome line icons, primitive diagrams, and abstract marks. This is distinct from every other generation pathway in this research. The model is not drawing pixels and hoping they vectorize; it is composing XML whose semantics it understands: `<circle>`, `<path d="...">`, `viewBox`, `stroke-width`. The output is editable, resolution-independent, small (1–3 KB), and free of the PNG-era failure modes (checkered alpha, JPEG ringing, raster traces with thousands of noisy nodes).

Three findings dominate the landscape:

1. **Claude is the consensus leader on direct SVG code generation.** Across Simon Willison's [pelican-on-a-bicycle informal benchmark](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/) and practitioner reports, Claude 3.5/3.7 Sonnet, Claude Sonnet 4.5, and Claude Opus 4.x consistently produce the most recognizable compositions with the cleanest, best-commented XML. Gemini 2.5/3 Pro is competitive on complex compositions; GPT-5 is strong but often more verbose and less well-structured.

> **Updated 2026-04-21:** The model landscape has continued to evolve. As of April 2026, the frontier models are Claude Sonnet 4.6 / Opus 4.6, GPT-5.4, and Gemini 3.1 Pro. Willison's pelican benchmark now uses an ELO-style leaderboard (500 GPT-4.1-mini-judged matchups). Claude Opus 4.x and GPT-5.1 with high reasoning continue to hold top-tier positions. A structured benchmark (MindStudio, 2026) covering icon/logo/animation tasks found GPT-5.4 strongest on data visualizations, Claude Opus 4.6 on technical diagrams and CSS animation syntax correctness, and Gemini 3.1 Pro lagging on SVG-specific tasks despite strong general benchmarks. The model tiering table below has been updated accordingly.

2. **The useful envelope is narrow but real.** LLM-direct SVG beats raster-then-trace for anything that is primarily *geometric* (logos, 24×24 line icons, favicons at ≤64 px, flowcharts, abstract marks, badges). It loses badly to diffusion models for anything requiring organic texture, complex shading, or photo-realistic reference.
3. **Prompt constraints are the single biggest quality lever.** Specifying `viewBox="0 0 24 24"`, a fixed stroke width, `currentColor`, element count budgets, and explicit style language ("Heroicons outline style", "Lucide-style 2px stroke") moves outputs from hobbyist to production-grade. Unconstrained prompts produce overly detailed, broken-viewBox, gigantic-coordinate paths that are the dominant failure mode.

## Why SVG is the LLM-native visual format

SVG is XML. LLMs are trained on enormous quantities of XML/HTML/code. Unlike PNG (which is opaque binary a model can only describe, never author), SVG is a white-box medium where every token the model emits has semantic meaning the model has seen millions of times. A `<circle cx="12" cy="12" r="10"/>` is no different, from the model's perspective, than a function call — and it is rendered deterministically by any browser or SVG viewer.

This has three consequences that structurally favor LLMs for a class of assets:

- **No rendering hallucination.** A diffusion model can produce a "logo" where the triangle's vertex quietly misses its corner by 3 px and the text "LOGO" has a third `G`. An LLM writing `<text x="50" y="50">LOGO</text>` cannot misspell the label.
- **Edit-safe output.** Every element is individually addressable. Dark-mode, brand-color recolors, and size changes are all single attribute edits rather than full regenerations.
- **Byte-level economy.** A clean LLM-generated logo is often 400–1,500 bytes. An equivalent traced PNG is typically 20–200× larger with unusable node soup.

Practitioners at [tryopendata labs report](https://labs.tryopendata.ai/teaching-claude-to-design-our-logo) designing a complete brand logo with Claude in ~1 hour using five SVG elements with flat fills, after spending an hour unsuccessfully with Gemini Imagen's raster outputs.

## Model Benchmarks

### Pelican on a Bicycle (Willison, 2024–2026)

[Simon Willison's pelican-on-a-bicycle benchmark](https://github.com/simonw/pelican-bicycle) is the most widely cited informal LLM SVG eval. The prompt is simply: *"Generate an SVG of a pelican riding a bicycle."* Willison chose the prompt because (a) both subjects are geometrically difficult, (b) the combination is implausible and therefore unlikely to be memorized, and (c) SVG comments expose the model's internal narration of what it *tried* to draw even when the rendering fails.

Approximate ranking as of mid-to-late 2025 (synthesized from Willison's posts, [GIGAZINE coverage](https://gigazine.net/gsc_news/en/20250609-llms-pelicans-on-bicycles/), and [Robert Glaser's agentic pelican article](https://www.robert-glaser.de/agentic-pelican-on-a-bicycle/)):

| Tier | Models | Observation |
|---|---|---|
| Top | Claude Sonnet 4.5, Claude Opus 4.1, Claude 3.7 Sonnet, Gemini 2.5 Pro, GPT-5.1 (high reasoning) | Recognizable pelican *and* bicycle; wheels round; seat positioned plausibly; some models (Opus 4.1, GPT-5.1 w/ reasoning) add mechanical detail like bicycle chains |
| Mid | GPT-4o, GPT-4.1, Claude Sonnet 4, DeepSeek-R1, DeepSeek V3, Llama 3.1 405B | Bicycle usually correct; pelican is often generic bird or duck-like |
| Lower | Llama 3.3 70B, GPT-4.1-nano/mini, Amazon Nova (especially Nova-micro), Cerebras Llama | Neither subject recognizable; geometric anarchy |

> **Updated 2026-04-21:** Willison's benchmark has evolved into a formal **ELO-based leaderboard** (500 GPT-4.1-mini-judged matchups, chess ELO scoring). Claude Sonnet 4.6 and Claude Opus 4.7 continue to appear in the top tier as of early 2026. GPT-5.4 and Gemini 3.1 Pro are also tracked. The leaderboard is live on GitHub ([simonw/pelican-bicycle](https://github.com/simonw/pelican-bicycle)) and updated with each major new model release.

Willison: *"I started it as a joke, but it's actually starting to become a bit useful."* The benchmark is particularly revealing because SVG comments let evaluators see failed intent — a model that writes a labeled-but-misplaced beak element is demonstrating compositional planning under a failed execution, which is a different failure mode than a model that just emits geometric noise.

### SGP-Bench (Qiu et al., ICLR 2025 Spotlight)

[SGP-Bench](https://sgp-bench.github.io/) — "Can Large Language Models Understand Symbolic Graphics Programs?" — ([arXiv:2408.08313](https://arxiv.org/abs/2408.08313)) — tests LLMs' ability to reason about SVG *without* rendering it. Models are asked semantic questions (counting, color, shape, spatial relationships) about graphics whose only input is their SVG source. The benchmark cuts across reasoning, color, counting, shape, and semantics, and the paper introduces Symbolic Instruction Tuning (SIT), which uses GPT-4o-generated instructions over symbolic programs to fine-tune weaker LLMs. Finding: models with stronger general reasoning (Claude 3 Opus, GPT-4, Gemini 1.5 Pro at the time of publication) outperform on SGP-Bench, and — critically — SIT tuning on symbolic programs improves *general* reasoning, suggesting the SVG-understanding skill is a legitimate probe of spatial cognition rather than a parlor trick.

### SVG-Bench (StarVector, Rodriguez et al., CVPR 2025)

[StarVector](https://starvector.github.io/starvector/) ([arXiv:2312.11556](https://arxiv.org/html/2312.11556v2)) introduces **SVG-Bench**, the most comprehensive vector-generation benchmark to date: 10 datasets spanning Image-to-SVG, Text-to-SVG, and diagram generation, scored on visual fidelity (MSE, DinoScore, LPIPS), path compactness, and semantic alignment. StarVector itself is a specialized VLM trained on the 2M-sample SVG-Stack corpus; on Text-to-SVG it outperforms both diffusion-based SVG methods (SVGDreamer, VectorFusion) and generic LLMs. For our purposes, SVG-Bench gives a defensible scoring rubric that can be reused to evaluate any LLM's raw output.

### SGP-GenBench and LLM4SVG

Follow-up work — [SGP-GenBench](https://www.emergentmind.com/topics/sgp-genbench) and [LLM4SVG (Xing et al.)](https://ximinng.github.io/LLM4SVGProject/) — addresses the "semantic ambiguity" problem: LLMs hallucinate vector primitives because path tokens are semantically opaque to them. LLM4SVG adds learnable semantic tokens so that fine-tuned models know what "circle" means operationally in coordinate space. This is the most credible route to closing the Claude-vs-specialized-model gap without giving up code editability.

### Head-to-head: Claude vs GPT vs Gemini

Practitioner comparisons converge on a consistent pattern:

- **Claude (3.5 Sonnet → Opus 4.x / Sonnet 4.6)**: Best *code quality* — small, commented, semantically grouped, uses primitives (`<circle>`, `<rect>`, `<polygon>`) in preference to complex path strings, embeds `currentColor`, often volunteers accessibility attributes. Best for brand logos, icons, and editable deliverables. [Houtini comparison](https://houtini.com/how-to-make-svgs-with-claude-and-gemini-mcp/).
- **GPT-5 / GPT-5.1 / GPT-5.4 with reasoning**: Competitive on compositional planning (especially with high reasoning budget), but tends to over-detail — 40+ path commands where Claude emits 6 primitives. More verbose, less tree-shakable output. Stronger when the task is diagram/flowchart with data structure behind it. Structured benchmarks (2026) show GPT-5.4 leading on data visualization SVG accuracy.
- **Gemini 2.5 / 3 Pro / 3.1 Pro**: Strong on scene composition (the pelican is undisputed, the bicycle is geometrically correct), but output tends to embed long raw path data rather than named primitives, which is harder to edit. Best for "illustrate this" rather than "design a brand mark." Gemini 3.1 Pro lags Claude and GPT-5.4 on SVG-specific generation tasks per 2026 structured comparisons despite strong general benchmark scores.

> **Updated 2026-04-21:** The 2026 frontier (Claude 4.6, GPT-5.4, Gemini 3.1 Pro) is significantly better than the 2024 baseline across all tiers. The *relative* ranking (Claude best code quality, GPT-5 best verbose diagrams, Gemini best scene composition) has held stable, though the gap between tiers has narrowed. All three now reliably produce a parseable, rendered SVG for simple icon prompts; quality differences emerge at complexity edges (mascots, multi-object scenes, animations).

## Best-Suited Asset Types

LLM-direct SVG is a good fit when the asset is **geometrically primitive, semantically planned, and edit-relevant**. It is a bad fit when the asset needs texture, organic shading, photoreal reference, or dense detail.

**Strong fit**
- Brand logos and wordmarks (flat, 3–8 elements, one or two colors)
- Line icons at 16/20/24/32 px (Heroicons, Lucide, Phosphor style)
- Favicons and tab icons (16 × 16, 32 × 32)
- Abstract marks: badges, shield crests, ribbons, simple monograms
- Flowcharts, system diagrams, architecture sketches (often as deliverable + mermaid fallback)
- Social share icons (Twitter/X, GitHub, LinkedIn glyph style)
- Simple infographics (bars, donuts, timelines drawn as primitives)

**Weak fit (prefer diffusion + vectorize, or Recraft/Ideogram native vector)**
- Illustrations with shading, gradients, or texture depth
- Characters/mascots with anatomy
- Anything photorealistic
- Dense marketing hero art
- Hand-drawn or sketch aesthetics (though Claude can imitate a sketch style in a lightweight way)

The general decision rule: *if a human designer could draft it on a napkin with a pen and a ruler, an LLM can almost certainly write it as SVG. If they'd need charcoal, an airbrush, or a tablet, the LLM cannot.*

## Prompt Constraint Patterns

Unconstrained prompts ("make me a logo for a note-taking app") produce the dominant failure modes: 500-node path strings, `viewBox="0 0 1024 768"` filled with coordinates like `d="M 347.8923 412.9128 ..."`, inconsistent stroke widths, mixed fill/stroke styles, and decimal-precision bloat. Constraints compress the solution space and push models toward their strongest output mode. Based on Anthropic's prompt engineering guidance and practitioner patterns from [svgmaker.io](https://svgmaker.io/), [Jeff Bullas' AI-SVG thread](https://www.jeffbullas.com/thread/how-can-ai-help-generate-scalable-svg-icons-that-look-great-on-every-screen/), and the [Rival minimalist logo evaluations](https://www.rival.tips/models/claude-opus-4.1/responses/claude-opus-4.1-minimalist-logo-svg), the following constraints move quality by more than any model upgrade:

### Geometry constraints
- Explicit `viewBox` — `viewBox="0 0 24 24"` for icons, `viewBox="0 0 64 64"` for favicons, `viewBox="0 0 400 400"` for logos. This alone prevents the "gigantic coordinates" failure mode.
- Coordinate precision cap — "Round all coordinates to integers" or "no more than 2 decimal places."
- Element count budget — "Use at most 6 primitive elements" or "Maximum 5 path commands per shape."

### Style constraints
- Stroke-only vs fill-only — "Outline icon, 2px stroke, no fills" (Heroicons outline) or "Solid fills only, no strokes" (Heroicons solid).
- `stroke-linecap="round"` and `stroke-linejoin="round"` — explicitly requested, otherwise icons look broken at small sizes.
- Color directive — `stroke="currentColor"` (inherits from CSS) or a single explicit brand hex. Refuse rainbow palettes unless the asset is intentionally multi-color.
- Style reference — "In the style of Lucide / Heroicons / Phosphor / Feather / Tabler." LLMs have seen these libraries extensively and imitate well.

### Structure constraints
- Primitive preference — "Prefer `<circle>`, `<rect>`, `<polygon>` over `<path>` where possible." Dramatically improves editability.
- Grouping — "Wrap logical parts in `<g>` with an `id` or `aria-label`."
- No external refs — "No `<image>`, no `<foreignObject>`, no external font imports, no data URIs."

### Accessibility constraints
- `<title>` and `<desc>` elements, or `aria-label` on the root `<svg>` — these are free-to-add and materially improve the asset's usefulness.

### Example: production-grade icon prompt

```
Write SVG code for a shield-with-checkmark icon.
Requirements:
- viewBox="0 0 24 24"
- stroke="currentColor", stroke-width="2", fill="none"
- stroke-linecap="round", stroke-linejoin="round"
- At most 2 elements: one <path> for the shield, one <path> for the check
- Integer coordinates only
- In the style of Lucide
- Include <title>Verified</title>
Output only the SVG, no explanation.
```

### Example: brand-logo prompt

```
Design a logo for a note-taking app called "Slate".
Requirements:
- viewBox="0 0 120 120"
- Exactly one primary mark (no wordmark)
- Maximum 5 primitive elements (<rect>, <circle>, <polygon>, or <path>)
- Single color: #1E1E1E with optional 1 accent color #F5A623
- Flat fills, no gradients, no filters, no shadows
- The mark should suggest both "paper" and "edge/slate"
- Output as clean, commented SVG
```

Practitioners who've built pipelines ([IcoGenie MCP](https://dev.to/albert_nahas_cdc8469a6ae8/how-i-built-an-mcp-server-for-ai-icon-generation-and-why-you-need-one-44b4), [svg-icon-generator Claude Skill](https://fastmcp.me/Skills/Details/1171/svg-icon-generator), [jezweb icon-design skill](https://playbooks.com/skills/jezweb/claude-skills/icon-design)) bake these constraints into the skill prompt rather than relying on users to remember them.

## Common Failure Modes

Drawing from [svgmaker.io's AI-SVG precision analysis](https://svgmaker.io/docs/tutorials/understanding-precision-challenges-in-ai-generated-svg-and-solutions) and StarVector's benchmark findings:

- **Geometric errors (~70% of unconstrained outputs)** — open paths missing `Z` commands, degenerate paths with zero-length segments, incorrect Boolean operations so elements cover each other.
- **Logical incoherence (~45%)** — elements in wrong Z-order, parts scattered outside the viewBox, missing groupings.
- **Code bloat / fragility (~60%)** — 6+ decimal places on every coordinate inflating files 40%+ for no visual gain; a single conceptual shape split across multiple `<path>` elements; nested `<g>` transforms with redundant translations.
- **Curve approximation over native primitives** — using 8 Bézier control points to approximate a circle instead of `<circle>`.
- **Broken viewBox / coordinate overflow** — content drawn at (500, 600) inside a `viewBox="0 0 100 100"`, producing apparently empty SVGs.
- **Mixed-style drift** — inconsistent stroke widths across elements of the same icon (1.5 px on one path, 2 px on another).
- **Text hallucinations** — though much rarer than in diffusion, LLMs asked for wordmarks occasionally misspell or duplicate characters in `<text>`.

Claude's specific weakness reported by practitioners is "utilitarian aesthetics" — its output is always correct and often elegant but rarely *surprising* in the way a diffusion model or a human designer can be. For a brand-distinctive mark, iteration or a specialized vector model (Recraft) usually wins.

## Validation Pipeline

A production pipeline that converts LLM SVG text into shippable assets should include four stages:

1. **XML well-formedness** — validate with `xmllint --noout`. Fails on malformed XML (unclosed tags, invalid entities). Fast and cheap; should always be first.
2. **SVG semantic lint** — [SVGLint](https://github.com/simple-icons/svglint) with rules for: allowed elements (reject `<image>`, `<script>`, `<foreignObject>`), attribute whitelist (reject inline event handlers, data URIs), viewBox presence, no hardcoded dimensions that fight CSS.
3. **Rasterization sanity check** — render with [resvg](https://github.com/linebender/resvg), [librsvg](https://wiki.gnome.org/Projects/LibRsvg), or headless Chromium/Playwright at target sizes (16, 24, 32, 64, 128 px). Flag if the bounding box of rendered content leaves the canvas or occupies <5% of it (broken viewBox symptom).
4. **Optimization + re-validation** — run [SVGO](https://github.com/svg/svgo) with a conservative preset to strip metadata, round coordinates, merge paths. Re-render and diff against the unoptimized raster (perceptual SSIM > 0.99) to confirm optimization didn't destroy the asset.

For visual-quality scoring of the design itself (not just correctness), use CLIP-based similarity between the rendered raster and the prompt text (as StarVector/SVG-Bench do), or a VLM judge (GPT-5/Claude/Gemini) scoring on a 1–5 rubric over: prompt alignment, composition, color use, and absence of artifacts. This last step can close an optimization loop: regenerate the weakest 20% of outputs with a tighter constraint prompt.

A library-level sketch of the pipeline (pseudo-code, avoid shell interpolation in real code):

```
function validateAndOptimize(svgText):
    assert xml_is_well_formed(svgText)             # libxml2 / xmldom, no shell
    assert svglint.check(svgText, rules).ok
    optimized = svgo.optimize(svgText).data
    png16, png32, png128 = resvg.render_sizes(optimized, [16, 32, 128])
    assert content_bbox_inside_canvas(png128)
    return { svg: optimized, pngs: {16: png16, 32: png32, 128: png128} }
```

## Integration Pattern for the Prompt Enhancer Product

The prompt enhancer's SVG path should treat LLM-direct generation as the *default route* for requests matching the "strong fit" list above, with these elements:

- Detect intent ("simple logo", "icon", "favicon", "diagram") and route to the SVG path instead of the diffusion path.
- Inject the constraint stack (viewBox, stroke, color, element budget) based on asset type rather than exposing it to the user.
- Validate with xmllint + SVGLint + resvg before returning.
- Offer a one-click "rasterize at 16/32/64/128/512" output for favicon/OG fallbacks.
- Offer a "regenerate stricter" button that tightens constraints (lower element budget, integer-only coordinates, single color) rather than retrying the same prompt.
- Keep a fallback to raster + vectorize (vtracer/potrace) for when the user insists on a complex illustration style.

## References

### Primary

- Willison, S. (2024). [Pelicans on a bicycle](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/). simonwillison.net.
- Willison, S. (2025). [The last six months in LLMs, illustrated by pelicans on bicycles](https://simonwillison.net/2025/Jun/6/six-months-in-llms/).
- Willison, S. GitHub repo: [simonw/pelican-bicycle](https://github.com/simonw/pelican-bicycle).
- Gally, T. (2025). [LLM SVG Generation Benchmark](https://simonwillison.net/2025/Nov/25/llm-svg-generation-benchmark/).
- Qiu, Z. et al. (2024). *Can Large Language Models Understand Symbolic Graphics Programs?* ICLR 2025 Spotlight. [arXiv:2408.08313](https://arxiv.org/abs/2408.08313). [Site](https://sgp-bench.github.io/). [GitHub](https://github.com/sgp-bench/sgp-bench).
- Rodriguez, J. A. et al. (2024). *StarVector: Generating Scalable Vector Graphics Code from Images and Text*. CVPR 2025. [arXiv:2312.11556](https://arxiv.org/html/2312.11556v2). [Site](https://starvector.github.io/starvector/).
- Xing, X. et al. (2024). *Empowering LLMs to Understand and Generate Complex Vector Graphics* (LLM4SVG). [Project page](https://ximinng.github.io/LLM4SVGProject/). [GitHub](https://github.com/ximinng/LLM4SVG).
- Xing, X. et al. (2024). *Chat2SVG: Vector Graphics Generation with LLMs and Image Diffusion Models*. [arXiv:2411.16602](https://arxiv.org/html/2411.16602v2).
- Xing, X. et al. (2024). *SVGDreamer: Text Guided SVG Generation with Diffusion Model*. CVPR 2024. [Project page](https://ximinng.github.io/SVGDreamer-project/).
- *SVGCraft: Beyond Single Object Text-to-SVG Synthesis*. [arXiv:2404.00412](https://arxiv.org/html/2404.00412v1).

### Secondary / practitioner

- Glaser, R. (2025). [Agentic Pelican on a Bicycle](https://www.robert-glaser.de/agentic-pelican-on-a-bicycle/).
- GIGAZINE (2025). [Running 'Draw a Pelican on a Bicycle' on various LLMs](https://gigazine.net/gsc_news/en/20250609-llms-pelicans-on-bicycles/).
- tryopendata labs. [Using Claude as a Logo Design Agency](https://labs.tryopendata.ai/teaching-claude-to-design-our-logo).
- Houtini. [How to Make SVGs with Claude and Gemini MCP](https://houtini.com/how-to-make-svgs-with-claude-and-gemini-mcp/).
- Rival. [Claude Opus 4.1 Minimalist Logo SVG](https://www.rival.tips/models/claude-opus-4.1/responses/claude-opus-4.1-minimalist-logo-svg).
- SVGMaker. [AI-Generated SVG Precision Issues](https://svgmaker.io/docs/tutorials/understanding-precision-challenges-in-ai-generated-svg-and-solutions).
- SVGMaker. [Why Text-to-Vector AI Creates Inconsistent Results](https://svgmaker.io/blogs/why-text-to-vector-ai-creates-inconsistent-results).
- Nahas, A. (2025). [Stop Hunting for Icons: AI-generated production-ready SVGs](https://dev.to/albert_nahas_cdc8469a6ae8/how-i-built-an-mcp-server-for-ai-icon-generation-and-why-you-need-one-44b4).
- FastMCP. [svg-icon-generator Claude Skill](https://fastmcp.me/Skills/Details/1171/svg-icon-generator).
- Jezweb. [icon-design Claude skill](https://playbooks.com/skills/jezweb/claude-skills/icon-design).

### Tooling

- [simple-icons/svglint](https://github.com/simple-icons/svglint) — SVG linter.
- [svg/svgo](https://github.com/svg/svgo) — SVG optimizer.
- [linebender/resvg](https://github.com/linebender/resvg) — fast, accurate SVG rasterizer.
- [xmllint](https://gnome.pages.gitlab.gnome.org/libxml2/xmllint.html) — XML validation.
