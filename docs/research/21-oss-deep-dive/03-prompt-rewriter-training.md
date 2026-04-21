---
wave: 1
role: niche-discovery
slug: 03-prompt-rewriter-training
title: "Training code, datasets & rewards for T2I prompt rewriters"
date: 2026-04-19
sources:
  - https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
  - https://hunyuan-promptenhancer.github.io/
  - https://arxiv.org/abs/2509.04545
  - https://github.com/microsoft/LMOps/tree/main/promptist
  - https://arxiv.org/abs/2212.09611
  - https://huggingface.co/microsoft/Promptist
  - https://github.com/Mowenyii/PAE
  - https://arxiv.org/abs/2404.04095
  - https://openaccess.thecvf.com/content/CVPR2024/papers/Mo_Dynamic_Prompt_Optimizing_for_Text-to-Image_Generation_CVPR_2024_paper.pdf
  - https://github.com/alibaba/EasyNLP
  - https://huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2
  - https://aclanthology.org/2023.emnlp-industry.1/
  - https://huggingface.co/datasets/poloclub/diffusiondb
  - https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts
  - https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion
  - https://huggingface.co/roborovski/superprompt-v1
  - https://huggingface.co/datasets/vera365/lexica_dataset
  - https://huggingface.co/datasets/FredZhang7/stable-diffusion-prompts-2.47M
  - https://huggingface.co/datasets/Kamran-56/prompt-refinement-dataset
  - https://huggingface.co/datasets/Electrofried/promptmaster-data
  - https://huggingface.co/datasets/OpenAssistant/oasst1
  - https://github.com/yuvalkirstain/PickScore
  - https://github.com/tgxs002/HPSv2
  - https://github.com/RE-N-Y/imscore
  - https://huggingface.co/docs/trl/
  - https://huggingface.co/docs/trl/main/ddpo_trainer
  - https://arxiv.org/html/2507.19002v1
  - https://arxiv.org/html/2602.20903v1
  - https://arxiv.org/html/2503.21812v2
tags: [training, rlhf, reward, dataset, promptist, hunyuan]
---

# Training code, datasets & rewards for T2I prompt rewriters

## Scope

Before we can decide whether to *train* an asset-aware rewriter — as opposed to
merely system-prompting a frontier LLM — we need to know what raw material is
available upstream. This angle inventories the four ingredient classes: (1)
**training code / reference pipelines** for T2I prompt rewriters, (2) **prompt
datasets** usable for SFT and preference data, (3) **reward models** that can
score generated images, and (4) **RL libraries** that glue the first three
together. The bottom line is previewed in the final section: a license-clean,
asset-aware rewriter is realistically trainable on a modest budget (low thousands
of USD), but nothing off-the-shelf is aimed at assets — every component must be
*retargeted* rather than *reused*.

## Training pipelines worth copying

Four published rewriter training pipelines matter. They form a direct lineage —
each inherits the prior's reward-shaping trick and replaces its backbone with a
more capable LLM.

### Microsoft Promptist (NeurIPS 2023 Spotlight, `microsoft/LMOps`)

The canonical two-stage recipe. Stage 1 is SFT: a pretrained **GPT-2 (~125M
params)** is fine-tuned on `(short_input → engineered_prompt)` pairs harvested
from Lexica and similar sites. Stage 2 is **PPO** with a reward that adds a CLIP
relevance score (preserves the original intent) to an aesthetic score (a fine-
tuned predictor on LAION-Aesthetic). Diverse beam search is used during RL
rollouts to keep exploration healthy. Code is MIT under `microsoft/LMOps/promptist`;
weights are released as `microsoft/Promptist` on Hugging Face. **What it gives
us**: the reference architecture, a fully open training harness, and a tiny
CPU-runnable rewriter we can ship as a free-tier fallback immediately.
**Reproducibility**: clean repo, needs an SD 1.x loop for the reward, a few A100
days. **Weakness for us**: the aesthetic reward actively *biases away from
logos* toward LAION photography — we must replace it.

### Alibaba BeautifulPrompt (EMNLP 2023, in `alibaba/EasyNLP`)

