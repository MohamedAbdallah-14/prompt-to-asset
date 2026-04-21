# Research Update Log — Category 30 (Agent Memory State)
**Date:** 2026-04-21  
**Auditor:** Claude Sonnet 4.6  

---

## Files Audited

| File | Status |
|---|---|
| `30a-agent-memory-architectures.md` | Updated |
| `30b-session-vs-longterm-memory.md` | Updated |
| `30c-mcp-resources-persistent-state.md` | Updated |
| `30d-user-preference-learning.md` | Updated |
| `30e-asset-set-coherence-tracking.md` | Updated |
| `SYNTHESIS.md` | Updated |
| `index.md` | No changes needed (already dated 2026-04-21) |

---

## Changes Made

### 30a — Agent Memory Architectures

1. **Mem0 v2.0.0 breaking release (April 16, 2026)** — Added `> Updated 2026-04-21:` block under the Mem0 section.
   - Graph database (Neo4j/Memgraph/Kuzu/AGE) removed from open-source SDK. ~4,000 lines of graph driver code gone.
   - Entity extraction now built into `add()` as a single-pass operation (~50% latency reduction).
   - All 15 vector stores implement `keyword_search()` and `search_batch()`.
   - Hybrid retrieval: semantic + BM25 + entity-graph boosting.
   - Migration required for existing integrations. Guide: `docs.mem0.ai/migration/oss-v2-to-v3`.
   - Hosted platform API is stable; only open-source SDK is breaking.

2. **New frameworks section added** — "Emerging Frameworks Worth Tracking (2026)":
   - **Supermemory**: MCP-native memory API (fact extraction, profile building, contradiction resolution, selective forgetting). Ships MCP server compatible with Claude Code. Most purpose-fit for MCP-first deployments.
   - **Cognee**: Fully local deployment, graph-augmented memory, no external services. For air-gapped/data-residency use cases.
   - **EverMemOS**: Research-stage memory OS for long-horizon reasoning (ICLR 2026). Not production-ready.

3. **Updated sources list** — Added Mem0 v2.0.0 release link, Mem0 changelog, and two 2026 framework comparison articles.

---

### 30b — Session vs Long-Term Memory

1. **Claude context window update** — Added `> Updated 2026-04-21:` block after the statement about 200k+ context windows.
   - Confirmed all Claude 4.x models: 200k standard context window.
   - Claude Sonnet 4.6 and Opus 4.6 additionally support **1M tokens** at standard pricing in usage tier 4 (no beta header required for these models).
   - Claude Haiku 4.5 remains at 200k.
   - GPT-4o remains at 128k.
   - Impact noted: at 200k tokens (~150,000 words) the in-process session dict is rarely needed.

2. **Graphiti MCP Server v1.0 update** — Extended the existing Zep `> Updated 2026-04-21:` block.
   - Graphiti MCP Server v1.0 shipped November 2025, compatible with Claude Desktop, Cursor, and any MCP client.
   - P95 graph search latency improved from 600ms → 150ms via infrastructure work in late 2025.

---

### 30c — MCP Resources and Persistent State

1. **MCP governance transfer confirmed** — Rewrote the existing `> Updated 2026-04-21:` block with more precise detail.
   - Anthropic transferred MCP governance to the **Agentic AI Foundation (AAIF)**, a Linux Foundation entity, on March 20, 2026.
   - Supporting members: Google, Microsoft, AWS, Cloudflare, Bloomberg, Intuit, and others.
   - 2026 roadmap has four priority areas: Transport evolution (Streamable HTTP), Tasks primitive lifecycle gaps, Governance maturation, Enterprise readiness.

2. **Tasks primitive status corrected** — Previously described as roadmap; now correctly marked as "experimental/shipped."
   - Tasks primitive (SEP-1686) is now an experimental feature.
   - Known gaps being addressed: retry semantics on transient failure, expiry policy for completed results.

3. **New `> Updated 2026-04-21:` block added to Prompts section** — Notes that the Tasks primitive is the correct async primitive for long-running asset generation (not Resources). Recommends watching AAIF lifecycle semantics before adopting in production.

---

### 30d — User Preference Learning

1. **Mem0 v2.0.0 integration impact** — Added `> Updated 2026-04-21:` block under the Mem0 Production Architecture section.
   - Single-pass extraction in `add()` removes the need for a separate secondary LLM call.
   - Graph backend removed — entity relationship queries need to be rebuilt using entity-boosted vector search.
   - Migration required: `docs.mem0.ai/migration/oss-v2-to-v3`.

