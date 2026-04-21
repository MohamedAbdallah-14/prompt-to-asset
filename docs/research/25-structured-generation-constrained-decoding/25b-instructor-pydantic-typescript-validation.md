# 25b — Instructor, Pydantic, and TypeScript Validation

Instructor provides a structured wrapper over LLM calls that enforces schema compliance through retry loops rather than token-level constraints. It sits above the model API, not inside the inference server — which makes it the practical choice when using Claude or OpenAI via their hosted APIs.

---

## Instructor (Python)

**Repo**: https://github.com/567-labs/instructor (formerly instructor-ai/instructor)  
**Site**: https://python.useinstructor.com/

> **Updated 2026-04-21:** Instructor Python is at v1.14.x as of early 2026 (v1.14.5 released Jan 29, 2026). The library introduced `from_provider()` as a simpler string-based initializer — e.g., `instructor.from_provider("anthropic/claude-sonnet-4-6")` — which is now the recommended pattern alongside the traditional `from_anthropic()`. Version 1.13+ also added semantic validation capabilities and integration with OpenAI's Responses API. The model string `"claude-sonnet-4-5"` in examples below remains valid; prefer `"claude-sonnet-4-6"` or `"claude-opus-4-7"` for new code (Claude Sonnet/Opus 4.0 series retire June 15, 2026).

You define a Pydantic model, pass it as `response_model`, and Instructor converts it to a tool schema or JSON mode prompt, validates the response, and retries with the validation error message appended if validation fails. The retry loop is configurable via `max_retries`.

```python
import instructor
from anthropic import Anthropic
from pydantic import BaseModel, Field

class AssetSpec(BaseModel):
    asset_type: Literal["logo", "favicon", "app_icon", "og_image"]
    subject: str
    style_tags: list[str] = Field(max_length=8)
    palette_hex: list[str] = Field(max_length=6)
    provider_dialect: ProviderDialect

client = instructor.from_anthropic(Anthropic())
spec = client.messages.create(
    model="claude-sonnet-4-6",  # updated from claude-sonnet-4-5
    response_model=AssetSpec,
    messages=[{"role": "user", "content": brief}]
)
```

Instructor supports 15+ providers including Anthropic, OpenAI, Google, Mistral, Ollama, and LiteLLM. The Anthropic integration uses tool use under the hood by default; with Claude SO now GA, you can also use `mode=instructor.Mode.ANTHROPIC_JSON` to route through the native structured output path.

**Retry mechanism**: On Pydantic `ValidationError`, Instructor appends the error to the conversation and re-requests. Empirically, 2–3 retries resolve most schema failures. This is qualitatively different from token-level enforcement: the model can still generate garbage on the first pass, but it self-corrects.

**Applicability to prompt-to-asset**:
- `asset_enhance_prompt` is the clearest use case. The tool returns an `AssetSpec` — defining that as a Pydantic model and wrapping the Claude call in Instructor guarantees valid structure with automatic error recovery.
- Custom validators can enforce business rules that JSON Schema cannot express (e.g., `palette_hex` values must parse as valid hex colors, `style_tags` must not contain contradictory terms).

**Caveats**:
- Retry loops add latency and token cost. With `max_retries=3`, a poorly specified schema can triple inference cost before erroring out.
- Instructor's Anthropic integration predates Claude's native structured outputs; it may not leverage the faster grammar-compilation path. Test both approaches.
- Streaming partial validation is supported but increases complexity significantly.

---

## Instructor-JS (TypeScript)

**Repo**: https://github.com/instructor-ai/instructor-js (canonical) / https://github.com/567-labs/instructor-js (mirror)
**NPM**: `@instructor-ai/instructor`

> **Updated 2026-04-21:** The repo is maintained under both `instructor-ai/instructor-js` and `567-labs/instructor-js` on GitHub (same codebase). The npm package `@instructor-ai/instructor` remains the install target. Note that the repo for instructor-js is less actively maintained than the Python version; check the GitHub issues page for known Anthropic-integration quirks before upgrading.

