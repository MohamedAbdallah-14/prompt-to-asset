# 24e — State Machine Patterns for Creative Pipelines

## What the Pattern Is

A state machine pipeline models the creative workflow as a directed graph of nodes (processing steps) connected by typed edges (transition conditions). Shared state — a typed object — is passed through the graph, read by each node, mutated, and written back. This differs from a simple function chain: edges can be conditional (route to retry, accept, or human-review based on validation score), and cycles are explicit and bounded by state fields (e.g., `retry_count < 3`).

LangGraph (github.com/langchain-ai/langgraph), released early 2024 and reaching v1.0 GA in October 2025, is the dominant implementation. Current version: **v1.1.8** (April 17, 2026). Its core model:

- **State**: a TypedDict (Python) or typed object (JS) that persists through the entire graph run. Every node reads from it and writes to it.
- **Nodes**: pure functions that receive state and return a partial state update.
- **Edges**: either direct (always go from node A to node B) or conditional (a function inspects state and returns the name of the next node to execute, enabling cycles and branching).
- **Checkpointing**: built-in persistence of state at each step, enabling resume-on-failure and human-in-the-loop interrupts.

Microsoft AutoGen v0.4 (released January 2025, github.com/microsoft/autogen) takes a different approach: instead of a graph, it implements an **actor model** over asynchronous message passing. Agents are actors that receive messages, perform work, and emit messages. The `SelectorGroupChat` and `RoundRobinGroupChat` team types in AutoGen's AgentChat layer approximate a state machine at the team coordination level. AutoGen is better suited to dynamic, open-ended agent conversations; LangGraph is better suited to structured, auditable pipelines.

> **Updated 2026-04-21:** AutoGen is now officially in **maintenance mode** — bug fixes and security patches only, no new features. Microsoft Agent Framework (MAF) 1.0 reached GA on April 3, 2026, merging AutoGen and Semantic Kernel into a single production-ready framework with graph-based workflows, MCP support, checkpointing, and human-in-the-loop. New projects should target MAF, not AutoGen v0.4. Migration guide: learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/

CrewAI (github.com/crewaiinc/crewai) sits between the two: it offers sequential and hierarchical processes over named tasks. The hierarchical process introduces a manager agent that allocates tasks to worker agents and validates outputs, approximating a simple state machine with a quality gate.

The **lastmile-ai/mcp-agent** library (github.com/lastmile-ai/mcp-agent) exposes `create_evaluator_optimizer_llm(...)`, which is a tight state-machine loop over MCP tool calls: generate → evaluate → if not approved, regenerate with feedback → repeat. This is the most directly MCP-native implementation found.

## Key GitHub Repos

- **langchain-ai/langgraph** — state machine graphs with conditional edges, checkpointing, and cycles
- **lalanikarim/langgraph-mcp-pipeline** — LangGraph + MCP image generation pipeline with human-in-the-loop state
- **microsoft/autogen** — actor model with team patterns (SelectorGroupChat for dynamic routing)
- **lastmile-ai/mcp-agent** — MCP-native evaluator-optimizer loop
- **crewAIInc/crewAI** — hierarchical process with manager-as-quality-gate

## Applicability to prompt-to-asset

The asset generation lifecycle maps cleanly to a LangGraph state graph:

```
[enhance_prompt]
      |
      v
[select_provider]  <-- conditional: checks API keys, routing table
      |
      v
[generate_asset]
      |
      v
[validate_asset]  -- "accept" --> [post_process] --> [export_bundle] --> END
      |
   "retry"
      |
      v
[retry_or_fallback]  -- retry_count < 3 --> [generate_asset]
                     -- retry_count >= 3 --> [fallback_provider] or [human_escalation]
```

State fields include: `asset_type`, `brief`, `enhanced_prompt`, `provider_selected`, `generated_image_path`, `validation_result`, `retry_count`, `bundle_paths`.

The conditional edge from `validate_asset` is pure: if `validation_result.passed`, route to `post_process`; else increment `retry_count`, inject failure into the next prompt, route to `retry_or_fallback`. No LLM needed for routing at this node — it is a deterministic check against the tier-0 validation scores.

LangGraph's checkpointing is directly useful: if the export_bundle node fails (e.g., disk full), the run can resume from the last checkpoint without regenerating the image.

For multi-asset requests (brand kit: logo + favicon + OG image), a parent graph fans out to sub-graphs, one per asset type, using LangGraph's subgraph support. Each sub-graph is the single-asset state machine above.

AutoGen v0.4's `SelectorGroupChat` is a useful pattern for the provider selection step when provider selection logic is complex and benefits from LLM reasoning — but AutoGen is in maintenance mode. The equivalent in Microsoft Agent Framework 1.0 is its group-chat orchestration mode. Prefer deterministic routing for prompt-to-asset's hot path regardless of framework.

> **Updated 2026-04-21:** Anthropic's **Claude Agent SDK** (released September 2025 as a rename of Claude Code SDK; available at platform.claude.com/docs/en/agent-sdk/overview) is a first-class option for Claude-native orchestration. It supports subagents with isolated context windows, parallel task fan-out, and structured outputs — directly applicable to the multi-provider fan-out pattern. Both Python and TypeScript SDKs are actively maintained (weekly releases as of April 2026).

## Caveats

- LangGraph JS (github.com/langchain-ai/langgraphjs, `@langchain/langgraph` on npm) reached **full feature parity** with Python in 2025 and hit v1.0 stable in October 2025 alongside the Python release. As of April 2026 it is at v1.2.9 and sees 42k+ weekly npm downloads. Subgraphs, checkpointing, streaming (`stream(version="v2")` typed API), and conditional edges are all available. The caveat about JS lagging is no longer accurate.
- State machines expose all intermediate state, which is useful for debugging but means large binary blobs (image data) should never live in state — only file paths should.
- **Do not adopt AutoGen v0.4 for new projects.** AutoGen is in maintenance mode (bug fixes only). Use Microsoft Agent Framework 1.0 (GA April 2026) instead, which incorporates AutoGen patterns with enterprise-grade stability.
- CrewAI's hierarchical process has persistent documented problems: the manager does not enforce true delegation — tasks still execute sequentially with weak LLM-based orchestration. The issue predates 2025 and has not been architecturally resolved as of v1.9 (January 2026). Do not rely on the manager agent for critical routing decisions.

> **Updated 2026-04-21:** The **Google A2A (Agent-to-Agent) protocol** (launched April 2025, v1.0 early 2026) is now a key complement to MCP for multi-agent orchestration. MCP exposes tools to agents; A2A handles agent-to-agent delegation and communication. For prompt-to-asset, MCP remains the right tool layer, but a multi-agent deployment spanning provider-specialist agents would benefit from A2A for handoff signaling. Both protocols are under the Linux Foundation's Agentic AI Foundation (AAIF) as of December 2025.

## References

- [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- [langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs)
- [LangGraph 1.0 GA — LangChain Blog](https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available)
- [lalanikarim/langgraph-mcp-pipeline](https://github.com/lalanikarim/langgraph-mcp-pipeline)
- [AutoGen v0.4 blog — Microsoft Research](https://www.microsoft.com/en-us/research/blog/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)
- [Microsoft Agent Framework 1.0 Overview](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [Migration Guide: AutoGen → Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/)
- [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent)
- [CrewAI Hierarchical Process](https://docs.crewai.com/en/learn/hierarchical-process)
- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Google Agent2Agent Protocol announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [LangGraph Best Practices — swarnendu.de](https://www.swarnendu.de/blog/langgraph-best-practices/)
