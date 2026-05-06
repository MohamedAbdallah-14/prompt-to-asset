# 02 — Open-Source Landscape: UI Mockup Generation with Image Diffusion

Research scope: GitHub + HuggingFace Hub + Civitai. Image-only UI mockup generation (web dashboards, mobile screens). Code-gen tools (v0, html-to-figma, WebSight-as-code-gen) excluded.

## Executive Summary

The open-source ecosystem for **image-diffusion UI mockup generation** is thin. There is no `awesome-ui-generation` list, no canonical ComfyUI "dashboard mockup" workflow JSON, and no maintained project that wraps an image model with UI-aware post-processing. What exists, ranked by usefulness:

1. **Two well-trained Flux LoRAs** on Civitai — `UI/UX design generator` (1407204) and `UI UX design - V1` (736488) — both small (18-38 MB), Flux.1-D base, very-positive reception, but trained on tiny datasets (48 images, undocumented for the other) and biased toward game/landing-page aesthetics.
2. **One mature SDXL LoRA** — `Ui-Ux (LORA) SD 1.5 & SDXL` (98715) — covers mobile/web/dashboard, 424 reviews, last touched Dec 2025. Best documented general-purpose UI LoRA.
3. **Mature UI screenshot datasets exist but are oriented toward UI understanding, not generation**: RICO (66k Android screens, CC-BY 4.0), WebUI-350k (465 GB, custom license), Wave-UI-25k (multilingual, web+mobile+desktop). All usable as fine-tuning corpora; none ship with paired captions optimized for diffusion training.
4. **No image-only UI mockup tool** exists as a standalone OSS project. Every "UI generator" returned by searches is either code-gen (v0, Sightseer, ui-screenshot-to-prompt) or generic SD wrappers.
5. **IP-Adapter and ControlNet workflows exist but are generic** — `cubiq/ComfyUI_IPAdapter_plus` and `Shakker-Labs/ComfyUI-IPAdapter-Flux` are the canonical references. No published workflow targets UI-specific style transfer.

**Implication for prompt-to-asset:** The path to "better than raw prompting" for UI mockups is (a) fine-tune our own Flux LoRA on RICO + Wave-UI-25k filtered for high-fidelity dashboards, (b) borrow IP-Adapter style-transfer workflow from `cubiq/ComfyUI_IPAdapter_plus` for brand consistency, (c) ship a `dashboard` / `mobile_screen` asset type that routes to Flux + the LoRA. Prompt collections add nothing — none target UI.

## Key Findings

### Civitai LoRAs — three usable, one specialized

