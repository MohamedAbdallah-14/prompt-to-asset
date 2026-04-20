# Raster-to-SVG Vectorization Tools — External Research

> Research digest for the `prompt-to-asset` MCP server, which generates logos, icons,
> and illustrations as rasters and needs a clean SVG conversion step before returning
> assets to callers.
>
> Scope: open-source tools only. Focus on CLI/programmatic use from Node/Python,
> output cleanliness (SVGO-friendly), and quality on three asset classes:
> **flat-color logos**, **stylized illustrations**, **flat icons**.
>
> Last updated: 2026-04. All external sources cited at the bottom.

---

## 1. Landscape at a glance

Open-source vectorization splits into three families:

1. **Curve-tracing vectorizers** — classical boundary-tracing algorithms. Fast,
   deterministic, output is clean `<path>` geometry. Best for logos, icons, and
   stylized illustrations. Representative: **vtracer**, **potrace**, **autotrace**,
   **imagetracerjs**.
2. **Stylized / artistic rasterizers** — reconstruct an image from geometric
   primitives for artistic effect, not faithful reproduction. Representative:
   **primitive**.
3. **Neural / differentiable vectorizers** — optimize vector parameters against a
   differentiable renderer. State-of-the-art quality ceiling, but heavy compute,
   research-grade tooling. Representative: **DiffVG**, **LIVE**, **Im2Vec**.

For an MCP server that needs to vectorize freshly generated assets on demand, the
curve-tracing family is the only realistic default. The neural family is worth
knowing about but not worth shipping as a synchronous step.

---

## 2. Comparison table

| Tool | Language / runtime | License | CLI | Prog. API | Maintenance | Best at | SVG cleanliness |
|---|---|---|---|---|---|---|---|
| **vtracer** | Rust (native + WASM) | MIT | Yes | Rust crate; `vtracer-wasm` (WASM); `@neplex/vectorizer` (native Node binding) | Active; ~5.7k★; last release `webapp.2024.5` | Full-color flat logos, stylized illos | Very clean, compact `<path>` output, `poster`/`photo`/`bw` presets, SVGO-friendly |
| **potrace** | C (native) | GPL-2.0 | Yes (`potrace`, `mkbitmap`) | Many wrappers: `potrace` npm (GPL-2.0), `oslllo-potrace`, Python `pypotrace` | Mature / stable; underlying algo is the industry default for B/W tracing | Black-and-white line art, monochrome icons, scanned marks | Very clean Bézier output; needs color-separation wrapper for multi-color |
| **autotrace** | C (native) | GPL-2.0 | Yes (`autotrace`) | C lib + Python bindings | Active as of 2026; v0.31.10 (Jan 2024), recent pushes | Outline and **centerline** tracing of line art (only mainstream OSS centerline option) | Clean but paths tend to be chattier than potrace/vtracer; run SVGO after |
| **SVGcode** | TS + WASM (browser PWA) | Apache-2.0 | No (PWA) | Browser only; wraps potrace-wasm | Actively maintained by Thomas Steiner (Chrome DevRel) | Designer-facing PWA; not a headless server dep | Mirrors potrace output; UI adds posterize + despeckle |
| **imagetracerjs** | Pure JS (browser + Node) | Public Domain / Unlicense | `node nodecli …` | `ImageTracer.imagedataToSVG(...)` | Mature, slow release cadence; 40k+ weekly dl | Zero-dep JS fallback; posterized/curvy presets | Decent for flat color; output paths slightly verbose, use SVGO |
| **primitive** | Go (native) | MIT | Yes (`primitive`) | Go lib | Stable, low activity | Artistic "reproduce with N triangles/ellipses" effect | Valid SVG but intentionally not-a-vectorization — don't use to clean up logos |
| **DiffVG** | Python + C++/CUDA | Apache-2.0 | No (research code) | Python | Research-grade; last commits May 2025 | Differentiable rendering backend for neural vectorization | N/A — outputs depend on the method built on top |
| **LIVE** | Python (on DiffVG) | Apache-2.0 (via DiffVG) | Script | Python | Research; CVPR 2022 | Layer-wise image vectorization, fewer paths than DiffVG | Clean layered paths when it converges; ~hours per image at 2K |
| **Im2Vec** | Python | Research code | No | Research | Paper/code, not a product | Generating vector graphics without vector supervision | N/A for on-the-fly conversion |
| **delineate** | Java GUI (wraps potrace/autotrace) | GPL | No (GUI) | N/A | Dormant (v0.5 is latest) | End-user GUI on top of potrace/autotrace | Depends on backend chosen |
| **mkbitmap** | C (native, ships with potrace) | GPL-2.0 | Yes | N/A | Same cadence as potrace | Preprocessing (highpass + scale + threshold) before potrace | N/A — preprocessor only |

