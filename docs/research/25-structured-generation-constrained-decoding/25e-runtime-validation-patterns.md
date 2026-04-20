# 25e — Runtime Validation Patterns for TypeScript

How to validate LLM outputs at runtime in the prompt-to-asset TypeScript MCP server. Covers library selection, the validation pipeline pattern, error normalization, and integration points with the MCP tool surface.

---

## Library Landscape (TypeScript, 2025)

**TypeBox** (`@sinclair/typebox`, https://github.com/sinclairzx81/typebox): Produces standard JSON Schema objects at schema-definition time. Validates at runtime via its bundled `TypeCompiler` or via Ajv. The JSON Schema output is consumable by Claude native SO, OpenAI strict mode, and MCP tool `inputSchema` definitions without any conversion shim. TypeBox + Ajv is ~10x faster than Zod for complex schemas.

**Zod** (https://github.com/colinhacks/zod): Superior developer ergonomics, ~20M weekly downloads, better error messages out of the box. Zod v4 (early 2025) improved performance ~2x and reduced bundle size. Does not produce standard JSON Schema natively — requires `zod-to-json-schema` or the new `z.toJSONSchema()` method in v4. `zodOutputFormat()` in Anthropic's TS SDK wraps this automatically for structured outputs.

**ArkType** (https://arktype.io/): TypeScript-syntax type definitions compiled to optimized validators at definition time. Up to 100x faster than Zod in benchmarks. Zero dependencies. Less ecosystem support (fewer integrations, smaller community). Worth considering for hot validation paths.

**Recommendation for prompt-to-asset**: Use TypeBox for schema definitions that must also serve as MCP tool `inputSchema` or Claude SO `output_format`. Use Zod (via instructor-js) for tool-handler validation where retry integration matters and JSON Schema export is not required.

---

## The Validation Layer Pattern

Each MCP tool handler should have a three-stage validation pipeline:

```
Input (tool arguments) → Parse/Coerce → Business Rules → Effect (generate/save)
                ↓                ↓
          TypeBox Value     Application validators
          (structural)      (semantic, cross-field)
```

**Stage 1 — Structural validation** (TypeBox or Zod):
- JSON-schema-level checks: required fields present, types match, string patterns, array lengths.
- Throw `McpError(ErrorCode.InvalidParams, ...)` on failure.
- Do this before any network call or file I/O.

**Stage 2 — Business-rule validation**:
- Cross-field rules that JSON Schema cannot express (see 25d).
- Provider-constraint checks (transparency routing, Flux negative prompt stripping).
- Throw with a human-readable error that the host LLM can relay to the user.

**Stage 3 — Post-generation validation** (asset tier-0 checks):
- After the asset is generated: dimensions, alpha channel, path count, color palette.
- These are the checks described in `CLAUDE.md` — run them in `asset_validate`.
- Return structured validation results (pass/fail per check, specific error message) rather than a binary ok/fail.

---

## TypeBox Runtime Validation Example

```typescript
import { Type, Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Value } from "@sinclair/typebox/value";

// Compile once at startup (Ajv-like JIT)
const AssetSpecChecker = TypeCompiler.Compile(AssetSpecSchema);

function validateAssetSpec(raw: unknown): AssetSpec {
  if (!AssetSpecChecker.Check(raw)) {
    const errors = [...AssetSpecChecker.Errors(raw)];
    throw new Error(
      `AssetSpec validation failed:\n${errors.map(e => `  ${e.path}: ${e.message}`).join("\n")}`
    );
  }
  // Coerce: strip unknown properties (additionalProperties:false means TypeBox already rejects them,
  // but Value.Clean removes them from valid objects with extra keys before strict check)
  return Value.Clean(AssetSpecSchema, raw) as AssetSpec;
}
```

`TypeCompiler.Compile` runs once per schema (at module load or server startup) and produces an optimized validator. The `Errors()` iterator yields structured error objects with path, message, and value — suitable for feeding back into a retry prompt.

---

## Zod Validation with Structured Error Feedback

When using instructor-js, Zod's `ZodError` is automatically formatted and appended to the retry message. For manual validation in handler code:

```typescript
import { z } from "zod";

const result = AssetSpecSchema.safeParse(raw);
if (!result.success) {
  const issues = result.error.issues.map(i =>
    `${i.path.join(".")}: ${i.message}`
  ).join("; ");
  throw new McpError(ErrorCode.InvalidParams, `Invalid AssetSpec: ${issues}`);
}
const spec = result.data; // fully typed
```

Zod's `safeParse` never throws — the `success` discriminant narrows cleanly in TypeScript. Prefer `safeParse` over `parse` in handler code; use `parse` (which throws) only in test assertions.

---

## MCP Tool InputSchema: TypeBox Is Authoritative

MCP tool definitions require a `inputSchema` object that is a valid JSON Schema. TypeBox produces this directly:

```typescript
const tool: Tool = {
  name: "asset_enhance_prompt",
  description: "Enhance a brief into a structured AssetSpec",
  inputSchema: Type.Object({
    brief: Type.String({ minLength: 10, maxLength: 2000 }),
    asset_type: Type.Optional(AssetTypeSchema),
    brand_bundle: Type.Optional(BrandBundleSchema),
  }, { additionalProperties: false }),
};
```

The same `inputSchema` object is used by the MCP runtime to validate tool call arguments before the handler is invoked. This means TypeBox is doing double duty: defining the TypeScript types and providing the schema for MCP's built-in validation layer. With Zod you need an extra conversion step (`zodToJsonSchema(schema)`) every time the tool definition is serialized.

---

## Error Response Normalization

LLM validation errors should be normalized before returning to the host LLM. Raw TypeBox/Zod error messages are written for developers, not for LLMs to reason about. Wrap them:

```typescript
function formatValidationError(errors: ValidationError[]): string {
  return [
    "The generated output failed schema validation. Specific issues:",
    ...errors.map(e => `- Field '${e.path}': ${e.message}. Expected: ${e.expected}`),
    "Please regenerate with the above corrections applied.",
  ].join("\n");
}
```

This structured error format, when passed back to Claude via instructor-js's retry mechanism, gives the model specific fields to fix rather than a generic "invalid JSON" message. Empirically, retry success rates are higher with field-specific error messages than with raw schema dumps.

---

## Standard Schema (standardschema.dev)

As of 2025, the Standard Schema proposal (https://standardschema.dev/) defines a common interface so ecosystem tools accept Zod, TypeBox, ArkType, and Valibot schemas interchangeably. Check if MCP SDK and instructor-js have adopted it — if so, the library choice becomes less consequential for interoperability. Currently adoption is partial; TypeBox and Zod are the safest choices for maximum tool compatibility.
