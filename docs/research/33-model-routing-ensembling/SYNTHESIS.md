> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Research 33 — Model Routing and Ensembling

**Date:** 2026-04-21 (updated from 2026-04-20)
**Scope:** Routing strategies applicable to the prompt-to-asset MCP server. All five files cover distinct strategies that compose, not compete.

---

## Files

| File | Pattern | Key source |
|---|---|---|
| [33a](./33a-llm-routing-frameworks.md) | Framework survey: RouteLLM (ICLR 2025), Martian (~$1.3B, Apr 2026), Not Diamond (OpenRouter Auto Router), RouterArena v2 + VL-RouterBench | arXiv:2406.18665, arXiv:2510.00202, arXiv:2512.23562 |
| [33b](./33b-confidence-based-escalation.md) | Sequential cascade: cheap model first, escalate on quality failure — tiers updated for April 2026 model landscape | arXiv:2305.05176 (FrugalGPT) |
| [33c](./33c-best-of-n-parallel-generation.md) | Best-of-N: generate N variants, VLM-score, return highest — cross-model BoN updated with recraft-v4, ideogram transparent endpoint fix | arXiv:2502.12668, arXiv:2501.13007 |
| [33d](./33d-elo-ab-testing-model-selection.md) | ELO from image arenas + A/B canary traffic splitting — Arena table updated April 2026, new models added | Artificial Analysis Arena, LMSYS BT model |
| [33e](./33e-async-race-with-validation.md) | Async race: parallel dispatch, first to pass validation wins — FLUX.1 Kontext + Flux.2 [klein] added | fal.ai Queue API, Promise.any |

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

The Artificial Analysis Text-to-Image Arena provides current ELO scores for the models in routing-table.json. April 2026 top-6: GPT Image 1.5 (1274), Nano Banana 2 / gemini-3.1-flash-image (1264), Nano Banana Pro (1215), FLUX.2 [max] (1204), Seedream 4.0 (1201), FLUX.2 [dev] Turbo (1165). Use these as initial routing weights for `gpt-image-1.5`, `ideogram-3-turbo`, `recraft-v4`, and `flux.2-dev`. Override with locally computed Bradley-Terry scores once you accumulate ≥50 per-model, per-asset-type validation outcomes.

