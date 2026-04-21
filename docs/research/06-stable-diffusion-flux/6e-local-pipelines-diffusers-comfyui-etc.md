---
category: 06-stable-diffusion-flux
angle: 6e
angle_title: "Local inference pipelines for asset batches: Diffusers, ComfyUI, Fooocus, InvokeAI, A1111/Forge, SwarmUI"
last_updated: 2026-04-19
primary_sources:
  - "HuggingFace Diffusers — AutoPipelineForText2Image — https://huggingface.co/docs/diffusers/en/api/pipelines/auto_pipeline"
  - "HuggingFace Diffusers — StableDiffusionXLPipeline — https://huggingface.co/docs/diffusers/main/api/pipelines/stable_diffusion/stable_diffusion_xl"
  - "HuggingFace Diffusers — FluxPipeline — https://huggingface.co/docs/diffusers/main/api/pipelines/flux"
  - "HuggingFace Diffusers — Memory optimization guide — https://huggingface.co/docs/diffusers/optimization/memory"
  - "PyTorch Blog — torch.compile and Diffusers: A Hands-On Guide to Peak Performance — https://pytorch.org/blog/torch-compile-and-diffusers-a-hands-on-guide-to-peak-performance/"
  - "ComfyUI — Development / server comms routes — https://docs.comfy.org/development/comfyui-server/comms_routes"
  - "ComfyUI GitHub (Comfy-Org/ComfyUI) — https://github.com/comfyanonymous/ComfyUI"
  - "ComfyUI-Manager (ltdrdata) — https://github.com/ltdrdata/ComfyUI-Manager"
  - "rgthree-comfy — https://github.com/rgthree/rgthree-comfy"
  - "ComfyUI-Impact-Pack — https://github.com/ltdrdata/ComfyUI-Impact-Pack"
  - "was-node-suite-comfyui — https://github.com/WASasquatch/was-node-suite-comfyui"
  - "ComfyUI-GGUF (city96) — https://github.com/city96/ComfyUI-GGUF"
  - "lllyasviel/Fooocus — https://github.com/lllyasviel/Fooocus"
  - "mrhan1993/Fooocus-API — https://github.com/mrhan1993/Fooocus-API"
  - "invoke-ai/InvokeAI — https://github.com/invoke-ai/InvokeAI"
  - "InvokeAI — Workflows Design and Implementation — https://invoke-ai.github.io/InvokeAI/contributing/frontend/workflows/"
  - "CodeGandee/invokeai-py-client — https://github.com/CodeGandee/invokeai-py-client"
  - "AUTOMATIC1111/stable-diffusion-webui API wiki — https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API"
  - "lllyasviel/stable-diffusion-webui-forge — https://github.com/lllyasviel/stable-diffusion-webui-forge"
  - "mix1009/sdwebuiapi — https://github.com/mix1009/sdwebuiapi"
  - "mcmonkeyprojects/SwarmUI API docs — https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/API.md"
  - "RunPod — Deploy ComfyUI on Serverless — https://docs.runpod.io/tutorials/serverless/comfyui"
  - "RunPod — worker-comfyui image — https://github.com/runpod-workers/worker-comfyui"
  - "Black Forest Labs — FLUX.1 model card — https://huggingface.co/black-forest-labs/FLUX.1-dev"
  - "Apatero — ComfyUI Docker Setup for RunPod (2025) — https://apatero.com/blog/comfyui-docker-setup-that-just-works-runpod-template-2025"
  - "InsiderLLM — Flux Locally: Complete Guide — https://insiderllm.com/guides/flux-locally-complete-guide/"
---

# 6e — Local inference pipelines for asset batches

**Research value: high.** For a prompt-to-asset that wants to produce *production-grade* icons, logos, OG images, and illustration batches without hitting rate limits or per-image fees, the local-inference stack is strategically important. It is where SDXL, Flux.1 [dev]/[schnell], ControlNets, LoRAs, IP-Adapter, and custom samplers actually execute, and where "generate 64 variants of this icon on a transparent background" is a tractable operation rather than an API quota problem. This angle maps the six major local runtimes onto one consistent mental model so downstream agents can pick the right tool for a given asset task.

## Executive Summary

