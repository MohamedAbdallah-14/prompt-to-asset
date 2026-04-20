# SVG Patterns & Gradients — Open-Source / Free Libraries

Research digest for use as OG-image backgrounds, brand-pattern wallpapers, hero
sections, and procedural decoration in `prompt-to-asset`.

**Research value: high** — Ecosystem is mature; the real decision is *pipeline*
(precomputed-SVG tarball vs. in-process programmatic generator vs. third-party
generator at build time). Licenses cluster into three buckets: public-domain /
MIT (safe to vendor), CC BY 4.0 (vendorable with attribution), and
free-with-attribution-or-pay (safe for our use but not for redistribution in a
competing template/gallery product).

---

## Recommendation at a glance

| Tier | Use for | Examples |
| --- | --- | --- |
| **Vendor the assets** (MIT / CC0 / CC BY) | Ship a handful of curated SVGs baked into the app | Hero Patterns, uiGradients, `svg-patterns` npm, `textures.js` |
| **Generate at build / runtime** (programmatic) | OG images, per-tenant brand wallpapers, deterministic decoration | `svg-patterns`, `textures`, `@mesh-gradient/core`, hand-rolled `feTurbulence` / stripe / dot generators |
| **Designer-time tool, export to repo** (free-with-attribution) | One-off hero illustrations, marketing site | Haikei, MagicPattern, BGJar, SVGBackgrounds.com, Pattern Monster, Shapes.so |

Prefer Tier 1 + Tier 2 for anything inside the product runtime (OG images,
per-user pattern wallpapers). Reserve Tier 3 for *designer output* that lands in
the repo as a frozen SVG — never as a live dependency on a third-party site.

---

## 1. Curated pattern galleries (download → inline SVG)

### Hero Patterns — <https://heropatterns.com/>
- **Creator:** Steve Schoger (not Steven Heller). Maintained alongside
  Heroicons / Zondicons.
- **License:** **CC BY 4.0** — free commercial use with attribution.
- **Delivery:** Browser picker → inline-SVG copy or download. No API, no npm
  package. ~90 tileable patterns.
- **Parametrization:** Foreground color, background color, foreground opacity
  — all set in the page UI and baked into the exported SVG. Each pattern is a
  repeating `<pattern>` whose geometry uses a single fill color, so recoloring
  post-export is a trivial `fill="#..."` find/replace.
- **Recolor pipeline:** download once → store in `assets/patterns/heropatterns/`
  with a placeholder like `fill="currentColor"` or a token
  `{{FG}}`/`{{BG}}`; stamp colors at render time. Because each pattern is a
  `<pattern>` tile, you can embed a single `<defs><pattern>` and fill any
  `<rect>` with `fill="url(#p)"`.

### Pattern Monster — <https://pattern.monster/>
- **License:** Royalty-free for personal + commercial, incl. apparel, print,
  branding (per site terms). No explicit SPDX license; treat as
  free-with-permission, **not** redistributable as a bundled pattern gallery.
- **Delivery:** Web generator → download SVG / copy CSS. Free tier + paid
  "pro" tier with more patterns.
- **Parametrization:** Colors, scale, spacing, stroke width, rotation —
  interactive.
- **Recolor pipeline:** Same as Hero Patterns (single-color `<pattern>` tiles),
  easy to tokenize post-export.

### SVGBackgrounds.com — <https://www.svgbackgrounds.com/>
- **License:** Free tier requires **attribution** (HTML credit link, social
  share, or paid subscription to drop attribution). Paid Pro ≈ $10–15/mo,
  redistribution requires separate Extended License (~$120/yr+).
- **Delivery:** Web picker → SVG/CSS export. Not an API/npm package.
- **Parametrization:** Color, shape variants; some patterns animate.
- **Fit for us:** Good for marketing-site hero backgrounds only. Do not embed
  in user-generated OG images without clearing attribution up-front.

### BGJar — <https://bgjar.com/>
- **License:** Site advertises "free"; no clear SPDX / CC license published.
  Treat as free-with-permission for use, not for redistribution.
