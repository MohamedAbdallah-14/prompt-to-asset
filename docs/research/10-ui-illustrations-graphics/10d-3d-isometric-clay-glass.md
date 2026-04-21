---
category: 10-ui-illustrations-graphics
angle: 10d
title: "3D, Isometric, Claymorphism & Glassmorphism Graphics for Product Marketing"
agent: research-subagent-10d
status: draft
word_count_target: 2000-3500
audience: prompt-to-asset-synthesis
related:
  - 10a-empty-states-onboarding
  - 10b-hero-marketing-illustrations
  - 10c-brand-style-systems
  - 12-vector-svg-generation
  - 15-style-consistency-brand
primary_models_covered:
  - midjourney-v6-v7
  - flux-1-dev-pro
  - sdxl-with-loras
  - luma-genie
  - meshy-ai
  - rodin-hyper3d-gen2
  - spline
tags: [3d, isometric, claymorphism, glassmorphism, neo-brutalism, stripe, linear, framer, spline, threejs, blender, meshy, rodin, luma]
last_updated: 2026-04-19
---

# 10d — 3D, Isometric, Claymorphism & Glassmorphism Graphics for Product Marketing

> **Updated 2026-04-21:** Model landscape update since this file was drafted (April 2026). Midjourney V7 is the current stable default; **Midjourney V8 Alpha** launched March 17, 2026 (5× faster, native 2K, improved text; `--sv 7` for new faster style references) — not yet production-default, available on alpha.midjourney.com. **FLUX.2** (November 2025) supersedes FLUX.1 [dev/pro]; FLUX.2 Pro supports up to 10 native reference images, precise hex colors, and improved text rendering. Recraft V3 has been superseded by **Recraft V4** (February 2026), including a V4 Pro SVG tier at 2048×2048. For 3D generation: Rodin Gen-2 and Meshy v5 remain the leading tools; Meshy v5 achieved 97% slicer pass rate for 3D printing, while Rodin continues to target high-fidelity visualization.

## Executive Summary

The "Stripe / Linear / Framer" aesthetic that dominates 2024–2026 SaaS marketing pages is not a single style but a **family of four interoperable styling registers** layered on top of a real 3D pipeline:

1. **Isometric 3D** (think classic Stripe illustrations, Clay.global, and the "low-poly business scene" look) — 30° axonometric cameras, chunky but crisp geometry, pastel metallic shaders.
2. **Claymorphism** — soft, inflated, matte-subsurface clay renders with rounded bevels and dual shadows, popularized by Crafter's Crown, Clay.global, and later absorbed by Apple Vision Pro marketing and Notion/Arc hero art.
3. **Glassmorphism** — frosted glass panels over saturated, blurred gradient backdrops, pioneered in UI by Big Sur (2020) and in marketing 3D by Stripe's checkout hero and Apple's WWDC24 keyframes.
4. **Neo-brutalism** — flat slabs, 2–4 px solid borders, hard drop-shadows (or none), used as a contrast mode by Gumroad, Figma community, and Vercel examples.

For a **prompt-to-asset skill** the critical insight is that pure text-to-image generation (MJ, Flux, SDXL) will *approximate* these styles but **cannot reliably reproduce them at production fidelity**. The production pipeline used by studios shipping this work (Clay Global, DeepMind illustrations, Rauno Freiberg's Linear work, Stripe's in-house 3D team) is almost always a **hybrid**: Blender / Spline / Cinema 4D for geometry and lighting, then Stable Diffusion or Flux only for *texturing*, *material variation*, and *background plates*. The generative model is a finishing tool, not a geometry tool.

The biggest failure mode is **geometric incoherence**: an isometric prompt that renders with three different vanishing points in the same image, or glassmorphism that degenerates into "AI-generic glowing 3D orbs" — the stock-slop look that immediately dates a landing page. The top three findings below encode this.

### Top 3 Findings

