---
wave: 1
role: niche-discovery
slug: 09-cross-ide-installers
title: "Cross-IDE installers & skill/MCP packaging tools"
date: 2026-04-19
sources:
  - https://github.com/modelcontextprotocol/mcpb
  - https://anthropic.com/engineering/desktop-extensions
  - https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb
  - https://github.com/anthropics/dxt/blob/main/CLI.md
  - https://github.com/smithery-ai/cli
  - https://smithery.ai/docs/concepts/cli
  - https://apigene.ai/blog/smithery-cli
  - https://cursor.com/docs/mcp/install-links
  - https://pypi.org/project/cursor-deeplink/
  - https://google-gemini.github.io/gemini-cli/docs/extensions/
  - https://google-gemini.github.io/gemini-cli/docs/extensions/getting-started-extensions.html
  - https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
  - https://developers.openai.com/codex/plugins/build/
  - https://developers.openai.com/codex/plugins/
  - https://developers.openai.com/codex/skills/
  - https://code.visualstudio.com/docs/copilot/customization/mcp-servers
  - https://code.visualstudio.com/api/extension-guides/mcp
  - https://aka.ms/vscode-mcp-registry-web
  - https://zed.dev/docs/extensions/mcp-extensions
  - https://zed.dev/docs/ai/mcp
  - https://github.com/databricks-solutions/ai-dev-kit
  - https://ai-devkit.com/docs/1-getting-started
  - https://github.com/mcpmux/homebrew-tap
  - https://v0.app/docs/api/platform/adapters/mcp-server
  - https://docs.windsurf.com/plugins/getting-started
  - https://agentsmd.io/
  - https://vibecoding.app/blog/agents-md-guide
  - https://agentskills.my/specification
  - https://www.open-plugins.com/
  - https://open-plugins.com/plugin-builders/specification
  - https://chris-ayers.com/posts/agent-skills-plugins-marketplace/
  - https://gist.github.com/johnlindquist/217aaa5023879dfa9bc654c7d7ad0260
tags: [cursor, claude-code, windsurf, codex, gemini-cli, zed, installer, skills]
---

# Cross-IDE installers & skill/MCP packaging tools

Scope: OSS surfaces that let **one action** — a click, deeplink, CLI call,
or dropped folder — install a prompt-to-asset skill/MCP bundle across
Claude Code, Claude Desktop, Cursor, Windsurf, Cline, Gemini CLI, Codex,
VS Code/Copilot, Zed, and v0. The question isn't whether users *can* get the
bundle running on each surface — they can, with enough JSON editing — but
which packaging paths are one command deep vs. ten.

## 1 · Per-IDE native formats (you cannot avoid these)

| Surface | Bundle format | Manifest | Install primitive | License of tooling |
| --- | --- | --- | --- | --- |
| **Claude Code** | Plugin (folder) | `.claude-plugin/plugin.json` + `marketplace.json` | `claude plugin install`, marketplace URL, or local `--plugin-dir` | MIT (spec), closed client |
| **Claude Desktop** | `.mcpb` bundle (was `.dxt` — renamed Sep 2025) | `manifest.json` inside zip | Drag-drop into Claude Desktop; one-click from Anthropic directory | MIT (`modelcontextprotocol/mcpb` CLI) |
| **Cursor** | `mcp.json` config + `.cursor/rules/*.mdc` + `.cursor/skills/` | none (flat config) | `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=…` base64 deeplink, "Add to Cursor" button | closed client, open schema |
| **Windsurf** | `.windsurf/{rules,skills}/` + MCP in settings | none for MCP loader | Manual `settings.json` edit; plugin UI for VS Code-style extensions only | closed client |
| **Cline** | `.clinerules/*.md` + VS Code `mcp.json` | none | Drop files in workspace | Apache-2.0 (extension) |
| **Gemini CLI** | Extension folder | `gemini-extension.json` | `gemini extensions install <git-url-or-path>`; `gemini extensions link` for dev | Apache-2.0 (CLI) |
| **OpenAI Codex** | Plugin bundle | `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` | `codex /plugins` UI or marketplace file; skills via `skills/*/SKILL.md` | MIT (CLI) |
| **VS Code / Copilot** | `.vscode/mcp.json` + VSIX extension | `package.json` (for VSIX) | Extensions view `@mcp`; `vscode:mcp/install?…` protocol URL; `code --install-extension` | MIT (engine) |
| **Zed** | Extension crate or `context_servers` block | `extension.toml` | `zed: extensions` palette; `npx @getmcp/cli add <id>`; direct `settings.json` edit | GPL-3.0 (editor) |
| **v0 (Vercel)** | Remote MCP over Streamable HTTP | none | `npx mcp-remote https://mcp.v0.dev` behind whichever client | closed host, open protocol |

**Observation.** Every surface has collapsed onto the same *execution plane*
(one stdio or Streamable-HTTP MCP binary) but exposes a *different thin
manifest* on top. §2 is about abstracting that manifest layer.

## 2 · Cross-IDE installers and registries

