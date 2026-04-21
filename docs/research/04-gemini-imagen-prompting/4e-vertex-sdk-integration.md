---
category: 04-gemini-imagen-prompting
angle: 4e
title: "Programmatic Imagen 3/4 + Gemini 2.5 Flash Image via Vertex AI & google-genai SDK"
status: research-notes
last_updated: 2026-04-21
---

> **Updated 2026-04-21:** Critical changes since original compilation:
> 1. **Imagen 4.0 family deprecated.** All three GA variants (`imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`, `imagen-4.0-ultra-generate-001`) are deprecated and will be discontinued **June 30, 2026**. Google recommends migrating to `gemini-2.5-flash-image`.
> 2. **Legacy SDK removed.** The `vertexai.generative_models` / `vertexai.vision_models` / `vertexai.language_models` modules in `google-cloud-aiplatform` were deprecated June 24, 2025 and will be removed June 24, 2026. The `google-generativeai` package is also deprecated. The code examples in this file already use the correct `google-genai` SDK (`from google import genai`) — that SDK is the only supported path going forward.
> 3. **Free API tier for image-gen removed.** Programmatic image generation via the Gemini Developer API requires a billed project. Unbilled API keys return HTTP 429 with `free_tier_requests limit: 0` on all image models. The AI Studio web UI (`https://aistudio.google.com`) remains free for interactive use.
> 4. **Pricing confirmed accurate:** Imagen 4 Fast $0.02/img, Standard $0.04/img, Ultra $0.06/img; Gemini 2.5 Flash Image ~$0.039/img (token-based). Gemini 2.5 Flash Image discontinuation: **Oct 2, 2026**.

# 4e — Programmatic Imagen / Gemini Image Generation via Vertex AI & google-genai SDK

## Executive summary

Google ships **two parallel image-generation surfaces** and both are reachable from the same unified `google-genai` SDK (Python, JS/TS, Go, Java, .NET):

1. **Imagen 3 / Imagen 4 family** — a dedicated text-to-image model accessed via the `models.generate_images` method (Python) / `ai.models.generateImages` (JS) / `client.Models.GenerateImages` (Go), or the Vertex AI REST `endpoints.predict` method. Per-image pricing ($0.02 Fast, $0.04 Standard, $0.06 Ultra).
2. **Gemini 2.5 Flash Image** (internal codename "Nano Banana") — a multimodal Gemini model that returns images as `inline_data` parts from the normal `generate_content` call. Token-based pricing (1290 output tokens ≈ $0.039 per image at Vertex Standard rates).

Both are available on two backends with identical client code:
- **Gemini Developer API** (API key auth, simpler, no Vertex features)
- **Vertex AI** (ADC / service account auth, watermarks, seeds, negative prompts, GCS output, VPC-SC, CMEK)

The SDK transparently switches between them via the `GOOGLE_GENAI_USE_VERTEXAI` env var or constructor args. A handful of parameters (`seed`, `negative_prompt`, `add_watermark`, `enhance_prompt`, `labels`, `storageUri`) are **Vertex-only** — critical to know when building a product that must support both.

---

## Model landscape (as of April 2026)

> **Updated 2026-04-21:** Imagen 4.0 variants are deprecated — EOL June 30, 2026. Migrate to `gemini-2.5-flash-image`. The `google-cloud-aiplatform` Vertex AI SDK modules for GenAI are being removed June 24, 2026 — all new code should use `google-genai`.

| Model ID | Surface | Tier | Max res | Max imgs/req | Rate limit (RPM) | Price / img | Status |
|---|---|---|---|---|---|---|---|
| `imagen-4.0-ultra-generate-001` | `generate_images` | Ultra | 2048×2048 (2K) | 1 | 30 | $0.06 | **Deprecated — EOL Jun 30, 2026** |
| `imagen-4.0-generate-001` | `generate_images` | Standard | 2816×1536 | 4 | 75 | $0.04 | **Deprecated — EOL Jun 30, 2026** |
| `imagen-4.0-fast-generate-001` | `generate_images` | Fast | 1408×768 | 4 | 150 | $0.02 | **Deprecated — EOL Jun 30, 2026** |
| `imagen-3.0-generate-002` | `generate_images` | Standard | ~1536×1536 | 4 | — | $0.04 | Check deprecations page |
| `imagen-3.0-fast-generate-001` | `generate_images` | Fast | ~1024×1024 | 4 | — | $0.02 | Check deprecations page |
| `imagen-3.0-capability-001` | `edit_image` | Edit/custom | — | — | — | $0.04 | Check deprecations page |
| `imagen-4.0-upscale-preview` | `upscale_image` | x2 / x4 | up to 4K | — | — | $0.06 | Check deprecations page |
| `gemini-2.5-flash-image` | `generate_content` | Multimodal | up to 2048×2048 | 10 | — | $30 per 1M output tokens (= 1290 tok / image ≈ $0.039) | GA — EOL Oct 2, 2026 |
| `gemini-3-pro-image-preview` | `generate_content` | Flagship image | up to 4K | — | — | $120 per 1M output tokens ($0.134 @ 1K/2K, $0.24 @ 4K) | Preview |
| `gemini-3.1-flash-image-preview` | `generate_content` | Cheapest image | up to 4K | — | — | $60 per 1M output tokens ($0.045 @ 512, $0.067 @ 1K, $0.101 @ 2K, $0.15 @ 4K) | Preview — successor to 2.5 Flash Image |

