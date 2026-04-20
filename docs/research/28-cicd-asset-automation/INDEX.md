# Research 28 — CI/CD and GitHub Actions for AI Asset Generation Pipelines

Research date: 2026-04-20
Project: prompt-to-asset (MCP server monorepo, npm package `prompt-to-asset`)

## Files

| File | Topic | Priority |
|---|---|---|
| [28a](./28a-github-actions-image-pipeline.md) | GitHub Actions image processing: artifact upload v4, sharp/libvips runner setup, path filtering | High |
| [28b](./28b-pr-preview-asset-generation.md) | PR preview asset generation: dorny/paths-filter, comment-with-images, two-workflow fork-safe pattern | High |
| [28c](./28c-mcp-server-testing-patterns.md) | MCP server testing: in-memory SDK transport, mcp-testing-kit, vitest-image-snapshot, mock API servers | High |
| [28d](./28d-release-automation-npm-package.md) | Release automation: changesets monorepo flow, npm OIDC trusted publishing, MCP Registry server.json sync, Dependabot grouping | Medium |
| [28e](./28e-secrets-oidc-provider-keys.md) | Secrets management: GitHub Secrets vs Infisical OIDC, mock-openai-api for keyless CI, fork PR security boundary | High |

## Key findings

### What works today without any new tooling

- `actions/upload-artifact@v4` (v3 retired Jan 2025) handles PNG/SVG/ICO artifact upload
  from any step that produces files.
- `dorny/paths-filter@v4` scopes generation jobs to PRs that touch brand or pipeline files,
  preventing unnecessary API spend.
- The existing Vitest setup (`vitest.config.ts`) can host MCP in-memory SDK tests with no
  config changes — just add test files matching `packages/mcp-server/src/**/*.test.ts`.

### What needs decisions before implementation

1. **Secrets tier**: use GitHub Secrets + environment approval gates (simple) or Infisical
   OIDC (zero static secrets, operational overhead). The project's `.env.example` and
   `SECURITY.md` already acknowledge the key structure — the CI tier is the missing piece.

2. **Release automation**: changesets vs semantic-release. Changesets is better for a
   monorepo where contributors need to document what changed. Semantic-release is simpler
   for a single-package project with disciplined conventional commits. Currently `version`
   is `0.1.0` in both root and mcp-server `package.json` — changesets setup is straightforward.

3. **npm OIDC trusted publishing**: requires Node 22+ in the publish job (the package
   engine spec allows 20+, so bump only the CI job's Node version). The `publishConfig.provenance: true`
   field is already set — this is half of what's needed.

4. **MCP Registry server.json**: not present in the repo yet. Needs to be created and kept
   in sync with the npm version on every release.

5. **PR preview rendering**: inline image embedding in GitHub PR comments requires a public
   URL (Imgur, GitHub branch). Artifact download links render as text, not images. The
   two-workflow pattern (Option C in 28b) is the right default for a public repo.

## External references

- [actions/upload-artifact v4](https://github.com/actions/upload-artifact)
- [dorny/paths-filter](https://github.com/dorny/paths-filter)
- [gavv/pull-request-artifacts](https://github.com/gavv/pull-request-artifacts)
- [opengisch/comment-pr-with-images](https://github.com/opengisch/comment-pr-with-images)
- [mkusaka/mcp-server-e2e-testing-example](https://github.com/mkusaka/mcp-server-e2e-testing-example)
- [thoughtspot/mcp-testing-kit](https://github.com/thoughtspot/mcp-testing-kit)
- [fdendorfer/vitest-image-snapshot](https://github.com/fdendorfer/vitest-image-snapshot)
- [changesets/action](https://github.com/changesets/action)
- [npm trusted publishing docs](https://docs.npmjs.com/trusted-publishers/)
- [MCP Registry versioning](https://modelcontextprotocol.io/registry/versioning)
- [Infisical GitHub Actions](https://infisical.com/docs/integrations/cicd/githubactions)
- [zerob13/mock-openai-api](https://github.com/zerob13/mock-openai-api)
