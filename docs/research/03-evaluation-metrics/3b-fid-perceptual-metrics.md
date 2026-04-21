---
category: 03-evaluation-metrics
angle: 3b
title: FID, KID, IS & Perceptual Fidelity Metrics for Generative Asset Quality
tags: [FID, KID, IS, LPIPS, DINOv2, CMMD, perceptual-metrics, generative-evaluation]
status: draft
last_updated: 2026-04-19
---

# 3b — FID, KID, IS & Perceptual Fidelity Metrics

## Scope

This deep-dive covers distribution-level and perceptual metrics used to evaluate image generation quality: Inception Score (IS), Fréchet Inception Distance (FID), Kernel Inception Distance (KID), LPIPS, DINO / DINOv2 feature distances, and CMMD (CLIP-MMD). It covers their mechanics, documented failure modes — especially FID's small-sample and Inception-feature biases — and gives concrete guidance on when to use each for asset-quality evaluation in a prompt-to-asset / generative-asset pipeline.

## Metric-by-Metric

### Inception Score (IS) — Salimans et al., 2016

- **Mechanic:** Takes a batch of generated images, runs them through an ImageNet-trained Inception-v3 classifier, and computes `exp(E_x[KL(p(y|x) || p(y))])`. Rewards samples that are individually confident (sharp `p(y|x)`) and collectively diverse (spread-out marginal `p(y)`) [Salimans 2016].
- **What it measures:** Sample "recognizability" and class diversity under an ImageNet prior.
- **Known failure modes** (Barratt & Sharma 2018): does not compare to any reference distribution, ignores intra-class diversity, is biased toward ImageNet semantics, is extremely sensitive to the Inception weights / preprocessing used, and needs large sample sizes (commonly 50k splits of 10k) to be stable. The authors conclude IS "fails to provide useful guidance when comparing models."
- **Practical status in 2026:** Legacy / reporting-only. Keep in a results table for comparability with older papers; do not use as a primary decision metric.

### Fréchet Inception Distance (FID) — Heusel et al., 2017

- **Mechanic:** Extract pool3 (2048-d) activations from Inception-v3 for real and generated sets, fit each as a multivariate Gaussian, and compute the Fréchet (Wasserstein-2) distance: `||μ_r − μ_g||² + Tr(Σ_r + Σ_g − 2(Σ_r Σ_g)^½)` [Heusel 2017].
- **What it measures:** Distance between the *distributions* of Inception features for real vs. generated samples — captures fidelity and diversity jointly, and correlates much better than IS with human judgments on early GANs.
- **Default evaluation protocol:** `FID-50k` — 50,000 generated samples vs. the full reference split, Inception-v3 at 299×299 with the original TF preprocessing.

#### Critique 1 — Small-sample / finite-sample bias (Chong & Forsyth 2020)

FID is a biased estimator at any finite sample size, and **the bias is generator-dependent**. Consequences [Chong 2020]:

- Comparing `FID-10k(A)` to `FID-10k(B)` is not a fair comparison; model A can rank better purely because its samples happen to interact with the Inception feature space in a lower-bias way.
- Shrinking the sample count (common when evaluating expensive diffusion models) does not just increase variance — it changes the *expected* score non-monotonically across models.
- Their proposed fix, `FID∞` / `IS∞`, extrapolates from several sample sizes to an infinite-sample limit using quasi-Monte Carlo integration; this is a drop-in but rarely deployed.

Practical implication: any "FID at 1k or 5k images" comparison between two model variants is untrustworthy without their bias-corrected variant or a distribution-free alternative (KID, CMMD).

#### Critique 2 — Inception features are the wrong basis (Stein et al., 2023)

Stein et al. ran the largest human-vs-metric study on modern generative models and found [Stein 2023]:

- No existing FID-style metric strongly correlates with human judgments across modern models.
- FID systematically *penalizes* state-of-the-art diffusion models that humans actually prefer, because Inception-v3 features are tuned for ImageNet class discrimination rather than fidelity.
- Replacing the feature extractor with **DINOv2-ViT-L/14** dramatically improves human correlation and is recommended as the new default backbone for FID-style metrics.

#### Critique 3 — Normality assumption and text-to-image content (Jayasumana 2024, CMMD)

- FID assumes pool3 activations are jointly Gaussian. Jayasumana et al. show this assumption breaks badly on text-to-image output distributions [Jayasumana 2024].
- Empirically, FID can *decrease* (improve) as image quality visibly degrades along certain progressive distortions, and can fail to reflect iterative improvements in large T2I models between checkpoints.

### Kernel Inception Distance (KID) — Bińkowski et al., 2018

