---
wave: 1
role: niche-discovery
slug: 20-ui-illustration-generators
title: "OSS UI-illustration / empty-state generators"
date: 2026-04-19
sources:
  - https://undraw.co/license
  - https://github.com/AnandChowdhary/undrawcdn
  - https://www.npmjs.com/package/react-undraw
  - https://www.openpeeps.com/
  - https://github.com/opeepsfun/open-peeps
  - https://www.opendoodles.com/
  - https://www.npmjs.com/package/react-open-doodles
  - https://www.humaaans.com/
  - https://blush.design/
  - https://blush.design/collections/open-peeps
  - https://flowbite.com/illustrations/
  - https://github.com/themesberg/flowbite-illustrations
  - https://manypixels.co/gallery/license
  - https://absurd.design/license
  - https://github.com/MrPeker/awesome-illustrations
  - https://github.com/Iconscout/unicons
  - https://iconduck.com/
  - https://www.npmjs.com/package/react-svg-color
  - https://github.com/christian-reichart/svg-chameleon
  - https://github.com/valor-labs/svg-color-replacement
  - https://github.com/joanrod/star-vector
  - https://starvector.github.io/starvector/
  - https://huggingface.co/alvdansen/illustration-1.0-flux-dev
  - https://huggingface.co/dvyio/flux-lora-simple-illustration
  - https://huggingface.co/unography/flux-lora-illustration-v1
  - https://civitai.com/models/1173739/flat-cartoon-illustration
  - https://civitai.com/models/488021/flat-colors
tags: [illustration, empty-state, onboarding, undraw, storyset, open-peeps]
---

# OSS UI-illustration / empty-state / onboarding-graphic generators

**Research value: moderate-to-high** — the "Storyset / unDraw / Blush" territory is dominated by hand-curated SVG libraries with permissive-but-not-CC0 licenses and only a thin generative frontier; the clearest prior art is composition-based, and generative work is mostly diffusion LoRAs plus a single credible text→SVG foundation model (StarVector).

## Prior art — curated SVG libraries (composition, not generation)

The category is defined by a small set of libraries that pair an SVG catalog with either a hosted recolor tool or a component-level color prop. Read against each other, their licenses fall into three tiers:

| Library | URL | License | Inputs | Outputs | Recolor | Style coverage |
|---|---|---|---|---|---|---|
| **unDraw** | <https://undraw.co> | Custom open license — free commercial use, **no attribution**, but explicitly forbids scraping, repackaging into packs, and **training AI/ML without written permission** ([`undraw.co/license`](https://undraw.co/license)) | Category browse + keyword search | SVG, PNG | Single-accent swap on the website (one brand color replaces `#6c63ff`); `react-undraw` exposes a `primaryColor` prop | ~300+ flat vector scenes, soft-stroke character style, single-accent + neutrals |
| **Open Peeps** | <https://openpeeps.com> (Pablo Stanley) | **CC0** | Composable parts (head, body, clothing, expression, accessory) | SVG via Figma / Sketch / Studio / Blush | Stroke+fill freely editable; no built-in palette swap | Hand-drawn ink-and-wash characters; 584k+ combinations advertised |
| **Open Doodles** | <https://opendoodles.com> | **CC0** | 50+ standalone scenes | SVG, PNG, GIF | `react-open-doodles` exposes `ink` and `accent` props | Sketchy monoline humans, daily activities |
| **Humaaans** | <https://humaaans.com> (Pablo Stanley) | **CC0** | Mix-and-match components (heads, tops, pants, poses) | SVG via Figma / Sketch | Fully editable vectors; no API | Flat-color people with distinct anatomy, marketing-friendly |
| **OpenDoodles / Open Peeps mixer** | <https://blush.design/collections/open-peeps> | Host is freemium, but Open Peeps + Open Doodles collections remain CC0 | Web composer | SVG, PNG | Global palette swap per collection | Hand-drawn character styles |
| **Flowbite Illustrations** | <https://flowbite.com/illustrations> / [`themesberg/flowbite-illustrations`](https://github.com/themesberg/flowbite-illustrations) | **MIT** | Browse by category | SVG, PNG, Figma | Live color-edit on site; palette baked into SVG (Tailwind hex tokens) | 54+ 3D-styled scenes paired with dark variants |
| **ManyPixels Gallery** | <https://manypixels.co/gallery> ([license](https://manypixels.co/gallery/license)) | Custom — commercial OK, no attribution, but **forbids compiling into packs, redistributing, embedding, or building integrations** (effectively blocks API-style consumption) | Web browse across five named styles | SVG, PNG | Global palette picker per illustration | 20k+ across Playstroke, Birdview, Chromablue, Colossalflat, Azureline — the widest style coverage in the OSS-adjacent space |
| **Absurd.design** | <https://absurd.design/license> | Custom — **attribution required** ("Illustration(s) from absurd.design" + link) | Static catalog | SVG, PNG | Hand-editable only | Surrealist hand-drawn, distinctive but single-style |
| **Iconscout Unicons** | [`Iconscout/unicons`](https://github.com/Iconscout/unicons) | **Apache-2.0** | npm / CDN | SVG, font, React/Vue/Flutter | `currentColor` on stroke | 7k+ line/solid icons; style-narrow but a useful fallback when "illustration" requests are actually "spot glyph" |
| **Iconduck** | <https://iconduck.com> | Aggregator; underlying items CC0 / MIT / Apache filtered at search time | Keyword search | SVG, PNG | Per-item | 100k+ items, licenses visible per-asset |
| **Storyset** | <https://storyset.com> | Freepik Free License — free with attribution or paid tier; **not OSS** | Web tool with palette and animation | SVG, PNG, Lottie | Per-scene recolor + Lottie export | Massive scene coverage; listed here so the plugin knows *not* to scrape |

License takeaway: **only Open Peeps, Open Doodles, Humaaans, Flowbite, and Unicons are safely bundle-able**. unDraw and ManyPixels are fine for *users* to download but forbid exactly the thing an "empty-state generator" wants to do (serve a precomputed catalog via API, or train on the assets). Absurd requires runtime attribution. Storyset is SaaS-only.

Curated-library awareness is not optional: the best directory of these is [`MrPeker/awesome-illustrations`](https://github.com/MrPeker/awesome-illustrations) (365★, still maintained as of 2026 per the Muzli roundup), and Iconduck acts as a license-filtered superset catalog.

## Adjacent solutions — recoloring pipelines

Generation without a recolor step ships a mismatched asset. Four approaches exist:

1. **Component-prop swap** (best ergonomics, limited to props the library exposes): `react-undraw` `primaryColor`, `react-open-doodles` `{ink, accent}`.
2. **CSS `currentColor`** — works when the SVG inlines `fill="currentColor"` or `stroke="currentColor"`. Unicons, Lucide, and many of Flowbite's 3D scenes use this. Brand color lives in a parent CSS variable; this is the lightest-weight recolor path.
3. **CSS-variable injection into SVG sprites** via [`svg-chameleon`](https://github.com/christian-reichart/svg-chameleon) — parses the SVG, replaces literal hex values with `var(--chameleon-n)`, and emits a sprite. The right tool when the source SVG has baked hex colors (unDraw, Humaaans) and you want per-instance theming without re-editing sources.
4. **Batch palette mapping** via [`valor-labs/svg-color-replacement`](https://github.com/valor-labs/svg-color-replacement) — analyzes a set of SVGs, clusters their palette, and lets you remap groups to a target palette. This is the right tool for bulk-normalizing a scraped-then-licensed set to a brand palette at build time.
5. **React wrapper with color array** — [`react-svg-color`](https://www.npmjs.com/package/react-svg-color) takes an SVG and an ordered hex array and overrides fills positionally. Unmaintained (last release ~5y ago) but the pattern is sound and reimplementable in ~50 LOC with `svgson`.

## Adjacent solutions — text→illustration generation

The generative frontier is thinner than the curated library frontier and splits into two camps.

**Raster illustration LoRAs on Flux / SDXL.** The strongest base is [`alvdansen/illustration-1.0-flux-dev`](https://huggingface.co/alvdansen/illustration-1.0-flux-dev) — no trigger word, trained on 244 curated refs covering anime, European comics, risograph, watercolor, manga; recommended weight 0.8–1.0 at CFG 1.0 / 35 steps. Simpler line styles: [`dvyio/flux-lora-simple-illustration`](https://huggingface.co/dvyio/flux-lora-simple-illustration) (trigger `illustration in the style of SMPL`, thick black lines on white), [`unography/flux-lora-illustration-v1`](https://huggingface.co/unography/flux-lora-illustration-v1), and Civitai's [Flat Cartoon Illustration](https://civitai.com/models/1173739/flat-cartoon-illustration) (Flux) / [Flat Colors](https://civitai.com/models/488021/flat-colors) (Flux1-Dev). None of these targets "empty state / onboarding" specifically; they deliver *style registers* that an enhancer prompt then has to compose into a scene with an explicit subject, safe-area, and palette directive — consistent with category 10's "freeze the style outside the prompt" rule.

**Native text→SVG code generation.** [**StarVector**](https://github.com/joanrod/star-vector) (CVPR 2025) is the one credible OSS foundation model in this lane. Vision-language architecture, trained on the 2M-sample SVG-Stack dataset, published in 1B and 8B sizes, evaluated on SVG-Bench. Produces compact SVG code (circles, polygons, paths, text nodes) rather than rasterizing-then-tracing — which matters for icon-scale work where `vtracer` outputs tend to explode into thousands of polygons. A follow-up (RLRF, NeurIPS 2025) adds an RL objective over rendered-image similarity. Practical constraints: 8B is the only version that handles illustration-grade complexity; expect a GPU inference path, not client-side.

## Market and competitor signals

- **Storyset is the user-facing reference point** — scene coverage, per-color palette, and Lottie export are what power users actually want. Nothing in OSS matches all three today.
- **Blush is the composition-based reference point** — "pick a style collection, mix parts, recolor globally, export". The underlying Open Peeps and Open Doodles collections are CC0, so this pattern is fully reproducible OSS-side.
- **Hand-curated library plus live recolor is a solved problem**; the open gap is *selection and composition intelligence* — given a prompt like "empty state for a deleted chat thread", route to the right scene in the right library, recolor to brand, and return an SVG.
- **unDraw's explicit "no AI/ML training without permission" clause** is a hard constraint: bundling its catalog or fine-tuning on it is out of bounds; linking users to the hosted recolor with a prefilled brand color is fine.

## Cross-domain analogies

- **Iconify for illustrations.** Iconify (cited in the category-20 index) solved the "275k icons with unified `currentColor` theming" problem by building a metadata layer over many third-party sets. The same structural pattern — unified manifest, license-per-item, `currentColor`-first theming, single runtime — ports directly to illustrations if we bundle only the five CC0/MIT sources and link out to the restrictive ones.
- **Polotno / `@vercel/og` for scene composition.** Category 10 and 20 flag JSON-template renderers (Polotno, Satori, `@vercel/og`) as deterministic composers for text-bearing graphics. The same template model (JSON schema → SVG) applies when the "illustration" is actually parts-based (Humaaans-style) rather than whole-scene (unDraw-style).

## Integration recommendations

**Composition library to bundle** (primary): ship an "empty-state + onboarding" catalog built from **Open Peeps + Open Doodles + Humaaans + Flowbite Illustrations + Iconscout Unicons**. All five are MIT / Apache-2.0 / CC0 and collectively cover: hand-drawn character scenes (Open Peeps, Open Doodles), flat-color people (Humaaans), 3D-styled scenes with dark variants (Flowbite), and spot pictograms (Unicons). Expose each via a unified manifest (id, source, license, tags, palette-slots) and a single recolor API backed by **`svg-chameleon`** for variable injection plus a small `svgson`-based palette remapper for sources with baked hex. For unDraw, ManyPixels, Absurd, and Storyset, the tool surfaces them as deep-links with the brand color pre-applied in the URL query, never as bundled bytes — this respects every restrictive clause while still delivering a recolored preview.

**Generation approaches when bespoke is needed:**

1. **Flux.1-dev + `alvdansen/illustration-1.0-flux-dev` + IP-Adapter-Style** as the default raster path. The LoRA gives the register (no trigger word, so it composes cleanly with other LoRAs), IP-Adapter locks palette and character style to 3–5 brand anchors (consistent with category 10's `illustration.capture-style-reference` skill). Post-process with **BRIA RMBG 2.0** for clean alpha and **`vtracer`** (`--filter_speckle 6 --corner_threshold 60`) when SVG delivery is required.
2. **StarVector-8B for direct text→SVG** when the target is icon- or spot-illustration-scale (≤~200 paths) and the user needs editable vectors, not raster. Use it behind the same `generate_illustration` tool; route by `{output: "svg", complexity: "simple"}`. Keep a vtracer-of-Flux fallback for scenes where StarVector struggles.

Validation layer (`validate_asset`) must check: palette adherence to the supplied brand tokens, alpha coverage for raster, path-count and bounding-box sanity for SVG, and presence of the license notice for any bundled source. This closes the loop the curated libraries leave open and is the actual differentiator vs. every prior "unDraw clone".
