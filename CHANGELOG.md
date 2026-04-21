# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file tracks the monorepo as a whole. The publishable artifact
(`@prompt-to-asset/mcp-server`) moves with the repo version unless a subpackage
changelog notes otherwise.

## [Unreleased]

_Nothing yet._

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
