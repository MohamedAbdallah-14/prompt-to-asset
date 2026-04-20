---
category: 04-gemini-imagen-prompting
angle: 4b
title: "Gemini 2.5 Flash Image (\"Nano Banana\") — prompting, editing, and API surface"
subject: gemini-2.5-flash-image
aka:
  - nano-banana
  - gemini-2.5-flash-image-preview
model_id: gemini-2.5-flash-image
launched: 2025-08-26 (preview) / 2025-10-02 (GA)
discontinuation: 2026-10-02
knowledge_cutoff: June 2024
compare_with:
  - imagen-3
  - imagen-4
  - imagen-4.0-ultra-generate-001
sources_count: 10
last_reviewed: 2026-04-19
---

# Gemini 2.5 Flash Image ("Nano Banana") — prompting, editing, and API surface

> TL;DR — Gemini 2.5 Flash Image is a **natively multimodal image-in / image-out model** (not a diffusion head bolted onto a text LLM). It is optimized for (1) conversational multi-turn edits, (2) multi-image fusion with up to 3 reference images, and (3) character/style consistency across turns. It speaks the *language* of Gemini — narrative descriptions, world knowledge, negative instructions expressed positively — and every output is SynthID-watermarked. Use it for editing, composition, and text-in-image work; prefer **Imagen 4 / 4 Ultra** when you need single-shot high-fidelity text-to-image at the lowest $/image with tight aspect-ratio / resolution control. Model IDs: `gemini-2.5-flash-image` (GA, Oct 2 2025) vs `imagen-4.0-ultra-generate-001`. ([Google Developers Blog — launch][intro], [Google Developers Blog — GA][ga], [Vertex AI docs][vertex-docs], [Imagen 4 launch][imagen4])

---

## 1. What the model is (and isn't)

Gemini 2.5 Flash Image is Google's **native multimodal** generation/editing model inside the `gemini-2.5-flash` family. Unlike a text model that calls out to a separate image model, it was "trained from the ground up to process text and images in a single, unified step," which is why it can reason jointly about image content and language. ([Google Developers Blog — prompting guide][promptguide])

Core capabilities, per the official launch post ([intro]):

- **Text → image.** Photorealism, stylized illustrations, stickers, posters, product shots.
- **(Image + text) → image.** Targeted edits: add, remove, modify, restyle, recolor.
- **Multi-image → image.** Composition and style transfer from up to 3 input images.
- **Iterative refinement.** Stateful multi-turn editing where the same character/object persists.
- **Text rendering inside images.** Logos, diagrams, labels, posters.
- **World-knowledge-grounded generation.** Can read hand-drawn diagrams and answer with images.

Evidence of real-world quality: during pre-release on LMArena under the "nano-banana" codename, it took **#1 on both the Image Edit and Text-to-Image leaderboards** with the **largest Elo lead in Arena history (+171)** on 2.5M+ votes. ([LMArena blog][lmarena])

It is **not** a drop-in replacement for Imagen in all scenarios:

| Concern | Gemini 2.5 Flash Image | Imagen 4 / 4 Ultra |
|---|---|---|
| Strongest at | Editing, composition, text-in-image, multi-turn | Single-shot high-fidelity generation, product photography |
| Images per call | 1 generated at a time per loop (up to 10 output images per prompt on Vertex) | Up to 4 in a single batch |
| Aspect ratios | 10 ratios: 21:9, 16:9, 4:3, 3:2, 1:1, 9:16, 3:4, 2:3, 5:4, 4:5 | 1:1, 3:4, 4:3, 9:16, 16:9 |
| Resolution control | Prompt-level; aspect ratio via `ImageConfig(aspect_ratio=...)` | Explicit fixed sizes up to 2048×2048 (and 2816 on longest edge) |
| Pricing | $30 / 1M output tokens; 1290 tokens per image → **$0.039 / image** | Imagen 4 Ultra: **$0.06 / image** (Gemini API); Imagen 4 std ≈ $0.02–0.04 |
| Watermarking | SynthID (invisible, during generation) | SynthID (invisible, during generation) |
| Lifecycle | GA Oct 2, 2025; discontinuation Oct 2, 2026 | Imagen 4 family discontinuation June 30, 2026 |

Sources: [Vertex AI docs][vertex-docs], [GA post][ga], [Imagen 4 launch][imagen4], [Imagen 4 Ultra docs][imagen4ultra].

