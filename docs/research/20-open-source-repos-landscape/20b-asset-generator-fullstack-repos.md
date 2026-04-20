---
category: 20-open-source-repos-landscape
angle: 20b
title: "Open-source full-stack asset generators: the 'one prompt → real asset' landscape"
summary: >
  A cross-reference-hungry survey of 30+ open-source repositories that attempt
  the same job-to-be-done as our Prompt Enhancer — turning a one-line user
  intent into shipped, correct visual assets (logos, app icons, favicons, OG
  images, stickers, wallpapers, illustrations, SVGs). Maps the landscape by
  asset-type slice, grades maturity, and names the gap our plugin can own.
sources:
  primary: github
  years: [2023, 2024, 2025, 2026]
tags:
  - competitive-landscape
  - open-source
  - asset-generation
  - full-stack
  - fullstack
  - logo-generator
  - icon-generator
  - favicon
  - og-image
  - mcp
  - claude-skill
  - canva-alternative
  - figma-plugin
  - prompt-to-asset
last_reviewed: 2026-04-19
---

# 20b — Open-source asset-generator full-stack repos: cross-reference hungry survey

## Executive Summary

The "one prompt → real asset" space on GitHub is surprisingly **wide and
surprisingly shallow**. Dozens of full-stack apps (mostly Next.js + Supabase +
some vendor image API) have shipped in the last 18 months, but almost none of
them solve the three failure modes that the Prompt Enhancer project is built
around:

1. **True transparency**. Virtually every open-source "logo generator" in this
   survey renders a checkered-pattern PNG and calls it "transparent". The rare
   exceptions (`eyenpi/sticker-generator`, `zhangyu1818/appicon-forge`,
   `fabriziosalmi/brandkit`) pipe through `rembg`/BRIA RMBG after generation
   rather than asking the model for RGBA up front.
2. **Platform-shape correctness**. App-icon apps generate "a square image" and
   leave the user to crop to iOS/Android/watchOS/Material You masks. Only two
   repos — `ionic-team/capacitor-assets` (577★) and `onderceylan/pwa-asset-generator`
   (3,006★) — enforce real platform specs, and neither has an LLM front end.
3. **Prompt quality**. Exactly one meaningful open-source project
   (`Hunyuan-PromptEnhancer`, 3,656★) treats the prompt itself as a first-class
   artifact that needs rewriting before the image model sees it. None of the
   logo/icon/OG generator repos surveyed here integrate a prompt-rewriter step.

In other words: the **asset-generator full-stack space has been cloned to
death around the UI layer**, but the hard parts (transparency, platform
specs, brand consistency, prompt rewriting) remain unsolved openings. This
document catalogs 30+ relevant repos organized by what they output, extracts
what each teaches us, and names what our plugin should do differently.

## Scope & method

I searched GitHub (via web search) for repos that match at least one of:
- "AI logo generator" / "one prompt logo" / "brand forge"
- "AI app icon generator" / "icon forge" / "appicon"
- "favicon generator" / "OG image generator" / "pwa asset generator"
- "Canva alternative" / "Polotno" / "Penpot"
- "Figma AI plugin" + SVG generation
- "MCP image" / "Claude skill image"
- "prompt enhancer" image generation
- Vectorizer alternatives (`vtracer`, `potrace`)
- Background removal + full-stack webapp (`rembg`, `BRIA RMBG 2.0`)

Only public, OSS-licensed repos with usable code and a demo or install path are
included. I noted stars, last activity, license, stack, and — critically —
**what's broken or missing** from the perspective of our plugin.

## Repo catalog, organized by what they generate

