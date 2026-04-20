---
category: 07-midjourney-ideogram-recraft
angle: 7b
title: "Ideogram 2.0 / 2a / 3.0 — Class-Leading Text-in-Image for Logos, Wordmarks, and UI Hero Copy"
slug: 7b-ideogram-text-rendering-for-logos
status: draft
last_updated: 2026-04-19
primary_sources:
  - https://about.ideogram.ai/3.0
  - https://about.ideogram.ai/2.0
  - https://about.ideogram.ai/canvas
  - https://developer.ideogram.ai/api-reference/api-reference/generate-v3
  - https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
  - https://docs.ideogram.ai/using-ideogram/generation-settings/available-models
  - https://docs.ideogram.ai/using-ideogram/generation-settings/magic-prompt
  - https://docs.ideogram.ai/using-ideogram/generation-settings/render-speed
  - https://ideogram.ai/features/api-pricing
models_covered: [V_2, V_2_TURBO, V_2A, V_2A_TURBO, V_3]
use_cases: [wordmark-logo, brand-hero-banner, sign-in-hero, promotional-poster, og-card, pricing-banner]
top_findings:
  - "Ideogram 3.0 is the only T2I provider that ships a first-class transparent-background endpoint (/v1/ideogram-v3/generate-transparent) built specifically for logo / sticker export — this is the single most under-advertised reason to route logo work through Ideogram instead of Flux or gpt-image-1."
  - "Style Codes (8-char hex) + Style Reference Images (up to 3, max 10 MB total) give you a reproducible style token that survives re-rolls, seeds, and aspect-ratio changes; this is the closest thing on the market to a 'brand token' for non-fine-tuned users."
  - "Magic Prompt is ON-by-default and will silently rewrite short prompts (e.g. '\"Logo for NoteKit, minimal\"' becomes a 200-word scene description). For logo work you almost always want magic_prompt=OFF, because prompt drift is the #1 reason Ideogram adds background props, shadows, and photo backdrops to what should be a clean wordmark."
---

# Ideogram 2.0 / 2a / 3.0 — Text-in-Image for Logos

## Executive Summary

Ideogram is the only major closed-source text-to-image provider that was designed, from its first model, around legible typography. Every release — 1.0 (Feb 2024), 2.0 (Aug 21 2024), 2a (Feb 27 2025), 3.0 (Mar 26 2025), 3.0 May 1 2025 refresh — has been benchmarked publicly on the specific task of rendering correctly spelled, kerned, and stylised text inside an image. For a prompt-enhancement system whose failure mode is "Gemini renders 'N0TEKIT' as 'NOTKIET'," Ideogram is the default escape hatch.

The combination that matters for logo / brand work:

1. **Text rendering that is ~90% accurate on short English strings** (reported by independent benchmarks and LM Arena human preference data) versus ~50–70% for Flux 1.1 Pro and Midjourney v6/v7. (See *Text-Rendering Benchmarks* below.)
2. **A dedicated transparent-background endpoint** (`/v1/ideogram-v3/generate-transparent`) that returns true alpha-channel PNGs, not a checkerboard-pattern-on-solid-white that Gemini / Imagen frequently fail with. This closes the gap the user hits today.
3. **A full editing surface** — Canvas, Magic Fill (inpainting), Extend (outpainting), Remix, Replace Background, Describe, Upscale — exposed both in the UI *and* the API, so an agent can iteratively refine a logo without round-tripping through Photoshop or a rembg pass.
4. **Style primitives** — `style_type`, `style_preset` (62 named presets), `style_codes` (reproducible 8-char tokens), and `style_reference_images` (up to 3) — that give a prompt-to-asset deterministic knobs rather than free-text guesses.

Where Ideogram falls down is on *font-level* control (you can coerce a vibe but you cannot specify a licensed font family), on brand-guideline strictness (colours drift even with `color_palette`), and on long-form or non-Latin text (accuracy degrades sharply past ~200 characters, and CJK/Arabic still fail at roughly the rate of Flux).

## Capability Matrix

