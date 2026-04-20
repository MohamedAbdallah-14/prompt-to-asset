---
category: 03-evaluation-metrics
angle: 3c
title: Human Preference Models for Text-to-Image Evaluation
subtitle: PickScore, HPSv2/v3, ImageReward, RAHF, LAION Aesthetic, MPS
research_date: 2026-04-19
research_value: high
primary_use_cases:
  - automated evaluation of generated images
  - reward models for RLHF / DPO fine-tuning of diffusion models
  - best-of-N selection at inference time
  - dataset filtering and prompt engineering feedback
tags:
  - preference-model
  - reward-model
  - text-to-image
  - evaluation
  - best-of-n
---

# Human Preference Models for Text-to-Image Generation

## Overview

Human preference models are learned scoring functions that take a `(prompt, image)` pair and return a scalar (or multi-head) score predicting how much a human would prefer that image. They were developed to replace CLIPScore / FID, which are known to correlate poorly with subjective quality judgments on modern diffusion outputs. They are now the de-facto scoring primitive for three tasks:

1. **Offline evaluation** — benchmark leaderboards (HPSv2, PickScore, HPSv3) that rank models.
2. **Reward models** for RLHF-style fine-tuning of diffusion models (DDPO, ReFL, Diffusion-DPO, PRDP).
3. **Best-of-N / rejection sampling** at inference — generate *N* candidates, pick the one with the highest preference score. This is cheap, gradient-free, and composes with any upstream sampler.

The field has consolidated around a handful of public models, each trained on a different flavor of preference data (expert-ranked vs. crowdsourced paired choices vs. multi-axis ratings).

## The Model Landscape

### 1. LAION Aesthetic Predictor (v1 / v2 / v2.5)

The oldest and simplest entry: a lightweight MLP on frozen CLIP / SigLIP embeddings that regresses a 1–10 "aesthetic" score. `improved-aesthetic-predictor` (v2) is a CLIP ViT-L/14 + MLP trained on SAC, LAION-Logos, and AVA, and is the scorer that was used to filter LAION-5B → LAION-Aesthetics, which in turn was the backbone training set for Stable Diffusion 1.x / 2.x. v2.5 (discus0434) swaps in SigLIP and covers illustration/anime domains that v2 under-scored.

- **Pro:** cheap (<100M params of extra weight on top of CLIP), fast, historical baseline.
- **Con:** single-axis "beauty" — ignores prompt alignment entirely, so it is a poor evaluator for *text-to-image* quality and biases fine-tuning toward generic "pretty" outputs.
- **Repo:** `christophschuhmann/improved-aesthetic-predictor` (~1.28k stars); `discus0434/aesthetic-predictor-v2-5` (~403 stars) for the SigLIP v2.5 release.

### 2. ImageReward (THUDM, NeurIPS 2023)

The first general-purpose reward model explicitly positioned as an RLHF reward. Trained on 137K expert-ranked comparisons over prompts from DiffusionDB, using a BLIP backbone fine-tuned with a pairwise ranking loss. Outperforms CLIP / Aesthetic / BLIP baselines by 31–39% on preference accuracy. The repo ships both the scoring model and **ReFL** (Reward Feedback Learning), an algorithm that back-propagates ImageReward into the diffusion training loop.

- **Training data:** 8,878 prompts × ~137K pairwise rankings by trained annotators with rubric covering alignment, fidelity, harmlessness.
- **Inference:** 2–3 lines via the `image-reward` PyPI package; returns a log-odds scalar (range ≈ [−2, 2]).
- **Repo:** `THUDM/ImageReward` — **1,662 stars**, Apache-2.0, last pushed Oct 2025.

### 3. PickScore (Kirstain et al., NeurIPS 2023)

Fine-tuned from CLIP-H on **Pick-a-Pic**, an open dataset of 1M+ *in-the-wild* user preference pairs collected through a live text-to-image web app (users generated two images and clicked the preferred one). Trained with a softmax-over-pair contrastive loss. Reaches ~70.5% pairwise accuracy vs. 68% for expert humans on Pick-a-Pic test.

- **Key property:** the training distribution matches actual user-facing generation traffic (short prompts, mixed intents, no rubric training), which makes PickScore the most realistic proxy for "what a user on a consumer product will prefer."
- **Training data:** Pick-a-Pic v1 (500K pairs) + v2 (1M+ pairs), openly released on HuggingFace.
- **Use as reward:** the Diffusion-DPO paper (Wallace et al., 2024) uses Pick-a-Pic pairs directly for preference optimization without materializing PickScore; many other works (PRDP, DRaFT) use PickScore as the reward.
- **Repo:** `yuvalkirstain/PickScore` — **~587 stars**, MIT; checkpoint `yuvalkirstain/PickScore_v1` on HF.

### 4. HPSv2 / HPSv2.1 (Wu et al., 2023/2024)