- **Mechanic:** Squared MMD between Inception features of real and generated sets, using a polynomial kernel; computed with an **unbiased estimator** [Bińkowski 2018].
- **Advantages over FID:**
  - No Gaussian assumption on features.
  - Unbiased at finite sample size → meaningful confidence intervals via bootstrap.
  - Tracks model improvements more monotonically during training, suitable as a GAN/diffusion training monitor.
- **Caveats:** Still uses Inception-v3 features, so inherits the "wrong basis" critique from Stein 2023. Numerically noisier than FID on very small sets despite being unbiased.

### LPIPS — Zhang et al., 2018

- **Mechanic:** Paired perceptual distance between two images. Computes deep features from a backbone (AlexNet / VGG / SqueezeNet), normalizes per channel, weights channels by a small head trained on the BAPPS 2AFC human-similarity dataset, and averages L2 distances [Zhang 2018].
- **Key empirical finding:** Deep features (even from self-supervised and unsupervised nets) match human perceptual judgments far better than PSNR / SSIM / FSIM — "unreasonably" effective and robust across architectures and training regimes.
- **Use case:** *Reference-based* evaluation — you must have a ground-truth target image (super-resolution, image-to-image translation, editing, restoration, reconstruction). Not appropriate for unconditional or open-ended text-to-image generation where there is no canonical reference.

### DINO / DINOv2 feature distances — Oquab et al., 2023; Stein et al., 2023

- **Mechanic:** Replace the Inception-v3 feature extractor in any distribution metric (FID, KID, precision/recall, CMMD-style MMD) with features from DINOv2, a self-supervised ViT trained on 142M curated images without labels [Oquab 2023].
- **Why it matters for evaluation:**
  - DINOv2 features are not tied to ImageNet class boundaries, so they generalize better to artistic, photorealistic, and out-of-distribution generations.
  - Stein 2023 identifies **DINOv2-ViT-L/14** as the best single feature extractor across 17 metrics × 9 encoders and argues for it as the new community default.
  - The `dgm-eval` library from Layer 6 AI standardizes this computation and is the practical entry point [Stein 2023].
- **Common instantiations:**
  - `FD-DINOv2` — Fréchet distance on DINOv2 features.
  - `KD-DINOv2` — KID with DINOv2 features.
  - Improved precision / recall / density / coverage on DINOv2.

### CMMD (CLIP-MMD) — Jayasumana et al., CVPR 2024

- **Mechanic:** Embed real and generated images with a CLIP image encoder (ViT-L/14 in the paper), compute squared MMD with a Gaussian RBF kernel [Jayasumana 2024].
- **Properties:**
  - **Distribution-free:** no Gaussian assumption on embeddings.
  - **Unbiased estimator:** meaningful at small N; the paper shows stable scores starting at a few hundred to a few thousand images.
  - **Semantic basis:** CLIP features encode text-aligned concepts, matching the evaluation target for modern text-to-image models far better than Inception-v3.
  - **Monotonic under progressive distortion:** correctly degrades on noise / blur / JPEG / VAE-style artefact sweeps where FID sometimes improves.
- **Reference implementation:** `google-research/cmmd` (official) [CMMD repo].
- **Limitations:** CLIP features inherit CLIP's own weaknesses — compositionality failures, text-in-image shortcuts, and bias toward web-scraped aesthetics. CMMD is a *distributional* metric; like FID it does not judge per-image text-prompt alignment (that is CLIPScore / VQA-based metric territory).

## Comparative Summary

| Metric | Feature basis | Paired? | Unbiased at small N | Gaussian assumption | 2026 role |
|---|---|---|---|---|---|
| IS | Inception-v3 classes | No (no reference) | No | — | Legacy |
| FID | Inception-v3 pool3 | No | **No** (Chong 2020) | **Yes** | Legacy/baseline; mandatory to report but not to decide |
| KID | Inception-v3 pool3 | No | Yes | No | Training monitor; small-N comparisons |
| FD-DINOv2 | DINOv2 ViT-L/14 | No | No | Yes (Fréchet form) | **Recommended distribution metric** [Stein 2023] |
| CMMD | CLIP ViT-L/14 | No | Yes | No | **Recommended for T2I / small-N** [Jayasumana 2024] |
| LPIPS | VGG/AlexNet + learned head | **Yes** | Per-pair | — | Reference-based pixel-faithful eval |

## When to Use Each (Prompt-Enhancer / Asset-Quality Context)

A prompt-to-asset pipeline typically wants to answer three distinct questions; match the metric to the question.