> **Practical selection rule.** If your pipeline is "one prompt → one photo" for e-commerce or marketing hero shots, start with Imagen 4 / 4 Ultra. If your pipeline has *any* of (a) iterative edits, (b) multiple reference images fused into one, (c) in-image text that must match an exact string, (d) character consistency across scenes — choose Gemini 2.5 Flash Image.

---

## 2. API surface — Gemini API and Vertex AI

### 2.1 Model identifier and limits

From the Vertex AI reference page ([vertex-docs]):

- Model: `gemini-2.5-flash-image` (GA). Preview alias was `gemini-2.5-flash-image-preview`.
- **Input**: text + images (PNG, JPEG, WebP, HEIC, HEIF) and PDF/text documents. **Max 3 images per prompt.** Inline-upload cap 7 MB, GCS cap 30 MB. PDFs: max 3 pages, 50 MB.
- **Output**: text + image. **Up to 10 output images per prompt.** Each generated image consumes **1,290 tokens**.
- **Parameters**: temperature 0.0–2.0 (default 1.0), topP 0.0–1.0 (default 0.95), topK fixed at 64, candidateCount = 1.
- **Token limits**: 65,536 input / 32,768 output tokens.
- **Regions**: global + US (`us-central1`, `us-east1/4/5`, `us-south1`, `us-west1/4`), EU (`europe-central2`, `europe-north1`, `europe-southwest1`, `europe-west1/4/8`). CMEK, VPC-SC, Data Residency supported.

### 2.2 Minimal Gemini API call (Python SDK)

Canonical "edit an image" call from the GA launch post ([ga]):

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = (
    "Create a photograph of the subject in this image as if they were living "
    "in the 1980s. The photograph should capture the distinct fashion, "
    "hairstyles, and overall atmosphere of that time period."
)
image = Image.open("/path/to/image.png")

response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=[prompt, image],
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],          # image-only output
        image_config=types.ImageConfig(
            aspect_ratio="16:9",                # new in GA
        ),
    ),
)

for part in response.parts:
    if part.inline_data is not None:
        part.as_image().show()
```

Key GA-only knobs: `response_modalities=["IMAGE"]` for image-only returns (no narration text) and `ImageConfig(aspect_ratio=...)` for one of the 10 supported ratios. ([ga])

### 2.3 Multi-turn editing in one session

Because the model is conversational, you reuse the same `chat` / `generate_content` thread and append edits as new user turns, sending only the instruction (the model retains the prior image state in context):

```python
chat = client.chats.create(model="gemini-2.5-flash-image")

r1 = chat.send_message(["Generate a photorealistic portrait of a woman in her 30s, "
                        "curly auburn hair, teal wool sweater, soft window light, 85mm.",
                        ])

r2 = chat.send_message("Keep the same person and lighting exactly. "
                       "Change only the sweater to a vintage cream fisherman knit.")

r3 = chat.send_message("Now place her in a rainy Kyoto alley at dusk. "
                       "Preserve her face, hair, and the cream sweater. "
                       "Do not change the aspect ratio.")
