# 33d — ELO and A/B Testing for Model Selection

**Focus:** Using ELO ratings from public arenas as prior routing weights, and running controlled A/B traffic splits to collect proprietary quality data.

---

## ELO in Image Generation: The Arena Methodology

The Artificial Analysis Text-to-Image Arena (https://artificialanalysis.ai/image/leaderboard/text-to-image) applies the same ELO/Bradley-Terry methodology as the LMSYS Chatbot Arena, extended to image generation.

**Methodology:**
- Users submit a prompt; two models generate images from it (blind, no model labels shown).
- User votes for the preferred image.
- Win/loss updates ELO scores via the Bradley-Terry model (maximum likelihood estimate of pairwise win rates), not the classic online Elo algorithm. The BT model is computed centrally over all historical votes, making it more stable than incremental Elo updates.

**Current leaderboard (April 2026):**

| Model | Arena Elo |
|---|---|
| GPT Image 1.5 (high) | 1274 |
| Nano Banana 2 (Gemini 3.1 Flash) | 1264 |
| Nano Banana Pro (Gemini 3 Pro) | 1215 |
| FLUX.2 [max] | 1204 |
| Seedream 4.0 | 1201 |
| FLUX.2 [dev] Turbo (open-weight leader) | 1165 |

**Chatbot Arena vote rigging (arXiv:2501.17858):** A 2025 paper showed that structured voting campaigns can meaningfully bias Arena scores. Treat public Arena ELO as a prior that requires calibration against your own data, not as ground truth.

---

## Applicability to routing-table.json

Public ELO scores encode global human preference averaged across all prompts and voters. For a prompt-to-asset server, the relevant signal is narrower: which model wins for _this asset type_ with _this feature vector_?

**Practical approach:**
1. Use public Arena ELO as the **initial routing weight** when you have no proprietary data.
2. Collect your own (model, asset_type, VLM_score, validation_pass) logs.
3. Compute per-asset-type win rates from your logs to override public priors.

Concrete extension to routing-table.json:
```json
{
  "id": "transparent-mark",
  "models_with_elo": [
    { "model": "gpt-image-1", "global_elo": 1274, "local_elo": null },
    { "model": "ideogram-3-turbo", "global_elo": null, "local_elo": null },
    { "model": "recraft-v3", "global_elo": null, "local_elo": null }
  ],
  "routing_weight_source": "global_elo",
  "routing_weight_override_after_n_samples": 50
}
```

Switch from `global_elo` to `local_elo` once you have ≥50 samples per model per asset type.

---

## A/B Testing in the Asset Pipeline

**Reference pattern:** Gradual rollout (shadow mode → canary → full rollout) per MLOps literature (JFrog ML, Qwak, neptune.ai).

**Three strategies applicable to model routing:**

### 1. Shadow Mode
Send 100% of traffic to the production model. For X% of requests, also generate with the challenger model in the background (don't return challenger output to user). Log both outputs for offline comparison. No user-facing risk. Overhead: 2× cost for the shadow fraction.

**Use when:** Evaluating whether a new model is viable at all; collecting baseline data before any user exposure.

### 2. Canary Rollout (10% traffic split)
Route 10% of production requests to the challenger model. Return challenger output to those 10% of users. Collect VLM quality scores and validation pass rates for both cohorts. Increase split to 25%, 50%, 100% if challenger meets threshold.

**Statistical note:** A 90/10 split takes ~9× longer to reach statistical significance compared to 50/50 (same N required for the smaller group). For a low-volume MCP server, use a 50/50 split for faster results, then revert to production model if challenger loses.

**Implementation:**
```typescript
function routeWithCanary(features: AssetFeatures, rules: RoutingRule[]): string {
  const rule = rules.find(r => r.matches(features));
  if (rule.challenger && Math.random() < rule.challenger.traffic_fraction) {
    logExperiment({ request_id, variant: 'challenger', model: rule.challenger.model });
    return rule.challenger.model;
  }
  logExperiment({ request_id, variant: 'control', model: rule.primary.model });
  return rule.primary.model;
}
```

### 3. Interleaved Comparison (for offline A/B)
For batch jobs (icon packs, multi-platform bundles), generate one asset from each model in the candidate set. Rank with VLM judge. Record which model would have won. This is A/B testing without user exposure — suitable for tuning routing weights offline.

---

## Collecting ELO Signal from the MCP Server

The asset pipeline already runs VLM validation (`asset_validate`). Each validation call produces a quality score. This is the raw material for computing local ELO:

1. For each pair of models that have generated the same asset type, treat higher VLM score as a "win."
2. Apply Bradley-Terry model over all logged (model_A, model_B, winner) triples.
3. Update `local_elo` in the routing table.

This creates a self-improving routing table: the more the system is used, the more accurate its model rankings become for your specific asset types and brand styles.

**Implementation sketch (Python):**
```python
from scipy.optimize import minimize
import numpy as np

def bradley_terry_mle(comparisons):
    # comparisons: list of (model_i, model_j, 1 if i won else 0)
    models = list(set(m for c in comparisons for m in c[:2]))
    n = len(models)
    idx = {m: i for i, m in enumerate(models)}
    
    def neg_log_likelihood(log_strengths):
        s = np.exp(log_strengths)
        ll = sum(
            win * log_strengths[idx[i]] - np.log(s[idx[i]] + s[idx[j]])
            for i, j, win in comparisons
        )
        return -ll
    
    result = minimize(neg_log_likelihood, np.zeros(n), method='L-BFGS-B')
    return {m: np.exp(result.x[idx[m]]) for m in models}
```

---

## Caveats

- **Vote rigging / systematic bias:** If VLM judge has a consistent preference for one model's aesthetic, all local ELO will converge toward that model regardless of actual quality. Audit VLM judge calibration periodically against human preference samples.
- **Survivorship bias in A/B logs:** You only log successful API calls. If model A has a 10% error rate and model B has a 0% error rate, model B's logged quality scores are not comparable — they exclude the error cases.
- **Non-stationarity:** Model providers update their models without version-bumping public-facing names. A routing table calibrated in January 2026 may be stale by June 2026. Re-run calibration quarterly or track provider changelogs.
- **Statistical significance:** At 50 samples per model per asset type, the Bradley-Terry estimate has high variance. Treat local ELO as a noisy signal until you have ≥200 samples per cell.

---

**Sources:**
- https://artificialanalysis.ai/image/leaderboard/text-to-image
- https://www.lmsys.org/blog/2023-05-03-arena/
- https://www.lmsys.org/blog/2023-12-07-leaderboard/ (BT model update)
- https://arxiv.org/abs/2501.17858 (Vote rigging in Chatbot Arena)
- https://www.qwak.com/post/shadow-deployment-vs-canary-release-of-machine-learning-models
- https://pimms.io/blog/gradual-rollouts-how-to-ab-test-with-90-10-traffic-splits-to-mitigate-risk
- https://apxml.com/courses/deploying-diffusion-models-scale/chapter-6-advanced-deployment-techniques/canary-ab-testing-models
- https://medium.com/marvelous-mlops/traffic-splits-arent-true-a-b-testing-for-machine-learning-models-62f77d10c993
