# Flux Image Generation Skills and Antigravity Platform Catalog Survey

**Researched:** 2026-04-20
**Primary sources:** GitHub API (raw content, not guesses)

---

## 1. sickn33/antigravity-awesome-skills — Verified Facts

**Repo:** https://github.com/sickn33/antigravity-awesome-skills
**Stars:** 34,016 (as of research date)
**Skills count:** 1,431 (per README sync header)
**Release:** v10.4.0
**License:** MIT

### What It Is

An installable GitHub library of reusable `SKILL.md` playbooks. Skills are flat directories under `skills/<name>/SKILL.md`. The installer is an npm package invoked as `npx antigravity-awesome-skills`.

### Installation Paths by Tool

| Tool | Install Command | Skills Dir |
|------|----------------|-----------|
| Claude Code | `npx antigravity-awesome-skills --claude` or Claude plugin marketplace | Claude plugin dir |
| Cursor | `npx antigravity-awesome-skills --cursor` | `.cursor/skills/` |
| Gemini CLI | `npx antigravity-awesome-skills --gemini` | `~/.gemini/antigravity/skills` (default) |
| Codex CLI | `npx antigravity-awesome-skills --codex` | Codex skills dir |
| Antigravity | `npx antigravity-awesome-skills --antigravity` | Antigravity dir |
| Kiro CLI | `npx antigravity-awesome-skills --kiro` | Kiro dir |
| Kiro IDE | `npx antigravity-awesome-skills --path ~/.kiro/skills` | Manual path |
| OpenCode | `npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none` | `.agents/skills/` |
| Custom path | `npx antigravity-awesome-skills --path ./my-skills` | User-specified |

The `--category`, `--tags`, and `--risk` flags allow reduced-footprint installs for context-constrained runtimes.

The repo also supports a plugin marketplace route (Claude Code `/plugin marketplace add` / `/plugin install`) for curated distribution, distinct from the full-library install.

### Invoke Pattern (Claude Code)

```text
>> /brainstorming help me plan a feature
Use @security-auditor to review this API endpoint
```

Skills are invoked by name with `@skill-name` in Antigravity and Cursor, and `/skill-name` in Claude Code.

---

## 2. Image and Media Generation Skills Found in Antigravity

### 2a. fal.ai Skills — Sourced from fal-ai-community/skills

The antigravity repo contains stub entries for all fal.ai skills. Each stub has `source:` pointing to `https://github.com/fal-ai-community/skills`. The full content lives in that upstream repo. Content below is from the upstream source, verified by fetching git blobs directly.

**fal-ai-community/skills** contains these image/video generation skills under `skills/claude.ai/`:

| Skill | Description | Version |
|-------|-------------|---------|
| `fal-generate` | Generate images and videos using fal.ai AI models with queue support | 3.0.0 |
| `fal-image-edit` | AI-powered image editing — style transfer, object removal, background changes | 1.0.0 |
| `fal-upscale` | Upscale and enhance image resolution | 1.0.0 |
| `fal-workflow` | Generate production-ready fal.ai workflow JSON files for chaining AI models | 3.0.0 |
| `fal-audio` | Text-to-speech and speech-to-text using fal.ai audio models | — |
| `fal-realtime` | Real-time generation via fal.ai streaming | — |
| `fal-restore` | Image restoration | — |
| `fal-train` | Model training workflows | — |
| `fal-tryon` | Virtual try-on | — |
| `fal-video-edit` | Video editing | — |
| `fal-vision` | Vision/image understanding | — |
| `fal-kling-o3` | Kling O3 image and video generation | 1.0.0 |
| `fal-3d` | 3D generation | — |
| `fal-lip-sync` | Lip sync | — |

#### fal-generate — Key Technical Details

**Architecture:** All requests use a queue system by default.

```
User Request → Queue Submit (REST) → Poll Status → Get Result
```

**Default model in examples:** `fal-ai/nano-banana-pro`

**Model discovery pattern:** The skill does NOT hardcode a specific Flux endpoint. Instead it calls:
```bash
bash search-models.sh --category "text-to-image"
bash search-models.sh --query "flux"
```
or uses the `search_models` MCP tool to discover current best models at runtime.

**Endpoints referenced by name in docs:**
- `fal-ai/nano-banana-pro` (Gemini-based, default example)
- `fal-ai/veo3.1` (video)
- `fal-ai/kling-video/v2.6/pro/image-to-video`
- `fal-ai/flux/dev` (appears in fal-image-edit output examples)
- `fal-ai/flux/dev/image-to-image` (image edit default example)

