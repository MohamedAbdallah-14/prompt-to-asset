# 24d — Retry and Fallback Agent Chains

## What the Pattern Is

When an AI agent calls an external API — especially an image generation provider — calls fail for four distinct reasons that require different recovery strategies:

1. **Transient network errors** (TLS failures, connection resets): retry immediately with exponential backoff.
2. **Rate limits (429)**: retry after the `Retry-After` header delay; do not retry without waiting.
3. **Provider-side errors (5xx)**: retry up to N times, then fall back to another provider.
4. **Permanent semantic failures** (safety filter, unsupported parameter, invalid prompt): do not retry the same request; modify the prompt or switch provider class.

A naive retry loop that does not distinguish these categories will waste credits (retrying a prompt blocked by safety filters), exhaust limits (hammering a rate-limited endpoint), or stall (waiting when an immediate retry would succeed).

The layered resilience pattern from Portkey AI and similar sources composes three mechanisms:

- **Retry with exponential backoff + jitter**: handles categories 1–3. Start at 2 seconds, double each attempt, add random jitter to avoid thundering-herd. Cap at 3–5 retries.
- **Circuit breaker**: tracks failure rate over a rolling time window. When the failure rate exceeds a threshold (e.g., 50% of calls in the last 60 seconds fail), the circuit opens: all requests route around the failing provider for a cooldown period (30–120 seconds). This prevents retry storms.
- **Fallback provider chain**: a predetermined ordered list of alternative providers. When the primary is unavailable (circuit open or retry budget exhausted), route to the next provider in the chain.

The fault-tolerant pattern from Mindra.co adds a fourth layer: **context-enriched retry**. Before the second attempt, the failure message is injected into the next prompt ("previous attempt failed with: safety_filter on 'violent imagery' — replace with abstract geometric forms"). This prevents identical re-submission producing identical failure.

## Key Repos and Documentation

- **Portkey AI blog: retries, fallbacks, circuit breakers** (portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/) — the canonical reference combining all three mechanisms
- **Mindra.co: fault-tolerant AI agents** (mindra.co/blog/fault-tolerant-ai-agents-failure-handling-retry-fallback-patterns) — specific tiered retry with context enrichment
- **fast.io: AI Agent Retry Patterns** (fast.io/resources/ai-agent-retry-patterns/) — exponential backoff guide with code patterns

## Applicability to prompt-to-asset

The MCP server calls up to five providers. The recommended fallback chain per asset class:

| Asset type | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Transparent PNG/mark | gpt-image-1 (`background: "transparent"`) | Ideogram 3 (`style: "transparent"`) | Recraft V3 → BiRefNet matte |
| Raster illustration | Imagen 4 or Flux | gpt-image-1 | Ideogram 3 |
| Native SVG | Recraft V3 vector | inline_svg (LLM-authored) | — |

The circuit breaker should operate at the provider level, not the request level. A provider status tracker (in-process or Redis-backed) holds: `{ provider, failureCount, lastFailureTime, state: 'closed' | 'open' | 'half-open' }`. The MCP server checks this before routing each request.

The context-enriched retry rule is especially important for prompt-to-asset: if the validation step (not the API call) fails — e.g., FFT checkerboard detected — the retry should pass the failure detail back to the prompt augmentation step, not simply re-call the provider with the same prompt.

A concrete retry decision tree for the server:

```
if error.type === 'rate_limit':
    wait(error.retryAfter || exponentialBackoff(attempt))
    retry same provider
elif error.type === 'safety_filter':
    enrich_prompt(error.blockedTerms)
    retry same provider once, then fallback
elif error.type === 'server_error' and attempt < 3:
    retry same provider with backoff
elif circuitBreaker.isOpen(provider):
    route to fallback provider
else:
    escalate to human or return partial result
```

## Caveats

- Different providers use different error codes for the same semantic condition. Ideogram and gpt-image-1 return 400 for safety filter violations; Flux returns 422. Normalize errors before entering the retry logic.
- `negative_prompt` on Flux causes a hard 422 error. The fix is to never send it (per the CLAUDE.md routing rules), not to retry. Classification of permanent vs. transient errors must account for this.
- Circuit breakers need tuning per provider. Imagen's free tier has aggressive quota resets; a 10-second cooldown is appropriate. Enterprise-tier providers may warrant a longer 5-minute cooldown to avoid repeated quota checks.
- Do not implement circuit breakers with in-memory state when the MCP server is multi-process or serverless. Use an external store (Redis, DynamoDB) or accept that each process has independent circuit state.

> **Updated 2026-04-21:** The OpenAI Assistants API is being deprecated mid-2026. Retry logic that calls Assistants API endpoints should be migrated to the Agents SDK. The Agents SDK works with any Chat Completions-compatible endpoint, so existing fallback chains to non-OpenAI providers still apply without changes. MCP transport note: SSE transport officially stopped being accepted by Claude connectors on April 1, 2026; any MCP-based retry/fallback infrastructure must use Streamable HTTP transport now.

## References

- [Retries, fallbacks, and circuit breakers in LLM apps — Portkey AI](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/)
- [Fault-Tolerant AI Agents — Mindra](https://mindra.co/blog/fault-tolerant-ai-agents-failure-handling-retry-fallback-patterns/)
- [AI Agent Retry Patterns — fast.io](https://fast.io/resources/ai-agent-retry-patterns/)
- [Error Recovery and Fallback Strategies — GoCodeo](https://www.gocodeo.com/post/error-recovery-and-fallback-strategies-in-ai-agent-development)
- [Fail-Safe Patterns for AI Agent Workflows — Engineers Meet AI](https://engineersmeetai.substack.com/p/fail-safe-patterns-for-ai-agent-workflows)
