# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file tracks the monorepo as a whole. The publishable artifact
(`@prompt-to-asset/mcp-server`) moves with the repo version unless a subpackage
changelog notes otherwise.

## [Unreleased]

## [0.4.3] — 2026-04-22

Deep test-coverage pass. No behavior changes — every source module surfaces more of its branches to the test harness so regressions surface in CI instead of in user bug reports.

### Added

- **Provider registry test suite** (`providers.test.ts`, 62 tests). Exercises all 17 image-generation providers through a `fetch` mock: `supportsModel`, `isAvailable`, `generate` happy path, `dryRun`, `ProviderError` on missing keys, HTTP error propagation, asynchronous polling (BFL, Leonardo, Replicate), aspect-ratio bucketing (Google Imagen 4, Ideogram), and native-format detection (Recraft SVG, Pollinations image/png vs image/jpeg).
- **Tool-coverage test suite** (`tools-coverage.test.ts`, 36 tests). Drives the `asset_generate_*` family through `inline_svg`, `external_prompt_only`, and `api` soft-fallback paths, plus `validateAsset`, `ingestExternal`, `trainBrandLora`, and the `removeBackground` / `vectorizeImage` / `upscaleRefine` thin wrappers.
- **Pure-logic test suite** (`pure-logic.test.ts`, 24 tests). Locks behavior for `rewriter` dialects (tag-salad, prose+quoted, prose+flags, prose), `svg-briefs` per asset type, `modelsList` / `modelsInspect` filters, `capabilities`, and `doctor`.
- **Core-logic test suite** (`core-logic.test.ts`, 25 tests). Brand-source parsing (native JSON, DTCG tokens, AdCP, markdown, raw text), cache key stability, data-integrity assertions, and router branches (transparency, vector, text-length ceilings).
- **Pipeline extras** (`pipeline-extras.test.ts`, 22 tests). Exercises `matte` (RGBA passthrough, chroma-white fallback, remote RMBG), `upscale` (Lanczos, remote hook), `vectorize` (placeholder SVG, remote Recraft), `tier1Alignment` (remote VQA), and `tier2Vlm` (remote VLM-as-judge).
- **CLI tests** (`cli.test.ts`, `cli-image.test.ts`, `cli-export-init.test.ts`, `pick.test.ts`, 46 tests total). Drives `p2a` through `main`, `models`, `doctor`, `sprite-sheet`, `nine-slice`, `export`, `init --yes`, `pick --yes`, and `mcp` (transport validation).
- **Generate-api tests** (`generate-api.test.ts`, 10 tests). Full `api`-mode pipeline for `logo`, `favicon`, `app-icon`, `hero`, `illustration`, `splash-screen` (existing mark), and `ingestExternal`, with a deterministic `fetch` mock that feeds OpenAI / Ideogram / Recraft / Gemini stubs.
- **`init-brand` tests** (`init-brand.test.ts`, 18 tests). Covers every project-detection branch (Next.js, Astro, Vite, Remix, Nuxt, Expo, Flutter, Xcode, Android, Electron, React Native, plain Node, unknown) and the overwrite guard.
- **`doctor-fix` tests** (`doctor-fix.test.ts`, 3 tests). Dry-run path, skip list, step well-formedness.

### Changed

- **Coverage climbed from 37.25% → 87.25% statements / 90.52% → 95.37% functions.** 477 total tests now pass (from 186). The remaining gaps are Satori WASM paths in `og-render.ts` (can't load in the test sandbox), `sharp`-missing fallbacks in `pipeline/sharp.ts`, and real shell-out paths in `doctor-fix.ts` (won't exercise without installing binaries).

## [0.4.2] — 2026-04-22

Documentation accuracy pass for Google's image generation offerings. No runtime or routing changes — everything here corrects pricing and free-tier claims across the repo after verifying against Google's official pricing page.

### Fixed