Key dates: Imagen 4.0 GA **Aug 14, 2025**, discontinuation **Jun 30, 2026** — lock a versioned alias in code, not `imagen-4.0-generate` (which floats). Gemini 2.5 Flash Image GA **Oct 2, 2025**, discontinuation **Oct 2, 2026**. For new integrations targeting beyond Oct 2026, evaluate `gemini-3.1-flash-image-preview` as the successor.

---

## Imagen REST API — full parameter surface

For `POST https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/{MODEL}:predict`:

```json
{
  "instances": [
    { "prompt": "A watercolor of a red boat at dawn" }
  ],
  "parameters": {
    "sampleCount": 4,
    "aspectRatio": "16:9",
    "seed": 1234,
    "negativePrompt": "text, watermark, low quality",
    "language": "en",
    "personGeneration": "allow_adult",
    "safetySetting": "block_medium_and_above",
    "addWatermark": true,
    "enhancePrompt": true,
    "includeRaiReason": true,
    "includeSafetyAttributes": false,
    "outputOptions": {
      "mimeType": "image/png",
      "compressionQuality": 90
    },
    "storageUri": "gs://my-bucket/imagen-out/"
  }
}
```

> **Note (2026-04-21):** `negativePrompt` is **not supported** on any Imagen 4.x variant — it is silently ignored or causes a validation error. It was supported on `imagen-3.0-generate-001` only; removed in `imagen-3.0-generate-002` and all Imagen 4.x. The REST example above targets a generic Imagen endpoint for documentation purposes; remove `negativePrompt` when targeting Imagen 4 models. Fold exclusion intent into the positive prompt instead (see 4a and SYNTHESIS.md).

