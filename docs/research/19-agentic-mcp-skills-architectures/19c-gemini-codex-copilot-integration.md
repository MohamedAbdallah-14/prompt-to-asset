---
category: 19-agentic-mcp-skills-architectures
angle: 19c
title: "Gemini, Codex, and Copilot: Surfacing Asset Generation Across Non-Claude Coding Agents"
agent: research-subagent-19c
date: 2026-04-19
tags:
  - gemini-function-calling
  - gemini-cli-extensions
  - openai-codex-plugins
  - github-copilot
  - mcp
  - asset-generation
  - agent-integration
status: draft
primary_sources:
  - https://ai.google.dev/gemini-api/docs/function-calling
  - https://google-gemini.github.io/gemini-cli/docs/extensions/
  - https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
  - https://developers.openai.com/codex/plugins/build/
  - https://developers.openai.com/codex/skills/
  - https://developers.openai.com/codex/agent-approvals-security
  - https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
  - https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/building-copilot-skillsets
  - https://code.visualstudio.com/docs/copilot/agents/agent-tools
  - https://ai.google.dev/gemini-api/docs/imagen
---

# 19c — Gemini Function Calling, Gemini CLI Extensions, OpenAI Codex Plugins, and GitHub Copilot Custom Instructions

## Executive Summary

Claude Skills gets most of the agent‑integration attention, but Claude is only one of four production coding agents a prompt‑enhancement asset‑generation product must live inside. The other three — **Google Gemini** (API + Gemini CLI), **OpenAI Codex** (CLI + cloud + IDE extension), and **GitHub Copilot** (VS Code + Copilot CLI + Copilot Extensions on GitHub.com) — each ship their own customization surface with their own trust model, discovery mechanism, and invocation grammar. A single “skill” like *“generate me a transparent logo for my note‑taking app”* has to be shaped four different ways to reach all of them, and each reshaping has real consequences for UX, determinism, and safety.

This document maps the four surfaces end‑to‑end, shows concrete tool schemas, and proposes a **single distributable bundle layout** that targets all three non‑Claude agents while sharing a common Model Context Protocol (MCP) server as the real execution backbone.

**Top 3 findings:**

1. **MCP is the only shared lingua franca.** Gemini CLI extensions, Codex plugins, and (via VS Code/`mcp.json`) Copilot all mount MCP servers the same way — `command` + `args` over stdio. If the asset generator ships as one MCP server, the three surface‑specific manifests (`gemini-extension.json`, `.codex-plugin/plugin.json`, `.vscode/mcp.json`) become thin wrappers. The raw Gemini **function‑calling** REST path (OpenAPI 3.0 function declarations, AUTO/ANY/NONE modes) is a separate, stateless integration for non‑agent apps; it does *not* compose with the CLI layer but it is the mechanism the CLI uses under the hood.
2. **Trust models diverge sharply and will break a “looks identical” rollout.** Gemini CLI has a `trust` flag on the whole MCP server plus per‑argument approval dialogs; Codex has OS‑level sandboxing plus explicit `destructive` annotations that force approval; Copilot has three levels (Default / Bypass / Autopilot) that the *user* toggles, not the tool author. Asset generation is non‑destructive and network‑bound — we must annotate it as *safe*, *network‑required*, *writes‑to‑workspace* so each agent auto‑approves the read path but prompts on file writes outside the workspace.
3. **Instruction files (`GEMINI.md`, `AGENTS.md`, `.github/copilot-instructions.md`) are the only way to teach the *planner* when to reach for the tool.** Raw function declarations tell the model *how* to call; the markdown context files tell it *when*. Without a companion `GEMINI.md` / `AGENTS.md`, agents routinely fall back to hallucinating inline base64 PNGs or generic `curl` to an imagined API. Every integration manifest in this doc ships paired with a `≤200‑line` instruction file that encodes the “transparent‑background is hard, always post‑process with rembg” knowledge from categories 13 and 16.

---

## Per‑Agent Integration Matrix