Three-stage InstructGPT-style pipeline: SFT, train a reward model, then PPO
with an adaptive KL penalty. Backbone is **BLOOM-1.1B**. The interesting novelty
is the dataset-construction trick: they mine DiffusionDB, use BLIP to caption
the *images* as simple prompts, and use ChatGPT to (a) summarize the high-quality
original prompts and (b) expand the simple captions — auto-manufacturing paired
`(simple, polished)` rows. The reward linearly combines **PickScore** with an
**aesthetic score** using a balancing α. Apache-2.0. Weights at
`alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2`. **What it gives us**: a cheap
data-construction recipe (BLIP + GPT is < $100 for 10k pairs) and validation
that PickScore is a viable reward signal.

### Tencent Hunyuan-PromptEnhancer (CVPR 2026, ~3.7k★, Apache-2.0)

The current state of the art. Two-stage training. Stage 1 is SFT on
**Chain-of-Thought** `(user_prompt, thought, reprompt)` traces. Stage 2 is
**GRPO** (Group Relative Policy Optimization — the DeepSeek-R1 algorithm, now in
TRL) against the **AlignEvaluator** reward, a dedicated model that returns a
*scalar composed from 24 fine-grained key points* spanning six supercategories
of T2I failure modes (attribute binding, negation, spatial relations, counting,
text rendering, etc.). Training data is synthesized by "user prompt simulation
+ Gemini generation + human-in-the-loop selection + automated filtering." A
companion **T2I-Keypoints-Eval** benchmark is released on HF. Available at
`PromptEnhancer-7B` and `PromptEnhancer-32B`. **What it gives us**: the only
open, keypoint-structured reward design in the field; a modern GRPO recipe; and
a 32B ceiling we can *distill down* to something cheaper. The training
dataset itself has **not** been released as of 2026-04, only the eval split and
the weights.

### PAE / Dynamic Prompt Optimizing (CVPR 2024, `Mowenyii/PAE`)

Unlike the others, PAE doesn't just rewrite — it emits **Dynamic Fine-control
Prompts (DF-Prompts)** that encode per-word *weights* and per-word *injection
timesteps* across the diffusion denoising schedule. Trained with online RL whose
reward combines aesthetic score, semantic consistency (CLIP), and user preference.
~86★, research license. Evaluated on COCO, DiffusionDB, and Lexica subsets.
**What it gives us**: a pattern for *structured output* from the rewriter —
exactly what our G4 gap (no existing rewriter returns JSON with weights and
negatives) calls for. The underlying algorithm is the right shape even though
the repo is small.

### Supporting / adjacent recipes

- **MagicPrompt-SD** (Gustavosta, MIT) — 124M GPT-2 SFT on 80k Lexica prompts.
  No RL, no reward. Pure SFT baseline; the value is the *recipe*, not the
  weights.
- **SuperPrompt-v1** (`roborovski`, MIT) — T5-small (77M), SFT with a fixed task
  prefix. 1.4M HF downloads. Good "always-on" in-browser baseline.
- **IPGO (arXiv:2503.21812)** — Indirect Prompt Gradient Optimization. Not a
  rewriter per se, it learns continuous prefix embeddings. Interesting as a
  *parameter-efficient* alternative to full RL.

## Prompt datasets inventory

Sizes and licenses are 2026-04 snapshots; verify before download.

| Dataset | Size | Shape | License | Use for |
|---|---|---|---|---|
| `poloclub/diffusiondb` 2M / Large | 2M / 14M img+prompt, ~1.6TB / 6.5TB | real SD user prompts | **CC0 1.0** | base prompt pool, distillation targets |
| `Gustavosta/Stable-Diffusion-Prompts` | 81,910 rows | Lexica prompts | unstated (weights MIT) | classic MagicPrompt-style SFT |
| `vera365/lexica_dataset` | 61,467 pairs | prompt+image+metadata | **CC-BY-4.0** (images NC) | reward-model training |
| `FredZhang7/stable-diffusion-prompts-2.47M` | 2.47M prompts | merged (diffusiondb + Gustavosta + bartman + krea) | mixed | maximum-scale SFT |
| `daspartho/stable-diffusion-prompts` | 1.8M unique | subset of diffusiondb | same as source | Prompt-Extend project base |
| `Electrofried/promptmaster-data` | 4,740 rows | `(natural desc → SD prompt)` pairs with train/val/test | unspecified | instruction-tuning template |
| `Kamran-56/prompt-refinement-dataset` | 1,561 pairs | Llama-3.1-generated `(raw → enhanced)` pairs | unspecified | **LLM-style** rewrite SFT |
| `PromptEnhancer/T2I-Keypoints-Eval` | ~hundreds (eval) | keypoint-annotated | research | evaluation only |
| `yuvalkirstain/pickapic_v2` | ~1M preference pairs | image A vs B + prompt | MIT | reward-model preference data |
| Pick-a-Pic + HPDv2 | 798k preference choices / 430k images | preferences | Apache-2.0 | general T2I reward |
| `OpenAssistant/oasst1` | 161k messages | general-purpose conversations | Apache-2.0 | **not T2I** — instruction-tuning flavor only |

