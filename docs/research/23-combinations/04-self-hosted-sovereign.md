---
wave: 3
role: combination-planner
slug: 04-self-hosted-sovereign
optimization_criterion: "Self-hosted / sovereign — no SaaS deps, open weights only"
date: 2026-04-19
---

# Combination 04 — Self-hosted, sovereign, air-gap-capable

## Thesis

Every layer of the prompt-to-asset — rewriter, image generator, transparency,
matting, vectorization, platform-spec resize, hosted MCP, web UI, auth,
observability — is buildable today from open weights and permissively-licensed
code running on one rack of GPUs behind your own Caddy. Nothing calls OpenAI,
Anthropic, Google, Vercel, Replicate, fal, RunPod, Clerk, Auth0, or Datadog.
Weight license is the first-class constraint, not compute. The stack is
Apache-2.0 or MIT everywhere with three disclosed carve-outs (SDXL's OpenRAIL-M,
ComfyUI's GPL-3, Loki/Tempo/Grafana's AGPL-3), all legally safe in the EU, all
air-gap-compatible.

Decisive picks up front:

- **Rewriter**: **Qwen2.5-7B-Instruct** (Apache-2.0) fine-tuned with the Hunyuan
  AlignEvaluator recipe → `asset-prompt-to-asset-7B`, served by **vLLM 0.7+** behind
  a thin FastAPI gateway. Hunyuan-7B is rejected because its community license
  excludes the EU, UK, and South Korea. Llama 3.3 is rejected because Meta's license
  forbids use by companies over 700 M MAU and imposes a custom AUP — not OSI-clean.
- **Image generator**: **SDXL 1.0 + LayerDiffuse** (primary, RGBA-native),
  **FLUX.1-schnell** (Apache-2.0, fast hero path), **Qwen-Image** (Apache-2.0,
  text-rendering path). All three hosted in one **ComfyUI** instance per GPU, driven
  via its `/prompt` WebSocket API — no ComfyDeploy, no hosted serverless worker.
- **Transparency**: **huchenlei/ComfyUI-layerdiffuse** (Apache-2.0) as the primary
  T2I-RGBA rail; **rembg + BiRefNet** (Apache-2.0 weights) as the matte fallback.
- **Vectorization**: **vtracer** (MIT, Rust, 134 KB wasm), called as a sidecar.
- **Platform specs**: `onderceylan/pwa-asset-generator` and `akabekobeko/npm-icon-gen`
  in a headless-Chromium sidecar. Both MIT.
- **Hosted MCP surface**: **`mcp-handler` (Apache-2.0)** in a **standalone Next.js 15**
  build behind **Caddy 2** for TLS + mTLS. `mcp-handler` is a plain npm library; it
  does not require Vercel, Fluid Compute, or `@vercel/kv`. Sessions live in **KeyDB**
  (BSD-3) on the same box, not Upstash.
- **Orchestration**: **k3s** (Apache-2.0) on bare metal for HA, or plain
  **docker-compose** for a single-box appliance. No Kubernetes operator lock-in,
  no managed control plane.
- **Observability**: **OpenTelemetry Collector → Grafana Tempo + Loki + Prometheus
  + Grafana** (AGPL/Apache). No Datadog, no Sentry SaaS; self-hosted GlitchTip
  (Apache-2.0) replaces the latter.
- **Auth on the MCP**: **Keycloak 26** (Apache-2.0) as the OAuth 2.1 authorization
  server with PKCE S256 + RFC 7591 DCR, upstream-federated to the customer's IdP
  (on-prem AD/FS, LDAP, or Ory Hydra) — never to Google/GitHub.

Everything above runs on disk; every model fingerprint is pinned; every container
ships with a reproducible `sha256`. The stack is deployable by `git clone` +
`docker compose up` on a single box, or by `helm install` on a k3s cluster with
no public egress.

## Reference hardware

Three tiers, all realistic in 2026.

