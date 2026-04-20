# Key Takeaways: Agentic Orchestration for prompt-to-asset

Distilled from the 24f survey. Each takeaway is concrete and tied to a specific implementation decision.

---

## 1. The Judge Loop Is the Right Validation Architecture

`openai-agents-python`'s `llm_as_a_judge.py` formalizes the pattern: generate → evaluate → regenerate if below threshold → accept. This is exactly how prompt-to-asset's tier-0 validation should work. Currently, `asset_validate` is a one-shot check that reports failures. It should be a node in a loop: if alpha channel is absent, trigger `asset_remove_background`; if OCR Levenshtein > 1, return to the prompt enhancement step with the failure mode as additional context. The loop exits on pass or after N retries. The retry limit prevents infinite spend.

Implementation: wrap the existing `asset_validate` call in a LangGraph conditional edge that routes back to the generation node on failure with a `retry_context` field carrying the specific failure mode (checkerboard FFT detected, safe-zone bbox fail, etc.).

---

## 2. Checkpointed Pipelines Eliminate Duplicate API Spend

LangGraph's state checkpointing (https://github.com/langchain-ai/langgraph) saves state after every node execution. For a three-step `api` mode pipeline — generate (expensive) → matte (cheap) → vectorize (cheap) — a crash on the vectorize step currently requires re-running the generation step. With checkpointing it does not. On a $0.08/image model, a pipeline that crashes 20% of the time wastes $0.016 per asset on average. At scale that compounds. The langgraph-js TypeScript SDK makes this directly applicable to the prompt-to-asset server.

Concrete action: persist the raw generation output URL/bytes to the content-addressed store immediately after the API call returns, before any post-processing begins. If the server crashes mid-pipeline, `asset_ingest_external` can resume from that saved artifact.

---

## 3. Capability Routing Is Binary, Not Probabilistic

RouteLLM (https://github.com/lm-sys/RouteLLM, 4.8k stars) routes on difficulty scores. Prompt-to-asset routing is different: it is a capability dispatch, not a quality dispatch. The routing table in `data/routing-table.json` should encode hard capability flags:

- `requires_alpha` → `gpt-image-1` with `background: "transparent"`, or Ideogram 3 Turbo with `style: "transparent"`, or Recraft V3; else BiRefNet post-process
- `requires_vector` → Recraft V3 native SVG, or LLM-author SVG (≤40 paths), or raster→BiRefNet→vtracer
- `requires_text_render` → `gpt-image-1` or Ideogram 3 (≤3 words), else composite SVG/Canvas typography

RouteLLM's architecture still applies for the `api` mode key-availability fallback chain: structure the provider selection as a router that checks capability flags first, then falls back through available providers in cost order.

---

## 4. Diffusers' Block Pattern Is the Right Model for Pipeline Primitives

The Modular Diffusers redesign (https://huggingface.co/blog/modular-diffusers) defines blocks with explicit `inputs`, `intermediate_outputs`, and `expected_components`. Each `asset_*` tool in the MCP surface is already close to this pattern. The gap: currently there is no typed intermediate state — tools accept and return opaque blobs. Adding typed intermediate state (e.g., `MatteResult`, `VectorResult`, `ValidationResult`) would allow blocks to be reordered without integration work, and would make the `ComponentsManager` memory management pattern applicable (avoid holding full-resolution PNGs in memory during long pipelines).

---

## 5. Workflows Should Be Serializable and Replayable

ComfyUI (https://github.com/comfyanonymous/ComfyUI, ~65k stars) stores entire generation workflows as JSON graphs embedded in output images. Every generated asset is trivially reproducible. Prompt-to-asset's `AssetBundle` stores paths but not the full pipeline graph. Adding a `workflow_graph.json` to each bundle — recording which provider was called, which prompts were used, which post-processing steps ran — enables: (a) exact reproduction with a different seed, (b) partial re-runs (re-matte only), (c) audit trail for brand compliance.

The `numz/Comfyui-FlowChain` extension (https://github.com/numz/Comfyui-FlowChain) shows how to use workflow outputs as inputs to other workflows. The equivalent in prompt-to-asset: `asset_generate_logo` output's `master.svg` passed as `existing_mark_svg` to `asset_generate_splash_screen`, with the dependency recorded in the bundle graph.

---

## 6. The SVG Generation Ceiling Is Well-Defined

Three repos now prove where LLM-authored SVG breaks down:

- Chat2SVG (https://github.com/kingnobro/Chat2SVG, 226 stars, CVPR 2025): LLM produces a skeleton template, diffusion adds detail. The LLM step alone is insufficient for complex marks.
- StarVector (https://github.com/joanrod/star-vector, 4.4k stars): treats vectorization as code generation, produces semantically compact SVG vs. bezier floods from potrace.
- OmniSVG (https://github.com/OmniSVG/OmniSVG, 2.5k stars, NeurIPS 2025): VLM-native, handles icons to complex characters in a single pass.

Current `inline_svg` mode scope (logos, favicons, icon packs, simple marks, ≤40 paths) is correct given that only a local LLM is available. For higher complexity, the path is `external_prompt_only` or `api`. StarVector as a hosted `asset_vectorize` backend would produce better files than potrace when it becomes available via API.

---

## 7. MCP Tool Design: One Tool Per Atomic Operation

`shinpr/mcp-image` (https://github.com/shinpr/mcp-image, 100 stars) and `GongRzhe/Image-Generation-MCP-Server` (archived, 51 stars) both expose a single monolithic `generate_image` tool that does everything internally. This makes the tool opaque and non-composable. Prompt-to-asset's 16-tool surface (separate `asset_generate_*`, `asset_remove_background`, `asset_vectorize`, `asset_validate`) is the correct design. Each tool is atomic, individually testable, and composable by any orchestration layer (OpenAI agents, LangGraph, AutoGen) without re-implementing the routing logic.

The lesson from both archived MCP image servers: if a tool hides too much, orchestrators cannot optimize the pipeline.

---

## 8. Async Queue UX Requires Position Feedback

`fal-ai/fal-js` (https://github.com/fal-ai/fal-js) `fal.subscribe()` emits `IN_QUEUE` position events. `replicate/replicate-javascript` (https://github.com/replicate/replicate-javascript) supports webhooks for serverless environments. Both patterns address the same problem: GPU generation takes 5-30 seconds and the user needs progress feedback, not a silent hang.

For prompt-to-asset `api` mode: the MCP tool should return a streaming response with queue position updates when the provider is fal.ai or Replicate, and a synchronous response for OpenAI `gpt-image-1` (which uses the sync API). The `fal.subscribe` event shape (`IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`) is a clean model for the streaming response format.

---

## Bottom Line

The gap between current prompt-to-asset and these repos is not about new features — it is about making the existing pipeline **fault-tolerant, replayable, and composable**. Checkpointing (LangGraph), serialized workflow graphs (ComfyUI), typed intermediate state (diffusers modular), and a judge loop wrapping `asset_validate` (openai-agents-python) address the four most impactful gaps. None require new API keys or new models.
