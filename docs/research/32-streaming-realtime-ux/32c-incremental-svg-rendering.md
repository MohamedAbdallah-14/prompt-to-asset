# 32c — Incremental SVG Rendering & Streaming Partial SVG

## The Opportunity

The `inline_svg` mode generates SVG by LLM token streaming. Instead of waiting for the complete `</svg>` close tag before showing anything, the host can render the partial SVG as it arrives. This cuts perceived latency from 10–20 seconds to near-zero: users see the mark taking shape in real time.

## Browser SVG Streaming Capability

The W3C SVG streaming spec (https://dev.w3.org/SVG/modules/streaming/) confirms that "a browser can start rendering an SVG document before the entire document has been loaded" and that "SVG documents can be progressively loaded and rendered like HTML pages." The spec does not mandate a chunk size or refresh cadence — each browser decides. The practical implication: as long as each intermediate SVG state is structurally valid, browsers render it.

**The constraint**: SVG uses forward references heavily (e.g., `<use href="#icon"/>` referencing a `<defs>` block that appears later). Progressive rendering breaks forward references. The rule is: emit SVG top-to-bottom so every referenced element is defined before it is used. Specifically:
- `<defs>` block first (gradients, clip-paths, filters).
- `<symbol>` or `<g>` elements in definition order.
- `<use>` only after its target `<symbol>` has appeared.
- No `<image>` elements (contain external raster references; the server generates pure vector).

## Streaming SVG from the MCP Tool

For `inline_svg` mode, the LLM generates the SVG inline in its reply. The MCP tool call (`asset_save_inline_svg`) receives the completed SVG. There is no partial-SVG delivery in this flow today.

Two ways to add it:

**Option A — Fine-grained tool streaming (Claude-specific)**

Claude's Anthropic API supports `eager_input_streaming: true` on tool definitions. When set, the `svg` parameter streams as `input_json_delta` events before the tool call closes. The host receives partial JSON (containing partial SVG) character by character.

Reference: https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming

```typescript
// Tool definition registered with Claude
{
  name: "asset_save_inline_svg",
  eager_input_streaming: true,     // Claude-side flag
  input_schema: {
    type: "object",
    properties: {
      svg: { type: "string" },
      asset_type: { type: "string" }
    }
  }
}
```

The host application accumulates `input_json_delta` events, extracts the growing `svg` string from partial JSON, repairs unclosed tags, and pipes to an `<img src="data:image/svg+xml,...">` or inline DOM update. Requires custom host tooling — not available out-of-box in Claude Code.

**Option B — StreamContent via FastMCP**

Use FastMCP's `streamContent` with `streamingHint: true` to push partial SVG as text content during `asset_save_inline_svg` execution:

```typescript
server.addTool({
  name: "asset_save_inline_svg",
  annotations: { streamingHint: true },
  execute: async (args, { streamContent, reportProgress }) => {
    const chunks = splitSvgIntoChunks(args.svg, 10); // 10 equal segments
    let accumulated = "";
    for (const [i, chunk] of chunks.entries()) {
      accumulated += chunk;
      await streamContent({ type: "text", text: accumulated });
      await reportProgress({ progress: i + 1, total: chunks.length });
    }
    const savedPaths = await writeSvgBundle(args.svg, args.asset_type);
    return JSON.stringify(savedPaths);
  }
});
```

The host sees intermediate text events containing growing SVG code. Most hosts display tool output progressively.

## Tag Repair for Partial SVG

Each intermediate chunk sent to the browser must be valid XML. Use a minimal repair pass:

```typescript
function repairPartialSvg(partial: string): string {
  // Close the root <svg> tag if missing
  if (!partial.includes("</svg>")) partial += "</svg>";
  // Find unclosed element tags (naive approach: stack-based)
  const openTags = findUnclosedTags(partial);
  for (const tag of openTags.reverse()) {
    partial += `</${tag}>`;
  }
  return partial;
}
```

Simon Willison's progressive SVG renderer (https://simonwillison.net/2024/Oct/26/svg-progressive-render/) demonstrates exactly this: paste an SVG, watch it render character-by-character, with "automatic completion of partial SVG markup to ensure valid rendering at each animation step."

## Practical Rendering in the IDE

Claude Code renders text tool output as code blocks, not as live SVG. Incremental SVG text in a code block does not give a visual preview — the user sees growing source code.

For a real visual preview, options are:
1. A companion web UI (served by the MCP HTTP server) that subscribes to the SSE progress endpoint and renders the SVG in a `<div>`.
2. A VS Code webview panel opened by a VS Code extension that subscribes to the sidecar SSE feed.
3. Cursor's future artifact panel (not yet SSE-capable as of April 2026).

## Applicability to prompt-to-asset

- Short-term win: enable `streamingHint` on `asset_save_inline_svg` so Cursor/HTTP-transport hosts show growing SVG text.
- Medium-term: add a `/preview/:jobId` HTTP endpoint that streams partial SVG data to a browser-based preview pane.
- Do not attempt character-by-character SVG repair in production — split at valid element boundaries (end of complete `<path ... />` elements) to avoid broken renders.

## Key References

- https://dev.w3.org/SVG/modules/streaming/
- https://simonwillison.net/2024/Oct/26/svg-progressive-render/
- https://github.com/simonw/tools/blob/main/svg-progressive-render.html
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming
- https://github.com/punkpeye/fastmcp
