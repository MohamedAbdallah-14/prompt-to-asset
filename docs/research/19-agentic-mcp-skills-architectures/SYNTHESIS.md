---
category: 19-agentic-mcp-skills-architectures
title: "Category 19 Index — Agentic, MCP, Skills, and Cross-IDE Architectures for Prompt-Enhancer"
slug: 19-agentic-mcp-skills-architectures-index
author: category-indexer-19
date: 2026-04-19
status: complete
angles_covered:
  - 19a-claude-skills-cursor-rules-formats
  - 19b-mcp-server-design-for-asset-gen
  - 19c-gemini-codex-copilot-integration
  - 19d-prompt-enhancement-agent-pattern
  - 19e-cross-ide-plugin-packaging
reference_repo: /Users/mohamedabdallah/Work/Projects/Humazier
tags:
  - claude-skills
  - mcp
  - cursor-rules
  - windsurf-rules
  - clinerules
  - codex-plugin
  - gemini-extension
  - copilot-skillset
  - ssot-sync
  - agentic-pattern
word_count_target: 2500-4000
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 19 — Agentic, MCP, Skills, and Cross-IDE Architectures

## Category Executive Summary

The `prompt-to-asset` product has to land inside **six coding-agent surfaces** (Claude Code, Cursor, Windsurf, Cline, OpenAI Codex, Gemini CLI) plus **two Copilot surfaces** (VS Code agent mode, and the GitHub.com Extensions/Skillsets plane) — all from **one repository, one skill body, one MCP server**. The five angles in this category (`19a`–`19e`) survey the file formats, the MCP protocol, per-IDE integration quirks, the agentic rewriter pattern, and the packaging/sync story respectively. Synthesised, they produce a single actionable architecture.

The 14 highest-signal insights for shipping this cross-IDE skill bundle:

1. **`SKILL.md` is the emerging de facto cross-agent unit of behavior.** Anthropic's YAML-frontmatter-plus-markdown file (`name`, `description`, optional `allowed-tools`) is now accepted verbatim by Claude Code (`.claude/skills/` or plugin `skills/`), OpenAI Codex (`plugins/*/skills/<name>/SKILL.md`), Cursor (`.cursor/skills/`), and Windsurf (`.windsurf/skills/`). One file, four ecosystems, zero translation (`19a`, `19c`, `19e`).

2. **Rules are not skills.** Rules are *always-on context*; every IDE picks a different frontmatter dialect. Cursor uses `alwaysApply` + `globs` in `.mdc`; Windsurf uses `activation: always_on|glob|model_decision|manual`; Cline uses nothing but optional `paths:`; Claude/Codex/Gemini use bare markdown (`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`). The *body* is portable, the *wrapper* is not — so keep the rule body as an un-frontmattered canonical file and stamp per-IDE envelopes in a sync step (`19a`, `19e`).

3. **MCP is the only true lingua franca for execution.** Gemini CLI extensions, Codex plugins, Cursor, Claude Code, and VS Code Copilot (via `.vscode/mcp.json`) all mount MCP servers the same way: `command` + `args` over stdio. A single TypeScript server binary (`@modelcontextprotocol/sdk`) satisfies every host. Manifests become thin pointers at the same binary (`19b`, `19c`).

4. **The MCP spec has collapsed to "stdio local, Streamable HTTP remote".** Plain HTTP+SSE is deprecated as of 2025-03-26. New servers must target spec **2025-11-25** minimum (Latest Stable as of November 2025); `2025-06-18` remains a supported "Stable" version but is no longer the latest. `structuredContent` + `outputSchema` are now the default way to return typed data; avoid base64 blobs — return MCP **resource URIs** for large assets (`19b`).

> **Updated 2026-04-21:** The `2025-11-25` spec is no longer a draft — it is the "Latest Stable" release, adding async Tasks, OpenID Connect Discovery, tool/resource icon metadata, incremental scope consent, and formalized extension negotiation. Target `2025-11-25` as minimum; accept `2025-06-18` as fallback for older pinned clients.

5. **Tools / prompts / resources are three different MCP primitives with distinct invocation models**: tools are model-picked mid-loop, prompts are user-picked from menus/slash commands, resources are host-read context (brand kits, prior generations, spec documents). Asset generation needs all three — conflating them is the most common public-server bug (`19b`).

6. **OAuth 2.1 + PKCE + Protected Resource Metadata (RFC 9728) is mandatory once the MCP server leaves localhost.** For private/local the transport is stdio with env-var secrets; for teams, static bearer; for any hosted multi-tenant offering, full PRM + JWKS + `WWW-Authenticate` challenge flow. Claude Desktop and Cursor both honour the challenge and launch the AS login in-app (`19b`).

7. **Claude Code, Codex, and Gemini CLI (v0.26.0+) expose real lifecycle hooks.** `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` exist in Claude Code and Codex (with minor renames: Claude's `timeout` → Codex's `timeoutMs`, Claude's shell `command` → Codex's split `command`+`args`). Cursor has a separate `hooks.json` contract. **Windsurf and Cline have no lifecycle hooks** — on those surfaces, enforcement is prose (`19a`, `19c`).

