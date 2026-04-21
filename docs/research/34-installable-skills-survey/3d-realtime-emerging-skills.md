---
wave: 2
role: deep-dive
slug: 34-installable-skills-survey/3d-realtime-emerging-skills
title: "3D, Realtime, Remotion, Lottie — Emerging Media Skills Survey"
date: 2026-04-20
scope: "Claude Code, Codex, Cursor, Gemini CLI, Antigravity"
---

# 3D, Realtime, Remotion, Lottie — Emerging Media Skills Survey

This document surveys the emerging skill classes beyond static image generation:
3D mesh generation, sub-second (realtime) diffusion, programmatic video (Remotion, Manim),
and animation authoring (Lottie, Rive, Three.js). For each entry, the documented facts are
the GitHub URL, what it generates, API/provider required, output format, and relevance to
prompt-to-asset.

---

## 1. fal-ai-community/skills — fal-3d

**GitHub URL:** https://github.com/fal-ai-community/skills/blob/main/skills/claude.ai/fal-3d/SKILL.md

> **Updated 2026-04-21:** The default image-to-3D model in the fal-3d skill is now documented as `fal-ai/hunyuan3d-v3/image-to-3d` (HunyuanV3), but fal.ai's pricing page as of April 2026 lists Hunyuan3D at **$0.16/generation** — not $0.375 as stated below. The $0.375 figure may have reflected an earlier preview price or a different endpoint variant. Verify current pricing via `fal-platform/pricing.sh`. TripoSR remains at $0.07/generation and under 0.5s. MCP spec 2025-11-25 is now the Latest Stable; the fal.ai queue API uses Streamable HTTP transport (SSE transport deprecated, backward compat until 30 June 2026).

### What it generates

Text-to-3D and image-to-3D mesh generation via fal.ai's hosted model endpoints.
The skill is a thin bash wrapper (`generate-3d.sh`) that POSTs to a fal.ai queue endpoint
and polls for the resulting GLB file.

### Model endpoints (as documented in SKILL.md)

| Mode | Default model endpoint | Notes |
|---|---|---|
| Image to 3D | `fal-ai/hunyuan3d-v3/image-to-3d` | Tencent HunyuanV3 — film-quality PBR geometry from single or multi-view images |
| Text to 3D | `fal-ai/meshy/v6/text-to-3d` | Meshy v6 — text-prompt to game-ready mesh |

The SKILL.md says "users can discover additional models via the search API." Discoverable
extras include `fal-ai/triposr` (sub-0.5s, $0.07/gen) and `tripo3d/tripo/v2.5/image-to-3d`.
TripoSR and Zero123Plus are available as separate fal.ai model pages but are **not** listed
as defaults in the skill's SKILL.md; Zero123Plus and Wonder3D are not referenced at all
(the INDEX.md entry on Wonder3D in this survey's parent document reflected an earlier
fal-ai-community skill set that has since been replaced by HunyuanV3 as the default).

### API / provider

Requires `FAL_KEY` environment variable. fal.ai account needed.
Generation takes 1–5 minutes — jobs use the queue API, not synchronous calls.

### Output format

- Primary: **GLB** (`model/gltf-binary`) — confirmed by SKILL.md JSON schema
- Meshy export also supports OBJ, FBX, USDZ, STL, BLEND, 3MF (via Meshy dashboard,
  not directly from the skill script)
- HunyuanV3 outputs GLB and OBJ with optional PBR textures
- USD/USDZ: available through Meshy's dashboard; not emitted directly by the skill script

### Supplementary 3D providers covered by companion skills / MCP servers

#### TripoSR (fal.ai hosted)
- URL: https://fal.ai/models/fal-ai/triposr
- Speed: <0.5 seconds per generation (synchronous, not queue)
- Cost: $0.07/generation (~14 images per dollar)
- Output: GLB (default), OBJ with textures
- Input: single image (JPEG, PNG, WebP, GIF, AVIF)
- Use case: rapid game asset prototyping, AR/VR asset pipelines

