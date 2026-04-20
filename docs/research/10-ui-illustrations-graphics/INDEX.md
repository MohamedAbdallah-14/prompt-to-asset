---
category: 10-ui-illustrations-graphics
title: "Category 10 — UI Illustrations & Graphics: Synthesis & Map of the Angles"
indexer: category-indexer-10
date: 2026-04-19
status: synthesis
angle_files:
  - 10a-empty-state-onboarding-illustrations.md
  - 10b-hero-images-and-marketing-banners.md
  - 10c-spot-illustrations-and-icon-packs.md
  - 10d-3d-isometric-clay-glass.md
  - 10e-illustration-to-production-pipeline.md
dominant_theme: "consistency at scale — across sets, sessions, and surfaces"
related_categories:
  - 07-midjourney-ideogram-recraft
  - 12-vector-svg-generation
  - 13-transparent-backgrounds
  - 15-style-consistency-brand
  - 16-background-removal-vectorization
  - 18-asset-pipeline-tools
primary_models_referenced:
  - midjourney-v7
  - flux-1-dev-pro-ultra
  - flux-redux
  - sdxl
  - gpt-image-1
  - imagen-4
  - ideogram-3
  - recraft-v2-v3
  - gemini-2.5-flash-image
  - rodin-gen-2
  - meshy-v5
  - luma-genie
---

# Category 10 — UI Illustrations & Graphics

## Category Executive Summary

Illustrations are the connective tissue of modern software UI. A single polished product ships roughly **20–40 bespoke in-app illustrations** (empty states, onboarding, errors, success, feature explainers), **3–10 hero/marketing banners** across landing pages and announcements, **50–200 icons** in its design system, optional **3D spot graphics** for heroes, and animated variants (Lottie/Rive) of the busiest among them. Every one of them has to read as if drawn by the same hand — and the thing that makes this hard is not drawing any one of them, it is **drawing all of them in the same visual language**.

Across all five angles in this category (10a–10e), a single problem dominates: **consistency**. Consistency of palette, stroke weight, character design, composition, texture, aspect behavior, and even of the failure modes you allow — because a "95%-consistent" set of 50 icons still has 2–3 visible outliers, and users' eyes find them. The techniques for enforcing consistency are the same three families everywhere in the category: **style references** (`--sref`, IP-Adapter, Flux Redux, Recraft Brand Styles, Gemini/GPT-Image multi-image conditioning), **trained style adapters** (LoRAs on SDXL or Flux.1 [dev] via `ostris/ai-toolkit` or `kohya-ss/sd-scripts`, ConsisLoRA for content-leakage control), and **deterministic post-processing** (SVGO with icon-specific normalization, vtracer for raster→SVG, palette quantization to brand tokens). The commercial shortcut is **Recraft** (vector-native SVG output with saved Styles); the open-source path is **Flux LoRA + IP-Adapter + vtracer + SVGO**.

Twelve insights foundational for the prompt-to-asset skill:

