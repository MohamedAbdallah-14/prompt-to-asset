# Research Update Log — Category 06 (Stable Diffusion & Flux)
**Audited:** 2026-04-21  
**Auditor:** Research-updater agent  
**Files touched:** 6a, 6b, 6c, 6d, 6e, SYNTHESIS.md, index.md

---

## Summary of Changes

### 6a — SD 1.5 / 2.1 / XL prompting fundamentals

**Added two `> Updated 2026-04-21` blocks:**

1. **SD 3.5 coverage gap flagged.** SD 3.5 (Medium 2.6B, Large 8B, Large Turbo) was released October 2024. Has three text encoders (CLIP-L + OpenCLIP-bigG + T5-XXL), supports negative prompts (unlike Flux), has native ControlNets (Blur/Canny/Depth for Large, released Nov 26, 2024), and ships under a commercial-friendly community license. Not covered by the A1111 DSL conventions, `BREAK`, or SDXL micro-conditioning described in this angle.

2. **AUTOMATIC1111 maintenance-only status.** Last release: v1.10.1 (July 2024). No new features, 44+ unmerged PRs as of Q1 2026. Community discussion titled "Future of Automatic1111 for 2025" confirms effective development stall. Practitioners have migrated to ComfyUI or Forge.

---

### 6b — Flux family prompting

**Table corrections:**
- `Flux.1 Kontext [pro/max]` release date corrected from `2025-05` to `2025-05-29`.
- `Flux.1 Kontext [dev]` release date corrected from `2025-06` to `2025-06-26`.
- `Flux.2 [klein]` row split into two correct entries:
  - `Flux.2 [klein] 4B`: Released **2026-01-15**, **Apache 2.0**, uses Qwen3 8B text embedder (distilled), ~13 GB VRAM, sub-second inference. Not "forthcoming beta."
  - `Flux.2 [klein] 9B`: Released **2026-01-15**, FLUX-2 Non-Commercial, ~29 GB VRAM.
- `Flux.2 [dev]` VRAM note updated: NVIDIA FP8 optimizations reduce requirement ~40% (from ~80 GB BF16 to ~48 GB FP8).

**Added `> Updated 2026-04-21` block in local inference section:**
- Confirms Flux.2 [klein] is released (not beta), correct architecture note (Qwen3 embedder distilled from Mistral-3 training), VRAM figures, sub-second generation claim.
- Confirms Flux.2 [klein] ComfyUI support via `FluxKVCache` nodes.

---

### 6c — ControlNet, IP-Adapter, reference conditioning

**Adapter catalog table:**
- Added new row: **ControlNet SD3.5 Large** — Blur, Canny, Depth variants released November 26, 2024 by Stability AI. Compatible only with SD3.5-Large (8B), not Medium.

**Added `> Updated 2026-04-21` block before Limitations section:**
- Notes SD 3.5 ControlNets in diffusers via `StableDiffusion3ControlNetPipeline`.
- Flux.2 [klein]'s unified generation+editing architecture reduces need for separate Fill/Canny/Depth checkpoints.
- InvokeAI now supports Flux ControlNets (XLabs + InstantX) in both Workflows and Linear UI; Flux.2 klein LoRA/CN is open issue.
- Adapter maturity gap between SDXL and Flux has narrowed significantly since mid-2025.

---

### 6d — LoRA / DoRA / LoKr / LoHA training

**Toolchain table corrections:**
- `kohya-ss/sd-scripts`: Flux support changed from `"experimental"` to `"production, merged from sd3 branch into main"`. Training via `flux_train_network.py`. SD3.5 support also added to description.
- `ostris/ai-toolkit`: Updated supported models list to include SD3.5 (8-bit LoRA on 24 GB GPU, October 2024), Wan 2.1 video, Qwen-Image. Noted web UI is now bundled.

**Style-Lock Patterns section (item 6):**
- Corrected false claim: "Flux.1 [dev] does honor a weak negative via guidance_scale tricks."
- **Correct fact:** Flux has no unconditional branch. `guidance_scale` is a conditioning scalar, not a CFG extrapolation coefficient. There is no mechanism to "hear" a negative prompt by adjusting it.
- Community workarounds documented: ComfyUI `FluxPseudoNegativePrompt` (converts to affirmative antonyms); "true CFG" double-forward-pass (2× inference cost, not on commercial endpoints).

**Added `> Updated 2026-04-21` block before Compute & Cost table:**
- kohya Flux support now in main, not experimental.
- ai-toolkit SD3.5 LoRA training confirmed.
- Stability AI financial status: ~$80M raised mid-2024, company stabilized; API remains operational; two endpoints discontinued July 2025 (SD1.6 path → migrate to SDXL or SD3.5).

---

### 6e — Local inference pipelines

**Added large `> Updated 2026-04-21` block at top:**
- A1111: maintenance-only since v1.10.1 (Jul 2024), no Flux.2 support.
- Fooocus: LTS/bug-fixes only, SDXL architecture only, developer recommends Forge/ComfyUI for newer models.
- ComfyUI: Native Flux.2 [dev] support at launch (Nov 2025) with FP8 optimizations (−40% VRAM, +40% throughput). Flux.2 [klein] supported (Jan 2026) via `FluxKVCache` nodes. Now natively supports: SD1.x/2.x, SDXL, SD3/3.5, all Flux variants, Pixart, HunyuanDiT, Lumina 2.0, HiDream, Qwen Image. ComfyUI-Manager V2 under Comfy-Org.
- diffusers: SD3.5 via `StableDiffusion3Pipeline`; Flux.2 [dev] supported; `AutoPipeline` auto-selects.