#### HunyuanV3 (default fal-3d skill model)
- URL: https://fal.ai/models/fal-ai/hunyuan3d-v3/image-to-3d
- Speed: 1–5 minutes (queue API)
- Cost: $0.16/generation as of April 2026 (earlier pricing of $0.375 was a preview rate; verify via `pricing.sh`); PBR and multi-view variants may add additional cost
- Output: GLB, OBJ, PNG thumbnail previews
- Input: single image or multi-view images (front/back/left/right)
- Use case: e-commerce product visualization, film-quality game assets, 3D printing

#### Meshy v6 (text-to-3D default)
- URL: https://www.meshy.ai / MCP server: https://github.com/pasie15/meshy-ai-mcp-server
- API key: `MESHY_API_KEY` from Meshy Dashboard
- Output formats: FBX, OBJ, GLB, USDZ, STL, BLEND, 3MF
- MCP tools: text-to-3D, image-to-3D, multi-image-to-3D, text-to-texture, rigging, animation, remeshing
- Use case: broadest format support, best for game engine pipelines (FBX → Unity/Unreal)

#### Tripo3D (MCP server, not a SKILL.md package)
- MCP directory: https://mcp.directory/servers/tripo-3d
- Integrates: text-to-3D generation + Blender scene manipulation via MCP tools
- Use case: Blender-integrated 3D generation workflow

#### Rodin (Hyper3D)
- Registry entry: https://mcpmarket.com/tools/skills/hyper3d-rodin-3d-generation
- Generates high-quality 3D models from text prompts or 2D images using Hyper3D Rodin Gen-2 API
- Output: GLB

#### OpenSCAD agent (iancanderson/openscad-agent)
- URL: https://github.com/iancanderson/openscad-agent
- Type: Claude Code skill with three slash commands (`/openscad`, `/preview-scad`, `/export-stl`)
- API: None — uses locally installed OpenSCAD binary
- Output: `.scad` source files, PNG previews, STL for 3D printing
- Use case: parametric/programmatic 3D design (not diffusion-based)

#### CadQuery skill (flowful-ai/cad-skill)
- URL: https://github.com/flowful-ai/cad-skill
- Type: Claude Code skill (`/parametric-3d-printing` command)
- API: None — uses Python CadQuery library locally
- Output: parametric `.py` scripts, STL files, 6-view PNG renderings, optional 3MF
- Requirements: Python 3.10–3.12, CadQuery, trimesh, pyrender
- Use case: printable mechanical parts — brackets, enclosures, cases; not organic shapes

### Prompt-to-asset relevance: 3D

**High for visionOS / spatial icons.** The app-icon pipeline for visionOS requires a layered
3D mesh (foreground/background) and currently has no implementation. HunyuanV3 with a plain
background image input + GLB output maps directly onto that gap. TripoSR is the right choice
for speed-first iteration ($0.07, <0.5s); HunyuanV3 for production quality.

**Routing recommendation for prompt-to-asset:**
- Trigger: "3D icon", "visionOS icon", "spatial icon", "3D asset", "product 3D"
- Fast preview: `fal-ai/triposr` (synchronous, $0.07)
- Production: `fal-ai/hunyuan3d-v3/image-to-3d` (queue, $0.375, PBR textures)
- Text-to-3D: `fal-ai/meshy/v6/text-to-3d` when no reference image available
- Output: GLB → pass to visionOS icon layering pipeline
- Key env var: `FAL_KEY`

---

## 2. fal-ai-community/skills — fal-realtime

**GitHub URL:** https://github.com/fal-ai-community/skills/blob/main/skills/claude.ai/fal-realtime/SKILL.md

> **Updated 2026-04-21:** FLUX.2 [klein] release date confirmed as January 15, 2026. The 4B variant is Apache 2.0 (open source) and the 9B variant uses a Qwen3 8B text encoder with 4-step distillation, achieving <0.5s inference at quality matching models 5× larger. Both variants unify text-to-image and image editing natively (no model swap needed). The fal-realtime skill uses WebSocket transport — note that MCP spec 2025-11-25 standardizes Streamable HTTP for remote MCP; the skill's direct WebSocket calls to the fal.ai realtime endpoint are not affected by MCP transport changes.

