---
wave: 4
role: synthesizer
slug: RECOMMENDED
date: 2026-04-19
status: final
supersedes: [01, 02, 03, 04, 05, 06, 07, 08, 09]
---

# Recommended Combination

## 1. Executive decision

**Adopt the Hybrid-Capability-Router stack (anchored on `07-hybrid`) with an
MVP shipment modeled on `01-mvp-2-weeks`, an agent surface shaped by
`06-agent-native-first`, and a correctness loop ratcheted in from
`03-quality-max` by week 10.** One sentence: a capability-routed
commercial-API-primary / OSS-long-tail product, shipped in 14 days as a
tri-surface (web + hosted MCP + skills pack), then hardened into a
validated-regenerate asset engine with fifteen Zod-typed tools that are
*the* product. The three concrete sacrifices: (a) no self-hosted rewriter
or GPU fleet in the first 90 days — we defer the Qwen2.5-7B / Hunyuan-32B
moat of `04-self-hosted-sovereign` and the ComfyUI-primary plane of
`09-comfyui-native`; (b) no anonymous zero-auth free tier in v1 — the
`05-free-tier` four-lane burn-down model is deferred behind sign-in until
viral mechanics are proven; (c) no pure-browser / WebMCP-primary product —
`08-edge-browser-first`'s in-tab pipeline becomes a v1.2 privacy-mode
upgrade, not the ship shape.

## 2. Comparison matrix

Using the seven scorecard dimensions from `01-mvp-2-weeks` as the
canonical axes (the only planner with a fully-numeric rubric), scoring
each of the nine candidates 1–5 where 5 is best. Scores are lifted from
planner 01 verbatim where available and interpolated for the other eight
from the evidence in their own text (build-order length, declared
trade-offs, cost discussion, declared ops load, declared agent surface,
declared registry coverage).

| # | Planner | Ship-speed | Asset-correctness | License-safety | Cost | Ops-burden | Agent-native parity | Distribution-reach | Total |
|---|---|---|---|---|---|---|---|---|---|
| 01 | `01-mvp-2-weeks` | **5** | 3 | **5** | 3 | 4 | 4 | 3 | **27** |
| 02 | `02-license-clean-commercial` | 3 | 4 | **5** | 3 | 3 | 3 | 3 | 24 |
| 03 | `03-quality-max` | 1 | **5** | 4 | 2 | 2 | 4 | 3 | 21 |
| 04 | `04-self-hosted-sovereign` | 1 | 4 | 4 | 4 | 1 | 3 | 2 | 19 |
| 05 | `05-free-tier` | 4 | 2 | 4 | **5** | 4 | 2 | 3 | 24 |
| 06 | `06-agent-native-first` | 3 | 3 | 4 | 3 | 3 | **5** | **5** | 26 |
| 07 | `07-hybrid` | 3 | 4 | 4 | 4 | 3 | 4 | 4 | **26** |
| 08 | `08-edge-browser-first` | 3 | 3 | 4 | **5** | 4 | 4 | 4 | **27** |
| 09 | `09-comfyui-native` | 2 | 4 | 3 | 4 | 1 | 3 | 3 | 20 |

Two candidates tie at the top of the raw rubric (`01-mvp-2-weeks` and
`08-edge-browser-first` at 27), with `07-hybrid` and `06-agent-native-first`
one point behind. **Neither tied leader is the right choice as the
standalone primary strategy**, and this is where rubric totals mislead.
`01-mvp-2-weeks` is intentionally a *day-14 snapshot* — it scores a 5 on
ship-speed by deliberately dropping the validator loop, the self-hosted
rewriter, and eight of the nine registries, and every one of those
deferrals is a 2026 competitive-pressure time-bomb that a permanent
strategy cannot absorb. `08-edge-browser-first` is the optimal *privacy-
and-cost* surface but flatly cannot host its own generator (it says so
explicitly in §"What does not work in this regime") and so reduces the
product to a matte-vectorize-package pipeline in front of someone else's
generator — strategically that is a feature, not an identity. The
strategically correct primary is `07-hybrid` because it (a) contains
`01-mvp-2-weeks` as its weeks-1–2 lane, (b) contains `05-free-tier` as a
router branch, (c) contains `08-edge-browser-first` as an optional
post-processing surface, (d) contains `09-comfyui-native` as one of three
execution providers rather than all of them, and (e) is the only planner
whose routing table is explicitly *data, not code* — meaning every other
planner's preferred generator becomes one JSON row we can turn on later.
Hybrid is the plan that can *become* any of the other eight plans without
a rewrite, which is the property a 14-week roadmap most needs.

## 3. The recommended stack

Using the same ten-layer schema the planners used. Each layer names which
source planner the choice is adopted from. This is the composed stack, not
a new strategy.

### Layer 1 — Prompt enhancement

**MVP (weeks 1–6): hosted LLM + ported Subject-Context-Style scaffold.**
Claude 4 Sonnet via `@ai-sdk/anthropic` with the `shinpr/mcp-image`
Subject-Context-Style system prompt generalized to six asset-type slots
(`asset_type`, `transparency_required`, `text_content`,
`target_model_family`, `brand_palette`, `platform_constraints`). This is
the `01-mvp-2-weeks` choice verbatim — it ships inside 14 days, costs
~$0.01/enhance, and the +94 % measured uplift on the shinpr scaffold
justifies every other planner pausing here in the first phase.

**Correctness pass (weeks 7–10): three-rewriter ensemble.** Add the
`03-quality-max` ensemble on the paid tier: primary frontier LLM rewrite,
cross-check second-opinion pass, and a per-family deterministic
verbalizer that emits Imagen-dialect natural-sentences vs. Flux/SDXL
tag-salad from one canonical positive/negative JSON contract. The
verbalizer is the step no OSS competitor ships; it is ~300 LOC and
becomes the `route_model` tool's introspection output.

