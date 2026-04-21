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