### What it generates

Sub-second text-to-image generation using synchronous (non-queue) fal.ai WebSocket API.
Designed for interactive applications, live preview, and iterative concept generation
where latency matters more than quality ceiling.

### Model

**FLUX.2 [klein] realtime** — endpoint `fal-ai/flux-2/klein/realtime`

FLUX.2 [klein] was released by Black Forest Labs on January 15, 2026. It is a 4B–9B
parameter flow transformer optimized for sub-second generation.
- 4B parameter variant: Apache 2.0 license (commercially usable)
- 9B variant: 9B flow model + 8B Qwen3 text encoder, 4-step distillation
- Speed: <1 second per image (synchronous WebSocket, no queue overhead); 9B variant achieves <0.5s
- Runs on NVIDIA GB200; fal.ai serves it via serverless GPU

This is distinct from the earlier FLUX.1 [schnell] (also fast, but 1–4 inference steps,
~2–4 seconds) and SDXL Turbo (1-step SDXL, ~1s but lower fidelity). The fal-realtime skill
was updated to use FLUX.2 [klein] as its default after the January 2026 release.

### API / provider

`FAL_KEY` required. The skill script documentation states the key is mandatory but does not
name the env var explicitly — cross-referencing `fal-generate/SKILL.md` confirms `FAL_KEY`.

### Output format

JSON response containing:
```json
{
  "images": [
    {
      "url": "...",
      "content_type": "image/jpeg",
      "width": 1024,
      "height": 1024,
      "seed": 12345,
      "has_nsfw_concepts": false
    }
  ]
}
```
JPEG/PNG at requested dimensions.

### Trigger conditions

"Real-time generation", "Fast generation", "Streaming image", "Instant image",
"Live generation", "Realtime"

### Prompt-to-asset relevance: realtime

**Medium.** The sub-second model is useful for two prompt-to-asset scenarios:

1. **Live concept iteration in a future web UI** — user types a brief, sees image update in
   <1s without submitting a job. Not relevant for the current CLI-only pipeline.
2. **Bulk concept generation for palette exploration** — generate 20 variations of a logo
   mark concept at ~$0.01/image before committing to a higher-quality generation run.

The current prompt-to-asset pipeline is batch/queue-oriented. Realtime adds value only when
a streaming UX surface exists. Mark as a "future UI" dependency, not a current pipeline gap.

---

## 3. fal-ai-community/skills — full skill inventory (as of April 2026)

For completeness, the full skill list from https://github.com/fal-ai-community/skills
(supersedes the partial list in INDEX.md):

| Skill | Purpose | Key model(s) |
|---|---|---|
| fal-generate | Image + video with queue support | nano-banana-pro (default), Veo3.1, Kling 2.6 |
| fal-3d | Text/image → 3D mesh | HunyuanV3, Meshy v6 |
| fal-realtime | Sub-second image generation | FLUX.2 [klein] realtime |
| fal-image-edit | Style, object removal, inpaint | Various fal.ai edit models |
| fal-video-edit | Video remix, upscale, bg removal, audio | Various |
| fal-lip-sync | Talking head, lip sync | Various |
| fal-audio | TTS + STT | Minimax Speech 2.8 Turbo, Whisper |
| fal-upscale | Resolution enhancement | Various upscale models |
| fal-vision | Segment, detect, OCR, describe | Various vision models |
| fal-restore | Deblur, denoise, face restoration | Various |
| fal-tryon | Virtual clothing fitting | Various |
| fal-train | Custom LoRA training | Flux LoRA trainer |
| fal-platform | Pricing, usage, cost estimation | — |
| fal-workflow | Multi-step pipeline creation | — |
| fal-kling-o3 | High-quality photorealistic imagery + video | Kling o3 |

---

## 4. VoltAgent/awesome-openclaw-skills — 3D Model Generation

**GitHub URL:** https://github.com/VoltAgent/awesome-openclaw-skills

The image-and-video-generation category at
https://github.com/VoltAgent/awesome-openclaw-skills/blob/main/categories/image-and-video-generation.md
contains 171 skills. Confirmed 3D-relevant entries:

