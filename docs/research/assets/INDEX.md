# Open-Source Assets & Resources — Research Index

Fifty-one parallel web-research subagents investigated the OSS, free-media, and reference-asset landscape
for every stage of the `prompt-to-asset` pipeline
(`classify → route → rewrite → generate → matte → vectorize → upscale → platform-export → validate`).

Each file in this folder is a standalone report with licenses, URLs, maintenance status, and integration notes.
This index summarises the top picks per report and lists any hard license hazards surfaced along the way.

Every pick below is commercial-use-safe **unless flagged otherwise**.

---

## 1. Generation & post-processing cores

| # | Report | Top picks | Key hazards |
|---|---|---|---|
| 01 | [Background removal models](./01-background-removal-models.md) | `BiRefNet` (MIT) + `rembg` with `birefnet-general` session; `transparent-background` (InSPyReNet, MIT) as fallback | BRIA RMBG 1.4/2.0 = CC-BY-NC; RobustVideoMatting = GPL-3 |
| 02 | [Vectorization tools](./02-vectorization-tools.md) | `vtracer` (MIT, Rust + WASM) via `@neplex/vectorizer`; `potrace`/`autotrace` only for mono/centerline | potrace + autotrace are GPL-2 — prefer WASM builds |
| 03 | [Upscalers & refiners](./03-upscalers-refiners.md) | Flat: `waifu2x-ncnn-vulkan` (MIT). Photo: `RealESRGAN_x4plus` (BSD-3). Loader: `spandrel` (MIT); registry: OpenModelDB | Most famous community upscalers (`4x-UltraSharp`, `4x-AnimeSharp`, `4x-Remacri`) are CC-BY-NC; SUPIR = NOASSERTION |
| 04 | [SVG optimization](./04-svg-optimization.md) | SVGO v4 with custom preset (keep viewBox/title/desc; `collapseGroups: false`); `svgson` for structural normalization; `svg-path-commander` for path surgery | svgcleaner archived; scour is Python-deps-only |
| 05 | [Image processing libs](./05-image-processing-libs.md) | Primary: **`sharp` (Apache-2.0, libvips)**. SVG rasterize: `@resvg/resvg-js`. ICO: `sharp-ico`. Fallback: `jimp` | `@resvg/resvg-js` system-font scan costs 300–1500 ms — pre-load fonts; pin sharp ↔ libvips |
| 06 | [OSS diffusion models](./06-oss-diffusion-models.md) | **FLUX.2 [klein] 4B** (Apache-2) for text-heavy; FLUX.1 [schnell] (Apache-2) photo; SDXL (RAIL++) + LayerDiffuse for native alpha; PixArt-Σ (Apache) | FLUX.1/2-dev = non-commercial; SD 3.5 gated at $1M rev; HunyuanDiT excludes EU; Stable Cascade non-commercial |
| 07 | [Commercial-safe LoRAs](./07-commercial-safe-loras.md) | Train on `ostris/FLUX.1-schnell-training-adapter`; safe picks: `h94/IP-Adapter`, `ByteDance/SDXL-Lightning`; verify Civitai permission icons | Almost every Flux Dev LoRA is non-commercial — inherits base license |
| 08 | [IP-Adapter & ControlNet](./08-ip-adapter-controlnet.md) | SDXL: `xinsir/controlnet-union-sdxl-1.0 ProMax` + IP-Adapter Plus style-only; Flux: `Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro 2.0`. Mark-enforcement trick: ControlNet QR-Code-Monster on logo silhouette | InstantID requires InsightFace (non-commercial); BFL Flux tools inherit Flux-dev non-commercial |

---

## 2. Icons, fonts, emoji, templates

