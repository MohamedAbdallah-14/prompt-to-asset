---
title: "Prompt Enhancement for AI-Generated Software Development Assets — Master Synthesis"
scope: "Logos, app icons, favicons, OG images, UI illustrations, vector/SVG, transparent backgrounds, brand assets"
models_covered: [Gemini 2.x / Imagen 3/4, gpt-image-1 / gpt-image-1.5, DALL·E 3, Stable Diffusion 1.5/2.1/XL, Flux.1/.2/Pro/Kontext, Midjourney v6/v7, Ideogram 2/2a/3, Recraft V2/V3, Firefly 3, Leonardo, Playground, Krea, Lumalabs Photon]
date: 2026-04-19
categories_synthesized: 20
angle_files_synthesized: 104
---

# Prompt Enhancement for AI-Generated Software Development Assets — Master Synthesis

## Executive Summary

**The single biggest insight: producing production-grade software assets from text-to-image models is a *routing and post-processing* problem, not a prompt-engineering problem.** Across 20 categories and 104 angle files, every category arrives at variations of the same conclusion: the user's raw prompt is not what the model was trained on, no single model can satisfy the full asset taxonomy (logo + app icon + favicon + OG + illustration + transparent + vector), and the hardest failures (checkerboard "transparency," misspelled logo text, raster-only SVG, brand drift across a set) are architectural limits that **cannot be fixed with prompt tricks**. They are fixed by classifying intent, routing to the right model, and owning a deterministic post-processing pipeline (matting, vectorization, platform packaging, validation, repair).

For a builder of a prompt-to-asset plugin that lives inside AI coding assistants (Cursor, Claude Code, Codex, Gemini CLI, Copilot), the practical implications are:

1. **Make the product the pipeline, not the prompt.** The compound engineering win is: classify asset type → select model by capability → rewrite prompt in the model's dialect → generate → deterministic post-process (matte, vectorize, pack) → validate (alpha, text, palette, safe zone) → repair or regenerate. "Enhancer" is the whole loop, not step 3 (see 19d, 14, 16, 18).
2. **Transparency is a capability routing decision.** No amount of `, transparent background, alpha channel, PNG` coerces Imagen 4 or SD 1.5 into RGBA. Send transparency requests to `gpt-image-1` (`background: "transparent"`), Ideogram 3 Turbo (`style: "transparent"`), Recraft (native SVG), or LayerDiffuse-enabled SDXL/Flux. For every other model, matte with BiRefNet / BRIA RMBG-2.0 after generation (see 13, 04, 05).
3. **Brand text should not come out of a diffusion sampler.** Even Ideogram 3 and `gpt-image-1` (the two best text renderers) misspell past ~3 words; Imagen and SD garble anything longer than a glyph. Generate a text-free mark and composite real SVG/Skia/Canvas typography in the application layer using the brand font (see 08, 11, 17c).
4. **Vector/SVG is a three-path routing decision** — LLM-authored SVG (simple geometry), Recraft V3 native-vector output (colored marks), or raster + BiRefNet matte + K-means + `vtracer`/`potrace` (everything else). None of the dominant raster models emit real SVG (see 12, 16).
5. **Brand consistency is a "brand bundle" injection problem, not a consistency-in-prompt problem.** Store a machine-readable bundle (DTCG design tokens + style reference image(s) + LoRA/`--sref`/`style_id` handle + `do_not[]` list + hex palette) and layer it into every generation call, then validate palette adherence with K-means+ΔE2000 (see 15).

Everything downstream — the MCP tool surface, the model routing table, the cross-IDE skill layout — follows mechanically from these five facts.

## The Asset Generation Landscape

Asset types and what each downstream consumer actually requires. "Master image" means the 1024×1024 RGBA PNG canonical form (see 18b, 09).

| Asset | Primary consumer(s) | Size / format requirements | True alpha? | Text in image? | Vector? | Key spec references |
|---|---|---|---|---|---|---|
| **Logo (primary mark)** | Everywhere (web, native, print, social) | SVG primary; PNG 256/512/1024 for raster; 1-color mono variant | Yes — on transparent bg | Often (wordmark) | Strongly preferred (SVG) | See 08, 12, 15 |
| **App icon — iOS** | App Store + device | 1024×1024 opaque (no alpha) for App Store; squircle mask applied by OS; iOS 18 dark/tinted variants | **No on 1024 marketing**, yes on Icon Composer layered source | No (rejected) | No | Apple HIG app-icons, AssetTypes.html (see 09a, 18a/b) |
| **App icon — Android** | Play Store + launcher | 108 dp adaptive = foreground + background layers, 72 dp safe zone inside; monochrome drawable for Android 13 themed; 512² PNG for Play Store | Foreground: yes. Background: RGB | Avoid | No | Adaptive Icons doc (see 09b, 18b) |
| **App icon — PWA** | Browser manifest | 192, 512 standard; 512 maskable with 80% safe zone | Maskable: no (opaque padding required) | No | No | web.dev maskable (see 09c, 11) |
| **App icon — visionOS** | visionOS | 3-layer parallax PNGs (1024²) | Per-layer | No | No | Apple AssetTypes.html (see 09a, 18b) |
| **Favicon** | Browsers, RSS, crawlers, chat unfurlers | `favicon.ico` (16/32/48), `icon.svg` (prefers-color-scheme dark), `apple-touch-icon.png` (180 opaque), 192/512 maskable | SVG: yes. `.ico`: yes. `apple-touch-icon`: **no** | ≤1–2 glyphs | Prefer SVG | See 11a, 11d |
| **Open Graph image** | Facebook/LinkedIn/Slack/Discord unfurlers | 1200×630 JPEG/PNG, <5 MB, absolute HTTPS URL, no auth; Twitter: `summary_large_image` 2:1 | No (unfurlers flatten) | Yes (headline) | No | ogp.me + Twitter Cards (see 11b, 18d) |
| **Splash screen — Android 12+** | OS launch | `windowSplashScreenBackground` solid color + `windowSplashScreenAnimatedIcon` vector (192/288 dp circular mask); branding image 200×80 dp | Icon: yes (vector) | No | Yes (vector drawable) | Android SplashScreen API (see 18c) |
| **Splash — iOS** | iOS launch | `UILaunchScreen` dict (Info.plist) + asset-catalog image w/ Any/Dark variants; never full-bleed PNG | — | No | — | Apple `UILaunchScreen` (see 18c) |
| **Splash — PWA iOS** | iOS Safari A2HS | 26-image matrix: device × orientation × DPR; `<link rel="apple-touch-startup-image">` per size; missing → blank | No | Rarely | No | Safari docs (see 11c, 18c) |
| **UI illustration (empty state / onboarding / hero)** | In-product (web + native) | 1–3× PNG/WebP or SVG; must match design system style; respects `prefers-reduced-motion` for animations | Usually yes for spot art | Avoid | SVG preferred where geometry allows | See 10 |
| **Icon pack (line/duotone/filled)** | UI toolbar, navigation | 24×24 SVG at 2 px stroke, `currentColor` fill, 1–1 pixel grid | Yes | No | Yes (SVG mandatory) | Iconify, Material conventions (see 10c, 12) |
| **Marketing hero / banner** | Landing pages, ads | 1600×900+ JPG/WebP; aspect-ratio-specific crops for social | Optional | Sometimes | No | See 10b |
| **Sticker / emoji-like** | Chat apps, PWAs | 512 PNG RGBA, solid silhouette | Yes | Rarely | No | See 20b |
| **README banner** | GitHub | 1280×640 PNG/SVG, accessible color contrast | — | Often | SVG preferred | See 11c |

