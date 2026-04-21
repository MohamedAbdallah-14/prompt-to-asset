---
wave: 2
role: deep-dive
slug: 34-installable-skills-survey/video-generation-skills
title: "Video Generation Skills — Installable Packages for Claude Code and Peer Agents"
date: 2026-04-20
scope: "OpenMontage, idanbeck/claude-skills, ZeroLu, and the broader ecosystem"
sources:
  - https://github.com/calesthio/OpenMontage
  - https://github.com/idanbeck/claude-skills
  - https://github.com/ZeroLu/Ultimate-AI-Media-Generator-Skill
  - https://github.com/SamurAIGPT/Generative-Media-Skills
  - https://github.com/AKCodez/higgsfield-claude-skills
  - https://github.com/yuvalsuede/agent-media-skill
  - https://github.com/fltman/claude-code-skill-sora-video
  - https://github.com/hirakawat-hmp/claude-plugin-kie
  - https://github.com/antbald/kie-ai-skill
  - https://github.com/krusemediallc/claude-code-ai-ad-builder-kie-ai
  - https://github.com/dennisonbertram/claude-media-skills
  - https://github.com/deapi-ai/claude-code-skills
  - https://github.com/vargHQ/skills
  - https://github.com/doctorm333/promptpilot-mcp-server
  - https://github.com/burningion/video-editing-mcp
  - https://github.com/raveenb/fal-mcp-server
---

# Video Generation Skills — Installable Packages for Claude Code and Peer Agents

Survey date: 2026-04-20. All data fetched from live GitHub URLs.

---

## 1. The Three Focal Repos

### 1.1 calesthio/OpenMontage (2,700 stars)

**What it is.** A full agentic video production system, not a single skill. It ships 52 executable tools, 124+ markdown skill files, 12 pipeline YAML manifests, two composition runtimes (Remotion + HyperFrames), and a zero-cost demo mode — all orchestrated by a Claude Code (or Cursor / Copilot / Windsurf / Codex) agent reading a mandatory `AGENT_GUIDE.md`.

**Install.**
```bash
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage
make setup          # pip install -r requirements.txt + npm install in remotion-composer/
make install-gpu    # optional: local GPU inference (WAN 2.1, Hunyuan, CogVideo, LTX-Video)
```
Platform adapters are auto-written to `CLAUDE.md`, `CURSOR.md`, `COPILOT.md`, `CODEX.md`, `.windsurfrules`.

**API keys — all optional.** Zero-key mode uses Piper TTS, Pexels / Pixabay / Wikimedia stock, Remotion, and FFmpeg for free. Paid providers unlock via env vars:

| Env var | Provider | Unlocks |
|---|---|---|
| `FAL_KEY` | fal.ai gateway | Kling, Veo 3.1, MiniMax, Recraft, Runway via FAL |
| `OPENAI_API_KEY` | OpenAI | Sora 2, DALL-E 3, OpenAI TTS |
| `GOOGLE_API_KEY` | Google | Veo 3, Imagen 3, Google TTS (700+ voices) |
| `ELEVENLABS_API_KEY` | ElevenLabs | Premium TTS, Music, SFX |
| `RUNWAY_API_KEY` | Runway | Runway Gen-4 direct |
| `HEYGEN_API_KEY` | HeyGen | Avatar / lip-sync videos |
| `SUNO_API_KEY` | Suno | AI music (up to 8 min) |
| `PEXELS_API_KEY` | Pexels | HD stock footage |
| `PIXABAY_API_KEY` | Pixabay | Free stock footage |

**Video providers (14 total).**

| Provider | Mode | Notes |
|---|---|---|
| Kling (various versions) | T2V + I2V | Via FAL gateway |
| Runway Gen-4 | T2V + I2V | Direct API or FAL |
| Google Veo 3 | T2V | Via FAL or Google API |
| Grok Imagine Video (xAI) | T2V | Via FAL |
| Higgsfield | I2V | Via FAL |
| MiniMax | T2V + I2V | Via FAL |
| HeyGen | Avatar / lip-sync | Direct API |
| WAN 2.1 | T2V + I2V | Local GPU only |
| Hunyuan Video | T2V | Local GPU only |
| CogVideo | T2V | Local GPU only |
| LTX-Video | T2V | Local GPU only |
| Pexels | Stock footage search | Free-tier key |
| Pixabay | Stock footage search | Free-tier key |
| Wikimedia Commons | Archive footage | No key |

