---
slug: 21-oss-deep-dive
date: 2026-04-21
role: index
last_audited: 2026-04-21
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

> **🔄 Audit note (2026-04-21):** Angles 11–20 plus SYNTHESIS.md audited and corrected. Key corrections: (a) `@realfavicongenerator/generate-favicon` star count grew from ~34★ to ~5k★ (v0.8.0 active); (b) `itgalaxy/favicons` updated to v7.1.3 (April 2026) — actively maintained; (c) `pwa-asset-generator` moved to `elegantapp/pwa-asset-generator`, v8.1.4 (March 2026), ~3k★; (d) BFL launched self-serve commercial licensing portal (June 2025) — Flux.1 [dev] / Kontext [dev] now commercially licensable without custom negotiation; (e) Nuxt OG Image v6 recommends Takumi via per-component filename suffix, not a global default; (f) AAIF has 170+ member orgs (April 2026); (g) `comfy-deploy/comfydeploy` at ~1.3k★; (h) `bentoml/comfy-pack` at ~164★ (pre-release cadence). Angles 11–13 factual accuracy high. Angles 14–20 factual accuracy high with noted star-count corrections.

# Category 21 — OSS Deep Dive

Twenty angle-level deep dives into the OSS underlying every layer of a prompt-to-asset stack: weights and fine-tunes (logo/brand LoRAs, native-RGBA LayerDiffuse, text-rendering foundations, mascot identity adapters), pipeline primitives (vector/SVG generation, brand-DNA extraction, evaluation harnesses, alignment datasets), packaging surfaces (MCP registries, cross-IDE installers, skills formats, WebMCP), and vertical niches (app-icon, favicon, OG, sticker, UI illustration, serverless ComfyUI, tri-surface starters). The category is scoped to *code and weights that exist today*, with licence provenance, maintenance signal, and integration fit called out per artifact. Read the synthesis for the cross-angle patterns; read individual angles for per-artifact detail.

## Angles

