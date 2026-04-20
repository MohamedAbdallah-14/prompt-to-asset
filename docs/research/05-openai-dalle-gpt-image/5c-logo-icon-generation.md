---
angle: 5c
category: 05-openai-dalle-gpt-image
title: "Logo & icon generation with gpt-image-1"
research_value: high
last_updated: 2026-04-19
tags: [gpt-image-1, gpt-image-1.5, logo, app-icon, favicon, transparent-background, ios-icon, vector, prompt-patterns]
---

# Logo & icon generation with gpt-image-1

**Research value: high** — OpenAI publishes a dedicated logo prompting pattern in the cookbook, the `background: "transparent"` flag is documented across the Image API and Responses API, and two open‑source CLI tools (SnapAI, ai-icon-generator) have shipped production-tested prompt templates specifically for icons on gpt-image-1 / 1.5.

## TL;DR

- `gpt-image-1` (Apr 2025) and `gpt-image-1.5` (Dec 2025) both support `background: "transparent"` on the Image API **and** (as of ~mid-2025) on the Edit endpoint. Requires `output_format="png"` or `"webp"`; transparency is "best at quality `medium` or `high`". [1][4][7]
- Three output sizes only: `1024x1024`, `1536x1024`, `1024x1536`. Favicons and icon sets must be generated at 1024² then downscaled locally. [1][6]
- The cookbook's canonical logo recipe (Section 4.5) is: brand personality + intended use → "clean, original mark with strong shape, balanced negative space, scalability" → flat / minimal strokes / no gradients → "plain background, generous padding, no watermark" → `n=4` variations. [3]
- SnapAI's battle-tested rule: **do not include the words "icon" or "logo" in the prompt** — gpt-image-1 interprets those as "draw the icon on a giant blank card" and adds excessive padding. Use `"fill the frame"` if padding persists. [5]
- **Apple iOS icons**: do *not* ask the model to round corners or export with alpha — Apple rejects alpha-channel icons and applies its own squircle mask automatically. Generate a full-bleed 1024² opaque square. [11][12]
- Text reliability: `gpt-image-1` still produces gibberish on brand names ~often enough that it is unusable for wordmarks without post-edit; `gpt-image-1.5` is the first OpenAI model where in-logo typography is production-viable. Workarounds: quote text literally, spell letter-by-letter, or leave wordmark blank and composite type in a vector editor. [2][8][13][14]
- vs DALL·E 3: gpt-image-1.5 wins decisively on icons/logos — better text, transparent background support (DALL·E 3 has none), multi-image reference input (DALL·E 3 has none), and DALL·E 3 is deprecated in the Image API on 2026-05-12. [1][9][10]

## Prior art

### 1. OpenAI cookbook: dedicated logo recipe

The official `gpt-image-1.5` prompting guide (cookbook, published 2025-12-16) has a section **"4.5 Logo Generation"** that states the pattern explicitly: [3]

> "Strong logo generation comes from clear brand constraints and simplicity. Describe the brand's personality and use case, then ask for a clean, original mark with strong shape, balanced negative space, and scalability across sizes."

Reference prompt from the cookbook:

```text
Create an original, non-infringing logo for a company called Field & Flour, a local bakery.
The logo should feel warm, simple, and timeless. Use clean, vector-like shapes, a strong
silhouette, and balanced negative space. Favor simplicity over detail so it reads clearly
at small and large sizes. Flat design, minimal strokes, no gradients unless essential.
Plain background. Deliver a single centered logo with generous padding. No watermark.
```

Five load-bearing moves in this template:
1. Explicit **"non-infringing"** and **"original"** — nudges away from memorized trademarks.
2. Brand voice adjectives (**warm, simple, timeless**) *before* visual spec.
3. **"Vector-like shapes"** — the closest gpt-image-1 gets to true vector output; it still rasters as PNG.
4. **"Reads clearly at small and large sizes"** — scalability cue.
5. `n=4` variations in one call — cheaper than four prompts and encourages divergent silhouettes.

### 2. Cookbook: transparent background sticker pattern

From the April 2025 cookbook "Generate images with GPT Image" (Katia Gil Guzman, OpenAI), the canonical transparent sticker/icon call: [4]