**Image providers (10).** FLUX, Google Imagen 3, Grok Imagine, DALL-E 3, Recraft, Stable Diffusion (local), Pexels, Pixabay, Unsplash, ManimCE (math animations).

**TTS providers (4).** ElevenLabs, Google TTS, OpenAI TTS, Piper (local/offline/free).

**Duration / resolution control.** Duration and resolution are set per pipeline stage via the scene plan artifact. The Remotion engine handles resolution and frame-rate programmatically; FFmpeg encodes the final output. The `provider_scoring` heuristic weights task fit (30%), quality (20%), and cost (10%) to auto-select a provider given the scene plan.

**Output handling.** Each run creates a project workspace:
```
projects/<project-name>/
├── artifacts/     (JSON: brief, script, scene_plan, asset_manifest, edit_decisions, render_report)
├── assets/images/, video/, audio/, music/
└── renders/final.mp4
```
Post-render: `ffprobe` validation, frame extraction, audio analysis, promise verification.

**Pipelines (12).**
Animated Explainer, Animation, Avatar Spokesperson, Cinematic, Clip Factory, Documentary Montage, Hybrid, Localization & Dub, Podcast Repurpose, Screen Demo, Talking Head, (unlisted 12th).

**Estimated costs.** $0.15–$3.00 per production depending on provider mix and video length. Budget cap default: $10. Per-action approval thresholds configurable.

**Architecture pattern.** Three-layer instruction system: Tool registry (what exists) → Pipeline YAML manifests (what stages produce what artifacts) → Layer 3 skill files (how to prompt each provider). Agent must read all three before calling any generation tool. Silent provider swaps are governance violations.

**Gaps.** No SKILL.md format — it is a standalone repo, not installable via `npx skills add`. No transparency routing. No SVG output. No asset classification. No platform-specific export bundles (iOS AppIcon, Android, PWA). Video capability does not cross over into static-asset production.

---

### 1.2 idanbeck/claude-skills (7 stars)

**What it is.** A small personal collection of four Claude Code skills, two of which are directly relevant: `fal-video-skill` and `film-maker-skill`. Also includes `fal-music-skill` and `suno-skill`.

**Install.** Clone repo, copy skill folders to `~/.claude/skills/`. No registry installer.

#### fal-video-skill

**Trigger.** Invoked when Claude Code detects a video generation request.

**API key.** `FAL_KEY` — obtained from fal.ai dashboard. Stored at `~/.claude/skills/fal-video-skill/config.json` with `chmod 600`.

**Providers / models (30+ via FAL gateway).**

*Image-to-video:*
- Kling v3, O3, Pro, Turbo, v1.6
- Google Veo 3.1
- xAI Grok Imagine Video
- PixVerse v5, WAN 2.2, LTX-2 19B
- Luma Dream Machine
- MiniMax
- Runway Gen-3
- Stable Video Diffusion

*Text-to-video:*
- Kling T2V variants
- OpenAI Sora 2
- Google Veo 3.1 T2V
- MiniMax T2V
- Hunyuan Video

*Dual-keyframe (start + end frame):*
- Kling-O1, WAN-FLF, Vidu

**Duration / resolution.**
- Duration: configurable in seconds; default 5s. Kling uses duration strings ("5s", "10s").
- Aspect ratios: `16:9`, `9:16`, `1:1`.
- Timeout: configurable, default 300s.
- Negative prompts: supported (note: Flux errors on negative prompts; this skill wraps non-Flux models through FAL).

**Output handling.**
- Async queue via FAL polling.
- Downloads to `output/<timestamp>.mp4`.
- Returns JSON: `{ status, file_path, video_url }`.
- Graceful fallback: if download fails but URL succeeds, returns URL only.

**Pricing.**
- Kling Standard: ~$0.05/second.
- MiniMax / faster alternatives: ~$0.01–0.02/second for 5s clips.
- Hunyuan: ~$0.01/second.

#### film-maker-skill

**What it is.** Orchestrator skill that coordinates `nano-banana-pro` (image gen), `eleven-labs-skill` (audio), and `fal-video-skill` (animation) into a linear film production pipeline.

**Dependencies.** `nano-banana-pro` skill, `eleven-labs-skill`, `fal-video-skill`, FFmpeg (system install).