1. **Consistency is the one problem.** Style, palette, stroke-weight, corner-radius, terminal-style, and metaphor drift compound. A 90%-consistent pack ships visibly chaotic; shipping bar is ≥99% per-asset compliance (10c).
2. **Style must be pinned durably, not re-prompted.** Every angle converges on freezing style as a reference-image bundle (3–10 anchors), a LoRA checkpoint, or a saved Recraft Style ID. Prose alone guarantees drift (10a §Consistency Techniques; 10c §Pack Consistency; 10d §Style References).
3. **Curated-library + bespoke-generative hybrid wins in 2026.** Start from a pack aesthetic (unDraw, Storyset, Humaaans, Open Peeps, Blush, DrawKit, Ouch, ManyPixels) to lock a direction, then generate net-new scenes via frozen style references. Pure library = too shared; pure generative = too drifty (10a §Style Library Catalog).
4. **Aspect ratio must be paired with a composition directive.** `--ar 16:9` alone guarantees a centered subject that destroys text overlays. Prompts must name focal region, text-safe zone, and edge-safe crop (10b Finding 1). Hero/banner generation is a distinct problem class — non-negotiable aspect, mandatory negative space, a small closed set of named 2024–2026 styles.
5. **The 2026 look is textured, not smooth.** Smooth AI gradients and glossy 3D blobs read as dated; winning treatments are film grain + halftone, hand-drawn imperfection, monochrome + single accent, and dark product-first. Smoothness is the new slop signal (10b Finding 3).
6. **Icon packs live on four primitives.** Fixed grid (24×24 canonical), fixed stroke (1.5 or 2 px), fixed cap/join (round-round), fixed corner radius (2 px). Prompts must name all five of {viewBox, stroke width, caps, joins, corner radius, fill strategy} (10c §Icon Grid Conventions).
7. **Metaphor drift is solved by a vocabulary, not a prompt.** Lock `settings → gear with exactly eight teeth and a centered circular hole` in `vocabulary.yaml`; every prompt then names a specific shape, not a free noun (10c §Icon Vocabulary).
8. **The 2024–2026 SaaS aesthetic has fragmented into ~8 named styles.** Dark product-first (Linear/Vercel), Vercel/Frame monochrome-grain, Stripe iridescent mesh, Supabase low-poly 3D, claymorphism, glassmorphism over gradient mesh, neo-brutalism/Swiss-grid, holographic chrome. Each has a reproducible palette + material + lighting + texture recipe (10b §Style Taxonomy; 10d §1).
9. **Production-fidelity 3D needs a hybrid pipeline.** Pure T2I "isometric 3D office" ships broken perspective ~60% of the time. Studios use Blender/Spline/C4D for geometry and Flux/SDXL only for a texturing img2img at denoise 0.25–0.40 driven by ControlNet-Depth (~0.6) and ControlNet-Normal (~0.4) (10d Finding 1).
10. **Clay/glass need material physics vocabulary; kill the orb with negatives.** Clay prompts collapse to Play-Doh without `matte subsurface scattering, velvet sheen, 0% specular`; glass collapses to frosted PNG rectangles without `frosted dielectric glass, Fresnel rim, caustics, IOR 1.45` (10d §3.3–3.4). The "AI glowing 3D orb" slop signal appears in ~40% of unguided Flux outputs; mitigate with `glowing orb, nebula, lens flare, stock 3d, chromatic aberration` negatives and concrete object references via `--cref`/IP-Adapter (10d §3.1).
11. **Model selection is driven by what the asset must carry.** Legible text ≤6 words → `gpt-image-1` / Ideogram 3. Cinematic no-text → Midjourney v7. Strict composition adherence → Flux 1.1 Pro / Imagen 4. Vector SVG delivery → Recraft v3 (only commercial option). Brand-consistent series → Flux Pro + `--sref` or Recraft saved Style (10b §Model Picks).
12. **A generated asset is half the work.** Format chain (AVIF/WebP/PNG), responsive framework wrappers (`next/image`, `<enhanced:img>`, `<NuxtImg>`, Astro `<Image />`), animation runtimes (dotLottie v2 over JSON Lottie; Rive for state machines), and a11y (`role="img"`+`<title>`/`<desc>`, `prefers-reduced-motion`, `prefers-reduced-data`) are where pipelines leak. `prefers-reduced-motion` is not optional and `lottie-web`/`rive-react` don't auto-respect it — wire it yourself and skip the fetch entirely for decorative reduced-motion (saves ~60 KB runtime) (10e §Format Matrix + §Accessibility).

## Map of the Angles