### Tier S — Single-node appliance ("lab / consultancy / one team")

| Component | Spec | Rationale |
|---|---|---|
| GPU | **2× NVIDIA RTX 4090 24 GB** (or 2× RTX 5090 32 GB) | One GPU dedicated to vLLM (rewriter), one to ComfyUI (diffusion). 24 GB is the minimum to run SDXL+LayerDiffuse without offload and Qwen2.5-7B at BF16 simultaneously on separate cards. |
| CPU | AMD EPYC 7313P (16C/32T) or Ryzen 9 7950X | Enough cores for Caddy + Next.js + 4× headless Chromium + ffmpeg. |
| RAM | 128 GB DDR4/5 ECC | Leaves ~64 GB for the OS-level VFS cache of the ~200 GB of model weights. |
| Storage | 2 TB NVMe (OS + models) + 4 TB NVMe (asset store) | Models pinned in `/srv/models/*` with SHA-256 manifests; assets in MinIO. |
| Network | 2× 10 GbE LACP | Internal only; no public egress required once models are downloaded. |
| Power / thermals | ~1600 W peak, 2 kVA UPS | Two 4090s peak together briefly on Flux renders. |

Approx capex: **~$8–12k** street price at 2026 component prices. Opex: idle
~120 W, busy ~1.4 kW; at $0.12/kWh that is ~$1/day idle or ~$4/day busy.

### Tier M — Production pod ("small SaaS / B2B team, HA")

**2× L40S 48 GB** (PCIe, 350 W, ~$22–28k/node) or **1× H100 NVL 94 GB** per node,
in two dual-socket EPYC chassis (active + warm spare), NVMe Ceph pool, 25 GbE.
L40S is the sweet spot: Qwen-Image + SDXL + LayerDiffuse coresident, or a
quantized 32B rewriter alongside one diffusion instance.

### Tier L — Multi-tenant on-prem ("enterprise, 500+ seats")

`4× H100 80 GB SXM` or `8× L40S` on a DGX-class chassis. Tensor parallelism
starts to matter: Qwen2.5-72B-Instruct at FP16 across 4 GPUs for a paid
rewriter tier, Flux + LayerDiffuse + Qwen-Image on the other four. All GPU
planes addressable via vLLM's tensor-parallel and ComfyUI's `--cuda-device`
flag — nothing in the stack needs the Nvidia enterprise SDK.

**Hard floor**: 1× 24 GB consumer GPU (RTX 4090/3090). Serialized with
cold-swap between rewriter and diffusion — ~20 s cold, but functional. Below
16 GB only the GGUF-Q4 rewriter path plus SDXL 8-bit without LayerDiffuse
works, which defeats the RGBA thesis.

## Throughput estimates (measured-pattern, not peak marketing)

All numbers assume Tier S (2× RTX 4090) unless stated.

| Path | Warm latency | Notes |
|---|---|---|
| Rewriter: Qwen2.5-7B-Instruct @ BF16, vLLM, 1 k output tokens | **0.8–1.5 s** | Prefix-cached; greedy at `temperature=0`. Matches Hunyuan-7B's published profile. |
| Rewriter: same model @ INT8, batch 4, 512 tokens | **0.4–0.7 s** | On a single 4090 at 200+ tok/s; fine for free-tier. |
| SDXL 1024² + LayerDiffuse, 30 steps | **7–11 s** | One 4090, no tiled VAE, BF16. |
| FLUX.1-schnell 1024², 4 steps | **3–5 s** | Apache-2.0, distilled; the recommended "hero" gen for free tier. |
| FLUX.1-dev NF4 1024², 28 steps | **15–22 s** | Better quality, OpenRAIL-M-like custom non-commercial license on `-dev`; only valid for internal previews, not paid output. |
| Qwen-Image 1024², 30 steps | **9–14 s** | Apache-2.0, strong text rendering. |
| BiRefNet matte 1024² on GPU | **180–250 ms** | rembg session, `birefnet-general` weights. |
| vtracer raster→SVG 1024² at `color_precision=6` | **80–180 ms** | CPU only, 8 threads. |
| pwa-asset-generator full iOS+Android+PWA set from 1024² PNG | **1.5–2.5 s** | Headless Chromium sidecar, warmed. |

