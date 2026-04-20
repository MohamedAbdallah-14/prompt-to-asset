---
wave: 1
role: niche-discovery
slug: 18-serverless-comfyui-patterns
title: "Serverless ComfyUI — production orchestration patterns"
date: 2026-04-19
sources:
  - https://github.com/runpod-workers/worker-comfyui
  - https://github.com/runpod-workers/worker-comfyui/blob/main/handler.py
  - https://github.com/runpod-workers/worker-comfyui/blob/main/docs/configuration.md
  - https://www.runpod.io/blog/deploy-comfyui-as-a-serverless-api-endpoint
  - https://docs.runpod.io/serverless
  - https://www.runpod.io/pricing-page
  - https://apatero.com/blog/runpod-serverless-deployment-complete-guide-2025
  - https://modal.com/blog/scaling-comfyui
  - https://modal.com/blog/comfyui-mem-snapshots
  - https://modal.com/blog/openart-case-study
  - https://modal.com/docs/examples/comfyapp
  - https://modal.com/docs/guide/cold-start
  - https://modal.com/pricing
  - https://github.com/replicate/cog-comfyui
  - https://replicate.com/comfyui/any-comfyui-workflow
  - https://replicate.com/comfyui/any-comfyui-workflow-a100
  - https://fal.ai/docs/serverless/tutorials/deploy-comfyui-server
  - https://github.com/badayvedat/ComfyUI-fal-Connector
  - https://comfy.icu/docs/api
  - https://comfy.icu/pricing
  - https://comfy.icu/docs/faq
  - https://github.com/comfy-deploy/comfydeploy
  - https://docs.comfydeploy.com/docs/machines/on-premise-setup
  - https://github.com/bentoml/comfy-pack
  - https://www.bentoml.com/blog/comfy-pack-serving-comfyui-workflows-as-apis
  - https://docs.bentoml.com/en/latest/bentocloud/how-tos/scale-with-bentocloud/deployment/get-started/examples/comfyui.html
  - https://baseten.co/blog/deploying-custom-comfyui-workflows-as-apis
  - https://docs.baseten.co/examples/comfyui
  - https://github.com/basetenlabs/truss-examples/tree/main/comfyui-truss
  - https://baseten.co/blog/pinning-ml-model-revisions-for-compatibility-and-security
  - https://docs.salad.com/products/recipes/comfyui
  - https://salad.com/pricing
  - https://github.com/inferless/ComfyUI
  - https://www.inferless.com/pricing
  - https://www.viewcomfy.com/blog/best_comfyui_hosting_platforms
  - https://stackcompare.net/replicate-vs-runpod-gpu-cloud-for-ai-compared-2026/
tags: [comfyui, serverless, runpod, modal, replicate, fal, comfydeploy, baseten, bentoml, salad, inferless, comfyicu]
---

# Serverless ComfyUI — production orchestration patterns

## Scope

Angle 20d in `../20-open-source-repos-landscape/20d-comfyui-workflow-ecosystem.md` treats the serverless layer at ~2 pages (RunPod, Modal, Replicate, ComfyDeploy, ComfyICU). This deep dive goes one level lower: it normalizes **eleven** production paths — those five plus **Baseten (Truss)**, **BentoML (`comfy-pack` + BentoCloud)**, **fal.ai**, **Salad**, **Inferless**, and the **open-source ComfyDeploy** self-host — against a single matrix of the ten dimensions a prompt-to-asset backend actually designs against: cold-start, warm-pool, GPU tiers, pricing (incl. spot), WS/progress forwarding, S3 output, workflow-version pinning, custom-node install, UI-vs-API JSON, auth, SLA. The finding up front: no single platform dominates — the right answer is a **layered deployment** (primary per-tenant plane + spillover + managed escape hatch).

## The eleven paths

### 1. RunPod — `runpod-workers/worker-comfyui`

