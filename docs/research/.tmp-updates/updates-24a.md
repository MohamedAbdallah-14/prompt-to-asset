# Updates Log: Research Area 24 — Agentic Orchestration Patterns
**Date:** 2026-04-21  
**Auditor:** Claude Sonnet 4.6

---

## Files Edited

### 24b-plan-execute-react-patterns.md
- Added `> **Updated 2026-04-21:**` block after "Key GitHub Repos" section documenting LangGraph v1.1.8 (April 17, 2026), the new `stream(version="v2")` / `invoke(version="v2")` typed API, Python 3.9 drop / 3.14 add, and TypeScript parity at v1.2.9 / 42k+ weekly npm downloads.
- Added LangGraph 1.0 GA changelog link to References.

### 24c-parallel-fan-out-best-of-n.md
- Added `> **Updated 2026-04-21:**` block after the Google ADK paragraph noting: ADK now available in Python, TypeScript, Go, Java (Java 1.0 in April 2026); OpenAI Agents SDK April 2026 update added sandbox/harness features Python-first (TypeScript planned).

### 24d-retry-fallback-agent-chains.md
- Added `> **Updated 2026-04-21:**` block to Caveats section: OpenAI Assistants API deprecated mid-2026 (migrate retry logic to Agents SDK); SSE transport for MCP ended April 1, 2026 — Streamable HTTP required.

### 24e-state-machine-creative-pipelines.md
- Added "Current version: **v1.1.8** (April 17, 2026)" inline to LangGraph opening sentence.
- Updated LangGraph JS bullet: added npm package name `@langchain/langgraph`, current version v1.2.9, and the `stream(version="v2")` typed API detail.
- The file already contained 2026-04-21 blocks on AutoGen maintenance mode, MAF GA, Claude Agent SDK, and A2A — these were confirmed accurate and left as-is.

### 24f-github-repo-survey.md
- **AutoGen section**: Added `> **Updated 2026-04-21:**` block — AutoGen in maintenance mode; MAF 1.0 GA April 3, 2026; do not start new projects on AutoGen v0.4; migration guide URL.
- **LangGraph section**: Added `> **Updated 2026-04-21:**` block with v1.1.8 (Python) / v1.2.9 (TS), deferred node execution feature, `stream(version="v2")` API, 42k+ weekly npm downloads.
- **shinpr/mcp-image section**: Added `> **Updated 2026-04-21:**` block noting Google ADK now supports Gemini 3 Pro/Flash; reminder Gemini image API still requires billing.
- **Summary table**: Added Microsoft Agent Framework row (GA April 2026); added maintenance-mode warning to AutoGen row; added LangGraph version numbers.

### 24g-key-takeaways.md
- Added two new numbered sections before "Bottom Line":
  - **#9 MCP Transport: SSE Is Gone** — SSE ended April 1, 2026; Streamable HTTP required; MCP spec 2025-11-25 is latest stable (not 2025-03-26).
  - **#10 Anthropic Structured Output: No Beta Header** — GA now; `output_config.format` parameter; no `anthropic-beta` header needed; available on Sonnet 4.5, Opus 4.5+, all 4.6 models.
- Updated "Bottom Line" to reference LangGraph v1.1.8 and add infrastructure note about MCP transport and structured outputs.

### SYNTHESIS.md
- Fixed header date: `2026-04-20` → `2026-04-21`.
- Updated 24e summary paragraph: added LangGraph version numbers, confirmed JS parity, flagged AutoGen maintenance mode with MAF GA date, added CrewAI issue #4783 reference (March 2026).
- Updated finding #5 (OpenAI Agents SDK): added April 2026 sandbox update note; flagged Assistants API deprecation mid-2026.
- Added findings #6–#10 under `> **Updated 2026-04-21:**`:
  - **#6** MCP transport: SSE dead; Streamable HTTP required; spec 2025-11-25 is latest (not 2025-03-26).
  - **#7** Claude model strings: Haiku 4.5 / Sonnet 4.6 / Opus 4.7 (April 16, 2026); 4.0-series retires June 15, 2026.
  - **#8** Claude Structured Output GA: `output_config.format`; no beta header.
  - **#9** Gemini CLI hooks + MCP: full hooks system since v0.26.0 (enabled by default); native MCP via `mcpServers` in settings.json.
  - **#10** Claude Agent SDK formally released September 29, 2025; both Python and TypeScript actively maintained.