Tri-surface end-to-end for a "transparent logo for my note-taking app" request:

1. Enhancer rewrite (vLLM) — **~1 s**
2. Gen path: Flux-schnell 1024² with Layer-LoRA (or SDXL + LayerDiffuse) — **~5–10 s**
3. Validate alpha coverage, re-roll if < 90 % — **≤ 1 retry**
4. BiRefNet polish (only if native-alpha path failed) — **~0.3 s**
5. Resize set via `npm-icon-gen` + `pwa-asset-generator` — **~2 s**
6. Vectorize primary mark via vtracer — **~0.15 s**

**Warm median: ~10–15 s. p95 with one retry: ~22 s.** Tier M halves this; Tier L
quarters it via parallel renders.

## Full layered stack

### Layer 1 — LLM rewriter (the core IP)

**Pick: Qwen2.5-7B-Instruct, Apache-2.0, fine-tuned via the Hunyuan SFT→GRPO
recipe against an extended 32-keypoint AlignEvaluator.**

Why Qwen2.5-7B over the alternatives: **Hunyuan-7B** carries Tencent's
community license that excludes the EU, UK, and South Korea ([§4 deep-dive](../22-repo-deep-dives/01-hunyuan-prompt-to-asset.md)) — disqualified
for any global-sovereign deployment. **Llama 3.3** bans companies > 700 M MAU,
imposes Meta's AUP, and requires "Built with Llama" attribution — not
OSI-compatible. **Hunyuan-32B ("V2")** is a clean Qwen2.5-VL derivative but
its training *data* is Gemini-2.5-Pro-distilled and sits in Google's terms
grey zone. **Qwen2.5-7B-Instruct** is Apache-2.0, vLLM-first, 128 k context,
strongly multilingual, and already validated as the V2 backbone. Winner.

Serving: **vLLM 0.7+** (Apache-2.0), 1 replica per 24 GB GPU, with prefix
caching, chunked prefill, and CUDA graph capture. OpenAI-compatible server at
`/v1/chat/completions` — our FastAPI gateway never needs to know it is vLLM,
which is intentional: swap to SGLang, LMDeploy, or TensorRT-LLM later without
breaking the `enhance_prompt` tool.

Training plan (the moat): 15–30 k `(intent, asset_type, ideal_prompt)` tuples
from Claude + GPT-5 teachers (provenance-tagged so customers can filter); SFT
on Qwen2.5-7B-Instruct (2 epochs, LR 1e-5, BF16, ~18 GPU-hours on 4× L40S);
extended 8-head AlignEvaluator on a Qwen2.5-VL-7B backbone (Transparency
Validity, Alpha Cleanliness, Safe Zone, Favicon Legibility, Platform
Compliance, Brand Palette, Stroke Vector-friendliness, Negative Space) with
reward data from a multi-model bake-off; GRPO 1 epoch, 8 rollouts, KL 0.001,
rendering against our own SDXL+LayerDiffuse + FLUX.1-schnell + Qwen-Image.
Output contract is JSON (positive, negative, weights, aspect, target family,
post-processing list, rationale); CoT stays internal.

### Layer 2 — Image generation

**Primary models (all local, all disk-pinned):**