- **Nano Banana Pro pricing corrected.** `data/model-registry.json` and `packages/mcp-server/src/cost-guard.ts` had `gemini-3-pro-image` priced at `$0.067/$0.101/$0.151` (the Nano Banana 2 Flash tiers). The verified Nano Banana Pro price is `$0.134` per image at 1K/2K and `$0.24` at 4K, plus input-image charges. Cost estimates for Pro runs were roughly half of reality.
- **Nano Banana 2 Flash pricing disambiguated.** `gemini-3-flash-image` now carries separate cost hints for the current `gemini-3.1-flash-image-preview` ($0.045 / $0.101 / $0.151 for 1K / 2K / 4K) and the legacy `gemini-2.5-flash-image` ($0.039/img). Earlier text conflated the two.
- **Imagen 4 tiers itemised.** `imagen-4` cost hint now lists Fast ($0.02), Standard ($0.04), and Ultra ($0.06) separately, and the `successor` field points to `gemini-3-flash-image` (an id that exists in the registry) rather than the removed `gemini-2.5-flash-image`.
- **Free-tier claims aligned with reality.** `README.md`, `GETTING_STARTED.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.clinerules/01-prompt-to-asset.md`, `.windsurf/rules/prompt-to-asset.md`, `.cursor/rules/prompt-to-asset.mdc`, `rules/asset-enhancer-activate.md`, `docs/research/08-logo-generation/8b-prompt-patterns-by-logo-style.md`, `data/paste-targets.json`, `bundle/mcpb/manifest.json`, `.env.example`, and the `capabilities`, `doctor`, and `google` provider modules now state the verified position: **no API free tier for Gemini/Imagen image generation**; free interactive use is available via AI Studio (500–1000 images/day dynamic) and the Gemini consumer app (Basic 20/day, AI Plus 50/day, AI Pro 100/day, Ultra 1000/day).
- **Ecosystem note corrected.** The stale claim that Google had restored a free API tier for Nano Banana has been removed from the logo-generation research notes.

### Changed

- **`data/model-registry.json`** bumped to 1.2.2 / 2026-04-22.
- **`scripts/add-cost-hints.mjs`** updated so regenerated cost hints match the verified pricing.

## [0.4.1] — 2026-04-22

Quality pass on the 0.4.0 release. No feature changes — everything here is a drift-correction, a polish, or a CI fix.

### Fixed

- **CI smoke test green.** The smoke check for `transparent logo for my app` was pinned to the old transparency-safe whitelist (`recraft-v3`, `gpt-image-1`, `ideogram-3-turbo`) and failed after 0.4.0 promoted `recraft-v4` to primary. The whitelist now includes `recraft-v4` and `gpt-image-1.5`, matching the live routing table.
- **CI sharp resolution pin aligned.** `.github/workflows/ci.yml` was installing `sharp@^0.33.5` on every runner, overriding the `^0.34.5` declared in `packages/mcp-server/package.json`. CI now installs the same major as the package manifest, so platform tests run against the shipping dep.
- **Cost guard model IDs synced to the registry.** `cost-guard.ts` had eight model ids that no longer matched `data/model-registry.json` (`hf-sd-xl`, `hf-sd-3`, `sdxl-1.0`, `sd-3-large`, `leonardo-phoenix-1.0`, `recraft-v3-svg`, `flux-pro-1.1`, `cf-flux-schnell`), so cost checks silently fell through to fail-open. All IDs now line up with the registry, and `recraft-v4`, `gpt-image-1-mini`, `cf-flux-2-*`, and the full `replicate-*` / `comfyui-*` set are priced.
- **Routing-table never-lists no longer reference unregistered models.** Dropped `gemini-3-pro-image-preview`, `nano-banana`, `nano-banana-pro`, and `any_diffusion_for_the_text` from the `never` arrays; the concrete `gemini-3-*` ids in the registry already cover the intent. `p2a doctor --data` now reports zero never-list warnings.
- **Typo in og-image fallback chain.** `hero_model: "cf-flux-schnell"` corrected to `cf-flux-1-schnell` (the id that actually exists in the registry).
- **MCP server version now reads from package.json.** The handshake string was hard-coded at `0.3.0` even after the package published `0.4.0`. `createServer()` now loads the current version from `package.json` at runtime, so clients see the version they actually installed.

### Changed

- **`data/routing-table.json`** bumped to 1.2.1 / 2026-04-22 to reflect the never-list cleanup.
- **Cost guard** now covers 40+ models including every free-tier and Replicate route, so `P2A_MAX_SPEND_USD_PER_RUN` is meaningful on more paths.

## [0.4.0] — 2026-04-21

Research-to-implementation alignment release. Full audit of all 34 research categories (361 files) against the codebase. Every finding from the research update log is now reflected in production code, data files, skills, and docs.

### Added

