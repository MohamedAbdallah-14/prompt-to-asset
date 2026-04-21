---
category: 03-evaluation-metrics
role: category-index
title: "Evaluation Metrics — Category Index and Synthesis"
status: draft
last_updated: 2026-04-19
angle_count: 5
angles:
  - slug: 3a-clip-alignment-metrics
    title: "CLIPScore, BLIP, VQAScore, TIFA, DSG — Vision-Language Alignment"
  - slug: 3b-fid-perceptual-metrics
    title: "FID, KID, IS, LPIPS, DINOv2, CMMD — Perceptual Fidelity"
  - slug: 3c-human-preference-models
    title: "PickScore, HPSv2/v3, ImageReward, MPS, RAHF — Human Preference"
  - slug: 3d-compositional-benchmarks
    title: "GenEval(/2), T2I-CompBench++, DPG-Bench, ConceptMix, Gecko, HEIM"
  - slug: 3e-asset-specific-eval
    title: "Logo / Icon / Favicon / App-Icon — Asset-Specific Evaluation"
primary_takeaway: >
  The 2024-2026 consensus is that no single metric suffices for asset generation.
  Build a layered auto-QA gate: cheap embedding pre-filter (SigLIP 2), compositional
  QA metric (VQAScore or Gecko-QA) as the semantic truth signal, domain-specific
  lints (OCR, alpha histogram, platform-mask IoU) for asset constraints, and a
  pairwise VLM-as-judge (GPT-4o / Gemini 2.5) for brand-level judgment. Never gate
  on CLIPScore alone. Never gate on FID below 10k samples. Never gate on GenEval v1
  in 2026.
tags:
  - evaluation
  - auto-qa
  - vqascore
  - cmmd
  - dinov2
  - hpsv3
  - geneval-2
  - conceptmix
  - vlm-as-judge
  - ocr-score
  - layerbench
  - brandpackscore
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

> **Updated 2026-04-21 (audit):** Key changes since initial draft — (1) **VQAScore** has reached industry-standard status: Imagen 3/4 (Google DeepMind), ByteDance Seed, and NVIDIA all report GenAI-Bench as a primary eval. (2) **GenEval** saturation is now confirmed to be more severe than the 17.7 pp figure — Gemini 2.5 Flash Image achieves 96.7% under human raters vs. a much lower GenEval score. (3) **T2I-CoReBench** (ICLR 2026) is a new compositional+reasoning benchmark covering 12 dimensions; adds "reasoning" as a dimension no prior benchmark tested. (4) **Recraft V4** (2025–2026) supersedes V3 for native SVG generation and logo evaluation; it holds the HuggingFace T2I Arena #1 slot (ELO 1172). (5) **STRICT-Bench** is now accepted (EMNLP 2025); GPT-4o and Gemini 2.0 lead text-rendering accuracy by a large margin. (6) **FWD** (Fréchet Wavelet Distance, ICLR 2025) is an emerging distributional metric worth tracking; CMMD + FD-DINOv2 remain the recommendation. (7) **ConceptMix** gap confirmed: no 2025/2026 update with FLUX/SD3/Gemini models published as of April 2026.


# Evaluation Metrics — Category Index

Five angles, covering the full span from "is the image vaguely on-prompt?" (CLIPScore) to "does this logo survive Android adaptive masking at 16px?" (platform-compliance lints). This index stitches them into a single opinionated auto-QA pipeline for the prompt-to-asset plugin and flags where the 2026 literature has moved since earlier model-card evals.

## Category Executive Summary (15 insights)

