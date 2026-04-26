---
name: asset-enhancer
description: Classify a software-asset brief (logo, app icon, favicon, OG image, illustration, splash, icon pack, transparent mark), route to the right image model, rewrite the prompt in the target model's dialect, pick an execution mode (inline_svg / external_prompt_only / api) based on what's actually available, and run the pipeline. Use whenever the user asks for any visual asset for a software product.
trigger_phrases:
  - generate a logo
  - make an app icon
  - create a favicon
  - og image for
  - illustration for
  - splash screen
  - icon pack
  - transparent png
  - transparent background
  - vectorize
  - convert to svg
  - brand assets
---

# asset-enhancer skill

Comprehensive behavior spec for producing production-grade software-development assets. Drives every `asset_*` MCP tool.

## Cardinal rules

> 1. Producing production-grade software assets is a **routing + post-processing** problem, not a prompt-engineering problem.
> 2. The user may not have an image-model API key. The plugin must work anyway.
> 3. There are real zero-key paths — always surface them first before asking the user to pay for anything. The `free_api.routes` block in `asset_capabilities()` enumerates the ranked free programmatic routes: Cloudflare Workers AI (Flux-1-Schnell + SDXL, 10k neurons/day), HF Inference (free `HF_TOKEN`), Pollinations (zero-signup HTTP), Stable Horde (anonymous queue), and local ComfyUI. **Google's Gemini / Imagen image API is NOT free anymore** — Google removed image-gen from the universal free tier in December 2025. Unbilled `GEMINI_API_KEY` → HTTP 429, `limit: 0`. The AI Studio **web UI** at https://aistudio.google.com is still free for interactive generation — treat it as a paste-only flow (`external_prompt_only` → `asset_ingest_external`).

See `rules/asset-enhancer-activate.md` for the condensed always-on version. This file is the long-form spec.

## Three execution modes

Before generating anything, decide (with the user) which mode to use. Call `asset_capabilities()` to learn what's available in the current environment.

### 1. `inline_svg` — zero key, Claude writes the SVG, server persists

Two-step round trip:

1. The server returns an `svg_brief` (viewBox, palette, path budget, style hints, skeleton) and `instructions_to_host_llm`. You emit the `<svg>…</svg>` inline in your reply as a ```svg code block so the user can see it.
2. **Immediately after emitting, call `asset_save_inline_svg({ svg, asset_type })`.** The server validates the SVG against the brief (viewBox, `<path>` count, palette), writes `master.svg` to disk, and — for favicon / app_icon — runs the full platform export (favicon.ico + apple-touch-icon + PWA 192/512/512-maskable; or AppIconSet + Android adaptive + PWA). Returns an `AssetBundle` with `variants[].path`. Show those paths to the user.

Skip step 2 and the user gets a code block with no file. Do not skip step 2.

**Good for:** `logo`, `favicon`, `icon_pack`, `sticker`, `transparent_mark`, simple `app_icon` masters. Flat, geometric, ≤40 paths.

**Not good for:** illustrations, hero art, photoreal, OG cards with web-font typography.

### 2. `external_prompt_only` — zero key, user pastes into a web UI

The server returns the dialect-correct prompt + a list of paste targets with URLs in **free-first order**: AI Studio **web UI** (https://aistudio.google.com — free interactive Gemini / Imagen), Pollinations (zero-signup HTTP), HF Inference (free `HF_TOKEN`), Stable Horde (anonymous queue), then paid UIs (Ideogram web, Recraft web, Midjourney, fal.ai Flux, BFL Playground, OpenAI Platform Playground, etc.). The user generates elsewhere, saves the image locally, and calls `asset_ingest_external({ image_path, asset_type })` to run the matte / vectorize / validate pipeline.

Note: `GEMINI_API_KEY` does NOT give free image-gen — Google removed that tier in December 2025. The free Gemini/Imagen route is the AI Studio web UI, not the API.

**Good for:** any asset type. Best for `illustration`, `hero`, text-heavy logos, when the user has a Midjourney / Ideogram subscription but no API key.

### 3. `api` — requires a provider key

Server calls the routed provider directly, mattes, vectorizes, exports, validates. Writes a content-addressed `AssetBundle` with `variants[].path` for every artifact.

**Requires** at least one of: `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`). The router falls back among configured providers automatically.

## Recommended flow

```
user brief
  ↓  asset_capabilities()                   → what's available RIGHT NOW
  ↓  asset_enhance_prompt({ brief })        → AssetSpec + modes_available
  ↓  ask the user which mode they want
  ↓  asset_generate_<type>({ brief, mode }) → InlineSvgPlan | ExternalPromptPlan | AssetBundle
  ↓  if inline_svg:
       1. emit <svg> in reply (user sees the shape)
       2. call asset_save_inline_svg({ svg, asset_type })
       3. show the returned variants[].path list (user sees files on disk)
  ↓  if external: show prompt + paste_targets; wait for asset_ingest_external
  ↓  if api: show variants[].path and validation warnings
