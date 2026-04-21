---
category: 07-midjourney-ideogram-recraft
angle: 7c
title: "Recraft V3 (and V2): native vector SVG, brand style profiles, true alpha, text-in-image, API"
subagent: 7c
date: 2026-04-19
tags:
  - recraft
  - recraft-v3
  - vector-generation
  - svg
  - brand-style
  - style-consistency
  - transparent-png
  - text-rendering
  - api-reference
status: complete
primary_sources:
  - https://www.recraft.ai/blog/recraft-introduces-a-revolutionary-ai-model-that-thinks-in-design-language
  - https://www.recraft.ai/docs/api-reference/endpoints
  - https://www.recraft.ai/docs/api-reference/styles
  - https://www.recraft.ai/docs/api-reference/pricing
  - https://www.recraft.ai/docs/recraft-models/recraft-V3
  - https://replicate.com/recraft-ai/recraft-v3-svg
  - https://huggingface.co/spaces/ArtificialAnalysis/Text-to-Image-Leaderboard
  - https://news.ycombinator.com/item?id=41999491
  - https://simonwillison.net/2024/Nov/15/recraft-v3/
---

# Recraft V3 (and V2): native vector SVG, brand style profiles, true alpha, text-in-image, API

## Executive Summary

Recraft V3 (launched publicly on **October 30, 2024**, code‑named *red_panda*) is the first foundation image model designed from the ground up for **graphic designers**, not just image enthusiasts. Three properties make it uniquely relevant to a "prompt-to-asset for production assets" system:

1. **Native vector (SVG) output.** The `recraftv3_vector` model directly produces editable SVG with Bézier curves and logical layers — not a rasterized output passed through potrace/vtracer. This is fundamentally different from every other major T2I model (MJ, Ideogram, DALL·E, Imagen, Flux), all of which are raster-only and require a lossy trace step for SVG.
2. **Brand style profiles (`style_id`).** Upload 5 reference images → get a UUID → reuse it across every future generation. This gives API-driven pipelines a first-class "brand memory" object — no LoRA training, no IP-Adapter wiring, no finetuning budget. It is the closest thing to a *style primitive* in any commercial image API today.
3. **Strong text-in-image + positional `text_layout`.** V3 was the first model to accurately render **long** text (not just a word or two) and the only commercial model as of 2025 that lets you pin a specific word to a specific bounding box via the API.

Ranking: Recraft V3 debuted at **#1 on the Artificial Analysis Text-to-Image Arena leaderboard** with ELO 1172, beating Midjourney v6, Flux 1.1 Pro, and DALL·E 3 on pairwise human preference. ([Recraft blog](https://www.recraft.ai/blog/recraft-introduces-a-revolutionary-ai-model-that-thinks-in-design-language), [HF leaderboard](https://huggingface.co/spaces/ArtificialAnalysis/Text-to-Image-Leaderboard))

Pricing is aggressive: **$0.04 per V3 raster image, $0.08 per V3 vector image** via API (credits sold at $1 = 1,000 units). That is roughly 2–4× cheaper than Midjourney's implicit per-image cost.

Weaknesses: **true RGBA transparency** is the one production gap — V3 supports "transparent background" as a *prompt hint* on its V3 styles, but reliability has been reported inconsistent; the recommended production path is Recraft's own `removeBackground` endpoint as a second step. Also, the API still treats V3 as "legacy" (V4 is the 2026 default), but V3 remains the stable, documented sweet spot for SVG + custom styles.

---

## Product Capabilities

