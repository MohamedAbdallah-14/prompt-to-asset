---
category: 29-rag-brand-knowledge
angle: 29d
title: "Figma Variables API → Design Tokens → Brand Bundle Pipeline"
date: 2026-04-20
tags:
  - figma
  - figma-variables
  - design-tokens
  - dtcg
  - style-dictionary
  - brand-bundle
  - tokens-studio
  - pipeline
status: research
---

# Figma Variables API → Design Tokens → Brand Bundle Pipeline

## Why Figma is the right starting point

Most product teams author their brand palette and typography in Figma, not in JSON files. Figma Variables (launched 2023, stabilized 2024) replaced Figma Styles for colors and typography, storing values in collections with modes (light/dark, brand-A/brand-B). If the prompt-to-asset server can ingest a Figma file key and extract a valid `BrandBundle`, user onboarding reduces to sharing a Figma link.

---

## The Figma Variables data model

Figma Variables have four types: `COLOR`, `FLOAT`, `STRING`, and `BOOLEAN`. Brand-relevant variables:

- `COLOR` — palette (brand primary, secondary, semantic roles, neutrals).
- `STRING` — font family names, possibly mode-aware (e.g., different font for a localized brand).
- `FLOAT` — spacing, border radius, font size (less relevant for asset generation, more for UI).

Variables are organized into **collections**, each with **modes** (e.g., a "Color" collection with "Light" and "Dark" modes). The REST API response includes `valuesByMode`, so every mode survives export.

Typography in Figma is still partially modeled as **Styles** rather than Variables for weight, line-height, and letter-spacing (full variable coverage is pending as of 2026). This means a complete typography extraction requires querying both `GET /v1/files/:key/variables/local` (for font family strings) and `GET /v1/files/:key/styles` (for weight, size, and line-height).

---

## API access tiers

**Enterprise plan required** for the REST API Variables endpoints. Scope: `file_variables:read`. Personal access tokens work; OAuth 2.0 tokens also supported with the same scope. The `file_read` scope is deprecated for this purpose.

Endpoints:
- `GET /v1/files/:file_key/variables/local` — all local variable collections and their values
- `GET /v1/files/:file_key/variables/published` — published library variables
- `POST /v1/files/:file_key/variables` — bulk create/update/delete (write access)

For teams without Enterprise: the Figma UI allows manual export via the Variables panel → three-dot menu → "Export as JSON" (produces DTCG-compatible JSON). Several plugins automate this:

- **TokensBrücke** ([figma.com/community/plugin/1254538877056388290](https://www.figma.com/community/plugin/1254538877056388290)) — exports variables as W3C DTCG JSON.
- **Design Tokens (W3C) Export** ([figma.com/community/plugin/1377982390646186215](https://www.figma.com/community/plugin/1377982390646186215)) — exports per-mode JSON files in a zip.
- **lukasoppermann/design-tokens** ([github.com/lukasoppermann/design-tokens](https://github.com/lukasoppermann/design-tokens)) — GitHub Action integration for CI-driven export.

---

## Programmatic extraction pattern (Enterprise)

```typescript
import fetch from 'node-fetch';

const FILE_KEY = 'abc123XYZ';
const TOKEN = process.env.FIGMA_ACCESS_TOKEN;

const response = await fetch(
  `https://api.figma.com/v1/files/${FILE_KEY}/variables/local`,
  { headers: { 'X-Figma-Token': TOKEN } }
);

const { meta } = await response.json();
// meta.variableCollections: { [id]: { name, modes, variableIds } }
// meta.variables: { [id]: { name, resolvedType, valuesByMode } }

// Extract COLOR variables
const colorVars = Object.values(meta.variables)
  .filter(v => v.resolvedType === 'COLOR')
  .map(v => ({
    name: v.name,   // e.g. "brand/primary"
    // valuesByMode[modeId] = { r, g, b, a } floats 0–1
    hex: rgbaToHex(v.valuesByMode[Object.keys(v.valuesByMode)[0]])
  }));
```

The `name` field uses Figma's slash-separated naming convention (`brand/primary`, `neutral/ink`), which maps directly to DTCG dot-notation (`color.brand.primary`) with a simple replace.

---

## DTCG transform pipeline

Once you have DTCG JSON (from the API or plugin export), **Style Dictionary** ([styledictionary.com](https://styledictionary.com)) transforms it to any output format. For brand bundle integration, define a custom platform:

> **Updated 2026-04-21:** Style Dictionary is now at **v5** (latest: 5.4.0, March 2026). v4 is the previous major version. v5 is ESM-native, browser-compatible out of the box, and adds async API support. Use `style-dictionary@latest` for new projects; migration guides from v4 → v5 are at [styledictionary.com/versions/v4/migration](https://styledictionary.com/versions/v4/migration/).

```js
// style-dictionary.config.mjs
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    'brand-bundle': {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{ destination: 'brand-bundle.resolved.json', format: 'json/nested' }]
    }
  }
};
```

Add `@tokens-studio/sd-transforms` for Figma-origin tokens that use math expressions, description fields, or Tokens Studio-specific syntax (current version: **2.0.3** as of Q1 2026):

```bash
npm install @tokens-studio/sd-transforms style-dictionary
```

The Tokens Studio plugin for Figma ([docs.tokens.studio](https://docs.tokens.studio)) is the most popular authoring tool for design tokens in Figma and supports two-way sync (Figma → GitHub → CI pipeline). It exports both legacy TS JSON and DTCG format.

---

## Mapping Figma output to BrandBundle fields

| Figma Variable | DTCG token | BrandBundle field |
|---|---|---|
| `COLOR: brand/primary` | `color.brand.primary.$value` | `primary_colors[0]` |
| `COLOR: neutral/ink` | `color.neutral.ink.$value` | TBD by semantic role |
| `STRING: font/display` | `typography.display.$value.fontFamily` | `display_font` |
| `FLOAT: font/weight/bold` | `typography.display.$value.fontWeight` | (fallback descriptor) |

Fields not in Figma Variables — `style_prose`, `prohibited_elements`, `style_references`, `loras`, `model_bindings` — must be authored manually or derived from the extraction paths in 29a. Figma Variables cover the token layer; the AI generation extension layer (`$extensions.ai.generation`) is always hand-authored.

---

## Figma → GitHub Actions CI pipeline

The official example repo ([github.com/figma/variables-github-action-example](https://github.com/figma/variables-github-action-example)) demonstrates syncing Figma variables to a GitHub repository on change. Combined with Style Dictionary, the pipeline becomes:

```
Figma variables change
  → GitHub Action triggers
  → fetch /variables/local
  → write DTCG JSON to repo
  → run Style Dictionary
  → write brand-bundle.resolved.json
  → open PR for human approval
  → merge → bump brand-bundle version → notify MCP server to reload
```

This gives design-system-level governance over brand bundle updates — changes to the primary color flow through a PR review before reaching the asset generation server.

---

## Caveats

- **Enterprise gating** is the biggest practical barrier. Teams on the Professional or Starter plan must use plugin-based manual export, which cannot be automated in CI.
- **Alias resolution:** Figma allows variable aliases (`brand/primary` → `{semantic/action/default}`). The REST API returns aliases as `VARIABLE_ALIAS` types; you must resolve them recursively before extracting hex values. `@serendie/figma-utils` handles this.
- **Typography coverage gap:** Full typography variables (weight, line-height, letter-spacing) require Figma Styles queries alongside Variables. Style Dictionary handles both sources in a single `source` glob.
- **Mode selection:** Export all modes, not just the default. The BrandBundle should carry `modes: { dark: { palette_overrides: {...} } }` for brands with dark-mode variants.

---

## References

- Figma Variables Plugin API — [developers.figma.com/docs/plugins/working-with-variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- Figma Variables REST API — [developers.figma.com/docs/rest-api/variables-endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- figma/variables-github-action-example — [github.com/figma/variables-github-action-example](https://github.com/figma/variables-github-action-example)
- Style Dictionary v5 (current) — [styledictionary.com](https://styledictionary.com/)
- @tokens-studio/sd-transforms — [github.com/tokens-studio/sd-transforms](https://github.com/tokens-studio/sd-transforms)
- lukasoppermann/design-tokens plugin — [github.com/lukasoppermann/design-tokens](https://github.com/lukasoppermann/design-tokens)
- DTCG Format Module 2025.10 — [designtokens.org/tr/drafts/format](https://www.designtokens.org/tr/drafts/format/)
- Nate Baldwin — Synchronizing Figma variables with Design Tokens — [medium.com/@NateBaldwin](https://medium.com/@NateBaldwin/synchronizing-figma-variables-with-design-tokens-3a6c6adbf7da)