> **Updated 2026-04-21:** Several runtime status changes since this was drafted: (1) **AUTOMATIC1111 (A1111)** has been in maintenance-only mode since v1.10.1 (last release July 2024) — no new features, no Flux.2 support, 44+ unmerged PRs. Still functional for SD 1.5/SDXL workflows but not receiving active development. Most practitioners have migrated to ComfyUI or Forge. (2) **Fooocus** is in limited long-term support (LTS / bug-fixes only) — SDXL architecture only, no Flux or SD3.5. Developer recommends Forge or ComfyUI for newer models. (3) **ComfyUI** added native Flux.2 [dev] support at launch (Nov 2025) with FP8 optimizations (−40% VRAM, +40% throughput on RTX), and Flux.2 [klein] support (Jan 2026) via `FluxKVCache` nodes. ComfyUI now natively supports: SD1.x/2.x, SDXL, SD3/3.5, Flux (all variants), Flux.2 (all variants), Pixart, HunyuanDiT, Lumina 2.0, HiDream, Qwen Image. ComfyUI-Manager is now under Comfy-Org with a new V2 release supporting model downloads and automatic dependency resolution. (4) **diffusers** supports SD3.5 via `StableDiffusion3Pipeline` and Flux.2 [dev] — `AutoPipelineForText2Image` auto-selects the correct pipeline.

There are six dominant local inference surfaces for Stable Diffusion and Flux in 2025–2026, and they occupy three clearly different strategic niches:

1. **Low-level, programmatic (Diffusers).** The `diffusers` Python library (`StableDiffusionXLPipeline`, `FluxPipeline`, `AutoPipelineForText2Image`) is the canonical low-level API. It is the only option when you need: (a) tight control over the forward pass (custom samplers, attention processors, classifier-free guidance rewriting), (b) `torch.compile` / TensorRT for sub-second SDXL latency, (c) multi-GPU `accelerate` launches, or (d) direct integration inside a Python service with no HTTP indirection.<sup>[1][3][5]</sup>

2. **Graph-native servers (ComfyUI, InvokeAI, SwarmUI).** These are HTTP/WS servers that execute a typed node graph. **ComfyUI** is the de facto industry standard for complex pipelines (ControlNet + IP-Adapter + LoRA stacks + detail refiners) and has a fully documented JSON API (`POST /prompt`, `GET /history/{id}`, `WS /ws`).<sup>[6][7]</sup> **InvokeAI** offers a more structured workflow DB with `POST /api/v1/queue/default/enqueue_batch` and native combinatorial/zipped batch semantics.<sup>[16][17]</sup> **SwarmUI** (formerly StableSwarmUI) sits one level higher as a *backend orchestrator* — it can farm work out to multiple ComfyUI/A1111/Forge backends across machines, making it the only out-of-the-box choice for *distributed* batch generation.<sup>[21]</sup>

3. **Opinionated / simplified (Fooocus, A1111/Forge).** **Fooocus** is a single-screen, non-technical UX; it has no native API but a community FastAPI wrapper (`Fooocus-API`) exists.<sup>[14][15]</sup> **A1111** is the original webui; its `/sdapi/v1/txt2img` endpoint is the most widely documented programmatic SD interface.<sup>[18][20]</sup> **Forge** is lllyasviel's performance-oriented A1111 fork that added native Flux + GGUF + BitsandBytes NF4 quantization; it preserves the A1111 API so `sdwebuiapi` clients keep working while unlocking 8–12 GB VRAM Flux inference.<sup>[19]</sup>

For the prompt-to-asset specifically, the recommended stack is:
- **Default runtime for the product:** ComfyUI behind `POST /prompt` — gives access to every asset-critical node (transparency via `LayerDiffuse`, rembg, Flux Fill, IP-Adapter, ControlNet) without code changes.
- **When you need 64 variants in parallel on one box:** `FluxPipeline` with `torch.compile` + `enable_model_cpu_offload`, driven by an `asyncio.Queue`.
- **When you need 64 variants on 8 boxes:** SwarmUI in front of N ComfyUI workers (or `runpod/worker-comfyui` serverless endpoints).

The rest of this document gives the API surface of each runtime, concrete batch recipes, and VRAM budgets so a downstream skill or MCP tool can pick correctly.

## Pipeline Comparison Table

