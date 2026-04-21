> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

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

**Core finding**: LangGraph is the closest match to prompt-to-asset's needs: conditional edges implement the validate-or-retry branch deterministically, checkpointing enables resume-on-failure without image regeneration, and subgraphs support multi-asset fan-out. As of April 2026, LangGraph is at **v1.1.8** (Python) / **v1.2.9** (TypeScript `@langchain/langgraph`), with full feature parity and 42k+ weekly npm downloads — the previous caveat about the JS port lagging is no longer accurate. **AutoGen v0.4 is in maintenance mode; do not start new projects on it.** Microsoft Agent Framework 1.0 (GA April 3, 2026) is the production successor. CrewAI v1.9.x hierarchical manager still has active delegation bugs as of March 2026 (GitHub issue #4783); do not rely on it for critical routing.

**Implementation priority**: Medium-High — LangGraph is not strictly required (a hand-rolled state machine with `switch` and retry counter achieves the same for a simpler pipeline), but it becomes valuable once the pipeline exceeds 5 nodes or requires checkpointing and human-in-the-loop.

---

## Key Cross-Cutting Findings

1. **MCP-native orchestration is underserved.** The lastmile-ai/mcp-agent library is the only repo found that implements multi-agent patterns (parallel, evaluator-optimizer, swarm, orchestrator) natively over MCP tool calls. It is Python-only; no equivalent TypeScript library was found.

2. **LLM routing vs. code routing.** For provider selection in prompt-to-asset, code-based routing (deterministic rules from `data/routing-table.json`) is faster, cheaper, and more auditable than LLM-based routing. Reserve LLM routing for the rare case where the asset brief is genuinely ambiguous about type.

3. **Validation scores enable deterministic control flow.** The tier-0 checks (alpha, FFT, Levenshtein, ΔE2000) produce numeric scores. This makes retry/accept decisions deterministic, not LLM-opinion-based — which is both cheaper and more reproducible.

4. **State should contain paths, not pixels.** Across all patterns, generated image data should be written to disk immediately after generation. Pass file paths through agent state, not base64 blobs.

5. **The OpenAI Agents SDK supersedes Swarm** and is the current recommended path for handoff-based routing. April 2026 update added native sandbox execution and a model-native harness (Python-first; TypeScript planned). The Assistants API is being deprecated mid-2026 — do not build retry/fallback chains against it.

> **Updated 2026-04-21:**

6. **MCP transport: SSE is dead.** SSE transport stopped being accepted by Claude connectors on April 1, 2026. All MCP infrastructure must use **Streamable HTTP** (MCP spec 2025-11-25 is the latest stable; 2025-03-26 is not current). Streamable HTTP uses a single POST endpoint and works on serverless platforms.

7. **Claude model references.** Current active Claude models (April 2026): **Haiku 4.5**, **Sonnet 4.6**, **Opus 4.7** (released April 16, 2026). Claude 4.0-series aliases retire June 15, 2026. Update any orchestration code that hard-codes `claude-3`, `claude-2`, or `claude-3.5-sonnet` model strings.

8. **Claude Structured Output is GA.** No beta header needed. Use `output_config: { format: { type: "json_schema", schema: {...} } }`. The old `output_format` field and `anthropic-beta: structured-outputs-2025-11-13` header still work during a transition period only.

9. **Gemini CLI has full hooks + native MCP.** As of v0.26.0, Gemini CLI has: a full hooks system (SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, BeforeToolSelection, PreCompress — hooks are enabled by default), and native MCP server support via `mcpServers` in `settings.json`. Any docs that say Gemini CLI lacks hooks or MCP are outdated.

10. **Claude Agent SDK is formally released.** Available since September 29, 2025 (renamed from Claude Code SDK; stable release that date). Both Python (`claude-agent-sdk`) and TypeScript (`@anthropic-ai/claude-agent-sdk`) are actively maintained. Supports subagents with isolated context windows, parallel task fan-out, and structured outputs — a first-class option for Claude-native multi-agent orchestration alongside LangGraph and the OpenAI Agents SDK.