**Open question (v1.2+): self-hosted rewriter moat.** The long-run plan
from `04-self-hosted-sovereign` and the Wave 2 `22-repo-deep-dives/01-hunyuan-prompt-to-asset.md`
argues for a Qwen2.5-7B-Instruct SFT+GRPO against an extended 32-key-point
AlignEvaluator; we adopt that *as the v1.2 target*, not as a v1 blocker.
Training capex + GPU serving is an 8-week build on its own and only
returns on investment when free-tier volume exceeds paid rewriter cost —
a fork we take on evidence, not speculation.

### Layer 2 — Model routing / SDK

**Vercel AI SDK v5 `experimental_generateImage` as the typed spine, with
`VercelAiSdkProvider` + `DirectSdkProvider` + `ModalComfyuiProvider` as
three adapters behind one `ImageProvider` interface — adopted verbatim
from `07-hybrid` §"Dispatch Layer".** The MVP (`01-mvp-2-weeks`) ships
with only the `VercelAiSdkProvider` and two providers (`@ai-sdk/openai`,
`@ai-sdk/google-vertex`); the hybrid plan expands to five providers by
week 6 (`@ai-sdk/fal`, `@ai-sdk/togetherai`, `@ai-sdk/replicate`) and the
direct-SDK hot paths for fal realtime WebSocket + Together FLUX.2 8-ref
by week 8. The router is **data, not code** — a patchable JSON table
shipped as `lib/router/rules.json` exactly as `07-hybrid` §"Routing Rules"
describes.

### Layer 3 — Execution

**Hosted APIs primary; serverless ComfyUI as the long-tail lane; no
self-hosted GPU fleet in the first 90 days.** Hot paths go to
`gpt-image-1` (transparency + text-heavy), Imagen 4 / Nano Banana (flat
logos), Ideogram 3 (wordmarks), Recraft V3 (native SVG), Together FLUX.2
(8-ref brand consistency), fal realtime (interactive refine). The OSS
execution lane is `runpod-workers/worker-comfyui` on Modal, invoked only
when `07-hybrid`'s router picks SDXL+LoRA (brand consistency at batch),
Flux-schnell+LayerDiffuse (transparent stickers at batch), or
byte-reproducible pinned-seed lanes. The six ComfyUI workflow templates
from `09-comfyui-native` (`logo-flat`, `logo-3d-emblem`,
`transparent-sticker`, `app-icon-mark`, `og-social-card`,
`illustration-empty-state`) are adopted verbatim *as the template library
for the long-tail lane*, locked by `bentoml/comfy-pack` `.cpack.zip` per
`09-comfyui-native` §"Lockfile approach". What we do **not** adopt from
`09-comfyui-native`: making ComfyUI the default plane. Hot-path
commercial APIs stay primary because their latency, text ceiling, and
transparency fidelity demonstrably beat every OSS alternative at the
requests that form ~90 % of traffic (`07-hybrid` §"Capabilities Matrix").

### Layer 4 — Post-processing

**Every matte / vectorize / upscale / favicon / icon / OG step is OSS,
browser-first where possible, edge-hosted where not, adopted from
`08-edge-browser-first` §"Surface 0".** `@imgly/background-removal-node`
(MIT) or `rembg-webgpu` + BiRefNet-general-lite (MIT) for matte;
`vtracer-wasm` (134 KB, MIT) for vectorization; SVGO for cleanup;
`@vercel/og` + Satori (MIT / MPL-2.0) for deterministic OG text
composition; `@jsquash/png` + `@jsquash/resize` (WASM, Squoosh fork) for
resize/encode on edge routes. No commercial matting or upscaling API
deserves a router slot (`07-hybrid` §"Post-Processing Chain Is Always
OSS"). Two explicit exceptions: BRIA RMBG 2.0 via *hosted endpoint only*
(CC-BY-NC weights never embedded — `02-license-clean-commercial` §6) and
BRIA's indemnified API as a paid-tier upsell for enterprise IP safety.

### Layer 5 — Platform-spec / resizer

**Three MIT Node libraries behind one `resize_icon_set` MCP tool — the
`01-mvp-2-weeks` day-5 wiring.** `pwa-asset-generator` (PWA + Apple splash
+ favicon HTML), `@capacitor/assets` (iOS `AppIcon.appiconset` + Android
adaptive), `icon-gen` (`.ico` + `.icns`), composed in-memory into one
ZIP. `guillempuche/appicons` added week 3 for iOS 18 + visionOS +
watchOS + tvOS + RN + Expo + Flutter parity (`03-quality-max` §"Layer 7"
+ Wave 2 `22-repo-deep-dives/09-guillempuche-appicons.md`). `itgalaxy/favicons` added week 4 as a
second favicon backend for CI diff-testing. The composition layer from
`07-hybrid` router rule #2 (Iconify compose when a `logo-mark.svg`
already exists) ships week 6 — a deterministic `sharp(svg).resize()`
pipeline at $0 cost per call and 20 ms per favicon.

### Layer 6 — Validation / evaluation

**MVP: three sharp-based validators (alpha / palette-ΔE / size) — the
`01-mvp-2-weeks` layer-6 choice.** Weeks 7–10 graduate to the
`03-quality-max` six-gate scoreboard: Long-CLIP + PickScore + HPSv3 +
ImageReward + CLIP-FlanT5-VQA for text-alignment; expanded alpha-coverage
(edge-histogram bimodality check for LayerDiffuse regressions);
PaddleOCR + Tesseract 5 for wordmark correctness; color-thief + ΔE2000
for palette; safe-zone / contrast / geometry per-platform; and a Claude
Opus vision rubric as the tier-2 subjective quality judge. Tree-search
regeneration (the `03-quality-max` §8.2 diagnostic-aware re-prompt) is
the product differentiator; budget cap 12 iterations paid / 4 free. The
500-brief × 5-seed golden set with nightly CI regression (§8.3) is the
ratchet that converts quality from a launch property into a permanent
property.

### Layer 7 — Brand bundle

