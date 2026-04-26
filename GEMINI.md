# GEMINI.md — prompt-to-asset

This project registers a `prompt-to-asset` MCP server. When the user asks for a software asset, use the `asset_*` tool surface and follow this rule:

# Asset generation — always-on rule

When the user asks for a **logo, app icon, favicon, OG image, illustration, splash screen, icon pack, transparent mark, hero image, sticker, or any other software-development asset**, the single most important fact to apply is:

> **Producing production-grade software assets is a routing + post-processing problem, not a prompt-engineering problem.**

And the second most important fact:

> **The user may not have an image-model API key. The plugin must work anyway — there are real zero-key paths.**

This means:

1. **Do NOT just forward the user's brief to whichever image model is handy.** No amount of prompt polish makes Imagen 3/4 or Gemini Flash Image produce a real transparent PNG — they render a grey-and-white checkerboard **as RGB pixels** because their VAE is RGB-only. Transparency is a capability routing decision. Route transparent requests to `gpt-image-1.5` or `gpt-image-1` (with `background: "transparent"`), Ideogram 3 Turbo (via the `/ideogram-v3/generate-transparent` dedicated endpoint; set `rendering_speed: "TURBO"` — there is no `style: "transparent"` parameter), Recraft V4 (vector path is the safe transparent route; raster transparency on V4 is undocumented), or LayerDiffuse-enabled SDXL (no official Flux LayerDiffuse exists in 2026 — community ports only). **`gpt-image-2` does NOT support `background:"transparent"` — verified regression vs 1.5; the param 400s. Do not route transparent requests to gpt-image-2.** For every other model, matte with BiRefNet or BRIA RMBG-2.0 *after* generation.

