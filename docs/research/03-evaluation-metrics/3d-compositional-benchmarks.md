---
category: 03-evaluation-metrics
angle: 3d
title: "Compositional Benchmarks for Text-to-Image (and -Video) Generation"
subtitle: "T2I-CompBench/++, GenEval (+ GenEval 2), DPG-Bench, EvalCrafter, HEIM, ConceptMix, Gecko — what each measures and where the leaderboards stand in 2025–2026"
status: draft
last_updated: 2026-04-19
tags:
  - evaluation
  - compositional
  - benchmarks
  - attribute-binding
  - counting
  - spatial-reasoning
  - text-rendering
  - leaderboards
  - VQA-evaluation
  - benchmark-drift
primary_sources: 12
---

## TL;DR

If you want to *measure* whether a prompt-enhancement system actually improves image generation, the field has converged on a specific stack of compositional benchmarks rather than FID/CLIPScore. The practical trio for images is **GenEval** (object/count/color/position, the de-facto comparison metric in almost every 2024–2026 T2I paper), **T2I-CompBench++** (attribute binding + 2D/3D spatial + numeracy + complex compositions, 8K prompts), and **DPG-Bench** (1K dense, long prompts from ELLA). **HEIM** (Stanford CRFM) is the umbrella "holistic" leaderboard that bundles alignment, reasoning, robustness, bias, toxicity, efficiency. **ConceptMix** and **Gecko** are the 2024 second-generation benchmarks that attack the *discriminative-power* problem directly: ConceptMix by dialing difficulty with a `k`-tuple of concepts, Gecko by skill decomposition + QA metric. **EvalCrafter** is the video-generation analogue. As of late 2025, multiple authors (most prominently the **GenEval 2** paper, Dec 2025) show that GenEval is saturated and drifts up to **17.7% above human judgment** on current SOTA — a prompt-to-asset should report on at least two benchmarks, ideally one "hard" (ConceptMix k≥4, DPG-Bench Hard, T2I-CompBench complex) and one human-correlated (Gecko QA or GenEval 2 Soft-TIFA).

## What each benchmark measures

### T2I-CompBench / T2I-CompBench++ (NeurIPS 2023 → TPAMI 2025)

**Scope:** 8,000 compositional prompts split into **four top-level categories** and **eight sub-categories** — the most "everything-under-one-roof" compositional suite.[^compbench-arxiv][^compbench-github]

- **Attribute binding:** color, shape, texture (does the *correct* attribute attach to the *correct* noun?).
- **Object relationships:** 2D spatial ("to the left of"), **3D-spatial** ("behind", "in front of"), non-spatial relations.
- **Generative numeracy:** object counting.
- **Complex compositions:** multi-clause prompts combining all of the above.

**Scoring mechanics** (the part many secondary write-ups miss):
- Attribute binding → **BLIP-VQA** score per noun-phrase.
- 2D spatial → **UniDet**-based detection heuristic.
- 3D-spatial + numeracy → new **depth-aware detection** metric introduced in CompBench++ (CompBench v1 only covered 2D).
- Non-spatial + complex → **3-in-1** score plus optional **MLLM (GPT-4V / ShareGPT4V)** grading in v++.[^compbench-arxiv]

The `++` bump (accepted to IEEE TPAMI Jan 2025, v3 on arXiv Mar 2025) is important because v1 missed 3D-spatial/numeracy and relied only on BLIP-VQA, which is easy to overfit; v++ evaluates **11 SOTA models** including FLUX.1, SD3, DALL·E 3, PixArt-α, SDXL.[^compbench-arxiv] Industry adoption is unusually deep: DALL·E 3 (Oct 2023), PixArt-α (Sep 2023), and SD 3 (Mar 2024) all report on T2I-CompBench in their official technical reports.[^compbench-github]

### GenEval (NeurIPS 2023) — the default head-to-head metric

**Scope:** 553 short, tightly-templated prompts over **6 tasks** — single object, two objects, counting, colors, position, attribute binding.[^geneval-arxiv][^geneval-github]