**Accept `brand.md` (thebrandmd format) as the MVP input, with
`brand.yaml` (brandspec) and AdCP `brand.json` normalization added by
week 6 — adopted from `06-agent-native-first` §"Layer 1".** URL ingest
(`iamdanwi/brand-forge` + `dembrandt` patterns) week 8. Auto-derived
first-pass from a live site's meta-tags + favicon palette + hero imagery
week 10. The canonical internal representation is one Zod-typed `Brand`
object with `colors[]` (OKLCH, not hex), `typography`, `logo.variants[]`,
`personality`, `guardrails.do_not[]`, `imagery.style` — fed into the
rewriter's system prompt and into `validate_asset`'s palette and
safe-zone gates. Auto-LoRA training at 20 approved assets (`03-quality-max`
§"Layer 4" + `07-hybrid` rule #5) is a v1.2 feature — correct but
demands the Modal ComfyUI lane be production-hardened first.

### Layer 8 — Agent surface (MCP, Skills, WebMCP, CLI)

**The `06-agent-native-first` fifteen-tool inventory is the product
surface, verbatim.** `enhance_prompt`, `generate_logo`,
`generate_icon_set`, `generate_illustration`, `generate_og_image`,
`generate_favicon`, `remove_background`, `vectorize`, `resize_icon_set`,
`validate_asset`, `route_model`, `brand_bundle_parse`,
`brand_bundle_export`, `list_history`, `get_asset`. Three transports
from one `lib/tools/` SSOT: Streamable HTTP at `/api/[transport]/` via
`mcp-handler@^1.1.0` + `withMcpAuth` (fork of `run-llama/mcp-nextjs`,
`01-mvp-2-weeks` day-1 choice); stdio via `server/index.mjs` packaged as
both `npx @prompt-to-asset/mcp` and `.mcpb` (via `anthropics/mcpb`);
WebMCP via `@mcp-b/webmcp-polyfill` mirroring only the read-only subset
(annotations `readOnlyHint: true`) until the tool-impersonation issue
#101 is resolved (`08-edge-browser-first` §"WebMCP" + `06-agent-native-first`
§"Three transports"). Skill envelopes for seven IDE targets (Claude Code,
Cursor, Windsurf, Codex, Gemini CLI, VS Code, Zed) regenerated from one
canonical `skills/*/SKILL.md` tree by `scripts/sync-mirrors.sh`. Parity
is not aspirational — it is a `scripts/verify-parity.mjs` CI gate that
fails the build on any drift between `lib/tools/`, the UI routes, and
every IDE envelope.

### Layer 9 — UI

**Next.js 15 App Router + Tailwind 4 + shadcn/ui + Auth.js (Google
OAuth) with the split-panel layout shape of `Nutlope/logocreator`.**
Adopted from `01-mvp-2-weeks` day-7 choice but with three explicit
differences: (a) we show the rewritten prompt in a collapsible details
block by default (differentiation — Nutlope hides it); (b) we render a
validation badge row from `validate_asset` results after every
generation; (c) there is a `resize_icon_set` → ZIP button on every
generated image, making the OSS `appicon.co` replacement a first-class
UI action. Every UI button is structurally a thin wrapper over
`fetch('/api/ui/<tool>')` which imports the same `lib/tools/<tool>.ts`
handler the MCP calls — the `06-agent-native-first` parity invariant.
The UI is a demo of the tools, not a separate product.

### Layer 10 — Distribution / registry

**Day-1 Vercel Deploy button + single hosted URL + `npx init`
(`01-mvp-2-weeks` day-10); days 15–30 expand to the seven-registry grid
of `06-agent-native-first` §"Explicit distribution".** Publishing order:
Official MCP Registry (`registry.modelcontextprotocol.io`) via
`mcp-publisher` on day 0 of v1.1 since it fans out into PulseMCP,
Claude Desktop search, Docker Hub, and Smithery automatically; Anthropic
Connectors Directory submission day 1 (paired `claude.ai` +
`claude.com` OAuth callbacks — a known footgun); Cursor Directory + "Add
to Cursor" deeplink; Smithery with `smithery.yaml`; Glama with TDQS ≥
80 per tool; `.mcpb` in Anthropic's Claude Desktop Extensions Directory;
Gemini Extensions + VS Code MCP Registry + Windsurf + mcp.so by auto-
ingest. One `scripts/sync-mirrors.sh` emits `server.json`,
`smithery.yaml`, `.mcp.json`, `gemini-extension.json`, the `.mcpb`
`manifest.json`, the Smithery card, the Cursor deeplink, and the VS Code
install URL from one SSOT.

## 4. Phased build order

### Phase 1 — weeks 1–2 (MVP, anchored on `01-mvp-2-weeks`)

- Fork `run-llama/mcp-nextjs`; rename `@vercel/mcp-adapter` →
  `mcp-handler@^1.1.0`; bump `@modelcontextprotocol/sdk` to 1.26.0;
  move routes to `app/api/[transport]/`; swap hand-rolled Bearer for
  `withMcpAuth` (the `22-repo-deep-dives/19-vercel-mcp-stack.md` §"MCP handler authentication"
  fix).
- Prisma schema (`Brand`, `Asset`, `Generation`, plus Auth.js models);
  five MCP tools wired (`enhance_prompt`, `generate_logo`,
  `resize_icon_set`, `validate_asset`, `list_history`) registered from a
  shared `lib/tools/` module.
- Vercel AI SDK v5 with `@ai-sdk/anthropic` (rewriter), `@ai-sdk/openai`
  (`gpt-image-1` with `background: "transparent"`),
  `@ai-sdk/google-vertex` (`imagen-4.0-generate-001`).
- `pwa-asset-generator` + `@capacitor/assets` + `icon-gen` fan-out
  behind `resize_icon_set`; `sharp`-based alpha + palette + size
  validators.
- Split-panel Next.js UI (shape-inspired by `Nutlope/logocreator`, code
  written fresh); Auth.js Google OAuth; Upstash rate-limit; BYOK field.
- `skills/prompt-to-asset/SKILL.md` canonical body; `npx
  prompt-to-asset init` writes `.cursor/mcp.json`, `~/.claude/`, and
  `.vscode/mcp.json` for detected IDEs.
- Vercel deploy, `mcp.prompt-to-asset.app` CNAME, Fluid Compute on,
  Redis-backed SSE; Helicone pass-through for cost telemetry.
- One pilot user ships a real brand kit unassisted; Show HN announcement.

### Phase 2 — weeks 3–6 (correctness loop, anchored on `03-quality-max`)