```

## Asset taxonomy — closed enum

| `asset_type` | Transparency default | Vector? | Text? | inline_svg? | external_prompt_only? | api? |
|---|---|---|---|---|---|---|
| `logo` | yes (RGBA PNG **and** SVG) | preferred | wordmark optional (composite) | ✅ | ✅ | ✅ |
| `app_icon` | **no** on iOS 1024 marketing | no | no | ✅ master only | ✅ master only | ✅ full fan-out |
| `favicon` | mixed | prefer | rare | ✅ | ✅ | ✅ |
| `og_image` | no | no | yes (headline) | ❌ (web-font layout beyond LLM reach) | ✅ bg only | ✅ |
| `splash_screen` | vector icon + solid bg | no | no | ❌ | ✅ | ✅ |
| `illustration` | often | SVG where geometry allows | avoid | ❌ path budget | ✅ | ✅ |
| `icon_pack` | yes | **mandatory SVG** | no | ✅ | ✅ | ✅ |
| `hero` | optional | no | sometimes | ❌ | ✅ | ✅ |
| `sticker` | yes | no | rare | ✅ | ✅ | ✅ |
| `transparent_mark` | yes | no | avoid | ✅ | ✅ | ✅ |

## Pipeline (api mode)

```
  brief
    ↓  classify()                           → asset_type ∈ enum
    ↓  parse_brand_bundle()?                → BrandBundle | null
    ↓  compute_params(asset_type, brand)    → dimensions, transparency, safe_zone
    ↓  route(asset_type, ...)               → primary_model, fallback_model, postprocess[]
    ↓  rewrite(brief, model, brand)         → dialect-appropriate final prompt
  ── call provider with seed pinned ──
    ↓  validate_0(image)                    → reject checkerboard / bad alpha / moderation
    ↓  matte?        (birefnet | rmbg via PROMPT_TO_BUNDLE_RMBG_URL | difference fallback | native)
    ↓  vectorize?    (recraft | vtracer-on-PATH | potrace-on-PATH | llm-svg | posterize fallback)
    ↓  upscale?      (dat2 | supir | img2img | never)
    ↓  export        (sharp platform fan-out + @resvg/resvg-js + satori + png-to-ico + svgo)
    ↓  validate_final (tile-luma alpha check + bbox + palette ΔE2000 + OCR Levenshtein + WCAG contrast)
    ↓  content-address cache (prompt_hash, model, seed, params_hash)
    →  AssetBundle
