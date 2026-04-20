# 31e — Semantic Deduplication Patterns

## The Problem

The project's current prompt-hash cache is exact-match: identical prompt strings return the cached asset. But two users submitting "minimal geometric logo for a fintech startup, blue and white" and "clean fintech logo, geometric shapes, navy and white" would both trigger expensive image model calls, despite near-identical intent. Semantic deduplication catches these near-duplicate requests before generation.

---

## Two Layers to Deduplicate

**Layer 1: Prompt-level deduplication** — before generation, check whether a semantically similar prompt has already produced an asset. Return cached asset if similarity exceeds threshold.

**Layer 2: Asset-level deduplication** — after generation, check whether the produced asset is perceptually similar to an existing asset in the store. Avoid storing duplicates and avoid serving the same visually identical asset to different users.

---

## Prompt-Level: Semantic Caching with GPTCache

**Repo:** [github.com/zilliztech/GPTCache](https://github.com/zilliztech/GPTCache) (7.4k stars, maintained by Zilliz)

GPTCache converts queries to embeddings, stores them in a vector store (Milvus, FAISS, Redis), and performs approximate nearest-neighbor search on each new request.

**Reported performance:**
- Cache hit rates of 61.6–68.8% on general LLM workloads
- 97%+ positive hit accuracy (hits that are actually correct responses)
- 31% of LLM queries exhibit semantic similarity — large efficiency gap without this

**Similarity threshold:** Configurable via `Config(similarity_threshold=0.2)`. Lower values are more aggressive (more hits, higher false-positive risk). For image asset generation, false positives (serving a cached logo that doesn't match the user's intent) are worse than false negatives (generating unnecessarily). Recommend starting at threshold ≥ 0.85 (cosine similarity) for this domain.

**Integration pattern:**
```python
from gptcache import cache
from gptcache.embedding import OpenAI
from gptcache.similarity_evaluation.distance import SearchDistanceEvaluation

cache.init(
    embedding_func=OpenAI().to_embeddings,
    similarity_evaluation=SearchDistanceEvaluation(),
)
# Wrap asset_enhance_prompt calls through cache
```

**vCache (arXiv 2502.03771):** A verified semantic caching system that adds accuracy guarantees via a verification step — the cached response is checked against the new query before returning it. Reduces false positive rate vs pure similarity threshold, at the cost of one additional LLM call per cache hit. Appropriate for asset generation where correctness matters more than latency.

---

## Asset-Level: Perceptual Hashing

After generation, use perceptual hashing to detect visually identical or near-identical outputs before writing to the asset store.

**Algorithm comparison:**

| Method | Speed | Near-duplicate robustness | Implementation |
|---|---|---|---|
| pHash (DCT-based) | Very fast | Moderate | `imagehash` Python library |
| dHash (gradient) | Very fast | Low (crop-sensitive) | `imagehash` |
| CNN embedding (ResNet) | Slow (GPU) | High | PyTorch + FAISS |

**Practical recommendation:**
- Use pHash as a fast pre-filter (Hamming distance ≤ 8 = likely duplicate)
- Use CLIP or ResNet embeddings for semantic similarity scoring on candidates that pass pHash
- FAISS with IVF index scales to millions of images with sub-100ms query time

**Repo:** [github.com/knjcode/imgdupes](https://github.com/knjcode/imgdupes) — perceptual hash deduplication, CLI + library

**For transparent assets:** pHash on RGBA images should mask out transparent pixels before hashing; otherwise transparency regions dominate the hash and reduce sensitivity to subject differences.

---

## Applying Semantic Dedup to the Asset Pipeline

**Before `asset_generate_*`:**
1. Embed the enhanced prompt (from `asset_enhance_prompt`) using a small embedding model (text-embedding-3-small at $0.02/MTok or Haiku via API).
2. Search the prompt embedding store. If cosine similarity ≥ 0.90 with an existing cached asset's prompt: return cached asset with a note that it matched a similar previous request.
3. If 0.85 ≤ similarity < 0.90: offer cached asset as a "similar result," give option to generate fresh.

**After `asset_generate_*`:**
1. Compute pHash of the generated image.
2. Check against the asset store. Hamming distance ≤ 8: flag as likely duplicate.
3. Do not overwrite; surface the existing asset to the user.

---

## LLM Gateway Semantic Caching

Production LLM gateways that support semantic caching out of the box (as of 2026): LiteLLM Proxy, Portkey, OpenRouter (partial). These can intercept `asset_enhance_prompt` calls without code changes to the MCP server itself — a zero-code integration path.

---

## Caveats

- Embedding model costs are not zero: text-embedding-3-small at $0.02/MTok adds ~$0.00001 per enhance call — negligible, but measure it.
- Similarity thresholds for image prompts require calibration. "Blue logo" and "dark blue logo" may have high embedding similarity but produce meaningfully different assets. Domain-specific fine-tuning of the embedding model improves precision.
- The adversarial vulnerability of semantic caches (SAFE-CACHE research, Nature 2026) is real but low-risk in a private MCP server context with authenticated users.

**Sources:**
- [GPTCache GitHub](https://github.com/zilliztech/GPTCache)
- [vCache / Adaptive Semantic Prompt Caching (arXiv 2502.03771)](https://arxiv.org/abs/2502.03771)
- [GPTCache Research Paper](https://arxiv.org/html/2411.05276v1)
- [imgdupes GitHub](https://github.com/knjcode/imgdupes)
- [Comparative Evaluation of Perceptual Hashing Methods (MDPI 2025)](https://www.mdpi.com/2079-9292/15/7/1493)
- [Semantic-Aware Image Deduplication](https://www.researchsquare.com/article/rs-6396148/v1)
- [Top LLM Gateways Supporting Semantic Caching in 2026](https://dev.to/debmckinney/top-llm-gateways-that-support-semantic-caching-in-2026-3dho)