**Scoring mechanics:** each prompt is graded by running **Mask2Former object detection** plus a small **CLIP color-classifier** over the generated image, producing a deterministic 0/1 verdict per skill. This is why GenEval became the default benchmark in T2I papers from 2024 onwards — it's cheap, reproducible, and a single scalar per model.[^geneval-arxiv]

**Why it's everywhere:** the overall GenEval score is now the standard x-axis in every new T2I paper's comparison table (SD3, FLUX, PixArt-Σ, Playground v3, Infinity, etc.). See the public leaderboard for the long tail.[^wizwand-geneval]

**Why you shouldn't trust it alone (2025):** the **GenEval 2** paper (arXiv 2512.16853, Dec 18 2025) shows the original benchmark is saturated and has *drifted* away from human judgment by up to **17.7% absolute error**; e.g., Gemini 2.5 scores 75.4% on GenEval but 93.1% under human raters.[^geneval2-arxiv] GenEval 2 replaces the object-detector judge with **Soft-TIFA** (aggregated per-primitive VQA) and expands to **800 prompts × 40 objects × 18 attributes × 9 relations**. Practical consequence: anyone optimizing a prompt-to-asset on GenEval-only in 2026 is optimizing a saturated metric.

### DPG-Bench (ELLA, CVPR 2024)

**Scope:** 1,065 **dense prompts** averaging ~80 tokens, designed to stress-test models on *long* prompts with multiple entities, detailed attributes, and complex relationships.[^ella-arxiv][^ella-github] Built from PartiPrompts nuclei but expanded via LLM paraphrase.

**What it specifically measures:** 5-6 axes inherited from the ELLA design — **Global** (overall scene plausibility), **Entity** (all named entities present), **Attribute**, **Relation**, **Other** (style/mood), with some write-ups adding **Position**, **Count**, and **Text accuracy** (rendering). Scoring is a **mPLUG-Owl/LLaVA VQA** pipeline: the LLM judge answers auto-generated questions over the image and the score is the pass rate.[^ella-github]

**Leaderboard:** Playground v3 posted **88.62** on DPG-Bench Hard in Sep 2024 (vs Ideogram 2.0 80.12, Flux Pro 78.69, Midjourney v6.0 64.63),[^playground-v3] and the current public tracker now lists X-Omni, SD 3.5-ft-10k + MixFlow, Show-o2, and FLUX.1 [Dev] clustered in the 86–87 band, with a leaderboard average of ~87.7.[^wizwand-dpg] The gap at the top has compressed to a point or two — another saturation signal.

### EvalCrafter (CVPR 2024) — the T2V counterpart

Not strictly a T2I benchmark, but worth mentioning because text-to-video prompt-enhancement often has to fall back here. **700 prompts** built from real user queries + LLM augmentation, scored on **17 objective metrics** across visual quality, content quality, motion quality, and text-video alignment, with per-metric coefficients fit to ~8.6K human ratings.[^evalcrafter-arxiv][^evalcrafter-site] A companion dataset (ECTV) of ~10K generated videos ships for downstream research, and a HuggingFace leaderboard ranks modern T2V systems.

### HEIM (NeurIPS 2023, Stanford CRFM) — "holistic"

**Scope:** **62 scenarios × 12 aspects × 26 models**. The 12 aspects: alignment, quality, aesthetics, originality, reasoning, knowledge, bias, toxicity, fairness, robustness, multilinguality, efficiency.[^heim-docs][^heim-paper] The main point of HEIM is *not* to be the sharpest compositional benchmark — CompBench/GenEval do that better — but to force practitioners to look at **alignment + bias + toxicity + multilinguality + cost** in one table. The published finding is that **no single model wins across all aspects**, which is exactly the kind of evidence a prompt-to-asset needs when arguing that choice-of-enhancer matters per-model.

### ConceptMix (NeurIPS 2024) — difficulty dial

**Scope:** procedurally generated prompts. Pick an object; randomly sample **k** visual concepts from {colors, shapes, spatial relationships, numbers, style, texture, size}; ask **GPT-4o** to write the prompt; evaluate by asking a strong **VLM** (GPT-4V / Gemini 1.5) **one question per concept**, and scoring the fraction of concepts correctly realized.[^conceptmix-arxiv][^conceptmix-site]