1. **CLIPScore is a bag-of-words metric in disguise.** The text encoder behaves near-linearly in word order on compositional prompts — `"moon over cow"` ≈ `"cow over moon"` — so absolute-score deltas below ~2 points on compositional prompts are noise, not signal (3a, citing Lin 2024 and Yuksekgonul 2023).
2. **FID is not trustworthy below 10k samples and systematically penalizes modern diffusion.** Chong & Forsyth (2020) proved the estimator is generator-dependent biased at finite N; Stein et al. (NeurIPS 2023) showed Inception-v3 features misrank SOTA diffusion models that humans actually prefer. The community is moving to **FD-DINOv2** and **CMMD** as replacements (3b).
3. **VQAScore is the current default pick for per-image alignment.** One VQA forward pass of `"Does this figure show <prompt>? yes/no"` beats CLIPScore, PickScore, and ImageReward by 2–3× on compositional prompts on GenAI-Bench, and is trivially explainable at the prompt-level (3a, citing Lin et al. ECCV 2024).
4. **GenEval v1 saturated in 2025 and drifts up to 17.7 pp from human judgment** — and the problem is more severe in practice: Gemini 2.5 Flash Image achieves **96.7% under human raters** while scoring far lower on the original GenEval leaderboard. Anyone optimizing a prompt-to-asset against GenEval alone in 2026 is chasing a broken oracle. GenEval 2 (Dec 2025, Soft-TIFA-based) fixes most of this and is the recommended successor (3d). A newer benchmark, T2I-CoReBench (ICLR 2026), adds compositional *reasoning* evaluation across 12 dimensions — 28 SOTA models all score poorly on reasoning, which is a new and actionable gap (3d, updated 2026-04-21).
5. **Compositional skill collapses with concept count.** ConceptMix shows even DALL·E 3 drops from 0.83 accuracy at k=1 concepts to 0.08 at k=7; every open model hits ~0 by k=6. This is the single strongest published argument for *why* prompt rewriting must exist — the enhancer must test its gains at k≥3 or it's not measuring what it claims (3d).
6. **Pairwise is the only reliable VLM-judge mode.** MLLM-as-a-Judge (Chen et al. ICML 2024) shows GPT-4V is reasonably human-correlated in pairwise A/B mode and *unreliable* at absolute scoring or batch ranking. Our auto-QA must phrase rubric questions as "A vs B" or "does A satisfy X? yes/no" — never "rate 1–10" (3a, 3e).
7. **Human-preference scores ≠ alignment scores.** PickScore / HPSv2 / HPSv3 / ImageReward measure overall "goodness" — dominated by aesthetics. They cannot be used as faithfulness gates (Lin 2024 beats them on compositional prompts by 2–3×). Use them for inference-time best-of-N ranking, not for the alignment decision (3a, 3c).
8. **Best-of-N with HPSv3 or HPSv2.1 is the highest-ROI quality lever.** N=4–8 captures most of the gain with diminishing returns past N≈16; ensembling two rewards (HPSv2 + PickScore, or MPS-alignment + MPS-aesthetics) suppresses reward hacking (3c).
9. **MPS is the only public metric that separates "did the rewrite improve *alignment*" from "did it improve aesthetics."** Its four conditioned heads (aesthetic / alignment / detail / overall) are exactly the decomposition a prompt-to-asset evaluation needs, and no scalar reward gives you this (3c).
10. **Text rendering inside assets is the single most measurable failure and has purpose-built benchmarks.** OCRGenBench's OCRGenScore, MARIO-Eval, and STRICT-Bench operationalize OCR-roundtrip + character-drop + multi-scale legibility. Ideogram V3 is the industry reference point for in-image text; **Recraft V4** (not V3 — superseded in 2025–2026) for long strings and native SVG. STRICT-Bench (now EMNLP 2025) shows GPT-4o and Gemini 2.0 lead text accuracy by a large margin over all other models (3e, updated 2026-04-21).
11. **Alpha-channel evaluation has its own specialized metrics and SAD/MSE are actively misleading.** From the alphamatting.com benchmark, **Gradient error** and **Connectivity error** correlate ~0.75 with human judgment versus ~0.3 for SAD/MSE. For native-RGBA models, LayerBench's non-reference alpha-edge metric is the only published option (3e).
12. **DINOv2 beats CLIP for style/brand consistency.** Self-supervised features encode palette, stroke, composition rather than semantic class. fruit-SALAD (2025, *Scientific Data*) and StarVector's DinoScore both show DINO > CLIP for style retrieval — the right primitive for "is this asset pack on-brand?" (3e).
13. **Platform compliance for app icons is a lint problem, not a perception problem.** Apple HIG requires opaque 1024×1024 with 80% safe area; Android adaptive requires two 108dp layers with a 66dp safe zone plus a monochrome layer. No perceptual metric captures these — they require programmatic checks (3e).
14. **No public benchmark targets the prompt-to-asset's actual distribution.** T2I-CompBench++, GenEval, DPG-Bench, ConceptMix, Gecko all use natural-image prompts; there is no "logo + favicon + app icon + OG image brand-pack" benchmark. This is the largest and most actionable gap in the literature (3d, 3e).
15. **Judge-model leakage is real.** VLM-based benchmarks (DPG-Bench, ConceptMix, CompBench++ GPT-4V mode) reward prompts that look VLM-pleasing. An enhancer that injects boilerplate ("a high-quality photograph of…") can lift scores without improving generation. Counter with Gecko (human-calibrated) or multi-metric ensembling (3d).

