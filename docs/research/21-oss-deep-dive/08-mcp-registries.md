---
wave: 1
role: niche-discovery
slug: 08-mcp-registries
title: "MCP registries, marketplaces & agent discovery surfaces"
date: 2026-04-19
sources:
  - https://modelcontextprotocol.io/registry
  - https://modelcontextprotocol.io/registry/quickstart
  - https://registry.modelcontextprotocol.io/
  - https://claude.com/docs/connectors/building/submission
  - https://support.anthropic.com/en/articles/11596036-anthropic-connectors-directory-faq
  - https://anthropic.com/engineering/desktop-extensions
  - https://www.desktopextensions.com/
  - https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide
  - https://sunpeak.ai/blogs/claude-connector-directory-submission
  - https://sunpeak.ai/blogs/claude-connector-oauth-authentication
  - https://cursor.directory/
  - https://cursor.directory/plugins/new
  - https://open-plugins.com
  - https://smithery.ai/docs/build/publish
  - https://smithery.ai/docs/build/external
  - https://smithery.ai/pricing
  - https://mcpize.com/alternatives/smithery
  - https://agentsindex.ai/pricing/smithery
  - https://mcp-marketplace.io/blog/state-of-mcp-monetization-2026
  - https://mcp.so/submit
  - https://docs.mcp.so/server-hosting
  - https://glama.ai/mcp/servers
  - https://glama.ai/blog/2025-09-10-glama-mcp-server-hosting
  - https://www.pulsemcp.com/
  - https://www.pulsemcp.com/submit
  - https://www.pulsemcp.com/api
  - https://www.pulsemcp.com/statistics
  - https://v0.dev/docs/MCP
  - https://v0.dev/docs/api/platform/adapters/mcp-server
  - https://geminicli.com/docs/extensions/releasing/
  - https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/releasing.md
  - https://geminicli.com/extensions/browse/
  - https://www.windsurf.run/
  - https://zed.dev/extensions?filter=context-servers
  - https://zed.dev/docs/extensions/mcp-extensions
  - https://dev.to/vdalhambra/5-things-i-learned-submitting-to-27-mcp-directories-with-data-oci
  - https://dev.to/vdalhambra/from-0-to-27-directories-in-1-week-the-honest-mcp-distribution-playbook-2497
  - https://someclaudeskills.com/docs/skills/claude_ecosystem_promoter/references/registry-submission-guides/
tags: [mcp, registry, smithery, glama, cursor, claude-desktop, distribution]
---

# 21.08 — MCP Registries, Marketplaces & Agent Discovery Surfaces

Once `prompt-to-asset` ships its Streamable-HTTP + OAuth remote MCP and `npx`
stdio fallback (category 19b), the only question left is where it gets
*listed*. This note surveys the eleven registries that matter in April 2026
and ends with a ranked 90-day distribution plan.

## The landscape in one table

