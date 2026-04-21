---
title: "P2A skills gap analysis"
category: skills-for-p2a
date: 2026-04-21
---

> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.
>
> **Additional corrections (2026-04-21):**
> - **DALL-E 3 retiring May 12, 2026.** Migrate to `gpt-image-1.5` (current, 20% cheaper than gpt-image-1, stronger brand logo preservation in edits).
> - **Recraft V3 → V4.** All references to Recraft V3 for native SVG should use V4 Vector or V4 Pro Vector (released February 2026).
> - **Ideogram transparency:** The transparent generation endpoint is `/ideogram-v3/generate-transparent` (dedicated endpoint), NOT `style: "transparent"` on the standard generate endpoint.
> - **Midjourney V8 Alpha** launched March 17, 2026. No official public API still. V8 sref codes differ from V7; regenerate style bundles against V8.
> - **Claude model references:** claude-sonnet-4-20250514 / claude-opus-4-20250514 retire June 15, 2026. Use claude-sonnet-4-6 / claude-opus-4-6.
> - **MCP spec 2025-11-25** is Latest Stable (released November 25, 2025). No breaking changes to tool schemas.

# P2A Skills Gap Analysis

## Executive Summary

P2A has **8 production skills** (logo, favicon, og-image, illustration, app-icon, transparent-bg, vectorize, asset-enhancer) covering 9 asset types, plus the separate `frontend-design` skill and 14 `superpowers` meta-workflow skills.

The skills are technically sound — every routing decision traces to research. But **critical gaps exist at the skill level**: missing SVG authoring guidance, shallow prompt-dialect rationale, no multi-asset brand consistency workflow, no repair cookbook for validation failures, no typography guidance beyond "composite it."

**Impact:** A user can generate one good asset. They cannot reliably produce a 12-asset brand kit, debug validation failures, or understand why model routing chose what it chose.

---

## Coverage Matrix

| Capability | Covering skill | Coverage | Quality | Gap |
|---|---|---|---|---|
| SVG authoring (inline_svg) | asset-enhancer, logo, favicon | Partial | Shallow | Mode documented; authoring rules absent. No path grammar, no style skeleton, no failure patterns. |
| Prompt rewriting | asset-enhancer (brief notes) | Partial | Weak | 6 providers listed with 2-sentence summaries. No decision tree, no rationale for why they differ. |
| Model routing | asset-enhancer (routing table ref) | Partial | Shallow | Router mentioned; decision matrix is in `routing-table.json` only. User cannot reason about routing. |
| Free-route detection | asset-enhancer § modes | Partial | Moderate | Order listed (Pollinations → HF → Stable Horde → Nano Banana). No quality/speed/friction ranking. |
| Brand injection (single asset) | logo, illustration, app-icon, transparent-bg | Good | Moderate | Each skill describes BrandBundle. Missing: required fields per model, behavior when fields absent. |
| Brand consistency (multi-asset) | illustration only | Partial | Weak | Full-set propagation described but LoRA training tool (`trainBrandLora`) not referenced in skill. |
| Validation → repair | asset-enhancer (1 table) | Partial | Very shallow | 7 failure modes, each 1–2 sentences. No prompt examples, no decision tree, no retry budget. |
| Typography / OG rendering | og-image | Good | Deep | Excellent Satori coverage. Gap: no fallback when @resvg/resvg-js unavailable. |
| MCP tool orchestration | asset-enhancer § "Recommended flow" | Partial | Weak | One waterfall shown. No guidance on tool chaining, A/B testing, or multi-pass refinement. |
| Transparency / matting | transparent-bg | Excellent | Deep | 4 matting paths with precedence. No skill on difference matting (code only). |
| Vectorization | vectorize | Good | Moderate | Three paths clear. Missing: when to stay raster, when does vectorization fail. |
| Favicon platform support | favicon | Excellent | Deep | Spec is authoritative and complete. |
| App icon platform support | app-icon | Excellent | Deep | iOS/Android/PWA/visionOS all covered. |
| Accessibility (WCAG) | favicon, og-image (validation only) | Partial | Very weak | WCAG 4.5:1 mentioned in validation; no skill teaches accessible color selection. |
| Cost optimization | None | Zero | — | No guidance on thumbnail-first, batch APIs, model routing by cost. |
| Caching / deduplication | None | Zero | — | Content-addressed cache exists in code; zero user-facing skill. |
| Self-refinement loops | None | Zero | — | Reflexion/Self-Refine research exists; not wired to any skill. |
| Typography in wordmarks | None | Zero | — | "Composite SVG type" mentioned but no skill on how. |

