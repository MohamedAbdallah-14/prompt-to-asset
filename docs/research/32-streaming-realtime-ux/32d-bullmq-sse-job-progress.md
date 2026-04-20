# 32d — BullMQ + SSE Pattern for Job Queue with Real-Time Progress

## When This Pattern Applies

The current prompt-to-asset server is stateless and single-threaded. For `api` mode generation (3–30 seconds per call), the synchronous tool handler ties up the Node.js process. BullMQ moves the heavy work to background workers while the HTTP layer stays responsive. SSE pushes status back to clients in real time.

This pattern is appropriate when:
- Multiple concurrent generation requests are expected.
- The server must survive restarts without losing in-flight jobs.
- Progress needs to survive client reconnects (Redis persistence).

## Architecture

```
MCP Tool Handler  →  BullMQ Queue (Redis)  →  Worker Process
                                                    ↓
                                             job.updateProgress()
                                                    ↓
                                        QueueEvents (Redis Streams)
                                                    ↓
                                         SSE Endpoint  →  Client
```

## BullMQ Core: Progress Events

Workers call `job.updateProgress()` with a number (0–100) or an object:

```typescript
// In worker.ts
const worker = new Worker("asset-generation", async (job) => {
  await job.updateProgress(10);
  const enhanced = await enhancePrompt(job.data.brief);

  await job.updateProgress(30);
  const imageUrl = await callImageModel(enhanced, job.data.provider);

  await job.updateProgress(70);
  const matted = await removeBackground(imageUrl);

  await job.updateProgress(90);
  const bundle = await validateAndBundle(matted, job.data.assetType);

  await job.updateProgress(100);
  return bundle;
}, { connection: redisConnection });
```

`QueueEvents` listens across all workers using Redis Streams (not pub-sub), which guarantees delivery even across disconnections:

```typescript
const queueEvents = new QueueEvents("asset-generation", { connection: redisConnection });

queueEvents.on("progress", ({ jobId, data }) => {
  progressBus.emit(jobId, { progress: data, jobId });
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  progressBus.emit(jobId, { progress: 100, result: returnvalue, jobId });
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  progressBus.emit(jobId, { error: failedReason, jobId });
});
```

Reference: https://docs.bullmq.io/guide/events  
Practical SSE+BullMQ walkthrough: https://www.jacobparis.com/content/remix-stream-bullmq-queue

## SSE Endpoint

```typescript
app.get("/asset-progress/:jobId", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send existing job state immediately (avoids missed events on reconnect)
  const job = await Job.fromId(assetQueue, req.params.jobId);
  if (job) {
    const state = await job.getState();
    const progress = job.progress ?? 0;
    res.write(`data: ${JSON.stringify({ state, progress })}\n\n`);
    if (state === "completed") { res.end(); return; }
  }

  // Keepalive ping every 15s (defeats proxy buffering)
  const keepalive = setInterval(() => res.write(": ping\n\n"), 15000);

  const handler = (update: object) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
    if ("result" in update || "error" in update) {
      clearInterval(keepalive);
      res.end();
      progressBus.off(req.params.jobId, handler);
    }
  };

  progressBus.on(req.params.jobId, handler);
  req.on("close", () => {
    clearInterval(keepalive);
    progressBus.off(req.params.jobId, handler);
  });
});
```

## MCP Tool Handler Adapts to Queue

The tool handler enqueues the job and returns the jobId immediately, or waits for completion:

```typescript
// Option A: Synchronous wait (fits current stateless MCP design)
server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
  const jobId = crypto.randomUUID();
  const job = await assetQueue.add("generate", req.params.arguments, { jobId });
  
  const token = req.params._meta?.progressToken;
  await job.waitUntilFinished(queueEvents, timeout, async (progress) => {
    if (token !== undefined) {
      await server.notification({
        method: "notifications/progress",
        params: { progressToken: token, progress, total: 100 }
      });
    }
  });

  return { content: [{ type: "text", text: JSON.stringify(job.returnvalue) }] };
});

// Option B: Return jobId immediately (requires Tasks spec or custom polling)
// Returns { taskId: jobId } and client uses GET /asset-progress/:jobId
```

`job.waitUntilFinished()` blocks in the MCP handler but bridges queue events to progress notifications automatically.

## Redis Requirements

BullMQ requires Redis 6.2+. It uses Redis Streams internally for QueueEvents — not pub-sub — so events survive worker crashes and client disconnections. The event stream is trimmed to ~10,000 events by default; configurable via `trimEvents()`.

Reference: https://bullmq.io/

## Caveats

- **Single-server only for EventEmitter**: The `progressBus` EventEmitter above works only when the SSE endpoint and the QueueEvents listener run in the same process. For horizontal scaling, replace the EventEmitter with Redis pub-sub: publish from the QueueEvents handler and subscribe in the SSE handler.
- **Memory**: Each live SSE connection holds a response object. Set a max concurrent connection limit.
- **BullMQ overhead**: For single-user local tools, BullMQ is over-engineered. Use it only when concurrent multi-user access or job persistence is needed.
- **Job TTL**: Configure `removeOnComplete` and `removeOnFail` to prevent Redis accumulation.

## Applicability to prompt-to-asset

The current single-user CLI context does not need BullMQ. The right time to add it:
- When the server is deployed as a shared HTTP service.
- When concurrent `api` mode calls from multiple sessions need isolation.
- When job retry and failure persistence are required.

For now, the in-memory EventEmitter sidecar SSE pattern (32b) delivers 90% of the UX benefit with zero infrastructure overhead.

## Key References

- https://docs.bullmq.io/guide/events
- https://bullmq.io/
- https://www.jacobparis.com/content/remix-stream-bullmq-queue
- https://www.chanalston.com/blog/nodejs-sse-monolith-to-distributed-system/
- https://github.com/taskforcesh/bullmq
