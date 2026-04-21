# Partial Update Log — Category 04 (Gemini / Imagen Prompting)
**Audit date:** 2026-04-21  
**Auditor:** Claude (automated research updater)

---

## Summary of Changes

### Files Modified

| File | Changes |
|---|---|
| `4a-imagen-official-prompt-guides.md` | Added top-level `Updated 2026-04-21` banner; corrected AI Studio "no billing needed" claim; added deprecation callout after capability table; updated `last_updated` to 2026-04-21 |
| `4b-gemini-flash-image-nano-banana.md` | Already had 2026-04-21 status banner from prior update; updated `last_reviewed` to 2026-04-21; no content errors found |
| `4c-transparent-background-checker-problem.md` | Added `Updated 2026-04-21` banner; updated `date_compiled` to 2026-04-21; content accurate — no Google model produces RGBA, limitation confirmed still current |
| `4d-quirks-and-artifacts.md` | Added `Updated 2026-04-21` banner noting Imagen 4 EOL, billing-required change, and SDK deprecation; updated `date_range` to 2026-04 |
| `4e-vertex-sdk-integration.md` | Added `Updated 2026-04-21` banner; added `Status` column to model landscape table with deprecation dates for all Imagen 4.0 variants; added note that `negativePrompt` is silently ignored on Imagen 4; added billing-required clarification to auth section; added deprecation warnings to code examples 1, 3, 5; updated practical notes #1 and #2 with SDK migration guidance and deprecation warnings; updated `last_updated` |
| `SYNTHESIS.md` | Updated `last_updated` to 2026-04-21; updated routing rules #3 and #4 with Imagen 4 deprecation caveats; added `Gaps` callout about Imagen 4 successor routing gap and SDK migration gap |
| `index.md` | Added `last_updated: 2026-04-21` to front matter (already had 2026-04-21 status banner) |

---

## Issues Found and Corrected

### Issue 1: Free API tier claims (CRITICAL)
**Status:** Corrected in `4a`, `4e`. Already corrected with banners in `4b`, index, SYNTHESIS.

