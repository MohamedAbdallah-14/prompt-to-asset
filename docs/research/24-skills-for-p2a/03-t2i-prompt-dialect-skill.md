---
title: "T2I prompt dialect skill design for P2A"
category: skills-for-p2a
date: 2026-04-21
---

# T2I Prompt Dialect Skill — Design Spec for P2A

A dedicated `t2i-prompt-dialect` skill would systematize the per-model "dialect" knowledge currently embedded in `asset-enhancer/SKILL.md` into a deterministic rewriting + validation pipeline. It sits **between `asset_enhance_prompt()` and `asset_generate_*()`** — takes a normalized brief, rewrites for the target model, validates, injects brand bundle, and returns a ready-to-submit prompt.

## Architecture

```
user_brief + asset_type + target_model + brand_bundle?
  ↓  NORMALIZE   → extract subject, intent, constraints, text fragments
  ↓  REWRITE     → grammar, token budget, transparency, weighting per model
  ↓  INJECT      → palette hex codes, style refs, anti-pattern rewrites
  ↓  VALIDATE    → per-model pre-generation checklist
  →  {dialect_prompt, model_params, warnings[]}
```

---

## 1. Per-Model Rewriting Rules

### 1.1 OpenAI `gpt-image-1`

- **Grammar:** Prose sentences. Subject → Context → Style → Constraints.
- **Token budget:** ~30–100 words (quality degrades past ~100).
- **Negative prompt:** Silently ignored — rewrite to affirmative.
- **Transparency:** API param `background: "transparent"`, not prompt text.
- **Text ceiling:** ~30 chars (~3–5 words) in double quotes.

Before/after:
```
BEFORE: "logo, flat design, blue and white"
AFTER:  "A minimalist geometric logo for a note-taking app featuring 
         interconnected circular shapes in deep navy and clean white, 
         flat vector style, centered on a transparent background, 
         scalable for app branding."
```

### 1.2 Google Imagen 3/4 & Gemini Flash Image

- **Grammar:** Narrative prose ≥30 words (suppresses internal rewriter).
- **Token budget:** Unbounded prose; text-in-image ceiling 10–20 chars.
- **Negative prompt:** Silently ignored — rewrite to affirmative.
- **Transparency:** Never request in prompt — renders checkerboard. Use white bg, matte externally.

Before/after:
```
BEFORE: "a logo for a meditation app"
AFTER:  "A serene vector logo for a mindfulness meditation app, featuring 
         a stylized seated figure in lotus position, calm cool tones of 
         deep teal and soft white, minimalist line-weight aesthetic, 
         generous negative space. Clean flat design, modern and approachable, 
         scalable to small app-icon sizes."
```

### 1.3 Stable Diffusion 1.5 / SDXL

- **Grammar:** Tag-soup, comma-separated, no articles.
- **Token budget:** 77 CLIP tokens (hard cap) — use `BREAK` to chunk.
- **Order:** Front-load important tags; tail tokens are weakest.
- **Weighting:** A1111 `(tag:1.5)` or compel `tag+`. Safe range: 0.7–2.0.
- **Negative prompt:** Full CFG integration — use freely.

Before/after:
```
BEFORE (over 77 tokens, no chunking):
  "best quality masterpiece trending on artstation, flat vector logo design 
   with minimalist geometric shapes, professional, award-winning, studio 
   lighting, high resolution, sharp details, centered composition on white 
   background, no shadow, no watermark, scalable design"

AFTER (chunked with BREAK):
  "masterpiece, best quality, vector logo, minimalist geometric mark, 
   flat design, (centered:1.2), white background
   BREAK
   professional, high resolution, sharp details, clean composition, 
   no shadow, no watermark, scalable geometry, app-icon ready"

NEGATIVE: "blurry, low quality, photorealistic, watermark, text, distorted shapes"
```

### 1.4 Flux.1 / Flux.2

- **Grammar:** Prose narrative. T5-XXL encoder. Long sentences work.
- **Token budget:** 512 tokens (Flux.1); ~32K context (Flux.2 / Mistral-3).
- **Negative prompt:** **Errors if sent.** Must rewrite to affirmative.
- **Guidance:** Distilled — safe range [2.5, 4.5] for [dev]; [schnell] ignores it.
- **Flux.2:** Accepts JSON-structured prompts with `color_palette` array.

