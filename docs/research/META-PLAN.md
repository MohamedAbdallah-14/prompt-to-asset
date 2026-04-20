# Meta-Plan — 50-Agent OSS Deep-Dive & Combination Planning

## Why

Category 20 (`20-open-source-repos-landscape`) already surveys the OSS landscape at
breadth. This second pass goes **deep on the top candidates**, fills **specific niches**
not yet mapped, and produces a **concrete recommended combination** for the
prompt-to-asset product.

## Topology (50 agents)

| Wave | Agents | Role | Output dir |
|---|---|---|---|
| 1 | 20 | Niche discovery — find OSS repos in named niches not yet deeply covered | `docs/research/21-oss-deep-dive/` |
| 2 | 20 | Per-repo deep dive — API, license, integration hooks, limitations, cost | `docs/research/22-repo-deep-dives/` |
| 3 | 9  | Combination planner — one stack proposal per optimization criterion | `docs/research/23-combinations/` |
| 4 | 1  | Master synthesizer — merges everything into a single recommended plan | `docs/research/23-combinations/RECOMMENDED.md` |

Total: **50 agents**, within the 80-agent budget.

## Niches (Wave 1, 20 agents)

1. LoRA / fine-tunes specifically for logo/brand/icon generation
2. Vector-native / SVG-diffusion OSS
3. Training code & datasets for T2I prompt rewriters (RL recipes, reward models)
4. Native RGBA / transparency generation — forks, derivatives, improvements on LayerDiffuse
5. Text-legibility-in-image OSS (SIGIL, TextDiffuser, Glyph-ByT5, AnyText, etc.)
6. Evaluation harnesses for T2I (T2I-CompBench, VBench-T2I, GenEval, HPSv2, PickScore)
7. Brand-DNA / URL→brand extractors (`dembrandt`, `brand-forge`, etc.)
8. Agent registries & discovery surfaces (v0, Claude Desktop, Smithery, mcp.so, Glama)
9. Cross-IDE installer tools / skills packaging (Cursor rules, Claude Skills, Codex tools)
10. OSS `appicon.co` / `makeappicon` replacements (end-to-end UI)
11. Favicon generators (OSS)
12. OG / social-card generators beyond `@vercel/og` (Satori, Playwright-based, etc.)
13. SVG / vector diffusion (Recraft-like OSS: SVGDreamer, VectorFusion, StarVector)
14. Sticker / emoji generators (OSS)
15. WebMCP / in-browser MCP implementations & demos
16. Skills packaging formats (Claude Skills, Cursor Rules, Codex tools, Windsurf, Gemini)
17. Mascot / character consistency (IP-Adapter, DreamBooth workflows)
18. Datasets for T2I alignment / asset generation
19. Serverless ComfyUI orchestration patterns (RunPod, Modal, ComfyDeploy, ComfyICU)
20. Tri-surface starters (web + hosted MCP + CLI/skills)

## Deep-dive targets (Wave 2, 20 agents)

1. `Hunyuan-PromptEnhancer/PromptEnhancer`
2. `microsoft/LMOps — promptist/`
3. `Nutlope/logocreator`
4. `shinpr/mcp-image`
5. `mcpware/logoloom`
6. `arekhalpern/mcp-logo-gen`
7. `niels-oz/icon-generator-mcp`
8. `zhangyu1818/appicon-forge`
9. `guillempuche/appicons`
10. `onderceylan/pwa-asset-generator`
11. `ionic-team/capacitor-assets`
12. `akabekobeko/npm-icon-gen`
13. `iconify/iconify`
14. `pheralb/svgl`
15. `danielgatis/rembg`
16. `visioncortex/vtracer`
17. `huchenlei/ComfyUI-layerdiffuse`
18. `yolain/ComfyUI-Easy-Use`
19. `vercel/mcp-adapter` + `vercel-labs/mcp-for-next.js`
20. Vercel AI SDK v5 `generateImage` (+ providers)

## Combinations (Wave 3, 9 agents)

Each planner produces one concrete stack proposal optimized for a single criterion and
writes it to `docs/research/23-combinations/<slug>.md` with the same schema so they can
be compared like-for-like.

1. `mvp-2-weeks` — minimum-viable stack to ship a working tri-surface in ~2 weeks
2. `license-clean-commercial` — MIT/Apache/OpenRAIL-M only, safe for paid SaaS
3. `quality-max` — asset-correctness-first, cost no object
4. `self-hosted-sovereign` — air-gapped-capable, open weights, no SaaS deps
5. `free-tier` — zero-cost user tier (CPU-runnable enhancer + free API windows)
6. `agent-native-first` — maximum MCP/WebMCP/Skills surface, web UI second
7. `hybrid` — API for hot paths + OSS for long tail
8. `edge-browser-first` — WebMCP + WASM where possible, browser as the runtime
9. `comfyui-native` — ComfyUI as the execution backbone, serverless hosted

## Synthesizer (Wave 4, 1 agent)

Reads:
- `docs/research/20-open-source-repos-landscape/INDEX.md`
- All `docs/research/21-oss-deep-dive/*.md`
- All `docs/research/22-repo-deep-dives/*.md`
- All `docs/research/23-combinations/*.md`

Writes:
- `docs/research/23-combinations/RECOMMENDED.md` — the single recommended combination,
  justified, with layered alternatives and a 90-day build order.

## Output schema (enforced for all agents)

Every file uses YAML frontmatter:

```yaml
---
wave: 1 | 2 | 3 | 4
role: niche-discovery | repo-deep-dive | combination-planner | synthesizer
slug: <kebab-case>
title: "…"
date: 2026-04-19
sources: [ <urls> ]
tags: [ … ]
---
```
