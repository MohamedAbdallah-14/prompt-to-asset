---
category: 05-openai-dalle-gpt-image
angle: 5c-workflows
angle_title: "OpenAI Cookbook & community recipes for software-asset workflows"
last_updated: 2026-04-19
research_value: high
tags:
  - openai-cookbook
  - gpt-image-1
  - gpt-image-1.5
  - dalle-3
  - asset-pipeline
  - responses-api
  - agents-sdk
  - rembg
  - og-images
  - app-icons
  - batch-api
  - multi-step-chain
primary_sources:
  - "OpenAI Cookbook — Generate images with GPT Image (Katia Gil Guzman, 2025-04-23) — https://cookbook.openai.com/examples/generate_images_with_gpt_image"
  - "OpenAI Cookbook — Generate images with high input fidelity (Katia Gil Guzman, 2025-07-17) — https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity"
  - "OpenAI Cookbook — gpt-image-1.5 Prompting Guide (Brundyn/Singh/Okcular, 2025-12-16) — https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide"
  - "OpenAI Cookbook — Image Evals for Image Generation and Editing — https://cookbook.openai.com/examples/multimodal/image_evals"
  - "OpenAI Cookbook — imagegen_evals harness — https://github.com/openai/openai-cookbook/tree/main/examples/evals/imagegen_evals"
  - "OpenAI Agents SDK — examples/tools/image_generator.py — https://github.com/openai/openai-agents-python/blob/main/examples/tools/image_generator.py"
  - "OpenAI — Image generation guide (platform docs) — https://platform.openai.com/docs/guides/image-generation"
  - "OpenAI — Image generation tool for the Responses API — https://platform.openai.com/docs/guides/tools-image-generation"
  - "betomoedano/snapai (React Native icon CLI, ~1.77k stars) — https://github.com/betomoedano/snapai"
  - "samzong/ai-icon-generator (Next.js icon generator, ~17 stars) — https://github.com/samzong/ai-icon-generator"
  - "danielgatis/rembg (background removal, ~22.5k stars) — https://github.com/danielgatis/rembg"
  - "peterzervas/gpt-image-1-demo (Python CLI) — https://github.com/peterzervas/gpt-image-1-demo"
  - "radekBednarik/gpt-image-model-cli-generator (TypeScript CLI) — https://github.com/radekBednarik/gpt-image-model-cli-generator"
  - "Coca-Cola 'Create Real Magic' case study — https://ljvisualstudio.com/2025/11/07/case-study-coca-colas-create-real-magic-generative-ai-meets-brand-creativity/"
---

# 5c — OpenAI Cookbook & Community Recipes for Software-Asset Workflows

## Executive Summary

The OpenAI Cookbook ships **three first-party notebooks** that, taken together, define the reference asset pipeline: the April 2025 "Generate images with GPT Image" walkthrough (transparent PNG + mask editing), the July 2025 "high input fidelity" edit notebook (logo/face preservation under edits), and the December 2025 `gpt-image-1.5` prompting guide (9 production use cases, ~28.5 KB of prompt patterns). Every production workflow you will see in the wild — icon CLIs, OG-image generators, product-photography pipelines, Figma plugins — is a remix of these three primitives plus `rembg` and the Responses API `image_generation` tool. [1][2][3][8]