| Runtime | Primary surface | Transport | Flux support | ControlNet / IP-Adapter | Best for | Worst for |
|---|---|---|---|---|---|---|
| **Diffusers (Py)** | `FluxPipeline`, `StableDiffusionXLPipeline`, `AutoPipelineForText2Image` | In-process Python | First-class (`black-forest-labs/FLUX.1-dev`, `-schnell`, `-fill-dev`) | Via `FluxControlNetPipeline`, `FluxPriorReduxPipeline`, community pipelines | Programmatic batches, fine-grained control, service embedding | Interactive exploration, non-Python callers |
| **ComfyUI** | Node-graph JSON | HTTP `/prompt` + WS `/ws` | First-class (native + GGUF via `ComfyUI-GGUF`) | Yes, via Comfy-Manager ecosystem | Complex asset pipelines, custom nodes, ControlNet+LoRA stacks | Non-technical users; graphs can become unmaintainable |
| **SwarmUI** | HTTP/WS JSON (`/API/<route>`) | HTTP + WS | Yes (uses ComfyUI backend under the hood) | Inherits from backend | Distributed / multi-GPU / multi-box orchestration | Lightweight single-user workflows |
| **InvokeAI** | HTTP JSON (`/api/v1/...`) + WebSocket | HTTP + WS | Yes (since Invoke 5) | Yes (first-party) | Reproducible team workflows, combinatorial batches, Unified Canvas inpainting | Cutting-edge nodes the Invoke team hasn't wrapped yet |
| **A1111 webui** | HTTP JSON (`/sdapi/v1/...`) | HTTP + Gradio | Limited (SD 1.5 / SDXL focused) | Yes via extension | SD 1.5 / SDXL legacy workflows; large extension ecosystem | Flux; high-throughput APIs (Gradio bottleneck); **maintenance-only since v1.10.1 (Jul 2024), no active development** |
| **Forge** | Same as A1111 (`/sdapi/v1/...`) | HTTP + Gradio | **Yes** — native Flux + BNB NF4 + GGUF | Yes (+ `sd-forge-fluxtools-v2` for Flux CN) | Running Flux on 8–12 GB VRAM with an A1111-style API | Research-grade node-level control |
| **Fooocus** | Gradio UI only (native) | HTTP via third-party `Fooocus-API` | SDXL-only (no Flux, no SD3.5); **LTS/bug-fixes only** | Via prompt style presets rather than explicit CN | One-click "looks good" SDXL generation for non-technical users | Any programmatic integration without the FastAPI wrapper; newer models |

Notes on the matrix:
- **ControlNet / IP-Adapter**: ComfyUI has the widest coverage of new adapters (Flux ControlNet, Flux Fill, Flux Redux, IP-Adapter-Plus, InstantID) typically within days of release, because custom nodes are independently authored and don't need to wait for a UI team.<sup>[9][12][22]</sup>
- **Transparency**: ComfyUI has the best transparent-PNG story via LayerDiffuse and `ComfyUI-Impact-Pack`'s mask detailers plus `ComfyUI-rembg` / BRIA RMBG nodes. Diffusers exposes the same via community pipelines but with more setup. A1111/Forge require the `stable-diffusion-webui-rembg` extension. See 6d and 13 for the transparent-background deep-dive.

## Headless API Reference

### 1. HuggingFace Diffusers

`diffusers` exposes three levels of API that matter for batch asset generation:

```python
from diffusers import AutoPipelineForText2Image, FluxPipeline, StableDiffusionXLPipeline
import torch

pipe = AutoPipelineForText2Image.from_pretrained(
    "black-forest-labs/FLUX.1-dev",
    torch_dtype=torch.bfloat16,
).to("cuda")
```

`AutoPipelineForText2Image.from_pretrained` reads the checkpoint's `model_index.json` and returns the correct concrete pipeline class (`FluxPipeline`, `StableDiffusionXLPipeline`, `StableDiffusion3Pipeline`, etc.), so downstream code stays model-agnostic.<sup>[1]</sup>

> **Updated 2026-04-21:** **SD 3.5** (Medium and Large) is fully supported in diffusers via `StableDiffusion3Pipeline` — same pipeline class as SD3, with architecture differences handled internally. SD3.5 ControlNets (Blur, Canny, Depth) are available via `StableDiffusion3ControlNetPipeline`. **Flux.2 [dev]** support landed in diffusers at launch. The `AutoPipelineForText2Image` route handles all of these automatically. Note: SD3.5 model weights are gated on HuggingFace and require accepting the Stability AI Community License before use.