## Map of the Angles

| Angle | File | Scope | Where it leads |
|---|---|---|---|
| **3a** | `3a-clip-alignment-metrics.md` | Per-image alignment: CLIPScore, SigLIP 2, BLIP-2 ITM, TIFA, DSG, VQAScore, VIEScore, MLLM-as-a-Judge | Picks the alignment primitive: VQAScore is the default; DSG is the diagnostic mode; VLM-judge is the explainable mode |
| **3b** | `3b-fid-perceptual-metrics.md` | Distribution-level + reference-based perceptual: IS, FID, KID, LPIPS, FD-DINOv2, CMMD | Picks the batch-quality primitive: CMMD + FD-DINOv2; retires FID as a decision metric |
| **3c** | `3c-human-preference-models.md` | Scalar preference models: LAION Aesthetic, ImageReward, PickScore, HPSv2/v2.1/v3, MPS, RichHF/RAHF | Powers best-of-N selection and RLHF for style LoRAs; MPS gives the dimension-conditioned signal the enhancer needs |
| **3d** | `3d-compositional-benchmarks.md` | Prompt-set leaderboards: GenEval(/2), T2I-CompBench++, DPG-Bench, ConceptMix, Gecko, HEIM, EvalCrafter | Picks the offline benchmark set: GenEval 2 + ConceptMix(k=3,5) + Gecko for external comparability |
| **3e** | `3e-asset-specific-eval.md` | Logo / icon / favicon / app-icon: text legibility, alpha correctness, platform lints, brand-pack consistency, small-size squint | Supplies the domain-specific lints the generic metrics can't see; proposes `BrandPackScore` and `ComplianceScore` composites |

The angles are layered rather than parallel: **3a** gives you the per-image semantic verdict, **3b** tells you how the batch distribution shifted, **3c** gives you a ranking signal, **3d** gives you external leaderboard comparability, and **3e** adds the domain guardrails that generic T2I eval misses.

## Cross-Cutting Patterns

**The "layered pipeline" consensus.** All five angles converge on the same shape: cheap embedding pre-filter → compositional QA → domain/brand lints → VLM-judge on the short list. 3a lays it out as SigLIP 2 → VQAScore/DSG → VIEScore. 3c gives the same shape for preference (fast scalar reward → ensemble → CoHP iteration). 3e adapts it for assets (OCR + alpha + platform lint → DINOv2 style → pairwise VLM). It's the field's answer to "no single metric is both cheap and correct."

**Feature-extractor swap is the dominant improvement axis.** 3b (FID → FD-DINOv2 / CMMD), 3a (CLIP → SigLIP 2 / LongCLIP), 3e (CLIP → DINOv2 for style, BLIP-VQA → CLIP-FlanT5 for alignment) all tell the same story: metric shape is often fine, but 2020-era CLIP/Inception backbones are the weak link. Pin specific checkpoints and rotate on a 12-month cadence.

**QA-decomposition beats global similarity on compositional prompts.** TIFA, DSG, VQAScore (3a), ConceptMix, Gecko, GenEval 2 (3d), OCRGenScore (3e), and VIEScore's three-axis decomposition all share the same trick: reduce "does X match Y" to atomic yes/no questions and aggregate. This is what gives us explainability — per-question passes map directly onto prompt-rewrite decisions.

**Pairwise over scalar.** 3a (MLLM-as-a-Judge), 3c (Pick-a-Pic, Diffusion-DPO), 3d (GenEval 2 Soft-TIFA), and 3e (VIEScore pair-mode) independently conclude that pairwise A/B is more reliable than absolute scoring. Our rubric prompts must follow this.

