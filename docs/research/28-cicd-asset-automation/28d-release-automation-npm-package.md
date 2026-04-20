# 28d — Release Automation for the NPM Package

## Context

`packages/mcp-server/package.json` defines `"name": "prompt-to-asset"` with
`"publishConfig": { "access": "public", "provenance": true }`. The package is a public
NPM package that also needs a matching entry in the MCP Registry (`server.json`) where
`version` must align with the npm version and be unique per publication.

## Changesets (recommended for monorepos)

The project is an npm workspace monorepo. Changesets (`changesets/changesets`) is the
dominant solution for monorepo release coordination, used by major projects including
Remix, SvelteKit, and Turborepo.

Workflow:
1. Contributors add a changeset file (`npx changeset add`) declaring the change type
   (patch/minor/major) and a one-line description.
2. On merge to main, `changesets/action@v1` opens a "Version Packages" PR that bumps
   `package.json` versions and aggregates `CHANGELOG.md`.
3. When the Version Packages PR merges, the action runs `pnpm run ci:publish` which
   executes `npm publish` (or `changeset publish`) for all packages with bumped versions.

Required permissions in the publish workflow:
```yaml
permissions:
  contents: write      # push version bump commits
  pull-requests: write # open the Version Packages PR
  id-token: write      # npm provenance via OIDC
```

Full workflow (`.github/workflows/release.yml`):
```yaml
name: release
on:
  push:
    branches: [main]
concurrency: ${{ github.workflow }}-${{ github.ref }}
jobs:
  release:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - uses: changesets/action@v1
        with:
          publish: npm run -w prompt-to-asset ci:publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `"ci:publish": "changeset publish"` to the mcp-server `package.json` scripts.

## npm Trusted Publishing (OIDC — no NPM_TOKEN needed)

As of npm CLI 11.5.1+ and Node 22.14+, npm supports OIDC-based trusted publishing.
You register a GitHub Actions workflow as a trusted publisher on npmjs.com, then publish
with `id-token: write` and no `NPM_TOKEN` secret. Provenance attestations are generated
automatically for public packages.

Caveats:
- Requires Node 22+ (project's `engines.node` is `>=20.11.0` — needs an explicit bump
  in the publish job step, not the package engine field).
- Only GitHub-hosted runners are supported; self-hosted runners do not work.
- The workflow filename configured on npmjs.com must match exactly (case-sensitive,
  including the `.yml` extension).
- `repository.url` in `package.json` must exactly match the GitHub repo URL.

## MCP Registry: keeping server.json in sync

The MCP Registry (`modelcontextprotocol.io/registry`) requires `server.json` to declare
a `version` that matches the npm package version and must be unique. Changesets handles
the npm version bump, but `server.json` must also be updated before publish.

Options:
1. Add a `preversion` or `prepublish` script that reads `package.json` and writes `server.json`.
2. Include `server.json` update in the changesets publish command via a custom script.
3. A separate GitHub Actions step post-publish that calls the MCP Registry API to submit
   the new version.

The MCP Registry prohibits version range strings (`^1.0.0`, `~1.2`, `>=1.0`). Use exact
semantic version strings only.

## semantic-release as an alternative

`semantic-release` fully automates versioning from conventional commit messages — no manual
changeset files. It supports npm provenance (`--provenance` flag) and GitHub releases.
Better fit for solo projects or teams that prefer commit-message-driven releases over
explicit changeset authoring. For a monorepo with a single publishable package, it is less
complex than changesets.

## Dependabot for model provider SDKs

Add `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /packages/mcp-server
    schedule:
      interval: weekly
    groups:
      ai-providers:
        patterns:
          - openai
          - "@anthropic-ai/*"
          - "@google-cloud/*"
          - ideogram-*
          - recraft-*
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

Grouping AI provider SDK updates into one PR prevents weekly noise from individual bumps.

## Caveats

- Do not enable 2FA-on-publish for the npm account used in CI — it blocks automated publish.
  Use granular access tokens (publish-only, scoped to the package) instead.
- The `provenance: true` in `publishConfig` requires `id-token: write` in the workflow.
  If that permission is absent, publish fails with an OIDC error, not a clear message.
- Changesets creates release PRs with `github-actions[bot]` as author. Branch protection
  rules that require human reviewers will block the auto-merge — configure a bypass for
  the bot or use `auto-merge` with status check gates.