---

## Quality Gaps: Present but Shallow

### Prompt Rewriting Rationale (asset-enhancer)

Each provider entry is 3–5 lines. The `why` is absent:

| Provider | What skill says | What's missing |
|---|---|---|
| gpt-image-1 | "Prose sentences; `background: transparent` param" | Why not use negative_prompt? (silently ignored — not stated) |
| Imagen/Gemini | "≥30 words; no prompt transparency" | Why >30 words? (suppresses internal rewriter — not stated) |
| SDXL | "Tag-soup, 77-token CLIP limit, real negative_prompt" | When to front-load tags; how CLIP tokenization works |
| Flux | "Prose, T5 encoder, never send negative_prompt" | Why Flux errors on negative_prompt; T5 vs CLIP behavior |
| Midjourney | "`--sref`, `--cref`, `--mref`" | What each flag does; how to choose between them |
| Recraft | "`style_id`, `controls.colors`, native SVG" | How to set controls.colors (format? max colors?) |

No decision tree exists in the skill. A user choosing between providers cannot reason from skill docs alone.

### Free-Route Detection

Skill lists free-first order but doesn't explain trade-offs:
- **Pollinations**: zero signup, instant, RGB-only. No rate limit documented.
- **HF Inference**: free `HF_TOKEN`, queue varies, undocumented limits.
- **Stable Horde**: anonymous queue, communal workers, slowest.
- **Nano Banana (Google AI Studio)**: paid only as of Dec 2025 ($0.039/img for Gemini Flash Image / Nano Banana; $0.134/img for Gemini Pro Image / Nano Banana Pro). The "~1,500 images/day free" quota was withdrawn in December 2025 and the partial restoration (~500 RPD free as of Feb 2026) applies only to Gemini 2.5 Flash Image text-multimodal; **image generation endpoints remain paid**. For free interactive use, route users to the AI Studio web UI (https://aistudio.google.com) via `external_prompt_only` + `asset_ingest_external`.

Skill gives no speed/quality/friction ranking, no rate limit warnings, no escalation strategy when a free path fails.

### Brand Consistency at Scale (illustration skill)

The "Full-set propagation" section describes:
1. Generate #1 with brand bundle.
2. On accept, add to style reference set.
3. After 3–4 assets, train LoRA for tight lock.

**Missing:**
- Which MCP tool adds the accepted asset to the style reference set? (`trainBrandLora` exists but is unmentioned.)
- Where does the augmented reference set live between calls? (BrandBundle? User-managed path?)
- Convergence criteria: when is the style "tight enough"?
- Cost/ROI for LoRA training (~$50–$200); break-even at ~20+ assets.

### Validation Failure Repair

asset-enhancer's repair table (7 rows) has 1–2 sentences per failure. Example gaps:

| Failure | Skill says | What's needed |
|---|---|---|
| Checkerboard | "Route change" | Which route? Decision tree: Imagen → gpt-image-1 or Recraft |
| Alpha missing | "Matte with BiRefNet/RMBG" | Which one? When to call `asset_remove_background` MCP tool? |
| Wordmark garbled | "Composite SVG type" | What is SVG type? How to author it? Which fonts? |
| Palette drift | "Recraft controls.colors or recolor post" | How to recolor post? What if model isn't Recraft? |
| Safe zone violation | "Regenerate with center-framing" | Example prompt addition? How explicit? |

---

## Missing Skills Entirely

| Capability | Impact | Priority |
|---|---|---|
| **SVG authoring grammar** (`<path>` commands, grouping, path-count heuristics) | User emits invalid SVG → skill can't save → no file on disk | **4/5** |
| **Typography in wordmarks** (SVG `<text>`, font selection, kerning, SVG composite) | Most common logo request blocked; forces external tool | **4/5** |
| **Validation failure repair cookbook** (per-failure decision tree with prompt examples) | User regenerates blindly; wastes cost | **3/5** |
| **Brand consistency at scale** (LoRA training workflow, convergence criteria, `trainBrandLora` usage) | Multi-asset brand kit broken for agencies | **3/5** |
| **MCP tool chaining patterns** (when to use which tools, multi-pass flows) | Advanced workflows blocked | **2/5** |
| **Free-route ranking** (quality/speed/friction/rate-limit table per free provider) | Power users overpay; Pollinations users hit quality ceiling | **2/5** |
| **Cost optimization** (thumbnail-first, batch APIs, semantic dedup) | Only impacts high-volume users | **1/5** |
| **Accessibility-first design** (color-blind simulation, contrast selection before generation) | Compliance risk; not production-blocking | **2/5** |
| **Self-refinement loops** (convergence, iteration limits, seed sweep) | Needed for brand kit quality; advanced use case | **2/5** |

---

## Overlap & Redundancy

### 1. Brand palette described separately in 3 skills

- `logo/SKILL.md`: `Palette: [#hex, #hex, #hex] strictly.`
- `illustration/SKILL.md`: `Palette strictly limited to: [#hex, #hex, #hex, #hex, #hex].`
- `app-icon/SKILL.md`: `Palette: [#primary, #secondary, #accent].`

One consolidated "Brand Injection" section in `asset-enhancer` replaces all three.

### 2. Post-matte vectorization described in 2 skills

- `logo/SKILL.md` § Post-process: "K-means 6-color → vtracer → SVGO"
- `transparent-bg/SKILL.md`: "BiRefNet matte → K-means → vtracer or potrace"

A "Raster → Vector Pipeline" skill consolidates both.

### 3. Prompt dialect mentioned in 4 skills

`asset-enhancer` (most complete), `logo` (SD vs Flux note), `illustration` (Flux note), `og-image` (Flux note). One dedicated prompt-dialect skill replaces all four mentions.

---

## Priority Ranking

| Gap | Failure type | User impact | Priority |
|---|---|---|---|
| SVG authoring grammar | Invalid SVG → no file | Every inline_svg user | **4/5** |
| Typography in wordmarks | No workflow for text in logo | Most common single request | **4/5** |
| Validation failure repair cookbook | Blind regeneration, wasted cost | Every user who hits a failure | **3/5** |
| Brand consistency at scale | Style drift across 12+ assets | Agency/brand-kit use cases | **3/5** |
| Free-route ranking | Overpay or hit quality ceiling | Power users | **2/5** |
| MCP tool chaining | Advanced workflows blocked | Power users | **2/5** |
| Accessibility (WCAG design) | Compliance failures | Public-facing products | **2/5** |
| Cost optimization | Excess spend | High-volume users only | **1/5** |

---

## Recommendations

### P1 — Ship (block production)

1. **SVG Authoring Primer** — path grammar, grouping, path-count heuristics, failure patterns
2. **Typography in Logos** — when to use diffusion text vs SVG composite; font selection
3. **Validation Failure Cookbook** — one page per failure code with prompt examples and tool calls

### P2 — Consolidate (improve existing)

1. Merge brand palette sections from logo/illustration/app-icon into asset-enhancer
2. One prompt-dialect decision tree replacing 4 scattered mentions
3. Clarify free-route ranking with speed/quality/friction table

### P3 — Future

1. Brand consistency LoRA training workflow
2. MCP tool chaining patterns
3. Accessibility-first design guidance
4. Cost optimization (batch APIs, semantic dedup)

---

## Wired vs. Not-Yet-Wired Research

### Wired (implemented in code or skills)
- Routing by asset type + transparency + text length
- Dialect rules per provider (brief)
- Safe-zone enforcement
- Transparent-background fix hierarchy
- SVG vectorization paths
- App icon platform specs, favicon multi-format
- Brand bundle injection
- Matting strategies
- Upscaling awareness
- Validation tier-0

### Not-Yet-Wired (research exists, no skill coverage)
- Prompt weighting syntax (1d)
- VQAScore tier-1 thresholds (3a)
- Midjourney sref/cref/mref guide (7a)
- LoRA training workflow (6d)
- Reflexion/Self-Refine loops (26a–e)
- Cost-per-model routing (31)
- Semantic deduplication (31e)
- Brand guideline extraction via RAG (29)
- Provider regression testing (27e)
- Cost-guard circuit breaker (code only)