**Workflow.** Script → storyboard frames (Nano Banana Pro) → voiceover/SFX (ElevenLabs) → animate frames (FAL/Kling/Luma/MiniMax) → assemble (FFmpeg).

**Output.** Organized project directories: `images/`, `audio/`, `video_clips/`, `final/`. Metadata in project config JSON.

#### fal-music-skill

**Providers.** Stable Audio Open, Stable Audio 2.5, Beatoven Maestro (all via FAL).

**Duration.** Up to 190s (stable-audio-25), 150s (beatoven), 47s (stable-audio).

**Output.** MP3 + JSON metadata (status, model, file path, expiring URL).

#### suno-skill

**Mechanism.** Playwright browser automation (not official Suno API). One-time login via Google/Discord/Apple.

**Limits.** Free tier: 10 generations/day. Paid: higher quota. Each prompt generates two song variants, both downloaded.

**Note.** Browser automation not officially supported by Suno. Risk of account action.

---

### 1.3 ZeroLu/Ultimate-AI-Media-Generator-Skill (35 stars)

**What it is.** A Claude Code / Codex / Cursor skill that routes all generation through CyberBara's unified API (cyberbara.com) — a proxy aggregator in front of official model APIs.

**Install.**
```bash
npx skills add ZeroLu/Ultimate-AI-Media-Generator-Skill --all
python3 scripts/cyberbara_api.py setup-api-key "<your_api_key>"
```
API key from cyberbara.com/settings/apikeys. Stored at `~/.config/cyberbara/api_key`.

**Video providers.**

| Model ID | Type | Modes |
|---|---|---|
| sora-2 | T2V + I2V | Text-to-video, Image-to-video |
| sora-2-pro | T2V + I2V | Text-to-video, Image-to-video |
| seedance-1-pro | T2V + I2V | Text-to-video, Image-to-video |
| seedance-1-lite | T2V | Text-to-video |
| seedance-1-pro-fast | T2V + I2V | Text-to-video, Image-to-video |
| kling-2.6 | T2V + I2V | Text-to-video, Image-to-video |
| kling-video-o1 | T2V + I2V + V2V | Text-to-video, Image-to-video, Video-to-video |
| veo-3.1-fast | T2V + I2V | Text-to-video, Image-to-video |
| veo-3.1-quality | T2V + I2V | Text-to-video, Image-to-video |

**Duration / resolution.** Configurable via `duration=10`, `resolution=standard` or `1k`. Specific per-model limits not documented; users quote credits before committing.

**Output handling.** Returns task ID and output URL. Credit cost quoted before submission.

**Pricing.** CyberBara claims lower cost than official model APIs. No published price list — runtime quote before each generation.

**Image providers.** nano-banana-2, nano-banana-pro (T2I + I2I).

**Note.** CyberBara is a third-party aggregator. No SLA, audit, or official API relationship with model providers confirmed. Risk profile: single point of failure, potential rate-limit policy changes by upstream providers.

---

## 2. Broader Ecosystem — Additional Video Skills and MCP Servers

### 2.1 SamurAIGPT/Generative-Media-Skills (3,000 stars)

**Architecture.** Claude Code / Cursor / Gemini CLI skill collection backed by `muapi-cli` (muapi.ai), a unified API gateway.

**Install.**
```bash
npm install -g muapi-cli
muapi auth configure --api-key "YOUR_KEY"
npx skills add SamurAIGPT/Generative-Media-Skills --all
```
Also exposes an MCP server: `muapi mcp serve` → 19 structured tools to Claude Desktop/Cursor.

**Video models.** Kling 3.0, Seedance 2.0, Veo 3, plus 13 additional models (model list via `muapi models list --output-json`).

**Image-to-video models.** 16 available.

**Output.** `--download ./outputs` flag, `--view` flag (system viewer), `--output-json --jq` for programmatic pipelines, `--no-wait` for async ID capture.

**Key library skills.** Cinema Director, Seedance 2 expert, Logo Creator, UI Designer.

**Pricing.** Not published in docs; consult muapi.ai dashboard.

---

### 2.2 AKCodez/higgsfield-claude-skills (31 stars)

**What it is.** 19 Claude Code skills for the Higgsfield AI platform, automating UGC ad pipelines through Playwright browser automation (no direct API).

