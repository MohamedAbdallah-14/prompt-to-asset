# Research 25 — Structured Generation & Constrained Decoding

**Problem**: The prompt-to-asset MCP server uses LLMs in two ways that benefit from structured output guarantees: (1) Claude authoring SVG markup in `inline_svg` mode, and (2) Claude producing a structured `AssetSpec` from `asset_enhance_prompt`. Without enforcement, both are prone to malformed output, hallucinated fields, and constraint violations (path budget, color palette, provider routing).

---

## Files

### [25a — Constrained Decoding Frameworks](./25a-constrained-decoding-frameworks.md)
Outlines, LM-Format-Enforcer, Guidance, and native Claude/OpenAI structured outputs. Covers the mechanism (token filtering vs. grammar compilation vs. retry loops), backend requirements, and the critical caveat that token-level grammar enforcement can distort LLM distributions (Grammar-Aligned Decoding paper, 2024). **Key takeaway**: For Claude API usage, native structured outputs (Nov 2025 beta) are the only token-level option. Outlines/LM-Format-Enforcer require logit access — incompatible with hosted APIs.

### [25b — Instructor, Pydantic, TypeScript Validation](./25b-instructor-pydantic-typescript-validation.md)
Instructor (Python + instructor-js TypeScript) as the practical validation wrapper for Claude API calls. Covers Zod schema integration, the retry-on-validation-error loop, instructor-js production caveats, and comparison with Claude's native SO for the `asset_enhance_prompt` tool. **Key takeaway**: Use instructor-js for complex business-rule validation (cross-field constraints, provider routing checks). Use Claude native SO for high-volume paths where retry cost matters.

### [25c — SVG Grammar and Schema Enforcement](./25c-svg-grammar-schema-enforcement.md)
Three approaches to enforcing SVG constraints: (1) EBNF grammar + constrained decoding for self-hosted models, (2) JSON typed intermediate representation → deterministic SVG render for hosted APIs, (3) post-hoc validation pipeline (path count, viewBox, palette, no rasters, SVGO). Covers the SVGGenius benchmark (ACM MM 2025) findings on model degradation by path count. **Key takeaway**: The 40-path budget is empirically well-calibrated — all models succeed in the "Easy" tier; degradation is sharp above it. Post-hoc validation + retry outperforms grammar enforcement for semantic SVG quality.

### [25d — AssetSpec Schema Design](./25d-asset-spec-schema-design.md)
Full TypeBox schema for `AssetSpec`, the structured prompt spec from `asset_enhance_prompt`. Covers field-level constraint rationale (`palette_hex` pattern, `wordmark_text` maxLength, `style_tags` maxItems, `provider` union), Claude SO schema subset compatibility, and business rules that must live in application code rather than JSON Schema. **Key takeaway**: TypeBox over Zod for AssetSpec because MCP `inputSchema` and Claude SO `output_format` both need standard JSON Schema objects. Embed a `spec_version` literal for evolution tracking.

### [25e — Runtime Validation Patterns](./25e-runtime-validation-patterns.md)
TypeScript library comparison (TypeBox vs Zod vs ArkType), three-stage handler validation pipeline, TypeBox `TypeCompiler` usage, Zod `safeParse` pattern, MCP `inputSchema` integration, and LLM-readable error message formatting for retry loops. **Key takeaway**: TypeBox's `TypeCompiler.Compile()` at startup + `TypeCompiler.Errors()` for structured error feedback is the fastest and most MCP-compatible validation path. Normalize error messages into field-specific natural language before feeding back into instructor retry loops.

---

## Applicability Summary

| Concern | Recommended approach |
|---|---|
| `asset_enhance_prompt` AssetSpec | Claude native SO (Nov 2025) + TypeBox schema; instructor-js for retry fallback |
| `inline_svg` SVG quality | Typed JSON intermediate + deterministic render; post-hoc tier-0 validation + up to 2 retries |
| `inline_svg` syntax validity | Post-hoc: xmldom parse + SVGO; no token-level grammar (Claude API is a black box) |
| MCP tool inputSchema | TypeBox (direct JSON Schema object, no conversion shim) |
| Provider dialect validation | JSON Schema enum constraint on `provider` field; cross-field routing rules in handler |
| Color palette enforcement | Post-hoc: extract colors, ΔE2000 check against brand palette using colorjs.io |
| Path count enforcement | Post-hoc: DOM querySelectorAll count; or typed intermediate schema `.max(40)` |

---

## Key References

- Outlines: https://github.com/dottxt-ai/outlines
- LM-Format-Enforcer: https://github.com/noamgat/lm-format-enforcer
- Guidance: https://github.com/guidance-ai/guidance
- Instructor (Python): https://github.com/567-labs/instructor
- Instructor-JS: https://github.com/567-labs/instructor-js
- TypeBox: https://github.com/sinclairzx81/typebox
- Claude Structured Outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Grammar-Aligned Decoding (distortion caveat): https://arxiv.org/html/2405.21047
- SVGGenius benchmark: https://zju-real.github.io/SVGenius/
- SVGO: https://github.com/svg/svgo
- Standard Schema: https://standardschema.dev/