The reference OSS worker. `/run` (async) / `/runsync`; input is API-format JSON at `input.workflow`. `handler.py` connects to the in-container ComfyUI `/ws` and converts `progress` events into `runpod.serverless.progress_update()` — **WS progress is first-class**. S3 is native via `BUCKET_ENDPOINT_URL` + AWS keys; unset ⇒ base64. **Cold start:** FlashBoot advertises <200 ms on ~48 % of requests and <12 s worst case; SDXL+LoRA images land 8–15 s, FP8 Flux ~20–30 s. **Warm pool:** Active Workers (always-on, ~30 % discount) vs Flex (scale-to-zero). **GPUs:** RTX 4090 / L40S / A100-80 / H100 / H200 (Flex: RTX 4090 ~$0.40/hr-equiv, L40S ~$0.69, A100 ~$0.98, H100 ~$1.50). **Pinning:** your Dockerfile — pin ComfyUI commit + Manager commit + `comfy-cli node install <name>@<sha>`. **Custom nodes:** at build time. **JSON:** API format only. **Auth:** RunPod key. **SLA:** Enterprise only.

### 2. Modal — `@app.cls()` + `@modal.enter(snap=True)`

Cleanest engineering story of the set. `modal.Image` `pip install`s ComfyUI+nodes+weights; `@modal.enter()` warm-loads checkpoints; `@modal.enter(snap=True)` memory-snapshots the Python+Torch+ComfyUI state so **90 % of cold starts land under 3 s** (vs 10–15 s un-snapped; the `import torch` is the dominant cost). Warm pool via `min_containers=N`; OpenArt's case study stabilizes at ~4 s median end-to-end. Three concurrency modes: one-container-per-input (10× A10G ≈ $0.18/min, ~4.4 s median), `@modal.concurrent` (cheap ~$0.02/min but ~32 s median — ComfyUI is single-threaded per process), and warm-pool hybrid. **GPUs:** T4/L4/A10G/L40S/A100-40/A100-80/H100/H200/B200 at H100 ~$3.95/hr, A100-80 ~$2.50, L40S ~$1.95. Progress: return `AsyncGenerator` from FastAPI → SSE natively. S3: `modal.Secret` + boto3. **Pinning:** `modal.Image` is a content-hashed lockfile. **Auth:** Modal token + your FastAPI auth. **SLA:** 99.9 % paid.

### 3. Replicate — `replicate/cog-comfyui`

Public model `comfyui/any-comfyui-workflow` (L40S ~$0.016/run @ ~17 s) and `-a100` (A100-80 ~$0.039/run @ ~28 s). Input: `workflow_json` (API format) + optional `input_file`/zip. Killer feature: `LoraLoaderFromURL` (shipped by cog-comfyui) — caller passes a Civitai/HF URL at request time, no per-LoRA redeploy. `cog-safe-push` (Jan 2025+) gives staged + regression-tested shipping via GitHub Actions. Cold start absorbed into billed time. **Progress:** predictions API polling + webhooks; no raw WS. **S3:** Replicate CDN by default. **Pinning:** the pushed Cog image. **Custom nodes:** fork cog-comfyui, edit `nodes.json`, push. **Auth:** API token. **SLA:** 99.9 % Teams+.

### 4. fal.ai

Native posture is "we host the popular models"; custom ComfyUI lives at `fal.run/fal-ai/comfy-server`, plus two community connectors (`badayvedat/ComfyUI-fal-Connector`, `gokayfem/ComfyUI-fal-API`) for calling fal-hosted nodes *inside* a local ComfyUI graph. The "Deploy a ComfyUI SDXL Turbo App" tutorial shows a `fal.function` with Pydantic I/O and CDN auto-upload. Strength: **realtime/WS** (Flux Schnell ~5 fps). Weakness: no explicit "bring your Dockerfile + custom nodes" story — nudges you toward fal's hosted menu. GPUs abstracted; per-inference pricing. Progress: WS for realtime endpoints, polling otherwise. **Auth:** fal key.

### 5. Baseten — `basetenlabs/truss-examples/comfyui-truss`

Truss-based. `config.yaml` declares `build_commands` that clone custom nodes and pin revisions; `model.py` wraps ComfyUI as a class with `load()` + `predict()`. `truss push` ships. **Best pinning-and-environments story of the managed set:** stable `/development/predict` and `/production/predict` URLs, HF `revision=` pinning is baseline-recommended, scale-to-zero with cold-start optimization and "network acceleration" for large weight pulls. **GPUs:** T4/A10G/L4/A100/H100. **Progress:** async predict + polling; no first-class WS. **S3:** via your model code. **Auth:** API key + per-env key. **SLA:** enterprise 99.9 %.