```python
result = client.images.generate(
    model="gpt-image-1",
    prompt="generate a pixel-art style picture of a green bucket hat with a pink quill on a transparent background.",
    quality="low",         # use "high" for production logos
    output_format="png",   # required for alpha channel
    size="1024x1024",
)
```

Key note buried in the cookbook: **"if you include in your prompt that you want a transparent background, it will be set to `transparent` by default"** — the model reads the phrase and flips the flag for you. You don't have to set `background="transparent"` explicitly, but doing so is more deterministic. [4]

### 3. Open-source icon generator (gpt-image-1)

`samzong/ai-icon-generator` (MIT, TypeScript, Jun 2025, v0.1.2) is a web UI wrapper around `client.images.generate` that exposes presets for **Flat / 3D / outlined / gradient** and exports PNG / ICO / ICNS / JPEG. Example prompts shipped in the README: [15]

```text
Modern minimalist shopping cart icon in blue gradient
Flat design email icon with rounded corners
3D metallic gear icon with chrome finish
Hand-drawn style tree icon in earth tones
```

### 4. SnapAI CLI — prompt enhancement rules

`snapai` (npm CLI, supports both `gpt-image-1` and `gpt-image-1.5` via `--model gpt-1` / `gpt-1.5`) publishes the most empirically-derived rules in this space: [5]

- "Describe the product first, then the style." → `"a finance app, shield + checkmark, modern, clean gradients"`
- "If you see excessive empty border space, avoid including the words *icon* or *logo*." (SnapAI strips them from user input by default; the `--use-icon-words` flag puts them back in, and the doc explicitly warns this "may increase visual padding".)
- "Add `"fill the frame"` explicitly if padding persists."
- Style presets exposed as flags: `minimalism`, `material`, `pixel`, `kawaii`, `cute`, `glassy`, `neon`.
- Always 1024×1024 output (CLI pins `size`).

### 5. JSON style-profile trick for iOS squircle icons

A widely shared Medium post (Bhandekar, Apr 2025) found that inlining a structured JSON style guide + a generation prompt in the same message gave markedly more consistent iOS-style icons than prose descriptions. [12] The profile defines `container.shape = "Squircle"`, subtle 3D glyph styling, soft shadows, vibrant gradients — and the AI adheres to it far more reliably than to "make it look like an iOS icon." The pattern ports to `gpt-image-1.5`.

## Concrete prompt patterns

### Pattern A — Flat vector brand mark (monochrome first)

Use when you need a scalable brand mark that will be vectorized downstream.

```python
prompt = """
Create an original, non-infringing logo mark for "Northwind" — a B2B logistics SaaS.
Brand personality: precise, calm, industrial, trustworthy.
Style: ultra-minimalist flat vector, Swiss/modernist, single weight of stroke,
no gradients, no drop shadows, no 3D. Maximum 2 geometric elements.
Use negative space intelligently (FedEx-arrow caliber).
Color: pure black (#000000) on a plain white background. Monochrome only.
Composition: single centered mark, generous padding, 1:1 framing.
Must read clearly at 16x16 px (favicon) and at 1000x1000 px.
No wordmark, no tagline, no watermark, no mockup.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    size="1024x1024",
    quality="high",
    n=4,
)
```

Why each line matters: negative-space and "16x16 px" references consistently push the model toward symbols that actually work at favicon size; "no wordmark" suppresses the model's default habit of adding illegible text. [8][13]

### Pattern B — Transparent PNG app icon (generic, not iOS)

Use for Electron apps, Android adaptive icons, browser extensions.

```python
prompt = """
App artwork for a personal finance tracker.
Subject: a stylized coin stack cross-fading into a rising line chart, single element.
Style: flat design, clean gradients, rounded corners, modern fintech aesthetic,
deep navy #0B1E3F to teal #16C4A7 gradient on the subject.
Fill the frame edge-to-edge — no border, no padding around the artwork.
Transparent background.
No text, no labels, no "app icon" frame, no shadow under the art.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    size="1024x1024",
    quality="high",
    background="transparent",
    output_format="png",
)
```

Notes:
- `background="transparent"` + `output_format="png"` is the required combo. `jpeg` cannot carry alpha. [1][6]
- `"Fill the frame edge-to-edge"` is SnapAI's padding fix. [5]
- The prompt intentionally avoids the word "icon" except the hedged phrase "no app icon frame" (telling the model *not* to draw a squircle card). This matters: the default gpt-image-1 response to the bare word "icon" is to draw a Material-style rounded square with the artwork inside it, wasting pixels. [5]