| Capability | V_2 (Aug 2024) | V_2A / V_2A_TURBO (Feb 2025) | V_3 (Mar/May 2025) |
|---|---|---|---|
| Text accuracy (short English) | ~85% | ~85% (tuned for design/photo) | ~90% (highest human-eval ELO of any public T2I for design prompts) |
| Photorealism | Good | Best-in-class for 2x-family | Best (matches / beats Imagen 4, Flux 1.1 Pro Ultra on LM Arena) |
| Style types | Realistic / Design / 3D / Anime | Realistic / Design / 3D / Anime (6 presets: Auto/General/Realistic/Design/Render 3D/Anime) | AUTO / GENERAL / REALISTIC / DESIGN / FICTION |
| Named style presets | — | — | 62 (e.g. `BAUHAUS`, `ART_DECO`, `FLAT_VECTOR`, `HALFTONE_PRINT`, `VINTAGE_POSTER`) |
| Style Codes (reproducible) | — | — | Yes (8-char hex; ~4.3 B presets) |
| Style Reference Images | — | — | Up to 3, ≤10 MB total |
| Character Reference | — | — | 1 image, billed at higher tier |
| Color palette | Preset or hex members + weights | — (not supported on V_2A / V_2A_TURBO) | Preset (`EMBER` / `FRESH` / `JUNGLE` / `MAGIC` / `MELON` / `MOSAIC` / `PASTEL` / `ULTRAMARINE`) or hex members + weights |
| Aspect ratios | any incl. 3:1, 1:3 | flexible | 15 enumerated (1x1, 1x2, 2x1, 1x3, 3x1, 9x16, 16x9, 10x16, 16x10, 2x3, 3x2, 3x4, 4x3, 4x5, 5x4) |
| Resolution override | — | — | ~80 discrete pairs, 512×1536 up to 1536×640 |
| Render speeds | DEFAULT / QUALITY | TURBO / DEFAULT / QUALITY | FLASH / TURBO / DEFAULT / QUALITY |
| Transparent background | — | — | Yes — dedicated endpoint `/generate-transparent` |
| Canvas (UI) | — | Available (launched Oct 22 2024) | Available |
| Magic Fill (inpainting, API) | — | Available | Available |
| Extend (outpainting, API) | — | Available | Available |
| Replace Background (API) | — | — | Yes (`/replace-background-v3`) |
| Magic Prompt | ON / OFF / AUTO | ON / OFF / AUTO | ON / OFF / AUTO |

Sources: Ideogram 2.0 blog (`about.ideogram.ai/2.0`, Aug 21 2024), Ideogram 3.0 blog (`about.ideogram.ai/3.0`, Mar 26 2025), Canvas blog (`about.ideogram.ai/canvas`, Oct 22 2024), Available Models doc (`docs.ideogram.ai/using-ideogram/generation-settings/available-models`), V3 OpenAPI spec (`developer.ideogram.ai/api-reference/api-reference/generate-v3`).

## API Reference

### Auth and transport

- Base URL: `https://api.ideogram.ai`
- Header: `Api-Key: <your_key>` (note the hyphen; not `Authorization: Bearer`)
- Transport: all generation endpoints are `multipart/form-data`, not JSON. This matters because style reference images and masks must be uploaded as file parts in the same request.
- Default rate limit: 10 in-flight requests (contact `partnership@ideogram.ai` for higher).

### V_3 generate

`POST /v1/ideogram-v3/generate` — the primary endpoint for logo work as of 2025.

Request fields (from the published OpenAPI 3.1 spec):

```yaml
prompt:                   string (required)
seed:                     integer             # reproducibility
resolution:               enum (~80 options)  # or use aspect_ratio
aspect_ratio:             1x1 | 1x2 | 2x1 | 1x3 | 3x1 | 9x16 | 16x9 | 10x16 | 16x10
                          | 2x3 | 3x2 | 3x4 | 4x3 | 4x5 | 5x4   # default 1x1
rendering_speed:          FLASH | TURBO | DEFAULT | QUALITY     # default DEFAULT
magic_prompt:             AUTO | ON | OFF                       # default AUTO (dangerous; see below)
negative_prompt:          string                                # prompt wins on conflict
num_images:               integer (default 1)
color_palette:
  name: EMBER | FRESH | JUNGLE | MAGIC | MELON | MOSAIC | PASTEL | ULTRAMARINE
  # OR
  members:
    - { color_hex: "#0B5FFF", color_weight: 1.0 }
    - { color_hex: "#FFFFFF", color_weight: 0.4 }
style_type:               AUTO | GENERAL | REALISTIC | DESIGN | FICTION  # default GENERAL
style_preset:             one of 62 named enums                 # e.g. BAUHAUS, FLAT_VECTOR, ART_DECO
style_codes:              [string,...]                          # 8-char hex; mutually exclusive with style_reference_images / style_type
style_reference_images:   up to 3 files (JPEG/PNG/WebP), ≤10 MB total
character_reference_images:        1 file (billed at character-reference rate)
character_reference_images_mask:   optional grayscale mask(s)
```