**Saturation is everywhere.** GenEval top-10 within 3 points, DPG-Bench within 2, HPSv2 converging on the same distribution. Top-of-leaderboard deltas are within noise. Use *controllable difficulty* (ConceptMix k=3/5/7) and *domain-specific prompts* (3e) to detect real gains.

## Controversies / Disagreements

**Is FID still worth reporting?** 3b's CMMD line says no (Gaussianity assumption breaks on T2I; FID can improve while quality degrades); Stein et al. say "keep the shape, swap the backbone to DINOv2." Position: report FID-50k as a legacy column only, CMMD or FD-DINOv2 as the decision metric.

**Is CLIPScore dead?** 3a calls it a bag-of-words metric; 3e treats it as "fine as a pre-filter, blind to spelling." With LongCLIP or SigLIP 2 backbones it's still the cheapest reasonable similarity signal. Position: pre-filter only, never the final gate.

**Human-preference vs alignment — which is "real"?** 3c argues PickScore / HPSv3 are the best proxy for user-facing quality; 3a argues they're aesthetic proxies and VQAScore is the alignment truth. They measure different things; the common mistake is conflating them. MPS (3c) is the only metric that admits this with separate heads.

**VLM-judge reliability.** VIEScore reports GPT-4o Spearman ≈ 0.40 vs 0.45 human-human ceiling; MLLM-as-a-Judge finds position/verbosity bias. Reconcile: pairwise mode only, structured rubric, calibrated against 50–100 human pairs per asset class.

**How many benchmarks to report.** 3d prefers GenEval 2 + ConceptMix at variable k; 3c prefers two preference models + MPS; 3e adds lints no generic benchmark covers. Position: 1 alignment (VQAScore) + 1 preference (HPSv3) + 2 benchmarks (GenEval 2 + ConceptMix) + 3e lints is the minimum viable.

## Gaps

1. **No brand-pack benchmark.** The public literature has single-image logo generation (LogoSticker, IconShop, LogoDiffuser — 3e) but no benchmark that evaluates a *set* of assets (logo + favicon + app icon + OG image) as a consistent system. This is exactly the prompt-to-asset's output unit. `BrandPackScore` (3e §4d) is a grounded composite proposal; nothing is validated yet.
2. **Logo domain is out-of-distribution for HPSv2/v3.** HPD v2/v3 uses animation/concept-art/painting/photo categories — no logo/icon/favicon category exists. Preference scores are usable only comparatively, not absolutely, for our use case (3c, 3e).
3. **Alpha halo lacks a ground-truth dataset.** LayerBench's non-reference metric is the only option; no public human-labeled halo-quality set exists (3e).
4. **Platform-mask survival has no academic benchmark.** Android adaptive-icon cropping is silently a failure mode; no published metric quantifies "would this survive circle/squircle/teardrop masks?" The mask-IoU composite in 3e §3d is implementable but unvalidated.
5. **Small-size (16×16 / 32×32) legibility has HCI coverage but no CV benchmark.** Lin 2007, Hou 2022 give human rating evidence; no T2I benchmark tests favicon-scale legibility.
6. **ConceptMix has no 2025/2026 update with FLUX/SD3/Gemini 2.5/Gemini 3** — confirmed gap as of April 2026. The DALL·E 3 baselines in the published leaderboard are now 2+ years old. Running ConceptMix on current SOTA is itself a publishable contribution (3d, confirmed 2026-04-21).
7. **No VQAScore variant tuned for assets.** CLIP-FlanT5 was trained on natural-image VQA; a logo-tuned VQA head would likely shift the ceiling meaningfully (3a, 3e).

## Actionable Recommendations for the Plugin's Auto-QA Subsystem

The plugin consumes a user request ("transparent logo for my note app"), invokes generation (Gemini / Imagen / GPT-Image / DALL·E 3 / Flux), and must gate the output before returning it. Below is the proposed auto-QA stack.

### Metrics to run (by tier)

**Tier 0 — Pre-filter (cost: ~50ms, runs on every candidate).**
- **SigLIP 2 image-text similarity** (`google/siglip2-so400m-patch14-384`) as a drop-in CLIPScore. Retire OpenAI CLIP-L/14 as the default backbone in 2026 per 3a / 3b convergence.
- **Basic image-integrity checks**: resolution, mode (RGB/RGBA), aspect ratio, no full-black/full-white output (degenerate generation).