Concrete takeaways. (a) **DiffusionDB is the right base pool** — 14M
prompt-image rows at CC0 is unusual generosity. (b) **BeautifulPrompt's
captioning trick eliminates the need for humans to write `(short → long)` pairs**
— we can regenerate 10-100k pairs at a few cents per row. (c) **There is no
asset-flavored dataset.** Every row above is aesthetic photography/illustration.
Building 5-20k `(intent, ideal_prompt, target_model, asset_type)` tuples for
logos, app icons, favicons, OG cards, transparent PNGs is unavoidable work and
also a defensible artifact — nobody else has this.

## Reward models and scorers

| Scorer | License | Range | Captures | Notes |
|---|---|---|---|---|
| CLIPScore | MIT | ~[0, 0.3] | image-text cosine similarity | baseline, cheap, weak on composition |
| PickScore (`yuvalkirstain/PickScore`) | MIT | preference logit | learned user preference on Pick-a-Pic v2 | strong general preference signal |
| ImageReward (THUDM) | Apache-2.0 | ~[-3, +1] | human-feedback reward | used widely in T2I RL |
| HPSv2 / HPSv2.1 (`tgxs002/HPSv2`) | Apache-2.0 | preference | 798k HPD-v2 preferences | style-stratified benchmarks |
| Hunyuan **AlignEvaluator** | Apache-2.0 (weights) | scalar from 24 keypoints | explicit failure-mode scoring | the only structured T2I reward in OSS |
| `imscore` (`RE-N-Y/imscore`) | MIT | N/A (wrapper) | differentiable interface over all of the above | drop-in for RL |
| TextPecker (arXiv:2602.20903) | research | reward | OCR/glyph structural anomaly | targeted text-legibility head |

`imscore` is the key infrastructure find — one `pip install` gives a
differentiable, unified API over PickScore, HPSv2/v2.1, ImageReward, and
CLIPScore, which is exactly what TRL's `DDPOTrainer` or `GRPOTrainer` expects.

## RL libraries

**Hugging Face TRL v1.0** (released April 12, 2026) is the obvious foundation. It
unifies SFT, reward-model training, DPO, PPO, **GRPO** (what Hunyuan uses), RLOO,
and **DDPOTrainer** — the last is Black et al.'s *Denoising Diffusion Policy
Optimization* wired to the `diffusers` library, which directly fine-tunes SD
weights on an arbitrary scalar reward function. For our purpose (training a
*rewriter* LLM, not the diffusion model), we want **GRPOTrainer** or
**PPOTrainer**, with `imscore` providing the reward, and a frozen SD/Flux
pipeline rolling out images. RL4LMs (older) is feature-complete but less active;
trlX is deprecated; Anthropic's internal stack is not released. TRL is the right
bet.

> **Updated 2026-04-21:** TRL v1.0 officially released April 12, 2026. GRPOTrainer is now part of the stable API (not experimental). The v1.0 release also formalizes a CLI and config system; ORPO and KTO are separated into experimental. The production path is `SFTTrainer → GRPOTrainer` as recommended above.

## Five asset-specific reward signals to combine

For an *asset-aware* reward we propose a linear combination of five heads, each
cheap to implement and each targeting one of the failure modes Hunyuan's generic
reward does not cover:

1. **CLIPScore (semantic alignment).** Keeps the generated image on-topic.
   Standard, cheap, differentiable via `imscore`.
2. **OCR text legibility** via PaddleOCR / Tesseract / TrOCR on any text the
   prompt requested; reward = character-level edit similarity between requested
   and recognized text, penalized for glyph-split/misspelling per TextPecker's
   method. Essential for logos with wordmarks and for favicons with initials.
