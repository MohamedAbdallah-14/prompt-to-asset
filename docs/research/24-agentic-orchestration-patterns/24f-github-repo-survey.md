# GitHub Repo Survey: Agentic Patterns for Image/Asset Generation

Surveyed April 2026. Star counts from live fetches; repos listed by relevance to prompt-to-asset.

---

## 1. openai/openai-agents-python — 5 Patterns That Transfer Directly

**URL:** https://github.com/openai/openai-agents-python  
**Stars:** Not publicly surfaced in README; referenced by major vendors as the canonical SDK.

The `examples/agent_patterns/` directory is the most useful part of this repo. It demonstrates six patterns as runnable Python files:

- **`parallelization.py`** — fan-out multiple specialized agents simultaneously, fan-in to a meta-agent. For prompt-to-asset: run a style-enhancer agent, a technical-spec agent, and a platform-requirements agent in parallel on a single brief, then merge their outputs before dispatching to the image model.
- **`llm_as_a_judge.py`** — iterative generation loop where a second LLM evaluates the output and triggers regeneration if quality is below threshold. Directly applicable to post-generation validation: run BiRefNet score, safe-zone bbox, and OCR Levenshtein through a judge that either accepts or requests a retry.
- **`agents_as_tools.py`** — a central orchestrator calls sub-agents as tools and retains control. The orchestrator stays aware of the full context; sub-agents return structured results. Maps to prompt-to-asset's three-mode dispatch: orchestrator decides `inline_svg` vs `external_prompt_only` vs `api`, then delegates.
- **`routing.py`** — classify incoming request, route to the specialized sub-agent. Maps to capability-based routing (transparent PNG → RGBA-capable model, vector output → Recraft/SVG path).
- **`human_in_the_loop.py`** — suspend execution, await approval, resume. Maps to the `external_prompt_only` flow where the user generates externally then calls `asset_ingest_external`.
- **`deterministic.py`** — fixed sequential pipeline with typed handoffs between steps. Maps to the matte → vectorize → validate → bundle chain.

MCP tools are first-class: any `asset_*` tool can be registered as an agent tool with automatic schema generation from the function signature.

---

## 2. microsoft/autogen — Event-Driven Multi-Agent Coordination

**URL:** https://github.com/microsoft/autogen  
**Stars:** >40k (one of the highest-starred agent frameworks on GitHub)

AutoGen v0.4 re-architected the library around async message passing. Key design decisions:

- **`SelectorGroupChat`** — LLM-based speaker selection. A custom selector function can implement domain-specific dispatch (e.g., "if the task contains 'transparent', select the RGBA specialist agent").
- **`Swarm`** — localized tool-based selection instead of centralized coordinator. Each agent decides whether to hand off based on its own tools.
- **Async event-driven core** — agents communicate through typed messages, not shared state. This matches the MCP request/response model and makes it safe to run concurrent generation tasks.

AutoGen is now in maintenance mode; Microsoft Agent Framework (MAF) is the production successor. For prompt-to-asset the relevant pattern is `SelectorGroupChat` with a custom selector that reads `asset_type` from the incoming message to deterministically pick a routing path.

Key file: `python/packages/autogen-agentchat/autogen_agentchat/teams/_group_chat/_selector_group_chat.py`

---

## 3. langchain-ai/langgraph — Stateful Checkpointed Pipelines

**URL:** https://github.com/langchain-ai/langgraph  
**Stars:** ~10k+ (one of the most active LLM orchestration repos)

LangGraph models agent workflows as `StateGraph` — nodes are functions, edges are transitions, state persists across nodes via checkpointers (SQLite, PostgreSQL). Key insight: **after every node execution, state is saved**. If the process crashes mid-pipeline, it resumes from the last successful node. This is exactly what prompt-to-asset needs for `api` mode: if the image model call succeeds but BiRefNet crashes, the checkpoint holds the raw image and the matte step retries without re-billing the generation API.

