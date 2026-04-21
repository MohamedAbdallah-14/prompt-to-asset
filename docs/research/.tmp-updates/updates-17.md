# Research Update Log — Category 17 (Upscaling & Refinement)
Date: 2026-04-21
Auditor: research-updater agent

## Files audited

- `17a-esrgan-swinir-hat-family.md`
- `17b-supir-ccsr-diffbir-refinement.md`
- `17c-face-text-hand-targeted-refinement.md`
- `17d-logo-icon-sharpness-refinement.md`
- `17e-deployment-patterns-upscaling.md`
- `index.md`
- `SYNTHESIS.md`

---

## Changes made

### 17a-esrgan-swinir-hat-family.md

**Claim:** chaiNNer release 0.24 (June 2024) described as the latest, with no further note.
**Finding:** chaiNNer resumed active development and released **v0.25.1** on January 7, 2026. Development had stalled for over a year but is ongoing at reduced capacity with nightly builds through early 2026.
**Action:** Added `> Updated 2026-04-21` callout after the 0.24 description noting v0.25.1 stable.

---

### 17b-supir-ccsr-diffbir-refinement.md (most changes)

**Claim 1:** Clarity Upscaler described as SD1.5-only; "Flux upscaling is not in the OSS repo; it is paywalled into the hosted ClarityAI.co service."
**Finding:** The core claim was already correct (Flux is paywalled), but the document missed that Flux support was added in **March 2025** (announced by philz1337x on X). The OSS SD1.5 path is unaffected. Max output also expanded to 205 MP (14,336×14,336).
**Action:** Updated the Clarity section to document Flux support date, clarify SD1.5 vs Flux split, add max resolution figure. Updated method table cell.

**Claim 2:** Topaz Gigapixel described as "2024–2025" product with implied perpetual licensing option.
**Finding:** Topaz Labs ended all perpetual licenses on **3 October 2025**. All products now sold only as the Topaz Studio subscription: $399/year (Standard) or $799/year (Pro). Existing perpetual holders keep current version but get no updates.
**Action:** Added a prominent `> Updated 2026-04-21` section after the Topaz architecture paragraph. Updated method table year to "2024–2026". Updated references to point to correct URL (topazlabs.com/topaz-gigapixel) and added the CG Channel end-of-perpetual source.

**Claim 3:** Magnific pricing not stated anywhere in 17b.
**Finding:** Magnific starts at $39/month (Pro tier, ~2,500 tokens). No free tier. Token consumption varies by scale.
**Action:** Added a pricing callout after the Magnific section so pipeline budget decisions have a concrete figure.

**Claim 4 (new addition):** Flux.1 Pro Ultra 4MP native generation and gpt-image-1 upscaling limits were not documented.
**Finding:** Flux 1.1 Pro Ultra generates natively at 2048×2048 (4 MP) — no upscaling needed for that step. `gpt-image-1` max output is 1536×1024; no native upscaling API.
**Action:** Added `> Updated 2026-04-21` note in the Flux-dev "refiner" section covering both facts.

---

### 17c-face-text-hand-targeted-refinement.md

**Review finding:** No outdated claims requiring correction. adetailer is still active (AGPL-3.0), works with Flux via ComfyUI workflows (Impact Pack FaceDetailer is the ComfyUI equivalent — already documented). CodeFormer non-commercial license caveat is still accurate. No changes made.

---

### 17d-logo-icon-sharpness-refinement.md

**Review finding:** Content is accurate. Ideogram V3 / Recraft V4 SVG references remain current. vtracer, potrace, BiRefNet, RMBG-2.0 are all still the right tools. The DAT2 tier-1 recommendations hold. No changes required.

---

### 17e-deployment-patterns-upscaling.md

