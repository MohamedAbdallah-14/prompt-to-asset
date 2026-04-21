# Research Update Log — Category 15 (Style Consistency & Brand)
Updated: 2026-04-21

## Files modified

### 15a-consistent-character-and-mascot.md

**Issue 1 — `--cref` deprecation in V7+**
- Claim: "`--cref` is V6/Niji-6 only; V7 replaces it with Omni Reference (`--oref`)" — this accurate fact was buried in one sentence.
- Fix: Expanded the MJ `--cref` section with a dated `> **Updated 2026-04-21**` block clarifying that `--cref` does NOT work in V7 or V8; the correct V7 parameter is `--oref` (Omni Reference, `--ow` for weight, 0–1000). V8.1 Alpha (April 2026) drops `--oref`/`--ow` entirely. Added note to Use Case A fallback recipe to include `--oref` alongside `--cref`.
- Sources: MJ official docs, updates.midjourney.com/omni-reference-oref/, blakecrosley.com V8.1 reference guide.

**Issue 2 — Technique comparison table label**
- Changed row label from "MJ `--cref`" to "MJ `--cref` (V6) / `--oref` (V7)" to avoid confusion.

**Issue 3 — PuLID Flux port now covers Flux.2**
- Added dated note: PuLID now has community ports for Flux.2 (Klein 4B/9B, Dev 9B) via ComfyUI-PuLID-Flux2 (v0.6.2, March 15, 2026). Uses InsightFace + EVA-CLIP. Quantized-Flux integration available via ComfyUI-nunchaku.

---

### 15b-style-transfer-sref-b-lora.md

**Issue 1 — MJ `--sv` now has 6 versions, default is `--sv 6`**
- The file referenced pinning as `--v 6 --sv 4`. Stale: `--sv 4` is now the *legacy V7* algorithm (pre-June 2025). The current V7 default is `--sv 6`. V6 codes use `--v 6` (no `--sv` needed). Added dated note to the `--sref` section and to Drift Management failure mode #3.
- Added note: MJ V8 Alpha (March 2026) keeps `--sref`; V8.1 drops `--oref`/`--ow`. Style Creator (new web UI feature) allows browsing internal style handles.

**Issue 2 — Recraft V4 style support**
- Claim: "at the time of writing styles are v2/v3 only." Still accurate but needed a firm dated statement.
- Fix: Replaced with a clear dated statement: as of April 2026, per official Recraft styles API docs, **styles are not supported for V4 models at all**. Custom brand styles (API-created) are V3/V3 Vector only. V4 does support `controls.colors` for palette enforcement but not `style_id`.

**Issue 3 — Flux IP-Adapter now has native support via XLabs**
- Claim: "Flux.1 dev/pro — Style via LoRA (no native style-ref param yet in most API wrappers)" — STALE.
- Fix: Updated table row and added a dated note: XLabs-AI released `flux-ip-adapter-v2` (HuggingFace), trained at 1024×1024 for 350k steps. Integrates with XLabs ControlNet (Canny, Depth, HED).

---

### 15c-brand-color-palette-enforcement.md

**Issue 1 — "Recraft v3 is the only major API with first-class palette input"**
- Stale: Recraft V4 (Feb 2026) also supports `controls.colors` (RGB triplets + `background_color`).
- Fix: Updated executive summary, rank table (Rank 3 row), and §5 recommended pipeline to say "V3 or V4." Added clear caveat: custom `style_id` is V3-only; V4 has `controls.colors` but no `style_id` support.

---

### 15d-machine-readable-brand-bundle.md

**Issue 1 — ostris/ai-toolkit scope expanded**
- Added dated note: toolkit now supports Flux.2 (Klein 4B/9B, Dev 9B) and 10+ architectures. VRAM requirements for Flux.2 noted.

**Issue 2 — MJ model_bindings missing `--sv`**
- Added `"sv": 6` to the `midjourney-v7` block in the example brand bundle JSON.
- Added dated note: record `--sv` alongside the sref code; V8 (March 2026) renders differently; update `model_bindings` key when V8 stable ships.

**Issue 3 — IP-Adapter model value for Flux**
- Added dated note: brand bundle `ip_adapter.model` should support `"xlabs-flux-ip-adapter-v2"` for Flux.1-dev pipelines.

---

### 15e-full-asset-set-consistency.md