**Video provider.** Seedance 2.0 via Higgsfield's `/create/video` browser endpoint.

**Image providers.** Soul 2.0 (portraits), Soul Cinema, Nano Banana Pro (4K), Nano Banana 2 (fast).

**Install.**
```bash
git clone → .claude/skills/
claude mcp add playwright npx @playwright/mcp@latest
```
Requires free Higgsfield account. No API key — browser automation only.

**Output.** Internal image→video hand-off (no re-upload needed). Batch processing with session tracking via `SESSION-RESUME.md`. No download path documented.

**Skills (sample).** `/ugc-hot-girl`, `/higgsfield-image-auto`, `/ugc-video-auto`, `/seedance-auto-generate`, Cinematic, 3D CGI, Cartoon, Comic-to-Video, Fight Scenes, Anime Action, Motion Design Ads, E-Commerce Ads, Product 360°, Social Hooks, Brand Stories, Music Videos, Fashion Lookbooks, Food & Beverage, Real Estate.

**Risk.** Browser automation is unofficial and fragile.

---

### 2.3 yuvalsuede/agent-media-skill (34 stars)

**What it is.** Claude Code skill wrapping the `agent-media-cli` npm package for UGC and SaaS review video production via agent-media.ai.

**Install.**
```bash
npm install -g agent-media-cli
agent-media login          # OTP-based
npx add-skill gitroomhq/agent-media
```

**Video approach.** AI talking heads with lip-sync, B-roll cutaways, voiceover (TTS), animated subtitles, background music. Does not route to named video generation models (Kling, Sora, etc.) — proprietary actor library.

**Parameters.**
| Parameter | Values |
|---|---|
| `--actor` | sofia, marcus, naomi, adaeze, etc. |
| `--duration` | 5 / 10 / 15 seconds |
| `--style` | 17 subtitle styles (e.g. hormozi) |
| `--voice` | nova + others |
| `--tone` | energetic, calm, etc. |
| `--broll-images` | URL or local path |

**Output.** Returned via REST API v2; `--sync` flag for synchronous mode. No local file path specified by skill.

**Coming.** TypeScript/Python SDK, MCP server integration (not yet shipped).

---

### 2.4 fltman/claude-code-skill-sora-video (0 stars)

**What it is.** Single-purpose skill for OpenAI Sora API.

**Install.** `pip install openai`. Set `OPENAI_API_KEY`. Add Python execution permissions to `.claude/settings.local.json`.

**Models.** `sora-2` (fast), `sora-2-pro` (production quality).

**Modes.** Text-to-video and image-to-video.

**Duration.** 4, 8, or 12 seconds.

**Resolution.**
| Tier | Landscape | Portrait |
|---|---|---|
| Standard | 1280×720 | 720×1280 |
| HD (pro-only) | 1792×1024 | 1024×1792 |

**Output.** Saves to `generated_video.mp4` (configurable via `--output`).

**Pricing.**
- sora-2: $0.10–$0.40/second depending on resolution.
- sora-2-pro: $0.30–$0.50/second.

---

### 2.5 hirakawat-hmp/claude-plugin-kie (0 stars) and antbald/kie-ai-skill (1 star)

Both wrap **kie.ai**, a unified API aggregator with 100+ models.

**Video providers.** Kling 3.0 (3–15s, multi-shot, sound), Runway Gen-4 (5–10s, silent, image animation), Veo 3.1 (frame-to-video, ~8s with dialogue), Sora 2/Pro (T2V + I2V), Seedance 2.0 (lip-sync native), WAN (via kie).

**API key.** `KIE_API_KEY` from kie.ai/api-key. Stored in `~/.config/kie/env`.

**Rate limits.** 20 new requests per 10 seconds, ~100 concurrent tasks.

**Credits.** Images: 5–18 credits. Videos: 20–500 credits per second.

**claude-plugin-kie architecture.** Bundles 194 markdown docs + pre-built knowledge graph (1,107 nodes, 1,341 edges) for endpoint discovery (~69x more token-efficient than raw docs). Uses NetworkX-based graph query scripts. Delegation pattern: Claude routes to `kie-agent` subagent when generation is detected.

**krusemediallc/claude-code-ai-ad-builder-kie-ai (2 stars).** Ad-oriented skill using the same kie.ai backend. Explicit model support: Veo 3.1, Sora 2, Kling 3.0, Runway. Organization: `references/influencers/`, `references/products/`, `references/aesthetics/`.

