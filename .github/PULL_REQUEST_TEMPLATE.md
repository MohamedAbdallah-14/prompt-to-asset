<!--
Thanks for contributing. A few checks before you open this PR:

- If you edited a skill, rule, or plugin manifest, edit it in the SSOT location
  (skills/*/SKILL.md, rules/*.md, .claude-plugin/*) — NOT in a mirror under
  .cursor/, .windsurf/, .codex/, .clinerules/, or gemini-extension.json.
  Then run `npm run sync` and commit the regenerated mirrors in the same PR.
- Run `npm run typecheck && npm run lint && npm test && npm run verify` before pushing.
- Conventional Commits in the PR title help the changelog stay legible.
-->

## Summary

<!-- What does this PR change? One or two sentences. -->

## Motivation

<!-- Why is this change worth making? Link an issue, a research angle under
     docs/research/, or a concrete failure case. -->

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
