---
slug: research
role: master-index
date: 2026-04-21
categories: 36
angle_files: 185
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# prompt-to-asset — Research Index

This folder is the research substrate behind the `prompt-to-asset` MCP server, its skills, and its routing tables. Each numbered subfolder covers one category; every angle inside a category is a single primary-source-grounded document. Read [`SYNTHESIS.md`](./SYNTHESIS.md) for the cross-category synthesis that drives the product's design decisions.

## How to navigate

- `index.md` (this file) — the master map. Lists every category and links to its folder-level `index.md`.
- `SYNTHESIS.md` — the cross-category synthesis. Answers "what do all 36 categories taken together imply for the plugin?"
- Per-folder `index.md` — lists the angle files inside a single category and points at that category's `SYNTHESIS.md`.
- Per-folder `SYNTHESIS.md` — synthesizes the N angle files inside a single category.
- Angle files (e.g. `02-image-generation-models/2a-diffusion-foundations.md`) — the primary-source research itself.

Additional top-level files:
- [`PLAN.md`](./PLAN.md) — original research plan.
- [`META-PLAN.md`](./META-PLAN.md) — plan-of-the-plan.
- [`index.json`](./index.json) — machine-readable category manifest.

## Categories

### Wave 1 — Foundations & prompt dialects (cat 01–07)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 01 | Prompt engineering theory | [index](./01-prompt-engineering-theory/index.md) | [synthesis](./01-prompt-engineering-theory/SYNTHESIS.md) |
| 02 | Image generation models | [index](./02-image-generation-models/index.md) | [synthesis](./02-image-generation-models/SYNTHESIS.md) |
| 03 | Evaluation metrics | [index](./03-evaluation-metrics/index.md) | [synthesis](./03-evaluation-metrics/SYNTHESIS.md) |
| 04 | Gemini / Imagen prompting | [index](./04-gemini-imagen-prompting/index.md) | [synthesis](./04-gemini-imagen-prompting/SYNTHESIS.md) |
| 05 | OpenAI DALL·E / gpt-image | [index](./05-openai-dalle-gpt-image/index.md) | [synthesis](./05-openai-dalle-gpt-image/SYNTHESIS.md) |
| 06 | Stable Diffusion / Flux | [index](./06-stable-diffusion-flux/index.md) | [synthesis](./06-stable-diffusion-flux/SYNTHESIS.md) |
| 07 | Midjourney / Ideogram / Recraft | [index](./07-midjourney-ideogram-recraft/index.md) | [synthesis](./07-midjourney-ideogram-recraft/SYNTHESIS.md) |

### Wave 1 — Asset-type playbooks (cat 08–13)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 08 | Logo generation | [index](./08-logo-generation/index.md) | [synthesis](./08-logo-generation/SYNTHESIS.md) |
| 09 | App icon generation | [index](./09-app-icon-generation/index.md) | [synthesis](./09-app-icon-generation/SYNTHESIS.md) |
| 10 | UI illustrations & graphics | [index](./10-ui-illustrations-graphics/index.md) | [synthesis](./10-ui-illustrations-graphics/SYNTHESIS.md) |
| 11 | Favicon / web assets | [index](./11-favicon-web-assets/index.md) | [synthesis](./11-favicon-web-assets/SYNTHESIS.md) |
| 12 | Vector / SVG generation | [index](./12-vector-svg-generation/index.md) | [synthesis](./12-vector-svg-generation/SYNTHESIS.md) |
| 13 | Transparent backgrounds | [index](./13-transparent-backgrounds/index.md) | [synthesis](./13-transparent-backgrounds/SYNTHESIS.md) |

### Wave 1 — Correctness layer (cat 14–18)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 14 | Negative prompting & artifacts | [index](./14-negative-prompting-artifacts/index.md) | [synthesis](./14-negative-prompting-artifacts/SYNTHESIS.md) |
| 15 | Style consistency & brand | [index](./15-style-consistency-brand/index.md) | [synthesis](./15-style-consistency-brand/SYNTHESIS.md) |
| 16 | Background removal & vectorization | [index](./16-background-removal-vectorization/index.md) | [synthesis](./16-background-removal-vectorization/SYNTHESIS.md) |
| 17 | Upscaling & refinement | [index](./17-upscaling-refinement/index.md) | [synthesis](./17-upscaling-refinement/SYNTHESIS.md) |
| 18 | Asset pipeline tools | [index](./18-asset-pipeline-tools/index.md) | [synthesis](./18-asset-pipeline-tools/SYNTHESIS.md) |

