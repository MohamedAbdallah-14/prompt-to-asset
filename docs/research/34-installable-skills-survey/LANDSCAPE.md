---
wave: 2
role: landscape-survey
slug: 34-installable-skills-survey
title: "Installable Skills Survey — Image, Video, Audio, Diagram, and Asset Generation"
date: 2026-04-20
scope: "Claude Code, Cursor, Codex, Windsurf, Gemini CLI, Cline, Zed"
---

> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.

# Installable Skills Survey — Image, Video, Audio, Diagram, and Asset Generation

## Overview

The landscape of installable skills for AI coding assistants exploded between late 2024 and early 2026. The central pattern across every major collection is identical: a `SKILL.md` file (YAML frontmatter + markdown body) tells the host agent when to activate, then invokes a CLI, SDK call, or MCP tool that forwards the request to a hosted API. The agent layer is thin — routing logic, not generation logic.

As of April 2026, three registries dominate media generation skills:

1. **VoltAgent/awesome-openclaw-skills** (46.6k stars) — largest open skill registry with 171 dedicated image generation skills across Stable Diffusion, Flux, SDXL, and comfy-node pipelines.
2. **ComposioHQ/awesome-claude-skills** (55k stars) — largest Claude Code-specific collection, dominated by productivity and coding skills but with a growing media subdirectory.
3. **hesreallyhim/awesome-claude-code** (39.8k stars) — curated catalog of rules, skills, hooks, and plugins; the most-referenced discovery surface for Claude Code users.

The official registries (**openai/skills**, **fal-ai-community/skills**) are smaller but authoritative. The OpenAI skills repo (17.1k stars) sets the reference format for Codex skills. The fal.ai community skills repo (11 media skills) is the canonical example of a hosted-API skill that chains image, video, 3D, and audio generation behind a single SDK.

The **punkpeye/awesome-mcp-servers** list (85.1k stars) is a parallel ecosystem — MCP servers rather than SKILL.md packages — but the two ecosystems are converging: by 2026 most skill packages include an MCP server block in their plugin manifests.

**The media-generation gap is real.** Despite thousands of registered skills, production-grade asset generation — with routing, matting, vectorization, platform packaging, and validation — is unaddressed in any existing collection. The existing skills route one prompt to one API and return one file. None implement transparency routing, safe-zone validation, or multi-format export bundles.

---

## All Skills Surveyed

The table covers repositories with confirmed media-generation skills (image, video, audio, diagram, 3D, or asset). Repositories that are purely coding or productivity are excluded. Stars are as of the discovery date (2026-04-20).

| Collection | Repo | Stars | Type | Provider(s) | Generates |
|---|---|---|---|---|---|
| awesome-claude-skills | ComposioHQ/awesome-claude-skills | 55k | SKILL.md registry | Varies | Coding, productivity, image (subdirectory) |
| awesome-claude-code | hesreallyhim/awesome-claude-code | 39.8k | Curated catalog | Varies | Rules, skills, hooks, plugins; media subsection |
| awesome-openclaw-skills | VoltAgent/awesome-openclaw-skills | 46.6k | SKILL.md registry | SD/Flux/SDXL/ComfyUI | 171 image generation skills |
| openai/skills | openai/skills | 17.1k | Official Codex skills | OpenAI APIs | Image (DALL-E 3 / gpt-image-1), code, web |
| awesome-agent-skills | VoltAgent/awesome-agent-skills | 16.4k | Multi-agent registry | Multiple | Coding, browser, image, data |
| fal-ai-community/skills | fal-ai-community/skills | ~2k | Official fal.ai skills | fal.ai | Image, video, audio, 3D (11 skills) |
| nano-banana-2-skill | kingbootoshi/nano-banana-2-skill | 347 | Single Claude skill | Google AI Studio / Gemini Flash Image | Text-to-image (free tier) |
| OpenMontage | calesthio/OpenMontage | 2.7k | Multi-skill app | OpenAI + fal.ai | Video montage from image sequences |
| awesome-mcp-servers | punkpeye/awesome-mcp-servers | 85.1k | MCP server catalog | Multiple | Image, video, audio, diagram MCPs |
| agent_skills_directory | dmgrok/agent_skills_directory | ~400 | Cross-IDE skill index | Multiple | ~250 skills, 41 providers, includes media |
| mcp_mother_skills | dmgrok/mcp_mother_skills | ~300 | MCP meta-installer | Multiple | Detects stack, installs matching skills |
| alirezarezvani/claude-skills | alirezarezvani/claude-skills | ~900 | Claude skill library | Multiple | 156+ skills with per-target adapters |
| awesome-cursorrules | PatrickJS/awesome-cursorrules | 48k | Cursor rules | None (rules only) | No generation; context injection |
| agentskills.my | agentskills.my | spec | Open standard | — | SKILL.md specification body |
| awesome-mcp-servers (Cursor dir.) | cursor.directory | 73.7k members | MCP registry | Multiple | Image, video generation MCPs |
| smithery.ai | smithery.ai | 7k+ servers | Hosted MCP registry | Multiple | Image, video MCPs (routed) |

