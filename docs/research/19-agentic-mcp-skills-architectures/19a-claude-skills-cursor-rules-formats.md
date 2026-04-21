---
category: 19-agentic-mcp-skills-architectures
angle: 19a
title: "Claude Skills, Cursor/Windsurf/Cline Rules, Codex & Gemini Plugin Formats — A Cross-IDE Packaging Reference"
slug: 19a-claude-skills-cursor-rules-formats
author: research-subagent-19a
date: 2026-04-19
status: draft
word_count_target: "3000-4500"
primary_sources:
  - https://docs.anthropic.com/en/docs/claude-code/skills
  - https://code.claude.com/docs/en/plugins-reference
  - https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
  - https://www.cursor.com/docs/context/rules
  - https://docs.windsurf.com/windsurf/cascade/memories
  - https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
  - https://developers.openai.com/codex/plugins/build/
  - https://developers.openai.com/codex/guides/agents-md/
concrete_examples:
  - /Users/mohamedabdallah/Work/Projects/Humazier/  # cross-IDE bundle used as template
tags: [claude-skills, plugin-manifest, cursor-rules, windsurf-rules, clinerules, codex-plugin, gemini-extension, mcp, hooks, sessionstart]
---

## Executive Summary

Every major coding agent in 2025–2026 now ships a "drop a file in a folder and the agent picks it up" extension surface, but each vendor picked a slightly different shape. For the **prompt-to-asset** project, where we want a single prompt-engineering ruleset plus asset-generation commands to work in Claude Code, Cursor, Windsurf, Cline, Codex, and Gemini CLI, we need to understand those shapes concretely so one repo can ship to all of them without duplicating behavior.

**Top findings (the three things worth knowing before anything else):**

1. **`SKILL.md` is becoming the de facto cross-agent skill format.** Anthropic's spec (YAML frontmatter with `name`, `description`, and optional `allowed-tools`, plus a markdown body and sibling scripts) is now accepted by Claude Code's plugin system, has been reproduced almost verbatim by OpenAI Codex's `.codex-plugin/` layout (`skills/<name>/SKILL.md`), and is also the unit Cursor and Windsurf use under `.cursor/skills/` and `.windsurf/skills/` when shipping agent skills next to their rules. One `SKILL.md` file, written once, can be symlinked or copied into all five ecosystems.

2. **Rules are not skills — they are "always-on context", and every IDE has its own frontmatter dialect.** Cursor (`.cursor/rules/*.mdc`) uses `description`, `globs`, `alwaysApply`. Windsurf (`.windsurf/rules/*.md`) uses `description` plus an `always_on`/`glob`/`model_decision`/`manual` activation mode. Cline (`.clinerules/*.md`) concatenates every file alphabetically and optionally honors a `paths:` glob list. Claude Code, Codex, and Gemini CLI use `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` as their always-on rule surface. The frontmatter fields **are not portable** — the markdown body is. Any rule we ship must be the same body with six different two-line frontmatter wrappers.

3. **Hooks (SessionStart, UserPromptSubmit) are the missing piece between skills and rules, and Humazier already demonstrates the reference pattern** for cross-IDE hook shipping. Claude Code accepts hooks in `.claude-plugin/plugin.json`; Codex accepts the same hook shape in `.codex/hooks.json` with minor renames (`timeout` → `timeoutMs`, `command`+`args` split). Cursor ships hooks through a separate `hooks.json` contract.