**Why this design matters for prompt-to-asset work:** difficulty is a *hyperparameter* (`k`), so you can measure improvement at the level of complexity where a target model actually breaks. The published leaderboard on `k=1..7` is the clearest "compositional cliff" documented in the literature:

| k | DALL·E 3 | Playground v2.5 | IF-XL | SDXL | PixArt-α | SDXL Turbo | SD 1.4 |
|---|----------|------------------|-------|------|----------|------------|--------|
| 1 | 0.83 | 0.70 | 0.68 | 0.69 | 0.66 | 0.64 | 0.52 |
| 3 | 0.50 | 0.22 | 0.21 | 0.18 | 0.17 | 0.18 | 0.08 |
| 5 | 0.17 | 0.07 | 0.05 | 0.05 | 0.05 | 0.03 | 0.01 |
| 7 | 0.08 | 0.00 | 0.01 | 0.00 | 0.01 | 0.01 | 0.00 |

Source: ConceptMix official leaderboard.[^conceptmix-site] Reading it: even DALL·E 3 loses **~90% of its compositional accuracy** between k=1 and k=7, and every open model collapses to ~0 by k=6. This is the single strongest argument in the literature for *why* prompt rewriting is necessary for complex asset prompts.

### Gecko / Gecko2K (Google DeepMind, ICLR 2025)

**Scope:** skills-based benchmark — prompts are tagged with **sub-skills** (spatial understanding, action recognition, text rendering, counting, style, etc.), each at multiple complexity levels, so you can say "model X handles spatial L1 but breaks at L3".[^gecko-arxiv][^gecko-github]

**Two contributions that matter beyond the prompt set:**
1. **>100K human annotations** across **four templates × four models** — the largest reliability-measured human rating set published for T2I, so Gecko can tell you whether a disagreement between metrics is noise in the prompts themselves or real model behavior.
2. A new **QA-based auto-eval metric** that out-correlates TIFA, VQAScore, and CLIPScore on both Gecko2K and the older TIFA160 set.[^gecko-arxiv]

Think of Gecko as the "most human-correlated" of the 2024 wave, and the complement to ConceptMix's "most controllably-difficult."

## Cross-benchmark coverage map

| Benchmark | Attr. binding | Counting | 2D spatial | 3D spatial | Text rendering | Dense/long prompts | Controllable difficulty | Human-calibrated judge |
|-----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| GenEval | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | weak (detector-based) |
| GenEval 2 | ✓ | ✓ | ✓ (6 preps) | partial | ✗ | partial | ✗ | Soft-TIFA ✓ |
| T2I-CompBench++ | ✓ (color/shape/texture) | ✓ | ✓ | ✓ | ✗ | partial (complex) | ✗ | GPT-4V optional |
| DPG-Bench | ✓ | ✓ | ✓ | partial | partial | ✓ (core design) | ✗ | VQA judge |
| ConceptMix | ✓ | ✓ | ✓ | ✗ | ✗ | partial | ✓ (k=1..7) | VLM + human study |
| Gecko2K | ✓ | ✓ | ✓ | ✓ | ✓ (explicit) | ✓ | partial (skill levels) | ✓ (100K ratings) |
| HEIM | ✓ (1 of 12 aspects) | ✗ | ✗ | ✗ | partial | ✗ | ✗ | blended |
| EvalCrafter (T2V) | ✓ | partial | partial | ✗ | ✗ | ✓ | ✗ | ✓ (8.6K ratings) |

Practical takeaway for a prompt-to-asset evaluation suite: **GenEval 2 + T2I-CompBench++ + ConceptMix(k=3,5)** covers the obvious axes; add **Gecko** if text rendering or human correlation matters; add **HEIM** if you need to report bias/toxicity/efficiency to stakeholders.

## 2025–2026 leaderboard snapshots

These numbers change weekly; treat the *ordering* as more stable than the absolute values.