| Skill slug | Function | Provider / API |
|---|---|---|
| `ai-3d-generator` | Generate detailed 3D models from text | Not specified in catalog |
| `printpal-3d` | 3D models for 3D printing from images or prompts | PrintPal API |
| `sideload-avatar-generator` | 3D avatars (VRM/GLB/MML) from text or images | Sideload.gg |
| `renderful-generation` | Image/video/audio/3D creation with quote-before-generate | Renderful API |
| `find-stl` | Search and download ready-to-print 3D model files | Web scraping (no generation) |
| `age-transformation` | Transform faces across ages | each::sense AI |

**Note on age-transformation:** This is a face-transformation skill using each::sense AI —
not relevant to software asset generation. It appears in the image-and-video category
because the output is a manipulated image. No 3D output. No use case for prompt-to-asset.

The 3D generation skills (`ai-3d-generator`, `printpal-3d`, `sideload-avatar-generator`) in
this registry are catalog entries pointing to external providers. None have a public SKILL.md
with confirmed implementation details. The fal-ai-community fal-3d skill is significantly
better documented and directly usable.

---

## 5. Remotion — Codex Plugin + Claude Code Skills

### Official Remotion Codex Plugin

**GitHub URL:** https://github.com/remotion-dev/codex-plugin

Maintained in the Remotion monorepo (github.com/remotion-dev/remotion) with a mirror at the
above URL. Packaged as an OpenAI Codex plugin, not a SKILL.md package.

**What it generates:**
Remotion is a React-based framework for programmatic video. The Codex plugin provides
structured knowledge for AI-assisted Remotion development — it does not call an external
API or generate video directly. It gives the agent:
- Composition scaffolding
- Best practices across 29 rule domains: animations, timing, audio, captions, 3D, transitions,
  charts, text effects, fonts, and more
- A data-driven "launch-video" workflow template

**Output:** MP4 (via `npx remotion render`), also WebM and GIF through Remotion's renderer.

**Dependencies:**
- Node.js + Bun (build tool)
- Remotion npm packages
- No external API key required for rendering (Remotion is open source)
- Optional: Remotion Lambda for cloud rendering (AWS account)
- Optional: ElevenLabs for audio, Three.js/React Three Fiber for 3D scenes, Mediabunny for
  video metadata, @remotion/captions for subtitles, TailwindCSS for styling

**Setup:** `bun build.mts` to build the plugin, then install per Codex plugin docs.

### Community Remotion Skill (affaan-m/everything-claude-code)

**GitHub URL:** https://github.com/affaan-m/everything-claude-code/blob/main/skills/remotion-video-creation/SKILL.md

- 29 domain-specific rules covering all Remotion topics
- Includes a `rules/lottie.md` rule for embedding Lottie animations inside Remotion
- Trigger: "whenever you are dealing with Remotion code"
- Output: guides the agent to write correct Remotion component code → user runs `npx remotion render`

### wilwaldon/Claude-Code-Video-Toolkit

**GitHub URL:** https://github.com/wilwaldon/Claude-Code-Video-Toolkit

A broader toolkit covering multiple video creation paths:

| Skill | Output | API / Requirements |
|---|---|---|
| Remotion agent | MP4 (React components → video) | Node.js; no external API |
| Manim (Yusuke710) | Math animation MP4 | Cairo, FFmpeg, Python |
| FFmpeg | Encoded MP4 / format normalization | FFmpeg binary |
| YouTube Clipper | Segmented clips with bilingual subtitles | yt-dlp, FFmpeg |

### Prompt-to-asset relevance: Remotion

**Low for core asset pipeline; medium for splash screen animations and app preview videos.**

Remotion is the right tool for:
- App Store preview videos (15s MP4 of UI flows)
- Animated splash screens (timed React component → MP4)
- Onboarding sequence videos

It is not a fit for logo, favicon, app icon, or OG image — those are still raster/vector paths.
The skill requires Node.js in the agent environment and produces output only after `npx remotion render`.
No external API key needed for basic rendering; cloud rendering requires AWS Lambda.

