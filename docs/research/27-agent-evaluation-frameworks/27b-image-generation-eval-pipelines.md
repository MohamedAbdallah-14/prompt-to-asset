# 27b — Image Generation Eval Pipelines

## The Metric Landscape

### VQAScore (linzhiqiu/t2v_metrics, ECCV 2024)
**Repo:** https://github.com/linzhiqiu/t2v_metrics  
**PyPI:** `pip install t2v-metrics`

VQAScore asks a VLM "Does this figure show {text}?" and returns the probability of "Yes" as a scalar score. Outperforms CLIPScore and PickScore by 2–3x on compositional prompts. Endorsed by Google Imagen3/4 and adopted by ByteDance Seed, NVIDIA benchmarks.

**Usage:**
```python
import t2v_metrics
scorer = t2v_metrics.VQAScore(model='clip-flant5-xxl')
score = scorer(images=["logo.png"], texts=["a minimalist compass logo on transparent background"])
# returns tensor([[0.82]])
```

**Applicability to prompt-to-asset:** Strong for checking prompt-to-image fidelity after generation. Run as a tier-1 check after the existing tier-0 deterministic checks (dimensions, alpha channel, FFT). The `clip-flant5-xl` model (smaller) runs on 16 GB GPU; `xxl` needs 40 GB. For CI without GPU, use the GPT-4o VQAScore backend — cost is ~$0.01–0.05 per image.

> **Updated 2026-04-21:** The t2v_metrics library has extended VQAScore to **video evaluation** and added support for newer VLM backends: LLaVA-OneVision, Qwen2.5-VL, InternVideo2, InternVL2, InternVL3, and InternLMXC2.5. For image-only asset eval, `clip-flant5-xxl` remains the recommended local model. **CameraBench** was added (arXiv 2025) as a new benchmark for camera motion understanding in video — not relevant to still-image asset eval. The Gemini-2.5-pro backend mentioned in older notes may be deprecated; confirm via the repo README before using non-GPT-4o cloud backends.

**Caveats:** Does not check aesthetic quality, only prompt fidelity. A grey blob that vaguely matches the prompt scores high. For logo/icon eval, pair with ImageReward for preference signal.

---

### ImageReward (NeurIPS 2023)
**Repo:** https://github.com/THUDM/ImageReward  
**PyPI:** `pip install image-reward`

Human preference reward model trained on 137k expert comparison pairs. Outperforms CLIP by 38.6% and Aesthetic by 39.6% at predicting human preference. Returns a raw reward scalar (positive = preferred, negative = dispreferred).

**Usage:**
```python
import ImageReward as RM
model = RM.load("ImageReward-v1.0")
score = model.score("a minimalist flat compass logo", ["logo_v1.png", "logo_v2.png"])
# returns [-0.3, 0.8] — v2 preferred
```

**Applicability to prompt-to-asset:** Use as a relative ranking signal when comparing two provider outputs for the same brief (e.g., Ideogram vs. gpt-image-1 for the same logo). Also useful for detecting when a provider update shifts output quality: run the same prompt against both the old and new model version and compare ImageReward deltas.

> **Updated 2026-04-21:** The canonical ImageReward repo is at **https://github.com/THUDM/ImageReward** (not `zai-org/ImageReward` which appears to be a fork/mirror). The model is still `ImageReward-v1.0` — no new version has been released. As of 2026, newer preference models such as **HPSv2** (Human Preference Score v2) and **PickScore** have emerged; PickScore achieves 62.8% preference accuracy vs. ImageReward's 65.1%, making ImageReward still the stronger baseline for photorealistic preference ranking. For flat-vector logo eval specifically, none of these models have logo-specific training data; they remain rough signals only.

**Caveats:** Trained on general text-to-image human preferences (LAION-style photorealistic imagery). Its preference model may not generalize well to flat-vector logos or abstract icon marks — no logo-specific training data was used. Treat as a rough signal, not ground truth, for non-photorealistic assets.

---

### CLIPScore
**Via:** `t2v_metrics.CLIPScore(model='openai-clip-vit-large-patch14')`  
**200+ CLIP variants available**

Classic prompt-image cosine similarity. Fast, no GPU minimum, deterministic. Fails on compositional prompts (e.g., "compass icon with no background, isolated subject" — CLIP conflates keywords).

**Applicability to prompt-to-asset:** Use only as a quick smoke test for extreme failures. A CLIP score below 0.20 reliably indicates the generation is completely off. Do not use CLIP as a pass/fail gate — its false-positive rate on complex asset briefs is too high.

---

### DeepEval TextToImageMetric
**Docs:** https://deepeval.com/docs/multimodal-metrics-text-to-image

MLLM-based scorer that decomposes quality into Semantic Consistency (prompt adherence) and Perceptual Quality (naturalness, artifact absence). Score formula: `O = sqrt(min(SC) * min(PQ))`. Returns 0–1 with optional reasoning text.

**Applicability to prompt-to-asset:** Best all-in-one eval for CI without GPU. Catches both misaligned generation (wrong subject) and quality artifacts (compression noise, rendering failures). The reasoning text is useful for debugging prompt regressions — the judge explains why a score dropped.

> **Updated 2026-04-21:** **GPT-4V is deprecated by OpenAI** — use GPT-4o as the judge backend. DeepEval v3.0 supports GPT-4o and Claude 3.x series as judge models. The **default threshold is 0.5** (not 0.7); recalibrate per your golden dataset before using in gates. The metric is now documented as a "self-explaining MLLM-Eval" with reasoning included by default in newer versions. Cost with GPT-4o is approximately $0.01–0.03 per image (lower than GPT-4V pricing).

**Cost:** ~$0.01–0.03 per image with GPT-4o. For a 50-prompt test suite, that is $0.50–1.50 per CI run. Acceptable for nightly runs; consider sampling for PR-triggered runs.

---

## Recommended CI Pipeline Structure

```
Tier 0 — Deterministic (zero cost, always run):
  - Dimensions exact match
  - Alpha channel present (for transparent requests)
  - FFT checkerboard detection (reject grey-white RGB patterns)
  - Subject tight-bbox within platform safe zone
  - OCR Levenshtein check if wordmark expected

Tier 1 — Embedding-based (cheap, ~$0.001/image):
  - CLIPScore smoke test (reject if <0.20)
  - VQAScore with clip-flant5-xl (reject if <0.50)

Tier 2 — LLM-as-judge (moderate cost, nightly only):
  - DeepEval TextToImageMetric with GPT-4V (threshold 0.70)
  - ImageReward vs. golden reference for preference delta

Tier 3 — Human spot check (weekly or on provider update):
  - 5–10 outputs from the golden prompt suite
  - Manual A/B against previous provider version
```

Run tiers 0 and 1 on every PR. Run tier 2 nightly. Run tier 3 when a provider announces a model update.
