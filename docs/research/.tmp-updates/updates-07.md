# Research Update Log — Category 07 (Midjourney / Ideogram / Recraft)
**Date:** 2026-04-21
**Auditor:** Research updater agent

---

## Summary

All five angle files (7a–7e) plus SYNTHESIS.md were read and audited. The files were
recently written (last_updated 2026-04-19) and are generally accurate. Six factual
gaps or outdated claims were found and corrected in-place:

---

## Changes Made

### 7a — `7a-midjourney-v6-v7-prompting.md`

**Issue 1 — Midjourney V8 not mentioned**
- The executive summary ended at V7 (default since 2025-06-17).
- V8 Alpha launched March 17, 2026; V8.1 Alpha launched April 14, 2026 (alpha.midjourney.com).
- V8 key features: 5× faster than V7, native 2K HD (`--hd`), improved text rendering
  in quoted strings, 99% seed stability claimed for V8.1 Alpha, new `--q 4` mode.
- **Fix:** Added `> **Updated 2026-04-21:**` block at executive summary; added V8/V8.1
  to the model timeline bullet; updated the parameter table version range from
  `5.2/6/6.1/7` to include `8`; updated seed stability note.
- Sources: [updates.midjourney.com/v8-alpha/](https://updates.midjourney.com/v8-alpha/),
  [updates.midjourney.com/v8-1-alpha/](https://updates.midjourney.com/v8-1-alpha/),
  WaveSpeedAI blog, MindStudio blog.

**Issue 2 — "No official API" claim slightly imprecise**
- The original said "Midjourney has never shipped a public API."
- More accurate: no public self-serve API. Enterprise customers can negotiate custom
  API access (~$500/month per reports) through Midjourney's sales team, but there
  is no documented REST endpoint or API key for standard plans as of April 2026.
- **Fix:** Reworded to "No official public API" with clarification about enterprise-only
  custom access.

**Addition:** Added V8 Alpha and V8.1 Alpha to the References section.

---

### 7b — `7b-ideogram-text-rendering-for-logos.md`

**No changes needed.** The file accurately covers Ideogram up to V3 (March/May 2025).
No Ideogram 3.5 or later model has been released as of April 2026. Pricing snapshot
(Turbo ~$0.03, Quality ~$0.09) cross-checks with current sources. API endpoints and
parameter schema are current. No updates required.

---

### 7c — `7c-recraft-v3-vector-and-brand-styles.md`

**Issue 3 — Recraft V4 release date missing / imprecise**
- The file mentioned V4 existed but did not give a release date. The text said "2025
  successor" but V4 released **February 2026**.
- **Fix:** Updated the model table header and the V3/V4 section to state "February 2026"
  for V4; added a `> **Updated 2026-04-21:**` block.

**Issue 4 — V4 "no styles" claim needed confirmation**
- The original claim that V4 has no `style`/`style_id` support was correct and
  confirmed via the live Recraft docs (April 2026): *"Styles are not yet supported
  for V4 models."* This applies to all four V4 variants.
- **Fix:** Updated Limitations §1 to explicitly note February 2026 release date and
  that the limitation is confirmed as of April 2026 (not just "as of early 2026").
- Source: [recraft.ai/docs/api-reference/styles](https://www.recraft.ai/docs/api-reference/styles)

---

### 7d — `7d-leonardo-playground-krea-firefly.md`

**Issue 5 — Firefly Image 5 described as "preview, 2025"**
- Firefly Image 5 was announced at Adobe MAX in **October 2025** and is now in
  Photoshop (Beta) for Generative Fill as of **March 18, 2026**. Describing it as
  "preview, 2025" understates its current availability.
- Layered Image Editing and Custom Models remain in private/closed beta.
- **Fix:** Updated the Firefly lineage bullets and executive summary with accurate
  dates. Added `> **Updated 2026-04-21:**` block at the Firefly section.
- Sources: TechCrunch Oct 28, 2025; Adobe community announcement March 18, 2026.

**Issue 6 — Leonardo Phoenix 2.0 not mentioned**
- Leonardo launched Phoenix 2.0 in late 2025 with improved character consistency
  (85–90% identity preservation) and better text rendering. The file only listed
  Phoenix 1.0 and 0.9.
- **Fix:** Updated the model catalog to list Phoenix 2.0 first with a `> **Updated
  2026-04-21:**` block.
- Source: Flowith blog (Leonardo Phoenix 2.0 article), multiple 2026 reviews.

**Issue 7 (minor) — Krea Edit date**
- The file correctly had "Mar 2026" but lacked detail. Krea Edit launched **March 9,
  2026** with specific features: regional selection, object movement with gap-fill,
  perspective/lighting/palette changes, image expansion. A platform-wide redesign
  also shipped in March 2026.
- **Fix:** Expanded the Krea Edit bullet with launch date and feature summary.
- Source: [krea.ai/blog/krea-edit](https://www.krea.ai/blog/krea-edit)

---

### 7e — `7e-commercial-tool-asset-workflows.md`

**Issue 8 — "Recraft V4 Vector" listed as top native vector option**
- The tool-strengths matrix listed "Recraft V4 / V4 Pro Vector" as the native vector
  best-in-class, but V4 has no `style_id` support — making V3 Vector the correct
  default for brand-consistent pipelines.
- **Fix:** Updated the matrix to "Recraft V3 Vector (brand-style pipelines) / V4
  Vector (non-branded)". Added similar clarification to "Where Each Tool Sits."
- Also updated executive summary to mention V8 Alpha and Krea Edit.

---

### SYNTHESIS.md

**Updates:**
- Changed `last_updated` date in header to 2026-04-21.
- Added a multi-bullet `> **Updated 2026-04-21:**` block summarizing all key changes.
- Updated point 4 ("Midjourney is great...") to clarify enterprise-only custom API
  option and mention V8.
- Updated point 6 ("Recraft V4 removed styles") to confirm February 2026 release date
  and cite official docs.

---

## Claims Verified as Still Accurate (No Change Needed)

| Claim | Status |
|---|---|
| Ideogram V3 as best text renderer (~90% short English) | Still accurate |
| Ideogram `/generate-transparent` as only dedicated T2I transparent endpoint | Still accurate |
| Ideogram V3 pricing: Turbo ~$0.03, Quality ~$0.09 | Confirmed current |
| Recraft V3 as only commercially-hosted native SVG model | Still accurate (V4 also native SVG but no styles) |
| Recraft V3 pricing: $0.04 raster, $0.08 vector | Confirmed current |
| Playground v3 API is partner-gated (>1M images/month) | Confirmed still true |
| Midjourney no public API | Confirmed (enterprise custom access only at ~$500/mo) |
| MJ `--sref` / `--cref` / `--oref` parameter syntax unchanged | Confirmed |
| Niji V7 launched January 2026 | Confirmed |
| Leonardo Phoenix transparency: `foreground_only` | Confirmed |
| Firefly indemnity does not extend automatically to API | Confirmed |
| FLUX 1.1 Pro on Together: $0.04/MP | Confirmed |

---

## Items Not Investigated (Out of Scope / No Signal of Change)

- Luma Photon pricing (no signal of change)
- Bing Image Creator status (known to still be DALL-E 3 wrapper, no API)
- Ideogram `style_codes` portability across model versions
- Specific Recraft V4 quality vs V3 quality benchmarks (no reproducible head-to-head found)
