# Research Area 24 — Agentic Orchestration Patterns
## Index

This area covers orchestration patterns applicable to the prompt-to-asset MCP server, which routes image generation requests across multiple AI model providers (gpt-image-1, Ideogram, Recraft, Flux, Imagen), validates outputs, and runs post-processing pipelines.

---

### [24a — Multi-Agent Handoff Patterns](./24a-multi-agent-handoff-patterns.md)

**Pattern**: One agent transfers control to a specialist agent mid-workflow.

**Key sources**: OpenAI Swarm (github.com/openai/swarm, superseded), OpenAI Agents SDK (production), langchain-ai/langgraph-swarm-py.

**Core finding**: Two distinct shapes exist — handoffs (specialist owns the response) vs. agents-as-tools (orchestrator calls specialist as a tool and retains control). For prompt-to-asset, agents-as-tools is preferred because the validate-regenerate loop requires re-entry to the orchestrator. The handoff pattern is appropriate for the triage step (routing brief → provider agent) but not for loops.

**Implementation priority**: High — the provider routing decision (which API to call based on asset type and available keys) maps exactly to a triage → handoff chain.

---

### [24b — Plan-and-Execute, ReAct, and Reflection Patterns](./24b-plan-execute-react-patterns.md)

**Pattern**: Three reasoning loop architectures for multi-step tasks.

**Key sources**: langchain-ai/langgraph conditional edges, agent-patterns.readthedocs.io (ReWOO), lastmile-ai/mcp-agent (evaluator-optimizer), lalanikarim/langgraph-mcp-pipeline.

**Core finding**: ReAct is the right default for single-asset generation (tight observe-act loop handles provider errors inline). Plan-and-Execute is correct for multi-asset brand kit requests (plan the asset list, validate the plan, then execute). ReWOO is too brittle — its fixed upfront plan breaks when provider availability changes mid-execution. Reflection (generate → validate → critique → retry-with-enriched-prompt) is the correct structure for the validation gate, and the prompt-to-asset tier-0 checks give it deterministic rather than LLM-opinion-based criteria.

**Implementation priority**: High — the reflection loop with enriched retry prompt is the primary quality control mechanism.

---

### [24c — Parallel Fan-Out and Best-of-N Selection](./24c-parallel-fan-out-best-of-n.md)

**Pattern**: Distribute generation to N providers/calls in parallel, pick the best result.

**Key sources**: OpenAI Agents SDK Cookbook (parallel_agents), Google ADK ParallelAgent, lastmile-ai/mcp-agent (create_parallel_llm).

**Core finding**: `Promise.allSettled` fan-out to multiple providers simultaneously collapses latency to the slowest single call. Selection uses the existing validation scores (ΔE2000, Levenshtein) — no LLM needed for the fan-in step. API cost multiplies by N, so gate behind a `best_of_n` flag. Cap at 3 parallel providers; beyond that, merge overhead exceeds latency savings. Per-provider rate limits apply concurrently, so the same provider account should not be called more than once per parallel group.

**Implementation priority**: Medium — valuable for premium-tier requests; not suitable as the default path due to cost multiplication.

---

### [24d — Retry and Fallback Agent Chains](./24d-retry-fallback-agent-chains.md)

**Pattern**: Layered failure recovery: retry with backoff, circuit breaker, fallback provider chain, context-enriched re-prompt.

**Key sources**: Portkey AI (portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps), Mindra.co fault-tolerant agents, fast.io retry patterns guide.

**Core finding**: Four error categories require different responses (transient, rate limit, server error, permanent semantic failure). A single retry loop that does not distinguish these wastes credits and misses recoveries. The circuit breaker must operate at the provider level with external state (Redis) for multi-process MCP servers. Context-enriched retry (inject the failure message into the next prompt before retrying) is critical; identical re-submission of a failed prompt produces identical failure. The routing table in `data/routing-table.json` should encode the fallback chain per asset type.

**Implementation priority**: High — this is a baseline reliability requirement for any production image generation pipeline.

---

### [24e — State Machine Patterns for Creative Pipelines](./24e-state-machine-creative-pipelines.md)

**Pattern**: Model the full asset lifecycle as a directed graph of typed nodes and conditional edges with shared persistent state.

**Key sources**: langchain-ai/langgraph (primary), microsoft/autogen v0.4 (actor model / SelectorGroupChat), crewAIInc/crewAI (hierarchical process), lastmile-ai/mcp-agent (evaluator-optimizer MCP-native loop).

**Core finding**: LangGraph is the closest match to prompt-to-asset's needs: conditional edges implement the validate-or-retry branch deterministically, checkpointing enables resume-on-failure without image regeneration, and subgraphs support multi-asset fan-out. The JS port (langgraphjs) is needed for a TypeScript MCP server and lags in documented examples — verify subgraph support before committing. AutoGen v0.4's actor model is a good conceptual fit for multi-provider event-driven coordination but is migrating to Microsoft Agent Framework, making it a risky dependency. CrewAI's hierarchical manager has delegation bugs in production; do not rely on it for critical routing.

**Implementation priority**: Medium-High — LangGraph is not strictly required (a hand-rolled state machine with `switch` and retry counter achieves the same for a simpler pipeline), but it becomes valuable once the pipeline exceeds 5 nodes or requires checkpointing and human-in-the-loop.

---

## Key Cross-Cutting Findings

1. **MCP-native orchestration is underserved.** The lastmile-ai/mcp-agent library is the only repo found that implements multi-agent patterns (parallel, evaluator-optimizer, swarm, orchestrator) natively over MCP tool calls. It is Python-only; no equivalent TypeScript library was found.

2. **LLM routing vs. code routing.** For provider selection in prompt-to-asset, code-based routing (deterministic rules from `data/routing-table.json`) is faster, cheaper, and more auditable than LLM-based routing. Reserve LLM routing for the rare case where the asset brief is genuinely ambiguous about type.

3. **Validation scores enable deterministic control flow.** The tier-0 checks (alpha, FFT, Levenshtein, ΔE2000) produce numeric scores. This makes retry/accept decisions deterministic, not LLM-opinion-based — which is both cheaper and more reproducible.

4. **State should contain paths, not pixels.** Across all patterns, generated image data should be written to disk immediately after generation. Pass file paths through agent state, not base64 blobs.

5. **The OpenAI Agents SDK supersedes Swarm** and is the current recommended path for handoff-based routing. The JS version is available at openai.github.io/openai-agents-js but lags the Python version in examples.
