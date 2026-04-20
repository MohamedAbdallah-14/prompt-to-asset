---
category: 04-gemini-imagen-prompting
title: "Category Index — Gemini & Imagen Prompting"
role: category-index
angles_indexed:
  - 4a-imagen-official-prompt-guides
  - 4b-gemini-flash-image-nano-banana
  - 4c-transparent-background-checker-problem
  - 4d-quirks-and-artifacts
  - 4e-vertex-sdk-integration
primary_pain_point: "Gemini rendering a checker-pattern or white box instead of a real transparent PNG for a logo"
research_value: high
last_updated: 2026-04-19
source_count: 70+
---

# 04 — Gemini & Imagen Prompting: Category Index

## Category Executive Summary

The user's motivating failure — "I asked Gemini for a transparent logo for my note-taking app and got weird boxes in the background" — is not a prompt-engineering mistake. It is the **exact, documented, architectural limitation** of every image model Google currently ships. The five angles in this category converge on a single diagnosis and a narrow set of routes through the problem.

**The diagnosis (angle 4c).** As of April 2026, *no* Google image model produces real RGBA / alpha-channel output. Vertex AI's model pages for `imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`, and `imagen-4.0-ultra-generate-001` all list "Transparent background: **Not supported**." Gemini 2.5 Flash Image ("Nano Banana") and Gemini 3 Pro Image ("Nano Banana Pro") inherit the same limitation. When a user asks for a transparent background, the model does one of three things: (1) flattens the image onto a solid white or black canvas (~60% of the time), (2) **draws** the gray-and-white transparency checkerboard into the RGB pixels (~30% — the "weird boxes"), or (3) returns an almost-transparent gradient that is still fully opaque. Google engineer Mark Daoust has confirmed the input side of this problem is an internal bug (`b/369593779`) filed September 2024 and still open ([4c](./4c-transparent-background-checker-problem.md)).

**Why the checker happens (4c, 4d).** The model's training corpus contains millions of screenshots from Photoshop, Figma, GIMP, and stock-PNG previews where the transparent regions are rendered by the viewer as a checkerboard. To the text encoder, "transparent PNG" and "image-with-checkerboard" are visually identical. When the model "understands" the intent, the only way its RGB output channel can express transparency is to **paint** the checker pattern into pixels. Colin Lord's diagnostic is precise: if the checker squares are inconsistent in size or offset when you zoom in, the model is rendering its concept of transparency rather than producing it. This is not something a better prompt can fix — the output encoder literally never populates an alpha plane.

**How the five angles solve it together.**

- **4a (official Imagen docs)** establishes Google's canonical prompting grammar — Subject → Context → Style, with documented lever categories (photography, materials, art references, quality modifiers, lens matrix, ≤25-character text rendering). This is the baseline any enhancer should emit. It also documents the capability matrix: Imagen 4 accepts 5 aspect ratios, English as the only fully supported language, 480-token prompt cap, and SynthID watermarking that cannot be disabled on the public path.
- **4b (Gemini 2.5 Flash Image)** shows the *other* model that shares the alpha problem but solves different ones: native multi-image fusion (up to 3 inputs), stateful multi-turn editing, 10 aspect ratios including 21:9 and 5:4, and the strongest in-image text rendering Google ships. This is the model a prompt enhancer should route to for edits and compositions, and away from for single-shot product photography.
- **4c (the checker problem)** catalogues six concrete prompt patterns that actually work around the missing alpha — pure #FFFFFF, pure #000000, green-screen (with known halos), difference-matting across a white+black pair, and Gemini 3 Flash + Code Execution. It is the "recipe book" a prompt enhancer executes when the user's intent is "transparent".
- **4d (quirks and artifacts)** is the defensive layer. Without it the enhancer will silently break on 18 documented ways the API misbehaves: `IMAGE_SAFETY` HTTP 200 with no image, MIME-type lies (PNG declared, JPEG bytes), futex-deadlocks on unknown finish-reason enums, Imagen's default-on `enhancePrompt` prompt rewriter, Nano Banana Pro's mandatory-thinking "realism bias" that sandpapers surreal intent into canonical outputs, and geolocation-gated refusals that only trigger outside the US.
- **4e (SDK & REST integration)** is the plumbing — the exact REST parameter surface, the google-genai Python/JS/Go field-name mapping, auth modes, cost-per-image tables, versioned model IDs with discontinuation dates, and five code examples (Imagen Python/JS/Go/cURL plus Gemini 2.5 Flash Image Python). This is what the plugin's routing layer actually calls.

