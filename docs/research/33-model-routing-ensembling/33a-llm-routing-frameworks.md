# 33a — LLM Routing Frameworks

**Focus:** RouteLLM, Martian, Not Diamond, and the RouterArena benchmark — what they do, how they work, and what transfers to image model routing.

---

## RouteLLM (lm-sys/RouteLLM)

**Repo:** https://github.com/lm-sys/RouteLLM  
**Paper:** arXiv:2406.18665 — "RouteLLM: Learning to Route LLMs with Preference Data"

RouteLLM frames routing as a binary classification problem: for each incoming query, decide whether to send it to the strong (expensive) model or the weak (cheap) model. It trains four router architectures on the Chatbot Arena preference dataset, augmented with GPT-4 judge labels:

1. **Matrix Factorization (mf)** — recommended default; lightweight, learns a prompt-capability scoring function. Strong and weak model representations are factored into a shared latent space.
2. **BERT Classifier** — fine-tuned on preference data; predicts which model wins.
3. **Causal LLM** — a small LM fine-tuned to predict winner; highest accuracy, highest latency overhead.
4. **SW-Ranking (semantic weighting)** — retrieves similar historical arena battles weighted by prompt similarity, then uses their Elo delta as the routing signal.

**Cost-quality results (MT Bench vs GPT-4):**
- Matrix factorization, arena data only: 95% GPT-4 quality using only 26% GPT-4 calls (~48% cost saving).
- With LLM-judge augmentation: same 95% quality at 14% GPT-4 calls (~75% saving).
- GSM8K: ~35% cost reduction at parity quality.

**Transfer learning:** Routers trained on a GPT-4 / Mixtral pair generalize to other strong/weak pairs at test time without retraining. This is the critical property for a multi-provider asset pipeline.

**Threshold calibration:** RouteLLM exposes a `threshold` float (0–1). Lower threshold = route more to strong model. You calibrate by specifying a target cost fraction, then reading off the threshold from the cost-quality curve.

**Caveats for image routing:**
- All four routers treat the input as text. For image tasks, the "query" is the brief + asset type + detected features (transparency needed, text word count, vector required). These are categorical, not natural-language complexity signals — the BERT/causal approaches don't apply directly.
- The preference dataset is text-only; no equivalent image-preference dataset exists at scale. You would need to bootstrap your own or use synthetic VLM judge labels.
- The matrix factorization approach is the most portable: replace the text embedding with a structured feature vector (asset_type, text_length, transparency, vector_required) and train on your own logged (model, quality_score) pairs.

---

## Martian

**Site:** https://route.withmartian.com/  
**Accenture investment announced:** September 2024

Martian builds a proprietary router that predicts, per query, which model will produce the best output at the lowest cost. It uses model compression and distillation to make routing predictions without running the full candidate models. Key properties:

- Predicts output quality per model without calling them.
- Targets agentic chains: each step in a multi-model workflow is routed independently.
- Emphasizes that routing errors in chains compound; a 5% error rate per step becomes ~23% over 5 steps.

**Applicable pattern:** In the asset pipeline, each postprocess step (matte, vectorize, validate) is a separate model call. Routing each step independently (rather than just the generation call) is the Martian philosophy. For example, route background removal to BiRefNet for complex scenes and to a cheaper segmentation model for simple icon-on-white cases.

---

## Not Diamond

**Site:** https://www.notdiamond.ai/  
**Awesome list:** https://github.com/Not-Diamond/awesome-ai-model-routing

Not Diamond uses a meta-model: a lightweight classifier that reads the incoming query and emits a model recommendation. It evaluates task type (creative, extraction, lookup, analytical) and complexity (low/medium/high) before routing.

**Reported results:** +39% average accuracy over single-model baselines on SRE benchmarks; >50% inference cost reduction; >90% reduction in prompt-tuning engineering hours.

**Applicable pattern for image routing:** The task-type axis maps cleanly to asset_type. The complexity axis maps to: word_count, transparency_needed, brand_bundle_present, vector_required, platform_count. A Not Diamond-style meta-model would be a small classifier (logistic regression or XGBoost) trained on these 5–6 features with logged (model, validation_pass_rate) as labels.

---

## RouterArena Benchmark

**Paper:** arXiv:2510.00202, submitted September 2025

RouterArena compares 12 routers (NotDiamond, Azure Model Router, RouteLLM, CARROT, GraphRouter, Universal Router, IRT-Router, RouterDC, vLLM Semantic Router, plus 3 others) across 8,400 queries in 9 domains.

**Key findings:**
- No single router dominates all metrics (accuracy, cost, latency, robustness, routing optimality).
- CARROT and GraphRouter achieve ~35% cost reduction with <2% accuracy degradation.
- Explicit (text-surface) representation methods are brittle to paraphrasing/typos; latent (embedding-based) methods are more robust.
- All routers fall short of oracle performance — the upper bound is still well above any deployed router.
- Commercial routers (NotDiamond, Azure) optimize accuracy; open-source options are more cost-efficient.

**Implication:** A structured-feature router (asset_type, text_length enum, capabilities flags) sidesteps the representation brittleness problem entirely — there is no paraphrase variant of `{"asset_type": "logo", "text_length": 2, "transparency": true}`.

---

## Applicability Summary

| Framework | Direct lift | Adaptation needed |
|---|---|---|
| RouteLLM MF router | Architecture pattern, threshold calibration | Replace text embedding with feature vector; collect image preference data |
| RouteLLM SW-ranking | Retrieve similar past requests, use their outcome as routing signal | Index past asset jobs by feature vector; weight by VLM quality score |
| Martian per-step routing | Route each pipeline stage independently | Map postprocess steps (matte, vectorize) to model options |
| Not Diamond meta-model | Feature-based complexity classification | Use asset features as input; VLM pass rate as label |
| RouterArena | Evaluation methodology | Adapt metrics: routing optimality = cheapest model that passes tier-0 validation |

The single most useful takeaway: **use a structured feature vector, not a text embedding, as the routing input** for asset types. Text-similarity routing finds "similar past queries" — in a prompt-to-asset server, the relevant similarity is feature similarity (same asset type, same transparency flag), not semantic similarity of the user's brief.

---

**Sources:**
- https://github.com/lm-sys/RouteLLM
- https://arxiv.org/abs/2406.18665
- https://www.lmsys.org/blog/2024-07-01-routellm/
- https://route.withmartian.com/
- https://newsroom.accenture.com/news/2024/accenture-invests-in-martian
- https://www.notdiamond.ai/
- https://github.com/Not-Diamond/awesome-ai-model-routing
- https://arxiv.org/abs/2510.00202
