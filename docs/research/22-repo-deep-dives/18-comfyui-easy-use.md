---
wave: 2
role: repo-deep-dive
slug: 18-comfyui-easy-use
title: "Deep dive: yolain/ComfyUI-Easy-Use"
repo: "https://github.com/yolain/ComfyUI-Easy-Use"
license: "GPL-3.0"
date: 2026-04-19
sources:
  - https://github.com/yolain/ComfyUI-Easy-Use
  - https://github.com/yolain/ComfyUI-Easy-Use/blob/main/LICENSE
  - https://raw.githubusercontent.com/yolain/ComfyUI-Easy-Use/main/README.md
  - https://raw.githubusercontent.com/yolain/ComfyUI-Easy-Use/main/requirements.txt
  - https://docs.easyuse.yolain.com/en/get-started/introduction
  - https://github.com/yolain/ComfyUI-Easy-Use/blob/070001b3/py/modules/layer_diffuse/__init__.py
  - https://www.runcomfy.com/comfyui-nodes/ComfyUI-Easy-Use/easy-preSamplingLayerDiffusion
  - https://comfy.icu/node/easy-fullkSampler
  - https://github.com/huchenlei/ComfyUI-layerdiffuse
  - https://github.com/RedAIGC/Flux-version-LayerDiffuse
  - https://github.com/yolain/ComfyUI-Yolain-Workflows
tags: [comfyui, easy-use, layerdiffuse, workflow]
---

# Deep dive: yolain/ComfyUI-Easy-Use

## Repo at a glance

- **Repository:** `yolain/ComfyUI-Easy-Use`
- **Stars / age:** ≈2.5k★, active since late 2023, weekly releases through v1.3.6 (Jan 23, 2026); last commit April 9, 2026.

> **Updated 2026-04-21:** v1.3.6 (January 23, 2026) is the latest release;
> last commit April 9, 2026 — actively maintained. Star count confirmed at
> ~2.5k. The LayerDiffusion path remains SDXL/SD1.5 only as of v1.3.6 —
> no Flux LayerDiffusion support has been added inside Easy-Use. GPL-3.0
> license is unchanged. For Flux transparent output, external
> `ComfyUI_FluxLayerDiffuse` nodes are still required. The Comfy frontend
> compatibility issues noted in v1.2.9/v1.3.2/v1.3.5 have been resolved in
> v1.3.6, but pin-commits discipline remains mandatory in worker images due
> to the history of breaking regressions.
- **License:** **GPL-3.0** (confirmed in `LICENSE`; README's donation section re-states
  "GPL-licensed open source project"). Any code fork or direct bundling propagates GPL
  to the dependent work — so for our product we call it from a serverless worker
  (ComfyUI + custom nodes running out-of-process, communicating via HTTP/WS), we do not
  vendor it into our own codebase.
- **Core thesis:** "Make ComfyUI bearable." It's a super-pack inspired by TinyTerraNodes
  that collapses the 6–8 native nodes of a typical SD workflow down to 2–3 "easy" nodes
  (loader + preSampling + kSampler), plus a long tail of quality-of-life nodes (XY plot,
  wildcards, conditioning edit, RMBG, image chooser). Wave-1's 20d survey positioned
  Easy-Use as the shortest path to a transparent-logo workflow; this deep-dive confirms
  that and maps the exact node stack we would call.

## Inventory — the nodes that matter to asset generation

Easy-Use exposes ~207 nodes. We only care about a specific subgraph for asset
generation. The groups relevant to our product:

**Loaders (model + CLIP + VAE + empty latent in one node).**
- `easy fullLoader` — kitchen-sink loader: checkpoint, VAE override, CLIP skip, LoRA
  stack (up to 9), positive/negative prompts, batch size, resolution, seed, and an
  `a1111_prompt_style` flag (reproduces SD-WebUI outputs byte-equivalent when
  `ComfyUI_smZNodes` is installed). Outputs a `PIPE_LINE`.
