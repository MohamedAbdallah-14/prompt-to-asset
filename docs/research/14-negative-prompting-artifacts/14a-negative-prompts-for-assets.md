---
category: 14-negative-prompting-artifacts
angle: 14a
angle_title: Negative prompt theory re-applied to asset generation — what "negative" actually does, per model, per asset type
last_updated: 2026-04-19
related:
  - docs/research/01-prompt-engineering-theory/1a-cfg-and-negative-prompts.md
primary_sources:
  - https://arxiv.org/abs/2207.12598
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt
  - https://docs.midjourney.com/docs/no
  - https://docs.midjourney.com/docs/multi-prompts
  - https://developer.ideogram.ai/api-reference/api-reference/generate-v3
  - https://docs.ideogram.ai/using-ideogram/generation-settings/negative-prompt
  - https://docs.ideogram.ai/using-ideogram/prompting-guide/4-handling-negatives
  - https://bfl.mintlify.app/guides/prompting_guide_t2i_negative
  - https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17
  - https://github.com/huggingface/diffusers/issues/9124
  - https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256
  - https://civitai.com/models/7808
  - https://civitai.com/models/122403/bad-x-bad-sdxl-negative-embedding
  - https://platform.openai.com/docs/guides/images
  - https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
---

# Negative Prompting for Asset Generation — What "Negative" Actually Does, Per Model, Per Asset Type

## Executive Summary

- **Negative prompting is a sampler trick, not a model feature.** In the CFG equation (`ε̂ = ε_u + w · (ε_c − ε_u)`, Ho & Salimans 2022) the negative prompt hijacks the unconditional branch `ε_u`. It works only on models that still run real two-pass CFG at inference — SDXL, SD 1.5, SD3, Kolors, Pixart-Σ. On guidance-distilled models (Flux.1-dev/schnell, SDXL-Turbo, SD3-Turbo) there is no `ε_u` to replace, so negative prompts don't engage and the common hack of stuffing them into the positive string routinely *causes the exact artifact it names* (the "no text → adds text" failure).
- **Each asset class has its own signature artifact menagerie.** Logos fail on photorealism, drop shadows, 3D renders, and watermarks; app icons fail on text/letters, double-stacking, cluttered sub-elements, and platform mismatch (iOS squircle vs Material rounded-square); illustrations fail on "AI-generic" stock-photo feel, grainy output, watermarks, and malformed extremities; favicons/OG images fail on transparency artifacts, checker-pattern alpha leak, and low-res banding. A prompt-to-asset should ship *per-asset* negative libraries, not one universal list.
- **The model-support matrix has four tiers, not two.** (1) *Native two-pass negative prompt* — SDXL, SD 1.5, SD3/SD3.5 (with caveats — CFG must be kept low), Ideogram (API-level, all versions including v3/v3 Turbo), Kolors, PixArt-Σ. (2) *Single-axis exclusion operator* — Midjourney `--no` and `::-0.5` multi-prompts, Recraft `negative_prompt` (raster modes only). (3) *No negative prompt at all* — ALL Flux variants (dev/schnell/pro/Kontext/FLUX.2-pro/FLUX.2-max), DALL·E 3, `gpt-image-1`, `gpt-image-1.5`, Gemini 2.5 Flash Image ("Nano Banana"), Imagen 3.0-generate-002+, Imagen 4 (all GA variants), most video models. (4) *Partial / undocumented* — community `pipeline_flux_with_cfg` re-introducing real CFG on Flux at 2× cost.

