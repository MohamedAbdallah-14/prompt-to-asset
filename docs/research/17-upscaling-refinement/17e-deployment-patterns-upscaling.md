---
category: 17-upscaling-refinement
angle: 17e
title: "Deploying upscalers & refiners in production: ONNX/CoreML/TensorRT, WebGPU, serverless GPU, and hybrid patterns"
subagent: 17e
date: 2026-04-19
tags:
  - deployment
  - onnx
  - coreml
  - tensorrt
  - webgpu
  - webnn
  - transformers.js
  - modal
  - replicate
  - runpod
  - comfyui
  - upscaling
  - cost-latency
status: draft
---

# Deploying upscalers & refiners in production

## Executive Summary

Shipping Real-ESRGAN, SwinIR, HAT, SUPIR, or an SDXL refiner inside a real product means picking a deployment substrate that balances **cold-start latency, per-image cost, device reach, and privacy**. No single substrate wins on all four axes, so production systems almost always end up **hybrid**: cheap, small assets run on the user's device (WebGPU / CoreML / desktop ncnn), and heavy assets — 4× SUPIR, SDXL refiner passes, 8K logo upscales — run on serverless GPU (Modal, Replicate, Runpod, Fal).

Three findings dominate the 2025–2026 landscape:

1. **WebGPU is viable for tiles, not for whole images.** `onnxruntime-web` with the WebGPU EP and `transformers.js v3` can run Swin2SR x2/x4 and Real-ESRGAN in the browser, but model-load times (10–16 s for Swin2SR on an M1 Max) and per-image runtimes (25 s+ on a 2020 MacBook Air) mean WebGPU is realistically for **thumbnails, preview refinement, and in-editor fixups**, not batch production.[^tjs-1407][^tjs-ex1]
2. **Cold start, not hourly rate, decides serverless economics.** Modal hits **sub-3-second cold starts** for ComfyUI workflows via CPU pre-hydration snapshots + `min_containers`. Replicate's generic cold start is 15–60 s on A10G and 20–90 s on A100. Runpod FlashBoot claims 48% of serverless starts under 200 ms.[^modal-3s][^markaicode-1][^introl]
3. **Hosted upscale is already a commodity at fractions of a cent.** `nightmareai/real-esrgan` on Replicate is **$0.0025/run on T4** (~400 runs/$1, ~12 s wall clock). For burst asset generation from a prompt-to-asset skill, that is cheaper than paying Modal's warm-pool idle time unless QPS is sustained.[^replicate-realesrgan]

The rest of this document maps these substrates onto a deployment matrix, a client-vs-server decision tree, a WebGPU reality check, and concrete patterns for a prompt-enhancement product that fans out many small asset requests per user session.

## Deployment Matrix

Comparing the realistic deployment substrates for a 4× upscaler / refiner in a production asset pipeline:

| Substrate | Runtime | Typical cold start | Typical wall-clock (1024→4096) | Per-image cost | Best for |
|---|---|---|---|---|---|
| **Browser WebGPU** (`onnxruntime-web`, `transformers.js`) | WebGPU compute shaders | Model download: 30–200 MB, 5–20 s on first visit | 10–60 s (Swin2SR x4) | $0 compute, user's device | Previews, in-editor fixups, privacy-first flows |
| **Browser WebNN** (Chrome 122+, Safari 18+ macOS) | CoreML / DirectML / OpenVINO under the hood | Similar to WebGPU first-load, then cached | 2–10× faster than WebGPU on supported ops | $0 compute | When the op set is covered and you can gate by browser |
| **Desktop (Upscayl / ComfyUI portable / Pinokio)** | ncnn+Vulkan or PyTorch+CUDA | Instant (already installed) | 1–10 s with a discrete GPU | $0 | Pro users, local-first, 8K/SUPIR runs |
| **iOS/macOS app (CoreML)** | CoreML w/ Neural Engine | <1 s after first convert | 0.3–2 s for 4× Real-ESRGAN on M-series | $0 | Native apps, on-device privacy, offline |
| **Serverless GPU — Replicate** | Docker + Cog | 15–90 s (A10G/A100) | 12–25 s for Real-ESRGAN | $0.0025–$0.029/run | Zero-ops prototyping, rare/spiky traffic |
| **Serverless GPU — Modal** | Python-first, custom containers | 2–15 s typical; **<3 s with snapshots** | 5–20 s for ESRGAN/SwinIR | ~$2.10/h A100, per-second billing | Production apps that need reliable p95 |
| **Serverless GPU — Runpod** | Docker, serverless endpoints | <200 ms (FlashBoot, 48% of starts); 3–6 s custom | 5–20 s | ~$1.89/h A100, lowest hourly | Steady-state, cost-sensitive workloads |
| **Dedicated GPU VM** | Anything you want | No cold start (always on) | 2–10 s | $1.5–$4/h fixed | Sustained 24/7 load, always-warm SLAs |

