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

### 1.2 Google Imagen 4 & Gemini Flash Image (Nano Banana)

> **Updated 2026-04-21:** Gemini 2.5 Flash Image ("Nano Banana") has a partially-restored free API tier of ~500 RPD (10 RPM) as of February 2026 — no billing required. Nano Banana Pro (Gemini 3 Pro Image Preview) remains paid-only ($0.134/img at 2K). Imagen 4 Fast is $0.02/img paid. Do NOT list Gemini/Imagen as zero-key free routes without the free-tier caveat; the free quota was slashed 50–80% in December 2025 and has only partially recovered for Flash Image.

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

### 1.5 Midjourney v7 / v8

> **Updated 2026-04-21:** Midjourney V8 Alpha launched March 17, 2026 with 5× faster generation, native 2K resolution, improved text rendering (significantly better than V7), and direct text-to-video (up to 10s at 60fps). V8.1 Alpha is current as of April 2026. Midjourney still has **no official public API** as of April 2026 — no developer REST endpoint, SDK, or documented API key system is publicly available. Midjourney is considering an enterprise API but no release date is confirmed. Third-party proxy APIs violate Midjourney TOS and risk account bans. V7→V8 sref code migration: V8 sref numeric codes differ from V6/V7; regenerate style codes against V8.

- **Grammar:** Prose + `--flags`. V8 follows detailed multi-element prompts with higher fidelity than V7.
- **Negative:** `--no concept` syntax (= `:: concept::-0.5`). Weight sum must remain positive.
- **Style lock:** `--sref <image_id> --sw 100 --style raw` (regenerate sref codes against V8; V6/V7 codes produce different results).
- **Text:** V8 Alpha delivers significantly improved text accuracy — street signs, product labels, poster copy — but composite is still preferred for brand wordmarks requiring exact kerning.
- **Standard flags:** `--ar 1:1 --style raw`.
- **API access:** No official public API. Use `external_prompt_only` mode (web UI) for all users.

### 1.6 Ideogram 3 / 3 Turbo

> **Updated 2026-04-21:** Ideogram 3 Turbo pricing is $0.04/image (not free). Text rendering accuracy is ~90–95% for Turbo; Quality tier ($0.10/image) is higher. Turbo is best for drafts/speed; use Quality for final brand wordmark assets. Text ceiling for reliable rendering: ≤4 words for Turbo, longer phrases (up to ~8–10 words) for Quality tier.
>
> **Transparency correction:** Ideogram v3 transparent generation uses a **dedicated endpoint** (`POST /ideogram-v3/generate-transparent`), NOT a `style: "transparent"` parameter on the standard endpoint. The standard `/ideogram-v3/generate` endpoint has no transparency param. Use the separate transparent endpoint for RGBA output.

- **Grammar:** Prose + text strings in double quotes.
- **Best-in-class text rendering:** ≤4 words reliable for Turbo; ≤8–10 for Quality.
- **Transparency (v3):** Use the dedicated `/ideogram-v3/generate-transparent` endpoint — outputs PNG with alpha channel directly. This is a separate endpoint, NOT a param on the standard generate endpoint.
- **Magic Prompt:** Turn off for brand work — it overwrites intent.
- **Pricing:** Turbo $0.04/img · Balanced $0.07/img · Quality $0.10/img.

```
BEFORE: "logo with text acme in it"
AFTER:  "A minimalist vector logo for ACME. Geometric interconnected circles 
         in deep navy. Wordmark 'ACME' in modern sans-serif, tight tracking, 
         bold weight. Flat design, centered, high contrast. White background."
WITH v3 TRANSPARENCY: call /ideogram-v3/generate-transparent endpoint (not style param)
```

### 1.7 Recraft V4 (current — V3 superseded)

> **Updated 2026-04-21:** Recraft V4 confirmed as current production model family (released February 2026). V3 is superseded. V4 ships four variants: **V4** (standard raster, ~10s), **V4 Vector** (native SVG, ~15s), **V4 Pro** (2048×2048 raster, ~30s), **V4 Pro Vector** (high-res native SVG, ~45s). Recraft is the only AI model that natively generates production-ready vector SVGs — real editable paths, not raster-to-vector tracing. Controls API is largely compatible with V3; verify current parameter names via context7 before using.

- **Brand lock:** `style_id: "uuid"` (persistent style across generations).
- **Palette:** `controls.colors: ["#hex", ...]` (hard palette enforcement, V4 compatible).
- **Native SVG:** V4 Vector and V4 Pro Vector are the current native vector output models. Real SVG paths, not raster-to-vector tracing. Output opens directly in Illustrator, Figma, or Sketch.
- **Path count:** Target ≤60–80 paths for a clean logo mark (V4 Vector); V4 Pro Vector handles more complex geometry.

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

> **Updated 2026-04-21:** Ideogram 3 Turbo reliable ceiling revised to ≤4 words based on 2026 user data; Quality tier extends to ~8–10 words. Midjourney V8 Alpha (March 2026) significantly improved text rendering — readable street signs, product labels — but composite is still preferred for exact brand wordmarks. GPT-image-1.5 (released December 2025, current OpenAI image model) maintains similar text-rendering ceiling to gpt-image-1 with improvements in brand logo preservation across edits. DALL-E 3 shutting down May 12, 2026 — migrate to gpt-image-1.5.

| Model | Reliable ceiling | Error mode |
|---|---|---|
| Ideogram 3 Turbo | ≤4 words (Turbo); ≤8–10 (Quality) | Misspelling, kerning collapse |
| `gpt-image-1` / `gpt-image-1.5` | ≤30 chars (~5 words) | Character substitution |
| Nano Banana Pro (Gemini 3 Pro Image) | ≤20 chars | Character substitution |
| Flux.2 [pro/max] | ~10–15 words | Fragile on long copy |
| Flux.1 [pro] | ≤5 words | Kerning errors |
| SDXL | ≤3 words | Hallucination |
| Midjourney v8 Alpha | ≤6–8 words (much improved vs V7) | Spacing errors on complex text |
| Midjourney v7 | ≤5 words (improved vs V6) | Spacing errors on longer text |

> **DALL-E 3 deprecation:** DALL-E 3 API shuts down May 12, 2026. If you have any references to `dall-e-3` in code or routing tables, migrate to `gpt-image-1.5` (current) or `gpt-image-1` (stable). gpt-image-1.5 is 20% cheaper per image than gpt-image-1 and has stronger brand logo preservation in edits.

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
