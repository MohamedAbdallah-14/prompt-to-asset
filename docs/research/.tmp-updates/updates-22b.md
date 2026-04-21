# Updates — Category 22 (second half: files 12–20 + SYNTHESIS + index)

Agent: 22b | Date: 2026-04-21

---

## Files edited (second-half scope)

### 12-npm-icon-gen.md
- **Status confirmed:** No new release since v5.0.0 (July 2024). Still in maintenance mode.
- **Weekly downloads:** Slipped from ~26.5k (Q1 2025) to ~15k (April 2026). Updated Decision section figure.
- **sharp dependency:** `sharp@0.34` bump issue still open and unresolved.
- Added `> **Updated 2026-04-21:**` block at end of Decision section with current download trend and risk note.

### 13-iconify.md
- **Icon count:** Updated from "275,000+" / "200+" sets to confirmed **291,749 icons across 209 sets** (auto-updated 3×/week; sourced from iconify/icon-sets GitHub description).
- **Activity:** Confirmed active commits through April 2026, including SolidJS and React SVG+CSS component updates (March 2026).
- Added `> **Updated 2026-04-21:**` block immediately after the Repo metrics opening paragraph.
- SYNTHESIS.md Repos Surveyed table row 13: updated icon count to 291,749 / 209 sets.

### 14-svgl.md
- **Status confirmed:** Actively maintained — issues opened March 19 and March 20, 2026.
- **Stars:** Stable at ~5.7k (no significant growth, no decay).
- **Logo count:** Growing beyond 400 via ongoing community PRs; exact total best confirmed via API index.
- **API/stack:** No breaking changes; Hono+Upstash+Svelte 5 unchanged.
- Added `> **Updated 2026-04-21:**` block after the "What it is" opening paragraph.

### 15-rembg.md
- **Latest release confirmed:** v2.0.75, April 8, 2026.
- **v2.0.73–v2.0.75 changes:** Maintenance only — removed unneeded `log_softmax()` calls, added CLI man page. No new models added.
- **BRIA RMBG 2.0 license:** CC BY-NC 4.0 unchanged — still a commercial landmine.
- **BiRefNet status:** Remains the best-quality MIT model in the catalog.
- Added `> **Updated 2026-04-21:**` block after the repo metrics bullet list.

### 16-vtracer.md
- **Version status confirmed:**
  - Rust crate: `vtracer@0.6.5` on crates.io
  - Python binding: `vtracer==0.6.15` on PyPI (published March 23, 2026)
  - wasm npm: `vtracer-wasm@0.1.0` unchanged
  - GitHub "latest release" tag: 0.6.4 (lags crates.io — known gap)
- **Recommendation:** Pin against crates.io/PyPI, not the GitHub tag.
- Added `> **Updated 2026-04-21:**` block immediately before the Decision paragraph.

### 17-comfyui-layerdiffuse.md
- **Status confirmed:** Frozen at 2025-02-25 commit through April 2026. No Flux support added.
- **Issue #121:** Still stale (Flux LayerDiffuse request). No activity.
- **Maintenance since freeze:** Locale updates and minor ComfyUI core API compatibility fixes only. Eight-node workflow JSON unchanged and stable.
- Existing `> **Updated 2026-04-21:**` block in the Known Issues section updated to confirm findings. Added new block in the Repo Metrics table section.

### 18-comfyui-easy-use.md
- **Latest release confirmed:** v1.3.6, January 23, 2026.
- **Last commit:** April 9, 2026 — actively maintained.
- **Stars:** ~2.5k confirmed.
- **LayerDiffusion:** Still SDXL/SD1.5 only in v1.3.6 — no Flux path added inside Easy-Use.
- **GPL-3.0:** Unchanged.
- **Compatibility regressions:** Resolved in v1.3.6 (v1.2.9/v1.3.2/v1.3.5 breakage fixed).
- Added `> **Updated 2026-04-21:**` block after the "Repo at a glance" bullets.