| Angle | Scope | Dominant deliverable | When to read |
|---|---|---|---|
| **10a** — In-app illustrations (empty states, onboarding, errors, success) | The 20–40 scene illustration-system problem. Style families (flat duotone, character-driven, editorial, isometric, hand-drawn, 3D clay/glass/brutal). LoRA vs IP-Adapter vs `--sref` decision matrix. Per-state prompt patterns. Production workflow (concept → vectorize → Figma → SVGR → Storybook). | Per-state prompt template library + failure/fix table | Building the core illustration system for a SaaS UI |
| **10b** — Hero images & marketing banners | Above-the-fold asset class: landing heroes, OG/social cards, announcement banners, release graphics, email headers. Aspect-ratio × composition table. 8-style 2024–2026 taxonomy with per-style prompt kernels. Model picks per requirement. Negative-prompt library. | Aspect/composition table + 8 style templates + decision tree | Building landing-page heroes, OG cards, launch graphics |
| **10c** — Spot illustrations & icon packs (50–200 icons) | The pack-consistency problem. Human design-system canons (Lucide/Tabler/Feather 24/2 px, Heroicons 1.5 px, Phosphor 6-weight/16 grid, Material Symbols variable-font axes, Carbon size-banded, Ant 1024-grid). Four drift axes. LoRA recipe (Flux Icon Kit, IconsRedmond, ConsisLoRA). SVGO+custom normalization pipeline. | Icon grid specs + LoRA+SVGO pipeline + drift taxonomy | Building a branded icon pack of 50–200 glyphs |
| **10d** — 3D, isometric, claymorphism, glassmorphism | Stripe/Linear/Framer-style premium 3D marketing graphics. Four registers (isometric, clay, glass, neo-brutal) with material-physics prompt kernels for MJ v7/Flux/SDXL. Hybrid pipelines: Blender→SD (texturing), Spline→Three.js (interactive), Meshy/Rodin/Luma→Blender (generated meshes). Failure taxonomy (glowing-orb, broken perspective, Pixar-plastic collapse). | Prompt kernels per register + hybrid pipeline tiers + brand reference list (Stripe/Linear/Framer/Arc/Clay/Raycast) | Building a 3D hero, clay spot graphic, or glass marketing card |
| **10e** — Illustration → production pipeline | Format decision matrix (SVG / AVIF / WebP / PNG / dotLottie v2 / Rive). Framework integration (Next.js, Astro, SvelteKit, Nuxt, SolidStart, plain HTML). Animation runtime wiring (Airbnb Lottie, dotLottie-web, rive-react, rive-webgl2). Accessibility (WCAG alt-text, `role="img"`+`<title>`/`<desc>`, `prefers-reduced-motion`, `prefers-reduced-data`, Rive focus handling). CDN patterns (Cloudinary `f_auto,q_auto`, imgix `auto=format,compress`, ImageKit `tr=f-auto`, Vercel `/_next/image`, Cloudflare Images, self-host imgproxy). JSON manifest for asset output contract. | Format matrix + framework table + a11y checklist + manifest schema | Wiring any generated asset into a real website |

Cross-references: 10a and 10c share the LoRA/IP-Adapter/`--sref` stack (10a §Consistency Techniques ↔ 10c §Pack Consistency + LoRA Recipe). 10b and 10d share the claymorphism/glassmorphism/neo-brutalism vocabulary (10b §Style Taxonomy ↔ 10d §1), with 10d going deeper on the 3D material physics. 10e consumes the outputs of 10a, 10b, 10c, and 10d and specifies the delivery contract. Recraft appears in every angle as the "shortest commercial path" default; Flux + LoRA appears in every angle as the "most controllable open-source path."

## Cross-Cutting Patterns — Consistency Is the Dominant Challenge

Every angle converges on the same five-part playbook.

