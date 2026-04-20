---
category: 03-evaluation-metrics
angle: 3e
title: "Asset-Specific Evaluation (Logos, Icons, Favicons, App Icons)"
status: draft
research_value: high
last_updated: 2026-04-19
tags: [logo-eval, icon-eval, favicon, app-icon, alpha-channel, brand-consistency, ocr-score, llm-as-judge, platform-compliance]
---

# 3e — Asset-Specific Evaluation for Logos, Icons, Favicons, and App Icons

> **Research value: high** — Substantial prior art exists for each sub-dimension (text rendering, alpha correctness, vector quality, LLM-as-judge), but there is *no unified benchmark* for "brand-system" assets (logo + favicon + app-icon pack). This doc stitches the literature together and proposes a composite metric where none exists.

Generic text-to-image (T2I) metrics — FID, CLIPScore, HPSv2, PickScore, T2I-CompBench — optimize for photorealism and prompt alignment on natural images. They systematically **mis-score asset-class outputs** because:

- Logos are flat, graphic, high-contrast → FID (trained on ImageNet-style photos) penalizes the right answer.
- Favicons must survive downsampling to 16×16 → no generic metric tests legibility at that scale.
- App icons must comply with platform masks (Apple HIG, Android adaptive) → purely visual metrics can't see spec violations.
- Logos carry text — CLIPScore is famously blind to mis-spelled glyphs.
- Brand packs must be *consistent across a set*, not just correct in isolation.

This document organizes the evaluation problem into five dimensions, cites the strongest method for each, and proposes composite metrics where literature is thin.

---

## 1. Text legibility inside the asset (logos, wordmarks, favicons with text)

Logos and icons frequently embed text (brand name, initial, short tagline). This is the single most measurable failure mode of modern T2I models, and the benchmark ecosystem is mature.

| Benchmark | What it measures | How |
|---|---|---|
| **MARIO-Eval** (TextDiffuser, Chen et al. 2023) [6] | First large-scale text-rendering eval; provides MARIO-10M dataset with OCR annotations | FID + CLIPScore + OCR accuracy on rendered text |
| **OCRGenBench** (2025) [1] | 33 OCR-generative tasks, 1,060 annotated samples, bilingual (EN/ZH) | Introduces **OCRGenScore** — unified metric integrating text accuracy, aesthetic quality, and instruction following. 19 SOTA models score <60/100, failure modes: poor localization, unintended content edits, small-text collapse |
| **STRICT-Bench** (2025) [2] | Stress-tests max readable length, correctness, and instruction-compliance ratio | Multi-lingual (EN/ZH/FR); exposes attention-bottleneck failures in diffusion models at long strings |

**Practical pipeline for logo/favicon evaluation:**

1. **OCR roundtrip**: Run Tesseract / PaddleOCR / GPT-4o-OCR over the rendered image; compute Levenshtein or CER against the target string. This is MARIO-Eval's core check and is trivially adaptable.
2. **Scale-down OCR**: Downsample the generated logo to 32×32 and 16×16 before OCR; a pass at full-res that fails at favicon-res reveals stroke-weight problems.
3. **Per-glyph attention map**: STRICT shows that models fail gracefully — if a 6-char wordmark OCRs as 5 characters with one fused, the model lost a token. Track char-drop rate, not just CER.

**Empirical signal**: Ideogram V3 is the current SOTA for text-in-image rendering; Recraft V3 is strongest at long strings and vector output [24]. Use them as reference points when scoring your own outputs.

---

## 2. Alpha-channel correctness (transparent logos, RGBA icons)

This is the user's stated pain point ("weird boxes in the background"). The literature divides into (a) generated-alpha quality and (b) post-hoc matting quality.

### 2a. Native RGBA generation

- **LayerDiffuse** (Zhang et al. 2024) [3] generates RGBA directly via latent-transparency offsets added to a frozen pretrained diffusion model. User studies show **97% preference over generate-then-matte pipelines**, with output quality "comparable to Adobe Stock transparent assets".
- **Trans-Adapter** (Dai et al. 2025) [4] extends transparent handling to inpainting and introduces **LayerBench** plus a **non-reference alpha edge quality metric** — the first metric specifically targeting the jagged/halo artifacts that plague matted logos.

