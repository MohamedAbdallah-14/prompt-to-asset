# 32e — Optimistic Preview Patterns for Asset Generation UX

## Core Idea

Optimistic UI shows results before the server confirms them, reducing perceived latency. Applied to asset generation — where actual latency is 3–30 seconds, not sub-100ms — the pattern shifts: you cannot show the final result optimistically, but you can show progressively more accurate previews that anchor user attention while the real asset generates.

The three-stage progression for asset generation:

```
Stage 0 (0ms)    → Show placeholder skeleton with brand color and aspect ratio
Stage 1 (0–2s)   → Show inline_svg draft (if mode == inline_svg, already available)
Stage 2 (2–10s)  → Show low-res thumbnail from model if provider supports partial image
Stage 3 (done)   → Swap in final validated asset
```

## Stage 0: Skeleton Placeholder

As soon as the user submits the asset request, render a branded placeholder. For app icons: a rounded-rect at the correct dimensions filled with the dominant brand color. For logos: a horizontal rect with a shimmer animation.

This costs nothing — the MCP tool handler returns the `jobId` immediately before model I/O begins. The placeholder communicates "work is in progress" without any network round-trip.

In Claude Code context, this is not available — the IDE controls the UI. In a companion web UI: standard CSS skeleton pattern.

## Stage 1: Inline SVG as Draft for Non-API Modes

For `inline_svg` mode, the LLM generates the SVG as part of its streamed reply. This means a rough vector mark appears in seconds, before any model API call. The `asset_save_inline_svg` tool call writes the file. The progression:

1. User sees the SVG appear in the chat as a code block (streaming via Claude's token output).
2. The SVG file is written to disk.
3. If an `api` mode refinement is queued, the inline SVG serves as the visual placeholder while the raster model runs.

This is already partially functional: the gap is that the inline SVG is not shown as a rendered image in Claude Code, only as code. A companion viewer that watches the output directory and live-refreshes would close this.

## Stage 2: Partial Image Preview from Providers

Not all providers support partial image output. Current state as of April 2026:

| Provider | Partial/incremental output |
|---|---|
| `gpt-image-1` | No streaming; full image only. Partial image streaming tracked in Vercel AI SDK issue #9017 (closed in v6.0 milestone — OpenAI responses API partial image). |
| fal.ai (FLUX, SD) | Queue-based: `fal.subscribe()` gives queue position events (`onQueueUpdate`). No pixel-level intermediate frames unless using ComfyUI websocket mode. |
| ComfyUI (local) | WebSocket delivers base64 preview frames at each K-sampler step via `SaveImageWebsocket` node. This is the only real step-by-step pixel preview available today. |
| Ideogram, Recraft | No intermediate frames; final image only. |

For fal.ai, the progress events are queue position updates ("IN_QUEUE", "IN_PROGRESS"), not pixel data. They feed the progress percentage but not a visual preview.

Reference: https://fal.ai/docs/documentation/model-apis/inference/real-time

## Stage 3: Validation Feedback Before Final Display

Rather than showing the validated asset only after all checks pass, stream validation results incrementally:

```typescript
const validationStages = [
  { check: "dimensions", progress: 85 },
  { check: "alpha_channel", progress: 88 },
  { check: "no_checkerboard", progress: 91 },
  { check: "safe_zone_bbox", progress: 94 },
  { check: "ocr_wordmark", progress: 97 },
  { check: "palette_delta_e", progress: 99 },
];

for (const stage of validationStages) {
  const passed = await runCheck(stage.check, image);
  await notify(stage.progress, 100, `${stage.check}: ${passed ? "pass" : "FAIL"}`);
  if (!passed) {
    // Surface early warning, not a fatal error
    warnings.push(stage.check);
  }
}
```

This means the user sees validation results as they happen, not as a batch dump at the end. If `ocr_wordmark` fails, they know 3 seconds before the bundle is written.

## Optimistic Error Recovery

If model call fails (network error, content policy), do not wait for the tool to return an error. Show a recovery option immediately:

- In a web UI: swap the skeleton for an error state with "retry" and "use inline_svg instead" buttons.
- In Claude Code: the tool returns an error result that Claude surfaces as text. Include a pre-formatted suggestion: "Call `asset_generate_logo` with `mode: 'inline_svg'` as fallback."

## React Pattern (for Companion Web UI)

React 19's `useOptimistic` hook is the standard approach:

```typescript
const [optimisticAsset, addOptimisticAsset] = useOptimistic(
  currentAsset,
  (state, newAsset) => ({ ...state, ...newAsset, loading: true })
);

async function handleGenerate(brief: string) {
  addOptimisticAsset({ placeholder: true, aspectRatio: "1:1" });
  const jobId = await startGeneration(brief);
  // SSE subscription updates the real state as stages complete
}
```

Reference: https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/

## Applicability to prompt-to-asset

Priority order for implementing optimistic UX:

1. **High value, zero infra**: Emit `notifications/progress` with stage names (already covered in 32a). Text messages like "Routing to gpt-image-1 (transparent detected)" are informative while the user waits.
2. **Medium value, light infra**: For inline_svg mode, ensure SVG appears in streaming LLM output before `asset_save_inline_svg` is called. Already happens — just needs documentation.
3. **Lower value, more infra**: Companion web viewer that watches the output directory for new files and renders them immediately. WebSocket or filesystem watcher → SSE → browser.
4. **Not worth it now**: ComfyUI step preview frames require a local ComfyUI instance, which is outside the current tool scope.

## Key References

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming
- https://fal.ai/docs/documentation/model-apis/inference/real-time
- https://github.com/vercel/ai/issues/9017
- https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/
- https://simonhearne.com/2021/optimistic-ui-patterns/
- https://dev.to/worldlinetech/websockets-comfyui-building-interactive-ai-applications-1j1g
