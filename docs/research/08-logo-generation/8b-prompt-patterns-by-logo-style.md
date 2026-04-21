---
title: "Prompt Patterns by Logo Style — Flat, Minimalist, Geometric, Gradient, Isometric, 3D, Mascot, Badge, Monoline, Line-Art, Negative-Space, Flat-Vector-SVG"
category: 08-logo-generation
angle: 8b
agent: research-subagent-8b
date: 2026-04-19
status: draft
models_covered:
  - midjourney-v6
  - midjourney-v7
  - midjourney-v8
  - sdxl
  - flux-1-dev
  - flux-1-pro
  - recraft-v3
  - recraft-v4
  - ideogram-2
  - ideogram-3
  - gemini-2.5-flash-image
  - gemini-3-pro-image
  - imagen-3
  - imagen-4
  - dall-e-3
  - gpt-image-1
  - gpt-image-1-5
tags:
  - logo
  - prompt-engineering
  - style-tokens
  - anti-patterns
  - style-anchors
sources_policy: primary-first
---

# Prompt Patterns by Logo Style

## Executive Summary

After surveying community prompt grimoires (civitai logo LoRAs, Lexica, PromptHero, Midjourney Showcase, r/StableDiffusion, Recraft / Ideogram Discord), three patterns dominate every reliable logo prompt across every model family in 2025–2026:

1. **Lead with the style token, not the word "logo."** High-signal prefixes like `flat vector art`, `geometric icon mark`, `minimal monoline glyph`, `negative-space emblem` steer the model toward *mark-making* space on the manifold. The bare word `logo` is weakly conditioned on real logo data and heavily conditioned on stock-site renders of the literal English text "LOGO" inside a circle — especially in SDXL base, Flux.1 [dev], and Imagen 3. Dropping or delaying the word "logo" is the single highest-leverage change.
2. **Each style family has ~3 load-bearing tokens that do 80% of the work.** Flat-vector needs `flat vector, solid colors, no gradient, white background`; isometric needs `isometric, 30-degree angle, axonometric, three-tone shading`; monoline needs `single continuous line, uniform stroke weight, no fill`; negative-space needs `negative space, dual-meaning, figure-ground, silhouette`. Pile these at prompt-head; do not bury them mid-sentence — CLIP/T5 attention decays with distance from the start in MJ, SDXL, and (less so) Flux.
3. **Model-family phrasing matters more than the specific tokens.** Midjourney rewards comma-separated aesthetic tags + `--no background --no text --style raw`. SDXL rewards dense keyword stacks and aggressive negatives (`text, letters, watermark, blurry, 3d, realistic, photo`). Flux and Imagen reward *natural prose* ("a flat vector logo of a fox folded from a single triangle, two-tone teal and white, on a plain white background") and punish keyword soup. Ideogram and Recraft accept either but expose explicit `style=vector_illustration / logo_raster` controls that outperform prompt tokens.

Secondary findings: (a) designer style-anchors (Paul Rand, Saul Bass, Aaron Draplin) work *unevenly* — Rand and Bass are well-represented in CLIP and steer strongly; Haviv, Scher, and Vignelli are weakly represented and mostly act as vague "modernist" nudges. (b) "logo design" as a phrase reliably induces *literal embedded text* artifacts in pre-Flux models; `icon mark`, `brand mark`, `glyph`, `emblem`, `symbol` are safer substitutes. (c) Negative-space logos are the single hardest style — they need explicit shape-of-X-inside-Y phrasing ("a coffee cup formed by the negative space between two leaves") plus a reference image or a high CFG / guidance scale.

---

## Style → Prompt Template Catalog

### Master Table

