# Research Plan — Prompt Enhancement for Software Asset Generation

## Goal

Build a deep knowledge base to support a system (skills for Gemini/Codex/Claude + a website) that turns simple requests like *"a transparent logo for my note-taking app"* into **correct, production-grade assets** (icons, logos, illustrations, favicons, OG images, splash screens, etc.) — solving the kinds of failures the user hits today (e.g. Gemini rendering "weird boxes in the background" instead of actual transparency).

## Agent Topology

- **20 research categories** (below)
- **5 research subagents per category** (each with a distinct angle) → **100 research agents**
- **1 category-indexer subagent per category** → **20 indexers**
- **1 master-synthesis subagent** → **1 final agent**
- **Total: 121 subagents**

Each research subagent writes one file:
`docs/research/<NN-category-slug>/<angle-slug>.md`

Each indexer writes:
`docs/research/<NN-category-slug>/INDEX.md` (synthesis + map of the angles)

Master writes:
`docs/research/SYNTHESIS.md` (plus a machine-readable `docs/research/index.json`).

## Categories

### Foundations & Theory
1. **01-prompt-engineering-theory** — Academic papers on prompting T2I models (CLIP guidance, classifier-free guidance, prompt decomposition, attention manipulation, compositional prompting).
2. **02-image-generation-models** — Diffusion, DiT, autoregressive, flow-matching foundational papers (Imagen, Parti, DALL-E lineage, SD/SDXL, Flux, Muse).
3. **03-evaluation-metrics** — CLIPScore, FID, HPSv2, PickScore, human preference, T2I-CompBench, alignment benchmarks.

### Model-Specific Prompting
4. **04-gemini-imagen-prompting** — Google Imagen 3/4, Gemini 2.5 Flash Image ("Nano Banana"), official prompt guides, known quirks, transparency handling.
5. **05-openai-dalle-gpt-image** — DALL·E 3, `gpt-image-1`, OpenAI cookbook, asset/logo behavior, alpha channel support.
6. **06-stable-diffusion-flux** — SD 1.5/2/XL, Flux.1 [dev]/[pro], ControlNet, LoRA, IP-Adapter, local pipelines.
7. **07-midjourney-ideogram-recraft** — MJ v6/v7, Ideogram (text rendering), Recraft (vector/brand), commercial tool prompting.

### Asset Categories (the product core)
8. **08-logo-generation** — Logo prompting, brand identity systems, negative space, flat/isometric/mascot styles.
9. **09-app-icon-generation** — iOS/Android/web app icons with platform specs (HIG, Material), masking, safe zones.
10. **10-ui-illustrations-graphics** — In-app illustrations (empty states, onboarding), marketing graphics, hero images.
11. **11-favicon-web-assets** — favicons, OG/Twitter cards, social share images, PWA icons.
12. **12-vector-svg-generation** — Vector-native generation (Recraft, SVG-diffusion), raster→vector pipelines.

### Hard Problems (the user's pain points)
13. **13-transparent-backgrounds** — Alpha channel generation, the "checkered box" problem, matting, models that truly support RGBA.
14. **14-negative-prompting-artifacts** — Negative prompts, artifact avoidance (extra limbs, watermarks, text corruption, checker patterns).
15. **15-style-consistency-brand** — Keeping a set of assets on-brand: style refs, IP-Adapter, LoRA, token-consistency techniques.

### Post-Processing & Pipelines
16. **16-background-removal-vectorization** — rembg, BRIA RMBG, U²-Net, BiRefNet; potrace, vtracer, autotrace for raster→SVG.
17. **17-upscaling-refinement** — Real-ESRGAN, SwinIR, SUPIR, high-res detail refinement, SDXL refiner patterns.
18. **18-asset-pipeline-tools** — appicon.co / makeappicon / icon.kitchen / Capacitor Assets / pwa-asset-generator, open-source alternatives.

### Integration & Productization
19. **19-agentic-mcp-skills-architectures** — Claude Skills, MCP tool design, Codex custom tools, Gemini function calling, how to expose asset-generation capabilities to coding agents.
20. **20-open-source-repos-landscape** — GitHub survey of prompt-enhancement libraries, asset generators, wrappers, and reference repos.

## Research Quality Bar

Each researcher must:
- Cite **primary sources**: arXiv papers, official docs, GitHub repos (with stars/activity), vendor blogs, community posts (HN/Reddit) only as corroboration.
- Include **direct links** to every source referenced.
- Include **concrete prompt examples** and **failure cases** where available.
- Prefer **2024–2026** sources; flag anything older than 2023 as legacy.
- Save output as markdown with YAML frontmatter.

## Execution Waves

- **Wave 1 (researchers 1/4):** categories 01–05 × 5 = 25 agents (background).
- **Wave 2 (researchers 2/4):** categories 06–10 × 5 = 25 agents.
- **Wave 3 (researchers 3/4):** categories 11–15 × 5 = 25 agents.
- **Wave 4 (researchers 4/4):** categories 16–20 × 5 = 25 agents.
- **Wave 5 (indexers):** 20 category indexers.
- **Wave 6 (master):** 1 synthesis agent.