Parameter reference (most from Vertex AI's `VisionGenerativeModelParams`):

| Param | Type | Values / range | Notes |
|---|---|---|---|
| `sampleCount` | int | 1–4 (Ultra: 1) | = `number_of_images` in SDKs. |
| `aspectRatio` | string | `1:1` (default), `3:4`, `4:3`, `9:16`, `16:9` | Imagen 4. Gemini 2.5 Flash Image supports a wider set: `1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`. |
| `seed` | int | any int32 | **Vertex only.** Must set `addWatermark=false` to use; SynthID watermark pipeline breaks determinism. |
| `negativePrompt` | string | free text | **Vertex only.** Supported on `imagen-3.0-generate-001` only; **not supported on any Imagen 4.x variant** (silently ignored or validation error). Do not use with Imagen 4. Describe what you want **excluded** as positive descriptors instead. |
| `language` | string | `auto`, `en`, `es`, `pt`, `ko`, `ja`, `hi`, `zh`/`zh-CN`, `zh-TW` | Hint for the prompt tokenizer. |
| `personGeneration` | string | `allow_all`, `allow_adult` (default on Imagen 3), `dont_allow` | Imagen 4 defaults to `allow_all`; EU regions may force `allow_adult`. |
| `safetySetting` | string | `block_low_and_above`, `block_medium_and_above` (default), `block_only_high` | Legacy names `block_most/some/few` still accepted. |
| `addWatermark` | bool | default `true` | **Vertex only.** SynthID invisible watermark. Required `true` for Imagen 4 unless you opt out; must be `false` to use `seed`. |
| `enhancePrompt` | bool | default varies | **Vertex only.** LLM prompt rewriter; echoes rewritten prompt back in the response's `prompt` field. |
| `includeRaiReason` | bool | default `false` | Returns a string explaining which safety attribute blocked an image. |
| `includeSafetyAttributes` | bool | default `false` | Returns classification scores per image. |
| `outputOptions.mimeType` | string | `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff`, `image/vnd.microsoft.icon` | PNG default. |
| `outputOptions.compressionQuality` | int | 0–100 | JPEG/WebP only. |
| `storageUri` | string | `gs://bucket/prefix/` | **Vertex only.** If omitted, response contains base64 `bytesBase64Encoded`; if set, response contains GCS URIs and no inline bytes. |
| `labels` | map<string,string> | billing labels | **Vertex only**, Imagen only. Used for cost attribution. |

Response shape:

```json
{
  "predictions": [
    {
      "bytesBase64Encoded": "iVBORw0KG...",
      "mimeType": "image/png",
      "prompt": "<enhanced prompt, if enhancePrompt=true>",
      "raiFilteredReason": "<if includeRaiReason=true and blocked>",
      "safetyAttributes": { ... }
    }
  ]
}
```

---

## SDK surface — what maps to what

The google-genai SDKs normalize the REST names to language-idiomatic fields. Map:

| REST | Python (`GenerateImagesConfig`) | JS (`config`) | Go (`GenerateImagesConfig`) |
|---|---|---|---|
| `sampleCount` | `number_of_images` | `numberOfImages` | `NumberOfImages` |
| `aspectRatio` | `aspect_ratio` | `aspectRatio` | `AspectRatio` |
| `seed` | `seed` | `seed` | `Seed` |
| `negativePrompt` | `negative_prompt` | `negativePrompt` | `NegativePrompt` |
| `personGeneration` | `person_generation` | `personGeneration` | `PersonGeneration` |
| `safetySetting` | `safety_filter_level` | `safetyFilterLevel` | `SafetyFilterLevel` |
| `addWatermark` | `add_watermark` | `addWatermark` | `AddWatermark` |
| `enhancePrompt` | `enhance_prompt` | `enhancePrompt` | `EnhancePrompt` |
| `outputOptions.mimeType` | `output_mime_type` | `outputMimeType` | `OutputMIMEType` |
| `outputOptions.compressionQuality` | `output_compression_quality` | `outputCompressionQuality` | `OutputCompressionQuality` |
| `storageUri` | `output_gcs_uri` | `outputGcsUri` | `OutputGCSURI` |
| n/a (SDK-only) | `image_size` (`"1K"` or `"2K"`) | `imageSize` | `ImageSize` |
| `includeRaiReason` | `include_rai_reason` | `includeRaiReason` | `IncludeRaiReason` |
| n/a (SDK-only) | `guidance_scale` (1.0–20.0) | `guidanceScale` | `GuidanceScale` |
| `language` | `language` | `language` | `Language` |
| `labels` | `labels` | `labels` | `Labels` |

---

## Authentication: API key vs service account

**Two auth modes, selected at client construction:**

1. **Gemini Developer API (API key)** — simplest. Get a key at `https://aistudio.google.com/app/apikey`, set `GEMINI_API_KEY` or `GOOGLE_API_KEY`. Works for `generate_content` on Gemini models and `generate_images` on Imagen 3/4 (Developer API subset). **Does not support** `seed`, `negative_prompt`, `add_watermark`, `enhance_prompt`, `labels`, GCS output, VPC-SC, CMEK, or `upscale_image`. **Updated 2026-04-21:** Image generation via the Gemini Developer API **requires billing** — free/unbilled keys return HTTP 429 with `free_tier_requests limit: 0` on all image endpoints (`generate_images`, `generate_content` with `response_modalities=["IMAGE"]`). Enable billing at `https://console.cloud.google.com/billing` before calling any image model. The AI Studio web UI remains free for interactive (non-programmatic) use.

2. **Vertex AI (ADC / service account)** — full feature set. Two sub-modes:
   - **Application Default Credentials** locally: `gcloud auth application-default login`. SDK auto-discovers.
   - **Service account** in production: attach SA to the compute resource (Cloud Run, GKE, Compute Engine) or set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`. Required IAM role: `roles/aiplatform.user` (or narrower `roles/aiplatform.modelUser` for predict-only). Access tokens are 1h, SDK auto-refreshes.
   - **Express-mode API key** on Vertex: `genai.Client(vertexai=True, api_key="...")`. Halfway house — Vertex endpoint but no project/region setup.

Env-var selection matrix:

```bash
# Gemini Developer API
export GEMINI_API_KEY=...
# (no other env vars)

# Vertex AI with ADC
export GOOGLE_CLOUD_PROJECT=my-project
export GOOGLE_CLOUD_LOCATION=global        # or us-central1, europe-west4, etc.
export GOOGLE_GENAI_USE_VERTEXAI=True
# credentials via `gcloud auth application-default login`
# or GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json
```

---

## Code example 1 — Imagen 4 on Vertex AI (Python)

> **Note (2026-04-21):** `imagen-4.0-generate-001` is deprecated — EOL June 30, 2026. For new integrations, use `gemini-2.5-flash-image` (see Code example 2) or check the [model versions page](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions) for the current recommended GA model. Also note: `negative_prompt` is ignored by Imagen 4 — the example below includes it for REST surface documentation but should be removed in production calls to Imagen 4 models.

Canonical pattern: ADC auth + the full advanced-parameter set.

```python
import os
from google import genai
from google.genai.types import GenerateImagesConfig

os.environ["GOOGLE_CLOUD_PROJECT"] = "my-project"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

client = genai.Client()

response = client.models.generate_images(
    model="imagen-4.0-generate-001",
    prompt=(
        "Cinematic wide shot of a neon-lit ramen stand in rainy Tokyo, "
        "anamorphic lens flare, shallow depth of field, 35mm film grain"
    ),
    config=GenerateImagesConfig(
        number_of_images=4,
        aspect_ratio="16:9",
        image_size="2K",
        negative_prompt="text, watermark, logo, low quality, oversaturated",
        seed=42,
        add_watermark=False,         # required=False to honour seed
        enhance_prompt=True,
        person_generation="allow_adult",
        safety_filter_level="block_medium_and_above",
        output_mime_type="image/png",
        include_rai_reason=True,
        language="en",
        labels={"feature": "prompt-to-asset", "env": "prod"},
    ),
)

for i, gi in enumerate(response.generated_images):
    with open(f"out_{i}.png", "wb") as f:
        f.write(gi.image.image_bytes)
    print(f"Saved out_{i}.png ({len(gi.image.image_bytes)} bytes)")
    if gi.rai_filtered_reason:
        print("  RAI:", gi.rai_filtered_reason)
    if gi.enhanced_prompt:
        print("  enhanced prompt:", gi.enhanced_prompt)
```

---

## Code example 2 — Gemini 2.5 Flash Image on Vertex AI (Python)

Note the **different call shape**: `generate_content`, not `generate_images`, because Flash Image is a regular multimodal Gemini model. Images come back as `inline_data` parts.

```python
from io import BytesIO
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client(vertexai=True, project="my-project", location="global")

resp = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents=[
        "Create a 3:4 product shot of a matte-black wireless earbud case on a "
        "pale concrete surface, soft rim light from the left."
    ],
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
        image_config=types.ImageConfig(aspect_ratio="3:4"),
        temperature=1.0,
    ),
)