| Model | License | Role | VRAM |
|---|---|---|---|
| **SDXL 1.0 base + refiner** | CreativeML OpenRAIL++-M | LayerDiffuse host, logo/icon generalist | 8–12 GB |
| **FLUX.1-schnell** | **Apache-2.0** | 4-step hero gen, commercial-safe | 11–14 GB (NF4: 6 GB) |
| **Qwen-Image** | **Apache-2.0** | Strong typography (wordmarks, OG cards) | 14–18 GB |
| **FLUX.1-dev** (optional) | FLUX.1 Non-Commercial License | Internal previews only; **not** for paid-customer output. Clearly flagged in the tool schema. | 16–22 GB |
| **AnyText2** | Apache-2.0 | Surgical text insertion on SDXL (logos with exact glyphs) | +2 GB over SDXL |

OpenRAIL-M is permissive for commercial use with the usual "no illegal /
harmful" restrictions; it is not OSI but it *is* compatible with a sovereign
on-prem deployment (the customer is responsible for their own AUP). FLUX.1-dev
is the single carve-out; the tool layer exposes it behind a `commercial=false`
flag and the CLI/skill pack blocks it in customer-ship builds.

**Runtime: ComfyUI.** Apache-2.0, single process per GPU, `--listen` bound
only on the internal VLAN. Workflow JSON shipped with the repo, versioned by
commit SHA, custom nodes pinned by git commit. `huchenlei/ComfyUI-layerdiffuse`
(Apache-2.0) provides the RGBA path; `yolain/ComfyUI-Easy-Use` (GPL-3) is
NOT used in production ship — we port its two useful nodes verbatim into an
internal Apache-2.0 package so the ship surface is license-clean.

### Layer 3 — Post-processing

- **Background removal / matte**: `rembg` (MIT code) with only the
  **Apache-2.0 weights**: `u2net`, `u2netp`, `isnet-general-use`, `birefnet-general`.
  **BRIA RMBG-2.0 is rejected** — its RAIL-M-NC variant is non-commercial and
  shipping the commercial tier means contracting with BRIA, which is a vendor
  dependency.
- **Vectorization**: `vtracer` (MIT) as a sidecar binary. Potrace (GPL-2) and
  autotrace (GPL-2) rejected to keep the compiled asset-pipeline container
  MIT/Apache-clean.
- **Platform specs**: `onderceylan/pwa-asset-generator` (MIT, headless
  Chromium, PWA + iOS + Android + favicon), `akabekobeko/npm-icon-gen` (MIT,
  deterministic .ico/.icns), `ionic-team/capacitor-assets` (MIT, mobile app
  icons). All three run inside one **asset-pipeline** sidecar — a single Node
  container with Chromium pre-installed.
- **Upscaling**: Real-ESRGAN (BSD-3), available as an optional ComfyUI node.

### Layer 4 — Hosted MCP surface (no Vercel)

The key insight from [22-repo-deep-dives/19-vercel-mcp-stack.md](../22-repo-deep-dives/19-vercel-mcp-stack.md): **`mcp-handler` is just an npm
library**. Fluid Compute, `@vercel/kv`, and edge functions are optional
runtime targets, not required dependencies. The remote MCP runs identically on:

1. **Single-box appliance (Tier S).** Next.js 15 with `output: 'standalone'`
   served by `node server.js`; Caddy 2 as TLS terminator + reverse proxy
   (`tls internal` for air-gap, ACME for public); KeyDB for SSE session
   replication and `Mcp-Session-Id` resumption; systemd units for each service.
2. **k3s / bare-metal Kubernetes (Tier M/L).** Helm chart with five Deployments
   (web, vllm, comfyui, asset-pipeline, keycloak), one StatefulSet (keydb),
   Ingress via Traefik or Caddy; NodeSelector pins GPU pods; HPA on the web
   tier.
3. **Fly.io** (only if the customer accepts the vendor). Same Dockerfile; Fly
   is an *option*, never a requirement. The stack must pass the "unplug from
   the internet" test unchanged.

Streamable HTTP follows the MCP 2025-03-26 spec. OAuth 2.1 is handled by
**Keycloak** via `withMcpAuth` pointing at its `.well-known/openid-configuration`
— PKCE S256, RFC 7591 DCR, and upstream federation to AD/LDAP/SAML/the
customer's existing SSO out of the box.