Negative-to-affirmative translation:
```
"blurry"               → "tack-sharp, high-resolution"
"watermark, signature" → "clean unmarked composition"
"extra fingers"        → "anatomically correct, five fingers per hand"
"cartoon"              → "photorealistic, naturalistic rendering"
"no gradients"         → "flat vector style, solid colors"
```

Before/after:
```
BEFORE (SDXL tag-soup style):
  "minimalist logo, flat design, no shadows, masterpiece, 8k"

AFTER (Flux.1 prose):
  "A minimalist flat design logo for a note-taking app, featuring 
   geometric circular shapes in a palette of deep navy and warm white. 
   Centered composition on a clean white background. No shadows, no 
   gradients. Scalable vector-ready design, recognizable at 32×32 pixels."
```

### 1.5 Midjourney v6/v7

- **Grammar:** Prose + `--flags`.
- **Negative:** `--no concept` syntax (= `:: concept::-0.5`). Weight sum must remain positive.
- **Style lock:** `--sref <image_id> --sw 100 --style raw`.
- **Text:** ≤3 words, fragile. Composite preferred.
- **Standard flags:** `--ar 1:1 --style raw --q 2`.

### 1.6 Ideogram 2/3 Turbo

- **Grammar:** Prose + text strings in double quotes.
- **Best-in-class text rendering** (≤5 words for v3).
- **Transparency (v3):** `style: "transparent"` API param.
- **Magic Prompt:** Turn off for brand work — it overwrites intent.

```
BEFORE: "logo with text acme in it"
AFTER:  "A minimalist vector logo for ACME. Geometric interconnected circles 
         in deep navy. Wordmark 'ACME' in modern sans-serif, tight tracking, 
         bold weight. Flat design, centered, high contrast. White background."
WITH v3 TRANSPARENCY: add API param style="transparent"
```

### 1.7 Recraft V3/V4

- **Brand lock:** `style_id: "uuid"` (persistent style across generations).
- **Palette:** `controls.colors: ["#hex", ...]` (hard palette enforcement).
- **Native SVG:** Only production model with native vector output.
- **Path count:** Target ≤60–80 paths for a clean logo mark.

---

## 2. Negative Prompt Handling

| Model | Negative prompt support | Behavior | Rule |
|---|---|---|---|
| `gpt-image-1`, Imagen | No | Silently ignored | Rewrite to affirmative |
| SD 1.5 / SDXL | Yes, full CFG | Applied to conditioning | Use naturally |
| Flux.1 / Flux.2 | No | **400 error if sent** | Must rewrite |
| Midjourney | Partial (`--no`) | Weight constraint (sum >0) | Use `--no X` only |
| Ideogram, Recraft | No | Silently ignored | Positive anchors only |

---

## 3. Asset-Type Prompt Patterns

### Logo
```
"A [style] logo for [brand/industry]. [Subject geometry]. 
[Palette as hex]. [Style: flat/vector]. Centered, white background. 
Scalable to 32×32."
```

### App Icon
```
"A [style] app icon for [app], square format. Single central glyph. 
[Color]. Flat illustration, no text, no UI chrome. Centered with 
heavy padding (~15% margin). Bold, recognizable at small sizes."
```

### Favicon
```
"A simple, high-contrast [monogram/mark] for [brand]. Single letterform 
or symbol. [Color pair, 2 max]. Bold weight. Legible at 16×16 pixels."
```

### OG Image (background art only — text always composited)
```
"Editorial hero illustration, 1200×630 landscape. [Subject]. 
[Brand palette]. No text. Designed to sit behind semi-transparent 
headline copy."
```

### Illustration
```
"[Scene description]. [Style: flat/isometric]. [3–5 hex colors]. 
No photorealism. Isolated on white background. Part of cohesive 
illustration library."
```

---

## 4. Brand Bundle Injection

