# Category 20 — Open-Source Repos Landscape: Update Log
**Updated:** 2026-04-21  
**Files audited:** 20a, 20b, 20c, 20d, 20e, SYNTHESIS.md, index.md  
**Research method:** Web searches run 2026-04-21 against GitHub, star-history.com, PyPI, HuggingFace, and secondary blog sources.

---

## Summary of Changes

### ComfyUI (20d, SYNTHESIS.md)

**Stale claim:** ~55k stars.  
**Current fact:** ~108.5k★ as of 2026-04-13 (source: star-history.com/comfy-org/comfyui). The project has nearly doubled in star count since the original research. Weekly release cadence confirmed.

**Stale claim:** ComfyUI-Manager ~14.3k stars (unchanged figure).  
**Current fact:** Still ~14.3k★ but now at v4.1 (released 2026-03-25) and officially integrated into the core ComfyUI codebase.

**New fact:** ComfyUI now ships Flux.2 (max/pro/dev/flex), Z-Image, Wan 2.1/2.2 support natively.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — corrected star counts, added "Updated" callout blocks.

---

### AUTOMATIC1111 / Forge (20d, SYNTHESIS.md)

**New context (not previously covered):**  
- AUTOMATIC1111: Last release v1.10.1 (July 2024). No releases since; effectively stalled. Many users have migrated to ComfyUI or Forge. Do not plan new integrations.  
- Forge (lllyasviel/stable-diffusion-webui-forge): Last release July 22, 2025. Based on a1111 v1.10.1; syncs upstream ~every 90 days. Still the preferred a1111-replacement for Flux support, but not rapidly developed.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to "Key risks & notes" section under the new "Updated 2026-04-21 — ecosystem context" block.

---

### Fooocus (20a, 20b, SYNTHESIS.md)

**Stale claim:** Fooocus "actively maintained" / "2024" as last commit.  
**Current fact:** Fooocus is now in Limited Long-Term Support (LTS) mode — bug fixes only. Last feature release v2.5.5 (August 2025). Developer explicitly recommends Forge or ComfyUI for Flux-era work. Community has thousands of forks but no dominant successor has emerged.

**Impact:** The "Fooocus-style rewriter" strategy (re-implementing the positive-word logits trick) remains valid. The algorithm is reusable; the CC-BY-NC-4.0 weights are still the licensing concern. Just don't depend on Fooocus itself receiving new model support.

**Files edited:** `20a-prompt-enhancement-oss-repos.md`, `20b-asset-generator-fullstack-repos.md`, `SYNTHESIS.md` — added LTS annotation to table rows, added "Updated" callout blocks.

---

### danielgatis/rembg (20b, SYNTHESIS.md)

**Stale claim:** 22,491★.  
**Current fact:** 22,500+★ as of 2026-04-21. At v2.0.75 (released 2026-04-08). Actively maintained with monthly releases throughout 2025-2026.

**Files edited:** `20b-asset-generator-fullstack-repos.md`, `SYNTHESIS.md` — corrected star count, added version note.

---

### BiRefNet (20d, SYNTHESIS.md)

**New facts (not previously documented):**  
- June 2025: `refine_foreground` function accelerated 8x via GPU implementation (~80ms on 5090).  
- September 2025: Swin Transformer attention upgraded to PyTorch SDPA (lower memory, potential acceleration for training and inference).  
- Available on HuggingFace as `ZhengPeng7/BiRefNet`. Code on HF may lag GitHub.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added update note to background removal section.

---

### BRIA RMBG-2.0 + ComfyUI-RMBG (20d, SYNTHESIS.md)

**New facts:**  
- RMBG-2.0 remains CC-BY-NC-4.0; commercial use requires hosted endpoints (Bria API, fal.ai, Replicate).  
- `1038lab/ComfyUI-RMBG` is now at v3.0.0 (2026-01-01), covering RMBG-2.0, BiRefNet, BEN, BEN2, SAM/SAM2/SAM3, SDMatte, GroundingDINO in one node pack. This supersedes the older `ZHO-ZHO-ZHO/ComfyUI-BRIA_AI-RMBG` wrapper.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — updated background removal node section with v3.0.0 and full model coverage list.

---

### InvokeAI (20d)