Response (HTTP 200):

```json
{
  "created": "2026-04-19T...",
  "data": [
    {
      "url": "https://...ideogram.ai/...",        // expires; download immediately
      "prompt": "<possibly-rewritten prompt>",    // reflects Magic Prompt output
      "resolution": "1024x1024",
      "is_image_safe": true,
      "seed": 1234567890,
      "style_type": "DESIGN"
    }
  ]
}
```

Error codes worth handling: `422` (prompt tripped safety filter — common on brand names that collide with public figures), `429` (rate limited), `401` (bad API key), `400` (conflicting style primitives — e.g. setting `style_codes` and `style_type` together).

### V_3 generate-transparent (the logo endpoint)

`POST /v1/ideogram-v3/generate-transparent` returns a PNG with a true alpha channel. It internally forces generation at the maximum resolution supported for the requested aspect ratio and can run the upscaler in-line (`upscale_factor` parameter). This is the single most important endpoint for icon / wordmark / sticker workloads and the correct alternative to Gemini + rembg pipelines.

### Other V_3 endpoints (from `developer.ideogram.ai/api-reference`)

- `POST /v1/ideogram-v3/remix` — reuse a generated image as a conditioning input.
- `POST /v1/ideogram-v3/edit` — mask-guided inpainting (Magic Fill).
- `POST /v1/ideogram-v3/reframe` — outpainting (Extend).
- `POST /v1/ideogram-v3/replace-background` — swap a background while preserving subject.
- `POST /v1/describe` — image → prompt (useful for reverse-engineering a competitor logo into a style prompt).
- `POST /v1/upscale` — creative upscaler.

### Legacy endpoints

V_2, V_2_TURBO, V_2A, V_2A_TURBO are still billed and documented but do not support `color_palette` (V_2A/V_2A_TURBO), `style_codes`, `style_reference_images`, or `character_reference_images`. New integrations should default to V_3; fall back to V_2A_TURBO only for latency-critical flows (~5 s).

### Pricing snapshot (as of Aug 6 2025 pricing page)

- Ideogram publishes flat per-output-image fees; the full table requires viewing the page live. Third-party mirrors quote: V3 **Turbo ≈ $0.03**, **Balanced ≈ $0.06**, **Quality ≈ $0.09** per image.
- 2a is ~50% cheaper than 2.0 at the same tier.
- Character-reference calls are billed at a higher rate (not explicitly listed on the public page — confirm at runtime).
- `/upscale` and `/describe` are flat-fee per input.

## Text-Rendering Benchmarks

### Independent comparative results (2025–2026)

| Model | Short English (≤30 chars) accuracy | Long English (≥200 chars) accuracy | Non-Latin scripts |
|---|---|---|---|
| **Ideogram 3.0** | ~90% | ~50%, degrades fast past 200 chars | Partial Chinese / Arabic / Devanagari support in 3.0; still unreliable |
| Flux 1.1 Pro | ~70–75% (dual CLIP + T5, char-level encoding helps) | ~30% | Near-zero for CJK |
| Flux 2 Pro | ~80% (reported) | ~40% | Poor |
| gpt-image-1 (GPT-4o image) | ~85% (Transfusion arch renders 48+ langs natively) | ~40% | Best multilingual of the group, but composition weaker than Ideogram |
| Midjourney v6/v7 | ~55–65% (v7 better than v6 but still unreliable) | <20% | Effectively unsupported |
| Recraft V3 | ~80% (also a text-specialised model) | ~35% | Limited |
| Imagen 4 / Gemini 2.5 Flash Image | ~75% | ~30% | Partial |

Notes: numbers are medians across several public 2026 head-to-heads (blog.picassoia.com, comparegen.ai, vibedex.ai, cliprise.app, nestcontent.com). LM Arena human-preference ELO for design-style prompts places Ideogram 3.0 at the top; for general photorealism gpt-image-1 leads.

