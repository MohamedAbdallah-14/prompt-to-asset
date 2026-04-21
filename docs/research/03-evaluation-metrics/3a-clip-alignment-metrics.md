---
category: 03-evaluation-metrics
angle: 3a
title: "CLIPScore, BLIP, VQAScore, TIFA, DSG — Vision-Language Alignment Metrics for T2I"
status: draft
last_updated: 2026-04-19
primary_topic: "Automated metrics that measure whether a generated image matches its text prompt"
tags:
  - clipscore
  - vqascore
  - tifa
  - dsg
  - blip-2
  - siglip
  - llm-as-judge
  - torchmetrics
  - hf-evaluate
  - t2i-alignment
---

# CLIPScore, BLIP, VQAScore, TIFA, DSG — Vision-Language Alignment Metrics for T2I

**Research value: high** — the space is well-covered by primary papers (EMNLP / ICCV / ICLR / ECCV / NeurIPS 2021–2025), there are named, strongly differentiated families of metrics, and every metric has a reference implementation. For a prompt-to-asset that needs to score "did the image match the prompt?" we have concrete, citable off-the-shelf options ranging from fast embedding similarity (CLIPScore) to compositional QA-based scoring (VQAScore / TIFA / DSG) to open-ended MLLM judges (VIEScore, MLLM-as-a-Judge).

## TL;DR for the prompt-to-asset

- **Cheap sanity check / batch re-ranking:** `CLIPScore` (and now `SigLIP 2`) via `torchmetrics.multimodal.CLIPScore`. Fast, ~ms per image, correlates with humans on *simple* prompts but is a bag-of-words on compositional prompts. Good for pre-filter, bad as the final gate.
- **Compositional prompts (most logo/asset prompts are compositional):** prefer **VQAScore** (2024, ECCV) or **TIFA** (2023, ICCV) / **DSG** (2024, ICLR). These ask a VQA/LLM model yes-no questions derived from the prompt and have 2–3× better human agreement than CLIPScore on GenAI-Bench.
- **Final-mile judging for shipped assets:** **VIEScore** or a **GPT-4V / Gemini / Claude 3.5 "MLLM-as-a-Judge"** pass with a structured rubric (semantic consistency + perceptual quality + brand constraints). Slow and expensive but explainable.
- **Preference proxies (not the same thing as alignment):** `PickScore`, `HPSv2`, `ImageReward`. Use these for ranking, not for faithfulness.

---

## 1. CLIPScore and its descendants (embedding-similarity family)

### CLIPScore (Hessel et al., 2021)

Introduced at EMNLP 2021 by Hessel, Holtzman, Forbes, Bras, and Choi. The metric is startlingly simple:

\[
\text{CLIPScore}(I, C) = \max\!\bigl(100 \cdot \cos(E_I, E_C),\ 0\bigr)
\]

