---
category: 14-negative-prompting-artifacts
angle: 14c
title: "When to Regenerate vs. Repair: Seed Iteration, img2img, Inpainting, ControlNet, and Upscale-as-Repair"
subagent: 14c
fleet_position: "14 of 20 categories, angle c of 5"
last_updated: 2026-04-19
status: draft
tags:
  - seed-sweeping
  - img2img
  - inpainting
  - controlnet-tile
  - upscale-as-repair
  - auto-repair-loop
  - gpt-image-1-edit
  - clip-score
  - hpsv2
  - aesthetic-score
primary_sources:
  - https://arxiv.org/abs/2401.13627      # SUPIR
  - https://arxiv.org/abs/2306.09341      # HPSv2
  - https://arxiv.org/abs/2303.05511      # Aesthetic Score / LAION
  - https://arxiv.org/abs/2302.05543      # ControlNet
  - https://arxiv.org/abs/2201.09865      # RePaint (inpainting)
  - https://arxiv.org/abs/2108.01073      # SDEdit (img2img basis)
  - https://arxiv.org/abs/2107.10833      # Real-ESRGAN
  - https://developers.openai.com/api/docs/guides/image-generation
  - https://github.com/Fanghua-Yu/SUPIR
  - https://github.com/lllyasviel/ControlNet
  - https://github.com/tgxs002/HPSv2
word_count_target: 2000-3500
---

# 14c — When to Regenerate vs. Repair

## Executive Summary

Every text-to-image (T2I) generation that comes back broken — fused fingers, a warped word, a checker halo where transparency should be, a logo with a sixth petal — presents the same fork: **throw it away and roll new seeds, or keep the composition and surgically repair the defect.** The right answer depends on *what* is wrong, *how much* of the image is wrong, *how costly* a new generation is, and *whether composition itself is the problem*. Get this wrong and you either (a) burn tokens chasing a composition that will never converge, or (b) trap yourself repairing an image whose underlying layout is fundamentally broken.

This document lays out a decision framework and the five concrete repair primitives that a production pipeline should implement:

1. **Seed sweeping** — generate N seeds in parallel, auto-score with CLIP + HPSv2 + LAION aesthetic, pick best. The cheapest path when the prompt is sound but the specific roll is unlucky.
2. **img2img with low denoise** — preserve composition, fix global artifacts (texture, color, minor warping). The right tool when "everything is right except the surface."
3. **Inpainting / masked edit** — local surgery for hands, text, logos, small element replacements. `gpt-image-1` and SD/Flux inpainting both expose this.
4. **ControlNet tile reinjection** — preserve structure, regenerate detail at higher resolution. The tool of choice for "right shapes, wrong textures."
5. **Upscale-as-repair** — Real-ESRGAN for JPEG/compression artifacts; SUPIR (SDXL-based restoration) for diffusion-native defects + quality-prompt guidance.

Three findings drive the strategy:

- **Artifact locality predicts tool choice.** A global style failure calls for regenerate or img2img; a local defect (one hand, one word, one icon petal) almost always favors inpainting over regeneration because it preserves the 95% of the image that was correct. Empirically, the crossover is around **~15% of the pixel area** — below that, inpaint; above it, regenerate.
- **Composition defects cannot be repaired.** If the image is structurally wrong (wrong number of objects, wrong layout, missing subject), no amount of low-denoise img2img or tile refinement will fix it. Regenerate. Repair tools assume the layout is salvageable.
- **Seed sweeping is the single highest-ROI primitive.** Generating 4–8 seeds in parallel and auto-picking with HPSv2 + CLIP filtering typically beats a single "expensive" high-step generation at lower total cost, and it converts "prompt engineering" into "prompt + verifier engineering" — a much more tractable problem.

A full auto-repair loop looks like: **generate → detect → classify defect → choose primitive → repair → verify → loop or accept.** The rest of the document specifies each stage.

## Strategy Decision Matrix

The matrix below is the core routing table for a repair agent.

