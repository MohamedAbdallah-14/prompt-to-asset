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

---

### LangMem (github.com/langchain-ai/langmem)

LangMem provides memory tools and a background memory manager for LangChain/LangGraph agents. Two operating modes:

- **Hot-path:** tools the agent calls during a live turn (`remember`, `search_memory`) — writes and reads happen inline, adding latency
- **Background:** an async process runs after each session, extracts facts, consolidates, deduplicates, writes to storage

LangMem is storage-agnostic. In production it typically uses PostgreSQL via `AsyncPostgresStore`. For local/simple use `InMemoryStore` works but doesn't persist across process restarts.

**Practical fit:** The background manager pattern is worth borrowing. After each asset generation call, a lightweight post-processing step could extract "user accepted Recraft output," "user rejected transparent background," etc., and write that to durable storage without adding latency to the generation path.

**Caveat:** LangMem is tightly coupled to LangGraph's store abstraction. Adapting it to a standalone MCP server means using only its storage API layer, not the full agent integration.

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
- [Mem0 arXiv Paper](https://arxiv.org/abs/2504.19413)
- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [LangMem GitHub](https://github.com/langchain-ai/langmem)
- [LangMem Launch Blog](https://blog.langchain.com/langmem-sdk-launch/)