- Expand the router from two providers to five: add `@ai-sdk/fal` (Flux
  Schnell realtime + LayerDiffuse endpoint), `@ai-sdk/togetherai`
  (FLUX.2 Pro), `@ai-sdk/replicate` (Recraft V3 SVG + Ideogram 3).
  Publish the first version of the `lib/router/rules.json` capability
  table.
- Implement the full fifteen-tool vocabulary from `06-agent-native-first`
  §"Full tool inventory"; the MVP's five tools expand to fifteen.
  `scripts/verify-parity.mjs` lands as a CI gate.
- Validator tier-1 upgrade: add PaddleOCR + Tesseract 5 for wordmark
  correctness; CLIP-FlanT5-VQA + PickScore for text-alignment;
  color-thief + ΔE2000 for palette adherence; WCAG-AA contrast for
  safe-zone. Three per-asset-class thresholds calibrated against a
  100-brief golden set.
- Tree-search regeneration: diagnostic-aware re-prompt mutation + model-
  swap on repeated failure; SSE progress stream.
- `brand_bundle_parse` upgraded to accept `brand.yaml` (brandspec) and
  AdCP `brand.json` in addition to `brand.md`; OKLCH palette stored
  canonically.
- Satori + `@vercel/og` deterministic OG path for *all* text-bearing OG
  cards (router rule #1: OG with text ≥ 2 chars → Satori, never
  diffusion).
- `@imgly/background-removal-node` primary + BiRefNet-lite fallback
  wired to `remove_background`; `vtracer-wasm` wired to `vectorize`.

### Phase 3 — weeks 7–10 (agent-native parity + distribution, anchored on `06-agent-native-first`)

- Publish `server.json` to the Official MCP Registry via `mcp-publisher`
  with both `packages[]` (stdio npm) and `remotes[]` (HTTPS Streamable
  HTTP). Automatic fan-out to PulseMCP, Smithery, Claude Desktop search.
- Submit to Anthropic Connectors Directory (paired `claude.ai` +
  `claude.com` callbacks); Cursor Directory + deeplink badge; Smithery
  with `smithery.yaml` + tight description.
- Glama submission + TDQS score ≥ 80 per tool: every tool in
  `lib/tools/` must have description + output-shape example +
  `readOnlyHint` / `destructiveHint` annotation.
- `.mcpb` bundle via `anthropics/mcpb`, signed in CI; drag-drop Claude
  Desktop install shipped.
- Full six-gate validator scoreboard from `03-quality-max` §8.1 deployed;
  500-brief × 5-seed golden set in nightly CI with week-over-week deltas.
- Expand the icon-set export to iOS 18 + visionOS + watchOS + tvOS + RN
  + Expo + Flutter via `guillempuche/appicons`; add `itgalaxy/favicons`
  as a second favicon backend for CI diff-testing.
- WebMCP polyfill surface via `@mcp-b/webmcp-polyfill`; mirror the
  read-only tool subset onto `navigator.modelContext` for Chromium-
  resident agents; write tools stay auth'd through the hosted MCP.

### Phase 4 — weeks 11–14 (hybrid routing polish + long-tail lane, anchored on `07-hybrid`)

- `ModalComfyuiProvider` with three workflow templates from
  `09-comfyui-native`: `logo-flat` (SDXL + flat-vector LoRA + brand
  LoRA), `transparent-sticker` (SDXL + LayerDiffuse), and an SDXL
  byte-reproducible pinned-seed lane for "lock this asset" paid users.
  `.cpack.zip` committed per template; Modal Image rebuilt weekly.
- `asset_train_brand_lora` tool: at 20 approved assets, fire an
  `ai-toolkit` training job on a Modal L40S; the resulting LoRA becomes
  the default `IP-Adapter` reference on subsequent generations — the
  compounding brand-consistency moat.
- Full router table in production: OG → Satori always; Iconify compose
  when `logo-mark.svg` exists; transparent → `gpt-image-1` or
  Flux+LayerDiffuse depending on batch size; SVG → Recraft V3; CJK →
  Seedream 4; ≥ 3 brand refs → Together FLUX.2 8-ref; realtime refine →
  fal Flux Schnell.
- Anti-abuse primitives from `05-free-tier` §"Anti-abuse" — invisible
  reCAPTCHA v3 + Cloudflare Turnstile + IP-KV counters — enabled ahead
  of the anonymous free-tier lever (still behind sign-in in v1; the
  plumbing is in place).
- Content-addressed cache on `(prompt_hash, model, seed, params_hash)`
  in R2 + Redis, targeting the 20–40 % hit rate from the Synthesis;
  5 % router A/B shadow lane for candidate new models with VLM-as-judge
  scoring before promotion.
- Final release: pricing live, Stripe billing, enterprise BRIA RMBG 2.0
  indemnified tier, full distribution grid green, nightly golden-set CI
  green for two consecutive weeks.

## 5. When to switch strategies

Three trigger conditions per alternative planner. Pivot language is
precise: "pivot *partially* to planner N" means adopt that planner's
pick for one or two layers, not replace the whole stack.

- **Planner 02 (`02-license-clean-commercial`).** Pivot partially if:
  (a) a commercial customer demands an SPDX-audited dependency manifest
  as a procurement gate — we adopt the `third_party_manifest.json` + CI
  SPDX drift check immediately; (b) BFL revokes commercial grants on any
  Flux-via-API endpoint, silently making our default SVG-hero lane
  non-commercial — we pivot to the "Flux Schnell self-host + hosted
  Recraft only" license-clean posture of `02` layer 5; (c) the EU AI Act
  enforcement phase adds per-model provenance requirements we can't meet
  with closed APIs — we adopt `02`'s SDXL + Flux Schnell + BiRefNet
  weight-pinning protocol for the paid-tier.

- **Planner 03 (`03-quality-max`).** Pivot fully if: (a) win-rate on our
  500-brief golden set plateaus below 60 % first-generation-pass for two
  consecutive releases — quality is the bottleneck, not routing; (b) a
  competitor ships an asset-correctness benchmark and we place below
  top-3 publicly — reputational; (c) a Fortune-500 design team signs a
  $200k+ ARR contract conditioned on tier-2 VLM-as-judge on every asset
  — economic.