| # | File | Topic | One-liner |
|---|---|---|---|
| 01 | [`01-logo-brand-loras.md`](./01-logo-brand-loras.md) | Logo/brand LoRAs | 25+ usable SDXL/Flux LoRAs; five-LoRA commercial-safe bundle; Flux [dev] licence trap. |
| 02 | [`02-vector-svg-diffusion-oss.md`](./02-vector-svg-diffusion-oss.md) | Vector/SVG diffusion OSS | Three families (DiffVG+SDS, autoregressive, classical); OmniSVG-4B + StarVector-1B close the Recraft V3 gap. |
| 03 | [`03-prompt-rewriter-training.md`](./03-prompt-rewriter-training.md) | Prompt-rewriter training | Promptist → BeautifulPrompt → Hunyuan lineage; `imscore` + TRL GRPO; $1–3k budget; ship system-prompted first. |
| 04 | [`04-native-rgba-generation.md`](./04-native-rgba-generation.md) | Native RGBA generation | LayerDiffuse still the only public alpha architecture; four deployment routes by base-model licence. |
| 05 | [`05-text-in-image-oss.md`](./05-text-in-image-oss.md) | Text-in-image OSS | Three-tier router: commercial API → Qwen-Image/AnyText2/GlyphControl → Satori/Pillow composite. |
| 06 | [`06-t2i-eval-harnesses.md`](./06-t2i-eval-harnesses.md) | T2I eval harnesses | SigLIP 2 + MPS alignment head + PyMatting + GenEval 2 + DeepEval VLM rerank. |
| 07 | [`07-brand-dna-extractors.md`](./07-brand-dna-extractors.md) | Brand-DNA extractors | `dembrandt` primary; `OpenBrand` for logos; format layer (brand.md / brandspec / AdCP) lacks self-ingest. |
| 08 | [`08-mcp-registries.md`](./08-mcp-registries.md) | MCP registries | 11 registries; Official Registry feeds 4 downstream; metadata hygiene dominates reach; one engineer-day plan. |
| 09 | [`09-cross-ide-installers.md`](./09-cross-ide-installers.md) | Cross-IDE installers | Ten IDE formats; `ai-dev-kit` reference unified installer; AGENTS.md + SKILL.md stable interop pair. |
| 10 | [`10-oss-appicon-replacements.md`](./10-oss-appicon-replacements.md) | App-icon replacements | Crowded <1k★ wrappers; agent-native + prompt→1024→fan-out is whitespace. |
| 11 | [`11-oss-favicon-generators.md`](./11-oss-favicon-generators.md) | Favicon generators | `@realfavicongenerator/generate-favicon` ~5k★ v0.8.0 (Apr 2026); `itgalaxy/favicons` v7.1.3 (Apr 2026); `pwa-asset-generator` → `elegantapp/pwa-asset-generator` v8.1.4; Sharp/Bun displaced Puppeteer/ImageMagick. |
| 12 | [`12-oss-og-social-card.md`](./12-oss-og-social-card.md) | OG / social-card | Takumi (Rust) 2–10× Satori; Nuxt OG Image v6 recommends Takumi via per-component suffix (not global default); `workers-og` fallback; headless Chrome 99% more expensive. |
| 13 | [`13-oss-sticker-emoji.md`](./13-oss-sticker-emoji.md) | Sticker / emoji / avatar | Chromakey-instructed as 4th alpha route; DiceBear ~8.2–8.3k★ (Apr 2026) deterministic avatar; TG/WA pipelines. |
| 14 | [`14-webmcp-impls.md`](./14-webmcp-impls.md) | WebMCP implementations | Chrome 146 flag-gated; production mid-to-late 2026; Cloudflare Browser Run now supports WebMCP; `@mcp-b/webmcp-polyfill` strict W3C; ship read-only only. |
| 15 | [`15-skills-packaging-formats.md`](./15-skills-packaging-formats.md) | Skills packaging formats | Nine surfaces; SKILL.md portable body, AGENTS.md LCD (AAIF 170+ members Apr 2026); frontmatter compile-target-specific; `rule-porter` stamps. |
| 16 | [`16-mascot-character-consistency.md`](./16-mascot-character-consistency.md) | Mascot / character consistency | 2-axis problem; Together FLUX.2 → PuLID+IP-Adapter → composition; never chain gen-N→gen-N+1. BFL self-serve commercial portal (Jun 2025) allows commercial use of Flux.1 Kontext [dev] with licence purchase. |
| 17 | [`17-t2i-alignment-datasets.md`](./17-t2i-alignment-datasets.md) | T2I alignment datasets | No license-clean asset-aware corpus; ImageReward + L3D + Iconify; self-play closes G1. |
| 18 | [`18-serverless-comfyui-patterns.md`](./18-serverless-comfyui-patterns.md) | Serverless ComfyUI | Modal snapshot <3s primary; RunPod fallback; Replicate escape hatch; `.cpack.zip` portable lock; ComfyDeploy ~1.3k★ (Sep 2025 re-OSS); comfy-pack ~164★ pre-release. |
| 19 | [`19-tri-surface-starters.md`](./19-tri-surface-starters.md) | Tri-surface starters | No repo ships all three; assembly = `run-llama/mcp-nextjs` + Vercel pieces + `skills` (~14.7k★ Apr 2026) + `mcpb`. |
| 20 | [`20-ui-illustration-generators.md`](./20-ui-illustration-generators.md) | UI illustration generators | Composition beats generation; bundle Open Peeps/Doodles/Humaaans/Flowbite/Unicons; StarVector-8B for text→SVG (RLRF NeurIPS 2025 follow-up confirmed). |

## Also in this folder

- [`SYNTHESIS.md`](./SYNTHESIS.md) — cross-angle synthesis: 20 load-bearing insights, 8 cross-cutting patterns, 6 controversies, 16 open questions, 20 actionable recommendations, de-duplicated source list.
- Parent research index: [`../index.md`](../index.md) — master research index.
- Master synthesis: [`../SYNTHESIS.md`](../SYNTHESIS.md) — cross-category synthesis across all 21 categories.