Implication: **the plugin's intent classifier must return a closed 8–10 enum** (`logo`, `app_icon`, `favicon`, `og_image`, `splash`, `illustration`, `icon_pack`, `hero`, `sticker`, `transparent_mark`) and each branch derives dimensions/format/transparency/model deterministically (see 19d).

## Model Capability Matrix

Dense comparison of the models worth routing to. Ratings: ✅ strong / ⚠️ partial / ❌ absent / n/a = not applicable. "Native RGBA" means the model returns real alpha bytes, not a rendered checkerboard. "Native SVG" means vector output, not raster. "Text ceiling" = characters of legible in-image text the model reliably renders.

| Model family | Native RGBA | Native SVG | Text ceiling | Style/brand control | Ref-image cond. | Typical failure mode | Best asset use |
|---|---|---|---|---|---|---|---|
| **Imagen 3 / 4 (Google)** | ❌ (renders fake checkerboard) | ❌ | ≤10 chars, single line | Style refs via API param | Limited | Checkerboard-drawn-as-RGB; "weird boxes"; ignores `transparent` prompts | Photoreal, landscapes, product shots |
| **Gemini 2.5/3 Flash Image ("Nano Banana") / Pro** | ❌ (same checkerboard; multi-turn edit) | ❌ | ~20 chars | Turn-by-turn coherence | ✅ (multimodal in-context) | Same as Imagen + edit endpoint helps iterate | Photoreal edit flows; character rotations |
| **DALL·E 3 (legacy)** | ❌ (flat white/gray bg) | ❌ | ~12 chars | Style params | ❌ | Always returns rewritten prompt; hard-enforced rewriter | Deprecated; do not route to |
| **gpt-image-1 / 1.5 (OpenAI)** | ✅ (`background: "transparent"` + PNG/WebP) | ❌ | ~30–50 chars (best-in-class photoreal text) | Good via prompt + `input_fidelity` | ✅ (`input_image[]`) | Prompt rewriting can silently change intent; moderation floor | Logos w/ text, transparent marks, hi-fi photoreal with copy |
| **Stable Diffusion 1.5 / 2.1** | ❌ | ❌ | ~3–4 chars (garbles) | LoRA / embeddings | ControlNet / IP-Adapter | CLIP truncation @ 77 tokens; tag-soup prompts | Legacy open-weight |
| **SDXL** | ❌ (but LayerDiffuse adapter → ✅) | ❌ | ~5–8 chars | LoRA / IP-Adapter / `--sref`-style | Controllable Feature Wrapping | Plastic skin, over-smoothing; BREAK token fragility | Custom brand LoRAs; open-weight hero art |
| **Flux.1 / Pro / Kontext / Flux.2** | ❌ native (but LayerDiffuse works) | ❌ | ~15–25 chars (Flux Pro strongest open-weight) | T5/VLM prose; no negative prompts | Kontext edit; Flux.2 **accepts up to 8 brand refs** | Rejects `negative_prompt` in API; distillation artifacts in schnell | Photoreal hero, brand-locked illustration, text-bearing art |
| **Midjourney v6 / v7** | ⚠️ (mask flag, partial) | ❌ | ~8–15 chars (stylized) | `--sref`/`--cref`/`--mref` style codes | ✅ via `--sref` | **No official API**; must drive via Discord | Concept boards, hero art (not automation) |
| **Ideogram 2 / 2a / 3 (Turbo)** | ✅ (`style: "transparent"` in v3) | ❌ | ~30–60 chars (spells reliably) | Style codes; brand magic | Remix / ref | "Magic Prompt" footgun expands literal prompts; non-Latin broken | Logos with text, posters, dense typography |
| **Recraft V2 / V3 / V4** | ✅ | **✅ (native vector SVG output)** | ~20–30 chars | Brand styles (`style_id`), palette (`controls.colors`) | Style refs | V4 removed several V3 styles; API surface small | Logos as SVG, brand-locked illustration, icons |
| **Firefly 3 (Adobe)** | ⚠️ | ❌ | ~15 chars | Style kit, ref images | ✅ | Legal indemnity for enterprise; style limited | Commercial-safe hero art |
| **Leonardo / Playground / Krea** | ❌ | ❌ | poor | LoRA (Leonardo) / partner-gated (Playground v3) / reference-heavy (Krea) | Varies | Inconsistent SDK ergonomics | Hobby/prosumer |
| **Luma Photon** | ❌ | ❌ | ~10 chars | Style refs | ✅ | Newer, narrow brand tooling | Photoreal hero |

**Routing table distilled from the matrix (see 04, 05, 06, 07, 08, 09, 13):**

