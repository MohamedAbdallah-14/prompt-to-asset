---
wave: 2
role: repo-deep-dive
slug: 17-comfyui-layerdiffuse
title: "Deep dive: huchenlei/ComfyUI-layerdiffuse"
repo: "https://github.com/huchenlei/ComfyUI-layerdiffuse"
license: "code: Apache-2.0 · weights: CreativeML Open RAIL-M (use-based restrictions, commercial OK)"
date: 2026-04-19
sources:
  - https://github.com/huchenlei/ComfyUI-layerdiffuse
  - https://raw.githubusercontent.com/huchenlei/ComfyUI-layerdiffuse/main/README.md
  - https://raw.githubusercontent.com/huchenlei/ComfyUI-layerdiffuse/main/LICENSE
  - https://raw.githubusercontent.com/huchenlei/ComfyUI-layerdiffuse/main/layered_diffusion.py
  - https://huggingface.co/LayerDiffusion/layerdiffusion-v1
  - https://github.com/layerdiffusion/LayerDiffuse
  - https://arxiv.org/abs/2402.17113
  - https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/121
  - https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/127
  - https://www.runcomfy.com/comfyui-nodes/ComfyUI-layerdiffuse
  - https://www.runcomfy.com/comfyui-nodes/ComfyUI-Easy-Use/easy-kSamplerLayerDiffusion
  - https://github.com/yolain/ComfyUI-Easy-Use/blob/070001b3/py/modules/layer_diffuse/__init__.py
  - https://github.com/RedAIGC/Flux-version-LayerDiffuse
tags: [comfyui, layerdiffuse, rgba, transparency, native-alpha]
---

# Deep dive: `huchenlei/ComfyUI-layerdiffuse`

