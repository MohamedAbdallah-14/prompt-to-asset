# 33c — Best-of-N Parallel Generation

**Focus:** Generate N variants simultaneously from one or more models, score with a VLM judge, return the highest-scoring result. Research basis, practical implementation, and cost math.

---

## Research Basis: Best-of-N Sampling in LLMs

Best-of-N (BoN) sampling is a test-time scaling technique originally developed for LLMs: generate N independent completions, score each with a reward model, return the highest-scored one. Well-studied in:

- **arXiv:2502.12668** — "Evaluation of Best-of-N Sampling Strategies for Language Model Alignment" (2025): confirms BoN reliably improves alignment quality; identifies reward hacking as the primary failure mode when N is large and the reward model is imperfect.
- **arXiv:2501.13007** — PairJudge RM: replaces a single RM score per candidate with a pairwise knockout tournament, reducing reward hacking by evaluating candidates relative to each other rather than against an absolute scale.
- **arXiv:2502.18581** — Self-Certainty for BoN: uses model self-consistency (agreement across multiple decoding paths) as a proxy for correctness, avoiding a separate RM call.

**The core result across all papers:** BoN with N=4–8 provides most of the quality gain of BoN with N=16–32, at roughly linear cost. Diminishing returns set in quickly past N=8 for most tasks.

---

## Applicability to Image Generation

The LLM BoN literature transfers directly with one substitution: replace the reward model with a VLM judge.

**Generation:** Call the same model (or multiple models) N times in parallel with temperature/variation — most image APIs accept a `num_images` parameter, or you issue N concurrent API calls.

**Scoring:** Pass each generated image to a VLM judge with a structured rubric:
```
Score this image on a scale of 1-10 across these axes:
- Brief adherence: does the image match [brief]?
- Composition: is the subject well-framed with appropriate whitespace?
- Aesthetic quality: clean lines, no artifacts, coherent style?
- Safe-zone compliance: is the primary subject within [platform safe zone]?
Return JSON: { "brief_adherence": N, "composition": N, "aesthetic": N, "safe_zone": N }
```

**Selection:** Pick the image with the highest weighted score. Return it. Optionally, store all N images in the AssetBundle as `variants[]`.

---

## VLM Judge Options

| Judge | Cost/call | Latency | Notes |
|---|---|---|---|
| GPT-4o | ~$0.005 | 3–6s | Best quality; tends to be verbose |
| GPT-4o mini | ~$0.001 | 1–3s | Good for structured rubrics; misses subtle quality issues |
| Gemini Flash | ~$0.0005 | 1–2s | Fastest; quality adequate for tier-0/1 |
| Claude Haiku | ~$0.0005 | 1–3s | Strong at structured output; good for rubric scoring |

For the asset pipeline, Gemini Flash or Claude Haiku with a structured JSON rubric is the right default — low latency, low cost, adequate precision for distinguishing clearly-bad from clearly-good outputs.

---

## Cost Math

Scenario: `logo-with-text-1-3-words`, generating N=3 variants with `ideogram-3-turbo` then scoring with GPT-4o mini.

```
Generation: 3 × $0.08 = $0.24
VLM scoring: 3 × $0.001 = $0.003
Total: $0.243 vs $0.08 for single generation
```

Cost multiplier: 3×. Quality improvement from BoN-3: empirically, ~15–25% reduction in "asset fails validation" rate based on LLM BoN literature extrapolated to image generation.

If the downstream cost of a validation failure is a full re-generation call ($0.08) plus user friction, BoN-3 may be cost-neutral or positive even at 3× generation cost — if the VLM judge is well-calibrated.

Break-even analysis: BoN-N is cost-positive when:
```
P(best-of-N passes) × value > N × generation_cost + N × scoring_cost
```

For high-stakes brand assets (app icons, logo masters), BoN-3 or BoN-4 is justified. For batch icon packs, BoN-2 may suffice. For hero illustrations, single generation + post-hoc validation is cheaper unless validation failure rate is high.

---

## Cross-Model BoN

A more powerful variant: generate one variant per candidate model, score all, pick the winner. This is a model selection oracle approximation.

Example for `transparent_mark`:
- Variant A: `gpt-image-1` with `background: "transparent"`
- Variant B: `ideogram-3-turbo` with `style: "transparent"`
- Variant C: `recraft-v3` SVG rasterized

Score all three. Pick the winner. This costs 3× generation but selects the best model for this specific brief — useful when your routing confidence is low (brief is ambiguous or atypical).

**Caveat:** Cross-model BoN requires API keys for all three providers. It is a `api` mode feature only.

---

## Reward Hacking in Image BoN

The main failure mode from LLM BoN research applies: if the VLM judge has systematic biases, BoN will select for those biases, not for actual quality. Documented VLM judge biases in image scoring:

- Preference for highly saturated colors (Gemini Flash).
- Preference for photorealistic styles over flat design (GPT-4o).
- Miscounting objects and text elements.

**Mitigation:** Use a structured rubric with explicit axes rather than a single "which is better" question. Use the same VLM judge consistently so its biases are systematic and can be calibrated against human preference data collected over time.

---

## PairJudge / Knockout Tournament

For N ≥ 4, a knockout tournament (compare A vs B, C vs D; winners face off) is more robust than scoring each image independently against an absolute scale. PairJudge RM (arXiv:2501.13007) applies this to LLM candidates; the same approach works for images: ask the VLM "which image is better for this brief?" for each pair.

For N=4: 3 pairwise comparisons = 3 VLM calls. vs. 4 independent scores = 4 VLM calls. Slightly cheaper, more robust to absolute-scale biases.

---

## Schema Extension

```json
{
  "id": "logo-with-text-1-3-words",
  "best_of_n": {
    "enabled": true,
    "n": 3,
    "strategy": "independent_score",
    "judge": "gemini-flash",
    "rubric": ["brief_adherence", "composition", "aesthetic", "safe_zone"],
    "weights": [0.4, 0.2, 0.2, 0.2],
    "min_passing_score": 3.5
  }
}
```

If `min_passing_score` is not met by any candidate after BoN, escalate to the next tier in the cascade (see 33b).

---

**Sources:**
- https://arxiv.org/abs/2502.12668 (Evaluation of BoN Strategies)
- https://arxiv.org/abs/2501.13007 (PairJudge RM / Knockout Tournament)
- https://arxiv.org/html/2502.18581v1 (Self-Certainty for BoN)
- https://arxiv.org/html/2401.06591v1 (Prometheus-Vision VLM Judge)
- https://github.com/linzhiqiu/t2v_metrics (VQAScore — VLM scoring for text-to-image)
- https://github.com/ziqihuangg/Awesome-Evaluation-of-Visual-Generation