for i, part in enumerate(resp.candidates[0].content.parts):
    if part.inline_data and part.inline_data.data:
        img = Image.open(BytesIO(part.inline_data.data))
        img.save(f"flash_{i}.png")
    elif part.text:
        print("model text:", part.text)
```

Flash Image also does **conversational editing** — pass both a prior image (as an `inline_data` part) and a text instruction in `contents` to iterate on a generation. Up to 3 input images, up to 10 output images per prompt.

---

## Code example 3 — Imagen 4 on Vertex AI (JavaScript / TypeScript)

> **Note (2026-04-21):** `imagen-4.0-fast-generate-001` is deprecated — EOL June 30, 2026.

```ts
import { GoogleGenAI } from "@google/genai";
import { writeFile } from "node:fs/promises";

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
});

const response = await ai.models.generateImages({
  model: "imagen-4.0-fast-generate-001",
  prompt: "Isometric illustration of a pastel city block, clean vector style",
  config: {
    numberOfImages: 4,
    aspectRatio: "1:1",
    negativePrompt: "photorealistic, blurry, text",
    seed: 7,
    addWatermark: false,
    personGeneration: "dont_allow",
    safetyFilterLevel: "block_medium_and_above",
    outputMimeType: "image/png",
    enhancePrompt: true,
    includeRaiReason: true,
  },
});

