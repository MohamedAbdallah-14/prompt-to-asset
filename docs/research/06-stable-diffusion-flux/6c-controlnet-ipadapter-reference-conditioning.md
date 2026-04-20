---
category: 06-stable-diffusion-flux
angle: 6c
title: "ControlNet, IP-Adapter, T2I-Adapter, InstantID, PuLID, Reference-Only: Asset Control for Shape, Color, Identity, and Brand Consistency"
status: draft
last_updated: 2026-04-19
primary_audience: ["prompt-to-asset authors", "brand/asset pipeline engineers", "ComfyUI workflow authors"]
key_techniques:
  - ControlNet (canny, depth, tile, scribble, pose, union)
  - T2I-Adapter
  - IP-Adapter / IP-Adapter Plus / IP-Adapter FaceID
  - InstantID
  - PuLID
  - Reference-Only ControlNet
  - FLUX.1 Tools (Fill, Canny, Depth, Redux)
  - FLUX IP-Adapter (XLabs, InstantX)
base_models: ["SD 1.5", "SDXL", "FLUX.1-dev", "FLUX.1-pro"]
tags: ["conditioning", "controlnet", "ip-adapter", "identity", "brand-consistency", "icon-sets", "logo-stamping"]
---

# 6c — ControlNet, IP-Adapter, Reference-Only & Identity Adapters

## Executive Summary

Text-to-image diffusion models (SD 1.5, SDXL, FLUX.1) cannot hold a **shape**, a **color palette**, or a **logo** stable across many generations from prompts alone. The fix is a family of **conditioning adapters** that inject extra signals into the denoising process:

1. **ControlNet** (Zhang et al., 2023) — clones the encoder of the base UNet and feeds in spatial maps (edges, depth, pose, tile, scribble) to lock **shape/structure**.
2. **T2I-Adapter** (Mou et al., 2023) — a lighter, faster sibling of ControlNet that conditions on similar spatial maps.
3. **IP-Adapter** (Ye et al., 2023) — injects a **CLIP-image embedding** of a reference into decoupled cross-attention, giving "a 1-image LoRA" for **style/color/identity** transfer.
4. **InstantID** and **PuLID** — identity-preserving adapters built on top of IP-Adapter + ArcFace face embeddings, specifically for **human face identity**.
5. **Reference-Only ControlNet** — a training-free trick that shares attention with a reference image; good for style/mood without training weights.
6. **FLUX.1 Tools (Nov 2024)** — BFL's first-party `Fill`, `Canny`, `Depth`, and `Redux` models ship native structural conditioning and image-variation for Flux.
7. Plus **Flux ControlNet Union** (InstantX, Aug 2024) and the **XLabs Flux IP-Adapter v2** for open-source Flux pipelines.

For the prompt-to-asset product, these adapters unlock the hardest asset problems: **a single brand mark stamped across 10 marketing images**, **an icon family in the same geometric language**, and **silhouette-locked variants** of a logo. The rest of this document is an operator-oriented catalog and recipe book.

## Adapter Catalog