Human Preference Score v2 fine-tunes CLIP on **HPD v2**: 798K preference choices over 433K image pairs, explicitly balanced across four styles (animation, concept art, painting, photo). HPSv2.1 (Sept 2024) retrains on a higher-quality subset. HPSv2's headline contribution is the **HPSv2 benchmark**, a fixed 3,200-prompt evaluation suite that has become the most-cited leaderboard for T2I models 2023–2025.

- **Training data:** HPD v2, crowdsourced with a rubric explicitly balancing style coverage.
- **Range:** raw logits; bench scores typically reported in [0.26, 0.32].
- **Repo:** `tgxs002/HPSv2` — **~663 stars**, Apache-2.0, PyPI package `hpsv2` (installable, one-line inference).

### 5. HPSv3 (Ma et al., ICCV 2025)

The current state of the art as of late 2025. Three upgrades over HPSv2:

1. **VLM backbone** (Qwen2-VL class) instead of CLIP — so the scorer can reason over long prompts and fine-grained image content, not just global embeddings.
2. **HPD v3:** 1.08M text–image pairs and 1.17M pairwise annotations, explicitly "wide-spectrum" — includes low-quality real photos, legacy model outputs (SD1.5), and frontier-model outputs (FLUX.1, SD3) so the score is well-defined across the full quality range, not just near the top.
3. **Uncertainty-aware ranking loss:** soft-margins for annotator disagreement, which reduces overfitting to noisy pairs.
4. **CoHP (Chain-of-Human-Preference):** inference-time best-of-N-with-feedback — generate, score with HPSv3, regenerate with the winner as a seed, iterate. Reported to improve FLUX.1 quality without extra training data.

- **Repo:** `MizzenAI/HPSv3` — **~289 stars**, MIT, released Aug 2025. Model weights on HF at `MizzenAI/HPSv3`.
- **Paper:** arXiv:2508.03789.

### 6. MPS — Multi-dimensional Preference Score (Zhang et al., CVPR 2024)

The first public *multi-axis* scorer. A CLIP backbone with a "preference condition module" that routes the same image through four separate heads:

- Aesthetics
- Semantic alignment (prompt following)
- Detail quality
- Overall

Trained on **MHP**: 918K preference choices / 607K images, with each choice conditioned on *which axis* the annotator was judging. This is what unlocks dimension-aware reward: you can weight the four heads differently at inference or as a reward during RLHF.

- **Repo:** `Kwai-Kolors/MPS` — **~201 stars**, MIT; maintained by Kwai's Kolors team.
- **Use:** especially useful for prompt-to-asset style systems, where "did the prompt edit improve alignment specifically?" is a different question from "is the image prettier?"

### 7. RichHF / RAHF (Liang et al., CVPR 2024 — Google Research)

Rather than a scalar reward, **RichHF-18K** collects *localized* feedback: heatmap masks over implausible regions, heatmap masks over misalignment, and word-level marks on the prompt for missing/misrepresented tokens. A multimodal transformer (RAHF) is trained to predict all three channels from a single `(prompt, image)` input.

- **Downstream uses demonstrated in the paper:** (a) filter training data by predicted heatmap area, (b) inpaint the predicted implausibility mask, (c) transfer — improvements trained on SD variants also lift Muse.
- **Dataset repo:** `google-research-datasets/richhf-18k` — **~155 stars**. Note: this release is the annotations only (no images or model weights are re-distributed; reproduction requires re-fetching images from Pick-a-Pic).
- **Strength:** richer supervision signal than any scalar reward; weakness: no off-the-shelf reward checkpoint for drop-in use.

## Using these models

### As offline evaluators

All six scalar models (LAION-v2.5, ImageReward, PickScore, HPSv2, HPSv3, MPS-overall) are drop-in replacements for CLIPScore in an eval loop. Convergent practice as of 2025 is to report **at least two** of {HPSv2, ImageReward, PickScore} plus either **MPS** (for dimension breakdown) or **HPSv3** (for frontier-model coverage). Single-metric reporting is increasingly treated as a red flag, because each model has known prompt-distribution biases inherited from its training set (e.g., PickScore rewards vibrant, saturated outputs; Aesthetic rewards blurry bokeh; ImageReward over-rewards text-in-image fidelity).

### As reward models (RLHF / DPO for diffusion)

The dominant recipes (2023–2025):

- **DDPO** (Black et al., 2023) — policy-gradient RL; any of the above as the reward. Prone to reward hacking with PickScore/Aesthetic alone.
- **ReFL** (shipped inside ImageReward repo) — directly differentiates the reward through the last few diffusion steps. Faster to converge than DDPO but requires a differentiable reward.
- **Diffusion-DPO** (Wallace et al., 2024) — skips the reward-model step entirely; uses Pick-a-Pic pairs as the preference dataset.
- **PRDP** (Deng et al., 2024) — reframes reward fine-tuning as supervised regression on reward *differences*; scales to 100K+ prompts using PickScore + HPSv2 as the combined reward.
- **RPO (Rich Preference Optimization)** — uses VLM critiques instead of scalar rewards; conceptually the RAHF successor for fine-tuning.

