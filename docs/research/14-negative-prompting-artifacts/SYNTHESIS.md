---
category: 14-negative-prompting-artifacts
title: "Category Index — Negative Prompting & Artifact Avoidance for Asset Generation"
indexer: category-indexer-14
last_updated: 2026-04-21
status: synthesis
angles:
  - 14a: Negative prompt theory re-applied to asset generation (per model, per asset type)
  - 14b: Comprehensive taxonomy of asset-generation artifacts — root cause, detection, mitigation
  - 14c: Regenerate vs. repair — seed sweeps, img2img, inpaint, ControlNet-tile, upscale-as-repair
  - 14d: Automated quality scoring — CLIPScore, ImageReward, PickScore, HPSv2/v3, VLM-as-judge
  - 14e: Deterministic validation checks — Pillow/sharp/tesseract/exiftool rule-based gates
related_categories:
  - 01-prompt-engineering-theory (CFG foundations)
  - 13-transparent-backgrounds (checker-pattern root cause and matting fix)
  - 17-upscaling-refinement (Real-ESRGAN, SUPIR as repair primitives)
  - 09-app-icon-generation (safe-zone specs consumed by the validator)
  - 11-favicon-web-assets (OG/favicon size specs)
  - 19-agentic-mcp-skills-architectures (how the QA loop exposes itself as a tool)
primary_artifact_classes:
  - watermark_hallucination
  - jpeg_in_png_blockiness
  - checkerboard_alpha
  - border_frame
  - extra_limbs_fingers
  - misspelled_text
  - oversaturation_cfg
  - duplicates
  - off_center
  - stock_photo_lighting
word_count_target: "2000-3500"
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 14 — Negative Prompting & Artifact Avoidance

## Category Executive Summary

The five research angles in this category converge on a single thesis: **a 2026 prompt-to-asset cannot treat the image generator as a black box and hand its output directly to the user.** Every frontier model — Gemini 2.5 Flash Image, `gpt-image-1`, `gpt-image-1.5`, Imagen 4, FLUX.2 [pro/max], SDXL, Midjourney v7, Ideogram v3, Recraft v3/v4 — produces high-variance, high-artifact output on production asset prompts, and the failure modes are *not random*. They are predictable fingerprints of training-data contamination (watermarks, stock-photo lighting), decoder behavior (checkerboard alpha, JPEG-in-PNG), guidance misconfiguration (oversaturation, duplicates), and architectural capability gaps (text rendering on SDXL/Flux-dev, negative prompts on distilled models). The path to "correct by default" is a multi-stage QA loop: **generate → deterministic validate → ML-score → VLM rubric → classify defect → regenerate or surgically repair → verify → loop**.

Fifteen load-bearing insights across the angles:

1. **Negative prompts are a sampler trick, not a universal model feature.** The CFG equation `ε̂ = ε_u + w(ε_c − ε_u)` (Ho & Salimans 2022) hijacks the unconditional branch `ε_u`. Only models that run real two-pass CFG at inference — SDXL, SD 1.5, SD3/SD3.5 (with CFG caveats), Kolors, PixArt-Σ, Ideogram v2/v3 — honor a native negative prompt. Guidance-distilled models (all Flux variants: dev/schnell/pro/Kontext/FLUX.2-pro/FLUX.2-max) and rewriter-fronted/autoregressive models (DALL·E 3, `gpt-image-1`, `gpt-image-1.5`, `gpt-image-1-mini`, Gemini 2.5 Flash Image, Imagen 3.0-generate-002+, all Imagen 4 GA models) have **no `ε_u` to replace** — negatives are silently dropped or, worse, injected into the positive branch and *cause the artifact they name*. (14a)