The `langgraph-js` variant (https://github.com/langchain-ai/langgraphjs) is TypeScript-first, making it directly compatible with the prompt-to-asset MCP server codebase.

Relevant pattern: conditional edges. After generation, branch: if alpha channel present → skip matte step, else → route through BiRefNet. LangGraph's `addConditionalEdges` handles this in ~10 lines.

---

## 4. lm-sys/RouteLLM — Complexity-Based Model Routing

**URL:** https://github.com/lm-sys/RouteLLM  
**Stars:** 4.8k

Four trained router strategies: matrix factorization (recommended), semantic weighted ranking, BERT classifier, causal LLM classifier. All estimate a "win rate for the strong model conditioned on that prompt" and route above/below a threshold.

The prompt-to-asset analogy is capability routing, not quality routing: the question is not "is GPT-4o better than GPT-3.5?" but "does this request require transparency support?" That is a capability flag, not a difficulty score. However, RouteLLM's **threshold-based routing with cost awareness** is directly applicable to the `api` mode provider selection: if `OPENAI_API_KEY` is present, route transparent requests there; fall back to BiRefNet post-processing if only `IDEOGRAM_API_KEY` is available.

Key file: `routellm/routers/routers.py` — the `Router` base class and `MatrixFactorizationRouter` implementation show how to train and serve a routing classifier as a drop-in middleware.

---

## 5. huggingface/diffusers — Modular Block Composition

**URL:** https://github.com/huggingface/diffusers  
**Stars:** ~27k

The 2025 **Modular Diffusers** redesign (see: https://huggingface.co/blog/modular-diffusers) is the most relevant development. Each pipeline step is now a `ModularPipelineBlocks` subclass with explicit `inputs`, `intermediate_outputs`, and `expected_components` properties. Blocks are pluggable: you can pop the text encoder, run it separately, cache the embeddings, then pass them to the denoising block. Memory is managed by `ComponentsManager` with automatic CPU offloading.

For prompt-to-asset: the pattern of **extractable, independently runnable pipeline steps** is the model for how `asset_remove_background`, `asset_vectorize`, and `asset_upscale_refine` should be designed — each as a discrete block that accepts a typed input and emits a typed output, composable into arbitrary orders.

Key file: `src/diffusers/modular_pipelines/modular_pipeline.py`

---

## 6. comfyanonymous/ComfyUI — Workflow-as-Graph with JSON Serialization

**URL:** https://github.com/comfyanonymous/ComfyUI  
**Stars:** ~65k+

ComfyUI stores entire generation workflows as JSON graphs where each node is a discrete operation (Load Checkpoint, CLIP Encode, KSampler, VAE Decode, Save Image) and connections are typed sockets. The graph is executable and inspectable. The `ComfyUI_examples` repo (https://github.com/comfyanonymous/ComfyUI_examples) ships images with embedded workflow metadata — drop the image into ComfyUI and the full pipeline reconstructs.

Applicable pattern for prompt-to-asset: persist `AssetBundle` generation workflows as JSON graphs in the content-addressed store. This makes every generated asset **reproducible**: replay the graph to regenerate with different seeds or updated models, without re-running the full prompt enhancement step.

Extension pattern from `numz/Comfyui-FlowChain` (https://github.com/numz/Comfyui-FlowChain): workflows as nodes in larger workflows. Maps to using `asset_generate_logo` output as input to `asset_generate_splash_screen`.

---

## 7. fal-ai/fal-js — Async Queue with Position Tracking

**URL:** https://github.com/fal-ai/fal-js  
**Stars:** 174

Exposes three methods: `fal.run()` (sync-ish, holds connection), `fal.submit()` (fire-and-forget, returns queue ID), `fal.subscribe()` (submit + poll + event callbacks). The `subscribe` pattern emits `IN_QUEUE` position updates so UX can show progress without polling.

For prompt-to-asset `api` mode with fal.ai as the GPU provider: use `fal.subscribe` with queue events fed to the MCP server's streaming response. The user sees "Position 3 in queue" → "Generating…" → "Complete" without a silent hang.

---

## 8. replicate/replicate-javascript — Webhook-Based Async + FileOutput

**URL:** https://github.com/replicate/replicate-javascript  
**Stars:** ~1.3k

Four async patterns: `replicate.run()` (sync API, low latency for Flux-schnell), `replicate.stream()` (async generator of SSE events), `replicate.predictions.create()` (returns prediction object immediately, poll separately), webhook callbacks for serverless environments.

The `FileOutput` type (implements `ReadableStream`) lets you pipe generated image bytes directly to disk or through a matte pipeline without buffering the full image in memory. Pattern: `predictions.create()` → webhook fires on completion → `asset_ingest_external()` called automatically. This removes the human step from `external_prompt_only` mode when the user has a Replicate API key but no direct model API key.

---

## 9. kingnobro/Chat2SVG — Three-Stage LLM+Diffusion SVG Pipeline

**URL:** https://github.com/kingnobro/Chat2SVG  
**Stars:** 226 (CVPR 2025)

Three sequential stages: (1) LLM generates SVG template from text, (2) SDXL+ControlNet adds visual detail and new shapes via SDEdit, (3) SVG VAE optimizes path geometry. Key finding: **LLM-authored SVG is a valid first-pass substrate**, not the finished product. The diffusion model fixes the visual gaps that LLM geometry cannot produce.

For prompt-to-asset `inline_svg` mode: the LLM-authored SVG is the deliverable (no diffusion step). This is appropriate for logos and icons (≤40 paths, geometric) but Chat2SVG confirms the LLM step alone is insufficient for illustration-quality marks — that requires the `api` or `external_prompt_only` path.

Directory structure: `1_template_generation/`, `2_detail_enhancement/`, `3_svg_optimization/`

---

## 10. joanrod/star-vector — SVG as Code Generation (4.4k stars)

**URL:** https://github.com/joanrod/star-vector  
**Stars:** 4.4k

StarVector uses a vision-language model to convert images or text directly to SVG code, treating vectorization as a code generation task rather than curve fitting. Image encoder → visual tokens → StarCoder-based LLM → SVG code. Supports both image-to-SVG (vectorization) and text-to-SVG (generation).

Relevant to `asset_vectorize`: StarVector's semantic approach produces compact, semantically meaningful SVG (ellipses, polygons with intent) vs. potrace/vtracer which produce masses of bezier curves approximating raster pixels. A StarVector-backed `asset_vectorize` would produce smaller, more editable files.

---

## 11. shinpr/mcp-image — Prompt Enhancement Pattern in MCP

**URL:** https://github.com/shinpr/mcp-image  
**Stars:** 100

Single `generate_image` tool that internally runs a two-stage pipeline: Gemini 2.5 Flash enhances the prompt using a Subject-Context-Style framework, then routes to a quality preset (fast/balanced/quality) mapped to different Gemini model variants. Enhancement is automatic but can be disabled via env var.

Pattern for prompt-to-asset: `asset_enhance_prompt` already does this, but shinpr's public/private preset mapping (fast=Flash, quality=Pro) is a clean pattern for exposing cost/quality tradeoffs to users without exposing model names.

---

## 12. OmniSVG — End-to-End Multimodal SVG Generation

**URL:** https://github.com/OmniSVG/OmniSVG  
**Stars:** 2.5k (NeurIPS 2025)

First VLM-native SVG generator. Three model sizes (3B, 4B, 8B). Supports text-to-SVG and image-to-SVG in a single model pass, no separate vectorization step. Output quality covers icons to complex anime characters.

For prompt-to-asset: OmniSVG or a similar hosted endpoint could replace the LLM-author path for `inline_svg` mode on complex marks, removing the ≤40 path constraint. Not currently available as an API; worth tracking for when it appears on fal.ai or Replicate.

---

## Summary Table

| Repo | Stars | Key Pattern | Applicable To |
|---|---|---|---|
| openai/openai-agents-python | — | Parallelization, judge, routing, handoffs | Orchestration, validation loop |
| microsoft/autogen | 40k+ | SelectorGroupChat, async messages | Multi-provider dispatch |
| langchain-ai/langgraph | 10k+ | Checkpointed state machine | Fault-tolerant pipeline |
| lm-sys/RouteLLM | 4.8k | Threshold routing with cost model | Provider selection |
| huggingface/diffusers | 27k | Modular composable blocks | Pipeline step design |
| comfyanonymous/ComfyUI | 65k+ | Workflow-as-JSON graph | Reproducible asset bundles |
| fal-ai/fal-js | 174 | subscribe() queue events | async GPU UX |
| replicate/replicate-javascript | 1.3k | FileOutput stream, webhook | serverless api mode |
| kingnobro/Chat2SVG | 226 | LLM template + diffusion detail | inline_svg scope |
| joanrod/star-vector | 4.4k | SVG as code generation | asset_vectorize backend |
| shinpr/mcp-image | 100 | Two-stage prompt enhancement in MCP | asset_enhance_prompt |
| OmniSVG/OmniSVG | 2.5k | VLM-native SVG | future inline_svg upgrade |