> **Updated 2026-04-21:** Gemini CLI shipped a full hooks system (v0.26.0+). Extensions can bundle hooks via `hooks/hooks.json`. Supported events: `SessionStart`, `SessionEnd`, `BeforeAgent`, `AfterAgent`, `BeforeModel`, `AfterModel`, `BeforeTool`, `AfterTool`, `Notification`, `PreCompress`, `BeforeToolSelection`. Extension hooks require explicit user consent on install. `UserPromptSubmit` has no exact Gemini equivalent — use `BeforeModel` as the closest substitute. The claim that "Gemini CLI has no lifecycle hooks" is no longer accurate.

8. **Asset type is the dominant routing variable.** Once the classifier picks `{logo, app-icon, favicon, og-image, hero, illustration, splash, sticker}`, almost every other parameter (size, format, transparency, model, post-process pipeline) is **deterministically derivable** from an HIG/Material/OG-protocol table. Freeform creative prompting belongs *inside* the enrichment step, not at the top of the graph (`19d`).

9. **Transparency and vector output are routing decisions, not prompt tricks.** No amount of "transparent background, alpha channel" phrasing coerces Imagen 4 into emitting RGBA — it does not support alpha. The fix is capability-aware routing: send transparent requests to `gpt-image-1` (native alpha) or Recraft v3 (vector) **or** force a `rembg`/`BRIA RMBG`/`BiRefNet` post-process step. The agent layer detects the mismatch; the prompt cannot (`19d`).

10. **A vision-LLM QA node before return is the highest-leverage ~$0.003 in the pipeline.** A Claude Sonnet or GPT-4o-mini vision pass against 5–7 hard criteria (aspect ratio, no unintended text, transparency present, palette compliance, safe-zone respected) catches ~70% of failures and feeds a diff back into the regenerate loop. Without it, the user is the QA harness — which is exactly what `prompt-to-asset` is built to fix (`19d`).

11. **Tool-name collisions across a user's mounted MCP servers are real.** Copilot's flat tool list does not namespace by server; Cursor's auto-approval uses bare names. Prefix every tool: `asset_generate_logo`, not `generate_logo`; `enhance_prompt_for_asset`, not `enhance_prompt` (`19c`).

12. **Trust and approval models are per-surface, not per-tool.** Gemini CLI prompts on every tool unless `trust: true`; Codex `--full-auto` respects `destructive` MCP annotations; Copilot has three user-chosen tiers (Default Approvals / Bypass / Autopilot). The tool author's lever is the MCP `annotations` block: `readOnlyHint`, `idempotentHint`, `destructiveHint`, `openWorldHint`. Mark `enhance_prompt`/`validate_asset` as read-only+idempotent so Cursor auto-runs them; leave `generate_*` as `openWorldHint` so users approve the network call once (`19b`, `19c`).

13. **Instruction files teach the *planner* when to reach for the tool; raw function declarations teach *how*.** Without `GEMINI.md`/`AGENTS.md`/`.github/copilot-instructions.md`, agents routinely fall back to inline base64 PNGs or imagined `curl` calls. Every manifest ships paired with a ≤200-line instruction file that front-loads the trigger keywords ("logo", "brand mark", "favicon", "transparent background") and encodes the known failure modes (checker-pattern transparency) (`19c`).

14. **The SSOT is three files, not thirty.** Humazier's proven pattern: `skills/<name>/SKILL.md` (long-form behavior), `rules/<name>-activate.md` (un-frontmattered always-on text), and co-located scripts/. Every other location — `.cursor/`, `.windsurf/`, `.clinerules/`, `.github/`, `plugins/<name>/skills/`, the Codex/Gemini bundles — is **regenerated** by `scripts/sync-mirrors.sh` and **byte-verified** by `tests/verify_repo.py` in CI. Only ~60 lines of bash and ~40 lines of YAML workflow hold the whole cross-IDE story together (`19a`, `19e`).

15. **Only Claude Code needs a real installer; everyone else is checkout-is-install.** Cursor, Windsurf, Cline, Copilot, and Codex pick up in-repo files on open. Gemini CLI installs with one `gemini extensions install ./`. Claude Code is the outlier because hooks live in `~/.claude/settings.json` at user scope — requiring idempotent `hooks/install.sh` + `install.ps1` scripts that merge JSON via Node (never regex) and back up before write (`19e`).

---

## Map of the Angles