---

### 2.6 dennisonbertram/claude-media-skills (4 stars)

**Providers.** Gemini (Nano Banana image gen) + Kling 2.6 via Segmind for UGC video.

**API keys.** `SEGMIND_API_KEY` (Kling), `GEMINI_API_KEY` (Nano Banana).

**Key insight.** Character consistency workflow: generate base image → upload to Catbox.moe CDN → pass URL to Kling 2.6 `image_url` parameter. No re-upload infrastructure needed.

**Audio pacing rule.** ~15 words per 5 seconds for natural UGC pacing.

---

### 2.7 deapi-ai/claude-code-skills (15 stars)

**Provider.** deAPI (deapi.ai) — proprietary aggregator. Claims "up to 20x more cost effective." Free $5 credit on signup, no credit card required.

**Env var.** `DEAPI_API_KEY`.

**Output.** API response (URL). Webhook support for async results via `/deapi-setup`.

**Pricing.** Transcription ~$0.021/hour, images from $0.002. Video pricing not published.

---

### 2.8 vargHQ/skills (18 stars)

**Providers.** Kling (video), Sora (video), Flux (image), ElevenLabs (TTS/speech).

**API key.** `VARG_API_KEY` from varg.ai — single key covering all providers.

**Install.**
```bash
npx clawhub@latest install vargai   # ClawHub (recommended)
npx skills add vargHQ/skills --yes  # Agent Skills CLI
```

**Runtime.** Cloud mode: curl only. Local mode: bun + ffmpeg.

---

### 2.9 SamurAIGPT/short-video-gen adjacent: Yeadon8888/short-video-gen (3 stars)

**Stack.** Gemini 3.1-pro-preview (analysis + script) + Plato/BLTCY Sora-2-all (generation).

**API keys.** `VIDEO_API_KEY` (Plato), `GEMINI_API_KEY`, optional `TIKHUB_API_KEY` (TikTok link parsing), `UPLOAD_API_KEY` (Cloudflare CDN).

**Duration.** 10 or 15 seconds. Portrait or landscape.

**Output.** Three pieces of copy auto-generated (title, caption, first comment). Video count configurable via `--count`.

---

### 2.10 MCP Servers — Video Generation and Editing

From punkpeye/awesome-mcp-servers (85.1k stars):

| Repo | Purpose | Providers |
|---|---|---|
| yuvalsuede/agent-media (MCP) | Unified CLI + MCP for video/image | Kling, Veo, Sora, Seedance, Flux, Grok Imagine (7 models, 9 tools) |
| burningion/video-editing-mcp | Video management + edit generation | Video Jungle platform (upload, analyze, search, edit) |
| samuelgursky/davinci-resolve-mcp | DaVinci Resolve control | Local NLE; color grading, media management |
| raveenb/fal-mcp-server | Image + video + music via fal.ai | FLUX, SD, Kling, AnimateDiff, SVD; 600+ models discoverable |
| doctorm333/promptpilot-mcp-server | 20+ models via Pollinations.ai | Flux, GPT-Image-1, Imagen 4, Grok, Seedance, ElevenLabs |
| TwelveTake-Studios/reaper-mcp | REAPER DAW control | Local audio production |

**raveenb/fal-mcp-server** is notable: pure MCP server (not SKILL.md), 600+ discoverable fal.ai models, async queue with status polling, three video tools (`generate_video`, `generate_video_from_image`, `generate_video_from_video`). Requires `FAL_KEY`.

**doctorm333/promptpilot-mcp-server** is notable for zero-cost image path: free Pollinations models work without API key. Paid video (Seedance) requires `POLLINATIONS_API_KEY`.

---

### 2.11 Prompt-Engineering Skills (no generation, routing only)

- **sunfjun/claude-skill-ai-video-prompt** — Six-dimension framework for writing stable AI video prompts across Sora, Kling, Veo, Runway, Pika. No API calls.
- **jonatascosta-create/seedance-claude-skill** — Cinematic Seedance 2.0 / Jimeng / Runway prompt generation (Mann/Scott/Lubezki composition grades). No API calls.
- **OSideMedia/higgsfield-ai-prompt-skill** — 18 sub-skills for Higgsfield AI cinematic prompts. No API calls.