- `easy a1111Loader` / `easy comfyLoader` — trimmed variants biased to one prompt dialect.
- `easy fluxLoader` — Flux-specific, handles the `clip_l` + `t5xxl_fp8_e4m3fn` split and
  Flux's CFG-of-1 convention.
- `easy cascadeLoader`, `easy kolorsLoader`, `easy hunyuanDiTLoader`, `easy pixArtLoader`,
  `easy svdLoader` + friends — one per model family.

**Prompt nodes.**
- `easy positive` / `easy negative` — trivial but important: a typed text box whose only
  job is to emit a string into a pipe. Makes workflows JSON-mutable (swap one node's
  `text` field, not hunt a CLIP-encoder input).
- `easy wildcards` — wildcard expansion + `__lora__` syntax; `multiline_mode` for stacks.
- `easy stylesSelector` — reads Fooocus-format style JSONs (the `EasyUse-Styles-Templates`
  repo ships 100+ presets). Native home for per-model verbalizers.
- `easy promptLine` / `…Replace` / `…Concat` / `…List`, `easy stringJoinLines` — string
  plumbing that lets a rewriter produce shards (subject, modifier, negative, weights)
  and assemble them inside the graph.

**PreSampling — parameter configuration split from execution.**
- `easy preSampling` — sampler, scheduler, steps, cfg, denoise, seed, image-to-latent.
- `easy preSamplingAdvanced` — adds `start_at_step`, `end_at_step`, `return_with_leftover_noise`.
- `easy preSamplingCustom` — custom sigmas + basic guider (auto-swaps to `FluxGuidance`
  when a Flux model is detected and `cfg > 0`).
- `easy preSamplingDynamicCFG`, `easy preSamplingNoiseIn`, `easy preSamplingCascade`,
  `easy preSamplingSdTurbo`, `easy preSamplingLCM` — specialised variants.
- **`easy preSamplingLayerDiffusion`** — the key one for transparency (see below).

**kSamplers — execute and decode.**
- `easy kSampler` / `easy fullkSampler` — run the pipe, VAE-decode, save or preview.
- `easy kSamplerInpainting` — masked inpainting with BrushNet / PowerPaint / Fooocus-inpaint.
- **`easy kSamplerLayerDiffusion`** — decodes into RGBA, emits `image` + `mask` so the
  alpha channel is usable with no separate matting pass.

**LayerDiffusion internals** (`py/modules/layer_diffuse/__init__.py`, commit `070001b3`).
The module wraps `huchenlei/ComfyUI-layerdiffuse`'s `LayeredDiffusionApply*` nodes and
re-exposes five methods via the `method` widget:

| method          | models     | effect                                                        |
|-----------------|------------|----------------------------------------------------------------|
| `FG_ONLY_ATTN`  | SDXL, SD1.5 | generate foreground with transparent alpha (attention-injection) |
| `FG_ONLY_CONV`  | SDXL only  | same but via conv-layer injection (sharper edges on SDXL)      |
| `EVERYTHING`    | SDXL       | FG + BG + blended in one 3N batch                              |
| `FG_TO_BLEND`   | SDXL       | given a foreground, generate plausible background and blend    |
| `BG_TO_BLEND`   | SDXL       | given a background, generate foreground and blend              |

Constraints worth pinning: **SDXL and SD1.5 only**, dimensions must be **multiples of
64** or alpha decode fails, batch must be `2N`/`3N` for the blend methods.