| Adapter | Base models | Signal injected | What it locks | Training cost | 2024–2025 status |
|---|---|---|---|---|---|
| **ControlNet — Canny** | SD1.5, SDXL, FLUX.1-dev | Canny edge map | Hard line silhouette | Heavy (clone encoder) | Mature. FLUX.1-Canny released by BFL Nov 2024 ([blackforestlabs.ai/flux-1-tools](https://blackforestlabs.ai/flux-1-tools)). |
| **ControlNet — Depth** | SD1.5, SDXL, FLUX.1 | MiDaS / ZoeDepth map | 3D pose/composition | Heavy | FLUX.1-Depth released by BFL Nov 2024. |
| **ControlNet — Tile** | SD1.5, SDXL | Low-res tile | Texture + upscale consistency | Heavy | Ubiquitous for upscale / refine. |
| **ControlNet — Scribble / Lineart** | SD1.5, SDXL, FLUX | Rough strokes / lineart | Concept shape | Heavy | Stable. |
| **ControlNet — Pose (OpenPose)** | SD1.5, SDXL, FLUX | Skeleton | Human pose | Heavy | Supported in Flux Union. |
| **ControlNet Union (Pro)** | FLUX.1-dev | One model → multiple modes (canny, tile, depth, blur, pose, lq) | Multi-modal structure | Heavy, shared | InstantX beta (Aug 2024), Shakker-Labs Pro (Aug 26, 2024). ([huggingface.co/InstantX/FLUX.1-dev-Controlnet-Union](https://huggingface.co/InstantX/FLUX.1-dev-Controlnet-Union)) |
| **ControlNet Reference-Only** | SD1.5, SDXL | Shared self-attention w/ ref image | Style/mood (no training) | None (inference trick) | Available in A1111 + ComfyUI. |
| **T2I-Adapter** | SD1.5, SDXL | Sparse adapter on encoder features | Structure (lightweight) | Light (~77M params) | TencentARC family; preferred when VRAM is tight. |
| **IP-Adapter** | SD1.5, SDXL, SD3, FLUX | Decoupled cross-attn from CLIP-Image | Style / palette / composition | Light | Core building block; Tencent/cubiq repo is de-facto standard. |
| **IP-Adapter Plus** | SD1.5, SDXL | Higher-resolution patch-level CLIP | Stronger subject transfer | Light | Used for "turn this logo into X" tasks. |
| **IP-Adapter FaceID / FaceID Plus v2** | SD1.5, SDXL | InsightFace ArcFace embedding + CLIP | Human identity | Light | Superseded for top-tier identity by PuLID/InstantID. |
| **FLUX IP-Adapter (XLabs v2)** | FLUX.1-dev | CLIP-Image into double-stream attn | Style / composition | Light | Beta, 512/1024 training. ([huggingface.co/XLabs-AI/flux-ip-adapter-v2](https://huggingface.co/XLabs-AI/flux-ip-adapter-v2)) |
| **FLUX.1 Redux** | FLUX.1-dev / pro | Redux "prior" pipeline | Image variation + restyle | First-party | Released by BFL Nov 2024; best-in-class Flux variation adapter. |
| **InstantID** | SDXL | ArcFace embedding + IdentityNet ControlNet | Human identity + pose | Light | InstantX, Jan 2024. Pose-aware. |
| **PuLID** | SD1.5, SDXL, FLUX | Contrastive alignment + Lightning T2I branch | Human identity (least invasive) | Light | Guo et al. 2024. Flux port: `guozinan/PuLID` & `cubiq/PuLID_ComfyUI`. |
| **EcomID** | SDXL | Evolution of InstantID w/ better ID fidelity | Human identity for ecommerce | Light | ([myaiforce.com/flux-pulid-vs-ecomid-vs-instantid](https://myaiforce.com/flux-pulid-vs-ecomid-vs-instantid/)) |

## How They Work (short primers)

### ControlNet (Zhang et al., 2023 — [arXiv:2302.05543](https://arxiv.org/abs/2302.05543))

Zhang's insight: instead of fine-tuning a diffusion UNet (risky, destroys priors) or LoRA-adapting it (too weak for spatial structure), **clone the encoder** of a frozen UNet, feed the control map (edges, depth, pose, tile, scribble) through the clone, and add its features back into the frozen decoder via **zero convolutions** (conv layers initialized to zero so the network starts as identity). The zero-init ensures training is monotonic — the model cannot get worse at generation while learning to use the control.

Consequences for asset work:

- **Canny / Lineart / Scribble** are the single best tool we have for *silhouette-locked* generation. A 512×512 logo mask + Flux-Canny produces a Flux render that respects the mask within a few pixels.
- **Tile** conditions on a low-resolution version of the desired output, which is how high-fidelity upscale/refine passes preserve brand color and geometry.
- **Union** models bundle several conditioning types into one checkpoint. Cheaper for workflows that swap modes (Flux Union supports canny, tile, depth, blur, pose with high validity; gray is weak).

### T2I-Adapter (Mou et al., 2023 — [arXiv:2302.08453](https://arxiv.org/abs/2302.08453))

Same idea as ControlNet but **trains a lightweight adapter (~77M params)** on the encoder side rather than cloning the entire encoder. Runs ~2× faster with ~1/3 the VRAM. Quality on edges/depth is comparable on SD 1.5; slightly weaker on SDXL. Use when VRAM is tight or when conditioning is a "nudge" rather than a hard lock.

### IP-Adapter (Ye et al., 2023 — [arXiv:2308.06721](https://arxiv.org/abs/2308.06721))

Ye's insight: existing text-to-image attention uses a single K,V projection for text. IP-Adapter adds a **second, decoupled K,V projection for image embeddings** (from CLIP ViT-H/14 or DINO), then fuses both cross-attention results. Only ~22M parameters trained, but transfers subject, color, palette, and composition from a single reference remarkably well — hence the "1-image LoRA" framing.

Variants:

- **IP-Adapter Plus**: uses *patch-level* CLIP features (256 tokens instead of 1 CLS token) — much higher subject fidelity, at the cost of sometimes over-copying.
- **IP-Adapter FaceID / FaceID Plus v2**: concatenates an InsightFace ArcFace embedding with CLIP, specifically for faces. FaceID Plus v2 adds a "face-structure" layer.
- **FLUX IP-Adapter (XLabs v2)**: port to Flux's double-stream DiT architecture; trained at 512 then 1024; in beta, often needs weight 0.6–0.9 and several seed rolls.

### InstantID ([arXiv:2401.07519](https://arxiv.org/abs/2401.07519))

Combines:
1. An **IdentityNet** (a ControlNet trained on face landmarks) for pose control, and
2. An **IP-Adapter FaceID-style** branch for ID embedding.

Result: single-image, tuning-free human-identity generation with pose control. Works best on SDXL. Weakness: can over-copy facial geometry and slightly degrade style on high weights.

### PuLID ([arXiv:2404.16022](https://arxiv.org/abs/2404.16022))

Guo et al. introduce two refinements on top of ID adapters:
1. A **Lightning T2I branch** that generates an intermediate clean image each step (via SDXL-Lightning) which is used for a direct **identity loss** on the actually-produced image, not on noisy predictions.
2. A **contrastive alignment loss** that forces non-ID attributes (pose, style, background) to stay close to what the base model would have generated *without* identity conditioning.

Practical result: PuLID preserves the base model's style/prompt-following far better than InstantID for the same ID fidelity. The Flux port (`guozinan/PuLID`, `cubiq/PuLID_ComfyUI`) is the current best-in-class open-source identity adapter for Flux as of early 2025.

### Reference-Only ControlNet

An inference-time trick: during denoising, concatenate the latent of a reference image into self-attention K,V of each UNet block so the model "attends" to the reference while generating. No training. Good for mood/style hints, poor for exact shape — because there is no explicit alignment. Cheap and safe first fallback when no adapter weights are available.

### FLUX.1 Tools — Fill, Canny, Depth, Redux (BFL, Nov 2024)

Black Forest Labs' first-party conditioning suite ([blackforestlabs.ai/flux-1-tools](https://blackforestlabs.ai/flux-1-tools)):

- **Fill** — inpainting/outpainting with text + binary mask; outperforms Ideogram 2.0 in BFL benchmarks.
- **Canny** — structural guidance from edge maps; lighter than InstantX's community ControlNet-Canny.
- **Depth** — depth-map guidance; BFL benchmarks it as beating Midjourney ReTexture on diversity.
- **Redux** — the official "image variation" adapter — takes an input image and produces variants, optionally steered by text. Implemented as a `FluxPriorReduxPipeline` that front-loads a CLIP-image condition into the base `FluxPipeline`.

For anyone shipping a production pipeline on Flux, these four first-party tools should be the default, with community IP-Adapter/ControlNet-Union as fallbacks for modes BFL doesn't ship (e.g., pose).

## Asset-Consistency Recipes

All recipes assume ComfyUI + appropriate model weights. Prompt text is shown inside backticks; `{{}}` marks variables.

### Recipe 1 — Silhouette-Locked Icon Family From a Single Logo

*Problem:* You have a logo and need 16 sibling icons (settings, search, profile, etc.) in the same geometric language.

1. Vectorize the logo to a black-on-white SVG; rasterize at 1024×1024.
2. Canny-edge the raster with thresholds tight enough that only the outer silhouette + 1–2 inner contours remain.
3. Model: FLUX.1-dev + **FLUX.1-Canny** (or InstantX ControlNet-Union-Pro with mode=canny).
4. For each target icon meaning, prompt: `flat geometric icon, {{concept}}, two-tone, centered, same silhouette family as reference, minimalist app icon style, white background`.
5. ControlNet weight: **0.5–0.7**. Higher locks shape too hard; lower drifts.
6. Sample 4–8 seeds per concept; pick the one that is *recognizably in-family* without being a copy of the logo.

Alternative: stack **ControlNet-Canny (weight 0.6) + IP-Adapter-Plus from logo (weight 0.4)** — Canny holds the silhouette while IP-Adapter-Plus carries the color/material language. This is the single most reliable recipe for brand icon families.

### Recipe 2 — Logo Stamping Across Marketing Hero Images

*Problem:* You need the same corporate logo to appear in 10 marketing images — on a coffee cup, a t-shirt, a billboard, a laptop screen — without distortion.

1. **Do not** try to make the base model draw the logo. It will warp text and misplace color every time (see category 14 negative-prompting notes).
2. Generate the scene *without* the logo first — good lighting, good composition, empty placeholder surface.
3. Use **FLUX.1 Fill** with a rectangular or product-shape mask around the placeholder.
4. In the same pipeline, condition Fill with **IP-Adapter (XLabs v2)** pointed at the logo asset at weight **0.9–1.0**.
5. Prompt: `product photograph, a {{surface}} displaying the reference logo exactly, no text changes, no distortion, studio lighting`.
6. If geometry is off, add a second pass: Fill the same region again with Canny of the logo as an additional ControlNet at weight 0.7.
7. For crisp vector logos, prefer *compositing* the logo via an image editor after generation and only use Fill for soft integration (shadows, reflections).

### Recipe 3 — Shape-Locked Variants of a Single Icon

*Problem:* One hero icon exists; stakeholders want to see 12 color/material variants with identical silhouette.

1. Extract exact silhouette: trace → SVG → rasterize binary mask 1024×1024.
2. Canny of the binary mask is basically the silhouette itself.
3. FLUX.1-Canny at weight **0.8** (high because you want a near-perfect silhouette lock).
4. Vary the *prompt* for material/color: `{{silhouette noun}}, {{material adj}}, {{color palette}}, soft studio light, centered`.
5. Optional: also pass IP-Adapter at weight 0.3 from the original colored icon to carry a faint memory of color temperature.

### Recipe 4 — Character / Mascot Identity Across Scenes

*Problem:* You have a brand mascot (or a human spokesperson) and need it in 20 different illustrations, each prompt-driven.

Option A — **Mascot (non-human)**: IP-Adapter-Plus at weight 0.7–0.9 from the mascot reference image. Combine with **ControlNet-OpenPose** if you want to pose the mascot explicitly. Text prompt handles scene. Pitfall: the mascot becomes slightly "generic" when IP weight < 0.6. Train a small LoRA if you have 10+ reference images — LoRA wins at weight >= 0.8 where IP-Adapter starts to drift.

Option B — **Human spokesperson (SDXL)**: **InstantID** at weight 0.8 + 2-3 reference photos concatenated into one ArcFace embedding. Add **ControlNet-Pose** from a desired skeleton to explicitly control posture. Works on SDXL; no Flux equivalent is this polished as of early 2025.

Option C — **Human spokesperson (Flux)**: **PuLID-Flux** (`cubiq/PuLID_ComfyUI`) at weight 1.0. Much less style-invasive than InstantID. Prompt adherence degrades more gracefully. Currently state-of-the-art for open-source identity on Flux.

### Recipe 5 — Brand Palette / Style Transfer Across a Series

*Problem:* 30 illustrations must all feel like one brand system — same colors, same linework weight.

1. Create a **style-sheet reference image** (a collage of 4–6 finished brand illustrations). Normalize it to the CLIP-image input size the adapter expects (224×224 for SD1.5 IP-Adapter; Flux IP-Adapter v2 wants 1024×1024 aspect-preserved).
2. Use **IP-Adapter** (not Plus) at weight **0.45–0.6** — Plus tends to copy objects from the reference; the standard adapter transfers *style* only.
3. Prompt-drive each concept: `{{scene}}, in the style of the reference brand system, flat illustration, 2-color, bold outline`.
4. Lock palette further with negative prompts: `watermark, photorealistic, gradient, rainbow, neon`.

For Flux: use **FLUX.1 Redux** with a style-sheet + text prompt. Redux is trained specifically for "image + text → variation" and is the cleanest one-call way to do this on Flux. For finer style control, stack Redux with XLabs Flux IP-Adapter v2 at a low weight (0.3).

### Recipe 6 — Room / Scene Retexture (Keep Geometry, Change Materials)

*Problem:* You have a product render and need 10 retextured versions (wood, metal, marble).

1. Extract a depth map via MiDaS / ZoeDepth.
2. **FLUX.1 Depth** at weight 0.9, prompt varies material.
3. Optional: add IP-Adapter of a material swatch at weight 0.4 for palette guidance.

This is BFL's flagship Depth benchmark — it reliably beats Midjourney ReTexture for diversity while preserving the underlying geometry. Great for "same product, 10 finishes" marketing sheets.

### Recipe 7 — "Reference-Only" As Zero-Config Fallback

When you have no adapters but do have a reference image, use A1111/ComfyUI's **Reference-Only ControlNet**. Free, works on any SD checkpoint, great for *mood/lighting* transfer. Do not expect shape or identity fidelity — it is a stylistic hint, not a lock.

## Stacking & Weight Rules of Thumb

- **More than two adapters stacked usually degrades quality.** Start with one. Add a second only if the first is insufficient.
- Typical weights: ControlNet 0.5–0.8, IP-Adapter 0.4–0.8, PuLID 0.8–1.0, Redux 0.7–1.0, Reference-Only 0.3–0.6.
- For **logo stamping**, prefer a single strong IP-Adapter (0.9+) over stacked medium-weight adapters.
- For **icon families**, stack Canny (0.6) + IP-Adapter-Plus (0.4) — this is the single most reliable combination for brand systems.
- `start_percent` / `end_percent` control when the adapter fires. Running ControlNet only during steps 0–0.5 of the denoise gives a structural lock that the later steps can refine stylistically.
- Flux's double-stream blocks respond differently to IP-Adapter than SD UNets; expect to try weights 0.3 higher than SDXL equivalents.

## Limitations and Failure Modes

1. **Text rendering still fails.** None of these adapters reliably produce readable copy. If the logo contains a wordmark, composite it after generation (see category 08).
2. **IP-Adapter over-copies on Plus.** With weight ≥ 0.8, IP-Adapter-Plus tends to reproduce the entire subject from the reference instead of transferring style. Use the non-Plus variant for pure style transfer.
3. **InstantID style degradation.** InstantID at high weights flattens the base model's style. PuLID is strictly better when available.
4. **Flux adapters are less mature than SDXL adapters.** XLabs Flux IP-Adapter v2 is explicitly labeled beta. Expect to re-run with multiple seeds and weights.
5. **Canny thresholds matter.** Bad thresholds create junk edges that the ControlNet faithfully reproduces. Always visually inspect the intermediate map.
6. **Identity adapters are regulated in many jurisdictions.** Using InstantID/PuLID to "transfer" a real person's face without consent is unlawful in the EU AI Act and many US states. The prompt-to-asset should refuse these prompts by default.
7. **Union models are weaker per-mode.** InstantX Flux-Union is convenient but single-purpose community ControlNets (e.g., [Jasperai/Flux.1-dev-Controlnet-Canny](https://huggingface.co/jasperai/Flux.1-dev-Controlnet-Canny)) often beat Union on their specific mode. Use Union for orchestration, specialized for final pass.
8. **VRAM cost of stacking.** ControlNet clones a whole encoder. Two ControlNets on Flux need ~30GB VRAM at 1024×1024. T2I-Adapter is the cheap alternative.

## References

### Primary papers
- Zhang, Rao, Agrawala. *Adding Conditional Control to Text-to-Image Diffusion Models* (ControlNet). arXiv:2302.05543. [link](https://arxiv.org/abs/2302.05543)
- Mou et al. *T2I-Adapter: Learning Adapters to Dig Out More Controllable Ability for Text-to-Image Diffusion Models*. arXiv:2302.08453. [link](https://arxiv.org/abs/2302.08453)
- Ye et al. *IP-Adapter: Text Compatible Image Prompt Adapter for Text-to-Image Diffusion Models*. arXiv:2308.06721. [link](https://arxiv.org/abs/2308.06721)
- Wang et al. *InstantID: Zero-shot Identity-Preserving Generation in Seconds*. arXiv:2401.07519. [link](https://arxiv.org/abs/2401.07519)
- Guo et al. *PuLID: Pure and Lightning ID Customization via Contrastive Alignment*. arXiv:2404.16022. [link](https://arxiv.org/abs/2404.16022)

### Official model pages
- Black Forest Labs — *Introducing FLUX.1 Tools*. [blackforestlabs.ai/flux-1-tools](https://blackforestlabs.ai/flux-1-tools) (Nov 2024).
- `black-forest-labs/FLUX.1-Redux-dev` on HF: [huggingface.co/black-forest-labs/FLUX.1-Redux-dev](https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev)
- `black-forest-labs/FLUX.1-Canny-dev` and `FLUX.1-Depth-dev` (sibling releases Nov 2024).
- `InstantX/FLUX.1-dev-Controlnet-Union` [HF page](https://huggingface.co/InstantX/FLUX.1-dev-Controlnet-Union)
- `Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro` (Aug 2024)
- `XLabs-AI/flux-ip-adapter-v2` [HF page](https://huggingface.co/XLabs-AI/flux-ip-adapter-v2)
- `jasperai/Flux.1-dev-Controlnet-Canny` and `...-Depth` (specialized Flux ControlNets)
- `h94/IP-Adapter`, `h94/IP-Adapter-FaceID` on HF (cubiq/Ye maintained lineage)
- `guozinan/PuLID` + `cubiq/PuLID_ComfyUI`

### Reference ComfyUI workflows / tooling
- `cubiq/ComfyUI_IPAdapter_plus` — de-facto IP-Adapter custom nodes. [GitHub](https://github.com/cubiq/ComfyUI_IPAdapter_plus)
- `cubiq/PuLID_ComfyUI` — PuLID integration for ComfyUI.
- `XLabs-AI/x-flux-comfyui` — XLabs IP-Adapter + ControlNet custom nodes for Flux.
- Civitai — *FLUX.1 Tools Canny / Depth workflow*. [civitai.com/articles/9081](https://civitai.com/articles/9081/flux1-tools-canny-depth-workflow)
- HuggingFace diffusers — `FluxControlNetPipeline`, `FluxPriorReduxPipeline` docs. [diffusers flux docs](https://huggingface.co/docs/diffusers/main/en/api/pipelines/flux)
- `Mikubill/sd-webui-controlnet` — reference A1111 ControlNet extension (includes Reference-Only).

### Corroborating analyses
- MyAIForce — *Face Swapping Showdown: Flux PuLID, InstantID, and EcomID Compared*. [myaiforce.com/flux-pulid-vs-ecomid-vs-instantid](https://myaiforce.com/flux-pulid-vs-ecomid-vs-instantid/)
- InvokeAI PR #7070 — *Add support for FLUX ControlNet models (XLabs and InstantX)*. [github.com/invoke-ai/InvokeAI/pull/7070](https://github.com/invoke-ai/InvokeAI/pull/7070)
- Apatero — *ComfyUI Character Consistency Advanced Workflows 2026*. [apatero.com/blog/comfyui-character-consistency-advanced-workflows-2026](https://apatero.com/blog/comfyui-character-consistency-advanced-workflows-2026)
