---
category: 07-midjourney-ideogram-recraft
angle: 7e
title: "Real Asset Workflows Across Commercial Tools: End-to-End Recipes for Logos, App Icons, OG Images, and Hero Illustrations"
agent_id: 7e
date: 2026-04-19
tags:
  - midjourney
  - ideogram
  - recraft
  - flux
  - gpt-image-1
  - bria-rmbg
  - vtracer
  - illustrator
  - affinity
  - figma
  - pipeline
  - orchestration
  - logos
  - app-icons
  - og-images
  - hero-illustrations
summary: >-
  Production recipes that chain concept generation (Midjourney v7, Flux Pro,
  gpt-image-1), text rendering (Ideogram v3), vector output (Recraft V4/V3,
  vtracer, potrace), matting (BRIA RMBG 2.0), and editor polish (Illustrator,
  Affinity, Figma) into cohesive asset pipelines. Includes cost/time analysis,
  a tool-strengths matrix, and API-orchestrated automation examples.
word_count_target: 2000-3500
---

# Real Asset Workflows Across Commercial Tools

## Executive Summary

> **Updated 2026-04-21:** Midjourney V8 Alpha (Mar 2026) improves speed and text rendering but remains API-less. Recraft V4 (Feb 2026) does not support `style_id` — use V3 for brand-consistent pipelines. Krea Edit launched March 2026 with regional editing. Firefly Image 5 is in Photoshop Beta as of March 2026.

Professional designers and automated asset pipelines rarely rely on a single
model. Every commercial T2I tool has a "sweet spot" — Midjourney v7/v8 for
aesthetic concept boards, Ideogram v3 for legible typography, Recraft V3 for
native SVG, `gpt-image-1` for transparent raster icons that respect instructions,
Flux Pro for photoreal hero art, BRIA RMBG 2.0 for alpha matting, and vtracer
for fast color vectorization. The best workflows string these strengths together
and leave final polish to a vector editor (Illustrator, Affinity Designer, or
Figma).

This research documents five end-to-end recipes used in 2024–2026 designer
pipelines, compares cost/time/quality tradeoffs, and shows code patterns for
orchestrating them in production. The dominant pattern is a three-stage pipeline:
**concept → clean → vector**. Concept models (MJ, Flux) maximize visual quality
but output raster with imperfect text and noisy backgrounds. Cleaning tools
(RMBG, Photoshop Select Subject, gpt-image-1 inpaint) isolate the subject.
Vectorizers (Recraft vectorize, vtracer, Illustrator Image Trace) produce
scalable SVG that designers finish in their editor of choice.

## Top-Line Findings

1. **Ideogram owns text; Recraft owns vector; Midjourney owns aesthetic.**
   The cheapest win in any brand pipeline is to stop asking one model to do all
   three. Generate the mark in MJ, the wordmark in Ideogram v3, vectorize in
   Recraft, and composite in Illustrator or Figma.
2. **vtracer + BRIA RMBG is the modern open-source pair** that replaces the old
   "potrace on a thresholded PNG" flow. vtracer is O(n) vs. potrace's O(n²),
   handles color natively, and BRIA's 256-level alpha matte beats binary masks
   for clean SVG edges.
3. **gpt-image-1's native `background: "transparent"` parameter** combined with
   Affinity Designer's Pixel Persona is now the fastest path from prompt to a
   complete app-icon set — roughly 30–45 minutes end to end vs. 3+ hours for
   the classic MJ → vectorizer.ai → Illustrator route.

## Workflow Playbook

### Recipe 1 — MJ v7 Concept → Ideogram Wordmark → Recraft Vector → Illustrator Cleanup (Premium Brand Logo)

**Use case:** Identity work for a client where aesthetic quality is the top
requirement and a budget of a few designer-hours is acceptable.