Operational takeaways for a prompt-to-asset:

- **Keep on-image copy ≤200 characters, ideally ≤60.** All models collapse past 200; Ideogram collapses more gracefully but still collapses.
- **Hyphenation / punctuation is the #1 mutation failure.** An apostrophe in "don't" is dropped ~20% of runs. Rewrite copy to remove apostrophes and em-dashes where possible.
- **All-caps renders more reliably than mixed-case.** Kerning in small-cap lowercase glyphs is where most models go wrong first.
- **Never put two separate text blocks in one prompt without positional anchors.** Ideogram handles two blocks best when you say "at the top" / "bottom right / centered below".
- **Numbers are weaker than letters.** Prices like "$19" render well; phone numbers and UUIDs do not.

### Glyph-ByT5-v2 context

Academic work (Glyph-ByT5-v2, arXiv:2406.10208) shows Ideogram 1.0 and DALL-E 3 had "nearly zero" visual spelling accuracy on Chinese/Japanese/Korean. Ideogram 3.0 improved this but did not close the gap — the fundamental issue is training-data scarcity for non-Latin glyphs, not architectural. If non-Latin text is required, the right call today is either (a) let Ideogram generate the composition with a Latin placeholder and overlay the real text in SVG, or (b) fall back to gpt-image-1.

## Logo-Specific Prompt Patterns

### 1. Wordmark logo, transparent background

```
POST /v1/ideogram-v3/generate-transparent
prompt: A minimal wordmark logo that reads "NoteKit" in a bold, geometric sans-serif, all lowercase, tight letter-spacing, high-contrast solid black on a fully transparent background. Centered, generous padding, no decorative elements, no icon, no tagline, no shadow, vector-like clean edges.
aspect_ratio: 16x9
rendering_speed: QUALITY
magic_prompt: OFF
style_type: DESIGN
negative_prompt: photograph, 3d, shadow, gradient, background elements, sparkles, rays, frame, border, emboss, bevel, drop shadow, extra text, watermark, second logo, mockup
num_images: 4
seed: 424242
```

Why these choices:
- `magic_prompt: OFF` — prevents Ideogram's LM from adding "sitting on a wooden desk" scene props.
- `style_type: DESIGN` — routes through the typography-optimised branch rather than photorealism.
- Negative prompt aggressively kills photo/3D/framing contamination.
- `rendering_speed: QUALITY` — the ~3x cost over TURBO is worth it for commercial wordmarks.
- `aspect_ratio: 16x9` not `1x1` — gives the model horizontal breathing room so tight tracking doesn't cause it to squeeze glyphs.
- `num_images: 4` because Ideogram's first render is rarely the best; always sample a batch and pick.

### 2. Iconic mark + wordmark lockup

```
prompt: A flat vector logo lockup for "Humazier" — a minimalist speech-bubble icon made of two overlapping rounded rectangles on the left, a thin vertical divider, and the wordmark "Humazier" to the right in a modern geometric sans-serif, medium weight, slight optical kerning. Primary color #4F46E5, icon in 1px #312E81 outline. Clean, centered, white background for now. No tagline, no 3D, no photo.
style_type: DESIGN
style_preset: FLAT_VECTOR
color_palette:
  members:
    - { color_hex: "#4F46E5", color_weight: 1.0 }
    - { color_hex: "#312E81", color_weight: 0.6 }
    - { color_hex: "#FFFFFF", color_weight: 0.4 }
magic_prompt: OFF
aspect_ratio: 3x1
```

Follow-up: pipe the chosen output through `/generate-transparent` with the same seed and `remix` endpoint to rebuild on alpha, *or* run the current result through a background removal pipeline (see category 16). Ideogram's own `replace-background-v3` can also drop a transparent background if you pass "transparent, alpha, none" as the target.

### 3. Sign-in page hero with embedded text

```
prompt: A soft, dawn-lit abstract hero illustration for a sign-in page. Gentle diagonal gradient from #F8FAFC at top to #E0E7FF at bottom with subtle paper grain. Centered text that reads "Welcome back" in a refined serif, large, #0F172A, with a smaller line "Sign in to continue to NoteKit" below in a grotesque sans-serif, #475569. Left-aligned on desktop, 3:2 composition, generous negative space on the right for an auth form. No people, no photos, no decorative 3D, no shadow text.
aspect_ratio: 3x2
rendering_speed: DEFAULT
style_type: DESIGN
magic_prompt: OFF
negative_prompt: people, faces, mockup frame, phone, laptop, computer, UI chrome, window, button, form fields, screenshot, 3d render, glass morphism, neon
```

