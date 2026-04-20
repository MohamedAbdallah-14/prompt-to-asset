# Figma & Design Tool Skills — Integration Survey

**Research date:** 2026-04-20  
**Context:** prompt-to-asset generates production-grade software assets (logos, app icons, OG images, etc.). This document surveys installable skills and MCP servers that could push those generated assets into Figma, Penpot, Canva, or Creative Cloud — completing the "generate → design-file" loop.

---

## 1. The Official Figma MCP Server (`figma/mcp-server-guide`)

### Source
- Skill guide repo: `https://github.com/figma/mcp-server-guide`
- Skills are also listed on `https://officialskills.sh/figma/skills/`
- Distributed via the official Figma plugin (installed in Figma desktop/browser)

### How It Works
The Figma MCP is a **two-part system**:
1. A **Figma plugin** running inside the Figma app that bridges the Plugin API to the MCP layer
2. An **MCP server** that exposes tools to the AI agent

The plugin must be active in the open Figma file. The MCP server communicates with it over a local socket or SSE channel.

### MCP Tools Exposed (complete list)

| Tool | Direction | What it does |
|------|-----------|--------------|
| `get_design_context` | Read | Fetches design node tree, renders code hints, returns screenshot |
| `get_screenshot` | Read | Renders a node or frame as PNG |
| `get_metadata` | Read | File/node metadata without full tree |
| `get_variable_defs` | Read | Design tokens (colors, spacing, typography) |
| `get_code_connect_map` | Read | Mapping from Figma components → codebase components |
| `get_code_connect_suggestions` | Read | Suggests Code Connect mappings |
| `get_context_for_code_connect` | Read | Context needed to write a Code Connect annotation |
| `add_code_connect_map` | Write | Saves a Code Connect mapping |
| `send_code_connect_mappings` | Write | Pushes Code Connect mappings to Figma |
| `get_libraries` | Read | Lists shared design-system libraries |
| `search_design_system` | Read | Searches components/styles in the connected library |
| `create_design_system_rules` | Write | Generates and saves DS rules for code-gen workflows |
| `create_new_file` | Write | Creates a blank Figma Design or FigJam file |
| `generate_diagram` | Write | Creates a FigJam diagram from a spec |
| `use_figma` | **Write** | Executes arbitrary Plugin API JavaScript on the canvas |
| `get_figjam` | Read | Reads FigJam board content |
| `whoami` | Read | Returns authenticated user info |

### Bidirectionality
**Bidirectional.** The `use_figma` tool is the write surface — it runs arbitrary Figma Plugin API JavaScript inside the open file. The REST-layer tools (`get_*`) are read-only.

### Authentication
- Personal Access Token (PAT) via Figma's token management UI
- Token scopes required: File Read (for REST reads) + the plugin handles canvas writes via Plugin API (no token needed for plugin-side ops, only for REST calls)
- Token is passed as `FIGMA_API_KEY` env var or `--figma-api-key` CLI flag

### Install Method (Claude Code)
```bash
npx skills add https://github.com/figma/mcp-server-guide --skill figma-use
npx skills add https://github.com/figma/mcp-server-guide --skill figma-implement-design
# etc.
```
The Figma MCP server itself must also be running — installed via the Figma desktop plugin or `npx figma-developer-mcp`.

---

## 2. The Seven Official Figma Skills (from `figma/mcp-server-guide`)

All seven skills require the official Figma MCP server and the plugin running in the active Figma file.

### 2.1 `figma-use`
**Install:** `officialskills.sh/figma/skills/figma-use`  
**Direction:** Write (prerequisite for all canvas-writing operations)  
**What it does:** Configures the agent's execution context for running JavaScript in Figma via the Plugin API. Must be loaded before any `use_figma` tool call. Covers node creation, variable binding, auto-layout, fill/stroke, typography, components, and variants.  
**Image notes:** The Plugin API has `figma.createImageAsync(url: string)` and `figma.createImage(data: Uint8Array)`. Both return an `Image` handle that can be applied as an `ImagePaint` fill on any node. **This is the hook for pushing a prompt-to-asset PNG into Figma.** The `use_figma` skill's documented node types do not explicitly list image nodes, but image fills on Rectangle/Frame nodes work via this API.

### 2.2 `figma-implement-design`
**Install:** `officialskills.sh/figma/skills/figma-implement-design`  
**Direction:** Read-to-Code (Figma → codebase, not the reverse)  
**What it does:** Translates a Figma design node into production-ready application code with pixel-perfect accuracy. Fetches design context via `get_design_context`, validates output against `get_screenshot`.  
**Integration angle:** Reverse of what prompt-to-asset needs. Useful if a designer has already placed a logo placeholder and you want generated code to consume it.