```

This is the pattern Volley uses to drive its Wit's End AI dungeon crawler — live multi-turn refinement at <10s latency ([ga]).

### 2.4 Ecosystem

Beyond Google's first-party surfaces (Gemini API, Google AI Studio, Vertex AI, Firebase AI Logic), the model is routed through **OpenRouter** (its first image-capable model across 480+) and **fal.ai**, and is embedded in **Adobe Firefly / Express**, **Figma**, **Freepik**, **Leonardo.ai**, and **Poe** ([vertex-blog], [intro]).

---

## 3. Prompt idioms that work

The single highest-leverage rule from Google's official prompting guide ([promptguide]):

> **Describe the scene, don't just list keywords.** A narrative, descriptive paragraph will almost always produce a better, more coherent image than a disconnected keyword list.

This is the opposite of SDXL-era "masterpiece, 8k, trending on artstation" tag-soup prompting. Treat Gemini 2.5 Flash Image like you are briefing a photographer or an art director in plain English.

### 3.1 Photorealism template

```
A photorealistic [shot type] of [subject], [action or expression],
set in [environment]. The scene is illuminated by [lighting description],
creating a [mood] atmosphere. Captured with a [camera/lens details],
emphasizing [key textures and details]. [Aspect ratio].
```

**Concrete prompt.** ([promptguide])

> "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful. Vertical portrait orientation."

Why it works: every vague term is anchored to a photographic control (shot type, lens, lighting, mood, orientation), which the text encoder can bind to concrete visual priors.

### 3.2 Text-in-image / logo

```
Create a [image type] for [brand/concept] with the text "[exact text]" in a
[font style]. The design should be [style description], with a [color scheme].
```

**Concrete prompt.** ([promptguide])

> "Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'. The text should be in a clean, bold, sans-serif font. The design should feature a simple, stylized icon of a coffee bean seamlessly integrated with the text. The color scheme is black and white."

Gemini 2.5 Flash is one of the few image models that reliably renders multi-word English text without glyph corruption; Imagen 4 is strong on single-shot text too, but lacks conversational re-typing ("fix the 'y' in 'Daily'") unless you regenerate from scratch.

### 3.3 Inpainting via natural language (no mask needed)

```
Using the provided image, change only the [specific element] to
[new element/description]. Keep everything else in the image exactly the same,
preserving the original style, lighting, and composition.
```

**Concrete prompt.** ([promptguide])

> "Using the provided image of a living room, change only the blue sofa to be a vintage, brown leather chesterfield sofa. Keep the rest of the room, including the pillows on the sofa and the lighting, unchanged."

The explicit "keep everything else … exactly the same" clause is load-bearing. Without it, the model treats the prompt as a full re-generation and will drift pillow positions, floor textures, etc.

### 3.4 Multi-turn edit sequence (stateful)

A character-consistency flow that exploits the model's conversational memory:

- **Turn 1.** "Create a kawaii-style sticker of a happy red panda wearing a tiny bamboo hat, munching a green bamboo leaf. Bold clean outlines, cel-shading, white background."
- **Turn 2.** "Keep the exact same red panda. Now show him asleep curled around the bamboo leaf, same art style, white background."
- **Turn 3.** "Same red panda, same art style. Place him in a miso-ramen bowl as if it's a hot spring. Keep the white background."
- **Turn 4.** "Same panda, same style. Vector sticker sheet layout: four poses in a 2×2 grid. Do not change the input aspect ratio."

This is the pattern behind the Google AI Studio *past_forward* demo app for character consistency ([intro]) and the Cartwheel *Pose Mode* product ([ga]).

### 3.5 Multi-image fusion

```
Create a new image by combining the elements from the provided images. Take the
[element from image 1] and place it with/on the [element from image 2]. The
final image should be a [description of the final scene].
```

**Concrete prompt.** ([promptguide])

> "Create a professional e-commerce fashion photo. Take the blue floral dress from the first image and let the woman from the second image wear it. Generate a realistic, full-body shot of the woman wearing the dress, with the lighting and shadows adjusted to match an outdoor environment."

This is the Freepik / WPP / Figma integration use case — "place product X in scene Y while keeping identity" — and where Gemini beats Imagen decisively because Imagen does not accept image inputs for editing at all.

### 3.6 Other idioms worth knowing ([promptguide])

- **Semantic negative prompts.** Do not say "no cars." Say "an empty, deserted street with no signs of traffic." The model does not have a dedicated negative-prompt field; describe absences positively.
- **Cinematic camera vocabulary.** `wide-angle shot`, `macro shot`, `low-angle perspective`, `85mm portrait lens`, `Dutch angle`, `three-point softbox setup`. These are bound tightly in training data.
- **Hyper-specificity beats adjectives.** "Ornate elven plate armor, etched with silver leaf patterns, high collar, pauldrons shaped like falcon wings" >> "fantasy armor."
- **Aspect-ratio preservation.** When editing, the model tries to preserve the input's aspect ratio. If it doesn't, append: `"Do not change the input aspect ratio."` If you send multiple images with different ratios, **the model adopts the ratio of the last image provided** — order matters. To force a specific ratio, pass a reference image with the correct dimensions or use `ImageConfig(aspect_ratio=...)`.
- **Recover from drift.** If character features start to drift after many iterations, *restart a fresh chat* with a detailed text description of the canonical character. Long chat histories compound drift faster than they compound consistency.

---

## 4. Failure modes and quirks

### 4.1 "Edit didn't happen" / identical-output loop

The most reported field failure: the model returns a near-identical image with the requested edit missing, and subsequent retries repeat the same unchanged output ([skywork-diag]).

- **Cause hypotheses.** (a) Instruction was too terse and got absorbed as commentary; (b) prompt violated a soft policy gate and the model returned the input untouched rather than error; (c) multi-image ordering confused the target; (d) region-throttling under heavy load.
- **Triage.** Isolate by running a minimal known-good prompt ("Brighten the photo slightly.") against the same input. If that works, the issue is prompt-specific. If it also fails, try a new session (to reset possibly-stuck state) and/or a different region.
- **Mitigation.** Lead with `"Using the provided image, ..."` so the image is explicitly referenced as input, not as a stylistic hint. Be concrete about what to preserve *and* what to change.

### 4.2 Character-feature drift across long edit chains

Google's own launch post flags this ([intro], [promptguide]): after many iterative edits, subjects' face geometry, freckles, hair part, or clothing trim can drift. The model is optimized for *short* multi-turn loops (3–6 turns), not 30-turn fine-grained sculpting.

- **Mitigation.** Restart the chat with a textual anchor ("A 30-year-old woman, curly auburn hair parted on the left, green eyes, freckles across the nose bridge, wearing a cream fisherman sweater.") and treat that description as the canonical ID card. Re-pin the ID card every few turns in long sessions.

### 4.3 In-image typography — the last-mile problem

Gemini 2.5 Flash Image renders short text reliably, but Google explicitly calls out **long-form text rendering** and **fine factual detail** (e.g., watch-face dials, architectural motifs) as active development areas ([intro]). Expect occasional kerning glitches, phantom letters, or letter-count mismatches on paragraphs longer than ~12 words.

- **Mitigation.** Keep in-image text ≤ a headline's worth; render long text as a post-step overlay in a design tool; or generate twice and pick the better sample.

### 4.4 Silent safety refusals

Community postmortems report unexplained refusals on non-obvious prompts, including meta-prompts that *discuss* prompt structure or escaped Markdown resembling injection patterns ([gys-drift]). The model may return a generic "can't help with this" without pointing at which classifier triggered.

- **Mitigation.** Rephrase without meta-language; remove stray code-fencing and backslashes; if on Vertex, inspect the safety-ratings block in the response to identify which category fired.

### 4.5 Regional availability errors

Users see `"Sorry, I can't edit images in your region"` intermittently, especially outside supported regions or during rollout windows ([skywork-diag]).

- **Mitigation.** Use the `global` endpoint on Vertex for broader coverage; verify user region compliance against the doc's availability matrix ([vertex-docs]).

### 4.6 Aspect-ratio surprises with multi-image inputs

Sending three reference images with inconsistent ratios causes the model to adopt the *last* image's ratio, not the first, and not the one matching the majority. Developers used to image generators that preserve input-0 geometry get burned ([promptguide]).

- **Mitigation.** Always send the "canvas reference" last, or set `ImageConfig(aspect_ratio=...)` explicitly.

---

## 5. SynthID watermarking

Every image emitted by Gemini 2.5 Flash Image — and by Imagen 3/4 — carries an invisible **SynthID** watermark. Key properties from Google DeepMind ([synthid]) and Google Cloud's Vertex blog ([vertex-blog]):

- **Embedded during generation**, not as a post-process overlay. In the Nano Banana family Google describes a "tournament sampling" scheme that biases token sampling at every step to carry the signature.
- **Invisible to humans**, does not measurably degrade quality.
- **Robust to common transforms**: JPEG re-compression, resize, crop, color adjustments, format conversion, and screenshot capture.
- **Detector-required to read.** Provenance detection uses Google's SynthID detector; the watermark is not a visible label or a metadata tag (it survives metadata stripping).
- **Not a cryptographic signature.** SynthID is statistical; adversarial pipelines with heavy re-generation or paint-over can degrade it. Treat it as "strong provenance signal," not "legal proof."

Implication for builders: **you cannot opt out**. If your product assumes clean user uploads are never AI-generated, add SynthID verification server-side. Conversely, if your product republishes generated images, don't strip EXIF thinking that removes AI provenance — it doesn't.

---

## 6. Where Gemini 2.5 Flash Image and Imagen diverge

| Dimension | Gemini 2.5 Flash Image | Imagen 4 / 4 Ultra |
|---|---|---|
| Architecture role | Conversational, multimodal generation *and* editing | Pure text-to-image generator |
| Accepts image input | Yes (up to 3) | No editing API (generation only in public surface) |
| Multi-turn memory | Yes — stateful in a chat session | No — each call is independent |
| Text rendering | Strong on short-to-medium strings, conversationally fixable | Strong on first-shot accuracy, not conversationally fixable |
| Best cost-per-image | $0.039 | $0.02–0.06 depending on tier |
| Throughput per call | 1 image (batchable to 10 in prompt) | Up to 4 images per call |
| Aspect-ratio count | 10 (adds 21:9, 3:2, 2:3, 5:4, 4:5) | 5 (1:1, 3:4, 4:3, 9:16, 16:9) |
| Resolutions | Not explicitly selectable; driven by aspect ratio | Explicit resolutions incl. 2048×2048, 2816 longest edge |
| SynthID | Yes | Yes |
| Cookbook notebook | `quickstarts/Image_out.ipynb` (Nano Banana variant) | `quickstarts/Get_started_imagen.ipynb` |

Primary sources: [ga], [imagen4], [imagen4ultra], [cookbook].

**Rule of thumb.** Reach for **Imagen 4 Ultra** when (i) you need pixel-tight control over output resolution, (ii) you want to fan out 4 candidates per call, and (iii) your pipeline is single-shot generation with no editing. Reach for **Gemini 2.5 Flash Image** for everything else — and especially any workflow where the next prompt depends on the previous image.

---

## 7. Sources

[intro]: https://developers.googleblog.com/en/introducing-gemini-25-flash-image/ "Introducing Gemini 2.5 Flash Image — Google Developers Blog, Aug 26 2025"
[ga]: https://developers.googleblog.com/en/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios "Gemini 2.5 Flash Image now ready for production — Google Developers Blog, Oct 2 2025"
[promptguide]: https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/ "How to prompt Gemini 2.5 Flash Image — Google Developers Blog, Aug 28 2025"
[vertex-blog]: https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-image-on-vertex-ai "Gemini 2.5 Flash Image on Vertex AI — Google Cloud Blog, Aug 26 2025"
[vertex-docs]: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image "Gemini 2.5 Flash Image — Vertex AI reference page"
[lmarena]: https://lmarena.ai/blog/nano-banana/ "Nano-Banana (Gemini 2.5 Flash Image) on LMArena — 2025"
[cookbook]: https://github.com/google-gemini/cookbook/blob/main/quickstarts/Image_out.ipynb "google-gemini/cookbook — quickstarts/Image_out.ipynb"
[imagen4]: https://developers.googleblog.com/en/imagen-4-now-available-in-the-gemini-api-and-google-ai-studio "Imagen 4 in the Gemini API — Google Developers Blog"
[imagen4ultra]: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-ultra-generate-001 "Imagen 4 Ultra — Vertex AI reference page"
[synthid]: https://deepmind.google/science/synthid/ "SynthID — Google DeepMind"
[skywork-diag]: https://skywork.ai/blog/diagnose-failed-edits-gemini-nano-banana-image-guide/ "Diagnose failed edits in Nano Banana / Gemini 2.5 Flash Image — Skywork, 2025"
[gys-drift]: https://dev.to/gys/a-gemini-deep-research-failure-mode-refusal-topic-drift-and-fabricated-charts-1dgd "A Gemini failure mode: refusal, topic drift — dev.to, 2025"

- [intro] — Official launch announcement; capabilities list, preview pricing, SynthID mention.
- [ga] — GA transition; adds 10 aspect ratios, `ImageConfig`, `response_modalities=["IMAGE"]`.
- [promptguide] — Prompting templates, negative-prompt guidance, multi-image ordering rule.
- [vertex-blog] — Enterprise positioning and customer quotes (Adobe, Poe, WPP, Freepik, Leonardo, Figma).
- [vertex-docs] — Token, input, output, aspect-ratio, and region limits for `gemini-2.5-flash-image`.
- [lmarena] — Independent benchmark evidence: #1 on Image Edit and Text-to-Image leaderboards, +171 Elo.
- [cookbook] — Official notebook for image generation with the Nano Banana model.
- [imagen4] / [imagen4ultra] — Comparison baseline for the Imagen 4 family (pricing, resolutions, discontinuation).
- [synthid] — Canonical watermark description from DeepMind.
- [skywork-diag], [gys-drift] — Field failure-mode write-ups independent of Google.
