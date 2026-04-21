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