Notes on maintenance: "active" means commits/releases within the last ~12 months on
the upstream repo.

---

## 3. Tool deep-dives

### 3.1 vtracer — visioncortex (recommended default)

- **Repo**: https://github.com/visioncortex/vtracer  ·  **License**: MIT
- **Native CLI** (`cargo install vtracer`):
  ```bash
  vtracer --input logo.png --output logo.svg \
          --colormode color \
          --preset poster \
          --filter_speckle 4 \
          --color_precision 6 \
          --mode spline \
          --corner_threshold 60 \
          --segment_length 4 \
          --splice_threshold 45 \
          --path_precision 3
  ```
- **Presets**: `bw`, `poster` (flat art), `photo`.
- **Node integration**:
  - `@neplex/vectorizer` (native N-API binding, fast, production-oriented):
    ```ts
    import { vectorize, ColorMode, Hierarchical, PathSimplifyMode } from '@neplex/vectorizer';
    import { readFile, writeFile } from 'node:fs/promises';

    const svg = await vectorize(await readFile('logo.png'), {
      colorMode: ColorMode.Color,
      hierarchical: Hierarchical.Stacked,
      filterSpeckle: 4,
      colorPrecision: 6,
      layerDifference: 16,
      mode: PathSimplifyMode.Spline,
      cornerThreshold: 60,
      lengthThreshold: 4.0,
      spliceThreshold: 45,
      pathPrecision: 3,
    });
    await writeFile('logo.svg', svg);
    ```
  - `vtracer-wasm` (official WASM build, portable, ~134 KB wasm).
- **Quality**: best OSS option for flat-color logos and stylized illustrations.
  Hierarchical color clustering means you get one stacked `<path>` per color layer,
  which survives SVGO's `mergePaths` / `convertPathData` cleanly. O(n) algorithm, so
  100–1000× faster than potrace on large canvases.
- **Weakness**: on photo-like inputs it will over-segment; use the `photo` preset
  and raise `filter_speckle`, or (better) do not vectorize photos.
- There is a community `vtracer_autotune` (`olivierroy/vtracer_autotune`) that
  sweeps parameters and picks the best by SSIM — useful if you want a one-shot
  "just make it look right" wrapper.

### 3.2 potrace (+ mkbitmap)

- **Repo / site**: https://potrace.sourceforge.net/  ·  **License**: GPL-2.0
- **Strength**: the gold standard for B/W Bézier tracing; output is unreasonably
  clean. Inkscape's "Trace Bitmap" is literally potrace.
- **Weakness**: single-color only. To trace a full-color asset you must color-
  quantize and run potrace per color layer — this is what SVGcode and imagetracerjs
  do under the hood.
- **Node wrappers**: `potrace` (npm, `tooolbox/node-potrace`, GPL-2.0, 55k weekly),
  `oslllo-potrace`. **Licensing caveat**: both wrappers inherit GPL-2.0. If the
  MCP server ships as a library linked to GPL code, that's a distribution concern.
  A WASM build (e.g. the one SVGcode uses) keeps it as a runtime dependency, not a
  static link, which is usually the cleaner path.
- **Invocation**:
  ```bash
  mkbitmap -f 4 -s 2 -t 0.48 input.pgm -o pre.pbm   # preprocess
  potrace pre.pbm -s -o out.svg                      # -s = SVG output
  ```
- **Use in this project**: reach for it only for monochrome marks and line art
  (single-color wordmarks, stamp-style icons).

### 3.3 autotrace

- **Repo**: https://github.com/autotrace/autotrace  ·  **License**: GPL-2.0
- **Strength**: the only mainstream OSS option for **centerline** tracing
  (`autotrace -centerline`) — matters for thin-stroke icons and logos where you
  want a single stroked path rather than a filled outline around it.
- **Weakness**: output paths are less tidy than potrace/vtracer; SVGO pass
  mandatory.
- **Invocation**:
  ```bash
  autotrace -output-file out.svg -output-format svg -centerline input.png
  ```

### 3.4 imagetracerjs

- **Repo**: https://github.com/jankovicsandras/imagetracerjs  ·  **License**: Public
  domain (Unlicense) — most permissive of the lot.
