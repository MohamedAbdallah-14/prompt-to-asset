---
wave: 1
role: niche-discovery
slug: 19-tri-surface-starters
title: "Tri-surface (web + MCP + CLI) starter templates"
date: 2026-04-19
sources:
  - https://github.com/vercel-labs/mcp-for-next.js
  - https://github.com/vercel-labs/mcp-apps-nextjs-starter
  - https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter
  - https://github.com/run-llama/mcp-nextjs
  - https://github.com/modelcontextprotocol/example-remote-server
  - https://github.com/modelcontextprotocol/typescript-sdk
  - https://github.com/vercel-labs/open-agents
  - https://github.com/vercel-labs/skills
  - https://github.com/vercel/mcp-adapter
  - https://github.com/anthropics/dxt
  - https://github.com/anthropics/mcpb
  - https://github.com/f/mcp-startup-framework
  - https://github.com/jscraik/mKit
  - https://github.com/DTeam-Top/mcp-oauth
  - https://github.com/iceener/streamable-mcp-server-template
  - https://github.com/clerk/mcp-tools
  - https://github.com/agentailor/create-mcp-server
  - https://github.com/d1maash/mcp-new
  - https://github.com/skills-mcp/skills-mcp
  - https://github.com/IvanTsxx/AI-Nextjs-Monorepo-Starter
  - https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js
  - https://vercel.com/templates/template/mcp-apps-next-js-starter
  - https://anthropic.com/engineering/desktop-extensions
tags: [starter, boilerplate, nextjs, mcp, oauth, tri-surface]
---

# Tri-surface (web + MCP + CLI) starter templates

## Scope and definition

The target shape is the one codified in 20e: a single repo that ships **(1)** a human-facing web app at `/`, **(2)** a hosted remote MCP server at `/api/[transport]` with OAuth 2.1 + Streamable HTTP, and **(3)** a CLI/skill pack that installs the same tool vocabulary into Claude Code, Cursor, Windsurf, Gemini CLI, Codex, VS Code, and Zed — every surface backed by the *same* `lib/tools/` handlers so Parity is structural. No OSS repo surveyed ships all three cleanly; the space decomposes into four near-misses that each cover a subset.

## Tier 1 — Next.js + MCP mono-app starters (two of three surfaces)

### `vercel-labs/mcp-for-next.js` — reference transport skeleton

- <https://github.com/vercel-labs/mcp-for-next.js> — **352★**, MIT, Vercel Labs.
- Included: `mcp-handler` at `/api/[transport]` serving `/api/mcp` (Streamable HTTP) + `/api/sse` (legacy); sample tool/prompt/resource registrations; `script/test-client.mjs`; Vercel Fluid Compute recipe + optional Redis via `REDIS_URL` for cross-instance SSE + `maxDuration: 800` on Pro.
- Missing: OAuth, real UI (no `page.tsx` beyond boilerplate), CLI/skill pack, tests beyond smoke, non-Vercel deploy.
- Time to deployed stack: ~10 min (`vc deploy`).
- Verdict: canonical `createMcpHandler` pattern validated by 20e. Surface #2 only.

### `run-llama/mcp-nextjs` — MCP + OAuth 2.1 + user DB

- <https://github.com/run-llama/mcp-nextjs> — **86★**, MIT, LlamaIndex.
- Included: `@vercel/mcp-adapter` at `/mcp/sse` + HTTP-stream; **OAuth 2.1** client registration + token exchange over Prisma/Postgres; Google provider default (GitHub/X swappable); `REDIS_URL` for SSE fan-out; auth-guarded example tool; tested vs Claude Desktop/.ai, Cursor, VS Code, Inspector.
- Missing: product UI (only NextAuth consent pages), CLI/skill pack, Streamable-HTTP-as-primary, tests.
- Time to deployed stack: ~30 min (Postgres + Redis + Google creds + `prisma db push` + `vc deploy`).
- Verdict: best OSS expression of surface #2 **with production auth**. Directly cloneable as our auth layer.

### `vercel-labs/mcp-apps-nextjs-starter` — UI + MCP as one iframe resource

- <https://github.com/vercel-labs/mcp-apps-nextjs-starter> — **20★**, MIT, 2026.
- Included: Next.js dual-role — `app/mcp/route.ts` registers tools via `mcp-handler` + `@modelcontextprotocol/ext-apps`; `app/page.tsx` is a React page the MCP route self-fetches and serves as an MCP **resource** for hosts to render in a sandboxed iframe; `useMcpApp()` hook bridges `toolInput`/`toolResult`/`connected` to React state.
- Missing: OAuth, CLI/skill pack, standalone UX (the UI is designed for *in-host* rendering, not as a product page), tests.
- Time to deployed stack: ~15 min (local dev needs `ngrok` for HTTPS).
- Verdict: first OSS template where UI and MCP are literally the same surface — 20e Parity made structural. Too niche as the project spine; steal the pattern for widget-shaped tools (e.g. an in-ChatGPT `resize_icon_set` panel). `vercel-labs/chatgpt-apps-sdk-nextjs-starter` is the same template with OpenAI Apps SDK metadata.