### Wave 1 — Ecosystem & combinations (cat 19–23)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 19 | Agentic MCP / skills / architectures | [index](./19-agentic-mcp-skills-architectures/index.md) | [synthesis](./19-agentic-mcp-skills-architectures/SYNTHESIS.md) |
| 20 | OSS repos landscape | [index](./20-open-source-repos-landscape/index.md) | [synthesis](./20-open-source-repos-landscape/SYNTHESIS.md) |
| 21 | OSS deep dive | [index](./21-oss-deep-dive/index.md) | [synthesis](./21-oss-deep-dive/SYNTHESIS.md) |
| 22 | Repo deep dives | [index](./22-repo-deep-dives/index.md) | [synthesis](./22-repo-deep-dives/SYNTHESIS.md) |
| 23 | Stack combinations | [index](./23-combinations/index.md) | [synthesis](./23-combinations/SYNTHESIS.md) |

### Wave 2 — Agentic patterns (cat 24–33)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 24 | Agentic orchestration patterns | [index](./24-agentic-orchestration-patterns/index.md) | [synthesis](./24-agentic-orchestration-patterns/SYNTHESIS.md) |
| 24′ | Skills for P2A | [index](./24-skills-for-p2a/index.md) | [synthesis](./24-skills-for-p2a/SYNTHESIS.md) |
| 25 | Structured generation / constrained decoding | [index](./25-structured-generation-constrained-decoding/index.md) | [synthesis](./25-structured-generation-constrained-decoding/SYNTHESIS.md) |
| 26 | Reflection / self-refinement | [index](./26-reflection-self-refinement/index.md) | [synthesis](./26-reflection-self-refinement/SYNTHESIS.md) |
| 27 | Agent evaluation frameworks | [index](./27-agent-evaluation-frameworks/index.md) | [synthesis](./27-agent-evaluation-frameworks/SYNTHESIS.md) |
| 28 | CI/CD asset automation | [index](./28-cicd-asset-automation/index.md) | [synthesis](./28-cicd-asset-automation/SYNTHESIS.md) |
| 29 | RAG / brand knowledge | [index](./29-rag-brand-knowledge/index.md) | [synthesis](./29-rag-brand-knowledge/SYNTHESIS.md) |
| 30 | Agent memory / state | [index](./30-agent-memory-state/index.md) | [synthesis](./30-agent-memory-state/SYNTHESIS.md) |
| 31 | Cost optimization (agentic) | [index](./31-cost-optimization-agentic/index.md) | [synthesis](./31-cost-optimization-agentic/SYNTHESIS.md) |
| 32 | Streaming / realtime UX | [index](./32-streaming-realtime-ux/index.md) | [synthesis](./32-streaming-realtime-ux/SYNTHESIS.md) |
| 33 | Model routing / ensembling | [index](./33-model-routing-ensembling/index.md) | [synthesis](./33-model-routing-ensembling/SYNTHESIS.md) |

### Wave 2 — Skills landscape (cat 34)

| # | Category | Index | Synthesis |
|---|---|---|---|
| 34 | Installable skills survey | [index](./34-installable-skills-survey/index.md) | [synthesis](./34-installable-skills-survey/SYNTHESIS.md) |

### Scoped out — future work

| Folder | Index | Synthesis |
|---|---|---|
| `future/` | [index](./future/index.md) | [synthesis](./future/SYNTHESIS.md) |

## Shared assets

- [`assets/`](./assets/index.md) — images, diagrams, and other binary research artifacts referenced by angle files.

## Status

Index built 2026-04-21. Every listed category has a working `index.md` and `SYNTHESIS.md`. When a new category is added, regenerate `index.json` and append a row here before merging.
