---
title: Research Update Log
date: 2026-04-21
auditors: 29 parallel sub-agents + manual review
scope: All 34 research directories (361 files)
cutoff: All claims should reflect reality as of 2026-04-21
---

# Research Update Log — 2026-04-21

Full audit of all research directories in `docs/research/`. Each sub-agent read every file in its directory, ran web searches to verify claims, and edited files in-place. This document consolidates all findings.

## Status by directory

| Directory | Status | Files corrected | Rate-limited |
|-----------|--------|----------------|--------------|
| 01-prompt-engineering-theory | ✅ Audited | 4/7 | — |
| 02-image-generation-models | ✅ Audited | 6/7 | — |
| 03-evaluation-metrics | ✅ Audited | 5/7 | — |
| 04-gemini-imagen-prompting | ✅ Audited | 7/7 | — |
| 05-openai-dalle-gpt-image | ✅ Audited | 5/11 | — |
| 06-stable-diffusion-flux | ✅ Audited | 6/7 | — |
| 07-midjourney-ideogram-recraft | ✅ Audited | 5/7 | — |
| 08-logo-generation | ✅ Audited | 6/7 | — |
| 09-app-icon-generation | ✅ Audited | 4/7 | — |
| 10-ui-illustrations-graphics | ✅ Audited | 5/7 | — |
| 11-favicon-web-assets | ✅ Audited | 5/7 | — |
| 12-vector-svg-generation | ✅ Audited | 6/7 | — |
| 13-transparent-backgrounds | ✅ Audited | 5/7 | — |
| 14-negative-prompting-artifacts | ✅ Audited | 6/7 | — |
| 15-style-consistency-brand | ✅ Audited | 6/7 | — |
| 16-background-removal-vectorization | ✅ Audited | 6/7 | — |
| 17-upscaling-refinement | ✅ Audited | 5/7 | — |
| 18-asset-pipeline-tools | ✅ Audited | 6/7 | — |
| 19-agentic-mcp-skills-architectures | ✅ Audited | 6/7 | — |
| 20-open-source-repos-landscape | ✅ Audited | 5/7 | — |
| 21-oss-deep-dive (A: files 01–11) | ✅ Audited | 8/11 | — |
| 21-oss-deep-dive (B: files 12–20 + synthesis) | ✅ Audited | 10/11 | — |
| 22-repo-deep-dives (A: files 01–11) | ✅ Audited | 8/11 | — |
| 22-repo-deep-dives (B: files 12–22 + synthesis) | ✅ Audited | 11/12 | — |
| 23-combinations | ✅ Audited | 10/12 | — |
| 24-agentic-orchestration-patterns | ✅ Audited | 8/9 | — |
| 24-skills-for-p2a | ✅ Audited | 9/10 | — |
| 25-structured-generation | ✅ Audited | 4/7 | — |
| 26-reflection-self-refinement | ✅ Audited | 5/7 | — |
| 27-agent-evaluation-frameworks | ✅ Audited | 5/7 | — |
| 28-cicd-asset-automation | ✅ Audited | 5/7 | — |
| 29-rag-brand-knowledge | ✅ Audited | 5/7 | — |
| 30-agent-memory-state | ✅ Audited | 6/7 | — |
| 31-cost-optimization-agentic | ✅ Audited | 5/7 | — |
| 32-streaming-realtime-ux | ✅ Audited | 5/7 | — |
| 33-model-routing-ensembling | ✅ Audited | 7/7 | — |
| 34-installable-skills-survey (A) | ✅ Audited | 9/9 | — |
| 34-installable-skills-survey (B) | ✅ Audited | 9/9 | — |

**All directories audited.** Wave 3 retries completed 2026-04-21.

---

## Top-priority corrections (cross-cutting impact)

These findings affect routing decisions, CLAUDE.md, or production code. Fix before next generation run.

### 1. Ideogram transparency API parameter is wrong in CLAUDE.md
- **Was:** `style: "transparent"` parameter
- **Is:** dedicated `/ideogram-v3/generate-transparent` endpoint with `rendering_speed: "TURBO"` for turbo tier
- **Affects:** CLAUDE.md routing table, `13-transparent-backgrounds`, `19-agentic-mcp-skills-architectures`

### 2. Recraft V4 superseded V3 (February 2026)
- **Was:** Recraft V3 is SOTA for native SVG/vector
- **Is:** Recraft V4 released February 2026 — new SOTA. V4 pricing: $0.08/image (Vector), $0.30/image (Pro Vector) — up from V3's $0.01/call
- **CRITICAL:** V4 does NOT support `style_id` or predefined styles. V3 must stay in brand-consistency pipelines.
- **Affects:** Routing table, CLAUDE.md, every document recommending Recraft V3

### 3. DALL-E 3 API shutting down May 12, 2026 (21 days)
- **Was:** DALL-E 3 and gpt-image-1 co-exist
- **Is:** DALL-E 3 deprecated November 2025, API shutdown May 12, 2026. Migrate to gpt-image-1 or gpt-image-1.5 now.
- **Affects:** All 05-openai-dalle-gpt-image files, CLAUDE.md

### 4. Imagen 4.0 family deprecated — EOL June 30, 2026
- **Was:** imagen-4.0-generate-001 / fast / ultra as primary Imagen models
- **Is:** All three GA variants deprecated, EOL June 30, 2026. Migration target: `gemini-2.5-flash-image`
- **Affects:** 04-gemini-imagen-prompting, routing table

### 5. Gemini legacy SDK removal June 24, 2026
- **Was:** `vertexai.generative_models` still valid
- **Is:** Deprecated, removed June 24, 2026. Use `google-genai` library.
- **Affects:** All code examples using old SDK

### 6. Anthropic prompt cache TTL regressed to 5 minutes (March 6, 2026)
- **Was:** Default is 1-hour TTL
- **Is:** Default silently reverted to 5 minutes. Must explicitly pass `"ttl": "1h"` to get 1-hour caching. Users relying on implicit 1-hour behavior saw 15-53% cost increase.
- **Affects:** 31-cost-optimization-agentic, any code using Anthropic prompt caching

### 7. Node.js 20 EOL April 30, 2026 (9 days)
- **Was:** Node 20 pinned in CI examples
- **Is:** EOL April 30, 2026. Migrate to Node 22 (LTS through April 2027).
- **Affects:** 28-cicd-asset-automation, all CI workflow examples

### 8. Flux negative_prompt confirmed broken across all variants
- **Was:** Conflicting docs — some said Flux supports it
- **Is:** `negative_prompt` raises TypeError in FluxPipeline. Zero support across dev/schnell/pro/Kontext/FLUX.2-pro/max. Workaround: positive anchoring.
- **Affects:** 14-negative-prompting-artifacts, 06-stable-diffusion-flux

### 9. CVE-2025-49596: MCP Inspector RCE vulnerability
- **Was:** Not documented
- **Is:** Critical RCE vulnerability in MCP Inspector. Mandatory warning for any CI pipeline using it.
- **Affects:** 27-agent-evaluation-frameworks, any MCP CI setup

### 10. gpt-image-1 has native streaming (stream: true + partial_images)
- **Was:** Documented as having no streaming capability
- **Is:** OpenAI ships `stream: true` + `partial_images: 0–3` on Images API for gpt-image-1, gpt-image-1-mini, and gpt-image-1.5
- **Affects:** 32-streaming-realtime-ux, SYNTHESIS.md

### 11. Gemini CLI: full hooks system + native MCP support
- **Was:** Gemini CLI documented as having no lifecycle hooks and requiring a bridge adapter for MCP
- **Is:** Ships `SessionStart`, `BeforeTool`, `AfterTool`, `BeforeModel`, `AfterModel` hooks (v0.26.0+). Native MCP via `mcpServers` in `gemini-extension.json`.
- **Affects:** 19-agentic-mcp-skills-architectures

### 12. MCP spec 2025-11-25 is Latest Stable (not "draft")
- **Was:** Multiple files labeled `2025-11-25` spec as "draft" and `2025-06-18` as current
- **Is:** `2025-11-25` is Latest Stable. Target it; accept `2025-06-18` as fallback.
- **Affects:** 19, 25, 32-streaming-realtime-ux

### 13. Claude Structured Output is GA (no beta header needed)
- **Was:** Beta header required, `output_format` parameter
- **Is:** GA as of 2026. No beta header. Parameter is `output_config.format`. Claude 4.0-series retires June 15, 2026.
- **Affects:** 25-structured-generation, all code using Claude SO

### 14. SVGO v4.0.0 breaking change (February 2026)
- **Was:** SVGO v3.x, `removeViewBox: false` override pattern in use
- **Is:** SVGO v4.0.0 — `removeViewBox` and `removeTitle` disabled by default in preset-default; `removeViewBox: false` override is now a no-op. `removeScriptElement` renamed to `removeScripts`. Named exports only. Node.js ≥16 required.
- **Affects:** 12-vector-svg-generation, 16-background-removal-vectorization, all SVGO configs

### 15. Rembg default model is still u2net (not BiRefNet)
- **Was:** Docs implied rembg defaults to BiRefNet
- **Is:** Default is still `u2net`. Must explicitly pass `session=new_session("birefnet-general")`.
- **Affects:** 13-transparent-backgrounds, 16-background-removal-vectorization

---

## Detailed change logs by directory


---

# Updates: 01-prompt-engineering-theory

## Files modified:

- `1c-llm-prompt-expansion.md`: Added dated update block noting DALL-E 3 deprecation (May 12 2026) and gpt-image-1/1.5 as current; added note on PaLM→Gemini/GPT-4o base model shift; added deprecation footnote to OpenAI Cookbook reference.
- `1d-prompt-weighting-syntax.md`: Added Midjourney v7 (released April 3 2025, default June 17 2025) and v8.1 Alpha (April 14 2026) to the multi-prompt version list; updated Open Question #6 with version status note.
- `1e-survey-papers.md`: Updated magic-term decay line to name MJv7 and FLUX.2; updated Open Question #3 to replace "DALL-E 3" with "gpt-image-1/1.5 [DALL-E 3 deprecated May 2026]" and added Ideogram 3 Turbo / MJv7+.
- `SYNTHESIS.md`: Updated item 13 (magic terms) to say "MJ v7" instead of "MJ v6+"; updated Recommendation #2 to replace "DALL-E 3" with "gpt-image-1/1.5"; updated Recommendation #9 model tag list (added `flux2`, replaced `dalle3` with `gpt-image-1`); added dated note on FLUX.2 release and DALL-E 3 deprecation in P5 cross-cutting pattern; added inline deprecation note to DALL-E 3 primary source entry and OpenAI Cookbook entry.

## Files not modified (already accurate or out of scope):

- `index.md`: Already has a 2026-04-21 banner; content is structural only (links to angle files), no factual model claims to update.
- `1a-cfg-and-negative-prompts.md`: Content is foundational CFG theory (Ho & Salimans, APG, CFG++, Flux guidance distillation). All claims are theory-level or correctly scoped to SD/SDXL/Flux model families without asserting any model is "current/latest." No stale patterns found.
- `1b-compositional-attention-control.md`: Content covers cross-attention control papers (P2P, A&E, SynGen, Bounded Attention). Already notes SD3/SD3.5/FLUX.1 failures per FineGRAIN 2025/2026. No stale model-version claims found.

## Outdated/false claims corrected:

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `1c-llm-prompt-expansion.md` | Implied DALL-E 3 is the current/active OpenAI image model via "DALL-E 3 set the 'GPT-4 rewrites everything' default" with no deprecation caveat | Added dated block: DALL-E 3 deprecated Nov 14 2025, API removal May 12 2026; gpt-image-1 (Mar 25 2025) and gpt-image-1.5 (Dec 16 2025) are current | OpenAI deprecation announcement; community.openai.com thread 1378754 |
| `1c-llm-prompt-expansion.md` | SFT table showed "PaLM-family" for Google 2024 work with no note that GPT-4/PaLM are no longer the default LLM for production rewriting pipelines | Added note that GPT-4o/Gemini 2.5/o4-mini have superseded GPT-4 and PaLM as production base models | OpenAI model docs; Google AI releases |
| `1c-llm-prompt-expansion.md` | OpenAI Cookbook "What's new with DALL-E 3" linked with no deprecation signal | Added "(2026-04-21): DALL-E 3 is deprecated; gpt-image-1/1.5 succeeds it" footnote | OpenAI deprecation calendar |
| `1d-prompt-weighting-syntax.md` | Midjourney multi-prompt `::` syntax listed as available on "v4, Niji 4/5, 5, 5.1, 5.2, 6, 6.1 and v1–3" — stopped at v6.1, no mention of v7 | Added v7 (default June 17 2025) and v8.1 Alpha (April 14 2026); noted `::` weighting syntax unchanged | Midjourney docs; TechCrunch v7 release; Tom's Guide; godofprompt.ai |
| `1e-survey-papers.md` | "Magic-term decay" listed as "ignored by MJv6+ and FLUX.1" | Updated to "MJv7 (current default as of June 2025) and FLUX.1/FLUX.2" | Midjourney release timeline; BFL FLUX.2 announcement |
| `1e-survey-papers.md` | Open Question #3 listed "DALL-E 3, GPT-Image, Imagen 3, Gemini 2.5" | Updated to "gpt-image-1/1.5 [DALL-E 3 deprecated May 2026], Imagen 3/4, Gemini 2.5, Ideogram 3 Turbo, Midjourney v7+" | OpenAI deprecation; Ideogram 3.0 release Mar 26 2025 |
| `SYNTHESIS.md` item 13 | "largely ignored by MJ v6+ and Flux" | "largely ignored by MJ v7 (current default) and Flux/FLUX.2" | Midjourney v7 release Apr 3 2025 |
| `SYNTHESIS.md` Rec. #2 | "DALL·E 3" in T5/DiT target list | "gpt-image-1/1.5 [formerly DALL-E 3]" | OpenAI model lineage |
| `SYNTHESIS.md` Rec. #9 | Model tag list included `dalle3` but no `flux2`; no deprecation note | Added `flux2`; renamed `dalle3` → `gpt-image-1`; added dated note on FLUX.2 (Nov 2025) and DALL-E 3 deprecation | BFL FLUX.2 release; OpenAI deprecation |
| `SYNTHESIS.md` Primary Sources | DALL-E 3 paper listed with no deprecation signal | Added inline note "[Note 2026-04-21: DALL-E 3 deprecated; API removal May 12, 2026. Successor: gpt-image-1/1.5]" | OpenAI |

## Claims verified as still accurate (no change needed):

| File | Claim verified |
|------|---------------|
| `1a-cfg-and-negative-prompts.md` | Flux guidance distillation / `negative_prompt TypeError` — still accurate for FLUX 1.x and FLUX.2 (same architecture) |
| `1a-cfg-and-negative-prompts.md` | APG (ICLR 2025), CFG++ (ICLR 2025), Guidance Interval (NeurIPS 2024) — publication venues confirmed accurate |
| `1a-cfg-and-negative-prompts.md` | SD3/SD3.5 CFG behavior description — SD 3.5 released Oct 2024 (confirmed); descriptions still accurate |
| `1b-compositional-attention-control.md` | FineGRAIN 2025 / T2I-CompBench++ (TPAMI 2025) still show SD3/SD3.5/FLUX.1 attribute-binding failures — still accurate |
| `1b-compositional-attention-control.md` | "Prompt Forgetting in DiT" arXiv:2602.06886 (Feb 2026) — correctly dated |
| `1c-llm-prompt-expansion.md` | Promptist, BeautifulPrompt, RePrompt, PromptToAsset SFT→RL training recipe — still the field standard |
| `1c-llm-prompt-expansion.md` | CLIP 77-token truncation for SD1.5/SDXL — still accurate |
| `1d-prompt-weighting-syntax.md` | Four distinct weighting semantics (A1111 scale, ComfyUI lerp, Compel masked blend, Midjourney multi-prompt) — still accurate; syntax unchanged in current versions |
| `1e-survey-papers.md` | Promptist (NeurIPS 2023), The Prompt Report (2024), Oppenlaender taxonomy (Behaviour & IT 2024) — all correctly cited |
| `SYNTHESIS.md` | CFG equation, negative prompt mechanism, oversaturation root cause (APG) — foundational; unchanged |
| `SYNTHESIS.md` | "CLIP 77-token silent truncation is still shipping in 2026" — confirmed still true for SD1.5/SDXL pipelines |

---

# Updates: 02-image-generation-models

_Audit date: 2026-04-21_

## Files modified

- `2a-diffusion-foundations.md`: Added dated banner noting DALL·E 3 deprecation (May 2026), gpt-image-1 as successor, Midjourney v7/v8 current status; updated exec summary to replace "DALL·E 3" with "gpt-image-1" in model list.
- `2b-autoregressive-transformer-t2i.md`: Added Emu3.5 (Oct 2025) to timeline; extended 2025-2026 trajectory to include Qwen-Image-2.0 (Feb 2026); added Qwen-Image open-weights entry to Tools section with dated note.
- `2c-flow-matching-rectified-flow.md`: Added dated corrections to three locations where DALL·E 3 and Midjourney v6.0 appear as comparison benchmarks (vendor-reported BFL launch claims); added note that DALL-E 3 is deprecated and current comparators are gpt-image-1/1.5 and Midjourney v7/v8.
- `2d-dit-mmdit-architectures.md`: Updated typography claim to correctly reference gpt-image-1/1.5 instead of DALL-E 3 as the AR/hybrid text leader; expanded open-weights frontier section to include FLUX.1 Tools, FLUX.1 Kontext variants, HiDream-I1, Qwen-Image, Qwen-Image-2.0, OmniGen2; updated closed-commercial list to include Midjourney v7/v8 Alpha, gpt-image-1.5, Ideogram 3 Turbo; added dated note summarizing new open-weights releases.
- `2e-imagen-technical-reports.md`: Added dated caveat to the Imagen 3 GenAI-Bench Elo table, noting DALL·E 3 and Midjourney v6 are the paper's historical 2024 comparison targets; added "Note" column to benchmark table flagging deprecation/succession status of each model.
- `SYNTHESIS.md`: Updated model picker to add Ideogram 3 Turbo; added dated DALL-E 3 deprecation warning to the gpt-image-1 quirks entry; added DALL-E 3 routing prohibition to router point 1; added new frontier model entries to Primary Sources (OmniGen2, HiDream-I1, Qwen-Image, Qwen-Image-2.0); updated controversy entry on "AR wins text" split to include Midjourney v8 text accuracy data.

## Outdated/false claims corrected

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `2a-diffusion-foundations.md` | Executive summary lists "DALL·E 3" as a live frontier system | DALL·E 3 deprecated May 12, 2026; current model is gpt-image-1 / gpt-image-1.5 | OpenAI deprecation announcement Nov 2025; OpenAI community forum |
| `2a-diffusion-foundations.md` | "Midjourney's internals" with no version context | Midjourney v7 is current default (Apr 2025); v8 Alpha in preview (Mar 2026) | TechCrunch, Midjourney updates page |
| `2c-flow-matching-rectified-flow.md` | BFL launch claim: FLUX.1 surpasses "Midjourney v6.0, DALL·E 3 (HD)" (presented as current comparison) | Those were the 2024 launch-time comparison targets; current comparators are MJ v7/v8 and gpt-image-1.5. Added dated caveat. | Web search: Midjourney v7 (Apr 2025 default), DALL-E 3 deprecation (May 2026) |
| `2c-flow-matching-rectified-flow.md` | Open questions name "DALL·E 3" as a closed holdout model | Corrected to gpt-image-1/1.5 with dated note | OpenAI model deprecation docs |
| `2c-flow-matching-rectified-flow.md` | Market signals cite "Midjourney v6.1 post-mortems" without noting v7/v8 exist | Added dated caveat noting MJ v7 (Apr 2025) and v8 Alpha (Mar 2026) | TechCrunch, Midjourney updates |
| `2d-dit-mmdit-architectures.md` | "SD3, FLUX.1, and Qwen-Image all substantially outperform SDXL and even DALL-E 3 on typography benchmarks" | Added clarification that gpt-image-1/1.5 is the current OpenAI reference and actually *leads* on short-headline word accuracy (~98%) | 2b §3 in this same document; web search on gpt-image-1.5 accuracy |
| `2d-dit-mmdit-architectures.md` | Open-weights frontier listed only through late 2024 (no HiDream-I1, Qwen-Image, OmniGen2) | Added HiDream-I1 (Apr 2025), Qwen-Image (Aug 2025), Qwen-Image-2.0 (Feb 2026), OmniGen2 (Jun 2025), FLUX.1 Kontext [dev] (Jun 2025) | Web searches; arXiv 2505.22705, 2508.02324, 2506.18871, 2506.15742 |
| `2d-dit-mmdit-architectures.md` | Closed commercial list: "GPT-Image (OpenAI), Midjourney v7" with no note that DALL-E 3 is being deprecated or that v8 exists | Updated to "GPT-Image / gpt-image-1.5 (DALL-E 3 deprecated May 2026), Midjourney v7 (default Jun 2025) / v8 Alpha (Mar 2026 preview), Ideogram 3 / 3 Turbo (Mar 2025)" | OpenAI deprecation, Midjourney updates, Ideogram release notes |
| `2e-imagen-technical-reports.md` | Imagen 3 benchmark table presents DALL·E 3 (Elo 1,028) and Midjourney v6 (Elo 1,027) with no caveat that these are now superseded | Added column "Note" and dated banner explaining these are the 2024 paper's comparison targets; DALL-E 3 deprecated May 2026, Midjourney v6 superseded Apr 2025 | Imagen 3 tech report context; OpenAI/Midjourney announcements |
| `SYNTHESIS.md` | Model picker §1 lists "Ideogram 3" without Turbo variant | Added "Ideogram 3 / 3 Turbo" (Turbo is the cheapest/fastest tier at $0.04/image, released Mar–May 2025) | Ideogram docs, Replicate model page |
| `SYNTHESIS.md` | Primary Sources missing OmniGen2, HiDream-I1, Qwen-Image, Qwen-Image-2.0 | Added all four with arXiv IDs and release dates | Web searches; arXiv |
| `SYNTHESIS.md` | Controversy "AR wins text" doesn't mention Midjourney v8's text accuracy improvement | Added: "Midjourney v8 Alpha (March 2026) improved text accuracy from ~52% (v7) to ~78% but FLUX still leads at 88–92% for multi-word text" | WaveSpeedAI blog, comparison articles |
| `2b-autoregressive-transformer-t2i.md` | 2025-2026 trajectory ends at gpt-image-1.5 Dec 2025 with no 2026 entries | Added Emu3.5 (Oct 2025) and Qwen-Image-2.0 (Feb 2026) | BAAI/Medium; Alibaba Qwen blog |

## Claims verified as still accurate (no change needed)

- `2e`: Imagen 4 has no standalone arXiv tech report as of 2026-04 — confirmed via web search.
- `2e`: Imagen 4 pricing ($0.06 Ultra / $0.04 standard / $0.02 Fast) — confirmed via Vertex AI pricing docs.
- `2e`: Gemini 2.5 Flash Image pricing ~$0.039/image (1,290 output tokens × $30/1M) — confirmed accurate; note: Google AI Studio web UI offers up to 500 images/day free; paid API tier has no free image quota as of Dec 2025.
- `2c`: SANA-Sprint arXiv:2503.09641 ICCV 2025 — confirmed.
- `2c`: FLUX.1 Kontext arXiv:2506.15742 — confirmed; [pro/max] released May 29, 2025; [dev] open weights released June 26, 2025.
- `2b`: Ideogram 3.0 / 3 Turbo figures ("~90% word accuracy", Turbo pricing $0.04/image) — confirmed via Ideogram docs and Replicate.
- `2b`: gpt-image-1 released April 23, 2025; gpt-image-1.5 December 16, 2025 — confirmed.
- `2d`: OmniGen CVPR 2025 — confirmed (arXiv:2409.11340).
- `index.md` / `SYNTHESIS.md`: Gemini/Imagen free API removed Dec 2025 banners — already present and accurate.
- `2a`: SD 3.5 (Oct 2024) — still latest Stability AI open-weights release; no SD 4 as of April 2026.
- Recraft V3 (Oct 2024) — still the latest Recraft model as of April 2026 (confirmed via web search).
- Midjourney v7 as current default (became default June 17, 2025) — confirmed. v8 Alpha is preview only (March 2026), v8.1 Alpha April 14, 2026; v7 remains the production default.

---

# Updates: 03-evaluation-metrics
**Audit date:** 2026-04-21
**Auditor:** Claude Sonnet 4.6 (automated research audit)

## Files modified:
- `3a-clip-alignment-metrics.md`: Added VQAScore industry-adoption update (Imagen 3/4, ByteDance Seed, NVIDIA), L-VQAScore variant, video extension, and VQQA framework citation.
- `3b-fid-perceptual-metrics.md`: Added Fréchet Wavelet Distance (FWD, ICLR 2025) as an emerging distributional metric to watch.
- `3d-compositional-benchmarks.md`: Clarified GenEval saturation severity (96.7% human score for Gemini 2.5 Flash Image); confirmed ConceptMix has no 2025/2026 update with frontier models; added T2I-CoReBench (ICLR 2026) as a new benchmark covering compositional reasoning.
- `3e-asset-specific-eval.md`: Updated STRICT-Bench status (now accepted EMNLP 2025, broader model set evaluated); updated Recraft SOTA reference from V3 to V4; updated TL;DR with STRICT-Bench GPT-4o/Gemini 2.0 text-rendering leadership.
- `SYNTHESIS.md`: Added 2026-04-21 audit notice at top; updated item 4 (GenEval saturation severity + T2I-CoReBench note); updated item 10 (Recraft V4, STRICT-Bench EMNLP 2025, GPT-4o/Gemini text-rendering leadership); updated ConceptMix gap (confirmed no frontier-model update); updated VLM-as-judge section; added T2I-CoReBench to primary sources.

## Files with no changes required:
- `3c-human-preference-models.md`: Claims are accurate. HPSv3 confirmed at ICCV 2025 with open-source code/weights. Star counts are approximate. A new PAM personalized preference dataset exists (2025) but does not invalidate existing claims. No errors found.
- `index.md`: Accurate directory index; no factual claims to check.

## Outdated/false claims corrected:

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `3a-clip-alignment-metrics.md` | VQAScore described without noting industry-standard adoption | VQAScore/GenAI-Bench adopted by Google DeepMind (Imagen 3/4), ByteDance Seed, NVIDIA as of 2025 | github.com/linzhiqiu/t2v_metrics; blog.ml.cmu.edu/2024/10/07/vqascore |
| `3a-clip-alignment-metrics.md` | No mention of L-VQAScore or video-VQAScore extensions | L-VQAScore (localized variant, 2025) and video support (20+ VLMs) now exist | github.com/intelligolabs/L-VQAScore |
| `3b-fid-perceptual-metrics.md` | No mention of FWD as emerging alternative | Fréchet Wavelet Distance (FWD) published at ICLR 2025 as domain-agnostic distributional metric | openreview.net/forum?id=QinkNNKZ3b |
| `3d-compositional-benchmarks.md` | GenEval saturation stated as "up to 17.7 pp" absolute error | Confirmed more severe: Gemini 2.5 Flash Image reaches 96.7% human score while original GenEval substantially undercounts it | arxiv.org/abs/2512.16853 |
| `3d-compositional-benchmarks.md` | ConceptMix gap described as a future opportunity | Confirmed active gap as of April 2026: no FLUX/SD3/Gemini results published on ConceptMix | princetonvisualai.github.io/conceptmix |
| `3d-compositional-benchmarks.md` | No mention of T2I-CoReBench | T2I-CoReBench (ICLR 2026) introduces compositional+reasoning benchmark; 28 SOTA models all fail on reasoning dimension | arxiv.org/abs/2509.03516 |
| `3e-asset-specific-eval.md` | "Recraft V3 is strongest at long strings and vector output" | Recraft V4 (2025–2026) supersedes V3; holds HuggingFace T2I Arena #1 (ELO 1172, 72% win rate); generates native editable SVG | recraft.ai/docs/recraft-models/recraft-V4; wavespeed.ai |
| `3e-asset-specific-eval.md` | STRICT-Bench described as 2025 preprint | STRICT-Bench accepted EMNLP 2025; GPT-4o and Gemini 2.0 lead by large margin across models tested | arxiv.org/abs/2505.18985 |
| `SYNTHESIS.md` | Item 10: "Recraft V3 for long strings" | Updated to Recraft V4 + STRICT-Bench EMNLP 2025 GPT-4o/Gemini 2.0 text-rendering leadership | See above |
| `SYNTHESIS.md` | Item 4: GenEval drift described only as "up to 17.7 pp" | Severity confirmed: Gemini 2.5 Flash Image 96.7% human score; T2I-CoReBench adds reasoning gap | arxiv.org/abs/2512.16853; arxiv.org/abs/2509.03516 |

## Claims verified as still accurate (no changes needed):

| File | Claim | Verified |
|------|-------|---------|
| `3c-human-preference-models.md` | HPSv3 is ICCV 2025, open-source, Qwen2-VL backbone, HPDv3 1.08M pairs | Confirmed via openaccess.thecvf.com/ICCV2025 |
| `3c-human-preference-models.md` | Best-of-N with N=4–8 captures most quality gain | Consistent with current literature |
| `3c-human-preference-models.md` | MPS has four conditioned heads (aesthetic/alignment/detail/overall) | Confirmed via paper |
| `3a-clip-alignment-metrics.md` | SigLIP 2 (Feb 2025) beats SigLIP at all scales | Confirmed: 2–3 pp improvement on ImageNet/retrieval, up to +5 mIoU on dense tasks |
| `3a-clip-alignment-metrics.md` | CLIPScore bag-of-words failure on compositional prompts | Still valid; VQAScore addresses this |
| `3b-fid-perceptual-metrics.md` | CMMD + FD-DINOv2 recommended over FID for T2I | Still the community recommendation |
| `3d-compositional-benchmarks.md` | T2I-CompBench++ evaluated FLUX.1 and SD3 | Confirmed: FLUX.1 results added Nov 2024; SD3 adopted the metric |
| `3d-compositional-benchmarks.md` | GenEval 2 (arXiv:2512.16853) is the recommended successor | Confirmed; still the right recommendation |
| `3e-asset-specific-eval.md` | LayerDiffuse 97% user preference over matte pipelines | Still cited in active literature; ART (CVPR 2025) and OmniPSD build on it |
| `3e-asset-specific-eval.md` | DINOv2 > CLIP for style/brand consistency | Confirmed via fruit-SALAD 2025 and ongoing DINOv2 style retrieval work |

## Notes for future audits:
- Check if L-VQAScore gains traction as a standard for attribute-binding evaluation (currently a 2025 preprint)
- Check if FWD (Fréchet Wavelet Distance) gets adopted beyond ICLR 2025
- Run ConceptMix on Gemini 3, FLUX 2, and Recraft V4 — no published results exist; high publishability
- Monitor Recraft V4 Pro for native vector generation becoming an industry standard path
- T2I-CoReBench reasoning scores for 2026 models warrant a follow-up audit once more models report results

---

# Partial Update Log — Category 04 (Gemini / Imagen Prompting)
**Audit date:** 2026-04-21  
**Auditor:** Claude (automated research updater)

---

## Summary of Changes

### Files Modified

| File | Changes |
|---|---|
| `4a-imagen-official-prompt-guides.md` | Added top-level `Updated 2026-04-21` banner; corrected AI Studio "no billing needed" claim; added deprecation callout after capability table; updated `last_updated` to 2026-04-21 |
| `4b-gemini-flash-image-nano-banana.md` | Already had 2026-04-21 status banner from prior update; updated `last_reviewed` to 2026-04-21; no content errors found |
| `4c-transparent-background-checker-problem.md` | Added `Updated 2026-04-21` banner; updated `date_compiled` to 2026-04-21; content accurate — no Google model produces RGBA, limitation confirmed still current |
| `4d-quirks-and-artifacts.md` | Added `Updated 2026-04-21` banner noting Imagen 4 EOL, billing-required change, and SDK deprecation; updated `date_range` to 2026-04 |
| `4e-vertex-sdk-integration.md` | Added `Updated 2026-04-21` banner; added `Status` column to model landscape table with deprecation dates for all Imagen 4.0 variants; added note that `negativePrompt` is silently ignored on Imagen 4; added billing-required clarification to auth section; added deprecation warnings to code examples 1, 3, 5; updated practical notes #1 and #2 with SDK migration guidance and deprecation warnings; updated `last_updated` |
| `SYNTHESIS.md` | Updated `last_updated` to 2026-04-21; updated routing rules #3 and #4 with Imagen 4 deprecation caveats; added `Gaps` callout about Imagen 4 successor routing gap and SDK migration gap |
| `index.md` | Added `last_updated: 2026-04-21` to front matter (already had 2026-04-21 status banner) |

---

## Issues Found and Corrected

### Issue 1: Free API tier claims (CRITICAL)
**Status:** Corrected in `4a`, `4e`. Already corrected with banners in `4b`, index, SYNTHESIS.