These are pure instruction-injection skills — no env var, no generation, no output file. They encode prompt dialect knowledge into Claude's context and leave API execution to the user.

---

## 3. Provider Coverage Map

The following table maps each major video generation provider to the skills that support it, as of 2026-04-20.

| Provider | Stars / popularity | Skills covering it | Mode |
|---|---|---|---|
| **Kling** (2.6, 3.0, O1, various) | Most common | OpenMontage, idanbeck/fal-video-skill, ZeroLu, SamurAIGPT, vargHQ, krusemediallc, dennisonbertram, kie-ai-skill, agent-media (MCP) | T2V + I2V (O1 adds V2V) |
| **Runway Gen-4** | Common | OpenMontage, kie-ai-skill, krusemediallc | T2V + I2V |
| **Veo 3 / 3.1** | Common | OpenMontage, idanbeck/fal-video-skill, ZeroLu, SamurAIGPT, kie-ai-skill, krusemediallc | T2V + I2V |
| **Sora 2 / Sora 2 Pro** | Common | ZeroLu, idanbeck/fal-video-skill, fltman, vargHQ, Yeadon8888, kie-ai-skill | T2V + I2V |
| **Seedance 1/2** | Growing | ZeroLu, SamurAIGPT, AKCodez (via Higgsfield), Yeadon8888, kie-ai-skill, doctorm333 (MCP) | T2V + I2V |
| **MiniMax** | Moderate | OpenMontage, idanbeck/fal-video-skill | T2V + I2V |
| **Luma Dream Machine** | Moderate | idanbeck/fal-video-skill | I2V |
| **HeyGen** | Niche (avatars) | OpenMontage | Avatar / lip-sync |
| **WAN 2.1 / 2.2** | Local GPU | OpenMontage (GPU mode), idanbeck/fal-video-skill | T2V + I2V |
| **Hunyuan Video** | Local GPU | OpenMontage (GPU mode), idanbeck/fal-video-skill (FAL) | T2V |
| **CogVideo** | Local GPU | OpenMontage (GPU mode) | T2V |
| **LTX-Video** | Local GPU | OpenMontage (GPU mode), idanbeck/fal-video-skill | T2V |
| **PixVerse v5** | Rare | idanbeck/fal-video-skill | I2V |
| **Stable Video Diffusion** | Legacy | idanbeck/fal-video-skill, raveenb/fal-mcp | I2V |
| **Higgsfield** | Niche | OpenMontage, AKCodez | I2V via FAL or browser |
| **Grok Imagine Video** | Rare | OpenMontage, agent-media (MCP) | T2V |
| **Pika** | Not covered | None found | — |

**Coverage gaps.** Pika has no dedicated Claude Code skill. Haiper, Wan 2.2 standalone, and Hailuo (MiniMax alternative) are absent from all surveyed skills. Gen-3 Alpha direct (non-FAL Runway) is covered only in OpenMontage.

> **Updated 2026-04-21:** No major provider coverage changes since original research. Kling 3.0 remains the most consistently covered video provider across skills. Veo 3.1 has grown — now covered by idanbeck/fal-video-skill, ZeroLu, SamurAIGPT, and kie-ai-skill. Sora 2/Pro remains behind an organization-verified OpenAI account gating. The `doctorm333/promptpilot-mcp-server` (Pollinations-based, zero-key for images, paid for video) is the closest thing to a free video path but requires a Pollinations API key for Seedance video. There is still no meaningful zero-key programmatic video generation path.

---

## 4. Architectural Patterns

### Pattern A: FAL Gateway Aggregation
The dominant pattern. One `FAL_KEY` unlocks 30+ video models. Skills call the FAL async queue API: `POST /queue/submit` → poll `GET /queue/status/{request_id}` → retrieve result URL. idanbeck/fal-video-skill is the reference implementation.

**Tradeoffs.** FAL adds latency and takes a margin. FAL endpoint IDs occasionally change. But the single-key UX and the breadth of models make this the most practical path for skill authors.

### Pattern B: Third-Party Aggregator (CyberBara, muapi, kie.ai, varg.ai, deapi.ai)
Several skills route through a secondary aggregator that wraps official APIs. Claims: cheaper pricing, single key, unified schema. Risks: single point of failure, no official API relationship, potential ToS issues with underlying providers, no audit trail.

