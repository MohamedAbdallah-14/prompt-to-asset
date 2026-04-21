---
slug: 23-combinations
role: index
date: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.
>
> **Cross-cutting corrections applied 2026-04-21 across all angle files:** Recraft V4 (Feb 2026) is SOTA for SVG/vector (V3 stays only for `style_id` portability); `gpt-image-1.5` is the current primary OpenAI image model (gpt-image-1 = "previous"; DALL-E 3 API shuts down 2026-05-12); Ideogram transparency = `/ideogram-v3/generate-transparent` dedicated POST endpoint (not `style:"transparent"`); Flux `negative_prompt` raises TypeError on ALL variants; `rembg` bare `remove()` defaults to u2net — call `new_session("birefnet-general")` explicitly for BiRefNet; SVGO v4 `removeViewBox`/`removeTitle` disabled by default in `preset-default` (`removeViewBox:false` override is a no-op); `gpt-image-1.5` native streaming: `stream:true` + `partial_images:0–3`; MCP spec 2025-11-25 is Latest Stable; Gemini/Imagen programmatic use requires billing.

# Category 23 — Stack Combinations

Nine planner documents explore distinct ways to assemble a prompt-to-asset product from OSS components + hosted APIs. Each optimizes for one axis (shipability, license cleanliness, correctness, sovereignty, cost, agent-nativeness, hybrid pragmatism, edge-first privacy, ComfyUI cost-at-scale). `RECOMMENDED.md` picks the hybrid (07) as primary with MVP anchored on 01, agent surface from 06, and correctness loop from 03. `SYNTHESIS.md` aggregates the cross-cutting patterns, controversies, and gaps across all nine.

## Stacks

| # | File | Stack name | One-liner |
|---|---|---|---|
| 01 | [`01-mvp-2-weeks.md`](./01-mvp-2-weeks.md) | MVP-in-2-Weeks | Tri-surface ship in 14 days, two providers, three sharp validators, zero ops floor |
| 02 | [`02-license-clean-commercial.md`](./02-license-clean-commercial.md) | License-Clean Commercial | MIT/Apache/OpenRAIL-M only, CI SPDX drift gate, explicit CC-BY-NC and AGPL bans |
| 03 | [`03-quality-max.md`](./03-quality-max.md) | Quality-Max | Six-gate validator scoreboard + tree-search regeneration + 500-brief golden set |
| 04 | [`04-self-hosted-sovereign.md`](./04-self-hosted-sovereign.md) | Self-Hosted Sovereign | Single-box appliance, Qwen2.5-7B moat, no SaaS deps, air-gap deployable |
| 05 | [`05-free-tier.md`](./05-free-tier.md) | Free-Tier | Zero-auth browser-first, four-lane burn-down rotor, ~$0.037/user/mo amortized |
| 06 | [`06-agent-native-first.md`](./06-agent-native-first.md) | Agent-Native First | Fifteen Zod-typed verbs across three transports and seven IDE envelopes are *the* product |
| 07 | [`07-hybrid.md`](./07-hybrid.md) | Hybrid | Commercial APIs on hot paths, OSS on long tail, router is data not code |
| 08 | [`08-edge-browser-first.md`](./08-edge-browser-first.md) | Edge/Browser-First | WASM + Cloudflare Workers + WebMCP, everything around the generator runs on device |
| 09 | [`09-comfyui-native.md`](./09-comfyui-native.md) | ComfyUI-Native | Six workflow templates, Modal + RunPod + Replicate triad, $0.006/asset blended |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — cross-cutting patterns, trade-offs matrix, controversies, gaps, primary-source aggregation
- [`RECOMMENDED.md`](./RECOMMENDED.md) — final recommendation: hybrid primary, phased four-phase rollout, seven kill-switches
- [`../index.md`](../index.md) — parent research index
