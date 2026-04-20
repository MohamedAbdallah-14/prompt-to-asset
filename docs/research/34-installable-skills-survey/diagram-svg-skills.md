# Diagram, SVG & Visual Code Generation Skills Survey

**Date:** 2026-04-20
**Scope:** Installable skills for Claude Code, Cursor, Codex — diagram generation, SVG authoring, chart rendering, visual diff/review

---

## Research Notes on Star Counts

Several repos in the original brief have star counts that differ from current GitHub reality (the brief cited star counts from an earlier snapshot or projections). Actual counts as of research date:

| Brief Description | Actual Repo | Brief Stars | Actual Stars |
|---|---|---|---|
| fireworks-tech-graph | yizhiyanhua-ai/fireworks-tech-graph | 2,800 | 3,800 |
| architecture-diagram-generator | Cocoon-AI/architecture-diagram-generator | 2,400 | 3,800 |
| excalidraw-diagram-skill | coleam00/excalidraw-diagram-skill | 1,200 | 2,500 |
| manim_skill | Yusuke710/manim-skill (closest match) | 328 | 32 |
| Pretty-mermaid-skills | imxv/Pretty-mermaid-skills | 487 | 649 |
| visual-explainer | MyCasaflora/visual-explainer | 731 | 0 (new) |
| frontend-slides | zarazhangrui/frontend-slides | 519 | 15,000 |
| awesome-cursor-skills | spencerpauly/awesome-cursor-skills | 137 | 137 |

The discrepancy suggests the brief's star counts were from an earlier state or estimated projections. Actual star counts are used throughout this document.

---

## Skill Profiles

### 1. fireworks-tech-graph

**URL:** https://github.com/yizhiyanhua-ai/fireworks-tech-graph
**Stars:** 3,800 | **Language:** Python (79%), Shell (21%)

**What it generates:**
- SVG (master, editable) + PNG (1920px width, 2x retina) pairs
- 18+ diagram categories: architecture, data flow, flowchart, agent architecture, RAG, multi-agent, memory, sequence, comparison matrix, timeline/Gantt, mind map, UML (class, use case, state), ER, network topology

**Technology:**
- Pure SVG authoring — no D3.js, no Mermaid, no external graph libraries
- `rsvg-convert` (librsvg) for PNG export — local CLI, no API
- 40+ inline product icon definitions for AI/infra ecosystem (OpenAI, Anthropic, Pinecone, PostgreSQL, Kafka, etc.)

**Output display:**
SVG + PNG written to current working directory as `[derived-name].svg` / `.png`. File paths reported in chat. No browser preview; user opens files directly.

**External dependencies:**
- `librsvg` system package: `brew install librsvg` / `apt install librsvg2-bin`
- No API keys required
- Pure code-gen: Claude authors the SVG, shell script validates + exports

**Install:**
```bash
npx skills add yizhiyanhua-ai/fireworks-tech-graph
```

