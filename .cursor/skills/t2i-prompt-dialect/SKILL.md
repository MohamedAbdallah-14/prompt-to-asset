---
name: t2i-prompt-dialect
description: Rewrite an asset brief into the exact prompt dialect of the target image model (OpenAI gpt-image-1, Google Imagen/Gemini, SDXL, Flux.1/Flux.2, Midjourney, Ideogram, Recraft). Handles negative-prompt translation, token budgets, transparency quirks, brand-palette injection, and text-in-image ceilings so that `asset_generate_*` submissions succeed on the first try.
trigger_phrases: [rewrite prompt, prompt dialect, adapt prompt, model-specific prompt, per-model prompt]
---

# T2I prompt dialect

Runs between `asset_enhance_prompt()` and `asset_generate_*()`. Takes a normalized brief plus a target model and emits a prompt that honors that model's syntax, token budget, and quirks.

## Per-model rules (quick card, verified Apr 2026)

| Model | Grammar | Token / char ceiling | Negative prompt | Transparency | Text ceiling |
|---|---|---|---|---|---|
| `gpt-image-2` | Prose | ~100 words | silently ignored | **NOT supported — `background:"transparent"` 400s** (regression vs 1.5) — route transparent jobs to gpt-image-1.5 instead | ~80 chars / paragraph (~99% accuracy per third-party tests) |
| `gpt-image-1.5` | Prose | ~100 words | silently ignored | API param `background: "transparent"` | dense text ~60 chars (LM Arena #1) |
| `gpt-image-1` | Prose | ~100 words | silently ignored | API param `background: "transparent"` | ~50 chars / ≤5 words |
| Imagen 4 (Fast/Standard/Ultra) | Narrative prose, ≥30 words suppresses auto-rewriter | unbounded | **`negativePrompt` accepted on Vertex AI; ignored on Gemini API** | never request in prompt (renders checkerboard as RGB) | ≤25 chars per Google's own guidance |
| Gemini 3.1 Flash Image (Nano Banana 2) | Prose | unbounded | ignored | renders checkerboard | ~50 chars / ~90% accuracy (#1 Image Arena at launch — strong-text, not weak) |
| Gemini 3 Pro Image (Nano Banana Pro) | Prose | unbounded | ignored | renders checkerboard | paragraph-length reliable (~94-96% accuracy) |
| SD 1.5 / SDXL | Tag-soup, comma-separated, no articles | **77 CLIP tokens**, chunk via `BREAK` | **native** | LayerDiffuse adapter or matte post | "cannot render legible text" per HF card — ≤1 glyph |
| SD 3 / SD 3.5 Large | Prose + tags hybrid | 256 (T5) | **native** | matte post | ~30 chars (mid-tier; not strong-text) |
| Flux 1.1 Pro / Flux Pro | Prose narrative | 512 | **rejected at fal schema; no-op on BFL native** | matte post | 1–3 words / ~25 chars |
| Flux 2 (pro/flex/dev/klein) | Prose, JSON-structured prompts allowed | T5 + Mistral-3 24B VLM | **officially unsupported per BFL guide ("FLUX.2 does not support negative prompts")** | matte post | 5–10 words / one tagline (~92% layout accuracy) |
| Flux Schnell | Prose | 256 | unsupported | matte post | 1–2 words max |
| Midjourney v7/v8 | Prose + `--flags` | unbounded | `--no X` flag | none; matte post | ≤15 chars with `--text` |
| Ideogram 3 / 3 Turbo | Prose + text in `"double quotes"` | unbounded | **native** | dedicated `POST /v1/ideogram-v3/generate-transparent` endpoint; `rendering_speed: "TURBO"` for Turbo tier (no `style:"transparent"` param exists) | ~3–6 words reliable, ~10 with seed retries |
| Recraft V3 / V4 | Prose + `controls.colors` + `style_id` (V3 only — V4 dropped it) | unbounded | **native** | native SVG handles alpha trivially | ~3–5 words |

## Negative-prompt translation

**Native support:** SD 1.5, SDXL, SD 3 / 3.5 Large, Recraft V3 / V4, Ideogram 3 / 3 Turbo, Leonardo Phoenix / Diffusion XL, Stability-hosted, Adobe Firefly. Imagen 4 also accepts `negativePrompt` on the **Vertex AI** endpoint (not on the Gemini API endpoint).

**Silently ignored:** all `gpt-image-*`, all Gemini Flash Image / Nano Banana variants, Imagen 4 via Gemini API, Freepik Mystic, Pollinations.

**Rejected / unsupported:** Flux 1.x on fal (schema lacks the field), Flux 2 family (BFL prompting guide: "FLUX.2 does not support negative prompts" — no negative-conditioning path in the model). Sending it 400s on some surfaces and silently no-ops on others.

For models that ignore or reject it, rewrite as affirmative anchors:

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

## Text-in-image — model-specific ceilings, not a blanket rule

Every model has its own ceiling. Pick by tier:

- **Paragraph-length OK:** `gpt-image-2`, `gemini-3-pro-image-preview` (Nano Banana Pro), `gpt-image-1.5`. The model can render it; composite remains safer for UI copy that must be pixel-exact.
- **Strong (~3–10 words):** `ideogram-3` / `ideogram-3-turbo`, `gemini-3.1-flash-image-preview` (Nano Banana 2), `gpt-image-1`, `flux-2` family.
- **OK (~3–4 words / ≤25 chars):** Imagen 4 family, Recraft V4, Midjourney v7/v8.
- **Weak (1–3 words):** Flux Pro / 1.1 Pro, original `gemini-2.5-flash-image`, Freepik Mystic, Pollinations.
- **Cannot render text:** SDXL, SD 1.5, Flux Schnell, Flux 2 Klein. Composite always.

For weak / cannot-render tiers past ceiling: generate **text-free**, then composite the wordmark as SVG `<text>` (or design-tool type layer) using `BrandBundle.typography`.

Quoted-text syntax per model:
```
gpt-image-2:  The text "Acme" in bold sans-serif at the top, white on navy
gpt-image-1:  "The text 'Acme' in bold sans-serif"
Ideogram:     A wordmark "Morning Brew" in geometric sans-serif
Flux.2:       The heading "OPEN" in large bold sans-serif, color #FF6B6B
Nano Banana Pro: A magazine cover with the headline "The Future of Compute" centered, in serif
SDXL:         text 'acme' on background   (tag-soup, fragile, ≤1 glyph reliable)
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
  [API for transparency: POST /v1/ideogram-v3/generate-transparent with
   rendering_speed:"TURBO" — no `style:transparent` parameter exists]

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
☐ no `negative_prompt` field (BFL guide: "FLUX.2 does not support negative prompts")
☐ guidance_scale [2.5, 4.5] for [dev]; omit for [schnell]

Imagen/Gemini only:
☐ prompt ≥30 words on Imagen 4 (suppresses auto-rewriter)
☐ no transparency request in prompt text (RGB-only VAE)
☐ for Imagen 4 negative prompts, hit the Vertex AI endpoint, not the Gemini API

Ideogram only:
☐ exact text in double quotes
☐ for transparency, hit POST /v1/ideogram-v3/generate-transparent (no style param)
☐ Magic Prompt off for brand work

Recraft only:
☐ style_id set if brand lock needed
☐ palette ≤4 hex codes
```

## Common mistakes

- Forwarding user's brief verbatim (skips dialect rewrite → ~40% lower success rate)
- Asking Imagen/Gemini for transparency (produces checkerboard)
- Sending `negative_prompt` to Flux (rejected on 1.x fal schemas; no-op on Flux 2 family)
- Sending `background: "transparent"` to gpt-image-2 (400s — regression vs gpt-image-1.5; route transparent jobs to gpt-image-1.5 instead)
- Omitting `background: "transparent"` API param on `gpt-image-1` / `gpt-image-1.5` (silent failure)
- Adjective overload (`"beautiful, stunning, amazing"`) — replace with concrete descriptors
- Prompt <30 words on Imagen — internal rewriter strips style specificity

## Research

- `docs/research/01-prompt-engineering-theory/1c-llm-prompt-expansion.md` — LLM rewriter intent preservation
- `docs/research/01-prompt-engineering-theory/1d-prompt-weighting-syntax.md` — per-ecosystem weighting
- `docs/research/06-stable-diffusion-flux/6b-flux-family-prompting.md` — Flux guidance distillation, T5 semantics
- `docs/research/07-midjourney-ideogram-recraft/7e-commercial-tool-asset-workflows.md` — end-to-end recipes
- `docs/research/24-skills-for-p2a/03-t2i-prompt-dialect-skill.md` — full design spec
