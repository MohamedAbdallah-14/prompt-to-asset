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

### What does not exist yet (provider gap)

8. **Pixel-level intermediate frames** — only ComfyUI (local) delivers per-diffusion-step frames via WebSocket. All cloud providers (`gpt-image-1`, Ideogram, Recraft, Flux via fal.ai) return the final image only. Progress from these providers is queue position metadata, not visual data.

9. **MCP async Tasks spec** — SEP-1686 call-now/fetch-later pattern is implemented by some platforms (WorkOS, AWS Bedrock) but not in the stable MCP spec as of April 2026. Monitor https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391.

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
```

## Critical Transport Caveat

Claude Code uses stdio transport by default. `notifications/progress` is **silently discarded** over stdio. The progress infrastructure is only visible in:
- Cursor (supports Streamable HTTP MCP)
- Any HTTP-transport MCP host
- A custom web UI subscribed to the sidecar SSE endpoint

Do not block Phase 1 work on this: the notifications cost nothing to emit and will be consumed by more capable hosts as the MCP ecosystem matures.