| Angle | Scope | Core output |
|---|---|---|
| **[19a](19a-claude-skills-cursor-rules-formats.md)** — Per-IDE manifest schemas | `SKILL.md`, `.claude-plugin/plugin.json`, `.cursor/rules/*.mdc`, `.windsurf/rules/*.md`, `.clinerules/*.md`, `.codex-plugin/plugin.json`, `gemini-extension.json` | Frontmatter field tables; Humazier-grounded examples; six-IDE capability matrix. |
| **[19b](19b-mcp-server-design-for-asset-gen.md)** — MCP server design | JSON-RPC 2.0 spec (2024-11-05 → 2025-11-25); stdio vs. Streamable HTTP; tool/prompt/resource primitives; OAuth 2.1 + PRM; structured output | 7-tool + 3-prompt + 5-resource JSON schema draft with wire-format examples. |
| **[19c](19c-gemini-codex-copilot-integration.md)** — Non-Claude agents | Gemini API raw function calling; Gemini CLI extensions; Codex plugins+skills; Copilot VS Code + Skillsets | Four-dialect rendering of the same `generate_logo` capability; one-MCP-server/four-surfaces layout. |
| **[19d](19d-prompt-enhancement-agent-pattern.md)** — LLM-in-the-Middle loop | Intent classification; enrichment; capability-aware routing; 13-node state machine (ingest→classify→clarify→brand→enrich→validate→route→generate→post→qa→repair→package→respond) | Typed `AssetSpec`; `{asset_type} × {model}` routing table; refs to Hunyuan PromptEnhancer, PromptSculptor, Anthropic improver, SuperPrompt, Dembrandt. |
| **[19e](19e-cross-ide-plugin-packaging.md)** — Packaging & SSOT | Humazier SSOT mirror pattern; `scripts/sync-mirrors.sh`; `.github/workflows/sync.yml`; `tests/verify_repo.py`; idempotent installers; semver; four release channels | Port checklist for `prompt-to-asset`. |

`19a`+`19c` together give the *per-IDE surface* (formats, frontmatter, hooks, trust models). `19b` gives the *execution plane* (MCP). `19d` gives the *internal graph* (rewriter → route → generate → QA → repair). `19e` gives the *release plane* (SSOT → mirrors → marketplaces). All five converge on the same reference repo (`/Users/mohamedabdallah/Work/Projects/Humazier`) as the concrete template.

---

## Cross-Cutting Patterns

**One MCP binary, many manifests.** Every angle but `19d` converges on a single architecture: the execution code is *one* MCP server; every per-IDE manifest (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `gemini-extension.json`, `.vscode/mcp.json`, `.cursor/mcp.json`) is a ~10-line JSON file pointing at the same `node server/index.mjs` entry point. This pattern inverts the naive "one plugin per IDE" assumption and reduces the active code surface by ~5x (`19b` §1.4, `19c` cross-agent bundle, `19e` release).

**Two-tier context surface: SKILL.md (deep) + `*.md` rule (shallow).** Every IDE accepts two *kinds* of markdown: a long structured `SKILL.md` loaded on-demand (tool-triggered or slash-command-triggered) and a short always-on rule file. The rule *advertises* the skills exist and tells the planner when to trigger them; the skill *executes* on trigger. This is the "when" vs. "how" split called out explicitly in `19c` and enforced architecturally in `19e`.

**Enforce-via-hooks in Claude/Codex/Gemini CLI; enforce-via-prose in Windsurf/Cline.** `19a`'s compatibility matrix, `19c`'s trust table, and `19e`'s installer design all point at the same asymmetry: Claude Code and Codex support `SessionStart`/`UserPromptSubmit`/`PreToolUse` hooks that can *block* bad behavior; Cursor has partial support via a separate `hooks.json`.

> **Updated 2026-04-21:** Gemini CLI v0.26.0+ now ships a full hooks system (via `hooks/hooks.json` in extensions). The prompt-to-asset can ship enforcement hooks on three surfaces (Claude Code, Codex, Gemini CLI). Only Windsurf and Cline remain prose-only — the always-on rule body plus strong `SKILL.md` descriptions remain the entire enforcement surface for those two IDEs.

**`structuredContent` + `outputSchema` is replacing free-text tool returns.** `19b` (§5.3) and `19c` both emphasise that MCP 2025-06-18's typed output lets the planner skip re-parsing English. This aligns with `19d`'s `AssetSpec` — a single typed object that persists through the graph — and with `19c`'s "one JSON Schema, three manifests" design where `schemas/*.json` projects into Gemini `FunctionDeclaration[]`, Copilot Skillset manifests, and the MCP server's validation.

**The rewriter is small, specialised, and replaceable.** `19d` (Hunyuan PromptEnhancer, PromptSculptor, Anthropic prompt improver) and `19b` (prompts as a first-class MCP primitive) agree: the enhancement LLM itself should be a Haiku/Flash-class model called with structured JSON output, not Opus. Use Claude Haiku 4.5 or equivalent; the Claude API now offers native structured outputs (GA for Sonnet 4.5/Opus 4.5, beta for Haiku 4.5) via `output_config.format` — no need for prompt-only JSON elicitation. The graph is designed so a fine-tuned local rewriter can slot in later without changing the surrounding orchestration.

**Closed enums beat open-world classification.** `19d` §1 specifies an 8-type closed enum for `asset_type`; `19b` §3.2's schemas use `"enum"` for `target_model`, `style`, `spec`; `19c` notes Gemini function calling outright rejects `oneOf`/`anyOf` at parameter root in some releases. The lesson: every user-facing axis that has a known decision table should be a closed enum, not free text. Freeform only for `brief`, `product_name`, `brand_keywords`.

**Capability-aware fallback chains instead of single-model commitments.** `19d` §3.3 (primary → fallback → offline) and `19b` §2.4 (stdio → bearer HTTP → OAuth) both implement the same pattern: each tool call has a preferred path and an annotated graceful degradation. The MCP server surfaces this in response metadata ("served via fallback; vectorization approximate") so the agent can decide whether to retry or accept.