### 4. Promo poster / OG card with style consistency across assets

Use `style_codes` (8-char hex) to lock visual identity across a campaign. Workflow:

1. Generate a hero poster with `style_type: DESIGN` and your prompt + `color_palette`.
2. Extract the returned `style_code` from the UI (Canvas → Style Code) or by iterating reference images through the style random feature until you find one you like.
3. Reuse that code as `style_codes: ["ABCD1234"]` on subsequent calls and drop `style_type` and `style_reference_images` (they are mutually exclusive).

Or: upload 1–3 reference images via `style_reference_images` to transfer vibe without explicitly describing it. This is the fastest way to replicate the look of an existing brand asset when you cannot write it down.

### 5. Agent-facing Canvas recipe (iterative logo refinement)

The Canvas editing flow, expressed as API calls, is:

1. `/v1/ideogram-v3/generate` with `style_type: DESIGN`, 4 variants, keep a seed.
2. Pick the best variant; submit to `/v1/ideogram-v3/edit` with a mask around the logo glyphs and a prompt like "same wordmark, fix the kerning between 'K' and 'i', keep all other letters identical."
3. Submit to `/v1/ideogram-v3/reframe` (Extend) with a 16x9 target if you need an OG card.
4. Submit to `/v1/ideogram-v3/replace-background` if the background is wrong.
5. Finally, re-generate on `/generate-transparent` with the same seed + prompt for a clean RGBA deliverable.

This is the closest thing to a "designer-in-a-loop" API that any 2026 commercial provider offers; Flux has `kontext`, OpenAI has in-model editing, but Ideogram is the only one with all five operations exposed as independent, mask-aware endpoints.

## Limitations

1. **No true font control.** You cannot pin a licensed family (Inter, Helvetica Neue, SF Pro). You can only coerce a *class* ("geometric sans-serif", "condensed grotesque", "humanist serif"). For a brand-guideline system this means Ideogram's output is a *concept*, not a final deliverable — you almost always need to re-typeset the chosen wordmark in a vector tool (or via an SVG font pipeline) before shipping.
2. **Brand color drift.** Even with `color_palette.members` and explicit hex + weight, outputs can drift 10–20 ΔE from the target. For strict brand work, post-process: quantise to the palette or remap with a `convert` / `magick -remap` pass.
3. **Magic Prompt is a footgun on short prompts.** Default `AUTO` silently expands "logo for NoteKit" into a 200-word photoreal scene. Always force `magic_prompt: OFF` for logo / icon work; only enable it for illustration or poster prompts where scene invention is welcome.
4. **Long-text collapse.** Accuracy degrades sharply past ~200 characters. Break a poster into 2–3 short text blocks with explicit positional anchors rather than one paragraph.
5. **Non-Latin scripts still unreliable.** Better than 1.0 but far from solved. Treat CJK/Arabic/Devanagari as "placeholder-only" — generate Latin, overlay real glyphs in SVG.
6. **Style Codes are not fully portable across model versions.** A code found on 3.0 (March) may drift when 3.0 (May) is used. Pin the model version in your client.
7. **Safety filter false positives.** Brand names that share tokens with public figures, medical terms, or political figures can trip 422. Provide a sanitised fallback prompt.
8. **No RGBA in UI Canvas for uploaded images on cheap plans.** `generate-transparent` is API-only on some tiers; UI transparency export requires Plus/Pro.
9. **No SVG output.** All output is raster (PNG, up to ~1536 px). For vector deliverables you must vectorise (potrace / vtracer / Recraft) — see category 12 and 16.
10. **Rate limit of 10 concurrent in-flight requests** on default plan. Batch generation features (Ideogram 3.0 blog) are UI-only; the API caller must implement concurrency and backoff.
11. **URLs expire.** Generated image URLs are ephemeral. Download immediately; do not store the URL as the permanent reference.

## References

### Ideogram primary sources