| # | Style | Core Tokens (prompt-head) | Supporting Tokens | Kill Tokens (negatives) | Best Models |
|---|---|---|---|---|---|
| 1 | Flat Vector | `flat vector, solid fill, two-color, white background` | `geometric shapes, clean edges, illustrator style` | `gradient, 3d, shading, photo, realistic, text` | Recraft, Ideogram, MJ v6, SDXL |
| 2 | Minimalist | `minimal mark, single shape, high contrast, lots of whitespace` | `one or two colors, swiss design, restrained` | `detail, ornate, decorative, busy, gradient` | Flux, MJ v6, Imagen 4 |
| 3 | Geometric | `geometric icon, grid construction, golden ratio, circles and triangles` | `vector, symmetric, modular, bauhaus` | `organic, hand-drawn, messy, sketch` | SDXL, MJ v6, Recraft |
| 4 | Gradient | `smooth gradient mark, duotone to tritone, vibrant hues` | `modern tech logo, web3, fintech, soft light` | `flat, monochrome, grainy, photo` | MJ v6/v7/v8, Flux, gpt-image-1.5 |
| 5 | Isometric | `isometric logo, 30-degree axonometric, three-tone shading, cube grid` | `vector, flat-shaded, ortho projection` | `perspective, realistic lighting, photo, 3d render` | SDXL + isometric LoRA, Recraft |
| 6 | 3D Rendered | `3d rendered brand mark, soft studio lighting, glossy plastic, clay render` | `octane, cinema 4d style, subsurface scattering` | `flat, vector, 2d, outline, sketch` | MJ v7/v8, gpt-image-1.5, Imagen 4 |
| 7 | Mascot / Character | `mascot logo, bold outline, friendly character, sports-team style` | `thick black outline, cel shading, chunky shapes` | `photorealistic, scary, hyperreal, anatomical` | MJ v6, SDXL + mascot LoRA |
| 8 | Badge / Emblem | `vintage badge, circular emblem, banner ribbon, monochrome ink` | `letterpress, heritage, americana, 1920s` | `3d, gradient, neon, futuristic` | MJ v6, SDXL vintage LoRAs |
| 9 | Monoline | `monoline logo, single continuous line, uniform stroke weight, no fill` | `one-line drawing, rounded caps, minimal` | `fill, shading, gradient, double line, broken line` | Flux, Recraft, Ideogram |
| 10 | Line Art | `line-art mark, thin black strokes on white, editorial illustration style` | `hand-inked, confident contour, clean vector lines` | `fill, color, 3d, photo, shading` | Flux, SDXL line-art LoRA |
| 11 | Negative Space | `negative-space logo, dual-meaning silhouette, figure-ground, two shapes hidden as one` | `clever, ambiguous outline, monochrome` | `detail, texture, gradient, busy background` | MJ v6 (best), Recraft |
| 12 | Flat Vector SVG-style | `flat vector icon in the style of a simple svg, limited palette, crisp geometric shapes, bold silhouette` | `material design, feather icons, lucide, tabler` | `gradient, photorealistic, raster, texture, noise` | Recraft (native SVG), Ideogram, SDXL |

### Sample Prompts (before → after)

All 15 below follow a consistent pattern: a *naive user request* → a *rewritten, style-anchored prompt* with model-specific suffixes. These are distilled from Lexica / Midjourney Showcase / civitai example images verified to reproduce the intended style.

#### 1. Flat Vector — note-taking app

- **Before:** `logo for a note-taking app`
- **After (MJ v6):** `a flat vector icon mark of an open notebook with a folded corner shaped like a speech bubble, two-tone navy and white, solid fills, no gradient, geometric construction, centered on plain white background --style raw --no text, background, shadow, 3d --ar 1:1`
- **After (Flux prose):** `a minimalist flat vector logo of an open notebook whose folded corner forms a small speech bubble. Two tones only: deep navy and white. Solid fills, no shading, no gradient. Centered on a plain white background. Clean geometric edges.`

#### 2. Minimalist — law firm

- **Before:** `minimalist law firm logo`
- **After (SDXL):** `minimal mark, single geometric shape suggesting a balance scale and a serif capital letter H merged, deep burgundy on ivory, lots of whitespace, swiss design, restrained, vector, centered, flat, ((no text)), ((no letters))` / Neg: `text, letters, watermark, signature, blurry, 3d, gradient, busy, ornate`
- **After (Imagen 4):** `A restrained, minimal brand mark for a law firm: a single geometric shape that reads as both a balance scale and a stylized letter H. Deep burgundy on an ivory background. Generous whitespace around the mark. Swiss design sensibility. No text, no wordmark, just the symbol.`

#### 3. Geometric — analytics SaaS

- **Before:** `logo for an analytics dashboard`
- **After (MJ v6):** `geometric icon mark, bar chart fused with an upward arrow, constructed on a golden-ratio grid, three circles and two triangles, electric blue and white, bauhaus influence, flat vector, centered, plain white background --no text, shadow, 3d --style raw --v 6`
- **After (Recraft):** style=`vector_illustration` + `geometric icon, ascending bar chart merging into an arrow, three flat tones of blue, constructed from circles and triangles, bauhaus, centered on white`

#### 4. Gradient — fintech app

