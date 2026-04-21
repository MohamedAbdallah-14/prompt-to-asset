# Research 32 — Streaming & Real-Time UX: Update Log
**Audit date:** 2026-04-21  
**Files audited:** 32a, 32b, 32c, 32d, 32e, index.md, SYNTHESIS.md

---

## Changes Made

### 32a-mcp-streamable-http-progress.md

**1. MCP spec version stale (HIGH)**
- Old claim: "MCP specification (revision 2025-03-26)" presented as current.
- Fact: Current stable spec is `2025-11-25` (released November 2025). A `2026-03-15` update also exists adding mandatory RFC 8707 resource indicators for auth. Progress notification wire format is unchanged between all three versions.
- Fix: Added dated update block at top; updated spec URLs to point to `2025-11-25`; preserved `2025-03-26` as a secondary reference (origin of Streamable HTTP).

**2. MCP TypeScript SDK version reference stale (LOW)**
- Old claim: "v1.10+" implied as current.
- Fact: SDK is at v1.20+ as of April 2026. `server.notification()` pattern remains valid.
- Fix: Added caveat to check npm for current version.

**3. Claude Code stdio-only claim stale (MEDIUM)**
- Old claim: Progress notifications only work in Cursor or HTTP-transport hosts; Claude Code is stdio-only.
- Fact: Claude Code now supports Streamable HTTP transport for remote MCP servers (SSE deprecated in favour of HTTP). There is a known bug (#29688) where Claude Code may still spawn stdio child processes even for HTTP-configured servers.
- Fix: Updated caveat block; preserved stdio-discards-notifications note for local stdio servers.

---

### 32b-sse-long-running-tool-calls.md

**4. SEP-1686 Tasks status wrong (HIGH)**
- Old claim: "not yet in the stable spec"; "do not implement the Tasks polling pattern until SEP-1686 is merged."
- Fact: SEP-1686 Tasks shipped as **experimental** in the `2025-11-25` MCP spec. The prior SEP-1391 (tool-specific async) was rejected in favour of the more general Tasks primitive. SDK implementations for Python and Kotlin are being tracked. Tasks are safe to adopt.
- Fix: Rewrote "Async Tasks Pattern" section; updated recommendation to allow adoption; updated references.

**5. Claude Code transport caveat (MEDIUM)** — same as #3 above, applied to SSE constraints list.

**6. Reference URLs updated:** `2025-03-26` spec links updated to `2025-11-25`; SEP-1686 community page added; WorkOS 2025-11-25 spec update article added.

---

### 32c-incremental-svg-rendering.md

**No material corrections needed.** File references FastMCP's `streamingHint`/`streamContent` (confirmed still valid), Simon Willison's SVG renderer (still accurate), and Claude's `eager_input_streaming` flag (still accurate). Transport/IDE rendering caveats are still correct. No changes made.

---

### 32d-bullmq-sse-job-progress.md

**No material corrections needed.** BullMQ Redis 6.2+ requirement is confirmed correct (BullMQ v5.75.x active as of April 2026). Architecture patterns remain valid. No changes made.

---

### 32e-optimistic-preview-patterns.md

**7. gpt-image-1 streaming: claim "no streaming; full image only" is WRONG (HIGH)**
- Old claim: "`gpt-image-1` — No streaming; full image only."
- Old claim: "Partial image streaming tracked in Vercel AI SDK issue #9017 (closed in v6.0 milestone — OpenAI responses API partial image)" — this was a parenthetical that acknowledged the issue was tracked, but left the main claim as "no streaming."
- Fact: OpenAI now ships a documented `stream: true` + `partial_images: 0–3` parameter on the Images API for `gpt-image-1`, `gpt-image-1-mini`, and `gpt-image-1.5`. Progressive base64-encoded partial images are emitted during generation.
- Fix: Updated provider table to mark gpt-image-1 family as having native streaming; added correct API reference URL; rewrote "Not worth it now" item in applicability section to note gpt-image-1 streaming as now feasible.

**8. Vercel AI SDK version stale (MEDIUM)**
- Old claim: React 19 `useOptimistic` section had no SDK version context.
- Fact: Vercel AI SDK 5.0 introduced breaking `useChat` changes (UIMessage/ModelMessage split; `tool-TOOLNAME` parts). AI SDK 6.0 shipped (backwards-compatible).
- Fix: Added dated note explaining v5/v6 `useChat` changes; added SDK release references.

**9. React 19 stable (LOW)**
- Old claim: "React 19's `useOptimistic`" — no stability note.
- Fact: React 19 stable was released December 2024. `useOptimistic` is a stable API.
- Fix: Added "(React 19 stable since December 2024)" to code section header.

---

### SYNTHESIS.md

**10. All four material corrections surfaced in update block at top of file.**
- MCP spec version updated.
- SEP-1686 Tasks finding corrected (finding #9 in "What does not exist yet").
- Provider gap section renamed: "What does not exist yet (provider gap)" → "Partial pixel previews — what is available"; gpt-image-1 streaming noted.
- Recommended Implementation Order: added Phase 3b for gpt-image-1 partial preview.
- Critical Transport Caveat: updated to note Claude Code HTTP transport support.

---

## Claims Verified Unchanged (no edit needed)

- BullMQ Redis 6.2+ requirement: confirmed correct (BullMQ v5.75.x, still Redis 6.2+).
- ComfyUI WebSocket step-preview via `SaveImageWebsocket`: confirmed still the only per-step diffusion-step preview for local inference.
- fal.ai `fal.subscribe()` `onQueueUpdate` API: confirmed still the current pattern (queue position events, not pixel data).
- FastMCP `streamingHint`/`streamContent`/`reportProgress`: confirmed still valid and documented.
- SSE browser limit (6 connections per origin): still accurate.
- SSE keepalive ping every 15s to defeat proxy buffering: still recommended practice.
- Simon Willison progressive SVG renderer reference: still valid.

---

## Searches Performed

1. MCP specification 2025 Streamable HTTP progress current version 2026
2. MCP async tasks SEP-1686 modelcontextprotocol issues/1391 status 2026
3. FastMCP punkpeye streamContent streamingHint reportProgress current version
4. MCP specification 2025-11-25 changes new features tasks progress 2026
5. MCP TypeScript SDK v1.10 progress notifications server.notification current version
6. gpt-image-1 partial image streaming OpenAI API 2025 2026 status
7. OpenAI image streaming partial_images parameter released 2025
8. Vercel AI SDK version 4 2025 2026 useChat streaming current API changes
9. fal.ai subscribe onQueueUpdate streaming 2025 2026 current API
10. BullMQ 2025 2026 version Redis requirements current status
11. Claude Code stdio MCP progress notifications 2026 HTTP transport support
12. Claude Code MCP HTTP transport support progress notifications 2026 stdio deprecated
