# Research Update Log — Category 19 (Agentic, MCP, Skills Architectures)
**Date:** 2026-04-21  
**Auditor:** research-updater agent

---

## Summary

Five files audited and updated in `/docs/research/19-agentic-mcp-skills-architectures/`. Three high-priority outdated claims corrected, one outdated claim in the model capability matrix corrected, one structural omission corrected in 19b.

---

## Changes Made

### 1. MCP spec `2025-11-25` was labeled "draft" — it is now Latest Stable

**Files:** `19b-mcp-server-design-for-asset-gen.md`, `SYNTHESIS.md`

**Claim before:** The research listed `2025-11-25` as "Draft" and `2025-06-18` as "Current stable." It recommended negotiating `2025-06-18` as minimum and accepting `2025-11-25` when offered.

**Fact:** The `2025-11-25` spec was released as the "Latest Stable" on November 25, 2025 (MCP's first anniversary). `2025-06-18` remains "Stable" but is no longer the latest. There is no publicly announced post-`2025-11-25` draft as of April 2026.

**Key additions in 2025-11-25:** async Tasks primitive (call-now, fetch-later), OpenID Connect Discovery, tool/resource/prompt icon metadata, incremental scope consent, elicitation URL mode, sampling tool-calling, OAuth Client ID metadata documents, formalized extension capability negotiation.

**Edits:**
- `19b` §1.2 version table: updated `2025-11-25` row label from "Draft" to "Latest Stable"; revised `2025-06-18` to "Stable (prior stable)".
- `19b` §1.2 design target: flipped — now target `2025-11-25` as minimum, accept `2025-06-18` as fallback.
- `19b` §8 recommendation 7: updated version target.
- `19b` references: updated label "(draft)" → "(Latest Stable, released Nov 25 2025)".
- `SYNTHESIS.md` insight 4: added dated correction note.
- `SYNTHESIS.md` recommendations §4: added `2025-11-25` target.
- `SYNTHESIS.md` primary sources: updated label.

---

### 2. Gemini CLI "has no lifecycle hooks" — now has full hooks system (v0.26.0+)

**Files:** `19a-claude-skills-cursor-rules-formats.md`, `19b-mcp-server-design-for-asset-gen.md`, `19c-gemini-codex-copilot-integration.md`, `19e-cross-ide-plugin-packaging.md`, `SYNTHESIS.md`

**Claim before:** Multiple files stated "Gemini CLI has no lifecycle hooks" or "Windsurf, Cline, and Gemini CLI have no lifecycle hooks." The SYNTHESIS.md Gaps section listed this as an open gap requiring upstream contribution. The compatibility matrices showed Gemini CLI as hookless.

**Fact:** Gemini CLI shipped a full hooks system (GA in v0.26.0+). Extensions can bundle hooks via a `hooks/hooks.json` file inside the extension directory (PR #14460 merged). Supported hook events include `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeTool`, `AfterTool`, `Notification`, `PreCompress`, and `BeforeToolSelection`. Extension hooks require explicit user consent (security warning on install). There is no exact `UserPromptSubmit` equivalent — `BeforeModel` is the closest substitute for turn-level re-checking.

**Edits:**
- `19a` executive summary item 3: expanded to note Gemini CLI now has hooks; updated compatibility matrix rows for SessionStart, UserPromptSubmit, PreToolUse/PostToolUse; updated "practical takeaways" to reflect three hook-capable surfaces.
- `19a` hooks section body: added dated note about Gemini CLI hook support; updated "Windsurf, Cline, and Gemini CLI have no lifecycle hooks" to correctly say only Windsurf and Cline lack hooks.
- `19b` §6.4: corrected "Gemini CLI does not natively speak MCP yet; bridge via small adapter" — Gemini CLI has had native MCP support since early releases; the adapter claim was already stale.
- `19c` per-agent matrix: added "Lifecycle hooks" row to the matrix.
- `19c` agent quirks §Gemini: added dated correction note.
- `19e` installer section: added dated note that Gemini CLI extensions can now bundle hooks via `hooks/hooks.json`; added step 4a to the port checklist.
- `SYNTHESIS.md` insight 7: updated from "only Claude + Codex have hooks" to include Gemini CLI.
- `SYNTHESIS.md` Enforce-via-hooks cross-cutting pattern: corrected.
- `SYNTHESIS.md` Top 3 Insights #3: added dated correction note.
- `SYNTHESIS.md` Gaps: marked the Gemini CLI hooks gap as "Resolved 2026-04-21."

---

### 3. Gemini CLI described as lacking native MCP support (19b §6.4)

**File:** `19b-mcp-server-design-for-asset-gen.md`

**Claim before:** "Gemini CLI does not natively speak MCP yet; bridge via a small adapter that translates Gemini's function-calling tool list to MCP `tools/list`."

**Fact:** Gemini CLI has native MCP support via its extensions system — declare `mcpServers` in `gemini-extension.json` and the CLI spawns the server over stdio. No adapter needed. Gemini CLI is one of the primary MCP clients with 24+ official Google MCP servers and FastMCP integration.

**Edit:** `19b` §6.4 corrected with dated note.

---

### 4. Ideogram 2.0 listed — superseded by Ideogram 3.0 (March 2025)

**File:** `19d-prompt-enhancement-agent-pattern.md`

**Claim before:** Routing table referenced "Ideogram 2.0" as the recommended text-rendering model.

**Fact:** Ideogram 3.0 / V3 Turbo was released March 26, 2025. It renders text with ~90–95% accuracy and is available in Turbo / Balanced / Quality tiers. Ideogram 2.0 is superseded.

**Edits:**
- `19d` capability matrix: updated row from "Ideogram 2.0" to "Ideogram 3.0 / V3 Turbo"; updated text rendering note.
- `19d` routing rules: updated `Ideogram 2.0` → `Ideogram 3.0 Turbo`.
- `19d` references: added Ideogram 3.0 link.

---

### 5. Recraft V4 not mentioned — released February 2026

**File:** `19d-prompt-enhancement-agent-pattern.md`

**Claim before:** Only Recraft v3 mentioned in the capability matrix and routing rules.

**Fact:** Recraft V4 was released February 2026 as a ground-up rebuild. It improves on V3 with better photorealistic rendering, stronger SVG coherence, sharper text-in-image accuracy, and a new Pro Vector tier at 2048×2048. It has an ELO rating of 1172 with a 72% win rate in blind evaluations.

**Edits:**
- `19d` capability matrix: added Recraft V4 row.
- `19d` routing rules: updated primary logo/favicon route to Recraft V4 with V3 as cost fallback.
- `19d` references: added Recraft V4 link.

---

### 6. Model references updated (QA node and rewriter)

**File:** `19d-prompt-enhancement-agent-pattern.md`, `SYNTHESIS.md`

- QA node: "Claude Sonnet or GPT-4o-mini" updated to "Claude Sonnet 4.6".
- Enrichment rewriter: "Claude Haiku / Gemini Flash" updated to "Claude Haiku 4.5".
- Classification node: added note that Claude API native structured outputs are now GA for Sonnet 4.5/Opus 4.5 (beta for Haiku 4.5) via `output_config.format` parameter.
- `SYNTHESIS.md` cross-cutting rewriter pattern: added note on Claude structured outputs GA.

---

## Claims Verified as Still Accurate (spot-checked)

- MCP `structuredContent` + `outputSchema` as default return pattern: confirmed accurate for `2025-06-18` and `2025-11-25`.
- OAuth 2.1 + PKCE + RFC 9728 mandatory for remote MCP servers: confirmed, still current.
- Copilot Skillsets capped at 5 skills: confirmed still accurate as of April 2026.
- `gpt-image-1` native RGBA transparency: still accurate.
- Flux ignoring `negative_prompt`: still accurate for Flux native API.
- `SKILL.md` format shared across Claude Code, Cursor, Windsurf, Codex: confirmed.
- Cline alphabetical-concat rule ordering: confirmed still the contract.
- Recraft V3 SVG native vector: confirmed still accurate; V4 now the preferred route.
- Ideogram text rendering ~90–95%: confirmed for Ideogram 3.0.
- Claude Agent SDK (formerly Claude Code SDK): confirmed rename; Managed Agents launched in public beta April 2026.

---

## Sources Used for Verification

- https://modelcontextprotocol.io/specification/2025-11-25
- https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/
- https://geminicli.com/docs/hooks/
- https://github.com/google-gemini/gemini-cli/pull/14460
- https://github.com/google-gemini/gemini-cli/issues/14449
- https://developers.googleblog.com/tailor-gemini-cli-to-your-workflow-with-hooks/
- https://geminicli.com/docs/tools/mcp-server/
- https://developers.googleblog.com/gemini-cli-fastmcp-simplifying-mcp-server-development/
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://ideogram.ai/features/3.0
- https://www.recraft.ai/docs/recraft-models/recraft-V4
- https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk
- https://platform.claude.com/docs/en/agent-sdk/overview