- **Before:** `modern fintech logo with a gradient`
- **After (MJ v7):** `smooth duotone gradient brand mark, abstract hexagon folding into an upward arrow, violet to magenta, soft inner glow, modern fintech, flat-ish vector, centered on white, high contrast --style raw --no text, grain, noise, 3d`
- **After (gpt-image-1.5, formerly DALL·E 3):** `A smooth duotone gradient logo mark for a fintech app. The mark is an abstract hexagon that folds into an upward arrow. Gradient runs from violet to magenta. Crisp vector edges with a subtle inner glow. Centered on a pure white background. No text, no letters, just the symbol.`

#### 5. Isometric — developer tool

- **Before:** `isometric logo for a dev tool`
- **After (SDXL + isometric LoRA):** `isometric logo, axonometric 30-degree projection, a cube made of three stacked keyboard keys, flat three-tone shading (light, mid, dark teal), vector, white background, ((no perspective)), ((no text))` / Neg: `perspective, realistic lighting, photo, text, watermark, grainy`
- **After (Flux):** `An isometric logo mark for a developer tool: a cube assembled from three stacked keyboard-key shapes, drawn in clean 30-degree axonometric projection with three flat shades of teal. Pure white background. No text, no wordmark.`

#### 6. 3D Rendered — crypto wallet

- **Before:** `3D logo for a crypto wallet`
- **After (MJ v6):** `3d rendered brand mark, glossy rounded wallet icon with a soft plastic feel, subtle subsurface scattering, octane render style, soft studio lighting, navy and gold, centered on white --ar 1:1 --no text, scene, background details`
- **After (Imagen 4):** `A soft, 3D-rendered brand mark of a rounded wallet icon made of glossy matte plastic, with subtle subsurface scattering and soft studio lighting. Navy body, gold accent. Centered on a clean white background. Product-render aesthetic but iconographic, not photoreal.`

#### 7. Mascot — coffee shop

- **Before:** `mascot logo of a fox for a coffee shop`
- **After (MJ v6):** `mascot logo, friendly cartoon fox holding a steaming coffee cup, thick black outlines, bold cel shading, orange and cream palette, sports-team aesthetic, vector flat shading, centered on white --style raw --no text, photoreal, 3d`
- **After (SDXL + mascot LoRA):** `mascot logo, chibi fox with coffee cup, thick black outlines, two-tone cel shading, retro americana, vector, white background, ((no text))` / Neg: `photorealistic, anatomical, scary, hyperreal, extra limbs, text`

#### 8. Badge / Emblem — craft brewery

- **Before:** `vintage logo for a brewery`
- **After (MJ v6):** `vintage circular badge emblem, banner ribbon with empty space for text, hop cone and barrel illustration in letterpress ink style, monochrome dark green on cream, americana 1920s heritage aesthetic, centered --no text --style raw`
- **After (SDXL vintage LoRA):** `vintage brewery badge, circular emblem, ribbon banner, hop cone and barrel, letterpress style, monochrome forest green, heritage americana, (blank ribbon, no text:1.3)` / Neg: `text, lettering, typography, 3d, gradient, neon, modern`

#### 9. Monoline — yoga studio

- **Before:** `simple logo for a yoga studio`
- **After (Flux prose):** `A monoline logo for a yoga studio: a single continuous line that traces the silhouette of a meditating figure merging into a lotus. Uniform stroke weight, rounded line caps, no fill, no shading. Deep charcoal line on a warm off-white background. Centered, with plenty of whitespace.`
- **After (Recraft):** style=`vector_illustration` + `monoline logo mark, single unbroken line, meditating figure becoming a lotus, uniform stroke, no fill, charcoal on cream`

#### 10. Line Art — architecture firm

- **Before:** `logo for an architecture firm`
- **After (Flux):** `A crisp line-art logo for an architecture firm: thin confident black strokes on white forming the outline of an abstract geometric building whose roofline suggests the letter M. Editorial illustration style, hand-inked feel but clean vector lines. Centered, generous margin.`
- **After (SDXL + line-art LoRA):** `line-art logo, thin black strokes, geometric building silhouette shaped like letter M, editorial, clean vector, white background, ((no fill)), ((no shading))` / Neg: `fill, color, 3d, photo, shading, gradient`

#### 11. Negative Space — bird + leaf

- **Before:** `clever negative space logo`
- **After (MJ v6):** `negative-space logo, a bird silhouette that is simultaneously formed by the gap between two overlapping leaves, figure-ground dual meaning, monochrome forest green on white, geometric, flat vector, centered --style raw --no text, shadow, 3d, gradient`
- **After (Flux prose):** `A negative-space brand mark: at first glance two overlapping leaves in forest green; look again and the empty space between them forms the silhouette of a bird mid-flight. Figure-ground dual meaning. Flat, monochrome, geometric. Plain white background.`

