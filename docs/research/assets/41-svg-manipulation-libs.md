# 41 — SVG Manipulation Libraries (DOM / Path / Geometric)

External grounding for `prompt-to-asset` post-gen SVG pipeline:
safe-zone padding, path offset, stroke-to-fill for tiny ICO sources, symmetry/recolor,
and path-merging before vtracer input.

All license/version/maintenance claims dated **April 2026** from npm + GitHub.

---

## Summary Matrix

| Library | License | Layer | Node? | Maint. | Fit |
|---|---|---|---|---|---|
| `@svgdotjs/svg.js` + `svgdom` | MIT + MIT | DOM-ish builder | ✅ via `svgdom` (last update Jan 2026) | Active | Programmatic SVG construction, recolor by selector |
| `svgson` | MIT | Parse/stringify AST | ✅ | **Stale** (v5.3.1, Jul 2023) | Still works, 155K/wk; light AST walks for recolor/attr rewrite |
| `svg-pathdata` | MIT | Path `d` only | ✅ | Active (v8.0.0) | 6.9M/wk; low-level `d` parsing + transforms (scale/abs) |
| `svgpath` (fontello) | MIT | Path `d` only | ✅ | Active (v2.6.0, 543K/wk) | Lightweight chainable `.scale().translate().transform()` |
| `svg-path-commander` (thednp) | MIT | Path `d` + geometry | ✅ | **Very active** (v2.2.1, Apr 2026) | TS; `getBBox/getPointAtLength/isPointInStroke`, DOMMatrix transforms, normalize/reverse |
| `svg-path-editor-lib` (Yqnn) | MIT | Path `d` editor | ✅ (Angular-adjacent) | Active (v1.0.3, Sep 2025) | 93/wk, niche — mainly powers the web editor |
| `paper.js` + `paper-jsdom` | MIT | Full CAG (Bézier boolean + offset) | ⚠️ `paper-jsdom` works; `paper-jsdom-canvas` **archived** | **Stagnant** (last release v0.12.15 2021; commits to mid-2024) | Union/subtract/intersect/exclude on `Path`/`CompoundPath`; the only mature JS CAG |
| `paperjs-offset` (glenzli) | MIT | Path offset + stroke-expand | ✅ | Active | `PaperOffset.offset()` and `.offsetStroke()` — Illustrator-style expand |
| `paper-clipper` | MIT | Clipper-WASM boolean + offset | ✅ | Niche | Alternative offset/union backend (partial API: `unite`) |
| `makerjs` (Microsoft) | Apache-2.0 | 2D CAD models | ✅ | Stable (v0.19.2, ~11K/wk) | Boolean combine, `path.expand`, outline/offset, chain detection, SVG export |
| `@flatten-js/core` + `@flatten-js/polygon-offset` | MIT | Pure 2D geometry | ✅ | Active (v1.1.4) | Polygon offset via morphological algorithm; good for polygonized shapes only (arcs/segs, no cubic Bézier) |
| `flatten-svg` | MIT | Flatten to polylines | ✅ | Niche (v0.3.0) | Reduces curves to line segments — for plotter/export, not for re-emitting smooth SVG |
| `svg-flatten` | MIT | Shape→path normalizer | ✅ | Minor | `<polygon>/<rect>/<g>` → `<path>`, merges groups, applies `transform=` |
| `d3-shape` | ISC | Shape generators | ✅ | Active (42M/wk) | Build charts/symbols *as* SVG `d` strings — orthogonal to manipulation |
| `oslllo-svg-fixer` | MIT | Stroke→fill (potrace) | ✅ | Very active (v6.0.1, Dec 2025, 11× speedup) | Raster-retraces stroked icons to single filled paths; needed for icon→font and ICO |
| `svg-outline-stroke` | MIT | Stroke→fill (potrace) | ✅ | Stable | Similar to above; CLI + microservice flavors |
| `raphael.js` | MIT | Legacy DOM abstraction | — | **Abandoned** | Skip per brief |
| `svg-tools` / `simple-svg-tools` | — | — | — | `simple-svg-tools` **deprecated** → `@iconify/tools` | Not a standalone choice |

---

## Layer Model

Three distinct abstraction levels; almost any real pipeline combines at least two.

