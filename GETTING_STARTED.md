# Getting started with prompt-to-asset

This page is the 60-second on-ramp. For architecture, research, and the full
tool surface, see [`README.md`](./README.md).

## What this does

You describe an asset — "transparent logo for a dev-tools company called
Forge", "iOS app icon, flat vector, two-tone blue" — in plain English,
inside your AI coding assistant. `prompt-to-asset` does the rest:

1. **Classifies** the brief (logo / app icon / favicon / OG / illustration / …).
2. **Picks the right model** for that asset type and those constraints.
   Imagen cannot produce transparent PNGs; SDXL cannot render legible
   wordmarks; only Recraft emits native SVG. The router knows.
3. **Rewrites the prompt** in that model's dialect (prose vs tag-salad vs
   quoted-text vs `--flags`).
4. **Picks an execution mode** based on what's actually available in your
   environment — inline SVG, paste-it-yourself, or full server-driven.

## You don't need an API key

That's the headline. Three execution modes ship, and every single one can finish on $0:

| Mode                   | Key? | How it works                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inline_svg`           | ❌   | Your AI assistant writes the `<svg>` directly in its reply, then `asset_save_inline_svg` writes the bundle to disk.                                                                                                                                                                                                                                                |
| `external_prompt_only` | ❌   | The server gives you the enhanced prompt + a list of web UIs to paste into (Cloudflare Workers AI, HF Inference, Pollinations, Stable Horde, Google AI Studio "Nano Banana" — free interactive UI only, no free API since 2025-12 — Ideogram, Midjourney, Recraft, fal.ai, BFL Playground…). Save the result, call `asset_ingest_external` to finish the pipeline. |
| `api` (free)           | ❌   | Zero-signup HTTP via Pollinations, anonymous Stable Horde queue, or HF free tier via `HF_TOKEN`. Routes to the same pipeline as paid `api`. Rate limits apply.                                                                                                                                                                                                     |
| `api` (paid)           | ✅   | Full server-driven pipeline with no rate limits — set any of `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`, `STABILITY_API_KEY`, `LEONARDO_API_KEY`, `FAL_API_KEY`.                                                                                                                                                     |

### Ranked zero-cost options

Run `p2a doctor` to see which are live in your shell right now. Rough recommendation order:

1. **inline_svg** — best for logos / favicons / icon packs. Instant, deterministic, zero network.
2. **Cloudflare Workers AI** — set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (both free from https://dash.cloudflare.com → Workers AI). 10,000 neurons/day covers roughly 900 Flux-1-Schnell images or 5,000 SDXL-Lightning runs. Hosts Flux.2 dev/klein, Flux-1 Schnell, SDXL, DreamShaper, Leonardo Phoenix, Lucid Origin. Best free programmatic route for images.
3. **HF Inference** — set `HF_TOKEN` from https://huggingface.co/settings/tokens (free read token). SDXL / SD3 / Flux dev+schnell hosted.
4. **Pollinations.ai** — literal zero-signup: `curl -o out.png "https://image.pollinations.ai/prompt/<urlencoded>?model=flux&nologo=true"`. Rate limit ~1 req/15s anonymous; RGB only.
5. **Stable Horde** — anonymous kudos bucket works; queue-based, minutes to hours in the free lane. `HORDE_API_KEY` for priority.
6. **Google AI Studio (paste-only)** — the web UI at https://aistudio.google.com is still free for interactive Nano Banana / Imagen generation. The API is no longer free (see note below). Generate in the UI, download the PNG, call `asset_ingest_external` to bring it into the pipeline.
7. **Ideogram free weekly tier** — your existing `IDEOGRAM_API_KEY` works against ~10 credits/week (~40 images) without a paid sub. Watermark on free-tier output.
8. **Leonardo free daily** — `LEONARDO_API_KEY` against 150 fast tokens/day; Phoenix, Lucid Origin, Kontext. Leonardo's ToS claims rights to generated output — read it.
9. **Replicate trial** — `REPLICATE_API_TOKEN` gives a one-time signup credit, then metered. Useful as a unified fallback since Replicate hosts Flux 1.1 Pro, SDXL, SD3, Recraft V3/V4, and Ideogram V3 behind one key.
10. **external_prompt_only** — paste the enhanced prompt into ChatGPT / Midjourney / your own account. Works with whatever sub you already pay for.

**Why Google dropped off the free-API list.** In December 2025 Google removed all image-generation models from the universal Gemini free API tier. `gemini-3.1-flash-image-preview` (Nano Banana 2), `gemini-3-pro-image-preview` (Nano Banana Pro), `gemini-2.5-flash-image`, and all `imagen-4.0-*` variants now require a billing-enabled GCP project. An unbilled `GEMINI_API_KEY` returns HTTP 429 with `limit: 0` on image endpoints — that's a daily quota of zero, not a rate limit. The key still works on the free tier for text / multimodal / embeddings; only image-gen is gated. Paid pricing is Nano Banana $0.039/img, Imagen 4 Fast $0.02/img, Nano Banana Pro $0.067 (1K) / $0.101 (2K) / $0.151 (4K) — route via `GEMINI_API_KEY` after enabling billing, or use the free AI Studio web UI plus `asset_ingest_external` for a paste-only path.

Other free routes that exist but aren't wired as first-class providers (cite them in `p2a doctor` or use manually):

- **g4f.dev** — OpenAI-compatible meta-router; reaches Pollinations, NVIDIA NIM, Google, and xAI Grok image through one endpoint. Stability depends on third-party aggregation.
- **Puter.js** — browser SDK where the end user (not you) pays via their Puter account. Zero-cost to ship if your product is a web app.
- **Vheer.com** — unlimited web UI, no documented API.

## Who this is for

- Indie devs and small teams who need shippable brand assets without
  opening Figma.
- Anyone who's asked an AI for a "logo" and gotten back a PNG of the
  letter Q.
- Anyone setting up a new side project and burning an afternoon on the
  favicon / app-icon / OG-image matrix.
- Users who already pay for Midjourney or Ideogram but don't have API
  access — `external_prompt_only` is for you.

## Quickstart (Claude Code, zero-key)

```bash
# 1. Install
npm i -g prompt-to-asset        # global (recommended)
# or: npm i -D prompt-to-asset  # per-project
# or: npx prompt-to-asset <cmd> # zero install — every command works