If prompt-to-asset adds a `video-gen` skill, Remotion is an alternative to fal.ai video models
for deterministically rendered, brand-consistent animations. Trade-off: Remotion output is
programmable (editable React code) but requires render time and environment setup; fal.ai
Kling/Veo output is instant but non-editable.

---

## 6. Lottie Animation Skills

### obeskay/lottie-animator-skill

**GitHub URL:** https://github.com/obeskay/lottie-animator-skill

**What it generates:**
Professional Lottie JSON animations from static SVG files. The LLM (Claude) interprets
natural language animation descriptions and emits Lottie-formatted JSON directly —
no external animation API is called. The JSON specifies keyframes, bezier curves, and
layer definitions in the Lottie schema.

**API / provider:** None. Pure LLM generation of Lottie JSON. Works with any Anthropic API
access (Claude Code, Claude.ai Projects, etc.).

**Input:** SVG file + natural language description ("Create a fun rocket launch animation")

**Output:**
- Lottie JSON file (`.json`) with keyframes, bezier easing, layer parenting
- Ready for web (`lottie-web` library), mobile (iOS: `lottie-ios`, Android: `lottie-android`),
  and React (`lottie-react`)

**Supported animation styles:** corporate, organic, bold, cinematic; bounce, wiggle, fade,
rotate, waveform effects

**Limitations:** LLM-generated Lottie JSON is structurally correct but quality depends on
model understanding of Lottie schema. Complex multi-layer animations may require iteration.
Best for simple icon animations (<5 layers), not full motion graphics sequences.

### talknerdytome-labs/wiggle-claude-skill

**GitHub URL:** https://github.com/talknerdytome-labs/wiggle-claude-skill

**What it generates:**
Lottie JSON from static logo files (PNG, SVG, JPG) with automatic GIF and MP4 rendering.
Python-based (100% Python); uses Claude Code's managed Python environment.

**API / provider:** None (local Python). Claude Code for orchestration.

**Output:**
- Lottie JSON animation file (externally referenced assets)
- Rendered GIF
- Rendered MP4
- PNG frame sequences

**Trigger:** "Animate my logo with a bounce entrance effect"

**Workflow:** Analyze logo → define motion design → create Lottie JSON → validate & preview → full render

### LottieFiles/motion-design-skill

**GitHub URL:** https://github.com/LottieFiles/motion-design-skill

**What it generates:**
This is a philosophy/principles skill, not a generation skill. It teaches AI agents to
"think like a motion director" before implementing any animation. Works with any animation
system (CSS, Framer Motion, GSAP, Lottie, Rive, etc.).

**API / provider:** None. Pure instructional guidance.

**Output:** Agent decision framework, animation recipes. Supports 40+ AI agents including
Claude Code and GitHub Copilot.

**Scope:** Disney's 12 principles adapted for UI, 8-step motion checklist, timing tables,
easing presets, motion personality archetypes.

**Prompt-to-asset relevance:** Install this alongside any animation-generating skill as a
quality layer. It guides easing and timing decisions that generic LLM generation misses.

### delphi-ai/animate-skill

**GitHub URL:** https://github.com/delphi-ai/animate-skill

**What it generates:**
React/Next.js animation code based on Emil Kowalski's animation course principles.
Not Lottie — generates CSS transitions, Framer Motion, and React Spring code patterns.

**API / provider:** None. Code generation only.

### awesome-skills/manim-skill

**GitHub URL:** https://github.com/awesome-skills/manim-skill

**What it generates:**
3Blue1Brown-style technical animation videos using ManimCE (Python animation library).
Covers algorithm visualizations, flowcharts, equation derivations, data stories.

**API / provider:** None. Requires locally installed:
- ManimCE v0.19+
- Python (with `uv` package manager)
- FFmpeg (or pyav, bundled)
- TeX/LaTeX (optional; fallback methods provided)

**Output:** MP4 videos (480p preview through 4K60), GIFs, Python source code

**Use cases:** Technical blog animations, educational content, algorithm explainers.
Not for software asset generation — this is content creation.