**GenEval (overall score, higher=better).** Public tracker, updated ~4 days ago at the time of writing (Apr 2026): the leaderboard has been pushed up into the 0.85–0.90 band by RL-finetuned models (UniGRPO at 0.90, several "Thinking=true" AR variants at 0.87–0.88), with FLUX.1 [Dev] near 0.70 out-of-the-box and SD 3.5-Medium + RL-with-Qwen3 in the 0.84 band.[^wizwand-geneval] The top cluster is within 3 points of each other — read as *saturated* given the GenEval-2 drift finding.

**DPG-Bench (average score, higher=better).** Current top-10 are 86–89, clustered; Playground v3 (the original SOTA holder at 88.62 on DPG-Bench Hard in 2024) has been joined by Nucleus-Image, SD 3.5-ft-10k + MixFlow, X-Omni, Show-o2, and FLUX.1 [Dev]; leaderboard average ≈ 87.65.[^wizwand-dpg][^playground-v3]

**T2I-CompBench++.** Recent VAR (Visual Autoregressive) work shows **Infinity-8B** beating SDXL, PixArt-α, and even Flux-Dev/Flux-Schnell on attribute binding and spatial relations — a meaningful prior-art signal that architecture class matters more than parameter count on this benchmark.[^compbench-recent]

**ConceptMix.** Leaderboard still dominated by DALL·E 3 for k≥3 (reported above).[^conceptmix-site] No 2025 update with FLUX / SD3 has been published as of April 2026 — if you run a ConceptMix evaluation on FLUX/SD3/Gemini 2.5, that is a publishable data point.

## Notable gotchas for prompt-to-asset work

1. **Never optimize a prompt rewrite loop against a single benchmark.** GenEval's drift is the canonical example — Gemini 2.5 looks 17.7 pp worse than it is on GenEval.[^geneval2-arxiv] The same is almost certainly true for the older T2I-CompBench v1 metrics.
2. **Judge-model leakage.** Both DPG-Bench and ConceptMix use VLMs to grade images; enhancers that add VLM-pleasing boilerplate (e.g., "a high-quality photograph of …") can lift scores without actually improving generation. CompBench++'s optional GPT-4V path has the same issue. Gecko partly dodges this by correlating against 100K human ratings.[^gecko-arxiv]
3. **Long prompts ≠ dense prompts.** DPG-Bench prompts are dense (many entities, relations) but still ~80 tokens; an enhancer that balloons prompts to 300 tokens for aesthetic keywords will not improve DPG-Bench and will often regress on GenEval.
4. **Text rendering is under-covered.** Only Gecko explicitly isolates text-rendering as a skill; if your product focuses on logos/favicons, DPG-Bench's text axis + Gecko are the only real measurements — most other benchmarks will score a beautiful-looking logo with gibberish text as correct.
5. **Counting is hard to grade.** All detector-based benchmarks (GenEval, CompBench) undercount occluded instances and miscount clusters. Gecko's per-question VQA judge is the most trustworthy for counting.
6. **Report per-skill, not just overall.** The top ~10 models on any of these benchmarks are now within noise of each other on the overall score; the interesting comparisons (and the ones a prompt-to-asset can actually move) live in the sub-skill breakdowns — attribute binding for CompBench, counting for GenEval, "relation" for DPG-Bench.

## Recommended minimal eval for a prompt-to-asset

If you only run one eval: **GenEval 2 (Soft-TIFA)**, since it is the explicit fix to the benchmark-drift problem and has the strongest 2026 human correlation claim.[^geneval2-arxiv]

If you can run two: add **ConceptMix at k=3 and k=5**, because it is the only benchmark where you can detect *whether the enhancer helps more as the prompt gets harder*, which is the entire premise of a prompt-enhancement product.[^conceptmix-arxiv]

If you want a third: **Gecko2K** on the skills relevant to your asset type (text rendering for logos/favicons; spatial + counting for UI illustrations).[^gecko-arxiv]

Report T2I-CompBench++ and DPG-Bench as *secondary* context — they are still the dominant benchmarks in 2025–2026 model release papers, so your numbers need to be comparable to those tables even if you do not treat them as the source of truth.

## Sources