### 6. BentoML — `bentoml/comfy-pack` + BentoCloud

**`comfy-pack` is the most principled pinning tool in the ecosystem**: one-click "pack" from the ComfyUI UI emits a `.cpack.zip` recording Python package versions, ComfyUI + custom node commit SHAs, and model hashes via HF/Civitai URLs. `comfy-pack unpack` fully reproduces the env; the same artifact deploys on BentoCloud as a REST API with I/O schemas declared on `SaveAsOutput`/`LoadAsInput` nodes. Newer than Baseten/Modal (215★, v0.4.4 Nov 2025) but the `.cpack` format is the best **portable lock format** in the set and worth adopting even if you deploy elsewhere.

### 7. ComfyDeploy — open-source SaaS (`comfy-deploy/comfydeploy`)

Re-open-sourced 2025 under GPL-3.0 (~446★). Self-host supports Classic (direct ComfyUI/workspace), **RunPod serverless backend** (dispatches to RunPod on your behalf), or custom Docker. Surface: workflow **version history with one-click rollback**, auto-generated Playground UI, parallel per-member execution, and clean "snapshots → API endpoints" mapping. GPUs (SaaS): H100/A100/B200/H200/L40S/A10G/L4/T4. Custom-node install built into the Playground — most user-friendly of any option. For us: interesting as a **reference implementation of workflow-versioning** we can embed, not necessarily a product to adopt wholesale.

### 8. ComfyICU

Managed SaaS: 95+ extensions and 2000+ models pre-installed; credit plans from $10/mo (~3 GPU-hrs) to $240/mo (~72 hrs). REST API, polling and webhook completion. **Custom-node install is explicitly not supported** — the value prop is curated determinism. GPUs: H100/A100/L40S/L4. Highest-leverage managed option for a weekend-ship; dead end for any non-catalog node (LayerDiffuse variants, brand-LoRAs at build-time).

### 9. Salad — community cloud

Interruptible consumer hardware: **RTX 3090 $0.10/hr batch**, 4090/A4000/A5000 ~$0.20–0.50. Pre-built containers (`comfyX-apiY-torchZ-cudaN-runtime|devel`). Two shapes: **Container Gateway** (sync HTTP, 100 s hard timeout) and **Job Queue** (async, no timeout). Four priority tiers trade cost for preemption risk. S3 opt-in via env vars. Progress not first-class. Best use: **cheap spillover for async batch** ("generate 9 variants" path) where 1 % preemption is acceptable. Unsuitable for synchronous user-facing calls.

### 10. Inferless — `inferless/ComfyUI`

Dedicated repo shows fork-and-configure: workflows live in `workflows/` as JSON files, `config.yaml` defines the runtime, a volume named `comfyUI` holds models, input JSON names the workflow. **Cheapest fractional tier:** T4 $0.33/hr, A10 $0.61, A100 $2.68, per-second billing, **no cold-start charges**. Cold start ~8–12 s first boot. Progress: polling. **SLA:** not publicly strong; developer-friendly rather than enterprise-hardened.

### 11. Lightning AI

Named for completeness. Studios can host ComfyUI and expose via a Public URL but **there is no first-class "ComfyUI as serverless endpoint" product**. Correct use: dev environment with generous credits, not production.

## Cross-cutting notes

- **Progress forwarding is a tell.** Only RunPod and Modal cleanly deliver `/ws` progress events through to the caller; everyone else is polling-based. If our MCP's `generate_*` tools promise SSE streaming (they should, per 20e's Gamma-style kickoff→stream→URL contract), RunPod or Modal is mandatory on the hot path.
- **UI-format JSON is the agent trap.** Every option expects API format; most shared workflows ship UI format (often as PNGs with embedded metadata). A `graphToPrompt()` preprocessor belongs in our server, not in the worker.
- **Pinning is explicit (`.cpack.zip`, Truss `build_commands`, Modal Image, RunPod Dockerfile) or implicit (ComfyICU / fal / managed cog-comfyui).** Mixing the two across tenants without contract → the "custom-node drift" failure mode of 20d §6. **`comfy-pack` is the best portable lock format** regardless of deploy target.
- **Custom-node install is the second moat after LayerDiffuse availability.** Platforms that forbid custom-node install (ComfyICU) can't run LayerDiffuse natively and are disqualified from the transparent-asset path.
- **Spot/interruptible is a real lever only at Salad**, and only for async batch. Everywhere else cost levers are warm-pool sizing and GPU tier.