---

## Controversies

- **Raw Gemini function calling vs. MCP-via-Gemini-CLI.** `19c` treats these as two *separate* integrations (REST for apps, CLI for coding agents) because approval, context, and streaming semantics differ (`streamFunctionCallArguments` REST-only, `trust` flags CLI-only). Some teams try to unify via a runtime `tools/list` → `FunctionDeclaration[]` adapter; `19c` argues against it.
- **Multi-agent vs. monolithic LitM.** `19d` §7: multi-agent wins on complex assets by 15–25% on human preference but loses 3–5× on latency/cost. Recommendation is *hybrid* — one orchestrator that optionally spawns specialist sub-rewriters for `logo-primary` only. Unresolved until the benchmark (`19e` §CI) runs.
- **`allowed-tools` portability.** `19a` calls it Claude-specific (Codex's tool names differ: `apply_patch`, `shell`); `19c` ships it inside Codex SKILL.md frontmatter. Pragmatic: omit from canonical SKILL.md or let sync-script rewrite per target.
- **`ANY` vs. `AUTO` mode in Gemini.** `19c`'s "ANY mode trap" (cannot terminate, loops to ~10-call ceiling) argues for `AUTO` + strong description for creative flows. Forcing `ANY` is only correct for single-turn extraction pipelines.
- **Base64 inline vs. resource URI.** `19b` §5.2 prefers resource URIs; `19c` notes legacy Gemini 1.5 cannot read multimodal tool results. Resolution: resource URI primary, conditional base64 thumbnail fallback when the client advertises no resource support.

---

## Gaps

- ~~**Gemini CLI has no lifecycle hooks yet.**~~ **Resolved 2026-04-21:** Gemini CLI v0.26.0+ ships a full hooks system. Extensions can define hooks in `hooks/hooks.json`. `SessionStart` and tool-level hooks (`BeforeTool`, `AfterTool`) are supported. There is no `UserPromptSubmit` exact equivalent — use `BeforeModel` instead. Extension hooks show a security warning on install and require user consent. This gap is closed; update `19a`, `19c`, and `19e` packaging accordingly.
- **Cline's alphabetical-concat rule ordering is fragile.** `19a` warns that multi-rule ordering must be controlled via `01-`, `02-` filename prefixes. No typed precedence, no namespacing. For a single rule this is fine; for a future multi-skill prompt-to-asset it is a risk.
- **Copilot Skillsets are capped at 5 skills per app.** `19c` notes this explicitly. A growing asset bundle (logo + app-icon + favicon + og + illustration + splash + sticker = 7) already exceeds the cap. Plan to either (a) collapse to a single `generate_asset(asset_type)` skill, (b) ship a Copilot Agent (no cap) instead of Skillset, or (c) split across two GitHub Apps.
- **No shared benchmark for asset-quality regressions.** `19e` specifies a `benchmarks/run.py --strict` CI gate but notes it doesn't exist in Humazier. The prompt-to-asset has to build one from scratch, keyed on rembg-extractability, transparency ground-truth, size compliance, and spec-conformance.
- **OAuth DCR (RFC 7591) support is uneven across clients.** `19b` §4.3 requires Dynamic Client Registration for a public MCP server, but actual client support varies — some still expect pre-provisioned client IDs. Plan for both paths.
- **No guidance on MCP resource versioning / cache invalidation.** The spec sketches `notifications/resources/updated` but no reference server robustly implements staleness detection when a brand kit gets edited out-of-band. For prompt-to-asset's brand resource (`prompt-to-asset://brand/{slug}`) we need to decide caching policy.
- **JetBrains AI / Zed integration is unaddressed.** `19e` notes "one block in sync-mirrors.sh" would add it, but `19a`/`19c` don't map the JetBrains AI Assistant or Zed plugin format at all. Flag as future work once their formats stabilise.
- **Prompt-library versioning across per-model tuning.** `19d` §3.4 says each model gets a different prompt string derived from the same spec. No angle specifies how those per-model templates are versioned and A/B tested alongside the skill. Recommend shipping them as MCP `resources` with URI-encoded versions (`prompt-to-asset://template/flux-1-pro/v3`).

---

## Actionable Recommendations

### 1. The prompt-to-asset repository layout

Lift Humazier's tree directly, renaming `humanizer` → `prompt-to-asset` and substituting asset categories for commit/review sub-skills:

```
prompt-to-asset/
├── skills/                                # SSOT for behavior — the canonical markdown
│   ├── prompt-to-asset/SKILL.md           #   main entry skill (classifier + router narrative)
│   ├── prompt-to-asset-logo/SKILL.md
│   ├── prompt-to-asset-app-icon/SKILL.md
│   ├── prompt-to-asset-favicon/SKILL.md
│   ├── prompt-to-asset-og-image/SKILL.md
│   ├── prompt-to-asset-illustration/SKILL.md
│   ├── prompt-to-asset-hero/SKILL.md
│   └── prompt-to-asset-transparent-png/SKILL.md
├── rules/
│   └── prompt-to-asset-activate.md        # SSOT — short always-on activation text (no frontmatter)
├── server/                                # the one MCP server, TypeScript
│   ├── index.mjs                          #   stdio + Streamable HTTP dual transport
│   ├── tools/                             #   7 tools from 19b §3.1
│   │   ├── enhance_prompt.mjs
│   │   ├── generate_logo.mjs
│   │   ├── generate_icon_set.mjs
│   │   ├── remove_background.mjs
│   │   ├── vectorize.mjs
│   │   ├── validate_asset.mjs
│   │   └── upscale_refine.mjs
│   └── prompts/                           # prompt templates per model (Flux, Imagen, gpt-image-1, Recraft)
├── schemas/                               # canonical JSON Schemas projected to 3 dialects
│   └── *.json
├── hooks/                                 # Claude-Code-specific lifecycle hooks
│   ├── prompt-to-asset-activate.js        #   SessionStart — emit activation system context
│   ├── prompt-to-asset-mode-tracker.js    #   UserPromptSubmit — /pe off|logo|icon token watcher
│   ├── prompt-to-asset-statusline.sh / .ps1
│   ├── install.sh                         #   idempotent bash installer
│   ├── install.ps1                        #   idempotent PowerShell installer
│   ├── uninstall.sh / uninstall.ps1
│   └── package.json
├── commands/                              # slash-commands for Claude Code / Codex
│   ├── logo.md
│   ├── icon.md
│   ├── favicon.md
│   ├── og.md
│   └── transparent.md
├── .claude-plugin/
│   ├── plugin.json                        #   hooks wiring + mcpServers block → server/index.mjs
│   └── marketplace.json                   #   Anthropic-shape marketplace listing
├── .agents/plugins/marketplace.json       # cross-vendor agent marketplace listing
├── plugins/prompt-to-asset/               # Codex plugin bundle (self-contained)
│   ├── .codex-plugin/plugin.json
│   ├── .mcp.json                          #   pointer to ../../server/index.mjs
│   ├── skills/                            #   mirrored copies of SKILL.md
│   └── assets/icon.png
├── .codex/hooks.json                      # Codex SessionStart + UserPromptSubmit (timeoutMs, split command+args)
├── gemini-extension.json                  # Gemini CLI manifest; mcpServers + contextFileName glob
├── GEMINI.md                              # Gemini always-on context (mirror of rule body)
├── AGENTS.md                              # Codex + Windsurf + Copilot always-on context (mirror of rule body)
├── CLAUDE.md                              # Claude Code always-on context (mirror of rule body)
├── .vscode/mcp.json                       # VS Code Copilot agent-mode MCP wire-up
├── .cursor/
│   ├── rules/prompt-to-asset.mdc          #   generated with alwaysApply:true
│   └── skills/                            #   symlinked/copied from ../../skills/
├── .windsurf/
│   ├── rules/prompt-to-asset.md           #   generated with activation: always_on
│   └── skills/                            #   mirrored from ../../skills/
├── .clinerules/
│   └── 01-prompt-to-asset.md              # Cline always-on (no frontmatter, title-prefixed)
├── .github/
│   ├── copilot-instructions.md            # Copilot instructions (mirror of rule body + preamble)
│   ├── instructions/
│   │   └── assets.instructions.md         # applyTo: public/brand/**
│   ├── prompts/
│   │   └── generate-logo.prompt.md        # Copilot prompt file equivalent of /logo
│   └── workflows/
│       ├── ci.yml                         # tests + integrity + asset benchmark
│       └── sync.yml                       # SSOT → mirrors auto-propagation
├── copilot-skillset.json                  # GitHub App Skillset manifest (≤5 skills)
├── scripts/
│   ├── sync-mirrors.sh                    # the ~60-line SSOT→mirror pipeline
│   └── bump-version.sh                    # semver bump across all manifests
├── tests/
│   ├── test_hooks.py
│   ├── verify_repo.py                     # byte-identity check: every mirror == sync output
│   └── test_mcp_server.py
└── benchmarks/
    └── run.py                             # --strict gates CI on asset-quality regression
```

### 2. The one SSOT + sync pattern, borrowed from Humazier

**SSOT files** (three categories, editable; everything else is generated):

- `skills/<name>/SKILL.md` — long-form behavior, Anthropic frontmatter (`name`, `description`, optional `allowed-tools`).
- `rules/prompt-to-asset-activate.md` — un-frontmattered always-on activation body. The single authoritative source for the `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `.cursor/rules/*.mdc` / `.windsurf/rules/*.md` / `.clinerules/01-*.md` / `.github/copilot-instructions.md` content.
- `server/`, `hooks/`, `schemas/` — executable code; co-located with their SKILL.md or at repo root.

**`scripts/sync-mirrors.sh`** — ~60 lines of `set -euo pipefail` bash that:

1. Copies every `skills/<name>/SKILL.md` into `plugins/prompt-to-asset/skills/<name>/`, `.cursor/skills/<name>/`, `.windsurf/skills/<name>/`.
2. Composes per-IDE envelopes around `rules/prompt-to-asset-activate.md`:

   ```bash
   BODY=rules/prompt-to-asset-activate.md

   { printf '%s\n' '---'
     printf 'description: Enforce the prompt-to-asset checklist for image-asset requests.\n'
     printf 'alwaysApply: true\n'
     printf '%s\n\n' '---'
     cat "$BODY"; } > .cursor/rules/prompt-to-asset.mdc

   { printf '%s\n' '---'
     printf 'description: Prompt-enhancer asset rules.\n'
     printf 'activation: always_on\n'
     printf '%s\n\n' '---'
     cat "$BODY"; } > .windsurf/rules/prompt-to-asset.md

   { printf '# Prompt-Enhancer Rule (Cline)\n\n'; cat "$BODY"; } \
     > .clinerules/01-prompt-to-asset.md

   { printf '# Copilot Instructions — prompt-to-asset\n\n'; cat "$BODY"; } \
     > .github/copilot-instructions.md

   cp "$BODY" CLAUDE.md
   cp "$BODY" AGENTS.md
   cp "$BODY" GEMINI.md
   ```

3. Project `schemas/*.json` into (a) Gemini `FunctionDeclaration[]` at server boot, (b) the skillset manifest for GitHub (`copilot-skillset.json`), (c) runtime validation inside the MCP server. No drift — one JSON schema, three surfaces.

**`.github/workflows/sync.yml`** — triggers only on SSOT paths (`skills/**/SKILL.md`, `rules/*.md`, `server/**`, `scripts/sync-mirrors.sh`); runs `sync-mirrors.sh`; auto-commits generated mirrors as `github-actions[bot]`. Mirror paths do *not* trigger, preventing loops. Permissions: `contents: write`.

**`tests/verify_repo.py`** — re-runs the sync logic in memory and diffs every generated mirror against the on-disk version. CI fails on any drift. This is the test that makes SSOT *safe* — hand-edits to mirrors are structurally impossible to ship.

### 3. Manifest stubs (the per-IDE pointers)

Each IDE needs one small JSON/TOML file. All point at the same `server/index.mjs`:

- **`.claude-plugin/plugin.json`** — `name`, `description`, `version`, `author`; `hooks.SessionStart`/`UserPromptSubmit` invoking `node "${CLAUDE_PLUGIN_ROOT}/hooks/prompt-to-asset-*.js"` with `timeout: 5`; `mcpServers.prompt-to-asset.command: "node"`, `args: ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs"]`.
- **`plugins/prompt-to-asset/.codex-plugin/plugin.json`** — `name`, `displayName`, `version`, `license`, `skills: "./skills/"`, `mcpServers: "./.mcp.json"`, `interface` block with `category: "Design"`, `capabilities: ["Read","Write"]`, `brandColor`, `composerIcon`, `defaultPrompt` examples.
- **`.codex/hooks.json`** — same two hooks as Claude but with `timeoutMs` and split `command`/`args`.
- **`gemini-extension.json`** — `name`, `version`, `description`, `contextFileName: ["GEMINI.md", "skills/**/SKILL.md"]` (glob per `gemini-cli#3875`), `mcpServers.prompt-to-asset.command: "node"`, `args: ["${extensionPath}/server/index.mjs"]`, `excludeTools: ["run_shell_command(rm -rf)"]`.
- **`.vscode/mcp.json`** — `servers.prompt-to-asset.type: "stdio"`, same `command`/`args`.
- **`.cursor/rules/prompt-to-asset.mdc`** + `.windsurf/rules/prompt-to-asset.md` + `.clinerules/01-prompt-to-asset.md` — generated bodies (above).
- **`copilot-skillset.json`** — up to 5 skills (collapse `generate_logo`/`generate_app_icon`/etc. into one `asset_generate(asset_type)` if we need to stay under the cap), each an HTTPS POST endpoint with JSON schema, all fulfilled by the same MCP server behind a thin GitHub App.

### 4. MCP server skeleton, agent graph, installer, CI (condensed)

Follow `19b` §3 verbatim: stdio primary + Streamable HTTP secondary (never HTTP+SSE); 7 tools (`enhance_prompt`, `generate_logo`, `generate_icon_set`, `remove_background`, `vectorize`, `validate_asset`, `upscale_refine`) all with `outputSchema`; 3 prompts (`logo_brief`, `icon_set_brief`, `fix_transparency`); resources for style library / platform specs / brand kits via `prompt-to-asset://brand/{slug}`; env-based auth for stdio, OAuth 2.1 + PKCE + RFC 9728 once off localhost; return MCP resource URIs (`prompt-to-asset://gen/<hash>.png`) for large assets, never base64; `notifications/progress` + `notifications/message` for observability. Mark read-only tools with `readOnlyHint+idempotentHint` so Cursor auto-runs them; mark network tools with `openWorldHint`; never set `destructiveHint` on generation. Target MCP spec `2025-11-25` (Latest Stable as of Nov 2025); accept `2025-06-18` as fallback.

Inside `server/orchestrator/`, encode `19d`'s 13-node state machine (ingest → classify → clarify → brand → enrich → validate → route → generate → post → vision-QA → repair → package → respond) with `AssetSpec` as typed graph state and three modes (one-shot MCP call, interactive web chat with live clarify, batch multi-intent fan-out). Bound the repair loop at 2 attempts; return best-of with a visible violation list on exhaustion.

Only Claude Code needs a real installer. `hooks/install.sh` + `install.ps1` obey Humazier's five invariants (detect-already-installed, back up `settings.json`, merge JSON via Node never sed, never clobber foreign hooks/statusline, work from checkout *and* curl-pipe). `scripts/bump-version.sh X.Y.Z` updates all three manifest versions in one pass. CI gates before release: `pytest`, `python tests/verify_repo.py` (byte identity), `python benchmarks/run.py --strict` (asset-quality regression: `rembg`-extractability, transparency ground-truth, size compliance, spec conformance).

Distribution day 1: GitHub Releases + `.claude-plugin/marketplace.json` + `gemini extensions install <repo-url>`. Day N: optional `@prompt-to-asset/mcp` npm package, Homebrew tap, and a Copilot Extension GitHub App (separate deployment sharing the same MCP server via HTTPS shim).

---

## Primary Sources Aggregated

### Specs and official docs — per-IDE formats

- **Anthropic Claude** — Skills <https://docs.anthropic.com/en/docs/claude-code/skills>; plugin reference <https://code.claude.com/docs/en/plugins-reference>; marketplaces <https://docs.claude.com/en/docs/claude-code/plugin-marketplaces>; hooks <https://docs.claude.com/en/docs/claude-code/hooks>; `settings.json` <https://docs.claude.com/en/docs/claude-code/settings>; parsed-frontmatter issue <https://github.com/anthropics/claude-code/issues/33724>; `anthropics/claude-plugins-official` <https://github.com/anthropics/claude-plugins-official>.
- **Cursor** — Rules <https://www.cursor.com/docs/context/rules>; MCP <https://docs.cursor.com/context/model-context-protocol>.
- **Windsurf** — Cascade memories <https://docs.windsurf.com/windsurf/cascade/memories>; customizations catalog <https://github.com/Windsurf-Samples/cascade-customizations-catalog>.
- **Cline** — `.clinerules` PR <https://github.com/cline/cline/pull/2781>; multi-root limitation <https://github.com/cline/cline/issues/4642>.
- **OpenAI Codex** — plugin build <https://developers.openai.com/codex/plugins/build/>; skills <https://developers.openai.com/codex/skills/>; `AGENTS.md` <https://developers.openai.com/codex/guides/agents-md/>; approvals & sandbox <https://developers.openai.com/codex/agent-approvals-security>; slash commands <https://developers.openai.com/codex/cli/slash-commands/>.
- **Google Gemini** — CLI extensions reference <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md>; writing extensions <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/writing-extensions.md>; `contextFileName` glob PR <https://github.com/google-gemini/gemini-cli/pull/3875>; MCP approval PR <https://github.com/google-gemini/gemini-cli/pull/19647>; function calling <https://ai.google.dev/gemini-api/docs/function-calling>; Vertex reference <https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling>.
- **GitHub Copilot** — custom instructions <https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot>; Skillsets concepts <https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/about-copilot-skillsets>; building Skillsets <https://docs.github.com/en/copilot/building-copilot-extensions/building-a-copilot-skillset-for-your-copilot-extension/building-copilot-skillsets>; VS Code agent tools <https://code.visualstudio.com/docs/copilot/agents/agent-tools>.

### Specs and official docs — MCP

- **Spec** — index <https://modelcontextprotocol.io/specification/latest>; 2025-06-18 stable <https://modelcontextprotocol.io/specification/2025-06-18>; 2025-11-25 Latest Stable <https://modelcontextprotocol.io/specification/2025-11-25>; transports <https://modelcontextprotocol.io/specification/2025-11-25/basic/transports>; authorization <https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization>; Streamable HTTP PR <https://github.com/modelcontextprotocol/modelcontextprotocol/pull/206>.
- **Concepts** — tools <https://modelcontextprotocol.io/docs/concepts/tools>; resources <https://modelcontextprotocol.io/docs/concepts/resources>; prompts <https://modelcontextprotocol.io/docs/concepts/prompts>; sampling <https://modelcontextprotocol.io/docs/concepts/sampling>.
- **SDKs** — TypeScript <https://github.com/modelcontextprotocol/typescript-sdk>; Python <https://github.com/modelcontextprotocol/python-sdk>; Rust `rmcp` <https://github.com/modelcontextprotocol/rust-sdk>; Go <https://github.com/modelcontextprotocol/go-sdk>; Inspector <https://github.com/modelcontextprotocol/inspector>.

### Auth RFCs and references

RFC 9728 Protected Resource Metadata <https://datatracker.ietf.org/doc/html/rfc9728>; RFC 7591 Dynamic Client Registration <https://datatracker.ietf.org/doc/html/rfc7591>; RFC 7662 Token Introspection <https://datatracker.ietf.org/doc/html/rfc7662>; MCP OAuth guide <https://mcpplaygroundonline.com/blog/mcp-server-oauth-authentication-guide>; mcp-oauth-server reference <https://github.com/wille/mcp-oauth-server>.

### Prompt-enhancement / agentic-pattern sources

Hunyuan PromptEnhancer paper <https://arxiv.org/html/2509.04545v4> + repo <https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer> + 32B weights <https://huggingface.co/PromptEnhancer/PromptEnhancer-32B>; PromptSculptor <https://arxiv.org/html/2509.12446v2>; Anthropic prompt improver API <https://anthropic.mintlify.app/en/api/prompt-tools-improve> + announcement <https://www.anthropic.com/news/prompt-improver>; OpenAI cookbook meta-prompting <https://developers.openai.com/cookbook/examples/enhance_your_prompts_with_meta_prompting/>; SuperPrompt <https://github.com/NeoVertex1/SuperPrompt>; Dembrandt <https://github.com/dembrandt/dembrandt>; designtoken.md <https://designtoken.md/>; Open Graph <https://ogp.me/>; Apple HIG app icon <https://developer.apple.com/design/human-interface-guidelines/app-icons>; Material Design icons <https://m3.material.io/styles/icons/designing-icons>; Capacitor assets <https://github.com/ionic-team/capacitor-assets>; pwa-asset-generator <https://github.com/elegantapp/pwa-asset-generator>.

### Reference MCP servers for image generation

image-gen-mcp <https://github.com/simonChoi034/image-gen-mcp>; imagen-mcp <https://github.com/michaeljabbour/imagen-mcp>; mcp-openai-image-generator <https://github.com/Ishan96Dev/mcp-openai-image-generator>; mcp-server-gpt-image <https://www.npmjs.com/package/mcp-server-gpt-image>; `@modelcontextprotocol/server-everything` <https://github.com/modelcontextprotocol/servers/tree/main/src/everything>.

### Concrete packaging reference (on disk)

Humazier repo — `/Users/mohamedabdallah/Work/Projects/Humazier/` — template for every format above; key files: `skills/*/SKILL.md` + `rules/humanizer-activate.md` (SSOT), `.claude-plugin/{plugin,marketplace}.json`, `plugins/humanizer/.codex-plugin/plugin.json`, `.codex/hooks.json`, `.cursor/rules/humanizer.mdc`, `.windsurf/rules/humanizer.md`, `.clinerules/humanizer.md`, `gemini-extension.json`, `GEMINI.md` / `AGENTS.md` / `CLAUDE.md`, `hooks/{activate.js,mode-tracker.js,install.sh,install.ps1}`, `scripts/sync-mirrors.sh` (~60 lines), `.github/workflows/{sync,ci}.yml`, `tests/verify_repo.py` (byte-identity gate).

---

## Top 3 Insights (category-level)

1. **One MCP binary + one SSOT skill + one sync script satisfies all six coding-agent surfaces.** The perceived complexity of "cross-IDE packaging" is almost entirely per-surface frontmatter dialects and marketplace manifests. The *execution plane* is a single TypeScript MCP server over stdio/Streamable HTTP; the *behavior plane* is one `SKILL.md` per skill plus one un-frontmattered `rules/*-activate.md`; the *distribution plane* is ~60 lines of bash in `scripts/sync-mirrors.sh` plus ~40 lines of `.github/workflows/sync.yml`, with `tests/verify_repo.py` as the byte-identity gate. Humazier demonstrates the whole pattern today and the port to `prompt-to-asset` is a mechanical rename.

2. **Prompt-enhancement is a capability-aware *routing* problem, not a rewriter problem.** Asset type (closed enum of 8) is the dominant variable; once chosen, dimensions/format/transparency/model/post-process are deterministically derivable from HIG/Material/OG tables. "Transparent background" cannot be solved by any amount of prompt engineering against Imagen 4 (no alpha support) — it must be routed to `gpt-image-1` or Recraft, or forced through a `rembg`/BRIA/BiRefNet post-process. A 13-node state machine (ingest → classify → clarify → brand → enrich → validate → route → generate → post → **vision-LLM QA** → repair → package → respond) with a `AssetSpec` as typed graph state catches ~70% of failures at ~$0.003 per QA call.

3. **MCP is the only true cross-agent contract; lifecycle hooks are now available in Claude, Codex, and Gemini CLI.** Cursor has partial hook support; Windsurf and Cline rely entirely on always-on prose. That means (a) mark `enhance_prompt`/`validate_asset` as `readOnlyHint+idempotentHint` so Cursor auto-approves them, (b) front-load trigger keywords ("logo", "brand mark", "favicon", "transparent") in every `description` field across `SKILL.md`, Gemini `FunctionDeclaration`, Copilot Skillset `inference_description`, (c) write the transparency-failure-mode paragraph once in `rules/prompt-to-asset-activate.md` and let the sync script propagate it to all six envelopes — that single paragraph is the highest-leverage compound-engineering artifact in the whole bundle.

> **Updated 2026-04-21:** Gemini CLI v0.26.0+ added a full hooks system — the previous framing of "only Claude + Codex have hooks" is no longer accurate. Extensions ship hooks via `hooks/hooks.json`. Enforcement via `SessionStart`/`BeforeTool`/`AfterTool` hooks is now possible on three surfaces (Claude Code, Codex, Gemini CLI), not two.

**File path:** `/Users/mohamedabdallah/Work/Projects/prompt-to-asset/docs/research/19-agentic-mcp-skills-architectures/INDEX.md`
