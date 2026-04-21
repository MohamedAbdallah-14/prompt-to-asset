> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.

# Research → implementation map

Every research category in [`docs/research/`](./research/) is listed below
with a pointer to the file(s) / function(s) where the finding is actually
applied. If a line reads **not yet wired** the research is still at the
"sticky note on the wall" stage; opening an issue to wire it is welcome.

The research corpus runs 20 categories × 104 angle files. Rather than cite
every angle individually, this map cites the load-bearing ones. Each tool
source file also carries `// Source: docs/research/…` comments at decision
points so the linkage survives refactors.

## Orientation before you read

- **Wired** means the file/function cited contains production code that
  reads the research finding at runtime (routing table, rewriter dialect,
  safe-zone number, dimension constant).
- **Reference-only** means the research shaped a decision during design
  but isn't consulted at runtime. Two whole categories are in this state
  and that's intentional:
  - `docs/research/21-oss-deep-dive/` (20 files — OSS imagegen survey)
  - `docs/research/22-repo-deep-dives/` (20 files — specific codebase reads)
- **Deferred** research lives at [`docs/research/future/`](./research/future/).
  Twelve asset-research files moved there during the 2026-04-20 triage because
  they described tooling (pHash, visual diff, moderation, motion, mockups,
  stock APIs, audio, etc.) that isn't on the v1 critical path. Each one is
  listed in [future/README.md](./research/future/README.md) with a status
  note.

---

## 01 — Prompt Engineering Theory

| Angle                      | Implementation                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1a CFG / negative-prompt   | `data/model-registry.json` encodes `negative_prompt_support` per model (`ignored`, `native`, `error`, `supported`, `--no flag`). `src/rewriter.ts` emits `negative_prompt` only for SD family; **drops it on Flux** (documented in the registry as `"error"`). |
| 1c LLM prompt expansion    | `src/rewriter.ts` does LLM-style prompt expansion deterministically (no LLM call). Pads Imagen/Gemini prompts to ≥30 words so their invisible rewriter does not fire.                                                                                          |
| 1d Prompt-weighting syntax | Partially wired. Tag-salad mode emits flat tags with `BREAK` separator (subject before BREAK, background after — prevents color leakage on SDXL); token-weighting (`(word:1.2)`) deferred until a caller requests it.                                          |

## 02 — Image Generation Models

| Angle                         | Implementation                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2b gpt-image-1 autoregressive | `data/model-registry.json` `gpt-image-1` entry (`native_rgba: true`, `text_ceiling_chars: 50`). Router primary for transparent-mark rule.        |
| 2c Flow-matching / Flux       | `flux-pro` / `flux-2` registry entries, `negative_prompt_support: "error"` encoded, used by router `hero-photoreal` and `illustration-no-brand`. |
| 2e Imagen technical reports   | `imagen-3`, `imagen-4` registered with `native_rgba: false` + 30-word rewriter note in rewriter.                                                 |

## 03 — Evaluation Metrics

| Angle                  | Implementation                                                                                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3a CLIP / VQAScore     | `src/pipeline/validate.ts` tier-0 (deterministic). VQAScore (tier-1) not yet wired; tier-2 VLM-as-judge is a POST-to-URL shim at `src/pipeline/validate.ts::tier2Vlm` — set `PROMPT_TO_BUNDLE_VLM_URL` to enable.                                                                                                    |
| 3e Asset-specific eval | tier-0 implemented: dimensions exact, alpha probe, tile-luma checkerboard heuristic with alternation check, OCR Levenshtein (tesseract.js; bundled `eng.traineddata` used when present), palette ΔE2000 against brand bundle, WCAG contrast vs #FFF and #0F172A, safe-zone bbox. Source: `src/pipeline/validate.ts`. |

## 04 — Gemini / Imagen Prompting

