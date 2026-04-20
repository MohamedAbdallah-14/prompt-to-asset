# Installable Skills Survey: OpenAI Official Skills Catalog and Related Repos

**Date**: 2026-04-20  
**Scope**: image/media generation capabilities installable on Codex CLI, Claude Code, Cursor, and similar  
**Source repos**: openai/skills (17.1k★), ComposioHQ/awesome-codex-skills (771★), hashgraph-online/awesome-codex-plugins (81★), VoltAgent/awesome-codex-subagents (4.1k★)

---

## Architecture: How the openai/skills Catalog Works

### Skill format

An Agent Skill is a directory containing at minimum a `SKILL.md` and optionally `scripts/`, `references/`, `agents/`, and `assets/`. The `SKILL.md` frontmatter is a YAML block with `name` and `description` fields; the description is what the host agent reads to decide when to invoke the skill. This is the **agentskills.io open standard** — not OpenAI-proprietary.

### Tiers

| Tier | Directory | Installation |
|------|-----------|--------------|
| **System** | `skills/.system/` | Automatically pre-installed in every Codex CLI version |
| **Curated** | `skills/.curated/` | Opt-in via `$skill-installer <name>` inside Codex |
| **Experimental** | `skills/.experimental/` | Opt-in via `$skill-installer install the <name> skill from .experimental` |

### Install paths

Skills install to `$CODEX_HOME/skills/<skill-name>` (default: `~/.codex/skills/`). This is a **Codex CLI-native mechanism**. Claude Code, Cursor, and Windsurf have no equivalent skill loader — they cannot auto-invoke skills from this path. Cross-compat is possible only if the host IDE happens to include the SKILL.md in the agent's system context via CLAUDE.md references or a custom MCP.

### Trigger mechanism

Codex CLI reads the `description` field of every installed SKILL.md and includes it in the agent's tool/context menu. The LLM decides to invoke a skill by naming it with `$<skill-name>` syntax in the prompt (or the agent auto-routes based on description matching). There is no formal keyword matching — it is embedding/description-based routing by the underlying model.

---

## openai/skills — System Skills (Auto-installed)

### 1. `imagegen` (`.system`)

**The most important skill for asset generation work.**

#### Frontmatter description
> Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. Use when Codex should create a brand-new image, transform an existing image, or derive visual variants from references, and the output should be a bitmap asset rather than repo-native code or vector.

#### Execution model — two modes

**Mode 1: Built-in `image_gen` tool (default, no API key required)**

- Uses Codex CLI's native `image_gen` built-in tool — not a Python script, not a direct API call
- The built-in tool does not expose the same controls as the REST API (no `quality`, `background`, `input_fidelity`, `mask` params)
- Saves to `$CODEX_HOME/generated_images/...` by default; skill instructs the agent to move project-bound assets into the workspace
- The model behind the built-in tool is **not documented in the SKILL.md**; the API reference for the fallback CLI targets `gpt-image-1.5` (GPT Image model family)
- Does not require `OPENAI_API_KEY`

**Mode 2: CLI fallback (`scripts/image_gen.py`)**

- Invoked only when user explicitly requests it
- Targets **`gpt-image-1.5`** (default), also supports `gpt-image-1` and `gpt-image-1-mini`
- Requires `OPENAI_API_KEY`
- Exposes: `generate`, `edit`, `generate-batch` subcommands
- Full parameter surface: `prompt`, `model`, `n`, `size` (1024×1024 / 1536×1024 / 1024×1536 / auto), `quality` (low/medium/high/auto), `background` (transparent/opaque/auto), `output_format` (png/jpeg/webp), `output_compression` (0–100), `moderation`, `mask` (edit only), `input_fidelity` (low/high, edit only)
- Outputs: `b64_json` decoded to files under `output/imagegen/` in the workspace

#### What the `background: "transparent"` param does

