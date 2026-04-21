---
category: 29-rag-brand-knowledge
angle: 29c
title: "Brand Bundle Storage Patterns — Versioning, Retrieval, and Vector Store Architecture"
date: 2026-04-20
tags:
  - brand-bundle
  - vector-store
  - lancedb
  - chroma
  - milvus
  - content-addressing
  - rag
  - storage
  - versioning
status: research
---

# Brand Bundle Storage Patterns

## What needs to be stored

A `BrandBundle` is a composite artifact with three distinct storage requirements:

| Component | Format | Size | Retrieval pattern |
|---|---|---|---|
| Structured tokens (palette, typography, do-not) | JSON / DTCG | 1–50 KB | Exact lookup by `brand_id + version` |
| Style reference images | PNG/SVG | 50 KB–10 MB each | Similarity search via embeddings |
| Binary model artifacts (LoRA weights, IP-Adapter images) | safetensors | 40–500 MB | Exact lookup by URI + SHA256 |

These three storage modes are different enough that no single storage backend handles all three optimally. The practical architecture is a **hybrid**: structured JSON in a versioned document store or git repo, embeddings + metadata in a vector store, binary blobs in object storage (S3/GCS/R2) referenced by URI.

---

## Structured bundle storage

### Git as the source of truth

The JSON bundle is small (~1–50 KB), human-readable, and benefits from diff-able change history. Storing `brand-bundle.json` in git gives: versioning for free, PR-based approval workflow, audit trail of who changed what and when.

```
brands/
  acme-notes/
    brand-bundle.json       # current version
    brand-bundle.v1.0.0.json  # pinned snapshot
    CHANGELOG.md
  brandkit-demo/
    brand-bundle.json
```

The `$metadata.token_id` field should be `sha256(canonical_json)` — content-addressed so any consumer can verify integrity without trusting the filename or version tag.

### npm package distribution

For teams using the brand bundle in CI pipelines or web tooling, publishing as `@acme/brand-bundle` on npm (or a private registry) makes it consumable without git access:

```bash
npm install @acme/brand-bundle
```

```js
const bundle = require('@acme/brand-bundle');
const primary = bundle.color.brand.primary.$value; // "#FF6A00"
```

This pattern is proven by `@shopify/polaris-tokens` (157 K weekly downloads) and `@primer/primitives`.

---

## Vector store for style reference retrieval

### LanceDB (recommended for MCP server use)

LanceDB ([github.com/lancedb/lancedb](https://github.com/lancedb/lancedb)) runs embedded with no server process, persists to local disk or S3, and supports columnar storage optimized for vector+metadata queries. For the prompt-to-asset MCP server, this means the style reference index travels with the server process — no external service dependency.

Schema example:

```python
class StyleRefRecord(LanceModel):
    brand_id: str
    version: str
    role: str          # "primary_style_ref" | "icon_ref" | "moodboard"
    uri: str           # S3 URI to the actual image
    clip_vector: Vector(768)    # ViT-L-14 embedding
    csd_vector: Vector(768)     # Contrastive Style Descriptor embedding
    approved: bool
    generation_metadata: dict   # model, seed, prompt hash
```

Filtering by `brand_id` before similarity search is critical — without it, a query for "on-brand image" will return style refs from other brands that happen to share a visual register.

### Milvus — when scale requires a separate service

**Milvus** ([milvus.io](https://milvus.io)) supports hybrid search (vector similarity + attribute filtering), billion-scale collections, and ships an MCP server ([github.com/zilliztech/mcp-server-milvus](https://github.com/zilliztech/mcp-server-milvus)) with tools for vector search, hybrid search, and multi-vector search. Session-aware connection pooling is available via the Tailabs MCP variant ([github.com/tailabs/mcp-milvus](https://github.com/tailabs/mcp-milvus)).

Use Milvus when: managing brand bundles for hundreds of brands, requiring cross-brand style similarity (e.g., "find a brand whose style is close to this competitor"), or running the MCP server as a shared multi-tenant service.

### ChromaDB — prototyping only

ChromaDB is the lowest-friction option to stand up: `pip install chromadb`, no server config. But it lacks columnar storage and its Python multimodal support is less mature than LanceDB's. Use for local development; switch to LanceDB or Milvus for production.

> **Updated 2026-04-21:** The Rust-core rewrite that was "still settling" in early 2025 is now the stable Chroma 1.x production line (currently 1.5.x as of February 2026). It delivers ~4× write throughput over the previous Python-only implementation. The caveat about immaturity is now specifically about columnar storage and large-scale multimodal queries, not about rewrite stability.

---

## Binary artifact storage

Store style reference images and LoRA weights in object storage, referenced from the bundle JSON by URI:

```json
"style_references": [
  {
    "role": "primary_style_ref",
    "uri": "s3://acme-brand/style/hero-01.png",
    "sha256": "a1b2c3d4...",
    "clip_embedding_version": "ViT-L-14/laion2b_s32b_b82k"
  }
]
```

The `sha256` field enables the vector store to detect stale embeddings — if the image at the URI changes but the SHA matches what was indexed, the embedding is still valid.

For teams without S3, Git LFS works for images up to ~100 MB. LoRA weights (40–500 MB) should always go in object storage; LFS costs accumulate quickly.

---

## Content addressing and cache invalidation

The `token_id = sha256(canonical_json)` pattern makes cache invalidation deterministic. A generation cache key is:

```
cache_key = H(brand_token_id ‖ asset_slot ‖ concept ‖ seed ‖ model_sha ‖ template_version)
```

This key is stable across server restarts and deployments. If only the palette changes (new brand version), only the `brand_token_id` changes, invalidating all cached generations for that brand without touching other brands or other bundle versions.

Expected cache hit rate in iterative asset work: ~90–95 % once a brand's core assets are established.

---

## Retrieval API design

Expose storage through the MCP tool surface rather than letting callers query the vector store directly. The MCP tools should abstract over the storage backend:

```text
get_bundle(brand_id, version="latest") → BrandBundle JSON
get_style_refs(brand_id, role?, limit=5) → [StyleRefRecord]
find_similar_brands(query_image_uri, limit=3) → [{ brand_id, similarity_score }]
validate_asset(brand_id, image_uri) → { palette_pass, style_score, issues[] }
```

`find_similar_brands` is the cross-brand query that enables "I don't have a brand bundle — find me brands that look like this moodboard I uploaded." This uses the same vector table but without the `brand_id` filter.

---

## References

- lancedb/lancedb — [github.com/lancedb/lancedb](https://github.com/lancedb/lancedb)
- chroma-core/chroma — [github.com/chroma-core/chroma](https://github.com/chroma-core/chroma)
- zilliztech/mcp-server-milvus — [github.com/zilliztech/mcp-server-milvus](https://github.com/zilliztech/mcp-server-milvus)
- tailabs/mcp-milvus — [github.com/tailabs/mcp-milvus](https://github.com/tailabs/mcp-milvus)
- Shopify polaris-tokens — [github.com/Shopify/polaris-tokens](https://github.com/Shopify/polaris-tokens)
- primer/primitives — [github.com/primer/primitives](https://github.com/primer/primitives)
- Milvus + MCP — [milvus.io/docs/milvus_and_mcp.md](https://milvus.io/docs/milvus_and_mcp.md)
