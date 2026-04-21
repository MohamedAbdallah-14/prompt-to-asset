# Research 25 — Structured Generation & Constrained Decoding
# Partial Update Log — 2026-04-21

## Files audited
25a-constrained-decoding-frameworks.md
25b-instructor-pydantic-typescript-validation.md
25c-svg-grammar-schema-enforcement.md
25d-asset-spec-schema-design.md
25e-runtime-validation-patterns.md
25f-mcp-tool-design-patterns.md
25g-tool-schema-best-practices.md
index.md
SYNTHESIS.md

---

## Changes made

### 25a-constrained-decoding-frameworks.md

**Stale claim**: "Claude structured outputs (public beta, Nov 2025): Set the `structured-outputs-2025-11-13` beta header..."
**Correction**: Claude SO is now generally available. Beta header no longer required (still accepted for backward compat). Parameter path changed from `output_format` to `output_config.format`. GA models as of April 2026: Opus 4.7, Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5.

**Stale claim**: Schema "Not supported: `minimum`/`maximum`, `minLength`/`maxLength`, complex array constraints" (implied hard failure).
**Correction**: Python and TypeScript SDKs now auto-transform unsupported constraints — they strip them from the grammar spec, move them into field descriptions, and validate client-side after response receipt. Still not token-level enforced; application-layer validation still required for safety.

**Summary table**: Updated Claude native SO row to note GA status.

---

### 25b-instructor-pydantic-typescript-validation.md

**Stale claim**: `model="claude-sonnet-4-5"` in code examples (still valid but not the recommended current model).
**Correction**: Updated all code examples to `claude-sonnet-4-6`. Added note: Claude Sonnet/Opus 4.0-series retire June 15, 2026; prefer 4.5+ or 4.6+ for new code.

**Stale claim**: Instructor Python — no mention of `from_provider()` API or v1.14.x status.
**Correction**: Added update note. Instructor Python is at v1.14.5 (Jan 2026). `from_provider()` is now a first-class API. v1.13+ added semantic validation and OpenAI Responses API integration.

**Stale claim**: instructor-js repo listed as only `567-labs/instructor-js`.
**Correction**: Repo is maintained under both `instructor-ai/instructor-js` and `567-labs/instructor-js`. The canonical GitHub org is `instructor-ai`; `567-labs` is a mirror. NPM package `@instructor-ai/instructor` unchanged.

**Stale claim**: Anthropic native SO code still uses `client.beta.messages.parse` with `betas: ["structured-outputs-2025-11-13"]` and `output_format`.
**Correction**: Beta header no longer required. Updated code example to use `client.messages.parse` with no beta array. Added note about `output_config.format` vs `output_format` parameter migration.

**Stale claim**: Instructor Anthropic integration "predates Claude's native structured outputs; it may not leverage the faster grammar-compilation path."
**Correction**: Updated to note that `mode=instructor.Mode.ANTHROPIC_JSON` now exists to route through the native SO path directly.

---

### 25c-svg-grammar-schema-enforcement.md

No substantive factual errors found. SVGGenius benchmark confirmed as ACM MM 2025 (arxiv 2506.03139, published at dl.acm.org/doi/10.1145/3746027.3758287). All claims about post-hoc validation pipeline, Grammar-Aligned Decoding paper (2405.21047), and the 40-path budget calibration are still accurate.

No edits made.

---

### 25d-asset-spec-schema-design.md

**Stale claim**: "Claude's native structured output has specific schema limitations... `minLength` is not in the supported subset — use `minLength: 0` or omit it."
**Correction**: SDK auto-transforms these constraints now. Added update note explaining the new SDK behavior. Updated guidance: `maxItems` on arrays is still preferred (grammar-enforced); string/numeric constraints handled transparently by SDK.

---

### 25e-runtime-validation-patterns.md

**Stale claim**: "Zod v4 (early 2025) improved performance ~2x... Does not produce standard JSON Schema natively — requires `zod-to-json-schema`."
**Correction**: Zod v4 shipped stable in August 2025 (not "early 2025"). It has **built-in** `z.toJSONSchema()` — `zod-to-json-schema` third-party package is deprecated as of November 2025.

**Stale claim**: No mention of TypeBox 1.0 / package name change.
**Correction**: TypeBox 1.0 shipped ~September 2025 under new package name `typebox` (not `@sinclair/typebox`). `@sinclair/typebox` is now the LTS 0.x branch (0.34.x). New projects should use `npm install typebox`. 1.0 brought improved AJV-like error messages.

**Stale claim**: ArkType — "Less ecosystem support... Worth considering for hot validation paths." No version context.
**Correction**: Added that ArkType 2.2 is current; ArkRegex shipped January 2026; requires TypeScript 5.9+ for best performance.

**Standard Schema section**: Updated to reflect that Zod v4, TypeBox 1.x, and ArkType 2.x all implement Standard Schema interface. MCP SDK has not made Standard Schema adoption a declared goal as of 2025-11-25 spec.

---

### 25f-mcp-tool-design-patterns.md

No factual errors found. The spec version cited (2025-11-25) is the current stable spec. The `execution.taskSupport` field, `title`, `outputSchema`, and `annotations` fields are all confirmed present in the spec. The tool count guidance (fewer than 20 tools per session, 16 tools "at the edge") aligns with current research consensus.

No edits made.

---

### 25g-tool-schema-best-practices.md

No substantive factual errors found. The MCP spec date (2025-11-25) is correct. All design recommendations are current.

No edits made.

---

### SYNTHESIS.md

- Date header updated from 2026-04-20 to 2026-04-21.
- 25a summary: Updated "Nov 2025 beta" to "GA post-Nov 2025, no beta header required as of 2026." Added inline note listing GA models and SDK constraint-transformation behavior.
- 25b summary: Added inline note on Instructor v1.14.x, Zod v4 native JSON Schema, model name update, and beta header removal.
- Applicability table: Updated row for `asset_enhance_prompt` to say "GA 2026, no beta header" instead of "Nov 2025".

---

## Claims verified as still accurate (no changes needed)

- Outlines coalescence/5x speedup claim: framework is still actively developed, claim not contradicted.
- LM-Format-Enforcer vLLM integration is native and zero-config: confirmed still accurate.
- Guidance llguidance Rust core ~50µs/token: confirmed by current llguidance docs.
- SVGGenius benchmark findings: paper confirmed published at ACM MM 2025.
- Grammar-Aligned Decoding paper (arxiv 2405.21047): still the primary reference, not superseded.
- TypeBox `TypeCompiler.Compile()` at startup pattern: API unchanged in 0.x branch.
- The 40-path SVG budget being "well-calibrated" per SVGGenius: confirmed.
- MCP 2025-11-25 spec annotations, `outputSchema`, `title`, `execution.taskSupport`: confirmed in spec.

---

## Remaining uncertainty / not verified

- Whether instructor-js has added native Claude SO mode (`ANTHROPIC_JSON`) — the Python version has it; the JS version may not have full parity. Verify against current instructor-js release notes before using.
- Exact TypeBox 1.x API changes vs 0.x — examples in 25d/25e still use the 0.x `@sinclair/typebox` imports, which remain valid for 0.34.x LTS. No migration to 1.x attempted in these files.
- MCP SDK Standard Schema adoption status — check current `@modelcontextprotocol/sdk` release notes.
