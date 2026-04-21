---
category: 23-combinations
slug: 23-combinations-synthesis
date: 2026-04-21
angles_indexed:
  - 01-mvp-2-weeks.md
  - 02-license-clean-commercial.md
  - 03-quality-max.md
  - 04-self-hosted-sovereign.md
  - 05-free-tier.md
  - 06-agent-native-first.md
  - 07-hybrid.md
  - 08-edge-browser-first.md
  - 09-comfyui-native.md
existing_docs:
  - RECOMMENDED.md
---

# Category 23 — Stack Combinations: Synthesis

## Category Executive Summary

1. **Nine planners independently converge on the same ten-layer anatomy** — rewriter → SDK/routing → execution → post-processing → platform-spec → validation → brand bundle → agent surface → UI → distribution. No planner proposes a different carve-up. That the shape is load-bearing — it's the shape any serious prompt-to-asset product assumes (see 01 §"Layer choices"; 02 §"ten-layer stack"; 07 §"Dispatch Layer"; RECOMMENDED §3).
2. **The product is a capability router, not a provider wrapper, and the router is data, not code.** Seven of nine planners (01, 02, 03, 06, 07, 08, RECOMMENDED) converge on `lib/router/rules.json` (or equivalent) as a patchable JSON table with per-capability slots (transparency, svg, text_chars, reference_images, cjk_or_arabic, reproducibility, batch_size). Only 04 (sovereign) and 09 (ComfyUI-native) collapse routing into a single-plane decision; both still expose an escape hatch to hosted APIs for capabilities their plane cannot reach (see 07 §"Routing Rules"; 09 §"What explicitly does not go through ComfyUI"; 04 §"Bottom line").
3. **`gpt-image-1` + Ideogram 3 + Recraft V3 are the three unavoidable hot-path models in 2026.** Every plan that does not explicitly ban hosted APIs routes transparent-with-text → `gpt-image-1 background:"transparent"` (01, 02, 03, 05, 06, 07, 08, RECOMMENDED), long wordmarks → Ideogram 3, and native SVG → Recraft V3. No OSS alternative reaches production parity on any of those three capabilities; even the sovereign plan (04) concedes "FLUX.1-schnell is visibly lower fidelity" on complex illustration and the ComfyUI plan (09) routes wordmarks >3 words off-plane (see 07 §"Capabilities Matrix"; 04 §"Risks" #3; 09 §"What explicitly does not go through ComfyUI").
4. **Vercel AI SDK v5 `experimental_generateImage` is the default typed spine.** Seven planners (01, 02, 03, 05, 06, 07, 08) use it as primary dispatch; 04 (sovereign) reaches a similar typed interface via its own FastAPI gateway. Only 09 (ComfyUI-native) inverts — AI SDK becomes the fallback lane behind a workflow-JSON dispatcher. Direct SDKs (`@fal-ai/client`, `together-ai`, `replicate`) are unanimously cited as necessary for hot paths (fal realtime WebSocket, Together FLUX.2 8-ref) that the abstraction does not expose (see 02 §"Layer 1"; 07 §"Dispatch Layer" ¶3).
5. **Native RGBA > post-hoc matting in every quality-conscious plan.** 03, 07, and RECOMMENDED refuse post-hoc matting as the default path; 01 ships alpha-validation + regenerate but admits it's MVP-grade; 05 concedes fringing for flat logos only. `gpt-image-1 background:"transparent"` is the hosted default; LayerDiffuse (Apache code + OpenRAIL-M weights) is the self-hosted default. `bria-rmbg` is universally banned as a weight-level dependency due to CC-BY-NC-4.0, but allowed via hosted API as an indemnified premium tier (see 03 §"Layer 5"; 02 §"Layer 9"; 04 §"Layer 3"; 08 §"What does not work in this regime").
6. **`BiRefNet` + `rembg` + `vtracer` + `pwa-asset-generator` + `@capacitor/assets` + `icon-gen` appear in 8 of 9 stacks.** The post-processing + platform-spec tool chain is effectively solved and interchangeable: every planner ships the same MIT Node libraries behind one `resize_icon_set` tool. The lone exception is 05 (free-tier), which ships browser-side equivalents (`rembg-webgpu`, `vtracer-wasm`, `@jsquash/resize`, `ico-endec`) to avoid server compute cost (see 01 §"Layer 5"; 02 §"Layer 9"; 03 §"Layer 7"; 04 §"Layer 3"; 05 §"Layer 6"; 07 §"Post-Processing Chain Is Always OSS"; 08 §"Surface 0").
7. **License discipline is a first-class design axis, not a review step.** 02 encodes it exhaustively (SPDX-annotated manifest, CI drift check, NOTICE propagation, CC-BY-NC-4.0 and AGPL-3.0 and GPL-3.0 and BFL-NC explicit bans); 04 adopts the same posture for sovereign deployment. Four weight/code items are banned across every commercial-minded plan: **BRIA RMBG-2.0 weights, Flux.1 [dev] weights + every [dev]-trained LoRA, Fooocus expansion weights, Hunyuan-PromptEnhancer 7B** (Tencent license excludes EU/UK/KR). ComfyUI + Easy-Use are GPL-3.0 and run at HTTP arm's length in every plan that ships commercial (02 §"Layer 8"; 04 §"Licensing summary"; 09 §"Custom node + base-model manifest"; RECOMMENDED §"Explicit bans").
8. **The tri-surface (web + hosted MCP + skills pack) is the agent-native consensus shape.** 06 makes it the product identity — fifteen Zod-typed verbs, three transports (Streamable HTTP + stdio + WebMCP), seven IDE envelopes, one `lib/tools/` SSOT, parity enforced by `verify-parity.mjs`. 01, 02, 07, 08, RECOMMENDED all adopt the same five-to-fifteen-tool inventory from 06 and the same `mcp-handler + withMcpAuth` spine forked from `run-llama/mcp-nextjs` (see 06 §"Layer 8"; 01 §"Layer 8"; 08 §"Surface 3"; RECOMMENDED §"Layer 8").
9. **WebMCP is universally deferred to progressive enhancement.** Every planner that mentions it (06, 08, RECOMMENDED) cites issue #101 (tool impersonation via `provideContext`) and Chrome 146 flag-gating as blockers. Consensus posture: ship `readOnlyHint` tools (`enhance_prompt`, `validate_asset`, `list_history`, `get_asset`, `brand_bundle_parse`) on `navigator.modelContext`; keep all write tools authenticated through the hosted MCP until the W3C mitigations land (see 06 §"WebMCP"; 08 §"WebMCP surface"; RECOMMENDED §"Layer 8").
10. **Self-hosted rewriter moat is a v1.2 decision, not a v1 blocker.** 02 ships `Promptist-Assets v0` on SmolLM2-135M (Apache) for the free tier; 03 runs a three-rewriter ensemble including Hunyuan-32B self-hosted on H100; 04 trains Qwen2.5-7B-Instruct with SFT+GRPO against an extended 32-keypoint AlignEvaluator. 01, 05, 06, 07, 08, RECOMMENDED all defer self-hosting in favour of hosted Claude 4 Sonnet / GPT-5-mini / Gemini 3 Flash. The break-even is volume: self-hosting only returns on investment when free-tier volume exceeds paid rewriter cost (see 02 §"Layer 2"; 04 §"Layer 1"; RECOMMENDED §"Layer 1" open question).
11. **Regenerate-until-validated is the quality differentiator no OSS competitor ships.** 03 defines the full stack — six validator gates (Long-CLIP + PickScore + HPSv3 + ImageReward + CLIP-FlanT5 for alignment; alpha-coverage histogram; PaddleOCR + Tesseract 5 for wordmark correctness; color-thief + ΔE2000 for palette; safe-zone/contrast/geometry; Claude Opus vision rubric) + tree-search regeneration with diagnostic-aware re-prompt + 500-brief × 5-seed nightly golden set. RECOMMENDED adopts it verbatim for Phase 2. 01 ships three sharp-based validators as MVP-grade; 07 ships tier-0/1/2 with tier-2 VLM-as-judge; 04, 05, 08 ship tier-0 only (see 03 §"Layer 8"; 07 §"postProcFor"; 01 §"Layer 6").
12. **Brand-bundle ingestion is the stated moat — and no planner has a production implementation of compounding brand state.** Every planner (02, 03, 06, 07, 08, RECOMMENDED) accepts `brand.md` + `brand.yaml` (brandspec) + AdCP `brand.json` into one canonical Zod `Brand` object with OKLCH palette, typography, `do_not[]`, personality. Every planner also defers auto-LoRA training at 20 approved assets to v1.2. The compounding loop — "quality ratchets per user as the brand LoRA tightens" — is named as an OSS whitespace but nowhere shipped (see 03 §"Layer 4"; 06 §"Layer 1"; 07 §"Rule #5").
13. **OG cards are not a diffusion problem.** 03, 05, 07, 08, 09, RECOMMENDED all route OG with text ≥ 2 chars → Satori + `@resvg/resvg-js` or `@vercel/og`, not to any image model. The headline/typography is composed in JSX over an optional diffusion-rendered hero plate. Only 01 and 02 leave OG on the image-model lane (01 explicitly MVP-scoped; 02 as a fallback). Consensus rule: diffusion never renders the headline glyphs (see 07 §"Rule #1"; 09 §"Template 5"; 03 §"Layer 3").
14. **Nine stacks, ten execution hosts, one pattern: Modal + RunPod `worker-comfyui` + Replicate `cog-comfyui` as the serverless-ComfyUI primary/fallback/escape triad.** 03, 07, 09, RECOMMENDED all specify the same three-provider ComfyUI lane ordering. 04 runs ComfyUI on bare-metal as one process per GPU. 01, 05, 08 avoid self-hosted ComfyUI entirely. ComfyUI is GPL-3.0 in every plan — runs as a separate process, never vendored, never linked into the main binary (see 09 §"Serverless host choice"; 04 §"Layer 2"; 02 §"Layer 8"; RECOMMENDED §"Layer 3").
15. **The capability-routed hybrid (07) contains every other plan as a sub-configuration.** 01 (MVP) is hybrid's weeks-1–2 lane with two providers. 02 (license-clean) is hybrid with the explicit-bans list. 03 (quality-max) is hybrid with the full validator scoreboard and ensemble rewriter enabled. 04 (sovereign) is hybrid with the `ModalComfyuiProvider` promoted to primary and hosted APIs demoted to escape hatch. 05 (free-tier) is hybrid's router with the free-credit rotor branch activated. 06 (agent-native) is hybrid's tri-surface invariant. 08 (edge-browser) is hybrid's post-processing layer pushed to the browser. 09 (ComfyUI-native) is hybrid's `ModalComfyuiProvider` expanded to six workflow templates. RECOMMENDED exploits exactly this containment property to ship hybrid as primary and treat every other planner as a pivot trigger (see RECOMMENDED §2 ¶3, §5).

## The Nine Stacks

| # | Stack | Time-to-MVP | Cost | Best for | License posture | Key risks |
|---|---|---|---|---|---|---|
| 01 | MVP-in-2-Weeks | **14 days** | ~$0.025/logo, ~$35/day at 1k/day | Shipping a tri-surface product fast with ~$0 ops floor | MIT/Apache-2.0 everywhere, inspire-only Nutlope | Fork drift on `mcp-handler`, `gpt-image-1 transparent` regressions, no validator loop beyond three sharp checks |
| 02 | License-Clean Commercial | ~90 days | ~$0.02–0.08/image (hosted); $0.003/image (SDXL local) | Closed-source paid SaaS with SPDX-audited dep manifest | MIT/Apache/OpenRAIL-M/BSD/MPL-2.0 only; CI SPDX drift gate | Weight relicense (OpenRAIL→stricter), GPL bleed from custom-nodes, SDXL training-data suit |
| 03 | Quality-Max | ~90 days | ~$0.10–0.40/asset (12-iter tournaments) | Beating every OSS competitor on correctness gates | Mixed — hosted + OSS; CC-BY-NC behind commercial APIs only | Ops complexity of six validator gates, regression risk on golden set, high per-call cost |
| 04 | Self-Hosted Sovereign | ~90 days + training | ~$8–12k capex + $1–4/day opex | Air-gap, EU/UK/KR-safe, enterprise on-prem | Apache/MIT only; three disclosed carve-outs (SDXL OpenRAIL-M, ComfyUI GPL-3, Loki/Tempo/Grafana AGPL-3) | Training capex for rewriter moat, 15–40s cold start, 240GB weight tarball, 11-service maintenance burden |
| 05 | Free-Tier | 14–28 days | **~$0.037/user/mo amortized** | Anonymous zero-auth funnel, viral acquisition | MIT/Apache; bans `bria-rmbg` even via API | Scraper abuse, Together pulls Schnell free, iOS Safari WebGPU regressions, no paid differentiators |
| 06 | Agent-Native First | ~45 days | Same unit econ as hybrid | Making the 15-tool vocabulary *the* product | MIT/Apache (forks `run-llama/mcp-nextjs`) | WebMCP tool-impersonation issue #101, OAuth paired-callback gotcha, registry drift |
| 07 | Hybrid | ~90 days | **~$0.006–0.045/image blended** | Default shape for a serious 2026 asset product | MIT/Apache + hosted-API commercial terms | Vendor concentration on `gpt-image-1`, router table maintenance, Modal warm-pool amortization |
| 08 | Edge/Browser-First | ~60 days | **~$0 idle + $0.011–0.05/gen** | Privacy-mode, mobile-first, lowest ops floor | MIT/Apache on-device + edge; NC gated behind hosted APIs | Cannot self-host generator, 100MB model download on mobile, iOS Safari WebGPU ceiling |
| 09 | ComfyUI-Native | ~90 days | **~$0.006/asset** (SDXL lane), ~$0.014 (Flux lane) | Cost-at-scale, batch transparency, brand-LoRA compounding | Mixed; ComfyUI GPL-3 separate-process, OpenRAIL-M weights, Flux.1-dev tier-gated | Custom-node drift, Modal cold starts, cannot match Ideogram on ≥5-word text |

## Cross-Cutting Patterns

### P1 — The ten-layer skeleton is universal (01–09)
Every planner uses the same layer labels: rewriter (L1), SDK/routing (L2), execution (L3), post-processing (L4), platform-spec (L5), validation (L6), brand bundle (L7), agent surface (L8), UI (L9), distribution (L10). The picks differ; the carve-up does not. Any future planner that re-labels the layers is re-litigating a settled discussion.

### P2 — `gpt-image-1` + Ideogram 3 + Recraft V3 are the unavoidable three (01, 02, 03, 05, 06, 07, 08, RECOMMENDED)
Every hosted-API plan routes transparent+text → `gpt-image-1`, wordmarks → Ideogram 3, native SVG → Recraft V3. The `07-hybrid` Capabilities Matrix makes it explicit; 09 (ComfyUI-native) concedes the same three as off-plane escape hatches. No OSS replacement reaches parity on any of the three in 2026.

### P3 — `BiRefNet` + `rembg` + `vtracer` + platform-spec trio (`pwa-asset-generator` + `@capacitor/assets` + `icon-gen`) appear in 7–8 of 9 stacks
Post-processing and platform fan-out is interchangeable MIT Node glue; 05 (free-tier) swaps server versions for WASM equivalents (`rembg-webgpu`, `vtracer-wasm`, `@jsquash/resize`). The only differences are deployment target (server vs browser vs edge Worker) and whether the Iconify composition fast-path is wired when a `logo-mark.svg` already exists.

### P4 — `mcp-handler` + `withMcpAuth` forked from `run-llama/mcp-nextjs` is the universal MCP spine (01, 02, 03, 04, 05, 06, 07, 08, RECOMMENDED)
Every planner that ships a hosted MCP forks the same base, renames `@vercel/mcp-adapter` → `mcp-handler@^1.1.0`, bumps the SDK to 1.26.0 (CVE floor), moves routes to `app/api/[transport]`, and swaps the hand-rolled Bearer check for `withMcpAuth`. This is a one-day migration consensus, not nine independent discoveries.

### P5 — Vercel AI SDK v5 is primary; direct SDKs reach through for hot-path features
Seven planners (01, 02, 03, 05, 06, 07, 08) put AI SDK at the typed spine and carve out `DirectSdkProvider` for fal realtime WebSocket, Together FLUX.2 8-ref (not exposed by AI SDK), and Replicate model chaining. 07 formalizes this as the three-adapter pattern (`VercelAiSdkProvider` + `DirectSdkProvider` + `ModalComfyuiProvider` behind one `ImageProvider` interface); every other plan ships a subset.

### P6 — Native RGBA over post-hoc matting, with a specific fallback ladder
`gpt-image-1 background:"transparent"` → Ideogram 3 `style:"transparent"` → LayerDiffuse (SDXL or Flux-schnell) → BRIA RMBG 2.0 via hosted API → BiRefNet → rembg/u2net. Every quality-conscious plan enumerates the same ladder; plans that stop short (05 uses BiRefNet-lite only; 01 uses `@imgly/background-removal-node` only) acknowledge the quality trade.

### P7 — Satori/`@vercel/og` for deterministic typography; diffusion never renders the headline
6 of 9 plans + RECOMMENDED route OG-with-text, favicons with existing marks, and any trademarked wordmark through Satori + `@resvg/resvg-js` over a brand font. The diffusion path is reserved for the optional background hero plate. This is the one place "composition beats generation" is universally accepted.

### P8 — GPL / AGPL / NC-weights containment through separate-process execution
ComfyUI (GPL-3.0), Easy-Use (GPL-3.0), SD.Next (AGPL-3.0), Openinary (AGPL-3.0), Loki/Tempo/Grafana (AGPL-3.0) all quarantined behind HTTP boundaries when present; never vendored or statically linked. `bria-rmbg` (CC-BY-NC-4.0), Flux.1 [dev] (BFL non-commercial), Fooocus expansion (CC-BY-NC-4.0), Hunyuan-7B (Tencent EU/UK/KR exclusion) are universally banned as weight-level deps and — where used at all — reached only via hosted APIs that carry the commercial grant.

## Trade-offs Matrix

Scores 1–5; 5 = best. Speed is time-to-MVP. Cost is blended per-asset. Determinism is "can this stack regenerate byte-identical output in 6 months." License clarity is SPDX auditability + no copyleft contamination. Brand consistency is the compounding-state axis. Offline is "works air-gapped or in-browser without network."

| Stack | Speed | Cost | Determinism | License clarity | Brand consistency | Offline |
|---|---|---|---|---|---|---|
| 01 MVP-2-weeks | **5** | 3 | 1 | **5** | 2 | 1 |
| 02 License-clean | 3 | 3 | 4 | **5** | 3 | 2 |
| 03 Quality-max | 1 | 2 | 3 | 4 | **5** | 2 |
| 04 Sovereign | 1 | **4** | **5** | 4 | 3 | **5** |
| 05 Free-tier | 4 | **5** | 2 | 4 | 1 | 3 |
| 06 Agent-native | 3 | 3 | 3 | 4 | 3 | 2 |
| 07 Hybrid | 3 | 4 | 3 | 4 | 4 | 2 |
| 08 Edge/browser | 3 | **5** | 2 | 4 | 2 | **4** |
| 09 ComfyUI-native | 2 | **4** | **5** | 3 | 4 | 3 |

Three observations. (a) Speed and determinism are mutually exclusive: 01 ships in 14 days with zero reproducibility; 04 and 09 have pinned-seed byte-exact reproducibility but 90-day builds. (b) Cost and correctness are mutually exclusive: 05 is cheapest but ships no validator loop beyond tier-0; 03 is most correct but pays for 12-iteration tournaments. (c) Brand consistency clusters with quality-max and ComfyUI paths because brand LoRA training + IP-Adapter references require a self-hosted or Modal-hosted ComfyUI lane. RECOMMENDED (hybrid with phased correctness) is the Pareto frontier — no single axis is 5/5, but no axis is below 3/5.

## Controversies

### C1 — Is ComfyUI the right foundation?
**Yes (09, partially 04):** ComfyUI is the only OSS runtime that composes SDXL + LayerDiffuse + IP-Adapter + brand LoRAs coherently; `comfy-pack` + Modal image content-hashing solves node drift; $0.006/asset blended cost dominates hosted APIs at sustained volume.
**No (01, 05, 06, 07, 08, RECOMMENDED):** ComfyUI is GPL-3, Easy-Use is GPL-3, custom-node drift is an ops hazard, cold starts add 20–40s on Modal, and the capabilities it cannot match (`gpt-image-1` transparency fidelity, Ideogram ≥5-word text, Recraft native SVG) are the top 3 hot paths.
**Resolution:** ComfyUI as *one of three* execution providers, called via `runpod-workers/worker-comfyui` or Modal, never as the default. `09`'s six workflow templates become the library for `ModalComfyuiProvider` in the hybrid.

### C2 — Is Recraft worth the vendor lock?
**Yes (07, RECOMMENDED):** No OSS equivalent of production quality for native SVG. Raster→BiRefNet→K-means→vtracer→SVGO is a valid fallback but produces 10x more paths with visible topology artifacts.
**No (02, 04, 09):** `controls.colors` hosted API means every brand palette ships to Recraft; weight redistribution forbidden; a license change strands the product. The sovereign plan (04) refuses outright.
**Resolution:** Route `svg === "required"` to Recraft V3 in `api` mode, fallback to StarVector 8B (MIT, 03 §"Layer 2") or the K-means+vtracer chain. Sovereign deployments get the fallback as primary.

### C3 — Does a 2-week MVP need brand-bundle ingest?
**Yes (01, 06, RECOMMENDED):** `brand.md` parse ships day 6 in the MVP plan; it's ~150 LOC with `gray-matter` and delivers "second asset inherits brand automatically" — the differentiator over every logocreator clone.
**No (05, 08):** Free-tier and edge plans defer brand state entirely; each generation is one-shot. Brand persistence requires auth + Postgres, which breaks the anonymous-first design.
**Resolution:** Sign-in-gated brand bundle for paid tier; anonymous free tier stays one-shot.

### C4 — Self-hosted rewriter: moat or premature optimization?
**Moat (02, 03, 04):** `Promptist-Assets v0` on SmolLM2-135M; Hunyuan-32B ensemble; Qwen2.5-7B SFT+GRPO against extended 32-keypoint AlignEvaluator — all three plans carve out 8+ weeks of training budget.
**Premature (01, 05, 06, 07, 08, RECOMMENDED):** Hosted Claude 4 Sonnet at ~$0.01/enhance; break-even vs. self-hosted compute is only above ~$40k/mo sustained spend; training capex + GPU serving is an 8-week build with no return until free-tier volume crosses a threshold nobody's measured.
**Resolution:** v1.2 target, triggered when free-tier volume exceeds paid rewriter cost. RECOMMENDED §5 formalizes this as a pivot condition, not a v1 blocker.

### C5 — WebMCP: first-class or progressive enhancement?
**First-class (06):** `navigator.modelContext` lights up inside the user's tab for Chromium agents; the read-only subset (`enhance_prompt`, `validate_asset`, `list_history`, `get_asset`, `brand_bundle_parse`) auto-approves without OAuth round-trip; in-tab agent UX is strictly better than remote MCP.
**Progressive (08, RECOMMENDED):** Chrome 146 flag-gated, tool-impersonation issue #101 unresolved, zero production users in 2026, Safari/Firefox deferred. Shipping the product *primarily* on WebMCP bets on an unstable standard.
**Resolution:** WebMCP is universally deferred to read-only progressive enhancement. Write tools stay authenticated through the hosted MCP until W3C mitigations land.

### C6 — Anonymous free tier: acquisition moat or scraper magnet?
**Moat (05):** Unit economics are outstanding — ~$0.037/user/mo, 74× LTV:CAC on 2% conversion. The four-lane burn-down rotor (Together free + Cloudflare Workers AI + fal trial + Replicate trial) costs ~$0.0005/image blended. Viral mechanics need zero-friction entry.
**Magnet (01, 06, 07, RECOMMENDED):** Scrapers discover the free endpoint within hours; Turnstile + watermark + IP-KV counters hold only to ~100× baseline; MCP users are paying users by definition so anonymous tier excludes the agent-native product identity.
**Resolution:** Sign-in-gated free tier in v1; ship the 05 anti-abuse plumbing (reCAPTCHA v3 + Turnstile + IP-KV + 4% watermark) in Phase 4 so anonymous can be flipped on without rework.

### C7 — Does a hybrid stack have an identity?
**Yes (07, RECOMMENDED):** The identity is the router — data-not-code, patchable JSON rules table, per-capability dispatch. Every other plan's preferred generator becomes one row we can enable. The tri-surface agent API is stable regardless of which row fires.
**No (03, 04, 09):** "Hybrid" reads as "indecisive." Quality-max, sovereign, and ComfyUI-native each argue that a committed single-plane story — best quality, air-gap, cost-at-scale — is more legible to customers than a router that picks for them.
**Resolution:** The router's capability-first dispatch *is* the product story; the committed plans absorb as pivot conditions in RECOMMENDED §5.

## Gaps

1. **No planner has a shipped brand-LoRA auto-training feature.** All mention it; all defer to v1.2. The "quality compounds per user at 20 approved assets" loop is named as the moat and nowhere implemented (03 §"Layer 4"; 07 §"Rule #5"; RECOMMENDED §"Layer 7" ¶3).
2. **No planner calibrates per-asset-class validator thresholds empirically.** 03 specifies ΔE2000 ≤ 5 (paid) / ≤ 10 (free) for palette, 40–75% foreground for logos, Levenshtein ≤ 1 for taglines — but no per-brief calibration against a published corpus. Thresholds are expert guesses.
3. **No planner addresses multi-tenant isolation inside the ComfyUI plane.** Modal warm pools are shared across tenants; brand LoRAs leak between calls if not loaded/unloaded per request. 09 does not scope this; 04 assumes one tenant per appliance; 07 hand-waves.
4. **No planner addresses the cold-asset problem.** A user returns in 6 months, hosted model has silently rolled forward, same `prompt + seed` no longer reproduces. 04 and 09 solve it via pinned weights; 07 solves it via forcing self-host on `reproducibility === "byte_exact"`; other plans do not solve it.
5. **No planner quantifies the WebMCP risk surface.** 06 and 08 acknowledge issue #101; none audits what other `provideContext` bypasses exist or what the mitigation ETA is.
6. **No planner has an enterprise IP-indemnification pathway beyond BRIA.** 02 and RECOMMENDED flag BRIA's hosted API as the indemnified tier; none addresses model-output training-data lawsuits on SDXL / Flux / `gpt-image-1` reaching downstream users.
7. **No planner specifies a regression protocol for the Official MCP Registry.** `registry.modelcontextprotocol.io` is pre-GA; `mcp-publisher` CLI behaviour could change. 06 and RECOMMENDED assume stable publish semantics.
8. **No planner addresses CJK / Arabic / Devanagari text at parity with Latin.** 07 routes to Seedream 4 (G13 in the broader synthesis); no validator ships a non-Latin OCR path. PaddleOCR covers multilingual but validator thresholds are Latin-calibrated.
9. **No planner has a pricing-tier consensus.** RECOMMENDED §9 lists it as the first open question. Anchoring Plus to `$9/mo` (Nutlope) vs. `$19/mo` (Recraft) vs. `$29/mo` (V0) is undecided.
10. **No planner addresses the MCP Skills registry drift.** Seven IDE envelopes (Claude Code, Cursor, Windsurf, Codex, Gemini CLI, VS Code, Zed) with separate frontmatter conventions; `sync-mirrors.sh` is specified but never stress-tested against conflicting frontmatter schemas.

## Actionable Recommendations for the prompt-to-asset Plugin

RECOMMENDED.md already picked hybrid (07) as primary with MVP shipment modeled on 01, agent surface from 06, and correctness loop ratcheted in from 03 by week 10. This synthesis goes deeper on *what to ship as first-class, what to document as alternatives, and what to exclude*.

### First-class — ship by default

1. **Hybrid capability router (07) as the dispatch spine.** `lib/router/rules.json` patchable without redeploy. Three adapter implementations behind one `ImageProvider` interface. Router is data, not code. Ship with 2 providers in Phase 1, 5 by Phase 2, 8 by Phase 3.
2. **Fifteen-tool MCP surface (06) as the product identity.** One `lib/tools/` SSOT, three transports, seven IDE envelopes, `verify-parity.mjs` CI gate. Stable contract across phases. The UI is a demo of the tools.
3. **Tri-surface forked from `run-llama/mcp-nextjs` (01).** Day-1 `mcp-handler@^1.1.0` + `withMcpAuth` + `@modelcontextprotocol/sdk@1.26.0`. Hosted URL + Deploy-to-Vercel + `npx init`. Non-negotiable P4 migration.
4. **Six-gate validator scoreboard with regenerate-until-validated (03).** Three sharp-based validators in MVP (01's Phase 1); Long-CLIP + OCR + ΔE2000 + WCAG in Phase 2; Opus vision rubric + tree-search regeneration + 500-brief golden set in Phase 3. This is the quality differentiator.
5. **License-clean dependency discipline (02).** `third_party_manifest.json` + CI SPDX drift check from day 1. Every explicit ban from 02 carried forward: Fooocus CC-BY-NC, Flux.1 [dev] weights + every [dev]-trained LoRA, BRIA RMBG-2.0 ONNX weights as embedded dep, SD.Next AGPL, Openinary AGPL, Easy-Use as vendored dep, potrace + autotrace GPL, Hunyuan-7B, Nutlope code.
6. **Native RGBA fallback ladder (03, 07).** `gpt-image-1 background:"transparent"` → Ideogram 3 `style:"transparent"` → LayerDiffuse on Modal → BRIA hosted API → BiRefNet → rembg. Validate alpha on every path.
7. **Satori/`@vercel/og` for OG + favicons-with-existing-mark + trademarked wordmarks (07 Rule #1, Rule #2).** Diffusion never renders the headline. Compose > generate when a mark exists.
8. **Brand bundle as first-class compounding input (06 Layer 1, 07 §"Rule #5").** `brand.md` → `brand.yaml` → AdCP `brand.json` normalized to one Zod `Brand`. OKLCH palette, typography, `do_not[]`, personality. Feed into rewriter system prompt, validator palette gate, IP-Adapter references.

### Document as alternatives — user-chosen configurations

9. **Sovereign deployment (04) as Tier M/L Helm chart.** Triggered by air-gap / EU/UK/KR / data-residency customer demand. Same `lib/tools/` SSOT; swap hosted AI SDK providers for local vLLM + ComfyUI + Keycloak. Document the Helm chart and the 240GB bootstrap tarball as a premium configuration.
10. **Edge/browser-first privacy mode (08) as `/privacy` variant.** Triggered by designers who don't want prompts logged or mobile share > 40%. In-tab rewriter (SuperPrompt-v1 / Promptist via Transformers.js) + `rembg-webgpu` + `vtracer-wasm`. Read-only WebMCP surface on `navigator.modelContext`.
11. **Free-tier anonymous funnel (05) as Phase 4 acquisition layer.** Four-lane burn-down rotor (Together free + Cloudflare Workers AI + fal trial + Replicate trial) behind Turnstile + 4% watermark + IP-KV counters. Plumbing shipped ahead of flip.
12. **ComfyUI-native templates (09) as `ModalComfyuiProvider` library.** Six workflow templates (`logo-flat`, `logo-3d-emblem`, `transparent-sticker`, `app-icon-mark`, `og-social-card`, `illustration-empty-state`) as `.cpack.zip` locked. Triggered when blended hosted-API spend crosses ~$15k/mo or brand-LoRA feature requested by ≥20% of paid users.

### Exclude — not worth shipping

13. **Single-provider defaults.** No "OpenAI only" or "Flux only" paths. Capability router always; vendor second.
14. **Post-hoc matting as default.** Native RGBA first; matting only as fallback with alpha-coverage validation.
15. **Unvalidated outputs.** Every asset ships with a validator verdict; failure returns a diagnostic, not a silent retry.
16. **`Nutlope/logocreator` code copy.** No LICENSE file, issue unanswered 14+ months. Inspire-only on UI shape; every line clean-room.
17. **Fooocus expansion weights, Flux.1 [dev] weights, BRIA RMBG-2.0 ONNX weights, Hunyuan-7B, SD.Next, Openinary, vendored Easy-Use, potrace, autotrace.** Banned list carried forward from 02 §"Dropped scope" verbatim.
18. **`.mcpb` + Smithery + v0 registry + VSIX on day 14.** Deferred to v1.1 per 01 §"Deliberately dropped scope"; they require uptime evidence the MVP cannot produce.

### Phased rollout (MVP → ambitious)

- **Phase 1 (weeks 1–2, MVP anchored on 01):** Tri-surface ships. Two providers (`gpt-image-1` + Imagen 4). Five MCP tools. Three sharp-based validators. `brand.md` parse. Split-panel UI. `npx init`. Pilot user.
- **Phase 2 (weeks 3–6, correctness loop anchored on 03):** Five providers, fifteen tools, tier-1 validators (OCR + ΔE2000), tree-search regeneration, Satori OG path, `brand.yaml` + AdCP `brand.json`, router table v1.
- **Phase 3 (weeks 7–10, agent-native parity anchored on 06):** Official MCP Registry + Anthropic Connectors + Cursor + Smithery + Glama + `.mcpb`. Six-gate validator scoreboard. 500-brief × 5-seed nightly golden set. WebMCP read-only polyfill.
- **Phase 4 (weeks 11–14, hybrid polish + long-tail anchored on 07):** `ModalComfyuiProvider` with 3 templates. `asset_train_brand_lora` at 20 assets. Full router table. Anti-abuse plumbing. Content-addressed cache. 5% router A/B shadow. Pricing live. Enterprise BRIA-indemnified tier.
- **v1.2+ (ambitious):** Self-hosted rewriter (04 §"Layer 1" Qwen2.5-7B SFT+GRPO); anonymous free tier (05 flip); privacy mode (08); sovereign Helm chart (04); full ComfyUI-native plane promotion (09 trigger at $15k/mo spend).

## Primary Sources Aggregated

De-duplicated URLs cited across all nine angles + RECOMMENDED. Grouped by layer.

### Rewriter / LLM
- microsoft/LMOps Promptist — https://github.com/microsoft/LMOps/tree/main/promptist (01, 02, 05, 06)
- shinpr/mcp-image — dev.to post, Subject-Context-Style system prompt (01, RECOMMENDED)
- Hunyuan-PromptEnhancer — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer (02, 03, 04, 06)
- roborovski/superprompt-v1 — https://huggingface.co/roborovski/superprompt-v1 (02, 05, 06, 08)
- alibaba-pai/BeautifulPrompt — https://huggingface.co/alibaba-pai/BeautifulPrompt (02)
- Qwen2.5-7B-Instruct (Apache-2.0) — HF / Alibaba (04)
- Qwen2.5-VL-32B-Instruct — HF (03, 04)
- SmolLM2-135M (Apache-2.0) — HuggingFace (02)
- AlignEvaluator (Hunyuan arXiv:2509.04545) — https://arxiv.org/abs/2509.04545 (03, 04, 06)

### Image models (APIs + weights)
- OpenAI `gpt-image-1` — OpenAI Images API (01, 02, 03, 05, 06, 07, 08, 09, RECOMMENDED)
- Google Vertex Imagen 4 / Gemini 3 Flash Image ("Nano Banana") — Google AI Studio (01, 02, 03, 06, 07, 08)
- Ideogram 3 Turbo / Quality — Ideogram API (02, 03, 06, 07, 08, 09)
- Recraft V3 — Recraft API (02, 03, 06, 07, 08, 09)
- BFL Flux.1-dev, Flux.1-schnell, Flux Pro 1.1, Flux.2 — BFL / Together / fal / Replicate (02, 04, 05, 07, 08, 09)
- `black-forest-labs/FLUX.1-schnell` Apache-2.0 weights — HuggingFace (02, 04, 05, 07)
- `stabilityai/stable-diffusion-xl-base-1.0` OpenRAIL++-M — HuggingFace (02, 04, 09)
- LayerDiffusion/layerdiffusion-v1 OpenRAIL-M — HuggingFace (02, 03, 04, 09)
- Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` — CF Workers AI (05, 08)
- Together AI FLUX.2 8-ref — Together API (02, 03, 06, 07, 08, RECOMMENDED)
- fal.ai `fal-ai/flux/schnell` + realtime — fal.ai (05, 06, 07, 08)
- Seedream 3/4 (ByteDance) — fal / Replicate (07)
- Qwen-Image (Apache-2.0) — Alibaba / HF (04)
- AnyText2 (Apache-2.0) — HuggingFace (03, 04)
- StarVector 8B (MIT) — HuggingFace (03)

### Dispatch / SDK
- Vercel AI SDK v5 — https://sdk.vercel.ai (01, 02, 03, 05, 06, 07, 08, RECOMMENDED)
- `@ai-sdk/openai`, `@ai-sdk/google-vertex`, `@ai-sdk/fal`, `@ai-sdk/togetherai`, `@ai-sdk/replicate`, `@ai-sdk/luma` — Apache-2.0 (all)
- `@fal-ai/client` — fal.ai (02, 06, 07, 08)
- `together-ai` SDK — Together (02, 06, 07)
- `replicate` npm — Replicate (02, 06, 07)

### MCP + agent surface
- vercel/mcp-adapter → mcp-handler — https://github.com/vercel/mcp-handler (01, 02, 03, 04, 05, 06, 07, 08)
- `@modelcontextprotocol/sdk@1.26.0` (CVE floor) — MCP spec (01, 06, RECOMMENDED)
- run-llama/mcp-nextjs — https://github.com/run-llama/mcp-nextjs (01, 06, 07, 08, RECOMMENDED)
- vercel-labs/mcp-for-next.js — https://github.com/vercel-labs/mcp-for-next.js (02, 05)
- anthropics/mcpb — https://github.com/anthropics/mcpb (01, 04, 06, RECOMMENDED)
- @mcp-b/webmcp-polyfill — MIT (06, 08, RECOMMENDED)
- mcp-publisher CLI — registry.modelcontextprotocol.io (06, RECOMMENDED)
- registry.modelcontextprotocol.io — Official MCP Registry (06, RECOMMENDED)
- cursor.directory — https://cursor.directory (06)
- smithery.ai — https://smithery.ai (06, 08)
- glama.ai/mcp/servers — https://glama.ai/mcp/servers (06)

### Post-processing + platform-spec
- onderceylan/pwa-asset-generator — https://github.com/onderceylan/pwa-asset-generator (01, 02, 03, 04, 05, 06, 07, 09)
- ionic-team/capacitor-assets — https://github.com/ionic-team/capacitor-assets (01, 02, 03, 04, 06, 07, 09)
- akabekobeko/npm-icon-gen — https://github.com/akabekobeko/npm-icon-gen (01, 02, 03, 04, 06, 07, 09)
- guillempuche/appicons — https://github.com/guillempuche/appicons (02, 03, 06)
- itgalaxy/favicons — https://github.com/itgalaxy/favicons (02, 03)
- @realfavicongenerator/generate-favicon — RealFaviconGenerator (02)
- danielgatis/rembg — https://github.com/danielgatis/rembg (02, 03, 04, 06, 07, RECOMMENDED)
- @imgly/background-removal-node — https://img.ly/products/background-removal (01, RECOMMENDED)
- rembg-webgpu — https://github.com/Remove-Background-ai/rembg-webgpu (05, 08)
- visioncortex/vtracer + vtracer-wasm — https://github.com/visioncortex/vtracer (02, 04, 05, 06, 07, 08, 09)
- svgo — https://github.com/svg/svgo (02, 05, 07, 08, 09)
- ZhengPeng7/BiRefNet — HF weights MIT (02, 04, 05, 07, 08)
- PramaLLC/BEN2 — HF (02)
- xuebinqin/U-2-Net — HF (02, 04)
- sharp — https://sharp.pixelplumbing.com (01, 02, 04, 07, 08, 09)
- @vercel/og + Satori — https://vercel.com/docs/functions/og-image-generation (01, 02, 03, 05, 07, 08, 09, RECOMMENDED)
- @resvg/resvg-wasm — https://github.com/yisibl/resvg-js (05, 08, 09, RECOMMENDED)
- @jsquash/png + @jsquash/resize — Squoosh fork (08)
- kvnang/workers-og — https://github.com/kvnang/workers-og (05, 08)
- color-thief-node — palette sampling (03, RECOMMENDED)
- PaddleOCR — https://github.com/PaddlePaddle/PaddleOCR (03, RECOMMENDED)
- tesseract.js — https://tesseract.projectnaptha.com (03, RECOMMENDED)

### ComfyUI + serverless
- comfyanonymous/ComfyUI (GPL-3.0) — https://github.com/comfyanonymous/ComfyUI (02, 03, 04, 07, 09, RECOMMENDED)
- huchenlei/ComfyUI-layerdiffuse (Apache-2.0) — https://github.com/huchenlei/ComfyUI-layerdiffuse (02, 03, 04, 09)
- yolain/ComfyUI-Easy-Use (GPL-3.0, arm's length) — https://github.com/yolain/ComfyUI-Easy-Use (02, 04, 09)
- rgthree/rgthree-comfy — https://github.com/rgthree/rgthree-comfy (09)
- ltdrdata/ComfyUI-Impact-Pack — https://github.com/ltdrdata/ComfyUI-Impact-Pack (09)
- cubiq/ComfyUI_IPAdapter_plus — https://github.com/cubiq/ComfyUI_IPAdapter_plus (03, 09)
- bentoml/comfy-pack — https://github.com/bentoml/comfy-pack (09, RECOMMENDED)
- runpod-workers/worker-comfyui — https://github.com/runpod-workers/worker-comfyui (02, 03, 06, 07, 09, RECOMMENDED)
- replicate/cog-comfyui — https://github.com/replicate/cog-comfyui (01, 07, 09)
- Modal — https://modal.com (03, 07, 09)
- RunPod — https://runpod.io (02, 03, 07, 09)

### Brand bundle + formats
- thebrandmd/brand.md — https://github.com/thebrandmd/brand.md (01, 06, RECOMMENDED)
- brandspec.dev — https://brandspec.dev (06, RECOMMENDED)
- AdCP brand protocol — https://docs.adcontextprotocol.org/docs/brand-protocol (06, RECOMMENDED)
- iamdanwi/brand-forge — https://github.com/iamdanwi/brand-forge (06, RECOMMENDED)
- dembrandt — brand URL ingest pattern (06)
- gray-matter — https://github.com/jonschlinkert/gray-matter (01, RECOMMENDED)

### Infra / ops
- Next.js 15 — https://nextjs.org (01, 02, 04, 05, 06, 07, 08, RECOMMENDED)
- shadcn/ui — https://ui.shadcn.com (01, 02, 06, RECOMMENDED)
- Prisma — https://prisma.io (01, 06, RECOMMENDED)
- Auth.js / next-auth — https://authjs.dev (01, 02, 06, 07, RECOMMENDED)
- Upstash Redis / node-redis — https://upstash.com (01, 06, 08)
- Cloudflare Workers / Workers AI / R2 / D1 / Durable Objects (05, 08)
- Vercel Fluid Compute — https://vercel.com/docs/functions/fluid-compute (01, 06, 07, 08)
- vLLM — https://vllm.ai (02, 03, 04)
- Keycloak — https://keycloak.org (04)
- Caddy 2 — https://caddyserver.com (04)
- KeyDB — https://keydb.dev (04)
- MinIO / SeaweedFS — object storage (04)
- PostgreSQL 16 — https://postgresql.org (01, 04, 06, RECOMMENDED)
- k3s — https://k3s.io (04)
- Helicone — https://helicone.ai (01, RECOMMENDED)
- OpenTelemetry / Prometheus / Tempo / Loki / Grafana (04, 06)
- GlitchTip — https://glitchtip.com (04)
- cloudnative-pg — https://cloudnative-pg.io (04)
- NVIDIA GPU Operator — Kubernetes (04)
- syft / cosign — SBOM + signing (04)

### Validation / eval
- beichenzbc/Long-CLIP — https://github.com/beichenzbc/Long-CLIP (03, RECOMMENDED)
- yuvalkirstain/PickScore — https://github.com/yuvalkirstain/PickScore (03, RECOMMENDED)
- HPSv3 — human preference score (03, RECOMMENDED)
- ImageReward — https://github.com/THUDM/ImageReward (02, 03, RECOMMENDED)
- T2I-CompBench — https://github.com/Karine-Huang/T2I-CompBench (02, 03, RECOMMENDED)
- CLIP-FlanT5 VQA (T2V-Metrics) — https://github.com/linzhiqiu/t2v_metrics (03)
- FD-DINOv2 — style similarity proxy (09)
- CSD (Contrastive Style Descriptor) — style similarity (brand skill)
- Promptfoo llm-rubric — https://promptfoo.dev (03)
- DeepEval — https://deepeval.com (03)

### Anti-abuse / billing
- reCAPTCHA v3 — https://developers.google.com/recaptcha (05)
- Cloudflare Turnstile — https://challenges.cloudflare.com (05)
- JSZip — https://stuk.github.io/jszip (01, 05, 08)
- @upstash/ratelimit — https://github.com/upstash/ratelimit-js (01)
- Stripe — https://stripe.com (RECOMMENDED)

### Repos forked or pattern-lifted
- Nutlope/logocreator (inspire-only, no LICENSE) — https://github.com/Nutlope/logocreator (01, 02, 05, 06, RECOMMENDED)
- databricks-solutions/ai-dev-kit — Apache-2.0 (01, RECOMMENDED)
- vercel-labs/skills — MIT (06, RECOMMENDED)

## Status

Synthesis written 2026-04-21 across all nine angle files (01–09) + RECOMMENDED.md. All primary-source URLs cited in at least one angle are aggregated above; cross-references use the `(see NN §section)` convention. Every claim in Executive Summary, Cross-Cutting Patterns, Controversies, Gaps, and Actionable Recommendations is grounded in a specific angle section rather than external material. Ten-layer skeleton (P1) and router-is-data (insight #2) are the dominant structural consensuses; `gpt-image-1` + Ideogram 3 + Recraft V3 triad (insight #3) and the `BiRefNet` + `vtracer` + `pwa-asset-generator` post-processing trio (P3) are the dominant tool-choice consensuses. RECOMMENDED.md's hybrid-anchored four-phase rollout is corroborated as the Pareto-optimal path.
