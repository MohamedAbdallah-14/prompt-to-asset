<!--
Thanks for contributing. A few checks before you open this PR:

- If you edited a skill, rule, or plugin manifest, edit it in the SSOT location
  (skills/*/SKILL.md, rules/*.md, .claude-plugin/*) — NOT in a mirror under
  .cursor/, .windsurf/, .codex/, .clinerules/, or gemini-extension.json.
  Then run `npm run sync` and commit the regenerated mirrors in the same PR.
- The husky pre-push hook runs lint + typecheck + tests + evals locally.
  If it blocks you mid-emergency, HUSKY=0 git push bypasses it.
- Use [Conventional Commits](https://www.conventionalcommits.org/) in the
  PR title. Scope examples: `feat(providers):`, `fix(cli):`, `docs(readme):`.
-->

## Summary

<!-- What does this PR change? One or two sentences. -->

## Motivation

<!-- Why is this change worth making? Link an issue, a research angle under
     docs/research/, or a concrete failure case. -->

## Breaking change?

- [ ] Yes — this PR breaks a public API (MCP tool surface, CLI flag, env var,
      file layout, or schema). Explain the migration path below.
- [ ] No — backwards-compatible.

<!-- If yes: who's affected, and what do they need to change? -->

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test:run` passes
- [ ] `npm run verify` passes (mirrors in sync, no drift)
- [ ] `node evals/scripts/run.mjs --check` passes (routing/clarifying-question regression gate; skip if docs-only)
- [ ] `node packages/mcp-server/dist/index.js doctor --data` exits 0 (registry ↔ routing-table consistency)
- [ ] Updated `CHANGELOG.md` under `[Unreleased]` if this is user-visible
- [ ] Updated docs / research pointers where relevant
- [ ] If this adds or changes an MCP tool, the schema in
      `packages/mcp-server/src/schemas.ts` is also updated
- [ ] If this adds or changes a provider, `data/model-registry.json` and
      `data/routing-table.json` reflect the new capability matrix
- [ ] If this changes routing behaviour intentionally, also run
      `node evals/scripts/run.mjs --baseline` and commit the updated
      `evals/snapshots/baseline.json` in the same PR

## Test plan

<!-- Commands you ran, or cases a reviewer should spot-check. -->
