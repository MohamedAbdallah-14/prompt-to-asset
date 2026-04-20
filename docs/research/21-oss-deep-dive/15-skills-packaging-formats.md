---
wave: 1
role: niche-discovery
slug: 15-skills-packaging-formats
title: "Skills / rules packaging formats across agents"
date: 2026-04-19
sources:
  - https://docs.anthropic.com/en/docs/claude-code/skills
  - https://code.claude.com/docs/en/plugins-reference
  - https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
  - https://www.cursor.com/docs/context/rules
  - https://docs.windsurf.com/windsurf/cascade/memories
  - https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
  - https://developers.openai.com/codex/plugins/build/
  - https://developers.openai.com/codex/guides/agents-md/
  - https://developers.openai.com/codex/config-reference/
  - https://developers.openai.com/codex/mcp
  - https://agents.md/
  - https://agentsmd.online/
  - https://github.com/agentsmd/agents.md
  - https://zed.dev/docs/ai/rules.html
  - https://zed.dev/docs/ai/mcp.html
  - https://vercel.com/docs/agent-resources/vercel-mcp/tools
  - https://v0.dev/docs/projects
  - https://community.vercel.com/t/custom-instructions-in-v0/16782
  - https://github.com/nedcodes-ok/rule-porter
  - https://registry.npmjs.org/rule-porter
  - https://github.com/dmgrok/agent_skills_directory
  - https://github.com/dmgrok/mcp_mother_skills
  - https://github.com/FrancyJGLisboa/agent-skill-creator
  - https://alirezarezvani.github.io/claude-skills/integrations/
  - https://github.com/google-gemini/gemini-cli/pull/3875
  - https://github.com/cline/cline/pull/2781
  - https://github.com/anthropics/claude-code/issues/33724
tags: [skills, cursor-rules, claude-skills, agents-md, packaging]
---

# 15 — Skills / Rules Packaging Formats Across Agents

## Scope

The prompt-to-asset needs to ship the same behaviour — "enhance prompt, pick model, validate output" — into Claude Code, Cursor, Windsurf, Cline, OpenAI Codex, Gemini CLI, Zed, and v0. Each agent has its own file layout, frontmatter dialect, and activation semantics. This note inventories the nine surfaces, lists the OSS converters, and ends with a "one source of truth → compile to all surfaces" recipe. The deep-dive companion is [19a-claude-skills-cursor-rules-formats.md](../19-agentic-mcp-skills-architectures/19a-claude-skills-cursor-rules-formats.md); this note adds Zed, v0, and the shared-standard/converter ecosystem.

## Per-surface summary

### 1. Claude Skills — `SKILL.md` + `.claude-plugin/plugin.json`