> **Updated 2026-04-21:** Vertex Imagen support corrected — `negativePrompt` was removed from `imagen-3.0-generate-002` and later, including all Imagen 4 GA variants. The old "partial" Imagen label no longer applies. FLUX.2 [pro] and FLUX.2 [max] (2025) are confirmed no-negative-prompt. SD3.5 CFG is capped at 4–4.5 to avoid known interaction issues when combined with negative prompts.
2. **Never tell a no-negative model what not to draw.** Black Forest Labs' own [Flux prompting guide](https://bfl.mintlify.app/guides/prompting_guide_t2i_negative) says negation "tends to backfire." Rewrite every "no X" into "what would be there instead": `no text → clean surfaces, unmarked, blank`; `no background → isolated on pure white`; `no drop shadow → flat even lighting`. This is the canonical "pink elephant" failure for T5-encoder models. (14a)
3. **Artifact classes are stage-specific.** Misspellings emerge in the text encoder; duplicates and extra limbs crystallize in the U-Net at t≈0.4–0.6; oversaturation accumulates through the sampler under high CFG; the checkerboard is a VAE-decode artifact; watermarks and stock lighting are training-data priors; JPEG-in-PNG is a container-writer bug. Mitigation that targets the wrong stage wastes compute. (14b)
4. **Every asset class has its own artifact menagerie.** Logos fail on photorealism, drop shadows, 3D renders, mockups, and text contamination. App icons fail on wrong-platform conventions (iOS squircle vs Material circle), text-in-icon, and safe-zone bleed. Illustrations fail on "AI-generic" aesthetic, grain, watermarks, and anatomy. Favicons fail on sub-pixel mush; OG images on crop-safety and illegible headlines. A universal negative list is strictly worse than per-asset overlays. (14a, 14b)
5. **Weighted negatives and embeddings multiply SDXL's effective budget.** `(text:1.5)`, `(watermark:1.4)`, plus textual-inversion embeddings (`EasyNegative`, `BadX`, `ng_deepnegative_v1_75t`, `bad-hands-5`, `negativeXL`, `unaestheticXLv31`) compress 30+ artifact tokens into one slot of the 75-token context. For any SD-family enhancer these are the highest leverage tokens available. (14a)
6. **Artifact locality predicts tool choice.** The repair-vs-regenerate crossover is roughly **~15% of pixel area**: below that, inpaint the region; above that, regenerate the whole frame. Composition defects (wrong count, wrong layout, missing subject) are **never** repairable — they require a new roll or rewritten prompt. (14c)
7. **Seed sweeping is the highest-ROI primitive.** Fix the prompt, sample N seeds in parallel, score with HPSv2/v3 + PickScore + CLIP floor, pick top-1. At per-seed success rate `p=0.5`, `N=4` yields 94% fleet success; `N=8` yields 99.6%. Beyond 16 seeds, marginal gain flattens — rewrite the prompt instead. (14c)
8. **Preference models are not interchangeable with alignment metrics.** CLIPScore captures "does it match the prompt" but is nearly blind to aesthetic quality and artifacts; PickScore/ImageReward/HPSv2 correlate with human preference 2–3× better than raw CLIP. The pipeline needs **both**: CLIP as alignment *gate*, preference model as quality *ranker*. (14d)
9. **Every scorer has failure modes that correlate with the artifacts you're trying to reject.** LAION-Aesthetics actively *penalizes* flat vector logos (they lack bokeh and contrast variance). CLIPScore is OCR-cheatable ("no text" prompt + visible text = high score). ImageReward underrates Flux/Imagen 3+ outputs (training predates them). **Never use a single scalar on logo/icon/vector work.** (14d)
10. **VLM-as-judge is the only scorer that can answer rubric questions** ("is the background truly transparent?", "is 'Acme' spelled correctly?", "is the subject in the iOS safe zone?"). It has documented pathologies: position bias (5–15pp), score-digit clustering at 7/8, verbosity bias, self-preference, and text-spelling hallucination. Mitigate with: strict enums instead of 1–10 scales, paired-comparison order randomization, cross-family ensemble (GPT-4o + Gemini 2.5 Pro + Claude Sonnet 4.x), and forcing the VLM to consume an OCR transcription before judging text. (14d)
11. **Deterministic validators must run before ML validators.** A full Pillow + numpy + Tesseract pass on 1024×1024 is 100–400ms on CPU, zero GPU, zero API cost — and explicitly explainable (`alpha_used: frac=0.00`, `ocr_text: got="Shpi fasrter" want="Ship faster"`). ML scorers are noisy and opaque. Rule-based gates catch the 8 deterministic failure classes (mode, alpha, size, safe zone, metadata, OCR, palette, centroid) before a single GPU cycle is spent on aesthetic scoring. (14e)
12. **Alpha validation is two checks, not one.** A PNG can be RGBA with every pixel at α=255 (fully opaque) — this is the canonical Gemini "transparent logo came back white" failure. The validator must confirm `mode == "RGBA"` **and** `(alpha < 255).sum() / alpha.size >= 0.05`. The checker-pattern sub-case (α=255 everywhere, but RGB draws a gray grid) is caught by a variance/FFT check on the outer ring. (14e, cross-ref 13c)
13. **Text-bearing prompts must be routed, not just prompt-engineered.** SDXL and Flux-dev tokenize text as glyph-like shapes; text-capable models (Ideogram v2/v3, Recraft v3, `gpt-image-1`, Imagen 3+) produce correct spelling ~90%+ of the time on short strings. A 30-line regex router on `"that says"`, quoted strings, and `"wordmark"` reduces misspelling failures from ~40% to <5%. (14b, 14d)
14. **The checkerboard alpha is a prompt trap — never ask for transparency, always composite.** The VAE learned to *reconstruct the appearance of* the Photoshop transparency checker because training data contained PNG-in-JPG screenshots of canvases. The fix is pipeline-level: generate on a sentinel color (pure magenta `#ff00ff`) then matte with BiRefNet / RMBG-2.0 / Matting Anything. Prompting for "transparent background" on SDXL, Flux, or Gemini is almost always wrong. (14b, 14e, cross-ref 13)
15. **The QA loop must have a hard stop.** Ungated repair loops grind forever on pathological outputs. A sane ceiling: 3 repair attempts, then bail to fresh seeds; 3 regeneration waves, then escalate to model swap (route text to Ideogram, transparency to `gpt-image-1 background=transparent`, photoreal to Flux.1 pro). Every attempt logs `(provider, model, asset_type, check, pass/fail)` so future requests route by learned failure rate. (14c, 14e)

