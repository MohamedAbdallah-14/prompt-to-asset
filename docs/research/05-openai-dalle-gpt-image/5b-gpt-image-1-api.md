---
category: 05-openai-dalle-gpt-image
angle: 5b
angle_title: "gpt-image-1 API surface & capabilities"
last_updated: 2026-04-19
primary_sources:
  - "OpenAI — Image generation guide (gpt-image-1) — https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1"
  - "OpenAI API Reference — Create image (POST /v1/images/generations) — https://developers.openai.com/api/reference/resources/images/methods/generate/"
  - "OpenAI API Reference — Create image edit (POST /v1/images/edits) — https://developers.openai.com/api/reference/resources/images/methods/edit/"
  - "OpenAI Cookbook — Generate images with GPT Image (Apr 23 2025) — https://cookbook.openai.com/examples/generate_images_with_gpt_image"
  - "OpenAI Cookbook — Generate images with high input fidelity (Jul 17 2025) — https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity"
  - "OpenAI — Introducing our latest image generation model in the API (Apr 23 2025) — https://openai.com/index/image-generation-api/"
  - "OpenAI Platform — GPT Image 1 model page — https://platform.openai.com/docs/models/gpt-image-1"
  - "OpenAI Help — API Organization Verification — https://help.openai.com/en/articles/10910291-api-organization-verification"
  - "Microsoft Azure — Unveiling GPT-image-1 in Azure AI Foundry — https://azure.microsoft.com/en-us/blog/unveiling-gpt-image-1-rising-to-new-heights-with-image-generation-in-azure-ai-foundry/"
  - "OpenAI Developer Community — gpt-image-1 transparent backgrounds with Edit request — https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577"
  - "OpenAI Developer Community — gpt-image-1 transparency: 'Remove background' also cuts out white spots — https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481"
  - "OpenAI Developer Community — New GPT Image Model in the API (announcement thread) — https://community.openai.com/t/new-gpt-image-model-in-the-api/1239462"
---

# 5b — gpt-image-1 API surface & capabilities

