# 34 · Diffusion Orchestrators / Backends for a Self-Hosted `prompt-to-asset` Path

> Research pass on open-source diffusion runtimes that `prompt-to-asset` (a Node-based MCP server) could drive as a "local-models-instead-of-API-providers" backend. Focus: license, API surface, fitness for a headless programmatic caller sending a well-formed params object (prompt, model, LoRA stack, ControlNet refs). Date: 2026.

**Research value: high** — the space has 3–4 serious options with meaningfully different license + API shapes, and the tradeoff map is clear.

---

## License map (the first filter)

| Project | License | Network-copyleft? | Practical impact for a Node MCP talking to it over HTTP |
|---|---|---|---|
| **`diffusers` (HF)** | Apache-2.0 | No | Safe. Library, not a server — you author the server. |
| **ComfyUI** | **GPL-3.0** | No (plain GPL, not AGPL) | Running as a separate process and calling it over HTTP does **not** contaminate `prompt-to-asset`. Modifications to Comfy itself would need to stay GPL. |
| **InvokeAI** | Apache-2.0 | No | Safe in every distribution model. |
| **SD.Next** | Apache-2.0 | No | Safe. Rare Apache-2 webui. |
| **Automatic1111 WebUI** | **AGPL-3.0** | **Yes** | AGPL reaches across the network. Exposing A1111-backed generation to users may require offering A1111's source (and any mods) to them. Also effectively unmaintained. |
| **Forge / reForge / Forge Classic** | AGPL-3.0 (inherits A1111) | Yes | Same AGPL footgun. |
| **Replicate Cog** | Apache-2.0 | No | Safe. Not an orchestrator — a container spec. |
| **Kohya SS** | Apache-2.0 | No | Irrelevant; it's a training harness, not inference. |
| **ONNX Runtime + Optimum `ORTStableDiffusionPipeline`** | MIT/Apache-2 mix | No | Safe. Library, not a server. |

Takeaway: A1111 + Forge + reForge are the branch to **avoid** for anything close to hosted/multi-tenant use. The remaining viable set is `diffusers`, ComfyUI, InvokeAI, SD.Next, Cog, ONNX.

---

## Per-backend fitness for a headless Node caller

### `diffusers` (HuggingFace, Apache-2.0) — a Python **library**, not a daemon
- API surface: Python only. No first-class HTTP server, but the repo ships an official reference FastAPI example (`examples/server/server.py`) exposing an **OpenAI-compatible** `POST /v1/images/generations` endpoint. Async via `run_in_executor`; per-request scheduler cloning (schedulers are not thread-safe).
- Params model: whatever your Python wrapper exposes. You pick the schema — clean fit for a strict TypeScript params object on the Node side.
- LoRA / ControlNet: first-class Python APIs (`pipe.load_lora_weights`, `ControlNetModel`, `MultiControlNetModel`, IP-Adapter hooks). Most permissive stack for mixing adapters.
- Fitness: **High, but you build the server.** Best option if you want full control over the wire schema and a permissively-licensed core. Worst option if you want "install and call" on day one.

