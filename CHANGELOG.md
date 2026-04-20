# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file tracks the monorepo as a whole. The publishable artifact
(`@prompt-to-asset/mcp-server`) moves with the repo version unless a subpackage
changelog notes otherwise.

## [Unreleased]

### Added — zero-key and free-tier providers

- **Pollinations.ai** — truly zero-signup HTTP GET endpoint. Registered models: `pollinations-flux` (primary), `pollinations-turbo`, `pollinations-kontext`, `pollinations-sd`. `isAvailable()` is always true unless `POLLINATIONS_DISABLED=1`. RGB only (matte externally for transparency).
- **Stable Horde** — distributed community GPU cluster. Anonymous apikey `0000000000` bucket works; `HORDE_API_KEY` for priority. Models: `horde-sdxl`, `horde-flux`.
- **Hugging Face Inference API** — free tier via free read token (`HF_TOKEN` at https://huggingface.co/settings/tokens — no credit card). Models: `hf-sdxl`, `hf-sd3`, `hf-flux-schnell`, `hf-flux-dev`.
- `asset_capabilities` now buckets providers into **paid** / **free-tier** / **paste-only** and surfaces a new `free_api` block enumerating zero-key routes (Pollinations, Stable Horde, HF Inference, free Google AI Studio, local ComfyUI pointer).
- `p2a doctor` leads with the free-tier options and recommends them first when no paid key is set. Prints a ready-to-copy `curl` command for Pollinations.
- `p2a init` prints free zero-key routes during onboarding.

### Added — missing direct-API providers

- **Stability AI** (`stability-api.ts`) — `sd-1.5`, `sdxl`, `sd3-large`, `playground-v3`. Native `negative_prompt` forwarded.
- **Leonardo.Ai** (`leonardo.ts`) — `leonardo-phoenix`, `leonardo-diffusion-xl` via the generations endpoint + polling.
- **fal.ai aggregator** (`fal.ts`) — `fal-flux-pro`, `fal-flux-2`, `fal-sdxl`. Alternative path for Flux / SDXL when first-party keys are unavailable.
- **Midjourney** (`midjourney.ts`), **Adobe Firefly** (`adobe.ts`), **Krea** (`krea.ts`) — registered as paste-only providers so routing fallbacks no longer crash with "no provider registered for model X"; `generate()` throws a clear error pointing to `external_prompt_only` + the web UI.

### Added — model registry expansion

- New entries: `gemini-3-pro-image` (Nano Banana Pro), `midjourney-v6`, `ideogram-3` (non-Turbo), `leonardo-diffusion-xl`, the 10 free-tier / zero-key models above.
- New fields on every model: `text_encoder`, `token_budget`, `cfg_default`, `max_reference_images`, `mode`, `api`, `paste_only`, `free_tier`, `aka`, `license`, `deprecated`. Surfaced by `p2a models inspect`.
- Total model count: 21 → 31.

### Added — `p2a models` CLI

- `p2a models list` — compact table with id, family, native_rgba, native_svg, text ceiling, dialect, tier (free/paid/paste-only), status (ready/unset/paste).
- Filter flags: `--free`, `--paid`, `--paste-only`, `--rgba`, `--svg`.
- `p2a models inspect <id>` — full capability dump + paste targets + routing rules that prefer / allow / forbid the model + research pointers.

### Added — Flutter export target

- `p2a export --platforms flutter` emits `flutter/icon-1024.png`, `flutter/icon-1024-adaptive.png`, a fully-configured `flutter_launcher_icons.yaml`, and a README with the exact `dart run flutter_launcher_icons` command. Parity with [flutter_launcher_icons](https://pub.dev/packages/flutter_launcher_icons) — this repo emits the config, that package emits the per-platform PNGs.

### Added — routing trace upgrades

- `asset_enhance_prompt` now returns `routing_trace.never_models` and `routing_trace.fallback_chain` alongside `research_sources`. Callers can explain _why_ a model was rejected, not only what was picked.

### Added — standalone CLI

- **`p2a export <master.png>`** — offline platform fan-out (iOS AppIconSet, Android adaptive, PWA maskable, visionOS layers, favicon bundle) from a 1024² master. Parity target: appicon.co + flutter_launcher_icons. No API key.
- **`p2a init`** — interactive setup. Detects Next / Astro / Vite / Remix / Nuxt / Expo / React Native / Flutter / Xcode / Android / Electron, writes a framework-aware `brand.json` scaffold, prints the matching IDE registration command.
- **`p2a doctor`** — read-only inventory: node version, native deps (`sharp`, `vtracer`, `potrace`, `png-to-ico`, `satori`, `@resvg/resvg-js`, `tesseract.js`, `svgo`), provider keys, pipeline URLs, which modes are live.
- **`p2a sprite-sheet <dir>`** — pack PNG frames into one sheet + TexturePacker-compatible JSON atlas (loads directly in Phaser / PixiJS / Godot / Three.js; Unity via a light importer). `--layout grid|strip`, `--columns`, `--padding`.
- **`p2a nine-slice <image>`** — emit 9-slice JSON + CSS `border-image` snippet + Unity/Godot/Phaser/PixiJS number sheet + optional Android `.9.png`. `--guides L,T,R,B`.
- Entry point `packages/mcp-server/dist/index.js` dispatches by argv — no args still runs the MCP stdio server, so existing IDE registrations keep working.

### Added — model coverage expansion

- `flux-kontext-pro` (edit-only: in-context image editing with identity preservation).
- `flux-schnell`, `flux-dev` (open-weights Flux variants).
- `sd3-large`, `playground-v3`, `leonardo-phoenix`, `krea-image-1`.
- Paste targets added for every new model.

### Added — research traceability

- Each routing rule in `data/routing-table.json` now carries `research_sources: string[]` pointing at the backing research files.
- `asset_enhance_prompt` returns a new `routing_trace` field: `{ rule_id, reason, research_sources }` so callers can audit _why_ a decision fired.
- `splash-screen` routing rule added.

### Added — three-mode execution surface

- **`inline_svg` mode.** The server now returns an `svg_brief` (viewBox,
  palette, path budget, required / do-not, skeleton) for any eligible
  asset type (logo / favicon / icon_pack / sticker / transparent_mark /
  simple app_icon). The hosting LLM emits the `<svg>` inline in its reply
  — zero API key required. Source: `src/modes.ts`, `src/svg-briefs.ts`.
- **`external_prompt_only` mode.** The server returns the dialect-correct
  prompt plus a list of paste targets (Ideogram web, Google AI Studio
  "Nano Banana", Recraft, Midjourney, fal.ai, BFL Playground, ChatGPT)
  resolved from `data/paste-targets.json`. User generates elsewhere,
  calls `asset_ingest_external` with the saved file to finish the
  matte / vectorize / validate pipeline. Zero API key required.
- **`api` mode.** Existing server-driven pipeline, now behind a
  pre-flight check that errors with an actionable message when no
  provider key is set.
- New tool **`asset_capabilities`** — read-only inventory of modes,
  providers, and unconfigured env vars.
- New tool **`asset_ingest_external`** — round-trip endpoint for
  `external_prompt_only` mode.
- `asset_enhance_prompt` now returns `modes_available`, `svg_brief?`,
  `paste_targets?`, `fallback_paste_targets?` so the hosting LLM knows
  which modes to offer the user.
- Every generator (`asset_generate_logo` / `app_icon` / `favicon` /
  `og_image` / `illustration`) accepts an optional `mode` parameter.
- Return types discriminated by `mode`: `AssetBundle` | `InlineSvgPlan`
  | `ExternalPromptPlan`. See `src/types.ts`.
- `docs/RESEARCH_MAP.md` — research-angle → implementation file / function
  index. Each load-bearing code decision now carries a `// Source:`
  comment pointing to its research angle.

### Changed

- README and GETTING_STARTED lead with the zero-key path.
- `rules/asset-enhancer-activate.md` and `skills/asset-enhancer/SKILL.md`
  rewritten to document the three modes and the recommended flow.
- MCP tool count: 11 → 16 (added `asset_generate_splash_screen`, `asset_generate_hero`, `asset_save_inline_svg`, `asset_ingest_external`, `asset_capabilities` on top of the original eleven).
- CI matrix expanded: Ubuntu × Node 20/22/24 + macOS 22 + Windows 22.

### Added — production scaffolding (carried over from initial pass)

- GitHub Actions CI (`ci.yml`): Node 20 & 22 matrix, typecheck + lint +
  format-check + build + test + smoke + mirror-verify.
- `sync.yml` guardrail: fails PRs that drift from the SSOTs under `skills/`
  and `rules/`.
- `publish.yml` with npm provenance on `mcp-server-v*` tags.
- `SECURITY.md` with private disclosure channels, scope, and hardening notes.
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `Dockerfile` — multi-stage Node 20 slim image, non-root runtime user,
  optional sharp install via `--build-arg WITH_SHARP=1`.
- ESLint flat config + Prettier; `npm run lint`, `npm run format`,
  `npm run format:check`.
- Vitest + seed unit tests.
- `.gitattributes`, `.github/dependabot.yml`, PR / issue templates,
  `.env.example`.
- README status badges (CI, license, Node, MCP).

## [0.1.0] - 2026-04-19

### Added

- Initial release of the `prompt-to-asset` MCP server and cross-IDE skill
  bundle.
- 11 MCP tools: `asset_enhance_prompt`, `asset_generate_logo`,
  `asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`,
  `asset_generate_illustration`, `asset_remove_background`, `asset_vectorize`,
  `asset_upscale_refine`, `asset_validate`, `asset_brand_bundle_parse`.
- Data-driven routing (`data/routing-table.json`, `data/model-registry.json`).
- Deterministic post-processing pipeline: matte, vectorize, upscale, export.
- SSOT → multi-IDE mirror flow (`scripts/sync-mirrors.sh`,
  `scripts/verify-repo.sh`) covering Claude Code, Cursor, Codex, Gemini CLI,
  Windsurf, Cline, and GitHub Copilot.
- Research compendium (`docs/research/`, 20 categories, 104 angle files).

[Unreleased]: https://github.com/yourorg/prompt-to-asset/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourorg/prompt-to-asset/releases/tag/v0.1.0
