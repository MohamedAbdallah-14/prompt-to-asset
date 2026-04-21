# Updates Log — Category 31 (Cost Optimization Agentic)
**Audit date:** 2026-04-21
**Files audited:** 31a, 31b, 31c, 31d, 31e, SYNTHESIS.md, index.md

---

## Summary of Changes

### 31a — Provider-Level Caching Strategies

**CORRECTED: Anthropic default cache TTL**
- Old claim: "1-hour cache" treated as a standard/available option without urgency note
- Current reality: On March 6, 2026, Anthropic silently changed the default prompt cache TTL from 1 hour to 5 minutes (no changelog, confirmed via GitHub issue #46829 and community reports). The 1-hour TTL still works but must be explicitly specified via `"ttl": "1h"`.
- Impact: Any batch pipeline or long-running session relying on implicit 1h caching is now re-creating cache on each request after the first 5-minute idle, driving 15–53% cost inflation from repeated cache writes.
- Added explicit `"ttl": "1h"` recommendation for batch workloads.

**CORRECTED: Haiku 4.5 cache minimum token requirement**
- Old claim: Listed Haiku 4.5 at "4,096 tokens minimum" (correct value), but the strategic implication was underemphasized.
- Added a caveat note: a system prompt under 4,096 tokens on Haiku 4.5 will not produce cache hits at all, making Sonnet 4.6 (1,024-token minimum) the better choice for shorter prompts when caching is important.

**CORRECTED: OpenAI prompt caching discount is model-tiered**
- Old claim: "50% discount" stated as a flat rate for OpenAI caching.
- Current reality (April 2026): The discount varies by model family:
  - GPT-4o / o-series: 50% off cached tokens
  - GPT-4.1 family: 75% off cached tokens ($0.50/MTok vs $2.00/MTok standard)
  - GPT-5 / GPT-5.4 family: 90% off cached tokens
- The "50% discount" claim is still accurate for GPT-4o but does not apply to newer models.

**ADDED: February 2026 cache isolation change**
- As of February 5, 2026, Anthropic caches are isolated per workspace, not per organization.

---

### 31b — Model Routing: Cheap-to-Expensive Cascade

**CORRECTED: Tier 3 model reference**
- Old claim: "Claude Opus 4.6" listed as the Tier 3 model.
- Current reality: Claude Opus 4.7 was released April 16, 2026. It carries the same $5/$25 MTok rate card as Opus 4.6.
- Added caveat: Opus 4.7 uses a new tokenizer that may produce 1–1.35x more tokens than previous models for the same input, meaning effective per-request cost may be 0–35% higher despite identical pricing. Opus 4.6 remains available and is not subject to this premium.

**ADDED: Haiku 4.5 cache minimum caveat for routing decision**
- Added note that Haiku 4.5's 4,096-token cache minimum affects whether caching benefits the tier-1 route. Short system prompts on Haiku will not cache; Sonnet 4.6 (1,024-token minimum) may be preferred when caching is critical.

---

### 31c — Batch APIs for Async Generation

**CORRECTED: gpt-image-1 is now previous-generation**
- Old claim: "gpt-image-1" presented as the current flagship image model for batch.
- Current reality (March 22, 2026): OpenAI labeled gpt-image-1 as "previous generation." GPT Image 1.5 is the current flagship image model.
- The Batch API supports: `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest`.

**CORRECTED: Image batch pricing table**
- Old claim: "gpt-image-1 batch: ~$0.02/image (standard quality 1024×1024)" — this was based on an approximate "$0.04/image standard" that was already slightly off.
- Confirmed April 2026 rates:
  - gpt-image-1 standard (1024×1024 medium): ~$0.042/image; batch ~$0.021/image
  - gpt-image-1-mini medium: ~$0.011/image; batch ~$0.006/image
  - gpt-image-1.5 medium: ~$0.034/image; batch ~$0.017/image
- Updated implementation example to use `gpt-image-1.5` (current model).

---

### 31d — Thumbnail-First: Validate at Low Cost, Upscale Only on Pass

**CORRECTED: gpt-image-1 pricing labeled "as of 2025"**
- Old claim: "as of 2025" tag; values: 256×256 ~$0.01, 512×512 ~$0.02, 1024×1024 ~$0.04 standard, ~$0.08 high.
- The high-quality rate was significantly underestimated — confirmed high-quality rate for gpt-image-1 is ~$0.167/image, not $0.08.
- Updated cost structure table to April 2026 confirmed rates for both gpt-image-1 (previous-gen) and gpt-image-1.5 (current).
- Recalculated thumbnail-first math using gpt-image-1.5 (the current recommended model).
- Happy path cost reduction revised from "62%" to "~59%" based on actual current pricing.

**NOTED: gpt-image-1 is previous-generation**
- Added note that gpt-image-1 is now labeled previous-gen; gpt-image-1.5 is preferred for new integrations.

---

### 31e — Semantic Deduplication Patterns

No pricing claims in this file — pattern is model-agnostic. No corrections required.
File content remains current as of audit date.

---

### SYNTHESIS.md

**CORRECTED: Opening pricing claim**
- Old: "gpt-image-1 (~$0.04/image), Ideogram (~$0.08/image)"
- Corrected: gpt-image-1.5 (~$0.034/image medium), Ideogram 3 Turbo (~$0.03/image)
- The old Ideogram "$0.08/image" figure appears to reference Ideogram's Quality tier; the Turbo tier (most relevant for cost optimization) is confirmed at $0.03/image as of April 2026.

**CORRECTED: Key Facts — OpenAI caching discount**
- Was stated as flat 50%. Updated to model-tiered table.

**CORRECTED: Key Facts — Haiku cache minimum**
- Explicitly called out 4,096-token minimum for Haiku 4.5 vs 1,024 for Sonnet/Opus.

**CORRECTED: Key Facts — image batch pricing**
- Updated gpt-image-1 batch figure from ~$0.02 to ~$0.021; noted gpt-image-1.5 as current model.

**ADDED: Key Fact — Ideogram 3 Turbo confirmed pricing**
- $0.03/image (Turbo tier). Distinguished from Quality tier (~$0.09/image).

**CORRECTED: Priority 1 — cache TTL caveat added**
- Added explicit note to specify `"ttl": "1h"` and to verify Haiku prefix length ≥ 4,096 tokens.

**CORRECTED: Priority 3 — thumbnail-first pricing**
- Updated from "$0.04–$0.08" to "$0.034–$0.133 (gpt-image-1.5 medium–high)".

**Updated snapshot date:** 2026-04-20 → 2026-04-21.

---

## Files Not Changed

- **index.md** — no pricing claims, only links. No changes needed.
- **31e** — no model pricing claims, pattern is tooling/algorithm-focused. No changes needed.

---

## Sources Consulted

- [Anthropic Pricing Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic Cache TTL regression (GitHub #46829)](https://github.com/anthropics/claude-code/issues/46829)
- [Anthropic silently cut cache TTL from 1h to 5min (The Register)](https://www.theregister.com/2026/04/13/claude_code_cache_confusion/)
- [Claude Opus 4.7 release announcement](https://www.anthropic.com/news/claude-opus-4-7)
- [Claude Opus 4.7 tokenizer pricing note (finout.io)](https://www.finout.io/blog/claude-opus-4.7-pricing-the-real-cost-story-behind-the-unchanged-price-tag)
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [OpenAI GPT-4.1 launch — 75% caching discount](https://openai.com/index/gpt-4-1/)
- [OpenAI Batch API Docs](https://developers.openai.com/api/docs/guides/batch)
- [OpenAI GPT Image 1.5 Model Docs](https://platform.openai.com/docs/models/gpt-image-1.5)
- [AI Image Generation API Pricing April 2026 (buildmvpfast.com)](https://www.buildmvpfast.com/api-costs/ai-image)
- [Ideogram API Pricing](https://ideogram.ai/features/api-pricing)
- [pricepertoken.com — Ideogram V3 Turbo](https://pricepertoken.com/image/model/ideogram-ai-ideogram-v3-turbo)
