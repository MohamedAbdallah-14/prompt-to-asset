---
wave: 3
role: combination-planner
slug: 06-agent-native-first
optimization_criterion: "Agent-native first — MCP/Skills/WebMCP is the product"
date: 2026-04-19
---

# Combination 06 — Agent-Native First

## Thesis

The web UI is a *demo*, not the product. The product is a **versioned tool
vocabulary** — fifteen Zod-typed verbs — served simultaneously as a hosted
Streamable-HTTP MCP (for remote clients), an `npx` stdio MCP (for local-only
clients), and a `navigator.modelContext` WebMCP registration (for
browser-resident agents). The same fifteen verbs appear as slash-commands
inside Claude Code, Cursor, Windsurf, Codex, Gemini CLI, Zed, and v0. The
Next.js UI at `prompt-to-asset.dev/` exists to (a) make humans *look at* tool
outputs, (b) host the OAuth consent screen, (c) serve `/.well-known` metadata
and skill bundles, and (d) ship a public "install in your IDE" page. Every UI
button is literally a thin wrapper over `fetch('/api/ui/<tool>')` which calls
the *same* `lib/tools/<tool>.ts` handler the MCP calls. Parity is structural,
not aspirational — it is a grep-verifiable invariant.

This shape inverts the conventional assumption ("build the SaaS, then maybe
expose an API"). Figma, Linear, Gamma, and Vercel v0 have all shipped it in
production; `Nutlope/logocreator`, `mcpware/logoloom`, `mcp-logo-gen`, and
`niels-oz/icon-generator-mcp` have each shipped *slivers* of it. No OSS
repository ships the full stitch for AI-driven asset generation. That is
this combination's whitespace.

## Layered stack

### Layer 1 — Intent / brand-bundle input

- **`brand.md`** ([thebrandmd/brand.md](https://github.com/thebrandmd/brand.md))
  as the human-editable source of truth; compile to `brand.yaml`
  ([brandspec](https://brandspec.dev/)) and `brand.json`
  ([AdCP](https://docs.adcontextprotocol.org/docs/brand-protocol)) for machine
  consumers. `brand_bundle_parse` accepts any of the three; the canonical
  internal representation is a single Zod-typed `Brand` object with
  `colors[]` (OKLCH), `typography`, `logo.variants[]`, `personality`,
  `guardrails.do_not[]`, `imagery.style`.
- **URL ingest**: `iamdanwi/brand-forge` + `dembrandt` patterns — fetch a
  live URL, derive a first-pass bundle from meta-tags, favicon palette, and
  hero imagery. The user then edits.
- **GitHub repo ingest**: if a repo has `AGENTS.md` + `brand.md`, bundle
  auto-configures at connect time.

### Layer 2 — Prompt enhancement

- **Paid tier**: a Claude/GPT/Gemini rewriter wrapping the 24-key-point
  AlignEvaluator scaffold from
  [`Hunyuan-PromptEnhancer`](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer)
  (Apache-2.0), extended with 6 asset-specific reward heads
  (transparency-correctness, text-legibility, platform-compliance,
  palette-adherence, safe-zone-respect, negative-artifact-avoidance).
- **Free tier**: [`microsoft/Promptist`](https://github.com/microsoft/LMOps/tree/main/promptist)
  (125M GPT-2, MIT) + [`roborovski/superprompt-v1`](https://huggingface.co/roborovski/superprompt-v1)
  (77M T5-small, MIT) — CPU-runnable, offline, browser-runnable.
- **Per-model verbalizers**: natural-sentence phrasing for Imagen 4 and
  `gpt-image-1`; tag-salad for SDXL/Flux. One rewriter, many outputs.

### Layer 3 — Model routing

Vercel AI SDK v5 `generateImage` as the typed polyglot; direct SDKs
(`@fal-ai/client`, `replicate`, `together-ai`) for hot paths. Router chooses
by *capability map*, never by vendor: `transparency && textInImage !== 'poor'`
→ `gpt-image-1` with `background: "transparent"`; `vector === true` →
Recraft V3; `photoreal === true` → Flux.1 [pro]; otherwise Imagen 4 / Nano
Banana. Exposed introspectably as the `route_model` tool so agents can
audit the decision.

### Layer 4 — Execution

Hosted providers for day-one coverage
([Vercel AI Gateway](https://vercel.com/docs/ai-gateway/byok) BYOK);
ComfyUI serverless ([`runpod-workers/worker-comfyui`](https://github.com/runpod-workers/worker-comfyui),
Modal, ComfyDeploy) for open-weight fallback and native-RGBA
[LayerDiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse). Long
running calls return a `job_id`; progress streams over Streamable HTTP.

### Layer 5 — Post-processing

[`danielgatis/rembg`](https://github.com/danielgatis/rembg) + BRIA RMBG 2.0
(via fal) → [`visioncortex/vtracer`](https://github.com/visioncortex/vtracer)
→ [`akabekobeko/npm-icon-gen`](https://github.com/akabekobeko/npm-icon-gen)
+ [`onderceylan/pwa-asset-generator`](https://github.com/onderceylan/pwa-asset-generator)
+ [`ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets)
+ [`guillempuche/appicons`](https://github.com/guillempuche/appicons). Exposed
as three tools: `remove_background`, `vectorize`, `resize_icon_set`.

### Layer 6 — Validation

`validate_asset` scores alpha coverage, palette adherence (ΔE against brand
OKLCH), text legibility (Tesseract or CLIPScore), contrast (WCAG), safe-zone
respect (platform-specific), and platform-spec compliance. Failures trigger
a targeted re-prompt or return a structured diagnostic so the calling agent
can decide.

### Layer 7 — Persistence & observability

Prisma + Postgres (`User`, `Client`, `AccessToken`, `AuthCode`, `Brand`,
`Generation`, `Asset`); Vercel Blob (or S3) for bytes; Redis for SSE
resumability and the async job queue; OpenTelemetry spans per tool call
labelled with `tool_name`, `client_id`, `brand_id`. Every generation has a
stable `prompt-to-asset://asset/<id>` URI, a library URL, and a download
URL — Gamma's `gammaUrl` / `exportUrl` pattern applied to assets.

### Layer 8 — Agent surface (**the product**)

Everything above exists to make layer 8 correct. Fifteen tools, one
definition, three transports, seven skill envelopes, four registries.

#### Full tool inventory (15 tools)

Every tool is defined once in `lib/tools/<name>.ts` with a Zod input and
output schema. `lib/mcp/register-tools.ts` mounts them on the MCP server;
`lib/webmcp/register-tools.client.ts` mirrors the read-only subset onto
`navigator.modelContext`; `app/api/ui/<tool>/route.ts` serves the UI's
`fetch`. No tool is implemented twice.

```ts
// lib/tools/schemas.ts — shared types
export const AssetType = z.enum([
  "logo", "app-icon", "favicon", "og-image",
  "illustration", "sticker", "mascot", "hero",
]);

export const ModelId = z.enum([
  "imagen-4", "nano-banana", "gpt-image-1",
  "flux-pro-1.1", "flux-schnell", "recraft-v3",
  "ideogram-3", "seedream-4.5",
]);

export const Brand = z.object({
  id: z.string().cuid().optional(),
  colors: z.array(z.object({ name: z.string(), oklch: z.string() })),
  typography: z.object({
    primary: z.string(), secondary: z.string().optional(),
  }),
  personality: z.array(z.string()).max(8),
  guardrails: z.object({ do_not: z.array(z.string()) }).optional(),
  imagery: z.object({ style: z.string() }).optional(),
});
```

```ts
// 1. enhance_prompt   — the wedge
{
  input: z.object({
    user_prompt: z.string().min(3).max(2000),
    asset_type: AssetType,
    target_model: ModelId.optional(),
    brand_bundle: Brand.optional(),
    transparent: z.boolean().default(false),
    aspect_ratio: z.enum(["1:1","16:9","4:3","3:4","9:16"]).default("1:1"),
  }),
  output: z.object({
    enhanced_prompt: z.string(),
    model_specific_variants: z.record(ModelId, z.string()),
    negative_prompt: z.string(),
    rationale: z.string(),
    research_citations: z.array(z.string().url()),
  }),
  annotations: { readOnlyHint: true },
}

// 2. generate_logo
{
  input: z.object({
    prompt: z.string(),              // accepts raw or enhanced
    brand_bundle: Brand.optional(),
    style: z.enum(["flat","isometric","mascot","wordmark","emblem"]).optional(),
    transparent: z.boolean().default(true),
    count: z.number().int().min(1).max(8).default(4),
    model: ModelId.optional(),       // else route_model decides
  }),
  output: z.object({
    job_id: z.string().cuid(),
    assets: z.array(z.object({ id: z.string(), url: z.string().url(),
      model: ModelId, seed: z.number() })),
  }),
  annotations: { destructiveHint: false, openWorldHint: true },
}

// 3. generate_icon_set  — the OSS appicon.co, AI-first
{
  input: z.object({
    prompt: z.string(),
    platforms: z.array(z.enum(["ios","android","pwa","favicon","macos","watchos"])),
    brand_bundle: Brand.optional(),
    source_1024: z.string().url().optional(),    // skip generation if provided
  }),
  output: z.object({
    job_id: z.string().cuid(),
    bundle_url: z.string().url(),                // zip
    manifest: z.record(z.string(), z.string().url()),
  }),
}

// 4. generate_illustration
{ input: z.object({ prompt: z.string(), aspect_ratio: z.string(),
    style: z.string(), brand_bundle: Brand.optional() }), ... }

// 5. generate_og_image  — Satori / @vercel/og deterministic path
{ input: z.object({ title: z.string(), subtitle: z.string().optional(),
    theme: z.string().default("brand"), brand_bundle: Brand.optional() }), ... }

// 6. generate_favicon
{ input: z.object({ seed_asset_id: z.string().optional(),
    prompt: z.string().optional(), brand_bundle: Brand.optional() }), ... }

// 7. remove_background
{
  input: z.object({
    asset_id: z.string().optional(),
    image_url: z.string().url().optional(),
    model: z.enum(["bria-rmbg-2.0","birefnet","u2net","rembg-isnet"])
      .default("bria-rmbg-2.0"),
  }).refine(v => v.asset_id || v.image_url),
  output: z.object({ asset_id: z.string(), url: z.string().url(),
    alpha_coverage: z.number().min(0).max(1) }),
}

// 8. vectorize
{ input: z.object({ asset_id: z.string(),
    backend: z.enum(["vtracer","potrace","recraft"]).default("vtracer") }), ... }

// 9. resize_icon_set  — wraps npm-icon-gen + pwa-asset-generator + capacitor-assets
{ input: z.object({ source_1024: z.string().url(),
    platforms: z.array(z.string()) }), ... }

// 10. validate_asset
{
  input: z.object({
    asset_id: z.string(),
    checks: z.array(z.enum([
      "alpha","palette","text-legibility","contrast","safe-zone","platform-spec",
    ])).default(["alpha","palette","contrast"]),
    brand_bundle: Brand.optional(),
  }),
  output: z.object({
    passed: z.boolean(),
    scores: z.record(z.string(), z.number()),
    failures: z.array(z.object({ check: z.string(), detail: z.string() })),
    suggested_reprompt: z.string().optional(),
  }),
  annotations: { readOnlyHint: true },
}

// 11. route_model   — introspection
{ input: z.object({ asset_type: AssetType, requirements: z.object({
    transparent: z.boolean().optional(), vector: z.boolean().optional(),
    photoreal: z.boolean().optional(), text_in_image: z.boolean().optional(),
  })}),
  output: z.object({ chosen_model: ModelId, reasoning: z.string(),
    alternatives: z.array(ModelId) }),
  annotations: { readOnlyHint: true },
}

// 12. brand_bundle_parse
{ input: z.object({ source: z.union([z.string(), z.string().url()]) }),
  output: Brand, annotations: { readOnlyHint: true } }

// 13. brand_bundle_export
{ input: z.object({ generation_id: z.string() }),
  output: z.object({ zip_url: z.string().url() }) }

// 14. list_history
{ input: z.object({ filter: z.object({
    asset_type: AssetType.optional(), brand_id: z.string().optional(),
    since: z.string().datetime().optional() }).optional(),
    limit: z.number().int().max(100).default(20) }),
  output: z.object({ items: z.array(z.object({
    id: z.string(), asset_type: AssetType, prompt: z.string(),
    url: z.string().url(), created_at: z.string().datetime() })) }),
  annotations: { readOnlyHint: true },
}

// 15. get_asset
{ input: z.object({ id: z.string() }),
  output: z.object({ id: z.string(), url: z.string().url(),
    metadata: z.object({ model: ModelId, prompt: z.string(),
      brand_id: z.string().optional(), validation: z.unknown() }) }),
  annotations: { readOnlyHint: true },
}
```

That is the entire product surface. Every additional capability ships as an
additional tool, not as a UI-only button.

#### Explicit parity matrix

| # | Tool | UI route / button | Claude slash | Cursor slash | Windsurf slash | Codex slash | Gemini CLI | Zed / v0 |
|---|---|---|---|---|---|---|---|---|
| 1 | `enhance_prompt` | Hero input → "Enhance" | `/enhance` | `/enhance` | `/enhance` | `/enhance` | `gemini pe enhance` | Zed: `@prompt-to-asset enhance`; v0: chat `@pe-enhance` |
| 2 | `generate_logo` | "Generate logo" CTA | `/logo` | `/logo` | `/logo` | `/logo` | `gemini pe logo` | `@pe-logo` |
| 3 | `generate_icon_set` | `/tools/appicon` drop-zone | `/iconset` | `/iconset` | `/iconset` | `/iconset` | `gemini pe iconset` | `@pe-iconset` |
| 4 | `generate_illustration` | "Make illustration" | `/illustrate` | `/illustrate` | `/illustrate` | `/illustrate` | `gemini pe illustrate` | `@pe-illustrate` |
| 5 | `generate_og_image` | "Make OG card" | `/og` | `/og` | `/og` | `/og` | `gemini pe og` | `@pe-og` |
| 6 | `generate_favicon` | "Favicon" shortcut | `/favicon` | `/favicon` | `/favicon` | `/favicon` | `gemini pe favicon` | `@pe-favicon` |
| 7 | `remove_background` | Library item → "Remove BG" | `/rmbg` | `/rmbg` | `/rmbg` | `/rmbg` | `gemini pe rmbg` | `@pe-rmbg` |
| 8 | `vectorize` | Library item → "Vectorize" | `/vectorize` | `/vectorize` | `/vectorize` | `/vectorize` | `gemini pe vectorize` | `@pe-vectorize` |
| 9 | `resize_icon_set` | `/tools/appicon` → "Export" | `/resize` | `/resize` | `/resize` | `/resize` | `gemini pe resize` | `@pe-resize` |
| 10 | `validate_asset` | Library item → "Validate" | `/validate` | `/validate` | `/validate` | `/validate` | `gemini pe validate` | `@pe-validate` |
| 11 | `route_model` | Settings → "Router explain" | `/route` | `/route` | `/route` | `/route` | `gemini pe route` | `@pe-route` |
| 12 | `brand_bundle_parse` | Brand editor → "Import" | `/brand parse` | `/brand parse` | `/brand parse` | `/brand parse` | `gemini pe brand-parse` | `@pe-brand-parse` |
| 13 | `brand_bundle_export` | Generation → "Export bundle" | `/brand export` | `/brand export` | `/brand export` | `/brand export` | `gemini pe brand-export` | `@pe-brand-export` |
| 14 | `list_history` | `/dashboard/library` | `/history` | `/history` | `/history` | `/history` | `gemini pe history` | `@pe-history` |
| 15 | `get_asset` | `/asset/<id>` deep link | `/asset <id>` | `/asset <id>` | `/asset <id>` | `/asset <id>` | `gemini pe asset <id>` | `@pe-asset <id>` |

The matrix is enforced by a CI check (`scripts/verify-parity.mjs`): it loads
`lib/tools/index.ts`, enumerates exports, and greps `app/api/ui/**`,
`.claude-plugin/plugin.json`, `.cursor/commands/*.md`,
`gemini-extension.json`, and `.codex-plugin/plugin.json` for a 1:1 match.
Missing entries fail the build. This is how parity stops drifting.

#### Three transports, one handler bundle

```
                              ┌─────────────────────────────┐
                              │    lib/tools/*.ts  (SSOT)   │
                              │  15 Zod-typed handlers      │
                              └──────────────┬──────────────┘
                                             │
        ┌────────────────┬───────────────────┼────────────────────────┐
        │                │                   │                        │
   ┌────▼─────┐    ┌─────▼──────┐     ┌──────▼──────┐         ┌───────▼─────┐
   │ Streamable│    │    stdio   │     │  UI fetch   │         │   WebMCP    │
   │   HTTP    │    │            │     │ /api/ui/*   │         │navigator.   │
   │ /api/mcp  │    │   server/  │     │             │         │modelContext │
   │(+ SSE fb) │    │ index.mjs  │     │             │         │             │
   └────┬──────┘    └─────┬──────┘     └─────────────┘         └──────┬──────┘
        │                 │                                           │
  Claude.ai,        Claude Desktop                                Chrome 146+
  Claude Code,      via .mcpb,                                   (native or
  Cursor,           local tests,                                 @mcp-b/
  VS Code,          air-gapped                                   webmcp-polyfill)
  Windsurf,         bench,
  Codex, v0,        Cline
  Gemini CLI
  (remote mode)
```

- **Streamable HTTP** at `/api/[transport]/route.ts` via
  [`vercel/mcp-handler`](https://github.com/vercel/mcp-handler)'s
  `createMcpHandler` + `withMcpAuth`. Fluid Compute on Vercel, `maxDuration:
  800`, Redis-backed SSE resumability (`REDIS_URL`, *node-redis*, not
  Upstash REST). OAuth 2.1 with PKCE S256, RFC 7591 DCR, RFC 8414 / RFC 9728
  `.well-known` docs — forked from [`run-llama/mcp-nextjs`](https://github.com/run-llama/mcp-nextjs)
  with the hand-rolled Bearer check replaced by `withMcpAuth`, the adapter
  package renamed to `mcp-handler@^1.1.0`, and the MCP route moved under
  `app/api/[transport]` so `basePath: "/api"` matches.
- **stdio** at `server/index.mjs` — re-registers the same `lib/tools/*`
  against `StdioServerTransport`. Shipped as
  `npx @prompt-to-asset/mcp` and as a `.mcpb` bundle
  ([`anthropics/mcpb`](https://github.com/anthropics/mcpb)) for drag-drop
  into Claude Desktop. `.mcpb pack` runs in CI; binary signed for verify.
- **WebMCP** at `apps/web/webmcp.client.ts` — once
  `navigator.modelContext` is present (Chrome 146+ flag, or polyfilled via
  [`@mcp-b/webmcp-polyfill`](https://docs.mcp-b.ai/packages/webmcp-polyfill),
  MIT), registers the **read-only subset** (`enhance_prompt`, `route_model`,
  `validate_asset`, `brand_bundle_parse`, `list_history`, `get_asset`) with
  `annotations.readOnlyHint: true` so Chromium-native agents auto-approve.
  Write/generate tools stay off WebMCP until tool-impersonation mitigations
  land (Issue #101). Schemas are imported from the *same* Zod files the
  server uses; zero drift.

Three transports, one implementation. An agent visiting the site in Claude
for Chrome gets the read surface via WebMCP; the same agent using the
hosted MCP gets the write surface with OAuth; the same agent locally via
`.mcpb` gets both over stdio without auth. Identical tool names, schemas,
and behaviour.

#### Skill envelopes (seven IDE targets)

```
skills/                           # canonical SKILL.md tree (Agent Skills spec)
├── logo-generator/SKILL.md
├── app-icon-generator/SKILL.md
├── favicon-bundle/SKILL.md
├── og-image/SKILL.md
├── transparent-png/SKILL.md
└── brand-bundle/SKILL.md
AGENTS.md                         # cross-vendor always-on body (Linux Foundation)
.claude-plugin/{plugin.json,marketplace.json}   # Claude Code
.codex-plugin/plugin.json + .codex/hooks.json   # Codex
gemini-extension.json             # contextFileName: "skills/**/SKILL.md"
.vscode/mcp.json                  # VS Code + Copilot
.cursor/{rules,skills}/           # Cursor (symlinks into skills/)
.windsurf/{rules,skills}/         # Windsurf
.clinerules/01-prompt-to-asset.md # Cline
.rules → AGENTS.md                # Zed fallback chain
CLAUDE.md, GEMINI.md → AGENTS.md  # symlinks
scripts/sync-mirrors.sh           # regenerates all per-IDE envelopes from SSOT
```

`SKILL.md` body is portable; *frontmatter is compile-target-specific*
(`rule-porter` pattern). One editor action — edit a `SKILL.md` — and seven
envelopes update on the next `sync-mirrors` run. Hooks are Claude+Codex
only; elsewhere the "always call `enhance_prompt` first" rule lives in the
body as prose. `scripts/verify-parity.mjs` cross-checks that every tool in
`lib/tools/` has a slash-command in every envelope.

#### Explicit distribution

Four surfaces, ranked by reach/effort:

1. **Official MCP Registry** (`registry.modelcontextprotocol.io`) — *Day 0.*
   Publish `server.json` via the `mcp-publisher` CLI with both `packages[]`
   (stdio npm) and `remotes[]` (HTTPS Streamable HTTP). One publish feeds
   downstream ingest into PulseMCP (weekly), Claude Desktop search, Docker
   Hub, and Smithery. This is the single highest-leverage listing.
2. **Anthropic Connectors Directory** — *Day 1, ~2-week review.* Submit via
   the Google Form with the remote MCP URL + `.mcpb` bundle. Strict tool
   annotations required (`title`, `readOnlyHint`, `destructiveHint` —
   already in our schemas). Paired OAuth callbacks for
   `claude.ai/api/mcp/auth_callback` **and**
   `claude.com/api/mcp/auth_callback`. This is the *only* surface inside
   every paid Claude user's UI.
3. **Cursor Directory** (`cursor.directory`) — *Day 1.* `.mcp.json` at repo
   root plus a "Add to Cursor" deeplink badge
   (`cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-to-asset&config=<base64>`).
   73.7k members, ~1.9k MCPs; primary Cursor discovery surface.
4. **Smithery** (`smithery.ai`) — *Day 1.* `smithery.yaml` with tight
   `description` + `categories: [design, image, prompt-engineering]`,
   plus `/.well-known/mcp/server-card.json` fallback. Streamable HTTP is
   mandatory (we have it); OAuth managed client registration uses Client ID
   Metadata Documents (`withMcpAuth`'s default path handles this). Free
   Hobby tier covers 25k RPC/mo.
5. **Glama** (`glama.ai/mcp/servers`) — *Day 1, polish Day 7.* Auto-indexed
   within 48h; the work is the **TDQS score**. Mandatory: `LICENSE`,
   `SECURITY.md`, CI, per-tool descriptions with output-shape examples.
   Target ≥80 on every tool — the worst-described tool weighs ~40%.
6. **Claude Desktop via `.mcpb`** — *Day 1.* Built in CI from the stdio
   server; one-click install. Submission shares the same queue as the
   Connectors Directory.
7. **Gemini Extensions Gallery** + **VS Code MCP Registry** +
   **Windsurf Marketplace** + **mcp.so** + **PulseMCP** +
   **Zed Extensions** — *Day 2–14.* Light incremental work; most pull from
   the Official Registry automatically once the listing is clean.

Crucially: `scripts/sync-mirrors.sh` regenerates `server.json`,
`smithery.yaml`, `.mcp.json`, `gemini-extension.json`, the `.mcpb`
`manifest.json`, the Smithery card, the Cursor deeplink, and the VS Code
install URL **all from one source**. We never hand-maintain drift across
eleven registries.

## Risks & mitigations

- **Tool-impersonation on WebMCP** (Issue #101 — `provideContext()`
  bypasses duplicate-name protection). *Mitigation*: stay on strict W3C
  `registerTool` via `@mcp-b/webmcp-polyfill`; avoid `@mcp-b/global`'s
  superset; keep write tools off WebMCP until Permissions-Policy lands.
- **OAuth paired-callback gotcha**. Anthropic requires *both* `claude.ai`
  and `claude.com` callbacks; Smithery expects 401 (never 403) for unauth
  Streamable HTTP. *Mitigation*: fork `run-llama/mcp-nextjs`, swap to
  `withMcpAuth` (free RFC 9728 `WWW-Authenticate` challenge), allowlist
  both Anthropic callbacks in `Client.redirect_uris`.
- **Registry drift**. *Mitigation*: `sync-mirrors.sh` + `verify-parity.mjs`
  in CI; one publish-step blocked on both passing.
- **MCP SDK CVE floor**. Pin `@modelcontextprotocol/sdk@1.26.0`.

## Decision

Fork [`run-llama/mcp-nextjs`](https://github.com/run-llama/mcp-nextjs) as
the auth + MCP spine. Rename `@vercel/mcp-adapter` → `mcp-handler`. Bump
SDK to 1.26.0. Replace hand-rolled Bearer with `withMcpAuth`. Move
`[transport]` under `app/api/`. Replace the echo tool with
`registerTools(server)` from `lib/tools/*`. Vendor
[`vercel-labs/skills`](https://github.com/vercel-labs/skills) for `npx
prompt-to-asset init` cross-IDE install. Use
[`anthropics/mcpb`](https://github.com/anthropics/mcpb) to pack the stdio
binary. Polyfill WebMCP with `@mcp-b/webmcp-polyfill` and mirror the
read-only tool subset. Publish to Official Registry on day 0; Anthropic,
Cursor, Smithery, Glama, and Claude Desktop on day 1. The fifteen-tool
surface — not the Next.js UI — is the product.
