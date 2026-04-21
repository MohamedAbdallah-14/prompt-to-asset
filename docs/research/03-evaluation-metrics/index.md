---
slug: 03-evaluation-metrics
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 03 — Evaluation Metrics

How to measure T2I output quality: alignment (CLIPScore, VQAScore), perceptual quality (FID, FD-DINOv2, CMMD), human-preference models (HPS, PickScore, ImageReward), VLM-as-judge, and asset-specific deterministic validators.

## Angles

| File | Topic |
|---|---|
| [`3a-clip-alignment-metrics.md`](./3a-clip-alignment-metrics.md) | CLIPScore, BLIP, VQAScore, TIFA, DSG — Vision-Language Alignment Metrics for T2I |
| [`3b-fid-perceptual-metrics.md`](./3b-fid-perceptual-metrics.md) | FID, KID, IS & Perceptual Fidelity Metrics for Generative Asset Quality |
| [`3c-human-preference-models.md`](./3c-human-preference-models.md) | Human Preference Models for Text-to-Image Evaluation |
| [`3d-compositional-benchmarks.md`](./3d-compositional-benchmarks.md) | Compositional Benchmarks for Text-to-Image (and -Video) Generation |
| [`3e-asset-specific-eval.md`](./3e-asset-specific-eval.md) | Asset-Specific Evaluation (Logos, Icons, Favicons, App Icons) |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