- The cookbook codifies a **two-lever control model**: `quality` (low/medium/high/auto) trades latency for fidelity, `input_fidelity="high"` preserves logos/faces/text across edits at extra token cost. Every community tool exposes exactly these two knobs. [2][8]
- The canonical **transparent asset recipe** is: `model=gpt-image-1[.5]` + `output_format="png"` + `background="transparent"` (or just mention "transparent background" in the prompt — the model auto-sets the flag) + `quality="high"` or `"medium"`. Transparency below `medium` is unreliable. [1]
- **OpenAI Agents SDK** exposes `ImageGenerationTool` as a hosted tool for agentic workflows (`examples/tools/image_generator.py`), but the Image API direct path is cheaper and faster for batch asset generation because the Agents SDK pays a full LLM-turn tax on every call. [6][7]
- **Multi-step chains** (GPT-5 → prompt expansion → gpt-image-1.5 → rembg / Pillow → ICO/ICNS/favicon set) are the dominant production pattern. Reference implementations: `betomoedano/snapai` (~1.77k ⭐, last commit ~Apr 2026), `samzong/ai-icon-generator` (~17 ⭐, 2025-06), `peterzervas/gpt-image-1-demo` (Python), `radekBednarik/gpt-image-model-cli-generator` (TypeScript/Bun). [9][10][12][13]
- **Batch API** gives a **50% discount** and higher rate limits on `/v1/images/generations` with 24 h async SLA — the economical choice for brand-kit / icon-variation sweeps when real-time preview isn't needed. [17]
- **Production deployments** include Canva (Magic Studio / Magic Media uses `gpt-image-1-mini`), Figma (direct plugin + ChatGPT ↔ FigJam bridge), Coca-Cola's *Create Real Magic* (GPT-4 + DALL·E 2 originally; pipeline now running on successors), and Shopify's Magic Media (product-photography editor). The pattern is always "enterprise wraps OpenAI image API + brand-specific system prompt + domain post-processing." [14][15]
- **Text rendering is still the bottleneck.** DALL·E 3 is unusable for wordmarks; `gpt-image-1` is inconsistent; `gpt-image-1.5` (Dec 2025) is the first OpenAI model where the cookbook itself recommends putting exact copy in quotes inside the prompt for marketing creatives and expects verbatim output. [3]

## Recipe Catalog

The nine recipes below are the concrete workflows you can copy into a prompt-to-asset product today. Each has first-party or >20-star GitHub provenance.

### Recipe 1 — Transparent PNG asset (cookbook canonical)

**Source:** OpenAI Cookbook, *Generate images with GPT Image*, §"Transparent background". [1]

```python
from openai import OpenAI
import base64
from pathlib import Path

client = OpenAI()

result = client.images.generate(
    model="gpt-image-1",               # or "gpt-image-1.5"
    prompt=("generate a pixel-art style picture of a green bucket hat "
            "with a pink quill on a transparent background."),
    quality="high",                    # transparency unreliable below medium
    output_format="png",               # PNG or WEBP required for alpha
    size="1024x1024",
)
Path("hat.png").write_bytes(base64.b64decode(result.data[0].b64_json))
```

Katia Gil Guzman's note in the cookbook: *"if you include in your prompt that you want a transparent background, it will be set to `transparent` by default"* — the phrase-to-flag coupling is load-bearing and is the reason prompt-to-asset products can get transparent logos without exposing `background` in their UI. Setting `background="transparent"` explicitly is still more deterministic. [1]

### Recipe 2 — Cookbook logo pattern (`n=4` variation sweep)

**Source:** OpenAI Cookbook, *gpt-image-1.5 Prompting Guide*, §4.5 Logo Generation. [3]

```python
prompt = """
Create an original, non-infringing logo for a company called Field & Flour, a local bakery.
The logo should feel warm, simple, and timeless. Use clean, vector-like shapes, a strong
silhouette, and balanced negative space. Favor simplicity over detail so it reads clearly
at small and large sizes. Flat design, minimal strokes, no gradients unless essential.
Plain background. Deliver a single centered logo with generous padding. No watermark.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    n=4,                               # four variations in one call
)
for i, item in enumerate(result.data, start=1):
    Path(f"logo_{i}.png").write_bytes(base64.b64decode(item.b64_json))
```

Load-bearing tokens: "original, non-infringing" (steers away from memorized marks), brand voice adjectives *before* visual spec, "vector-like shapes" (closest `gpt-image-1.5` comes to vector output — still raster), "reads clearly at small and large sizes" (scalability cue). The `n` parameter is cheaper than N separate calls and actively encourages divergent silhouettes. [3]

