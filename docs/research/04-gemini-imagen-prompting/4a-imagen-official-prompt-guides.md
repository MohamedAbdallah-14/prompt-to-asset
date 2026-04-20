---
angle: 4a
category: 04-gemini-imagen-prompting
title: "Official Google Imagen 3/4 Prompt Guides & Capability Docs"
research_value: high
last_updated: 2026-04-19
status: complete
primary_sources: official-google
---

# 4a — Official Google Imagen 3/4 Prompt Guides & Capability Docs

**Research value: high** — Google publishes an authoritative, first-party prompt guide plus per-model capability pages on Vertex AI and the Gemini API, and they converge cleanly on a single prompt taxonomy (subject / context / style) with stable parameter names across the 3.x and 4.x lines.

## Scope

This digest pulls together the primary prompt-writing and capability documentation that Google itself publishes for the Imagen family, so a prompt-to-asset can target these models with confidence:

- Imagen 3 (`imagen-3.0-generate-001`, `002`, `fast-generate-001`, `capability-001`)
- Imagen 4 (`imagen-4.0-generate-001`, `ultra-generate-001`, `fast-generate-001`)

Both lines are reachable two ways — **Vertex AI** (`cloud.google.com/vertex-ai/...`) for enterprise / GCP projects, and the **Gemini API / Google AI Studio** (`ai.google.dev/gemini-api/...`) for direct API keys. The prompt guide itself is hosted under Vertex AI but Google links to it from the Gemini API doc as the canonical source.

## Prompt structure Google teaches

The single official mental model across all current Imagen docs is **Subject → Context → Style**. Every Imagen prompt Google ships as an example is structured this way, even when collapsed into one sentence. ([Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide))

- **Subject** — the thing: object, person, animal, scenery.
- **Context / background** — where the subject lives: "studio with a white background", "street photography", "outdoors, golden hour".
- **Style** — the medium / aesthetic: general (`painting`, `photograph`, `sketch`) or specific (`pastel painting`, `charcoal drawing`, `isometric 3D`, `art deco poster`).

Google's canonical illustrative prompt:

> "A sketch (style) of a modern apartment building (subject) surrounded by skyscrapers (context and background)."

Google also explicitly teaches **iteration**: start with a minimal subject-plus-setting prompt, then layer on lighting, time of day, and detail modifiers one at a time. The prompt guide uses a three-step "park next to a lake" example to show the same image progressively getting closer to the user's intent as modifiers are added. ([Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide))

### Advanced modifier axes Google documents

The prompt guide formalizes six lever categories that every enhancer should consider surfacing:

1. **Photography modifiers** — camera proximity (close-up, zoomed out), camera position (aerial, from below), lighting (natural, dramatic, warm, cold), camera settings (motion blur, soft focus, bokeh, portrait), lens types (35mm, 50mm, fisheye, wide angle, macro), film types (black and white, polaroid).
2. **Shapes & materials** — `...made of...`, `...in the shape of...` ("a duffle bag made of cheese", "neon tubes in the shape of a bird").
3. **Historical art references** — `...in the style of [art period or movement]...` (impressionist, renaissance, pop art, art deco).
4. **Image quality modifiers** — `4K`, `HDR`, `studio photo`, `by a professional photographer`, `detailed`, `high-quality`, `beautiful`, `stylized`.
5. **Photorealism lens matrix** — Google publishes a table pairing use cases to lenses + focal lengths: portraits → prime/zoom 24–35mm; macro subjects → macro 60–105mm; sports/wildlife → telephoto 100–400mm with fast shutter speed; landscape/astro → wide-angle 10–24mm with long exposure.
6. **Text rendering guidance (Imagen 3+)** — keep text ≤25 characters for reliable rendering, limit to 2–3 distinct phrases, and specify general (not exact) font style/size. Google warns users to expect occasional placement variation.

([Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide))

### Prompt parameterization pattern

Google recommends building templated prompts in app UIs, with fixed scaffolding and user-selected slots:

```text
A {logo_style} logo for a {company_area} company on a solid color background. Include the text {company_name}.
```

Worked examples Google ships include "A minimalist logo for a health care company on a solid color background. Include the text Journey." — directly relevant as a prompt template we can teach the enhancer to emit. ([Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide))

## Official prompt examples (verbatim)

These are pulled verbatim from Google docs/blogs so the enhancer can anchor few-shot examples on known-good strings:

1. **Street-photography portrait (short form)** — Imagen 3 prompt guide:
   > "close-up photo of a woman in her 20s, street photography, movie still, muted orange warm tones"