### 2.1 Claude Desktop Extensions — `.mcpb` / `modelcontextprotocol/mcpb`

URL: <https://github.com/modelcontextprotocol/mcpb> (MIT, ~1.85k★;
`@anthropic-ai/mcpb` on npm).

A `.mcpb` is a zip containing `manifest.json`, `server/`, `dependencies/`,
`icon.png`; CLI offers `mcpb init | pack | sign | verify`. **Packages:** a
whole MCP server + runtime + deps. **Installs into:** Claude Desktop (drag-drop
or in-app directory). Renamed from `.dxt` in 2025-09; old `.dxt` still loads.
Claude Desktop only — does not target Claude Code or any other surface.

### 2.2 Smithery CLI — `smithery-ai/cli`

URL: <https://github.com/smithery-ai/cli>, docs at
<https://smithery.ai/docs/concepts/cli>. MIT; latest v4.7.4 (Mar 2026); 7k+
servers in the registry (as of 2026-04).

```bash
npm i -g @smithery/cli
smithery mcp add <server> --client cursor|claude|vscode|windsurf
```

**Packages:** a pointer into Smithery's hosted registry; **installs into:**
each client's config file (Cursor's `mcp.json`, Claude Desktop config, VS Code
`settings.json`, Windsurf MCP settings). Closest thing to a polyglot installer
today; friction is that servers must be Smithery-registered.

### 2.3 Cursor deeplinks — `cursor-deeplink` (Python) + official generator

URLs: <https://cursor.com/docs/mcp/install-links>,
<https://pypi.org/project/cursor-deeplink/>.

`cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64>`.
Embeddable in a README badge. **Packages:** a JSON MCP config blob;
**installs into:** Cursor's `mcp.json`. Cursor-only, but VS Code ships the
same pattern at `vscode:mcp/install?…`.

### 2.4 VS Code MCP Registry

URL: <https://aka.ms/vscode-mcp-registry-web>. 91+ curated servers (2026-03).
Install via Extensions view `@mcp` filter or `vscode:mcp/install?…` magic
links; writes to `.vscode/mcp.json` or user profile. **Installs into:** VS
Code plus every IDE that embeds the Copilot extension.

### 2.5 Gemini CLI Extensions

URL: <https://google-gemini.github.io/gemini-cli/docs/extensions/>. Apache-2.0.
`gemini extensions install <git-url-or-path>` + `disable|enable|update|link`.
**Packages:** `gemini-extension.json` + `GEMINI.md` + MCP servers + custom
commands. **Installs into:** `~/.gemini/extensions/`. The MCP servers
themselves run unchanged under Claude Code and Copilot CLI.

### 2.6 Databricks `ai-dev-kit` — **the closest thing to a true unified installer today**

URL: <https://github.com/databricks-solutions/ai-dev-kit> (license: Apache-2.0
per repo). Ships `install.sh` (bash, `curl | bash`-able) and `install.ps1`
(PowerShell, `irm … | iex`).

```bash
bash <(curl -sL https://raw.githubusercontent.com/databricks-solutions/ai-dev-kit/main/install.sh)
```

Flags: `--global`, `--force`, `--skills-only`, `--skills-profile <name>`,
`--list-skills`. **Packages:** a Databricks skill+MCP bundle. **Installs
into** Claude Code, Cursor, Codex, Copilot, Gemini CLI, and Antigravity in one
invocation — the working reference for "one command, six IDEs."

### 2.7 Homebrew tap — `mcpmux/homebrew-tap`

URL: <https://github.com/mcpmux/homebrew-tap>. `brew install --cask
mcpmux/tap/mcpmux`. **Packages:** a gateway that multiplexes multiple MCPs
into one endpoint any IDE targets. Sibling strategy: run one gateway, point
every IDE at it, skip per-IDE installs.

### 2.8 Zed context servers — `@getmcp/cli`

<https://zed.dev/docs/extensions/mcp-extensions>. Two paths: (a) Zed's
extensions marketplace (`context_servers` namespace); (b) `npx @getmcp/cli
add <id>` writes `~/.config/zed/settings.json#context_servers`. No
`.mcpb`/`.vsix` equivalent for Zed yet.

### 2.9 v0 Platform MCP — the remote-first pattern

<https://v0.app/docs/api/platform/adapters/mcp-server>. Ships as a remote
Streamable-HTTP MCP at `https://mcp.v0.dev` (plus npm `v0-platform-mcp`).
"Installation" in any IDE is just `npx mcp-remote https://mcp.v0.dev
--header "Authorization: Bearer $V0_API_KEY"`. We don't distribute a binary;
we distribute a URL.

## 3 · Shared configuration formats that survive the trip

