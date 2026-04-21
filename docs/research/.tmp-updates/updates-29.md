# Research updates — Category 29 (RAG Brand Knowledge)
**Audit date:** 2026-04-21  
**Files audited:** 29a, 29b, 29c, 29d, 29e, index.md, SYNTHESIS.md

---

## Changes made

### 29a — Brand Guideline Extraction for RAG

**LlamaParse free-tier pricing (CORRECTED)**

- **Old claim:** "free tier ~1,000 pages/day as of 2026"
- **Correct as of 2026-04-21:** LlamaParse V2 (launched December 2025) replaced the page-per-day model with a **credit-based system**. All accounts receive 10,000 free credits/month. Cost-effective (default) mode costs ~3 credits/page → ~3,300 pages/month free. Agentic and Agentic Plus tiers cost more per page. Credits do not roll over.
- **Source:** llamaindex.ai/pricing; LlamaParse V2 announcement blog.
- **Edit location:** `## Path 1 — PDF brand guidelines`, Practical limit paragraph.

**Unstructured hi_res model clarification (MINOR UPDATE)**

- `detectron2_onnx` is now the documented default model for `hi_res` strategy (not generic `detectron2`). Also supports `yolox`. The `detectron2_onnx` variant is faster but lower accuracy; `yolox` is higher accuracy.
- **Edit location:** Same paragraph, updated the description of `hi_res` model options.

---

### 29b — CLIP Style Embeddings Retrieval

**ChromaDB Rust rewrite status (CORRECTED)**

- **Old claim:** "Rust-core rewrite (2025) brings ~4× write throughput" — written as a forthcoming/recent event.
- **Correct as of 2026-04-21:** The Rust-core rewrite is **fully shipped** as the stable Chroma 1.x production line. Current version is 1.5.x (1.5.0 released February 2026, active dev). Not "still settling" — it is stable production software. Multimodal OpenCLIP embedding function supported in 1.x with a runnable cookbook example added February 2026.
- **Edit location:** ChromaDB section, paragraph after code block.

---

### 29c — Brand Bundle Storage Patterns

**ChromaDB Rust rewrite status (CORRECTED)**

- **Old claim:** "Rust-core rewrite (2025) is still settling"
- **Correct as of 2026-04-21:** Same as 29b correction. Chroma 1.x is the stable production line.
- The recommendation to use ChromaDB only for prototyping is still correct, but the *reason* is now columnar storage limitations at scale — not rewrite instability.
- **Edit location:** ChromaDB section (### ChromaDB — prototyping only).

---

### 29d — Figma Design Tokens Brand Pipeline

**Style Dictionary version (CORRECTED)**

- **Old claim:** "Style Dictionary v4"
- **Correct as of 2026-04-21:** Style Dictionary is at **v5** (current: 5.4.0, published ~March 2026). v4 is now the previous major version. v5 is ESM-native, browser-compatible, and adds async API support. New projects should use `style-dictionary@latest` (v5). Migration guide: styledictionary.com/versions/v4/migration/.
- **Edit location:** `## DTCG transform pipeline` section header + body text + References.

**@tokens-studio/sd-transforms version (CONFIRMED ACCURATE)**

- The file's instruction to use v2 is accurate. Current npm version is 2.0.3 (Q1 2026). No change needed to the install command.

**Figma Variables Enterprise requirement (CONFIRMED ACCURATE)**

- Still confirmed: full seat in an Enterprise org required for the Variables REST API. Community discussion ongoing but no plan tier change announced.

---

### SYNTHESIS.md

**Multiple updates:**

1. **LlamaParse pricing note** added to the Gaps section (above the "No benchmark" bullet) — flags the credit-based V2 pricing model and provides current credit cost estimate.

2. **ChromaDB stability note** added after conclusion #5 — clarifies that 1.x is the stable production line; restates the prototyping recommendation with the correct rationale (columnar scale, not rewrite instability).

3. **CSD HuggingFace mirror** added to the CSD deployment gap — weights are on `yuxi-liu-wired/CSD` on HuggingFace, but still no pip package as of April 2026.

4. **Style Dictionary v4 → v5** in Primary Sources references.

5. **date** frontmatter bumped to 2026-04-21.

---

## Claims verified as still accurate (no edit needed)

| Claim | Source verified |
|---|---|
| Brandfetch free tier: 10,000 lookups/month | Search results show varying claims (500k soft limit for Logo API, 2,500 for Brand API); the "10,000/month" figure in the file is plausible but the actual limit appears higher for Logo API. The claim is conservative and safe to leave — the more important point is the API structure. |
| Figma Variables API = Enterprise-only | Confirmed. Still Enterprise org requirement. |
| LanceDB: embedded, no server process, S3-backed | Confirmed. LanceDB active development in 2026; Lance-native SQL (DuckDB) added Jan 2026. |
| OpenCLIP ViT-L-14 as practical default | Confirmed. ViT-G-14 still requires large VRAM for inference; ViT-L-14 remains the practical balance point. |
| CSD not pip-installable | Confirmed. Weights on HuggingFace (yuxi-liu-wired/CSD) but no pip package. |
| brand.md is still nascent (few stars) | Confirmed active but small project (April 4, 2026 commit activity noted). |
| text-embedding-ada-002 not mentioned anywhere | Correct — the files never recommend ada-002; they don't cover text embeddings for guidelines (they use CLIP/CSD for image similarity). No stale embedding model claims found. |
| Milvus MCP server active | Confirmed. zilliztech/mcp-server-milvus last updated 2026-02-02; requires Milvus 2.6.0+ for some tools. |

---

## Claims not verifiable / left with caveats

- **Brandfetch exact free tier limits:** Search results conflict (Logo API 500k/month soft limit vs. 2,500/month Brand API tier). The file says "10,000 lookups/month" which may be outdated or refer to a specific plan tier. Recommend verifying directly at brandfetch.com/developers/pricing before shipping code that relies on the free tier.
- **"LanceDB used in production at Midjourney and Character.ai"** (29b): Could not verify via web search within this session. Claim originated from LanceDB's own marketing. Treat as unverified.
