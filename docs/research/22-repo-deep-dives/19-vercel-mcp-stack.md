---
wave: 2
role: repo-deep-dive
slug: 19-vercel-mcp-stack
title: "Deep dive: vercel/mcp-adapter + mcp-for-next.js + mcp-nextjs"
repo: "https://github.com/vercel/mcp-adapter"
license: "Apache-2.0 (mcp-handler), MIT (mcp-for-next.js), MIT (mcp-nextjs)"
date: 2026-04-19
sources:
  - https://github.com/vercel/mcp-handler
  - https://github.com/vercel/mcp-adapter
  - https://raw.githubusercontent.com/vercel/mcp-handler/main/README.md
  - https://raw.githubusercontent.com/vercel/mcp-handler/main/docs/AUTHORIZATION.md
  - https://raw.githubusercontent.com/vercel/mcp-handler/main/docs/ADVANCED.md
  - https://raw.githubusercontent.com/vercel/mcp-handler/main/package.json
  - https://www.npmjs.com/package/mcp-handler
  - https://github.com/vercel-labs/mcp-for-next.js
  - https://raw.githubusercontent.com/vercel-labs/mcp-for-next.js/main/README.md
  - https://raw.githubusercontent.com/vercel-labs/mcp-for-next.js/main/app/mcp/route.ts
  - https://raw.githubusercontent.com/vercel-labs/mcp-for-next.js/main/package.json
  - https://raw.githubusercontent.com/vercel-labs/mcp-for-next.js/main/scripts/test-client.mjs
  - https://github.com/run-llama/mcp-nextjs
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/README.md
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/package.json
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/prisma/schema.prisma
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/src/app/mcp/%5Btransport%5D/route.ts
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/src/app/api/oauth/register/route.ts
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/src/app/api/oauth/token/route.ts
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/src/app/oauth/authorize/page.tsx
  - https://raw.githubusercontent.com/run-llama/mcp-nextjs/main/src/app/.well-known/oauth-protected-resource/route.ts
  - https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js
  - https://vercel.com/changelog/mcp-server-support-on-vercel
  - https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
  - https://vercel.com/blog/building-efficient-mcp-servers
  - https://vercel.com/docs/functions/fluid-compute
tags: [mcp-adapter, mcp-handler, nextjs, vercel, streamable-http, oauth, pkce, fluid-compute, redis]
---

# Deep dive — vercel/mcp-adapter + vercel-labs/mcp-for-next.js + run-llama/mcp-nextjs

## Why these three repos, together

Category 20 nominated **one MCP binary + one Next.js route at `/api/[transport]`** as the
convergent pattern for remote MCPs. Three artifacts codify it:

1. **`vercel/mcp-handler`** (formerly `@vercel/mcp-adapter`) — the *library*. Exports
   `createMcpHandler`, `withMcpAuth`, `protectedResourceHandler`. Apache-2.0. npm:
   `mcp-handler@1.1.0`, ~228.5K weekly downloads, 580★.
2. **`vercel-labs/mcp-for-next.js`** — the *minimal* starter: one route, no auth, no UI,
   no persistence. Ships with a Deploy-to-Vercel button. 352★, MIT (via Vercel examples
   bucket; no root `LICENSE` file but the official Vercel template listing is MIT).
3. **`run-llama/mcp-nextjs`** — the *OAuth-complete* template: full OAuth 2.1 authorization
   server (PKCE S256 + RFC 7591 DCR + authorization_code grant), Auth.js with Google as
   upstream IdP, Prisma + PostgreSQL, and a consent screen. 87★, MIT (Laurie Voss, 2025).

Our `prompt-to-asset` hosted MCP targets roughly template #3's sophistication on day one.

## `vercel/mcp-handler` — the `createMcpHandler` API surface

### Shape

