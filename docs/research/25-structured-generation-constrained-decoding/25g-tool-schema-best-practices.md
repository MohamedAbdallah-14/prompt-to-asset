# 25g: Tool Schema Best Practices — Synthesis

Research date: 2026-04-20. Sources: MCP spec 2025-11-25, thenewstack.io 15 practices, Block Engineering, Speakeasy, modelcontextprotocol.info tutorials, mcpcat.io.

---

## The core schema design problem

A tool's `inputSchema` and `description` are the only interface an LLM has for understanding when and how to call a tool. They're not documentation — they're prompts. Every word in a description shapes model behavior. Every enum value, property name, and `description` field in the schema is training signal for in-context routing.

The MCP spec defaults to JSON Schema 2020-12. The SDK uses Zod for runtime validation (see `packages/mcp-server/src/schemas.ts`). The pattern that works: define Zod schemas as the source of truth, derive `inputSchema` JSON Schema from them using `zodToJsonSchema`, and use `outputSchema` to declare the response shape. This eliminates schema drift between validation and declaration.

---

## Naming and discoverability

**Tool names are routing signals.** The spec allows 1-128 characters, [A-Za-z0-9_\-.]. Follow these rules:

1. **Namespace with prefix** when multiple servers are loaded together. This server already uses `asset_` prefix — correct. Without it, `capabilities` collides with any other server that exposes its own capabilities tool.
2. **Verb_noun for actions, noun for read-only**: `asset_generate_logo`, `asset_remove_background` (action tools); `asset_capabilities` (state query — borderline, but acceptable).
3. **Use `title` for display**: `"asset_enhance_prompt"` as name, `"Enhance & Route Asset Brief"` as title. Clients show title in confirmation dialogs; name is what the LLM calls.
4. **Parameter names must be unambiguous**: `user_id` not `user`, `asset_type` not `type` (which is a JSON Schema keyword). The existing schemas already do this correctly.

---

## Description writing for LLM routing

The description answers three questions an LLM must be able to answer: (1) when should I call this tool vs. a different one? (2) what does it require? (3) what does it return?

Current `asset_capabilities` description: "Report which of the three execution modes this server can run RIGHT NOW given the current env... Read-only; no network. Call before offering the user options." This is good — it names the behavioral contract (read-only, no network) and gives explicit orchestration guidance (call before offering options).

Improvement pattern from Block Engineering: include the anti-cases. "Use this tool when X. Do NOT use this when Y (use Z instead)." Applied to `asset_enhance_prompt`: add "Do NOT call asset_generate_* before calling this tool — asset_generate_* lacks model routing logic." This prevents the LLM skipping the workflow step.

Description length: aim for 2-4 sentences. Context windows are finite; tool list is loaded on every turn. The `asset_generate_illustration` description shouldn't repeat the same boilerplate mode explanation that every other generator also has — factor shared mode semantics into a single tool description (the MCP prompts feature is the right place for workflow-level prose).

---

## Input schema: enum over string, required over optional

**Use enums whenever the domain is closed.** `asset_type` is already an enum — correct. `mode` is an enum (`inline_svg` | `external_prompt_only` | `api`) — correct. Where enums are missing: `target_model` in `asset_enhance_prompt` is a free string. The routing table has a closed set of model IDs — enumerate them. An LLM guessing at model names will hallucinate; an enum constrains the choices.

**`required` is a routing contract.** Mark parameters required when the tool cannot make a reasonable default. `brief` is required everywhere — correct. `asset_type` is optional in `asset_enhance_prompt` (server infers it) — correct. `platforms` in `asset_generate_app_icon` defaults to `["all"]` — correct. But `output_dir` defaulting to `undefined` silently uses a computed path: document what the computed default is in the property description, not just that it's optional.

**`additionalProperties: false`** on `inputSchema` for tools with a closed parameter set. This lets clients catch typos in tool calls before they reach the server. The current schemas use Zod which enforces this at runtime, but the JSON Schema emitted to the client should reflect it.

---

## Output schema and structured content

Every tool that returns machine-parsable data should declare `outputSchema`. The pattern:

```typescript
outputSchema: {
  type: "object",
  properties: {
    modes_available: { type: "array", items: { type: "string", enum: ["inline_svg", "external_prompt_only", "api"] } },
    svg_brief: { type: "string" },
    enhanced_prompt: { type: "string" },
    error: { type: "string", description: "Only present when isError: true" }
  },
  required: ["modes_available"]
}
```

The response then populates both `content[0].text` (JSON string, for backward compat) and `structuredContent` (parsed object). Tools that only return prose (like `asset_validate`) can skip `outputSchema` — use it when the consumer needs to parse fields programmatically.

---

## Error schema design for LLM self-correction

The spec distinguishes recoverable (tool execution error, `isError: true`) from non-recoverable (protocol error, JSON-RPC `-32xxx`). Design error content as actionable commands, not status codes.

Bad: `"Error: API key missing"`
Good: `"No OPENAI_API_KEY found. To use api mode, set OPENAI_API_KEY=sk-... in your environment. Available now: inline_svg, external_prompt_only."`

The good form tells the LLM exactly what to tell the user. Include the remediation step and what is still available. For validation failures: `"Asset failed safe-zone check: subject bbox 920px extends beyond iOS safe zone (824px). Regenerate with tighter subject framing or use asset_upscale_refine with crop_to_safe_zone: true."` The LLM can relay this directly or act on it autonomously.

---

## Tool versioning without breaking clients

The spec recommends semantic versioning for servers and individual tools. Backward-incompatible schema changes (removing required parameters, changing enum values) require a new tool name: `asset_generate_logo_v2`. Backward-compatible additions (adding optional parameters) are safe to deploy without version bumps. The `listChanged` capability lets clients refresh the tool list dynamically — declare it so clients know to re-fetch after server updates.

For parameters being phased out: add them to the schema with a `description` note of "deprecated, use X instead", leave them functional for one version, remove in the next. The LLM will read the deprecation note and prefer the replacement.

---

## Applicability to the 16-tool surface

Priority improvements:
1. Add `outputSchema` to `asset_capabilities` and `asset_enhance_prompt` — these are the two tools LLMs call programmatically most often.
2. Add `execution.taskSupport: "optional"` to all `asset_generate_*` tools — they make network calls and can take 10-30 seconds.
3. Add `title` to every tool — currently all tools lack display names.
4. Expose `routing-table.json` and `model-registry.json` as MCP resources, not as implicit context the LLM must already know.
5. Enumerate `target_model` values in `asset_enhance_prompt` rather than accepting a free string.
6. Add `additionalProperties: false` to tool input schemas in the emitted JSON Schema (Zod's `strict()` mode).
7. Add three MCP prompts: `/generate-logo`, `/generate-app-icon`, `/generate-favicon` as user-selectable workflow templates.
