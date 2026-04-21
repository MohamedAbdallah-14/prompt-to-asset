---
category: 20-open-source-repos-landscape
title: "Open-Source Repos Landscape — Category Index & Synthesis"
slug: 20-open-source-repos-landscape
role: category-indexer
date: 2026-04-19
last_updated: 2026-04-21
angles_covered:
  - 20a — Prompt-Enhancement OSS Repos for Image Generation
  - 20b — Open-Source Full-Stack Asset Generators ("one prompt → real asset")
  - 20c — SDK Wrappers and Unified Interfaces for Image Generation
  - 20d — ComfyUI Workflow Ecosystem for Asset Generation
  - 20e — Agent-Native Web Apps and Gap Analysis
word_count_target: 2500-4000
tags:
  - oss-landscape
  - prompt-enhancement
  - asset-generation
  - mcp
  - comfyui
  - sdk-wrappers
  - agent-native
  - gap-analysis
  - differentiation
status: final
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# 20 — Open-Source Repos Landscape: Category Index

## Category Executive Summary

The five angles in this category survey every OSS surface a prompt-enhancement-for-assets
product could plausibly inherit from, compete with, or build on: the *input-side* prompt
rewriters (20a), the *output-side* full-stack asset generators (20b), the *SDK glue* that
routes prompts to models (20c), the *workflow runtime* that actually renders pixels (20d),
and the *agent-native shapes* emerging around Figma/Linear/Gamma/Vercel (20e). The combined
picture is consistent and has a clear bottom line: **the asset-correctness layer is
empty, every other layer is mature enough to stand on**. Fifteen findings:

1. **No OSS project today ships the tri-surface** (web UI + hosted remote MCP + cross-IDE
   skill pack) for AI-driven logo/icon/asset generation. `Nutlope/logocreator` (~5.3k★ as
   of 2026-04-21) owns the web UX but has no MCP; `mcpware/logoloom`, `arekhalpern/mcp-logo-gen`, and
   `niels-oz/icon-generator-mcp` own slivers of the MCP surface but have no website,
   single-provider coverage, and no prompt-research layer (20e).

   > **Updated 2026-04-21:** The 6.8k★ figure for logocreator cited earlier appears to have been a peak or a mis-reading; current confirmed count is ~5.3k★ (April 2026). The project remains active with open issues.

2. **One SOTA open prompt rewriter exists and it is not asset-aware**. Tencent's
   `Hunyuan-PromptEnhancer` (~3.7k★, Apache-2.0) is the only widely-available model
   trained specifically via GRPO against a T2I alignment reward (the 24-key-point
   AlignEvaluator). It is SD/Flux-flavored, not asset-flavored: nothing in its training
   targets transparency, platform specs, text legibility in logos, or favicon correctness
   (20a).

3. **Microsoft's Promptist (arXiv:2212.09611) is still the canonical training recipe** —
   SFT on engineered prompts + PPO with CLIP + aesthetic reward. Every serious OSS
   rewriter since (BeautifulPrompt, Hunyuan) descends from it. Its 125M GPT-2 is tiny,
   MIT-licensed via `microsoft/LMOps`, and usable as a CPU fallback rewriter today (20a).

4. **Closed-source vendors have validated the product thesis**. Google Vertex Imagen
   ships an automatic prompt rewriter (default-on when prompt < 30 words); DALL·E 3
   returns `revised_prompt` on every call; `shinpr/mcp-image` bundles a
   Subject–Context–Style optimizer inside its MCP. The step exists everywhere in
   production and almost nowhere in OSS targeted at assets (20a, 20b).

5. **The full-stack asset-generator space has been cloned to death around the UI layer
   and remains empty at the correctness layer**. Across 30+ Next.js + Supabase + Stripe
   clones surveyed in 20b, **none** request RGBA from the model up-front, **none** close
   the loop between "app-icon generator" and "platform-spec resizer", and only
   `shinpr/mcp-image` and `Hunyuan-PromptEnhancer` do meaningful prompt surgery — and
   neither is asset-type-aware (20b).

6. **Platform-spec enforcement is already solved; we should call it, not rebuild it**.
   `onderceylan/pwa-asset-generator` (3k★), `ionic-team/capacitor-assets` (577★, 251k
   weekly npm downloads), `guillempuche/appicons` (iOS 18 + Android adaptive + watchOS +
   tvOS + visionOS + PWA + RN + Expo + Flutter), and `akabekobeko/npm-icon-gen` cover
   every platform rigorously but have no LLM front end. Wiring these behind a
   `resize_icon_set` tool is a standalone value prop and a free OSS replacement for the
   proprietary `appicon.co` (20b, 20e).

7. **Composition beats generation for many icon-style needs**. Iconify (6k★, 275k+ marks),
   SVGL (5.7k★, 400+ brand logos with REST API), `zhangyu1818/appicon-forge` (981★), and
   `lobehub/lobe-icons` (1.7k★) make "compose deterministically from an icon library +
   gradient/shadow tokens" a fully viable rail. A prompt enhancer should know *when not
   to call a diffusion model* (20b).

