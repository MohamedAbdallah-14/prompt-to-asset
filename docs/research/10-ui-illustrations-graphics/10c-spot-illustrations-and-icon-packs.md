---
category: 10-ui-illustrations-graphics
angle: 10c
title: "Spot illustrations and icon packs for UI: generating 50–200 consistent-style icons"
subtitle: "Outlined, filled, duotone, two-color — how design systems enforce consistency and how to get AI generation to respect those rules"
slug: 10c-spot-illustrations-and-icon-packs
status: research
last_updated: 2026-04-19
tags:
  - icons
  - icon-pack
  - ui
  - svg
  - lora
  - recraft
  - vectorization
  - svgo
  - design-systems
primary_sources:
  - https://lucide.dev/guide/design/icon-design-guide
  - https://tabler.io/icons/icon-design-guide
  - https://github.com/phosphor-icons/homepage/issues/514
  - https://www.ibm.com/design/language/iconography/ui-icons/design
  - https://developers.google.com/fonts/docs/material_symbols
  - https://recraft.ai/docs
  - https://github.com/visioncortex/vtracer
  - https://svgo.dev/docs/preset-default
  - https://arxiv.org/html/2503.10614v1
---

# 10c — Spot illustrations and icon packs for UI

Generating 50–200 icons that look like they were drawn by the same human is one of the
hardest small-scope problems in AI asset generation. A single logo only has to be
internally consistent. A two-icon pair only has to match its sibling. But a 120-icon
product pack has to survive thousands of visual comparisons the user's eye will make
as they navigate a UI — and any drift in stroke weight, corner radius, terminal style,
or metaphor makes the entire set look amateur.

This document maps the field: the conventions human icon systems follow, where AI
generation breaks those conventions, and the pipelines that can be built today to
produce brand-matched packs at the 50–200-icon scale.

## Executive summary

- **Every serious icon pack encodes the same four design primitives**: a fixed grid
  (almost always 24×24, sometimes 16 or 20), a fixed stroke weight (1.5 or 2 px),
  round vs. square joins/caps, and a fixed corner radius (usually 2 px). Everything
  else — outlined vs. filled, mono vs. duotone — is a variant of those primitives.
- **AI models drift on all four primitives simultaneously**, and the drift compounds
  across a 50-icon set. The fix is not prompt engineering alone; it is
  **constraint injection** (LoRA weights + style-reference images) plus a
  **deterministic post-processing pipeline** (vectorize → SVGO → normalize stroke).
- **The production-grade recipe in 2026 is hybrid**: Recraft's icon mode (or a
  Flux LoRA trained on 30–60 curated reference icons) for generation, vtracer or
  potrace for raster→SVG conversion, and an SVGO + custom-plugin pipeline that
  hard-enforces the stroke-width and viewBox conventions before export.

---

## Icon grid conventions

The human-designed icon packs the industry has converged on are remarkably uniform in
their geometry. Treat these as hard constraints your generation and post-processing
must satisfy — not as stylistic preferences.

### The 24×24 / 2 px canon (Lucide, Tabler, Feather)