for (const [i, g] of (response.generatedImages ?? []).entries()) {
  const b64 = g.image?.imageBytes;
  if (!b64) continue;
  await writeFile(`out_${i}.png`, Buffer.from(b64, "base64"));
}
```

For **Gemini 2.5 Flash Image** in JS, call `ai.models.generateContent({ model: "gemini-2.5-flash-image", contents: [...], config: { responseModalities: ["IMAGE","TEXT"] } })` and walk `response.candidates[0].content.parts` looking for `part.inlineData.data` (already base64 — `Buffer.from(data, "base64")`).

---

## Code example 4 — Imagen 4 via raw REST (curl)

Useful when you can't take a runtime dependency on the SDK (edge workers, Bash tooling, CI).

```bash
PROJECT_ID="my-project"
REGION="us-central1"
MODEL="imagen-4.0-generate-001"

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "instances": [
      {"prompt": "A dog reading a newspaper, studio photograph"}
    ],
    "parameters": {
      "sampleCount": 2,
      "aspectRatio": "4:3",
      "personGeneration": "dont_allow",
      "safetySetting": "block_medium_and_above",
      "addWatermark": true,
      "outputOptions": {"mimeType": "image/jpeg", "compressionQuality": 85},
      "storageUri": "gs://my-bucket/imagen-out/"
    }
  }' \
  "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL}:predict"
```

With `storageUri` set the response returns GCS URIs instead of base64 bytes — use this for any image >~2 MB to avoid bloating response payloads and hitting the ~10 MB Vertex response cap.

---

## Code example 5 — Imagen 4 on Vertex AI (Go)

> **Note (2026-04-21):** `imagen-4.0-generate-001` is deprecated — EOL June 30, 2026.

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"google.golang.org/genai"
)

func main() {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  os.Getenv("GOOGLE_CLOUD_PROJECT"),
		Location: "us-central1",
	})
	if err != nil {
		log.Fatal(err)
	}

	seed := int32(42)
	resp, err := client.Models.GenerateImages(
		ctx,
		"imagen-4.0-generate-001",
		"Robot holding a red skateboard, studio lighting, detailed",
		&genai.GenerateImagesConfig{
			NumberOfImages:   4,
			AspectRatio:      "1:1",
			ImageSize:        "2K",
			NegativePrompt:   "blurry, distorted",
			Seed:             &seed,
			AddWatermark:     genai.Ptr(false),
			PersonGeneration: "dont_allow",
			OutputMIMEType:   "image/png",
			EnhancePrompt:    genai.Ptr(true),
		},
	)
	if err != nil {
		log.Fatal(err)
	}

	for i, img := range resp.GeneratedImages {
		fname := fmt.Sprintf("imagen-%d.png", i)
		if err := os.WriteFile(fname, img.Image.ImageBytes, 0644); err != nil {
			log.Fatal(err)
		}
	}
}
```

---

## Community MCP servers & wrappers

Relevant if you want to plug Imagen/Gemini image-gen into Claude Desktop, Cursor, or any MCP client without writing one yourself:

- **`anton-proto/mcp-imagen`** — Google Imagen-only MCP server. Supports Imagen 4 standard/fast/ultra, aspect ratios, 1–4 image batches, and triple auth (Google Cloud ADC, Vertex AI, or Gemini API key). Closest to a "drop-in" wrapper of the REST surface.
- **`michaeljabbour/imagen-mcp`** — multi-provider MCP (OpenAI GPT-Image-1 **and** Gemini 2.5 Flash Image). Auto-routes per prompt; supports up to 14 reference images on Gemini; includes Google Search grounding for "real-world" image prompts.
- **`ccheshirecat/imagen-mcp`** — TypeScript MCP focused on Gemini 2.5 Flash Image, including multi-image composition and multi-turn conversational editing.
- **`imagemcp.io`** — hosted MCP offering if you'd rather not self-host.

For a custom product skill, `anton-proto/mcp-imagen` is the cleanest reference implementation — its source maps 1:1 to the REST parameters listed above and is a good template for our own MCP server.

---

## Practical notes for building our own skill / site

> **Updated 2026-04-21:** Points 1–10 below have been updated to reflect: (a) Imagen 4.0 family EOL June 30, 2026; (b) programmatic image-gen requires billing; (c) legacy SDK modules deprecated.