Recraft is a London‑based design‑first generative platform built by a team from ML (founder **Anna Veronika Dorogush**, creator of CatBoost). ([Replicate README](https://replicate.com/recraft-ai/recraft-v3-svg)) It ships four surfaces against the same model zoo: web Canvas app, iOS/Android apps, Figma plugin, and the HTTPS REST API.

### V3 vs V2 vs V4 model family

> **Updated 2026-04-21:** Recraft V4 launched in **February 2026** as a "ground-up rebuild" focused on design taste and prompt accuracy. V4 still does **not** support `style` or `style_id` parameters — the official docs state *"Styles are not yet supported for V4 models."* This architectural limitation persists as of April 2026. V3 remains the correct default for any brand-consistent pipeline requiring `style_id`.

As of April 2026 the public API exposes eight model IDs ([endpoints docs](https://www.recraft.ai/docs/api-reference/endpoints)):

| Model ID | Format | Notes |
|---|---|---|
| `recraftv2` | raster | Legacy, cheaper ($0.022/img) |
| `recraftv2_vector` | SVG | Legacy vector ($0.044/img) |
| `recraftv3` | raster | **October 2024 SOTA launch**, HF #1 |
| `recraftv3_vector` | SVG | **Native vector model** |
| `recraftv4` | raster | **February 2026** successor (default); **no `style`/`style_id` support** |
| `recraftv4_vector` | SVG | V4 vector |
| `recraftv4_pro` | raster | Premium tier, $0.25/img |
| `recraftv4_pro_vector` | SVG | Premium vector, $0.30/img |

Crucially for brand-style work: **styles are a V2/V3-only feature.** Recraft's styles docs state directly: *"Note: Styles are not yet supported for V4 models."* Any pipeline that needs `style_id` or named `style=Photorealism` today is pinned to `recraftv3` / `recraftv3_vector` / `recraftv2` / `recraftv2_vector`. This is the single most important architectural fact for building a brand-consistent asset generator on Recraft.

### Capabilities at a glance (V3)

- **Text-to-image** (raster) with curated styles + custom brand styles.
- **Text-to-vector** — `recraftv3_vector` — native SVG output up to the model's resolution grid.
- **Image-to-image** (V3 only) with `strength` parameter.
- **Inpainting** — precise mask-based regeneration.
- **Outpainting** / **generateBackground** — mask-driven background synthesis.
- **Replace background** — prompt-driven background swap.
- **Vectorize** — raster→SVG conversion (this *is* potrace-like, distinct from the native vector model).
- **removeBackground** — alpha-PNG matting.
- **crispUpscale** / **creativeUpscale** — 4× style-preserving and detail-preserving upscalers.
- **eraseRegion** — clean removal of masked pixels.
- **variateImage / Remix** — aspect-ratio variations without a prompt.
- **Explore** — mass-generation for discovery (V4 only).
- **createStyle** — upload 5 reference images → custom UUID.
- **Text layout** — V3-only spatial word pinning.
- **artistic_level** — 0–5 knob for "static/clean" → "dynamic/eccentric."
- **background_color + colors** — RGB palette constraints on generation.
- **negative_prompt** — on V2/V3 only.

### True SVG, not traced raster

The HN thread for the V3 launch captures the key distinction ([HN 41999491](https://news.ycombinator.com/item?id=41999491)): *"Most production SVG models use diffusion models converted to SVG afterward, which doesn't create semantically organized layers like hand-crafted or directly-generated SVGs would."* Recraft V3 Vector is the exception — the model itself emits path data. Concretely, community inspection of the outputs reports:

- **Minimal anchor points** — far fewer than vtracer/potrace on the same subject.
- **Named fills on logical groups** (e.g. separate `<g>` for background, figure, face).
- **Clean Bézier curves**, no embedded base64 raster fallback.
- **Standard SVG 1.1** — loads cleanly in Illustrator, Figma, Inkscape, Affinity.

Hand-drawn expert vectors are still tighter, but for app icons, marketing illustrations, pictograms, and logos the V3 Vector output is generally production-ready without further cleanup — a claim that **is not currently true** for a raster→potrace pipeline, which always shows stair-stepping at low anchor counts or explodes the path budget at high counts.

### Text rendering

V3 is marketed as *"the only model in the world that can generate images with long texts"* ([Recraft blog](https://www.recraft.ai/blog/recraft-introduces-a-revolutionary-ai-model-that-thinks-in-design-language)). Community benchmarking on Image Arena confirmed it beat Ideogram 2.0 on average text fidelity at the time of launch. The `text_layout` API parameter (V3 only) goes further: you can specify **exactly where each word sits** by giving 4 bounding-box corners in relative coordinates. This is a qualitatively different capability from "prompt for text and hope" — it's the only commercial T2I API that gives deterministic text placement.

### Transparent PNG / alpha

This is V3's one rough edge. Three paths exist:

1. **Prompt hint**: append "transparent background" to the prompt when using a V3 style. Works intermittently; community reports on [recraft.canny.io](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background) describe it as "sometimes stopped working" — not production-reliable.
2. **`removeBackground` endpoint** after generation. This is the recommended production path; output is PNG with proper alpha channel. Downside: can eat fine antialiased edges (hair, particles) and caps at the upstream resolution.
3. **`recraftv3_vector` + transparent SVG canvas** — trivially supports transparency by definition, since SVG is element-based. For logos/icons/illustrations this is the cleanest route.

For a prompt-to-asset that targets "transparent logo," the right default is: **pick `recraftv3_vector`** and route SVG → optional PNG export, rather than trying to coax RGBA out of the raster path.

---

## API Reference

Base URL: `https://external.api.recraft.ai/v1` — compatible with the **OpenAI Python SDK** (pass as `base_url`). Auth is Bearer token from [app.recraft.ai/profile/api](https://app.recraft.ai/profile/api).

### `POST /images/generations` — generateImage

Minimal example (OpenAI SDK style, from official docs):

```python
from openai import OpenAI
client = OpenAI(
    base_url='https://external.api.recraft.ai/v1',
    api_key=RECRAFT_API_TOKEN,
)
resp = client.images.generate(
    prompt='minimalist fox logo for a note-taking app',
    model='recraftv3_vector',
    style='Vector art',
    size='1024x1024',
    response_format='url',
    extra_body={
        'controls': {
            'colors': [{'rgb': [14, 165, 233]}, {'rgb': [15, 23, 42]}],
            'background_color': {'rgb': [255, 255, 255]},
        },
        'negative_prompt': 'gradient, photorealism, 3D, shadows',
    },
)
print(resp.data[0].url)  # SVG URL
```

**Parameters** ([source](https://www.recraft.ai/docs/api-reference/endpoints)):

| Parameter | Type | Notes |
|---|---|---|
| `prompt` (required) | string | Length limits depend on model |
| `n` | int 1–6 | Default 1 |
| `model` | string | `recraftv3`, `recraftv3_vector`, `recraftv2`, `recraftv2_vector`, `recraftv4`* |
| `style` | string | Curated style name — V2/V3 only |
| `style_id` | UUID | Custom brand style — **mutually exclusive with `style`** |
| `substyle` | string | Refines within a `style` (e.g. `hard_flash`, `hdr`, `evening_light`) |
| `size` | string | `WxH` or `w:h`, e.g. `1024x1024`, `1:1`, `1820x1024` |
| `negative_prompt` | string | V2/V3 only |
| `response_format` | `url` \| `b64_json` | Default `url` |
| `text_layout` | array of `{text, bbox[4]}` | V3 only, positional text |
| `controls.colors` | `[{rgb:[r,g,b]}]` | Desired palette |
| `controls.background_color` | `{rgb:[r,g,b]}` | Desired background |
| `controls.artistic_level` | int 0–5 | V3 only |
| `controls.no_text` | bool | V3 only — prevents embedded text |

Response: `{data: [{url: '...'}]}`. For vector models the URL points to an `.svg`. Note there is no explicit `image_type` parameter — the **format is determined by the model ID**; `recraftv3` returns raster, `recraftv3_vector` returns SVG.

### `POST /styles` — createStyle

This is the brand-style workflow primitive.

```python
resp = client.post(
    path='/styles',
    cast_to=object,
    options={'headers': {'Content-Type': 'multipart/form-data'}},
    body={'style': 'vector_illustration'},  # base category
    files={
        'file1': open('brand_ref_1.png', 'rb'),
        'file2': open('brand_ref_2.png', 'rb'),
        'file3': open('brand_ref_3.png', 'rb'),
        'file4': open('brand_ref_4.png', 'rb'),
        'file5': open('brand_ref_5.png', 'rb'),
    },
)
style_id = resp['id']  # UUID, reusable forever
```

Required fields:
- `style`: base category — `any` | `realistic_image` | `digital_illustration` | `vector_illustration` | `icon`
- `files`: **up to 5 images**, total ≤ 5 MB, PNG/JPG/WEBP

Returns `{"id": "<uuid>"}`. Style IDs created via the API are compatible with Recraft V3 and Recraft V3 Vector models only.

### `POST /images/imageToImage`

V3-only. Parameters: `image` (file), `prompt`, `strength` (0 = identical, 1 = totally different), plus the standard style/text_layout/controls.

### `POST /images/inpaint`

Mask-driven regeneration. The mask is a **binary** PNG (pure 0 or 255 only — not grayscale). White = regenerate, black = preserve. V3 only.

### `POST /images/vectorize`

Raster → SVG conversion. Critically, this is a **post-processing tracer** — distinct from the native `recraftv3_vector` model. Accepts `svg_compression`, `limit_num_shapes`, `max_num_shapes`. For pristine vector output always prefer the native model; use `vectorize` only when you have an existing raster asset.

### `POST /images/removeBackground`

Matting to PNG with alpha. This is the path to "true transparent PNG" for raster V3 outputs.

### `POST /images/replaceBackground`, `/images/generateBackground`

Background-only operations — useful for OG-card / hero pipelines where a product shot stays locked and the background varies.

### Upscalers: `crispUpscale`, `creativeUpscale`

`crispUpscale` preserves exact style; `creativeUpscale` adds face/detail refinement. Both cap at 4096px max dimension.

### `GET /users/me`

Returns credit balance — essential for build pipelines to avoid silent quota failures.

---

## Brand-Style Workflow

This is the killer capability for a "turn a vague brand prompt into consistent assets" system. The workflow:

1. **Collect 3–5 brand reference images.** Can be real brand art, existing Recraft generations you liked, or even moodboard fragments. Per docs, max 5 files, 5 MB total.
2. **Pick a base category.** For a SaaS with flat illustrations: `vector_illustration`. For a photographic brand: `realistic_image`. For an icon system: `icon`.
3. **Call `POST /styles`** → receive `style_id` UUID.
4. **Store that UUID in your brand record.** It's now a forever-reusable brand primitive.
5. **Generate every asset** for that brand by passing `style_id=<uuid>` to `generateImage`, `imageToImage`, `inpaint`, `replaceBackground`, or `generateBackground`. Do **not** combine `style` and `style_id` (mutually exclusive).
6. **Optionally extend** with `substyle`, `colors`, `background_color`, and `artistic_level` for per-asset tuning while keeping the base brand identity.

Key properties that make this better than the LoRA/IP-Adapter approach used elsewhere:

- **Zero training time.** The style is injected at inference via conditioning, not via weight updates. Docs state: *"Recraft V3 accepts style as an input to the model, and doesn't require retraining."*
- **Stable UUIDs.** Unlike LoRAs, which need hosting, versioning, and model compatibility gymnastics, Recraft style UUIDs are server-side and immutable.
- **Web↔API parity.** Styles created in the web app's Styles panel can be copied to the API (three-dot menu → copy style ID), provided you own them, they're public, or they were shared with your account. This means designers can iterate visually in Canvas, hand the UUID to engineering, and the pipeline generates matching assets programmatically.
- **No prompt boilerplate.** You don't have to re-describe the brand every time — the style captures tokens, palette, line weight, shading, composition.

Concrete pattern for a note-taking-app brand pack:

```python
STYLE_ID = "229b2a75-05e4-4580-85f9-b47ee521a00d"  # created once

def brand_asset(prompt, size, model='recraftv3_vector'):
    return client.images.generate(
        prompt=prompt,
        model=model,
        size=size,
        extra_body={'style_id': STYLE_ID, 'controls': {'no_text': True}},
    ).data[0].url

logo    = brand_asset('minimal fox mascot, circular frame', '1024x1024')
empty   = brand_asset('empty state illustration of notebook', '1820x1024',
                      model='recraftv3_vector')
og_card = brand_asset('hero banner with fox and notebook', '1820x1024',
                      model='recraftv3')  # raster OK for OG
```

---

## Vector Quality Analysis

**Claims vs reality.** Recraft markets V3 Vector as producing SVGs comparable to hand-drawn vectors. Community and independent review converge on:

- For **icons, pictograms, flat illustrations, and logo marks**: production-ready, often better than vtracer on the same raster.
- For **detailed editorial illustration**: good enough for web/marketing, but expert designers will still clean up (simplify curves, unify palette, re-layer).
- For **complex photo-realistic vector portraits**: the shape count balloons; Recraft provides the `Vector Photo` sub-style for this but it's the weakest vector category.

**Anchor economy.** One of the few quantitative references comes from Recraft's own positioning and HN discussion ([HN 43787181](https://news.ycombinator.com/item?id=43787181)): V3 Vector SVGs are reported around *~20–30% more anchor points than a hand-drawn vector for equivalent fidelity*. That's the opposite direction from potrace, which typically produces **2–10×** the anchors of a hand-drawn equivalent.

**Layer structure.** V3 Vector emits `<g>` groups that a human would recognize as subject, background, accents — not the flat soup of a tracer. This is what makes the output *editable*: a designer opens it in Figma, selects the face, and recolors or repositions it.

**Comparison to competitors** (2024–2025 snapshot):

| Model | Native SVG? | Style consistency | Text rendering | Approx per-image cost (API) |
|---|---|---|---|---|
| Recraft V3 Vector | Yes (native) | `style_id` UUIDs | Excellent | $0.08 |
| Midjourney v6/v7 | No | `--sref`/`--cref` (raster) | Weak–OK | ~$0.04 (implicit) |
| Ideogram 2.0/3.0 | No | Magic Prompt / char refs | Best-in-class for text | $0.02–0.08 |
| DALL·E 3 / gpt-image-1 | No | None first-class | Weak–OK | $0.04–0.17 |
| Flux 1.1 Pro | No | Requires LoRA/IP-Adapter | OK | $0.04 |
| SVG-Diffusion (OSS) | Experimental | — | — | Self-host |

Only Recraft V3 Vector is both **native** and **commercially hosted** — everything else forces you back to a trace step.

---

## Pricing

From [docs.recraft.ai/api-reference/pricing](https://www.recraft.ai/docs/api-reference/pricing):

- **API units**: $1.00 per 1,000 units (minimum purchase terms apply).
- **Recraft V3 raster**: 40 units = **$0.04/image**
- **Recraft V3 Vector**: 80 units = **$0.08/image**
- **Recraft V2 raster**: 22 units = $0.022/image
- **Recraft V2 Vector**: 44 units = $0.044/image
- **Recraft V4 raster**: 40 units = $0.04/image
- **Recraft V4 Vector**: 80 units = $0.08/image
- **Recraft V4 Pro raster**: 250 units = $0.25/image
- **Recraft V4 Pro Vector**: 300 units = $0.30/image
- Upscalers, vectorize, removeBackground, createStyle — separate unit costs; see pricing page for current rates.

**Replicate mirror.** `recraft-ai/recraft-v3-svg` on Replicate provides pay-per-run access at comparable pricing with commercial-use rights confirmed in the model README. This is useful if a team wants per-call metering without maintaining Recraft credits, or wants the same call inside a Cog-based stack.

**Studio credits.** The web app uses a separate credit pool (1 credit per raster image, 2 per vector). Do **not** confuse Studio credits with API units — they are not interchangeable.

---

## Limitations

1. **V4 has no styles.** Recraft V4 (released February 2026) still does not support `style` or `style_id` parameters. Confirmed by the official docs as of April 2026: *"Styles are not yet supported for V4 models."* If you build a brand-style pipeline you are currently pinned to V3/V2. Your pipeline should default to `recraftv3` / `recraftv3_vector` and only opt into V4 for tasks that don't need `style_id`.
2. **Transparent raster PNG is unreliable.** Use `removeBackground` as a second step, or route through `recraftv3_vector` for anything that needs true alpha.
3. **`text_layout` character set is restricted.** Only ASCII letters/digits/punctuation plus a narrow Latin/Greek/Cyrillic subset — no emoji, no CJK, no Arabic, no Devanagari. Validation is hard-fail.
4. **Image input limits**: 5 MB max, ≤ 16 MP, ≤ 4096 px max dim, ≥ 256 px min dim. Inpaint masks must be **binary** (exact 0 or 255) — grayscale will error.
5. **Rate limits & timeouts.** Not published; plan for retries. Vector generations are visibly slower than raster in practice.
6. **No true seed parameter on core `generateImage`.** Only `variateImage` exposes `random_seed`. This hurts reproducibility for test suites — mitigate by generating `n=6` and deduping.
7. **Content policy.** No explicit moderation filter docs, but in practice the policy is similar to DALL·E/Midjourney: no real public figures, no trademarked marks without permission.
8. **`style` and `style_id` are mutually exclusive.** You cannot blend a curated style with a custom brand style in the same call — compose via `substyle` instead, or iterate via `imageToImage`.
9. **Styles created via API are V3-only compatible.** Web-created styles are pinned to the model selected at creation time.

---

## References

Primary:

- Recraft V3 launch blog (Oct 30, 2024): <https://www.recraft.ai/blog/recraft-introduces-a-revolutionary-ai-model-that-thinks-in-design-language>
- Recraft API Endpoints reference: <https://www.recraft.ai/docs/api-reference/endpoints>
- Recraft API Styles reference: <https://www.recraft.ai/docs/api-reference/styles>
- Recraft API Pricing: <https://www.recraft.ai/docs/api-reference/pricing>
- Recraft V3 model page: <https://www.recraft.ai/docs/recraft-models/recraft-V3>
- Recraft LLMs.txt (full docs crawl): <https://recraft.ai/llms-full.txt>
- Replicate mirror — `recraft-ai/recraft-v3-svg`: <https://replicate.com/recraft-ai/recraft-v3-svg>
- Replicate README: <https://replicate.com/recraft-ai/recraft-v3-svg/readme>

Benchmarks:

- Artificial Analysis Text-to-Image Leaderboard: <https://huggingface.co/spaces/ArtificialAnalysis/Text-to-Image-Leaderboard>

Community / reception:

- Hacker News — "Recraft v3 (code-named red_panda)": <https://news.ycombinator.com/item?id=41999491>
- Hacker News — Recraft SVG discussion: <https://news.ycombinator.com/item?id=43787181>
- Hacker News — Recraft style feature discussion: <https://news.ycombinator.com/item?id=43787937>
- Simon Willison's notes: <https://simonwillison.net/2024/Nov/15/recraft-v3/>
- Feature request: transparent PNG reliability: <https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background>

Third-party coverage:

- Flowith — Recraft v3 FAQ (vector export, style lock, commercial license): <https://flowith.io/blog/recraft-v3-faq-vector-export-style-lock-commercial-license-api>
- Flowith — Vector generation engine analysis: <https://flowith.io/blog/recraft-v3-scalable-vector-generation-industry-standard-brand-identity-ui-2026>
