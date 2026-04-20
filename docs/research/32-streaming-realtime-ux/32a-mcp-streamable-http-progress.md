# 32a — MCP Streamable HTTP Transport & Progress Notifications

## What It Is

The MCP specification (revision 2025-03-26) replaced the old HTTP+SSE two-endpoint transport with **Streamable HTTP**: a single endpoint that accepts POST for client-to-server messages and optionally upgrades responses to SSE streams. Progress notifications are a first-class primitive in this spec, not a bolt-on.

Official spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports  
Progress spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress

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

**Caveat**: Claude Code currently runs MCP tools via stdio. Until the host switches to Streamable HTTP, progress notifications are silently dropped. Cursor and other IDE hosts with HTTP MCP support will display them. Validate the host transport before advertising progress capability.

## Key References

- https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- https://modelcontextprotocol.io/specification/2025-03-26/basic/utilities/progress
- https://github.com/modelcontextprotocol/typescript-sdk
- https://github.com/punkpeye/fastmcp
- https://github.com/invariantlabs-ai/mcp-streamable-http
- https://github.com/ferrants/mcp-streamable-http-typescript-server
