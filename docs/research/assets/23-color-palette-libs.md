# 23 · Color Extraction, Palette & Color-Science Libraries (JS/TS)

Research digest for `prompt-to-asset` usage in **brand-lock** (extract palette from a reference image), **palette-ΔE2000 validation**, **SVG recoloring**, and **token emission** (OKLCH/Lab → hex/P3 design tokens).

**Research value: high** — mature ecosystem with a clear split between *extractors* (raster → swatches) and *color-science* libs (conversion / ΔE / gamut mapping). A strong default pair exists.

---

## Two tools, two jobs

The libraries below cleanly split into two categories. You almost certainly want one from each:

1. **Extractors** — take a raster image and return N dominant colors. Algorithm choice (MMCQ vs k-means vs distance clustering) and semantic grouping matter more than color-space purity.
2. **Color-science** — parse/convert/interpolate/ΔE/gamut-map across OKLab, OKLCH, Lab, LCH, sRGB, P3, Rec2020. Needed for ΔE2000 brand validation, SVG recoloring in perceptual space, and emitting CSS Color 4 design tokens.

---

## Extractors

### Color Thief — `colorthief`
- **License / author:** MIT · Lokesh Dhakar
- **Algorithm:** MMCQ (Modified Median Cut Quantization) in RGB; recent versions add **OKLCH quantization** for perceptually uniform palettes, progressive extraction, Web Workers, and semantic swatch objects with contrast ratios.
- **API:** `getColor(img)` / `getPalette(img, n)` — dead simple, returns `[r,g,b]` tuples (or rich Color objects in newer API).
- **Ecosystem:** ~13.5k GitHub stars, ~311k weekly downloads on npm. Actively maintained again (new OKLCH pipeline).
- **Fit for brand-lock:** Good for "give me the top-N dominant colors." Less opinionated than node-vibrant — you get frequency-ranked swatches, not role-labelled ones.

### node-vibrant — `node-vibrant`
- **License / author:** MIT · Vibrant-Colors org (port of Android Palette API, originally Jari Zwarts)
- **Algorithm:** MMCQ + HSL-space clustering, then classifies into **six semantic swatches**: `Vibrant`, `Muted`, `DarkVibrant`, `DarkMuted`, `LightVibrant`, `LightMuted`. Each swatch also yields a recommended title/body text color.
- **API:** Promise-based; v4 requires environment-specific imports (`node-vibrant/node`, `/browser`, `/worker`). Node 18+, full TypeScript types, ESM + CJS builds.
- **Status:** v4.0.4 released Jan 2026 — actively maintained, ~400k weekly downloads.
- **Fit for brand-lock:** **Strongest match.** The 6-role taxonomy maps directly onto brand-system roles (primary / accent / surface / on-surface). Semantic swatches make downstream token emission trivial.

### extract-colors — `extract-colors`
- **License / author:** MIT · Damien Doussaud (Namide)
- **Algorithm:** Distance-based clustering in HSL with tunable `distance`, `saturationDistance`, `lightnessDistance`, `hueDistance` thresholds. Not MMCQ, not k-means — an opinionated greedy merger.
- **Bundle:** **< 6 KB min / ≈ 2 KB gzip**, zero browser deps (Node side needs `get-pixels` or similar).
- **Output:** `{hex, red, green, blue, hue, saturation, lightness, intensity, area}[]`.
- **Fit for brand-lock:** Best when bundle size matters or when you want tunable "don't merge similar colors" behavior. Less semantic than node-vibrant, more expressive than colorthief.

### Gpick (desktop only — mention, don't depend)
- GTK desktop app with `.ase`/`.gpl` import/export, oversampling picker, harmony generation. Has a limited `--pick` CLI but is **not a library** and not portable to a Node/edge runtime. Useful as a reference for designer-facing palette conventions (ASE / GPL export formats), not as a runtime dep.

---

## Color-science libraries