This is a **fallback CLI-only** control. It is the REST API's transparency switch on the GPT Image model endpoint — distinct from visual scene/backdrop description in the prompt. The built-in `image_gen` tool does not expose this parameter.

#### Use-case taxonomy (defined in SKILL.md)

Generate slugs: `photorealistic-natural`, `product-mockup`, `ui-mockup`, `infographic-diagram`, `logo-brand`, `illustration-story`, `stylized-concept`, `historical-scene`

Edit slugs: `text-localization`, `identity-preserve`, `precise-object-edit`, `lighting-weather`, `background-extraction`, `style-transfer`, `compositing`, `sketch-to-render`

#### Cross-compatibility with other IDEs

- **Codex CLI**: native, auto-invoked, no API key needed for built-in mode
- **Claude Code**: the `image_gen` built-in tool does not exist in Claude Code; only the CLI fallback is portable if the user has `OPENAI_API_KEY` and Python environment
- **Cursor / Windsurf**: no skill loader; SKILL.md content can be copy-pasted into a cursor rule or system prompt as a manual adaptation, but requires user to run `scripts/image_gen.py` directly
- **Adaptation verdict**: the prompt taxonomy and schema (lines like `Use case: product-mockup`, `Text (verbatim):`, `Constraints:`) are directly useful in Claude Code as a prompt discipline; the built-in tool invocation cannot be ported

#### Relationship to prompt-to-asset

The imagegen SKILL.md reinforces key routing facts already in prompt-to-asset's CLAUDE.md:
- It explicitly tells the agent NOT to use imagegen when the project has SVG/vector assets to extend — matches our `inline_svg` preference
- It does not address transparency routing (no mention of BiRefNet, BRIA, alpha validation) — imagegen punts on post-processing
- `background-extraction` edit mode does provide a cutout path, but only via CLI fallback

---

### 2. `skill-installer` (`.system`)

Meta-skill. Installs other skills from the curated/experimental catalog or arbitrary GitHub URLs. Not directly relevant to asset generation.

### 3. `skill-creator` / `plugin-creator` / `openai-docs` (`.system`)

Authoring and documentation meta-skills. Not relevant to asset generation.

---

## openai/skills — Curated Skills: Media & Image

### 4. `sora` (`.curated`)

**Video generation via Sora API.**

#### Trigger description
Use when the user asks to generate, edit, extend, poll, list, download, or delete Sora videos, create reusable non-human Sora character references, or run local multi-video queues.

#### Execution model
- Requires `OPENAI_API_KEY` with Sora API access (organization-verified account required)
- Uses bundled `scripts/sora.py` CLI — no built-in tool, always CLI
- Default model: `sora-2`; `sora-2-pro` for higher fidelity or 1920×1080
- Subcommands: `create`, `create-and-poll`, `create-character`, `edit`, `extend`, `status`, `poll`, `download`, `create-batch` (local queue, not official Batch API)

#### Output format
- Async: job ID → poll → download video/thumbnail/spritesheet
- Download URLs expire ~1 hour; must copy to local storage
- Batch-generated videos downloadable up to 24 hours after batch completion

#### Supported parameters
`model`, `size`, `seconds` (4/8/12/16/20), `--use-case`, `--scene`, `--camera`, `--no-augment`, `--prompt-file`, character IDs

#### Key limitations
- No real people, no copyrighted characters/music, audiences under 18 only
- Character uploads for non-human subjects only
- Extensions do not support characters or image references
- `sora-2-pro` required for 1920×1080 and 1080×1920

#### Cross-compatibility
- Codex CLI: native
- Claude Code / Cursor / Windsurf: CLI script is portable; requires `OPENAI_API_KEY` and network access; skill routing mechanism not available

---

### 5. `speech` (`.curated`)

**Text-to-speech via OpenAI Audio API.**

#### Trigger description
Use when user asks for text-to-speech narration, voiceover, accessibility reads, audio prompts, or batch speech generation.