- **`recraft-v4` model in registry and routing.** Recraft V4 (Feb 2026) is now the primary vector/SVG model for non-brand tasks. HuggingFace T2I Arena #1 (ELO 1172). V3 remains the fallback for brand-style pipelines requiring `style_id` (V4 dropped style support). Pricing: $0.08/img vector, $0.30/img pro vector.
- **`gpt-image-1-mini` model in registry.** Cheapest OpenAI image model ($0.008/img medium). Native RGBA. 1024x1024 max.
- **SDXL `BREAK` token in tag-salad dialect.** `rewriter.ts` now emits `BREAK` between subject tokens and background tokens when using the `tag-salad` dialect, preventing color/attribute leakage on SDXL. Source: research 06a finding #6.
- **Ideogram `magic_prompt: OFF` enforced in routing rules.** All logo/icon/illustration routing rules now force `magic_prompt: OFF` for Ideogram to prevent the #1 footgun (adding wooden desks and bokeh to clean logos). Source: research 07b finding #5.
- **Research source citations** added to `brand.ts`, `pipeline/svgo.ts`, `pipeline/vectorize.ts` — previously uncited code now links to the research that shaped the decisions.
- **Imagen 4 deprecation metadata.** `deprecated: "2026-06-30"` and `successor: "gemini-2.5-flash-image"` fields added to the imagen-4 registry entry.

### Changed

- **`gpt-image-1.5` promoted to primary** across all routing rules where gpt-image-1 was previously primary (transparent-mark, sticker, logo fallbacks, hero-photoreal fallbacks, illustration-no-brand). Research 05 confirms better text rendering (LM Arena #1, ELO 1264) at lower cost ($0.034/img medium vs $0.042).
- **Ideogram transparency parameter fixed everywhere.** `style: "transparent"` (incorrect) replaced with the dedicated `/ideogram-v3/generate-transparent` endpoint + `rendering_speed: "TURBO"` parameter across CLAUDE.md, AGENTS.md, routing-table.json, all 12 skill files, and paste-targets.
- **Recraft routing updated.** `recraft-v4` is now primary for `logo-text-free-vector`, `app-icon-mark`, `favicon`, `icon-pack`, and `splash-screen` rules. `recraft-v3` is kept as first fallback for brand-style pipelines.
- **gpt-image-1.5 registry corrected.** Text ceiling updated to 60 chars. Max size corrected to 1536x1024. Cost hint corrected to actual per-quality-tier pricing. Strengths expanded to reflect LM Arena #1 status.
- **model-registry.json** version bumped to 1.2.0; **routing-table.json** version bumped to 1.2.0.
- **SVGO v4 compatibility note** added to `pipeline/svgo.ts` — SVGO v4.0.0 (Feb 2026) changed defaults so `removeViewBox: false` override is now a no-op.
- **All 12 skill files updated** (both `.claude/skills/` and `.cursor/skills/` mirrors) with corrected Ideogram endpoint, Recraft V4 notes, rembg default-model warning, and magic_prompt enforcement.
- **RESEARCH_MAP.md updated** to reflect recraft-v4, Ideogram endpoint fix, BREAK wiring, and magic_prompt enforcement.

### Removed

- **`T0_DCT_ENTROPY` failure code.** Was typed but never implemented in `validate.ts`. Removed from `FailureCode` union to eliminate dead code.

### Fixed

- **AGENTS.md / CLAUDE.md consistency.** AGENTS.md now matches CLAUDE.md on Ideogram transparency API surface, Recraft V4 availability, and gpt-image-1.5 as current flagship.
- **Deprecated model routing.** `imagen-4` removed from hero-photoreal fallback chain (EOL June 30, 2026). `dall-e-3` already had `deprecated` field and `never` list entries.

### Changed (docs only)

- **Corrected stale free-tier claims.** Google removed Gemini/Imagen image-gen from the universal free API tier in December 2025. Previous doctor/capabilities output and docs claimed "~1,500 free images/day" for Nano Banana; in reality an unbilled GEMINI_API_KEY returns HTTP 429 with `limit: 0` on image endpoints. Updated `asset_doctor`, `asset_capabilities`, `data/model-registry.json` cost hints, README, CLAUDE.md, AGENTS.md, GEMINI.md, GETTING_STARTED.md, `.env.example`, and IDE rule files to reflect current state.
- **Re-ranked free API routes.** Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day free) is now rank 1. HF Inference rank 2. Pollinations rank 3. Stable Horde rank 4. Google moved to paid_providers with honest pricing ($0.039/img Nano Banana, $0.02/img Imagen 4 Fast).
- **Added AI Studio paste-only flow.** Users without billing enabled can still use Nano Banana / Nano Banana Pro via https://aistudio.google.com (free interactive UI) and `asset_ingest_external` to bring the PNG into the pipeline.