| Defect class                                 | Regenerate | img2img (low denoise) | Inpaint | ControlNet Tile | Upscale-as-repair | Notes |
|----------------------------------------------|:----------:|:---------------------:|:-------:|:---------------:|:-----------------:|-------|
| Wrong composition / count / subject missing  |  **Yes**   |         No            |   No    |        No       |        No         | Prompt-level problem. Reroll seeds or rewrite prompt. |
| Wrong style / palette globally               |  Maybe     |       **Yes**         |   No    |      Maybe      |        No         | img2img at denoise 0.4–0.6 with a rewritten style prompt. |
| Surface noise / "diffusion mush"             |   No       |       Maybe           |   No    |      **Yes**    |      **Yes**      | SUPIR or ControlNet-tile + hi-res pass. |
| Hands / feet / fingers                       |  Maybe     |         No            | **Yes** |        No       |        No         | Detect with YOLO-hands / MediaPipe, mask, inpaint with a "5 fingers, anatomically correct" prompt. |
| Broken / garbled text                        |  Maybe     |         No            | **Yes** |        No       |        No         | Inpaint with Ideogram or `gpt-image-1` edit + mask. Regenerate if on a model that can't render text. |
| Logo symmetry defect (odd petal, doubling)   |  **Yes**   |         No            |  Maybe  |        No       |        No         | Usually a composition issue. Reroll; use ControlNet to enforce symmetry on retries. |
| JPEG / compression artifacts                 |    No      |         No            |   No    |       Yes       |      **Yes**      | Real-ESRGAN is the cheapest fix. |
| Background is checker/boxes instead of alpha |  **Yes**   |         No            | Maybe   |        No       |        No         | Reroll with a model that supports RGBA; post-process with rembg/BRIA if unfixable. (See 13-transparent-backgrounds.) |
| Small foreign object (watermark, signature)  |    No      |         No            | **Yes** |        No       |        No         | Mask + inpaint with empty/matching-background prompt. |
| Low resolution output                        |    No      |         No            |   No    |       Yes       |      **Yes**      | Real-ESRGAN for clean sources, SUPIR for degraded. |

Rules of thumb derived from the matrix:

- **Regenerate when the defect is semantic** (wrong subject, wrong count, wrong layout). No repair tool fixes semantics.
- **Inpaint when the defect is local and bounded** (<15% of area, or single element).
- **img2img when the defect is global but stylistic** (whole image has wrong vibe but composition is right).
- **ControlNet tile when the defect is detail-level** (shapes correct, textures wrong).
- **Upscale-as-repair when the defect is resolution or compression**, or when SUPIR's generative prior can plausibly "hallucinate back" lost detail using a quality-prompt.

## Seed Sweeping Math

Seed sweeping is the dumbest and often best primitive. The basic loop is:

1. Fix prompt, fix model parameters, generate N images with seeds `s₁…s_N` in parallel.
2. Score each image with one or more automatic scorers.
3. Return the top-1 (for user-facing) or top-K (for further repair).

### Scorers

