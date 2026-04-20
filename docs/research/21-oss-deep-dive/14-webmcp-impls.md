---
wave: 1
role: niche-discovery
slug: 14-webmcp-impls
title: "WebMCP / in-browser MCP — implementations & demos"
date: 2026-04-19
sources:
  - https://webmachinelearning.github.io/webmcp/
  - https://github.com/webmachinelearning/webmcp
  - https://github.com/MiguelsPizza/WebMCP
  - https://github.com/WebMCP-org/npm-packages
  - https://www.npmjs.com/package/@mcp-b/webmcp-polyfill
  - https://docs.mcp-b.ai/
  - https://docs.mcp-b.ai/explanation/webmcp/standard-api
  - https://docs.mcp-b.ai/explanation/webmcp/browser-support-and-flags
  - https://docs.mcp-b.ai/packages/webmcp-polyfill
  - https://github.com/mcpcat/webmcp-react
  - https://mcpcat.io/guides/register-first-webmcp-tool
  - https://mcpcat.io/guides/dynamically-register-unregister-webmcp-tools
  - https://github.com/up2itnow0822/webmcp-sdk
  - https://github.com/WebMCP-org/ai-tinkerers-webmcp-demo
  - https://autowebmcp.dev/demo
  - https://andrey-markin.com/projects/webmcp-example
  - https://ricmac.org/2026/03/11/webmcp-ai-agents-interact-website/
  - https://www.ivanturkovic.com/2026/02/23/webmcp-tutorial-make-website-agent-ready
  - https://github.com/webmachinelearning/webmcp/issues/57
  - https://github.com/webmachinelearning/webmcp/issues/101
  - https://github.com/webmachinelearning/webmcp/issues/121
  - https://github.com/webmachinelearning/webmcp/blob/main/docs/security-privacy-considerations.md
  - https://support.anthropic.com/en/articles/12012173-getting-started-with-claude-for-chrome
  - https://docs.anthropic.com/en/docs/claude-code/chrome
  - https://ui.shadcn.com/docs/registry/mcp
  - https://sdk.vercel.ai/docs/ai-sdk-core/mcp-tools
  - https://github.com/vercel/mcp-adapter
tags: [webmcp, browser, w3c, chrome, progressive-enhancement]
---

# WebMCP / in-browser MCP — implementations & demos

## What this niche is

**WebMCP** lets a page expose MCP-style tools directly from client-side
JavaScript, so a browser-hosted agent can call `search_flight(...)` on the
page itself instead of scraping the DOM or routing through a remote MCP
server. The surface is one global: `navigator.modelContext`. The page calls
`registerTool({name, description, inputSchema, execute})` and the browser
(or a bridging extension) hands those tools to whichever agent is driving
the session. It is the *page-local* analog of the remote MCP servers
surveyed in `19b`/`20e` — same primitives, same JSON Schemas, but
inheriting the user's existing session, cookies, and permissions.

## Canonical specs and ecosystems

### W3C WebMCP spec (the authoritative reference)

- **URL:** <https://webmachinelearning.github.io/webmcp/>
- **Status:** *Draft Community Group Report*, updated 17 April 2026,
  published by the W3C Web Machine Learning Community Group. Not on the
  Standards Track yet; CG draft under the W3C CLA.
- **What it defines:** `partial interface Navigator` with a
  `[SecureContext, SameObject] readonly attribute ModelContext modelContext`,
  a `ModelContext` interface with `registerTool(tool, options)`, a
  `ModelContextTool` dictionary (`name`, `title`, `description`,
  `inputSchema`, `execute`, `annotations.readOnlyHint`), a
  `ModelContextClient.requestUserInteraction(callback)` escape hatch for
  human-in-the-loop confirmations, and an `AbortSignal`-based
  unregistration path (`options.signal`). Names: 1–128 chars, ASCII
  alphanumeric + `_ - .`. Secure context only.
