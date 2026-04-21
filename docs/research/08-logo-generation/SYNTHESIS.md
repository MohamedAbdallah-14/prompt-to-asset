---
category: 08-logo-generation
title: "Category Index — Logo Generation: what a prompt-to-asset must encode to ship real logos"
status: draft
last_updated: 2026-04-19
indexer: indexer-08
angles_covered:
  - 8a-logo-design-theory-and-brand-fundamentals
  - 8b-prompt-patterns-by-logo-style
  - 8c-text-rendering-in-logos
  - 8d-monograms-and-color-palette-control
  - 8e-svg-vector-logo-pipeline
audience:
  - prompt-to-asset skill authors (Claude/Codex/Gemini)
  - asset-pipeline engineers
  - master-synthesis agent
tags:
  - logo
  - identity
  - prompt-engineering
  - text-rendering
  - color-control
  - svg-pipeline
  - vectorization
  - transparency
---

# Category Index — 08 Logo Generation

## Category Executive Summary

A "logo generator" built on top of a general-purpose text-to-image (T2I) model is
not an image problem. It is a **re-framing, routing, and post-processing problem**
wrapped around a model that, by default, does the wrong thing. The five research
angles in this category converge on a dense set of priors that a prompt-to-asset
skill must encode before a single pixel is generated. The top 15 insights:

1. **A logo is a signature, not a picture.** Paul Rand's *"a logo doesn't sell,
   it identifies"* is the load-bearing prior; the naive user request ("a logo
   for my note-taking app") implicitly asks for illustration, while the
   designer answer is a reductive, typographically disciplined identifier that
   survives at 16 px and on a truck side (angle 8a).
2. **The bare word "logo" is a trap token.** In SDXL base, Flux.1 [dev], Imagen 3,
   and Gemini 2.5 Flash Image it reliably induces stock-image mockups that render
   the literal English text "LOGO" inside a circle or banner. Replace with `icon
   mark`, `brand mark`, `glyph`, `emblem`, `symbol`, or `wordmark` and negate
   typography (angles 8a, 8b).
3. **Seven categories, different failure modes.** Wordmark, lettermark, pictorial,
   abstract, mascot, combination, and emblem are *structural* commitments, not
   style labels. The prompt-to-asset must pick one before prompting; mascots and
   emblems have the weakest scalability, wordmarks the strictest typographic
   demands (angle 8a).
4. **Diffusion models have no "simplicity prior."** Training distributions skew
   detailed, so logos default to over-ornamented. The counter-prior is explicit:
   "reduced to its essence, high silhouette legibility, reads at 16 pixels,
   bold simple shape" (angle 8a; Henderson & Cote 1998).
5. **Optical correction is a human move, not a model move.** Mathematically
   symmetric marks look optically wrong; professional designers overshoot
   circles, lower triangle centroids, thin horizontals. AI-generated logos are
   *geometrically* correct and *optically* incorrect — one of the primary tells
   (angle 8a).
6. **Style-token leading beats "logo"-leading.** Prompt-head load-bearing tokens
   (`flat vector`, `geometric icon mark`, `monoline`, `negative-space emblem`)
   steer the model into mark-making space on the manifold. CLIP/T5 attention
   decays with distance from the start; bury style tokens at your peril
   (angle 8b).
7. **Each style family has ~3 load-bearing tokens.** Flat-vector needs `flat
   vector, solid colors, no gradient, white background`; isometric needs
   `isometric, 30-degree axonometric, three-tone shading`; monoline needs
   `single continuous line, uniform stroke weight, no fill`; negative-space
   needs `negative space, dual-meaning, figure-ground, silhouette`
   (angle 8b).
8. **Model-family phrasing matters more than the specific tokens.** Midjourney
   wants comma-separated tags + `--style raw --no`; SDXL wants dense keywords
   and aggressive negatives; Flux/Imagen want *prose* and punish keyword soup;
   Recraft and Ideogram expose explicit `style=` / `magic_prompt` controls that
   outperform prompt tokens (angle 8b).