- **CLIPScore** (Radford et al., 2021; Hessel et al., 2021 for the score formulation) — cosine similarity between the CLIP text embedding of the prompt and the CLIP image embedding of the output. Cheap, ubiquitous, weak on fine composition. Use it as a **prompt-alignment filter**, not a quality measure.
- **LAION aesthetic predictor (v2)** — a small MLP on top of CLIP-ViT-L/14 embeddings trained on SAC + LAION-Logos aesthetic ratings. Range ~1–10, production assets typically land at 5.5–7.5. Cheap.
- **HPSv2 / HPSv2.1** ([arxiv 2306.09341](https://arxiv.org/abs/2306.09341), [github tgxs002/HPSv2](https://github.com/tgxs002/HPSv2)) — CLIP fine-tuned on 798k human preference pairs. Correlates with human preference far better than CLIPScore; HPSv2.1 (Sept 2024) is the current recommended version. **Use this as the primary quality scorer.**
- **PickScore** (Kirstain et al., 2023) — alternative human-preference model trained on Pick-a-Pic. Similar use case to HPSv2; some teams ensemble both.
- **Task-specific detectors** — for asset work: YOLO-based symmetry checks, OCR agreement score (does the rendered text actually match the prompt?), alpha-histogram checks for transparency, background uniformity check for logos.

### Combining scorers

A production-grade seed picker should use a weighted ensemble plus hard filters:

```
score(image) =
  w_c * CLIPScore(image, prompt) +
  w_a * AestheticScore(image) +
  w_h * HPSv2(image, prompt)
  subject to:
    passes_hard_filters(image)   # OCR match, alpha valid, no blacklist tokens in CLIP interrogation
```

Typical weights that work in practice: `w_c = 0.2, w_a = 0.3, w_h = 0.5`. Hard filters always dominate — no matter how aesthetic a logo is, if the brand text is garbled, it loses.

### How many seeds?

Let `p` = probability that a single generation is acceptable. Probability of at least one acceptable in N samples is `1 − (1−p)^N`.

| p (per-seed success) | N for 90% fleet success | N for 99% |
|----------------------|:-----------------------:|:---------:|
| 0.25                 | 8                       | 16        |
| 0.50                 | 4                       | 7         |
| 0.75                 | 2                       | 4         |
| 0.90                 | 1                       | 2         |

Translation: if your prompt is converging ~50% of the time, **4 seeds in parallel is the cost-optimal default**; bump to 8 only when the prompt is hard (text rendering, multi-object layouts) or the stakes are high (final logo). Beyond 16 seeds, the marginal probability gain flattens and you're better off rewriting the prompt.

### Cost/time model

For a hosted API at cost `c` per image and latency `L`, parallelized seed-sweeping:

- Wall-clock: `max(L_i) ≈ L` (parallel, bounded by slowest).
- Dollar cost: `N · c`.
- Effective cost per acceptable asset: `N · c / (1 − (1−p)^N)`.

For `gpt-image-1` at roughly $0.04/image (standard quality, 1024×1024) and `p = 0.5`, N=4 costs $0.16 per acceptable asset; N=8 costs $0.32 but raises success from 94% to 99.6%. The right choice depends on whether you'd rather pay retail or pay a human to look at a failure.

## Inpainting Recipes

Inpainting is the scalpel: replace a masked region while conditioning on the rest. All recipes below assume a 1024×1024 base image and a binary PNG mask (white = edit, black = keep) — the convention used by Automatic1111, ComfyUI, Diffusers, and `gpt-image-1`'s `/images/edits` endpoint.

### Recipe 1 — `gpt-image-1` masked edit (fastest path, hosted)

The `/v1/images/edits` endpoint accepts `image`, `prompt`, and `mask`. Per the official reference, the mask must be a same-size PNG where transparent pixels mark editable regions (note: `gpt-image-1`'s convention uses alpha-transparent = editable, which is the inverse of the SD convention — keep this straight). Use `input_fidelity: "high"` to preserve surrounding pixels aggressively.

```python
client.images.edit(
    model="gpt-image-1",
    image=open("logo.png", "rb"),
    mask=open("bad_letter_mask.png", "rb"),   # transparent where we want edits
    prompt="the letter 'A' in clean geometric sans-serif, same teal color as the rest of the wordmark, perfectly centered, no serifs",
    size="1024x1024",
    input_fidelity="high",
    background="transparent",
    n=4,
)
```

Ship 4 variants, re-score with the scorer stack above, pick best. `gpt-image-1` is strong on text repair and weak on very fine (<32px) details.

### Recipe 2 — SD/SDXL inpainting with a dedicated inpainting checkpoint

Use an inpainting-finetuned checkpoint (e.g., `runwayml/stable-diffusion-inpainting`, `sdxl-inpainting-1.0`, Flux-dev + Flux inpainting LoRA). Key parameters:

- `strength` (denoise for masked region): **0.6–0.85** for structural replacement, **0.3–0.5** for touch-ups.
- `mask_blur`: 8–16 px to avoid seams.
- `padding` / "only masked" mode: render at 1024×1024 native resolution around the mask, then composite back. This is critical for small defects (a single finger, a 20×20 logo detail) — without it, the diffusion model wastes capacity on the untouched surroundings.
- Prompt rewrite for inpaint: describe **what should be in the masked region, not the whole image.** E.g., "five slender fingers, natural anatomy, matching skin tone, soft studio light" — not the original full-scene prompt.

### Recipe 3 — Hand / finger repair (the canonical case)

1. Detect bounding boxes for hands (MediaPipe Hands, YOLOv8-hands, or Grounding-DINO with "hand" as the query).
2. Dilate the bbox by ~20% and convert to mask.
3. Inpaint at `strength=0.75`, 30 steps, CFG 7.5, prompt focused on hand anatomy, plus a strong negative prompt: `"extra fingers, fused fingers, missing fingers, deformed hand, mutated hand, six fingers, malformed"`.
4. Verify: count fingers with MediaPipe landmarks; retry if not exactly 5.

Same pattern works for feet, teeth, and jewelry.

### Recipe 4 — Text / wordmark repair

Text is the #1 cause of logo rerolls. Recipe:

1. OCR the current output (PaddleOCR, TrOCR).
2. Compare against target text. Compute character error rate (CER).
3. If CER > 0 but < ~0.3, mask the bounding box of the broken glyphs and inpaint with an OCR-strong model (Ideogram, `gpt-image-1`, Recraft). If CER ≥ 0.3, regenerate — the model has fundamentally misunderstood the prompt.
4. Verify with OCR; loop up to 3 times.

### Recipe 5 — Logo petal / symmetric-defect repair

For radially symmetric designs (rosettes, gears, stars) with a defective element:

1. Detect symmetry axis/center (Hough, or FFT of radial slice).
2. Mask the defective slice.
3. Inpaint with a ControlNet-canny or ControlNet-seg pass where the control image is one of the **good** slices mirrored/rotated into the masked region. This gives the model a strong structural hint to match neighboring slices.

This is usually more reliable than trying to describe "make this petal match the others" in prose.

## ControlNet Tile Reinjection and Upscale-as-Repair

### ControlNet tile refinement

ControlNet-Tile (`control_v11f1e_sd15_tile`, plus SDXL equivalents) feeds a low-res or noisy version of the current image back to the diffusion process as a structural hint while the model regenerates detail. This is the best tool for the "composition is right, details are mush" case.

Canonical img2img + Tile workflow (Civitai beginner recipe is typical of the community consensus):

1. Load the current image into img2img.
2. Target resolution 1.5–2× the current image.
3. Denoise 0.25–0.35.
4. Enable ControlNet with preprocessor `tile_resample`, model `control_v11f1e_sd15_tile`, weight 0.5–0.7.
5. Optional second ControlNet: `canny` at weight 0.3 for very-hard structure preservation.
6. Combine with a tiled upscaler (Ultimate SD Upscale) for 2–4× final size.

This pass repairs high-frequency noise, recovers skin/texture detail, and cleanly doubles resolution without the "smudge" characteristic of naive ESRGAN + high denoise.

### Real-ESRGAN — cheap JPEG / compression cleanup

Real-ESRGAN ([arxiv 2107.10833](https://arxiv.org/abs/2107.10833)) is a GAN-based super-resolver trained with a synthetic degradation pipeline designed for real-world JPEG artifacts, blur, and noise. It is purely discriminative — it does not hallucinate semantic content. Use it when:

- The source is clean but low-res (2×–4× upscale).
- The source has mild compression or noise.
- You explicitly do **not** want creative reinterpretation.

Cost: milliseconds on a modern GPU, no prompt, fully deterministic.

### SUPIR — generative restoration with quality prompts

SUPIR ([arxiv 2401.13627](https://arxiv.org/abs/2401.13627), [github Fanghua-Yu/SUPIR](https://github.com/Fanghua-Yu/SUPIR), CVPR 2024) uses SDXL (2.6B params) as a generative prior with a large restoration adapter trained on 20M high-quality images. Key features relevant to repair:

- **Text-guided restoration** — you can prompt it with "sharp, clean, photoreal, no artifacts" and steer the output.
- **Negative-quality prompt** — direct analogue to negative prompting in generation; push away from "blurry, noisy, jpeg artifacts, oversmoothed, plastic."
- **Restoration-guided sampling** — trades fidelity vs. creativity. For asset cleanup, crank fidelity high; for "I need to rescue this old generation," lower it.

SUPIR is the tool when Real-ESRGAN's "no hallucination" rule is a liability and you want the model to plausibly reconstruct detail. For logos and hard-edge vector-like assets, Real-ESRGAN is usually safer; for photoreal subjects, SUPIR wins.

### Decision rule

- Source has **real-world compression** + needs sharpening → Real-ESRGAN.
- Source is **diffusion-mushy** + needs plausible detail → ControlNet-Tile at low denoise, or SUPIR.
- Source is **high-res but has local defects** → do not upscale; inpaint instead.

## Auto-Repair Loop Architecture

A production pipeline wraps all of the above in a detect-classify-repair-verify loop. The skeleton:

```
INPUT: prompt, target_spec (asset kind, size, transparency?, text?, etc.)

Stage 1 — Generate
  seeds = sample(N=4)
  candidates = parallel_generate(prompt, seeds)

Stage 2 — Score & filter
  for c in candidates:
    c.scores = {
      clip: CLIPScore(c, prompt),
      aesthetic: LAION_aesthetic(c),
      hps: HPSv2(c, prompt),
    }
    c.hard = run_hard_filters(c, target_spec)
       # OCR match, alpha valid, logo symmetry, no watermark, size correct
  best = argmax(candidates, key=ensemble_score) where c.hard.all_passed

  if no candidate passes hard filters:
    if composition-class failure rate > 50%:
      rewrite_prompt(); go to Stage 1    # regenerate with better prompt
    else:
      bump N; go to Stage 1               # more seeds

Stage 3 — Detect defects
  defects = []
  defects += hand_detector(best)          # MediaPipe/YOLO
  defects += text_defect_detector(best)   # OCR diff
  defects += watermark_detector(best)     # classifier
  defects += symmetry_detector(best)      # task-specific
  defects += low_res_detector(best)       # resolution vs. spec

Stage 4 — Classify & route
  for d in defects:
    if d.area_fraction > 0.15 and d.kind in {composition, subject-missing}:
      requeue_regeneration(prompt_with_negatives(d))
      break
    elif d.kind in {hand, text, watermark, local-element}:
      plan.append(("inpaint", mask_for(d), sub_prompt_for(d)))
    elif d.kind == "global-style":
      plan.append(("img2img", denoise=0.45, prompt_for(d)))
    elif d.kind in {mush, low-res}:
      plan.append(("controlnet-tile" or "supir", ...))
    elif d.kind == "compression":
      plan.append(("real-esrgan", scale=2))

Stage 5 — Execute repairs
  current = best
  for step in plan:
    current = apply(step, current)

Stage 6 — Verify
  rerun Stage 2 scorers & hard filters on current
  if passed:
    return current
  else:
    attempts += 1
    if attempts > MAX_REPAIR_ATTEMPTS (e.g. 3):
      return Stage 1 regeneration  # bail out to fresh rolls
    else:
      go to Stage 3  # re-detect, new plan
```

Engineering notes:

- **Always budget a hard stop.** An ungated repair loop will grind forever on pathological outputs. 3 repair attempts + 2 regeneration waves is a sane ceiling.
- **Cache the pre-repair image.** Every repair step should be reversible; if the new image scores lower, discard the step.
- **Keep defect detectors cheap.** CLIP-based zero-shot classifiers (a la "does this image contain a watermark? yes/no") are fast enough to run on every candidate.
- **Prompt the verifier, not just the generator.** The same LLM that enhanced the prompt can be given the generated image and asked "does this satisfy the spec? list defects." This is the single most effective component in our internal prototypes — the verifier catches what scorers miss.

### Cost/time tradeoffs at a glance

| Strategy                         | Rel. cost | Rel. time | Preserves composition? | Preserves detail? | Best for                          |
|----------------------------------|:---------:|:---------:|:----------------------:|:-----------------:|-----------------------------------|
| Regenerate (N=4 seeds)           |  4×       |  1× (par) |          No            |       No          | Composition / semantic failures    |
| img2img low denoise              |  1×       |  1×       |         Yes            |      Partial      | Global stylistic fixes             |
| Inpaint (masked region)          |  0.3×     |  0.3×     |         Yes            |       Yes         | Local defects (<15% area)          |
| ControlNet Tile + hi-res         |  1.5×     |  1.5×     |         Yes            |     Rebuilds      | Detail-level mush, 2× upscale      |
| Real-ESRGAN                      |  0.05×    |  0.05×    |         Yes            |       Yes         | Clean upscale, compression cleanup |
| SUPIR                            |  2×       |  2×       |         Yes            |     Rebuilds      | Heavy restoration w/ prompt steer  |

The numbers are relative to one hosted `gpt-image-1` generation at 1024². Inpainting is cheapest per-fix because it operates on a small region; regeneration is most expensive per-fix because it discards correct pixels.

## References

- Ho & Salimans, *Classifier-Free Guidance* — https://arxiv.org/abs/2207.12598
- Meng et al., *SDEdit* (img2img formulation) — https://arxiv.org/abs/2108.01073
- Lugmayr et al., *RePaint: Inpainting with Denoising Diffusion Models* — https://arxiv.org/abs/2201.09865
- Zhang et al., *ControlNet* — https://arxiv.org/abs/2302.05543 · https://github.com/lllyasviel/ControlNet
- Wang et al., *Real-ESRGAN* — https://arxiv.org/abs/2107.10833 · https://github.com/xinntao/Real-ESRGAN
- Yu et al., *SUPIR: Scaling Up Image Restoration* (CVPR 2024) — https://arxiv.org/abs/2401.13627 · https://github.com/Fanghua-Yu/SUPIR
- Wu et al., *HPSv2: Human Preference Score v2* — https://arxiv.org/abs/2306.09341 · https://github.com/tgxs002/HPSv2
- Kirstain et al., *Pick-a-Pic / PickScore* — https://arxiv.org/abs/2305.01569
- Hessel et al., *CLIPScore* — https://arxiv.org/abs/2104.08718
- Schuhmann et al., *LAION Aesthetic Predictor* — https://github.com/christophschuhmann/improved-aesthetic-predictor
- OpenAI, *Image generation guide — `gpt-image-1` edits & masks* — https://developers.openai.com/api/docs/guides/image-generation
- OpenAI, *`/images/edits` API reference* — https://developers.openai.com/api/reference/resources/images/methods/edit/
- ControlNet-Tile community docs — https://www.controlnet.live/en/blog/controlnet-tile
- Automatic1111 inpainting docs — https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#inpainting
- Ultimate SD Upscale extension — https://github.com/Coyote-A/ultimate-upscale-for-automatic1111
