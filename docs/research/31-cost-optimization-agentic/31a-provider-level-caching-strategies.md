# 31a — Provider-Level Caching Strategies

## What This Covers

Two distinct layers of caching exist in the asset pipeline: the application-level prompt-hash cache already implemented in this project, and provider-level caches operated by Anthropic and OpenAI inside their inference infrastructure. This document covers the latter.

---

## Anthropic Prompt Caching

Anthropic's cache is explicit: you designate which content blocks to cache using `cache_control` markers. Two modes exist.

**5-minute cache** (`"type": "ephemeral"` without ttl, default):
- Write cost: 1.25x base input price
- Read cost: 0.10x base input price
- Break-even: one cache hit pays back the write premium

**1-hour cache** (`"ttl": "1h"`):
- Write cost: 2.0x base input price
- Read cost: 0.10x base input price
- Break-even: two cache hits

For Haiku 4.5 (base $1/MTok input, $5/MTok output), a cached read costs $0.10/MTok — a 90% reduction per re-use after break-even.

**Minimum cacheable prefix lengths vary by model:**
- Haiku 4.5: 4,096 tokens minimum
- Sonnet 4.6: 1,024 tokens minimum
- Opus 4.7: 1,024 tokens minimum

**Critical caveat:** The `asset_enhance_prompt` tool generates a system prompt that includes the routing table, brand guidelines, and asset-type schema. These are strong candidates for caching — they are static per asset type and easily exceed 1,024 tokens. Variable content (the user's brief) should be appended after the cache boundary, not before it.

**Applicability to this project:**
- Cache the system prompt + routing table in every `asset_enhance_prompt` call. If the MCP server processes 10 enhance calls per minute with a 2,000-token system prompt on Haiku 4.5, caching cuts that cost from ~$0.002/call to ~$0.0002/call after the first hit.
- The 5-minute TTL aligns with typical interactive sessions. Use 1-hour TTL only for background batch jobs where the same system context persists.

---

## OpenAI Automatic Prompt Caching

OpenAI caches automatically with no required code changes. The API routes requests to servers that recently processed the same prefix. Cache read discount is 50% of input price (not 90% like Anthropic). Minimum prefix: 1,024 tokens.

OpenAI's cache has no explicit TTL documented — it is server-managed and opaque. The practical implication: structure prompts so the static system context always appears first. Variable content (user brief, request ID) must come last. If you reorder or mutate the static prefix between calls, you lose the cache hit.

**For gpt-image-1 calls:** The image generation endpoint does not use prompt caching in the same way — it takes a prompt string, not a messages array with `cache_control`. The caching benefit applies to LLM calls (prompt enhancement, validation judgment) not to the image generation call itself.

---

## Combined Stacking with Batch API

Both Anthropic and OpenAI allow prompt caching discounts to stack with their respective Batch API discounts. Using both simultaneously on Anthropic:

- Base Haiku 4.5 input: $1.00/MTok
- Batch 50% discount: $0.50/MTok
- Cache read on top: $0.50 × 0.10 = **$0.05/MTok**

That is a 95% reduction from base price on repeated static context — practically free for prompt enhancement reuse across a queue of similar asset requests.

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
