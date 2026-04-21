---
slug: 04-gemini-imagen-prompting
role: index
date: 2026-04-21
last_updated: 2026-04-21
---

> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.

# Category 04 — Gemini Imagen Prompting

Google's Gemini 2.x and Imagen 3/4 prompt dialects, the checkerboard-as-RGB transparency failure, safety/SynthID constraints, and the Imagen-vs-Gemini split (T2I vs multimodal edit).

## Angles

| File | Topic |
|---|---|
| [`4a-imagen-official-prompt-guides.md`](./4a-imagen-official-prompt-guides.md) | Official Google Imagen 3/4 Prompt Guides & Capability Docs |
| [`4b-gemini-flash-image-nano-banana.md`](./4b-gemini-flash-image-nano-banana.md) | Gemini 2.5 Flash Image (\"Nano Banana\") — prompting, editing, and API surface |
| [`4c-transparent-background-checker-problem.md`](./4c-transparent-background-checker-problem.md) | Transparent Background Support in Gemini / Imagen — The 'Checker Pattern' Problem |
| [`4d-quirks-and-artifacts.md`](./4d-quirks-and-artifacts.md) | Community-documented Gemini/Imagen quirks & artifacts |
| [`4e-vertex-sdk-integration.md`](./4e-vertex-sdk-integration.md) | Programmatic Imagen 3/4 + Gemini 2.5 Flash Image via Vertex AI & google-genai SDK |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — synthesized insights across angles

## Up one level

- [`../index.md`](../index.md) — master research index
- [`../SYNTHESIS.md`](../SYNTHESIS.md) — master synthesis