| Capability / Surface | **Gemini API (raw function calling)** | **Gemini CLI extensions** | **OpenAI Codex plugins** | **GitHub Copilot (VS Code + Extensions)** |
|---|---|---|---|---|
| Manifest file | `tools=[FunctionDeclaration]` in code | `gemini-extension.json` | `.codex-plugin/plugin.json` | `.vscode/mcp.json` + `.github/copilot-instructions.md` + (optional) Copilot Extension GitHub App |
| Schema dialect | OpenAPI 3.0 JSON Schema | MCP `tools/list` (JSON Schema) | MCP `tools/list` + `SKILL.md` frontmatter | JSON Schema (per skill) *or* MCP `tools/list` |
| Max functions/tools | 128 declarations / request ([docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling)) | Unlimited (server‑side) | Unlimited (plugins compose) | 5 skills per skillset; MCP unlimited |
| Lifecycle hooks | n/a | **Yes (v0.26.0+)** via `hooks/hooks.json` in extension; events: SessionStart, BeforeTool, AfterTool, BeforeModel, AfterModel, etc. | Yes (`.codex/hooks.json`) | Partial (VS Code agent lifecycle) |
| Invocation modes | `AUTO` / `ANY` / `NONE` via `toolConfig.functionCallingConfig` | `AUTO` only; approval dialog per call unless trusted | Implicit by `description` match or `$skill-name`; approval by policy preset | `#toolname` hint / Autopilot / Bypass / Default Approvals |
| Parallel calls | ✅ Gemini 3+ (`parallel Tool IDs`) | ✅ via MCP | ✅ | ✅ |
| Streaming args | ✅ `streamFunctionCallArguments: true` on Gemini 3 Pro | n/a (MCP) | n/a (MCP) | n/a (MCP) |
| Multimodal return | ✅ images/PDFs in `functionResponse` (Gemini 3+) | ✅ via MCP `ImageContent` | ✅ via MCP | ✅ via MCP |
| Context/instruction file | developer passes in `contents` | `GEMINI.md` (per extension, auto‑loaded) | `SKILL.md` frontmatter + `AGENTS.md` | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `AGENTS.md` |
| Install command | `pip install google-genai` | `gemini extensions install <github-url\|path>` | repo or personal `marketplace.json` + restart | Extension marketplace / `mcp.json` auto‑discover |
| Scope | API key only | user‑level `~/.gemini/extensions/` or workspace | `~/.codex/plugins/cache/...` or repo `./plugins/` | workspace `.vscode/mcp.json` or user settings |
| Auth inside tool | app‑managed | MCP server handles | MCP server handles; `policy.authentication: ON_INSTALL\|ON_FIRST_USE` | skillset via GitHub App OAuth; MCP via env |
| Custom slash commands | ❌ | ✅ TOML in `commands/` | ✅ `commands/` at plugin root | ✅ `.prompt.md` prompt files |
| Publishing | direct API | GitHub repo + `gemini extensions install` | curated or personal `marketplace.json`; public directory “coming soon” | GitHub Marketplace (Copilot Extensions) or VS Code Marketplace |
| Destructive annotation | none (app decides) | MCP `annotations.destructiveHint` honored in approval dialog | MCP `destructive` + Codex auto‑prompts | Copilot honors MCP annotations |
| Workspace‑vs‑global writes | n/a | `excludeTools: ["run_shell_command(rm -rf)"]` for fence | Sandbox: writes outside workspace always prompt | Users choose per‑tool auto‑approve |
| Works without internet | n/a | needs MCP command | needs MCP command | needs MCP command |
| Hot‑reload | API‑driven | `gemini extensions link` (symlink) | requires Codex restart | reload window / per‑MCP restart |

### What each agent does when the user types *“a transparent logo for my note‑taking app”*