- **Doc:** <https://docs.anthropic.com/en/docs/claude-code/skills>, <https://code.claude.com/docs/en/plugins-reference>.
- **Layout:** `skills/<name>/SKILL.md` + sibling `scripts/`. Auto-discovered at `~/.claude/skills/`, `<project>/.claude/skills/`, `<plugin>/skills/`.
- **Frontmatter:** required `name`, `description`; optional `allowed-tools`, `argument-hint`, `version`, `paths`, `when_to_use`, `model`, `user-invocable`, `license` (full parsed set in [anthropics/claude-code#33724](https://github.com/anthropics/claude-code/issues/33724)).
- **Activation:** model-invoked — Claude reads each skill's `description` on session load and decides when to run. `allowed-tools` is the only hard gate.
- **Plugin wrapper:** `.claude-plugin/plugin.json` bundles skills + `commands/*.md` + `agents/*.md` + `hooks/` + `mcpServers`. Hook events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PermissionRequest` — `${CLAUDE_PLUGIN_ROOT}` is injected.
- **Example:** `anthropics/claude-plugins-official`; Humazier at `/Users/mohamedabdallah/Work/Projects/Humazier/`.

### 2. Cursor — `.cursor/rules/*.mdc` (+ `.cursor/skills/`)

- **Doc:** <https://www.cursor.com/docs/context/rules>.
- **Layout:** one `.mdc` file per rule in `.cursor/rules/`; skills (same `SKILL.md` shape) in `.cursor/skills/<n>/SKILL.md`.
- **Frontmatter:** `description`, `globs`, `alwaysApply`. Four activation modes by which fields are set:
  - `alwaysApply: true` → always on.
  - `globs: [...]` → auto-attached when matched file is in context.
  - `description:` only → agent-fetched.
  - none → manual via `@rule-name`.
- **MCP/hooks:** MCP in settings UI; hooks via a separate repo-root `hooks.json`.
- **Example:** [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) (legacy); Humazier's `.cursor/rules/humanizer.mdc`.

### 3. Windsurf — `.windsurf/rules/*.md` (+ `AGENTS.md`)

- **Doc:** <https://docs.windsurf.com/windsurf/cascade/memories>.
- **Frontmatter:** `description` + `activation: always_on | glob | model_decision | manual`. `activation: glob` requires a sibling `glob:` pattern. Precedence: global (`~/.codeium/windsurf/`) → workspace → project.
- **One axis** rather than Cursor's composed `alwaysApply + globs`. Honours `AGENTS.md` at the repo root.
- **Example:** [Windsurf-Samples/cascade-customizations-catalog](https://github.com/Windsurf-Samples/cascade-customizations-catalog).

### 4. Cline — `.clinerules/*.md`

- **Doc:** [cline/cline PR #2781](https://github.com/cline/cline/pull/2781).
- **Layout:** markdown files in `.clinerules/`, concatenated **alphabetically** (`01-`, `02-` prefix to order).
- **Frontmatter:** optional `paths:` glob list — else always on. No `description`, no activation enum.
- **Gotcha:** multi-root workspaces only read the primary folder ([cline#4642](https://github.com/cline/cline/issues/4642)).

### 5. OpenAI Codex — `AGENTS.md` + `.codex-plugin/plugin.json` + `config.toml`

- **Doc:** <https://developers.openai.com/codex/plugins/build/>, <https://developers.openai.com/codex/guides/agents-md/>, <https://developers.openai.com/codex/config-reference/>.
- **Context:** `AGENTS.md`. Codex walks git root → cwd, concatenating each file; `.override.md` suffix hard-replaces.
- **Plugin:** `.codex-plugin/plugin.json` mirrors Anthropic's shape — `skills/<n>/SKILL.md`, `commands/*.md`, `defaultPrompt`. Hooks live in `.codex/hooks.json` with renamed fields (`timeoutMs`, `command`+`args` split).
- **MCP:** `[mcp_servers.<n>]` in `~/.codex/config.toml` or `.codex/config.toml` (trusted). stdio + HTTP transports; `enabled_tools`/`disabled_tools` allow/deny; `startup_timeout_sec`, `tool_timeout_sec`.
- **Marketplace:** `.agents/plugins/marketplace.json` (repo) or `~/.agents/plugins/marketplace.json` (personal).

### 6. Gemini CLI — `gemini-extension.json` (+ `GEMINI.md`)

- **Doc:** <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md>.
- **Manifest:** `name`, `version`, `description`, `contextFileName`, `mcpServers`, `excludeTools`.
- **Activation:** none — every file matched by `contextFileName` is always-on. Since [PR #3875](https://github.com/google-gemini/gemini-cli/pull/3875) (Sep 2025) `contextFileName` accepts globs, e.g. `"skills/**/SKILL.md"`, which vacuums a whole skill tree in.
- **No hooks, no commands.** Reads `AGENTS.md` via `.gemini/settings.json` → `{ "context": { "fileName": "AGENTS.md" } }`.

### 7. Zed — `.rules` + Rules Library

- **Doc:** <https://zed.dev/docs/ai/rules.html>.
- **Layout:** one project-root file, first-match on a hardcoded priority list: `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.
- **Frontmatter:** none. Plain markdown, always-on when matched.
- **Rules Library:** in-app editor; any entry can be flagged default (always attached) or `@rule-name`-invoked. No skill format. MCP via `settings.json` `context_servers` (see <https://zed.dev/docs/ai/mcp.html>).
- **Gap:** [zed#28473](https://github.com/zed-industries/zed/issues/28473) — file list is hardcoded.

### 8. v0 (Vercel) — UI Instructions + Project Knowledge

- **Doc:** <https://v0.dev/docs/projects>, <https://community.vercel.com/t/custom-instructions-in-v0/16782>.
- **No filesystem format.** Three tiers of text entered in UI:
  1. **Account Custom Instructions** — global across all chats.
  2. **Project Instructions** — attached to every message in that project; team-shared on paid tiers.
  3. **Project Sources** — files referenced on-demand, not always attached.
- **MCP/tools:** v0 calls Vercel's hosted MCP (<https://vercel.com/docs/agent-resources/vercel-mcp/tools>). A v0 MCP registry exists ([formulahendry/v0-mcp-registry-api](https://github.com/formulahendry/v0-mcp-registry-api)) — distribution, not a SKILL format.
- **Example:** [v0-platform-mcp](https://registry.npmjs.org/v0-platform-mcp).

### 9. Cross-vendor LCD — `AGENTS.md`

- **Doc:** <https://agents.md/> (stewarded by [Agentic AI Foundation](https://aaif.io/) under the Linux Foundation).
- **Format:** plain markdown, no frontmatter, no required fields. Popular sections: overview, dev environment tips, build/test commands, code style, security, PR instructions.
- **Nesting:** agents read the nearest `AGENTS.md` to the edited file; chat prompts override. OpenAI's own repo ships 88.
- **Adoption (Apr 2026):** 60k+ repos; "20+ coding agents" including Codex, Copilot coding agent, Cursor, Windsurf, Jules, Amp, Factory, Aider, UiPath Autopilot, Zed (fallback list), Gemini (via config). ThoughtWorks Tech Radar Nov 2025 at "Trial". Princeton study: 28.6% median runtime and 16.6% token reduction across 124 real PRs.
- **Gotcha:** adoption is *read-only convention* — each agent decides precedence when `AGENTS.md` and its native rule file disagree.

## OSS converters and multi-agent installers

- **[`nedcodes-ok/rule-porter`](https://github.com/nedcodes-ok/rule-porter)** — bidirectional CLI between `.cursor/rules/*.mdc`, `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`. Zero deps, `--dry-run`, flags non-1:1 conversions (glob scoping, manual-attach) rather than silently dropping. Narrow: rules only, no skills, no hooks.
- **[`dmgrok/agent_skills_directory`](https://github.com/dmgrok/agent_skills_directory)** + **[`dmgrok/mcp_mother_skills`](https://github.com/dmgrok/mcp_mother_skills)** — curated ~250 skills / 41 providers + MCP server that detects the stack and installs skills into `.claude/skills/`, `.github/skills/`, `.codex/skills/`, `.v0/skills/`. Closest to "compile once, install everywhere" today.
- **[`FrancyJGLisboa/agent-skill-creator`](https://github.com/FrancyJGLisboa/agent-skill-creator)** — emits skill packages for 14+ tools (Claude, Copilot, Cursor, Windsurf, Codex, Gemini, Cline, Zed, v0, Aider, Jules, Amp, Factory, Kilo) from one shared body — Humazier generalised.
- **[`alirezarezvani/claude-skills`](https://alirezarezvani.github.io/claude-skills/integrations/)** — 156+ skills with per-target adapter scripts.

All four converge on one insight: **the markdown body is portable; the frontmatter is not.** Converters either strip/rewrite frontmatter, or stamp target-specific wrappers around the same body.

## Consolidated format table

| Agent | File(s) | Frontmatter fields | Activation modes | Skill format | Hook support | MCP config |
|---|---|---|---|---|---|---|
| **Claude Code** | `.claude-plugin/plugin.json`, `skills/<n>/SKILL.md`, `commands/*.md`, `CLAUDE.md` | `name`, `description`, `allowed-tools`, `argument-hint`, `paths`, `version`, `model` | model-invoked (default), `allowed-tools` gate | `SKILL.md` | `plugin.json.hooks` (SessionStart / UserPromptSubmit / Pre/Post/ToolUse / Permission*) | `plugin.json.mcpServers` |
| **Cursor** | `.cursor/rules/*.mdc`, `.cursor/skills/<n>/SKILL.md`, `.cursor/commands/` | `description`, `globs`, `alwaysApply` | always / auto-attach / agent-fetched / manual | `SKILL.md` (same shape) | separate `hooks.json` | settings UI |
| **Windsurf** | `.windsurf/rules/*.md`, `.windsurf/skills/`, `AGENTS.md` | `description`, `activation`, `glob` | always_on / glob / model_decision / manual | `SKILL.md` (same shape) | none | settings UI |
| **Cline** | `.clinerules/*.md` (alpha-ordered) | optional `paths` | always-on unless `paths` scopes it | none — rule files only | none | settings UI |
| **OpenAI Codex** | `.codex-plugin/plugin.json`, `skills/<n>/SKILL.md`, `commands/*.md`, `AGENTS.md`, `config.toml` | same as Claude (renames: `timeout→timeoutMs`) | `AGENTS.md` always-on; skills model-invoked | `SKILL.md` | `.codex/hooks.json` (same events as Claude) | `[mcp_servers.*]` in `config.toml`, stdio+HTTP |
| **Gemini CLI** | `gemini-extension.json`, `GEMINI.md`, `AGENTS.md` (via `.gemini/settings.json`) | `name`, `version`, `description`, `contextFileName` (glob), `mcpServers`, `excludeTools` | always-on only | `SKILL.md` via `contextFileName` glob | none | `mcpServers` in manifest |
| **Zed** | `.rules` (or fallback list), Rules Library | none | always-on (first-match-wins on the fallback list) | none | none | `settings.json.context_servers` |
| **v0 (Vercel)** | UI — Account / Project Instructions / Sources | none (UI text) | always-attached (Instructions) / on-demand (Sources) | none (but consumes hosted MCP + skills via `mother_skills` pattern) | none | Vercel MCP registry |
| **Shared (`AGENTS.md`)** | root `AGENTS.md` (+ nested per-package) | none | always-on in agents that read it | none | none | none |

## Packaging recommendations — one source of truth → all surfaces

Four rules make this work:

1. **`SKILL.md` is the canonical unit for executable capability.** It is reused verbatim by Claude Code, Cursor (`.cursor/skills/`), Windsurf (`.windsurf/skills/`), and Codex. Gemini CLI ingests it via a `contextFileName` glob. Cline, Zed, and v0 can't consume it directly, but its body can be concatenated into their always-on rule file. Write bodies self-describing enough that they behave like a rule when injected that way.

2. **`AGENTS.md` is the canonical unit for always-on context.** It is a real cross-vendor standard — honoured by Codex, Copilot, Cursor, Windsurf, Jules, Aider, Zed (fallback), Gemini (via config). For every agent whose native rule file differs, ship a wrapper that references or re-emits the same body with the right frontmatter.

3. **Frontmatter is compile-target-specific.** The install step reads one body and stamps the right two-line wrapper per copy: `alwaysApply: true` for `.cursor/rules/*.mdc`, `activation: always_on` for `.windsurf/rules/*.md`, nothing for `.clinerules/` / `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `.rules`. `rule-porter` already does this in-process.

4. **Hooks are Claude+Codex only.** Lifecycle enforcement ("never call the image API without first running `enhance_prompt`") only exists there. Elsewhere, the equivalent lives in the always-on body as a strong-worded rule. Structure the `enhance_prompt` MCP tool so the cost of skipping it is visible — return a structured plan the agent would otherwise have to fabricate.

### Concrete repo layout

```
prompt-to-asset/
├── AGENTS.md                              # canonical always-on body (LCD)
├── skills/                                # canonical SKILL.md tree
│   ├── logo-generator/SKILL.md
│   ├── app-icon-generator/SKILL.md
│   ├── favicon-bundle/SKILL.md
│   ├── og-image/SKILL.md
│   └── transparent-png/SKILL.md
├── .claude-plugin/{plugin.json,marketplace.json}
├── plugins/prompt-to-asset/.codex-plugin/plugin.json
├── .codex/hooks.json
├── .agents/plugins/marketplace.json
├── gemini-extension.json                  # contextFileName: ["AGENTS.md","skills/**/SKILL.md"]
├── GEMINI.md      → symlink AGENTS.md
├── CLAUDE.md      → symlink AGENTS.md
├── .rules         → symlink AGENTS.md      # Zed
├── .cursor/{rules/prompt-to-asset.mdc,skills/ → ../skills}
├── .windsurf/{rules/prompt-to-asset.md,skills/ → ../skills}
├── .clinerules/01-prompt-to-asset.md      # stamped from AGENTS.md, no frontmatter
├── hooks/{activate.js,mode-tracker.js}
├── commands/*.md                          # Claude+Codex slash commands
└── scripts/install.sh                     # stamps wrappers, creates symlinks
```

For v0, ship a `docs/v0-custom-instructions.md` the user pastes into Project → Knowledge, and optionally register the prompt-to-asset MCP in the v0 registry so `/pe logo` becomes callable inside v0 chats with no pasted text at all.

### What to lean on, what to own

- **Lean on `rule-porter`** for the stamper — vendor it or call from `install.sh`.
- **Lean on `agent_skills_directory` / `mcp_mother_skills`** as a distribution target — publishing there gets one-command install across Claude / Copilot / Codex / v0 without extra packaging code.
- **Own** the skill bodies, `AGENTS.md`, and the `plugin.json` / `.codex-plugin/plugin.json` / `gemini-extension.json` manifests — small files where we need exact control of descriptions, allowlists, and MCP wiring.
- **Don't fork Humazier's hook scripts**; reference them as the pattern. Prompt-enhancer hooks do different work (flag gating, mode tracking on `/pe` tokens, statusline output).

Net: a contributor edits one `SKILL.md` and one `AGENTS.md` section, runs `install.sh`, and all nine surfaces pick up the change with correct frontmatter and activation — no per-agent drift.