| # | Report | Top picks | Hazards |
|---|---|---|---|
| 09 | [Icon collections](./09-icon-collections.md) | Lucide (ISC) · Tabler (MIT) · Phosphor Duotone (MIT) · Material Symbols variable font (Apache-2) · Fluent UI Icons (MIT) · Carbon (Apache-2) · Simple Icons (CC0 paths, trademarks still apply) | **Remix Icon relicensed Jan 2026** to custom "Remix Icon License v1.0"; npm metadata still says Apache — verify before bundling |
| 10 | [Iconify ecosystem](./10-iconify-ecosystem.md) | Bundle curated `@iconify-json/<prefix>` packages (mdi, lucide, tabler, ph, carbon, heroicons, simple-icons, twemoji); use `@iconify/utils` for offline lookup; filter by `info.license.spdx` | — |
| 11 | [Emoji libraries](./11-emoji-libraries.md) | Ship Microsoft **Fluent Emoji** (MIT) + **Noto Emoji** (Apache-2); use jdecked **Twemoji** v17 (code MIT, art CC-BY) for Satori `loadAdditionalAsset`; data table: `unicode-emoji-json` | OpenMoji = CC BY-SA (viral); JoyPixels = personal-use; Mutant Standard = CC BY-NC |
| 12 | [Open fonts](./12-open-fonts.md) | Inter, Geist, JetBrains Mono, Playfair Display, Noto Sans — all OFL via Fontsource/upstream GitHub | Fontshare ships under ITF EULA — not OSS despite "free" marketing |
| 13 | [Font subsetting](./13-font-subsetting.md) | `subset-font` (MIT, HarfBuzz-wasm) at build time → WOFF for Satori, TTF for resvg | **Satori does not support WOFF2** — use TTF/OTF/WOFF only |
| 14 | [OG-image generators](./14-og-image-generators.md) | **Satori + `@resvg/resvg-js`** as default (50–200 ms, deterministic); Playwright as fallback for CSS Grid / browser-identical output; `Takumi` (Rust) as 2–10× faster emerging alt | Satori is Flexbox-only; Twemoji CDN retired — self-host |
| 15 | [App icon fan-out](./15-app-icon-fanout.md) | Build a **sharp-based custom generator** composing `sharp`+`sharp-ico`+`icon-gen`; reuse `@capacitor/assets` input conventions | `@capacitor/assets` lacks Android 13 monochrome (open since 2022); `cordova-res` unmaintained; RN-make fork only |
| 16 | [Favicon tools](./16-favicon-tools.md) | `favicons` (itgalaxy, MIT) — filter to minimal 6-file spec; or hand-assemble with sharp + `png-to-ico` (MIT) | Modern minimal spec = `favicon.ico` (32×32) + `icon.svg` + `apple-touch-icon` + manifest 192/512 + maskable |
| 17 | [Adaptive icon specs](./17-adaptive-icon-specs.md) | Spec rules MUST encode: iOS main/tinted **no alpha** / dark **must be transparent**; sRGB only; Android 108 dp canvas with 72/66 dp safe zones; separate `any` vs `maskable` vs `monochrome` entries; iOS still needs `<link rel="apple-touch-icon">` in HTML | visionOS uses `.solidimagestack`, not Xcode 26 `.icon` |

---

## 3. Datasets, stock, illustration, mockups, 3D

| # | Report | Top picks | Hazards |
|---|---|---|---|
| 18 | [Logo datasets](./18-logo-datasets.md) | Ship curated ~1.4 k eval fixtures: SimpleIcons CC0 subset + synthetic OFL wordmarks + L3D (CC-BY 4.0) + CC0 Wikimedia marks | Dataset license ≠ trademark permission; LLD / WebLogo / Logo-2K+ / FlickrLogos / OpenLogo / BelgaLogos / LogoDet-3K are research-only |
| 19 | [Stock photo APIs](../future/asset-19-stock-photo-apis.md) | **Pexels** (primary — 200/hr → unlimited on request) + **Pixabay** (CC0-equivalent fallback). Openverse = v2. Unsplash opt-in only | Unsplash requires mandatory hotlinking + download-ping + UTM attribution; AI/ML terms ambiguous |
| 20 | [Illustration sets](../future/asset-20-illustration-sets.md) | Open Peeps + Humaaans (CC0) + Open Doodles (CC0) + unDraw (MIT) + IRA Design (MIT) | Storyset, Absurd Design, DrawKit have mandatory attribution or forbid AI training/merch |
| 21 | [3D assets & mockups](../future/asset-21-3d-assets-mockups.md) | Poly Haven HDRIs/textures/models (CC0 + API), ambientCG, Quaternius, Kenney 3D. Render: Blender headless (bpy) + three.js `SVGLoader→ExtrudeGeometry`; normalize via `@gltf-transform/cli` | Free3D + CGTrader free tier unsafe for automated ingest |
| 48 | [Mockup libraries](../future/asset-48-mockup-libraries.md) | Browser frames: `zachleat/browser-window` (MIT) + `@magnit-ce/browser-mockup` (MIT). Composition: `mockupgen` + `perspective.js` + `sharp.composite` | **No safe CC0/MIT device-bezel library exists** — draw generic bezels with `marcbouchenoire/dimmmensions`; Apple/Samsung logos in `pixelsign/html5-device-mockups` bitmaps |

