---
category: 14-negative-prompting-artifacts
angle: 14d
title: "Automated Quality Scoring for Generated Assets: CLIPScore, ImageReward, PickScore, HPSv2/v3, LAION Aesthetics, Verifiers, and VLM-as-Judge"
author: subagent-14d
date: 2026-04-19
status: draft
source_types:
  - arxiv
  - github
  - vendor-docs
word_count_target: "2500-4000"
primary_sources:
  - https://arxiv.org/abs/2104.08718  # CLIPScore
  - https://arxiv.org/abs/2304.05977  # ImageReward
  - https://arxiv.org/abs/2305.01569  # Pick-a-Pic / PickScore
  - https://arxiv.org/abs/2306.09341  # HPSv2
  - https://arxiv.org/abs/2508.03789  # HPSv3
  - https://github.com/christophschuhmann/improved-aesthetic-predictor
  - https://github.com/tgxs002/HPSv2
  - https://github.com/THUDM/ImageReward
  - https://github.com/yuvalkirstain/PickScore
---

# Automated Quality Scoring for Generated Assets

## Executive Summary

Turning a vague request like *"a transparent logo for my note-taking app"* into a **production-grade asset** requires more than a single call to an image model. Every frontier generator (Imagen 4, Gemini 2.5 Flash Image, `gpt-image-1`, Flux, SDXL, Recraft, Ideogram) produces **high-variance output**: the same prompt yields a mix of brilliant, mediocre, and broken images (checkered transparency, misspelled text, off-centre subjects, watermarks, extra limbs on mascots). The answer the frontier labs and serious pipelines converge on is **inference-time scaling with an automated verifier**: generate N candidates, score them, keep the best, reject the rest.

This document surveys the scorer landscape a 2026 prompt-to-asset system should treat as building blocks:

1. **Preference reward models** trained on human pairwise data — **ImageReward** (Xu et al., 2023), **PickScore** (Kirstain et al., 2023), **HPSv2** (Wu et al., 2023), **HPSv3** (Ma et al., ICCV 2025).
2. **Alignment metrics** — **CLIPScore** (Hessel et al., EMNLP 2021) and its reference-augmented variant.
3. **Aesthetic predictors** — **LAION-Aesthetics v1/v2**, the CLIP+MLP regressor that underpins LAION-5B filtering and most SD training sets.
4. **Verifier models for inference-time scaling** — learned verifiers on hidden states / decoded pixels that power best-of-N selection in diffusion pipelines.
5. **VLM-as-Judge** — prompting GPT-4o, Gemini 2.5 Pro, Claude 3.5/4 Sonnet with a rubric ("does this logo have a transparent background? rate text spelling 1–5"), with its variance, position bias, and calibration failure modes.

The three most load-bearing findings:

- **Preference models are not interchangeable with alignment metrics.** CLIPScore captures "does the image match the prompt?" but is nearly silent on aesthetic quality and artifact presence. PickScore / ImageReward / HPSv2 correlate with human preference 2–3× better than raw CLIP on T2I outputs. An asset pipeline needs **both** classes: alignment gate + preference rank.
- **VLM-as-judge is the only scorer that can answer asset-specific rubric questions** ("is the background truly transparent?", "is text spelled correctly?", "is the subject within the safe zone?"). It has real pathologies (position bias 5–15 pp, score-digit preference, verbosity bias, hallucination), but can be operationalized with rubrics, paired-comparison randomisation, and ensemble voting.
- **Every scorer has failure modes that correlate with the artifacts you're trying to reject.** LAION-Aesthetics rewards bokeh and soft focus (bad for logos). CLIPScore is fooled by text tokens visible in the image. Reward models trained pre-2024 underrate text-rendering-capable models (Ideogram, Flux, Imagen 3+). The pipeline must be a small **ensemble with explicit per-scorer hard gates**, not a single scalar.

## Scorer Comparison

### CLIPScore (Hessel et al., EMNLP 2021)

