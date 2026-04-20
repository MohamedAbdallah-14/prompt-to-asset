# Programmatic Vector & 3D Tooling — External Grounding

**Research value: high** — Mature, OSS, script-driven primitives exist for every stage of the asset pipeline (SVG clean-up → 2D parametric geometry → 3D extrusion/render → batch mockup → design-system export). Most are GPL-family but produce license-free artwork.

Audience: maintainers evaluating advanced features for `prompt-to-asset` (extruded 3D logos, precise SVG manipulation, batch mockup rendering). Scope: CLI / headless programmatic surface only — no GUI-dependent tools.

---

## 1. Blender + `bpy` (GPL-2+)

**License.** GPL-2-or-later; the `bpy` Python module inherits GPL. Artwork produced is owned outright by the user — commercial use unrestricted. Scripts/add-ons you distribute must be GPL-compatible; you can still sell them.

**Programmatic surface.**
- Headless: `blender -b <scene>.blend --python script.py -- <args>` (no GUI, no display needed).
- Full scene graph, modifiers, materials, Cycles/Eevee, Compositor, and Freestyle all driven from `bpy`.
- Native SVG import: `bpy.ops.import_curve.svg(filepath=...)` → Bezier curves you can `extrude` and `bevel_depth` directly on the curve datablock.

**Use cases in the asset pipeline.**
- **Extruded 3D logos from SVG.** Import SVG → set `bpy.data.curves[name].extrude = 0.2` → add bevel → apply material → render PNG with alpha. Fully scriptable, deterministic.
- **"Hand-drawn" logo look via Freestyle.** Blender ships an official **Freestyle SVG Exporter** add-on (`render_freestyle_svg.py` in `blender/blender-addons`). Set `scene.render.use_freestyle = True` + enable the add-on → hand-drawn stroked lines exported as SVG, with per-line thickness, dash, and cap style. Useful for the "sketch / blueprint" illustration variant the `illustration` skill could emit.
- **Compositor as a final pixel pipeline.** Drive the Compositor from `bpy.context.scene.node_tree` to add drop shadows, glare, and color correction post-render — avoids re-implementing this in Node.

**Tradeoffs.** Cold-start of `blender -b` is 1–3 s; not suitable for per-request hot paths but fine for precomputed asset bundles. No GPU needed for Eevee on CPU, but Cycles wants OptiX/CUDA for realistic mockup speeds.

### 1a. Blenderless (Apache-2-ish wrapper, oqton/blenderless)

Python package + CLI that hides the `bpy` rough edges for the *batch thumbnail / turntable* case: `blenderless image foo.stl out.png`, `blenderless gif foo.stl out.gif`, or a YAML scene config. Thin but saves real integration time if the use case is "render N meshes from M camera angles." Last release April 2024 — maintained but not super active; treat as a reference implementation rather than a hard dependency.

For containerized rendering, `BlenderKit/headless-blender-container` ships Docker images since Blender 2.93 (Docker Hub + GHCR). GPU builds use CUDA/OptiX.

---

## 2. Inkscape CLI (GPL-2)

**License.** GPL-2. Artwork is yours — no license inheritance on outputs.

**Programmatic surface.** Inkscape 1.x has a genuinely capable non-GUI CLI:

```bash
inkscape input.svg \
  --export-type=pdf \
  --export-text-to-path \
  --export-filename=out.pdf
```

Key flags:
- `--export-type=pdf|png|svg|eps` — target format.
- `--export-text-to-path` (`-T`) — **the killer feature**: converts all `<text>` elements to outlined `<path>` so the file renders identically without the font installed.
- `--export-overwrite`, `--batch-process`, `--export-area-drawing`, `--export-dpi`.
- Multiple input files on one command line → one Inkscape process, amortized startup.
- `--actions=...` lets you run arbitrary Inkscape verbs (select, simplify, convert-stroke-to-path, etc.) before export — effectively a micro-DSL for SVG transforms.

