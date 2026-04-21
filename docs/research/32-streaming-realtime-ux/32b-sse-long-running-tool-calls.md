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

## Async Tasks Pattern (Now in Spec — Experimental)

> **Updated 2026-04-21:** SEP-1686 Tasks shipped in the `2025-11-25` MCP spec as an **experimental** feature. This is no longer "not yet in the stable spec" — it is in the spec with an experimental label. The prior SEP-1391 (tool-specific async) was rejected in favor of the more general Tasks primitive. SDK implementations (Python, Kotlin) are being tracked in their respective repos. The recommendation to defer implementation should be revised: Tasks are safe to adopt but remain subject to lifecycle-gap revisions (retry semantics, expiry policies).

The SEP-1686 Tasks primitive, now shipping as experimental in the `2025-11-25` MCP spec, formalizes a **call-now, fetch-later** pattern:

1. Tool call returns immediately with task metadata (taskId, status: "working").
2. Client polls using the taskId or subscribes to task updates.
3. Tasks follow a five-state lifecycle: `working → input_required → completed / failed / cancelled`.

Tasks are scoped to `tools/call`, `sampling/createMessage`, and `elicitation/create`. Multiple production MCP platforms (WorkOS, AWS Bedrock AgentCore) already implement compatible patterns. The Tasks primitive cleanly handles timeouts without requiring SSE.

Reference: https://modelcontextprotocol.io/community/seps/1686-tasks  
Reference: https://workos.com/blog/mcp-2025-11-25-spec-update  
Original proposal (superseded): https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391

## SSE Constraints and Caveats

- **One stream per request**: SSE is half-duplex. The server pushes; the client cannot send mid-stream.
- **Proxies**: Corporate proxies often buffer SSE or kill idle connections after 30–60 seconds. Include a keepalive ping every 15 seconds.
- **Browser limit**: Browsers allow max 6 SSE connections per origin. Not a concern for CLI hosts.
- **Claude Code stdio mode**: Progress notifications over stdio are silently discarded by the MCP transport layer. The IDE does show tool call state ("Using tool...") but it is binary, not granular. HTTP transport required for real progress bars.
- **Claude Code HTTP transport**: As of 2026, Claude Code supports Streamable HTTP for remote MCP servers. SSE transport is deprecated in favor of HTTP. Progress notifications sent over HTTP transport are receivable, though there is a known bug (#29688) where Claude Code may still spawn a stdio child process even when the server is declared as HTTP — verify behavior in practice.
- **Cursor**: Supports Streamable HTTP; progress notifications render in the tool call panel.

## Recommended Approach for prompt-to-asset

- Implement `notifications/progress` in all `asset_generate_*` handlers (zero extra infra, just works when host supports HTTP transport).
- Add a `/events/:jobId` sidecar SSE endpoint as a fallback for web UIs and for validating progress without a capable host.
- The Tasks pattern (SEP-1686) is now experimental in the `2025-11-25` spec and safe to adopt for long-running `api` mode calls. Implement if transport timeouts become a real problem in HTTP deployments.

## Key References

- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports (current stable spec)
- https://modelcontextprotocol.io/community/seps/1686-tasks (Tasks SEP — experimental in 2025-11-25)
- https://modelcontextprotocol.io/specification/2025-03-26/basic/transports (Streamable HTTP origin)
- https://github.com/microsoft/mcp-for-beginners/blob/main/03-GettingStarted/06-http-streaming/README.md
- https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1391 (superseded by SEP-1686)
- https://workos.com/blog/mcp-2025-11-25-spec-update
- https://workos.com/blog/mcp-async-tasks-ai-agent-workflows
