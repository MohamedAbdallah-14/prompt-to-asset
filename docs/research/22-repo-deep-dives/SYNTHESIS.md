---
category: 22-repo-deep-dives
date: 2026-04-21
angles_indexed:
  - 01-hunyuan-prompt-enhancer.md
  - 02-promptist.md
  - 03-nutlope-logocreator.md
  - 04-shinpr-mcp-image.md
  - 05-logoloom.md
  - 06-arekhalpern-mcp-logo-gen.md
  - 07-niels-oz-icon-mcp.md
  - 08-appicon-forge.md
  - 09-guillempuche-appicons.md
  - 10-pwa-asset-generator.md
  - 11-capacitor-assets.md
  - 12-npm-icon-gen.md
  - 13-iconify.md
  - 14-svgl.md
  - 15-rembg.md
  - 16-vtracer.md
  - 17-comfyui-layerdiffuse.md
  - 18-comfyui-easy-use.md
  - 19-vercel-mcp-stack.md
  - 20-vercel-ai-sdk-image.md
---

# Category 22 — Repo Deep Dives: Synthesis

## Category Executive Summary

1. **Every surveyed "AI logo / icon / image" repo owns exactly one slice of the pipeline — none owns the stack.** LogoLoom owns SVG-post-processing (see 05 §"Post-processing surfaces"), Nutlope owns the UI shell (see 03 §"Stack"), `arekhalpern/mcp-logo-gen` owns a FAL/Ideogram wrapper (see 06 §"Architecture at a glance"), `niels-oz/icon-generator-mcp` owns host-LLM prompt assembly (see 07 §"Provider architecture"), `appicon-forge` owns deterministic CSS composition over Iconify (see 08 §"The composition-beats-generation pattern"). The market has no integrator; that is the wedge (see 03 §"Decision", 05 §"Gaps our product fills", 07 §"Decision").
2. **Prompt rewriting is the single highest-leverage, most-neglected layer in the ecosystem.** Only two repos ship genuine rewriters: Hunyuan's CVPR-2026 SFT→GRPO pipeline with a 24-key-point AlignEvaluator (see 01 §5), and `shinpr/mcp-image`'s Subject–Context–Style prompt that measurably moved internal quality from 49 → 95 (+94%) (see 04 §3). Everyone else — LogoCreator, LogoLoom, `mcp-logo-gen`, `niels-oz` — does zero rewriting or a static playbook (see 03 §"Prompt construction", 05 §"Prompt construction internals", 06 §"Prompt internals").
3. **The Lexica-scrape / Gemini-distill training pipeline is a legal trap for anyone who wants to train their own rewriter.** Promptist's training corpus violates Lexica ToS (see 02 §2 §2.1); Hunyuan's SFT triplets were generated with Gemini 2.5 Pro + DeepSeek-V3, which puts competitors in Google's "develop ML models" grey zone (see 01 §4). A from-scratch MIT replica with synthetic-LLM + designer-gold pairs is the only clean path (see 02 §9).
4. **Native RGBA via LayerDiffuse is a clean commercial stack; post-hoc matting is the wrong default.** `huchenlei/ComfyUI-layerdiffuse` is Apache-2.0 code + OpenRAIL-M weights (commercial OK), SDXL/SD1.5 only, 8 nodes, with a 9-node minimal workflow JSON (see 17 §"License", §"Wiring plan"). Post-hoc matting via BRIA's RMBG 2.0 is CC-BY-NC-4.0 and commercially unusable despite rembg happily loading it (see 15 §"License per model weight"). `arekhalpern/mcp-logo-gen` picks the wrong side by default — generate-on-white → BRIA-matte (see 06 §"FAL API integration").
5. **BiRefNet-general-lite (MIT, ~45MB, 94% hair accuracy) is the clean-license matting sweet spot.** Quality within 1–2pp of CC-BY-NC BRIA RMBG 2.0 (see 15 §"Alpha quality"), faster than U²-Net, and it is the architecture BRIA retrained from. Gate `bria-rmbg` behind an env-var; `pymatting.estimate_foreground_ml` always runs after any matter for fringe decontamination (see 15 §"Decision", §"Fallback chain").
6. **Vtracer is the only mature MIT raster-to-SVG tracer in 2026; potrace and autotrace are GPL.** ~134KB wasm, ~150–400ms on 1024² logos, 8–30 paths typical (vs 50–150 from autotrace); every alternative is 1-bit-only, GPL, or research-grade (see 16 §"Repo shape and license", §"Speed and quality"). Pre-matte upstream so the tracer sees clean foreground on solid background (see 16 §"Bindings").
7. **Platform-spec fan-out is a four-repo problem, not a one-repo problem.** `ionic-team/capacitor-assets` (MIT, 263k weekly, iOS/Android/PWA easy-mode, see 11 §"Outputs"), `onderceylan/pwa-asset-generator` (MIT, 17.6k weekly, Puppeteer-based favicon/splash/apple-touch/mstile with daily Apple-HIG CI scrape, see 10 §"Apple-spec sourcing"), `guillempuche/appicons` (MIT, iOS 18 appearances + Android 13 monochrome + watchOS/tvOS/visionOS, bus-factor one, see 09 §"Platform coverage"), and `akabekobeko/npm-icon-gen` (MIT, .ico/.icns RLE24, see 12 §"How it's built internally"). Use them as peers behind one `resize_icon_set` facade.
8. **Composition beats generation for iconic single-glyph intents.** `appicon-forge`'s implicit thesis: a 275k-mark Iconify library + CSS gradient + shadow + text token set produces sharper, legible, copyright-safe, ~10³× cheaper icons than any diffusion call (see 08 §"The composition-beats-generation pattern"). Iconify itself (6k★) gives 275k+ curated, vector-perfect marks behind one REST API with per-set license metadata inline in search responses (see 13 §"Repo metrics", §"Search API"). A nine-set permissive allowlist (MDI, Material Symbols, Lucide, Tabler, Heroicons, Phosphor, Iconoir, Remix, Bootstrap) avoids Icons8 Linkware + FontAwesome CC-BY attribution traps (see 13 §"License model").
9. **Logo generation must not hallucinate brand marks — `find_brand_logo` is the right primitive.** SVGL (5.77k★, MIT code + nominative-fair-use on marks) + simple-icons (CC0, 3k brands) let us return the canonical Stripe/FedEx/Meta mark + brand-guidelines URL instead of asking a diffusion model to hallucinate it (see 14 §"Relevance to our prompt-to-asset"). Never redistribute bytes from our server; return URLs + trademark notice (see 14 §"Operational guardrails").
10. **The tri-surface (web UI + hosted MCP + cross-IDE skill) is structurally unoccupied.** Every logo-MCP ships stdio-only, no HTTP, no OAuth: `logoloom`, `shinpr/mcp-image`, `niels-oz`, `mcp-logo-gen` (SSE-localhost-only), plus `Nutlope/logocreator` has zero MCP surface at all (see 03 §"MCP / CLI / skills surface", 04 §2, 05 §"Distribution", 06 §"Transports", 07 §"Transport and distribution"). `shinpr/mcp-image` is the only one that ships a reusable Skill alongside via `npx mcp-image skills install` (see 04 §2).
11. **`vercel/mcp-handler` + `run-llama/mcp-nextjs` is the OAuth-complete reference skeleton.** `mcp-handler@1.1.0` (Apache-2.0, 228k weekly) exposes `createMcpHandler` + `withMcpAuth` + `protectedResourceHandler`; `run-llama/mcp-nextjs` (MIT) ships RFC 7591 Dynamic Client Registration + RFC 8414 AS metadata + PKCE S256 + Auth.js Google upstream + Prisma schema (see 19 §"vercel/mcp-handler", §"run-llama/mcp-nextjs"). Fork `mcp-nextjs`, rename `@vercel/mcp-adapter` → `mcp-handler`, bump `@modelcontextprotocol/sdk` to `1.26.0`, swap hand-rolled Bearer for `withMcpAuth` (see 19 §"Decision").
12. **Vercel AI SDK v5 `experimental_generateImage` is the only typed polyglot image SDK in 2026.** Apache-2.0, `ImageModelV2` stable since PR #6180, providers never throw on unsupported settings (they push to `warnings[]`), `providerMetadata.images[]` contractually present (see 20 §"generateImage surface"). Route by capability, not vendor: Transparency Y/N, reference-image count, text-quality, vector-native, commercial-use — these five dimensions discriminate; vendor identity never should (see 20 §"Capability matrix", §"Capability router").
13. **Text rendering past 3 words is still unsolved on every 2026 text-to-image model.** Seedream 4.5/5 hits 99% text fidelity, `gpt-image-1.5` and Recraft v3 are "excellent", Ideogram v3 ~85%, Imagen 4 / Gemini Pro Image "good"; Flux and SDXL are "poor" to "fair" (see 20 §"Capability matrix"). FLUX.2 Pro (Together) is the only hosted API with native 8-reference-image brand consistency + HEX-color fidelity (see 20 §"@ai-sdk/togetherai").
14. **Fluid compute is load-bearing for hosted MCP, not optional.** Without Vercel Fluid (required by `mcp-handler`), a 10-second SSE connection is 10 seconds of billable single-use function — economically broken for tool-calling agents; Fluid raises `maxDuration` to 800s on Pro/Enterprise and allows in-process concurrency (see 19 §"Vercel Fluid compute requirements"). `REDIS_URL` is required only for SSE resumability, not for pure Streamable HTTP (see 19 §"Redis / KV session store").
15. **The ComfyUI ecosystem is GPL-3.0 contaminated — call over the wire, never vendor.** `yolain/ComfyUI-Easy-Use` is GPL-3.0 (see 18 §"Repo at a glance"); ComfyUI itself is also GPL via forks. The shortest three-node transparent-SDXL template (`easy fullLoader → easy preSamplingLayerDiffusion → easy kSamplerLayerDiffusion`) is our preferred SDXL-RGBA path, but it must run as a serverless worker over HTTP/WS, not as Python imported into our codebase (see 18 §"Minimum workflow JSON", §"Decision").

