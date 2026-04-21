---
slug: 22-repo-deep-dives
date: 2026-04-21
role: index
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 22 — Repo Deep Dives

Twenty file-level teardowns of the OSS repos that define (or fail to define) the prompt-to-asset stack: two prompt rewriters, five logo/icon MCPs + the Nutlope UI reference, four platform-spec fan-out libraries, two icon/brand-mark catalogues, matting + vectorizing primitives, the ComfyUI native-RGBA pair, the Vercel MCP skeleton trio, and the Vercel AI SDK v5 image surface. Each file enumerates metrics, license, architecture, gaps, and a USE/FORK/INSPIRE/SKIP decision. The synthesis (`SYNTHESIS.md`) aggregates 15 load-bearing insights, 10 cross-cutting patterns, 10 gaps, and 15 recommendations anchored to section citations.

## Repos

| # | File | Repo | Role | One-liner |
|---|---|---|---|---|
| 01 | [01-hunyuan-prompt-enhancer.md](./01-hunyuan-prompt-enhancer.md) | Hunyuan-PromptEnhancer/PromptEnhancer | Reference rewriter recipe | CVPR-2026 SFT→GRPO with 24-KP AlignEvaluator; INSPIRE-ONLY, asset-blind, 7B has EU/UK/KR exclusion. |
| 02 | [02-promptist.md](./02-promptist.md) | microsoft/LMOps/promptist | Blueprint for CPU/browser rewriter | 125M GPT-2, SFT→PPO on Lexica (ToS trap); recipe reusable, checkpoint unfit. |
| 03 | [03-nutlope-logocreator.md](./03-nutlope-logocreator.md) | Nutlope/logocreator | UI reference | 6,956★ split-panel + Clerk+Upstash BYOK pattern; no license, no rewriter, no MCP. |
| 04 | [04-shinpr-mcp-image.md](./04-shinpr-mcp-image.md) | shinpr/mcp-image | Canonical rewriter layer | Subject-Context-Style +94% measured; MIT; MCP + Skill dual packaging; Gemini-only. |
| 05 | [05-logoloom.md](./05-logoloom.md) | mcpware/logoloom | LLM-authored-SVG branch | No provider, LLM writes SVG; BRAND.md + opentype.js + SVGO + sharp; MIT. |
| 06 | [06-arekhalpern-mcp-logo-gen.md](./06-arekhalpern-mcp-logo-gen.md) | arekhalpern/mcp-logo-gen | Negative reference specimen | Ideogram v2 hard-pinned, GPL-3.0, SSE-localhost, stale 13 months. |
| 07 | [07-niels-oz-icon-mcp.md](./07-niels-oz-icon-mcp.md) | niels-oz/icon-generator-mcp | Host-LLM-as-renderer pattern | `prepare_icon_context` → host renders SVG → `save_icon`; MIT; single style preset. |
| 08 | [08-appicon-forge.md](./08-appicon-forge.md) | zhangyu1818/appicon-forge | Composition schema | ~35-field Styles + Iconify over CSS; 983★; adopt schema, discard UI. |
| 09 | [09-guillempuche-appicons.md](./09-guillempuche-appicons.md) | guillempuche/appicons | Primary `resize_icon_set` driver | iOS 18 + Android 13 monochrome + watchOS/tvOS/visionOS; MIT; bus-factor one. |
| 10 | [10-pwa-asset-generator.md](./10-pwa-asset-generator.md) | elegantapp/pwa-asset-generator | PWA/favicon/mstile slice | Puppeteer art-board + daily HIG CI scrape; MIT; 17.6k weekly. |
| 11 | [11-capacitor-assets.md](./11-capacitor-assets.md) | ionic-team/capacitor-assets | iOS/Android native driver | Node API (not just CLI) across `IosAssetGenerator`/`AndroidAssetGenerator`/`PwaAssetGenerator`; MIT; 263k weekly. |
| 12 | [12-npm-icon-gen.md](./12-npm-icon-gen.md) | akabekobeko/npm-icon-gen | `.ico`/`.icns` leg | Hand-written Apple RLE24 binary serializers; MIT; 60KB unpacked. |
| 13 | [13-iconify.md](./13-iconify.md) | iconify/iconify | Iconic single-glyph fast path | 275k marks / 200+ sets with per-set license metadata inline in search; MIT framework. |
| 14 | [14-svgl.md](./14-svgl.md) | pheralb/svgl | `find_brand_logo` secondary | 400+ hand-optimized brand SVGs, theme-paired; MIT code + nominative fair use on marks. |
| 15 | [15-rembg.md](./15-rembg.md) | danielgatis/rembg | Default matting engine | 17-model catalog; BiRefNet-general-lite MIT default; BRIA RMBG 2.0 is CC-BY-NC landmine. |
| 16 | [16-vtracer.md](./16-vtracer.md) | visioncortex/vtracer | Default vectorizer | MIT, ~134KB wasm, 8–30 paths on logos; only mature MIT color tracer in 2026. |
| 17 | [17-comfyui-layerdiffuse.md](./17-comfyui-layerdiffuse.md) | huchenlei/ComfyUI-layerdiffuse | Primary self-hosted RGBA | Apache-2.0 code + OpenRAIL-M weights, 9-node minimum SDXL workflow; no Flux. |
| 18 | [18-comfyui-easy-use.md](./18-comfyui-easy-use.md) | yolain/ComfyUI-Easy-Use | 3-node transparent-SDXL skeleton | GPL-3.0 — call over HTTP/WS, never vendor; adopt minimal workflow JSON. |
| 19 | [19-vercel-mcp-stack.md](./19-vercel-mcp-stack.md) | vercel/mcp-handler + mcp-for-next.js + run-llama/mcp-nextjs | OAuth-complete skeleton | Apache-2.0 + MIT + MIT; fork `mcp-nextjs`, bump SDK, swap to `withMcpAuth`. |
| 20 | [20-vercel-ai-sdk-image.md](./20-vercel-ai-sdk-image.md) | vercel/ai v6 `generateImage` (stable, Dec 2025) | Typed image foundation | Apache-2.0; `generateImage` promoted to stable in v6; `ImageModelV2` + `ImageProvider` port over OpenAI/Google/fal/Replicate/Together/Luma/Fireworks. |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — full cross-repo synthesis: 15 load-bearing insights, 10 cross-cutting patterns (P1–P10), 10 gaps, 15 actionable recommendations, and a de-duplicated primary-source table.
- [`../`](../) — parent research root (categories 01–29).