#### Execution model
- Requires `OPENAI_API_KEY`
- Default model: `gpt-4o-mini-tts-2025-12-15`
- Default voice: `cedar`; brighter tone: `marin`
- Uses `scripts/text_to_speech.py` CLI
- Built-in voices only; custom voice creation out of scope

#### Parameters
`voice`, `response_format` (mp3/wav), `--rpm` (max 50), `--out`, `--out-dir`, `instructions` (GPT-4o mini TTS models only)

#### Output format
Audio files (mp3/wav) written to `output/speech/` or user-specified path

#### Cross-compatibility
CLI script portable; `OPENAI_API_KEY` required.

---

### 6. `transcribe` (`.curated`)

**Audio-to-text with optional speaker diarization.**

#### Trigger description
Transcribe audio files to text with optional diarization and known-speaker hints.

#### Execution model
- Requires `OPENAI_API_KEY`
- Default model: `gpt-4o-mini-transcribe` for fast text; `gpt-4o-transcribe-diarize` for speaker labels
- `scripts/transcribe_diarize.py` CLI
- Up to 4 known-speaker reference files

#### Output formats
`text`, `json`, `diarized_json`

---

### 7. `screenshot` (`.curated`)

**OS-level screen capture.**

#### Trigger description
Use when user explicitly asks for a desktop screenshot, or when tool-specific capture capabilities are unavailable.

#### Execution model
- No API key required
- Bundled scripts: `scripts/take_screenshot.py` (macOS/Linux), `scripts/take_screenshot.ps1` (Windows)
- `scripts/ensure_macos_permissions.sh` for Screen Recording permission preflight
- Fallback OS commands: `screencapture` (macOS), `scrot`/`gnome-screenshot`/ImageMagick `import` (Linux)

#### Parameters
`--mode` (default OS location / temp / explicit path), `--app` (macOS window capture by app name), `--window-name`, `--window-id`, `--region` (x,y,w,h), `--active-window`, `--list-windows`

#### Tool priority
Prefer Figma MCP/skill for Figma files; prefer Playwright for browser/Electron apps; fall back to this skill for desktop system captures.

#### Cross-compatibility
No API key needed; scripts are portable to any terminal environment. On Claude Code: user can run `scripts/take_screenshot.py` directly. On Cursor: same. The SKILL.md routing is Codex-specific.

---

## openai/skills — Curated Skills: Figma Suite (8 skills)

The Figma skills form an interconnected suite. All require **Figma MCP server** to be connected (either the remote cloud MCP or the `figma-desktop` MCP for local app access).

### 8. `figma` (`.curated`) — Core Figma MCP Skill

**The base design-to-code implementation skill.**

#### Trigger
Tasks involving Figma URLs, node IDs, or design-to-code implementation.

#### Required workflow
1. `get_design_context` → structured node representation + code + screenshot + hints
2. `get_metadata` if response too large → get node map, re-fetch specific nodes
3. `get_screenshot` → visual reference
4. Download assets, implement code

#### Implementation rules (verbatim from SKILL.md)
- Treat Figma MCP output (React + Tailwind) as design intent reference, not final code style
- Replace Tailwind with project's token system
- Reuse existing components instead of duplicating
- If Figma MCP returns a `localhost` source for image/SVG assets: use it directly; do NOT import new icon packages; do NOT use placeholders

#### Cross-compatibility vs Figma MCP server
- The `figma` skill is a SKILL.md wrapper around the same MCP tools available in Claude Code natively
- Claude Code users who have the Figma MCP server configured get equivalent capability without the Codex skill system
- The SKILL.md adds workflow enforcement (required step order, asset handling rules) that the raw MCP tools don't enforce

---

### 9. `figma-code-connect-components` (`.curated`)

**Connects Figma design components to codebase components via Code Connect.**

#### Trigger
"code connect", "connect this component to code", "map this component", "link component to code"

