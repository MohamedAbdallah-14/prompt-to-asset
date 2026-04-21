---
category: 10-ui-illustrations-graphics
angle: 10a
title: "In-App Illustrations: Empty States, Onboarding, Errors, Success — Style Consistency Across 20+ Illustrations"
author: research-subagent-10a
date: 2026-04-19
status: draft
tags:
  - illustrations
  - empty-state
  - onboarding
  - error-state
  - success-state
  - style-consistency
  - lora
  - ip-adapter
  - sref
  - recraft
  - figma
primary_sources:
  - https://undraw.co/
  - https://openpeeps.com/
  - https://www.humaaans.com/
  - https://storyset.com/
  - https://www.manypixels.co/gallery
  - https://blush.design/
  - https://icons8.com/illustrations
  - https://www.drawkit.com/
  - https://m3.material.io/styles/illustration/overview
  - https://www.recraft.ai/
  - https://docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference
  - https://github.com/tencent-ailab/IP-Adapter
  - https://huggingface.co/docs/diffusers/en/training/lora
---

# In-App Illustrations: Empty States, Onboarding, Errors, Success — Style Consistency Across 20+ Illustrations

## Executive Summary

Product illustrations are the silent workhorses of modern SaaS UI. A polished app needs roughly 20–40 bespoke illustrations across its lifecycle: empty states (no data yet, no search results, inbox zero), onboarding screens (welcome, feature walkthrough, permission prompts), error screens (404, 500, offline, rate-limited), success/celebration states (task complete, upgrade confirmed), and feature explainers (marketing callouts, tooltip heroes). The hard problem is not drawing any one of these — it is drawing **all of them in the same visual language** so that a user flipping between an empty inbox and a 500 error never feels like they've left your app.

The ecosystem has converged on two production patterns. The **curated-library pattern** leans on existing sets (unDraw, Storyset, Humaaans, Blush, Open Peeps, ManyPixels, Ouch, DrawKit) where style consistency is guaranteed by the creator; the tradeoff is that thousands of other apps share your look. The **bespoke-generative pattern** uses diffusion models plus consistency tooling — LoRA fine-tunes, IP-Adapter style embeddings, Midjourney `--sref`/`--sw`, Flux Redux, or Recraft's style locking — to produce custom illustrations on-brand at scale. In 2025–2026, a hybrid is winning: start from a curated kit's aesthetic, pin the style with a reference bundle (3–10 images), and generate net-new scenes through a prompt template with frozen style tokens.

