---
slug: 12-vector-svg-generation
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 12 — Vector Svg Generation

Three paths to SVG: LLM-authored SVG for simple geometry, Recraft V3 native vector, raster + `vtracer` / `potrace` + SVGO. Path count is a quality signal; LayerDiffuse handles alpha.

## Angles

| File | Topic |
|---|---|
| [`12a-native-vector-generation-papers.md`](./12a-native-vector-generation-papers.md) | Academic landscape of native vector (SVG) generation: DiffVG → StarVector → Chat2SVG |
| [`12b-raster-to-svg-tracers.md`](./12b-raster-to-svg-tracers.md) | Raster → Vector Tracing — potrace, vtracer, ImageTracer, DiffVG optimizers, and SaaS vectorizers |
| [`12c-svg-spec-features-for-assets.md`](./12c-svg-spec-features-for-assets.md) | SVG Spec Features That Matter for Asset Generation |
| [`12d-llm-direct-svg-code-generation.md`](./12d-llm-direct-svg-code-generation.md) | Programmatic SVG generation by LLMs: writing SVG code directly for logos, icons, and diagrams |
| [`12e-hybrid-vector-pipeline-architectures.md`](./12e-hybrid-vector-pipeline-architectures.md) | Hybrid Vector Pipelines: Combining AI Raster, AI Vector, and Programmatic SVG |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