| Format | Purpose | Accepted by |
| --- | --- | --- |
| **`AGENTS.md`** | Project-root, always-on agent instructions | OpenAI Codex (native), GitHub Copilot, Cursor, Windsurf, Amp, Devin, Aider; Claude Code via symlink to `CLAUDE.md` |
| **`CLAUDE.md`** / **`GEMINI.md`** | Per-tool variants of the same content | Claude Code / Gemini CLI |
| **`SKILL.md`** (YAML frontmatter + markdown) | Progressive-loading skill body | Claude Code, Claude Desktop skills, Codex CLI, Cursor `.cursor/skills/`, Windsurf `.windsurf/skills/`, GitHub Copilot `.github/skills/` |
| **`.cursor/rules/*.mdc`** | Cursor-dialect rules with `alwaysApply`/`globs` | Cursor only |
| **`.windsurf/rules/*.md`** | Windsurf-dialect rules with `activation:` | Windsurf only |
| **`.clinerules/*.md`** | Cline always-on, filename-ordered | Cline only |
| **`.github/copilot-instructions.md`** | Copilot always-on | GitHub Copilot |
| **Open Plugin `plugin.json`** (<https://open-plugins.com/plugin-builders/specification>) | Cross-IDE portable plugin manifest bundling skills, hooks, MCP, LSP, rules | Cursor, Claude Code (via `.claude-plugin/`), OpenCode; spec-only on Codex/Gemini/Windsurf/VS Code |
| **Agent Skills spec (`agentskills.my/specification`)** | Open standard for `SKILL.md` alone | Claude Code, Cursor, Copilot, Codex |

**AGENTS.md** moved under the Linux Foundation's Agentic AI Foundation in
Dec 2025 with OpenAI, Anthropic, Google, and AWS backing — the first genuine
cross-vendor agreement on a file format, ending the "three copies of the same
paragraph" problem.

## 4 · Observations

- The industry has converged on **MCP as the execution lingua franca** and
  diverged on **packaging dialects**. `.mcpb`, Cursor deeplinks, VS Code
  protocol URLs, `gemini extensions install`, Codex `.codex-plugin/`, Zed
  `context_servers`, and v0's remote-first model all point at the same MCP
  stdio or Streamable-HTTP binary.
- **Smithery** (registry-backed CLI) and **Databricks ai-dev-kit**
  (bash/ps1 + per-IDE adapters) are the two working proofs of a unified
  installer. Smithery wins on registry reach; ai-dev-kit wins on integration
  depth and registry independence.
- **AGENTS.md + SKILL.md is the stable interop pair** — one always-on rule
  file, one progressive-loading skill body, accepted by 6+ tools untranslated.
- **There is no neutral cross-IDE installer today for a skill+MCP bundle.**
  `ai-dev-kit` is Databricks-branded, Smithery needs registry entries.
  A generic "drop one script, install everywhere" is OSS whitespace.

## 5 · Packaging recommendations: unified installer *and* native targets

**Do both. This is a false dichotomy in practice.** The reference architecture
for the prompt-to-asset bundle:

1. **One repo, one MCP binary, one SSOT skill body** — exactly as Category 19
   prescribes (Humazier pattern).

2. **Ship a native asset per surface, auto-generated from the SSOT.** Each
   is cheap once `scripts/sync-mirrors.sh` exists:
   - `.mcpb` bundle for **Claude Desktop** via `@anthropic-ai/mcpb pack`.
   - `.claude-plugin/plugin.json` + `marketplace.json` for **Claude Code**.
   - **"Add to Cursor" deeplink badge** + **VS Code `vscode:mcp/install?…`
     badge** in the README.
   - `gemini-extension.json` at repo root → `gemini extensions install
     https://github.com/<us>/prompt-to-asset` is one command.
   - `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` for
     **Codex**.
   - `context_servers` snippet for **Zed**, filed extension later.
   - `AGENTS.md` symlinked to `CLAUDE.md`/`GEMINI.md`.
   - A hosted Streamable-HTTP endpoint so **v0**, Claude Desktop remote-MCP,
     and any future client can connect without any install.

3. **Ship ONE universal installer — `bash <(curl -sL …)` + `iwr … | iex`** —
   modelled on `databricks-solutions/ai-dev-kit`. Detects which IDEs exist
   (`~/.claude/`, `~/.cursor/`, `~/.gemini/`, `~/.codex/`, `.vscode/`,
   `~/.config/zed/`) and writes the per-IDE adapter into each. Flags
   `--all`, `--only claude,cursor`, `--skills-only`, `--uninstall`.
   Idempotent, JSON-merge (never regex), back up before write. This is the
   marketing surface ("one command").

4. **Register with Smithery + the VS Code MCP Registry** for discovery —
   buys one-click badges for users already in those ecosystems.

5. **Do not invent a new manifest standard.** Use AGENTS.md, SKILL.md
   (Agent Skills spec), and Open Plugin `plugin.json` — all OSS, already
   multi-IDE.

The short version: **native per-IDE assets are not a tax, they are ~10 lines
of JSON each, auto-generated from SSOT.** The unified installer is the
*marketing surface*; native assets are the *correct integration*; the hosted
remote MCP is the *zero-install escape hatch*. Shipping all three is the
2026 baseline, not a stretch goal — `ai-dev-kit`, Smithery, and v0
demonstrate pieces today, and nobody has stitched the full picture for an
OSS asset-generation skill. That's the packaging whitespace to claim.