Lucide, Tabler, and Feather are the reference implementations of the modern outlined
style. All three share a near-identical spec, documented in Lucide's
[Icon Design Guide](https://lucide.dev/contribute/icon-design-guide) and Tabler's
[Icon Design Guide](https://tabler.io/icons/icon-design-guide):

- **Canvas**: 24 × 24 px with a minimum 1 px padding on all sides (so the drawable
  area is 22 × 22).
- **Stroke width**: 2 px, centered (not inside/outside).
- **Line terminals**: `stroke-linecap="round"` and `stroke-linejoin="round"`.
- **Corner radius**: 2 px for shapes ≥ 8 px; 1 px for smaller shapes.
- **Element spacing**: 2 px minimum between distinct elements.
- **No fills**: Feather uses stroke-only; Lucide and Tabler are overwhelmingly stroke
  with rare filled sub-shapes.
- **Pixel-grid snap**: Anchor points and arc centers align to whole pixels for
  sharpness on 1× displays.

This spec is the default target for "outlined" generation. If you are building a
brand pack and have no other constraints, copy it verbatim.

### Heroicons' split-style approach (24 outline / 20 mini)

[Heroicons](https://heroicons.com) uses a slightly different convention that reflects
the Tailwind team's preference for reading well inside buttons and labels:

- **Outline** style: 24 px viewBox, **1.5 px** stroke (not 2).
- **Solid** style: 24 px viewBox, filled.
- **Mini** style: 20 px viewBox, filled — optimized for inline placement next to
  16–18 px text.

The 1.5 px outline weight is worth internalizing: for dense UIs (admin panels,
IDE-like products) a 2 px stroke can feel heavy, and Heroicons' tuning is a
well-established lighter alternative.

### Phosphor's six-weight system (16 × 16 base)

[Phosphor](https://phosphoricons.com) ships **six weights from a single source**:
Thin (0.5 px), Light (0.75 px), Regular (1 px), Bold (1.5 px), Fill, and Duotone.
Icons are authored at **16 × 16** using a keyshape system (an 11 × 11 centered
square, a 12 px centered circle) that every icon must align to
([design spec issue](https://github.com/phosphor-icons/homepage/issues/514)).

The six-weight idea is unusually powerful: it lets designers match icon stroke to
the type scale (Regular icons with Regular text, Bold icons for emphasis states).
If you need a pack that mirrors your font's weight axis, Phosphor is the reference
to copy.

### Material Symbols' variable-font axes

Google's [Material Symbols](https://developers.google.com/fonts/docs/material_symbols)
is the most sophisticated production icon system today. It ships as a single variable
font with four axes:

- **wght** (100–700): stroke weight.
- **FILL** (0 → 1): continuous outlined-to-filled transition, used for state changes.
- **GRAD** (−25 to 200): fine-grained thickness trim that preserves apparent size,
  designed for matching optical density to a text font's grade.
- **opsz** (20–48 dp): optical size — stroke auto-tunes as the icon scales.

This is a useful mental model even if you are not shipping a variable font: if you
want your pack to feel like Material, you must produce **parallel size variants
(16/20/24)** with the stroke recomputed, not just scaled.

### IBM Carbon's size-banded stroke

IBM's [Carbon](https://www.ibm.com/design/language/iconography/ui-icons/design)
explicitly scales stroke with canvas size — a very different philosophy from Lucide's
single-weight approach:

| Size | Stroke | Padding | Live area | Corner radius |
|------|--------|---------|-----------|---------------|
| 32   | 2 px    | 2 px    | 28        | 2 px          |
| 24   | 1.5 px  | 1.5 px  | 21        | 1.5 px        |
| 20   | 1.25 px | 1.25 px | 17.5      | 1.25 px       |
| 16   | 1 px    | 1 px    | 14        | 1 px          |

All strokes are **expanded to full pixel values** before export (Carbon treats
strokes as filled paths so rendering is identical across viewers). This eliminates
a whole class of rendering bugs where SVG `stroke-width` is applied inconsistently.

### Ant Design's 1024-based grid

Ant Design authors icons at **1024 × 1024** (a 16 × 64 grid) with **72 px line
width** and a **72 px corner radius**, then renders them down. Angles are snapped
to multiples of 45°. Two-tone variants are capped so the primary color covers
≤40 % of the icon area — a useful rule for any duotone pack, because exceeding 40 %
makes the "accent" read as the dominant color.

### What this means for prompts

When asking an AI model to generate an icon, the prompt should be explicit about
**all five of**: viewBox size, stroke width, cap/join style, corner radius, and
fill strategy. A prompt like `"icon for 'download', outlined, 24×24 viewBox,
2 px stroke, round caps, round joins, 2 px corner radius, no fill, single-color
black on transparent"` will outperform `"download icon, outline style"` by a
significant margin, and gives you a reference specification to check the output
against.

---

## Pack consistency techniques

Consistency across 50–200 icons is a compounding problem. Even a 90% per-icon match
rate produces a visibly chaotic set; the bar for a shippable pack is closer to 99 %
per-icon compliance.

### The four drift axes

Empirically, AI-generated icons drift along four axes (documented in both the
[ConsisLoRA paper](https://arxiv.org/html/2503.10614v1) and community reports on
SDXL/Flux icon LoRAs):

1. **Stroke-width drift**: the generator produces 1.7 px on some icons, 2.4 px on
   others. Worst inside enclosed shapes, where the stroke looks thicker because the
   enclosed area is darker.
2. **Corner-radius drift**: hard 90° corners on icon A, rounded 4 px corners on
   icon B. Raster generators are especially bad at this because corner radius is a
   sub-pixel concept.
3. **Terminal-style drift**: round caps on most icons, but suddenly a square cap
   appears. Caused by the model "interpreting" the icon's function (e.g. a scissors
   icon getting square terminals because blades are flat).
4. **Metaphor drift**: `"settings"` renders as a gear on icon 1, a slider on icon 2,
   a wrench on icon 3. This is the hardest to fix with pure generation and usually
   requires an explicit **icon vocabulary**.

### Icon vocabulary: noun → verb mapping

Before you prompt anything, write a vocabulary that locks the metaphor for every
action in your product. Smashing Magazine's
[iconography guide](https://smashingmagazine.com/2024/04/iconography-design-systems-troubleshooting-maintenance)
and [Adobe's icon-system essay](https://adobe.design/stories/design-for-scale/designing-design-systems-constructing-an-icon-system)
both emphasize this.

A minimal vocabulary entry is:

```yaml
- name: settings
  metaphor: gear (eight teeth, centered hole)
  synonyms: [preferences, configure, options]
  forbidden: [slider, wrench, cog-with-six-teeth]
  usage: top-right of authenticated views
```

With a vocabulary in place, the generator's job stops being "imagine an icon" and
becomes "draw this specific shape". Drift from the metaphor axis collapses because
every prompt now contains the metaphor lock (`"gear with exactly eight teeth and a
centered circular hole"`), not a free-form noun.

### Style spec + anchor image workflow

The [style-spec + anchor-image workflow](https://rephrase-it.com/blog/consistent-style-across-ai-image-generators-the-style-spec-a)
is the most reliable cross-model consistency pattern currently in the wild. It treats
style as two cooperating artifacts:

- A **text style spec** that is appended to every prompt: `"2 px uniform stroke,
  round caps and joins, 2 px corner radius, single black fill on transparent,
  no shading, no gradients, no text, centered in 24×24 viewBox"`.
- A **style anchor set**: 3–6 already-shipped icons from the pack, re-fed to the
  model as image references (via IP-Adapter for SD/Flux, or via Recraft's brand
  style, or via Gemini/Imagen's image-reference field). As new icons are
  generated and approved, they join the anchor set, which makes drift converge
  rather than compound.

### IP-Adapter and ConsisLoRA

For open-source pipelines (SDXL, Flux), two specific techniques help:

- **[IP-Adapter-Art](https://github.com/aihao2000/IP-Adapter-Art)** is a style-
  reference adapter descended from CSD (Content-Style Decomposition). Feed it
  3–5 reference icons and it provides a much tighter style lock than an
  image-to-image warmstart at comparable strength.
  > **Updated 2026-04-21:** The upstream `tencent-ailab/IP-Adapter` repo has not released a major new version (still v1/v2 checkpoint variants). ComfyUI IPAdapter Plus was set to **maintenance-only** mode as of April 14, 2025. For FLUX.2-native pipelines, prefer FLUX.2's built-in multi-reference support (≤10 refs) over external IP-Adapter adapters, which are not yet officially ported to FLUX.2.
- **[ConsisLoRA](https://arxiv.org/html/2503.10614v1)** (2025) specifically
  addresses the content-leakage problem in style LoRAs by predicting the original
  image rather than noise and by decoupling content and style training. For icon
  packs this matters because a standard style LoRA tends to "remember" the content
  of its training icons and leak those shapes into new generations.

---

## LoRA recipe for custom packs

A LoRA is the highest-leverage way to produce an icon pack that matches a brand
style you can't find in an off-the-shelf pack. Below is a production recipe drawn
from the [Flux Icon Kit LoRA](https://dataloop.ai/library/model/strangerzonehf_flux-icon-kit-lora/),
[IconsRedmond for SDXL](https://huggingface.co/artificialguybr/IconsRedmond-IconsLoraForSDXL),
and Modal's [FLUX.1-dev LoRA fine-tuning guide](https://modal.com/blog/fine-tuning-flux-style-lora).

### Dataset

- **30–60 curated reference icons** rendered as 1024 × 1024 PNGs on a solid
  background. Icons from a pack you are extending are ideal; second-best is
  3D/color illustrations from your brand that share the stroke/fill language.
- **Variety in content, uniformity in style** is the rule: at least 30 distinct
  nouns/verbs, but all obeying the same grid, stroke, and corner-radius spec.
- **No style words in captions.** Caption "a pair of scissors", not "a minimal
  outlined pair of scissors with rounded corners". Let the visual data teach the
  style; use a trigger token (e.g. `acme_icon`) in every caption to associate
  the style with a single handle.

### Training configuration

- **Network rank / dim**: 32–64 for simple outlined packs; 128 for richer
  duotone/filled styles. Higher rank overfits fast on small datasets.
- **Network alpha**: equal to rank, or rank/2 for gentler application.
- **Learning rate**: ~1e-4 for Flux-dev, ~4e-4 for SDXL (per Modal's and
  Replicate's defaults).
- **Steps**: 1,500–3,000 for 40-image datasets; monitor a fixed validation grid
  (same 6 prompts every eval step) to catch the moment style locks before it
  starts memorizing content.
- **Resolution**: train at 1024 × 1024 and downscale outputs; training at 512
  produces visibly softer stroke edges even after vectorization.

### Inference

- Apply the LoRA at **weight 0.7–0.9**. Full weight (1.0) often produces content
  leakage (recognizable shapes from the training set appearing in unrelated
  prompts).
- Combine with a **style spec in the prompt** for redundancy:
  `"acme_icon, a wallet, outlined, 2 px stroke, rounded corners, single black
  color on transparent background, centered in frame, 24×24 viewBox equivalent"`.
- Use **low-step schedules**: Flux Schnell at 4 steps or Flux-dev at 20 steps
  both produce cleaner icons than longer schedules, because the extra
  denoising steps add texture the vectorizer then has to discard.

### Evaluation loop

Treat the pack as a curation problem, not a one-shot generation. Generate 4–8
candidates per noun, then hand-pick. Plan for a **30–50 % reject rate** on the
first pass of any newly trained LoRA; this is normal and drops to 10–20 % after
two rounds of dataset additions.

---

## Post-processing pipeline

Even a well-tuned LoRA produces raster output with sub-pixel softness, inconsistent
stroke widths, and non-zero-backgrounds. Everything downstream of generation is a
deterministic pipeline whose job is to enforce the pack's spec whether or not the
generator complied.

### Recraft's vector-native path

> **Updated 2026-04-21:** Recraft V4 was released February 2026 and supersedes V2/V3. V4 ships four tiers: standard raster, V4 Vector (SVG, ~15 s/image), V4 Pro (2048×2048 raster), and **V4 Pro SVG** (2048×2048 native vector, ~45 s). The V4 Pro SVG model is recommended for complex icon sets requiring finer path geometry. Recraft remains the only major commercial model that produces true editable SVG from text prompts.

[Recraft](https://www.recraft.ai/docs) is currently the only major commercial model
that natively generates SVG output, and its dedicated icon mode is designed around
this consistency problem specifically. Recraft V4's vector tiers (V4 Vector and V4 Pro SVG)
maintain consistent line width, corner shape, and element spacing across a batch
of prompts rendered together in a single "set" — critical because intra-batch
variance is smaller than inter-batch variance.

If you are shipping a pack commercially and want the shortest path to a usable
result, start with Recraft's icon mode (use **V4 Vector** for standard icons, **V4 Pro SVG** for detail-heavy or large-format icons), use **Brand Styles** to upload 3–8 anchor
icons, and export as SVG. You still need the normalization pipeline below to
enforce stroke-width and viewBox compliance, but you skip vectorization entirely.

### Vectorizing raster output

For models that only produce raster (Imagen, DALL·E, most Flux/SDXL LoRAs), you
need a raster → SVG step. The three production-grade tools are:

- **[vtracer](https://github.com/visioncortex/vtracer)** (Rust): the current state
  of the art. Key parameters:
  - `--colormode bw` for single-color outlined icons; `color` for duotone.
  - `--mode spline` (smooth curves) vs. `polygon` (sharp) vs. `pixel` (pixel art).
  - `--filter_speckle N`: removes patches smaller than N pixels — set to 4–6 for
    1024 px icons to eat anti-aliasing noise without removing real shapes.
  - `--corner_threshold`: in degrees; 60° is a good start for icons with a mix
    of hard and soft corners.
  - `--segment_length`: short (3–4) for fine detail; longer (8–10) for smoother
    strokes on simple shapes.
  - Presets: `bw`, `poster`, `photo`. Start with `bw` for outline packs.
- **Potrace**: older, single-color only, but produces exceptionally clean curves.
  Good fallback for B&W glyph-style icons. `O n.n` turns the optimization
  tolerance knob; lower values preserve sharpness.
- **Adobe Illustrator's Image Trace**: the best quality if you already live in
  Adobe, with a CLI wrapper via ExtendScript, but not scriptable cross-platform.

The vtracer-to-SVG pipeline typically produces clean paths but with stroke as
**filled outlines** rather than true strokes. That is fine for rendering (it's
what Carbon does on purpose) but it prevents later stroke-width normalization.
If you need true strokes, run a centerline-tracing tool (like `centerline-trace`)
instead, or re-compute the skeleton via a medial-axis transform before export.

### SVGO + icon-specific normalization

Every icon gets piped through [SVGO](https://svgo.dev/docs/preset-default) with
the default preset plus icon-specific overrides. SVGO's default pass alone
strips comments, doctype declarations, editor metadata, and merges paths. For
icon packs specifically, use [Iconify's wrapper](https://iconify.design/docs/libraries/tools/icon/svgo)
which adds `cleanupSVG`, `keepShapes`, and `cleanupIDs` with a pack-wide prefix.

Custom normalization steps to run after SVGO (written as small scripts or as
custom SVGO plugins):

1. **Force a 24 × 24 viewBox** (`<svg viewBox="0 0 24 24">`). Scale the content
   in if needed.
2. **Set a single `stroke-width`** attribute on the root `<svg>` and strip it
   from children. This alone catches ~80 % of stroke-width drift.
3. **Set `stroke-linecap="round"` and `stroke-linejoin="round"`** on the root
   and strip from children.
4. **Remove `fill` from stroked paths**, set `fill="currentColor"` on filled
   paths (so themes can recolor).
5. **Round all coordinates** to 2 decimal places (SVGO's `cleanupNumericValues`
   does this but verify the precision is set).
6. **Remove any `<title>`, `<desc>`, and embedded fonts.**
7. **Reject icons whose bounding box is outside the live-area rectangle**
   (e.g. outside 2 px → 22 px range for a 24-grid pack). This is the single
   most important step and is surprisingly rarely done — it catches the
   "generator drew a 20 px icon floating in the top-left of a 24 px viewBox"
   failure mode.

A reasonable pipeline order is: generator → vtracer/potrace → SVGO default pass
→ custom normalization → visual review grid → accept/reject. File-size reductions
of 30–70 % from raw vtracer output are typical with SVGO alone.

### Visual review grid

The final manual step: render all 50–200 icons on a single 10-column grid at
24 × 24 and at 48 × 48. Most drift is invisible one-at-a-time and obvious in the
grid. This is the step the commercial generators (Recraft, IconsMint) hide
behind "preview" UIs, and it's the step you absolutely cannot skip if you want
the pack to feel designed rather than generated.

---

## References

### Primary design specs

- Lucide — [Icon Design Guide](https://lucide.dev/contribute/icon-design-guide)
- Tabler — [Icon Design Guide](https://tabler.io/icons/icon-design-guide)
- Feather — [design guidelines discussion](https://github.com/feathericons/feather/issues/171)
- Heroicons — [heroicons.com](https://heroicons.com), [v2.0.0 release](https://github.com/tailwindlabs/heroicons/releases/tag/v2.0.0)
- Phosphor — [Icon Grid System spec](https://github.com/phosphor-icons/homepage/issues/514)
- Material Symbols — [Google Fonts guide](https://developers.google.com/fonts/docs/material_symbols)
- IBM Carbon / IBM Design Language — [UI icons design](https://www.ibm.com/design/language/iconography/ui-icons/design)
- Ant Design — [Icons spec](https://ant.design/docs/spec/icon/)
- Remix Icon — [GitHub README](https://github.com/Remix-Design/RemixIcon/blob/master/README.md)

### AI icon generation and LoRA training

- Recraft — [Recraft V4 docs](https://www.recraft.ai/docs/recraft-models/recraft-V4) · [V4 Pro SVG on Replicate](https://replicate.com/recraft-ai/recraft-v4-pro-svg) · [vectorizing docs](https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing) · [icon generator](https://www.recraft.ai/generate/icons)
  > **Updated 2026-04-21:** Recraft V2 reference above is now stale. Current model is **Recraft V4** (February 2026). V4 Pro SVG is the recommended tier for icon packs requiring fine geometry at high resolution.
- Flux Icon Kit LoRA — [Dataloop listing](https://dataloop.ai/library/model/strangerzonehf_flux-icon-kit-lora/)
- IconsRedmond for SDXL — [Hugging Face](https://huggingface.co/artificialguybr/IconsRedmond-IconsLoraForSDXL)
- Modal — [Fine-tuning a FLUX.1-dev style LoRA](https://modal.com/blog/fine-tuning-flux-style-lora)
- Flux Schnell LoRA — [Replicate](https://replicate.com/black-forest-labs/flux-schnell-lora)
- ConsisLoRA — [arXiv:2503.10614](https://arxiv.org/html/2503.10614v1)
- IP-Adapter-Art — [GitHub](https://github.com/aihao2000/IP-Adapter-Art)
- IconsMint — [iconsmint.com](https://iconsmint.com/)
- AI Icon Maker — [icon-set-generator](https://ai-icon-maker.com/icon-set-generator)
- IconScout AI — [iconscout.com/ai](https://iconscout.com/ai)

### Vectorization

- vtracer — [GitHub](https://github.com/visioncortex/vtracer), [docs](https://www.visioncortex.org/vtracer-docs)
- Potrace vs vtracer comparison — [AISVG guide](https://www.aisvg.app/blog/image-to-svg-converter-guide)

### SVG post-processing

- SVGO — [preset-default docs](https://svgo.dev/docs/preset-default)
- Iconify Tools — [Optimising SVG guide](https://iconify.design/docs/libraries/tools/icon/svgo)

### Iconography and vocabulary

- Smashing Magazine — [Iconography in design systems: troubleshooting and maintenance](https://smashingmagazine.com/2024/04/iconography-design-systems-troubleshooting-maintenance)
- Adobe Design — [Constructing an icon system](https://adobe.design/stories/design-for-scale/designing-design-systems-constructing-an-icon-system)
- Designsystems.com — [Complete guide to iconography](https://www.designsystems.com/iconography-guide/)
- Rephrase — [Consistent style across AI image generators: Style Spec + Anchor Image](https://rephrase-it.com/blog/consistent-style-across-ai-image-generators-the-style-spec-a)