### Recipe 3 — Brand-preserving hero banner (high input fidelity)

**Source:** OpenAI Cookbook, *Generate images with high input fidelity*, §Branding consistency. [2]

```python
def edit_with_fidelity(input_img, prompt):
    result = client.images.edit(
        model="gpt-image-1",
        image=input_img,
        prompt=prompt,
        input_fidelity="high",         # preserves logo geometry
        quality="high",
        output_format="jpeg",
    )
    return base64.b64decode(result.data[0].b64_json)

banner = edit_with_fidelity(
    open("brand_logo.png", "rb"),
    "Generate a beautiful, modern hero banner featuring this logo "
    "in the center. Futuristic look, blue & violet hues, 1536x1024.",
)
Path("hero_banner.jpg").write_bytes(banner)
```

Cookbook-reported caveats: (a) `input_fidelity="high"` consumes more input tokens; (b) only the **first** image in a multi-image `image=[...]` list gets the extra texture-richness treatment, so always put the logo / face first when compositing. [2]

### Recipe 4 — Logo-in-mockup composition (multi-image reference)

**Source:** OpenAI Cookbook, *Generate images with high input fidelity*, §Mockups. [2]

```python
logo_bytes = open("imgs/logo.png", "rb")
mockup = client.images.edit(
    model="gpt-image-1",
    image=logo_bytes,
    prompt=("Generate a highly realistic picture of a hand holding a tilted "
            "iphone, with an app on the screen that showcases this logo in "
            "the center with a loading animation below"),
    input_fidelity="high",
    quality="high",
)
```

Used in the cookbook to produce on-brand mockups without Photoshop. The same pattern powers the Figma and Canva integrations (logo uploaded as the first input; instructions describe the surrounding scene). [15]

### Recipe 5 — Transparent product extraction for catalogs

**Source:** OpenAI Cookbook, *gpt-image-1.5 Prompting Guide*, §5.4 Product Mockups. [3]

```python
prompt = """
Extract the product from the input image.
Output: transparent background (RGBA PNG), crisp silhouette, no halos/fringing.
Preserve product geometry and label legibility exactly.
Optional: subtle, realistic contact shadow in the alpha (no hard cut line).
Do not restyle the product; only remove background and lightly polish.
"""

result = client.images.edit(
    model="gpt-image-1.5",
    image=[open("shampoo.png", "rb")],
    prompt=prompt,
)
```

This is the cookbook's explicit answer to the *"checkered box / halo / weird RGB fringe"* failure mode users hit with Gemini and older DALL·E 3 workflows. The phrase **"RGBA PNG"** + **"no halos/fringing"** + **"crisp silhouette"** is load-bearing and should be recycled verbatim in prompt-to-asset output for any transparency task. [3]

### Recipe 6 — Marketing / OG banner with literal in-image text

**Source:** OpenAI Cookbook, *gpt-image-1.5 Prompting Guide*, §5.5 Marketing Creatives with Real Text In-Image. [3]

```python
prompt = """
Create a realistic billboard mockup of the shampoo on a highway scene during sunset.
Billboard text (EXACT, verbatim, no extra characters):
"Fresh and clean"
Typography: bold sans-serif, high contrast, centered, clean kerning.
Ensure text appears once and is perfectly legible.
No watermarks, no logos.
"""
result = client.images.edit(
    model="gpt-image-1.5",
    image=[open("shampoo.png", "rb")],
    prompt=prompt,
)
```

Three non-obvious cookbook rules baked into this: (1) wrap literal text in double quotes; (2) add **"(EXACT, verbatim, no extra characters)"** as an instruction — this is the officially recommended incantation; (3) explicitly say **"Ensure text appears once"** because without it the model tends to duplicate the phrase in a watermark position. [3]

### Recipe 7 — Batch brand-kit generation via Batch API (50 % cheaper)

