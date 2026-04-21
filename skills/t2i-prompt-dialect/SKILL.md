---
name: t2i-prompt-dialect
description: Rewrite an asset brief into the exact prompt dialect of the target image model (OpenAI gpt-image-1, Google Imagen/Gemini, SDXL, Flux.1/Flux.2, Midjourney, Ideogram, Recraft). Handles negative-prompt translation, token budgets, transparency quirks, brand-palette injection, and text-in-image ceilings so that `asset_generate_*` submissions succeed on the first try.
trigger_phrases: [rewrite prompt, prompt dialect, adapt prompt, model-specific prompt, per-model prompt]
---

# T2I prompt dialect

Runs between `asset_enhance_prompt()` and `asset_generate_*()`. Takes a normalized brief plus a target model and emits a prompt that honors that model's syntax, token budget, and quirks.

## Per-model rules (quick card)

| Model | Grammar | Token / char ceiling | Negative prompt | Transparency | Text ceiling |
|---|---|---|---|---|---|
| `gpt-image-1` / `gpt-image-1.5` | Prose, Subject→Context→Style→Constraints | ~100 words | **silently ignored** | API param `background: "transparent"` | ~30 chars / ≤5 words |
| Imagen 3/4, Gemini Flash Image | Narrative prose, **≥30 words** (suppresses internal rewriter) | unbounded | silently ignored | **never request in prompt** (renders checkerboard) | 10–20 chars |
| SD 1.5 / SDXL | Tag-soup, comma-separated, no articles | **77 CLIP tokens**, chunk via `BREAK` | **full CFG support, use it** | LayerDiffuse adapter or matte post | ≤3 words |
| Flux.1 / Flux.2 | Prose narrative, long sentences OK | 512 (Flux.1) / ~32K (Flux.2) | **errors 400 if sent** | no native RGBA; matte post | Flux.1 ≤5 words; Flux.2 ~10–15 |
| Midjourney v6/v7 | Prose + `--flags` | unbounded | `--no X` = `:: X::-0.5` (sum >0) | none; matte post | ≤3 words (fragile) |
| Ideogram 2/3 Turbo | Prose + text in `"double quotes"` | unbounded | silently ignored | v3: `style: "transparent"` API param | ≤5 words (best-in-class) |
| Recraft V3/V4 | Prose + `controls.colors` + `style_id` | unbounded | silently ignored | native SVG handles alpha trivially | ≤5 words |

## Negative-prompt translation

Only SDXL and Midjourney accept negative prompts. Everything else needs affirmative rewrites:

```
"blurry"                → "tack-sharp, high-resolution"
"low quality"           → "professional quality, fine details"
"watermark"             → "clean unmarked composition"
"extra fingers"         → "anatomically correct, five fingers per hand"
"cartoon"               → "photorealistic, naturalistic rendering"
"no gradients"          → "flat vector style, solid colors"
"no drop shadows"       → "flat design, crisp edges"
"no text"               → "purely visual, no embedded typography"
```

## Text-in-image — the ≤3-word rule

Every diffusion sampler garbles text past its ceiling. If the brief wants >3–5 words of copy:

1. Generate the mark **text-free** via T2I.
2. Composite the wordmark as SVG `<text>` (or design-tool type layer) post-render.
3. Use brand typography from `BrandBundle.typography`.
4. Ideogram 3 is the only exception (≤5 words reliably); `gpt-image-1` is second.

Quoted-text syntax per model:
```
gpt-image-1:  "The text 'Acme' in bold sans-serif"
Ideogram:     A wordmark "Morning Brew" in geometric sans-serif
Flux.1/2:     The heading "OPEN" in large bold sans-serif, color #FF6B6B
SDXL:         text 'acme' on background   (tag-soup, fragile)
```

## Brand injection per model

| Model | Palette delivery | Style lock |
|---|---|---|
| Flux.1 | hex codes in prose | T5 picks up named colors + hex |
| Flux.2 | JSON `color_palette: ["#hex", …]` | up to 8 reference images |
| SDXL | `(#hex style:0.8)` tag + IP-Adapter image | LoRA weights / IP-Adapter ref |
| Midjourney | color words in prose + `--sref <id> --sw 250–400` | `--sref`, `--cref`, `--mref` |
| Ideogram | prose color description | `style_reference_images` or `style_codes` |
| Recraft | **`controls.colors: ["#hex"]` (hard enforcement)** | **`style_id: "uuid"` (tight lock)** |

