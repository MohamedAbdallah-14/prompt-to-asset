---
category: 08-logo-generation
angle: 8e
title: "Full SVG Logo Pipeline — Prompt → Raster → Matte → Vector → Cleanup → Multi-Format Export"
slug: svg-vector-logo-pipeline
date: 2026-04-19
status: draft
primary_sources:
  - https://github.com/visioncortex/vtracer
  - https://github.com/linebender/resvg
  - https://github.com/svg/svgo
  - https://github.com/joanrod/star-vector
  - https://github.com/ximinng/SVGDreamer
  - https://github.com/kingnobro/Chat2SVG
  - https://github.com/danielgatis/rembg
  - https://github.com/lllyasviel/LayerDiffuse
  - https://github.com/lovell/sharp
  - https://github.com/Bria-AI/RMBG-2.0
  - https://recraft.ai/docs/api
tags:
  - svg
  - vectorization
  - logo
  - pipeline
  - matting
  - export
  - favicon
  - ico
  - potrace
  - vtracer
  - svgo
  - resvg
  - recraft
  - starvector
  - diffvg
---

# Full SVG Logo Pipeline — Prompt → Raster → Matte → Vector → Cleanup → Multi-Format Export

## Executive Summary

A production-grade logo — the kind a developer can drop into a React repo, an App Store listing, a favicon link tag, and a printed business card without re-exporting by hand — is not a single artifact. It is a **family of derivatives** anchored to a clean master SVG. Getting from a one-line prompt (*"a transparent logo for my note-taking app"*) to that family is a pipeline problem, not a model problem. Even the best text-to-image model emits a PNG that is too busy, too anti-aliased, or too "AI" to ship directly as a logo. The pipeline is where correctness is manufactured.

There are two viable top-level architectures in 2025–2026:

1. **Native-vector path.** Generate SVG directly from a prompt with a model whose output space *is* SVG code or Bézier paths. The market leader is [Recraft V3 (`recraft-v3-svg`)](https://replicate.com/recraft-ai/recraft-v3-svg), and the research frontier is [StarVector](https://github.com/joanrod/star-vector) (CVPR 2025, ~4.3k stars) and [SVGDreamer/SVGDreamer++](https://github.com/ximinng/SVGDreamer) (CVPR 2024, 435 stars), together with [Chat2SVG](https://github.com/kingnobro/Chat2SVG) (CVPR 2025, 219 stars) which uses an LLM to emit primitives and then refines them with DiffVG. These produce small, editable SVGs but have limited style range and weak photoreal/illustrative quality.
2. **Raster-first path (default in practice).** Generate a high-resolution PNG with the best available T2I model (Flux, Imagen 4, `gpt-image-1`, SDXL + LoRA), matte the background to a clean alpha, vectorize with [vtracer](https://github.com/visioncortex/vtracer) (5.7k stars) or [potrace](https://potrace.sourceforge.net/) for monochrome, optimize with [SVGO](https://github.com/svg/svgo) (22.4k stars), then re-export at every size the product needs via [resvg](https://github.com/linebender/resvg) / [resvg-js](https://github.com/yisibl/resvg-js) and [sharp](https://github.com/lovell/sharp). This path has the highest visual ceiling today and is what [LogoLoom](https://github.com/mcpware/logoloom), [Logomaker](https://github.com/manicinc/logomaker), and most commercial tools actually run under the hood.

The **hybrid that wins** for a prompt-to-asset product is: try Recraft V3 SVG first (cheap, clean, editable); fall back to Flux/Imagen → BiRefNet/RMBG 2.0 → vtracer → SVGO → resvg → sharp → png-to-ico. Export is not optional — a logo ships only when you have SVG + PNG@{16,32,48,64,128,192,256,512,1024} + `apple-touch-icon-180.png` + `favicon.ico` + `icon.pdf` + `og-1200x630.png`.

This document walks the full pipeline, the tool choices at each stage, quality trade-offs, and three open-source reference architectures that implement it end-to-end.

---

## Pipeline Stages

The canonical pipeline has six stages. Each one can fail silently and destroy the final logo, so each is discussed with concrete tool choices, failure modes, and recommended defaults.

```
[1 Prompt]  →  [2 Generation]  →  [3 Matting / Alpha]  →  [4 Vectorization]
                                                                ↓
                                                  [5 SVG Cleanup / Optimization]
                                                                ↓
                                                  [6 Multi-Format Export Fanout]
```

### Stage 1 — Prompt construction

This stage is covered in depth by angles 8a–8d; the summary for the pipeline is: **bias prompts toward vector-friendly outputs.** Ask for flat colors, limited palette (≤4 spot colors), thick strokes, centered composition, transparent or pure-white background, no gradients, no shadows, no textures, SVG-safe shapes. These constraints dramatically raise the success rate of downstream vectorization. Recraft and Ideogram honor vector-friendly prompting natively; Flux and Imagen require explicit style tokens (*"flat vector logo, minimal, 3 colors, centered, white background, no shadow"*).

### Stage 2 — Generation

Three sub-choices, each with different downstream consequences.

**2a. Native vector (skip Stages 3–4).**

| Tool | Cost | SVG Quality | Text in logo | Notes |
|---|---|---|---|---|
| [Recraft V3 SVG](https://recraft.ai/docs) (API) | $0.08/img | Very good, clean paths | Yes (uniquely strong) | Only mass-market native-SVG API. Available via Replicate and Recraft's own API. |
| [StarVector-8B](https://huggingface.co/starvector/starvector-8b-im2svg) | Self-host GPU | Good on icons/logos, struggles on photoreal | Partial | Treats vectorization as code generation, produces circles/polygons/paths/text rather than pure Béziers. CVPR 2025. |
| [SVGDreamer](https://github.com/ximinng/SVGDreamer) | Self-host, slow (VPSD optimization loop) | Strong on stylized logos | No | Diffusion-guided particle optimization; best results require 20–60 min/image. |
| [Chat2SVG](https://github.com/kingnobro/Chat2SVG) | LLM API + local DiffVG | Clean, editable, compact | Yes (LLM emits `<text>`) | Three-stage: LLM → ControlNet → DiffVG refine. CVPR 2025. |
| [IconShop](https://github.com/kingnobro/IconShop) | Self-host | Monochrome icons only | No | SIGGRAPH Asia 2023, autoregressive path transformer. |

Recraft V3 SVG is the only production-reliable option today. The research models are fantastic inside their training distribution (icons, mascots, flat vector) and collapse outside it (photoreal, 3D, complex illustration).

**2b. Raster with transparency (skip Stage 3 partially).**

[LayerDiffuse](https://github.com/lllyasviel/LayerDiffuse) (lllyasviel, arXiv 2402.17113) is a finetuning of SDXL that encodes alpha directly in the latent and outputs true RGBA PNGs. In user studies 97% of subjects preferred its transparent output over generate-then-matte. If you can run SDXL locally, this is the best "real alpha" option — it still benefits from a matting refinement pass for hair-level edges. `gpt-image-1` and Imagen 4 also emit claimed-transparent output but frequently ship the "checker pattern" or a near-white fill instead; a BiRefNet pass is mandatory on their outputs regardless of what the API parameter says.

**2c. Raster, opaque background.**

The default for Flux, Imagen, Midjourney. Always prompt for pure white or pure black backgrounds rather than "transparent" — it fails less often and is trivial to matte downstream.

### Stage 3 — Matting / alpha channel

Even with transparent-capable models, logos need a **clean, hard-edge alpha** rather than the semi-transparent halos that diffusion tends to produce. This stage is the single biggest quality lever between "AI slop logo" and "ships to the App Store."

| Tool | Model | Stars | Quality | Notes |
|---|---|---|---|---|
| [rembg](https://github.com/danielgatis/rembg) | U²-Net / ISNet / BiRefNet / SAM | 22.5k | Good default | Python CLI + HTTP server + Docker. `rembg i input.png output.png` is one-liner. |
| [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) | BiRefNet (CAI 2024) | 3.0k+ | Hair-level precision | Integrated into rembg as `-m birefnet-general`. Best open alternative. |
| [BRIA RMBG 2.0](https://huggingface.co/briaai/RMBG-2.0) | Bria's proprietary, trained on licensed stock | N/A | State of the art per Bria's own eval | CC-BY-NC-4.0 (non-commercial) + paid API. Outperforms BiRefNet in Bria's published eval. |
| [U²-Net](https://github.com/xuebinqin/U-2-Net) | Original 2020 SOTA | 9.7k | Legacy baseline | Fast, still decent for simple logos. |
| [SAM / SAM 2](https://github.com/facebookresearch/segment-anything) | Segment Anything | 50k+ | Good with a point prompt | Interactive rather than fully-automatic. |

**Alpha matting refinement.** After the segmentation mask, run alpha matting (rembg exposes `--alpha-matting --alpha-matting-foreground-threshold 240 --alpha-matting-background-threshold 10 --alpha-matting-erode-size 10`) to get crisp logo edges without the characteristic "fringe" from naive thresholding.

**Checker-pattern fix.** If the upstream model returned a checkerboard (Gemini's well-documented failure mode), run a pre-matting step that detects the repeating 16×16 pattern via FFT or by hashing 16-pixel tiles and replaces it with pure white before handing to rembg. The [checkerboard-detector gist](https://gist.github.com/search?q=checkerboard+transparency) pattern from angle 13a applies here.

**Background recolor.** For vectorization you want a single solid background (ideally white) rather than a true alpha, because [potrace](https://potrace.sourceforge.net/) and [vtracer](https://github.com/visioncortex/vtracer) both work on opaque rasters. Use [Pillow](https://github.com/python-pillow/Pillow) or [sharp](https://github.com/lovell/sharp): `Image.alpha_composite(white_bg, rgba_logo).convert("RGB")`.

### Stage 4 — Vectorization

The core technical decision. Six realistic choices; the first two cover 95% of logo use cases.

| Tool | Lang | Stars | Best for | Algorithm | License |
|---|---|---|---|---|---|
| [vtracer](https://github.com/visioncortex/vtracer) | Rust | 5.7k | Color logos, illustrations | O(n) stacked color shapes with spline fitting | MIT |
| [potrace](https://potrace.sourceforge.net/) | C | 300+ (mirrors 150–350) | Monochrome logos, lettermarks, silhouettes | Corner detection + polygon + Bézier fit | GPL-2.0 |
| [autotrace](https://github.com/autotrace/autotrace) | C | 700+ | Mixed; legacy | Centerline + outline | GPL-2.0 |
| [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) | JS | 1.5k | Browser-side vectorization | Paletted shape layering | Unlicense |
| [DiffVG + LIVE](https://github.com/Picsart-AI-Research/LIVE-Layerwise-Image-Vectorization) | Python | 1.2k (DiffVG) + 400+ (LIVE) | Research-grade layered SVG, editable | Differentiable rasterization + layer-wise optimization | Apache-2.0 |
| [StarVector im2svg](https://github.com/joanrod/star-vector) | Python | 4.3k | Icons, logos, diagrams as "real" SVG code | Vision-language model outputting SVG source | Apache-2.0 |

**How to choose.**

- **Monochrome or 2-color flat logo.** Potrace wins. It produces the smoothest paths and the smallest files. The classic recipe is: grayscale → threshold to B&W via [`mkbitmap`](https://potrace.sourceforge.net/mkbitmap.1.html) → `potrace -b svg -a 1.0 -t 2 input.pbm -o output.svg`.
- **2–16 color flat illustration, gradients, or photographs.** vtracer, always. `vtracer --input logo.png --output logo.svg --mode spline --colormode color --filter_speckle 4 --color_precision 6 --layer_difference 16 --corner_threshold 60 --segment_length 4 --splice_threshold 45`. vtracer's O(n) spline fitter gives it an order-of-magnitude speed advantage on 4k+ inputs and avoids the "shapes with holes" pathology that Illustrator's Image Trace introduces.
- **Need human-editable layers with semantic groupings.** LIVE. Slow (minutes per image on GPU) but produces SVGs with 5–20 named layers rather than vtracer's tens of overlapping color shapes.
- **Need real SVG primitives (circles, rects, text) rather than paths.** StarVector. Especially good for UI icon sets where you want `<circle>` not `<path d="M…">`.
- **Browser, no Rust toolchain.** imagetracerjs. Slower, larger SVGs, but zero-install.

**Commercial reference points.**

- [Vectorizer.AI](https://vectorizer.ai/api) — paid API, best-in-class for complex/photoreal inputs, tracks strokes and fills separately, handles transparent/layered output. Pricing tier-gated, typically $0.20–0.30/image at scale.
- [Adobe Illustrator Image Trace](https://helpx.adobe.com/illustrator/using/image-trace.html) — included with Creative Cloud; adequate, sometimes better than open source on noisy photo input, but produces notoriously bloated SVG (often 3–10× larger than vtracer output on identical input, per [the vtracer README benchmarks](https://github.com/visioncortex/vtracer)).
- [Recraft `vectorize` endpoint](https://recraft.ai/docs/using-recraft/image-editing/format-conversions-and-scaling/vectorizing) — $0.04/image, best integration if you're already on Recraft.
- [Figma's Pixel → SVG plugin](https://www.figma.com/community/plugin/?q=pixel+to+svg) — usable only for hand-editing, not pipelines.

**Pre-vectorization tricks.** Upscale to 4×–8× via [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) or [SUPIR](https://github.com/Fanghua-Yu/SUPIR) *before* vectorizing — vtracer/potrace both benefit enormously from higher-resolution input because the corner detector has more pixels to anchor on. Then downsample the SVG naturally via `viewBox`. Also run a 2–4 pixel median or bilateral filter first to kill JPEG/diffusion noise.

### Stage 5 — SVG cleanup and optimization

A raw vtracer SVG on a 4k input is 200–800 KB; a properly optimized production SVG for the same logo is 3–15 KB. Three tools dominate.

| Tool | Lang | Stars | Best for |
|---|---|---|---|
| [SVGO](https://github.com/svg/svgo) | Node | 22.4k | Standard pipeline optimizer |
| [scour](https://github.com/scour-project/scour) | Python | 870 | Python-native, SVG 1.1 compliant |
| [svgcleaner](https://github.com/RazrFalcon/svgcleaner) | Rust | 1.8k | Deprecated in favor of resvg's usvg, but still usable |

SVGO is the default. The recipe for a production logo is roughly:

```bash
svgo input.svg -o output.svg \
  --multipass \
  --precision 2 \
  --disable=removeViewBox \
  --enable=removeDimensions \
  --enable=cleanupIds \
  --enable=collapseGroups \
  --enable=mergePaths \
  --enable=convertPathData \
  --enable=removeUselessStrokeAndFill
```

Key defaults for logos specifically:

- **Keep `viewBox`, strip `width`/`height`.** Lets the SVG scale to any container. Every modern icon system (Heroicons, Lucide, Feather) ships this way.
- **`precision=2`.** Float precision 2 decimal places is visually indistinguishable from 6 and saves 30–50% of path bytes.
- **Preserve IDs you plan to animate.** If your brand has a monogram you'll animate in CSS, whitelist those IDs before `cleanupIds`.
- **`convertShapeToPath: false`** if downstream consumers need real `<circle>` / `<rect>`. Default is true, which is fine for static display but hurts for animation libraries.
- **`reusePaths: true`** for multi-shape logos to enable `<use href="#path1"/>` deduplication.

**After SVGO**, run a sanity pass through `usvg` (from [resvg](https://github.com/linebender/resvg)) which normalizes the SVG into a minimal subset (resolves `<use>`, `<style>`, CSS, transforms) and will flag unrenderable artifacts. This is especially useful before sending to headless rasterizers that don't implement the full SVG spec.

**Manual simplification for hero logos.** After SVGO, a human pass in [Illustrator's Object > Path > Simplify](https://helpx.adobe.com/illustrator/using/simplify.html) or [Inkscape's Path > Simplify](https://inkscape.org/doc/inkscape/tutorial-basic.html) routinely halves path count for no visible loss. Our prompt-to-asset can surface a "simplify aggressiveness" knob and auto-run Inkscape headlessly (`inkscape --actions="select-all;path-simplify" in.svg -o out.svg`) for users who want the smallest possible file.

### Stage 6 — Multi-format export fanout

A logo ships as a fan-out of ~15–25 files. The fanout targets most products need:

| Output | Use | Size(s) |
|---|---|---|
| `logo.svg` | Canonical, web embed | vector |
| `logo.pdf` | Print, business cards, vector for designers | vector |
| `logo-1024.png` | High-res master raster, marketing | 1024×1024 |
| `logo-512.png` | App store listing raster | 512×512 |
| `logo-{16,32,48,64,128,192,256}.png` | favicon / PWA icon set | as named |
| `favicon.ico` | Windows / legacy browsers, multi-resolution ICO | 16+32+48 bundled |
| `apple-touch-icon.png` | iOS home-screen | 180×180 |
| `android-chrome-192.png`, `android-chrome-512.png` | Android PWA manifest | as named |
| `og-image.png` | Open Graph / Twitter Card | 1200×630 |
| `logo-dark.svg`, `logo-light.svg` | Theme variants | vector |
| `logo-monochrome.svg` | Single-color version for emboss/merch | vector |

The export chain:

**SVG → PNG rasterization.**

- **Rust / CLI / reproducible:** [resvg](https://github.com/linebender/resvg) (linebender, ~3.7k stars). `resvg --width 1024 logo.svg logo-1024.png`. Deterministic across platforms, 1600-test regression suite, produces pixel-identical PNGs on macOS/Linux/Windows/WASM. Best for CI pipelines.
- **Node:** [resvg-js](https://github.com/yisibl/resvg-js) (~2k stars) — WASM/native bindings of resvg. `new Resvg(svg, {fitTo: {mode: 'width', value: 1024}}).render().asPng()`. The default for web backends.
- **Python:** [CairoSVG](https://github.com/Kozea/CairoSVG) (1.3k stars) or [resvg via python bindings](https://pypi.org/project/resvg-py/). CairoSVG supports SVG→PDF natively (valuable!), but its SVG2 coverage is weaker than resvg; on gradients and masks resvg wins. Prefer resvg for PNG, CairoSVG for PDF.
- **System:** [librsvg / rsvg-convert](https://gitlab.gnome.org/GNOME/librsvg) — ships on most Linux distros. `rsvg-convert -w 1024 logo.svg -o logo-1024.png`. Good fallback.
- **Browser / HTML→SVG→PNG:** [Satori](https://github.com/vercel/satori) (~11k stars) + resvg-js. Satori takes JSX/HTML/Tailwind and outputs SVG; feed that SVG to resvg-js for PNG. This is the canonical stack for dynamically generated OG images in Next.js 14+.

**SVG → PDF.**

- [CairoSVG](https://github.com/Kozea/CairoSVG): `cairosvg logo.svg -o logo.pdf`. Simplest.
- [Inkscape CLI](https://wiki.inkscape.org/wiki/Using_the_Command_Line) 1.0+: `inkscape logo.svg --export-type=pdf --export-filename=logo.pdf`. Highest SVG compliance, preserves vectors perfectly, handles text-to-outline conversion with `--export-text-to-path`.
- For designer delivery, Inkscape is the gold standard; for pipeline speed, CairoSVG.

**PNG → ICO (favicon).**

- Node: [png-to-ico](https://www.npmjs.com/package/png-to-ico) (~120k weekly downloads). `pngToIco(['logo-16.png','logo-32.png','logo-48.png'])` → Buffer with multi-resolution ICO.
- Node: [to-ico](https://github.com/kevva/to-ico) (~67k weekly downloads). Similar API.
- Node + sharp: [sharp-ico](https://www.npmjs.com/package/sharp-ico) — tight integration with sharp pipeline.
- Python: [Pillow](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#ico): `img.save('favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64)])`.
- System: ImageMagick `convert logo-16.png logo-32.png logo-48.png favicon.ico`.

A proper `favicon.ico` carries 16×16, 32×32, and 48×48 bundled — Windows Explorer picks 48, tab bars pick 16 or 32, and some legacy Android browsers still probe ICO over PNG.

**Multi-size PNG fanout (one function).**

The cleanest Node pattern is sharp from the master SVG:

```js
import sharp from 'sharp';
import toIco from 'png-to-ico';
import fs from 'node:fs/promises';

const svg = await fs.readFile('logo.svg');
const sizes = [16,32,48,64,128,180,192,256,512,1024];
const pngs = await Promise.all(
  sizes.map(s => sharp(svg).resize(s,s).png().toBuffer())
);
await Promise.all(sizes.map((s,i)=>fs.writeFile(`logo-${s}.png`,pngs[i])));

const icoSizes = [16,32,48];
const icoBuf = await toIco(icoSizes.map(s => pngs[sizes.indexOf(s)]));
await fs.writeFile('favicon.ico', icoBuf);
```

sharp delegates SVG rendering internally to librsvg; for higher fidelity replace with resvg-js. For Python the equivalent one-liner uses [pyvips](https://github.com/libvips/pyvips) or sharp's underlying [libvips](https://github.com/libvips/libvips) directly.

**Theme variants.** Dark and light logo variants are a one-line SVG transform: swap a CSS variable `fill="var(--logo-fg,#000)"` or use `<style>` with `@media (prefers-color-scheme: dark)`. For pipeline-level generation, apply an SVG DOM pass with [svg-parser](https://github.com/Rich-Harris/svg-parser) or [xmldom](https://github.com/xmldom/xmldom) that inverts or replaces fills.

**Monochrome variant.** Collapse all fills to a single color. The SVGO plugin `convertColors` with `currentColor: '#000'` or a custom post-process that walks the AST and replaces `fill` and `stroke`.

---

## Quality Comparisons

Quality comparison is the weakest link in the current open literature — there is no universally-accepted "logo vectorization" benchmark. What follows is synthesized from the [vtracer README benchmarks](https://github.com/visioncortex/vtracer), [the aisvg.app comparison writeup](https://www.aisvg.app/blog/image-to-svg-converter-guide), the [StarVector paper](https://openaccess.thecvf.com/content/CVPR2025/papers/Rodriguez_StarVector_Generating_Scalable_Vector_Graphics_Code_from_Images_and_Text_CVPR_2025_paper.pdf) (SVG-Bench), and practitioner reports.

**Vectorization fidelity (higher = fewer visible artifacts at 4× zoom).**

| Input type | Potrace | vtracer | AutoTrace | Vectorizer.AI | Illustrator IT | Recraft | StarVector |
|---|---|---|---|---|---|---|---|
| 2-color flat logo | ★★★★★ | ★★★★ | ★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★ |
| 4-color flat illustration | ✕ | ★★★★★ | ★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★ |
| Photorealistic | ✕ | ★★★ | ★★ | ★★★★ | ★★★★ | ★★★ | ★★ |
| Lettermark / text | ★★★★★ | ★★★★ | ★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ |
| Gradients / soft shadow | ✕ | ★★★ | ✕ | ★★★★ | ★★★★ | ★★★★ | ★★ |

**SVG compactness** (relative, vtracer output normalized to 1.0 on a 4-color 1024px logo):

- Potrace (monochrome): 0.3× (much smaller; only possible because 1 color)
- vtracer: 1.0×
- Illustrator Image Trace: 3–10×
- Vectorizer.AI: 0.7–1.2× (often smaller because of better shape merging)
- StarVector: 0.4–0.8× (native SVG primitives are terse but can repeat semantically)
- LIVE: 0.2–0.5× (layer-wise optimization produces minimal path counts — 5 paths where DiffVG needs 256)
- Raw diffvg output: 5–20×

**Latency (single 1024×1024 logo, M2 MBP or equivalent):**

- Potrace: <100 ms
- vtracer: 200–800 ms
- ImageTracerJS: 1–3 s
- AutoTrace: 500 ms – 2 s
- LIVE: 1–5 min (GPU)
- DiffVG optimization loop (SVGDreamer): 10–60 min (GPU)
- StarVector-8B inference: 1–5 s (A100)
- Recraft vectorize API: 1–3 s (network)

**Recommended defaults** for a prompt-to-asset product:

- Pure black-and-white target (lettermark, silhouette) → **potrace**.
- Everything else (the common case) → **vtracer**, with Recraft's API as the "premium quality" upsell.

---

## Reference Architectures

Three open-source repositories that implement a recognizable end-to-end version of this pipeline.

### 1. LogoLoom (mcpware/logoloom)

[LogoLoom](https://github.com/mcpware/logoloom) (MIT, Node + Electron) is the closest to the target architecture. It takes a prompt, calls an LLM that emits SVG directly, applies SVGO, and then generates a **31-file brand kit**: SVG master + PNGs at every common size + ICO + WebP + a branding-guidelines markdown. It runs entirely offline when pointed at a local LLM, which makes it an excellent reference for the "no cloud" story. The code is small (a few hundred LOC of orchestration) and the export list is directly copyable.

### 2. Chat2SVG (kingnobro/Chat2SVG)

[Chat2SVG](https://github.com/kingnobro/Chat2SVG) (219 stars, Python, CVPR 2025) is the research-grade reference for native vector. Its three-stage pipeline — Anthropic/OpenAI LLM for primitive layout, SDXL+ControlNet for detail hallucination, DiffVG for geometric refinement — is the strongest open-source implementation of "prompt to editable SVG" as of early 2026. The code demonstrates how to combine a text LLM and a differentiable vector renderer; it is slow but produces SVGs a designer will happily edit. Export is not wired (leaves you with SVG), so pair with sharp+resvg for the raster fanout.

### 3. Logomaker (manicinc/logomaker)

[Logomaker](https://github.com/manicinc/logomaker) (MIT, JS, Electron) is a fully-offline, no-AI baseline. It ships ~400 fonts, vector primitives, animated presets, and exports SVG, PNG, and animation frames. Useful as the "deterministic fallback" arm of a hybrid system — if the AI generation times out, drop through to a template-based generator. Good reference for the export code (multi-size rasterization, PNG sequence export for GIFs, favicon pack).

### 4. Honorable mentions

- [StarVector](https://github.com/joanrod/star-vector) — image-to-SVG via vision-language, the best current open model for icon-family generation.
- [SVGDreamer](https://github.com/ximinng/SVGDreamer) — the quality ceiling for text-to-SVG via VPSD, if you can pay the optimization cost.
- [LIVE](https://github.com/Picsart-AI-Research/LIVE-Layerwise-Image-Vectorization) — the compactness ceiling for raster-to-SVG, producing 5-path reconstructions where DiffVG produces 256.
- [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) (2.5k stars) — an end-to-end icon & splash generator focused on PWA/iOS/Android output specs, a strong reference for Stage 6 fanout.
- [capacitor-assets](https://github.com/ionic-team/capacitor-assets) — Ionic's asset generator for mobile app bundles, also covers Stage 6.

---

## Open-Source Libraries Table

| Library | Stage | Lang | Stars | License | One-line purpose |
|---|---|---|---|---|---|
| [Recraft V3 SVG API](https://recraft.ai/docs) | 2 | — | — | commercial | Native text-to-SVG |
| [StarVector](https://github.com/joanrod/star-vector) | 2/4 | Python | ~4.3k | Apache-2.0 | Vision-language model that emits SVG code |
| [SVGDreamer](https://github.com/ximinng/SVGDreamer) | 2 | Python | 435 | MIT | Diffusion-guided SVG via particle optimization |
| [SVGDreamer++](https://ximinng.github.io/SVGDreamer-project/) | 2 | Python | (in SVGDreamer repo) | MIT | Improved VPSD, Nov 2024 |
| [Chat2SVG](https://github.com/kingnobro/Chat2SVG) | 2 | Python | 219 | MIT | LLM + diffusion + DiffVG pipeline |
| [IconShop](https://github.com/kingnobro/IconShop) | 2 | Python | 400+ | Apache-2.0 | Autoregressive SVG icon synthesis (SIGGRAPH Asia 2023) |
| [LayerDiffuse](https://github.com/lllyasviel/LayerDiffuse) | 2 | Python | 3k+ | Apache-2.0 | SDXL finetune for true RGBA output |
| [rembg](https://github.com/danielgatis/rembg) | 3 | Python | 22.5k | MIT | Batteries-included background removal CLI/API |
| [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) | 3 | Python | 3k+ | MIT | SOTA high-resolution bilateral matting |
| [BRIA RMBG 2.0](https://huggingface.co/briaai/RMBG-2.0) | 3 | weights | — | CC-BY-NC-4.0 / commercial | Bria's matting model, beats BiRefNet in their eval |
| [U²-Net](https://github.com/xuebinqin/U-2-Net) | 3 | Python | 9.7k | Apache-2.0 | Legacy SOTA salient object detection |
| [SAM 2](https://github.com/facebookresearch/sam2) | 3 | Python | 10k+ | Apache-2.0 | Interactive segmentation |
| [vtracer](https://github.com/visioncortex/vtracer) | 4 | Rust | 5.7k | MIT | Fast color raster→SVG with spline fitting |
| [potrace](https://potrace.sourceforge.net/) | 4 | C | — | GPL-2.0 | The classic monochrome vectorizer |
| [autotrace](https://github.com/autotrace/autotrace) | 4 | C | ~700 | GPL-2.0 | Legacy centerline + outline tracer |
| [imagetracerjs](https://github.com/jankovicsandras/imagetracerjs) | 4 | JS | 1.5k | Unlicense | Browser raster→SVG |
| [DiffVG](https://github.com/BachiLi/diffvg) | 4 | Python/C++ | 1.2k | Apache-2.0 | Differentiable rasterizer for vector optimization |
| [LIVE](https://github.com/Picsart-AI-Research/LIVE-Layerwise-Image-Vectorization) | 4 | Python | ~400 | Apache-2.0 | Layer-wise vectorization (CVPR 2022) |
| [Img2Num](https://github.com/Ryan-Millard/Img2Num) | 4 | C++ | <100 | MIT | Fast image vectorization lib with JS/C bindings |
| [SVGO](https://github.com/svg/svgo) | 5 | Node | 22.4k | MIT | The standard SVG optimizer |
| [scour](https://github.com/scour-project/scour) | 5 | Python | 870 | Apache-2.0 | Python SVG optimizer/cleaner |
| [svgcleaner](https://github.com/RazrFalcon/svgcleaner) | 5 | Rust | 1.8k | GPL-2.0 | Rust SVG cleaner (superseded by usvg) |
| [usvg](https://github.com/linebender/resvg/tree/main/crates/usvg) | 5 | Rust | part of resvg | Apache-2.0/MIT | Normalizes SVG to minimal renderable subset |
| [resvg](https://github.com/linebender/resvg) | 6 | Rust | ~3.7k | Apache-2.0/MIT | Deterministic SVG→PNG rasterizer |
| [resvg-js](https://github.com/yisibl/resvg-js) | 6 | Node | ~2k | MPL-2.0 | Node/WASM bindings to resvg |
| [CairoSVG](https://github.com/Kozea/CairoSVG) | 6 | Python | 1.3k | LGPL-3.0 | SVG→PNG/PDF/PS via Cairo |
| [librsvg / rsvg-convert](https://gitlab.gnome.org/GNOME/librsvg) | 6 | Rust/C | — | LGPL-2.1 | System SVG renderer shipped by most distros |
| [Inkscape CLI](https://inkscape.org/) | 4/5/6 | C++ | — | GPL-3.0 | Swiss-army SVG app; headless via `--export-type` |
| [sharp](https://github.com/lovell/sharp) | 6 | Node | 30k+ | Apache-2.0 | libvips-backed Node image pipeline |
| [sharp-ico](https://www.npmjs.com/package/sharp-ico) | 6 | Node | <200 | MIT | ICO encode/decode on top of sharp |
| [png-to-ico](https://www.npmjs.com/package/png-to-ico) | 6 | Node | ~200 | MIT | PNG(s) → ICO buffer |
| [to-ico](https://github.com/kevva/to-ico) | 6 | Node | ~600 | MIT | Alternative PNG→ICO |
| [Pillow](https://github.com/python-pillow/Pillow) | 3/6 | Python | 12k+ | MIT-CMU | Python imaging library, handles ICO natively |
| [pyvips](https://github.com/libvips/pyvips) | 6 | Python | 700+ | MIT | libvips Python bindings, fast batch export |
| [libvips](https://github.com/libvips/libvips) | 6 | C | 10k+ | LGPL-2.1 | High-throughput image processing library |
| [ImageMagick](https://github.com/ImageMagick/ImageMagick) | 6 | C | 13k+ | ImageMagick | Universal but slower converter |
| [Satori](https://github.com/vercel/satori) | 6 (OG) | TS | ~11k | MPL-2.0 | HTML/JSX → SVG for OG/social images |
| [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) | 6 | Node | ~2.5k | MIT | E2E PWA icon/splash export |
| [capacitor-assets](https://github.com/ionic-team/capacitor-assets) | 6 | Node | ~200 | MIT | Ionic Capacitor asset generator |
| [LogoLoom](https://github.com/mcpware/logoloom) | 2–6 | Node | <100 | MIT | Full prompt→31-file brand kit |
| [Logomaker](https://github.com/manicinc/logomaker) | 2–6 | JS | <100 | MIT | Offline template-based logo generator |

---

## Practitioner Recipe (Copy-Pasteable Default)

```bash
# 1. Generate raster (fall back from Recraft V3 SVG)
curl -X POST https://external.api.recraft.ai/v1/images/generations \
  -H "Authorization: Bearer $RECRAFT_KEY" \
  -d '{"prompt":"flat vector logo, notebook icon, minimal, 3 colors",
       "style":"vector_illustration","size":"1024x1024"}' \
  | jq -r '.data[0].url' | xargs curl -o raw.png

# 2. Matte
rembg i -m birefnet-general --alpha-matting raw.png matte.png

# 3. Flatten to white (vectorizers need opaque input)
python -c "from PIL import Image; a=Image.open('matte.png').convert('RGBA'); \
  bg=Image.new('RGB',a.size,(255,255,255)); bg.paste(a,mask=a.split()[3]); \
  bg.save('flat.png')"

# 4. Vectorize
vtracer --input flat.png --output raw.svg \
  --mode spline --colormode color \
  --filter_speckle 4 --color_precision 6 \
  --layer_difference 16 --corner_threshold 60

# 5. Optimize
svgo raw.svg -o logo.svg --multipass --precision 2 \
  --enable=removeDimensions,cleanupIds,mergePaths

# 6. Fanout
for s in 16 32 48 64 128 180 192 256 512 1024; do
  resvg --width $s logo.svg logo-$s.png
done
png-to-ico logo-16.png logo-32.png logo-48.png > favicon.ico
cairosvg logo.svg -o logo.pdf
```

This is ~20 lines of shell for a full-stack logo pipeline with genuine production quality.

---

## Failure Modes to Watch

1. **Checker-pattern backgrounds.** Models (especially Gemini) claim transparency and ship a 16×16 checker. Always run a checker detector before matting.
2. **Rainbow halos.** Diffusion edges have a 1–3 pixel chromatic halo. vtracer will faithfully render this as dozens of thin color layers, bloating the SVG. Solution: median/bilateral filter before vectorizing, or tighten `filter_speckle` to 8+.
3. **Text corruption.** Everything that isn't Recraft/Ideogram/StarVector will produce near-but-not-quite-real text. Either (a) keep the generated wordmark but re-type it in the final SVG with a real font, or (b) rasterize text to paths via Inkscape (`--export-text-to-path`).
4. **Over-simplification.** SVGO's `convertPathData` with `precision=0` turns 0.9999 into 1, which sounds fine until you notice your circular logo is a hexagon. Keep `precision=2` minimum.
5. **ICO size mismatch.** `png-to-ico` and `to-ico` both require the input PNGs to be *exactly* the target sizes, not larger. Pre-resize with sharp to avoid silent corruption.
6. **macOS "blank favicon" bug.** Safari caches `favicon.ico` at 16×16 only; if your ICO lacks the 16×16 layer Safari will fall back to a blank icon. Always bundle 16+32+48 minimum.
7. **SVG not rendering on Android WebView.** Older WebViews choke on SVG2 features. Run `usvg --strict` or SVGO with `--enable=removeUnknownsAndDefaults` to force SVG 1.1 compliance.
8. **Color drift on PNG export.** sharp defaults to sRGB but librsvg may render in linear-light. If your exported PNGs look paler than the SVG preview, explicitly set `sharp(buf).toColorspace('srgb').png()`.

---

## References

**Native vector generation**

- [Recraft API documentation](https://recraft.ai/docs) — commercial SVG generation and vectorize endpoints
- Rodriguez et al., *StarVector: Generating SVG Code from Images and Text*, CVPR 2025 — https://starvector.github.io/starvector/
- Xing et al., *SVGDreamer: Text Guided SVG Generation with Diffusion Model*, CVPR 2024 — https://arxiv.org/abs/2312.16476
- *SVGDreamer++*, Nov 2024 — https://ximinng.github.io/SVGDreamer-project/
- Wu et al., *Chat2SVG: Vector Graphics Generation with LLMs and Image Diffusion Models*, CVPR 2025 — https://chat2svg.github.io/
- Zhang et al., *Transparent Image Layer Diffusion using Latent Transparency*, arXiv 2402.17113 — https://github.com/lllyasviel/LayerDiffuse
- *IconShop*, SIGGRAPH Asia 2023 — https://github.com/kingnobro/IconShop

**Matting / background removal**

- [rembg](https://github.com/danielgatis/rembg)
- Zheng et al., *BiRefNet*, CAI 2024 — https://github.com/ZhengPeng7/BiRefNet
- [BRIA RMBG 2.0](https://huggingface.co/briaai/RMBG-2.0)
- Qin et al., *U²-Net*, Pattern Recognition 2020 — https://github.com/xuebinqin/U-2-Net
- [Segment Anything 2](https://github.com/facebookresearch/sam2)

**Vectorization**

- [vtracer](https://github.com/visioncortex/vtracer) (visioncortex, 5.7k stars)
- Selinger, *Potrace: a polygon-based tracing algorithm*, 2003 — https://potrace.sourceforge.net/potrace.pdf
- [AutoTrace](https://github.com/autotrace/autotrace)
- Li et al., *DiffVG: Differentiable Vector Graphics Rasterization for Editing and Learning*, SIGGRAPH Asia 2020 — https://people.csail.mit.edu/tzumao/diffvg/
- Ma et al., *LIVE: Towards Layer-wise Image Vectorization*, CVPR 2022 — https://arxiv.org/abs/2206.04655
- [ImageTracerJS](https://github.com/jankovicsandras/imagetracerjs)
- [Vectorizer.AI](https://vectorizer.ai/api) — commercial benchmark
- Wikipedia, *Comparison of raster-to-vector conversion software* — https://en.wikipedia.org/wiki/Comparison_of_raster_to_vector_conversion_software

**Cleanup**

- [SVGO](https://github.com/svg/svgo) (svg, 22.4k stars)
- [scour](https://github.com/scour-project/scour)
- [svgcleaner](https://github.com/RazrFalcon/svgcleaner)
- [usvg](https://github.com/linebender/resvg/tree/main/crates/usvg)
- [Inkscape CLI reference](https://wiki.inkscape.org/wiki/Using_the_Command_Line)

**Multi-format export**

- [resvg](https://github.com/linebender/resvg) / [resvg-js](https://github.com/yisibl/resvg-js)
- [CairoSVG](https://github.com/Kozea/CairoSVG)
- [librsvg / rsvg-convert](https://gitlab.gnome.org/GNOME/librsvg)
- [sharp](https://github.com/lovell/sharp) + [sharp-ico](https://www.npmjs.com/package/sharp-ico)
- [png-to-ico](https://www.npmjs.com/package/png-to-ico), [to-ico](https://github.com/kevva/to-ico)
- [Satori](https://github.com/vercel/satori) for OG images
- [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator), [capacitor-assets](https://github.com/ionic-team/capacitor-assets)

**End-to-end reference repos**

- [LogoLoom](https://github.com/mcpware/logoloom)
- [Logomaker](https://github.com/manicinc/logomaker)
- [Chat2SVG](https://github.com/kingnobro/Chat2SVG)
- [Img2Num](https://github.com/Ryan-Millard/Img2Num)

**Commentary / third-party comparisons**

- Simon Willison on vtracer (2024) — https://simonwillison.net/2024/Oct/7/vtracer
- *Potrace vs ImageTrace vs VTracer*, aisvg.app — https://www.aisvg.app/blog/image-to-svg-converter-guide
- Bria, *RMBG 2.0 vs BiRefNet vs Photoshop benchmark* — https://blog.bria.ai/brias-new-state-of-the-art-remove-background-2.0-outperforms-the-competition