> **Updated 2026-04-21:** Vertex Imagen support corrected — negative prompts were removed starting from `imagen-3.0-generate-002`; all Imagen 4 GA models (`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`) do not support the field. `gpt-image-1.5` (released late 2025) also has no negative_prompt API parameter. Ideogram v3 and v3 Turbo confirmed supporting `negative_prompt` in the generate-v3 API.
- **Attribute leakage ("the pink elephant problem") is real and measurable.** T2I models that were not trained with CFG-aware negation treat "no X" largely the same as "X". Practitioner evidence across Flux, DALL·E, Ideogram, and Gemini converges on the same rule: never tell a no-negative model what *not* to draw; tell it what to draw *instead*. Black Forest Labs' own docs make this explicit for Flux: replace `"no text"` with `"clean surfaces, unmarked, blank"`.
- **Weighted negatives and negative embeddings multiply effective budget.** On SDXL, `(text:1.5)`, `(watermark:1.4)`, and textual-inversion embeddings like `EasyNegative`, `BadX`, `ng_deepnegative_v1_75t`, `UnrealisticDream`, and `bad-hands-5` compress dozens of artifact tokens into a single token and raise their effective weight. They are the single biggest quality-per-token lever in SDXL asset workflows and must be in any SDXL-targeting prompt enhancer's default stack.

## Model Support Matrix

| Model / Pipeline | Native negative prompt? | Mechanism | Recommended use in an enhancer |
|---|---|---|---|
| **SD 1.5** (A1111, Forge, ComfyUI, diffusers `StableDiffusionPipeline`) | **Yes** | Two-pass CFG; `negative_prompt=...`. Supports `(token:weight)` emphasis and textual-inversion embeddings. | Ship a heavy negative library + `EasyNegative`-style embeddings. CFG 6–8. |
| **SDXL 1.0 / SDXL-Refiner** (diffusers `StableDiffusionXLPipeline`) | **Yes** | Two-pass CFG; `negative_prompt=` and `negative_prompt_2=` (two text encoders). Supports weighted tokens and SDXL-specific embeddings (`BadX`, `bad-sdxl`). | Primary target for structured negatives. CFG 5–7 + CFG-rescale φ≈0.7. |
| **SD3 Medium / SD3.5** | **Yes (with caveats)** | Triple text encoders; `negative_prompt` technically supported. However SD 3.5 has known issues with CFG when combined with negative prompts ("must be watered down during generation"), and negative-token influence is weaker than SDXL in practice. Simpler lists (<10 tokens) work better than complex SDXL-style stacks. | Use negatives but keep them very short and descriptive; SD3/SD3.5 text encoders dilute long lists, and high CFG values interact poorly. Recommended CFG 4–4.5 for SD3.5 with negatives. |