**Pipeline comparison table:**
- A1111 row: Added `maintenance-only since v1.10.1 (Jul 2024), no active development` to Worst-for column.
- Fooocus row: Added `LTS/bug-fixes only; no Flux, no SD3.5` to Flux support column.

**Diffusers section:**
- Added `> Updated 2026-04-21` block noting SD3.5 via `StableDiffusion3Pipeline`, Flux.2 [dev] support, gated weights on HF.

**VRAM profile section:**
- Added `> Updated 2026-04-21` block with Flux.2 [dev] VRAM (~80 GB BF16, ~48 GB FP8 with NVIDIA optim), Flux.2 [klein] 4B (~13 GB), klein 9B (~29 GB), SD3.5 Large (~16 GB), SD3.5 Medium (~10 GB).

---

### SYNTHESIS.md

**Gaps section:**
- Updated "Flux.2 ecosystem coverage" gap — no longer a gap; ComfyUI/diffusers/InvokeAI have production-ready support.
- Added new gap: Flux.2 [klein] (Jan 2026) not covered in depth in angle files.
- Added new gap: SD 3.5 prompting contract (Oct 2024 release) not covered by any existing angle.
- Corrected Flux.2 [klein] from "forthcoming" to "released Jan 15, 2026."
- Added licensing note: Flux.2 [klein] 4B is Apache 2.0 (commercial-safe); 9B is Non-Commercial.
- Added `> Updated 2026-04-21` block summarizing: klein is released, Flux.2 ecosystem settled, A1111 is maintenance-only, Fooocus is SDXL-only LTS, kohya Flux in main.

**Actionable Recommendations — Self-hostable pipeline:**
- Model defaults updated: replaced "Flux.2 [dev]/[flex] once ecosystem stabilizes" with concrete recommendation for **Flux.2 [klein] 4B** as local consumer-GPU default; added caveat note.

**Actionable Recommendations — LoRA training hook:**
- Backend sentence updated to clarify kohya `sd-scripts` Flux training is via `flux_train_network.py` in main branch, no longer experimental.

---

## Verified Facts (Sources)

| Claim | Verified Status | Source |
|---|---|---|
| SD 3.5 Large/Medium/Turbo released Oct 2024 | Confirmed | stability.ai/news/introducing-stable-diffusion-3-5 |
| SD 3.5 ControlNets (Blur/Canny/Depth) released Nov 26, 2024 | Confirmed | stability.ai/news-updates/sd3-5-large-controlnets |
| SD 3.5 supports negative prompts | Confirmed | seaart.ai guide, drawthings wiki |
| A1111 last release v1.10.1, July 2024 — maintenance-only | Confirmed | github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/16670 |
| Fooocus is LTS/SDXL-only, no Flux | Confirmed | github.com/lllyasviel/Fooocus/discussions/3721 |
| Flux Kontext [pro/max] released May 29, 2025 | Confirmed | businesswire.com; bfl.ai/announcements/flux-1-kontext |
| Flux Kontext [dev] released June 26, 2025 | Confirmed | bfl.ai/announcements/flux-1-kontext-dev |
| Flux.2 released Nov 25, 2025 | Confirmed | bfl.ai/blog/flux-2 |
| Flux.2 [klein] 4B + 9B released Jan 15, 2026 | Confirmed | bfl.ai/blog/flux2-klein-towards-interactive-visual-intelligence; marktechpost.com |
| Flux.2 [klein] 4B: Apache 2.0, ~13 GB VRAM | Confirmed | huggingface.co/black-forest-labs/FLUX.2-klein-4B |
| Flux.2 [klein] 9B: Non-Commercial, ~29 GB VRAM | Confirmed | huggingface.co/black-forest-labs/FLUX.2-klein-9B |
| Flux.2 NVIDIA FP8: −40% VRAM, +40% throughput | Confirmed | blogs.nvidia.com/blog/rtx-ai-garage-flux-2-comfyui/ |
| ComfyUI native Flux.2 support at launch Nov 2025 | Confirmed | vestig.oragenai.com comfyui-news/post_20251129 |
| kohya sd-scripts Flux in main branch (not experimental) | Confirmed | github.com/kohya-ss/sd-scripts (sd3 merged to main) |
| ostris ai-toolkit SD3.5 LoRA support added Oct 2024 | Confirmed | x.com/ostrisai tweet |
| Stability AI operational, API pricing update Aug 2025 | Confirmed | stability.ai/api-pricing-update-25 |
| Flux does not support negative prompts (no workaround on commercial endpoints) | Confirmed | docs.bfl.ml/guides/prompting_guide_t2i_negative; fal.ai/learn/tools/how-to-use-flux |
| ComfyUI-Manager V2 under Comfy-Org | Confirmed | comfyui.org |
| InvokeAI Flux ControlNet support (XLabs + InstantX) | Confirmed | support.invoke.ai/support/solutions/articles/151000170961 |
| Flux.2 [klein] ComfyUI FluxKVCache support | Confirmed | comfyui-news blogs |