**Use cases in the asset pipeline.**
- **Guarantee OG / logo text survives any viewer** without the exact font installed — `--export-text-to-path` on the final SVG before it ships to `og-image`, `favicon`, and `logo` outputs.
- **Reliable PDF export** for print-quality brand sheets.
- **Actions-based clean-up pass:** `--actions="select-all;object-stroke-to-path;path-simplify;export-do"` converts all strokes to filled paths, simplifies Beziers, exports. Useful before handing SVG to `vectorize` or `transparent-bg` skills.
- **Font-to-path pre-render** for social preview generation where user-uploaded fonts are unreliable.

**Tradeoffs.** Inkscape CLI startup is 500 ms–1.5 s on first invoke; `--shell` mode or `--batch-process` with many files is the mitigation. Inkscape 1.3+ is required for stable `--export-filename` behavior; 0.92 syntax (`--export-pdf=...`) is deprecated.

---

## 3. Figma ecosystem

**Official REST API.** Read + export oriented. You can *pull* files, frames, and images (`/v1/images/:file_key` → PNG/SVG/PDF) but you **cannot create or mutate design nodes** from REST. Creation lives only in the Plugin API (runs inside the editor) and the newer Figma MCP server.

**Figma MCP (dev mode).** Rate-limited by plan: Enterprise 600 calls/day, Org/Pro Dev/Full seats 200/day, Starter 6/month. Per-minute caps 10–20/min depending on plan. Write tools like `generate_figma_design` are partially exempt. This is the first sanctioned channel to *create* Figma content programmatically, but it assumes a human-owned Figma account with at least a Dev seat — not a good fit for headless CI.

**Practical fit for `prompt-to-asset`.** Use Figma REST only for *exporting* user-owned design frames to SVG/PNG during asset ingestion. Do not plan on REST-side creation; the MCP path is fine for interactive IDE flows but not for batch pipelines.

---

## 4. Penpot (AGPL-3)

**License.** Server is AGPL-3 — copyleft on the *service*, not on designs created with it. Safe to self-host; distributing a modified server requires open-sourcing your fork.

**API.** RPC-style (JSON or transit+json over HTTP POST), with access tokens and SSE streaming. Webhooks fire on file create/update/comment. As of Feb 2026, plugin API supports **design tokens** (Global → Alias → Semantic, with light/dark themes) — the first real OSS parity with Figma Tokens Studio.

**Use case.** If `prompt-to-asset` ever needs a *writable* design surface (user opens generated brand bundle in a design tool, edits, re-exports), Penpot is the only OSS option with a working write API. Self-hostable, no per-seat pricing. Worth tracking but probably out of scope for a CLI asset pipeline today.

---

## 5. Diagram DSLs — PlantUML, Mermaid, Graphviz

All three are SVG-emitting CLIs; pick by dependency tolerance and layout style.

| Tool | License | CLI | Notes |
|---|---|---|---|
| **Graphviz** (`dot`) | EPL-1.0 | `dot -Tsvg in.dot -o out.svg` | Smallest binary, best layered/DAG layouts. The layout engine PlantUML delegates to. |
| **PlantUML** | GPL-3 | `plantuml -tsvg in.puml` | JRE dependency. Best for UML, sequence, state, C4. PDF needs extra jars. |
| **Mermaid** | MIT | `mmdc -i in.mmd -o out.svg` (via `@mermaid-js/mermaid-cli`) | Node + headless Chromium (Puppeteer) for text metrics — heaviest runtime, nicest defaults. For 100+ diagrams, `mmdr` (Rust) reportedly ~1000× faster. |

**Use cases.** Architecture explainers in generated docs; "how this asset was built" provenance diagrams in the `illustration` / OG pipeline; rapid diagram-as-code for README embeds. MIT/EPL licenses make Graphviz and Mermaid the most redistribution-friendly of the three.

---

## 6. Headless SVG-in-Node

**`svgdom` + `@svgdotjs/svg.js`** (MIT). `svgdom` provides just enough DOM for SVG.js to run headless; 22.5K weekly downloads, updated Jan 2026. Canonical recipe:

```js
import { createSVGWindow } from 'svgdom'
import { SVG, registerWindow } from '@svgdotjs/svg.js'
const window = createSVGWindow()
registerWindow(window, window.document)
const canvas = SVG(window.document.documentElement)
canvas.rect(100, 100).fill('yellow').move(50, 50)
console.log(canvas.svg())
```

Known sharp edges: `querySelector` supports only a handful of pseudo-classes; attribute selectors with `:` or `[]` break. Fine for programmatic generation; not a good fit for parsing arbitrary user SVGs.

**`d3-selection` + `jsdom`** (both BSD/MIT). D3's data-join idioms work server-side when you give D3 a jsdom document to mount into. Heavier than svgdom but worth it when you want D3's scales, axes, and layouts for generated chart assets (e.g., OG images that embed a live sparkline).

**Paper.js + `paper-jsdom`** (MIT/Paper.js MIT). The missing layer for *geometric* SVG: boolean ops, path offsets, hit testing, Bezier subdivision. Pair with **`paperjs-offset`** (MIT, 3.7K weekly dl) for `PaperOffset.offset(path, delta)` and `PaperOffset.offsetStroke(path, width, {join, cap, miterLimit})`. Best on closed paths; open-curve edge cases sometimes misbehave. Use `paper-jsdom` (not the main `paper` package) to avoid a Cairo native dep.

---

## 7. Maker.js (Apache-2, Microsoft)

Parametric 2D geometry DSL in JS. Primitives: lines, arcs, circles → models → layers. Runs in Node and browser. Exports **SVG, DXF, PDF, STL, Jscad CSG/CAG**. Supports boolean ops (unions, intersections, "punches"), fillets, path expansion/outlining, mirror/scale/rotate/distort, and measurements.

**Why it matters here.** Apache-2 is the most permissive license in this list; Maker.js is the natural home for *algorithmic* brand mark generation — wordmarks built from precise geometric primitives, icon sets derived parametrically, or DXF/STL exports when the brand mark becomes a physical asset (laser-cut signage, 3D-printed hero prop for product photography). Pairs well with paper.js for post-processing (smoothing, offset, compound booleans).

---

## Recommended layering for `prompt-to-asset`

```
[Maker.js / Paper.js]     ← algorithmic geometry generation
        ↓ SVG
[Inkscape CLI]            ← canonicalize, text-to-path, simplify
        ↓ clean SVG
[Blender bpy (optional)]  ← 3D extrusion, Freestyle sketch, Compositor
        ↓ PNG/SVG
[svgdom + svg.js]         ← final DOM-level tweaks (insert <title>, metadata)
        ↓
Output bundle (favicon / og-image / logo / illustration)
```

---

## Sources

- Maker.js — https://maker.js.org/ (Apache-2, Microsoft; SVG/DXF/PDF/STL export, boolean ops)
- Blender Freestyle SVG Exporter — https://github.com/blender/blender-addons/blob/master/render_freestyle_svg.py
- Blender `bpy.ops.import_curve.svg` — https://blenderartists.org/t/imported-svg-and-extrusion/409751
- Blenderless — https://github.com/oqton/blenderless (Python wrapper + CLI for headless Blender rendering)
- Headless Blender container — https://github.com/BlenderKit/headless-blender-container
- Inkscape 1.3 man page — https://inkscape.org/doc/inkscape-man-1.3.x.html (CLI flags incl. `--export-text-to-path`, `--actions`)
- Inkscape license — https://www.inkscape.org/about/license/ (GPL-2; artwork unrestricted)
- svgdom — https://github.com/svgdotjs/svgdom (headless DOM for SVG.js, MIT)
- paperjs-offset — https://www.npmjs.com/package/paperjs-offset (MIT)
- Paper.js headless tip — https://stackoverflow.com/questions/32844176/ (use `paper-jsdom` to avoid Cairo)
- Penpot API — https://design.penpot.app/api/_doc + design-tokens API issue https://github.com/penpot/penpot/issues/7916
- Figma MCP plans & limits — https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions
- Text-to-diagram comparison — https://text-to-diagram.com/ (D2 vs Mermaid vs PlantUML vs Graphviz, 2025)
