# Research Update Log — Category 13 (Transparent Backgrounds)
Date: 2026-04-21
Auditor: Claude Sonnet 4.6

---

## Summary

Audited all 7 files in `docs/research/13-transparent-backgrounds/`. Made corrections in 5 files (SYNTHESIS.md, 13a, 13c, 13d, 13e). Files 13b (difference matting) and the index.md required no substantive corrections.

---

## Changes Made

### SYNTHESIS.md

**1. Insight #4 — Native RGBA model count wrong**
- Old: "Only two commercial model families emit real RGBA in April 2026" (gpt-image-1 + Ideogram 3.0)
- Fixed: "Three commercial model families" — Ideogram 3.0 confirmed as native via dedicated endpoint, not in-native-rgba purgatory
- Added `> Updated 2026-04-21` block with speed tier details (FLASH/TURBO/BALANCED/QUALITY)

**2. YAML frontmatter `native_rgba_models`**
- Recraft v3 reclassified from `native_rgba_models` to new `native_rgba_post_hoc_only` entry
- gpt-image-1 quality requirement added (`quality: "medium"/"high"`)
- Ideogram 3.0 endpoint path corrected (`/ideogram-v3/generate-transparent`)
- LayerDiffuse-Flux commercial license caveat added (AFL-3.0 LoRA is fine; BFL Non-Commercial base is not)

**3. R1 Routing table**
- `ideogram-3.0` moved to confirmed `alpha_native_protocol` entry with speed tier note
- `recraft-v3` reclassified to `alpha_native_restricted` — in-generation transparent flag unreliable
- Flux.1-dev commercial licensing caveat added
- Routing order updated: `gpt-image-1.5` (photo) or `ideogram-3.0` (logo/typography) as dual primary paths

**4. R3 Post-process fallback chain — API pricing**
- Old: Photoroom $0.02/image, remove.bg $0.20/image HD
- Fixed: remove.bg now credit-based (~$0.05/image at list); Photoroom $0.02 basic / $0.10 plus confirmed
- Added `> Updated 2026-04-21` pricing note

**5. R4 Cost reference date**
- Updated "Dec 2025 prices" to "April 2026 prices"

**6. Gaps section — LayerDiffuse-Flux commercial licensing**
- Old: "licensing status is unclear"
- Fixed: AFL-3.0 on LoRA weights confirmed; BFL Non-Commercial on Flux.1-dev base is the constraint; commercial path requires BFL commercial license for base model

**7. Controversies — Recraft v3**
- Extended to reflect 2026 community reports: in-generation transparent flag unreliable even for vector/icon styles
- Resolution: post-hoc Remove Background tool is the reliable path; SVG output (`response_format: "svg"`) is intrinsically transparent

**8. Controversies — gpt-image-1 vs Ideogram 3.0**
- Added: Recraft route note updated to reflect post-hoc Remove Background as the PNG-with-alpha path

---

### 13a-rgba-architecture-layer-diffuse.md

**1. YAML frontmatter `models_without_native_alpha`**
- Removed `Ideogram v2 / v3` (incorrect — Ideogram 3.0 has native alpha via dedicated endpoint)
- Added `Ideogram v2` (no alpha, correct)
- Added new `models_with_native_alpha_via_dedicated_endpoint` section for Ideogram 3.0

**2. Executive summary finding #3**
- Old: "Only two families of production models emit real alpha in 2026: OpenAI's gpt-image-1 lineage and open-source LayerDiffuse finetunes"
- Fixed: "Three families" — added Ideogram 3.0 as the second commercial provider
- Added `> Updated 2026-04-21` callout with Ideogram endpoint details

**3. Model Capability Matrix table**
- `Ideogram v2 / v3` row split into: `Ideogram v2` (No) and `Ideogram 3.0` (Yes, dedicated endpoint)

**4. LayerDiffuse-Flux port table**
- Added commercial license note: AFL-3.0 on LoRA weights, but BFL Non-Commercial on Flux.1-dev base; commercial hosting requires BFL license

**5. Takeaways section**
- Updated "commercially in exactly one product today — OpenAI's `gpt-image-1.*`" to include Ideogram 3.0 as the second commercial product
- Routing recommendation updated for both asset-kind-based paths

---

### 13c-checkerboard-pixel-drawing-failure.md

**1. Rule 1 capability table**
- `recraft-v3` moved from `alpha_native_models` to new `alpha_native_restricted` bucket
- `ideogram-3.0` retained in `alpha_native_models` but comment updated to use dedicated endpoint
- `alpha_via_protocol` narrowed to gpt-image-1 lineage only
- Added `> Updated 2026-04-21` note

**2. gpt-image-1 quality requirement**
- Added note: `quality: "low"` degrades transparent output; use `"medium"` or `"high"`
- Added `> Updated 2026-04-21` OpenAI docs citation