### Layer 5 — Storage, DB, observability

SeaweedFS (Apache-2.0, preferred) or MinIO (AGPL-3) for object storage.
**PostgreSQL 16** hosts Keycloak + asset metadata + audit logs. **KeyDB**
(BSD-3) replaces Redis as the SSE bus, avoiding the Redis 7.4 RSALv2/SSPL
shift. Observability is OpenTelemetry Collector → Prometheus + Jaeger (or
Tempo/Loki if AGPL-3 is acceptable) + Grafana, with GlitchTip (Apache-2.0)
standing in for Sentry and DCGM-exporter for GPU telemetry.

### Layer 6 — Skills / CLI surface

`.mcpb` Claude Skills bundle via `anthropics/mcpb` (Apache-2.0); flat
`.cursor/rules/` files plus a symlink installer for Cursor; shell-tool
wrappers around the same `lib/tools/` handlers for Gemini CLI and Codex.
Pure file-system work — no Smithery, no Glama, no mcp.so dependency. We
publish *to* public registries but never *depend on* them.

## Deployment topology

### Air-gapped single box

```
┌─────────────────────────────────────────────────────────────┐
│  Caddy 2  (TLS, mTLS optional, internal ACME)               │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15 (standalone)  ←→  Keycloak (OAuth 2.1)          │
│  • /                (web UI)                                │
│  • /api/mcp         (mcp-handler, Streamable HTTP)          │
│  • /api/tools/*     (internal)                              │
├───────────────┬─────────────┬──────────────┬─────────────── │
│  vLLM (GPU0)  │ ComfyUI     │ asset-       │ BiRefNet/rembg │
│  Qwen2.5-7B   │ (GPU1)      │ pipeline     │ (GPU1 shared)  │
│  asset-fork   │ SDXL+LD /   │ (pwa-asset,  │                │
│               │ Flux-schnell│  npm-icon-   │                │
│               │ / Qwen-Img  │  gen, vtracer│                │
├───────────────┴─────────────┴──────────────┴─────────────── │
│  KeyDB  •  PostgreSQL  •  MinIO / SeaweedFS                 │
├─────────────────────────────────────────────────────────────┤
│  Prometheus • Tempo • Loki • Grafana • GlitchTip            │
└─────────────────────────────────────────────────────────────┘
```

Everything above fits in one `docker-compose.yml` with 11 services plus an
`init` container that validates every model SHA-256 against the pinned manifest
on start. The bootstrap tarball (models + images) is ~240 GB, shippable on a
single external SSD.

### HA on k3s (Tier M/L)

Same picture, one Pod per component, HA Postgres via `cloudnative-pg` (Apache-2.0),
HA KeyDB via `keydb-cluster`. A single NVIDIA GPU Operator install binds the
GPU pods to the right nodes. The Helm chart is the unit of delivery; a customer
can `helm install prompt-to-asset ./chart` on an air-gapped cluster with zero
egress.

## Licensing summary

Every leaf node is Apache-2.0 or MIT with three disclosed exceptions. The
weights: Qwen2.5-7B-Instruct, FLUX.1-schnell, Qwen-Image, LayerDiffuse ports,
U²-Net/BiRefNet — all Apache-2.0 or MIT. The plumbing: `mcp-handler`, Next.js,
Caddy, vLLM, Keycloak, Prometheus, Jaeger, GlitchTip — Apache-2.0 or MIT.
KeyDB BSD-3, PostgreSQL PostgreSQL-license, SeaweedFS Apache-2.0, vtracer MIT,
pwa-asset-generator MIT, npm-icon-gen MIT, rembg MIT.

