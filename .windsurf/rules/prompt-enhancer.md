---
description: Asset generation — route, rewrite, generate, validate.
activation: always_on
---

# Asset generation — always-on rule

When the user asks for a **logo, app icon, favicon, OG image, illustration, splash screen, icon pack, transparent mark, hero image, sticker, or any other software-development asset**, the single most important fact to apply is:

> **Producing production-grade software assets is a routing + post-processing problem, not a prompt-engineering problem.**

And the second most important fact:

> **The user may not have an image-model API key. The plugin must work anyway.**

This means:

1. **Do NOT just forward the user's brief to whichever image model is handy.** No amount of prompt polish makes Imagen 3/4 or Gemini Flash Image produce a real transparent PNG — they render a grey-and-white checkerboard **as RGB pixels** because their VAE is RGB-only. Transparency is a capability routing decision. Route transparent requests to `gpt-image-1` (with `background: "transparent"`), Ideogram 3 Turbo (`style: "transparent"`), Recraft V3, or LayerDiffuse-enabled Flux/SDXL. For every other model, matte with BiRefNet or BRIA RMBG-2.0 *after* generation.

2. **Brand text in diffusion — model-specific ceilings.** For **strong-text renderers** — `gpt-image-1`, `gpt-image-1.5`, `ideogram-3` / `ideogram-3-turbo`, and `gemini-3-pro-image-preview` (Nano Banana Pro, released late 2025) — short wordmarks and taglines up to roughly 3 words / ~20 chars render reliably; include the wordmark in the prompt (in double quotes, with position and weight specified). For **every other model** — Imagen, Flux (any variant), Stable Diffusion, Nano Banana non-Pro (`gemini-3-flash-image`), Pollinations — diffusion still garbles past ~3 words (often past a single glyph on SD). Default to text-free generation + composite real SVG / Canvas / Skia typography in the application layer using the brand font. For anything over ~8 words (a paragraph, a list, real UI copy), composite always, even on the strong-text renderers.

3. **Do NOT expect a raster model to emit SVG.** None do. The three real paths: (a) Recraft V3 native vector, (b) LLM-author SVG for simple geometry (fixed viewBox, no `<image>`, palette hex list, ≤40 paths) — **this is what `mode: "inline_svg"` does**, (c) raster → BiRefNet matte → K-means 6-color → `vtracer`/`potrace` → SVGO.

4. **Do NOT use `negative_prompt` on Flux — it errors.** Imagen and `gpt-image-1` silently ignore it. The universally-portable "negative" is a positive anchor: write `"pure white background"` not `"no checkerboard"`.

5. **Do NOT ship a generated asset without validation.** Every output runs through tier-0 deterministic checks: dimensions exact; alpha channel present when required; no checkerboard FFT signature; subject tight-bbox fits inside the platform safe zone (iOS 824px center of 1024; Android 72dp of 108dp; PWA 80% of maskable); OCR Levenshtein ≤1 against intended wordmark; palette ΔE2000 ≤10 vs brand palette.

## Three execution modes

Every asset request resolves to one of three modes. Call `asset_capabilities()` to see which are available for the current env, then call `asset_enhance_prompt({ brief })` — the response includes `modes_available` for that specific asset type. Offer the user the choice before generating. Do not pick silently.