8. **Vercel AI SDK v5 `generateImage` is the mature polyglot image abstraction**. It
   ships typed providers for OpenAI `gpt-image-1`, Google Imagen/Nano Banana, Replicate,
   fal, Luma, Fireworks, Together via OpenAI-compat — every production-relevant image
   model except Midjourney (which has no official API anywhere). Its `providerOptions`
   namespace solves the uniform-vs-provider-specific tension that killed LangChain as a
   candidate foundation (20c).

9. **LangChain, LlamaIndex, and aisuite are not viable image-SDK foundations**.
   LangChain's image tools are OpenAI-only (`DallEAPIWrapper`, `OpenAIDALLEImageGenerationTool`);
   LlamaIndex's are OpenAI-only (`TextToImageToolSpec`); aisuite has no image support —
   multimodal has been "in-roadmap" since issue #90 (Nov 2024). Useful as downstream
   adapters, wrong as upstream foundations (20c).

10. **For hot paths, direct provider SDKs beat any wrapper**. `fal-client` offers
    realtime/WebSocket streaming (Flux Schnell at ~5 fps — a killer feature for iterative
    logo refinement); Replicate's `replicate.use()` chains models with typed outputs;
    Together's FLUX.2 accepts **up to 8 brand reference images** per call (the strongest
    brand-asset feature set of any hosted API right now) (20c).

11. **ComfyUI is the de-facto graph-based execution runtime for open-weight diffusion**.
    Its `/prompt` HTTP + `/ws` WebSocket API makes it trivially embeddable as a backend:
    the same JSON that drives the UI drives the server, and a mature serverless ecosystem
    (`runpod-workers/worker-comfyui`, `replicate/cog-comfyui`, Modal, ComfyDeploy,
    ComfyICU) turns any workflow into a per-second-billed API (20d).

    > **Updated 2026-04-21:** ComfyUI has grown to ~108.5k★ (as of 2026-04-13, star-history.com) — roughly double the ~55k figure from earlier in this research cycle. This cements it as the dominant open-weight execution runtime with no credible OSS challenger. ComfyUI-Manager is now at v4.1 and is officially integrated into the core ComfyUI codebase.

12. **Native RGBA generation via LayerDiffuse beats post-hoc matting for the transparency
    use case**. `huchenlei/ComfyUI-layerdiffuse` and `yolain/ComfyUI-Easy-Use`'s
    `easy layerDiffusion` node generate transparent PNGs natively, handling anti-aliasing
    and soft edges that `rembg`/BRIA RMBG 2.0 struggle with. This is the most promising
    answer to the user's Gemini "weird boxes in the background" pain (20d, 20b).

13. **The reference architecture for agent-native web apps has converged**. Figma, Linear,
    Gamma, and Vercel v0 have all shipped the same pattern: website at `/`, hosted remote
    MCP at `mcp.<product>.<tld>/mcp` with OAuth 2.1 + Streamable HTTP, and first-party
    integrations for Claude Code / Cursor / VS Code / Windsurf / Codex. The OSS
    implementation recipe — `vercel/mcp-adapter` + Next.js route handler at
    `/api/[transport]` where UI and MCP call the same `lib/tools/` handlers — is
    validated by multiple templates (`vercel-labs/mcp-for-next.js`, `run-llama/mcp-nextjs`)
    (20e).

14. **Parity is now a product-defining requirement, not a nice-to-have**. Linear's MCP
    exposes one tool for every button in the UI. Figma explicitly describes the MCP as a
    "context bridge, not a code generator" — a library of primitives the agent
    orchestrates. If our web UI can "enhance → generate → pick → resize → export brand
    bundle", every one of those must be an MCP tool, not a UI-only action (20e).

15. **Brand-bundle schemas exist but nobody generates against them**. `brandspec.dev`,
    `thebrandmd/brand.md`, and the AdCP Brand Protocol (`brand.json`) define the format;
    `dembrandt` extracts tokens from a live URL; `iamdanwi/brand-forge` extracts "brand
    DNA"; `piaoyinghuang/brand-consistency-ai-skill` defines a 100-point compliance
    checklist. No existing asset-generation tool *consumes* any of these. Accepting
    `brand.md` as input and injecting it into every downstream prompt/palette/typography
    decision is an integration moat, not a feature (20b, 20e).

**Gaps our plugin fills, stated in one sentence.** The open-source landscape has the
execution runtime (ComfyUI + LayerDiffuse), the SDK abstraction (Vercel AI SDK v5
`generateImage`), the post-processing stack (rembg/BRIA/BiRefNet, vtracer, pwa-asset-generator,
capacitor-assets, npm-icon-gen), the platform shape (website + hosted MCP + cross-IDE
skills à la Figma/Linear/Gamma), and the brand-bundle formats (`brand.md`, brandspec,
AdCP) — but nothing stitches them into an **asset-correctness-first, research-grounded,
multi-model, agent-parity product**. That is the whitespace.

---

## Map of the Angles