- Ideogram 3.0 release blog, Mar 26 2025 — https://about.ideogram.ai/3.0
- Ideogram 2.0 release blog, Aug 21 2024 — https://about.ideogram.ai/2.0 (also mirrored at https://ideogram.ai/features/2.0)
- Ideogram Canvas / Magic Fill / Extend blog, Oct 22 2024 — https://about.ideogram.ai/canvas
- Ideogram 2a announcement (LinkedIn / testingcatalog summary), Feb 27 2025 — https://www.testingcatalog.com/ideogram-2a-arrives-speed-affordability-and-photorealistic-ai-graphics/
- Available Models doc (release dates) — https://docs.ideogram.ai/using-ideogram/generation-settings/available-models
- Magic Prompt doc — https://docs.ideogram.ai/using-ideogram/generation-settings/magic-prompt
- Render Speed doc — https://docs.ideogram.ai/using-ideogram/generation-settings/render-speed
- Prompting Guide (Using Magic Prompt, Troubleshooting) — https://docs.ideogram.ai/using-ideogram/prompting-guide/
- Canvas Overview doc — https://docs.ideogram.ai/canvas-and-editing/canvas/canvas-overview
- Extend doc — https://docs.ideogram.ai/canvas-and-editing/canvas/extend
- Text Tool doc — https://docs.ideogram.ai/canvas-and-editing/canvas/text-tool

### API

- API Overview — https://developer.ideogram.ai/ideogram-api/api-overview
- API Reference index — https://developer.ideogram.ai/api-reference
- Generate V3 (full OpenAPI spec) — https://developer.ideogram.ai/api-reference/api-reference/generate-v3
- Generate V3 Transparent — https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
- Replace Background V3 — https://developer.ideogram.ai/api-reference/api-reference/replace-background-v3
- Upscale — https://developer.ideogram.ai/api-reference/api-reference/upscale
- Machine-readable docs index — https://developer.ideogram.ai/api-reference/api-reference/llms.txt
- Pricing page — https://ideogram.ai/features/api-pricing

### Benchmarks and comparative reviews

- "Flux 1.1 Pro vs Ideogram 3.0" — https://blog.picassoia.com/flux-1-1-pro-vs-ideogram-3-0-for-ai-art
- "Why Ideogram 3.0 Excels at Text Rendering" — https://blog.picassoia.com/ideogram-3-text-in-images
- "Midjourney vs Ideogram vs Flux 2026" — https://www.comparegen.ai/blog/midjourney-vs-ideogram-vs-flux-2026
- "FLUX.2 Pro vs Ideogram 3 vs Seedream 4.5" — https://vibedex.ai/blog/flux-2-pro-vs-ideogram-3-vs-seedream-45
- "Text to Image AI: 15 Generators Tested and Ranked (2026)" — https://nestcontent.com/blog/text-to-image-ai
- "AI Logo Generator 2026 — Which Models Render Text" — https://cliprise.app/learn/guides/getting-started/ai-logo-generator-complete-guide-2026
- LM Arena Text-to-Image Leaderboard — https://lmarena.ai/vi/leaderboard/text-to-image
- "Ideogram 3.0 with Enhanced Text Rendering and Style Control" (Learn Prompting) — https://test.learnprompting.org/blog/ideogram-3-0
- Replicate Ideogram V3 Balanced readme — https://replicate.com/ideogram-ai/ideogram-v3-balanced/readme
- "How to Use Ideogram for Logo Design in 2026" — https://www.ebaqdesign.com/blog/ideogram-logo-design
- "Ideogram AI Review 2026" — https://aigeartools.com/product-review/ideogram-ai-review/

### Academic

- Glyph-ByT5-v2: multilingual visual text rendering (arXiv 2406.10208) — https://arxiv.org/html/2406.10208v1

### Third-party wrappers (for pricing cross-reference and alternate SDKs)

- Replicate `ideogram-ai/*` — https://replicate.com/ideogram-ai
- Runware Ideogram provider docs — https://runware.ai/docs/en/providers/ideogram
- WaveSpeedAI Ideogram V3 Quality — https://wavespeed.ai/docs/docs-api/ideogram-ai-ideogram-v3-quality

---

*Word count target 2,000–3,500. This document is scoped to logo / wordmark / hero-text usage; for general Ideogram vs Midjourney vs Recraft positioning see sibling angles in category 07. For transparent-background pipelines see category 13. For vector / SVG post-processing see categories 12 and 16.*