Notes on the numbers:

- Replicate pricing is taken directly from the two public Real-ESRGAN deployments: `nightmareai/real-esrgan` at **$0.0025/run on T4** and `replicategithubwc/real-esrgan` at **$0.029/run on A100 80GB**.[^replicate-realesrgan] The 10× difference is entirely GPU choice; for classic ESRGAN, T4 is enough.
- Modal's cold-start claim assumes you've used memory snapshots (their `@app.function(enable_memory_snapshot=True)` pattern) and you've forced initialization to happen with `torch.cuda.is_available()` patched to `False` so that GPU-binding work moves to the post-snapshot path.[^modal-3s]
- Runpod's sub-200 ms claim is specific to **FlashBoot** serverless and only holds for 48% of starts; the tail is more like 3–6 s for custom containers.[^introl]
- WebGPU wall-clock is from `web-realesrgan` (TF.js+WebGPU) reporting ~0.5× the speed of local CPU and from `transformers.js#1407` reporting 10–16 s model load alone for Swin2SR x4 on an M1 Max.[^tjs-1407][^webrealesrgan]

## Client-vs-Server Decision Tree

Use this as the default routing logic in a prompt-enhancement product that emits assets:

```
┌───────────────────────────────────────────────┐
│ Request enters: "upscale asset X to NxN, ..." │
└──────────────────────┬────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │ Target resolution ≤ 2K  │
          │ AND model ≤ 30MB ONNX   │
          │ AND user on Chrome/Edge │
          │   or Safari 18+ macOS   │
          └────────┬────────────────┘
               Yes │        │ No
                   ▼        ▼
        ┌───────────────┐   ┌──────────────────────────┐
        │ Run in browser│   │ Is the asset "heavy"?     │
        │ WebGPU /      │   │ (SUPIR, 4× of 2K+,        │
        │ WebNN         │   │  SDXL refiner, ≥8K)       │
        └───────────────┘   └─────────┬────────────────┘
             │                    Yes │        │ No
             │                        ▼        ▼
             │             ┌──────────────┐   ┌────────────────┐
             │             │ Modal warm   │   │ Replicate      │
             │             │ pool A100/   │   │ (nightmareai   │
             │             │ H100 +       │   │  real-esrgan)  │
             │             │ snapshots    │   │ T4 $0.0025/run │
             │             └──────┬───────┘   └────────┬───────┘
             │                    │                    │
             ▼                    ▼                    ▼
        Privacy, $0 cost,    Predictable p95,     Cheapest per run,
        user pays latency    $2-3/h warm idle     accepts 15-90s p95
```

Heuristics:

- **"Privacy beats speed"** — legal/compliance/consumer: prefer WebGPU/WebNN or a desktop binary even if slower.
- **"Latency SLA matters"** — interactive UI (<5 s p95 to the refined result): Modal with `min_containers=1` and snapshots; accept the warm-pool idle cost.
- **"Cost beats latency"** — batch/offline/async: Replicate `nightmareai/real-esrgan` or Runpod serverless with FlashBoot, and queue the result into a webhook.
- **"Edge-case users"** — Firefox without WebGPU, iOS Safari with WebNN disabled: always have a server fallback path and a feature detection step *before* downloading the 30–200 MB model weights.

## WebGPU Reality Check (2025–2026)

The story "run Real-ESRGAN in the browser" is true but nuanced. What actually works today, as of Chrome 131+/Safari 18/Edge 131:

**What works well:**

- **`transformers.js v3` + WebGPU** for Swin2SR x2/x4 image-to-image super-resolution. Usage is one line: `await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', { device: 'webgpu' })`.[^tjs-pr381]
- **`onnxruntime-web` with the WebGPU EP** for custom ONNX graphs, including community-exported Real-ESRGAN and SwinIR models. Microsoft's February 2024 post on ORT-Web + WebGPU is still the reference.[^ms-ortweb]
- **Tiled inference for large images.** `webnx-img` and `web-realesrgan` both slice images into chunks because browsers impose GPU buffer size and memory limits; you cannot ship a raw 4096×4096 tensor to WebGPU on most devices.[^webnx][^webrealesrgan]

