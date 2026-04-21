# 32a — MCP Streamable HTTP Transport & Progress Notifications

> **Updated 2026-04-21:** The current stable MCP specification is `2025-11-25` (released November 2025), not `2025-03-26`. The `2025-03-26` spec introduced Streamable HTTP; the `2025-11-25` spec is additive and did not change the transport or progress notification wire format. A further `2026-03-15` release added mandatory RFC 8707 resource indicators for auth. All progress notification patterns described here remain valid under all three revisions.

## What It Is

The MCP specification (revision 2025-03-26) replaced the old HTTP+SSE two-endpoint transport with **Streamable HTTP**: a single endpoint that accepts POST for client-to-server messages and optionally upgrades responses to SSE streams. Progress notifications are a first-class primitive in this spec, not a bolt-on. The current stable spec as of April 2026 is `2025-11-25`.

Official spec: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports  
Progress spec: https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress

## How Progress Works

When a client wants progress for a request, it adds a `progressToken` to the request `_meta`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "asset_generate_logo",
    "arguments": { "brief": "..." },
    "_meta": { "progressToken": "gen-xyz-001" }
  }
}
```

The server then emits `notifications/progress` messages over the SSE stream **before** sending the final `tools/call` response:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "gen-xyz-001",
    "progress": 30,
    "total": 100,
    "message": "Routing to gpt-image-1 (transparent background detected)"
  }
}
```

Rules the spec enforces: `progress` must increase monotonically; `total` and `message` are optional; notifications stop when the response is sent.

## TypeScript SDK Pattern (v1.10+)

> **Updated 2026-04-21:** The SDK has progressed significantly past v1.10. As of April 2026 the npm package is at v1.20+ (`@modelcontextprotocol/sdk`). The `server.notification()` pattern shown below remains valid. Check the [npm page](https://www.npmjs.com/package/@modelcontextprotocol/sdk) for the current release.

The official `@modelcontextprotocol/sdk` (v1.10+) surfaces this through `server.setRequestHandler`. Progress is sent via `server.notification()` before the handler returns:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
  const token = req.params._meta?.progressToken;

  const notify = async (progress: number, total: number, message: string) => {
    if (token !== undefined) {
      await server.notification({
        method: "notifications/progress",
        params: { progressToken: token, progress, total, message }
      });
    }
  };

  await notify(10, 100, "Enhancing prompt...");
  const enhanced = await enhancePrompt(req.params.arguments.brief);

  await notify(40, 100, "Calling image model...");
  const imageResult = await callImageModel(enhanced);

  await notify(80, 100, "Running validation...");
  const validated = await validateAsset(imageResult);

  await notify(100, 100, "Done");
  return { content: [{ type: "text", text: JSON.stringify(validated) }] };
});
```

FastMCP (https://github.com/punkpeye/fastmcp) wraps this more ergonomically via a `reportProgress` callback injected into the execute function:

```typescript
server.addTool({
  name: "asset_generate_logo",
  execute: async (args, { reportProgress }) => {
    await reportProgress({ progress: 10, total: 100 });
    // ...
    return result;
  }
});
```

FastMCP also has `streamContent` with a `streamingHint: true` annotation for sending intermediate text/image content before the final return.

## Transport Requirement

Progress notifications only work over **Streamable HTTP** or the legacy HTTP+SSE transport. stdio swallows notifications synchronously — Claude Code's default stdio mode does not surface them in the UI. The server must run as an HTTP process for progress to reach the IDE.

## Resumability

The spec supports SSE event IDs plus `Last-Event-ID` reconnect so a client that drops can replay missed progress events. Implement by attaching incrementing IDs to every SSE event and storing them in a short-lived ring buffer (Redis or in-memory).

## Applicability to prompt-to-asset

Progress stages for a typical `asset_generate_*` call:

| Progress | Stage |
|---|---|
| 5 | `asset_enhance_prompt` complete |
| 15 | Routing decision logged |
| 20–70 | Model call in flight (poll provider status) |
| 75 | Background removal / matte |
| 85 | Vectorization |
| 95 | Validation |
| 100 | Bundle written to disk |

> **Updated 2026-04-21:** Claude Code now supports Streamable HTTP transport in addition to stdio. HTTP is the recommended transport for remote MCP servers as of 2026; the legacy SSE transport is deprecated. If the prompt-to-asset server is registered via HTTP transport, progress notifications reach Claude Code. However, there is a known bug (GitHub issue #29688) where Claude Code may still spawn a stdio child process even when the server is configured as HTTP — verify transport in practice. Stdio transport still silently discards progress notifications.

**Caveat**: Claude Code's default transport for local servers remains stdio, which silently drops progress notifications. Progress notifications are visible when the server runs via Streamable HTTP transport. Cursor and other IDE hosts with HTTP MCP support also display them. Claude Code supports HTTP transport (Streamable HTTP) for remote servers — SSE transport is now deprecated in favor of it. Validate the host transport before advertising progress capability.

## Key References

- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports (current stable spec)
- https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress
- https://modelcontextprotocol.io/specification/2025-03-26/basic/transports (original Streamable HTTP spec)
- https://github.com/modelcontextprotocol/typescript-sdk
- https://www.npmjs.com/package/@modelcontextprotocol/sdk
- https://github.com/punkpeye/fastmcp
- https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/
- https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/
- https://github.com/invariantlabs-ai/mcp-streamable-http
- https://github.com/ferrants/mcp-streamable-http-typescript-server