# 2. Scaffold + register
p2a init --register             # writes brand.json + .cursor/mcp.json /
                                # .vscode/mcp.json / .windsurf/mcp.json;
                                # optionally runs `claude mcp add` for you

# 3. Check what's on
p2a doctor                      # ranked routes, missing deps, recommendations
```

Restart Claude Code. You should see **17 new `asset_*` tools** (2 discovery, 7 generators, 2 round-trip endpoints, 5 pipeline primitives, and the Phase-4 LoRA trainer). The same binary doubles as a scripting tool — see the [Standalone CLI section](#standalone-cli-no-ide-required).

### Or run fully from a clone (contributors)

```bash
git clone https://github.com/MohamedAbdallah-14/prompt-to-asset.git
cd prompt-to-asset
npm install
npm run build
npm run test:run                # 200+ tests; all green on a fresh clone
npm run sync                    # regenerate cross-IDE mirrors (Cursor, Codex, Gemini, …)
```

## Standalone CLI (no IDE required)

The same binary doubles as a scripting tool. No IDE or AI assistant needed.

```bash
# Inventory — which modes + providers are live, which optional deps are installed.
p2a doctor
p2a doctor --data               # registry ↔ routing-table consistency (CI-friendly)

# Interactive route picker — asset type + constraints → ranked route + paste targets.
p2a pick

# Interactive setup in your project dir — detects Next / Astro / Vite /
# Flutter / Expo / Xcode / Android and writes a brand.json scaffold.
cd ~/src/my-app && p2a init --register

# Fan a 1024² master out to every platform (appicon.co / flutter_launcher_icons parity).
p2a export ./master.png --app-name MyApp --theme "#2563eb" --ios18