---

## 4. Color, tokens, design systems

| # | Report | Top picks | Notes |
|---|---|---|---|
| 22 | [Patterns & gradients](../future/asset-22-patterns-gradients.md) | Vendor `svg-patterns` (ISC) + uiGradients (MIT) + `@mesh-gradient/core` (MIT); own in-repo algorithmic generators (`feTurbulence`, dots, stripes) | Hero Patterns = CC BY 4.0 (attribution); `pattern-io` doesn't exist |
| 23 | [Color palette libs](./23-color-palette-libs.md) | **Extract: `node-vibrant` v4** (6-swatch semantic). **Color science: `culori`** (OKLab/OKLCH/P3/Rec2020 + ΔE2000, ~5× faster than colorjs.io) | Pick *one* science lib at runtime — ΔE values differ slightly between impls |
| 24 | [ΔE & color-difference](./24-delta-e-libs.md) | `culori.differenceCiede2000()`. Brand-lock threshold: ΔE00 < 2 pass · 2–5 warn · > 5 fail | Legacy `delta-e` npm & `python-colormath` have Sharma 2005 bugs |
| 25 | [WCAG contrast & a11y](./25-wcag-contrast-libs.md) | `culori.wcagContrast()` as the gate; `colorjs.io contrastAPCA` advisory. Favicon sampling: edge-ring dominant = BG, interior dominant = FG; dual-test vs `#fff` + `#0b0f14` | Skip axe/Pa11y/Lighthouse for raw bitmap color checks |
| 26 | [DTCG tooling](./26-design-tokens-dtcg.md) | Canonical internal: **DTCG 2025.10 JSON**. Validate with `@paths.design/w3c-tokens-validator` + Terrazzo; emit via Style Dictionary v5 (CSS vars + Tailwind preset) | AdCP `brand.json` fields not in DTCG → nest under `$extensions.com.promptToAsset.brand.*` |
| 27 | [Open design systems](./27-open-design-systems.md) | Ship 3 reference fixtures: **Radix Colors/Themes** (MIT) + **Primer primitives** (DTCG reference) + shadcn/ui `globals.css` baseline. Optional: daisyUI 35 themes for style transfer | Polaris standalone repo archived; Fluent 2 canonical token repo private |

---

## 5. Validation, safety, VLM judges, OCR

| # | Report | Top picks | Hazards |
|---|---|---|---|
| 28 | [Visual diff & screenshot testing](../future/asset-28-visual-diff-testing.md) | `pixelmatch` (primary) · `odiff` (SIMD alt) · `ssim.js` (perceptual); alpha probes via `sharp`; checkerboard = compose 3 cheap probes, no turnkey lib | Skip BackstopJS/reg-suit/`toHaveScreenshot` for raw-asset Tier-0 |
| 29 | [Perceptual hashing](../future/asset-29-perceptual-hashing.md) | Hybrid: SHA-256 exact → `sharp-phash` + `blockhash-core` pHash/dHash → **DINOv2-small** (Transformers.js ONNX) for semantic near-dup → optional CLIP re-rank → Fourier descriptors on vtracer outlines | `pHash.org` & `phashion` are GPLv3 — use `sharp-phash` / `imagededup` instead |
| 30 | [OCR engines](./30-ocr-engines.md) | **RapidOCR (PP-OCRv5 weights) via `onnxruntime-node`** through `paddleocr.js`/`@gutenye/ocr-node` (Apache-2). Fallback cascade: glyph-normalize → upscale → VLM → hard fail | `surya-ocr` = GPL-3 + RAIL-M; Tesseract weaker on stylized text |
| 31 | [Open VLMs as judges](./31-open-vlms-judges.md) | Default: **Qwen2.5-VL-3B-Instruct (AWQ-4bit)** via vLLM + `guided_json` (~6 GB VRAM). Premium: Qwen2.5-VL-72B. Optional OCR feature extractor: Florence-2-large. CPU screener: moondream2 | Florence-2 is prompt-token-driven, can't follow free-form rubrics |
| 32 | [T2I datasets & benchmarks](./32-t2i-datasets-benchmarks.md) | **HPS v2.1** (rewrite before/after signal) + **ImageReward** (3-axis diagnostic) + **LAION aesthetic predictor** (quality gate) + **T2I-CompBench++** (composition regression) + PartiPrompts/DrawBench as prompt fixtures | Use Re-LAION-5B metadata post-Aug 2024 for CSAM safety |
| 33 | [Prompt-rewriter OSS](./33-prompt-rewriters-oss.md) | Study Hunyuan PromptEnhancer (24-key-point T2I taxonomy), Fooocus `FooocusExpansion` (GPT-2 + constrained decoding), DSPy optimizers. Train dialect LoRAs on `8y/Pick-High-Dataset` (360k pairs) + `poloclub/diffusiondb` (1.8M CC0) | Lexica / PromptHero live corpora unsafe to redistribute |
| 46 | [Image moderation](../future/asset-46-image-moderation-oss.md) | **`Falconsai/nsfw_image_detection` ONNX** under `onnxruntime-node` (Apache-2, 98% acc, 36 M mo downloads). Fallback ensemble: `nsfwjs` (MIT). Violence: `jaranohaal/vit-base-violence-detection`. Thresholds: block ≥ 0.85 NSFW; both models must agree in 0.50–0.85 band | NudeNet + YOLOv8 = AGPL-3 (blocks bundling); CompVis safety checker has documented FPs + bypass papers |
| 47 | [Fake-transparency detection](./47-fake-transparency-detection.md) | Layered strategy using **sharp alone**: `stats().isOpaque` triage → alpha histogram/entropy → edge-ring uniformity (single-color bleed) → 2-color + block-alternation test for baked checker → JS connected-components (40 LOC) → `sharp.trim` safe-zone bbox. Escalate to ndarray FFT only on ambiguous cases. Prior art: `jenissimo/unfake.js` | — |
| 49 | [Accessibility testing](./49-accessibility-testing.md) | axe-core via `@axe-core/playwright`; Lighthouse for manifest audits (`installable-manifest`, `maskable-icon`, `apple-touch-icon`); `@capsizecss/metrics` + sharp for bespoke checks. 10-item concrete checklist in the doc | Lighthouse `maskable-icon` only checks the manifest declaration — must build pixel-level safe-zone check ourselves |