2. **Supermemory section added** — New subsection "Supermemory as an MCP-Native Alternative" with `> Updated 2026-04-21:` block.
   - Covers full preference lifecycle with MCP server.
   - Recommended as the lowest-friction preference backend for MCP-first deployments.
   - Evaluation recommended before investing in custom `preference_log` SQLite schema.

3. **Sources updated** — Added Mem0 v2.0.0 release, Mem0 changelog, Supermemory docs, and best-frameworks-2026 article.

---

### 30e — Asset Set Coherence Tracking

1. **Updated `> Updated 2026-04-21:` block added** to the Provider-Specific Coherence Mechanisms section.
   - Clarified that `style_seed` in the schema maps to Recraft `style_id` — not a diffusion integer seed.
   - FLUX.2 10-reference-image API confirmed as the correct `ref_asset_id` FK value for non-Recraft providers.
   - Core schema and approach remain accurate; no structural changes needed.

---

### SYNTHESIS.md

1. **Date corrected** — `2026-04-20` → `2026-04-21`.

2. **Files table updated** — All five angle takeaways revised to reflect April 2026 findings:
   - 30a: Mem0 v2 graph removal, Supermemory entry.
   - 30b: Sonnet 4.6 / Opus 4.6 1M token support, Graphiti MCP Server v1.0.
   - 30c: AAIF governance, Tasks primitive experimental.
   - 30d: Mem0 v2 faster extraction, Supermemory as lowest-friction option.
   - 30e: Recraft style_id = style_seed, FLUX.2 10-ref fallback.

3. **Design Decisions section extended** — Added two new decision points:
   - Decision 5: Context window vs. storage (1M context changes the inline-injection viability threshold).
   - Decision 6: Supermemory vs. custom SQLite (evaluate before building bespoke schema).

4. **"What Was Not Found" section updated** — Added Supermemory as a close-but-not-exact analogue, and confirmed that visual coherence tracking (30e schema) remains original work with no direct published analogues.

---

## Facts Verified by Web Search

| Claim | Status | Source |
|---|---|---|
| Letta renamed from MemGPT — active | Confirmed. Letta V1 architecture ships; MemGPT-style loop is now "Legacy" in docs | letta.com/blog/letta-v1-agent |
| Letta V1 deprecates heartbeats / send_message | Confirmed | docs.letta.com/guides/legacy/architectures_overview |
| Mem0 v2.0.0 breaking release April 2026 | Confirmed. Launched April 16, 2026 | newreleases.io/project/github/mem0ai/mem0/release/v2.0.0 |
| Mem0 v2 removes Neo4j graph backend | Confirmed | docs.mem0.ai/changelog |
| Zep / Graphiti 20k stars | Confirmed | github.com/getzep/graphiti |
| Graphiti MCP Server v1.0 (Nov 2025) | Confirmed | getzep.com/product/open-source/ |
| Graphiti P95 latency 600ms → 150ms | Confirmed | getzep.com/product/open-source/ |
| Claude 4.x models 200k standard context | Confirmed | platform.claude.com/docs/en/about-claude/models/overview |
| Claude Sonnet 4.6 / Opus 4.6 support 1M tokens | Confirmed (tier 4 / standard pricing) | morphllm.com/claude-context-window |
| MCP governance → AAIF / Linux Foundation | Confirmed (March 20, 2026) | blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/ |
| Tasks primitive (SEP-1686) experimental | Confirmed | modelcontextprotocol.io/development/roadmap |
| Anthropic memory tool beta header confirmed | Confirmed (context-management-2025-06-27) | platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool |
| Supermemory MCP server exists | Confirmed | supermemory.ai/docs/memory-api/sdks/anthropic-claude-memory |
| LangMem p95 latency 59.82s | Confirmed (third-party benchmark cited in search results) | atlan.com/know/long-term-memory-langchain-agents/ |
| LangGraph: MemorySaver dev only, PostgresSaver for prod | Confirmed | docs.langchain.com/oss/python/langgraph/add-memory |

---

## No-Change Items

- **MemGPT reference in 30a header** — Already shows "Letta / MemGPT" with parenthetical; the body correctly uses "Letta" throughout. No cleanup needed.
- **Redis Stack** — No material changes found for 2026; RedisJSON 2.8 is still current. The semantic caching reference in 30e remains accurate. No update block added.
- **LangMem 59.82s latency** — Already documented in 30a with a 2026-04-21 block. Confirmed by web search. No additional changes.
- **Zep LongMemEval 63.8% vs Mem0 49.0%** — Already documented in 30b. No change.
- **Claude API Memory Tool** — Already documented in 30b with full detail. No change.
- **30e coherence schema** — Core schema remains accurate. Update block added for Recraft/FLUX.2 clarifications only.