### culori — `culori` ★ recommended primary
- **License / author:** MIT · Dan Burzo (Evercoder). v4.0.2 published June 2025, ~789k weekly downloads, zero deps.
- **Color-space coverage:** Most complete in the JS ecosystem — sRGB, linear RGB, HSL/HSV/HWB, **Lab / LCh (D50 + D65 via `lab65`/`lch65`)**, **OKLab / OKLCH**, **Display P3**, **Rec. 2020**, A98/Adobe RGB, ProPhoto, XYZ, LMS, CAM16 variants. CSS Color Module 4 compliant.
- **ΔE:** `differenceCiede2000`, `differenceCie94`, `differenceCie76`, `differenceCmc`, `differenceEuclidean`, plus hue-based differences.
- **Quantization:** No raster extractor, but has k-means clustering + palette interpolation utilities (`samples`, `interpolate`, `nearest`) — usable for palette *refinement* after extraction.
- **Bundle:** ~30 KB min full; tree-shakeable via `culori/fn` to a few KB when you only pull specific converters.
- **Perf:** ~4.5–5× faster than colorjs.io on parse/convert benchmarks.
- **Ergonomics:** Functional API (`oklch(color)`, `formatHex(color)`, `converter('oklch')`). Pairs naturally with TypeScript.

### Color.js — `colorjs.io`
- **License / author:** MIT · Lea Verou & Chris Lilley (editors of the W3C CSS Color specs)
- **Color-space coverage:** Comparable to culori — full CSS Color 4/5, OKLab/OKLCh, Lab/LCh, P3, Rec2020, plus every CSS-defined space.
- **Killer feature:** Real **CSS Color 4 gamut mapping** (binary search in OKLCh minimizing `deltaEOK` to clipped version) — the *reference implementation* for what browsers do. Also offers ΔE76/CMC/2000/Jz.
- **Perf / bundle:** Significantly slower than culori (~5× on parse benchmarks, explicitly not a performance priority per maintainers). Tree-shakeable but heavier.
- **When to choose it:** When you need *authoritative* gamut mapping / CSS spec fidelity (e.g., validating that an OKLCH token falls inside sRGB and correctly mapping if not).

### chroma.js — `chroma-js`
- **License / author:** Apache-2.0 / BSD-3 (not MIT) · Gregor Aisch
- **Color-space coverage:** RGB, HSL/HSV/HSI/HCL (Lab polar), Lab, LCH, CMYK, OKLab, OKLCH (recent). No native Rec2020 / P3 gamut math.
- **Strengths:** Best-in-class **scale / interpolation** API for data viz (`chroma.scale(['#fff','#000']).mode('lab').colors(10)`), bezier scales, Brewer palettes bundled.
- **Bundle:** ~60 KB (largest of the tier).
- **When to choose it:** Generating **gradient scales** or diverging palettes for charts — less ideal as the core of a brand-token pipeline.

### colord — `colord`
- **License / author:** MIT · Vlad Shilov (omgovich)
- **Bundle:** **1.7 KB gzip core** — smallest credible option. Plugin system: add `lab`, `lch`, `xyz`, `cmyk`, `hwb`, `a11y`, `harmonies` individually.
- **Perf:** ~3.5M ops/sec, 3× faster than tinycolor2/color.
- **Gaps:** No native OKLab/OKLCh, no P3/Rec2020, no ΔE2000 plugin. Last release **August 2022** — stable but low activity.
- **When to choose it:** Lightweight frontend-only tasks, not a brand-token pipeline that needs OKLCH + P3.

### @ctrl/tinycolor — `@ctrl/tinycolor`
- **License / author:** MIT · Scott Cooper (TypeScript fork of `tinycolor2`)
- **Color-space coverage:** RGB / HSL / HSV / HWB / CMYK / hex / named colors. **No Lab, LCH, OKLab, OKLCH, P3, Rec2020.**
- **Strengths:** First-class TypeScript, immutable API, harmonies (complement/triad/analogous), readability / contrast helpers. ~4 KB min.
- **When to choose it:** Classic web color manipulation where you don't need modern perceptual spaces — not a match for ΔE2000 brand validation.

### d3-color — `d3-color`
- **License / author:** ISC (d3 is BSD-3/ISC) · Mike Bostock
- **Color-space coverage:** RGB, HSL, **CIELAB**, **CIELCh**, Cubehelix. Companion packages: `d3-cam16`, `d3-cam02`, `d3-hsluv`, `d3-hsv`, `d3-hcg`. **No OKLab/OKLCH/P3/Rec2020 in core.**
- **Strengths:** Rock-solid perceptually-uniform conversions; underpins `d3-scale-chromatic`.
- **When to choose it:** If you're already using D3 for viz. Otherwise culori supersedes it for greenfield use.

---

## Summary matrix