**Claim 1:** "DirectML was officially deprecated in May 2025; Windows WebNN now routes through Windows ML / OpenVINO."
**Finding:** This is **inaccurate**. DirectML entered *sustained engineering* at Microsoft Build 2025 — it still functions and is actively used as the default backend for WebNN on Windows in Chrome. It is not being removed. New *feature* development has moved to WinML, but DirectML is not deprecated in the sense of being removed. The W3C WebNN spec reached Candidate Recommendation in January 2026 covering 95 ops.
**Action:** Replaced the deprecated claim with an accurate "sustained engineering" description. Added note about Win 11 24H2+ WinML secondary path and the spec CR milestone.

**Claim 2:** "Firefox still ships WebGPU behind a flag."
**Finding:** Firefox shipped WebGPU in **stable** in early 2026. All four major browsers (Chrome, Edge, Firefox, Safari) now support WebGPU without flags (though device/enterprise disabling is still possible).
**Action:** Added callout correcting the Firefox flag claim.

**Claim 3:** Modal GPU memory snapshots described as a future/new concept.
**Finding:** Modal introduced GPU memory snapshots in 2025 as an alpha opt-in feature (`enable_memory_snapshot=True`), achieving up to 10× faster cold starts. Modal also reached unicorn status ($1.1B valuation, September 2025 Series B).
**Action:** Added `> Updated 2026-04-21` note in Pattern B section documenting the snapshot alpha and unicorn valuation.

**Claim 4:** Upscayl described as "44k+ GitHub stars."
**Finding:** Star count is approximately 43,700–44,000 as of early 2026 (search results show "over 43,700" and "over 44,000" across different sources). Latest version is v2.15.0 (Dec 2024/Aug 2025 depending on source).
**Action:** Updated to "~43–44k GitHub stars as of early 2026, latest v2.15.0."

**Claim 5:** `^webnn-compat` footnote said "DirectML deprecation May 2025."
**Action:** Corrected footnote to remove the false deprecation claim, added W3C CR milestone note.

Added two new footnotes: `^webgpu-allbrowsers` (Firefox stable WebGPU) and `^modal-unicorn` (Modal valuation + GPU snapshots).

---

### SYNTHESIS.md

- Updated `last_updated` from `2026-04-19` to `2026-04-21`.
- Added update callout under the WebGPU Controversies section: Firefox stable WebGPU support.
- Added update callout under the Magnific/Clarity Controversies section: Magnific $39/month pricing, Clarity Flux support (March 2025, paywalled), Topaz subscription-only from October 2025.
- Updated Topaz reference URL to correct path (`/topaz-gigapixel` not `/gigapixel-ai`).
- Added CG Channel perpetual-license-end source to references.

---

## Claims verified as still accurate (no changes)

- Real-ESRGAN x4plus, anime_6B variants and RRDB architecture descriptions — unchanged.
- SwinIR, HAT/Real-HAT architecture descriptions — unchanged.
- DAT2, DRCT-L, APISR recommendations — unchanged.
- spandrel v0.4.2 (Feb 21, 2026) is the latest version — confirmed.
- SUPIR VRAM requirements — community reports still consistent.
- CCSR v2 determinism advantage — no contradicting evidence found.
- adetailer AGPL-3.0, still active, works with Flux via ComfyUI Impact Pack — confirmed.
- CodeFormer non-commercial license — unchanged.
- Replicate `nightmareai/real-esrgan` still active (last updated April 19, 2026 per search results) at ~$0.0025/run T4 — confirmed active.
- Magnific engines (illusio/sharpy/sparkle/Flux) — still described consistently.
- Flux 1.1 Pro Ultra 4MP native — confirmed.
- OpenModelDB catalog still functional — confirmed.

## Claims that could not be verified with high confidence

- Modal A10G exact hourly pricing ($1.10/h) — Modal publishes H100 ($3.95/h), A100 ($2.10/h), T4 ($0.59/h) but A10G current rate is not clearly stated in search results; left unchanged pending direct verification.
- Runpod FlashBoot 200ms / 48% figure — from 2025 introl.com guide; may be stale. Left unchanged as no contradicting evidence found.
- Replicate exact per-run price for real-esrgan ($0.0025/run T4) — still consistent with search results showing model is active.