- **Gemini API (raw).** The app author ships a `generate_logo` `FunctionDeclaration` inside `tools=[...]`. With `mode="AUTO"`, `gemini-3-flash-preview` emits one `functionCall{name:"generate_logo", args:{...}, id:"call_01"}`. The app executes the call, returns a `functionResponse` (now multimodal in Gemini 3+ so the PNG goes back inline), and the model composes the final message. If the author forces `mode="ANY"` to guarantee a tool hop, they must also add an explicit termination function because `ANY` cannot naturally stop ([issue #908](https://github.com/googleapis/js-genai/issues/908)).
- **Gemini CLI.** The user has `@prompt-to-asset/asset-gen` extension installed. On startup, Gemini CLI mounts its MCP server (declared in `gemini-extension.json → mcpServers`), auto‑loads the extension’s `GEMINI.md` into the system prompt (telling the planner: *“for logos, call `generate_logo` with `background:"transparent"` and always pair with `remove_background` post‑process when the model returns checkered artifacts”*), and when the user asks for a transparent logo the planner emits a tool call that the CLI surfaces in an **approval dialog showing the full JSON args** ([PR #19647](https://github.com/google-gemini/gemini-cli/pull/19647)). If the author pre‑declared `trust: true` in the user’s `settings.json`, it runs silently.
- **Codex.** The user installed `asset-gen` plugin via a repo or personal marketplace. Codex resolves the request to the `$generate-logo` **skill** (implicit invocation via the skill’s `description`, or explicit `$generate-logo`). The skill body runs inside Codex’s sandbox: network is allowed only because the plugin declared it, file writes go to the workspace automatically (Auto/`--full-auto` preset), and any write *outside* the workspace triggers an approval ([Codex approvals](https://developers.openai.com/codex/agent-approvals-security)).
- **Copilot.** In VS Code agent mode, the user has `.vscode/mcp.json` pointing at the asset‑gen MCP server and `.github/copilot-instructions.md` at repo root. The planner calls `#generate_logo` automatically or because the instruction file nudged it; the approval depends on the user’s **permission preset** (Default Approvals prompts, Bypass auto‑runs, Autopilot also auto‑answers clarifications) ([Copilot agent tools](https://code.visualstudio.com/docs/copilot/agents/agent-tools)). For a web‑side experience (“@prompt‑enhancer generate a logo” in a GitHub issue), the same capability is exposed as a **skillset** — a GitHub App that hosts POST endpoints matching the skill’s JSON schema, auto‑routed by Copilot ([skillsets docs](https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/about-copilot-skillsets)).

---

## Tool Schema Samples

The *same* tool — “generate an asset with guaranteed transparency” — rendered in each dialect. Keep the name, parameter set, and description text identical so behavior stays consistent across agents; only the wrapper changes.

### 1. Gemini function declaration (OpenAPI 3.0)

```python
from google import genai
from google.genai import types

generate_logo = {
  "name": "generate_logo",
  "description": (
    "Generate a production-grade logo for a software product. "
    "Use for any request that mentions 'logo', 'brand mark', 'app icon', or "
    "'mascot'. When the user asks for transparency, ALWAYS pass "
    "background='transparent' AND request a post-process via remove_background; "
    "native transparency on Imagen/Gemini 2.5 Flash Image is unreliable "
    "(renders checkered artifacts). Returns a PNG with an alpha channel."
  ),
  "parameters": {
    "type": "object",
    "properties": {
      "product_name":   {"type": "string", "description": "Product display name, e.g. 'Lumen Notes'."},
      "product_kind":   {"type": "string", "enum": ["saas","mobile-app","cli","game","hardware","other"]},
      "style":          {"type": "string", "enum": ["flat","isometric","line","mascot","wordmark","monogram","abstract"]},
      "palette_hint":   {"type": "string", "description": "Freeform colors or 'brand:<hex>,<hex>'."},
      "background":     {"type": "string", "enum": ["transparent","white","black","auto"], "default": "transparent"},
      "aspect_ratio":   {"type": "string", "enum": ["1:1","4:3","16:9","3:4","9:16"], "default": "1:1"},
      "negative_prompt":{"type": "string", "description": "Artifacts to avoid (default list auto-appended)."},
      "seed":           {"type": "integer", "description": "Optional seed for reproducibility."}
    },
    "required": ["product_name","product_kind","style"]
  },
  "response": {
    "type": "object",
    "properties": {
      "image_uri":  {"type": "string", "description": "file:// or https:// URL to the PNG."},
      "alpha":      {"type": "boolean"},
      "width":      {"type": "integer"},
      "height":     {"type": "integer"},
      "model":      {"type": "string"},
      "prompt_used":{"type": "string", "description": "The fully expanded prompt after enhancement."}
    }
  }
}

client = genai.Client()
config = types.GenerateContentConfig(
  tools=[types.Tool(function_declarations=[generate_logo])],
  tool_config=types.ToolConfig(
    function_calling_config=types.FunctionCallingConfig(mode="AUTO")
  ),
)
response = client.models.generate_content(
  model="gemini-3-flash-preview",
  contents="a transparent logo for my note-taking app 'Lumen Notes'",
  config=config,
)
```

Notes:
- `mode="AUTO"` lets the model skip the tool on trivially answerable prompts; `mode="ANY"` forces a tool hop and is **not recommended here** — it cannot terminate naturally.
- For Gemini 3+, set `streamFunctionCallArguments=true` so the UI can render a live progress bar while the planner streams JSON args.
- Return the binary PNG as a `Part.from_bytes(...)` inside the `functionResponse` — Gemini 3 Pro consumes multimodal tool results natively.

### 2. Gemini CLI extension (`gemini-extension.json`)

```json
{
  "name": "prompt-to-asset-asset-gen",
  "version": "0.4.0",
  "description": "Generate production-grade logos, icons, favicons, and OG images with enforced transparency.",
  "mcpServers": {
    "asset-gen": {
      "command": "node",
      "args": ["${extensionPath}${/}server${/}index.mjs"],
      "cwd": "${extensionPath}"
    }
  },
  "contextFileName": "GEMINI.md",
  "excludeTools": ["run_shell_command(rm -rf)"]
}
```

Companion `GEMINI.md` (auto‑loaded at session start, ~120 lines):

```markdown
# Asset Generation Tool

You have access to an MCP server `asset-gen` that exposes tools for producing
logos, app icons, favicons, OG images, and UI illustrations.

## When to use

- User mentions: logo, brand mark, icon, favicon, OG image, splash screen, illustration.
- User asks for assets for an app, website, or product.

## Transparency rules (critical)

Native "transparent background" on Imagen 4 and Gemini 2.5 Flash Image is
UNRELIABLE — roughly 40% of outputs have a checkered pattern baked in. Always:

1. Call `generate_logo` (or sibling) with `background: "transparent"`.
2. Pipe the result through `remove_background` (rembg + BRIA RMBG) UNLESS the
   tool response reports `alpha: true` AND `verified_transparent: true`.

## Custom command

`/logo <product-name>` → wrapper around `generate_logo` with sensible defaults.
```

`commands/logo.toml`:

```toml
description = "Generate a transparent logo for a software product"
prompt = """
You will call the `generate_logo` tool. Use these defaults unless the user overrides:
- style: flat
- background: transparent
- aspect_ratio: 1:1
Then verify alpha and call `remove_background` if needed.
Product description: {{args}}
"""
```

Install: `gemini extensions install https://github.com/<org>/prompt-to-asset-asset-gen`.

### 3. OpenAI Codex plugin (`.codex-plugin/plugin.json`)

```json
{
  "name": "prompt-to-asset-asset-gen",
  "version": "0.4.0",
  "description": "Reliable transparent-background logos, app icons, favicons, and OG images.",
  "author": { "name": "Prompt Enhancer", "url": "https://prompt-to-asset.dev" },
  "license": "MIT",
  "keywords": ["assets","logo","icon","favicon","branding","image-generation"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "interface": {
    "displayName": "Asset Generator",
    "shortDescription": "Logos, icons, favicons with guaranteed transparency.",
    "longDescription": "Bundles model-agnostic logo/icon/favicon/OG generation with automatic background removal and platform-spec post-processing (iOS HIG, Android Material, PWA).",
    "category": "Design",
    "capabilities": ["Read","Write"],
    "defaultPrompt": [
      "$generate-logo for my note-taking app named Lumen Notes",
      "$generate-app-icon for iOS and Android with rounded corners"
    ],
    "brandColor": "#10A37F",
    "composerIcon": "./assets/icon.png"
  }
}
```

`.mcp.json` (same MCP server as Gemini CLI — single binary, three manifests):

```json
{
  "mcpServers": {
    "asset-gen": {
      "command": "node",
      "args": ["./server/index.mjs"]
    }
  }
}
```

`skills/generate-logo/SKILL.md`:

```markdown
---
name: generate-logo
description: >
  Produce a production-grade logo for a software product with a guaranteed
  transparent background. Use whenever the user asks for a logo, brand mark,
  or app icon. Verifies alpha channel and auto-post-processes through rembg
  when the underlying model emits checkered artifacts.
---

# Generate logo

1. Ask for `product_name` and `product_kind` if missing from the user prompt.
2. Infer `style` ("flat" default) from context.
3. Call MCP tool `asset-gen.generate_logo` with `background="transparent"`.
4. Inspect `result.verified_transparent`. If false, call `asset-gen.remove_background`.
5. Save the final PNG to `./assets/brand/<kebab-name>.png`.
6. Return a one-line confirmation with the resolved path and model used.
```

Codex approval semantics:
- Reading generated files inside workspace → **no prompt** in Auto preset.
- Saving to `~/Desktop/...` → **prompts** (outside workspace).
- The MCP call itself is annotated `"network": true, "destructive": false` → auto‑approved when the user installed the plugin.

### 4. GitHub Copilot: three layers

**a) `.vscode/mcp.json`** — the in‑IDE agent‑mode path (same server again):

```json
{
  "servers": {
    "asset-gen": {
      "type": "stdio",
      "command": "node",
      "args": ["./server/index.mjs"]
    }
  }
}
```

**b) `.github/copilot-instructions.md`** — teaches the planner when to reach for `#asset-gen`:

```markdown
# Repo instructions for GitHub Copilot

This project produces software product assets. When the user asks for a
logo, icon, favicon, or OG image:

- Prefer the `#asset-gen` MCP tool over inline base64 / `curl`.
- Always request `background: "transparent"` for logos and icons.
- After generation, verify the alpha channel; if the result has a checkered
  pattern, call `#asset-gen.remove_background`.
- Save assets to `public/brand/` using kebab-case filenames.

Style/voice for commit messages: conventional commits, imperative mood.
```

For per‑file guidance, pair with `.github/instructions/assets.instructions.md`:

```markdown
---
applyTo: "public/brand/**"
---
All PNGs in this directory must have an alpha channel and be ≥ 512×512.
```

**c) GitHub Copilot Skillset** (GitHub App; gives the tool a web‑side life in issues/PRs). A skillset advertises up to 5 skills; each is an HTTPS POST endpoint with a JSON schema:

```json
{
  "name": "generate_logo",
  "inference_description": "Generate a production-grade logo with a guaranteed transparent background. Use when the user asks for a logo, brand mark, or app icon.",
  "endpoint": "https://api.prompt-to-asset.dev/copilot/generate_logo",
  "schema": {
    "type": "object",
    "properties": {
      "product_name":  { "type": "string" },
      "product_kind":  { "type": "string", "enum": ["saas","mobile-app","cli","game","hardware","other"] },
      "style":         { "type": "string", "enum": ["flat","isometric","line","mascot","wordmark","monogram","abstract"] },
      "background":    { "type": "string", "enum": ["transparent","white","black","auto"], "default": "transparent" }
    },
    "required": ["product_name","product_kind"]
  }
}
```

The GitHub App signs payloads, Copilot routes `@prompt-to-asset generate a logo...` to it automatically, and the same MCP server internally fulfills the request — one backend, four entry points.

---

## Cross‑Agent Skill Bundle Design

A single repository layout can serve all four surfaces without duplication. Proposed shape:

```
prompt-to-asset-asset-gen/
├── server/                             # The one MCP server (stdio + HTTP transport)
│   ├── index.mjs
│   ├── tools/
│   │   ├── generate_logo.mjs
│   │   ├── generate_app_icon.mjs
│   │   ├── generate_favicon.mjs
│   │   ├── generate_og_image.mjs
│   │   ├── generate_illustration.mjs
│   │   └── remove_background.mjs
│   └── prompts/                        # Enhancement templates per asset kind
│       ├── logo.md
│       └── ...
├── schemas/                            # Canonical JSON Schema per tool
│   ├── generate_logo.json
│   └── ...
├── skills/                             # Codex skills (also readable as docs)
│   ├── generate-logo/SKILL.md
│   └── ...
├── commands/                           # Gemini CLI custom commands
│   ├── logo.toml
│   └── ...
├── .codex-plugin/plugin.json
├── gemini-extension.json
├── GEMINI.md                           # Auto-loaded by Gemini CLI
├── AGENTS.md                           # Auto-loaded by Codex and Copilot
├── copilot-skillset.json               # Skillset manifest for the GitHub App
├── .vscode/mcp.json                    # Drop-in Copilot agent-mode wire-up
├── assets/                             # Icons, logos, screenshots for stores
│   ├── icon.png
│   ├── logo.png
│   └── screenshot-1.png
└── README.md
```

Why this works:

1. **One MCP server = one truth.** All agents invoke the same binary (`node server/index.mjs`). New tools added to the server appear in every surface on next restart.
2. **`schemas/` is the canonical source.** Build scripts project `schemas/*.json` into (a) raw Gemini `FunctionDeclaration[]` at runtime, (b) the skillset manifest for GitHub, and (c) validation inside the MCP server. No drift.
3. **`AGENTS.md` + `GEMINI.md` share 80% of content.** Both are plain markdown, both are auto‑discovered by the respective agent. Codex and Copilot *both* read `AGENTS.md` ([Copilot docs](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)), so one file covers two surfaces. A thin `GEMINI.md` can `@include` it or restate the critical parts.
4. **Skill descriptions do double duty.** The `description` on each Gemini `FunctionDeclaration`, each Codex `SKILL.md` frontmatter, and each Copilot skillset `inference_description` is the *planner’s only signal* for when to reach for the tool. Keep them identical, concrete, and front‑loaded with the trigger keywords (“logo”, “brand mark”, “app icon”, “transparent background”).
5. **Approval ergonomics are handled per‑surface, not per‑tool.** The MCP server annotates each tool with `annotations: { destructiveHint: false, readOnlyHint: false, title: "Generate logo" }` ([MCP spec](https://modelcontextprotocol.io/)). Gemini CLI and Codex both surface these in their approval dialogs; Copilot honors them when deciding whether to respect Autopilot.
6. **Failure modes are explicit.** Because “transparency” is the documented #1 user pain point (see category 13), every surface’s instruction file devotes a section to the verify‑then‑`remove_background` fallback. This is the single highest‑leverage piece of compound engineering in the bundle: the same 20 lines of prose reach the Gemini, Codex, and Copilot planners and prevent ~40% of checker‑pattern regressions.

### Invocation grammar cheat‑sheet (for end users)

| Agent | Explicit | Implicit |
|---|---|---|
| Gemini API | developer sets `mode="ANY"` or names the function | `mode="AUTO"` + good `description` |
| Gemini CLI | `/logo Lumen Notes` (TOML command) | “make me a transparent logo” |
| Codex | `$generate-logo for Lumen Notes` | “make me a transparent logo” |
| Copilot (VS Code) | `#asset-gen.generate_logo ...` | “make me a transparent logo” (agent mode) |
| Copilot (github.com) | `@prompt-to-asset generate a logo for Lumen Notes` | only when `@mentioned` |

### Trust & approval matrix for asset generation

| Action | Gemini CLI default | Codex `--full-auto` | Copilot Default Approvals |
|---|---|---|---|
| Call `generate_logo` (network, non‑destructive) | Approval dialog (one‑time approve + remember) | Allowed silently (network declared in plugin) | Approval dialog |
| Write PNG inside workspace | Approval dialog on `run_shell_command`; tool writes via MCP auto‑allowed | Allowed silently | Allowed silently |
| Write PNG outside workspace (`~/Desktop`) | Same as above | **Always prompts** | Prompts |
| Delete files (`rm -rf`) | Blocked by `excludeTools` | Prompts + destructive annotation | Blocked unless explicit |
| Mutate git | Prompts | Prompts | Prompts |

---

## Agent‑Specific Quirks & Gotchas

### Gemini

> **Updated 2026-04-21:** Gemini CLI now has lifecycle hooks (v0.26.0+). Extensions can bundle a `hooks/hooks.json` file defining `SessionStart`, `BeforeTool`, `AfterTool`, `BeforeModel`, `AfterModel`, and other events. Users see a security consent warning at install. There is no exact `UserPromptSubmit` equivalent — use `BeforeModel` as the closest substitute. Gemini CLI also has native MCP support (not "via adapter") — declare `mcpServers` in `gemini-extension.json` and the CLI spawns the server over stdio natively.

- **`ANY` mode trap.** Forcing a tool call is tempting for benchmarks but the model cannot emit a final natural‑language message, causing loops until the ~10‑call ceiling. Stick to `AUTO` + a strong description, or use `ANY` only for a single‑turn extraction pipeline.
- **OpenAPI dialect, not full JSON Schema.** Gemini rejects `oneOf`/`anyOf` at top level of `parameters` in older 1.5‑era releases; flatten with an `"enum"` over a discriminator field.
- **Name constraints:** `[a-zA-Z0-9_.-]{1,64}`. Kebab‑case with dots works across Gemini, Codex, and Copilot.
- **Gemini 3 parallel tool IDs** mean you can fire `generate_logo` and `generate_og_image` in one turn and correlate responses deterministically — great for “generate a full brand kit” single‑prompt flows.

### Codex

- **Skills vs plugins vs apps.** A *skill* is a single SKILL.md. A *plugin* packages skills + MCP + app connectors. An *app* is a connector (GitHub, Slack, Drive). Asset generation is a plugin with one or more skills plus an MCP server — no app connector needed.
- **Restart required** after manifest changes; `gemini extensions link` style hot‑reload is not yet in Codex.
- **`policy.authentication` gate.** Use `ON_INSTALL` if the MCP server needs an API key at install time (e.g., BYO OpenAI/Gemini key for image generation); otherwise `ON_FIRST_USE` defers the prompt.
- **Destructive annotations are honored.** An MCP tool advertising `destructive: true` always prompts, even in `--full-auto`. Do not set this on asset generation.

### GitHub Copilot

- **Skillsets max 5 skills.** If the bundle grows beyond this, ship a second GitHub App or switch the web surface to an *Agent* (full GitHub App with control over prompts and LLM choice) instead of a skillset.
- **Autopilot preview** auto‑answers clarifying questions — dangerous for generation flows where the user *wants* to refine the prompt. Recommend users stay on Default Approvals for creative tasks.
- **`.prompt.md` files** with YAML `tools:` frontmatter are the Copilot equivalent of Gemini CLI TOML commands; ship a `generate-logo.prompt.md` in `.github/prompts/` so users can invoke `/generate-logo` in chat.
- **MCP tool list is flat.** Copilot does not namespace by server, so pick distinctive tool names (`asset_generate_logo`, not just `generate_logo`) to avoid collisions with other MCP servers a user has mounted.

---

## Reference implementation notes

- Author the server in TypeScript with `@modelcontextprotocol/sdk`. Single binary, stdio transport for CLI/IDE, plus `/mcp` HTTP endpoint for remote deployments (Copilot Extension uses HTTP skillset path).
- Keep heavy lifting (Imagen / `gpt-image-1` / Flux calls, rembg post‑process) inside the MCP server, not inside the skill prompt. Skills should be *declarative*; deterministic work lives in code.
- Emit MCP `ProgressNotification`s from long‑running generations — all three agents render them.
- Return `image/png` as MCP `ImageContent`; avoid base64 in JSON unless the client (legacy Gemini 1.5) cannot read multimodal tool results.
- Include a `self_test` tool in the MCP server. `gemini extensions install` followed by `/asset-gen:self-test`, or `$asset-gen-self-test` in Codex, or `#asset-gen.self_test` in Copilot, all run the same smoke test — surface parity verified with one command per agent.

---

## References

### Gemini

- Function calling docs — <https://ai.google.dev/gemini-api/docs/function-calling>
- Vertex function calling reference (schema limits, modes) — <https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling>
- Parallel function calling sample — <https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-function-calling-generate-parallel-calls>
- Imagen image generation — <https://ai.google.dev/gemini-api/docs/imagen>
- `FunctionCallingConfigMode.ANY` termination issue — <https://github.com/googleapis/js-genai/issues/908>
- Gemini CLI extensions docs — <https://google-gemini.github.io/gemini-cli/docs/extensions/>
- Gemini CLI writing extensions — <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md>
- Custom commands for extensions PR — <https://github.com/google-gemini/gemini-cli/pull/4703>
- MCP tool approval dialog PR — <https://github.com/google-gemini/gemini-cli/pull/19647>
- MCP tool trust config issue — <https://github.com/google-gemini/gemini-cli/issues/5599>
- MCP servers with Gemini CLI — <https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html>
- Compositional function calling write‑up (MarkTechPost, 2026‑04) — <https://www.marktechpost.com/2026/04/07/how-to-combine-google-search-google-maps-and-custom-functions-in-a-single-gemini-api-call-with-context-circulation-parallel-tool-ids-and-multi-step-agentic-chains/>
- Google cookbook — function calling & tool use — <https://deepwiki.com/google-gemini/cookbook/4.1-function-calling-and-tool-use>

### OpenAI Codex

- Build plugins — <https://developers.openai.com/codex/plugins/build/>
- Plugins overview — <https://developers.openai.com/codex/plugins/>
- Agent skills — <https://developers.openai.com/codex/skills/>
- Create a skill — <https://developers.openai.com/codex/skills/create-skill>
- Agent approvals & security — <https://developers.openai.com/codex/agent-approvals-security>
- Sandbox docs — <https://developers.openai.com/codex/sandbox>
- Codex customization (`AGENTS.md`) — <https://developers.openai.com/codex/concepts/customization>
- Codex plugin repo (`openai/plugins`) — <https://github.com/openai/plugins>
- Codex changelog — <https://help.openai.com/en/articles/11428266-codex-changelog>

### GitHub Copilot

- Custom instructions overview — <https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot>
- Copilot CLI repo instructions — <https://docs.github.com/en/copilot/how-tos/copilot-cli/add-repository-instructions>
- VS Code custom instructions — <https://code.visualstudio.com/docs/copilot/customization/custom-instructions>
- Prompt files — <https://code.visualstudio.com/docs/copilot/customization/prompt-files>
- Tools with agents (permissions) — <https://code.visualstudio.com/docs/copilot/agents/agent-tools>
- Building Copilot Extensions — <https://docs.github.com/en/copilot/how-tos/build-copilot-extensions/setting-up-copilot-extensions>
- Copilot skillsets concepts — <https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/about-copilot-skillsets>
- Building a skillset — <https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/building-copilot-skillsets>
- Building a Copilot agent — <https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-agent-for-your-copilot-extension>
- Skillset example repo — <https://github.com/copilot-extensions/skillset-example>
- Copilot skill schema reference — <https://github.com/pnp/copilot-prompts/blob/main/SKILL-SCHEMA.md>

### Shared / MCP

- Model Context Protocol — <https://modelcontextprotocol.io/>
- MCP specification — tool annotations — <https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-annotations>