### ComfyUI (GPL-3.0) — node-graph engine with a mature HTTP/WS API
- API surface: API-first. HTTP server at `:8188` exposing `POST /prompt`, `GET /history/{prompt_id}`, `GET /view`, `POST /upload/{image_type}`, plus a `/ws` WebSocket for progress/preview. The GUI is literally a client on top of the same endpoints.
- Params model: a **workflow JSON graph**. Programmatic use = export an "API format" workflow, then mutate known node inputs (prompt text, seed, model loader, LoRA stack, ControlNet image refs) before POSTing. Not a flat params object out of the box, but libraries smooth that over.
- LoRA / ControlNet / IP-Adapter / regional prompts / video: best-in-class coverage in the ecosystem; any model you can imagine already has a Comfy node.
- Node client libraries (TypeScript, directly relevant here):
  - [`@stable-canvas/comfyui-client`](https://www.npmjs.com/package/@stable-canvas/comfyui-client) — REST + WS, typed, `enqueue()` helper wrapping the whole submit→watch→collect lifecycle.
  - [`comfyui-node`](https://github.com/igorls/comfyui-node) — higher-level `Workflow` API, `PromptBuilder`, `WorkflowPool` for multi-instance pooling.
- MCP wrappers: **yes, they exist already.**
  - [`joenorton/comfyui-mcp-server`](https://github.com/joenorton/comfyui-mcp-server) — Python MCP over streamable HTTP at `127.0.0.1:9000/mcp`; tools like `generate_image`, `regenerate`, `get_job`, `list_assets`. Delegates to a local ComfyUI on `:8188`.
  - Official Comfy Cloud MCP at `cloud.comfy.org/mcp` (paid, API key).
- Fitness: **Highest out-of-the-box fitness** for a Node caller. The license is GPL-3 (not AGPL), so calling Comfy as a separate process is clean — only direct source modifications to Comfy itself would need to stay GPL.

### InvokeAI (Apache-2.0) — the permissive ComfyUI-alternative
- API surface: REST at `/api/v1/`, OpenAPI spec served at `/docs`, Socket.IO for progress. Node-based invocation system internally (`txt2img`, `img2img`, `upscale`, `face_restore`) exposed through a queue API. Multi-user mode adds JWT auth.
- Params model: closer to a flat JSON request per invocation than Comfy's whole-graph shape, while still supporting arbitrary node chains when you want them.
- LoRA / ControlNet / IP-Adapter: all first-class, exposed via the same REST/queue API.
- Docker image (`ghcr.io/invoke-ai/invokeai:latest`) on port 9090.
- Fitness: **High**, and it's the only permissively-licensed option in its class that is "install and call."

### SD.Next (Apache-2.0) — permissive A1111-lineage webui
- API surface: inherits the A1111 `/sdapi/v1/txt2img` / `/sdapi/v1/img2img` REST shape plus its own extensions. Same flat-request style many libraries already know.
- Fitness: **Moderate**. Useful as a drop-in if you're porting existing A1111 API callers but want to escape AGPL. Not as clean a graph for agentic use as Comfy; not as polished a queue API as Invoke.

### A1111 / Forge / reForge (AGPL-3.0) — **skip for this project**
- A1111's `/sdapi/v1/*` API is well known and widely documented, but: (a) AGPL's network clause is a real risk surface for a hosted MCP, and (b) A1111 itself is no longer actively maintained; Forge is faster but carries the same license.

### Replicate Cog (Apache-2.0) — container spec, not an orchestrator
- Cog lets you wrap a single model (e.g. a `diffusers` pipeline) in a Docker image with a typed `predict()` signature and a generated HTTP server. Useful as a **packaging** layer around a `diffusers` worker — not a substitute for Comfy/Invoke when you want dynamic LoRA stacks and ControlNet chains in one request.

### ONNX Runtime + Optimum (`ORTStableDiffusionPipeline`) — CPU/edge path
- Python library only, no server. Strong CPU performance (benchmarks reporting ~25× vs. naive Rust CPU on the same hardware). No batching recommendation (per-prompt iteration). Best as an optional CPU-only path embedded in your own `diffusers`-based worker; not a standalone orchestrator.

### vLLM / SGLang / TGI — **not applicable**
- These are LLM/VLM serving stacks (KV-cache-aware, token streaming). No first-class diffusion path. The "batch server for diffusion" niche basically doesn't have a vLLM-equivalent yet; the closest things are the `diffusers` FastAPI example and ad-hoc queue wrappers on top of Comfy.

### Kohya SS — **not applicable**
- Training (LoRA/DreamBooth/etc.), not inference. Out of scope for an MCP generation backend.

---

## Programmatic ergonomics ranking (for a Node MCP caller)

1. **ComfyUI** — richest capabilities, mature Node SDKs, MCP wrappers already exist. Caveat: graph-shaped params, GPL-3 core.
2. **InvokeAI** — flat-ish REST, Apache-2, OpenAPI-documented, Socket.IO progress. Caveat: smaller custom-node/adapter ecosystem than Comfy.
3. **`diffusers` + your own FastAPI worker** — Apache-2 all the way down, schema is whatever you define. Caveat: you maintain the server.
4. **SD.Next** — Apache-2, A1111-compatible REST. Caveat: less active ecosystem than Comfy/Invoke.
5. **Cog-packaged `diffusers`** — Apache-2, great for a single-model container. Caveat: not an orchestrator for dynamic LoRA/ControlNet stacks.
6. **A1111 / Forge / reForge** — skip (AGPL, stagnating).
7. **ONNX / Optimum** — optional CPU fallback inside (3), not a primary backend.

---

## Recommendation: support **two** first-class backends

### Primary: **ComfyUI** (via its REST/WS API, driven through a TypeScript client)
- Richest capability surface the field has: every LoRA, ControlNet, IP-Adapter, regional prompt, upscaler, video model lands in Comfy first.
- Already has a ready-made MCP surface in the wild (`joenorton/comfyui-mcp-server`) — `prompt-to-asset` can either piggyback on that pattern or call Comfy directly with `@stable-canvas/comfyui-client` / `comfyui-node`.
- GPL-3 is fine for an out-of-process backend: `prompt-to-asset` stays permissively licensed, and users who don't want GPL at all can disable this backend.
- Mitigation for "graph-shaped params": keep curated API-format workflow templates (txt2img, img2img, ControlNet, LoRA-stack, IP-Adapter) inside `prompt-to-asset` and splice a flat params object into the right nodes before submitting.

### Secondary (for Apache-2-only deployments): **`diffusers` in a thin FastAPI worker**
- Direct, bring-your-own-schema HTTP backend. Apache-2 all the way. Thread-safety pattern is documented in HF's own reference server.
- Optionally packaged as a Cog image so self-hosters can `cog push` their own variants.
- Gives you a clean fallback when a user's org cannot ship GPL-adjacent code, and a natural place to wire in ONNX Runtime for CPU-only hosts.

### Explicitly deprioritize
- **A1111 / Forge / reForge** — AGPL + maintenance concerns.
- **InvokeAI as the secondary** — a strong alternative, and it's Apache-2; consider it if we want "install-and-call" rather than "build-our-own-worker" for the permissive path. The call between InvokeAI and `diffusers+FastAPI` is mostly: do we want to own the schema (→ diffusers) or own less code (→ Invoke)?

---

## Sources

- ComfyUI API and license: <https://github.com/comfyanonymous/ComfyUI/blob/master/LICENSE>, <https://dev.to/methodox/devlog-20250710-comfyui-api-1mi0>, <https://www.viewcomfy.com/blog/building-a-production-ready-comfyui-api>
- ComfyUI Node SDKs: <https://www.npmjs.com/package/@stable-canvas/comfyui-client>, <https://github.com/igorls/comfyui-node>
- ComfyUI MCP: <https://github.com/joenorton/comfyui-mcp-server>, <https://docs.comfy.org/development/cloud/mcp-server>
- `diffusers` reference FastAPI server: <https://huggingface.co/docs/diffusers/en/using-diffusers/create_a_server>
- InvokeAI license + API: <https://github.com/invoke-ai/InvokeAI/blob/main/LICENSE>, <https://invoke-ai.github.io/InvokeAI/multiuser/api_guide/>
- A1111 license (AGPL-3): <https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/LICENSE.txt>
- SD.Next license: <https://github.com/vladmandic/sdnext/blob/dev/LICENSE.txt>
- Forge / reForge overview: <https://offlinecreator.com/blog/best-local-stable-diffusion-setup-2026>, <https://github.com/Panchovix/stable-diffusion-webui-reForge/discussions/377>
- Cog: <https://github.com/replicate/cog>, <https://github.com/replicate/cog-stable-diffusion/blob/main/LICENSE>
- ONNX Runtime SD: <https://huggingface.co/docs/diffusers/en/optimization/onnx>