| Registry | URL | Listing mechanism | Review | Reach signal | Accepts hosted Streamable HTTP + OAuth 2.1 | Requires open source | Cost |
|---|---|---|---|---|---|---|---|
| **Official MCP Registry** | `registry.modelcontextprotocol.io` | `mcp-publisher` CLI + `server.json`; GitHub or DNS namespace verification | Automated; **preview** status, breaking changes possible | Feeds Smithery, PulseMCP, Docker Hub, Claude Desktop search | Yes — `remotes[]` block is first-class | No (OSS and closed allowed; install method or endpoint must be public) | Free |
| **Claude Connectors Directory** | `claude.com/directory` (submission: Google Form) | Google Form + MCPB/DXT bundle or remote URL | Manual, **~2 weeks**, ~30% rejected on tool annotations | Exposed to every paid Claude user in Claude.ai + Desktop | Yes; OAuth 2.0 mandatory if private user data; both `claude.ai` and `claude.com` callback URLs required | No (Anthropic Software Directory Terms apply) | Free |
| **Desktop Extensions / MCPB** | `desktopextensions.com` + `@anthropic-ai/dxt` CLI | `.mcpb` (née `.dxt`) zip with `manifest.json`; uploaded via Connectors Directory flow | Same queue as Connectors Directory | One-click install inside Claude Desktop | Local stdio only; remote connectors go through Connectors Directory path | No | Free |
| **Cursor Directory** | `cursor.directory` | Web form at `/plugins/new`, GitHub/Google sign-in; auto-detect requires `.mcp.json` at repo root (Open Plugins std) | Lightweight automated | **~73.7k community members**, ~1.9k MCPs listed; primary Cursor discovery surface | Yes (entry is config, so any transport the server supports) | No | Free |
| **Smithery** | `smithery.ai` | `smithery.yaml` auto-indexed from GitHub, or `/new` with public HTTPS URL; static card fallback at `/.well-known/mcp/server-card.json` | Automated scan; metadata extracted from live tools list | Popular one-click install marketplace; `smithery.yaml` `categories`/`description` drive ranking | **Required**: Streamable HTTP mandatory; OAuth required if auth; managed client registration via Client ID Metadata Documents | No | Free to list; Hobby hosting tier free (25k RPC/mo, 3 namespaces, managed OAuth); Pay-as-you-go $30/mo + $0.50/1k RPC beyond $30 credit; **no creator monetization** — > **Updated 2026-04-21:** registry now lists 7,000+ servers (up from ~6k in early 2026). |
| **mcp.so** | `mcp.so` | Web form at `/submit` (type, name, URL, server config) | Light / community-driven | Broad SEO directory, heavily indexed; >10k servers | Yes (config-driven) | No | Free |
| **Glama** | `glama.ai/mcp/servers` | Auto-indexed from GitHub 24–48h; claim via OAuth; optional hosting via Dockerfile | Automated + quality scoring **0–100** (TDQS weighs *worst* tool at ~40%); <70 gets buried | ~9–12k indexed servers; quality-gated discovery; hosts vulnerability scans | Yes; Glama itself hosts remote MCPs over Streamable HTTP + OAuth (Cloudflare Workers template) | No (but `LICENSE: F` is a −15 score hit) | Free directory; hosting plans separate |
| **PulseMCP** | `pulsemcp.com` | Submit form at `/submit`, or auto-pulled from Official Registry weekly | Manual curation + daily registry ingest | Weekly *Weekly Pulse* newsletter (50+ editions), REST API, ecosystem-wide stats dashboard | Yes | No | Free |
| **v0 / Vercel** | `v0.dev/docs/MCP` | No public registry for user MCPs; bring-your-own via MCP Connections; curated Vercel Marketplace (Neon, Supabase, Stripe, Upstash, Linear, Notion, Sentry, Zapier) | Private BD deal for Marketplace inclusion | v0's 2M+ monthly users; appears inside v0 chats once connected | Yes | No | Free to be BYO; Marketplace is invite-only |
| **Gemini Extensions Gallery** | `geminicli.com/extensions/browse` | Public GitHub repo + `gemini-cli-extension` topic + `gemini-extension.json` at root; crawler runs daily, validation ~days-to-a-week | Automated validation | Shipped with Gemini CLI; install via `gemini extensions install <repo-uri>` | MCP servers configured as stdio `command`/`args` — hosted Streamable HTTP works but mounts through the CLI's stdio wrapper | Yes (public GitHub required for gallery) | Free |
| **Windsurf plugin surface** | `windsurf.run` + built-in MCP Marketplace | Built-in marketplace with one-click install; community directory at windsurf.run; manual via `~/.codeium/windsurf/mcp_config.json` | Built-in marketplace is Windsurf-curated; windsurf.run is community-submit | Bundled into Cascade for ~1M Windsurf users; **100 active-tool cap** per Cascade session | Yes (stdio and HTTP both supported in `mcp_config.json`) | No | Free |
| **Zed Extensions** | `zed.dev/extensions?filter=context-servers` | Rust extension registering `[context_servers.*]` in `extension.toml` + `context_server_command()` impl; PR to `zed-industries/extensions` | Maintainer review (tight) | Smaller audience (~hundreds of thousands of Zed users) but technically active | Stdio-only surface; extension itself runs the binary | Extension source yes; the MCP binary it launches can be closed | Free |

## Reading the table

**Upstream vs downstream.** The Official MCP Registry (Anthropic + GitHub +
PulseMCP + Microsoft steering committee) is the canonical metadata source and
explicitly feeds PulseMCP (daily ingest, weekly publish), Smithery, Docker Hub,
and Claude Desktop search. One `server.json` publish buys passive indexing in
at least four downstream places — inverting the 2024 pattern of hand-submitting
everywhere.

**Largest paying audiences.** The **Anthropic Connectors Directory** sits
inside Claude.ai + Claude Desktop for every paid user — effectively the "App
Store for MCP". **Cursor Directory** (73.7k members, ~1.9k servers) is the
Cursor equivalent. Both free; both need one-time effort (strict tool
annotations for Anthropic; `.mcp.json` at repo root for Cursor).

