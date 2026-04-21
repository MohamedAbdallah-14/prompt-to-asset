# Research Update Log — Category 08 (Logo Generation)
Date: 2026-04-21
Auditor: research-updater agent

---

## Summary of Changes

Five of the seven files in `08-logo-generation/` were edited in-place.
`8a-logo-design-theory-and-brand-fundamentals.md` received a single
correction note. `index.md` required no edits (metadata only). All edits
use `> **Updated 2026-04-21:**` callouts so readers can distinguish
corrections from original research.

---

## File-by-File Changes

### 8a-logo-design-theory-and-brand-fundamentals.md

- **Executive Summary paragraph:** Removed stale reference to "DALL·E 3"
  as a named current model. Replaced with `gpt-image-1`. Added an
  `Updated 2026-04-21` callout noting the DALL·E 3 deprecation (May 12,
  2026), Recraft V4 release (Feb 2026), and Midjourney V8 Alpha (Mar 2026).

---

### 8b-prompt-patterns-by-logo-style.md

- **`models_covered` frontmatter:** Added `midjourney-v8`, `recraft-v4`,
  `ideogram-3`, `gemini-3-pro-image`, `gpt-image-1-5`.

- **Midjourney v6/v7 section:** Renamed to "v6/v7/v8". Added `Updated
  2026-04-21` block noting MJ V8 Alpha launched March 17, 2026; V8.1
  Alpha launched April 14, 2026. V8 is ~5× faster, produces native 2K,
  and significantly improves text rendering for quoted strings. Still in
  alpha; Ideogram 3 remains the text-rendering benchmark leader.

- **Recraft V3 section:** Renamed to "Recraft V3 / Recraft V4". Added
  `Updated 2026-04-21` block noting Recraft V4 released February 2026
  with four variants (raster/vector × standard/pro). `controls.colors`
  API parameter carried forward; V4 API parameter structure noted for
  providers like fal.ai.

- **Gemini 2.5 Flash Image section:** Renamed to "Gemini Flash Image /
  Nano Banana family". Added `Updated 2026-04-21` block clarifying the
  model naming: Nano Banana = gemini-2.5-flash-image (free ~500 req/day,
  restored Feb 2026 after Dec 2025 cut); Nano Banana 2 =
  gemini-3.1-flash-image-preview (Feb 26, 2026; 4K; free dev tier); Nano
  Banana Pro = gemini-3-pro-image-preview (no free API tier, billed
  only); Imagen 4 has no free tier. Expanded per-model bullet list.

- **DALL·E 3 / gpt-image-1 section:** Added `Updated 2026-04-21` block
  noting DALL·E 3 deprecation (announced Nov 2025, effective May 12,
  2026). ChatGPT switched to gpt-image-1.5 in Dec 2025. Added
  gpt-image-1.5 architecture note (native multimodal, ~4× faster, ~20%
  cheaper, better text rendering).

---

### 8c-text-rendering-in-logos.md

- **`models_covered` frontmatter:** Added `recraft-v4`, `midjourney-v8`,
  `gemini-3.1-flash-image`.

- **Model comparison benchmark table:** Added `Updated 2026-04-21` preamble
  summarizing five model-landscape shifts. Added rows for:
  - Recraft V4 (replacing V3 row — improved text accuracy)
  - Nano Banana 2 (gemini-3.1-flash-image, Feb 2026, 4K, free dev tier)
  - Midjourney v8 Alpha (Mar 2026, improved quoted-text rendering)
  - DALL·E 3 marked as legacy/deprecated (May 12, 2026)
  - GPT-Image-1 row clarified as being superseded by 1.5

- **Multi-script support table:** Added `Updated 2026-04-21` note.
  Updated column header from "Recraft V3" to "Recraft V4". Updated
  "Gemini 3 Pro Image" column header to "Nano Banana Pro (Gemini 3 Pro
  Image)" with note that it has no free API tier. Added "Midjourney v8α"
  column. Added Nano Banana Pro free-tier warning to headline takeaways.

- **References:** Added Recraft V4 model page URL alongside V3 (now marked
  legacy).

---

### 8d-monograms-and-color-palette-control.md

- **Recraft v3 / Recraft API section:** Renamed to "Recraft V4 / Recraft
  API". Added `Updated 2026-04-21` block noting V4 release (Feb 2026),
  four model variants, and that V4 API `controls.colors` parameter
  structure may differ per provider integration.

- **Gemini 2.5 Flash Image section:** Renamed to "Gemini Flash Image /
  Nano Banana family". Added `Updated 2026-04-21` block explaining the
  full Nano Banana naming tree and clarifying which models have free vs
  paid tiers. Noted Dec 2025 free-tier cut and Feb 2026 partial
  restoration for Nano Banana (flash). Noted Nano Banana Pro remains
  billed-only.

- **DALL·E 3 / GPT-image-1 / GPT-image-1.5 section:** Added `Updated
  2026-04-21` block noting DALL·E 3 deprecation. Noted gpt-image-1.5
  improvements (4× faster, 20% cheaper, native multimodal, better text
  rendering).

- **Ideogram 2.0 section:** Renamed to "Ideogram 3.0 (formerly 2.0)".
  Added `Updated 2026-04-21` note. Updated accuracy figure to 90–95%.
  Marked as #1 on published text-rendering benchmarks as of Apr 2026.

