---
slug: 08-logo-generation
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 08 — Logo Generation

Logo generation as a routing + post-processing problem: re-parameterize user intent, route by text-length, never let diffusion render brand text past ~3 words.

## Angles

| File | Topic |
|---|---|
| [`8a-logo-design-theory-and-brand-fundamentals.md`](./8a-logo-design-theory-and-brand-fundamentals.md) | Logo Design Theory and Brand Identity Fundamentals |
| [`8b-prompt-patterns-by-logo-style.md`](./8b-prompt-patterns-by-logo-style.md) | Prompt Patterns by Logo Style — Flat, Minimalist, Geometric, Gradient, Isometric, 3D, Mascot, Badge, Monoline, Line-Art, Negative-Space, Flat-Vector-SVG |
| [`8c-text-rendering-in-logos.md`](./8c-text-rendering-in-logos.md) | Rendering text reliably inside logos: models, prompt syntax, non-Latin scripts, and post-processing |
| [`8d-monograms-and-color-palette-control.md`](./8d-monograms-and-color-palette-control.md) | Monogram / Icon-Only Logos and Precise Color Palette Control |
| [`8e-svg-vector-logo-pipeline.md`](./8e-svg-vector-logo-pipeline.md) | Full SVG Logo Pipeline — Prompt → Raster → Matte → Vector → Cleanup → Multi-Format Export |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
