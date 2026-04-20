# 28b — PR Preview: Auto-Generate and Comment Asset Previews

## Goal

When a PR touches brand data (`data/brand/**`), provider routing logic
(`packages/mcp-server/src/router.ts`), or the SVG-brief templates
(`packages/mcp-server/src/svg-briefs.ts`), CI should regenerate the canonical
sample assets and post thumbnail links in the PR comment so reviewers can see
visual impact without checking out the branch.

## Detection: dorny/paths-filter

`dorny/paths-filter@v4` is the standard for per-file-group conditional jobs. It queries
the GitHub REST API for changed files in a PR rather than running a full diff, so it works
correctly on shallow checkouts.

```yaml
- uses: dorny/paths-filter@v4
  id: changed
  with:
    filters: |
      brand:
        - 'data/brand/**'
        - 'packages/mcp-server/src/svg-briefs.ts'
        - 'packages/mcp-server/src/router.ts'
        - 'packages/mcp-server/src/rewriter.ts'
```

## Generation job

After detection, a separate job runs only when `changed.outputs.brand == 'true'`:

1. Install deps (`npm ci`), build (`npm run build`), run the smoke script
   (`node packages/mcp-server/dist/smoke.js`) to emit sample assets to `preview-out/`.
2. Optionally, run `npm run test:run -- --reporter=dot` to gate on correctness before
   uploading previews that reviewers might trust.
3. Upload the preview directory as an artifact named `preview-${{ github.event.pull_request.number }}`.

## Posting links to the PR comment

There are two solid approaches:

**Option A — gavv/pull-request-artifacts@v2**
Uploads files to a companion repo branch and posts a table comment with download links.
Minimal config, no external hosting needed. Caveat: cannot upload to protected branches,
so you need an unprotected `artifacts` branch.

```yaml
- uses: gavv/pull-request-artifacts@v2
  with:
    commit: ${{ github.event.pull_request.head.sha }}
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    artifacts: |
      preview-out/logo/master.svg
      preview-out/favicon/favicon.ico
      preview-out/app-icon/ios/AppIcon-1024.png
```

**Option B — opengisch/comment-pr-with-images**
Uploads images to Imgur (or a GitHub branch) and embeds them inline in the PR comment.
Requires an Imgur client ID or tolerating the branch-push approach. Better for visual
review since the image renders in the comment body rather than as a download link.

**Option C — live-codes/pr-comment-from-artifact**
Two-workflow approach: the generation workflow uploads an artifact; a second workflow
triggered by `workflow_run` reads the artifact and posts the comment. Cleanly separates
permissions — generation runs with write-none, commenting runs with `pull-requests: write`.
This is the safest pattern for repos that accept PRs from forks.

## Trigger: pull_request vs pull_request_target

For repos that accept external PRs, `pull_request` workflows do not have write permission
and cannot post comments. Use `pull_request_target` (runs in the context of the base branch,
not the head) but be careful: never check out PR code and run it in `pull_request_target`
without explicit trust checks, as it grants secrets access to the base repo.

The two-workflow split (Option C above) avoids this entirely: generation uses `pull_request`
with no permissions, commenting uses `workflow_run` with `pull-requests: write`.

## Sample workflow skeleton

```yaml
name: pr-asset-preview
on:
  pull_request:
    branches: [main]

jobs:
  detect:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    outputs:
      brand: ${{ steps.f.outputs.brand }}
    steps:
      - uses: dorny/paths-filter@v4
        id: f
        with:
          filters: |
            brand:
              - 'data/brand/**'
              - 'packages/mcp-server/src/svg-briefs.ts'

  preview:
    needs: detect
    if: needs.detect.outputs.brand == 'true'
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: node packages/mcp-server/dist/smoke.js
      - uses: actions/upload-artifact@v4
        with:
          name: preview-${{ github.event.pull_request.number }}
          path: preview-out/
          retention-days: 7
```

## Caveats

- Artifact links in PR comments expire after `retention-days` — use 30 days minimum if
  the PR could sit for a while.
- Inline image rendering in GitHub PR comments requires public URLs. Artifact download links
  require authentication and do not embed as images.
- The smoke script (`packages/mcp-server/src/smoke.ts`) needs to write to a predictable
  output directory and exit 0 on success for this flow to be reliable.
