# 27e — Provider Update Regression Detection

## The Problem

Provider model updates (Ideogram 3 → 4, gpt-image-1 → 1.5 → 2, Flux Dev → Pro 1.1) frequently change output character without breaking the API contract. A logo that looked flat and clean under Ideogram 3 may render with unwanted gradients under Ideogram 4. The diff is invisible to the routing layer and never surfaces a 4xx/5xx error. Only systematic comparison catches it.

---

## Detection Strategy: Baseline Pinning + Delta Scoring

### Step 1: Build a provider-specific baseline at model version N

When a model version is confirmed stable and producing acceptable output:
1. Run the full golden prompt suite (~44 prompts) against that provider.
2. Store all outputs in a content-addressed store: `golden/baselines/{provider}/{model_version}/{prompt_id}.png`.
3. Compute and store: CLIPScore, VQAScore, ImageReward per output.
4. Record: `{prompt_id, provider, model_version, clip, vqa, image_reward, timestamp}` in a JSON baseline file.

```json
{
  "provider": "gpt-image-1",
  "model_version": "2025-04-01",
  "scores": {
    "logo-compass-001": {"clip": 0.27, "vqa": 0.71, "image_reward": 0.42},
    "favicon-wave-002": {"clip": 0.24, "vqa": 0.65, "image_reward": 0.31}
  }
}
```

### Step 2: Run comparison on version N+1

When the provider updates (detected via API changelog, release notes, or periodic probe):
1. Re-run the golden suite against the new version.
2. Compute the same metrics.
3. Compute per-prompt delta: `delta_vqa = new_vqa - baseline_vqa`.
4. Flag prompts where `delta_vqa < -0.10` or `delta_image_reward < -0.3`.
5. Run tier-0 deterministic checks — provider updates sometimes change output format (e.g., dropping alpha support).

---

## Detecting Silent Updates

Some providers update their models without versioned endpoints (Ideogram, Midjourney historically). Detect these with a canary probe:

```python
# scripts/provider_canary.py
# Run weekly as a GitHub Actions scheduled job
import t2v_metrics
import json, hashlib
from pathlib import Path

CANARY_BRIEF = "a single solid blue circle on white background, 1024x1024"
CANARY_EXPECTED_VQA = 0.85  # high bar — this is an easy prompt

# Generate, compute VQA, compare to stored expectation
vqa = t2v_metrics.VQAScore(model='clip-flant5-xl')
score = vqa(images=[generated_path], texts=[CANARY_BRIEF]).item()

if score < CANARY_EXPECTED_VQA - 0.10:
    raise RuntimeError(f"Provider canary failed: VQA {score:.2f} < {CANARY_EXPECTED_VQA - 0.10:.2f}. Possible silent model update.")
```

Use the simplest possible prompt (solid geometry, clear color) so a score drop is unambiguously a model change, not prompt sensitivity.

---

## Tooling: Evidently AI for Distribution Drift

For statistical drift detection across a rolling window of production outputs, Evidently AI (https://github.com/evidentlyai/evidently) provides distribution shift reports. Apply it to the ImageReward score distribution:

```python
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset
import pandas as pd

baseline = pd.DataFrame({"image_reward": baseline_scores})
current = pd.DataFrame({"image_reward": current_window_scores})

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=baseline, current_data=current)
report.save_html("drift_report.html")
```

A KS-test p-value < 0.05 on the ImageReward distribution indicates statistically significant output shift. This approach is described in: https://markaicode.com/ml-drift-detection-production/

---

## Response Protocol When Regression Detected

| Delta VQA | Action |
|---|---|
| -0.05 to -0.10 | Log warning, continue. Monitor next 7 days. |
| -0.10 to -0.20 | Alert engineering. Run tier-3 human spot check. Consider routing to backup provider. |
| > -0.20 | Immediately route all production traffic to backup provider. File provider support ticket. |

---

## Provider Versioning Map

Track which models have versioned vs. unversioned endpoints:

| Provider | Endpoint versioning | Canary strategy |
|---|---|---|
| OpenAI gpt-image-1 | Model string in API (e.g., `gpt-image-1`, `gpt-image-1.5`) | Pin model string; canary on new string |
| Ideogram | No version pinning | Weekly canary probe |
| Recraft V3 | Model ID in API | Pin model ID |
| BFL/Flux | Version tags (flux-pro-1.1) | Pin version tag |
| Google Imagen | `imagen-3.0-generate-002` style | Pin version string |

**Critical rule:** Never call a provider's "latest" alias in production. Always pin the specific model version string. This is the single most impactful change to reduce silent regressions.

---

## Braintrust for Cross-Version Comparison

Braintrust's experiment comparison view is well-suited for A/B-ing provider versions: upload both old and new model outputs as separate experiments, use ImageReward as the score function, and inspect the diff view for per-prompt regressions. The `braintrustdata/eval-action` GitHub Action can post this comparison directly to a PR when evaluating whether to adopt a new provider version.

Reference: https://www.braintrust.dev/docs/core/experiments