Encode `BrandBundle.do_not[]` as affirmative anchors. Never forward literal "no X" language to Flux/Imagen/Ideogram/Recraft — translate it.

## Dialect-rewrite template (logo example)

Input: `"logo for my meditation app called Stillness, minimal, navy and white"`

```
gpt-image-1:
  A minimalist geometric logo for Stillness, a meditation app. A single stylized
  lotus form composed of overlapping curved lines, deep navy #0A1F44 and soft white
  #FAFAFA. Flat vector style, no gradients, no shadows. Centered composition on a
  transparent background. Scalable to 32×32 pixels.
  [API: background="transparent", size="1024x1024"]

Imagen 3 (≥30 words):
  A serene vector logo for Stillness, a mindfulness meditation app. The mark shows
  a stylized seated figure in lotus position as simple overlapping curves, in deep
  navy #0A1F44 and soft white #FAFAFA. Minimalist line-weight aesthetic with generous
  negative space. Flat design, centered, solid pure white background. Scalable to
  app-icon sizes.

Flux.1 [dev] (no negative_prompt, guidance 3.5):
  A minimalist geometric logo for Stillness. A stylized lotus mark composed of
  overlapping curves in deep navy #0A1F44 and soft white #FAFAFA. Flat vector style,
  crisp edges, solid colors. Centered on a clean white background. Scalable, works
  at 32×32 pixels.

SDXL (77-token chunked):
  masterpiece, vector logo, minimalist meditation mark, lotus geometry, deep navy
  #0A1F44, soft white #FAFAFA, flat design, (centered:1.2), white background
  BREAK
  professional, sharp details, scalable, clean composition, no shadow, no watermark
  NEGATIVE: blurry, low quality, photorealistic, watermark, text, distorted shapes

Ideogram 3 Turbo (+ wordmark):
  A minimalist vector logo for a meditation app. A stylized lotus mark in deep navy
  on white. Wordmark "Stillness" in modern geometric sans-serif, tight letter
  spacing, bold weight. Flat design, centered, high contrast.
  [API: style="transparent" if transparency required]

Recraft V3:
  prompt: "A minimalist geometric meditation logo, lotus mark, flat vector design."
  controls.colors: ["#0A1F44", "#FAFAFA"]
  style_id: "<brand-uuid if locked>"
```

## Pre-submission checklist

```
Every brief:
☐ subject noun is concrete (not just adjectives)
☐ text ≤ model ceiling, else plan composite
☐ transparency intent matches model capability

SDXL only:
☐ positive prompt ≤77 tokens per BREAK chunk
☐ weights in [0.7, 2.0]

Flux only:
☐ no `negative_prompt` field (400 error)
☐ guidance_scale [2.5, 4.5] for [dev]; omit for [schnell]

Imagen/Gemini only:
☐ prompt ≥30 words (suppresses auto-rewriter)
☐ no transparency request in prompt text

Ideogram only:
☐ exact text in double quotes
☐ style="transparent" set if RGBA needed (v3)
☐ Magic Prompt off for brand work

Recraft only:
☐ style_id set if brand lock needed
☐ palette ≤4 hex codes
```

## Common mistakes

- Forwarding user's brief verbatim (skips dialect rewrite → ~40% lower success rate)
- Asking Imagen/Gemini for transparency (produces checkerboard)
- Sending `negative_prompt` to Flux (400 error)
- Omitting `background: "transparent"` API param on `gpt-image-1` (silent failure)
- Adjective overload (`"beautiful, stunning, amazing"`) — replace with concrete descriptors
- Prompt <30 words on Imagen — internal rewriter strips style specificity

## Research

- `docs/research/01-prompt-engineering-theory/1c-llm-prompt-expansion.md` — LLM rewriter intent preservation
- `docs/research/01-prompt-engineering-theory/1d-prompt-weighting-syntax.md` — per-ecosystem weighting
- `docs/research/06-stable-diffusion-flux/6b-flux-family-prompting.md` — Flux guidance distillation, T5 semantics
- `docs/research/07-midjourney-ideogram-recraft/7e-commercial-tool-asset-workflows.md` — end-to-end recipes
- `docs/research/24-skills-for-p2a/03-t2i-prompt-dialect-skill.md` — full design spec