2. **Same prompt, long form** — demonstrating that Imagen 3 tolerates richer prompts:
   > "captivating photo of a woman in her 20s utilizing a street photography style. The image should look like a movie still with muted orange warm tones."

3. **Photorealistic product / editorial (Imagen 3 dev guide, cookbook cover)**:
   > "A photorealistic image of a cookbook laying on a wooden kitchen table, the cover facing forward featuring a smiling family sitting at a similar table, soft overhead lighting illuminating the scene, the cookbook is the main focus of the image."

4. **Same image with rendered title** — shows the right way to request in-image text:
   > "...Add a title to the center of the cookbook cover that reads, \"Everyday Recipes\" in orange block letters."

5. **Poster with title + slogan** — prompt guide's text-rendering example:
   > "A poster with the text \"Summerland\" in bold font as a title, underneath this text is the slogan \"Summer never felt so good\""

6. **Quality-modifier A/B** — same subject, two prompts:
   > baseline: "a photo of a corn stalk"
   > with quality modifiers: "4k HDR beautiful photo of a corn stalk taken by a professional photographer"

7. **Negative-prompt usage** (Imagen 3 only — see caveats below):
   > Prompt: "4K video game concept art, urban jungle, cyberpunk city, detailed rendering"
   > Negative prompt: "greenery, plants, forest, trees"

([Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide), [A developer's guide to Imagen 3 on Vertex AI](https://cloud.google.com/blog/products/ai-machine-learning/a-developers-guide-to-imagen-3-on-vertex-ai))

## Capability matrix (Vertex AI + Gemini API)

Aggregated from Google's per-model pages and the Gemini API reference. Resolutions are what Google documents as "supported"; anything else is rounded to the nearest supported pair.

| Capability | Imagen 3 Generate 002 | Imagen 3 Fast | Imagen 3 Capability 001 | Imagen 4 Generate 001 | Imagen 4 Fast | Imagen 4 Ultra |
|---|---|---|---|---|---|---|
| Status (2026) | GA | GA | GA (edit/customize) | GA | GA | GA |
| Max images / prompt | 4 | 4 | 4 | 4 | 4 | 4 |
| Aspect ratios | 1:1, 3:4, 4:3, 9:16, 16:9 | same | same | same | same | same |
| Resolutions | 1024², 896×1280, 1280×896, 768×1408, 1408×768 | same (1K only) | same | 1K + 2K tier: 2048², 1792×2560, 2560×1792, 1536×2816, 2816×1536 | 1K only | 1K + 2K tier |
| Gemini-API `imageSize` | n/a (Vertex only via resolution) | n/a | n/a | `"1K"` \| `"2K"` | `"1K"` | `"1K"` \| `"2K"` |
| Person rendering options | `dont_allow`, `allow_adult` (default), `allow_all` | same | same | same (default becomes `allow_all` on generate/capability-002/product-recontext) | same | same |
| Negative prompts | **Generate 001 only**; removed in 002 | — | — | **not supported** | not supported | not supported |
| Seed parameter | supported (`seed`) | supported | supported | supported | supported | supported |
| SynthID watermark | always on | always on | always on | always on | always on | always on |
| Prompt language | English (full); zh/zh-TW/hi/ja/ko/pt/es in preview | same | same | same | same | same |
| Prompt length | 480 input tokens (Gemini API doc) | 480 | 480 | 480 | 480 | 480 |
| Quota (req / min / region) | varies | 200 | 100 | 75 | 150 | 30 |

Sources: [Imagen 3 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate), [Imagen 3.0 Generate 002](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate-002), [Imagen 4 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001), [Generate images using Imagen (Gemini API)](https://ai.google.dev/gemini-api/docs/imagen), [Configure aspect ratio](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-aspect-ratio), [Omit content using a negative prompt](https://cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt).

## Pricing (Vertex AI, USD per image, as of April 2026)

| Model | Per-image price |
|---|---|
| Imagen 4 Ultra (generation) | $0.06 |
| Imagen 4 (generation) | $0.04 |
| Imagen 4 Fast (generation) | $0.02 |
| Imagen 4 (upscaling to 2K/3K/4K) | $0.06 |
| Imagen 3 (generate / edit / customize) | $0.04 |
| Imagen 3 Fast (generation) | $0.02 |
| Imagen 2 / 1 (generation) | $0.020 |
| Product Recontext | $0.12 |
| Visual captioning / VQA | $0.0015 / image |

([Vertex AI generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing))

## Safety & policy filters

Google's Responsible AI docs describe two orthogonal knobs that any enhancer talking to Imagen should know about:

**`safety_filter_level`** — thresholds for harmful-content classifier:

| Console label | REST enum (current) | Legacy alias |
|---|---|---|
| Block most | `block_low_and_above` | `block_most` |
| Block some (default) | `block_medium_and_above` | `block_some` |
| Block few | `block_only_high` | `block_few` |

**`personGeneration`** / `person_generation`:

- `dont_allow` — no people/faces at all.
- `allow_adult` — adults only, including celebrities.
- `allow_all` — adults + minors. Not permitted in EU / UK / CH / MENA locations on the Gemini API.

Defaults differ by model: Imagen 4 generate models, `imagen-3.0-capability-002`, and `imagen-product-recontext` default to `allow_all`; every other model defaults to `allow_adult`. Input prompts and uploaded images are filtered as well — "offensive" prompts will be rejected before generation.

([Configure Responsible AI safety settings](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-responsible-ai-safety-settings), [Responsible AI and usage guidelines for Imagen](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/responsible-ai-imagen))

## Documented limits & failure modes

1. **Negative prompts removed in Imagen 3.0 Generate 002 and across all Imagen 4 variants.** The Vertex model page for `imagen-3.0-generate-002` explicitly lists negative prompting as unsupported, and the Imagen 4 capability pages list it under "Not supported". Callers who send `negativePrompt` to 002/4.x either get ignored values or a validation error — so the enhancer must fold exclusion intent directly into the positive prompt (e.g., rephrase "no trees" into "an empty concrete urban plaza").

2. **Text rendering caps out around 25 characters.** Google's guidance is explicit: keep on-image text ≤25 chars, limit to 2–3 phrases, and expect occasional glyph or placement variation even on Imagen 4. Long sentences, unusual fonts, or character-exact reproduction regularly fail.

3. **English-only is the only fully supported prompt language.** Chinese (simplified and traditional), Hindi, Japanese, Korean, Portuguese, and Spanish are Preview features across the entire 3.x / 4.x range — other languages will often be silently rejected or produce degraded fidelity.

4. **Prompts exceed 480 tokens will be truncated or rejected** on the Gemini API. The enhancer should budget for that when stacking modifiers.

5. **`allow_all` personGeneration is geo-restricted** on the Gemini API (EU / UK / CH / MENA). Clients in those regions silently fall back to `allow_adult`.

6. **All Imagen outputs carry a SynthID watermark** — this is non-optional on Vertex AI and the Gemini API; you cannot get a watermark-free image from either public path.

Sources: [Imagen 3 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate), [Imagen 4 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001), [Generate images using Imagen (Gemini API)](https://ai.google.dev/gemini-api/docs/imagen), [Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide).

## Prompt playgrounds Google ships

- **Vertex AI Studio — Media** — `console.cloud.google.com/vertex-ai/studio/media/generate` lets a GCP user pick Imagen 3 or 4, set aspect ratio, person-generation and safety, enter a prompt, and download up to 4 candidates. ([Generate images using text prompts with Imagen on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images))
- **Google AI Studio** — `ai.google.dev` (or `aistudio.google.com`) provides an Imagen tab with the same `aspectRatio` / `personGeneration` / `numberOfImages` / `imageSize` knobs as the Gemini API; it is the fastest way to sanity-check a prompt without billing setup. Example prompts Google surfaces in-product lean on claymation scenes, cinematography-style shots, oil-painting references, and comic-book panels — the same taxonomy as the prompt guide. ([Generate images using Imagen (Gemini API)](https://ai.google.dev/gemini-api/docs/imagen))
- **Model Garden / Model Card** — `console.cloud.google.com/vertex-ai/publishers/google/model-garden/imagen-4.0-generate-preview-06-06` has a "try it" pane pre-loaded with Imagen 4. Google's prompt guide links out to this card.

## Style customization (Imagen 3 Capability model only)

For reference-image-guided restyling, Google publishes a dedicated template on the [Instruct customization](https://cloud.google.com/vertex-ai/generative-ai/docs/image/instruct-customization) page:

> "Transform the subject in image [1] to have a style of ${STYLE_DESCRIPTION}. The image depicts ${IMAGE_DESCRIPTION}."

Example ship: `"Transform the subject in image [1] to have a style of a watercolor painting of the image with loose watercolor techniques, soft tone, pastel colors, brush strokes, delicate, clean background, spontaneity, analog style drawing, intricate highly detailed painting."` — useful for enhancer logic that targets the Capability model specifically.

## Community corroboration

Two independent sources corroborate the official story — useful because they were written against real output, not marketing copy:

- **Lovart's Imagen 4 hands-on review** confirms Google's claims about typography / small-text rendering and faster inference, and also reports that tiny handwritten or heavily stylized fonts still need multiple attempts — matching Google's own "iterate with confidence" warning. ([Imagen 4 Review: Testing Google's New Text-to-Image Power](https://www.lovart.ai/blog/imagen-4-review))
- **Third-party Imagen 4 pricing/tier breakdown** (MagicHour, ThePlanetTools) re-states the $0.02 / $0.04 / $0.06 Fast / Standard / Ultra tiers and approximate latency bands (~2.7s / 5–8s / 10–15s), which triangulate with Google's Vertex AI pricing page. ([Imagen 4 Pricing and API Access (MagicHour)](https://magichour.ai/blog/imagen-4-pricing-and-api), [Google's 3 Imagen 4 Tiers (ThePlanetTools.ai)](https://theplanettools.ai/blog/google-imagen-4-models-fast-standard-ultra-guide-2026))

## Implications for a prompt-to-asset

- **Canonical schema.** The enhancer should emit prompts in Subject + Context + Style order, optionally followed by lens/lighting/quality modifiers — this is what Google itself teaches and what its example gallery reflects.
- **Negative-intent handling.** Don't generate `negativePrompt` for Imagen 3.0-002 / Imagen 4; rewrite exclusions into positive descriptors.
- **Text rendering.** Detect when the user asks for on-image copy, clamp to ≤25 chars, split into ≤3 phrases, and surface a warning if over.
- **Aspect-ratio mapping.** Snap freeform requests to the five supported ratios (1:1, 3:4, 4:3, 9:16, 16:9) and the documented resolution list; anything outside will be rejected.
- **Model routing.** Fast → quick drafts, Standard → default, Ultra → high-stakes (covers, brand hero images). Price/quota differences are ~3x.
- **Policy-aware enhancement.** If the user's prompt implies minors or celebrities, the enhancer should at minimum annotate the required `personGeneration` setting rather than silently letting the API reject it.

## Sources

Official Google sources (≥8):

1. [Prompt and image attribute guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide) — canonical Imagen prompt guide, Vertex AI.
2. [Generate images using text prompts with Imagen on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images) — API reference + console walkthrough.
3. [Imagen 3 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate) — 3.x capability matrix.
4. [Imagen 3.0 Generate 002 model page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate-002) — explicit no-negative-prompt notice.
5. [Imagen 4 model page (generate-001)](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001) — 4.x capability + resolution tiers.
6. [Imagen 4 Ultra model page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-ultra-generate-001) — Ultra quotas.
7. [Generate images using Imagen (Gemini API)](https://ai.google.dev/gemini-api/docs/imagen) — Gemini API reference, `aspectRatio` / `personGeneration` / `numberOfImages` / `imageSize`.
8. [A developer's guide to Imagen 3 on Vertex AI (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/a-developers-guide-to-imagen-3-on-vertex-ai) — SDK examples + safety parameters.
9. [Configure aspect ratio](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-aspect-ratio) — aspect-ratio parameter docs.
10. [Omit content using a negative prompt](https://cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt) — negative-prompt doc (note: now applies only to legacy 3.0-001).
11. [Configure Responsible AI safety settings](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-responsible-ai-safety-settings) — safety filter enums + personGeneration defaults.
12. [Responsible AI and usage guidelines for Imagen](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/responsible-ai-imagen) — acceptable-use policy categories.
13. [Vertex AI generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) — per-image pricing for all Imagen variants.
14. [Instruct customization](https://cloud.google.com/vertex-ai/generative-ai/docs/image/instruct-customization) — reference-image style-transfer prompt template.
15. [Google DeepMind — Imagen](https://deepmind.google/technologies/imagen-3/) — model overview + research framing.

Community corroborations (≥2):

- [Lovart — Imagen 4 Review](https://www.lovart.ai/blog/imagen-4-review) — independent hands-on, text/typography verification.
- [MagicHour — Imagen 4 Pricing and API Access](https://magichour.ai/blog/imagen-4-pricing-and-api) — pricing triangulation.
- [ThePlanetTools.ai — Google's 3 Imagen 4 Tiers](https://theplanettools.ai/blog/google-imagen-4-models-fast-standard-ultra-guide-2026) — latency/tier corroboration.