### Pattern C: Browser Automation (Playwright)
Used by idanbeck/suno-skill, AKCodez/higgsfield-claude-skills. Avoids API cost and key requirements but is fragile, unsupported, and subject to account bans.

### Pattern D: Full Production System (OpenMontage)
Not a skill package — a standalone repo with its own CLI, runtime, and governance. Requires explicit adoption. Too heavy for casual integration but architecturally sound for complex video workflows. The YAML pipeline manifests and three-layer skill system are worth studying.

### Pattern E: Direct Provider API (fltman/sora-video)
`pip install openai` + `OPENAI_API_KEY`. Minimal code, maximum transparency. Fragile to OpenAI API changes. No multi-model routing.

### Pattern F: Prompt-Engineering Only
Pure SKILL.md instruction files that encode provider-specific prompt dialects. Zero infrastructure. Improve generation quality when the user already has API access elsewhere.

---

## 5. Install UX Comparison

| Skill | Install command | API key(s) required | Zero-key mode |
|---|---|---|---|
| OpenMontage | `git clone + make setup` | None (optional per provider) | Yes (stock footage + FFmpeg) |
| idanbeck/fal-video-skill | Manual copy to `~/.claude/skills/` | `FAL_KEY` | No |
| ZeroLu/Ultimate-AI-Media | `npx skills add ZeroLu/... --all` | CyberBara key (free tier) | No |
| SamurAIGPT/Generative-Media | `npx skills add SamurAIGPT/... --all` | muapi.ai key | No |
| AKCodez/higgsfield | `git clone → .claude/skills/` + Playwright | Higgsfield account (free) | Yes (browser auth) |
| yuvalsuede/agent-media-skill | `npm i -g agent-media-cli + npx add-skill` | agent-media login (OTP) | No |
| fltman/sora-video | `pip install openai` + manual | `OPENAI_API_KEY` | No |
| hirakawat-hmp/kie-plugin | `/plugin marketplace add` + `uv` | `KIE_API_KEY` | No |
| antbald/kie-ai-skill | `git clone → .claude/skills/` | `KIE_API_KEY` | No |
| vargHQ/skills | `npx clawhub@latest install vargai` | `VARG_API_KEY` | No |
| dennisonbertram/claude-media | Manual copy | `SEGMIND_API_KEY` + `GEMINI_API_KEY` | No |
| deapi-ai/claude-code-skills | Copy to `~/.claude/skills/` | `DEAPI_API_KEY` (free $5 credit) | No (but free tier) |
| raveenb/fal-mcp-server | `uvx` / pip / Docker | `FAL_KEY` | No |
| doctorm333/promptpilot-mcp | `npx promptpilot-mcp` | None (free models) | Yes |

---

## 6. Synthesis — The Video Skill Landscape

### What exists

The video skill landscape is fragmented but populated. The dominant pattern is: a thin SKILL.md triggers a Python or shell script that forwards the user's prompt to FAL (or a secondary aggregator) and returns an MP4 URL or local file. Kling is the most consistently covered provider. Runway Gen-4 and Veo 3 have moderate coverage. Sora 2 coverage is growing.

**Quality ceiling.** Every skill surveyed is a thin wrapper. None implement:
- Transparency routing (irrelevant for video, but noted for completeness)
- Prompt-dialect switching per model (Kling needs motion-specific phrasing; Sora handles prose; Veo 3 is prompt-sensitive about camera movement)
- Quality validation after generation (no frame-count check, no audio sync check, no resolution verification)
- Multi-format export (no portrait/landscape variants, no platform-specific length trimming)
- Cost estimation before generation (OpenMontage is the sole exception)

**OpenMontage** is the only repo that treats video production as a routing + post-processing problem rather than a prompt-forwarding problem. It is the reference architecture for anything serious. But it is not a skill package — it is a standalone system that a user must adopt wholesale.

### What is missing

1. **Prompt-dialect routing.** No skill maps the user's intent to the correct prompt structure per provider. Kling's image-to-video needs explicit camera movement verbs ("slow push in, slight rack focus"). Sora handles natural language. Veo 3 expects cinematographic descriptions with lighting notes. The prompt-engineering-only skills (sunfjun, jonatascosta) document this but don't automate it.

2. **Platform-length trimming.** TikTok/Reels max at 60s for most scenarios; YouTube Shorts at 60s; Instagram Stories at 15s. No skill auto-trims or warns.