| Angle                                              | Implementation                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4b Nano Banana                                     | `data/paste-targets.json` entry for `gemini-3-flash-image` references Nano Banana by nickname and routes to Google AI Studio. Used by external_prompt_only mode.                                                                                                                                                      |
| 4c **Transparent-background checkerboard problem** | **Load-bearing.** `data/routing-table.json` `transparent-mark` rule has `never: [imagen-3, imagen-4, gemini-3-flash-image, …]`. `src/rewriter.ts::buildBackgroundClause` warns if transparency requested against a non-RGBA model and requests solid white + post-matte. Multiple skill `SKILL.md` files document it. |

## 05 — OpenAI DALL·E / gpt-image

| Angle                             | Implementation                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5b gpt-image-1 API + transparency | `src/providers/openai.ts` calls `/v1/images/generations` with `background: "transparent"` when `transparency: true`. Primary for `transparent-mark` and `sticker` routing rules. |
| 5c Logo / icon generation         | Router `logo-with-text-1-3-words` rule places `gpt-image-1` as second-choice after Ideogram (because Ideogram has better wordmark rendering).                                    |

## 06 — Stable Diffusion / Flux

| Angle                            | Implementation                                                                                                                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6b Flux family prompting         | `src/rewriter.ts` dialect `"prose"` branch, with the explicit guard that drops `negative_prompt` and converts do-not clauses to positive anchors. Warning emitted when the caller attempts to set negatives for Flux.                                                        |
| 6d LoRA training for brand style | `BrandBundle.lora` field flows through to `illustration-branded` routing rule (`params.lora: "brand.lora"`). Actually dispatching LoRA to Flux.2 / SDXL requires a provider with LoRA support wired — Flux.2 provider accepts `lora` in params; SDXL provider not yet wired. |

## 07 — Midjourney / Ideogram / Recraft

| Angle                          | Implementation                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7a Midjourney v6/v7            | `src/rewriter.ts` dialect `"prose+flags"` branch emits `--ar`, `--v 7`, `--style raw`, optional `--sref`. `data/paste-targets.json` routes MJ to web + Discord (no API).                                                                                                                                                                                          |
| 7b Ideogram wordmark rendering | Router `logo-with-text-1-3-words` primary = `ideogram-3-turbo` with `magic_prompt: OFF`. `data/model-registry.json` records `text_ceiling_chars: 60`. Transparency via dedicated `/ideogram-v3/generate-transparent` endpoint with `rendering_speed` param (not `style: "transparent"`). `src/rewriter.ts` `"prose+quoted"` dialect keeps the wordmark in quotes. |
| 7c Recraft V3/V4 native SVG    | `data/model-registry.json` `recraft-v3` and `recraft-v4` both have `native_svg: true`. Router `logo-text-free-vector` primary = `recraft-v4` (higher quality); V3 fallback for brand-style pipelines requiring `style_id` (V4 dropped style support). `src/providers/recraft.ts` requests `output_format: "svg"`.                                                 |

## 08 — Logo Generation

| Angle                           | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8c Text rendering in logos      | Rewriter `buildTextClause` drops wordmarks > 3 words with a warning. Router `logo-with-text-many-words` primary = `composite` strategy (mark + SVG typography).                                                                                                                                                                                                                                                                                                                              |
| 8d Palette control              | `BrandBundle.palette` → rewriter prose injects `"Palette strictly limited to these colors: …"`. Recraft provider uses `controls.colors`.                                                                                                                                                                                                                                                                                                                                                     |
| 8e **SVG vector logo pipeline** | **Load-bearing.** Four paths: (a) Recraft native SVG (router primary for `logo-text-free-vector`), (b) LLM-author SVG (**this is the `inline_svg` mode** — `src/modes.ts`, `src/svg-briefs.ts`), (c) raster → matte → `vtracer` on PATH → SVGO, (d) raster → matte → `potrace` on PATH → SVGO. If neither binary is installed, `src/pipeline/vectorize.ts` emits a posterize run-length fallback and warns. SVGO cleanup runs via `src/pipeline/svgo.ts` when the optional dep is installed. |

## 09 — App Icon Generation