**New context (not previously covered in 20-series):**  
- At v6.x (v6.12 adds experimental multi-user mode, separate boards/images/canvas per account).  
- Supports Flux.2 Klein, Z-Image, FLUX.2 LoRA formats.  
- Still the recommended non-graph-based creative diffusion UI. Not relevant for headless/agentic use.

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to "Updated 2026-04-21 — ecosystem context" block.

---

### kohya_ss + ostris/ai-toolkit (20d, SYNTHESIS.md)

**New facts:**  
- `kohya_ss` (bmaltais/kohya_ss): Active; sd-scripts v0.9.1 (Oct 2025). Flux.1 and Flux.2 LoRA training supported. High VRAM demands for Flux.2.  
- `ostris/ai-toolkit`: As of April 2026, widely described as the most popular Flux LoRA trainer. Supports 10+ architectures: Flux.1, Flux.2, Wan 2.1/2.2, Lumina2, Z-Image, LTX-2, SD 1.x/2.x/XL. Active development confirmed (Medium tutorial published March 2026). Supersedes kohya_ss for Flux-native workflows.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — added to ecosystem context block and actionable recommendations section.

---

### IP-Adapter (tencent-ailab/IP-Adapter) (20d, SYNTHESIS.md)

**Stale claim:** IP-Adapter implied as a current, active reference.  
**Current fact:** Last commit to `tencent-ailab/IP-Adapter` main repo was January 2024 (added FaceID-Portrait). The repo is effectively unmaintained. The IP-Adapter *technique* lives on via:  
- InstantX's FLUX.1-dev IP-Adapter (released Nov 2024)  
- `comfyorg/comfyui-ipadapter` node (official ComfyUI org)  
- `Shakker-Labs/ComfyUI-IPAdapter-Flux`

For new Flux work, use the InstantX model or the official ComfyUI node, not the Tencent repo.

**Files edited:** `20d-comfyui-workflow-ecosystem.md`, `SYNTHESIS.md` — added to ecosystem context block and actionable recommendations.

---

### diffusers (Hugging Face) (20d, SYNTHESIS.md)

**New facts:**  
- At v0.37.1 (released 2026-03-25).  
- v0.37.0 introduced Modular Diffusers: composable reusable pipeline blocks.  
- Full Flux.1/Flux.2 support, SD3.5, Z-Image, Flux Klein LoRA loading.  
- Extremely active (PyPI/GitHub releases confirm).

**Files edited:** `20d-comfyui-workflow-ecosystem.md` — added to ecosystem context block.

---

### Nutlope/logocreator star count (20e, SYNTHESIS.md)

**Stale claim:** 6.8k★.  
**Current fact:** ~5.3k★ as of April 2026 (confirmed from multiple search result citations). Project is still active with open issues. The 6.8k figure was likely a peak or a misread.

**Files edited:** `SYNTHESIS.md` — corrected star count with "Updated" callout.

---

### WAS Node Suite (20d)

**Already marked archived June 2025** in the original files — no change needed. The update note about `1038lab/ComfyUI-RMBG v3.0.0` as its recommended replacement was added.

---

### vtracer (20b, SYNTHESIS.md)

**Status:** Last documented version 0.6.x. Web search returned the releases page but not a specific 2025-2026 release date. No evidence of abandonment — crates.io page active. No change made; star count was not cited numerically in the files so no correction needed.

---

### ControlNet (20d)

**Status:** The original `lllyasviel/ControlNet` repo shows community issues through December 2025. Primarily an SD 1.x artifact; for Flux ControlNet the community has moved to separate implementations (Flux ControlNet via diffusers/ComfyUI nodes). No corrections required to the existing files since ControlNet was not heavily cited in category 20.

---

## Files Not Changed

- `20c-image-gen-sdk-wrappers.md` — Vercel AI SDK v5, OpenRouter, aisuite, simonw/llm, Replicate, fal, Together all checked; no material corrections needed. The claims about aisuite (no image support, v0.1.14) may need a future recheck but no confirmed change found.
- `20e-agent-native-webapps-and-gap-analysis.md` — No tool-specific factual errors found; the gap analysis and architecture patterns are structural and not version-sensitive.
- `index.md` — Index file, no factual claims to update.