| LoRA | Base | Trigger | Trained on | Last update | Notes |
|---|---|---|---|---|---|
| [UI/UX design generator v1](https://civitai.com/models/1407204/uiux-design-generator) | Flux.1-D | `uiux` | Undocumented | 2025-03-28 | Recommends `uiux. <elements>. <colors>. <bg>` formula. 716 downloads, 71 reviews. BFL non-commercial license. |
| [UI UX design V1](https://civitai.com/models/736488/ui-ux-design) | Flux.1-D | "UI UX" | 48 images, **game UI + landing pages** | 2024-09-09 | Specialized: game interfaces, not enterprise dashboards. 18.5 MB. |
| [Ui-Ux LoRA SD 1.5 & SDXL](https://civitai.com/models/98715/ui-ux-lora) | SDXL 1.0 | `UI-UX Style` | Custom dataset | 2025-12-04 | 424 very-positive reviews, the most-vetted general UI LoRA. 162 MB. License unstated. |
| [Easy Mockup v0.1](https://civitai.com/models/199470/easy-mockup) | SDXL 1.0 | `mockup style` | n/a | 2023-12-13 | **Product mockups, not UI mockups.** Skip. UNMAINTAINED (>2 years). |

There is no Flux LoRA explicitly trained on dashboards. The closest match is `UI/UX design generator`, but its training corpus isn't documented, so we can't predict bias.

### Datasets — RICO + WebUI + Wave-UI cover the corpus need

| Dataset | Size | Modality | License | Use for diffusion training? |
|---|---|---|---|---|
| [Voxel51/rico](https://huggingface.co/datasets/Voxel51/rico) | 66,261 Android screens, ~9,300 apps, 27 categories | Screenshot + view hierarchy + bbox + semantic colorize | **CC-BY 4.0** | Yes — best license for fine-tuning. Captions need synthesis. |
| [biglab/webui-350k](https://huggingface.co/datasets/biglab/webui-350k) | 350k web pages, 465 GB | Multi-device screenshots + HTML/DOM | Custom ([COPYRIGHT.txt](https://github.com/js0nwu/webui/blob/main/COPYRIGHT.txt)) — review before use | Yes for research. License risk for redistribution. |
| [biglab/webui-7k](https://huggingface.co/datasets/biglab/webui-7k) | 7k subset of above | Same | Same | Smaller, faster fine-tune iteration. |
| [agentsea/wave-ui-25k](https://huggingface.co/datasets/agentsea/wave-ui-25k) | 25k UI screenshots, 46 languages, 120 element classes | Screenshot + bbox + element type + instruction | (See Hub page; arXiv 2403.17918) | Yes — multi-platform (web + mobile + desktop). Best caption coverage. |
| [HuggingFaceM4/WebSight v0.2](https://huggingface.co/blog/websight) | 2M synthetic webpages | Screenshot + Tailwind HTML | License unstated on blog page | Synthetic — useful for layout priors, not real-world style. |
| [rootsautomation/RICO-Screen2Words](https://huggingface.co/datasets/rootsautomation/RICO-Screen2Words) | RICO + captions | Screenshot + caption | Per RICO upstream | **Captioned RICO** — direct fine-tune candidate. |

**Mobbin (600k mobile screens) is commercial.** No open download. Skip.

### ComfyUI / A1111 workflows — none UI-specific

Searches for "comfyui ui mockup workflow", "comfyui dashboard wireframe", "comfyui wireframe to mockup" return generic SD workflow repos:

- [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) — official templates, no UI focus.
- [Suzie1/Comfyroll-Workflow-Templates](https://github.com/Suzie1/Comfyroll-Workflow-Templates) — SD1.5 generic.
- [cubiq/ComfyUI_Workflows](https://github.com/cubiq/ComfyUI_Workflows) — well-documented but generic.

The closest UI-relevant workflows are **style-transfer** primitives, not UI generators:

- [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) — canonical IP-Adapter implementation, SDXL+SD1.5. Use as the style-reference primitive for cross-screen brand consistency.
- [Shakker-Labs/ComfyUI-IPAdapter-Flux](https://github.com/Shakker-Labs/ComfyUI-IPAdapter-Flux) — Flux IP-Adapter port. Multiple-IP-adapter-with-multiple-images supported.
- [cozymantis/style-transfer-comfyui-workflow](https://github.com/cozymantis/style-transfer-comfyui-workflow) — minimal style-transfer comparison harness.

No published workflow chains ControlNet (canny/depth/scribble) → wireframe → diffusion specifically for UI. This is a real gap. ControlNet + wireframe sketch is the textbook pattern but no one has packaged it for UI mockups.

### Awesome lists — three are tangentially relevant, none direct

- [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — **71.7k stars**, 41 commits, 71 brand DESIGN.md files. **Code-gen oriented.** The DESIGN.md files (color tokens, type scale, components per brand) are useful as **brand-bundle seeds** for our `BrandBundle` ingestion, not for image generation.
- [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) — 68 DESIGN.md packs. Same as above, code-gen.
- [allanjsx/awesome-ai-for-design](https://github.com/allanjsx/awesome-ai-for-design) — curated AI-for-design tools list, mostly hosted services.
- [Edovalm/awesome-ui](https://github.com/Edovalm/awesome-ui) — design-resource list (Sketch/XD/Figma freebies). Not AI-related.

`awesome-ui-generation` and `awesome-diffusion-prompts` (UI-specific) **do not exist**. There are SD prompt collections like [yuyan124/awesome-stable-diffusion-prompts](https://github.com/yuyan124/awesome-stable-diffusion-prompts) and [Dalabad/stable-diffusion-prompt-templates](https://github.com/Dalabad/stable-diffusion-prompt-templates), but none have a UI section.

### Prompt collections with UI before/after — none found

Documented before/after UI prompt examples don't exist as a curated repo. The closest is the model card of `UI/UX design generator` LoRA, which gives one prompt formula. UNVERIFIED claim of any structured UI prompt corpus.

### Tools wrapping image-gen for UI specifically — none

Searches return only code-gen tools:
- [s-smits/ui-screenshot-to-prompt](https://github.com/s-smits/ui-screenshot-to-prompt) — image → text prompt for v0/Bolt. Code-gen target. Skip.
- WebSight's Sightseer — screenshot → HTML. Code-gen.

**No OSS project today wraps an image model + post-processing for UI mockup output.** This is the white space prompt-to-asset can occupy.

## Recommendations (Concrete)

1. **Fine-tune our own Flux LoRA on `rootsautomation/RICO-Screen2Words` + `agentsea/wave-ui-25k`** filtered to dashboards/web. RICO's CC-BY 4.0 is the cleanest license. Use the existing P2A `asset_train_brand_lora` rail; this would slot in as a global "ui-mockup" LoRA rather than a brand LoRA. Rated 8/10 as a borrow-target.

2. **Vendor [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) workflow patterns into a ComfyUI-mode P2A backend for cross-screen brand consistency.** This is exactly the brand-lock primitive `brand-consistency` skill needs for image-mode UI sets. The repo is actively maintained, well-documented, MIT-style. Rated 9/10.

3. **Until we ship the LoRA: route UI mockup briefs to Flux.1-dev + [UI/UX design generator (1407204)](https://civitai.com/models/1407204/uiux-design-generator) LoRA via fal.ai or Replicate.** The trigger formula `uiux. <elements>. <colors>. <bg>` belongs in `t2i-prompt-dialect` as a UI-preset. License is BFL non-commercial — gate behind explicit user opt-in. Rated 6/10 (works, but weak corpus).

4. **For mobile screens specifically: skip the generic UI LoRAs and use Voxel51/rico-fine-tuned Flux** (path 1) or fall back to generic Flux + structured prompt with platform-specific anchors ("iOS 16 design language, SF Pro typography, system tint blue"). Verified-correct anchors > ambiguous LoRAs.

5. **Wireframe→mockup ControlNet workflow is unbuilt.** Building a published ControlNet (scribble/canny) + Flux + UI LoRA workflow JSON would fill a real gap and is the cheapest place to demonstrate "better than raw prompting" — Tier-2 deliverable, not blocker.

6. **For brand-bundle ingestion: scrape [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) into `asset_brand_bundle_parse` test fixtures.** 71 real-brand DESIGN.md files at 71.7k stars is a free, well-formatted brand-spec corpus for round-trip tests. Code-gen origin doesn't matter — the format maps cleanly to our `BrandBundle`.

7. **Skip Mobbin** (commercial), **WebSight** (synthetic + code-gen origin), **Easy Mockup LoRA** (product mockups, not UI, unmaintained). Skip the existing prompt-template repos — none cover UI.

## Sources

- LoRAs: [UI/UX design generator](https://civitai.com/models/1407204/uiux-design-generator), [UI UX design V1](https://civitai.com/models/736488/ui-ux-design), [Ui-Ux LoRA SD/SDXL](https://civitai.com/models/98715/ui-ux-lora), [Easy Mockup](https://civitai.com/models/199470/easy-mockup)
- Datasets: [Voxel51/rico](https://huggingface.co/datasets/Voxel51/rico), [biglab/webui-350k](https://huggingface.co/datasets/biglab/webui-350k), [biglab/webui-7k](https://huggingface.co/datasets/biglab/webui-7k), [agentsea/wave-ui-25k](https://huggingface.co/datasets/agentsea/wave-ui-25k), [rootsautomation/RICO-Screen2Words](https://huggingface.co/datasets/rootsautomation/RICO-Screen2Words), [creative-graphic-design/Rico](https://huggingface.co/datasets/creative-graphic-design/Rico), [HuggingFaceM4/WebSight blog](https://huggingface.co/blog/websight)
- ComfyUI / IP-Adapter: [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus), [Shakker-Labs/ComfyUI-IPAdapter-Flux](https://github.com/Shakker-Labs/ComfyUI-IPAdapter-Flux), [cozymantis/style-transfer-comfyui-workflow](https://github.com/cozymantis/style-transfer-comfyui-workflow), [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates)
- Awesome lists: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design), [allanjsx/awesome-ai-for-design](https://github.com/allanjsx/awesome-ai-for-design), [Edovalm/awesome-ui](https://github.com/Edovalm/awesome-ui)
- Generic SD prompt collections (no UI focus): [yuyan124/awesome-stable-diffusion-prompts](https://github.com/yuyan124/awesome-stable-diffusion-prompts), [Dalabad/stable-diffusion-prompt-templates](https://github.com/Dalabad/stable-diffusion-prompt-templates), [adieyal/sd-dynamic-prompts](https://github.com/adieyal/sd-dynamic-prompts)
- ControlNet primitives: [lllyasviel/ControlNet](https://github.com/lllyasviel/ControlNet), [Mikubill/sd-webui-controlnet](https://github.com/Mikubill/sd-webui-controlnet)
- Original RICO project page: [interactionmining.org/rico](https://www.interactionmining.org/archive/rico)
- WebUI paper: [CHI 2023 paper](https://dl.acm.org/doi/abs/10.1145/3544548.3581158), [project site](https://uimodeling.github.io/)