### Prompt-to-asset relevance: Lottie

**High for logo animation.** The `wiggle-claude-skill` pattern (logo PNG/SVG → Lottie JSON → GIF/MP4)
is directly applicable to prompt-to-asset's `logo` output. Currently prompt-to-asset
produces a static PNG master. Adding a Lottie animation variant for the same logo mark
addresses the "animated logo" use case without any API key requirement.

Recommended approach: After `asset_save_inline_svg` writes the master SVG, optionally call
a Lottie animation pipeline using the SVG as input. The `lottie-animator-skill` pattern
(LLM authors Lottie JSON from SVG) works in `inline_svg` mode — no external API.

---

## 7. Three.js / 3D Web Skills (sickn33/antigravity-awesome-skills)

**GitHub URL:** https://github.com/sickn33/antigravity-awesome-skills

This is the largest multi-IDE skill library with 1,400+ skills. Relevant 3D-web entries:

### threejs-skills

- **Registry listing:** https://playbooks.com/skills/sickn33/antigravity-awesome-skills/threejs-skills
- **Tessl review:** https://tessl.io/registry/skills/github/sickn33/antigravity-awesome-skills/3d-web-experience/review
- **Full SKILL.md:** https://github.com/sickn33/antigravity-awesome-skills/blob/main/skills/threejs-skills/SKILL.md

**What it generates:**
3D scenes and interactive web experiences using Three.js (WebGL). As of April 2026, the
skill was updated to Three.js r183-compatible patterns (modernized from r128-era guidance):
- Modern import maps (`three/addons/`)
- `outputColorSpace` (replaces deprecated `outputEncoding`)
- `Timer` class (replaces `Clock`)
- `setAnimationLoop` (replaces `requestAnimationFrame`)
- WebGPU / TSL awareness

**Output:**
- Complete HTML/JavaScript artifacts with functional 3D scenes
- Reusable code patterns for rotating objects, raycasting, particles
- Performance-optimized Three.js implementations

**API / provider:** None. Pure code generation. WebGL runs in the browser.

**Trigger conditions:** "3D visualizations", "interactive 3D experience", "WebGL rendering",
"3D data visualization", explicit Three.js requests

**Use cases:**
- Portfolio demonstrations and interactive showcases
- Educational 3D visualizations
- Real-time 3D product displays
- Web-based games and immersive experiences

### freshtechbro/claudedesignskills — Full 3D & Animation Inventory

**GitHub URL:** https://github.com/freshtechbro/claudedesignskills

22 skills total organized into 5 bundles. All generate code (no external APIs):

**Core 3D & Animation (5 skills):**
- `threejs-webgl` — Three.js scenes, PBR materials, particle systems
- `react-three-fiber` — R3F declarative 3D for React apps
- `gsap-scrolltrigger` — GSAP scroll-driven animations
- `motion-framer` — Framer Motion for React
- `babylonjs-engine` — Babylon.js for game-grade WebGL

**Extended 3D & Scroll (6 skills):**
- `aframe-webxr` — WebXR / AR / VR web experiences (A-Frame)
- `lightweight-3d-effects` — CSS 3D transforms, simple WebGL effects
- `playcanvas-engine` — PlayCanvas game engine
- `pixijs-2d` — PixiJS 2D WebGL for high-performance 2D
- `locomotive-scroll` — Smooth scroll with parallax
- `barba-js` — Page transitions

**Animation & Components (5 skills):**
- `react-spring-physics` — Physics-based React animations
- `animated-component-libraries` — React Spring, Magic UI, AOS, Anime.js, Lottie
- `scroll-reveal-libraries` — Various scroll-reveal implementations
- `animejs` — Anime.js animation library
- `lottie-animations` — Lottie for vector animation

**3D Authoring & Motion (4 skills):**
- `blender-web-pipeline` — Converts Blender 3D models for web deployment
- `spline-interactive` — Spline interactive 3D editor for web
- `rive-interactive` — Rive interactive motion design tool
- `substance-3d-texturing` — Substance 3D texture workflows