## Map of the Angles

| Angle | Focus | Primary output | Consumed by |
|---|---|---|---|
| **14a** — Negative prompts per model, per asset | Model-support matrix; weighted/embedding negatives for SD-family; positive-framing rewrites for Flux/DALL·E/Gemini; asset-specific negative libraries. | Backend-branching prompt-rewriter + per-asset negative YAML. | Prompt builder stage; model router. |
| **14b** — Artifact taxonomy | 10 high-frequency artifact classes × pipeline stage × visual signature × detector × ranked mitigation. Tier-1/2/3 ROI list. | Detector catalog + mitigation tiers. | QA loop's defect classifier; negative-prompt builder. |
| **14c** — Regenerate vs. repair | Decision matrix; seed-sweep math; inpainting recipes (gpt-image-1 edit, SDXL inpaint, hand/text/symmetry); ControlNet-Tile; Real-ESRGAN vs SUPIR; auto-repair loop skeleton. | Repair-primitive library + routing table. | QA loop's action selector post-detection. |
| **14d** — Automated scoring | Scorer landscape (CLIPScore, ImageReward, PickScore, HPSv2/v3, LAION-Aesthetic, latent verifiers, VLM-as-judge); per-asset rubric templates; tiered best-of-N architecture. | 3-stage scoring pipeline (cheap gates → scalar ranking → VLM rubric). | Candidate ranker; final acceptance gate. |
| **14e** — Deterministic checks | 12 rule-based checks (mode, alpha, size, safe zone, metadata, OCR, palette, centroid, etc.); Python + Node reference impls; pass/fail rubric; regenerate-loop integration. | Drop-in validator module with structured repair hints. | First gate after every generation; hint → prompt-delta translator. |