### 2.3 `figma-generate-design`
**Install:** `officialskills.sh/figma/skills/figma-generate-design`  
**Direction:** Write (code/description → Figma canvas)  
**What it does:** Builds or updates full-page Figma screens from code or text descriptions using design system components and tokens. Uses `use_figma` for canvas writes and `generate_figma_design` for web-page capture.  
**Image handling:** Can place raster images on canvas, but **only by copying `imageHash` values from nodes already present in the file**. The Plugin API cannot fetch arbitrary external URLs directly during a `use_figma` call. Workaround: `generate_figma_design` first captures a web page as a screenshot (rasterizing it into Figma), then `imageHash` values from those nodes can be copied to other frames.

### 2.4 `figma-code-connect`
**Install:** `officialskills.sh/figma/skills/figma-code-connect-components`  
**Direction:** Read + Write (bidirectional mapping)  
**What it does:** Connects Figma design components to codebase components using Code Connect annotations. Uses `get_code_connect_suggestions`, `get_context_for_code_connect`, `add_code_connect_map`, and `send_code_connect_mappings`.

### 2.5 `figma-create-design-system-rules`
**Install:** `officialskills.sh/figma/skills/figma-create-design-system-rules`  
**Direction:** Write  
**What it does:** Generates project-specific design system rules that constrain future Figma-to-code generation. Calls `create_design_system_rules`.

### 2.6 `figma-generate-library`
**Install:** `officialskills.sh/figma/skills/figma-generate-library`  
**Direction:** Write (codebase → Figma component library)  
**What it does:** Builds or updates a design system library in Figma from an existing codebase. Scans code components, creates matching Figma components with accurate tokens.

### 2.7 `figma-create-new-file`
**Install:** `officialskills.sh/figma/skills/figma-create-new-file`  
**Direction:** Write  
**What it does:** Creates a blank Figma Design or FigJam file. Prerequisite for programmatic canvas population from scratch.

---

## 3. Community MCP: Framelink / Figma-Context-MCP (`GLips/Figma-Context-MCP`)

### Source
`https://github.com/GLips/Figma-Context-MCP`  
npm package: `figma-developer-mcp`

### What It Does
Fetches Figma file metadata and simplifies the API response to reduce token usage. Designed for Cursor and other AI coding agents to implement designs "in one shot" without screenshot-based guesswork.

### Bidirectionality
**Read-only.** No write capability documented. It only retrieves design data.

### Tools Exposed
The README does not enumerate individual tool names. Functionally it proxies Figma REST API file/node reads and strips irrelevant fields before returning to the agent.

### Authentication
Personal Access Token via `FIGMA_API_KEY` or `--figma-api-key` flag.

### Install Method
```json
{
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--figma-api-key=YOUR-KEY", "--stdio"]
}
```
Add to MCP config in Cursor (`.cursor/mcp.json`), Claude Desktop (`claude_desktop_config.json`), or Windsurf equivalent. Works on any MCP-compatible agent.

### Comparison to Official Server
Framelink predates the official Figma MCP and is widely adopted (the most-starred community Figma MCP). It has no canvas-write capability. The official Figma MCP supersedes it for write workflows but requires the Figma desktop plugin to be running.

---

## 4. Penpot MCP (`penpot/penpot-mcp`)

### Source
`https://github.com/penpot/penpot-mcp`

### What It Does
Enables LLMs to query, transform, and create design elements in Penpot files. Uses a Penpot plugin as the bridge — the plugin connects to the MCP server via WebSocket and executes code snippets within the Penpot Plugin environment.

### Bidirectionality
**Fully bidirectional.** Supports retrieval of design data, modification of existing elements, and creation of new components. "Design-to-design, code-to-design, and design-code workflows" are all claimed.

### Authentication
Not documented. The server runs locally; the Penpot plugin connects via `http://localhost:4400/manifest.json`. No API key mechanism described — the plugin runs inside Penpot's sandboxed environment.

### Install Method
```bash
npm install && npm run bootstrap
# Load plugin in Penpot via: http://localhost:4400/manifest.json
# MCP endpoint: http://localhost:4401/mcp  (or /sse for SSE)
```
Add MCP endpoint to Claude Code or Cursor config.