**What does not work well:**

- **Model load is the dominant cost on cold visits.** Swin2SR x4 takes **10–16 seconds to load on an M1 Max** in the browser, vs ~1 s with an optimized ONNX version in Node. This is not GPU time — it's node-graph parsing overhead.[^tjs-1407]
- **WebGPU is often slower than local CPU on small models.** For Real-ESRGAN variants, `web-realesrgan` explicitly documents "WebGPU speed is approximately half the speed of local CPU execution", and FP16 gives no speedup over FP32 in WebGPU today.[^webrealesrgan]
- **CUDA is 6–14× faster than WebGPU** on the same graphs, per Microsoft's own benchmarks — so WebGPU is not a server replacement.[^ort-cudavsgpu]
- **Firefox still ships WebGPU behind a flag.** Production paths must feature-detect `navigator.gpu` and fall back to WASM or server.

**WebNN is the promising middle ground:**

- Chrome 122+ exposes WebNN with DirectML/CoreML backends; Safari 18+ on macOS supports CoreML Neural Engine via `MLComputeUnitsAll`. Ops for classic conv-based upscalers (Real-ESRGAN, SwinIR blocks) are largely covered.[^webnn-compat][^webnn-techcom]
- **DirectML was officially deprecated in May 2025**; Windows WebNN now routes through Windows ML / OpenVINO. Any shipping WebNN plan needs to target post-deprecation execution providers.[^webnn-compat]
- On iOS, CoreML backend is disabled by default in WebNN; the fallback is TFLite+XNNPACK, which is fine for small filters but not ideal for 4× SR.

**Practical rule for the prompt-to-asset product:**

Ship WebGPU/WebNN as a **preview tier** (thumbnail 512→1024, in-editor refinement), and keep the "Download production asset at 4096×4096" button routed to a serverless endpoint. The model load alone can exceed the server round-trip.

## Export pipeline: PyTorch → ONNX → {CoreML, TensorRT, ORT-Web}

For any of Real-ESRGAN, SwinIR, HAT, or an SDXL refiner, the canonical export path is PyTorch → ONNX, then ONNX → platform-specific format.

