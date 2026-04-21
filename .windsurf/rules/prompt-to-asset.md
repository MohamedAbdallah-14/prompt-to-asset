---
description: Asset generation — route, rewrite, generate, validate.
activation: always_on
---

# Asset generation — always-on rule

When the user asks for a **logo, app icon, favicon, OG image, illustration, splash screen, icon pack, transparent mark, hero image, sticker, or any other software-development asset**, the single most important fact to apply is:

> **Producing production-grade software assets is a routing + post-processing problem, not a prompt-engineering problem.**

And the second most important fact:

> **The user may not have an image-model API key. The plugin must work anyway — there are real zero-key paths.**

This means:

1. **Do NOT just forward the user's brief to whichever image model is handy.** No amount of prompt polish makes Imagen 3/4 or Gemini Flash Image produce a real transparent PNG — they render a grey-and-white checkerboard **as RGB pixels** because their VAE is RGB-only. Transparency is a capability routing decision. Route transparent requests to `gpt-image-1` (with `background: "transparent"`), Ideogram 3 Turbo (`style: "transparent"`), Recraft V3, or LayerDiffuse-enabled Flux/SDXL. For every other model, matte with BiRefNet or BRIA RMBG-2.0 *after* generation.

2. **Do NOT render brand text in a diffusion sampler past 3 words.** Even Ideogram 3 and `gpt-image-1` (the two best text renderers) misspell past ~3 words; Imagen and SD garble anything longer than a single glyph. Generate a text-free mark; composite real SVG / Canvas / Skia typography in the application layer using the brand font.

3. **Do NOT expect a raster model to emit SVG.** None do. The three real paths: (a) Recraft V3 native vector, (b) LLM-author SVG for simple geometry (fixed viewBox, no `<image>`, palette hex list, ≤40 paths) — **this is what `mode: "inline_svg"` does**, (c) raster → BiRefNet matte → K-means 6-color → `vtracer`/`potrace` → SVGO.

4. **Do NOT use `negative_prompt` on Flux — it errors.** Imagen and `gpt-image-1` silently ignore it. SD / SDXL / SD3 / Leonardo / Stability-hosted DO support it natively. The universally-portable "negative" is a positive anchor: write `"pure white background"` not `"no checkerboard"`.

5. **Do NOT ship a generated asset without validation.** Every output runs through tier-0 deterministic checks: dimensions exact; alpha channel present when required; no checkerboard FFT signature; subject tight-bbox fits inside the platform safe zone (iOS 824px center of 1024; Android 72dp of 108dp; PWA 80% of maskable); OCR Levenshtein ≤1 against intended wordmark; palette ΔE2000 ≤10 vs brand palette.

6. **Always surface the free, zero-key routes first.** Before suggesting a paid key, call `asset_capabilities()` and read `free_api.routes`. Pollinations.ai is literally zero-signup (HTTP GET to `image.pollinations.ai`). `GEMINI_API_KEY` from `https://aistudio.google.com/apikey` is free with no credit card and gives ~1,500 Nano Banana images/day. HF Inference (free `HF_TOKEN`) and Stable Horde (anonymous queue) also work.

## Three execution modes (four paths including free api)

Every asset request resolves to one of three modes. Call `asset_capabilities()` to see which are available for the current env, then call `asset_enhance_prompt({ brief })` — the response includes `modes_available` for that specific asset type plus a `routing_trace` that reports `never_models` and `fallback_chain`. Offer the user the choice before generating. Do not pick silently.

| Mode | Key required? | Best for | How it works |
|---|---|---|---|
| **`inline_svg`** | **No** | `logo`, `favicon`, `icon_pack`, `sticker`, `transparent_mark`, simple `app_icon` masters | Server returns an SVG-authoring brief (`svg_brief`). **You (the LLM) emit the `<svg>…</svg>` inline in your reply, THEN call `asset_save_inline_svg` with that SVG so the user gets a real file on disk** (plus favicon.ico / apple-touch / AppIconSet / PWA bundle where applicable). No network. ≤40 paths per asset. |
| **`external_prompt_only`** | **No** | Anything; best for `illustration`, `hero`, text-heavy logos | Server returns the dialect-correct prompt plus a list of paste targets. Free-first ordering: **Pollinations**, **HF Inference**, **Stable Horde**, **Google AI Studio / Nano Banana (free tier)**, then paid UIs (Ideogram web, Recraft web, Midjourney, fal.ai, BFL Playground, ChatGPT). User generates externally, saves the file, then calls `asset_ingest_external({ image_path, asset_type })` to run the matte / vectorize / validate pipeline. |
| **`api` (free)** | **No** | Automation without a paid key | Routes to Pollinations (`pollinations-flux` et al. — zero-signup HTTP GET), Stable Horde (`horde-sdxl`, `horde-flux` — anonymous queue), or HF Inference (`hf-sdxl`, `hf-sd3`, `hf-flux-schnell` — free `HF_TOKEN`). Rate-limited; Pollinations is RGB-only. Same pipeline as paid api. |
| **`api` (paid)** | **Yes** (one of: `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`, `STABILITY_API_KEY`, `LEONARDO_API_KEY`, `FAL_API_KEY`) | Full-fidelity, no rate limits | Server calls the routed provider, mattes, vectorizes, exports, validates. Writes a content-addressed `AssetBundle`. |