---

## 6. Format encoders, renderers, motion

| # | Report | Top picks | Hazards |
|---|---|---|---|
| 37 | [Image format encoders](./37-image-format-encoders.md) | sharp/libvips already ships MozJPEG + libwebp + libavif + libheif. Bolt on **oxipng** (MIT) + **SVGO** + **sharp-ico** | `libimagequant`/`pngquant` = **GPL-3** → disable sharp's `palette:true`; libheif wraps **x265 (GPL-2)** → HEIC decode only, never emit; jpegli worth watching (-20–35% vs MozJPEG) |
| 38 | [SVG-to-PNG renderers](./38-svg-to-png-renderers.md) | **`@resvg/resvg-js`** primary (83% W3C, 50–200 ms, hermetic font loading); Playwright fallback for `<foreignObject>`/SVG 2 filters | Don't feed user SVGs to sharp's librsvg path — LGPL + ignores `@font-face` |
| 39 | [HTML-to-SVG templating](./39-html-to-svg-templating.md) | Default: **Satori + `satori-html`** (inline HTML string). Opt-in `--renderer takumi` path (Rust/WASM, Grid support, 2–10× faster). Post-process every SVG through `svgson` for id-prefixing and palette rewrites. Steal template conventions from `vercel/satori/playground/` and `nuxt-modules/og-image` | — |
| 40 | [Blender / Inkscape / parametric](./40-blender-inkscape-vector-tools.md) | **Inkscape 1.3+ CLI** for canonical SVG normalization (`--export-text-to-path` + batch actions); **Blender headless** via `bpy` for 3D-extruded SVG logos + CC0 HDRIs; **Maker.js** (Apache-2) for parametric wordmarks | Figma REST cannot *create* nodes (export-only); **Penpot (AGPL-3)** is the only OSS design tool with a write API |
| 41 | [SVG manipulation libs](./41-svg-manipulation-libs.md) | CAG/offset: `paper.js` + `paperjs-offset` (MIT). Stroke-to-fill for tiny ICOs: `oslllo-svg-fixer` (11× faster, potrace-retrace). Path `d`: `svg-path-commander`. DOM: `@svgdotjs/svg.js` + `svgdom` (both MIT) | `paper-jsdom-canvas` archived; `svgson` stale since Jul 2023 (no CVEs, safe) |
| 42 | [SVG motion animation](../future/asset-42-svg-motion-animation-libs.md) | **GSAP now fully free (2024, MIT-equivalent)** incl. DrawSVG/MorphSVG/MotionPath/SplitText. `anime.js v4` (MIT) lightweight alt. `motion` (formerly Framer Motion, MIT) merged with Motion One. Export via `ed-asriyan/lottie-converter` + `puppeteer-lottie` | GSAP still restricted inside no-code builders that compete with Webflow |
| 43 | [Lottie / Rive ecosystem](../future/asset-43-lottie-rive-ecosystem.md) | Runtimes (all bundleable): lottie-web (MIT), dotLottie (MIT), skottie (BSD-3), lottie-ios/android (Apache-2), Rive runtimes (MIT). Asset pools: **Rive Community (CC BY 4.0)** and MIT-licensed standalone GitHub Lottie packs | LottieFiles free = proprietary Lottie Simple License (share-alike, no aggregation); Premium + IconScout packs forbid redistribution |

