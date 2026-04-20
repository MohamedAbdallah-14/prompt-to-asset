---
wave: 1
role: niche-discovery
slug: 17-t2i-alignment-datasets
title: "Open datasets for asset-aware T2I / prompt rewriter training"
date: 2026-04-19
sources:
  - https://huggingface.co/datasets/poloclub/diffusiondb
  - https://poloclub.github.io/diffusiondb/datasheet.html
  - https://laion.ai/blog/relaion-5b/
  - https://huggingface.co/datasets/laion/aesthetics_v2_4.5
  - https://huggingface.co/datasets/succinctly/midjourney-prompts
  - https://huggingface.co/datasets/vivym/midjourney-prompts
  - https://github.com/JourneyDB/JourneyDB
  - https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts
  - https://huggingface.co/datasets/vera365/lexica_dataset
  - https://github.com/Karine-Huang/T2I-CompBench
  - https://github.com/tgxs002/HPSv2
  - https://huggingface.co/datasets/zhwang/HPDv2
  - https://github.com/MizzenAI/HPSv3
  - https://huggingface.co/datasets/yuvalkirstain/pickapic_v2
  - https://github.com/yuvalkirstain/PickScore
  - https://huggingface.co/datasets/zai-org/ImageRewardDB
  - https://github.com/THUDM/ImageReward
  - https://data.vision.ee.ethz.ch/sagea/lld/
  - https://github.com/alex-sage/logo-gen
  - https://github.com/msn199959/Logo-2k-plus-Dataset
  - https://paperswithcode.com/dataset/wirld
  - https://github.com/Abhiram4572/LogoIdent
  - https://github.com/neouyghur/METU-TRADEMARK-DATASET
  - https://lhf-labs.github.io/tm-dataset/
  - https://github.com/lhf-labs/tm-dataset
  - https://www-sop.inria.fr/members/Alexis.Joly/BelgaLogos/BelgaLogos.html
  - https://mldta.com/dataset/flickrlogos-32/
  - https://github.com/iconify/iconify
  - https://github.com/iconify/icon-sets
  - https://www.interactionmining.org/rico.html
  - https://github.com/google-research-datasets/rico_semantics
  - https://lexica.art/terms
tags: [dataset, laion, logo-dataset, icon-dataset, benchmark]
---

# 17 — Open datasets for asset-aware T2I / prompt rewriter training

