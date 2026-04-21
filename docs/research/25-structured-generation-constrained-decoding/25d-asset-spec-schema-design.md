# 25d — AssetSpec JSON Schema Design

Design principles for the structured prompt specification returned by `asset_enhance_prompt`. The goal: a schema tight enough to route correctly and validate provider dialects, loose enough that Claude can fill it without pathological retry loops.

---

## What AssetSpec Must Express

The enhance_prompt tool bridges the user's natural-language brief and the generation pipeline. The spec must encode:

1. **Asset classification**: type, dimensions, platform targets
2. **Visual brief**: subject, style, mood, composition hints
3. **Brand constraints**: palette, wordmark text (absent from SVG mark), font references
4. **Generation routing**: mode, provider, model
5. **Provider dialect**: the model-specific prompt (prose for Flux/gpt-image-1, tag-salad for SD, quoted-string for Ideogram text)
6. **Negative anchors**: what to avoid, expressed as positive anchors per the routing table

---

## Recommended TypeBox Schema (TypeScript)

TypeBox (https://github.com/sinclairzx81/typebox) is the right choice here: it produces JSON Schema objects natively, which are required for MCP tool parameter definitions and for Claude's native structured output `output_format`. Zod is more ergonomic but requires `zodToJsonSchema()` shims to export standard schemas.

```typescript
import { Type, Static } from "@sinclair/typebox";

const ProviderDialectSchema = Type.Object({
  provider: Type.Union([
    Type.Literal("gpt-image-1"),
    Type.Literal("ideogram-3"),
    Type.Literal("recraft-v3"),
    Type.Literal("flux-1-1-pro"),
    Type.Literal("imagen-3"),
    Type.Literal("inline_svg"),
  ]),
  prompt: Type.String({ maxLength: 1200 }),
  negative_anchor: Type.Optional(Type.String({ maxLength: 400 }),  // positive phrasing only
  style_params: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

const AssetSpecSchema = Type.Object({
  asset_type: Type.Union([
    Type.Literal("logo"),
    Type.Literal("app_icon"),
    Type.Literal("favicon"),
    Type.Literal("og_image"),
    Type.Literal("illustration"),
    Type.Literal("splash_screen"),
    Type.Literal("hero"),
    Type.Literal("transparent_mark"),
    Type.Literal("icon_pack"),
  ]),
  subject: Type.String({ minLength: 5, maxLength: 200 }),
  style_tags: Type.Array(Type.String(), { maxItems: 8 }),
  mood: Type.Optional(Type.String({ maxLength: 100 })),
  composition: Type.Optional(Type.String({ maxLength: 200 })),
  palette_hex: Type.Array(
    Type.String({ pattern: "^#[0-9a-fA-F]{6}$" }),
    { maxItems: 6 }
  ),
  background_required: Type.Boolean(),
  transparency_required: Type.Boolean(),
  wordmark_text: Type.Optional(Type.String({ maxLength: 30 })),
  modes_available: Type.Array(
    Type.Union([
      Type.Literal("inline_svg"),
      Type.Literal("external_prompt_only"),
      Type.Literal("api"),
    ])
  ),
  provider_dialects: Type.Array(ProviderDialectSchema),
  svg_brief: Type.Optional(Type.String({ maxLength: 2000 })),
  paste_targets: Type.Optional(Type.Array(Type.Object({
    name: Type.String(),
    url: Type.String({ format: "uri" }),
    notes: Type.Optional(Type.String()),
  }))),
}, { additionalProperties: false });

type AssetSpec = Static<typeof AssetSpecSchema>;
```

---

## Schema Constraints That Map to Business Rules

**`palette_hex` pattern**: The regex `^#[0-9a-fA-F]{6}$` rejects shorthand hex, named colors, `rgb()`, and `hsl()`. Claude should receive these in the brief as explicit hex values — this forces normalization upstream.

**`wordmark_text` maxLength: 30**: Matches the 3-word soft limit described in `CLAUDE.md`. Three average English words = ~20 characters. 30 gives margin while preventing the spec from embedding a paragraph that diffusion models cannot render.

**`style_tags` maxItems: 8**: Beyond 8 tags, tag-salad prompts for SD/SDXL become incoherent. Ideogram and gpt-image-1 perform better with fewer, more precise descriptors.

**`provider` union**: Adding a new provider requires a schema change. This is intentional — it prevents the enhance_prompt tool from routing to an unknown provider string that the generation handler doesn't implement.

**`additionalProperties: false`**: Required for Claude native SO and OpenAI strict mode. Also catches the class of hallucinated-key bugs where the model returns `{"styleTags": [...]}` instead of `{"style_tags": [...]}`.

---

## What JSON Schema Cannot Express — Application-Layer Rules

These constraints must live in the tool handler, not the schema:

1. **`transparency_required: true` → provider must support alpha**: `gpt-image-1`, Ideogram 3 (style: transparent), Recraft V3, or `inline_svg`. Any other provider in `provider_dialects` should be flagged.

2. **`wordmark_text` present → `inline_svg` mode must have separate typography layer**: The schema cannot express "if wordmark_text is set, the SVG mark must not contain `<text>` elements." This is a semantic constraint enforced in the `asset_save_inline_svg` handler.

3. **`provider: "flux-*"` → `negative_anchor` must be null or absent**: Flux errors on negative prompts. Schema can mark `negative_anchor` optional; the application layer must strip it for Flux providers.

4. **`modes_available` coherence**: If no API keys are configured, `api` must not appear in `modes_available`. The capabilities check in `asset_capabilities()` feeds this; the schema itself cannot enforce it.

---

## Claude Schema Subset Compatibility

> **Updated 2026-04-21:** Claude structured outputs are now GA (no beta header required). The schema constraint picture has changed: the Python and TypeScript SDKs now **automatically transform** schemas with unsupported constraints. When you include `minLength`, `maxLength`, `minimum`, or `maximum`, the SDK strips them from the grammar spec, updates the field `description` with the constraint info (e.g., "Must be at least 1 character"), and then validates the model's response against your original schema client-side. This means the AssetSpec schema can include `minLength: 1` on `subject` — the SDK handles the fallback without errors. Token-level enforcement still does not apply to these numeric constraints; they are post-hoc. The guidance to use `maxItems` on arrays still holds (array length constraints are grammar-enforced).

Claude's native structured output is compatible with the AssetSpec schema: it avoids recursive `$ref` and complex `oneOf` chains. The `additionalProperties: false` is still required. The `format: "uri"` on paste target URLs is supported. For numeric field limits, use `maxItems` on arrays where possible (grammar-enforced); for string length and numeric ranges, the SDK handles them as described above.

---

## Versioning Strategy

Embed a `spec_version` literal in the schema: `Type.Literal("1.0")`. This lets downstream consumers detect schema evolution without parsing the full object. When a new provider dialect is added, bump to `"1.1"` and update the union — old cached specs from `enhance_prompt` are recognizable as stale by their version field.