| Angle | Scope | Central finding | Key artifact |
|---|---|---|---|
| **20a — Prompt-Enhancement OSS Repos** | Standalone rewriters, webui extensions, ComfyUI nodes, small fine-tuned LMs, LLM rewriters, RL-trained rewriters | One SOTA (Hunyuan, 3.7k★) plus one canonical recipe (Promptist) — neither is asset-aware; zero OSS rewriters target Imagen/GPT-image-1 dialects | Hunyuan's 24-key-point AlignEvaluator reward; Promptist SFT→PPO recipe |
| **20b — Full-Stack Asset Generators** | 70+ repos across logos, app icons, favicons, OG images, stickers, SVGs, MCPs, Canva-alts, SaaS boilerplates | UI layer is cloned to death; correctness layer (transparency, platform specs, brand consistency, evaluation) is empty; composition beats generation for many icons | `Nutlope/logocreator` (UI gold standard), `pwa-asset-generator`/`capacitor-assets`/`npm-icon-gen` (platform specs), Iconify/SVGL (composition), LayerDiffuse (transparency) |
| **20c — Image-Gen SDK Wrappers** | Vercel AI SDK, OpenRouter, LangChain, LlamaIndex, aisuite, Replicate, fal, Together, LiteLLM | Vercel AI SDK v5 `generateImage` is the only mature polyglot image abstraction; every framework-native tool is OpenAI-only; direct SDKs win on hot paths | `ImageModelV2` interface + `providerOptions`; fal realtime; Replicate model chaining; Together FLUX.2 8-ref-image endpoint |
| **20d — ComfyUI Workflow Ecosystem** | Core runtime, node packs (Manager, Impact, rgthree, Easy-Use, LayerDiffuse, RMBG), civitai/openart workflows, serverless hosts (RunPod, Modal, Replicate, ComfyDeploy, ComfyICU) | ComfyUI is a headless-first graph runtime with a node registry and multiple production serverless paths; a prompt-to-asset backend can map (intent, asset_type) → parameterized workflow JSON | `/prompt` + `/ws` API, `LayerDiffuse` native RGBA, `comfy-headless` in-process runner, Modal `@app.cls()` warm-load pattern |
| **20e — Agent-Native Architectures & Gap Analysis** | Figma/Linear/Gamma/Vercel MCPs, `vercel/mcp-adapter`, WebMCP, brand-bundle formats, existing logo MCPs | Tri-surface (web + hosted MCP + cross-IDE skills) is the new reference shape; it is unoccupied for AI assets; Parity is a product-defining principle | `createMcpHandler` in `/api/[transport]`, OAuth 2.1 + Streamable HTTP, `navigator.registerTool()` (WebMCP), `brand.md` as the human-editable brand-bundle source |

The five angles are not siblings; they are layers of the same stack. 20a is the *prompt*
layer, 20c is the *dispatch* layer, 20d is the *execution* layer, 20b is the *output +
post-processing* layer, and 20e is the *surface / packaging* layer. Each has a clear OSS
winner and a clear empty slot; our product occupies the empty slots at every layer.

---

## Cross-Cutting Patterns

Five patterns recur across all five angles and should therefore become first-class
abstractions in our product.

### 1. The "rewriter + verbalizer + template" trinity

Every mature rewriter in 20a (Hunyuan, Promptist, BeautifulPrompt, Fooocus) splits
implicitly into *what to say* (the rewriter), *how to say it for this model family* (the
verbalizer), and *what slots must be filled* (the template). `sd-dynamic-prompts` is the
template layer (rule-based DSL); `thunlp/OpenPrompt` formalizes the template/verbalizer
split for text tasks; Hunyuan fuses all three inside one LLM. 20d's parameterized
workflow JSON is the same pattern at the execution layer (template = workflow skeleton,
verbalizer = node configuration, rewriter = prompt slot mutation). 20e's `brand.md` is
the pattern applied to brand context. Our `enhance_prompt` tool should expose the trinity
explicitly: `{ enhanced_prompt, model_specific_variants[], negative_prompt, rationale }`.

### 2. "Context bridge, not code generator" (Figma's articulation)

Figma's MCP docs explicitly disclaim the "one god tool that does everything" pattern in
favor of a library of composable primitives. Linear's MCP does the same: find/create/update
over a domain model. 20c's Vercel AI SDK does the same at the SDK layer:
`model: provider.image('model-id')` is the single polymorphism point, and
`providerOptions` is an escape hatch — not a kitchen sink. 20d's ComfyUI is the same idea
at the runtime layer: every action is a composable node. The pattern our MCP must follow:
ten small tools (`enhance_prompt`, `generate_logo`, `generate_icon_set`, `remove_background`,
`vectorize`, `resize_icon_set`, `validate_asset`, `route_model`, `brand_bundle_parse`,
`list_history`) that an agent *orchestrates*, not one `create_brand_kit` that we
orchestrate internally.

### 3. Async + polling + structured result URL

Gamma's REST + MCP pattern (kickoff → poll → `gammaUrl` + `exportUrl`) matches every
serverless ComfyUI wrapper in 20d (RunPod `/run` async + S3 upload, Replicate predictions,
Modal webhook patterns) and the asynchronous nature of image generation itself (5–30s is
typical). The contract our `generate_*` tools must expose: return a `job_id` + library
URL immediately; stream progress via SSE; final payload contains both a human-viewable
URL and a machine-consumable download. This is directly opposite to the 20c-documented
anti-pattern in LangChain's `DallEAPIWrapper`, which famously dropped images when `n>1`.

### 4. Correctness-as-a-verification-loop