**Visual styles (7):**
Flat Icon (white), Dark Terminal (#0f0f1a, neon), Blueprint (#0a1628), Notion Clean (minimal white), Glassmorphism (dark gradient), Claude Official (cream #f8f6f3), OpenAI Official (white)

**Key constraints from SKILL.md:**
- Layout: SVG generation → rsvg-convert validation → PNG export
- Helper scripts: `generate-diagram.sh`, `validate-svg.sh`, `test-all-styles.sh`
- Workflow: classify type → extract structure → plan layout → load style → map nodes → check icon requirements → write SVG → validate → export → report paths

**Relevance to prompt-to-asset:** High. The architecture diagram layer is directly relevant for generating architecture-doc SVGs. The icon library approach (inline SVG paths for brand marks) is a reference pattern for the `inline_svg` mode. The style system is analogous to what prompt-to-asset needs for diagram assets. The rsvg-convert pipeline is a proven local SVG→PNG path.

---

### 2. architecture-diagram-generator

**URL:** https://github.com/Cocoon-AI/architecture-diagram-generator
**Stars:** 3,800 | **Language:** HTML

**What it generates:**
- Single self-contained HTML file with embedded SVG + inline CSS
- Dark theme (#020617 background), 40px dot-grid pattern
- Color-coded semantic layers: cyan (frontend), emerald (backend), violet (database), amber (cloud/AWS), rose (security)
- Responsive scaling, ~1000–1100px SVG width
- Three canonical output examples: React+Node+PostgreSQL web app, AWS serverless (Lambda/API Gateway/DynamoDB), Kubernetes microservices

**Technology:**
- SVG with embedded styling
- JetBrains Mono via Google Fonts CDN (external font load)
- No D3.js, no Mermaid, no JS frameworks — pure HTML/SVG/CSS

**Output display:**
Claude.ai generates an HTML artifact in-chat. User downloads and opens in browser. Not compatible with Claude Code CLI (designed for claude.ai web interface).

**External dependencies:**
- None beyond Google Fonts CDN (optional — degrades gracefully)
- No API keys
- **Requires Claude Pro/Max/Team/Enterprise** subscription for skill upload
- Not installable via `npx skills` or `git clone` to `.claude/skills/` — zip upload to claude.ai settings only

**Install:**
1. Download `architecture-diagram.zip` from repo
2. Claude.ai Settings → Capabilities → Skills → Add → upload zip

**Key limitation:** This is a claude.ai-only skill, not a Claude Code CLI skill. The zip format + claude.ai settings upload flow puts it outside the `~/.claude/skills/` ecosystem.

**Relevance to prompt-to-asset:** Medium. The semantic color-layer system and dark-theme aesthetic are directly applicable to architecture diagram generation. The HTML artifact output pattern is not compatible with prompt-to-asset's file-bundle model, but the SVG-in-HTML approach (no external deps) mirrors what `asset_save_inline_svg` does.

---

### 3. coleam00/excalidraw-diagram-skill

**URL:** https://github.com/coleam00/excalidraw-diagram-skill
**Stars:** 2,500 | **Language:** Python (80%), HTML (20%)

**What it generates:**
- `.excalidraw` JSON files (Excalidraw native format)
- PNG images via Playwright headless rendering (render_excalidraw.py script)
- Conceptual-argument diagrams where shape mirrors concept: fan-outs for 1:N, timelines for sequences, convergence for aggregation

**Technology:**
- Excalidraw JSON specification (hand-coded by Claude)
- Playwright + Chromium for screenshot/PNG export
- `uv` (Python package manager) for dependency management
- No Mermaid, no D3.js, no SVG authoring — JSON element authoring only

**Output display:**
`.excalidraw` files saved to working directory; PNG export via `uv run python render_excalidraw.py <file.excalidraw>`. No browser auto-open. Mandatory render-and-validate loop: generate → render → audit → fix → re-render (2–4 iterations typical).

**External dependencies:**
- `uv sync` + `uv run playwright install chromium`
- No API keys required
- Playwright/Chromium must be installed locally

**Install:**
```bash
git clone https://github.com/coleam00/excalidraw-diagram-skill ~/.claude/skills/excalidraw-diagram/
cd ~/.claude/skills/excalidraw-diagram/references && uv sync && uv run playwright install chromium
```

**Key rules from SKILL.md:**
- `roughness: 0` for clean diagrams; containers < 30% of text elements
- Hierarchy via scale: Hero 300×150, Primary 180×90, Secondary 120×60, Small 60×40
- Stroke: 1px subtle, 2px standard, 3px emphasis; opacity always 100

**Relevance to prompt-to-asset:** Low-medium. Excalidraw's hand-drawn aesthetic is not production-grade for software assets (logos, icons, favicons). Useful as a diagramming reference for architecture docs in READMEs. The render-and-validate loop pattern (generate → screenshot → audit → fix) is directly applicable to prompt-to-asset's validation pipeline design.

---

### 4. yctimlin/mcp_excalidraw

**URL:** https://github.com/yctimlin/mcp_excalidraw
**Stars:** 1,800 | **Language:** JavaScript (52%), TypeScript (44%)

**What it generates:**
- Interactive Excalidraw diagrams via 26 MCP tools
- Export formats: `.excalidraw` JSON, PNG screenshots, shareable excalidraw.com URLs
- Mermaid → Excalidraw conversion
- Real-time canvas sync via WebSocket

**Technology:**
- Express server + WebSocket (must run locally on port 3000)
- MCP server protocol (not just a SKILL.md)
- Standalone Excalidraw app for live preview

**Output display:**
Real-time canvas synced to a browser window via WebSocket. Screenshot capture via `get_canvas_screenshot` MCP tool. Both MCP server and SKILL.md included.

**External dependencies:**
- Running Express canvas server required (`npm ci && npm run build`)
- No API keys, but needs local server daemon

**Install:**
```bash
git clone ... && npm ci && npm run build
# Add MCP server to claude_desktop_config.json
# Copy skill to ~/.claude/skills/
```

**Relevance to prompt-to-asset:** Low. MCP-only approach with live server dependency is more complex than needed for asset generation. WebSocket real-time sync is useful for interactive whiteboarding but not for batch asset export.

---

### 5. Yusuke710/manim-skill

**URL:** https://github.com/Yusuke710/manim-skill
**Stars:** 32 | **Language:** HTML

**What it generates:**
- MP4 video files (3Blue1Brown-style mathematical animations)
- GIF animations
- Manim scene-based animations: equations, graphs, geometric transformations, proofs

**Technology:**
- Manim Community Edition (Python animation framework)
- Cairo (rendering backend)
- FFmpeg (video encoding)
- `uv tool install manim`

**Output display:**
Video files rendered locally via Manim engine. Claude Code opens browser video viewer for preview. Iterative feedback loop supported.

**External dependencies:**
- Cairo, pkg-config, FFmpeg (system packages)
- Manim Community via `uv tool install manim`
- No API keys required
- Significant system-level setup

**Install:**
```
/plugin marketplace add Yusuke710/manim-skill
/plugin install manim-skill/manim-skill
```

**Relevance to prompt-to-asset:** None for static software assets. Manim targets educational video animation, not logos/icons/OG images/architecture diagrams. Noted for completeness.

---

### 6. AmitSubhash/3brown1blue

**URL:** https://github.com/AmitSubhash/3brown1blue
**Stars:** 5 | **Language:** Python (96%)

**What it generates:**
- MP4 video files (Manim-rendered)
- Educational animations from topics or PowerPoint slides
- Audience-level targeting: high school, undergrad, graduate, industry
- Voiceover tracks via VibeVoice or Kokoro TTS

**Technology:**
- Manim (requires LaTeX: MiKTeX/MacTeX/texlive-full)
- Multi-LLM planning: supports Claude Code, Anthropic, OpenAI, Gemini, Groq, Mistral
- 24 rule files for production quality

**Install:**
```bash
pip install 3brown1blue && 3brown1blue install
3brown1blue generate "attention mechanism" -p claude-code --render
```

**Relevance to prompt-to-asset:** None for static assets.

---

### 7. imxv/Pretty-mermaid-skills

**URL:** https://github.com/imxv/Pretty-mermaid-skills
**Stars:** 649 | **Language:** JavaScript (87%), Mermaid (13%)

**What it generates:**
- SVG files (rendered Mermaid diagrams)
- ASCII art fallback
- 6 diagram types: flowchart, sequence, state, class, ER, and others
- 15 built-in themes (light/dark variants: zinc, tokyo-night, github, nord, dracula, one-dark, solarized, cappuccino)

**Technology:**
- Node.js 14+ (zero DOM dependencies — runs in Node, not browser)
- Pure JavaScript Mermaid rendering engine
- Batch/parallel rendering capability

**Output display:**
SVG files written to disk. Compatible with Claude Code, Cursor, Gemini CLI, Antigravity, OpenCode, Codex.

**External dependencies:**
- Node.js 14+
- No API keys
- Pure code-gen: Mermaid syntax → SVG

**Install:**
```bash
npx skills add https://github.com/imxv/pretty-mermaid-skills --skill pretty-mermaid
```

**Relevance to prompt-to-asset:** Medium. The SVG output path (Mermaid → rendered SVG) is relevant for architecture diagram docs. The 15-theme system is a reference for how to expose diagram style options. However, Mermaid's SVG output is not icon/logo quality — it's flowchart/diagram quality only.

---

### 8. MyCasaflora/visual-explainer

**URL:** https://github.com/MyCasaflora/visual-explainer
**Stars:** 0 (newly published) | **Language:** HTML (96%), Shell (4%)

**What it generates:**
- Self-contained HTML files with embedded visualizations
- Mermaid flowcharts (zoom/pan interactive)
- Chart.js dashboards
- CSS Grid data tables
- Diff review pages (side-by-side visual architecture comparisons)
- Slide decks with magazine-quality formatting
- Implementation plan visualizations

**Technology:**
- Mermaid (diagram rendering)
- Chart.js (charts/dashboards)
- CSS Grid (layout)
- No build tools; zero-dependency HTML output
- Optional Vercel deploy for live URLs

**Output display:**
Saves to `~/.agent/diagrams/filename.html`, auto-opens in browser. Slash commands: `/generate-web-diagram`, `/diff-review`, `/plan-review`, `/generate-slides`, `/share`.

**External dependencies:**
- None for generation
- Optional Vercel for sharing

**Install:**
Claude Code marketplace; bash curl installer; manual copy for Codex

**Relevance to prompt-to-asset:** Medium. The `/diff-review` command (visual architecture comparison) is directly useful for asset pipeline QA pages. The HTML output approach is a good pattern for validation report pages. The Mermaid + Chart.js combination is a useful reference for generating asset audit dashboards.

---

### 9. Agents365-ai/mermaid-skill

**URL:** https://github.com/Agents365-ai/mermaid-skill
**Stars:** 38 | **Language:** Mermaid

**What it generates:**
- PNG (2048px), SVG, PDF — Mermaid diagram exports
- 11+ diagram types: flowchart, sequence, class, ER, state, Gantt, pie, git graph, C4 context, mind map

**Technology:**
- mmdc CLI (`@mermaid-js/mermaid-cli`) for local export, OR
- Kroki API (cloud fallback, curl-only, no install)
- Dual-mode: local (mmdc) or remote (Kroki)

**External dependencies:**
- Local mode: Node.js + `npm install -g @mermaid-js/mermaid-cli`
- Remote mode: curl only, Kroki public API (free tier)

**Install:**
```bash
git clone https://github.com/Agents365-ai/mermaid-skill ~/.claude/skills/mermaid-skill
```
Also on SkillsMP.

**Relevance to prompt-to-asset:** Medium. The Kroki API fallback (no-install cloud rendering) is a useful pattern for environments without local CLI tools. Mermaid diagrams at 2048px PNG are documentation-grade but not icon-grade.

---

### 10. Agents365-ai/drawio-skill

**URL:** https://github.com/Agents365-ai/drawio-skill
**Stars:** 348 | **Language:** SKILL.md-based

**What it generates:**
- `.drawio` XML files (native draw.io format)
- PNG, SVG, PDF, JPG via draw.io desktop CLI
- Browser fallback: diagrams.net URLs (compressed XML in URL)
- Diagram types: architecture, ML/deep learning, flowchart, UML, ER, org charts

**Technology:**
- draw.io desktop application (required for export)
- Pure SKILL.md skill format
- Python 3 for URL compression (optional)
- Self-check loop: reads exported PNGs, auto-fixes up to 6 issue types

**External dependencies:**
- draw.io desktop app (local install required for export)
- No API keys
- Browser fallback works without desktop app

**Install:**
```bash
git clone ... ~/.claude/skills/drawio-skill/
```
Also: OpenClaw `clawhub install drawio-pro-skill`, SkillsMP `skills install drawio-skill`

**Relevance to prompt-to-asset:** Medium. The draw.io XML format is widely used for architecture docs. The browser URL fallback (no-install path) is a good pattern for graceful degradation. The auto-fix loop (export → read → fix → re-export) mirrors prompt-to-asset's validation pipeline.

---

### 11. zarazhangrui/frontend-slides

**URL:** https://github.com/zarazhangrui/frontend-slides
**Stars:** 15,000 | **Language:** Shell

**What it generates:**
- Single self-contained HTML files with inline CSS/JS
- Zero external dependencies
- 12 visual style presets: Bold Signal, Electric Studio, Neon Cyber, Terminal Green, Swiss Modern, Pastel Geometry, etc.
- Presentation slides with animation patterns
- PDF export via Playwright screenshot automation
- Vercel deployment for live URLs

**Technology:**
- Vanilla CSS + JavaScript (no frameworks)
- Optional Python + `python-pptx` for PowerPoint extraction
- Optional Node.js + Vercel for deployment
- Optional Playwright for PDF export

**Output display:**
Three visual style previews shown in Claude before generation. Final HTML opens in browser.

**External dependencies:**
- Core: none (pure code-gen, self-contained HTML)
- Optional: Python (PPTX conversion), Vercel account (sharing), Playwright (PDF)

**Install:**
```
/plugin marketplace add zarazhangrui/frontend-slides
```
Or: `git clone` + manual; invoked with `/frontend-slides`

**Relevance to prompt-to-asset:** Low for asset generation itself, but high as a UX reference pattern. The "show 3 style previews before generating" UX is directly applicable to prompt-to-asset's mode-selection flow. The self-contained HTML artifact pattern (zero external deps) is the same approach used by `architecture-diagram-generator`.

---

### 12. axtonliu/axton-obsidian-visual-skills

**URL:** https://github.com/axtonliu/axton-obsidian-visual-skills
**Stars:** 2,500 | **Language:** Mixed

**What it generates:**
- Excalidraw files (`.excalidraw` or `.md` with embedded excalidraw)
- Mermaid diagrams (rendered syntax with semantic color schemes)
- Obsidian Canvas files (`.canvas` JSON format)
- Styles: flowcharts, mind maps, hierarchies, timelines, matrices, process flows, comparisons, sequence diagrams, state diagrams

**Technology:**
- Excalidraw (hand-drawn whiteboard rendering)
- Mermaid (diagram library)
- JSON Canvas (MIT, open infinite canvas)
- excalidraw-animate library for animated variants

**External dependencies:**
- Obsidian-specific (designed for Obsidian plugin ecosystem)
- No API keys

**Install:**
```
/plugin install obsidian-visual-skills
# or: cp -r skill ~/.claude/skills/
```

**Relevance to prompt-to-asset:** Low. Obsidian-specific skill. The three-format approach (Excalidraw + Mermaid + Canvas) is a reference for offering multiple diagram output formats from a single skill.

---

### 13. axtonliu/smart-illustrator

**URL:** https://github.com/axtonliu/smart-illustrator
**Stars:** 451 | **Language:** TypeScript (100%)

**What it generates:**
- PNG images (content illustrations: 3:4 portrait; covers: 16:9, ~2816×1584px)
- Platform-specific dimensions: YouTube, WeChat (2.35:1), Twitter (1.91:1), Xiaohongshu (3:4), Square (1:1)
- Tri-engine routing: Gemini (creative visuals), Excalidraw (hand-drawn), Mermaid (structured)
- Batch processing with sequential numbering

**Technology:**
- TypeScript + Bun runtime
- Gemini API (Google image generation, ~$0.134/image)
- Mermaid CLI + Playwright (for diagram export)
- Intelligent position detection + cover learning system

**External dependencies:**
- Gemini API key (mandatory for creative/raster visuals)
- Mermaid CLI + Playwright (optional for diagram mode)

**Relevance to prompt-to-asset:** High as a routing reference. The tri-engine routing (Gemini for creative → Excalidraw for hand-drawn → Mermaid for structured) is directly analogous to prompt-to-asset's mode routing (api → inline_svg → external_prompt_only). The per-platform dimension system (YouTube, Twitter, WeChat) mirrors prompt-to-asset's platform safe-zone targeting.

---

### 14. spencerpauly/awesome-cursor-skills — PNG Export Skill

**URL:** https://github.com/spencerpauly/awesome-cursor-skills
**Stars:** 137 | **Skill URL:** https://github.com/spencerpauly/awesome-cursor-skills/blob/main/resources/exporting-to-png/SKILL.md

**What the PNG export skill does:**
Converts content (code snippets, Markdown, terminal output, Mermaid diagrams, SVG files, rendered UI components) to PNG via headless browser or CLI tools.

**Technology stack (tiered fallback):**
1. Silicon (Rust) — code rendering, dark theme with 32px+ padding, `deviceScaleFactor: 2`
2. Mermaid CLI — diagram conversion
3. Inkscape — SVG to PNG
4. ImageMagick — universal converter
5. Playwright / Puppeteer — HTML + headless browser fallback (works for everything)
6. Carbon (web-based, code styling)

**Output:** PNG files written to disk. No browser preview built in.

**External dependencies:** Varies by chosen tool; core fallback (Playwright) is npm-only.

**Figma plugin skills (from awesome-cursor-skills index):**
- `generate-design` — design-to-code
- `code-connect-components` — component mapping
- Available via: https://cursor.com/cn/marketplace/figma

**Relevance to prompt-to-asset:** High. The tiered tool fallback (Silicon → Inkscape → ImageMagick → Playwright) is directly applicable to prompt-to-asset's raster export pipeline for `inline_svg` outputs that need PNG variants. The `deviceScaleFactor: 2` pattern for 2x retina PNG is already used in fireworks-tech-graph (rsvg-convert -w 1920).

---

### 15. VoltAgent/awesome-claude-design

**URL:** https://github.com/VoltAgent/awesome-claude-design
**Stars:** 475 | **License:** MIT

**What it generates:**
- Complete design system scaffolding from a single `DESIGN.md` upload
- Per design system: `colors_and_type.css` (CSS variables + type scale), Google Fonts substitutes, preview cards (colors/typography/spacing/components), `index.html` + functional UI kit, `SKILL.md` for reuse
- 68 pre-built `DESIGN.md` files covering: Claude, Cursor, Vercel, Figma, Stripe, Supabase, Notion, Linear, Spotify, Apple, NVIDIA, SpaceX, BMW, Tesla, etc.

**Technology:**
- Claude Design workspace (claude.ai/design — not Claude Code CLI)
- DESIGN.md format (9-section markdown: visual theme, colors, typography, components, layout, depth, guidelines, responsive, prompt guidance)
- CSS variables + Google Fonts

**Output display:**
Claude.ai artifacts (HTML/CSS files downloadable). Not a Claude Code CLI skill.

**External dependencies:**
- Claude Pro/Max/Team/Enterprise (required for Claude Design access)

**Relevance to prompt-to-asset:** High as brand reference data. The 68 DESIGN.md files are a structured brand bundle corpus — directly usable to populate `asset_brand_bundle_parse` inputs. The DESIGN.md format (9-section standard) is a reference for how prompt-to-asset could structure its `BrandBundle` schema. The color/typography CSS variable output is analogous to what prompt-to-asset generates when handling brand-palette-constrained assets.

---

## Additional Notable Finds

### ericblue/visual-explainer-skill

**URL:** https://github.com/ericblue/visual-explainer-skill
**Stars:** 17 | **Language:** Makefile-based

- Uses `gpt-image-1` or `GEMINI_API_KEY` to generate PNG explanations
- Requires API key — not zero-key
- Outputs: whiteboard sketches, infographics, slides, mind maps, UI mockups
- 12 example PNG outputs in repo (DNS resolution, ML, git branching, Kubernetes, OAuth2 multi-frame, microservices, OOP mind map, API lifecycle, login flow, CPU comparison, admin dashboard)

**Relevance to prompt-to-asset:** Medium. Confirms that gpt-image-1 and Gemini are both viable for illustration-style explainer visuals. The multi-frame (3–5 progressive images) for sequential explanations is a pattern prompt-to-asset's `illustration` asset type could adopt.

---

## Cross-Skill Technology Stack Summary

| Technology | Skills Using It | Notes |
|---|---|---|
| SVG hand-authored by LLM | fireworks-tech-graph, architecture-diagram-generator | Highest quality; ≤40 paths constraint |
| Mermaid → SVG | Pretty-mermaid-skills, mermaid-skill, visual-explainer | Flowchart/diagram quality; not icon-grade |
| Excalidraw JSON | coleam00/excalidraw-diagram-skill, yctimlin/mcp_excalidraw, axtonliu | Hand-drawn aesthetic; PNG via Playwright |
| draw.io XML | Agents365-ai/drawio-skill | Requires desktop app for export |
| Manim Python | Yusuke710/manim-skill, AmitSubhash/3brown1blue | Video only; not static assets |
| HTML/CSS/JS (self-contained) | architecture-diagram-generator, visual-explainer, frontend-slides | Browser artifacts; good for docs |
| rsvg-convert (librsvg) | fireworks-tech-graph | Best local SVG→PNG path |
| Playwright/Chromium | coleam00/excalidraw-diagram-skill, smart-illustrator, frontend-slides | Universal HTML→PNG fallback |
| mmdc CLI | mermaid-skill, smart-illustrator | Mermaid→PNG/SVG |
| Kroki API | mermaid-skill | No-install cloud Mermaid rendering |
| gpt-image-1 / Gemini API | ericblue/visual-explainer-skill, smart-illustrator | Raster illustration; requires API key |

---

## Install Method Taxonomy

| Method | Skills | Notes |
|---|---|---|
| `npx skills add <owner>/<repo>` | fireworks-tech-graph, Pretty-mermaid-skills | Preferred for Claude Code CLI |
| `git clone ~/.claude/skills/<name>/` | coleam00/excalidraw-diagram-skill, drawio-skill, mermaid-skill | Manual but universal |
| `/plugin marketplace add <owner>/<repo>` | Yusuke710/manim-skill, frontend-slides | Claude Code marketplace CLI |
| claude.ai Settings → Skills → upload zip | architecture-diagram-generator | claude.ai web only; not CLI |
| `pip install` + CLI | AmitSubhash/3brown1blue | Python package |
| MCP server + skill | yctimlin/mcp_excalidraw | Most complex setup |
| DESIGN.md upload to claude.ai/design | VoltAgent/awesome-claude-design | Claude Design workspace |

---

## Synthesis: Relevance to prompt-to-asset

### Directly actionable patterns

**1. SVG authoring pipeline (fireworks-tech-graph)**
The `rsvg-convert -w 1920 file.svg -o file.png` pattern is the correct local path for SVG→PNG in `inline_svg` mode. The 7-style system (flat/dark/blueprint/notion/glass/claude-official/openai-official) is a direct reference for style variants in `asset_generate_logo`. The icon library approach (40+ inline SVG paths for product marks) is how the `inline_svg` path handles brand icons without external APIs.

**2. Render-and-validate loop (coleam00/excalidraw-diagram-skill)**
The mandatory 2–4 iteration loop (generate → render → audit → fix) mirrors what prompt-to-asset's validation pipeline should do. The quality checklist (text clipping, overlaps, arrow routing, safe-zone compliance) maps directly to prompt-to-asset's tier-0 checks (dimensions exact, alpha present, FFT checkerboard, tight bbox).

**3. Tiered export fallback (spencerpauly PNG skill)**
Silicon → Inkscape → ImageMagick → Playwright is the correct fallback chain for SVG→PNG in heterogeneous environments. This should be the export path for `asset_save_inline_svg` when rsvg-convert is unavailable.

**4. Brand bundle corpus (VoltAgent/awesome-claude-design)**
The 68 DESIGN.md files (Claude, Vercel, Stripe, Notion, Linear, Figma, Supabase, Spotify, Apple, NVIDIA, Tesla, BMW, etc.) are structured brand references usable as test cases for `asset_brand_bundle_parse`. The 9-section DESIGN.md standard (visual theme, colors, typography, components, layout, depth, guidelines, responsive, prompt guidance) is a reference schema for BrandBundle.

**5. Multi-engine routing (smart-illustrator)**
The Gemini/Excalidraw/Mermaid routing based on content type (creative → hand-drawn → structured) is the same routing problem prompt-to-asset solves across `api`/`inline_svg`/`external_prompt_only`. Smart-illustrator's tri-engine approach confirms that routing must be content-type-aware, not user-preference-only.

**6. No-install cloud fallback (Agents365-ai/mermaid-skill Kroki path)**
Kroki API renders Mermaid via `curl` — no npm, no local tools. For environments where even `librsvg` or `mmdc` are unavailable, a similar cloud-render fallback (e.g., Recraft hosted vectorization, or Kroki for diagram assets) should be documented in prompt-to-asset's capability matrix.

### Not relevant to prompt-to-asset

- Manim skills (video animation — wrong asset class)
- Excalidraw skills (hand-drawn aesthetic — not production-grade for logos/icons)
- frontend-slides (presentation HTML — not a software asset type)
- claude.ai-only skills (architecture-diagram-generator, awesome-claude-design) when Claude Code CLI compatibility is required

### Gap identified

None of the surveyed skills handles the specific problem prompt-to-asset addresses: **transparent PNG generation, alpha validation, safe-zone bbox checking, or OCR/Levenshtein wordmark validation**. All diagram skills produce opaque outputs (white or dark backgrounds). The prompt-to-asset validation pipeline (tier-0: dimensions, alpha, FFT checkerboard, bbox, ΔE2000 palette) is not duplicated anywhere in the surveyed landscape. This is a genuine differentiation point.

The closest overlap is the render-and-validate loop in `coleam00/excalidraw-diagram-skill`, but it validates visual aesthetics (text clipping, overlap), not alpha/transparency/platform compliance.