### `modelcontextprotocol/example-remote-server` — spec author's reference

- <https://github.com/modelcontextprotocol/example-remote-server> — **72★**, MIT, hosted at `example-server.modelcontextprotocol.io/mcp`.
- Included: 7 tools, 100+ paginated+subscribable resources, prompts, **OAuth 2.0** using the spec's separate-auth-server pattern (internal mode port 3232; external mode 3001+3232), Streamable HTTP + SSE served simultaneously.
- Missing: UI, CLI, skills, Next.js integration (standalone Node/Express), billing, tests beyond `npm run dev:internal`.
- Time to deployed stack: ~5 min local, ~20 min on a VPS.
- Verdict: authoritative reference for remote-MCP spec compliance. Copy its OAuth architecture; don't copy its transport (Express, not Next.js).

## Tier 2 — Cloudflare Workers + MCP monetization starters

### `f/mcp-startup-framework` — most complete "ship a paid MCP"

- <https://github.com/f/mcp-startup-framework> — **~126★**, TypeScript, May 2025.
- Included: **OAuth 2.1 provider** with self-hosted registration/login; **PostgreSQL** pooling; **Stripe-backed paid-tools** with subscription gating; modular `src/tools/` with per-request user context; REST API alongside MCP; Streamable HTTP; `/up` health check; `mcp-remote` shim for Claude Desktop.
- Missing: product UI, CLI/skill pack, Next.js (Workers-first; Vercel is community-docs), tests.
- Time to deployed stack: ~45 min (Postgres + Cloudflare account + Stripe keys + `npm run deploy`).
- Verdict: closest OSS precedent for Stripe-gated tiered MCP tools, but inheriting Cloudflare Workers conflicts with Next.js SSR + Vercel Fluid Compute.

### Adjacent references (no UI, no CLI)