**Flux transparency — *not* native in Easy-Use.** Easy-Use v1.3.6 still predicates its
LayerDiffusion path on SDXL/SD1.5 (`Only SDXL and SD1.5 model supported for Layer
Diffusion` is still the literal assertion). Flux RGBA lives in a separate family:
`RedAIGC/Flux-version-LayerDiffuse` (TransparentVAE + `layerlora.safetensors`) plus
third-party wrappers like `DenRakEiw/ComfyUI_FluxLayerDiffuse`
(`FluxLayerDiffuseStandaloneLoader`, `FluxTransparentModelLoader`, last updated
2025-03-17). For our router this means: **transparent output on SDXL or SD1.5 → use
Easy-Use**; **transparent output on Flux → use the Flux-LayerDiffuse custom nodes and
orchestrate them ourselves** (there is no `easy preSamplingLayerDiffusionFlux` as of
v1.3.6).

**XY plot — the cheap ablation surface.**
- `easy XYPlot`, `easy XYPlotAdvanced`, `easy XYInputs: Checkpoint | Lora | Sampler |
  Scheduler | Steps | Cfg | PromptSR | ModelMergeBlocks | ControlNet`.
- Axes accept checkpoints, LoRAs, prompt search/replace, CFG sweeps, sampler/scheduler
  matrices, ControlNet swaps. Outputs a gridded PNG with labels. This is the
  lowest-friction way we have of producing *candidate sheets* (e.g., 9 logos across
  three CFG × three sampler combos) which an LLM can then pick from via
  `easy imageChooser`.

**Post-generation / utility.**
- `easy imageRemBg` — BriaAI RMBG-1.4 default, plus inspyrenet, `ben2`, RMBG-2.0
  (v1.2.5+). Fallback when LayerDiffuse isn't an option.
- `easy imageChooser` (interactive preview-and-pick), `easy applyBrushNet`,
  `easy applyFooocusInpaint`, `easy icLightApply`, `easy ipadapterApply*`,
  `easy instantIDApply*`, `easy pulIDApply*`.
- `easy ifElse`, `easy forLoopStart/End`, `easy anythingIndexSwitch`, `easy seedList`
  — a single JSON can represent a bounded search loop.

## Dependency chain

`requirements.txt` (current main):
```
diffusers
accelerate
clip_interrogator>=0.6.0
lark
onnxruntime
opencv-python-headless
sentencepiece
spandrel
matplotlib
peft
```

Transitively it depends on `torch`, `numpy`, `Pillow`, `transformers`, `safetensors`,
and `xformers` via ComfyUI itself. For LayerDiffusion you additionally need the
`layerdiffuse` pip package (pulled by `huchenlei/ComfyUI-layerdiffuse`) — `diffusers
>= 0.25.0` minimum, `>= 0.29.0` recommended, plus the model weights
(`layer_xl_transparent_attn.safetensors`, `layer_xl_transparent_conv.safetensors`,
`layer_xl_fg2ble.safetensors`, `layer_xl_bg2ble.safetensors`,
`layer_sd15_transparent_attn.safetensors`, `vae_transparent_decoder.safetensors`).

Companion packs the README lists as soft deps: `ComfyUI-Manager`, `Impact-Pack`,
`Inspire-Pack`, `IPAdapter_plus`, `InstantID`, `smZNodes` (for `a1111_prompt_style`),
`ComfyUI-layerdiffuse` (hard dep for transparency), `Custom-Scripts`, `BrushNet`,
`cg-image-picker`, `rgthree-comfy`. Pin these commit-by-commit — Easy-Use has broken
against rgthree and the ComfyUI frontend multiple times (v1.2.9, v1.3.2, v1.3.5 all
ship regression fixes for "widget hidden" and image-chooser bugs).

## Workflow examples that matter

Yolain's sister repo `yolain/ComfyUI-Yolain-Workflows` ships reference graphs:
`1_basic/1-1t2i`, `1-2i2i` (vanilla skeletons), `2_advanced/2-1layerdiffusion/*`
(canonical transparent-output graphs — the templates we parameterize for
`generate_transparent_logo`), `2-4inpainting/*` (BrushNet/PowerPaint masked flows),
`3_xyplot/*` (CFG/sampler grids for candidate sheets).

For **logo / icon / transparent sticker**, the happy-path workflow is:

1. `easy fullLoader` → pick an SDXL checkpoint with a logo-friendly LoRA stacked
   (`logo_v1`, `flat_vector_xl`, etc.).
2. `easy stylesSelector` → choose a flat-vector or sticker style template.
3. `easy positive` + `easy negative` → concrete subject + the standard "no background,
   no shadow, no frame, pure transparency" negative set.
4. `easy preSamplingLayerDiffusion` with `method=FG_ONLY_ATTN`, `weight=1.0`,
   `steps=25`, `cfg=7`, `sampler_name=dpmpp_2m`, `scheduler=karras`.
5. `easy kSamplerLayerDiffusion` → outputs `IMAGE` (RGBA) + `MASK`.
6. `SaveImage` with alpha preserved (ComfyUI's native node writes RGBA PNG when the
   tensor has 4 channels).

## Compatibility matrix (2026-Q2, Easy-Use v1.3.6)

| Model family | Easy loader                  | Transparency path in Easy-Use                                   |
|---|---|---|
| **SD 1.5**   | `easy fullLoader / a1111Loader` | `easy preSamplingLayerDiffusion` `FG_ONLY_ATTN` only            |
| **SDXL**     | `easy fullLoader`             | All five methods — `FG_ONLY_ATTN/CONV`, `EVERYTHING`, `FG_TO_BLEND`, `BG_TO_BLEND` |
| **SD 2.x**   | `easy fullLoader`             | No LayerDiffusion. Fall back to `easy imageRemBg` (BRIA RMBG 2.0 or ben2) |
| **Stable Cascade** | `easy cascadeLoader`    | No LayerDiffusion                                                |
| **SD3 / SD3.5** | `easy fullLoader` (SD3 mode) | No LayerDiffusion — matting only                                 |
| **Flux.1 [dev/schnell]** | `easy fluxLoader` | **No LayerDiffusion inside Easy-Use.** Use `ComfyUI_FluxLayerDiffuse` nodes + TransparentVAE outside this pack |
| **Kolors**   | `easy kolorsLoader`           | No LayerDiffusion                                                |
| **HunyuanDiT / PixArt** | dedicated loaders    | No LayerDiffusion                                                |

Practical read: Easy-Use is **the** pack when the target is SDXL-transparent and
**a useful pipeline pack** for Flux/SD3 (loader + preSampling ergonomics) but offers
no transparency advantage there over vanilla ComfyUI.

## Minimum workflow JSON — transparent logo via easy layerDiffusion

Saved in ComfyUI's *API format* (the shape `/prompt` accepts; not the UI graph with
position metadata). SDXL, `FG_ONLY_ATTN`, 1024×1024, seed-fixed, ready to POST:

```json
{
  "1": {
    "class_type": "easy fullLoader",
    "inputs": {
      "ckpt_name": "sd_xl_base_1.0.safetensors",
      "vae_name": "Baked VAE",
      "clip_skip": -2,
      "lora_name": "None",
      "lora_model_strength": 1.0,
      "lora_clip_strength": 1.0,
      "resolution": "1024 x 1024 (square)",
      "empty_latent_width": 1024,
      "empty_latent_height": 1024,
      "positive": "a minimalist flat vector logo of a mountain fox, bold geometric shapes, single accent color, clean lines, centered",
      "negative": "background, photograph, 3d render, shadow, gradient mesh, text, watermark, frame, noise, clutter",
      "batch_size": 1,
      "a1111_prompt_style": false
    }
  },
  "2": {
    "class_type": "easy preSamplingLayerDiffusion",
    "inputs": {
      "pipe": ["1", 0],
      "method": "FG_ONLY_ATTN",
      "weight": 1.0,
      "steps": 25,
      "cfg": 7.0,
      "sampler_name": "dpmpp_2m",
      "scheduler": "karras",
      "denoise": 1.0,
      "seed": 42
    }
  },
  "3": {
    "class_type": "easy kSamplerLayerDiffusion",
    "inputs": {
      "pipe": ["2", 0],
      "image_output": "Save",
      "save_prefix": "logo_fox_"
    }
  }
}
```

