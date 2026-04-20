# Font Subsetting & Loading for OG Images / SVG Rasterization

> Research note: tools for shipping only the glyphs we actually need when
> generating OG images or rasterizing SVG text in `prompt-to-asset`.
> Date: 2026-04-19.

## TL;DR

- **Subsetting engine of choice:** HarfBuzz's `hb-subset` (via `subset-font`
  on Node, or `pyftsubset` on Python) — it is the de-facto modern subsetter
  and what Google Fonts itself ships from.
- **Critical gotcha:** Satori **does not support WOFF2**. It accepts TTF,
  OTF, and WOFF only. Subset to `woff` (or `ttf`) for Satori, and to `ttf`/
  `otf` for resvg's `fontdb`. Use WOFF2 only for browser CSS delivery.
- **Best build-time combo for us:** `subset-font` (Node, MIT, harfbuzz-wasm)
  to produce a tiny WOFF, read it as `ArrayBuffer`, pass it into Satori's
  `fonts` array. Optionally emit a parallel WOFF2 for the browser bundle.

---

## Tool matrix

### 1. `fonttools` / `pyftsubset` (Python)

- **License:** MIT.
- **Install:** `pip install fonttools[woff]` (brotli is needed for WOFF2).
- **CLI:**
  ```bash
  pyftsubset Inter.ttf \
    --text="Prompt Enhancer · Generate · Copy" \
    --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk' \
    --flavor=woff2 \
    --output-file=Inter.subset.woff2
  ```
- **API:** `from fontTools.subset import Subsetter, Options`. Pythonic, but
  heavy for a Node build pipeline.
- **Subsetting features:** `--unicodes`, `--text`, `--text-file`,
  `--glyphs`, `--layout-features[+=|-=]`, `--name-IDs`, `--desubroutinize`,
  variable-font axis control via `--variable-font-range`.
- **Output formats:** `--flavor=woff|woff2|sfnt` (TTF/OTF stays native).
- **Notes:** Slightly older codebase than HarfBuzz subsetter but still the
  most feature-complete (best layout-feature handling, best variable-font
  instancing). Gotcha: all options are **double-dash** (`--`), not single.

### 2. `glyphhanger` (Filament Group / Zach Leatherman)

- **License:** MIT.
- **Install:** `npm i -g glyphhanger` — but it shells out to `pyftsubset`
  (and optionally `brotli`, `zopfli`), so Python is still required.
- **CLI:**
  ```bash
  glyphhanger ./dist/**/*.html --subset=./fonts/Inter.ttf \
    --formats=woff2,woff --family="Inter"
  ```
- **What it adds on top of pyftsubset:** crawls HTML/URLs with Puppeteer to
  discover the glyph set, emits `unicode-range` CSS, batches multiple
  fonts. Great for a whole static site, overkill for a single OG template.
- **Integration with Satori:** not direct — you would still pass the
  resulting WOFF to Satori via `ArrayBuffer`.

### 3. `subfont` (Munter / Andreas Lind)

- **License:** BSD-3-Clause.
- **Install:** `npm i -g subfont`. Pure-Node (uses `subset-font` under the
  hood — so HarfBuzz-wasm, no Python).
- **CLI:** `subfont dist/index.html --in-place --instance`
- **What it does:** scans built HTML, detects fonts + used glyphs, rewrites
  `@font-face` with `unicode-range`, emits WOFF/WOFF2, adds `<link rel="
  preload">`. Supports variable-font instancing (`--instance`).
- **Integration with Satori:** same as glyphhanger — it optimizes the
  *browser* side. For OG images, use `subset-font` directly.

### 4. HarfBuzz `hb-subset` and its bindings

- **License:** MIT (HarfBuzz itself).
- **C CLI:** `hb-subset Inter.ttf --text="Hello" --output-file=out.ttf`
  — ships with most package managers (`brew install harfbuzz`).
