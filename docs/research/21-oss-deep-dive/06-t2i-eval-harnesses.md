---
wave: 1
role: niche-discovery
slug: 06-t2i-eval-harnesses
title: "OSS T2I evaluation harnesses for asset-correctness"
date: 2026-04-19
sources:
  - https://github.com/Karine-Huang/T2I-CompBench
  - https://arxiv.org/abs/2307.06350
  - https://github.com/djghosh13/geneval
  - https://arxiv.org/abs/2310.11513
  - https://arxiv.org/abs/2512.16853
  - https://github.com/Vchitect/VBench
  - https://vchitect.github.io/VBench-project
  - https://github.com/tgxs002/HPSv2
  - https://pypi.org/project/hpsv2/
  - https://github.com/MizzenAI/HPSv3
  - https://pypi.org/project/hpsv3/
  - https://github.com/yuvalkirstain/PickScore
  - https://arxiv.org/abs/2305.01569
  - https://github.com/THUDM/ImageReward
  - https://pypi.org/project/image-reward/
  - https://github.com/Kwai-Kolors/MPS
  - https://github.com/SalesforceAIResearch/DiffusionDPO
  - https://github.com/ZiyiZhang27/tdpo
  - https://github.com/jmhessel/clipscore
  - https://github.com/Lightning-AI/torchmetrics/blob/master/src/torchmetrics/multimodal/clip_score.py
  - https://github.com/beichenzbc/Long-CLIP
  - https://arxiv.org/abs/2502.14786
  - https://github.com/linzhiqiu/t2v_metrics
  - https://github.com/linzhiqiu/CLIP-FlanT5
  - https://github.com/pymatting/pymatting
  - https://github.com/withoutbg/alpha-matting-evaluation-benchmark
  - https://alphamatting.com/
  - https://arxiv.org/abs/2508.01098
  - https://github.com/confident-ai/deepeval
  - https://docs.confident-ai.com/docs/multimodal-metrics-image-editing
  - https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/
  - https://github.com/promptfoo/promptfoo/tree/main/examples/compare-claude-vs-gpt-image
  - https://microsoft.github.io/promptflow/reference/python-library-reference/promptflow-evals/promptflow.evals.evaluators.html
  - https://iconqa.github.io/
  - https://starvector.github.io/starvector/
tags: [evaluation, clipscore, hpsv2, pickscore, t2i-compbench, vbench]
---

# 06 — OSS T2I evaluation harnesses for asset-correctness

This note surveys the open-source evaluation harnesses that could plausibly feed a
`validate_asset` tool for the prompt-to-asset plugin. The central question is narrower
than "how do we evaluate T2I?" — the category index at
`docs/research/03-evaluation-metrics/INDEX.md` already answers that. The question here
is **which of the dozen-plus public harnesses are cheap enough, license-clean, and
asset-shaped enough to run inside a generation loop**, and which belong in an offline
regression suite instead.

## The landscape, by family

### Compositional prompt-set benchmarks