**1. Freeze the style outside the prompt.** Style is pinned, in descending durability, as: (a) a **trained adapter** — LoRA on SDXL (`kohya-ss/sd-scripts`) or Flux (`ostris/ai-toolkit`), ranks 16–64, inference weight 0.7–0.9, ConsisLoRA for content-leakage control; (b) a **reference-image bundle** of 3–10 approved exemplars fed via IP-Adapter (`ip-adapter-plus`/`ip-adapter-style-plus`/`ip-adapter-faceid`), MJ `--sref <url> --sw`, Flux Redux, Recraft Brand Styles, or Gemini/`gpt-image-1` multi-image input — additive, so approved outputs rejoin the anchor set and cause drift to *converge* not compound (10c §Style Spec + Anchor Image); (c) a **text style spec** in `style.yaml` (palette hex, stroke px, cap/join, corner radius, aspect defaults, negatives), frozen and appended unchanged every time.

**2. Deterministic post-processing enforces what generation cannot.** Raster→vector via `vtracer` (spline, `--filter_speckle 4–6`, `--corner_threshold 60`) or `potrace`; Recraft short-circuits this with native SVG. SVGO default preset + icon-specific passes: force canonical viewBox, hoist `stroke-width` to root, set `stroke-linecap/linejoin="round"`, coerce fills to `currentColor`, quantize precision to 2 decimals, reject any icon whose bounding box falls outside the live-area rectangle. Palette quantization snaps fills to brand tokens. Tesseract OCR reject-pass catches baked-in "OOPS!"/gibberish text before ship. Finally, a 10-column visual review grid at native and 2× — drift is invisible one-at-a-time and obvious in the grid (10c §Visual Review Grid).

**3. Composition directives beat aspect flags.** `--ar 16:9` alone never produces overlay-ready layouts. Prompts must encode all five of: focal region ("subject in right third, 65% of frame"), text-safe zone ("left 45% low-contrast field"), subject safety margin ("critical subject within center 85%"), safe-area 70% for gutter/rounded-corner clipping in cards, and horizon on a third-line. Flux 1.1 Pro and Imagen 4 honor these best; MJ v7 partially; `gpt-image-1` most literally.

**4. Material physics vocabulary beats style labels.** For 3D, "claymorphism" / "glassmorphism" collapse to Pixar-plastic or flat frosted rectangles. Clay needs `matte subsurface scattering, velvet sheen, 0% specular, soft ambient occlusion`; glass needs `frosted dielectric glass, Fresnel rim, volumetric caustics, IOR 1.45, 15% surface roughness`. For flat styles, `tactile tech, film grain, halftone stipple, editorial restraint` counter the AI-smooth slop signal.

**5. The anti-slop clause is as important as the positive prompt.** The reusable union set: `text, letters, signage, watermark, extra fingers, extra limbs, realistic photo` (in-app vector); `stock photo, corporate handshake, AI slop gradient, 3D rendered blob, overbaked HDR, plastic shine, warped hands, gibberish text` (hero); `glowing orb, nebula, Pixar, DreamWorks, stock 3d, chromatic aberration` (3D). Kill the generic before requesting the specific.

## Controversies

The angles disagree in instructive ways.

1. **LoRA-first or reference-image-first for pack generation?** 10a's decision matrix says LoRA for "ongoing, 200+ assets" and `--sref`/Recraft Style for ≤20. 10c argues reference-image-first (Recraft Brand Styles + 3–8 anchor icons) is the production default for icon packs because a LoRA on 30–60 icons risks content leakage (ConsisLoRA paper). **Resolution**: default to reference-image; recommend LoRA only when drift exceeds what anchors can hold, or when the user needs offline/self-hosted reproducibility.
2. **Stroke philosophy: single-weight or size-banded?** Lucide/Tabler/Feather = single 2 px at every size (simple, heavy at 16 px). Carbon + Material Symbols = stroke scales with canvas (1→1.25→1.5→2 px). **Resolution**: default single-weight (more tractable for AI); recommend size-banded only for dense products (admin panels, IDEs) where 2 px at 16 px reads heavy.
3. **Alpha/transparency: model-native or matte-in-post?** 10a's flat-vector workflow trusts native transparent output via Recraft/vector conversion; 10d warns explicitly "do not trust native T2I alpha for 3D subjects" because clay/glass renders get halos and clipped shadows — render over `#F7F8FA` and matte via BRIA RMBG-2.0 or BiRefNet. **Resolution**: matte-in-post is the conservative production default for raster; native alpha is fine for vector-native pipelines and flat styles.
4. **Lottie vs Rive for animated illustrations.** 10e: Lottie/dotLottie v2 for single-state loops and branded motion (~60 KB runtime, <100 KB animations); Rive for state-driven interactive animation (200–400 KB runtime). Don't pay Rive's cost unless you need states.
5. **Text-in-illustration: render or composite?** 10a: always composite in the DOM; add OCR reject pass. 10b: `gpt-image-1` / Ideogram 3 can render ≤6 words reliably. **Resolution**: composite by default for in-app; allow baked text only for marketing banners ≤6 words via `gpt-image-1`/Ideogram 3, verified with OCR.

