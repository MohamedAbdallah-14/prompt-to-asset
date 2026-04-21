# Research Update Log — Category 14 (Negative Prompting & Artifacts)
Date: 2026-04-21
Auditor: research-updater agent

---

## Summary of Changes

### 14a — Negative prompt theory (negative-prompts-for-assets.md)

**CRITICAL corrections:**

1. **Executive summary / tier list** — Added FLUX.2 [pro] and FLUX.2 [max] (released 2025) explicitly to the "no negative prompt" tier. Updated Imagen tier from "Vertex Imagen (partial)" to "not supported from imagen-3.0-generate-002 onward, including all Imagen 4 GA models". Added gpt-image-1.5 and gpt-image-1-mini to the no-negative list.

2. **Model support matrix — Imagen/Gemini row** — Corrected the claim that Imagen 4 merely "doesn't expose" negative prompts. Source: Vertex AI docs state "Negative prompts are a legacy feature, and are not included with the Imagen models starting with imagen-3.0-generate-002 and newer." Imagen 4 preview model deadline was November 30, 2025; only GA models (`imagen-4.0-generate-001`, `imagen-4.0-ultra-generate-001`, `imagen-4.0-fast-generate-001`) are active.

3. **Model support matrix — Flux row** — Split into: (a) FLUX.1-dev/schnell (existing), (b) new row covering FLUX.1-pro / Flux Kontext / FLUX.2 [pro] / FLUX.2 [max]. BFL docs confirm FLUX.2 has no negative prompt. Added note that FLUX.2 reduces anatomy errors by ~30% vs FLUX.1.

4. **Model support matrix — SD3/SD3.5 row** — Added caveat: SD3.5 has documented issues with CFG+negative prompt interaction; CFG must be kept at 4–4.5. Weighted emphasis syntax `(token:1.5)` should not be used with SD3.5.

5. **Model support matrix — DALL·E/gpt-image row** — Extended to include gpt-image-1.5, gpt-image-1-mini. Added clarification that `input_fidelity` on `/images/edits` (gpt-image-1 only) is unrelated to negative prompting.

6. **Model support matrix — Midjourney row** — Updated to v7 as current default (became default June 17 2025). Added explicit warning that `--no` tokens are parsed per-word independently in v7, which can accidentally trigger moderation on adjective-noun compound tokens.

7. **Model support matrix — Ideogram row** — Updated to include Ideogram 3.0 Turbo. Confirmed `negative_prompt` works identically for standard and Turbo render speeds.

8. **Model support matrix — Recraft row** — Updated to include V4 and V4 Pro (released February 2026). Confirmed negative_prompt behavior unchanged from V3.

9. **Example 4 (Ideogram API)** — Added note for `V_3_TURBO` model value.

---

### 14b — Artifact taxonomy (artifact-taxonomy.md)

**CRITICAL corrections:**

1. **Tier-1 mitigation block** — Removed "Flux" from "SDXL/Flux asset generation" negative-prompt injection advice. Flux does NOT support `negative_prompt`. The Tier-1 block now correctly targets SD-family only, with a note to use positive-framing rewrites for Flux/DALL·E/Gemini.

2. **Artifact #7 (oversaturation / high-CFG)** — Added clarification that Flux is not susceptible to this artifact class because it uses a learned guidance embedding, not two-pass CFG. Updated CFG table to note SD3.5 ceiling at 4–4.5. Removed Flux from CFG guidance recommendations.

3. **Artifact #5 (extra limbs)** — Updated model recommendation from "Flux.1 pro" to "FLUX.2 [pro] or FLUX.2 [max]" (≈30% fewer anatomy errors). Added note that Flux negatives are still positive-framing only.

4. **Tier-2 CFG tuning section** — Expanded into a table, clarified that Flux uses `guidance_scale` as a learned embedding (not CFG), added SD3.5 row.

---

### 14c — Regenerate vs. repair (regenerate-vs-repair-strategies.md)