Known failure modes are well-documented: **style drift across sessions** (same prompt, new day, new palette), **baked-in text** ("Oops!" burned onto every error state), **inconsistent character design** (protagonist has 4 fingers in one scene and 5 in the next, or the duotone palette shifts from `#6C63FF` to `#7B61FF`), **aspect-ratio mismatch** with UI gutters, and **wrong gutter/safe-area** (hero element touches the frame edge so the Tailwind card's `p-6` crops the head). The production fix is a disciplined pipeline: canonical brand tokens → frozen style reference → prompt template with per-state slot fills → Recraft (or vectorizer) pass for crisp SVG → Figma library for designer review → React component export with named props.

This document catalogs the dominant style families, compares the three major consistency techniques (LoRA vs IP-Adapter vs `--sref`), provides copy-ready prompt patterns for the five canonical state categories, and specifies a production workflow suitable for automation from a coding-agent skill.

## Style Library Catalog

A prompt-to-asset system needs to reference these by name so users can say "make it Storyset-ish" and the model knows what they mean.

### Flat 2D, muted, duotone

- **unDraw** — [undraw.co](https://undraw.co/). Katerina Limpitsouni. Free-to-use, single-color-swappable SVGs. Signature look: flat geometric shapes, no outlines, a single accent color the user picks (defaults to `#6C63FF` "undraw purple"). Pairs well with light-mode dashboards. ~700+ scenes, MIT-like license.
- **ManyPixels Gallery** — [manypixels.co/gallery](https://www.manypixels.co/gallery). Palette-swappable flat illustrations, similar to unDraw but with two-tone variants. Free.
- **Icons8 Ouch.pics** — [icons8.com/illustrations](https://icons8.com/illustrations). Huge multi-style library (Pixeltrue, Carbon, Bucket, Pastel, etc.). Free with attribution.

### Character-driven, composable

- **Humaaans** — [humaaans.com](https://www.humaaans.com/). Pablo Stanley. Mix-and-match human figures, customizable skin tones, poses, clothes. CC0. A favorite starting point for diversity-first empty states.
- **Open Peeps** — [openpeeps.com](https://openpeeps.com/). Also Pablo Stanley. Hand-drawn line-art characters with swappable hair/faces/bodies/accessories. CC0. Strong for a sketchy/playful brand.
- **Blush** — [blush.design](https://blush.design/). Curated collections from multiple artists (Yolka, Glaze, Character Builder). Commercial and free tiers. Composer app lets you recombine parts — huge time saver for bespoke cast.
- **DrawKit** — [drawkit.com](https://www.drawkit.com/). Premium illustration sets with strong character systems; common in fintech/productivity.

### Editorial, richly scenic

- **Storyset (Freepik)** — [storyset.com](https://storyset.com/). Wide color customization, multiple styles (Amico, Bro, Cuate, Pana, Rafiki), plus animated Lottie variants. Free with attribution. Very recognizable — avoid if you want originality.

### Isometric

- **Isometric Love** and **Icons8 Isometric**. 3D-ish axonometric scenes, popular for infra/devtools. Limited library; often generated per-project.

### Hand-drawn, sketchy, paper-cut

- **Open Peeps** (again) for character work. **Popsy** ([popsy.co](https://popsy.co/)) offers hand-drawn illustration packs. **Lukasz Adam illustrations** ([lukaszadam.com](https://lukaszadam.com/illustrations)) — line-art freebies.

### 3D, claymorphism, glassy

- **Spline** community kits, **3D Icons (Icons8)**, **Emoji-style 3D (Microsoft Fluent Emoji)**. Distinctive squishy materials; heavier rendering cost but trending 2024–2026. Claymorphism pairs with neumorphic UI.

### Neo-brutalism / risograph / vaporwave

- Niche but strong identity. Think thick outlines, high-contrast duotones, intentional "misprint" offsets. Not a common library — usually bespoke. Gumroad has pay-what-you-want packs.

### Official design-system illustration guidance

- **Material 3 illustration guidelines** — [m3.material.io/styles/illustration/overview](https://m3.material.io/styles/illustration/overview) — covers spot, scenic, and hero illustrations, and how to scale across theme (light/dark) and density. Google's own practice is: pick one illustration style, build a color palette with ≥2 primary + 2 accent colors, use consistent stroke/weight rules, and size to responsive breakpoints (spot 96–240px, hero 480+px).
- **Apple HIG — Human Interface Guidelines: Images** — less prescriptive but recommends SF Symbols for inline and bespoke illustrations for empty/error.
- **Figma Community** illustration kits — search `illustration library`, top hits: Notion-style ([Figma Community](https://www.figma.com/community)), Meta's illustration system demos, community Humaaans mirrors.

### Aspect and sizing conventions

- Spot/inline: 1:1 (96–200px) or 4:3 at card top.
- Empty state hero: 4:3 or 3:2, ~40% of available card height.
- Error full-page: 16:9 or 3:2, centered, generous margins.
- Onboarding card: 1:1 or 4:5 for mobile, 3:2 for web.
- Feature explainer (marketing): 16:9, 21:9, 2:1.

Safe-area rule: the key element (character face, focal prop) must sit inside the inner 70% so that cropping, rounded corners, and Tailwind `p-6 md:p-8` gutters don't decapitate characters.

## Consistency Techniques

This is the heart of the angle. To ship 20+ illustrations that feel like a family, you must pin the "style vector" somewhere and reuse it deterministically.

### 1. LoRA (Low-Rank Adaptation)

- **What it is**: Inject a tiny (1–50 MB) matrix into a base diffusion model's UNet/text-encoder cross-attention layers so it learns a new concept or style from 10–50 example images. Paper: Hu et al. 2021, [arXiv:2106.09685](https://arxiv.org/abs/2106.09685); applied to SD by [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts). HF Diffusers training doc: [huggingface.co/docs/diffusers/en/training/lora](https://huggingface.co/docs/diffusers/en/training/lora).
- **When to use**: You have 15+ on-brand illustrations (e.g., your agency delivered a launch pack) and need 50 more in the same style, indefinitely, reproducibly.
- **Strengths**: Best consistency across sessions, palette, stroke, character proportions all captured. Portable (`.safetensors` file). Works offline / self-hosted.
- **Weaknesses**: Requires training compute (~30–90 min on an A100 or 2–4 hrs on a 4090), requires 15+ clean reference images, bound to a single base model (SDXL LoRA ≠ Flux LoRA).
- **Concrete recipe**: kohya-ss SDXL LoRA, 1e-4 LR, rank 16, 1500 steps, captions like `empty-inbox illustration in "brand-x style", duotone purple and cream, flat vector, no text`. Trigger token: `brand-x style`.
- **Flux-specific**: [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit) is the current (2025) gold standard for Flux.1 [dev] LoRAs. Ranks 16–32; Flux captures style far more tightly than SDXL.

### 2. IP-Adapter (image prompt adapter)

- **What it is**: Tencent AI Lab's adapter that lets you pass an image as an additional conditioning input alongside the text prompt. Paper: [arXiv:2308.06721](https://arxiv.org/abs/2308.06721); repo: [github.com/tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter). Variants: plain IP-Adapter, IP-Adapter Plus, IP-Adapter FaceID, IP-Adapter Style-Plus (style-only mode).

> **Updated 2026-04-21:** The original `tencent-ailab/IP-Adapter` repository's last commit was January 2024; it is effectively unmaintained for new model families. For FLUX.2 pipelines, use **InstantX's FLUX.1-dev IP-Adapter** (`InstantX/FLUX.1-dev-IP-Adapter`) which is the current maintained fork for Flux. For SDXL, ComfyUI IPAdapter Plus entered maintenance-only mode in April 2025. For most FLUX.2 workflows, prefer FLUX.2's native multi-reference support (≤10 refs) over an external adapter entirely.

- **When to use**: You have 1–5 reference illustrations and want the style transferred to a new composition without training. Fastest path from "here's our look" to "give me 10 more".
- **Strengths**: No training. Seconds per image. Style-only mode separates composition from aesthetics. Pairs with SD 1.5, SDXL, Flux (for Flux, use InstantX FLUX.1-dev IP-Adapter).
- **Weaknesses**: Drift creeps in on unusual compositions (e.g., iso camera angle when refs are all flat). Weaker than LoRA on fine brand details (exact palette, stroke width).
- **Concrete recipe**: Diffusers `pipeline.load_ip_adapter("h94/IP-Adapter", subfolder="sdxl_models", weight_name="ip-adapter_sdxl.safetensors")`; set `pipeline.set_ip_adapter_scale(0.6–0.8)`. Pass the style ref(s) via `ip_adapter_image=[img]`. For Flux use `InstantX/FLUX.1-dev-IP-Adapter`.

### 3. `--sref` / style reference (Midjourney, Ideogram, Flux Redux, Recraft Style)

> **Updated 2026-04-21:** Midjourney V7 is the current stable default (released April 3, 2025; became default June 17, 2025). Midjourney V8 Alpha launched March 17, 2026 with a new `--sv 7` style-reference version that is 4× faster and cheaper than previous sref; V8.1 Alpha went live April 14, 2026 on alpha.midjourney.com. Recraft V3 has been superseded by **Recraft V4** (released February 2026), which ships four tiers (V4, V4 Vector, V4 Pro, V4 Pro SVG) — the vector tiers still produce native SVG and now support up to 2048×2048 resolution. `gpt-image-1` has been joined by **gpt-image-1.5** (December 2025), which is ~20% cheaper and adds faster generation with denser text rendering. Flux.1 has been superseded by **FLUX.2** (November 25, 2025), consisting of Pro, Flex, Dev, and Klein models; all FLUX.2 models support multi-reference editing (up to 10 references), precise hex color control, and improved text rendering. Gemini image generation via the **API** has **no free tier as of December 2025** — unbilled keys return HTTP 429 on image endpoints; use AI Studio web UI for free interactive access.

- **Midjourney `--sref`**: Current version is V7 (stable) / V8 Alpha (early access). Pass image URLs as `--sref <url> --sw 100`. In V8 Alpha, use `--sv 7` for the new, faster style-reference version. Also `--sref random` locks to a hidden numeric style id. Official docs: [docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference](https://docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference). MJ also introduced a **Style Creator** tool that lets you generate and save reusable style codes without uploading images.
- **Ideogram `Style Reference`**: Ideogram 3 / 3 Turbo (released March 2025, major upgrade April 2026) supports style image upload; text rendering accuracy ~90% for short strings; Turbo uses 2 credits vs. Quality's 6.
- **Flux Redux / FLUX.2** (Black Forest Labs): FLUX.1 Tools (Redux) remain available; FLUX.2 (November 2025) natively supports multi-reference editing (up to 10 refs), making Redux-style re-rendering built-in. See [bfl.ai/models](https://bfl.ai/models).
- **Recraft Style** (Recraft.ai): Now Recraft V4 — create a "Style" from reference images and invoke by style ID. V4 ships four tiers including V4 Pro SVG for high-resolution native vector output. [recraft.ai](https://www.recraft.ai/).
- **Gemini 2.5 Flash Image ("Nano Banana")**: supports multi-image conditioning; passing 2–4 on-brand references in-line achieves strong consistency. **Note: the Gemini/Imagen image-gen API has no free tier as of December 2025** — use AI Studio web UI for free interactive access.
- **GPT Image 1 / 1.5 (OpenAI)**: gpt-image-1 supports image input references; gpt-image-1.5 (December 2025) adds ~20% cost reduction, 4× faster generation, and denser text rendering. Both weaker than Recraft V4 for SVG cleanliness.

### Decision matrix

| Need | Best tool |
|---|---|
| 3 illustrations, one-off | `--sref` or IP-Adapter with one ref |
| 20 illustrations over one sprint | `--sref` + `--sw 200` + locked seed, or Recraft Style |
| Ongoing, 200+ over 12 months | LoRA (Flux or SDXL) + prompt template |
| Vector SVG deliverables | Recraft Style (native vector) |
| Character identity (same person across scenes) | IP-Adapter FaceID + textual inversion, or Humaaans composer |
| Extreme brand fidelity, exact palette | LoRA + post-processing palette quantization |

## Per-State Prompt Patterns

The prompt-to-asset's job is to take a thin request ("empty inbox illustration") and emit a full prompt with frozen style anchors, camera/composition cues, subject specification, and explicit negatives. A template with slots works well:

```
{style_block}, {subject}, {action_or_emotion}, {setting}, {composition}, {palette}, {negatives}
```

Below are patterns for the canonical state categories. The `{style_block}` is frozen at project start — e.g. `flat 2d vector illustration, rounded geometric shapes, no outlines, brand-x purple (#6C63FF) and cream (#FFF4E6) duotone, in the style of [sref_id]`.

### Empty state — "no data yet"

- **Subject**: friendly container or surface matching the feature (an open drawer, a clean desk, a mailbox with its flag down, an empty shelf). Optionally one character mid-gesture (setting up, sweeping, peering in curiously).
- **Emotion**: calm invitation, not loss. Aim for "the start of something" not "you failed."
- **Composition**: centered, negative space at top for headline, bottom-weight.
- **Canonical prompt**:
  ```
  {style_block}, a friendly character standing next to an open empty cardboard box on a wood floor,
  gentle curious posture, soft morning light, 4:3 composition centered with headroom,
  duotone brand-x palette, no text, no watermark, vector flat, safe area 70 percent
  ```
- **Negatives** (SD/Flux): `text, letters, signage, watermark, logo, extra fingers, extra limbs, realistic photo, drop shadow artifacts, dithering, jpeg compression`

### Empty state — "no search results"

- **Subject**: a magnifying glass, a character peering through binoculars, a detective with a question mark thought-bubble (but no literal text — render the bubble shape only and overlay your `aria-label`-bearing text in the DOM).
- **Composition**: dynamic diagonal, focal on the search instrument.

### Onboarding — welcome / hello

- **Subject**: waving character, door-opening metaphor, rocket mid-liftoff for "let's go", paper airplane.
- **Emotion**: warm, expectant, optimistic.
- **Canonical**:
  ```
  {style_block}, a character waving from an open doorway with a potted plant beside them,
  morning light, warm greeting, 1:1 composition with subject slightly left of center,
  headroom top, duotone palette, no text, vector flat, safe area 70 percent
  ```

### Onboarding — feature walkthrough (3–5 carousel slides)

- **Subject**: each slide features the same protagonist performing the new capability (dragging a card, pressing a button, syncing a device).
- **Critical**: this is the hardest consistency test. Use IP-Adapter FaceID on the protagonist OR a dedicated LoRA for the character. The style LoRA should be separate from the character LoRA (compose at inference).
- **Prompt skeleton**: prefix each slide with `protagonist_token, {style_block}, {action}` where `protagonist_token` is a trigger phrase from your character LoRA (e.g. `kira character`).

### Error — 404 / not found

- **Subject**: lost-but-okay mood. Astronaut floating untethered, paper map being read upside down, character at a crossroads sign (blank sign), an unplugged cable.
- **Emotion**: gentle bemusement. Never sad.
- **Canonical**:
  ```
  {style_block}, an astronaut floating in cosmic space holding a paper map, confused but calm,
  small planet and stars in background, 16:9 composition with character centered,
  duotone palette plus deep navy background, no text, vector flat
  ```

### Error — 500 / server error

- **Subject**: tech-metaphor without being alarming. Hot-air balloon deflating, unplugged server cable, friendly robot with a screwdriver, a workbench with tools.
- **Emotion**: "we're on it" reassurance.

### Error — offline / no connection

- **Subject**: paper airplane returning, two tin cans with string cut, cloud with a disconnection icon shape (not literal Wi-Fi symbol).

### Success — task complete

- **Subject**: character with arms raised, balloons rising, confetti bursts, a flag planted atop a mountain, a checkmark that is a physical object (wooden, stitched) not a glyph.
- **Emotion**: celebratory but short of circus.
- **Canonical**:
  ```
  {style_block}, a character on a small green hill planting a triangular flag,
  confetti drifting around them, sunset sky, 3:2 composition center,
  duotone palette with warm accent, no text, vector flat
  ```

### Success — upgrade / payment confirmed

- **Subject**: character unwrapping a gift box, unlocking a gate, a rocket in stable orbit, a trophy on a pedestal.

### Feature explainer — marketing hero

- **Subject**: conceptual metaphor for the feature (a conductor leading notes = automation; a chef plating = templates).
- **Aspect**: 16:9 or 21:9, wider than in-app.
- **Treatment**: same style_block but allow more props and secondary characters.

### Prompt-template meta-rules

1. **Freeze the style block** in a `style.yaml` at repo root; the prompt-to-asset interpolates it unchanged.
2. **Specify aspect ratio per state** — never let the model default.
3. **Always include "no text, no letters, no signage"** unless the renderer is Ideogram/Recraft and you want controlled text (rare in illustrations; prefer to render copy in the DOM).
4. **Always specify "safe area 70 percent" or "subject fully inside frame, 15% margin"** to avoid gutter clipping.
5. **Seed-lock within a set**: generate a batch with incrementing seeds from a fixed base (e.g. 42, 43, 44…) to keep stochastic variance low.
6. **Negative prompt boilerplate** (SD/SDXL/SD3 only): `photorealistic, photograph, 3d render (unless wanted), text, letters, watermark, signature, frame, border, extra limbs, extra fingers, mutated hands, low quality, blurry, jpeg artifacts, dithering, grain`.

> **Updated 2026-04-21:** Flux (all variants — FLUX.1 and FLUX.2) does NOT support `negative_prompt` — passing it raises a `TypeError`. For Flux, encode negatives as affirmative anchors in the main prompt instead: e.g., `"pure white background, no text, no watermark"`. SD, SDXL, and SD3 support `negative_prompt` natively.

## Production Integration

The end-to-end pipeline a skill should orchestrate:

### Step 1 — Concept image (raster)

> **Updated 2026-04-21:** Model landscape has shifted significantly. Prefer FLUX.2 (Pro/Dev) over FLUX.1 for multi-reference consistency (up to 10 refs natively). Midjourney V7 is current stable; V8 Alpha available. Recraft V4 / V4 Pro SVG supersede V3 for vector work. gpt-image-1.5 supersedes gpt-image-1 (cheaper, faster, better text). Gemini image API requires billing; AI Studio web UI remains free.

- Model: FLUX.2 [dev/pro] + style LoRA, or Midjourney v7/v8 with `--sref`, or Gemini Nano Banana via AI Studio (web UI, free) with 3 reference images, or GPT Image 1.5 with style refs.
- Output: 2048×2048 or target-aspect PNG.
- Quality gate: human (or agent) review against a 10-point checklist — on-palette, on-style, correct aspect, safe area respected, no baked text, no extra limbs, character cast consistent.

### Step 2 — Vectorization / Recraft pass

> **Updated 2026-04-21:** Recraft is now on **V4**, which ships four tiers: V4 (raster), V4 Vector (SVG, ~15 s), V4 Pro (raster 2048×2048, ~30 s), V4 Pro SVG (high-res vector, ~45 s). V4 Pro SVG is the recommended option for complex illustrations requiring fine path detail. Recraft V2 docs references in earlier revisions are now stale.

- Option A — **Recraft V4 / V4 Pro SVG** ([recraft.ai](https://www.recraft.ai/)) natively produces editable SVG. If the concept image was made in Recraft with a saved Style, skip vectorization entirely.
- Option B — **vtracer** ([github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer)) or **potrace** ([potrace.sourceforge.net](https://potrace.sourceforge.net/)) for raster→SVG. Works best on flat, low-palette illustrations; reduce palette with `pngquant` or `magick -colors 8` first.
- Option C — **Adobe Illustrator Image Trace** when a human designer is in the loop.
- Cleanup: run the SVG through SVGO ([github.com/svg/svgo](https://github.com/svg/svgo)) with `removeViewBox: false`, `cleanupIDs: prefix`. Remove any `<text>` nodes defensively.

### Step 3 — Figma library

- Import SVGs as components into a Figma file called `illustrations/` with pages per state category.
- Each component uses **Figma variables** for palette (mapped to your brand tokens) so a single change cascades.
- Component naming: `illustration/empty/inbox`, `illustration/error/404`, etc.
- Tag with metadata properties: `state`, `aspect`, `dark_mode_variant`.
- Use Figma's **variants** feature to hold light and dark mode pairs.

### Step 4 — Code export

- Tooling options:
  - [SVGR](https://react-svgr.com/) — CLI to turn SVGs into React components with prop-controlled colors.
  - Figma plugin **"Figma to React Native"** / **"Anima"** for bulk export.
  - Custom: Figma REST API + SVGR for full automation in CI.
- Final React component shape:
  ```tsx
  export const EmptyInbox = ({ className, accent = "currentColor", ...props }: SVGProps) => (
    <svg viewBox="0 0 480 360" className={className} {...props}>
      {/* paths reference `accent` via fill={accent} where palette variable applies */}
    </svg>
  );
  ```
- Palette parameterization: either (a) pass `accent` prop and use `currentColor`/CSS custom properties for brand tokens, or (b) inject `--brand-accent` and `--brand-muted` in `:root` and reference in the SVG.

### Step 5 — Storybook + visual regression

- Stories in Storybook: one per component, each with light/dark backgrounds.
- Chromatic or Playwright snapshot tests to catch accidental palette drift at PR time.

### Known failures & their fixes

| Failure | Symptom | Fix |
|---|---|---|
| Style drift across sessions | Week 2 illustrations have navy where week 1 had indigo | Lock `--sref` id or use LoRA; never regenerate from raw prompt alone |
| Baked-in text | "OOPS!" appears as SVG paths, won't translate | Always include `no text, no letters, no signage` negative; post-check with an OCR pass (tesseract) before merging; reject if any glyph detected |
| Inconsistent character | Different face shapes slide-to-slide | Character LoRA or IP-Adapter FaceID; generate all carousel slides in one batch with shared seed base |
| Aspect ratio mismatch | Illustration is 1:1 but card slot is 3:2 | Specify aspect in prompt; validate with `identify` / `sharp` in CI; auto-pad with brand-color bars only as last resort |
| Gutter/safe-area clipping | Character's head cropped by `rounded-2xl overflow-hidden` | Prompt "safe area 70 percent"; add `<rect>` guide layer during review; widen safe margin to 15% |
| Palette drift | `#6C63FF` becomes `#7B61FF` | Post-process: quantize SVG fills to brand palette via script matching nearest token |
| Over-rendered / photo-realistic | Diffusion slips into realism | Add `flat vector, no gradients, no shadows (or: soft flat shadows only)` and strong negatives; lower CFG to 5–6 |
| Inconsistent stroke width | Some scenes outlined, some not | Freeze `no outlines` or `2px outline everywhere` in style block; check via SVG path analysis |
| Dark-mode breakage | Colors invert poorly | Author light and dark variants; use CSS variables; test each at design time |

## Reference tooling (quick directory)

- **unDraw** — [undraw.co](https://undraw.co/) — flat SVG library, palette-swappable.
- **Humaaans** — [humaaans.com](https://www.humaaans.com/) — CC0 character kit.
- **Open Peeps** — [openpeeps.com](https://openpeeps.com/) — hand-drawn CC0.
- **Storyset** — [storyset.com](https://storyset.com/) — wide style library, Lottie-enabled.
- **ManyPixels Gallery** — [manypixels.co/gallery](https://www.manypixels.co/gallery).
- **Blush** — [blush.design](https://blush.design/) — composable mix-and-match.
- **Icons8 Ouch** — [icons8.com/illustrations](https://icons8.com/illustrations).
- **DrawKit** — [drawkit.com](https://www.drawkit.com/).
- **Popsy** — [popsy.co](https://popsy.co/) — hand-drawn freebies.
- **Recraft** — [recraft.ai](https://www.recraft.ai/) — vector-native gen, Style feature.
- **IP-Adapter** — [github.com/tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter) (original, unmaintained since Jan 2024). For Flux: [InstantX/FLUX.1-dev-IP-Adapter](https://github.com/InstantX-Team/InstantX-IP-Adapter).
- **ai-toolkit (Flux LoRA)** — [github.com/ostris/ai-toolkit](https://github.com/ostris/ai-toolkit).
- **kohya-ss/sd-scripts** — [github.com/kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts).
- **SVGO** — [github.com/svg/svgo](https://github.com/svg/svgo).
- **vtracer** — [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer).
- **SVGR** — [react-svgr.com](https://react-svgr.com/).
- **Material 3 illustration** — [m3.material.io/styles/illustration/overview](https://m3.material.io/styles/illustration/overview).
- **Midjourney Style Reference docs** — [docs.midjourney.com/hc/en-us/articles/32162917505549](https://docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference).
- **Flux Redux announcement** — [blackforestlabs.ai/announcing-flux-1-tools](https://blackforestlabs.ai/announcing-flux-1-tools/).
- **LoRA paper** — [arXiv:2106.09685](https://arxiv.org/abs/2106.09685).
- **IP-Adapter paper** — [arXiv:2308.06721](https://arxiv.org/abs/2308.06721).

## References

1. Hu, E. J. et al. "LoRA: Low-Rank Adaptation of Large Language Models." 2021. [arXiv:2106.09685](https://arxiv.org/abs/2106.09685).
2. Ye, H. et al. "IP-Adapter: Text-Compatible Image Prompt Adapter for Text-to-Image Diffusion Models." 2023. [arXiv:2308.06721](https://arxiv.org/abs/2308.06721).
3. Midjourney Docs. "Style Reference." 2024–2026. [docs.midjourney.com](https://docs.midjourney.com/hc/en-us/articles/32162917505549-Style-Reference).
4. Black Forest Labs. "FLUX.1 Tools" (Redux, Fill, Depth, Canny). 2024. [blackforestlabs.ai](https://blackforestlabs.ai/announcing-flux-1-tools/).
5. Google. "Material 3 — Illustration." Continuously updated. [m3.material.io/styles/illustration/overview](https://m3.material.io/styles/illustration/overview).
6. Stanley, P. "Humaaans" and "Open Peeps." [humaaans.com](https://www.humaaans.com/), [openpeeps.com](https://openpeeps.com/).
7. Limpitsouni, K. "unDraw." [undraw.co](https://undraw.co/).
8. Freepik. "Storyset." [storyset.com](https://storyset.com/).
9. Recraft. Product docs & API. [recraft.ai](https://www.recraft.ai/).
10. Hugging Face Diffusers. "LoRA Training Guide." [huggingface.co/docs/diffusers/en/training/lora](https://huggingface.co/docs/diffusers/en/training/lora).
11. ostris/ai-toolkit. Flux LoRA training. [github.com/ostris/ai-toolkit](https://github.com/ostris/ai-toolkit).
12. XLabs-AI/x-flux. Flux IP-Adapter & ControlNets. [github.com/XLabs-AI/x-flux](https://github.com/XLabs-AI/x-flux).
13. visioncortex/vtracer. Raster to SVG. [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer).
14. SVGO. SVG optimization. [github.com/svg/svgo](https://github.com/svg/svgo).
15. SVGR. SVG to React. [react-svgr.com](https://react-svgr.com/).