# Games: pack frames, emit 9-slice.
p2a sprite-sheet ./frames --padding 2 --out build/hero.png --atlas build/hero.json
p2a nine-slice ./panel.png --guides 16,16,16,16 --android-9patch
```

Running the binary with no args still starts the MCP stdio server — existing IDE registrations keep working.

## What's new in 0.2

- **`p2a pick`** — interactive route picker (CLI TUI; answers "which model should I use" without the web).
- **`p2a init --register`** — writes `.cursor/mcp.json` / `.vscode/mcp.json` / `.windsurf/mcp.json` for you, and optionally runs `claude mcp add`.
- **Clarifying questions.** `asset_enhance_prompt` returns `clarifying_questions[]` when the brief is ambiguous (long wordmark, missing palette, generic brief). Your AI assistant surfaces these via AskUserQuestion before generating.
- **Regenerate loop.** `asset_generate_logo` accepts `max_retries` (0–4). On a tier-0 validation fail, the server auto-repairs (re-route away from Imagen on alpha fail, pin hex on palette drift, drop text on OCR fail) and retries. Hard-capped for cost.
- **Tier-1 VQAScore.** `asset_validate --run-vqa` POSTs to `PROMPT_TO_BUNDLE_VQA_URL` for a 0..1 alignment score. Point it at a hosted VQAScore / Qwen-VL / Claude Vision endpoint.
- **Phase-4 brand LoRA.** `asset_train_brand_lora` MCP tool + `comfyui-sdxl` / `comfyui-flux` / `comfyui-flux-lora` models. Point `PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL` + `PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL` at your own Modal / Runpod / self-host deployment.
- **Soft-fallback for paste-only.** Midjourney / Firefly / Krea requested in `api` mode no longer throws — the server auto-swaps to the first API-reachable fallback or returns an `ExternalPromptPlan` with paste URLs.
- **Security.** API keys in env only + `redact()` scrubbing in error surfaces; `safePath` allow-list guard on every `image_path` / `output_dir`; unconditional SVG XSS sanitizer before any disk write; `P2A_MAX_SPEND_USD_PER_RUN` cost cap.

## First prompt

Try:

> "Make me a transparent logo for a developer-tools company called Forge.
> Flat vector, two-tone warm orange on neutral."

Your assistant will:

1. Call `asset_capabilities()` → report the modes available.
2. Call `asset_enhance_prompt({ brief: "…" })` → get the classification (logo), the routed model, the rewritten prompt, and the three modes that apply.
3. Ask you which mode you want.

If you pick `inline_svg`, your assistant writes the `<svg>` directly in the chat AND calls `asset_save_inline_svg` to write the file to disk (plus favicon.ico / apple-touch / AppIconSet / PWA bundle where applicable). You get both a preview in chat and real files you can open — e.g. `./assets/favicon-1744102833/icon.svg`, `favicon.ico`, `apple-touch-icon.png`, etc.

If you pick `external_prompt_only`, the assistant shows you the refined prompt and the paste targets ("Open Ideogram, paste this, set Style = Transparent"). Generate there, download, then run:

> "call `asset_ingest_external` with that PNG I just downloaded"

The server mattes it, vectorizes it, validates alpha coverage and path count, and returns the bundle.

If you pick `api`, you'll need a provider key. Set one via env var before starting Claude Code (see below).

## Other IDEs

`npm run sync` regenerates manifests for Cursor, Windsurf, Codex, Gemini CLI, Cline, and GitHub Copilot. The tool surface is identical across IDEs; only registration differs.

- **Cursor:** `.cursor/mcp.json` is generated automatically.
- **Windsurf:** `.windsurf/` manifests are generated.
- **Codex CLI / Gemini CLI / Cline:** per-IDE manifests in `.codex/`, `gemini-extension.json`, `.clinerules/`.

See [`docs/install.md`](./docs/install.md) for per-IDE registration details.

## Environment variables (optional)

Every provider key is optional. Setting a key enables `api` mode for that provider; routing falls back to available providers automatically. The plugin does **not** require any key to be useful.

| Variable                                         | Provider                             | Enables api mode for                                                        | Free tier?                                                         |
| ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`                                 | OpenAI `gpt-image-1` / `1.5`         | Transparent PNGs, text ≤ 3 words                                            | Paid                                                               |
| `IDEOGRAM_API_KEY`                               | Ideogram 3 / 3 Turbo                 | 1–3 word wordmarks, transparent style                                       | Paid                                                               |
| `RECRAFT_API_KEY`                                | Recraft V3/V4                        | Native SVG, vector illustrations (V4 primary; V3 for brand-style pipelines) | Paid                                                               |
| `BFL_API_KEY`                                    | Black Forest Labs (Flux Pro/Flux.2)  | Photoreal hero art, multi-ref brand lock                                    | Paid                                                               |
| `GEMINI_API_KEY`                                 | Google Imagen 4 / Gemini Flash Image | Photoreal, multimodal edits (up to 3 refs)                                  | Paid (text/multimodal free; image-gen needs billing since 2025-12) |
| `STABILITY_API_KEY`                              | Stability AI (SD 1.5/SDXL/SD3)       | Open-weight hosted + native `negative_prompt`                               | Paid                                                               |
| `LEONARDO_API_KEY`                               | Leonardo Phoenix / Diffusion XL      | SDXL-derivative with presets                                                | Paid                                                               |
| `FAL_API_KEY`                                    | fal.ai aggregator                    | Alt path for Flux / SDXL                                                    | Paid                                                               |
| `HF_TOKEN`                                       | Hugging Face Inference API           | SDXL / SD3 / Flux dev+schnell hosted                                        | **Free** (read token)                                              |
| `POLLINATIONS_TOKEN`                             | Pollinations.ai (optional)           | Higher rate limits (zero-key still works anon)                              | **Free**                                                           |
| `HORDE_API_KEY`                                  | Stable Horde (optional)              | Priority in the community GPU queue (anon works)                            | **Free**                                                           |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers AI                | Flux.2/Schnell, SDXL, SDXL-Lightning, DreamShaper, Leonardo Phoenix + Lucid | **Free** (10k neurons/day)                                         |
| `REPLICATE_API_TOKEN`                            | Replicate                            | Flux 1.1 Pro, SDXL, SD3, Recraft V3/V4, Ideogram V3                         | **Trial** (then paid)                                              |

