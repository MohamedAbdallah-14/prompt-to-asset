# Contributing

Thanks for wanting to contribute. Quick orientation:

## SSOT layout

Everything IDE-specific (`.cursor/`, `.claude/`, `.windsurf/`, `.clinerules/`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.vscode/mcp.json`) is **generated**. Do not edit those files directly.

Edit the source of truth:

- Behavior specs: `skills/<name>/SKILL.md`
- Always-on rule body: `rules/asset-enhancer-activate.md`
- MCP server: `packages/mcp-server/src/`
- Model routing data: `data/routing-table.json`, `data/model-registry.json`

Then run:

```bash
npm run sync     # regenerate all mirrors
npm run verify   # byte-verify mirrors match
```

CI runs `npm run verify` and fails on drift.

## Adding a new provider

1. Drop a new adapter in `packages/mcp-server/src/providers/<name>.ts` implementing the `Provider` interface in `src/providers/types.ts`.
2. Register it in `src/providers/index.ts`.
3. Add capability rows to `data/model-registry.json`.
4. Add routing rules to `data/routing-table.json`.
5. Add dialect rules to `src/rewriter.ts`.
6. If the provider introduces new failure modes, add a validator to `src/pipeline/validate.ts`.

## Adding a new asset type

1. Extend the `AssetType` enum in `src/schemas.ts`.
2. Add a skill file at `skills/<asset-type>/SKILL.md` with the asset's spec (dimensions, transparency, safe zone, validators).
3. Add routing entries in `data/routing-table.json`.
4. Add a tool in `src/tools/generate-<asset-type>.ts` (or extend an existing one).
5. Add platform exporters in `src/pipeline/export.ts` if new format emitters are needed.
6. Run `npm run sync`.

## Research changes

Research lives in `docs/research/`. Individual angle files at `docs/research/{NN}-category/{NN}{a-e}-angle.md`. Category synthesis at `INDEX.md`. Master synthesis at `SYNTHESIS.md`. When research changes, re-run the master synthesizer to regenerate `SYNTHESIS.md` + `index.json`, then update any routing/skill content that depended on the changed claim.

## Commit style

Conventional commits. `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