## Gaps

Where the category research does not yet cover enough for the prompt-to-asset to operate autonomously:

1. **Dark-mode pairing automation.** Every angle mentions light/dark variants but none provides a repeatable recipe for generating a correct dark companion from a light illustration — likely belongs in category 15 or 17.
2. **Animation prompting from scratch.** 10e covers runtime/delivery; no angle covers prompting an AI to produce a Lottie-ready AE project or a Rive state machine. Text-to-Lottie tools (LottieFiles AI, Aarva) are unsurveyed.
3. **Character identity across a carousel.** 10a flags this as the hardest consistency test but doesn't give a worked recipe for composing a character LoRA with a style LoRA at inference without catastrophic drift.
4. **Accessibility of 3D/interactive graphics.** 10e covers `prefers-reduced-motion` and Rive focus handling at a surface level; screen-reader descriptions of Spline/Three.js scenes and keyboard navigation patterns are unmapped.
5. **Cost-per-asset economics.** The category names the tools (Recraft/MJ/Flux/gpt-image-1/Imagen/Rodin/Meshy/Luma) but lacks a comparative dollars-per-asset table for pipeline recommendation.
6. **Localization / RTL composition.** Hero directives ("subject right-third, text left-third") assume LTR. No guidance on mirroring for Arabic/Hebrew or generating localized variants.
7. **Quantitative drift benchmarks + auto-grading.** 10c cites "30–50% reject rate" and "≥99% to ship" but proposes no structured metric (CLIPScore drift, LPIPS pairwise, palette-distance) for CI to auto-reject non-conforming outputs — partly belongs in category 03.

## Actionable Recommendations for Our Illustration Skills

The prompt-to-asset should expose three skill surfaces — **capture once, template per state, deliver per framework** — that operationalize the category's dominant insight: style is a durable artifact living outside the prompt, and production output is a pipeline, not a generation.

### Skill 1 — `illustration.capture-style-reference`

Turn the user's brand identity into a durable style anchor usable across every subsequent generation.

**Inputs**: 3–10 approved reference images, target renderer, optional brand palette and stroke spec.

**Behavior**:

1. **Classify** the dominant style register against the closed vocabulary from 10b §Style Taxonomy and 10d §1 (flat duotone, character-driven, editorial, isometric, clay, glass, neo-brutal, monochrome-grain, holographic chrome).
2. **Emit a durable anchor** matched to the renderer: Recraft Brand Style ID; MJ `--sref <url> --sw 150–300` (start at 200); Flux/SDXL IP-Adapter bundle at scale 0.6–0.8 (`ip-adapter-plus` or `ip-adapter-style-plus`); `gpt-image-1` / Gemini 2.5 Flash Image inline multi-image conditioning.
3. **Write `style.yaml`** at repo root with frozen style block, palette hex, stroke width, corner radius, linecap/join, safe-area %, per-intent aspect defaults, negative-prompt list, and pointers to the anchor bundle and any renderer-specific style ID.
4. **Upgrade path**: when reference-image anchors drift, surface the LoRA recipe from 10a §LoRA (Flux: `ostris/ai-toolkit`, rank 16–32, 1500 steps, weight 0.7–0.9 at inference; SDXL: `kohya-ss/sd-scripts`, rank 16, 1e-4 LR) plus dataset requirements (15+ for SDXL style, 30–60 for a Flux icon pack) and a ConsisLoRA option for content-leakage control.