#### Workflow
1. `get_code_connect_suggestions` (auto-discovers unmapped published components)
2. Codebase scan for matching component implementations
3. `send_code_connect_mappings` with the final mappings

#### Prerequisites
- Figma URL **must** include `node-id` parameter
- Components **must be published** to a team library
- **Organization or Enterprise Figma plan required** — Code Connect is not available on free/professional tiers

#### Cross-compat note
Works via Figma MCP tools (`get_code_connect_suggestions`, `send_code_connect_mappings`) which are available in Claude Code if the Figma MCP server is connected. The SKILL.md workflow is portable as CLAUDE.md instructions.

---

### 10. `figma-create-design-system-rules` (`.curated`)

**Generates project-specific design system rules for AI coding agents.**

#### Trigger
"create design system rules", "generate rules for my project", "set up design rules"

#### Target rule files (explicit cross-IDE support)

| Agent | Rule file |
|-------|-----------|
| Claude Code | `CLAUDE.md` (or `.claude/rules/figma-design-system.md`) |
| Codex CLI | `AGENTS.md` |
| Cursor | `.cursor/rules/figma-design-system.mdc` (with YAML frontmatter) |

This is the only skill in the catalog that **explicitly supports Claude Code and Cursor** as first-class targets. It writes project-specific rules into the correct format for each.

#### What it generates
- Which layout primitives/components to use
- Where component files should live
- Naming and structure conventions
- What must never be hardcoded
- Design token and styling patterns
- Project-specific architectural patterns

#### Workflow
1. `create_design_system_rules` MCP tool (returns foundational prompt + template)
2. Parameters: `clientLanguages` (comma-separated), `clientFrameworks`
3. Analyze codebase conventions
4. Generate rules in the appropriate format for the detected/specified agent

---

### 11. `figma-create-new-file` (`.curated`)

Creates a blank Figma design or FigJam file. Utility skill used before `figma-use` or `figma-generate-design`. Requires `whoami` MCP call to resolve `planKey`. Not directly relevant to asset generation beyond file initialization.

---

### 12. `figma-generate-design` (`.curated`)

**Translates application code or descriptions into Figma screens using the design system.**

#### Trigger
"write to Figma", "create in Figma from code", "push page to Figma", "build a landing page in Figma", "update the Figma screen to match code"

#### What it does
- Discovers published design system components, variables, and styles via `search_design_system`
- Imports them and assembles screens **incrementally section by section** using design system tokens
- For web apps: optionally runs `generate_figma_design` in parallel for pixel-perfect screenshot reference, then aligns the use_figma output to match
- Mandatory prerequisite: also load `figma-use` skill before any `use_figma` call

#### Relevance to asset generation
Not directly for asset production, but relevant when generating Figma mocks of asset layouts (OG images, splash screens, app icon contexts).

---

### 13. `figma-generate-library` (`.curated`)

**Builds or updates a full design system in Figma from a codebase.**

#### Trigger
"create variables/tokens", "build component libraries", "set up theming", "create light/dark modes"

#### Execution model
This is a multi-phase, 20–100+ `use_figma` call workflow. Not a one-shot operation. Mandatory user checkpoints between phases:
- Phase 0: Discovery (no writes)
- Phase 1: Foundations (variables, styles)
- Phase 2: File structure
- Phase 3: Components (one at a time)
- Phase 4: QA / handoff

#### Cross-compat
Requires `figma-use` as mandatory co-skill. Uses `use_figma` MCP tool for Plugin API execution in Figma.

---

### 14. `figma-implement-design` (`.curated`)

**Translates Figma designs into production-ready code.**

#### Trigger
"implement design", "generate code", "implement component", Figma URLs, "build components matching Figma specs"