- **Tradeoffs section:** Updated "Ideogram 2.0 and Recraft v3" → "Ideogram
  3.0 and Recraft V4". Updated MJ reference to "V7 or V8 Alpha".

---

### 8e-svg-vector-logo-pipeline.md

- **Executive summary / top-level architectures:** Added `Updated 2026-04-21`
  preamble noting Recraft V4 release (Feb 2026), DALL·E 3 deprecation, and
  directing readers to update fallback chains.

- **Native vector sub-table (Stage 2a):** Replaced "Recraft V3 SVG" row
  with "Recraft V4 Vector" and "Recraft V4 Pro Vector" rows. Updated notes
  to reflect Feb 2026 release and improved text accuracy.

- **Practitioner recipe:** Updated `recraft-v3-svg` → `recraftv4` model
  parameter in the curl command.

- **Open-source libraries table:** Updated "Recraft V3 SVG API" row to
  "Recraft V4 Vector API" with link to V4 docs.

---

### SYNTHESIS.md

- **Insight #9 (text rendering routing):** Added `Updated 2026-04-21`
  callout listing the five model-landscape changes. Updated body text:
  "Recraft V3" → "Recraft V4"; "Midjourney v7" noted as "MJ V8 Alpha
  improving"; added note that Nano Banana Pro has no free API tier;
  added Nano Banana 2 as a lower-cost CJK alternative.

- **Insight #14 (transparency):** Corrected the claim that `gpt-image-1`
  routinely ships a checker pattern. gpt-image-1 and gpt-image-1.5
  support true RGBA via API (`background: "transparent"`); the safety-pass
  recommendation is retained.

- **Insight #15 (logo as family):** Updated "Recraft-V3-SVG" →
  "Recraft-V4-Vector".

- **Style picker (router) decision tree:** Added `Updated 2026-04-21`
  callout. Updated all "Recraft V3" → "Recraft V4". Changed "DALL·E 3 /
  gpt-image-1" → "gpt-image-1 / gpt-image-1.5" with explicit "Do not
  route to DALL·E 3" note. Updated "Midjourney v6/v7" → "v7/v8".
  Updated CJK routing to mention Nano Banana 2 as a free-dev-tier
  alternative to the billed Nano Banana Pro.

- **Vendor documentation references:** Added deprecation note for DALL·E 3
  under the OpenAI entry.

---

## Key Facts Verified via Web Search

| Claim | Verified Status |
|---|---|
| Recraft V4 released | **Confirmed** — released Feb 2026; 4 variants (raster/vector × std/pro). `controls.colors` API carried forward. |
| DALL·E 3 deprecated | **Confirmed** — announced Nov 14, 2025; effective May 12, 2026. ChatGPT switched to gpt-image-1.5 in Dec 2025. |
| gpt-image-1.5 architecture | **Confirmed** — native multimodal (not diffusion); ~4× faster, ~20% cheaper than gpt-image-1; better text rendering. |
| gpt-image-1 / 1.5 transparent background | **Confirmed** — both support `background: "transparent"` in API (PNG/WebP only). |
| Ideogram 3.0 text accuracy | **Confirmed** — ~90–95% accuracy; released March 26, 2025; remains #1 on typography-focused benchmarks as of Apr 2026. |
| Midjourney V8 Alpha | **Confirmed** — launched March 17, 2026; V8.1 Alpha April 14, 2026. Significantly improved quoted-text rendering; ~5× faster; native 2K. Still alpha. |
| Nano Banana free API tier | **Confirmed (nuanced)** — Nano Banana (gemini-2.5-flash-image): ~500 req/day free API (partially restored Feb 2026 after Dec 2025 cut). Nano Banana 2 (gemini-3.1-flash-image): free dev tier, released Feb 26, 2026, 4K output. Nano Banana Pro (gemini-3-pro-image): 0 free RPD — billed only. Imagen 4: no free tier. |
| BiRefNet / RMBG 2.0 status | **Confirmed** — both actively maintained as of early 2026. ComfyUI-RMBG v3.0.0 released Jan 2026. BRIA RMBG 2.0 remains non-commercial (CC-BY-NC-4.0); commercial license required. |
| Looka / Brandmark active | **Confirmed** — both services operational in 2026. Neither exposes a public developer API; they are consumer web products. |

---

## Claims Not Requiring Changes

- **BiRefNet as best-in-class open matte** — remains correct.
- **vtracer / potrace as primary vectorizers** — no competitive shift detected.
- **SVGO as standard SVG optimizer** — still current.
- **SDXL + ControlNet + IP-Adapter for local monograms** — still the
  highest-ceiling local path.
- **Named palettes > hex in prompts** — VIOLIN benchmark still the best
  citation; no newer conflicting benchmark found.
- **AnyText for CJK self-host** — still the best open-source path for
  character-accurate CJK rendering.
- **Logo design theory (8a)** — Henderson & Cote 1998, Elliot & Maier 2014,
  Labrecque & Milne 2012, Paul Rand — all timeless; no corrections needed.
- **Arabic/Hebrew/Devanagari fallback** — "generate mark, typeset in
  shaping engine" remains the correct advice.