3. **Alpha coverage / background-purity.** For transparent assets: reward =
   `1 − α_fill` over regions that should be transparent, computed on the
   post-LayerDiffuse (or post-BRIA RMBG) mask; penalize fringing and
   checkerboard leakage. Directly closes the "weird boxes" failure Gemini
   exhibits and that *no* existing reward measures.
4. **Palette distance (brand adherence).** Reward = negative *Delta-E 2000*
   between the image's dominant-color cluster (k-means over pixels in LAB) and
   the user's `brand.md` palette. Equals zero for unbranded prompts.
5. **Safe-zone respect (platform-spec compliance).** For iOS app icons, Android
   adaptive icons, favicons, OG cards: reward = 1 if the salient content (via
   saliency/attention map) fits inside the platform's safe zone and the image
   has no forbidden-region artifacts (e.g., corners for rounded iOS masks),
   else a graded penalty proportional to overflow.

The combined reward is `R = w₁·CLIP + w₂·OCR + w₃·Alpha + w₄·Palette + w₅·SafeZone`,
with per-asset-type weight masks (e.g., OCR off for non-text icons, Palette off
for unbranded prompts). Each head is a small, independently verifiable function
— which means we can ablate them and report per-head contributions cleanly.

## Integration recommendations

**Can we realistically train an asset-aware rewriter? Yes, cheaply, with
caveats.**

The minimum viable recipe, ordered by cost, is:

1. **Backbone.** Start from `PromptEnhancer-7B` (Apache-2.0) or, for the free
   tier, `roborovski/superprompt-v1` (T5-small, 77M). Do **not** start from
   Fooocus weights (CC-BY-NC-4.0). Hunyuan's 7B gives us CoT capacity on day
   one; SuperPrompt-v1 gives us a browser-runnable fallback.

2. **SFT data (~8-20k rows).** Construct via BeautifulPrompt's recipe applied to
   an asset-centric prompt pool: scrape logo/icon/OG-card galleries, caption
   images with a VLM (Gemini 2.5 or GPT-4o), ask a frontier LLM to produce
   `(simple_brief → model-specific_prompt)` pairs, filter with PickScore + an
   asset-validity check. Budget: ~$150–400 of API calls for 10k pairs. This
   dataset is itself the most novel OSS artifact of the project.

3. **Reward model (the real work).** Train AlignEvaluator-style heads — four
   thin classifiers on top of a CLIP-ViT backbone for OCR-legibility,
   alpha-validity, palette-adherence, and safe-zone compliance. Label on
   generated images from our own SFT rollouts; ~2-5k labeled rows per head is
   enough for decent signal. Combine via learned weights or a fixed
   asset-type-conditioned weighting.

4. **RL stage.** TRL `GRPOTrainer` with `imscore` + our four custom heads as
   the reward. Frozen rollout generator is Flux.1 [schnell] (Apache-2.0) or
   HunyuanImage 2.1 (open weights) so we don't leak NC licenses into the
   training loop. LoRA on the rewriter backbone — full-parameter RL on 7B is
   avoidable. Budget: ~4-8 A100-days (~$300-800 at spot).

5. **Evaluation.** Hunyuan's T2I-Keypoints-Eval + T2I-CompBench for generic
   alignment; our own ~500-prompt asset eval (currently unbuilt) for
   asset-correctness. Report per-head ablations.

**Total realistic cost: $1-3k + ~2 FTE-weeks.** That is well inside a side
project budget.

**Caveats.** (a) The payoff is downstream-useful only if we actually route
asset-aware reward signals — a great rewriter into a generic generator just
converges back to LAION-Aesthetic land. (b) Training is slower than shipping: a
Claude/Gemini system-prompted rewriter with the same 24+5-keypoint scaffold is
almost certainly within 80% of the trained model's performance and available
today with zero training. **Recommendation: ship the system-prompted version
in v1; collect `(prompt, generated_image, user_kept?)` telemetry in v1; train
the rewriter from that real preference data in v2.** This uses the unique
advantage we actually have (a shipped product with real users) rather than
competing on synthetic data with Tencent.

The training work is not blocked by missing OSS ingredients. It is blocked by
not yet having users to generate the preference labels that would make it
better than the frontier-LLM baseline. That ordering is the load-bearing
integration recommendation.
