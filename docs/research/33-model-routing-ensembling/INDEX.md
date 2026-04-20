# Research 33 — Model Routing and Ensembling

**Date:** 2026-04-20  
**Scope:** Routing strategies applicable to the prompt-to-asset MCP server. All five files cover distinct strategies that compose, not compete.

---

## Files

| File | Pattern | Key source |
|---|---|---|
| [33a](./33a-llm-routing-frameworks.md) | Framework survey: RouteLLM, Martian, Not Diamond, RouterArena | arXiv:2406.18665, arXiv:2510.00202 |
| [33b](./33b-confidence-based-escalation.md) | Sequential cascade: cheap model first, escalate on quality failure | arXiv:2305.05176 (FrugalGPT) |
| [33c](./33c-best-of-n-parallel-generation.md) | Best-of-N: generate N variants, VLM-score, return highest | arXiv:2502.12668, arXiv:2501.13007 |
| [33d](./33d-elo-ab-testing-model-selection.md) | ELO from image arenas + A/B canary traffic splitting | Artificial Analysis Arena, LMSYS BT model |
| [33e](./33e-async-race-with-validation.md) | Async race: parallel dispatch, first to pass validation wins | fal.ai Queue API, Promise.any |

---

## Cross-Cutting Conclusions

### 1. Use a structured feature vector, not text embeddings, for routing input

LLM routing frameworks (RouteLLM, Not Diamond, Martian) use text embeddings or LLM classifiers to measure prompt complexity. For asset routing, the relevant features are already categorical and enumerable: `asset_type`, `text_length` (0 / 1–3 / >3), `transparency_required` (bool), `vector_required` (bool), `brand_bundle_present` (bool). A logistic regression or XGBoost over these 5–6 features will outperform a text-similarity router because it sidesteps the brittleness of text representation methods (documented in RouterArena: explicit representation methods show poor noise resistance).

### 2. The three strategies compose as layers

```
Request
  └─ Pre-routing (feature vector → tier skip, see 33a/33b)
       └─ Async race or cascade (see 33b / 33e)
            └─ Best-of-N within the winning tier (see 33c)
                 └─ VLM judge gate (used by all three)
                      └─ ELO/A/B logging (feeds back into routing weights, see 33d)
```

Not every request needs all layers. High-volume, cost-sensitive requests use pre-routing + cascade only. High-value brand assets use pre-routing + BoN + race.

### 3. VLM judge is the load-bearing primitive

All three active strategies (cascade escalation, BoN selection, race gate) require a quality signal that image models do not natively emit. The VLM judge (GPT-4o mini or Gemini Flash with a structured JSON rubric) is the only viable automated quality signal at image generation timescales. Budget 1–5 seconds and $0.001–0.003 per judge call. Do not skip it or replace it with CLIP cosine similarity — CLIP does not detect alpha channel errors, safe-zone violations, or text rendering accuracy.

### 4. FrugalGPT cascade is the highest-ROI change to routing-table.json

The existing `fallback[]` arrays in routing-table.json are sequential cascades with no escalation signal — they only trigger on API errors, not on quality failures. Adding a `cascade[]` array with `escalate_if` conditions referencing the existing `postprocess` validation functions converts the current error-only fallback into a quality-gated cascade. This is a schema extension only; no new infrastructure required if the postprocess validators already run.

### 5. ELO data exists; use it as a prior, not ground truth

The Artificial Analysis Text-to-Image Arena provides current ELO scores for the models already in routing-table.json (gpt-image-1, FLUX.2, ideogram-3-turbo, recraft-v3). Use these as initial routing weights. Override with locally computed Bradley-Terry scores once you accumulate ≥50 per-model, per-asset-type validation outcomes.

### 6. Cancellation is non-trivial in async races

fal.ai supports cancellation of IN_QUEUE requests at no cost. IN_PROGRESS cancellation may still incur partial compute charges. Set `X-Fal-No-Retry: true` on race legs that are not the primary to avoid zombie retries after the race winner is declared.

---

## Priority Implementation Order

1. **[High, low effort]** Add `cascade[]` with `escalate_if` to existing routing-table.json rules. Reuse existing postprocess validators. No new code path — just a schema and orchestrator change.

2. **[High, medium effort]** Add VLM judge call between cascade tiers. Single function: `vlmJudge(imagePath, brief, rubric) -> float`. Used by cascade, BoN, and race.

3. **[Medium, medium effort]** Add `best_of_n` config to high-value rules (transparent_mark, logo-with-text-1-3-words). Issue N concurrent API calls; pick highest VLM score.

4. **[Medium, high effort]** Add A/B canary routing: `challenger` field on routing rules, traffic fraction, experiment logging. Requires experiment log storage and offline analysis tooling.

5. **[Low priority, high effort]** Local Bradley-Terry ELO computation from logged outcomes. Useful at scale; premature until request volume justifies the engineering.

---

## Existing routing-table.json compatibility

All proposed changes are additive. The existing `primary`, `fallback`, `never`, and `postprocess` fields remain valid. New fields (`cascade`, `best_of_n`, `challenger`, `models_with_elo`) are optional and default to current behavior when absent. A JSON Schema update is required; the existing `$schema` pointer should be bumped from `1.1.0` to `1.2.0`.
