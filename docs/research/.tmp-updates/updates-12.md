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
