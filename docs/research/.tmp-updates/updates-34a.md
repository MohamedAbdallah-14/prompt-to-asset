# Research Update Log — 34-installable-skills-survey (batch a)

**Date:** 2026-04-21  
**Scope:** First 9 files alphabetically in `docs/research/34-installable-skills-survey/`  
**Files edited:** 9  
**Method:** Read each file → web-search key claims → edit in-place with `> **Updated 2026-04-21:**` blocks

---

## Files Updated

### 1. `3d-realtime-emerging-skills.md`

**Changes:**
- Added update block at §1 (fal-3d): HunyuanV3 pricing corrected from $0.375 (preview price) to **$0.16/generation** per fal.ai pricing page April 2026. Noted MCP spec 2025-11-25 is Latest Stable; SSE deprecated, backward compat until 30 June 2026.
- Corrected HunyuanV3 cost inline in the provider table.
- Added update block at §2 (fal-realtime): FLUX.2 [klein] release confirmed January 15, 2026. 9B variant detail added: 9B flow model + 8B Qwen3 text encoder, 4-step distillation, <0.5s on 9B (not just <1s). Unified text-to-image and editing natively.

**Stale claims corrected:**
- $0.375 HunyuanV3 price → $0.16 (confirmed via fal.ai pricing page)
- 9B variant not described at all in original → added

---

### 2. `audio-tts-skills.md`

**Changes:**
- Added top-level update block: Eleven v3 is now flagship model (70+ languages, Audio Tags, 68% fewer complex-text errors). `eleven_flash_v2_5` costs 0.5 credits/char (effectively 20,000 chars/month free, not 10,000). Free tier no commercial rights. ElevenLabs MCP is MCP spec 2025-11-25 compliant; SSE deprecated 30 June 2026.

**Stale claims corrected:**
- Free tier capacity: the 0.5 credits/char efficiency of flash models means the effective free character budget is 20,000/month, not 10,000.

---

### 3. `awesome-collections-image-skills.md`

**Changes:**
- Added top-level update block: Confirmed SKILL.md spec (required: `name` max 64 chars, `description` max 1024 chars; optional: `disable-model-invocation`, `mode`, `allowed-tools`, `compatibility`; body ≤500 lines). Confirmed cross-IDE portability paths for Claude Code, Cursor, Windsurf, Gemini CLI, Cline (native SKILL.md 2026), Codex, Antigravity. Smithery: 7,000+ servers April 2026.

**New facts added:**
- Cline adopted SKILL.md format natively in 2026 (experimental)
- Continue.dev also supports SKILL.md portability
- Smithery server count: 7,000+ as of April 2026

---

### 4. `composio-volt-collections.md`

**Changes:**
- Updated the existing `> Updated 2026-04-21` block to add: MCP spec 2025-11-25 is Latest Stable (Streamable HTTP replaces SSE; SSE backward compat until 30 June 2026). SKILL.md format conventions consistent with Anthropic spec. Smithery: 7,000+ servers.

---

### 5. `diagram-svg-skills.md`

**Changes:**
- Added top-level update block: Cross-IDE portability confirmed (Claude Code, Cursor, Windsurf, Gemini CLI, Cline, Codex, Antigravity). MCP spec 2025-11-25 Latest Stable — Streamable HTTP required for new remote MCP servers; SSE deprecated, backward compat until 30 June 2026. Remote MCP tools like Kroki API fallback should target Streamable HTTP. Smithery: 7,000+ servers.

---

### 6. `fal-ai-skills.md`

**Changes:**
- Added top-level update block: Hunyuan3D pricing corrected to $0.16/generation (from $0.375). Nano Banana Pro pricing: $0.15 (1K/2K), $0.30 (4K). fal-generate default model is now Nano Banana Pro (`fal-ai/nano-banana-pro`), replacing earlier Flux-only defaults. RamboRogers MCP already serves Streamable HTTP on port 3000 (`--http` flag), consistent with MCP spec 2025-11-25. SSE deprecated, backward compat until 30 June 2026.

**Stale claims corrected:**
- HunyuanV3 price $0.375 → $0.16
- fal-generate default model: now Nano Banana Pro (not Flux)

---

### 7. `figma-design-tool-skills.md`

**Changes:**
- Added top-level update block: Figma now offers a **remote MCP server** at `https://mcp.figma.com/mcp` (Streamable HTTP, no desktop app required) — this is the recommended path. Write-to-canvas is beta, free during beta, will become usage-based paid. Full seat required to write; Dev seat is read-only. SSE deprecated; remote server uses Streamable HTTP.
- Updated §1 (How It Works) to document the two-path architecture: remote server (recommended) vs desktop/plugin server (legacy).
- Updated the summary table to add the remote server as the top row (recommended path).

**New facts added:**
- Figma remote MCP endpoint: `https://mcp.figma.com/mcp`
- Write-to-canvas beta: free during beta, will be usage-based paid
- Full seat vs Dev seat distinction for write vs read-only
- Remote server is recommended and does not require Figma desktop app