## [0.3.1] — 2026-04-21

Patch release: structured validation failure codes (additive, non-breaking) and a full research-folder restructure.

### Added

- **Structured validation failure codes.** `ValidationResult.failures: ValidationFailure[]` is now populated on every `asset_validate` / `tier0` / `tier1Alignment` / `tier2Vlm` pass. Codes match the taxonomy in `skills/asset-validation-debug/SKILL.md`: `T0_CHECKERBOARD`, `T0_ALPHA_MISSING`, `T0_DIMENSIONS`, `T0_SAFE_ZONE`, `T0_FILE_SIZE`, `T1_PALETTE_DRIFT`, `T1_TEXT_MISSPELL`, `T1_LOW_CONTRAST`, `T1_VQASCORE`, `T2_BRAND_DRIFT`. Each failure carries `tier` (0/1/2), human-readable `detail`, and a `data` payload with concrete values (bbox coords, ΔE, Levenshtein distance, etc.) that a repair step consumes without re-running the check. Closes the gap where the skill's "map code → repair primitive" contract had no matching output shape in the validator.
- **Research folder restructure.** Every one of 36 category folders now has both `index.md` (navigation / angle map) and `SYNTHESIS.md` (cross-angle synthesis). Orphan folders `21-oss-deep-dive`, `22-repo-deep-dives`, `23-combinations`, and `future/` got fresh syntheses built from full reads of their 61 combined angle files. Top-level `docs/research/SYNTHESIS.md` expanded from 20 → 36 categories with a new Wave-2 block (W2-1 through W2-14) covering agentic orchestration, structured generation, reflection loops, evaluation, CI/CD, RAG, memory, cost optimization, streaming UX, routing, and the installable-skills survey. Master nav at `docs/research/index.md`.
- **Four new skills (→ 12 total).** Long-tail gaps the asset-type skills don't cover. No MCP tool surface change; the skills guide Claude through flows the existing 24-tool API already supports.
  - `svg-authoring` — engaged whenever `asset_generate_*` returns an `InlineSvgPlan`. Enforces viewBox, path-budget, palette, optical balance, and small-scale (16×16) legibility rules so the emitted `<svg>` survives `asset_save_inline_svg` validation. Covers style taxonomy (flat / outlined / filled / duotone / minimal) with SVG patterns for each.
  - `t2i-prompt-dialect` — engaged during prompt rewriting. Per-model rules for `gpt-image-1`, Imagen / Gemini, SD 1.5 / SDXL, Flux.1 / Flux.2, Midjourney, Ideogram, Recraft. Handles negative-prompt translation (Flux errors on it, Imagen / `gpt-image-1` ignore it, SDXL uses it), token budgets (SDXL 77 CLIP tokens with `BREAK` chunking), transparency quirks (never prompt Imagen / Gemini for transparency), and brand-palette injection per dialect.
  - `asset-validation-debug` — engaged when `asset_validate` or a generator returns warnings. Maps failure codes to concrete repair primitives (matte, inpaint, route change, seed sweep, composite). Applies a retry budget so Claude does not loop on hopeless regenerations. Cost/ROI matrix per primitive (SVGO 0.01×, matte 0.05×, inpaint 0.3×, regenerate 4×).
  - `brand-consistency` — engaged for multi-asset sets. Builds `BrandBundle` (palette, typography, style refs, do-not list), enforces palette per model (Recraft `controls.colors` hard-lock → IP-Adapter → Midjourney `--sref` → Flux LoRA), validates CSD style similarity + ΔE2000, promotes accepted assets into the reference set so each new generation tightens the brand lock. LoRA training ROI breaks even at ~20 assets.
- **Research synthesis** at `docs/research/24-skills-for-p2a/` — 9 documents covering gap analysis, marketplace-skill survey, per-skill design specs, and the category `SYNTHESIS.md` with a ranked priority matrix and dependency map.

### Changed