```

## Model routing (data-driven)

The routing table lives in `data/routing-table.json`. Summary:

| Need | Primary | Fallback | Never |
|---|---|---|---|
| Transparent PNG mark | `gpt-image-1` (`background:"transparent"`) | Ideogram 3 Turbo `style:"transparent"` → Recraft V3 | Imagen any, Gemini any, SD 1.5 |
| Logo with 1–3 word text | Ideogram 3 → `gpt-image-1.5` → Recraft V4 | Composite real SVG type over mark | Imagen 4, SD 1.5, Flux Schnell |
| Logo with 4–10 word text | `flux-2` / `gpt-image-2` / Nano Banana Pro | `gpt-image-1.5` | SD, Flux Schnell, Pollinations |
| Logo with paragraph-length text | Nano Banana Pro / `gpt-image-2` (model can render); composite stays safer for pixel-exact UI | — | All weak-text models |
| Native SVG | Recraft V4 | LLM-author SVG (simple geometry) — **this is `inline_svg` mode** | Everyone else |
| Photoreal hero | Flux 2 / `gpt-image-2` / Imagen 4 Ultra | SDXL + brand LoRA | DALL·E 3 |
| Empty-state illustration | Flux 2 + brand refs (up to 10) / IP-Adapter | SDXL + LoRA → Recraft brand style | One-off Ideogram/MJ (style drift) |
| App icon | Recraft V4 or Ideogram 3 for mark → packaging pipeline | `gpt-image-1.5` mark → packaging | Full-bleed Imagen 4 as final |
| Favicon | SVG first (LLM-author or Recraft V3) | Raster 512 → vectorize | — |
| OG image | Satori + `@resvg/resvg-js` template (no diffusion) | Diffusion **only** for hero image inside OG template | — |

## Dialect rules per provider

Prompts are **never** forwarded verbatim. Rewrite per target family. See the per-angle research under `docs/research/` for derivations; implementation is in `packages/mcp-server/src/rewriter.ts`.

### `gpt-image-2` / `gpt-image-1.5` / `gpt-image-1` (OpenAI)
- Prose sentences. Subject → Context → Style → Constraints.
- **Transparency:** `gpt-image-1.5` and `gpt-image-1` accept `background: "transparent"`. **`gpt-image-2` does NOT — the param 400s** (regression). Route transparent jobs to gpt-image-1.5.
- For text: `"Acme"` in double quotes. Ceilings: gpt-image-2 ~80 chars / paragraph (~99% per third-party); gpt-image-1.5 dense text (~60 chars, LM Arena #1); gpt-image-1 ~50 chars.
- Never rely on `negative_prompt` field — silently ignored across all three.
- gpt-image-2 has an active noise-artifact bug on structured surfaces (clouds, skin, panels). Pricing is not yet on OpenAI's pricing page.

### Imagen 3 / 4 (Google) & Gemini 2.5 / 3.1 / 3 Pro Flash Image ("Nano Banana")
- Narrative prose. Imagen has a default rewriter for prompts <30 words, so write ≥30 words of concrete description to suppress it.
- **Do not ask for transparency in the prompt** — RGB-only VAE renders a checkerboard. Ask for `"solid pure white background"` and matte externally.
- **Per-model text ceilings:**
  - Imagen 4 family: ≤25 chars / ~3-4 short words per Google's own guidance. Photoreal leaders, not text.
  - `gemini-2.5-flash-image` (original Nano Banana 1): ~80% accuracy, degrades past 1-3 words.
  - `gemini-3.1-flash-image-preview` (Nano Banana 2): ~90% accuracy, ranked #1 on Artificial Analysis Image Arena at launch — **strong-text, not weak**.
  - `gemini-3-pro-image-preview` (Nano Banana Pro): paragraph-length reliable, ~94-96% accuracy.
- **`negative_prompt`:** Imagen 4 accepts `negativePrompt` on the **Vertex AI** endpoint; the Gemini API surface ignores it. All Nano Banana variants ignore it.
- Gemini supports multimodal edit (in-context image refs, up to 14 on 3.1); Imagen does not.

### Stable Diffusion 1.5 / SDXL
- Tag-soup: comma-separated descriptors. `"masterpiece, 8k, studio lighting"`.
- 77-token CLIP limit — front-load important tags.
- `negative_prompt` **is** a real CFG sampler feature; use it.
- For transparency: LayerDiffuse adapter, or matte after.

### Flux 1 / Flux 2 / Flux Pro / Kontext
- Prose narrative. T5 + (Mistral-3 24B VLM on Flux 2) — long-form sentences work; Flux 2 also accepts JSON-structured prompts and `@`-image refs.
- **Never send `negative_prompt`.** Per BFL's Flux 2 prompting guide: "FLUX.2 does not support negative prompts." On 1.x the fal schema rejects it; on 2.x fal silently no-ops. Use positive anchors instead.
- **Text ceilings:** Flux 1.1 Pro / Pro: 1–3 words. Flux Schnell / Klein: 1–2 words. Flux 2 (pro/dev): ~5–10 words / one tagline reliable. Flux 2 Flex: BFL claims strongest text in the Flux 2 line.
- Flux 2 accepts up to **10** brand reference images (was 8 on Flux 1).
- Flux 2 family has 5 SKUs: pro / flex (steps+guidance control) / max / dev (32B open weights, non-commercial) / klein (Apache 2.0 distilled).

### Midjourney v6 / v7
- Prose + `--` flags. `--sref`, `--cref`, `--mref` for consistency.
- **No official API** — only reachable via `external_prompt_only` mode.
- `--ar 1:1`, `--style raw`, `--q 2`.

### Ideogram 2 / 3 / 3 Turbo
- Prose + quoted text strings. Best-in-class typography.
- For RGBA transparency: use the dedicated `/ideogram-v3/generate-transparent` endpoint; set `rendering_speed: "TURBO"` for the Turbo tier (there is no `style: "transparent"` API parameter).
- "Magic Prompt" expands literal prompts — toggle OFF for logo/icon/brand work.

### Recraft V2 / V3 / V4
- Prose. `style_id` = brand lock. `controls.colors` = hex palette enforcement.
- **Only production model with native SVG output.**
- Path count correlates with quality; reject >200 paths for a clean mark.

## Brand bundle

If a `BrandBundle` is provided, every generation injects it. Shape:

```yaml
palette: [#hex, #hex, ...]     # DTCG color tokens
style_refs: [path.png, ...]    # IP-Adapter / --sref / Recraft style_id
lora: path.safetensors?        # SDXL/Flux subject/style LoRA
sref_code: "--sref 123456"?    # Midjourney
style_id: "uuid"?              # Recraft
do_not: ["drop shadows", ...]  # Rewritten as positive anchors
logo_mark: path.svg?           # Canonical mark for composition
typography: { primary, secondary }  # Fonts for composited type
```

Use `asset_brand_bundle_parse` to canonicalize a `brand.md` / `brand.json` / DTCG `tokens.json` / AdCP spec into this shape.

## Validation

Three tiers. Tier-0 always. Tier-1 on first asset in a set. Tier-2 on any failure or on user request.

**Tier 0 — deterministic:** dimensions, alpha, checkerboard FFT, safe-zone bbox, file-size budget, DCT entropy.

**Tier 1 — metric:** VQAScore, palette ΔE2000, OCR Levenshtein, WCAG AA at 16×16.

**Tier 2 — VLM-as-judge:** Claude Sonnet / GPT vision against asset-type rubrics (not wired by default; set `PROMPT_ENHANCER_VLM_URL` to enable).

## Regenerate vs. repair

| Failure | Action |
|---|---|
| Checkerboard pattern | **Regenerate with route change** — architectural, not sampling |
| Alpha missing on transparency-required | Matte with BiRefNet / RMBG |
| Wordmark misspelled | **Drop text from prompt, composite SVG type** |
| Palette drift | Regenerate with `controls.colors` (Recraft) or recolor post |
| Safe zone violation | Regenerate with explicit center-framing + padding |
| Wrong aspect | Inpaint/outpaint via edit endpoint if available; else regenerate |
| Watermark / stock photo vibe | Regenerate with positive-anchor rewrite |
| Low contrast at 16² (favicon) | Regenerate with explicit contrast instruction |

## Caching

Key: `(model, version, seed, prompt_hash, params_hash)`. Storage: content-addressed path `assets/<hash[0:2]>/<hash>/<variant>.<ext>`. The MCP server is synchronous — `prompt_hash` is emitted on every `AssetBundle` so a future hosted tier (BullMQ / SQS / Cloudflare Queues) can use it as a deduplication key.

## Output contracts

### `InlineSvgPlan` (mode: "inline_svg")

```json
{
  "mode": "inline_svg",
  "asset_type": "logo",
  "brief": "…",
  "svg_brief": { "viewBox": "…", "palette": {...}, "path_budget": 40, "require": [...], "do_not": [...], "skeleton": "…" },
  "instructions_to_host_llm": "…"
}
```

Read `svg_brief`. Emit `<svg>…</svg>` as a ```svg code block in your reply **and then call `asset_save_inline_svg({ svg, asset_type })`** to persist the file. That tool returns an `AssetBundle` with `variants[].path` — show those paths to the user so they know the files exist on disk.

### `ExternalPromptPlan` (mode: "external_prompt_only")

```json
{
  "mode": "external_prompt_only",
  "asset_type": "logo",
  "enhanced_prompt": "…",
  "target_model": "ideogram-3-turbo",
  "paste_targets": [{ "name": "Ideogram web", "url": "https://ideogram.ai", "notes": "…" }],
  "ingest_hint": {
    "tool": "asset_ingest_external",
    "args": { "image_path": "<path>", "asset_type": "logo" }
  }
}
```

Show the prompt + the top paste target(s). After the user saves the result, call `asset_ingest_external`.

### `AssetBundle` (mode: "api")

```json
{
  "mode": "api",
  "asset_type": "logo",
  "variants": [
    { "path": "…/master.png", "format": "png", "width": 1024, "height": 1024, "rgba": true },
    { "path": "…/mark.svg", "format": "svg", "paths": 18 }
  ],
  "provenance": { "model": "recraft-v3", "seed": 1234, "prompt_hash": "…", "params_hash": "…" },
  "validations": { "tier0": { "...all pass": true } },
  "warnings": []
}
```

## Research

Every decision in this skill is traceable to a research angle. See
`docs/RESEARCH_MAP.md` for the full file-level mapping. The load-bearing
angles most relevant to day-to-day behavior:

- `docs/research/04-gemini-imagen-prompting/4c-transparent-background-checker-problem.md` — why Imagen/Gemini never gets transparency
- `docs/research/07-midjourney-ideogram-recraft/7b-ideogram-text-rendering-for-logos.md` — text ≤3 words rule
- `docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md` — three SVG paths (Recraft / LLM-author / raster-vectorize)
- `docs/research/09-app-icon-generation/9a-ios-app-icon-hig-specs.md` — 824² safe zone
- `docs/research/19-agentic-mcp-skills-architectures/` — why 13 small tools and three modes
