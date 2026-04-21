# 33b — Confidence-Based Escalation

**Focus:** Cheap-to-expensive model cascades, confidence scoring, and when to escalate — applied to the asset generation pipeline.

> **Updated 2026-04-21:** Cascade tiers revised to reflect current model landscape. Key changes: DALL-E 3 removed (EOL May 12, 2026; replaced by gpt-image-1.5). gpt-image-1-mini added as a new cheap RGBA-capable tier. Recraft V4 added as a vector-specialist tier. Flux.2 [klein] added as the new local consumer-GPU default. Ideogram transparent endpoint corrected to `/ideogram-v3/generate-transparent` with `rendering_speed: "TURBO"` (not `style: "transparent"`). Imagen 4.0 family removed from cascade candidates (EOL June 24–30, 2026; route to gemini-2.5-flash-image or successor).

---

## The Pattern: Model Cascade

First described formally in **FrugalGPT** (arXiv:2305.05176, Stanford, published in TMLR 12/2024): route the incoming query to the cheapest model first, evaluate its response with a lightweight scorer, and escalate to the next tier only if quality is insufficient.

**FrugalGPT results:**
- Matches GPT-4 quality with up to 98% cost reduction on HellaSwag, ARC, and similar benchmarks.
- Works because task difficulty is heterogeneous — many queries that reach GPT-4 could have been answered correctly by a cheaper model.

The same cost-heterogeneity principle holds for image generation: a simple flat-color icon on a white background does not need `gpt-image-1` at $0.04–0.17/image; `flux-schnell` at $0.003 or LLM-authored SVG at $0.00 may pass validation.

---

## Confidence / Quality Signals for Image Cascades

Unlike LLM text cascades where the model can emit a confidence token or logprob, image models produce no confidence output. The quality signal must come from a downstream checker. Three viable signals, in increasing cost order:

**1. Tier-0 deterministic checks (free)**
Run immediately after generation: dimensions correct, alpha channel present (for transparent assets), no FFT checkerboard signature, tight bounding box within safe zone. If any check fails, escalate. These are the checks already in `postprocess` arrays in `routing-table.json`.

**2. VLM judge (cheap)**
Send the generated image to a small VLM (e.g., GPT-4o mini, Gemini Flash) with a rubric: "Does this image match the brief? Rate 1–5 on composition, relevance, and quality." Cost: ~$0.001–0.003/call. Threshold: escalate if score < 3.5.

**3. Human review (expensive, async)**
Reserve for brand-sensitive or high-stakes assets. Out of scope for automated pipeline.

---

## Cascade Tiers for the Asset Pipeline

Mapping FrugalGPT's cascade to asset generation, ordered cheapest to most expensive:

| Tier | Model | Typical cost | Escalate if |
|---|---|---|---|
| 0 | LLM-authored SVG (`inline_svg` mode) | ~$0.001 (LLM tokens only) | path count > 40; OCR fails; safe-zone check fails |
| 1 | `flux-schnell` / `flux.2-klein` (local) | ~$0.003/image (API); ~$0.00 (local, ~13GB VRAM) | VLM score < 3.5; alpha missing; checkerboard FFT |
| 2 | `gpt-image-1-mini` (RGBA-capable, 80% cheaper) | ~$0.008/image (1024², medium quality) | Same checks; also palette ΔE > 10 vs brand |
| 3 | `recraft-v4` (vector) or `ideogram-3-turbo` (transparent endpoint) | $0.08/image (Recraft V4 vector); $0.03/image (Ideogram Turbo) | Same checks; text OCR Levenshtein > 1 |
| 4 | `gpt-image-1` / `gpt-image-1.5` (high quality) | ~$0.034–0.133/image (1024², med-high) | Terminal; if fails, fall back to `external_prompt_only` |

> **Updated 2026-04-21:** Tier table revised. `flux-pro` replaced with `gpt-image-1-mini` as the mid-tier RGBA-capable option (Oct 2025, ~80% cheaper than gpt-image-1, token-based pricing: $8/M output image tokens ≈ $0.008/1024² med). `recraft-v3` upgraded to `recraft-v4` (Feb 2026, SOTA native SVG vector, $0.08 standard vector / $0.30 pro vector). DALL-E 3 removed entirely (EOL May 12, 2026). Ideogram transparent tier corrected: the endpoint is `/ideogram-v3/generate-transparent` with `rendering_speed: "TURBO"`, priced at $0.03/image — **not** `style: "transparent"` which was V3's draft parameter and is no longer documented. Flux.2 [klein] 4B (Apache 2.0, Jan 15, 2026, ~13GB VRAM, sub-second on RTX 3090) is now the local consumer GPU default replacing `flux-schnell` for self-hosted deployments. Imagen 4.0 removed from consideration: EOL June 24–30, 2026; migrate to `gemini-2.5-flash-image` (~$0.039/image, GA Oct 2 2025, EOL Oct 2 2026) or its successor `gemini-3.1-flash-image-preview` (Nano Banana 2, Feb 26, 2026).