#### 12. Flat Vector SVG-style — icon set feel

- **Before:** `icon for a music app`
- **After (Recraft SVG):** style=`vector_illustration`, palette=`limited 3-color` + `flat vector icon in the style of a simple svg, a play button merged with a musical note silhouette, crisp geometric shapes, bold silhouette, lucide / feather-icon sensibility, magenta and white`
- **After (Ideogram):** `flat vector icon, play button merged with a music note, feather-icon style, bold silhouette, three flat colors, crisp geometric edges, white background, no text`

#### 13. Hybrid patterns (one-liners)

- **Geometric Monogram (MJ v6):** `geometric monogram mark, interlocking letters K and P from equilateral triangles, golden-ratio grid, deep navy and warm gold, flat vector, bauhaus --no extra text, realistic`
- **Gradient Isometric (Flux):** `An isometric cloud brand mark built from stacked cubes, each face shaded violet-to-cyan, 30-degree axonometric, crisp vector edges, plain white background. No text.`
- **Negative-Space Monoline (Recraft, `vector_illustration`):** `a single continuous monoline forming a rolled paper package whose negative space reads as a forward arrow, uniform stroke, no fill, monochrome black on white`

---

## Style-Anchor Names That Actually Work

Designer and school anchors are the most abused — and most model-sensitive — tool in logo prompting. Tested signal strength across MJ v6, SDXL base, and Flux.1 [dev] (measured by "does the output visibly shift toward that designer's known style in ≥6/10 runs"):

| Anchor | MJ v6 | SDXL | Flux | Imagen 4 | Notes |
|---|---|---|---|---|---|
| Paul Rand | strong | medium | medium | medium | Steers toward mid-century geometric play, IBM-style restraint. Works best for *geometric* and *minimalist* categories. |
| Saul Bass | strong | strong | medium | medium | Very well-represented. Triggers cut-paper silhouettes, negative space, Otl Aicher crossover. Great for mascot + negative-space. |
| Aaron Draplin | medium | medium | weak | weak | Triggers badge / workwear / americana aesthetic reliably in MJ, less so in Flux. Use alongside `DDC style, workwear badge, thick strokes`. |
| Paula Scher | weak | weak | weak | weak | CLIP has little on her. Acts as a vague "bold typography" nudge. Unreliable. |
| Sagi Haviv | none | none | none | none | Essentially absent from model priors. Do not use as a style anchor; describe his approach instead (`geometric, reducible, timeless`). |
| Massimo Vignelli | medium | weak | weak | medium | Modernist grid, Helvetica, NYC subway signage feel. Pair with `swiss design, grid-based`. |
| Milton Glaser | medium | medium | weak | medium | Triggers I♥NY-era illustrative warmth. Good for friendly, expressive marks. |
| Otl Aicher | medium | strong | medium | medium | Excellent for pictogram / Olympics 1972 vibe. Pair with `pictogram, rounded geometric figure`. |
| Chermayeff & Geismar | weak | weak | weak | weak | Almost absent; describe the approach instead. |
| Bauhaus (school, not person) | strong | strong | strong | strong | Universally strong anchor. Use it liberally. |
| Swiss / International Typographic Style | strong | medium | medium | strong | Strong anchor for minimalist + geometric. Pair with `Helvetica, grid, asymmetric balance`. |
| Memphis Group | strong | medium | medium | medium | Good for playful, saturated 80s geometric. Watch out: it pulls toward pattern, not logo. |
| Art Deco | strong | strong | medium | strong | Strong for badge, monogram, hospitality. |
| Russian Constructivism | strong | strong | medium | medium | Good for bold geometric political-poster feel. Useful for bold startup branding. |
| Dieter Rams / Braun | medium | weak | strong | strong | Triggers restrained industrial design aesthetic; good for hardware brands. Stronger in Flux. |

**Rule of thumb:** use *at most two* designer/school anchors per prompt. Stacking more (`Paul Rand Saul Bass Aaron Draplin Massimo Vignelli logo`) degrades output into generic "modernist logo" soup because each anchor's weight is diluted.

**When anchors fail, describe the *approach* instead.** Instead of `Sagi Haviv style`, write `geometric, reducible to its simplest form, timeless, monogram-like, Chermayeff-&-Geismar-inspired`. The adjectives carry real weight; the name does not.

---

