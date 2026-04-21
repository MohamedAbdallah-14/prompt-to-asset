# Research Set 30 — Agent Memory and State Management

**Problem:** prompt-to-asset is a stateless server (one MCP call → one asset), but users need multi-turn consistency: the second logo should match the first, the icon pack should feel like a set, "I prefer Recraft" should not need re-stating every session.

**Scope of research:** April 2026

---

## Files

| File | Topic | Key Takeaway |
|---|---|---|
| [30a](./30a-agent-memory-architectures.md) | Letta/MemGPT, Mem0, LangMem architectures | Use memory block pattern (Letta) + multi-level scoping (Mem0). Full frameworks are overkill; borrow the patterns. |
| [30b](./30b-session-vs-longterm-memory.md) | Session vs long-term memory, storage options | Session: token-passing (already working). Cross-session: SQLite WAL at `~/.prompt-to-asset/memory.db`. Zep/LangGraph are valid but add operational complexity. |
| [30c](./30c-mcp-resources-persistent-state.md) | MCP Resources and Prompts spec | Expose brand bundles as `asset-memory://projects/{name}/brand-bundle` resources. Host auto-injects high-priority resources into context — no tool call needed. |
| [30d](./30d-user-preference-learning.md) | User preference learning, adaptive routing | Log accept/reject signals per provider/mode to SQLite. Background extraction (cheap LLM call) converts implicit signals to text preferences. Prompt caching carries preferences in-session at near-zero cost. |
| [30e](./30e-asset-set-coherence-tracking.md) | Asset set coherence, style seed tracking | Store `style_seed` and `ref_asset_id` per accepted asset. Auto-pass as style reference on next generation for same project. Recraft's style_id API is the strongest coherence primitive available. |

---

## Recommended Implementation Stack

Minimum viable memory layer (no external dependencies):

```
~/.prompt-to-asset/
  memory.db          ← SQLite WAL
    tables: preference_log, preference_summary,
            project_assets, project_brand_bundles, user_prefs
  projects/
    {name}/
      brand-bundle.json    ← current accepted bundle (also a Resource)
      asset-manifest.json  ← generation log (also a Resource)
```

MCP server exposes:
- Resources: `asset-memory://projects/{name}/brand-bundle`, `asset-memory://user/preferences`
- Tools (existing): `asset_*` write state after each call
- Optional: `asset_memory_set_project`, `asset_memory_get_history` for explicit control

---

## Design Decisions Required

1. **Session ID granularity:** Should session memory be per-MCP-connection or per-project? Per-project is simpler and more useful.

2. **Preference extraction:** Run a cheap secondary LLM call after each session to extract explicit preferences from the conversation? Or only log binary signals from tool outcomes? Start with binary; add extraction if signal quality is insufficient.

3. **Coherence opt-in vs opt-out:** Auto-pass style reference from the last accepted asset (opt-out model: `coherence: false` to disable)? Or require explicit `project_id` to trigger coherence (opt-in)? Opt-out is better UX but requires the user to understand what's happening.

4. **Anthropic prompt caching TTL:** Default 5-minute cache is sufficient for same-session repeated calls. Opt into 1-hour extended TTL (`ttl: "1h"` + 2x write cost) only for projects with dense multi-call sessions.

---

## What Was Not Found

No published work specifically on brand-bundle cross-session consistency for MCP-based asset generation tools. The closest analogues are:
- Recraft's style_id concept (within their platform, not cross-platform)
- Memory Bank MCP pattern (file-based project notebooks, not asset-specific)
- Mem0's user_id scoping (general preference learning, not visual coherence)

The coherence tracking schema in 30e is original synthesis, not a copied pattern.