**Upload flow:** Two-step CDN upload via `rest.alpha.fal.ai/storage/auth/token` → `v3b.fal.media/files/upload`.

**Output format:**
```json
{
  "images": [{ "url": "https://v3.fal.media/files/...", "width": 1024, "height": 768 }]
}
```

**No negative_prompt field documented.** The skill does not use negative prompts at any point.

**API key:** `FAL_KEY` env var. On claude.ai, user must add `*.fal.ai` to allowed domains in capabilities settings.

#### fal-workflow — Key Technical Details

The workflow skill generates JSON files that chain fal.ai models. Critical architecture constraints:
- Only two valid node types: `"run"` and `"display"`. No `"input"` node type.
- No string interpolation inside values — variable references must be the entire value (`"$input.prompt"` is valid; `"prompt: $input.prompt"` is not).
- Input fields are defined in `schema.input` only, not as nodes.
- LLM routing: `openrouter/router` (text only) vs `openrouter/router/vision` (image analysis).

Workflow JSON is deployed and run via the fal.ai platform, not locally.

#### fal-kling-o3 — Key Technical Details

Covers Kling's image and video generation via fal.ai endpoints:

| Endpoint | Tier | Mode |
|----------|------|------|
| `fal-ai/kling-image/o3/text-to-image` | Pro | Text → Image |
| `fal-ai/kling-video/o3/standard/text-to-video` | Standard | Text → Video |
| `fal-ai/kling-video/o3/pro/text-to-video` | Pro | Text → Video |
| `fal-ai/kling-video/o3/standard/image-to-video` | Standard | Image → Video |
| `fal-ai/kling-video/o3/pro/image-to-video` | Pro | Image → Video |

Also supports video edit and remix modes.

### 2b. Google Imagen Skills in Antigravity

**`imagen`** (source: `sanjay3290/ai-skills`)
- Model: `gemini-3-pro-image-preview` (called via Google Gemini API, not Vertex)
- Requires: `GEMINI_API_KEY`
- No transparency support (RGB VAE limitation not documented in the skill itself)
- Script: `python scripts/generate_image.py "prompt" [output_path] [--size 2K]`
- Platforms: Windows, macOS, Linux
- No negative prompt field

**`ai-studio-image`** (source: community, author: renat)
- Primary model: `gemini-2-flash-exp` (free tier)
- Also supports: `imagen-4`, `imagen-4-ultra`, `imagen-4-fast`, `gemini-flash-image`, `gemini-pro-image`
- Humanization pipeline with 5 layers: device/technique, lighting, imperfections, authenticity, environment context
- Two modes: `influencer` (realistic social media photos) and `educacional` (educational/tutorial visuals)
- 20 pre-configured templates (10 influencer + 10 educational)
- Formats: square (1:1), portrait (3:4), landscape (16:9), stories (9:16)
- Humanization levels: `ultra`, `natural` (default), `polished`, `editorial`
- Not Flux; purely Gemini-based. Portuguese-language skill (author is Brazilian).

### 2c. Stability AI Skills in Antigravity

**`stability-ai`** (source: community, author: renat)
- Models: SD 3.5 Large (`/generate/sd3`), Ultra (`/generate/ultra`), Core (`/generate/core`)
- Operations: text-to-image, img2img, upscale (conservative + creative), remove-bg, inpaint, search-replace, erase
- 15 style presets: photorealistic, anime, digital-art, oil-painting, watercolor, pixel-art, 3d-render, concept-art, comic, minimalist, fantasy, sci-fi, sketch, pop-art, noir
- Requires: `STABILITY_API_KEY`
- Rate limit: 150 requests/10s (Community License)
- Uses negative prompts (in contrast to Flux which ignores them)

**`comfyui-gateway`** (source: community, author: renat)
- Production REST API gateway (Fastify + BullMQ) fronting a local or remote ComfyUI server
- Supports any ComfyUI workflow via `{{placeholder}}` template tokens
- Includes three bundled workflow templates:
  - `sdxl_realism_v1`: Photorealistic generation (SDXL base, 1024×1024, 30 steps, cfg 7.0)
  - `sprite_transparent_bg`: Game sprites with alpha (SD 1.5 or SDXL, 512×512)
  - `icon_512`: App icons with optional 2× upscale (SDXL, 512×512, 20 steps, cfg 6.0)