### Pattern C — iOS-style 3D squircle icon (JSON style profile)

Use when you want the Apple "squircle with 3D glyph" look for a concept / mockup. **Not for App Store submission** — see the iOS caveat below.

```python
prompt = """
Generate an app icon based on the following description:
A meditation app called "Still" — the icon is a single minimal wave /
breathing ripple expanding outward.

Strictly adhere to the style profile below:

```json
{
  "icon-kit": {
    "name": "iOS Squircle Style",
    "container": {
      "shape": "Squircle",
      "corner_radius": "Significant and continuous (~22% of width, 60% smoothing)",
      "background": "Soft linear gradient, calm blue #A8D0FF to pale lavender #E8E5FF"
    },
    "glyph": {
      "style": "Simplified, 3D, soft shading, subtle inner highlights",
      "outlines": "None on main shape; only for thin internal details",
      "perspective": "Head-on, volume via light + shadow, not angle"
    },
    "color": { "palette": "Pastel, saturated highlights, soft white accents" },
    "effects": { "shadows": "Subtle soft drop shadow under the glyph" }
  }
}
```

Fill the frame. Opaque background. No text inside the icon. 1:1 framing.
"""
```

The JSON-in-prompt trick is empirically stickier than prose style descriptions — the model treats structured key-value pairs as hard constraints. [12]

### Pattern D — Transparent sticker / die-cut logo

Use for marketing slack emoji, sticker sheets, brand system assets.

```python
prompt = """
Die-cut sticker illustration of a happy orange fox mascot for a developer tool
called "Foxbuild". 3D clay/claymation style, rounded forms, soft sculpted shading,
thick solid white outline around the entire silhouette, cast shadow under the fox.
Centered in a 1:1 square. Transparent background around the sticker.
No text inside the sticker body.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    size="1024x1024",
    quality="high",
    background="transparent",
    output_format="png",
)
```

A community thread documented that in early `gpt-image-1` (April 2025) the Edit endpoint *ignored* transparent-background requests on sticker workflows; the fix landed ~3 months later when `/v1/images/edits` gained the `background` parameter. On current APIs both `generate` and `edit` accept it. [7]

### Pattern E — Wordmark with literal brand text

For logos that must include legible typography. **Only reliable on `gpt-image-1.5`** — earlier `gpt-image-1` routinely misspells brand names. [2][8][13]

```python
prompt = """
Create a clean wordmark logo for a coffee roastery called "KORVA".
Typography: bold geometric sans-serif (similar weight to Futura Bold or
Neue Haas Grotesk), perfect kerning, custom ligature optional.
Render the text EXACTLY, verbatim, no extra characters:
"KORVA"
Spell letter-by-letter: K, O, R, V, A. Five letters. All capitals.
Beneath, in a small serif italic, the tagline EXACTLY:
"single origin · slow roast"

Color: warm espresso brown #3A2415 on a plain cream #F4EBDD background.
Minimal, no icon, no ornament, no border. Centered, generous padding.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    size="1536x1024",
    quality="high",
)
```

Three mandatory typography moves from the OpenAI cookbook prompting guide: quote literal text, demand "EXACT, verbatim, no extra characters", and spell tricky words letter-by-letter. [2]

### Pattern F — Favicon set generation (multi-size workflow)

There is no API-level favicon helper — you generate at 1024×1024 and downscale locally. The prompt should optimize for the 16×16 limit:

```python
prompt = """
Create a favicon-ready brand mark for a blog called "Pixel Loom".
The mark should be:
- A single bold geometric symbol (no wordmark, no text of any kind).
- Instantly recognizable at 16x16 px. Must still be recognizable when
  reduced to 6 pixels of meaningful information.
- Single solid color #D6336C on transparent background.
- No inner details finer than 1/32 of the image width.
- Fill the frame (no padding, no border, no drop shadow).
- Symmetrical enough to center-crop safely.
"""

result = client.images.generate(
    model="gpt-image-1.5",
    prompt=prompt,
    size="1024x1024",
    quality="high",
    background="transparent",
    output_format="png",
)

# Downscale locally to favicon sizes
from PIL import Image
img = Image.open(io.BytesIO(base64.b64decode(result.data[0].b64_json)))
for size in (16, 32, 48, 180, 192, 512):
    img.resize((size, size), Image.LANCZOS).save(f"favicon-{size}.png")
```