### Skill 2 — `illustration.per-state-template-library`

Emit the complete prompt for any named illustration state, with the frozen style block interpolated.

**Closed state vocabulary**, aligned with 10a §Per-State Prompt Patterns and 10b §Prompt Templates:

- Empty: `no-data`, `no-search-results`, `inbox-zero`, `no-notifications`, `setup-required`
- Onboarding: `welcome`, `feature-walkthrough-[1..n]`, `permission-prompt`, `first-run`
- Errors: `404-not-found`, `500-server`, `offline`, `rate-limited`, `forbidden`, `expired-session`
- Success: `task-complete`, `upgrade-confirmed`, `payment-success`, `milestone`
- Marketing: `hero-desktop`, `hero-cinematic`, `og-card`, `linkedin-card`, `twitter-large-card`, `email-header`, `release-banner`, `feature-announcement`
- 3D: `clay-hero`, `glass-hero`, `isometric-hero`, `holographic-hero`, `brutal-card`
- Spot: `icon-24`, `icon-20-mini`, `icon-16`, `spot-illustration-128`

**Behavior**: load `style.yaml` → select the canonical template from 10a/10b/10d → interpolate `{style_block}`, `{subject}`, `{aspect}`, `{safe_area}`, `{palette}` → append composition directive from 10b §Aspect Ratio Table (focal region, text-safe zone, edge-safety) → append universal suffix and anti-slop negatives (union of 10a/10b/10d negative blocks) → translate flags per renderer (`--ar` → `size=` → `aspectRatio=`) → emit validation contract (OCR reject, palette quantization, aspect validate, bounding-box-within-live-area for icons, safe-area-70% for illustrations).

**Renderer defaults** (10b §Model Picks): legible text ≤6 words → `gpt-image-1` / Ideogram 3; cinematic no-text → MJ v7; strict composition → Flux 1.1 Pro / Imagen 4; brand-consistent series → Flux Pro + `--sref` or Recraft saved Style; SVG deliverable → Recraft v3; full-fidelity 3D hero → escalate to 10d §2.1 or §2.3 hybrid pipeline (not pure T2I).

### Skill 3 — `illustration.production-delivery-format`

Turn a generated asset into a production-ready delivery bundle (format chain + framework wrapper + a11y metadata + motion policy).

**Inputs**: asset path(s), intent (closed state vocabulary), framework, optional motion requirement, optional CDN provider.

**Behavior** (per 10e):

