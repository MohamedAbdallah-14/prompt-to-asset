> **📅 Research snapshot as of 2026-04-20.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

> **Updated 2026-04-21:** Three material corrections applied across angle files:
> 1. **MCP spec version**: Current stable spec is `2025-11-25`, not `2025-03-26`. Streamable HTTP transport and progress notification wire format are unchanged between the two.
> 2. **SEP-1686 Tasks**: Tasks shipped as **experimental** in the `2025-11-25` spec. Claims that it was "not yet in the stable spec" are now wrong. It is safe to adopt with awareness that lifecycle semantics (retry, expiry) are still being finalized.
> 3. **gpt-image-1 streaming**: OpenAI now supports native image streaming via `stream: true` + `partial_images` (0–3) on the Images API. The prior claim "no streaming; full image only" was stale. This opens a real partial-preview path without ComfyUI.
> 4. **Claude Code transport**: Claude Code supports Streamable HTTP for remote MCP servers as of 2026. SSE transport is deprecated. Progress notifications are receivable over HTTP transport (with a caveat about a known bug #29688).

# Research 32: Streaming & Real-Time UX for Agent Workflows

**Date**: 2026-04-20  
**Context**: prompt-to-asset MCP server — currently synchronous and stateless. Image generation takes 3–30 seconds. This research covers practical patterns to add streaming progress, incremental output, and optimistic previews.

## Files

| File | Topic | Priority |
|---|---|---|
| [32a](./32a-mcp-streamable-http-progress.md) | MCP Streamable HTTP transport + `notifications/progress` spec | Implement first |
| [32b](./32b-sse-long-running-tool-calls.md) | SSE for long-running tool calls + async Tasks pattern | Implement second |
| [32c](./32c-incremental-svg-rendering.md) | Incremental SVG streaming, tag repair, fine-grained tool streaming | Implement for inline_svg mode |
| [32d](./32d-bullmq-sse-job-progress.md) | BullMQ + SSE job queue with real-time progress | Add when multi-user HTTP deployment |
| [32e](./32e-optimistic-preview-patterns.md) | Optimistic previews: skeleton → inline SVG → low-res → final | Companion web UI |

## Key Findings

### What works today, zero new infrastructure

1. **`notifications/progress` in tool handlers** — add `server.notification()` calls between await points in every `asset_generate_*` handler. Works immediately for Cursor and any Streamable HTTP host. No-op (silent discard) in Claude Code stdio mode. Cost: ~20 lines of code per tool.

2. **Inline SVG appears before `asset_save_inline_svg` is called** — for `inline_svg` mode, the LLM streams the `<svg>` in its reply before calling the save tool. This is already the fastest possible preview. Document this behavior explicitly in tool descriptions.

3. **Stage-named progress messages** — meaningful `message` strings in progress notifications ("Routing to gpt-image-1", "Running BiRefNet matte", "OCR check...") cost nothing and significantly improve the waiting experience.

### What requires a sidecar HTTP server

4. **SSE progress endpoint (`/events/:jobId`)** — an EventEmitter-backed SSE route alongside the MCP HTTP server. Enables browser-based preview panels and future VS Code webview integrations. ~50 lines.

5. **Streaming validation results** — emit one progress notification per validation check rather than batching all results at the end. Surfaces failures 2–3 seconds earlier.

### What requires infrastructure investment

6. **BullMQ queue** — needed only for multi-user HTTP deployments with concurrent generation load. Not needed for single-user CLI use.

7. **Live SVG preview in IDE** — requires VS Code extension with webview or an external browser tab. The IDE's native code block display does not render SVG visually.

### Partial pixel previews — what is available

8. **Pixel-level intermediate frames** — ~~only ComfyUI (local) delivers per-diffusion-step frames~~ **(updated 2026-04-21)**. As of April 2026: `gpt-image-1`, `gpt-image-1-mini`, and `gpt-image-1.5` support native image streaming via the OpenAI Images API (`stream: true`, `partial_images: 0–3`). The API emits progressive base64-encoded partial images during generation. ComfyUI (local) still delivers per-step frames via WebSocket. Ideogram, Recraft, and Flux via fal.ai still return the final image only; fal.ai progress events remain queue position metadata, not pixel data.

9. **MCP async Tasks spec** — SEP-1686 Tasks shipped as **experimental** in the `2025-11-25` MCP spec. No longer a platform-specific extension — it is an official (experimental) primitive. SDK implementations (Python, Kotlin) are being tracked. Safe to adopt; lifecycle semantics (retry, expiry) are still being finalized. See https://modelcontextprotocol.io/community/seps/1686-tasks.

## Recommended Implementation Order

```
Phase 1 (1–2 hours):
  - Add notifications/progress to all asset_generate_* handlers
  - Add meaningful message strings at each pipeline stage
  - Document that inline_svg mode already delivers instant visual output

Phase 2 (half day):
  - Add /events/:jobId SSE sidecar endpoint
  - Stream validation results per-check, not as batch
  - Enable streamingHint on asset_save_inline_svg (FastMCP)

Phase 3 (future, multi-user deployment):
  - Replace EventEmitter progressBus with Redis pub-sub
  - Add BullMQ for concurrent api mode requests
  - Build companion browser preview panel

Phase 3b (gpt-image-1 partial preview — now feasible):
  - Pass stream:true + partial_images:2 on gpt-image-1 calls
  - Pipe each partial frame to /events/:jobId SSE endpoint
  - Render in companion browser pane as image builds up
```

## Critical Transport Caveat

> **Updated 2026-04-21:** Claude Code now supports Streamable HTTP transport for remote MCP servers. SSE transport is deprecated in favour of HTTP. The statement below about stdio remains true for local stdio-connected servers, but is no longer a universal constraint.

Claude Code uses stdio transport by default for local servers. `notifications/progress` is **silently discarded** over stdio. For HTTP-transport MCP servers, progress notifications are receivable by Claude Code. The progress infrastructure is also visible in:
- Cursor (supports Streamable HTTP MCP)
- Any HTTP-transport MCP host
- A custom web UI subscribed to the sidecar SSE endpoint

Do not block Phase 1 work on this: the notifications cost nothing to emit and will be consumed by more capable hosts as the MCP ecosystem matures.