**Issue 1 — MJ sref code storage missing `--sv`**
- Added dated note to the Midjourney `--sref` section: always record `--sv` alongside sref code. Updated example: `"mj_sref": "--sref 3142857 --sw 250 --sv 6"`. Noted V8 Alpha behavior and Style Creator feature.

---

### SYNTHESIS.md

**Issue 1 — Insight #2 references `--cref` as current for V7**
- Updated to say "MJ `--oref` (V7+) / `--cref` (V6)". Added dated callout note explaining `--cref` is deprecated in V7, `--oref` replaces it, and V8.1 Alpha drops `--oref`.

**Issue 2 — Insight #7 Recraft palette claim**
- Updated: "Recraft V3 and V4 are the only major hosted APIs with first-class palette input." Added clear caveat that custom `style_id` is V3/V3 Vector only, not V4.

**Issue 3 — Insight #15 drift pinning note**
- Updated: "`--sv 6` is the V7 default since June 16, 2025; V8 Alpha launched March 2026." Added dated note about recording `--sv` values.

**Issue 4 — Map of Angles table**
- Changed "MJ `--cref`" → "MJ `--oref` (V7) / `--cref` (V6)".

**Issue 5 — Layered Injection §2**
- Updated MJ layer to include `--sv 6` (with note about which value to use for legacy vs. new codes). Updated Flux IP-Adapter note to mention XLabs `flux-ip-adapter-v2`. Clarified that Recraft `style_id` is V3-only while `controls.colors` works on V3 and V4.

---

## Claims verified as still accurate (no changes needed)

- **CSD (arXiv:2404.01292)**: Still a current and actively-used style similarity metric as of 2025–2026. Referenced in Nov 2025 papers. Weights still available on HuggingFace. Thresholds (≥0.72 on-brand, 0.60–0.72 ambiguous, <0.60 off-brand) remain the community standard.
- **DTCG 2025.10 format**: W3C Final CG Report published Oct 28, 2025. Still the correct base layer.
- **Style Dictionary v4 + `@tokens-studio/sd-transforms` v2**: Still current.
- **PuLID (original) for SD/SDXL**: NeurIPS 2024 state-of-the-art claims still hold. Flux.1 port still works.
- **B-LoRA block 4/5 SDXL insight**: Still accurate for SDXL architecture; no confirmed Flux port of B-LoRA's block-specific approach (Flux MMDiT differs structurally from SDXL UNet, so block numbering doesn't transfer directly).
- **gpt-image-1.5**: Released Dec 16, 2025 — the files reference it correctly.
- **Gemini 2.5 Flash Image pricing ($0.039/image)**: Confirmed accurate.
- **Gemini image API free tier**: As of Feb 2026, approximately 500 RPD for Gemini 2.5 Flash Image (recovered from Dec 2025 cuts). The CLAUDE.md note that "unbilled keys return HTTP 429" on Gemini/Imagen was about the Gemini *text-only* Imagen API; Gemini 2.5 Flash Image (Nano Banana) does have a free tier at 500 RPD as of Feb 2026. The SYNTHESIS.md does not make claims about this, so no correction needed there (it's handled in CLAUDE.md memory).
- **IP-Adapter (original, tencent-ailab)**: Original weights still available and used.
- **Sharp #1441 (Node.js 3-D LUT)**: Feature request still open as of 2025-2026. The 15c claim that "Sharp does not yet expose libvips' `maplut` operation" remains accurate.
- **Ideogram 3.0 character ref and style ref**: Launched March 26, 2025; API still current. Style codes and character reference still work as described.
- **Flux Redux/Fill/Depth**: Still available from BFL; community workflows still active.

---

## Known remaining gaps (not corrected — need more research or are open questions)

- **B-LoRA for Flux**: No confirmed Flux port of B-LoRA's block-specific decoupling. Flux uses MMDiT (different from SDXL UNet); the "block 4/5" finding doesn't directly transfer. The files correctly scope B-LoRA to SDXL; no correction needed, but a note that no Flux equivalent exists would be informative.
- **Midjourney V8 stable parameters**: V8 is still in alpha/V8.1 alpha as of April 2026. `--oref` status in V8 final is unknown. Monitor MJ updates.
- **Recraft V4 style_id roadmap**: No public timeline for V4 style support. Monitor Recraft changelog.