| Need | Primary | Fallback | Never |
|---|---|---|---|
| Transparent PNG mark | `gpt-image-1` (`background:"transparent"`) | Ideogram 3 Turbo `style:"transparent"` → Recraft V3 (rasterize SVG) | Imagen any / Gemini any / SD 1.5 |
| Logo with 1–3 word text | Ideogram 3 → `gpt-image-1` → Recraft V3 | Composite real SVG type over mark | Imagen, SD 1.5, Flux schnell |
| Native SVG | Recraft V3 | LLM-author SVG (Claude/GPT) for simple geometry | Everyone else |
| Photoreal hero | Flux Pro / Flux.2 → `gpt-image-1` → Imagen 4 | SDXL + brand LoRA | DALL·E 3 |
| Empty-state illustration | Flux Pro + brand LoRA/IP-Adapter | SDXL + LoRA → Recraft brand style | One-off Ideogram/MJ (style drift) |
| App icon (iOS/Android/PWA) | Recraft V3 or Ideogram 3 for the mark → packaging pipeline | `gpt-image-1` mark → packaging | Full-bleed Imagen 4 as final (rejects at App Store due to checker) |

## Prompt Engineering Principles That Actually Generalize

Cross-cutting patterns that recur across categories 01, 04, 05, 06, 07, 08:

**1. The user's prompt is not the model's prompt.** Every major provider inserts an LLM rewriter (DALL·E 3 returns `revised_prompt`; Imagen has a default-on rewriter for prompts < 30 words; OpenAI's `gpt-image-1` has a multi-layer rewriter + moderation stack; Ideogram's "Magic Prompt" toggles this behavior explicitly). **Therefore: the plugin must always do its own rewrite *first*** so the provider's invisible rewriter has less surface to mangle (see 01c, 05a, 20a).

**2. Prompt structure is `Subject → Context → Style → Constraints`, always.** Holds across Midjourney, Imagen, SD, Flux, `gpt-image-1`. Leading with style tokens ("flat vector," "isometric 3D," "brutalist") anchors interpretation; constraints (aspect ratio, transparency, no-text) go last so they don't dilute subject attention (see 08b, 10, 01d).

**3. Dialect matters: tag-soup vs prose.** SD 1.5/SDXL want comma-separated tag salad ("masterpiece, 8k, studio lighting"); Flux / Imagen / `gpt-image-1` want natural narrative sentences. Using SD-style tag-salad on Imagen *actively degrades* output. The rewriter must know the target family (see 06a vs 06b, 04a, 05a).

**4. Negative prompts are a CFG hack, not a universal feature.** SD family supports them natively via classifier-free guidance. **Flux rejects `negative_prompt` outright** (returns error). Imagen and `gpt-image-1` ignore the field. The only universally-portable "negative" is to rewrite the positive prompt with positive anchors (say "pure white background" instead of "no checkerboard"). This is the single most important dialect rule (see 01a, 04c, 06b, 08, 13).

**5. Quoted text gets through; unquoted text gets paraphrased.** On Ideogram / Recraft / `gpt-image-1`, putting literal copy in double quotes (`"Acme"`) dramatically improves legibility. Still unreliable past 3–5 words (see 07b, 05c, 08c).

**6. Seed pinning + model version pinning is the only path to reproducibility.** For brand assets you will re-generate many times. Store `(model, version, seed, prompt_hash, params_hash)` as the cache key; re-use on idempotent requests (see 18e, 15).

**7. CFG is non-uniform.** Early steps obey text conditioning; late steps care about detail. "Guidance intervals" (apply CFG 1.0–6.0 early, drop to 1.0 at 80% of timesteps) are SOTA on SDXL/Flux. Users should not tune CFG directly; the skill should pick intervals by asset type (see 01a, 06).

**8. Reference images > prompt words.** For brand consistency, an IP-Adapter / `--sref` / `--cref` / Recraft `style_id` / Together FLUX.2 brand refs beat any amount of prose description. Brand bundle → style reference(s) → injection at call time (see 15, 06c).

**9. Where prompt tricks fail, post-processing takes over.** True alpha → matte or route to native RGBA model. Vector output → vectorize after. Platform sizes → sharp/libvips resize per spec. Brand palette drift → K-means+ΔE2000 validation, regenerate on failure. Legible wordmark → do not render it at all; composite real type (see 13, 16, 18, 17d).

## Hard Problems and the Current State of Solutions

### Transparent backgrounds — the "checkerboard / weird boxes" failure

**Root cause (13, 04):** Almost every modern T2I VAE is RGB-only. Models that are asked for "transparent" either (a) emit a white/gray flat background that the user has to matte (DALL·E 3, SD family) or (b) render the *visual pattern* of a Photoshop checkerboard — gray/white 8×8 tiles — as RGB pixels, because their training data includes screenshots where transparency is displayed that way (Gemini 2.5/3, Imagen 3/4, Nano Banana). This is **the #1 pain** and is not fixable by prompting. Hex codes sometimes help; "pure white background" plus post-process matte is the reliable fallback.

**Fix hierarchy (13, 04, 16):**
1. **Route to native-RGBA model.** `gpt-image-1` with `background:"transparent"` and `output_format:"png"`; Ideogram 3 Turbo with `style:"transparent"`; Recraft via vectorize.
2. **LayerDiffuse for open-weight SDXL/Flux.** Produces genuine alpha inside the diffusion loop, better edges than post-hoc matting (20d, 13a).
3. **Post-process matte.** BiRefNet (permissive) or BRIA RMBG-2.0 (CC-BY-NC-4.0 for weights; use hosted API for commercial). U²-Net, rembg as fallback.
4. **Difference matting / edit-endpoint trick.** Generate on pure-white then on pure-black, difference to recover alpha — useful for semi-transparent glass/hair (13b, 13e).
5. **Vectorize-and-drop.** For flat marks, BiRefNet matte → K-means quantize → `vtracer`/`potrace` → SVG, which has alpha trivially (12, 16, 17d).

Validation: detect a checkerboard pattern directly on any RGB output before accepting. Reject if >5% of pixels sit in the gray-tile frequency band.

### Legible text in logos / wordmarks