- **`jscraik/mKit`** (<https://github.com/jscraik/mKit>, 1★) — Workers + OAuth 2.1 + Stripe + OpenAI Apps SDK UI layer. Too immature to clone.
- **`iceener/streamable-mcp-server-template`** — OAuth 2.1 + multi-tenant sessions + AES-256-GCM token encryption on a Node (Hono) / Cloudflare dual-target. Good OAuth reference; substrate mismatch.
- **`DTeam-Top/mcp-oauth`** — Next.js + Drizzle + Better-Auth + OAuth 2.1 (Google/GitHub/Discord/X) + `@vercel/mcp-adapter`. Modern drop-in competitor to `run-llama/mcp-nextjs`; pick whichever auth stack the team already runs.

## Tier 3 — full coding-agent webapps (not MCP starters, but tri-surface-adjacent)

### `vercel-labs/open-agents` — webapp + agent workflow + sandbox (MCP client, not server)

- <https://github.com/vercel-labs/open-agents> — **~3,810★**, MIT — most-starred in this space. Web (Next.js chat UI) → Agent workflow (Workflow SDK, outside the sandbox) → Sandbox VM (Vercel Sandboxes, snapshot resume); file/search/shell/task/skill/web tools; optional auto-commit/push/PR; ElevenLabs voice; read-only share links; recent PRs add **MCP *client* connections** and AI Gateway BYOK.
- Missing: this is an MCP *client*, not an MCP *server* — no `/api/mcp` endpoint; CLI/skill pack lives in a separate repo (`vercel-labs/skills`).
- Verdict: stellar reference for the **Web + Agent-worker + Sandbox** pattern (the right architecture for our async generation backend); wrong starting point if the goal is to *expose* MCP tools to other agents.

### `vercel-labs/skills` — the CLI/skill-pack layer, standalone

- <https://github.com/vercel-labs/skills> — **~14.7k★** (as of 2026-04), largest star count in this survey. `npx skills` installs/searches/updates/removes agent skills across **OpenCode, Claude Code, Codex, Cursor + 41 other agents**, from GitHub/GitLab/git URLs/local paths, globally or per-project, symlink or copy, CI/CD-friendly. v1.1.1 added interactive discovery (`npx skills find`) and enhanced agent support.
- Not a starter — it's the distribution tool. Our CLI should *integrate with* `npx skills`, not compete.

### Also-rans

- **`skills-mcp/skills-mcp`** — exposes Anthropic's Skill pattern as MCP resources so any MCP client can load them. Glue for the CLI layer.
- **`IvanTsxx/AI-Nextjs-Monorepo-Starter`** — Next.js + Turborepo + Prisma + Better-Auth + pre-configured MCP servers + skill scaffolds for Cursor/Claude. Early-stage, but the only surveyed repo that *names* Web + MCP + Skills as its thesis.

## Tier 4 — packaging and meta-tooling

- **`anthropics/mcpb`** (formerly `dxt`, renamed 2025-09) — the **Claude Desktop Extension bundling format** (`.mcpb` zip = `manifest.json` + `server/` + `dependencies/` + `icon.png`); CLI `mcpb init` / `mcpb pack`. Samples: `hello-world-node`, `chrome-applescript`, `file-manager-python`, `file-system-node`. Not a starter — it's the *packaging envelope* for surface #3. A tri-surface project should ship an `.mcpb` alongside its hosted MCP so users can pick local-stdio or remote-HTTP.
- **`agentailor/create-mcp-server`** (Jan 2026) — scaffolder: HTTP/stdio transport × MCP SDK/FastMCP × stateless/stateful, Dockerfile, MCP Inspector. Surface #2 only.
- **`d1maash/mcp-new`** (Dec 2025) — similar scaffolder plus in-browser visual generator (`mcp-new web`) and TS/Python/Go/Rust/Java/Kotlin/C#/Elixir templates.
- **`clerk/mcp-tools`** — Next.js utilities with dynamic client registration; shortest path if the team uses Clerk.
- **`vercel/mcp-adapter`** — the `createMcpHandler` used by every Next.js template above.

## Gap: no single repo ships all three surfaces

Projecting the survey onto the surface matrix:

| Repo | Web UI (product) | MCP server | CLI / skill pack | OAuth 2.1 | Streamable HTTP | Stars |
|---|---|---|---|---|---|---:|
| vercel-labs/mcp-for-next.js | —  | ✓ | — | — | ✓ | 352 |
| run-llama/mcp-nextjs | auth only | ✓ | — | ✓ | ✓ (SSE primary) | 86 |
| vercel-labs/mcp-apps-nextjs-starter | ✓ (widget) | ✓ | — | — | ✓ | 20 |
| modelcontextprotocol/example-remote-server | — | ✓ | — | ✓ (OAuth 2.0) | ✓ | 72 |
| f/mcp-startup-framework | auth + billing | ✓ | — | ✓ | ✓ | 126 |
| DTeam-Top/mcp-oauth | auth only | ✓ | — | ✓ | ✓ | low |
| vercel-labs/open-agents | ✓ (full app) | client only | — (separate repo) | ✓ | n/a | 3810 |
| vercel-labs/skills | — | — | ✓ (gold standard) | n/a | n/a | 14620 |
| anthropics/mcpb | — | packaging | ✓ (`.mcpb` only) | n/a | n/a | high |

No row has all three green checks. The **stitch itself is the whitespace**, which is exactly the 20e finding on the competitive side (Figma/Linear/Gamma ship tri-surface closed; OSS does not).

---

## Starter recommendations

**1. `run-llama/mcp-nextjs` as the auth + MCP spine, extended with `vercel-labs/mcp-for-next.js`'s transport minimalism.** Fork `run-llama/mcp-nextjs` for the Prisma + Postgres user model, OAuth 2.1 client registration, and the `@vercel/mcp-adapter` wiring already shown working against Claude Desktop / Claude.ai / Cursor / VS Code. Replace the SSE-primary transport with Streamable HTTP as default (pull the route handler shape from `vercel-labs/mcp-for-next.js`). Then build the product web UI on top of the existing Next.js app, and add `lib/tools/` as the single source of truth called by both UI route handlers and MCP tools — the 20e Parity pattern. This gets surfaces #1 and #2 shipping together within a week; it is the lowest-risk starting point.

**2. `vercel-labs/open-agents` as a structural reference for the *generation worker*, not as the main repo.** Image generation is async (5–30s), so the three-layer Web → Workflow → Sandbox split in `open-agents` (with `Workflow SDK` durable runs, snapshot-based resume, session share links) is the correct skeleton for our generation backend. Don't fork it — its MCP posture is wrong (client, not server) — but read its `agent/` and `workflows/` directories carefully and port the pattern into the worker that `lib/tools/generate_*` enqueues against. Combining (1) + this pattern gives a Next.js monorepo where the chat-like web UI, the MCP `/api/[transport]` endpoint, and the async generation worker all share handlers.

**3. `vercel-labs/skills` + `anthropics/mcpb` as the CLI/surface-#3 duo — integrate, do not clone.** The third surface should be an `npx prompt-to-asset init` that: (a) detects installed IDEs and writes `.cursor/mcp.json`, `~/.claude/skills/prompt-to-asset/SKILL.md`, `.windsurfrules`, Gemini CLI extension JSON, Codex manifest, VS Code `mcp.json`, Zed `context_servers`; (b) registers the skill set with `vercel-labs/skills` so `npx skills install prompt-to-asset` works across 41+ agents; (c) ships an `.mcpb` bundle built with `anthropics/mcpb` for one-click Claude Desktop install. This does not require forking either project — we consume `skills` as a dependency and `mcpb` as a build tool — and it piggybacks on `vercel-labs/skills`'s 14.6k★ distribution moat rather than re-inventing one.

Executed in that order, the tri-surface starter the survey failed to find is something we can *assemble* in two to three weeks from well-starred, MIT-licensed parts — and because nobody else has, the assembled repo itself becomes a publishable reference template in the same class as `vercel-labs/mcp-for-next.js`.