---

## 7. Orchestration, MCP interop, audio, CC0

| # | Report | Top picks | Notes |
|---|---|---|---|
| 34 | [Diffusion orchestrators](./34-diffusion-orchestrators.md) | Primary: **ComfyUI** via REST/WS (GPL-3 tolerable — out-of-process) driven by `@stable-canvas/comfyui-client` or `comfyui-node`. Secondary: `diffusers` in thin FastAPI worker (Apache-2 end-to-end) | A1111/Forge/reForge = **AGPL-3** — skip for hosted MCP; Invoke (Apache-2) swap-in |
| 35 | [ComfyUI custom nodes](./35-comfyui-custom-nodes.md) | Lean 7-pack: Manager + Impact Pack + KJNodes + rgthree + IPAdapter_plus + controlnet_aux (+ xinsir Union ProMax) + LayerDiffuse | Skip Easy-Use (AGPL-3), WAS-node-suite (archived), InstantID/PhotoMaker (non-commercial insightface), AnimateDiff |
| 36 | [MCP servers for image/media](./36-mcp-servers-image-media.md) | Replicate official MCP (multi-model router), Comfy Cloud MCP, Figma Dev Mode + Framelink, Playwright MCP, Iconify MCP, Google Fonts MCP, Coolors MCP | Puppeteer MCP archived — skip |
| 44 | [Open audio & SFX](../future/asset-44-open-audio-sfx.md) | Future reel/sting pipeline: **Pixabay Audio** (CC0-equivalent) + **Freesound CC0 subset**. CC-BY (Incompetech, ccMixter, Musopen) only with credits sidecar. Tools: ffmpeg LGPL build + librosa (ISC) | `audiowaveform` is **GPL-3** — subprocess only; YouTube Audio Library / Zapsplat / Soundsnap all closed |
| 45 | [CC0 / PD aggregators](../future/asset-45-cc0-pd-aggregators.md) | Ship 3 adapters first: **Openverse** (`license_type=public`), **Met Museum** (80 req/s, no key, 470 k+ CC0), **NASA Image/Video Library** (140 k PD incl. video+audio). Unified `AssetResult` schema with `license`, `attributionText` | Mixed-license sources (Wikimedia, Europeana, IA) need per-item parsing |

---

## 8. Brand interchange, prior art, vocabulary

| # | Report | Top picks | Notes |
|---|---|---|---|
| 50 | [OSS brand-in-a-box prior art](./50-oss-brand-in-a-box-prior-art.md) | **Emit AdCP `brand.json` + W3C DTCG tokens** as the interchange layer. Closest prior art: LogoLoom (MIT, brand-kit fan-out), LogoCreator (MIT, Nutlope), Branding MCP / Brand Forge / BrandSpec. Lesson: treat model as a proposer in a critique-and-select loop; vector-native beats raster-then-vectorize for quality | Flux Dev-based logo LoRAs exist (Shakker-Labs, prithivMLmods) but inherit Flux-dev non-commercial license |
| 51 | [Prompt-corpus taxonomies](./51-prompt-corpus-taxonomies.md) | **DiffusionDB** (CC0, 1.8 M) + **Fooocus `sdxl_styles/` + twri/sdxl_prompt_styler** (as seed style ontology) + **Gustavosta/Stable-Diffusion-Prompts** (MIT, fine-tune set) + `banteg/stable-diffusion-artists.csv` (per-artist category tags) + hand-curated ~100-token photography vocab | Lexica / PromptHero / Krea `open-prompts` unsafe to redistribute |

---

## Consolidated license-hazard quickref

**Blocklisted for commercial bundling** (found recurring across reports):