> **Updated 2026-04-21:** Gemini CLI now has a full lifecycle hooks system. Hooks shipped as a documented feature (v0.26.0+) and extensions can bundle their own hooks via a `hooks/hooks.json` file inside the extension directory (PR #14460 merged). Supported events include `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeTool`, `AfterTool`, `Notification`, `PreCompress`, and `BeforeToolSelection`. The `SessionStart` hook fires on startup, resume, or after `/clear`. Extension hooks require explicit user consent (security warning shown at install time). The prompt-to-asset bundle can now ship Gemini CLI hooks alongside Claude/Codex hooks — this is no longer a Claude/Codex-only mechanism.

---

## Per-IDE Manifest Schema

Below is the minimum-surface-area reference for each extension system, grounded in primary docs and in the concrete Humazier repo.

### 1. Anthropic Claude Skills (`SKILL.md`)

**Source of truth:** [docs.anthropic.com/en/docs/claude-code/skills](https://docs.anthropic.com/en/docs/claude-code/skills)

A Skill is a directory containing a `SKILL.md` file and any sibling scripts/templates it needs. Claude Code auto-discovers skills in:

- `~/.claude/skills/<skill-name>/` (user-level)
- `<project>/.claude/skills/<skill-name>/` (project-level)
- `<plugin_root>/skills/<skill-name>/` when installed via a plugin

**`SKILL.md` frontmatter (YAML between `---` markers):**

```yaml
---
name: logo-generator           # required; lowercase, hyphens, digits; max 64 chars; becomes /logo-generator
description: >                 # required; max 1024 chars; this is what Claude reads to decide WHEN to invoke
  Generate a production-grade app/brand logo in a requested style (flat, mascot,
  monogram, isometric). Picks the right model (gpt-image-1 vs Imagen 4 vs Recraft),
  enforces transparent background when asked, and returns a PNG + SVG pair.
  Trigger: /logo-generator or "make a logo for ..."
allowed-tools: [Read, Write, Shell, WebFetch]   # optional; restricts tool surface
argument-hint: "<brand-name> [--style=flat|mascot|mono] [--bg=transparent]"
version: 0.1.0
---
```

Anthropic's public documentation lists `name` and `description` as required ([docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code/skills)). The issue [anthropics/claude-code#33724](https://github.com/anthropics/claude-code/issues/33724) confirms the broader parsed-but-under-documented set: `allowed-tools`, `context`, `agent`, `arguments`, `version`, `model`, `paths`, `when_to_use`, `disable-model-invocation`, `user-invocable`, `compatibility`, `license`, `metadata`, `argument-hint`. Treat everything past `name`/`description`/`allowed-tools` as advisory — it works today but may move.

**Body.** Plain markdown. No special grammar, but a convention has emerged: `## Purpose`, `## Trigger`, `## Process` (numbered steps), `## Inputs`, `## Outputs`, `## Failure Modes`. Humazier's `skills/humanize/SKILL.md` follows that shape and is a good reference target.

**Sibling scripts.** Skill packages can ship `scripts/` alongside `SKILL.md`. The skill body references them with relative paths; the agent runs them via its `Shell` tool. This is what turns a skill from "system prompt" into "executable capability".

### 2. Claude Code Plugin (`.claude-plugin/plugin.json` + `marketplace.json`)

**Source of truth:** [code.claude.com/docs/en/plugins-reference](https://code.claude.com/docs/en/plugins-reference) and [docs.claude.com/en/docs/claude-code/plugin-marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces).

A plugin is a git-sync-able bundle of skills, commands, agents, hooks, and optional MCP servers. Layout:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── <skill-name>/SKILL.md
├── commands/
│   └── <cmd>.md              # becomes /cmd
├── agents/
│   └── <agent>.md            # shows in /agents
├── hooks/
│   └── *.js                  # referenced by plugin.json hooks block
└── README.md
```

**Minimal `plugin.json`:**

```json
{
  "name": "prompt-to-asset",
  "description": "Turns vague asset requests into production-grade prompts and images.",
  "version": "0.1.0"
}
```

**Full `plugin.json` with hooks** (extracted from Humazier's `.claude-plugin/plugin.json`):

```json
{
  "name": "humanizer",
  "description": "Make assistant output sound human …",
  "author": { "name": "Mohamed Abdallah", "url": "https://github.com/…" },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/humanizer-activate.js\"",
            "timeout": 5,
            "statusMessage": "Loading humanizer mode..."
          }
        ]
      }
    ],
    "UserPromptSubmit": [ /* identical shape */ ]
  }
}
```

Important details from the Humazier reference:

- `${CLAUDE_PLUGIN_ROOT}` is injected by Claude Code and resolves to the plugin's installed path. Always use it — never hardcode.
- `timeout` is seconds (vs. Codex `timeoutMs`).
- Hooks that need to inject context into the model turn should print to stdout; Claude Code treats stdout as hidden system-level context for `SessionStart` and `UserPromptSubmit`.

**Hook event vocabulary** (from the Claude Code reference): `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`. `SessionStart` is the right hook for "activate this behavior for the whole session"; `UserPromptSubmit` is the right one for "re-check mode on every user turn".

**Marketplace manifest.** A separate file, `.claude-plugin/marketplace.json`, catalogs plugins for distribution (git clone a repo → `/plugin install` reads the marketplace):

```json
{
  "$schema": "https://claude.com/marketplace-schema.json",
  "name": "prompt-to-asset-marketplace",
  "displayName": "Prompt Enhancer",
  "description": "Bundles for logo/icon/asset prompt enhancement.",
  "plugins": [
    {
      "name": "prompt-to-asset",
      "source": "./",
      "version": "0.1.0",
      "tags": ["assets", "images", "prompt-engineering"]
    }
  ]
}
```

### 3. Cursor Rules (`.cursor/rules/*.mdc`)

**Source of truth:** [cursor.com/docs/context/rules](https://www.cursor.com/docs/context/rules).

Cursor replaced the legacy single-file `.cursorrules` with a directory of `.mdc` files. Each file has YAML frontmatter and markdown body. The frontmatter chooses one of **four activation modes**:

| Mode | Frontmatter shape | When it fires |
|---|---|---|
| Always | `alwaysApply: true` | Every request in the workspace |
| Auto-attached | `globs: ["src/**/*.ts"]` | Whenever a matched file is in context |
| Agent-fetched | `description: "..."` (only) | Agent decides from description |
| Manual | none of the above, or `alwaysApply: false` | Only when the user `@rule-name`s it |

