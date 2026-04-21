---
slug: 02-image-generation-models
role: index
date: 2026-04-21
---

> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.

# Category 02 — Image Generation Models

Architectural landscape of text-to-image models: diffusion, autoregressive transformers, flow matching / rectified flow, DiT / MM-DiT backbones, and Google's Imagen stack.

## Angles

| File | Topic |
|---|---|
| [`2a-diffusion-foundations.md`](./2a-diffusion-foundations.md) | Diffusion model foundations |
| [`2b-autoregressive-transformer-t2i.md`](./2b-autoregressive-transformer-t2i.md) | Transformer & Autoregressive Text-to-Image Models |
| [`2c-flow-matching-rectified-flow.md`](./2c-flow-matching-rectified-flow.md) | Flow Matching & Rectified Flow: The New Backbone of Frontier Text-to-Image Models |
| [`2d-dit-mmdit-architectures.md`](./2d-dit-mmdit-architectures.md) | DiT & MM-DiT Architectures: From Peebles–Xie to Flux.1 |
| [`2e-imagen-technical-reports.md`](./2e-imagen-technical-reports.md) | Imagen 1/2/3/4 Technical Reports & Gemini 2.5 Flash Image ("Nano Banana") Model Specs |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