- **Planner 04 (`04-self-hosted-sovereign`).** Pivot fully if: (a) a
  commercial customer demands air-gap deployment (defense, healthcare,
  finance, EU government); (b) US/EU data-residency regulation mandates
  in-region inference and no hosted API has a certified EU-only lane;
  (c) the paid-API cost base exceeds $40k/month sustained and the Modal
  warm-pool math crosses the break-even point against owning Tier M
  hardware (2× L40S, ~$25k capex).

- **Planner 05 (`05-free-tier`).** Pivot partially if: (a) an
  unauthenticated discovery-surface page hits viral mechanics (Show HN,
  ProductHunt, X thread) and we want to convert the wave — ship the
  four-lane burn-down rotor with Together free + Cloudflare Workers AI
  + fal trial + Replicate trial behind Turnstile + watermark; (b) a
  competitor ships a free no-sign-in generator and our sign-in wall
  loses comparison reviews; (c) conversion data from paid-only shows
  sub-1 % sign-up-to-trial conversion, implying the gate is the friction.

- **Planner 06 (`06-agent-native-first`).** *Already adopted* as Layer
  8. If agent-native adoption lags paid-web adoption 5:1 after Phase 3,
  *inversely* pivot toward web-first UX investment — not away from the
  tool-parity invariant, but deprioritize registry work in favor of UI
  polish.

- **Planner 07 (`07-hybrid`).** *Already adopted* as the primary
  strategy.

- **Planner 08 (`08-edge-browser-first`).** Pivot partially if: (a) a
  "Privacy Mode" demand emerges (designers who don't want prompts
  logged; enterprise users with data-gravity concerns) — ship the
  `08` browser-first pipeline as a `/privacy` variant that keeps
  prompts, mattes, vectorizes, and packs entirely in-tab; (b)
  Cloudflare Workers AI Flux Schnell becomes the lowest-cost generator
  lane after Workers AI pricing drops — promote it from tertiary to
  secondary in the router; (c) mobile share > 40 % of traffic — the
  WASM-first on-device pipeline is the only sustainable mobile story.

- **Planner 09 (`09-comfyui-native`).** Pivot partially if: (a) paid-API
  costs exceed $X/month at $Z ARR — with current pricing, that break-
  even is roughly $15k/month blended image-gen spend against a Modal
  warm-pool budget of ~$5k/month, at which point the six
  `09-comfyui-native` templates become the primary plane for logo /
  sticker / icon-mark / illustration; (b) a brand LoRA feature becomes
  a paid-tier differentiator requested by ≥ 20 % of paid users —
  ComfyUI + `ai-toolkit` training is the only plausible execution; (c)
  a critical hosted vendor (OpenAI, Google Vertex, or Recraft) has a
  multi-day outage that costs us weekly-active users.

## 6. OSS dependency lockfile (final)

Grouped by layer. `★` = star count at survey time; license from Wave 2
deep dives. All confirmed commercial-safe except where flagged.

**Layer 1 — Rewriter & router glue**
- `ai` ^5.0.167 — Apache-2.0 (Vercel) — typed dispatch spine
- `@ai-sdk/anthropic` ^2.0 — Apache-2.0 — rewriter
- `@ai-sdk/openai` ^2.0 — Apache-2.0 — `gpt-image-1`
- `@ai-sdk/google-vertex` ^2.0 — Apache-2.0 — Imagen 4 / Nano Banana
- `@ai-sdk/fal` ^2.0 — Apache-2.0 — Flux realtime + LayerDiffuse endpoint
- `@ai-sdk/togetherai` ^2.0 — Apache-2.0 — FLUX.2 Pro 8-ref
- `@ai-sdk/replicate` ^2.0 — Apache-2.0 — Recraft V3, Ideogram 3

**Layer 2 — MCP spine**
- `mcp-handler` ^1.1.0 — Apache-2.0 — Streamable HTTP server (Vercel)
- `@modelcontextprotocol/sdk` 1.26.0 — MIT — CVE floor pin
- `zod` ^3.25 — MIT — tool I/O schemas
- `anthropics/mcpb` latest — Apache-2.0 — `.mcpb` bundle packing
- `@mcp-b/webmcp-polyfill` latest — MIT — WebMCP progressive enhancement

**Layer 3 — Execution (long-tail)**
- `comfyanonymous/ComfyUI` v0.3.75 (71k★) — **GPL-3.0 — separate-process
  only, never vendored**
- `huchenlei/ComfyUI-layerdiffuse` (1.6k★) — Apache-2.0 — native RGBA
- `runpod-workers/worker-comfyui` — MIT — serverless dispatcher
- `bentoml/comfy-pack` — Apache-2.0 — portable lockfile
- weights: `stabilityai/stable-diffusion-xl-base-1.0` (OpenRAIL++-M),
  `black-forest-labs/FLUX.1-schnell` (Apache-2.0),
  `LayerDiffusion/layerdiffusion-v1` (OpenRAIL-M)

**Layer 4 — Post-processing**
- `@imgly/background-removal-node` ^1.4 — MIT — default matte
- `danielgatis/rembg` (22k★) — MIT — Python fallback matte
- BiRefNet-general-lite weights — MIT
- `visioncortex/vtracer` + `vtracer-wasm` — MIT — vectorization
- `svgo` ^3 — MIT — SVG cleanup
- `sharp` ^0.34 — Apache-2.0 — libvips bindings (server only)
- `@jsquash/png` + `@jsquash/resize` — Apache-2.0 — WASM resize (edge)

**Layer 5 — Platform-spec**
- `onderceylan/pwa-asset-generator` (3k★) — MIT
- `ionic-team/capacitor-assets` (577★) — MIT
- `akabekobeko/npm-icon-gen` (~1k★) — MIT
- `guillempuche/appicons` (mirrored commit SHA) — MIT per README
- `itgalaxy/favicons` (1.2k★) — MIT (CI diff-test only)
- Iconify collections (275k+ marks) — MIT (per-mark licensing tracked)

