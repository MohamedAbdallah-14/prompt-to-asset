---
category: 21-oss-deep-dive
date: 2026-04-21
angles_indexed:
  - 01-logo-brand-loras.md
  - 02-vector-svg-diffusion-oss.md
  - 03-prompt-rewriter-training.md
  - 04-native-rgba-generation.md
  - 05-text-in-image-oss.md
  - 06-t2i-eval-harnesses.md
  - 07-brand-dna-extractors.md
  - 08-mcp-registries.md
  - 09-cross-ide-installers.md
  - 10-oss-appicon-replacements.md
  - 11-oss-favicon-generators.md
  - 12-oss-og-social-card.md
  - 13-oss-sticker-emoji.md
  - 14-webmcp-impls.md
  - 15-skills-packaging-formats.md
  - 16-mascot-character-consistency.md
  - 17-t2i-alignment-datasets.md
  - 18-serverless-comfyui-patterns.md
  - 19-tri-surface-starters.md
  - 20-ui-illustration-generators.md
---

# Category 21 — OSS Deep Dives: Synthesis

## Category Executive Summary

1. **Every layer of the stack has Apache-2.0 / MIT / CC0 alternatives that are ~80% of the paid-API ceiling, but licence traps are concentrated at a few specific weights**, not evenly distributed. FLUX.1 [dev], FLUX.1 Redux-dev, FLUX.1 Kontext-dev, BRIA RMBG-2.0, IP-Adapter-FaceID-v2, Fooocus expansion, and CreativeML OpenRAIL++-M derivatives are the recurring non-commercial gates; SDXL + OpenRAIL-M, Flux.1 [schnell] Apache-2.0, Qwen-Image Apache-2.0, Open Peeps/Open Doodles/Humaaans CC0, and Iconify (per-set filter) are the clean commercial counterparts (see 01 §"The license landscape"; 04 §"The original…"; 16 §"Cross-cutting notes"; 20 §"Prior art"; 17 §"Cross-cutting observations").
2. **OmniSVG-4B + StarVector-1B collapse the text→SVG + raster→SVG gap that Recraft V3 monopolized.** OmniSVG (NeurIPS 2025, Apache-2.0, released weights `OmniSVG1.1_8B` and `OmniSVG1.1_4B`) is the first open model rivaling Recraft V3 on icons-per-MMSVGBench; StarVector-1B cleanly replaces `vtracer` as the raster cleanup stage. NeuralSVG (ICCV 2025, MIT) unlocks layered editability; SketchAgent is an LLM-in-the-loop zero-training primitive (see 02 §"Autoregressive…"; 02 §"Integration recommendations").
3. **LayerDiffuse is still the only public alpha-aware architecture; a commercial deployment needs four discrete routes depending on base-model licence.** Original `lllyasviel/LayerDiffuse` on SDXL runs via `huchenlei/ComfyUI-layerdiffuse` (Apache-2.0) or `fal-ai/layer-diffusion` (SDXL, commercial OK); the Flux port (`RedAIGC/Flux-version-LayerDiffuse`) is research-only because of Flux.1 [dev]'s NC licence; ART (CVPR 2025) and PSDiffusion (WACV 2026) are the successors to watch. `gpt-image-1` `background:"transparent"` remains the zero-ops production default (see 04 §"The original…"; 04 §"Integration recommendations").
4. **The best text-rendering OSS foundation in 2026 is Qwen-Image (20B MMDiT, Apache-2.0)** for multi-line CN+EN paragraph typography; AnyText2 (Apache-2.0) is the strongest SDXL-backed specialist with 7-script support and `BBOX_MAX_NUM = 8`; GlyphControl (MIT) is the minimal-footprint fallback; Glyph-ByT5-v2 is "best on paper" but Microsoft pulled its weights in June 2024. Tier-3 deterministic compositing (Satori / Takumi / Pillow) is the only correctness-guaranteed path for wordmarks (see 05 §"Tier A"; 05 §"Tier B"; 05 §"Integration Recommendations").
5. **The 2026 in-loop evaluator stack is small and well-bounded:** SigLIP 2 as CLIPScore replacement (~80ms), MPS alignment head (the only OSS scorer that isolates alignment from prettiness, ~100ms), PyMatting + LayerBench for alpha, GenEval 2 as offline regression (Soft-TIFA grader), DeepEval `ImageEditingMetric` as the VLM-judge wrapper. VQAScore via `linzhiqiu/t2v_metrics` is the sharpest composition gate at 1–3s. T2I-CompBench++, HPSv3 CoHP, ImageReward, Diffusion-DPO scoring bundle → offline only (see 06 §"Integration recommendations").
6. **Brand-bundle ingestion is load-bearing and underserved.** `dembrandt` (MIT, 1.6k★, Playwright + MCP surface) is the only live URL→DTCG tokens extractor; `OpenBrand` (MIT, 673★, Cheerio+Sharp, no browser) is the best-in-class logo-mark extractor; `@iocium/favicon-extractor` is the edge-safe fallback. The format layer has three contenders — `brand.md`, `brandspec` (`brand.yaml`), AdCP `brand.json` — but **none ships a URL-ingest extractor of its own**, and voice/guardrail extraction from live sites is an open OSS gap (see 07 §"Extractors"; 07 §"Formats"; 07 §"Integration recommendations").
7. **MCP distribution is solved by one canonical registry plus eleven downstream surfaces, and metadata hygiene dominates reach.** The Official MCP Registry feeds PulseMCP, Smithery, Docker Hub, and Claude Desktop search via one `server.json` publish. Glama's TDQS score weights the *worst-described* tool at ~40% (anything <70 is invisible); Smithery ranking is `smithery.yaml` `description` + `categories`; Anthropic Connectors Directory requires paired `claude.ai` and `claude.com` OAuth callbacks. Steps 1–5 fit in one engineer-day once prerequisites (annotations, paired callbacks, `.mcp.json` at repo root) are generated from SSOT (see 08 §"The landscape"; 08 §"Distribution recommendations").
8. **"One command, many IDEs" is an open whitespace.** `databricks-solutions/ai-dev-kit` demonstrates `bash <(curl -sL ...) | sh` across six IDEs in one invocation; Smithery CLI covers registry-backed installs; `vercel-labs/skills` (14.6k★) dominates skill-pack distribution across 41+ agents; `anthropics/mcpb` is the Claude Desktop zip envelope. Nobody has stitched the full tri-surface picture (web + hosted MCP + cross-IDE installer) for an OSS asset-generation skill (see 09 §"Cross-IDE installers"; 09 §"Packaging recommendations"; 19 §"Gap: no single repo ships all three surfaces").
9. **The "drop-a-1024, get-every-platform-zip" niche is crowded at 1k stars and empty at the agent surface.** Three gravity wells (`onmyway133/IconGenerator` 1,429★ stale, `itgalaxy/favicons` 1,234★ alive, `zhangyu1818/appicon-forge` 983★ alive); everything else <320★. No tool combines full platform coverage (Android 13 monochrome, iOS 18 tinted/dark, visionOS layered) + OG cards + favicon + brand-bundle input. No MCP server in the wild does `drop 1024 → emit iOS+Android+PWA+favicon+OG zip` (see 10 §"Market signals"; 10 §"Gaps our plugin fills").
10. **`@realfavicongenerator/generate-favicon` is the undiscovered answer to the favicon niche** — the actual engine behind `realfavicongenerator.net`, released as an MIT TypeScript monorepo in April 2024, 34★ (not low quality, low visibility). Ships its own linter. The modern ecosystem has standardized on `sharp` + `resvg` + `png-to-ico`; every post-2024 CLI bans Puppeteer/ImageMagick/Inkscape (see 11 §"The canonical player"; 11 §"Integration recommendations").
11. **Takumi (Rust, Apache-2.0/MIT) is to Satori what Satori was to headless Chrome** — 2–10× faster, full CSS Grid + variable fonts + COLR emoji + RTL + CJK, native `next/og`-compatible API. Nuxt OG Image v6 already defaults to it. For Cloudflare Workers the path is Takumi WASM primary + `workers-og` fallback; headless Chrome is ~99% more expensive at OG scale (see 12 §"The new frontrunner"; 12 §"Integration recommendations").
12. **Chromakey-instructed transparency is a fourth alpha route** not listed in the Category-13 matrix. `eyenpi/sticker-generator` asks Gemini / Nano Banana for a pure `#00FF00` backdrop and runs HSV removal; edges beat post-hoc matting for flat subjects. This joins native RGBA > LayerDiffuse > chromakey > post-hoc matting as an additional explicit option when a model has no transparent-background endpoint (see 13 §"AI diffusion-driven"; 13 §"Integration recommendations").
13. **WebMCP is progressive-enhancement only in v1.** Chrome 146 (Feb 2026) ships `navigator.modelContext` behind `--enable-experimental-web-platform-features`; Firefox and Safari have no implementation intent. Use `@mcp-b/webmcp-polyfill` (strict W3C surface, MIT) for read-only tool mirroring; avoid `@mcp-b/global`'s `provideContext()` supersetting (silent overwrite risk per issue #101). The write path stays on hosted remote MCP (see 14 §"Chrome shipping status"; 14 §"Integration recommendations").
14. **Skills-packaging convergence is real but shallow:** `SKILL.md` body is portable across Claude Code, Cursor, Windsurf, Codex, Gemini CLI (via `contextFileName` glob); `AGENTS.md` is the cross-vendor LCD (Linux Foundation stewardship since Dec 2025; 60k+ repos; 28.6% median runtime reduction per Princeton study). Frontmatter is compile-target-specific — `rule-porter` and `FrancyJGLisboa/agent-skill-creator` already do the stamping (see 15 §"Per-surface summary"; 15 §"Packaging recommendations").
15. **Mascot consistency is a 2-axis problem and the tiers are clear.** Axis A (bit-identical favicon/app-icon slots) is solved by rendering SVG once + deterministic resize. Axis B (hero art carrying the mark's geometry + palette + personality) has three tiers: hosted **Together FLUX.2 multi-reference** (up to 8 refs, clean Together T&Cs) → self-hosted **PuLID + IP-Adapter-Plus on SDXL** (Apache-2.0 + OpenRAIL-M, air-gapped) → composition primitives. DiceBear (~8.3k★ MIT) gives a free deterministic avatar tool on day one. **Never chain gen-N → gen-N+1** — every slot generates from the pinned canonical reference (see 16 §"Integration recommendations"; 13 §"Integration recommendations").
16. **No license-clean asset-aware training corpus exists today.** ImageReward (Apache-2.0, 137k pairs) is the cleanest preference dataset; L3D (CC-BY-4.0, 770k EUIPO trademarks) is the only classifier-safe logo corpus at scale; Iconify `icon-sets` (mostly MIT/Apache/CC-0, 275k) is the compositional retrieval corpus. Generator-training on trademark pixels is a trademark-dilution risk even when CC-BY licensed. Self-play with asset-validator-filtered outputs is the only viable path to close the G1 `(intent, ideal_prompt, target_model, asset_type)` gap (see 17 §"Integration recommendations").
17. **Modal + `@modal.enter(snap=True)` delivers <3s cold starts** (90% of requests) for ComfyUI serverless — the only platform that makes "agent → generate_logo → SSE progress → URL <10s" realistic. RunPod `worker-comfyui` is the cheapest at scale with native WS progress; Replicate `any-comfyui-workflow` is the operationally-boring escape hatch; `bentoml/comfy-pack` `.cpack.zip` is the best portable lock format regardless of where you deploy. ComfyICU forbids custom nodes → disqualified for LayerDiffuse (see 18 §"Ranked decision matrix"; 18 §"Recommendation").
18. **No OSS repo ships all three tri-surface legs cleanly** — the stitch itself is whitespace. `run-llama/mcp-nextjs` (auth + MCP spine) + `vercel-labs/mcp-for-next.js` (transport minimalism) + `vercel-labs/open-agents` (Web → Workflow → Sandbox worker pattern) + `vercel-labs/skills` (14.6k★ CLI distribution moat) + `anthropics/mcpb` (Claude Desktop zip) is the assembly recipe (see 19 §"Gap"; 19 §"Starter recommendations").
19. **UI illustrations are solved by composition, not generation.** Bundle Open Peeps + Open Doodles + Humaaans (all CC0) + Flowbite (MIT) + Iconscout Unicons (Apache-2.0); expose via unified manifest + `svg-chameleon` variable injection. `alvdansen/illustration-1.0-flux-dev` (no trigger word) + IP-Adapter-Style is the bespoke raster path; **StarVector-8B is the one credible text→SVG foundation model** for icon-/spot-illustration-scale. unDraw and ManyPixels licences forbid exactly what an API would do — deep-link only (see 20 §"Prior art"; 20 §"Integration recommendations").
20. **The rewriter training recipe is settled; the constraint is users, not OSS.** Hunyuan `PromptEnhancer-7B` + AlignEvaluator (24 keypoints, GRPO via TRL) is the modern architecture; BeautifulPrompt's BLIP+ChatGPT dataset-construction trick manufactures `(simple, polished)` pairs at ~$150–400 for 10k rows; `imscore` unifies PickScore+HPSv2+ImageReward+CLIP as one differentiable reward surface. Total realistic cost $1–3k + ~2 FTE-weeks, but shipping the system-prompted version first and harvesting real `(prompt, image, kept?)` preference labels from users beats training on synthetic data (see 03 §"Training pipelines"; 03 §"Integration recommendations").

## Map of the Angles

| Angle | File | One-line summary |
|---|---|---|
| 01 | [`01-logo-brand-loras.md`](./01-logo-brand-loras.md) | 25+ usable SDXL/Flux logo/brand LoRAs; licence traps concentrated in Flux.1 [dev]; five-LoRA commercial-safe bundle (Logo.Redmond v2, Minimalist Flat Icons XL, Line Art + Flat Colors, APP ICONS, Flux-Icon-Kit). |
| 02 | [`02-vector-svg-diffusion-oss.md`](./02-vector-svg-diffusion-oss.md) | Three philosophical families (DiffVG+SDS, autoregressive SVG code, classical tracing); **OmniSVG-4B Apache-2.0** as text→SVG, StarVector-1B as raster→SVG cleanup, NeuralSVG for layered editability, vtracer fallback. |
| 03 | [`03-prompt-rewriter-training.md`](./03-prompt-rewriter-training.md) | Four rewriter lineages (Promptist → BeautifulPrompt → Hunyuan → PAE); `imscore` + TRL GRPO is the modern recipe; 5 asset-specific reward heads (CLIP, OCR, Alpha, Palette, SafeZone); $1–3k budget; ship system-prompted first. |
| 04 | [`04-native-rgba-generation.md`](./04-native-rgba-generation.md) | LayerDiffuse (SIGGRAPH 2024) still sole public alpha architecture; ComfyUI/Diffusers/fal ports + Flux port (NC); ART (CVPR 2025), PSDiffusion (WACV 2026) as successors; `gpt-image-1` `background:"transparent"` as default. |
| 05 | [`05-text-in-image-oss.md`](./05-text-in-image-oss.md) | Three-tier text router: Ideogram v3 / Recraft V3 (API ceiling) → Qwen-Image / AnyText2 / GlyphControl (OSS diffusion) → Satori / Takumi / Pillow (deterministic composite). Text-in-image above 3 words → composite. |
| 06 | [`06-t2i-eval-harnesses.md`](./06-t2i-eval-harnesses.md) | In-loop: SigLIP 2 + MPS alignment head + PyMatting/LayerBench + GenEval 2 (offline) + DeepEval `ImageEditingMetric` (VLM rerank). Offline: T2I-CompBench++, HPSv3 CoHP. VQAScore (`t2v_metrics`) sharpest composition gate. |
| 07 | [`07-brand-dna-extractors.md`](./07-brand-dna-extractors.md) | `dembrandt` (MIT, 1.6k★, Playwright + MCP) as primary URL→DTCG extractor; `OpenBrand` (MIT, 673★) for logo marks; `@iocium/favicon-extractor` edge-safe. Format layer: brand.md / brandspec / AdCP — none self-ingests; voice extraction is open. |
| 08 | [`08-mcp-registries.md`](./08-mcp-registries.md) | 11 registries; Official MCP Registry feeds 4 downstream surfaces via one `server.json` publish; Glama TDQS weights worst tool 40%; paired `claude.ai`+`claude.com` OAuth callbacks; one engineer-day distribution plan. |
| 09 | [`09-cross-ide-installers.md`](./09-cross-ide-installers.md) | Ten IDE native formats (Claude Code, Desktop `.mcpb`, Cursor, Windsurf, Cline, Codex, Gemini, VS Code, Zed, v0); `databricks-solutions/ai-dev-kit` is the reference unified installer; AGENTS.md + SKILL.md is the stable interop pair. |
| 10 | [`10-oss-appicon-replacements.md`](./10-oss-appicon-replacements.md) | Crowded <1k★ wrappers around `itgalaxy/favicons` + `@capacitor/assets`; gravity wells stale; no MCP does `drop-1024 → platform-fan-out`; agent-native surface + prompt→1024→fan-out is clean whitespace. |
| 11 | [`11-oss-favicon-generators.md`](./11-oss-favicon-generators.md) | `@realfavicongenerator/generate-favicon` (MIT, 34★) is the actual engine behind RFG.net; `itgalaxy/favicons` workhorse; second-gen Sharp/Bun CLIs (favsmith, pwa-icons, favpie); `astro-favicons` for framework. |
| 12 | [`12-oss-og-social-card.md`](./12-oss-og-social-card.md) | **Takumi (Rust) is the new frontrunner** over Satori — 2–10× faster, full CSS superset, Grid, COLR emoji, CJK/RTL; Nuxt OG Image v6 defaults to it; `workers-og` Satori-compat fallback; headless Chrome 99% more expensive at scale. |
| 13 | [`13-oss-sticker-emoji.md`](./13-oss-sticker-emoji.md) | Three families (AI diffusion stickers, static emoji libs, procedural avatars); **chromakey-instructed is fourth transparency route**; DiceBear (~8.3k★ MIT) deterministic avatar; TG/WA format pipelines (tgskit, wa-sticker-formatter). |
| 14 | [`14-webmcp-impls.md`](./14-webmcp-impls.md) | W3C CG draft; Chrome 146 native behind flag; `@mcp-b/webmcp-polyfill` strict W3C; MCP-B extension bridges to Claude Desktop; ship read-only tools only; avoid `provideContext()` overwrite surface; polyfill-deprecate at Chrome unflag. |
| 15 | [`15-skills-packaging-formats.md`](./15-skills-packaging-formats.md) | Nine surfaces; `SKILL.md` body portable across 4 agents, `AGENTS.md` LCD honoured by 20+ tools (Linux Foundation stewardship Dec 2025); frontmatter is compile-target-specific; `rule-porter` stamps wrappers; hooks Claude+Codex only. |
| 16 | [`16-mascot-character-consistency.md`](./16-mascot-character-consistency.md) | Training-free identity (IP-Adapter, InstantID, PhotoMaker, PuLID) vs Flux reference (Redux, Kontext, Together FLUX.2 8-ref) vs LoRA (ostris ai-toolkit, kohya_ss); 3-tier router; never chain gen-N → gen-N+1. |
| 17 | [`17-t2i-alignment-datasets.md`](./17-t2i-alignment-datasets.md) | License-clean asset-aware corpus does not exist; ImageReward (Apache-2.0) cleanest preference; L3D (CC-BY-4.0 770k EUIPO) classifier-only; Iconify for composition retrieval; self-play + validators closes G1 at bootstrap cost. |
| 18 | [`18-serverless-comfyui-patterns.md`](./18-serverless-comfyui-patterns.md) | 11 serverless paths; **Modal snapshot cold-start <3s** primary, RunPod `worker-comfyui` fallback, Replicate escape hatch; `bentoml/comfy-pack` `.cpack.zip` as portable lock format; ComfyICU disqualified (no custom nodes). |
| 19 | [`19-tri-surface-starters.md`](./19-tri-surface-starters.md) | No single repo ships all three surfaces; assembly recipe = `run-llama/mcp-nextjs` (auth+MCP) + `vercel-labs/mcp-for-next.js` (transport) + `open-agents` (async worker pattern) + `vercel-labs/skills` + `anthropics/mcpb`. |
| 20 | [`20-ui-illustration-generators.md`](./20-ui-illustration-generators.md) | Composition beats generation; bundle Open Peeps/Doodles/Humaaans/Flowbite/Unicons (CC0/MIT/Apache) with `svg-chameleon`; `alvdansen/illustration-1.0-flux-dev` raster path; StarVector-8B text→SVG; unDraw/ManyPixels deep-link only. |

## Cross-Cutting Patterns

### P1 — Licence-cliff at the FLUX [dev] family (01, 04, 16, 17)
Flux.1 [dev], Flux.1 Redux-dev, and Flux.1 Kontext-dev are the recurring non-commercial gate. 01 §"The license landscape" names this as the dominant decision for LoRA bundling; 04 §"Flux port" disqualifies the Flux-LayerDiffuse path for commercial deployment; 16 §"Cross-cutting notes" lists Flux.1-dev / Flux.1 Redux-dev / Flux.1 Kontext-dev / IP-Adapter-FaceID v2 / RMBG-2.0 as the silent traps; 17 §"JourneyDB" treats Midjourney prompt corpora as unlicensed derivatives. The safe commercial spine is SDXL (OpenRAIL-M) + Flux.1 [schnell] (Apache-2.0) + Qwen-Image (Apache-2.0) + hosted Flux via Together/Replicate/fal endpoint that carries its own commercial grant.

### P2 — Deterministic composite as the correctness floor (05, 11, 12, 15, 19, 20)
Every asset category converges on "generate the hard parts, composite the correct parts." 05 §"Tier C" (Satori, Playwright, Pillow); 11 (`@realfavicongenerator/generate-favicon` + Sharp + resvg + png-to-ico); 12 (Takumi primary, Satori fallback, never headless Chrome); 15 (composition for avatar IDs); 20 (composition beats generation for UI illustrations). The shared principle: never render trademark-critical glyphs, never rely on a diffusion sampler for pixel-perfect dimensions, always pre-validate alpha / dimensions / palette. The stack that runs this tier is `sharp` + `@resvg/resvg-js` + `svgson` + `svg-chameleon` + icon-gen.

### P3 — Three-tier routing repeats across asset types (04, 05, 13, 16)
Alpha (04 §"Integration recommendations"): native RGBA → LayerDiffuse → post-hoc matting; 13 adds chromakey-instructed as a fourth. Text-in-image (05): commercial API → OSS diffusion → deterministic composite. Stickers (13 §"Integration recommendations"): `gpt-image-1` native → LayerDiffuse → chromakey → matting. Mascot consistency (16): Together FLUX.2 multi-ref → PuLID+IP-Adapter on SDXL → deterministic composition. The shape is always "best-paid first, commercially-clean OSS second, deterministic fallback third" — and the router is the product, not any single tier.

### P4 — Metadata hygiene dominates distribution ROI (08, 09, 15)
08 §"Reading the table" reports Glama TDQS scores moving 68→85 in one afternoon by rewriting tool descriptions; Smithery ranking is `smithery.yaml` `description` + `categories`; Anthropic Connectors Directory rejects ~30% on tool annotations. 09 §"Packaging recommendations" shows the same pattern for per-IDE manifests — `.mcp.json` at repo root, `gemini-extension.json`, `.codex-plugin/plugin.json` — each demands tight metadata. 15 §"Packaging recommendations" generalizes this: markdown body is portable, frontmatter is compile-target-specific. One SSOT + a stamping script is the correct shape; eleven registries + nine IDE dialects is the friction.

### P5 — Agent-native MCP surface is the unclaimed whitespace in every crowded OSS niche (10, 11, 12, 13, 20)
The ~1k-star tier in every asset niche is saturated with wrappers around `sharp`/`@capacitor/assets`/Satori that don't expose MCP or skills. 10 §"Market signals" documents three gravity wells, 200+ clones, zero MCP servers doing `drop-1024 → platform-fan-out`. 11 (favicon), 12 (OG), 13 (sticker), 20 (illustration) all repeat the same shape: many CLI/webapp clones, no agent surface, no prompt→master front-half. An `asset_*` MCP tool surface with a real rewriter front-end and a platform-spec validator on the back-end is the structural differentiator that none of the wrappers can retrofit.

### P6 — SSOT-then-stamp is the cross-IDE answer (08, 09, 15, 19)
All four angles arrive at the same pattern: one canonical unit (SKILL.md body, AGENTS.md, server.json, brand bundle), one stamping script (`sync-mirrors.sh`, `rule-porter`, `mcp-publisher`, `install.sh`), many target-specific wrappers (per-IDE manifests, per-registry metadata, per-transport adapters). The corollary: never hand-maintain drift across surfaces — it fails silently at the least-tested target.

### P7 — Platform-spec drift is nearly always unaddressed by the ~1k-star tier (10, 11, 13, 16)
Android 13 monochrome, iOS 18 tinted/dark, visionOS layered, App Store 1024-opaque, 80% PWA maskable safe zone, Telegram `.tgs` frame limits, WhatsApp WebP metadata — these are named-but-unimplemented in every wrapper surveyed. Only `guillempuche/appicons` covers the full iOS 18 + Android 13 + visionOS matrix (2★, no UI). Platform-spec linting + safe-zone validation + flattened-alpha checks are a correctness moat, not a coverage moat; the asset-wrapper ecosystem has conceded this.

### P8 — "Same stack, different lock format" is the portability advance of 2025–2026 (08, 15, 18)
`.mcpb` / `.cpack.zip` / `server.json` / `SKILL.md` / `gemini-extension.json` / `.codex-plugin/plugin.json` / `AGENTS.md` are seven distinct lock/distribution formats each wrapping the same runtime substrate (MCP binary, ComfyUI workflow, markdown body). 18 §"Cross-cutting notes" nominates `comfy-pack` as the best portable lock format regardless of deploy target; 15 generalizes to SKILL.md + AGENTS.md as the format-agnostic body. The cost is duplication; the benefit is target specificity.

## Controversies / Disagreements

### C1 — OmniSVG-4B vs Recraft V3 for text-to-SVG primary
02 §"Integration recommendations" nominates OmniSVG-4B (Apache-2.0, NeurIPS 2025) as the primary text-to-SVG renderer, beating Recraft V3 on MMSVGBench for icons. 20 §"Adjacent solutions" and the master synthesis route vector logos to Recraft V3 as the "only production diffusion-ish model whose API returns real SVG." Resolution: on *icons* OmniSVG-4B now exceeds or matches Recraft V3 per published benchmark; on *text-bearing logos and composed illustrations* Recraft V3 still wins (text rendering, composition) until OmniSVG catches up on those sub-tasks. Route by `{complexity, has_text}` rather than by model name.

### C2 — Self-hosted LayerDiffuse vs `gpt-image-1` default for transparent assets
04 §"Integration recommendations" nominates `gpt-image-1.5` `background:"transparent"` as the no-ops production default; the master synthesis and 13 §"AI diffusion-driven" agree. But 01 §"The license landscape" and 16 §"Cross-cutting notes" both highlight that a commercial deployment should not depend on OpenAI's rewriter + moderation stack for brand-critical output. Resolution: `gpt-image-1` is right for *user-facing iteration*; LayerDiffuse-on-SDXL via `fal-ai/layer-diffusion` is right for *batch brand work where no rewriter should touch the prompt*; ship both and route by `{brand_critical: bool, iteration_count: int}`.

### C3 — Chromakey-instructed vs native RGBA as the transparency ordering
13 §"Integration recommendations" adds chromakey-instructed (Gemini / Nano Banana → pure `#00FF00` backdrop + HSV removal) as a route explicitly *above* post-hoc matting. 04's ordering places it below LayerDiffuse and above post-hoc matting. The disagreement is small but consequential: on flat subjects with hard edges, chromakey beats LayerDiffuse quality at zero GPU cost; on translucent subjects (glass, hair, smoke) LayerDiffuse wins decisively. Route by `{subject_has_soft_edges: bool}`.

### C4 — Train our own asset-aware rewriter now vs later
03 §"Integration recommendations" calculates the training cost at $1–3k + 2 FTE-weeks but explicitly recommends shipping the system-prompted version in v1 and training from real preference telemetry in v2. 17 §"Integration recommendations" confirms no license-clean asset-aware corpus exists and proposes a self-play + validator-filter loop. Both agree the training recipe is settled and the constraint is data, not cost; the disagreement is whether synthetic self-play data is sufficient to bootstrap before users arrive, or whether waiting for real user preference data is strictly better. The consensus is: ship system-prompted, instrument `(prompt, image, kept?)` telemetry, consider training in v2.

### C5 — Modal cold-start snapshot vs RunPod FlashBoot for primary serverless ComfyUI
18 §"Recommendation" names Modal primary, RunPod fallback, on the basis of `@modal.enter(snap=True)` delivering <3s cold starts on 90% of requests. But RunPod's FlashBoot advertises <200ms on ~48% of requests and RunPod is cheaper at steady-state scale. Resolution in 18: Modal wins on "bursty agent traffic with strict latency contracts"; RunPod wins on "predictable batch workloads where per-hour price dominates." The routing hint is operational volume, not technical capability.

### C6 — Takumi primary vs Satori as the OG compatibility baseline
12 §"Integration recommendations" recommends Takumi primary, `workers-og` as Satori-compat fallback. The Humazier / master-synthesis reference treats Satori + `@vercel/og` as canonical. The disagreement is a timing issue: Satori is the 2024 canonical and still the most documented; Takumi is the 2026 frontrunner with Nuxt OG Image v6 default adoption. Ship Takumi primary, but keep the Satori-shaped template schema so either engine can render it — the JSX component is the portable unit, not the renderer.

## Gaps & Unanswered Questions

1. **No OSS tool extracts brand voice / tone / guardrails from a live site** (07 §"Quality on real-world sites"). Every format — brand.md, brandspec, AdCP — declares a `tone` / `voice` block but requires human authoring. Forking `brand-forge`'s copy-analysis pass or building from scratch with LLM + Cheerio over `/`, `/about`, and the latest blog post is the open whitespace.
2. **No brandspec ↔ brand.md ↔ brand.json round-trip converter exists in code** (07 §"Quality on real-world sites") despite the formats' declared interop. A thin normalizer that takes `dembrandt --dtcg` + OpenBrand output and emits all three canonical formats is the G10 integration moat.
3. **No public license-clean `(intent, ideal_prompt, target_model, asset_type)` tuple dataset** exists (17 §"Integration recommendations"; 03 §"Prompt datasets inventory"). The closest is self-play using the asset validator as filter; nobody has shipped this at scale.
4. **No OSS tool combines full platform coverage + OG + favicon + brand-bundle input** (10 §"Market signals"). `pixel-forge` has favicon+PWA+OG; `appicons` has every platform but no OG. A tri-surface wrapper over (`itgalaxy/favicons` ∪ `@capacitor/assets` ∪ custom Android13/iOS18/visionOS emitters) is unoccupied.
5. **No MCP server in the wild does `drop 1024 → iOS+Android+PWA+favicon+OG zip`** (10 §"MCP-surface tools"). The two MCP footprints in the niche (`niels-oz/icon-generator-mcp`, `albertnahas/icogenie-mcp`) address different problems.
6. **Non-Latin text rendering is underserved** across every specialized text-rendering model except Qwen-Image (05 §"Tier B"). Ideogram 3 + `gpt-image-1` are Latin-centric; CJK / Arabic / Devanagari drop sharply. SVG typography composition (Tier 3) is the safe path for non-Latin brands.
7. **Cross-origin iframe WebMCP tool declaration is undefined** (14 §"Known sharp edges"; issue #57). Third-party SaaS widgets cannot currently contribute tools to their host. Permissions-Policy / Document-Policy negotiation is proposed but not specified.
8. **Declarative WebMCP (§4.3) is a TODO** (14 §"W3C WebMCP spec"; PR #76). The `<form>` → JSON-Schema auto-derivation path exists in `autowebmcp.dev/demo` but not in the spec yet.
9. **Native RGBA super-resolution remains open** — every upscaler is RGB-only. This gap was named in the master synthesis (G3) and none of the 20 angles here closes it.
10. **LoRA × CFG × prompt-weight interactions are un-specced** — 01 §"Training your own logo LoRA" gives recipe guidance but no published ablation of how strength 0.8 × CFG 3.5 × `(trigger_word:1.3)` combines, especially across Flux vs SDXL.
11. **No shared humanness / asset-correctness metric** for prompt-to-asset A/B tests — 06 confirms that DSG, TIFA, ImageReward, HPSv3, PickScore, Gecko all measure overlapping-but-distinct constructs; no canonical "asset-correctness" scorer has been published.
12. **Copilot Skillset 5-skill cap vs our 10-tool surface** (09 §"Per-IDE native formats"; master synthesis G8) — unresolved whether to collapse into one `asset_generate(asset_type)`, ship a Copilot Agent (no cap), or two separate GitHub Apps.
13. **Dark-mode PWA iOS splash** — `pwa-asset-generator` has no `--dark-mode` flag (master synthesis G12; 11 §"Cross-cutting observations" corroborates the rarity of dark-mode SVG preservation).
14. **Android 13 monochrome themed icon auto-derivation** is heuristic (`sharp(foreground).greyscale().threshold(128).tint('#000')`). No tool does this well; opportunity for a reference implementation.
15. **OmniSVG's weakness on text-in-SVG** is acknowledged in 02 §"Integration recommendations" but has no quantified benchmark — the text-rendering gap vs Recraft V3 is qualitative, not numeric.
16. **Flux weights licence path to commercial** remains gated — 01 §"The license landscape" proposes either (a) BFL commercial licence, (b) retrain adapters on Flux [schnell], (c) route to paid API — no OSS has taken path (b) at scale yet.

## Actionable Recommendations for the prompt-to-asset Plugin

1. **Ship the five-LoRA commercial-safe logo bundle on day one: Logo.Redmond v2 (SDXL, OpenRAIL-M), Minimalist Flat Icons XL (SDXL), Line Art + Flat Colors SDXL, APP ICONS SDXL, `strangerzonehf/Flux-Icon-Kit-LoRA` (Flux [dev], non-commercial tier only).** Tag each with `{license, commercial_ok, base_model, trigger_word}`. Never route brand-hosted commercial traffic to Flux [dev] LoRAs without a BFL commercial licence (see 01 §"Integration recommendations").

2. **Route vector/SVG requests by `{has_text, complexity}` across a three-way split: OmniSVG-4B (Apache-2.0) for text-free icons/illustrations, LLM-authored SVG (inline `<svg>` with fixed viewBox, ≤40 paths, palette hex list) for simple geometry, Recraft V3 for text-bearing logos.** Fall back to raster → BiRefNet matte → K-means → `vtracer` → SVGO when the above fail validation. Never `potrace` for colored marks (1-bit) (see 02 §"Integration recommendations"; master synthesis highest-confidence #3).

3. **Default transparent-asset route is `gpt-image-1` `background:"transparent"` → Ideogram 3 `style:"transparent"` → LayerDiffuse on SDXL via `fal-ai/layer-diffusion` → post-hoc BiRefNet matte. Add chromakey-instructed (Gemini/Nano Banana + `#00FF00` + HSV removal) as a fourth explicit route when the subject has hard flat edges** (see 04 §"Integration recommendations"; 13 §"AI diffusion-driven"). Run the six-check validator (dimensions, alpha present, no checkerboard FFT, tight-bbox in safe zone, OCR Levenshtein, palette ΔE2000) on every return.

4. **Ship Qwen-Image (Apache-2.0) as the OSS text-in-image default, AnyText2 (Apache-2.0) as the 7-script specialist, GlyphControl (MIT) as the minimal-footprint fallback. Above 3 words, force Tier-3 deterministic composite via Satori or Takumi — do not render wordmarks in a diffusion sampler** (see 05 §"Integration Recommendations"; master synthesis highest-confidence #4).

5. **Bake SigLIP 2 + MPS alignment head + PyMatting Gradient/Connectivity + LayerBench into the in-loop `asset_validate` tool.** Run GenEval 2 as an offline regression on 10–20-prompt CI eval sets; run T2I-CompBench++ as monthly regression. Reserve DeepEval `ImageEditingMetric` for top-K reranking with Gemini Flash ($0.003/call). Never run HPSv3 CoHP on every request (see 06 §"Integration recommendations").

6. **Shell out to `dembrandt` (MIT) as the primary URL→DTCG extractor; call `OpenBrand` (MIT) in parallel for logo-mark fidelity; use `@iocium/favicon-extractor` for edge-safe fallback. Build the brandspec/brand.md/brand.json normalizer ourselves — none of the three format harnesses ships a URL-ingest extractor of its own** (see 07 §"Integration recommendations"). This closes G10 from the master synthesis.

7. **Publish to the Official MCP Registry on Day 0 via `mcp-publisher` with `server.json` containing both `packages[]` (stdio) and `remotes[]` (Streamable HTTP).** That buys daily ingest into PulseMCP, Smithery, Docker Hub, and Claude Desktop search. Day-1 parallel submissions to Anthropic Connectors Directory (budget for one rejection cycle on annotations), Cursor Directory, Smithery, Glama (target ≥80 TDQS on every tool). Total ~1 engineer-day (see 08 §"Distribution recommendations").

8. **Ship one universal installer modelled on `databricks-solutions/ai-dev-kit`: `bash <(curl -sL …)` + `iwr … | iex`, detects installed IDEs, writes per-IDE adapters idempotently with JSON-merge (never regex), `--all` / `--only` / `--skills-only` / `--uninstall` flags.** Pair with per-IDE native assets auto-generated from SSOT (`.mcpb` for Claude Desktop, Cursor deeplink, `gemini-extension.json`, `.codex-plugin/plugin.json`, Zed `context_servers` snippet). Hosted Streamable-HTTP MCP for zero-install escape (see 09 §"Packaging recommendations").

9. **Use the canonical skills repo layout: one `SKILL.md` per asset intent, one `AGENTS.md` as LCD, one `install.sh` that stamps frontmatter wrappers per target. Vendor or call `rule-porter` for the stamping. Lean on `FrancyJGLisboa/agent-skill-creator` for 14+ target outputs. Own skill bodies, `AGENTS.md`, plugin manifests; do not invent a new format** (see 15 §"Packaging recommendations").

10. **Bundle `@realfavicongenerator/generate-favicon` + `@realfavicongenerator/image-adapter-node` + `@realfavicongenerator/check-favicon` as the primary favicon engine; diff outputs in CI against `itgalaxy/favicons` as the regression oracle.** Lift `3v0k4/favicon_factory`'s minimal-set + dark-mode SVG preservation philosophy. Add Twemoji emoji → favicon path (~50 LOC) and xvatar-style gradient-monogram fallback for cold-start users without logos (see 11 §"Integration recommendations").

11. **Adopt Takumi primary, `workers-og` Satori-compat fallback, Typst for text-heavy/typography-critical cases. Keep JSX templates as the portable unit so either engine can render.** Never headless Chrome for OG at scale (99% more expensive, 200MB cold start). Fallback chain: cached PNG by `(content_hash, brand_bundle_hash)` → live Takumi with AI hero → live Takumi with gradient → static `/og-default.png` (see 12 §"Integration recommendations").

12. **Ship four sticker tools on the existing stack: `generate_sticker` (with chromakey as explicit fourth route), `compose_emoji_mashup` (using `xsalazar/emoji-kitchen`'s valid-combo JSON), `pack_telegram_stickers` / `pack_whatsapp_stickers` (via `tgskit` / `wa-sticker-formatter`), `generate_avatar` (thin DiceBear wrapper — free deterministic avatar tool day one)** (see 13 §"Integration recommendations"). DiceBear's seed→SVG determinism is the reference for mascot identity.

13. **WebMCP as progressive enhancement only in v1.** Mirror read-only tools (`asset_enhance_prompt`, `asset_validate`, `asset_brand_bundle_parse`) via `@mcp-b/webmcp-polyfill` (strict W3C surface). Avoid `@mcp-b/global`'s `provideContext()` — silent overwrite risk (issue #101). Keep write tools off WebMCP until tool-impersonation mitigations land. Plan polyfill-deprecation at Chrome unflag (see 14 §"Integration recommendations").

14. **Implement a 3-tier mascot consistency router: default Together FLUX.2 multi-reference (up to 8 refs, hosted, clean T&Cs), self-host PuLID + IP-Adapter-Plus on SDXL (Apache-2.0 + OpenRAIL-M) for air-gapped, and composition-only (vtracer + icon-gen + pwa-asset-generator + capacitor-assets) for deterministic slots. Never chain gen-N → gen-N+1 — every slot generates from the pinned canonical reference + brand bundle** (see 16 §"Integration recommendations").

15. **Train the asset-aware rewriter from real user preference telemetry in v2, not synthetic data in v1.** Ship the system-prompted version with 24-keypoint + 5-reward-head scaffold (CLIP, OCR, Alpha, Palette, SafeZone) on `PromptEnhancer-7B` (Apache-2.0) as the in-product baseline. Instrument `(prompt, generated_image, user_kept?)` logging; budget $1–3k + 2 FTE-weeks for the v2 GRPO training pass using TRL + `imscore` + Flux.1 [schnell] rollout generator (see 03 §"Integration recommendations").

16. **Deploy serverless ComfyUI as: Modal primary (`@modal.enter(snap=True)`, `min_containers=1–3` per asset class) → RunPod `worker-comfyui` fallback (A100/H200 capacity spikes) → Replicate `any-comfyui-workflow` escape hatch. Ship every workflow in `lib/workflows/` as a `bentoml/comfy-pack` `.cpack.zip` — it is the best portable lock format regardless of deploy plane** (see 18 §"Recommendation"). Disqualify ComfyICU (no custom nodes → no LayerDiffuse).

17. **Assemble the tri-surface starter from `run-llama/mcp-nextjs` (auth + MCP spine, Prisma + Postgres + OAuth 2.1) + `vercel-labs/mcp-for-next.js` transport patterns + `vercel-labs/open-agents` Web→Workflow→Sandbox skeleton for the async generation worker + `vercel-labs/skills` (14.6k★) as the CLI distribution channel + `anthropics/mcpb` for the Claude Desktop zip envelope. Two to three weeks to a publishable reference template that does not exist today** (see 19 §"Starter recommendations").

18. **Ship the UI-illustration surface as composition-first: bundle Open Peeps + Open Doodles + Humaaans + Flowbite Illustrations + Iconscout Unicons (all CC0 / MIT / Apache-2.0) behind a unified manifest with `svg-chameleon` recolor + `svgson` palette remap. Deep-link (never bundle) unDraw, ManyPixels, Absurd, Storyset. Generative path: `alvdansen/illustration-1.0-flux-dev` + IP-Adapter-Style + BRIA RMBG 2.0 matte + `vtracer` when SVG is required; StarVector-8B for direct text→SVG at ≤200 paths** (see 20 §"Integration recommendations").

19. **Gate every commercial route on licence provenance: Apache-2.0 / MIT / CC0 / OpenRAIL-M is ship-safe; Flux.1 [dev] / Flux.1 Redux-dev / Flux.1 Kontext-dev / IP-Adapter-FaceID-v2 weights / RMBG-2.0 weights / JourneyDB / Logo-2K+ / METU / LLD / unDraw-scraping is the no-fly list. Route "premium" through paid APIs carrying their own commercial grant (Together, Replicate, fal, BFL hosted, Ideogram, Recraft, OpenAI)** (see 01 §"The license landscape"; 16 §"Cross-cutting notes"; 17 §"Integration recommendations"; 20 §"Prior art").

20. **Instrument platform-spec validation as a first-class gate, not a footnote:** iOS 824px safe zone in 1024, Android 72dp of 108dp, PWA 80% maskable, App Store 1024-opaque, favicon <15KB, OG <5MB, Telegram `.tgs` limits, WhatsApp WebP metadata. Every generated asset runs through the tier-0 deterministic lint before return. The ~1k-star OSS tier has conceded this niche; it is the correctness moat that generalizes across every asset type (see 10 §"Market signals"; 11 §"Cross-cutting observations"; master synthesis Tier 0 validators).

## Primary Sources Aggregated

### LoRA / fine-tune artifacts (01)
- Shakker-Labs FLUX.1-dev Logo Design — https://huggingface.co/Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design
- prithivMLmods Logo-Design-Flux-LoRA — https://huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA
- strangerzonehf Flux-Icon-Kit-LoRA — https://huggingface.co/strangerzonehf/Flux-Icon-Kit-LoRA
- strangerzonehf Flux-Ultimate-LoRA-Collection — https://huggingface.co/strangerzonehf/Flux-Ultimate-LoRA-Collection
- artificialguybr LogoRedmond v2 — https://huggingface.co/artificialguybr/LogoRedmond-LogoLoraForSDXL-V2
- Logo Maker 9000 SDXL (Civitai 436281) — https://civitai.com/models/436281/logo-maker-9000-sdxl-concept
- Minimalist Flat Icons XL (Civitai 449818) — https://civitai.com/models/449818/minimalist-flat-icons-xl
- ReservedNoName sdxl-simple-icons — https://huggingface.co/ReservedNoName/sdxl-simple-icons-lora
- EEEric 3d-icon-Flux-LoRA — https://huggingface.co/EEEric/3d-icon-Flux-LoRA
- Sologo-AI Monochrome-line-logo — https://huggingface.co/Sologo-AI/Monochrome-line-logo
- logologolab cute_playful_logo_lora — https://huggingface.co/logologolab/cute_playful_logo_lora
- FLUX.1-dev licence — https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev
- FLUX.1-schnell licence — https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell

### Vector / SVG generation (02, 20)
- BachiLi/diffvg — https://github.com/BachiLi/diffvg
- ximinng/VectorFusion-pytorch — https://github.com/ximinng/VectorFusion-pytorch
- ximinng/SVGDreamer (CVPR 2024) — https://github.com/ximinng/SVGDreamer
- SagiPolaczek/NeuralSVG (ICCV 2025) — https://github.com/SagiPolaczek/NeuralSVG
- joanrod/star-vector (CVPR 2025) — https://github.com/joanrod/star-vector
- starvector-8b-im2svg — https://huggingface.co/starvector/starvector-8b-im2svg
- OmniSVG/OmniSVG (NeurIPS 2025, arXiv:2504.06263) — https://github.com/OmniSVG/OmniSVG
- yael-vinker/SketchAgent — https://github.com/yael-vinker/SketchAgent
- yael-vinker/CLIPasso — https://github.com/yael-vinker/CLIPasso
- kingnobro/IconShop (SIGGRAPH Asia 2023) — https://github.com/kingnobro/IconShop
- visioncortex/vtracer — https://github.com/visioncortex/vtracer
- autotrace/autotrace — https://github.com/autotrace/autotrace
- potrace — https://potrace.sourceforge.net/

### Rewriter training (03)
- Hunyuan-PromptEnhancer — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
- microsoft/LMOps Promptist — https://github.com/microsoft/LMOps/tree/main/promptist
- alibaba/EasyNLP BeautifulPrompt — https://github.com/alibaba/EasyNLP
- pai-bloom-1b1-text2prompt-sd-v2 — https://huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2
- Mowenyii/PAE — https://github.com/Mowenyii/PAE
- roborovski/superprompt-v1 — https://huggingface.co/roborovski/superprompt-v1
- yuvalkirstain/PickScore — https://github.com/yuvalkirstain/PickScore
- tgxs002/HPSv2 — https://github.com/tgxs002/HPSv2
- THUDM/ImageReward — https://github.com/THUDM/ImageReward
- RE-N-Y/imscore — https://github.com/RE-N-Y/imscore
- Hugging Face TRL docs — https://huggingface.co/docs/trl/
- Poloclub DiffusionDB — https://huggingface.co/datasets/poloclub/diffusiondb
- vera365 lexica_dataset — https://huggingface.co/datasets/vera365/lexica_dataset

### Native RGBA / LayerDiffuse (04)
- lllyasviel/LayerDiffuse — https://github.com/lllyasviel/LayerDiffuse
- LayerDiffuse DiffusersCLI — https://github.com/lllyasviel/LayerDiffuse_DiffusersCLI
- huchenlei/ComfyUI-layerdiffuse — https://github.com/huchenlei/ComfyUI-layerdiffuse
- yolain/ComfyUI-Easy-Use — https://github.com/yolain/ComfyUI-Easy-Use
- RedAIGC Flux-version-LayerDiffuse — https://github.com/RedAIGC/Flux-version-LayerDiffuse
- rootonchair/diffuser_layerdiffuse — https://github.com/rootonchair/diffuser_layerdiffuse
- fal-ai layer-diffusion — https://fal.ai/models/fal-ai/layer-diffusion
- ART (CVPR 2025, arXiv:2502.18364) — https://arxiv.org/abs/2502.18364
- PSDiffusion (WACV 2026, arXiv:2505.11468) — https://arxiv.org/abs/2505.11468
- OpenAI gpt-image-1 docs — https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1

### Text-in-image (05)
- tyxsspa/AnyText2 (Apache-2.0) — https://github.com/tyxsspa/AnyText2
- microsoft unilm textdiffuser-2 — https://github.com/microsoft/unilm/tree/master/textdiffuser-2
- AIGText Glyph-ByT5 — https://github.com/AIGText/Glyph-ByT5
- GlyphControl-release — https://github.com/aigtext/glyphcontrol-release
- QwenLM/Qwen-Image (Apache-2.0) — https://github.com/QwenLM/Qwen-Image
- Qwen-Image paper — https://arxiv.org/pdf/2508.02324
- WaveSpeedAI Qwen vs SDXL/Flux benchmark — https://wavespeed.ai/blog/posts/qwen-2512-vs-sdxl-flux-text-benchmark
- vercel/satori — https://github.com/vercel/satori
- deep-floyd/IF — https://github.com/deep-floyd/IF

### Evaluation harnesses (06)
- Karine-Huang/T2I-CompBench — https://github.com/Karine-Huang/T2I-CompBench
- djghosh13/geneval — https://github.com/djghosh13/geneval
- GenEval 2 (arXiv:2512.16853) — https://arxiv.org/abs/2512.16853
- MizzenAI/HPSv3 — https://github.com/MizzenAI/HPSv3
- Kwai-Kolors/MPS — https://github.com/Kwai-Kolors/MPS
- linzhiqiu/t2v_metrics (VQAScore) — https://github.com/linzhiqiu/t2v_metrics
- beichenzbc/Long-CLIP — https://github.com/beichenzbc/Long-CLIP
- pymatting/pymatting — https://github.com/pymatting/pymatting
- confident-ai/deepeval — https://github.com/confident-ai/deepeval
- LayerBench (Trans-Adapter, arXiv:2508.01098) — https://arxiv.org/abs/2508.01098

### Brand-DNA extractors & formats (07)
- dembrandt/dembrandt — https://github.com/dembrandt/dembrandt
- ethanjyx/OpenBrand — https://github.com/ethanjyx/OpenBrand
- @iocium/favicon-extractor — https://github.com/iocium/favicon-extractor
- mikaelvesavuori/figmagic — https://github.com/mikaelvesavuori/figmagic
- lokesh/color-thief — https://github.com/lokesh/color-thief
- thebrandmd/brand.md — https://github.com/thebrandmd/brand.md
- brandspec — https://github.com/brandspec/brandspec
- AdCP brand.json — https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json
- adcontextprotocol/adcp — https://github.com/adcontextprotocol/adcp

### MCP registries & installers (08, 09)
- Official MCP Registry — https://registry.modelcontextprotocol.io/
- Anthropic Connectors Directory FAQ — https://support.anthropic.com/en/articles/11596036-anthropic-connectors-directory-faq
- modelcontextprotocol/mcpb — https://github.com/modelcontextprotocol/mcpb
- Desktop Extensions — https://www.desktopextensions.com/
- Smithery docs — https://smithery.ai/docs/build/publish
- Glama MCP servers — https://glama.ai/mcp/servers
- PulseMCP — https://www.pulsemcp.com/
- Cursor Directory — https://cursor.directory/
- Gemini CLI extensions reference — https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
- Zed MCP extensions — https://zed.dev/docs/extensions/mcp-extensions
- smithery-ai/cli — https://github.com/smithery-ai/cli
- databricks-solutions/ai-dev-kit — https://github.com/databricks-solutions/ai-dev-kit
- mcpmux/homebrew-tap — https://github.com/mcpmux/homebrew-tap
- Cursor MCP install links — https://cursor.com/docs/mcp/install-links

### App-icon / favicon / OG (10, 11, 12)
- zhangyu1818/appicon-forge — https://github.com/zhangyu1818/appicon-forge
- onmyway133/IconGenerator — https://github.com/onmyway133/IconGenerator
- guillempuche/appicons — https://github.com/guillempuche/appicons
- SuavePlan/iconz — https://github.com/SuavePlan/iconz
- itgalaxy/favicons — https://github.com/itgalaxy/favicons
- RealFaviconGenerator/core — https://github.com/RealFaviconGenerator/core
- jakejarvis/favsmith — https://github.com/jakejarvis/favsmith
- SivaramPg/pwa-icons — https://github.com/SivaramPg/pwa-icons
- pixel-point/favpie — https://github.com/pixel-point/favpie
- 3v0k4/favicon_factory — https://github.com/3v0k4/favicon_factory
- astro-favicons — https://github.com/ACP-CODE/astro-favicons
- kane50613/takumi — https://github.com/kane50613/takumi
- kvnang/workers-og — https://github.com/kvnang/workers-og
- fabian-hiller/og-img — https://github.com/fabian-hiller/og-img
- harlan-zw/nuxt-og-image — https://github.com/harlan-zw/nuxt-og-image
- rust-lang/crates_io_og_image — https://github.com/rust-lang/crates_io_og_image
- onderceylan/pwa-asset-generator — https://github.com/onderceylan/pwa-asset-generator
- ionic-team/capacitor-assets — https://github.com/ionic-team/capacitor-assets

### Sticker / emoji / avatar (13)
- eyenpi/sticker-generator — https://github.com/eyenpi/sticker-generator
- EvanZhouDev/open-genmoji — https://github.com/EvanZhouDev/open-genmoji
- oftenliu/consistent-character — https://github.com/oftenliu/consistent-character
- xsalazar/emoji-kitchen — https://github.com/xsalazar/emoji-kitchen
- microsoft/fluentui-emoji — https://github.com/microsoft/fluentui-emoji
- googlefonts/noto-emoji — https://github.com/googlefonts/noto-emoji
- googlefonts/nanoemoji — https://github.com/googlefonts/nanoemoji
- hfg-gmuend/openmoji — https://github.com/hfg-gmuend/openmoji
- LottieFiles/tgskit — https://github.com/LottieFiles/tgskit
- AlenVelocity/wa-sticker-formatter — https://github.com/AlenVelocity/wa-sticker-formatter
- dicebear/dicebear — https://github.com/dicebear/dicebear

### WebMCP (14)
- W3C WebMCP spec — https://webmachinelearning.github.io/webmcp/
- webmachinelearning/webmcp — https://github.com/webmachinelearning/webmcp
- MiguelsPizza/WebMCP — https://github.com/MiguelsPizza/WebMCP
- mcp-b.ai docs — https://docs.mcp-b.ai/
- @mcp-b/webmcp-polyfill — https://www.npmjs.com/package/@mcp-b/webmcp-polyfill
- mcpcat/webmcp-react — https://github.com/mcpcat/webmcp-react

### Skills packaging (15)
- Claude Skills docs — https://docs.anthropic.com/en/docs/claude-code/skills
- Cursor rules docs — https://www.cursor.com/docs/context/rules
- Codex plugins build — https://developers.openai.com/codex/plugins/build/
- agents.md — https://agents.md/
- Gemini CLI extensions reference — https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md
- Zed rules — https://zed.dev/docs/ai/rules.html
- nedcodes-ok/rule-porter — https://github.com/nedcodes-ok/rule-porter
- dmgrok/agent_skills_directory — https://github.com/dmgrok/agent_skills_directory
- FrancyJGLisboa/agent-skill-creator — https://github.com/FrancyJGLisboa/agent-skill-creator

### Mascot / character consistency (16)
- tencent-ailab/IP-Adapter — https://github.com/tencent-ailab/IP-Adapter
- h94/IP-Adapter-FaceID — https://github.com/h94/IP-Adapter-FaceID
- InstantID/InstantID — https://github.com/InstantID/InstantID
- TencentARC/PhotoMaker — https://github.com/TencentARC/PhotoMaker
- ToTheBeginning/PuLID — https://github.com/ToTheBeginning/PuLID
- ostris/ai-toolkit — https://github.com/ostris/ai-toolkit
- kohya-ss/sd-scripts — https://github.com/kohya-ss/sd-scripts
- FLUX.1-Redux-dev — https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev
- BFL Kontext overview — https://docs.bfl.ai/kontext/kontext_overview
- Together FLUX.2 multi-reference — https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai
- google/style-aligned — https://github.com/google/style-aligned
- HVision-NKU/StoryDiffusion — https://github.com/HVision-NKU/StoryDiffusion
- PKU-YuanGroup/ConsisID — https://github.com/PKU-YuanGroup/ConsisID
- Recraft custom styles — https://www.recraft.ai/docs/using-recraft/styles/custom-styles/how-to-create-a-custom-style
- cubiq/ComfyUI_IPAdapter_plus — https://github.com/cubiq/ComfyUI_IPAdapter_plus

### Datasets (17)
- LAION Re-LAION-5B — https://laion.ai/blog/relaion-5b/
- LAION aesthetics v2 — https://huggingface.co/datasets/laion/aesthetics_v2_4.5
- JourneyDB — https://github.com/JourneyDB/JourneyDB
- Gustavosta SD Prompts — https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts
- yuvalkirstain pickapic_v2 — https://huggingface.co/datasets/yuvalkirstain/pickapic_v2
- zai-org ImageRewardDB — https://huggingface.co/datasets/zai-org/ImageRewardDB
- LLD (ETH Zurich) — https://data.vision.ee.ethz.ch/sagea/lld/
- Logo-2K+ — https://github.com/msn199959/Logo-2k-plus-Dataset
- L3D (EUIPO) — https://lhf-labs.github.io/tm-dataset/
- iconify/icon-sets — https://github.com/iconify/icon-sets
- RICO Semantics — https://github.com/google-research-datasets/rico_semantics

### Serverless ComfyUI (18)
- runpod-workers/worker-comfyui — https://github.com/runpod-workers/worker-comfyui
- Modal comfyapp — https://modal.com/docs/examples/comfyapp
- Modal memory snapshots — https://modal.com/blog/comfyui-mem-snapshots
- Modal OpenArt case study — https://modal.com/blog/openart-case-study
- replicate/cog-comfyui — https://github.com/replicate/cog-comfyui
- basetenlabs/truss-examples comfyui-truss — https://github.com/basetenlabs/truss-examples/tree/main/comfyui-truss
- bentoml/comfy-pack — https://github.com/bentoml/comfy-pack
- comfy-deploy/comfydeploy — https://github.com/comfy-deploy/comfydeploy
- Comfy.icu docs — https://comfy.icu/docs/api
- Salad ComfyUI recipes — https://docs.salad.com/products/recipes/comfyui
- inferless/ComfyUI — https://github.com/inferless/ComfyUI

### Tri-surface starters (19)
- vercel-labs/mcp-for-next.js — https://github.com/vercel-labs/mcp-for-next.js
- run-llama/mcp-nextjs — https://github.com/run-llama/mcp-nextjs
- vercel-labs/mcp-apps-nextjs-starter — https://github.com/vercel-labs/mcp-apps-nextjs-starter
- modelcontextprotocol/example-remote-server — https://github.com/modelcontextprotocol/example-remote-server
- f/mcp-startup-framework — https://github.com/f/mcp-startup-framework
- DTeam-Top/mcp-oauth — https://github.com/DTeam-Top/mcp-oauth
- vercel-labs/open-agents — https://github.com/vercel-labs/open-agents
- vercel-labs/skills — https://github.com/vercel-labs/skills
- anthropics/mcpb — https://github.com/anthropics/mcpb
- vercel/mcp-adapter — https://github.com/vercel/mcp-adapter
- agentailor/create-mcp-server — https://github.com/agentailor/create-mcp-server

### UI illustrations (20)
- unDraw licence — https://undraw.co/license
- Open Peeps — https://www.openpeeps.com/
- Open Doodles — https://www.opendoodles.com/
- Humaaans — https://www.humaaans.com/
- Flowbite Illustrations — https://github.com/themesberg/flowbite-illustrations
- Iconscout Unicons — https://github.com/Iconscout/unicons
- Iconduck — https://iconduck.com/
- MrPeker/awesome-illustrations — https://github.com/MrPeker/awesome-illustrations
- svg-chameleon — https://github.com/christian-reichart/svg-chameleon
- valor-labs/svg-color-replacement — https://github.com/valor-labs/svg-color-replacement
- alvdansen/illustration-1.0-flux-dev — https://huggingface.co/alvdansen/illustration-1.0-flux-dev
- dvyio/flux-lora-simple-illustration — https://huggingface.co/dvyio/flux-lora-simple-illustration

## Status

Index synthesized 2026-04-21 across all 20 angle files (01–20). Every claim in the Executive Summary, Cross-Cutting Patterns, Controversies, Gaps, and Recommendations is grounded in a specific angle section. URL aggregation de-duplicated across angles; cross-references use the `(see NN §section)` convention consistent with `01-prompt-engineering-theory/INDEX.md`.
