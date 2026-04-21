# 30a — Agent Memory Architectures

## The Three Real Systems Worth Knowing

### Letta / MemGPT (github.com/cpacker/MemGPT)

Letta is the production form of the MemGPT research paper (arXiv 2310.08560). The core idea: treat the LLM context window like RAM and external storage like disk, and let the agent itself manage what moves between them.

Four memory tiers:

- **Message buffer** — the raw rolling conversation (FIFO, evicts oldest)
- **Core memory** — always-in-context structured blocks (user facts, agent persona). Character-limited, agent-editable via API calls.
- **Recall memory** — full interaction history stored in a searchable DB (vector + keyword). Retrieved on demand; never in context unless summoned.
- **Archival memory** — long-term external store (vector DB or graph). Agent decides what to persist here explicitly.

Agents call internal memory tools (`core_memory_replace`, `archival_memory_search`) as regular tool calls during inference. A "sleep-time agent" can refine memory asynchronously between sessions.

> **Updated 2026-04-21:** Letta's sleep-time compute concept has matured significantly. Sleep-time agents are now a first-class architecture in Letta: they share memory blocks with primary agents but run asynchronously in the background, using idle time to reorganize information, consolidate memories, and reason over conversation history — without adding latency to live calls. See [Letta sleep-time compute blog](https://www.letta.com/blog/sleep-time-compute).
>
> Letta also shipped a new **Letta V1 architecture** (`letta_v1_agent`) in 2026 that replaces the original MemGPT-style loop (heartbeats and `send_message` tool are deprecated). The V1 loop aligns with modern patterns: native model reasoning, direct assistant message generation, and full support for frontier models (GPT-5, Claude 4.5 Sonnet). The MemGPT-style architecture is now documented under [Legacy Agent Architectures](https://docs.letta.com/guides/legacy/architectures_overview).

**Practical fit for prompt-to-asset:** Core memory blocks are a clean fit for brand state — a block labeled `brand_bundle` with JSON (colors, fonts, model preferences) that the server populates at session start. Recall memory is useful for "what did the logo look like last time." The self-managing aspect is overkill for a single-purpose MCP server.

**Caveat:** Letta's full framework requires a running server process. For a local MCP server the relevant design pattern is the memory block concept, not the full stack.

---

### Mem0 (github.com/mem0ai/mem0)

Mem0 is a memory layer that wraps LLM providers. It extracts facts from conversation turns, deduplicates, and stores them with user/session/agent scoping.

Three scope levels:
- `user_id` — preferences that survive across all sessions
- `run_id` / `session_id` — context valid for one conversation
- `agent_id` — knowledge owned by a specific agent identity

v3 algorithm uses multi-signal retrieval (semantic search + BM25 keyword + entity linking). Reported metrics: 26% improvement on LLM-as-Judge vs no-memory baseline, 91% lower p95 latency vs naive retrieval, 90% token savings (arXiv 2504.19413).

Storage backends: vector DB (Qdrant, Pinecone, Chroma), relational (PostgreSQL), graph (Neo4j). Hosted platform available; also fully self-hostable.

**Practical fit:** Mem0's `user_id`-scoped memory is the closest off-the-shelf match for "remember that this user prefers Recraft over gpt-image-1." The extraction step (it actually parses the conversation to pull facts) means the MCP server doesn't need to explicitly write preferences — it just logs interactions and lets Mem0 infer.

**Caveat:** Adds a network hop (or a local service process). The extraction quality depends on the LLM used for extraction. Over-extracted memories become noise fast.

> **Updated 2026-04-21:** Mem0 SDK **v2.0.0** launched April 16, 2026 — a breaking release. Key changes: (1) Graph database support removed from the open-source SDK (no more Neo4j, Memgraph, Kuzu, or Apache AGE dependency — ~4,000 lines of graph driver code removed). Entity extraction and linking now happen natively inside the existing vector store via a parallel `{collection}_entities` collection. (2) Single-pass extraction per `add()` call reduces LLM calls by ~50% latency. (3) All 15 vector stores implement `keyword_search()` and `search_batch()`. (4) Hybrid retrieval: semantic + BM25 + entity-graph boosting. Migration guide at `docs.mem0.ai/migration/oss-v2-to-v3`. If your integration uses `enable_graph` parameters or the Neo4j backend, migration is required before upgrading. The hosted Mem0 Platform is unaffected — API contract is stable.

---

### LangMem (github.com/langchain-ai/langmem)

LangMem provides memory tools and a background memory manager for LangChain/LangGraph agents. Two operating modes:

- **Hot-path:** tools the agent calls during a live turn (`remember`, `search_memory`) — writes and reads happen inline, adding latency
- **Background:** an async process runs after each session, extracts facts, consolidates, deduplicates, writes to storage

LangMem is storage-agnostic. In production it typically uses PostgreSQL via `AsyncPostgresStore`. For local/simple use `InMemoryStore` works but doesn't persist across process restarts.

**Practical fit:** The background manager pattern is worth borrowing. After each asset generation call, a lightweight post-processing step could extract "user accepted Recraft output," "user rejected transparent background," etc., and write that to durable storage without adding latency to the generation path.

**Caveat:** LangMem is tightly coupled to LangGraph's store abstraction. Adapting it to a standalone MCP server means using only its storage API layer, not the full agent integration.

> **Updated 2026-04-21:** LangMem has a critical latency characteristic: **59.82s p95 search latency**. This makes it categorically unusable as a synchronous retrieval step in any interactive agent. LangMem should be used only for background or batch memory tasks (extraction runs after a session ends, not during a live tool call). For sub-second interactive memory retrieval, use Mem0 (0.200s p95) or direct SQLite reads instead.

---

---

### Emerging Frameworks Worth Tracking (2026)

Beyond the three main systems, several newer frameworks have reached production use:

- **Supermemory** — A single memory API covering fact extraction, user profile building, contradiction resolution, and selective forgetting. Ships an MCP server and plugins for Claude Code and OpenCode; strongest fit for coding-agent memory workflows. As of early 2026 this is the most purpose-built option for MCP-first agent memory.
- **Cognee** — Fully local deployment with no external services. Relevant for air-gapped environments or strict data residency. Uses a graph-augmented memory store similar to Graphiti but all-local.
- **EverMemOS** — Research-stage "Memory Operating System" for structured long-horizon reasoning. Not production-ready but published at ICLR 2026.

For prompt-to-asset's local-first MCP server posture, **Supermemory** (MCP-native) and **Cognee** (all-local) are the most relevant newcomers.

---

## Architecture Principle for prompt-to-asset

The frameworks above converge on the same layered model:

```
in-context (fast, volatile)  → core memory block (brand_bundle JSON)
near-context (session-scoped) → SQLite / in-process dict (generation log)
long-term (cross-session)     → SQLite WAL or Mem0 with user_id scoping
```

The MCP server should own the bottom two layers. The top layer (in-context) is just the `brand_bundle` parameter passed to each tool call — nothing to store, the LLM holds it.

## Sources

- [Letta Agent Memory Blog](https://www.letta.com/blog/agent-memory)
- [Letta Memory Management Docs](https://docs.letta.com/advanced/memory-management/)
- [Letta V1 Agent Architecture](https://www.letta.com/blog/letta-v1-agent)
- [Letta Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute)
- [Letta Legacy Architectures](https://docs.letta.com/guides/legacy/architectures_overview)
- [Mem0 arXiv Paper](https://arxiv.org/abs/2504.19413)
- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [Mem0 v2.0.0 Release](https://newreleases.io/project/github/mem0ai/mem0/release/v2.0.0)
- [Mem0 Changelog](https://docs.mem0.ai/changelog)
- [LangMem GitHub](https://github.com/langchain-ai/langmem)
- [LangMem Launch Blog](https://blog.langchain.com/langmem-sdk-launch/)
- [AI Agent Memory Comparison 2026](https://dev.to/anajuliabit/mem0-vs-zep-vs-langmem-vs-memoclaw-ai-agent-memory-comparison-2026-1l1k)
- [Best AI Agent Memory Frameworks 2026](https://machinelearningmastery.com/the-6-best-ai-agent-memory-frameworks-you-should-try-in-2026/)
- [State of AI Agent Memory 2026 — Mem0 Blog](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
