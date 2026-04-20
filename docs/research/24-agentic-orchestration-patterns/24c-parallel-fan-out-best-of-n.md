# 24c — Parallel Fan-Out and Best-of-N Selection

## What the Pattern Is

The fan-out/fan-in pattern distributes independent subtasks to multiple agents in parallel, then aggregates their outputs via a meta-agent or scoring function. It is also called scatter-gather, map-reduce, and parallel agent processing. The primary motivation is latency: image generation takes 5–30 seconds per call, so generating N variants sequentially is 5–30N seconds; fan-out collapses that to the slowest single call.

The pattern has two implementation shapes:

**AsyncIO fan-out**: Launch all generation calls concurrently and await all results:

```python
responses = await asyncio.gather(
    *(run_agent(provider_agent, prompt) for provider_agent in providers)
)
```

This is fully deterministic in execution order and imposes no planning overhead.

**Agents-as-tools fan-out**: A meta-agent registers each specialist as a tool and calls them in whatever order the model decides. More flexible — the model can skip providers it deems unlikely to succeed — but adds an extra LLM call for planning and is non-deterministic in execution order.

The OpenAI Agents SDK Cookbook documents both approaches in the parallel_agents example, noting the trade-offs: asyncio is lower-latency for a fixed set of specialists; agents-as-tools is better when the set of specialists varies per request.

After fan-in, selection strategies differ by task type:
- **Voting/majority-rule**: for classification or pass/fail decisions
- **Scored ranking**: each result scored against rubric, highest score wins
- **LLM-synthesized selection**: a meta-agent receives all results and picks or merges

Microsoft's Azure Architecture Center (updated February 2026) documents the full pattern under "concurrent agent" and "fan-out/fan-in" in its AI agent design patterns guide, noting that capping parallel agent count at 3–5 typically beats 8–10 because merge complexity grows superlinearly.

Google ADK (Agent Development Kit) exposes a `ParallelAgent` primitive directly in its API (google.github.io/adk-docs/agents/workflow-agents/parallel-agents/).

## Key GitHub Repos and Docs

- **OpenAI Agents SDK Cookbook — parallel_agents** (developers.openai.com/cookbook/examples/agents_sdk/parallel_agents) — canonical asyncio and agents-as-tools implementations
- **Google ADK parallel agents** (google.github.io/adk-docs/agents/workflow-agents/parallel-agents/) — `ParallelAgent` as a first-class type
- **lastmile-ai/mcp-agent** (github.com/lastmile-ai/mcp-agent) — `create_parallel_llm(...)` for MCP-based fan-out

## Applicability to prompt-to-asset

Fan-out is directly applicable in two scenarios:

**1. Multi-provider generation for best-of-N**: Send the same prompt to, say, gpt-image-1 and Ideogram 3 simultaneously. Validate both outputs with the tier-0 checks (alpha channel, bbox, FFT signature). Pick the result that passes all checks first, or score both and pick the higher ΔE2000 match. This adds zero latency compared to sequential generation of two candidates.

**2. Style variant generation**: For a logo with multiple style options (flat, gradient, monochrome), fan out the same mark prompt with different style parameters to 3 calls in parallel. Present all passing variants to the user.

A concrete implementation sketch for prompt-to-asset:

```typescript
const [gptResult, ideogramResult] = await Promise.allSettled([
  generateWithGPTImage1(spec),
  generateWithIdeogram(spec),
]);
const passing = [gptResult, ideogramResult]
  .filter(r => r.status === 'fulfilled' && r.value.validationScore > threshold)
  .map(r => r.value);
const best = pickBestByDeltaE(passing);
```

`Promise.allSettled` (not `Promise.all`) is critical: a provider timeout should not cancel successful results from other providers.

For the fan-in scoring step, the validation stack already produces machine-readable scores (ΔE2000, Levenshtein distance, FFT peak). No LLM is needed for selection — the scoring function is deterministic.

## Caveats

- API cost multiplies by N. Fan-out to 3 providers for every request is expensive. Gate it behind a `best_of_n` flag or reserve it for premium-tier requests.
- `Promise.allSettled` vs `Promise.all`: always use allSettled when any provider can fail independently.
- Image generation responses are large (base64 or binary). Avoid passing raw image data between agent steps; write to disk immediately and pass file paths.
- The Azure recommendation to cap at 3–5 parallel agents is empirically valid: the coordination and scoring overhead for 8+ parallel calls typically exceeds the latency savings.
- Per-provider rate limits apply concurrently. Generating 3 images from the same Ideogram account simultaneously may trigger rate limiting faster than sequential calls.

## References

- [Parallel Agents — OpenAI Agents SDK Cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/parallel_agents)
- [Parallel Agents — Google ADK](https://google.github.io/adk-docs/agents/workflow-agents/parallel-agents/)
- [AI Agent Orchestration Patterns — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent)
- [Multi-Agent Parallel Execution — Skywork AI](https://skywork.ai/blog/agent/multi-agent-parallel-execution-running-multiple-ai-agents-simultaneously/)
