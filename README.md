# prompt-to-asset

> Turn a one-line brief into a complete, ship-ready asset bundle — app icons, favicons, OG images, illustrations, splash screens, sprite sheets. Route to the right model, matte / vectorize / validate, and fan out to every platform from one 1024² master. Works **without any API key** via Pollinations, Stable Horde, HF free-tier, or inline SVG from your AI assistant.

[![CI](https://github.com/yourorg/prompt-to-asset/actions/workflows/ci.yml/badge.svg)](https://github.com/yourorg/prompt-to-asset/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.11-brightgreen.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-1.0-8b5cf6.svg)](https://modelcontextprotocol.io)
[![Zero-key](https://img.shields.io/badge/zero--key-ready-16a34a.svg)](#zero-key-quickstart)

`prompt-to-asset` is a CLI **and** MCP server for developer asset generation. Three pieces:

1. **A prompt enhancer + model router.** Classify the brief, pick the right model (Imagen can't do transparent PNGs — don't route there), rewrite the prompt in that model's dialect (prose for Flux/Imagen, tag-salad for SD, quoted strings for Ideogram, `--flags` for Midjourney).
2. **A zero-key execution path.** Host LLM writes inline SVG for simple marks. Or paste the enhanced prompt into any web UI you already use. Or hit Pollinations' zero-signup HTTP endpoint. The pipeline finishes the matte / vectorize / validate for you either way.
3. **Offline platform fan-out.** `p2a export brand.png` emits iOS `AppIcon.appiconset`, Android adaptive layers (incl. Android 13 monochrome), PWA maskable, favicon bundle, visionOS parallax scaffold, and a configured `flutter_launcher_icons.yaml`. No keys. No network. Same class of tool as [appicon.co](https://www.appicon.co) and [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons), but part of a larger pipeline.

Built on a 34-category research compendium ([SYNTHESIS.md](./docs/research/SYNTHESIS.md), [RESEARCH_MAP.md](./docs/RESEARCH_MAP.md)).

---

## Zero-key quickstart

You do not need an API key to use this repo.

```bash
# Literal zero-signup — Pollinations HTTP GET (routes to Flux / Turbo / Kontext / SD):
curl -o logo.png "https://image.pollinations.ai/prompt/minimal+flat+vector+logo+mark+for+a+tech+startup+pure+white+background?model=flux&width=1024&height=1024&nologo=true"

# Then fan it out to every platform offline:
npx prompt-to-asset export logo.png --platforms ios,android,pwa,favicon,flutter,visionos
```

That's the whole loop. Rate limit: ~1 req / 15s anonymous. RGB only — run `asset_remove_background` afterwards if you need transparency.

### Free-tier upgrades (still $0)

| Option                   | How                                                      | Quality                         | Catch                                                   |
| ------------------------ | -------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| **Pollinations.ai**      | HTTP GET — zero signup                                   | Good (Flux backend)             | ~1 req/15s anonymous, RGB only                          |
| **Stable Horde**         | REST API; anonymous kudos bucket OK                      | Variable (community GPUs)       | Queue-based — minutes in the free lane                  |
| **HF Inference**         | Free HF read token                                       | SDXL / SD3 / Flux dev+schnell   | Rate-limited, cold-start latency                        |
| **Google AI Studio**     | `GEMINI_API_KEY` from aistudio.google.com/apikey (free)  | Nano Banana (~1,500 images/day) | No transparent output; matte externally                 |
| **Local ComfyUI**        | Run ComfyUI on your GPU; community `comfyui-mcp` adapter | Full quality                    | Needs your own hardware                                 |
| **inline_svg**           | Host LLM writes `<svg>` directly in chat                 | Deterministic vector            | Simple geometry only (≤40 paths)                        |
| **external_prompt_only** | Paste into any web UI you already use                    | Whatever the UI gives you       | Manual paste, manual save, then `asset_ingest_external` |

Run `p2a models list --free` or `p2a doctor` to see what's live in your shell right now.

---

## Why this exists

Two facts shape everything this repo does.

> **Producing production-grade software assets is a routing + post-processing problem, not a prompt-engineering problem.**

Imagen 3/4 and Gemini Flash Image cannot produce real RGBA PNGs — their VAE is RGB-only, so asking for a transparent background renders the checkerboard _as pixels_. SDXL can't spell past ~8 characters. Only Recraft emits native SVG. Flux errors on `negative_prompt`. None of that is visible in the UI; all of it breaks "one prompt → one asset" tools.

> **The user may not have an image-model API key. The plugin works anyway.**

Three modes ship in the box, and every single one can finish on $0:

| Mode                       | Key?     | What happens                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`inline_svg`**           | No       | Server returns an SVG-authoring brief (viewBox, palette, path budget). Host LLM writes `<svg>…</svg>` inline in its reply, then calls `asset_save_inline_svg` to write the bundle. Instant. Best for logos, favicons, icon packs, stickers, simple app-icon masters.                                                                                |
| **`external_prompt_only`** | No       | Server returns the dialect-correct prompt + a list of paste targets: Pollinations, HF Inference, Stable Horde, Google AI Studio "Nano Banana", Ideogram web, Recraft, Midjourney, fal.ai, BFL Playground, ChatGPT, Stability, Playground, Krea, Leonardo, Adobe Firefly. Generate elsewhere, save locally, call `asset_ingest_external` to finish.  |
| **`api`**                  | Optional | Full server-driven pipeline. Works **zero-key via Pollinations / Horde / HF free-tier**, or with paid keys (`OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`, `STABILITY_API_KEY`, `LEONARDO_API_KEY`, `FAL_API_KEY`). Route → generate → matte → vectorize → export → validate → content-addressed bundle. |

---

## 60-second install

```bash
git clone https://github.com/yourorg/prompt-to-asset.git
cd prompt-to-asset
npm install
npm run build
```

Use the CLI directly:

```bash
# What's live in this shell? (free + paid + paste-only, all bucketed)
node packages/mcp-server/dist/index.js doctor

# List only zero-key / free-tier models
node packages/mcp-server/dist/index.js models list --free

# Full capability dump for one model
node packages/mcp-server/dist/index.js models inspect gpt-image-1

# Fan a 1024² master out to every platform (no API key needed)
node packages/mcp-server/dist/index.js export brand.png --app-name Halcyon --ios18

# Interactive setup in any project dir
cd ~/src/my-app
node /path/to/prompt-to-asset/packages/mcp-server/dist/index.js init
```

Or register as an MCP server so your AI assistant drives it:

```bash
# Claude Code
claude mcp add prompt-to-asset -- node "$PWD/packages/mcp-server/dist/index.js"

# Cursor / Windsurf / Codex / Gemini CLI / Cline / VS Code / Copilot
npm run sync   # regenerates every IDE's manifest
```

Restart your IDE. The assistant now has **16 `asset_*` tools**. See [GETTING_STARTED.md](./GETTING_STARTED.md) for the full on-ramp, [docs/install.md](./docs/install.md) for per-IDE details.

---

## Quickstart by platform

### Next.js / Astro / Vite / Remix / Nuxt

```bash
p2a init                    # detects next.config.*, writes brand.json, suggests public/branding/
p2a export ./master.png --platforms favicon,pwa --out public/branding --app-name MyApp --theme "#2563eb"
# wire the emitted head-snippet.html into your root layout; reference /manifest.webmanifest.
```

Or ask your AI assistant: _"Generate a favicon for this repo using brand.json and drop it in public/branding."_

### Expo / React Native

```bash
p2a init
p2a export ./master.png --out assets/branding --ios18
# Expo prebuild picks up app.json icon paths.
```

### Flutter

```bash
p2a export ./master.png --platforms flutter --out assets/branding/flutter --app-name "MyApp"
# Then in your Flutter project:
#   flutter pub add dev:flutter_launcher_icons
#   dart run flutter_launcher_icons
# The config is pre-populated — iOS, Android adaptive, web, macOS, Windows all wired.
```

### Native iOS (Xcode) / Native Android

```bash
p2a export ./master.png --platforms ios          # drop AppIcon.appiconset into Xcode
p2a export ./master.png --platforms android      # copy android/ into app/src/main/res/
```

### visionOS

```bash
p2a export ./master.png --platforms visionos
# Emits the 1024² master + three parallax layers + a README explaining the hand-split workflow.
```

### Games (any engine)

```bash
p2a sprite-sheet ./frames --layout grid --padding 2 --out build/hero.png --atlas build/hero.json
p2a nine-slice ./panel.png --guides 16,16,16,16 --android-9patch
```

Atlas output is TexturePacker-compatible; Phaser, PixiJS, Godot, Three.js all load it. Nine-slice emits a JSON config + CSS `border-image` + Unity/Godot/Phaser/PixiJS numbers + (optionally) an Android `.9.png`.

---

## What your AI assistant does

In a new chat:

> Make me a transparent logo for a developer-tools company called Forge. Flat vector, two-tone warm orange on neutral.

1. `asset_capabilities()` — what's live: inline_svg, paste targets, paid APIs, free-tier routes.
2. `asset_enhance_prompt({ brief })` — classification, routed model, rewritten prompt, `modes_available[]`, `svg_brief?`, `paste_targets?`, and a **`routing_trace`** that points at the research file backing the decision plus the `never_models` explaining why Imagen/DALL-E were rejected.
3. Offers you `inline_svg` / `external_prompt_only` / `api`.
4. If `inline_svg`: assistant writes the `<svg>` inline AND calls `asset_save_inline_svg`, which writes `master.svg` + favicon.ico + apple-touch + AppIconSet + PWA bundle to disk.
5. If `external_prompt_only`: assistant shows the refined prompt + the best paste target (free paths first). You generate → save → tell the assistant to call `asset_ingest_external <file>`.
6. If `api`: assistant calls the routed provider. Server mattes → vectorizes → exports → validates.

---

## MCP tool surface (16 tools)

| Tool                           | Purpose                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `asset_capabilities`           | Inventory — which modes + providers are live. Now buckets paid / free-tier / paste-only and surfaces the free zero-key routes prominently. Read-only.       |
| `asset_enhance_prompt`         | Classify, route, rewrite, list modes + `svg_brief` + `paste_targets` + **`routing_trace { research_sources, never_models, fallback_chain }`**. Read-only.   |
| `asset_generate_logo`          | `inline_svg` / `external_prompt_only` / `api`. Returns `InlineSvgPlan` / `ExternalPromptPlan` / `AssetBundle`.                                              |
| `asset_generate_app_icon`      | Same three modes. `api` produces full iOS / Android / PWA / visionOS / Flutter fan-out. Set `ios_18_appearances: true` for dark + tinted variants.          |
| `asset_generate_favicon`       | `favicon-{16,32,48}.png` + `icon.svg` + `icon-dark.svg` + `apple-touch` + PWA 192/512/512-maskable + `<link>` snippet + `manifest.webmanifest`.             |
| `asset_generate_og_image`      | 1200×630 via Satori + `@resvg/resvg-js`. Deterministic typography — no diffusion-rendered text garbage.                                                     |
| `asset_generate_illustration`  | `external_prompt_only` / `api`. Brand-locked via bundle refs / LoRA / `style_id`. Routed primary: Flux.2 (up to 8 refs).                                    |
| `asset_generate_splash_screen` | iOS `LaunchScreen-2732.png`, Android `mipmap-*/splash.png` + theme XML, PWA splash + README. Pass `existing_mark_svg` to reuse an already-approved mark.    |
| `asset_generate_hero`          | Marketing hero art (16:9 / 21:9 / 3:2 / 2:1). `external_prompt_only` / `api`.                                                                               |
| `asset_save_inline_svg`        | Round-trip for `inline_svg`. Validates the SVG against the brief, writes bundle to disk.                                                                    |
| `asset_ingest_external`        | Round-trip for `external_prompt_only`. Matte → vectorize → validate → bundle.                                                                               |
| `asset_remove_background`      | BiRefNet / BRIA RMBG-2.0 / LayerDiffuse / difference matte / U²-Net.                                                                                        |
| `asset_vectorize`              | `vtracer` / `potrace` / Recraft / posterize fallback, then SVGO.                                                                                            |
| `asset_upscale_refine`         | DAT2 / Real-ESRGAN / SUPIR / img2img / Lanczos — asset-type-aware.                                                                                          |
| `asset_validate`               | Tier-0 (dims, alpha, checkerboard FFT, safe-zone bbox, ΔE2000 palette, WCAG contrast, OCR Levenshtein). Tier-2 VLM-as-judge via `PROMPT_TO_BUNDLE_VLM_URL`. |
| `asset_brand_bundle_parse`     | Parse `brand.json` / DTCG tokens / AdCP / Markdown → canonical `BrandBundle`.                                                                               |

---

## CLI surface

```
p2a                        # default — MCP stdio server (keeps existing IDE registrations working)
p2a mcp                    # same, explicit
p2a export <master.png>    # offline platform fan-out: iOS AppIconSet + Android adaptive (monochrome included) + PWA + visionOS + favicon + Flutter
p2a init                   # interactive brand.json + framework detection + IDE registration hints
p2a doctor                 # read-only inventory: sharp, vtracer, potrace, providers (free + paid + paste-only), pipeline URLs
p2a models list            # browse the registry. Flags: --free | --paid | --paste-only | --rgba | --svg
p2a models inspect <id>    # full capability dump + paste targets + routing rules + research pointers
p2a sprite-sheet <dir>     # pack frames → PNG + TexturePacker atlas (Phaser / PixiJS / Godot / Unity)
p2a nine-slice <image>     # emit 9-slice JSON + CSS border-image + Unity/Godot/Phaser numbers + .9.png
p2a --help
```

---

## Models covered

Router decisions come from [`data/routing-table.json`](./data/routing-table.json); the capability matrix lives in [`data/model-registry.json`](./data/model-registry.json). Every rule cites its research source file.

**Paid direct APIs:** `gpt-image-1`, `gpt-image-1.5`, `dall-e-3` (deprecated 2026-05-12), `imagen-3`, `imagen-4`, `gemini-3-flash-image` (Nano Banana), `gemini-3-pro-image` (Nano Banana Pro), `sd-1.5`, `sdxl`, `sd3-large`, `playground-v3`, `flux-schnell`, `flux-dev`, `flux-pro`, `flux-2`, `flux-kontext-pro` (edit-only), `ideogram-3`, `ideogram-3-turbo`, `recraft-v3`, `leonardo-phoenix`, `leonardo-diffusion-xl`, `fal-flux-pro`, `fal-flux-2`, `fal-sdxl`.

**Free-tier / zero-key:** `pollinations-flux`, `pollinations-turbo`, `pollinations-kontext`, `pollinations-sd`, `horde-sdxl`, `horde-flux`, `hf-sdxl`, `hf-sd3`, `hf-flux-schnell`, `hf-flux-dev`.

**Paste-only surfaces:** `midjourney-v6`, `midjourney-v7`, `firefly-3`, `krea-image-1`.

Headline routing:

| Need                  | Primary                                                         | Fallback                                                   | Never                              |
| --------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| Transparent PNG mark  | `gpt-image-1` + `background:"transparent"`                      | Ideogram 3 Turbo `style:"transparent"` → Recraft V3        | Imagen, Gemini Flash Image, SD 1.5 |
| Logo w/ 1–3 word text | Ideogram 3 Turbo → `gpt-image-1` → Recraft V3                   | Composite SVG type over mark                               | Imagen, SD 1.5, `flux-schnell`     |
| Logo w/ >3 word text  | **Never a diffusion sampler.** Mark + SVG typography composite. | —                                                          | —                                  |
| Native SVG            | Recraft V3                                                      | `inline_svg` (host LLM authors SVG)                        | Everyone else                      |
| Photoreal hero        | Flux Pro / Flux.2 → `gpt-image-1` → Imagen 4                    | SDXL + brand LoRA                                          | DALL·E 3                           |
| Iterate existing mark | `flux-kontext-pro` (edit-only — requires input image)           | Pollinations Kontext (free zero-key fallback)              | —                                  |
| Zero-key everything   | Pollinations (Flux backend) → inline_svg for simple marks       | Stable Horde → HF Inference → external paste to any web UI | —                                  |

---

## Zero-sticky-note policy

Every routing rule, dialect switch, safe-zone size, and text ceiling is backed by a file under [`docs/research/`](./docs/research/). `asset_enhance_prompt` returns a `routing_trace.research_sources` array on every call. See [`docs/RESEARCH_MAP.md`](./docs/RESEARCH_MAP.md) for the angle → code pointer map.

---

## Brand bundle (brand.json)

```json
{
  "name": "Halcyon",
  "palette": ["#2563eb", "#ffffff"],
  "fonts": { "display": { "family": "Inter", "weights": [700, 800] } },
  "style_refs": ["https://…/sample1.png", "./refs/style2.png"],
  "do_not": ["drop shadows", "heavy gradients"],
  "lora": "halcyon-flux-v2",
  "sref_code": "--sref 1234567890",
  "style_id": "rc_halcyon_01"
}
```

`p2a init` writes this scaffold for you, detecting the framework and suggesting an assets directory. Once present, every generator reads from it automatically.

---

## Architecture

```
  brief (text)
    ↓  asset_capabilities         → modes available + free/paid/paste-only bucketing
    ↓  asset_enhance_prompt       → AssetSpec {
    ↓                                  routing_trace: { rule_id, reason, research_sources, never_models, fallback_chain },
    ↓                                  modes_available,
    ↓                                  svg_brief?,   (inline_svg)
    ↓                                  paste_targets?,  (external_prompt_only)
    ↓                                  rewritten_prompt, …
    ↓                                }
    ↓
    ├─ mode: inline_svg                → host LLM emits <svg>; asset_save_inline_svg writes bundle
    ├─ mode: external_prompt_only      → user pastes into web UI; asset_ingest_external runs matte → vectorize → validate
    └─ mode: api                       → provider(model, prompt, params) → matte → vectorize → upscale → export → validate
```

Content-addressed storage: `assets/<hash[0:2]>/<hash>/<variant>.<ext>`. The MCP server itself is synchronous and stateless; `prompt_hash` / `params_hash` in every `AssetBundle` are designed to drop straight into a BullMQ / SQS / Cloudflare Queues `jobId` for a hosted pipeline (reference design: [`docs/research/18-asset-pipeline-tools/18e-production-pipeline-architecture.md`](./docs/research/18-asset-pipeline-tools/18e-production-pipeline-architecture.md)).

---

## Comparison

| Tool                                   | Prompt enhancement | Multi-model routing |           Zero-key            | Dev-asset bundle |                Offline platform fan-out                |
| -------------------------------------- | :----------------: | :-----------------: | :---------------------------: | :--------------: | :----------------------------------------------------: |
| Promptati / PromptHero                 |   ✓ (cinematic)    |          ✗          |               ✗               |        ✗         |                           ✗                            |
| Looka / Brandmark / Designs.ai         |         ✗          |          ✗          |               ✗               |     partial      |                           ✗                            |
| ChatGPT / Midjourney / Ideogram direct |         ✗          |          ✗          |               ✗               |        ✗         |                           ✗                            |
| appicon.co                             |         ✗          |          ✗          |               ✓               |     partial      |                    ✓ (iOS-focused)                     |
| flutter_launcher_icons                 |         ✗          |          ✗          |               ✓               |     partial      |                   ✓ (iOS + Android)                    |
| `prompt-to-asset`                      |         ✓          |    ✓ (30 models)    | ✓ (Pollinations/HF/Horde/SVG) |        ✓         | ✓ (iOS + Android + PWA + visionOS + favicon + Flutter) |

---

## Development

```bash
npm install
npm run build          # compile MCP server TS
npm run typecheck
npm run lint
npm run format:check
npm test               # vitest watch
npm run test:run       # vitest run (CI)
npm run smoke          # list tools via MCP stdio + correctness assertions
npm run sync           # regenerate IDE mirrors from SSOTs
npm run verify         # byte-verify mirrors match SSOTs
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for the user on-ramp, [CONTRIBUTING.md](./CONTRIBUTING.md) for the SSOT editing flow, [SECURITY.md](./SECURITY.md) for disclosure policy, and [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

## Contributing

SSOTs live in `skills/*/SKILL.md`, `rules/*.md`, `.claude-plugin/`, and `data/*.json`. Never edit `.cursor/`, `.claude/`, `.windsurf/`, etc. directly — they are regenerated by `scripts/sync-mirrors.sh` and CI verifies byte-equality.

## License

MIT. See [LICENSE](./LICENSE).