1. **"Does the enhanced prompt raise overall asset quality across a batch?"** — Distribution-level. Use **CMMD** as the primary decision metric plus **FD-DINOv2** as a second opinion. Report legacy **FID-50k** for comparability with external baselines. Avoid making claims from FID at sample counts under ~10k without bias correction.

2. **"Is this single enhanced-prompt asset faithful to a reference (e.g., a target style image, a user-supplied image, a prior good generation)?"** — Paired. Use **LPIPS** (VGG or AlexNet backbone) as the perceptual distance; pair with a semantic distance like **DINOv2 cosine** between the two images for a concept-level check.

3. **"Does the asset match the *prompt* semantically?"** — Out of scope for this angle; use CLIPScore / VQA-based metrics (TIFA, DSG, VPEval) as documented in adjacent angles. CMMD and FID do not measure per-image prompt alignment.

### Defaults and pitfalls worth committing to

- **Never compare FID across papers unless the sample size, Inception weights, resize method, and preprocessing are identical.** Small discrepancies move FID by several points.
- **Never quote "FID at 1k" as evidence** — it is a generator-dependent biased estimator at that scale (Chong 2020). Swap to CMMD or KID with bootstrap CIs.
- **Log CMMD *and* FD-DINOv2 together during development.** If they disagree strongly, something is off (feature-extractor brittleness, dataset leakage, or prompt-set drift).
- **Use LPIPS only with a genuine reference image.** Using LPIPS against an arbitrary "representative" real image is a common misuse.
- **Document the exact encoder checkpoint** (DINOv2-ViT-L/14, CLIP ViT-L/14 OpenAI vs OpenCLIP, Inception-v3 TF-slim vs PyTorch port). These choices change the numbers materially.

> **Updated 2026-04-21:** An additional emerging alternative worth tracking is **Fréchet Wavelet Distance (FWD)**, published at ICLR 2025 ([OpenReview](https://openreview.net/forum?id=QinkNNKZ3b)). FWD applies Fréchet distance over Wavelet Packet Transform coefficients rather than network activations, making it domain-agnostic (no ImageNet or CLIP pre-training dependency) and sensitive to both spatial and textural frequency content. It is an early-stage proposal — CMMD + FD-DINOv2 remain the recommended defaults — but FWD is the one to watch if the community seeks a completely pre-training-free distributional metric.

## Primary Citations

1. Heusel, M., Ramsauer, H., Unterthiner, T., Nessler, B., & Hochreiter, S. (2017). *GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium* (introduces FID). NeurIPS. https://arxiv.org/abs/1706.08500
2. Salimans, T., Goodfellow, I., Zaremba, W., Cheung, V., Radford, A., & Chen, X. (2016). *Improved Techniques for Training GANs* (introduces Inception Score). NeurIPS. https://arxiv.org/abs/1606.03498
3. Barratt, S., & Sharma, R. (2018). *A Note on the Inception Score*. https://arxiv.org/abs/1801.01973
4. Bińkowski, M., Sutherland, D. J., Arbel, M., & Gretton, A. (2018). *Demystifying MMD GANs* (introduces KID). ICLR. https://arxiv.org/abs/1801.01401
5. Zhang, R., Isola, P., Efros, A. A., Shechtman, E., & Wang, O. (2018). *The Unreasonable Effectiveness of Deep Features as a Perceptual Metric* (LPIPS). CVPR. https://arxiv.org/abs/1801.03924
6. Chong, M. J., & Forsyth, D. (2020). *Effectively Unbiased FID and Inception Score and where to find them*. CVPR. https://arxiv.org/abs/1911.07023
7. Oquab, M., Darcet, T., Moutakanni, T., Vo, H., et al. (2023). *DINOv2: Learning Robust Visual Features without Supervision*. https://arxiv.org/abs/2304.07193
8. Stein, G., Cresswell, J. C., Hosseinzadeh, R., et al. (2023). *Exposing flaws of generative model evaluation metrics and their unfair treatment of diffusion models*. NeurIPS. https://proceedings.neurips.cc/paper_files/paper/2023/file/0bc795afae289ed465a65a3b4b1f4eb7-Paper-Conference.pdf — code: https://github.com/layer6ai-labs/dgm-eval
9. Jayasumana, S., Ramalingam, S., Veit, A., Glasner, D., Chakrabarti, A., & Kumar, S. (2024). *Rethinking FID: Towards a Better Evaluation Metric for Image Generation* (introduces CMMD). CVPR. https://openaccess.thecvf.com/content/CVPR2024/papers/Jayasumana_Rethinking_FID_Towards_a_Better_Evaluation_Metric_for_Image_Generation_CVPR_2024_paper.pdf — code: https://github.com/google-research/google-research/tree/master/cmmd