**Meta-Skills (2):**
- `web3d-integration-patterns`
- `modern-web-design`

### Rive (rive-interactive skill)

Rive is an interactive motion design tool producing `.riv` binary animation files and
a WebGL-based Rive runtime. The `rive-interactive` skill from claudedesignskills guides
the agent in authoring Rive-compatible animations for web. Rive differs from Lottie:

| | Lottie | Rive |
|---|---|---|
| Format | JSON | Binary `.riv` |
| Interactivity | Playback only | State machine — responds to user input |
| Runtime | `lottie-web` / native | Rive WebGL / WASM runtime |
| Best for | Loader animations, icon microinteractions | Game-like interactive UI, button animations |
| Authoring | LLM-generatable JSON (simple cases) | Requires Rive editor; not LLM-generatable |

**No confirmed standalone Rive SKILL.md exists** outside the claudedesignskills bundle.
The `rive-interactive` skill generates code for integrating existing `.riv` files into a
web app — it does not generate Rive animation files from scratch.

### Prompt-to-asset relevance: Three.js / 3D web

**Low for the core asset pipeline** (logo, icon, favicon, OG image are 2D outputs).

**Medium for hero images and illustrations** — the `illustration` skill could offer a
Three.js-rendered 3D scene as an alternative to raster generation for product hero images.

**High for visionOS icon parallax** — the 3-layer visionOS icon system (foreground/material/
background) maps to a Three.js parallax stack rendered to a 1024² PNG. This is an
alternative to the TripoSR/HunyuanV3 path: instead of a true GLB mesh, render a 2.5D
parallax effect in Three.js and composite the layers.

---

## 8. Age Transformation (VoltAgent/awesome-openclaw-skills)

**Catalog entry:** https://github.com/VoltAgent/awesome-openclaw-skills/blob/main/categories/image-and-video-generation.md

**Provider:** each::sense AI

**What it does:** Transforms faces across ages in a photograph — de-aging or age-progression
of a human face in an existing image.

**Output:** Manipulated raster image (format not specified in catalog).

**API:** each::sense AI account and API key.

**Prompt-to-asset relevance: None.** This is a portrait manipulation skill with no
application in software asset generation (logo, icon, favicon, OG image, illustration,
splash screen). Included here for completeness per the research brief.

---

## 9. Synthesis — Which Skills to Add to prompt-to-asset

Evaluation criteria:
- A = Direct pipeline gap (adds a missing output format or asset type)
- B = Quality uplift for an existing asset type
- C = Future capability (useful when UI/streaming surface exists)
- X = No fit (out of scope or insufficient quality)

| Skill / Capability | Rating | Rationale |
|---|---|---|
| **fal-3d (HunyuanV3 / TripoSR / Meshy)** | **A** | visionOS icon needs 3D mesh; no current path. Add as `3d-gen` skill with TripoSR for preview and HunyuanV3 for production. `FAL_KEY` required. |
| **fal-realtime (FLUX.2 klein)** | **C** | Sub-second generation is useful only with a streaming web UI. No CLI surface for it now. Revisit when prompt-to-asset adds a web frontend. |
| **Remotion (Codex plugin + community skills)** | **B** | App Store preview videos and animated splash screens. Not a current gap — the `splash_screen` tool handles static frames. Add a `video-gen` skill only if animated splash is explicitly requested. No API key needed. |
| **Lottie — obeskay/lottie-animator-skill** | **A** | Logo animation is a real user request. SVG → Lottie JSON → GIF/MP4 pipeline works in `inline_svg` mode with no API key. Adds animated logo output to the existing logo skill. |
| **Lottie — wiggle-claude-skill** | **A** | Same gap as above; this implementation includes GIF/MP4 render via Python. More production-ready than obeskay's version. Pick one; wiggle-claude-skill's Python render pipeline is stronger. |
| **LottieFiles/motion-design-skill** | **B** | Install as a quality layer alongside the Lottie animation skill. Improves easing and timing decisions. Zero overhead — it is a reasoning guide, not a generator. |
| **Three.js (sickn33/antigravity threejs-skills)** | **B** | Useful for visionOS parallax alternative path and hero image 3D scenes. Low priority until visionOS pipeline is built. |
| **Manim** | **X** | Math animation for educational content. No software asset use case. |
| **OpenSCAD agent / CadQuery skill** | **X** | Parametric CAD for 3D printing. Not a software asset output. |
| **Age Transformation** | **X** | Face manipulation. No application in software assets. |
| **Rive** | **X** | Not LLM-generatable (requires Rive editor). The skill generates integration code, not `.riv` files. |