**Metadata hygiene disproportionately rewarded.** Glama's **TDQS score**
weights your *worst-described* tool at ~40%; anything under 70 is effectively
invisible. Concrete writeups report moving 68→85 in one afternoon by rewriting
tool descriptions with output-shape examples and "when to use this vs sibling
tool" lines. Smithery ranking is almost entirely `smithery.yaml` `description`
+ `categories`. Cursor's Open-Plugins auto-detection only works if `.mcp.json`
sits at the *repo root*.

**Monetization is a near-empty slot.** Smithery, Glama, mcp.so, PulseMCP, and
the Official Registry are all free directories with zero creator payout.
MCPize (out of scope) is the only mature 85/15 rev-share with hosted endpoint
+ Stripe + "Install to Claude Desktop" button. For `prompt-to-asset`, our own
Stripe on the web surface remains the revenue path; registries are purely
distribution.

**OAuth gotcha recurs across five of eleven.** Anthropic requires *both*
`claude.ai/api/mcp/auth_callback` and `claude.com/api/mcp/auth_callback`;
Smithery expects 401 (never 403) for unauth Streamable HTTP; Glama's
Cloudflare template assumes Client ID Metadata Documents. Building against
MCP 2025-06-18 (category 19b) satisfies all three — shortcuts that hardcode
`claude.ai` or return 403 get silently rejected.

## Distribution recommendations (ranked by 90-day reach/effort)

Assumptions: we ship the tri-surface (website + hosted `mcp.prompt-to-asset.<tld>`
Streamable HTTP + OAuth 2.1 + `npx @prompt-to-asset/mcp` stdio fallback) and
one SSOT skill bundle per category 19.

1. **Official MCP Registry** — *Day 0.* Highest leverage per minute. ~20 min
   with `mcp-publisher` CLI; buys daily ingest into PulseMCP, Claude Desktop
   search, and an `io.github.<us>/prompt-to-asset` namespace. Prereqs:
   `mcp-name` tag, public npm package, `server.json` with both `packages[]`
   (stdio) and `remotes[]` (HTTPS) blocks.

2. **Anthropic Connectors Directory** — *Day 1, ~2-week review.* The only
   surface inside every paid Claude user's UI. Budget an afternoon on tool
   annotations (`title`, `readOnlyHint`/`destructiveHint`) and paired OAuth
   callback allowlisting. Expect one rejection cycle on annotations.

3. **Cursor Directory** — *Day 1.* 73.7k-member audience; ~15 min to submit
   after `.mcp.json` lands at repo root.

4. **Smithery** — *Day 1.* `smithery.yaml` with tight `description`/`categories`
   (`prompt-engineering`, `design`, `image`) plus
   `/.well-known/mcp/server-card.json` fallback. Free Hobby tier covers ~25k
   RPC/mo.

5. **Glama** — *Day 1, polish through Day 7.* Auto-indexed within 48h; the
   work is the *score*. Mandatory: `LICENSE`, `SECURITY.md`, CI, per-tool
   descriptions with output-shape examples. Target ≥80 TDQS on every tool —
   one weak description tanks the whole listing.

6. **PulseMCP** — *Day 8, passive.* Auto-ingested weekly from the Official
   Registry. A short `hello@pulsemcp.com` intro with the launch story earns
   newsletter feature consideration once we have a case study.

7. **Gemini Extensions Gallery** — *Day 2.* `gemini-cli-extension` topic +
   `gemini-extension.json` at repo root; crawler picks us up in days.

8. **Windsurf (Marketplace + windsurf.run)** — *Day 3.* Community submit via
   windsurf.run; built-in Marketplace is relationship-driven. Our 7-tool
   surface fits well under the 100-tool Cascade cap.

9. **mcp.so** — *Day 3.* 5-minute web form; broad SEO but low-intent.

10. **Zed Extensions** — *Day 14+.* Rust extension + PR to
    `zed-industries/extensions` is the highest per-listing effort. Defer until
    a Zed user asks.

11. **v0 / Vercel Marketplace** — *Out of band.* No public submission; BD
    conversation. In the meantime, ship a copy-paste v0 MCP Connection snippet
    in our docs so v0 users can BYO-connect without curation.

**Budget.** Steps 1–5 fit in one engineer-day. Steps 6–9 add another half-day.
The expensive work is *not* the submissions — it is the prerequisites (tool
annotations, TDQS rewrites, paired OAuth callbacks, the
`.mcp.json`/`smithery.yaml`/`gemini-extension.json` trio), which the category
19 sync-mirrors script should generate from a single SSOT so we never
hand-maintain drift across eleven registries.