- **Strength**: pure JS, zero deps, works in browser and Node. Good "last-resort
  fallback" if the native/WASM toolchain isn't available.
- **Presets**: `posterized1`, `posterized2`, `curvy`, `sharp`, `detailed`,
  `smoothed`, `grayscale`.
- **Invocation**:
  ```js
  import ImageTracer from 'imagetracerjs';
  const svg = ImageTracer.imagedataToSVG(imageData, 'posterized2');
  ```
- **Weakness**: significantly slower than vtracer; quality is behind vtracer on
  the same input.

### 3.5 SVGcode (GoogleChromeLabs-adjacent)

- Built by Thomas Steiner (Google); repo: https://github.com/tomayac/SVGcode
- A PWA, not a library. It's relevant as a reference implementation of
  "potrace-in-WASM + posterize + despeckle UI," not as a dep.

### 3.6 primitive (fogleman)

- **Repo**: https://github.com/fogleman/primitive  ·  **License**: MIT
- It does **not vectorize** — it reconstructs an image from N triangles/ellipses/
  beziers, producing SVG as one of several output formats. Use it for an "artistic
  low-poly" stylization endpoint, not as a clean-up step on a generated logo.
- **Invocation**:
  ```bash
  primitive -i in.png -o out.svg -n 200 -m 1     # 200 triangles
  ```

### 3.7 DiffVG / LIVE / Im2Vec (neural/differentiable)

- **DiffVG**: https://github.com/BachiLi/diffvg  ·  Apache-2.0. Differentiable
  rasterizer, the substrate for most neural vectorization research.
- **LIVE**: https://github.com/ma-xu/LIVE  ·  Apache-2.0. Layer-wise optimization
  on top of DiffVG; ~5 paths where DiffVG uses 256, but reported ~5 hours per 2K
  image.
- **Im2Vec**: research code; synthesizes vector graphics without vector
  supervision.
- **Recraft-style neural vectorization**: there is **no OSS equivalent** that is
  production-ready in 2026. The commonly cited "open-source alternative" stack is
  just *generate with a diffusion model → trace with vtracer/potrace* — exactly
  what this project is already doing. Treat the neural vectorizers as research
  references, not dependencies.

### 3.8 delineate

- Java GUI wrapper over potrace/autotrace. Dormant (last release 0.5). Not useful
  as a programmatic dep; listed for completeness.

---

## 4. SVGO compatibility

All of the curve-tracing tools above produce SVGs that clean up well with SVGO's
`preset-default`. Practical guidance:

- **vtracer**: already near-minimal. Useful extra plugins:
  `convertPathData`, `mergePaths`, `removeDimensions` (keep `viewBox`),
  `cleanupIds`. Keep `path_precision` at 2–3 at trace time; don't rely on SVGO
  for that.
- **potrace**: already minimal. Main SVGO wins are `removeMetadata`,
  `removeDesc`, `cleanupNumericValues`.
- **autotrace**: more aggressive SVGO config warranted — `mergePaths`,
  `convertShapeToPath`, `convertPathData` with `floatPrecision: 2`.
- **imagetracerjs**: set option `roundcoords: 1` (or `2`) at trace time; then run
  SVGO with `mergePaths` on.

Recommended pipeline:

```
raster (PNG/JPG)  →  [optional: mkbitmap or posterize]  →  vtracer / potrace
                 →  SVGO (preset-default + mergePaths)  →  final .svg
```

---

## 5. Sample invocations (copy/paste ready)

Flat-color logo (generated PNG → clean SVG):

```bash
vtracer --input gen/logo.png --output out/logo.svg \
        --colormode color --preset poster \
        --filter_speckle 4 --color_precision 6 --path_precision 3
npx svgo out/logo.svg
```

Monochrome wordmark via potrace (via the `potrace` npm wrapper):

```ts
import potrace from 'potrace';
import { readFileSync, writeFileSync } from 'node:fs';

potrace.trace(readFileSync('gen/mark.png'), {
  threshold: 180, turdSize: 2, optTolerance: 0.4, color: '#111',
}, (err, svg) => { if (err) throw err; writeFileSync('out/mark.svg', svg); });
```

Stroked-line icon via autotrace (centerline):

```bash
autotrace -centerline -output-format svg \
          -output-file out/icon.svg \
          -color-count 2 -despeckle-level 4 gen/icon.png
npx svgo out/icon.svg
```

Stylized "low-poly" illustration via primitive:

```bash
primitive -i gen/illo.png -o out/illo.svg -n 250 -m 1 -r 256
```

Node-native vectorization without spawning a binary (vtracer via N-API):

```ts
import { vectorize, ColorMode, PathSimplifyMode } from '@neplex/vectorizer';
import { readFile, writeFile } from 'node:fs/promises';
import { optimize } from 'svgo';

const png = await readFile('gen/logo.png');
const raw = await vectorize(png, {
  colorMode: ColorMode.Color, filterSpeckle: 4, colorPrecision: 6,
  mode: PathSimplifyMode.Spline, pathPrecision: 3,
});
const { data } = optimize(raw, { multipass: true });
await writeFile('out/logo.svg', data);
```

---

## 6. Recommended picks per asset type

| Asset type | Primary | Fallback / edge cases |
|---|---|---|
| **Flat-color logo** (≤16 distinct colors, crisp edges) | **vtracer** (`preset=poster`, `color_precision=6`, `filter_speckle=4`) | imagetracerjs `posterized2` if native binary is unavailable |
| **Monochrome wordmark / stamp mark** | **potrace** (via WASM wrapper to avoid GPL linkage) after `mkbitmap` preprocess | vtracer `preset=bw` |
| **Flat icon (filled)** | **vtracer** `preset=poster`, low `filter_speckle` (1–2) to keep tiny details | potrace if the icon is strictly monochrome |
| **Flat icon (stroke / centerline)** | **autotrace `-centerline`** | vtracer + post-process `fill`→`stroke` (lossy) |
| **Stylized illustration** (generated hero image, limited palette) | **vtracer** `preset=poster` with higher `color_precision` (7–8) and `gradient_step` tuned to palette | imagetracerjs `curvy` preset |
| **Photo-realistic illustration** | **Don't vectorize.** Return raster. If caller insists on SVG, use vtracer `preset=photo` with aggressive `filter_speckle`, accept large file size | primitive for an artistic approximation |
| **"Artistic low-poly" effect (intentional)** | **primitive** | — |
| **Research / highest-fidelity offline conversion** | **LIVE** on **DiffVG** (not for the request path; batch job only) | — |

**Default for this MCP server**: ship with `@neplex/vectorizer` (vtracer, native
N-API) as the in-process path, fall back to spawning the `vtracer` binary if the
native binding isn't loadable, and always post-process with SVGO. Gate the
`potrace` path behind a B/W-detection heuristic so you only incur its GPL
dependency when the asset is actually monochrome — or use the WASM build to sidestep
the linkage question.

---

## 7. Sources

- visioncortex/vtracer — https://github.com/visioncortex/vtracer (MIT, ~5.7k★, `webapp.2024.5`)
- VTracer docs / CLI reference — https://www.visioncortex.org/vtracer-docs
- `@neplex/vectorizer` (vtracer native Node binding) — https://www.npmjs.com/package/@neplex/vectorizer
- `vtracer-wasm` — https://www.npmjs.com/package/vtracer-wasm
- `olivierroy/vtracer_autotune` — parameter-sweep wrapper for vtracer
- potrace (site + paper) — https://potrace.sourceforge.net/, Selinger 2003 paper
- `tooolbox/node-potrace` (npm `potrace`, GPL-2.0) — https://github.com/tooolbox/node-potrace
- `oslllo/potrace` — https://github.com/oslllo/potrace
- mkbitmap man page — https://potrace.sourceforge.net/mkbitmap.html
- autotrace/autotrace — https://github.com/autotrace/autotrace (GPL-2.0, v0.31.10 Jan 2024, active)
- SVGcode (PWA) write-up — https://web.dev/svgcode/
- `jankovicsandras/imagetracerjs` — https://github.com/jankovicsandras/imagetracerjs (Unlicense)
- `fogleman/primitive` — https://github.com/fogleman/primitive (MIT)
- BachiLi/diffvg — https://github.com/BachiLi/diffvg (Apache-2.0)
- `ma-xu/LIVE` — https://github.com/ma-xu/LIVE (CVPR 2022 oral)
- Im2Vec paper — https://arxiv.org/abs/2102.02798
- delineate — https://delineate.sourceforge.net/
- SVGO — https://github.com/svg/svgo, https://svgo.dev
- "Potrace vs ImageTrace vs VTracer" comparison — https://www.aisvg.app/blog/image-to-svg-converter-guide
- "Recraft alternatives 2026" market scans — flowith.io, agentsindex.ai (used only for the
  point that no OSS neural-vectorization equivalent exists)