**Tier 1 — Per-image alignment (cost: ~1–3s, runs on top-K candidates).**
- **VQAScore** via `linzhiqiu/CLIP-FlanT5` or GPT-4o single-question mode (3a). This is the primary alignment decision metric.
- **DSG diagnostic mode** (`j-min/DSG`) when VQAScore is borderline: decompose the prompt into a dependency graph, answer each question, return per-question pass/fail. This is what the prompt-rewrite loop iterates on.

**Tier 2 — Asset-specific lints (cost: ~500ms, runs only for domain-matched requests).**
- **Text legibility** (logos, wordmarks, favicons with text): OCR roundtrip via PaddleOCR or GPT-4o-OCR; compute CER + character-drop rate + drop-size (at 64/32/16 px downsamples). OCRGenScore-style if text is specified (3e §1).
- **Alpha correctness** (any transparent asset): bimodal histogram check on alpha channel (mass at 0 and 1, <10% in mid-range); render against black + white + checker backgrounds and diff the foreground; Gradient + Connectivity alpha-matting errors against a matted reference when available (3e §2).
- **Platform compliance** (app icons, favicons): safe-zone mass ratio, mask-survival IoU (circle/squircle/square/teardrop), monochrome-layer presence for Android, 1024×1024 opaque check for iOS, aspect/size match, PWA manifest lint (3e §3).
- **Small-size squint** (favicons, app icons): downsample to 64/32/16; re-OCR; WCAG contrast ratio against white and dark backgrounds (3e §5).

**Tier 3 — Preference ranking (cost: ~200ms per image, runs when N≥2 candidates).**
- **HPSv3** (`MizzenAI/HPSv3`, PyPI `hpsv3`) as the primary ranking reward for best-of-N (3c). Fallback: HPSv2.1.
- **MPS alignment head** as a second opinion — specifically the alignment head, not overall (3c). Ensembling two rewards suppresses reward hacking.
- **DINOv2 cosine** against a brand reference image when the user has supplied one — this is the brand-consistency check (3e §4).

**Tier 4 — VLM-as-judge (cost: ~3–8s, runs on top-2 only).**
- **Pairwise A/B via Gemini 2.5 Flash or GPT-4o** on a structured rubric (see VLM-judge setup below). Pairwise only, never absolute scoring (3a §3, 3e §6).

**Batch-level diagnostics (not per-request gates, but quality dashboards).**
- **CMMD** (google-research/cmmd) against a curated in-domain reference set. Tracks whether enhancer upgrades shift the distribution up (3b).
- **FD-DINOv2** (layer6ai-labs/dgm-eval) as a second opinion.
- **GenEval 2** and **ConceptMix k=3,5** runs on a fixed 200-prompt internal eval set, monthly.

### Thresholds to gate on

These are proposed defaults. All are calibrated-by-sampling targets, not ground truth — ship with the values below, run a 200-pair human A/B calibration, adjust.

| Gate | Metric | Pass threshold | Rationale |
|---|---|---|---|
| Pre-filter | SigLIP 2 similarity | ≥ 0.22 | Below this is near-guaranteed mismatch; calibrated on in-domain pairs |
| Alignment | VQAScore (P("Yes")) | ≥ 0.70 | Empirically separates aligned from unaligned on GenAI-Bench |
| Alignment (borderline) | DSG pass rate | ≥ 0.80 of atomic questions | From DSG paper defaults |
| Text fidelity | OCR CER against target string | ≤ 0.05 | 1 char off in a 20-char wordmark |
| Text legibility | Char-drop rate at 32 px | 0 | Hard gate — if it drops chars at favicon scale, reject |
| Alpha | Mid-range alpha mass (0.1–0.9) | ≤ 10% of non-zero mask area | Bimodal alpha histogram requirement from 3e §2c |
| Alpha | Fringe color bleed (ΔE) | ≤ 5 | Premultiplied-vs-straight mismatch detector |
| Platform — iOS | Safe-zone mass ratio | ≥ 0.95 in inner 80% | Apple HIG requirement |
| Platform — Android | Mask-survival IoU (circle/squircle/square) | ≥ 0.95 vs un-masked reference | Cross-mask robustness |
| Preference | HPSv3 vs best-in-batch | rank-1 or within 0.02 of top | Best-of-N selection rule |
| Brand consistency | DINOv2 cosine vs reference | ≥ 0.80 | Calibrated on fruit-SALAD-style pairs |
| Final VLM judge | Pairwise win-rate vs incumbent | ≥ 50% (strict inequality for replacement) | MLLM-as-a-Judge reliability threshold |