See [`.env.example`](./.env.example) for the full list, including pipeline extension URLs.

### Pipeline extension points

These let you plug hosted post-processing behind the MCP without changing code. All are optional.

| Variable                                 | What it enables                                                                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROMPT_TO_BUNDLE_RMBG_URL`              | `asset_remove_background` POSTs the image to this URL and expects an RGBA PNG back. Point at a hosted BiRefNet / BRIA RMBG / rembg endpoint. Without it, matting falls back to a local white-chroma difference.   |
| `PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL` | `asset_vectorize` tries this URL first with the raster body; expects an SVG back. Use with a Recraft vectorize proxy.                                                                                             |
| `PROMPT_TO_BUNDLE_UPSCALER_URL`          | `asset_upscale_refine` POSTs the image + `target_size` param; expects a PNG upscaled at the requested dimension.                                                                                                  |
| `PROMPT_TO_BUNDLE_VLM_URL`               | `asset_validate` with `run_vlm: true` POSTs `{ image_base64, asset_type, intended_text?, brand_primary? }` and expects `{ pass, score?, notes? }` — see `packages/mcp-server/src/pipeline/validate.ts::tier2Vlm`. |
| `PROMPT_TO_BUNDLE_OG_FONT`               | Absolute path to a TTF/OTF used by the Satori OG renderer. When unset, the server tries the optional `@fontsource/inter` dep; if that's also missing, OG rendering falls back to a system-font SVG path.          |

### Installing optional binaries

The production vectorization path shells out to `vtracer` or `potrace` when they're on your `PATH`. Install whichever you prefer:

```bash
# macOS
brew install vtracer potrace

# Rust toolchain (any OS)
cargo install vtracer
```

If neither is installed, `asset_vectorize` falls back to a built-in posterize run-length encoder that works but can blow the path-count budget on complex images — you'll get a warning in the tool response.

## When not to use this

- You already have a designer producing brand assets. Use them.
- You need genuinely novel conceptual illustration. The pipeline produces
  _shippable_ assets from _briefs_, not award-winning editorial art.
- You need pixel-perfect control over every brush stroke. Open Illustrator.

## Where to go next

- **Install per IDE:** [`docs/install.md`](./docs/install.md)
- **Architecture, tool surface, and routing table:** [`README.md`](./README.md)
- **Research basis:** [`docs/research/SYNTHESIS.md`](./docs/research/SYNTHESIS.md)
- **Research-to-code map (what's wired, what's not):** [`docs/RESEARCH_MAP.md`](./docs/RESEARCH_MAP.md)
- **Contributing (SSOT editing flow):** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Security policy:** [`SECURITY.md`](./SECURITY.md)