- Storage backends: local disk or S3-compatible
- No specific Flux endpoints; users add their own workflows

**`image-studio`** (source: community, author: renat)
- Router/orchestrator that selects between `ai-studio-image` and `stability-ai`
- Decision matrix: realistic person photos → `ai-studio-image`; art/illustration/editing → `stability-ai`
- No Flux routing in the decision matrix
- Fallback chain: if primary fails, try the other; if both fail, suggest DALL-E / Midjourney / Leonardo

### 2d. Three.js Skills (Antigravity)

The repo contains a full Three.js skill collection sourced from `CloudAI-X/threejs-skills`:

| Skill | Coverage |
|-------|----------|
| `threejs-skills` | Core setup patterns, ES module imports, animation loop |
| `threejs-fundamentals` | Scene, camera, renderer, Object3D hierarchy |
| `threejs-animation` | Keyframe, skeletal, morph targets, animation mixing |
| `threejs-geometry` | BufferGeometry, custom geometry, instancing |
| `threejs-interaction` | Raycasting, OrbitControls, mouse/touch input |
| `threejs-lighting` | Light types, shadows, IBL |
| `threejs-loaders` | GLTF, textures, images, async loading patterns |
| `threejs-materials` | PBR, phong, shader materials |
| `threejs-postprocessing` | EffectComposer, bloom, DOF, screen effects |
| `threejs-shaders` | GLSL, ShaderMaterial, uniforms |
| `threejs-textures` | UV mapping, environment maps, cubemaps, HDR |

These are code-authoring skills (Claude writes Three.js code) rather than image generation skills. Version r183+ import maps are documented.

### 2e. Remotion Skills (Antigravity)

Two distinct Remotion skills:

**`remotion-best-practices`** (source: official `remotion-dev/skills`)
- 27 modular rule files (animations, audio, captions, charts, compositions, fonts, GIFs, images, Lottie, sequencing, Tailwind, text-animations, timing, transitions, trimming, videos, etc.)
- No generation logic — pure best-practice reference
- Source: `https://github.com/remotion-dev/remotion/tree/main/packages/skills`

**`remotion`** (source: community)
- End-to-end workflow: Stitch MCP → screenshot download → Remotion React components → rendered MP4
- Required tools: `stitch:*`, `remotion:*`, `Bash`, `Read`, `Write`, `web_fetch`
- Generates `ScreenSlide.tsx`, `WalkthroughComposition.tsx`, transition effects
- Render command: `npx remotion render WalkthroughComposition output.mp4`
- Not an image generation skill — video composition from app screenshots

### 2f. StyleSeed Skills (Antigravity)

Full collection from `bitjaru/styleseed` (Toss-style UI design system):

| Skill | Purpose |
|-------|---------|
| `ui-setup` | Interactive setup wizard — brand color, typography, first screen scaffold |
| `ui-page` | Scaffold new mobile-first page using Toss layout patterns |
| `ui-component` | Generate UI component following StyleSeed conventions |
| `ui-pattern` | Generate reusable UI patterns (card sections, grids, lists, forms) |
| `ui-tokens` | Manage design tokens — JSON, CSS variables, dark-mode sync |
| `ui-a11y` | WCAG 2.2 AA audit and accessibility fixes |
| `ui-review` | Review UI code for StyleSeed compliance, mobile ergonomics, spacing |
| `ux-audit` | Audit against Nielsen heuristics using StyleSeed context |
| `ux-copy` | Generate UX microcopy in Toss-inspired voice |
| `ux-feedback` | Add loading/empty/error/success states to components |
| `ux-flow` | Design user flows using progressive disclosure, hub-and-spoke navigation |

These are code-authoring skills for React/TypeScript UIs, not image generation. StyleSeed is based on the Toss design language (Korean fintech). Tokens live in `css/theme.css`.

### 2g. Favicon Skill (Antigravity)

