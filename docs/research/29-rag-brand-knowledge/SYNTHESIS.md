---
category: 29-rag-brand-knowledge
category_title: "RAG for Brand Knowledge — retrieval patterns for consistent asset generation"
indexer: category-indexer-29
date: 2026-04-21
angles_indexed:
  - 29a-brand-guideline-extraction-rag
  - 29b-clip-style-embeddings-retrieval
  - 29c-brand-bundle-storage-patterns
  - 29d-figma-design-tokens-brand-pipeline
  - 29e-brand-consistency-across-sessions
word_count_target: 2000-3500
primary_concept: rag-brand-retrieval
downstream_consumers:
  - docs/research/SYNTHESIS.md
  - packages/asset-enhancer (brand_bundle_parse)
  - MCP tool: asset_brand_bundle_parse
  - MCP tool: asset_enhance_prompt
primary_sources_aggregated: 40+
---

> **📅 Research snapshot as of 2026-04-20.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 29 — RAG for Brand Knowledge

## Category Executive Summary

This category answers one product question: **how does the prompt-to-asset server remember who the user's brand is and retrieve the right style context on every generation call, across sessions?** The five angles converge on a layered retrieval architecture — structured bundle storage + vector embeddings for style similarity + a persistent memory protocol — but each angle addresses a different acquisition or storage problem. The 12 operative conclusions below drive the actionable recommendations.

1. **Brand extraction is a three-path routing problem.** PDF → LlamaIndex/LlamaParse + Pydantic extraction. Live URL → Dembrandt (Playwright + CSS analysis + confidence scoring). Domain name → Brandfetch API (colors, fonts, logos in one REST call). Each path fills different bundle fields; the merge order is: PDF-extracted > Brandfetch > dembrandt computed ([29a](./29a-brand-guideline-extraction-rag.md)).

2. **LLM extraction of hex codes from PDFs has a ~10–20 % field error rate.** Rasterized color swatches with no hex label are the failure mode. Always validate extracted hex strings against `^#[0-9A-Fa-f]{6}$` and reject rather than propagate. Human approval before promoting any extracted bundle to production is non-negotiable ([29a §Caveats](./29a-brand-guideline-extraction-rag.md)).

3. **Dembrandt is the best cold-start path for live URLs.** It extracts logo, semantic color palette, typography, spacing, and brand identity tokens in a single CLI call, has MCP integration (`get_color_palette`, `get_typography`, `get_brand_identity`), and had an active release as of April 2026 ([29a §Path 2](./29a-brand-guideline-extraction-rag.md)).