- **Delivery:** Web generator, ~35 pattern categories (waves, blobs,
  animated shapes, circuit, hex, contour lines, etc.). SVG download.
- **Parametrization:** Shape, color, position, animation.
- **Fit for us:** Good browse-and-export tool; treat as one-off design output.

### MagicPattern — <https://www.magicpattern.design/tools>
- **License:** Free-with-signup; Pro tier for advanced exports. No
  redistribution license.
- **Delivery:** 20+ browser tools: geometric patterns, seamless patterns,
  mesh gradients, polka dots, grid patterns, blurry gradients, SVG waves,
  noise, dither, god rays, blob composition, doodles. Export SVG / PNG / CSS.
- **Parametrization:** Rich — scale, palette, complexity, noise, warp.
- **Fit for us:** Best-in-class designer tool for producing bespoke hero
  assets; export SVG into the repo.

### Shapes.so — <https://shapes.so/>
- **License:** Site is free; no explicit SPDX. Similar "free-with-permission"
  posture. Competes with Shape.so / TryShape (open source, MIT) — if
  open-source matters, prefer **TryShape**
  (<https://github.com/TryShape/tryshape>).
- **Delivery:** Web tool → SVG/PNG/CSS clip-path export.
- **Parametrization:** Shape corners, morph, blob control points.

### Haikei — <https://haikei.app/>
- **License:** Free for personal + commercial use; designs you create are
  yours. No signup required for Basic (15 generators).
- **Delivery:** Web app, exports SVG + PNG. Generators include: Layered
  Waves, Stacked Waves, Blob Scene, Low-Poly, Mesh Gradient,
  Stairs/Steps, Confetti, Bauhaus.
- **Parametrization:** Complexity, contrast, palette, seeded "randomize".
- **Fit for us:** The gradient/wave tool of choice — GetWaves was folded into
  Haikei. Export SVG into repo.

### GetWaves — <https://getwaves.io/>
- **Status:** Merged into Haikei; the standalone page still works but new
  features land in Haikei.
- **License / delivery / params:** Same posture as Haikei.
- **Fit:** Use Haikei instead.

---

## 2. Gradient palettes

### uiGradients — <https://uigradients.com/> · <https://github.com/ghosh/uiGradients>
- **License:** **MIT** (Indrashish Ghosh, 2017).
- **Delivery:** Static JSON of named gradients (`gradients.json`) in the repo
  — trivially vendorable. Each entry is a name + `colors` array.
- **Parametrization:** It's a palette list, not a generator; use the named
  gradients as seed colors for CSS or SVG `<linearGradient>` /
  `<radialGradient>` / mesh gradients.
- **Recolor pipeline:** Copy `gradients.json` into the repo, map to a typed
  token set (`gradient.sunset`, `gradient.aqua`, …), interpolate / rotate /
  reverse angles at render time.

### CSS Gradient (cssgradient.io) — <https://cssgradient.io/>
- **License:** Tool itself is not OSS; the gradients you build with it are
  yours to use. Good for picking 2-stop / 3-stop gradients, not a library to
  depend on.
- **Alternative MIT gradient builders:** `TurboRx/CSS-Gradient-Generator` (MIT,
  GitHub) and various open-source builders are embeddable if we ever want an
  in-product gradient editor.

### Mesh gradients (SVG/WebGL)
- **`@mesh-gradient/core`** (npm) — zero-dep, ~8 KB gzip, **MIT**, WebGL-based
  animated mesh gradient. Has `@mesh-gradient/react` wrapper.
- **`mesh-gradient-ts`** — TS, Canvas-based, MIT.
- **`mesh-gradient.js`** (anup-a) — tiny vanilla JS, 4-color mesh, MIT.
- **MagicPattern SVG Mesh Gradient Generator** — web tool; exports pure SVG
  mesh gradients (stops + `<feTurbulence>` noise). Free, with-attribution
  posture.
- **Recolor pipeline:** For WebGL/Canvas variants, pass an array of 4+ colors
  (tokenized from uiGradients or brand). For exported SVG meshes, the file is
  a chain of `<radialGradient>` / `<filter>` — recolor by replacing the
  `stop-color` attributes.

---

## 3. Programmatic pattern libraries (npm, vendorable)

### `svg-patterns` — <https://www.npmjs.com/package/svg-patterns>
- **License:** **ISC** (≈ MIT). 19 KB, framework-agnostic (returns virtual-DOM
  nodes you can stringify).
- **Styles included:** `lines`, `circles`, `crosses`, `caps`, `hexagons`,
  `nylon`, `rhombic`, `rhombic3d`, `squares`, `waves`, `woven`.
- **Parametrization:** Per-style options — `size`, `fill`, `strokeWidth`,
  `stroke`, `background`, `orientations`. You pass colors directly, so it's a
  native fit for token-driven theming.
- **Pipeline:** Import only the style you need (`require('svg-patterns/p/lines')`)
  → call with color tokens → `<defs>{pattern}</defs>` + `<rect fill={pattern.url()}>`.
  Produces small, hand-rolled SVG — ideal for OG-image backgrounds.
- **Caveat:** Depends on `virtual-dom` + `virtual-dom-stringify`. Minor, but if
  we want zero deps, fork the few-hundred-LOC modules.

### `textures` (textures.js) — <http://riccardoscalco.github.io/textures/>
- **License:** **MIT**. 216 KB + 8 KB (drags in D3).
- **Styles:** Lines, circles, paths (hexagons, crosses, caps, woven, waves,
  nylon, squares), plus user-supplied custom paths.
- **Fit for us:** Only worth it if we're already using D3. Otherwise
  `svg-patterns` dominates on size.

### `@patternfly/patternfly` (npm)
- **License:** **MIT** (Red Hat's PatternFly design system).
- **What it is:** A **design system** (CSS + SASS) with a component set, not a
  pattern/gradient library. The "patterns" in the name refer to UI patterns
  (modals, wizards, etc.), not SVG texture patterns. Misleading for this
  project — skip unless we want the whole design system.
- **Companion:** `@patternfly/icons` — ~3,500 SVG icons (covered in 09).

### `pattern-io`
- **Status:** **No such npm package exists** under that name. Closest matches
  are `@patternfly/patternfly`, `svg-patterns`, `pattern.css`, and
  `patternomaly` (Chart.js pattern fills, MIT). Likely the brief confused this
  with one of those — recommend `svg-patterns` + `textures` as the
  programmatic picks.

---

## 4. Tiny algorithmic generators worth embedding

These are small enough (<< 200 LOC each) to write and own in-repo as
permalinked utilities, and they give us deterministic, token-driven SVG
decoration without a third-party dependency.

### Deterministic SVG noise (feTurbulence)
- **Mechanism:** Native SVG filter primitive. Accepts `baseFrequency`,
  `numOctaves`, `seed`, `type` (`fractalNoise` | `turbulence`). `seed` makes
  noise reproducible across renders — crucial for cacheable OG images.
- **Pattern:**
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="42"/></filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.15"/>
  </svg>
  ```
- **Recolor:** Layer a solid `<rect fill="brand">` underneath, put the noise
  `<rect>` on top with `mix-blend-mode="overlay"` or a low opacity.
- **Cost:** ~0 bytes of JS; all browsers since 2015.

### Stripes (45°, 90°, crosshatch)
- **Mechanism:** `<pattern>` with one or two `<line>` or `<rect>` children;
  `patternTransform="rotate(45)"` handles diagonal. Parameters: spacing,
  width, angle, color, background.
- **Permalink:** `/api/pattern/stripes.svg?c=...&bg=...&w=2&gap=12&angle=45`.

### Dots (grid, jittered, halftone)
- **Mechanism:** `<pattern>` with a single `<circle>`; parametrize radius,
  pitch, color. For halftone, scale radius by a deterministic 2D hash of the
  cell (`sin(x*12.9898 + y*78.233)`) to produce a gradient-modulated dot grid
  without `<feTurbulence>`.

### Grid / graph paper
- **Mechanism:** Nested `<pattern>` — fine grid at e.g. 8 px, bold grid at
  80 px, both stroking a rect. Parametrize line color, bg color, pitch.

### Stacked waves (deterministic)
- **Mechanism:** Sample `y = A*sin(f*x + phase)` over a seeded RNG, emit a
  single `<path d="M …">`. Stack 3–5 semi-transparent paths with shifted
  phase / amplitude for the "Haikei look" without the dependency.

### Low-poly / Voronoi / blob
- **Mechanism:** For low-poly, jitter a grid and emit Delaunay triangles
  (`delaunator` — MIT, tiny). For blobs, 8–12 polar control points with
  Catmull-Rom smoothing — see `svg-path-generator` or hand-roll (~40 LOC).

### Recipe: shared permalinked utility surface
- Expose each generator as `GET /api/pattern/<kind>.svg?...` with a fixed
  query schema (`fg`, `bg`, `scale`, `seed`, `w`, `h`, plus kind-specific
  params). Cache by full querystring — same inputs → byte-identical SVG.
- All colors accept brand tokens resolved server-side, so theming is a matter
  of passing the token name rather than a hex.

---

## Recolor pipeline (shared)

All the inline-SVG libraries above converge on one pattern for theming:

1. **Normalize on import.** Rewrite every `fill=`, `stroke=`, and
   `stop-color=` to either `currentColor` or a placeholder token
   (`{{fg}}`, `{{bg}}`, `{{accent}}`).
2. **Stamp at render time.** For server-side OG images, string-substitute
   tokens; for client-side, inject `style="color:…"` on the parent and rely
   on `currentColor`, or render via React/JSX with prop-driven fills.
3. **Seed + cache.** Always include a `seed` param; make the full param set
   the cache key. OG images and brand wallpapers can then be strongly
   cached at the CDN.

---

## Licensing summary

| Source | License | Redistribute in a template/gallery product? |
| --- | --- | --- |
| Hero Patterns | CC BY 4.0 | Yes, with attribution |
| uiGradients | MIT | Yes |
| `svg-patterns` | ISC | Yes |
| `textures.js` | MIT | Yes |
| `@mesh-gradient/*` | MIT | Yes |
| `@patternfly/patternfly` | MIT | Yes (but wrong tool) |
| Pattern Monster | Free w/ permission | **No** (use, not bundle) |
| SVGBackgrounds.com | Free + attribution (or paid) | **No** w/o Extended License |
| BGJar / MagicPattern / Haikei / Shapes.so | Free, no explicit SPDX | **No** — use outputs, don't redistribute as a gallery |

Internal rule of thumb: **vendor MIT/ISC/CC-BY sources; render third-party
generator outputs as one-off assets in the repo; never live-fetch a third-party
generator at runtime.**

---

## Sources

- <https://heropatterns.com/> — Hero Patterns home; authorship & scope.
- <https://pott.dev/licenses> — third-party license list confirming Hero Patterns CC BY 4.0.
- <https://pattern.monster/features> — Pattern Monster feature / licensing posture.
- <https://www.svgbackgrounds.com/license> — SVGBackgrounds free + attribution / Extended License tiers.
- <https://haikei.app/> · <https://haikei.app/pricing/> — Haikei free scope and generator list.
- <https://getwaves.io/> — GetWaves (now folded into Haikei).
- <https://bgjar.com/> — BGJar category list.
- <https://www.magicpattern.design/tools> — MagicPattern tool index.
- <https://github.com/ghosh/uiGradients/blob/master/LICENSE.md> — uiGradients MIT.
- <https://www.npmjs.com/package/svg-patterns> — `svg-patterns` ISC, styles, API.
- <http://riccardoscalco.github.io/textures/> — textures.js reference.
- <https://www.npmjs.com/package/@mesh-gradient/core> — mesh-gradient WebGL lib.
- <https://www.npmjs.com/package/@patternfly/patternfly> — PatternFly (design system, not SVG patterns).
- <https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence> — native deterministic noise + `seed`.