1. **Concept in Midjourney v7.** Generate 8–16 mark variations with a
   vector-friendly prompt: `minimal geometric mark, single-color, flat vector
   style, black on white, high contrast, centered on white background
   --style raw --ar 1:1 --v 7`. Pick the winner, then use `--oref` (Omni
   Reference) to lock the shape while re-rolling for texture and color
   exploration.
2. **Wordmark in Ideogram v3 Quality.** Ideogram is best-in-class at rendering
   specific typography. Prompt with the text in double quotes and an explicit
   font family: `A wordmark "Morning Brew" in clean geometric sans-serif,
   tight letter spacing, black on white, centered, vector style`.
3. **Vectorize in Recraft.** Upload both PNGs to Recraft Studio and run the
   "Vectorize" tool (`$0.01 per request` via API) with Color Reduction set to
   1–3 colors. Recraft outputs editable SVG.
4. **Finish in Illustrator.** Import both SVGs, use Pathfinder to merge
   overlapping shapes, tidy anchor points with Object → Path → Simplify, build
   the lockup (horizontal, stacked, icon-only), and export the brand-safe
   master file plus PNG/WebP/ICO derivatives.

Typical cost: MJ Standard share (~$0.03/image × 16) + Ideogram v3 ($0.08/image × 4)
+ Recraft vectorize ($0.01 × 2) ≈ **$0.85 of compute** plus 90–120 minutes of
designer time. Quality ceiling is the highest of any recipe here because human
judgment lives at the merge step.

### Recipe 2 — Flux Pro → BRIA RMBG 2.0 → vtracer → Figma (Open-Source Hero Illustration)

**Use case:** Hero illustrations for a marketing page, where you want control
over the stack, no per-seat design tool license, and the option to self-host.

1. **Generate in Flux.1 [pro] via fal.ai or Replicate.** Flux is the strongest
   open-weights concept model as of 2026 for hero art. Prompt with explicit
   background control: `an isometric illustration of a developer at a desk,
   clean flat vector style, pastel palette, isolated on pure white
   background, no shadow, no ground plane`. Request a 2048×1152 output.
2. **Remove background with BRIA RMBG 2.0.** BRIA produces a 256-level alpha
   matte (not binary), which preserves hair, antialiased edges, and soft
   shadows for natural edges. Call `POST /remove_background` on Bria's API,
   Segmind ($0.018/call), fal.ai, or Replicate.
3. **Vectorize with vtracer.** vtracer is a Rust CLI (`cargo install vtracer`)
   that handles full color with O(n) complexity:
   `vtracer --input flux_cutout.png --output hero.svg --preset poster
   --color_precision 6 --filter_speckle 4 --gradient_step 10 --mode spline`.
   For flatter art, swap to `--preset bw` or `--colormode bw`.
4. **Import into Figma** via drag-drop or the SVG importer, flatten if needed
   (`Object → Flatten` binds outlines), and snap to your frame grid. Bind the
   node to a component for reuse across the design system.

Typical cost: Flux Pro (~$0.05/image × 4 concepts) + BRIA RMBG ($0.018 × 1) ≈
**$0.22 of compute**, plus 15–25 minutes of human selection and layout.
Quality is strong for illustration but weaker than MJ for dense editorial art.

### Recipe 3 — gpt-image-1 Transparent → Affinity Designer Polish → Export Platform Icon Set

**Use case:** Producing a full iOS/Android/macOS/web icon set from a single
concept, with platform masks and safe areas.

1. **Generate transparent raster in gpt-image-1.** Call `images.generate` with
   `background: "transparent"`, `output_format: "png"`, `size: "1024x1024"`,
   and an explicit prompt: `a friendly cartoon owl mascot facing forward,
   flat vector style, bold simple shapes, solid colors, centered, on a
   transparent background`. `gpt-image-1` is currently the model most reliably
   produces true RGBA (no "checker box" artifact that Gemini Nano Banana and
   older SD variants leak).