Canonical batch call (SDXL):

```python
images = pipe(
    prompt=["minimal logo for note-taking app, flat vector"] * 8,
    negative_prompt=["text, watermark, 3d, photorealistic"] * 8,
    num_inference_steps=30,
    guidance_scale=6.5,
    width=1024,
    height=1024,
    num_images_per_prompt=1,
    generator=[torch.Generator("cuda").manual_seed(s) for s in range(8)],
).images
```

For Flux, `FluxPipeline` replaces `guidance_scale` semantics with `guidance_scale` on `FLUX.1-dev` (≈3.5) and no CFG on `FLUX.1-schnell` (4-step distillation). `max_sequence_length=512` unlocks the long-prompt T5 encoder.<sup>[3]</sup>

**Memory knobs** (ordered cheapest → most aggressive):
1. `pipe.enable_vae_slicing()` / `pipe.enable_vae_tiling()` — slice VAE decode (negligible speed hit).
2. `pipe.enable_model_cpu_offload()` — offloads each submodule to CPU when not active. Saves ~6–8 GB VRAM; known RAM-leak issue under consecutive calls (tracked in `huggingface/diffusers#7970`) — release the pipeline between long runs.<sup>[4]</sup>
3. `pipe.enable_sequential_cpu_offload()` — per-module offload, even lower VRAM, significantly slower.
4. `bnb.nn.Linear8bitLt` / `bitsandbytes` 4-bit or 8-bit quantization via `BitsAndBytesConfig` for the transformer; recommended for 12 GB Flux.
5. `torch.compile(pipe.transformer, fullgraph=True)` or `pipe.transformer.compile_repeated_blocks(fullgraph=True)` (regional compilation) for ~1.5–2× throughput on Ampere/Ada.<sup>[2]</sup>

### 2. ComfyUI

