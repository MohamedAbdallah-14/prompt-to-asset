# Research Update Log — Category 16 (Background Removal & Vectorization)
**Updated:** 2026-04-21
**Auditor:** research-updater agent

---

## Files audited

- `16a-rembg-ecosystem.md`
- `16b-sam-family-segmentation.md`
- `16c-vectorization-tooling-production.md`
- `16d-commercial-bg-removal-apis.md`
- `16e-matte-refine-optimize-export.md`
- `SYNTHESIS.md`
- `index.md` (no changes needed — already dated 2026-04-21 with correct caveat)

---

## Changes made

### 16a-rembg-ecosystem.md

**Claim:** Model catalog listed `birefnet-massive` as the last BiRefNet variant.
**Status:** Outdated.
**Fix:** Added two new official BiRefNet checkpoints released in early 2025:
- `birefnet-hr` — BiRefNet_HR (February 2025, 2048² training, best hair accuracy)
- `birefnet-dynamic` — BiRefNet_dynamic (March 2025, dynamic resolution 256–2304 px)
Also noted BiRefNet_HR-matting (Feb 2025, general matting at 2K) and the September 2025 SDPA attention upgrade. Added rembg issue #720 caveat that these checkpoints may not yet be in the official rembg release.

**Claim:** Section "BRIA RMBG-2.0 direct" did not specify gated HuggingFace access requirement.
**Status:** Partially stale.
**Fix:** Clarified that BRIA weights are on a *gated* HuggingFace repo requiring license acceptance to download.

**New section added:** **BEN2** (PramaLLC/BEN2, Apache 2.0 base model) — new background removal model using Confidence Guided Matting (CGM) that specifically targets boundary uncertainty. Released early 2025, claims to outperform BiRefNet-HR on hair/fur. Not yet in rembg; available via fal.ai and web demo. Added to References.

---

### 16b-sam-family-segmentation.md

**Claim:** Document covered SAM 2 (August 2024) but did not mention SAM 2.1.
**Status:** Outdated.
**Fix:** Added prominent update note under the SAM 2 section and under "Others worth knowing":
- SAM 2.1 released September 29–30, 2024
- Improved checkpoints (Tiny/Small/Base+/Large variants)
- Training code and web demo front-end/back-end code released publicly for the first time
- Improved on visually similar objects, small objects, occlusion handling
- December 2024 additions: full model compilation, new SAM2VideoPredictor, per-object independent inference
- Use `facebook/sam2.1-hiera-*` HuggingFace checkpoints for all new pipelines
- Added reference entry for SAM 2.1

---

### 16c-vectorization-tooling-production.md

**Claim:** "SVGO with a tuned `preset-default` + `floatPrecision: 2`" — config showed `overrides: { removeViewBox: false }`.
**Status:** Outdated for SVGO v4.
**Fix:** Added update note that SVGO v4.0.0 (current: v4.0.1) changed `preset-default` so `removeViewBox` and `removeTitle` are now *disabled by default*. The `overrides: { removeViewBox: false }` is now a no-op. Updated the svgo.config.js example to remove the redundant override. Added link to v4 migration guide.

**Claim:** `vtracer-wasm` npm package described as "first-party, published July 2025".
**Status:** Unverified / potentially incorrect package name.
**Fix:** Web search could not confirm an npm package named `vtracer-wasm`. The established wasm binding package is `vectortracer` (by AlansCodeLog/visioncortex). Also noted `@neplex/vectorizer` as a native Node binding alternative. Updated all references throughout the file (tool fit table, wasm section heading, production pattern, references). Added caveat to verify current package name at npmjs.com before pinning.

**Claim:** Tool fit table showed `vtracer-wasm npm, first-party`.
**Status:** Updated. Changed to `vectortracer` npm.

**Claim:** autotrace listed as "v0.31.10, Jan 2024".
**Status:** Minor update. Latest confirmed version is v0.31.1 (March 2026 per soft112 listing). Changed references section accordingly.

---

### 16d-commercial-bg-removal-apis.md

**Claim:** "Clipdrop (Stability AI, not explicitly in the 16d brief but shows up in the Arena) — fourth place."
**Status:** Incorrect attribution.
**Fix:** Clipdrop was acquired by Jasper.ai from Stability AI in February 2024. The background removal API remains operational. Updated attribution in the benchmark section.