**Layer 6 — Validation**
- `color-thief-node` — MIT — palette sampling
- `paddlejs/PaddleOCR` — Apache-2.0 — OCR (multilingual)
- `tesseract.js` — Apache-2.0 — OCR (latin, fast)
- `beichenzbc/Long-CLIP` — MIT — text-image alignment
- `yuvalkirstain/PickScore` — MIT — preference score
- ImageReward, HPSv3, T2I-CompBench (Apache/MIT) — regression judges

**Layer 7 — Brand bundle**
- `thebrandmd/brand.md` spec — reference only
- `iamdanwi/brand-forge` (pattern lifted) — MIT
- `gray-matter` ^4.0.3 — MIT — markdown frontmatter

**Layer 8 — Agent surface (sources)**
- `run-llama/mcp-nextjs` — MIT — OAuth + MCP spine fork source
- `vercel-labs/skills` — MIT — cross-IDE install patterns
- `databricks-solutions/ai-dev-kit` — Apache-2.0 — installer pattern

**Layer 9 — UI**
- `next` ^15.3, `react` ^19, `react-dom` ^19 — MIT
- `next-auth` ^5.0-beta — ISC
- `@prisma/client` ^6.10 — Apache-2.0
- Tailwind 4 + shadcn/ui — MIT
- `framer-motion` ^11 — MIT

**Layer 10 — Distribution & OG**
- `@vercel/og` ^0.6 — MIT — Satori wrapper
- `satori` ^0.12 — MPL-2.0 — deterministic typography
- `@resvg/resvg-wasm` — MPL-2.0 — SVG → PNG
- `mcp-publisher` CLI — Apache-2.0 — Official Registry publish
- `workers-og` (kvnang) — MIT — Cloudflare Workers OG fallback

**Explicit bans** (carried forward from `02-license-clean-commercial`):
Fooocus expansion weights (CC-BY-NC), Flux.1 [dev] weights + every
[dev]-trained LoRA (BFL non-commercial), BRIA RMBG-2.0 ONNX weights as
an embedded dependency (CC-BY-NC — use the hosted API instead), SD.Next
(AGPL-3.0), Openinary (AGPL-3.0), `ComfyUI-Easy-Use` as a vendored dep
(GPL-3.0 — HTTP arm's length only), potrace + autotrace (GPL-2),
Hunyuan-PromptEnhancer 7B (Tencent license excludes EU/UK/KR),
`Nutlope/logocreator` code (no LICENSE file — inspiration only).

## 7. Seven-point differentiation story

Against every competitor in the OSS landscape (`20a`–`20e`) —
`Nutlope/logocreator`, `mcpware/logoloom`, `arekhalpern/mcp-logo-gen`,
`niels-oz/icon-generator-mcp`, `shinpr/mcp-image`, `appicon.co`,
`zhangyu1818/appicon-forge`, and the 30+ Next.js + Supabase + Stripe
clones — here are the seven compounding advantages of this stack.

1. **Tri-surface structural parity.** We ship the web UI, hosted remote
   MCP with OAuth 2.1 / PKCE / RFC 7591 DCR, and cross-IDE skills pack
   from one `lib/tools/` module, enforced by `verify-parity.mjs` in CI.
   No OSS competitor ships more than two of the three, and none enforces
   parity as a grep-verifiable invariant (`20-index` finding #1;
   `06-agent-native-first` §"Layer 8").

2. **Asset-aware rewriter slots, not generic tag salad.** The six
   asset-type slots (`asset_type`, `transparency_required`,
   `text_content`, `target_model_family`, `brand_palette`,
   `platform_constraints`) inject `MUST`-blocks into the rewriter system
   prompt that no other OSS rewriter — including `Hunyuan-PromptEnhancer`
   and `Promptist` — contains. Hunyuan is SD/Flux-flavored generic;
   Promptist is LAION-aesthetic-biased and actively *wrong* for flat
   logos (`22-repo-deep-dives/02-promptist.md`).

3. **Native RGBA preferred over post-hoc matting at every layer.**
   `gpt-image-1 background:"transparent"` on hosted, LayerDiffuse on
   self-hosted, with alpha-coverage validation + regenerate on failure.
   Every shipped OSS competitor defaults to post-hoc `rembg` matting
   with visible fringing at favicon sizes (`20-index` finding #12,
   `03-quality-max` §"Layer 5").

4. **Capability router with A/B shadow lane.** The router is
   data-not-code: `lib/router/rules.json` is patchable without redeploy;
   5 % of traffic routes through a candidate new model with VLM-as-judge
   scoring; promotion to the main table is gated on both measured win-
   rate and cost delta. `07-hybrid` §"Dispatch Layer". No OSS competitor
   has a shadow lane; most are single-provider hard-coded
   (`arekhalpern/mcp-logo-gen` is Together-only, `niels-oz/icon-generator-mcp`
   is fal-only, `Nutlope/logocreator` offers Together/OpenAI switch with
   no capability routing).

5. **Regenerate-until-validated with diagnostic-aware re-prompt.**
   Every generation passes through six validator gates (alpha / palette
   ΔE2000 / OCR wordmark / safe-zone / text-alignment / LLM rubric);
   failure emits a structured `diagnostic` that the rewriter consumes to
   mutate the prompt for the next attempt; budget cap 12 iterations
   paid / 4 free; every returned asset either validates or carries an
   explicit failure card. `03-quality-max` §"Layer 8". No OSS competitor
   runs any of these gates on any generation.

6. **Brand bundle as first-class compounding input.** From call 2
   onward a user's brand bundle (`brand.md` + approved-asset history +
   trained LoRA at 20 assets) is automatically injected as palette
   constraints, typography tokens, voice/personality in the rewriter
   system prompt, IP-Adapter references in the SDXL lane, and FLUX.2
   8-ref images in the Together lane. Quality compounds per user. No
   OSS competitor persists brand state across calls; each generation is
   one-shot.