Taken together the five files say the same thing to a product builder: **treat transparency as a pipeline concern, not a prompt knob; route by task, not by marketing; and defend against the black boxes by parsing finish-reasons and turning off the hidden prompt rewriter.**

## Map of the Angles

| Angle | Scope | Decisive contribution |
|---|---|---|
| [4a](./4a-imagen-official-prompt-guides.md) | Official Google Imagen 3/4 prompt guide, capability matrix, pricing, policy filters | Canonical Subject→Context→Style grammar, documented text-rendering cap (≤25 chars), aspect-ratio snap list (1:1, 3:4, 4:3, 9:16, 16:9), negative-prompt removal in Imagen 3.0-002 and all Imagen 4 variants |
| [4b](./4b-gemini-flash-image-nano-banana.md) | Gemini 2.5 Flash Image ("Nano Banana") capabilities, prompt idioms, failure modes | Narrative-paragraph prompting beats keyword soup; 10 aspect ratios via `ImageConfig`; multi-image ordering rule ("last image sets aspect ratio"); 6 reusable prompt templates (photoreal, text-in-image, inpaint, multi-turn, multi-image fusion, anti-drift) |
| [4c](./4c-transparent-background-checker-problem.md) | Transparent-background failure mode — the user's core pain | No Google model produces real RGBA; 5 concrete workarounds with difference-matting math; Gemini 3 Flash + Code Execution as the only first-party alpha route |
| [4d](./4d-quirks-and-artifacts.md) | 18 community-documented bugs and policy-filter behaviors across Imagen 3/4 and Gemini 2.5/3 Flash Image | Hidden `enhancePrompt=true` rewriter, `IMAGE_SAFETY` silent 200s, MIME lies, futex deadlocks, realism bias, geolocation-gated person refusals, sparkle + SynthID watermarks |
| [4e](./4e-vertex-sdk-integration.md) | Programmatic access — REST parameters, google-genai SDK field mapping, auth, code examples, MCP wrappers | Versioned model-ID table with prices and discontinuation dates; Vertex-only vs Developer-API parameter split; seed↔addWatermark dependency; `storageUri` for responses ≥2K |

The angles are layered: **4a + 4e** are the instruction manual (what Google tells you to send); **4b** is the companion manual for the sibling model Google does *not* cross-link well; **4c + 4d** are the field guide for what actually happens in production.

## Cross-Cutting Patterns

Five patterns appear in at least three of the five files and define the category:

**1. Two call shapes, two strategies.** Imagen is a pure text-to-image generator reached via `models.generate_images` / `:predict` ([4a](./4a-imagen-official-prompt-guides.md), [4e](./4e-vertex-sdk-integration.md)). Gemini 2.5 Flash Image is a multimodal Gemini reached via `generate_content`, with images arriving as `inline_data` parts ([4b](./4b-gemini-flash-image-nano-banana.md), [4e](./4e-vertex-sdk-integration.md)). The same google-genai SDK wraps both. Any enhancer that assumes "one image model, one call" will conflate price, aspect-ratio support, and editing semantics — all three differ materially.

**2. Narrative prompting beats tag-soup.** Google's own Gemini 2.5 Flash Image prompting guide is explicit: "Describe the scene, don't just list keywords" ([4b](./4b-gemini-flash-image-nano-banana.md)). The Imagen prompt guide ([4a](./4a-imagen-official-prompt-guides.md)) reinforces this with its Subject→Context→Style grammar and "iterate by adding one modifier at a time" examples. SDXL-era "masterpiece, 8k, trending on artstation" tokens actively hurt these models — the text encoder was trained on descriptive sentences, not danbooru-style tags.

**3. Absence-as-description replaces negative prompts.** Imagen 3.0-001 is the last model that accepts `negativePrompt`; Imagen 3.0-002 and every Imagen 4 variant silently ignore it ([4a](./4a-imagen-official-prompt-guides.md), [4e](./4e-vertex-sdk-integration.md)). Gemini 2.5 Flash Image never had one. The working pattern across both is to fold exclusions into positive descriptors: `"no trees"` → `"an empty concrete urban plaza"` ([4a](./4a-imagen-official-prompt-guides.md), [4b](./4b-gemini-flash-image-nano-banana.md)). This is a rewrite the enhancer must perform upstream.