Three nodes, one `/prompt` POST. The output PNG in `output/logo_fox_*.png` is 4-channel
RGBA with LayerDiffuse's trained transparent-VAE decoder — i.e. the "soft edges"
that `rembg`/RMBG-2.0 bungle on logo strokes.

Scaling up for a candidate sheet: wrap node `2` behind `easy XYPlot` with
`x_axis=cfg x_values="4,7,10"` and `y_axis=seed y_values="1,2,3"` and you get a
3×3 grid in one prompt — cheaper than nine independent calls, and the grid image is
ready for `easy imageChooser` or for an LLM to pick from.

## Strengths / weaknesses (for our router)

**Strengths.**
- Shortest JSON to a transparent SDXL logo of any OSS pipeline. Three nodes, no hand-
  wired CLIPTextEncode/VAEDecode/EmptyLatent plumbing.
- The pipe abstraction makes programmatic mutation safe: swap `positive` in node 1,
  swap `seed` in node 2, nothing else changes. Perfect for a backend that templates a
  workflow from `(asset_type, intent, brand_bundle)`.
- `easy stylesSelector` + the `EasyUse-Styles-Templates` repo are a ready-to-go home
  for our per-model-family verbalizers (a logo preset, an icon preset, a sticker preset).
- XY plot is a first-class citizen — we get ablation grids for free.
- Active maintenance (v1.3.6 in 2026, not archived like `was-node-suite`).

**Weaknesses / sharp edges.**
- **GPL-3.0.** Strict no-vendor: call it over HTTP/WS, never embed its code in our
  own package. This is a recurring constraint with the ComfyUI ecosystem (ComfyUI
  itself is also GPL-3.0 via forks) and is the central reason our product lives
  *outside* the runtime.
- Easy-Use LayerDiffusion is **SDXL/SD1.5 only**. Flux RGBA is a separate node pack
  with its own TransparentVAE weights; our router must know which transparency path
  to pick per model.
- Custom-node drift: three recent releases fixed breakage against ComfyUI frontend
  changes. Our worker image must pin Easy-Use *and* its dependency pack commits, and
  rebuild on a cadence rather than on-demand.
- Chinese-first documentation (the `docs.easyuse.yolain.com` site has EN but lags CN),
  and the README uses anchor links to sections that sometimes don't exist in the
  English version. Expect to read Python source for edge-case truth.
- 207 nodes is a lot of surface area we don't need. We use ~15; the other 192 are
  dead weight in our deployment and potential namespace collision risk with other
  packs (`easy imageRemBg` was *removed* in v1.0.2 and re-added in v1.1.1, so
  downstream node-ID references are brittle across versions).

## Decision

**Adopt Easy-Use as the default ComfyUI node pack for our SDXL-transparent path; do
not vendor; pin commits.** It is the shortest available route from `(intent, style,
seed)` to a usable RGBA PNG, and the `(easy fullLoader → easy preSamplingLayerDiffusion
→ easy kSamplerLayerDiffusion)` skeleton is exactly the three-slot template our
`generate_logo` / `generate_sticker` tools want to parameterize. The minimum workflow
JSON above ships as-is in our worker image as `templates/sdxl_transparent.json`.

Where Easy-Use stops, we keep routing elsewhere: Flux transparency via
`ComfyUI_FluxLayerDiffuse` + TransparentVAE, SD3/Flux non-transparent via vanilla
ComfyUI nodes + BRIA RMBG 2.0 fallback, `gpt-image-1` when the caller pays for hosted
transparency and expects 10–20s latency. Easy-Use is a **module in the router**, not
the router itself. GPL-3.0 licensing keeps it at arm's length — we talk to it over the
wire, we never import it, and we never ship its Python into our repo.