The TypeScript port uses Zod schemas instead of Pydantic. The pattern is identical: define a `z.object(...)`, pass it as `response_model`, get back a typed object with retries on validation failure.

```typescript
import Instructor from "@instructor-ai/instructor";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const AssetSpecSchema = z.object({
  asset_type: z.enum(["logo", "favicon", "app_icon", "og_image"]),
  subject: z.string(),
  style_tags: z.array(z.string()).max(8),
  palette_hex: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6),
});

const client = Instructor({
  client: new Anthropic(),
  mode: "TOOLS",
});

const spec = await client.chat.completions.create({
  model: "claude-sonnet-4-6",  // updated from claude-sonnet-4-5
  response_model: { schema: AssetSpecSchema, name: "AssetSpec" },
  messages: [{ role: "user", content: brief }],
  max_retries: 2,
});
```

The `response_model` inference gives `spec` the type `z.infer<typeof AssetSpecSchema>` automatically — no type casting needed downstream.

**Applicability**: Since prompt-to-asset is a TypeScript MCP server, instructor-js is the most natural fit for the `asset_enhance_prompt` tool handler. It keeps validation co-located with the schema definition and avoids a separate validation pass.

**Caveats**:
- instructor-js lags behind the Python version in features. Streaming partial objects and some advanced validation modes are not yet parity.
- The `llm-polyglot` bridge adds a dependency layer for non-OpenAI providers. Test that Anthropic responses parse correctly before deploying.
- No built-in support for Claude's native structured output (grammar-compiled). Instructor-JS uses tool-call mode, which may produce slightly different token distributions.

---

## Anthropic Native Structured Outputs (TS SDK)

> **Updated 2026-04-21:** Claude structured outputs are now **generally available** — the `structured-outputs-2025-11-13` beta header is no longer required and the parameter path changed from `output_format` to `output_config.format`. The SDK-level helpers (`zodOutputFormat`, `jsonSchemaOutputFormat`) continue to work; update any code that still passes the beta header string. Additionally, the SDK now automatically handles unsupported schema constraints (`minimum`, `maximum`, `minLength`, `maxLength`) by removing them from the grammar spec and re-applying them client-side after receiving the response.

Anthropic's TS SDK exposes `zodOutputFormat()` and `jsonSchemaOutputFormat()` helpers for the `output_config.format` field (GA as of 2026):

```typescript
import Anthropic, { zodOutputFormat } from "@anthropic-ai/sdk";
import { z } from "zod";

// No beta header needed — structured outputs are GA
const response = await client.messages.parse({
  model: "claude-sonnet-4-6",  // updated from claude-sonnet-4-5
  output_format: zodOutputFormat(AssetSpecSchema, "asset_spec"),
  messages: [{ role: "user", content: brief }],
});

const spec = response.parsed_output; // typed as z.infer<typeof AssetSpecSchema>
```

This path uses server-side grammar compilation (100–300ms first-request overhead, then cached 24h) rather than retry loops. It is strictly faster in steady state and has zero retry cost — but it does not self-correct; invalid grammar specifications hard-error at schema-compile time, not at request time.

**Trade-off**: Instructor-JS is more fault-tolerant (retries on semantic validation failures); native SO is faster in steady state (grammar compiled once, applied to every request in the cache window). Use native SO for high-volume paths; use Instructor for complex business-rule validation that exceeds what JSON Schema can express.

---

## Pydantic vs Zod: Schema Expressiveness for AssetSpec

Both can express the AssetSpec constraints needed:

| Constraint | Pydantic | Zod |
|---|---|---|
| Enum values | `Literal["logo", ...]` | `z.enum(["logo", ...])` |
| Array max length | `Field(max_length=N)` | `.array().max(N)` |
| String regex | `Field(pattern=r"...")` | `.regex(/.../)` |
| Cross-field validation | `@model_validator` | `.superRefine(...)` |
| Custom error messages | `Field(description=...)` | `.describe(...)` |

Cross-field validation (e.g., "if `mode` is `api`, `provider` must be set") is only expressible in application-layer validators, not in JSON Schema itself. Both libraries support this through model-level validators.