## Repos Surveyed

| # | Repo | Stars/activity | License | Role in the P2A stack | What they do well | What they miss |
|---|---|---|---|---|---|---|
| 01 | [Hunyuan-PromptEnhancer](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer) | 3,667★ / active, CVPR-2026 | Apache-2.0 (32B) / Tencent-Hunyuan-Community (7B, EU/UK/KR excluded) | Reference recipe for our rewriter (INSPIRE-ONLY) | 24-KP AlignEvaluator taxonomy + SFT→GRPO + four-level CoT scaffold | Asset correctness, transparency, platform specs, palette adherence |
| 02 | [microsoft/Promptist](https://github.com/microsoft/LMOps/tree/main/promptist) | ~4.3k parent / frozen since Dec 2022 | MIT (code), unstated (weights) | Blueprint for license-clean 125M CPU/browser rewriter | SFT→PPO recipe, clipped-CLIP+differential-aesthetic reward shape, three-way augmentation | Lexica-scraped data, SD 1.x tag salad, no transparency, no JSON contract |
| 03 | [Nutlope/logocreator](https://github.com/Nutlope/logocreator) | 6,956★ / last human commit Jan 2025 | **None** (open license issue 14 months unanswered) | UI reference (INSPIRE-UI-ONLY, do not fork) | Split-panel UX, shadcn+Radix baseline, Clerk+Upstash BYOK rate-limit pattern | No rewriter, FLUX-only, no transparency, no MCP, "Tech" preset actively wrong |
| 04 | [shinpr/mcp-image](https://github.com/shinpr/mcp-image) | ~100★ / active | MIT | Canonical reference for prompt-rewriter layer | Subject-Context-Style system prompt (+94% measured), slot-flag MUST blocks, image-aware edit branch, dual packaging (MCP + Skill) | Gemini-only, stdio-only, no validation loop, no platform fan-out |
| 05 | [mcpware/logoloom](https://github.com/mcpware/logoloom) | 7★ / new 2026-03 | MIT | Teachable reference for LLM-authored-SVG branch | `export_brand_kit` shape, BRAND.md auto-gen, opentype.js centering, Skill "Lessons Learned" pattern | No image models, no platform specs, no validation, no brand bundle |
| 06 | [arekhalpern/mcp-logo-gen](https://github.com/arekhalpern/mcp-logo-gen) | ~171★ / stale 13 months | **GPL-3.0** (disqualifies embedding) | Negative reference specimen | — | Hard-coded Ideogram v2, post-hoc BRIA matting default, SSE-only, Cursor-only, no rewriter |
| 07 | [niels-oz/icon-generator-mcp](https://github.com/niels-oz/icon-generator-mcp) | 1★ / 7 releases in 9 days then silence | MIT | Borrowable pattern for SVG-icon sub-flow | "MCP as prompt-builder, host LLM as renderer" two-tool pattern (`prepare_icon_context` → `save_icon`), few-shot exemplars inlined | Single style preset, no validation, no brand bundle, no platform specs |
| 08 | [zhangyu1818/appicon-forge](https://github.com/zhangyu1818/appicon-forge) | 983★ / idle since Jul 2025 | MIT (missing LICENSE file) | Composition-branch schema (port Styles + Iconify wrapper) | ~35-field Styles token set, CSS-composition thesis, JSON-import/export, Iconify wrapper | No backend/MCP, single-PNG export only, no platform specs, no LLM driver |
| 09 | [guillempuche/appicons](https://github.com/guillempuche/appicons) | 2★ / 3-month-old, bus-factor-1 | MIT (no SPDX LICENSE file) | Primary driver for `resize_icon_set` (with guardrails) | iOS 18 appearances, Android 13 monochrome, watchOS/tvOS/visionOS, safe-zone linting, 1500-font autocomplete | Not on npm, Bun-first installer, no .ico/.icns, early-stage |
| 10 | [onderceylan/pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) | 3,006★ / v8.1.4 2026-03 | MIT | First-class dep for PWA+iOS+favicon+mstile slice | Daily HIG CI scrape + static fallback, Puppeteer art-board, light/dark, XHTML/single-quote tag serialization, 17.6k weekly | No Android adaptive, no `.appiconset`, no watchOS, no alpha validation |
| 11 | [ionic-team/capacitor-assets](https://github.com/ionic-team/capacitor-assets) | ~579★ / 263k weekly | MIT | Canonical iOS/Android native-project generator | Node API `IosAssetGenerator`/`AndroidAssetGenerator`/`PwaAssetGenerator`, adaptive icon FG+BG+monochrome, manifest merge | No watchOS/tvOS/visionOS, no iOS 18 appearances, Capacitor-project-shaped |
| 12 | [akabekobeko/npm-icon-gen](https://github.com/akabekobeko/npm-icon-gen) | ~175★ / 26.5k weekly / maintenance-mode | MIT | `.ico`/`.icns` leg of platform stack | Hand-written ICO + ICNS binary serializers incl. Apple RLE24, sharp-based, 60KB unpacked, 3 deps | Windows+macOS+favicon only; no platform iOS/Android |
| 13 | [iconify/iconify](https://github.com/iconify/iconify) | ~6,017★ / active | MIT (framework); icon sets vary | First-class dep for iconic single-glyph fast path | 275k marks across 200+ sets, REST API with license metadata inline in search, `@iconify/utils` runtime, `@iconify/tools` Figma import | Framework solo-maintained by cyberalien (bus factor); per-set license allowlisting mandatory |
| 14 | [pheralb/svgl](https://github.com/pheralb/svgl) | ~5.77k★ / active | MIT (code); nominative fair use on marks | Secondary source behind `find_brand_logo` MCP | 400+ hand-optimized theme-paired brand SVGs, `brandUrl` field for official guidelines, Hono+Upstash API | Title-only search, smaller than simple-icons, "don't clone the product" clause |
| 15 | [danielgatis/rembg](https://github.com/danielgatis/rembg) | ~22.5k★ / 2M/mo PyPI / active | MIT (code); weights vary | Default on-device matting engine (steps 2–7 of fallback chain) | 17-model catalog, CLI + Python API + HTTP server, `post_process_mask`+`estimate_foreground_ml`, `rembg-webgpu` for browser | `bria-rmbg` is CC-BY-NC landmine, GPU speedup often negative, `u2net_cloth_seg` hairy license inheritance |
| 16 | [visioncortex/vtracer](https://github.com/visioncortex/vtracer) | ~5.8k★ / active | MIT | Default vectorizer for `vectorize` MCP + browser preview | ~134KB wasm, pure-Rust, color + 1-bit, 8–30 paths on logos (vs 50–150 autotrace), typed `Config` | `gradient_step` CLI↔`layer_difference` library naming mismatch, no CLI `max_iterations` |
| 17 | [huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse) | ~1.77k★ / quiet but authoritative | Apache-2.0 code + OpenRAIL-M weights | Primary self-hosted native-RGBA path | SDXL FG-Conv/Attn injection, 9-node minimum workflow, FG+BG+Blended joint on SD1.5, `LayeredDiffusionDecodeRGBA` | No Flux/SD3/SD3.5/FLUX.2, dim-mod-64 hard assert, Attn-injection non-determinism on retrained SDXL |
| 18 | [yolain/ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) | ~2.47k★ / v1.3.6 2026 | **GPL-3.0** (call over wire only) | Default node pack for SDXL-transparent path | 3-node transparent-logo skeleton, `easy XYPlot` ablation grids, `a1111_prompt_style`, 207 nodes | GPL contamination, 207-node surface area, SDXL/SD1.5 LayerDiffusion only |
| 19 | [vercel/mcp-handler](https://github.com/vercel/mcp-handler) + [vercel-labs/mcp-for-next.js](https://github.com/vercel-labs/mcp-for-next.js) + [run-llama/mcp-nextjs](https://github.com/run-llama/mcp-nextjs) | 580★ + 352★ + 87★ / active | Apache-2.0 + MIT + MIT | Combined reference skeleton (fork `run-llama/mcp-nextjs`) | `createMcpHandler`+`withMcpAuth`+`protectedResourceHandler`, Streamable HTTP + SSE with Redis resumability, OAuth 2.1 with PKCE S256 + RFC 7591 DCR + RFC 8414 metadata | `mcp-nextjs` uses old `@vercel/mcp-adapter` name, hand-rolled Bearer without `WWW-Authenticate`, outdated `@modelcontextprotocol/sdk` |
| 20 | [vercel/ai](https://github.com/vercel/ai) (v5 `generateImage`) | ~20k★ / 2M weekly / active | Apache-2.0 | Typed foundation for every image call (wrapped in `ImageProvider` port) | `ImageModelV2` contract, providers push unsupported settings to `warnings[]` never throw, `providerMetadata.images[]` contractual, `zod@^4.1.8` | Still `experimental_`, Gemini image via `generateText` not `generateImage`, `fal.realtime` outside SDK, `fireworks` image options still untyped |

## Cross-Cutting Patterns

### P1 — Stdio-only, localhost-only, single-user is the default MCP posture (04, 05, 06, 07)
Every MCP server in the cohort — `shinpr/mcp-image`, `logoloom`, `niels-oz`, `arekhalpern/mcp-logo-gen` (the last on SSE-localhost-only) — ships stdio via `npx`, no HTTP, no OAuth, no multi-tenant story. The hosted Streamable HTTP + OAuth 2.1 surface that Figma/Linear/Gamma already occupy is structurally unclaimed in the logo/icon slice (see 04 §2, 05 §"Distribution", 06 §"Transports & installer UX", 07 §"Transport and distribution"). `vercel/mcp-handler` is the reference library that would close it (see 19 §"vercel/mcp-handler").

### P2 — "Thin wrapper over one provider" is the dominant architecture (03, 04, 06, 07)
Nutlope → FLUX 1.1 Pro on Together (6,956★ on ~5 files of substance, see 03 §"Stack"); `arekhalpern/mcp-logo-gen` → FAL Ideogram v2 hard-coded `enum: ["fal-ai/ideogram/v2"]` (see 06 §"FAL API integration"); `shinpr/mcp-image` → Gemini only (see 04 §4); `niels-oz` → host-LLM-as-renderer (see 07 §"Provider architecture"); LogoLoom → no provider, LLM writes SVG directly (see 05 §"Provider(s) wired in"). None routes by capability. Vercel AI SDK v5 (see 20 §"ImageModelV2") is the only typed polyglot abstraction shipping in 2026.

### P3 — Platform-spec fan-out is absent everywhere in the generator-side repos (03, 04, 05, 06, 07)
No generator-side repo emits `AppIcon.appiconset`, Android adaptive XML, `.ico` multi-frame, `apple-touch-icon`, PWA maskable 80%, or watchOS/visionOS — not Nutlope (1×768² PNG), not `shinpr/mcp-image` (1K/2K/4K sizes only), not `arekhalpern/mcp-logo-gen` (32×32 + 128×128 LANCZOS), not LogoLoom (14 generic files no platform compliance), not `niels-oz` (one SVG). The spec layer is entirely in the `capacitor-assets`/`pwa-asset-generator`/`appicons`/`npm-icon-gen` cluster (categories 9–12) and no one above it wraps them.

### P4 — Brand bundles are a concept absent from every cohort repo (03, 04, 05, 06, 07, 08)
Nutlope exposes four colors + three backgrounds as enums (see 03 §"UX flow"); LogoLoom regenerates colors via three ad-hoc questions per run (see 05 §"Prompt internals"); `shinpr/mcp-image` has no brand concept at all (see 04 §5); `appicon-forge` ships a JSON `Styles` blob round-trip but doesn't call it brand (see 08 §"Gradient / shadow token system"). No repo parses `brand.md` / AdCP `brand.json` / brandspec. This is the single most-missing primitive across the entire cohort.

### P5 — Validation loops do not exist (03, 04, 05, 06, 07, all cohort repos)
Every cohort repo trusts the model output. Zero alpha-coverage checks, zero contrast validators, zero safe-zone linters, zero OCR/Levenshtein wordmark checks, zero palette ΔE2000 checks. `shinpr/mcp-image`'s `inferSelectedPractices` post-hoc keyword-scan is "telemetry, not control flow" (see 04 §3d). Hunyuan's AlignEvaluator (see 01 §5) is the only piece of prior art with a real validator shape, and it is asset-blind (no transparency/platform/palette keys).

### P6 — GPL-3.0 contamination risk is concentrated in the ComfyUI ecosystem + one logo-MCP (06, 18)
`arekhalpern/mcp-logo-gen` is GPL-3.0 on a Python server (see 06 §"Repo metrics"); `ComfyUI-Easy-Use` is GPL-3.0 (see 18 §"Repo at a glance"); ComfyUI itself is GPL via forks. All three must run as out-of-process serverless workers over HTTP/WS — never imported. Apache-2.0 code + OpenRAIL-M weights (17 §"License") is the clean stack; CC-BY-NC weights (`bria-rmbg`, 15 §"License per model weight") are a commercial landmine that `rembg` will happily auto-download.

### P7 — The "don't redistribute bytes, return URLs + attribution" pattern for brand marks (13, 14)
Iconify's license metadata is returned inline in `/search` responses so consumers can license-filter without a second round-trip (see 13 §"Search API"); SVGL's terms explicitly bless "extensions, plugins, or other tools" but forbid rival logo-library products (see 14 §"The explicit API usage constraint"). Both projects converge on the same shape for integration: return `{ mark_url, brand_guidelines_url, trademark_notice }` pointing at the origin, never mirror. Primary = simple-icons (CC0); secondary = SVGL (MIT code + nominative fair use).

### P8 — License metadata on weights is often wrong in README and correct in YAML (01, 15, 17)
Hunyuan-32B's card text says Apache-2.0 but tag panel shows `license:other` and GitHub repo shows `NOASSERTION` (see 01 §4). BRIA RMBG 2.0 is CC-BY-NC-4.0 despite `rembg` loading it like any other checkpoint (see 15 §"License per model weight"). LayerDiffuse weights are CreativeML OpenRAIL-M (use-based, commercial OK) — often confused with CC-BY-NC (see 17 §"License: code vs. weights"). Every weight needs an individual license audit; trust YAML frontmatter over README prose.

### P9 — "Thin SKILL.md wrapper" is the cross-IDE distribution pattern (04, 05, 07)
`shinpr/mcp-image` ships `npx mcp-image skills install --path <dir>` which drops `SKILL.md` into `~/.cursor/skills` / `~/.codex/skills` / `~/.claude/skills` from the same npm package (see 04 §1); `logoloom` embeds its 4-phase logo workflow entirely in `skills/design-logo/SKILL.md` (see 05 §"Distribution"); `niels-oz/icon-generator-mcp` returns few-shot expert prompts for the host LLM to render (see 07 §"Tools"). The emergent pattern: one npm package ships both the stdio MCP and a portable Skill, and the Skill often carries the real IP (playbook, few-shots, lessons learned).

### P10 — "Brand-text-as-SVG is the undifferentiated pattern" (05, 08)
LogoLoom and appicon-forge both converge independently: brand text rendered via opentype.js/SVG, not via diffusion model. LogoLoom's `text_to_path` caveat ("don't run text_to_path unless print — it loses gradient fills on `<tspan>` and kerning") is the sort of operational wisdom that only emerges from shipping (see 05 §"Prompt internals"). appicon-forge pairs Google Fonts + Iconify glyph deterministically (see 08 §"The composition-beats-generation pattern"). This is the same conclusion as the global P2A rule "do NOT render brand text in a diffusion sampler past 3 words."

## Gaps

1. **No integrator exists.** Twenty repos, each doing one slice, none doing the stack. Routing by capability + prompt rewriting + asset-type classifier + platform fan-out + validation loop + brand-bundle consumer + tri-surface packaging is the empty box.
2. **No asset-aware rewriter.** Hunyuan's 24-KP taxonomy has zero keys for transparency, platform specs, safe zones, palette adherence, stroke weight, negative space. `shinpr`'s S-C-S is photoreal-first. Asset correctness is the differentiator.
3. **No validation layer anywhere.** Tier-0 (alpha coverage, checkerboard FFT signature, dimension exactness), tier-1 (safe-zone bbox, palette ΔE2000, wordmark OCR Levenshtein), tier-2 (compositional correctness via DSG/TIFA) do not exist in any cohort repo.
4. **No brand-bundle parser.** `brand.md` / AdCP `brand.json` / brandspec / hex palettes / font tokens / `do_not[]` lists — no repo consumes these. appicon-forge's `Styles` JSON is the closest shape but has no brand-concept plumbing.
5. **No capability-routing model registry.** Nutlope is FLUX-only; `shinpr` is Gemini-only; `mcp-logo-gen` is Ideogram-v2-only. Vercel AI SDK v5 gives the typed provider abstraction (see 20) but no one has built a `{transparency, refs, text, vector, commerce, cost, latency}` → provider router on top.
6. **No hosted MCP with OAuth in the asset-generation slice.** The tri-surface (web UI + Streamable HTTP + cross-IDE Skill) with Auth.js upstream + RFC 7591 DCR is reference-implemented at 19 but never combined with image-generation tooling.
7. **No native-RGBA Flux path inside the mainstream Comfy packs.** Easy-Use is SDXL/SD1.5 only (see 18 §"Flux transparency"); `huchenlei/ComfyUI-layerdiffuse` ticket #121 for Flux is stale since 2024 (see 17 §"Supported base models"). `RedAIGC/Flux-version-LayerDiffuse` exists as a separate pack with unreviewed license.
8. **No composition-vs-generation intent classifier.** appicon-forge proves single-glyph composition is right for a large class of requests, but no repo has a rewriter that decides "compose via Iconify" vs "generate via diffusion" from the brief.
9. **No modality-aware prompt dialect switcher.** Promptist emits SD-1.x tag salad (actively harmful for Imagen/`gpt-image-1`); `shinpr`'s S-C-S emits Gemini-style prose (sub-optimal for SDXL weighted tags). No rewriter in the cohort has per-target-family verbalizers.
10. **No shared `ImageProvider` port.** Vercel AI SDK v5 is close but `fal.realtime` is outside it, Together FLUX.2 8-refs is awkward through it, OpenRouter is lossy through it. The capability-typed `ImageProvider` interface from 20 is the abstraction to ship.

## Actionable Recommendations for the prompt-to-asset Plugin

1. **Fork `run-llama/mcp-nextjs` as the web/MCP skeleton** (see 19 §"Decision"). Rename `@vercel/mcp-adapter` → `mcp-handler@^1.1.0`, bump `@modelcontextprotocol/sdk` to `1.26.0`, swap hand-rolled Bearer for `withMcpAuth`, move `[transport]` under `app/api/`, replace the toy tool with `lib/tools/*`. Keep the four-migration Prisma chain for OAuth+PKCE and the Auth.js-as-upstream-IdP split.
2. **Adopt Vercel AI SDK v5 `experimental_generateImage` as the typed foundation** behind an `ImageProvider` port (see 20 §"ImageProvider interface"). Wrap AI SDK providers, direct `fal.realtime`, direct Together FLUX.2, OpenRouter, and Gateway as peers. Route by `{transparency, referenceImages.max, textRendering, vectorNative, commercialUse, pricingPerImage, typicalLatencyMs}` — never by vendor name.
3. **Lift `shinpr/mcp-image`'s Subject-Context-Style system prompt verbatim** (MIT, +94% measured) into our `enhance_prompt` tool (see 04 §3a). Generalize the slot-flag MUST blocks from `maintainCharacterConsistency`/`blendImages`/`useWorldKnowledge` to `asset_type`/`transparency_required`/`platform_constraints`/`brand_bundle`/`target_model_family`. Layer the image-aware editing branch on top (see 04 §3b).
4. **Borrow the Hunyuan AlignEvaluator shape, extend to ~32 KPs** (see 01 §11). Add 6–8 asset-specific heads (Transparency Validity, Alpha-channel Cleanliness, Safe-zone Respect, Favicon Legibility, App-icon Platform Compliance, Brand-palette Adherence, Stroke-weight Vector-friendliness, Negative-space Respect). Train SFT→GRPO on synthetic LLM-authored pairs — avoid Lexica (Promptist trap, 02 §2) and avoid Gemini-distilled data (Hunyuan trap, 01 §4).
5. **Use `guillempuche/appicons` as primary driver for `resize_icon_set`** with `ionic-team/capacitor-assets` as typed fallback behind the same port, plus `pwa-asset-generator` for PWA/favicon/mstile slice, plus `npm-icon-gen` for `.ico`/`.icns` (see 09 §"Decision", 10 §"Decision", 11 §"Decision", 12 §"Decision"). Vendor appicons at a pinned commit SHA rather than `curl | bash`-installing.
6. **Default transparency to native-RGBA via LayerDiffuse** (see 17 §"Decision"). Serverless worker on RunPod L4 24GB running `ComfyUI-layerdiffuse` nine-node workflow (Apache-2.0 + OpenRAIL-M, commercial OK). Fall back to `gpt-image-1.5 background: "transparent"` or Ideogram 3 when latency budget allows. Post-hoc matting is last resort, not default.
7. **Matte with BiRefNet-general-lite, never BRIA RMBG 2.0 by default** (see 15 §"Decision"). MIT, ~45MB, 94% hair accuracy. Gate `bria-rmbg` behind `REMBG_ALLOW_BRIA=1` env-var and never wire to hosted MCP without a paid BRIA license. Chain `pymatting.estimate_foreground_ml` after every matte for fringe decontamination.
8. **Vectorize with `vtracer 0.6.x` / `vtracer-wasm ^0.1.0`** (see 16 §"Decision"). MIT, ~134KB wasm in a Web Worker, Rust native for large inputs. Curate logo/icon/illustration presets over the raw flags. Pre-matte upstream. Keep `potrace` shelled out (not bundled — GPL) for 1-bit wordmark work.
9. **Ship `find_brand_logo` as an MCP tool** backed by `simple-icons` (CC0) primary + SVGL (MIT, nominative fair use) fallback (see 14 §"Decision"). Return URLs and brand-guidelines links, never redistributed bytes. Attach a trademark notice to every response. Do not build a logo-library UI on our own site (collides with SVGL's "don't clone" clause).
10. **Ship `search_iconify_glyph` as an MCP tool** backed by `@iconify/utils` + `@iconify/json` (see 13 §"Decision"). Pin the license allowlist to the nine permissive-without-attribution sets (MDI, Material Symbols, Lucide, Tabler, Heroicons, Phosphor, Iconoir, Remix, Bootstrap) plus SVG Spinners. This is the composition-branch for iconic single-glyph intents.
11. **Port `appicon-forge`'s `Styles` schema + Iconify REST wrapper** into a `compose_icon` MCP tool (see 08 §"Decision"). Render server-side via Satori or headless Chromium — not browser DOM. Wire behind `enhance_prompt`'s `{ mode: "compose" | "generate" }` intent classifier. `Styles` plus the `npm-icon-gen`/`pwa-asset-generator`/`capacitor-assets`/`guillempuche/appicons` platform fan-out is the composition side of the router.
12. **Wrap `ComfyUI-Easy-Use`'s 3-node transparent-SDXL template as a worker**, never vendor (GPL-3.0, see 18 §"Decision"). `easy fullLoader → easy preSamplingLayerDiffusion → easy kSamplerLayerDiffusion`; call over HTTP/WS; pin commits; rebuild container weekly.
13. **Copy the UI shell from `Nutlope/logocreator` in spirit only** (INSPIRE-UI-ONLY, see 03 §"Decision"). No LICENSE → cannot lift code. Split-panel layout, Clerk + Upstash `fixedWindow(3, "60 d")` + BYOK escape-hatch pattern, shadcn+Radix+Tailwind+Framer baseline. Replace the six style presets with our research-backed, model-family-aware prompt fragments; fix the "Tech" preset bug (which currently prompts `cinematic, photorealistic` for flat vector).
14. **Do not ship Promptist's 125M checkpoint as the free-tier rewriter** (see 02 §"Decision"). Instead, replicate the SFT→PPO/GRPO recipe on SmolLM2-135M (Apache-2.0) with synthetic + designer-gold pairs. Keep the three-way source augmentation (MC/MCM/RMC) and the clipped-CLIP + differential-aesthetic reward shape; swap the aesthetic head for our asset-correctness ensemble (alpha coverage, platform-spec linter, palette ΔE, safe zone, wordmark Levenshtein). ~1 person-month + ~$5k compute for v0.
15. **Ship dual packaging (MCP + portable Skill) from one npm package** (borrow from `shinpr/mcp-image`, see 04 §"Decision"). `npx prompt-to-asset skills install --path <dir>` drops the rewriter's system prompt + few-shots into `~/.cursor/skills` / `~/.codex/skills` / `~/.claude/skills`. Cross-IDE reach without re-packaging.

## Primary Sources Aggregated

### Rewriter papers + repos
- Hunyuan-PromptEnhancer — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer (01)
- PromptToAsset CVPR 2026 paper (arXiv:2509.04545) — https://arxiv.org/abs/2509.04545 (01)
- AlignEvaluator + T2I-Keypoints-Eval dataset — https://huggingface.co/datasets/PromptEnhancer/T2I-Keypoints-Eval (01)
- HunyuanImage-2.1 — https://huggingface.co/tencent/HunyuanImage-2.1 (01)
- PromptEnhancer-32B weights — https://huggingface.co/PromptEnhancer/PromptEnhancer-32B (01)
- Microsoft Promptist code — https://github.com/microsoft/LMOps/tree/main/promptist (02)
- Promptist paper (arXiv:2212.09611, NeurIPS 2023 Spotlight) — https://arxiv.org/abs/2212.09611 (02)
- Promptist HF model — https://huggingface.co/microsoft/Promptist (02)
- LAION improved-aesthetic-predictor — https://github.com/christophschuhmann/improved-aesthetic-predictor (02)
- DPO-Diffusion (arXiv:2407.01606) — https://arxiv.org/pdf/2407.01606 (02)
- IPGO (arXiv:2503.21812) — https://arxiv.org/pdf/2503.21812 (02)
- RATTPO (OpenReview BsZNWXD3a1) — https://openreview.net/pdf?id=BsZNWXD3a1 (02)

### Logo / icon MCP cohort
- shinpr/mcp-image — https://github.com/shinpr/mcp-image (04)
- shinpr Subject-Context-Style post — https://dev.to/shinpr/from-49-to-95-how-prompt-engineering-boosted-gemini-mcp-image-generation-19n8 (04)
- mcpware/logoloom — https://github.com/mcpware/logoloom (05)
- logoloom SKILL.md — https://raw.githubusercontent.com/mcpware/logoloom/main/skills/design-logo/SKILL.md (05)
- arekhalpern/mcp-logo-gen / sshtunnelvision — https://github.com/arekhalpern/mcp-logo-gen + https://github.com/sshtunnelvision/MCP-LOGO-GEN (06)
- niels-oz/icon-generator-mcp — https://github.com/niels-oz/icon-generator-mcp (07)
- Nutlope/logocreator — https://github.com/Nutlope/logocreator (03)
- logo-creator.io (production instance) — https://www.logo-creator.io/ (03)

### Composition / icon libraries
- zhangyu1818/appicon-forge — https://github.com/zhangyu1818/appicon-forge (08)
- appicon-forge live instance — https://zhangyu1818.github.io/appicon-forge/ (08)
- iconify/iconify — https://github.com/iconify/iconify (13)
- iconify REST API docs — https://iconify.design/docs/api/ (13)
- iconify collections.md (license metadata) — https://github.com/iconify/icon-sets/blob/master/collections.md (13)
- @iconify/utils — https://iconify.design/docs/libraries/utils/ (13)
- pheralb/svgl — https://github.com/pheralb/svgl (14)
- SVGL legal / nominative fair use — https://thesvg.org/legal (14)
- simple-icons disclaimer — https://github.com/simple-icons/simple-icons/blob/master/DISCLAIMER.md (14)

### Platform-spec fan-out
- guillempuche/appicons — https://github.com/guillempuche/appicons (09)
- Apple HIG app icons — https://developer.apple.com/design/human-interface-guidelines/app-icons (09, 10)
- Android adaptive icon guidance — https://developer.android.com/develop/ui/views/launch/icon_design_adaptive (09)
- onderceylan/pwa-asset-generator — https://github.com/elegantapp/pwa-asset-generator (10)
- web.dev maskable icon — https://web.dev/maskable-icon/ (10)
- ionic-team/capacitor-assets — https://github.com/ionic-team/capacitor-assets (11)
- Capacitor splash + icons guide — https://capacitorjs.com/docs/guides/splash-screens-and-icons (11)
- akabekobeko/npm-icon-gen — https://github.com/akabekobeko/npm-icon-gen (12)

### Matting + vectorizing
- danielgatis/rembg — https://github.com/danielgatis/rembg (15)
- ZhengPeng7/BiRefNet — https://github.com/ZhengPeng7/BiRefNet (15)
- briaai/RMBG-2.0 (CC-BY-NC caveat) — https://huggingface.co/briaai/RMBG-2.0 (15)
- xuebinqin/U-2-Net — https://github.com/xuebinqin/U-2-Net (15)
- xuebinqin/DIS — https://github.com/xuebinqin/DIS (15)
- PramaLLC/BEN2 — https://github.com/PramaLLC/BEN2 (15)
- @imgly/background-removal-node — https://www.npmjs.com/package/@imgly/background-removal-node (15)
- rembg-webgpu — https://github.com/Remove-Background-ai/rembg-webgpu (15)
- BiRefNet-vs-rembg-vs-u2net production benchmark — https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-1620 (15)
- visioncortex/vtracer — https://github.com/visioncortex/vtracer (16)
- vtracer docs — https://www.visioncortex.org/vtracer-docs (16)
- vtracer-wasm (npm) — https://www.npmjs.com/package/vtracer-wasm (16)
- potrace — https://potrace.sourceforge.net/ (16)
- autotrace — https://github.com/autotrace/autotrace (16)

### ComfyUI native-RGBA
- huchenlei/ComfyUI-layerdiffuse — https://github.com/huchenlei/ComfyUI-layerdiffuse (17)
- LayerDiffuse paper (arXiv:2402.17113) — https://arxiv.org/abs/2402.17113 (17)
- LayerDiffusion HF weights (OpenRAIL-M) — https://huggingface.co/LayerDiffusion/layerdiffusion-v1 (17)
- RedAIGC/Flux-version-LayerDiffuse — https://github.com/RedAIGC/Flux-version-LayerDiffuse (17, 18)
- yolain/ComfyUI-Easy-Use — https://github.com/yolain/ComfyUI-Easy-Use (18)
- Easy-Use docs — https://docs.easyuse.yolain.com/en/get-started/introduction (18)
- yolain/ComfyUI-Yolain-Workflows — https://github.com/yolain/ComfyUI-Yolain-Workflows (18)

### MCP skeletons + hosting
- vercel/mcp-handler — https://github.com/vercel/mcp-handler (19)
- mcp-handler AUTHORIZATION.md — https://raw.githubusercontent.com/vercel/mcp-handler/main/docs/AUTHORIZATION.md (19)
- mcp-handler ADVANCED.md — https://raw.githubusercontent.com/vercel/mcp-handler/main/docs/ADVANCED.md (19)
- vercel-labs/mcp-for-next.js — https://github.com/vercel-labs/mcp-for-next.js (19)
- Vercel MCP template listing — https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js (19)
- Vercel MCP support changelog — https://vercel.com/changelog/mcp-server-support-on-vercel (19)
- Vercel deploy-mcp docs — https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel (19)
- Vercel Fluid compute — https://vercel.com/docs/functions/fluid-compute (19)
- run-llama/mcp-nextjs — https://github.com/run-llama/mcp-nextjs (19)

### Vercel AI SDK v5 image
- vercel/ai — https://github.com/vercel/ai (20)
- `generateImage` reference — https://v5.ai-sdk.dev/docs/reference/ai-sdk-core/generate-image (20)
- image-generation docs — https://v5.ai-sdk.dev/docs/ai-sdk-core/image-generation (20)
- v5 migration guide — https://v5.ai-sdk.dev/docs/migration-guides/migration-guide-5-0 (20)
- AI SDK blog — https://vercel.com/blog/ai-sdk-5 (20)
- AI Gateway image — https://vercel.com/docs/ai-gateway/image-generation/ai-sdk (20)
- `@ai-sdk/openai` — https://ai-sdk.dev/providers/ai-sdk-providers/openai (20)
- `@ai-sdk/fal` — https://ai-sdk.dev/v5/providers/ai-sdk-providers/fal (20)
- `@ai-sdk/luma` — https://ai-sdk.dev/v5/providers/ai-sdk-providers/luma (20)
- `@ai-sdk/fireworks` — https://sdk.vercel.ai/providers/ai-sdk-providers/fireworks (20)
- community openrouter provider — https://sdk.vercel.ai/providers/community-providers/openrouter (20)
- OpenAI image gen guide — https://platform.openai.com/docs/guides/image-generation (20)
- Imagen 4 docs — https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001 (20)
- fal.realtime docs — https://fal.ai/docs/api-reference/client-libraries/javascript/realtime (20)
- FLUX.2 on Together — https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai (20)

## Status

Index synthesized 2026-04-21 across 20 repo deep dives (01–20).