#### Required workflow
1. Parse Figma URL → extract `fileKey` (segment after `/design/`) and `nodeId` (`node-id` param, hyphens stay as hyphens in URL but tool expects colons: `42-15` → `42:15`)
2. `get_design_context` → code + screenshot + hints
3. `get_screenshot` → visual reference
4. Adapt React+Tailwind output to project stack
5. Validate 1:1 visual parity

#### OR: `figma-desktop` MCP path
If Figma desktop app is open with a node selected, tools auto-use current selection — no URL parsing needed.

---

### 15. `figma-use` (`.curated`)

**Mandatory prerequisite for any `use_figma` MCP call.**

The `use_figma` tool executes JavaScript in a Figma file via the Plugin API. This skill is the critical-rules wrapper that prevents common failures.

#### Critical rules (verbatim from SKILL.md, condensed)
- Use `return` to send data back (never `figma.closePlugin()`)
- Write plain JS with top-level `await` and `return`; no async IIFE wrapper
- `figma.notify()` throws "not implemented" — never use
- `console.log()` not returned — use `return`
- Colors are 0–1 range, not 0–255
- Fills/strokes are read-only arrays — clone, modify, reassign
- Font MUST be loaded before any text: `await figma.loadFontAsync({family, style})`
- Page context resets between calls — use `await figma.setCurrentPageAsync(page)` to switch
- `layoutSizingHorizontal/Vertical = 'FILL'` must be set AFTER `parent.appendChild(child)`
- On error: STOP, do not retry immediately; scripts are atomic

#### Relevance to asset generation
This is the execution layer for any automated Figma asset creation or design system token management. Not a direct image generator but foundational for Figma-based asset workflows.

---

## ComposioHQ/awesome-codex-skills — Image/Design Skills

### 16. `image-enhancer`

**Resolution/sharpness enhancement for screenshots and images.**

#### Trigger description
Improves quality of images (especially screenshots) by enhancing resolution, sharpness, and clarity.

#### Execution model
- No API key documented; no scripts bundled — the SKILL.md is instructions-only
- The skill relies on the agent reasoning about available tools (PIL/Pillow, ImageMagick, or similar)
- Outputs: `<filename>-enhanced.png`, preserves original as `<filename>-original.png`
- Enhancements described: upscaling to higher resolution, edge sharpening, text clarity, file size optimization