### A. Logo generators (full stack)

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`geallenboy/ai-logo`](https://github.com/geallenboy/ai-logo) | 79 | Next.js + Supabase + Stripe + SD/DeepAI | Most complete clone: auth, subs, SVG/PNG export. No real transparency. No platform specs. |
| [`allknowledge34/AI_Logo_Generator_App`](https://github.com/allknowledge34/AI_Logo_Generator_App) | small | Next.js + Firebase + Gemini/HF/Replicate | Multi-provider but naive prompts. |
| [`AppajiDheeraj/logofy`](https://github.com/AppajiDheeraj/logofy) | small | Next.js + Clerk + Gemini + Pollinations | Clean UI, one-click download, no variations/brand consistency. |
| [`leebr27/marque`](https://github.com/leebr27/marque) | small | Next.js 15 + Gemini 2.0 Flash + Supabase | Unique: builds brand identity from meeting transcripts, outputs real SVG. A clever input-side innovation. |
| [`vineet-op/LogoSmith`](https://github.com/vineet-op/LogoSmith) | small | Next.js + ShadCN + Gemini + HF | Generic wrapper. |
| [`iamdanwi/brand-forge`](https://github.com/iamdanwi/brand-forge) | 4 | TypeScript | Extracts "brand DNA" from a URL, generates palettes, typography, logos, exports to SVG/PNG/CSS/JSON tokens. Promising direction but incomplete (draft). |
| [`HichTala/diffusion-model-for-logo-generation`](https://github.com/HichTala/diffusion-model-for-logo-generation) | 3 | Python research | Fine-tune experiments; useful as background. |
| [`Logo-Diffusion`](https://github.com/Logo-Diffusion) org | — | A1111 fork "LoDi-Engine-A1" | Runs commercial site logodiffusion.com; the public fork is the clearest proof that a tuned SD pipeline beats naive prompting for logos. |
| [`logo-wizard/logo-diffusion`](https://huggingface.co/logo-wizard/logo-diffusion) | — | HF LoRA/LoHA on SD 2.1 | Model checkpoint; pair with `sd-webui` or Diffusers. |
| [`creecros/simple_logo_gen`](https://github.com/creecros/simple_logo_gen) | 139 | Python + FontAwesome | **Not** AI — composes glyphs into a logo. Worth studying: it's the "deterministic fallback" path when the model refuses. |

**What they teach us.** The median "AI logo generator" is a Next.js + auth +
Stripe + `openai.images.generate()` shell. Differentiation has moved to input
side (`marque`'s transcript ingestion, `brand-forge`'s URL DNA extraction) and
to brand-consistency side (LoRA/LoHA checkpoints, `Logo-Diffusion`'s fork). No
one in this list handles the transparency bug.

### B. App-icon generators

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`samzong/ai-icon-generator`](https://github.com/samzong/ai-icon-generator) | small | Next.js + `gpt-image-1` | Flat/3D/outlined/gradient presets; exports PNG/ICO/ICNS/JPEG. No iOS/Android mask-awareness. |
| [`ishworrsubedii/ico-gen`](https://github.com/ishworrsubedii/ico-gen) | small | Next.js + FastAPI + SD | Generates **SVG** icons, lets you edit shape/color. Closer to what we want but single-size. |
| [`fahimsweb/ai-icon-generator`](https://github.com/fahimsweb/ai-icon-generator) | small | DALL·E | Generates 3 sets per prompt. Basic. |
| [`yauheniya-ai/icon-gen-ai`](https://github.com/yauheniya-ai/icon-gen-ai) | small | Python CLI | Not generative — composes Iconify + gradients. Good reminder: **composition beats generation** for icon-style work. |
| [`zhangyu1818/appicon-forge`](https://github.com/zhangyu1818/appicon-forge) | 981 | TypeScript | Best in class for composition: 200k+ Iconify icons, gradient/shadow/border controls, exports platform-ready. No LLM driver. |
| [`guillempuche/appicons`](https://github.com/guillempuche/appicons) | small | CLI | Generates 100+ assets (iOS 18, Android, watchOS, tvOS, visionOS, PWA, RN, Expo, Flutter) from one source — including adaptive icons, Material You theming, dark-mode variants. **This is the spec-enforcement we want.** No AI yet. |
| [`xcodeBn/app-icon-formatter`](https://github.com/xcodeBn/app-icon-formatter) | small | React 19 | Drag-drop resizer that auto-generates `Contents.json`. Useful reference for Xcode workflow. |

**What they teach us.** There's a clean split:
- "AI icon" repos generate one image and call it done.
- "Asset pipeline" repos enforce platform specs from a clean source.

**Nobody has bridged them yet**. A prompt-driven, spec-enforcing app-icon
generator is a wide-open slot.

### C. Favicon + OG image tools

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`onderceylan/pwa-asset-generator`](https://github.com/onderceylan/pwa-asset-generator) | 3,006 | TypeScript + Puppeteer | Canonical: PWA icons, splash, favicons, mstile; auto-patches `manifest.json` and `index.html`. Our gold standard for spec correctness. |
| [`ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets) | 577 | TypeScript (Ionic) | Easy mode = one logo + background colors → iOS/Android/PWA. 251k weekly npm d/l. |
| [`RealFaviconGenerator/realfavicongenerator`](https://github.com/RealFaviconGenerator/realfavicongenerator) | — | TypeScript | The open-sourced engine behind realfavicongenerator.net. |
| [`RealFaviconGenerator/cli-real-favicon`](https://github.com/RealFaviconGenerator/cli-real-favicon) | — | Node | Thin CLI over the API. |
| [`neg4n/faviconize`](https://github.com/neg4n/faviconize) | small | Node | Local alternative; no network calls. |
| [`favigen`](https://registry.npmjs.org/favigen) | — | Node CLI | Flexible output, dry-run mode. |
| [`premananda108/ai-favicon-generator`](https://github.com/premananda108/ai-favicon-generator) | small | Gemini API | Rare AI-driven favicon generator; outputs full package as ZIP. |
| [`ogimg/ogimg`](https://github.com/ogimg/ogimg) | small | Next.js 16 + shadcn | Landing page + editor (WIP). Apache-2.0. |
| [`neg4n/next-api-og-image`](https://github.com/neg4n/next-api-og-image) | — | Next.js API route | React/HTML templates, serverless-friendly. |
| [`ogify/ogify`](https://github.com/ogify/ogify) | — | Satori + resvg-js | Zero-config OG, RTL support, smart font/emoji caching. |
| Vercel's `@vercel/og` | — | Satori-based runtime | De facto standard; referenced by `create-t3-app` PR #1435. |

**What they teach us.** Favicon + OG is the **most solved** sub-domain here.
Specs are well understood, tooling is boring and mature. An AI-driven layer is
viable but the value-add is narrow: mostly "generate the source mark" and hand
off to these generators. Our plugin should **call** these tools, not replace
them.

### D. Vector / SVG generation and conversion

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`pheralb/svgl`](https://github.com/pheralb/svgl) | 5,700+ | SvelteKit + Hono | Library of 400+ optimized brand SVG logos w/ public REST API, light/dark, wordmark variants. Ecosystem of plugins (CLI, React, Vue, Figma, VSCode, Raycast). **Massive** reference point for a vector-first workflow. |
| [`iconify/iconify`](https://github.com/iconify/iconify) | 6,000+ | TS | 200k+ icons across 150+ sets, on-demand SVG API. The spine of deterministic icon assembly. |
| [`lobehub/lobe-icons`](https://github.com/lobehub/lobe-icons) | 1,712 | React/RN | AI/LLM brand marks (OpenAI/Anthropic/Google/etc.) as SVG/PNG/WebP. |
| [`visioncortex/vtracer`](https://github.com/visioncortex/vtracer) | large | Rust | Full-color raster→SVG with O(n) tracing (Potrace is O(n²), B&W only). Our vectorization fallback. |
| [`btk/vectorizer`](https://github.com/btk/vectorizer) | — | JS + Potrace | Simpler multi-color tracer. |
| [`sserada/image-to-svg`](https://github.com/fightingso/png-to-svg) | — | Svelte + FastAPI + vtracer | Web UI over vtracer. |
| [`recraft-ai/mcp-recraft-server`](https://github.com/recraft-ai/mcp-recraft-server) | — | TS MCP | Official MCP: raster+vector gen, custom styles, vectorization, BG removal, upscaling. |
| [`BartWaardenburg/recraft-mcp-server`](https://github.com/BartWaardenburg/recraft-mcp-server) | — | TS MCP | 16-tool community variant. |
| [`aself101/ideogram-api`](https://github.com/aself101/ideogram-api) | — | Node | 7 ops, 62 style presets, 203 tests, v1.1.0 (Dec 2025). Clean wrapper to study. |
| [`Acring/figma-ai-icon-generator-plugin`](https://github.com/Acring/figma-ai-icon-generator-plugin) | — | TS + React 19 + Claude | Sketch-to-SVG inside Figma via Claude vision. Style-reference library, prompt templates, history. |
| [`figma/ai-plugin-template`](https://github.com/figma/ai-plugin-template) | — | TS + Next.js | Official streaming-LLM Figma plugin template. |
| [`jacobtyq/export-figma-svg`](https://github.com/jacobtyq/export-figma-svg) | 44 | Node CLI | Figma API → clean SVG. |
| [`joshuaslate/figma-export-svg`](https://github.com/joshuaslate/figma-export-svg) | — | Node CLI | SVGO-integrated. |

**What they teach us.** Three important signals:
1. **Vector-native generation exists** (Recraft, `recraftv4_vector`, Ideogram's
   style presets) but only behind paid APIs. OSS still leans on raster→vector
   tracing.
2. **Deterministic composition beats generation** for many icon needs
   (Iconify, SVGL). Our Enhancer should know when to *not* call a diffusion
   model and instead compose from an existing 275k-icon library.
3. **Figma is the highest-intent surface** for a "generate the SVG" workflow,
   and AI plugins with open code exist but are thin.

### E. Stickers, wallpapers, emojis, illustrations

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`eyenpi/sticker-generator`](https://github.com/eyenpi/sticker-generator) | small | Python CLI + Gemini | **Actually generates transparent PNGs** via batch + style presets (Kawaii/3D/Pixel/Watercolor/Minimal). Closest non-logo reference for our transparency problem. |
| [`abdibrokhim/ai-sticker-maker`](https://github.com/abdibrokhim/ai-sticker-maker) | — | Next.js + aimlapi (200+ models) | Web app; tutorial-driven. |
| [`all-in-aigc/aiwallpaper`](https://github.com/all-in-aigc/aiwallpaper) | 716 | TS + Clerk + Stripe + S3 + OpenAI | Full-stack prototype SaaS. |
| [`EthanSK/macos-gen-ai-wallpaper`](https://github.com/EthanSK/macos-gen-ai-wallpaper) | — | Shell + DALL·E | Nice integration angle: generated asset → actual OS hook. |
| [`lauroguedes/wallai`](https://github.com/lauroguedes/wallai) | — | Laravel + Horizon + Gemini | 21 style presets; mobile/desktop outputs. |
| [`GradientSurfer/Draw2Img`](https://github.com/GradientSurfer/Draw2Img) | — | Python + Gradio + SDXL-Turbo | Canvas → image; reference for interactive asset sketching. |

### F. Canva / Figma alternatives and design editors

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [Penpot](https://penpot.app) / [`penpot/penpot`](https://github.com/penpot/penpot) | 35k+ | Clojure + JS | The open-source Figma/Canva alt. Real design primitives; a potential deep integration surface. |
| Polotno / [`polotno-project/*`](https://github.com/polotno-project) | — | JS SDK | Canvas SDK used by many AI startups. `polotno-node` renders JSON templates → images/PDFs — ideal for our "render to spec" stage. |
| [OpenPolotno](https://dev.to/rutvik_panchal_b48b8efc56/building-an-open-source-polotno-alternative-canva-like-editor-53pp) | — | JS | Fully open, JSON import/export compatible with Polotno. |
| [`nraiden/openv0`](https://github.com/nraiden/openv0) | 3,941 | TS | Generative UI components; archived, spiritual ancestor of Cofounder. |
| [`dakouan18/vx.dev`](https://github.com/dakouan18/vx.dev) | 87 | TS + GitHub Actions | v0 via GH Actions + shadcn/lucide/nivo. Good pattern: **the IDE/GitHub is the UI**. |
| W&B OpenUI | — | Py + multi-LLM | Prompt-to-HTML with Ollama support. |
| Frontman | — | TS | Edits existing repos; BYOK; Next/Astro/Vite. |

**What they teach us.** The Canva-alt side is mature and Polotno's
JSON-first template model is exactly the shape we want: an LLM emits a
template spec, a deterministic renderer produces the pixels. That's a much
safer pipeline than "ask the model for the final PNG".

### G. MCP / agent-native image tools (direct competitors to our plugin)

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`shinpr/mcp-image`](https://github.com/shinpr/mcp-image) | 97 | TS + Gemini 2.5 Flash/Pro | **Includes a "Subject–Context–Style" automatic prompt-optimizer** and ships bundled Claude Code skills. Closest thing to our plugin in the MCP ecosystem. |
| [`pvliesdonk/image-generation-mcp`](https://github.com/pvliesdonk/image-generation-mcp) | — | Python, MIT | Multi-provider (OpenAI/SD-WebUI), asset mgmt with CDN-style transforms, auth. |
| [`somacoffeekyoto/imgx-mcp`](https://github.com/somacoffeekyoto/imgx-mcp) | — | TS | 24 edit techniques, session undo/redo, ships a Claude Code skill. |
| [`TamerinTECH/claude-code-generate-images-mcp`](https://github.com/TamerinTECH/claude-code-generate-images-mcp) | — | JS | Gemini / Azure OpenAI Flux 1.1 Pro; "generate during UI dev" framing. |
| [`fdciabdul/MCP-IMAGE-GENERATOR`](https://github.com/fdciabdul/MCP-IMAGE-GENERATOR) | — | TS | OpenRouter/Together/Replicate/fal.ai; FLUX 2 + SDXL. |
| [`recraft-ai/mcp-recraft-server`](https://github.com/recraft-ai/mcp-recraft-server) | — | TS | Vendor-official; vector generation + post-processing stack. |

**What they teach us.** `shinpr/mcp-image` is the one to study closely: it
already ships the "prompt rewriter + Claude skill" pattern. Our differentiator
has to be **asset-specific prompt surgery** (app-icon vs logo vs favicon vs OG
vs sticker), **real platform spec enforcement**, and **transparency that is
actually transparent** — not a generic image-gen MCP with a nicer prompt.

### H. Prompt rewriters / enhancers (input-side)

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`Hunyuan-PromptEnhancer/PromptEnhancer`](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer) | 3,656 | Python, Tencent | **CoT prompt rewriting via RL**; 7B/32B + GGUF + VLM variants; model-agnostic; T2I-Keypoints-Eval dataset. Highest-credibility open prompt-rewriter in the space. |
| [`pavank-code/RePRo`](https://github.com/pavank-code/RePRo) | — | Chrome ext | "Grammarly for AI Prompts" — DALL·E/MJ/SD/video/code/text. Shows the browser-extension surface. |
| ComfyUI LLM Prompt Enhancer | — | ComfyUI node | 50+ artistic styles; Flux/SD compatible. Reference for **in-pipeline** rewriting. |
| [`VaibhavAcharya/oneprompt`](https://github.com/VaibhavAcharya/oneprompt) | — | TS | XML-based prompt DSL w/ variables, conditions, reuse. Data-structure reference. |
| [`edensitko/Promter`](https://github.com/edensitko/Promter) | — | JSON + CLI | 50+ prompt files, 27 SaaS/ecommerce/portfolio templates, public JSON API. Good architectural pattern for "prompts as content". |

### I. Asset pipelines / post-processing (what we'd glue to)

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`danielgatis/rembg`](https://github.com/danielgatis/rembg) | 22,491 | Python | Canonical BG removal; CLI/lib/HTTP/Docker, CPU + NVIDIA/AMD GPU. |
| [`Bria-AI/RMBG-2.0`](https://github.com/Bria-AI/RMBG-2.0) | — | PyTorch | SOTA BG removal; CC-BY-NC 4.0 (non-commercial), commercial via Bria/fal/Replicate. |
| [`fabriziosalmi/brandkit`](https://github.com/fabriziosalmi/brandkit) | — | Flask + Pillow + Alpine | One-image → 25+ brand format exports with `rembg` piped in. **Closest pattern to what we want at the pipeline layer.** |
| [`dembrandt/dembrandt`](https://github.com/dembrandt/dembrandt) | — | Node + MCP | Extracts design-system tokens from a live URL: logo, colors, type, borders, shadows → DTCG/JSON/PDF. MCP integration. |
| [`piaoyinghuang/brand-consistency-ai-skill`](https://github.com/piaoyinghuang/brand-consistency-ai-skill) | — | JSON skill | 100-point brand compliance checklist for LLM outputs; WCAG AA contrast; tone adaptation. Pattern template for our skill. |
| [`akshaykarthicks/BrainSpark`](https://github.com/akshaykarthicks/BrainSpark) | — | Google Opal + Tailwind | Prompt → logos + fonts + palettes + landing page. |

### J. SaaS boilerplates that embed asset generation

| Repo | Stars | Stack | Notes |
|---|---|---|---|
| [`wasp-lang/open-saas`](https://github.com/wasp-lang/open-saas) | 13,700 | Wasp + React + Prisma + Stripe | Claude-Code-integrated; the usual starting point for a full-stack AI asset app. |
| [`pjborowiecki/saasy-land`](https://github.com/pjborowiecki/saasy-land) | — | Next.js 14 + ShadCN + Supabase/Neon | Multi-branch boilerplate. |
| [`uxfris/saas-starter`](https://github.com/uxfris/saas-starter) | — | Next.js 16 + Supabase + Stripe + OpenAI | Production-ready. |
| [`kobble-io/supa-image-generator`](https://github.com/kobble-io/supa-image-generator) | — | Next.js + Supabase + Kobble | Canonical "AI image SaaS" demo. |
| [`tenngoxars/Imago`](https://github.com/tenngoxars/Imago) | — | Next.js 14 + Supabase + Stripe | Structured prompt builder, credit system, PWA, dark mode. |
| [`t3-oss/create-t3-app`](https://github.com/t3-oss/create-t3-app) | 28,720 | T3 stack | Includes a `@vercel/og` dynamic-OG PR (#1435) — the community template for "your app has brand assets built in". |

### K. Closed-source "shipped this already" competitors (awareness only)

- **brandforge.com** — commercial brand generator (not the OSS `brand-forge`).
- **logodiffusion.com** — commercial; the OSS fork listed above is the backbone.
- **realfavicongenerator.net** — OSS engine, hosted service.
- **Recraft / Ideogram / Canva Magic Studio** — closed, but shape the UX
  expectations we'll be compared against.
- **v0.dev / Cofounder** — UI-gen adjacent; share an "intent → asset" mindset.

## Strengths and weaknesses across the landscape

### What the ecosystem already does well

- **Platform-spec enforcement from a clean source.** `pwa-asset-generator`,
  `capacitor-assets`, `appicons`, `realfavicongenerator`, `@vercel/og` + Satori
  cover iOS/Android/watch/visionOS/PWA/favicon/OG rigorously. Re-implementing
  this is wasted work; our plugin should call or embed these libraries.
- **Vector-first scaffolding.** Iconify + SVGL + vtracer + Recraft's vector
  models give us a high-quality, deterministic rail when the LLM's raster
  output is the wrong tool.
- **MCP is already a design surface for image tools.** At least six MCP
  servers already exist; the pattern is validated — including one
  (`shinpr/mcp-image`) with a built-in prompt-optimizer and bundled Claude
  skill. Users won't need education on "why an MCP".
- **Prompt rewriting has at least one serious player.** `Hunyuan-PromptEnhancer`
  with ~3.7k stars and a real research paper makes the CoT-rewriting approach
  credible and provides a baseline to beat.
- **Design-system extraction from live URLs works.** `dembrandt` (DTCG
  tokens) and `iamdanwi/brand-forge` (brand DNA) show that "read the user's
  existing site and stay on-brand" is tractable.

### What is still broken

- **Transparency.** Across 15+ "logo generator" repos I looked at, none ask
  the model for RGBA up front. All produce PNGs with solid/checkered
  backgrounds and rely on post-hoc `rembg`/BRIA — which fails on
  near-monochrome marks, blown-out white foregrounds, and fine anti-aliasing.
  This is exactly the Gemini "weird boxes in the background" failure the user
  described.
- **Platform shapes in app-icon generators.** Generative repos output a
  square; asset-pipeline repos require a clean source. Nothing closes the
  loop: "describe your app → get the correct iOS/Android/Material You/watch
  set, masked and named correctly".
- **Prompt surgery is missing.** Only `shinpr/mcp-image` and
  `Hunyuan-PromptEnhancer` do meaningful rewriting, and neither is
  asset-type-aware. "Logo for a note-taking app" needs a different rewrite
  than "favicon for a note-taking app" than "OG card".
- **Brand consistency across a set.** Most apps generate one asset per call.
  Style-locking an app icon + favicon + OG card + marketing hero + empty-state
  illustration — the real developer need — is essentially unserved.
- **Evaluation.** No repo in this survey measures output correctness.
  Generation happens, the asset is either kept or regenerated by eye. No
  CLIPScore/PickScore/T2I-CompBench-style scoring, no platform-spec lint.
- **Determinism fallbacks.** Only `creecros/simple_logo_gen`,
  `yauheniya-ai/icon-gen-ai`, and `zhangyu1818/appicon-forge` treat
  "compose deterministically from Iconify/FontAwesome" as a first-class path.
  Everyone else calls a diffusion model and crosses their fingers.
- **Activity churn.** Many Next.js + OpenAI logo clones are effectively
  abandoned inside 6–12 months. The few repos with real staying power
  (Iconify 6k★, SVGL 5.7k★, pwa-asset-generator 3k★, rembg 22k★,
  Hunyuan-PromptEnhancer 3.6k★, `shinpr/mcp-image` 97★ but 2026-fresh) are the
  ones with narrow, well-defined scope.

## What our Prompt Enhancer plugin does differently

Cross-referencing this landscape yields a sharp positioning:

1. **Asset-type-aware prompt surgery.** We do not ship a generic
   text→image wrapper. The Enhancer detects *what* asset the user wants
   (logo / app icon / favicon / OG / sticker / illustration / SVG) and runs a
   type-specific rewrite pipeline with type-specific negative prompts,
   style priors, and platform constraints. No repo in this survey does this.
2. **Transparency as a first-class output contract.** When RGBA is required,
   we (a) request alpha from models that support it (`gpt-image-1`, Flux
   `transparent` LoRAs), (b) verify with a post-gen alpha-channel check, and
   (c) fall back to `rembg` / BRIA RMBG 2.0 with mark-preservation heuristics
   (erosion-safe, anti-alias-safe). We ship a visible "this *really* is
   transparent" verifier — directly targeting the Gemini "checkered boxes"
   failure.
3. **Platform-spec enforcement built in.** For app icons we reuse
   `capacitor-assets` / `pwa-asset-generator` / `appicons` semantics: the LLM
   produces a master mark, the pipeline produces the full platform set (iOS
   masks, Android adaptive + Material You, watchOS, tvOS, visionOS, PWA,
   favicon, OG), correctly named, correctly manifest-wired. Nothing in the
   "AI" half of this landscape does that.
4. **Composition as a first-class path, not a fallback.** Like
   `appicon-forge` but driven by the LLM: when the user asks for "a
   sparkline icon for a trading app", we compose from Iconify's 275k marks +
   gradient/shadow/shape tokens **before** we ever call a diffusion model.
   Generation is the expensive path, not the default.
5. **Brand-consistency across a set.** Given a logo or a site URL (the
   `dembrandt` / `brand-forge` pattern), the Enhancer extracts a token pack
   (palette, type, radius, shadow, style) and injects it into every subsequent
   asset generation as style-ref / LoRA / IP-Adapter — producing an
   *internally coherent* asset family, not six disconnected one-offs.
6. **Skills + MCP packaged together.** We ship (a) a Claude/Codex/Gemini
   skill, (b) an MCP server exposing the same tools to any agent, and (c) a
   web surface for non-CLI users. This matches the `shinpr/mcp-image` +
   `imgx-mcp` shape but scoped to correctness, not breadth.
7. **Evaluation and regeneration loop.** Each output is scored against its
   own target contract (transparent? on-brand palette match? correct mask
   shape? text-legible at 16px?). Failing assets trigger a targeted
   re-prompt — a pattern entirely absent from the OSS landscape.
8. **Deterministic renderer for templated assets.** For OG cards, favicons,
   splash screens, and brand kits, we use Satori / `@vercel/og` /
   `polotno-node` style JSON-template rendering rather than free-form image
   generation. The LLM fills a schema; a renderer produces the pixels. This
   is exactly the Polotno pattern and is dramatically more reliable than
   naive T2I for text-bearing assets.

In short: the landscape is crowded at the **wrapper layer** and empty at the
**correctness layer**. That's our land.

## References

### Logo generators

1. [`geallenboy/ai-logo`](https://github.com/geallenboy/ai-logo)
2. [`allknowledge34/AI_Logo_Generator_App`](https://github.com/allknowledge34/AI_Logo_Generator_App)
3. [`AppajiDheeraj/logofy`](https://github.com/AppajiDheeraj/logofy)
4. [`leebr27/marque`](https://github.com/leebr27/marque)
5. [`vineet-op/LogoSmith`](https://github.com/vineet-op/LogoSmith)
6. [`iamdanwi/brand-forge`](https://github.com/iamdanwi/brand-forge)
7. [`HichTala/diffusion-model-for-logo-generation`](https://github.com/HichTala/diffusion-model-for-logo-generation)
8. [`Logo-Diffusion` org](https://github.com/Logo-Diffusion)
9. [`logo-wizard/logo-diffusion` (HF)](https://huggingface.co/logo-wizard/logo-diffusion)
10. [`creecros/simple_logo_gen`](https://github.com/creecros/simple_logo_gen)

### App icon, favicon, OG

11. [`samzong/ai-icon-generator`](https://github.com/samzong/ai-icon-generator)
12. [`ishworrsubedii/ico-gen`](https://github.com/ishworrsubedii/ico-gen)
13. [`fahimsweb/ai-icon-generator`](https://github.com/fahimsweb/ai-icon-generator)
14. [`yauheniya-ai/icon-gen-ai`](https://github.com/yauheniya-ai/icon-gen-ai)
15. [`zhangyu1818/appicon-forge`](https://github.com/zhangyu1818/appicon-forge)
16. [`guillempuche/appicons`](https://github.com/guillempuche/appicons)
17. [`xcodeBn/app-icon-formatter`](https://github.com/xcodeBn/app-icon-formatter)
18. [`onderceylan/pwa-asset-generator`](https://github.com/onderceylan/pwa-asset-generator)
19. [`ionic-team/capacitor-assets`](https://github.com/ionic-team/capacitor-assets)
20. [`RealFaviconGenerator/realfavicongenerator`](https://github.com/RealFaviconGenerator/realfavicongenerator)
21. [`RealFaviconGenerator/cli-real-favicon`](https://github.com/RealFaviconGenerator/cli-real-favicon)
22. [`neg4n/faviconize`](https://github.com/neg4n/faviconize)
23. [`premananda108/ai-favicon-generator`](https://github.com/premananda108/ai-favicon-generator)
24. [`ogimg/ogimg`](https://github.com/ogimg/ogimg)
25. [`neg4n/next-api-og-image`](https://github.com/neg4n/next-api-og-image)
26. [`ogify/ogify`](https://github.com/ogify/ogify)

### Vector / SVG / Figma

27. [`pheralb/svgl`](https://github.com/pheralb/svgl)
28. [`iconify/iconify`](https://github.com/iconify/iconify)
29. [`lobehub/lobe-icons`](https://github.com/lobehub/lobe-icons)
30. [`visioncortex/vtracer`](https://github.com/visioncortex/vtracer)
31. [`btk/vectorizer`](https://github.com/btk/vectorizer)
32. [`recraft-ai/mcp-recraft-server`](https://github.com/recraft-ai/mcp-recraft-server)
33. [`BartWaardenburg/recraft-mcp-server`](https://github.com/BartWaardenburg/recraft-mcp-server)
34. [`aself101/ideogram-api`](https://github.com/aself101/ideogram-api)
35. [`Acring/figma-ai-icon-generator-plugin`](https://github.com/Acring/figma-ai-icon-generator-plugin)
36. [`figma/ai-plugin-template`](https://github.com/figma/ai-plugin-template)
37. [`jacobtyq/export-figma-svg`](https://github.com/jacobtyq/export-figma-svg)
38. [`joshuaslate/figma-export-svg`](https://github.com/joshuaslate/figma-export-svg)

### Stickers / wallpapers / illustrations

39. [`eyenpi/sticker-generator`](https://github.com/eyenpi/sticker-generator)
40. [`abdibrokhim/ai-sticker-maker`](https://github.com/abdibrokhim/ai-sticker-maker)
41. [`all-in-aigc/aiwallpaper`](https://github.com/all-in-aigc/aiwallpaper)
42. [`EthanSK/macos-gen-ai-wallpaper`](https://github.com/EthanSK/macos-gen-ai-wallpaper)
43. [`lauroguedes/wallai`](https://github.com/lauroguedes/wallai)
44. [`GradientSurfer/Draw2Img`](https://github.com/GradientSurfer/Draw2Img)

### Canva / Figma alts / UI gen

45. [Penpot](https://penpot.app)
46. [Polotno](https://github.com/polotno-project)
47. [OpenPolotno write-up](https://dev.to/rutvik_panchal_b48b8efc56/building-an-open-source-polotno-alternative-canva-like-editor-53pp)
48. [`nraiden/openv0`](https://github.com/nraiden/openv0)
49. [`dakouan18/vx.dev`](https://github.com/dakouan18/vx.dev)

### MCP + agent-native image tools

50. [`shinpr/mcp-image`](https://github.com/shinpr/mcp-image)
51. [`pvliesdonk/image-generation-mcp`](https://github.com/pvliesdonk/image-generation-mcp)
52. [`somacoffeekyoto/imgx-mcp`](https://github.com/somacoffeekyoto/imgx-mcp)
53. [`TamerinTECH/claude-code-generate-images-mcp`](https://github.com/TamerinTECH/claude-code-generate-images-mcp)
54. [`fdciabdul/MCP-IMAGE-GENERATOR`](https://github.com/fdciabdul/MCP-IMAGE-GENERATOR)

### Prompt enhancers / post-processing / brand

55. [`Hunyuan-PromptEnhancer/PromptEnhancer`](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer)
56. [`pavank-code/RePRo`](https://github.com/pavank-code/RePRo)
57. [`VaibhavAcharya/oneprompt`](https://github.com/VaibhavAcharya/oneprompt)
58. [`edensitko/Promter`](https://github.com/edensitko/Promter)
59. [`danielgatis/rembg`](https://github.com/danielgatis/rembg)
60. [`Bria-AI/RMBG-2.0`](https://github.com/Bria-AI/RMBG-2.0)
61. [`fabriziosalmi/brandkit`](https://github.com/fabriziosalmi/brandkit)
62. [`dembrandt/dembrandt`](https://github.com/dembrandt/dembrandt)
63. [`piaoyinghuang/brand-consistency-ai-skill`](https://github.com/piaoyinghuang/brand-consistency-ai-skill)
64. [`akshaykarthicks/BrainSpark`](https://github.com/akshaykarthicks/BrainSpark)

### Boilerplates

65. [`wasp-lang/open-saas`](https://github.com/wasp-lang/open-saas)
66. [`pjborowiecki/saasy-land`](https://github.com/pjborowiecki/saasy-land)
67. [`uxfris/saas-starter`](https://github.com/uxfris/saas-starter)
68. [`kobble-io/supa-image-generator`](https://github.com/kobble-io/supa-image-generator)
69. [`tenngoxars/Imago`](https://github.com/tenngoxars/Imago)
70. [`t3-oss/create-t3-app`](https://github.com/t3-oss/create-t3-app) (esp. the `@vercel/og` PR #1435)