**4. Black-box defaults silently rewrite intent.** Two "default-on" behaviors make reproducibility fragile: Imagen's `enhancePrompt=true` runs an LLM prompt rewriter on any prompt under ~30 words ([4d](./4d-quirks-and-artifacts.md), [4e](./4e-vertex-sdk-integration.md)), and Nano Banana Pro's mandatory thinking step pulls surreal / off-median prompts toward canonical interpretations ([4d](./4d-quirks-and-artifacts.md)). Combined with the non-configurable SynthID watermark ([4a](./4a-imagen-official-prompt-guides.md), [4b](./4b-gemini-flash-image-nano-banana.md)) and `seed`-only-if-`addWatermark=false` coupling ([4e](./4e-vertex-sdk-integration.md)), the honest reproducibility surface is narrower than the parameter list suggests.

**5. Policy enforcement lives *outside* the model.** `IMAGE_SAFETY`, geolocation-gated person-generation refusals, anime-style disproportionate blocking, kettle/pillow paranoia, and even the consumer app's quality regressions are output-layer filters the underlying model doesn't see ([4d](./4d-quirks-and-artifacts.md)). `HarmBlockThreshold=BLOCK_NONE` does not turn them off. This explains three otherwise baffling observations — "API works, app doesn't," "US works, EU doesn't," and "same prompt, different result after CDN edge shift."

## Controversies / Disagreements

The five files are largely consistent, but three tensions are worth naming:

**C1. Is Gemini 2.5 Flash Image better than Imagen 4 for logos?** Angle 4b argues Gemini wins on any pipeline that needs in-image text, editing, or character consistency — the LMArena Elo lead of +171 at launch is independent evidence. Angle 4a's implication is the opposite: Imagen 4 Ultra is the lowest-cost-per-pixel single-shot path with tight aspect-ratio and resolution control, and angle 4e's pricing table shows Imagen 4 Fast at $0.02/image undercuts Gemini 2.5 Flash Image's ~$0.039/image by nearly half. **Resolution:** use Imagen 4 for first-shot hero generation, Gemini 2.5 Flash Image for anything iterative.

**C2. Is `enhancePrompt=true` helpful or harmful?** Angle 4e recommends leaving it on for quality on short prompts. Angle 4d calls it a "hidden prompt rewriter" that breaks reproducibility and is inconsistent with the Gemini app UI. **Resolution:** the enhancer's entire job is to produce prompts long and specific enough that Imagen's internal rewriter becomes a no-op; set `enhancePrompt=false` once the enhancer emits ≥30-word subject-context-style prompts.

