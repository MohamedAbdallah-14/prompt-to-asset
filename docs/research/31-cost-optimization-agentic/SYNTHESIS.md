> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# 31 — Cost Optimization for Agentic Asset Pipelines

## Research Summary

> **Updated 2026-04-21:** Several pricing figures in this synthesis have been revised. Key changes: (1) gpt-image-1 is now "previous generation" — gpt-image-1.5 is OpenAI's current image model at ~$0.034/image medium; (2) Anthropic's prompt cache default TTL dropped from 1 hour to 5 minutes on March 6, 2026 (silent change, 1h must now be specified explicitly); (3) Claude Opus 4.7 released April 16, 2026 at same $5/$25 rate card but with a new tokenizer that may use 1–1.35x more tokens; (4) OpenAI prompt caching discounts are now model-tiered (50% for GPT-4o, 75% for GPT-4.1, 90% for GPT-5 family).

This directory covers cost reduction patterns applicable to the prompt-to-asset MCP server, which calls gpt-image-1.5 (~$0.034/image medium) or gpt-image-1 (~$0.042/image medium), Ideogram 3 Turbo (~$0.03/image), and LLMs for prompt enhancement. Cost efficiency directly enables more generous free tiers and faster iteration cycles.

**Research date:** April 2026

---

## Files

| File | Topic | Potential savings | Implementation effort |
|---|---|---|---|
| [31a](./31a-provider-level-caching-strategies.md) | Provider-level prompt caching (Anthropic + OpenAI) | Up to 90% on LLM calls with cache hits + batch | Low — markup change in API calls |
| [31b](./31b-model-routing-cheap-to-expensive.md) | Model cascade routing (Haiku → Sonnet → Opus) | ~2–3x cost reduction on prompt enhancement | Medium — requires routing logic + calibration |
| [31c](./31c-batch-apis-async-generation.md) | Batch APIs for async generation (Anthropic + OpenAI) | 50% flat discount on all LLM + image generation | High — requires async pipeline architecture |
| [31d](./31d-thumbnail-first-validate-then-upscale.md) | Thumbnail-first validate-then-upscale pattern | 62% on happy path with dedicated upscaler | Medium — validation loop refactor |
| [31e](./31e-semantic-deduplication-patterns.md) | Semantic deduplication (prompt + asset level) | Eliminates redundant generation for similar requests | Medium — vector store integration |

---

## Priority Stack Rank

**1. Provider-level prompt caching (31a)** — Highest ROI, lowest effort. Add `cache_control` to the static system prompt in `asset_enhance_prompt`. Cache hit cost: $0.10/MTok on Haiku vs $1.00/MTok base. Effective immediately with a single code change. **Caveat (April 2026):** Haiku 4.5 requires a 4,096-token minimum prefix for cache eligibility. Sonnet 4.6 needs only 1,024 tokens. Also specify `"ttl": "1h"` explicitly — the default reverted to 5 minutes in March 2026.

**2. Model routing for prompt enhancement (31b)** — Second-highest ROI for LLM costs. Route simple, short briefs to Haiku 4.5 instead of Sonnet. Haiku 4.5 is 3x cheaper than Sonnet and benchmarks show near-Sonnet performance on bounded rewriting tasks. Implement with a brief-length heuristic first, graduate to a classifier later.

**3. Thumbnail-first pattern (31d)** — Most valuable for transparent-mark and logo generation where first-pass failure rates are highest. Validate at low quality before spending $0.034–$0.133 (gpt-image-1.5 medium–high) on full-res. Critical path: if using a dedicated upscaler ($0.005/image), the happy path drops from $0.034 to ~$0.014 using gpt-image-1.5 low-quality draft + upscale.

**4. Semantic deduplication (31e)** — Value depends on user base size. With fewer than 1,000 total assets in the store, the overhead of embedding search outweighs gains. At 10,000+ assets, a 30% dedup hit rate on a 1,000-call workload saves ~$40 in image generation cost per day.

**5. Batch APIs (31c)** — Largest absolute savings (50% on everything) but requires architectural investment: async queue, worker process, callback or polling system. Worth building for icon pack generation (multiple sizes, one batch call) and background QA passes. Not compatible with the interactive MCP flow.

---

## Key Facts to Keep in Mind

- **Anthropic batch + cache stacks:** Batch API gives 50% discount; cache reads give 90% discount on cached tokens. Combined: $0.05/MTok for Haiku 4.5 cached batch input vs $1.00/MTok base. **20x reduction.** Must specify `"ttl": "1h"` explicitly in batch workloads since March 2026 default is 5 minutes.
- **Haiku 4.5 cache minimum is 4,096 tokens:** Unlike Sonnet/Opus (1,024 tokens), Haiku 4.5 requires a 4,096-token prefix before a cache checkpoint is valid. Short system prompts on Haiku will not cache.
- **OpenAI batch covers image generation (all current models):** `/v1/images/generations` is an explicitly supported batch endpoint for `gpt-image-1`, `gpt-image-1.5`, and `gpt-image-1-mini`. Current flagship is **gpt-image-1.5** (~$0.017/image medium at batch pricing). gpt-image-1 batch: ~$0.021/image medium.
- **OpenAI prompt caching is now model-tiered:** GPT-4o = 50% off cached tokens; GPT-4.1 = 75% off; GPT-5/GPT-5.4 = 90% off. Prior "$50% discount" claim only applies to GPT-4o.
- **RouteLLM (UC Berkeley, ICLR 2025):** Open-source, OpenAI-compatible cascade router. Reports 85% cost reduction at 95% quality retention on MT-Bench. Drop-in replacement for the OpenAI client.
- **GPTCache (Zilliz):** Semantic caching library with 7.4k GitHub stars, full LangChain integration, 61–68% hit rates on general workloads. Use threshold ≥ 0.85 cosine similarity for asset generation to avoid false-positive cache hits.
- **Haiku 4.5 vs Sonnet 4.6 for prompt enhancement:** Haiku 4.5 is 3x cheaper ($1/$5 vs $3/$15 MTok) but requires a 4,096-token cache minimum. For bounded prompt rewriting tasks, Haiku handles the majority of cases correctly — but verify your system prompt length exceeds the cache minimum before assuming caching benefits.
- **Ideogram 3 Turbo pricing (confirmed April 2026):** $0.03/image — significantly cheaper than the old "$0.08/image" figure (which reflected Ideogram's Quality tier, not Turbo).

---

## Related Research

- [33 — Model Routing and Ensembling](../33-model-routing-ensembling/) — deeper treatment of capability-based image model routing (gpt-image-1 vs Ideogram vs Recraft)
- [19 — Agentic MCP Skills Architectures](../19-agentic-mcp-skills-architectures/) — pipeline orchestration patterns
- [17 — Upscaling and Refinement](../17-upscaling-refinement/) — upscaler options (Real-ESRGAN, Stable Diffusion img2img, commercial APIs)