**Claim:** Cloudinary Add-on note described as "Add-on is deprecated for accounts created after 2026-02-01".
**Status:** Correct but imprecise.
**Fix:** Clarified that the *subscription-based add-on* is being deprecated, while `e_background_removal` as a transformation continues. Added migration note that existing subscribers should switch to transformation billing.

**Claim:** remove.bg pricing figures (e.g., "~$0.18-0.20/image at 40-credit/mo tier").
**Status:** Approximate; confirmed current entry tier is ~$9/40 credits ($0.225/image).
**Fix:** Added a dated pricing note clarifying that entry tier is approximately $9/40 credits/month as of March 2026 snapshot, and directed readers to verify at remove.bg/pricing. Noted the 5-month credit rollover limit.

---

### 16e-matte-refine-optimize-export.md

**Claim:** SVGO config used `{ name: 'preset-default', params: { overrides: { removeViewBox: false } } }` plus standalone `'removeTitle'` and `'removeDesc'` plugins.
**Status:** Outdated for SVGO v4.
**Fix:** Added update note explaining SVGO v4 changes. Updated the `svgo.config.js` example to remove now-redundant `removeViewBox: false` override and the `removeTitle`/`removeDesc` standalone entries (which are now no-ops in v4 since those plugins are disabled by default).

---

### SYNTHESIS.md

**Status:** Date updated from 2026-04-19 to reviewed 2026-04-21. Added a consolidated update block at the top summarizing all key changes:
- SAM 2.1 note
- New BiRefNet checkpoints (HR, dynamic, HR-matting)
- BEN2 new model mention
- SVGO v4 breaking change summary
- vtracer-wasm package name correction
- Clipdrop → Jasper.ai ownership correction
- Cloudinary add-on deprecation clarification

Updated inline text:
- Insight #5: `vtracer-wasm` → `vectortracer` npm
- Recommendation #7: `vtracer-wasm` → wasm build / `vectortracer` npm
- Map of angles table 16c row: updated package names
- Primary sources: updated vtracer wasm references

---

## Claims verified as accurate (no change needed)

- rembg default model remains `u2net` (not BiRefNet) — confirmed by PyPI/GitHub search.
- BRIA RMBG-2.0 license is CC BY-NC 4.0 — confirmed on HuggingFace model card.
- Photoroom `/v1/segment` at $0.02/image — pricing page still shows this structure.
- BiRefNet MIT license for the source/weights — still correct.
- DiffVG non-determinism issues — issues #63 and #46 remain unresolved.
- pypotrace is inactive/unmaintained — confirmed. `potracer` (pure Python port) exists as fallback.
- SAM/rembg integration model `sam` (ViT-B) is still in rembg catalog.
- BRIA async V2 API (`request_id` + `status_url`) — confirmed as current API design.
- Photoroom Arena (9,000 Elo votes, Dec 2024–Jan 2025) ranking: Photoroom > Remove.bg > BRIA > Clipdrop — still accurate.
- Cloudinary: first request HTTP 423 while derived asset computes — still documented behavior.
- MatAnyone (CVPR 2025, arXiv:2501.04205) — paper reference correct.

---

## Sources consulted

- https://github.com/ZhengPeng7/BiRefNet (BiRefNet releases)
- https://github.com/danielgatis/rembg/issues/720 (BiRefNet_HR integration)
- https://github.com/facebookresearch/sam2 (SAM 2.1 release notes)
- https://encord.com/blog/sam-2.1-explained/
- https://github.com/svg/svgo/releases/tag/v4.0.0
- https://svgo.dev/docs/migrations/migration-from-v3-to-v4/
- https://www.npmjs.com/package/vectortracer
- https://huggingface.co/PramaLLC/BEN2 (BEN2 model card)
- https://huggingface.co/briaai/RMBG-2.0 (BRIA license)
- https://www.remove.bg/pricing (remove.bg pricing)
- https://www.photoroom.com/api/pricing (Photoroom pricing)
- https://cloudinary.com/documentation/cloudinary_ai_background_removal_addon (deprecation notice)
- https://clipdrop.co/apis (still operational)
- https://www.prnewswire.com/news-releases/jasper-expands-by-acquiring-image-platform-clipdrop (Jasper acquisition)