## Ranked decision matrix

| # | Platform | Latency (cold → warm) | Cost (SDXL L40S / A100) | Ops burden | Notes |
|---|---|---|---|---|---|
| 1 | **Modal** | 3s snap / 4s pool / ~20s raw | ~$0.012 / ~$0.019 | Medium (Python-only, no Dockerfile) | Best cold-start, best SSE, best docs |
| 2 | **RunPod worker-comfyui** | <1s FlashBoot / 8–15s raw | ~$0.010 / ~$0.017 | Medium (Dockerfile + comfy-cli + network volumes) | Cheapest at scale; native WS + S3 |
| 3 | **Baseten (Truss)** | 10–20s cold / instant warm | ~$0.015 / ~$0.022 | Low-medium (`config.yaml` covers 90 %) | Best `/development`→`/production` promotion; polling only |
| 4 | **Replicate cog-comfyui** | 5–30s amortized | $0.016 L40S / $0.039 A100 | Low (fork + `cog push`) | `LoraLoaderFromURL` removes rebuild churn; perfect as fallback |
| 5 | **BentoML comfy-pack + BentoCloud** | 10–20s cold / instant warm | ~$0.015 | Low (`.cpack.zip` one-click) | Best portable lock format even if deployed elsewhere |
| 6 | **ComfyDeploy self-host** | Depends on backend | RunPod pass-through | High initially | OSS ref impl of env snapshots + version history |
| 7 | **ComfyICU** | 2–10s (shared warm) | ~$10/mo ≈ 3 GPU-hrs | Near-zero | No custom nodes — disqualifies LayerDiffuse |
| 8 | **Inferless** | ~10s cold | T4 $0.33/hr — A100 $2.68 | Low (fork `inferless/ComfyUI`) | Cheapest fractional; weak WS/SLA |
| 9 | **fal.ai custom comfy** | Sub-s realtime / 5–30s queue | Per-inference | Medium | Best for realtime Flux refinement; awkward for arbitrary graphs |
| 10 | **Salad batch** | Interruptible/variable | RTX 3090 $0.10/hr | High (you own reliability) | Async ideation batches only |
| 11 | **Lightning AI** | N/A | Studio hourly | Not a production option | Dev env only |

## Recommendation

**Primary: Modal.** `@app.cls() + @modal.enter(snap=True)` with `min_containers=1–3` per asset-class function (logo, app-icon, favicon, OG, transparent-PNG). Reasons: (1) `snap=True` delivers the <3 s cold start that makes our "agent calls `generate_logo` → SSE progress → URL <10 s" contract realistic; (2) Image-as-lockfile is the cleanest pinning story short of `.cpack.zip`; (3) OpenArt is the proven precedent at our shape; (4) per-second H100 is competitive for bursty agent traffic; (5) FastAPI async-generator → SSE is native.

**Fallback: RunPod `worker-comfyui`** as a second plane behind the same `ImageProvider`/`route_model` abstraction, selected when Modal is degraded, a workflow needs a node not yet in our Modal image, or A100/H200 regional capacity is saturated. Native WS progress + S3, Active Workers for steady-state, Flex for spikes.

**Escape hatch: Replicate `any-comfyui-workflow`** as last-resort route. Per-run pricing absorbs cold starts, `LoraLoaderFromURL` means brand-LoRAs don't need a redeploy, and it's the most operationally boring of the set — which is exactly what you want at 3 AM.

**Internal lock format, independent of plane: `bentoml/comfy-pack` `.cpack.zip`.** Every template in `lib/workflows/` ships as a `.cpack.zip` reproducible bit-for-bit by a human or an agent via `comfy-pack unpack`. This is the cleanest way to enforce the "pin the lockfile, rebuild on a cadence" discipline flagged in 20d §6 and 20's Cross-Cutting Pattern 5.