[^compbench-arxiv]: Huang et al., *T2I-CompBench++: An Enhanced and Comprehensive Benchmark for Compositional Text-to-image Generation*, arXiv:2307.06350 v3 (Mar 2025), TPAMI Jan 2025. https://arxiv.org/abs/2307.06350

[^compbench-github]: Karine-Huang/T2I-CompBench, official repo, 337★ as of Apr 2026. https://github.com/Karine-Huang/T2I-CompBench

[^compbench-recent]: Recent VAR comparison using T2I-CompBench++ showing Infinity-8B > Flux-Dev/Schnell > SDXL/PixArt-α on attribute binding and spatial. Referenced in arXiv:2505.24086.

[^geneval-arxiv]: Ghosh, Hajishirzi, Schmidt, *GenEval: An Object-Focused Framework for Evaluating Text-to-Image Alignment*, NeurIPS 2023. https://arxiv.org/abs/2310.11513

[^geneval-github]: djghosh13/geneval, official benchmark code. https://github.com/djghosh13/geneval

[^geneval2-arxiv]: Kamath et al., *GenEval 2: Addressing Benchmark Drift in Text-to-Image Evaluation*, arXiv:2512.16853 (Dec 2025). https://arxiv.org/abs/2512.16853

[^ella-arxiv]: Hu et al., *ELLA: Equip Diffusion Models with LLM for Enhanced Semantic Alignment*, arXiv:2403.05135 (Mar 2024) — introduces DPG-Bench. https://arxiv.org/abs/2403.05135

[^ella-github]: TencentQQGYLab/ELLA, DPG-Bench prompts + evaluator. https://github.com/TencentQQGYLab/ELLA/tree/main/dpg_bench

[^evalcrafter-arxiv]: Liu et al., *EvalCrafter: Benchmarking and Evaluating Large Video Generation Models*, CVPR 2024 / arXiv:2310.11440. https://arxiv.org/abs/2310.11440

[^evalcrafter-site]: EvalCrafter project site + ECTV dataset + HF leaderboard. https://evalcrafter.github.io/

[^heim-paper]: Lee et al., *Holistic Evaluation of Text-to-Image Models*, NeurIPS 2023, arXiv:2311.04287. https://arxiv.org/abs/2311.04287

[^heim-docs]: Stanford CRFM, HEIM documentation + v1.1.0 leaderboard. https://crfm.stanford.edu/helm/heim/latest/ and https://github.com/stanford-crfm/helm/blob/main/docs/heim.md

[^conceptmix-arxiv]: Wu, Yu, Huang, Russakovsky, Arora, *ConceptMix: A Compositional Image Generation Benchmark with Controllable Difficulty*, NeurIPS 2024, arXiv:2408.14339. https://arxiv.org/abs/2408.14339

[^conceptmix-site]: ConceptMix project page with official k=1..7 leaderboard. https://princetonvisualai.github.io/conceptmix/

[^gecko-arxiv]: Wiles et al. (Google DeepMind), *Revisiting Text-to-Image Evaluation with Gecko: On Metrics, Prompts, and Human Ratings*, arXiv:2404.16820 v4 (Mar 2025). https://arxiv.org/abs/2404.16820

[^gecko-github]: google-deepmind/gecko_benchmark_t2i, Apache-2.0. https://github.com/google-deepmind/gecko_benchmark_t2i

[^playground-v3]: Liu et al., *Playground v3: Improving Text-to-Image Alignment with Deep-Fusion Large Language Models*, arXiv:2409.10695 — source of the DPG-Bench Hard 88.62 / Ideogram 80.12 / Flux Pro 78.69 / Midjourney 64.63 comparison. https://arxiv.org/abs/2409.10695

[^wizwand-geneval]: Wizwand SOTA tracker, *Text-to-Image Generation on GenEval*, updated Apr 2026. https://www.wizwand.com/sota/text-to-image-generation-on-geneval-geneval-metric

[^wizwand-dpg]: Wizwand SOTA tracker, *Text-to-Image Generation on DPG-Bench*, updated Apr 2026. https://www.wizwand.com/sota/text-to-image-generation-on-dpg-bench
