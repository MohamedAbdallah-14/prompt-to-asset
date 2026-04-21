# 31a — Provider-Level Caching Strategies

## What This Covers

Two distinct layers of caching exist in the asset pipeline: the application-level prompt-hash cache already implemented in this project, and provider-level caches operated by Anthropic and OpenAI inside their inference infrastructure. This document covers the latter.

---

## Anthropic Prompt Caching

> **Updated 2026-04-21:** Anthropic silently changed the default cache TTL from 1 hour to 5 minutes on March 6, 2026 (no changelog entry, confirmed via community reports and GitHub issue #46829). The 1-hour TTL option still exists but must now be requested explicitly. Additionally, as of February 5, 2026, cache isolation is per-workspace, not per-organization. See [The Register coverage](https://www.theregister.com/2026/04/13/claude_code_cache_confusion/) and [DEV Community breakdown](https://dev.to/whoffagents/anthropic-silently-dropped-prompt-cache-ttl-from-1-hour-to-5-minutes-16ao).

Anthropic's cache is explicit: you designate which content blocks to cache using `cache_control` markers. Two modes exist.

**5-minute cache** (`"type": "ephemeral"` without ttl, now the default as of March 6, 2026):
- Write cost: 1.25x base input price
- Read cost: 0.10x base input price
- Break-even: one cache hit pays back the write premium

**1-hour cache** (`"ttl": "1h"`, must be specified explicitly — no longer the default):
- Write cost: 2.0x base input price
- Read cost: 0.10x base input price
- Break-even: two cache hits
- **Caveat:** The March 2026 TTL downgrade drove 15–53% cache re-creation cost inflation for users who relied on implicit 1-hour behavior. If your session has pauses longer than 5 minutes, cache context re-uploads at write rates instead of read rates. Always specify `"ttl": "1h"` explicitly for batch jobs and long-running pipelines.

For Haiku 4.5 (base $1/MTok input, $5/MTok output), a cached read costs $0.10/MTok — a 90% reduction per re-use after break-even.

**Minimum cacheable prefix lengths vary by model:**
- Haiku 4.5: **4,096 tokens minimum** (significantly higher than Sonnet/Opus — relevant when composing shorter system prompts)
- Sonnet 4.6: 1,024 tokens minimum
- Opus 4.7: 1,024 tokens minimum

> **Updated 2026-04-21:** The Haiku 4.5 minimum is confirmed at 4,096 tokens. If the static system prompt + routing table is under 4,096 tokens, no cache checkpoint is created on Haiku. Verify prefix length before assuming cache hits. Sonnet 4.6 at $3/MTok with a 1,024-token minimum may be more practical for caching shorter system prompts.

**Critical caveat:** The `asset_enhance_prompt` tool generates a system prompt that includes the routing table, brand guidelines, and asset-type schema. These are strong candidates for caching — they are static per asset type and easily exceed 1,024 tokens. Variable content (the user's brief) should be appended after the cache boundary, not before it.

**Applicability to this project:**
- Cache the system prompt + routing table in every `asset_enhance_prompt` call. If the MCP server processes 10 enhance calls per minute with a 2,000-token system prompt on Haiku 4.5, caching cuts that cost from ~$0.002/call to ~$0.0002/call after the first hit — but only if the prefix exceeds the 4,096-token minimum; otherwise consider Sonnet 4.6.
- The 5-minute TTL (now the default) aligns with typical short interactive sessions. Explicitly request 1-hour TTL for background batch jobs where the same system context persists across long pauses.

---

## OpenAI Automatic Prompt Caching

> **Updated 2026-04-21:** The flat "50% cache discount" claim is now model-dependent. The discount tier varies: GPT-4o and o-series models retain the 50% discount; GPT-4.1 family gets 75% off cached tokens ($0.50/MTok vs $2.00/MTok standard); GPT-5/GPT-5.4 models get 90% off. For cost calculations, use the discount rate that matches the model you are actually calling.

OpenAI caches automatically with no required code changes. The API routes requests to servers that recently processed the same prefix. Cache read discount is **model-dependent** — 50% for GPT-4o/o-series, 75% for GPT-4.1, up to 90% for GPT-5 family. Minimum prefix: 1,024 tokens.

OpenAI's cache has no explicit TTL documented — it is server-managed and opaque. The practical implication: structure prompts so the static system context always appears first. Variable content (user brief, request ID) must come last. If you reorder or mutate the static prefix between calls, you lose the cache hit.

**For gpt-image-1 calls:** The image generation endpoint does not use prompt caching in the same way — it takes a prompt string, not a messages array with `cache_control`. The caching benefit applies to LLM calls (prompt enhancement, validation judgment) not to the image generation call itself.

---

## Combined Stacking with Batch API

Both Anthropic and OpenAI allow prompt caching discounts to stack with their respective Batch API discounts. Using both simultaneously on Anthropic:

- Base Haiku 4.5 input: $1.00/MTok
- Batch 50% discount: $0.50/MTok
- Cache read on top: $0.50 × 0.10 = **$0.05/MTok**

That is a 95% reduction from base price on repeated static context — practically free for prompt enhancement reuse across a queue of similar asset requests.

> **Updated 2026-04-21:** Confirmed this stacking behavior remains valid as of April 2026. However, note that the March 2026 TTL downgrade to 5 minutes means cache hits are less likely across batch jobs with long queues unless `"ttl": "1h"` is specified explicitly. Always pass `"ttl": "1h"` in batch workloads.

---

## Caveats

- Anthropic cache hits are not guaranteed; the API returns `cache_read_input_tokens` and `cache_creation_input_tokens` in the usage object so you can measure actual hit rate.
- Cache writes are charged at premium (1.25–2x) so cold-start cost is slightly higher than non-cached. Low-volume usage may not break even.
- OpenAI's 50% cache discount is lower than Anthropic's 90%, but requires zero implementation effort.

**Sources:**
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Batch Processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [OpenAI Prompt Caching](https://openai.com/index/api-prompt-caching/)
- [OpenRouter Prompt Caching Guide](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- [PromptHub Caching Comparison](https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models)