2. **Polish in Affinity Designer 2.** Drop the PNG into the Pixel Persona,
   use Select Subject for any stray edge pixels, then either (a) trace to
   curves with Layer → Convert to Curves, or (b) keep it raster and rely on
   4K masters. Set up an Export Persona slice grid for every required size
   (iOS: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024; Android:
   48, 72, 96, 144, 192, 512 for adaptive foreground + separate background).
3. **Apply platform masks.** iOS squircle is applied automatically on device,
   but you must stay inside Apple's HIG 824×824 safe zone within the 1024
   canvas. Android adaptive icons need a 108×108 dp foreground with a 72×72
   dp safe zone. Affinity's guides + per-slice export handle both.
4. **Batch export** via File → Export Persona → Export Slices.

Typical cost: `gpt-image-1` at ~$0.19 for a HD 1024×1024 image × 6 concepts
≈ **$1.14 of compute**, plus 20–30 minutes in Affinity. Fastest route from
idea to complete icon set. Quality is mid-high — the raster master is the
ceiling.

### Recipe 4 — MJ v7 + Recraft Restyle → Brand-Consistent Illustration Library

**Use case:** Onboarding / empty-state / marketing illustration set (10–40
images) that must look like one hand drew them.

1. **Establish a style seed.** Generate one hero illustration in MJ v7 with
   explicit style language: `flat vector illustration, 3-color palette
   (#0EA5E9, #F97316, #FAFAFA), rounded line weights, friendly geometric
   shapes, negative space, no gradients --v 7 --style raw`.