The constraint `"no inner details finer than 1/32 of the image width"` is the single biggest lever for survivability at 16 px — without it, gpt-image-1.5 happily produces filigree that disappears on downsample.

## Adjacent solutions

- **Midjourney v7 / Flux logo prompts** use similar minimalism/negative-space vocabulary, and several prompt libraries (theRightGPT "Universal Professional Minimal Logo Prompt") are explicitly portable across Midjourney, DALL·E 3, and gpt-image-1 as long as the size + background params are swapped in for gpt-image-1's flag format. [8]
- **JSON style profiles** originated as a GPT-4o image-generation workaround (before the Image API version of gpt-image-1 shipped) and transferred cleanly to gpt-image-1 / 1.5 because the underlying model is the same. [12]

## Market & competitor signals

### Comparison: gpt-image-1 vs gpt-image-1.5 vs DALL·E 3 on icon/logo tasks

| Capability                       | DALL·E 3                    | gpt-image-1 (Apr 2025)         | gpt-image-1.5 (Dec 2025)       |
|----------------------------------|-----------------------------|---------------------------------|---------------------------------|
| Transparent background           | **Not supported**           | `background="transparent"` + PNG/WEBP | Same, plus on `/edits` endpoint |
| Text rendering in logo           | Frequent misspellings       | Often garbled on brand names    | Production-viable; multi-font   |
| Multi-image reference            | **Not supported**           | Up to 10 input images on `edits` | Same + `input_fidelity="high"`  |
| Output sizes                     | 1024², 1024×1792, 1792×1024 | 1024², 1536×1024, 1024×1536    | Same three sizes                |
| In-image world knowledge         | Limited                     | Good                           | Best                           |
| API availability                 | Deprecated 2026-05-12       | Generally available            | Generally available (recommended) |
| Price per image (1024², high)    | $0.04–0.08                  | ~$0.17                         | ~$0.19 (tokens-based)          |

Sources: [1][6][9][10][13][14]

### Community-tool landscape (2025–2026)

- **SnapAI** (npm, CLI, OpenAI + Gemini) — prompt enhancement pipeline specifically for app-icon output; ships the "strip the words icon/logo" rule. Default model is `gpt-1.5` (gpt-image-1.5), fallback `gpt-1`. [5]
- **ai-icon-generator** (Vercel web app, MIT) — preset styles (flat / 3D / outlined / gradient), ICO / ICNS export. Hardcoded to gpt-image-1. [15]
- **Proxy ecosystems** (e.g., free-dall-e-proxy) — wrap `gpt-image-1` for icon generation in restricted regions; same prompt patterns apply unchanged.

## Cross-domain analogies

- **Print pre-press "black plate first" workflow.** Historically designers design a logo as a single-color black separation first, then layer color. The cookbook's bias toward monochrome logos on plain backgrounds maps directly — ask for the single-color mark first, run `n=4`, pick the strongest silhouette, then do a second call to recolor the winner. This consistently beats asking for the full color logo in one shot.
- **Game sprite dithering at 16×16.** The "no inner details finer than 1/32 of the image width" rule is the same constraint pixel-art game artists use when authoring a 32×32 sprite: any detail smaller than a pixel is noise, not information. Favicon-grade logo prompts are a rediscovery of that constraint.

## Known limitations

From the OpenAI image-generation guide "Limitations" section and field reports: [6][2][13]

1. **Latency**: complex logo prompts can take up to 2 minutes, especially at `quality="high"` + `n>1`.
2. **Text rendering** still not perfect on `gpt-image-1.5` — OpenAI explicitly warns "the model can still struggle with precise text placement and clarity." For contractually-required pixel-accurate typography, generate the mark only and composite type in a vector editor.
3. **Composition control** — the model "may have difficulty placing elements precisely in structured or layout-sensitive compositions." Grid-aligned logo lockups (icon-left-wordmark-right at a specific ratio) often need manual assembly.
4. **Aspect ratio**: no 512×512, no 256×256, no arbitrary aspect ratios. Always generate ≥1024 and downscale.
5. **Brand consistency across generations** — "may occasionally struggle to maintain visual consistency for recurring characters or brand elements across multiple generations." For a full icon *set*, use the Responses API with `previous_response_id` + `input_fidelity="high"` rather than independent calls. [2][6]
6. **iOS App Store caveat**: Apple rejects icons with alpha channels and applies its own squircle mask. **Do not** submit a transparent-background gpt-image-1 output as an iOS icon. Generate a full-bleed opaque 1024² square with the artwork already filling the frame; let the system apply the mask. Asking gpt-image-1 for "rounded corners" produces an output that then gets masked *again* by iOS, cropping the corners twice. [11][12]
7. **`background="auto"` is unreliable** — DataCamp's reproducibility testing found the model "mostly ignored this parameter" and reinforcing the desired outcome in the prompt text works better than trusting the flag alone. [6]