**Source:** OpenAI Cookbook, *Batch processing with the Batch API*; OpenAI docs on `gpt-image-1[.5]` batch support. [3][17]

```python
import json
from openai import OpenAI
client = OpenAI()

requests = []
for variant in ["flat", "3d", "outlined", "gradient"]:
    requests.append({
        "custom_id": f"icon-{variant}",
        "method": "POST",
        "url": "/v1/images/generations",
        "body": {
            "model": "gpt-image-1.5",
            "prompt": f"A finance app icon, shield + checkmark, {variant} style, "
                      "fill the frame, transparent background.",
            "size": "1024x1024",
            "quality": "high",
            "output_format": "png",
            "background": "transparent",
        },
    })

with open("batch.jsonl", "w") as f:
    for r in requests:
        f.write(json.dumps(r) + "\n")

f = client.files.create(file=open("batch.jsonl","rb"), purpose="batch")
job = client.batches.create(input_file_id=f.id,
                            endpoint="/v1/images/generations",
                            completion_window="24h")
```

Docs on the `gpt-image-1` and `gpt-image-1.5` model pages explicitly list `v1/batch` support; the Batch API gives ~50 % discount and higher rate limits with a 24-hour SLA. For generating a brand-kit style sweep (flat × 3D × outlined × gradient × color variants), this is the correct path. [17]

### Recipe 8 — Streaming partial previews (Responses API)

**Source:** OpenAI Platform docs — Image generation tool for Responses API. [5][16]

```python
response = client.responses.create(
    model="gpt-5",
    input="A minimalist weather app icon, sun + cloud, flat gradient.",
    tools=[{
        "type": "image_generation",
        "quality": "high",
        "size": "1024x1024",
        "background": "transparent",
        "output_format": "png",
        "partial_images": 3,           # 0..3 partial previews
    }],
    stream=True,
)

for event in response:
    if event.type == "response.image_generation_call.partial_image":
        Path(f"partial_{event.partial_image_index}.png").write_bytes(
            base64.b64decode(event.b64_json)
        )
```

Why this matters for a prompt-to-asset UI: users perceive gpt-image generation as slow (10–30 s at `high`). Streaming 1–3 partial PNGs lets the UI show progress and lets the user cancel off-target results before paying for the full resolution render. Note: you may receive **fewer** partials than requested if the final image finishes quickly. [5][16]

### Recipe 9 — Agents-SDK asset tool (multi-step workflow agent)

**Source:** `openai/openai-agents-python` — `examples/tools/image_generator.py`. [6]

```python
from agents import Agent, Runner
from agents.tools import ImageGenerationTool
import base64, tempfile, asyncio

agent = Agent(
    name="Asset generator",
    instructions=(
        "Always use the image generation tool when the user asks for a new "
        "asset. Prefer transparent PNG for logos/icons. Use quality='high' "
        "for production assets, 'low' for drafts."
    ),
    tools=[ImageGenerationTool(
        tool_config={"type": "image_generation",
                     "quality": "high",
                     "background": "transparent",
                     "output_format": "png"}
    )],
)

async def main():
    result = await Runner.run(
        agent,
        "Create a minimalist logo for 'Glass' — a Gen-Z music app.",
    )
    for item in result.new_items:
        if getattr(item, "type", "") == "tool_call_item" and \
           getattr(item.raw, "type", "") == "image_generation_call":
            img = base64.b64decode(item.raw.result)
            p = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            p.write(img); p.close()
            print("saved:", p.name)

asyncio.run(main())
```

Use when the asset step is one tool call inside a larger agent (e.g., *"draft a landing page → generate OG image → write meta tags"*). The cost model is: one LLM turn per asset **plus** the gpt-image generation cost — the Image API direct path is cheaper if the agent tax isn't buying you anything. [6][7]

### Recipe 10 — Full multi-step app-icon chain (SnapAI pattern)

**Source:** `betomoedano/snapai` (~1.77k ⭐, MIT, TypeScript 95 %, last release `v0.x` in 2026). [9][11]