Niche question for wave 1: **can we assemble a license-clean corpus to train
or evaluate an asset-aware prompt rewriter (logos, icons, favicons,
transparent PNGs, brand packs)?** Short answer: *partially for eval, no for
commercial training*. Each dataset below is triaged against (A) commercial
training, (B) eval only, and (C) retrieval-corpus use at inference. The
[20-category G1 gap](../20-open-source-repos-landscape/INDEX.md) ("no public
`(intent, ideal_prompt, target_model, asset_type)` tuples exist") is
confirmed here; this deep-dive quantifies what *is* close enough to build
on.

## 1. Generic T2I prompt/image corpora

### DiffusionDB (`poloclub/diffusiondb`)

- **URL:** <https://huggingface.co/datasets/poloclub/diffusiondb> · paper
  [arXiv:2210.14896](https://arxiv.org/abs/2210.14896)
- **Size:** 14M images · 1.8M unique prompts · 6.5 TB (also 2M subset at 1.6 TB)
- **License:** **CC0 1.0**. Prompts and SD-1.x outputs both released as CC0.
- **Asset-relevance:** Low. SD-Discord scrapes — photography, anime, character
  art, tag salad. Keyword scans for `logo|icon|favicon|transparent` return
  <2% and mostly hobbyist.
- **Commercial training?** On paper yes; practically risky — prompts reference
  trademarks, celebrities, and styled-after-artist names ("Greg Rutkowski,
  …Pixar"), a litigation surface even under CC0 packaging.
- **Eval only?** Yes.
- **Retrieval corpus?** Yes — best as a *negative* corpus so the rewriter
  learns what tag-salad looks like and *avoids* it for Imagen/`gpt-image-1`
  dialects.

### LAION-Aesthetics v2 / Re-LAION-5B

- **URL:** <https://laion.ai/blog/laion-aesthetics>, Re-LAION blog
  <https://laion.ai/blog/relaion-5b/>, gated HF dataset
  <https://huggingface.co/datasets/laion/aesthetics_v2_4.5>
- **Size:** 1.2B aesthetic-filtered pairs (v2, thresholds 4.5/4.75/5/6.5);
  Re-LAION-5B is 5.5B total
- **License:** Metadata (URL + alt-text + aesthetic score) is Apache-2.0 /
  CC-BY-4.0. **Images not included** — only third-party URLs. After the
  Stanford CSAM report (Dec 2023), LAION withdrew the original and released
  Re-LAION-5B (Aug 2024) with 2,236 links removed; use that.
- **Asset-relevance:** Moderate. Score ≥6.5 biases to photography/painting
  (wrong for flat-vector logos), but unfiltered LAION-2B-en alt-text contains
  enough "logo/icon/vector art/transparent png" to seed a filter.
- **Commercial training?** **Legally risky.** Third-party URLs, no rights
  clearance; Getty v. Stability and class actions against SD/MJ operators
  rely on LAION provenance.
- **Eval only?** Yes (CMMD / FD-DINOv2 reference distributions).
- **Retrieval corpus?** Yes as a caption corpus (alt-text mining).

### Midjourney Discord scrapes

- **URLs:** `succinctly/midjourney-prompts` (246k, Apache-2.0 packaging),
  `vivym/midjourney-prompts` (9M+), `suriyagunasekar/midjourney-prompts`
- **License:** HF cards say Apache-2.0 on *packaging*, but this is misleading
  — Midjourney's ToS claim copyright over non-Pro outputs and restrict
  prompt reuse; Discord's ToS also apply. Treat as unlicensed.
- **Asset-relevance:** Low-moderate. MJ v5+ prompts are more natural-language
  (closer to Imagen's dialect) — useful for verbalizer training.
- **Commercial training?** No. Research-only.
- **Eval / retrieval:** Yes, local use only; never redistribute.

### JourneyDB

- **URL:** <https://github.com/JourneyDB/JourneyDB>
- **Size:** 4.4M high-res Midjourney images + captions
- **License:** Custom ToS — **non-commercial research only**, explicit
  "no competitive research against Midjourney and Discord" clause, no
  redistribution outside a single org.
- **Verdict:** Hard-pass for anything we ship. Usable internally for
  reading-only research. Do not cite as training provenance.

## 2. Prompt-only corpora used by rewriter research

### Gustavosta/Stable-Diffusion-Prompts

- **URL:** <https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts>
- **Size:** ~80k prompts filtered from Lexica.art
- **License:** Unspecified on the card. Upstream Lexica is CC-BY-NC 4.0
  (non-SD-1.5) and CC0 (SD-1.5 subset); derived list inherits NC by default.
- **Asset-relevance:** Low — SD-1.x aesthetic prompts. This is the lineage
  behind MagicPrompt and SuperPrompt-v1, and part of why OSS rewriters emit
  the wrong dialect for Imagen/`gpt-image-1`.
- **Commercial training?** No. Eval with attribution only.

### `vera365/lexica_dataset`

- **URL:** <https://huggingface.co/datasets/vera365/lexica_dataset>
- **Size:** 61,467 prompt–image pairs
- **License:** **CC-BY 4.0**, collected via Lexica's official API per ToS,
  disclosed to Lexica.
- **Verdict:** Cleanest Lexica-derived corpus. Still SD-era, still not
  asset-aware, but defensible provenance. Best use: retrieval corpus for
  prompt nearest-neighbour lookup inside `enhance_prompt`.

### T2I-CompBench / T2I-CompBench++

- **URL:** <https://github.com/Karine-Huang/T2I-CompBench>
- **Size:** 6,000 prompts (v1), 8,000 prompts (++), **text only**
- **License:** **MIT** (prompts + eval code).
- **Asset-relevance:** None. Compositional natural-image prompts.
- **Verdict:** Pure eval use. First-class input to our compositional
  benchmark run, reported per the 03-category auto-QA plan.

## 3. Preference / reward-model datasets

### HPSv2 / HPD v2 and HPSv3

- **URLs:** <https://github.com/tgxs002/HPSv2> · `zhwang/HPDv2` ·
  <https://github.com/MizzenAI/HPSv3>
- **Size:** 798k pairwise comparisons (v2); v3 extends to 1M+
- **License:** **Apache-2.0** on code and annotations.
- **Asset-relevance:** Low — categories are animation / concept-art /
  painting / photo; no logo/icon/favicon split. Comparative use only.
- **Commercial training?** Yes for reward-model weights.
- **Eval:** Primary ranking reward for best-of-N.

### PickScore / Pick-a-Pic v2

- **URL:** <https://huggingface.co/datasets/yuvalkirstain/pickapic_v2>
- **Size:** ~1M pairwise preferences on SD-1.5 / SDXL / Dreamlike outputs
- **License:** Code **MIT**; dataset card has no explicit licence; paper and
  repo framing treat it as research-permissive, de-facto used commercially.
- **Asset-relevance:** Low (consumer T2I).
- **Commercial training?** Grey — safe as reward signal, risky as pixel source.

### ImageReward (`ImageRewardDB`)

- **URL:** <https://huggingface.co/datasets/zai-org/ImageRewardDB>
- **Size:** 137k expert comparisons on SD-1.5 outputs
- **License:** **Apache-2.0** on code and dataset.
- **Asset-relevance:** Low-moderate. Small text-rendering / graphic-design
  slices exist but not at scale.
- **Verdict:** **Cleanest preference dataset for commercial reward-model
  training** — Apache-2.0, explicit, small enough to vet by hand.

## 4. Logo / brand / icon datasets

### LLD — Large Logo Dataset (Sage et al., CVPR 2018)

- **URL:** <https://data.vision.ee.ethz.ch/sagea/lld/>
- **Size:** 548k × 32² favicons (Alexa 1M) + 123k × 400² Twitter logos
- **License:** No explicit dataset licence; code MIT; source pixels are
  third-party trademarks. Research-grade only.
- **Asset-relevance:** High distributionally (literal favicons), low
  label-wise (no brand/palette/font metadata).
- **Verdict:** Eval and retrieval yes; commercial training on 548k
  unlicensed trademarks is "do not".

### Logo-2K+

- **URL:** <https://github.com/msn199959/Logo-2k-plus-Dataset>
- **Size:** 167k images · 2,341 logo classes
- **License:** **Non-Commercial.** Hard-pass for training.

### WiRLD — Wikidata Reference Logo Dataset

- **URL:** <https://github.com/Abhiram4572/LogoIdent>
- **Size:** 100k logos, one per Wikidata entity
- **License:** Not declared. Wikidata structured data is CC0 but logo files
  are typically Wikipedia fair-use (non-free) — labels CC0-clean, pixels
  trademarked.
- **Verdict:** Labels are a goldmine (canonical brand → class-name map for
  negative-prompt building and brand-name sanitizing); pixels unsafe.

### L3D — Large Labelled Logo Dataset (EUIPO registry)

- **URL:** <https://lhf-labs.github.io/tm-dataset/> · Zenodo
  [10.5281/zenodo.5771006](https://doi.org/10.5281/zenodo.5771006)
- **Size:** ~770k × 256² EUIPO-registry trademarks with Vienna-classification
  figurative-element labels
- **License:** Zenodo release CC-BY-4.0; repo MIT; EUIPO registry is EU
  open-data.
- **Asset-relevance:** **Highest of any logo corpus surveyed** — 770k real
  registered trademarks with structured labels; closest thing to training
  data for "a bird facing left holding an olive branch" that exists.
- **Commercial training?** **Grey.** CC-BY-4.0 permits use-with-attribution,
  but underlying images are still trademarks — training a *generator* on
  them and emitting near-duplicates is a trademark-dilution problem even if
  not a copyright problem. Treat as "train a classifier / Vienna-code
  tagger, do not train a generator".
- **Eval / retrieval:** Both, safely.

### FlickrLogos-32, BelgaLogos, FlickrBelgaLogos, METU Trademark

- **Size:** 8k / 10k / 10k / 923k respectively
- **License:** All four are research-only on request. METU is the largest
  pre-training logo corpus available but access is form-gated.
- **Verdict:** Research/eval only.

### Iconify `icon-sets`

- **URL:** <https://github.com/iconify/icon-sets>
- **Size:** 275k+ icons across 150+ sets in unified IconifyJSON format
- **License:** Wrapper MIT; each set carries its own (MIT / Apache-2.0 /
  CC-BY-4.0 / OFL / CC-0, plus a few restrictive). `icon-sets.info.json`
  records per-set licence — filtering to MIT/Apache/CC-0 still yields >150k.
- **Asset-relevance:** The compositional corpus (20b controversy 3). Not
  pixel training data; *is* supervised data for an "iconic single-glyph →
  known mark" classifier inside `enhance_prompt` for
  compose-don't-generate routing.
- **Commercial:** Yes, with per-set filter.

### RICO Semantics

- **URL:** <https://github.com/google-research-datasets/rico_semantics>
- **Size:** 9,300 Android apps · 66k UI screens · ~500k icon annotations
  (350k shape + 78k semantic + 66k text labels)
- **License:** **CC BY-SA 4.0** on the semantic annotations.
- **Asset-relevance:** Only sizeable public dataset of in-app icon
  screenshots with function labels. Useful for (a) a classifier that
  detects whether an icon communicates its function at target size, (b)
  grounding examples for "sparkline icon for a trading app" prompts.
- **Commercial training?** CC-BY-SA 4.0 is copyleft — safe for eval or
  share-alike tooling, **not safe** for proprietary closed-weight training.
  Fine as an inference-time retrieval corpus.

## Integration recommendations

**The license-clean asset-aware training corpus does not exist today.** Every
dataset surveyed is either (i) license-clean but asset-irrelevant (ImageReward,
HPSv2, T2I-CompBench, DiffusionDB), (ii) asset-relevant but license-restricted
(JourneyDB, Logo-2K+, METU, LLD), or (iii) adjacent but structurally wrong for
pixel training (RICO screenshots, WiRLD trademark labels). V1 has to route
around this.

**The five datasets I'd actually use, in priority order:**

1. **ImageReward / ImageRewardDB (Apache-2.0, 137k pairs)** — primary
   commercial-safe reward-model fine-tune base. Extend with internal pairs
   targeting asset-specific axes (transparency correctness, text legibility,
   palette adherence) per the 20e `validate_asset` gap.
2. **HPSv2 / HPSv3 (Apache-2.0, 800k + 1M pairs)** — secondary reward signal
   and best-of-N ranker. Weak on our domain distribution, strong on general
   aesthetics; use as an ensemble partner per the 03c controversy on
   preference-vs-alignment.
3. **T2I-CompBench++ (MIT, 8k prompts)** + **GenEval 2** + **ConceptMix
   k∈{3,5,7}** — the offline comparability layer. None asset-aware, but
   passing these is table-stakes for an honest evaluation story.
4. **Iconify `icon-sets` (per-set, mostly MIT/Apache/CC-0, 275k icons)** —
   compositional corpus for the "compose, don't generate" route and for
   nearest-neighbour classifier training. Also the retrieval corpus for
   `enhance_prompt`'s "did they mean this existing mark?" disambiguation.
5. **L3D (CC-BY-4.0, 770k EUIPO trademarks)** — *classifier* training only
   (Vienna-code tagger, figurative-element detector). Do not train a
   generator on it; do train a `validate_asset` lint that flags "this
   generated logo is suspiciously close to registered mark #X" using L3D +
   WiRLD as the retrieval index.

**Honest assessment on the core question.** A license-clean corpus for
training an **asset-aware prompt rewriter** *is* assembleable today if we
redefine the task as text-pair (prompt → enhanced prompt) rather than
(prompt → image) pixel generation. We can synthesize
`(intent, ideal_prompt, target_model, asset_type)` tuples ourselves by
running our own generations through the Tier 1–4 validation pipeline from
the 03 index, filtering for validators-passed outputs, and logging
(request, winning_rewrite) pairs — a self-play / RLAIF loop in the Hunyuan
AlignEvaluator mold, with asset-specific reward heads. That closes G1 at
bootstrap cost while keeping the corpus under our own licence.

A license-clean corpus for training an **asset-aware image generator**
(logo/icon base model) at commercial quality **cannot** be assembled from
public data today. L3D is the only plausible source at scale, and even
there the trademark-dilution risk makes it a classifier corpus, not a
generator corpus. The path forward matches the 20b recommendation: route
to commercially-licensed hosted models (Imagen 4, `gpt-image-1`, Recraft V3,
Flux Schnell Apache-2.0) and put our training effort into the *rewriter*
and the *validator*, not a proprietary T2I base. The asset layer we own is
correctness and routing; the pixel layer we rent.