9. **Text rendering is still the hardest subproblem and it is model-routed.**
   Ideogram 3, Recraft V3, Gemini 3 Pro Image ("Nano Banana Pro"), and
   GPT-Image-1.5 are production-grade for Latin wordmarks; Flux and Midjourney
   are draft-grade; Gemini 3 Pro + AnyText are the only realistic path for CJK;
   Arabic/Hebrew/Devanagari remain in the "generate the mark, typeset the name"
   fallback zone (angle 8c).
10. **Cap quoted strings at 5–6 words.** Ideogram's own docs, Midjourney's
    own docs, and every third-party benchmark converge on this number. Longer
    phrases require multi-render strategies or post-hoc retyping
    (angle 8c).
11. **No commercial T2I model obeys hex codes via prompt text.** The VIOLIN
    benchmark formalizes this as the "paradox of simplicity." Three controls
    actually work: Recraft's `controls.colors[{rgb:[r,g,b]}]` API parameter,
    IP-Adapter with a palette swatch in Style-Only mode, and Flux Pro
    Finetuning. Named palettes (Tailwind, Pantone, Material) beat hex strings
    every time for prompt-only pipelines (angle 8d).
12. **Color psychology is real but narrow.** Labrecque & Milne 2012 give
    defensible findings (red→exciting, blue→competent, pink→sincere) across
    four studies; Elliot & Maier 2014 explicitly warn against overreach.
    Encode hue + saturation + value, not hue names; validate WCAG 2.2 AA
    (4.5:1 body, 3:1 large/graphical) before treating anything as primary
    (angle 8a).
13. **The "golden ratio logo" is folklore.** Keith Devlin calls it "a
    150-year-old scam"; David Cole's Apple-logo debunk shows circles fit
    anything. Treat user requests for golden-ratio / Fibonacci construction
    as style signals (`clean, geometric, constructed-looking`), not literal
    constraints — forced φ-grids produce stiff, over-engineered marks
    (angle 8a).
14. **Transparency is lie-able.** Gemini 2.5 Flash Image, `gpt-image-1`
    (ChatGPT UI), and Imagen routinely ship a 16×16 checker pattern or a
    near-white fill when asked for a transparent PNG. Default architecture:
    generate on pure white, run BiRefNet / RMBG 2.0 matting with alpha-matting
    refinement, then flatten-to-white before vectorizing (angles 8d, 8e;
    cross-ref category 13).
15. **A logo ships as a family, not a PNG.** Canonical master = clean SVG;
    fanout = PNGs @{16,32,48,64,128,180,192,256,512,1024} + `favicon.ico`
    (16+32+48 bundled) + `apple-touch-icon-180.png` +
    `android-chrome-{192,512}.png` + `og-1200x630.png` + `logo.pdf` +
    `logo-{dark,light,monochrome}.svg`. The pipeline is Recraft-V3-SVG OR
    (Flux/Imagen → BiRefNet → vtracer → SVGO → resvg → sharp → png-to-ico)
    (angle 8e).

## Map of the Angles

The five angles compose as a V-shaped pipeline: priors on the left, model
selection in the middle, pixel-to-SVG mechanics on the right.

- **8a — Logo Design Theory and Brand Identity Fundamentals.** The *prior*.
  Paul Rand's "logo = signature", the seven-category taxonomy, the
  modernist five principles with their evidence base, optical correction,
  evidence-based color theory (Elliot & Maier 2014; Labrecque & Milne
  2012), negative-space compression, and AI failure modes mapped to the
  principle each violates.

- **8b — Prompt Patterns by Logo Style.** The *style→prompt* catalog. A
  12-row master table (flat, minimalist, geometric, gradient, isometric,
  3D, mascot, badge, monoline, line-art, negative-space, flat-vector-SVG)
  with core/supporting/kill tokens and best-fit models. 15 before→after
  rewrites, a designer/school signal-strength table, ten anti-patterns,
  and model-specific tuning for MJ v6/v7, SDXL, Flux, Recraft, Ideogram,
  Gemini/Imagen, DALL·E 3/gpt-image-1.