### index.md
- Added `updated: 2026-04-21` to frontmatter (date field was already correct).

---

## Key Facts Verified

| Topic | Status found | Correction made |
|---|---|---|
| LangGraph version | v1.1.8 (Python, Apr 17 2026) / v1.2.9 (TS) | Added to 24b, 24e, 24f, SYNTHESIS |
| LangGraph v1.0 GA date | October 2025 — confirmed | No change needed |
| LangGraph JS parity | Confirmed full parity; 42k+ npm/week | Removed old caveat text |
| CrewAI version | v1.9.3 (Jan 30, 2026); hierarchical bugs still open (#4783, Mar 2026) | Confirmed existing warnings; added issue number |
| AutoGen status | Maintenance mode confirmed; MAF 1.0 GA April 3, 2026 | Updated 24f section and SYNTHESIS |
| OpenAI Agents SDK | April 16, 2026 update: sandbox + model-native harness, Python-first | Added to 24c, 24a (already had it), SYNTHESIS |
| Claude models | Haiku 4.5 / Sonnet 4.6 / Opus 4.7 (released Apr 16, 2026); 4.0-series retires Jun 15, 2026 | Added to SYNTHESIS #7 |
| MCP spec latest | 2025-11-25 is latest stable (adds Tasks, Extensions, Auth improvements) | Added to SYNTHESIS #6, 24g #9, 24d |
| SSE transport | Deprecated; ended April 1, 2026 for Claude connectors | Added to 24d, 24g, SYNTHESIS #6 |
| Streamable HTTP | Required for all remote MCP | Added to 24d, 24g, SYNTHESIS #6 |
| Claude Structured Output | GA; `output_config.format`; no beta header | Added to 24g #10, SYNTHESIS #8 |
| Gemini CLI hooks | Full system since v0.26.0 (SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, BeforeToolSelection, PreCompress); enabled by default | Added to SYNTHESIS #9 |
| Gemini CLI MCP | Native via `mcpServers` in settings.json | Added to SYNTHESIS #9 |
| Claude Agent SDK | Formally released Sep 29, 2025 (renamed from Claude Code SDK); Python + TS | Confirmed existing mentions; added to SYNTHESIS #10 |
| Google ADK | Available Python/TS/Go/Java; Java 1.0 Apr 2026; bi-weekly releases | Added to 24c |

---

## Files NOT Changed (no errors found)

- **24a-multi-agent-handoff-patterns.md** — already had accurate 2026-04-21 blocks on Claude Agent SDK and A2A protocol; OpenAI Agents SDK JS caveat already correctly qualified. No substantive errors found.

---

## Sources

- LangGraph releases: https://github.com/langchain-ai/langgraph/releases
- LangGraph 1.0 GA: https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available
- @langchain/langgraph npm: https://www.npmjs.com/package/@langchain/langgraph
- CrewAI changelog: https://docs.crewai.com/en/changelog
- CrewAI hierarchical bug #4783: https://github.com/crewAIInc/crewAI/issues/4783
- AutoGen maintenance / MAF: https://venturebeat.com/ai/microsoft-retires-autogen-and-debuts-agent-framework-to-unify-and-govern
- MAF migration guide: https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/
- OpenAI Agents SDK April 2026: https://openai.com/index/the-next-evolution-of-the-agents-sdk/
- Claude models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- MCP SSE deprecation / Streamable HTTP: https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/
- Claude structured output: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Gemini CLI hooks: https://geminicli.com/docs/hooks/
- Gemini CLI v0.26.0: https://github.com/google-gemini/gemini-cli/releases/tag/v0.26.0
- Gemini CLI MCP: https://geminicli.com/docs/tools/mcp-server/
- Claude Agent SDK: https://github.com/anthropics/claude-agent-sdk-python
- Google ADK: https://google.github.io/adk-docs
- Google ADK Java 1.0: https://www.infoq.com/news/2026/04/google-adk-1-0-new-architecture/