> **Updated 2026-04-21:** Smithery registry crossed 7,000 servers as of April 2026 (up from ~6,000 in March 2026). Servers can be installed locally via the Smithery CLI or run as hosted remote servers on Smithery's infrastructure. The registry has clean app-store UI, keyword search, and one-command install.

### Media Skills Detail — fal-ai-community/skills

The most directly relevant collection for prompt-to-asset. All 11 skills are thin wrappers around `@fal-ai/client`:

| Skill name | Model(s) | Output |
|---|---|---|
| flux-pro | Flux.1 Pro | 1024² JPEG/PNG |
| flux-dev | Flux.1 Dev | 1024² JPEG/PNG |
| flux-schnell | Flux.1 Schnell (fast/free) | 512/1024 PNG |
| sdxl | Stable Diffusion XL | 1024² PNG |
| sd3 | SD3 Medium | 1024² PNG |
| kling-video | Kling 1.6 | MP4 video (5–10s) |
| sora-fal | OpenAI Sora via fal | MP4 video |
| veo-fal | Google Veo via fal | MP4 video |
| elevenlabs-fal | ElevenLabs via fal | MP3 audio |
| triposr | TripoSR | GLB 3D mesh |
| wonder3d | Wonder3D | multi-view PNG + GLB |

### Media Skills Detail — VoltAgent/awesome-openclaw-skills (171 image skills)

Organized into clusters: SDXL-lightning (instant generation), SD 1.5 specialized (anime, portrait, architecture), Flux family (text-to-image, inpaint, img2img, redux), ComfyUI workflow wrappers (ControlNet, LoRA, IP-Adapter), and upscaling/refinement (RealESRGAN, SUPIR, CCSR). None implement asset routing logic, transparency matting, or platform packaging.

### Media Skills Detail — openai/skills (official)

Four image-relevant skills: `text-to-image` (gpt-image-1), `edit-image` (gpt-image-1 inpaint), `create-variation`, and `analyze-image`. Format: `SKILL.md` + a `scripts/run.ts` that calls the OpenAI Responses API with `output_format: "png"`. No post-processing beyond saving the returned bytes.

### Media Skills Detail — kingbootoshi/nano-banana-2-skill

A single SKILL.md that wraps the Gemini Flash Image API via the `@google/genai` npm package. Key design decision: `GEMINI_API_KEY` is the only required env var. The free tier of Google AI Studio historically covered ~1500 images/day — that quota was withdrawn in December 2025. As of April 2026 this skill requires a billed project. Trigger phrases: "generate an image", "create an illustration", "make a picture of". No post-processing. Returns the raw model output URL. 347 stars as of discovery; likely the most-copied single skill for "zero-API-cost image generation" (now a misnomer — see free tier table in SYNTHESIS.md).

> **Updated 2026-04-21:** Gemini free image-gen quota removed December 2025. Active model as of April 2026: `gemini-3.1-flash-image-preview`. Dead model (do not use): `gemini-3-pro-image-preview` (shut down March 9, 2026). For zero-key programmatic generation, route to Cloudflare Workers AI, HF Inference, or Pollinations instead.

---

## Top 10 Most Relevant for prompt-to-asset

Ranked by (a) architectural overlap with prompt-to-asset's pipeline, (b) quality of post-processing, and (c) provider breadth.

