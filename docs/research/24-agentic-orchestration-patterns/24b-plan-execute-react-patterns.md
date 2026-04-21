# 24b — Plan-and-Execute, ReAct, and Reflection Patterns

## What the Patterns Are

Three distinct reasoning loops dominate current agentic pipeline design. They differ in when planning happens and how the agent adapts to intermediate results.

### ReAct (Reason + Act)

ReAct interleaves thinking and acting in a tight loop: **Thought → Action → Observation → Thought → ...** until done. The agent does not commit to a plan upfront — each observation influences the next thought. This is the default mode for LangGraph tool-calling agents and the OpenAI Agents SDK's `Runner`. It is well-suited to tasks where intermediate observations are cheap to obtain and meaningfully affect the next step.

For asset generation, a ReAct agent would: think about which provider to call, call it, observe the result (or error), think about what validation to run, run it, observe the score, think about whether to regenerate. Each step informs the next, so a 429 from Ideogram can be incorporated in the same loop iteration.

### Plan-and-Execute

The agent first produces a full plan (a list of steps), stores it in state, then executes each step in sequence. Errors within a step trigger local retry; a step can update remaining plan steps before proceeding.

Advantages: the plan can be validated before any expensive API calls are made. A pre-execution review step ("does this plan respect the no-negative-prompt rule for Flux?") catches category errors before they consume credits.

Disadvantages: if the plan was wrong about an early step (e.g., assumed an API key is present), the remaining steps may be invalid and require replanning, which often costs as much as a full ReAct trace.

### ReWOO (Reasoning Without Observation)

ReWOO decouples the planning phase from execution entirely. The Planner LLM produces all tool calls up front — including exact parameters — using placeholders for outputs of prior steps. Workers execute in sequence filling in the placeholders. A Solver LLM synthesizes the final answer.

Per IBM's documentation, this reduces token usage by 5–10x compared to a complex ReAct trace because the model does not see intermediate observations. The hard cost: if the initial plan is wrong, there is no in-loop correction mechanism.

### Reflection

Reflection adds a self-evaluation step after generation. The agent (or a separate critic LLM) inspects its own output against explicit criteria and decides whether to accept or re-run. The key discipline: "retrying without context enrichment" produces identical failures. Each retry should modify the prompt — injecting the validation error, reducing scope, or switching provider — not simply re-submit.

Reflection is implemented in LangGraph via conditional edges: a `quality_check` node returns "accept" or "retry", and a conditional edge routes accordingly, with a `max_retries` counter as a hard stop.

## Key GitHub Repos

- **langchain-ai/langgraph** (github.com/langchain-ai/langgraph) — conditional edges and loop-with-counter are native primitives
- **agent-patterns** (agent-patterns.readthedocs.io) — documents ReWOO as a first-class pattern with worked code
- **lastmile-ai/mcp-agent** (github.com/lastmile-ai/mcp-agent) — implements `create_evaluator_optimizer_llm(...)` which is reflection over MCP tool calls
- **lalanikarim/langgraph-mcp-pipeline** (github.com/lalanikarim/langgraph-mcp-pipeline) — LangGraph + MCP image generation pipeline with human-in-the-loop at the reflection step

> **Updated 2026-04-21:** LangGraph is at **v1.1.8** (released April 17, 2026; v1.0 GA October 2025). The `stream(version="v2")` API now returns typed `StreamPart` objects with `type`, `ns`, and `data` keys. `invoke(version="v2")` returns a `GraphOutput` with `.value` and `.interrupts`. Both are opt-in and backwards-compatible. The v1.1.x line dropped Python 3.9 and added Python 3.14 compatibility. The TypeScript port (`@langchain/langgraph`) is at v1.2.9 with 42k+ weekly npm downloads — full feature parity with Python confirmed.

## Applicability to prompt-to-asset

| Pattern | Where it fits |
|---|---|
| **ReAct** | Primary generation loop: generate → validate → decide next action inline |
| **Plan-and-Execute** | Multi-asset requests ("generate a full brand kit"): plan the asset list upfront, execute each |
| **ReWOO** | Batch generation jobs where token efficiency matters and provider choices are known upfront |
| **Reflection** | Validation gate: after generation, a critic checks alpha channel, safe-zone bbox, OCR Levenshtein — routes to retry if any fail |

The reflection node is particularly important: the validation stack (alpha present, no checkerboard FFT, Levenshtein ≤1, ΔE2000 ≤10) provides machine-checkable criteria, making reflection deterministic rather than LLM-opinion-based. Pass the specific failure (e.g., "checkerboard detected at FFT peak 0.97") back into the next generation prompt.

## Caveats

- ReWOO's fixed plan is brittle for asset generation: provider availability changes at runtime (rate limits, outages), so the plan may be invalid before step 2 executes. Use Plan-and-Execute or ReAct instead.
- The reflection loop must have a hard iteration cap (typically 3). Without it, a permanently failing provider will loop until context exhaustion.
- In LangGraph, cycles are supported but you must add explicit stop conditions via state fields, not just rely on the LLM to decide to stop.

## References

- [LangGraph overview — langchain.com](https://docs.langchain.com/oss/python/langgraph/overview)
- [LangGraph 1.0 GA — LangChain Changelog](https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available)
- [Advanced LangGraph: Conditional Edges — dev.to](https://dev.to/jamesli/advanced-langgraph-implementing-conditional-edges-and-tool-calling-agents-3pdn)
- [ReWOO pattern — agent-patterns.readthedocs.io](https://agent-patterns.readthedocs.io/en/stable/patterns/rewoo.html)
- [ReWOO — IBM](https://www.ibm.com/think/topics/rewoo)
- [ReAct vs ReWOO — Source Allies](https://www.sourceallies.com/2024/08/react-vs-rewoo/)
- [Agentic Reflection — aimon.ai](https://www.aimon.ai/posts/building-ai-agents-with-reflection-pattern/)
- [lalanikarim/langgraph-mcp-pipeline](https://github.com/lalanikarim/langgraph-mcp-pipeline)
- [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent)