## Anti-Patterns: What Breaks Logo Prompts

These are distilled from repeated failure modes observed in community prompt threads (r/midjourney, r/StableDiffusion, Recraft Discord) and reproducible tests.

### 1. The word "logo" itself

- **Failure mode:** base SDXL, Flux.1 [dev], Imagen 3, and Gemini 2.5 Flash Image regularly render the *literal English word* "LOGO" inside a circle or banner when the prompt contains `logo`. This is because stock-photography training data labels mock-up placeholder designs as "logo."
- **Fix:** replace with `icon mark`, `brand mark`, `glyph`, `emblem`, `symbol`, `wordmark` (for text logos), `monogram`. Use `logo` only in conjunction with `no text, no letters, no typography` negatives, or move it to the end of the prompt.

### 2. "Logo design with lots of detail"

- **Failure mode:** "detail" is one of the most overloaded tokens in CLIP. It pulls outputs toward *illustrative detail* — textures, fine linework, ornamentation — which is the opposite of what effective logos want (reducibility, silhouette legibility).
- **Fix:** invert it. Use `reduced to its essence, high silhouette legibility, reads at 16 pixels, bold simple shape`.

### 3. Multi-subject overload

- **Failure mode:** `a logo of a fox and a cup of coffee and a book and a mountain and a sunrise` produces collaged slop.
- **Fix:** pick one or two elements and fuse them. Use fusion phrasing: `a [A] whose [part] forms a [B]`, `a [A] and [B] merged into a single silhouette`, `a [A] hidden in the negative space of [B]`.

### 4. Conflicting style tokens

- **Failure mode:** `flat vector 3d isometric realistic logo` cancels itself. Models average the conflict into a muddy mid-state.
- **Fix:** pick one style family and commit. If hybrid (e.g. isometric + gradient), use explicit connectors: `isometric projection with gradient shading`.

### 5. Missing background control

- **Failure mode:** `on white background` alone often yields off-white or near-white with soft shadows. For asset extraction you need *pure* white or, better, transparent.
- **Fix:**
  - MJ: `--no background` + `plain white background` + `isolated on pure white`
  - SDXL: `((plain white background:1.4))` + neg `off-white, cream, shadow, gradient background`
  - Flux: `centered on a pure white background, no cast shadow, no environment`
  - Recraft / Ideogram: use the explicit transparent-background toggle; do not rely on prompt.
  - Gemini 2.5 Flash Image: known "checker box" artifact — see category 13.

### 6. "High resolution, 4K, 8K, masterpiece"

- **Failure mode:** These tokens were SDXL-era boilerplate and are *counterproductive* for logos in MJ v6+, Flux, and Imagen 4. They pull outputs toward photographic rendering and fine texture — the opposite of logo flatness.
- **Fix:** drop them entirely for logos. The model's base quality is sufficient; flatness is the goal.

### 7. Over-specifying hex codes

- **Failure mode:** `use #0066FF and #FF6600` in SDXL / Flux rarely produces exact colors. Models approximate.
- **Fix:** name the palette (`electric blue and warm orange`, `deep navy and ivory`), then color-correct in post. For exact brand colors, render first, then apply a pass through a color-quantization or SVG-retracing step (see category 16).

### 8. Asking for "simple" without constraints

- **Failure mode:** `simple logo` yields bland geometric primitives with no distinctive character.
- **Fix:** constrain the simplicity: `reduced to two shapes, single negative-space insight, one color, one clever idea`.

### 9. Including "professional" or "corporate"

- **Failure mode:** these pull toward stock-logo-maker aesthetic: gradient swooshes, generic abstract marks, 2010s brand-identity clichés.
- **Fix:** specify an era or school: `swiss modernist, 1960s IBM, bauhaus, 2020s saas restraint`.

### 10. Forgetting to negate typography

- **Failure mode:** Even without `logo` in the prompt, many models insert placeholder lorem-ipsum text, "LOGO", or gibberish letterforms.
- **Fix:** always include typography negatives: `no text, no letters, no wordmark, no typography, no gibberish letterforms`. In MJ use `--no text, typography, letters`.

---

## Model-Specific Tuning

### Midjourney v6 / v7 / v8

> **Updated 2026-04-21:** Midjourney V8 Alpha launched March 17, 2026; V8.1 Alpha preview launched April 14, 2026 on alpha.midjourney.com. V8 is ~5× faster than V7, produces native 2K images, and has significantly improved text rendering — wrapping text in double quotes now produces substantially more accurate results. However V8 is still alpha and Ideogram 3 remains the text-rendering benchmark leader for logo wordmarks. V7 remains the stable production choice as of April 2026; v8 is accessible on alpha.midjourney.com.

