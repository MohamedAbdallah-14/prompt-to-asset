# 25a — Constrained Decoding Frameworks

Four production-grade libraries for constraining LLM output at the token level. Each enforces structure via a different mechanism; their applicability to prompt-to-asset depends on where the generation runs.

---

## Outlines (dottxt-ai/outlines)

**Repo**: https://github.com/dottxt-ai/outlines  
**Docs**: https://dottxt-ai.github.io/outlines/latest/

Outlines enforces structure by intersecting the model's next-token probability distribution with the set of tokens that keep the partial output consistent with a schema or grammar. Supported constraint types: JSON Schema (via Pydantic, TypedDict, dataclass, or raw schema strings), regex, Python `Literal`/`Enum`, and Lark context-free grammars (CFG).

Backend support: transformers, llama.cpp, vLLM, Ollama, OpenAI-compatible, Gemini, and dottxt's own hosted service. The commercial `dotjson` and `dotgrammar` products are the hardened production versions.

**Performance**: The library reports a 5x speedup over previous versions via "Coalescence" — batching deterministic grammar transitions to skip redundant forward passes. CFG constraint overhead is claimed to be negligible versus vanilla generation.

**Applicability to prompt-to-asset**:
- Runs only when you control the inference server (vLLM, llama.cpp). It cannot constrain Claude via the Anthropic API or gpt-image-1 — those are black boxes.
- For a self-hosted model authoring SVG in `inline_svg` mode, an Outlines CFG wrapping the SVG path grammar would guarantee syntactically valid output. The W3C SVG path grammar is a known EBNF, making this directly expressible.
- Useful for enforcing the JSON shape of `AssetSpec` when using a local or open-weight model for `asset_enhance_prompt`.

**Caveat (critical)**: Grammar-aligned decoding can distort the model's learned distribution — the model is forced toward grammatically valid tokens even when its probability mass lies elsewhere. A 2024 paper (Grammar-Aligned Decoding, arxiv 2405.21047) demonstrates this bias is non-trivial for complex grammars. For SVG authoring, this means the model may pick syntactically legal but semantically poor paths. The distortion worsens as grammar complexity grows.

---

## LM-Format-Enforcer (noamgat/lm-format-enforcer)

**Repo**: https://github.com/noamgat/lm-format-enforcer

Uses a character-level parser running in parallel with the model's tokenizer prefix tree. At each step, the intersection of valid next characters (from the schema/regex) with valid next tokens (from the tokenizer) determines the allowed token set. The library filters logits to mask forbidden tokens before sampling.

Integrations: transformers, vLLM (built-in as `guided_decoding_backend`), llama.cpp, LlamaIndex, LangChain, Haystack, NVIDIA TensorRT-LLM, ExLlamaV2.

**Key distinction from Outlines**: The character-level parser gives the model more latitude over whitespace and field ordering, reducing the risk of "aggressive enforcement" artifacts. Built-in diagnostic tooling exposes per-token confidence scores to spot over-constrained regions.

**Limitations**:
- Requires logit access — incompatible with closed APIs.
- Regex support is incomplete (no backreferences, limited lookahead).
- Reported risk of increased hallucination in constrained fields when the model's natural output is far from the enforced schema.

**Applicability**: Best pick for vLLM deployments. The vLLM integration is native and zero-config; pass `guided_decoding_backend: "lm-format-enforcer"` per-request. For an `asset_enhance_prompt` endpoint backed by vLLM, this constrains the `AssetSpec` JSON with no additional library code.

---

## Guidance (guidance-ai/guidance)

**Repo**: https://github.com/guidance-ai/guidance  
**Related**: https://github.com/guidance-ai/llguidance (the fast Rust core)

Guidance interleaves control flow (Python conditionals, loops) with generation calls. Rather than post-hoc token filtering, it weaves constraints into the generation at a program level using context managers and `@guidance`-decorated functions. The `llguidance` Rust backend does the heavy lifting: ~50µs of CPU time per token for a 128K-vocabulary model.

**Performance benchmark (2025)**: Among evaluated frameworks, Guidance shows the highest grammar coverage on 6 of 8 datasets tested. It has the fastest time-to-first-token for complex grammars. Token-generation speed is slightly slower than unconstrained sampling due to grammar automaton maintenance.

**Key feature for prompt-to-asset**: Guidance's ability to interleave generation with control flow means you can generate structured JSON, branch on a field value, then generate a different downstream field conditionally — useful for constructing an `AssetSpec` where the `provider_dialect` field should only populate certain sub-fields based on the `mode` value.

**Limitations**: Python-only. Requires model access (transformers or llama.cpp backends). The interleaved programming model adds complexity vs. simple schema enforcement.

---

## Claude / OpenAI Native Structured Outputs

Both Anthropic Claude and OpenAI provide server-side constrained generation without requiring logit access:

**Claude** (public beta, Nov 2025): Set the `structured-outputs-2025-11-13` beta header and pass a JSON schema via `output_config.format`. Uses constrained sampling with compiled grammar artifacts. First-request overhead: 100–300ms for grammar compilation. Compiled grammars are cached 24 hours. Supported schema subset: basic types, enums, `anyOf`, `$ref`, `additionalProperties: false`. **Not supported**: recursive schemas, `minimum`/`maximum`, `minLength`/`maxLength`, complex array constraints.

**OpenAI**: Pass `response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }`. The schema is compiled to a CFG; `additionalProperties: false` is required when `strict: true`.

**For prompt-to-asset**: These are the practical options since the server calls Claude for `inline_svg` SVG authoring and `asset_enhance_prompt`. Claude's native structured output enforces `AssetSpec` JSON shape without any additional infrastructure. The schema subset limitations matter — avoid `minimum`/`maximum` for numeric constraints (path count); enforce those in application-layer validation instead.

---

## Summary Table

| Framework | Logit access required | Best for | API-model compatible |
|---|---|---|---|
| Outlines | Yes | Self-hosted, CFG/regex | No |
| LM-Format-Enforcer | Yes | vLLM deployments, JSON | No |
| Guidance | Yes | Interleaved control flow | No |
| Claude native SO | No | AssetSpec JSON, tool schemas | Yes (Claude only) |
| OpenAI native SO | No | AssetSpec JSON, provider prompts | Yes (OpenAI only) |