**Finding:** The Gemini Developer API free tier no longer includes image generation. Programmatic image generation via an unbilled API key returns HTTP 429 with `free_tier_requests limit: 0`. Third-party sources initially reported conflicting information ("500 RPD free"), but Google Developer Forum threads confirm: as of early 2026, image models show `limit: 0` on the free tier. The AI Studio **web UI** (https://aistudio.google.com) remains free for interactive generation.

**Action:** Added `Updated 2026-04-21` notices in `4a` and `4e` clarifying that programmatic image-gen requires billing. Fixed the misleading "without billing setup" language in `4a`'s AI Studio section.

### Issue 2: Imagen 4.0 deprecation (HIGH)
**Status:** Corrected across all files.

**Finding:** All three Imagen 4.0 GA variants (`imagen-4.0-generate-001`, `imagen-4.0-fast-generate-001`, `imagen-4.0-ultra-generate-001`) are deprecated and will be discontinued **June 30, 2026**. Google recommends migrating to `gemini-2.5-flash-image`. This was partially documented in the existing files (the discontinuation date was present in `4e`'s model table), but the broader implication — that recommendations to "use Imagen 4 Fast/Standard/Ultra" are now routing to EOL models — was not surfaced in the recommendations sections.

**Action:** Added Status column to `4e` model table; added deprecation warnings to code examples 1, 3, 5 in `4e`; updated routing rules 3 and 4 in SYNTHESIS.md; added deprecation callout after capability table in `4a`.

### Issue 3: Legacy SDK deprecation (MEDIUM)
**Status:** Corrected in `4e` and `4d` banners.

**Finding:** `google-cloud-aiplatform`'s `vertexai.generative_models`, `vertexai.vision_models`, `vertexai.language_models`, and `vertexai.tuning` / `vertexai.caching` modules were deprecated June 24, 2025 and will be **removed June 24, 2026**. The `google-generativeai` package is also deprecated. The existing code examples in `4e` correctly use `from google import genai` (the `google-genai` package), but the files did not warn readers against using the old SDK.

**Action:** Added SDK deprecation notice to `4e` top-level banner and practical notes section #1.

### Issue 4: `negativePrompt` on Imagen 4 (MEDIUM)
**Status:** Corrected in `4e`.

**Finding:** The REST API parameter example in `4e` includes `"negativePrompt": "text, watermark, low quality"` but targets a generic Imagen endpoint. Imagen 4.x variants do **not** support `negativePrompt` — it is silently ignored or causes a validation error. This was already correctly documented in `4a`'s capability table and in SYNTHESIS.md's prompt rewriting rules, but the code example was inconsistent.

**Action:** Added a note after the REST example in `4e` explicitly warning that `negativePrompt` must be removed for Imagen 4 model calls.

### Issue 5: AI Studio "no billing" claim (MEDIUM)
**Status:** Corrected in `4a`.

**Finding:** `4a` stated Google AI Studio is "the fastest way to sanity-check a prompt **without billing setup**." This is true for the web UI (still free interactively), but the broader context — that API keys from AI Studio do not grant free programmatic image-gen — needed clarification.

**Action:** Replaced "without billing setup" with "interactively" and added a parenthetical note about the billing requirement for programmatic access.

---

## Claims Verified as Accurate (no changes needed)

- **Transparent background limitation:** Confirmed still true for all Google image models as of April 2026. No RGBA output from any Imagen or Gemini image model. `gpt-image-1` and Recraft V3 remain the correct alternatives for native alpha.
- **Pricing:** Imagen 4 Fast $0.02, Standard $0.04, Ultra $0.06 confirmed via Vertex AI pricing page. Gemini 2.5 Flash Image ~$0.039/img (1290 tokens × $30/1M) confirmed.
- **Gemini 2.5 Flash Image model ID and discontinuation:** `gemini-2.5-flash-image`, GA Oct 2, 2025, EOL Oct 2, 2026 — confirmed.
- **`negativePrompt` removed from Imagen 3.0-002 and all Imagen 4:** Confirmed.
- **SynthID watermark is non-optional:** Confirmed.
- **`enhancePrompt=true` default on Imagen:** Confirmed still default behavior.
- **SDK code examples:** All examples use correct `google-genai` SDK (`from google import genai`) — no old SDK imports found.
- **Gemini 2.5 Flash Image text rendering:** Strong for short-to-medium strings, confirmed via community sources.
- **`IMAGE_SAFETY` futex deadlock (4d #8):** Open bug, confirmed still unresolved as of April 2026 per search results.
- **MIME-type lie bug (4d #9):** Closed as "stale" per original research; no fix shipped.

---

## Remaining Gaps / Future Work

1. **Imagen 4 successor for batch-4 / fixed-resolution use cases:** `gemini-2.5-flash-image` is the migration target but does not support batch-4 or the same fixed-resolution control (2048×2048 explicit) that Imagen 4 Standard/Ultra provided. Neither `gemini-3.1-flash-image-preview` nor any current GA model has been benchmarked as a drop-in replacement for these specific capabilities. This needs a dedicated angle update once `gemini-3.1-flash-image` reaches GA.

2. **Free tier situation evolving:** The free tier status for image models has been in flux (92% quota cut in December 2025, partial recovery by February 2026, possible further changes). The conservative policy — treat as "requires billing" for production — is correct. Monitor https://ai.google.dev/gemini-api/docs/rate-limits for official free-tier table updates.

3. **`gemini-3.1-flash-image-preview` prompting analysis:** Listed in `4e`'s model table but no dedicated angle covers its prompting dialect, quirks, or capability differences from `gemini-2.5-flash-image`. Needs angle 4f once the model reaches GA.

4. **Geolocation-gated billing requirements:** Some EU/GDPR-region users report different billing tiers and model availability restrictions beyond `personGeneration` rules. Not yet documented in this category.