**State (08c, 07b, 05c, 17c):**
- **Ideogram 3** and **`gpt-image-1`** are the two best in-image text renderers in 2026. Ideogram > gpt-image on dense typography; gpt-image > Ideogram on photoreal-integrated text.
- **All other models** drop below useful at ~3 words.
- **Quoted text + short strings + serif/sans constraint** helps.
- **The correct architectural move:** generate text-free mark, composite real SVG/Skia/Canvas typography in the application layer using the brand font. TextDiffuser-2 / AnyText2 are curiosities, not production. Trademark wordmarks should **never** exit a diffusion sampler.

### Vector / SVG output

**State (12, 16, 20b):** No raster diffusion model natively emits SVG (path data + colors). Three real paths:
1. **LLM-authored SVG** (Claude/GPT write SVG code) — excellent for simple geometric marks, logos with strokes/shapes, icon packs. Works up to ~30–40 path elements. Prompt with strict constraints (fixed viewBox, no `<image>`, palette hex list).
2. **Recraft V3 native vector** — the only production diffusion-ish model whose API returns real SVG. Path count is a quality signal; validate ≤200 paths for a clean mark.
3. **Raster + vectorize** — generate at 1024², BiRefNet matte, K-means quantize to N colors, `vtracer` (full-color) or `potrace` (1-bit). Post-process: SVGO with conservative preset (preserve `viewBox`, strip metadata).

Experimental: StarVector, SVGDreamer, Chat2SVG — not production-ready.

### Brand / identity consistency across a full asset set

**State (15, 06c, 06d, 10):** The winning abstraction is a **machine-readable brand bundle**:

```
brand/
├── brand.json           # DTCG design tokens (colors, typography, spacing)
├── style-ref-001.png    # IP-Adapter / --sref / Recraft style ref
├── style-ref-002.png
├── lora.safetensors     # optional — trained via 6d recipe
├── sref_code            # Midjourney style code (commercial-unstable)
├── style_id             # Recraft style id (commercial)
├── do_not[]             # "no drop shadows", "no gradient sky"
└── logo-mark.svg        # canonical mark for composition
```

Mechanisms:
- **Subject consistency** (mascot, character): PuLID → DreamBooth-LoRA (SDXL/Flux).
- **Style consistency**: IP-Adapter, CSD embedding, Recraft `style_id`, Midjourney `--sref`, Together FLUX.2 ref images.
- **Palette enforcement**: Recraft `controls.colors` for native; otherwise K-means + ΔE2000 on output, regenerate if >5% pixels drift outside palette.
- **Full-set propagation**: human gates the first asset; the bundle propagates deterministically to the rest.

### Artifact control

Not "extra fingers" — the asset-specific artifacts are (14, 17):
- **Jagged edges after post-matte:** LayerDiffuse instead of rembg; or premultiplied-alpha resize.
- **JPEG-in-PNG compression:** reject on entropy/DCT signature.
- **Color cast / oversaturation:** Flux schnell bias; avoid on brand work.
- **Low-contrast icons at 16×16:** render the SVG at 16, measure contrast against a white/dark card; reject if WCAG AA fails.
- **Watermark or stock-photo lighting:** negative anchors (SD) or prompt rewrite (Flux/`gpt-image-1`); VLM rubric catches the rest.
- **Off-center / wrong aspect:** measure tight-bbox after matte; auto-retry with explicit center-framing language.
- **Oversharpen halos:** DAT2 fine-tunes replace old UltraSharp RRDB.

## The Real Asset Pipeline

The end-to-end pipeline any serious system must own. Each stage is a **separate MCP tool** so agents can call them independently. Specific OSS tools per stage (see 16, 17, 18):

```
  plan (intent classifier) 
    ↓
  prompt rewriter (family-specific)
    ↓
  generate (routed provider; seed-pinned)
    ↓
  validate_0 (checkerboard / alpha probe / moderation ping / composition probe)
    ↓ fail → repair or regenerate
  background-remove  [rembg · BiRefNet (default) · BRIA RMBG-2.0 (hosted) · LayerDiffuse (in-loop) · SAM 2 · U²-Net fallback]
    ↓
  vectorize (only if asset_type ∈ {logo, icon, favicon, icon_pack})
      [Recraft /vectorize (hosted) · vtracer (color) · potrace (1-bit) · SVGO]
    ↓
  upscale / refine (only if needed, last step)
      [Real-ESRGAN / 4x-UltraSharpV2-DAT2 / 4x-IllustrationJaNai-DAT2 (regressive)
       · CCSR v2 (deterministic diffusion) · SUPIR (photo only; A100-class) · Flux img2img 0.12–0.20 denoise (polish)
       · adetailer for face; HandRefiner for hands]
    ↓
  per-target export [sharp / pyvips / Pillow / @napi-rs/image / ImageMagick]
      ├ iOS AppIcon.appiconset/Contents.json (+ 1024² opaque for App Store)
      ├ Android mipmap-* + mipmap-anydpi-v26/ic_launcher.xml (foreground+background+monochrome)
      ├ PWA manifest icons (192/512 + 512 maskable)
      ├ favicon.ico + icon.svg (dark/light media) + apple-touch-icon.png
      ├ OG 1200×630 [Satori/resvg/@vercel/og for template-based; sharp for compositing]
      └ .icns (icon-gen · @shockpkg/icon-encoder) / .ico (sharp-ico)
    ↓
  validate_final (VLM rubric; alpha coverage; safe zone bbox; palette ΔE2000; text-legibility OCR; WCAG contrast at 16²)
    ↓ 
  package + cache by (prompt_hash, model, seed, params_hash) → content-addressed storage (R2)
```

Canonical TypeScript/Python stack for "one binary, many manifests" deployment (18e):
- **Server:** MCP over stdio + Streamable HTTP (`@modelcontextprotocol/sdk`).
- **Queue:** BullMQ + Redis (per-vendor lanes; `prompt_hash` as `jobId` for dedup).
- **Storage:** Cloudflare R2 (egress-free) + Cloudflare CDN; keys = `assets/<hash[0:2]>/<hash>/<variant>.<ext>`.
- **Bitmap:** `sharp` (libvips) — ~27× faster than `jimp`, ~7.7× faster than ImageMagick.
- **SVG rasterize:** `@resvg/resvg-js` (deterministic cross-OS; no system fonts).
- **Icon pack writers:** `icon-gen`, `sharp-ico`, `@shockpkg/icon-encoder`.
- **Client preview:** `jSquash` + `JSZip` + `@resvg/resvg-wasm` (optional) for "no upload" UX.
- **Splash / PWA matrix:** `pwa-asset-generator` (Puppeteer-based) + custom Android 12 / iOS emitters.