### 2b. Alpha matting metrics (applicable when you matte a generated RGB logo)

The `alphamatting.com` benchmark (Rhemann et al., CVPR 2009) [5] established four metrics that are still the standard:

| Metric | What it catches | Human correlation |
|---|---|---|
| SAD (sum of absolute differences) | Overall alpha error | ~0.28–0.51 (weak) |
| MSE | Squared alpha error | weak |
| **Gradient error** | Missing fine edges, fuzzy strokes | **~0.75** |
| **Connectivity error** | Fragmented foreground, broken strokes in a letterform | **~0.75** |

**For logo/icon evaluation**, Gradient and Connectivity are the metrics that matter. SAD/MSE reward smooth blurry mattes — exactly the wrong behavior for a crisp vector-style logo.

### 2c. Production-grade alpha checks (no ground truth needed)

When you have no reference alpha, derive these non-reference checks (cited pattern from LayerBench's non-reference metric [4]):

1. **Background residue**: mask the generated image with a pure black/white/checkerboard background; any visible fringe = bad alpha.
2. **Edge consistency**: compute gradient magnitude along the alpha ≈ 0.5 contour; high variance = staircased edges.
3. **Premultiplied vs straight alpha sanity**: render against red/green/blue backgrounds; color bleeding on the fringe reveals mismatched alpha convention.
4. **Histogram check**: a clean logo alpha channel is bimodal (near-0 and near-1). A strong mid-alpha mass indicates matte residue or translucency where the designer wanted a crisp edge.

---

## 3. Platform-spec compliance (app icons, favicons, OG images)

This is where asset evaluation diverges hardest from generic T2I — it's a **lint problem**, not a perception problem.

### 3a. Apple HIG (iOS app icons) [7][8]

- Master asset: **1024×1024 opaque PNG, no transparency** (iOS applies its own rounded mask).
- Safe area: keep critical elements in the **inner 80%** (10% padding on all sides).
- No pre-applied rounded corners, no drop shadows.
- One primary element; ≤2–3 colors; text discouraged unless part of the logo itself.

### 3b. Android adaptive icons [9]

- Two layers, each **108×108 dp**.
- Safe zone: central **66×66 dp** (or 72 dp circle) — anything outside gets cropped by device masks.
- Must ship a **monochrome layer** (Android 13+ theming).
- Must render correctly under circle, squircle, square, and teardrop masks.

### 3c. Favicon / web / PWA [10][13]

- favicon.ico multi-res: 16/32/48; apple-touch-icon 180; maskable icons 192/512 with 10% safe margin → **410 px inner circle** on a 512 asset.
- `@hint/hint-apple-touch-icons` [13] is a deployable lint tool that checks presence, correct `rel`, correct size, reachability.

### 3d. Programmable compliance metric (proposed)

No single paper formalizes this, so here's a grounded composite we can implement:

```
ComplianceScore = weighted_sum(
  alpha_compliance_per_platform,    # iOS=0, all-others≥1 channel as needed
  safe_zone_mass_ratio,              # fraction of pixel mass inside the platform's safe circle
  mask_survival,                     # IoU of the icon under circle / squircle / square masks vs the un-masked version
  monochrome_layer_present,          # Android 13+
  aspect_ratio_correct,              # 1:1, exact target pixel size
  manifest_lint_pass                 # @hint-style checks for web
)
```

Mask-survival IoU is directly borrowed from segmentation-eval convention and is the single most useful indicator that an icon will "feel" right on every Android shape.

---

## 4. Brand consistency across a set (logo + favicon + app icon + OG image)

The hardest and least-covered problem. No benchmark directly addresses it, so we stitch:

### 4a. Style-feature similarity

- **DINOv2 embeddings** are the current best feature for style-based retrieval [11][12]. Self-supervised training makes them sensitive to color palette, texture, and composition — exactly the axes of brand consistency. CLIP is the wrong tool here: it compresses semantic identity ("this is a leaf-shaped logo") and discards style.
- **fruit-SALAD** (2025, *Scientific Data*) [12] gives a controlled benchmark of 10 styles × semantic categories showing DINO > CLIP for style consistency.
- **StarVector / SVG-Bench** [14] introduced **DinoScore** specifically because pixel MSE scores the wrong logos higher; DinoScore tracks semantic-style fidelity for vector assets.

### 4b. Color and typography extraction

Not a published benchmark, but a defensible engineering metric:

1. Extract top-k dominant colors per asset (k-means in LAB).
2. Compute **ΔE-2000** palette distance between each pair in the brand set.
3. For wordmark assets: OCR → font classifier (e.g., DeepFont-style) → string match on font family tag.
4. Flag any pair with ΔE > threshold (≈10) as inconsistent.

### 4c. Trademark-retrieval baselines

The IP-protection literature long predates generative AI and gives a useful prior. Multi-label CNN embeddings on the EUTM dataset (76k logos) [15] improved normalized average rank from 0.040 to 0.018; the multi-label structure (shape / color / sector / semantics) is a ready-made **decomposed similarity metric** for brand-consistency scoring.

### 4d. Proposed `BrandPackScore` (composite)

```
BrandPackScore(assets) = (
  0.4 * mean_pairwise_DINOv2_cosine(assets)      # style identity
+ 0.2 * palette_ΔE_score(assets)                 # color consistency
+ 0.2 * stroke_weight_stability(assets)          # graphic-style
+ 0.1 * (1 − wordmark_font_disagreement)         # type consistency
+ 0.1 * per_asset_platform_ComplianceScore(avg)  # execution quality
)
```

Weights follow the pattern used in T2I-CompBench's sub-metric aggregation [16]. This is a design proposal — not validated — but every sub-term is separately cited.

---

## 5. Small-size scalability / squint-test

Real failure mode: a logo that reads fine at 512 px collapses into mush at 32 px. Literature here is in HCI, not CV.

- **Lin & Yan (2007)** in *Perceptual and Motor Skills* [17] found **luminance contrast** dominates small-icon legibility; chromaticity barely helps. Rule of thumb: enforce WCAG-style contrast thresholds on the generated asset against likely background colors (white / dark mode).
- **Hou et al. (2022)** [18] established three independent dimensions of icon processing — **aesthetics, visual complexity, concreteness** — each measurable via crowd-sourced ratings or modern VLM judges.
- **"Detectability / discriminability / countability"** framework from ICA 2022 cartography abstracts [19] — the discriminability leg generalizes to "does a user confuse icon A with icon B in the same set?" which is directly applicable to icon-set evaluation.

### 5a. Proposed small-size eval pipeline

1. Downsample the logo to 64, 32, 16 px with Lanczos.
2. OCR roundtrip at each size (§1) — count size at which text drops.
3. Measure luminance contrast against white & black backgrounds at each size (WCAG ratio).
4. Run a discriminability test: embed all brand-set icons via DINOv2 at each size; flag any pair with cosine > 0.95 at 16 px as "confusable".
5. Optional: VLM-as-judge (VIEScore / GPT-4o) prompt — *"At this size, what does this icon represent?"* — compare to intended concept.

---

## 6. LLM-as-judge for visual branding

The general-purpose judges are applicable to logos/icons but carry known caveats.

| Method | What it provides | Where it breaks |
|---|---|---|
| **VIEScore** (Ku et al. 2024) [20] | Three-dimension score (semantic consistency, perceptual quality, overall alignment) + natural-language rationale; no training needed. GPT-4o VIEScore reaches **0.40 Spearman** with humans (human-to-human is 0.45) | Struggles on editing tasks; open-source MLLMs are significantly weaker than GPT-4o/4V |
| **VQAScore / GenAI-Bench** (Lin et al., ECCV 2024) [21] | Converts prompt to a VQA question ("Does this figure show {X}?"), scores on P("Yes"). Outperforms CLIPScore on 8 alignment benchmarks, beats GPT-4V on some | Requires careful prompt-to-question translation for compositional logo prompts |
| **MLLM-as-a-Judge** (Chen et al., ICML 2024) [22] | Scoring, pair-comparison, batch-ranking. GPT-4V is **reliable for pair comparison**, **unreliable for absolute scoring** and batch ranking | Biases, hallucinations; author recommendation is pair-comparison mode only |
| **HPSv2** (Wu et al. 2023) [23] | Learned preference score on 798k human preference pairs; 4 style categories (animation/concept-art/painting/photo) | None of the 4 categories are "logo" or "icon"; you are out-of-distribution and should use it only comparatively, not absolutely |

### 6a. Practical recipe for branding tasks

From the combined literature, the lowest-variance LLM-judge recipe for logos/icons is:

1. **Always use pair-comparison mode**, not absolute scoring (Chen 2024 [22]).
2. Decompose the rubric: text fidelity (OCR), spec compliance (lint), brand fit (VIEScore semantic-consistency axis), aesthetic (HPSv2 or VIEScore perceptual).
3. Use a **structured rubric prompt** that forces the judge to check each dimension separately — cuts hallucination vs. free-form "rate this logo" prompts.
4. Calibrate against a small (50–100) human-labeled pair set per asset class; target Spearman ≥ 0.4 (parity with VIEScore SOTA).

---

## 7. Logo-specific generation models (background, for choosing eval)

What the logo-generation literature has actually measured, so we know what priors to beat:

- **LLD / Clustered-GAN** (Sage et al., CVPR 2018) [25] — 600k+ logos (LLD-icon = 548k 32×32 favicons from Alexa 1M + LLD-logo = 123k Twitter logos). Evaluated with CORNIA (quality) and MS-SSIM (diversity). Still the canonical logo dataset.
- **LoGAN** (Mino & Spanakis 2018) [26] — color-conditioned ACGAN-WGP-GP on LLD-icon; reported precision/recall 0.8 / 0.7 for color-conditioned generation.
- **LogoSticker** (ECCV 2024) [27] — logo *insertion* into a diffusion model; evaluated against DALL·E 3 on prompt accuracy + logo fidelity under spatial control.
- **LogoDiffuser** (2026) [28] — training-free multilingual logo generation via MMDiT attention injection; user-study validation for multilingual cases that OCR-score would miss.
- **IconShop** (Wu et al. 2023) [29] — autoregressive text-to-SVG-icon transformer; reports FID, CLIP, Uniqueness, Novelty. The "uniqueness / novelty" split is underused in T2I eval broadly and is a good diagnostic for mode-collapse on icon sets.

---

## 8. Gaps and proposed metrics

Where literature is thin and the field needs a benchmark:

| Gap | Why it matters | Proposed metric |
|---|---|---|
| No "brand pack" benchmark (logo + favicon + app icon + OG image as a *set*) | Users consume brand systems, not single logos | `BrandPackScore` (§4d) — cite DINOv2 + ΔE + font-classifier + platform compliance |
| No standard small-size legibility score | Favicon/app-icon failures silent in current benchmarks | §5a pipeline — OCR-at-scale × WCAG contrast × discriminability cosine |
| No alpha "halo" metric with ground truth labels | Transparent logo halos are the dominant user complaint | Extend LayerBench's non-reference alpha-edge metric [4] with a human-labeled halo dataset |
| No platform-mask survival benchmark | Android adaptive icons silently crop | Mask-IoU suite (§3d) — directly implementable, no training needed |
| LLM-judge calibration on *logo* domain | HPSv2 has no logo category; VIEScore tested on general gen | Ship a public 1k-pair human-labeled logo preference set, fine-tune VIEScore / PickScore on it |

---

## Sources

1. **OCRGenBench: A Comprehensive Benchmark for Evaluating OCR Generative Capabilities** (2025). arXiv:2507.15085. — Introduces OCRGenScore (text accuracy + aesthetic + instruction following), 33 tasks, 1,060 samples. <https://arxiv.org/html/2507.15085v4>
2. **STRICT: Stress Test of Rendering Images Containing Text** (2025). arXiv:2505.18985. — Multilingual text-rendering stress test; max-length, correctness, non-compliance dimensions. <https://arxiv.org/html/2505.18985v1>
3. **LayerDiffusion: Transparent Image Layer Diffusion using Latent Transparency** (Zhang & Lvmin 2024). arXiv:2402.17113. — 97% user preference over matte-based RGBA pipelines. <https://arxiv.org/html/2402.17113v3>
4. **Trans-Adapter: A Plug-and-Play Framework for Transparent Image Inpainting** (Dai, Li, Zhou, Loy 2025). arXiv:2508.01098. — Introduces LayerBench + non-reference alpha edge quality metric. <https://arxiv.org/abs/2508.01098>
5. **A Perceptually Motivated Online Benchmark for Image Matting** (Rhemann et al., CVPR 2009). — Canonical SAD / MSE / Gradient / Connectivity metrics; `alphamatting.com`. <https://alphamatting.com/eval_26.php>
6. **TextDiffuser: Diffusion Models as Text Painters** (Chen et al. 2023). arXiv:2305.10855. — MARIO-10M + MARIO-Eval first large-scale text-in-image rendering benchmark. <https://ar5iv.labs.arxiv.org/html/2305.10855>
7. **Apple Human Interface Guidelines — App Icons**. — 1024×1024 opaque PNG, 80% safe area, no pre-applied corners. <https://developer.apple.com/design/human-interface-guidelines/app-icons>
8. **Apple App Icon Guidelines — industry summary** (Asolytics 2024). <https://asolytics.pro/blog/post/apple-app-icon-guidelines-dimensions-requirements-design-rules-and-mistakes-to-avoid/>
9. **Android Adaptive Icons** (Android Developers docs). — 108×108 dp two-layer, 66×66 dp safe zone, monochrome theming. <https://developer.android.com/develop/ui/views/launch/icon_design_adaptive>
10. **Maskable Icons geometry — 10% safety margin, 410 px inner circle on 512**. DominateTools. <https://dominatetools.com/blog/optimizing-maskable-icons-for-android-and-ios/>
11. **DINOv2 for artwork / style retrieval**. — Self-supervised model captures brushstroke, palette, composition. <https://medium.com/@shambhaviadhikari/artwork-similarity-search-with-dino-embeddings-73223f2fbf5a>
12. **fruit-SALAD: A Style Aligned Artwork Dataset** (*Scientific Data*, 2025). — Controlled style × semantic benchmark; shows DINO > CLIP for style consistency. <http://feeds.nature.com/articles/s41597-025-04529-4>
13. **@hint/hint-apple-touch-icons** — automated lint rule for Apple touch icon presence, size, reachability. <https://www.npmjs.com/package/@hint/hint-apple-touch-icons>
14. **StarVector: Generating SVG Code from Images and Text** (Rodriguez et al., CVPR 2025). — Introduces SVG-Bench + DinoScore; shows pixel MSE mis-ranks SVG quality. <https://arxiv.org/html/2312.11556v2>
15. **Efficient logo retrieval with multi-label deep neural networks on the EUTM dataset** (2022). arXiv:2205.05419. — 76k EU trademarks; multi-label (shape/color/sector/semantic) improves normalized-rank 0.040 → 0.018. <https://arxiv.org/abs/2205.05419>
16. **T2I-CompBench: Compositional Text-to-Image Generation Benchmark** (Huang et al. 2023). arXiv:2307.06350. — 6,000 prompts, attribute-binding / object-relations / complex; custom sub-metrics. <https://arxiv.org/abs/2307.06350>
17. **Legibility of Small Icons with Color Combinations in Small Displays** (Lin 2007). *Perceptual and Motor Skills*. — Luminance contrast dominates small-icon recognition. <https://journals.sagepub.com/doi/10.2466/pms.104.1.191-200>
18. **Design standards for icons: aesthetics, visual complexity, and concreteness** (Hou et al. 2022). *Applied Ergonomics*. — Three independent factors in icon understanding. <https://www.sciencedirect.com/science/article/pii/S0141938222001093>
19. **Icon legibility framework — detectability, discriminability, countability** (ICA 2022 Abstracts). <https://ica-abs.copernicus.org/articles/5/110/2022/ica-abs-5-110-2022.pdf>
20. **VIEScore: Towards Explainable Metrics for Conditional Image Synthesis Evaluation** (Ku et al., ACL 2024). arXiv:2312.14867. — MLLM-based explainable metric; GPT-4o reaches 0.40 Spearman with humans. <https://arxiv.org/abs/2312.14867>
21. **VQAScore + GenAI-Bench** (Lin et al., ECCV 2024). — VQA-based alignment metric; beats CLIPScore on 8 benchmarks; GenAI-Bench ships 1,600 prompts + 15k human ratings. <https://www.ecva.net/papers/eccv_2024/papers_ECCV/papers/01435.pdf>
22. **MLLM-as-a-Judge: Assessing Multimodal LLM-as-a-Judge with Vision-Language Benchmark** (Chen et al., ICML 2024). arXiv:2402.04788. — GPT-4V reliable only in pair-comparison mode, not absolute scoring. <https://mllm-judge.github.io/>
23. **HPSv2: Human Preference Score v2** (Wu et al. 2023). arXiv:2306.09341. — 798k preference choices; 4 style categories, no logo/icon category. <https://arxiv.org/html/2306.09341v1>
24. **Ideogram V3 vs Recraft V4 text-rendering comparison** (2026 industry benchmark). — Ideogram V3 strongest for legible in-image text; Recraft V3 strongest for long strings and vector. <https://tryversusai.com/compare/ideogram-vs-recraft>
25. **Logo Synthesis and Manipulation with Clustered Generative Adversarial Networks** (Sage, Agustsson, Timofte, Van Gool, CVPR 2018) — introduces LLD dataset (548k 32×32 favicons + 123k 400×400 logos); CORNIA + MS-SSIM eval. arXiv:1712.04407. <https://arxiv.org/abs/1712.04407>
26. **LoGAN: Generating Logos with a Generative Adversarial Neural Network Conditioned on Color** (Mino & Spanakis 2018). — Color-conditioned ACGAN-WGP on LLD-icon. <https://cris.maastrichtuniversity.nl/ws/files/54135292/Spanakis_2018_LoGAN_Generating_Logos_with_a_Generative.pdf>
27. **LogoSticker: Inserting Logos into Diffusion Models for Customized Generation** (ECCV 2024). arXiv:2407.13752. — Two-phase actor-critic + decoupled identity learning; benchmarked vs DALL·E 3. <https://arxiv.org/html/2407.13752v1>
28. **LogoDiffuser: Training-Free Multilingual Logo Generation and Stylization via Letter-Aware Attention Control** (2026). arXiv:2603.09759. — MMDiT attention-map injection; multilingual user-study validation. *Flag: recent preprint; treat as contemporary, not canonical.* <https://arxiv.org/abs/2603.09759v1>
29. **IconShop: Text-Guided Vector Icon Synthesis with Autoregressive Transformers** (Wu et al. 2023). arXiv:2304.14400. — FID + CLIP + **Uniqueness + Novelty** metrics for icon-set generation. <https://arxiv.org/abs/2304.14400>

---

## TL;DR for downstream consumers

- **For text in logos**: OCR round-trip + OCRGenScore / MARIO-Eval / STRICT-style char-drop tracking — at multiple scales.
- **For transparent assets**: prefer native RGBA (LayerDiffuse) over matte; measure with LayerBench non-ref alpha edge + alpha-matting Gradient/Connectivity. Never use SAD/MSE alone.
- **For app icons / favicons**: build a programmatic compliance linter (mask-survival IoU, safe-zone mass ratio, manifest lint) — this is a *lint* problem, not a *perception* problem.
- **For brand consistency**: DINOv2 embeddings, not CLIP. Add palette ΔE and font-classifier agreement for a `BrandPackScore`.
- **For small-size**: always downsample to 16 / 32 / 64 and re-run OCR + contrast checks; log the size at which the asset fails.
- **For aesthetic / preference**: use VIEScore or MLLM-as-Judge in **pair-comparison mode only**; HPSv2 is out-of-distribution for logos and should be used comparatively.
- **When no metric exists** (brand-pack consistency, alpha halos, mask survival): the proposed composites in §3d, §4d, §5a are grounded in cited methods and implementable without new training.