**T2I-CompBench / CompBench++** (`Karine-Huang/T2I-CompBench`, MIT). Attribute binding,
object relations, 3D-spatial, numeracy, complex compositions; adopted by DALL·E 3, SD3,
PixArt-α, FLUX.1 as the de-facto compositionality yardstick. Scoring stack: BLIP-VQA,
UniDet, CLIPScore, 3-in-1 MLLM (GPT-4V / ShareGPT4V). **Asset relevance:** *partial* —
attribute-binding and numeracy transfer to logo prompts ("two overlapping circles,
one red one blue") but the prompt set is natural-image heavy. **Cost:** ~5–15s per
image; offline-only.

**GenEval** (`djghosh13/geneval`, MIT, NeurIPS 2023). Counts, colors, positions,
co-occurrence via Mask2Former + CLIP attribute checks. **Asset relevance:** *partial* —
single-object match maps to favicon/app-icon, two-object/position maps to logo
lockups. **Cost:** ~1–3s on GPU. **GenEval 2** (Dec 2025, arXiv:2512.16853) swaps the
rule-based grader for Soft-TIFA VQA and fixes the ≤17.7pp drift from human judgment
that saturated v1 in 2025; the version a new product should integrate against.

**VBench / VBench-2** (`Vchitect/VBench`, Apache-2.0). Primarily a **video** benchmark;
several dimensions (subject consistency, aesthetic/imaging quality, color) are
single-frame and stealable piecewise. *Irrelevant* as a whole-benchmark harness for
T2I; pure-T2I alternatives exist for every dimension.

### Human-preference reward models

**HPSv2 / HPSv2.1** (`tgxs002/HPSv2`, Apache-2.0, `pip install hpsv2`). CLIP-H fine-tuned
on 798k preferences across Animation / Concept-art / Painting / Photo — no logo/icon
category, so absolute scores are OOD. Batched warm server runs ~100–300ms/image.
*Partial* — usable for best-of-N ranking, unreliable as absolute gate.

**HPSv3** (`MizzenAI/HPSv3`, MIT, ICCV 2025, `pip install hpsv3`). Qwen2-VL-based on
HPDv3 (1.08M pairs, 1.17M comparisons); covers SOTA + older generators + real-world
images. Ships **CoHP** iterative refinement. ~1–3s per image. Strictly better than HPSv2
as a ranker; still logo-OOD.

**PickScore** (`yuvalkirstain/PickScore`, MIT). CLIP-H on Pick-a-Pic's 500k–1M
preferences; 70% human agreement (vs 60% zero-shot CLIP-H). ~50–100ms GPU — cheapest
credible preference signal. *Partial*, aesthetic-biased.

**ImageReward** (`THUDM/ImageReward`, Apache-2.0, `pip install image-reward`). BLIP
reward on 137k expert comparisons; +38.6% vs CLIP, +39.6% vs Aesthetic. Ships **ReFL**
for diffusion fine-tuning. Successor **VisionReward** (Dec 2024) is multi-dimensional
T2I+T2V. ~200ms/image. *Partial*.

**MPS** (`Kwai-Kolors/MPS`, MIT, CVPR 2024). Four conditioned heads — aesthetics,
semantic alignment, detail, overall — on 918k preferences across 607k images. Only
public metric that separates "did the rewrite improve alignment?" from "did it improve
prettiness?" **Asset relevance:** *✔ high* — the alignment head isolates the variable
the enhancer actually moved. ~100ms/image GPU.

### Diffusion-DPO and RL reward stacks

**SalesforceAIResearch/DiffusionDPO** (Apache-2.0, 673★). Official Diffusion-DPO
training code; ships SD1.5 and SDXL checkpoints on the HF Hub plus a scoring harness
(PickScore, HPS, Aesthetic, CLIP). **Asset relevance:** *irrelevant* as an evaluator
per se (it's a training recipe) but *✔ useful* as an integrated scoring manifold: its
`scoring/` folder is a pre-wired "load all four rewards and return a dict of scores"
utility that saves a weekend of plumbing.

**ZiyiZhang27/tdpo** (Temporal Diffusion Policy Optimization, ICML 2024). Extends with
aesthetic/PickScore/HPSv2 rewards and addresses reward overoptimization — useful
specifically because it quantifies the failure mode we care most about (reward hacking
on aesthetic heads at the cost of semantic fidelity). *Irrelevant* for runtime scoring,
*✔ relevant* as a reference for how to *weight* an ensemble of rewards.

### Alignment backbones (not harnesses, but scoring primitives)

**CLIPScore** (`jmhessel/clipscore`, the canonical ref repo; plus
`torchmetrics.multimodal.CLIPScore`, Apache-2.0). Every "in-loop T2I validator" starts
here: it is a single cosine similarity, ~50ms per image, language-agnostic, and
trivially batchable. `torchmetrics` is the production-grade wrapper; `jmhessel/clipscore`
is the reference. **Caveat:** the default 77-token limit cuts off any prompt the
enhancer has actually worked on.

**LongCLIP** (`beichenzbc/Long-CLIP`, ECCV 2024). Drop-in CLIP extension to 248 tokens
with +20% R@5 on long captions and +6% on standard retrieval. Released `LongCLIP-B` and
`LongCLIP-L` checkpoints. **Asset relevance:** *✔* — our enhancer *will* emit 100+
token prompts for Imagen/GPT-image-1, and 77-token truncation in the evaluator would
silently invalidate the score.

**SigLIP 2** (`google/siglip2-so400m-patch14-384`, in `huggingface/transformers`).
Sigmoid loss, self-distillation, masked prediction, multilingual, and four sizes (86M /
303M / 400M / 1B). Current consensus 2026 CLIPScore backbone. *✔ high* relevance:
cheaper than VQAScore, more accurate than OpenAI CLIP-L, already in HF.

**VQAScore via `linzhiqiu/t2v_metrics`** (and `linzhiqiu/CLIP-FlanT5`, research
licenses, clip-flant5-xl/xxl on HF). One-line API: `score = model(images, texts)` —
asks "Does this figure show `<prompt>`? yes/no" and returns P("yes"). ECCV 2024, beats
CLIPScore/PickScore/ImageReward 2–3× on compositional prompts. **Cost:** 1–3s per image
on the xl model, more on xxl. **Asset relevance:** *✔ high* — this is the sharpest
alignment gate we can run without a frontier VLM.

### Logo / icon / SVG-specific benchmarks

None of these are T2I harnesses in the CompBench sense; they are *datasets with
evaluation protocols*:

- **LLD / LogoSticker** — logo datasets with CLIP-score + human eval protocols.
  Small, asset-native, *partial* relevance (brand-mark only).
- **Logo-VGR (2025)** — comparison-based open-world logo recognition benchmark.
  Irrelevant for generation scoring but a useful *brand-match* check if we accept a
  reference logo.
- **IconQA / Icon645** — 645k colored icons across 377 classes, VQA-shaped. *Partial*
  relevance for pictogram-style prompts.
- **VectorGym (2026) / SVG-Bench / StarVector's DinoScore** — the first with a built-in
  VLM-as-judge tuned to SVG. *✔ high* relevance for any SVG output path.

### Alpha / transparency benchmarks

- **alphamatting.com** — 27+8 image benchmark; SAD, MSE, Gradient, Connectivity. The
  3c/3e index already notes Gradient and Connectivity correlate ~0.75 with human
  judgment vs ~0.3 for SAD/MSE.
- **PyMatting** (`pymatting/pymatting`, MIT, 1.9k★) — production-grade implementations
  of all four metrics plus foreground estimation. `pymatting/foreground-estimation-evaluation`
  is a ready harness.
- **`withoutbg/alpha-matting-evaluation-benchmark`** — comparison of 50+ matting
  algorithms with standardized SAD/MSE/Gradient/Connectivity numbers.
- **LayerBench** (Trans-Adapter, arXiv:2508.01098, 2025) — the only public
  *non-reference* alpha-edge metric for native-RGBA diffusion models. *✔ high*
  relevance for the LayerDiffuse / `gpt-image-1` transparency path.

### LLM-as-judge harnesses adapted for image rubrics

- **DeepEval `ImageEditingMetric`** (`confident-ai/deepeval`, Apache-2.0, 14k★).
  Already ships a VLM-judge that decomposes into Semantic Consistency + Perceptual
  Quality and combines them via `O = √(min αᵢ · min βᵢ)` — the VIEScore formula.
  Pytest-style, multi-provider. *✔ high* relevance as the rubric runner.
- **Promptfoo `llm-rubric`** + the `compare-claude-vs-gpt-image` example. Generalist
  LLM-judge with pairwise comparison, known score-inflation issues, JSON output with
  `reason`/`score`/`pass`. *Partial* — useful as the A/B evaluator, less so as a
  rubric engine (no built-in asset axes).
- **Microsoft PromptFlow `evals`** — Coherence, Relevance, Groundedness, Fluency,
  Similarity evaluators plus image-in-flow support. *Partial* — text-centric rubric
  set, image support limited to passing images through; custom image rubrics need
  hand-writing.

## Summary table

| Harness | License | Measures | Asset relevance | Cost / image | In-loop? |
|---|---|---|---|---|---|
| T2I-CompBench++ | MIT | Composition | partial | ~5–15s | No (offline) |
| GenEval / GenEval 2 | MIT | Object/count/color/pos | partial | 1–3s / 2–5s | GenEval 2 only, borderline |
| VBench / VBench-2 | Apache-2.0 | Video-first dimensions | irrelevant whole; partial piecewise | n/a | No |
| HPSv2 / v2.1 | Apache-2.0 | Aesthetic preference | partial | ~100–300ms | Yes (BoN only) |
| HPSv3 | MIT | VLM preference + CoHP | partial | ~1–3s | Borderline |
| PickScore | MIT | Preference | partial | ~50–100ms | Yes (BoN) |
| ImageReward | Apache-2.0 | Preference | partial | ~200ms | Yes (BoN) |
| MPS | MIT | Aes/align/detail/overall heads | ✔ | ~100ms | **Yes** |
| DiffusionDPO scoring utils | Apache-2.0 | PickScore+HPS+Aes+CLIP bundle | ✔ | sum of above | Yes (plumbing) |
| CLIPScore (torchmetrics) | Apache-2.0 | Cosine sim | partial | ~50ms | Yes (pre-filter) |
| LongCLIP | Apache-2.0 | Cosine sim, 248 tokens | ✔ | ~60ms | Yes |
| SigLIP 2 | Apache-2.0 | Sigmoid similarity | ✔ | ~80ms | **Yes** |
| VQAScore (t2v_metrics) | research | Compositional VQA | ✔ | 1–3s | Borderline |
| PyMatting + alphamatting | MIT | Matte quality | ✔ (transparency) | ~100ms | Yes |
| LayerBench (Trans-Adapter) | research | Non-ref alpha edge | ✔ (native RGBA) | ~200ms | Yes |
| DeepEval ImageEditingMetric | Apache-2.0 | LLM-judge SC+PQ | ✔ | 3–8s (VLM cost) | Yes (top-K only) |
| Promptfoo llm-rubric | MIT | General LLM-judge | partial | 3–8s | No (offline A/B) |
| PromptFlow evals | MIT | Text-centric LLM-judge | irrelevant for images | n/a | No |

## Integration recommendations

**Bake into `validate_asset` (in-loop, every generation):**

1. **SigLIP 2 (so400m-patch14-384) as the cheap pre-filter.** ~80ms, language-robust,
   long-caption safe when paired with LongCLIP fallback for >64-token prompts. This is
   the 2026 CLIPScore.
2. **MPS alignment head only** (not overall). It is the sole public reward model that
   separates "did the enhanced prompt improve semantic fit?" from "did it make things
   prettier?" — the exact decomposition the plugin needs for A/B. MIT, ~100ms.
3. **PyMatting alpha metrics (Gradient + Connectivity) + a bimodal-histogram alpha
   lint.** Runs on the alpha channel of any transparent output in ~100ms, catches
   fringing/aliasing from post-hoc matting, and — combined with **LayerBench's
   non-reference edge score** for native-RGBA paths — is the full alpha-correctness
   gate.
4. **GenEval 2's Soft-TIFA grader on a 10–20 prompt internal asset eval set** per PR
   as a fast regression check (~30s total). Cheap enough to run as CI; catches
   compositional regressions in the rewriter that aesthetic rewards miss.
5. **DeepEval `ImageEditingMetric` as the VLM-judge top-K reranker** (top-2 only, using
   Gemini 2.5 Flash). Pairwise A/B mode, not absolute scoring. This is the asset-axis
   rubric runner — transparency present? text spelled? safe zone respected? It wraps
   the LLM call, the JSON schema, the retry, and the score aggregation so we don't
   reinvent it.

**Overkill — run offline, not in-loop:**

- **T2I-CompBench++** as a monthly full-benchmark regression. The BLIP-VQA +
  UniDet + 3-in-1 + GPT-4V stack is too slow and too prompt-distant from our asset
  distribution to gate on per-request, but running the 8-sub-category report monthly
  is the cheapest way to detect a regression in the rewriter's compositional output
  and still publish a comparable number next to DALL·E 3 / SD3 / FLUX.
- **Full HPSv3 CoHP loop.** HPSv3 is a fine occasional ranker (and **PickScore** is
  the right in-loop stand-in for preference), but running the full Chain-of-Human-
  Preference iterative refinement on every request is hundreds of milliseconds of
  VLM we can spend better elsewhere. Keep CoHP for offline best-of-N ablations and
  for building an in-house RLHF dataset.

Everything else — VBench-T2I modules, ImageReward, HPSv2, Diffusion-DPO's reward
bundle, VectorGym — is worth reading, not worth shipping.