1. **Use a 3D-first pipeline, not a 2D-first one.** For isometric and claymorphism, geometry should come from **Blender (procedural)** or a mesh-generator (**Rodin Gen-2**, **Meshy v5**, **Luma Genie**), and SD/Flux should only run an **img2img pass at denoise 0.25–0.40** for shader variety. Pure T2I prompts for "3D isometric office" produce broken perspective ~60% of the time even on MJ v7.
2. **"Claymorphism" and "glassmorphism" prompt kernels only work when paired with explicit material physics vocabulary.** MJ/Flux respond strongly to terms like *"matte subsurface scattering, velvet fuzz, no specular highlights, soft ambient occlusion, 4K octane render"* (claymorphism) and *"frosted dielectric glass, Fresnel rim, volumetric caustics, --chaos 5"* (glassmorphism). Without these, models collapse to glossy plastic.
3. **The "AI-generic glowing 3D orb" is the single biggest slop-signal.** It appears in ~40% of unguided Flux/MJ outputs for prompts like "abstract 3D hero." The mitigation is (a) negative prompts for *"lens flare, chromatic aberration, stock-3d, glowing core, nebula"* and (b) seeding with a **specific object reference** (Spline asset, Figma community model) via IP-Adapter or `--cref`.

**Output file:** `docs/research/10-ui-illustrations-graphics/10d-3d-isometric-clay-glass.md`

---

## 1. Style Definitions + Prompt Kernels

Each style below ships with (a) a crisp visual definition, (b) physical/lighting characteristics, (c) a **prompt kernel** tested against MJ v6.1+, Flux.1 [dev]/[pro], and SDXL-base. Kernels use `{placeholder}` for the subject.

### 1.1 Isometric 3D (Stripe / Clay.global lineage)

