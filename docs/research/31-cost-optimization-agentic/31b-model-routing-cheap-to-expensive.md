# 31b — Model Routing: Cheap-to-Expensive Cascade

## The Core Pattern

Route each request to the cheapest model that can handle it correctly. Escalate to a more capable (and expensive) model only when the cheaper model signals uncertainty or produces a verifiable failure. This is called a **cascade** or **waterfall** routing strategy.

The key insight from research (Dekoninck et al., ICLR 2025, ETH Zurich): routing and cascading are unified problems. The optimal policy is not to predict upfront which model to use, but to attempt the cheap model, evaluate confidence, and escalate only when a probabilistic threshold is exceeded.

---

## RouteLLM (UC Berkeley / Anyscale / Canva, 2025)

**Repo:** [github.com/lm-sys/RouteLLM](https://github.com/lm-sys/RouteLLM)

RouteLLM is a drop-in OpenAI-compatible router trained on preference data (Chatbot Arena). It ships five routers:

| Router | Mechanism | Latency overhead |
|---|---|---|
| `mf` (recommended) | Matrix factorization on preference vectors | ~15ms |
| `sw_ranking` | Weighted Elo with similarity weighting | ~20ms |
| `bert` | BERT classifier on preference data | ~25ms |
| `causal_llm` | LLM-based classifier | ~50ms |
| `random` | Baseline | <1ms |

Reported results on MT-Bench: 85% cost reduction while maintaining 95% of GPT-4 quality. Integration is a single model string parameter: `router-mf-0.11593` where `0.11593` is the cost threshold (calibrate on your own traffic distribution).

**Applicability:** RouteLLM was designed for chat completions. The `asset_enhance_prompt` tool is the only LLM-heavy step in the pipeline where routing applies. Image model selection is a capability routing decision (see `data/routing-table.json`), not a quality cascade — you can't fall back from gpt-image-1 to Haiku for transparency.

---

## Concrete Routing for Prompt Enhancement

The `asset_enhance_prompt` tool currently calls a single model. A three-tier routing approach:

**Tier 1 — Claude Haiku 4.5** ($1/MTok in, $5/MTok out, batch: $0.50/$2.50):
- Use for: reformatting a clear brief, extracting brand palette from hex codes, rewriting simple 1-sentence descriptions
- Qualification signal: user brief length < 30 words AND no brand bundle attached

**Tier 2 — Claude Sonnet 4.6** ($3/MTok in, $15/MTok out):
- Use for: multi-constraint briefs, brand coherence reasoning, resolving ambiguous asset type
- Escalation trigger: Haiku returns low-confidence enhancement OR brief exceeds 30 words with brand context

**Tier 3 — Claude Opus 4.6** ($5/MTok in, $25/MTok out):
- Use for: complex multi-brand system design, resolving contradictory constraints
- Rarely needed; the prompt enhancement task is bounded enough that Sonnet handles almost all cases

At Haiku pricing with prompt caching, a typical 500-token enhancement call costs ~$0.0005. At Sonnet it is ~$0.0015. Routing 80% of calls to Haiku yields approximately 2x cost reduction over always using Sonnet.

---

## Confidence Signal Options

**Without running a second model:**
- Token-level log-probability of the output (available via `logprobs=true` on OpenAI, not currently on Anthropic). Low average log-prob on the enhanced prompt indicates uncertainty.
- Output length anomaly: if Haiku produces an enhancement far shorter or longer than expected, flag for review.

**With a second model (judge pattern):**
- Pass both the original brief and the Haiku-enhanced prompt to Sonnet with instruction "Is this enhancement complete and correct? Yes or No."
- Add cost: ~100 tokens × Sonnet price = negligible
- More reliable than log-prob for structured tasks

**Select-then-Route (StR, EMNLP 2025):** Uses a multi-judge agreement test — run the cheap model twice with temperature variation; if outputs disagree, escalate. This is computationally cheap and requires no separate classifier.

---

## Caveats

- Threshold calibration requires a labeled sample of your actual traffic (1,000–5,000 prompts with human-rated quality scores). Generic MT-Bench thresholds from RouteLLM will not transfer directly to asset brief enhancement.
- Recalibrate monthly as user behavior changes.
- For the MCP server context, the enhancement call is already fast (<2s). Routing overhead (classifier + potential escalation) adds complexity; justify it only when volume is high enough that the cost difference is meaningful (roughly >1,000 enhance calls/day).

**Sources:**
- [RouteLLM GitHub](https://github.com/lm-sys/RouteLLM)
- [A Unified Approach to Routing and Cascading for LLMs (ETH Zurich)](https://files.sri.inf.ethz.ch/website/papers/dekoninck2024cascaderouting.pdf)
- [Select-then-Route, EMNLP 2025](https://aclanthology.org/2025.emnlp-industry.28/)
- [LLM Routing in Production - TianPan.co](https://tianpan.co/blog/2025-10-19-llm-routing-production)
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