**Always prefer zero-key paths first when recommending a mode.** Call `asset_capabilities` to see `free_api.routes`. Only recommend a paid key when the task demands a capability no free route delivers (real native RGBA → `gpt-image-1` or Ideogram 3 Turbo; native SVG → Recraft V3; brand-locked illustration set → Flux.2 with 8 refs; strict 1–3-word wordmark fidelity → Ideogram 3 Turbo).

**Recommended default flow for each asset request:**

1. Call `asset_capabilities()` — read `free_api.routes` before anything else.
2. Call `asset_enhance_prompt({ brief })`.
3. **If the response contains a `clarifying_questions[]` array, surface each entry via AskUserQuestion (or the equivalent) BEFORE calling a generator.** These questions gate material output quality — long wordmark (>3 words), missing brand palette on app_icon, underspecified brief. Each entry has `{id, header, question, options[], required, why}`. Skip only when all entries are `required: false` and the user has expressed preference for speed over quality.
4. Look at `modes_available` + `routing_trace.never_models` (explains which models the router refuses for this brief) + `routing_trace.research_sources` (the evidence behind the decision).
5. If `inline_svg` is present: mention it first — it's instant, zero-key, deterministic. Then free `api` routes. Paid `api` last unless the brief genuinely needs a paid-only capability.
6. Ask the user which mode they want. Keep the question short.
7. Call the relevant `asset_generate_*` tool with `mode: "<user's choice>"`.
8. For `inline_svg` results: read `svg_brief` and `instructions_to_host_llm`, emit the `<svg>` inline as a code block, **then immediately call `asset_save_inline_svg({ svg, asset_type })`** so the server writes the file (and the platform bundle for favicon/app_icon). Report the `variants[].path` list to the user so they know where the files landed.
9. For `external_prompt_only` results: present `enhanced_prompt` to the user, list the top paste targets with URLs (free-first), and tell them to call `asset_ingest_external` after saving the generated image.
10. For `api` results: present the bundle paths (`variants[].path`) and any validation warnings.

**Paste-only providers (Midjourney, Firefly, Krea) with `mode: "api"` no longer throw (as of 0.2).** The server auto-swaps to the first API-reachable model in the fallback chain and surfaces a warning explaining the swap. If the whole chain is paste-only, you receive an `ExternalPromptPlan` rather than an error — relay the paste targets to the user.

**Cost guardrail.** If the user has set `P2A_MAX_SPEND_USD_PER_RUN`, an api-mode call may throw `CostBudgetExceededError` before hitting the provider. Relay the estimate + cap verbatim — do not paper over with a retry loop.

## MCP tool surface (24 tools)

**Discovery / capability (read-only):**
- `asset_capabilities()` — inventory of modes, paid/free/paste-only providers, unconfigured env vars, and zero-key routes (`free_api.routes` enumerates Pollinations, Stable Horde, HF, Google AI Studio free tier, local ComfyUI).
- `asset_doctor({ check_data? })` — structured environment inventory (native deps, ranked free-tier routes, paid keys, paste-only surfaces, pipeline URLs, mode flags, "what to try next" hints). MCP equivalent of `p2a doctor`.
- `asset_models_list({ free?, paid?, paste_only?, rgba?, svg? })` — browse the 60+ model registry with filters.
- `asset_models_inspect({ id })` — full capability dump for one model id (or aka alias).

**Routing / prompt-engineering:**
- `asset_enhance_prompt({ brief, asset_type?, brand_bundle? })` → AssetSpec + modes_available + svg_brief? + paste_targets? + `routing_trace { never_models, fallback_chain, research_sources }`.

**Generation (three-mode):**
- `asset_generate_logo`, `asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`, `asset_generate_illustration` — each takes `mode?: "inline_svg" | "external_prompt_only" | "api"`. Omit for auto-select.
- `asset_generate_splash_screen`, `asset_generate_hero` — cross-platform splash bundle + marketing hero art. `external_prompt_only` / `api` only (no inline_svg — path budget too small for composed scenes; generate a mark inline_svg first, then pass it via `existing_mark_svg`).