| Model | Palette | Style ref | Anti-pattern encoding |
|---|---|---|---|
| Flux.1 | Hex codes in prose | `clip_embeds` (not exposed) | Rewrite `do_not` to affirmative |
| Flux.2 | `color_palette` JSON array | Reference images (10 max) | Rewrite to affirmative |
| SDXL | Prose hex or `(#hex:0.8)` | `ip_adapter_image` | Full `negative_prompt` |
| Midjourney | Multi-prompt color terms | `--sref <id> --sw 100` | `--no X` with weight care |
| Ideogram | Prose color description | None | Rewrite to affirmative |
| Recraft | `controls.colors` field | `style_id: "uuid"` | Rewrite to affirmative |

---

## 5. Text-in-Image Handling — The ≤3-Word Rule

| Model | Reliable ceiling | Error mode |
|---|---|---|
| Ideogram 3 Turbo | ≤5 words | Misspelling, kerning collapse |
| `gpt-image-1` / Imagen | ≤30 chars (~5 words) | Character substitution |
| Flux.2 | ~10–15 words | Fragile on long copy |
| Flux.1 [pro] | ≤5 words | Kerning errors |
| SDXL | ≤3 words | Hallucination |
| Midjourney v7 | ≤3 words (fragile) | Spacing errors |

**For >3 words:** Generate the mark text-free, composite SVG type in Figma/Illustrator using brand typography tokens.

**Syntax per model:**
```
gpt-image-1:  "The text 'Acme' in bold sans-serif"
Ideogram:     'The wordmark "Morning Brew" in geometric sans-serif, tight spacing'
Flux.1:       "The heading 'OPEN' in large bold sans-serif, color #FF6B6B"
SDXL:         "text 'acme' on background"  (tag-soup)
```

---

## 6. Common Mistakes

| Mistake | Why it fails | Fix |
|---|---|---|
| `"transparent background"` on Imagen | Renders checkerboard artifact | Prompt for white bg; matte externally |
| Forgetting `background="transparent"` on gpt-image-1 | API param required, not prompt | Always set the param |
| Sending `negative_prompt` to Flux | 400 Bad Request | Rewrite to affirmative |
| SDXL prompt >77 tokens | Silent truncation of tail tags | Use BREAK or compress |
| `"a logo"` with no context | Model assumes photorealistic generic | Describe subject, brand, industry |
| Adjective overload (`"beautiful, stunning, amazing"`) | Adjectives don't control diffusion | Use concrete visual descriptors |
| Requesting >3-word wordmark in diffusion | All models garble counting/kerning | Composite SVG type instead |

---

## 7. Pre-Generation Quality Checklist

```
ALL MODELS:
☐ asset_type in closed enum
☐ subject noun present (not just adjectives)
☐ transparency intent matches model capability
☐ text ≤ model's ceiling (≤3 for SDXL/MJ; ≤5 for Ideogram/gpt-image-1)

SDXL ONLY:
☐ token count ≤77 per BREAK-chunk
☐ weights in range [0.7, 2.0]

FLUX ONLY:
☐ no negative_prompt field
☐ guidance_scale [2.5, 4.5] for [dev], omit for [schnell]

IMAGEN/GEMINI ONLY:
☐ prompt ≥30 words (suppresses auto-rewriter)
☐ no transparency request in prompt

IDEOGRAM ONLY:
☐ exact text in double quotes
☐ style="transparent" set if RGBA needed (v3 only)

RECRAFT ONLY:
☐ style_id set if brand lock needed
☐ palette ≤4 hex codes
☐ if SVG output: expect ≤60–80 paths for clean mark
```

---

## 8. Research References

- `docs/research/01-prompt-engineering-theory/1c-llm-prompt-expansion.md` — intent preservation challenge in LLM rewriters
- `docs/research/01-prompt-engineering-theory/1d-prompt-weighting-syntax.md` — per-ecosystem weighting semantics
- `docs/research/06-stable-diffusion-flux/6b-flux-family-prompting.md` — guidance distillation, T5 semantics, Flux.2 JSON
- `docs/research/07-midjourney-ideogram-recraft/7e-commercial-tool-asset-workflows.md` — real end-to-end recipes
- `skills/asset-enhancer/SKILL.md` — dialect rules per provider (sections "Dialect rules per provider" and "Model routing")