### Recommended additions

**Priority 1 — Add now (fill confirmed gaps):**

1. **`3d-gen` skill** — wraps fal-3d
   - Trigger: "3D icon", "visionOS icon", "spatial icon", "3D asset", "product 3D mesh"
   - Preview path: TripoSR (`fal-ai/triposr`, synchronous, $0.07, <0.5s) → GLB
   - Production path: HunyuanV3 (`fal-ai/hunyuan3d-v3/image-to-3d`, queue, $0.375, PBR) → GLB
   - Text-to-3D fallback: Meshy v6 (`fal-ai/meshy/v6/text-to-3d`) when no image provided
   - Key: `FAL_KEY`
   - visionOS pipeline: GLB → extract layers → assemble AppIconSet with 3-layer parallax

2. **`lottie-animate` skill** — wraps wiggle-claude-skill pattern + motion-design-skill guidance
   - Trigger: "animate my logo", "logo animation", "animated logo", "bouncing icon", "logo microinteraction"
   - Input: existing SVG master (from `asset_save_inline_svg` output)
   - LLM authors Lottie JSON directly (no API key)
   - Python render pipeline produces GIF + MP4
   - Key: None (LLM generation) or `FAL_KEY` (if routing to fal video for higher quality render)
   - Output: `.json` (Lottie), `.gif`, `.mp4`

**Priority 2 — Add when animated splash / video is explicitly requested:**

3. **`remotion-video` skill** — Remotion knowledge + scaffold
   - Trigger: "app preview video", "animated splash", "product demo video", "App Store video"
   - What it does: scaffolds a Remotion composition, agents fills in brand assets and timing
   - Key: None for local render; AWS for Remotion Lambda cloud render
   - Output: MP4

**Defer:**

- Realtime (fal-realtime / FLUX.2 klein): revisit when web UI ships
- Three.js: revisit when visionOS parallax path is built
- Manim, OpenSCAD, CadQuery, Rive, Age Transformation: out of scope

---

## Sources

- https://github.com/fal-ai-community/skills
- https://github.com/fal-ai-community/skills/blob/main/skills/claude.ai/fal-3d/SKILL.md
- https://github.com/fal-ai-community/skills/blob/main/skills/claude.ai/fal-realtime/SKILL.md
- https://fal.ai/models/fal-ai/triposr
- https://fal.ai/models/fal-ai/hunyuan3d-v3/image-to-3d
- https://fal.ai/models/fal-ai/flux-2/klein/realtime
- https://venturebeat.com/technology/black-forest-labs-launches-open-source-flux-2-klein-to-generate-ai-images-in
- https://github.com/remotion-dev/codex-plugin
- https://github.com/affaan-m/everything-claude-code/blob/main/skills/remotion-video-creation/SKILL.md
- https://github.com/wilwaldon/Claude-Code-Video-Toolkit
- https://github.com/obeskay/lottie-animator-skill
- https://github.com/talknerdytome-labs/wiggle-claude-skill
- https://github.com/LottieFiles/motion-design-skill
- https://github.com/sickn33/antigravity-awesome-skills
- https://github.com/freshtechbro/claudedesignskills
- https://github.com/VoltAgent/awesome-openclaw-skills/blob/main/categories/image-and-video-generation.md
- https://github.com/pasie15/meshy-ai-mcp-server
- https://help.meshy.ai/en/articles/9991884-what-3d-file-formats-do-you-support
- https://github.com/awesome-skills/manim-skill
- https://github.com/iancanderson/openscad-agent
- https://github.com/flowful-ai/cad-skill