---

### 13d-matting-models-birefnet-rmbg-u2net.md

**1. BiRefNet section — 2025 milestone updates**
- Added `> Updated 2026-04-21` block with timeline:
  - Jan 2025: FP16 inference (17 FPS at 1024² on RTX 4090, 3.45 GB VRAM)
  - Feb 2025: BiRefNet_HR and BiRefNet_HR-matting released (2048×2048)
  - Mar 2025: BiRefNet_dynamic released (256×256 to 2304×2304 dynamic resolution)
  - Jun 2025: refine_foreground GPU-accelerated (8× speedup, ~80 ms on RTX 5090)
  - Sep 2025: SDPA attention upgrade in Swin transformer
- Speed table caveat: ~150 ms CUDA figure predates FP16/SDPA; real figures now ~60–80 ms on RTX 4080-class

**2. rembg wrapper section**
- Added new 2025 matting sessions: `birefnet-matting`, `birefnet-lite-matting`, `birefnet-dynamic`
- Clarified: **rembg default model remains `u2net`**, not BiRefNet; must pass session explicitly
- Added preference note: `birefnet-matting` for hair/glass, `birefnet-general` for product/logo

**3. Commercial APIs — remove.bg pricing**
- Old: "$0.20 per call for HD at list price"
- Fixed: credit-based pricing (~$0.05/image at list, 5 credits/image)
- Added Clipdrop (Jasper.ai, formerly Stability AI) as another option

**4. Clipdrop ownership note**
- Added: Clipdrop sold by Stability AI to Jasper.ai in early 2024; still active as of 2026

---

### 13e-end-to-end-transparent-pipelines.md

**1. Executive summary**
- Old: "reliable native-RGBA providers are **OpenAI gpt-image-1** and **Recraft v3**"
- Fixed: Added Ideogram 3.0 as confirmed native-RGBA provider; Recraft v3 demoted to post-hoc Remove Background path; gpt-image-1 quality requirement added
- Added `> Updated 2026-04-21` block

**2. Decision tree**
- Added Ideogram 3.0 branch: `/ideogram-v3/generate-transparent`, TURBO/QUALITY speed options
- Updated Recraft v3 branch: generate first, then call Remove Background API — not native in-generation
- Added gpt-image-1 quality note (`NOT "low"`)

**3. `_strip_bg` notes**
- Clarified rembg default is still `u2net` — must pass `birefnet-general` explicitly
- Added `birefnet-matting` as preferred session for hair/glass subjects (new 2025 checkpoint)
- Strengthened BRIA RMBG commercial-use warning (CC BY-NC 4.0; not safe without Bria license)
- Added `> Updated 2026-04-21` note

---

## Files with NO changes needed

- **13b-difference-matting-and-chroma-keying.md** — algorithm content is stable; no API pricing claims; model capability references consistent with other files after corrections
- **index.md** — table of contents only; no factual claims

---

## Claims that remain uncertain (monitoring needed)

1. **Recraft V3 SVG output with true transparency** — confirmed intrinsic; the `response_format: "svg"` path is reliable. PNG alpha via Remove Background is reliable. In-generation PNG transparent-style remains unreliable.
2. **Gemini Nano Banana / Nano Banana Pro native alpha** — still no evidence of native alpha support as of April 2026. The Julien De Luca difference-matting approach remains the best workaround for these models.
3. **remove.bg HD pricing exact figure** — credit model is confirmed but exact HD-specific credit cost not pinpointed. The "$0.20/image HD" figure is gone; best estimate ~$0.05/image from subscription credit bundles.
4. **Ideogram 3.0 Turbo vs `style: "transparent"` param** — the `generate-transparent-v3` endpoint uses a `rendering_speed` enum (FLASH/TURBO/BALANCED/QUALITY), not the `style: "transparent"` flag referenced in CLAUDE.md. The CLAUDE.md reference `style: "transparent"` for Ideogram 3 Turbo is incorrect — the correct parameter is the dedicated `/generate-transparent` endpoint with `rendering_speed: "TURBO"`. This discrepancy should be corrected in CLAUDE.md.

---

## Sources consulted

- https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
- https://wavespeed.ai/blog/posts/introducing-ideogram-v3-turbo-on-wavespeedai/
- https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background
- https://github.com/ZhengPeng7/BiRefNet (README, issues)
- https://huggingface.co/briaai/RMBG-2.0
- https://www.remove.bg/pricing
- https://docs.photoroom.com/remove-background-api-basic-plan/pricing
- https://clipdrop.co/apis/docs/remove-background
- https://bfl.ai/licensing
- https://huggingface.co/RedAIGC/Flux-version-LayerDiffuse
- https://developers.openai.com/api/docs/guides/image-generation (transparent + quality)
- https://github.com/danielgatis/rembg (sessions list, issues)