- **8c — Rendering Text Reliably Inside Logos.** The *wordmark routing*
  angle. Benchmarks across Recraft V3, Ideogram 3, Gemini 3 Pro Image,
  GPT-Image-1.5, Flux.1/2 Pro, Midjourney v7, AnyText, TextDiffuser-2,
  Imagen 4. Model-by-model canonical syntax; academic lineage (GlyphControl,
  TextDiffuser-2, AnyText, character-aware encoders); an 11-script A/B/C/D
  quality matrix; four production retyping recipes.

- **8d — Monograms and Color Palette Control.** The *hardest sub-genre* plus
  the *exact-color* angle. Why monograms corrupt strokes; junction
  vocabulary ("shared crossbar", "A nested inside D"); icon-only skeleton
  anchored on "single closed silhouette". Ten-tier ranking from Recraft's
  `controls.colors` (pixel-exact) through Flux Pro Finetune, IP-Adapter
  Style-Only, MJ `--sref`, named palettes, hex, RGB, qualitative names.
  Duotone/tritone/risograph/gradient templates.

- **8e — Full SVG Logo Pipeline.** The *mechanics* angle. Six-stage pipeline
  (Prompt → Generation → Matting → Vectorization → SVG Cleanup → Multi-format
  Export). Native-vector path (Recraft V3 SVG, StarVector, SVGDreamer,
  Chat2SVG) vs raster-first. Matting (rembg/BiRefNet/RMBG 2.0/SAM 2);
  vectorization (vtracer, potrace, LIVE, StarVector); SVGO recipe; resvg /
  sharp / png-to-ico fanout. Three reference repos (LogoLoom, Chat2SVG,
  Logomaker) and a 20-line bash recipe.

## Cross-Cutting Patterns

Five patterns surface in at least three of the five angles:

**P1 — Re-parameterize before prompting.** Every angle rejects the naive user
phrase as the prompt. 8a reframes illustration → identifier; 8b strips `logo`
and leads with a style token; 8c routes by script and logo type; 8d strips
palette words to Tailwind/Pantone names; 8e biases toward vector-friendly
outputs (flat colors, ≤4 spot colors, thick strokes). The enhancer's first
job is re-parameterization, not embellishment.

**P2 — Route, don't merge.** No single model dominates. Angles 8b, 8c, and 8d
all converge on a routing table: Recraft for brand-consistent wordmarks and
exact color; Ideogram for text-forward mockups; Gemini 3 Pro for CJK and
high-res multilingual; GPT-Image-1.5 for mixed-content long-phrase logos;
Flux for iconography that will be retyped; Midjourney v7 for artistic /
stylized moodboards; SDXL + ControlNet + IP-Adapter + LoRA for the local /
max-control ceiling. A well-built enhancer picks the model *from* the
rewritten prompt, not the other way around.

**P3 — Negate explicitly, and repeatedly.** Angles 8b and 8d emphasize that
models are terrible at single-word negation: `no text` alone loses half its
weight by mid-prompt. Spam variants: `no text, no letters, no words, no
wordmark, no typography, no gibberish letterforms, no secondary text, no
tagline`. In MJ use `--no text, typography, letters`; in SDXL use weighted
negatives `(text, letters, watermark, gradient:1.3)`; in Flux embed in prose
sentences.

**P4 — Treat AI output as a sketch, not a ship.** Angles 8c and 8e both land
on this. 8c: "never trust the AI-rendered text to be the final asset";
vector-ize, then swap for real type. 8e: vtracer → SVGO → resvg is where
correctness is manufactured. The enhancer should return a *pipeline state*,
not a file — prompt + model choice + post-processing plan + export targets.

**P5 — The alpha problem is shared across angles.** 8a (versatility requires
a mark that reverses on any ground), 8d (background-vs-foreground lock),
8e (matting stage with BiRefNet / RMBG 2.0 / alpha-matting refinement), plus
the cross-ref to category 13. The unified rule: *generate on pure white,
matte afterwards*. Never trust in-model transparency claims.

## Controversies

**C1 — The "logo" word trap.** 8b says substitute `icon mark` / `brand
mark` / `emblem`; 8c notes that text-aware models (Ideogram, Recraft)
handle the literal token fine. Resolution: strip `logo` from prompt-head;
drop entirely on SDXL/Flux/base Imagen, allow as descriptor on Ideogram/Recraft.

