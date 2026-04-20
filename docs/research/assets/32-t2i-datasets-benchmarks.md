# T2I Research Datasets & Benchmarks

> External grounding digest for `prompt-to-asset`: which open text-to-image datasets / benchmarks actually help us (a) validate routing choices, (b) evaluate prompt rewriters, and (c) train/evaluate classifiers (aesthetic quality, safety, style, category). Current as of 2026.

Covered in priority order for this project (preference benchmarks first, then composition/prompt eval, then raw pair corpora).

---

## 1. Human preference benchmarks (the most useful for prompt-to-asset eval)

### 1.1 HPS v2 / v2.1 — Human Preference Score

- **URL**: [github.com/tgxs002/HPSv2](https://github.com/tgxs002/HPSv2) · paper: [arXiv 2306.09341](https://arxiv.org/abs/2306.09341)
- **License**: Apache-2.0 (code + model); HPD v2 dataset released for research.
- **Size**:
  - HPD v2 dataset: **798,090 pairwise preference choices over 430,060 image pairs**.
  - HPS v2 benchmark split: **3,200 prompts × 4 styles** (Animation / Concept-Art / Painting / Photo) → 12,800 prompt-style test items.
  - v2.1 (Sept 2024) retrains on higher-quality preference data.
- **Contains**: Prompt + two generated images + which one a human preferred, across many T2I models. Benchmark prompts are grouped by style.
- **Useful for**:
  - **Eval of prompt rewriter**: before/after comparison — does the rewritten prompt score higher HPS v2.1 than the original, at fixed model + seed?
  - **Router validation**: compare HPS v2.1 per style bucket across backends (e.g., is Flux.1-dev really better than SDXL for "Painting" in our pipeline?).
  - **Classifier training signal** for "which rewrite is likely to win" — the HPS v2 model itself (CLIP-ViT-H fine-tuned on HPD v2) is a drop-in reward model.

### 1.2 PickScore / Pick-a-Pic

- **URL**: [github.com/yuvalkirstain/PickScore](https://github.com/yuvalkirstain/PickScore) · dataset: [huggingface.co/datasets/yuvalkirstain/pickapic_v1](https://huggingface.co/datasets/yuvalkirstain/pickapic_v1) · [pickapic_v2](https://huggingface.co/datasets/yuvalkirstain/pickapic_v2)
- **License**: MIT (code); dataset is CC-BY-NC for non-commercial research.
- **Size**: v1 ≈ 500k–616k examples, v2 > 1M examples. Each example = prompt + 2 images + preference label (incl. "tie").
- **Contains**: Real user prompts + generations from multiple diffusion models collected through pickapic.io — not crowdworked, so prompt distribution is more "messy real user" than COCO-clean.
- **Useful for**:
  - **Reward model** for prompt rewriter training/eval. PickScore reports 70.2–70.5% accuracy vs 68.0% expert-human, 60.8% zero-shot CLIP-H, 56.8% aesthetic predictor.
  - **Prompt distribution prior**: Pick-a-Pic prompts are a realistic model of what users actually ask for — useful to sample "real" prompts when stress-testing routing.
  - Not usable for commercial training of our shipping models (license); fine as an internal eval reward model.

### 1.3 ImageReward (THUDM)

- **URL**: [github.com/THUDM/ImageReward](https://github.com/THUDM/ImageReward) · dataset: [huggingface.co/datasets/THUDM/ImageRewardDB](https://huggingface.co/datasets/THUDM/ImageRewardDB)
- **License**: Apache-2.0.
- **Size**: 137k expert pairwise comparisons, 62.6k images (lossless WebP), organized into 1K / 2K / 4K / 8K subsets. Prompts sourced from DiffusionDB.
- **Contains**: Pair labels across *three* axes — overall quality, image–text alignment, fidelity. That 3-axis decomposition is rarer than the 1-axis preference in HPS/PickScore.
- **Useful for**:
  - **Diagnostic eval** — when a rewrite loses on HPS, ImageReward tells you *why* (alignment vs fidelity vs aesthetic).
  - Apache-2.0, so we can use it commercially in our eval harness (unlike Pick-a-Pic).

---

## 2. Prompt / composition benchmarks (prompt-set only, BYO images)

### 2.1 PartiPrompts (P2, Google)

- **URL**: [github.com/google-research/parti/blob/main/PartiPrompts.tsv](https://github.com/google-research/parti/blob/main/PartiPrompts.tsv)
- **License**: Apache-2.0.
- **Size**: **~1,632 English prompts**, TSV file. ~35 KB.
- **Contains**: Prompts tagged by **category** (Abstract, Vehicles, Animals, Food, People, Artifacts, World Knowledge, Outdoor Scenes, Illustrations, Arts, Produce & Plants) and **challenge level** (Basic → complex multi-clause descriptions). No images included.
- **Useful for**:
  - **Routing eval grid**: run each backend on P2 and bucket HPS / ImageReward scores by (category × challenge). Finds where each backend fails.
  - **Rewriter eval harness** — stable, citeable prompt set so results are reproducible.

### 2.2 DrawBench (Imagen)

- **URL**: [huggingface.co/datasets/shunk031/DrawBench](https://huggingface.co/datasets/shunk031/DrawBench) · original Google Sheet via Imagen paper.
- **License**: unclear / research use; prompts themselves are from the Imagen paper appendix (Google).
- **Size**: **~200 prompts across 11 categories** (Text rendering, Description, Rare word, Misspelling, Conflicting, Colors, Counting, Positional, DALL-E, Marcus, Reddit).
- **Contains**: Prompt-only eval set focused on failure modes — specifically **text-in-image rendering**, counting, positional logic, conflicting descriptions.
- **Useful for**:
  - **Targeted regression tests** for the rewriter: if we add a rule like "expand counts explicitly," DrawBench "Counting" category should move.
  - **Text-rendering sub-eval** — especially relevant for logo/wordmark asset routing (direct match to our asset-quality goals).

### 2.3 T2I-CompBench / T2I-CompBench++

- **URL**: [github.com/Karine-Huang/T2I-CompBench](https://github.com/Karine-Huang/T2I-CompBench) · paper: [arXiv 2307.06350](https://arxiv.org/abs/2307.06350)
- **License**: repo is MIT; prompts are research-use.
- **Size**: **8,000 compositional prompts** across 4 groups / 8 sub-categories: attribute binding (color / shape / texture), object relationships (spatial / non-spatial / 3D-spatial), generative numeracy, complex compositions.
- **Contains**: Prompts + **detection-based automated metrics** (no human-in-the-loop needed for most categories) + GPT-4V / ShareGPT4V eval recipes.
- **Useful for**:
  - **Compositional correctness classifier / signal** — evaluate whether rewriter actually improves "two red cats and one blue dog" vs dropping binding.
  - Cheaper eval than HPS (no human pairs), fully automated.

---

## 3. Large text–image pair corpora (training / classifier data, not eval)

### 3.1 Re-LAION-5B (formerly LAION-5B)

- **URL**: [laion.ai/blog/relaion-5b](https://laion.ai/blog/relaion-5b) · HF gated.
- **Status**: **Re-LAION-5B released Aug 30, 2024** after 2,236 CSAM-suspected URLs (incl. the 1,008 from Stanford Internet Observatory's Dec 2023 report) were removed via IWF / C3P / Stanford hash lists. **Original LAION-5B is deprecated; do not use.**
- **License**: Apache-2.0 on the metadata (URL+text pairs); actual image copyrights belong to original hosts.
- **Size**: 5,526,641,167 text-link→image pairs. Two variants: `Re-LAION-5B research` and `Re-LAION-5B research-safe`.
- **Useful for**:
  - **Category/style classifier training** (e.g., "is this prompt best routed to illustration vs photo vs flat-vector backend") using LAION's caption distribution.
  - NOT directly useful for asset-quality eval.

### 3.2 LAION-400M / LAION-Aesthetic

- **URL**: [laion.ai/blog/laion-aesthetics](https://laion.ai/blog/laion-aesthetics)
- **Status**: Subsets of original LAION-5B; Re-LAION-5B metadata can be used to re-clean derivatives. Use with caution.
- **License**: Apache-2.0 metadata.
- **Size**:
  - LAION-400M: 400M CLIP-filtered English image-text pairs.
  - LAION-Aesthetic (v1): **120M samples with aesthetic score > 7**.
  - LAION-Art: 8M samples with aesthetic score > 8.
- **Useful for**:
  - **Aesthetic classifier** — LAION's aesthetic predictor (MLP on CLIP embeddings, 0–10 scale) is *the* canonical open aesthetic scorer. Directly usable as a cheap quality gate for emitted assets.
  - **Training fine-tuned CLIP classifiers** for our style buckets (logo / icon / illustration / hero / photo).

### 3.3 DiffusionDB (Georgia Tech / PoloClub)

- **URL**: [github.com/poloclub/diffusiondb](https://github.com/poloclub/diffusiondb) · [huggingface.co/datasets/poloclub/diffusiondb](https://huggingface.co/datasets/poloclub/diffusiondb)
- **License**: CC0 1.0 (public domain) + MIT for code.
- **Size**: **14M prompts + generated images** from Stable Diffusion Discord logs (also 2M subset available).
- **Contains**: Real user prompts + SD outputs + generation hyperparameters (seed, steps, CFG). Prompts are wildly heterogeneous (SFW-filtered is available).
- **Useful for**:
  - **Real-user prompt distribution** — train the rewriter on noisy → cleaned prompt pairs, using DiffusionDB as "noisy" side.
  - **Underlying corpus for ImageReward** (good to know — ImageReward's eval set comes from here).
  - CC0 = commercially usable.

### 3.4 CC12M (Conceptual Captions 12M)

- **URL**: [github.com/google-research-datasets/conceptual-12m](https://github.com/google-research-datasets/conceptual-12m)
- **License**: permissive Google license (free for any use, acknowledgement appreciated, "AS-IS"). URLs only — you fetch images yourself (link rot applies).
- **Size**: ~12M image URL + caption pairs, web-scraped, looser quality filter than CC3M → more diverse captions.
- **Contains**: Long-tail concept captions (non-curated). Not SD-generated.
- **Useful for**:
  - **Caption-side classifier training**: category/style tagger, "is this prompt a logo vs scene vs portrait".
  - Small/medium pre-training for any CLIP-adjacent model.

### 3.5 RedCaps

- **URL**: [redcaps.xyz](https://redcaps.xyz/)
- **License**: Annotations CC-BY 4.0; **non-commercial research only**; subject to Reddit API ToS; explicitly forbids face-recognition/demographic-classification uses and production deployment.
- **Size**: **12M+ image–text pairs** from 350 subreddits, 13 years.
- **Contains**: Image URL + user-written Reddit caption + subreddit + score + date. Subreddit serves as a weak category label (e.g., `r/macroporn`, `r/cats`, `r/designporn`, `r/itookapicture`).
- **Useful for**:
  - **Weak-supervision category classifier** (subreddit as label).
  - Strictly internal research eval — **not commercial**.

### 3.6 COCO Captions

- **URL**: [cocodataset.org](https://cocodataset.org/)
- **License**: Annotations CC-BY 4.0; images are Flickr with their own licenses.
- **Size**: ~330k images, **1.5M+ captions** (5 per train/val image), plus bboxes / segmentation from MS COCO.
- **Contains**: Clean everyday scene photos + 5 human captions each. Tiny by modern standards but extremely high caption quality.
- **Useful for**:
  - **FID baseline** (COCO-30k is the canonical FID eval set for T2I papers).
  - **Rewriter "grounded caption" training pair**: COCO caption = clean reference, augmented/noisy version = input.

### 3.7 Visual Genome

- **URL**: [visualgenome.org](https://visualgenome.org/)
- **License**: CC-BY 4.0.
- **Size**: 108k images, avg 35 objects / 26 attributes / 21 pairwise relationships per image, plus region descriptions and QA.
- **Contains**: Dense scene graphs — objects, attributes, relations all WordNet-aligned.
- **Useful for**:
  - **Composition ground truth** — pair with T2I-CompBench to evaluate whether rewriter preserves relational structure.
  - Relatively niche for this project; useful only if we add a structured-prompt feature.

### 3.8 SA-1B (Segment Anything 1-Billion)

- **URL**: [ai.meta.com/datasets/segment-anything](https://ai.meta.com/datasets/segment-anything)
- **License**: **Custom, research-only**. SAM model itself is Apache-2.0, but dataset is not.
- **Size**: 11M high-res images + **1.1B auto-generated segmentation masks** (COCO RLE). Faces / license plates de-identified.
- **Contains**: Class-agnostic instance masks only — no categories, no captions. Licensed stock photography as image source.
- **Useful for**:
  - **Mask training / fine-tuning** if we ever need to train a custom segmentation model for background removal or object isolation in the asset pipeline.
  - Not useful for prompt enhancement or T2I evaluation directly.

---

## 4. Quick picks for `prompt-to-asset` goals

| Goal | Use |
| --- | --- |
| Does rewriter improve outputs? | **HPS v2.1** + **ImageReward** (2-axis verdict), evaluated on **PartiPrompts** + **DrawBench** prompt sets |
| Compositional correctness of rewrites | **T2I-CompBench++** (automated, 8k prompts) |
| Aesthetic gate on emitted assets | **LAION aesthetic predictor** (MLP on CLIP-H), trained on LAION-Aesthetic |
| Route prompt → backend | Train a light classifier on **CC12M** + weak labels from **RedCaps** subreddits |
| Real user prompt distribution for stress tests | **Pick-a-Pic** (non-commercial) or **DiffusionDB** (CC0) |
| Never use | Original LAION-5B (superseded by Re-LAION-5B) |

## 5. License summary for commercial asset pipeline

Safe to use commercially (pipeline / training / eval):
- CC12M (Google permissive)
- DiffusionDB (CC0)
- COCO / Visual Genome (CC-BY 4.0, attribution)
- ImageReward code + dataset (Apache-2.0)
- Re-LAION-5B metadata (Apache-2.0 metadata; source images remain their owners')

Research-only / non-commercial — **internal eval only**:
- Pick-a-Pic (CC-BY-NC)
- RedCaps (non-commercial, no production)
- SA-1B (custom research license)
- HPD v2 (research)
- PartiPrompts, DrawBench, T2I-CompBench++ (research eval OK, typical benchmark usage)