| Rank | Skill / Collection | Why relevant | Gap it fills or leaves |
|---|---|---|---|
| 1 | **fal-ai-community/skills** | Only collection covering image + video + audio + 3D in one SDK. fal.ai routing table maps cleanly to prompt-to-asset's provider abstraction. | No routing logic, no matting, no SVG output, no platform bundles. |
| 2 | **kingbootoshi/nano-banana-2-skill** | Proves the "zero-key image generation" UX — Google AI Studio free tier. Pattern for our `nano-banana` skill. | No asset routing, no transparency, no validation, no format export. |
| 3 | **openai/skills** | Official format reference and `gpt-image-1` integration. Only official skill with `background:"transparent"` support. | No routing, no matte, no SVG. One model only. |
| 4 | **calesthio/OpenMontage** | Multi-step video generation pipeline — image sequence → video via fal.ai / OpenAI. Shows how to chain skills for temporal media. | Image-only inputs; no asset classification; no validation. |
| 5 | **VoltAgent/awesome-openclaw-skills (Flux cluster)** | 40+ Flux skills covering Pro/Dev/Schnell/Kontext/Redux. Prompt dialect and parameter map are extracted and reusable. | No routing, no matting. fal.ai or Replicate API required for each. |
| 6 | **dmgrok/agent_skills_directory + mcp_mother_skills** | Cross-IDE install pattern (detects Claude/Cursor/Codex/Copilot, writes to correct location). Reference for our `install.sh` | Skills installed are thin wrappers; media skills lack post-processing. |
| 7 | **hesreallyhim/awesome-claude-code** | Discovery surface; tracks the most-starred real-world Claude Code skills and rules. Source of ground truth on what users actually install. | Catalog only; no skill code. |
| 8 | **punkpeye/awesome-mcp-servers (image MCPs)** | Surfaces which MCP servers already exist for image generation — avoids reinventing. Key entries: `replicate-mcp`, `fal-mcp`, `openai-mcp`, `recraft-mcp`. | MCP servers, not SKILL.md. Integration requires plugin.json wiring. |
| 9 | **VoltAgent/awesome-openclaw-skills (upscaling cluster)** | RealESRGAN and SUPIR skill implementations show fal.ai upscale endpoint wiring — directly useful for our `asset_upscale_refine` tool. | No safe-zone or alpha validation post-upscale. |
| 10 | **alirezarezvani/claude-skills (156+ skills)** | Largest single-author Claude skill library; media section includes ComfyUI, Midjourney-prompt helpers, and image-editing flows. | Mixed quality; per-target adapter scripts drift; no pipeline abstraction. |

---

## New Skill/Plugin Marketplaces (2025–2026)

> **Updated 2026-04-21:** Several marketplaces and distribution surfaces have launched or reached maturity since this document was first written.

| Surface | URL | Notes |
|---|---|---|
| **skills.sh** (Vercel) | https://skills.sh | Official directory and leaderboard for agent skill packages. Launched January 20, 2026. Tracks real install counts across 90k+ skills. Supports 19 agents including Claude Code, Cursor, Codex, Gemini CLI, Copilot. |
| **Smithery** | https://smithery.ai | 7,000+ MCP servers as of April 2026 (up from ~6k in March). Clean app-store UI, hosted remote servers, one-command install via `npx @smithery/cli install <name>`. |
| **vercel-labs/skills CLI** | `npx skills` | v1.1.1 as of January 2026, ~14.7k★ on GitHub. `npx skills find` (interactive discovery), `npx skills add <pkg>` (install), `npx skills update` (refresh). The de facto cross-IDE skill package manager. |
| **mcpmarket.com** | https://mcpmarket.com | MCP server marketplace; cross-references with GitHub skill repos. |
| **mdskills.ai** | https://www.mdskills.ai | AI Agent Skills marketplace with install instructions. |
| **claudemarketplaces.com** | https://claudemarketplaces.com | Claude Code plugin/skill/MCP directory, 105k+ monthly visitors. |
| **microsoft/skills** | https://github.com/microsoft/skills | Official Microsoft skills repo for GitHub Copilot — ships MCP servers, custom agents, AGENTS.md, skills for SDKs to ground coding agents. |

**MCP as the unifying skills delivery layer.** As of April 2026, MCP is the common denominator across all major coding assistants: Claude Code, Cursor, Windsurf, Codex, Gemini CLI, and GitHub Copilot all support MCP server registration. The AAIF (Agentic AI Foundation, hosted by Linux Foundation) is the neutral governance body for MCP, with 170+ member organizations as of April 2026 and Mazin Gilbert as permanent Executive Director. SKILL.md (the Anthropic-originated format, adopted as an open standard) is the portable skill description layer on top of MCP.

**SSE transport is deprecated.** The MCP specification (2025-03-26) deprecated SSE in favor of Streamable HTTP for remote server transport. Claude Code supports Streamable HTTP natively. New remote MCP server implementations should use Streamable HTTP, not SSE. SSE still works for backward compatibility but is not recommended for new deployments.

## Files in this Survey