`huchenlei/ComfyUI-layerdiffuse` is the native ComfyUI port of Zhang & Agrawala's
*Transparent Image Layer Diffusion using Latent Transparency* (SIGGRAPH 2024,
[arXiv:2402.17113](https://arxiv.org/abs/2402.17113)). It is the open-source
ground truth for producing real RGBA pixels from Stable Diffusion inside a
graph runtime — category-13 pain #1 ("Gemini paints a checker into RGB") dies
at the node boundary where this pack sits, because the model now *emits* an
alpha plane instead of hallucinating a picture of transparency.

For our plugin this repo is the single most important piece of self-hosted
execution infrastructure. Everything in category 13 that is not `gpt-image-1`
or Ideogram 3.0 flows through either this pack, the Flux companion
([RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse)),
or the wrapper node in `ComfyUI-Easy-Use`.

## Repo metrics

| Field | Value |
|---|---|
| Stars | ~1.77 k (1,769 at date of scrape; HN/awesome-ComfyUI lists cluster around 1.6 k–1.8 k) |
| Forks | 0 visible (public GitHub UI shows `0` — likely GitHub caching quirk; package is widely forked via registry installs) |
| Last commit | 2025-02-25 — essentially frozen through April 2026 |
| Language mix | Python (100 %) — 1 node file (`layered_diffusion.py`) + `lib_layerdiffusion/` helpers |
| Install surface | ComfyUI-Manager ("ComfyUI-layerdiffuse (layerdiffusion)") or `git clone` + `pip install -r requirements.txt` |
| Author | `huchenlei` (also maintains `sd-webui-layerdiffusion`; 3160-day-old GitHub account) |
| Upstream paper | Zhang & Agrawala, [arXiv:2402.17113](https://arxiv.org/abs/2402.17113) |

The repo is quiet but authoritative: it is the implementation Comfy users
reach for by default, it is the one the ComfyUI-Manager registry indexes as
`ComfyUI-layerdiffuse`, and it is the one `ComfyUI-Easy-Use` wraps under the
hood. No active competitor pack exists for SD1.5/SDXL native RGBA.

## License: code vs. weights

This is the part that most write-ups get wrong, and it matters for any
commercial deployment.

- **Code (this repo)** — `LICENSE` is plain-text **Apache-2.0** (verified by
  fetching `main/LICENSE` directly). We may vendor, fork, modify, and ship
  derivative nodes with only NOTICE-level attribution.
- **Weights on Hugging Face** — `LayerDiffusion/layerdiffusion-v1` publishes
  the LoRAs and VAE decoder under **CreativeML Open RAIL-M** (same license as
  Stable Diffusion 1.5 / SDXL base). The Hugging Face `README.md` frontmatter
  explicitly tags `license: creativeml-openrail-m` (verified via blame at
  commit `3ee6b5a4`). The model card itself is "under construction" but the
  license header is stable across revisions.
- **Practical implication** — OpenRAIL-M is **use-based, not non-commercial**.
  It permits commercial use, modification, and redistribution. It forbids
  enumerated harmful uses (generating illegal content, etc.) and requires that
  the use restrictions propagate to any derivative. This is compatible with
  a paid SaaS / hosted MCP; it is *not* CC-BY-NC-4.0 (which is the trap that
  bites `briaai/RMBG-2.0` — category 13d §License Warnings). We keep the
  downstream-restrictions list in our own EULA and redistribute the weights
  with their original license notice.
- **Cascading base-model license** — the LoRA is *useless* without an SDXL or
  SD1.5 checkpoint. SDXL base is CreativeML Open RAIL++-M (commercial OK); SD
  1.5 is CreativeML Open RAIL-M. A Pony/Noobai/Illustrious merge has its own
  cascading restrictions; see known-issues below.

**Bottom line:** Apache-2.0 code + OpenRAIL-M weights + OpenRAIL++ base model
is a clean commercial stack. It is the cleanest OSS native-alpha path we have
(**G12** license-clean weight stack, per 20-INDEX).

## Supported base models (crucial)

Hard-coded in `layered_diffusion.py` via the `StableDiffusionVersion` enum and
the `MODELS` tuple on each node class:

| Base | Status | Weights referenced in code |
|---|---|---|
| **SD 1.5 / SD 2.x** | Supported (FG only + all SD15-only "joint" paths) | `layer_sd15_transparent_attn.safetensors`, `layer_sd15_joint.safetensors`, `layer_sd15_fg2bg.safetensors`, `layer_sd15_bg2fg.safetensors`, `layer_sd15_vae_transparent_decoder.safetensors` |
| **SDXL** | Supported (FG Attention + FG Conv injection, plus XL-only cond/diff) | `layer_xl_transparent_attn.safetensors`, `layer_xl_transparent_conv.safetensors`, `layer_xl_fg2ble.safetensors`, `layer_xl_bg2ble.safetensors`, `layer_xl_fgble2bg.safetensors`, `layer_xl_bgble2fg.safetensors`, `vae_transparent_decoder.safetensors` |
| **Flux.1 [dev] / [pro]** | **Not supported in this pack.** Issue [#121](https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/121) ("Support for Flux LayerDiffuse") has been open since 2024 and is stale. Use [RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse) — a separate pack with its own `TransparentVAE.pth` + `layerlora.safetensors` |
| **SD3 / SD3.5 / FLUX.2 / Z-Image / HiDream** | Not supported |

Empirical user reports in the issue tracker also note that **heavily
retrained SDXL variants** (Pony, Noobai, Illustrious) sometimes fail to
produce clean alpha because the attention-sharing LoRA drifts off its
training distribution. The FG-only **Conv injection** variant
(`layer_xl_transparent_conv.safetensors`) is the reported fallback when
Attention injection misbehaves on SDXL merges (issue [#127](https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/127)).

## VRAM requirements

The repo does not document a hard VRAM floor, but the implicit envelope is
"whatever your base checkpoint needs plus a small LoRA overhead":

- **SD 1.5 FG-only, 512×768, fp16** — fits comfortably in 6 GB (≈ baseline
  SD1.5 + ~200 MB attention-sharing LoRA + TransparentVAE decoder).
- **SDXL FG-only, 1024×1024, fp16** — ~10–12 GB comfortable; 8 GB works with
  `--medvram` / block-swap; the LoRA itself is rank-256 (~1 GB on disk).
- **SDXL + refiner + LayerDiffuse** — 12 GB minimum; 16 GB preferred.
- **SD1.5 joint (FG+BG+Blended simultaneously)** — requires batch size = 3N,
  so VRAM scales linearly; a single 3-frame batch at 512² on SD1.5 is still
  sub-10 GB on fp16.
- **Decode dimension constraint** — the `LayeredDiffusionDecode` node asserts
  `H % 64 == 0 and W % 64 == 0`. Any upstream resize that breaks that
  alignment produces a hard runtime error, not silent corruption — useful as
  a pre-flight check in our wiring.

For serverless deployment (RunPod L4 24 GB, A10G 24 GB, or Modal A100 40 GB
are all comfortable overkill) the practical floor is **12 GB** for SDXL and
**8 GB** for SD1.5. This makes LayerDiffuse cheap to host — much cheaper than
Flux.1-dev-sized serverless workers.

## Node list (8 nodes, from `NODE_CLASS_MAPPINGS`)

| Display name | Class | Purpose |
|---|---|---|
| **Layer Diffuse Apply** | `LayeredDiffusionApply` | Core FG-only RGBA patch. Three configs: SDXL Attention, SDXL Conv, SD1.5 Attention (attn_sharing). |
| **Layer Diffuse Joint Apply** | `LayeredDiffusionJointApply` | SD1.5-only: generate FG + BG + Blended in one 3N batch (all three views consistent). |
| **Layer Diffuse Cond Apply** | `LayeredDiffusionCondApply` | SDXL: FG-conditioned blended output (FG→Blended) or BG-conditioned blended (BG→Blended). |
| **Layer Diffuse Cond Joint Apply** | `LayeredDiffusionCondJointApply` | SD1.5: given FG or BG, generate the missing layer + blended (2N batch, uses `control_img`). |
| **Layer Diffuse Diff Apply** | `LayeredDiffusionDiffApply` | SDXL: extract FG from Blended+BG, or BG from Blended+FG (latent-level matting). |
| **Layer Diffuse Decode** | `LayeredDiffusionDecode` | Decode RGB image + alpha mask (separate tensors) from the latent using `TransparentVAEDecoder`. |
| **Layer Diffuse Decode (RGBA)** | `LayeredDiffusionDecodeRGBA` | Same as above but joins alpha and emits a single RGBA image (most common output). |
| **Layer Diffuse Decode (Split)** | `LayeredDiffusionDecodeSplit` | Batched decode every N frames — used for the SD1.5 joint/cond-joint paths. |

All eight are in the `layer_diffuse` node category. The core wedge is just
two nodes: `LayeredDiffusionApply` + `LayeredDiffusionDecodeRGBA`.

## Workflow examples shipped

`example_workflows/*.json`:

1. `layer_diffusion_fg_example_rgba.json` — FG-only, single RGBA output (the default).
2. `layer_diffusion_fg_example.json` — FG with RGB + alpha mask split for manual compositing.
3. `layer_diffusion_cond_example.json` — conditional blending given FG or BG.
4. `layer_diffusion_diff_fg.json`, `layer_diffusion_diff_bg.json`, `layer_diffusion_diff_bg_stop_at.json` — layer extraction.
5. `layer_diffusion_cond_fg_all.json` — blended + FG from a BG.
6. `layer_diffusion_cond_joint_bg.json`, `layer_diffusion_cond_joint_fg.json`, `layer_diffusion_joint.json` — SD1.5-only joint generation (2N or 3N batches).

For `generate_transparent_asset`, workflow (1) is the one we wire up.

## Conditional layer generation

This is what makes LayerDiffuse more than "a transparent-PNG LoRA":

- **FG → Blended.** Paste a real product photo (subject on white) as
  conditioning; generate a contextualized scene around it. Used for
  "plop this logo into a lifestyle shot" flows.
- **BG → Blended + FG.** Given a background plate, the model invents a
  believable foreground subject that matches lighting. Our creative sandbox.
- **Blended + FG → BG, Blended + BG → FG.** Latent-level "matting". The
  README notes this is *inferior* to dedicated BiRefNet/RMBG matting for
  simple subject extraction but useful when you also want to keep the
  alpha-aware edges.
- **SD1.5 Joint.** The most ambitious path — generate FG + BG + Blended
  simultaneously with shared attention. This is the closest OSS analog to
  Adobe's multi-layer generative fill. Requires `batch size = 3N`.

Our `validate_asset` + regenerate loop only needs the FG path; the cond/diff
paths are saved for a later `compose_hero_image` tool.

## Known issues (soft-edge quality, color bleed, fringing)

- **SDXL Attention Injection inconsistency (issue [#127](https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/127)).**
  Identical workflows and seeds produce materially different transparency on
  different ComfyUI builds. Reporter's empirical fix: switch to
  `layer_xl_transparent_conv.safetensors` (Conv injection). We should pin
  this as the default and only expose Attention injection behind an
  "experimental" flag.
- **Retrained SDXL compatibility.** Pony, Noobai, Illustrious, and many
  anime/realistic merges drift from the LoRA training distribution and can
  produce washed-out alpha or color bleed along edges. Stock
  `stabilityai/stable-diffusion-xl-base-1.0` is the canonical pairing; LoRAs
  and light-touch merges usually work. Our router should mark retrained SDXL
  checkpoints as "LayerDiffuse: untested" in validation.
- **Color bleed on bright/saturated subjects.** The `TransparentVAEDecoder`
  occasionally leaves a one-pixel bleed halo when the subject has high
  chroma against near-zero alpha. Mitigation in our pipeline:
  `erode 1px + defringe 2 iters` from R3 of 13-INDEX (the same halo-cleanup
  ladder we apply after BiRefNet).
- **Dim-multiple-of-64 hard assert.** Any upstream crop/resize that produces
  `H % 64 != 0` crashes the decode. Our wiring must snap dimensions to the
  nearest 64-multiple *before* submission.
- **`stop at` parameter not supported natively.** The forge extension has a
  `stop at` slider that partially-applies the LoRA; Comfy can't do this
  without hot-swapping a model mid-denoise. README recommends a second
  img2img pass on the output to simulate it; Easy-Use's `advanced` mode
  exposes this as a single toggle.
- **Diffusers version conflict.** `pip install -r requirements.txt` pins a
  `diffusers` version that frequently clashes with other Comfy custom-node
  packs (AnimateDiff, IP-Adapter). Runbook mitigation: dedicated venv or
  containerized ComfyUI per workflow family.
- **Fringing on repeated VAE encode/decode.** A general ComfyUI issue
  ([comfyanonymous/ComfyUI #1841](https://github.com/comfyanonymous/ComfyUI/issues/1841))
  that compounds across layered-diffuse + inpaint + save/load cycles; the
  `ImageCompositeMasked` workaround applies.
- **No Flux / SD3 / FLUX.2 path.** Issue #121 stale. For Flux we fork to
  `RedAIGC/Flux-version-LayerDiffuse` (separate repo, separate maintainer,
  weights sit in `RedAIGC/Flux-version-LayerDiffuse` under their own license
  — legal review pending per 13-INDEX Gaps).

## Compared to `ComfyUI-Easy-Use`'s `easy kSamplerLayerDiffusion`

`yolain/ComfyUI-Easy-Use` wraps all of the above into one fat node. Same
weights, same maths, different ergonomics:

| Dimension | `ComfyUI-layerdiffuse` (native) | `easy kSamplerLayerDiffusion` (wrapper) |
|---|---|---|
| Node count per workflow | 3 (Apply → KSampler → Decode-RGBA) min; 5–7 typical | 2–3 (EasyLoader → PreSampling → kSampler-LD) |
| Exposed modes | FG-Attn, FG-Conv, FG→Blend, BG→Blend, FG-Blend→BG, BG-Blend→FG, Joint (SD1.5) | `FG_ONLY_ATTN`, `FG_ONLY_CONV`, `FG_TO_BLEND`, `BG_TO_BLEND`, `FG_BLEND_TO_BG`, `BG_BLEND_TO_FG`, `Everything` (all modes) |
| Outputs | `MODEL` patched (caller samples + decodes separately) | `PIPE_LINE`, `IMAGE` (final), `IMAGE` (reference), `MASK` (alpha) — all in one shot |
| Advanced controls (`stop at`, weight schedule) | Manual (second img2img pass for `stop at`) | Built-in toggle |
| Debuggability | High (every intermediate latent is observable) | Lower (black-box pipe) |
| Integration cost in our workflow JSON | Clean, deterministic JSON graph | Harder to introspect; wrapper may mutate pipe in ways that surprise the validator |
| Dependency | Apache-2.0 + OpenRAIL-M only | GPL-3.0 Easy-Use layer on top of the same weights |

**Our pick:** call `ComfyUI-layerdiffuse` directly. The extra 2–3 nodes in the
graph are worth it for (a) GPL-cleanliness (Easy-Use is GPL-3.0 and would
contaminate a hosted binary), (b) determinism in our JSON contract, and
(c) ability to intercept the separated RGB + alpha mask for our halo-cleanup
post-processor between `Decode` and the final PNG encode. Easy-Use stays in
the toolbox as a recommended *local* developer UX for users who roll their
own workflows.

## Wiring plan — minimum workflow for `generate_transparent_asset`

The serverless host (RunPod `worker-comfyui`, Replicate `cog-comfyui`, or
Modal) receives a `workflow_json` input; our backend assembles this graph
from a parameterized template per call.

Minimum SDXL RGBA graph, in ComfyUI API format (node IDs stable, values slot-filled):

```json
{
  "1": { "class_type": "CheckpointLoaderSimple",
         "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" } },
  "2": { "class_type": "CLIPTextEncode",
         "inputs": { "clip": ["1", 1], "text": "<ENHANCED_PROMPT>" } },
  "3": { "class_type": "CLIPTextEncode",
         "inputs": { "clip": ["1", 1], "text": "<NEGATIVE_PROMPT>" } },
  "4": { "class_type": "EmptyLatentImage",
         "inputs": { "width": 1024, "height": 1024, "batch_size": 1 } },
  "5": { "class_type": "LayeredDiffusionApply",
         "inputs": { "model": ["1", 0],
                     "config": "SDXL, Conv Injection",
                     "weight": 1.0 } },
  "6": { "class_type": "KSampler",
         "inputs": { "model": ["5", 0], "positive": ["2", 0],
                     "negative": ["3", 0], "latent_image": ["4", 0],
                     "seed": "<SEED>", "steps": 30, "cfg": 7.0,
                     "sampler_name": "dpmpp_2m", "scheduler": "karras",
                     "denoise": 1.0 } },
  "7": { "class_type": "VAEDecode",
         "inputs": { "samples": ["6", 0], "vae": ["1", 2] } },
  "8": { "class_type": "LayeredDiffusionDecodeRGBA",
         "inputs": { "samples": ["6", 0], "images": ["7", 0],
                     "sd_version": "SDXL", "sub_batch_size": 16 } },
  "9": { "class_type": "SaveImage",
         "inputs": { "images": ["8", 0], "filename_prefix": "rgba_<JOB_ID>" } }
}
```

Nine nodes. Deterministic. All inputs are plain JSON slots — no server-side
Python. The `LayeredDiffusionApply` node autodownloads the LoRA on first run;
we pre-bake all five SDXL weight files into the container image at build
time (per the "pin-the-lockfile" ops discipline from 20-INDEX §5).

### Parameters to surface on the MCP tool

`generate_transparent_asset` exposes a minimal, opinionated surface:

| Tool input | Maps to | Default | Notes |
|---|---|---|---|
| `prompt` (string) | node 2 `text` | required | Already passed through our `enhance_prompt` with the R2 rewrite rules from 13-INDEX — no "transparent" / "no background" trigger words ever reach the model. |
| `negative_prompt` (string) | node 3 `text` | `"checker, checkerboard, gray squares, watermark, frame, border, floor, shadow, vignette"` | Category-13c detection targets, flipped to negatives. |
| `width`, `height` (int, 64-multiples) | node 4 | `1024, 1024` | We snap to multiples of 64 server-side before submission. |
| `seed` (int) | node 6 | random | Exposed for reproducibility. |
| `steps` (int, 15–50) | node 6 | 30 | |
| `cfg` (float, 3–12) | node 6 | 7.0 | |
| `base_model` (enum) | node 1 `ckpt_name` | `sd_xl_base_1.0` | Whitelisted: `sd_xl_base_1.0`, `sd_1_5_pruned`. Retrained merges gated behind `experimental=true`. |
| `injection` (enum: `conv` \| `attn`) | node 5 `config` | `conv` | Attention injection exposed only when `experimental=true` (per issue #127). |
| `weight` (float, 0–1.5) | node 5 `weight` | 1.0 | |

We deliberately do **not** surface `stop at`, joint/cond modes, or SD1.5
batch-N magic in v1. Those become `generate_layered_scene` later.

### Validation hook

After node 9's PNG is returned, the six-check `validate_rgba(...)` from
R5 of 13-INDEX runs server-side. A failure triggers one retry with
`injection="attn"` ↔ `"conv"` flipped and `weight *= 0.9`, then surfaces
a "transparency unverified" flag. We never silently ship opaque PNGs.

### Serverless host recommendation

RunPod `worker-comfyui` on an L4 24 GB pod is the cost/latency sweet spot
(~5–8 s for a 1024² SDXL RGBA at 30 steps; ~$0.0003/asset marginal). Modal
`@app.cls()` with warm-loaded weights is the premium tier if we want
sub-3 s cold-to-first-pixel. All three target hosts (RunPod, Replicate,
Modal) accept `workflow_json` verbatim, so the wiring above is portable.

## Decision

**Adopt, as the primary self-hosted native-RGBA path.** `ComfyUI-layerdiffuse`
is the only mature OSS implementation of LayerDiffuse for SD1.5 / SDXL, its
code is Apache-2.0, its weights are OpenRAIL-M (commercial-OK with a
propagating use-based restrictions list), its graph is a nine-node JSON we
can template and pin, and its hosting cost is trivial compared to Flux- or
Imagen-class alternatives. We integrate it behind a thin serverless wrapper
(RunPod `worker-comfyui`) as the execution half of `generate_transparent_asset`,
with `gpt-image-1.5` and Ideogram 3.0 as the hosted-API alternatives selected
by our capability router. Easy-Use's wrapper is rejected for the hosted path
(GPL contamination, lower determinism) but recommended in developer docs as
the easiest *local* Comfy UX. Flux and SD3/SD3.5 transparency wait on the
companion `RedAIGC/Flux-version-LayerDiffuse` pack and a separate legal read
of Flux's base-model license.