> **Updated 2026-04-21:** Model set updated. `gpt-image-1.5` replaces `gpt-image-1` as the top OpenAI candidate (Dec 2025, ~20% cheaper, same RGBA). `recraft-v4` replaces `recraft-v3` as the SOTA vector candidate (Feb 2026). New entrants with limited Arena data: `gpt-image-1-mini` (Oct 2025), `hidream-i1` (Apr 2025, 17B sparse MoE DiT), `qwen-image-2.0` (Feb 2026, 7B, #1 on AI Arena text-to-image + editing as of late Feb 2026), `flux1-kontext-pro` (May 2025, instruction editing), `flux.2-klein` (Jan 2026, Apache 2.0, local consumer GPU). DALL-E 3 removed (EOL May 12, 2026). Imagen 4.0 family removed (EOL June 24–30, 2026; migrate to `gemini-2.5-flash-image`).

### 6. Cancellation is non-trivial in async races

fal.ai supports cancellation of IN_QUEUE requests at no cost. IN_PROGRESS cancellation may still incur partial compute charges. Set `X-Fal-No-Retry: true` on race legs that are not the primary to avoid zombie retries after the race winner is declared.

---

---

## April 2026 Model Landscape Update

> **Updated 2026-04-21:** Critical routing-table changes arising from model lifecycle events since the original synthesis (2026-04-20). Apply to `data/routing-table.json` and `data/model-registry.json`.

### Deprecations / Removals

| Model | Status | EOL | Migration |
|---|---|---|---|
| DALL-E 3 | Deprecated, API shutting down | May 12, 2026 | Route to `gpt-image-1.5` (Dec 2025, 4× faster, ~20% cheaper, same RGBA) |
| Imagen 4.0 (all GA variants) | Deprecated | June 24–30, 2026 | Route to `gemini-2.5-flash-image` (~$0.039/img, GA Oct 2 2025, EOL Oct 2 2026) |
| gemini-2.5-flash-image-preview | Discontinued | January 15, 2026 | Use stable `gemini-2.5-flash-image` |

### New Models to Add to Routing Table

| Model | Released | Key capability | Routing priority |
|---|---|---|---|
| `gpt-image-1.5` | Dec 2025 | RGBA, 4× faster than gpt-image-1, ~20% cheaper; primary OpenAI image model | Replace `gpt-image-1` as default OpenAI raster candidate |
| `gpt-image-1-mini` | Oct 2025 | RGBA-capable, ~80% cheaper than gpt-image-1, token-based pricing ($8/M output image tokens ≈ $0.008/img at 1024² med) | New budget RGBA tier between free API and gpt-image-1 |
| `recraft-v4` | Feb 2026 | SOTA native SVG/vector; $0.08/img standard vector, $0.30/img pro vector; **NO `style_id`** — V3 retained for brand-style pipelines | Replace `recraft-v3` as default vector candidate; keep V3 for `style_id` usage |
| `flux.2-klein` | Jan 15, 2026 | Apache 2.0, 4B params, ~13GB VRAM, sub-second inference on RTX 3090; new local consumer GPU default | Replace `flux-schnell` as local self-host default |
| `flux1-kontext-pro` | May 29, 2025 | Instruction-based image editing (local/global edits, character preservation, text editing); 5 task categories | New routing candidate for asset editing tasks (background swap, color regrading, text overlay) |
| `flux1-kontext-dev` | June 26, 2025 | Open-weights 12B, same editing capabilities; outperforms Gemini Flash Image on many categories | Self-host editing alternative to kontext-pro |
| `hidream-i1` | Apr 2025 | 17B sparse MoE DiT; strong text rendering (Chinese + English), photorealism, 4 text encoders; open-source | Add to high-fidelity text-rendering routing chain |
| `qwen-image-2.0` | Feb 2026 | 7B unified gen+editing; native 2K resolution; #1 on AI Arena text-to-image + editing (late Feb 2026); professional typography | Add as a mid-tier raster candidate with strong text rendering |
| `gemini-2.5-flash-image` | Oct 2, 2025 (GA) | ~$0.039/img; GA until Oct 2, 2026; successor via `gemini-3.1-flash-image-preview` (Nano Banana 2, Feb 26, 2026) | Add as budget Gemini-family raster candidate |
| `midjourney-v7` | June 2025 | Default MJ version as of June 2025; paste-only | Update MJ entry from v6 to v7 |
| `midjourney-v8-alpha` | March 2026 | Alpha; 2K HD mode, enhanced text rendering, better prompt adherence; paste-only | Add as alpha-tier MJ entry; not production-stable |
| `midjourney-v8.1-alpha` | April 14, 2026 | Standard res 50% faster + 25% cheaper; HD default (3× faster + cheaper than v8.0 HD); paste-only | Update alpha-tier MJ entry |

### Corrected API Parameters

| Model | Old parameter | Correct parameter | File |
|---|---|---|---|
| `ideogram-3-turbo` (transparent) | `style: "transparent"` | Endpoint `/ideogram-v3/generate-transparent`, param `rendering_speed: "TURBO"` | 33b, 33c, 33d, routing-table.json |

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

> **Updated 2026-04-21:** In addition to the schema extension for routing strategies, the routing-table.json needs a separate pass to add `eol_date` fields for all deprecated/scheduled-EOL models and to add registry entries for the new models listed in the April 2026 Model Landscape Update section above. The `never` arrays for existing rules should be reviewed: any reference to DALL-E 3 or Imagen 4.0 should be converted from `never` entries (which imply capability mismatch) to `deprecated` entries (which imply lifecycle removal). Suggest a `deprecated_after` field on routing rules so the orchestrator can emit a warning rather than silently routing past a deprecated model.