**`favicon`** (source: community, author: Shpigford)
- Requires: ImageMagick v7+
- Takes a source image → generates: `favicon.ico` (16/32/48 multi-res), `favicon-96x96.png`, `apple-touch-icon.png` (180×180), `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `favicon.svg` (if source is SVG)
- Also generates/updates `site.webmanifest`
- Framework detection for output path: Rails, Next.js, Gatsby, SvelteKit, Astro, Hugo, Jekyll, Vite, CRA, Vue CLI, Angular, Eleventy, Static HTML
- Updates `app/views/layouts/application.html.erb` (Rails), `app/layout.tsx` (Next.js), or `index.html` (static)
- Not AI image generation — ImageMagick resizing only

---

## 3. Flux-Specific Skills (Searched GitHub)

No standalone Flux-branded `SKILL.md` repo found with significant adoption. Flux appears as a model option inside broader image generation skills. Findings per source:

### 3a. K-Dense-AI/claude-scientific-writer — generate-image skill

**Source:** https://github.com/K-Dense-AI/claude-scientific-writer
**Skill trigger:** scientific image generation, photo, illustration, concept art

**Models via OpenRouter:**
- `google/gemini-3-pro-image-preview` (default — high quality, supports generation + editing)
- `black-forest-labs/flux.2-pro` (fast, high quality, generation + editing)
- `black-forest-labs/flux.2-flex` (cheaper, generation only)

**API routing:** All via OpenRouter, not BFL API directly. Requires `OPENROUTER_API_KEY`.

**Flux dialect notes in the skill:**
- No negative prompt guidance
- No mention of natural language vs tag-salad distinction
- Script uses base64 encoded input for image editing with both Gemini and Flux.2 Pro

**Critical prompt note:** Skill explicitly instructs: do not include layout descriptions, font/color specifications, or metadata in generated images (to prevent meta-text rendering).

**Output:** PNG saved as `generated_image.png` in current directory.

### 3b. shipdeckai/claude-skills — image-gen plugin

**Source:** https://github.com/shipdeckai/claude-skills
**Install:** `/plugin marketplace add shipdeckai/claude-skills` then `/plugin install image-gen@claude-skills`

**Supported providers (10 total):**

| Provider | API Var | Best For |
|----------|---------|----------|
| OpenAI (gpt-image-1.5) | `OPENAI_API_KEY` | Text rendering, versatile |
| BFL / FLUX.2 | `BFL_API_KEY` | Photorealism, 4K, multi-reference |
| Stability AI (SDXL) | `STABILITY_API_KEY` | Controlled generation, img2img |
| Ideogram v3 | `IDEOGRAM_API_KEY` | Typography, logos, text-in-image |
| Google Gemini (Imagen 4) | `GEMINI_API_KEY` | Multi-image composition |
| FAL (FLUX.2) | `FAL_API_KEY` | Fast iterations, FLUX.2 models |
| Leonardo | `LEONARDO_API_KEY` | Artistic, fantasy, game assets |
| Recraft v3 | `RECRAFT_API_KEY` | #1 ELO ranked, vector output |
| Replicate | `REPLICATE_API_TOKEN` | Open-source models, FLUX.2 |
| ClipDrop | `CLIPDROP_API_KEY` | Post-processing only |

**BFL (Flux) implementation details (from CLAUDE.md):**
- Default model: `flux-2-pro` (state-of-the-art quality, 8 reference images)
- Also available: `flux-2-flex` (configurable steps, best text), `flux1.1-pro`, `flux1.1-pro-ultra` (4MP)
- Max dimensions: 2048×2048
- Aspect ratios: 3:7 to 7:3 (flexible)

**FAL (Flux) implementation details:**
- Default model: `flux-2-pro` (maximum quality, exceptional photorealism)
- Also available: `flux-2-flex` (better text rendering), `flux-realism`, `flux-pro`, `fast-sdxl`
- Speed: 2-10s (fast) to sub-second for legacy models

**Replicate (Flux) implementation details:**
- Default model: `black-forest-labs/flux-2-pro`
- Also available: `flux-2-dev`, `flux-2-flex`, `flux-1.1-pro`, `flux-kontext-pro`, `flux-schnell`
- Max dimensions: 2048×2048

**Provider selection logic (SKILL.md):**
```
Text/logos/typography → ideogram or recraft
Photorealism → bfl or stability
Fast iterations → fal
General purpose → openai
Image editing → openai, stability, bfl, gemini, clipdrop
```

**Architecture:** TypeScript CLI tool invoked by Claude Code via SKILL.md trigger. Claude calls:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/cli.bundle.cjs generate --prompt "..." [--provider auto] [--width 1024] [--height 1024]
```

Output goes to `.image-gen/` directory as PNG files, returned as JSON with file paths.