- Uppercase `INDEX.md` → `SYNTHESIS.md` in 30 category folders; `34-installable-skills-survey/INDEX.md` → `LANDSCAPE.md` (preserves the landscape-survey role, frees up the `index.md` slot). All cross-references in top-level `SYNTHESIS.md` updated (40 link replacements).
- `skills/asset-validation-debug/SKILL.md` now documents the `failures[]` output shape and links to `ValidationFailure` in `types.ts`.
- Top-level `SYNTHESIS.md` W2-2 stopping-criteria block matches 26d's exact policy (iter_max = 4, score-plateau threshold 0.15, hard-block on capability mismatch) instead of the earlier "1–3 iterations" shorthand.
- `rules/asset-enhancer-activate.md` gains a "Supporting skills" section pointing at the four new skills. Regenerates into `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and every IDE mirror.
- `scripts/sync-mirrors.sh` + `scripts/verify-repo.sh` — SKILLS array extended from 8 to 12. CI `verify-repo` still enforces byte-for-byte mirror consistency.

### Tests

- 7 new cases in `pipeline/validate.test.ts` covering each failure code, the graceful-degradation path, and the `pass === (failures.length === 0)` invariant. Validator: 27/27. Total suite: 241/241 passing, 2 skipped (network integration tests).

### Infra

- `.gitignore`: ignore `.claude/*.lock`, `.claude/transcripts/`, `.claude/cache/`, `.claude/logs/`, `.claude/settings.local.json`, `/graphify-out/`. Skill sources under `.claude/skills/` stay tracked.

## [0.3.0] — 2026-04-21

Game-asset add-on + auto-install for native binaries. No breaking changes; the 16-tool 0.2 surface is untouched.

### Added

- **Seven new MCP tools (→ 24 total).**
  - `asset_doctor` — structured environment inventory with ranked free-tier routes, paid key status, paste-only surfaces, and a "what to try next" list. MCP equivalent of `p2a doctor --json`. Read-only by default.
  - `asset_models_list` + `asset_models_inspect` — browse the 60+ model registry with filters (`free`, `paid`, `paste_only`, `rgba`, `svg`) and drill into one model for the full capability dump, paste targets, and the routing rules that reference it.
  - `asset_export_bundle` — fan a 1024² master PNG out to iOS AppIconSet, Android adaptive, PWA maskable, visionOS parallax, Flutter launcher, and favicon from a single tool call. Offline; no key. Pair it with `asset_save_inline_svg` to go from brief → platform bundle without typing into a terminal.
  - `asset_sprite_sheet` — pack a frame directory into one sheet + TexturePacker-compatible JSON atlas (Phaser, PixiJS, Godot, Unity). For game devs.
  - `asset_nine_slice` — emit a 9-slice config + CSS `border-image` + engine-ready numbers (Unity / Godot / Phaser / PixiJS) + optional Android `.9.png`.
  - `asset_init_brand` — scaffold `brand.json` + auto-detect the framework (Next.js, Expo, Flutter, Xcode, Astro, Vite, Remix, Nuxt, React Native, Electron, Node) so the next generator call has a brand source-of-truth and a sensible output dir.
- **`p2a doctor --fix` (and `asset_doctor(auto_fix=true)`).** Opt-in auto-installer for the native-binary gap. macOS: Homebrew for `potrace`; cargo for `vtracer` (it's not in brew-core). Windows: scoop where available. Linux + anything else: surfaces the exact apt/dnf/rustup commands rather than running them unprompted. Never sudo. `--fix --dry-run` previews. npm optional deps get a reinstall hint, not in-place manipulation.
- **Live Pollinations integration test** at `tests/integration/pollinations.test.ts`. Gated behind `INTEGRATION=1`; proves the zero-key HTTP-GET route actually produces a valid asset and feeds through `asset_ingest_external` (restoration pre-pass on JPEG input included). End-to-end proof of work, not just logic regression.
- **Design thesis in README** — "You own the API keys. The LLM owns everything else." The only terminal action is install + set keys; every other verb (doctor, fan-out, brand scaffolding, sprite sheets, 9-slice, model inspection) is an MCP tool the assistant calls.

### Fixed

- `createServer()` internal version string was stuck at `0.1.0`; now tracks package.json.
- Sprite-sheet test suite used `require("node:fs")` in-line; converted to ESM imports so ESLint's `no-require-imports` rule stops breaking CI.
- README Claude Desktop `.mcpb` link no longer hardcodes the old 0.2.0 filename.

### CI

- Release bumps `0.2.1` → `0.3.0` across `package.json`, `packages/mcp-server/package.json`, `server.json`, `bundle/mcpb/manifest.json`.

## [0.2.1] — 2026-04-20

Maintenance release. Needed so `mcpName` lands in the published npm `package.json` and the Official MCP Registry can verify GitHub ownership.

### Added

- `mcpName: "io.github.MohamedAbdallah-14/prompt-to-asset"` in `packages/mcp-server/package.json`. Gates registry publication; no behaviour change.
- `bundle/mcpb/`, `dist-release/prompt-to-asset-0.2.1.mcpb` — Claude Desktop one-click install bundle, attached to the GitHub release.
- `server.json` at repo root — validates against the official MCP Registry schema. `mcp-publisher publish` ready to run.
- `smithery.yaml` with stdio `startCommand` + full env schema for all 15 provider keys. No secrets baked in.
- `.github/workflows/docker.yml` — multi-arch (amd64 + arm64) build/push to `ghcr.io/mohamedabdallah-14/prompt-to-asset` on push/tag/dispatch.
- `.github/FUNDING.yml` — GitHub sponsor button.
- README install badges + one-click deeplinks (Cursor / VS Code / VS Code Insiders / Claude Desktop / Smithery) + npm version + monthly downloads.
- `docs/LAUNCH.md` — ordered checklist of every directory + launch channel that still needs user action.

### Fixed

- **CI sharp platform-binary.** `npm ci` resolved `@img/sharp-<os>-<arch>` optional deps against the lockfile, which was generated on darwin-arm64 and didn't include `@img/sharp-linux-x64` / `@img/sharp-win32-x64`. The favicon, app-icon, and platform-fanout tests that need sharp all failed on Ubuntu + Windows runners. Fixed by adding a post-install `npm install --no-save sharp` step that re-resolves for the current runner platform. Lockfile unchanged.
- Three lint errors CI caught after the 0.2.0 distribution commit: stale `freeHint` helper, unused `providerAvailability` import in `pick.ts`, unused `readdirSync`/`join` in `evals/scripts/run.mjs`.
- ESLint config: widened Node-globals override to `evals/scripts/**` and `packages/*/scripts/**`; ignore `bundle/mcpb/`, `evals/snapshots/`, `dist-release/` (generated artifacts, not source).

### Changed

- Dropped `dist-release/prompt-to-asset-0.2.0.mcpb`; superseded by the 0.2.1 bundle.

## [0.2.0] — 2026-04-20 (follow-on pass)

Second round of changes after the 0.2.0 hardening release — built on top of the same version so the 0.2.0 tag covers both. If you're consuming the npm publish, everything below is in 0.2.0.

### Added

- **`p2a init --register`**. Project-local auto-registration for `.cursor/mcp.json`, `.vscode/mcp.json`, `.windsurf/mcp.json`. Optionally runs `claude mcp add prompt-to-asset -- p2a` for Claude Code (user-global — gated behind an explicit prompt unless `--yes`). Answers the "ease-of-install" ask without asking users to hand-edit JSON.
- **Regenerate-until-validated loop.** `asset_generate_logo` accepts `max_retries: 0..4`. On tier-0 validation failure the server inspects the diagnostic (alpha missing / checkerboard / palette drift / safe-zone / OCR / contrast) and applies a repair (re-route, hex pin, mark-only fallback) before retrying. Hard-capped for cost; stops on no-improvement convergence. Research: `26a` Reflexion / `26e` critique-to-prompt / `24a` multi-agent handoff. New module `src/pipeline/repair.ts` with a tight test suite.
- **Tier-1 VQAScore validator.** `asset_validate` gains `run_vqa: true`. POSTs to `PROMPT_TO_BUNDLE_VQA_URL` with `{ image_base64, prompt, asset_type }`; expects `{ score: 0..1, notes? }`. Graceful no-op when unset. Research: `27b` VQAScore pipelines.
- **Phase-4 ComfyUI + brand LoRA scaffold.** New `comfyui` provider calling `PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL` (user-owned Modal / Runpod / self-host endpoint). Three new model registry entries: `comfyui-sdxl`, `comfyui-flux`, `comfyui-flux-lora`. New MCP tool `asset_train_brand_lora` wraps a training endpoint (`PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL`) — the user owns the deployment; the MCP tool handles packaging + path-guarded image loading + HTTP + validation warnings. Seventeenth tool in the surface (`asset_train_brand_lora`).

### Changed

- **Monorepo version bumped to 0.2.0.** Keeps root `package.json` in lock-step with the publishable subpackage.
- **Repo URL** across all docs + lockfile + Dockerfile + CI: `github.com/MohamedAbdallah-14/prompt-to-asset`.
- **Dropped the `apps/web` workspace.** CLI-first — the route picker is `p2a pick`. Static marketing pages no longer shipped in-repo. `workspaces` now just `packages/*`.
- **GETTING_STARTED.md** refreshed for the `npm i -g prompt-to-asset` / `npx prompt-to-asset` flow. Added a "What's new in 0.2" callout.
- **examples/README.md** adds a per-IDE MCP usage section + a failure-recovery walkthrough (tier-0 diagnostics → repair suggestions → mode switch).

### Fixed

- `p2a --version` now walks upward looking for the closest `prompt-to-asset` `package.json`, so it works in monorepo dev and published npm layouts.
- Smoke test count updated to 17 tools.
- `modes.test.ts` updated to cover the new `comfyui` availability key.

### CI

- **`ci.yml` rewritten.** Adds a dedicated `coverage` job that uploads `coverage/lcov.info` to Codecov via `codecov/codecov-action@v5` (set `CODECOV_TOKEN` as a repo secret). Adds `pack-check` (runs `npm pack --dry-run` and asserts `data/` + `README.md` + `CHANGELOG.md` + `LICENSE` are in the tarball), an `audit` job (blocks on high-severity runtime advisories), and a `doctor --data` step on every matrix cell. Top-level `permissions: contents: read` so workflow tokens are least-privilege by default.
- **`codeql.yml` added.** `javascript-typescript` analysis on push / PR / weekly cron. `security-and-quality` query pack. `security-events: write` raised locally.
- **`dependency-review.yml` added.** Blocks PRs with new high-severity vulnerable dependencies or copyleft (GPL / AGPL / SSPL / BUSL) licences. Comments the summary on the PR only when it fails.
- **`publish.yml` hardened.** Runs `doctor --data` + `smoke` before publishing. Keeps `id-token: write` + `--provenance` for OIDC trusted-publisher flow; `NPM_TOKEN` remains as a fallback.
- **`sync.yml`** — timeout + explicit `permissions: contents: read`. Node bumped to 22.

### Evals

- **Deterministic regression harness** under `evals/`. Golden brief set at `evals/briefs/golden-set.json` (9 entries covering wordmark length, transparency routing, safe-zone assertions, and clarifying-question triggers). `node evals/scripts/run.mjs` runs the pipeline pure-function (no provider calls) and writes a snapshot. `--baseline` locks the current state; `--check` exits 1 on any brief that was passing and now fails.
- **`.github/workflows/evals.yml`** gates every PR touching source or routing data. Separate from `ci.yml` so doc-only PRs skip it. Artifact upload retains daily snapshots for 14 days.
- Pattern borrowed from the `unslop` repo's evaluator approach. Not the implementation — the idea of a pure-function regression snapshot that ships in the repo.

### Docker + repo hygiene

- **`.github/FUNDING.yml`** sponsor button.
- **Dockerfile**: dropped the stale `apps/web/package.json` COPY (the workspace was removed in this release), bumped default `NODE_VERSION` to 22. Already had non-root `mcp` user + OCI labels + multi-stage build.
- **PR template** now asks for `evals --check` and `doctor --data` on PRs that touch source.

### Stats

- 203 tests / 201 passing / 2 skipped (network integration). 0 npm audit vulns. Coverage: 33% lines / 28% branches (driven by the unit-tested security + validation + router core; the generator tools are mostly integration-exercised and sit at 0%, a known gap tracked for 0.3).
- Evals: 9/9 golden briefs pass, baseline locked at `evals/snapshots/baseline.json`.
- Package size 231 kB / 291 files for the npm tarball.

## [0.2.0] — 2026-04-20

Production-hardening release. Four audit streams (security, UX, docs-vs-code, research-vs-code) ran in parallel; this release closes every CRITICAL and HIGH finding.

### Security

- **Gemini API key moved from URL query string to `x-goog-api-key` header.** Query-string keys leaked into proxy logs, error bodies, and any URL echo. Also added error-body redaction so older deployments that still accept `?key=` don't leak either.
- **Path-access allow-list.** `image_path`, `output_dir`, and `existing_mark_svg` are resolved through symlinks and rejected if they escape the project cwd + output dir + cache dir + OS tempdir. Widen with `P2A_ALLOWED_PATHS="/path1:/path2"`. New `src/security/paths.ts` — applied to all six path-accepting tools (ingest-external, save-inline-svg, remove-background, vectorize, upscale-refine, validate-asset) plus the favicon / splash-screen SVG ingestion paths.
- **Unconditional SVG sanitizer.** `src/security/svg-sanitize.ts` rejects `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, `on*=` event handlers, `javascript:` URIs, external `<image href>` / `<use href>` / `<script src>`, and CSS `@import` from remote stylesheets — before any disk write. Runs regardless of whether SVGO (optional dep) is installed.
- **Provider-error redaction.** `src/security/redact.ts` scrubs OpenAI `sk-…`, Google `AIza…`, Anthropic `sk-ant-…`, `Bearer …`, Replicate `r8_…`, HF `hf_…`, and query-string secrets from any string before it surfaces in a tool response.
- **Cost guardrail.** Set `P2A_MAX_SPEND_USD_PER_RUN=5.00` to cap any single api-mode tool call. Pre-flight estimate refuses to call if over; zero-cost routes are always a no-op. Kept in `src/cost-guard.ts`.
- **Data-integrity invariant at boot.** `assertDataIntegrityAtBoot()` refuses to start the MCP server if `data/routing-table.json` references a model id not in `data/model-registry.json`. New `p2a doctor --data` subcommand for CI.
- **Build-dep CVEs closed.** vitest bumped 2.x → 4.1.x, transitively closing vite / esbuild / @vitest/mocker / @vitest/coverage-v8 advisories (GHSA-67mh-4wv8-2f99, GHSA-4w7w-66w2-5vf9). `npm audit`: 0 vulnerabilities.

### Changed

- **Paste-only providers no longer throw on `mode: "api"`.** Midjourney, Firefly, Krea now auto-fall-back to the first API-reachable model in the `fallback_models` chain and surface a warning explaining the swap. When the whole chain is paste-only, the tool returns an `ExternalPromptPlan` with paste-target URLs instead of failing. Behaviour covered by `packages/mcp-server/src/tools/soft-fallback.test.ts`.
- **`asset_enhance_prompt` returns `clarifying_questions[]`** when the brief leaves a material ambiguity: long wordmark (>3 words against text-rendering models), missing brand palette on an app_icon request, or generic brief with no visual anchor. Each entry has `{id, header, question, options[], required, why}`; host LLMs should surface via AskUserQuestion (Claude Code) or the equivalent.
- **`p2a doctor` free-route ranking.** Routes ordered best → worst (Gemini / HF / Cloudflare / Pollinations / Horde). Replaces the flat `on`/`off` list with quality-ranked guidance. New "What to try next" section adapts to zero-key / free-tier / paid-key states.

### Added

- **`p2a pick` — interactive TUI picker.** Asks asset type + constraints (wordmark, transparency, vector), calls the same router the MCP tools use, and prints a ranked route with cost/api-status/paste-target annotations. Zero-dep (readline). Answers the "UI for model selection" ask without adding a browser surface.
- **`TROUBLESHOOTING.md`** — 16 common snags with copy-pasteable fixes (0 tools in IDE, sharp on Alpine, vectorize garbage, missing png-to-ico, `PathAccessError`, `SvgRejectedError`, `CostBudgetExceededError`, paste-only soft-fallback, Imagen checkerboard, OCR false-positives, …).
- **npm publish prep.** `packages/mcp-server/package.json` wires `bin` (`p2a` + `prompt-to-asset`), `files` (`dist`, `data`, `README.md`, `CHANGELOG.md`, `LICENSE`), `prepublishOnly` (build + prepack), and a `scripts/prepack.mjs` that stages `data/` + `LICENSE` + `CHANGELOG.md` from the repo root into the package tarball. Verified via `npm pack --dry-run` (package-size 231 kB, 291 files). Data-dir resolution in `config.ts` / `paste-targets.ts` now supports both monorepo-dev and published-package layouts.
- **Package-facing README** under `packages/mcp-server/README.md` — sized and written for the npm landing page; the monorepo README stays at the repo root.

### Fixed

- Test suite green on vitest 4 (163 → 190 → 192 tests; all passing).
- The three failing `save-inline-svg` tests after the path guard landed — tempdir added to default allow-list (macOS `/var/folders` ↔ `/private/var/folders` symlink normalised; can be disabled with `P2A_DISABLE_TMPDIR_ACCESS=1`).

## [0.1.0] — 2026-04-20

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

[Unreleased]: https://github.com/MohamedAbdallah-14/prompt-to-asset/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MohamedAbdallah-14/prompt-to-asset/releases/tag/v0.1.0