7. **Publish-everywhere-from-one-SSOT distribution.** One
   `scripts/sync-mirrors.sh` emits the Official MCP Registry
   `server.json`, Smithery `smithery.yaml`, Cursor `.mcp.json` +
   deeplink, `.mcpb` `manifest.json`, Gemini extension descriptor, VS
   Code install URL, Glama card, and Claude Desktop Extensions
   submission — plus the seven per-IDE skill envelopes. We ship into
   every registry where a user might discover us without hand-
   maintaining eleven documents. `06-agent-native-first` §"Explicit
   distribution".

## 8. Known risks & kill-switches

**R1 — LayerDiffuse weight license drift.** The
`LayerDiffusion/layerdiffusion-v1` weights are OpenRAIL-M today
(`22-repo-deep-dives/17-comfyui-layerdiffuse.md`, verified at commit). If
the `Flux-version-LayerDiffuse` port (RedAIGC) becomes the de-facto
default, it inherits Flux.1 [dev]'s non-commercial terms and would taint
the ComfyUI lane.
- *Monitoring signal*: nightly CI check against the HF license field +
  commit SHA of the weights; GitHub webhook on the repo's LICENSE file.
- *Mitigation*: the `gpt-image-1 background:"transparent"` hot path does
  not depend on LayerDiffuse — it is only the long-tail lane.
- *Kill-switch*: flip router rule "transparency && batch ≥ 20" from
  `FLUX_SCHNELL_LAYERDIFFUSE_LOCAL` → `GPT_IMAGE_1_TRANSPARENT`; one-
  line JSON edit, no redeploy.

**R2 — BRIA RMBG 2.0 commercial terms.** CC-BY-NC-4.0 on the ONNX
weights (`20-index` dep list). We already use the hosted API only, but a
price hike or revocation on the hosted endpoint would remove our premium-
matting tier.
- *Monitoring signal*: BRIA blog RSS + monthly hosted-API ToS diff in CI.
- *Mitigation*: BiRefNet-general (MIT) covers ~95 % of BRIA quality on
  flat subjects; the delta is soft-edge (hair, glass).
- *Kill-switch*: flip `remove_background`'s default model from
  `bria-rmbg-2.0` → `birefnet`; one env-var change, zero code.

**R3 — Flux.1 [dev] BFL license becomes more restrictive.** The license
already forbids paying users on self-hosted [dev] weights
(`02-license-clean-commercial` §5). A stricter revision could bleed into
the hosted Flux Pro endpoints we rely on for photoreal hero / FLUX.2
8-ref on Together.
- *Monitoring signal*: BFL license page in CI diff; Together / fal /
  Replicate licensing FAQ diffs.
- *Mitigation*: Flux traffic is already routed to hosted APIs by
  default (`07-hybrid`); we never self-host [dev] weights.
- *Kill-switch*: router rule "hero || illustration" pivots from
  `FLUX_PRO_11` → `GPT_IMAGE_1` as primary, with Imagen 4 Ultra as
  secondary. One JSON row.

**R4 — Provider concentration risk on `gpt-image-1`.** It is our
default on transparency + text-heavy logos. An OpenAI outage, price
hike, or policy change on prompt rewriter injection (the mandatory
server-side rewriter) breaks our hot path.
- *Monitoring signal*: `provider_degraded` metric per route; alerting at
  > 5 % error rate over 5 min.
- *Mitigation*: Ideogram 3 is the declared fallback for every
  `gpt-image-1` route in the router table.
- *Kill-switch*: router auto-failover on 429 / 5xx chains; manually
  override via feature flag `FORCE_PROVIDER=ideogram` on the route.

**R5 — MCP protocol churn.** The MCP spec has shipped Streamable HTTP,
WebMCP, `.mcpb` bundles, OAuth 2.1 DCR patterns, and tool-impersonation
mitigations in the last 12 months; the `@modelcontextprotocol/sdk` CVE
floor already forced a pin to 1.26.0.
- *Monitoring signal*: weekly read of the MCP spec PR list and
  Anthropic / Cursor / Smithery registry release notes.
- *Mitigation*: tool logic lives in `lib/tools/` — transport-agnostic.
  Transport adapters are the only files that touch the SDK; they are
  ~50 LOC each.
- *Kill-switch*: none needed — protocol changes are additive most of the
  time. If a breaking change ships, transport adapters rewrite in < 1
  day per transport (historical precedent: the `@vercel/mcp-adapter` →
  `mcp-handler` rename was a one-line `package.json` change plus an
  import path bump, `22-repo-deep-dives/19-vercel-mcp-stack.md`).

**R6 — Registry disappearance / slot capture.** Smithery, Glama,
Cursor Directory, and Anthropic Connectors are pre-IPO; any of them
could be acquired, shut down, or change terms. Losing one shrinks our
distribution reach.
- *Monitoring signal*: registry uptime + monthly ToS diff in CI.
- *Mitigation*: the Official MCP Registry is the single source of truth;
  downstream ingests are best-effort.
- *Kill-switch*: `scripts/sync-mirrors.sh` stops publishing to the dead
  registry; one commit.

**R7 — Training-data lawsuits reaching downstream users.** Getty-style
suits against Stability AI or OpenAI could theoretically reach us via
the OSS SDXL + LayerDiffuse lane or the hosted APIs.
- *Monitoring signal*: legal RSS feeds (EFF, IP Watchdog); SaaS insurer
  advisories.
- *Mitigation*: offer a BRIA-indemnified tier for enterprise customers
  needing IP indemnification at the output level; disclose model
  provenance on every `Generation` row.
- *Kill-switch*: pivot Phase 4 LoRA training from generic-web data to
  customer-supplied-assets-only.

## 9. Open questions for the team

1. **Pricing tiers.** Free ($0, sign-in required, 5 generations/day) vs.
   Plus ($9/mo, 100/day) vs. Team ($29/seat, unlimited + LoRA) vs.
   Enterprise (BRIA-indemnified, air-gap option). Are those the right
   price points, or do we anchor Plus to `Nutlope/logocreator`'s free-
   forever-with-BYOK model to match market expectations?

2. **Anonymous free-tier timing.** Do we ship the `05-free-tier` four-
   lane burn-down rotor + anonymous usage in Phase 4, or defer until
   after v1.1 to avoid paying for scraper traffic during initial
   distribution?

