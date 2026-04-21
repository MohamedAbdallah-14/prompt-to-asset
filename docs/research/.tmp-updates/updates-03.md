# Updates: 03-evaluation-metrics
**Audit date:** 2026-04-21
**Auditor:** Claude Sonnet 4.6 (automated research audit)

## Files modified:
- `3a-clip-alignment-metrics.md`: Added VQAScore industry-adoption update (Imagen 3/4, ByteDance Seed, NVIDIA), L-VQAScore variant, video extension, and VQQA framework citation.
- `3b-fid-perceptual-metrics.md`: Added Fréchet Wavelet Distance (FWD, ICLR 2025) as an emerging distributional metric to watch.
- `3d-compositional-benchmarks.md`: Clarified GenEval saturation severity (96.7% human score for Gemini 2.5 Flash Image); confirmed ConceptMix has no 2025/2026 update with frontier models; added T2I-CoReBench (ICLR 2026) as a new benchmark covering compositional reasoning.
- `3e-asset-specific-eval.md`: Updated STRICT-Bench status (now accepted EMNLP 2025, broader model set evaluated); updated Recraft SOTA reference from V3 to V4; updated TL;DR with STRICT-Bench GPT-4o/Gemini 2.0 text-rendering leadership.
- `SYNTHESIS.md`: Added 2026-04-21 audit notice at top; updated item 4 (GenEval saturation severity + T2I-CoReBench note); updated item 10 (Recraft V4, STRICT-Bench EMNLP 2025, GPT-4o/Gemini text-rendering leadership); updated ConceptMix gap (confirmed no frontier-model update); updated VLM-as-judge section; added T2I-CoReBench to primary sources.

## Files with no changes required:
- `3c-human-preference-models.md`: Claims are accurate. HPSv3 confirmed at ICCV 2025 with open-source code/weights. Star counts are approximate. A new PAM personalized preference dataset exists (2025) but does not invalidate existing claims. No errors found.
- `index.md`: Accurate directory index; no factual claims to check.

## Outdated/false claims corrected:

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `3a-clip-alignment-metrics.md` | VQAScore described without noting industry-standard adoption | VQAScore/GenAI-Bench adopted by Google DeepMind (Imagen 3/4), ByteDance Seed, NVIDIA as of 2025 | github.com/linzhiqiu/t2v_metrics; blog.ml.cmu.edu/2024/10/07/vqascore |
| `3a-clip-alignment-metrics.md` | No mention of L-VQAScore or video-VQAScore extensions | L-VQAScore (localized variant, 2025) and video support (20+ VLMs) now exist | github.com/intelligolabs/L-VQAScore |
| `3b-fid-perceptual-metrics.md` | No mention of FWD as emerging alternative | Fréchet Wavelet Distance (FWD) published at ICLR 2025 as domain-agnostic distributional metric | openreview.net/forum?id=QinkNNKZ3b |
| `3d-compositional-benchmarks.md` | GenEval saturation stated as "up to 17.7 pp" absolute error | Confirmed more severe: Gemini 2.5 Flash Image reaches 96.7% human score while original GenEval substantially undercounts it | arxiv.org/abs/2512.16853 |
| `3d-compositional-benchmarks.md` | ConceptMix gap described as a future opportunity | Confirmed active gap as of April 2026: no FLUX/SD3/Gemini results published on ConceptMix | princetonvisualai.github.io/conceptmix |
| `3d-compositional-benchmarks.md` | No mention of T2I-CoReBench | T2I-CoReBench (ICLR 2026) introduces compositional+reasoning benchmark; 28 SOTA models all fail on reasoning dimension | arxiv.org/abs/2509.03516 |
| `3e-asset-specific-eval.md` | "Recraft V3 is strongest at long strings and vector output" | Recraft V4 (2025–2026) supersedes V3; holds HuggingFace T2I Arena #1 (ELO 1172, 72% win rate); generates native editable SVG | recraft.ai/docs/recraft-models/recraft-V4; wavespeed.ai |
| `3e-asset-specific-eval.md` | STRICT-Bench described as 2025 preprint | STRICT-Bench accepted EMNLP 2025; GPT-4o and Gemini 2.0 lead by large margin across models tested | arxiv.org/abs/2505.18985 |
| `SYNTHESIS.md` | Item 10: "Recraft V3 for long strings" | Updated to Recraft V4 + STRICT-Bench EMNLP 2025 GPT-4o/Gemini 2.0 text-rendering leadership | See above |
| `SYNTHESIS.md` | Item 4: GenEval drift described only as "up to 17.7 pp" | Severity confirmed: Gemini 2.5 Flash Image 96.7% human score; T2I-CoReBench adds reasoning gap | arxiv.org/abs/2512.16853; arxiv.org/abs/2509.03516 |

## Claims verified as still accurate (no changes needed):

| File | Claim | Verified |
|------|-------|---------|
| `3c-human-preference-models.md` | HPSv3 is ICCV 2025, open-source, Qwen2-VL backbone, HPDv3 1.08M pairs | Confirmed via openaccess.thecvf.com/ICCV2025 |
| `3c-human-preference-models.md` | Best-of-N with N=4–8 captures most quality gain | Consistent with current literature |
| `3c-human-preference-models.md` | MPS has four conditioned heads (aesthetic/alignment/detail/overall) | Confirmed via paper |
| `3a-clip-alignment-metrics.md` | SigLIP 2 (Feb 2025) beats SigLIP at all scales | Confirmed: 2–3 pp improvement on ImageNet/retrieval, up to +5 mIoU on dense tasks |
| `3a-clip-alignment-metrics.md` | CLIPScore bag-of-words failure on compositional prompts | Still valid; VQAScore addresses this |
| `3b-fid-perceptual-metrics.md` | CMMD + FD-DINOv2 recommended over FID for T2I | Still the community recommendation |
| `3d-compositional-benchmarks.md` | T2I-CompBench++ evaluated FLUX.1 and SD3 | Confirmed: FLUX.1 results added Nov 2024; SD3 adopted the metric |
| `3d-compositional-benchmarks.md` | GenEval 2 (arXiv:2512.16853) is the recommended successor | Confirmed; still the right recommendation |
| `3e-asset-specific-eval.md` | LayerDiffuse 97% user preference over matte pipelines | Still cited in active literature; ART (CVPR 2025) and OmniPSD build on it |
| `3e-asset-specific-eval.md` | DINOv2 > CLIP for style/brand consistency | Confirmed via fruit-SALAD 2025 and ongoing DINOv2 style retrieval work |

## Notes for future audits:
- Check if L-VQAScore gains traction as a standard for attribute-binding evaluation (currently a 2025 preprint)
- Check if FWD (Fréchet Wavelet Distance) gets adopted beyond ICLR 2025
- Run ConceptMix on Gemini 3, FLUX 2, and Recraft V4 — no published results exist; high publishability
- Monitor Recraft V4 Pro for native vector generation becoming an industry standard path
- T2I-CoReBench reasoning scores for 2026 models warrant a follow-up audit once more models report results