```ts
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "roll_dice",
      {
        title: "Roll Dice",
        description: "Roll a dice with a specified number of sides.",
        inputSchema: { sides: z.number().int().min(2) },
      },
      async ({ sides }, extra) => {
        // extra.authInfo available when wrapped with withMcpAuth
        const value = 1 + Math.floor(Math.random() * sides);
        return { content: [{ type: "text", text: `🎲 You rolled a ${value}!` }] };
      },
    );
  },
  {
    // server capabilities — optional; forwarded to McpServer
    capabilities: { tools: { roll_dice: { description: "Roll a dice" } } },
  },
  {
    basePath: "/api",       // must match where [transport] sits in the URL
    maxDuration: 60,        // SSE ceiling in seconds
    verboseLogs: true,
    redisUrl: process.env.REDIS_URL, // pub/sub for SSE resumability
    disableSse: false,      // set true to run pure Streamable HTTP
  },
);

export { handler as GET, handler as POST, handler as DELETE };
```

### Transport behavior

`createMcpHandler` returns a single Web Fetch handler exported as `GET`/`POST`/`DELETE`.
Internally it dispatches on the `[transport]` path segment:

- `POST /{basePath}/mcp` → **Streamable HTTP** (recommended since MCP 2025-03-26, stateless).
- `GET /{basePath}/sse` + `POST /{basePath}/messages?sessionId=…` → legacy **HTTP+SSE**,
  still required by Claude Desktop/Claude.ai. Requires Redis on `REDIS_URL` for the
  `/messages` → `/sse` publish/subscribe fanout across serverless instances.
- `DELETE /{basePath}/mcp` → client-initiated Streamable HTTP session teardown.

`disableSse: true` leaves only Streamable HTTP. **stdio is not emitted by this library** —
it is a local-binary concern; stdio-only clients bridge via `npx -y mcp-remote <url>`.

### OAuth 2.1 hooks

