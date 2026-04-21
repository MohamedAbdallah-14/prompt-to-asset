---
slug: 15-style-consistency-brand
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 15 — Style Consistency Brand

Machine-readable brand bundles (DTCG tokens + style reference images + LoRA / `--sref` / `style_id` handle + `do_not[]`) injected at every call; K-means + ΔE2000 palette validation.

## Angles

| File | Topic |
|---|---|
| [`15a-consistent-character-and-mascot.md`](./15a-consistent-character-and-mascot.md) | Consistent character / mascot / product across images — DreamBooth, Textual Inversion, LoRA, IP-Adapter, InstantID, PhotoMaker, MJ --cref, Ideogram character ref, Flux Redux, gpt-image-1, Gemini 2.5 Flash |
| [`15b-style-transfer-sref-b-lora.md`](./15b-style-transfer-sref-b-lora.md) | Style (not subject) transfer: MJ --sref, IP-Adapter style, StyleAligned, B-LoRA, Visual Style Prompting — keeping a brand aesthetic across 100 assets |
| [`15c-brand-color-palette-enforcement.md`](./15c-brand-color-palette-enforcement.md) | Brand Color Enforcement: Recraft color API, IP-Adapter color, post-generation palette remap, LUTs |
| [`15d-machine-readable-brand-bundle.md`](./15d-machine-readable-brand-bundle.md) | Encoding a Brand/Design System into a Machine-Usable Bundle for Prompt Enhancement |
| [`15e-full-asset-set-consistency.md`](./15e-full-asset-set-consistency.md) | Full Asset Set Consistency — One Brand, Many Artifacts |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