| Mode | Key required? | Best for | How it works |
|---|---|---|---|
| **`inline_svg`** | **No** | `logo`, `favicon`, `icon_pack`, `sticker`, `transparent_mark`, simple `app_icon` masters | Server returns an SVG-authoring brief (`svg_brief`). **You (the LLM) emit the `<svg>…</svg>` inline in your reply, THEN call `asset_save_inline_svg` with that SVG so the user gets a real file on disk** (plus favicon.ico / apple-touch / AppIconSet / PWA bundle where applicable). No network. ≤40 paths per asset. |
| **`external_prompt_only`** | **No** | Anything; best for `illustration`, `hero`, text-heavy logos | Server returns the dialect-correct prompt plus a list of paste targets. Free-first ordering: **AI Studio web UI** (https://aistudio.google.com — still free for interactive Gemini/Imagen, unlike the API), Pollinations, HF Inference, Stable Horde, then paid UIs (Ideogram web, Recraft web, Midjourney, fal.ai, BFL Playground). User generates externally, saves the file, then calls `asset_ingest_external({ image_path, asset_type })` to run the matte / vectorize / validate pipeline. Note: `GEMINI_API_KEY` is NOT a free image-gen route — Google removed that tier in December 2025. |
| **`api`** | **Yes** (at least one: `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`) | Full-fidelity automated pipeline | Server calls the routed provider, mattes, vectorizes, exports, validates. Writes a content-addressed `AssetBundle`. |

**If the user has not set any API key, do not fabricate one or pretend api mode works.** Tell them what's available now, and give them the choice between `inline_svg` and `external_prompt_only`. If they want api mode, tell them exactly which env var to set (the response from `asset_capabilities` lists them).

**Recommended default flow for each asset request:**

1. Call `asset_enhance_prompt({ brief })`.
2. Look at `modes_available`.
3. If `inline_svg` is present: mention it first — it's instant, zero-key. But also mention `external_prompt_only` and `api` when available.
4. Ask the user which mode they want. Keep the question short.
5. Call the relevant `asset_generate_*` tool with `mode: "<user's choice>"`.
6. For `inline_svg` results: read `svg_brief` and `instructions_to_host_llm`, emit the `<svg>` inline as a code block, **then immediately call `asset_save_inline_svg({ svg, asset_type })`** so the server writes the file (and the platform bundle for favicon/app_icon). Report the `variants[].path` list to the user so they know where the files landed.
7. For `external_prompt_only` results: present `enhanced_prompt` to the user, list the top paste targets with URLs, and tell them to call `asset_ingest_external` after saving the generated image.
8. For `api` results: present the bundle paths (`variants[].path`) and any validation warnings.

## MCP tool surface (14 tools)

- `asset_capabilities()` — read-only inventory of modes, providers, and unconfigured env vars.
- `asset_enhance_prompt({ brief, asset_type?, brand_bundle? })` → AssetSpec + modes_available + svg_brief? + paste_targets?.
- `asset_generate_logo`, `asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`, `asset_generate_illustration` — each takes `mode?: "inline_svg" | "external_prompt_only" | "api"`. Omit for auto-select.
- `asset_save_inline_svg({ svg, asset_type })` — **round-trip endpoint for `inline_svg` mode.** Call immediately after emitting the `<svg>` in chat. Writes master.svg and, for favicon/app_icon, the full platform bundle. Returns file paths.
- `asset_ingest_external({ image_path, asset_type })` — round-trip endpoint for `external_prompt_only` mode. Runs matte → vectorize → validate → bundle.
- `asset_remove_background`, `asset_vectorize`, `asset_upscale_refine` — pipeline primitives.
- `asset_validate({ image, asset_type, brand_bundle? })` — tier-0/1/2 QA stack.
- `asset_brand_bundle_parse({ source })` → canonical BrandBundle.

The tools are annotated `readOnlyHint` / `idempotentHint` where appropriate so Cursor auto-approves without prompting.

## Fallback when MCP is unavailable

If the `asset_*` tools are not registered, still apply the five facts above in whatever generation flow is available:

- Pick the right model (use `data/routing-table.json` as a reference).
- Rewrite the prompt in that model's dialect (tag-salad for SD, prose for Flux/Imagen/`gpt-image-1`, quoted strings for Ideogram text).
- If no key at all: author simple marks as SVG inline.
- If the user has a web-tool account: give them the prompt + the URL, tell them where it goes.
- Matte externally before declaring an asset "done."
- Validate against the target platform's spec (iOS 824², Android 72dp, PWA 80% maskable, favicon 16×16 legibility) before handing the file to the user.

**Never declare an asset ready without alpha validation, safe-zone bbox check, and — if text is involved — an OCR/Levenshtein check of the wordmark.**
