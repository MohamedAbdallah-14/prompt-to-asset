---
slug: future
date: 2026-04-21
role: index
status: future
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Research — Future Tracks

Scoped-out tracks researched during the 104-angle sweep but not required for v1. Each file sits here (rather than in `docs/research/assets/`) so readers don't assume there is a production code path backing it today. See `SYNTHESIS.md` for the cross-cutting read and the prioritization ranking; see the parent `../SYNTHESIS.md` + `../index.json` for the canonical research map.

## Tracks

| # | File | Track | Status | One-liner |
|---|---|---|---|---|
| 19 | [`asset-19-stock-photo-apis.md`](./asset-19-stock-photo-apis.md) | Stock photo APIs | Out of v1 | Pexels + Pixabay + Openverse adapter surface for IP-Adapter refs and OG backgrounds; Unsplash opt-in only. |
| 20 | [`asset-20-illustration-sets.md`](./asset-20-illustration-sets.md) | Illustration sets | Out of v1 | CC0 subset (Open Peeps, Open Doodles, Humaaans) is safe; Storyset / DrawKit / Absurd Design are attribution traps. |
| 21 | [`asset-21-3d-assets-mockups.md`](./asset-21-3d-assets-mockups.md) | 3D assets + mockups | Out of v1 | Poly Haven + ambientCG + Kenney + Quaternius + 3dicons bundle + Blender headless / three.js pipeline. |
| 22 | [`asset-22-patterns-gradients.md`](./asset-22-patterns-gradients.md) | Patterns + gradients | Out of v1 | Vendor MIT/ISC (svg-patterns, uiGradients, mesh-gradient); <200 LOC seeded generators under inline_svg. |
| 28 | [`asset-28-visual-diff-testing.md`](./asset-28-visual-diff-testing.md) | Visual-diff testing | Deferred v2 QA | `pixelmatch` + `sharp` + three-probe fake-transparency detector (`T0_CHECKERBOARD`). |
| 29 | [`asset-29-perceptual-hashing.md`](./asset-29-perceptual-hashing.md) | Perceptual hashing | Deferred v2 QA | `sharp-phash` + `blockhash-core` cheap tier + DINOv2/CLIP semantic tier for dedup and brand collisions. |
| 42 | [`asset-42-svg-motion-animation-libs.md`](./asset-42-svg-motion-animation-libs.md) | SVG motion libs | Out of v1 | anime.js / GSAP (free since 2024) / SMIL / SVG.js; emit Lottie JSON for portable export. |
| 43 | [`asset-43-lottie-rive-ecosystem.md`](./asset-43-lottie-rive-ecosystem.md) | Lottie + Rive | Out of v1 | Runtimes MIT/Apache, asset libraries mixed; `puppeteer-lottie` + `canvaskit-wasm` for server rasterize. |
| 44 | [`asset-44-open-audio-sfx.md`](./asset-44-open-audio-sfx.md) | Open audio + SFX | Out of scope (not image) | Pixabay + Freesound CC0 defaults; ffmpeg LGPL build + audiowaveform GPL subprocess. |
| 45 | [`asset-45-cc0-pd-aggregators.md`](./asset-45-cc0-pd-aggregators.md) | CC0 / PD aggregators | Out of v1 | Openverse + Met + NASA + Smithsonian + Europeana + Rijksmuseum + Cleveland + NGA + Internet Archive. |
| 46 | [`asset-46-image-moderation-oss.md`](./asset-46-image-moderation-oss.md) | Image moderation OSS | Deferred hosted tier | Falconsai ViT ONNX primary, nsfwjs ensemble, jaranohaal violence; CLIP safety-checker is a trap. |
| 48 | [`asset-48-mockup-libraries.md`](./asset-48-mockup-libraries.md) | Mockup libraries | Out of v1 | MIT engine (sharp + perspective.js + three.js + dimmmensions); bezel imagery is trademark-poisoned. |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — cross-track synthesis, prioritization ranking, dependencies, and aggregated primary sources.
- [`README.md`](./README.md) — why each file is deferred and the policy for promoting one into `docs/research/assets/`.

## Up one level

- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master research synthesis.
- [`../index.json`](../index.json) — machine-readable research index.
- [`../../RESEARCH_MAP.md`](../../RESEARCH_MAP.md) — wiring map between research and source code.
