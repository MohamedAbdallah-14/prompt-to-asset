# Image, Visual, and Media Generation Skills — Awesome Collections Survey

**Date:** 2026-04-20  
**Sources mined:** hesreallyhim/awesome-claude-code (39,775★), travisvn/awesome-claude-skills (11,510★), karanb192/awesome-claude-skills (265★)  
**Methodology:** GitHub API + repo README fetch for each candidate skill.

---

## Ranked Table — All Image/Visual Skills Found

Sorted by GitHub star count (live as of survey date).

| # | Skill / Repo | Stars | Source Collection(s) | Generates | Model/API | Install Method |
|---|---|---|---|---|---|---|
| 1 | [anthropics/skills](https://github.com/anthropics/skills) | 120,569 | travisvn, karanb192 | Generative art, canvas designs, animated GIFs, brand-compliant artifacts | p5.js (no external API), PIL/Pillow (local), Claude LLM | `npx skills add anthropics/skills/skills/<name>` or marketplace zip upload |
| 2 | [frontend-slides](https://github.com/zarazhangrui/frontend-slides) | 14,953 | travisvn | Animation-rich single-file HTML presentations; PPT→web conversion | No external image API — Claude authors HTML/CSS/JS inline | `/plugin marketplace add zarazhangrui/frontend-slides` |
| 3 | [architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator) | 3,779 | (standalone) | Dark-themed system architecture diagrams as standalone HTML/SVG | No external API — Claude generates SVG/HTML inline | Upload zip to claude.ai → Settings → Capabilities → Skills |
| 4 | [fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph) | 3,751 | (standalone) | SVG + high-res PNG technical diagrams; 7 visual styles, 14 UML diagram types | No external API — Claude authors SVG; `rsvg-convert` for PNG export | `npx skills add yizhiyanhua-ai/fireworks-tech-graph` |
| 5 | [excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill) | 2,485 | travisvn (linked) | Whiteboard-style Excalidraw diagrams (.excalidraw JSON); visual validation via Playwright | No external API — Claude emits Excalidraw JSON; Playwright renders for self-validation | `git clone` → copy to `.claude/skills/excalidraw-diagram` |
| 6 | [axton-obsidian-visual-skills](https://github.com/axtonliu/axton-obsidian-visual-skills) | 2,472 | (standalone) | Obsidian Canvas, Excalidraw, Mermaid diagrams from text | No external API — Claude emits JSON/Mermaid DSL | `/plugin marketplace add axtonliu/axton-obsidian-visual-skills` |
| 7 | [mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) | 1,773 | (standalone) | Live Excalidraw canvas with full CRUD (26 MCP tools); PNG export; Mermaid→Excalidraw | No external image API — canvas server + MCP server; optional agent skill | `npm install -g mcp-excalidraw-server` or Docker; skill via `npx skills add` |
| 8 | [manim_skill](https://github.com/adithya-s-k/manim_skill) | 796 | (standalone) | 3Blue1Brown-style mathematical animations (MP4/GIF); ManimCE + ManimGL | No external API — Claude writes Python/Manim code; FFmpeg + LaTeX render locally | `npx skills add adithya-s-k/manim_skill` |
| 9 | [Pretty-mermaid-skills](https://github.com/imxv/Pretty-mermaid-skills) | 649 | travisvn (linked via frontend-slides) | SVG + ASCII Mermaid diagrams; 15 themes (tokyo-night, dracula, github, nord, etc.) | No external API — Node.js + `@mermaid-js/mermaid-zenuml`; zero DOM deps | `npx skills add https://github.com/imxv/pretty-mermaid-skills --skill pretty-mermaid` |
| 10 | [web-asset-generator](https://github.com/alonw0/web-asset-generator) | 322 | hesreallyhim, travisvn | Favicons, app icons (PWA), OG images (Facebook/Twitter/WhatsApp/LinkedIn); all sizes from logo, text, or emoji | No external image API — Pillow + pilmoji (local Python); emoji auto-suggestion | `/plugins marketplace add alonw0/web-asset-generator` then `/plugin install web-asset-generator@web-asset-generator-marketplace` |
| 11 | [nano-image-generator-skill](https://github.com/lxfater/nano-image-generator-skill) | 123 | (standalone) | Text-to-image + reference image style transfer; 1K/2K/4K; multiple aspect ratios | **Gemini 3 Pro Preview ("Nano Banana Pro")** — requires `GEMINI_API_KEY` | `git clone` + add path to `~/.claude/settings.json` `skills` array |
| 12 | [claude-d3js-skill](https://github.com/chrisvoncsefalvay/claude-d3js-skill) | 158 | travisvn | D3.js data visualizations (charts, graphs, network diagrams) | No external API — Claude authors D3.js JavaScript; browser renders | `git clone` → copy to `.claude/skills/` |

---

## Per-Collection Summary

### 1. hesreallyhim/awesome-claude-code (39,775★)

URL: https://github.com/hesreallyhim/awesome-claude-code

**Image/visual skills explicitly listed in this collection's CSV/README:**

#### Web Assets Generator Skill
- **GitHub:** https://github.com/alonw0/web-asset-generator
- **Stars:** 322
- **What it generates:** Favicons (ICO, PNG, SVG), app icons for PWA (all sizes 16×16 → 512×512), social media OG images for Facebook, Twitter, WhatsApp, LinkedIn. Handles image resizing from logos, text, or emojis.
- **Model/API:** No external image model. Uses Python Pillow + pilmoji to composite locally. Emoji suggestions are Claude-generated text; the rendering is deterministic raster ops.
- **Install method (Claude Code):**
  ```
  /plugins marketplace add alonw0/web-asset-generator
  /plugin install web-asset-generator@web-asset-generator-marketplace
  pip install Pillow
  pip install pilmoji 'emoji<2.0.0'   # optional emoji support
  ```
- **Trigger phrases:** "Create a favicon for my coffee shop website", "Generate app icons for my PWA", "Make social media images from my logo"
- **Prerequisites:** Claude Code 2.0.13+, Python 3.6+

**Also referenced (context-only, not image-generation):**
- `/mermaid` slash command (GaloyMoney/lana-bank) — generates Mermaid ERDs from SQL schema; listed as inactive/stale in CSV

**Assessment:** The hesreallyhim collection is selective and conservatively curated. At survey time it contains only one explicit image/visual-asset skill. The high-starred visual repos (fireworks-tech-graph, excalidraw, manim_skill, frontend-slides, architecture-diagram-generator) exist independently on GitHub but are not yet listed in this collection's CSV.

---

### 2. travisvn/awesome-claude-skills (11,510★)

URL: https://github.com/travisvn/awesome-claude-skills

**Image/visual skills listed:**

#### Official Anthropic Skills (from anthropics/skills, 120,569★)

**algorithmic-art**
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/algorithmic-art
- **Stars:** Parent repo 120,569★
- **What it generates:** Generative / procedural art using p5.js. Outputs: philosophy `.md`, interactive `.html` viewer, `.js` sketch. Uses seeded randomness, noise fields, particle systems, flow fields.
- **Model/API:** No external image API. Claude authors p5.js code; browser renders it. The skill prompts Claude to write a manifesto ("algorithmic philosophy") then express it as code.
- **Install:** `npx skills add anthropics/skills/skills/algorithmic-art`
- **Trigger phrases:** "Create generative art", "Make algorithmic art", "Build a flow field visualization", "Generate a particle system"

**canvas-design**
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/canvas-design
- **Stars:** Parent repo 120,569★
- **What it generates:** Visual art as `.png` and `.pdf` documents. Static posters, designs, graphics. Uses a two-step philosophy-then-execution pattern.
- **Model/API:** No external image API. Claude writes Python using Pillow/reportlab to render canvas; output is a real file on disk.
- **Install:** `npx skills add anthropics/skills/skills/canvas-design`
- **Trigger phrases:** "Create a poster", "Make a piece of art", "Design a graphic", "Create a visual"

**slack-gif-creator**
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator
- **Stars:** Parent repo 120,569★
- **What it generates:** Animated GIFs optimized for Slack (emoji: 128×128, message: 480×480). Respects Slack size constraints, FPS limits, and color palette limits.
- **Model/API:** No external API. Claude uses Python Pillow to generate frames programmatically and assemble GIFs. Animations are drawn with PIL primitives (circles, polygons, lines).
- **Install:** `npx skills add anthropics/skills/skills/slack-gif-creator`
- **Trigger phrases:** "Make me a GIF of X doing Y for Slack", "Create an animated emoji GIF"

**brand-guidelines** (design-adjacent)
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
- **Stars:** Parent repo 120,569★
- **What it generates:** Applies Anthropic brand colors and typography to artifacts and outputs. Not standalone image generation, but forces brand-consistent visual output.
- **Install:** `npx skills add anthropics/skills/skills/brand-guidelines`

**web-artifacts-builder** (design-adjacent)
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder
- **Stars:** Parent repo 120,569★
- **What it generates:** Complex claude.ai HTML artifacts using React, Tailwind CSS, shadcn/ui. Interactive demos, prototypes, data visualizations.
- **Install:** `npx skills add anthropics/skills/skills/web-artifacts-builder`

**pptx** (visual output)
- **GitHub:** https://github.com/anthropics/skills/tree/main/skills/pptx
- **Stars:** Parent repo 120,569★
- **What it generates:** PowerPoint presentations with layouts, templates, charts, multimedia integration. Automated slide generation.
- **Install:** `npx skills add anthropics/skills/skills/pptx`

#### Community Skills (travisvn-listed)

**claude-d3js-skill**
- **GitHub:** https://github.com/chrisvoncsefalvay/claude-d3js-skill
- **Stars:** 158
- **What it generates:** D3.js data visualizations — charts, graphs, force-directed network diagrams, geographic maps, time series.
- **Model/API:** No external image API. Claude authors D3.js + SVG code that runs in a browser.
- **Install:** `git clone https://github.com/chrisvoncsefalvay/claude-d3js-skill ~/.claude/skills/claude-d3js-skill`
- **Trigger phrases:** "Create a D3 visualization", "Build a chart with d3.js", "Make an interactive graph"

**web-asset-generator** (also in hesreallyhim — see above)

**frontend-slides**
- **GitHub:** https://github.com/zarazhangrui/frontend-slides
- **Stars:** 14,953
- **What it generates:** Single-file HTML presentations with animations, CSS transitions, and custom visual styles. Also converts existing PowerPoint files to web format, preserving images and content.
- **Model/API:** No external API. Claude authors all HTML/CSS/JS inline. Anti-AI-slop design; curated style presets avoid generic aesthetics. Zero npm dependencies — pure HTML output.
- **Install:**
  ```
  /plugin marketplace add zarazhangrui/frontend-slides
  /plugin install frontend-slides@frontend-slides
  ```
  Or manual: `git clone https://github.com/zarazhangrui/frontend-slides.git ~/.claude/skills/frontend-slides`
- **Trigger phrases:** `/frontend-slides` then describe content; "Convert my presentation.pptx to a web slideshow"
- **PPT conversion:** Requires `pip install python-pptx`

---

### 3. karanb192/awesome-claude-skills (265★)

URL: https://github.com/karanb192/awesome-claude-skills

This collection largely mirrors/references the official Anthropic skills and travisvn list. Its dedicated "Media & Content Creation" section lists:

| Skill | Stars | Status | Description |
|---|---|---|---|
| canvas-design | (Anthropic official) | Community-needed placeholder | Create visual designs and graphics |
| slack-gif-creator | (Anthropic official) | Community-needed placeholder | Generate GIFs for Slack |
| algorithmic-art | (Anthropic official) | Community-needed placeholder | Procedural art via code |
| video-editing-helper | — | "Community-needed" (does not exist yet) | FFmpeg/video editing assistance |
| data-visualization | — | "Community-needed" (does not exist yet) | Charts and interactive visualizations |

No unique image/visual skills exclusive to this collection.

---

## Deep Dives — High-Star Skills Not Yet in Collections

These repos have substantial stars but are not yet listed in any of the three curated collections. They are the most relevant to prompt-to-asset.

### fireworks-tech-graph (3,751★)

- **GitHub:** https://github.com/yizhiyanhua-ai/fireworks-tech-graph
- **What it generates:** SVG diagrams (saved to disk) + high-resolution PNG via `rsvg-convert`. Supports 7 visual styles and 14 diagram types including full UML. Deep AI/agent domain knowledge baked in (RAG, Agentic Search, Mem0, Multi-Agent, Tool Call flows).
- **Visual styles:** Flat Icon (default), Dark Terminal, Blueprint, Notion Clean, Glassmorphism, Claude Official, OpenAI Official.
- **Diagram types:** Architecture, microservices, API flow, sequence, state machine, class, ERD, network topology, RAG, multi-agent, tool call flow, memory architecture, deployment, UML-all-14.
- **Model/API:** No external image API. Claude authors all SVG inline. The skill provides domain-specific SVG templates, arrow semantics, and layout patterns. `rsvg-convert` (librsvg) converts SVG → 1920px PNG.
- **Install:**
  ```bash
  npx skills add yizhiyanhua-ai/fireworks-tech-graph
  # macOS: brew install librsvg
  # Ubuntu: sudo apt install librsvg2-bin
  ```
- **Trigger phrases:** "Generate a [diagram type] diagram, [style name] style", "Draw a Mem0 memory architecture diagram in style 2 (Dark Terminal)", "Create a microservices architecture diagram"
- **Output format:** `.svg` + `.png` files written to working directory.
- **Key distinction vs Mermaid:** Natural language input, no DSL syntax required; semantic arrow coloring; multi-style output; PNG auto-export.

### architecture-diagram-generator (3,779★)

- **GitHub:** https://github.com/Cocoon-AI/architecture-diagram-generator
- **What it generates:** Dark-themed system architecture diagrams as standalone HTML/SVG files, viewable in any browser. Supports React, Node.js, microservices, cloud (AWS/Azure/GCP), Kubernetes, databases, message queues.
- **Color system:** Cyan (frontend), Emerald (backend), Violet (database/AI), Amber (cloud/infra).
- **Model/API:** No external image API. Claude authors SVG/HTML inline based on the skill's component-color conventions. Output is a self-contained `.html` file.
- **Install:** 
  - **claude.ai web:** Download `architecture-diagram.zip` from repo → claude.ai → Settings → Capabilities → Skills → Add → toggle on. Requires Claude Pro/Max/Team/Enterprise.
  - **Claude Code:** `git clone https://github.com/Cocoon-AI/architecture-diagram-generator.git ~/.claude/skills/architecture-diagram-generator`
- **Trigger phrases:** "Use your architecture diagram skill to create an architecture diagram from this description: [paste text]", "Create a system diagram for my microservices app"
- **Iteration:** Fully conversational — ask Claude to add components, change layouts, update colors.

### excalidraw-diagram-skill (2,485★)

- **GitHub:** https://github.com/coleam00/excalidraw-diagram-skill
- **What it generates:** Excalidraw-format diagrams (`.excalidraw` JSON). Not uniform card grids — the skill instructs Claude to use visual metaphors: fan-outs for one-to-many, timelines for sequences, convergence for aggregation. Includes real code snippets and JSON payloads as evidence artifacts.
- **Visual validation loop:** Playwright renders the diagram and Claude examines the screenshot, checking for overlapping text, misaligned arrows, and unbalanced spacing, then auto-corrects.
- **Brand customization:** Edit `references/color-palette.md` to set brand colors; all diagrams follow that palette.
- **Model/API:** No external image API. Claude emits Excalidraw JSON; Playwright (Python) renders it for self-validation.
- **Install:**
  ```bash
  git clone https://github.com/coleam00/excalidraw-diagram-skill.git
  cp -r excalidraw-diagram-skill .claude/skills/excalidraw-diagram
  # Setup renderer:
  cd .claude/skills/excalidraw-diagram/references
  uv sync
  uv run playwright install chromium
  ```
- **Trigger phrases:** "Create an Excalidraw diagram showing [description]", "Draw a diagram of [architecture/flow/system]"

### axton-obsidian-visual-skills (2,472★)

- **GitHub:** https://github.com/axtonliu/axton-obsidian-visual-skills
- **What it generates:** Three diagram types for Obsidian: (1) Excalidraw hand-drawn style diagrams in 3 output modes (Obsidian `.md`, standard `.excalidraw`, animated), (2) Mermaid diagrams, (3) Obsidian Canvas mind maps.
- **Supported diagram types:** Flowchart, Mind Map, Hierarchy, Relationship, Comparison, Timeline, Matrix, Freeform.
- **Model/API:** No external API. Claude emits JSON/Mermaid DSL files directly.
- **Install:**
  ```
  /plugin marketplace add axtonliu/axton-obsidian-visual-skills
  /plugin install obsidian-visual-skills
  ```
  Or: `git clone` → copy skill folders to `~/.claude/skills/`
- **Trigger phrases:**
  - Excalidraw: `Excalidraw`, `diagram`, `flowchart`, `mind map`, `画图`, `流程图`
  - Mermaid: `Mermaid`, `visualize`, `flowchart`, `sequence diagram`, `可视化`
  - Canvas: `Canvas`, `mind map`, `visual diagram`, `思维导图`
- **Prerequisites:** Obsidian with Excalidraw plugin (for Excalidraw skill).

### mcp_excalidraw (1,773★)

- **GitHub:** https://github.com/yctimlin/mcp_excalidraw
- **What it generates:** Live Excalidraw canvas controlled programmatically by AI agents. Supports full element CRUD, alignment, grouping, PNG export, Mermaid→Excalidraw conversion, snapshot/restore.
- **26 MCP tools including:** `create_elements`, `update_elements`, `delete_elements`, `get_canvas_screenshot` (AI sees its own output), `describe_scene`, `export_to_image`, `create_from_mermaid`, `snapshot_scene`, `restore_snapshot`, `read_diagram_guide`.
- **Key differentiator from official Excalidraw MCP:** Stateful persistent canvas with real-time WebSocket sync; iterative refinement loop (agent draws → sees screenshot → adjusts); 26 tools vs one-shot generation.
- **Model/API:** No external image API. Node.js canvas server + MCP server communicating over stdio.
- **Install (MCP server):**
  ```bash
  # npm global
  npm install -g mcp-excalidraw-server
  # Add to claude_desktop_config.json or .claude/settings.json under mcpServers
  ```
  ```bash
  # Docker
  docker pull yctimlin/mcp-excalidraw-server
  docker run -p 3000:3000 yctimlin/mcp-excalidraw-server
  ```
  **Agent skill (optional):** `npx skills add yctimlin/mcp_excalidraw`
- **Trigger phrases:** "Draw a system architecture diagram", "Create an Excalidraw diagram showing [X]", "Convert this Mermaid diagram to Excalidraw"

### manim_skill (796★)

- **GitHub:** https://github.com/adithya-s-k/manim_skill
- **What it generates:** Mathematical animations in the style of 3Blue1Brown. Output: MP4 video, GIF. Covers ManimCE (community, stable) and ManimGL (3Blue1Brown's OpenGL fork) as separate sub-skills.
- **Model/API:** No external image/video API. Claude writes Python code using the Manim library. FFmpeg encodes video. LaTeX renders math equations.
- **Install:**
  ```bash
  npx skills add adithya-s-k/manim_skill
  # Or install just one variant:
  npx skills add adithya-s-k/manim_skill/skills/manimce-best-practices
  npx skills add adithya-s-k/manim_skill/skills/manimgl-best-practices
  # Prerequisites:
  pip install manim
  brew install ffmpeg mactex   # macOS
  # Ubuntu: sudo apt install ffmpeg texlive-full
  ```
- **Trigger phrases:** "Create a 3Blue1Brown style animation of [concept]", "Animate [mathematical concept] using Manim", "Generate an educational animation showing [topic]"
- **Two sub-skills:** `manimce-best-practices` (production, collaborative) and `manimgl-best-practices` (interactive, 3D, rapid prototyping).

### Pretty-mermaid-skills (649★)

- **GitHub:** https://github.com/imxv/Pretty-mermaid-skills
- **What it generates:** Mermaid diagrams rendered as SVG (publication-quality) or ASCII art. Supports all Mermaid diagram types: flowchart, sequence, state, class, ER, Gantt, pie, etc.
- **15 built-in themes:** zinc-light/dark, tokyo-night-light/storm/dark, cappuccin-latte/mocha, github-light/dark, solarized-light/dark, nord, nord-light, dracula, one-dark.
- **Performance:** Batch parallel rendering; zero DOM dependencies.
- **Compatible with:** Claude Code, Cursor, Gemini CLI, Codex, OpenCode, Antigravity, qoder.
- **Model/API:** No external API. Node.js + `@mermaid-js/mermaid-zenuml`; runs locally.
- **Install:**
  ```bash
  npx skills add https://github.com/imxv/pretty-mermaid-skills --skill pretty-mermaid
  # Verify:
  cd Pretty-mermaid && node scripts/themes.mjs
  ```
- **Trigger phrases:** "Render this Mermaid diagram", "Generate a flowchart as SVG", "Create a sequence diagram with [theme]", "Export this diagram as ASCII art"

### nano-image-generator-skill (123★)

- **GitHub:** https://github.com/lxfater/nano-image-generator-skill
- **What it generates:** Raster images from text descriptions; style transfer from reference images (up to 14 reference images for character/style consistency). Aspect ratios: square, portrait, landscape, cinematic. Resolutions: 1K, 2K, 4K.
- **Model/API:** **Gemini 3 Pro Preview** ("Nano Banana Pro") via `gemini-3-0-pro-exp-02-05` or equivalent `imagegeneration` endpoint. Requires a Google AI Studio API key (`GEMINI_API_KEY`). The script hardcodes the key in `scripts/generate_image.py`.
- **Differentiator vs livelabs-ventures/nano-skills:** Adds reference image support (up to 14 images); original did not support this.
- **Install:**
  ```bash
  git clone https://github.com/lxfater/nano-image-generator-skill.git
  # Edit scripts/generate_image.py → replace "YOUR_GEMINI_API_KEY_HERE"
  # Add to ~/.claude/settings.json:
  # { "skills": ["/path/to/nano-image-generator-skill"] }
  ```
- **Trigger phrases:** "Generate an image of [description]", "Create a [style] image with reference [image path]", "Make a 4K image of [subject]"
- **Key limitation:** Gemini image generation is RGB-only. Transparent PNG output is not supported by this model. Does not matte or validate alpha.

---

## Additional Visual Skills Found (Not in Collections' Primary Lists)

These appeared during broader GitHub search and are worth cataloging:

| Repo | Stars | Description | Model/API |
|---|---|---|---|
| [ai-drawio (GBSOSS)](https://github.com/GBSOSS/ai-drawio) | 70 | AI-powered draw.io diagram generator for Claude Code; flowcharts, architecture diagrams, mind maps from natural language; browser preview | No external API — Claude generates draw.io XML |
| [excalidraw-skill (robonuggets)](https://github.com/robonuggets/excalidraw-skill) | 43 | Excalidraw diagramming skill; 10 visual techniques; layout best practices; self-correcting via MCP | No external API |
| [Ultimate-AI-Media-Generator-Skill](https://github.com/ZeroLu/Ultimate-AI-Media-Generator-Skill) | 35 | Image + video generation for Claude Code/Cursor/Codex; slides, anime styles; prompt optimization | CyberBara API (Nano Banana, Sora 2, Seedance, Kling) — requires API key |
| [visual-explainer-skill (ericblue)](https://github.com/ericblue/visual-explainer-skill) | 17 | Converts content/Mermaid to visual explanations: whiteboard sketches, infographics, mind maps | OpenAI or Gemini image generation — requires API key |
| [Claude-Code-Video-Toolkit](https://github.com/wilwaldon/Claude-Code-Video-Toolkit) | 18 | Skills + MCP servers for video: Remotion, Manim, screen recording, YouTube clipping, FFmpeg | Remotion (React-to-video), Manim, FFmpeg — local rendering |
| [manim-skill (Yusuke710)](https://github.com/Yusuke710/manim-skill) | 32 | Manim animations; Claude autonomously plans scenes, writes code, renders, refines | No external API — Manim + FFmpeg local |
| [3brown1blue (AmitSubhash)](https://github.com/AmitSubhash/3brown1blue) | 5 | First-principles Manim skill; math animation from scratch; paper explainer patterns; 21 rule files | No external API — ManimCE |

---

## Cross-Collection Observations

**Model routing reality:**  
Every image/visual skill found across all three collections avoids routing to external diffusion models. They fall into two patterns:
1. **Claude-authors-code:** Claude writes p5.js, D3.js, Manim Python, SVG, HTML/CSS, or Excalidraw JSON. The "image model" is the programming runtime (browser, Python interpreter, rsvg-convert, FFmpeg).
2. **API-gated:** Only `nano-image-generator-skill` calls an actual image generation API (Gemini). `visual-explainer-skill` and `Ultimate-AI-Media-Generator-Skill` call OpenAI/Gemini/CyberBara but are minor-star repos.

**Transparency gap:**  
None of the skills in any of the three collections produce RGBA-transparent PNGs. The `web-asset-generator` produces PNG favicons (opaque) and `nano-image-generator-skill` uses Gemini (RGB-only VAE). This is the gap `prompt-to-asset` fills.

**Install method convergence:**  
Two dominant patterns: `npx skills add <owner>/<repo>` (the skills.sh CLI) and `/plugin marketplace add <owner>/<repo>` + `/plugin install` (Claude Code plugin system). The anthropics/skills official repo uses both. Manual `git clone` to `~/.claude/skills/` is the universal fallback.

**Diagram skills dominate the high-star range:**  
Of the top 12 skills, 9 generate diagrams (SVG, Excalidraw, Mermaid, HTML). Only 3 generate raster images (canvas-design, slack-gif-creator, nano-image-generator-skill). Frontend-slides (14,953★) is the single largest visual skill and it generates HTML, not images.

**Trigger phrase patterns:**  
Most skills activate on explicit mention of the output format ("Excalidraw diagram", "Mermaid chart", "Manim animation") or on the skill name as a slash command (`/frontend-slides`). None auto-detect "logo" or "app icon" — the asset-class vocabulary that `prompt-to-asset` uses.
