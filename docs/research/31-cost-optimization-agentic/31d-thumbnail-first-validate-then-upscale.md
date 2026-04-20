# 31d — Thumbnail-First: Validate at Low Cost, Upscale Only on Pass

## The Problem

gpt-image-1 at 1024×1024 standard quality costs ~$0.04/image. If the tier-0 validation checks (dimensions, alpha presence, FFT checkerboard, safe-zone bbox) fail, that $0.04 is wasted. The same validation logic can be run on a much cheaper low-resolution draft first.

---

## The Pattern

1. Generate a small draft (256×256 or 512×512) using a cheaper model or lower-quality setting.
2. Run all deterministic validation checks against the draft.
3. If draft passes: upscale to production resolution. If draft fails: regenerate draft (not full-res), iterate.

This defers the expensive full-resolution generation until the prompt and composition are confirmed to be correct.

---

## Cost Structure

**gpt-image-1 pricing by size (approximate, as of 2025):**
- 256×256: ~$0.01/image (low quality)
- 512×512: ~$0.02/image (standard)
- 1024×1024: ~$0.04/image (standard)
- 1024×1024: ~$0.08/image (high quality)

**Draft-then-upscale math:**
If 30% of briefs require at least one regeneration due to composition failure:
- Without thumbnail-first: 1.3 × $0.04 = $0.052 average cost
- With thumbnail-first (256 draft, regenerate on fail, upscale on pass): (1.3 × $0.01) + (1.0 × $0.04) = **$0.053 average cost**

At similar rates, the cost savings are modest for single-regeneration scenarios. The savings compound when failure rates are high (novel style, complex brand constraints) or when upscaling uses a cheaper dedicated upscaler rather than re-generating at full res.

**With a dedicated upscaler:**
Upscaling services like Real-ESRGAN (self-hosted) or Pruna API (~$0.005/image) are substantially cheaper than full regeneration. The math becomes:
- Draft (256): $0.01 + upscale: $0.005 = **$0.015 for a passing asset** vs $0.04
- 62% cost reduction on the happy path

---

## Validation Checks That Work at Low Resolution

These tier-0 checks are resolution-independent — they work on thumbnails:

| Check | Min resolution needed | Cost at 256px |
|---|---|---|
| Alpha channel present | Any | Free (PIL channel check) |
| No checkerboard FFT signature | 64px+ | ~1ms compute |
| Subject tight-bbox safe zone | 128px+ | ~5ms with PIL bbox |
| Palette ΔE2000 vs brand palette | Any | ~2ms |
| Aspect ratio / dimensions | Any | Free |

OCR Levenshtein for wordmark accuracy **does not work reliably at 256px**. If the brief includes text, either defer OCR to full-res or use 512px minimum for draft.

---

## Progressive Diffusion Research (DiffuseHigh, FreCaS)

Academic work corroborates this pattern:

**DiffuseHigh (2024):** Uses a low-resolution image as a structural guide for high-resolution synthesis. The low-res pass provides layout and composition; the high-res pass refines details. Avoids re-running the full diffusion chain from noise at high resolution.

**FreCaS (Frequency-aware Cascaded Sampling):** Decomposes generation into cascaded stages with gradually increasing resolution, expanding frequency bands progressively. Reports significant inference acceleration at slight quality reduction.

Neither applies directly to API-based generation (gpt-image-1 / Ideogram), but both validate that progressive resolution is sound practice — the composition is established cheaply, quality is refined expensively only when needed.

---

## Practical Implementation for the Asset Pipeline

```typescript
async function generateWithValidation(spec: AssetSpec): Promise<AssetBundle> {
  // Step 1: cheap draft
  const draft = await generateImage({ ...spec, size: "256x256", quality: "low" });

  // Step 2: fast deterministic checks
  const checks = await runTier0Checks(draft, spec);
  if (!checks.passed) {
    // Regenerate draft only — do not call expensive full-res
    return generateWithValidation(spec); // or retry with refined prompt
  }

  // Step 3: upscale
  const fullRes = await upscale(draft, targetSize: spec.size);

  // Step 4: OCR check (text-bearing assets only)
  if (spec.hasWordmark) {
    await runOCRCheck(fullRes, spec.wordmark);
  }

  return bundle(fullRes);
}
```

**For Ideogram:** The API supports `resolution` parameter. Use lower resolutions for drafts. Ideogram Turbo at lower resolution costs less and is faster.

---

## Caveats

- gpt-image-1 at 256×256 may produce a meaningfully different composition than at 1024×1024. Transparency rendering in particular can behave differently at small sizes. Test before assuming draft validity predicts full-res validity.
- Upscaling via dedicated models can introduce artifacts (halos, over-sharpening). Real-ESRGAN is better for illustrations; Stable Diffusion img2img upscaling is better for photorealistic styles.
- The pattern is most valuable for high-failure-rate asset types (transparent marks, complex logos with text) not for simple OG images where first-pass success rates are high.

**Sources:**
- [DiffuseHigh: Progressive High-Resolution Image Synthesis](https://arxiv.org/html/2406.18459v1)
- [FreCaS: Frequency-aware Cascaded Sampling](https://openreview.net/forum?id=TsBDfe8Ra5)
- [Multi-stage Generative Upscaler](https://www.nature.com/articles/s41598-025-31543-8)
- [AI Image Generation Quality Statistics](https://letsenhance.io/blog/all/ai-generated-image-quality-statistics/)
- [OpenAI Image Generation Pricing](https://openai.com/api/pricing/)