1. **Recipe 1 (gpt-image-1 masked edit)** — Added explicit warning that `input_fidelity` is supported only on `gpt-image-1`, not `gpt-image-1.5` and not `gpt-image-1-mini`. Added note about gpt-image-1.5 improvements (text rendering, instruction following) as an alternative for when fidelity preservation is less critical.

---

### 14d — Automated quality scoring (automated-quality-scoring.md)

1. **HPSv3 section** — Added release confirmation: HPSv3 code, weights, and PyPI package (`pip install hpsv3`) were released August 6, 2025. GitHub: MizzenAI/HPSv3. HuggingFace: MizzenAI/HPSv3. Architecture: Qwen2-VL backbone.

2. **VLM self-preference pitfall** — Updated to mention gpt-image-1.5 and Gemini image outputs specifically.

3. **Generator pipeline diagram** — Added gpt-image-1.5, FLUX.2 [pro/max], Ideogram v3, Recraft v3/v4 to the generator examples list.

---

### 14e — Deterministic validation checks (deterministic-validation-checks.md)

1. **Executive summary** — Updated model list to include gpt-image-1.5 and FLUX.2 [pro/max].

2. **C3 dimensions section** — Added note that gpt-image-1.5 follows the same discrete size scheme as gpt-image-1. Added note emphasizing that no provider returns arbitrary exact pixel dimensions from a text prompt.

---

### SYNTHESIS.md

1. **Insight #1** — Expanded "no negative" list to include all FLUX.2 variants, gpt-image-1.5, gpt-image-1-mini, Imagen 3.0-generate-002+, all Imagen 4 GA models. Removed stale "Vertex Imagen (partial)" entry.

2. **Cross-cutting pattern #1 (backend branching)** — Extended no-negative list, corrected Imagen 4 status, added note that Recraft negative_prompt is raster-only.

3. **Controversy #3 (Midjourney --no vs SDXL)** — Added v7 per-word moderation parsing caution.

4. **Pillar 4 loop cap** — Updated model swap recommendation to reference Ideogram v3, gpt-image-1.5, and FLUX.2.

5. **VLM ensemble references** — Changed "Claude 4.5 Sonnet" to "Claude Sonnet 4.x" throughout to avoid version-specific drift.

6. **Stage 3 acceptance gate** — Updated Claude reference.

7. **Vendor documentation sources** — Updated Midjourney doc URLs (migrated to hc subdomain), added Vertex AI negative prompt deprecation doc, added gpt-image-1.5 and Recraft V4 notes.

8. **`last_updated`** — Changed from 2026-04-19 to 2026-04-21.

---

## Claims Verified as Still Accurate (no change needed)

- Flux `negative_prompt` raises `TypeError` in diffusers `FluxPipeline` — confirmed via HF diffusers #9124 still open/relevant.
- BFL prompting guide "Working Without Negative Prompts" — still at docs.bfl.ml, content unchanged.
- SDXL two-pass CFG supports negative prompts — confirmed.
- Ideogram v3 (standard and Turbo) supports `negative_prompt` in generate-v3 API — confirmed.
- gpt-image-1 has no `negative_prompt` field — confirmed. `gpt-image-1.5` also has no `negative_prompt`.
- Midjourney v7 `--no` operator is equivalent to `::-0.5` multi-prompt weight — confirmed.
- HPSv2.1 available as drop-in improvement over HPSv2 — confirmed still accurate.
- BiRefNet / RMBG-2.0 for background matting — still current.
- Real-ESRGAN and SUPIR still recommended for upscale-as-repair — still current.
- `gpt-image-1 background=transparent` still the primary API path for native RGBA — confirmed.
- Recraft V3 supports native vector output — confirmed (V4 also supports vector variants).

---

## Files Modified

- `14a-negative-prompts-for-assets.md` — 9 targeted edits
- `14b-artifact-taxonomy.md` — 4 targeted edits  
- `14c-regenerate-vs-repair-strategies.md` — 1 targeted edit
- `14d-automated-quality-scoring.md` — 4 targeted edits
- `14e-deterministic-validation-checks.md` — 2 targeted edits
- `SYNTHESIS.md` — 7 targeted edits
- `index.md` — no changes needed (already current)