3. **Trademark policy for SVGL / Iconify composition.** Router rule #2
   (Iconify compose when a mark exists) is zero-cost and
   high-quality, but if a user uploads a copyrighted mark or picks an
   Iconify brand logo marked "uploaded by third party", we can ship
   infringement. Do we gate to MIT-marks-only, or add a user-signed
   affirmation?

4. **Self-hosted ComfyUI fleet.** The `09-comfyui-native` cost math
   says Modal warm pools are $0.006/asset blended at 1k/day/template —
   break-even vs. hosted APIs at ~200 assets/day/brand. Do we own the
   GPU fleet in-house for our paid tier once volume crosses that floor,
   or stay pure-Modal-serverless indefinitely?

5. **LoRA training UX.** Auto-trigger at 20 approved assets vs.
   opt-in. Does auto-training on user uploads expose us to consent or
   IP liability we haven't scoped?

6. **EU / UK / KR strategy.** We skip Hunyuan-7B (Tencent license
   excludes those regions). Do we pursue a dual-rewriter product with
   region-aware routing, or accept the simpler one-rewriter-
   everywhere posture?

7. **`run-llama/mcp-nextjs` long-run dependency.** We fork at Phase 1.
   Do we carry the fork + our changes in-repo forever, or upstream our
   `withMcpAuth` fix + mcp-handler upgrade PRs and track upstream?

8. **Analytics & observability vendor.** Helicone for LLM spans vs.
   OpenTelemetry + self-hosted Grafana. Which is the right choice before
   enterprise deals where data residency matters?

9. **Telemetry consent.** Do we log prompts + enhanced prompts by
   default (required for the golden-set regression harness to evolve) or
   opt-in (required for enterprise privacy expectations)?

10. **Brand registry ambition.** `06-agent-native-first` imagines
    `prompt-to-asset.dev/brand/<slug>` as a discoverable brand bundle
    registry. Do we ship that as a public content-addressable store from
    week 6, or keep brand bundles per-user until a pilot customer asks
    for organization-wide sharing?

## 10. Appendix: rejected variants

**Why not `04-self-hosted-sovereign` as primary.** The plan is
correct — everything in it runs on disk under a clean license, and the
Qwen2.5-7B-Instruct SFT+GRPO rewriter is genuinely the long-run moat.
But it is a 90-day plan that produces a paying-customer-state Tier S
appliance, not a discoverable product. It requires two engineers, $8–
12k of GPU hardware, a training run against an extended AlignEvaluator,
and deep Kubernetes/Keycloak/Caddy/KeyDB operational knowledge before
the first external user signs in. Our hybrid absorbs its narrow niche —
any air-gap customer in Phase 4 triggers the Tier M Helm chart
deployment as a premium configuration — without forcing the 14-week
roadmap through that throat. The `02-license-clean-commercial` dependency
audit discipline is adopted immediately (`third_party_manifest.json` +
CI SPDX drift check), so the sovereign path stays one Phase away even
in our hybrid posture.

**Why not `05-free-tier` as primary.** Unit economics are outstanding
(~$0.037/user/month, 74× LTV:CAC on 2 % conversion), but the plan
deliberately excludes the paid features that differentiate us: no MCP
surface (MCP users are paid by definition per `05-free-tier` §"Layer 0"),
no brand compounding, no validator loop, no regenerate-until-validated
guarantee, no premium matte. It is the right *acquisition mechanic* but
the wrong *product identity*. Our hybrid absorbs its narrow niche by
layering the four-lane burn-down rotor + anti-abuse plumbing +
watermarking as Phase 4 features on top of the full tool surface — we
get the free-tier funnel as a marketing layer, not as the product.

**Why not `08-edge-browser-first` as primary.** The plan cannot
self-host the image generator (`08-edge-browser-first` §"What does not
work in this regime") — ComfyUI + LayerDiffuse do not run in the browser
and BRIA weights cannot fit in a Worker's 10 MB script cap. That makes
the plan a *rasterize-vectorize-package* wrapper around someone else's
generation API rather than a full asset engine, which reduces our
strategic surface area to the commodity post-processing layer.
Separately, WebMCP is still Chrome-146-flag-only with the unresolved
tool-impersonation issue #101 — shipping the product *primarily* on
WebMCP means betting on a standard that isn't stable in the browsers
we're targeting. Our hybrid absorbs its narrow niche as the v1.2
"Privacy Mode" variant: `08-edge-browser-first` becomes the private-by-
default surface for users who explicitly don't want their prompts
logged, activated via `/privacy` rather than replacing the default.

**Why not `09-comfyui-native` as primary.** ComfyUI is genuinely the
right execution backbone for the long tail — the six workflow templates
are excellent, the `comfy-pack` lockfile discipline solves real node-
drift pain, and the $0.006/asset blended cost dominates hosted APIs at
sustained volume. But three hot-path requirements in 2026 cannot be met
by any ComfyUI template today: (a) `gpt-image-1`-level transparency
fidelity on single-shot logos; (b) Ideogram-3-level wordmark text
spelling reliability at ≥ 5 words; (c) Recraft-V3-level native SVG
output. Making ComfyUI the default plane means shipping inferior
outputs on 3 of the 5 most common asset requests while collecting
operational complexity (Modal warm pools, custom-node drift, GPL-3
arm's-length hygiene) that commercial APIs don't impose. Our hybrid
absorbs its narrow niche by keeping all six `09-comfyui-native`
templates as *one of three execution providers* (`ModalComfyuiProvider`
in `07-hybrid`'s dispatch), selected by the router when the capability
fit is right — batch transparency, brand LoRA consistency, byte-
reproducibility — rather than by default.

---

**Final note.** The recommendation is decisive but not rigid. Every
alternative planner retains a concrete pivot condition in §5 that, if
triggered, reshapes one or two layers without touching the `lib/tools/`
SSOT or the router table schema. The fifteen-tool surface is the
stable contract; the router table is patchable data; the execution
adapters are swappable. If the next 14 weeks go as planned we ship a
hybrid product on this stack. If any one of the seven kill-switches
fires we pivot one layer, not the stack. That optionality is the
synthesis.