Reading order for implementers: **14e → 14b → 14a → 14c → 14d**. Start with deterministic checks (they're cheap and explainable), bolt on artifact detectors (14b's Tier 1), feed failure classes into the negative/positive prompt builder (14a), wire in the repair primitives (14c), and layer ML + VLM scoring on top (14d) for the cases rules can't describe.

## Cross-Cutting Patterns

### 1. Backend-branching is non-negotiable

The single most repeated warning across 14a, 14b, 14c, 14d, and 14e: **a uniform `{prompt, negative_prompt}` dict sent to every backend is a bug**. On SDXL/SD3/Ideogram it helps; on Flux (all variants)/DALL·E/`gpt-image-1`/`gpt-image-1.5`/Gemini/Imagen 4 it either raises a `TypeError` ([diffusers #9124](https://github.com/huggingface/diffusers/issues/9124)), silently drops the field, or gets "retried" by a community wrapper that merges negatives into the positive and *injects* the artifact. The enhancer's prompt builder must branch at the model boundary and select one of three strategies: (a) structured negative list + embeddings for SD-family (SD 1.5, SDXL, SD3/SD3.5), (b) `--no` CSV for Midjourney, (c) positive-framing prose for all Flux variants / DALL·E / gpt-image-1 / gpt-image-1.5 / Gemini / Imagen 4.

> **Updated 2026-04-21:** The no-negative list now explicitly includes all FLUX.2 variants, gpt-image-1.5, and Imagen 4. The old "Vertex Imagen (partial)" entry is removed — Imagen 4 does not support negative prompts. Recraft's negative_prompt is also limited to raster modes only (not vector endpoints).

### 2. Regenerate vs. repair is driven by defect locality AND defect class

14c's `~15% pixel area` rule is necessary but not sufficient. Even a 5%-area defect in the **composition class** (wrong subject, wrong count, missing layout element) requires regeneration, because inpainting assumes the underlying layout is salvageable. The routing table collapses to:

- Composition / semantic / count → **regenerate** (reroll seeds or rewrite prompt).
- Local and bounded (hand, single letter, watermark, petal) → **inpaint**.
- Global and stylistic (wrong palette, wrong vibe, right composition) → **img2img at denoise 0.4–0.6**.
- Shapes correct, textures mush → **ControlNet-Tile + hi-res pass**, or SUPIR.
- Compression/resolution only → **Real-ESRGAN**.

### 3. Deterministic gates first, ML scorers second, VLM rubrics third

14e and 14d agree on cost ordering. Stage 1 (deterministic, <50ms, no GPU): alpha pixel inspection, CLIPScore floor, OCR diff, size/aspect, NSFW, metadata strip. Stage 2 (scalar ML, ~100ms, GPU): PickScore + HPSv3 + ImageReward weighted ensemble, LAION-Aesthetic only on photographic content. Stage 3 (VLM rubric, 1–5s): per-asset-type structured rubric with hard gates (transparent? correct text? safe zone?), cross-family ensemble, paired-order randomization. 50–70% of candidates should die in Stage 1; only the top-K=2 reach Stage 3.

### 4. Every failure hint maps to a prompt delta

14e's `HINT_TO_PROMPT_DELTA` table is the bridge between the QA loop and the prompt rewriter. A validator report isn't a boolean — it's a structured list of `(check_name, details, repair_hint)` tuples, and each hint is templated into natural-language prompt augmentation for the next regeneration attempt. `alpha_used: frac=0.01` → append "true PNG-32 alpha channel, no white or checker background"; `ocr_text: got='Shpi', want='Ship'` → "render exactly: \"Ship\"". This feedback loop is what turns a one-shot generator into a converging agent.

### 5. Per-asset rubrics beat global "quality" scores

14d's rubric templates (logo_transparent_png, app_icon, favicon, og_image, ui_illustration) and 14e's per-asset thresholds (1024×1024 exact for iOS, 432×432 with 18% safe zone for Android Adaptive, 1200×630 for OG, 32×32 legibility for favicon) both reject the idea of a single "good asset" metric. Favicon legibility at 16×16 has nothing to do with OG image safe-crop zones. The validator's hard gates are parameterized by `asset_type`.

## Controversies

1. **Universal negative lists: template or trap?** 14b's Tier-1 advice includes a standard SDXL negative block (`watermark, signature, copyright, getty, shutterstock, ... extra fingers, border, oversaturated, ...`). 14a cautions that auto-appending universal negatives is *harmful* on Flux/DALL·E/Gemini and *helpful* on SDXL. Resolution: ship the block but gate on backend capability; never send it to a no-negative model.

2. **LAION-Aesthetic as a filter for asset work.** 14d warns that LAION-Aesthetic actively penalizes flat logos and vector icons because they lack bokeh and contrast variance the predictor was trained to reward. But it's still useful as a garbage-filter on photographic outputs. Resolution: weight `w_aesthetic = 0` for vector/logo/icon asset types; `w_aesthetic = 0.10` for photo/illustration.

3. **Seed sweep N: 4 or 8 by default?** 14c's math says `N=4` is cost-optimal at `p=0.5` per-seed success; `N=8` raises fleet success from 94% → 99.6% at 2× cost. 14d's pipeline diagram starts at `N=4 (prod) / 8 (high-value)`. No consensus; likely a per-tier product decision (free tier = 4, paid = 8).

4. **VLM-as-judge on every candidate, or only top-K?** 14d proposes VLM only on Stage-3 top-K=2 to contain cost. 14c's verifier-driven repair loop implies a VLM on every candidate for classification. Resolution: cheap classifier for defect-class routing on all candidates; full rubric VLM only on top-K final acceptance.

5. **gpt-image-1 mask convention.** 14c notes `gpt-image-1`'s `/v1/images/edits` uses **alpha-transparent pixels as editable**, inverse of the Automatic1111/ComfyUI/Diffusers convention (white = edit, black = keep). This is a silent footgun for any unified inpainting interface — the enhancer must translate mask conventions per backend.

6. **Can we really auto-translate SDXL-style negative lists to Flux-style positive prose?** 14a's open question. LLM list-to-antonym rewrites work for ~70% of cases but hallucinate on the rest. A fine-tuned translator is probably needed; until then, ship hand-written rewrite tables for the top-30 negative tokens and fall back to LLM for the long tail.

## Gaps

1. **No Flux-compatible negative embeddings.** SDXL has `BadX`, `negativeXL`, `unaestheticXLv31`. Flux's T5 encoder has none — textual inversion on T5 is technically feasible but no public artifact exists. (14a open question 4.)
2. **No per-platform evaluation set for asset artifacts.** HPSv2/v3 cover photo/anime/concept-art/painting; none cover logos, icons, UI illustrations, favicons. Building a 500-asset labelled golden set per asset type would be a high-ROI internal project and a potential public contribution.
3. **Empirical comparison of `--no` (Midjourney) vs SDXL negatives at equivalent semantic target.** No public benchmark. Practitioner anecdote says MJ's operator is weaker per-token but no controlled data. **New v7 caution (2025):** Midjourney v7 documentation explicitly warns that `--no` tokens are parsed **per-word independently** — `--no modern clothing` is parsed as "no modern" AND "no clothing", which can accidentally trigger a content warning. For v7, use single concrete nouns in `--no` lists (e.g., `--no text, watermark, border`) rather than adjective-noun compounds.
4. **DALL·E 3 server-side rewriter behavior on negative intent.** The rewriter sometimes re-introduces artifacts the user tried to exclude. Nobody has published a systematic eval of rewrite drift per artifact class.
5. **Text-repair inpainting quality across models.** Anecdotally, `gpt-image-1`'s edit endpoint and Ideogram edits beat SDXL inpainting for text. No published head-to-head CER (character error rate) comparison on logo wordmarks.
6. **Watermark inpainting vs re-roll cost tradeoff.** 14b Tier-3 mentions "watermark inpainting" as niche ROI but doesn't cost-compare to a single reroll at current 2026 API prices.
7. **Checker-pattern detection false-positive rate on legitimate checker designs** (e.g., a race-flag logo). FFT-based detector needs a "did the user *ask* for a checker?" gate from the prompt-intent classifier.

## Actionable Recommendations for the Plugin's QA Loop

The category's most direct product output is a five-stage QA loop. Below is the reference architecture grounded in the five angles, keyed to the four pillars the user asked about.

### Pillar 1 — Artifact detection

Implement the 10-class taxonomy from 14b as a detector registry. Tier-1 (implement first):

- **Watermark**: `easyocr` + brand regex against Getty/Shutterstock/iStock/Alamy/Adobe Stock list (14b §Detection 1).
- **JPEG-in-PNG**: 8×8 DCT block-boundary energy ratio; flag if `> 0.25` (14b §Detection 2).
- **Checkerboard alpha**: tile-periodicity histogram on outer ring + FFT peak at checker frequency (14b §Detection 3, cross-ref 14e C11).
- **Border / frame**: edge-column variance test; 4-line Hough aligned to image bounds (14b §Detection 4).
- **Extra fingers**: MediaPipe Hands landmark count ≠ 21 per hand (14b §Detection 8).
- **Misspelled text**: Tesseract `--oem 1 --psm 7` + Levenshtein vs expected (14e C7).
- **Oversaturation**: channel-clip % > 5% or mean LAB chroma > threshold (14b §Detection 5).
- **Duplicates**: YOLO/DETR object count vs prompt-parsed expected; L-R flip SSIM for mirror duplicates (14b §Detection rule).
- **Off-center**: `rembg` cutout → centroid distance / half-diagonal > 0.08 (14b §Detection 6, 14e C9).
- **Stock-photo lighting**: CLIP zero-shot probe on `"studio stock photo"` vs `"natural lighting"` (14b §Detection 10).

Tier 2 (implement second): CLIP-based zero-shot fallback for anything above that misses; fine-tuned classifier if failure volume justifies.

### Pillar 2 — Auto-repair

Implement the 14c decision matrix as a routing function `repair_plan(defects) -> list[step]`:

```python
def route(defect):
    if defect.kind in {"composition", "count", "subject_missing"} \
       or defect.area_fraction > 0.15:
        return ("regenerate", {"strategy": "reroll_seeds" if defect.kind != "composition"
                                            else "rewrite_prompt"})
    if defect.kind in {"hand", "text", "watermark", "logo_petal"}:
        return ("inpaint", {"mask": mask_for(defect),
                            "model": "gpt-image-1" if defect.kind == "text"
                                     else "sdxl-inpaint",
                            "sub_prompt": sub_prompt_for(defect)})
    if defect.kind == "global_style":
        return ("img2img", {"denoise": 0.45, "prompt": restyle_prompt(defect)})
    if defect.kind in {"mush", "low_res"}:
        return ("controlnet_tile" if defect.kind == "mush" else "supir",
                {"scale": 2})
    if defect.kind == "compression":
        return ("real_esrgan", {"scale": 2})
```

Repair primitives to ship (14c §Recipes): `gpt-image-1` masked edit (text and logo surgery), SDXL/Flux inpainting with dedicated checkpoints and `mask_blur=8–16px`, hand-repair pipeline (MediaPipe → dilate 20% → inpaint with strict negative), ControlNet-Tile + Ultimate SD Upscale for 2× hi-res passes, Real-ESRGAN as the default no-hallucination upscaler, SUPIR as the prompt-steered generative restoration fallback.

### Pillar 3 — Seed sweep

Default `N=4` for free tier, `N=8` for paid / high-value (14c §Math). Parallelize; wall-clock is `max(L_i) ≈ L`, dollar cost is `N·c`. Combine scorers as:

```
score = 0.20·CLIPScore + 0.30·LAION_aesthetic (photos only, else 0)
      + 0.50·HPSv2.1/v3
  subject to: passes_stage1_hard_filters
```

Hard filters always dominate — a logo that's aesthetic but has garbled brand text *loses*. Cap at N=16; beyond that, rewrite the prompt instead of rolling more seeds (diminishing returns flatten). For text-heavy prompts or multi-object layouts, start at N=8.

### Pillar 4 — Validator gate

Ship 14e's `validate_asset()` module unchanged as the first gate after every generation. Wire `report.summary["repair_hints"]` into the regenerate orchestrator via the `HINT_TO_PROMPT_DELTA` table. Enforce:

- **HARD fail** → block + regenerate with augmented prompt.
- **MEDIUM fail** → attempt auto-fix (resize with Lanczos, re-encode); if un-fixable, regenerate.
- **SOFT fail** → auto-fix silently, log for telemetry.
- **Loop cap**: 3 repair attempts, 3 regeneration waves, then escalate to model swap (text → Ideogram v3 or `gpt-image-1`/`gpt-image-1.5`, transparency → `gpt-image-1 background=transparent`, photoreal → FLUX.2 [pro] or FLUX.2 [max]).
- **Telemetry**: log `(provider, model, asset_type, check, pass/fail)` per attempt. After 500+ generations, route by learned failure matrix (e.g., "Gemini fails `alpha_used` at 18% on transparent-logo; `gpt-image-1` at 4% → route transparent-logo to `gpt-image-1`").

### Combined three-stage acceptance gate (14d §Reference Pipeline)

```
Stage 0 (14e): deterministic validator → HARD/MEDIUM/SOFT
Stage 1 (cheap gates): alpha inspection, CLIP floor τ₁=0.22, OCR diff, NSFW, size
Stage 2 (scalar ensemble): 0.35·PickScore + 0.35·HPSv3 + 0.20·ImageReward
                           - 0.10·LAION penalty (photos only)
                           → keep top-K=2
Stage 3 (VLM rubric): 2-of-3 agreement across GPT-4o + Gemini 2.5 Pro + Claude Sonnet 4.x
                      on per-asset-type rubric with strict enums
                      → paired-order randomization, require both orders agree on gates
Stage 4: return top-1, or loop with repair_hints (max 3 regeneration rounds)
```

## Primary Sources Aggregated

### Foundational papers

- CFG + distillation: Ho & Salimans [2207.12598](https://arxiv.org/abs/2207.12598); Meng et al. [2210.03142](https://arxiv.org/abs/2210.03142).
- Architecture: Rombach et al. [2112.10752](https://arxiv.org/abs/2112.10752) (LDM); Podell et al. [2307.01952](https://arxiv.org/abs/2307.01952) (SDXL).
- Training-data priors: Schuhmann et al. [2210.08402](https://arxiv.org/abs/2210.08402) (LAION-5B); Carlini et al. [2301.13188](https://arxiv.org/abs/2301.13188); Somepalli et al. [2212.03860](https://arxiv.org/abs/2212.03860).
- Editing / repair: Meng et al. [2108.01073](https://arxiv.org/abs/2108.01073) (SDEdit); Lugmayr et al. [2201.09865](https://arxiv.org/abs/2201.09865) (RePaint); Zhang et al. [2302.05543](https://arxiv.org/abs/2302.05543) (ControlNet).
- Restoration: Wang et al. [2107.10833](https://arxiv.org/abs/2107.10833) (Real-ESRGAN); Yu et al. [2401.13627](https://arxiv.org/abs/2401.13627) (SUPIR, CVPR 2024).

### Scorers and preference models

- Hessel et al. [2104.08718](https://arxiv.org/abs/2104.08718) (CLIPScore); Xu et al. [2304.05977](https://arxiv.org/abs/2304.05977) (ImageReward); Kirstain et al. [2305.01569](https://arxiv.org/abs/2305.01569) (PickScore); Wu et al. [2306.09341](https://arxiv.org/abs/2306.09341) (HPSv2); Ma et al. [2508.03789](https://arxiv.org/abs/2508.03789) (HPSv3, ICCV 2025).
- Ma et al., *Scaling Inference Time Compute for Diffusion Models* (CVPR 2025); *GPT-ImgEval* [2504.02782](https://arxiv.org/abs/2504.02782); Shi et al. [2406.07791](https://arxiv.org/abs/2406.07791) (position bias).

### Vendor documentation

- BFL, [Working Without Negative Prompts](https://bfl.mintlify.app/guides/prompting_guide_t2i_negative); HF [FLUX.1-dev #17](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17) (guidance-distilled); [diffusers #9124](https://github.com/huggingface/diffusers/issues/9124) (Flux `negative_prompt` TypeError); community [`pipeline_flux_with_cfg`](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256).
- [AUTOMATIC1111 wiki — Negative prompt](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt).
- Midjourney: [`--no`](https://docs.midjourney.com/hc/en-us/articles/32173351982093-No), [multi-prompts](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights). (URLs updated 2026-04-21 — Midjourney migrated docs to hc subdomain.)
- Ideogram: [negative prompt](https://docs.ideogram.ai/using-ideogram/generation-settings/negative-prompt), [handling negatives](https://docs.ideogram.ai/using-ideogram/prompting-guide/4-handling-negatives), [Generate v3 API](https://developer.ideogram.ai/api-reference/api-reference/generate-v3).
- OpenAI [Images API](https://platform.openai.com/docs/guides/image-generation) and [`/images/edits`](https://developers.openai.com/api/reference/resources/images/methods/edit/). `gpt-image-1.5` model added late 2025; no negative_prompt parameter on any gpt-image variant.
- [Vertex AI Imagen — Negative prompts deprecated notice](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt); [Imagen 4 GA models](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate); [Gemini 2.5 Flash Image](https://ai.google.dev/gemini-api/docs/image-generation); [Recraft v3](https://www.recraft.ai/blog/recraft-v3); Recraft V4 released February 2026.

### Embeddings and post-processing models

- `EasyNegative` — [civitai.com/models/7808](https://civitai.com/models/7808); `BadX` — [civitai.com/models/122403](https://civitai.com/models/122403/bad-x-bad-sdxl-negative-embedding).
- LAION [watermark-detection](https://huggingface.co/LAION/watermark-detection); BRIA [RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0); [BiRefNet](https://github.com/ZhengPeng7/BiRefNet); [rembg](https://github.com/danielgatis/rembg).

### Code and tooling

- Scorers: [CLIPScore](https://github.com/jmhessel/clipscore), [ImageReward](https://github.com/THUDM/ImageReward), [PickScore](https://github.com/yuvalkirstain/PickScore), [HPSv2](https://github.com/tgxs002/HPSv2), [LAION Aesthetic v2](https://github.com/christophschuhmann/improved-aesthetic-predictor).
- Repair primitives: [SUPIR](https://github.com/Fanghua-Yu/SUPIR), [ControlNet](https://github.com/lllyasviel/ControlNet), [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN), [Ultimate SD Upscale](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111).
- Validators: [Pillow](https://pillow.readthedocs.io/en/stable/), [sharp](https://sharp.pixelplumbing.com/), [ExifTool](https://exiftool.org/), [Tesseract 5](https://tesseract-ocr.github.io/tessdoc/), [pytesseract](https://github.com/madmaze/pytesseract), [tesseract.js](https://tesseract.projectnaptha.com/).

### Platform specifications

- [Apple HIG — App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) (1024×1024); [Android Adaptive Icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) (108dp / 72dp safe zone); [Open Graph](https://ogp.me/) (1200×630); [PWA manifest](https://www.w3.org/TR/appmanifest/); [C2PA](https://c2pa.org/specifications/).