1. **Pick one SDK abstraction** (google-genai Python or JS) and let it pick the backend. Don't write separate Vertex vs Gemini-API code paths; drive it from env vars. **Do not use `google-cloud-aiplatform`'s `vertexai.generative_models` or `vertexai.vision_models`** — those modules are deprecated (removed June 24, 2026). Use `google-genai` (`from google import genai`) exclusively.
2. **Lock versioned model IDs** (`imagen-4.0-generate-001`, not `imagen-4.0-generate`). The unversioned alias moves without warning; versioned IDs have a published discontinuation date (**Jun 30, 2026 for all Imagen 4.0**). For new projects, start with `gemini-2.5-flash-image` (EOL Oct 2, 2026) or check the [model versions page](https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions) for the current recommended model.
3. **Ultra is single-image**. Don't expose a "batch size" knob on the Ultra tier — API will reject `sampleCount > 1`.
4. **Seed ↔ watermark interaction**: if reproducibility matters, surface a "reproducible" toggle that sets `seed` + `addWatermark=false` together. Otherwise seed is silently ignored.
5. **For Gemini 2.5 Flash Image, aspect ratio goes via `ImageConfig`**, not through a standalone parameter on `generate_content`. It supports more ratios (`21:9`, `4:5`, `5:4`, `3:2`, `2:3`) than Imagen 4.
6. **Output storage**: prefer `storageUri` (GCS) over inline base64 for anything ≥2K — the inline payload cap plus JSON encoding overhead makes large responses slow. Use signed URLs from GCS for the website.
7. **Cost budgeting**: Imagen Fast ≈ $0.02/img undercuts Gemini 2.5 Flash Image's ~$0.039/img by ~50%; but Flash Image gives you iterative editing in one call and more aspect ratios. Gemini 3 Pro Image ($0.134 @ 1–2K) is the quality ceiling but ~3×–7× more expensive than Imagen 4 Standard/Ultra. **All image-gen endpoints require billing** — free/unbilled Developer API keys return HTTP 429 on all image models.
8. **Regions**: default to `global` for Gemini 2.5 Flash Image; Imagen 4 is broadly available in US/EU regions. EU/UK users may need `europe-west4` with `personGeneration=allow_adult` to satisfy data residency.
9. **RAI filtering** silently drops images. Always request `include_rai_reason=True` during development and plumb the reason into the response so the product can tell users "blocked: person-faces" instead of "empty response".
10. **Batch prediction** is supported on Gemini 2.5 Flash Image and some Imagen variants via Vertex AI — use Flex/Batch tier for ~50% discount on non-interactive workflows (image dataset generation, bulk thumbnailing).

---

## Sources

1. [Method: endpoints.predict — Vertex AI Imagen API reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api) — canonical parameter list for `sampleCount`, `aspectRatio`, `seed`, `negativePrompt`, `personGeneration`, `safetySetting`, `addWatermark`, `enhancePrompt`, `outputOptions`, `storageUri`, `labels`.
2. [Generate images using text prompts with Imagen on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images) — official Python + REST quickstart.
3. [Vertex AI Generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) — per-image pricing for Imagen 4 Ultra/Standard/Fast and token pricing for Gemini 2.5 / 3 image models.
4. [Google Gen AI SDK overview (Python, JS, Go, Java, .NET)](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview) — unified SDK install + backend selection via env vars.
5. [Gemini 2.5 Flash Image model card (Vertex AI)](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image) — aspect ratio list, token cost, MIME types, region availability.
6. [Imagen 4 model card — `imagen-4.0-generate-001`](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001) — GA date, discontinuation, RPM quota, resolutions.
7. [Imagen 4 Fast model card — `imagen-4.0-fast-generate-001`](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-fast-generate-001) — Fast tier spec.
8. [Configure Application Default Credentials — Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/start/gcp-auth) — ADC vs service account vs API key guidance.
9. [Get a Google Cloud API key for Vertex AI express mode](https://cloud.google.com/vertex-ai/generative-ai/docs/start/api-keys) — API-key-based access to Vertex.
10. [`googleapis/python-genai` on GitHub](https://github.com/googleapis/python-genai) — canonical Python SDK source.
11. [`googleapis/js-genai` SDK reference — `Models.generateImages`](https://googleapis.github.io/js-genai/release_docs/classes/models.Models.html) — JS API surface including `editImage`, `upscaleImage`, `recontextImage`.
12. [`googleapis/go-genai` on GitHub](https://github.com/googleapis/go-genai) — canonical Go SDK source.
13. [`anton-proto/mcp-imagen` (GitHub)](https://github.com/anton-proto/mcp-imagen) — reference community MCP wrapper for Imagen 4.
14. [`michaeljabbour/imagen-mcp` (GitHub)](https://github.com/michaeljabbour/imagen-mcp) — multi-provider MCP (Gemini + OpenAI GPT-Image-1).
15. [`ccheshirecat/imagen-mcp` (GitHub)](https://github.com/ccheshirecat/imagen-mcp) — TypeScript Gemini 2.5 Flash Image MCP.
