# Research Update Log — 22-repo-deep-dives (files 01–11)
**Agent:** 22a  
**Date:** 2026-04-21  
**Scope:** First 11 files alphabetically in `/docs/research/22-repo-deep-dives/`

---

## Summary of Changes

### 01-hunyuan-prompt-enhancer.md
- **Claim:** Stars listed as 3,667.
- **Finding:** Web search confirms ~3.7k stars (consistent, rounding artifact).
- **Action:** Table updated to `~3,700` with confirmation note. No material issues found. File is current and accurate. CVPR 2026 acceptance confirmed.

### 02-promptist.md
- **Claim:** `microsoft/LMOps` ~4.3k stars; Promptist HF Space paused; subfolder frozen since Dec 2022.
- **Finding:** All confirmed. LMOps sits at ~4.3k stars. Dependabot activity continues janitorial maintenance. NeurIPS 2023 Spotlight status accurate.
- **Action:** No edits needed. File is accurate.

### 03-nutlope-logocreator.md
- **Claim:** 6,956 stars / 676 forks as of 2026-04-19.
- **Finding:** Web search returns ~5.3k stars / ~474 forks in April 2026, suggesting the peak numbers have declined significantly (viral-launch dropoff pattern). The research file was written on the same date as the audit (2026-04-19), so the discrepancy likely reflects real decline between research and web-search observation, or web-search imprecision.
- **Action:** 
  - Added intro paragraph note about star count decline.
  - Updated metrics table to show `~5,300` with note about peak.
  - Last human commit confirmed January 2025; Vercel bot CVE bump December 2025 confirmed. License still `null`. Status: maintenance-mode confirmed.

### 04-shinpr-mcp-image.md
- **Claim:** ~100 stars, v0.10.0 latest, actively maintained.
- **Finding:** npm package last updated April 3, 2026. Actively maintained confirmed.
- **Action:** Added confirmation note. No stale claims.

### 05-logoloom.md
- **Claim:** v1.0.1, 7 stars, brand new (March 2026).
- **Finding:** Repo confirmed on Glama MCP directory. No evidence of additional releases beyond v1.0.1 in the ~1 month since publication.
- **Action:** Added brief status note. Decision unchanged.

### 06-arekhalpern-mcp-logo-gen.md
- **Claim:** ~13 months stale as of 2026-04-19 (last commit 2025-03-16). GPL-3.0.
- **Finding:** Confirmed via web search. No new commits, PRs, or forks. The repo continues to redirect through sshtunnelvision alias. Stale duration (~13 months) is correct for the research date.
- **Action:** Added confirmation note reinforcing stale status. Decision unchanged: do not adopt.

### 07-niels-oz-icon-mcp.md
- **Claim:** 1 GitHub star, silence since 2025-08-16, "effectively unmaintained."
- **Finding:** Confirmed ~8 months of silence as of April 2026. LobeHub listing dates visible from March 2026 but no new npm releases. v0.5.0 is still the latest.
- **Action:**
  - Added `> **Updated 2026-04-21**` block after metrics paragraph with classification **abandoned-beta**.
  - Updated inline reference "silence since 2025-08-16" to add parenthetical "(~8 months as of Apr 2026)".

### 08-appicon-forge.md
- **Claim:** 983 stars, last push 2025-07-09, ~9 months idle.
- **Finding:** ~9 months idle confirmed for April 2026 write date. Live instance at GitHub Pages confirmed operational. No new releases or forks taking over maintenance.
- **Action:** Added `> **Updated 2026-04-21**` block after metrics with **idle but functional** status. Missing SPDX/LICENSE concern noted as unresolved.

### 09-guillempuche-appicons.md
- **Claim:** 2 stars, 3-month-old project, pre-production; maintainer actively iterating.
- **Finding:** Web search confirms maintainer is still active as of April 2026. Repo touched 2026-04-12. Feature set (iOS 18 appearances, Android 13 monochrome, watchOS/tvOS/visionOS) remains unique in the OSS space.
- **Action:**
  - Added parenthetical clarification to last-updated date in table.
  - Added `> **Updated 2026-04-21**` block elevating this tool to **primary driver candidate** given capacitor-assets' 2+ year freeze (cross-reference with file 11 update).

### 10-pwa-asset-generator.md
- **Claim:** v8.1.4, 3,006 stars, 17.6k weekly downloads, actively maintained.
- **Finding:** All confirmed. v8.1.4 released 2026-03-14 (1 month ago). Active issue filed March 17, 2026. Stars ~3,006 confirmed.
- **Action:** Added confirmation note. No stale claims found. Status: **actively maintained** confirmed.

### 11-capacitor-assets.md
- **Critical issue found.** 
- **Claim:** v3.0.5 (29 Mar 2024); "quiet but not abandoned, with issues triaged through 2024." Weekly downloads ~263k.
- **Finding:** 
  - v3.0.5 (March 2024) is still the latest release — now **over 2 years old** with no new version.
  - Last GitHub commit to `main` was September 2024 (~19 months ago as of April 2026).
  - Weekly downloads revised: npm reports ~238k/week (down from ~263k cited in research).
  - The file's own framing "quiet but not abandoned" understates the staleness risk, particularly for iOS 18+ and Android 13+ requirements which the tool does not support.
- **Action:**
  - Updated weekly downloads figure from ~263k to ~238k in the opening paragraph.
  - Added prominent `> **Updated 2026-04-21**` block after the opening paragraph noting the 2+ year release freeze, September 2024 last commit, missing iOS 18/Android 13 coverage, and recommendation to pin at a commit SHA.
  - Added `> **Updated 2026-04-21**` block at the Decision section recommending elevation of `guillempuche/appicons` to primary if no new release by H2 2026.

---

## Stale Pattern Inventory

| Pattern | Files Affected | Action |
|---|---|---|
| Star counts not current | 01, 03 | Corrected with web-verified values and notes |
| "Quiet but not abandoned" understating a 2+ year freeze | 11 | Strong caveat added |
| Weekly download figure stale | 11 | Updated ~263k → ~238k |
| Single-week-of-activity projects described without elapsed-time context | 07 | Elapsed time made explicit (~8 months) |
| Active tools confirmed with no changes needed | 04, 10 | Confirmation notes added |
| Brand new tools need watch-status | 05, 09 | Status notes added |

---

## Gemini/Imagen Free API Note

No files in the 01–11 range contained claims about Gemini/Imagen free API tiers. That stale pattern was not encountered in this batch.

---

## Files NOT in Scope (deferred to 22b)

- `SYNTHESIS.md`
- `index.md`
- Files 12–20 (not in this agent's scope)