- **Unfinished sections:** §4.3 Declarative WebMCP (deriving JSON Schema
  from `<form>` elements) is a TODO pointing at
  [PR #76](https://github.com/webmachinelearning/webmcp/pull/76); §5
  Security/Privacy and §6 Accessibility are stubs; iframe support
  ([issue #57](https://github.com/webmachinelearning/webmcp/issues/57)) is
  deliberately not yet in scope.

### MiguelsPizza/WebMCP (the incubator repo)

- **URL:** <https://github.com/MiguelsPizza/WebMCP> · ~1,053★ · original
  explainer that seeded the W3C work. Now folded into
  `webmachinelearning/webmcp` (CG) and the `WebMCP-org` GitHub org.
  Author **Alex Nahas** is credited in the W3C spec's acknowledgements.
  Requirements: browser-side, polyfill or Chrome 146+ flag. Permissive
  licensing inherited by downstream `WebMCP-org` packages.

### mcp-b.ai / WebMCP-org npm packages (the usable runtime today)

- **Docs:** <https://docs.mcp-b.ai/> · **Repo:**
  <https://github.com/WebMCP-org/npm-packages> · **License:** MIT.
- **`@mcp-b/webmcp-polyfill`** — installs `navigator.modelContext` in
  browsers that don't have it, minus the MCP-B extension bits
  (prompts/resources/transport). One call: `initializeWebMCPPolyfill()`,
  then `registerTool(...)` works cross-browser.
- **`@mcp-b/global`** — polyfill + prompts/resources/transport bridge.
- **`@mcp-b/extension-tools`** — wraps 62+ Chrome Extension APIs (tabs,
  bookmarks, history, storage, scripting) as MCP tool classes so a page
  or extension can expose browser primitives.
- **MCP-B Chrome extension** — <https://chromewebstore.google.com/> —
  collects WebMCP tools from open tabs, multiplexes them into a single
  MCP server that Claude Desktop / Claude Code / any stdio MCP client
  can mount. This is how WebMCP tools reach today's agents until native
  hosts ship.

### MCPcat / webmcp-react (React idioms)

- **Repo:** <https://github.com/mcpcat/webmcp-react> ·
  `<WebMCPProvider>` + `useMcpTool({name, description, input: zodSchema,
  handler})`. Registration is tied to React's lifecycle — mount ⇒
  `registerTool`, unmount ⇒ `unregisterTool`. Makes role-gated tools
  trivial: render the admin tool only when `role === 'admin'` and it
  disappears from the agent's surface automatically.

### Third-party SDKs

- **`up2itnow0822/webmcp-sdk`** — TypeScript fluent-builder toolkit with
  rate limiting, input sanitization, and audit-logging middleware. Less
  mature than `@mcp-b/*`; useful as a security-middleware reference.

## Chrome shipping status

- **Chrome 146** (February 2026, Canary/Beta) — first native implementation.
  Enabled via `chrome://flags/#enable-webmcp-testing` **or** the general
  `--enable-experimental-web-platform-features` launch flag. A companion
  **Model Context Tool Inspector** extension ships on the Chrome Web Store
  for listing and executing registered tools from DevTools. A testing-only
  `navigator.modelContextTesting` surface (`listTools()`, `executeTool()`)
  exists behind the same flag.
- **Edge** — tracking Chromium, expected to follow silently.
- **Firefox, Safari** — participating in the W3C CG but no implementation
  intent signaled as of April 2026.
- **Formal announcement** expected around Google I/O 2026; until then
  assume the flag-gated channel and plan polyfill for everyone else.

## Real demos exposing page state to agents

- **auto-webmcp.dev/demo** — declarative form bridge. Adds two HTML
  attributes (`toolname`, `tooldescription`) to existing `<form>`s and
  auto-derives JSON Schemas from the fields. Ships an agent simulator.
  Highest-fidelity demo of the progressive-enhancement path §4.3 of the
  spec is moving toward.
- **andrey-markin.com/projects/webmcp-example** — Next.js + oRPC task
  manager with five tools (`tasks.list/get/create/update/delete`). Runs
  on Chrome 146's native `navigator.modelContext`; good modern-stack
  reference.
- **WebMCP-org/ai-tinkerers-webmcp-demo** — in-browser RAG with
  Transformers.js + Dexie, exposing `rag_ingest/search/stats/get_chunk`.
  Proves heavy client-side workloads (embeddings, vector search) are
  legitimate WebMCP tools.
- **ricmac.org** (Mar 2026) — small WordPress site with
  `subscribe_newsletter` (Jetpack) and `find_in_article` tools.
- **ivanturkovic.com** (Feb 2026) — plain-HTML tutorial on the
  declarative-attribute approach.

Demo quality: *experimental but coherent*. Tools return structured JSON,
not stringified HTML.

## Anthropic's "computer use browser side" — the adjacent lane

Anthropic took the **opposite bet**: drive whatever is on screen rather
than wait for pages to register tools. Two shipping products matter:

- **Claude in Chrome extension** — beta since Dec 2025, all paid plans.
  Side-panel control with navigation, clicks, form fill, tab management,
  DOM/console read, workflow recording, scheduled runs; integrates with
  Claude Code for build/test/verify loops.
- **Computer-use on Mac** (Cowork/Claude Code research preview) — app
  control with an explicit fallback hierarchy: *connectors → browser
  control → full screen control*.

Neither uses `navigator.modelContext`. The two approaches are
**complementary**: WebMCP is the fast path when the page has opted in;
computer-use is the always-available fallback. The threat model for
`prompt-to-asset` is that Anthropic ships Claude-in-Chrome to every user
*today* while native WebMCP hosts take another year to reach majority.

## shadcn status

Clarification: **shadcn/ui itself does not ship a `navigator.modelContext`
example**. shadcn ships an MCP server for its *component registry*
(<https://ui.shadcn.com/docs/registry/mcp>) — `search_items_in_registries`,
`view_items_in_registries`, `list_items_in_registries` — consumed by IDE
agents, not page-side WebMCP. The registry MCP is a useful "one schema,
many surfaces" pattern but should not be cited as a WebMCP demo.

## What "registerTool" from the page actually does today

Behind the Chrome 146 flag or the polyfill, the lifecycle is:

1. Page calls `registerTool({name, description, inputSchema, execute,
   annotations: {readOnlyHint}})`. Duplicates throw `InvalidStateError`;
   empty `name`/`description` are rejected; `inputSchema` is serialized
   and validated.
2. Tools only live in the **top-level browsing context** — iframes are
   explicitly out of scope ([issue #57](https://github.com/webmachinelearning/webmcp/issues/57)).
3. A browser-native agent reads the tool map directly. External MCP
   clients (Claude Desktop, Cursor) reach the tools via the MCP-B
   extension, which multiplexes per-tab tools into a local stdio MCP
   server.
4. `options.signal` (AbortSignal) is the idiomatic unregister mechanism.
5. `ModelContextClient.requestUserInteraction(callback)` is the
   human-in-the-loop escape hatch for confirmations (spec-level TODO,
   partial polyfill implementations via modal dialogs).

## Known sharp edges

- **`provideContext()` clears tools silently** — the non-standard MCP-B
  superset method bypasses `registerTool`'s duplicate-name protection;
  any third-party script that reaches it can overwrite official tools
  ([issue #101](https://github.com/webmachinelearning/webmcp/issues/101)).
  TOFU-style trust is under discussion. Stay on strict W3C
  `registerTool` + the polyfill's `@mcp-b/webmcp-polyfill` (not
  `@mcp-b/global`) to avoid this surface.
- **Iframe embedding undefined** — no tools from cross-origin iframes
  today; Permissions-Policy / Document-Policy negotiation is proposed
  but not specified. Third-party SaaS widgets can't currently contribute
  tools to their host.
- **Tool-impersonation via deceptive descriptions** — same class of risk
  as any MCP server; needs server-side verification for any write tool.

## Integration recommendations

**Ship WebMCP as progressive enhancement in v1; do not make any product
flow depend on it.** Chrome-146-flag users are a tiny, hand-raising
audience; the spec is a CG draft; Firefox and Safari have not committed.
Our authoritative agent surface remains the hosted remote MCP server
(`/api/[transport]` via `vercel/mcp-adapter`) and the seven cross-IDE
skill envelopes from Category 19.

Concretely:

1. **One module** (`apps/web/app/webmcp.client.ts`) that, once
   `navigator.modelContext` is present (native or polyfilled), mirrors
   the *read-only* MCP tools onto the page: `enhance_prompt`,
   `validate_asset`, `list_history`, `brand_bundle_parse`,
   `get_current_generation`. Mark them `annotations.readOnlyHint: true`
   so Chromium-native agents auto-approve. Keep write/generate tools
   off WebMCP until tool-impersonation mitigations land.
2. **Polyfill: `@mcp-b/webmcp-polyfill` (MIT)** — the strict W3C
   surface. Avoid `@mcp-b/global` and the `provideContext()` superset
   until the overwrite issue resolves.
3. **React: `webmcp-react`'s `useMcpTool`** so tool visibility follows
   component lifecycle — brand-bundle tool exists only when a bundle is
   loaded; admin-regenerate only for signed-in owners.
4. **Share schemas with the remote MCP server.** The `schemas/*.json`
   artifacts from Category 19 already feed Gemini `FunctionDeclaration`s
   and MCP `inputSchema`s; drive WebMCP registration from the same
   files. Zero schema drift is the point of the dual surface.
5. **Recommend the MCP-B extension in our docs** as the Claude
   Desktop/Code bridge while native hosts roll out — day-one value for
   non-Canary users.
6. **Plan polyfill deprecation** at Chrome unflag (expected Google I/O
   2026): skip polyfill import when native `navigator.modelContext` is
   truthy and the UA reports Chrome ≥ the unflag version.

**Wait** on declarative WebMCP (§4.3), cross-iframe tool declaration
(#57), and Firefox/Safari positions before treating WebMCP as a primary
surface. Revisit at Chrome unflag or the next spec publication.