- **Paper:** [arXiv:2104.08718](https://arxiv.org/abs/2104.08718) · **Code:** [jmhessel/clipscore](https://github.com/jmhessel/clipscore)
- **Formula:** `CLIPScore(c, i) = w · max(cos(E_CLIP(c), E_CLIP(i)), 0)`, with `w = 2.5` in the original paper. RefCLIPScore adds a harmonic mean with reference caption cosine.
- **What it measures:** Text–image alignment / semantic compatibility.
- **Strengths:** Reference-free, cheap (one CLIP forward per image), interpretable, widely adopted. Higher correlation with human caption quality than CIDEr/SPICE.
- **Weaknesses for asset QA:**
  - Near-blind to aesthetic quality, artifacts, and production-grade polish.
  - **OCR-cheatable:** if the prompt contains the brand name, CLIP will reward images that *render the brand name as visible text*, even when the prompt said "no text".
  - CLIP ViT-L/14 tokenizer is 77 tokens — long prompts get silently truncated.
  - Biased toward photographic content; underrates flat vector / logo / icon styles.

### ImageReward (Xu et al., NeurIPS 2023)

- **Paper:** [arXiv:2304.05977](https://arxiv.org/abs/2304.05977) · **Code:** [THUDM/ImageReward](https://github.com/THUDM/ImageReward)
- **Architecture:** BLIP backbone fine-tuned on **137K expert pairwise comparisons** with rating + ranking annotations. Outputs a scalar reward; typical values roughly ∈ [-2, 2].
- **What it measures:** Human preference on T2I outputs, weighting **alignment, body/limb correctness, and aesthetics** in a single scalar.
- **Reported gains over baselines (from paper):** +38.6% vs CLIP, +39.6% vs LAION-Aesthetic, +31.6% vs BLIP at predicting human preference.
- **Also ships ReFL** — Reward Feedback Learning — a diffusion fine-tuning algorithm. ReFL-tuned SD wins 58.4% of head-to-head vs untuned.
- **Caveats:** Training data predates SDXL/Flux/Imagen 3; can underrate models whose style distribution it has not seen. Drops off on stylized / vector / logo content.

### PickScore (Kirstain et al., 2023)

- **Paper:** [arXiv:2305.01569](https://arxiv.org/abs/2305.01569) · **Code:** [yuvalkirstain/PickScore](https://github.com/yuvalkirstain/PickScore) · **Model:** [`yuvalkirstain/PickScore_v1`](https://huggingface.co/yuvalkirstain/PickScore_v1)
- **Dataset:** **Pick-a-Pic** — ~500K (v1), >1M (v2) real in-the-wild user prompts + pairwise preferences collected through a hosted SD playground. Substantially less filtered than HPD/ImageReward data.
- **Architecture:** CLIP-H (ViT-H/14) dual encoder fine-tuned with an InstructGPT-style pairwise preference objective.
- **Headline:** **70.5% pairwise accuracy vs 68.0% for humans** (test-set, same-prompt pairs) — i.e. on average *superhuman* at predicting which of two images an average Pick-a-Pic user will pick. CLIP-H zero-shot is 60.8%, aesthetic predictors 56.8%.
- **Strengths:** Trained on user-native prompts (not expert captions) → calibration matches what real users want. Well-suited as a best-of-N selector.
- **Weaknesses:** Still CLIP-bounded (77 tokens, ViT-H). Preferences encoded are **popular taste** — which often means bokeh, high saturation, "epic" — not brand-safe simplicity.

### HPSv2 (Wu et al., 2023) and HPSv2.1

- **Paper:** [arXiv:2306.09341](https://arxiv.org/abs/2306.09341) · **Code:** [tgxs002/HPSv2](https://github.com/tgxs002/HPSv2)
- **Dataset:** **HPD v2** — 798,090 preference choices over 430,060 image pairs across **four styles: Animation, Concept-art, Painting, Photo**, actively debiased vs Pick-a-Pic's user-selection skew.
- **Architecture:** CLIP fine-tuned with pairwise preference loss. Reference benchmark scores across styles (Dreamlike Photoreal 2.0: 27.86, SDXL Refiner 0.9: 27.80, SD 2.0: 27.17, SD 1.4: 26.95).
- **HPSv2.1 (Sep 2024)** re-trained on higher-quality data; drop-in improvement.
- **Strengths:** The dataset-bias control is explicit and documented; per-style subscores are a useful diagnostic ("this prompt is animation, use the animation head").
- **Weaknesses:** Style axis does not cover logos, icons, UI illustrations, or vector — directly relevant to this project.

### HPSv3 (Ma et al., ICCV 2025)

> **Updated 2026-04-21:** HPSv3 is fully released. Inference code, training code, CoHP code, and model weights were released August 6 2025 ([GitHub: MizzenAI/HPSv3](https://github.com/MizzenAI/HPSv3)). The model is available on HuggingFace at `MizzenAI/HPSv3` and installable via PyPI (`pip install hpsv3`). The ICCV 2025 paper and poster are publicly accessible.

- **Paper:** [arXiv:2508.03789](https://arxiv.org/abs/2508.03789) · **ICCV 2025** poster/paper (publicly accessible at `openaccess.thecvf.com`).
- **Dataset:** **HPDv3** — **1.08M text–image pairs, 1.17M pairwise annotations**, the first "wide-spectrum" preference dataset: mixes SOTA generator outputs **and real-world images of varying quality**.
- **Architecture:** **VLM-based** preference model built on **Qwen2-VL** (supersedes CLIP/BLIP feature extractors used by v1/v2 and ImageReward) with an **uncertainty-aware ranking loss** that accounts for annotator disagreement.
- **Companion method: Chain-of-Human-Preference (CoHP)** — iterative refinement: generate, score with HPSv3, use score to pick next candidate — without any extra data.
- **Why it matters for this project:** A VLM-based scorer can ingest richer signals (text rendering, composition, subject centredness), and HPSv3 explicitly addresses the "everything looks good, now differentiate" regime that asset QA lives in.
- **Status as of 2026-04-21:** Available and production-ready. PyPI: `pip install hpsv3`. HuggingFace: `MizzenAI/HPSv3`. Latency ~300ms GPU (Qwen2-VL backbone).

### LAION-Aesthetics v1 and v2

- **Repos:** [LAION-AI/aesthetic-predictor](https://github.com/LAION-AI/aesthetic-predictor) (v1), [christophschuhmann/improved-aesthetic-predictor](https://github.com/christophschuhmann/improved-aesthetic-predictor) (v2). Blog: [LAION-Aesthetics](https://laion.ai/blog/laion-aesthetics).
- **Architecture:** CLIP ViT-L/14 image embedding → tiny MLP (or linear head in final v2) → scalar 1–10. Trained on SAC + LAION-Logos + AVA (250K photos).
- **Role in the ecosystem:** The filter used to build LAION-Aesthetics subsets that trained SD 1.5, SDXL, and many community checkpoints. So most public SD models' "taste" is literally this scorer. Threshold ≥ 5.0 ≈ "passable"; ≥ 6.5 ≈ "aesthetically pleasing". LAION-5B subsets were filtered at different thresholds (4.5, 5.0, 6.0, 6.25) for specific training runs.
- **Severe pitfalls for asset work:**
  - Rewards photographic aesthetics: bokeh, soft lighting, saturation, painterly texture.
  - **Actively penalises flat/vector logos and simple icons**, which have low contrast variance and no bokeh. A clean wordmark can score ≤ 4.5 while a messy painterly blob scores 6.5.
  - Biased toward the selection criteria of the SAC/AVA raters (~2020 tastes).
- **Correct usage:** Treat as a **noise filter** ("reject if < 3.5") on photographic outputs, *not* a ranker on vector/logo outputs.

### Verifier Models (inference-time scaling)

- **Ma et al., "Scaling Inference Time Compute for Diffusion Models"**, CVPR 2025 — frames the search-over-noise problem along two axes: **verifier** (the scorer) × **search algorithm** (random, zeroth-order, tree/beam). Shows large GenEval / DrawBench gains from best-of-N with a good verifier.
- **Latent Verifiers / VHS (Verifier on Hidden States), 2025** — operates on a DiT's intermediate hidden states, avoiding decode. Reports -63.3% wall-clock and -51% FLOPs vs an MLLM verifier, +2.7% on GenEval.
- **Implication for this project:** For a *production* service, a small learned verifier (either latent or a distilled preference head) is cheaper than calling GPT-4o per candidate. A good 2026 stack routes cheap candidates through cheap verifiers, reserves VLM-as-judge for the final 1–2.

### VLM-as-Judge (GPT-4o, Gemini 2.5 Pro, Claude 3.5/4 Sonnet)

- **Only** scorer class that can answer **rubric questions** ("is the background transparent?", "is the text spelled 'Acme' correctly?", "is the subject in the safe zone for an iOS icon?").
- Performance on well-defined rubric items approaches human agreement; on open-ended "quality" scores it's noisy.
- Documented pathologies (see next section): position bias, self-preference, verbosity bias, score-digit clustering, hallucination of details not present in the image.
- **GPT-ImgEval (2504.02782)** benchmark explicitly diagnoses GPT-4o's image reasoning: literal-interpretation default, inconsistent knowledge-constraint application, struggle with conditional reasoning.

### Quick comparison table

| Scorer            | Type                     | Cost / image | Good for                           | Bad for                                   |
|-------------------|--------------------------|--------------|------------------------------------|-------------------------------------------|
| CLIPScore         | alignment                | ~5 ms GPU    | prompt-adherence gate              | aesthetics, artifacts, text rendering     |
| LAION-Aesthetic   | aesthetic MLP            | ~5 ms GPU    | filtering garbage photographs      | logos, icons, vector, UI                  |
| PickScore         | preference (CLIP-H)      | ~30 ms GPU   | best-of-N ranking, user-taste      | narrow-brief brand work                   |
| ImageReward       | preference (BLIP)        | ~60 ms GPU   | general preference, pre-2024 dist. | newer models, stylized content            |
| HPSv2 / 2.1       | preference (CLIP)        | ~30 ms GPU   | per-style ranking                  | logos, icons (no relevant style head)     |
| HPSv3             | preference (VLM)         | ~300 ms GPU  | 2025-era SOTA output ranking       | extreme latency sensitivity               |
| Latent verifier   | learned (hidden states)  | ~10 ms GPU   | in-process best-of-N               | rubric questions                          |
| VLM-as-Judge      | prompted multimodal LLM  | 500 ms–5 s   | rubric QA, asset-specific checks   | cost, variance, position bias             |

## VLM-as-Judge Patterns and Pitfalls

### Why VLMs are necessary

Asset QA inevitably has questions no learned scalar can answer:

- *"Is the PNG background transparent (vs a white or checker pattern)?"*
- *"Is the word 'Acme' spelled correctly with no glyph hallucinations?"*
- *"Is the main subject within a 1024×1024 iOS icon safe zone?"*
- *"Are there extra fingers / limbs / eyes?"*
- *"Does this favicon read at 16×16 px?"*

Preference models collapse all these concerns into one scalar. A VLM can evaluate them separately and return structured output.

### Documented pitfalls (2024–2025 literature)

1. **Position bias (5–15 pp).** In pairwise settings, GPT-4 and peers favor one position (usually the first) beyond chance. Confirmed systematic, not random (Shi et al., "Judging the Judges", 2024). **Mitigation:** randomise order *per comparison*, evaluate twice with positions swapped, require both orderings to agree.
2. **Score-option position bias.** When asked to output "1 / 2 / 3 / 4 / 5", LLMs prefer certain positions in the option list. "Am I More Pointwise or Pairwise?" (2026) shows balanced permutation of score options mitigates.
3. **Verbosity bias.** Longer candidate answers / more elaborate captions win disproportionately. In image judging this shows up as preference for images described with more detail in the internal chain-of-thought.
4. **Self-preference.** VLMs tend to rate output generated by models in their own family higher. GPT-4o slightly prefers `gpt-image-1`/`gpt-image-1.5` outputs; Gemini prefers Imagen/Gemini image outputs. **Mitigation:** cross-family ensemble (GPT-4o + Gemini 2.5 Pro + Claude Sonnet 4.x).
5. **Shortcut sensitivity / hallucination.** VLMs will confidently describe text as "correctly spelled" when it is gibberish, especially at small sizes. Always attach a **rendered OCR transcription** to the rubric prompt and make the VLM compare OCR output to the expected string.
6. **Score-digit clustering.** On 1–10 scales, models cluster at 7/8. Use discrete categorical rubrics (`pass/minor/major/blocker`) instead of continuous scales.
7. **Explanation gaps.** The final score often does not follow from the rationale. Structured output with per-criterion scalars forces the model to commit.

### Calibration tactics

- **Use a rubric, not "rate this 1–10".** The rubric must be **per-asset-type** (logo vs favicon vs OG image vs app icon) and written as **binary or 4-level categorical** checks.
- **JSON/structured output** (via Responses API / Gemini `responseSchema` / Anthropic tool use) to eliminate parsing variance and force all rubric items.
- **Chain-of-thought before score** ("first, describe what you see; then score"), but log the thought — it's the audit trail if the score is wrong.
- **Ensemble 2–3 model families** and take the strict minimum on hard gates.
- **Calibrate against a held-out labelled set** of ~50 assets per type. Measure the VLM's Cohen's κ vs human labels and reject any rubric item with κ < 0.4 (random agreement).
- **Paired-comparison mode** for ranking top-N: give the VLM two images + rubric, ask for a winner with a reason, randomise order, require agreement across two orderings.

## Rubric Templates per Asset Type

The templates below are designed to be sent verbatim as the `system`/rubric portion of a VLM judge call. They use strict enums and binary gates so variance is minimised.

### Logo (transparent PNG)

```yaml
asset_type: logo_transparent_png
rubric:
  # Hard gates (any "fail" rejects the image)
  - id: transparent_background
    question: "Does the image have a fully transparent background, with NO checkerboard pattern, white fill, coloured fill, or drop shadow of the generator's transparency artefact?"
    type: enum
    options: [pass, fail]
    is_hard_gate: true
  - id: text_spelling
    question: "OCR says: '{ocr_result}'. Expected: '{brand_name}'. Does the rendered text exactly match the expected brand name, character for character, case-sensitive?"
    type: enum
    options: [exact_match, minor_kerning_only, wrong_chars, hallucinated_text]
    is_hard_gate_on: [wrong_chars, hallucinated_text]
  - id: single_subject
    question: "Is there exactly one unified logo mark, not multiple variants laid out in a grid?"
    type: enum
    options: [single, grid_of_variants, fragmented]
    is_hard_gate_on: [grid_of_variants, fragmented]
  - id: watermark_free
    question: "Is the image free of visible watermarks, 'Shutterstock/Getty/Adobe Stock' overlays, or signature marks?"
    type: enum
    options: [clean, watermarked]
    is_hard_gate_on: [watermarked]
  # Quality scores (informational, used to rank among passes)
  - id: style_match
    question: "How well does the visual style match the requested style ('{requested_style}')?"
    type: scale_4
    options: [poor, fair, good, excellent]
  - id: legibility_at_small_size
    question: "Imagine this rendered at 64x64 px. Is the mark still recognisable?"
    type: scale_4
  - id: print_safe
    question: "Would this reproduce cleanly in single-colour (black on white) print?"
    type: enum
    options: [yes, lossy, no]
```

### App Icon (iOS / Android / web)

```yaml
asset_type: app_icon
rubric:
  - id: square_aspect
    question: "Is the image a 1:1 square with no letterboxing?"
    type: enum
    options: [square, letterboxed, non_square]
    is_hard_gate_on: [letterboxed, non_square]
  - id: safe_zone
    question: "Is the subject fully inside the central 80% safe zone (with no critical detail in the outer 10% margin on any side)?"
    type: enum
    options: [inside, touches_edge, cropped]
    is_hard_gate_on: [cropped]
  - id: text_policy
    question: "Apple HIG discourages text in app icons. Does this icon contain any readable text?"
    type: enum
    options: [no_text, one_letter_glyph_ok, full_words_present]
    # soft — warn, don't reject
  - id: visual_weight_centered
    question: "Is the optical centre of the icon within 5% of the geometric centre?"
    type: enum
    options: [centered, slightly_off, severely_off]
  - id: single_focal_point
    question: "Is there one clear focal point, not multiple competing elements?"
    type: scale_4
  - id: distinct_silhouette
    question: "Is the silhouette distinct enough to read as a unique app on a crowded home screen?"
    type: scale_4
```

### Favicon / 16×16

```yaml
asset_type: favicon
rubric:
  - id: resolves_at_16px
    question: "I am showing you a 16x16 downscale. Is the mark recognisable at this size?"
    type: enum
    options: [crisp, blurry_but_readable, unreadable]
    is_hard_gate_on: [unreadable]
  - id: contrast_sufficient
    question: "Is there sufficient contrast between the mark and the background for visibility on both light and dark browser chrome?"
    type: enum
    options: [works_both, works_light_only, works_dark_only, fails_both]
    is_hard_gate_on: [fails_both]
```

### OG / Social Share Image (1200×630)

```yaml
asset_type: og_image
rubric:
  - id: safe_zone_for_crops
    question: "Facebook/Twitter/LinkedIn crop to different aspect ratios. Does the primary content sit inside the centre 1200x600 area (title + subject)?"
    type: enum
    options: [inside, partial, critical_content_cropped]
    is_hard_gate_on: [critical_content_cropped]
  - id: text_readable_at_thumbnail
    question: "At a 600x315 thumbnail render, is the headline text legible?"
    type: enum
    options: [legible, cramped, unreadable]
    is_hard_gate_on: [unreadable]
  - id: brand_mark_present
    question: "Is the brand mark/logo present and identifiable?"
    type: enum
    options: [present, absent]
```

### Illustration (empty state / onboarding)

```yaml
asset_type: ui_illustration
rubric:
  - id: subject_correct
    question: "Does the illustration depict '{prompt_subject}' unambiguously?"
    type: scale_4
  - id: style_consistency
    question: "How closely does the illustration match the reference style '{reference_style_id}' (flat / isometric / duotone / line-art)?"
    type: scale_4
  - id: anatomy_clean
    question: "If humans/animals are depicted, are anatomy features correct (no extra fingers, fused limbs, twisted joints, asymmetric eyes)?"
    type: enum
    options: [correct, minor, major_errors]
    is_hard_gate_on: [major_errors]
  - id: no_artifacts
    question: "Any visible checkerboard, noise/static, seams, melting textures, watermarks, or signature marks?"
    type: enum
    options: [none, minor, present]
    is_hard_gate_on: [present]
```

## Reference Pipeline: Best-of-N with Tiered Scorers

The goal: return exactly one asset the user won't reject. Architecture below is deliberately tiered so cost scales with candidate count.

```
   prompt, asset_type, brand_name
          │
          ▼
┌─────────────────────┐
│ Generator (pick one │  e.g. Gemini 2.5 Flash Image, gpt-image-1,
│  or fan out to 2-3) │       gpt-image-1.5, FLUX.2 [pro/max],
│   N = 4..8 samples  │       Ideogram v3, Recraft v3/v4
└─────────┬───────────┘
          │
          ▼
  ┌───────────────────┐
  │  Stage 1: cheap   │  per-image, <50 ms
  │   hard gates      │
  ├───────────────────┤
  │ - alpha-channel   │  pixel inspection (PIL .getextrema())
  │   check           │
  │ - CLIPScore ≥ τ₁  │  prompt alignment floor
  │ - NSFW filter     │  (safety)
  │ - OCR text check  │  tesseract/PaddleOCR vs expected brand
  │ - size/aspect     │  
  └────────┬──────────┘
           │ survivors (typically 50-70%)
           ▼
  ┌───────────────────┐
  │  Stage 2: scalar  │  per-image, ~100 ms
  │     ranking       │
  ├───────────────────┤
  │ score = w₁·PickScore                                   \
  │       + w₂·HPSv3 (or v2.1 if latency-bound)             } weighted
  │       + w₃·ImageReward                                  / ensemble
  │       - w₄·LAION_aesthetic_penalty (only if photo)     /
  └────────┬──────────┘
           │ keep top K=2
           ▼
  ┌───────────────────┐
  │  Stage 3: VLM     │  per-pair or per-image, ~1-5 s
  │  rubric judge     │
  ├───────────────────┤
  │ For each of K:    │
  │   call 2 of {GPT-4o, Gemini 2.5 Pro, Claude 4.5 Sonnet}
  │   with rubric for │  asset_type (see templates above)
  │ Intersect hard    │
  │ gates (both       │
  │ judges must pass) │
  │ Rank passes by    │
  │ weighted soft     │
  │ scores            │
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │ Stage 4: loop or  │
  │ return            │
  ├───────────────────┤
  │ if any survivor:  │  return highest-ranked
  │ else:             │  feed failure reasons back into
  │                   │  prompt (e.g. "add: transparent
  │                   │  background; no text in icon"),
  │                   │  re-generate up to M=3 rounds
  └───────────────────┘
```

### Weights and thresholds (starting points)

| Parameter                      | Value           | Rationale                                            |
|--------------------------------|-----------------|------------------------------------------------------|
| N candidates                   | 4 (prod) / 8 (high-value) | diminishing returns past 8, cost linear        |
| CLIPScore τ₁ (floor)           | 0.22            | below → wrong subject                                |
| w₁ PickScore                   | 0.35            | best correlation with "user would pick"              |
| w₂ HPSv3                       | 0.35            | SOTA preference; lower if latency-bound              |
| w₃ ImageReward                 | 0.20            | adds diversity to the ensemble                       |
| w₄ LAION-aesthetic penalty     | 0.10 (photos only; **0 for vector/logos**) | avoids punishing flat design |
| VLM hard-gate agreement        | 2/2             | strict — reject on any disagreement on gates         |
| VLM-judge models (prod)        | GPT-4o + Gemini 2.5 Pro | cross-family to suppress self-preference       |
| Max refinement rounds M        | 3               | cost cap                                             |

### What the pipeline explicitly solves

- **The transparent-background / checker-box failure** (the user's pet peeve): caught by the Stage-1 alpha pixel-inspection gate, rechecked by Stage-3 VLM rubric.
- **Misspelled text**: OCR diff in Stage 1, semantic spell-check by VLM in Stage 3.
- **Watermarks / signatures**: Stage-3 VLM rubric item.
- **Extra limbs, deformed anatomy**: Stage-2 preference models catch ~80% (trained on human "this looks wrong" signals); Stage-3 rubric catches the rest.
- **Aesthetic off-brand outputs** (e.g. painterly when flat was requested): Stage-3 `style_match` item.
- **Off-centre / cropped icons**: Stage-3 `safe_zone` / `visual_weight_centered` items.

### Instrumentation / feedback loop

Every judgement writes (prompt, candidate, all scores, rubric JSON, final decision, user thumb-up/thumb-down if returned) to a log. This yields a private preference dataset — which in turn lets the system:

- **Tune thresholds** (current τ₁ too permissive? raise).
- **Detect scorer drift** — if PickScore and HPSv3 start disagreeing, investigate.
- **Build a local DPO / ReFL fine-tune** of a preferred generator on asset-specific preferences. This is how the long-term moat compounds.

## Cross-cutting Caveats

- **No single scorer is sufficient.** Every single-number scorer has a failure mode that correlates with an artifact class you care about. Always use an ensemble with class-specific hard gates.
- **Scorer distribution ≠ your distribution.** PickScore, ImageReward, HPSv2 were all trained mostly on photographic and concept-art SD outputs. For logos / icons / vector their calibration is weak. Treat their ranking as advisory, trust rubric VLM for asset-specific gates.
- **Report cost before quality.** Stage 3 is 10–100× the cost of Stage 2. Your budget should push as many rejections into Stage 1–2 as possible.
- **Run the scorer offline on a golden set.** Before shipping, pass 200 labelled "good" and 200 labelled "bad" assets through the pipeline. Measure FPR and FNR per rubric item. Anything > 20% error → rewrite the rubric question.

## References

### Primary papers

- Hessel et al., **"CLIPScore: A Reference-free Evaluation Metric for Image Captioning"**, EMNLP 2021. [arXiv:2104.08718](https://arxiv.org/abs/2104.08718)
- Xu et al., **"ImageReward: Learning and Evaluating Human Preferences for Text-to-Image Generation"**, NeurIPS 2023. [arXiv:2304.05977](https://arxiv.org/abs/2304.05977)
- Kirstain et al., **"Pick-a-Pic: An Open Dataset of User Preferences for Text-to-Image Generation"**, 2023. [arXiv:2305.01569](https://arxiv.org/abs/2305.01569)
- Wu et al., **"Human Preference Score v2: A Solid Benchmark for Evaluating Human Preferences of Text-to-Image Synthesis"**, 2023. [arXiv:2306.09341](https://arxiv.org/abs/2306.09341)
- Ma et al., **"HPSv3: Towards Wide-Spectrum Human Preference Score"**, ICCV 2025. [arXiv:2508.03789](https://arxiv.org/abs/2508.03789)
- Ma et al., **"Scaling Inference Time Compute for Diffusion Models"**, CVPR 2025.
- **"Tiny Inference-Time Scaling with Latent Verifiers / Verifier on Hidden States (VHS)"**, 2025.
- **"GPT-ImgEval: A Comprehensive Benchmark for Diagnosing GPT-4o in Image Generation"**, 2025. [arXiv:2504.02782](https://arxiv.org/abs/2504.02782)
- Shi et al., **"Judging the Judges: A Systematic Investigation of Position Bias in Pairwise Comparative Assessments by LLMs"**, 2024. [arXiv:2406.07791](https://arxiv.org/abs/2406.07791)
- **"Am I More Pointwise or Pairwise? Revealing Position Bias in Rubric-Based LLM-as-a-Judge"**, 2026.

### Code and models

- CLIPScore — [github.com/jmhessel/clipscore](https://github.com/jmhessel/clipscore)
- ImageReward — [github.com/THUDM/ImageReward](https://github.com/THUDM/ImageReward)
- PickScore — [github.com/yuvalkirstain/PickScore](https://github.com/yuvalkirstain/PickScore), HF model [yuvalkirstain/PickScore_v1](https://huggingface.co/yuvalkirstain/PickScore_v1)
- HPSv2 — [github.com/tgxs002/HPSv2](https://github.com/tgxs002/HPSv2) (PyPI: `hpsv2`)
- HPSv3 — Homepage linked from paper
- LAION Aesthetic v1 — [github.com/LAION-AI/aesthetic-predictor](https://github.com/LAION-AI/aesthetic-predictor)
- LAION Aesthetic v2 — [github.com/christophschuhmann/improved-aesthetic-predictor](https://github.com/christophschuhmann/improved-aesthetic-predictor)
- LAION blog — [laion.ai/blog/laion-aesthetics](https://laion.ai/blog/laion-aesthetics)

### Ecosystem notes

- ImageReward benchmark is heavily referenced in Flux, SD3, Kolors and other 2024+ T2I reports.
- PickScore remains the de-facto best-of-N ranker in open-source Flux/SDXL pipelines as of early 2026; HPSv3 is beginning to supplant it where latency allows.
- LAION-Aesthetic is still embedded as the default aesthetic filter in many ComfyUI / diffusers workflows — be intentional about disabling it for logo / icon work.
