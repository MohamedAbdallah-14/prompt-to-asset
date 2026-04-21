# 28a — GitHub Actions: Image Processing Pipeline Patterns

## Problem

prompt-to-asset generates PNGs, ICOs, SVGs, and platform-specific bundles. CI needs to
(a) exercise these pipelines on every PR, and (b) upload the outputs as reviewable artifacts
without relying on ad-hoc shell scripts that break across runners.

## Real-world reference: edataconsulting image asset workflow

The edataconsulting article (Medium, "Management of image assets with Github Actions") shows
a production pattern using:

1. `tj-actions/changed-files` to detect which source images actually changed — prevents
   regenerating the entire output tree on every commit.
2. `magick identify` (ImageMagick) for format and dimension validation before processing.
3. Conditional branching: images with an IPTC "sprite" keyword become PNG+alpha; everything
   else becomes JPEG. For prompt-to-asset the equivalent is: detect whether the requested
   asset type requires alpha, then route to the transparent-capable pipeline.
4. `montage` (ImageMagick) contact-sheet generation for the PR reviewer to see thumbnails
   inline without downloading individual files.
5. `actions/upload-artifact@v4` to persist outputs. Artifacts are immutable in v4 — you
   cannot re-upload to the same artifact name, so name them with the commit SHA or run ID.

## Docker / runner environment for sharp + Node

> **Updated 2026-04-21:** `ubuntu-latest` is now **Ubuntu 24.04** exclusively — the migration from 22.04 completed in October 2024 (GitHub Changelog 2024-09-25). The "22.04 / 24.04" description below is stale; pin to `ubuntu-24.04` for reproducibility, or accept that `ubuntu-latest` == 24.04 today. Sharp reached `0.34.x` (latest `0.34.5` as of Feb 2026) — the `^0.33.5` project pin should be bumped. Node.js 20 hits EOL on **April 30, 2026** — any CI job using `node-version: 20` should be updated to `node-version: 22` (LTS, supported until Apr 2027) or `node-version: 24` (current LTS as of Apr 2026). Python current stable is **3.13** (3.13.13 released Apr 2026); `python:3.12-slim` still works but is no longer the newest stable.

The project uses sharp (`^0.33.5`) as an optional dependency. Sharp links against libvips,
which is present on `ubuntu-latest` runners (Ubuntu 24.04 as of Oct 2024) but absent on
`macos-latest`. If you need a custom image, `nxcd/docker-nodejs-sharp-image` is the most
referenced base, though it pins an old Node (Carbon/8) — build a fresh one from
`node:22-slim` (or `node:24-slim`) and `apt-get install -y libvips-dev`. For rembg
(Python background removal), add a `python:3.13-slim`-based layer or use a multi-stage build.

Sharp's own CI (`lovell/sharp` GitHub Actions) uses `ubuntu-latest` with stock Node setup
via `actions/setup-node` — that is sufficient for the project's build without a custom image.

## Artifact upload: v4 API (v3 retired January 2025)

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: generated-assets-${{ github.sha }}
    path: |
      output/
      !output/**/*.tmp
    retention-days: 7
```

Key v4 changes: uploads are ~90% faster; artifacts are immutable (no same-name re-upload
within a run without `overwrite: true`). The `retention-days` field defaults to 90 —
set it lower for PR preview artifacts to avoid storage costs.

## Path filtering to avoid unnecessary runs

Use `dorny/paths-filter@v4` inside the job to skip expensive generation steps when only
docs or tests changed:

```yaml
- uses: dorny/paths-filter@v4
  id: filter
  with:
    filters: |
      brand:
        - 'data/brand/**'
        - 'packages/mcp-server/src/**'
```

Then `if: steps.filter.outputs.brand == 'true'` gates the generation job.

## Caveats

- `ubuntu-latest` is Ubuntu 24.04 as of October 2024. Pin to `ubuntu-24.04` for full
  reproducibility (the label will eventually move to Ubuntu 26.04 once it is GA).
- Artifact downloads in fork PRs require `pull_request_target` with careful trust scoping.
- ImageMagick is not in the project's dependency graph; sharp + satori cover the same surface.
  Stick to what's already declared in `packages/mcp-server/package.json` rather than adding
  a new system dep.
- **Node.js 20 EOL is April 30, 2026.** Workflows that pin `node-version: 20` should migrate
  to `node-version: 22` or `node-version: 24` before that date.