## Evaluation — How to Know It's Actually Good

**No single metric suffices** (see 03). The auto-QA layer is a tiered pipeline:

**Tier 0 — deterministic validators** (cheap, run always):
- Dimensions exactly match target (1024×1024 for master; 180×180 for apple-touch-icon).
- Alpha channel present when required; no checkerboard pattern (FFT signature in gray-tile band); no >5% of pixels at alpha ∈ [0.05, 0.95] (catches Gemini's fake transparency).
- Flattened-alpha variant for App Store (no alpha channel).
- Subject tight-bbox fits inside platform safe zone (iOS 824px center of 1024; Android 72dp of 108dp).
- File-size budget (favicon.ico < 15 KB; OG < 5 MB; app-icon PNG < 1 MB).
- Entropy / DCT signature to reject JPEG-in-PNG compression.

**Tier 1 — alignment / quality metrics** (run on a sample; gate on thresholds):
- **VQAScore** (per-image CLIP-BLIP alignment, strongest single alignment metric in 2026).
- **CLIPScore** (cheap, kept for ablation; known biased toward natural photos).
- **FD-DINOv2 / CMMD** — replacing FID for small test sets; use on brand-style batches.
- **HPSv3 / PickScore / ImageReward / MPS** — human-preference proxies; good for ranking N candidates.
- **Text legibility**: OCR the output with PaddleOCR/Tesseract; compare against intended wordmark via Levenshtein distance; reject if distance > 1.
- **Palette adherence**: K-means 8-color in LAB; ΔE2000 vs brand palette; reject if max ΔE > 10 on any mandated color.
- **Asset-specific rubrics** (favicon readability at 16²; OG unfurler-safe for Slack/Twitter/LinkedIn; logo contrast against white + black cards).

**Tier 2 — VLM-as-judge** (Claude Sonnet / GPT-5.2 / Gemini 3 vision at ~$0.003/call):
- 5–7 hard-coded criteria per asset type (logo: "reads at 16²?", "no unintended text?", "centered?", "palette matches?").
- Pairwise comparison for N-best ranking.
- Feedback summary fed back into a targeted re-prompt (14c repair loop).

**Benchmarks worth running on the plugin itself (03, 17):** GenEval / GenEval 2, T2I-CompBench++, OCRGenBench / MARIO-Eval / STRICT-Bench (text), ConceptMix, Gecko. For alpha specifically: Gradient / Connectivity error + SAD on a held-out brand-asset set.

## Plugin & Agent Architecture Recommendations

Distilled from 19, 20, 18e.

### Single SSOT, many manifests

**One repository, one MCP server binary, one canonical SKILL.md per asset intent, one un-frontmattered rule body.** Everything per-IDE (Cursor `.mdc`, Windsurf `.md`, Cline `01-*.md`, Codex `AGENTS.md`, Gemini `GEMINI.md`, Claude `CLAUDE.md`, VS Code `.vscode/mcp.json`, `.github/copilot-instructions.md`) is **generated** from these SSOTs by `scripts/sync-mirrors.sh` (~60 lines bash) and verified byte-for-byte by `tests/verify_repo.py` in CI. Humazier is the reference implementation on disk.

### Where prompt rewriting lives

- **SSOT SKILL.md** (`.claude/skills/prompt-to-asset/SKILL.md` + mirrors): the long-form behavior spec — classification rubric, routing table, dialect rules per model family. Loaded on trigger.
- **Rule body** (`rules/prompt-to-asset-activate.md`): always-on short context — the single "transparency is a routing decision not a prompt trick" paragraph is the highest-leverage artifact in the whole bundle.
- **MCP tool** `enhance_prompt(brief, asset_type, target_model, brand_bundle?)`: the actual rewriter — returns structured `AssetSpec` JSON, not a string. Mark `readOnlyHint + idempotentHint` so Cursor auto-approves without prompting.
- **Rewriter model:** Haiku/Flash-class (fast, cheap, structured JSON); fine-tune Promptist/SuperPrompt-v1 later for offline fallback.

### What deterministic post-processing the plugin owns

Models won't do this, so we must:
- `remove_background(image, mode: native|birefnet|rmbg|layerdiffuse|difference)` — alpha-aware; verifies result.
- `vectorize(image, mode: vtracer|potrace|recraft, max_paths, palette_size)` — returns SVG + optimized via SVGO.
- `upscale_refine(image, asset_type, target_size)` — routes by asset type; never diffusion on flat logos.
- `export_app_icon_set(master_png, platforms, brand_bundle)` — emits iOS `AppIcon.appiconset`, Android adaptive, PWA maskable, favicons, `.ico`, `.icns`.
- `generate_og_image(template, headline, image)` — Satori/`@resvg` + `@vercel/og`, *not* diffusion.
- `validate_asset(image, asset_type, brand_bundle)` — tier-0 + tier-1 + optional tier-2 VLM.

### MCP tool surface (10 tools; prefix all names to avoid Copilot collisions)

| Tool | Purpose | `annotations` |
|---|---|---|
| `asset_enhance_prompt` | Classify + rewrite + route | readOnly, idempotent |
| `asset_generate_logo` | Generate logo asset (includes SVG path) | openWorld |
| `asset_generate_app_icon` | Generate master + emit per-platform bundle | openWorld |
| `asset_generate_favicon` | Generate favicon bundle (.ico, SVG, apple-touch) | openWorld |
| `asset_generate_og_image` | Template-based OG render | readOnly (no net) / openWorld (with AI) |
| `asset_generate_illustration` | Brand-locked illustration set | openWorld |
| `asset_remove_background` | Matte (native / birefnet / rmbg / diff) | readOnly |
| `asset_vectorize` | Raster → SVG | readOnly |
| `asset_upscale_refine` | Asset-type-aware refine | readOnly |
| `asset_validate` | Run tier-0/1/2 QA | readOnly, idempotent |
| `asset_brand_bundle_parse` | `brand.md` / DTCG / AdCP → canonical schema | readOnly |

### Model routing logic

Implement as a pure function `route(asset_type, transparency_required, text_length, vector_required, license_tier) → (primary, fallback, postprocess[])`. Encoded as data, not code, so it's patchable without deploy:

```json
{"asset_type": "logo", "text_length": 0, "vector_required": true,
 "primary": "recraft_v3_svg", "fallback": "gpt_image_1 + vectorize_pipeline",
 "postprocess": ["svgo", "validate"]},
{"asset_type": "logo", "text_length": "1..3", "vector_required": false,
 "primary": "ideogram_v3", "fallback": "gpt_image_1",
 "postprocess": ["birefnet_matte", "validate", "composite_type_if_fail"]},
{"asset_type": "transparent_mark",
 "primary": "gpt_image_1(background=transparent)", "fallback": "ideogram_v3(style=transparent)",
 "postprocess": ["validate_alpha", "no_checker"]},
...
```

### Cross-IDE packaging (from 19, 19e; Humazier as reference)

- **Claude Code** — `.claude-plugin/plugin.json` + `SessionStart` / `UserPromptSubmit` hooks; real installer (`hooks/install.sh` / `.ps1`).
- **Cursor** — `.cursor/rules/prompt-to-asset.mdc` (`alwaysApply: true`) + `.cursor/mcp.json` + `.cursor/skills/*/SKILL.md`.
- **Windsurf** — `.windsurf/rules/prompt-to-asset.md` (`activation: always_on`).
- **Cline** — `.clinerules/01-prompt-to-asset.md` (numeric prefix for ordering).
- **Codex** — `plugins/prompt-to-asset/.codex-plugin/plugin.json` + `AGENTS.md` + `.codex/hooks.json`.
- **Gemini CLI** — `gemini-extension.json` (`contextFileName: ["GEMINI.md", "skills/**/SKILL.md"]`).
- **Copilot** — `.github/copilot-instructions.md` + `.vscode/mcp.json` + `copilot-skillset.json` (collapse to one `asset_generate(asset_type)` skill to stay under 5-skill cap).

### Minimal viable plugin vs ambitious plugin

**MVP (2 weeks):**
- 3 tools: `asset_enhance_prompt`, `asset_generate_logo`, `asset_export_app_icon_set`.
- Routes between `gpt-image-1`, Ideogram 3, Recraft V3 only.
- `sharp` + `@capacitor/assets` + `icon-gen` post-process.
- Single-command install for Claude Code + Cursor.

**Ambitious (6–10 weeks):**
- Full 11-tool surface + validator loop.
- LayerDiffuse + Flux + SDXL self-hostable path (ComfyUI serverless).
- Brand bundle ingest (`brand.md`, AdCP, DTCG) + Figma MCP read-only integration.
- Hosted Streamable-HTTP MCP at `mcp.<product>.<tld>/mcp` with OAuth 2.1 + PKCE + RFC 9728.
- Prompt-hash cache (R2 content-addressed; expected 25% hit rate = ~$5k/mo saved per 1M assets).
- Cross-IDE skill bundle (Humazier SSOT pattern) with CI byte-verification.
- `resize_icon_set` as public OSS replacement for `appicon.co` — gateway drug.

## Highest-Confidence Recommendations

Ranked, opinionated, specific.

1. **For transparent single-element assets, route to `gpt-image-1` with `background: "transparent"` first, Ideogram 3 Turbo `style: "transparent"` second, LayerDiffuse-enabled Flux third. Never Imagen 3/4 or Gemini Flash Image for transparency — they render checkerboard pixels (04, 05, 13).**

2. **For app icons with text, route to Ideogram 3 or `gpt-image-1`; run BiRefNet matte; export via `sharp` + `@capacitor/assets`; flatten onto user-chosen color for the iOS 1024 marketing variant (App Store rejects alpha) (07b, 09a, 18).**

3. **For vector logos, primary is Recraft V3 (native SVG); secondary is raster (`gpt-image-1` or Ideogram 3) → BiRefNet → K-means 6-color → `vtracer` → SVGO. Validate ≤200 paths. Never use `potrace` for colored marks — it's 1-bit (12, 16, 17d).**

4. **Do not render brand text in a diffusion sampler past 3 words. Generate a text-free mark and composite SVG/Canvas typography in the application layer using the brand font (08c, 11b, 17c).**

5. **Every generation runs through a tier-0 deterministic validator before return: dimensions exact; alpha present when required; no checkerboard FFT signature; subject bbox inside safe zone; OCR of any wordmark Levenshtein-checked against intended text (03e, 14e, 18).**

6. **A VLM-as-judge pass (Claude Sonnet / GPT-4o-mini vision at ~$0.003) against 5–7 hard criteria catches ~70% of failures and feeds a diff back into the regenerate loop. This is the highest-ROI step in the pipeline. Without it, the user is the QA harness (14d, 19d).**

7. **Always write your own prompt rewriter *before* the provider rewrites it. DALL·E 3, Imagen (<30 words), `gpt-image-1` all insert invisible rewriters. Producing an already-canonical prompt gives them less room to mangle (01c, 05a, 20a).**

8. **Pin `(model, version, seed, prompt_hash, params_hash)` as cache key; Cloudflare R2 as storage (egress-free); use `prompt_hash` as BullMQ `jobId` for free concurrent-request dedup. Expected 20–40% cache hit rate → ~$5,000/month saved per 1M assets (18e).**

9. **Never use `negative_prompt` field on Flux — it errors. Use positive anchors instead ("pure white background" instead of "no checkerboard"). This rule also applies to `gpt-image-1` and Imagen, which silently ignore negatives (01a, 06b, 13, 14a).**

10. **Brand consistency is a "brand bundle" injection problem. Store DTCG tokens + style-reference images + LoRA/`--sref`/`style_id` handle + `do_not[]` list in a machine-readable bundle and inject at every call. Algorithmic dark-mode derivation does not produce acceptable contrast — ship `light.png` + `dark.png` as dual SSOT sources (15, 10).**

11. **For full asset sets, human-gate the first asset and deterministically propagate the bundle to the rest. Validate palette adherence with K-means + ΔE2000 on each output; regenerate on drift > 10 ΔE (15, 14).**

12. **Implement post-processing as a content-addressed, stateless worker pool. Workers write to `assets/<hash[0:2]>/<hash>/<variant>.<ext>`; re-execution after a crash overwrites identical bytes; at-least-once queues become effectively exactly-once at storage (18e).**

13. **Use `sharp` for all bitmap ops (not `jimp`, not ImageMagick). Use `@resvg/resvg-js` for SVG rasterization (not sharp's built-in librsvg, which inherits LGPL + system fonts). Use `icon-gen` for `.ico`/`.icns` (not reinvented encoders) (18d).**

14. **Replace `appicon.co` with a ~160-line `generate-iconset.ts` using `sharp` + `@capacitor/assets` + custom emitters for legacy `Contents.json`, iTunesArtwork, Android 13 monochrome, `.icns` via `icnsutil`. Ship this as a free standalone MCP tool — it's the gateway drug to the full product (18a, 20e).**

15. **Expose 10 small tools, not one god-tool. "Context bridge, not code generator" (Figma's framing): `enhance_prompt`, `generate_logo`, `generate_app_icon`, `generate_favicon`, `generate_og_image`, `remove_background`, `vectorize`, `upscale_refine`, `validate_asset`, `brand_bundle_parse`. Agents orchestrate; we provide primitives (19b, 20e).**

16. **Ship the MCP server as a single TypeScript binary with both stdio and Streamable HTTP transports. stdio for local/dev, Streamable HTTP + OAuth 2.1 + PKCE + RFC 9728 for hosted. HTTP+SSE is deprecated as of MCP 2025-03-26 — target spec 2025-06-18 minimum (19b).**

17. **Prefix every tool name (`asset_*` or `enhance_*`) to avoid collisions in Copilot's flat tool list and Cursor's bare-name auto-approval (19c).**

18. **For SVG output from an LLM (Claude/GPT), constrain: fixed viewBox, no `<image>` tag, palette as hex list, max 40 paths. Post-process with SVGO using conservative preset. Useful for logos with simple geometry, icon packs at 24×24 (12d, 12).**

19. **For upscaling flat assets, use `4x-UltraSharpV2` (DAT2) or `4x-IllustrationJaNai_V1_DAT2`. Never SUPIR, never Magnific "creative" mode — they hallucinate paper texture and gradient banding into brand marks. SUPIR is correct only for photo restoration on A100-class hardware (17b, 17d).**

20. **WebGPU is a preview tier, not production. Ship `transformers.js v3` + Swin2SR x2 int8 for client-side 512→1024 preview; route production 4× to Modal warm pool (A10G) or Replicate `nightmareai/real-esrgan` ($0.0025/run on T4). Cold start beats hourly rate at this scale (17e).**

## Open Questions & Research Gaps

Where the 104-angle compendium did not land a definitive answer:

- **G1 — Asset-aware prompt-rewriter training data.** No public dataset of `(intent, ideal_prompt, target_model, asset_type)` tuples for logos/icons/favicons/OG exists. Hunyuan trained on generic T2I prompts. A 10k-example asset-flavored dataset is the single highest-leverage fine-tune opportunity (20a, 20).
- **G2 — Asset-correctness reward model.** Hunyuan's AlignEvaluator has no heads for transparency validity, favicon contrast at 16², safe-zone respect, or platform spec compliance. Training a 3–6 head reward model on top of AlignEvaluator is novel research (20a).
- **G3 — Native RGBA super-resolution.** Every upscaler is RGB-only. A native RGBA model (anime stickers, transparent logos) — plausibly APISR-DAT fine-tuned with RGBA heads — is an open gap (17a).
- **G4 — Brand-consistent refinement across a set.** LoRA-guided tiled upscale gestured at in 17d; no shipped tool guarantees ten upscaled assets share a style (15, 17d).
- **G5 — Root cause of the checkerboard artifact in Google's stack.** Categories 04/13 identify it as RGB-only VAE + training contamination, but Google's model cards do not confirm. Closed-source; must be inferred empirically. Upstream from any upscaling or matting fix (04, 13).
- **G6 — Deterministic diffusion SR at scale.** CCSR v2 is the only reproducible diffusion SR. SUPIR/DiffBIR/StableSR/SeeSR are stochastic. Production pipelines needing byte-reproducibility are constrained to CCSR or regressive models (17b).
- **G7 — MCP resource versioning / cache invalidation.** Spec sketches `notifications/resources/updated` but no reference server implements staleness detection when a brand bundle edits out-of-band. Affects `prompt-to-asset://brand/{slug}` resource strategy (19b).
- **G8 — Copilot Skillset 5-skill cap.** Our 10-tool surface exceeds it. Plan to collapse into one `asset_generate(asset_type)` or ship a Copilot Agent (no cap) or two separate GitHub Apps. Unresolved which is right (19c).
- **G9 — No shared benchmark for asset-quality regressions.** We must build from scratch: `rembg`-extractability score, transparency ground-truth, size compliance, platform-spec conformance, palette ΔE2000 (19e, 03).
- **G10 — Gemini CLI has no lifecycle hooks.** No `SessionStart` or `UserPromptSubmit` — pure prose enforcement only. Must either accept or contribute upstream (19a, 19e).
- **G11 — Android 13 monochrome themed icons.** Auto-derivation (`sharp(foreground).greyscale().threshold(128).tint('#000')`) is heuristic. No tool does this well; opportunity.
- **G12 — Dark-mode PWA iOS splash.** `pwa-asset-generator` has no `--dark-mode` flag; two-pass + media-query merge is the workaround.
- **G13 — Non-Latin text rendering.** Ideogram 3 + `gpt-image-1` are Latin-centric; CJK / Arabic / Devanagari drop sharply. SVG typography composition is the safe path for non-Latin brands.
- **G14 — License-clean training-weight stack.** Fooocus expansion (CC-BY-NC-4.0), Flux.1[dev] (non-commercial), SD.Next (AGPL-3.0), BRIA RMBG-2.0 weights (CC-BY-NC). A commercial-clean stack is possible but requires discipline (20).
- **G15 — OAuth Dynamic Client Registration (RFC 7591) client coverage.** Uneven across MCP clients. Must support both DCR and pre-provisioned client IDs (19b).
- **G16 — JetBrains AI / Zed integration.** Not mapped in the compendium; future work once their formats stabilize.

## Category Index

| # | Category | One-sentence synthesis | Index |
|---|---|---|---|
| 01 | Prompt engineering theory | CFG, negative prompts, cross-attention control, weighting, LLM rewriting — the user's prompt is never what the model was trained on. | [01/INDEX.md](./01-prompt-engineering-theory/INDEX.md) |
| 02 | Image generation models | Architectural landscape from diffusion → DiT + rectified flow → autoregressive; every family has distinct prompt-adherence and text-rendering behaviors. | [02/INDEX.md](./02-image-generation-models/INDEX.md) |
| 03 | Evaluation metrics | No single metric suffices; ship a tiered VQAScore + human-preference + VLM-as-judge + deterministic-validator pipeline. | [03/INDEX.md](./03-evaluation-metrics/INDEX.md) |
| 04 | Gemini / Imagen prompting | The "checkerboard" transparency failure is architectural, not promptable; Imagen is T2I, Gemini is multimodal edit — two different stacks. | [04/INDEX.md](./04-gemini-imagen-prompting/INDEX.md) |
| 05 | OpenAI DALL·E / gpt-image | `gpt-image-1/1.5` supports native RGBA, strong in-image text, `input_fidelity`; DALL·E 3 deprecated; all outputs go through invisible rewriter + moderation stack. | [05/INDEX.md](./05-openai-dalle-gpt-image/INDEX.md) |
| 06 | Stable Diffusion / Flux | Two prompting contracts (CLIP tag-salad vs T5/VLM prose); Flux rejects `negative_prompt`; ControlNet + IP-Adapter + LoRA are the consistency primitives. | [06/INDEX.md](./06-stable-diffusion-flux/INDEX.md) |
| 07 | Midjourney / Ideogram / Recraft | Three specialists: MJ for aesthetic (no API), Ideogram for text, Recraft for native SVG + brand styles; "concept → clean → vector" pipeline. | [07/INDEX.md](./07-midjourney-ideogram-recraft/INDEX.md) |
| 08 | Logo generation | Logos are a routing + post-processing problem; re-parameterize user intent; route by text-length; never let diffusion render brand text. | [08/INDEX.md](./08-logo-generation/INDEX.md) |
| 09 | App icon generation | Single 1024² master → platform-specific fan-out (iOS squircle, Android adaptive layers, PWA maskable, visionOS parallax); strict validator against HIG. | [09/INDEX.md](./09-app-icon-generation/INDEX.md) |
| 10 | UI illustrations & graphics | Consistency is the primary problem; freeze style with LoRA/IP-Adapter/Recraft style_id; materials have specific physics vocabulary; anti-slop clause mandatory. | [10/INDEX.md](./10-ui-illustrations-graphics/INDEX.md) |
| 11 | Favicon / web assets | SVG-first, minimal, deterministic; Satori + resvg is the canonical OG engine; `apple-touch-icon` opaque; 26-file iOS PWA splash matrix. | [11/INDEX.md](./11-favicon-web-assets/INDEX.md) |
| 12 | Vector / SVG generation | Three paths: LLM-author SVG, Recraft native vector, raster + `vtracer`/`potrace`; path count is a quality signal; LayerDiffuse is the alpha trick. | [12/INDEX.md](./12-vector-svg-generation/INDEX.md) |
| 13 | Transparent backgrounds | The #1 pain: checkerboard-drawn-as-pixels is an architectural limit of most VAEs; fix by routing or by post-matte; positive anchors beat negative prompts. | [13/INDEX.md](./13-transparent-backgrounds/INDEX.md) |
| 14 | Negative prompting & artifacts | Negative prompts are a CFG sampler trick, not universal; build a regenerate-vs-repair decision matrix + deterministic validator first + ML scorer + VLM rubric. | [14/INDEX.md](./14-negative-prompting-artifacts/INDEX.md) |
| 15 | Style consistency & brand | Machine-readable brand bundle (DTCG + style refs + LoRA/sref/style_id + `do_not[]`) injected at every call; K-means + ΔE2000 palette validation. | [15/INDEX.md](./15-style-consistency-brand/INDEX.md) |
| 16 | Background removal & vectorization | Post-processing spine: rembg/BiRefNet (default) + BRIA RMBG (hosted) + SAM 2 + vtracer + potrace + SVGO; two-stage segment → matte; ONNX + session reuse. | [16/INDEX.md](./16-background-removal-vectorization/INDEX.md) |
| 17 | Upscaling & refinement | Route by asset type, not by image; DAT2 fine-tunes are the 2026 generalist default; never diffusion refine a logo; upscale last. | [17/INDEX.md](./17-upscaling-refinement/INDEX.md) |
| 18 | Asset pipeline tools | `appicon.co`-killer stack: sharp + resvg + `@capacitor/assets` + icon-gen + BullMQ + R2; content-addressed storage; prompt-hash cache is the economic lever. | [18/INDEX.md](./18-asset-pipeline-tools/INDEX.md) |
| 19 | Agentic MCP / skills / architectures | One MCP binary + one SKILL.md + one un-frontmattered rule body satisfies 6 IDEs via ~60 lines of sync script; Humazier is the reference repo. | [19/INDEX.md](./19-agentic-mcp-skills-architectures/INDEX.md) |
| 20 | OSS repos landscape | Crowded at wrapper and UI layers, empty at correctness layer; the unclaimed whitespace is asset-correctness-first, research-grounded, multi-model, agent-parity. | [20/INDEX.md](./20-open-source-repos-landscape/INDEX.md) |

---

*Synthesis composed 2026-04-19 from 20 category indexes and 104 angle files (~3.5 MB of primary-source research). Drives the design of the `prompt-to-asset` MCP server, SSOT skill bundle, and cross-IDE packaging.*