**Example (from Humazier's `.cursor/rules/humanizer.mdc`):**

```yaml
---
description: Humanize assistant output. Drop AI-isms, engineer burstiness, preserve technical accuracy.
alwaysApply: true
---

Write like a careful human. All technical substance stays exact. Only AI-slop dies.
…
```

**Example for a prompt-to-asset domain rule** (agent-fetched):

```yaml
---
description: >
  When the user asks for a logo, icon, favicon, OG image, or any image asset,
  enforce the prompt-to-asset checklist (model pick, bg-transparent handling,
  aspect ratio, safe zones, negative-prompt defaults) before calling any tool.
globs: []          # agent-fetched, not auto-attached
alwaysApply: false
---
```

Cursor also hosts project skills at `.cursor/skills/<name>/SKILL.md` using the same Anthropic format — so the same file can sit in both `.claude/skills/` and `.cursor/skills/` untouched.

### 4. Windsurf Rules (`.windsurf/rules/*.md`)

**Source of truth:** [docs.windsurf.com/windsurf/cascade/memories](https://docs.windsurf.com/windsurf/cascade/memories) and [Windsurf-Samples/cascade-customizations-catalog](https://github.com/Windsurf-Samples/cascade-customizations-catalog).

Windsurf rules are markdown files in `.windsurf/rules/`. Frontmatter uses a single `activation` axis — four explicit modes rather than Cursor's composed `alwaysApply + globs` shape:

```yaml
---
description: Prompt-enhancer asset rules.
activation: always_on          # one of: always_on | glob | model_decision | manual
glob: ""                       # required when activation=glob, e.g. "**/*.{png,svg}"
---
```

Humazier uses `always_on: true` (a legacy shorthand) — the current docs prefer the explicit `activation:` key. Both are honored.

**Scope precedence:** global (`~/.codeium/windsurf/`) → workspace → project (`.windsurf/rules/`). Windsurf also supports `AGENTS.md` at the repo root as a durable, activation-less context file; that file is the cross-vendor lowest-common-denominator and is what Codex reads too.

### 5. Cline Rules (`.clinerules/*.md`)

**Source of truth:** [cline/cline PR #2781](https://github.com/cline/cline/pull/2781) and [thepromptshelf.dev/blog/cline-rules-complete-guide-2026](https://thepromptshelf.dev/blog/cline-rules-complete-guide-2026).

Cline has the simplest contract. Drop `.md` files into `.clinerules/`. Cline concatenates them **alphabetically** into the system prompt. Ordering matters — prefix files with `01-`, `02-` to control sequence.

**Optional conditional frontmatter:**

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/handlers/**"
---
```

`paths` scopes the rule to files under those globs; with no frontmatter, the rule is always on. That's the whole spec — no description field, no activation enum, no globs-with-negation. Multi-root workspaces have a known limitation: Cline only reads the primary folder's `.clinerules/` ([cline#4642](https://github.com/cline/cline/issues/4642)).

### 6. OpenAI Codex Plugin (`.codex-plugin/plugin.json` + `AGENTS.md`)

**Source of truth:** [developers.openai.com/codex/plugins/build](https://developers.openai.com/codex/plugins/build/) and [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md/).

Codex borrowed Anthropic's shape almost 1:1, with small renames:

```
plugins/prompt-to-asset/
├── .codex-plugin/plugin.json
├── skills/
│   └── logo-generator/SKILL.md
└── assets/
    └── icon.svg
```

**`plugin.json` (from Humazier's `plugins/humanizer/.codex-plugin/plugin.json`):**

```json
{
  "name": "humanizer",
  "displayName": "Humanizer",
  "version": "0.1.0",
  "description": "…",
  "license": "MIT",
  "skills": "./skills/",
  "ui": { "icon": "./assets/icon.svg", "color": "#7C9885" },
  "defaultPrompt": "Activate humanizer mode… Read ./skills/humanizer/SKILL.md for the full ruleset."
}
```

**Hooks (separate file, `.codex/hooks.json`):** Codex kept the event names from Claude Code but split `command` + `args` and renamed `timeout` → `timeoutMs`:

```json
{
  "$schema": "https://openai.com/schemas/codex-hooks-v1.json",
  "hooks": {
    "SessionStart": [
      { "type": "command", "command": "node",
        "args": ["${HOME}/.codex/hooks/activate.js"], "timeoutMs": 2000 }
    ],
    "UserPromptSubmit": [ /* … */ ]
  }
}
```

**Rules/context surface:** `AGENTS.md`. Codex walks from the git root down to the cwd and concatenates every `AGENTS.md` along the way, nearer files overriding earlier ones. `.override.md` suffixes hard-replace. There is no `alwaysApply` or glob — just presence. For prompt-to-asset this is the place to drop the "prompt-enhancement checklist" that should apply to every Codex turn.

**Marketplace:** `$REPO/.agents/plugins/marketplace.json` (repo-scoped) or `~/.agents/plugins/marketplace.json` (personal). Schema mirrors Anthropic's marketplace.json:

```json
{
  "name": "prompt-to-asset-agents-marketplace",
  "plugins": [
    { "name": "prompt-to-asset",
      "version": "0.1.0",
      "source": "./plugins/prompt-to-asset" }
  ]
}
```

### 7. Gemini CLI Extensions (`gemini-extension.json` + `GEMINI.md`)

**Source of truth:** [github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md).

Gemini CLI has no concept of "skill" or "hook". An extension is just a directory with:

- a `gemini-extension.json` manifest,
- one or more markdown context files,
- optional MCP servers, themes, and `excludeTools` entries.

**Schema (from Humazier's `gemini-extension.json`):**

```json
{
  "name": "prompt-to-asset",
  "version": "0.1.0",
  "description": "Prompt enhancement for asset generation.",
  "contextFileName": ["GEMINI.md", "skills/logo-generator/SKILL.md"],
  "mcpServers": { /* optional */ },
  "excludeTools": []
}
```

Key detail: `contextFileName` accepts a **single filename**, an **array**, or (per [PR #3875](https://github.com/google-gemini/gemini-cli/pull/3875)) a **glob** such as `"skills/**/SKILL.md"`. That glob support is what lets us include a whole `SKILL.md` tree without listing each one. Gemini treats every matched markdown file as always-on system context — there is no activation mode, so the skills must be written to be harmless when irrelevant.

---

## Humazier-Style Cross-IDE Bundle Plan for `prompt-to-asset`

The Humazier repo at `/Users/mohamedabdallah/Work/Projects/Humazier/` is already a working example of one behavior shipped into all six systems. We lift its layout directly.

### Target directory tree

```
prompt-to-asset/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── plugins/
│   └── prompt-to-asset/
│       └── .codex-plugin/plugin.json
├── .agents/plugins/marketplace.json          # Codex marketplace
├── .codex/hooks.json                         # Codex SessionStart + UserPromptSubmit
├── gemini-extension.json                     # Gemini CLI
├── GEMINI.md                                 # Gemini always-on context
├── AGENTS.md                                 # Codex + Windsurf always-on context
├── CLAUDE.md                                 # Claude Code always-on context
├── .cursor/
│   ├── rules/
│   │   └── prompt-to-asset.mdc               # alwaysApply: true
│   └── skills/                               # Cursor-visible skills
│       └── logo-generator/ → ../../skills/logo-generator/
├── .windsurf/
│   ├── rules/prompt-to-asset.md              # activation: always_on
│   └── skills/ → ../skills/
├── .clinerules/
│   └── 01-prompt-to-asset.md                 # Cline always-on (no frontmatter)
├── skills/                                   # the canonical SKILL.md directory
│   ├── logo-generator/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── pick_model.py
│   │       ├── enhance_prompt.py
│   │       └── postprocess.py
│   ├── app-icon-generator/
│   ├── favicon-bundle/
│   ├── og-image/
│   └── transparent-png/
├── commands/                                 # Claude Code slash commands
│   ├── logo.md
│   ├── icon.md
│   └── favicon.md
├── hooks/                                    # Claude Code + Codex activation scripts
│   ├── prompt-to-asset-activate.js
│   ├── prompt-to-asset-mode-tracker.js
│   └── package.json
└── scripts/                                  # install/uninstall for Windsurf/Cursor/Cline
    ├── install.sh
    └── uninstall.sh