**Round-trip + pipeline primitives:**
- `asset_save_inline_svg({ svg, asset_type })` — **round-trip endpoint for `inline_svg` mode.** Call immediately after emitting the `<svg>` in chat. Writes master.svg and, for favicon/app_icon, the full platform bundle. Returns file paths.
- `asset_ingest_external({ image_path, asset_type })` — round-trip endpoint for `external_prompt_only` mode. Runs matte → vectorize → validate → bundle.
- `asset_remove_background`, `asset_vectorize`, `asset_upscale_refine` — pipeline primitives.
- `asset_validate({ image, asset_type, brand_bundle? })` — tier-0/1/2 QA stack.
- `asset_brand_bundle_parse({ source })` → canonical BrandBundle.

**Project setup + offline fan-out (no key required):**
- `asset_init_brand({ app_name, palette?, assets_dir? })` — scaffold `brand.json` + ensure the assets dir + detect the framework (Next.js / Expo / Flutter / Xcode / Astro / Vite / Remix / Nuxt / React Native / Electron / Node). Does NOT handle IDE MCP registration — the user owns that one terminal step.
- `asset_export_bundle({ master_path, platforms?, bg?, app_name?, theme?, ios18? })` — fan a 1024² master PNG out to iOS AppIconSet + Android adaptive + PWA maskable + visionOS parallax + Flutter launcher + favicon bundle. Offline; same code as `p2a export`.
- `asset_sprite_sheet({ dir, layout?, columns?, padding?, out?, atlas? })` — pack frames into a sheet + TexturePacker-compatible atlas (Phaser/PixiJS/Godot/Unity).
- `asset_nine_slice({ image, guides, android_9patch? })` — emit 9-slice JSON + CSS + engine-ready numbers + optional Android `.9.png`.

The tools are annotated `readOnlyHint` / `idempotentHint` where appropriate so Cursor auto-approves without prompting.

**Design principle.** The human's interface is natural language in chat plus a terminal only for API keys. Everything else — doctor checks, model inspection, platform fan-out, sprite sheets, 9-slice, brand.json scaffolding — should be driven by the LLM via these tools, not asked of the user as a shell command. When MCP isn't available, the same commands exist as `p2a ...` CLI with `--json` for machine-readable output that the LLM can consume over Bash.

## Fallback when MCP is unavailable

If the `asset_*` tools are not registered, still apply the six facts above in whatever generation flow is available:

- Pick the right model (use `data/routing-table.json` as a reference).
- Rewrite the prompt in that model's dialect (tag-salad for SD, prose for Flux/Imagen/`gpt-image-1`, quoted strings for Ideogram text, `--flags` for Midjourney).
- If no key at all: author simple marks as SVG inline, OR point the user at Pollinations (`curl -o out.png "https://image.pollinations.ai/prompt/<urlencoded>?model=flux&nologo=true"`), OR send them to `https://aistudio.google.com/apikey` for a free `GEMINI_API_KEY`.
- If the user has a web-tool account: give them the prompt + the URL, tell them where it goes.
- Matte externally before declaring an asset "done."
- Validate against the target platform's spec (iOS 824², Android 72dp, PWA 80% maskable, favicon 16×16 legibility) before handing the file to the user.

**Never declare an asset ready without alpha validation, safe-zone bbox check, and — if text is involved — an OCR/Levenshtein check of the wordmark.**

## Supporting skills (engage when applicable)

The plugin ships 12 skills. The 8 asset-type skills (`logo`, `app-icon`, `favicon`, `og-image`, `illustration`, `transparent-bg`, `vectorize`, plus the `asset-enhancer` orchestrator) cover the happy path. Four more skills cover the long tail:

- **`svg-authoring`** — engaged whenever `asset_generate_*` returns an `InlineSvgPlan`. Enforces viewBox, path-budget, palette, optical balance, and small-scale legibility rules so the emitted SVG survives `asset_save_inline_svg` validation. Read this before writing any `<svg>` block.
- **`t2i-prompt-dialect`** — engaged during prompt rewriting. Per-model rules (gpt-image-1 prose, Imagen ≥30 words, SDXL 77-token tag-soup with `BREAK`, Flux no `negative_prompt`, Ideogram quoted text, Recraft `controls.colors`). Handles negative→affirmative translation and brand-palette injection per dialect.
- **`asset-validation-debug`** — engaged when `asset_validate` or a generator returns warnings. Maps failure codes (`T0_CHECKERBOARD`, `T0_ALPHA_MISSING`, `T1_PALETTE_DRIFT`, `T1_TEXT_MISSPELL`, etc.) to repair primitives (matte, inpaint, route change, seed sweep, composite). Enforces a retry budget so Claude does not loop on hopeless regenerations.
- **`brand-consistency`** — engaged for multi-asset sets. Builds `BrandBundle`, enforces palette per model (Recraft `controls.colors`, Midjourney `--sref`, IP-Adapter), validates CSD style similarity + ΔE2000, and promotes accepted assets into the reference set so each new generation tightens the brand lock. Covers LoRA training ROI (>20 assets).