**ONNX export** (Real-ESRGAN PR #360 and SwinIR issue #145 agree on the pattern):[^realesrgan-pr360][^swinir-145]

```python
torch.onnx.export(
    model, dummy_img_lq, "real_esrgan_x4.onnx",
    export_params=True, opset_version=17, do_constant_folding=True,
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input":  {0: "b", 2: "h", 3: "w"},
                  "output": {0: "b", 2: "h", 3: "w"}},
)
```

Dynamic axes are critical: fixed-shape exports are painful because upscaler inputs are whatever the user uploaded. SwinIR specifically has known issues where dynamic-shape ONNX fails at inference time unless the model's forward pass is tolerant of variable H/W (see the `network_swinir.py` patches in the issue thread).[^swinir-145]

**From ONNX, typical paths:**

- **CoreML:** `coremltools.convert(onnx_model, ...)` for Apple Silicon / iOS. Works cleanly for Real-ESRGAN (conv-heavy). Transformer-heavy models like SwinIR sometimes need manual op shims.
- **TensorRT:** `trtexec --onnx=real_esrgan_x4.onnx --fp16 --saveEngine=real_esrgan_x4.engine`. Significant speedups for SwinIR/HAT variants — the AniSD upscale suite documents "significant speed uplifts" when using TRT over vanilla PyTorch.[^anisd]
- **ONNX Runtime Web:** keep the ONNX as-is, optionally quantize to int8 for WASM EP or leave FP16 for WebGPU EP. `onnxruntime-web` ships the WebGPU EP as a first-class backend since mid-2024.[^ms-ortweb]
- **ncnn + Vulkan:** conversion via `onnx2ncnn` → `.param` + `.bin`. This is the path that ships inside **Upscayl** (44k+ GitHub stars) for cross-platform desktop deployment; ncnn+Vulkan is what makes AGPL-licensed Real-ESRGAN work on Windows/macOS/Linux from a single binary drop.[^upscayl]

**Pretrained ONNX availability (save yourself the export):**

- SwinIR: `rocca/swin-ir-onnx` on Hugging Face has pre-exported variants.[^rocca-swinir]
- Real-ESRGAN: multiple community ONNX bundles (search `real-esrgan onnx` on HF); Xenova has transformers.js-ready conversions for Swin2SR.
- HAT (Holistic Attention Transformer): export scripts exist in the HAT repo but pretrained ONNX is thinner on the ground; most production HAT deployments export locally then cache to S3/R2.

## Serverless GPU patterns for burst asset generation

A prompt-to-asset turning a sentence into a full app-icon set can easily fan out to **10–40 generations per session** (logo + favicon + OG + splash + iOS/Android/web icons). That is a bursty workload: idle for minutes, then 40 requests over 30 seconds.

### Pattern A — Pure pay-per-run (Replicate-style)

Call `nightmareai/real-esrgan` for each asset. At **$0.0025/run**, 40 assets = **$0.10**. Cold start is 15–60 s on A10G, but after the first, the container stays warm for a few minutes and subsequent calls are ~12 s each.[^replicate-realesrgan]

Pros: zero ops, truly free when idle.  
Cons: p95 spikes on cold start are awful for interactive UX; no batch dispatch; queueing during traffic spikes can push wait times into minutes.

### Pattern B — Warm pool on Modal with snapshots (`min_containers=1`)

Modal's documented ComfyUI pattern:[^modal-scaling][^modal-3s]

```python
import modal

app = modal.App("upscaler")

image = (
    modal.Image.debian_slim()
    .pip_install("torch", "realesrgan", "basicsr")
    .run_function(preload_weights)
)

@app.cls(
    gpu="A10G",
    image=image,
    min_containers=1,  # warm pool
    enable_memory_snapshot=True,
    max_containers=10,
)
class Upscaler:
    @modal.enter()
    def load(self):
        self.model = load_real_esrgan()

    @modal.method()
    def upscale(self, img_bytes: bytes) -> bytes:
        return run(self.model, img_bytes)
```

With CPU pre-hydration (patch `torch.cuda.is_available` to `False` during snapshot creation, then un-patch after), cold starts drop to <3 s.[^modal-3s]

Cost: **1 A10G at ~$1.10/h ≈ $0.018/min idle** for warm pool. Worth it if sessions-per-day × generations > ~5,000 — below that, Pattern A is cheaper.

### Pattern C — Runpod FlashBoot + webhook

Runpod's serverless has the cheapest hourly rate (**$1.89/h A100**) and FlashBoot covers 48% of cold starts under 200 ms. Best for async flows where the user uploads and waits for a notification.[^introl]

### Pattern D — Hybrid client/server

The most interesting pattern for an asset-generation product:

1. Client immediately runs **WebGPU Swin2SR x2** for a 512→1024 **preview** while the server spins up.
2. Server (Modal warm pool) runs the **4× production render** in parallel.
3. UI swaps the preview for the HD asset once the server returns (typically 5–10 s later).

This gives <1 s "time to first pixel" on screen and <10 s "time to production asset." The client model can be quite small (int8-quantized Swin2SR x2 is ~15 MB); downloading 15 MB on a capable connection is 1–2 s, which is already the server cold start anyway.

### Pattern E — Local-first "bring your own GPU"

For pro users with a 3060+ GPU at home: ship a **Pinokio** installer or point at **ComfyUI portable**. Pinokio is a one-click cross-platform installer that manages Python venvs for a catalogue of AI apps; ComfyUI portable is a self-contained Windows zip with embedded Python and CUDA wheels.[^pinokio][^comfy-portable]

Tradeoff: 4–12 GB download, but zero per-generation cost, no privacy leak, and 2–5 s wall-clock upscales on consumer GPUs. **Upscayl** (ncnn+Vulkan) is the friendliest entry point — it works on Linux, macOS, and Windows from a single 200 MB bundle and is AGPL.[^upscayl]

## Cost/latency worked example

A product doing **10,000 asset upscales/day**, average 1024→2048 Real-ESRGAN x2:

| Pattern | Per-run cost | Daily cost | p50 latency | p95 latency |
|---|---|---|---|---|
| Replicate `nightmareai` T4 | $0.0025 | $25 | ~12 s warm | 30–60 s cold |
| Modal A10G, `min_containers=1`, snapshots | ~$26/day idle + ~$0.0003/s × 8 s × 10k = ~$50 | ~$76 | ~3 s | ~8 s |
| Runpod serverless A100 (FlashBoot) | ~$0.005/run | ~$50 | ~4 s | ~15 s |
| Dedicated A10G 24/7 | $1.10/h × 24 = $26 | $26 | ~2 s | ~5 s |
| Hybrid WebGPU preview + Modal for HD | $50 server + $0 client | $50 | **<1 s preview** / ~8 s HD | ~12 s HD |

At 10k/day, a **dedicated always-on A10G is the cheapest** if utilization is reasonably continuous, and **Modal with min_containers** wins on p95 for bursty traffic. Replicate is a great starting point but dominated on cost at scale.

## References

[^modal-scaling]: Modal Labs — *Scaling ComfyUI*. https://modal.com/blog/scaling-comfyui
[^modal-3s]: Tolga Oğuz — *How I Got ComfyUI Cold Starts Down to Under 3 Seconds on Modal*. https://tolgaoguz.dev/post/comfy-workflow-api-with-modal
[^markaicode-1]: *Serverless GPU Hosting: Modal vs. Replicate vs. RunPod for AI App Deployment*. https://markaicode.com/serverless-gpu-modal-vs-replicate/
[^introl]: *Serverless GPU Platforms: RunPod, Modal, and Beam Compared (2025)*. https://introl.com/blog/serverless-gpu-platforms-runpod-modal-beam-comparison-guide-2025
[^replicate-realesrgan]: Replicate — `nightmareai/real-esrgan` API reference. https://replicate.com/nightmareai/real-esrgan/api and `replicategithubwc/real-esrgan`. https://replicate.com/replicategithubwc/real-esrgan/api
[^tjs-pr381]: `huggingface/transformers.js` PR #381 — *Add image-to-image task w/ Swin2SR*. https://github.com/huggingface/transformers.js/pull/381
[^tjs-1407]: `huggingface/transformers.js` issue #1407 — *Expected time to load a super-resolution model locally*. https://github.com/huggingface/transformers.js/issues/1407
[^tjs-ex1]: `huggingface/transformers.js-examples` issue #1 — *Which image models does WebGPU speed up?*. https://github.com/huggingface/transformers.js-examples/issues/1
[^webrealesrgan]: `xororz/web-realesrgan` README — Real-ESRGAN/Real-CUGAN in the browser (TF.js + WebGPU/WebGL). https://github.com/xororz/web-realesrgan
[^webnx]: `briPXY/webnx-img` — onnxruntime-web + WebGPU image inference bundle. https://github.com/briPXY/webnx-img
[^ms-ortweb]: Microsoft Open Source Blog — *ONNX Runtime Web unleashes generative AI in the browser using WebGPU* (Feb 2024). https://opensource.microsoft.com/blog/2024/02/29/onnx-runtime-web-unleashes-generative-ai-in-the-browser-using-webgpu/
[^ort-cudavsgpu]: `microsoft/onnxruntime` discussion #20177 — *CUDA vs WebGPU performance 6x to 14x slower*. https://github.com/microsoft/onnxruntime/discussions/20177
[^realesrgan-pr360]: `xinntao/Real-ESRGAN` PR #360 — *Inference with ONNXRuntime + pytorch2onnx refactor*. https://github.com/xinntao/Real-ESRGAN/pull/360
[^swinir-145]: `JingyunLiang/SwinIR` issue #145 — *Dynamic shape inference with ONNX model*. https://github.com/JingyunLiang/SwinIR/issues/145
[^rocca-swinir]: `rocca/swin-ir-onnx` on Hugging Face. https://huggingface.co/rocca/swin-ir-onnx
[^anisd]: `Sirosky/Upscale-Hub` — *AniSD Release notes* (TensorRT speed-ups for SwinIR variants). https://github.com/Sirosky/Upscale-Hub/releases/tag/AniSD
[^upscayl]: `upscayl/upscayl` (44k+ stars) and `upscayl/upscayl-ncnn` (ncnn+Vulkan backend). https://github.com/upscayl/upscayl and https://github.com/upscayl/upscayl-ncnn
[^webnn-compat]: WebNN.io — *Browser Compatibility* (Chrome, Safari, Edge; DirectML deprecation May 2025). https://webnn.io/en/api-reference/browser-compatibility/api
[^webnn-techcom]: Microsoft Tech Community — *WebNN: Bringing AI Inference to the Browser*. https://techcommunity.microsoft.com/blog/aiplatformblog/webnn-bringing-ai-inference-to-the-browser/4175003
[^pinokio]: XDA Developers — *Pinokio makes installing ComfyUI a breeze*. https://xda-developers.com/pinokio-how-to
[^comfy-portable]: ComfyUI docs — *ComfyUI (portable) Windows*. http://docs.comfy.org/installation/comfyui_portable_windows