- **Node bindings:**
  - [`harfbuzzjs`](https://www.npmjs.com/package/harfbuzzjs) — low-level
    wasm bindings. Usable but you manage wasm heap yourself.
  - **[`subset-font`](https://github.com/papandreou/subset-font)** —
    high-level wrapper (MIT). *This is the sweet spot for us.*
    ```ts
    import subsetFont from 'subset-font';
    const out = await subsetFont(ttfBuffer, 'Prompt Enhancer abcABC…', {
      targetFormat: 'woff', // 'sfnt' | 'woff' | 'woff2'
      preserveNameIds: [0, 1, 2, 3, 4, 5, 6],
      variationAxes: { wght: { min: 400, max: 700 } },
    });
    ```
    Handles WOFF/WOFF2 wrapping (HarfBuzz itself only speaks SFNT) via
    `fontverter`.
  - [`hb-subset-wasm`](https://github.com/kyosuke/hb-subset-wasm) — trimmer
    variant for Cloudflare Workers / browser (no Node fs).
- **Python:** `uharfbuzz` exposes `hb_subset` too, but `pyftsubset` is more
  common in Python land.
- **Subsetting features:** text, unicodes, glyph IDs, layout features,
  variable-font axis pinning/narrowing, name-table preservation.

### 5. `@capsizecss/metrics`

- **License:** MIT.
- **Role:** *Not* a subsetter — it ships precomputed vertical metrics
  (`capHeight`, `ascent`, `descent`, `lineGap`, `xHeight`, `unitsPerEm`)
  for system fonts + every Google Font.
- **Why relevant:**
  1. Satori and resvg compute text layout from the font's own metrics, so
     if you subset correctly the metrics survive. But if you ever *swap*
     fonts at render time (fallback chain), `@capsizecss/core` lets you
     compute a size-adjusted fallback that doesn't shift glyph boxes.
  2. It also lets us validate that a subset WOFF preserved the original
     metrics (`@capsizecss/unpack` reads them back from a buffer).
- **Install / use:**
  ```ts
  import interMetrics from '@capsizecss/metrics/inter';
  // Pass to satori-friendly style computation, or to createStyleObject.
  ```

### 6. Satori font loading (`ArrayBuffer` via fetch/fs)

- **Shape of the `fonts` option:**
  ```ts
  fonts: {
    name: string;
    data: ArrayBuffer | Uint8Array;
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style?: 'normal' | 'italic';
    lang?: string; // script hint
  }[]
  ```
- **Formats:** TTF, OTF, WOFF. **No WOFF2** (opentype.js, Satori's parser,
  does not support WOFF2 decompression). The Satori team has deprioritized
  WOFF2 because TTF/OTF parse faster server-side.
- **Loading patterns:**
  ```ts
  // local fs, build-time
  const data = await fs.readFile('./assets/Inter.subset.woff');

  // remote fetch (edge runtime)
  const data = await fetch(new URL('./Inter.subset.woff', import.meta.url))
    .then(r => r.arrayBuffer());
  ```
- **Tip:** keep the `name` stable across weights/styles so Satori's
  font-matching picks the right variant per text node.

### 7. resvg `fontdb` feature (SVG → PNG)

- **License:** MPL-2.0 (resvg core). `@resvg/resvg-js` and `-wasm` are
  MPL-2.0 + shipped wasm.
- **What `fontdb` is:** an internal font database backed by
  `fontdb`/`font-kit` style loading. In `@resvg/resvg-js`/`-wasm` this is
  exposed via the `font` option:
  ```ts
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: ['./assets/Inter.subset.ttf'], // absolute paths
      loadSystemFonts: false, // deterministic output
      defaultFontFamily: 'Inter',
    },
  });
  ```
- **Accepted formats:** TTF, OTF, TTC. **Not WOFF/WOFF2** in the wasm/js
  bindings (the Rust crate can, but the Node/wasm wrappers expect sfnt).
- **Relevance:** when we rasterize an SVG that already contains `<text>`
  (instead of Satori-flattened glyph paths), resvg needs the font at
  render time. Subsetting still works — just emit TTF instead of WOFF.

### 8. `opentype.js`

- **License:** MIT.
- **Role:** font parser/writer. Satori uses it internally to read fonts.
- **Subsetting?** Technically possible (construct a new `Font` with a
  filtered glyph list + call `toArrayBuffer()`), but the result is lossy:
  no GPOS/GSUB rewriting, no WOFF output, no variable-font handling. In
  practice, **do not use opentype.js for subsetting** — use `subset-font`.
  Keep opentype.js in mind only for reading glyph metrics from a buffer
  when `@capsizecss/unpack` is overkill.

### 9. Honorable mentions (not in the brief, worth knowing)

- **`fontkit`** (MIT, Devon Govett) — better than opentype.js at reading
  fonts (OpenType, WOFF, WOFF2, TTC, variable). No subsetting though.
- **`wawoff2`** — pure-JS WOFF2 encoder/decoder. Use to produce the
  browser-delivery WOFF2 from our subset TTF if we need WOFF2 without
  Brotli native deps.

---

## Recipe: smallest WOFF at build time → Satori

Goal: given an OG template with known text (e.g. "Prompt Enhancer" plus a
dynamic title), plus a Google/Fontsource font (e.g. Inter 400/700), emit
the smallest possible font buffer and embed it in Satori's `fonts` array.

### Step 0: pick a source file

Use Fontsource's TTF (not WOFF2) to avoid a decompression step in the
build pipeline:

```bash
# via npm: pins the version, lives in node_modules
npm i @fontsource/inter
# sources: node_modules/@fontsource/inter/files/inter-latin-400-normal.ttf
#          node_modules/@fontsource/inter/files/inter-latin-700-normal.ttf
```

Or hit the Fontsource API directly:

```
https://api.fontsource.org/v1/fonts/inter/latin-400-normal.ttf
```

### Step 1: declare the glyph budget

```ts
// scripts/build-og-font.ts
const FIXED_CHARS = 'Prompt Enhancer · © 2026';
const DYNAMIC_ASCII =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PUNCTUATION = ' .,:;!?\'"()[]{}<>/\\-_+=@#$%&*';
const CURRENCY = '$€£¥';
const SMART_QUOTES = '\u2018\u2019\u201C\u201D\u2013\u2014\u2026';

const SUBSET_TEXT =
  FIXED_CHARS + DYNAMIC_ASCII + PUNCTUATION + CURRENCY + SMART_QUOTES;
```

Include every character any OG title might contain. If titles are fully
dynamic, use `latin` + `latin-ext` unicode ranges instead:

```
U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,
U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD
```

### Step 2: subset with `subset-font`

```ts
// scripts/build-og-font.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import subsetFont from 'subset-font';

async function buildSubset(variant: string) {
  const src = path.resolve(
    'node_modules/@fontsource/inter/files',
    `inter-latin-${variant}-normal.ttf`,
  );
  const input = await fs.readFile(src);

  const woff = await subsetFont(input, SUBSET_TEXT, {
    targetFormat: 'woff', // Satori-compatible
    // keep shaping features we actually want in OG text:
    // subset-font passes this through to hb-subset via a text+feature closure
    preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 16, 17],
  });

  const out = path.resolve('assets/og-fonts', `inter-${variant}.woff`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, woff);
  console.log(`${variant}: ${input.length} → ${woff.length} bytes`);
}

await Promise.all([buildSubset('400'), buildSubset('700')]);
```

Typical reductions for an ASCII-only subset of Inter: ~310 KB TTF →
~12-18 KB WOFF (96% smaller). With `latin` + `latin-ext` expect ~25-35 KB.

### Step 3: load into Satori

```ts
// src/og/render.ts
import fs from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const [inter400, inter700] = await Promise.all([
  fs.readFile(new URL('../../assets/og-fonts/inter-400.woff', import.meta.url)),
  fs.readFile(new URL('../../assets/og-fonts/inter-700.woff', import.meta.url)),
]);

export async function renderOg(title: string) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: 1200, height: 630, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          color: 'white', fontFamily: 'Inter',
        },
        children: [
          { type: 'span', props: {
              style: { fontSize: 64, fontWeight: 700 },
              children: title,
          }},
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: inter400.buffer, weight: 400, style: 'normal' },
        { name: 'Inter', data: inter700.buffer, weight: 700, style: 'normal' },
      ],
    },
  );

  return new Resvg(svg).render().asPng();
}
```

### Step 4 (optional): emit a parallel WOFF2 for CSS

If the same font is used on the site itself, run the subset again with
`targetFormat: 'woff2'` and reference it from `@font-face` with a matching
`unicode-range`. Do **not** feed that WOFF2 to Satori.

### Step 5: CI guardrail

Add a size check so a regression doesn't silently reintroduce a 300 KB
font:

```ts
// scripts/check-og-font-size.ts
import fs from 'node:fs/promises';
const MAX = 40 * 1024; // 40 KB per weight
for (const f of ['inter-400.woff', 'inter-700.woff']) {
  const { size } = await fs.stat(`assets/og-fonts/${f}`);
  if (size > MAX) throw new Error(`${f} is ${size} bytes (> ${MAX})`);
}
```

---

## Decision for `prompt-to-asset`

1. **Build-time subsetting:** `subset-font` (Node, MIT, HarfBuzz-wasm).
   No Python dependency, no CLI shellout, deterministic across
   CI/macOS/Linux.
2. **Font format into Satori:** `woff`. Smaller than TTF, supported by
   Satori, doesn't need Brotli decode.
3. **Font format into resvg (if we rasterize pre-built SVGs with `<text>`):**
   `ttf`. resvg's `fontdb` in the JS bindings needs SFNT.
4. **Vertical metrics:** pull from `@capsizecss/metrics/inter` if we need
   to compute a size-adjusted fallback for runtime scenarios where the
   subset font fails to load.
5. **Skip:** opentype.js subsetting (lossy), glyphhanger (too heavy for a
   single template; uses Python), subfont (optimizes the browser bundle,
   not the OG pipeline).

## References

- pyftsubset: https://fonttools.readthedocs.io/en/stable/subset/
- glyphhanger: https://github.com/zachleat/glyphhanger
- subfont: https://github.com/Munter/subfont
- subset-font (HarfBuzz wrapper): https://github.com/papandreou/subset-font
- harfbuzzjs: https://www.npmjs.com/package/harfbuzzjs
- hb-subset manual: https://harfbuzz.github.io/harfbuzz-hb-subset.html
- Capsize: https://seek-oss.github.io/capsize/
- Satori font loading: https://github.com/vercel/satori (and
  https://deepwiki.com/vercel/satori/6.1-font-loading)
- Satori WOFF2 status: https://github.com/vercel/satori/issues/3
- resvg: https://github.com/linebender/resvg
- opentype.js: https://opentype.js.org/
- Fontsource API: https://fontsource.org/docs/api