```

**Single source of truth:** `skills/<name>/SKILL.md`. Everything else is either a manifest that points at it or a thin always-on rule that tells the agent "a skill is available; look there when the user mentions a logo/icon/OG image".

### What the always-on rule body says (shared across Cursor/Windsurf/Cline/Claude/Codex/Gemini)

```markdown
When the user asks for an image asset (logo, app icon, favicon, OG image, illustration, splash screen, hero image):

1. Do not call an image model immediately. First run the prompt-to-asset checklist.
2. Pick the model deliberately:
   - text on the image → Ideogram or Recraft
   - hard RGBA transparency → gpt-image-1 (alpha-aware) or Recraft vector
   - photorealistic product → Imagen 4 / gpt-image-1
   - vector/SVG native → Recraft
3. Never trust "transparent" as a prompt word. Enforce bg=transparent via API flag and/or
   post-process with BRIA RMBG / BiRefNet. Verify the checker pattern is not rendered IN the image.
4. Enforce correct aspect ratio and safe zones for the target (iOS HIG, Material, favicon 16/32/180/512, OG 1200x630).
5. Ship PNG + SVG when the asset is a logo or icon.
6. When uncertain about style, ask one clarifying question before generating.

Load the matching SKILL.md for the asset type (logo-generator, app-icon-generator, favicon-bundle, og-image, transparent-png) before executing.
```

That body is identical in `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.clinerules/01-prompt-to-asset.md`, `.cursor/rules/prompt-to-asset.mdc`, and `.windsurf/rules/prompt-to-asset.md`. Only the frontmatter wrapper differs, and the install script stamps the right wrapper on each copy.

### Wrapper stamping (what the install script does)

| Target | Wrapper |
|---|---|
| `.cursor/rules/prompt-to-asset.mdc` | `---\ndescription: …\nalwaysApply: true\n---\n` |
| `.windsurf/rules/prompt-to-asset.md` | `---\ndescription: …\nactivation: always_on\n---\n` |
| `.clinerules/01-prompt-to-asset.md` | (no frontmatter) |
| `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` | (no frontmatter; straight concat) |

### Hooks (Claude Code + Codex only)

Following Humazier's pattern, we register two hooks that are byte-identical node scripts:

- **`SessionStart`** → `hooks/prompt-to-asset-activate.js` — writes `.prompt-to-asset-active` flag, reads the loaded `SKILL.md` body, emits it as hidden system context so the agent starts the session already "armed" with the asset-generation checklist.
- **`UserPromptSubmit`** → `hooks/prompt-to-asset-mode-tracker.js` — watches the incoming turn for `/pe off`, `/pe logo`, `/pe icon` tokens and updates the flag file. Statusline scripts read the flag for a visible indicator.

Claude Code wires these via `.claude-plugin/plugin.json.hooks`; Codex via `.codex/hooks.json`. Cursor has an independent hooks system (`hooks.json` at the repo root) — we can plumb the same two scripts into it later if needed, but it is not day-one. Windsurf and Cline have no lifecycle hooks, so behavior there relies entirely on the always-on rule + `SKILL.md` context.

> **Updated 2026-04-21:** Gemini CLI now supports lifecycle hooks via `hooks/hooks.json` inside an extension directory (merged PR #14460, v0.26.0+). The extension can define `SessionStart`, `BeforeTool`, `AfterTool`, `BeforeModel`, `AfterModel`, etc. hooks. These require explicit user consent on install. Wire the `prompt-to-asset-activate` hook into `hooks/hooks.json` alongside the Claude/Codex wiring. Note that Gemini CLI does not have an exact `UserPromptSubmit` equivalent — use `BeforeModel` (fires before each model call) as the closest substitute for turn-level re-checking.

### Commands (Claude Code)

One markdown per asset type in `commands/`:

```markdown
---
description: Generate a production-grade logo bundle (PNG + SVG).
---