The pipeline SnapAI ships in production:

1. **Intake**: user passes `--prompt "minimalist weather app with sun and cloud"`.
2. **Sanitization**: CLI strips the words *"icon"* and *"logo"* unless `--use-icon-words` is set, because those tokens cause gpt-image-1 to add excessive padding. (This is an empirically-derived SnapAI rule — not documented by OpenAI but widely reproduced.)
3. **Style injection**: style preset appended — `minimalism`, `material`, `pixel`, `kawaii`, `cute`, `glassy`, `neon`.
4. **Generation**: `client.images.generate(model=<gpt-image-1 | gpt-image-1.5>, size="1024x1024", quality=<low|medium|high|auto>)`. Alternative backend: Gemini Nano Banana Pro at `1k/2k/4k`.
5. **Post-processing** (optional): background removal via `rembg`/Pillow; export PNG + ICO + ICNS for Expo/React Native projects.

Minimal reconstruction in Python (what a prompt-to-asset product would implement server-side):

```python
def build_icon_prompt(user_text: str, style: str = "minimalism") -> str:
    sanitized = user_text.replace(" icon", "").replace(" logo", "")
    style_map = {
        "minimalism": "ultra-minimalist flat vector, Swiss modernist, single stroke weight",
        "material":   "Material Design 3 style, soft shadow, subtle depth, vibrant palette",
        "glassy":     "frosted glass, translucent layers, soft gradient, SF-style aesthetic",
        "neon":       "neon glow, dark background, saturated magenta/cyan",
    }
    return (f"A {sanitized} app asset, {style_map[style]}, "
            "fill the frame, centered composition, "
            "no border, no padding, no text, no watermark, "
            "transparent background.")

def generate_icon(user_text: str, style: str = "minimalism") -> bytes:
    prompt = build_icon_prompt(user_text, style)
    res = client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt,
        size="1024x1024",
        quality="high",
        output_format="png",
        background="transparent",
    )
    png = base64.b64decode(res.data[0].b64_json)

    # Safety-net background removal (handles residual halos).
    from rembg import remove
    return remove(png)
```

Two SnapAI rules of thumb worth stealing verbatim: [9]

- *"If you see excessive empty border space, add `'fill the frame'` explicitly."*
- *"Describe the product first, then the style."* — e.g. `"a finance app, shield + checkmark, modern, clean gradients"`, not `"modern clean finance icon"`.

## Integration Patterns

### Pattern A — `gpt-image-1.5` as pure asset service

Direct `client.images.generate` / `client.images.edit` with no agent layer. Cheapest, fastest for one-shot logos, icons, OG banners. This is what SnapAI, `samzong/ai-icon-generator`, `peterzervas/gpt-image-1-demo`, and `radekBednarik/gpt-image-model-cli-generator` all use under the hood. [9][10][12][13]

### Pattern B — GPT-4o / GPT-5 → gpt-image-1.5 (two-stage prompt expansion)

User types *"transparent logo for my note-taking app"*. An LLM front-end expands that into a full cookbook-style prompt (brand voice adjectives → visual spec → constraints → negative list), then calls `gpt-image-1.5`. This is the pattern implicit in OpenAI's own "revised_prompt" pipeline for DALL·E 3, but here *you control the rewriter* — the model you're calling (`gpt-image-1.5`) does not re-rewrite in the Image API path, only in Responses/ChatGPT. [4][5]

Skeleton:

```python
def expand(user: str) -> str:
    sys = ("You are a prompt engineer for gpt-image-1.5. Given a short asset "
           "request, produce a single paragraph following the order: "
           "background/scene → subject → key details → constraints. "
           "Prefer short labeled sections. End with a negative list: "
           "'No watermark, no extra text, no logos/trademarks.'")
    return client.chat.completions.create(
        model="gpt-5",
        messages=[{"role":"system","content":sys},
                  {"role":"user","content":user}],
    ).choices[0].message.content

def render(user: str):
    full = expand(user)
    return client.images.generate(model="gpt-image-1.5", prompt=full,
                                  size="1024x1024", quality="high",
                                  output_format="png",
                                  background="transparent")
```