Hunyuan's AlignEvaluator (20a), T2I-CompBench (20a), LayerDiffuse's native RGBA output
(20d), rembg/BRIA post-hoc matting (20b), `piaoyinghuang/brand-consistency-ai-skill`'s
100-point checklist (20b), and `Krita-ai-diffusion`'s on-connect node validation (20d) all
express the same pattern: *score the output against an explicit contract, regenerate or
fail loudly if it misses*. No existing OSS asset generator closes this loop. Our
`validate_asset` tool (alpha coverage, palette adherence, text legibility, safe zones,
contrast) is a concrete implementation.

### 5. "Pin the lockfile, rebuild on a cadence"

Custom-node drift in ComfyUI (20d), AI SDK v4→v5 migrations (20c), Hunyuan's tight
ComfyUI version coupling (20a), and the repeatedly-abandoned Next.js + OpenAI logo clones
in 20b all signal one operational discipline: pin ComfyUI + ComfyUI-Manager + custom-node
commits + SDK versions in a lockfile; rebuild container images on a schedule, not
on-demand. This should be written into our ops runbook from day one.

---

## Controversies

Where the five angles disagree (genuinely, not superficially):

**Controversy 1 — LLM rewrite vs. small fine-tuned LM.** 20a presents two live camps.
The "small LM" camp (Fooocus GPT-2, Promptist 125M, SuperPrompt-v1 77M, MagicPrompt) is
CPU-runnable, offline, MIT-licensed, and adds ~0 latency; its weakness is hard-coded
aesthetic bias toward LAION-Aesthetic photography (actively harmful for logos). The
"frontier LLM with CoT scaffold" camp (Hunyuan, Vertex Imagen's rewriter, `shinpr/mcp-image`)
reasons compositionally and handles multi-model dispatch but costs API calls and cannot
run offline. **Our resolution:** ship both — a Fooocus-style ~100M-parameter free-tier
rewriter (re-implemented to avoid Fooocus's CC-BY-NC-4.0 weights) and a Claude/GPT/Gemini
rewriter for the paid tier — routed by user tier and budget.

> **Updated 2026-04-21:** Fooocus itself is now LTS-only (bug fixes, last feature release v2.5.5 Aug 2025). The "Fooocus-style rewriter" approach remains valid — re-implement the positive-word + no-repeat logits processor from scratch (the algorithm is not CC-BY-NC-4.0, only the model weights are). The ostris/ai-toolkit and kohya_ss are the current recommended LoRA training stacks; ostris/ai-toolkit now covers Flux.2 and a dozen+ model architectures.

**Controversy 2 — Post-hoc matting vs. native RGBA generation.** 20b's reference
implementations (`fabriziosalmi/brandkit`, `eyenpi/sticker-generator`, `zhangyu1818/appicon-forge`)
pipe everything through `rembg`/BRIA RMBG *after* generation, accepting the fringing,
aliasing, and mark-erosion that brings. 20d's LayerDiffuse camp generates native RGBA
inside the diffusion loop with correct soft edges. **Our resolution:** prefer LayerDiffuse
or `gpt-image-1`'s `background: "transparent"` option when the target model supports it;
fall back to BRIA RMBG 2.0 with mark-preservation heuristics (anti-alias-safe,
erosion-safe) only when native alpha is unavailable. Always verify alpha coverage in
`validate_asset`.

**Controversy 3 — Compose from Iconify vs. generate with a diffusion model.** 20b flags
that for many icon-style needs (single-glyph app icons, favicons, category pictograms),
`zhangyu1818/appicon-forge`'s deterministic composition from 275k Iconify marks + gradient
tokens beats any diffusion output on legibility, speed, and cost. But the user's
"sparkline icon for a trading app" request is a template slot, not an act of creative
invention. **Our resolution:** the rewriter classifies intent; "iconic single-glyph"
requests compose from Iconify, "brand logo with unique mark" requests generate with
diffusion, and the user sees both options side-by-side for ambiguous cases.

**Controversy 4 — Vercel AI SDK vs. OpenRouter as the primary foundation.** 20c
recommends Vercel AI SDK as primary, OpenRouter as fallback, citing OpenRouter's
base64-only responses and lossy provider options. But OpenRouter gives one credential
across the long tail (Ideogram 3, Recraft v3, Seedream 4.5) — the exact models our
asset-correctness router cares most about. **Our resolution:** Vercel AI SDK is the
**typed foundation**; OpenRouter is a **first-class implementation of the same internal
`ImageProvider` interface** (not a fallback); we route per-capability
(`transparency && textRendering !== 'poor'`) rather than per-vendor.

**Controversy 5 — stdio vs. Streamable HTTP for the MCP.** 20e's reference architectures
(Figma, Linear, Gamma) all ship hosted Streamable HTTP + OAuth 2.1; the existing
logo-MCP OSS (LogoLoom, `arekhalpern/mcp-logo-gen`, `niels-oz/icon-generator-mcp`) all
ship `npx` stdio servers with no auth. **Our resolution:** ship both — a stdio mode for
local development / zero-friction trial and a hosted Streamable HTTP + OAuth mode for
production. The same `lib/tools/` handlers back both transports.

---

## Gaps

Consolidated from the five angles (numbered for traceability):

- **G1. Asset-aware training data.** No public dataset of `(intent, ideal_prompt,
  target_model, asset_type)` tuples for logos/icons/favicons/OG/transparent PNGs exists.
  Hunyuan trained on generic T2I prompts; Gustavosta's 81k prompts are Lexica aesthetic
  photos.
- **G2. Asset-correctness reward.** Hunyuan's AlignEvaluator scores generic alignment;
  no reward heads check transparency validity, favicon correctness, or text legibility
  in logos.
- **G3. Per-model-family verbalizers.** OSS rewriters overwhelmingly emit SD tag-salad
  ("masterpiece, 8k, studio lighting") which is *actively wrong* for Imagen 3/4 and
  `gpt-image-1` (both prefer natural-sentence prompts).
- **G4. Structured output contract.** Every OSS rewriter returns a string; none return
  `{positive, negative, weights, aspect_ratio, model_family, post_processing[]}` JSON —
  which is what a downstream pipeline actually needs.
- **G5. The AI↔platform-spec bridge.** Generative "app icon" repos output a square;
  `capacitor-assets`/`appicons`/`pwa-asset-generator` require a clean source. Nobody
  closes the loop.
- **G6. Brand consistency across a set.** Most apps generate one asset per call.
  Style-locking app icon + favicon + OG card + hero + empty-state illustration across
  one brand is essentially unserved.
- **G7. Evaluation.** No repo measures output correctness — no CLIPScore, PickScore,
  T2I-CompBench-style scoring, no platform-spec linter.
- **G8. The "prompt enhance → generate → validate → regenerate" loop.** Fooocus expands
  prompts but doesn't validate; rembg removes backgrounds but doesn't feed back. Nobody
  closes the cycle.
- **G9. MCP + Skills + website, together.** Existing MCPs have no website (LogoLoom,
  arekhalpern, niels-oz); the best website (Nutlope) has no MCP; no one ships all three.
- **G10. Brand-bundle consumer.** Formats (`brandspec`, `brand.md`, AdCP `brand.json`)
  are defined; nothing *generates against* them.
- **G11. OSS `appicon.co`.** The iconic post-processing webapp is proprietary; the OSS
  libraries (`npm-icon-gen`, `pwa-asset-generator`, `capacitor-assets`) exist but no one
  stitches them into a single drop-a-1024-get-everything surface with an MCP tool.
- **G12. License-clean weight stack.** Fooocus's expansion model is CC-BY-NC-4.0
  outside Fooocus; Flux.1 [dev] is non-commercial; SD.Next is AGPL-3.0. A commercial
  asset generator needs an MIT/Apache/OpenRAIL-M-only weight stack — Promptist, Hunyuan,
  MagicPrompt, SuperPrompt-v1, BeautifulPrompt, Flux Schnell (Apache-2.0), SDXL + logo
  LoRA are all safe.
- **G13. Cross-IDE delivery.** Existing tools document Claude + Cursor; nobody ships a
  single-command installer for Claude Code / Cursor / Windsurf / Gemini CLI / Codex /
  VS Code / Zed / v0.

---

## Actionable Recommendations

### OSS dependencies to lean on (top-of-file `package.json` / `pyproject.toml`)

**SDK & routing layer.**
- `ai` + `@ai-sdk/openai` + `@ai-sdk/google` + `@ai-sdk/replicate` + `@ai-sdk/fal` +
  `@ai-sdk/luma` + `@ai-sdk/togetherai` — Vercel AI SDK v5 as the typed image polyglot
  ([20c primary rec]).
- `replicate` + `@fal-ai/client` + `together-ai` — direct SDKs for latency-critical paths
  and provider-specific features (fal realtime, Together FLUX.2 8-ref-image, Replicate
  model chaining).
- Optional: `openrouter` HTTP wrapper as a second implementation of the same
  `ImageProvider` interface for long-tail model access.

**Prompt-enhancement layer.**
- `microsoft/Promptist` (MIT, 125M GPT-2) — CPU-runnable fallback rewriter; reimplement
  the logits processor ideas from Fooocus's `expansion.py` ourselves (do *not* copy
  Fooocus's CC-BY-NC-4.0 weights — **G12**).
- `roborovski/superprompt-v1` (MIT, 77M T5-small) — browser-runnable always-on expander.
- `Hunyuan-PromptEnhancer` (Apache-2.0, 7B/32B) as the paid-tier rewriter; copy its
  CoT scaffold and AlignEvaluator reward structure — add 3–6 asset-specific heads
  (transparency-correctness, text-legibility, platform-compliance, brand-palette-adherence,
  safe-zone-respect).
- `adieyal/sd-dynamic-prompts` DSL syntax (MIT) for the deterministic template layer.

**Execution layer (when we need open-weight models).**
- `comfyanonymous/ComfyUI` / `Comfy-Org/ComfyUI` (~108.5k★ as of 2026-04-13, GPL) via serverless
  wrappers (not forked into our repo to avoid GPL contamination). ComfyUI-Manager v4.1 is now
  integrated into core — use `comfy-cli` for headless node install.
- `huchenlei/ComfyUI-layerdiffuse` (native RGBA) — the correct answer to the Gemini
  "weird boxes" bug. Last active maintenance Feb 2025; open issues tracked through 2025.
- `yolain/ComfyUI-Easy-Use` (`easy layerDiffusion` node) for the shortest transparent
  pipeline.
- `rgthree/rgthree-comfy` "Context" nodes for programmable workflow mutation.
- `ltdrdata/ComfyUI-Impact-Pack` for region-detailed logo text rendering.
- Serverless: `runpod-workers/worker-comfyui` or `replicate/cog-comfyui` with
  `workflow_json` input.

> **Updated 2026-04-21 — LoRA training stack:** `ostris/ai-toolkit` is as of April 2026 the recommended Flux LoRA trainer (supports Flux.1, Flux.2, Wan, Lumina2, Z-Image + 10+ architectures; GUI + CLI). `kohya_ss` remains valid for SDXL and Flux.1 on consumer hardware (sd-scripts v0.9.1). IP-Adapter: the original `tencent-ailab/IP-Adapter` repo is effectively unmaintained (last commit Jan 2024). For Flux, use InstantX's FLUX.1-dev IP-Adapter or `comfyorg/comfyui-ipadapter`.

**Post-processing layer.**
- `danielgatis/rembg` (22.5k★ as of 2026-04-21, v2.0.75) — default background removal, actively maintained with monthly releases.
- `Bria-AI/RMBG-2.0` — SOTA matting (CC-BY-NC-4.0 model ⇒ commercial via Bria/fal/Replicate
  endpoints, **not** embedded). ComfyUI node: `1038lab/ComfyUI-RMBG` v3.0.0 (2026-01-01).
- `visioncortex/vtracer` (Rust, full-color SVG) — vectorization fallback.
- `akabekobeko/npm-icon-gen` + `onderceylan/pwa-asset-generator` +
  `ionic-team/capacitor-assets` + `guillempuche/appicons` — platform-spec resizers.

**Agent surface layer.**
- `vercel/mcp-adapter` (`mcp-handler`) — the `createMcpHandler` at `/api/[transport]`
  pattern validated by `vercel-labs/mcp-for-next.js` and `run-llama/mcp-nextjs`.
- `@modelcontextprotocol/sdk` — base MCP types.
- `zod` — all tool schemas.
- `@auth/nextjs` or Clerk — OAuth 2.1 for the hosted MCP.
- `navigator.modelContext` (WebMCP) as a progressive-enhancement layer once Chrome 146+
  ships.

### OSS integrations to ship with (first-class, advertised)

1. **brand.md / brandspec / AdCP brand.json as inputs.** Accept any of the three via
   `brand_bundle_parse`; internally normalize to a single schema; inject into every
   downstream generation.
2. **GitHub repo ingest.** Given a repo URL, detect `brand.md`, `AGENTS.md`, package
   metadata; auto-configure the brand bundle. Matches the `dembrandt` URL-ingestion
   pattern.
3. **Figma read-only.** Via Figma's official MCP, read selected frames for style
   references (IP-Adapter input). No write-back in v1.
4. **v0 registry publication.** Register our MCP so v0 users can call our tools during
   app scaffolding.
5. **Polotno / Satori / `@vercel/og` JSON-template renderer** for OG cards and
   text-bearing favicons. Deterministic pixels, no T2I hallucination of typography.
6. **ComfyUI import.** Accept civitai/openart workflow JSON (UI format → API format
   conversion) as an advanced-mode override when users bring their own pipeline.
7. **Iconify + SVGL search** inside `enhance_prompt`: when the intent is "iconic
   single-glyph", offer deterministic composition *first*, generation *second*.
8. **LangChain + LlamaIndex downstream adapters.** Publish thin tool wrappers around our
   API so users already inside those graphs can call us without leaving.

### The differentiation story

The OSS landscape is crowded at the wrapper layer and empty at the correctness layer.
Our plugin is not a seventh Next.js + OpenAI logo clone, not a second Hunyuan rewriter,
not a tenth ComfyUI workflow pack, not a third OAuth-backed Linear-style MCP for a
generic domain. It is the *first* product that combines all four layers around a single
organizing principle: **asset correctness is the product, generation is an implementation
detail**.

Concretely, seven things compound into a defensible position:

1. **Research-grounded prompt enhancement as the wedge.** The 121-subagent compendium
   feeding this plugin encodes transparency handling (category 13), artifact avoidance
   (14), brand consistency (15), Imagen/GPT-image-1/Flux/SDXL dialect differences
   (04–07). No competitor's `enhance_prompt` is backed by that depth of primary-source
   research.
2. **Multi-model routing by capability, not vendor.** Imagen-4 for flat logos, Flux for
   photoreal hero art, Recraft V3 when SVG is required, `gpt-image-1` when alpha is
   required — selected by the `capabilities` map, never hard-coded. LogoCreator is
   Flux-only; `mcp-logo-gen` is FAL-only; we route.
3. **Asset-specific post-processing is bundled.** Generation + BRIA RMBG 2.0 + vtracer +
   `npm-icon-gen` + `pwa-asset-generator` + `capacitor-assets` behind one tool call is a
   category-defining UX. Users get an iOS `AppIcon.appiconset` they drop into Xcode, not
   "an image".
4. **Brand bundle injection compounds the moat.** After the first asset, the user has a
   `brand.md`. Every subsequent call stays on-brand automatically — colors, typography,
   personality, guardrails, `do_not[]` — injected as style tokens, palette constraints,
   negative prompts, and IP-Adapter reference images.
5. **Validation + regenerate loop is visible and free.** `validate_asset` runs after
   every generation (alpha coverage, palette adherence, text legibility, safe zone,
   contrast, platform spec) and triggers a targeted re-prompt on failure. Nothing in OSS
   closes this loop; we close it by default.
6. **Tri-surface parity.** Every UI action is an MCP tool is a Skill slash-command.
   `/enhance`, `/logo`, `/iconset`, `/og`, `/appicon` work identically in Claude Code,
   Cursor, Windsurf, Gemini CLI, Codex, VS Code, Zed, v0 — and identically in our
   website and in a browser via WebMCP.
7. **OSS end-to-end replacement for `appicon.co`.** The baked-in `resize_icon_set` (a
   drop-a-1024-get-everything flow backed by `npm-icon-gen` + `pwa-asset-generator` +
   `capacitor-assets`) is a standalone reason to visit, share, and install — a gateway
   drug to the full product.

The closest conceptual analog is **Figma for AI-generated brand assets that both
designers and coding agents can drive**. Figma's moat is not the rendering engine; it is
the canvas + primitives + MCP + auth + plugin ecosystem. Our moat is the research corpus
+ asset-correctness validators + brand-bundle integration + multi-model router + MCP +
cross-IDE delivery. Every individual piece is OSS. The *stitch* is not.

---

## Primary Sources Aggregated

### Prompt-enhancement repos (20a)

- `Hunyuan-PromptEnhancer/PromptEnhancer` — <https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer> (~3.7k★, Apache-2.0)
- `microsoft/LMOps — promptist/` — <https://github.com/microsoft/LMOps/tree/main/promptist> (MIT)
- Promptist paper — <https://arxiv.org/abs/2212.09611> (NeurIPS 2023 Spotlight)
- `NeoVertex1/SuperPrompt` — <https://github.com/NeoVertex1/SuperPrompt> (~6.4k★)
- `promptslab/Promptify` — <https://github.com/promptslab/Promptify> (~4.6k★, Apache-2.0)
- `thunlp/OpenPrompt` — <https://github.com/thunlp/OpenPrompt> (~4.8k★, Apache-2.0)
- `adieyal/sd-dynamic-prompts` — <https://github.com/adieyal/sd-dynamic-prompts> (~2.3k★, MIT)
- `lllyasviel/Fooocus` (expansion.py) — <https://github.com/lllyasviel/Fooocus> (~48k★, GPL-3.0; model CC-BY-NC-4.0) — **LTS-only as of 2025; last feature release v2.5.5 Aug 2025**
- `Gustavosta/MagicPrompt-Stable-Diffusion` — <https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion>
- `roborovski/superprompt-v1` — <https://huggingface.co/roborovski/superprompt-v1>
- `alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2` (BeautifulPrompt) — <https://huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2>
- `Karine-Huang/T2I-CompBench` — <https://github.com/Karine-Huang/T2I-CompBench>
- Vertex AI Imagen Prompt Rewriter — <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/use-prompt-rewriter>
- PAE / Dynamic Prompt Optimizing (arXiv:2404.04095) — <https://arxiv.org/abs/2404.04095>

### Full-stack asset generators (20b)

- `Nutlope/logocreator` — <https://github.com/Nutlope/logocreator> (6.8k★)
- `zhangyu1818/appicon-forge` — <https://github.com/zhangyu1818/appicon-forge> (981★)
- `guillempuche/appicons` — <https://github.com/guillempuche/appicons>
- `onderceylan/pwa-asset-generator` — <https://github.com/onderceylan/pwa-asset-generator> (3,006★)
- `ionic-team/capacitor-assets` — <https://github.com/ionic-team/capacitor-assets> (577★)
- `pheralb/svgl` — <https://github.com/pheralb/svgl> (5,700★)
- `iconify/iconify` — <https://github.com/iconify/iconify> (6,000★)
- `visioncortex/vtracer` — <https://github.com/visioncortex/vtracer>
- `shinpr/mcp-image` — <https://github.com/shinpr/mcp-image> (97★)
- `eyenpi/sticker-generator` — <https://github.com/eyenpi/sticker-generator>
- `fabriziosalmi/brandkit` — <https://github.com/fabriziosalmi/brandkit>
- `iamdanwi/brand-forge` — <https://github.com/iamdanwi/brand-forge>
- `dembrandt/dembrandt` — <https://github.com/dembrandt/dembrandt>
- `leebr27/marque` — <https://github.com/leebr27/marque>
- `danielgatis/rembg` — <https://github.com/danielgatis/rembg> (22,500+★ as of 2026-04-21; v2.0.75 released 2026-04-08)
- `Bria-AI/RMBG-2.0` — <https://github.com/Bria-AI/RMBG-2.0> (CC-BY-NC-4.0; ComfyUI node: 1038lab/ComfyUI-RMBG v3.0.0)
- Polotno — <https://github.com/polotno-project>
- `@vercel/og` + Satori — <https://github.com/vercel/satori>
- `piaoyinghuang/brand-consistency-ai-skill` — <https://github.com/piaoyinghuang/brand-consistency-ai-skill>
- `recraft-ai/mcp-recraft-server` — <https://github.com/recraft-ai/mcp-recraft-server>
- `akabekobeko/npm-icon-gen` — <https://github.com/akabekobeko/npm-icon-gen>

### SDK wrappers (20c)

- Vercel AI SDK image generation — <https://sdk.vercel.ai/docs/ai-sdk-core/image-generation>
- `vercel/ai` PR #4056 (generateImage) — <https://github.com/vercel/ai/pull/4056>
- `@ai-sdk/fal` — <https://ai-sdk.dev/v5/providers/ai-sdk-providers/fal>
- Vercel AI Gateway BYOK — <https://vercel.com/docs/ai-gateway/byok>
- OpenRouter image generation — <https://openrouter.ai/docs/guides/overview/multimodal/image-generation>
- `andrewyng/aisuite` — <https://github.com/andrewyng/aisuite> (no image support yet — issue #90)
- LangChain DALL·E tool — <https://docs.langchain.com/oss/python/integrations/tools/dalle_image_generator>
- LlamaIndex `TextToImageToolSpec` — <https://docs.llamaindex.ai/en/stable/api_reference/tools/text_to_image/>
- Replicate Python SDK — <https://replicate.com/docs/get-started/python>
- `replicate/replicate-javascript` — <https://github.com/replicate/replicate-javascript>
- fal.ai Python client — <https://docs.fal.ai/clients/python/>
- Together AI FLUX.2 — <https://docs.together.ai/docs/quickstart-flux-2>
- `simonw/llm` issue #828 — <https://github.com/simonw/llm/issues/828>

### ComfyUI ecosystem (20d)

- `comfyanonymous/ComfyUI` / `Comfy-Org/ComfyUI` — <https://github.com/Comfy-Org/ComfyUI> (~108.5k★ as of 2026-04-13)
- `Comfy-Org/ComfyUI-Manager` — <https://github.com/Comfy-Org/ComfyUI-Manager> (~14.3k★; v4.1, 2026-03-25; now integrated into core)
- `registry.comfy.org` — <https://registry.comfy.org/>
- `Comfy-Org/desktop` (Electron) — <https://github.com/Comfy-Org/desktop>
- `ltdrdata/ComfyUI-Impact-Pack` — <https://github.com/ltdrdata/ComfyUI-Impact-Pack> (~3k★)
- `rgthree/rgthree-comfy` — <https://github.com/rgthree/rgthree-comfy> (~3k★)
- `yolain/ComfyUI-Easy-Use` — <https://github.com/yolain/ComfyUI-Easy-Use> (~2.4k★)
- `huchenlei/ComfyUI-layerdiffuse` (native RGBA) — <https://github.com/huchenlei/ComfyUI-layerdiffuse>
- `WASasquatch/was-node-suite-comfyui` — archived 2025-06-02
- `ComfyUI_examples` — <https://github.com/comfyanonymous/ComfyUI/tree/master/script_examples>
- ComfyUI server routes — <https://docs.comfy.org/development/comfyui-server/comms_routes>
- `runpod-workers/worker-comfyui` — <https://github.com/runpod-workers/worker-comfyui>
- `replicate/cog-comfyui` — <https://github.com/replicate/cog-comfyui>
- Modal ComfyApp example — <https://modal.com/docs/examples/comfyapp>
- Modal OpenArt case study — <https://modal.com/blog/openart-case-study>
- ComfyDeploy — <https://www.comfydeploy.com/>
- ComfyICU — <https://comfy.icu/>
- Civitai Icon/Asset Maker workflow — <https://civitai.com/models/344835/iconasset-maker-comfyui-flow>
- OpenArt Logo Creator with Gemini — <https://openart.ai/workflows/onion/logo-creator-with-gemini/5cCMewa8cjVJUcjNrd0C>
- `Acly/krita-ai-diffusion` — <https://github.com/Acly/krita-ai-diffusion>

### Agent-native architectures (20e)

- Figma MCP Server — <https://developers.figma.com/docs/figma-mcp-server>
- Linear MCP — <https://linear.app/docs/mcp>
- Gamma MCP tools reference — <https://developers.gamma.app/mcp/mcp-tools-reference>
- `vercel/mcp-adapter` — <https://github.com/vercel/mcp-adapter>
- `vercel-labs/mcp-for-next.js` — <https://github.com/vercel-labs/mcp-for-next.js>
- `run-llama/mcp-nextjs` — <https://github.com/run-llama/mcp-nextjs>
- `modelcontextprotocol/example-remote-server` — <https://github.com/modelcontextprotocol/example-remote-server>
- `vercel-labs/open-agents` — <https://github.com/vercel-labs/open-agents> (3.8k★)
- Cursor Background Agent API — <https://docs.cursor.com/en/background-agent/api/overview>
- WebMCP (W3C draft) — <https://github.com/MiguelsPizza/WebMCP>
- brandspec — <https://brandspec.dev/>
- `thebrandmd/brand.md` — <https://github.com/thebrandmd/brand.md>
- AdCP Brand Protocol — <https://docs.adcontextprotocol.org/docs/brand-protocol>
- `mcpware/logoloom` — <https://github.com/mcpware/logoloom>
- `arekhalpern/mcp-logo-gen` — <https://github.com/arekhalpern/mcp-logo-gen>
- `niels-oz/icon-generator-mcp` — <https://github.com/niels-oz/icon-generator-mcp>