**C3. Is difference-matting (4c Example 5) worth 2× the API cost?** Angle 4c recommends it for glass, shadows, hair, and any genuinely semi-transparent subject. Angle 4d (#2) implies a simpler one-pass white + rembg pipeline is enough for most cases. **Resolution:** the enhancer should default to the one-pass pipeline and only escalate to difference-matting when the user's asset class contains soft edges or actual translucency.

## Gaps

- **Icon / favicon / OG-image-specific prompt recipes** are nowhere in the five files; category 11-favicon-web-assets and 09-app-icon-generation will need to provide them.
- **Vector / SVG output**. Neither Imagen nor Gemini produces SVG directly; the category points at raster→vector post-processing but does not evaluate Recraft vs `potrace` vs `vtracer` trade-offs — that lives in 12-vector-svg-generation.
- **Post-processing recommendations** (rembg, BRIA RMBG v2.0, Recraft's AI-tuned remover) are cited in 4c but not benchmarked head-to-head. Category 16-background-removal-vectorization must close this.
- **Cost-aware routing policies.** Prices per model are documented in 4a, 4b, and 4e, but nobody stitches them into a decision rule like "if the user wants ≤$0.05/image, route to Imagen 4 Fast; if they want editing, Gemini 2.5 Flash Image; if they want 4K, Gemini 3 Pro Image."
- **Gemini 3.1 Flash Image preview** is only listed in angle 4e's model landscape table — no dedicated prompting or quirks analysis yet. The 3.x Flash Image family will evolve over the next two quarters and this category should revisit.
- **Prompt-injection / safety regression tests** — none of the angles provide an empirical bench of what fraction of benign prompts the safety filter rejects in 2026.

## Actionable Recommendations for the plugin's Gemini/Imagen routing

The plugin should behave as a router, a rewriter, and a post-processor. Concrete rules:

### When to use Gemini vs fall back to other models

1. **User intent: transparent logo / icon / sticker** → do *not* send the user's phrase "transparent background" to any Google model (triggers 4c F1 or F4). Route based on subject:
   - Default: Imagen 4 Fast or Gemini 2.5 Flash Image with a rewritten prompt ending `"on a pure solid #FFFFFF white background. No props, no scenery, no floor."` then run rembg or BRIA RMBG v2.0 post-process ([4c](./4c-transparent-background-checker-problem.md)).
   - Subject is white/glass/bright: switch to `"on a pure solid #000000 black background"`.
   - Subject has genuine semi-transparency (glass, shadows, hair, smoke): emit a two-call difference-matting plan (white pass + black-edit pass + triangulation matting).
   - Caller demands native alpha and cannot post-process: **fall back to `gpt-image-1.5` or Recraft V3** ([4c](./4c-transparent-background-checker-problem.md)).
2. **User intent: iterative edit / multi-image composition / character consistency across scenes** → Gemini 2.5 Flash Image (stateful, 3-image input, conversational re-typing of in-image text) ([4b](./4b-gemini-flash-image-nano-banana.md)).
3. **User intent: single-shot high-fidelity photo / hero image / product shot with explicit 2K/2816×1536 resolution** → Imagen 4 Standard or Ultra; 4× candidates per call; up to $0.06/image on Ultra ([4a](./4a-imagen-official-prompt-guides.md), [4e](./4e-vertex-sdk-integration.md)).
4. **User intent: draft / thumbnail / mood board (<$0.03/image)** → Imagen 4 Fast at $0.02/image ([4e](./4e-vertex-sdk-integration.md)).
5. **User intent: 4K master for brand hero** → Gemini 3 Pro Image preview (`gemini-3-pro-image-preview`) at $0.134 per 1K/2K or $0.24 per 4K ([4e](./4e-vertex-sdk-integration.md)), with the caveat that Nano Banana Pro's realism bias can erase intentionally surreal detail ([4d #5](./4d-quirks-and-artifacts.md)).
6. **User intent: in-image text** → Gemini 2.5 Flash Image for strings ≥ one line (conversational "fix the 'y'" works); Imagen 4 for ≤25-character headlines with first-shot accuracy ([4a](./4a-imagen-official-prompt-guides.md), [4b](./4b-gemini-flash-image-nano-banana.md)).
7. **User intent: minors, celebrities, identifiable historical figures, or EU/UK/CH/MENA region** → check `personGeneration` rules ([4a](./4a-imagen-official-prompt-guides.md)) and geolocation filter ([4d #11](./4d-quirks-and-artifacts.md)); fall back to illustrative / non-photographic style if the user is in a restricted region.

### How to rewrite prompts before sending

1. **Emit Subject → Context → Style** as the base structure for every Imagen prompt ([4a](./4a-imagen-official-prompt-guides.md)). Add lens / lighting / quality modifiers from the documented lever table when the user's intent is photographic.
2. **For Gemini 2.5 Flash Image, emit a narrative paragraph, not a keyword list** ([4b](./4b-gemini-flash-image-nano-banana.md)). Anchor every vague word (e.g. "moody") to a photographic control (shot type, 85mm portrait lens, soft golden-hour light).
3. **Rewrite exclusions as positive descriptors.** Never emit a `negativePrompt` for Imagen 3.0-002 or any Imagen 4 model ([4a](./4a-imagen-official-prompt-guides.md), [4e](./4e-vertex-sdk-integration.md)). "No cars" becomes "empty deserted street with no traffic".
4. **Clamp in-image text to ≤25 characters and ≤3 phrases for Imagen** ([4a](./4a-imagen-official-prompt-guides.md)); surface a warning when the user exceeds. For Gemini 2.5 Flash Image, cap at one headline's worth (~12 words) to stay out of the long-string glitch zone ([4b](./4b-gemini-flash-image-nano-banana.md)).
5. **Snap aspect ratios** to `{1:1, 3:4, 4:3, 9:16, 16:9}` for Imagen and to the 10-ratio set for Gemini 2.5 Flash Image. When editing with multiple references, always put the "canvas-ratio reference" *last* — Gemini adopts the last image's ratio ([4b](./4b-gemini-flash-image-nano-banana.md), [4d #1](./4d-quirks-and-artifacts.md)).
6. **Prefer `realistic digital illustration` over `anime`** when the subject matter risks the overcautious safety filter ([4d #12](./4d-quirks-and-artifacts.md)).
7. **For transparency intent, never use the words "transparent," "PNG with alpha," or "no background."** Emit the white-background or black-background variant from the [4c](./4c-transparent-background-checker-problem.md) recipe book and mark the request for downstream matting.
8. **Disable `enhancePrompt`** when the enhancer's own output is ≥30 words — it prevents Imagen's hidden rewriter from re-interpreting the carefully structured prompt ([4d #4](./4d-quirks-and-artifacts.md), [4e](./4e-vertex-sdk-integration.md)).
9. **For identity-critical edits with Nano Banana Pro,** insert anti-canonical clauses explicitly ("the character is deliberately malformed; preserve asymmetry") to resist the realism-bias pull ([4d #5](./4d-quirks-and-artifacts.md)).
10. **Re-pin character descriptions every 3–5 turns** in long edit chains — drift is compounded, not compensated, by conversation memory ([4b](./4b-gemini-flash-image-nano-banana.md), [4d #15](./4d-quirks-and-artifacts.md)).

### How to post-process output

1. **Validate `inline_data.mime_type` against magic bytes** before handing off — Gemini 3 Pro Image preview returns `image/png` declared for JPEG bytes ([4d #9](./4d-quirks-and-artifacts.md)).
2. **Parse `finish_reason` defensively.** Treat `IMAGE_SAFETY`, `NO_IMAGE`, `STOP`, and `IMAGE_PROHIBITED_CONTENT` as distinct error classes; wrap enum access with a timeout to avoid the google-genai futex deadlock ([4d #7, #8](./4d-quirks-and-artifacts.md)).
3. **Request `include_rai_reason=true` during development** so blocks surface as "blocked: person-faces" rather than empty responses ([4e](./4e-vertex-sdk-integration.md)).
4. **Background removal pipeline.** For white-background output: rembg for high-contrast product shots; BRIA RMBG v2.0 (BiRefNet) for hair, fur, and fine edges; Recraft's AI-tuned remover for vector/icon assets ([4c](./4c-transparent-background-checker-problem.md), [4d #2](./4d-quirks-and-artifacts.md)).
5. **Difference-matting math** for semi-transparent assets:
   - `alpha = 1 - |W - B| / 255` per-channel (or 3-channel Euclidean).
   - `fg = B / alpha` to un-premultiply against the known black background.
   - Produces mathematically exact alpha for glass, shadow, and anti-aliased edges ([4c](./4c-transparent-background-checker-problem.md)).
6. **Alternative pipeline**: ship output to Gemini 3 Flash with High thinking + Code Execution; it writes and runs OpenCV in-sandbox for ~$0.006/image and returns a real RGBA PNG — the only first-party route to alpha ([4c Example 6](./4c-transparent-background-checker-problem.md)).
7. **SynthID is non-removable without quality loss.** Do not attempt to strip it; do verify it server-side if the product assumes uploads are human-sourced ([4a](./4a-imagen-official-prompt-guides.md), [4b](./4b-gemini-flash-image-nano-banana.md), [4d #13, #14](./4d-quirks-and-artifacts.md)).
8. **Use `storageUri` (GCS) for outputs ≥2K** — inline base64 bloats responses past the Vertex ~10 MB cap and slows the UI ([4e](./4e-vertex-sdk-integration.md)).
9. **Lock versioned model IDs** (`imagen-4.0-generate-001`, not `imagen-4.0-generate`) — unversioned aliases drift; versioned IDs have a published discontinuation (Imagen 4.0 family → Jun 30, 2026; Gemini 2.5 Flash Image → Oct 2, 2026) ([4e](./4e-vertex-sdk-integration.md)).
10. **Enable Batch/Flex tier** for non-interactive workflows; ~50% discount on bulk dataset generation ([4e](./4e-vertex-sdk-integration.md)).

## Primary Sources Aggregated

Official Google sources (first-party):

- [Prompt and image attribute guide (Vertex AI)](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide) — [4a]
- [Imagen 3 model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate) — [4a], [4c]
- [Imagen 3.0 Generate 002 model page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate-002) — [4a]
- [Imagen 4 model page — generate-001](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001) — [4a], [4c], [4e]
- [Imagen 4 Ultra model page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-ultra-generate-001) — [4a], [4b]
- [Imagen 4 Fast model page](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-fast-generate-001) — [4e]
- [Generate images using Imagen (Gemini API)](https://ai.google.dev/gemini-api/docs/imagen) — [4a]
- [Gemini 2.5 Flash Image — Vertex AI reference](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image) — [4b], [4c], [4e]
- [Gemini 2.5 Flash Image — ai.google.dev](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image) — [4c]
- [A developer's guide to Imagen 3 on Vertex AI](https://cloud.google.com/blog/products/ai-machine-learning/a-developers-guide-to-imagen-3-on-vertex-ai) — [4a]
- [Introducing Gemini 2.5 Flash Image (Developers Blog, Aug 26 2025)](https://developers.googleblog.com/en/introducing-gemini-25-flash-image/) — [4b]
- [Gemini 2.5 Flash Image now ready for production (Developers Blog, Oct 2 2025)](https://developers.googleblog.com/en/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios) — [4b]
- [How to prompt Gemini 2.5 Flash Image (Developers Blog, Aug 28 2025)](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/) — [4b]
- [Gemini 2.5 Flash Image on Vertex AI (Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/gemini-2-5-flash-image-on-vertex-ai) — [4b]
- [Configure aspect ratio](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-aspect-ratio) — [4a]
- [Omit content using a negative prompt](https://cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt) — [4a]
- [Configure Responsible AI safety settings](https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-responsible-ai-safety-settings) — [4a]
- [Instruct customization](https://cloud.google.com/vertex-ai/generative-ai/docs/image/instruct-customization) — [4a]
- [Vertex AI Generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) — [4a], [4b], [4e]
- [Use prompt rewriter (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/use-prompt-rewriter) — [4d], [4e]
- [Method: endpoints.predict — Vertex AI Imagen API reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api) — [4e]
- [Google Gen AI SDK overview](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview) — [4e]
- [Google DeepMind — SynthID](https://deepmind.google/science/synthid) — [4b], [4d]
- [Google DeepMind — Imagen](https://deepmind.google/technologies/imagen-3/) — [4a]
- [Google blog — What happened with Gemini image generation (Feb 2024)](https://blog.google/products/gemini/gemini-image-generation-issue) — [4d]
- [Google AI Developers Forum — Imagen 4.0 long-prompt rendering bug](https://discuss.ai.google.dev/t/imagen-4-0-api-issue-long-contextual-prompts-rendered-as-text-instead-of-creative-guidance-multimodal-alternative-needed/86828) — [4d]
- [Gemini Apps Community — transparent background feature request](https://support.google.com/gemini/thread/388691969/) — [4d]
- [Gemini Apps Community — checkered-background thread](https://support.google.com/gemini/thread/411393424/) — [4c]

Official Google code / SDKs:

- [`googleapis/python-genai`](https://github.com/googleapis/python-genai) — [4e]
- [`googleapis/js-genai`](https://googleapis.github.io/js-genai/) — [4e]
- [`googleapis/go-genai`](https://github.com/googleapis/go-genai) — [4e]
- [`google-gemini/cookbook` — `quickstarts/Image_out.ipynb`](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Image_out.ipynb) — [4b]
- [google-gemini/generative-ai-python #567 — alpha drop bug](https://github.com/google-gemini/generative-ai-python/issues/567) — [4c]
- [googleapis/python-genai #2024 — futex deadlock](https://github.com/googleapis/python-genai/issues/2024) — [4d]
- [googleapis/python-genai #1824 — MIME-type lie](https://github.com/googleapis/python-genai/issues/1824) — [4d]
- [google-gemini/cookbook #1018 — aspectRatio ignored in Batch API](https://github.com/google-gemini/cookbook/issues/1018) — [4d]
- [google-gemini/cookbook #568 — generic-prompt refusals](https://github.com/google-gemini/cookbook/issues/568) — [4d]
- [DEV Community (Google AI org) — Gemini 3 Flash + Code Execution transparency walkthrough](https://www.dev.to/googleai/image-manipulation-on-a-budget-bounding-boxes-and-transparency-with-gemini-30-flash-and-cib) — [4c]

Independent technical reporting and community:

- [LMArena — Nano-Banana benchmark](https://lmarena.ai/blog/nano-banana/) — [4b]
- [Max Woolf — Nano Banana Pro review](https://minimaxir.com/2025/12/nano-banana-pro/) — [4d]
- [Yael Walker — Unexpected effects of GDPR on image generation](https://yaelwalker.com/blog/nano-banana/) — [4d]
- [Colin Lord — Google Gemini Lied To Me](https://colinlord.com/google-gemini-lied-to-me/) — [4c]
- [Julien De Luca — Generating transparent background images with Nano Banana Pro 2](https://jidefr.medium.com/generating-transparent-background-images-with-nano-banana-pro-2-1866c88a33c5) — [4c]
- [Replicate — `jide/nano-banana-2-transparent`](https://replicate.com/jide/nano-banana-2-transparent) — [4c]
- [BRIA blog — RMBG v2.0](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images) — [4c]
- [Recraft docs — Background tools](https://recraft.ai/docs/using-recraft/image-editing/background-tools) — [4c]
- [OpenAI — `gpt-image-1` model reference](https://developers.openai.com/api/docs/models/gpt-image-1) — [4c]
- [Skywork — Diagnose failed edits in Nano Banana](https://skywork.ai/blog/diagnose-failed-edits-gemini-nano-banana-image-guide/) — [4b]
- [AI Free API — IMAGE_SAFETY troubleshooting](https://aifreeapi.com/en/posts/gemini-image-silent-failure-image-safety-fix) — [4d]
- [AI Free API — Why Nano Banana Pro refuses your image prompt](https://aifreeapi.com/en/posts/nano-banana-pro-image-generation-refused) — [4d]
- [Allen Kuo — Removing Gemini AI watermarks (reverse alpha blending)](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f) — [4d]
- [allenk/GeminiWatermarkTool — SynthID research report](https://github.com/allenk/GeminiWatermarkTool/blob/main/report/synthid_research.md) — [4d]
- [Hacker News — item 46098776 (Nano Banana transparency)](https://news.ycombinator.com/item?id=46098776) — [4c], [4d]
- [Hacker News — item 45711868 (transparent-bg AI generators)](https://news.ycombinator.com/item?id=45711868) — [4c]
- [Lovart — Imagen 4 review](https://www.lovart.ai/blog/imagen-4-review) — [4a]
- [MagicHour — Imagen 4 pricing & API access](https://magichour.ai/blog/imagen-4-pricing-and-api) — [4a]
- [ThePlanetTools — Imagen 4 tiers guide](https://theplanettools.ai/blog/google-imagen-4-models-fast-standard-ultra-guide-2026) — [4a]
- [bananathumbnail.com — 7 Nano Banana mistakes](https://blog.bananathumbnail.com/gemini-nano-banana-3/) — [4d]
- [CNET — Nano Banana hands-on](https://www.cnet.com/tech/services-and-software/geminis-nano-bananas-ai-image-editing-is-fun-but-I-ran-into-too-many-slipups/) — [4d]
- [juheapi.com — Nano Banana 2 multi-turn editing test](https://www.juheapi.com/blog/nano-banana-2-multi-turn-editing-test-iterating-on-single-image-5-rounds) — [4d]
- [arXiv 2604.03400 — Banana100 multi-turn degradation benchmark](https://arxiv.org/html/2604.03400v1) — [4d]

Community MCP wrappers (reference implementations for the plugin's own tool):

- [`anton-proto/mcp-imagen`](https://github.com/anton-proto/mcp-imagen) — [4e]
- [`michaeljabbour/imagen-mcp`](https://github.com/michaeljabbour/imagen-mcp) — [4e]
- [`ccheshirecat/imagen-mcp`](https://github.com/ccheshirecat/imagen-mcp) — [4e]