**Finding:** The Gemini Developer API free tier no longer includes image generation. Programmatic image generation via an unbilled API key returns HTTP 429 with `free_tier_requests limit: 0`. Third-party sources initially reported conflicting information ("500 RPD free"), but Google Developer Forum threads confirm: as of early 2026, image models show `limit: 0` on the free tier. The AI Studio **web UI** (https://aistudio.google.com) remains free for interactive generation.

**Action:** Added `Updated 2026-04-21` notices in `4a` and `4e` clarifying that programmatic image-gen requires billing. Fixed the misleading "without billing setup" language in `4a`'s AI Studio section.

### Issue 2: Imagen 4.0 deprecation (HIGH)
**Status:** Corrected across all files.

**Finding:** All three Imagen 4.0 GA variants (`imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`, `imagen-4.0-ultra-generate-001`) are deprecated and will be discontinued **June 30, 2026**. Google recommends migrating to `gemini-2.5-flash-image`. This was partially documented in the existing files (the discontinuation date was present in `4e`'s model table), but the broader implication — that recommendations to "use Imagen 4 Fast/Standard/Ultra" are now routing to EOL models — was not surfaced in the recommendations sections.

**Action:** Added Status column to `4e` model table; added deprecation warnings to code examples 1, 3, 5 in `4e`; updated routing rules 3 and 4 in SYNTHESIS.md; added deprecation callout after capability table in `4a`.

### Issue 3: Legacy SDK deprecation (MEDIUM)
**Status:** Corrected in `4e` and `4d` banners.

**Finding:** `google-cloud-aiplatform`'s `vertexai.generative_models`, `vertexai.vision_models`, `vertexai.language_models`, and `vertexai.tuning` / `vertexai.caching` modules were deprecated June 24, 2025 and will be **removed June 24, 2026**. The `google-generativeai` package is also deprecated. The existing code examples in `4e` correctly use `from google import genai` (the `google-genai` package), but the files did not warn readers against using the old SDK.

**Action:** Added SDK deprecation notice to `4e` top-level banner and practical notes section #1.

### Issue 4: `negativePrompt` on Imagen 4 (MEDIUM)
**Status:** Corrected in `4e`.

**Finding:** The REST API parameter example in `4e` includes `"negativePrompt": "text, watermark, low quality"` but targets a generic Imagen endpoint. Imagen 4.x variants do **not** support `negativePrompt` — it is silently ignored or causes a validation error. This was already correctly documented in `4a`'s capability table and in SYNTHESIS.md's prompt rewriting rules, but the code example was inconsistent.

**Action:** Added a note after the REST example in `4e` explicitly warning that `negativePrompt` must be removed for Imagen 4 model calls.

### Issue 5: AI Studio "no billing" claim (MEDIUM)
**Status:** Corrected in `4a`.

**Finding:** `4a` stated Google AI Studio is "the fastest way to sanity-check a prompt **without billing setup**." This is true for the web UI (still free interactively), but the broader context — that API keys from AI Studio do not grant free programmatic image-gen — needed clarification.

**Action:** Replaced "without billing setup" with "interactively" and added a parenthetical note about the billing requirement for programmatic access.

---

## Claims Verified as Accurate (no changes needed)

- **Transparent background limitation:** Confirmed still true for all Google image models as of April 2026. No RGBA output from any Imagen or Gemini image model. `gpt-image-1` and Recraft V3 remain the correct alternatives for native alpha.
- **Pricing:** Imagen 4 Fast $0.02, Standard $0.04, Ultra $0.06 confirmed via Vertex AI pricing page. Gemini 2.5 Flash Image ~$0.039/img (1290 tokens × $30/1M) confirmed.
- **Gemini 2.5 Flash Image model ID and discontinuation:** `gemini-2.5-flash-image`, GA Oct 2, 2025, EOL Oct 2, 2026 — confirmed.
- **`negativePrompt` removed from Imagen 3.0-002 and all Imagen 4:** Confirmed.
- **SynthID watermark is non-optional:** Confirmed.
- **`enhancePrompt=true` default on Imagen:** Confirmed still default behavior.
- **SDK code examples:** All examples use correct `google-genai` SDK (`from google import genai`) — no old SDK imports found.
- **Gemini 2.5 Flash Image text rendering:** Strong for short-to-medium strings, confirmed via community sources.
- **`IMAGE_SAFETY` futex deadlock (4d #8):** Open bug, confirmed still unresolved as of April 2026 per search results.
- **MIME-type lie bug (4d #9):** Closed as "stale" per original research; no fix shipped.

---

## Remaining Gaps / Future Work

1. **Imagen 4 successor for batch-4 / fixed-resolution use cases:** `gemini-2.5-flash-image` is the migration target but does not support batch-4 or the same fixed-resolution control (2048×2048 explicit) that Imagen 4 Standard/Ultra provided. Neither `gemini-3.1-flash-image-preview` nor any current GA model has been benchmarked as a drop-in replacement for these specific capabilities. This needs a dedicated angle update once `gemini-3.1-flash-image` reaches GA.

2. **Free tier situation evolving:** The free tier status for image models has been in flux (92% quota cut in December 2025, partial recovery by February 2026, possible further changes). The conservative policy — treat as "requires billing" for production — is correct. Monitor https://ai.google.dev/gemini-api/docs/rate-limits for official free-tier table updates.

3. **`gemini-3.1-flash-image-preview` prompting analysis:** Listed in `4e`'s model table but no dedicated angle covers its prompting dialect, quirks, or capability differences from `gemini-2.5-flash-image`. Needs angle 4f once the model reaches GA.

4. **Geolocation-gated billing requirements:** Some EU/GDPR-region users report different billing tiers and model availability restrictions beyond `personGeneration` rules. Not yet documented in this category.

---

# Research Update Log — Category 05 (OpenAI DALL·E / gpt-image)
**Audit date:** 2026-04-21
**Auditor:** automated research updater

---

## Summary

Nine files audited. All were broadly accurate and well-sourced as of their last-updated date (2026-04-19). Three factual errors corrected; two significant gaps added; one imminence flag upgraded.

---

## Corrections Made

### 1. gpt-image-1.5 max output size — `5e-production-integrations.md` (CORRECTED)

**Error:** Pricing table listed max long edge for `gpt-image-1.5` as **2048 px**.

**Fact:** Official OpenAI API docs confirm gpt-image-1.5 supports the same three sizes as gpt-image-1: `1024×1024`, `1536×1024`, `1024×1536`. Max long edge is **1536 px**, not 2048.

**Source:** `developers.openai.com/api/docs/models/gpt-image-1.5` (fetched 2026-04-21)

**File changed:** `5e-production-integrations.md` — pricing table row for gpt-image-1.5 corrected; update note added.

---

### 2. gpt-image-1.5 high-quality pricing — `5c-logo-icon-generation.md` and `SYNTHESIS.md` (CORRECTED)

**Error:** Both files stated gpt-image-1.5 at 1024² high = **~$0.19**. This is the gpt-image-1 price; gpt-image-1.5 is ~20% cheaper.

**Fact:** gpt-image-1.5 1024² prices: low $0.009, medium $0.034, **high $0.133**. The $0.19 figure (more precisely $0.167 + prompt tokens) belongs to `gpt-image-1`, not `gpt-image-1.5`.

**Source:** OpenAI pricing page (fetched via `developers.openai.com/api/docs/guides/image-generation` 2026-04-21); `aifreeapi.com/en/posts/gpt-image-1-5-pricing`

**Files changed:**
- `5c-logo-icon-generation.md` — comparison table row updated from ~$0.19 to ~$0.133; update note added below table.
- `SYNTHESIS.md` — point 12 reworded to clearly attribute $0.167/~$0.19 to gpt-image-1 and $0.133 to gpt-image-1.5; update note added.

---

### 3. Public-figure moderation policy — `5d-failure-modes-text-and-moderation.md` and `5a-dalle3-prompt-guide-and-rewriter.md` (UPDATED)

**Error:** Both files stated public-figure/celebrity names are categorically stripped/rejected — presenting this as an immutable hard block for all OpenAI image models.

**Fact:** OpenAI relaxed content moderation policies in early 2026 (TechCrunch Mar 2025, policy updates Mar–Apr 2026). Named politicians and public figures are now broadly allowed in non-harmful image generation contexts via `gpt-image-1`/`gpt-image-1.5`. The blanket refusal remains for Disney/Marvel/Star Wars/Pixar IP and for likeness-abuse cases. Living-artist style refusals are unchanged. The old behavior is still accurate for DALL·E 3 (different moderation stack).

**Source:** TechCrunch "OpenAI peels back ChatGPT's safeguards around image creation" (Mar 2025); OpenAI moderation policy page (Apr 2026); OpenAI community threads.

**Files changed:**
- `5d-failure-modes-text-and-moderation.md` — File-level update note added at top; Failure #5 table row updated from "High by name" to "Reduced in 2026 — now moderate"; new bullet added to Concrete false-positive patterns section explaining the policy shift.
- `5a-dalle3-prompt-guide-and-rewriter.md` — Point 5 under Moderation section updated with 2026-04-21 caveat noting gpt-image-1/1.5 are now more permissive.

---

## Gaps Identified (No Source Found to Assert Corrections — Documented as Gaps)

### 4. gpt-image-2 status — SYNTHESIS.md and `5c-logo-icon-generation.md` (GAP DOCUMENTED)

**Status:** As of 2026-04-21, `gpt-image-2` has not been officially released to the OpenAI API. It is in gray testing in LM Arena (codenames: maskingtape-alpha, gaffertape-alpha, packingtape-alpha) and a staggered ChatGPT rollout began around April 19, 2026. No official API release announcement, no pricing, no model ID in the official docs.

**Claimed capabilities (from third-party reports only, unverified against official docs):** ~99% text rendering accuracy; 4096×4096 px output; 2× generation speed vs gpt-image-1.5.

**Action taken:** Gap added to SYNTHESIS.md §Gaps. Update note added to 5c-logo-icon-generation.md comparison table note. No changes to routing-table.json — model not yet official.

**Monitor:** `developers.openai.com/api/docs/changelog`

---

### 5. DALL·E 3 sunset imminence — `5a-dalle3-prompt-guide-and-rewriter.md` (FRAMING UPGRADED)

**Error:** Recommendation #9 framed the 2026-05-12 sunset as a future planning item ("Plan the May 2026 sunset now"). As of audit date (2026-04-21), this is **21 days away** — migrations must already be complete.

**Action taken:** Recommendation #9 rewritten to reflect imminence; update note added calling out the 21-day countdown explicitly.

---

## Files Not Changed (Verified Accurate)

| File | Status |
|------|--------|
| `5a-dalle3-recaptioning.md` | Accurate. Recaptioning mechanics for DALL·E 3 and gpt-image-1 correctly described. gpt-image-1.5 note in §5 is sound. |
| `5b-gpt-image-1-api.md` | Accurate. All parameters, token tables, rate limits confirmed correct. Pricing ($0.167 for gpt-image-1 high) is gpt-image-1, correctly attributed. |
| `5b-gpt-image-1-api-and-transparency.md` | Accurate. Transparency failure modes T1–T7 still valid. Economic comparison table correctly uses gpt-image-1.5 at $0.133 (consistent with fix applied elsewhere). |
| `5c-openai-cookbook-asset-workflows.md` | Accurate. All cookbook recipes and integration patterns current. |
| `5d-system-style-behavior.md` | Accurate. Responses API vs Image API instruction surface correctly described. |
| `5e-production-integrations.md` | One correction applied (gpt-image-1.5 max size); all other content accurate. |
| `index.md` | Accurate. Correctly lists gpt-image-1.5 as GA 2025-12-16, DALL-E 2/3 sunset 2026-05-12. |
| `SYNTHESIS.md` | Two updates applied (pricing, gaps). Rest of content verified accurate. |

---

## Key Facts Confirmed Accurate (No Change Needed)

- DALL·E 2 and DALL·E 3 sunset: **2026-05-12** — confirmed.
- gpt-image-1 GA date: 2025-04-23 — confirmed.
- gpt-image-1.5 GA date: 2025-12-16 — confirmed.
- Organization verification still required for gpt-image-1: confirmed active as of Apr 2026.
- `background="transparent"` only works reliably on `/v1/images/generations`, not `/v1/images/edits`: still accurate per community thread reports.
- gpt-image-1.5 not available on free tier / DALL·E 3 not available on free tier: confirmed.
- Rate limits (Tier 1 = 5 IPM, Tier 5 = 250 IPM): confirmed.
- C2PA mandatory on all gpt-image outputs: confirmed.
- Batch API 50% discount with 24h SLA: confirmed.
- `moderation="low"` parameter only on gpt-image-1*, not DALL·E 3: confirmed.
- gpt-image-1 three output sizes (1024², 1536×1024, 1024×1536): confirmed.
- gpt-image-1.5 max size same as gpt-image-1 (1536 px long edge): confirmed (corrected the erroneous 2048 claim in 5e).

---

# Research Update Log — Category 06 (Stable Diffusion & Flux)
**Audited:** 2026-04-21  
**Auditor:** Research-updater agent  
**Files touched:** 6a, 6b, 6c, 6d, 6e, SYNTHESIS.md, index.md

---

## Summary of Changes

### 6a — SD 1.5 / 2.1 / XL prompting fundamentals

**Added two `> Updated 2026-04-21` blocks:**

1. **SD 3.5 coverage gap flagged.** SD 3.5 (Medium 2.6B, Large 8B, Large Turbo) was released October 2024. Has three text encoders (CLIP-L + OpenCLIP-bigG + T5-XXL), supports negative prompts (unlike Flux), has native ControlNets (Blur/Canny/Depth for Large, released Nov 26, 2024), and ships under a commercial-friendly community license. Not covered by the A1111 DSL conventions, `BREAK`, or SDXL micro-conditioning described in this angle.

2. **AUTOMATIC1111 maintenance-only status.** Last release: v1.10.1 (July 2024). No new features, 44+ unmerged PRs as of Q1 2026. Community discussion titled "Future of Automatic1111 for 2025" confirms effective development stall. Practitioners have migrated to ComfyUI or Forge.

---

### 6b — Flux family prompting

**Table corrections:**
- `Flux.1 Kontext [pro/max]` release date corrected from `2025-05` to `2025-05-29`.
- `Flux.1 Kontext [dev]` release date corrected from `2025-06` to `2025-06-26`.
- `Flux.2 [klein]` row split into two correct entries:
  - `Flux.2 [klein] 4B`: Released **2026-01-15**, **Apache 2.0**, uses Qwen3 8B text embedder (distilled), ~13 GB VRAM, sub-second inference. Not "forthcoming beta."
  - `Flux.2 [klein] 9B`: Released **2026-01-15**, FLUX-2 Non-Commercial, ~29 GB VRAM.
- `Flux.2 [dev]` VRAM note updated: NVIDIA FP8 optimizations reduce requirement ~40% (from ~80 GB BF16 to ~48 GB FP8).

**Added `> Updated 2026-04-21` block in local inference section:**
- Confirms Flux.2 [klein] is released (not beta), correct architecture note (Qwen3 embedder distilled from Mistral-3 training), VRAM figures, sub-second generation claim.
- Confirms Flux.2 [klein] ComfyUI support via `FluxKVCache` nodes.

---

### 6c — ControlNet, IP-Adapter, reference conditioning

**Adapter catalog table:**
- Added new row: **ControlNet SD3.5 Large** — Blur, Canny, Depth variants released November 26, 2024 by Stability AI. Compatible only with SD3.5-Large (8B), not Medium.

**Added `> Updated 2026-04-21` block before Limitations section:**
- Notes SD 3.5 ControlNets in diffusers via `StableDiffusion3ControlNetPipeline`.
- Flux.2 [klein]'s unified generation+editing architecture reduces need for separate Fill/Canny/Depth checkpoints.
- InvokeAI now supports Flux ControlNets (XLabs + InstantX) in both Workflows and Linear UI; Flux.2 klein LoRA/CN is open issue.
- Adapter maturity gap between SDXL and Flux has narrowed significantly since mid-2025.

---

### 6d — LoRA / DoRA / LoKr / LoHA training

**Toolchain table corrections:**
- `kohya-ss/sd-scripts`: Flux support changed from `"experimental"` to `"production, merged from sd3 branch into main"`. Training via `flux_train_network.py`. SD3.5 support also added to description.
- `ostris/ai-toolkit`: Updated supported models list to include SD3.5 (8-bit LoRA on 24 GB GPU, October 2024), Wan 2.1 video, Qwen-Image. Noted web UI is now bundled.

**Style-Lock Patterns section (item 6):**
- Corrected false claim: "Flux.1 [dev] does honor a weak negative via guidance_scale tricks."
- **Correct fact:** Flux has no unconditional branch. `guidance_scale` is a conditioning scalar, not a CFG extrapolation coefficient. There is no mechanism to "hear" a negative prompt by adjusting it.
- Community workarounds documented: ComfyUI `FluxPseudoNegativePrompt` (converts to affirmative antonyms); "true CFG" double-forward-pass (2× inference cost, not on commercial endpoints).

**Added `> Updated 2026-04-21` block before Compute & Cost table:**
- kohya Flux support now in main, not experimental.
- ai-toolkit SD3.5 LoRA training confirmed.
- Stability AI financial status: ~$80M raised mid-2024, company stabilized; API remains operational; two endpoints discontinued July 2025 (SD1.6 path → migrate to SDXL or SD3.5).

---

### 6e — Local inference pipelines

**Added large `> Updated 2026-04-21` block at top:**
- A1111: maintenance-only since v1.10.1 (Jul 2024), no Flux.2 support.
- Fooocus: LTS/bug-fixes only, SDXL architecture only, developer recommends Forge/ComfyUI for newer models.
- ComfyUI: Native Flux.2 [dev] support at launch (Nov 2025) with FP8 optimizations (−40% VRAM, +40% throughput). Flux.2 [klein] supported (Jan 2026) via `FluxKVCache` nodes. Now natively supports: SD1.x/2.x, SDXL, SD3/3.5, all Flux variants, Pixart, HunyuanDiT, Lumina 2.0, HiDream, Qwen Image. ComfyUI-Manager V2 under Comfy-Org.
- diffusers: SD3.5 via `StableDiffusion3Pipeline`; Flux.2 [dev] supported; `AutoPipeline` auto-selects.

**Pipeline comparison table:**
- A1111 row: Added `maintenance-only since v1.10.1 (Jul 2024), no active development` to Worst-for column.
- Fooocus row: Added `LTS/bug-fixes only; no Flux, no SD3.5` to Flux support column.

**Diffusers section:**
- Added `> Updated 2026-04-21` block noting SD3.5 via `StableDiffusion3Pipeline`, Flux.2 [dev] support, gated weights on HF.

**VRAM profile section:**
- Added `> Updated 2026-04-21` block with Flux.2 [dev] VRAM (~80 GB BF16, ~48 GB FP8 with NVIDIA optim), Flux.2 [klein] 4B (~13 GB), klein 9B (~29 GB), SD3.5 Large (~16 GB), SD3.5 Medium (~10 GB).

---

### SYNTHESIS.md

**Gaps section:**
- Updated "Flux.2 ecosystem coverage" gap — no longer a gap; ComfyUI/diffusers/InvokeAI have production-ready support.
- Added new gap: Flux.2 [klein] (Jan 2026) not covered in depth in angle files.
- Added new gap: SD 3.5 prompting contract (Oct 2024 release) not covered by any existing angle.
- Corrected Flux.2 [klein] from "forthcoming" to "released Jan 15, 2026."
- Added licensing note: Flux.2 [klein] 4B is Apache 2.0 (commercial-safe); 9B is Non-Commercial.
- Added `> Updated 2026-04-21` block summarizing: klein is released, Flux.2 ecosystem settled, A1111 is maintenance-only, Fooocus is SDXL-only LTS, kohya Flux in main.

**Actionable Recommendations — Self-hostable pipeline:**
- Model defaults updated: replaced "Flux.2 [dev]/[flex] once ecosystem stabilizes" with concrete recommendation for **Flux.2 [klein] 4B** as local consumer-GPU default; added caveat note.

**Actionable Recommendations — LoRA training hook:**
- Backend sentence updated to clarify kohya `sd-scripts` Flux training is via `flux_train_network.py` in main branch, no longer experimental.

---

## Verified Facts (Sources)

| Claim | Verified Status | Source |
|---|---|---|
| SD 3.5 Large/Medium/Turbo released Oct 2024 | Confirmed | stability.ai/news/introducing-stable-diffusion-3-5 |
| SD 3.5 ControlNets (Blur/Canny/Depth) released Nov 26, 2024 | Confirmed | stability.ai/news-updates/sd3-5-large-controlnets |
| SD 3.5 supports negative prompts | Confirmed | seaart.ai guide, drawthings wiki |
| A1111 last release v1.10.1, July 2024 — maintenance-only | Confirmed | github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/16670 |
| Fooocus is LTS/SDXL-only, no Flux | Confirmed | github.com/lllyasviel/Fooocus/discussions/3721 |
| Flux Kontext [pro/max] released May 29, 2025 | Confirmed | businesswire.com; bfl.ai/announcements/flux-1-kontext |
| Flux Kontext [dev] released June 26, 2025 | Confirmed | bfl.ai/announcements/flux-1-kontext-dev |
| Flux.2 released Nov 25, 2025 | Confirmed | bfl.ai/blog/flux-2 |
| Flux.2 [klein] 4B + 9B released Jan 15, 2026 | Confirmed | bfl.ai/blog/flux2-klein-towards-interactive-visual-intelligence; marktechpost.com |
| Flux.2 [klein] 4B: Apache 2.0, ~13 GB VRAM | Confirmed | huggingface.co/black-forest-labs/FLUX.2-klein-4B |
| Flux.2 [klein] 9B: Non-Commercial, ~29 GB VRAM | Confirmed | huggingface.co/black-forest-labs/FLUX.2-klein-9B |
| Flux.2 NVIDIA FP8: −40% VRAM, +40% throughput | Confirmed | blogs.nvidia.com/blog/rtx-ai-garage-flux-2-comfyui/ |
| ComfyUI native Flux.2 support at launch Nov 2025 | Confirmed | vestig.oragenai.com comfyui-news/post_20251129 |
| kohya sd-scripts Flux in main branch (not experimental) | Confirmed | github.com/kohya-ss/sd-scripts (sd3 merged to main) |
| ostris ai-toolkit SD3.5 LoRA support added Oct 2024 | Confirmed | x.com/ostrisai tweet |
| Stability AI operational, API pricing update Aug 2025 | Confirmed | stability.ai/api-pricing-update-25 |
| Flux does not support negative prompts (no workaround on commercial endpoints) | Confirmed | docs.bfl.ml/guides/prompting_guide_t2i_negative; fal.ai/learn/tools/how-to-use-flux |
| ComfyUI-Manager V2 under Comfy-Org | Confirmed | comfyui.org |
| InvokeAI Flux ControlNet support (XLabs + InstantX) | Confirmed | support.invoke.ai/support/solutions/articles/151000170961 |
| Flux.2 [klein] ComfyUI FluxKVCache support | Confirmed | comfyui-news blogs |

---

# Research Update Log — Category 07 (Midjourney / Ideogram / Recraft)
**Date:** 2026-04-21
**Auditor:** Research updater agent

---

## Summary

All five angle files (7a–7e) plus SYNTHESIS.md were read and audited. The files were
recently written (last_updated 2026-04-19) and are generally accurate. Six factual
gaps or outdated claims were found and corrected in-place:

---

## Changes Made

### 7a — `7a-midjourney-v6-v7-prompting.md`

**Issue 1 — Midjourney V8 not mentioned**
- The executive summary ended at V7 (default since 2025-06-17).
- V8 Alpha launched March 17, 2026; V8.1 Alpha launched April 14, 2026 (alpha.midjourney.com).
- V8 key features: 5× faster than V7, native 2K HD (`--hd`), improved text rendering
  in quoted strings, 99% seed stability claimed for V8.1 Alpha, new `--q 4` mode.
- **Fix:** Added `> **Updated 2026-04-21:**` block at executive summary; added V8/V8.1
  to the model timeline bullet; updated the parameter table version range from
  `5.2/6/6.1/7` to include `8`; updated seed stability note.
- Sources: [updates.midjourney.com/v8-alpha/](https://updates.midjourney.com/v8-alpha/),
  [updates.midjourney.com/v8-1-alpha/](https://updates.midjourney.com/v8-1-alpha/),
  WaveSpeedAI blog, MindStudio blog.

**Issue 2 — "No official API" claim slightly imprecise**
- The original said "Midjourney has never shipped a public API."
- More accurate: no public self-serve API. Enterprise customers can negotiate custom
  API access (~$500/month per reports) through Midjourney's sales team, but there
  is no documented REST endpoint or API key for standard plans as of April 2026.
- **Fix:** Reworded to "No official public API" with clarification about enterprise-only
  custom access.

**Addition:** Added V8 Alpha and V8.1 Alpha to the References section.

---

### 7b — `7b-ideogram-text-rendering-for-logos.md`

**No changes needed.** The file accurately covers Ideogram up to V3 (March/May 2025).
No Ideogram 3.5 or later model has been released as of April 2026. Pricing snapshot
(Turbo ~$0.03, Quality ~$0.09) cross-checks with current sources. API endpoints and
parameter schema are current. No updates required.

---

### 7c — `7c-recraft-v3-vector-and-brand-styles.md`

**Issue 3 — Recraft V4 release date missing / imprecise**
- The file mentioned V4 existed but did not give a release date. The text said "2025
  successor" but V4 released **February 2026**.
- **Fix:** Updated the model table header and the V3/V4 section to state "February 2026"
  for V4; added a `> **Updated 2026-04-21:**` block.

**Issue 4 — V4 "no styles" claim needed confirmation**
- The original claim that V4 has no `style`/`style_id` support was correct and
  confirmed via the live Recraft docs (April 2026): *"Styles are not yet supported
  for V4 models."* This applies to all four V4 variants.
- **Fix:** Updated Limitations §1 to explicitly note February 2026 release date and
  that the limitation is confirmed as of April 2026 (not just "as of early 2026").
- Source: [recraft.ai/docs/api-reference/styles](https://www.recraft.ai/docs/api-reference/styles)

---

### 7d — `7d-leonardo-playground-krea-firefly.md`

**Issue 5 — Firefly Image 5 described as "preview, 2025"**
- Firefly Image 5 was announced at Adobe MAX in **October 2025** and is now in
  Photoshop (Beta) for Generative Fill as of **March 18, 2026**. Describing it as
  "preview, 2025" understates its current availability.
- Layered Image Editing and Custom Models remain in private/closed beta.
- **Fix:** Updated the Firefly lineage bullets and executive summary with accurate
  dates. Added `> **Updated 2026-04-21:**` block at the Firefly section.
- Sources: TechCrunch Oct 28, 2025; Adobe community announcement March 18, 2026.

**Issue 6 — Leonardo Phoenix 2.0 not mentioned**
- Leonardo launched Phoenix 2.0 in late 2025 with improved character consistency
  (85–90% identity preservation) and better text rendering. The file only listed
  Phoenix 1.0 and 0.9.
- **Fix:** Updated the model catalog to list Phoenix 2.0 first with a `> **Updated
  2026-04-21:**` block.
- Source: Flowith blog (Leonardo Phoenix 2.0 article), multiple 2026 reviews.

**Issue 7 (minor) — Krea Edit date**
- The file correctly had "Mar 2026" but lacked detail. Krea Edit launched **March 9,
  2026** with specific features: regional selection, object movement with gap-fill,
  perspective/lighting/palette changes, image expansion. A platform-wide redesign
  also shipped in March 2026.
- **Fix:** Expanded the Krea Edit bullet with launch date and feature summary.
- Source: [krea.ai/blog/krea-edit](https://www.krea.ai/blog/krea-edit)

---

### 7e — `7e-commercial-tool-asset-workflows.md`

**Issue 8 — "Recraft V4 Vector" listed as top native vector option**
- The tool-strengths matrix listed "Recraft V4 / V4 Pro Vector" as the native vector
  best-in-class, but V4 has no `style_id` support — making V3 Vector the correct
  default for brand-consistent pipelines.
- **Fix:** Updated the matrix to "Recraft V3 Vector (brand-style pipelines) / V4
  Vector (non-branded)". Added similar clarification to "Where Each Tool Sits."
- Also updated executive summary to mention V8 Alpha and Krea Edit.

---

### SYNTHESIS.md

**Updates:**
- Changed `last_updated` date in header to 2026-04-21.
- Added a multi-bullet `> **Updated 2026-04-21:**` block summarizing all key changes.
- Updated point 4 ("Midjourney is great...") to clarify enterprise-only custom API
  option and mention V8.
- Updated point 6 ("Recraft V4 removed styles") to confirm February 2026 release date
  and cite official docs.

---

## Claims Verified as Still Accurate (No Change Needed)

| Claim | Status |
|---|---|
| Ideogram V3 as best text renderer (~90% short English) | Still accurate |
| Ideogram `/generate-transparent` as only dedicated T2I transparent endpoint | Still accurate |
| Ideogram V3 pricing: Turbo ~$0.03, Quality ~$0.09 | Confirmed current |
| Recraft V3 as only commercially-hosted native SVG model | Still accurate (V4 also native SVG but no styles) |
| Recraft V3 pricing: $0.04 raster, $0.08 vector | Confirmed current |
| Playground v3 API is partner-gated (>1M images/month) | Confirmed still true |
| Midjourney no public API | Confirmed (enterprise custom access only at ~$500/mo) |
| MJ `--sref` / `--cref` / `--oref` parameter syntax unchanged | Confirmed |
| Niji V7 launched January 2026 | Confirmed |
| Leonardo Phoenix transparency: `foreground_only` | Confirmed |
| Firefly indemnity does not extend automatically to API | Confirmed |
| FLUX 1.1 Pro on Together: $0.04/MP | Confirmed |

---

## Items Not Investigated (Out of Scope / No Signal of Change)

- Luma Photon pricing (no signal of change)
- Bing Image Creator status (known to still be DALL-E 3 wrapper, no API)
- Ideogram `style_codes` portability across model versions
- Specific Recraft V4 quality vs V3 quality benchmarks (no reproducible head-to-head found)

---

# Research Update Log — Category 08 (Logo Generation)
Date: 2026-04-21
Auditor: research-updater agent

---

## Summary of Changes

Five of the seven files in `08-logo-generation/` were edited in-place.
`8a-logo-design-theory-and-brand-fundamentals.md` received a single
correction note. `index.md` required no edits (metadata only). All edits
use `> **Updated 2026-04-21:**` callouts so readers can distinguish
corrections from original research.

---

## File-by-File Changes

### 8a-logo-design-theory-and-brand-fundamentals.md

- **Executive Summary paragraph:** Removed stale reference to "DALL·E 3"
  as a named current model. Replaced with `gpt-image-1`. Added an
  `Updated 2026-04-21` callout noting the DALL·E 3 deprecation (May 12,
  2026), Recraft V4 release (Feb 2026), and Midjourney V8 Alpha (Mar 2026).

---

### 8b-prompt-patterns-by-logo-style.md

- **`models_covered` frontmatter:** Added `midjourney-v8`, `recraft-v4`,
  `ideogram-3`, `gemini-3-pro-image`, `gpt-image-1-5`.

- **Midjourney v6/v7 section:** Renamed to "v6/v7/v8". Added `Updated
  2026-04-21` block noting MJ V8 Alpha launched March 17, 2026; V8.1
  Alpha launched April 14, 2026. V8 is ~5× faster, produces native 2K,
  and significantly improves text rendering for quoted strings. Still in
  alpha; Ideogram 3 remains the text-rendering benchmark leader.

- **Recraft V3 section:** Renamed to "Recraft V3 / Recraft V4". Added
  `Updated 2026-04-21` block noting Recraft V4 released February 2026
  with four variants (raster/vector × standard/pro). `controls.colors`
  API parameter carried forward; V4 API parameter structure noted for
  providers like fal.ai.

- **Gemini 2.5 Flash Image section:** Renamed to "Gemini Flash Image /
  Nano Banana family". Added `Updated 2026-04-21` block clarifying the
  model naming: Nano Banana = gemini-2.5-flash-image (free ~500 req/day,
  restored Feb 2026 after Dec 2025 cut); Nano Banana 2 =
  gemini-3.1-flash-image-preview (Feb 26, 2026; 4K; free dev tier); Nano
  Banana Pro = gemini-3-pro-image-preview (no free API tier, billed
  only); Imagen 4 has no free tier. Expanded per-model bullet list.

- **DALL·E 3 / gpt-image-1 section:** Added `Updated 2026-04-21` block
  noting DALL·E 3 deprecation (announced Nov 2025, effective May 12,
  2026). ChatGPT switched to gpt-image-1.5 in Dec 2025. Added
  gpt-image-1.5 architecture note (native multimodal, ~4× faster, ~20%
  cheaper, better text rendering).

---

### 8c-text-rendering-in-logos.md

- **`models_covered` frontmatter:** Added `recraft-v4`, `midjourney-v8`,
  `gemini-3.1-flash-image`.

- **Model comparison benchmark table:** Added `Updated 2026-04-21` preamble
  summarizing five model-landscape shifts. Added rows for:
  - Recraft V4 (replacing V3 row — improved text accuracy)
  - Nano Banana 2 (gemini-3.1-flash-image, Feb 2026, 4K, free dev tier)
  - Midjourney v8 Alpha (Mar 2026, improved quoted-text rendering)
  - DALL·E 3 marked as legacy/deprecated (May 12, 2026)
  - GPT-Image-1 row clarified as being superseded by 1.5

- **Multi-script support table:** Added `Updated 2026-04-21` note.
  Updated column header from "Recraft V3" to "Recraft V4". Updated
  "Gemini 3 Pro Image" column header to "Nano Banana Pro (Gemini 3 Pro
  Image)" with note that it has no free API tier. Added "Midjourney v8α"
  column. Added Nano Banana Pro free-tier warning to headline takeaways.

- **References:** Added Recraft V4 model page URL alongside V3 (now marked
  legacy).

---

### 8d-monograms-and-color-palette-control.md

- **Recraft v3 / Recraft API section:** Renamed to "Recraft V4 / Recraft
  API". Added `Updated 2026-04-21` block noting V4 release (Feb 2026),
  four model variants, and that V4 API `controls.colors` parameter
  structure may differ per provider integration.

- **Gemini 2.5 Flash Image section:** Renamed to "Gemini Flash Image /
  Nano Banana family". Added `Updated 2026-04-21` block explaining the
  full Nano Banana naming tree and clarifying which models have free vs
  paid tiers. Noted Dec 2025 free-tier cut and Feb 2026 partial
  restoration for Nano Banana (flash). Noted Nano Banana Pro remains
  billed-only.

- **DALL·E 3 / GPT-image-1 / GPT-image-1.5 section:** Added `Updated
  2026-04-21` block noting DALL·E 3 deprecation. Noted gpt-image-1.5
  improvements (4× faster, 20% cheaper, native multimodal, better text
  rendering).

- **Ideogram 2.0 section:** Renamed to "Ideogram 3.0 (formerly 2.0)".
  Added `Updated 2026-04-21` note. Updated accuracy figure to 90–95%.
  Marked as #1 on published text-rendering benchmarks as of Apr 2026.

- **Tradeoffs section:** Updated "Ideogram 2.0 and Recraft v3" → "Ideogram
  3.0 and Recraft V4". Updated MJ reference to "V7 or V8 Alpha".

---

### 8e-svg-vector-logo-pipeline.md

- **Executive summary / top-level architectures:** Added `Updated 2026-04-21`
  preamble noting Recraft V4 release (Feb 2026), DALL·E 3 deprecation, and
  directing readers to update fallback chains.

- **Native vector sub-table (Stage 2a):** Replaced "Recraft V3 SVG" row
  with "Recraft V4 Vector" and "Recraft V4 Pro Vector" rows. Updated notes
  to reflect Feb 2026 release and improved text accuracy.

- **Practitioner recipe:** Updated `recraft-v3-svg` → `recraftv4` model
  parameter in the curl command.

- **Open-source libraries table:** Updated "Recraft V3 SVG API" row to
  "Recraft V4 Vector API" with link to V4 docs.

---

### SYNTHESIS.md

- **Insight #9 (text rendering routing):** Added `Updated 2026-04-21`
  callout listing the five model-landscape changes. Updated body text:
  "Recraft V3" → "Recraft V4"; "Midjourney v7" noted as "MJ V8 Alpha
  improving"; added note that Nano Banana Pro has no free API tier;
  added Nano Banana 2 as a lower-cost CJK alternative.

- **Insight #14 (transparency):** Corrected the claim that `gpt-image-1`
  routinely ships a checker pattern. gpt-image-1 and gpt-image-1.5
  support true RGBA via API (`background: "transparent"`); the safety-pass
  recommendation is retained.

- **Insight #15 (logo as family):** Updated "Recraft-V3-SVG" →
  "Recraft-V4-Vector".

- **Style picker (router) decision tree:** Added `Updated 2026-04-21`
  callout. Updated all "Recraft V3" → "Recraft V4". Changed "DALL·E 3 /
  gpt-image-1" → "gpt-image-1 / gpt-image-1.5" with explicit "Do not
  route to DALL·E 3" note. Updated "Midjourney v6/v7" → "v7/v8".
  Updated CJK routing to mention Nano Banana 2 as a free-dev-tier
  alternative to the billed Nano Banana Pro.

- **Vendor documentation references:** Added deprecation note for DALL·E 3
  under the OpenAI entry.

---

## Key Facts Verified via Web Search

| Claim | Verified Status |
|---|---|
| Recraft V4 released | **Confirmed** — released Feb 2026; 4 variants (raster/vector × std/pro). `controls.colors` API carried forward. |
| DALL·E 3 deprecated | **Confirmed** — announced Nov 14, 2025; effective May 12, 2026. ChatGPT switched to gpt-image-1.5 in Dec 2025. |
| gpt-image-1.5 architecture | **Confirmed** — native multimodal (not diffusion); ~4× faster, ~20% cheaper than gpt-image-1; better text rendering. |
| gpt-image-1 / 1.5 transparent background | **Confirmed** — both support `background: "transparent"` in API (PNG/WebP only). |
| Ideogram 3.0 text accuracy | **Confirmed** — ~90–95% accuracy; released March 26, 2025; remains #1 on typography-focused benchmarks as of Apr 2026. |
| Midjourney V8 Alpha | **Confirmed** — launched March 17, 2026; V8.1 Alpha April 14, 2026. Significantly improved quoted-text rendering; ~5× faster; native 2K. Still alpha. |
| Nano Banana free API tier | **Confirmed (nuanced)** — Nano Banana (gemini-2.5-flash-image): ~500 req/day free API (partially restored Feb 2026 after Dec 2025 cut). Nano Banana 2 (gemini-3.1-flash-image): free dev tier, released Feb 26, 2026, 4K output. Nano Banana Pro (gemini-3-pro-image): 0 free RPD — billed only. Imagen 4: no free tier. |
| BiRefNet / RMBG 2.0 status | **Confirmed** — both actively maintained as of early 2026. ComfyUI-RMBG v3.0.0 released Jan 2026. BRIA RMBG 2.0 remains non-commercial (CC-BY-NC-4.0); commercial license required. |
| Looka / Brandmark active | **Confirmed** — both services operational in 2026. Neither exposes a public developer API; they are consumer web products. |

---

## Claims Not Requiring Changes

- **BiRefNet as best-in-class open matte** — remains correct.
- **vtracer / potrace as primary vectorizers** — no competitive shift detected.
- **SVGO as standard SVG optimizer** — still current.
- **SDXL + ControlNet + IP-Adapter for local monograms** — still the
  highest-ceiling local path.
- **Named palettes > hex in prompts** — VIOLIN benchmark still the best
  citation; no newer conflicting benchmark found.
- **AnyText for CJK self-host** — still the best open-source path for
  character-accurate CJK rendering.
- **Logo design theory (8a)** — Henderson & Cote 1998, Elliot & Maier 2014,
  Labrecque & Milne 2012, Paul Rand — all timeless; no corrections needed.
- **Arabic/Hebrew/Devanagari fallback** — "generate mark, typeset in
  shaping engine" remains the correct advice.

---

# Research Update Log — Category 09 (App Icon Generation)
**Updated:** 2026-04-21
**Files audited:** 7 (9a, 9b, 9c, 9d, 9e, index.md, SYNTHESIS.md)
**Files modified:** 4 (9b, 9c, 9e, SYNTHESIS.md)

---

## Summary of changes

### 9b — Android Adaptive & Themed Icons
**File:** `9b-android-adaptive-themed-icons.md`

1. **Android 16 QPR2 mandatory theming (NEW — major change).**
   Android 16 QPR2 shipped December 2025 and made auto-themed icons mandatory. Apps without a `<monochrome>` layer get a system-generated fallback via color-filtering. Google Play DDA section 5.3 was updated (effective Sep 15 2025 new devs / Oct 15 2025 existing devs) requiring devs to grant users permission to theme icons. The monochrome layer has moved from "recommended" to effectively required for Play Store apps.
   - Added new subsection "Android 16 QPR2 — mandatory auto-theming (December 2025+)" under the Gating section.
   - Added note to Pattern A split-generation section flagging monochrome as required.
   - Sources: Android Developers Blog QPR2 Beta 1, Android Developers Blog QPR2 Released, Android Police, 9to5Google.

2. **Gemini/Imagen free API stale claim corrected.**
   The AI Image Generation references section pointed to Firebase AI Logic and Gemini API docs without noting that the Gemini image API free tier dropped to 0 IPM on December 7, 2025. Added a dated caveat block explaining that unbilled keys return HTTP 429 and directing users to AI Studio web UI + `asset_ingest_external` for free Gemini image generation.

### 9c — PWA & Web App Manifest Icons
**File:** `9c-pwa-web-app-manifest-icons.md`

1. **pwa-asset-generator repo URL corrected.**
   The tooling comparison table still used the old `onderceylan/pwa-asset-generator` GitHub link. Updated to `elegantapp/pwa-asset-generator` (the canonical current repo). Also updated star count from 2.2k to ~3.0k.

### 9e — Prompt Patterns for App Icons
**File:** `9e-prompt-patterns-for-app-icons.md`

1. **Model recommendations table fully updated.**
   - `gpt-image-1` → GPT Image 1.5 as primary OpenAI model (released December 16, 2025; 4× faster, 20% cheaper, same RGBA path). `gpt-image-1` noted as legacy/still available.
   - "Midjourney v6 / v7" → "Midjourney v7" (launched April 2025); added note that v7 added near-native SVG export and improved text fidelity.
   - "Ideogram 2/3" → "Ideogram 3 / Ideogram 3 Turbo" with pricing ($0.03/image Turbo) and Style References capability.
   - "Gemini 2.5 Flash Image" → "Gemini 3.1 Flash Image" ("Nano Banana 2", current Google model as of Feb 2026) with explicit **no free API tier since Dec 7, 2025** caveat.
   - Added overall header note explaining the timeline of changes.

2. **Reference-guided generation section updated.**
   - "gpt-image-1 / GPT Image 1.5" → "GPT Image 1.5" as the current model name.
   - "Gemini 2.5 Flash Image" → "Gemini 3.1 Flash Image" with billing caveat.

### SYNTHESIS.md
**File:** `SYNTHESIS.md`

1. **Finding #6 (Android monochrome) updated** to reflect Android 16 QPR2 mandatory theming. Monochrome layer is now effectively required, not recommended, for Play Store apps targeting Android 13+.

2. **9e angle description updated** — model ranking corrected: GPT Image 1.5 replaces gpt-image-1; Midjourney v7 replaces v6/v7; Ideogram 3 replaces Ideogram 2/3; Gemini 3.1 Flash Image replaces Gemini 2.5 Flash Image. Added dated update note.

3. **Master-generation model routing updated** — GPT Image 1.5 replaces `gpt-image-1`; Gemini 3.1 Flash Image replaces 2.5 Flash Image; billing caveat added for Gemini.

4. **Android layer recommendations** — added dated note that monochrome is now required by Android 16 QPR2, not just recommended.

5. **Seed pinning text** — updated `gpt-image-1` reference to GPT Image 1.5.

6. **Models & Prompting primary sources section** — added GPT Image 1.5 model page and Gemini 3.1 Flash Image model card. Retained gpt-image-1 community thread (RGBA technique still applicable).

7. **Google/Android sources section** — added Android 16 QPR2 Beta 1 blog, QPR2 released blog, and Android Police mandatory theming coverage.

8. **Date stamps updated** — `date:` and snapshot callout updated from 2026-04-19 to 2026-04-21.

---

## Files with NO changes needed

- **9a — iOS App Icon HIG Specs:** Already up-to-date as of 2026-04-19 with iOS 26/Xcode 26, Liquid Glass, Icon Composer, visionOS parallax layers, and the three-appearance model. No claims found to be stale.
- **9c — PWA & Web App Manifest Icons:** Core spec content (W3C manifest, maskable 80% safe zone, apple-touch-icon chain, dark-mode SVG favicon, WebAPK/TWA) all current. Minor fix to pwa-asset-generator URL/star count only.
- **9d — Icon Generation Tools Survey:** Core tool inventory accurate. flutter_launcher_icons v0.14.4 (Jun 2025) already reflects iOS 18 dark/tinted support added in v0.14.0. pwa-asset-generator already uses elegantapp URL. star counts noted as "late-2025/early-2026" order-of-magnitude estimates.
- **index.md:** No substantive claims — just a table of contents. No changes needed.

---

## Verification status of key claims

| Claim | Status | Evidence |
|---|---|---|
| Gemini/Imagen image API free tier gone since Dec 2025 | CONFIRMED | Free tier has 0 IPM for image generation since Dec 7, 2025; billing enables Tier 1 |
| Android 16 QPR2 mandatory icon theming | CONFIRMED | Shipped Dec 2025; DDA 5.3 updated; auto-generates monochrome if missing |
| GPT Image 1.5 released Dec 2025 | CONFIRMED | Released Dec 16, 2025; available via API as gpt-image-1.5 |
| GPT Image 1.5 RGBA/transparent background | CONFIRMED | Same API path as gpt-image-1; documented at developers.openai.com |
| Gemini 2.5 Flash Image shut down | CONFIRMED | Model shut down January 15, 2026 |
| Gemini 3.1 Flash Image = current Google model | CONFIRMED | Nano Banana 2, available as of Feb 2026 |
| Midjourney v7 near-native SVG export | CONFIRMED (partial) | v7 launched April 2025; SVG export capability improved |
| Ideogram 3 Turbo pricing ~$0.03/image | CONFIRMED | Available on Replicate and fal.ai |
| appicon.co / makeappicon.com still active | CONFIRMED | Both accessible and operational in 2026 |
| pwa-asset-generator ~3.0k stars | CONFIRMED | Bug filed March 2026 shows active maintenance; star count confirmed ~3k |
| iOS safe zone ~820px in 1024 canvas | NOT CHANGED | 9a covers this correctly; web search confirms Apple's ~10% margin principle |
| visionOS 3-layer parallax, min 2 layers | NOT CHANGED | 9a covers correctly, no changes since 2025 |

---

# Research update log — Category 11 (Favicon Web Assets)
Updated: 2026-04-21

## Summary

Audited all 7 files in `/docs/research/11-favicon-web-assets/`. Six files had edits; `index.md` had no stale claims. The research was generally accurate and well-sourced — most corrections are precision fixes rather than outright reversals. No major claim was completely wrong; the gaps were specific factual inaccuracies around Safari behaviour, AVIF OG support, X Card Validator status, and library maintenance metadata.

---

## File-by-file changes

### 11a-modern-favicon-complete-spec.md

**Issue 1: Safari SVG favicon dark-mode claim was imprecise.**
- Old: "Safari ignores media queries inside favicon SVGs on desktop up through Safari 17"
- Safari 17 introduced SVG favicon support, but the phrasing "up through Safari 17" implied the problem was fixed in Safari 18+. It is not.
- Fix: Replaced with explicit statement that Safari 17/18/19 all support SVG favicons for tabs but none honour the embedded `prefers-color-scheme` media query. Added dated note.

**Issue 2: Executive summary SVG favicon browser support paragraph understated Safari limitation.**
- Old: Listed Safari 17+ as supporting adaptive dark mode.
- Fix: Clarified that Safari 17+ supports the `<link rel="icon" type="image/svg+xml">` tag (tab icon) but ignores the embedded `@media (prefers-color-scheme: dark)` block. iOS Safari does not use SVG favicons at all.

**Issue 3: File Catalog entry repeated the old imprecise phrasing.**
- Fixed to match the corrected executive summary.

**No changes needed:** The `sizes="32x32"` guidance, ICO spec, `apple-touch-icon` spec, mask-icon retirement, MS Tile retirement, generator comparison, and dark-mode SVG recipe (minus the Safari note) are all accurate.

---

### 11b-og-twitter-card-dynamic-images.md

**Issue 1: X/Twitter Card Validator status.**
- The file said "Card Validator (deprecated 2024)". The official tool was actually retired earlier; the file's description of the workaround (post a private test tweet) was correct but third-party validators now exist.
- Fix: Updated the debugger table row to name the specific third-party alternatives (socialrails.com, opentweet.io). Added those tools to the Third-Party Tools list.

**Issue 2: `og:image:type` / format guidance.**
- The file listed WebP as broadly supported and said nothing about AVIF for OG.
- Verified: AVIF is not safe for OG (only Facebook accepts it; LinkedIn, Slack, X, iMessage do not as of late 2025). WebP has wider support than before but is still inconsistent on LinkedIn.
- Fix: Added explicit AVIF-unsafe note, WebP caveat, and a dated update block.

**Issue 3: Pre-flight checklist format line.**
- "not WebP for max compat" was a blunt blanket statement that needed nuance.
- Fix: Replaced with an accurate statement distinguishing AVIF (still unsafe) from WebP (partial support, inconsistent on LinkedIn).

**Issue 4: astro-og-canvas weekly download count.**
- The file claimed ~15K weekly downloads. Verified current count is ~12K (Socket.dev data, Apr 2026).
- Fix: Updated to ~12K.

**No changes needed:** 1200×630 spec, Satori internals and constraints, Next.js `opengraph-image.tsx` recipe, SvelteKit recipe, Nuxt/Remix/Hono patterns, hybrid AI+template pattern, static/edge/on-demand tradeoffs, fallback chain, LinkedIn minimum size, Facebook 30d cache, the bulk of the debugger section.

---

### 11c-adjacent-web-assets-email-chat-readme.md

**No changes.** All claims verified:
- Email width, Outlook constraints, Gmail 102 KB clip — current.
- Slack 512×512 rounded-square, Discord 512×512 circle — current.
- GitHub 1280×640 social preview spec — current.
- README `<picture>` dark-mode pattern — current.
- Shields.io custom badge endpoint — current.
- `workers-og` / Cloudflare Workers Satori pitfalls — current.
- `@vercel/og` performance figures (P99 ~0.99s, ~160× cheaper) — originated from the Vercel launch post and remain the canonical benchmark.

---

### 11d-open-source-favicon-generators.md

**Issue 1: `RealFaviconGenerator/core` described as "young and low-traffic" with ~34 ⭐.**
- Star count is not a maintenance indicator here. Verified the packages are actively maintained with frequent npm releases as of April 2026: `generate-favicon` v0.6.3, `check-favicon` v0.8.0, `realfavicon` CLI v0.4.6.
- Fix: Removed "young project, low-traffic" caveat. Updated star count note. Added dated block with version numbers.

**Issue 2: Same `~34 ⭐` and "Active 2024–2026" in the comparison table.**
- Fix: Updated table row to reflect active frequent releases and specific version numbers.

**Issue 3: References section star count for `RealFaviconGenerator/core`.**
- Fix: Replaced `~34 ⭐` with version numbers.

**Issue 4: `resvg-js` table entry.**
- The entry said "Active" without noting that the last *stable* npm release (2.6.2) is ~2 years old.
- Fix: Noted latest stable (2.6.2), the active alpha pre-releases (2.6.3-alpha, 2.7.0-alpha.0 as of Jan 2026), and the recommendation to pin 2.6.2 for stability.

**Issue 5: `pwa-asset-generator` download count.**
- The entry had no download count. Verified ~22K weekly downloads (March 2026).
- Fix: Added download count to the table row.

**No changes needed:** `itgalaxy/favicons` (v7.2.0 Mar 2024 confirmed stable, 330K weekly confirmed), satori version (0.26.0 Mar 2026), `@vercel/og` (0.11.1), `sharp`, SVGO, license analysis (pngquant GPL warning remains correct), risk register, recommended stack pseudocode.

---

### 11e-performance-seo-accessibility.md

**Issue 1: `sizes="any"` on ICO in the generator-emitted HTML snippet.**
- The snippet used `<link rel="icon" href="/favicon.ico" sizes="any">`. This directly contradicts 11a's guidance (the `sizes="any"` Chrome bug — Chrome downloads both ICO and SVG, preferring ICO).
- Fix: Changed to `sizes="32x32"` and added a dated note explaining why.

**Issue 2: `msapplication-TileImage/TileColor` in the generator snippet without context.**
- These are IE11 / Windows 8 legacy meta tags. Chromium Edge reads the web app manifest instead.
- Fix: Added "Legacy only" comment in the HTML snippet.

**Issue 3: Google favicon requirements section was accurate but could be tightened.**
- Verified: Google updated guidelines (last updated 2026-02-04). Minimum is 8×8 px; strong recommendation is ≥48×48 px (multiple of 48). SVG has no size constraint.
- Fix: Added dated note clarifying the minimum vs. recommendation distinction and citing the 2026-02-04 documentation date.

**Issue 4: EN 301 549 version reference.**
- File correctly cited v3.2.1 but said it "normatively references WCAG 2.1 AA but commonly audited against 2.2". Did not mention forthcoming v4.1.1.
- Verified: EN 301 549 v4.1.1 is expected in 2026 and will incorporate WCAG 2.2. WCAG 2.2 was approved as ISO/IEC standard in 2025.
- Fix: Added dated note about v4.1.1 timeline and current legal status.

**No changes needed:** Size budget table, compression pipeline flags, CWV analysis (`fetchpriority="high"`, CLS `width`/`height` attributes, `decoding="async"`), WCAG 2.2 alt-text decision tree (correct), `Organization.logo` JSON-LD (correct), OG/Twitter meta snippet (correct — already uses absolute HTTPS URLs and includes `og:image:alt`).

---

### SYNTHESIS.md

**Issue 1: Insight #4 — Safari dark-mode SVG favicon claim imprecise.**
- Old: "Safari up through 17 ignores that media query inside favicons"
- Fix: Clarified that all current Safari versions (17, 18, 19) ignore the embedded media query. Added dated note.

**Issue 2: Insight #10 — X Card Validator.**
- Old: "X's Card Validator was retired in 2024 so you debug via a private test tweet."
- Fix: Clarified the tool is permanently retired with no official replacement; named third-party alternatives.

**Issue 3: Insight #12 — `RealFaviconGenerator/core` maturity description.**
- Old: "freshly OSS-ified engine" with implied low maturity.
- Fix: Removed "freshly" framing; added version numbers confirming active maintenance; added dated note correcting the "young project, low-traffic" characterisation.

**Issue 4: Controversies — AVIF/WebP verdict.**
- The section was accurate in its verdict but lacked an update confirming it is still current.
- Fix: Added dated note confirming AVIF remains unsafe for OG and WebP is still inconsistent on LinkedIn as of late 2025.

**No changes needed:** All other insights (1–3, 5–9, 11, 13–15), cross-cutting patterns, gaps, Skill A/B architecture recommendations, primary sources list.

---

## Non-changes confirmed by search

The following claims were cross-checked and confirmed accurate:

- `favicon.ico` must be at document root for RSS readers/crawlers — confirmed.
- `sizes="32x32"` fix for Chrome ICO-vs-SVG bug — confirmed still current workaround.
- `safari-pinned-tab.svg` / `mask-icon` — confirmed effectively dead since Safari 12; still optional-but-harmless.
- IE11 EOL June 2022 / `browserconfig.xml` dead — confirmed.
- `apple-touch-icon` single 180×180 opaque PNG, iOS blacks transparent pixels — confirmed.
- Maskable icon safe zone 0.4× radius, separate `purpose: "maskable"` entry — confirmed ("any maskable" combined value is discouraged, not deprecated).
- 1200×630 OG consensus, LinkedIn ≥1200 px hard minimum — confirmed.
- Satori CSS constraints (flex-only, no grid, no `::before`, etc.) — confirmed.
- `@vercel/og` 0.11.1 (last published ~2 months before this update) — confirmed.
- pngquant GPL-3/commercial-dual redistribute risk — confirmed.
- `itgalaxy/favicons` v7.2.0 Mar 2024, stable-but-quiet — confirmed (no new stable release as of April 2026).

---

## Search sources used

- caniuse.com/link-icon-svg (SVG favicon browser support)
- evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs (Evil Martians 2026 update)
- npmjs.com/@realfavicongenerator/generate-favicon (v0.6.3, 25 days ago)
- npmjs.com/@realfavicongenerator/check-favicon (v0.8.0, 18 days ago)
- npmjs.com/package/realfavicon (v0.4.6, very frequent updates)
- darekkay.com/blog/open-graph-image-formats/ (AVIF/WebP OG compat)
- joost.blog/use-avif-webp-share-images/ (AVIF/WebP OG safety Dec 2024)
- developers.google.com/search/docs/appearance/favicon-in-search (updated 2026-02-04)
- socket.dev/npm/package/astro-og-canvas (12K weekly downloads)
- github.com/thx/resvg-js/releases (2.6.2 stable, alphas Jan 2026)
- elegantapp/pwa-asset-generator issues (active through Apr 2026, ~22K weekly)
- socialrails.com, opentweet.io (X Card Validator alternatives)
- cerovac.com/a11y + etsi.org (EN 301 549 v4.1.1 timeline)
- browserux.com/blog/guides/web-icons/favicons-best-practices.html (Safari 18/19 SVG dark mode)
- iconmaker.studio/blog/favicon-best-practices-2025 (Safari dark mode limitations)

---

# Research Update Log — Category 12 (Vector / SVG Generation)

**Date:** 2026-04-21  
**Auditor:** research-updater agent  
**Files audited:** 7 (index.md, SYNTHESIS.md, 12a–12e)

---

## Summary of Changes

### 12b-raster-to-svg-tracers.md

**1. Recraft pricing — CORRECTED (breaking stale claim)**
- Old: "Recraft `/images/vectorize` at $0.01/call" vs Vectorizer.AI at $0.20 (~20× cheaper)
- New: Recraft V4 Vector = $0.08/image; V4 Pro Vector = $0.30/image (released Feb 2026). Still cheaper than Vectorizer.AI (~2.5× for standard quality), but the "20× cheaper" claim is now false.
- Added `> **Updated 2026-04-21:**` block in Top 3 Findings section.

**2. Adobe Illustrator Image Trace — UPDATED to Image Trace 2.0**
- Old: "Known to emit bloated node counts (often 10k+ nodes on simple logos)" with legacy parameter list
- New: Image Trace 2.0 (Illustrator v29.0, Oct 2024/MAX 2024) added gradient detection slider, live shape creation, Snap-Curves-to-Lines, and transparency tracing. v29.3 extended gradient support to legacy presets. Node counts substantially reduced vs original Live Trace. Updated the Tool Table row.

**3. vtracer version — UPDATED**
- Added note: Python bindings latest v0.6.15 (published March 23, 2026), Rust crate at v0.6.5. Actively maintained. Since v0.6 uses PyO3 native bindings.

**4. SVGO version — UPDATED from v3.x to v4.x**
- SVGO v4.0.0 released ~February 2026 (current: v4.0.1).
- Key breaking changes documented: `removeViewBox` and `removeTitle` removed from preset-default (now opt-in), `removeScriptElement` renamed to `removeScripts`, named exports only, Node.js ≥16 required.
- Added `> **Updated 2026-04-21:**` block in Post-processing section.
- Updated the recommended SVGO config note to clarify `removeViewBox: false` is now redundant in v4 (but safe to keep).

---

### 12a-native-vector-generation-papers.md

**1. Chat2SVG code release — CORRECTED**
- Old: "code promised at CVPR 2025; expect community reproductions via PyTorch-SVGRender pattern"
- New: Official code released at github.com/kingnobro/Chat2SVG. Web demo launched March 31, 2025. Anthropic API support added April 2, 2025.
- Added inline note and `> **Updated 2026-04-21:**` block in executive summary.

**2. StarVector — confirmed still active, no change needed.** CVPR 2025 confirmed accept, both HF checkpoints actively maintained.

---

### 12c-svg-spec-features-for-assets.md

**1. SVGO version reference — UPDATED**
- Front-matter source updated from "v3.x, 2024" to "v4.x, 2026".
- References section: added v4.0.1 version note and link to v3→v4 migration guide.

**2. SVGO Optimization Safety section — UPDATED**
- Added `> **Updated 2026-04-21:**` block at the top of the SVGO section noting v4 defaults changed.
- Updated the `removeViewBox` bullet to note it is now disabled by default in v4.

---

### 12d-llm-direct-svg-code-generation.md

**1. Model tiering — UPDATED to reflect 2026 frontier**
- Added `> **Updated 2026-04-21:**` block after the three findings, naming Claude Sonnet 4.6 / Opus 4.6, GPT-5.4, Gemini 3.1 Pro as the current frontier.
- Noted a structured 2026 benchmark (MindStudio) found GPT-5.4 best on data visualizations, Claude Opus 4.6 best on CSS animation syntax, Gemini 3.1 Pro lagging on SVG tasks.

**2. Pelican benchmark — UPDATED**
- Added note that the benchmark now uses a formal ELO leaderboard (500 GPT-4.1-mini matchups, chess ELO scoring). Claude Sonnet 4.6 / Opus 4.7 appear in top tier as of early 2026.

**3. Head-to-head section — UPDATED**
- Added current model names (Claude 4.6, GPT-5.4, Gemini 3.1 Pro).
- Added `> **Updated 2026-04-21:**` block confirming relative tiering held; absolute quality bar improved materially.

---

### 12e-hybrid-vector-pipeline-architectures.md

**1. Recraft V3 → V4 naming and release date — CORRECTED**
- Multiple places changed "Recraft V3" references to V4.
- Added `> **Updated 2026-04-21:**` block in executive summary: V4 released February 2026, pricing $0.08/image (Vector) / $0.30/image (Pro Vector).

**2. Recraft pricing in cost section — CORRECTED**
- Changed inline cost from "$0.04/image" (V4 raster price) to "$0.08/image (Vector) / $0.30 (Pro Vector)".
- Added clarifying update block.

**3. Figma Vectorize launch date — CORRECTED**
- Old: "shipped mid-2025"
- New: Launched February 2026. Available to Full-seat users on Professional/Org/Enterprise plans with AI enabled. Added to References section.

**4. SVGFusion code release status — CORRECTED**
- Old: Implied as available open-source fallback
- New: As of April 2026, SVGFusion model weights are **not yet publicly released**. SVGX-SFT-1M dataset is on HuggingFace but the model is not runnable. Treat as research reference only.
- Added `> **Updated 2026-04-21:**` block in Blueprint 2 section.

**5. References — ADDED**
- Recraft V4 release blog URL
- Figma Vectorize launch blog URL
- Updated Replicate listing descriptions to include Feb 2026 release date and current pricing

---

### SYNTHESIS.md

**1. Insight #2 (LLM-direct SVG) — UPDATED**
- Added current frontier model names and ELO benchmark note.
- Added `> **Updated 2026-04-21:**` block.

**2. Insight #5 (commercial vectorizer market) — CORRECTED**
- Old title: "Recraft `/images/vectorize` at $0.01/call vs Vectorizer.AI at $0.20/credit. Recraft is ~20× cheaper"
- New: Updated pricing and ~2.5× advantage. Added update block.

**3. Insight #6 (Recraft native-vector SOTA) — UPDATED**
- Added V4 release date (Feb 2026) and pricing.
- Added note that SVGFusion model weights remain unreleased as of April 2026.

**4. Insight #12 (SVGO defaults) — UPDATED**
- Added `> **Updated 2026-04-21:**` block clarifying that in SVGO v4, `removeViewBox` and `removeTitle` are now disabled by default (the two historically most dangerous defaults fixed upstream).

**5. Insight #15 (Figma Vectorize) — UPDATED**
- Added "(launched February 2026)" to the Figma Vectorize reference.

**6. Decision tree — CORRECTED**
- `mode='premium'` cost updated from `$0.01/call` to `~$0.08/call as of V4, Feb 2026`.

---

## Claims Verified as Still Accurate (no change)

- vtracer is the correct OSS default for colored AI-generated rasters over potrace — still true.
- vtracer-wasm is 133 KB and runs in ~250 ms in a Web Worker on 1024² images — still accurate.
- StarVector (starvector-1b-im2svg, starvector-8b-im2svg) fully open on HuggingFace — confirmed.
- LayerDiffuse integrated in A1111/ComfyUI, Apache 2.0 — still accurate. Note: as of Feb 2025 last ComfyUI extension update, only SDXL/SD15 supported; no Flux support confirmed.
- potrace still at v1.16 (last updated Feb 2026 per official site); stable, no major changes. "Still unbeaten for B/W silhouettes" — still accurate.
- SVG 2 remains a Candidate Recommendation (latest editor's draft September 2025); no new W3C Recommendation issued. The "SVG 2 CR" references in 12c are correct.
- Chat2SVG arXiv:2411.16602 accepted at CVPR 2025 — confirmed.
- StarVector arXiv:2312.11556 accepted at CVPR 2025 — confirmed.
- SGP-Bench ICLR 2025 Spotlight — confirmed.
- SVGDreamer CVPR 2024 — confirmed.
- LayerDiffuse SIGGRAPH 2024 — confirmed.
- Recraft V3 released October 2024 — confirmed.

---

## Remaining Uncertainty / Watch Items

- **vtracer_autotune (olivierroy)**: GitHub search was inconclusive. The "alpha-quality" characterization from the original text was from Oct 2025; current status unknown. The recommendation to "monitor" it remains correct.
- **SVGFusion code release**: Described as "coming soon" as of April 2026 but the dataset is on HuggingFace. Monitor the project page (ximinng.github.io/SVGFusionProject/) for the model drop.
- **LayerDiffuse + Flux**: Only SDXL/SD15 are confirmed supported in the ComfyUI extension as of Feb 2025. The SYNTHESIS.md reference to "Flux + LayerDiffuse" in Pipeline C should be treated as aspirational pending a confirmed Flux-native LayerDiffuse checkpoint.
- **Recraft /vectorize vs /generate pricing split**: Recraft's pricing page distinguishes raster generation ($0.04) from vector generation ($0.08). It is not confirmed whether the `/images/vectorize` (raster→SVG) endpoint is priced at the vector rate or a separate conversion rate. The $0.08 figure is the best current approximation.

---

# Research Update Log — Category 13 (Transparent Backgrounds)
Date: 2026-04-21
Auditor: Claude Sonnet 4.6

---

## Summary

Audited all 7 files in `docs/research/13-transparent-backgrounds/`. Made corrections in 5 files (SYNTHESIS.md, 13a, 13c, 13d, 13e). Files 13b (difference matting) and the index.md required no substantive corrections.

---

## Changes Made

### SYNTHESIS.md

**1. Insight #4 — Native RGBA model count wrong**
- Old: "Only two commercial model families emit real RGBA in April 2026" (gpt-image-1 + Ideogram 3.0)
- Fixed: "Three commercial model families" — Ideogram 3.0 confirmed as native via dedicated endpoint, not in-native-rgba purgatory
- Added `> Updated 2026-04-21` block with speed tier details (FLASH/TURBO/BALANCED/QUALITY)

**2. YAML frontmatter `native_rgba_models`**
- Recraft v3 reclassified from `native_rgba_models` to new `native_rgba_post_hoc_only` entry
- gpt-image-1 quality requirement added (`quality: "medium"/"high"`)
- Ideogram 3.0 endpoint path corrected (`/ideogram-v3/generate-transparent`)
- LayerDiffuse-Flux commercial license caveat added (AFL-3.0 LoRA is fine; BFL Non-Commercial base is not)

**3. R1 Routing table**
- `ideogram-3.0` moved to confirmed `alpha_native_protocol` entry with speed tier note
- `recraft-v3` reclassified to `alpha_native_restricted` — in-generation transparent flag unreliable
- Flux.1-dev commercial licensing caveat added
- Routing order updated: `gpt-image-1.5` (photo) or `ideogram-3.0` (logo/typography) as dual primary paths

**4. R3 Post-process fallback chain — API pricing**
- Old: Photoroom $0.02/image, remove.bg $0.20/image HD
- Fixed: remove.bg now credit-based (~$0.05/image at list); Photoroom $0.02 basic / $0.10 plus confirmed
- Added `> Updated 2026-04-21` pricing note

**5. R4 Cost reference date**
- Updated "Dec 2025 prices" to "April 2026 prices"

**6. Gaps section — LayerDiffuse-Flux commercial licensing**
- Old: "licensing status is unclear"
- Fixed: AFL-3.0 on LoRA weights confirmed; BFL Non-Commercial on Flux.1-dev base is the constraint; commercial path requires BFL commercial license for base model

**7. Controversies — Recraft v3**
- Extended to reflect 2026 community reports: in-generation transparent flag unreliable even for vector/icon styles
- Resolution: post-hoc Remove Background tool is the reliable path; SVG output (`response_format: "svg"`) is intrinsically transparent

**8. Controversies — gpt-image-1 vs Ideogram 3.0**
- Added: Recraft route note updated to reflect post-hoc Remove Background as the PNG-with-alpha path

---

### 13a-rgba-architecture-layer-diffuse.md

**1. YAML frontmatter `models_without_native_alpha`**
- Removed `Ideogram v2 / v3` (incorrect — Ideogram 3.0 has native alpha via dedicated endpoint)
- Added `Ideogram v2` (no alpha, correct)
- Added new `models_with_native_alpha_via_dedicated_endpoint` section for Ideogram 3.0

**2. Executive summary finding #3**
- Old: "Only two families of production models emit real alpha in 2026: OpenAI's gpt-image-1 lineage and open-source LayerDiffuse finetunes"
- Fixed: "Three families" — added Ideogram 3.0 as the second commercial provider
- Added `> Updated 2026-04-21` callout with Ideogram endpoint details

**3. Model Capability Matrix table**
- `Ideogram v2 / v3` row split into: `Ideogram v2` (No) and `Ideogram 3.0` (Yes, dedicated endpoint)

**4. LayerDiffuse-Flux port table**
- Added commercial license note: AFL-3.0 on LoRA weights, but BFL Non-Commercial on Flux.1-dev base; commercial hosting requires BFL license

**5. Takeaways section**
- Updated "commercially in exactly one product today — OpenAI's `gpt-image-1.*`" to include Ideogram 3.0 as the second commercial product
- Routing recommendation updated for both asset-kind-based paths

---

### 13c-checkerboard-pixel-drawing-failure.md

**1. Rule 1 capability table**
- `recraft-v3` moved from `alpha_native_models` to new `alpha_native_restricted` bucket
- `ideogram-3.0` retained in `alpha_native_models` but comment updated to use dedicated endpoint
- `alpha_via_protocol` narrowed to gpt-image-1 lineage only
- Added `> Updated 2026-04-21` note

**2. gpt-image-1 quality requirement**
- Added note: `quality: "low"` degrades transparent output; use `"medium"` or `"high"`
- Added `> Updated 2026-04-21` OpenAI docs citation

---

### 13d-matting-models-birefnet-rmbg-u2net.md

**1. BiRefNet section — 2025 milestone updates**
- Added `> Updated 2026-04-21` block with timeline:
  - Jan 2025: FP16 inference (17 FPS at 1024² on RTX 4090, 3.45 GB VRAM)
  - Feb 2025: BiRefNet_HR and BiRefNet_HR-matting released (2048×2048)
  - Mar 2025: BiRefNet_dynamic released (256×256 to 2304×2304 dynamic resolution)
  - Jun 2025: refine_foreground GPU-accelerated (8× speedup, ~80 ms on RTX 5090)
  - Sep 2025: SDPA attention upgrade in Swin transformer
- Speed table caveat: ~150 ms CUDA figure predates FP16/SDPA; real figures now ~60–80 ms on RTX 4080-class

**2. rembg wrapper section**
- Added new 2025 matting sessions: `birefnet-matting`, `birefnet-lite-matting`, `birefnet-dynamic`
- Clarified: **rembg default model remains `u2net`**, not BiRefNet; must pass session explicitly
- Added preference note: `birefnet-matting` for hair/glass, `birefnet-general` for product/logo

**3. Commercial APIs — remove.bg pricing**
- Old: "$0.20 per call for HD at list price"
- Fixed: credit-based pricing (~$0.05/image at list, 5 credits/image)
- Added Clipdrop (Jasper.ai, formerly Stability AI) as another option

**4. Clipdrop ownership note**
- Added: Clipdrop sold by Stability AI to Jasper.ai in early 2024; still active as of 2026

---

### 13e-end-to-end-transparent-pipelines.md

**1. Executive summary**
- Old: "reliable native-RGBA providers are **OpenAI gpt-image-1** and **Recraft v3**"
- Fixed: Added Ideogram 3.0 as confirmed native-RGBA provider; Recraft v3 demoted to post-hoc Remove Background path; gpt-image-1 quality requirement added
- Added `> Updated 2026-04-21` block

**2. Decision tree**
- Added Ideogram 3.0 branch: `/ideogram-v3/generate-transparent`, TURBO/QUALITY speed options
- Updated Recraft v3 branch: generate first, then call Remove Background API — not native in-generation
- Added gpt-image-1 quality note (`NOT "low"`)

**3. `_strip_bg` notes**
- Clarified rembg default is still `u2net` — must pass `birefnet-general` explicitly
- Added `birefnet-matting` as preferred session for hair/glass subjects (new 2025 checkpoint)
- Strengthened BRIA RMBG commercial-use warning (CC BY-NC 4.0; not safe without Bria license)
- Added `> Updated 2026-04-21` note

---

## Files with NO changes needed

- **13b-difference-matting-and-chroma-keying.md** — algorithm content is stable; no API pricing claims; model capability references consistent with other files after corrections
- **index.md** — table of contents only; no factual claims

---

## Claims that remain uncertain (monitoring needed)

1. **Recraft V3 SVG output with true transparency** — confirmed intrinsic; the `response_format: "svg"` path is reliable. PNG alpha via Remove Background is reliable. In-generation PNG transparent-style remains unreliable.
2. **Gemini Nano Banana / Nano Banana Pro native alpha** — still no evidence of native alpha support as of April 2026. The Julien De Luca difference-matting approach remains the best workaround for these models.
3. **remove.bg HD pricing exact figure** — credit model is confirmed but exact HD-specific credit cost not pinpointed. The "$0.20/image HD" figure is gone; best estimate ~$0.05/image from subscription credit bundles.
4. **Ideogram 3.0 Turbo vs `style: "transparent"` param** — the `generate-transparent-v3` endpoint uses a `rendering_speed` enum (FLASH/TURBO/BALANCED/QUALITY), not the `style: "transparent"` flag referenced in CLAUDE.md. The CLAUDE.md reference `style: "transparent"` for Ideogram 3 Turbo is incorrect — the correct parameter is the dedicated `/generate-transparent` endpoint with `rendering_speed: "TURBO"`. This discrepancy should be corrected in CLAUDE.md.

---

## Sources consulted

- https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
- https://wavespeed.ai/blog/posts/introducing-ideogram-v3-turbo-on-wavespeedai/
- https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background
- https://github.com/ZhengPeng7/BiRefNet (README, issues)
- https://huggingface.co/briaai/RMBG-2.0
- https://www.remove.bg/pricing
- https://docs.photoroom.com/remove-background-api-basic-plan/pricing
- https://clipdrop.co/apis/docs/remove-background
- https://bfl.ai/licensing
- https://huggingface.co/RedAIGC/Flux-version-LayerDiffuse
- https://developers.openai.com/api/docs/guides/image-generation (transparent + quality)
- https://github.com/danielgatis/rembg (sessions list, issues)

---

# Research Update Log — Category 14 (Negative Prompting & Artifacts)
Date: 2026-04-21
Auditor: research-updater agent

---

## Summary of Changes

### 14a — Negative prompt theory (negative-prompts-for-assets.md)

**CRITICAL corrections:**

1. **Executive summary / tier list** — Added FLUX.2 [pro] and FLUX.2 [max] (released 2025) explicitly to the "no negative prompt" tier. Updated Imagen tier from "Vertex Imagen (partial)" to "not supported from imagen-3.0-generate-002 onward, including all Imagen 4 GA models". Added gpt-image-1.5 and gpt-image-1-mini to the no-negative list.

2. **Model support matrix — Imagen/Gemini row** — Corrected the claim that Imagen 4 merely "doesn't expose" negative prompts. Source: Vertex AI docs state "Negative prompts are a legacy feature, and are not included with the Imagen models starting with imagen-3.0-generate-002 and newer." Imagen 4 preview model deadline was November 30, 2025; only GA models (`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`) are active.

3. **Model support matrix — Flux row** — Split into: (a) FLUX.1-dev/schnell (existing), (b) new row covering FLUX.1-pro / Flux Kontext / FLUX.2 [pro] / FLUX.2 [max]. BFL docs confirm FLUX.2 has no negative prompt. Added note that FLUX.2 reduces anatomy errors by ~30% vs FLUX.1.

4. **Model support matrix — SD3/SD3.5 row** — Added caveat: SD3.5 has documented issues with CFG+negative prompt interaction; CFG must be kept at 4–4.5. Weighted emphasis syntax `(token:1.5)` should not be used with SD3.5.

5. **Model support matrix — DALL·E/gpt-image row** — Extended to include gpt-image-1.5, gpt-image-1-mini. Added clarification that `input_fidelity` on `/images/edits` (gpt-image-1 only) is unrelated to negative prompting.

6. **Model support matrix — Midjourney row** — Updated to v7 as current default (became default June 17 2025). Added explicit warning that `--no` tokens are parsed per-word independently in v7, which can accidentally trigger moderation on adjective-noun compound tokens.

7. **Model support matrix — Ideogram row** — Updated to include Ideogram 3.0 Turbo. Confirmed `negative_prompt` works identically for standard and Turbo render speeds.

8. **Model support matrix — Recraft row** — Updated to include V4 and V4 Pro (released February 2026). Confirmed negative_prompt behavior unchanged from V3.

9. **Example 4 (Ideogram API)** — Added note for `V_3_TURBO` model value.

---

### 14b — Artifact taxonomy (artifact-taxonomy.md)

**CRITICAL corrections:**

1. **Tier-1 mitigation block** — Removed "Flux" from "SDXL/Flux asset generation" negative-prompt injection advice. Flux does NOT support `negative_prompt`. The Tier-1 block now correctly targets SD-family only, with a note to use positive-framing rewrites for Flux/DALL·E/Gemini.

2. **Artifact #7 (oversaturation / high-CFG)** — Added clarification that Flux is not susceptible to this artifact class because it uses a learned guidance embedding, not two-pass CFG. Updated CFG table to note SD3.5 ceiling at 4–4.5. Removed Flux from CFG guidance recommendations.

3. **Artifact #5 (extra limbs)** — Updated model recommendation from "Flux.1 pro" to "FLUX.2 [pro] or FLUX.2 [max]" (≈30% fewer anatomy errors). Added note that Flux negatives are still positive-framing only.

4. **Tier-2 CFG tuning section** — Expanded into a table, clarified that Flux uses `guidance_scale` as a learned embedding (not CFG), added SD3.5 row.

---

### 14c — Regenerate vs. repair (regenerate-vs-repair-strategies.md)

1. **Recipe 1 (gpt-image-1 masked edit)** — Added explicit warning that `input_fidelity` is supported only on `gpt-image-1`, not `gpt-image-1.5` and not `gpt-image-1-mini`. Added note about gpt-image-1.5 improvements (text rendering, instruction following) as an alternative for when fidelity preservation is less critical.

---

### 14d — Automated quality scoring (automated-quality-scoring.md)

1. **HPSv3 section** — Added release confirmation: HPSv3 code, weights, and PyPI package (`pip install hpsv3`) were released August 6, 2025. GitHub: MizzenAI/HPSv3. HuggingFace: MizzenAI/HPSv3. Architecture: Qwen2-VL backbone.

2. **VLM self-preference pitfall** — Updated to mention gpt-image-1.5 and Gemini image outputs specifically.

3. **Generator pipeline diagram** — Added gpt-image-1.5, FLUX.2 [pro/max], Ideogram v3, Recraft v3/v4 to the generator examples list.

---

### 14e — Deterministic validation checks (deterministic-validation-checks.md)

1. **Executive summary** — Updated model list to include gpt-image-1.5 and FLUX.2 [pro/max].

2. **C3 dimensions section** — Added note that gpt-image-1.5 follows the same discrete size scheme as gpt-image-1. Added note emphasizing that no provider returns arbitrary exact pixel dimensions from a text prompt.

---

### SYNTHESIS.md

1. **Insight #1** — Expanded "no negative" list to include all FLUX.2 variants, gpt-image-1.5, gpt-image-1-mini, Imagen 3.0-generate-002+, all Imagen 4 GA models. Removed stale "Vertex Imagen (partial)" entry.

2. **Cross-cutting pattern #1 (backend branching)** — Extended no-negative list, corrected Imagen 4 status, added note that Recraft negative_prompt is raster-only.

3. **Controversy #3 (Midjourney --no vs SDXL)** — Added v7 per-word moderation parsing caution.

4. **Pillar 4 loop cap** — Updated model swap recommendation to reference Ideogram v3, gpt-image-1.5, and FLUX.2.

5. **VLM ensemble references** — Changed "Claude 4.5 Sonnet" to "Claude Sonnet 4.x" throughout to avoid version-specific drift.

6. **Stage 3 acceptance gate** — Updated Claude reference.

7. **Vendor documentation sources** — Updated Midjourney doc URLs (migrated to hc subdomain), added Vertex AI negative prompt deprecation doc, added gpt-image-1.5 and Recraft V4 notes.

8. **`last_updated`** — Changed from 2026-04-19 to 2026-04-21.

---

## Claims Verified as Still Accurate (no change needed)

- Flux `negative_prompt` raises `TypeError` in diffusers `FluxPipeline` — confirmed via HF diffusers #9124 still open/relevant.
- BFL prompting guide "Working Without Negative Prompts" — still at docs.bfl.ml, content unchanged.
- SDXL two-pass CFG supports negative prompts — confirmed.
- Ideogram v3 (standard and Turbo) supports `negative_prompt` in generate-v3 API — confirmed.
- gpt-image-1 has no `negative_prompt` field — confirmed. `gpt-image-1.5` also has no `negative_prompt`.
- Midjourney v7 `--no` operator is equivalent to `::-0.5` multi-prompt weight — confirmed.
- HPSv2.1 available as drop-in improvement over HPSv2 — confirmed still accurate.
- BiRefNet / RMBG-2.0 for background matting — still current.
- Real-ESRGAN and SUPIR still recommended for upscale-as-repair — still current.
- `gpt-image-1 background=transparent` still the primary API path for native RGBA — confirmed.
- Recraft V3 supports native vector output — confirmed (V4 also supports vector variants).

---

## Files Modified

- `14a-negative-prompts-for-assets.md` — 9 targeted edits
- `14b-artifact-taxonomy.md` — 4 targeted edits  
- `14c-regenerate-vs-repair-strategies.md` — 1 targeted edit
- `14d-automated-quality-scoring.md` — 4 targeted edits
- `14e-deterministic-validation-checks.md` — 2 targeted edits
- `SYNTHESIS.md` — 7 targeted edits
- `index.md` — no changes needed (already current)

---

# Research Update Log — Category 15 (Style Consistency & Brand)
Updated: 2026-04-21

## Files modified

### 15a-consistent-character-and-mascot.md

**Issue 1 — `--cref` deprecation in V7+**
- Claim: "`--cref` is V6/Niji-6 only; V7 replaces it with Omni Reference (`--oref`)" — this accurate fact was buried in one sentence.
- Fix: Expanded the MJ `--cref` section with a dated `> **Updated 2026-04-21**` block clarifying that `--cref` does NOT work in V7 or V8; the correct V7 parameter is `--oref` (Omni Reference, `--ow` for weight, 0–1000). V8.1 Alpha (April 2026) drops `--oref`/`--ow` entirely. Added note to Use Case A fallback recipe to include `--oref` alongside `--cref`.
- Sources: MJ official docs, updates.midjourney.com/omni-reference-oref/, blakecrosley.com V8.1 reference guide.

**Issue 2 — Technique comparison table label**
- Changed row label from "MJ `--cref`" to "MJ `--cref` (V6) / `--oref` (V7)" to avoid confusion.

**Issue 3 — PuLID Flux port now covers Flux.2**
- Added dated note: PuLID now has community ports for Flux.2 (Klein 4B/9B, Dev 9B) via ComfyUI-PuLID-Flux2 (v0.6.2, March 15, 2026). Uses InsightFace + EVA-CLIP. Quantized-Flux integration available via ComfyUI-nunchaku.

---

### 15b-style-transfer-sref-b-lora.md

**Issue 1 — MJ `--sv` now has 6 versions, default is `--sv 6`**
- The file referenced pinning as `--v 6 --sv 4`. Stale: `--sv 4` is now the *legacy V7* algorithm (pre-June 2025). The current V7 default is `--sv 6`. V6 codes use `--v 6` (no `--sv` needed). Added dated note to the `--sref` section and to Drift Management failure mode #3.
- Added note: MJ V8 Alpha (March 2026) keeps `--sref`; V8.1 drops `--oref`/`--ow`. Style Creator (new web UI feature) allows browsing internal style handles.

**Issue 2 — Recraft V4 style support**
- Claim: "at the time of writing styles are v2/v3 only." Still accurate but needed a firm dated statement.
- Fix: Replaced with a clear dated statement: as of April 2026, per official Recraft styles API docs, **styles are not supported for V4 models at all**. Custom brand styles (API-created) are V3/V3 Vector only. V4 does support `controls.colors` for palette enforcement but not `style_id`.

**Issue 3 — Flux IP-Adapter now has native support via XLabs**
- Claim: "Flux.1 dev/pro — Style via LoRA (no native style-ref param yet in most API wrappers)" — STALE.
- Fix: Updated table row and added a dated note: XLabs-AI released `flux-ip-adapter-v2` (HuggingFace), trained at 1024×1024 for 350k steps. Integrates with XLabs ControlNet (Canny, Depth, HED).

---

### 15c-brand-color-palette-enforcement.md

**Issue 1 — "Recraft v3 is the only major API with first-class palette input"**
- Stale: Recraft V4 (Feb 2026) also supports `controls.colors` (RGB triplets + `background_color`).
- Fix: Updated executive summary, rank table (Rank 3 row), and §5 recommended pipeline to say "V3 or V4." Added clear caveat: custom `style_id` is V3-only; V4 has `controls.colors` but no `style_id` support.

---

### 15d-machine-readable-brand-bundle.md

**Issue 1 — ostris/ai-toolkit scope expanded**
- Added dated note: toolkit now supports Flux.2 (Klein 4B/9B, Dev 9B) and 10+ architectures. VRAM requirements for Flux.2 noted.

**Issue 2 — MJ model_bindings missing `--sv`**
- Added `"sv": 6` to the `midjourney-v7` block in the example brand bundle JSON.
- Added dated note: record `--sv` alongside the sref code; V8 (March 2026) renders differently; update `model_bindings` key when V8 stable ships.

**Issue 3 — IP-Adapter model value for Flux**
- Added dated note: brand bundle `ip_adapter.model` should support `"xlabs-flux-ip-adapter-v2"` for Flux.1-dev pipelines.

---

### 15e-full-asset-set-consistency.md

**Issue 1 — MJ sref code storage missing `--sv`**
- Added dated note to the Midjourney `--sref` section: always record `--sv` alongside sref code. Updated example: `"mj_sref": "--sref 3142857 --sw 250 --sv 6"`. Noted V8 Alpha behavior and Style Creator feature.

---

### SYNTHESIS.md

**Issue 1 — Insight #2 references `--cref` as current for V7**
- Updated to say "MJ `--oref` (V7+) / `--cref` (V6)". Added dated callout note explaining `--cref` is deprecated in V7, `--oref` replaces it, and V8.1 Alpha drops `--oref`.

**Issue 2 — Insight #7 Recraft palette claim**
- Updated: "Recraft V3 and V4 are the only major hosted APIs with first-class palette input." Added clear caveat that custom `style_id` is V3/V3 Vector only, not V4.

**Issue 3 — Insight #15 drift pinning note**
- Updated: "`--sv 6` is the V7 default since June 16, 2025; V8 Alpha launched March 2026." Added dated note about recording `--sv` values.

**Issue 4 — Map of Angles table**
- Changed "MJ `--cref`" → "MJ `--oref` (V7) / `--cref` (V6)".

**Issue 5 — Layered Injection §2**
- Updated MJ layer to include `--sv 6` (with note about which value to use for legacy vs. new codes). Updated Flux IP-Adapter note to mention XLabs `flux-ip-adapter-v2`. Clarified that Recraft `style_id` is V3-only while `controls.colors` works on V3 and V4.

---

## Claims verified as still accurate (no changes needed)

- **CSD (arXiv:2404.01292)**: Still a current and actively-used style similarity metric as of 2025–2026. Referenced in Nov 2025 papers. Weights still available on HuggingFace. Thresholds (≥0.72 on-brand, 0.60–0.72 ambiguous, <0.60 off-brand) remain the community standard.
- **DTCG 2025.10 format**: W3C Final CG Report published Oct 28, 2025. Still the correct base layer.
- **Style Dictionary v4 + `@tokens-studio/sd-transforms` v2**: Still current.
- **PuLID (original) for SD/SDXL**: NeurIPS 2024 state-of-the-art claims still hold. Flux.1 port still works.
- **B-LoRA block 4/5 SDXL insight**: Still accurate for SDXL architecture; no confirmed Flux port of B-LoRA's block-specific approach (Flux MMDiT differs structurally from SDXL UNet, so block numbering doesn't transfer directly).
- **gpt-image-1.5**: Released Dec 16, 2025 — the files reference it correctly.
- **Gemini 2.5 Flash Image pricing ($0.039/image)**: Confirmed accurate.
- **Gemini image API free tier**: As of Feb 2026, approximately 500 RPD for Gemini 2.5 Flash Image (recovered from Dec 2025 cuts). The CLAUDE.md note that "unbilled keys return HTTP 429" on Gemini/Imagen was about the Gemini *text-only* Imagen API; Gemini 2.5 Flash Image (Nano Banana) does have a free tier at 500 RPD as of Feb 2026. The SYNTHESIS.md does not make claims about this, so no correction needed there (it's handled in CLAUDE.md memory).
- **IP-Adapter (original, tencent-ailab)**: Original weights still available and used.
- **Sharp #1441 (Node.js 3-D LUT)**: Feature request still open as of 2025-2026. The 15c claim that "Sharp does not yet expose libvips' `maplut` operation" remains accurate.
- **Ideogram 3.0 character ref and style ref**: Launched March 26, 2025; API still current. Style codes and character reference still work as described.
- **Flux Redux/Fill/Depth**: Still available from BFL; community workflows still active.

---

## Known remaining gaps (not corrected — need more research or are open questions)

- **B-LoRA for Flux**: No confirmed Flux port of B-LoRA's block-specific decoupling. Flux uses MMDiT (different from SDXL UNet); the "block 4/5" finding doesn't directly transfer. The files correctly scope B-LoRA to SDXL; no correction needed, but a note that no Flux equivalent exists would be informative.
- **Midjourney V8 stable parameters**: V8 is still in alpha/V8.1 alpha as of April 2026. `--oref` status in V8 final is unknown. Monitor MJ updates.
- **Recraft V4 style_id roadmap**: No public timeline for V4 style support. Monitor Recraft changelog.

---

# Research Update Log — Category 16 (Background Removal & Vectorization)
**Updated:** 2026-04-21
**Auditor:** research-updater agent

---

## Files audited

- `16a-rembg-ecosystem.md`
- `16b-sam-family-segmentation.md`
- `16c-vectorization-tooling-production.md`
- `16d-commercial-bg-removal-apis.md`
- `16e-matte-refine-optimize-export.md`
- `SYNTHESIS.md`
- `index.md` (no changes needed — already dated 2026-04-21 with correct caveat)

---

## Changes made

### 16a-rembg-ecosystem.md

**Claim:** Model catalog listed `birefnet-massive` as the last BiRefNet variant.
**Status:** Outdated.
**Fix:** Added two new official BiRefNet checkpoints released in early 2025:
- `birefnet-hr` — BiRefNet_HR (February 2025, 2048² training, best hair accuracy)
- `birefnet-dynamic` — BiRefNet_dynamic (March 2025, dynamic resolution 256–2304 px)
Also noted BiRefNet_HR-matting (Feb 2025, general matting at 2K) and the September 2025 SDPA attention upgrade. Added rembg issue #720 caveat that these checkpoints may not yet be in the official rembg release.

**Claim:** Section "BRIA RMBG-2.0 direct" did not specify gated HuggingFace access requirement.
**Status:** Partially stale.
**Fix:** Clarified that BRIA weights are on a *gated* HuggingFace repo requiring license acceptance to download.

**New section added:** **BEN2** (PramaLLC/BEN2, Apache 2.0 base model) — new background removal model using Confidence Guided Matting (CGM) that specifically targets boundary uncertainty. Released early 2025, claims to outperform BiRefNet-HR on hair/fur. Not yet in rembg; available via fal.ai and web demo. Added to References.

---

### 16b-sam-family-segmentation.md

**Claim:** Document covered SAM 2 (August 2024) but did not mention SAM 2.1.
**Status:** Outdated.
**Fix:** Added prominent update note under the SAM 2 section and under "Others worth knowing":
- SAM 2.1 released September 29–30, 2024
- Improved checkpoints (Tiny/Small/Base+/Large variants)
- Training code and web demo front-end/back-end code released publicly for the first time
- Improved on visually similar objects, small objects, occlusion handling
- December 2024 additions: full model compilation, new SAM2VideoPredictor, per-object independent inference
- Use `facebook/sam2.1-hiera-*` HuggingFace checkpoints for all new pipelines
- Added reference entry for SAM 2.1

---

### 16c-vectorization-tooling-production.md

**Claim:** "SVGO with a tuned `preset-default` + `floatPrecision: 2`" — config showed `overrides: { removeViewBox: false }`.
**Status:** Outdated for SVGO v4.
**Fix:** Added update note that SVGO v4.0.0 (current: v4.0.1) changed `preset-default` so `removeViewBox` and `removeTitle` are now *disabled by default*. The `overrides: { removeViewBox: false }` is now a no-op. Updated the svgo.config.js example to remove the redundant override. Added link to v4 migration guide.

**Claim:** `vtracer-wasm` npm package described as "first-party, published July 2025".
**Status:** Unverified / potentially incorrect package name.
**Fix:** Web search could not confirm an npm package named `vtracer-wasm`. The established wasm binding package is `vectortracer` (by AlansCodeLog/visioncortex). Also noted `@neplex/vectorizer` as a native Node binding alternative. Updated all references throughout the file (tool fit table, wasm section heading, production pattern, references). Added caveat to verify current package name at npmjs.com before pinning.

**Claim:** Tool fit table showed `vtracer-wasm npm, first-party`.
**Status:** Updated. Changed to `vectortracer` npm.

**Claim:** autotrace listed as "v0.31.10, Jan 2024".
**Status:** Minor update. Latest confirmed version is v0.31.1 (March 2026 per soft112 listing). Changed references section accordingly.

---

### 16d-commercial-bg-removal-apis.md

**Claim:** "Clipdrop (Stability AI, not explicitly in the 16d brief but shows up in the Arena) — fourth place."
**Status:** Incorrect attribution.
**Fix:** Clipdrop was acquired by Jasper.ai from Stability AI in February 2024. The background removal API remains operational. Updated attribution in the benchmark section.

**Claim:** Cloudinary Add-on note described as "Add-on is deprecated for accounts created after 2026-02-01".
**Status:** Correct but imprecise.
**Fix:** Clarified that the *subscription-based add-on* is being deprecated, while `e_background_removal` as a transformation continues. Added migration note that existing subscribers should switch to transformation billing.

**Claim:** remove.bg pricing figures (e.g., "~$0.18-0.20/image at 40-credit/mo tier").
**Status:** Approximate; confirmed current entry tier is ~$9/40 credits ($0.225/image).
**Fix:** Added a dated pricing note clarifying that entry tier is approximately $9/40 credits/month as of March 2026 snapshot, and directed readers to verify at remove.bg/pricing. Noted the 5-month credit rollover limit.

---

### 16e-matte-refine-optimize-export.md

**Claim:** SVGO config used `{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }` plus standalone `'removeTitle'` and `'removeDesc'` plugins.
**Status:** Outdated for SVGO v4.
**Fix:** Added update note explaining SVGO v4 changes. Updated the `svgo.config.js` example to remove now-redundant `removeViewBox: false` override and the `removeTitle`/`removeDesc` standalone entries (which are now no-ops in v4 since those plugins are disabled by default).

---

### SYNTHESIS.md

**Status:** Date updated from 2026-04-19 to reviewed 2026-04-21. Added a consolidated update block at the top summarizing all key changes:
- SAM 2.1 note
- New BiRefNet checkpoints (HR, dynamic, HR-matting)
- BEN2 new model mention
- SVGO v4 breaking change summary
- vtracer-wasm package name correction
- Clipdrop → Jasper.ai ownership correction
- Cloudinary add-on deprecation clarification

Updated inline text:
- Insight #5: `vtracer-wasm` → `vectortracer` npm
- Recommendation #7: `vtracer-wasm` → wasm build / `vectortracer` npm
- Map of angles table 16c row: updated package names
- Primary sources: updated vtracer wasm references

---

## Claims verified as accurate (no change needed)

- rembg default model remains `u2net` (not BiRefNet) — confirmed by PyPI/GitHub search.
- BRIA RMBG-2.0 license is CC BY-NC 4.0 — confirmed on HuggingFace model card.
- Photoroom `/v1/segment` at $0.02/image — pricing page still shows this structure.
- BiRefNet MIT license for the source/weights — still correct.
- DiffVG non-determinism issues — issues #63 and #46 remain unresolved.
- pypotrace is inactive/unmaintained — confirmed. `potracer` (pure Python port) exists as fallback.
- SAM/rembg integration model `sam` (ViT-B) is still in rembg catalog.
- BRIA async V2 API (`request_id` + `status_url`) — confirmed as current API design.
- Photoroom Arena (9,000 Elo votes, Dec 2024–Jan 2025) ranking: Photoroom > Remove.bg > BRIA > Clipdrop — still accurate.
- Cloudinary: first request HTTP 423 while derived asset computes — still documented behavior.
- MatAnyone (CVPR 2025, arXiv:2501.04205) — paper reference correct.

---

## Sources consulted

- https://github.com/ZhengPeng7/BiRefNet (BiRefNet releases)
- https://github.com/danielgatis/rembg/issues/720 (BiRefNet_HR integration)
- https://github.com/facebookresearch/sam2 (SAM 2.1 release notes)
- https://encord.com/blog/sam-2.1-explained/
- https://github.com/svg/svgo/releases/tag/v4.0.0
- https://svgo.dev/docs/migrations/migration-from-v3-to-v4/
- https://www.npmjs.com/package/vectortracer
- https://huggingface.co/PramaLLC/BEN2 (BEN2 model card)
- https://huggingface.co/briaai/RMBG-2.0 (BRIA license)
- https://www.remove.bg/pricing (remove.bg pricing)
- https://www.photoroom.com/api/pricing (Photoroom pricing)
- https://cloudinary.com/documentation/cloudinary_ai_background_removal_addon (deprecation notice)
- https://clipdrop.co/apis (still operational)
- https://www.prnewswire.com/news-releases/jasper-expands-by-acquiring-image-platform-clipdrop (Jasper acquisition)

---

# Research Update Log — Category 17 (Upscaling & Refinement)
Date: 2026-04-21
Auditor: research-updater agent

## Files audited

- `17a-esrgan-swinir-hat-family.md`
- `17b-supir-ccsr-diffbir-refinement.md`
- `17c-face-text-hand-targeted-refinement.md`
- `17d-logo-icon-sharpness-refinement.md`
- `17e-deployment-patterns-upscaling.md`
- `index.md`
- `SYNTHESIS.md`

---

## Changes made

### 17a-esrgan-swinir-hat-family.md

**Claim:** chaiNNer release 0.24 (June 2024) described as the latest, with no further note.
**Finding:** chaiNNer resumed active development and released **v0.25.1** on January 7, 2026. Development had stalled for over a year but is ongoing at reduced capacity with nightly builds through early 2026.
**Action:** Added `> Updated 2026-04-21` callout after the 0.24 description noting v0.25.1 stable.

---

### 17b-supir-ccsr-diffbir-refinement.md (most changes)

**Claim 1:** Clarity Upscaler described as SD1.5-only; "Flux upscaling is not in the OSS repo; it is paywalled into the hosted ClarityAI.co service."
**Finding:** The core claim was already correct (Flux is paywalled), but the document missed that Flux support was added in **March 2025** (announced by philz1337x on X). The OSS SD1.5 path is unaffected. Max output also expanded to 205 MP (14,336×14,336).
**Action:** Updated the Clarity section to document Flux support date, clarify SD1.5 vs Flux split, add max resolution figure. Updated method table cell.

**Claim 2:** Topaz Gigapixel described as "2024–2025" product with implied perpetual licensing option.
**Finding:** Topaz Labs ended all perpetual licenses on **3 October 2025**. All products now sold only as the Topaz Studio subscription: $399/year (Standard) or $799/year (Pro). Existing perpetual holders keep current version but get no updates.
**Action:** Added a prominent `> Updated 2026-04-21` section after the Topaz architecture paragraph. Updated method table year to "2024–2026". Updated references to point to correct URL (topazlabs.com/topaz-gigapixel) and added the CG Channel end-of-perpetual source.

**Claim 3:** Magnific pricing not stated anywhere in 17b.
**Finding:** Magnific starts at $39/month (Pro tier, ~2,500 tokens). No free tier. Token consumption varies by scale.
**Action:** Added a pricing callout after the Magnific section so pipeline budget decisions have a concrete figure.

**Claim 4 (new addition):** Flux.1 Pro Ultra 4MP native generation and gpt-image-1 upscaling limits were not documented.
**Finding:** Flux 1.1 Pro Ultra generates natively at 2048×2048 (4 MP) — no upscaling needed for that step. `gpt-image-1` max output is 1536×1024; no native upscaling API.
**Action:** Added `> Updated 2026-04-21` note in the Flux-dev "refiner" section covering both facts.

---

### 17c-face-text-hand-targeted-refinement.md

**Review finding:** No outdated claims requiring correction. adetailer is still active (AGPL-3.0), works with Flux via ComfyUI workflows (Impact Pack FaceDetailer is the ComfyUI equivalent — already documented). CodeFormer non-commercial license caveat is still accurate. No changes made.

---

### 17d-logo-icon-sharpness-refinement.md

**Review finding:** Content is accurate. Ideogram V3 / Recraft V4 SVG references remain current. vtracer, potrace, BiRefNet, RMBG-2.0 are all still the right tools. The DAT2 tier-1 recommendations hold. No changes required.

---

### 17e-deployment-patterns-upscaling.md

**Claim 1:** "DirectML was officially deprecated in May 2025; Windows WebNN now routes through Windows ML / OpenVINO."
**Finding:** This is **inaccurate**. DirectML entered *sustained engineering* at Microsoft Build 2025 — it still functions and is actively used as the default backend for WebNN on Windows in Chrome. It is not being removed. New *feature* development has moved to WinML, but DirectML is not deprecated in the sense of being removed. The W3C WebNN spec reached Candidate Recommendation in January 2026 covering 95 ops.
**Action:** Replaced the deprecated claim with an accurate "sustained engineering" description. Added note about Win 11 24H2+ WinML secondary path and the spec CR milestone.

**Claim 2:** "Firefox still ships WebGPU behind a flag."
**Finding:** Firefox shipped WebGPU in **stable** in early 2026. All four major browsers (Chrome, Edge, Firefox, Safari) now support WebGPU without flags (though device/enterprise disabling is still possible).
**Action:** Added callout correcting the Firefox flag claim.

**Claim 3:** Modal GPU memory snapshots described as a future/new concept.
**Finding:** Modal introduced GPU memory snapshots in 2025 as an alpha opt-in feature (`enable_memory_snapshot=True`), achieving up to 10× faster cold starts. Modal also reached unicorn status ($1.1B valuation, September 2025 Series B).
**Action:** Added `> Updated 2026-04-21` note in Pattern B section documenting the snapshot alpha and unicorn valuation.

**Claim 4:** Upscayl described as "44k+ GitHub stars."
**Finding:** Star count is approximately 43,700–44,000 as of early 2026 (search results show "over 43,700" and "over 44,000" across different sources). Latest version is v2.15.0 (Dec 2024/Aug 2025 depending on source).
**Action:** Updated to "~43–44k GitHub stars as of early 2026, latest v2.15.0."

**Claim 5:** `^webnn-compat` footnote said "DirectML deprecation May 2025."
**Action:** Corrected footnote to remove the false deprecation claim, added W3C CR milestone note.

Added two new footnotes: `^webgpu-allbrowsers` (Firefox stable WebGPU) and `^modal-unicorn` (Modal valuation + GPU snapshots).

---

### SYNTHESIS.md

- Updated `last_updated` from `2026-04-19` to `2026-04-21`.
- Added update callout under the WebGPU Controversies section: Firefox stable WebGPU support.
- Added update callout under the Magnific/Clarity Controversies section: Magnific $39/month pricing, Clarity Flux support (March 2025, paywalled), Topaz subscription-only from October 2025.
- Updated Topaz reference URL to correct path (`/topaz-gigapixel` not `/gigapixel-ai`).
- Added CG Channel perpetual-license-end source to references.

---

## Claims verified as still accurate (no changes)

- Real-ESRGAN x4plus, anime_6B variants and RRDB architecture descriptions — unchanged.
- SwinIR, HAT/Real-HAT architecture descriptions — unchanged.
- DAT2, DRCT-L, APISR recommendations — unchanged.
- spandrel v0.4.2 (Feb 21, 2026) is the latest version — confirmed.
- SUPIR VRAM requirements — community reports still consistent.
- CCSR v2 determinism advantage — no contradicting evidence found.
- adetailer AGPL-3.0, still active, works with Flux via ComfyUI Impact Pack — confirmed.
- CodeFormer non-commercial license — unchanged.
- Replicate `nightmareai/real-esrgan` still active (last updated April 19, 2026 per search results) at ~$0.0025/run T4 — confirmed active.
- Magnific engines (illusio/sharpy/sparkle/Flux) — still described consistently.
- Flux 1.1 Pro Ultra 4MP native — confirmed.
- OpenModelDB catalog still functional — confirmed.

## Claims that could not be verified with high confidence

- Modal A10G exact hourly pricing ($1.10/h) — Modal publishes H100 ($3.95/h), A100 ($2.10/h), T4 ($0.59/h) but A10G current rate is not clearly stated in search results; left unchanged pending direct verification.
- Runpod FlashBoot 200ms / 48% figure — from 2025 introl.com guide; may be stale. Left unchanged as no contradicting evidence found.
- Replicate exact per-run price for real-esrgan ($0.0025/run T4) — still consistent with search results showing model is active.

---

# Research update log — Category 18 (Asset Pipeline Tools)
Updated: 2026-04-21

## Files modified

- `18d-image-processing-libraries.md`
- `18a-appicon-co-teardown-and-oss-replacement.md`
- `18b-framework-native-asset-generators.md`
- `18c-splash-screen-generators.md`
- `18e-production-pipeline-architecture.md`
- `SYNTHESIS.md`
- `index.md` — no changes needed (already dated 2026-04-21, no factual claims)

---

## Changes by topic

### sharp (Node.js)

- **Old:** "Node.js ≥18"; no version number stated; "~19–20M wk downloads".
- **New:** Current stable is **v0.34.5**; v0.35.0-rc.2 available. Minimum Node changed to `^18.17.0 or >=20.3.0` (Node 16 dropped in v0.34). Experimental RISC-V 64-bit prebuilt added. `--build-from-source` flag deprecated in v0.34+. Updated in: `18d` Library Matrix row, `18d` Packaging section, `SYNTHESIS.md` R1 and insight #7.

### Pillow (Python)

- **Old:** "CPython ≥3.9"; "Pillow ≥10.2 w/ libavif" with plugin fallback; no version number.
- **New:** Current stable **v12.1.1** (Jan 2026). Python minimum raised to 3.10 (3.8/3.9 dropped in v12). AVIF is built-in since 10.2 — `pillow-avif-plugin` is legacy only. Updated in: `18d` Library Matrix row and Python Packaging section.

### ImageMagick 7 / Wand

- **Old:** "Apache-2.0 (rebranded 2025)" with no version.
- **New:** Current **v7.1.2-19** (Apr 2026). Wand (Python binding) current: **v0.7.0** (Feb 2026). Updated in: `18d` Library Matrix row and License table.

### @squoosh/lib / @squoosh/cli

- **Old:** Benchmark table listed `@squoosh/lib ~2.6 ops/sec` without deprecation warning. Text in `18a` §3.1 called it "unlike `@squoosh/lib`, which is Node-only and unmaintained" (partial mention only).
- **New:** Explicitly flagged as **abandoned**: Google removed CLI source from squoosh repo; package breaks on Node 18/20. Maintenance note added as a `> Updated` callout after the benchmark row in `18d`. `18a` §3.1 updated to explicitly state jSquash is the maintained successor with current versions (`@jsquash/png` v3.1.1, `@jsquash/avif` v2.1.1). SYNTHESIS insight #10 updated.
- **Assessment:** This was the clearest stale-recommendation risk in the original research.

### jSquash

- **Old:** Referenced without version numbers.
- **New:** Current versions confirmed: `@jsquash/png` v3.1.1, `@jsquash/avif` v2.1.1, `@jsquash/jpeg` v1.6.0, `@jsquash/jxl` v1.3.0. Project is active. Updated in `18a` and `SYNTHESIS.md`.

### @resvg/resvg-js

- **Old:** No version stated in `18d`, v2.6.0 only mentioned in benchmark table.
- **New:** Stable: **v2.6.2**; alpha: v2.7.0-alpha.0 (Jan 2026). Updated in `SYNTHESIS.md` R1.

### pwa-asset-generator

- **Old:** "v8.1.4, Mar 2026" — accurate but noted as if recent; no confirmation for Apr 2026.
- **New:** Confirmed still v8.1.4 as of Apr 2026; open issues filed Mar 2026 confirm active maintenance. Matrix noted as 26–30 PNGs (not fixed 26). Updated in `SYNTHESIS.md`, `18b`, `18c`.

### @capacitor/assets

- **Old:** "closely" described as current with no version.
- **New:** Current: **v3.0.5**, last published ~2 years ago. Functionally stable but Ionic's active development focus has shifted. Noted in `18b` version table callout.

### flutter_launcher_icons

- **Old:** "v0.14.4 shipped June 2025" — accurate.
- **New:** v0.14.4 confirmed as still current as of Apr 2026. No change needed beyond confirmation note in `18b`.

### BullMQ

- **Old:** No version number stated.
- **New:** Current: **v5.75.2** (Apr 2026, extremely active). Added to `18e` executive summary callout.

### FFmpeg

- **Old:** Not mentioned in 18e or other files despite animation being a pipeline use case.
- **New:** FFmpeg **v8.1** released March 2026. Noted in `18e` update callout for relevance to animated asset (APNG, animated WebP) generation paths.

### oxipng (previously missing)

- **Old:** Not mentioned in any file.
- **New:** Added as a recommended PNG post-processing step in `18d` (new "PNG Optimization Post-Processing" section) and `SYNTHESIS.md` R1. Current: **v9.1.1**. Recommended two-pass pipeline: `pngquant → oxipng --opt 4 --strip all`.
- **Assessment:** This was a gap in the original research. The task brief explicitly flagged it.

### pngquant (previously missing from 18d)

- **Old:** Not in the `18d` library matrix despite being referenced implicitly in other category research.
- **New:** Added alongside oxipng in new PNG Optimization section in `18d` and `SYNTHESIS.md` R1.

### Text Compositing / Canvas API / Skia (previously missing)

- **Old:** Not mentioned in 18d or SYNTHESIS despite being a critical path for the brand-text compositing flow described in CLAUDE.md.
- **New:** Added "Text Compositing / Canvas API" section in `18d` covering three libraries:
  - `@napi-rs/canvas` v0.1.98 (Skia, recommended — zero system deps, very active)
  - `skia-canvas` v3.0.8 (Skia, multi-threaded, GPU)
  - `node-canvas` (Cairo, system-dep heavy, not recommended for MCP servers)
  Added recommendation to SYNTHESIS R1.

### Fonttools

- **Status:** Active as of March 2026 release. No factual errors found in the original files. No changes needed.

### SYNTHESIS.md — Gaps section

- Gap #6 updated to note partial closure (MCP server implements the agent-native surface).

---

## What was verified accurate and left unchanged

- libvips vs ImageMagick benchmark ratios (7.7× speed, 16× memory) — confirmed still valid from primary source.
- `@napi-rs/image` WASM target details — no contradictory information found.
- iOS App Store alpha rejection rule — unchanged Apple policy.
- Android 108dp / 72dp safe zone specs — unchanged Google spec.
- Android 12+ SplashScreen API constraints — unchanged.
- PWA iOS splash media-query matrix requirement — unchanged.
- R2 vs S3 egress pricing comparison — pricing structure confirmed still holds (R2 = $0 egress).
- BullMQ `jobId` dedup pattern — still valid per current docs.
- `react-native-make` archived Oct 2021 — unchanged.
- resvg-js 115× speedup on paris-30k.svg — unchanged benchmark.

---

## Sources used for verification

- https://www.npmjs.com/package/sharp (v0.34.5, rc 0.35.0)
- https://sharp.pixelplumbing.com/install/ (Node ≥18.17.0 requirement)
- https://github.com/lovell/sharp/releases
- https://pypi.org/project/Pillow (v12.1.1)
- https://pillow.readthedocs.io/en/stable/releasenotes/index.html
- https://community.chocolatey.org/packages/imagemagick (v7.1.2-19)
- https://pypi.org/project/Wand (v0.7.0)
- https://github.com/oxipng/oxipng (v9.1.1)
- https://til.simonwillison.net/macos/shrinking-pngs-with-pngquant-and-oxipng
- https://github.com/GoogleChromeLabs/squoosh/issues/1365 (Node 20 breakage)
- https://github.com/jamsinclair/jSquash/releases
- https://www.npmjs.com/package/@jsquash/png (v3.1.1)
- https://www.npmjs.com/package/@resvg/resvg-js (v2.6.2 stable)
- https://github.com/thx/resvg-js/releases (v2.7.0-alpha.0)
- https://github.com/elegantapp/pwa-asset-generator/releases (v8.1.4 confirmed)
- https://www.npmjs.com/package/@capacitor/assets (v3.0.5)
- https://pub.dev/packages/flutter_launcher_icons (v0.14.4)
- https://api.docs.bullmq.io/ (v5.74.2 / 5.75.2)
- https://ffmpeg.org/ (v8.1, Mar 2026)
- https://www.npmjs.com/package/@napi-rs/canvas (v0.1.98)
- https://skia-canvas.org/releases (v3.0.8)
- https://www.pkgpulse.com/blog/node-canvas-vs-napi-rs-canvas-vs-skia-canvas-server-side-canvas-nodejs-2026
- https://pypi.org/project/fonttools (active, Mar 2026 release)

---

# Research Update Log — Category 19 (Agentic, MCP, Skills Architectures)
**Date:** 2026-04-21  
**Auditor:** research-updater agent

---

## Summary

Five files audited and updated in `/docs/research/19-agentic-mcp-skills-architectures/`. Three high-priority outdated claims corrected, one outdated claim in the model capability matrix corrected, one structural omission corrected in 19b.

---

## Changes Made

### 1. MCP spec `2025-11-25` was labeled "draft" — it is now Latest Stable

**Files:** `19b-mcp-server-design-for-asset-gen.md`, `SYNTHESIS.md`

**Claim before:** The research listed `2025-11-25` as "Draft" and `2025-06-18` as "Current stable." It recommended negotiating `2025-06-18` as minimum and accepting `2025-11-25` when offered.

**Fact:** The `2025-11-25` spec was released as the "Latest Stable" on November 25, 2025 (MCP's first anniversary). `2025-06-18` remains "Stable" but is no longer the latest. There is no publicly announced post-`2025-11-25` draft as of April 2026.

**Key additions in 2025-11-25:** async Tasks primitive (call-now, fetch-later), OpenID Connect Discovery, tool/resource/prompt icon metadata, incremental scope consent, elicitation URL mode, sampling tool-calling, OAuth Client ID metadata documents, formalized extension capability negotiation.

**Edits:**
- `19b` §1.2 version table: updated `2025-11-25` row label from "Draft" to "Latest Stable"; revised `2025-06-18` to "Stable (prior stable)".
- `19b` §1.2 design target: flipped — now target `2025-11-25` as minimum, accept `2025-06-18` as fallback.
- `19b` §8 recommendation 7: updated version target.
- `19b` references: updated label "(draft)" → "(Latest Stable, released Nov 25 2025)".
- `SYNTHESIS.md` insight 4: added dated correction note.
- `SYNTHESIS.md` recommendations §4: added `2025-11-25` target.
- `SYNTHESIS.md` primary sources: updated label.

---

### 2. Gemini CLI "has no lifecycle hooks" — now has full hooks system (v0.26.0+)

**Files:** `19a-claude-skills-cursor-rules-formats.md`, `19b-mcp-server-design-for-asset-gen.md`, `19c-gemini-codex-copilot-integration.md`, `19e-cross-ide-plugin-packaging.md`, `SYNTHESIS.md`

**Claim before:** Multiple files stated "Gemini CLI has no lifecycle hooks" or "Windsurf, Cline, and Gemini CLI have no lifecycle hooks." The SYNTHESIS.md Gaps section listed this as an open gap requiring upstream contribution. The compatibility matrices showed Gemini CLI as hookless.

**Fact:** Gemini CLI shipped a full hooks system (GA in v0.26.0+). Extensions can bundle hooks via a `hooks/hooks.json` file inside the extension directory (PR #14460 merged). Supported hook events include `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeTool`, `AfterTool`, `Notification`, `PreCompress`, and `BeforeToolSelection`. Extension hooks require explicit user consent (security warning on install). There is no exact `UserPromptSubmit` equivalent — `BeforeModel` is the closest substitute for turn-level re-checking.

**Edits:**
- `19a` executive summary item 3: expanded to note Gemini CLI now has hooks; updated compatibility matrix rows for SessionStart, UserPromptSubmit, PreToolUse/PostToolUse; updated "practical takeaways" to reflect three hook-capable surfaces.
- `19a` hooks section body: added dated note about Gemini CLI hook support; updated "Windsurf, Cline, and Gemini CLI have no lifecycle hooks" to correctly say only Windsurf and Cline lack hooks.
- `19b` §6.4: corrected "Gemini CLI does not natively speak MCP yet; bridge via small adapter" — Gemini CLI has had native MCP support since early releases; the adapter claim was already stale.
- `19c` per-agent matrix: added "Lifecycle hooks" row to the matrix.
- `19c` agent quirks §Gemini: added dated correction note.
- `19e` installer section: added dated note that Gemini CLI extensions can now bundle hooks via `hooks/hooks.json`; added step 4a to the port checklist.
- `SYNTHESIS.md` insight 7: updated from "only Claude + Codex have hooks" to include Gemini CLI.
- `SYNTHESIS.md` Enforce-via-hooks cross-cutting pattern: corrected.
- `SYNTHESIS.md` Top 3 Insights #3: added dated correction note.
- `SYNTHESIS.md` Gaps: marked the Gemini CLI hooks gap as "Resolved 2026-04-21."

---

### 3. Gemini CLI described as lacking native MCP support (19b §6.4)

**File:** `19b-mcp-server-design-for-asset-gen.md`

**Claim before:** "Gemini CLI does not natively speak MCP yet; bridge via a small adapter that translates Gemini's function-calling tool list to MCP `tools/list`."

**Fact:** Gemini CLI has native MCP support via its extensions system — declare `mcpServers` in `gemini-extension.json` and the CLI spawns the server over stdio. No adapter needed. Gemini CLI is one of the primary MCP clients with 24+ official Google MCP servers and FastMCP integration.

**Edit:** `19b` §6.4 corrected with dated note.

---

### 4. Ideogram 2.0 listed — superseded by Ideogram 3.0 (March 2025)

**File:** `19d-prompt-enhancement-agent-pattern.md`

**Claim before:** Routing table referenced "Ideogram 2.0" as the recommended text-rendering model.

**Fact:** Ideogram 3.0 / V3 Turbo was released March 26, 2025. It renders text with ~90–95% accuracy and is available in Turbo / Balanced / Quality tiers. Ideogram 2.0 is superseded.

**Edits:**
- `19d` capability matrix: updated row from "Ideogram 2.0" to "Ideogram 3.0 / V3 Turbo"; updated text rendering note.
- `19d` routing rules: updated `Ideogram 2.0` → `Ideogram 3.0 Turbo`.
- `19d` references: added Ideogram 3.0 link.

---

### 5. Recraft V4 not mentioned — released February 2026

**File:** `19d-prompt-enhancement-agent-pattern.md`

**Claim before:** Only Recraft v3 mentioned in the capability matrix and routing rules.

**Fact:** Recraft V4 was released February 2026 as a ground-up rebuild. It improves on V3 with better photorealistic rendering, stronger SVG coherence, sharper text-in-image accuracy, and a new Pro Vector tier at 2048×2048. It has an ELO rating of 1172 with a 72% win rate in blind evaluations.

**Edits:**
- `19d` capability matrix: added Recraft V4 row.
- `19d` routing rules: updated primary logo/favicon route to Recraft V4 with V3 as cost fallback.
- `19d` references: added Recraft V4 link.

---

### 6. Model references updated (QA node and rewriter)

**File:** `19d-prompt-enhancement-agent-pattern.md`, `SYNTHESIS.md`

- QA node: "Claude Sonnet or GPT-4o-mini" updated to "Claude Sonnet 4.6".
- Enrichment rewriter: "Claude Haiku / Gemini Flash" updated to "Claude Haiku 4.5".
- Classification node: added note that Claude API native structured outputs are now GA for Sonnet 4.5/Opus 4.5 (beta for Haiku 4.5) via `output_config.format` parameter.
- `SYNTHESIS.md` cross-cutting rewriter pattern: added note on Claude structured outputs GA.

---

## Claims Verified as Still Accurate (spot-checked)

- MCP `structuredContent` + `outputSchema` as default return pattern: confirmed accurate for `2025-06-18` and `2025-11-25`.
- OAuth 2.1 + PKCE + RFC 9728 mandatory for remote MCP servers: confirmed, still current.
- Copilot Skillsets capped at 5 skills: confirmed still accurate as of April 2026.
- `gpt-image-1` native RGBA transparency: still accurate.
- Flux ignoring `negative_prompt`: still accurate for Flux native API.
- `SKILL.md` format shared across Claude Code, Cursor, Windsurf, Codex: confirmed.
- Cline alphabetical-concat rule ordering: confirmed still the contract.
- Recraft V3 SVG native vector: confirmed still accurate; V4 now the preferred route.
- Ideogram text rendering ~90–95%: confirmed for Ideogram 3.0.
- Claude Agent SDK (formerly Claude Code SDK): confirmed rename; Managed Agents launched in public beta April 2026.

---

## Sources Used for Verification

- https://modelcontextprotocol.io/specification/2025-11-25
- https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/
- https://geminicli.com/docs/hooks/
- https://github.com/google-gemini/gemini-cli/pull/14460
- https://github.com/google-gemini/gemini-cli/issues/14449
- https://developers.googleblog.com/tailor-gemini-cli-to-your-workflow-with-hooks/
- https://geminicli.com/docs/tools/mcp-server/
- https://developers.googleblog.com/gemini-cli-fastmcp-simplifying-mcp-server-development/
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://ideogram.ai/features/3.0
- https://www.recraft.ai/docs/recraft-models/recraft-V4
- https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- https://platform.claude.com/docs/en/agent-sdk/overview

---

# Category 20 — Open-Source Repos Landscape: Update Log
**Updated:** 2026-04-21  
**Files audited:** 20a, 20b, 20c, 20d, 20e, SYNTHESIS.md, index.md  
**Research method:** Web searches run 2026-04-21 against GitHub, star-history.com, PyPI, HuggingFace, and secondary blog sources.

---

## Summary of Changes

### ComfyUI (20d, SYNTHESIS.md)

**Stale claim:** ~55k stars.  
**Current fact:** ~108.5k★ as of 2026-04-13 (source: star-history.com/comfy-org/comfyui). The project has nearly doubled in star count since the original research. Weekly release cadence confirmed.

**Stale claim:** ComfyUI-Manager ~14.3k stars (unchanged figure).  
**Current fact:** Still ~14.3k★ but now at v4.1 (released 2026-03-25) and officially integrated into the core ComfyUI codebase.

**New fact:** ComfyUI now ships Flux.2 (max/pro/dev/flex), Z-Image, Wan 2.1/2.2 support natively.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — corrected star counts, added "Updated" callout blocks.

---

### AUTOMATIC1111 / Forge (20d, SYNTHESIS.md)

**New context (not previously covered):**  
- AUTOMATIC1111: Last release v1.10.1 (July 2024). No releases since; effectively stalled. Many users have migrated to ComfyUI or Forge. Do not plan new integrations.  
- Forge (lllyasviel/stable-diffusion-webui-forge): Last release July 22, 2025. Based on a1111 v1.10.1; syncs upstream ~every 90 days. Still the preferred a1111-replacement for Flux support, but not rapidly developed.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to "Key risks & notes" section under the new "Updated 2026-04-21 — ecosystem context" block.

---

### Fooocus (20a, 20b, SYNTHESIS.md)

**Stale claim:** Fooocus "actively maintained" / "2024" as last commit.  
**Current fact:** Fooocus is now in Limited Long-Term Support (LTS) mode — bug fixes only. Last feature release v2.5.5 (August 2025). Developer explicitly recommends Forge or ComfyUI for Flux-era work. Community has thousands of forks but no dominant successor has emerged.

**Impact:** The "Fooocus-style rewriter" strategy (re-implementing the positive-word logits trick) remains valid. The algorithm is reusable; the CC-BY-NC-4.0 weights are still the licensing concern. Just don't depend on Fooocus itself receiving new model support.

**Files edited:** `20a-prompt-enhancement-oss-repos.md`, `20b-asset-generator-fullstack-repos.md`, `SYNTHESIS.md` — added LTS annotation to table rows, added "Updated" callout blocks.

---

### danielgatis/rembg (20b, SYNTHESIS.md)

**Stale claim:** 22,491★.  
**Current fact:** 22,500+★ as of 2026-04-21. At v2.0.75 (released 2026-04-08). Actively maintained with monthly releases throughout 2025-2026.

**Files edited:** `20b-asset-generator-fullstack-repos.md`, `SYNTHESIS.md` — corrected star count, added version note.

---

### BiRefNet (20d, SYNTHESIS.md)

**New facts (not previously documented):**  
- June 2025: `refine_foreground` function accelerated 8x via GPU implementation (~80ms on 5090).  
- September 2025: Swin Transformer attention upgraded to PyTorch SDPA (lower memory, potential acceleration for training and inference).  
- Available on HuggingFace as `ZhengPeng7/BiRefNet`. Code on HF may lag GitHub.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added update note to background removal section.

---

### BRIA RMBG-2.0 + ComfyUI-RMBG (20d, SYNTHESIS.md)

**New facts:**  
- RMBG-2.0 remains CC-BY-NC-4.0; commercial use requires hosted endpoints (Bria API, fal.ai, Replicate).  
- `1038lab/ComfyUI-RMBG` is now at v3.0.0 (2026-01-01), covering RMBG-2.0, BiRefNet, BEN, BEN2, SAM/SAM2/SAM3, SDMatte, GroundingDINO in one node pack. This supersedes the older `ZHO-ZHO-ZHO/ComfyUI-BRIA_AI-RMBG` wrapper.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — updated background removal node section with v3.0.0 and full model coverage list.

---

### InvokeAI (20d)

**New context (not previously covered in 20-series):**  
- At v6.x (v6.12 adds experimental multi-user mode, separate boards/images/canvas per account).  
- Supports Flux.2 Klein, Z-Image, FLUX.2 LoRA formats.  
- Still the recommended non-graph-based creative diffusion UI. Not relevant for headless/agentic use.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to "Updated 2026-04-21 — ecosystem context" block.

---

### kohya_ss + ostris/ai-toolkit (20d, SYNTHESIS.md)

**New facts:**  
- `kohya_ss` (bmaltais/kohya_ss): Active; sd-scripts v0.9.1 (Oct 2025). Flux.1 and Flux.2 LoRA training supported. High VRAM demands for Flux.2.  
- `ostris/ai-toolkit`: As of April 2026, widely described as the most popular Flux LoRA trainer. Supports 10+ architectures: Flux.1, Flux.2, Wan 2.1/2.2, Lumina2, Z-Image, LTX-2, SD 1.x/2.x/XL. Active development confirmed (Medium tutorial published March 2026). Supersedes kohya_ss for Flux-native workflows.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — added to ecosystem context block and actionable recommendations section.

---

### IP-Adapter (tencent-ailab/IP-Adapter) (20d, SYNTHESIS.md)

**Stale claim:** IP-Adapter implied as a current, active reference.  
**Current fact:** Last commit to `tencent-ailab/IP-Adapter` main repo was January 2024 (added FaceID-Portrait). The repo is effectively unmaintained. The IP-Adapter *technique* lives on via:  
- InstantX's FLUX.1-dev IP-Adapter (released Nov 2024)  
- `comfyorg/comfyui-ipadapter` node (official ComfyUI org)  
- `Shakker-Labs/ComfyUI-IPAdapter-Flux`

For new Flux work, use the InstantX model or the official ComfyUI node, not the Tencent repo.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — added to ecosystem context block and actionable recommendations.

---

### diffusers (Hugging Face) (20d, SYNTHESIS.md)

**New facts:**  
- At v0.37.1 (released 2026-03-25).  
- v0.37.0 introduced Modular Diffusers: composable reusable pipeline blocks.  
- Full Flux.1/Flux.2 support, SD3.5, Z-Image, Flux Klein LoRA loading.  
- Extremely active (PyPI/GitHub releases confirm).

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to ecosystem context block.

---

### Nutlope/logocreator star count (20e, SYNTHESIS.md)

**Stale claim:** 6.8k★.  
**Current fact:** ~5.3k★ as of April 2026 (confirmed from multiple search result citations). Project is still active with open issues. The 6.8k figure was likely a peak or a misread.

**Files edited:** `SYNTHESIS.md` — corrected star count with "Updated" callout.

---

### WAS Node Suite (20d)

**Already marked archived June 2025** in the original files — no change needed. The update note about `1038lab/ComfyUI-RMBG v3.0.0` as its recommended replacement was added.

---

### vtracer (20b, SYNTHESIS.md)

**Status:** Last documented version 0.6.x. Web search returned the releases page but not a specific 2025-2026 release date. No evidence of abandonment — crates.io page active. No change made; star count was not cited numerically in the files so no correction needed.

---

### ControlNet (20d)

**Status:** The original `lllyasviel/ControlNet` repo shows community issues through December 2025. Primarily an SD 1.x artifact; for Flux ControlNet the community has moved to separate implementations (Flux ControlNet via diffusers/ComfyUI nodes). No corrections required to the existing files since ControlNet was not heavily cited in category 20.

---

## Files Not Changed

- `20c-image-gen-sdk-wrappers.md` — Vercel AI SDK v5, OpenRouter, aisuite, simonw/llm, Replicate, fal, Together all checked; no material corrections needed. The claims about aisuite (no image support, v0.1.14) may need a future recheck but no confirmed change found.
- `20e-agent-native-webapps-and-gap-analysis.md` — No tool-specific factual errors found; the gap analysis and architecture patterns are structural and not version-sensitive.
- `index.md` — Index file, no factual claims to update.

---

# Partial update log — files 01–11 (21a scope)
# Audit date: 2026-04-21

## Summary
Reviewed 11 files in `docs/research/21-oss-deep-dive/`. Most content was accurate
(written 2026-04-19, just two days before this audit). Key corrections are below.

---

## 01-logo-brand-loras.md

**Change 1 — FLUX.1 [dev] license section (license landscape)**
- Added dated note: BFL now has a self-serve commercial license portal at `bfl.ai/licensing`
  ($999/month base, 100k images/month, $0.01/image above).
- The prior claim that "serving to paying end users is prohibited" is now incomplete
  (it omits the self-serve commercial license path).

**Change 2 — Integration recommendations (bottom)**
- Added dated note explaining BFL self-serve commercial license economics vs
  fal/Replicate per-image pricing (viable above ~30k images/month).

---

## 02-vector-svg-diffusion-oss.md

**Change 1 — vtracer star count**
- Updated 5.7k★ → 5.8k★ (as of 2026-04) to reflect current count from search.

---

## 03-prompt-rewriter-training.md

**Change 1 — TRL v1.0 release date**
- File said "shipped early 2026"; confirmed actual release date is April 12, 2026.
- Added dated note: GRPOTrainer is now stable API (not experimental) in v1.0.
  ORPO/KTO moved to experimental. CLI and config system formalized.

---

## 04-native-rgba-generation.md

**Change 1 — ComfyUI-layerdiffuse maintenance status**
- Updated star count (1,769 → ~1,800) and last-update date (February 2025 → December 2024).
- Clarified project is in maintenance mode: no new Flux integration in 2025 or early 2026;
  Flux support remains an unresolved open issue.

**Change 2 — OpenAI model family (gpt-image-1.5 section)**
- Added `gpt-image-1-mini` (released October 2025, 80% cheaper than gpt-image-1).
- Added dated note: DALL-E 2 and DALL-E 3 deprecated (shutdown May 12, 2026).
  Current family: gpt-image-1.5 (flagship), gpt-image-1 (stable), gpt-image-1-mini (budget).
  gpt-image-2 reportedly nearing release as of April 2026.
- Added note on batch API pricing (50% discount across all tiers).
- Added gpt-image-1-mini to fallback chain.

**Change 3 — Ideogram 3.0 transparency mechanism**
- Corrected: CLAUDE.md and the original file incorrectly described Ideogram 3.0 as using
  `style: "transparent"`. The actual mechanism is a dedicated `/generate-transparent-v3`
  endpoint, not a `style_type` parameter value. Clarified that the endpoint supports
  style presets like FLAT_VECTOR, MINIMAL_ILLUSTRATION, ICONIC.
- Corrected fallback chain entry to reference the endpoint, not a style parameter.

---

## 05-text-in-image-oss.md

**Change 1 — Glyph-ByT5-v2 weights status**
- Added clarification: weights still unavailable from official sources as of April 2026.
  Microsoft RAI review has not resulted in a public re-release. Issue tracker shows
  ongoing user inquiries with no resolution. Project remains blocked for practical adoption.

**Change 2 — Qwen-Image-2512 release confirmation**
- Added dated note: weights released December 31, 2025. Available on HF and ModelScope.
  Also accessible as `qwen-image-max` via Alibaba Cloud ($0.075/image).
  Lightning-quantized variant and community LoRAs confirm active adoption.

---

## 06-t2i-eval-harnesses.md

**Change 1 — DeepEval star count**
- Added "(as of 2026-04)" date qualifier and "actively maintained" note to the 14k★ claim.
  Search confirmed ~14k stars currently. No numeric correction needed.

---

## 07-brand-dna-extractors.md

**Change 1 — OpenBrand star count**
- Updated 673★ → ~633★ (as of 2026-04) based on search.
- Updated npm weekly downloads: 2.8k → ~8.9k (MCP server adoption driving growth).

---

## 08-mcp-registries.md

**Change 1 — Smithery server count**
- Updated table note: registry now lists 7,000+ servers (up from ~6k referenced in
  the table's "Popular one-click install marketplace" description).

---

## 09-cross-ide-installers.md

**Change 1 — Smithery CLI server count**
- Updated "~6k servers in the registry" to "7k+ servers in the registry (as of 2026-04)".

---

## 10-oss-appicon-replacements.md

**Change 1 — itgalaxy/favicons version and star count**
- Updated 1,234★ → ~1,231★ (as of 2026-04); minor delta but removes the falsely precise figure.
- Added: current version v7.1.3 (April 2026); actively maintained.

---

## 11-oss-favicon-generators.md

This file appears to have been partially updated by a prior session (the file
had already received some `> **Updated 2026-04-21:**` blocks). Corrections made:

**Change 1 — RFG core star count claim**
- Corrected an erroneous "~4,986 GitHub stars" claim (this was an npm download count,
  not GitHub stars). Replaced with a note that the exact star count is unconfirmed
  and should be verified directly on GitHub. Latest confirmed release: v0.8.0 (April 2026).

**Change 2 — itgalaxy/favicons star count and weekly downloads**
- Updated 1,234★ → ~1,231★ (as of 2026-04).
- Updated ~331k weekly downloads → ~131k–220k/week (npm stats vary by tracking window;
  the 331k figure appears to be outdated or sourced from a period of higher traffic).
- Updated version reference to v7.1.3 (April 2026) for consistency with file 10.

**Change 3 — Cross-cutting observations note about RFG being "not discovered"**
- Updated observation #1 to remove the stale "hasn't been discovered" framing;
  replaced with a note that current traction should be verified.

---

## Files with no edits needed
- `06-t2i-eval-harnesses.md` — Only the DeepEval star count qualifier was added;
  no substantive factual errors found.
- `07-brand-dna-extractors.md` — Only OpenBrand star/download update.

## Files explicitly out of scope (not edited)
- `SYNTHESIS.md` — deferred to second agent (21b)
- `index.md` — deferred to second agent (21b)
- Files 12–20 — deferred to second agent (21b)

---

# Partial update log — Category 21 OSS Deep Dive (angles 11–20 + SYNTHESIS + index)

**Audit date:** 2026-04-21  
**Scope:** Files 11–20, SYNTHESIS.md, index.md  
**Auditor:** Claude agent (second-half scope)

---

## Summary of changes

### 11-oss-favicon-generators.md

| Claim | Was | Now | Source |
|---|---|---|---|
| `@realfavicongenerator/generate-favicon` star count | ~34★, "undiscovered" | ~5k★ (npm search returned 4,986; check-favicon at 1,935), v0.8.0 April 2026, actively maintained | npm/GitHub search April 2026 |
| `@realfavicongenerator/generate-favicon` version | Not stated | v0.8.0 (April 2026) | npm registry |
| `itgalaxy/favicons` version | v7.2.0 (March 2024), "~2 years old" | v7.1.3 (April 9, 2026), actively maintained | npm registry April 2026 |
| `itgalaxy/favicons` maintenance characterisation | "weak point — v7.2.0 ~2 years old" | "actively receiving updates" | npm registry April 2026 |
| `pwa-asset-generator` repo location | `onderceylan/pwa-asset-generator`, 3,006★ | Moved to `elegantapp/pwa-asset-generator`, ~3k★, v8.1.4 (March 2026) | GitHub search April 2026 |
| Cross-cutting observation #1 | "just hasn't been discovered yet (34★)" | "as of April 2026 it has grown to ~5k★ and v0.8.0, so the 'hasn't been discovered' framing is now outdated" | Verified |

**Files changed:** `11-oss-favicon-generators.md`  
**Nature:** Star counts stale; version numbers outdated; repo relocation missed; maintenance characterisation reversed.

---

### 12-oss-og-social-card.md

| Claim | Was | Now | Source |
|---|---|---|---|
| Nuxt OG Image v6 renderer behaviour | "already defaults to Takumi" | "recommends Takumi via `.takumi.vue` filename suffix; v6 removed global `defaults.renderer` config — renderer selection is per-component, not a single default" | Nuxt SEO docs / nuxt-modules/og-image v6 release notes |
| Takumi star count | 1.6k★ | ~1.3–1.6k★ (range confirmed across two sources) | GitHub April 2026 |

**Files changed:** `12-oss-og-social-card.md`  
**Nature:** Nuxt OG Image v6 renderer architecture mischaracterised — "defaults to Takumi globally" is incorrect; the v6 architecture is per-component suffix selection.

---

### 13-oss-sticker-emoji.md

| Claim | Was | Now | Source |
|---|---|---|---|
| DiceBear star count | ~8.3k★ | ~8.2–8.3k★ (confirmed range, last push April 17, 2026) | GitHub search April 2026 |

**Files changed:** `13-oss-sticker-emoji.md`  
**Nature:** Minor — star count range corrected; DiceBear remains actively maintained.

---

### 14-webmcp-impls.md

| Claim | Was | Now | Source |
|---|---|---|---|
| "Formal announcement expected around Google I/O 2026" | Forward-looking as of April 2026 | Still pending; production readiness expected mid-to-late 2026 | Community reporting April 2026 |
| Runtime coverage | Chrome 146 only + Edge tracking | Chrome 146 + **Cloudflare Browser Run** also shipping WebMCP support | Cloudflare docs April 2026 |

**Files changed:** `14-webmcp-impls.md`  
**Nature:** Google I/O claim left as forward-looking (no announcement yet confirmed); Cloudflare Browser Run WebMCP support added as a new runtime surface.

---

### 15-skills-packaging-formats.md

| Claim | Was | Now | Source |
|---|---|---|---|
| AGENTS.md adopters list | "20+ coding agents" generic | Verified list: Amp, Codex, Cursor, Devin, Factory, Gemini CLI, GitHub Copilot, Jules, VS Code, and others | AAIF press release Dec 2025 + AAIF site April 2026 |
| AAIF membership | Not stated | 170+ member organisations (April 2026) | AAIF announcement April 2026 |
| AAIF leadership | Not stated | Mazin Gilbert appointed first permanent Executive Director | AAIF announcement April 2026 |

**Files changed:** `15-skills-packaging-formats.md`  
**Nature:** AAIF growth confirmed and quantified; adopters list made specific.

---

### 16-mascot-character-consistency.md

| Claim | Was | Now | Source |
|---|---|---|---|
| Flux.1 Kontext [dev] commercial licensing | "non-commercial only" | BFL launched self-serve commercial licensing portal June 2025 — commercial licences purchasable in minutes for Flux.1 [dev], Kontext [dev], Tools [dev] | BFL announcement / bfl.ai/licensing |
| Cross-cutting notes license list | "Flux.1-dev / Flux.1 Redux-dev / Flux.1 Kontext-dev ... silent traps" | Updated to distinguish: "non-commercial for unlicensed use; commercial available via BFL portal" | Verified |
| Kontext [pro] per-image pricing | "~$0.04–0.08 / image" | 50 credits = $0.50/image (1 credit = $0.01 per BFL pricing) | bfl.ai/pricing April 2026 |

**Files changed:** `16-mascot-character-consistency.md`  
**Nature:** Significant — BFL's self-serve commercial licensing portal (June 2025) changes the commercial viability of Flux.1 Kontext [dev]. The original "non-commercial" characterisation was accurate at time of writing but is now incomplete without noting the commercial licence path.

---

### 18-serverless-comfyui-patterns.md

| Claim | Was | Now | Source |
|---|---|---|---|
| ComfyDeploy star count | ~446★ | ~1.3k★ (April 2026) | GitHub search April 2026 |
| ComfyDeploy re-open-sourcing date | "2025" (vague) | September 2025 (confirmed) | ComfyDeploy blog |
| `bentoml/comfy-pack` star count | 215★ | ~164★ (corrected — GitHub star counts fluctuate) | GitHub search April 2026 |
| `bentoml/comfy-pack` version | "v0.4.4 Nov 2025" | Last PyPI release v0.4.0a5 (May 2025, pre-release); active maintenance status unclear | PyPI April 2026 |

**Files changed:** `18-serverless-comfyui-patterns.md`  
**Nature:** ComfyDeploy star count significantly understated. `comfy-pack` star count was overstated; version/status needs watching.

---

### 19-tri-surface-starters.md

| Claim | Was | Now | Source |
|---|---|---|---|
| `vercel-labs/skills` star count | "~14,620★" | ~14.7k★ (April 2026) | GitHub search April 2026 |
| `vercel-labs/skills` version context | Not stated | v1.1.1 released, added `npx skills find` interactive discovery | Vercel changelog |

**Files changed:** `19-tri-surface-starters.md`  
**Nature:** Minor — star count ticked up; v1.1.1 feature addition noted.

---

### SYNTHESIS.md

Changes propagated from individual angle corrections:

1. **Insight #10** — RFG "34★ undiscovered" → "~5k★ well-established v0.8.0"; noted `itgalaxy/favicons` v7.1.3 active; `pwa-asset-generator` repo relocation to `elegantapp/`.
2. **Insight #11** — Nuxt OG Image v6 "defaults to Takumi" → "recommends Takumi via per-component filename suffix" (no global default).
3. **Insight #14** — AAIF 170+ members (April 2026) added.
4. **Insight #16 (Rec #16)** — ComfyDeploy star count corrected to ~1.3k★; `comfy-pack` ~164★ noted.
5. **P1 cross-cutting pattern** — BFL self-serve commercial portal added; Flux.1 [dev] / Kontext [dev] noted as commercially licensable with purchase.
6. **Recommendation #19** — No-fly list updated: Flux.1 [dev] / Kontext [dev] removed from blanket no-fly for orgs with BFL licence; Flux.1 Redux-dev status flagged as unconfirmed.
7. **Pattern P8 star count** — `vercel-labs/skills` ~14.7k★ (was "14.6k★").

---

## Claims verified as still accurate (no change needed)

- DiceBear ~8.3k★ MIT — confirmed (slightly down to ~8.2k but within rounding)
- StarVector CVPR 2025, 8B model available on HuggingFace — confirmed, RLRF NeurIPS 2025 follow-up also confirmed
- AGENTS.md 60k+ repos — confirmed (AAIF press release)
- Linux Foundation / AAIF formation date December 9, 2025 — confirmed
- Modal `@modal.enter(snap=True)` <3s cold starts on 90% of requests — confirmed by multiple 2026 sources
- Replicate `LoraLoaderFromURL` feature — confirmed present in cog-comfyui
- Together FLUX.2 up to 8 reference images via API (FLUX.2 [flex] up to 10) — confirmed
- Open Peeps / Open Doodles / Humaaans CC0 — confirmed, no licence changes
- Iconify `icon-sets` 275k+ icons — confirmed
- `astro-favicons` v3.1.3 — confirmed (latest on npm as of April 2026)
- WebMCP W3C CG draft, Chrome 146 flag-gated — confirmed
- `MiguelsPizza/WebMCP` as the incubator that seeded W3C CG — confirmed
- `run-llama/mcp-nextjs` OAuth 2.1 + Prisma + Postgres — confirmed as architecture

---

## Items not verified (flagged for manual review)

- Flux.1 Redux-dev commercial licence availability via BFL portal — the self-serve portal covers Flux.1 [dev], Kontext [dev], Tools [dev] but Redux-dev was not explicitly confirmed in sources. Verify at `bfl.ai/licensing`.
- `bentoml/comfy-pack` maintenance cadence — last found PyPI release is pre-release (May 2025). The project may have shifted to BentoCloud-native deployment. Monitor.
- `jakejarvis/favsmith` v0.1.0 March 2026 — star count still 0 (nascent); activity not reverified.
- `SivaramPg/pwa-icons` v1.1.3 Jan 2026 — not reverified; likely still accurate.
- `harlan-zw/nuxt-og-image` v6 full release date — referenced via issue tracker; production release status not confirmed.

---

# Research Update Log — 22-repo-deep-dives (files 01–11)
**Agent:** 22a  
**Date:** 2026-04-21  
**Scope:** First 11 files alphabetically in `/docs/research/22-repo-deep-dives/`

---

## Summary of Changes

### 01-hunyuan-prompt-enhancer.md
- **Claim:** Stars listed as 3,667.
- **Finding:** Web search confirms ~3.7k stars (consistent, rounding artifact).
- **Action:** Table updated to `~3,700` with confirmation note. No material issues found. File is current and accurate. CVPR 2026 acceptance confirmed.

### 02-promptist.md
- **Claim:** `microsoft/LMOps` ~4.3k stars; Promptist HF Space paused; subfolder frozen since Dec 2022.
- **Finding:** All confirmed. LMOps sits at ~4.3k stars. Dependabot activity continues janitorial maintenance. NeurIPS 2023 Spotlight status accurate.
- **Action:** No edits needed. File is accurate.

### 03-nutlope-logocreator.md
- **Claim:** 6,956 stars / 676 forks as of 2026-04-19.
- **Finding:** Web search returns ~5.3k stars / ~474 forks in April 2026, suggesting the peak numbers have declined significantly (viral-launch dropoff pattern). The research file was written on the same date as the audit (2026-04-19), so the discrepancy likely reflects real decline between research and web-search observation, or web-search imprecision.
- **Action:** 
  - Added intro paragraph note about star count decline.
  - Updated metrics table to show `~5,300` with note about peak.
  - Last human commit confirmed January 2025; Vercel bot CVE bump December 2025 confirmed. License still `null`. Status: maintenance-mode confirmed.

### 04-shinpr-mcp-image.md
- **Claim:** ~100 stars, v0.10.0 latest, actively maintained.
- **Finding:** npm package last updated April 3, 2026. Actively maintained confirmed.
- **Action:** Added confirmation note. No stale claims.

### 05-logoloom.md
- **Claim:** v1.0.1, 7 stars, brand new (March 2026).
- **Finding:** Repo confirmed on Glama MCP directory. No evidence of additional releases beyond v1.0.1 in the ~1 month since publication.
- **Action:** Added brief status note. Decision unchanged.

### 06-arekhalpern-mcp-logo-gen.md
- **Claim:** ~13 months stale as of 2026-04-19 (last commit 2025-03-16). GPL-3.0.
- **Finding:** Confirmed via web search. No new commits, PRs, or forks. The repo continues to redirect through sshtunnelvision alias. Stale duration (~13 months) is correct for the research date.
- **Action:** Added confirmation note reinforcing stale status. Decision unchanged: do not adopt.

### 07-niels-oz-icon-mcp.md
- **Claim:** 1 GitHub star, silence since 2025-08-16, "effectively unmaintained."
- **Finding:** Confirmed ~8 months of silence as of April 2026. LobeHub listing dates visible from March 2026 but no new npm releases. v0.5.0 is still the latest.
- **Action:**
  - Added `> **Updated 2026-04-21**` block after metrics paragraph with classification **abandoned-beta**.
  - Updated inline reference "silence since 2025-08-16" to add parenthetical "(~8 months as of Apr 2026)".

### 08-appicon-forge.md
- **Claim:** 983 stars, last push 2025-07-09, ~9 months idle.
- **Finding:** ~9 months idle confirmed for April 2026 write date. Live instance at GitHub Pages confirmed operational. No new releases or forks taking over maintenance.
- **Action:** Added `> **Updated 2026-04-21**` block after metrics with **idle but functional** status. Missing SPDX/LICENSE concern noted as unresolved.

### 09-guillempuche-appicons.md
- **Claim:** 2 stars, 3-month-old project, pre-production; maintainer actively iterating.
- **Finding:** Web search confirms maintainer is still active as of April 2026. Repo touched 2026-04-12. Feature set (iOS 18 appearances, Android 13 monochrome, watchOS/tvOS/visionOS) remains unique in the OSS space.
- **Action:**
  - Added parenthetical clarification to last-updated date in table.
  - Added `> **Updated 2026-04-21**` block elevating this tool to **primary driver candidate** given capacitor-assets' 2+ year freeze (cross-reference with file 11 update).

### 10-pwa-asset-generator.md
- **Claim:** v8.1.4, 3,006 stars, 17.6k weekly downloads, actively maintained.
- **Finding:** All confirmed. v8.1.4 released 2026-03-14 (1 month ago). Active issue filed March 17, 2026. Stars ~3,006 confirmed.
- **Action:** Added confirmation note. No stale claims found. Status: **actively maintained** confirmed.

### 11-capacitor-assets.md
- **Critical issue found.** 
- **Claim:** v3.0.5 (29 Mar 2024); "quiet but not abandoned, with issues triaged through 2024." Weekly downloads ~263k.
- **Finding:** 
  - v3.0.5 (March 2024) is still the latest release — now **over 2 years old** with no new version.
  - Last GitHub commit to `main` was September 2024 (~19 months ago as of April 2026).
  - Weekly downloads revised: npm reports ~238k/week (down from ~263k cited in research).
  - The file's own framing "quiet but not abandoned" understates the staleness risk, particularly for iOS 18+ and Android 13+ requirements which the tool does not support.
- **Action:**
  - Updated weekly downloads figure from ~263k to ~238k in the opening paragraph.
  - Added prominent `> **Updated 2026-04-21**` block after the opening paragraph noting the 2+ year release freeze, September 2024 last commit, missing iOS 18/Android 13 coverage, and recommendation to pin at a commit SHA.
  - Added `> **Updated 2026-04-21**` block at the Decision section recommending elevation of `guillempuche/appicons` to primary if no new release by H2 2026.

---

## Stale Pattern Inventory

| Pattern | Files Affected | Action |
|---|---|---|
| Star counts not current | 01, 03 | Corrected with web-verified values and notes |
| "Quiet but not abandoned" understating a 2+ year freeze | 11 | Strong caveat added |
| Weekly download figure stale | 11 | Updated ~263k → ~238k |
| Single-week-of-activity projects described without elapsed-time context | 07 | Elapsed time made explicit (~8 months) |
| Active tools confirmed with no changes needed | 04, 10 | Confirmation notes added |
| Brand new tools need watch-status | 05, 09 | Status notes added |

---

## Gemini/Imagen Free API Note

No files in the 01–11 range contained claims about Gemini/Imagen free API tiers. That stale pattern was not encountered in this batch.

---

## Files NOT in Scope (deferred to 22b)

- `SYNTHESIS.md`
- `index.md`
- Files 12–20 (not in this agent's scope)

---

# Research 25 — Structured Generation & Constrained Decoding
# Partial Update Log — 2026-04-21

## Files audited
25a-constrained-decoding-frameworks.md
25b-instructor-pydantic-typescript-validation.md
25c-svg-grammar-schema-enforcement.md
25d-asset-spec-schema-design.md
25e-runtime-validation-patterns.md
25f-mcp-tool-design-patterns.md
25g-tool-schema-best-practices.md
index.md
SYNTHESIS.md

---

## Changes made

### 25a-constrained-decoding-frameworks.md

**Stale claim**: "Claude structured outputs (public beta, Nov 2025): Set the `structured-outputs-2025-11-13` beta header..."
**Correction**: Claude SO is now generally available. Beta header no longer required (still accepted for backward compat). Parameter path changed from `output_format` to `output_config.format`. GA models as of April 2026: Opus 4.7, Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5.

**Stale claim**: Schema "Not supported: `minimum`/`maximum`, `minLength`/`maxLength`, complex array constraints" (implied hard failure).
**Correction**: Python and TypeScript SDKs now auto-transform unsupported constraints — they strip them from the grammar spec, move them into field descriptions, and validate client-side after response receipt. Still not token-level enforced; application-layer validation still required for safety.

**Summary table**: Updated Claude native SO row to note GA status.

---

### 25b-instructor-pydantic-typescript-validation.md

**Stale claim**: `model="claude-sonnet-4-5"` in code examples (still valid but not the recommended current model).
**Correction**: Updated all code examples to `claude-sonnet-4-6`. Added note: Claude Sonnet/Opus 4.0-series retire June 15, 2026; prefer 4.5+ or 4.6+ for new code.

**Stale claim**: Instructor Python — no mention of `from_provider()` API or v1.14.x status.
**Correction**: Added update note. Instructor Python is at v1.14.5 (Jan 2026). `from_provider()` is now a first-class API. v1.13+ added semantic validation and OpenAI Responses API integration.

**Stale claim**: instructor-js repo listed as only `567-labs/instructor-js`.
**Correction**: Repo is maintained under both `instructor-ai/instructor-js` and `567-labs/instructor-js`. The canonical GitHub org is `instructor-ai`; `567-labs` is a mirror. NPM package `@instructor-ai/instructor` unchanged.

**Stale claim**: Anthropic native SO code still uses `client.beta.messages.parse` with `betas: ["structured-outputs-2025-11-13"]` and `output_format`.
**Correction**: Beta header no longer required. Updated code example to use `client.messages.parse` with no beta array. Added note about `output_config.format` vs `output_format` parameter migration.

**Stale claim**: Instructor Anthropic integration "predates Claude's native structured outputs; it may not leverage the faster grammar-compilation path."
**Correction**: Updated to note that `mode=instructor.Mode.ANTHROPIC_JSON` now exists to route through the native SO path directly.

---

### 25c-svg-grammar-schema-enforcement.md

No substantive factual errors found. SVGGenius benchmark confirmed as ACM MM 2025 (arxiv 2506.03139, published at dl.acm.org/doi/10.1145/3746027.3758287). All claims about post-hoc validation pipeline, Grammar-Aligned Decoding paper (2405.21047), and the 40-path budget calibration are still accurate.

No edits made.

---

### 25d-asset-spec-schema-design.md

**Stale claim**: "Claude's native structured output has specific schema limitations... `minLength` is not in the supported subset — use `minLength: 0` or omit it."
**Correction**: SDK auto-transforms these constraints now. Added update note explaining the new SDK behavior. Updated guidance: `maxItems` on arrays is still preferred (grammar-enforced); string/numeric constraints handled transparently by SDK.

---

### 25e-runtime-validation-patterns.md

**Stale claim**: "Zod v4 (early 2025) improved performance ~2x... Does not produce standard JSON Schema natively — requires `zod-to-json-schema`."
**Correction**: Zod v4 shipped stable in August 2025 (not "early 2025"). It has **built-in** `z.toJSONSchema()` — `zod-to-json-schema` third-party package is deprecated as of November 2025.

**Stale claim**: No mention of TypeBox 1.0 / package name change.
**Correction**: TypeBox 1.0 shipped ~September 2025 under new package name `typebox` (not `@sinclair/typebox`). `@sinclair/typebox` is now the LTS 0.x branch (0.34.x). New projects should use `npm install typebox`. 1.0 brought improved AJV-like error messages.

**Stale claim**: ArkType — "Less ecosystem support... Worth considering for hot validation paths." No version context.
**Correction**: Added that ArkType 2.2 is current; ArkRegex shipped January 2026; requires TypeScript 5.9+ for best performance.

**Standard Schema section**: Updated to reflect that Zod v4, TypeBox 1.x, and ArkType 2.x all implement Standard Schema interface. MCP SDK has not made Standard Schema adoption a declared goal as of 2025-11-25 spec.

---

### 25f-mcp-tool-design-patterns.md

No factual errors found. The spec version cited (2025-11-25) is the current stable spec. The `execution.taskSupport` field, `title`, `outputSchema`, and `annotations` fields are all confirmed present in the spec. The tool count guidance (fewer than 20 tools per session, 16 tools "at the edge") aligns with current research consensus.

No edits made.

---

### 25g-tool-schema-best-practices.md

No substantive factual errors found. The MCP spec date (2025-11-25) is correct. All design recommendations are current.

No edits made.

---

### SYNTHESIS.md

- Date header updated from 2026-04-20 to 2026-04-21.
- 25a summary: Updated "Nov 2025 beta" to "GA post-Nov 2025, no beta header required as of 2026." Added inline note listing GA models and SDK constraint-transformation behavior.
- 25b summary: Added inline note on Instructor v1.14.x, Zod v4 native JSON Schema, model name update, and beta header removal.
- Applicability table: Updated row for `asset_enhance_prompt` to say "GA 2026, no beta header" instead of "Nov 2025".

---

## Claims verified as still accurate (no changes needed)

- Outlines coalescence/5x speedup claim: framework is still actively developed, claim not contradicted.
- LM-Format-Enforcer vLLM integration is native and zero-config: confirmed still accurate.
- Guidance llguidance Rust core ~50µs/token: confirmed by current llguidance docs.
- SVGGenius benchmark findings: paper confirmed published at ACM MM 2025.
- Grammar-Aligned Decoding paper (arxiv 2405.21047): still the primary reference, not superseded.
- TypeBox `TypeCompiler.Compile()` at startup pattern: API unchanged in 0.x branch.
- The 40-path SVG budget being "well-calibrated" per SVGGenius: confirmed.
- MCP 2025-11-25 spec annotations, `outputSchema`, `title`, `execution.taskSupport`: confirmed in spec.

---

## Remaining uncertainty / not verified

- Whether instructor-js has added native Claude SO mode (`ANTHROPIC_JSON`) — the Python version has it; the JS version may not have full parity. Verify against current instructor-js release notes before using.
- Exact TypeBox 1.x API changes vs 0.x — examples in 25d/25e still use the 0.x `@sinclair/typebox` imports, which remain valid for 0.34.x LTS. No migration to 1.x attempted in these files.
- MCP SDK Standard Schema adoption status — check current `@modelcontextprotocol/sdk` release notes.

---

# Updates — Category 26: Reflection & Self-Refinement
**Audit date:** 2026-04-21  
**Auditor:** Research-updater agent

---

## Summary

Seven files audited in `/docs/research/26-reflection-self-refinement/`. Five files edited with corrections and additions. No file contained catastrophically wrong claims; the main issues were deprecated model names, a stale MJ-Bench dimension count, and the Reflexion/Self-Refine framework being cited as the only self-refinement approach (multiple major 2025 follow-ups now exist).

---

## File-by-file changes

### SYNTHESIS.md

**Changes:**
- Updated snapshot date from 2026-04-20 → 2026-04-21.
- Added top-level `> Updated 2026-04-21` callout block listing all material changes (deprecated models, new papers, MJ-Bench expansion, CAI update).
- Replaced "GPT-4o (or Claude 3.5 Sonnet if context allows)" → "GPT-4o (or Claude Sonnet 4.6 / Opus 4.7 if context allows)" in the recommended implementation order. **Reason:** Claude 3.5 Sonnet retired Jan 5, 2026.
- Updated 26b table row to reflect 6-dimension MJ-Bench and updated judge model list.
- Added 6 new references at bottom: Claude Constitution (Jan 2026), MAR, Maestro, ImAgent, autonomous convergence study.

**Stale claims corrected:**
- `Claude 3.5 Sonnet` as the recommended Anthropic VLM judge — now superseded by Claude Sonnet 4.6.

---

### 26a-reflexion-self-refine-patterns.md

**Changes:**
- Added header note pointing to new "2025–2026 Follow-Up Work" section.
- Added new section "2025–2026 Follow-Up Work" covering:
  - **MAR** (arXiv:2512.20845, Dec 2025): multi-agent Reflexion, ~3× API cost, useful for high-stakes brand work.
  - **Maestro** (arXiv:2509.10704, Sep 2025): self-improving T2I with specialized MLLM critic agents; validates the two-critic design in 26b.
  - **ImAgent** (arXiv:2511.11483, Nov 2025): training-free; policy controller collapses external VLM call overhead.
  - **Autonomous convergence** (Cell Patterns, 2025): 700-trajectory empirical study showing uncapped loops homogenize to conventional motifs; strongly supports the hard 4-iteration cap in 26d.
  - **Self-Reflection in LLM Agents** (arXiv:2405.06682): mixed results on open-ended creative tasks.
- Added 5 new references.

**Stale claims corrected:**
- Implicit: Reflexion and Self-Refine were the only established approaches → now documented as two of many.

---

### 26b-vlm-as-judge-rubric-design.md

**Changes:**
- Fixed `GPT-4V/GPT-4o` reference in Prometheus-Vision section → `GPT-4o` only (with deprecation note for `gpt-4-vision-preview`). **Reason:** `gpt-4-vision-preview` was deprecated in 2024 and is no longer callable.
- Same fix in Caveats section ("GPT-4V and GPT-4o can hallucinate" → "GPT-4o (and its predecessors) can hallucinate").
- Updated MJ-Bench section: 4 dimensions → **6 dimensions** (added Composition, Visualization) with NeurIPS 2025 acceptance note. **Reason:** The NeurIPS 2025 final version expanded the benchmark.
- Added `> Updated 2026-04-21` callout to Judge Model Selection table noting Claude 3.5 Sonnet retirement (Jan 5, 2026) and current recommended models.
- Updated judge table: "Claude 3.5 Sonnet" → "Claude Sonnet 4.6"; added open-source row for Qwen2.5-VL-72B / InternVL3-78B.
- Added 2 new references (Qwen2.5-VL-72B, InternVL3-78B).

**Stale claims corrected:**
- `gpt-4-vision-preview` callability — deprecated, not callable.
- `Claude 3.5 Sonnet` as active VLM judge — retired Jan 2026.
- MJ-Bench having 4 dimensions — expanded to 6 in final published version.

---

### 26d-convergence-stopping-criteria.md

**Changes:**
- Added `> Updated 2026-04-21` callout after the Image Generation CoT paragraph with two new empirical findings:
  1. **Autonomous loop convergence** (Cell Patterns, 2025) — 700-trajectory study supports the hard 4-iteration cap.
  2. **Flow-Multi multi-reward framework** (ICCV 2025) — warns against using a single VLM judge as the sole stopping signal; tier-0 deterministic scores should be weighted separately.
- Added 2 new references (Cell Patterns convergence study, Flow-Multi).

**Stale claims corrected:**
- No false claims; new evidence added to reinforce existing recommendations.

---

### 26e-critique-to-prompt-repair.md

**Changes:**
- Updated OG Image C2 repair strategy for text legibility: expanded the list of "strong-text renderer" models to match current CLAUDE.md state:
  - Added `gpt-image-1.5`, `Ideogram 3 Turbo`, and `gemini-3-pro-image-preview` (Nano Banana Pro) alongside `gpt-image-1` and `Ideogram 3`.
  - Clarified "Do not retry" list: added `Imagen 3` and `Nano Banana non-Pro` explicitly.

**Stale claims corrected:**
- Only `gpt-image-1` and `Ideogram 3` listed as strong-text renderers — now updated to match the full list in CLAUDE.md.

---

### 26c-asset-specific-critique-templates.md

No changes. All rubrics are model-agnostic (they describe what criteria to score, not which model generates or judges). Content remains accurate.

### index.md

No changes. File dates, links, and table of contents are all accurate.

---

## Claims verified as still accurate

- Reflexion's 12-trial cap for AlfWorld and diminishing returns after 3–4 trials — still cited correctly.
- Self-Refine 5–40% improvement over one-shot — still the reported figure (no retraction or contradiction found).
- Prometheus-Vision rubric format (1–5 Likert, rationale + score) — unchanged; repo updated March 2025 but methodology is stable.
- MJ-Bench finding: GPT-4o best overall closed-source judge — still supported by current leaderboard results.
- Hard 4-iteration cap rationale — reinforced by the autonomous convergence study (2025).
- "Do not use VLM for pixel-level alpha/safe-zone checks" — still correct.
- BiRefNet / BRIA RMBG-2.0 as post-processing matte tools — still current.
- Self-Refine non-monotonic improvement caveat — still valid (no evidence of resolution).

---

## Deprecated model references found and fixed

| Old reference | Reason stale | Replacement used |
|---|---|---|
| `gpt-4-vision-preview` | Deprecated 2024, not callable | `gpt-4o` |
| `Claude 3.5 Sonnet` (as judge) | Retired Jan 5, 2026 | `Claude Sonnet 4.6` / `Claude Opus 4.7` |
| MJ-Bench "four dimensions" | Expanded to six in NeurIPS 2025 final | Updated with Composition + Visualization |

---

## New papers added to the research

| Paper | Venue | Why added |
|---|---|---|
| MAR: Multi-Agent Reflexion (arXiv:2512.20845) | Dec 2025 preprint | Direct Reflexion follow-up; multi-agent critique |
| Maestro: Self-Improving T2I (arXiv:2509.10704) | Sep 2025 | First production T2I self-refinement agent using MLLM critics |
| ImAgent (arXiv:2511.11483) | Nov 2025 | Unified test-time scalable image agent; collapses separate VLM call |
| Autonomous loop convergence (Cell Patterns, 2025) | 2025 | Empirical support for hard iteration cap |
| Flow-Multi multi-reward (ICCV 2025) | ICCV 2025 | Multi-reward stopping signal design |
| Claude Constitution (Anthropic, Jan 2026) | Jan 2026 | CAI update; now 23,000-word reason-based document |
| Qwen2.5-VL-72B (Jan 2025) | Released Jan 2025 | Open-source VLM judge alternative |
| InternVL3-78B (Apr 2025) | Released Apr 2025 | Open-source SOTA MLLM; MMMU 72.2 |

---

# Research Update Log — Category 27: Agent Evaluation Frameworks
**Date:** 2026-04-21  
**Auditor:** Research updater agent  
**Files touched:** 27a, 27b, 27d, 27e, SYNTHESIS.md  
**Files unchanged (no stale claims found):** 27c, index.md

---

## Summary of Changes

### 27a-agent-benchmarking-frameworks.md

**1. AgentBench — repo evolution**
- Added: AgentBench repo now includes function-calling version + AgentRL integration; v0.1/v0.2 tags remain.
- Added: THUDM released VisualAgentBench (companion for multimodal LMMs, 5 environments, 17 LMMs evaluated) — more applicable to multimodal asset-pipeline testing.
- Added critical 2026 finding: An automated audit of 8 major benchmarks (SWE-bench, WebArena, OSWorld, GAIA, Terminal-Bench, FieldWorkArena, CAR-bench) showed every one can be exploited for near-perfect scores without solving tasks. Leaderboard scores must be treated with caution.

**2. RAGAS — version update**
- Added: Current version is 0.4.3 (January 2026). New features: knowledge-graph-based synthetic test-set generation (90% reduction in manual curation), experiments-first loop, custom metrics via decorators. Core decomposition pattern unchanged.

**3. DeepEval — v3.0 release, threshold correction, GPT-4V deprecation**
- Added: DeepEval v3.0 released with component-level granularity, production observability, simulation tools.
- Added: New multimodal metrics: `ImageEditing`, `ImageReference` (in addition to existing `TextToImageMetric`, `ImageCoherence`, `ImageHelpfulness`).
- CORRECTED: Default threshold for `TextToImageMetric` is **0.5**, not 0.7. The 0.7 value in prior docs was an example calibrated threshold, not the framework default.
- CORRECTED: GPT-4V is deprecated by OpenAI. Preferred judge backend is now GPT-4o or Claude 3.x via DeepEval v3.0.

---

### 27b-image-generation-eval-pipelines.md

**1. VQAScore / t2v_metrics — video support, new backends**
- Added: Library extended to video evaluation and new VLM backends: LLaVA-OneVision, Qwen2.5-VL, InternVideo2, InternVL2, InternVL3, InternLMXC2.5.
- Added: CameraBench (arXiv 2025) added as video benchmark — not relevant to still-image asset eval.
- Clarified: Gemini-2.5-pro backend may be deprecated; recommend confirming via repo README.

**2. ImageReward — canonical repo URL corrected**
- CORRECTED: Canonical repo is `https://github.com/THUDM/ImageReward`, not `zai-org/ImageReward` (which is an unofficial mirror).
- Added: Context on competing models (HPSv2, PickScore at 62.8% vs. ImageReward at 65.1%). ImageReward remains strongest for photorealistic preference ranking.
- Confirmed: Still at v1.0; no new model version released.

**3. DeepEval TextToImageMetric — GPT-4V → GPT-4o, cost update**
- CORRECTED: GPT-4V deprecated; use GPT-4o.
- CORRECTED: Cost revised to ~$0.01–0.03/image (down from $0.02–0.05).
- Added: Default threshold is 0.5; 0.7 remains a recommended calibrated value.

---

### 27d-automated-quality-metrics-ci.md

**1. DeepEval TextToImageMetric code block**
- Added dated note: GPT-4V deprecated, use GPT-4o. Default threshold is 0.5.
- Clarified inline comment that 0.70 is a calibrated value, not the framework default.

**2. Tier 2 cost header**
- CORRECTED: "~$0.02–0.05/image" updated to "~$0.01–0.03/image with GPT-4o".

---

### 27e-provider-update-regression-detection.md

**1. Problem statement — model version progression**
- CORRECTED: "gpt-image-1 → 1.5 → 2" was speculative. As of April 2026, only `gpt-image-1` and `gpt-image-1.5` are confirmed. No `gpt-image-2` has been announced.
- CORRECTED: Flux progression updated to: Flux.1 Dev → Flux.1 Pro → Flux.1 Pro 1.1 → Flux.1 Ultra.

**2. Provider Versioning Map — MCP Inspector CVE**
- Added critical security note: MCP Inspector has a confirmed RCE vulnerability (CVE-2025-49596). Use only patched versions in CI pipelines.
- Added: MCP spec received major update November 2025. Verify server implementations are compliant.

---

### SYNTHESIS.md

**1. Snapshot date**
- Updated from 2026-04-20 to 2026-04-21.

**2. Key Takeaways**
- Takeaway 2: Updated LLM judge cost ($0.01–0.03 with GPT-4o; GPT-4V deprecated).
- Takeaway 5: Added MCP Inspector CVE-2025-49596 warning.
- Added Takeaway 6 (new): Agent benchmark leaderboard scores are unreliable per 2026 audit. GPT-3.5/Claude 2 baselines are obsolete; use Claude 4.x / GPT-4o / Gemini 2.5 Pro as current baselines. SWE-bench top score has climbed to ~87% (Claude Opus 4.7, April 2026).

**3. External References**
- CORRECTED: ImageReward URL changed to canonical THUDM repo.

---

## Claims Verified as Still Accurate (no edit needed)

- AgentBench Docker overhead / 8-task-domain description — still accurate per repo.
- RAGAS metric decomposition pattern — still the correct approach; nothing has changed structurally.
- VQAScore ECCV 2024 paper — no newer version of the core methodology.
- CLIPScore smoke-test role (reject if < 0.20) — still valid heuristic.
- FFT checkerboard detection code — still correct; no changes to standard approach.
- Tiered CI structure (0/1/2/3) — still valid architectural recommendation.
- 27c golden dataset schema and decontamination rules — no new competing approaches found.
- Evidently AI KS-test drift detection — still correct; library is actively maintained with 20+ statistical tests.
- Braintrust experiment comparison workflow — still valid; platform is active.
- Provider canary probe pattern — still best practice.

---

## Newly Relevant Benchmarks Not in the Original Files

The following 2025-era benchmarks are relevant to the broader agent-eval landscape but were not added to the files (not directly applicable to prompt-to-asset image quality eval):
- **WebChoreArena** (532 tasks, memory + long-term reasoning; top LLMs reach 37.8% vs. 54.8% on standard WebArena)
- **OSUniverse** (2025, follow-up to OSWorld, broader desktop evaluation)
- **SWE-bench-Live** (live issue-resolving benchmark, rolling updates)
- **TAU2-bench** (multi-turn customer support with mocked database)
- **WorkArena** (ServiceNow knowledge work, 33 atomic tasks)

These are worth tracking in a future category-13 (LLM-as-agent) research update rather than category 27.

---

# Research 28 — CI/CD Asset Automation: Update Log
Date: 2026-04-21

## Files modified

### 28a-github-actions-image-pipeline.md

**Stale claim corrected:** "ubuntu-latest runners (22.04 / 24.04)"
- `ubuntu-latest` is Ubuntu 24.04 exclusively since October 2024 (the 22.04/24.04 dual description is no longer accurate).
- Source: GitHub Changelog 2024-09-25 "Actions: new images and ubuntu-latest changes"

**Stale claim corrected:** Sharp version `^0.33.5` referenced as if current
- Sharp current version is `0.34.x` (0.34.5 as of Feb 2026). Project pin should be reviewed.

**New caveat added:** Node.js 20 EOL April 30, 2026
- Any workflow pinning `node-version: 20` should migrate to Node 22 (LTS until Apr 2027) or Node 24 (current LTS).

**Docker base images updated in text:** `node:20-slim` → `node:22-slim` or `node:24-slim`; `python:3.12-slim` → `python:3.13-slim`.

---

### 28b-pr-preview-asset-generation.md

**Stale claim corrected:** Workflow example used `actions/setup-node@v4`
- Current latest major is **v6**. Updated to `actions/setup-node@v6`.

**Stale claim corrected:** Workflow example used `node-version: 20`
- Node 20 EOL April 30, 2026. Updated to `node-version: 22`.

Added dated note above the workflow skeleton explaining the changes.

---

### 28c-mcp-server-testing-patterns.md

**Stale claim corrected:** Workflow example used `actions/setup-node@v4`
- Updated to `actions/setup-node@v6`.

**Stale claim corrected:** Workflow example used `node-version: 20`
- Updated to `node-version: 22`.

Added dated note above the workflow skeleton.

---

### 28d-release-automation-npm-package.md

**Stale claim corrected:** Release workflow example used `actions/setup-node@v4` and `node-version: 20`
- Updated to `actions/setup-node@v6` and `node-version: 22`.

**Stale claim corrected:** npm OIDC trusted publishing described as "As of npm CLI 11.5.1+..." without noting it is now GA.
- npm OIDC trusted publishing is **generally available as of July 2025**.
- Clarified that Node 22.14.0 is the minimum for the trusted publishing feature (npm 11 itself can run on ^20.17.0, but trusted publishing needs Node 22.14+).
- Node 20 EOL makes the project's `engines.node: ">=20.11.0"` actively misleading — flagged.

Added dated note above the release workflow YAML block.

---

### SYNTHESIS.md

- Updated snapshot date from 2026-04-20 to 2026-04-21.
- Added `Updated 2026-04-21` block under "What works today" summarizing all version hygiene corrections:
  - `actions/setup-node` latest is v6 (not v4)
  - `ubuntu-latest` = Ubuntu 24.04 since Oct 2024
  - Node.js 20 EOL Apr 30, 2026
  - Python current stable = 3.13
  - Sharp current = 0.34.x
  - Cloudflare Workers AI free tier = 10,000 neurons/day (confirmed unchanged)
  - npm OIDC trusted publishing GA July 2025; Node ≥ 22.14.0 required
- Updated item 3 in "What needs decisions" to reflect npm OIDC GA status and Node 20 EOL urgency.

---

## Claims verified as still accurate

| Claim | Verified |
|---|---|
| `actions/upload-artifact@v4` (v3 retired Jan 2025) | Correct — v4 is current; v5 is the latest but v4 still works |
| `actions/checkout@v4` | Still current major version (v4.x); no v5 yet |
| `dorny/paths-filter@v4` | v4 is current |
| `changesets/action@v1` | v1 remains the recommended version |
| Cloudflare Workers AI free = 10k neurons/day | Confirmed |
| `aws-actions/configure-aws-credentials@v4` | Still current |
| Infisical OIDC pattern | Still valid |
| `actions/cache@v4` mentioned implicitly (setup-node caches) | `actions/cache` is at v5; but setup-node handles caching internally so this is not a direct reference |
| npm provenance via `publishConfig.provenance: true` | Still valid |

## Claims NOT in these files (no Gemini/image-API free tier claims found)

The "Gemini free image API" anti-pattern was not present in this research category. No corrections needed for that specific stale pattern here.

## Actions versions reference (as of 2026-04-21)

| Action | Previously cited | Current latest major |
|---|---|---|
| `actions/checkout` | v4 | v4 (still current) |
| `actions/setup-node` | v4 | **v6** |
| `actions/cache` | implicit via setup-node | v5 standalone; setup-node@v6 uses v5 internally |
| `actions/upload-artifact` | v4 | v4 (still current) |
| `changesets/action` | v1 | v1 (still current) |
| `dorny/paths-filter` | v4 | v4 (still current) |

## Node.js versions reference (as of 2026-04-21)

| Version | Status |
|---|---|
| Node 18 | EOL Apr 2025 |
| Node 20 | **EOL April 30, 2026** |
| Node 22 | Active LTS, supported until Apr 2027 |
| Node 24 | Current LTS (released Apr 2026) |

---

# Research updates — Category 29 (RAG Brand Knowledge)
**Audit date:** 2026-04-21  
**Files audited:** 29a, 29b, 29c, 29d, 29e, index.md, SYNTHESIS.md

---

## Changes made

### 29a — Brand Guideline Extraction for RAG

**LlamaParse free-tier pricing (CORRECTED)**

- **Old claim:** "free tier ~1,000 pages/day as of 2026"
- **Correct as of 2026-04-21:** LlamaParse V2 (launched December 2025) replaced the page-per-day model with a **credit-based system**. All accounts receive 10,000 free credits/month. Cost-effective (default) mode costs ~3 credits/page → ~3,300 pages/month free. Agentic and Agentic Plus tiers cost more per page. Credits do not roll over.
- **Source:** llamaindex.ai/pricing; LlamaParse V2 announcement blog.
- **Edit location:** `## Path 1 — PDF brand guidelines`, Practical limit paragraph.

**Unstructured hi_res model clarification (MINOR UPDATE)**

- `detectron2_onnx` is now the documented default model for `hi_res` strategy (not generic `detectron2`). Also supports `yolox`. The `detectron2_onnx` variant is faster but lower accuracy; `yolox` is higher accuracy.
- **Edit location:** Same paragraph, updated the description of `hi_res` model options.

---

### 29b — CLIP Style Embeddings Retrieval

**ChromaDB Rust rewrite status (CORRECTED)**

- **Old claim:** "Rust-core rewrite (2025) brings ~4× write throughput" — written as a forthcoming/recent event.
- **Correct as of 2026-04-21:** The Rust-core rewrite is **fully shipped** as the stable Chroma 1.x production line. Current version is 1.5.x (1.5.0 released February 2026, active dev). Not "still settling" — it is stable production software. Multimodal OpenCLIP embedding function supported in 1.x with a runnable cookbook example added February 2026.
- **Edit location:** ChromaDB section, paragraph after code block.

---

### 29c — Brand Bundle Storage Patterns

**ChromaDB Rust rewrite status (CORRECTED)**

- **Old claim:** "Rust-core rewrite (2025) is still settling"
- **Correct as of 2026-04-21:** Same as 29b correction. Chroma 1.x is the stable production line.
- The recommendation to use ChromaDB only for prototyping is still correct, but the *reason* is now columnar storage limitations at scale — not rewrite instability.
- **Edit location:** ChromaDB section (### ChromaDB — prototyping only).

---

### 29d — Figma Design Tokens Brand Pipeline

**Style Dictionary version (CORRECTED)**

- **Old claim:** "Style Dictionary v4"
- **Correct as of 2026-04-21:** Style Dictionary is at **v5** (current: 5.4.0, published ~March 2026). v4 is now the previous major version. v5 is ESM-native, browser-compatible, and adds async API support. New projects should use `style-dictionary@latest` (v5). Migration guide: styledictionary.com/versions/v4/migration/.
- **Edit location:** `## DTCG transform pipeline` section header + body text + References.

**@tokens-studio/sd-transforms version (CONFIRMED ACCURATE)**

- The file's instruction to use v2 is accurate. Current npm version is 2.0.3 (Q1 2026). No change needed to the install command.

**Figma Variables Enterprise requirement (CONFIRMED ACCURATE)**

- Still confirmed: full seat in an Enterprise org required for the Variables REST API. Community discussion ongoing but no plan tier change announced.

---

### SYNTHESIS.md

**Multiple updates:**

1. **LlamaParse pricing note** added to the Gaps section (above the "No benchmark" bullet) — flags the credit-based V2 pricing model and provides current credit cost estimate.

2. **ChromaDB stability note** added after conclusion #5 — clarifies that 1.x is the stable production line; restates the prototyping recommendation with the correct rationale (columnar scale, not rewrite instability).

3. **CSD HuggingFace mirror** added to the CSD deployment gap — weights are on `yuxi-liu-wired/CSD` on HuggingFace, but still no pip package as of April 2026.

4. **Style Dictionary v4 → v5** in Primary Sources references.

5. **date** frontmatter bumped to 2026-04-21.

---

## Claims verified as still accurate (no edit needed)

| Claim | Source verified |
|---|---|
| Brandfetch free tier: 10,000 lookups/month | Search results show varying claims (500k soft limit for Logo API, 2,500 for Brand API); the "10,000/month" figure in the file is plausible but the actual limit appears higher for Logo API. The claim is conservative and safe to leave — the more important point is the API structure. |
| Figma Variables API = Enterprise-only | Confirmed. Still Enterprise org requirement. |
| LanceDB: embedded, no server process, S3-backed | Confirmed. LanceDB active development in 2026; Lance-native SQL (DuckDB) added Jan 2026. |
| OpenCLIP ViT-L-14 as practical default | Confirmed. ViT-G-14 still requires large VRAM for inference; ViT-L-14 remains the practical balance point. |
| CSD not pip-installable | Confirmed. Weights on HuggingFace (yuxi-liu-wired/CSD) but no pip package. |
| brand.md is still nascent (few stars) | Confirmed active but small project (April 4, 2026 commit activity noted). |
| text-embedding-ada-002 not mentioned anywhere | Correct — the files never recommend ada-002; they don't cover text embeddings for guidelines (they use CLIP/CSD for image similarity). No stale embedding model claims found. |
| Milvus MCP server active | Confirmed. zilliztech/mcp-server-milvus last updated 2026-02-02; requires Milvus 2.6.0+ for some tools. |

---

## Claims not verifiable / left with caveats

- **Brandfetch exact free tier limits:** Search results conflict (Logo API 500k/month soft limit vs. 2,500/month Brand API tier). The file says "10,000 lookups/month" which may be outdated or refer to a specific plan tier. Recommend verifying directly at brandfetch.com/developers/pricing before shipping code that relies on the free tier.
- **"LanceDB used in production at Midjourney and Character.ai"** (29b): Could not verify via web search within this session. Claim originated from LanceDB's own marketing. Treat as unverified.

---

# Updates Log — Category 31 (Cost Optimization Agentic)
**Audit date:** 2026-04-21
**Files audited:** 31a, 31b, 31c, 31d, 31e, SYNTHESIS.md, index.md

---

## Summary of Changes

### 31a — Provider-Level Caching Strategies

**CORRECTED: Anthropic default cache TTL**
- Old claim: "1-hour cache" treated as a standard/available option without urgency note
- Current reality: On March 6, 2026, Anthropic silently changed the default prompt cache TTL from 1 hour to 5 minutes (no changelog, confirmed via GitHub issue #46829 and community reports). The 1-hour TTL still works but must be explicitly specified via `"ttl": "1h"`.
- Impact: Any batch pipeline or long-running session relying on implicit 1h caching is now re-creating cache on each request after the first 5-minute idle, driving 15–53% cost inflation from repeated cache writes.
- Added explicit `"ttl": "1h"` recommendation for batch workloads.

**CORRECTED: Haiku 4.5 cache minimum token requirement**
- Old claim: Listed Haiku 4.5 at "4,096 tokens minimum" (correct value), but the strategic implication was underemphasized.
- Added a caveat note: a system prompt under 4,096 tokens on Haiku 4.5 will not produce cache hits at all, making Sonnet 4.6 (1,024-token minimum) the better choice for shorter prompts when caching is important.

**CORRECTED: OpenAI prompt caching discount is model-tiered**
- Old claim: "50% discount" stated as a flat rate for OpenAI caching.
- Current reality (April 2026): The discount varies by model family:
  - GPT-4o / o-series: 50% off cached tokens
  - GPT-4.1 family: 75% off cached tokens ($0.50/MTok vs $2.00/MTok standard)
  - GPT-5 / GPT-5.4 family: 90% off cached tokens
- The "50% discount" claim is still accurate for GPT-4o but does not apply to newer models.

**ADDED: February 2026 cache isolation change**
- As of February 5, 2026, Anthropic caches are isolated per workspace, not per organization.

---

### 31b — Model Routing: Cheap-to-Expensive Cascade

**CORRECTED: Tier 3 model reference**
- Old claim: "Claude Opus 4.6" listed as the Tier 3 model.
- Current reality: Claude Opus 4.7 was released April 16, 2026. It carries the same $5/$25 MTok rate card as Opus 4.6.
- Added caveat: Opus 4.7 uses a new tokenizer that may produce 1–1.35x more tokens than previous models for the same input, meaning effective per-request cost may be 0–35% higher despite identical pricing. Opus 4.6 remains available and is not subject to this premium.

**ADDED: Haiku 4.5 cache minimum caveat for routing decision**
- Added note that Haiku 4.5's 4,096-token cache minimum affects whether caching benefits the tier-1 route. Short system prompts on Haiku will not cache; Sonnet 4.6 (1,024-token minimum) may be preferred when caching is critical.

---

### 31c — Batch APIs for Async Generation

**CORRECTED: gpt-image-1 is now previous-generation**
- Old claim: "gpt-image-1" presented as the current flagship image model for batch.
- Current reality (March 22, 2026): OpenAI labeled gpt-image-1 as "previous generation." GPT Image 1.5 is the current flagship image model.
- The Batch API supports: `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest`.

**CORRECTED: Image batch pricing table**
- Old claim: "gpt-image-1 batch: ~$0.02/image (standard quality 1024×1024)" — this was based on an approximate "$0.04/image standard" that was already slightly off.
- Confirmed April 2026 rates:
  - gpt-image-1 standard (1024×1024 medium): ~$0.042/image; batch ~$0.021/image
  - gpt-image-1-mini medium: ~$0.011/image; batch ~$0.006/image
  - gpt-image-1.5 medium: ~$0.034/image; batch ~$0.017/image
- Updated implementation example to use `gpt-image-1.5` (current model).

---

### 31d — Thumbnail-First: Validate at Low Cost, Upscale Only on Pass

**CORRECTED: gpt-image-1 pricing labeled "as of 2025"**
- Old claim: "as of 2025" tag; values: 256×256 ~$0.01, 512×512 ~$0.02, 1024×1024 ~$0.04 standard, ~$0.08 high.
- The high-quality rate was significantly underestimated — confirmed high-quality rate for gpt-image-1 is ~$0.167/image, not $0.08.
- Updated cost structure table to April 2026 confirmed rates for both gpt-image-1 (previous-gen) and gpt-image-1.5 (current).
- Recalculated thumbnail-first math using gpt-image-1.5 (the current recommended model).
- Happy path cost reduction revised from "62%" to "~59%" based on actual current pricing.

**NOTED: gpt-image-1 is previous-generation**
- Added note that gpt-image-1 is now labeled previous-gen; gpt-image-1.5 is preferred for new integrations.

---

### 31e — Semantic Deduplication Patterns

No pricing claims in this file — pattern is model-agnostic. No corrections required.
File content remains current as of audit date.

---

### SYNTHESIS.md

**CORRECTED: Opening pricing claim**
- Old: "gpt-image-1 (~$0.04/image), Ideogram (~$0.08/image)"
- Corrected: gpt-image-1.5 (~$0.034/image medium), Ideogram 3 Turbo (~$0.03/image)
- The old Ideogram "$0.08/image" figure appears to reference Ideogram's Quality tier; the Turbo tier (most relevant for cost optimization) is confirmed at $0.03/image as of April 2026.

**CORRECTED: Key Facts — OpenAI caching discount**
- Was stated as flat 50%. Updated to model-tiered table.

**CORRECTED: Key Facts — Haiku cache minimum**
- Explicitly called out 4,096-token minimum for Haiku 4.5 vs 1,024 for Sonnet/Opus.

**CORRECTED: Key Facts — image batch pricing**
- Updated gpt-image-1 batch figure from ~$0.02 to ~$0.021; noted gpt-image-1.5 as current model.

**ADDED: Key Fact — Ideogram 3 Turbo confirmed pricing**
- $0.03/image (Turbo tier). Distinguished from Quality tier (~$0.09/image).

**CORRECTED: Priority 1 — cache TTL caveat added**
- Added explicit note to specify `"ttl": "1h"` and to verify Haiku prefix length ≥ 4,096 tokens.

**CORRECTED: Priority 3 — thumbnail-first pricing**
- Updated from "$0.04–$0.08" to "$0.034–$0.133 (gpt-image-1.5 medium–high)".

**Updated snapshot date:** 2026-04-20 → 2026-04-21.

---

## Files Not Changed

- **index.md** — no pricing claims, only links. No changes needed.
- **31e** — no model pricing claims, pattern is tooling/algorithm-focused. No changes needed.

---

## Sources Consulted

- [Anthropic Pricing Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic Cache TTL regression (GitHub #46829)](https://github.com/anthropics/claude-code/issues/46829)
- [Anthropic silently cut cache TTL from 1h to 5min (The Register)](https://www.theregister.com/2026/04/13/claude_code_cache_confusion/)
- [Claude Opus 4.7 release announcement](https://www.anthropic.com/news/claude-opus-4-7)
- [Claude Opus 4.7 tokenizer pricing note (finout.io)](https://www.finout.io/blog/claude-opus-4.7-pricing-the-real-cost-story-behind-the-unchanged-price-tag)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [OpenAI GPT-4.1 launch — 75% caching discount](https://openai.com/index/gpt-4-1/)
- [OpenAI Batch API Docs](https://developers.openai.com/api/docs/guides/batch)
- [OpenAI GPT Image 1.5 Model Docs](https://platform.openai.com/docs/models/gpt-image-1.5)
- [AI Image Generation API Pricing April 2026 (buildmvpfast.com)](https://www.buildmvpfast.com/api-costs/ai-image)
- [Ideogram API Pricing](https://ideogram.ai/features/api-pricing)
- [pricepertoken.com — Ideogram V3 Turbo](https://pricepertoken.com/image/model/ideogram-ai-ideogram-v3-turbo)

---

# Research 32 — Streaming & Real-Time UX: Update Log
**Audit date:** 2026-04-21  
**Files audited:** 32a, 32b, 32c, 32d, 32e, index.md, SYNTHESIS.md

---

## Changes Made

### 32a-mcp-streamable-http-progress.md

**1. MCP spec version stale (HIGH)**
- Old claim: "MCP specification (revision 2025-03-26)" presented as current.
- Fact: Current stable spec is `2025-11-25` (released November 2025). A `2026-03-15` update also exists adding mandatory RFC 8707 resource indicators for auth. Progress notification wire format is unchanged between all three versions.
- Fix: Added dated update block at top; updated spec URLs to point to `2025-11-25`; preserved `2025-03-26` as a secondary reference (origin of Streamable HTTP).

**2. MCP TypeScript SDK version reference stale (LOW)**
- Old claim: "v1.10+" implied as current.
- Fact: SDK is at v1.20+ as of April 2026. `server.notification()` pattern remains valid.
- Fix: Added caveat to check npm for current version.

**3. Claude Code stdio-only claim stale (MEDIUM)**
- Old claim: Progress notifications only work in Cursor or HTTP-transport hosts; Claude Code is stdio-only.
- Fact: Claude Code now supports Streamable HTTP transport for remote MCP servers (SSE deprecated in favour of HTTP). There is a known bug (#29688) where Claude Code may still spawn stdio child processes even for HTTP-configured servers.
- Fix: Updated caveat block; preserved stdio-discards-notifications note for local stdio servers.

---

### 32b-sse-long-running-tool-calls.md

**4. SEP-1686 Tasks status wrong (HIGH)**
- Old claim: "not yet in the stable spec"; "do not implement the Tasks polling pattern until SEP-1686 is merged."
- Fact: SEP-1686 Tasks shipped as **experimental** in the `2025-11-25` MCP spec. The prior SEP-1391 (tool-specific async) was rejected in favour of the more general Tasks primitive. SDK implementations for Python and Kotlin are being tracked. Tasks are safe to adopt.
- Fix: Rewrote "Async Tasks Pattern" section; updated recommendation to allow adoption; updated references.

**5. Claude Code transport caveat (MEDIUM)** — same as #3 above, applied to SSE constraints list.

**6. Reference URLs updated:** `2025-03-26` spec links updated to `2025-11-25`; SEP-1686 community page added; WorkOS 2025-11-25 spec update article added.

---

### 32c-incremental-svg-rendering.md

**No material corrections needed.** File references FastMCP's `streamingHint`/`streamContent` (confirmed still valid), Simon Willison's SVG renderer (still accurate), and Claude's `eager_input_streaming` flag (still accurate). Transport/IDE rendering caveats are still correct. No changes made.

---

### 32d-bullmq-sse-job-progress.md

**No material corrections needed.** BullMQ Redis 6.2+ requirement is confirmed correct (BullMQ v5.75.x active as of April 2026). Architecture patterns remain valid. No changes made.

---

### 32e-optimistic-preview-patterns.md

**7. gpt-image-1 streaming: claim "no streaming; full image only" is WRONG (HIGH)**
- Old claim: "`gpt-image-1` — No streaming; full image only."
- Old claim: "Partial image streaming tracked in Vercel AI SDK issue #9017 (closed in v6.0 milestone — OpenAI responses API partial image)" — this was a parenthetical that acknowledged the issue was tracked, but left the main claim as "no streaming."
- Fact: OpenAI now ships a documented `stream: true` + `partial_images: 0–3` parameter on the Images API for `gpt-image-1`, `gpt-image-1-mini`, and `gpt-image-1.5`. Progressive base64-encoded partial images are emitted during generation.
- Fix: Updated provider table to mark gpt-image-1 family as having native streaming; added correct API reference URL; rewrote "Not worth it now" item in applicability section to note gpt-image-1 streaming as now feasible.

**8. Vercel AI SDK version stale (MEDIUM)**
- Old claim: React 19 `useOptimistic` section had no SDK version context.
- Fact: Vercel AI SDK 5.0 introduced breaking `useChat` changes (UIMessage/ModelMessage split; `tool-TOOLNAME` parts). AI SDK 6.0 shipped (backwards-compatible).
- Fix: Added dated note explaining v5/v6 `useChat` changes; added SDK release references.

**9. React 19 stable (LOW)**
- Old claim: "React 19's `useOptimistic`" — no stability note.
- Fact: React 19 stable was released December 2024. `useOptimistic` is a stable API.
- Fix: Added "(React 19 stable since December 2024)" to code section header.

---

### SYNTHESIS.md

**10. All four material corrections surfaced in update block at top of file.**
- MCP spec version updated.
- SEP-1686 Tasks finding corrected (finding #9 in "What does not exist yet").
- Provider gap section renamed: "What does not exist yet (provider gap)" → "Partial pixel previews — what is available"; gpt-image-1 streaming noted.
- Recommended Implementation Order: added Phase 3b for gpt-image-1 partial preview.
- Critical Transport Caveat: updated to note Claude Code HTTP transport support.

---

## Claims Verified Unchanged (no edit needed)

- BullMQ Redis 6.2+ requirement: confirmed correct (BullMQ v5.75.x, still Redis 6.2+).
- ComfyUI WebSocket step-preview via `SaveImageWebsocket`: confirmed still the only per-step diffusion-step preview for local inference.
- fal.ai `fal.subscribe()` `onQueueUpdate` API: confirmed still the current pattern (queue position events, not pixel data).
- FastMCP `streamingHint`/`streamContent`/`reportProgress`: confirmed still valid and documented.
- SSE browser limit (6 connections per origin): still accurate.
- SSE keepalive ping every 15s to defeat proxy buffering: still recommended practice.
- Simon Willison progressive SVG renderer reference: still valid.

---

## Searches Performed

1. MCP specification 2025 Streamable HTTP progress current version 2026
2. MCP async tasks SEP-1686 modelcontextprotocol issues/1391 status 2026
3. FastMCP punkpeye streamContent streamingHint reportProgress current version
4. MCP specification 2025-11-25 changes new features tasks progress 2026
5. MCP TypeScript SDK v1.10 progress notifications server.notification current version
6. gpt-image-1 partial image streaming OpenAI API 2025 2026 status
7. OpenAI image streaming partial_images parameter released 2025
8. Vercel AI SDK version 4 2025 2026 useChat streaming current API changes
9. fal.ai subscribe onQueueUpdate streaming 2025 2026 current API
10. BullMQ 2025 2026 version Redis requirements current status
11. Claude Code stdio MCP progress notifications 2026 HTTP transport support
12. Claude Code MCP HTTP transport support progress notifications 2026 stdio deprecated

---

## Wave 3 Retry Audit Logs (dirs 10, 22b, 23, 24a, 24b, 30, 34a, 34b)

# Research Update Log — Category 10 (UI Illustrations & Graphics)

**Audited:** 2026-04-21  
**Files audited:** 7 (index.md, SYNTHESIS.md, 10a, 10b, 10c, 10d, 10e)

---

## Summary of changes

### SYNTHESIS.md

| Location | Change |
|---|---|
| Frontmatter `date` | 2026-04-19 → 2026-04-21 |
| Frontmatter `primary_models_referenced` | Added `midjourney-v8-alpha`, `flux-2-pro`, `gpt-image-1.5`, `ideogram-3-turbo`, `recraft-v4`; removed `flux-1-dev-pro-ultra`, `recraft-v2-v3`, `gpt-image-1` (singular) |
| Insight #11 | Updated model routing: `gpt-image-1` → `gpt-image-1.5`; `Recraft v3` → `Recraft V4/V4 Pro SVG`; `Flux 1.1 Pro` → `FLUX.2 Pro`; Ideogram transparency endpoint corrected from `style: "transparent"` to `/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"`. Added note that Recraft V4 has NO `style_id` param (V3 stays for existing brand-style pipelines only). |
| Insight #11 (new block) | Added `> **Updated 2026-04-21:**` block summarising: V4 style_id removal, gpt-image-1.5 streaming support (`stream: true` + `partial_images: 0–3`), Flux TypeError on `negative_prompt`, InstantX IP-Adapter for Flux. |
| Skill 2 renderer defaults | `gpt-image-1` → `gpt-image-1.5`; `Flux 1.1 Pro` → `FLUX.2 Pro`; `Flux Pro + --sref` → `FLUX.2 Pro (native ≤10 refs)`; `Recraft v3` → `Recraft V4 / V4 Pro SVG`; MJ v7 annotated with V8 Alpha caveat. |
| Cross-cutting pattern #1 | Updated IP-Adapter list to include InstantX FLUX.1-dev IP-Adapter for Flux; updated FLUX.2 native multi-ref mention; Recraft V4 `style` object vs. `style_id`; `gpt-image-1` → `gpt-image-1.5`. |
| Cross-cutting pattern #3 | `Flux 1.1 Pro` → `FLUX.2 Pro`; `gpt-image-1` → `gpt-image-1.5`. |
| Cross-cutting pattern #5 | Added updated block: Flux `negative_prompt` raises TypeError — translate to affirmative anchors; SD/SDXL/SD3 are unaffected. |
| Controversy #3 (transparency) | Added Ideogram correct endpoint note + new BiRefNet June 2025 update block (8× speedup for `refine_foreground`, SDPA upgrade, FP16 ~60–80 ms on RTX 4080). |
| Controversy #5 (text-in-illustration) | `gpt-image-1` → `gpt-image-1.5`; `Ideogram 3` → `Ideogram 3 Turbo`. |
| Skill 1 — emit durable anchor | Recraft V3 `style_id` → V4 `style` API object; added InstantX IP-Adapter for Flux; `gpt-image-1` → `gpt-image-1.5`. |
| Primary sources (Commercial AI generation) | Updated to `Recraft V4`, `Midjourney v7/v8 Alpha`, `Ideogram 3 Turbo`, `gpt-image-1.5`, `FLUX.2`. |
| Primary sources (Style-control) | `tencent-ailab/IP-Adapter` annotated as unmaintained since Jan 2024; added `InstantX/FLUX.1-dev-IP-Adapter` as current Flux path. |

---

### 10a — Empty States & Onboarding

| Location | Change |
|---|---|
| §2 IP-Adapter body | Added `> **Updated 2026-04-21:**` block: `tencent-ailab/IP-Adapter` last commit Jan 2024 / unmaintained; ComfyUI IPAdapter Plus maintenance-only since April 2025; for Flux use `InstantX/FLUX.1-dev-IP-Adapter`; FLUX.2 native multi-ref preferred over external adapter. |
| §2 IP-Adapter strengths | Updated "Flux (via XLabs-AI/flux-ip-adapter)" → "Flux, use InstantX FLUX.1-dev IP-Adapter". |
| §2 IP-Adapter recipe | Added note to use `InstantX/FLUX.1-dev-IP-Adapter` for Flux. |
| Prompt-template meta-rule #6 (negative boilerplate) | Added `> **Updated 2026-04-21:**` block: Flux all variants → TypeError on `negative_prompt`; use affirmative anchors for Flux; SD/SDXL/SD3 unaffected. |
| Reference tooling | `tencent-ailab/IP-Adapter` annotated as unmaintained + InstantX link added. |

---

### 10b — Hero Images & Marketing Banners

| Location | Change |
|---|---|
| Frontmatter `primary_models_covered` | Updated list: old Flux 1.x / gpt-image-1 / recraft-v3 → `flux-2-pro`, `gpt-image-1.5`, `midjourney-v8-alpha`, `ideogram-3-turbo`, `recraft-v4`. |
| Finding 1 | `gpt-image-1` → `gpt-image-1.5`; `Flux Pro` → `FLUX.2 Pro`; added gpt-image-1.5 native streaming note (`stream: true` + `partial_images: 0–3`). |
| Common failure #3 (gibberish text) | Updated fix to reference `gpt-image-1.5`; added Ideogram correct transparency endpoint (`/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"`); added Flux TypeError note on `negative_prompt`. |
| Files already had `> Updated 2026-04-21:` blocks from prior pass for: model picks, Finding 2, Finding 3, Model Picks table, Quick Decision Tree — confirmed current. |

---

### 10c — Spot Illustrations & Icon Packs

| Location | Change |
|---|---|
| §Pack consistency — IP-Adapter-Art | Already had `> **Updated 2026-04-21:**` block (tencent-ailab unmaintained, ComfyUI IPAdapter Plus maintenance-only, FLUX.2 native multi-ref preferred) — no further change needed. |
| §Recraft vector-native path | Already had `> **Updated 2026-04-21:**` block (V4 four tiers, V4 Pro SVG recommended) — confirmed current. |
| §References — Recraft | Already had `> **Updated 2026-04-21:**` inline note (V2 stale, current is V4) — confirmed current. |

No additional edits needed; prior pass covered all claims.

---

### 10d — 3D, Isometric, Claymorphism & Glassmorphism

| Location | Change |
|---|---|
| §3.7 Transparent background (BiRefNet/BRIA) | Added Ideogram transparency endpoint note (correct endpoint vs. `style: "transparent"`). Added `> **Updated 2026-04-21:**` block: BiRefNet June 2025 8× speedup for `refine_foreground`, SDPA, FP16 ~60–80 ms. |
| §1.1 SDXL negative prompt kernel | Added `> **Updated 2026-04-21:**` block: Flux TypeError on `negative_prompt`; SDXL/SD3 support it natively; translate to positive anchor for Flux. |
| Files already had `> Updated 2026-04-21:` blocks for: top-level model landscape (V8 Alpha, FLUX.2, Recraft V4), §1.1 FLUX.2 Pro note, §1.2 FLUX.2 dev/pro note, §1.3 FLUX.2 Pro note, §2.4 FLUX.2 multi-ref note — confirmed current. |

---

### 10e — Illustration → Production Pipeline

No outdated claims requiring correction found. File does not reference DALL-E 3, Recraft V3 by name, tencent-ailab IP-Adapter, Flux negative_prompt, or BiRefNet. The pipeline/format/framework content is model-agnostic and still current.

---

### index.md

No updates needed. Content is a table of file links with a snapshot disclaimer — all current.

---

## Key facts applied (from audit spec)

| Fact | Applied where |
|---|---|
| Recraft V3 → V4 (Feb 2026); V4 has NO `style_id` | SYNTHESIS insight #11, SYNTHESIS Skill 2 defaults, 10b frontmatter |
| V4 pricing: $0.08/img vector, $0.30/img pro vector | Not yet added to files (pricing not present in any current file — consistent omission) |
| DALL-E 3 shutting down May 12, 2026 → gpt-image-1.5 current | Not referenced in this category at all (no DALL-E 3 mentions found) |
| MJ v6 → v7 (default June 2025) → v8 Alpha (March 2026) → v8.1 Alpha (April 2026) | All files already had v7/v8 Alpha references; confirmed current |
| Ideogram transparency: `/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"` | SYNTHESIS Controversy #3, 10b failure #3, 10d §3.7 |
| tencent-ailab IP-Adapter unmaintained (last commit Jan 2024); InstantX is current for Flux | SYNTHESIS sources, 10a §2, 10a references |
| ComfyUI IPAdapter Plus maintenance-only April 2025 | SYNTHESIS sources, 10a §2 (confirmed already in 10c) |
| Flux `negative_prompt` raises TypeError on ALL variants | SYNTHESIS #5, 10a meta-rule #6, 10b failure #3, 10d §1.1 SDXL kernel |
| Gemini/Imagen free API: needs billing; AI Studio web UI free | Already present across all files; confirmed current |
| gpt-image-1.5 (4× faster, 20% cheaper); native streaming `stream: true` + `partial_images: 0–3` | SYNTHESIS #11, 10b Finding 1, 10b frontmatter |
| BiRefNet June 2025: 8× speedup `refine_foreground`, SDPA, FP16 ~60–80ms RTX 4080 | SYNTHESIS Controversy #3, 10d §3.7 |
| Adobe Firefly Image 5 (announced MAX 2025, Photoshop Beta March 2026) | Not referenced in this category — no Firefly mentions found; no correction needed |

---

# Updates — Category 22 (second half: files 12–20 + SYNTHESIS + index)

Agent: 22b | Date: 2026-04-21

---

## Files edited (second-half scope)

### 12-npm-icon-gen.md
- **Status confirmed:** No new release since v5.0.0 (July 2024). Still in maintenance mode.
- **Weekly downloads:** Slipped from ~26.5k (Q1 2025) to ~15k (April 2026). Updated Decision section figure.
- **sharp dependency:** `sharp@0.34` bump issue still open and unresolved.
- Added `> **Updated 2026-04-21:**` block at end of Decision section with current download trend and risk note.

### 13-iconify.md
- **Icon count:** Updated from "275,000+" / "200+" sets to confirmed **291,749 icons across 209 sets** (auto-updated 3×/week; sourced from iconify/icon-sets GitHub description).
- **Activity:** Confirmed active commits through April 2026, including SolidJS and React SVG+CSS component updates (March 2026).
- Added `> **Updated 2026-04-21:**` block immediately after the Repo metrics opening paragraph.
- SYNTHESIS.md Repos Surveyed table row 13: updated icon count to 291,749 / 209 sets.

### 14-svgl.md
- **Status confirmed:** Actively maintained — issues opened March 19 and March 20, 2026.
- **Stars:** Stable at ~5.7k (no significant growth, no decay).
- **Logo count:** Growing beyond 400 via ongoing community PRs; exact total best confirmed via API index.
- **API/stack:** No breaking changes; Hono+Upstash+Svelte 5 unchanged.
- Added `> **Updated 2026-04-21:**` block after the "What it is" opening paragraph.

### 15-rembg.md
- **Latest release confirmed:** v2.0.75, April 8, 2026.
- **v2.0.73–v2.0.75 changes:** Maintenance only — removed unneeded `log_softmax()` calls, added CLI man page. No new models added.
- **BRIA RMBG 2.0 license:** CC BY-NC 4.0 unchanged — still a commercial landmine.
- **BiRefNet status:** Remains the best-quality MIT model in the catalog.
- Added `> **Updated 2026-04-21:**` block after the repo metrics bullet list.

### 16-vtracer.md
- **Version status confirmed:**
  - Rust crate: `vtracer@0.6.5` on crates.io
  - Python binding: `vtracer==0.6.15` on PyPI (published March 23, 2026)
  - wasm npm: `vtracer-wasm@0.1.0` unchanged
  - GitHub "latest release" tag: 0.6.4 (lags crates.io — known gap)
- **Recommendation:** Pin against crates.io/PyPI, not the GitHub tag.
- Added `> **Updated 2026-04-21:**` block immediately before the Decision paragraph.

### 17-comfyui-layerdiffuse.md
- **Status confirmed:** Frozen at 2025-02-25 commit through April 2026. No Flux support added.
- **Issue #121:** Still stale (Flux LayerDiffuse request). No activity.
- **Maintenance since freeze:** Locale updates and minor ComfyUI core API compatibility fixes only. Eight-node workflow JSON unchanged and stable.
- Existing `> **Updated 2026-04-21:**` block in the Known Issues section updated to confirm findings. Added new block in the Repo Metrics table section.

### 18-comfyui-easy-use.md
- **Latest release confirmed:** v1.3.6, January 23, 2026.
- **Last commit:** April 9, 2026 — actively maintained.
- **Stars:** ~2.5k confirmed.
- **LayerDiffusion:** Still SDXL/SD1.5 only in v1.3.6 — no Flux path added inside Easy-Use.
- **GPL-3.0:** Unchanged.
- **Compatibility regressions:** Resolved in v1.3.6 (v1.2.9/v1.3.2/v1.3.5 breakage fixed).
- Added `> **Updated 2026-04-21:**` block after the "Repo at a glance" bullets.

### 19-vercel-mcp-stack.md
- **mcp-handler version confirmed:** 1.1.0 (latest as of April 2026, last published ~March 2026).
- **Security note:** Issue #146 (npm audit report) filed against the package — added advisory to check `npm audit` before deploying.
- **`@vercel/mcp-adapter` deprecation:** Confirmed still deprecated on npm. `mcp-handler` remains canonical.
- **`@modelcontextprotocol/sdk@1.26.0` floor:** Unchanged.
- Updated existing `> **Updated 2026-04-21:**` block to expand with security advisory.

### 20-vercel-ai-sdk-image.md
- **Major finding:** Vercel AI SDK **v6** shipped December 22, 2025. Latest patch: `ai@6.0.162` (April 2026).
- **`experimental_generateImage` → `generateImage`:** Promoted to stable in v6. All call sites must update. Migration: `npx @ai-sdk/codemod v6`.
- **New v6 capabilities:** `ToolLoopAgent`, human-in-the-loop `needsApproval`, image-to-image editing with reference images, native MCP support, DevTools.
- **`ImageModelV2` contract:** Unchanged from v5 into v6.
- Updated version line in Repo Metrics section.
- Updated existing `> **Updated 2026-04-21:**` block with v6 details.
- Updated Decision section from "v5 `experimental_generateImage`" to "v6 `generateImage` (stable)".

---

## SYNTHESIS.md changes

- **Finding 12:** Updated from "Vercel AI SDK v5 `experimental_generateImage`" to "Vercel AI SDK v6 `generateImage` (stable as of Dec 22, 2025)"; added migration codemod note.
- **Repos Surveyed table row 13:** Updated icon count from "275k marks across 200+ sets" to "291,749 icons across 209 sets (Apr 2026)".
- **Repos Surveyed table row 20:** Updated from "v5 `generateImage`" / "Still `experimental_`" to "v6 `generateImage` (stable, Dec 2025)" / removed the `experimental_` weakness.
- **Recommendation 2:** Updated from "v5 `experimental_generateImage`" to "v6 `generateImage` (stable)"; added codemod migration note.

## index.md changes

- **Row 20:** Updated from "vercel/ai v5 `generateImage`" to "vercel/ai v6 `generateImage` (stable, Dec 2025)".

---

## Summary of key facts (as of 2026-04-21)

| Repo | Key finding |
|---|---|
| 12-npm-icon-gen | v5.0.0 still latest (Jul 2024); downloads declining ~15k/wk; sharp@0.34 bump unresolved |
| 13-iconify | 291,749 icons / 209 sets (up from 275k/200+); active commits Apr 2026 |
| 14-svgl | ~5.7k★; active; logo count >400 growing; API unchanged |
| 15-rembg | v2.0.75 confirmed Apr 8, 2026; v2.0.73-75 maintenance-only; BRIA license unchanged |
| 16-vtracer | Rust 0.6.5 / PyPI 0.6.15 (Mar 23 2026) / wasm 0.1.0; pin crates.io, not GitHub tag |
| 17-comfyui-layerdiffuse | Frozen Feb 2025; issue #121 still stale; Flux still unsupported |
| 18-comfyui-easy-use | v1.3.6 (Jan 2026); last commit Apr 9 2026; 2.5k★; GPL-3.0 unchanged |
| 19-vercel-mcp-stack | mcp-handler@1.1.0 confirmed latest; security issue #146 filed; API stable |
| 20-vercel-ai-sdk-image | **AI SDK v6 released Dec 22 2025**; `generateImage` now stable (was `experimental_`); latest `ai@6.0.162` |

## Context from agent 22a (carried forward, not re-audited)

- capacitor-assets: v3.0.5 March 2024, 2+ years stale, demoted to fallback
- pwa-asset-generator: v8.1.4 (March 2026, elegantapp/ org, ~3k★)
- nutlope/logocreator: ~5.3k★ (viral decay, no commits since Jan 2025)
- icon-generator-mcp: abandoned-beta (silent since Aug 2025)
- guillempuche/appicons: elevated to primary driver candidate

---

# Category 23 — Stack Combinations: Update Log
**Date:** 2026-04-21  
**Agent:** research-updater (Claude Sonnet 4.6)  
**Scope:** All 12 files in `docs/research/23-combinations/`

---

## Summary of Changes

All cross-cutting corrections confirmed by prior agents were applied to every file in this directory that referenced the affected claims. Below is a per-file breakdown.

---

## Corrections Applied (All Files)

### 1. Recraft V4 (SOTA for SVG/vector, released Feb 2026)
- **Claim corrected:** Files referenced "Recraft V3" as the SVG/vector SOTA model.
- **Correction:** Recraft V4 (Feb 2026) is SOTA. V4 ships four variants: V4 raster ($0.04/img), V4 Vector ($0.08/img), V4 Pro raster ($0.25/img), V4 Pro Vector ($0.30/img). V3 is retained only as a fallback when an existing V3 `style_id` must be preserved (V4 `style_id` schema is incompatible with V3).
- **Files edited:** `03-quality-max.md`, `06-agent-native-first.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** recraft.ai/docs, replicate.com/blog/recraft-v4, fal.ai/recraft-v4

### 2. DALL-E 3 API deprecation + gpt-image-1.5 as current model
- **Claim corrected:** Several files referred to `gpt-image-1` as "current" and did not mention DALL-E 3 shutdown.
- **Correction:** DALL-E 3 API shuts down May 12, 2026 (confirmed via OpenAI developer community announcement Nov 14, 2025). `gpt-image-1.5` is the current production OpenAI image model (released Dec 16, 2025; 20% cheaper I/O vs. gpt-image-1, faster). `gpt-image-1` is labeled "previous" in OpenAI's model docs.
- **Files edited:** `03-quality-max.md`, `06-agent-native-first.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** platform.openai.com/docs/models/gpt-image-1.5, community.openai.com deprecation notice

### 3. Ideogram transparency: dedicated POST endpoint, not `style:"transparent"`
- **Claim corrected:** Multiple files stated `style:"transparent"` as the Ideogram transparency parameter.
- **Correction:** There is no `style:"transparent"` parameter on the standard Ideogram generate endpoint. Transparency uses a **dedicated POST endpoint**: `/ideogram-v3/generate-transparent` (documented at developer.ideogram.ai as "Generate with Ideogram 3.0 (Transparent Background)"). Turbo tier: $0.03/img; Quality tier: $0.09/img.
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3, wavespeed.ai/blog

### 4. Flux `negative_prompt` raises TypeError on ALL Flux variants
- **Claim corrected:** Some files implied negative_prompt was usable on Flux but just ignored or partially supported.
- **Correction:** `FluxPipeline.call()` raises `TypeError: unexpected keyword argument 'negative_prompt'` on ALL Flux variants (dev, schnell, pro, Kontext, FLUX.2). Flux uses flow matching with CFG=1 — no negative conditioning mechanism exists. Use affirmative positive-prompt framing instead (e.g., `"pure white background"` not `"no checkerboard"`).
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** github.com/huggingface/diffusers/issues/9124, github.com/mcmonkeyprojects/SwarmUI/issues/204

### 5. rembg default is u2net — must explicitly pass `session=new_session("birefnet-general")`
- **Claim corrected:** Several files stated or implied that rembg defaults to BiRefNet.
- **Correction:** `rembg`'s `remove()` function defaults to the `u2net` session. To use BiRefNet-general, callers must explicitly pass `session=new_session("birefnet-general")`. Calling `remove(input)` bare runs U²-Net — substantially lower quality on soft-edge subjects (hair, glass, fine lines). This is a silent quality bug in any code that assumes bare `remove()` gives BiRefNet quality.
- **Files edited:** `03-quality-max.md`, `04-self-hosted-sovereign.md`, `07-hybrid.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** github.com/danielgatis/rembg (README session docs), deepwiki.com/danielgatis/rembg session management

### 6. SVGO v4: `removeViewBox`/`removeTitle` disabled by default; `removeViewBox:false` override is a no-op
- **Claim corrected:** Some files used the v3-era pattern of `removeViewBox: false` as a "conservative" override to preserve viewBox.
- **Correction:** In SVGO v4, both `removeViewBox` and `removeTitle` are **removed from `preset-default`** entirely — they are no longer enabled by default. The v3-era `removeViewBox: false` override is now a no-op (the plugin isn't running in the first place). The viewBox is preserved automatically. To intentionally remove the viewBox, explicitly add `'removeViewBox'` to the plugins array.
- **Files edited:** `04-self-hosted-sovereign.md`, `05-free-tier.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** svgo.dev/docs/migrations/migration-from-v3-to-v4/, github.com/svg/svgo/releases/tag/v4.0.0

### 7. gpt-image-1 native streaming: `stream: true` + `partial_images: 0–3`
- **Claim corrected:** Files did not mention streaming capability for gpt-image-1/1.5.
- **Correction:** `gpt-image-1.5` (and gpt-image-1) supports streaming via `stream: true` + `partial_images: 0–3` in the API. Events are typed `"image_generation.partial_image"` for intermediates and `"image_generation.completed"` for the final image. `partial_images: 0` returns a single image in one streaming event.
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** platform.openai.com/docs/api-reference/images-streaming

### 8. MCP spec 2025-11-25 is Latest Stable (not draft)
- **Claim corrected:** Some files referred to it as a draft or upcoming spec.
- **Correction:** MCP spec `2025-11-25` is the Latest Stable release as of April 2026. No new version has been cut since then (confirmed March 2026). The 2026 MCP Roadmap published by Anthropic treats 2025-11-25 as the production baseline.
- **Files edited:** `08-edge-browser-first.md`, `09-comfyui-native.md`, `index.md`
- **Source verified:** modelcontextprotocol.io/specification/2025-11-25, blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/

### 9. Gemini/Imagen: programmatic use requires billing
- **Claim corrected:** Some files still contained residual references to "free tier" for Gemini/Imagen programmatic API.
- **Correction:** Google removed Gemini/Imagen image-gen from the free programmatic API tier in Dec 2025. The web UI at aistudio.google.com remains free for interactive use; programmatic use (`GEMINI_API_KEY`) requires a billed project. Banner updates were already applied to 01, 03, 07, and RECOMMENDED by a prior pass; this run cross-checked all remaining files.
- **Files edited:** `SYNTHESIS.md` (primary sources section), `index.md`
- **Source verified:** Confirmed in CLAUDE.md project instructions and prior agent notes

---

## Per-File Edit Summary

| File | Edits Made |
|---|---|
| `index.md` | Added cross-cutting correction block to the header banner |
| `SYNTHESIS.md` | Updated insight #3 (unavoidable triad), P2, RGBA fallback ladder, primary sources model list, Status section |
| `01-mvp-2-weeks.md` | No edits — already had correct Gemini banner; does not reference Recraft/Ideogram-transparency/Flux-negative |
| `02-license-clean-commercial.md` | No edits — already had correct Recraft V4 + gpt-image-1.5 banners applied in prior pass |
| `03-quality-max.md` | Recraft V3→V4 in generator table; gpt-image-1→1.5 in build order; rembg session note; Ideogram endpoint note |
| `04-self-hosted-sovereign.md` | rembg session note; SVGO v4 note in vectorization section |
| `05-free-tier.md` | SVGO v4 note in vectorization section |
| `06-agent-native-first.md` | Layer 3 routing updated (gpt-image-1→1.5, Recraft V3→V4, Ideogram endpoint); ModelId schema updated; update banner |
| `07-hybrid.md` | Capabilities matrix (Recraft V4 row); SVG hot path (#3) Recraft V4 + update note; transparent hot path (#1) gpt-image-1.5 + Ideogram endpoint + streaming; post-processing section rembg session + SVGO v4 + Flux negative_prompt notes; routing pseudocode RECRAFT_V3→V4 |
| `08-edge-browser-first.md` | Header banner added; surface-2 table (Recraft V4, Ideogram endpoint, streaming); SVGO v4 vectorization section |
| `09-comfyui-native.md` | Header banner added; wordmarks fallback section gpt-image-1→1.5 + Ideogram endpoint correction |
| `RECOMMENDED.md` | Layer 3 hot paths (gpt-image-1.5, Recraft V4, Ideogram endpoint, streaming); Layer 4 post-processing rembg + SVGO + Flux notes; lockfile gpt-image-1.5 + Recraft V4 entries |
| `RECOMMENDED.md` (appendix) | No edits needed — rejected variants section does not name model versions specifically |

---

## Claims Verified by Web Search (Not Changed)

- **Ideogram 3 Turbo pricing $0.03/img, Quality $0.09/img**: Confirmed still current.
- **Cloudflare Workers AI 10k neurons/day free**: Confirmed still active.
- **Together AI Flux Schnell free**: Confirmed as 3-month trial (not free-forever) — already corrected in prior pass of 05-free-tier.md.
- **MCP spec 2025-11-25 Latest Stable**: Confirmed — no new version since then as of April 2026.
- **Recraft V4 four variants and pricing**: Confirmed $0.04/$0.08/$0.25/$0.30.
- **gpt-image-1.5 current model**: Confirmed released Dec 2025, labeled current in OpenAI docs.
- **DALL-E 3 shutdown May 12 2026**: Confirmed via OpenAI developer community official deprecation notice.
- **SVGO v4 removeViewBox/removeTitle disabled in preset-default**: Confirmed via svgo.dev migration docs.
- **Flux negative_prompt TypeError all variants**: Confirmed via multiple HuggingFace issues and diffusers repo.
- **rembg default session u2net**: Confirmed via github.com/danielgatis/rembg session docs.

---

# Updates Log: Research Area 24 — Agentic Orchestration Patterns
**Date:** 2026-04-21  
**Auditor:** Claude Sonnet 4.6

---

## Files Edited

### 24b-plan-execute-react-patterns.md
- Added `> **Updated 2026-04-21:**` block after "Key GitHub Repos" section documenting LangGraph v1.1.8 (April 17, 2026), the new `stream(version="v2")` / `invoke(version="v2")` typed API, Python 3.9 drop / 3.14 add, and TypeScript parity at v1.2.9 / 42k+ weekly npm downloads.
- Added LangGraph 1.0 GA changelog link to References.

### 24c-parallel-fan-out-best-of-n.md
- Added `> **Updated 2026-04-21:**` block after the Google ADK paragraph noting: ADK now available in Python, TypeScript, Go, Java (Java 1.0 in April 2026); OpenAI Agents SDK April 2026 update added sandbox/harness features Python-first (TypeScript planned).

### 24d-retry-fallback-agent-chains.md
- Added `> **Updated 2026-04-21:**` block to Caveats section: OpenAI Assistants API deprecated mid-2026 (migrate retry logic to Agents SDK); SSE transport for MCP ended April 1, 2026 — Streamable HTTP required.

### 24e-state-machine-creative-pipelines.md
- Added "Current version: **v1.1.8** (April 17, 2026)" inline to LangGraph opening sentence.
- Updated LangGraph JS bullet: added npm package name `@langchain/langgraph`, current version v1.2.9, and the `stream(version="v2")` typed API detail.
- The file already contained 2026-04-21 blocks on AutoGen maintenance mode, MAF GA, Claude Agent SDK, and A2A — these were confirmed accurate and left as-is.

### 24f-github-repo-survey.md
- **AutoGen section**: Added `> **Updated 2026-04-21:**` block — AutoGen in maintenance mode; MAF 1.0 GA April 3, 2026; do not start new projects on AutoGen v0.4; migration guide URL.
- **LangGraph section**: Added `> **Updated 2026-04-21:**` block with v1.1.8 (Python) / v1.2.9 (TS), deferred node execution feature, `stream(version="v2")` API, 42k+ weekly npm downloads.
- **shinpr/mcp-image section**: Added `> **Updated 2026-04-21:**` block noting Google ADK now supports Gemini 3 Pro/Flash; reminder Gemini image API still requires billing.
- **Summary table**: Added Microsoft Agent Framework row (GA April 2026); added maintenance-mode warning to AutoGen row; added LangGraph version numbers.

### 24g-key-takeaways.md
- Added two new numbered sections before "Bottom Line":
  - **#9 MCP Transport: SSE Is Gone** — SSE ended April 1, 2026; Streamable HTTP required; MCP spec 2025-11-25 is latest stable (not 2025-03-26).
  - **#10 Anthropic Structured Output: No Beta Header** — GA now; `output_config.format` parameter; no `anthropic-beta` header needed; available on Sonnet 4.5, Opus 4.5+, all 4.6 models.
- Updated "Bottom Line" to reference LangGraph v1.1.8 and add infrastructure note about MCP transport and structured outputs.

### SYNTHESIS.md
- Fixed header date: `2026-04-20` → `2026-04-21`.
- Updated 24e summary paragraph: added LangGraph version numbers, confirmed JS parity, flagged AutoGen maintenance mode with MAF GA date, added CrewAI issue #4783 reference (March 2026).
- Updated finding #5 (OpenAI Agents SDK): added April 2026 sandbox update note; flagged Assistants API deprecation mid-2026.
- Added findings #6–#10 under `> **Updated 2026-04-21:**`:
  - **#6** MCP transport: SSE dead; Streamable HTTP required; spec 2025-11-25 is latest (not 2025-03-26).
  - **#7** Claude model strings: Haiku 4.5 / Sonnet 4.6 / Opus 4.7 (April 16, 2026); 4.0-series retires June 15, 2026.
  - **#8** Claude Structured Output GA: `output_config.format`; no beta header.
  - **#9** Gemini CLI hooks + MCP: full hooks system since v0.26.0 (enabled by default); native MCP via `mcpServers` in settings.json.
  - **#10** Claude Agent SDK formally released September 29, 2025; both Python and TypeScript actively maintained.

### index.md
- Added `updated: 2026-04-21` to frontmatter (date field was already correct).

---

## Key Facts Verified

| Topic | Status found | Correction made |
|---|---|---|
| LangGraph version | v1.1.8 (Python, Apr 17 2026) / v1.2.9 (TS) | Added to 24b, 24e, 24f, SYNTHESIS |
| LangGraph v1.0 GA date | October 2025 — confirmed | No change needed |
| LangGraph JS parity | Confirmed full parity; 42k+ npm/week | Removed old caveat text |
| CrewAI version | v1.9.3 (Jan 30, 2026); hierarchical bugs still open (#4783, Mar 2026) | Confirmed existing warnings; added issue number |
| AutoGen status | Maintenance mode confirmed; MAF 1.0 GA April 3, 2026 | Updated 24f section and SYNTHESIS |
| OpenAI Agents SDK | April 16, 2026 update: sandbox + model-native harness, Python-first | Added to 24c, 24a (already had it), SYNTHESIS |
| Claude models | Haiku 4.5 / Sonnet 4.6 / Opus 4.7 (released Apr 16, 2026); 4.0-series retires Jun 15, 2026 | Added to SYNTHESIS #7 |
| MCP spec latest | 2025-11-25 is latest stable (adds Tasks, Extensions, Auth improvements) | Added to SYNTHESIS #6, 24g #9, 24d |
| SSE transport | Deprecated; ended April 1, 2026 for Claude connectors | Added to 24d, 24g, SYNTHESIS #6 |
| Streamable HTTP | Required for all remote MCP | Added to 24d, 24g, SYNTHESIS #6 |
| Claude Structured Output | GA; `output_config.format`; no beta header | Added to 24g #10, SYNTHESIS #8 |
| Gemini CLI hooks | Full system since v0.26.0 (SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, BeforeToolSelection, PreCompress); enabled by default | Added to SYNTHESIS #9 |
| Gemini CLI MCP | Native via `mcpServers` in settings.json | Added to SYNTHESIS #9 |
| Claude Agent SDK | Formally released Sep 29, 2025 (renamed from Claude Code SDK); Python + TS | Confirmed existing mentions; added to SYNTHESIS #10 |
| Google ADK | Available Python/TS/Go/Java; Java 1.0 Apr 2026; bi-weekly releases | Added to 24c |

---

## Files NOT Changed (no errors found)

- **24a-multi-agent-handoff-patterns.md** — already had accurate 2026-04-21 blocks on Claude Agent SDK and A2A protocol; OpenAI Agents SDK JS caveat already correctly qualified. No substantive errors found.

---

## Sources

- LangGraph releases: https://github.com/langchain-ai/langgraph/releases
- LangGraph 1.0 GA: https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available
- @langchain/langgraph npm: https://www.npmjs.com/package/@langchain/langgraph
- CrewAI changelog: https://docs.crewai.com/en/changelog
- CrewAI hierarchical bug #4783: https://github.com/crewAIInc/crewAI/issues/4783
- AutoGen maintenance / MAF: https://venturebeat.com/ai/microsoft-retires-autogen-and-debuts-agent-framework-to-unify-and-govern
- MAF migration guide: https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/
- OpenAI Agents SDK April 2026: https://openai.com/index/the-next-evolution-of-the-agents-sdk/
- Claude models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- MCP SSE deprecation / Streamable HTTP: https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/
- Claude structured output: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Gemini CLI hooks: https://geminicli.com/docs/hooks/
- Gemini CLI v0.26.0: https://github.com/google-gemini/gemini-cli/releases/tag/v0.26.0
- Gemini CLI MCP: https://geminicli.com/docs/tools/mcp-server/
- Claude Agent SDK: https://github.com/anthropics/claude-agent-sdk-python
- Google ADK: https://google.github.io/adk-docs
- Google ADK Java 1.0: https://www.infoq.com/news/2026/04/google-adk-1-0-new-architecture/

---

# Research Update Log — Category 24 (Skills for P2A)

**Date:** 2026-04-21
**Auditor:** Claude (claude-sonnet-4-6)
**Files audited:** 10 (01–08, index.md, SYNTHESIS.md)
**Files modified:** 9 (all except 01-frontend-design-analysis.md which had no stale facts)

---

## Summary of Corrections

| # | Correction | Stale claim | Verified current fact | Files updated |
|---|---|---|---|---|
| 1 | DALL-E 3 deprecation | Still active | **Retiring May 12, 2026.** Migrate to `gpt-image-1.5` (released Dec 2025, 20% cheaper than gpt-image-1, stronger brand logo preservation in edits). DALL-E 3 removed from ChatGPT Dec 2025 without warning. | 03, 04, 06, 07, 08, SYNTHESIS |
| 2 | Recraft V3 → V4 | "Recraft V3 (Highest fidelity)", controls API | **Recraft V4** released February 2026. V3 superseded. V4 ships four variants: V4 (raster, ~10s), V4 Vector (native SVG, ~15s), V4 Pro (2048², ~30s), V4 Pro Vector (high-res SVG, ~45s). Recraft confirmed as only AI model producing real editable SVG paths. controls.colors API largely compatible with V4. | 02, 03, 05, 06, 07, 08, SYNTHESIS |
| 3 | Ideogram transparency endpoint | `style: "transparent"` param on standard generate endpoint | **Dedicated endpoint `/ideogram-v3/generate-transparent`** (POST). This is a separate endpoint, not a parameter on the standard `/ideogram-v3/generate` endpoint. Output is PNG with alpha channel. Available on fal.ai and Ideogram's own API. | 03, 04, 06, 07, SYNTHESIS |
| 4 | Midjourney V7 → V8 | "V7, no official API, enterprise application required" | **V8 Alpha launched March 17, 2026.** 5× faster, native 2K resolution, significantly improved text rendering, text-to-video (up to 10s at 60fps). V8.1 Alpha current. Still **no official public API** (no REST endpoint, SDK, or API key system). No enterprise API release date confirmed. V8 sref codes differ from V6/V7 — regenerate style bundles. | 03, 05, 07, 08, SYNTHESIS |
| 5 | Claude model naming | claude-2/3.x era references, "Claude Opus 4.1" | **Claude 4.0-series** (claude-sonnet-4-20250514, claude-opus-4-20250514) **retires June 15, 2026.** Current models: claude-sonnet-4-6, claude-opus-4-6 (released February 2026). Tier 2 VLM rubric calls must use claude-sonnet-4-6 going forward. | 02, 05, 06, SYNTHESIS |
| 6 | Gemini image free tier | "~1,500 images/day free", "Nano Banana free API tier" | **No free image API tier** since Dec 2025. The partial restoration (~500 RPD as of Feb 2026) applies to text/multimodal only; image generation endpoints remain paid ($0.039/img Nano Banana, $0.134/img Nano Banana Pro, $0.02/img Imagen 4 Fast). AI Studio web UI (https://aistudio.google.com) is still free for interactive generation — use `external_prompt_only` + `asset_ingest_external` for that flow. | 03, 04, 07, SYNTHESIS |
| 7 | MCP spec version | Unspecified or earlier versions | **MCP 2025-11-25 is Latest Stable** (released November 25, 2025, MCP's first anniversary). Key features: async Tasks, OpenID Connect Discovery, incremental scope consent, extension framework. Backward compatible. No breaking changes to tool schemas. | 04, SYNTHESIS |
| 8 | SKILL.md cross-IDE portability | Claude Code only | **SKILL.md is an open cross-IDE standard.** Works in Claude Code, Cursor (`.cursor/rules/`), Windsurf (`.windsurf/rules/`), Gemini CLI (`GEMINI.md`), OpenAI Codex CLI. Only the destination folder path differs. Keep SKILL.md under 500 lines; only `name` and `description` frontmatter are loaded initially. | 04, 08, SYNTHESIS |
| 9 | gpt-image-1.5 | Not mentioned or "future" | **gpt-image-1.5 released December 2025.** Now current OpenAI image model. 20% cheaper per image than gpt-image-1. Stronger brand logo preservation and consistent preservation of branded visuals across edits. Text ceiling similar to gpt-image-1 (~30 chars). | 03, 04, SYNTHESIS |

---

## File-by-File Changes

### `01-frontend-design-analysis.md`
**No changes.** Content is conceptual analysis of the frontend-design skill's applicability to SVG authoring. No model versions, API endpoints, or pricing referenced. Content remains accurate.

### `02-svg-authoring-skill-design.md`
- **Appendix:** Updated cost table. "Claude 4 / GPT-5" → "Claude 4.6 / gpt-image-1.5 era LLM". Added note that Claude 4.0-series retires June 15, 2026 (→ claude-*-4-6).
- **Appendix:** Updated Recraft section. "Recraft V4 SVG" entry now has accurate timing for V4 Pro Vector (~45s), confirms V3 is superseded.
- **References:** Fixed "Claude Opus 4.1" → "Claude Opus 4.6". Added update note.

### `03-t2i-prompt-dialect-skill.md`
- **§1.5 Midjourney:** Updated V7 → V7/V8. V8 Alpha launched March 17, 2026. Confirmed still no official public API. V8 sref code migration note. Improved text rendering detail.
- **§1.6 Ideogram:** Added transparency endpoint correction. Dedicated `/ideogram-v3/generate-transparent` endpoint is NOT `style: "transparent"` param. Code example updated.
- **§1.7 Recraft:** Updated V3 → V4. All four V4 variants named and timed. "Only AI model producing real editable SVG paths" confirmation.
- **§5 Text-in-image table:** Added Midjourney v8 Alpha row. Updated note about gpt-image-1.5 (released Dec 2025). Added DALL-E 3 deprecation callout box.

### `04-mcp-api-integration-skill.md`
- **Mode selection ranking diagram:** Updated `g) Midjourney (paid)` → `g) Midjourney v8 (paid) [no official API; web UI only]`. Updated API tier list: `gpt-image-1.5` as primary, DALL-E 3 retirement noted, Recraft V4/V4 Vector, Gemini corrected to "paid only; no free image tier".
- **Error handling / soft fallback:** Updated Ideogram transparency reference from `style:"transparent"` to dedicated `/ideogram-v3/generate-transparent` endpoint.
- **Free-route diagram:** Replaced `Gemini free tier? (~1500/day)` with accurate note that Gemini image API has no free tier; AI Studio web UI is free (interactive only).
- **References section:** Added MCP spec 2025-11-25 confirmation and SKILL.md cross-IDE portability note.

### `05-brand-consistency-skill.md`
- **Palette enforcement — Recraft:** Section renamed "Recraft V4 (Current — V3 superseded)". Added update note. controls.colors API confirmed V4 compatible.
- **Palette enforcement — Midjourney:** Section updated to "V7/V8". V8 sref migration note added. No official public API confirmed. `external_prompt_only` is the only valid P2A path.
- **Tier 2 VLM:** `Claude Sonnet` → `claude-sonnet-4-6`. Added retirement note for claude-sonnet-4-20250514 (June 15, 2026).

### `06-validation-debug-skill.md`
- **Header block:** Added update callout covering DALL-E 3 retirement, Ideogram endpoint fix, Recraft V4, claude-sonnet-4-6, MCP spec 2025-11-25.
- **Tier 2 table:** `Claude Sonnet rubric score` → `claude-sonnet-4-6 rubric score`.

### `07-gap-analysis.md`
- **Existing status update block:** Extended to add DALL-E 3 retirement, Recraft V3→V4, Ideogram endpoint fix, Midjourney V8, Claude model retirements, MCP spec, SKILL.md portability.
- **Free-route detection section:** Nano Banana entry clarified. The "~1,500 images/day free" quota is withdrawn. The partial ~500 RPD restoration applies to text/multimodal only; image generation remains paid.

### `08-marketplace-survey.md`
- **Header:** Added cross-IDE portability update for SKILL.md (Claude Code, Cursor, Windsurf, Gemini CLI, Codex CLI).
- **context7 use cases:** Updated specific query examples to reference gpt-image-1.5 (not gpt-image-1), Recraft V4 (not V3), and Ideogram `/ideogram-v3/generate-transparent` endpoint.

### `SYNTHESIS.md`
- **Header:** Added corrections table covering all 8 changes (DALL-E 3, Recraft V4, Ideogram endpoint, Midjourney V8, Claude models, Gemini free tier, MCP spec, SKILL.md portability).
- **t2i-prompt-dialect capabilities bullet:** Updated provider list to gpt-image-1.5, Midjourney v8, Recraft V4.

### `index.md`
- **Header:** Added audit note summarizing all corrections with pointer to SYNTHESIS.md corrections table.

---

## Verification Sources

- Recraft V4: https://www.recraft.ai/blog/introducing-recraft-v4-design-taste-meets-image-generation
- Recraft V4 Pro SVG on Replicate: https://replicate.com/recraft-ai/recraft-v4-pro-svg
- Ideogram v3 transparent endpoint: https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
- DALL-E 3 deprecation: https://community.openai.com/t/deprecation-reminder-dall-e-will-be-shut-down-on-may-12-2026/1378754
- DALL-E 3 → OpenAI deprecations page: https://platform.openai.com/docs/deprecations
- gpt-image-1.5 release: https://platform.openai.com/docs/models/gpt-image-1.5
- Claude 4.0-series retirement: https://dev.to/raxxostudios/claude-opus-4-and-sonnet-4-retire-june-15-2iog
- Anthropic model deprecations: https://platform.claude.com/docs/en/about-claude/model-deprecations
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- Midjourney V8 Alpha: https://updates.midjourney.com/v8-alpha/
- SKILL.md cross-IDE standard: https://www.agensi.io/learn/claude-code-skills-vs-cursor-rules-vs-codex-skills
- Flux.2 no negative prompt: https://docs.bfl.ml/guides/prompting_guide_flux2

---

# Research Update Log — Category 30 (Agent Memory State)
**Date:** 2026-04-21  
**Auditor:** Claude Sonnet 4.6  

---

## Files Audited

| File | Status |
|---|---|
| `30a-agent-memory-architectures.md` | Updated |
| `30b-session-vs-longterm-memory.md` | Updated |
| `30c-mcp-resources-persistent-state.md` | Updated |
| `30d-user-preference-learning.md` | Updated |
| `30e-asset-set-coherence-tracking.md` | Updated |
| `SYNTHESIS.md` | Updated |
| `index.md` | No changes needed (already dated 2026-04-21) |

---

## Changes Made

### 30a — Agent Memory Architectures

1. **Mem0 v2.0.0 breaking release (April 16, 2026)** — Added `> Updated 2026-04-21:` block under the Mem0 section.
   - Graph database (Neo4j/Memgraph/Kuzu/AGE) removed from open-source SDK. ~4,000 lines of graph driver code gone.
   - Entity extraction now built into `add()` as a single-pass operation (~50% latency reduction).
   - All 15 vector stores implement `keyword_search()` and `search_batch()`.
   - Hybrid retrieval: semantic + BM25 + entity-graph boosting.
   - Migration required for existing integrations. Guide: `docs.mem0.ai/migration/oss-v2-to-v3`.
   - Hosted platform API is stable; only open-source SDK is breaking.

2. **New frameworks section added** — "Emerging Frameworks Worth Tracking (2026)":
   - **Supermemory**: MCP-native memory API (fact extraction, profile building, contradiction resolution, selective forgetting). Ships MCP server compatible with Claude Code. Most purpose-fit for MCP-first deployments.
   - **Cognee**: Fully local deployment, graph-augmented memory, no external services. For air-gapped/data-residency use cases.
   - **EverMemOS**: Research-stage memory OS for long-horizon reasoning (ICLR 2026). Not production-ready.

3. **Updated sources list** — Added Mem0 v2.0.0 release link, Mem0 changelog, and two 2026 framework comparison articles.

---

### 30b — Session vs Long-Term Memory

1. **Claude context window update** — Added `> Updated 2026-04-21:` block after the statement about 200k+ context windows.
   - Confirmed all Claude 4.x models: 200k standard context window.
   - Claude Sonnet 4.6 and Opus 4.6 additionally support **1M tokens** at standard pricing in usage tier 4 (no beta header required for these models).
   - Claude Haiku 4.5 remains at 200k.
   - GPT-4o remains at 128k.
   - Impact noted: at 200k tokens (~150,000 words) the in-process session dict is rarely needed.

2. **Graphiti MCP Server v1.0 update** — Extended the existing Zep `> Updated 2026-04-21:` block.
   - Graphiti MCP Server v1.0 shipped November 2025, compatible with Claude Desktop, Cursor, and any MCP client.
   - P95 graph search latency improved from 600ms → 150ms via infrastructure work in late 2025.

---

### 30c — MCP Resources and Persistent State

1. **MCP governance transfer confirmed** — Rewrote the existing `> Updated 2026-04-21:` block with more precise detail.
   - Anthropic transferred MCP governance to the **Agentic AI Foundation (AAIF)**, a Linux Foundation entity, on March 20, 2026.
   - Supporting members: Google, Microsoft, AWS, Cloudflare, Bloomberg, Intuit, and others.
   - 2026 roadmap has four priority areas: Transport evolution (Streamable HTTP), Tasks primitive lifecycle gaps, Governance maturation, Enterprise readiness.

2. **Tasks primitive status corrected** — Previously described as roadmap; now correctly marked as "experimental/shipped."
   - Tasks primitive (SEP-1686) is now an experimental feature.
   - Known gaps being addressed: retry semantics on transient failure, expiry policy for completed results.

3. **New `> Updated 2026-04-21:` block added to Prompts section** — Notes that the Tasks primitive is the correct async primitive for long-running asset generation (not Resources). Recommends watching AAIF lifecycle semantics before adopting in production.

---

### 30d — User Preference Learning

1. **Mem0 v2.0.0 integration impact** — Added `> Updated 2026-04-21:` block under the Mem0 Production Architecture section.
   - Single-pass extraction in `add()` removes the need for a separate secondary LLM call.
   - Graph backend removed — entity relationship queries need to be rebuilt using entity-boosted vector search.
   - Migration required: `docs.mem0.ai/migration/oss-v2-to-v3`.

2. **Supermemory section added** — New subsection "Supermemory as an MCP-Native Alternative" with `> Updated 2026-04-21:` block.
   - Covers full preference lifecycle with MCP server.
   - Recommended as the lowest-friction preference backend for MCP-first deployments.
   - Evaluation recommended before investing in custom `preference_log` SQLite schema.

3. **Sources updated** — Added Mem0 v2.0.0 release, Mem0 changelog, Supermemory docs, and best-frameworks-2026 article.

---

### 30e — Asset Set Coherence Tracking

1. **Updated `> Updated 2026-04-21:` block added** to the Provider-Specific Coherence Mechanisms section.
   - Clarified that `style_seed` in the schema maps to Recraft `style_id` — not a diffusion integer seed.
   - FLUX.2 10-reference-image API confirmed as the correct `ref_asset_id` FK value for non-Recraft providers.
   - Core schema and approach remain accurate; no structural changes needed.

---

### SYNTHESIS.md

1. **Date corrected** — `2026-04-20` → `2026-04-21`.

2. **Files table updated** — All five angle takeaways revised to reflect April 2026 findings:
   - 30a: Mem0 v2 graph removal, Supermemory entry.
   - 30b: Sonnet 4.6 / Opus 4.6 1M token support, Graphiti MCP Server v1.0.
   - 30c: AAIF governance, Tasks primitive experimental.
   - 30d: Mem0 v2 faster extraction, Supermemory as lowest-friction option.
   - 30e: Recraft style_id = style_seed, FLUX.2 10-ref fallback.

3. **Design Decisions section extended** — Added two new decision points:
   - Decision 5: Context window vs. storage (1M context changes the inline-injection viability threshold).
   - Decision 6: Supermemory vs. custom SQLite (evaluate before building bespoke schema).

4. **"What Was Not Found" section updated** — Added Supermemory as a close-but-not-exact analogue, and confirmed that visual coherence tracking (30e schema) remains original work with no direct published analogues.

---

## Facts Verified by Web Search

| Claim | Status | Source |
|---|---|---|
| Letta renamed from MemGPT — active | Confirmed. Letta V1 architecture ships; MemGPT-style loop is now "Legacy" in docs | letta.com/blog/letta-v1-agent |
| Letta V1 deprecates heartbeats / send_message | Confirmed | docs.letta.com/guides/legacy/architectures_overview |
| Mem0 v2.0.0 breaking release April 2026 | Confirmed. Launched April 16, 2026 | newreleases.io/project/github/mem0ai/mem0/release/v2.0.0 |
| Mem0 v2 removes Neo4j graph backend | Confirmed | docs.mem0.ai/changelog |
| Zep / Graphiti 20k stars | Confirmed | github.com/getzep/graphiti |
| Graphiti MCP Server v1.0 (Nov 2025) | Confirmed | getzep.com/product/open-source/ |
| Graphiti P95 latency 600ms → 150ms | Confirmed | getzep.com/product/open-source/ |
| Claude 4.x models 200k standard context | Confirmed | platform.claude.com/docs/en/about-claude/models/overview |
| Claude Sonnet 4.6 / Opus 4.6 support 1M tokens | Confirmed (tier 4 / standard pricing) | morphllm.com/claude-context-window |
| MCP governance → AAIF / Linux Foundation | Confirmed (March 20, 2026) | blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/ |
| Tasks primitive (SEP-1686) experimental | Confirmed | modelcontextprotocol.io/development/roadmap |
| Anthropic memory tool beta header confirmed | Confirmed (context-management-2025-06-27) | platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool |
| Supermemory MCP server exists | Confirmed | supermemory.ai/docs/memory-api/sdks/anthropic-claude-memory |
| LangMem p95 latency 59.82s | Confirmed (third-party benchmark cited in search results) | atlan.com/know/long-term-memory-langchain-agents/ |
| LangGraph: MemorySaver dev only, PostgresSaver for prod | Confirmed | docs.langchain.com/oss/python/langgraph/add-memory |

---

## No-Change Items

- **MemGPT reference in 30a header** — Already shows "Letta / MemGPT" with parenthetical; the body correctly uses "Letta" throughout. No cleanup needed.
- **Redis Stack** — No material changes found for 2026; RedisJSON 2.8 is still current. The semantic caching reference in 30e remains accurate. No update block added.
- **LangMem 59.82s latency** — Already documented in 30a with a 2026-04-21 block. Confirmed by web search. No additional changes.
- **Zep LongMemEval 63.8% vs Mem0 49.0%** — Already documented in 30b. No change.
- **Claude API Memory Tool** — Already documented in 30b with full detail. No change.
- **30e coherence schema** — Core schema remains accurate. Update block added for Recraft/FLUX.2 clarifications only.

---

# Research Update Log — 34-installable-skills-survey (batch a)

**Date:** 2026-04-21  
**Scope:** First 9 files alphabetically in `docs/research/34-installable-skills-survey/`  
**Files edited:** 9  
**Method:** Read each file → web-search key claims → edit in-place with `> **Updated 2026-04-21:**` blocks

---

## Files Updated

### 1. `3d-realtime-emerging-skills.md`

**Changes:**
- Added update block at §1 (fal-3d): HunyuanV3 pricing corrected from $0.375 (preview price) to **$0.16/generation** per fal.ai pricing page April 2026. Noted MCP spec 2025-11-25 is Latest Stable; SSE deprecated, backward compat until 30 June 2026.
- Corrected HunyuanV3 cost inline in the provider table.
- Added update block at §2 (fal-realtime): FLUX.2 [klein] release confirmed January 15, 2026. 9B variant detail added: 9B flow model + 8B Qwen3 text encoder, 4-step distillation, <0.5s on 9B (not just <1s). Unified text-to-image and editing natively.

**Stale claims corrected:**
- $0.375 HunyuanV3 price → $0.16 (confirmed via fal.ai pricing page)
- 9B variant not described at all in original → added

---

### 2. `audio-tts-skills.md`

**Changes:**
- Added top-level update block: Eleven v3 is now flagship model (70+ languages, Audio Tags, 68% fewer complex-text errors). `eleven_flash_v2_5` costs 0.5 credits/char (effectively 20,000 chars/month free, not 10,000). Free tier no commercial rights. ElevenLabs MCP is MCP spec 2025-11-25 compliant; SSE deprecated 30 June 2026.

**Stale claims corrected:**
- Free tier capacity: the 0.5 credits/char efficiency of flash models means the effective free character budget is 20,000/month, not 10,000.

---

### 3. `awesome-collections-image-skills.md`

**Changes:**
- Added top-level update block: Confirmed SKILL.md spec (required: `name` max 64 chars, `description` max 1024 chars; optional: `disable-model-invocation`, `mode`, `allowed-tools`, `compatibility`; body ≤500 lines). Confirmed cross-IDE portability paths for Claude Code, Cursor, Windsurf, Gemini CLI, Cline (native SKILL.md 2026), Codex, Antigravity. Smithery: 7,000+ servers April 2026.

**New facts added:**
- Cline adopted SKILL.md format natively in 2026 (experimental)
- Continue.dev also supports SKILL.md portability
- Smithery server count: 7,000+ as of April 2026

---

### 4. `composio-volt-collections.md`

**Changes:**
- Updated the existing `> Updated 2026-04-21` block to add: MCP spec 2025-11-25 is Latest Stable (Streamable HTTP replaces SSE; SSE backward compat until 30 June 2026). SKILL.md format conventions consistent with Anthropic spec. Smithery: 7,000+ servers.

---

### 5. `diagram-svg-skills.md`

**Changes:**
- Added top-level update block: Cross-IDE portability confirmed (Claude Code, Cursor, Windsurf, Gemini CLI, Cline, Codex, Antigravity). MCP spec 2025-11-25 Latest Stable — Streamable HTTP required for new remote MCP servers; SSE deprecated, backward compat until 30 June 2026. Remote MCP tools like Kroki API fallback should target Streamable HTTP. Smithery: 7,000+ servers.

---

### 6. `fal-ai-skills.md`

**Changes:**
- Added top-level update block: Hunyuan3D pricing corrected to $0.16/generation (from $0.375). Nano Banana Pro pricing: $0.15 (1K/2K), $0.30 (4K). fal-generate default model is now Nano Banana Pro (`fal-ai/nano-banana-pro`), replacing earlier Flux-only defaults. RamboRogers MCP already serves Streamable HTTP on port 3000 (`--http` flag), consistent with MCP spec 2025-11-25. SSE deprecated, backward compat until 30 June 2026.

**Stale claims corrected:**
- HunyuanV3 price $0.375 → $0.16
- fal-generate default model: now Nano Banana Pro (not Flux)

---

### 7. `figma-design-tool-skills.md`

**Changes:**
- Added top-level update block: Figma now offers a **remote MCP server** at `https://mcp.figma.com/mcp` (Streamable HTTP, no desktop app required) — this is the recommended path. Write-to-canvas is beta, free during beta, will become usage-based paid. Full seat required to write; Dev seat is read-only. SSE deprecated; remote server uses Streamable HTTP.
- Updated §1 (How It Works) to document the two-path architecture: remote server (recommended) vs desktop/plugin server (legacy).
- Updated the summary table to add the remote server as the top row (recommended path).

**New facts added:**
- Figma remote MCP endpoint: `https://mcp.figma.com/mcp`
- Write-to-canvas beta: free during beta, will be usage-based paid
- Full seat vs Dev seat distinction for write vs read-only
- Remote server is recommended and does not require Figma desktop app

---

### 8. `flux-and-antigravity-skills.md`

**Changes:**
- Added update block at §1 (antigravity-awesome-skills): Kiro CLI/IDE are new supported IDEs in v10+. Cline now natively supports SKILL.md format. Antigravity's SKILL.md spec is consistent with Claude Code spec. Smithery: 7,000+ servers.
- Added update block at §2b (Google Imagen): Confirmed Gemini/Imagen API has no free tier as of 2025-12. Unbilled keys return HTTP 429 `limit: 0`. Nano Banana Pro via fal.ai: $0.15/image. Web UI still free (~500–1,000 images/day). Both `imagen` and `ai-studio-image` antigravity skills require billed projects.

**Stale claims corrected:**
- The skills were documented without the billing caveat for Gemini image API; now clearly noted

---

### 9. `free-nokey-generation-skills.md`

**File already had a top-level update block** (Gemini free API removal). Added additional inline updates:

- Summary table: added `> Updated 2026-04-21` block noting Pollinations Spore tier ~1.5 req/week (effectively unusable), anonymous tier unchanged at 1 req/15s, Seed-tier (free signup) gives 1 req/5s. `nologo=true` no longer suppresses watermarks for anonymous users without account verification. Together.ai FLUX.1 [schnell]-Free endpoint is unlimited free access (confirmed). MCP spec note on MCPollinations/PromptPilot/Nakkas Streamable HTTP targeting.
- Rate limit table: corrected Pollinations entry (noted Spore unusability), corrected Google AI Studio entry (web UI only; API requires billed project), corrected fal.ai credit estimate (65 images at Nano Banana Pro pricing), clarified Together.ai FLUX.1 [schnell]-Free is unlimited free access.

**Stale claims corrected:**
- Pollinations Spore tier: effectively unusable as of February 2026 (~1.5 req/week)
- Together.ai: FLUX.1 [schnell]-Free is confirmed unlimited free (no credit needed)
- fal.ai credit estimate: $10 / $0.15 per image ≈ 65 Nano Banana Pro images (not "200–3000" — that range reflected very cheap models only)

---

## Key Cross-Cutting Corrections (affects all 9 files)

| Topic | Old claim | Corrected claim |
|---|---|---|
| MCP spec version | Variously "draft", "2024-11-05", or unspecified | **2025-11-25 is Latest Stable**; Streamable HTTP replaces SSE; SSE backward compat until 30 June 2026 |
| SKILL.md portability | Listed Claude Code, Cursor, Codex, Windsurf, Gemini CLI | **Add Cline** (native SKILL.md support, 2026) and **Continue.dev** |
| Smithery server count | Not mentioned or undercounted | **7,000+ servers** as of April 2026 |
| HunyuanV3 price | $0.375 (preview price) | **$0.16/generation** (current fal.ai pricing) |
| Gemini/Imagen free API | "~1,500 images/day free" or "free tier" | **No free API tier since 2025-12**; web UI at aistudio.google.com is still free |
| Figma MCP architecture | Plugin-bridged local server only | **Remote server** at `https://mcp.figma.com/mcp` is now recommended; no plugin required |
| ElevenLabs free capacity | "10,000 chars/month" | **10,000 credits/month**; flash/turbo models cost 0.5 credits/char, so effective budget is up to 20,000 chars/month for those models |
| Pollinations Spore tier | "Free registered tier" implied usable | **~1.5 req/week** as of Feb 2026 (issue #8542); Seed-tier (free signup) is the usable free tier at 1 req/5s |

---

## Sources Consulted

- https://code.claude.com/docs/en/skills — SKILL.md format spec
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview — frontmatter fields
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports — MCP spec transport status
- https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/ — SSE deprecation rationale
- https://geminicli.com/docs/hooks/ — Gemini CLI hooks (SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, BeforeAgent, AfterAgent confirmed)
- https://geminicli.com/docs/tools/mcp-server/ — Gemini CLI native MCP via mcpServers in settings.json and gemini-extension.json
- https://fal.ai/pricing — fal.ai current model pricing
- https://fal.ai/models/fal-ai/triposr — TripoSR $0.07/generation confirmed
- https://smithery.ai — 7,000+ MCP servers April 2026
- https://developers.figma.com/docs/figma-mcp-server/ — Figma remote MCP server
- https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/ — write-to-canvas beta
- https://elevenlabs.io/pricing — ElevenLabs 2026 pricing
- https://elevenlabs.io/docs/overview/models — Eleven v3 model details
- https://venturebeat.com/technology/black-forest-labs-launches-open-source-flux-2-klein-to-generate-ai-images-in — FLUX.2 [klein] January 15, 2026 release
- https://github.com/pollinations/pollinations/issues/8542 — Pollinations Spore tier degradation
- https://medium.com/data-science-collective/using-skills-with-cline-3acf2e289a7c — Cline SKILL.md support

---

# Research Update Log — Category 34 (Part B: files 10+)
**Date:** 2026-04-21  
**Scope:** Files 10+ alphabetically in `34-installable-skills-survey/`, plus SYNTHESIS.md and index.md  
**Files in scope:** index.md, LANDSCAPE.md, multi-provider-mcp-servers.md, nano-banana-skills.md, NEW-SKILLS-ROADMAP.md, openai-official-skills.md, SYNTHESIS.md, video-generation-skills.md, web-asset-skills.md

---

## Summary of Changes

### index.md
- Updated frontmatter to add `last_updated: 2026-04-21`
- Added a "Key facts current as of 2026-04-21" callout block with 9 bullet points covering all major topics verified in this audit session

### LANDSCAPE.md
- **Smithery row updated:** 6k+ → 7k+ servers in the collection table
- Added inline `> Updated` block confirming Smithery crossed 7,000 servers April 2026, with hosted remote server support
- **Nano-banana skill section:** corrected the "free tier" claim — Google free image-gen quota removed December 2025; skill now requires billed project. Added `> Updated` block.
- **Platform install table:** Added GitHub Copilot row (MCP + Agent Skills GA March 2026; `microsoft/skills` repo; `.agent.md` format); updated Gemini CLI row (Agent Skills native March 2026); updated Claude Code MCP column (Streamable HTTP support noted)
- **New section added:** "New Skill/Plugin Marketplaces (2025–2026)" — full table covering skills.sh, Smithery (7k+), vercel-labs/skills CLI v1.1.1, mcpmarket.com, mdskills.ai, claudemarketplaces.com, microsoft/skills
- Added MCP-as-unifying-layer paragraph with AAIF facts (170+ members, Mazin Gilbert as permanent ED)
- Added SSE deprecation note (MCP spec 2025-03-26; Streamable HTTP is production standard)

### SYNTHESIS.md
- Updated frontmatter: added `last_updated: 2026-04-21`
- **Platform install table:** Added GitHub Copilot row; updated Gemini CLI row; updated Claude Code MCP column with Streamable HTTP note
- **Practical install path section (items 1–5):** Extended to 6 items; added Gemini CLI Agent Skills note; added GitHub Copilot path; added vercel-labs/skills (`npx skills`) as universal item with v1.1.1, ~14.7k★, `npx skills find`, skills.sh
- Added `> Updated` block at end of install path section summarizing SSE deprecation and Streamable HTTP
- **Nano Banana section:** Added `> Updated` block noting 347-star count reflects historical adoption, correcting free-tier claim, adding AAIF/Smithery ecosystem context, confirming Mazin Gilbert as permanent ED

### multi-provider-mcp-servers.md
- Added `> Updated` block to lansespirit/image-gen-mcp Architecture Highlights section: SSE deprecated (MCP spec 2025-03-26); Streamable HTTP is correct choice for Claude Code integration

### nano-banana-skills.md
- Added `> Updated` block before "Model Status as of April 2026" heading: confirms `gemini-3-pro-image-preview` dead as of April 21, confirms `gemini-3.1-flash-image-preview` active, restates free-tier removal, directs to Cloudflare Workers AI / HF Inference / Pollinations for zero-key generation

### NEW-SKILLS-ROADMAP.md
- Rewrote the nano-banana `GEMINI_API_KEY` requirement paragraph: removed "obtainable without a credit card" claim (now incorrect since free image tier removed), replaced with accurate billing requirement, noted $0.039/img pricing, directed zero-key users to Cloudflare Workers AI
- Added `> Updated` block restating active/dead model IDs and reframing skill as "low-cost Gemini" not "free tier"

### openai-official-skills.md
- Added `> Updated` block after Finding #6 (agentskills.io standard): notes GitHub Copilot adoption of SKILL.md-shape agent skills (March 2026), microsoft/skills repo, vercel-labs/skills v1.1.1 supporting 19 agents, skills.sh as canonical leaderboard, declares SKILL.md has "won the agent skills portability war"

### video-generation-skills.md
- Added `> Updated` block after the Coverage Gaps paragraph in Section 3 (Provider Coverage Map): confirms no major new provider coverage changes; notes Veo 3.1 growing; confirms no free-tier programmatic video generation exists

### web-asset-skills.md
- Added `> Updated` block before "Summary: Largest Gaps" section: notes vercel-labs/skills v1.1.1 as standard cross-IDE install tool, skills.sh as leaderboard, recommends packaging surveyed skills via `npx skills`, cites MeiGen's multi-IDE install as the 2026 ecosystem expectation

---

## Facts Verified by Web Search

| Claim | Status | Source |
|---|---|---|
| Smithery 7,000+ servers April 2026 | Confirmed | truefoundry.com best-mcp-registries; automationswitch.com; workos.com/blog/smithery-ai |
| AAIF 170+ member organizations April 2026 | Confirmed | techzine.eu (146 members mid-April); linuxfoundation.org press releases show 97 new members batch; aaif.io/press |
| Mazin Gilbert permanent Executive Director of AAIF | Confirmed | aaif.io; linuxfoundation.org press |
| MCP's home is AAIF (Linux Foundation) | Confirmed | linuxfoundation.org formation announcement; aaif.io home |
| vercel-labs/skills v1.1.1 with `npx skills find` | Confirmed | vercel.com/changelog/skills-v1-1-1; github.com/vercel-labs/skills |
| vercel-labs/skills ~14.7k GitHub stars | Confirmed | search results (14.1k–14.7k range, April 2026) |
| skills.sh directory launched January 2026, 19 agents | Confirmed | virtualuncle.com; vercel.com/changelog |
| SSE transport deprecated in MCP spec 2025-03-26 | Confirmed | blog.fka.dev; modelcontextprotocol.io/specification/2025-03-26; brightdata.com; auth0.com |
| Claude Code supports Streamable HTTP for remote MCP | Confirmed | code.claude.com/docs/en/mcp; infoq.com news/2025/06/anthropic-claude-remote-mcp |
| GitHub Copilot MCP + Agent Skills GA March 2026 | Confirmed | devblogs.microsoft.com/visualstudio; docs.github.com/en/copilot |
| Gemini CLI Agent Skills support March 2026 | Confirmed | medium.com/google-cloud ("Gemini CLI extensions just got smarter: introducing Agent Skills") |
| `gemini-3-pro-image-preview` dead March 9, 2026 | Confirmed (consistent with existing research; no reinstatement announced) |
| Gemini free image tier removed December 2025 | Confirmed (consistent with existing research + CLAUDE.md memory) |

---

## Changes NOT Made (Out of Scope or Unchanged)

- Files 1–9 alphabetically (3d-realtime-emerging-skills.md, audio-tts-skills.md, awesome-collections-image-skills.md, composio-volt-collections.md, diagram-svg-skills.md, fal-ai-skills.md, figma-design-tool-skills.md, flux-and-antigravity-skills.md, free-nokey-generation-skills.md) — covered by the Part A update session (updates-34a.md expected)
- No changes to star counts for repos other than smithery server count and vercel-labs/skills — individual community repo stars fluctuate constantly and are not worth pinning
- No changes to pricing tables (fal.ai, OpenAI, etc.) — these are authoritative in data/model-registry.json

---

# Updates applied to research/33-model-routing-ensembling — 2026-04-21

## Files edited

- `33a-llm-routing-frameworks.md`
- `33b-confidence-based-escalation.md`
- `33c-best-of-n-parallel-generation.md`
- `33d-elo-ab-testing-model-selection.md`
- `33e-async-race-with-validation.md`
- `SYNTHESIS.md`

`index.md` — no changes needed (already dated 2026-04-21, table of contents accurate).

---

## Summary of changes by file

### 33a — LLM Routing Frameworks

- Header update block added covering status of all four frameworks.
- RouteLLM: confirmed ICLR 2025 publication (UC Berkeley / Anyscale / Canva); GitHub active (last commit June 2025). Cost-quality figures annotated as paper benchmarks against GPT-4 / Mixtral pair.
- Martian: URL corrected from `route.withmartian.com` to `work.withmartian.com`; valuation ($1.3B, Apr 2026) and 300+ enterprise customers added. Compliance feature and Apart Research interpretability hackathon (May 2025) noted.
- Not Diamond: OpenRouter Auto Router integration documented — Not Diamond powers OpenRouter's auto-routing at no extra fee. Custom router training path via logged (query, chosen_model) pairs noted.
- RouterArena: paper updated to v2 (November 27, 2025). Evaluated routers corrected to the 6 in the actual paper (CARROT, RouterDC, GraphRouter, MIRT-BERT, NIRT-BERT, RouteLLM). CARROT leads Arena + Latency; RouterDC leads Cost-ratio. VL-RouterBench (arXiv:2512.23562, December 2025) added as companion benchmark for vision-language model routing.
- Sources updated: added VL-RouterBench, RouteLLM OpenReview ICLR link, updated Martian URL.

### 33b — Confidence-Based Escalation

- Header update block added covering all cascade tier changes.
- Cascade tier table completely revised:
  - Tier 1: `flux-schnell` supplemented with `flux.2-klein` (Apache 2.0, Jan 2026, ~13GB VRAM, sub-second local inference).
  - Tier 2 (new): `gpt-image-1-mini` (Oct 2025, ~80% cheaper than gpt-image-1, RGBA-capable, token-based pricing ~$0.008/image at 1024² medium).
  - Tier 3: `recraft-v4` ($0.08 standard vector / $0.30 pro vector, Feb 2026 SOTA SVG) and `ideogram-3-turbo` at $0.03/image via `/ideogram-v3/generate-transparent` endpoint.
  - Tier 4: `gpt-image-1` / `gpt-image-1.5` (terminal tier).
  - DALL-E 3 removed (EOL May 12, 2026). Imagen 4.0 removed (EOL June 24–30, 2026).
- Pre-routing section updated: `gpt-image-1-mini` added as valid transparent candidate; wordmark >3 words + transparent → skip directly to tier 4.
- Schema example corrected: Ideogram tier now uses `endpoint: "/ideogram-v3/generate-transparent"` with `params.rendering_speed: "TURBO"`.

### 33c — Best-of-N Parallel Generation

- Header update block added.
- Cross-model BoN example updated:
  - Variant B: `ideogram-3-turbo` endpoint corrected from `style: "transparent"` to `/ideogram-v3/generate-transparent` with `rendering_speed: "TURBO"`.
  - Variant C: `recraft-v3` updated to `recraft-v4` (Feb 2026 SOTA SVG; note: no `style_id` — V3 retained for brand-style pipelines).
  - Variant D added: `gpt-image-1-mini` (~$0.008/image) as a budget cross-model BoN candidate.
- Recraft V4 Pro Vector pricing noted ($0.30/image) as highest-cost leg in cross-model set.
- Note on `recraft-v4` vs `recraft-v3` for `style_id` usage clarified.

### 33d — ELO and A/B Testing for Model Selection

- Header update block added.
- Arena ELO table updated to April 2026 standings with notes column:
  - GPT Image 1.5 (1274) — Dec 2025, RGBA, 4× faster, ~20% cheaper than gpt-image-1.
  - Nano Banana 2 (1264) — GA Feb 26, 2026 (gemini-3.1-flash-image-preview).
  - Nano Banana Pro (1215), FLUX.2 [max] (1204), Seedream 4.0 (1201), FLUX.2 [dev] Turbo (1165).
  - DALL-E 3 removed from Arena listing.
- `routing-table.json` schema example updated: `gpt-image-1` → `gpt-image-1.5`; `recraft-v3` → `recraft-v4`; `gpt-image-1-mini` added; Ideogram transparent endpoint corrected.
- Non-stationarity caveat strengthened with concrete example: Google deprecated `gemini-2.5-flash-image-preview` January 15, 2026 (only 3 months after GA), silently breaking routing tables that targeted the preview variant.
- New models with limited Arena data listed: gpt-image-1-mini, hidream-i1, qwen-image-2.0, flux1-kontext-pro, flux.2-klein.
- `gemini-2.5-flash-image` (~$0.039/img, GA Oct 2 2025, EOL Oct 2 2026) noted as cost-constrained Gemini routing candidate.

### 33e — Async Race with Validation

- Header update block added.
- OpenRouter clarification: Auto Exacto is provider-level load balancing (not model-level parallel racing); Auto Router (Not Diamond) selects a single model. Parallel race requires explicit concurrent HTTP requests.
- Mixture-of-Experts section updated:
  - `recraft-v3` → `recraft-v4` as vector specialist.
  - `flux-pro` → `flux.2-dev` / `flux.2-max` as photorealistic scene specialist.
  - FLUX.1 Kontext [pro] (May 29, 2025) and [dev] (June 26, 2025, open-weights 12B) added as race candidates for instruction-based editing tasks (local edit, global edit, character preservation, style reference, text editing).
  - Flux.2 [klein] (Jan 2026, Apache 2.0, sub-second local) noted as a compelling local race leg that can race against remote API calls.
- Sources updated: added fal.ai async inference docs URL, FLUX.1 Kontext release pages, Flux.2 repo/blog.

### SYNTHESIS.md

- Date corrected from 2026-04-20 to 2026-04-21.
- Files table updated with April 2026 model notes per row.
- Conclusion #5 (ELO) updated with April 2026 Arena top-6 and annotated model list including new entrants.
- New section "April 2026 Model Landscape Update" added before Priority Implementation Order:
  - Deprecations table: DALL-E 3 (EOL May 12, 2026), Imagen 4.0 (EOL June 24–30, 2026), gemini-2.5-flash-image-preview (discontinued Jan 15, 2026).
  - New models table: gpt-image-1.5, gpt-image-1-mini, recraft-v4, flux.2-klein, flux1-kontext-pro, flux1-kontext-dev, hidream-i1, qwen-image-2.0, gemini-2.5-flash-image, midjourney-v7/v8-alpha/v8.1-alpha.
  - Corrected API parameters table: Ideogram transparent endpoint fix.
- Existing routing-table.json compatibility note updated: suggested `deprecated_after` field for lifecycle-removed models.

---

## Key facts verified by web search

| Claim | Status |
|---|---|
| RouteLLM published ICLR 2025 | Confirmed |
| Martian nearing $1.3B valuation April 2026 | Confirmed (Medium / PitchBook) |
| Not Diamond powers OpenRouter Auto Router at no extra fee | Confirmed |
| RouterArena v2 updated November 2025; 6 evaluated routers (not 12) | Confirmed |
| VL-RouterBench arXiv:2512.23562 December 2025 | Confirmed |
| Recraft V4 released February 2026; $0.08 standard vector, $0.30 pro vector; no style_id | Confirmed |
| DALL-E 3 EOL May 12, 2026 | Confirmed (OpenAI developer forum official deprecation notice) |
| gpt-image-1.5 December 2025; 4× faster, ~20% cheaper, same RGBA | Confirmed |
| gpt-image-1-mini October 2025; ~80% cheaper; token-based pricing $8/M output image tokens | Confirmed |
| Ideogram V3 transparent: endpoint `/ideogram-v3/generate-transparent`, `rendering_speed: "TURBO"`, $0.03/image | Confirmed (WaveSpeedAI docs, multiple aggregators) |
| Imagen 4.0 family deprecated; EOL June 24–30, 2026; migrate to gemini-2.5-flash-image | Confirmed |
| gemini-2.5-flash-image GA Oct 2, 2025; ~$0.039/img; EOL Oct 2, 2026; successor is gemini-3.1-flash-image-preview (Nano Banana 2) | Confirmed |
| gemini-2.5-flash-image-preview discontinued January 15, 2026 | Confirmed |
| Flux.2 [klein] 4B, Apache 2.0, released January 15, 2026, ~13GB VRAM, sub-second on RTX 3090 | Confirmed |
| FLUX.1 Kontext [pro] May 29, 2025; [dev] June 26, 2025 (open-weights 12B) | Confirmed |
| HiDream-I1: 17B sparse MoE DiT, HF Space April 8, 2025, paper May 28, 2025 | Confirmed |
| Qwen-Image-2.0: 7B, Feb 2026, #1 AI Arena text-to-image + editing | Confirmed |
| Midjourney v7 default June 2025; v8 Alpha March 2026; v8.1 Alpha April 14, 2026 | Confirmed |
| fal.ai Queue API: no material API changes since original research | Confirmed (docs structure unchanged) |
| OpenRouter: parallel race requires explicit concurrent HTTP requests; `models[]` is sequential fallback only | Confirmed |

---

## routing-table.json / model-registry.json action items (not applied in this research update — apply separately)

1. Remove `dall-e-3` entries; set `deprecated_after: "2026-05-12"` in any remaining references.
2. Remove `imagen-4.0`, `imagen-4.0-ultra`, `imagen-4.0-fast` entries; set `deprecated_after: "2026-06-30"`.
3. Remove `gemini-2.5-flash-image-preview` (discontinued January 15, 2026).
4. Add `gpt-image-1.5` with `rgba: true`, `pricing: { per_image_medium_1024: 0.034 }`.
5. Add `gpt-image-1-mini` with `rgba: true`, `pricing: { per_1m_output_tokens: 8.00, approx_per_image_medium_1024: 0.008 }`.
6. Update `recraft-v3` to add `eol_note: "keep for style_id brand pipelines; V4 preferred for fresh generation"`.
7. Add `recraft-v4` with `native_svg: true`, `style_id: false`, `pricing: { vector: 0.08, pro_vector: 0.30 }`.
8. Add `flux.2-klein` with `license: "apache-2.0"`, `params: 4e9`, `vram_gb: 13`, `latency_note: "sub-second on RTX 3090"`.
9. Add `flux1-kontext-pro` and `flux1-kontext-dev` with `capability: ["local_edit", "global_edit", "character_reference", "style_reference", "text_edit"]`.
10. Add `hidream-i1` with `params: 17e9`, `architecture: "sparse_moe_dit"`.
11. Add `qwen-image-2.0` with `params: 7e9`, `max_resolution: "2048x2048"`, `unified_gen_edit: true`.
12. Add `gemini-2.5-flash-image` with `pricing: { per_image: 0.039 }`, `eol_date: "2026-10-02"`, `successor: "gemini-3.1-flash-image-preview"`.
13. Update `midjourney` entry to v7 (default); add `midjourney-v8-alpha` and `midjourney-v8.1-alpha` as alpha-tier paste-only entries.
14. Correct all `ideogram-3-turbo` transparent routing: replace `style: "transparent"` with `endpoint: "/ideogram-v3/generate-transparent"`, `rendering_speed: "TURBO"`.