**No Flux-specific prompt dialect guidance** in the skill itself. The CLAUDE.md technical reference documents provider strengths but does not give Flux-specific prompt writing instructions.

### 3c. deapi-ai/claude-code-skills — deapi skill

**Source:** https://github.com/deapi-ai/claude-code-skills
**Install:** `git clone` then `cp -r deapi ~/.claude/skills/`
**API:** deapi.ai (decentralized GPU network, up to 20× cheaper than OpenAI/Replicate)

**Flux models used for `/generate-image`:**

| Model | Slug | Steps | Max Size |
|-------|------|-------|----------|
| FLUX.2 Klein 4B | `Flux_2_Klein_4B_BF16` | 4 (fixed) | 1536px (step: 16) |
| Flux.1 Schnell | `Flux1schnell` | 1-10 (default: 4) | 2048px (step: 128) |

**Notes:**
- `Flux_2_Klein_4B_BF16` has no guidance scale and no negative prompt
- `Flux1schnell` has a negative prompt field (but Flux Schnell ignores it in practice)
- Also supports `Flux_2_Klein_4B_BF16` for image editing with up to 3 images max
- Async API: submit job → poll every 10s → fetch from `result_url`

### 3d. fal.ai generate-image — Flux Endpoints Referenced

From `fal-generate` SKILL.md (source: fal-ai-community/skills), the skill references Flux via:
- `fal-ai/flux/dev` (appears in fal-image-edit output example output)
- `fal-ai/flux/dev/image-to-image` (image editing default)
- Runtime model discovery via `bash search-models.sh --query "flux"` rather than hardcoded endpoints

The skill does not specify Flux prompt dialect. It recommends fetching the OpenAPI schema per model to discover exact parameters:
```
https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/flux/dev
```

---

## 4. Ideogram Skills (Searched GitHub)

No dedicated Ideogram `SKILL.md` skill found as a standalone repo. Ideogram appears as a provider option in multi-provider tools:

- **shipdeckai/image-gen plugin:** `IDEOGRAM_API_KEY`, default model `V_3`, supports Generate/Remix/Edit/Reframe/Replace Background/Face Swapping, 50+ style presets. Best for typography, logos, posters, text-in-image.
- **designrique/ai-graphic-design-skill:** Documents Ideogram (v3 Turbo) in its routing table as a text rendering option with `style: "transparent"` capability for transparent backgrounds.

---

## 5. Midjourney Skills (Searched GitHub)

### 5a. inbharatai/claude-skills — midjourney-prompter

**Source:** https://github.com/inbharatai/claude-skills
**Stars:** 6
**Content quality:** Thin auto-generated template

The `midjourney-prompter` SKILL.md in this repo is a scaffolded stub with placeholder content. It does not contain actual Midjourney prompt engineering guidance (no v6 parameters, no `--sref`, no `--ar`, no style vocabulary). The description says "Engineer Midjourney prompts — style references, aspect ratios, negative prompts, and v6 parameter tuning" but the body is boilerplate from a skill generator template.

### 5b. inbharatai/claude-skills — stable-diffusion-helper

Same situation: auto-generated stub. Description: "Craft Stable Diffusion prompts — SDXL, LoRAs, ControlNet hints, and ComfyUI workflow design." Body is generic boilerplate with no actual SD/SDXL/LoRA content.

### 5c. designrique/ai-graphic-design-skill — Midjourney section