**Hard gates** (reject and retry with rewritten prompt): pre-filter, VQAScore, text-fidelity, alpha mid-range, platform compliance.

**Soft gates** (prefer but don't block): preference scores, DINOv2 brand cosine, VLM pairwise.

### VLM-as-judge setup

The 3a/3e convergence is strong and specific:

1. **Model choice**: **Gemini 2.5 Flash** for volume (cheap multimodal, best-in-class latency); **GPT-4o** for borderline cases and calibration runs. Claude 3.5 Sonnet as a third-opinion arbiter when Gemini and GPT-4o disagree. Note: per STRICT-Bench (EMNLP 2025), GPT-4o and Gemini 2.0 lead text-rendering accuracy by the largest margin of any models tested, validating them as the primary judges for wordmark-fidelity rubric questions.
2. **Mode**: pairwise A/B only. Never absolute 1–10 scoring. Never batch ranking.
3. **Rubric structure**: decompose into atomic yes/no questions, grouped by axis — mirroring VIEScore's three axes plus asset-specific constraints:
   - **Semantic consistency** (from the prompt): 3–5 atomic questions generated by DSG-style decomposition.
   - **Perceptual quality**: 2–3 questions on artifacts, symmetry, cleanliness.
   - **Hard constraints**: transparent background? text rendered correctly? within platform safe area?
   - **Brand fit** (if reference supplied): pairwise on style/palette adherence.
4. **Prompt template** (sketched): *"You are judging two candidate assets for the request: <prompt>. For each of the following yes/no questions, pick A, B, or 'tie.' Return a JSON object with one field per question plus a final field `preferred` (A|B|tie) and a one-sentence rationale. Questions: …"*
5. **Position-bias mitigation**: randomize A/B order per request; run each comparison twice with swapped order; require agreement for a confident verdict. Drop to tie on disagreement (MLLM-as-a-Judge 2024).
6. **Calibration**: maintain a rolling 100-pair human-labeled asset-class set (logos, icons, favicons). Target Spearman ≥ 0.4 with human pairwise judgments — parity with published VIEScore SOTA. Re-calibrate monthly or on VLM version bump.
7. **Never use the VLM-judge for aesthetic ranking alone** — HPSv3 is cheaper and more reliable for that axis. The VLM's job is domain-rubric enforcement (transparency, text, brand).

### Operational notes

- **Pin backbone checkpoints**. Record the exact SigLIP 2 / DINOv2 / CLIP-FlanT5 / HPSv3 weights; small upgrades shift scores materially (3b §"Defaults and pitfalls").
- **Always log all tier scores even when an earlier gate fails** — this is the dataset we calibrate future threshold changes against.
- **Stand up the internal 200-prompt asset eval** described in 3a §5 and 3e §8. No public benchmark covers our distribution; this is the single highest-leverage quality investment the team can make.

## Primary Sources Aggregated

### Metric papers (per-image alignment)
- Hessel et al., *CLIPScore*, EMNLP 2021 — [arXiv:2104.08718](https://arxiv.org/abs/2104.08718)
- Radford et al., *CLIP* — [arXiv:2103.00020](https://arxiv.org/abs/2103.00020)
- Tschannen et al., *SigLIP 2* — [arXiv:2502.14786](https://arxiv.org/abs/2502.14786)
- Li et al., *BLIP-2*, ICML 2023 — [arXiv:2301.12597](https://arxiv.org/abs/2301.12597)
- Hu et al., *TIFA*, ICCV 2023 — [arXiv:2303.11897](https://arxiv.org/abs/2303.11897)
- Cho et al., *DSG*, ICLR 2024 — [arXiv:2310.18235](https://arxiv.org/abs/2310.18235)
- Lin et al., *VQAScore / GenAI-Bench*, ECCV 2024 — [arXiv:2404.01291](https://arxiv.org/abs/2404.01291); [arXiv:2406.13743](https://arxiv.org/abs/2406.13743)
- Ku et al., *VIEScore*, ACL 2024 — [arXiv:2312.14867](https://arxiv.org/abs/2312.14867)
- Chen et al., *MLLM-as-a-Judge*, ICML 2024 — [arXiv:2402.04788](https://arxiv.org/abs/2402.04788)
- Yuksekgonul et al., *Bags-of-Words failure*, ICLR 2023 — [arXiv:2210.01936](https://arxiv.org/abs/2210.01936)

### Metric papers (distribution / perceptual)
- Heusel et al., *FID*, NeurIPS 2017 — [arXiv:1706.08500](https://arxiv.org/abs/1706.08500)
- Salimans et al., *Inception Score* — [arXiv:1606.03498](https://arxiv.org/abs/1606.03498)
- Barratt & Sharma, *Note on IS* — [arXiv:1801.01973](https://arxiv.org/abs/1801.01973)
- Bińkowski et al., *KID*, ICLR 2018 — [arXiv:1801.01401](https://arxiv.org/abs/1801.01401)
- Zhang et al., *LPIPS*, CVPR 2018 — [arXiv:1801.03924](https://arxiv.org/abs/1801.03924)
- Chong & Forsyth, *Effectively Unbiased FID*, CVPR 2020 — [arXiv:1911.07023](https://arxiv.org/abs/1911.07023)
- Oquab et al., *DINOv2* — [arXiv:2304.07193](https://arxiv.org/abs/2304.07193)
- Stein et al., *Exposing flaws of generative metrics*, NeurIPS 2023 — [paper](https://proceedings.neurips.cc/paper_files/paper/2023/file/0bc795afae289ed465a65a3b4b1f4eb7-Paper-Conference.pdf); [layer6ai-labs/dgm-eval](https://github.com/layer6ai-labs/dgm-eval)
- Jayasumana et al., *CMMD*, CVPR 2024 — [paper](https://openaccess.thecvf.com/content/CVPR2024/papers/Jayasumana_Rethinking_FID_Towards_a_Better_Evaluation_Metric_for_Image_Generation_CVPR_2024_paper.pdf); [google-research/cmmd](https://github.com/google-research/google-research/tree/master/cmmd)

### Preference / reward models
- Kirstain et al., *Pick-a-Pic / PickScore*, NeurIPS 2023 — [arXiv:2305.01569](https://arxiv.org/abs/2305.01569); [PickScore repo](https://github.com/yuvalkirstain/PickScore)
- Wu et al., *HPSv2*, 2023 — [arXiv:2306.09341](https://arxiv.org/abs/2306.09341); [HPSv2 repo](https://github.com/tgxs002/HPSv2)
- Ma et al., *HPSv3*, ICCV 2025 — [arXiv:2508.03789](https://arxiv.org/abs/2508.03789); [HPSv3 repo](https://github.com/MizzenAI/HPSv3)
- Xu et al., *ImageReward*, NeurIPS 2023 — [arXiv:2304.05977](https://arxiv.org/abs/2304.05977); [ImageReward repo](https://github.com/THUDM/ImageReward)
- Zhang et al., *MPS*, CVPR 2024 — [arXiv:2405.14705](https://arxiv.org/abs/2405.14705); [MPS repo](https://github.com/Kwai-Kolors/MPS)
- Liang et al., *RichHF / RAHF*, CVPR 2024 — [arXiv:2312.10240](https://arxiv.org/abs/2312.10240); [richhf-18k](https://github.com/google-research-datasets/richhf-18k)
- Wallace et al., *Diffusion-DPO*, 2024 — [arXiv:2311.12908](https://arxiv.org/abs/2311.12908)
- Deng et al., *PRDP*, 2024 — [arXiv:2402.08714](https://arxiv.org/abs/2402.08714)

### Compositional benchmarks
- Ghosh, Hajishirzi, Schmidt, *GenEval*, NeurIPS 2023 — [arXiv:2310.11513](https://arxiv.org/abs/2310.11513); [geneval repo](https://github.com/djghosh13/geneval)
- Kamath et al., *GenEval 2*, Dec 2025 — [arXiv:2512.16853](https://arxiv.org/abs/2512.16853)
- Li et al. (Kling AI Research), *T2I-CoReBench*, ICLR 2026 — [arXiv:2509.03516](https://arxiv.org/abs/2509.03516)
- Huang et al., *T2I-CompBench++*, TPAMI 2025 — [arXiv:2307.06350](https://arxiv.org/abs/2307.06350); [repo](https://github.com/Karine-Huang/T2I-CompBench)
- Hu et al., *ELLA / DPG-Bench*, CVPR 2024 — [arXiv:2403.05135](https://arxiv.org/abs/2403.05135); [DPG-Bench dir](https://github.com/TencentQQGYLab/ELLA/tree/main/dpg_bench)
- Wu et al., *ConceptMix*, NeurIPS 2024 — [arXiv:2408.14339](https://arxiv.org/abs/2408.14339); [project](https://princetonvisualai.github.io/conceptmix/)
- Wiles et al., *Gecko*, ICLR 2025 — [arXiv:2404.16820](https://arxiv.org/abs/2404.16820); [repo](https://github.com/google-deepmind/gecko_benchmark_t2i)
- Lee et al., *HEIM*, NeurIPS 2023 — [arXiv:2311.04287](https://arxiv.org/abs/2311.04287); [HEIM docs](https://crfm.stanford.edu/helm/heim/latest/)
- Liu et al., *EvalCrafter* (T2V), CVPR 2024 — [arXiv:2310.11440](https://arxiv.org/abs/2310.11440)
- Liu et al., *Playground v3*, 2024 — [arXiv:2409.10695](https://arxiv.org/abs/2409.10695)

### Asset-specific evaluation
- Chen et al., *TextDiffuser / MARIO-Eval*, 2023 — [arXiv:2305.10855](https://arxiv.org/abs/2305.10855)
- *OCRGenBench / OCRGenScore*, 2025 — [arXiv:2507.15085](https://arxiv.org/html/2507.15085v4)
- *STRICT-Bench*, 2025 — [arXiv:2505.18985](https://arxiv.org/html/2505.18985v1)
- Zhang & Lvmin, *LayerDiffusion*, 2024 — [arXiv:2402.17113](https://arxiv.org/html/2402.17113v3)
- Dai et al., *Trans-Adapter / LayerBench*, 2025 — [arXiv:2508.01098](https://arxiv.org/abs/2508.01098)
- Rhemann et al., *alphamatting.com*, CVPR 2009 — [benchmark](https://alphamatting.com/eval_26.php)
- Apple, *Human Interface Guidelines — App Icons* — [docs](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- Android, *Adaptive Icons* — [docs](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- Rodriguez et al., *StarVector / DinoScore*, CVPR 2025 — [arXiv:2312.11556](https://arxiv.org/html/2312.11556v2)
- *fruit-SALAD*, *Scientific Data* 2025 — [article](http://feeds.nature.com/articles/s41597-025-04529-4)
- Sage et al., *LLD logo dataset*, CVPR 2018 — [arXiv:1712.04407](https://arxiv.org/abs/1712.04407)
- LogoSticker, ECCV 2024 — [arXiv:2407.13752](https://arxiv.org/html/2407.13752v1)
- Wu et al., *IconShop*, 2023 — [arXiv:2304.14400](https://arxiv.org/abs/2304.14400)
- Lin & Yan, *Small icon legibility*, 2007 — [paper](https://journals.sagepub.com/doi/10.2466/pms.104.1.191-200)
- Hou et al., *Icon aesthetics / complexity / concreteness*, 2022 — [paper](https://www.sciencedirect.com/science/article/pii/S0141938222001093)

### Tooling
- `torchmetrics.multimodal.CLIPScore` — [docs](https://torchmetrics.readthedocs.io/en/stable/multimodal/clip_score.html); [77-token issue](https://github.com/Lightning-AI/torchmetrics/issues/2883)
- `huggingface/evaluate` — [repo](https://github.com/huggingface/evaluate)
- Reference repos: [jmhessel/clipscore](https://github.com/jmhessel/clipscore), [Yushi-Hu/tifa](https://github.com/Yushi-Hu/tifa), [j-min/DSG](https://github.com/j-min/DSG), [linzhiqiu/CLIP-FlanT5](https://github.com/linzhiqiu/CLIP-FlanT5), [TIGER-AI-Lab/VIEScore](https://github.com/TIGER-AI-Lab/VIEScore), [stanford-crfm/helm (HEIM)](https://github.com/stanford-crfm/helm)