| Lib | Role | License | Modern spaces (OKLab/OKLCH/P3/Rec2020) | Lab/LCH | ΔE2000 | Min bundle | Notes |
|---|---|---|---|---|---|---|---|
| colorthief | extract | MIT | OKLCH (quantizer) only | – | – | ~8 KB | MMCQ, +Web Workers, semantic swatches |
| node-vibrant | extract | MIT | – | – | – | ~40 KB (node) | 6 role swatches, TS, v4.0.4 (2026) |
| extract-colors | extract | MIT | – | – | – | **~2 KB gzip** | HSL distance clustering, tunable |
| culori | science | MIT | **full** | **full** | **yes** | ~30 KB (tree-shakable) | Fastest full-coverage lib, CSS Color 4 |
| colorjs.io | science | MIT | **full** | **full** | **yes + Jz/CMC** | ~heavy | W3C-authored, best gamut mapping |
| chroma-js | science/scales | Apache-2.0/BSD | OKLab/OKLCh, no P3/Rec2020 | yes | – (has others) | ~60 KB | Best for data-viz scales |
| colord | science (lite) | MIT | – | via plugins | – | **1.7 KB gzip** | Stale since 2022 |
| @ctrl/tinycolor | science (lite) | MIT | – | – | – | ~4 KB | TS-first, no perceptual spaces |
| d3-color | science | ISC | – | yes | – | ~3 KB | Pair with d3-scale-chromatic |
| Gpick | desktop tool | BSD-3 | n/a | n/a | n/a | n/a | Reference for `.ase`/`.gpl` IO, not a lib |

---

## Recommended pairing for `prompt-to-asset`

- **Extract (brand-lock):** **`node-vibrant` v4** — its six semantic swatches (`Vibrant`, `Muted`, `DarkVibrant`, `DarkMuted`, `LightVibrant`, `LightMuted`) map cleanly onto brand roles, TS-first, actively maintained in 2026. Fall back to **`extract-colors`** for tiny-bundle edge/browser contexts or when you need tunable distance thresholds.
- **Color science (ΔE2000, recoloring, tokens):** **`culori`** — only JS library that covers OKLab/OKLCH/Lab/LCH/P3/Rec2020 *and* ships `differenceCiede2000`, at ~5× the perf of the next best. Escalate to **`colorjs.io`** only for CSS Color 4 gamut-mapping correctness tests (it is the reference implementation).

Avoid pulling in more than one science lib at runtime — ΔE numbers differ slightly across implementations and you want one source of truth for brand validation.

---

## Sources

- [culori on npm](https://www.npmjs.com/package/culori) — v4.0.2, zero deps, 789k weekly
- [culori color spaces](https://culorijs.org/color-spaces) — confirms OKLab/OKLCH/Lab65/P3/Rec2020
- [culori API (ΔE functions)](https://culorijs.org/api/) — `differenceCiede2000` etc.
- [colorjs.io docs](https://colorjs.io/) and [gamut mapping](https://colorjs.io/docs/gamut-mapping) — W3C-authored, CSS Color 4 reference
- [color.js issue #655 — perf vs culori](https://github.com/color-js/color.js/issues/655) — quantifies culori's 4.5–5× advantage
- [node-vibrant repo](https://github.com/vibrant-colors/node-vibrant) and [CHANGELOG](https://github.com/Vibrant-Colors/node-vibrant/blob/main/CHANGELOG.md) — v4.0.4 Jan 2026, TS, Node 18+
- [Color Thief](https://lokeshdhakar.com/projects/color-thief) and [repo](https://github.com/lokesh/color-thief) — MMCQ, OKLCH quantizer, Web Workers
- [extract-colors on npm](https://www.npmjs.com/package/extract-colors) and [Bundlephobia](https://bundlephobia.com/result?p=extract-colors) — <6 KB min / ≈2 KB gzip
- [colord repo](https://github.com/omgovich/colord) — 1.7 KB gzip, plugin system, last release 2022
- [@ctrl/tinycolor docs](https://tinycolor.vercel.app/docs) — RGB/HSL/HSV/CMYK only
- [d3-color](https://d3js.org/d3-color/) — Lab/LCh/Cubehelix, companion modules for CAM/HSLuv
- [Gpick home](https://gpick.org/) and [man page](https://man.archlinux.org/man/gpick.1.en) — desktop GTK picker, `.ase`/`.gpl` export
- [PkgPulse: culori vs chroma-js vs tinycolor2 (2026)](https://www.pkgpulse.com/blog/culori-vs-chroma-js-vs-tinycolor2-color-manipulation-javascript-2026) — bundle size comparison