1. **Document / DOM layer** — `svgson` (parse→AST→stringify) and `@svgdotjs/svg.js` + `svgdom`
   (chainable build + `querySelector`). For deterministic recolor by selector,
   element insertion (clip paths, backgrounds, padding rects), and attribute rewrites.
2. **Path-string (`d`) layer** — `svgpath`, `svg-pathdata`, `svg-path-commander`.
   For normalize/abs/rel/rounding, affine transforms baked into coordinates,
   bbox/length queries, command reversal. No Bézier-aware geometry.
3. **Geometric / CAG layer** — `paper.js` (+ `paperjs-offset`), `makerjs`,
   `@flatten-js/polygon-offset`. Produces new curves from old: union,
   subtract, intersect, offset outward/inward, stroke→outline.

The DOM-level and path-level libs cannot do "offset by 5 px" — that requires
curve-accurate geometry (CAG).

---

## Concrete Pipeline Mappings

### 1. Safe-zone padding: offset logo inward by 5% of bbox

**Primary: `paper.js` + `paperjs-offset`**

```js
import paper from 'paper'
import { PaperOffset } from 'paperjs-offset'

paper.setup(new paper.Size(1024, 1024))   // under paper-jsdom — no canvas needed
const item = paper.project.importSVG(svgString)
const inset = -Math.round(item.bounds.width * 0.05)
const ring = PaperOffset.offset(item, inset, { join: 'round' })
```

Works on `Path` and `CompoundPath`. Caveat: open curves and self-intersecting
inputs can produce artifacts — pre-clean with `item.flatten()` or
`PathItem.resolveCrossings()` first.

**Alternative: `makerjs`** — `makerjs.model.outline(model, distance)` and
`makerjs.model.combineIntersection/Union/Subtraction`. Nicer JSON model,
weaker on complex Bézier self-intersections than paper.js.

**Not suitable**: `@flatten-js/polygon-offset` only handles polygons with
arc/segment edges, not cubic Béziers — you'd have to flatten curves first,
losing smoothness. OK for already-polygonal marks; wrong for logos.

---

### 2. Expand stroke on tiny icons before ICO conversion

Two mechanically different options; pick by source quality.

**Primary (vector-exact): `paperjs-offset.offsetStroke()`**

```js
PaperOffset.offsetStroke(strokePath, strokeWidth / 2, {
  cap: 'round', join: 'round'
})
```

Produces a true outline of the stroked path as a new closed shape — no
rasterization, exact preservation of corners. Use when input `<path>` is clean
and uses a single `stroke-width`.

**Fallback (messy input, multi-element icons): `oslllo-svg-fixer`**

Uses potrace to rasterize then re-vectorize as a single filled path. Handles
`<rect>/<line>/<polygon>` mixed with stroked paths and **guarantees** single-path,
fill-only output that ICO/font pipelines need. v6.0.1 (Dec 2025) is 11× faster
than v2. Slightly lossy (potrace threshold) but monotonic, deterministic for a
given resolution.

**Also**: `makerjs.path.expand(pathContext, distance, joints)` — similar vector
expand, useful when the mark is already a Maker.js model.

---

### 3. Unify multiple paths into one (vtracer / ICO / font single-glyph input)

**Primary: `paper.js` — `PathItem.unite()` / `.resolveCrossings()`**

```js
const all = item.getItems({ class: paper.Path })
let merged = all[0]
for (const p of all.slice(1)) merged = merged.unite(p)
merged.resolveCrossings()
```