where \(E_I\) is the CLIP visual embedding and \(E_C\) is the CLIP text embedding. It is **reference-free** — no ground-truth caption needed — and originally outperformed reference-based metrics like CIDEr and SPICE on image-captioning human-judgment correlation. A `RefCLIPScore` variant optionally blends in reference captions ([Hessel 2021, arXiv:2104.08718](https://arxiv.org/abs/2104.08718); [ACL Anthology](https://aclanthology.org/2021.emnlp-main.595/); [jmhessel/clipscore](https://github.com/jmhessel/clipscore)).

**What the paper itself warns about** (and still under-acknowledged in practice):

- Strong on *literal description* (clip-art, alt-text), weaker where "richer contextual knowledge" is needed (e.g. news captions).
- The score is **unscaled** — the `100×` multiplier is cosmetic. Absolute values are not comparable across CLIP backbones.

### The "bag of words" problem

The *fatal* failure mode for our use case is the one described by Lin et al. (2024) and many others: CLIP's text encoder behaves close to a bag-of-words, so `"the horse is eating the grass"` and `"the grass is eating the horse"` get near-identical embeddings. This breaks compositional prompts that involve attribute binding ("red cube left of blue sphere"), counting, negation, and spatial relations — exactly the kinds of prompts an app-icon / logo / illustration enhancer produces ([Lin 2024, arXiv:2404.01291](https://arxiv.org/abs/2404.01291); original bag-of-words diagnosis in [Yuksekgonul 2023, arXiv:2210.01936](https://arxiv.org/abs/2210.01936)).

Practical corollaries:

- A CLIPScore of 32 on a compositional prompt may be *higher* than the correct image of the same prompt at 31. CLIPScore cannot reliably rank within the top decile.
- Default CLIP truncates to **77 tokens**. [torchmetrics issue #2883](https://github.com/Lightning-AI/torchmetrics/issues/2883) documents that captions > 77 tokens silently yield artificially low (~16–26) scores due to truncation bugs. For long SDXL/Flux prompts, use `LongCLIP` (248 tokens, supported in torchmetrics 1.9+) or run `SigLIP 2`.

### Evolutionary fixes

- **LongCLIP** (`zer0int/LongCLIP-L-Diffusers`) — raises context to 248 tokens, now a first-class option in `torchmetrics.multimodal.CLIPScore`.
- **SigLIP 2** (Tschannen et al., 2025) — Google's successor to CLIP/SigLIP, trained with captioning loss + self-distillation + online data curation. Beats SigLIP across every scale on zero-shot and retrieval; exposes four ViT scales (B/86M, L/303M, So400m/400M, g/1B). For alignment scoring, SigLIP 2 is the current best "one-shot similarity" backbone ([arXiv:2502.14786](https://arxiv.org/abs/2502.14786); [big_vision README](https://github.com/google-research/big_vision/blob/main/big_vision/configs/proj/image_text/README_siglip2.md)).
- **CLIC / compositional fine-tunes** — ongoing work to *teach* CLIP compositionality via contrastive fine-tuning on hard negatives; not yet a drop-in metric but worth watching ([arXiv:2505.24424](https://arxiv.org/abs/2505.24424)).

### BLIP / BLIP-2 "ITM" score

A parallel embedding-family option: BLIP-2's Image-Text Matching head ([Li et al., ICML 2023, arXiv:2301.12597](https://arxiv.org/abs/2301.12597)). BLIP-2 bridges a frozen image encoder and a frozen LLM via the Querying Transformer (Q-Former), and its ITM head produces a binary "matches / doesn't match" probability that is a strict improvement over CLIP cosine similarity on retrieval and VQA. In practice:

- Use `blip2-itm-vit-g` for alignment scoring; it trades CLIPScore's cheap cosine for a richer cross-attention match probability.
- BLIP-2's VQA mode is also the simplest way to *feed* downstream QA-based metrics like TIFA and VQAScore.

---

## 2. QA-based alignment metrics (the step-change for compositional prompts)

These metrics all share the same skeleton: **decompose the prompt into questions, answer them by looking at the image, aggregate.** They are dramatically better than CLIPScore on compositional prompts and, critically, *explainable* — you get per-question pass/fail, which is exactly what a prompt-to-asset loop needs.

### TIFA (Hu et al., ICCV 2023)

"TIFA: Accurate and Interpretable Text-to-Image Faithfulness Evaluation with Question Answering" ([arXiv:2303.11897](https://arxiv.org/abs/2303.11897); [project page](https://tifa-benchmark.github.io/); [Yushi-Hu/tifa](https://github.com/Yushi-Hu/tifa)).

Two-stage:

1. **Question generation**: given the prompt, an LLM (originally GPT-3, now also a released fine-tuned Llama-2) generates QA pairs covering objects, counts, colors, spatial relations, materials, etc.
2. **VQA answering**: a VQA model (mPLUG, BLIP-2, etc.) answers each question against the generated image. The score = fraction correct.

Benchmark: **TIFA v1.0** = 4,000 text inputs × 25,000 questions across 12 categories. Pre-generated questions ship with the repo, so no OpenAI key needed for the benchmark itself. Main empirical result: TIFA correlates with humans **better than CLIPScore and SPICE**, and its per-category breakdown revealed that T2I models were strong on color/material but weak on counting and spatial relations — a finding that still holds in 2026.

### DSG — Davidsonian Scene Graph (Cho et al., ICLR 2024)

TIFA's weak spot: questions can be redundant, overlap, or be logically inconsistent ("Is there a motorcycle? No. What color is the motorcycle? Blue."). DSG fixes this by organizing questions into a **dependency graph** inspired by Davidsonian semantics, where atomic and unique questions have explicit parent-child dependencies, and child questions are skipped if the parent is answered "no" ([arXiv:2310.18235](https://arxiv.org/abs/2310.18235); [google.github.io/dsg](https://google.github.io/dsg/); [j-min/DSG](https://github.com/j-min/DSG)).

Why this matters for a prompt-to-asset:

- DSG produces **consistent** per-prompt scores, enabling reliable A/B comparison between two candidate enhanced prompts.
- The accompanying **DSG-1k** benchmark (1,060 prompts, balanced across fine-grained semantic categories) is the right test set if we want to claim "our enhancer improves faithfulness."
- The framework is modular: swap the LLM (for question generation), the VQA model (for answering), or the T2I model independently.

### VQAScore (Lin et al., ECCV 2024) — the current default pick

The most minimal QA-based metric: instead of generating many questions, ask *one* question — `"Does this figure show \"{prompt}\"? Please answer yes or no."` — and use the VQA model's probability of "Yes" as the score ([project page](https://linzhiqiu.github.io/papers/vqascore/); [arXiv:2404.01291](https://arxiv.org/abs/2404.01291)).

Key result: with their fine-tuned **CLIP-FlanT5** VQA model (a bidirectional image-question encoder where visual embeddings are conditioned on the question), VQAScore **outperforms CLIPScore, PickScore, and ImageReward** on compositional prompts, and is 2–3× more effective as a reward signal for re-ranking T2I outputs. It can correctly distinguish `"the moon is over the cow"` from `"the cow is over the moon"` — something CLIPScore cannot do.

Operationally VQAScore is attractive because:

- One forward pass per (image, prompt) pair — no LLM question-generation stage.
- Works with any VQA model (LLaVA, CLIP-FlanT5, BLIP-2, GPT-4V) — you pick the cost/quality trade-off.
- The accompanying **GenAI-Bench** (1,600 designer-authored compositional prompts + ~80k human ratings over DALL-E 3, SD, Midjourney v6, Pika, Gen2) is now the de-facto benchmark for compositional T2I alignment ([arXiv:2406.13743](https://arxiv.org/abs/2406.13743); [project page](https://linzhiqiu.github.io/papers/genai_bench/)).

> **Updated 2026-04-21:** VQAScore has become the de-facto industry evaluation standard for compositional T2I alignment. As of 2025, GenAI-Bench has been adopted by **Google DeepMind (Imagen 3 & Imagen 4)**, **ByteDance Seed**, **NVIDIA**, and others as a primary benchmark. The `t2v_metrics` repo now extends VQAScore to video with support for 20+ video-language models. A localized variant, **L-VQAScore** ([github.com/intelligolabs/L-VQAScore](https://github.com/intelligolabs/L-VQAScore)), combines visual localization with VQA probing for compositional attribute evaluation and improves correlation with human judgment on challenging fashion/attribute-binding scenarios. A VQQA agentic framework using Gemini-3-Pro shows further gains (+4.76%) on T2V-CompBench, confirming continued active iteration on this approach.

---

## 3. LLM-as-judge / MLLM-as-a-judge (rubric-based, explainable, slow)

When we need *logo-specific* or *brand-specific* judgments ("is the background transparent?", "is there no embedded text?", "is it flat-vector style, not photorealistic?"), QA metrics based on small VQA models often aren't enough. The current answer is **MLLM-as-a-Judge**: feed the image + a structured rubric to a frontier multimodal model and parse its response.

### VIEScore (Ku et al., ACL 2024)

"VIEScore: Towards Explainable Metrics for Conditional Image Synthesis Evaluation" ([arXiv:2312.14867](https://arxiv.org/abs/2312.14867); [TIGER-AI-Lab/VIEScore](https://github.com/TIGER-AI-Lab/VIEScore)).

Decomposes evaluation into three axes that map almost directly to what a prompt-to-asset cares about:

1. **Semantic Consistency (SC)** — does the image follow the prompt?
2. **Perceptual Quality (PQ)** — is it visually clean, artifact-free?
3. **Overall (O)** — harmonic-ish combination.

Asks an MLLM (GPT-4V, GPT-4o, Gemini, LLaVA) for both a numeric score *and* a natural-language rationale. Reports **Spearman ρ ≈ 0.4 with humans using GPT-4o**, versus ~0.45 human-to-human — near the ceiling. Open-source MLLMs lag substantially, which is the main practical caveat.

### MLLM-as-a-Judge benchmark (Chen et al., ICML 2024)

"MLLM-as-a-Judge: Assessing Multimodal LLM-as-a-Judge with Vision-Language Benchmark" ([arXiv:2402.04788](https://arxiv.org/abs/2402.04788); [mllm-judge.github.io](https://mllm-judge.github.io/)). 3,300 image-instruction pairs over three judging tasks: scoring, pairwise comparison, batch ranking. Headline findings to internalize:

- **Pair-wise comparison aligns well with humans**; scoring and batch ranking do not.
- Even GPT-4V exhibits position bias, verbosity bias, and hallucination as a judge.
- Practical prescription: prefer **pairwise A-vs-B judgments** over absolute scores whenever you can.

### Practical pattern for the prompt-to-asset

A layered pipeline that seems to be the 2025–2026 consensus:

1. **Fast pre-filter**: SigLIP 2 / CLIPScore on a batch of N candidate images → drop obvious misses.
2. **Compositional scoring**: VQAScore or DSG on the top-K → rank by compositional faithfulness.
3. **Brand / hard-constraint judging**: pairwise MLLM-as-judge (Gemini 2.5 / GPT-4o / Claude 3.5) against a user-specified rubric, especially for transparency, text-on-image, brand-style constraints.

---

## 4. Human-preference proxies (not alignment, but often confused with it)

These are CLIP or ViT models **fine-tuned on human A/B preference data** for T2I outputs. They score general "goodness," dominated by aesthetics + alignment + coherence, but they are **not** faithfulness metrics. Use them for reward modeling / re-ranking, not for "did the prompt land."

- **PickScore** — trained on **Pick-a-Pic** (CLIP-ViT-H/14 backbone). [yuvalkirstain/PickScore](https://github.com/yuvalkirstain/PickScore); paper: Kirstain et al. 2023, "Pick-a-Pic: An Open Dataset of User Preferences for Text-to-Image Generation" ([arXiv:2305.01569](https://arxiv.org/abs/2305.01569)).
- **HPSv2 / HPS v2.1** — Wu et al. 2023, trained on HPD v2 (≈ 798k human choices across 430k pairs, 4 style categories: Animation, Concept-art, Painting, Photo). [arXiv:2306.09341](https://arxiv.org/abs/2306.09341); [tgxs002/HPSv2](https://github.com/tgxs002/HPSv2). v2.1 released Sep 2024.
- **ImageReward** — Xu et al. NeurIPS 2023 ([arXiv:2304.05977](https://arxiv.org/abs/2304.05977)); the first widely used T2I reward model, usable both for ranking and for RLHF-style fine-tuning.

Don't use these alone as the truth signal for compositional correctness — Lin 2024 directly shows VQAScore beats PickScore and ImageReward on compositional prompts by 2–3×.

---

## 5. Benchmarks worth targeting

If we want to **claim** our enhancer improves alignment, run against these:

- **T2I-CompBench++** (Huang et al., TPAMI 2025) — 8,000 compositional prompts across attribute binding, object relationships, generative numeracy, complex compositions, 3D-spatial, numeracy. Already adopted by DALL-E 3, SD3, PixArt-α papers. [arXiv:2307.06350](https://arxiv.org/abs/2307.06350); [Karine-Huang/T2I-CompBench](https://github.com/Karine-Huang/T2I-CompBench).
- **GenAI-Bench** (Li et al., 2024) — 1,600 designer-sourced prompts + ~80k human ratings across 10 T2I/T2V models. The reference for compositional-reasoning skill categories. [arXiv:2406.13743](https://arxiv.org/abs/2406.13743).
- **DSG-1k** (Cho et al., ICLR 2024) — 1,060 prompts with pre-generated DSG questions. [arXiv:2310.18235](https://arxiv.org/abs/2310.18235).
- **TIFA v1.0** — 4,000 prompts / 25,000 pre-generated questions. [arXiv:2303.11897](https://arxiv.org/abs/2303.11897).
- **HEIM** (Lee et al., NeurIPS 2023) — 12-aspect holistic evaluation (alignment, quality, aesthetics, originality, reasoning, knowledge, bias, toxicity, fairness, robustness, multilinguality, efficiency). 62 scenarios × 26 models. Integrates with HELM via `pip install "crfm-helm[heim]"`. [crfm-helm heim docs](https://crfm-helm.readthedocs.io/en/latest/heim/); [arXiv:2311.04287](https://arxiv.org/abs/2311.04287).

For logo / icon / asset-type prompts specifically, **none of the above benchmarks covers our target distribution well.** The prompt-to-asset project should plan to stand up a small (~200 prompt) *internal* eval set over the actual asset categories (logos, app icons, favicons, illustrations, OG images) with DSG-style question generation per prompt. This is one of the clearest gaps in the public benchmark landscape.

---

## 6. Tooling — what to actually `pip install`

### `torchmetrics` — the default

```python
from torchmetrics.multimodal.clip_score import CLIPScore

metric = CLIPScore(model_name_or_path="openai/clip-vit-large-patch14")
score = metric(image_tensor, "a transparent app icon of a blue owl")
```

Supported backbones as of torchmetrics 1.9: `openai/clip-vit-{base-patch16,base-patch32,large-patch14,large-patch14-336}`, `jinaai/jina-clip-v2`, `zer0int/LongCLIP-L-Diffusers`, `zer0int/LongCLIP-GmP-ViT-L-14`. Also supports image-image and text-text similarity with the same call ([torchmetrics docs](https://torchmetrics.readthedocs.io/en/stable/multimodal/clip_score.html); [source](https://github.com/Lightning-AI/torchmetrics/blob/master/src/torchmetrics/multimodal/clip_score.py)).

Gotchas:

- Metric is **not scriptable** (no `torch.jit.script`).
- 77-token truncation bug for long captions with default CLIP — use `zer0int/LongCLIP-L-Diffusers` ([issue #2883](https://github.com/Lightning-AI/torchmetrics/issues/2883)).
- Expected value range on matched pairs is roughly 25–35 for OpenAI CLIP-L/14 (the "100×" in the formula is cosmetic; cosine similarities between real image/caption pairs usually sit ~0.25–0.35).

### `huggingface/evaluate`

The `evaluate` library ([docs](https://huggingface.co/docs/evaluate/v0.4.5/en/index); [repo](https://github.com/huggingface/evaluate)) hosts community metric Spaces (`evaluate.load("clip_score")`, etc.). Use with care: each metric Space is community-maintained and quality varies. HF itself has shifted more recent evaluation tooling toward **`lighteval`** ([github.com/huggingface/lighteval](https://github.com/huggingface/lighteval)), but for T2I alignment, `torchmetrics` + direct use of metric repos (TIFA, DSG, VIEScore) is the cleaner stack.

### Direct reference implementations

| Metric       | Repo                                                                 |
|--------------|----------------------------------------------------------------------|
| CLIPScore    | [`jmhessel/clipscore`](https://github.com/jmhessel/clipscore)        |
| TIFA         | [`Yushi-Hu/tifa`](https://github.com/Yushi-Hu/tifa)                  |
| DSG          | [`j-min/DSG`](https://github.com/j-min/DSG)                          |
| VQAScore     | [`linzhiqiu/CLIP-FlanT5`](https://github.com/linzhiqiu/CLIP-FlanT5)  |
| VIEScore     | [`TIGER-AI-Lab/VIEScore`](https://github.com/TIGER-AI-Lab/VIEScore)  |
| PickScore    | [`yuvalkirstain/PickScore`](https://github.com/yuvalkirstain/PickScore) |
| HPSv2        | [`tgxs002/HPSv2`](https://github.com/tgxs002/HPSv2)                  |
| T2I-CompBench| [`Karine-Huang/T2I-CompBench`](https://github.com/Karine-Huang/T2I-CompBench) |
| HEIM (HELM)  | [`stanford-crfm/helm`](https://github.com/stanford-crfm/helm)        |
| SigLIP 2     | [`google-research/big_vision`](https://github.com/google-research/big_vision) |

---

## 7. Recommendations for the prompt-to-asset

1. **Do not ship CLIPScore as the primary gate** for the prompt-to-asset's own quality loop. It is adequate for cheap pre-filtering and legacy comparability, but the bag-of-words failure mode fails exactly the prompts a *compositional* enhancer produces.
2. **Adopt VQAScore as the default alignment metric** (using LLaVA-1.5 or CLIP-FlanT5 for open-source, GPT-4o / Gemini 2.5 for maximum quality). It is a single forward pass, explainable at the prompt-rewording level, and has the best compositional correlation with humans as of ECCV 2024 / 2025 follow-ups.
3. **Use DSG for per-prompt *diagnostics*** when we need to tell a user *why* the image doesn't match ("spatial relation wrong," "wrong count," "missing object"). The dependency graph structure is what unlocks this.
4. **Reserve MLLM-as-a-judge (VIEScore-style) for brand / hard-constraint checks** that small VQA models can't reliably do — transparency, text rendering, vector-style adherence, negative-space correctness. Prefer pairwise comparisons over absolute scores (MLLM-as-a-Judge benchmark).
5. **Track human-preference models (PickScore, HPSv2, ImageReward) as a *secondary* "aesthetic / overall goodness" signal**, never as the faithfulness signal.
6. **Build a ~200-prompt internal eval** covering the asset categories in this project (logos, app icons, favicons, illustrations, OG/social, transparency cases) with DSG-style questions. This is the highest-leverage missing piece — no public benchmark targets our distribution.

---

## Sources

### Primary papers

1. Hessel et al., 2021. *CLIPScore: A Reference-free Evaluation Metric for Image Captioning.* EMNLP 2021. [arXiv:2104.08718](https://arxiv.org/abs/2104.08718); [ACL Anthology](https://aclanthology.org/2021.emnlp-main.595/).
2. Radford et al., 2021. *Learning Transferable Visual Models From Natural Language Supervision (CLIP).* [arXiv:2103.00020](https://arxiv.org/abs/2103.00020).
3. Li et al., 2023. *BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models.* ICML 2023. [arXiv:2301.12597](https://arxiv.org/abs/2301.12597); [HF docs](https://huggingface.co/docs/transformers/main/en/model_doc/blip-2).
4. Hu et al., 2023. *TIFA: Accurate and Interpretable Text-to-Image Faithfulness Evaluation with Question Answering.* ICCV 2023. [arXiv:2303.11897](https://arxiv.org/abs/2303.11897); [project](https://tifa-benchmark.github.io/).
5. Cho et al., 2024. *Davidsonian Scene Graph: Improving Reliability in Fine-grained Evaluation for Text-to-Image Generation.* ICLR 2024. [arXiv:2310.18235](https://arxiv.org/abs/2310.18235); [project](https://google.github.io/dsg/).
6. Lin et al., 2024. *Evaluating Text-to-Visual Generation with Image-to-Text Generation (VQAScore).* ECCV 2024. [arXiv:2404.01291](https://arxiv.org/abs/2404.01291); [project](https://linzhiqiu.github.io/papers/vqascore/).
7. Li et al., 2024. *GenAI-Bench: Evaluating and Improving Compositional Text-to-Visual Generation.* CVPRW 2024. [arXiv:2406.13743](https://arxiv.org/abs/2406.13743).
8. Ku et al., 2024. *VIEScore: Towards Explainable Metrics for Conditional Image Synthesis Evaluation.* ACL 2024. [arXiv:2312.14867](https://arxiv.org/abs/2312.14867).
9. Chen et al., 2024. *MLLM-as-a-Judge: Assessing Multimodal LLM-as-a-Judge with Vision-Language Benchmark.* ICML 2024. [arXiv:2402.04788](https://arxiv.org/abs/2402.04788); [project](https://mllm-judge.github.io/).
10. Lee et al., 2023. *Holistic Evaluation of Text-to-Image Models (HEIM).* NeurIPS 2023 Datasets & Benchmarks. [arXiv:2311.04287](https://arxiv.org/abs/2311.04287); [HELM HEIM docs](https://crfm-helm.readthedocs.io/en/latest/heim/).
11. Huang et al., 2025. *T2I-CompBench++: An Enhanced and Comprehensive Benchmark for Compositional Text-to-image Generation.* TPAMI 2025. [arXiv:2307.06350](https://arxiv.org/abs/2307.06350).
12. Kirstain et al., 2023. *Pick-a-Pic: An Open Dataset of User Preferences for Text-to-Image Generation.* [arXiv:2305.01569](https://arxiv.org/abs/2305.01569).
13. Wu et al., 2023. *Human Preference Score v2: A Solid Benchmark for Evaluating Human Preferences of Text-to-Image Synthesis.* [arXiv:2306.09341](https://arxiv.org/abs/2306.09341).
14. Xu et al., 2023. *ImageReward: Learning and Evaluating Human Preferences for Text-to-Image Generation.* NeurIPS 2023. [arXiv:2304.05977](https://arxiv.org/abs/2304.05977).
15. Tschannen et al., 2025. *SigLIP 2: Multilingual Vision-Language Encoders with Improved Semantic Understanding, Localization, and Dense Features.* [arXiv:2502.14786](https://arxiv.org/abs/2502.14786).
16. Yuksekgonul et al., 2023. *When and why vision-language models behave like bags-of-words, and what to do about it?* ICLR 2023. [arXiv:2210.01936](https://arxiv.org/abs/2210.01936).

### Tooling / reference implementations

- `torchmetrics.multimodal.CLIPScore` — [docs](https://torchmetrics.readthedocs.io/en/stable/multimodal/clip_score.html); [source](https://github.com/Lightning-AI/torchmetrics/blob/master/src/torchmetrics/multimodal/clip_score.py); [77-token truncation issue #2883](https://github.com/Lightning-AI/torchmetrics/issues/2883).
- `huggingface/evaluate` — [repo](https://github.com/huggingface/evaluate); [docs](https://huggingface.co/docs/evaluate/v0.4.5/en/index).
- Reference metric repos: [`jmhessel/clipscore`](https://github.com/jmhessel/clipscore), [`Yushi-Hu/tifa`](https://github.com/Yushi-Hu/tifa), [`j-min/DSG`](https://github.com/j-min/DSG), [`TIGER-AI-Lab/VIEScore`](https://github.com/TIGER-AI-Lab/VIEScore), [`yuvalkirstain/PickScore`](https://github.com/yuvalkirstain/PickScore), [`tgxs002/HPSv2`](https://github.com/tgxs002/HPSv2), [`Karine-Huang/T2I-CompBench`](https://github.com/Karine-Huang/T2I-CompBench).