### Pattern C — Responses API with `image_generation` tool

Use when the asset is one step in a conversational UX. The Responses API wraps the Image API as a hosted tool and automatically handles prompt revision. Supports streaming partial previews (0–3). Trade-off: adds one LLM turn of latency + cost. [5][16]

### Pattern D — Post-processing pipeline

`gpt-image-1.5` → `rembg` (~22.5k ⭐, CPU/GPU/ROCm backends, `u2net` / `u2netp` / `isnet-general-use` / `birefnet` models) → Pillow (resize/ICO/ICNS/favicon set) → optimized PNG via `oxipng` or `pngquant`. [11]

```python
from rembg import remove, new_session
from PIL import Image
from io import BytesIO

raw = generate_icon("weather app")                      # step 1
clean = remove(raw, session=new_session("birefnet"))    # step 2 (safety net)
img = Image.open(BytesIO(clean))

for size in (16, 32, 48, 64, 128, 180, 192, 256, 512):  # step 3
    img.resize((size, size), Image.LANCZOS).save(f"icon_{size}.png",
                                                 optimize=True)
img.save("favicon.ico", sizes=[(16,16),(32,32),(48,48)])  # step 4
```

### Pattern E — Batch brand kit

Single Batch API job = 8–32 variants × styles × colors, written to JSONL, submitted with `completion_window="24h"`. Best economics for full identity systems (logo × favicon × OG image × app-icon-iOS × app-icon-Android × splash × social profile). Batch API pricing: ~50 % off `/v1/images/generations` list price. [17]

## Gotchas

- **Transparency below `quality="medium"` is lottery.** Cookbook says "best at `medium` or `high`." Below that you get residual white / checker fringes — the exact pain point that sent users here in the first place. Pipe through `rembg` as a safety net. [1]
- **Only three output sizes.** `1024x1024`, `1536x1024`, `1024x1536`. No favicon-native output — you generate at 1024² and downscale with Lanczos. [4]
- **Don't say "icon" or "logo" if you want a full-bleed asset.** Empirical SnapAI rule: gpt-image-1 interprets those tokens as "draw a tiny icon on a giant blank card," producing excessive padding. Use `"fill the frame"` or describe the subject directly. [9]
- **First input image wins multi-image edits.** In `client.images.edit(image=[...])`, only image index 0 gets the extra texture / identity preservation under `input_fidelity="high"`. Always put the logo / face first. [2]
- **Apple iOS icons want full-bleed opaque square.** Do *not* ask for rounded corners or alpha — Apple applies its own squircle mask and rejects alpha-channel app icons. Generate 1024² opaque and let iOS do the masking. [3]
- **Agents-SDK `ImageGenerationTool` pays a full LLM turn tax.** For pure asset endpoints (no conversation), go direct to `/v1/images/generations`; it's cheaper and lower-latency. [6][7]
- **Text rendering reliability order:** `gpt-image-1.5` ≫ `gpt-image-1` ≫ DALL·E 3. DALL·E 3 is deprecated in the Image API on 2026-05-12. [3]
- **DALL·E 3's `revised_prompt` cannot be disabled.** The only way to minimize rewriter drift is to submit a pre-specified prompt so detailed that there's nothing to add. This does **not** affect `gpt-image-1` / `gpt-image-1.5` when called via `/v1/images/generations` directly — those models don't auto-rewrite in the Image API, only in Responses/ChatGPT. [4]
- **Org verification wall.** `gpt-image-1` requires API organization verification (government ID for the org owner) before first call. Plan for this in product onboarding. [8]
- **Batch API + partial_images do not mix.** Batch jobs are not streamable. Pick one or the other per use case. [17]
- **`input_fidelity="high"` costs real money.** ~2–3× the input-token cost of default. Use it for logos and faces, not for hero generations from text. [2]