2. **Lock the style.** Run `--sref <image-url>` (V7's updated Style Reference)
   on every downstream prompt, varying only the subject: `a person climbing a
   staircase --sref 2272801577 --sw 300 --v 7`. V7's sref rewrite dramatically
   reduced subject leakage that plagued v6, making this viable at scale.
3. **Recraft restyle pass.** For final cohesion, send each MJ output through
   Recraft's "Style Transfer" with a single curated palette style. This
   normalizes color and line weight across the library.
4. **Vectorize + Figma variants.** Batch-vectorize through Recraft API and
   publish as Figma components; each illustration becomes a variant of a
   single master component. Ship through a Figma library so product designers
   can swap illustrations without new prompts.

Typical cost: MJ Standard (flat $30/mo covers ~900 images), Recraft restyle
(~$0.04/image × 40) ≈ **$1.60 plus subscription**, and 2–3 hours of designer
curation. Lowest per-image cost at volume.

### Recipe 5 — Claude/Codex Orchestrated OG Image Factory

**Use case:** Auto-generating open-graph and social cards for every blog post
in a content pipeline.

1. **Split the problem.** Programmatic text layers (title, author, date) are
   rendered with Satori (via `nuxt-og-image` or `@vercel/og`) — pixel-perfect,
   cheap, free. AI-generated art is treated as a *background*.
2. **Generate the background.** Use Gemini 3 Pro Image or gpt-image-1 with a
   structured prompt derived from the article's title/category: `editorial
   hero illustration, subtle abstract geometry, category-accent palette
   (#334155 cool), textured grain, 1200x630, no text, wide composition`.
3. **Compose with ImageMagick / Sharp.** In an n8n or GitHub Actions job,
   composite the Satori SVG on top of the AI background, export 1200×630 for
   OG, 1200×600 for Twitter, 1200×627 for LinkedIn.
4. **Cache and serve** via Cloudflare CDN. OGImagen and OGForge are commercial
   off-the-shelf versions of exactly this pipeline; building in-house keeps
   full prompt control.

Typical cost: $0.02–$0.04 per post; ≤5 seconds wall time; fully agent-driven
once wired up.

## Tool Strengths Matrix

| Stage       | Best-in-class (2026)             | Runner-up                   | Avoid for this stage |
|-------------|----------------------------------|------------------------------|----------------------|
| Concept art | Midjourney v7                    | Flux.1 [pro]                 | Recraft (weaker aesthetic) |
| Text/wordmark | Ideogram v3 Quality            | `gpt-image-1`, Recraft V3    | Midjourney (still unreliable at paragraph-level text) |
| True transparency (RGBA) | `gpt-image-1` `background:"transparent"` | BRIA RMBG 2.0 post-pass | Gemini 2.5 Flash Image (checker artifact), SDXL defaults |
| Native vector output | Recraft V3 Vector (brand-style pipelines) / V4 Vector (non-branded) | Recraft V2 Vector | MJ, Flux, gpt-image-1 (all raster-only) |
| Raster→vector post | vtracer (color) + potrace (B/W) | Illustrator Image Trace, vectorizer.ai | Unguided SD upscalers |
| Background removal | BRIA RMBG 2.0                 | U²-Net / BiRefNet (open), Photoshop Select Subject | Hand lasso (time) |
| Style consistency across batches | MJ v7 `--sref` + Recraft Style Transfer | IP-Adapter / LoRA (SD/Flux) | Single-shot prompts |
| Final polish | Illustrator (vector-heavy), Affinity Designer (solo designer), Figma (product teams) | Inkscape (open-source) | Photoshop for vector work |

## Cost / Time / Quality Analysis

Single-asset indicative numbers (USD, 2026):

| Recipe | Compute cost | Human time | Quality ceiling | Repeatability |
|--------|--------------|------------|-----------------|---------------|
| 1 · MJ → Ideogram → Recraft → AI | ~$0.85 | 90–120 min | Very high | Medium (human in loop) |
| 2 · Flux → BRIA → vtracer → Figma | ~$0.22 | 15–25 min | High | High (fully scriptable) |
| 3 · gpt-image-1 → Affinity icon set | ~$1.14 | 20–30 min | Medium-high | High |
| 4 · MJ sref illustration library | ~$1.60 + sub | 2–3 h (40 images) | High, very consistent | Very high (sref locks style) |
| 5 · OG-image factory | ~$0.02–0.04 | 0 min (automated) | Medium | Highest (CI/CD) |

Key observations:

- **MJ's monthly subscription amortizes beautifully at volume** but is the
  worst option if you need one asset per month or must stay in a cloud
  contract without Discord/web login.
- **gpt-image-1's per-image cost ($0.019 low / $0.076 med / $0.19 high)** is
  the most predictable for enterprise procurement, and its `transparent`
  parameter removes an entire post-processing hop.
- **Recraft's vectorize endpoint ($0.01/call)** is almost free — the bottleneck
  is the upstream concept generation, not the vectorization itself.
- **vtracer is free and local**; for self-hosted pipelines it's the single
  biggest cost saver vs. vectorizer.ai ($10/mo) or Illustrator subscriptions.

## Automation Examples

### API-orchestrated MJ → Recraft → Illustrator-ready SVG (Python)

```python
import os, time, base64, requests
from pathlib import Path

MJ_ACTOR   = "igolaizola/midjourney-automation"   # Apify
APIFY_KEY  = os.environ["APIFY_TOKEN"]
RECRAFT    = "https://external.api.recraft.ai/v1"
RECRAFT_KEY = os.environ["RECRAFT_API_KEY"]

def mj_generate(prompt: str, n: int = 4) -> list[str]:
    run = requests.post(
        f"https://api.apify.com/v2/acts/{MJ_ACTOR}/runs?token={APIFY_KEY}",
        json={"prompts": [prompt], "upscaleAll": True},
    ).json()
    run_id = run["data"]["id"]
    while True:
        s = requests.get(f"https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_KEY}").json()
        if s["data"]["status"] in ("SUCCEEDED", "FAILED"):
            break
        time.sleep(10)
    items = requests.get(
        f"https://api.apify.com/v2/datasets/{s['data']['defaultDatasetId']}/items?token={APIFY_KEY}"
    ).json()
    return [it["imageUrl"] for it in items[:n]]

def recraft_vectorize(image_url: str) -> bytes:
    r = requests.post(
        f"{RECRAFT}/images/vectorize",
        headers={"Authorization": f"Bearer {RECRAFT_KEY}"},
        json={"image": image_url, "response_format": "b64_json"},
    ).json()
    return base64.b64decode(r["image"]["b64_json"])

def pipeline(brand_prompt: str, out_dir: str):
    Path(out_dir).mkdir(exist_ok=True)
    concepts = mj_generate(
        f"{brand_prompt}, minimal flat vector logo mark, black on white "
        f"--ar 1:1 --style raw --v 7"
    )
    for i, url in enumerate(concepts):
        svg = recraft_vectorize(url)
        Path(f"{out_dir}/concept-{i:02d}.svg").write_bytes(svg)

if __name__ == "__main__":
    pipeline("a note-taking app called Quill", "./out")
```

### Local Flux → BRIA → vtracer → SVG (Bash)

```bash
#!/usr/bin/env bash
set -euo pipefail

PROMPT="$1"
OUT="${2:-./out}"
mkdir -p "$OUT"

# 1. Generate via Replicate (Flux.1 [pro])
PNG=$(curl -s -X POST "https://api.replicate.com/v1/predictions" \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"version\":\"black-forest-labs/flux-pro\",
       \"input\":{\"prompt\":\"$PROMPT, isolated on white, no shadow\",
                  \"width\":2048,\"height\":2048}}" \
  | jq -r '.urls.get')

while true; do
  STATUS=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" "$PNG" | jq -r '.status')
  [[ "$STATUS" == "succeeded" ]] && break
  [[ "$STATUS" == "failed" ]] && { echo "Flux failed"; exit 1; }
  sleep 2
done
IMG=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" "$PNG" | jq -r '.output[0]')
curl -sSL "$IMG" -o "$OUT/raw.png"

# 2. Matte with BRIA RMBG 2.0 (Segmind)
curl -s -X POST "https://api.segmind.com/v1/bria-rmbg" \
  -H "x-api-key: $SEGMIND_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -i $OUT/raw.png)\"}" \
  -o "$OUT/cutout.png"

# 3. Vectorize with vtracer
vtracer \
  --input  "$OUT/cutout.png" \
  --output "$OUT/final.svg" \
  --preset poster \
  --mode spline \
  --color_precision 6 \
  --filter_speckle 4 \
  --gradient_step 10

echo "Wrote $OUT/final.svg"
```

### gpt-image-1 transparent icon set (Node)

```js
import OpenAI from "openai";
import sharp from "sharp";
import fs from "node:fs/promises";

const openai = new OpenAI();
const SIZES_IOS     = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
const SIZES_ANDROID = [48, 72, 96, 144, 192, 512];

async function generateIcon(prompt) {
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `${prompt}, flat vector style, bold simple shapes, centered, transparent background`,
    size: "1024x1024",
    background: "transparent",
    quality: "high",
  });
  return Buffer.from(res.data[0].b64_json, "base64");
}

async function exportPlatformSet(master, outDir) {
  await fs.mkdir(`${outDir}/ios`, { recursive: true });
  await fs.mkdir(`${outDir}/android`, { recursive: true });
  await Promise.all([
    ...SIZES_IOS.map((s) =>
      sharp(master).resize(s, s).toFile(`${outDir}/ios/icon-${s}.png`)
    ),
    ...SIZES_ANDROID.map((s) =>
      sharp(master).resize(s, s).toFile(`${outDir}/android/icon-${s}.png`)
    ),
  ]);
}

const master = await generateIcon("a friendly cartoon owl mascot");
await fs.writeFile("./out/master-1024.png", master);
await exportPlatformSet(master, "./out");
```

## Where Each Tool Sits in the Pipeline

- **Concept / aesthetic ceiling:** Midjourney v7 / v8 (when quality matters most; v8 Alpha on alpha.midjourney.com since Mar 2026),
  Flux.1 [pro] (when you need an API-native option).
- **Typography / in-image text:** Ideogram v3 Quality, with `gpt-image-1` as a
  strong runner-up for editorial/wordmark text.
- **True transparency:** `gpt-image-1` with `background:"transparent"`, or any
  concept model piped through BRIA RMBG 2.0.
- **Vector conversion:** Recraft V3 Vector (native, with `style_id` support) for logos and UI iconography requiring brand consistency; Recraft V4 Vector for non-branded SVG (no `style_id`);
  vtracer for self-hosted color vectorization; potrace only for pure B/W silhouettes.
- **Style consistency across batches:** MJ `--sref` (v7/v8), followed by
  Recraft V3 Style Transfer as a normalizer. Note: Recraft V4 does not support `style_id`.
- **Final polish and export:** Illustrator for brand work, Affinity Designer
  for solo designers shipping apps, Figma for product teams embedding assets
  into a design system.

## References

- Recraft — Vectorizing docs: https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing
- Recraft API pricing: https://www.recraft.ai/docs/api-reference/pricing
- Recraft blog — How to generate a logo: https://recraft.ai/blog/how-to-generate-a-logo-using-ai
- Ideogram v3 in Recraft Studio: https://www.recraft.ai/ai-models/ideogram
- Ideogram V3 Quality in Recraft: https://www.recraft.ai/ai-models/ideogram-v3-quality
- Ideogram AI Tutorial — Logos with text: https://aiweiweiseeds.com/blog/ai-art/ideogram-ai-tutorial
- Midjourney V7 logo workflow (YouTube): https://www.youtube.com/watch?v=d8lzLjZmre4
- Midjourney V7 Sref overview: https://medium.com/creativity-ai/midjourney-complete-overview-of-the-updated-style-references-sref-feature-in-v7-c72a494a7111
- Midjourney Style Reference docs: https://docs.midjourney.com/docs/style-reference
- Midjourney Sref codes library: https://srefcodes.com/
- Midjourney pricing: https://docs.midjourney.com/docs/en/plans
- Apify Midjourney Automation actor: https://apify.com/igolaizola/midjourney-automation
- BRIA RMBG 2.0 on GitHub: https://github.com/Bria-AI/RMBG-2.0
- BRIA remove-background API: https://docs.bria.ai/image-editing/v2-endpoints/background-remove
- Segmind BRIA RMBG 2.0 serverless: https://www.segmind.com/models/bria-remove-background
- vtracer (Vision Cortex): https://github.com/visioncortex/vtracer/
- VTracer docs: https://www.visioncortex.org/vtracer-docs
- VTracer comparison (AISVG): https://www.aisvg.app/blog/image-to-svg-converter-guide
- OpenAI image generation guide (`gpt-image-1` transparency): https://platform.openai.com/docs/guides/image-generation
- GPT-Image transparent assets (AI-FLOW): https://ai-flow.net/blog/asset-extraction-workflow-gpt-image-1/
- OGImagen: https://ogimagen.com/
- OGForge: https://ogforge.dev/
- Claude + n8n + ImageMagick blog pipeline: https://ry-ops.dev/amp/2026-02-11-building-an-automated-blog-content-pipeline-with-n8n-imagemagick-and-claude
- AI-powered blog image pipeline (Martijn Bos): https://martijnbos.nl/blog/ai-powered-blog-images
- Numonic — governing `--sref` as a design system: https://numonic.ai/blog/midjourney-brand-consistency-guide
- Erik Fadiman — MJ vs Recraft illustration library: https://medium.com/@fadimantium/illustration-library-midjourney-vs-recraft-f47df47f8706
- Nurxmedov — Why Recraft fits designer workflows: https://nurxmedov.medium.com/why-recraft-is-the-first-ai-tool-that-understands-how-designers-actually-work-0294a5e5b787
- Vecsmith (weekend text-to-SVG with Flux + vtracer): https://llmkube.com/blog/vecsmith-weekend-text-to-svg
- Figma Weave + MCP image-to-SVG tutorial: https://vectosolve.com/blog/figma-weave-mcp-image-to-svg-pipeline