2. **Brand text in diffusion — verified per-model ceilings, Apr 2026.** Not a blanket "garbles past 3 words" rule. Six tiers:

   - **Best:** `gpt-image-2` (released 2026-04-21, third-party tests cite ~99% character accuracy across Latin/CJK/Hindi/Bengali; OpenAI hasn't published a number — pricing also not on the pricing page yet, treat `cost_hint` as third-party). `gemini-3-pro-image-preview` (Nano Banana Pro): paragraph-length text reliable, ~94-96% accuracy, `text_ceiling_chars: 200`. `gpt-image-1.5` (LM Arena #1, dense text). `gpt-image-1` (~50 chars).
   - **Strong:** `ideogram-3` / `ideogram-3-turbo` (~3-6 words reliable, ~10 with seed retries — earlier "~80 chars" claim was over-optimistic; ~90-95% accuracy on short-to-mid wordmarks). `gemini-3.1-flash-image-preview` (Nano Banana 2): ~90% accuracy, ranked #1 on Artificial Analysis Image Arena at launch — **not weak; the older "Nano Banana garbles past 3 words" rule applies to the legacy `gemini-2.5-flash-image`, not to 3.1**. `flux-2-pro` / `fal-flux-2` / `freepik-flux-2-pro`: 5-10 words / one tagline reliable per BFL guide. `flux-2-flex`: BFL claims strongest text in the Flux 2 line (steps + guidance control).
   - **OK:** `imagen-4-fast` / `standard` / `ultra` — Google's own guidance: keep text ≤25 chars / ~3-4 short words for reliable rendering; photoreal leaders, not text. `recraft-v4` (~3-5 words). `midjourney-v7` (~15 chars with `--text`).
   - **Weak (text-free + composite always):** `flux-pro` / `flux-1.1-pro` (1-3 words). `flux-schnell` / `flux-1-schnell` / `flux-2-klein` (1-2 words). Original `gemini-2.5-flash-image` (Nano Banana 1, ~80% accuracy degrades fast). `freepik-mystic` family. `pollinations-flux`.
   - **Cannot render legible text** (per HF model card): `sdxl`, `sd-1.5`. Composite always.
   - **Mid (better than SDXL, not strong-text):** `sd3-large` / `sd3.5-large` — ~3-6 words, on par with flux-dev, behind flux-1.1-pro. Don't promote.

   For weak / cannot-render tiers over ~8 words, composite real SVG / Canvas / Skia typography in the application layer using the brand font. For paragraph-length copy on strong-text models (Nano Banana Pro, gpt-image-2), the model can render it, but composite remains safer for UI copy that must be pixel-exact.

3. **Do NOT expect a raster model to emit SVG.** None do. The three real paths: (a) Recraft V4 native vector (Feb 2026; V3 still needed if `style_id` / brand-style presets are required, as V4 dropped style support), (b) LLM-author SVG for simple geometry (fixed viewBox, no `<image>`, palette hex list, ≤40 paths) — **this is what `mode: "inline_svg"` does**, (c) raster → BiRefNet matte → K-means 6-color → `vtracer`/`potrace` → SVGO.

4. **`negative_prompt` matrix — three buckets.**

   - **Errors / rejected at schema:** `flux-1.1-pro` / `flux-pro` on fal (schema lacks the field).
   - **Officially unsupported, silently no-op:** Flux 2 family (`flux-2`, `flux-2-flex`, `fal-flux-2`, `freepik-flux-2-pro`) per BFL Flux 2 prompting guide ("FLUX.2 does not support negative prompts"). All `gpt-image-*` (silently ignored). Imagen via the **Gemini API endpoint** (silently ignored).
   - **Supported natively:** `sdxl`, `sd-1.5`, `sd3-large` / `sd-3`, `recraft-v3` / `recraft-v4`, `ideogram-3` / `ideogram-3-turbo`, Leonardo Phoenix / Diffusion XL, Stability-hosted, Adobe Firefly. **Imagen 4 via the Vertex AI endpoint accepts `negativePrompt`** (the Gemini API endpoint does not — same model, different surface).

   The universally-portable "negative" is still a positive anchor: write `"pure white background"` instead of `"no checkerboard"`.

5. **Do NOT ship a generated asset without validation.** Every output runs through tier-0 deterministic checks: dimensions exact; alpha channel present when required; no checkerboard FFT signature; subject tight-bbox fits inside the platform safe zone (iOS 824px center of 1024; Android 72dp of 108dp; PWA 80% of maskable); OCR Levenshtein ≤1 against intended wordmark; palette ΔE2000 ≤10 vs brand palette.

6. **Always surface the free, zero-key routes first.** Before suggesting a paid key, call `asset_capabilities()` and read `free_api.routes`. The ranked free programmatic order as of 2026-04-26 is: **Cloudflare Workers AI** (Flux-1-Schnell + SDXL, 10k neurons/day free, needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), **NVIDIA NIM** (Flux.1-dev / Flux.2-klein / SDXL Turbo / SD 3.5 Large / SANA, 1k requests/month free with `NVIDIA_API_KEY`, no credit card), **HF Inference** (free `HF_TOKEN`, no credit card), **Stable Horde** (anonymous queue). Pollinations is RGB-only and quality is poor — demote unless the others are unavailable. **Google image APIs are paid for programmatic image output:** Imagen 4 Fast / Standard / Ultra cost $0.02 / $0.04 / $0.06 per image, and Nano Banana models (`gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview`) require billing. For free Google-quality output, send users to AI Studio web UI (https://aistudio.google.com) as a paste-only flow + `asset_ingest_external`, or the Gemini consumer app (https://gemini.google.com). Batch API is 50% off when billing is enabled.

## Three execution modes (four paths including free api)

Every asset request resolves to one of three modes. Call `asset_capabilities()` to see which are available for the current env, then call `asset_enhance_prompt({ brief })` — the response includes `modes_available` for that specific asset type plus a `routing_trace` that reports `never_models` and `fallback_chain`. Offer the user the choice before generating. Do not pick silently.

| Mode | Key required? | Best for | How it works |
|---|---|---|---|
| **`inline_svg`** | **No** | `logo`, `favicon`, `icon_pack`, `sticker`, `transparent_mark`, simple `app_icon` masters | Server returns an SVG-authoring brief (`svg_brief`). **You (the LLM) emit the `<svg>…</svg>` inline in your reply, THEN call `asset_save_inline_svg` with that SVG so the user gets a real file on disk** (plus favicon.ico / apple-touch / AppIconSet / PWA bundle where applicable). No network. ≤40 paths per asset. |
| **`external_prompt_only`** | **No** | Anything; best for `illustration`, `hero`, text-heavy logos | Server returns the dialect-correct prompt plus a list of paste targets. Free-first ordering: **AI Studio web UI** (https://aistudio.google.com — free interactive Gemini/Imagen), **HF Inference**, **Stable Horde**, **Pollinations**, then paid UIs (Ideogram web, Recraft web, Midjourney, fal.ai, BFL Playground, ChatGPT). User generates externally, saves the file, then calls `asset_ingest_external({ image_path, asset_type })` to run the matte / vectorize / validate pipeline. |
| **`api` (free)** | **No** | Automation without a paid key | Routes to Cloudflare Workers AI (`cloudflare-flux-schnell`, `cloudflare-sdxl` — 10k neurons/day free), NVIDIA NIM (`nim-flux-1-dev`, `nim-flux-2-klein`, `nim-sdxl-turbo`, `nim-sana` — 1k requests/month free), HF Inference (`hf-sdxl`, `hf-sd3`, `hf-flux-schnell` — free `HF_TOKEN`), or Stable Horde (`horde-sdxl`, `horde-flux` — anonymous queue). Pollinations is available but RGB-only and quality is poor — demote. Google image APIs are paid for programmatic output; use AI Studio as paste-only. Same pipeline as paid api. |
| **`api` (paid)** | **Yes** (one of: `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`, `STABILITY_API_KEY`, `LEONARDO_API_KEY`, `FAL_API_KEY`, `FREEPIK_API_KEY`, `PIXAZO_API_KEY`, `REPLICATE_API_TOKEN`) | Full-fidelity, no rate limits | Server calls the routed provider, mattes, vectorizes, exports, validates. Writes a content-addressed `AssetBundle`. |

**Always prefer zero-key paths first when recommending a mode.** Call `asset_capabilities` to see `free_api.routes`. Only recommend a paid key when the task demands a capability no free route delivers (real native RGBA → `gpt-image-1`/`gpt-image-1.5` or Ideogram 3 Turbo; native SVG → Recraft V4; brand-locked illustration set → Flux.2 with 8 refs; strict 1–3-word wordmark fidelity → Ideogram 3 Turbo).

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
- `asset_capabilities()` — inventory of modes, paid/free/paste-only providers, unconfigured env vars, and zero-cost routes (`free_api.routes` enumerates Cloudflare, NVIDIA NIM, HF, Stable Horde, Pollinations, Google AI Studio paste-only, local ComfyUI, and trial routes).
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
- If no key at all: prefer `inline_svg` mode for logos/favicons/icons, OR point the user at Cloudflare Workers AI (free 10k neurons/day — needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), NVIDIA NIM (free 1k requests/month — needs `NVIDIA_API_KEY`), HF Inference (free `HF_TOKEN`), Stable Horde, or the AI Studio **web UI** (https://aistudio.google.com) for free interactive Gemini/Imagen image generation — they download the PNG and call `asset_ingest_external`. `GEMINI_API_KEY` image generation requires billing; do not advertise Imagen 4 or Nano Banana as free programmatic routes.
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


## Reminder for Gemini specifically

Gemini Flash Image and Imagen 3/4 render a checkerboard as RGB pixels when asked for a transparent background. Do not attempt transparency via prompt; route transparency requests to `asset_generate_logo` / `asset_generate_app_icon` / `asset_remove_background` — those tools route away from Gemini for transparency-required outputs.