> **Updated 2026-04-21:** SD 3.5's CFG+negative prompt interaction is documented as problematic — the guidance scale must be kept low (4–4.5). Avoid the SDXL-style `(token:1.5)` emphasis syntax; use plain comma-separated terms only.
| **FLUX.1-dev / FLUX.1-schnell** (black-forest-labs) | **No** (distilled) | Guidance scale is a learned embedding (Meng 2022); stock diffusers raises `TypeError` on `negative_prompt` ([diffusers #9124](https://github.com/huggingface/diffusers/issues/9124)). Community [`pipeline_flux_with_cfg`](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256) re-introduces true CFG at 2× cost. | Default path: **positive-framing rewriting**. Opt-in path: CFG-restored pipeline for users who accept the cost. |
| **FLUX.1-pro / Flux Kontext / FLUX.2 [pro] / FLUX.2 [max]** (API) | **No** | Same architecture as dev; BFL API does not expose a `negative_prompt` field across any Flux variant including the 2025/2026 FLUX.2 generation. Official guidance: "FLUX.2 does not support negative prompts — describe what you want, not what you don't." | Positive framing only across all BFL API endpoints. |

> **Updated 2026-04-21:** FLUX.2 [pro] and FLUX.2 [max] (released 2025) confirm no negative prompt support, matching all earlier Flux variants. The FLUX.2 family shows ~30% reduction in anatomy errors (hand/finger defects) compared to FLUX.1 and produces native 2048×2048 without upscale artifacts, reducing some artifact categories that previously required aggressive negative prompting.
| **Midjourney v7** (current default since June 17 2025) | **Yes (operator)** | `--no token1, token2` or inline `::-0.5` multi-prompt weights. `--no` is functionally equivalent to weighing a multi-prompt element at −0.5 per the docs. **v7 caution:** MJ's moderation parses `--no` arguments word-by-word independently (e.g. `--no modern clothing` reads as "no modern" AND "no clothing", which can accidentally trigger content warnings). | Translate the SDXL-style negative list into `--no` CSV; in v7, prefer `--no text, watermark, border` (individual concrete nouns, no adjective-noun pairs that moderation might split). |

> **Updated 2026-04-21:** Midjourney v7 was released April 3 2025 and became the default on June 17 2025. The `--no` operator semantics are unchanged but v7 documentation explicitly warns about the per-word moderation parsing behavior — avoid multi-word tokens in the `--no` list.
| **Ideogram 2.0 / 3.0 / 3.0 Turbo** | **Yes (API)** | `negative_prompt` string in the `/generate-v3` request. Official docs warn that "descriptions in the prompt take precedence" and that the model "struggles with understanding negation" — prefer positive framing when possible. The `negative_prompt` field is available identically for the standard and Turbo render speeds. | Use for the long-tail artifacts (watermark, jpeg artifacts). Keep the list short and concrete — e.g., `"No people, no animals."` |
| **Recraft v3 / v4 / v4 Pro** | **Yes (partial, raster only)** | API exposes `negative_prompt` on raster endpoints. Vector endpoints largely ignore it (the vector model reshapes primitives rather than filtering by negative guidance). Recraft V4 (released February 2026) maintains this same behavior — raster negative prompts supported, vector negative prompts ineffective. | Use for raster style modes only; for vector/SVG output, rely on style tokens and positive description instead. |

> **Updated 2026-04-21:** Recraft V4 and V4 Pro released February 2026. V4 = 1-megapixel output; V4 Pro = 4-megapixel, print-ready. Both are available on the same API; negative_prompt behavior is unchanged from V3 — effective on raster, ignored on vector.
| **DALL·E 3 / `gpt-image-1` / `gpt-image-1.5` / `gpt-image-1-mini`** | **No** | OpenAI Images API has no `negative_prompt` field across any variant. DALL·E 3 additionally *rewrites* the user's prompt server-side. `gpt-image-1` and `gpt-image-1.5` do not rewrite but also provide no negative field. "Negative" phrases embedded in natural-language prompts are sometimes honored but unreliable. | Positive framing only. "Do not" clauses inside the prompt are a last resort and are unreliable. Note: `input_fidelity="high"` on the `/images/edits` endpoint (gpt-image-1 only, not gpt-image-1.5 or mini) helps preserve logos and faces during inpainting but has no connection to negative prompting. |
| **Gemini 2.5 Flash Image ("Nano Banana") / Imagen 4** | **No** (Gemini side); **Not supported** (Imagen 4 on Vertex) | Vertex Imagen 2/3 accepted `negativePrompt`; Imagen 3.0-generate-002 and later (including all Imagen 4 variants) **dropped the field entirely** per Google's own docs: "Negative prompts are a legacy feature, and are not included with the Imagen models starting with imagen-3.0-generate-002 and newer." Gemini 2.5 Flash Image exposes no negative prompt field. | Positive framing only. |

> **Updated 2026-04-21:** Confirmed via Vertex AI docs that negative prompts are not a legacy opt-in — they are fully removed from Imagen 3.0-generate-002 onwards and from all Imagen 4 GA models (`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`). The Imagen 4 preview model removal deadline was November 30, 2025; all workflows must use GA models.
| **Kolors, PixArt-Σ, Hunyuan-DiT** | **Yes** | Real CFG; HF diffusers pipelines accept `negative_prompt`. | Treat like SDXL for enhancer purposes, minus the SDXL-specific embeddings. |
| **Video / motion** (Sora, Veo, Runway, Kling, Wan 2.x) | **Mostly no** (except Wan/Kling partial) | Temporal models rarely expose CFG negation. | Out of scope for this angle; positive framing by default. |

**Footgun:** A single config file that sends the same `{prompt, negative_prompt}` dict to every backend will silently drop the negative on Flux/DALL·E/Gemini and silently *add* it to the positive on some community wrappers that "retry with negative merged in". The enhancer must branch at the model boundary.

## Asset-Specific Negative Libraries

The universal diffusion-artifact list — `watermark, signature, jpeg artifacts, noise, border, frame, text, label, extra fingers, blurry, low-res` — is a starting point, not an ending point. Each asset class needs a *category-targeted* overlay on top of it.

### Logos

Logos are the asset class where SDXL's default manifold fights the user hardest. "Logo" in LAION-pretraining space is heavily correlated with stock-photo mockups on T-shirts and business cards, so even simple positive prompts produce photographic renders with shadows and reflections unless suppressed.

| Artifact class | Negative tokens |
|---|---|
| Photorealism drift | `photorealistic, photograph, photo, dslr, hyperrealistic, realistic rendering, skin texture` |
| 3D drift | `3d render, 3d model, octane render, blender, cinema 4d, ray tracing, raytraced, volumetric lighting` |
| Depth / shadow artifacts | `drop shadow, cast shadow, ambient occlusion, glow, bloom, lens flare, specular highlight, glossy` |
| Background contamination | `background scene, landscape, sky, cityscape, desk, mockup, paper texture, photographed on white` |
| Composition failure | `multiple logos, logo grid, logo sheet, variations, brand guidelines page, business card, t-shirt mockup` |
| Text contamination | `text, letters, words, typography, tagline, slogan, signature, watermark` |
| Quality | `low quality, worst quality, blurry, pixelated, jpeg artifacts, aliasing, banding` |

### App icons (iOS / Android / web)

App icons fail in platform-specific ways. iOS wants a full-bleed squircle (the OS applies the mask); Android adaptive icons want a centered foreground with a transparent or solid background layer; web/PWA wants a square with safe-zone padding. The negative list should suppress the *wrong platform's* conventions.

| Artifact class | Negative tokens |
|---|---|
| Platform mismatch | `android icon shape, material design circle, web favicon, ios mask already applied, rounded rectangle border, stroked square outline` |
| Text inside icon | `text, letters, numbers, label, caption, word, typography, brand name, app name` |
| Stacking / multiples | `multiple icons, icon grid, icon sheet, app store page, home screen mockup, phone mockup, device frame` |
| Skeuomorphism drift | `photorealistic, 3d render, glossy reflection, glass highlight, plastic sheen, skeuomorphic, leather texture, wood texture` |
| Depth artifacts | `heavy drop shadow, long shadow, inner shadow, bevel, emboss, 3d extrusion, isometric` (unless requested) |
| Safe-zone failure | `cropped, off-center, edge-bleeding elements, cut off, partial subject` |
| Background leak | `transparent background, checker pattern, alpha grid, gray checker, transparency preview` (only when rendering to a solid-bg asset) |

**Platform sublists** should be swapped in/out based on the `target_platform` field:

- **iOS**: negate `android adaptive icon, material design, circular mask, rounded-square outline stroke`.
- **Android adaptive**: negate `ios rounded-square, squircle, fully opaque background` (adaptive icons are layered).
- **Web/PWA**: negate `device frame, home screen, status bar, notification badge`.

### Illustrations (empty states, onboarding, marketing hero)

Illustrations suffer the most from "AI-generic" aesthetics — the over-smoothed, over-colorful, slightly-plastic style that tips readers to "this was generated". The negative list here is as much about *taste* as about artifacts.

| Artifact class | Negative tokens |
|---|---|
| AI-generic aesthetic | `generic ai illustration, ai art style, default midjourney style, corporate memphis, stock illustration, shutterstock, adobe stock` |
| Photo intrusion | `photograph, photo, dslr, stock photo, photorealism, film grain, bokeh` |
| Noise / quality | `grainy, noisy, jpeg artifacts, compression artifacts, color banding, posterization, moire pattern, low resolution` |
| Watermarks | `watermark, signature, artist name, url, copyright notice, @username` |
| Anatomy failure | `extra fingers, extra limbs, missing fingers, fused fingers, malformed hands, deformed, mutated, six fingers` |
| Composition failure | `cluttered, busy, overlapping subjects, crowded, cramped margins` |
| Style drift | `anime, manga, chibi` (unless requested); `realism` (when flat requested); `oil painting texture` (when vector requested) |

### Favicons and web/OG assets

Favicons at 16–64px and OG images at 1200×630 fail on opposite axes: favicons fail on detail (anti-aliasing mush, unreadable sub-pixel strokes), OG images fail on scale (illegible body text, bad aspect handling).

| Asset | Negative additions on top of universal list |
|---|---|
| Favicon / 32–64px | `fine detail, small text, hairline strokes, sub-pixel anti-aliasing artifacts, gradient banding, complex shading, photographic detail` |
| Transparent PNG target | `checker pattern, gray-and-white squares, alpha grid, transparency preview, jpeg compression, solid white rectangle behind subject` |
| OG / Twitter card | `cropped subject, unreadable text, centered subject clipped by share-preview crop, phone mockup, browser chrome, url bar` |

### Splash screens and marketing banners

Large-format banners fail when the T2I model places a subject in the dead center and leaves corners empty (composition fail), or when it adds UI chrome (browser bars, device frames) it picked up from stock-screenshot training data.

| Artifact class | Negative tokens |
|---|---|
| UI chrome | `browser window, browser chrome, url bar, device frame, phone mockup, laptop screen, safari, chrome, status bar, window controls` |
| Composition fail | `subject crammed in center, empty corners, dead negative space, asymmetric crop, cut off subject` |
| Text fail | `lorem ipsum, placeholder text, gibberish text, misspelled words, fake headlines` |

## Weighted and Embedding-Based Negatives (SD-family only)

Real negative-prompt engines give you two force-multipliers on top of the word list: **attention weights** and **textual-inversion embeddings**.

### Weighted negatives

A1111-style syntax (`(token:weight)`) scales the per-token contribution to the prompt's cross-attention. Typical patterns:

```
Negative:
(text:1.5), (watermark:1.4), (signature:1.3), (jpeg artifacts:1.2),
(low quality:1.4), (worst quality:1.4), (blurry:1.2),
photorealistic, 3d render, drop shadow, background
```

Guidance for an enhancer:

- Reserve `≥ 1.4` for the artifacts you truly cannot tolerate (text/watermark on logos, checker on transparent assets, extra fingers on humans).
- Avoid stacking more than ~3 tokens at `≥1.4`. High weights across many tokens compete for attention budget and cause *under-prompting* elsewhere.
- Don't duplicate a token between positive and negative — per the 1a note on cancellation, "white background" in both prompts will cancel.

Parenthesis-style emphasis is interpreted differently across tools: A1111/Forge/ComfyUI (via `A1111-cond` nodes) honor `(x:1.5)`; raw diffusers prompts do not (you need `compel` or the `prompt_weighting` utilities).

### Textual-inversion "negative embedding" TIs

These are single-token embeddings trained to represent a basket of artifacts. Dropping the trigger word into the negative prompt pulls the whole basket along.

| Embedding | Target model | What it compresses | Source |
|---|---|---|---|
| `EasyNegative` | SD 1.5 | Bad anatomy, low quality, jpeg, watermark, text | [civitai.com/models/7808](https://civitai.com/models/7808) |
| `ng_deepnegative_v1_75t` | SD 1.5 | Deformed, bad art, extra limbs | Civitai community |
| `UnrealisticDream` | SD 1.5 | Uncanny-valley faces, plastic skin | Civitai community |
| `bad-hands-5` | SD 1.5 | Malformed hands specifically | Civitai community |
| `BadX` / `bad-x` | SDXL | SDXL-era mutations of face/hands, blur, clothing anomalies | [civitai.com/models/122403](https://civitai.com/models/122403/bad-x-bad-sdxl-negative-embedding) |
| `negativeXL` | SDXL | Generic SDXL artifact basket | Civitai community |
| `unaestheticXLv31` | SDXL | Low-aesthetic photography/illustration patterns | Civitai community |

Usage (A1111/Forge):

```
Negative: EasyNegative, BadX, (text:1.5), (watermark:1.4), drop shadow, 3d render
```

ComfyUI uses `embedding:BadX,` syntax inside a CLIPTextEncode node (or dedicated `Load Negative Embedding` nodes). For any enhancer targeting SD-family locally, embeddings are the *highest leverage tokens available* — they occupy one slot of the 75-token context window but supply 30+ artifact-class coverage.

**Licensing caveat:** Many embeddings are trained on images scraped from Civitai. If the enhancer auto-installs them, document provenance and let the user opt out. A logo or brand-asset workflow with commercial-use implications should default to only embeddings with explicit permissive licenses.

## Positive-Framing Alternatives for Flux, DALL·E, gpt-image-1, Gemini

For the models in Tier 3 of the support matrix, negation routinely *adds* the thing negated. Black Forest Labs' own prompting guide says this outright: FLUX.1 "does not support negative prompts at all" and that negation "tends to backfire" — you have to "replace exclusions with specific positive descriptions" ([BFL prompting guide](https://bfl.mintlify.app/guides/prompting_guide_t2i_negative)).

### The rewriting rule

For every negative token, answer: *what would be there instead?* Then describe that instead.

| "Don't want X" (negative phrasing) | Positive-framing rewrite |
|---|---|
| `no text, no letters, no words` | `clean surfaces, unmarked, blank face, unlabeled, pure shape` |
| `no background, no scene` | `isolated on pure white, solid flat color behind subject, single-color canvas` |
| `no drop shadow, no glow` | `flat lighting, no rim light, evenly lit, cel-shading only` |
| `no photorealism, no photo` | `flat vector, 2D illustration, editorial line art, minimalist graphic` |
| `no 3D, no render` | `2D, flat, paper-cut aesthetic, sticker style` |
| `no watermark, no signature` | `clean unsigned composition, artist-name-free, no attribution marks` (still risky; rely on post-processing) |
| `no cluttered background` | `uncluttered, generous negative space, single subject, centered` |
| `no multiple icons` | `a single icon, one subject, solo, exactly one element` |
| `no gradient background` | `solid #FFFFFF background, flat color backdrop` (with explicit hex if the model supports it) |
| `no extra fingers` | `five fingers, anatomically correct hand, natural hand shape` |
| `no transparency checker` | `fully opaque background, solid white backdrop, no alpha grid visible` |

### Flux-specific patterns

Flux's T5 text encoder prefers longer, sentence-level natural-language prompts. Exclusion-as-positive-description works best in clause form, not comma lists:

```
A minimalist flat vector app icon of a single paper sheet with a folded
corner, deep indigo on a pure white square canvas, centered, with
clean unmarked surfaces, even lighting, and no visible texture or
photographic detail. The composition is a single subject with nothing
else in the frame.
```

Rather than:

```
...paper sheet... no text, no shadow, no background, no 3d
```

The second form reliably injects text and a background on Flux because the T5 encoder attends strongly to each noun regardless of the negator.

### DALL·E 3 / gpt-image-1 specific patterns

OpenAI's Images API rewrites the user's prompt server-side (DALL·E 3 especially, `gpt-image-1` somewhat less). This means even positive framing can be re-shaped into something that re-introduces artifacts. Two practitioner mitigations:

1. **Add `I NEED to verbatim...`-style steering** at the top of the prompt (DALL·E 3 respects it per the OpenAI cookbook), then describe the positive composition.
2. **Don't rely on negative phrasing at all** — assume any `no X` string will be rewritten into `with X`. Describe only what should be visible.

### Gemini 2.5 Flash Image

Same regime as Flux and DALL·E: no native negative field. Gemini tends to follow long prose prompts well and respects explicit "the image should contain only…" framing. Use exhaustive affirmative description of the subject and canvas; never use "not" or "without" in the final prompt.

## Attribute-Leakage Failure Cases (the "pink elephant" class)

Four reproducible failure cases to watch for in evaluation pipelines:

1. **"No text" on Flux adds text.** Documented by BFL and reproduced widely on the Flux subreddit. Rewrite to `clean surfaces, unmarked, blank`.
2. **"No people" on DALL·E 3 after server-rewrite.** DALL·E's rewriter often turns "empty street, no people" into "deserted street with a single pedestrian in the distance for scale". Use `deserted, solitary, unpopulated`.
3. **"Transparent background" on SDXL and Flux both produce the alpha checker *as pixels*.** Because the training data visualizes transparency with a checker, the model paints the checker into RGB. See category 13 for the proper fix (LayerDiffuse / BRIA RMBG post-processing). For the prompt side: negate `checker pattern, gray checker, alpha grid` on SDXL; positively frame as `isolated subject on solid white` everywhere else, then matte post-hoc.
4. **"No logo" on any model adds a logo.** Asset workflows that try to exclude competitor logos or trademarks usually fail; rely on post-generation content-safety filters instead.

## Concrete End-to-End Examples

### Example 1 — SDXL logo with full negative stack

```
Positive:
vector logo mark, single geometric leaf inside a rounded square,
teal #0F766E and emerald #10B981 flat fills, bold uniform stroke,
centered on pure white, crisp anti-aliased edges, minimalist,
symmetrical, 1024x1024

Negative:
EasyNegative, BadX,
(text:1.5), (letters:1.4), (watermark:1.4), (signature:1.3),
photorealistic, photograph, 3d render, octane, blender,
drop shadow, cast shadow, glow, bloom, gradient background,
mockup, business card, t-shirt, logo sheet, multiple logos,
(low quality:1.4), (worst quality:1.4), blurry, jpeg artifacts

Sampler: DPM++ 2M Karras, Steps: 28, CFG: 6.5, guidance_rescale: 0.7
```

### Example 2 — Flux flat icon via positive framing (no negative prompt)

```
Pipeline: FluxPipeline(black-forest-labs/FLUX.1-dev)
guidance_scale: 3.5
num_inference_steps: 28

Prompt:
A minimalist flat vector app icon representing a note-taking application.
A single stylized paper sheet with a folded top-right corner, filled with
a soft indigo-to-violet vertical gradient, centered on a pure white
square canvas at 1024x1024. The composition is a single isolated subject
with clean unmarked surfaces, even flat lighting, uniform bold strokes,
and generous negative space. The background is a solid flat white with
no texture, no grain, no shadow, and no secondary elements. The icon
contains only the paper shape and its folded corner — no typography, no
letters, no numbers, no decorative marks.
```

### Example 3 — Midjourney v7 with `--no` and multi-prompt weighting

```
photorealistic mascot logo for a coffee shop, single smiling espresso
cup character, warm cream palette, bold flat illustration, centered
--ar 1:1 --stylize 150 --v 7
--no text, letters, watermark, signature, photo, 3d render, drop shadow,
mockup, business card, phone mockup
```

Equivalent explicit multi-prompt form for fine control:

```
... centered ::1 text::-0.5 watermark::-0.5 photo::-0.5 3d render::-0.4
```

### Example 4 — Ideogram 3.0 API request

> **Updated 2026-04-21:** `model` field confirmed as `"V_3"` for standard and `"V_3_TURBO"` for the faster/cheaper Turbo variant; both accept `negative_prompt` identically.

```json
{
  "prompt": "bold sans-serif wordmark of the word ASHEN in deep charcoal on pure white, minimalist logo, geometric letterforms, centered, 1:1",
  "negative_prompt": "watermark, signature, drop shadow, 3d render, photograph, mockup, extra letters",
  "aspect_ratio": "1x1",
  "model": "V_3"
}
```

Per Ideogram's own prompting guide, keep the `negative_prompt` list short and concrete — "descriptions in the prompt take precedence." For the Turbo variant use `"model": "V_3_TURBO"` — negative prompt behavior is identical.

## Open Questions

1. **Can we auto-translate an SDXL-style negative list into Flux-style positive prose?** LLM list-to-antonym rewrites work for ~70% of cases but introduce new hallucinations on the rest. A fine-tuned translator is probably needed.
2. **How does MJ's `--no` compare empirically to SDXL negatives at equal semantic target?** No public benchmark; anecdotal reports suggest MJ's operator is weaker per-token.
3. **Does DALL·E 3's server-side rewriter respect negative intent at all?** Worth a dedicated eval.
4. **Are negative textual-inversion embeddings trainable for Flux's T5 encoder?** T5 embeddings differ architecturally from CLIP; no Flux-compatible `EasyNegative` exists yet, but it is technically feasible.
5. **Auto-append universal negatives on every request?** Safe default for SDXL, harmful on Flux/DALL·E/Gemini. Branching by backend is required.

## References

1. [Ho & Salimans, *Classifier-Free Diffusion Guidance*, arXiv:2207.12598 (2022)](https://arxiv.org/abs/2207.12598) — mechanical basis for negative prompts.
2. [AUTOMATIC1111 wiki, *Negative prompt*](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt) — canonical `ε_u`-replacement implementation.
3. [Midjourney Docs: *`--no` Parameter*](https://docs.midjourney.com/docs/no) — official MJ exclusion operator.
4. [Midjourney Docs: *Multi-Prompts & Weights*](https://docs.midjourney.com/docs/multi-prompts) — confirms `--no X` ≡ `X::-0.5`.
5. [Ideogram Docs: *Negative Prompt*](https://docs.ideogram.ai/using-ideogram/generation-settings/negative-prompt) — usage guide.
6. [Ideogram Docs: *Handling Negatives*](https://docs.ideogram.ai/using-ideogram/prompting-guide/4-handling-negatives) — Ideogram's own warning that the model "struggles with understanding negation".
7. [Ideogram API: *Generate v3*](https://developer.ideogram.ai/api-reference/api-reference/generate-v3) — confirms `negative_prompt` parameter.
8. [Black Forest Labs: *Working Without Negative Prompts*](https://bfl.mintlify.app/guides/prompting_guide_t2i_negative) — official Flux guidance; source of the positive-framing conversion table.
9. [HF FLUX.1-dev #17 — *What is guidance-distilled?*](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17) — guidance as learned embedding, not two-pass CFG.
10. [HF diffusers #9124 — Flux `negative_prompt` not supported](https://github.com/huggingface/diffusers/issues/9124) — `TypeError` on stock Flux pipelines.
11. [HF FLUX.1-dev #256 — *pipeline_flux_with_cfg*](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256) — community pipeline re-introducing real CFG at 2× cost.
12. [Civitai: *EasyNegative*](https://civitai.com/models/7808) — most popular SD 1.5 negative TI embedding.
13. [Civitai: *Bad X (SDXL)*](https://civitai.com/models/122403/bad-x-bad-sdxl-negative-embedding) — SDXL-era negative embedding.
14. [OpenAI Images API — Image Generation Guide](https://platform.openai.com/docs/guides/images) — DALL·E 3 / `gpt-image-1`; confirms no `negative_prompt` field.
15. [Vertex AI: *Generate Images with Imagen*](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images) — Imagen 2 legacy `negativePrompt`; dropped from `imagen-3.0-generate-002` and later. All Imagen 4 GA models (`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`) and Gemini 2.5 Flash Image do not expose it. [Vertex AI deprecation notice](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt) confirms the field is a "legacy feature".
16. [stable-diffusion-art.com, *How does negative prompt work?*](https://stable-diffusion-art.com/how-negative-prompt-work) — delayed-effect and cancellation failure modes.
17. [Meng et al., *On Distillation of Guided Diffusion Models*, arXiv:2210.03142 (2022)](https://arxiv.org/abs/2210.03142) — architectural reason distilled models lack negative prompts.
