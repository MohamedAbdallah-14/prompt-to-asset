# Research Update Log — Category 24 (Skills for P2A)

**Date:** 2026-04-21
**Auditor:** Claude (claude-sonnet-4-6)
**Files audited:** 10 (01–08, index.md, SYNTHESIS.md)
**Files modified:** 9 (all except 01-frontend-design-analysis.md which had no stale facts)

---

## Summary of Corrections

| # | Correction | Stale claim | Verified current fact | Files updated |
|---|---|---|---|---|
| 1 | DALL-E 3 deprecation | Still active | **Retiring May 12, 2026.** Migrate to `gpt-image-1.5` (released Dec 2025, 20% cheaper than gpt-image-1, stronger brand logo preservation in edits). DALL-E 3 removed from ChatGPT Dec 2025 without warning. | 03, 04, 06, 07, 08, SYNTHESIS |
| 2 | Recraft V3 → V4 | "Recraft V3 (Highest fidelity)", controls API | **Recraft V4** released February 2026. V3 superseded. V4 ships four variants: V4 (raster, ~10s), V4 Vector (native SVG, ~15s), V4 Pro (2048², ~30s), V4 Pro Vector (high-res SVG, ~45s). Recraft confirmed as only AI model producing real editable SVG paths. controls.colors API largely compatible with V4. | 02, 03, 05, 06, 07, 08, SYNTHESIS |
| 3 | Ideogram transparency endpoint | `style: "transparent"` param on standard generate endpoint | **Dedicated endpoint `/ideogram-v3/generate-transparent`** (POST). This is a separate endpoint, not a parameter on the standard `/ideogram-v3/generate` endpoint. Output is PNG with alpha channel. Available on fal.ai and Ideogram's own API. | 03, 04, 06, 07, SYNTHESIS |
| 4 | Midjourney V7 → V8 | "V7, no official API, enterprise application required" | **V8 Alpha launched March 17, 2026.** 5× faster, native 2K resolution, significantly improved text rendering, text-to-video (up to 10s at 60fps). V8.1 Alpha current. Still **no official public API** (no REST endpoint, SDK, or API key system). No enterprise API release date confirmed. V8 sref codes differ from V6/V7 — regenerate style bundles. | 03, 05, 07, 08, SYNTHESIS |
| 5 | Claude model naming | claude-2/3.x era references, "Claude Opus 4.1" | **Claude 4.0-series** (claude-sonnet-4-20250514, claude-opus-4-20250514) **retires June 15, 2026.** Current models: claude-sonnet-4-6, claude-opus-4-6 (released February 2026). Tier 2 VLM rubric calls must use claude-sonnet-4-6 going forward. | 02, 05, 06, SYNTHESIS |
| 6 | Gemini image free tier | "~1,500 images/day free", "Nano Banana free API tier" | **No free image API tier** since Dec 2025. The partial restoration (~500 RPD as of Feb 2026) applies to text/multimodal only; image generation endpoints remain paid ($0.039/img Nano Banana, $0.134/img Nano Banana Pro, $0.02/img Imagen 4 Fast). AI Studio web UI (https://aistudio.google.com) is still free for interactive generation — use `external_prompt_only` + `asset_ingest_external` for that flow. | 03, 04, 07, SYNTHESIS |
| 7 | MCP spec version | Unspecified or earlier versions | **MCP 2025-11-25 is Latest Stable** (released November 25, 2025, MCP's first anniversary). Key features: async Tasks, OpenID Connect Discovery, incremental scope consent, extension framework. Backward compatible. No breaking changes to tool schemas. | 04, SYNTHESIS |
| 8 | SKILL.md cross-IDE portability | Claude Code only | **SKILL.md is an open cross-IDE standard.** Works in Claude Code, Cursor (`.cursor/rules/`), Windsurf (`.windsurf/rules/`), Gemini CLI (`GEMINI.md`), OpenAI Codex CLI. Only the destination folder path differs. Keep SKILL.md under 500 lines; only `name` and `description` frontmatter are loaded initially. | 04, 08, SYNTHESIS |
| 9 | gpt-image-1.5 | Not mentioned or "future" | **gpt-image-1.5 released December 2025.** Now current OpenAI image model. 20% cheaper per image than gpt-image-1. Stronger brand logo preservation and consistent preservation of branded visuals across edits. Text ceiling similar to gpt-image-1 (~30 chars). | 03, 04, SYNTHESIS |

---

## File-by-File Changes

### `01-frontend-design-analysis.md`
**No changes.** Content is conceptual analysis of the frontend-design skill's applicability to SVG authoring. No model versions, API endpoints, or pricing referenced. Content remains accurate.

### `02-svg-authoring-skill-design.md`
- **Appendix:** Updated cost table. "Claude 4 / GPT-5" → "Claude 4.6 / gpt-image-1.5 era LLM". Added note that Claude 4.0-series retires June 15, 2026 (→ claude-*-4-6).
- **Appendix:** Updated Recraft section. "Recraft V4 SVG" entry now has accurate timing for V4 Pro Vector (~45s), confirms V3 is superseded.
- **References:** Fixed "Claude Opus 4.1" → "Claude Opus 4.6". Added update note.

### `03-t2i-prompt-dialect-skill.md`
- **§1.5 Midjourney:** Updated V7 → V7/V8. V8 Alpha launched March 17, 2026. Confirmed still no official public API. V8 sref code migration note. Improved text rendering detail.
- **§1.6 Ideogram:** Added transparency endpoint correction. Dedicated `/ideogram-v3/generate-transparent` endpoint is NOT `style: "transparent"` param. Code example updated.
- **§1.7 Recraft:** Updated V3 → V4. All four V4 variants named and timed. "Only AI model producing real editable SVG paths" confirmation.
- **§5 Text-in-image table:** Added Midjourney v8 Alpha row. Updated note about gpt-image-1.5 (released Dec 2025). Added DALL-E 3 deprecation callout box.

### `04-mcp-api-integration-skill.md`
- **Mode selection ranking diagram:** Updated `g) Midjourney (paid)` → `g) Midjourney v8 (paid) [no official API; web UI only]`. Updated API tier list: `gpt-image-1.5` as primary, DALL-E 3 retirement noted, Recraft V4/V4 Vector, Gemini corrected to "paid only; no free image tier".
- **Error handling / soft fallback:** Updated Ideogram transparency reference from `style:"transparent"` to dedicated `/ideogram-v3/generate-transparent` endpoint.
- **Free-route diagram:** Replaced `Gemini free tier? (~1500/day)` with accurate note that Gemini image API has no free tier; AI Studio web UI is free (interactive only).
- **References section:** Added MCP spec 2025-11-25 confirmation and SKILL.md cross-IDE portability note.

### `05-brand-consistency-skill.md`
- **Palette enforcement — Recraft:** Section renamed "Recraft V4 (Current — V3 superseded)". Added update note. controls.colors API confirmed V4 compatible.
- **Palette enforcement — Midjourney:** Section updated to "V7/V8". V8 sref migration note added. No official public API confirmed. `external_prompt_only` is the only valid P2A path.
- **Tier 2 VLM:** `Claude Sonnet` → `claude-sonnet-4-6`. Added retirement note for claude-sonnet-4-20250514 (June 15, 2026).

### `06-validation-debug-skill.md`
- **Header block:** Added update callout covering DALL-E 3 retirement, Ideogram endpoint fix, Recraft V4, claude-sonnet-4-6, MCP spec 2025-11-25.
- **Tier 2 table:** `Claude Sonnet rubric score` → `claude-sonnet-4-6 rubric score`.

### `07-gap-analysis.md`
- **Existing status update block:** Extended to add DALL-E 3 retirement, Recraft V3→V4, Ideogram endpoint fix, Midjourney V8, Claude model retirements, MCP spec, SKILL.md portability.
- **Free-route detection section:** Nano Banana entry clarified. The "~1,500 images/day free" quota is withdrawn. The partial ~500 RPD restoration applies to text/multimodal only; image generation remains paid.

### `08-marketplace-survey.md`
- **Header:** Added cross-IDE portability update for SKILL.md (Claude Code, Cursor, Windsurf, Gemini CLI, Codex CLI).
- **context7 use cases:** Updated specific query examples to reference gpt-image-1.5 (not gpt-image-1), Recraft V4 (not V3), and Ideogram `/ideogram-v3/generate-transparent` endpoint.

### `SYNTHESIS.md`
- **Header:** Added corrections table covering all 8 changes (DALL-E 3, Recraft V4, Ideogram endpoint, Midjourney V8, Claude models, Gemini free tier, MCP spec, SKILL.md portability).
- **t2i-prompt-dialect capabilities bullet:** Updated provider list to gpt-image-1.5, Midjourney v8, Recraft V4.

### `index.md`
- **Header:** Added audit note summarizing all corrections with pointer to SYNTHESIS.md corrections table.

---

## Verification Sources

- Recraft V4: https://www.recraft.ai/blog/introducing-recraft-v4-design-taste-meets-image-generation
- Recraft V4 Pro SVG on Replicate: https://replicate.com/recraft-ai/recraft-v4-pro-svg
- Ideogram v3 transparent endpoint: https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3
- DALL-E 3 deprecation: https://community.openai.com/t/deprecation-reminder-dall-e-will-be-shut-down-on-may-12-2026/1378754
- DALL-E 3 → OpenAI deprecations page: https://platform.openai.com/docs/deprecations
- gpt-image-1.5 release: https://platform.openai.com/docs/models/gpt-image-1.5
- Claude 4.0-series retirement: https://dev.to/raxxostudios/claude-opus-4-and-sonnet-4-retire-june-15-2iog
- Anthropic model deprecations: https://platform.claude.com/docs/en/about-claude/model-deprecations
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- Midjourney V8 Alpha: https://updates.midjourney.com/v8-alpha/
- SKILL.md cross-IDE standard: https://www.agensi.io/learn/claude-code-skills-vs-cursor-rules-vs-codex-skills
- Flux.2 no negative prompt: https://docs.bfl.ml/guides/prompting_guide_flux2