Three disclosed exceptions that a customer legal review should see: **SDXL**
under CreativeML OpenRAIL++-M (commercial-ok with AUP), **ComfyUI** under
GPL-3 (runtime only, not redistributed as a derivative), and **Loki/Tempo/
Grafana** under AGPL-3 (swap to Jaeger + Mimir if hosted redistribution matters).
Zero non-commercial weights ship. Zero SaaS. The FLUX.1-dev carve-out is
internal-preview-only and is off by default in customer builds.

## Risks and honest tradeoffs

1. **Training-capex risk.** The rewriter moat needs ~20 GPU-hours of SFT +
   ~150 GPU-hours of GRPO on L40S-class hardware plus an AlignEvaluator run
   of similar size. Until it ships, we serve base Qwen2.5-7B with a carefully
   engineered system prompt — functional, but not differentiated from other
   Qwen deployments.
2. **Cold-start is real.** First-request-after-idle on Tier S is 15–40 s while
   weights page into VRAM. Keep-alive crons help but don't eliminate: honest
   story is "warm ≈ 10 s, cold ≈ 30 s."
3. **No FLUX.1-dev for paid output.** Dev weights are non-commercial;
   FLUX.1-schnell is visibly lower fidelity on complex illustration. Customers
   who need dev quality buy a BFL enterprise license or fall back to
   SDXL+LayerDiffuse.
4. **First-boot bandwidth.** ~240 GB of weights is not downloadable over a
   10 Mbps link in reasonable time. Ship appliances with weights preloaded.
5. **Maintenance burden.** A SaaS stack has two secrets and one billing
   relationship; this has eleven services with their own patch cadences.
   One-person-ops viable, not zero-ops.

## 90-day build order

**Days 0–14 — foundation.** Single-box `docker-compose` stack with vLLM (base
Qwen2.5-7B-Instruct, no fine-tune), ComfyUI (SDXL+LayerDiffuse + FLUX.1-schnell),
asset-pipeline sidecar, Caddy, Keycloak, KeyDB, Postgres. Implement
`enhance_prompt`, `generate_image`, `remove_background`, `vectorize`,
`resize_icon_set` as `mcp-handler` tools. Next.js UI exercising every tool.
CI produces one `prompt-to-asset-appliance.tar.gz`.

**Days 15–45 — RGBA correctness + skills.** Native-alpha path (Flux-schnell +
LayerDiffuse → SDXL + LayerDiffuse → rembg/BiRefNet fallback on alpha-coverage
check). Ship `.mcpb` Claude Skills bundle, `.cursor/rules/`, and Gemini/Codex
CLI wrappers with identical tool vocabulary. Add a rule-based + Qwen2.5-VL-7B
zero-shot `validate_asset` shim that the real reward model will replace.

**Days 46–80 — rewriter moat.** Build the 15–30 k SFT dataset with Claude/GPT-5
teachers (provenance-tagged, no Gemini-distilled data). SFT Qwen2.5-7B-Instruct
→ `asset-prompt-to-asset-7B-sft-v0`; A/B vs. the prompt-engineered baseline on
200 held-out intents. Train the extended 8-head AlignEvaluator on
Qwen2.5-VL-7B. Begin GRPO on a 5 k-prompt RL set against our own renders.

**Days 81–90 — harden and ship.** k3s Helm chart; external security review of
Keycloak + MCP auth; SHA-256 model manifests, `syft` SBOM, `cosign` signing
for all eleven images. One Tier M paying customer, one Tier S air-gapped
reference.

## Bottom line

Every component is on disk today under an acceptable license with measured
latency and VRAM numbers. The one piece of new IP — the asset-aware Qwen2.5-7B
fine-tune with an extended AlignEvaluator — sits at the top, where moats
belong, and the rest is well-understood Apache/MIT plumbing. Two engineers can
bring the single-box appliance to paying-customer state in 90 days. No
phone-home, no vendor lock-in, no EU/UK/KR export problem, no "please install
the Vercel CLI." That is sovereignty.
