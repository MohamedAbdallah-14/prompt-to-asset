# 25f: MCP Tool Design Patterns

Research date: 2026-04-20. Sources: MCP spec 2025-11-25, Block Engineering blog, Speakeasy, thenewstack.io, mcpcat.io, almatuck.com.

---

## Spec-level tool fields (2025-11-25)

The November 2025 spec added several fields beyond `name`, `description`, `inputSchema`:

- **`title`**: Human-readable display name separate from the machine name. `get_weather` (name) vs. `Weather Information Provider` (title). Use it — clients render title in UI, not the snake_case name.
- **`outputSchema`**: JSON Schema 2020-12 defining the structure of `structuredContent` in the response. When present, servers MUST conform and clients SHOULD validate. Enables strict typed handling by downstream consumers.
- **`annotations`**: Four boolean hints — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Default posture is maximally cautious (non-read-only, potentially destructive, non-idempotent, open-world). Set these correctly; Claude Code auto-approves `readOnlyHint: true, idempotentHint: true` tools without a permission prompt, which is why `asset_capabilities` and `asset_enhance_prompt` already carry them.
- **`execution.taskSupport`**: `"forbidden"` (default) | `"optional"` | `"required"`. Long-running pipeline tools like `asset_generate_*` should declare `"optional"` to enable task-augmented execution and progress streaming.
- **`icons`**: Array of icon objects for UI display.

The spec distinguishes two error channels: **protocol errors** (JSON-RPC `-32xxx` codes — unknown tool, malformed request) vs. **tool execution errors** (`isError: true` in the result body). The key difference: execution errors are returned to the LLM so it can self-correct and retry; protocol errors may not be. Always use `isError: true` for recoverable failures like missing API key, unsupported model, or validation failures — not for `throw`.

Structured content pattern (backward-compatible):
```json
{
  "content": [{ "type": "text", "text": "{\"mode\":\"inline_svg\",...}" }],
  "structuredContent": { "mode": "inline_svg", "svg_brief": "..." }
}
```
Both fields simultaneously: text for backward compat, `structuredContent` for typed clients.

---

## Tool count: 16 is at the edge

Research consensus for 2026: OpenAI recommends fewer than 20 tools per session; large tool spaces degrade model accuracy by up to 85% in some benchmarks. Sixteen tools is near that limit.

**STRAP pattern** (Single Tool Resource Action Pattern): consolidates CRUD-style tools into parameterized domain tools. Applied to this server's generator surface — `asset_generate_logo`, `asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`, `asset_generate_illustration`, `asset_generate_splash_screen`, `asset_generate_hero` — these seven share identical parameters (`brief`, `mode`, `brand_bundle`, `output_dir`). A single `asset_generate` tool with `asset_type: enum` would reduce seven tools to one at the cost of a longer description. The trade-off: simpler tool list vs. slightly harder to discover that each asset type has type-specific options (e.g., `platforms` for app_icon, `ios_18_appearances`).

**Block Engineering approach**: consolidate related operations, not unrelated ones. Their Google Calendar v2 moved from chained API calls to a single SQL-query tool against DuckDB tables. Applied here: `asset_remove_background`, `asset_vectorize`, `asset_upscale_refine` could merge into `asset_post_process` with an `operation` enum, since they're always invoked sequentially.

**Six-Tool Pattern** from mcpbundles.com: aim for 6 cohesive tools that each cover a workflow stage. This server's 16 tools map to roughly five stages: (1) capabilities/discovery, (2) prompt enhancement, (3) generation, (4) pipeline primitives, (5) validation/ingestion. Consolidating within stages would reach ~7-8.

---

## MCP resources vs. tools for static data

The spec is explicit: resources are **application-controlled** (client decides when to attach context); tools are **model-controlled** (LLM decides when to call). Static data — `routing-table.json`, `model-registry.json`, `paste-targets.json` — belongs in resources, not tools.

`asset_capabilities()` currently runs deterministic logic and returns computed mode availability. This is borderline: it reads env vars (dynamic) but doesn't modify state. As a resource it would be at URI `asset://capabilities` — the client auto-attaches it; as a tool the LLM must call it first. Given the CLAUDE.md workflow requires the LLM to call it before generating, keeping it as a tool with `readOnlyHint: true, idempotentHint: true` is correct. But `routing-table.json` and `model-registry.json` are genuinely static reference data — expose as resources at `asset://routing-table` and `asset://model-registry` with `mimeType: "application/json"` and `annotations: { audience: ["assistant"], priority: 0.7 }`.

---

## MCP prompts for common asset workflows

Prompts are **user-controlled** slash commands — the user picks them, the server fills in a structured message sequence. Concrete candidates for this server:

- `/generate-logo` — arguments: `name` (required), `style` (optional), `colors` (optional). Returns a pre-composed user message that invokes the full workflow: capabilities check, enhance, mode selection, generate.
- `/generate-app-icon` — arguments: `platform` (ios/android/pwa/all), `brief`.
- `/ingest-and-validate` — arguments: `image_path`, `asset_type`. Reduces the two-step ingest + validate to one user action.

Prompts are not tools. They emit `messages` arrays (user/assistant turns), not structured data. They're the right primitive for "opinionated workflow templates" since they guide the LLM rather than executing code.

---

## Testing MCP tool handlers

The in-memory pattern from mcpcat.io applies directly: instantiate the server, connect a test client without a subprocess, call tools, assert on result content and `isError`. The existing `*.test.ts` files in `packages/mcp-server/src/` (`classify.test.ts`, `modes.test.ts`, etc.) use this approach. Key gaps to address:

1. Test `isError: true` paths, not just happy paths — verify the error text is actionable enough for an LLM to self-correct.
2. Test `annotations` are set correctly on each tool (a static check, not a runtime test).
3. Test that `structuredContent` conforms to `outputSchema` when both are declared — use `ajv` or `zod.parse` against the schema.
4. For `asset_generate_*` tools that call external providers, mock at the provider boundary with `vi.mock`, not at the HTTP boundary.

STDIO logging trap: anything written to stdout corrupts the protocol stream. Test that no tool handler calls `console.log` — only `console.error` or the SDK logger.