Known issues: `unite()` on compound paths can drop children when a sibling is
identical ([#923](https://github.com/paperjs/paper.js/issues/923)); partially
fixed in later commits. For defensive use, call `.unite()` pairwise, and always
`.resolveCrossings()` before emitting.

**Alternative: `makerjs.model.combineUnion`** — works on Maker.js models,
cleaner data model, but similar Bézier-edge-case limitations.

**Pre-step for either**: use `svg-flatten` (`.pathify()`) or `svgson` to
convert `<rect>/<circle>/<polygon>` into `<path>` first, then hand to CAG.

---

### 4. Deterministic recolor (palette swap)

**Primary: `svgson`** — parse to AST, walk nodes, rewrite `fill`/`stroke`/
`style` against a fixed `oldHex → newHex` map, stringify. Synchronous API
(`parseSync`) keeps the pipeline deterministic.

**Secondary: `@svgdotjs/svg.js` + `svgdom`** when the recolor is rule-based
("all `[data-token=bg]` get palette[0]") and you want `querySelectorAll`.

Avoid doing this at the CAG level — you lose structural metadata.

---

### 5. Symmetry enforcement (e.g., mirror, 180° rotate + union)

**Primary: `paper.js`** — `item.scale(-1, 1, pivot)` + `Path.unite()` to
fold + merge, or `item.rotate(180)` + union for radial marks.

Path-level libs (`svgpath`/`svg-path-commander`) can mirror coordinates but
can't **merge** the mirrored copies into one clean outline without CAG.

---

## Recommended Install Set (lean)

For the asset pipeline's SVG post-processing, install:

```
npm i @svgdotjs/svg.js svgdom svgson svg-path-commander paper paper-jsdom paperjs-offset oslllo-svg-fixer
```

- `@svgdotjs/svg.js` + `svgdom` — build + DOM queries in Node
- `svgson` — AST parse/stringify for recolor and attr rewrites
- `svg-path-commander` — modern TS path transforms + bbox / length / in-stroke queries
- `paper` + `paper-jsdom` + `paperjs-offset` — the only practical JS CAG;
  offset, offsetStroke, union/subtract
- `oslllo-svg-fixer` — stroke-to-fill via potrace for messy icons

Skip (for this project): `raphael.js` (dead), `simple-svg-tools` (deprecated),
`flatten-svg` (wrong output shape — polylines, not smooth SVG),
`svg-path-editor-lib` (interactive tool, not a library), `d3-shape` (generator,
not manipulator — only relevant if we also emit charts).

---

## Known Risks

1. **`paper-jsdom-canvas` is archived.** The Node shim `paper-jsdom` (pure
   SVG import/export, no canvas) still works; but if we ever need rasterization
   inside paper.js, that path is unmaintained. Rasterize with `sharp` or
   `@resvg/resvg-js` outside paper.js instead.
2. **Paper.js boolean ops have long-standing edge cases** on overlapping
   curves and identical children in compound paths. Always call
   `.resolveCrossings()` and validate output bbox before emitting.
3. **`svgson` is stale** (no release since Jul 2023) but has no known CVEs
   and 155K/wk downloads. If it breaks on modern Node, migrate to
   `xml2js` + a tiny adapter — do not block on it.
4. **`svg-path-commander` and `svgpath` overlap heavily.** Pick one:
   `svgpath` for speed/size, `svg-path-commander` for TS + geometry queries.
   Our pipeline benefits from the geometry queries → pick `svg-path-commander`.
5. **Polygon-only offset** (`@flatten-js/polygon-offset`) is not a
   substitute for curve-aware offset. It will silently work on flattened
   inputs and silently produce visible faceting.

---

## Sources

- npmjs.com/package/svg-path-commander — v2.2.1, Apr 2026, 35.4K/wk, TS
- npmjs.com/package/svgpath — v2.6.0, 543K/wk, MIT
- npmjs.com/package/svg-pathdata — v8.0.0, 6.9M/wk, MIT
- github.com/svgdotjs/svg.js and svgdotjs/svgdom — svgdom last update Jan 2026
- github.com/paperjs/paper.js — last release v0.12.15 (2021), v0.12.18 on npm, commits through Jul 2024
- github.com/paperjs/paper-jsdom-canvas — **archived** Mar 2021
- npmjs.com/package/paperjs-offset — `offset()` + `offsetStroke()`, MIT
- npmjs.com/package/makerjs — v0.19.2, Apache-2.0, 11K/wk, boolean combine + `path.expand` + outline
- github.com/elrumordelaluz/svgson — v5.3.1 Jul 2023, inactive but 155K/wk
- npmjs.com/package/@flatten-js/polygon-offset — v1.1.4, morphological offset
- npmjs.com/package/flatten-svg — v0.3.0, polyline flattener
- npmjs.com/package/svg-flatten — `<shape>`→`<path>` + group merge
- github.com/oslllo/svg-fixer — v6.0.1 Dec 2025, 11× faster, potrace retracer
- github.com/paperjs/paper.js issues #419, #443, #661, #923 — boolean op edge cases
- npmjs.com/package/simple-svg-tools — deprecated, migrate to @iconify/tools
- github.com/Yqnn/svg-path-editor — 5.1k stars, Angular app; `svg-path-editor-lib` v1.0.3 Sep 2025