## References

1. OpenAI Cookbook, *Generate images with GPT Image* (Katia Gil Guzman, 2025-04-23). https://cookbook.openai.com/examples/generate_images_with_gpt_image — notebook: https://github.com/openai/openai-cookbook/blob/main/examples/Generate_Images_With_GPT_Image.ipynb
2. OpenAI Cookbook, *Generate images with high input fidelity* (Katia Gil Guzman, 2025-07-17). https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity
3. OpenAI Cookbook, *gpt-image-1.5 Prompting Guide* (Annika Brundyn, Mandeep Singh, Emre Okcular, 2025-12-16). https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide — notebook: https://github.com/openai/openai-cookbook/blob/main/examples/multimodal/image-gen-1.5-prompting_guide.ipynb
4. OpenAI Cookbook, *What's new with DALL·E 3*. https://developers.openai.com/cookbook/articles/what_is_new_with_dalle_3/
5. OpenAI Platform, *Image generation tool (Responses API)*. https://platform.openai.com/docs/guides/tools-image-generation
6. OpenAI Agents SDK (Python), *examples/tools/image_generator.py*. https://github.com/openai/openai-agents-python/blob/main/examples/tools/image_generator.py
7. OpenAI Agents SDK (JavaScript), *imageGenerationTool*. https://openai.github.io/openai-agents-js/openai/agents-openai/functions/imagegenerationtool/
8. OpenAI Platform, *Image generation guide*. https://platform.openai.com/docs/guides/image-generation
9. `betomoedano/snapai` — React Native / Expo icon CLI, ~1,773 ⭐, MIT, TypeScript 95.2 %, actively maintained (2025–2026). https://github.com/betomoedano/snapai
10. `samzong/ai-icon-generator` — Next.js 15 + gpt-image-1 web UI, ~17 ⭐, 2025-06, MIT. https://github.com/samzong/ai-icon-generator
11. `danielgatis/rembg` — background removal, ~22,481 ⭐, 80 contributors, Python ≥ 3.11. https://github.com/danielgatis/rembg
12. `peterzervas/gpt-image-1-demo` — Python CLI supporting `gpt-image-1`, DALL·E 3, DALL·E 2. https://github.com/peterzervas/gpt-image-1-demo
13. `radekBednarik/gpt-image-model-cli-generator` — TypeScript/Bun CLI client for `gpt-image-1`. https://github.com/radekBednarik/gpt-image-model-cli-generator
14. *Figma integrations with gpt-image-1-mini* (eesel AI, 2025). https://www.eesel.ai/blog/figma-integrations-with-gpt-image-1-mini
15. *Canva integrations with GPT-Image-1-Mini* (eesel AI, 2025) — Magic Studio, Magic Media, Dream Lab, Magic Edit. https://www.eesel.ai/blog/canva-integrations-with-gpt-image-1-mini
16. OpenAI API Reference, *Image generation streaming events*. https://developers.openai.com/api/reference/resources/images/generation-streaming-events/
17. OpenAI Cookbook, *Batch processing with the Batch API*. https://developers.openai.com/cookbook/examples/batch_processing/
18. OpenAI Cookbook, *Image Evals for Image Generation and Editing Use Cases*. https://cookbook.openai.com/examples/multimodal/image_evals — harness: https://github.com/openai/openai-cookbook/tree/main/examples/evals/imagegen_evals
19. LJ Visual Studio, *Case Study: Coca-Cola's "Create Real Magic" — Generative AI Meets Brand Creativity* (2025-11-07). https://ljvisualstudio.com/2025/11/07/case-study-coca-colas-create-real-magic-generative-ai-meets-brand-creativity/
20. The Verge, *Shopify's 'Magic' AI image editor*. https://www.theverge.com/24056980/shopify-generative-ai-image-editing-search