ComfyUI is a Python HTTP server; the visual editor is just one client.<sup>[6][7]</sup> Key endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/prompt` | POST | Submit an API-format workflow JSON; returns `{prompt_id, number, node_errors}` |
| `/history/{prompt_id}` | GET | Get outputs and per-node metadata once completed |
| `/view?filename=&subfolder=&type=` | GET | Download a generated image/mask |
| `/queue` | GET / DELETE / POST | Inspect queue, cancel running, clear queue |
| `/interrupt` | POST | Cancel current execution |
| `/object_info` | GET | Full node registry (inputs/outputs/types) — essential for programmatically *building* workflows |
| `/system_stats` | GET | CUDA device, free VRAM, Python/torch versions |
| `/ws?clientId=<id>` | WS | Streaming progress (`executing`, `progress`, `executed`, `execution_cached`) |

The "API format" workflow JSON is **not** the same as the UI-saved workflow. From the ComfyUI UI, enable "dev mode" and use *Save (API Format)*. Each node becomes a dict like:

```json
{
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {"text": "app icon, flat, minimal", "clip": ["4", 1]}
  },
  "3": {
    "class_type": "KSampler",
    "inputs": {"seed": 42, "steps": 30, "cfg": 7.0,
               "sampler_name": "dpmpp_2m", "scheduler": "karras",
               "denoise": 1.0, "model": ["4", 0],
               "positive": ["6", 0], "negative": ["7", 0],
               "latent_image": ["5", 0]}
  }
}
```

Links reference upstream nodes as `[node_id, output_index]`. This makes workflows trivial to parameterize: load a template JSON, swap `inputs.text` / `inputs.seed` / `inputs.filename_prefix`, POST to `/prompt`.

**Must-have custom nodes for asset work** (installable via ComfyUI-Manager):
- **ComfyUI-Manager** (10k+ stars, v3.33+) — node install/update, Comfy Registry support, now uses `uv`.<sup>[8]</sup>
- **rgthree-comfy** — 42 utility nodes: Fast Groups Muter/Bypasser, Context switches, Power Lora Loader. Transforms large graphs into maintainable ones.<sup>[9]</sup>
- **ComfyUI-Impact-Pack** — SAM-based detailers, iterative upscaling, Regional Prompter; critical for fixing small-icon detail and hands/eyes.<sup>[10]</sup>
- **was-node-suite-comfyui** — 200+ utility nodes for image math, masking, text rendering, logic.<sup>[11]</sup>
- **ComfyUI-GGUF** (city96) — loads Flux/SDXL GGUF quantizations for 8–12 GB cards.<sup>[12]</sup>
- **ComfyUI-IPAdapter-plus**, **ComfyUI-ControlNet-Aux** — adapter + preprocessor ecosystem.
- **ComfyUI-LayerDiffuse** — native transparent-PNG generation (see category 13).

### 3. SwarmUI

SwarmUI (mcmonkeyprojects, formerly Stability-AI/StableSwarmUI) is a C# server that speaks JSON to a pool of backends (ComfyUI, Auto1111, Forge, remote Swarm instances). All calls are `POST /API/<RouteName>` with a JSON body, and the first call is `GetNewSession` to mint a `session_id` that all subsequent routes require.<sup>[21]</sup>

Relevant route categories:
- **T2IAPI** — `GenerateText2Image`, `GenerateText2ImageWS` (streams progress + preview images), grid generation.
- **BackendAPI** — add/delete/toggle/restart backends; query loaded models; free VRAM.
- **ModelsAPI** — list, select, and download models/LoRAs across all backends.
- **AdminAPI** — permissions, users, settings.

The critical strategic feature is that `GenerateText2ImageWS` fans out to the configured backend pool, so launching 64 images against 8 ComfyUI backends is automatic. This is the *only* open-source system that does this cleanly.

### 4. InvokeAI

InvokeAI's backend is a FastAPI app. The workflow-execution path is:

1. Create or load a workflow (nodes/edges with typed fields) — JSON is portable and versioned.<sup>[13]</sup>
2. Build a **graph** (materialized execution DAG) from the workflow.
3. `POST /api/v1/queue/default/enqueue_batch` with the graph. The batch body supports two data-expansion semantics:
   - **Zipped** — parallel arrays of inputs, same index per run.
   - **Combinatorial** — cartesian product of inputs → natively useful for "same prompt × 8 seeds × 3 aspect ratios".<sup>[16]</sup>
4. Subscribe to the WebSocket channel for `queue_item_status_changed`, `invocation_progress`, and `invocation_complete` events.<sup>[16]</sup>

A recent addition (April 2025) is `published_workflow_id`, which lets you enqueue a stored workflow by ID without re-uploading the full graph.<sup>[13]</sup> There is no first-party Python SDK, but `CodeGandee/invokeai-py-client` wraps the HTTP surface and exposes workflow JSON export + parameterized enqueue.<sup>[23]</sup>

### 5. AUTOMATIC1111 and Forge

A1111 and Forge share the same `/sdapi/v1/*` surface (Forge preserves compatibility). Launch with `--api`, then:

```python
import requests, base64
payload = {
    "prompt": "minimal line-art icon of a notebook, flat, on solid white",
    "negative_prompt": "3d, photographic, watermark, text, jpeg artifacts",
    "steps": 28,
    "cfg_scale": 6.5,
    "width": 1024, "height": 1024,
    "sampler_name": "DPM++ 2M",
    "batch_size": 4,
    "n_iter": 2,
    "seed": -1,
    "override_settings": {
        "sd_model_checkpoint": "fluxDev_fp8.safetensors",
        "CLIP_stop_at_last_layers": 2
    }
}
r = requests.post("http://127.0.0.1:7860/sdapi/v1/txt2img", json=payload).json()
for i, b64 in enumerate(r["images"]):
    open(f"out_{i}.png", "wb").write(base64.b64decode(b64))
```

Key points:<sup>[18][19][20]</sup>
- `batch_size` × `n_iter` = total images; `batch_size` is parallel on one forward pass (VRAM-bound), `n_iter` is sequential.
- `override_settings` lets you swap the checkpoint, CLIP skip, VAE, etc. without changing the server's global settings.
- Forge adds `forge_additional_modules` (the T5 + CLIP + VAE files for Flux) and `sd_checkpoint_model` for the DiT.
- Interactive OpenAPI docs at `/docs`.
- The `mix1009/sdwebuiapi` Python client wraps `/sdapi/v1/*` and handles the awkward base64/PIL round-trip.<sup>[20]</sup>
- Forge adds native **BNB NF4** + **GGUF** (Q8_0/Q5_0/Q5_1/Q4_0/Q4_1) for Flux and exposes a GPU weight slider + async swap — this is the single most VRAM-efficient way to serve Flux behind an A1111-shaped API.<sup>[19]</sup>

### 6. Fooocus (via Fooocus-API)

Native Fooocus is Gradio-only with no documented REST surface. The community wrapper `mrhan1993/Fooocus-API` (660 stars, active) re-exposes Fooocus behind FastAPI at `POST /v1/generation/text-to-image` and `/v2/...` variants, with X-API-KEY auth, streaming, and persistent history.<sup>[14][15]</sup> Use this when you want Fooocus's opinionated prompt-expansion and SDXL default style presets ("Fooocus V2", "Cinematic", "Photograph") without building the graph yourself.

## Batch-Generation Recipes

### Recipe A — 64 icon variants on one GPU (Diffusers + SDXL)

```python
import asyncio, itertools, torch
from diffusers import AutoPipelineForText2Image

pipe = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16, variant="fp16",
).to("cuda")
pipe.enable_vae_tiling()
pipe.unet = torch.compile(pipe.unet, mode="reduce-overhead", fullgraph=True)

BASE = "minimal flat vector icon of {subject}, on solid white, centered"
subjects = ["notebook", "pen", "folder", "tag", "clock", "search", "user", "settings"]
seeds = range(8)
jobs = list(itertools.product(subjects, seeds))

BATCH = 4  # 4 × 1024² on a 24 GB card
for i in range(0, len(jobs), BATCH):
    chunk = jobs[i:i+BATCH]
    images = pipe(
        prompt=[BASE.format(subject=s) for s, _ in chunk],
        num_inference_steps=30, guidance_scale=6.5,
        generator=[torch.Generator("cuda").manual_seed(sd) for _, sd in chunk],
    ).images
    for (subj, sd), img in zip(chunk, images):
        img.save(f"icons/{subj}-{sd}.png")
```

This pattern generalizes: `itertools.product` over any axes (subject × seed × style × aspect) feeds a fixed-`BATCH` inner loop. `torch.compile` pays back after ~2–3 batches.<sup>[2]</sup>

### Recipe B — Parametric ComfyUI template for asset pipelines

```python
import json, urllib.request, uuid, websocket

CLIENT_ID = str(uuid.uuid4())
ws = websocket.WebSocket()
ws.connect(f"ws://127.0.0.1:8188/ws?clientId={CLIENT_ID}")
template = json.load(open("workflows/icon_sdxl_rembg.json"))

def render(prompt: str, seed: int, out_prefix: str) -> bytes:
    wf = json.loads(json.dumps(template))
    wf["6"]["inputs"]["text"] = prompt
    wf["3"]["inputs"]["seed"] = seed
    wf["9"]["inputs"]["filename_prefix"] = out_prefix
    data = json.dumps({"prompt": wf, "client_id": CLIENT_ID}).encode()
    req = urllib.request.Request("http://127.0.0.1:8188/prompt", data=data,
                                 headers={"Content-Type": "application/json"})
    prompt_id = json.loads(urllib.request.urlopen(req).read())["prompt_id"]
    while True:
        msg = json.loads(ws.recv())
        if msg.get("type") == "executing" and msg["data"]["node"] is None \
           and msg["data"]["prompt_id"] == prompt_id:
            break
    hist = json.loads(urllib.request.urlopen(
        f"http://127.0.0.1:8188/history/{prompt_id}").read())[prompt_id]
    out = hist["outputs"]["9"]["images"][0]
    return urllib.request.urlopen(
        f"http://127.0.0.1:8188/view?filename={out['filename']}"
        f"&subfolder={out['subfolder']}&type={out['type']}").read()
```

Workflow `icon_sdxl_rembg.json` should contain `CheckpointLoaderSimple → CLIPTextEncode×2 → EmptyLatentImage → KSampler → VAEDecode → RemBG → SaveImage` nodes. To parallelize, run N processes each with its own `client_id` and ComfyUI will execute prompts concurrently up to backend capacity.<sup>[6][7]</sup>

### Recipe C — Combinatorial batch via InvokeAI

```python
body = {
  "prepend": False,
  "batch": {
    "graph": GRAPH_JSON,
    "runs": 1,
    "data": [[
      {"node_path": "text_to_image.positive_prompt",
       "field_name": "value",
       "items": ["logo for note app", "icon for note app", "emblem for note app"]},
      {"node_path": "text_to_image.seed",
       "field_name": "value",
       "items": [1, 2, 3, 4, 5, 6, 7, 8]}
    ]]
  }
}
# POST /api/v1/queue/default/enqueue_batch → 3 × 8 = 24 queue items
```

The nested `data[[...]]` with multiple collection dicts yields cartesian expansion; wrap the collections in a single outer list of multiple lists to get zipped semantics instead.<sup>[16]</sup>

### Recipe D — Distributed batch with SwarmUI

Point SwarmUI at N ComfyUI backends (local GPUs + remote machines via `ComfyUI API Backend`). Then:

```python
requests.post(f"{SWARM}/API/GenerateText2Image", json={
    "session_id": SID,
    "prompt": "hero illustration of collaborative workspace",
    "negatieprompt": "",
    "images": 64, "seed": -1,
    "model": "flux/flux1-dev-fp8.safetensors",
    "width": 1216, "height": 832, "steps": 25, "cfgscale": 3.5
})
```

SwarmUI fans the 64-image request across available backends, then returns a single consolidated result set.<sup>[21]</sup>

## Deployment Notes

### VRAM profile (Flux.1-dev as reference)

| Precision | VRAM @ 1024² | Quality vs FP16 | Notes |
|---|---|---|---|
| FP16 / BF16 | ~24 GB (inc. T5) | 100% | Requires 24 GB card (RTX 4090, 3090, A5000) |
| FP8 | ~13 GB | 98–99% | Good 16 GB sweet spot (RTX 4080) |
| GGUF Q8_0 | ~12 GB | ~97% | Forge/ComfyUI-GGUF |
| GGUF Q5_K_M | ~10 GB | ~95% | 12 GB cards comfortable |
| GGUF Q4_K_S | ~8 GB | ~90–93% | Practical floor; ~60–90 s/image on a 3060 12 GB |
| NF4 (BNB) | ~8–9 GB | ~92% | Forge native |

Source: InsiderLLM Flux local guide, GenAI Content FLUX.2-dev-GGUF guide, and ComfyUI-GGUF model cards.<sup>[25][12]</sup> SDXL is ~8 GB FP16 / 6 GB FP8; SD 1.5 is ~4 GB FP16. For every runtime, the **T5-XXL encoder for Flux** (4.9 GB FP8) is billed separately from the DiT weights — low-VRAM setups must count both.

> **Updated 2026-04-21:** **Flux.2 [dev] (32B)** requires approximately 80 GB VRAM at BF16; NVIDIA's FP8 optimizations (released with Flux.2 in Nov 2025) reduce this by ~40%, to roughly 48 GB — still requiring A100/H100-class hardware for local inference. **Flux.2 [klein] 4B** requires ~13 GB VRAM (RTX 3090/4070 class), and **Flux.2 [klein] 9B** requires ~29 GB VRAM (RTX 4090 class). Klein models are step-distilled to 4 steps and generate images in under 1 second on modern consumer hardware, making them the practical local inference choice for Flux.2-quality output. **SD 3.5 Large** (8B params) requires ~16 GB VRAM at FP16 for inference; SD 3.5 Medium (2.6B) fits in ~10 GB VRAM, making it a viable consumer-GPU alternative to SDXL with better prompt adherence.

### Docker / cloud

- **RunPod serverless (`runpod/worker-comfyui`)** — official worker images in four flavors: `base`, `flux1-schnell`, `flux1-dev`, `sdxl`, `sd3`. Accepts ComfyUI API-format workflow JSON; returns base64 or S3-uploaded images. Scale-to-zero, ~2–3 min cold start.<sup>[24]</sup>
- **Apatero 2025 RunPod template** bundles 45+ pre-installed nodes (Impact Pack, WAS, ControlNet-Aux, IPAdapter-Plus, InstantID, Ultimate SD Upscale, AnimateDiff) for ~98% workflow coverage with ~2–3 min setup; recommends 20 GB container + 100 GB network volume for models.<sup>[22]</sup>
- **ComfyDeploy / Modal / Replicate** — commercial hosts built around the same ComfyUI API-format workflow; useful when you want versioned workflows-as-code with autoscaling.
- **SwarmUI self-hosted** — best choice when you own the GPUs and want to present a unified API on top of them; set up each GPU as a separate ComfyUI backend and register them in SwarmUI's Backend tab.

### Picking for the prompt-to-asset

- **Transparent icons / logos (per-image, fast iteration):** ComfyUI with a LayerDiffuse or rembg-terminated workflow template → `POST /prompt`.
- **64+ asset batches (single machine):** Diffusers `FluxPipeline` / `StableDiffusionXLPipeline` with `torch.compile` + `num_images_per_prompt` or explicit `asyncio` pool.
- **Brand-consistent asset sets:** ComfyUI + IPAdapter-Plus (style ref) + LoRA (brand token); parametrize via Recipe B.
- **Multi-box / team workloads:** SwarmUI fronting N ComfyUI backends, or RunPod `worker-comfyui` serverless endpoints per workflow.
- **Non-technical operator UI:** InvokeAI (Linear mode) or Fooocus behind the `Fooocus-API` wrapper.
- **Must support Flux on 8–12 GB GPU:** Forge (NF4/GGUF) or ComfyUI with `ComfyUI-GGUF` — Diffusers with bnb-4bit is a viable third option.

## References

1. HuggingFace Diffusers — AutoPipelineForText2Image. https://huggingface.co/docs/diffusers/en/api/pipelines/auto_pipeline
2. PyTorch Blog — *torch.compile and Diffusers: A Hands-On Guide to Peak Performance*. https://pytorch.org/blog/torch-compile-and-diffusers-a-hands-on-guide-to-peak-performance/
3. HuggingFace Diffusers — FluxPipeline. https://huggingface.co/docs/diffusers/main/api/pipelines/flux
4. HuggingFace Diffusers issue #7970 — `enable_model_cpu_offload` RAM growth. https://github.com/huggingface/diffusers/issues/7970
5. HuggingFace Diffusers — StableDiffusionXLPipeline. https://huggingface.co/docs/diffusers/main/api/pipelines/stable_diffusion/stable_diffusion_xl
6. ComfyUI docs — Development / server comms routes. https://docs.comfy.org/development/comfyui-server/comms_routes
7. ComfyICU docs — Run ComfyUI with an API. https://comfy.icu/docs/api
8. ComfyUI-Manager (ltdrdata). https://github.com/ltdrdata/ComfyUI-Manager
9. rgthree-comfy. https://github.com/rgthree/rgthree-comfy
10. ComfyUI-Impact-Pack. https://github.com/ltdrdata/ComfyUI-Impact-Pack
11. was-node-suite-comfyui. https://github.com/WASasquatch/was-node-suite-comfyui
12. ComfyUI-GGUF (city96). https://github.com/city96/ComfyUI-GGUF
13. InvokeAI — Workflows Design and Implementation. https://invoke-ai.github.io/InvokeAI/contributing/frontend/workflows/
14. mrhan1993/Fooocus-API. https://github.com/mrhan1993/Fooocus-API
15. mrhan1993/FooocusAPI (refactored). https://github.com/mrhan1993/FooocusAPI
16. InvokeAI issue #8340 — "Description about executing workflow" (documents `enqueue_batch`). https://github.com/invoke-ai/InvokeAI/issues/8340
17. InvokeAI PR #7876 — Workflow publish follow-ups (`published_workflow_id`). https://github.com/invoke-ai/InvokeAI/pull/7876
18. AUTOMATIC1111/stable-diffusion-webui — API wiki. https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
19. lllyasviel/stable-diffusion-webui-forge — README (Flux NF4/GGUF). https://github.com/lllyasviel/stable-diffusion-webui-forge
20. mix1009/sdwebuiapi — Python client for A1111/Forge. https://github.com/mix1009/sdwebuiapi
21. mcmonkeyprojects/SwarmUI — API docs. https://github.com/mcmonkeyprojects/SwarmUI/blob/master/docs/API.md
22. Apatero — ComfyUI Docker Setup That Just Works (RunPod, 2025). https://apatero.com/blog/comfyui-docker-setup-that-just-works-runpod-template-2025
23. CodeGandee/invokeai-py-client — Python client for InvokeAI. https://github.com/CodeGandee/invokeai-py-client
24. RunPod — Deploy ComfyUI on Serverless. https://docs.runpod.io/tutorials/serverless/comfyui
25. InsiderLLM — Flux Locally: Complete Guide to Running Flux on Your Own GPU. https://insiderllm.com/guides/flux-locally-complete-guide/
