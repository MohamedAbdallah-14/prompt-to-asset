# 30b — Session vs Long-Term Memory

## The Core Distinction

Session memory: data that is valid for one unbroken interaction. When the process restarts (or the MCP client disconnects), it's gone. Appropriate for: generation log within a single conversation, the current brand_bundle being built, model routing decisions made this session.

Long-term memory: data that persists across process restarts, client reconnections, and calendar time. Appropriate for: user model preferences, validated brand bundles, "project foo always uses Raleway Bold and #2D2D2D."

The mistake most agent systems make is trying to use one storage layer for both. Session data needs zero-latency reads and writes; long-term data needs durability and queryability.

---

## Session Memory Patterns

### In-Process Dict / LRU Cache

The simplest session store is a Python dict keyed by `session_id` (or a UUID generated at connection time). The MCP server process keeps this alive across tool calls within a session; it dies with the process.

Good enough for:
- Current `brand_bundle` active in a session
- List of asset paths generated so far (for coherence checks)
- Temporary model routing decision ("user asked for inline_svg this session, use that until overridden")

The MCP medium memory example (Parichay Pothepalli, Medium) demonstrates this with a `SessionContext` class using a 10-item LRU buffer and configurable TTL (30-min default with background cleanup thread).

**Caveat:** This breaks the "stateless MCP server" assumption. If you run the server behind a load balancer or restart it between calls, session state evaporates. For a local single-process MCP server this is fine; for a hosted service it requires sticky sessions or external state.

### Token-Passing (Client-Side Session State)

The stateless alternative: the client (the LLM) holds the session state as part of its context and passes it as a parameter on every tool call. In MCP terms, this means the LLM passes a `session_context` or `brand_bundle` JSON blob to each `asset_generate_*` call.

The MCP spec acknowledges this pattern explicitly. Glama's analysis of stateless MCP memory notes that token-passing "keeps tools stateless, but context size may grow rapidly."

**Practical fit:** This is already how `brand_bundle` works in the current tool surface. The LLM accumulates brand state during the conversation and passes it on each call. No infrastructure needed. The limit is context window size and the LLM's reliability in maintaining JSON across turns.

---

## Long-Term Memory Patterns

### Zep — Temporal Knowledge Graph

Zep (github.com/getzep/zep, arXiv 2501.13956) uses Graphiti, a knowledge graph engine that evolves with every interaction. Facts are associated with timestamps; when preferences change, old facts are invalidated rather than overwritten.

Session memory in Zep: per-session message history, auto-summarized for context windows.
Long-term memory: user-level knowledge graph accumulating across sessions.

Benchmark: 94.8% accuracy on Deep Memory Retrieval vs 93.4% for MemGPT. 90% latency reduction vs naive retrieval.

> **Updated 2026-04-21:** More recent LongMemEval benchmarks (GPT-4o) show Zep at 63.8% vs Mem0 at 49.0% — a 15-point gap that reflects Zep's temporal fact modeling advantage over flat vector storage. Graphiti (Zep's open-source graph engine) crossed 20,000 GitHub stars in early 2026 and is production-grade, with expanding enterprise adoption. Zep has separated clearly into a hosted context-engineering platform and an open-source Graphiti library — the library is usable without the full Zep service. Additionally, **Graphiti MCP Server v1.0** shipped in November 2025 and is compatible with Claude Desktop, Cursor, and any MCP client — this makes Graphiti usable as a drop-in memory backend for MCP servers without writing custom tool integrations. Infrastructure work in late 2025 brought Graphiti P95 graph search latency from 600ms to 150ms, putting it in interactive-viable range.

**Practical fit:** Zep's user-level graph is the right model for "user prefers Recraft, hates checkerboard outputs, always wants 1024×1024." The session-level summary is less useful — asset generation sessions are short.

**Caveat:** Zep is a service (hosted or self-hosted). It adds a hard external dependency for what is fundamentally a local tool. For a CLI-first MCP server, this is a significant burden to put on users. Using Graphiti directly (without the Zep platform) reduces operational overhead but requires a Neo4j or compatible graph backend.

### SQLite WAL as the Transition Point

SQLite in WAL mode is the natural middle ground: durable, file-based, zero external process. A `~/.prompt-to-asset/memory.db` with two tables covers both layers:

```sql
CREATE TABLE session_log (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  ts INTEGER,
  asset_type TEXT,
  mode TEXT,
  provider TEXT,
  accepted INTEGER,  -- 1 if user kept it, 0 if rejected
  bundle_hash TEXT
);

CREATE TABLE user_prefs (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);
```

Session log entries expire after N days (a cron or cleanup on startup). User prefs persist indefinitely.

This is the architecture used by Stevens (Geoffrey Litt, 2025): a single SQLite table, no vector DB, arbitrary text values, populated by importers and read by the LLM on each request.

---

## The Boundary Decision for prompt-to-asset

The cleanest boundary:

| Scope | Storage | What goes there |
|---|---|---|
| Single tool call | Parameter (token-passing) | `brand_bundle`, `mode` |
| Session | In-process dict (optional) | Generation log, validated paths |
| Cross-session | SQLite `user_prefs` | Provider preference, brand bundles by project name |

LLMs with long context windows (200k+) can absorb the full session log as injected context at the start of each call — eliminating the in-process dict entirely and keeping the server fully stateless.

> **Updated 2026-04-21:** Claude context windows as of April 2026: all Claude 4.x models (Haiku 4.5, Sonnet 4.6, Opus 4.6) carry a **200k-token standard context window**. Additionally, Claude Sonnet 4.6 and Opus 4.6 support **1M tokens** at standard pricing (no beta header required in usage tier 4). Claude Haiku 4.5 remains at 200k. GPT-4o is at 128k. This 200k floor changes the calculus for session-log injection: at 200k tokens you can include ~150,000 words of session history inline — the in-process dict is rarely needed unless you're building for long-running agentic loops lasting multiple hours.

> **Updated 2026-04-21:** Anthropic now offers a first-party **Memory Tool** (`type: memory_20250818`) in the Claude API. It supports six file-level operations (view, create, str\_replace, insert, delete, rename) and provides persistent cross-session memory managed by the LLM itself. Compatible models: Sonnet 4.6/4.5/4, Opus 4.5/4.1/4, Haiku 4.5. The tool requires the beta header `context-management-2025-06-27`. This is a viable alternative to rolling a custom SQLite preference store for Claude-hosted agentic workflows — though for an MCP server it still requires the application to call the tool and manage the backing storage. Anthropic reports an 84% token reduction in extended workflows when using this tool to avoid re-loading known context. See [Memory Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool).

## Sources

- [Zep arXiv Paper](https://arxiv.org/abs/2501.13956)
- [Zep Agent Memory](https://www.getzep.com/product/agent-memory/)
- [Graphiti GitHub](https://github.com/getzep/graphiti)
- [Stevens SQLite Assistant](https://www.geoffreylitt.com/2025/04/12/how-i-made-a-useful-ai-assistant-with-one-sqlite-table-and-a-handful-of-cron-jobs)
- [Glama MCP Memory Patterns](https://glama.ai/blog/2025-08-15-can-mcp-tools-remember-things-between-calls)
- [MCP Memory and State Management](https://medium.com/@parichay2406/mcp-memory-and-state-management-8738dd920e16)
- [Claude API Memory Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)