| Angle                        | Implementation                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9a iOS HIG specs             | `src/tools/enhance-prompt.ts::safeZoneForAssetType` returns `{ width: 824, height: 824 }` (iOS 80% of 1024). `src/svg-briefs.ts::appIconBrief` enforces the 824² safe zone. |
| 9b Android adaptive / themed | `src/pipeline/export.ts::exportAppIconBundle` emits foreground + background + monochrome layers.                                                                            |
| 9c PWA maskable              | Same exporter emits 192 / 512 / 512-maskable with 80% safe zone.                                                                                                            |

## 10 — UI Illustrations

| Angle         | Implementation                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10 (category) | `src/rewriter.ts::composeContext` illustration branch. Router `illustration-branded` / `illustration-no-brand` rules. `src/svg-briefs.ts::iconPackBrief` for the icon-pack sub-case. |

## 11 — Favicon / Web Assets

| Angle         | Implementation                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11 (category) | `src/svg-briefs.ts::faviconBrief` enforces 16×16 legibility, ≤8 paths, 2-color palette. `src/pipeline/export.ts::exportFaviconBundle` emits `.ico`, `icon.svg`, `apple-touch-icon.png`, PWA 192/512/512-maskable + `<link>` snippet. |

## 12 — Vector / SVG Generation

| Angle         | Implementation                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12 (category) | `src/pipeline/vectorize.ts` (raster → SVG). `src/svg-briefs.ts` (inline_svg authoring). `data/routing-table.json` favicon + icon_pack rules reference `llm_author_svg` strategy. |

## 13 — Transparent Backgrounds

| Angle         | Implementation                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13 (category) | `src/pipeline/matte.ts` — BiRefNet / RMBG / difference / local chroma key. Used by every generator when `transparency_required && !native_rgba`. Also `src/tools/ingest-external.ts` runs matte on pasted-back images. |

## 14 — Negative Prompting / Artifacts

| Angle         | Implementation                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14 (category) | `src/rewriter.ts::positiveAnchorsFromDoNot` rewrites "no drop shadows" → "flat matte surfaces with no cast shadows" so the guidance survives models that ignore negative_prompt (Imagen / gpt-image-1 silently ignore) or error on it (Flux). |

## 15 — Style Consistency / Brand

| Angle         | Implementation                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15 (category) | `BrandBundle` type (`src/types.ts`). Rewriter injects palette, do-not, sref_code. Router `illustration-branded` uses bundle fields. `src/brand.ts::hashBundle` content-addresses a bundle for cache keys. |

## 16 — Background Removal / Vectorization

| Angle         | Implementation                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16 (category) | `src/pipeline/matte.ts` + `src/pipeline/vectorize.ts` + `src/tools/remove-background.ts` + `src/tools/vectorize.ts` + `src/tools/ingest-external.ts`. |

## 17 — Upscaling / Refinement

| Angle         | Implementation                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17 (category) | `src/pipeline/upscale.ts` + `src/tools/upscale-refine.ts`. Asset-type-aware routing (DAT2 for flat, Real-ESRGAN/SUPIR for photoreal, img2img for diffusion polish). |

## 18 — Asset Pipeline Tools

| Angle         | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18 (category) | `src/pipeline/export.ts` fan-out for AppIconSet / Android adaptive / PWA maskable / visionOS master / favicon bundle — all hand-rolled `sharp` with optional `png-to-ico` for the multi-res `.ico`. `src/pipeline/og-render.ts` prefers Satori + @resvg/resvg-js when a font is available (`PROMPT_TO_BUNDLE_OG_FONT` or the optional `@fontsource/inter` dep), else falls back to a hand-authored SVG + `sharp` rasterization path. BullMQ/R2 pipeline in 18e is reference architecture for a future hosted mode; the current MCP server is synchronous and stateless. |

## 19 — Agentic / MCP / Skills Architectures

| Angle         | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19 (category) | The whole tool surface: **16 small tools** (not one god-tool), stdio transport, readOnlyHint / idempotentHint annotations for auto-approve, data-driven routing. **The three-mode surface (inline_svg / external_prompt_only / api) is also the direct application of this category's finding that "an MCP server whose output has one delivery channel is brittle."** Source: `src/modes.ts`, `src/tools/capabilities.ts`, `src/tools/ingest-external.ts`. |

