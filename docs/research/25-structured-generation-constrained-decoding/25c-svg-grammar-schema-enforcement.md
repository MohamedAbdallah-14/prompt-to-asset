# 25c — SVG Grammar and Schema Enforcement

Enforcing SVG structure when Claude authors it in `inline_svg` mode. Three distinct problem layers: syntactic validity (well-formed XML/SVG), structural constraints (path count, viewBox, element budget), and semantic constraints (palette-only colors, no embedded rasters).

---

## The SVG Path Grammar Is Formal and Expressible

The W3C SVG path grammar (https://svgwg.org/specs/paths/) is a published EBNF. The `d` attribute of `<path>` follows strict rules: `svg-path ::= wsp* moveto-drawto-command-groups? wsp*` with defined production rules for every command letter (M, L, C, S, Q, T, A, Z). This grammar is finite and can be expressed in Lark or tree-sitter format, which Outlines and Guidance both accept.

In practice: a Lark grammar wrapping the W3C SVG path EBNF, combined with an outer grammar for the SVG element tree, could constrain a local model to produce only syntactically valid SVG. This is well-understood territory — constrained decoding with EBNF grammars for XML-like formats is demonstrated in published research and vLLM's guided decoding backend.

**However**: This only applies to self-hosted models via Outlines/LM-Format-Enforcer/Guidance. Claude via the Anthropic API does not expose logits — you cannot apply token-level grammar enforcement.

---

## Claude Native SO: Not Suitable for SVG Directly

Claude's native structured outputs support JSON schemas, not arbitrary XML grammars. You cannot pass an SVG grammar as the `output_format` — the API only accepts JSON Schema dialect. This means for `inline_svg` mode with Claude, structural enforcement must be post-hoc.

The practical path: use a JSON schema to constrain Claude's output to a structured intermediate representation, then convert that to SVG in application code. Example:

```typescript
const SVGSpec = z.object({
  viewBox: z.literal("0 0 100 100"),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6),
  elements: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("circle"), cx: z.number(), cy: z.number(), r: z.number(), fill: z.string() }),
    z.object({ type: z.literal("rect"), x: z.number(), y: z.number(), w: z.number(), h: z.number(), fill: z.string() }),
    z.object({ type: z.literal("path"), d: z.string(), fill: z.string() }),
  ])).max(40),
});
```

Claude generates a typed JSON object; the server renders it to SVG using a deterministic template. This approach enforces the path budget (`.max(40)`) and palette constraints at the schema level. The tradeoff: expressive SVG features (complex gradients, masks, filters) are hard to expose through a typed intermediate — the element union becomes unwieldy past ~10 element types.

---

## Post-Hoc SVG Validation Pipeline

For inline SVG where Claude emits raw `<svg>` markup directly:

**Step 1 — Parse**: Use a DOM parser (Node's `DOMParser` via `@xmldom/xmldom`, or `fast-xml-parser`). Reject non-well-formed XML immediately.

**Step 2 — Path count**: `doc.querySelectorAll('path, polygon, polyline, line, circle, rect, ellipse').length` against the 40-element budget. Flag excess.

**Step 3 — viewBox**: Assert `svg.getAttribute('viewBox')` matches the expected format. Flag missing or malformed values.

**Step 4 — Color palette**: Extract all `fill`, `stroke`, `stop-color` attribute values. Parse as hex, normalize. Check ΔE2000 against the brand palette using a color library (colorjs.io, chroma-js). Reject colors outside the palette with delta > 10.

**Step 5 — No rasters**: Assert zero `<image>` elements. Assert zero `data:` URI occurrences in `href`/`xlink:href` attributes.

**Step 6 — No text elements**: In `inline_svg` mode the brief says text should be excluded from the SVG mark. Assert zero `<text>`, `<tspan>`, `<textPath>` elements.

**Step 7 — SVGO**: Pass through `svgo` (https://github.com/svg/svgo) with the `preset-default` plugin set for optimization. Run SVGO's built-in validation. This catches additional malformed path data that a DOM parse might accept.

This pipeline runs in ~10ms in Node.js and is deterministic — the tier-0 checks described in `CLAUDE.md` map directly to steps 2–6.

---

## SVGGenius Benchmark Findings (2025)

SVGGenius (ACM MM 2025, https://zju-real.github.io/SVGenius/) benchmarks LLMs on SVG understanding, editing, and generation across 2,377 queries. Key findings relevant to prompt-to-asset:

- **All models degrade sharply as path count increases.** The benchmark stratifies by "Easy / Moderate / Complex" tiers using normalized path count, control points, and command diversity. Even proprietary frontier models show systematic degradation at high complexity.
- **The 40-path budget in `CLAUDE.md` is well-calibrated.** "Easy" tier SVGs in SVGGenius are those with low path counts; these are where all tested models succeed reliably.
- **Reasoning-enhanced training outperforms pure scale** for complex SVG tasks. This suggests that when extending the inline_svg mode with chain-of-thought prompting ("think step by step about the geometry"), output quality improves more than switching to a larger model.
- **Style transfer is the hardest task.** Do not ask Claude to reproduce an existing SVG's visual style in a new mark — this is beyond reliable current capability.

---

## TextGrad-Style Iterative Refinement

For situations where first-pass SVG quality is insufficient, the TextGrad approach (https://headstorm.ai/case-study/technical-insight/optimizing-local-llm-svg-code-generation-with-textgrad/) applies: generate SVG, validate against the tier-0 checklist, feed the structured validation errors back to Claude with explicit correction instructions, and re-generate. This is effectively the Instructor retry loop applied to SVG authoring:

```
Generate SVG → Validate → If failures: append error list → Re-generate (max 2 retries)
```

The validation errors from steps 2–6 above provide the structured feedback. Fixed `viewBox="0 0 100 100"`, black-and-white palette, and explicit path budget in the initial prompt substantially reduces the retry rate — the Headstorm case study found that explicit constraints in the initial prompt mattered more than the refinement loop itself.

---

## Grammar-Aligned Decoding Distortion (Caveat)

The 2024 paper "Grammar-Aligned Decoding" (arxiv 2405.21047) demonstrates that enforcing a grammar via standard constrained decoding biases token selection: the model is forced toward tokens that keep the output grammatically valid, even when its learned distribution prefers a different (but also valid) continuation. For SVG, this manifests as the model making locally grammatical but globally poor path decisions — syntactically correct `d` attributes that trace meaningless shapes.

The proposed remedy (ASAp — adaptive sampling with approximate expected futures) requires multiple sampling passes and is not yet implemented in production frameworks. The practical implication: grammar enforcement guarantees syntactic validity but does not improve semantic quality. Post-hoc validation plus retry remains the more reliable quality lever than token-level grammar enforcement for SVG.