| File | Scope |
|---|---|
| `fal-ai-skills.md` | Deep dive: fal-ai-community/skills (official), idanbeck/claude-skills (fal-video, fal-music, suno, film-maker), RamboRogers/fal-image-video-mcp, ZeroLu, VoltAgent awesome-agent-skills |
| `multi-provider-mcp-servers.md` | MCP servers covering multiple providers (replicate-mcp, fal-mcp, openai-mcp, recraft-mcp) |
| `video-generation-skills.md` | Deep dive: OpenMontage (2.7k stars), idanbeck video+film-maker skills, ZeroLu, plus 12 additional video skill repos and MCP servers. Synthesis of the video skill landscape and recommendation for prompt-to-asset. |

---

## Gaps in prompt-to-asset That External Skills Fill

| Gap | What external skills demonstrate | How to close it in prompt-to-asset |
|---|---|---|
| **Video generation** | OpenMontage + fal-ai kling/sora/veo skills show a working fal.ai → MP4 pipeline including prompt dialect and aspect-ratio params | Add `asset_generate_splash_screen` animation variant; add `video-gen` skill wrapper |
| **Audio generation** | fal-ai-community/skills elevenlabs-fal shows text → MP3 via fal.ai with voice selection and duration control | Add `audio-gen` skill for notification sounds, app intro audio, and brand jingles |
| **3D asset generation** | TripoSR and Wonder3D skills in fal-ai-community demonstrate GLB output; Wonder3D produces multi-view PNGs suitable for app icon parallax | Add `3d-gen` skill; feed Wonder3D output into visionOS 3-layer parallax pipeline |
| **Zero-key image generation** | nano-banana-2-skill proves the Gemini AI Studio free tier UX. Users without any API key can generate ~1500 images/day | Implement `nano-banana` skill with GEMINI_API_KEY only; offer as primary fallback in `external_prompt_only` mode |
| **Flux family coverage** | awesome-openclaw-skills Flux cluster covers Pro/Dev/Schnell/Kontext/Redux with correct fal.ai endpoint IDs and parameter maps | Wire Flux.1 Pro / Kontext into the `api` mode routing table via fal.ai; add `flux` skill |
| **Cross-IDE install UX** | dmgrok/mcp_mother_skills shows detect-and-install; Databricks ai-dev-kit shows `curl \| bash` pattern | Implement `scripts/install.sh` that detects `~/.claude/`, `~/.cursor/`, `~/.gemini/`, `~/.codex/` and writes the correct adapter |
| **Diagram generation** | punkpeye/awesome-mcp-servers includes `mermaid-mcp`, `excalidraw-mcp`, `draw-io-mcp` | Out of scope for prompt-to-asset core, but relevant for a future `diagram-gen` skill |
| **Realtime generation** | fal.ai realtime WebSocket API used in advanced openclaw skills for streaming diffusion | Not yet needed for batch asset generation, but relevant for live preview in a future web UI |

---

## Skills to Build for prompt-to-asset

Based on the survey, five new skills are missing and two existing ones need strengthening:

### New skills (not in current `skills/` tree)

| Priority | Skill name | Trigger | Provider(s) | Key env var | Output |
|---|---|---|---|---|---|
| 1 | `nano-banana` | "quick image", "concept sketch", "draft illustration", "free image" | Gemini Flash Image (Google AI Studio) | `GEMINI_API_KEY` | 1024² PNG (no alpha; use for concept only) |
| 1 | `flux` | "photo-realistic", "hero image", "product photo", "lifestyle shot" | Flux.1 Pro / Flux Kontext via fal.ai | `FAL_KEY` | 1024²–2048² PNG/WebP |
| 2 | `video-gen` | "animate", "motion", "video clip", "splash animation", "app preview" | Kling 1.6 / Veo / Sora via fal.ai | `FAL_KEY` | MP4 (5–10s) |
| 2 | `audio-gen` | "notification sound", "app sound", "brand audio", "jingle", "voice over" | ElevenLabs via fal.ai | `FAL_KEY` or `ELEVENLABS_API_KEY` | MP3 |
| 3 | `3d-gen` | "3D icon", "3D asset", "visionOS icon", "spatial icon", "product 3D" | TripoSR / Wonder3D via fal.ai | `FAL_KEY` | GLB + multi-view PNG |

### Existing skills that need strengthening

| Skill | Current gap | Fix |
|---|---|---|
| `illustration` | No Flux routing; only routes gpt-image-1 and Ideogram | Add Flux.1 Pro branch for "photorealistic illustration" trigger; wire `FAL_KEY` check into `asset_capabilities()` |
| `app-icon` | No visionOS 3-layer output | Add Wonder3D pipeline branch: generate mark → Wonder3D multi-view → layer into visionOS AppIconSet |