#### Critical assessment
This SKILL.md is aspirational, not functional. It documents desired behavior without providing scripts or specifying which library/tool performs the upscaling. A real upscaler would need Real-ESRGAN, Topaz, or an API call (e.g., Ideogram's upscale endpoint, or fal.ai/aura-sr). Treat as a placeholder template, not a working implementation.

#### Cross-compatibility
Instructions-only; would work identically across Codex CLI, Claude Code, or Cursor if the agent has access to Python/PIL or equivalent.

---

### 17. `canvas-design`

**Generative art/poster/design creation as PDF or PNG.**

#### Trigger description
Create beautiful visual art in .png and .pdf documents using design philosophy. Use when user asks to create a poster, piece of art, design, or other static piece.

#### Execution model
- No API key, no external image model — entirely LLM-authored output via matplotlib/reportlab/similar
- Two-phase workflow:
  1. **Design Philosophy Creation**: LLM generates a named aesthetic movement (e.g., "Brutalist Joy") with 4–6 paragraph manifesto as `.md` file
  2. **Canvas Creation**: LLM translates the philosophy into a visual PDF/PNG using Python canvas APIs
- Typography: reads from `./canvas-fonts` directory in the skill folder (bundled fonts)
- Output: single `.pdf` or `.png` (or multi-page on request), plus the `.md` philosophy file

#### Design philosophy
The skill explicitly instructs the LLM to create work that "looks like it took countless hours" and "appears as though someone at the absolute top of their field labored over every detail." A mandatory second-pass refinement step is built in.

#### Cross-compatibility
Fully portable — depends only on Python canvas libraries (reportlab, matplotlib, Pillow). Works on Codex CLI, Claude Code, Cursor. The Codex skill routing trigger won't fire on non-Codex hosts, but the SKILL.md can be included in CLAUDE.md for equivalent routing.

#### Relevance to prompt-to-asset
Closest analog to our `inline_svg` mode but produces raster/PDF via Python rather than SVG. Useful for illustration/poster generation without an image API key. Quality ceiling is constrained by what matplotlib/reportlab can render — not a substitute for diffusion models.

---

## hashgraph-online/awesome-codex-plugins — Relevant Entries

This repo catalogs community Codex plugins (which are richer than skills — they can bundle MCP servers, agents, and multiple skills). The media-relevant entries are:

### 18. Figma Plugin (listed in README)

Referenced in the README as: "Figma — Inspect designs, extract specs, and document components." This is the Figma MCP server integration, not a separate plugin beyond what the `figma` skill suite provides.

### 19. Remotion Plugin (`tim-osterhus/codex-remotion-plugin`)

**Parameterized video creation with Remotion (React-based video framework).**

#### Skill: `remotion-video-builder`

**Trigger description**: Use when building, reviewing, or refactoring a Remotion project, especially parameterized launch or demo videos with shared props schemas, calculateMetadata, Sequence and Series timing, multiple aspect ratios, terminal or footage layers, and render scripts.

#### Execution model
- No image API; Remotion renders React components to video frames via Node.js + ffmpeg
- Uses official `remotion-documentation` MCP server for up-to-date API reference
- Scaffold: `npx create-video@latest`, blank template
- Shared props schema with `zod`; `calculateMetadata` for dynamic duration/dimensions
- `<Series>` for narrative order; `<Sequence>` for overlays/entrances
- Render scripts for each target output profile

#### Key rules from SKILL.md
- Default: `fps={30}`, `1920×1080`
- Use `AbsoluteFill` for layering
- `staticFile()` for `public/` assets
- Use `useCurrentFrame()` + `useVideoConfig()` for frame logic
- Do NOT use `Math.random()` — use `random(seed)` from remotion
- Keep landscape and vertical outputs on the same business logic unless truly diverging

#### Cross-compatibility
- Codex CLI: native plugin with `.codex-plugin` config
- Claude Code: `.claude-plugin` config NOT present in this repo (Codex-only plugin)
- MCP: bundles a `remotion-documentation` MCP server via `.mcp.json`

#### Relevance to prompt-to-asset
Remotion is the correct tool for animated splash screens, animated OG images, and motion-based marketing assets. Not a raster image generator — produces video/GIF from React. Complementary to the asset pipeline, not a substitute.

---

### 20. VibePortrait (`dadwadw233/VibePortrait`)

**Developer personality portrait generator.**

#### Cross-compatibility
- Has both `.codex-plugin` and `.claude-plugin` directories — explicitly supports both Codex CLI and Claude Code
- Reads from `~/.claude/history.jsonl`, `~/.claude/projects/**/*.jsonl` (Claude Code), `~/.codex/history.jsonl` (Codex), and Codex session rollout files

#### Relevance to asset generation
Not relevant for asset generation. A personal analytics/entertainment tool.

---

## VoltAgent/awesome-codex-subagents — UI-Relevant Entries

These are Codex subagents (`.toml` format), not skills. They are stored in `~/.codex/agents/` or `.codex/agents/` and delegated to explicitly in Codex prompts.

### 21. `ui-designer`

**Produces implementation-ready UI guidance.**

```toml
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
```

#### Scope (from SKILL.md)
- Reads existing UI language, constraints, and user-flow context
- Proposes concrete layout/interaction changes tied to product goals
- Delivers guidance a coding agent can implement without ambiguity

#### Focus areas
Hierarchy, spacing, information clarity; interaction states and feedback timing; component reuse and design-system alignment; accessibility; tradeoffs between elegance and implementation complexity

#### Output
Design recommendation by screen/component; interaction-state notes; implementation guidance; unresolved design decisions requiring product input

#### Cross-compat
Codex-only subagent format (`.toml`). Not directly portable to Claude Code. Equivalent guidance could be replicated in a Claude Code sub-agent prompt or CLAUDE.md section.

---

### 22. `ui-fixer`

**Precision UI bug patches.**

```toml
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
```

#### Scope
- Confirms exact failing interaction/render condition
- Implements the smallest defensible patch in the owning component
- Validates the target behavior and nearest regression surface

#### Cross-compat
Codex-only. Closest Claude Code analog is a targeted sub-agent with similar instructions.

---

## Cross-Compatibility Analysis

### Summary table

| Skill | API Key Required | Works in Codex | Works in Claude Code | Works in Cursor | Works in Windsurf |
|-------|-----------------|----------------|---------------------|-----------------|------------------|
| imagegen (built-in tool) | No | Yes (native) | No (no built-in) | No | No |
| imagegen (CLI fallback) | Yes (OpenAI) | Yes | Manual CLI run | Manual CLI run | Manual CLI run |
| sora | Yes (OpenAI + Sora access) | Yes (native) | CLI only | CLI only | CLI only |
| speech | Yes (OpenAI) | Yes (native) | CLI only | CLI only | CLI only |
| transcribe | Yes (OpenAI) | Yes (native) | CLI only | CLI only | CLI only |
| screenshot | No | Yes (native) | CLI script portable | CLI script portable | CLI script portable |
| figma suite | No (MCP configured) | Yes (native) | Yes (via Figma MCP) | Yes (via Figma MCP) | Partial (MCP dependent) |
| figma-create-design-system-rules | No (MCP configured) | Yes | Yes (explicitly supported) | Yes (explicitly supported) | Partial |
| image-enhancer (Composio) | No | Yes | Portable (instructions-only) | Portable | Portable |
| canvas-design (Composio) | No | Yes | Portable (Python canvas) | Portable | Portable |
| remotion-video-builder | No | Yes | No (.claude-plugin absent) | No | No |
| VibePortrait | No | Yes | Yes (.claude-plugin present) | No | No |
| ui-designer (VoltAgent) | No | Yes (subagent) | Adaptable (no native format) | No | No |
| ui-fixer (VoltAgent) | No | Yes (subagent) | Adaptable | No | No |

---

## Key Findings for prompt-to-asset

### 1. The `imagegen` built-in tool is Codex-exclusive

The `image_gen` Codex built-in tool has no equivalent in Claude Code. Our `asset_generate_*` MCP tools are the Claude Code equivalent — they are the correct architecture for Claude Code users.

### 2. Transparent background via `background: "transparent"` is CLI-fallback only

The `imagegen` SKILL.md confirms: `background` (transparent/opaque/auto) is **only exposed in the CLI fallback mode** targeting `gpt-image-1.5`. The built-in `image_gen` tool does not support it. This means transparency routing (to `gpt-image-1` or post-processing via BiRefNet) is unavoidable when using the built-in path — the imagegen skill does not solve the checkerboard problem.

### 3. The Figma skill suite is directly portable to Claude Code

All 8 Figma skills operate via Figma MCP tools (`get_design_context`, `get_screenshot`, `use_figma`, etc.) which are available in Claude Code when the Figma MCP server is configured. The `figma-create-design-system-rules` skill explicitly targets Claude Code's `CLAUDE.md` format. The SKILL.md workflow rules could be included in our CLAUDE.md or as a Claude Code sub-agent.

### 4. `canvas-design` is the closest zero-key alternative to `inline_svg`

The Composio `canvas-design` skill is the nearest analog to our `inline_svg` mode — it generates visual output (PDF/PNG) without an API key using Python canvas libraries. Its two-phase philosophy-then-art workflow produces more artistically intentional output than raw matplotlib. Limitation: raster output ceiling, no SVG, no transparency path.

### 5. Remotion is the right tool for animated assets — needs Claude Code adaptation

The Remotion plugin has a well-structured SKILL.md for parameterized video from React, but it only has a `.codex-plugin` config, not a `.claude-plugin`. To use it in Claude Code, the SKILL.md content would need to be added to CLAUDE.md and the MCP server registration done manually.

### 6. The agentskills.io standard is format-compatible with Claude Code skills

The SKILL.md format (YAML frontmatter + markdown body) is the same format Claude Code skills use. The `name` and `description` frontmatter fields serve the same routing purpose. Any openai/skills SKILL.md could be dropped into a Claude Code skill without format changes — the difference is the routing trigger mechanism (Codex reads SKILL.md descriptions; Claude Code reads them via the Skill tool catalog).

### 7. The `image-enhancer` Composio skill is not a real implementation

It documents desired behavior (upscale, sharpen, artifact removal) without providing scripts or specifying the underlying tool. For actual upscaling in the prompt-to-asset pipeline, use `asset_upscale_refine` which routes to a real upscaler API.

### 8. VoltAgent subagents use model IDs that do not exist in the Claude ecosystem

`gpt-5.4`, `gpt-5.3-codex-spark` are Codex-native model references. The `ui-designer` and `ui-fixer` subagents are not portable to Claude Code in their `.toml` form. Their instruction content is extractable and useful as Claude sub-agent prompts.

---

## Adaptation Recommendations

### For Claude Code users who want imagegen-equivalent capability

Use `asset_generate_illustration` or `asset_generate_og_image` with `mode: "api"` (requires one API key) or `mode: "inline_svg"` for zero-key path. The prompt taxonomy from imagegen's SKILL.md (the `Use case:` / `Primary request:` / `Text (verbatim):` / `Constraints:` / `Avoid:` schema) is worth adopting directly in asset prompt engineering.

### For adapting Figma skills to Claude Code

The workflow rules from `figma-implement-design` and `figma-code-connect-components` can be added verbatim to CLAUDE.md or as project-level skill files. The tool names (`get_design_context`, `get_screenshot`, `use_figma`, etc.) match the Figma MCP server tools available in Claude Code.

### For adapting canvas-design to Claude Code

Drop the SKILL.md into `.claude/skills/canvas-design/SKILL.md` and add a trigger entry. The two-phase workflow is self-contained and needs no modification. Python dependency: `reportlab` or `matplotlib` + `Pillow`.

### For transparent-background asset generation in Codex CLI

The `imagegen` built-in tool does not expose `background: transparent`. Users must: (a) use the CLI fallback with `--background transparent` targeting `gpt-image-1.5`, or (b) use `asset_remove_background` post-processing via BiRefNet/BRIA.

---

## Appendix: Full Curated Skill List (openai/skills at time of research)

40 curated skills total:

**Media/Design** (directly relevant): `imagegen` (system), `sora`, `speech`, `transcribe`, `screenshot`, `figma`, `figma-code-connect-components`, `figma-create-design-system-rules`, `figma-create-new-file`, `figma-generate-design`, `figma-generate-library`, `figma-implement-design`, `figma-use`

**Code/Deployment**: `aspnet-core`, `chatgpt-apps`, `cli-creator`, `cloudflare-deploy`, `develop-web-game`, `frontend-skill`, `gh-address-comments`, `gh-fix-ci`, `jupyter-notebook`, `linear`, `netlify-deploy`, `openai-docs`, `playwright`, `playwright-interactive`, `render-deploy`, `security-best-practices`, `security-ownership-map`, `security-threat-model`, `sentry`, `vercel-deploy`, `winui-app`

**Document/Data**: `doc`, `pdf`

**Notion suite**: `notion-knowledge-capture`, `notion-meeting-intelligence`, `notion-research-documentation`, `notion-spec-to-implementation`

**Meta**: `yeet`

**System (pre-installed)**: `imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`