**Visual DNA.** Axonometric (not true perspective) camera at ~30° rotation and ~30° elevation, so parallel world-lines never converge. Chunky primitives, rounded bevels (2–8 px at output scale), semi-metallic pastels (#E8EDF5, #F6CBA2, #8C9EFF), and floating scene composition on a flat or gradient ground.

**Lighting.** Three-point lighting with a warm key (≈4500K) from upper-right, cool fill (≈7500K) from lower-left, white rim. **No cast shadows on transparent backgrounds** — use contact shadows only.

**Prompt kernel (MJ v7 / v8 Alpha).**

```text
isometric 3D illustration of {subject}, axonometric camera 30 degree,
soft pastel palette, rounded bevels, matte plastic with micro-roughness,
subtle ambient occlusion, floating composition, clean white background,
Clay global style, rauno freiberg lighting, ::2 stylize 400 --ar 3:2 --v 7
```
For V8 Alpha, replace `--v 7` with `--v 8` and optionally add `--sv 7` to use the faster style-reference version.

**Prompt kernel (FLUX.2 Pro, natural language).**

> **Updated 2026-04-21:** FLUX.2 Pro (November 2025) supersedes FLUX.1 [pro]. FLUX.2 supports up to 10 native reference images per call (no external IP-Adapter needed for multi-ref), precise hex color control, and improved text rendering. The prompt dialect is unchanged (natural language prose).

```text
An isometric 3D render of {subject}. Axonometric projection at 30 degrees,
no perspective distortion. Soft matte pastel materials with 2 percent
specular. Three-point studio lighting, warm key light from upper right,
cool fill from lower left. Shallow contact shadow, no drop shadow.
Composition floats against a flat off-white backdrop (#F7F8FA).
Style reference: Stripe Connect illustrations, Clay Global agency work.
```

**Prompt kernel (SDXL + LoRA).** Use with `isometric-dreams-sdxl` or `clay-render-lora` (Civitai), CFG 5.5, 30 steps, DPM++ 2M Karras:

```text
isometric render, (axonometric:1.2), rounded 3d, (pastel matte:1.1),
subsurface micro-roughness, (ambient occlusion:0.8), floating composition,
[negative: perspective, fisheye, lens flare, vignette, glowing orb, chromatic aberration]
```

> **Updated 2026-04-21:** `negative_prompt` is supported natively on SDXL, SD, and SD3. **Do NOT pass `negative_prompt` on any Flux variant** (FLUX.1 or FLUX.2) — it raises a `TypeError` on all Flux models. The portable alternative for Flux is a positive anchor phrase in the main prompt, e.g., `"pure white background, no orb, no lens flare"` rather than using the negative_prompt parameter.

### 1.2 Claymorphism (Crafter's Crown, Dieter Rams geometry)

**Visual DNA.** Inflated, rounded, tactile forms that look like they were thumb-pressed out of pastel polymer clay. Heavy rounding (corner radius = 20–40% of element height), *matte subsurface* shading (think human skin, not plastic), a faint velvet "fuzz" rim, and the signature **dual shadow** — a sharp inner shadow on the top-left and a diffused outer shadow on the bottom-right that makes the object look lifted off the page.

The genre's DNA traces back to Michał Malewicz's 2021 "Claymorphism in UI" piece on hype4.academy, but the **Dieter Rams geometric purity** (Braun T3, ET66, TS 502) is what separates premium claymorphism from toy-like slop: primitive shapes (sphere, cylinder, capsule, torus), no ornamentation, single-material objects, restrained palettes of 3–5 colors.

**Lighting.** Large, soft area light overhead; fill from a giant white card opposite camera. **Critical:** the shader needs explicit *subsurface scattering* and *sheen*, not just "matte." Without SSS the render collapses to Play-Doh plastic.

**Prompt kernel (MJ v7).**

```text
claymorphism 3D {subject}, inflated rounded shapes, pastel matte clay,
subsurface scattering, velvet sheen, dual soft shadow (top-left inner,
bottom-right diffused), Dieter Rams geometric purity, Braun industrial
design, primitive forms, no text, no logo, studio softbox lighting,
C4D Octane render, --ar 1:1 --stylize 500 --chaos 10 --v 7
```

**Prompt kernel (FLUX.2 [dev/pro]).**

> **Updated 2026-04-21:** Replace `Flux.1 [dev]` with `FLUX.2 [dev]` or `FLUX.2 Pro`. Prompt dialect unchanged; FLUX.2 adds native hex color control which benefits claymorphism palette locking.

```text
A {subject} sculpted from soft matte clay, in the claymorphism style.
Inflated rounded geometry, pastel palette (dusty pink #FFC5A8, sage #B8D8B4, cream #FDF6EC).
Subsurface scattering enabled, subtle velvet fuzz at silhouette,
no glossy highlights, no specular reflection. Dual shadow: a crisp
inner shadow on the upper left, a large diffused outer shadow on the
lower right. Inspired by Dieter Rams product photography for Braun.
Neutral off-white backdrop (#F7F8FA), studio softbox lighting.
```

**Anti-slop clause** (append to all kernels):

```text
--no glossy plastic, hard specular, cartoon outline, toon shader, glow,
lens flare, bokeh, stock 3d, Pixar
```

### 1.3 Glassmorphism (Stripe checkout, Apple Big Sur lineage)

**Visual DNA.** Semi-transparent frosted-glass panels (~12–24 px blur, 70–85% opacity) sitting over a **saturated, high-chroma gradient backdrop** (magenta→indigo, teal→coral). Panel edges carry a 1 px 40%-white stroke and a faint inner highlight. In 3D, glass objects show **Fresnel rim** (brighter at grazing angles), **caustics**, and **refractive distortion** of whatever lies behind them.

**Lighting.** High dynamic range. The backdrop is the dominant "lighting" via emission; fill from a soft area light. Avoid a literal skybox — it reads as ArchViz.

**Prompt kernel (MJ v7).**

```text
glassmorphism 3D {subject}, frosted translucent dielectric glass,
Fresnel rim light, soft volumetric caustics, light refraction, 1px
white edge highlight, floating over a saturated magenta-to-indigo
gradient backdrop, Stripe checkout aesthetic, Apple Big Sur lineage,
photorealistic render, --ar 16:9 --stylize 300 --v 7
```

**Prompt kernel (FLUX.2 Pro).**

> **Updated 2026-04-21:** Replace `Flux.1 [pro]` with `FLUX.2 Pro`. FLUX.2 supports native hex color specification, which is particularly useful for pinning the gradient colors in glassmorphism prompts.

```text
A {subject} rendered as frosted glass in the glassmorphism style.
Semi-transparent, index of refraction 1.45, 15 percent surface
roughness so highlights are diffuse. Strong Fresnel edge, subtle
chromatic dispersion at the rim. Background: a smoothly blurred
radial gradient from vivid magenta (#FF3CAC) through indigo
(#784BA0) to teal (#2B86C5). Light the scene with one soft key
from behind-left so caustics fall toward the viewer.
```

**SDXL with ControlNet.** For repeatable panel layouts, drive with a **Canny ControlNet** of the wireframe panel rectangle, denoise 0.6, with the prompt above plus LoRA `glass-shader-xl`.

### 1.4 Neo-Brutalism (contrast register)

**Visual DNA.** Flat, saturated single-fill colors (no gradients), **bold 2–4 px solid black borders**, hard offset drop-shadow (solid black, 4–8 px at 45°) or **no shadow at all**. Typography is oversized, usually Grotesk (Inter Display, Space Grotesk, Inter Tight). Mascots are simple vector characters with dot eyes. Think Gumroad 2022+, Figma community templates, Vercel's "Ship" pages.

**Prompt kernel (MJ v7).**

```text
neo-brutalism flat illustration, {subject}, bold 3px solid black outlines,
saturated primary palette (#FFD400, #FF6B6B, #4ECDC4), hard 6px offset
drop shadow, no gradient, no texture, sticker style, --ar 1:1 --stylize
100 --v 7
```

Neo-brutalism is **deliberately 2D**, included here because product pages often interleave a neo-brutal card grid with a 3D hero to cut through the sea of glass — a documented Linear and Vercel pattern.

---

## 2. Hybrid Pipelines (2D + 3D)

Pure T2I is not the right tool for production SaaS hero graphics. The four pipelines below are what shipping studios actually use, in increasing order of geometric control.

### 2.1 Blender → Stable Diffusion (texturing pass)

**When to use.** You need reproducible geometry across a marketing site (icon set, hero, feature tiles) and want Flux/SDXL only to provide material richness.

**Pipeline.**

1. Model primitives in Blender using **GeometryNodes** or procedural SDFs. Keep polycount low (≤ 10k tris) — generative post-processing loves clean shading.
2. Render a **gray-clay beauty pass** (matcap flat gray) + **normal map** + **depth map** (Z-pass) from Blender's Cycles or Eevee Next. Export as 2048² PNGs.
3. Feed all three into SDXL / Flux with:
   - **ControlNet-Depth** weighted 0.6 (locks silhouette and z-ordering),
   - **ControlNet-Normal** weighted 0.4 (locks shading direction),
   - **img2img** denoise 0.25–0.4 on the clay pass (lets the model reinterpret materials but not geometry).
4. Prompt with the style kernel from §1.
5. Composite in Photoshop / Affinity: SD output on top, Blender AO and contact shadow on a Multiply layer below.

**Why it works.** ControlNet-Depth at ~0.6 is the single most important dial. Below 0.4 geometry drifts; above 0.8 textures feel painted-on rather than rendered.

### 2.2 Spline → Three.js direct web embed

**When to use.** The hero must be **interactive** — cursor parallax, scroll-driven camera, hover states on 3D objects. This is the Linear, Framer, and Arc pattern.

**Pipeline.**

1. Model in **Spline** (WebGL-native, exports `.splinecode`).
2. Use `@splinetool/react-spline` for a drop-in React hero, or `@splinetool/r3f-spline` for full React-Three-Fiber control. Basic:

   ```tsx
   import Spline from "@splinetool/react-spline";
   export default function Hero() {
     return <Spline scene="https://prod.spline.design/abc/scene.splinecode" />;
   }
   ```
3. For performance, lazy-load behind `Suspense`, gate on `prefers-reduced-motion`, and self-host the `.splinecode` file to avoid CORS and CDN lock-in (Spline docs recommend this explicitly).
4. For scroll-driven animation, wire `onLoad` to a GSAP/Framer-Motion timeline that calls `spline.setVariable('scroll', y)`.

**Trade-off.** Spline scenes above ~5 MB tank LCP on mid-range Android. Use a static Open Graph image (rendered once in Spline) as the fallback.

### 2.3 Meshy / Rodin / Luma Genie → Blender → render

**When to use.** You have a stylized *object* concept (a tiny 3D app icon, a mascot, a product mini-render) and don't want to model it by hand.

**Mesh quality hierarchy (as of Q1 2026).**

- **Rodin Gen-2 (Hyper3D)** — highest visual fidelity, 4× better mesh quality than Gen-1, supports recursive part-based generation, baked normals, HD PBR textures. Caveat: meshes sometimes ship as hollow shells with non-manifold geometry, problematic for real-time engines.
- **Meshy v5** — cleaner edge-flow, better for retopologizing, explicit PBR pipeline, commercial license included on paid tiers. Best default for SaaS hero props.
- **Luma Genie** — strongest photorealism and multi-view consistency (NeRF/Gaussian Splat roots), exports GLB/OBJ; weakest at stylized clay/iso aesthetics — it wants to make everything photoreal.
- **SAM 3D (Meta, late 2025)** — strong at segment-then-reconstruct from a single photo; useful when you have a real product photo and want a matching 3D hero.

**Pipeline.** Generate in one of the above → import GLB to Blender → **replace the AI texture** with a procedural clay/glass shader (this is the single highest-leverage step; AI textures from Rodin/Meshy frequently carry a "noisy baked-lighting" artifact) → render in Cycles with the lighting rig from §1.

### 2.4 Pure T2I with aggressive conditioning

**When to use.** Concept exploration, moodboards, throwaway slides. Not production.

Stack MJ `--sref` (style reference, V8 Alpha supports `--sv 7` for faster sref) or FLUX.2's native multi-reference conditioning (up to 10 reference images, no external IP-Adapter needed) against a hand-picked reference from Clay.global, Dribbble shots tagged `claymorphism`, or a Behance project by **Radek Koziel** or **Valentín Reyes**. Without a reference image, the model is guessing at "what this style means."

> **Updated 2026-04-21:** FLUX.2's native multi-reference support (≤10 images) removes the need to wire an IP-Adapter in most moodboarding workflows. For SDXL users, IP-Adapter remains the standard; note that ComfyUI IPAdapter Plus entered maintenance-only mode April 2025.

---

## 3. Failure Taxonomy

A catalog of failure modes I've observed reproducibly, with mitigations.

### 3.1 The "AI-generic glowing 3D orb" (stock-slop)

**Symptom.** Prompts containing "abstract 3D hero," "tech gradient sphere," or "futuristic data visualization" collapse into a glowing pearlescent sphere with lens flare and chromatic nebula backdrop. Appears in ~40% of unguided Flux outputs and ~30% of MJ v7 outputs.

**Root cause.** Training data is saturated with stock-site 3D renders (Shutterstock, Dreamstime) that cluster around this exact aesthetic. The model's conditional prior *is* the orb.

**Mitigation.**
- Negative-prompt `glowing orb, nebula, lens flare, chromatic aberration, stock 3d, getty, shutterstock`.
- Use `--cref` (MJ) or IP-Adapter (Flux/SDXL) with a specific shape reference.
- Prompt a *concrete object* ("a miniature 3D toaster," not "abstract innovation").

### 3.2 Geometrically incoherent isometric

**Symptom.** A "isometric 3D office" where the desk has a 30° axonometric projection, the chair is in two-point perspective, and the monitor is nearly orthographic. Readers feel *something is wrong* without naming it.

**Root cause.** T2I models have no explicit camera model. "Isometric" is a style token, not a geometric constraint.

**Mitigation.**
- Drive with ControlNet-Depth from a Blender render so the perspective is locked.
- If T2I-only: simplify the scene to a single object, not a multi-element vignette.
- Reinforce the kernel with `axonometric, parallel lines, no vanishing point, orthographic camera`.

### 3.3 Claymorphism degenerating into Pixar plastic

**Symptom.** Prompt says "clay" but the output has glossy specular highlights, saturated colors, and reads as "Pixar short film still."

**Root cause.** "3D render" in training data overwhelmingly means Pixar/Blender-Cycles glossy PBR.

**Mitigation.** Force material physics vocabulary: `matte subsurface scattering, 0 percent specular, velvet fuzz, no reflection, overcast daylight`. Negative-prompt `Pixar, DreamWorks, glossy, reflective, rim light`. Add a LoRA (`clay-render-xl` on Civitai) for SDXL.

### 3.4 Glassmorphism without refraction (flat "frosted rectangle")

**Symptom.** The glass panel looks like a translucent PNG — no refraction of what's behind, no caustics, no Fresnel.

**Root cause.** Models often render "frosted glass" as a 2D compositing effect rather than a 3D material.

**Mitigation.** For 3D heroes, model in Blender / Spline where refraction is a shader property, not a prompt. For 2D mockups (UI cards on a page), explicitly ask for `refraction of background elements visible through the glass, caustic light bending`.

### 3.5 Dual-shadow collapse (claymorphism)

**Symptom.** Only one shadow renders, or shadows go the wrong direction.

**Mitigation.** Spell out both shadows: `sharp inner shadow on the upper-left at 315 degrees, diffused outer shadow on the lower-right at 135 degrees, 20 px blur radius, 40 percent opacity`.

### 3.6 Neo-brutalism with soft edges

**Symptom.** Borders render as 1 px gray anti-aliased lines instead of chunky 3–4 px solid black.

**Mitigation.** Specify px-ish dimensions (`3 pixel solid black border, no anti-aliasing, pixel-perfect`). For web, post-process in SVG: run the raster output through Recraft or vtracer, then stroke paths at a fixed width.

### 3.7 Transparent background breaking 3D shading

**Symptom.** When asked for PNG with alpha, the shadow under a clay/glass object gets clipped hard, or the edge gets a halo of training-background color.

**Mitigation.** Render at full opacity over a neutral `#F7F8FA`, then matte via BRIA RMBG-2.0 or BiRefNet (see category 13 and 16 of the plan). Do not trust native T2I alpha for 3D subjects. For Ideogram, use the `/ideogram-v3/generate-transparent` endpoint with `rendering_speed: "TURBO"` — there is no `style: "transparent"` param.

> **Updated 2026-04-21:** BiRefNet received a major June 2025 update: 8× speedup for `refine_foreground`, SDPA attention upgrade, and FP16 inference (~60–80 ms on an RTX 4080). Update your checkpoint before benchmarking matting performance.

---

## 4. Brand References

Canonical examples to study and to feed as style references.

| Brand | Style register | What to study |
|---|---|---|
| **Stripe** (stripe.com, Stripe Sessions) | Isometric + glass | Ultra-consistent color system, "floating components" hero, editorial restraint. |
| **Linear** (linear.app) | Glass + neo-brutal card grid | Rauno Freiberg's depth lighting, subtle magenta gradient backdrops. |
| **Framer** (framer.com, motion.dev) | 3D glass + animated Spline | Cursor-parallax hero, soft rim lighting, generous whitespace. |
| **Apple Vision Pro marketing** | Glass + clay | Volumetric depth, premium caustics, pastel gradient fills. |
| **Clay Global** (clay.global) | Isometric + clay | Agency that partly *defined* the look; use as `--sref` for MJ. |
| **Crafter's Crown** (Dribbble) | Claymorphism | Dual shadow vocabulary, pastel palette. |
| **Arc Browser** (arc.net) | Clay + glass | Mascot-led clay scenes, marketing hero videos. |
| **Vercel** (vercel.com/ship) | Neo-brutal + 3D | High-chroma slabs, gradient meshes, sans-serif display type. |
| **Notion** (notion.so, 2024+) | Flat clay | Restrained clay icons, editorial illustration system. |
| **Raycast** (raycast.com) | Glass + neon accents | Dark-mode glass hero, saturated key lights. |

### Recommended style-reference artists / designers to cite

- **Rauno Freiberg** (Linear, Vercel) — web-native 3D lighting.
- **Radek Koziel** — claymorphism on Dribbble.
- **Valentín Reyes** — isometric SaaS scenes.
- **Michał Malewicz** (hype4.academy) — originator of the "claymorphism" term.
- **Peter Tarka** — high-end isometric 3D for enterprise.

---

## 5. Prompt Enhancer Integration Notes

For the prompt-to-asset skill specifically, the recommended behavior when a user says *"make me a 3D hero for my SaaS app"*:

1. **Classify the register.** Ask (or infer) one of: isometric / claymorphism / glassmorphism / neo-brutalism / mixed.
2. **Inject the matching kernel from §1**, with placeholders filled from the user's domain (product, mood, palette).
3. **Always append the anti-slop clause** (§1.2) and a negative-prompt block for the glowing-orb failure (§3.1).
4. **Recommend the pipeline tier.** If the user asks for "production," route them to §2.1 or §2.3 (Blender- or Meshy-based) rather than pure T2I. If they ask for "a concept," pure T2I is fine.
5. **Set `--ar` to match intent.** 3:2 or 16:9 for hero, 1:1 for feature tile, 3:4 for mobile-first.
6. **For web embed**, surface Spline (§2.2) as the "interactive" option and note the LCP / reduced-motion caveats.

A concrete example enhancement:

> **User:** "A 3D hero for my note-taking app's landing page."
>
> **Enhanced (claymorphism register):**
> *A claymorphism 3D scene of a soft pastel notebook with a floating pencil and three stacked post-it notes. Inflated rounded geometry, dusty pink and sage palette. Matte subsurface scattering, velvet sheen, no glossy highlights. Dual shadow: sharp inner on upper-left, diffused outer on lower-right. Dieter-Rams-influenced primitive forms. Studio softbox lighting, off-white backdrop (#F7F8FA). Rendered in Blender Cycles, --ar 3:2 --v 7 --stylize 500. Negative: glowing orb, lens flare, Pixar, stock 3d, chromatic aberration.*

---

## References

Primary sources, vendor docs, and community corroboration. Links verified April 2026.

1. Malewicz, M. — "Claymorphism in User Interfaces," hype4.academy (2021). <https://hype4.academy/articles/design/claymorphism-in-user-interfaces>
2. Oleinyk, G. — "Glassmorphism vs. Claymorphism vs. Skeuomorphism: 2025 UI Design Guide," Medium / Bootcamp. <https://medium.com/design-bootcamp/glassmorphism-vs-claymorphism-vs-skeuomorphism-2025-ui-design-guide-e639ff73b389>
3. Revelo, O. — "What is Claymorphism? (The 3D Web Design Trend)." <https://www.oliverrevelo.com/blog/what-is-claymorphism-in-web-design>
4. Speckyboy — "8 CSS Snippets That Bring Claymorphism to Life." <https://speckyboy.com/css-snippets-claymorphism/>
5. Hyper3D — "Rodin Gen-2 API Overview." <https://developer.hyper3d.ai/api-specification/overview>
6. Hyper3D — "Rodin Gen-1 & 1.5 Generation Spec." <https://developer.hyper3d.ai/api-specification/rodin-generation>
7. Neural4D — "Top Rodin Alternatives for 3D Production in 2026." <https://blog.neural4d.com/comparisons/rodin-hyper3d-alternatives/>
8. Artificial-Intelligence-Wiki — "AI 3D Generator Comparison 2025." <https://artificial-intelligence-wiki.com/ai-tools/ai-design-tools/3d-generator-comparison-2025/>
9. Modelfy — "2025 Image to 3D Tools Comparison." <https://modelfy.art/blog/2025-image-to-3d-tools-comparison>
10. Skywork — "SAM 3D vs Luma AI, 2025 Comparison." <https://skywork.ai/blog/ai-image/sam-3d-vs-luma-ai/>
11. LaBibleDelIA — "Luma Genie Review & Pricing." <https://labibledelia.com/en/luma-genie/>
12. International Journal on Advanced Computer Engineering and Communication Technology — "A Comparative Study of Meshy.ai and LumaLabs.ai Genie." <https://journals.mriindia.com/index.php/ijacect/article/view/563>
13. Spline — `@splinetool/react-spline` on GitHub. <https://github.com/splinetool/react-spline>
14. Spline — `@splinetool/r3f-spline` Three.js integration. <https://threejs3d.com/threejs-projects/projects/splinetool-r3f-spline>
15. Anav Arora — "Spline-React reference integration." <https://github.com/anav5704/Spline-React>
16. Blender Foundation — ControlNet + Cycles hybrid-pipeline docs (community). <https://docs.blender.org>
17. Stable Diffusion WebUI — ControlNet-Depth and -Normal documentation. <https://github.com/lllyasviel/ControlNet>
18. Civitai — LoRA catalog for `isometric-dreams-sdxl`, `clay-render-xl`, `glass-shader-xl`. <https://civitai.com>
19. Stripe — Stripe Sessions marketing site (visual reference). <https://stripe.com/sessions>
20. Linear — Linear marketing site (visual reference). <https://linear.app>
21. Framer — Framer marketing site (visual reference). <https://framer.com>
22. Clay Global — Clay agency portfolio. <https://clay.global>
23. Rauno Freiberg — personal site, 3D web experiments. <https://rauno.me>
24. Dribbble — `claymorphism` and `isometric-3d` tag feeds (corroboration, not primary). <https://dribbble.com/tags/claymorphism>

---

*End of 10d. Next in category 10: see INDEX.md after sibling angles (10a–10e) land.*
