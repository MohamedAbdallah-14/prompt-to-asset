# 27c — Golden Dataset and Regression Testing

## What a Golden Dataset Is

A golden dataset is an immutable, versioned collection of (prompt, expected-output-spec) pairs that defines acceptable behavior for the pipeline. For prompt-to-asset, the "expected output" is not a specific pixel image — generative models are stochastic — but a set of structural and semantic invariants the output must satisfy.

Reference: https://www.getmaxim.ai/articles/building-a-golden-dataset-for-ai-evaluation-a-step-by-step-guide/

---

## What to Curate for prompt-to-asset

### Prompt Categories (minimum viable coverage)

| Category | Count | What it tests |
|---|---|---|
| Logo, text-free mark | 8 | VQAScore fidelity, alpha, tight-crop |
| Logo with 1-word wordmark | 4 | OCR Levenshtein, text compositing flag |
| Favicon (16×16 legibility) | 6 | Dimension check, legibility at small size |
| App icon (iOS/Android safe zone) | 6 | Safe-zone bbox, maskable padding |
| OG image (1200×630) | 4 | Dimensions, text absence in raster |
| Transparent mark | 6 | Alpha channel, anti-FFT checkerboard |
| Illustration, hero | 4 | VQAScore, ImageReward vs. baseline |
| Adversarial / edge cases | 6 | Long prompt text, emoji in brief, multi-language |

**Total: ~44 prompts** — small enough to run tier-0/1 on every PR (~2 min), tier-2 nightly (~$1–2).

---

## Record Schema per Golden Item

```json
{
  "id": "logo-compass-001",
  "asset_type": "logo",
  "brief": "A minimalist compass logo, flat vector, no text, white subject on transparent background",
  "mode": "api",
  "provider": "gpt-image-1",
  "invariants": {
    "dimensions": [1024, 1024],
    "alpha_required": true,
    "text_present": false,
    "safe_zone_subject_pct": 0.80,
    "clip_score_min": 0.22,
    "vqa_score_min": 0.60,
    "image_reward_floor": -0.5
  },
  "reference_output": "golden/logo-compass-001-ref.png",
  "approved_by": "human-review",
  "approved_at": "2025-03-01",
  "schema_version": "1.0"
}
```

The `reference_output` is a human-approved image used for ImageReward delta comparisons, not pixel-exact matching. Store in Git LFS or a content-addressed object store (S3 + sha256 key).

---

## Decontamination Rules

Per the Maxim AI guide and general best practice:
- Never use a brief that appears verbatim in the system's own training-prompt corpus (check with embedding similarity, threshold cosine >0.95).
- Do not reuse the exact brief across provider tests — even small paraphrases reduce overfitting risk.
- Rotate adversarial edge cases quarterly to prevent gaming.

---

## Versioning Strategy

Version the golden dataset independently from the pipeline code. Use semantic versioning:
- **Patch** (1.0.1): Fix a broken reference image, correct a typo in a brief.
- **Minor** (1.1.0): Add new prompt category (e.g., sticker, splash screen).
- **Major** (2.0.0): Change the invariant schema (e.g., add OCR check as mandatory field).

Pin the dataset version in CI config so a pipeline code PR and a dataset PR cannot accidentally interact:
```yaml
# .github/workflows/eval.yml
env:
  GOLDEN_DATASET_VERSION: "1.2.0"
  GOLDEN_DATASET_PATH: "data/golden/v1.2.0"
```

---

## Evolution: Adding Production Failures

When a real user reports a bad output, the workflow is:
1. Reproduce the failure with the exact brief.
2. Add the brief to the golden dataset with `"approved_by": "failure-case"` and the tightest invariant that would have caught it.
3. Bump the patch version.
4. Confirm the new test fails before the fix and passes after.

This mirrors LangSmith's "add a bad trace to your dataset with one click" pattern — applied to image outputs instead of text traces.

---

## Tool Integration

- **DeepEval datasets:** `EvaluationDataset` class accepts the golden items; run with `deepeval test run`.
- **Braintrust:** Upload golden items as a Dataset; compare experiment results across runs with the eval-action GitHub Action.
- **Langfuse:** Annotate production traces and promote failures to the golden dataset via the web UI.

The simplest starting point: a JSON file checked into the repo under `data/golden/`, parsed by a pytest `conftest.py` that yields parametrized test cases. No external dependency needed for tier-0/1 checks.