- **GPL/AGPL copyleft that propagates across network or link**: A1111, Forge, reForge (AGPL-3); NudeNet + Ultralytics YOLOv8 (AGPL-3); Easy-Use Comfy pack (AGPL-3); `jonnyjackson26/device-frames-core` (AGPL-3); `audiowaveform` (GPL-3, use subprocess only); `libimagequant`/`pngquant` (GPL-3); libheif + x265 HEIC encode path (GPL-2); Synfig (GPL, outputs OK).
- **Non-commercial / research-only model weights**: FLUX.1-dev + FLUX.2-dev; Stable Cascade / Würstchen; BRIA RMBG 1.4 & 2.0; SUPIR (NOASSERTION); InstantID (InsightFace antelopev2); most Civitai Flux-Dev LoRAs; every logo-dataset above except L3D / SimpleIcons-CC0.
- **Non-commercial community upscalers**: `4x-UltraSharp`, `4x-AnimeSharp`, `4x-Remacri` (CC-BY-NC-SA). Use DAT-2 / RGT / SPAN CC-BY-4.0 / CC0 checkpoints.
- **Attribution-mandatory (must emit a credits sidecar)**: Twemoji art (CC-BY), Incompetech music, ccMixter CC-BY, Hero Patterns (CC BY 4.0), Rive Community free `.riv`, Wikimedia Commons per-file CC-BY, Openverse `CC-BY*` results.
- **Trademark, not copyright**: Simple Icons path data is CC0 but the marks are other people's trademarks; L3D (EUIPO trademark registry) is CC-BY-4 as a dataset but every record is still someone's brand. Dataset license ≠ permission to use the mark.
- **Silently-changed license**: **Remix Icon relicensed Jan 2026** — npm still reads "Apache-2.0" but current terms are a custom "Remix Icon License v1.0".

---

## Recommended first-order dependency set

Based on the cross-report consensus, the smallest shippable dependency graph that covers the whole pipeline:

| Stage | Primary | Secondary |
|---|---|---|
| Prompt rewrite | Own small LLM + DiffusionDB/Fooocus style seeds | DSPy optimizers |
| Generation router | Replicate MCP for hosted; ComfyUI REST for self-host | `diffusers` + FastAPI worker (Apache-2-only profile) |
| Matting | `rembg` with `birefnet-general` session | `transparent-background` (InSPyReNet) |
| Vectorize | `vtracer` via `@neplex/vectorizer` | `potrace` WASM (mono) · `autotrace` GPL subprocess (centerline) |
| Upscale | `waifu2x-ncnn-vulkan` (flat) · Real-ESRGAN (photo) | `spandrel` + OpenModelDB CC0/BY weights |
| SVG optimize | SVGO (custom preset) | `svgson` + `svg-path-commander` |
| Raster ops | `sharp` + `sharp-ico` + `oxipng` | `@resvg/resvg-js` for SVG→PNG; Playwright fallback |
| OG image | Satori + `satori-html` + `@resvg/resvg-js` + subsetted WOFF fonts | Takumi (Rust) experimental path |
| App icon fan-out | Custom sharp-based generator owning Android 13 monochrome + maskable + visionOS | (there is no safe off-the-shelf) |
| Favicon | `favicons` (filtered to 6-file minimal spec) or hand-assembled with sharp+`png-to-ico` | — |
| Fonts | Fontsource OFL static TTF (Inter/Geist/JetBrains Mono/Playfair/Noto) + `subset-font` at build | — |
| Icons | Curated `@iconify-json/*` data packs + `@iconify/utils` | Simple Icons CC0 (flag trademark usage) |
| Illustrations | Open Peeps + Humaaans + Open Doodles + unDraw + IRA Design | — |
| Color extract | `node-vibrant` v4 | `extract-colors` for tiny bundles |
| Color science | `culori` (OKLCH, P3, ΔE2000, WCAG) | — |
| Design tokens | Own DTCG 2025.10 canonical model; validate with `@paths.design/w3c-tokens-validator`; emit via Style Dictionary v5 | Terrazzo for import |
| Validators | sharp probes + pixelmatch + ssim.js + RapidOCR + Falconsai NSFW + Qwen2.5-VL-3B judge + Lighthouse manifest | DINOv2 + CLIP re-rank for brand-similarity |
| Interchange | **AdCP `brand.json` + DTCG tokens** as the emitted brand bundle | — |

---

Every entry above traces back to a specific numbered file in this folder with URLs, versions, licenses, and integration code.