Read `skills/logo-generator/SKILL.md` and follow the Process section for input:

$ARGUMENTS

Report:
  - Model picked and why
  - Transparent-bg strategy (native vs. post-process)
  - Final files written
```

Codex reads the same `commands/*.md` when they are placed under `plugins/prompt-to-asset/commands/` (its slash command contract is near-identical).

### Install matrix

| Agent | Install step |
|---|---|
| Claude Code | `/plugin marketplace add <repo>` then `/plugin install prompt-to-asset` |
| Codex | Clone repo; `.agents/plugins/marketplace.json` auto-discovered; `/plugins` |
| Cursor | Clone repo; `.cursor/rules` auto-loaded |
| Windsurf | Clone repo; `.windsurf/rules` auto-loaded |
| Cline | Clone repo; `.clinerules/` auto-loaded |
| Gemini CLI | `gemini extensions install <repo>` |

The `scripts/install.sh` handles per-user global installs (symlink `skills/`, `.cursor/`, `.windsurf/`, `.clinerules/` into `$HOME` counterparts) for developers who want the behavior outside one project.

### What NOT to share across IDEs

- **Tool names.** `allowed-tools: [Read, Write, Shell, WebFetch]` is Claude-specific syntax. Codex reads `allowed-tools` but its tool names differ (`apply_patch`, `shell`). Keep `allowed-tools` out of `SKILL.md` or set it to the Claude names and let Codex fall back to default.
- **Hook env vars.** `${CLAUDE_PLUGIN_ROOT}` works in Claude, not Codex. Codex uses `${HOME}/.codex/hooks/…`. The install script handles the copy/rename.
- **Statusline.** Claude Code and Codex have different statusline contracts; ship separate `.sh`/`.ps1` pairs.

### MCP servers inside these bundles

Every format above has an MCP-shaped hole:

- **Claude Code plugin** — `plugin.json` accepts an `mcpServers` block (same shape as `claude_desktop_config.json`). A prompt-to-asset MCP could expose tools like `enhance_prompt`, `pick_model`, `generate_logo`, `check_transparency`, each a thin Python server.
- **Codex plugin** — same, via `~/.codex/config.toml` `[mcp_servers.*]` blocks. The Humazier bundle does not ship an MCP server today; prompt-to-asset probably should.
- **Gemini CLI extension** — `gemini-extension.json.mcpServers` is a first-class field. This is the easiest MCP host to target.
- **Cursor, Windsurf, Cline** — all three accept MCP servers through their respective settings UIs, not through the rules/skills files. Our bundle should ship an `mcp.json` template that users add once.

The MCP layer is where execution actually lives (call image APIs, run `rembg`, write files). Rules and skills tell the agent *when* and *how*; MCP tools are *what*.

### Trade-offs, gaps, and compatibility matrix

| Capability | Claude Code | Codex | Cursor | Windsurf | Cline | Gemini CLI |
|---|---|---|---|---|---|---|
| `SKILL.md` discovery | native | native | via `.cursor/skills/` | via `.windsurf/skills/` | no — use `.clinerules/` | via `contextFileName` glob |
| YAML-frontmatter rules | `CLAUDE.md` (no frontmatter) | `AGENTS.md` (no frontmatter) | `.mdc` with `alwaysApply`/`globs` | `.md` with `activation:` | `paths:` only | `GEMINI.md` (no frontmatter) |
| Slash commands | `commands/*.md` | `commands/*.md` | `.cursor/commands/` | no | no | no |
| SessionStart hook | yes (`plugin.json`) | yes (`.codex/hooks.json`) | yes (separate `hooks.json`) | no | no | yes (v0.26.0+, via `hooks/hooks.json` in extension) |
| UserPromptSubmit hook | yes | yes | yes | no | no | no (nearest equivalent: `BeforeModel` or `BeforeAgent`) |
| PreToolUse / PostToolUse | yes | yes | partial | no | no | yes (`BeforeTool` / `AfterTool`) |
| MCP servers in manifest | `plugin.json.mcpServers` | `config.toml` | settings UI | settings UI | settings UI | `gemini-extension.json.mcpServers` |
| Marketplace format | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json` | none (git clone) | none (git clone) | none (git clone) | `gemini extensions install` |
| Enforce tool allowlist | `allowed-tools` in `SKILL.md` | `allowed-tools` (best-effort) | no | no | no | `excludeTools` in manifest |
| Conditional activation by file | `paths` in frontmatter | no | `globs:` | `activation: glob` + `glob:` | `paths:` | no |

**Practical takeaways from the matrix:**

> **Updated 2026-04-21:** Point 1 and 2 below are revised — Gemini CLI now has lifecycle hooks.

1. Claude Code, Codex, and **Gemini CLI** (v0.26.0+) all have lifecycle hooks. If the prompt-to-asset needs *enforcement* (e.g. "never call the image API without first running `enhance_prompt`"), enforcement lives in Claude/Codex/Gemini hooks. Windsurf and Cline still rely entirely on always-on context + agent judgment.
2. Gemini CLI is no longer hookless. It now supports `SessionStart`, `BeforeTool`, `AfterTool`, `BeforeModel`, and more via extension `hooks/hooks.json`. Its `contextFileName` glob still vacuums up every `SKILL.md` at session start, giving good default behavior — hooks add enforcement on top.
3. Cline is the *simplest*: alphabetical concat is the whole API. A single `01-prompt-to-asset.md` file gets us to parity with the other hook-less surfaces (now only Windsurf).
4. Cursor and Windsurf are peers on rules, but only Cursor's `.mdc` frontmatter survives a round-trip copy without a rename — Windsurf uses a different activation key (`activation:` vs `alwaysApply:`). Our install script must translate, not symlink.

### Concrete SKILL.md example for `transparent-png`

To make the bundle plan concrete, here is the target body for one of the five skills. It would live at `skills/transparent-png/SKILL.md` and be referenced by every IDE layer above:

```yaml
---
name: transparent-png
description: >
  Produce a PNG (or PNG+SVG) with a truly transparent background — no grey checker
  rendered into the image, no "transparent.png" filename with a white rectangle behind
  the subject. Handles the common Gemini/DALL-E failure mode where the model draws the
  transparency-indicator checker pattern instead of producing RGBA.
  Trigger: "transparent background", "bg transparent", "no background", "cutout".
allowed-tools: [Read, Write, Shell, WebFetch]
version: 0.1.0
---
```

The body (summarized) then enforces: (a) pick an alpha-native model first (`gpt-image-1` with `background="transparent"`, or Recraft) instead of Imagen; (b) if the only available model is RGB-only, post-process with `rembg` or BRIA RMBG rather than prompt-engineering transparency; (c) verify the output by sampling corner pixels and rejecting any image whose corners form a 2×2 checker pattern; (d) save as `<name>.png` with real alpha and, if the subject is a logo, emit a companion SVG via `vtracer`.

That single skill body travels into all six IDEs unchanged. Only its discovery path differs.

---

## References

**Primary — specs and official docs**

- Anthropic — Claude Skills reference. [docs.anthropic.com/en/docs/claude-code/skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- Anthropic — Claude Code plugins reference. [code.claude.com/docs/en/plugins-reference](https://code.claude.com/docs/en/plugins-reference)
- Anthropic — Create and distribute a plugin marketplace. [docs.claude.com/en/docs/claude-code/plugin-marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces)
- Anthropic — `anthropics/claude-plugins-official` source. [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- Claude Code issue — full list of parsed `SKILL.md` frontmatter fields. [github.com/anthropics/claude-code/issues/33724](https://github.com/anthropics/claude-code/issues/33724)
- Cursor — Rules documentation. [cursor.com/docs/context/rules](https://www.cursor.com/docs/context/rules)
- Windsurf — Cascade memories & rules activation. [docs.windsurf.com/windsurf/cascade/memories](https://docs.windsurf.com/windsurf/cascade/memories)
- Windsurf-Samples — cascade customizations catalog. [github.com/Windsurf-Samples/cascade-customizations-catalog](https://github.com/Windsurf-Samples/cascade-customizations-catalog)
- Cline — `.clinerules` folder PR. [github.com/cline/cline/pull/2781](https://github.com/cline/cline/pull/2781)
- Cline — multi-root workspace limitations. [github.com/cline/cline/issues/4642](https://github.com/cline/cline/issues/4642)
- OpenAI — Codex plugin build guide. [developers.openai.com/codex/plugins/build](https://developers.openai.com/codex/plugins/build/)
- OpenAI — Codex AGENTS.md. [developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md/)
- OpenAI — Codex slash commands. [developers.openai.com/codex/cli/slash-commands](https://developers.openai.com/codex/cli/slash-commands/)
- OpenAI — Codex config reference. [developers.openai.com/codex/config-reference](https://developers.openai.com/codex/config-reference)
- Google — Gemini CLI extensions reference. [github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md)
- Google — Gemini CLI writing extensions. [github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md)
- Google — Gemini CLI `contextFileName` glob PR. [github.com/google-gemini/gemini-cli/pull/3875](https://github.com/google-gemini/gemini-cli/pull/3875)

**Concrete reference bundle**

- Humazier repo (local reference for every format above): `/Users/mohamedabdallah/Work/Projects/Humazier/`
  - `skills/humanize/SKILL.md`
  - `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
  - `plugins/humanizer/.codex-plugin/plugin.json`
  - `.codex/hooks.json`
  - `.cursor/rules/humanizer.mdc`, `.windsurf/rules/humanizer.md`, `.clinerules/humanizer.md`
  - `gemini-extension.json`, `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`
  - `hooks/humanizer-activate.js`, `hooks/humanizer-mode-tracker.js`
  - `commands/*.toml` (Humazier) / `commands/*.md` (Claude Code convention)

**Secondary — community write-ups (corroboration, not primary)**

- [dev.to/arunkumar0398/claude-code-community-plugin-registry](https://dev.to/arunkumar0398/claude-code-community-plugin-registry-3a38) — community plugin registry notes.
- [mer.vin/2025/12/cursor-ide-rules-deep-dive](https://mer.vin/2025/12/cursor-ide-rules-deep-dive/) — Cursor rules deep dive.
- [design.dev/guides/cursor-rules](https://design.dev/guides/cursor-rules/) — Cursor rules config guide.
- [thepromptshelf.dev/blog/cline-rules-complete-guide-2026](https://thepromptshelf.dev/blog/cline-rules-complete-guide-2026) — Cline rules 2026 guide.
- [skillsplayground.com/guides/windsurf-rules](https://skillsplayground.com/guides/windsurf-rules/) — Windsurf rules guide.
