# 30c — MCP Resources and Persistent State

## What the MCP Spec Actually Provides

MCP (Model Context Protocol) spec version 2025-11-25 defines three server primitives: Resources, Prompts, and Tools.

**Resources** are the mechanism for exposing persistent data. Spec definition: "structured data sources that the AI can read." Each resource has a URI, optional MIME type, and returns either text or base64-encoded binary content.

Key resource capabilities:
- `resources/list` — enumerate available resources (paginated)
- `resources/read` — fetch resource by URI
- `resources/subscribe` — get notified when a specific resource changes
- `notifications/resources/list_changed` — server notifies client when the resource catalog changes

Resource URIs use standard schemes: `file://`, `https://`, `git://`, or custom schemes per RFC3986.

Annotations allow resources to declare `audience` (user vs assistant), `priority` (0.0–1.0), and `lastModified` timestamp. These let the host decide what to include in the LLM's context automatically.

---

## How Resources Map to Persistent State

Resources give the server a way to expose its stored state as readable context without requiring a tool call. This is the distinction that matters for memory:

- **Tool call:** active, counted toward rate limits, requires LLM to decide to call it
- **Resource read:** passive, the host can inject it automatically, doesn't consume a tool slot

For brand memory this means the server can expose:

```
brand://projects/foo           → BrandBundle JSON for project "foo"
brand://user/preferences       → UserPreferences JSON (provider order, default mode)
brand://sessions/{session_id}  → Generation log for a specific session
```

The host (Claude Desktop, Claude Code, Cursor, etc.) can auto-inject `brand://user/preferences` into every conversation's context without the LLM needing to call `asset_capabilities()` first.

### Subscription Pattern for Live Updates

When a user modifies a brand bundle mid-session (e.g., accepts a color change), the server writes to its SQLite store, then emits `notifications/resources/updated` for `brand://projects/foo`. The client re-reads the resource and the updated bundle is in context for the next tool call.

This is a clean read-model pattern: tools write state via `asset_*` calls, resources expose that state for reading. No tool call needed to "load" the brand.

---

## Prompts Primitive

MCP Prompts are templated workflows — dynamic, context-aware starting points. The server can inspect its stored state and return a tailored prompt.

Example: a `brand_context_prompt` that reads `brand://projects/foo`, fills in the palette, fonts, and past asset paths, and returns a pre-built system prompt the host can inject. This is effectively a server-side context window optimization: the server knows what's relevant, pre-packs it, and the LLM doesn't have to figure it out.

**Caveat:** Not all MCP hosts support Prompts yet. Claude Desktop does; Claude Code CLI does. Third-party integrations vary.

---

## Practical Implementation for prompt-to-asset

### Resource URI Design

```
asset-memory://user/preferences              → JSON: {provider_order, default_mode, accepted_formats}
asset-memory://projects/{name}/brand-bundle  → JSON: BrandBundle
asset-memory://projects/{name}/asset-log     → JSON: [{type, path, ts, provider, mode}]
asset-memory://projects/{name}/style-seed    → JSON: {style_params, ref_image_paths}
```

Backed by SQLite at `~/.prompt-to-asset/memory.db`. Each resource read hits SQLite via a single indexed query — no vector search needed for this data shape.

### Auto-Injection Priority

Set `annotations.priority = 0.9` for brand bundle resources when a project name is detected in context. Set `priority = 0.5` for user preferences (background context, not critical path). Hosts that respect priority annotations will include high-priority resources automatically.

### Security Boundary

The MCP spec requires servers to validate all resource URIs and check access controls before returning content. For a local single-user MCP server this is trivial (the file system is the permission boundary). For a hosted version, project names must be scoped to authenticated user IDs.

---

## What Resources Cannot Do

Resources are read-only from the client's perspective. The client cannot write to a resource via the resources protocol — it must call a tool. This means the write path still goes through `asset_*` tool calls; resources are purely for reading accumulated state.

Resources also have no built-in TTL or expiration. The server must handle its own staleness logic (e.g., only include asset log entries from the last 30 days).

## Sources

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Resources Documentation](https://modelcontextprotocol.io/docs/concepts/resources)
- [MCP Server State Management](https://zeo.org/resources/blog/mcp-server-architecture-state-management-security-tool-orchestration)
- [Building Stateful MCP Servers](https://fast.io/resources/building-stateful-mcp-servers/)
- [MCP Memory Service GitHub](https://github.com/doobidoo/mcp-memory-service)
