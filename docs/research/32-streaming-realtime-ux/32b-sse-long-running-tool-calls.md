# 32b — SSE for Long-Running MCP Tool Calls

## The Problem

Image generation calls take 3–30 seconds. A synchronous MCP tool that blocks for 30 seconds stalls the host IDE, risks transport timeout, and gives the user zero feedback. The current prompt-to-asset server falls into this category.

Two distinct SSE roles exist in the MCP stack:

1. **Transport-level SSE**: the Streamable HTTP upgrade where the tool response body itself is an SSE stream (handled by the SDK automatically).
2. **Application-level progress SSE**: an out-of-band HTTP endpoint that clients or UIs can subscribe to for status updates, independent of the MCP transport.

## Transport-Level SSE (MCP Spec)

When a POST request arrives at the MCP endpoint and the server opens an SSE stream, the flow is:

```
Client  POST /mcp  (tools/call)
Server  200 OK  Content-Type: text/event-stream
Server  → data: {"jsonrpc":"2.0","method":"notifications/progress","params":{...}}
Server  → data: {"jsonrpc":"2.0","method":"notifications/progress","params":{...}}
Server  → data: {"jsonrpc":"2.0","id":1,"result":{...}}   ← final response
Server  close stream
```

The SDK handles the SSE framing. The server-side handler just calls `server.notification()` between await points. The client's `Accept: text/event-stream` header signals it can receive this form.

Reference implementation: https://github.com/microsoft/mcp-for-beginners/blob/main/03-GettingStarted/06-http-streaming/README.md

## Application-Level SSE (Sidecar Endpoint)

For scenarios where the host does not support Streamable HTTP, a sidecar SSE endpoint decouples progress from the MCP transport:

```
GET /asset-progress/:jobId    Accept: text/event-stream
```

The tool handler starts the job, persists a `jobId`, and returns immediately. The host polls or a web UI subscribes to the sidecar endpoint. This is the BullMQ pattern (see 32d) applied without BullMQ:

```typescript
// In-memory event emitter (swap for Redis pub/sub at scale)
const progressBus = new EventEmitter();

app.get("/asset-progress/:jobId", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const handler = (update: ProgressUpdate) => {
    send(update);
    if (update.progress >= 100) {
      res.end();
      progressBus.off(req.params.jobId, handler);
    }
  };

  progressBus.on(req.params.jobId, handler);
  req.on("close", () => progressBus.off(req.params.jobId, handler));
});
```

The MCP tool handler emits to `progressBus` during generation and returns the final bundle path when done:

```typescript
async function generateLogo(args, jobId) {
  progressBus.emit(jobId, { progress: 10, stage: "routing" });
  const result = await callModel(args);
  progressBus.emit(jobId, { progress: 80, stage: "matte" });
  const matted = await removeBackground(result);
  progressBus.emit(jobId, { progress: 100, stage: "done", path: matted.path });
  return matted;
}
```

## Async Tasks Pattern (Emerging Standard)

The SEP-1686 proposal (tracked in https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391) formalizes a **call-now, fetch-later** pattern:

1. Tool call returns immediately with `{ taskId, pollInterval, status: "working" }`.
2. Client polls `tasks/get` using the `taskId`.
3. When `status === "completed"`, client calls `tasks/result` to retrieve the output.

This is not yet in the stable spec but multiple production MCP platforms (WorkOS, AWS Bedrock AgentCore) implement it. It cleanly handles timeouts without requiring SSE at all, at the cost of polling overhead.

Reference: https://agnost.ai/blog/long-running-tasks-mcp/

## SSE Constraints and Caveats

- **One stream per request**: SSE is half-duplex. The server pushes; the client cannot send mid-stream.
- **Proxies**: Corporate proxies often buffer SSE or kill idle connections after 30–60 seconds. Include a keepalive ping every 15 seconds.
- **Browser limit**: Browsers allow max 6 SSE connections per origin. Not a concern for CLI hosts.
- **Claude Code stdio mode**: Progress notifications over stdio are silently discarded by the MCP transport layer. The IDE does show tool call state ("Using tool...") but it is binary, not granular. HTTP transport required for real progress bars.
- **Cursor**: Supports Streamable HTTP; progress notifications render in the tool call panel.

## Recommended Approach for prompt-to-asset

- Implement `notifications/progress` in all `asset_generate_*` handlers (zero extra infra, just works when host supports HTTP transport).
- Add a `/events/:jobId` sidecar SSE endpoint as a fallback for web UIs and for validating progress without a capable host.
- Do not implement the Tasks polling pattern until SEP-1686 is merged into the stable spec.

## Key References

- https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- https://github.com/microsoft/mcp-for-beginners/blob/main/03-GettingStarted/06-http-streaming/README.md
- https://github.com/modelcontextprotocol/modelcontextprotocol/issues/982
- https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391
- https://agnost.ai/blog/long-running-tasks-mcp/
- https://workos.com/blog/mcp-async-tasks-ai-agent-workflows