## 20 — Open Source Repos Landscape

| Angle         | Implementation                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| 20 (category) | `data/paste-targets.json` is the output — every "where do users actually go to generate" is an item in that JSON. |

## 21 & 22 — Deep Dives

Standalone reference reading. Not directly wired; informs routing decisions.

## 23 — Combinations

Cross-category findings (e.g. "text rendering + transparency + vector
output is only viable via Ideogram-then-composite"). Encoded in the
`logo-with-text-many-words` routing rule and the rewriter's text-clause logic.

---

## 24 — Agentic Orchestration Patterns

| Angle                          | Implementation                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| 24a multi-agent handoff        | Use agents-as-tools (not handoffs) for validate-regenerate loop. Not yet wired.         |
| 24b plan-execute-react         | ReAct for single-asset; Plan-and-Execute for brand kits. Not yet wired.                 |
| 24c parallel fan-out best-of-N | `Promise.allSettled` across providers, fan-in by validation score. Not yet wired.       |
| 24d retry-fallback chains      | Layered: backoff → circuit-breaker per provider → fallback chain. Not yet wired.        |
| 24e state machine pipelines    | LangGraph checkpointing for resume-without-regeneration. Not yet wired.                 |
| 24f-g GitHub repo survey       | Reference reading. `lastmile-ai/mcp-agent` is the only MCP-native evaluator loop found. |

## 25 — Structured Generation & Constrained Decoding

| Angle                                  | Implementation                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 25a constrained decoding               | Outlines/LMFE/Guidance require logit access — cannot constrain Claude API. Not wired.                       |
| 25b Instructor / TypeScript validation | Instructor-JS for complex validation; Claude native SO for high-volume. Not yet wired.                      |
| 25c SVG grammar enforcement            | Post-hoc pipeline: xmldom parse → path-count → viewBox → palette → SVGO. Partial in `src/pipeline/svgo.ts`. |
| 25d AssetSpec schema design            | TypeBox + `additionalProperties: false` + `spec_version` literal. Not yet wired.                            |
| 25e runtime validation                 | TypeBox `TypeCompiler.Compile()` at startup (~10× faster than Zod). Not yet wired.                          |
| 25f-g MCP tool design                  | STRAP consolidation (7 `asset_generate_*` → 1 with `asset_type` enum). Not yet wired.                       |

## 26 — Reflection & Self-Refinement

| Angle                         | Implementation                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 26a Reflexion / Self-Refine   | Two-critic design: deterministic tier-0 then VLM rubric. Hard cap 4 iterations. Not yet wired.                                                |
| 26b VLM-as-judge rubric       | Prometheus-Vision 1–5 Likert format; two-critic beats unified. Not yet wired.                                                                 |
| 26c asset critique templates  | Ready-to-use 4–5 criteria rubrics per asset type. See `docs/research/26-reflection-self-refinement/26c-asset-specific-critique-templates.md`. |
| 26d convergence criteria      | Return best-seen not latest. Stop if score plateau < 0.15 over 2 rounds. Not yet wired.                                                       |
| 26e critique-to-prompt repair | Alpha failures → re-route (not re-prompt). Palette drift → inject hex. Not yet wired.                                                         |

## 27 — Agent Evaluation Frameworks

| Angle                    | Implementation                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| 27a benchmarking         | DeepEval `TextToImageMetric` (GPT-4V, 0–1 score). Not yet wired.                  |
| 27b image eval pipelines | VQAScore outperforms CLIP by 2–3× on compositional prompts. Not yet wired.        |
| 27c golden dataset       | ~44 prompts across all asset types; invariants as JSON not pixels. Not yet built. |
| 27d automated metrics CI | Tier-0/1 on every PR, Tier-2 nightly. Not yet wired.                              |
| 27e provider regression  | Never use "latest" model alias — pin explicit version strings. Not yet enforced.  |

## 28 — CI/CD Asset Automation

| Angle                             | Implementation                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| 28a GitHub Actions image pipeline | artifact-upload@v4 (v3 retired Jan 2025), dorny/paths-filter for scoped jobs. Not yet wired. |
| 28b PR preview generation         | Two-workflow fork-safe pattern (pull_request + workflow_run). Not yet wired.                 |
| 28c MCP server testing            | In-memory SDK transport (no subprocess); vitest-image-snapshot. Not yet wired.               |
| 28d release automation            | Changesets + npm OIDC; `server.json` for MCP Registry missing and must be created.           |
| 28e secrets management            | GitHub OIDC does not solve third-party AI provider key management.                           |

## 29 — RAG for Brand Knowledge

| Angle                          | Implementation                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 29a brand guideline extraction | Dembrandt (Playwright + CSS analysis), Brandfetch REST, LlamaIndex PDF. Not yet wired.           |
| 29b CLIP style embeddings      | CSD (arXiv:2404.01292) for pure style similarity; LanceDB for embedding storage. Not yet wired.  |
| 29c brand bundle storage       | Git for JSON; LanceDB for embeddings; S3+SHA256 for binary blobs. Not yet wired.                 |
| 29d Figma tokens pipeline      | Figma Variables API requires Enterprise plan; Style Dictionary v4 for transforms. Not yet wired. |
| 29e cross-session consistency  | SQLite + Recraft `style_id`; CSD cosine drift detection. Not yet wired.                          |

## 30 — Agent Memory & State

| Angle                        | Implementation                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 30a memory architectures     | Borrow patterns from Letta/MemGPT, not the full framework. SQLite WAL is practical middle ground.            |
| 30b session vs long-term     | In-process dict for session; SQLite for cross-session. Not yet wired.                                        |
| 30c MCP resources            | URI `asset-memory://projects/{name}/brand-bundle`; resources are read-only passive injection. Not yet wired. |
| 30d user preference learning | PAHF framework; Anthropic TTL now 5min (dropped from 1h in March 2026). Not yet wired.                       |
| 30e asset set coherence      | Recraft `style_id` as strongest coherence primitive; dual-layer dedup (hash + semantic). Not yet wired.      |

## 31 — Cost Optimization

| Angle                      | Implementation                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| 31a provider-level caching | `asset_enhance_prompt` system prompt is immediate target for Anthropic `cache_control`. Not yet wired. |
| 31b model routing          | RouteLLM matrix-factorization; Haiku 4.5 for simple brief-length heuristic routing. Not yet wired.     |
| 31c batch APIs             | OpenAI Batch API covers `/v1/images/generations` — gpt-image-1 at ~$0.02 (50% off). Not yet wired.     |
| 31d thumbnail-first        | Generate 256×256, validate, upscale only on pass. 62% cost reduction. Not yet wired.                   |
| 31e semantic dedup         | GPTCache; cosine threshold ≥ 0.85; pHash Hamming ≤ 8 as fast pre-filter. Not yet wired.                |

## 32 — Streaming & Real-Time UX

| Angle                            | Implementation                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 32a MCP Streamable HTTP progress | `notifications/progress` with `message` strings; stdio silently discards (Cursor activates it). Not yet wired. |
| 32b SSE long-running tools       | `/events/:jobId` sidecar SSE endpoint works regardless of host transport. Not yet wired.                       |
| 32c incremental SVG rendering    | Claude `eager_input_streaming: true`; split at complete `<path/>` boundaries. Not yet wired.                   |
| 32d BullMQ + SSE                 | `job.updateProgress()` → `QueueEvents` → EventEmitter → SSE. Only needed for multi-user HTTP deployment.       |
| 32e optimistic previews          | Cloud providers (gpt-image-1, Ideogram, Recraft) return full image only; fal.ai gives queue position only.     |

## 33 — Model Routing & Ensembling

| Angle                           | Implementation                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 33a routing frameworks          | Structured feature vectors beat text embeddings for asset routing (categorical: asset_type, transparency, text_length). |
| 33b confidence-based escalation | 4-tier cascade (SVG → flux-schnell → flux-pro → gpt-image-1) as `cascade[]` field in routing-table.json. Not yet wired. |
| 33c best-of-N                   | `Promise.any` not `Promise.race`; break-even when failure rate > ~30%. Not yet wired.                                   |
| 33d ELO / A/B testing           | Artificial Analysis Arena ELO as priors; Bradley-Terry MLE for local scores. Not yet wired.                             |
| 33e async race with validation  | fal.ai cancellation free while IN_QUEUE, partial cost once IN_PROGRESS.                                                 |

## 34 — Installable Skills Survey

| Angle                        | Implementation                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nano-banana-skills           | `gemini-3-pro-image-preview` shut down March 9 2026 — strip from asset_capabilities(). Live model: `gemini-3.1-flash-image-preview`.                           |
| fal-ai-skills                | Official bash scripts, no npm/pip, just `FAL_KEY`. Image restoration pre-pass (deblur before matting) is top gap.                                              |
| multi-provider-mcp-servers   | Recraft MCP has 16 tools (inpainting, bg-replace, style training) not in prompt-to-asset. comfyui-mcp has 31 tools.                                            |
| web-asset-skills             | No SVG icon set skill exists anywhere. jezweb optical correction rules + VLM QA loop worth borrowing.                                                          |
| video-generation-skills      | No zero-key video path exists. Narrow `video-gen` skill: App Store preview + splash animation + animated logo.                                                 |
| audio-tts-skills             | `audio-gen` skill scoped to notification sounds + voiceover, routed through elevenlabs-mcp.                                                                    |
| awesome-collections          | Not a single skill across 12 high-star repos produces RGBA-transparent PNGs. Zero overlap with prompt-to-asset vocab (logo/favicon/app-icon).                  |
| composio-volt-collections    | Zero of 119 media skills implement alpha validation, checkerboard FFT, safe-zone bbox, OCR Levenshtein, or SVG authoring.                                      |
| openai-official-skills       | Codex imagegen uses built-in `image_gen` tool — not portable to Claude Code. Figma suite (8 skills) fully portable.                                            |
| diagram-svg-skills           | VoltAgent/awesome-claude-design (475 DESIGN.md files) is ready test corpus for `asset_brand_bundle_parse`.                                                     |
| flux-and-antigravity-skills  | No standalone Flux SKILL.md exists. shipdeckai covers 10 providers including BFL direct. `comfyui-gateway` has `sprite_transparent_bg` + `icon_512` workflows. |
| free-nokey-generation-skills | Nakkas MCP (`npx nakkas@latest`) — structured SVGConfig JSON, zero key, better than freehand SVG authoring. MCPollinations for RGB raster.                     |
| figma-design-tool-skills     | `figma.createNodeFromSvgAsync(svgString)` pushes SVG as native Figma vector nodes. REST API has zero write capability.                                         |
| 3d-realtime-emerging-skills  | Lottie-animate from SVG master: zero API key, fills animated logo gap. TripoSR (<0.5s, $0.07) for 3D preview.                                                  |
| SYNTHESIS + ROADMAP          | Priority 1: `nano-banana` + `flux` skills. Priority 2: `video-gen` + `audio-gen`. Priority 3: `3d-gen` + `lottie-animate`.                                     |

---

## How to add research citations to code

When you add a decision (routing rule, dialect switch, safe-zone size, text
ceiling, etc.) that is grounded in a research angle, add a one-line
source comment at the declaration:

```ts
// Source: docs/research/09-app-icon-generation/9a-ios-app-icon-hig-specs.md
// iOS safe zone is 80% of 1024 = 824×824.
case "app_icon":
  return { width: 824, height: 824 };
```

If a decision has no research backing and is pure product judgment, say
so explicitly:

```ts
// Product judgment, not from research: we prefer inline_svg in auto-mode
// because zero-friction onboarding is worth more than marginal fidelity.
if (avail.includes("inline_svg")) return { mode: "inline_svg", reason: "…" };
```

This keeps the research corpus honest: every load-bearing line either
cites an angle or explicitly marks itself as product judgment.