### Limitations vs. Figma
- Penpot is open-source and self-hostable, but the plugin/server combo requires local setup with no hosted option
- Browser connectivity restrictions in Chromium 142+ require explicit local network permission
- Much smaller ecosystem of skills/docs compared to Figma
- No equivalent of Figma's `createImageAsync` documented

---

## 5. Canva Claude Skills (`canva-sdks/canva-claude-skills`)

### Source
`https://github.com/canva-sdks/canva-claude-skills`  
23 stars, actively maintained (updated within last 2 weeks)

### What It Does
Seven skills that use the Canva Connector (Canva's MCP/API layer) to drive design workflows:

| Skill | What it does |
|-------|-------------|
| `branded-presentation` | Creates presentations from outlines using brand kits |
| `design-translation` | Translates text in designs to another language |
| `implement-feedback` | Applies review comments to designs |
| `presentation-time-fitting` | Adjusts decks to match speaking time |
| `resize-for-social-media` | Creates 5 platform-optimized versions (Facebook, Instagram, LinkedIn) |
| `bulk-create` | Generates multiple designs from tabular data + templates |
| `classroom-helper` | Converts lesson plans into slide decks |

### Bidirectionality
**Write-capable** — skills create and modify Canva designs. The `bulk-create` skill explicitly handles "text, image assets, and chart fields," suggesting image asset placement in templates.

### Authentication
Not documented in the README. Likely requires a Canva Connect API key (Canva's developer platform credential). Canva Connect is invite/approval-based for production use.

### Install Method
```bash
git clone https://github.com/canva-sdks/canva-claude-skills
# Claude Desktop: add skills to claude_desktop_config.json
# Claude Code CLI: follow skill installation guide
```

### Integration Angle for prompt-to-asset
The `bulk-create` skill's ability to inject image assets into templates is the relevant hook. A generated logo PNG could theoretically be placed into a Canva template, but this path is more about Canva's autofill/template system than a raw image upload. No direct "upload PNG to canvas at (x,y)" capability is documented.

---

## 6. Adobe Firefly MCP (Community)

### Source
`https://github.com/nolandubeau/adobe-firefly-mcp-hub`  
Apache 2.0, 1 commit, 0 stars — early-stage community project

### What It Does
Claims to provide "unified access to Adobe Firefly Services APIs, modeled after the Docker Hub MCP architecture." No detailed tool list or documentation is publicly available beyond the repository description.

### Status Assessment
No official Adobe MCP server exists as of this research date. Both community Firefly MCP repos (`krishnapallapolu/adobe-firefly-mcp` and `nolandubeau/adobe-firefly-mcp-hub`) have zero stars and minimal commits. They wrap the Firefly Services REST API (image generation, generative fill, generative expand) but are not production-ready tools.

### Authentication
Adobe Firefly Services uses OAuth 2.0 client credentials via Adobe Developer Console. Requires a paid Firefly Services subscription (not the consumer Creative Cloud plan).

### Relevance to prompt-to-asset
Adobe Firefly is a generation model, not a design file destination. It generates images but has no Canvas/InDesign write API accessible via MCP. Not a viable "push asset into Creative Cloud" path at this time.

---

## 7. The Critical Integration Gap: Pushing Assets INTO Figma

This is the core question for prompt-to-asset. Here is the precise technical picture:

### What the Figma Plugin API can do
The Figma Plugin API (accessible via `use_figma`) has two methods for images:

```javascript
// From a URL (e.g., a hosted PNG)
const image = await figma.createImageAsync("https://example.com/logo.png");

// From binary data (e.g., a local file read as Uint8Array)
const image = figma.createImage(uint8ArrayData);

// Apply to a node as an image fill
const rect = figma.createRectangle();
rect.resize(512, 512);
rect.fills = [{
  type: "IMAGE",
  imageHash: image.hash,
  scaleMode: "FILL"
}];
```

**`figma.createImageAsync` accepts a public URL.** This means a prompt-to-asset generated PNG that is:
- Hosted at a public URL (e.g., served from a local dev server, object storage, or a signed URL), OR
- Uploaded to any publicly accessible endpoint

...can be placed directly onto the Figma canvas via `use_figma`.

### What the Figma REST API cannot do
The Figma REST API is **read-only for files**. There is no `POST /v1/images` endpoint. You cannot push a PNG into a Figma file via REST alone. The Plugin API is the only write path.

### Practical push-to-Figma flow for prompt-to-asset

```
prompt-to-asset generates logo.png
        ↓
asset_save_inline_svg / api pipeline writes file to disk
        ↓
Serve the file temporarily (local HTTP server or upload to object storage)
        ↓
Agent calls use_figma with:
  figma.createImageAsync("http://localhost:PORT/logo.png")
  → place as ImagePaint fill on a Rectangle node
  → position, resize, name the node
  → (optional) wrap in a frame, add to a page
        ↓
Logo is now a native Figma image node
```

### Constraint: Plugin must be running
The `use_figma` tool only works when the official Figma MCP plugin is active in the open Figma file. This is an interactive requirement — the user must have Figma open. There is no headless/background write path via the current API.

---

## 8. The `spencerpauly/awesome-cursor-skills` Figma Entry

The repository lists a **Figma Plugin** skill described as covering "Design-to-code and design system management." It is not a standalone skill file but a pointer to Figma's official MCP skills (same `figma/mcp-server-guide` source as section 2 above). No additional capability beyond what is documented there.

---

## 9. Summary Table

| Tool / Skill | Direction | Image Upload | Auth Required | Agent Platforms | Status |
|---|---|---|---|---|---|
| Figma official MCP + `figma-use` skill | Read + Write | Yes (via `createImageAsync` URL) | Figma PAT + plugin open | Claude Code, Cursor, Windsurf, Codex | Production |
| `figma-generate-design` skill | Write | Via imageHash copy only | Figma PAT + plugin open | Claude Code, Cursor | Production |
| `figma-implement-design` skill | Read → Code | N/A | Figma PAT + plugin open | Claude Code, Cursor | Production |
| Framelink / GLips MCP | Read only | No | Figma PAT | Any MCP agent | Production, widely used |
| Penpot MCP | Read + Write | Undocumented | None (local plugin) | Claude Code, Cursor | Early/experimental |
| Canva Claude Skills | Write (templates) | Via bulk-create autofill | Canva Connect (approval) | Claude Desktop, Claude Code | Active |
| Adobe Firefly MCP (community) | Generation only | N/A | Adobe OAuth + paid plan | Undetermined | Not production-ready |

---

## 10. Recommended Integration Design for prompt-to-asset

The cleanest path to "generated logo → Figma file" uses the official Figma MCP + `figma-use` skill:

### Prerequisites
1. User has Figma open with the official Figma MCP plugin active
2. `FIGMA_API_KEY` is set with a PAT that has File Read scope
3. Target file key is known (from a Figma URL)

### Proposed `asset_push_to_figma` skill flow

```
1. asset_generate_logo (or asset_save_inline_svg for SVG output)
   → writes master.png (or master.svg) to disk
   → returns local file path

2. Serve the file:
   - Spin up a one-shot local HTTP server (e.g. npx serve --single)
   - Or upload to a temporary public URL (signed S3, imgbb, etc.)

3. Call use_figma with a script that:
   a. Navigates to the target page
   b. Calls figma.createImageAsync(publicUrl)
   c. Creates a Rectangle at target dimensions
   d. Sets the image fill with the returned hash
   e. Names the node (e.g. "Logo / Generated [date]")
   f. Returns { nodeId, imageHash }

4. Call get_screenshot with the returned nodeId to verify placement

5. Report the Figma node URL to the user:
   https://figma.com/file/{fileKey}?node-id={nodeId}
```

### SVG path (for inline_svg mode output)
For SVG outputs from prompt-to-asset, the Plugin API has `figma.createNodeFromSvgAsync(svgString)` which parses SVG into native Figma vector nodes. This is **superior to image placement** for logos because:
- The result is a fully editable vector layer, not a rasterized image fill
- Colors, paths, and text remain individually selectable
- No imageHash indirection needed

```javascript
const svgString = `<svg>...</svg>`; // the inline_svg output
const node = await figma.createNodeFromSvgAsync(svgString);
node.name = "Logo / Generated";
node.x = targetX;
node.y = targetY;
figma.currentPage.appendChild(node);
return { nodeId: node.id };
```

This is the **highest-fidelity integration path** for prompt-to-asset's `inline_svg` mode output.

---

## 11. Files and Repos to Watch

- `https://github.com/figma/mcp-server-guide` — official skill source, updated by Figma
- `https://github.com/GLips/Figma-Context-MCP` — read-only community server, widely deployed
- `https://github.com/penpot/penpot-mcp` — Penpot write path, worth revisiting when more mature
- `https://github.com/canva-sdks/canva-claude-skills` — Canva's official Claude skills
- `https://developers.figma.com/docs/plugins/api/figma/` — Plugin API reference for `createImageAsync`, `createNodeFromSvgAsync`
- `https://developers.figma.com/docs/rest-api/` — REST API reference (read-only for file content)