This skill (https://github.com/designrique/ai-graphic-design-skill) is the most substantive Midjourney reference found. It documents:
- Midjourney artistic vocabulary prompting
- `--sref` (style reference), `--cref` (character reference), `--seed` parameters
- Moodboard techniques for visual consistency
- IP-safe use considerations (risk matrix: Firefly vs Midjourney vs SD)

---

## 6. YouMind-OpenLab nano-banana-pro-prompts-recommend-skill

**Source:** https://github.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill
**Install:**
```bash
npx skills i YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill
clawhub install nano-banana-pro-prompts-recommend  # OpenClaw
```
**Platforms:** claude-code, openclaw, cursor, codex, gemini-cli

**What it does:** Searches a live library of 10,000+ curated Nano Banana Pro (Google Gemini image model) prompts and returns top 3 matches with sample images. Updated twice daily via GitHub Actions.

**Model scope:** Primary target is Nano Banana Pro (Gemini). The skill explicitly states prompts "also work with Nano Banana 2, Seedream 5.0, GPT Image 1.5, Midjourney, DALL-E 3, Flux, and Stable Diffusion."

**Data architecture:**
- References fetched post-install from GitHub: `references/manifest.json` + category JSON files
- Categories are dynamic — must read manifest to get current list
- Each prompt entry has `sourceMedia[]` — the skill requires sample images be shown with every recommendation

**Key constraint:** Every recommendation must include the sample image from `sourceMedia[0]`. Prompts without images are skipped.

---

## 7. Summary of Findings

### What Exists in the Wild

**Highest quality multi-provider image skill:**
`shipdeckai/claude-skills` (image-gen plugin) — 10 providers, TypeScript CLI, intelligent routing, automatic fallback chains, production-grade architecture. Uses BFL API directly for Flux (`BFL_API_KEY`).

**Best fal.ai integration:**
`fal-ai-community/skills` (fal-generate v3.0.0) — queue-based, runtime model discovery, covers all fal.ai model categories. Flux is available via `fal-ai/flux/dev` but not the only model; skill recommends searching at runtime.

**Flux via OpenRouter:**
`K-Dense-AI/claude-scientific-writer` generate-image skill — thin skill, uses `black-forest-labs/flux.2-pro` and `flux.2-flex` via OpenRouter. No Flux-specific prompt dialect guidance.

**Flux via decentralized GPU:**
`deapi-ai/claude-code-skills` — uses `Flux_2_Klein_4B_BF16` (4 steps fixed, no guidance) and `Flux1schnell` via deapi.ai. 10–20× cheaper than direct API.

### What Does Not Exist

No skill repo was found that:
- Provides Flux-specific prompt dialect guidance (natural language prose vs. tag salad)
- Documents the "no negative_prompt" constraint for Flux
- Implements the Flux Kontext inpainting/editing workflow as a standalone skill
- Handles transparent background routing (Flux → BiRefNet pipeline)

The CLAUDE.md in this project captures these constraints in the routing table (`data/routing-table.json` reference), but no installable community skill addresses them.

### Flux Dialect Reality Across Skills

None of the surveyed skills provide explicit Flux prompt dialect guidance. The closest to awareness:
- `deapi-ai`: Documents that `Flux_2_Klein_4B_BF16` has no guidance scale and no negative prompt
- `shipdeckai/image-gen`: CLAUDE.md states BFL is "best for photorealism" but no prompt writing guidance
- `fal-generate`: Recommends fetching the model OpenAPI schema to discover parameters per model

### antigravity Skill Quality Assessment

The antigravity repo quality varies significantly:
- **High quality:** fal.ai skills (from fal-ai-community upstream), Three.js skills, Remotion best-practices, StyleSeed skills, favicon skill, comfyui-gateway
- **Medium quality:** imagen, ai-studio-image, stability-ai (all functional with real implementation details but written by one community author with hardcoded Windows paths like `C:\Users\renat\...`)
- **Low quality (stubs):** imagen and ai-studio-image have a related listing with quality content, but the main bulk of antigravity skills for other domains are auto-generated stubs with placeholder content

The fal.ai skills in antigravity are thin wrappers that just point to the upstream source. The full implementation is in `fal-ai-community/skills`.

---

## 8. Relation to prompt-to-asset Routing

The `asset_*` MCP tool surface in this repo is differentiated from all surveyed skills in these ways:

1. **Transparency routing** — None of the surveyed skills route transparent background requests to appropriate models (`gpt-image-1` with `background: "transparent"`, Ideogram 3 Turbo with `style: "transparent"`, or BiRefNet post-processing). This is a gap the prompt-to-asset server addresses.

2. **Text rendering routing** — None route text-containing assets away from diffusion samplers to Ideogram/gpt-image-1.

3. **Validation pipeline** — No surveyed skill includes tier-0 deterministic checks (dimensions, alpha channel, FFT checkerboard detection, safe-zone bbox, OCR Levenshtein).

4. **SVG inline mode** — No surveyed skill authors SVG inline and saves via a round-trip endpoint. The closest is `designrique/ai-graphic-design-skill` which discusses Recraft-based vectorization and manual SVG cleanup but does not implement it as an automated pipeline.

5. **Platform bundle generation** — The `favicon` skill from antigravity is the nearest analog (generates iOS/Android/PWA size variants from a source image), but uses ImageMagick resize only with no AI generation or validation.
