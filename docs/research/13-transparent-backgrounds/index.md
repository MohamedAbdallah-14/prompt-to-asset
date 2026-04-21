---
slug: 13-transparent-backgrounds
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 13 — Transparent Backgrounds

The #1 pain: RGB-only VAEs render a Photoshop-style checkerboard as pixels. Fix hierarchy — route to native-RGBA model → LayerDiffuse → post-matte (BiRefNet / BRIA RMBG-2.0) → vectorize-and-drop.

## Angles

| File | Topic |
|---|---|
| [`13a-rgba-architecture-layer-diffuse.md`](./13a-rgba-architecture-layer-diffuse.md) | Alpha at the Model-Architecture Level — LayerDiffuse, Latent Transparency, and RGBA-Aware VAEs |
| [`13b-difference-matting-and-chroma-keying.md`](./13b-difference-matting-and-chroma-keying.md) | Workaround Pipelines for RGBA: Triangulation Matting, Difference Matting, Chroma Keying, and Solid-Background Removal |
| [`13c-checkerboard-pixel-drawing-failure.md`](./13c-checkerboard-pixel-drawing-failure.md) | The 'Checkerboard Drawn Into Pixels' Failure — Root Cause, Reproduction, Prompt Audit, and Detection |
| [`13d-matting-models-birefnet-rmbg-u2net.md`](./13d-matting-models-birefnet-rmbg-u2net.md) | SOTA image matting and salient-object extraction models (BRIA RMBG, BiRefNet, U²-Net, ISNet, InSPyReNet, MODNet, MatAnyone) |
| [`13e-end-to-end-transparent-pipelines.md`](./13e-end-to-end-transparent-pipelines.md) | End-to-end transparent-asset pipelines for a prompt-to-asset plugin |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