4. **CLIP alone is insufficient for style retrieval.** CLIP embeddings conflate semantic content and visual style — a brand moodboard of blue-sky product shots retrieves ocean photographs, not blue-palette illustrations. For brand style similarity, prefer **CSD** (Contrastive Style Descriptor, [arXiv:2404.01292](https://arxiv.org/abs/2404.01292)) which is trained specifically to suppress content and preserve style. Use both: CLIP for semantic+style combined queries, CSD for pure style matching and drift detection ([29b §CLIP limitations](./29b-clip-style-embeddings-retrieval.md)).

5. **LanceDB is the right vector store for the MCP server.** It runs embedded (no server process), persists to local disk or S3, supports multimodal tables with built-in OpenCLIP embedding, and is used in production at Midjourney and Runway. ChromaDB is acceptable for prototyping; Milvus for multi-tenant at scale ([29c §Vector store](./29c-brand-bundle-storage-patterns.md)).

> **Updated 2026-04-21:** ChromaDB's Rust-core rewrite is now the stable 1.x production line (1.5.x as of Feb 2026), delivering ~4× write throughput. It is no longer "still settling." The prototyping-only recommendation stands for a different reason: LanceDB's columnar storage and native Lance SQL (DuckDB integration, Jan 2026) have outpaced Chroma at multimodal scale.

6. **Brand bundle storage is a three-tier problem.** JSON bundle in git (diffable, PR-reviewable). CLIP+CSD embeddings + metadata in LanceDB. Binary blobs (style reference images, LoRA weights) in S3 referenced by SHA256-validated URI. No single backend handles all three optimally ([29c §What needs to be stored](./29c-brand-bundle-storage-patterns.md)).

7. **Figma Variables REST API requires Enterprise plan.** The `file_variables:read` scope is Enterprise-only. Teams on Professional or Starter must use plugin-based manual export (TokensBrücke, Design Tokens W3C Export) or the manual "Export as JSON" in the Variables panel. The CI-driven path (GitHub Actions + Figma API) is only available to Enterprise orgs ([29d §API access tiers](./29d-figma-design-tokens-brand-pipeline.md)).

8. **Figma Variables cover the token layer only.** `$extensions.ai.generation` fields — `style_prose`, `prohibited_elements`, `model_bindings`, `loras`, `style_references`, `validation` thresholds — are never present in Figma Variables exports. They are always hand-authored or derived from extraction. The Figma pipeline feeds `color.*` and `typography.*`; the AI generation extension is a separate authoring step ([29d §Mapping Figma output](./29d-figma-design-tokens-brand-pipeline.md)).

9. **brand.md is a complementary format, not a replacement for brand-bundle.json.** `brand.md` ([thebrand.md](https://thebrand.md)) covers strategy, voice, and visual register in human-readable markdown — useful as project-level context for AI coding agents. It does not cover model bindings, LoRA handles, style reference image URIs, or validation thresholds. Generate `brand.md` automatically from the bundle's prose fields as a human-facing companion document ([29e §brand.md vs. brand-bundle.json](./29e-brand-consistency-across-sessions.md)).

10. **Content addressing is the right consistency primitive.** `token_id = sha256(canonical_json)` makes the bundle immutable per version. Generation cache key: `H(brand_token_id ‖ slot ‖ concept ‖ seed ‖ model_sha ‖ template_version)`. Cache hit rate in iterative work: ~90–95 %. Bundle version change invalidates only affected cache entries ([29c §Content addressing](./29c-brand-bundle-storage-patterns.md), [29e §Persistent bundle](./29e-brand-consistency-across-sessions.md)).

11. **Auto-completion of partial bundles is feasible from a logo PNG.** Extract palette via K-means (LAB space, k=5), assign semantic roles by saturation/lightness heuristics, CLIP-embed the logo to retrieve the nearest existing bundle and borrow its `style_prose`, then LLM-generate a fresh style description. This gives a usable draft bundle from a single image input ([29e §Auto-completion pipeline](./29e-brand-consistency-across-sessions.md)).

12. **Cross-session drift detection requires a set-level metric.** Per-asset CSD and ΔE2000 checks (category 15) do not detect gradual drift across 50 approved generations. Store CLIP embeddings of all approved assets per brand, compute pairwise CSD cosine on a rolling window of 20, flag if mean drops below 0.70 ([29e §Style drift detection](./29e-brand-consistency-across-sessions.md)).

---

## Map of the Angles

| Angle | Scope | Key tool/method | Where it feeds in the bundle |
|---|---|---|---|
| **29a** — Brand guideline extraction | PDF, URL, domain → BrandBundle fields | LlamaIndex, LlamaParse, Dembrandt, Brandfetch | `color.*`, `typography.*`, `style_prose`, `prohibited_elements` |
| **29b** — CLIP style embeddings | Style similarity search, drift detection | OpenCLIP, CSD, clip-retrieval, LanceDB | `style_references[].clip_embedding`, validation scores |
| **29c** — Brand bundle storage | Versioned storage, retrieval architecture | LanceDB, Milvus, git, S3 | Entire bundle + binary blobs |
| **29d** — Figma → design tokens | Palette and typography from Figma Variables | Figma REST API, Style Dictionary, TokensBrücke | `color.*`, `typography.*` |
| **29e** — Cross-session consistency | Persistent memory, auto-completion, drift | brand.md, MCP resources, provenance tracking | `provenance.approved_generations`, `$metadata.token_id` |

---

## Recommended Implementation Order

1. **Ship Dembrandt + Brandfetch extraction first** (29a, Path 2 + 3). No Enterprise Figma plan needed. Covers the majority of users who have a website or domain but no PDF guidelines. Build the approval gate UI before the vector store.

2. **Add LanceDB style reference indexing** (29b + 29c). Index the approved logo from step 1 as the first style reference. All subsequent asset validations query against it. This is the minimum viable RAG loop.

3. **Add PDF extraction** (29a, Path 1). LlamaParse for hosted, Unstructured for self-hosted. Lower priority than URL extraction because fewer users have PDF guidelines than live websites.

4. **Add Figma pipeline** (29d). Target Enterprise plan users. Wire GitHub Actions → Figma API → Style Dictionary → bundle PR as the automated workflow.

5. **Add cross-session drift detection** (29e). Requires a corpus of approved generations to compute rolling similarity; only becomes meaningful after the user has approved ~20+ assets.

---

## Gaps

> **Updated 2026-04-21:** **LlamaParse V2 pricing model changed (December 2025).** The previous "1,000 pages/day free" framing is stale. LlamaParse now uses a credit-based system: 10,000 free credits/month for all accounts. Cost-effective mode (the default) costs ~3 credits/page ≈ ~3,300 pages/month free. Agentic/Agentic Plus modes cost significantly more per page. The `POST /api/parsing/upload` endpoint is unchanged; only the billing model changed. Check [llamaindex.ai/pricing](https://www.llamaindex.ai/pricing) for current credit costs per tier.

- **No benchmark for extraction accuracy.** The ~10–20 % field error rate for hex codes from PDFs is an empirical estimate from practitioner reports, not a measured result against a labeled test set. Build a small evaluation set (20 brand guidelines PDFs with known hex codes) and measure LlamaParse + GPT-4V accuracy before shipping.
- **Semantic role assignment is heuristic.** Calling the most-saturated extracted color "accent" and the darkest one "primary" works for most brands but fails for monochromatic brands (where saturation differences are small) and brands with inverted contrast hierarchies. Add a UI step where the user confirms role assignments before locking the bundle.
- **CSD model is not packaged for easy deployment.** [learn2phoenix/CSD](https://github.com/learn2phoenix/CSD) requires manual checkpoint download and is not available as a pip package or LanceDB embedding function. Weights are also mirrored on Hugging Face at `yuxi-liu-wired/CSD` for easier download, but there is still no `pip install` path as of April 2026. Either package it or fall back to CLIP with explicit content-suppression prompts for style similarity queries until CSD is more accessible.
- **Figma Styles (typography) vs. Variables (colors) split.** The Figma API requires two separate calls — Variables for colors, Styles for typography weights/sizes — and the merge logic is non-trivial when aliases cross the two systems. This needs its own integration work.
- **brand.md auto-generation from bundle is unimplemented.** The template for converting `$extensions.ai.generation.voice` and `style_prose` into `brand.md` Visual + Voice sections is a straightforward LLM task but needs to be built explicitly.

---

## Primary Sources

**Extraction tools:**
- LlamaIndex — [github.com/run-llama/llama_index](https://github.com/run-llama/llama_index)
- LlamaParse — [llamaindex.ai/blog/4-ways-llamacloud-scales-enterprise-rag](https://www.llamaindex.ai/blog/4-ways-llamacloud-scales-enterprise-rag)
- Unstructured — [github.com/Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured)
- Dembrandt — [github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt)
- Brandfetch API — [brandfetch.com/developers](https://brandfetch.com/developers)
- brandfetch-mcp — [github.com/djmoore711/brandfetch-mcp](https://github.com/djmoore711/brandfetch-mcp)

**Embedding and retrieval:**
- mlfoundations/open_clip — [github.com/mlfoundations/open_clip](https://github.com/mlfoundations/open_clip)
- rom1504/clip-retrieval — [github.com/rom1504/clip-retrieval](https://github.com/rom1504/clip-retrieval)
- Somepalli et al., CSD, arXiv:2404.01292 — [arxiv.org/abs/2404.01292](https://arxiv.org/abs/2404.01292)
- LanceDB — [github.com/lancedb/lancedb](https://github.com/lancedb/lancedb)
- ChromaDB — [github.com/chroma-core/chroma](https://github.com/chroma-core/chroma)
- Milvus MCP — [github.com/zilliztech/mcp-server-milvus](https://github.com/zilliztech/mcp-server-milvus)

**Design tokens and Figma:**
- Figma Variables REST API — [developers.figma.com/docs/rest-api/variables-endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- Style Dictionary v5 (current as of 2026) — [styledictionary.com](https://styledictionary.com/)
- @tokens-studio/sd-transforms — [github.com/tokens-studio/sd-transforms](https://github.com/tokens-studio/sd-transforms)
- figma/variables-github-action-example — [github.com/figma/variables-github-action-example](https://github.com/figma/variables-github-action-example)
- DTCG Format Module 2025.10 — [designtokens.org/tr/drafts/format](https://www.designtokens.org/tr/drafts/format/)

**Brand format standards:**
- brand.md — [thebrand.md](https://thebrand.md/)
- VoltAgent/awesome-design-md — [github.com/VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- Atlassian llms-tokens.txt — [atlassian.design/llms-tokens.txt](https://atlassian.design/llms-tokens.txt)
- IBM Carbon MCP — [github.com/carbon-design-system/carbon-mcp](https://github.com/carbon-design-system/carbon-mcp)
- OpenAI Cookbook — CLIP image search — [developers.openai.com/cookbook/examples/custom_image_embedding_search](https://developers.openai.com/cookbook/examples/custom_image_embedding_search)