- `withMcpAuth(handler, verifyToken, { required, requiredScopes, resourceMetadataPath })` —
  wraps the base handler. `verifyToken(req, bearerToken)` returns an `AuthInfo`
  (`{ token, scopes, clientId, extra }`) or `undefined`. `required: true` + undefined →
  401 with the RFC 9728 `WWW-Authenticate: Bearer resource_metadata=…` challenge header;
  scope mismatch → 403; success threads `AuthInfo` into every tool as `extra.authInfo`.
  An `experimental_withMcpAuth` alias (from [PR #39](https://github.com/vercel/mcp-adapter/pull/39))
  is still what Vercel's docs reference.
- `protectedResourceHandler({ authServerUrls })` — renders the RFC 9728 metadata doc.
- `metadataCorsOptionsRequestHandler()` — the paired `OPTIONS` preflight.

### Redis / KV session store

Redis is used *only* for SSE resumability and message fanout across serverless instances:
`/messages?sessionId=…` publishes into a Redis channel, the long-lived `/sse` stream on
another function consumes it; `Last-Event-ID` replays missed events. The dep is
`redis@^4` (node-redis TCP), **not** `@upstash/redis` REST — Vercel KV Redis works, Upstash
REST does not. In pure Streamable HTTP mode (`disableSse: true`), Redis is unnecessary.

### Vercel Fluid compute requirements

Fluid (Vercel's 2025 execution model) is **required**. It allows `maxDuration` up to 800s
on Pro/Enterprise (300s Hobby), permits in-process concurrency so a warm instance handles
many SSE streams instead of cold-booting one function per connection, and keeps
connections open long enough for MCP's bidirectional semantics. Without Fluid, a 10-second
SSE connection is 10 seconds of billable single-use function — economically broken for
tool-calling agents.

### Framework coverage

Peer deps: `@modelcontextprotocol/sdk@1.26.0` pinned (earlier versions have a CVE),
`next>=13.0.0` optional, Node 18+. Nuxt 3 is supported via `fromWebHandler` from `h3`.
Multi-tenant dynamic routing is documented at `app/dynamic/[p]/[transport]/route.ts` with
a computed `basePath`.

## `vercel-labs/mcp-for-next.js` — the minimal starter

### File layout (complete)

```
mcp-for-next.js/
├── app/
│   └── mcp/
│       └── route.ts          # the entire server — 25 lines
├── public/
│   └── index.html            # marketing blurb + Deploy-to-Vercel button
├── scripts/
│   └── test-client.mjs       # @modelcontextprotocol/sdk SSE client smoke test
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── LICENSE                   # MIT
└── README.md
```

No `app/layout.tsx`, no UI, no auth, no database. Just **one route, one echo tool**:

```ts
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const handler = createMcpHandler(
  async (server) => {
    server.registerTool(
      "echo",
      {
        title: "echo",
        description: "Echo a message",
        inputSchema: z.object({ message: z.string().min(1).max(100) }),
      },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }],
      }),
    );
  },
  {},
  { basePath: "", verboseLogs: true, maxDuration: 60, disableSse: true },
);

export { handler as GET, handler as POST, handler as DELETE };
```

`basePath: ""` because the route sits at `app/mcp/route.ts` (not
`app/api/[transport]/route.ts`). `disableSse: true` means Streamable HTTP only — to
support Claude Desktop, move to `app/[transport]/route.ts`, flip `disableSse: false`, add
`REDIS_URL`, and set `basePath: "/"`.

**Deps** (six): `mcp-handler ^1.0.5`, `next ^15.2.6`, `react 19`, `redis ^4.7.0`,
`zod ^3.24.2`. `@modelcontextprotocol/sdk` comes as a peer of `mcp-handler`. No Tailwind,
no shadcn, no `@vercel/og` — fork-and-add.

**UI example.** `public/index.html` is a static blurb ("MCP for Next.js. Protocol is
mounted below /.") with a single **Clone template on Vercel** button — no React, no
dashboard.

**Test client.** `scripts/test-client.mjs` uses `SSEClientTransport` from the MCP TS SDK
against `${origin}/sse`, calls `listTools()`. One-liner CI smoke test.

**Deploy-to-Vercel.** The official listing is
`vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js`. Clicking Clone
provisions the repo with Fluid enabled by default; attach Redis for SSE, bump
`maxDuration` to 800 on Pro/Enterprise.

## `run-llama/mcp-nextjs` — the OAuth-complete template

### File layout (complete)

```
mcp-nextjs/
├── LICENSE                           # MIT, Laurie Voss, 2025
├── README.md
├── next.config.ts
├── package.json
├── package-lock.json
├── public/                           # default Next.js starter SVGs
├── prisma/
│   ├── schema.prisma                 # User, Account, Session, Client, AccessToken, AuthCode (+ PKCE)
│   └── migrations/
│       ├── 20250621194805_add_access_token/migration.sql
│       ├── 20250621195008_add_auth_code/migration.sql
│       ├── 20250621204530_make_user_optional_in_client/migration.sql
│       └── 20250623205959_add_pkce_to_auth_code/migration.sql
└── src/
    └── app/
        ├── layout.tsx
        ├── page.tsx                  # "Sign in with Google" landing
        ├── globals.css
        ├── page.module.css
        ├── auth.ts                   # Auth.js / next-auth config, Google provider
        ├── prisma.ts                 # Prisma client singleton
        ├── api/
        │   ├── auth/[...nextauth]/route.ts  # Auth.js mount
        │   └── oauth/
        │       ├── register/route.ts        # RFC 7591 Dynamic Client Registration
        │       └── token/route.ts           # authorization_code + PKCE S256 grant
        ├── oauth/
        │   └── authorize/page.tsx           # consent screen
        ├── mcp/
        │   └── [transport]/route.ts         # the MCP server itself
        └── .well-known/
            ├── oauth-authorization-server/route.ts  # RFC 8414 AS metadata
            └── oauth-protected-resource/route.ts    # RFC 9728 resource metadata
```

### Package.json (two warnings)

Deps: `@auth/core ^0.39`, `@auth/prisma-adapter ^2.9`, `@modelcontextprotocol/sdk ^1.13.1`,
`@prisma/client ^6.10`, `@vercel/mcp-adapter ^0.11.1`, `next 15.3.8`,
`next-auth ^5.0.0-beta.28`, `prisma ^6.10`.

- `@vercel/mcp-adapter ^0.11.1` is the **old package name**; the canonical name is now
  `mcp-handler` (v1.x). A fork must rename before anything else.
- `@modelcontextprotocol/sdk ^1.13.1` lags the 1.26.0 CVE-patched floor that `mcp-handler`
  peer-requires. A fork must bump.

### OAuth wiring

A full OAuth 2.1 authorization server against its own Prisma tables:

- **`/api/oauth/register`** — RFC 7591 Dynamic Client Registration. Mints a `client_id`
  (cuid) + `client_secret` (32-byte hex), stores in `Client`. Anonymous (`userId: null`)
  registration because Claude/Cursor/VSCode/Inspector all self-register on first connect.
- **`/oauth/authorize`** — consent screen. Gates on an upstream Google session (via
  Auth.js); unsigned-in users are redirected to `/api/auth/signin?callbackUrl=…`.
  Validates `client_id` / `redirect_uri` / `response_type=code`. On Allow, writes an
  `AuthCode` row with `code_challenge` + `code_challenge_method` (S256).
- **`/api/oauth/token`** — validates the `AuthCode`, verifies
  `sha256(code_verifier) == code_challenge` (base64url), deletes the one-time code, mints
  a 32-byte bearer with a 1-hour expiry, returns the OAuth response body. Supports both
  pure-PKCE (public, Cursor/VSCode) and `client_secret` (confidential) paths.
- **`/.well-known/oauth-protected-resource`** and
  **`/.well-known/oauth-authorization-server`** — RFC 9728 + RFC 8414 metadata docs.

### MCP handler authentication (and its flaw)

`src/app/mcp/[transport]/route.ts` **does not use `withMcpAuth`**. It reads `Authorization:
Bearer <token>`, looks it up in `AccessToken`, checks expiry, then calls
`createMcpHandler(...)(req)`. Returns 401 with `{ error: "Unauthorized" }` and **no
`WWW-Authenticate` challenge** — strictly worse than `withMcpAuth`. Tool handlers never
see `AuthInfo`. The in-file tool is a single `add_numbers(a, b)`. **A fork should replace
this wrapper with `withMcpAuth` and let the built-in challenge handler fire.**

### UI and deploy target

Two pages total: `src/app/page.tsx` is a Sign in with Google/Sign Out switch;
`src/app/oauth/authorize/page.tsx` is the Allow/Deny consent screen. No dashboard, no
tools catalog, no admin. README claims Vercel-only; practically this is Vercel-shaped
(Fluid for SSE) but any Node host with Web Fetch works. Build command needs
`prisma generate`.

## Combined reference skeleton for `prompt-to-asset`

Synthesising the three repos plus Category 19's SSOT + mirror guidance, the file skeleton
our repo should adopt — **picking the best of each** — is:

```
prompt-to-asset/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # landing → enhance-prompt playground
│   ├── globals.css
│   ├── (marketing)/
│   │   ├── docs/page.tsx             # MCP setup copy-paste for 6 IDEs
│   │   └── pricing/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # authed shell
│   │   ├── library/page.tsx          # generated assets (from resource://)
│   │   ├── brand/page.tsx            # brand.md editor
│   │   ├── integrations/page.tsx     # OAuth clients, API keys, IDE snippets
│   │   └── usage/page.tsx
│   ├── api/
│   │   ├── [transport]/route.ts      # ← the MCP server (createMcpHandler + withMcpAuth)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── oauth/
│   │   │   ├── register/route.ts     # RFC 7591 DCR
│   │   │   ├── authorize/route.ts    # alt to /oauth/authorize if we prefer API route
│   │   │   └── token/route.ts        # authz_code + PKCE S256
│   │   ├── ui/
│   │   │   ├── enhance/route.ts      # UI calls same lib/tools/enhance_prompt
│   │   │   └── generate/route.ts
│   │   └── webhooks/
│   │       └── stripe/route.ts
│   ├── oauth/
│   │   └── authorize/page.tsx        # human consent screen
│   └── .well-known/
│       ├── oauth-authorization-server/route.ts
│       └── oauth-protected-resource/route.ts  # uses protectedResourceHandler()
├── lib/
│   ├── tools/                        # ← SINGLE SOURCE OF TRUTH for every capability
│   │   ├── enhance_prompt.ts         # called by UI route + MCP tool
│   │   ├── generate_logo.ts
│   │   ├── generate_icon_set.ts
│   │   ├── remove_background.ts
│   │   ├── vectorize.ts
│   │   ├── resize_icon_set.ts        # wraps npm-icon-gen + pwa-asset-generator + capacitor-assets
│   │   ├── validate_asset.ts
│   │   ├── route_model.ts
│   │   ├── brand_bundle_parse.ts
│   │   └── list_history.ts
│   ├── mcp/
│   │   ├── register-tools.ts         # registers every lib/tools/* with McpServer
│   │   ├── resources.ts              # prompt-to-asset://{brand,asset,template}/...
│   │   ├── prompts.ts                # logo_brief, icon_set_brief, fix_transparency
│   │   └── auth/
│   │       ├── verify-token.ts       # passed to withMcpAuth
│   │       └── scopes.ts             # api:read, api:write, asset:generate
│   ├── providers/                    # Vercel AI SDK image providers (openai, google, replicate, fal, …)
│   ├── db/
│   │   └── prisma.ts
│   ├── redis.ts                      # REDIS_URL singleton for SSE resumability
│   ├── storage.ts                    # Blob/S3 for generated asset bytes
│   └── auth.ts                       # Auth.js config (Google/GitHub upstream)
├── prisma/
│   ├── schema.prisma                 # User, Account, Session, Client, AccessToken, AuthCode (+PKCE), Asset, Brand, Generation
│   └── migrations/
├── server/                           # stdio transport — one-liner that re-registers lib/tools/*
│   └── index.mjs
├── components/                       # shadcn/ui + brand-kit editor + asset library grid
├── skills/                           # (category 19 SSOT)
├── rules/
├── hooks/                            # Claude Code lifecycle hooks
├── .claude-plugin/plugin.json
├── .codex/hooks.json
├── plugins/prompt-to-asset/          # Codex plugin bundle
├── gemini-extension.json
├── .vscode/mcp.json
├── .cursor/{rules,skills}/
├── .windsurf/{rules,skills}/
├── .clinerules/01-prompt-to-asset.md
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/{ci.yml,sync.yml}
├── scripts/
│   ├── sync-mirrors.sh               # regenerate all per-IDE envelopes
│   ├── test-mcp-client.mjs           # like vercel-labs's test-client, but exercises every tool
│   └── bump-version.sh
└── package.json
```

### `app/api/[transport]/route.ts` — the canonical mount

```ts
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerTools } from "@/lib/mcp/register-tools";
import { verifyToken } from "@/lib/mcp/auth/verify-token";

const base = createMcpHandler(
  (server) => registerTools(server),                 // lib/tools/*
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
  {
    basePath: "/api",
    maxDuration: 800,                                // Pro/Enterprise Fluid ceiling
    verboseLogs: process.env.NODE_ENV !== "production",
    redisUrl: process.env.REDIS_URL,                 // SSE resumability
    disableSse: false,                               // keep SSE on for Claude Desktop
  },
);

const handler = withMcpAuth(base, verifyToken, {
  required: true,
  requiredScopes: ["asset:generate"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST, handler as DELETE };
```

`registerTools(server)` imports every `lib/tools/*.ts` module and calls
`server.registerTool(name, { title, description, inputSchema, outputSchema }, handler)`.
`app/api/ui/enhance/route.ts` imports the **same** `enhance_prompt` module — one
implementation, two surfaces — the "parity" principle from Category 20.

### `package.json` deps (runtime)

```json
{
  "dependencies": {
    "mcp-handler": "^1.1.0",
    "@modelcontextprotocol/sdk": "1.26.0",
    "zod": "^3.25.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^5.0.0-beta.28",
    "@auth/prisma-adapter": "^2.9.1",
    "@prisma/client": "^6.10.0",
    "redis": "^4.7.0",
    "ai": "^5.0.0",
    "@ai-sdk/openai": "^2.0.0",
    "@ai-sdk/google": "^2.0.0",
    "@ai-sdk/replicate": "^2.0.0",
    "@ai-sdk/fal": "^2.0.0",
    "@ai-sdk/togetherai": "^2.0.0",
    "replicate": "^1.0.0",
    "@fal-ai/client": "^2.0.0",
    "@vercel/og": "^0.6.0",
    "satori": "^0.12.0",
    "sharp": "^0.34.0",
    "icon-gen": "^5.0.0",
    "pwa-asset-generator": "^6.0.0",
    "@capacitor/assets": "^3.0.0",
    "@vercel/blob": "^0.26.0"
  },
  "devDependencies": {
    "prisma": "^6.10.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^4.1.0"
  }
}
```

### Environment variables

```
# Next / app
NEXTAUTH_URL=https://prompt-to-asset.example.com
AUTH_SECRET=...

# Upstream identity for humans (Auth.js)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# Persistence
DATABASE_URL=postgresql://...            # OAuth clients, tokens, users, assets
REDIS_URL=rediss://...                   # required for SSE transport to Claude

# Storage
BLOB_READ_WRITE_TOKEN=...                # Vercel Blob for generated assets

# Model providers (Vercel AI SDK v5)
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
REPLICATE_API_TOKEN=...
FAL_KEY=...
TOGETHER_API_KEY=...
OPENROUTER_API_KEY=...                   # long-tail fallback
```

### Correctness notes from the teardown

1. Pin `@modelcontextprotocol/sdk` to `1.26.0` (CVE floor).
2. Use `withMcpAuth`, not hand-rolled Bearer parsing — free `WWW-Authenticate` challenge,
   `AuthInfo` threaded into every tool.
3. `basePath` must match the folder. `app/api/[transport]/route.ts` → `"/api"`.
   `app/mcp/route.ts` → `""`. Mismatches silently break SSE session IDs.
4. Keep SSE on — Claude Desktop/Claude.ai still require it as of Q2 2026; attach Redis.
5. Enable Fluid compute. Without it, SSE is economically broken and tools top out at 60s.
6. Rename every `@vercel/mcp-adapter` import to `mcp-handler`; the old name lags.
7. For multi-tenant per-brand MCPs use the `app/dynamic/[p]/[transport]/route.ts`
   pattern from the Advanced docs with a computed `basePath`.

## Decision

**Fork `run-llama/mcp-nextjs` as the starting point**, not `vercel-labs/mcp-for-next.js`.

Why:

- `mcp-for-next.js` is a 25-line echo route. Everything we need — OAuth 2.1 server with
  PKCE S256, RFC 7591 DCR, Prisma schema, consent screen, Auth.js wire-up, `.well-known`
  metadata, dual-transport routes — is already in `mcp-nextjs`. Starting from the echo
  re-implements all of that; starting from `mcp-nextjs` means we delete two files and
  rename one package.
- Both licenses (MIT) are permissive.

The upgrades to apply to the fork are small and localised:

1. Rename `@vercel/mcp-adapter` → `mcp-handler@^1.1.0`.
2. Bump `@modelcontextprotocol/sdk` to `1.26.0`.
3. Replace the hand-rolled Bearer check with `withMcpAuth` + `protectedResourceHandler`
   (the `.well-known` endpoints are already there).
4. Move `src/app/mcp/[transport]/` to `app/api/[transport]/` so `basePath: "/api"` holds.
5. Replace the single `add_numbers` tool with `lib/tools/` + `registerTools(server)` that
   the UI routes also import.
6. Layer the dashboard, brand editor, library, and landing pages on top of the two stock
   pages `mcp-nextjs` ships.

Keep what `mcp-nextjs` gets right: the four-migration Prisma chain for OAuth+PKCE
(clean-replayable), the consent screen's server-action form pattern, and the
Auth.js-as-upstream-IdP / our-server-as-OAuth-AS split (Google/GitHub sign the human in;
we issue tokens to MCP clients). Use `vercel/mcp-handler`'s own docs as the canonical API
reference. Lift `mcp-for-next.js`'s `scripts/test-client.mjs` as the seed for a CI smoke
test that exercises every tool.

**`run-llama/mcp-nextjs` is the skeleton, `vercel/mcp-handler` is the library,
`vercel-labs/mcp-for-next.js` is the deployment lint.** Copy the tree, rename the package,
bump the SDK, swap in `withMcpAuth`, move `[transport]` under `/api`, replace the toy tool
with `lib/tools/*`.