3. **Video validation.** No skill checks frame count, resolution match, codec compliance (H.264 vs H.265), or audio sync after generation.

4. **Zero-key video generation.** Unlike images (Gemini AI Studio free tier via nano-banana), there is no free-tier video model with meaningful quality. All real video generation requires a paid API key or account. The closest approach is browser automation (unreliable) or stock footage search (zero cost, zero customization).

5. **Asset-grade video.** No skill generates software asset-grade video: app store preview videos (15s H.264, specific aspect ratios), splash screen animations, or animated brand marks. All existing skills target social media content (UGC, ads, short-form).

### Should prompt-to-asset add a video skill?

**Short answer: yes, one narrow skill — not a full video production system.**

The case for it:
- App Store preview videos (iOS: 15–30s, H.264, 1080×1920 or 886×1920; Android: 30s max) are a legitimate software asset type.
- Splash screen animations (0.5–3s, looping) are requested alongside static splash screens.
- Animated brand marks (logo reveal, 2–5s) are a common deliverable adjacent to logo generation.
- The FAL gateway already in the routing table (`FAL_KEY` is an env var prompt-to-asset already supports) makes adding Kling/Veo/Sora straightforward.
- The idanbeck/fal-video-skill implementation is a clean reference — 30 models, async polling, local file output — and can be adapted without reinvention.

The case against over-building:
- Full video production (scripts, voiceover, subtitles, music) is OpenMontage's domain. Duplicating it would be worse and slower.
- Social/marketing video (UGC, ads) is agent-media-skill's domain.
- prompt-to-asset's scope is software assets, not marketing content.

**Recommended scope for a `video-gen` skill in prompt-to-asset:**

| Asset type | Provider | Mode | Duration | Resolution |
|---|---|---|---|---|
| App Store preview | Kling 3.0 or Veo 3.1 via FAL | T2V or I2V | 15–30s | 1080×1920 (portrait) |
| Splash screen animation | Kling or LTX-Video via FAL | I2V from splash image | 2–5s | Match splash dimensions |
| Animated logo mark | Kling or Luma via FAL | I2V from SVG-rasterized logo | 3–5s | 512×512 or 1080×1080 |
| Hero video (web) | Sora 2 or Veo 3.1 via FAL | T2V | 5–15s | 1920×1080 (landscape) |

**Key routing decision.** Kling 3.0 is the default for I2V (reliable motion, supports 3–15s, multi-shot). Sora 2 is the default for T2V (natural language prompts, up to 20s). Veo 3.1 is the alternative for T2V when native audio/dialogue is needed. Route based on `FAL_KEY` availability; no other key is needed if FAL is used.

**Validation after generation.** At minimum: `ffprobe` duration check (±10% of requested), resolution match, H.264 codec confirmation. Use ffprobe JSON output parsed in Python — same pattern as OpenMontage's post-render validation.

**No-key fallback.** Provide the enhanced prompt + paste targets (Kling web, Sora web, Veo via AI Studio, Runway web) with `external_prompt_only` mode, same as image assets. There is no meaningful zero-key programmatic path for video generation today.

---

## 7. Action Items for prompt-to-asset

| Priority | Item | Rationale |
|---|---|---|
| High | Add `asset_generate_app_preview` tool to MCP surface | App store preview videos are a direct software asset; FAL/Kling path is clear |
| High | Wire `existing_mark_svg` → rasterize → Kling I2V pipeline in `asset_generate_splash_screen` | Animated splash is frequently requested alongside static splash |
| Medium | Add `video-gen` skill SKILL.md with prompt-dialect routing table (Kling/Sora/Veo) | Encode provider-specific prompt structure; no skill currently does this |
| Medium | Add `external_prompt_only` paste targets for video: Kling web, Sora, Runway, Veo AI Studio | Give no-key users a clear path |
| Medium | Post-generation validation: ffprobe duration + resolution + codec check | No existing skill does this; 10 lines of Python |
| Low | Document that OpenMontage covers full production video; reference it when user asks for marketing/social video | Avoid scope creep; route correctly |
| Low | Evaluate kie.ai aggregator for unified key coverage | One `KIE_API_KEY` covers Kling, Runway, Veo3, Sora2, Seedance — reduces env var count if kie.ai proves stable |