**C2 — Golden ratio / Fibonacci grid.** 8a calls it folklore; 8b lists
`golden-ratio grid, bauhaus` as a high-signal *style* token. Resolution:
treat user φ-grid requests as a vibe prompt (clean, constructed, geometric);
never emit construction instructions or retrofit a grid for "proof."

**C3 — Hex codes in prompts.** 8b: "rarely produces exact colors… models
approximate." 8d: hex sometimes works on Ideogram 2.0, Recraft, Flux.1 [pro],
but is far below `controls.colors` / IP-Adapter / named palettes. Resolution:
emit hex as a hint *and* carry the palette into a post-hoc recolor / Recraft
`controls.colors` step; never rely on prompt hex alone.

**C4 — Native vector vs raster-first.** 8e picks a hybrid (Recraft V3 SVG
first, fall back to raster → vtracer) but the research frontier (StarVector,
SVGDreamer, Chat2SVG) pushes toward native-vector by default. Resolution:
route by style — flat/monogram/simple symbol → Recraft V3 SVG; mascot /
gradient / 3D → raster-first → vtracer.

**C5 — Designer style anchors.** 8b shows Paul Rand / Saul Bass / Bauhaus
as strong anchors; Haviv, Scher, Chermayeff & Geismar are "absent from
model priors" even though 8a venerates their approach. Resolution: use
anchor names only when CLIP/T5 has signal for them; otherwise describe the
approach (geometric, reducible, timeless, modernist restraint).

**C6 — "Professional" / "corporate" / "4K 8K".** 8b calls them
counterproductive; they remain the most common user additions. Resolution:
silently strip and emit an era/school commitment instead (`swiss modernist`,
`1960s IBM`, `2020s saas restraint`).

## Gaps

The category-internal coverage is strong on prompt-level knowledge and
mechanics but has clear seams:

1. **No systematic evaluation framework specific to logos.** Angle 8c notes
   that published benchmarks are "directional, not a single-source
   leaderboard," and 8e explicitly calls quality comparison "the weakest
   link in the current open literature." The enhancer will need an internal
   eval rubric (e.g., silhouette legibility at 16 px, WCAG contrast,
   negative-space preservation, text OCR match) — cross-ref category 03.
2. **Trademark / IP collision detection.** 8a lists it as a failure mode
   but nobody addresses how to detect at generation time. Needs a reverse
   image search or CLIP-nearest-neighbor pass against a known-logo corpus.
3. **Cost-per-asset economics.** Angle 8e lists per-image costs scattered
   across vendors but not a unified $/asset table including Recraft
   `controls.colors` premium, Vectorizer.AI API at scale, or local-GPU
   amortization for BiRefNet/LayerDiffuse. A planner needs this.
4. **RTL scripts (Arabic, Hebrew) at production quality.** 8c's multi-script
   table is honest — D/C tier across the board. The "fallback plan" (generate
   mark only, typeset in a shaping engine) is correct but not wired into any
   open reference pipeline in 8e. Needs its own angle.
5. **Motion / animated logos.** None of the five angles touches Lottie,
   SMIL, CSS motion, or After Effects export. Modern identity systems
   routinely ship motion variants; likely belongs to a sibling category
   (10-ui-illustrations-graphics) but is logo-adjacent.
6. **Accessibility / cultural review.** 8a mentions WCAG and cross-cultural
   caution at a paragraph; no checklist, no automated test, no locale
   catalog. The enhancer should surface a brief cultural-sensitivity pass
   for non-target locales.
7. **On-brand scaling (logo-to-full-identity-system).** 8a explicitly notes
   the gap — "Gemini/DALL·E generate logos, not identity systems" — but the
   angle set does not cover how to propagate mark → spacing rules → lockup →
   variants. Belongs to category 15 (style-consistency-brand) but needs a
   hand-off stub here.

## Actionable Recommendations for the Logo-Generation Skill

The skill should expose one user entry point (a free-text request) and
internally execute a deterministic state machine. The four subsystems
that the five angles directly mandate:

### 1. Prompt rewriter rules (normalizer + re-parameterizer)

- **Strip trap tokens.** Remove or demote `logo`, `professional`, `corporate`,
  `4K`, `8K`, `masterpiece`, `high resolution`, `ultra detailed`. When
  the output model is Ideogram or Recraft, allow `logo` as descriptor only;
  for all others, substitute `icon mark` / `brand mark` / `glyph` / `emblem` /
  `symbol` / `wordmark` / `monogram` (angle 8b §1, §2, §6, §9).
- **Require a category commitment.** Detect or prompt for: wordmark,
  lettermark, pictorial, abstract, mascot, combination, emblem. Reject "all
  of the above" (angle 8a).
- **Lead with style tokens.** Emit 2–3 load-bearing tokens from the 8b
  style table at prompt-head. Forbid more than two designer/school anchors
  per prompt; pick from the strong column of the 8b anchor table
  (Bauhaus, Saul Bass, Paul Rand, Swiss) and fall back to approach
  descriptors when anchor is weak/absent.
- **Always append anti-hallucination fragment.** `no text, no letters,
  no wordmark, no typography, no gibberish letterforms, no secondary text,
  no tagline`. Adjust syntax by model family (8b §10, 8c §"anti-hallucination").
- **Translate palette requests.** Hex → Tailwind shade OR Pantone named
  color OR `controls.colors` payload. Desaturate/saturate by explicit
  HSL modifier. Validate WCAG 2.2 AA (4.5:1 body, 3:1 large/graphical)
  before treating any color as primary; flag failures back to the user
  (angle 8d Tier 3 §7, angle 8a color section).
- **Default background = pure white.** Never pass the user's literal
  "transparent" to models known to ship the 16×16 checker or near-white
  fill; route transparency to post-processing (8d, 8e).

### 2. Style picker (router from rewritten prompt to model + parameters)

Decision tree (in order, first match wins):

- `category == wordmark && script == Latin && words ≤ 6` → Recraft V3 OR
  Ideogram 3 (prefer Recraft if exact color/brand consistency matters,
  Ideogram for typographic variety).
- `category == wordmark && script ∈ {CJK}` → Gemini 3 Pro Image
  ("Nano Banana Pro") OR AnyText self-host.
- `category == wordmark && script ∈ {Arabic, Hebrew, Devanagari}` →
  generate mark-only via Flux/Recraft, then hand off to a shaping
  engine for the wordmark (HarfBuzz in Figma/Illustrator). Warn user.
- `category == mascot || style == 3D rendered` → Midjourney v6/v7 OR
  DALL·E 3 / gpt-image-1 (good 3D priors).
- `category == pictorial || style ∈ {flat vector, minimalist, geometric,
  monoline, line-art, isometric, flat-vector-SVG, negative-space}` →
  Recraft V3 SVG (native vector) preferred; Flux.1 [pro] fallback;
  SDXL + relevant LoRA (logo.redmond, vector-illustration, isometric,
  negative-space-logo-lora) for local.
