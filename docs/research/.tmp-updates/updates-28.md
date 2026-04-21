# Research 28 — CI/CD Asset Automation: Update Log
Date: 2026-04-21

## Files modified

### 28a-github-actions-image-pipeline.md

**Stale claim corrected:** "ubuntu-latest runners (22.04 / 24.04)"
- `ubuntu-latest` is Ubuntu 24.04 exclusively since October 2024 (the 22.04/24.04 dual description is no longer accurate).
- Source: GitHub Changelog 2024-09-25 "Actions: new images and ubuntu-latest changes"

**Stale claim corrected:** Sharp version `^0.33.5` referenced as if current
- Sharp current version is `0.34.x` (0.34.5 as of Feb 2026). Project pin should be reviewed.

**New caveat added:** Node.js 20 EOL April 30, 2026
- Any workflow pinning `node-version: 20` should migrate to Node 22 (LTS until Apr 2027) or Node 24 (current LTS).

**Docker base images updated in text:** `node:20-slim` → `node:22-slim` or `node:24-slim`; `python:3.12-slim` → `python:3.13-slim`.

---

### 28b-pr-preview-asset-generation.md

**Stale claim corrected:** Workflow example used `actions/setup-node@v4`
- Current latest major is **v6**. Updated to `actions/setup-node@v6`.

**Stale claim corrected:** Workflow example used `node-version: 20`
- Node 20 EOL April 30, 2026. Updated to `node-version: 22`.

Added dated note above the workflow skeleton explaining the changes.

---

### 28c-mcp-server-testing-patterns.md

**Stale claim corrected:** Workflow example used `actions/setup-node@v4`
- Updated to `actions/setup-node@v6`.

**Stale claim corrected:** Workflow example used `node-version: 20`
- Updated to `node-version: 22`.

Added dated note above the workflow skeleton.

---

### 28d-release-automation-npm-package.md

**Stale claim corrected:** Release workflow example used `actions/setup-node@v4` and `node-version: 20`
- Updated to `actions/setup-node@v6` and `node-version: 22`.

**Stale claim corrected:** npm OIDC trusted publishing described as "As of npm CLI 11.5.1+..." without noting it is now GA.
- npm OIDC trusted publishing is **generally available as of July 2025**.
- Clarified that Node 22.14.0 is the minimum for the trusted publishing feature (npm 11 itself can run on ^20.17.0, but trusted publishing needs Node 22.14+).
- Node 20 EOL makes the project's `engines.node: ">=20.11.0"` actively misleading — flagged.

Added dated note above the release workflow YAML block.

---

### SYNTHESIS.md

- Updated snapshot date from 2026-04-20 to 2026-04-21.
- Added `Updated 2026-04-21` block under "What works today" summarizing all version hygiene corrections:
  - `actions/setup-node` latest is v6 (not v4)
  - `ubuntu-latest` = Ubuntu 24.04 since Oct 2024
  - Node.js 20 EOL Apr 30, 2026
  - Python current stable = 3.13
  - Sharp current = 0.34.x
  - Cloudflare Workers AI free tier = 10,000 neurons/day (confirmed unchanged)
  - npm OIDC trusted publishing GA July 2025; Node ≥ 22.14.0 required
- Updated item 3 in "What needs decisions" to reflect npm OIDC GA status and Node 20 EOL urgency.

---

## Claims verified as still accurate

| Claim | Verified |
|---|---|
| `actions/upload-artifact@v4` (v3 retired Jan 2025) | Correct — v4 is current; v5 is the latest but v4 still works |
| `actions/checkout@v4` | Still current major version (v4.x); no v5 yet |
| `dorny/paths-filter@v4` | v4 is current |
| `changesets/action@v1` | v1 remains the recommended version |
| Cloudflare Workers AI free = 10k neurons/day | Confirmed |
| `aws-actions/configure-aws-credentials@v4` | Still current |
| Infisical OIDC pattern | Still valid |
| `actions/cache@v4` mentioned implicitly (setup-node caches) | `actions/cache` is at v5; but setup-node handles caching internally so this is not a direct reference |
| npm provenance via `publishConfig.provenance: true` | Still valid |

## Claims NOT in these files (no Gemini/image-API free tier claims found)

The "Gemini free image API" anti-pattern was not present in this research category. No corrections needed for that specific stale pattern here.

## Actions versions reference (as of 2026-04-21)

| Action | Previously cited | Current latest major |
|---|---|---|
| `actions/checkout` | v4 | v4 (still current) |
| `actions/setup-node` | v4 | **v6** |
| `actions/cache` | implicit via setup-node | v5 standalone; setup-node@v6 uses v5 internally |
| `actions/upload-artifact` | v4 | v4 (still current) |
| `changesets/action` | v1 | v1 (still current) |
| `dorny/paths-filter` | v4 | v4 (still current) |

## Node.js versions reference (as of 2026-04-21)

| Version | Status |
|---|---|
| Node 18 | EOL Apr 2025 |
| Node 20 | **EOL April 30, 2026** |
| Node 22 | Active LTS, supported until Apr 2027 |
| Node 24 | Current LTS (released Apr 2026) |
