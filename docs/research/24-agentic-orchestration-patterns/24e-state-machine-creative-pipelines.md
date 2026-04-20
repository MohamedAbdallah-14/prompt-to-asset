# 24e — State Machine Patterns for Creative Pipelines

## What the Pattern Is

A state machine pipeline models the creative workflow as a directed graph of nodes (processing steps) connected by typed edges (transition conditions). Shared state — a typed object — is passed through the graph, read by each node, mutated, and written back. This differs from a simple function chain: edges can be conditional (route to retry, accept, or human-review based on validation score), and cycles are explicit and bounded by state fields (e.g., `retry_count < 3`).

LangGraph (github.com/langchain-ai/langgraph), released early 2024 and maintained by LangChain, is the dominant implementation. Its core model:

- **State**: a TypedDict (Python) or typed object (JS) that persists through the entire graph run. Every node reads from it and writes to it.
- **Nodes**: pure functions that receive state and return a partial state update.
- **Edges**: either direct (always go from node A to node B) or conditional (a function inspects state and returns the name of the next node to execute, enabling cycles and branching).
- **Checkpointing**: built-in persistence of state at each step, enabling resume-on-failure and human-in-the-loop interrupts.

Microsoft AutoGen v0.4 (released January 2025, github.com/microsoft/autogen) takes a different approach: instead of a graph, it implements an **actor model** over asynchronous message passing. Agents are actors that receive messages, perform work, and emit messages. The `SelectorGroupChat` and `RoundRobinGroupChat` team types in AutoGen's AgentChat layer approximate a state machine at the team coordination level. AutoGen is better suited to dynamic, open-ended agent conversations; LangGraph is better suited to structured, auditable pipelines.

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

AutoGen v0.4's `SelectorGroupChat` is a useful pattern for the provider selection step when provider selection logic is complex and benefits from LLM reasoning — but it is not yet stable enough in TypeScript for production. Prefer deterministic routing for now.

## Caveats

- LangGraph is Python-first. The JS port (github.com/langchain-ai/langgraphjs) exists and is actively maintained but has fewer documented examples. Verify the specific APIs you need (subgraphs, streaming) are available in the JS version before committing to LangGraph for a TypeScript MCP server.
- State machines expose all intermediate state, which is useful for debugging but means large binary blobs (image data) should never live in state — only file paths should.
- AutoGen v0.4 is undergoing migration to the Microsoft Agent Framework (learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/). Check migration status before adopting AutoGen v0.4 patterns.
- CrewAI's hierarchical process has known issues with task delegation to wrong agents (community.crewai.com discussion #3179). Do not rely on the manager agent for critical routing decisions without explicit role constraints.

## References

- [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph)
- [lalanikarim/langgraph-mcp-pipeline](https://github.com/lalanikarim/langgraph-mcp-pipeline)
- [AutoGen v0.4 blog — Microsoft Research](https://www.microsoft.com/en-us/research/blog/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)
- [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent)
- [CrewAI Hierarchical Process](https://docs.crewai.com/en/learn/hierarchical-process)
- [LangGraph Best Practices — swarnendu.de](https://www.swarnendu.de/blog/langgraph-best-practices/)
- [LangGraph review 2025 — sider.ai](https://sider.ai/blog/ai-tools/langgraph-review-is-the-agentic-state-machine-worth-your-stack-in-2025)