## Sources

1. [Image generation — OpenAI API guide](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) — canonical reference for `background`, sizes, supported formats, and model comparison table.
2. [gpt-image-1.5 Prompting Guide — OpenAI Cookbook (Dec 16, 2025)](https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide) — includes dedicated logo generation section (4.5) and the literal-text / letter-by-letter prompting rules.
3. [openai/openai-cookbook — image-gen-1.5-prompting_guide.ipynb (GitHub)](https://github.com/openai/openai-cookbook/blob/main/examples/multimodal/image-gen-1.5-prompting_guide.ipynb) — notebook source with the "Field & Flour" bakery logo reference prompt + `n=4` variation pattern.
4. [Generate images with GPT Image — OpenAI Cookbook (Apr 23, 2025)](https://cookbook.openai.com/examples/generate_images_with_gpt_image) — earliest canonical transparent-background sticker example for `gpt-image-1`.
5. [SnapAI CLI writeup — ScriptByAI](https://www.scriptbyai.com/app-icon-generator-snapai-cli/) — production-tested "avoid words icon/logo", "fill the frame", prompt-only preview pattern; supports both `gpt-image-1` and `gpt-image-1.5`.
6. [GPT-Image-1 API Step-by-Step Guide — DataCamp](https://www.datacamp.com/tutorial/gpt-image-1) — documents that `background` param is sometimes ignored in practice and reinforces reinforcing transparency in the prompt text.
7. [gpt-image-1 — Transparent backgrounds with Edit request (OpenAI Developer Community)](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) — community thread tracing when `/v1/images/edits` gained the `background` parameter.
8. [Universal Professional Minimal Logo Prompt (2025–2026 standard) — theRightGPT](https://therightgpt.com/universal-professional-minimal-logo-prompt-2025-2026-standard/) — widely-shared minimal-logo template portable to gpt-image-1.
9. [GPT Image 1.5 vs DALL-E 3 — OpenAIToolsHub](https://www.openaitoolshub.org/en/blog/gpt-image-vs-dall-e) — side-by-side feature and pricing comparison.
10. [DALL-E 3 vs GPT Image 1.5: Real Output Comparison (2026) — Rival](https://www.rival.tips/compare/dalle-3/gpt-image-1.5) — benchmark output comparison.
11. [iOS App Icon Guidelines & Requirements for App Store Approval (2026) — TheAppLaunchpad](https://theapplaunchpad.com/blog/ios-app-icon-guidelines/) — confirms no-alpha-channel and no-manual-corner-rounding rules.
12. [The JSON Trick for Perfect iOS Icons — Prathamesh Bhandekar, Medium (Apr 2025)](https://medium.com/@bprathamesh2003/the-json-trick-for-perfect-ios-icons-with-gpt-4o-image-generation-957a533d60d8) — structured JSON style-profile technique with a complete iOS squircle profile.
13. [GPT Image 1.5: Text Rendering That Actually Works — Atlas Cloud](https://www.atlascloud.ai/blog/ai-updates/gpt-image-1.5-api-is-now-available-on-atlas-cloud) — documents the gpt-image-1 → 1.5 jump on in-image typography.
14. [How GPT Image 1.5 Fixed AI Art's Major Problem — SuperMaker AI](https://supermaker.ai/blog/gpt-image-1-5-review-fixing-ai-text/) — third-party confirmation of text-rendering improvements.
15. [samzong/ai-icon-generator (GitHub, MIT)](https://github.com/samzong/ai-icon-generator/tree/main) — open-source icon generator showing preset style vocabulary and ICO/ICNS export pipeline on top of gpt-image-1.
