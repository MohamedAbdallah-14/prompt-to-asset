---
category: 20-open-source-repos-landscape
angle: 20e
title: "Agent-Native Web Apps for Asset Generation: Reference Architectures and Gap Analysis"
slug: 20e-agent-native-webapps-and-gap-analysis
researcher: subagent-20e
date: 2026-04-19
word_count_target: 3000-4500
sources_primary:
  - https://developers.figma.com/docs/figma-mcp-server
  - https://linear.app/docs/mcp
  - https://developers.gamma.app/mcp/mcp-tools-reference
  - https://github.com/vercel/mcp-adapter
  - https://github.com/vercel-labs/open-agents
  - https://github.com/Nutlope/logocreator
  - https://github.com/mcpware/logoloom
  - https://github.com/arekhalpern/mcp-logo-gen
  - https://github.com/niels-oz/icon-generator-mcp
  - https://brandspec.dev/
  - https://github.com/thebrandmd/brand.md
  - https://docs.adcontextprotocol.org/docs/brand-protocol
tags:
  - agent-native
  - mcp
  - webapp-architecture
  - gap-analysis
  - product-strategy
---

# Agent-Native Web Apps for Asset Generation — Reference Architectures and Gap Analysis

## Executive Summary

The shift underway across developer tools in 2025–2026 is that **web applications are no longer built for humans alone**. The new bar — articulated by the "agent-native architecture" discipline and codified by Anthropic's MCP, W3C's WebMCP draft, and a wave of first-party servers from Figma, Linear, Gamma, and Vercel — is **parity**: *any action a user can do in the UI, an agent must be able to do through a tool call*. The product that wins a category is increasingly the one whose surface area is equally legible to humans clicking buttons and to Claude Code / Cursor / Gemini CLI / Codex calling tools.

Our research into this landscape surfaces three high-confidence findings directly relevant to the `prompt-to-asset` plugin:

1. **The "web UI + MCP server + IDE skills" shape is now a reproducible reference architecture.** Figma, Linear, Gamma, and Vercel v0 have all shipped the same tri-surface: website at `/`, hosted remote MCP server at `mcp.<product>.<tld>/mcp` (OAuth 2.1 + Streamable HTTP), and first-party client integrations for Claude Code, Cursor, VS Code, Codex, Windsurf, and v0. On the OSS side, the pattern is a Next.js monorepo using [`vercel/mcp-adapter`](https://github.com/vercel/mcp-adapter) ([`vercel-labs/mcp-for-next.js`](https://github.com/vercel-labs/mcp-for-next.js/), [`run-llama/mcp-nextjs`](https://github.com/run-llama/mcp-nextjs)) where the same tool handlers back both the UI route handlers and the `/api/[transport]` MCP endpoint. This is the shape we should copy.

2. **The asset-generation category is unclaimed at this shape.** There are isolated OSS logo generators ([`Nutlope/logocreator`](https://github.com/Nutlope/logocreator), 6.8k★ — a slick Next.js web UI with no MCP) and isolated MCP logo tools ([`mcpware/logoloom`](https://github.com/mcpware/logoloom), 2★; [`arekhalpern/mcp-logo-gen`](https://github.com/arekhalpern/mcp-logo-gen); [`niels-oz/icon-generator-mcp`](https://github.com/niels-oz/icon-generator-mcp) — MCP-only, no website, no prompt-enhancement research layer, no multi-model routing). **No repository on GitHub today ships all three of website + MCP server + cross-IDE skill pack for AI-driven logo/icon/asset generation.** This is a clean whitespace.

3. **The competitive moat is not the model call; it is the surrounding stack.** Models are a commodity (Imagen 4, Nano Banana, Flux.1, `gpt-image-1`, Recraft V3 are all one API call away). What remains defensible is: (a) prompt enhancement grounded in research (this 121-agent compendium is itself that moat), (b) asset-specific post-processing (alpha-safe background removal, vectorization, platform-correct resize), (c) multi-model routing (pick Imagen-4 for flat logos, Flux for photoreal, Recraft for SVG), (d) a machine-readable **brand bundle** format ([brandspec](https://brandspec.dev/), [brand.md](https://github.com/thebrandmd/brand.md), AdCP brand.json) injected into every generation, and (e) one-command cross-IDE delivery so the plugin works equivalently in Claude Code, Cursor, Windsurf, Gemini CLI, and Codex. The v1 feature list below operationalizes this.

---

## Reference Architectures

### 1. Figma MCP Server — the canonical "design tool as agent surface"

Figma's official MCP is hosted at `https://mcp.figma.com/mcp` and exposes **11 tools** covering both read and write operations on the canvas ([developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server)). Read tools extract structured design context — frames, components, layouts, tokens, variables, Code Connect mappings. Write tools create and modify native Figma content: frames, components, variables, auto-layout.

The architectural insight Figma explicitly publishes ([/mcp-vs-agent/](https://developers.figma.com/docs/figma-mcp-server/mcp-vs-agent/)) is that **the MCP is a context bridge, not a code generator**. The server returns a structured representation of what the user has selected; the agent decides what to do. This is the inversion of traditional API design: instead of a single high-level endpoint ("generate code from this frame"), the MCP exposes a library of composable primitives that an agent can orchestrate.

Client compatibility is treated as table stakes: Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, Codex, v0, Jules. The server speaks Streamable HTTP, not stdio — because the surface is hosted and multi-tenant.

**Takeaways for prompt-to-asset:**
- Treat the MCP as a context bridge over a library of primitives (`enhance_prompt`, `generate_logo`, `remove_background`, `vectorize`, `validate_asset`), not as a single "do everything" tool.
- Host it remotely with OAuth 2.1 so users don't run local servers.
- Target the same client list Figma and Linear target.

### 2. Linear MCP Server — the canonical "SaaS object system as agent surface"

Linear ships a remote MCP at `https://mcp.linear.app/mcp` implementing the authenticated remote MCP spec with **OAuth 2.1 + dynamic client registration** ([linear.app/docs/mcp](https://linear.app/docs/mcp), [developers.linear.app/docs/linear-mcp-server](https://developers.linear.app/docs/linear-mcp-server)). Tools fall into three verbs over the domain model: find, create, update — over issues, projects, comments, cycles. Explicit client support: Claude.ai, Claude Desktop, Claude Code, Cursor, VS Code, Codex, Jules, v0, Windsurf.

The architectural pattern Linear demonstrates is **parity with the web app's action vocabulary**. Every button in the Linear UI (create issue, assign, comment, move to project, change status) has a corresponding tool. Nothing is "UI-only." This is Parity (as defined by the [agent-native-architecture skill](https://playbooks.com/skills/everyinc/compound-engineering-plugin/agent-native-architecture)) in production.

**Takeaways for prompt-to-asset:**
- Every button on the website must have a tool. If the user can "enhance prompt, generate logo, pick 3 variants, resize for iOS, download brand bundle" via the UI, the agent must have `enhance_prompt`, `generate_logo`, `select_variant`, `resize_for_platform`, `export_brand_bundle`.
- Use `mcp.prompt-to-asset.dev/mcp` style hosted remote endpoint with OAuth 2.1 so IDE integrations are zero-config.

### 3. Gamma API + MCP — the canonical "async generation with polling"

Gamma's architecture ([developers.gamma.app](https://developers.gamma.app/get-started), [/mcp/mcp-tools-reference](https://developers.gamma.app/mcp/mcp-tools-reference)) is instructive because it solves the same problem we face: generation is slow and async.

The pattern is three calls:
1. `POST /v1.0/generations` → returns `generationId`.
2. `GET /v1.0/generations/{id}` polled every 5s until `status = completed | failed`.
3. Result includes `gammaUrl` (view) and `exportUrl` (download as PDF/PPTX/PNG).

Parameters include `format`, `textMode`, `themeId` (brand theme), `numCards`, `exportAs`, `imageOptions.source`, `textOptions.tone`. The **MCP mirrors the REST** — same endpoints, same parameter vocabulary, different transport.

**Takeaways for prompt-to-asset:**
- Expect image generation to take 5–30s. Design `generate_logo` as a kickoff that returns a job id plus a progress URL, or use SSE/Streamable HTTP notifications. Don't block the MCP call for 30s.
- Accept a `brandBundleId` parameter analogous to Gamma's `themeId` — a pre-configured brand that gets injected into every generation.
- Return both a human-viewable URL (`/library/<id>`) and a machine-consumable `exportUrl` or file bytes.

### 4. Vercel v0 + `vercel-labs/open-agents` — the canonical OSS architecture

Vercel's [`open-agents`](https://github.com/vercel-labs/open-agents) reference (3.8k★) separates three layers explicitly:
- **Web layer** (Next.js): auth, sessions, chat, streaming UI.
- **Agent workflow**: durable workflow running outside any sandbox.
- **Sandbox VM**: filesystem, shell, git, dev servers; interacted with via tools.

v0's platform MCP ([`v0-platform-mcp`](https://registry.npmjs.org/v0-platform-mcp)) additionally exposes UI-generation primitives: `prepare_prototype_context`, `generate_prototype`, `handoff_to_claude_dev`. v0 also now supports **custom user-supplied MCP servers** so a v0-generated app can call out to databases, Stripe, Slack, etc. ([Vercel's announcement via ZHC](https://www.zhcinstitute.com/research/vercel-mcp-servers-api/)).

**Takeaways for prompt-to-asset:**
- Separate the generation worker from the web layer; let the web app and the MCP both enqueue jobs to the same worker.
- Publish our MCP to the v0 registry so v0 users can invoke `prompt-to-asset` during app scaffolding.

### 5. Cursor Background Agents — the agent-as-first-class-user pattern

Cursor's Background Agent API ([docs.cursor.com/en/background-agent/api/overview](https://docs.cursor.com/en/background-agent/api/overview), ref impl [samuelbalogh/cursor-background-agent-mcp](https://github.com/samuelbalogh/cursor-background-agent-mcp)) demonstrates a clean-architecture TypeScript MCP server with endpoints `POST /v0/agents`, `GET /v0/agents`, `POST /v0/agents/{id}/followup`, `GET /v0/agents/{id}/conversation`. The structural lesson is the layering — `domain/`, `application/`, `infrastructure/`, `presentation/` — which keeps the MCP "presentation" layer swappable with a REST or gRPC layer. Our plugin should adopt the same separation so the MCP tools, the Next.js API routes, and the CLI all call the same `application/` use-cases.

### 6. Single-repo Next.js + MCP pattern — the minimum viable shape

The pragmatic OSS recipe — validated by [`vercel-labs/mcp-for-next.js`](https://github.com/vercel-labs/mcp-for-next.js/), [`run-llama/mcp-nextjs`](https://github.com/run-llama/mcp-nextjs), Emily Xiong's Nx monorepo writeup, and Anthropic's [`modelcontextprotocol/example-remote-server`](https://github.com/modelcontextprotocol/example-remote-server) — converges on:

```
app/
  page.tsx                    # website at /
  api/[transport]/route.ts    # MCP endpoint at /api/mcp and /api/sse
lib/
  tools/
    enhance-prompt.ts         # shared handler
    generate-logo.ts
    ...
```

With [`vercel/mcp-adapter`](https://github.com/vercel/mcp-adapter)'s `createMcpHandler` exporting a single handler as `GET` and `POST` on the `/api/[transport]` route, one process serves both the website (Next.js SSR) and the MCP server. The UI's "Generate" button and the MCP `generate_logo` tool call the **same function in `lib/tools/`** — making Parity structural, not aspirational.

For SSE + multi-instance deployments, Redis via `REDIS_URL` is the documented pattern; Fluid Compute on Vercel Pro with `maxDuration: 800` handles long generations.

### 7. WebMCP — the emerging browser-native variant

Co-developed by Google and Microsoft, [WebMCP](https://medium.com/@zaninihugo/moving-beyond-screen-scraping-creating-an-agent-native-web-app-with-webmcp-4818552e1e11) adds `navigator.modelContext` so a webpage can register tools discoverable by a browser-resident agent. W3C draft landed February 2026; Chrome 146 Canary ships it behind a flag. Benefits: 68–90% token reduction vs. screenshot automation, deterministic tool calls, HTTPS + origin scoping, `SubmitEvent.agentInvoked` for backend audit.

**Takeaways:** While our v1 should lead with a server-side MCP, the website should register the same tools via `navigator.registerTool()` so a browser agent visiting `prompt-to-asset.dev` gets the same surface. This is a near-zero-cost extension once the server tools exist.

---

## Gap Analysis

### What already exists

| Project | Shape | Stars | Web UI | MCP | Skills | Prompt enhancement | Multi-model | Brand bundle | OSS resizer | Gap |
|---|---|---:|---|---|---|---|---|---|---|---|
| [Nutlope/logocreator](https://github.com/Nutlope/logocreator) | Next.js web app | 6.8k | ✅ | ❌ | ❌ | minimal templates | Flux only | ❌ | ❌ | no agent surface |
| [mcpware/logoloom](https://github.com/mcpware/logoloom) | npx MCP | 2 | ❌ | ✅ | Claude/Cursor only | ❌ | no AI model — SVG tpl | ❌ | partial (31-file kit) | no website, no research |
| [arekhalpern/mcp-logo-gen](https://github.com/arekhalpern/mcp-logo-gen) | Python MCP | low | ❌ | ✅ | implicit | ❌ | FAL AI only | ❌ | partial (3 sizes) | single model, no UI |
| [niels-oz/icon-generator-mcp](https://github.com/niels-oz/icon-generator-mcp) | TS MCP | low | ❌ | ✅ | implicit | ❌ | SVG templating | ❌ | ❌ | icons only, no UI |
| [appicon.co](https://appicon.co) (proprietary) | Website | n/a | ✅ | ❌ | ❌ | n/a | n/a | ❌ | ✅ | closed, no API |
| [pwa-asset-generator](https://www.npmjs.com/package/pwa-asset-generator) | CLI | high | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ✅ | no AI, no MCP |
| [akabekobeko/npm-icon-gen](https://github.com/akabekobeko/npm-icon-gen) | npm lib | 175+ | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ✅ (ico, icns, favicon) | lib only |
| [SuavePlan/iconz](https://github.com/SuavePlan/iconz) | Bun CLI | low | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | ✅ | no AI, no MCP |

### The gap, stated precisely

**No repository on GitHub in 2026 ships the full tri-surface (website + hosted MCP + cross-IDE skill pack) for AI-driven logo/icon/asset generation, grounded by prompt-enhancement research and a machine-readable brand bundle.**

Decomposing the gap:

1. **UX gap.** `Nutlope/logocreator` has the best web UX but no agent surface. Agent-native tools (LogoLoom, mcp-logo-gen, icon-generator-mcp) have no website — a developer evaluating them on GitHub has no live demo, no library, no shareability.

2. **Research gap.** Every existing tool treats prompting as a passthrough of the user's raw string. None applies the body of knowledge this very compendium is producing: T2I prompt decomposition (category 01), model-specific phrasing for Imagen vs. Flux vs. `gpt-image-1` (04–07), transparency techniques (13), negative prompts for logo artifacts (14), style tokens for consistency across a set (15). Our `enhance_prompt` tool becomes the thin edge of a thick wedge.

3. **Multi-model gap.** Each tool is single-provider: LogoCreator = Flux on Together; mcp-logo-gen = FAL; LogoLoom = template-only (no AI). A model router — "use Imagen-4 for flat brand logos, Flux for photoreal hero art, Recraft V3 when the user says 'vector', `gpt-image-1` when alpha transparency matters" — does not exist in OSS for this category.

4. **Post-processing gap.** No existing OSS combines AI generation with (a) alpha-safe background removal (BRIA RMBG 2.0 / BiRefNet), (b) vectorization (vtracer / potrace / Recraft native), (c) platform-correct resize (iOS 1024→all, Android adaptive, favicon ico/png, PWA manifest). Each piece exists separately (category 16–18 research); nothing stitches them with AI generation behind a single tool call.

5. **Brand bundle gap.** [brandspec](https://brandspec.dev/), [brand.md](https://github.com/thebrandmd/brand.md), and [AdCP brand.json](https://docs.adcontextprotocol.org/docs/brand-protocol) define the *format*; no asset-generation tool *consumes* them. Our tools should accept a `brandBundleId` or inline `brand.md` and inject it into every generation prompt, color palette, and typography choice.

6. **Cross-IDE delivery gap.** Every existing tool documents one or two clients (typically Claude + Cursor). None ships a single-command installer for Claude Code / Cursor / Windsurf / Gemini CLI / Codex / VS Code / Zed. The agent-native-architecture skill argues delivery is part of the product; we should treat it that way.

7. **Appicon.co gap.** The iconic post-processing webapp `appicon.co` is proprietary, ad-laden, and has no API. An OSS replacement — drop a 1024×1024, get every iOS/Android/PWA/favicon asset — baked into our web UI and exposed as `resize_icon_set` tool is a standalone value prop.

---

## Proposed v1 Feature List

The following is the concrete buildout that closes every identified gap. Each item maps to a Parity requirement (UI action ↔ MCP tool ↔ Skill slash-command).

### Surface 1 — Web UI at `/`

- **Landing + chat-style input.** Natural-language field: *"transparent PNG logo for my note-taking app called Riffle — teal, playful, modern."*
- **Brand bundle picker.** Upload/select `brand.md` / `brand.yaml` / `brand.json`; preview parsed tokens.
- **Enhancement preview.** Show the user-authored prompt, the enhanced prompt, and the per-model specialized prompts side-by-side (education + trust).
- **Multi-variant grid.** Render 4–6 variants across the routed models.
- **Post-processing panel.** One-click: remove background (alpha-safe), vectorize, resize to platform preset (iOS app icon set, Android adaptive, favicon pack, OG/Twitter).
- **Library + history.** Per-user gallery; re-download; re-prompt from any past asset.
- **Brand bundle export.** Download a zip matching the brandspec/brand.md schema plus every generated asset and its variants.
- **Agent-parity panel.** A literal sidebar showing "This page is available to agents. Copy install command for Claude Code / Cursor / Windsurf / Gemini CLI / Codex."

### Surface 2 — MCP server at `/api/mcp` (Streamable HTTP + SSE)

All tools backed by shared `lib/tools/` handlers also used by the UI:

- `enhance_prompt({ user_prompt, asset_type, target_model?, brand_bundle? }) → { enhanced_prompt, model_specific_variants[], negative_prompt, rationale }`
- `generate_logo({ prompt, style?, palette?, brand_bundle?, model?, count?, transparent? }) → { job_id, assets[] }`
- `generate_icon_set({ prompt, platforms[] = ["ios","android","pwa","favicon"], brand_bundle? })`
- `generate_illustration({ prompt, aspect_ratio, style, brand_bundle? })`
- `generate_og_image({ title, subtitle?, brand_bundle?, theme })`
- `remove_background({ asset_id | image_url, model?: "bria-rmbg-2.0" | "birefnet" | "u2net" })`
- `vectorize({ asset_id | image_url, backend?: "vtracer" | "potrace" | "recraft" })`
- `resize_icon_set({ source_1024, platforms[] })` — the OSS appicon.co replacement.
- `validate_asset({ asset_id, checks?: ["alpha","palette","text-legibility","contrast","safe-zone"] })`
- `route_model({ asset_type, requirements }) → { chosen_model, reasoning }` (introspect the router)
- `brand_bundle_parse({ text | url }) → Brand` and `brand_bundle_export({ generation_id })`
- `list_history({ filter? })`, `get_asset({ id })`, `rename_asset`, `delete_asset`.

Schema-validated with Zod; registered via `mcp-handler.createMcpHandler`; OAuth 2.1 via NextAuth or Clerk; Redis-backed job queue for async generations; webhook or SSE for progress.

### Surface 3 — IDE skill / plugin pack

A single source-of-truth spec compiled into per-IDE artifacts:

- **Claude Skill** (`~/.claude/skills/prompt-to-asset/SKILL.md`) with slash-commands `/enhance`, `/logo`, `/iconset`, `/og` and a SKILL.md that tells Claude to prefer our MCP tools over raw image generation.
- **Cursor rule** (`.cursor/rules/prompt-to-asset.mdc`) plus `.cursor/mcp.json` auto-config snippet.
- **Windsurf rule** (`.windsurfrules` + MCP config).
- **Gemini CLI extension** (`~/.gemini/extensions/prompt-to-asset/`) exposing the same tools as Gemini function-calling declarations.
- **Codex custom plugin** manifest pointing at the hosted MCP.
- **VS Code + GitHub Copilot**: `mcp.json` snippet.
- **Zed**: `context_servers` snippet.

One command: `npx prompt-to-asset init` detects installed IDEs and writes all of them.

### Surface 4 — Brand bundle format

Adopt `brand.md` ([thebrandmd/brand.md](https://github.com/thebrandmd/brand.md)) as the human-editable source because it matches AGENTS.md's ergonomics; compile to `brand.yaml` (brandspec) and `brand.json` (AdCP) for machine consumers. Every tool accepts any of the three. Fields we care about for asset gen: `colors[]` (OKLCH preferred), `typography.primary/secondary`, `logo.variants`, `personality`, `guardrails`, `imagery.style`, `do_not[]`.

### Surface 5 — Cache / library / history

Per-user Postgres-backed library keyed by content hash of (enhanced prompt + model + seed + brand bundle hash). Deduplicates generations. Every asset has a stable URL, a provenance record (which model, which prompt, which brand bundle version), and downloadable original + processed variants. This is the equivalent of Gamma's `gammaUrl` + `exportUrl`.

### Surface 6 — Open-source `appicon.co` inside the app

A dedicated `/tools/appicon` route and a `resize_icon_set` MCP tool wrapping [`akabekobeko/npm-icon-gen`](https://github.com/akabekobeko/npm-icon-gen) + [`pwa-asset-generator`](https://www.npmjs.com/package/pwa-asset-generator) for full platform coverage: iOS `AppIcon.appiconset`, Android `mipmap-*` + adaptive foreground/background, PWA `manifest.json` + icons, favicon `.ico` + PNG set, macOS `.icns`, Windows tiles, OG/Twitter.

---

## Differentiation Story

Why this plugin wins when every piece is technically replicable:

1. **Research-grounded prompt enhancement is the wedge.** The 20-category / 100-subagent compendium this plugin is built on is not reproducible in a weekend. `enhance_prompt` is backed by cataloged failure modes from categories 13 (transparency), 14 (artifacts), 15 (style consistency) and model-specific prompting from 04–07. Every competitor's `enhance_prompt` (if they add one) will look thin next to ours.

2. **Multi-model routing is table stakes we pre-commoditize.** Instead of locking to one provider like LogoCreator (Flux) or mcp-logo-gen (FAL), we route: Imagen-4/Nano Banana for flat/illustrated logos, Flux.1 pro for photoreal, Recraft V3 when SVG is required, `gpt-image-1` when alpha is required. Users never have to know.

3. **Asset-specific post-processing wins trust.** Users don't want "an image" — they want an iOS app icon set they can drop into Xcode. Bundling generation + BRIA RMBG + vtracer + npm-icon-gen + pwa-asset-generator behind one tool call is a category-defining UX.

4. **Brand bundle injection compounds.** After the first asset, the user has a brand bundle. Every subsequent call stays on-brand automatically. This is an integration moat, not a feature.

5. **Cross-IDE delivery is a distribution moat.** Most MCP tools document Claude + Cursor. We target Claude Code, Cursor, Windsurf, Gemini CLI, Codex, VS Code, Zed, and v0 — one-command install for each. Wherever a developer already lives, our tools are one install away.

6. **OSS-licensed end-to-end replaces appicon.co.** The baked-in `resize_icon_set` is a standalone reason to visit, share, and install.

7. **Agent-parity as a public feature, not an internal discipline.** A sidebar on every page literally saying "This action is also available as `generate_logo` to agents via our MCP; copy install command" teaches users the shape of the new web and positions the plugin as a flagship exemplar.

In short: commodity models + a research moat + a stitched post-processing pipeline + a brand-bundle memory + cross-IDE delivery = a product whose closest analog is *Figma for AI-generated brand assets that both designers and coding agents can drive*.

---

## References

### Reference architectures
- Figma MCP Server: [developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server), [/mcp-vs-agent/](https://developers.figma.com/docs/figma-mcp-server/mcp-vs-agent/), [/write-to-canvas/](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/), [github.com/figma/mcp-server-guide](https://github.com/figma/mcp-server-guide/)
- Linear MCP Server: [linear.app/docs/mcp](https://linear.app/docs/mcp), [developers.linear.app/docs/linear-mcp-server](https://developers.linear.app/docs/linear-mcp-server), [mcp.linear.app](https://mcp.linear.app/)
- Gamma API + MCP: [developers.gamma.app/get-started](https://developers.gamma.app/get-started), [developers.gamma.app/mcp/mcp-tools-reference](https://developers.gamma.app/mcp/mcp-tools-reference), [developers.gamma.app/reference/generate-a-gamma](https://developers.gamma.app/reference/generate-a-gamma)
- Vercel v0 + Open Agents: [github.com/vercel-labs/open-agents](https://github.com/vercel-labs/open-agents) (3.8k★), [v0-platform-mcp on npm](https://registry.npmjs.org/v0-platform-mcp)
- Cursor Background Agents: [docs.cursor.com/en/background-agent/api/overview](https://docs.cursor.com/en/background-agent/api/overview), [github.com/samuelbalogh/cursor-background-agent-mcp](https://github.com/samuelbalogh/cursor-background-agent-mcp)

### OSS web-app + MCP patterns
- [github.com/vercel/mcp-adapter](https://github.com/vercel/mcp-adapter) (`mcp-handler`)
- [github.com/vercel-labs/mcp-for-next.js](https://github.com/vercel-labs/mcp-for-next.js/)
- [github.com/run-llama/mcp-nextjs](https://github.com/run-llama/mcp-nextjs)
- [github.com/modelcontextprotocol/example-remote-server](https://github.com/modelcontextprotocol/example-remote-server)
- [Vercel: MCP server support changelog](https://vercel.com/changelog/mcp-server-support-on-vercel)
- [Vercel template: MCP Server on Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- Emily Xiong — *Turning a Web App into an MCP Server with Monorepo*: [emilyxiong.medium.com/…](https://emilyxiong.medium.com/turning-a-web-app-into-an-mcp-server-with-monorepo-aa17c2320b06)

### WebMCP / agent-native discourse
- [github.com/MiguelsPizza/WebMCP](https://github.com/MiguelsPizza/WebMCP)
- Hugo Zanini — *Moving Beyond Screen Scraping: Creating an Agent-Native Web App with WebMCP* (Feb 2026): [medium.com/@zaninihugo/...](https://medium.com/@zaninihugo/moving-beyond-screen-scraping-creating-an-agent-native-web-app-with-webmcp-4818552e1e11)
- Stephan Köpp — *WebMCP: Making Your Web App Agent-Ready* (Apr 2026): [pub.towardsai.net/...](https://pub.towardsai.net/webmcp-making-your-web-app-agent-ready-d7d4d9cb790d)
- Scalekit — *WebMCP explained*: [scalekit.com/blog/webmcp-the-missing-bridge-…](https://www.scalekit.com/blog/webmcp-the-missing-bridge-between-ai-agents-and-the-web)
- agent-native-architecture skill (Parity principle): [playbooks.com/skills/everyinc/compound-engineering-plugin/agent-native-architecture](https://playbooks.com/skills/everyinc/compound-engineering-plugin/agent-native-architecture)
- *MCP Is Not Your REST API: 5 Principles*: [docs.agentinterviews.com/blog/mcp-not-rest-actions-not-crud/](https://docs.agentinterviews.com/blog/mcp-not-rest-actions-not-crud/)

### Existing logo / icon / asset generators (competitive landscape)
- [github.com/Nutlope/logocreator](https://github.com/Nutlope/logocreator) — Next.js + Flux, 6.8k★
- [github.com/mcpware/logoloom](https://github.com/mcpware/logoloom) — MCP-native, 2★
- [github.com/arekhalpern/mcp-logo-gen](https://github.com/arekhalpern/mcp-logo-gen) — Python MCP + FAL
- [github.com/niels-oz/icon-generator-mcp](https://github.com/niels-oz/icon-generator-mcp) — TypeScript MCP, SVG
- [github.com/akabekobeko/npm-icon-gen](https://github.com/akabekobeko/npm-icon-gen) — 175★ icon converter
- [pwa-asset-generator](https://www.npmjs.com/package/pwa-asset-generator) — 18.3k weekly DLs
- [iconerator-next](https://registry.npmjs.org/iconerator-next), [SuavePlan/iconz](https://github.com/SuavePlan/iconz), [mobile-icon-resizer](https://www.npmjs.com/package/mobile-icon-resizer)

### Brand bundle formats
- brandspec: [brandspec.dev](https://brandspec.dev/)
- brand.md: [github.com/thebrandmd/brand.md](https://github.com/thebrandmd/brand.md)
- AdCP Brand Protocol: [docs.adcontextprotocol.org/docs/brand-protocol](https://docs.adcontextprotocol.org/docs/brand-protocol)
- ClaudeKit `ckm:brand` skill: [docs.claudekit.cc/docs/marketing/skills/brand](https://docs.claudekit.cc/docs/marketing/skills/brand)
- bundle.social — *AI Brand Voice XML*: [info.bundle.social/blog/how-to-create-ai-brand-voice-xml](https://info.bundle.social/blog/how-to-create-ai-brand-voice-xml)
