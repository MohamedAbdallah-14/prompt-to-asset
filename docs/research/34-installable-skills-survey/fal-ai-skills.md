# fal.ai Installable Skills Survey

Survey date: 2026-04-20. Sources fetched directly from GitHub via API.

> **Updated 2026-04-21:** fal-ai-community/skills repo confirmed at 53 stars (MIT, bash scripts). The fal.ai queue API (used by fal-generate, fal-3d, fal-upscale, etc.) is transport-agnostic from the skill's perspective — skills call the REST queue endpoints directly. MCP spec context: fal-image-video-mcp (RamboRogers, 8 stars) exposes fal.ai via MCP and should target Streamable HTTP transport per the MCP 2025-11-25 spec; SSE transport deprecated, backward compat until 30 June 2026. The `--http` flag in RamboRogers MCP already serves Streamable HTTP on port 3000. Hunyuan3D pricing on fal.ai is $0.16/generation as of April 2026 (not $0.375 — that was a preview price). Nano Banana Pro pricing: $0.15/image (1K/2K), $0.30/image (4K). fal.ai now lists Nano Banana Pro (`fal-ai/nano-banana-pro`) as the default model for fal-generate, replacing earlier Flux-only defaults.

---

## Repos Surveyed

| Repo | Stars | Type | Author |
|------|-------|------|--------|
| [fal-ai-community/skills](https://github.com/fal-ai-community/skills) | 53 | Claude.ai skill collection (bash scripts) | Official fal.ai |
| [idanbeck/claude-skills](https://github.com/idanbeck/claude-skills) | 7 | Claude Code skill collection (Python) | Community |
| [RamboRogers/fal-image-video-mcp](https://github.com/RamboRogers/fal-image-video-mcp) | 8 | MCP server (TypeScript/npm) | Community |
| [ZeroLu/Ultimate-AI-Media-Generator-Skill](https://github.com/ZeroLu/Ultimate-AI-Media-Generator-Skill) | 35 | Claude Code/Codex skill (Python, CyberBara proxy) | Community |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | — | Index of 1100+ skills across 70+ repos | VoltAgent |

---

## Repo 1: fal-ai-community/skills (Official)

**53 stars. MIT. Bash scripts. Compatible with Claude.ai Projects, Claude Code, and any shell-callable agent platform.**

### Complete Skill List (15 skills)

#### Core

| Skill | Scripts | Purpose |
|-------|---------|---------|
| `fal-generate` | `generate.sh`, `upload.sh`, `search-models.sh`, `get-schema.sh` | Image + video generation via fal queue API |
| `fal-image-edit` | `edit-image.sh` | Style transfer, object removal, background swap, inpainting |
| `fal-audio` | `text-to-speech.sh`, `speech-to-text.sh` | TTS + STT |
| `fal-upscale` | `upscale.sh` | Image and video resolution upscaling |

#### Specialized Models

| Skill | Scripts | Purpose |
|-------|---------|---------|
| `fal-kling-o3` | `kling-generate.sh`, `kling-video.sh` | Kling O3 — highest quality image + video |
| `fal-realtime` | `realtime.sh` | Sub-second streaming generation (~0.3s/image) |

#### Video & Animation

| Skill | Scripts | Purpose |
|-------|---------|---------|
| `fal-video-edit` | `edit-video.sh`, `video-audio.sh` | Video remix, upscale, background removal, audio add |
| `fal-lip-sync` | `talking-head.sh`, `lip-sync.sh` | Talking head, lip sync, live portrait |

#### Creative & Production

| Skill | Scripts | Purpose |
|-------|---------|---------|
| `fal-3d` | `generate-3d.sh` | Text/image to 3D model (GLB/OBJ/PLY) |
| `fal-vision` | `analyze.sh` | Segmentation, object detection, OCR, captioning, visual QA |
| `fal-restore` | `restore.sh` | Deblur, denoise, dehaze, face fix, document restoration |
| `fal-tryon` | `tryon.sh` | Virtual clothing try-on (garment transfer) |
| `fal-train` | `train.sh` | LoRA training on custom images |

#### Platform & Utilities

| Skill | Scripts | Purpose |
|-------|---------|---------|
| `fal-platform` | `pricing.sh`, `usage.sh`, `estimate-cost.sh`, `setup.sh`, `requests.sh` | API key setup, pricing lookup, usage tracking, cost estimation |
| `fal-workflow` | `create-workflow.sh` | Author multi-step JSON workflow pipelines |

### fal.ai Models Used (explicit endpoint IDs from SKILL.md files)

**Image generation**
- `fal-ai/nano-banana-pro` (default for fal-generate)
- `fal-ai/flux-2/klein/realtime` (default for fal-realtime)
- `fal-ai/kling-image/o3/text-to-image` (fal-kling-o3)

**Video generation**
- `fal-ai/veo3.1`
- `fal-ai/kling-video/v2.6/pro/image-to-video`
- `fal-ai/kling-video/o3/standard/text-to-video`
- `fal-ai/kling-video/o3/pro/text-to-video`
- `fal-ai/kling-video/o3/standard/image-to-video`
- `fal-ai/kling-video/o3/pro/image-to-video`
- (all other models discovered dynamically via `search-models.sh`)

**Upscaling**
- `fal-ai/aura-sr` (default, 4x)
- `fal-ai/clarity-upscaler` (2x, detail preservation)
- `fal-ai/video-upscaler`
- `fal-ai/topaz/upscale/video` (premium)

**Restoration**
- Default models resolved dynamically via search; operations: deblur, denoise, dehaze, fix-face, document

**3D generation**
- `fal-ai/hunyuan3d-v3/image-to-3d` (default)
- `fal-ai/meshy/v6/text-to-3d`

**Audio TTS**
- `fal-ai/minimax/speech-2.8-turbo` (default)
- `fal-ai/minimax/speech-2.8-hd`
- `fal-ai/elevenlabs/tts/eleven-v3`
- `fal-ai/chatterbox/text-to-speech/multilingual`

**Audio STT**
- `fal-ai/whisper` (default)
- `fal-ai/elevenlabs/speech-to-text/scribe-v2`

**Lip sync / talking head**
- `veed/fabric-1.0` (default talking head)
- `fal-ai/creatify/aurora`
- `fal-ai/sync-lipsync/v2` (default lip sync)
- `fal-ai/minimax/speech-2.6-turbo` (auto TTS for talking head)

**Virtual try-on**
- `fal-ai/fashn/tryon/v1.5` (default)

**LoRA training**
- `fal-ai/flux-lora-fast-training` (default)
- `fal-ai/flux-lora-portrait-trainer`

**Video editing / audio**
- `fal-ai/mmaudio-v2` (default video-audio)

**Model discovery (runtime)**
- All skills call `search-models.sh` or the `search_models` MCP tool to find current best models dynamically — the skill does not hardcode the "best" model, it routes at runtime.

### Install Instructions

**API key:** `export FAL_KEY=your_key_here` or `bash scripts/generate.sh --add-fal-key`

**Claude.ai Projects:**
1. Upload the skill directory from `skills/claude.ai/` into Project settings.
2. Add `*.fal.ai` to allowed domains under `claude.ai/settings/capabilities`.

**Claude Code / any shell agent:**
Skills are standalone bash scripts. No special install step:
```bash
bash skills/claude.ai/fal-generate/scripts/generate.sh \
  --prompt "A serene mountain landscape" \
  --model "fal-ai/nano-banana-pro"
```

**Cursor / Codex:** No specific documentation provided. Works the same as Claude Code — call the bash scripts directly from the agent's Bash tool.

### Trigger Phrases (from SKILL.md descriptions)

| Skill | Triggers |
|-------|---------|
| fal-generate | "Generate image", "Create video", "Make a picture of...", "Text to image", "Image to video", "Search models" |
| fal-image-edit | "Edit image", "Remove object", "Change background", "Apply style" |
| fal-audio | "Convert text to speech", "Transcribe audio", "Generate voice", "Speech to text", "TTS", "STT" |
| fal-upscale | "Upscale image", "Enhance resolution", "Make image bigger", "Increase quality" |
| fal-kling-o3 | "Kling", "Kling O3", "Best quality video", "Kling image", "Kling video editing" |
| fal-realtime | "Real-time generation", "Fast generation", "Streaming image", "Instant image", "Realtime" |
| fal-video-edit | "Edit video", "Remix video", "Upscale video", "Remove video background", "Add sound to video" |
| fal-lip-sync | "Talking head", "Lip sync", "Make this person talk", "Animate portrait", "Live portrait", "Avatar video" |
| fal-3d | "Create 3D model", "Text to 3D", "Image to 3D", "Generate mesh", "3D asset" |
| fal-vision | "Segment image", "Detect objects", "OCR", "Extract text from image", "Describe image", "What's in this image" |
| fal-restore | "Fix blurry image", "Remove noise", "Fix face", "Restore photo", "Enhance document", "Deblur", "Denoise" |
| fal-tryon | "Try on clothes", "Virtual try-on", "How does this look on me", "Fashion try-on", "Garment transfer" |
| fal-train | "Train model", "Train LoRA", "Fine-tune", "Custom model", "Train on my images", "Portrait training" |
| fal-platform | "show pricing", "check usage", "estimate cost", "setup fal", "add API key" |
| fal-workflow | "create workflow", "chain models", "multi-step generation", "image to video pipeline" |

### Output Handling

- All results returned as JSON with a `url` field pointing to `fal.media` CDN.
- No automatic local file download (scripts return URLs and print to stdout).
- Caller (the LLM agent) is expected to present the URL inline as markdown image/video link.
- `--lifecycle N` flag on `fal-generate` controls CDN expiry in seconds (default: permanent until account cleanup).
- Queue system used by default for reliability; `--async` returns `request_id` for polling.

### Cost (from fal-platform pricing script examples)

- `fal-ai/flux/dev`: ~$0.025/image
- `fal-ai/kling-video/v2/master/text-to-video`: ~$0.50/video-second
- No per-skill cost table; use `pricing.sh --model <id>` at runtime.

---

## Repo 2: idanbeck/claude-skills

**7 stars. Python. Claude Code skill format. 40+ skills total, 2 fal.ai skills.**

### fal.ai Skills

#### fal-video-skill

**Models:**

| Model ID | Quality | Speed | Best For |
|----------|---------|-------|---------|
| `kling` | Excellent | Medium | General i2v |
| `kling-pro` | Best | Slow | Production |
| `luma` | Great | Medium | Creative motion |
| `minimax` | Good | Fast | Longer clips |
| `runway` | Excellent | Medium | Professional |
| `svd` | Good | Fast | Quick previews |
| `kling-t2v` | Excellent | Medium | General t2v |
| `kling-pro-t2v` | Best | Slow | High-quality t2v |
| `minimax-t2v` | Good | Fast | Longer t2v |
| `hunyuan` | Good | Medium | Open source |
| `luma` (t2v) | Great | Medium | Creative t2v |

**Commands:**
- `i2v IMAGE [--prompt] [--model] [--duration] [--aspect-ratio] [--output]` — image to video
- `t2v PROMPT [--model] [--duration] [--aspect-ratio] [--output]` — text to video
- `models` — list available models
- `config [KEY]` — set/show API key

**Output:** Videos saved to `~/.claude/skills/fal-video-skill/output/` as `.mp4`. JSON response includes local file path + CDN URL.

**Pricing (approximate, documented in SKILL.md):**
- Kling Standard: ~$0.05/second
- Kling Pro: ~$0.10/second
- Luma: ~$0.03/second
- Minimax: ~$0.02/second
- Hunyuan: ~$0.01/second
- A 5-second Kling video: ~$0.25

**Trigger phrases:** SKILL.md description not shown; skill activated by asking for video generation. Designed to integrate with `film-maker-skill` and `nano-banana-pro` (image gen) skill.

#### fal-music-skill

**Models:**

| Model ID | Quality | Max Duration | Cost | Best For |
|----------|---------|-------------|------|---------|
| `stable-audio` | Good | 47s | Free (open-source) | Loops, SFX, short clips |
| `stable-audio-25` | Excellent | 190s | ~$0.20/gen | Full tracks |
| `beatoven` | Best | 150s | Varies | Full songs, compositions |

**Commands:**
- `generate PROMPT [--model] [--duration] [--steps] [--guidance] [--creativity] [--negative-prompt] [--seed] [--output]`
- `models` — list models
- `config [KEY]` — set/show API key

**Output:** Audio files saved to `~/.claude/skills/fal-music-skill/output/` as `.wav`. JSON response includes local file path + CDN URL.

**Trigger phrases (from SKILL.md frontmatter):** "create, generate, or make music, songs, audio, melodies, tracks, or beats"

### Install Instructions

**API key:** Shared `FAL_KEY` / `FAL_API_KEY` env var, or configured per-skill:
```bash
python3 ~/.claude/skills/fal-video-skill/fal_video_skill.py config YOUR_API_KEY
python3 ~/.claude/skills/fal-music-skill/fal_music_skill.py config YOUR_API_KEY
```

**Claude Code:** Clone or copy skill directories into `~/.claude/skills/`. Claude Code auto-discovers skills there. No explicit install doc; community convention.

**Cursor / Codex:** No documentation provided. The Python scripts are standalone and callable from any Bash-capable agent.

---

## Repo 3: RamboRogers/fal-image-video-mcp

**8 stars. TypeScript. npm-published MCP server. Claude Desktop native.**

### Tools Exposed (via MCP protocol)

| Tool | Description |
|------|-------------|
| `generate_image` | Text to image using selected model |
| `generate_video_from_text` | Text to video |
| `generate_video_from_image` | Image to video |
| `list_available_models` | Discover models by category |
| `execute_custom_model` | Run any fal.ai endpoint beyond curated registry |

### fal.ai Models (with exact endpoint IDs from source)

**Image Generation**

| ID | Endpoint | Model |
|----|----------|-------|
| `imagen4` | `fal-ai/imagen4/preview` | Imagen 4 |
| `flux_kontext` | `fal-ai/flux-pro/kontext/text-to-image` | FLUX Kontext Pro |
| `ideogram_v3` | `fal-ai/ideogram/v3` | Ideogram V3 |
| `recraft_v3` | `fal-ai/recraft/v3/text-to-image` | Recraft V3 |
| `stable_diffusion_35` | `fal-ai/stable-diffusion-v35-large` | SD 3.5 Large |
| `flux_dev` | `fal-ai/flux/dev` | FLUX Dev |
| `hidream` | `fal-ai/hidream-i1-full` | HiDream I1 |
| `janus` | `fal-ai/janus` | Janus |

**Text to Video**

| ID | Endpoint | Model |
|----|----------|-------|
| `veo3` | `fal-ai/veo3` | Veo 3 (with speech/audio) |
| `kling_master_text` | `fal-ai/kling-video/v2.1/master/text-to-video` | Kling 2.1 Master |
| `pixverse_text` | `fal-ai/pixverse/v4.5/text-to-video` | Pixverse V4.5 |
| `magi` | `fal-ai/magi` | Magi |
| `luma_ray2` | `fal-ai/luma-dream-machine/ray-2` | Luma Ray 2 |
| `wan_pro_text` | `fal-ai/wan-pro/text-to-video` | Wan Pro |
| `vidu_text` | `fal-ai/vidu/q1/text-to-video` | Vidu Q1 |

**Image to Video**

| ID | Endpoint | Model |
|----|----------|-------|
| `ltx_video` | `fal-ai/ltx-video-13b-distilled/image-to-video` | LTX Video (fast) |
| `kling_master_image` | `fal-ai/kling-video/v2.1/master/image-to-video` | Kling 2.1 Master I2V |
| `pixverse_image` | `fal-ai/pixverse/v4.5/image-to-video` | Pixverse V4.5 I2V |
| `wan_pro_image` | `fal-ai/wan-pro/image-to-video` | Wan Pro I2V |
| `hunyuan_image` | `fal-ai/hunyuan-video-image-to-video` | Hunyuan I2V |
| `vidu_image` | `fal-ai/vidu/image-to-video` | Vidu I2V |
| `luma_ray2_image` | `fal-ai/luma-dream-machine/ray-2/image-to-video` | Luma Ray 2 I2V |

### Install Instructions

**API key:** `FAL_KEY` env var required.

**Claude Desktop:**
```json
{
  "mcpServers": {
    "fal-image-video": {
      "command": "npx",
      "args": ["-y", "fal-image-video-mcp"],
      "env": { "FAL_KEY": "YOUR-API-KEY" }
    }
  }
}
```
Config file: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

**Claude Code:** Same MCP server config applies if Claude Code supports MCP servers (it does via `.claude/mcp.json` or `settings.json`).

**Cursor:** Cursor supports MCP servers; same `npx` config pattern works in Cursor's MCP config.

**Codex:** No documentation provided.

**HTTP mode (containers/testing):**
```bash
npx -y fal-image-video-mcp --http
# or: MCP_TRANSPORT=http npx -y fal-image-video-mcp
```
Default port 3000, configurable via `PORT` env var.

**Custom download path:**
```bash
DOWNLOAD_PATH=/my/path npx -y fal-image-video-mcp
```

### Output Handling

- Files auto-downloaded to `~/Downloads` (default) or `DOWNLOAD_PATH`.
- Naming: `fal_{model}_{timestamp}_{index}.{ext}`
- Images: `.jpg`; Videos: `.mp4`
- Response includes: local file path + public CDN URL.
- Optional base64 data URLs: `ENABLE_DATA_URLS=true` (disabled by default to avoid Claude Desktop context bloat).
- Auto-open on macOS (opens generated file); disabled on Linux/containers.
- `execute_custom_model` tool accepts any fal.ai endpoint ID, allowing access to the entire fal.ai catalog beyond the 21-model registry.

### Cost

Not documented. Depends on individual model rates at fal.ai.

---

## Repo 4: ZeroLu/Ultimate-AI-Media-Generator-Skill

**35 stars. Python. CyberBara API proxy (not direct fal.ai). Works on Claude Code, Codex, Cursor, OpenClaw, Antigravity.**

Note: This skill routes through CyberBara (https://cyberbara.com) as a proxy, not directly to fal.ai. The underlying models include fal.ai-hosted models but billing and routing are via CyberBara credits.

### Skill Components

| Skill | Capability |
|-------|-----------|
| AI Image Generator | text-to-image, image-to-image |
| AI Video Generator | text-to-video, image-to-video |
| AI PPT (workflow template) | AI-generated presentation slides |
| AI SEO Article (workflow template) | Content generation workflow |
| AI Comic Drama (workflow template) | Sequential story/comic generation |

### Models Supported

**Image:**
- `nano-banana-2`
- `nano-banana-pro`

**Video:**
- `sora-2`, `sora-2-pro`
- `seedance-1-pro`, `seedance-1-lite`, `seedance-1-pro-fast`
- `kling-2.6`, `kling-video-o1`
- `veo-3.1-fast`, `veo-3.1-quality`

### Install Instructions

**Claude Code / Codex / Cursor (any `npx skills`-compatible platform):**
```bash
npx skills add ZeroLu/Ultimate-AI-Media-Generator-Skill --all
```

**API key:** CyberBara key from https://cyberbara.com/settings/apikeys
```bash
python3 scripts/cyberbara_api.py setup-api-key "<your_api_key>"
```
Key stored at `~/.config/cyberbara/api_key`.

### Trigger Phrases

- "Use $ultimate-ai-media-generator-skill to generate one image"
- "Use $ultimate-ai-media-generator-skill to generate one video"
- "Use $ultimate-ai-media-generator-skill to quote credits before submission"

### Output Handling

Not explicitly documented. Results delivered via CyberBara API response. Credit cost quoted before generation on request.

### Cost

Variable by model. CyberBara claims lower pricing than official APIs. Pricing table at https://cyberbara.com/credit-costs. System quotes credits before submitting — user can cancel before spending.

---

## VoltAgent/awesome-agent-skills Index

The index lists the 15 official fal.ai skills from `fal-ai-community/skills` as a cohesive block. Additional media-adjacent skills listed in the index from other providers:

- `Remotion` — programmatic video creation (React-based, no AI model)
- `anthropics/slack-gif-creator` — optimized animated GIF creation
- `openai/sora` — short video via Sora API
- `openai/imagegen` — image generation and editing
- `microsoft/podcast-generation` — AI podcast audio

Total index: 1100+ skills across 70+ official repos (Anthropic, Google, Microsoft, OpenAI, Vercel, Cloudflare, Netlify, plus community).

---

## Synthesis: What fal.ai Skills Add That prompt-to-asset Currently Lacks

The prompt-to-asset project covers image generation, background removal, vectorization, upscaling, and validation for static software assets (logo, favicon, OG image, app icon, illustration, splash screen). The fal.ai skill ecosystem adds five distinct capability buckets that fall entirely outside that scope:

### 1. Video Generation (T2V and I2V)

None of the prompt-to-asset pipeline touches video. The fal-ai-community/skills `fal-generate` skill and the RamboRogers MCP server together expose 14 video models (Kling O3 Pro, Veo 3, Luma Ray 2, Wan Pro, Hunyuan, Pixverse, Vidu, Magi). The idanbeck `fal-video-skill` adds image-to-video with Kling, Luma, Minimax, Runway, Hunyuan, SVD.

Practical gap: animated splash screens, hero video loops, product demo clips, and social video content for software products are not addressable with any current prompt-to-asset tool.

The fal-video-edit skill adds: video remix/restyle (style transfer on existing video), video background removal, video-to-audio (add sound effects), and video upscaling — all also absent from the current pipeline.

### 2. Audio: TTS, STT, and Music Generation

Prompt-to-asset has no audio layer at all. The fal-audio skill covers:
- TTS: MiniMax Speech 2.8, ElevenLabs v3, Chatterbox multilingual
- STT: Whisper, ElevenLabs Scribe v2
- (Music via search; fal.ai catalog includes Stable Audio 2.5, Beatoven)

The idanbeck `fal-music-skill` covers music generation explicitly: Stable Audio Open (free, 47s), Stable Audio 2.5 (~$0.20/gen, 190s), Beatoven Maestro (150s).

Practical gap: no current mechanism to generate audio branding (jingles, notification sounds, voiceovers) or to transcribe briefs from audio input.

### 3. 3D Model Generation

The `fal-3d` skill exposes image-to-3D (Hunyuan3D v3) and text-to-3D (Meshy v6), producing GLB/OBJ/PLY files. This is structurally similar to what prompt-to-asset does for 2D (raster → vector), but in a different dimension.

Practical gap: app icons that need to export as 3D assets for game engines, AR product demos, and 3D sticker packs are unaddressable. The pipeline could naturally extend here by passing a generated 2D mark through `fal-3d` image-to-3D.

### 4. Real-Time / Streaming Generation

The `fal-realtime` skill uses `fal-ai/flux-2/klein/realtime` (~0.3s/image) for live preview and rapid iteration. The current prompt-to-asset pipeline is batch-only; there is no streaming path.

Practical gap: interactive brand exploration (live prompt → instant preview loop) is not achievable with the current asset pipeline. This is distinct from the external_prompt_only mode which routes users to a web UI. Real-time would enable in-IDE live preview of logo marks.

### 5. Image Restoration

The `fal-restore` skill covers deblur, denoise, dehaze, face fix, and document restoration. Prompt-to-asset has background removal (BiRefNet/BRIA) and upscaling (in the `asset_upscale_refine` tool) but no restoration path.

Practical gap: ingested external assets (via `asset_ingest_external`) that arrive noisy, blurry, or with degraded faces would benefit from a restoration pre-pass before the matte → vectorize pipeline. This is particularly relevant for the `external_prompt_only` flow where the user generates externally and the quality is unpredictable.

### 6. Lip Sync and Talking Head (bonus)

`fal-lip-sync` produces avatar/talking head videos from portrait + audio. No analogue exists in prompt-to-asset. Practical for video ad creatives, personalized outreach videos, and product demo narration — adjacent to brand asset work but not currently in scope.

### 7. LoRA Training

`fal-train` allows custom model training on brand-specific images. This is the highest-leverage missing capability for brand consistency: train a LoRA on the brand style once, then all subsequent generation calls use the brand trigger word. Prompt-to-asset currently handles brand consistency through the `BrandBundle` spec (palette, font, mark), but generation still relies on prompting a base model. A trained LoRA would enforce visual style at the model level rather than the prompt level.

---

## Integration Recommendations for prompt-to-asset

Ranked by impact-to-effort:

1. **fal-restore as a pre-pass in `asset_ingest_external`** — trivial to add; any uploaded asset with quality issues gets run through `fal-ai/...` restore before matting. Direct call to the fal.ai API, same pattern as existing `asset_remove_background`.

2. **`asset_generate_video` tool using fal-generate + Kling O3 Pro / Veo 3** — new tool in the MCP surface. Takes an existing `master.svg` or PNG mark + motion prompt, calls `fal-ai/kling-video/o3/pro/image-to-video`, returns `.mp4`. Fills the animated splash / hero loop gap.

3. **Real-time preview mode in `asset_generate_logo` / `asset_generate_app_icon`** — when `mode: "realtime"`, call `fal-ai/flux-2/klein/realtime` for fast iteration before committing to a full `api` mode call. Reduces iteration cost by 10-100x.

4. **LoRA training as `asset_train_brand_model`** — long-running tool; trains on `BrandBundle.referenceImages`, returns a LoRA URL that can be passed to `fal-ai/flux-lora-fast-training`. Subsequent generation calls include the LoRA URL in their payload. Highest impact for brand consistency, highest implementation complexity.

5. **Audio as `asset_generate_audio`** — TTS for voiceovers, music for video assets. Low priority for static software asset generation but becomes relevant when video generation is added.

6. **3D as `asset_generate_3d`** — wraps `fal-ai/hunyuan3d-v3/image-to-3d` with the existing mark as input. Niche but architecturally clean given the existing pipeline.