1. **Format chain**: flat vector → SVG via SVGR / inline; raster hero → AVIF (q=60–70) + WebP (q=80) + PNG/JPEG fallback at widths `[420, 640, 828, 1080, 1280, 1920, 2560]`; looping motion → dotLottie v2 + poster frame; interactive motion → Rive `.riv`; user-generated → CDN-transformed (Cloudinary `f_auto,q_auto` / imgix `auto=format,compress` / ImageKit `tr=f-auto`).
2. **Post-processing**: SVG through SVGO default preset + the 7 icon-specific normalizations from 10c §SVGO (force viewBox, hoist stroke-width, set linecap/join, strip text nodes, coerce fills to `currentColor`, round precision to 2 decimals, bounding-box reject); raster through `sharp` with EXIF strip and embedded `width`/`height`; Lottie through `lottie-json-optimizer` → `@lottiefiles/dotlottie-js` → poster export.
3. **Framework wrapper** from 10e §Framework Integration Table: `next/image` with `formats: ['image/avif','image/webp']`, Astro `<Image />`/`<Picture />`, SvelteKit `<enhanced:img>`, Nuxt `<NuxtImg>`, or `<picture>` for plain HTML; SVGR for SVG components; `@lottiefiles/dotlottie-react|svelte|vue|solid` or `@rive-app/react-webgl2` for motion.
4. **Accessibility**: derive alt from intent + subject; mark decoratives `alt=""` + `role="presentation"`; for inline SVG auto-inject `role="img"` + `<title>` + `<desc>`; for animation generate the `usePrefersReducedMotion` hook and poster-swap (or skip-fetch under `prefers-reduced-data`); default `autoplay: false` under reduced-motion; Rive inputs must be wrapped in `<button>` or given `role="button" tabindex="0"` + keyboard handlers.
5. **Emit the JSON manifest** per 10e §Pattern with `id`, `intent`, `formats{avif,webp,png,svg,lottie}`, `poster`, `width`, `height`, `alt`, `decorative`, and `reducedMotionBehavior` (`swap-poster` | `skip-fetch` | `none`).
6. **Optional CDN wiring** (Cloudinary / imgix / ImageKit / Vercel / Cloudflare Images / self-host imgproxy) per 10e §CDN Patterns when the asset is user-generated or build-time bundling is not feasible.

## Primary Sources Aggregated

Consolidated from 10a–10e; deduplicated.

**Curated libraries**: unDraw <https://undraw.co/> · Humaaans <https://www.humaaans.com/> · Open Peeps <https://openpeeps.com/> · Storyset <https://storyset.com/> · ManyPixels <https://www.manypixels.co/gallery> · Blush <https://blush.design/> · Icons8 Ouch <https://icons8.com/illustrations> · DrawKit <https://www.drawkit.com/> · Popsy <https://popsy.co/> · Lukasz Adam <https://lukaszadam.com/illustrations>.

**Icon design specs**: Lucide <https://lucide.dev/contribute/icon-design-guide> · Tabler <https://tabler.io/icons/icon-design-guide> · Feather <https://github.com/feathericons/feather/issues/171> · Heroicons <https://heroicons.com> · Phosphor <https://github.com/phosphor-icons/homepage/issues/514> · Material Symbols <https://developers.google.com/fonts/docs/material_symbols> · IBM Carbon <https://www.ibm.com/design/language/iconography/ui-icons/design> · Ant Design <https://ant.design/docs/spec/icon/> · Remix Icon <https://github.com/Remix-Design/RemixIcon> · Material 3 Illustration <https://m3.material.io/styles/illustration/overview>.

**Commercial AI generation**: Recraft <https://www.recraft.ai/>, <https://www.recraft.ai/docs> · Midjourney v7 + Style Reference <https://docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference> · Ideogram <https://about.ideogram.ai/> · OpenAI gpt-image-1 <https://platform.openai.com/docs/guides/images> · Google Imagen (Vertex) <https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview> · Flux (BFL) API <https://docs.bfl.ml/> · Flux.1 Tools (Redux/Fill/Depth/Canny) <https://blackforestlabs.ai/announcing-flux-1-tools/>.

**Style-control & training**: LoRA paper <https://arxiv.org/abs/2106.09685> · IP-Adapter paper <https://arxiv.org/abs/2308.06721> · IP-Adapter repo <https://github.com/tencent-ailab/IP-Adapter> · IP-Adapter-Art <https://github.com/aihao2000/IP-Adapter-Art> · ConsisLoRA <https://arxiv.org/html/2503.10614v1> · ostris/ai-toolkit <https://github.com/ostris/ai-toolkit> · kohya-ss/sd-scripts <https://github.com/kohya-ss/sd-scripts> · XLabs-AI/x-flux <https://github.com/XLabs-AI/x-flux> · HF Diffusers LoRA guide <https://huggingface.co/docs/diffusers/en/training/lora> · Modal Flux LoRA <https://modal.com/blog/fine-tuning-flux-style-lora> · Flux Icon Kit LoRA <https://dataloop.ai/library/model/strangerzonehf_flux-icon-kit-lora/> · IconsRedmond SDXL <https://huggingface.co/artificialguybr/IconsRedmond-IconsLoraForSDXL> · Civitai <https://civitai.com>.