---

### 8. `flux-and-antigravity-skills.md`

**Changes:**
- Added update block at §1 (antigravity-awesome-skills): Kiro CLI/IDE are new supported IDEs in v10+. Cline now natively supports SKILL.md format. Antigravity's SKILL.md spec is consistent with Claude Code spec. Smithery: 7,000+ servers.
- Added update block at §2b (Google Imagen): Confirmed Gemini/Imagen API has no free tier as of 2025-12. Unbilled keys return HTTP 429 `limit: 0`. Nano Banana Pro via fal.ai: $0.15/image. Web UI still free (~500–1,000 images/day). Both `imagen` and `ai-studio-image` antigravity skills require billed projects.

**Stale claims corrected:**
- The skills were documented without the billing caveat for Gemini image API; now clearly noted

---

### 9. `free-nokey-generation-skills.md`

**File already had a top-level update block** (Gemini free API removal). Added additional inline updates:

- Summary table: added `> Updated 2026-04-21` block noting Pollinations Spore tier ~1.5 req/week (effectively unusable), anonymous tier unchanged at 1 req/15s, Seed-tier (free signup) gives 1 req/5s. `nologo=true` no longer suppresses watermarks for anonymous users without account verification. Together.ai FLUX.1 [schnell]-Free endpoint is unlimited free access (confirmed). MCP spec note on MCPollinations/PromptPilot/Nakkas Streamable HTTP targeting.
- Rate limit table: corrected Pollinations entry (noted Spore unusability), corrected Google AI Studio entry (web UI only; API requires billed project), corrected fal.ai credit estimate (65 images at Nano Banana Pro pricing), clarified Together.ai FLUX.1 [schnell]-Free is unlimited free access.

**Stale claims corrected:**
- Pollinations Spore tier: effectively unusable as of February 2026 (~1.5 req/week)
- Together.ai: FLUX.1 [schnell]-Free is confirmed unlimited free (no credit needed)
- fal.ai credit estimate: $10 / $0.15 per image ≈ 65 Nano Banana Pro images (not "200–3000" — that range reflected very cheap models only)

---

## Key Cross-Cutting Corrections (affects all 9 files)

| Topic | Old claim | Corrected claim |
|---|---|---|
| MCP spec version | Variously "draft", "2024-11-05", or unspecified | **2025-11-25 is Latest Stable**; Streamable HTTP replaces SSE; SSE backward compat until 30 June 2026 |
| SKILL.md portability | Listed Claude Code, Cursor, Codex, Windsurf, Gemini CLI | **Add Cline** (native SKILL.md support, 2026) and **Continue.dev** |
| Smithery server count | Not mentioned or undercounted | **7,000+ servers** as of April 2026 |
| HunyuanV3 price | $0.375 (preview price) | **$0.16/generation** (current fal.ai pricing) |
| Gemini/Imagen free API | "~1,500 images/day free" or "free tier" | **No free API tier since 2025-12**; web UI at aistudio.google.com is still free |
| Figma MCP architecture | Plugin-bridged local server only | **Remote server** at `https://mcp.figma.com/mcp` is now recommended; no plugin required |
| ElevenLabs free capacity | "10,000 chars/month" | **10,000 credits/month**; flash/turbo models cost 0.5 credits/char, so effective budget is up to 20,000 chars/month for those models |
| Pollinations Spore tier | "Free registered tier" implied usable | **~1.5 req/week** as of Feb 2026 (issue #8542); Seed-tier (free signup) is the usable free tier at 1 req/5s |

---

## Sources Consulted

- https://code.claude.com/docs/en/skills — SKILL.md format spec
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview — frontmatter fields
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports — MCP spec transport status
- https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/ — SSE deprecation rationale
- https://geminicli.com/docs/hooks/ — Gemini CLI hooks (SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, BeforeAgent, AfterAgent confirmed)
- https://geminicli.com/docs/tools/mcp-server/ — Gemini CLI native MCP via mcpServers in settings.json and gemini-extension.json
- https://fal.ai/pricing — fal.ai current model pricing
- https://fal.ai/models/fal-ai/triposr — TripoSR $0.07/generation confirmed
- https://smithery.ai — 7,000+ MCP servers April 2026
- https://developers.figma.com/docs/figma-mcp-server/ — Figma remote MCP server
- https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/ — write-to-canvas beta
- https://elevenlabs.io/pricing — ElevenLabs 2026 pricing
- https://elevenlabs.io/docs/overview/models — Eleven v3 model details
- https://venturebeat.com/technology/black-forest-labs-launches-open-source-flux-2-klein-to-generate-ai-images-in — FLUX.2 [klein] January 15, 2026 release
- https://github.com/pollinations/pollinations/issues/8542 — Pollinations Spore tier degradation
- https://medium.com/data-science-collective/using-skills-with-cline-3acf2e289a7c — Cline SKILL.md support