**Research value: high.** `gpt-image-1` is one of only two production image APIs with first-class transparent-PNG output (the other being Google's Imagen family), its surface area is fully documented by OpenAI, and it is directly relevant to the prompt-to-asset's pain point of producing logos, icons, and UI assets with clean alpha channels rather than white-rectangle backdrops.

## Executive Summary

`gpt-image-1` is OpenAI's natively multimodal image-generation model, released to the Images API on **April 23, 2025**, and now the flagship of a three-model family (`gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini`) that shares a single API surface.<sup>[1][6]</sup> Unlike the DALL·E generation it replaced, `gpt-image-1`:

1. **Natively renders true transparent backgrounds** via `background="transparent"` — no white-background synthesis plus post-processing required.<sup>[1][2][4]</sup>
2. **Bills per token** (text in / image in / image out) rather than per image, with three quality tiers (`low`, `medium`, `high`) that scale token counts 15× from low to high.<sup>[1][6]</sup>
3. **Supports up to 16 reference images** on the `/images/edits` endpoint with a new `input_fidelity="high"` flag that preserves faces and logos far better than standard edit mode.<sup>[3][5]</sup>
4. **Streams partial images** (0–3 progressive frames) via `stream: true` + `partial_images` for faster perceived latency.<sup>[1][2][3]</sup>
5. **Requires organization verification** before the API key can call the endpoints at all — a one-time verification step that is the number-one cause of 403s on a fresh account.<sup>[1][8]</sup>

For the prompt-to-asset, the most important affordances are:
- `background="transparent" + output_format="png" + quality="high"` for logos, app icons, stickers, and favicon sources (the canonical "clean alpha" recipe).
- `input_fidelity="high"` on `/images/edits` for logo-preserving mockups, branding edits, and face-preserving avatars.
- `moderation="low"` to reduce false-positive refusals on branding/figurative prompts (still subject to usage policy).

A single authoritative reference — the [Image generation guide](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) — covers 95% of what a developer needs. Everything below cross-references that guide plus the API reference (`/generations` and `/edits`) and the two relevant OpenAI Cookbook notebooks.

## Model Family & Positioning

`gpt-image-1` is the April-2025 GA release of the natively multimodal model that had been powering image generation in ChatGPT since March 2025 (over 700M images generated in the first week).<sup>[6]</sup> As of this research date the family has expanded:

| Model | Role | Notes |
|---|---|---|
| `gpt-image-1.5` | Current state-of-the-art | Shares same API surface; preserves 5 input images with high fidelity instead of 1.<sup>[1][3]</sup> |
| `gpt-image-1` | Original GA model | The model this deep-dive targets; still supported.<sup>[1]</sup> |
| `gpt-image-1-mini` | Cost-optimized | ~3× cheaper per image; same surface, lower quality.<sup>[1]</sup> |
| `chatgpt-image-latest` | Alias used by Responses API edits | Points at the ChatGPT-parity model.<sup>[3]</sup> |

All four share the same endpoints, parameters, and behavior quirks, so code targeting `gpt-image-1` generally works unchanged against `gpt-image-1.5`.

DALL·E 2 and DALL·E 3 are still available on the Image API but are **deprecated with sunset scheduled for 2026-05-12**;<sup>[1]</sup> new work should target the GPT Image family.

## Access Control: Organization Verification

Before any API call will succeed, the organization that owns the API key must complete **API Organization Verification**:<sup>[1][8]</sup>

1. Go to Settings → Organization → General in the OpenAI dashboard.
2. Submit an accepted ID (government photo ID) and complete the verification flow.
3. Wait up to ~30 min for propagation across OpenAI's systems.
4. Generate a fresh API key in the correct project after verification.

**Verification does not require a spending threshold.** The single biggest support-ticket trigger on `gpt-image-1` is a 403 or `"retry after 0.0 seconds"` response on a verified org — this is almost always a stale API key from before verification, or calling from a different project than the verified one. The fix is to create a new key in the correct project and test in the Images playground first.<sup>[8]</sup>

## Endpoints

Two endpoints handle the `gpt-image-1` surface on the Image API (plus the `image_generation` tool on the Responses API, covered briefly below):

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/images/generations` | POST | Text-to-image generation.<sup>[2]</sup> |
| `/v1/images/edits` | POST | Image-to-image editing; supports up to 16 reference images, optional mask.<sup>[3]</sup> |
| `/v1/responses` + `tools:[{type:"image_generation"}]` | POST | Conversational, multi-turn image generation with inline edits.<sup>[1]</sup> |

The Responses API adds multi-turn state (carry `previous_response_id`) and an `action` parameter (`"auto" | "generate" | "edit"`) but otherwise exposes the same knobs.<sup>[1]</sup>

## Full Parameter Reference (Image API)

### Shared between `/generations` and `/edits`

| Parameter | Type | Notes |
|---|---|---|
| `model` | string | `"gpt-image-1"`, `"gpt-image-1.5"`, `"gpt-image-1-mini"`, or `"chatgpt-image-latest"`.<sup>[2][3]</sup> |
| `prompt` | string | Up to **32,000 characters** for GPT Image models (vs 4,000 for DALL·E 3, 1,000 for DALL·E 2).<sup>[2]</sup> |
| `n` | number (1–10) | Number of images to generate in one call.<sup>[2]</sup> |
| `size` | enum | `"1024x1024"` (square), `"1536x1024"` (landscape), `"1024x1536"` (portrait), `"auto"` (default). No other sizes are supported.<sup>[1][2]</sup> |
| `quality` | enum | `"low"`, `"medium"`, `"high"`, `"auto"`. Directly controls output-token count and therefore cost/latency.<sup>[1][2]</sup> |
| `background` | enum | `"transparent"`, `"opaque"`, `"auto"` (default). Requires `output_format` ∈ {`png`, `webp`} when `transparent`.<sup>[1][2]</sup> |
| `output_format` | enum | `"png"` (default), `"jpeg"`, `"webp"`.<sup>[1][2]</sup> |
| `output_compression` | number (0–100) | Only valid with `jpeg` or `webp`; default 100.<sup>[1][2]</sup> |
| `moderation` | enum | `"auto"` (default) or `"low"` (less restrictive).<sup>[1][2]</sup> |
| `stream` | bool | Enable SSE streaming. Image API only supports this for GPT Image models.<sup>[1][2]</sup> |
| `partial_images` | number (0–3) | Number of progressive frames emitted during streaming. 0 = final image only.<sup>[1][2]</sup> |
| `user` | string | End-user identifier for abuse monitoring.<sup>[2]</sup> |
| `response_format` | enum | **Ignored for GPT Image models** — they always return `b64_json`.<sup>[2]</sup> |

### Edit-only additions

| Parameter | Type | Notes |
|---|---|---|
| `image` / `images` | file[] or file_id[] or image_url[] | Up to **16** images; each < 50 MB; `png`/`webp`/`jpg`.<sup>[3]</sup> |
| `mask` | file or `{file_id}` or `{image_url}` | PNG with an alpha channel; same dimensions as first image; < 4 MB. When multiple input images are provided, mask is applied to the **first** one only.<sup>[1][3]</sup> |
| `input_fidelity` | enum | `"low"` (default) or `"high"`. When `"high"`, faces/logos in the first image are preserved with richer texture detail; `gpt-image-1.5` extends high fidelity to the first 5 images.<sup>[1][3][5]</sup> |

### Response shape

`ImagesResponse` always returns base64 in `data[i].b64_json` for the GPT Image family, plus a usage block with text/image token breakdowns:<sup>[2][3]</sup>

```json
{
  "created": 1713833628,
  "background": "transparent",
  "output_format": "png",
  "quality": "high",
  "size": "1024x1024",
  "data": [{ "b64_json": "..." }],
  "usage": {
    "total_tokens": 4270,
    "input_tokens": 110,
    "output_tokens": 4160,
    "input_tokens_details": { "text_tokens": 110, "image_tokens": 0 },
    "output_tokens_details": { "image_tokens": 4160, "text_tokens": 0 }
  }
}
```

Note `revised_prompt` is DALL·E-3-only on the Image API, but the Responses-API `image_generation_call` output includes a `revised_prompt` when the orchestrating model (e.g. `gpt-5`, `gpt-4.1`) rewrites the user's prompt.<sup>[1]</sup>

## Token & Pricing Model

`gpt-image-1` bills in tokens, not images. Three meters run in parallel:<sup>[1][6]</sup>

| Meter | `gpt-image-1` price | Typical use |
|---|---|---|
| Text input | **$5.00 / 1M tokens** (cached: $1.25) | The prompt itself |
| Image input | **$10.00 / 1M tokens** (cached: $2.50) | Reference images on `/images/edits` |
| Image output | **$40.00 / 1M tokens** | The generated image(s) |

Output-token counts are **fixed per (quality, size) combination** — there is no per-pixel variability:<sup>[1]</sup>

| Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|---|---|---|---|
| Low | 272 | 408 | 400 |
| Medium | 1,056 | 1,584 | 1,568 |
| High | 4,160 | 6,240 | 6,208 |

Plugging those into the output price yields the well-known per-image numbers OpenAI quotes in its announcement:<sup>[6]</sup> ~$0.02 (low), ~$0.07 (medium), ~$0.19 (high) for a square image; `gpt-image-1.5` is ~20% cheaper; `gpt-image-1-mini` is ~3× cheaper still.<sup>[1]</sup>

**Streaming surcharge:** each partial image in a streamed response adds **100 image output tokens**.<sup>[1]</sup> Three partials on a high-quality square image therefore cost `4,160 + 3×100 = 4,460` output tokens (~$0.178 vs $0.167 baseline).

**High input fidelity surcharge:** `input_fidelity="high"` materially increases input-image token usage (exact multiplier is not published; budget for ~2–4× input-image tokens).<sup>[1][5]</sup>

## Rate Limits (RPM/TPM/IPM)

The GPT Image family is governed by **two** rate-limit dimensions — tokens-per-minute (TPM) **and** images-per-minute (IPM):<sup>[7]</sup>

| Tier | TPM | IPM |
|---|---|---|
| Free | Not supported | — |
| 1 | 100,000 | 5 |
| 2 | 250,000 | 20 |
| 3 | 800,000 | 50 |
| 4 | 3,000,000 | 150 |
| 5 | 8,000,000 | 250 |

At Tier 1 (a verified but new account), 5 IPM = 1 image every 12 seconds, which is the practical ceiling for early prototyping. A single high-quality 1024×1024 image consumes ~4,260 TPM out of the 100,000 tier-1 budget, so IPM bites first, not TPM. A request that fails IPM returns 429 with `Retry-After`.

## File Size & Format Limits

- **Input image size:** < **50 MB** per file; `png`, `webp`, or `jpg`.<sup>[3]</sup>
- **Mask size:** < **4 MB**; must be PNG **with an alpha channel**; must match the dimensions of the source image.<sup>[1][3]</sup>
- **Number of input images:** up to **16** on `/images/edits` for GPT Image models (the legacy guide text still says "10" in places — the API reference is authoritative at 16).<sup>[1][3]</sup>
- **Supported output sizes:** only `1024x1024`, `1536x1024`, `1024x1536`, or `auto`. Arbitrary sizes are **not** supported; resize client-side after generation.<sup>[1]</sup>
- **Prompt length:** up to **32,000 characters**.<sup>[2]</sup>

## Code Examples

### 1. Basic generation (Python)

```python
# pip install openai
import base64
from openai import OpenAI

client = OpenAI()

result = client.images.generate(
    model="gpt-image-1",
    prompt="A children's book drawing of a veterinarian using a stethoscope "
           "to listen to the heartbeat of a baby otter.",
    size="1024x1024",
    quality="medium",
)

with open("otter.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))

# Token accounting
usage = result.usage
print(f"input={usage.input_tokens}  output={usage.output_tokens}  total={usage.total_tokens}")
```

Based directly on the OpenAI Cookbook's `Generate_Images_With_GPT_Image` notebook.<sup>[4]</sup>

### 2. Transparent PNG — the canonical logo/icon recipe (Python)

This is the exact primitive the prompt-to-asset needs for logos, app icons, stickers, and favicon sources. The guide explicitly notes: **"Transparency works best when setting the quality to `medium` or `high`."**<sup>[1]</sup>

```python
import base64
from openai import OpenAI

client = OpenAI()

result = client.images.generate(
    model="gpt-image-1",
    prompt="A minimal geometric fox-head logo, flat vector style, "
           "two-tone orange and charcoal, centered, on a transparent background.",
    size="1024x1024",
    background="transparent",   # native alpha output
    output_format="png",        # required for transparency (or webp)
    quality="high",              # transparency works best at medium/high
)

with open("fox_logo.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

Confirmed in both the guide's "Transparency" section and the Cookbook transparent-background example (`hat.png`).<sup>[1][4]</sup>

### 3. Transparent PNG (curl)

```bash
curl -sS https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-1",
    "prompt": "A minimal geometric fox-head logo, flat vector style, two-tone orange and charcoal, centered, on a transparent background.",
    "size": "1024x1024",
    "background": "transparent",
    "output_format": "png",
    "quality": "high"
  }' \
  | jq -r '.data[0].b64_json' | base64 --decode > fox_logo.png
```

Adapted from the curl example on the OpenAI Image generation guide's Transparency section.<sup>[1]</sup>

### 4. JPEG with custom compression (Python)

```python
result = client.images.generate(
    model="gpt-image-1",
    prompt="A portrait, pixel-art style, of a grey tabby cat dressed as a "
           "blond woman on a dark background.",
    size="1024x1536",
    quality="low",
    output_format="jpeg",
    output_compression=50,   # 0-100; only valid for jpeg/webp
)
```

Direct from the Cookbook's "customize the output" section.<sup>[4]</sup> `jpeg` is faster to produce than `png` and should be preferred when latency beats format fidelity.<sup>[1]</sup>

### 5. Multi-image edit with up to 16 references (Python)

```python
import base64
from openai import OpenAI

client = OpenAI()

result = client.images.edit(
    model="gpt-image-1",
    image=[
        open("body-lotion.png", "rb"),
        open("bath-bomb.png", "rb"),
        open("incense-kit.png", "rb"),
        open("soap.png", "rb"),
    ],
    prompt=(
        "Generate a photorealistic image of a gift basket on a white background "
        "labeled 'Relax & Unwind' with a ribbon and handwriting-like font, "
        "containing all the items in the reference pictures."
    ),
    size="1024x1024",
    quality="high",
)

with open("gift-basket.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

Source: OpenAI guide's "Create a new image using image references" example.<sup>[1]</sup>

### 6. Inpainting with a mask (Python)

```python
from openai import OpenAI
client = OpenAI()

result = client.images.edit(
    model="gpt-image-1",
    image=open("sunlit_lounge.png", "rb"),
    mask=open("mask.png", "rb"),            # must have an alpha channel
    prompt="A sunlit indoor lounge area with a pool containing a flamingo",
)
```

The prompt must describe the **entire resulting image**, not just the masked region. Important caveat from OpenAI: "Unlike with DALL·E 2, masking with GPT Image is entirely prompt-based. This means the model uses the mask as guidance, but may not follow its exact shape with complete precision."<sup>[1]</sup>

### 7. Programmatically adding an alpha channel to a B&W mask (Python)

The most common mask-debugging failure is producing a PNG without an alpha channel. The Cookbook ships the canonical recipe:<sup>[4]</sup>

```python
from PIL import Image
from io import BytesIO

# 1. Load the black & white mask as a grayscale image
mask = Image.open("mask_bw.png").convert("L")
# 2. Convert it to RGBA so it has space for an alpha channel
mask_rgba = mask.convert("RGBA")
# 3. Use the mask itself to fill that alpha channel
mask_rgba.putalpha(mask)
# 4. Save as PNG (required format for mask uploads)
buf = BytesIO()
mask_rgba.save(buf, format="PNG")
with open("mask_alpha.png", "wb") as f:
    f.write(buf.getvalue())
```

### 8. High input fidelity — logo preservation in a mockup (Python)

```python
result = client.images.edit(
    model="gpt-image-1",
    image=[
        open("woman.jpg", "rb"),   # face must be first for richest-texture fidelity
        open("logo.png", "rb"),
    ],
    prompt="Add the logo to the woman's top, as if stamped into the fabric.",
    input_fidelity="high",
    quality="high",
    output_format="png",
)
```

From the OpenAI high-input-fidelity cookbook.<sup>[5]</sup> With `input_fidelity="high"`, the logo keeps its sharp edges, typography, and color palette; with the default `"low"` the model commonly re-draws a "logo-shaped" approximation instead.<sup>[5]</sup>

### 9. Streaming with partial images (Python)

```python
import base64
from openai import OpenAI

client = OpenAI()
stream = client.images.generate(
    model="gpt-image-1",
    prompt="Draw a river made of white owl feathers through a winter landscape.",
    size="1024x1024",
    stream=True,
    partial_images=2,  # 0-3; each partial adds 100 output tokens
)

for event in stream:
    if event.type == "image_generation.partial_image":
        idx = event.partial_image_index
        with open(f"river_partial_{idx}.png", "wb") as f:
            f.write(base64.b64decode(event.b64_json))
    elif event.type == "image_generation.completed":
        with open("river_final.png", "wb") as f:
            f.write(base64.b64decode(event.b64_json))
```

### 10. Streaming (curl / SSE)

```bash
curl -sS -N https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-1",
    "prompt": "A cute baby sea otter",
    "n": 1,
    "size": "1024x1024",
    "stream": true,
    "partial_images": 2
  }' --no-buffer
```

Events arrive as SSE:<sup>[2]</sup>

```
event: image_generation.partial_image
data: {"type":"image_generation.partial_image","b64_json":"...","partial_image_index":0}

event: image_generation.completed
data: {"type":"image_generation.completed","b64_json":"...","usage":{...}}
```

### 11. Edit via curl with multipart references

```bash
curl -sS -X POST "https://api.openai.com/v1/images/edits" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "model=gpt-image-1" \
  -F "image[]=@body-lotion.png" \
  -F "image[]=@bath-bomb.png" \
  -F "image[]=@incense-kit.png" \
  -F "image[]=@soap.png" \
  -F "prompt=Create a lovely gift basket with these four items in it" \
  | jq -r '.data[0].b64_json' | base64 --decode > basket.png
```

Verbatim from the Image API reference.<sup>[3]</sup>

### 12. Responses API — multi-turn iteration (Python, for context)

```python
from openai import OpenAI
import base64

client = OpenAI()

r1 = client.responses.create(
    model="gpt-5",
    input="Generate a minimal fox-head logo, flat vector, on transparent background.",
    tools=[{"type": "image_generation", "background": "transparent", "quality": "high"}],
)

# Save round 1
img1 = next(o.result for o in r1.output if o.type == "image_generation_call")
open("logo_v1.png", "wb").write(base64.b64decode(img1))

# Iterate without re-uploading the image
r2 = client.responses.create(
    model="gpt-5",
    previous_response_id=r1.id,
    input="Now make the fox ears slightly more angular and tighten the negative space.",
    tools=[{"type": "image_generation"}],
)
```

The Responses API keeps the image in context across turns; no re-upload is required.<sup>[1]</sup>

## Transparency: The One Feature That Matters Most for Asset Generation

Transparent-background support on `gpt-image-1` is the single biggest reason to pick it over the open-source diffusion stack for logo, icon, and UI-asset use cases. What the official docs specify:<sup>[1]</sup>

- Set `background="transparent"`.
- `output_format` must be `png` (default) or `webp`. JPEG does not support alpha and the API rejects the combination.
- Transparency is **emitted natively** as real alpha-channel pixels, not as a background-removal post-process; soft edges, anti-aliasing, and gradient fades are preserved.
- Quality `medium` or `high` is strongly recommended; at `low`, the model sometimes produces sub-par cutouts.<sup>[1]</sup>
- Mentioning "transparent background" in the prompt text itself will bias the model to emit transparency even when `background="auto"`, but using the explicit parameter is more reliable.<sup>[4]</sup>

### Known rough edges (community-reported)

Developer-community threads document two classes of issues worth budgeting for:

- **Edit endpoint is less reliable than generate** for transparent output. Users report that `/images/edits` with `background="transparent"` sometimes returns an opaque image with the subject on a "virtual transparent" pattern baked in. Workarounds: pass `background="transparent"` explicitly, use PNG output, and re-emphasize transparency in the prompt.<sup>[10]</sup>
- **"Remove the background" prompts can be over-aggressive**, cutting out legitimate white regions inside the subject (e.g. a white shirt turning transparent alongside the real background). Community consensus is to describe the subject positively ("render the subject only, with transparent pixels everywhere else") rather than using the phrasing "remove the background".<sup>[11]</sup>

**A note on misinformation:** several third-party SEO blogs still claim "gpt-image-1 uses DALL·E 3 and cannot produce true transparency, so you need a two-pass alpha-recovery trick." This is **incorrect for `gpt-image-1`** — the official API reference and cookbook both document native alpha output. The alpha-recovery trick is only relevant to DALL·E 3 itself and to ChatGPT's free-tier image generator when the developer lacks API access. Ignore those recommendations when building against the API directly.

## Moderation, Safety, and C2PA

- All generated images carry **C2PA provenance metadata** by default, identifying them as AI-generated.<sup>[6]</sup>
- The `moderation` parameter (`"auto"` | `"low"`) adjusts how strict the content-safety filter is; `"low"` is useful to reduce false-positive refusals on branding, commercial art, and figurative prompts, but both settings apply the core Usage Policies (no CSAM, no non-consensual intimate imagery, no likeness abuse, etc.).<sup>[1][6]</sup>
- Per OpenAI's policy page, **customer API data is not used for training by default**.<sup>[6]</sup>

## Limitations to Design Around

OpenAI's guide names four headline limitations:<sup>[1]</sup>

1. **Latency.** Complex prompts may take up to **2 minutes**. Budget generous client-side timeouts (default HTTP timeouts of 30–60s will fail). Streaming + partial images mitigates this for UX.
2. **Text rendering.** Much better than DALL·E 3 but still imperfect — precise typography, long paragraphs, and arbitrary scripts are still risky for brand-critical output. For logo work, consider rendering typography separately in code and compositing.
3. **Visual consistency.** Recurring characters or brand elements drift across calls. Use `input_fidelity="high"` with reference images to re-anchor consistency.
4. **Composition control.** Precise layout/placement instructions are still probabilistic. The community convention is to describe layouts semantically ("logo centered, small tagline below") rather than in pixel-precise terms.

Additional practical gotchas documented across sources:

- **No URL response for GPT Image models** — only `b64_json`. Large `n` values multiply response-payload size accordingly.<sup>[2]</sup>
- **No arbitrary output sizes.** Only the three documented sizes. Resize/crop client-side for anything non-square/2:3/3:2.<sup>[1]</sup>
- **Mask works on the first image only** when multiple inputs are supplied.<sup>[1][3]</sup>
- **`response_format` is ignored** for GPT Image models (legacy DALL·E knob).<sup>[2]</sup>

## Integration Points for the Prompt-Enhancer

For a prompt-to-asset whose downstream generator is `gpt-image-1`, the key surface-area wins are:

1. **Always set `background="transparent"` + `output_format="png"` for logo/icon/favicon/sticker categories.** This is the single strongest quality lever and the primary user pain point. The enhancer should classify the target asset type and append these parameters accordingly, rather than leaving them at `auto`.
2. **Default `quality="medium"` except when user explicitly requests "final" or "hero"** (then `"high"`) — the 4× token cost jump from medium to high is rarely worth it for drafts.
3. **Prefer `/images/edits` + `input_fidelity="high"`** whenever the user has brand assets (logo PNG, product photo, face reference). This is the model's biggest differentiator over the DALL·E line and most open-source diffusion models.
4. **Treat 32,000-character prompts as usable.** Unlike DALL·E 3's 4,000-char ceiling, `gpt-image-1` has headroom for a full multi-paragraph structured prompt — composition, lighting, typography, negative constraints, brand-safe palette, and reference-image callouts can all live in one prompt without truncation.
5. **Handle the verification footgun in error messages.** Surface a specific "your organization needs verification at platform.openai.com/settings/organization/general" message on 403, rather than a generic permission error.

## Sources

1. **OpenAI — Image generation guide (gpt-image-1).** Authoritative docs for all parameters, limits, and customization options. <https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1>
2. **OpenAI API Reference — `POST /v1/images/generations`.** Exact request/response schemas, streaming event formats, and token-usage fields. <https://developers.openai.com/api/reference/resources/images/methods/generate/>
3. **OpenAI API Reference — `POST /v1/images/edits`.** Documents the 16-image cap, mask-on-first-image rule, `input_fidelity`, and multipart curl form. <https://developers.openai.com/api/reference/resources/images/methods/edit/>
4. **OpenAI Cookbook — Generate images with GPT Image (Apr 23 2025).** Canonical Python examples including transparent PNG and mask-with-alpha-channel recipe. <https://cookbook.openai.com/examples/generate_images_with_gpt_image>
5. **OpenAI Cookbook — Generate images with high input fidelity (Jul 17 2025).** Full worked examples of face preservation, logo/brand consistency, and multi-image composition. <https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity>
6. **OpenAI — Introducing our latest image generation model in the API (Apr 23 2025 announcement).** Source for pricing, per-image cost estimates, C2PA metadata, and verification pointer. <https://openai.com/index/image-generation-api/>
7. **GPT Image 1 Model page + tier guide.** Rate-limit tier table (TPM + IPM) and model metadata. <https://platform.openai.com/docs/models/gpt-image-1>
8. **OpenAI Help — API Organization Verification.** Procedure for unlocking `gpt-image-1` access; ~30 min propagation; common 403 causes. <https://help.openai.com/en/articles/10910291-api-organization-verification>
9. **Azure AI Foundry — Unveiling GPT-image-1.** Independent confirmation of capability list (text-to-image, image-to-image, text transformation, inpainting). <https://azure.microsoft.com/en-us/blog/unveiling-gpt-image-1-rising-to-new-heights-with-image-generation-in-azure-ai-foundry/>
10. **OpenAI Developer Community — Transparent backgrounds with Edit request.** Community-documented quirk where `/images/edits` is less reliable than `/images/generations` for transparent output; prompt-level workarounds. <https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577>
11. **OpenAI Developer Community — Transparency "Remove background" cuts out white spots.** Over-aggressive background-removal failure mode; positive-description workaround. <https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481>
12. **OpenAI Developer Community — New GPT Image Model in the API.** Announcement/feedback thread, source for tier access and real-world behavior reports. <https://community.openai.com/t/new-gpt-image-model-in-the-api/1239462>
