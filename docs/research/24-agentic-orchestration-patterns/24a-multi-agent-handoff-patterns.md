# 24a — Multi-Agent Handoff Patterns

## What the Pattern Is

A handoff transfers control from one agent to another mid-conversation. The originating agent decides it cannot or should not handle the next step, packages its current context, and routes to a specialist. The specialist then owns the remainder of the interaction—it does not return output to the originator, it responds directly.

The canonical formulation comes from OpenAI's Swarm project (github.com/openai/swarm, released October 2024), which reduced the pattern to two primitives: **Agents** (an instruction set plus a list of tools) and **handoffs** (a function that returns another Agent). The `client.run()` loop runs until no more function calls are issued, switching agents transparently. Swarm is now superseded by the **OpenAI Agents SDK** (openai.github.io/openai-agents-python), which is the production version.

The Agents SDK formalizes two orchestration shapes:
- **Handoffs**: the specialist takes over and produces the final answer. Use when the specialist should own the user-facing response.
- **Agents-as-tools** (`Agent.as_tool()`): the orchestrator calls a specialist and gets back a result, then synthesizes the final answer itself. Use when you need to call multiple specialists and merge outputs.

A third axis is **routing determinism**: hard-coded routing (code decides which agent based on rule) vs. LLM-based routing (the model decides based on task description). LLM routing is more flexible; code routing is faster and cheaper.

The LangGraph Swarm library (github.com/langchain-ai/langgraph-swarm-py) ports the Swarm protocol to LangGraph graphs, enabling handoffs to be expressed as graph edges with full state persistence.

## Key GitHub Repos

- **openai/swarm** — reference implementation; triage_agent and airline examples show multi-step handoff chains
- **openai/openai-agents-python** — production SDK; documents the agents-as-tools vs handoff choice explicitly
- **langchain-ai/langgraph-swarm-py** — LangGraph-native handoff graph
- **avrabyt/Swarm-OpenAI-Agents** — worked examples of handoffs and routines

## Applicability to prompt-to-asset

The prompt-to-asset server routes across providers (gpt-image-1, Ideogram, Recraft, Flux, Imagen) and across asset types (logo, favicon, OG image, etc.). The handoff pattern maps directly:

1. **Triage agent**: receives the user brief, inspects `asset_type` and available API keys, decides the provider. Hands off to the relevant provider agent.
2. **Provider agents** (one per provider): knows that provider's API dialect, parameter constraints, and failure modes. Generates the image and returns the artifact path.
3. **Post-processing agent**: receives the path, runs matte/vectorize/validate, returns the bundle.

The agents-as-tools variant suits the validate-regenerate loop: an orchestrator calls a generation tool, receives the image, calls a validation tool, and decides whether to loop or finalize — keeping the orchestrator in the driver seat throughout.

One practical concern: the `handoff` approach (specialist owns the response) does not work well for looping because the specialist cannot hand back to the orchestrator. Use agents-as-tools when you need re-entry.

## Caveats

- Swarm is explicitly marked educational-only; do not deploy it. Use the Agents SDK.
- LLM-based routing adds latency and cost per request; for a hot path like image generation (already 5–30 s), routing overhead is acceptable but should be benchmarked.
- Context size grows with each handoff step; trim intermediate results before passing to the next agent.
- The OpenAI Agents SDK is Python-first; the JS/TS version (openai-agents-js) exists but lags in documented patterns.

## References

- [openai/swarm](https://github.com/openai/swarm)
- [OpenAI Agents SDK — multi_agent docs](https://openai.github.io/openai-agents-python/multi_agent/)
- [OpenAI Cookbook — Orchestrating Agents: Routines and Handoffs](https://cookbook.openai.com/examples/orchestrating_agents)
- [langchain-ai/langgraph-swarm-py](https://github.com/langchain-ai/langgraph-swarm-py)
- [OpenAI Agents SDK — Handoffs (JS)](https://openai.github.io/openai-agents-js/guides/handoffs/)