- `category == monogram` → Ideogram 2.0/3 OR Recraft V3 (8d §"Per-model
  notes"). SDXL + ControlNet lineart + IP-Adapter Style-Only for exact
  junction control.
- `palette == exact brand hex` → Recraft V3 with `controls.colors`; else
  FLUX Pro Finetune or IP-Adapter Style-Only with a palette-swatch
  reference at weight 0.6–0.8.

### 3. Text-rendering routing (when wordmark text is present)

- Cap each quoted string at 5–6 words; split longer phrases across
  multiple quoted strings (Ideogram) or render separately and composite.
- Emit model-specific wrapper syntax:
  - Ideogram 3: `… with the text 'FOO' in <style>, <position>…`
  - Midjourney v7: `… text: "FOO", <style> --v 7`
  - Recraft V3: natural language with inline quotes + `style=vector_illustration`
  - GPT-Image-1.5: `The phrase "FOO" rendered in <classification+weight>,
    centered, crisp edges, optical alignment, pixel-perfect anti-aliasing`
  - Flux / Gemini 3 Pro / Imagen 4: prose, quote exact string early
- Never pass a trademarked font name as the primary control; translate
  "Helvetica-like" into classification (grotesque / humanist sans /
  transitional serif / slab / geometric) + weight (thin…black) + personality.
- Default downstream: **Recipe A — AI mark + human wordmark.** Generate
  mark only, vectorize, typeset wordmark in Inter/Söhne/GT America in
  Figma. Only run single-shot (Recipe B) when the user explicitly asks
  for a draft/mockup.

### 4. SVG pipeline (mechanical post-processing)

Encode the 8e six-stage pipeline as the default code path, with Recraft
V3 SVG as the short-circuit:

1. **Generation.** Recraft V3 SVG (skip stages 3–4) OR raster-first.
2. **Matting.** On raster outputs: detect checker pattern → replace with
   white → `rembg -m birefnet-general --alpha-matting
   --alpha-matting-foreground-threshold 240 --alpha-matting-background-threshold
   10 --alpha-matting-erode-size 10`.
3. **Flatten-to-white.** `Image.alpha_composite(white_bg, rgba).convert("RGB")`
   (vectorizers need opaque input).
4. **Vectorize.** Monochrome/lettermark → `potrace -b svg -a 1.0 -t 2`;
   2–16 color flat → `vtracer --mode spline --colormode color
   --filter_speckle 4 --color_precision 6 --layer_difference 16
   --corner_threshold 60`.
5. **Optimize.** SVGO `--multipass --precision 2 --enable=removeDimensions,
   cleanupIds,collapseGroups,mergePaths,convertPathData,removeUselessStrokeAndFill`;
   preserve animated IDs; `convertShapeToPath:false` if downstream animation.
6. **Fanout.** sharp from master SVG → PNGs at {16,32,48,64,128,180,192,
   256,512,1024}; `png-to-ico` bundling 16+32+48; CairoSVG or Inkscape for
   PDF; Satori + resvg-js for OG 1200×630; SVG DOM pass for dark/light/
   monochrome variants.

The pipeline should be pure, reproducible, and emit a manifest
(`logo.json`) listing all generated files with hashes so the skill can
re-run incrementally.

## Primary Sources Aggregated

### Academic / peer-reviewed

- Design / identity: Henderson & Cote, *Guidelines for Selecting or
  Modifying Logos*, J. Marketing 62(2), 1998; Van der Lans et al.,
  *Cross-National Logo Evaluation*, Marketing Science 28(5), 2009; Hekkert,
  Snelders & van Wieringen, *Most Advanced, Yet Acceptable*, Br. J. Psych.
  94(1), 2003.
- Color psychology: Elliot & Maier, Annual Review of Psychology 65, 2014;
  Labrecque & Milne, *Exciting Red and Competent Blue*, J. Academy of
  Marketing Science 40(5), 2012.
- Text rendering: GlyphControl (arXiv 2305.18259), AnyText (ICLR 2024,
  arXiv 2311.03054), TextDiffuser-2 (ECCV 2024, arXiv 2311.16465),
  character-aware encoders / TextPixs (arXiv 2507.06033).
- Generation models: Podell et al., *SDXL* (arXiv 2307.01952); Zhang et al.,
  *LayerDiffuse* (arXiv 2402.17113).
- Native vector: StarVector (CVPR 2025), SVGDreamer (CVPR 2024,
  arXiv 2312.16476), Chat2SVG (CVPR 2025), DiffVG (SIGGRAPH Asia 2020),
  LIVE (CVPR 2022).
- Color obedience: Yuan et al., *VIOLIN — Exploring the AI Obedience*
  (arXiv 2603.00166).

### Books / canonical essays

- Paul Rand, *Thoughts on Design* (1947 / Chronicle 2014).
- Paul Rand, *Logos, Flags, and Escutcheons*, AIGA 1991 —
  https://www.paulrand.design/writing/articles/1991-logos-flags-and-escutcheons.html
- Michael Bierut, *How To*, Harper Design 2015.
- Alina Wheeler, *Designing Brand Identity*, Wiley 5th ed. 2017.

### Vendor documentation

- Midjourney — docs, Text Generation, Style Reference (`--sref`, `--sw`) —
  https://docs.midjourney.com/
- Recraft — color palettes, API endpoints, V3 model page, vectorize endpoint —
  https://recraft.ai/docs, https://www.recraft.ai/docs/api-reference/endpoints
- Ideogram — Text & Typography prompting guide, v3 API reference —
  https://docs.ideogram.ai/, https://developer.ideogram.ai/
- OpenAI — image-generation cookbook, gpt-image-1.5 model docs —
  https://cookbook.openai.com/examples/generate_images_with_gpt_image,
  https://platform.openai.com/docs/models/gpt-image-1.5
- Google — Gemini API image generation, Gemini 3 Pro Image model card,
  Imagen 4 (Vertex AI) — https://ai.google.dev/gemini-api/docs/image-generation,
  https://deepmind.google/models/model-cards/gemini-3-pro-image/
- Flux.1 [dev] model card, Flux Pro Finetuning —
  https://huggingface.co/black-forest-labs/FLUX.1-dev, https://bfl.ai/blog/25-01-16-finetuning
- diffusers IP-Adapter — https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter
- ComfyUI Recraft Color RGB node —
  https://docs.comfy.org/built-in-nodes/partner-node/image/recraft/recraft-color-rgb

### Open-source tools (grouped)

- Vectorization & SVG cleanup — vtracer, potrace, autotrace, imagetracerjs,
  DiffVG, LIVE, StarVector, SVGO, scour, usvg.
- Matting — rembg, BiRefNet, BRIA RMBG 2.0, U²-Net, SAM 2, LayerDiffuse.
- Rasterization / export — resvg, resvg-js, CairoSVG, librsvg, sharp,
  png-to-ico, to-ico, Pillow, pyvips, Satori, pwa-asset-generator,
  capacitor-assets.
- Native-vector research — StarVector (CVPR 2025), SVGDreamer/SVGDreamer++
  (CVPR 2024), Chat2SVG (CVPR 2025), IconShop (SIGGRAPH Asia 2023),
  AnyText (ICLR 2024), TextDiffuser-2 (ECCV 2024).
- End-to-end reference repos — LogoLoom, Logomaker, Chat2SVG.
- (All primary GitHub/Hugging Face URLs are listed in their originating
  angles 8c and 8e — the master-synthesis agent should dedupe against
  those canonical reference tables.)

### Practitioner / case-study corroboration

- Rob Janoff Apple-logo interview, 9to5Mac 2018.
- Pentagram, MIT Media Lab identity (Bierut & Fay, 2014).
- Logo Histories, FedEx / Lindon Leader 1994.
- Brownlee, *The Golden Ratio: Design's Biggest Myth*, Fast Company 2015;
  Devlin, *The Myth That Will Not Go Away*, MAA.
- Simon Willison on vtracer (2024); aisvg.app vectorizer comparison;
  Bria RMBG 2.0 benchmark; Design Tools Weekly on AI logo vectorization.
- Community prompt corpora — Lexica logo search, Civitai logo-LoRA tag,
  PromptHero, Midjourney Showcase, r/StableDiffusion / r/midjourney threads.

### Cross-references to sibling categories

- `04-gemini-imagen-prompting`, `05-openai-dalle-gpt-image`,
  `06-stable-diffusion-flux`, `07-midjourney-ideogram-recraft` —
  deeper per-model priors feed the 8b/8c/8d routers.
- `13-transparent-backgrounds` — the checker-pattern fix and BiRefNet
  recipe referenced in 8d/8e.
- `14-negative-prompting-artifacts` — the anti-hallucination vocabulary
  for negatives.
- `15-style-consistency-brand` — IP-Adapter, LoRA, and Flux Pro Finetune
  for multi-asset brand locking.
- `16-background-removal-vectorization` — rembg/BiRefNet/potrace/vtracer
  shared with 8e.
- `18-asset-pipeline-tools` — pwa-asset-generator, capacitor-assets,
  icon-kitchen crossovers.
- `09-app-icon-generation`, `11-favicon-web-assets` — consumers of the
  8e fanout.