### Best-of-N at inference (most practical for a prompt-to-asset)

The simplest, gradient-free, model-agnostic recipe, and the one most relevant to a prompt-to-asset stack:

1. Generate `N` images from the (enhanced) prompt.
2. Score all `N` with one or more preference models.
3. Return the argmax (or top-k, with some dedup).

Empirical pattern from the reward-model literature:

- N=4–8 captures most of the quality gain for HPSv2/ImageReward; diminishing returns past N≈16.
- **Ensembling** two rewards (e.g., HPSv2 + PickScore, or MPS-alignment + MPS-aesthetics) with learned or uniform weights beats any single reward and meaningfully suppresses reward hacking.
- HPSv3 + CoHP (ICCV 2025) generalizes best-of-N to an iterative "best-of-N → regenerate → best-of-N" loop and reports further gains on FLUX.1 without retraining.
- Watch reward saturation: at very large N, all rewards drift toward their bias (PickScore → saturated & centered; Aesthetic → soft-lit; ImageReward → readable text). A diverse ensemble is the cheapest mitigation.

## Implications for a Prompt-Enhancer

- **Evaluation harness:** wire up `image-reward` (PyPI) + `hpsv2` (PyPI) + `PickScore_v1` (HF) + MPS checkpoint → run on a fixed prompt set, report all four plus a weighted average. Cheap and reproducible.
- **Inference-time win:** a N=4 best-of-N with HPSv2.1 or HPSv3 is the single highest-ROI quality lever you can add, and requires no training. Combine with MPS-alignment head to filter out prompt-drift failures that raw HPS misses.
- **Training-time win:** if you ever fine-tune a local diffusion for brand/style, the preference-model → PRDP or Diffusion-DPO path is now well-documented and all the reward checkpoints are open.
- **For the prompt-to-asset itself:** MPS's dimension-conditioned heads let you ask "did my rewrite improve alignment *without* trading off aesthetics?" — a question a scalar reward cannot answer, and the one most relevant to prompt-editing evaluation.

## Sources

1. PickScore / Pick-a-Pic — Kirstain et al., NeurIPS 2023. arXiv:2305.01569. https://arxiv.org/abs/2305.01569
2. PickScore repo — `yuvalkirstain/PickScore`, ~587⭐, MIT. https://github.com/yuvalkirstain/PickScore
3. HPSv2 paper — Wu et al., 2023. arXiv:2306.09341. https://arxiv.org/abs/2306.09341
4. HPSv2 repo — `tgxs002/HPSv2`, ~663⭐, Apache-2.0, PyPI `hpsv2`. https://github.com/tgxs002/HPSv2
5. HPSv3 paper — Ma et al., ICCV 2025. arXiv:2508.03789. https://arxiv.org/abs/2508.03789
6. HPSv3 repo — `MizzenAI/HPSv3`, ~289⭐, MIT. https://github.com/MizzenAI/HPSv3
7. ImageReward paper — Xu et al., NeurIPS 2023. arXiv:2304.05977. https://arxiv.org/abs/2304.05977
8. ImageReward repo — `THUDM/ImageReward`, ~1,662⭐, Apache-2.0, PyPI `image-reward`. https://github.com/THUDM/ImageReward
9. MPS paper — Zhang et al., CVPR 2024. arXiv:2405.14705. https://arxiv.org/abs/2405.14705
10. MPS repo — `Kwai-Kolors/MPS`, ~201⭐, MIT. https://github.com/Kwai-Kolors/MPS
11. Rich Human Feedback (RAHF) — Liang et al., CVPR 2024. arXiv:2312.10240. https://arxiv.org/abs/2312.10240
12. RichHF-18K dataset — `google-research-datasets/richhf-18k`, ~155⭐. https://github.com/google-research-datasets/richhf-18k
13. LAION Improved Aesthetic Predictor — `christophschuhmann/improved-aesthetic-predictor`, ~1,280⭐. https://github.com/christophschuhmann/improved-aesthetic-predictor
14. Aesthetic Predictor v2.5 (SigLIP) — `discus0434/aesthetic-predictor-v2-5`, ~403⭐. https://github.com/discus0434/aesthetic-predictor-v2-5
15. PRDP: Proximal Reward Difference Prediction — Deng et al., 2024. arXiv:2402.08714. https://arxiv.org/abs/2402.08714
16. Diffusion-DPO — Wallace et al., 2024. arXiv:2311.12908. https://arxiv.org/abs/2311.12908