### 19-vercel-mcp-stack.md
- **mcp-handler version confirmed:** 1.1.0 (latest as of April 2026, last published ~March 2026).
- **Security note:** Issue #146 (npm audit report) filed against the package — added advisory to check `npm audit` before deploying.
- **`@vercel/mcp-adapter` deprecation:** Confirmed still deprecated on npm. `mcp-handler` remains canonical.
- **`@modelcontextprotocol/sdk@1.26.0` floor:** Unchanged.
- Updated existing `> **Updated 2026-04-21:**` block to expand with security advisory.

### 20-vercel-ai-sdk-image.md
- **Major finding:** Vercel AI SDK **v6** shipped December 22, 2025. Latest patch: `ai@6.0.162` (April 2026).
- **`experimental_generateImage` → `generateImage`:** Promoted to stable in v6. All call sites must update. Migration: `npx @ai-sdk/codemod v6`.
- **New v6 capabilities:** `ToolLoopAgent`, human-in-the-loop `needsApproval`, image-to-image editing with reference images, native MCP support, DevTools.
- **`ImageModelV2` contract:** Unchanged from v5 into v6.
- Updated version line in Repo Metrics section.
- Updated existing `> **Updated 2026-04-21:**` block with v6 details.
- Updated Decision section from "v5 `experimental_generateImage`" to "v6 `generateImage` (stable)".

---

## SYNTHESIS.md changes

- **Finding 12:** Updated from "Vercel AI SDK v5 `experimental_generateImage`" to "Vercel AI SDK v6 `generateImage` (stable as of Dec 22, 2025)"; added migration codemod note.
- **Repos Surveyed table row 13:** Updated icon count from "275k marks across 200+ sets" to "291,749 icons across 209 sets (Apr 2026)".
- **Repos Surveyed table row 20:** Updated from "v5 `generateImage`" / "Still `experimental_`" to "v6 `generateImage` (stable, Dec 2025)" / removed the `experimental_` weakness.
- **Recommendation 2:** Updated from "v5 `experimental_generateImage`" to "v6 `generateImage` (stable)"; added codemod migration note.

## index.md changes

- **Row 20:** Updated from "vercel/ai v5 `generateImage`" to "vercel/ai v6 `generateImage` (stable, Dec 2025)".

---

## Summary of key facts (as of 2026-04-21)

| Repo | Key finding |
|---|---|
| 12-npm-icon-gen | v5.0.0 still latest (Jul 2024); downloads declining ~15k/wk; sharp@0.34 bump unresolved |
| 13-iconify | 291,749 icons / 209 sets (up from 275k/200+); active commits Apr 2026 |
| 14-svgl | ~5.7k★; active; logo count >400 growing; API unchanged |
| 15-rembg | v2.0.75 confirmed Apr 8, 2026; v2.0.73-75 maintenance-only; BRIA license unchanged |
| 16-vtracer | Rust 0.6.5 / PyPI 0.6.15 (Mar 23 2026) / wasm 0.1.0; pin crates.io, not GitHub tag |
| 17-comfyui-layerdiffuse | Frozen Feb 2025; issue #121 still stale; Flux still unsupported |
| 18-comfyui-easy-use | v1.3.6 (Jan 2026); last commit Apr 9 2026; 2.5k★; GPL-3.0 unchanged |
| 19-vercel-mcp-stack | mcp-handler@1.1.0 confirmed latest; security issue #146 filed; API stable |
| 20-vercel-ai-sdk-image | **AI SDK v6 released Dec 22 2025**; `generateImage` now stable (was `experimental_`); latest `ai@6.0.162` |

## Context from agent 22a (carried forward, not re-audited)

- capacitor-assets: v3.0.5 March 2024, 2+ years stale, demoted to fallback
- pwa-asset-generator: v8.1.4 (March 2026, elegantapp/ org, ~3k★)
- nutlope/logocreator: ~5.3k★ (viral decay, no commits since Jan 2025)
- icon-generator-mcp: abandoned-beta (silent since Aug 2025)
- guillempuche/appicons: elevated to primary driver candidate
