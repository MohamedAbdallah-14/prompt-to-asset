# 26 — Design Tokens (DTCG) Tooling for `asset_brand_bundle_parse`

> **Research value: high.** DTCG has reached its first stable release (2025.10) and is natively supported by every major OSS translator (Style Dictionary v5, Terrazzo, Tokens Studio). AdCP `brand.json` is a *brand-identity* spec, not a DTCG token file — the parser needs to normalize both into a single internal model.

Scope: what to adopt for the `asset_brand_bundle_parse` tool, which ingests `brand.md`, DTCG JSON, and AdCP `brand.json` and emits a canonical brand bundle used downstream by asset-generation tools.

---

## 1. The DTCG spec itself

The [Design Tokens Community Group](https://www.designtokens.org/) (W3C CG, not a Standards-Track group) shipped its **first stable release, 2025.10**, on 2025-10-28 as three separate modules:

| Module | Status | Purpose |
| --- | --- | --- |
| Format Module 2025.10 | Stable | File format, `$type`/`$value`/`$description`/`$extensions`, aliasing (`{group.token}`), groups |
| Color Module 2025.10 | Stable | Structured color object (`colorSpace`, `components`, `alpha`, `hex`) incl. `srgb`, `display-p3`, `oklab`, `oklch`, `a98-rgb`, `rec2020`, `prophoto-rgb`, `xyz-d50`, `xyz-d65` |
| Resolver Module 2025.10 | Stable | Manifest that composes token files into modes/themes (replaces ad-hoc "themes" in v3 tools) |

**Core `$type` taxonomy (13 standard types):** `color`, `dimension` (object form `{value, unit}`), `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`. Anything else is a free-form custom type.

A preview draft dated 2026-03-30 exists for the Color module ("in progress changes — do not implement"). Treat 2025.10 as the canonical target.

- License: W3C Community CLA (spec is freely implementable).
- Repo: [design-tokens/community-group](https://github.com/design-tokens/community-group).

---

## 2. Translator / transform engines

### Style Dictionary v4 / v5 (Amazon)

- **License:** Apache-2.0. Repo: [style-dictionary/style-dictionary](https://github.com/style-dictionary/style-dictionary).
- **DTCG coverage:** First-class since v4. **v5.4.0 supports DTCG 2025.10** — structured dimension tokens (`{value, unit}`), the new structured color object, and `color/oklch`, `color/oklab`, `color/p3` transforms.
- **Utilities shipped in-package:** `convertToDTCG`, `convertJSONToDTCG`, `convertZIPToDTCG`, `typeDtcgDelegate` (propagates `$type` through nested groups). No bundled validator, but preprocessors hook cleanly into AJV.
- **CLI:** Yes (`style-dictionary build`) plus programmatic `new StyleDictionary(cfg)` API (ESM-only since v4).
- **Round-trip:** One-way (tokens → platforms) by design. For Figma round-trip pair with Tokens Studio.
- **Tailwind / CSS-vars:** Built-in `css/variables` format. Tailwind via community transformers ([`sd-tailwindcss-transformer`](https://github.com/nado1001/style-dictionary-tailwindcss-transformer), `tailwind-dictionary`, and the official [`examples/advanced/tailwind-preset`](https://github.com/style-dictionary/style-dictionary/tree/main/examples/advanced/tailwind-preset) which emits a Tailwind preset referencing CSS custom properties — the cleanest path for v4 theming).

### Terrazzo (Universal Design Tokens CLI)

- **License:** MIT. Repo: [terrazzoapp/terrazzo](https://github.com/terrazzoapp/terrazzo).
- **DTCG coverage:** Native — all 13 DTCG `$type`s **plus three custom types** (`link`, `boolean`, `string`) that are pragmatically useful for brand metadata.
- **CLI verbs that matter for ingest:** `check` (validate DTCG syntax), `format` (normalize to DTCG), `import` (export Figma Variables & Styles to a resolver JSON), `build`, `lint`, `init` (scaffolds from Adobe Spectrum, Apple HIG, GitHub Primer, IBM Carbon, Salesforce Lightning, Shopify Polaris, Radix).
- **Round-trip:** Figma → DTCG via `import`; DTCG → code via `build`.
- **Tailwind / CSS-vars:** Official plugins for CSS, Sass, JS/TS, Swift, **and Tailwind**.
- **Niche:** Strongest "here's a CLI that speaks DTCG end-to-end" story; the cleanest fit for a parser pipeline because `format` and `check` give us normalize + validate as separate commands.

### Tokens Studio for Figma

- **License:** MIT (OSS core). Repo: [tokens-studio/figma-plugin](https://github.com/tokens-studio/figma-plugin).
- **DTCG coverage:** Since v2.0, DTCG can be selected per sync provider (`$value`/`$type`); the plugin auto-detects DTCG on load. 21 token types supported in-plugin (superset including composition/opacity/etc.) but DTCG export is constrained to spec types.
- **CLI:** None; this is a Figma plugin plus a Node SDK (`@tokens-studio/sd-transforms`) that bolts Tokens-Studio-isms onto Style Dictionary. Not a primary ingest tool for us, but **the standard source** for brand files that originated in Figma.

### Hosted / closed: Specify

Hosted SaaS. No OSS core, proprietary API, not usable as a library. Ignore for this tool.

---

## 3. Validators

| Tool | License | Scope |
| --- | --- | --- |
| [`@paths.design/w3c-tokens-validator`](https://www.npmjs.com/package/@paths.design/w3c-tokens-validator) | MIT | W3C DTCG 1.0 (pre-2025.10 nomenclature), strict + permissive schemas, TS types, CLI, AJV peer dep, circular-reference and type-reference checks. Zero runtime deps. |
| [`@upft/schemas`](https://www.npmjs.com/package/@upft/schemas) | MIT | JSON Schema Draft 2020-12; base + per-type schemas; AJV-based manifest + reference-resolution validation. |
| [`dembrandt/dtcg-validator`](https://github.com/dembrandt/dtcg-validator) | MIT | Web validator targeting DTCG **2025.10**, covers all 13 types + circular-ref detection. |
| Dispersa | MIT | Validates against official 2025.10 JSON schemas via AJV as part of a build pipeline. |

Style Dictionary itself does not ship a first-class DTCG validator; it assumes well-formed input. For our parser we need explicit validation.

---

## 4. Real-world reference DTCG files to study

- **[`adobe/spectrum-tokens`](https://github.com/adobe/spectrum-tokens)** (npm name preserved; repo redirects to [`adobe/spectrum-design-data`](https://github.com/adobe/spectrum-design-data)) — Apache-2.0. Large, production-scale DTCG file used in Spectrum 2. There's an open [DRAFT RFC discussion (#627)](https://github.com/adobe/spectrum-design-data/discussions/627) on shipping DTCG-format as an additional release output; useful as a contemporary case study on mapping a proprietary token system onto DTCG.
- **[`material-foundation/material-tokens`](https://github.com/material-foundation/material-tokens)** — Apache-2.0. Canonical Material Design token catalog (`tokens.md` is the human-readable index).
- **[`tokens-studio/material3-designkit-tokens`](https://github.com/tokens-studio/material3-designkit-tokens)** — MIT. Material 3 token sets pre-shaped for Tokens Studio.
- Google's **Material Theme Builder** exports M3 seed/core/scheme JSON; it is *not* DTCG-native, so treat it as an input that needs conversion (Terrazzo's `format` or Style Dictionary's `convertJSONToDTCG` both handle it).

---

## 5. AdCP `brand.json` (the brand-bundle source of truth)

[AdCP Brand Protocol](https://docs.adcontextprotocol.org/docs/brand-protocol) / [brand.json spec](https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json) — open standard, repo [`adcontextprotocol/adcp`](https://github.com/adcontextprotocol/adcp). Hosted at `/.well-known/brand.json` per RFC 8615.

Structure at a glance (v3 schema):

- **Four variants**: `authoritative_location` redirect, `house` redirect (string form), `brand_agent` (MCP-served dynamic brand), `house` object + `brands` (portfolio).
- **Brand definition** — `logos[]`, `colors` (open-shape object, 5 standard roles `primary/secondary/accent/background/text` + open-ended extensions like `heading/body/label/border/divider/surface_1/surface_2`), `fonts` (primary/secondary roles), `tone` (`voice/attributes/dos/donts`), `tagline`, `visual_guidelines`.
- **`visual_guidelines`** — the rich design-system layer: `photography`, `graphic_style`, `shapes`, `iconography`, `composition`, `border_radius` (named scale: `none/default/small/large/pill`), `elevation` (named `box-shadow` strings), `spacing` (`unit` + named scale `xs..2xl`), `graphic_elements[]`, `motion`, `logo_placement`, `colorways[]` (named fg/bg/accent/cta pairings), `type_scale` (`heading/subheading/body/caption/cta` with `font/size/weight/line_height` + `base_width` for proportional scaling), `asset_libraries[]`, `restrictions[]`.

**Important mismatch to plan around:** AdCP values are informal CSS strings (`"12px"`, `"0 4px 8px -1px rgba(0,0,0,0.1)"`, hex colors) with no `$type`/`$value` wrapping. DTCG values are structured objects. The parser must lift AdCP's flat strings into DTCG-typed tokens, not pass them through.

---

## 6. Recommended ingest → canonical-internal-model approach

**Target canonical: DTCG 2025.10 JSON (in-memory), grouped into an internal `BrandBundle` that layers AdCP's brand-identity metadata on top.**

### Pipeline

```
Input → Detect → Normalize → Validate → Canonicalize → Emit
```

1. **Detect source format** by fingerprinting:
   - `$schema` = `adcontextprotocol.org/schemas/v3/brand.json` → AdCP.
   - Top-level `$value` / `$type` keys anywhere in tree → DTCG.
   - Legacy bare `value` / `type` (pre-DTCG-1.0) → legacy tokens (run `convertJSONToDTCG` from `style-dictionary/utils`).
   - `brand.md` → Markdown parse (front-matter for structured fields, headings for color/typography sections) → map into AdCP-shaped object, then reuse the AdCP adapter.

2. **Normalize** to DTCG 2025.10:
   - Use **Terrazzo's `format` command** (or `style-dictionary/utils.convertToDTCG` + `typeDtcgDelegate`) to rewrite legacy/loose DTCG into 2025.10-compliant JSON with inherited `$type`s.
   - For AdCP input, run a purpose-built adapter (we own this; it's the non-trivial piece) that maps each section:

     | AdCP field | DTCG `$type` | Group path |
     | --- | --- | --- |
     | `colors.*` | `color` (structured, `colorSpace: srgb`, hex → components) | `brand.color.{role}` |
     | `colorways[*]` | `color` aliases `{brand.color.primary}` | `brand.colorway.{name}.{slot}` |
     | `visual_guidelines.border_radius.*` | `dimension` | `brand.radius.{name}` |
     | `visual_guidelines.spacing.scale.*` | `dimension` | `brand.space.{name}` |
     | `visual_guidelines.elevation.*` | `shadow` (parse CSS `box-shadow`) | `brand.elevation.{name}` |
     | `fonts.primary/secondary` | `fontFamily` | `brand.font.{role}` |
     | `visual_guidelines.type_scale.*` | `typography` (composite: `fontFamily/fontWeight/fontSize/lineHeight`) | `brand.type.{role}` |
     | `visual_guidelines.motion.easing` | `cubicBezier` (if parseable) or custom | `brand.motion.easing` |

   - Keep AdCP-only fields (`logos[]`, `tone`, `tagline`, `restrictions[]`, `photography`, `graphic_style`, `shapes`, `iconography`, `motion`, `logo_placement`, `asset_libraries[]`, `graphic_elements[]`) as **structured sidecar** inside `$extensions.com.promptToAsset.brand.*` on the root group — DTCG-legal, preserved through round-trips, and retrievable by the downstream asset tools.

3. **Validate** against DTCG 2025.10 using **`@paths.design/w3c-tokens-validator`** in strict mode (AJV peer-dep, TS types, CLI, zero-dep runtime). Cross-check references with Terrazzo `check` as a second opinion in CI. Reject on schema failure; warn on unresolved aliases.

4. **Canonicalize** into the internal `BrandBundle` = `{ tokens: DTCGDocument, identity: AdCPBrandIdentity, provenance: {source, version, hash} }`. Tokens live in memory as the DTCG document so we can re-emit verbatim; the `identity` facet is the typed view consumers prefer.

5. **Emit** via **Style Dictionary v5** (Apache-2.0, ESM, maintained, DTCG 2025.10-native, richest platform matrix):
   - CSS custom properties: built-in `css/variables`.
   - Tailwind: `style-dictionary/examples/advanced/tailwind-preset` approach — emit CSS variables once, then a Tailwind preset that references them. This avoids re-emitting literal values per theme and composes cleanly with `colorways[*]` as multiple CSS `:root[data-theme=...]` blocks.
   - JS/TS: built-in.
   - Prefer Style Dictionary over Terrazzo for emission because its transform graph is more mature; use Terrazzo only for the `check`/`format` front of the pipeline.

### Why this split

- **DTCG is the only vendor-neutral target** with real implementer momentum (Figma, Adobe, Sketch, Framer, Style Dictionary, Terrazzo, Tokens Studio). Adopting it as the canonical internal form means the tool's output is immediately usable by every downstream design tool without another translation layer.
- **AdCP is the richer brand spec** (tone, restrictions, photography direction, logo placement — none of which DTCG models) but is *not* a token format. Don't try to cram it entirely into DTCG; keep the non-tokenizable parts in `$extensions` and expose them as a typed `identity` facet of the bundle.
- **Style Dictionary v5 + Terrazzo is not an either/or.** Terrazzo's `format`/`check`/`import` are the strongest OSS DTCG ingest utilities; Style Dictionary's emission pipeline and Tailwind/CSS-vars story is the most battle-tested. Use each for what it's best at.
- **Validation is explicitly a separate step.** Neither Style Dictionary nor Terrazzo is a conformance validator; a dedicated AJV-based validator (`@paths.design/w3c-tokens-validator`) prevents silently accepting malformed brand input from external agents.

---

## Sources

- [Design Tokens Community Group — Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/) — current DTCG format spec, `$type` taxonomy, aliasing rules.
- [Design Tokens Community Group — Color Module 2025.10](https://www.designtokens.org/tr/drafts/color/) — structured color object, color spaces.
- [styledictionary.com — DTCG reference](https://styledictionary.com/reference/utils/dtcg/) and [v4 preprocessors](https://v4.styledictionary.com/reference/hooks/preprocessors/) — DTCG utils, 2025.10 support in v5.
- [Style Dictionary CHANGELOG](https://github.com/amzn/style-dictionary/blob/main/CHANGELOG.md) — v5.3/5.4 DTCG 2025.10 release notes.
- [terrazzo.app DTCG guide](https://terrazzo.app/docs/guides/dtcg/), [CLI reference](https://terrazzo.app/docs/reference/cli/), [Token Types](https://terrazzo.app/docs/reference/tokens/) — 13 DTCG types + 3 custom, CLI verbs, Tailwind plugin.
- [tokens-studio/figma-plugin](https://github.com/tokens-studio/figma-plugin), [Release 2.0 notes](https://tokensstudio.featurebase.app/changelog/release-20) — MIT, DTCG support per-provider since v2.0.
- [AdCP brand.json spec](https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json), [Brand Protocol overview](https://docs.adcontextprotocol.org/docs/brand-protocol), [brand.json Builder](https://adcontextprotocol.org/brand/builder) — variants, `visual_guidelines`, `colorways`, `type_scale`, resolution algorithm.
- [adobe/spectrum-tokens → spectrum-design-data](https://github.com/adobe/spectrum-design-data) (Apache-2.0) and [DRAFT RFC #627](https://github.com/adobe/spectrum-design-data/discussions/627) — real-world DTCG mapping case study.
- [material-foundation/material-tokens](https://github.com/material-foundation/material-tokens) — Material Design tokens reference.
- [@paths.design/w3c-tokens-validator](https://www.npmjs.com/package/@paths.design/w3c-tokens-validator), [@upft/schemas](https://www.npmjs.com/package/@upft/schemas), [dembrandt/dtcg-validator](https://github.com/dembrandt/dtcg-validator) — AJV-based DTCG validators.
- [style-dictionary/examples/advanced/tailwind-preset](https://github.com/style-dictionary/style-dictionary/tree/main/examples/advanced/tailwind-preset), [sd-tailwindcss-transformer](https://github.com/nado1001/style-dictionary-tailwindcss-transformer) — Tailwind + CSS-vars export patterns.
