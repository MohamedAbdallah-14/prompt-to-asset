# SVG Optimization & Cleanup Tools — Research Digest

**Research value: high** — Mature, well-documented tooling; clear winner for the pipeline with a handful of real gotchas to encode in config.

Post-vectorization, SVGs need normalization (single root, valid `viewBox`, minified paths, safe ids, no editor metadata) before shipping as logo-grade assets. This digest covers the tools worth integrating into `prompt-to-asset`, their trade-offs, and a recommended SVGO config tuned for logo output.

---

## Tool matrix

| Tool | Repo | License | Lang | Surface | Status (2026) |
|---|---|---|---|---|---|
| **SVGO** | [svg/svgo](https://github.com/svg/svgo) | MIT | Node.js | CLI + JS API | Actively maintained; de-facto standard (~22k★) |
| **svgcleaner** | [RazrFalcon/svgcleaner](https://github.com/RazrFalcon/svgcleaner) | GPL-2.0 | Rust | CLI | **Archived Oct 2021**; do not adopt |
| **scour** | [scour-project/scour](https://github.com/scour-project/scour) | Apache-2.0 | Python | CLI + lib | Maintained (last update 2024); used by Inkscape export |
| **@svgdotjs/svg.js** | [svgdotjs/svg.js](https://github.com/svgdotjs/svg.js) | MIT | JS | Browser lib (needs `svgdom` for Node) | Active; for *rendering/animating*, not optimizing |
| **svgson** | [elrumordelaluz/svgson](https://github.com/elrumordelaluz/svgson) | MIT | JS | Node lib | Active; parse/stringify SVG ↔ JSON AST |
| **svg-path-commander** | [thednp/svg-path-commander](https://github.com/thednp/svg-path-commander) | MIT | JS/TS | Node + browser lib | Active; path-d parse/normalize/transform |
| **svg-path-editor** | [Yqnn/svg-path-editor](https://github.com/Yqnn/svg-path-editor) | MIT | Web app | UI | Useful as a human inspector; not a pipeline dep |
| **@svgr/plugin-prettier** | [gregberge/svgr](https://github.com/gregberge/svgr/tree/main/packages/plugin-prettier) | MIT | JS | SVGR plugin | Active; only useful if already on SVGR |
| Prettier XML/SVG | [prettier#5322](https://github.com/prettier/prettier/issues/5322) | — | — | — | No native SVG formatter in core as of 2026 |

### Picks

1. **SVGO** is the primary optimizer. CLI for batch jobs, JS API (`optimize(svgString, config)`) for the in-process pipeline.
2. **svgson** for any programmatic manipulation SVGO can't do declaratively (forcing a single `<svg>` root, rewriting ids deterministically, stamping `<title>`/`<desc>` from metadata).
3. **svg-path-commander** if we need geometric path work (normalize to absolute commands, apply transforms, reverse, round to N decimals) beyond what SVGO's `convertPathData` offers.
4. Skip `svgcleaner` (abandoned, GPL-2.0 is a non-starter for a JS library anyway) and `scour` (Python dep we don't need; SVGO supersedes its feature set).
5. Skip `@svgdotjs/svg.js` — it's for drawing/animating SVG, not optimization; pulling in `svgdom` for Node is overhead for no benefit here.

---

## SVGO in detail

### Why it's the default

- ~22k★, MIT, actively maintained, v4 ships sane accessibility defaults (no longer strips `viewBox`, `<title>`, `<desc>`).
- Plugin architecture — `preset-default` gives ~30 safe transforms; additional plugins (`prefixIds`, `removeXMLNS`, `removeDimensions`, `reusePaths`) opt-in.
- Both CLI (`npx svgo --config svgo.config.mjs in.svg -o out.svg`) and programmatic API (`import { optimize } from 'svgo'`).

### Known issues to guard against

- **`collapseGroups` breaks animations** — when a `<g>` wraps `<animate>`/`<animateTransform>` and children, flattening detaches the animation from its targets. [svg/svgo#214](https://github.com/svg/svgo/issues/214). Mitigation: disable `collapseGroups` if the source has any animation elements, or detect and skip.
- **`collapseGroups` + nested `<svg>`** — transforms from a parent `<g>` get pushed onto a child `<svg>`, which is invalid and breaks rendering. [svg/svgo#1057](https://github.com/svg/svgo/issues/1057).
- **`collapseGroups` non-atomic attribute moves** — fixed Jan 2024 ([svg/svgo#1928](https://github.com/svg/svgo/issues/1928)); just pin to a recent SVGO version.
- **`prefixIds` breaks `<defs>` ↔ `<use>` references** in some edge cases ([svg/svgo#913](https://github.com/svg/svgo/issues/913)), and can double-prefix on re-runs if output is fed back in (fixed in v2.6+, but input still matters — [#1499](https://github.com/svg/svgo/issues/1499)).
- **v3 renamed `cleanupIDs` → `cleanupIds`** and moved the `prefix` param to a dedicated `prefixIds` plugin — don't copy old configs blindly. [migration notes](https://svgo.dev/docs/migrations/migration-from-v2-to-v3/).
- **v4 accessibility defaults**: `removeViewBox`, `removeTitle`, `removeDesc` are now **off by default**. You no longer need to override them, but being explicit is defensive.

### Recommended SVGO config (logo-grade)

Goals: preserve `viewBox`, keep `<title>`/`<desc>`, flatten groups safely, strip comments/metadata/editor junk, stable id handling, no heuristic rounding that visibly deforms small glyphs.

```js
// svgo.config.mjs
export default {
  multipass: true,
  js2svg: {
    indent: 2,
    pretty: false, // flip to true for debugging; ship minified
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          removeTitle: false,
          removeDesc: false,
          removeHiddenElems: { displayNone: true, opacity0: false },
          cleanupIds: { remove: true, minify: true, preserve: [], preservePrefixes: [] },
          convertPathData: {
            floatPrecision: 3,
            transformPrecision: 5,
            forceAbsolutePath: false,
            removeUseless: true,
          },
          mergePaths: { force: false, floatPrecision: 3 },
          collapseGroups: false, // re-enable only for static, non-animated SVGs
          inlineStyles: { onlyMatchedOnce: false },
          convertColors: { currentColor: false, names2hex: true, rgb2hex: true, shorthex: true },
        },
      },
    },
    'removeXMLNS',        // drop only if inlining into HTML; keep for standalone .svg files
    'removeDimensions',   // strip width/height so viewBox drives sizing
    'reusePaths',         // dedupe identical <path d="..."> via <use>
    'sortAttrs',
    {
      name: 'removeAttrs',
      params: {
        attrs: [
          'data-name',
          'class:cls-.*',                         // Illustrator/Sketch auto-classes
          'xmlns:(sketch|figma|adobe|xlink-ns)',  // editor namespaces
        ],
      },
    },
  ],
};
```

Notes on the knobs:

- `multipass: true` — lets dependent plugins settle after earlier ones mutate the tree (esp. `cleanupIds` after `removeUselessDefs`).
- `removeXMLNS` — include **only** when SVGs are inlined into HTML. For standalone `.svg` files, drop this plugin; the `xmlns` is required.
- `collapseGroups: false` — default off for safety. Flip to `true` via a per-asset override once the asset is confirmed to have no `<animate*>` / no nested `<svg>` / no CSS selectors depending on group structure.
- `floatPrecision: 3` is a safe default for logo-scale artwork; drop to `2` for very simple shapes, bump to `4` if curves visibly shift at high zoom.
- Add `prefixIds` (after `preset-default`) **only** when multiple SVGs are inlined into a single document to avoid id collisions. Use a stable, filename-based prefix — random/uuid prefixes cause SSR hydration mismatches.

### CLI

```bash
npx svgo --config svgo.config.mjs -r -f ./assets -o ./assets-optimized
```

### Library

```js
import { optimize } from 'svgo';
import config from './svgo.config.mjs';

const { data: optimizedSvg } = optimize(rawSvg, { path: filename, ...config });
```

Performance: SVGO processes typical logo SVGs in single-digit ms each; the JS API is happy to run in a worker or inline in a build step.

---

## Complementary tools

### svgson — structural normalization

Use for the things SVGO won't do declaratively:

- Guarantee a single `<svg>` root (reject or wrap multi-root output from vectorizers).
- Rewrite ids deterministically from a hash of the file + position (stable across rebuilds, collision-free).
- Inject/overwrite `<title>` and `<desc>` from our own metadata rather than relying on whatever the vectorizer emitted.

```js
import { parse, stringify } from 'svgson';
const ast = await parse(svgString);
// walk, mutate, stamp title/desc, rewrite ids...
const normalized = stringify(ast);
```

Cheap (~155k weekly downloads, MIT, both `parse` and `parseSync`).

### svg-path-commander — path-level surgery

Use if/when we need more than SVGO's `convertPathData` offers:

- Normalize all commands to absolute (`M`/`L`/`C`/...) for deterministic diffs.
- Apply a transform matrix into the `d` string (bake-in transforms so `collapseGroups` becomes safe).
- Reverse path direction (sometimes needed for fill-rule fixes post-vectorization).

### svg-path-editor

Browser UI — useful for humans debugging a single path, not part of the pipeline.

### Formatting

There is no mature SVG formatter in Prettier core (still [prettier#5322](https://github.com/prettier/prettier/issues/5322) as of 2026). Options:

- Let SVGO's `js2svg.pretty: true` handle it for debug output.
- `@svgr/plugin-prettier` only makes sense if we're already using SVGR for React component generation.
- For ad-hoc pretty-printing: `svgson.parse()` → walk → `svgson.stringify()` with your own indenter is 30 lines and avoids a Prettier fork.

---

## Recommended pipeline for `prompt-to-asset`

```
raw SVG (from vectorizer)
  └─▶ svgson parse
       └─▶ structural fixes (single root, stamp <title>/<desc>, rewrite ids)
            └─▶ stringify
                 └─▶ SVGO.optimize(config above)   // multipass=true
                      └─▶ optionally svg-path-commander for path normalization
                           └─▶ final SVG
```

Keep `collapseGroups` gated behind a "has no `<animate*>` and no nested `<svg>`" check — this one plugin causes the majority of observed SVGO-introduced regressions.

---

## Sources

- [svg/svgo](https://github.com/svg/svgo) — repo, README, plugin list.
- [SVGO · Preset Default](https://svgo.dev/docs/preset-default) — plugin ordering and override semantics.
- [SVGO · Plugins](https://svgo.dev/docs/plugins) — full plugin catalog.
- [SVGO · Migration v2→v3](https://svgo.dev/docs/migrations/migration-from-v2-to-v3/) — `cleanupIds`/`prefixIds` split.
- [svg/svgo#214](https://github.com/svg/svgo/issues/214) — `collapseGroups` breaks animations.
- [svg/svgo#1057](https://github.com/svg/svgo/issues/1057) — `collapseGroups` corrupts nested `<svg>`.
- [svg/svgo#1928](https://github.com/svg/svgo/issues/1928) — non-atomic attribute moves (fixed).
- [svg/svgo#913](https://github.com/svg/svgo/issues/913), [#1499](https://github.com/svg/svgo/issues/1499) — `prefixIds` edge cases.
- [SVGO · prefixIds](https://svgo.dev/docs/plugins/prefixIds/) — id-collision prevention, SSR caveats.
- David Bushell, "SVG Optimization and Accessibility Basics" (2025) — context on v4 default changes.
- [RazrFalcon/svgcleaner](https://github.com/RazrFalcon/svgcleaner) — archived status confirmation.
- [scour-project/scour](https://github.com/scour-project/scour) — license/status.
- [elrumordelaluz/svgson](https://github.com/elrumordelaluz/svgson) — API, AST shape.
- [thednp/svg-path-commander](https://github.com/thednp/svg-path-commander) — license, capabilities.
- [svgdotjs/svg.js#352](https://github.com/svgdotjs/svg.js/issues/352), [svgdotjs/svgdom](https://github.com/svgdotjs/svgdom) — Node usage caveats.
- [@svgr/plugin-prettier](https://www.npmjs.com/package/@svgr/plugin-prettier) — the only real "Prettier for SVG" plugin.