**3D generation**: Rodin Gen-2 <https://developer.hyper3d.ai/api-specification/overview> · Meshy <https://www.meshy.ai/> · Luma Genie <https://lumalabs.ai/genie> · Spline <https://spline.design>, <https://github.com/splinetool/react-spline> · ControlNet <https://github.com/lllyasviel/ControlNet>.

**Vectorization & SVG**: vtracer <https://github.com/visioncortex/vtracer> · potrace <https://potrace.sourceforge.net/> · SVGO <https://github.com/svg/svgo>, <https://svgo.dev/docs/preset-default> · Iconify SVGO wrapper <https://iconify.design/docs/libraries/tools/icon/svgo> · SVGR <https://react-svgr.com/>, <https://www.npmjs.com/package/@svgr/webpack>.

**Animation runtimes**: Airbnb Lottie <https://airbnb.io/lottie/>, <https://github.com/airbnb/lottie-web> · LottieFiles developers <https://developers.lottiefiles.com/> · dotLottie v2 spec <https://dotlottie.io/spec/2.0/> · `@lottiefiles/dotlottie-web` <https://github.com/LottieFiles/dotlottie-web> · Rive runtimes <https://rive.app/docs/runtimes> · rive-react <https://github.com/rive-app/rive-react>.

**Formats & framework integration**: WebP <https://developers.google.com/speed/webp> · libavif <https://github.com/AOMediaCodec/libavif> · sharp <https://sharp.pixelplumbing.com/> · Squoosh <https://github.com/GoogleChromeLabs/squoosh> · Next.js Image <https://nextjs.org/docs/app/api-reference/components/image> · Astro images <https://docs.astro.build/en/guides/images/> · `@sveltejs/enhanced-img` <https://github.com/sveltejs/kit/tree/main/packages/enhanced-img> · `@nuxt/image` <https://image.nuxt.com/>.

**Accessibility**: W3C WAI decorative <https://www.w3.org/WAI/tutorials/images/decorative/> · MDN `prefers-reduced-motion` <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion> · MDN `prefers-reduced-data` <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-data> · WebAIM alt text <https://webaim.org/techniques/alttext/>.

**CDN / delivery**: Cloudinary <https://cloudinary.com/documentation> · imgix <https://docs.imgix.com/> · ImageKit <https://imagekit.io/docs/> · Vercel Image Optimization <https://vercel.com/docs/image-optimization> · imgproxy <https://imgproxy.net/>.

**Design-system essays & 2026 style references**: Smashing Iconography <https://smashingmagazine.com/2024/04/iconography-design-systems-troubleshooting-maintenance> · Adobe Icon System <https://adobe.design/stories/design-for-scale/designing-design-systems-constructing-an-icon-system> · Designsystems.com <https://www.designsystems.com/iconography-guide/> · Rephrase Style Spec <https://rephrase-it.com/blog/consistent-style-across-ai-image-generators-the-style-spec-a> · SaaSFrame 2026 trends <https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples> · Framiq 2026 <https://framiq.app/blog/best-saas-landing-pages-2026> · getillustrations 2026 <https://new.getillustrations.com/blog/saas-illustration-styles-that-convert/> · Linear <https://www.linear.app> · Stripe Sessions <https://stripe.com/sessions> · Framer <https://framer.com> · Arc <https://arc.net> · Vercel Ship <https://vercel.com/ship> · Clay Global <https://clay.global> · Raycast <https://raycast.com> · hype4.academy (Malewicz) <https://hype4.academy/articles/design/claymorphism-in-user-interfaces> · Rauno Freiberg <https://rauno.me>.