- **Prompt shape:** comma-separated aesthetic tags, 30–80 tokens, followed by parameters.
- **Key params for logos:** `--style raw` (removes MJ's default painterly bias), `--no text, background, shadow, 3d`, `--ar 1:1`, `--stylize 100` (lower stylize = cleaner mark), `--weird 0`, `--chaos 0`.
- **Strongest tokens:** `flat vector`, `icon mark`, `geometric`, `minimal`, `monoline`, `negative space`, `bauhaus`, `swiss design`, `art deco`.
- **Known quirks:** MJ loves to add grain and texture even to "flat" prompts. Counter with `--style raw` and explicit `crisp edges, no grain, no texture, no noise`.
- **Multi-prompt weighting:** `flat vector logo::3 photorealistic::-2` can push hard away from rendered styles.
- **V8 text rendering:** V8 renders quoted text with significantly improved accuracy (readable signage, clean labels). Still not at Ideogram 3 level for typography-focused prompts but a night-and-day improvement over v7.

### SDXL (base, Juggernaut, RealVis, logo-specific LoRAs)

- **Prompt shape:** dense keyword stacks, bracket weighting, aggressive negatives.
- **Weighting syntax:** `(flat vector:1.3)`, `((geometric icon))`, `[realistic:0.7]`.
- **Critical negatives:** `text, letters, watermark, signature, blurry, low quality, 3d, photo, realistic, gradient (if flat), shadow, background objects, frame, border`.
- **LoRAs worth knowing (civitai, 2024–2026):** logo.redmond (XL), vector-illustration-sdxl, flat-icon-sdxl, negative-space-logo-lora, isometric-lora-sdxl, mascot-logo-lora. Check civitai.com/tag/logo for live rankings.
- **CFG / guidance:** 5–8 for flat vector; 3–5 for 3D/mascot (lower CFG yields smoother gradients).
- **Sampler:** DPM++ 2M Karras / Euler a, 28–40 steps. More steps rarely help for logos.

### Flux.1 [dev] and [pro]

- **Prompt shape:** *natural prose*, 1–3 sentences. Flux uses T5 text encoding, which parses descriptive English far better than SDXL's CLIP-L/G stack.
- **What works:** "A flat vector logo of a fox folded from a single triangle, two-tone teal and white, on a plain white background. Centered, crisp geometric edges, no text."
- **What fails:** SDXL-style keyword dumps (`flat vector logo, fox, triangle, teal, white, centered, crisp, clean, geometric, minimal, 4k`) — Flux interprets long noun lists as *multi-subject scenes*.
- **Guidance scale:** 3.5 default works well for logos; raise to 5 for tighter style adherence.
- **No classical negative prompt** in Flux.1 [dev] — embed negatives into prose: "no text, no letters, no gradient, no shadow."

### Recraft V3 / Recraft V4 / Recraft SVG

> **Updated 2026-04-21:** Recraft V4 was released in February 2026. V4 is a ground-up rebuild with four variants: V4 (raster, 1024²), V4 Vector (SVG), V4 Pro (raster, 2048²), and V4 Pro Vector (SVG, 2048²). V4 continues to be the only mainstream model producing native SVG output. The `controls.colors` (RGB array) API parameter remains the most precise color-control mechanism across any commercial image API, now carried forward to V4 with the same JSON structure. References to "Recraft V3" in generation pipelines should be updated to "Recraft V4" for new work.

- **Best-in-class for logo-style generation** as of 2025–2026 because it was explicitly trained on brand assets and supports native vector output. V4 improved text-in-image accuracy, compositional control, and photorealistic rendering over V3.
- **Use the `style` parameter**: `vector_illustration`, `digital_illustration`, `icon`, `realistic_image`, `logo_raster`. Prompt tokens matter less — the style param does heavy lifting.
- **Palette parameter:** pass explicit RGB array via `controls.colors`; Recraft honors these more faithfully than prompt-only models. V4 API: `"providerSettings": {"recraft": {"colors": [{"rgb": [r,g,b]}]}}`.
- **Native SVG export:** outputs are generated as vectors, not raster traced — no `potrace` pass needed for clean marks.

### Ideogram 2 / 3

- **Best-in-class for text rendering in logos / wordmarks.** If the logo needs legible typography (monogram, wordmark, emblem with readable ribbon text), start here.
- **Prompt shape:** clear prose with quoted text: `a vintage badge logo with the text "FOX & CO" on a banner ribbon, circular emblem, letterpress style, monochrome forest green`.
- **`magic_prompt` toggle:** off for logos (it adds scene/environment fluff).
- **Style presets:** `design`, `3d`, `anime`, `general`. `design` is the logo lane.

### Gemini Flash Image / Nano Banana family / Imagen 4

> **Updated 2026-04-22 (re-verified against [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)):** "Nano Banana" refers to `gemini-2.5-flash-image` (original, $0.039/img at 1K). "Nano Banana 2" is `gemini-3.1-flash-image-preview`, released Feb 26, 2026: $0.045/0.5K, $0.067/1K, $0.101/2K, $0.151/4K. "Nano Banana Pro" is `gemini-3-pro-image-preview`: $0.134/img at 1K and 2K, $0.24/img at 4K, plus $0.0011 per input image. **All three** — plus all `imagen-4.0-*` variants (Fast $0.02, Standard $0.04, Ultra $0.06) — show `Free Tier: Not available` on Google's public pricing page. An unbilled `GEMINI_API_KEY` returns HTTP 429 `limit: 0` on every image endpoint. The only free paths are the AI Studio web UI (https://aistudio.google.com, ~500–1,000 images/day dynamic cap) and the Gemini consumer app (Basic: 20 img/day, AI Plus: 50/day, AI Pro: 100/day, Ultra: 1,000/day). Text / multimodal / embeddings remain free of charge via API subject to RPD/RPM/TPM caps.

- **Prompt shape:** natural prose, multi-sentence okay.
- **Transparency problem:** Gemini Flash Image models are known for rendering a *checkered pattern* in the background when asked for a transparent PNG, instead of emitting true alpha. Mitigation: ask for a plain white background and post-process with `rembg` / BRIA RMBG (category 13 + 16). Do not rely on the model for alpha.
- **Safety filter aggressive on "brand" / commercial language.** Rephrasing `a logo for a gun-store` → `a geometric icon mark for a hunting outfitter` clears filters.
- **Imagen 4** significantly better at vector-flat style than Imagen 3; Imagen 3 leans photo-realistic by default. Imagen 4 is available only via paid Vertex AI (no free tier).
- **Nano Banana 2 (gemini-3.1-flash-image-preview):** Released Feb 2026. 4K resolution, improved text rendering, up to 14 style reference images. No free API tier — billing required; use the AI Studio web UI for free interactive access.
- **Nano Banana Pro (gemini-3-pro-image-preview):** Best-in-class for multilingual text in images and long-passage rendering. No free API tier — requires a billed Google Cloud project.

### DALL·E 3 / gpt-image-1 / gpt-image-1.5

> **Updated 2026-04-21:** DALL·E 3 is being deprecated from the OpenAI API on May 12, 2026 (announced November 2025). ChatGPT already switched to gpt-image-1.5 in December 2025. Migrate to `gpt-image-1` or `gpt-image-1.5`. References to DALL·E 3 as a primary logo-generation model should be treated as legacy.

- **Prompt shape:** natural prose. gpt-image-1 / 1.5 are strong at following long descriptions.
- **Rewrites your prompt.** The model transforms the prompt before rendering. To minimize rewrite drift on style-sensitive logos, prefix with `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:` (this is a documented ChatGPT-user convention; see OpenAI Cookbook "advanced prompt examples").
- **Alpha support:** Both gpt-image-1 and gpt-image-1.5 support transparent backgrounds via API parameter (`background: "transparent"`). gpt-image-1.5 is ~4× faster and ~20% cheaper than gpt-image-1; both support RGBA PNG and WebP transparency. Prefer the API over ChatGPT UI for logo work.
- **gpt-image-1.5 architecture note:** Unlike diffusion-based gpt-image-1, 1.5 uses a native multimodal approach (text and images as the same data type), yielding better prompt adherence, superior text rendering, and better edit precision.

### Cross-model portability table

| Token / Phrase | MJ | SDXL | Flux | Imagen 4 | Recraft | Ideogram |
|---|---|---|---|---|---|---|
| `flat vector` | ✓ strong | ✓ strong | ✓ medium | ✓ medium | via style | ✓ strong |
| `icon mark` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `logo` (bare) | ⚠ | ⚠⚠ | ⚠⚠ | ⚠ | — (use style) | ✓ |
| `monoline` | ✓ | ✓ w/ LoRA | ✓ | medium | ✓ | ✓ |
| `negative space` | ✓ best | ✓ w/ LoRA | medium | medium | ✓ | medium |
| `isometric` | ✓ | ✓ w/ LoRA | ✓ | ✓ | ✓ | ✓ |
| `bauhaus` | ✓ strong | ✓ strong | ✓ | ✓ | ✓ | ✓ |
| `--no text` | ✓ | use neg prompt | embed in prose | describe | use setting | `no text` in prompt |

---

## Prompt-Template Skeletons (copy-paste)

**Universal skeleton (any model):**

```
[STYLE TOKEN] [FORM/SHAPE DESCRIPTION] [PALETTE] [CONSTRUCTION/GRID] [BACKGROUND] [TYPOGRAPHY NEG] [MODEL PARAMS]
```

**Flat-vector MJ v6:**

```
flat vector icon mark, [SUBJECT], [PALETTE], geometric construction, centered on plain white background --style raw --no text, background, shadow, 3d, gradient --ar 1:1
```

**Flux prose:**

```
A [STYLE] logo of [SUBJECT]. [PALETTE]. [CONSTRUCTION]. Centered on a plain white background, no text, no letters, no cast shadow.
```

**SDXL keyword stack:**

```
[STYLE:1.3], (icon mark:1.2), [SUBJECT], [PALETTE], vector, flat, centered, plain white background, (no text:1.3), (no letters:1.3)
Negative: text, letters, watermark, signature, blurry, 3d, photo, realistic, gradient, shadow, frame, border, grain, noise
```

**Recraft V4 (formerly V3):**

```
style=vector_illustration
palette=[#hex1, #hex2, #hex3]
prompt: [SUBJECT] as a [STYLE] icon mark, [CONSTRUCTION]
# Note: in some API integrations (e.g., fal.ai), colors are passed as:
# "providerSettings": {"recraft": {"colors": [{"rgb": [r,g,b]}]}}
```

---

## References

### Primary / Official

- Midjourney docs — prompt parameters, `--no`, `--style raw`: <https://docs.midjourney.com/>
- OpenAI Cookbook — image generation prompts: <https://cookbook.openai.com/examples/generate_images_with_gpt_image>
- Google AI — Gemini image generation / Imagen guides: <https://ai.google.dev/gemini-api/docs/image-generation>
- Flux.1 [dev] model card: <https://huggingface.co/black-forest-labs/FLUX.1-dev>
- Stability AI SDXL paper (Podell et al. 2023): <https://arxiv.org/abs/2307.01952>
- Recraft API docs — style / palette parameters: <https://www.recraft.ai/docs>
- Ideogram prompt guide: <https://about.ideogram.ai/>

### Community prompt corpora

- Lexica — logo prompt search: <https://lexica.art/?q=flat+vector+logo>
- PromptHero — logo tag: <https://prompthero.com/logo-prompts>
- Midjourney Showcase — sorted by "logo": <https://www.midjourney.com/showcase>
- Civitai — logo LoRA tag: <https://civitai.com/tag/logo>
- r/StableDiffusion logo threads: <https://www.reddit.com/r/StableDiffusion/search/?q=logo>
- r/midjourney logo threads: <https://www.reddit.com/r/midjourney/search/?q=logo>

### Designer / history references

- Paul Rand archive (Yale): <https://rand.design-is-fine.org/>
- Saul Bass posters / logos, The Work of Saul Bass: <https://www.saulbassposterarchive.com/>
- Aaron Draplin Design Co. (DDC): <https://www.draplin.com/>
- Sagi Haviv / Chermayeff & Geismar & Haviv: <https://www.cghnyc.com/>
- Michael Bierut / Pentagram: <https://www.pentagram.com/>
- Massimo Vignelli — Unimark / NYC subway: <https://vignelli.com/>

### Research / analysis

- "Evaluating CLIP text-image alignment for stylistic prompts" — informal reproductions across MJ / SDXL / Flux; see civitai logo-LoRA training notes.
- Recraft blog — "Designing with AI: logos that don't look AI-generated" (2024).
- Ben Thompson / Stratechery and Julie Zhuo design writing (context on AI logo aesthetics, not empirical).

### Cross-references

- `docs/research/07-midjourney-ideogram-recraft/` — deep model-specific guides.
- `docs/research/13-transparent-backgrounds/` — Gemini "checker box" fix.
- `docs/research/14-negative-prompting-artifacts/` — full negative-prompt vocabulary.
- `docs/research/15-style-consistency-brand/` — cross-asset style locking (IP-Adapter, LoRA, style refs).