**Implementation note:** Each tier call is sequential (not parallel) in a pure cascade. The quality check between tiers adds latency (1–3 seconds for tier-0 checks, 3–8 seconds for a VLM judge call). Total worst-case latency for a 5-tier cascade: ~50–75 seconds. This is acceptable for async MCP tool calls; unacceptable for synchronous UX.

---

## From Not Diamond: Complexity-Based Pre-Routing

A smarter approach than a blind cascade: classify request complexity before generation and skip tiers that will obviously fail.

Pre-routing feature vector:
```json
{
  "asset_type": "logo",
  "text_length": 2,
  "transparency_required": true,
  "vector_required": false,
  "brand_bundle_present": true,
  "platform_count": 3
}
```

Route directly to tier 2+ if `transparency_required = true` (tier 0 SVG and tier 1 flux-schnell / flux.2-klein fail systematically on transparency — see `routing-table.json` `never` arrays). Route directly to tier 3–4 if `text_length > 0 AND transparency_required = true`:
- `gpt-image-1-mini` (tier 2) handles transparency but text fidelity is slightly lower than gpt-image-1 for 1–3 word wordmarks.
- `ideogram-3-turbo` transparent endpoint (tier 3) is cheaper at $0.03 and has strong text rendering.
- `gpt-image-1` / `gpt-image-1.5` (tier 4) are the highest fidelity but most expensive.

> **Updated 2026-04-21:** Added `gpt-image-1-mini` as a valid tier-2 transparent option. Ideogram transparent routing corrected to use the `/ideogram-v3/generate-transparent` endpoint, not a style parameter. For wordmarks >3 words on a transparent background, skip directly to tier 4 (gpt-image-1.5): no cheaper model reliably handles both constraints simultaneously.

This eliminates wasted generation calls for cases where cheaper models are known to fail.

---

## Model Cascade Quality (Research from OpenReview)

The paper "Improving Model Cascades Through Confidence Tuning" (OpenReview, 2024) shows that calibrating the confidence threshold is critical: a poorly calibrated threshold either routes too much to the expensive model (wasting cost) or too little (missing quality failures). Key findings:

- Confidence calibration via temperature scaling or Platt scaling on a held-out validation set reduces escalation rate by 15–25% without quality loss.
- For non-calibrated models, using an external VLM judge is more reliable than trusting model-internal confidence estimates.

**For image pipelines:** model-internal confidence does not exist, so an external quality scorer is mandatory at each tier boundary. The VLM judge is the functional equivalent of a calibrated confidence score.

---

## Practical Schema Extension for routing-table.json

Each rule should gain a `cascade` field:

```json
{
  "id": "logo-with-text-1-3-words",
  "cascade": [
    {
      "tier": 0,
      "model": "claude-sonnet",
      "mode": "inline_svg",
      "escalate_if": ["ocr_levenshtein > 1", "path_count > 40"]
    },
    {
      "tier": 1,
      "model": "ideogram-3-turbo",
      "endpoint": "/ideogram-v3/generate-transparent",
      "params": { "rendering_speed": "TURBO" },
      "escalate_if": ["vlm_score < 3.5", "ocr_levenshtein > 1"]
    },
    {
      "tier": 2,
      "model": "gpt-image-1",
      "params": { "background": "transparent" },
      "escalate_if": ["alpha_missing", "checkerboard_fft"]
    }
  ]
}
```

> **Updated 2026-04-21:** Ideogram tier corrected to use `endpoint: "/ideogram-v3/generate-transparent"` with `params.rendering_speed: "TURBO"`. The old `style: "transparent"` parameter was Ideogram V3's draft API field and is no longer the documented method for transparent generation. `gpt-image-1-mini` can be inserted as a tier between Ideogram and gpt-image-1 for cost savings when wordmark fidelity requirements are moderate.
```

The `escalate_if` conditions map directly to the existing `postprocess` validation functions already in the codebase.

---

## Caveats

- Sequential cascades add latency. For a 3-tier cascade where tier 1 always succeeds: latency is tier-1-generation + tier-1-validation. If tier 1 fails 20% of the time, expected latency = 0.8 × T1 + 0.2 × (T1 + T2). Model the expected latency before deciding to enable full cascading.
- VLM judge quality varies. GPT-4o mini misses subtle issues (wrong icon style, off-brand palette). Use a structured rubric, not free-form rating.
- Escalation asymmetry: failing a tier-0 check when the asset was actually fine (false positive) is wasteful but harmless. Failing to escalate when tier-1 quality is genuinely bad (false negative) ships a broken asset. Set thresholds conservatively (prefer escalation over acceptance at low confidence).

---

**Sources:**
- https://arxiv.org/abs/2305.05176 (FrugalGPT)
- https://portkey.ai/blog/implementing-frugalgpt-smarter-llm-usage-for-lower-costs/
- https://openreview.net/pdf?id=qYI4fw3g4v (Confidence Tuning for Cascades)
- https://www.notdiamond.ai/
- https://mappedarch.medium.com/intelligence-operations-routing-ai-tasks-to-the-right-model-765d0d2c1ecd
- https://www.rack2cloud.com/ai-inference-cost-model-routing/
