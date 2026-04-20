---
wave: 2
role: landscape-survey
slug: 34-installable-skills-survey/composio-volt-collections
title: "Composio & VoltAgent Collections — Image, Video, Audio, and Asset Generation Skills"
date: 2026-04-20
sources:
  - https://github.com/ComposioHQ/awesome-claude-skills
  - https://github.com/VoltAgent/awesome-agent-skills
  - https://github.com/VoltAgent/awesome-openclaw-skills
  - https://github.com/rohitg00/awesome-claude-code-toolkit
---

# Composio & VoltAgent Collections — Image, Video, Audio, and Asset Generation Skills

Deep-dive survey of four large curated skill collections. Focus is on every image, video, audio, SVG, diagram, canvas, icon/favicon/logo, and 3D generation skill found across all four repositories.

---

## Collection 1 — ComposioHQ/awesome-claude-skills (55k stars)

**Type:** Claude Code SKILL.md registry.  
**Total skills:** ~31 directories.  
**Media-relevant skills:** 8.  
**Install pattern:** Copy skill folder to `~/.claude/skills/<name>/` or reference via claude.ai Projects.  
**Repo:** `https://github.com/ComposioHQ/awesome-claude-skills`

### All Image / Visual / Media Skills

#### 1. `canvas-design`
- **What it does:** Generates static visual art in PNG and PDF formats. Operates in two phases: first writes an aesthetic manifesto (4–6 paragraph markdown "design philosophy"), then produces the visual using that philosophy as a constraint. Emphasizes museum-quality composition, minimal text, and abstract treatment.
- **Model/Provider:** No external API dependency documented. The skill instructs the host LLM to emit the artifact directly — it is an LLM-authoring skill, not an API-routing skill. Output is LLM-generated SVG/HTML rendered to PNG/PDF by the host.
- **API key required:** No.
- **Output formats:** PNG, PDF.
- **Primary use cases:** Posters, abstract design pieces, marketing one-pagers.
- **Gap for software asset pipelines:** No dimension control, no alpha channel, no platform safe-zone validation. Good for inspiration artifacts; not for production icons or OG images.

#### 2. `image-enhancer`
- **What it does:** Improves image quality — upscales, sharpens edges, reduces compression artifacts and noise. Supports batch processing of folders. Works with PNG and JPG. Preserves original files as backups.
- **Model/Provider:** Not specified in documentation. The skill description reads as a post-processing pipeline rather than a generation pipeline — likely wraps a local tool (Pillow / ImageMagick / waifu2x) or an unspecified API endpoint.
- **API key required:** Not documented.
- **Output formats:** PNG, JPG.
- **Primary use cases:** Screenshot cleanup for documentation, presentation image prep, social media image improvement.
- **Gap:** No transparency handling, no safe-zone, no SVG output. Cannot substitute for `asset_upscale_refine` which uses Real-ESRGAN via fal.ai.

#### 3. `slack-gif-creator`
- **What it does:** Local Python toolkit (PIL + NumPy) for creating animated GIFs optimized for Slack. Provides a `GIFBuilder` class, composable animation primitives, and validators that enforce Slack's size constraints. No external API needed.
- **Model/Provider:** Local Python only — PIL, NumPy. No image model involved; frames are drawn programmatically.
- **API key required:** No (fully local).
- **Constraints enforced:**
  - Message GIFs: ≤2MB, 480×480px optimal, 15–20 FPS, 128–256 colors, 2–5s duration.
  - Emoji GIFs: ≤64KB (strict), 128×128px, 10–12 FPS, 32–48 colors, 1–2s.
- **Validators:** `check_slack_size()`, `validate_dimensions()`.
- **Gap:** No image generation — this is a frame-assembly toolkit. Requires pre-drawn frame content.

#### 4. `theme-factory`
- **What it does:** Applies curated font + color themes to artifacts (slide decks, docs, reports, HTML landing pages). Ships 10 pre-set themes; can generate custom themes on demand.
- **Model/Provider:** No external API. The skill instructs the LLM to apply hex palette and font pairings to Claude.ai artifacts. No generation model involved.
- **API key required:** No.
- **The 10 themes:** Ocean Depths, Sunset Boulevard, Forest Canopy, Modern Minimalist, Golden Hour, Arctic Frost, Desert Rose, Tech Innovation, Botanical Garden, Midnight Galaxy. Each includes a hex palette and header/body font pairing.
- **Gap:** Artifact-only (claude.ai). Cannot apply themes to real files or design tools. No brand token export.

#### 5. `brand-guidelines` (also documented as `brand-guidelines-anthropic`)
- **What it does:** Applies Anthropic's official brand identity to claude.ai artifacts. Implements specific color palette and typography via `python-pptx` for PPTX and inline CSS for HTML artifacts.
- **Model/Provider:** No external API. LLM applies brand tokens directly.
- **API key required:** No.
- **Brand palette:**
  - Dark: `#141413`, Light: `#faf9f5`, Mid Gray: `#b0aea5`, Light Gray: `#e8e6dc`
  - Orange: `#d97757`, Blue: `#6a9bcc`, Green: `#788c5d`
- **Typography:** Poppins (Arial fallback) for headings ≥24pt; Lora (Georgia fallback) for body.
- **Gap:** Anthropic-specific. Not generalizable to arbitrary brand bundles. The prompt-to-asset `BrandBundle` concept generalizes this pattern correctly.

#### 6. `artifacts-builder` (aka `web-artifacts-builder`)
- **What it does:** Scaffolds multi-component claude.ai HTML artifacts using React 18, TypeScript, Vite/Parcel, Tailwind CSS, shadcn/ui (40+ components pre-installed). Bundles to a single self-contained HTML file (all assets inlined). Five-step workflow: init → develop → bundle → share → test.
- **Model/Provider:** No external API. Local build toolchain (Node.js, Vite, shadcn).
- **API key required:** No.
- **Gap:** Claude.ai artifacts only. Cannot produce PNG/SVG/ICO assets for production deployment.

#### 7. `imagen` (community skill, referenced in repo)
- **What it does:** Generates images via the Google Gemini image generation API. Positioned for UI mockups, icons, and illustrations.
- **Model/Provider:** Google Gemini Image Generation endpoint (Imagen 3 / Gemini Flash Image).
- **API key required:** Yes — `GEMINI_API_KEY`.
- **Critical limitation for asset pipelines:** Gemini/Imagen models use an RGB-only VAE. They render a checkerboard *as RGB pixels* — no true alpha channel is produced. Cannot be used for transparent PNG output. Background removal is required post-generation.
- **Gap:** No transparency, no vectorization, no platform packaging, no validation.

#### 8. `video-downloader`
- **What it does:** Downloads videos from YouTube and other platforms (yt-dlp wrapper). Supports format and quality selection.
- **Model/Provider:** yt-dlp CLI. No generation model.
- **API key required:** No.
- **Relevance:** Low — input acquisition, not generation.

### ComposioHQ Summary Table

| Skill | Provider | API Key? | Generates | Transparency? | SVG? | Production-ready? |
|---|---|---|---|---|---|---|
| canvas-design | LLM-authored | No | PNG, PDF art | No | No | No |
| image-enhancer | Unknown (local?) | Unknown | Enhanced PNG/JPG | No | No | No |
| slack-gif-creator | Local PIL/NumPy | No | Animated GIF | No | No | Partial (Slack-validated) |
| theme-factory | LLM artifact | No | Styled artifacts | N/A | N/A | claude.ai only |
| brand-guidelines | LLM + python-pptx | No | Branded artifacts | N/A | N/A | Artifact only |
| artifacts-builder | Local build chain | No | HTML artifacts | N/A | N/A | claude.ai only |
| imagen | Google Gemini | Yes | RGB PNG | No | No | No |
| video-downloader | yt-dlp | No | Downloaded video | N/A | N/A | Utility only |

---

## Collection 2 — VoltAgent/awesome-agent-skills (16.4k stars)

**Type:** Multi-agent skill registry. 1,100+ total skills across 70+ source repositories.  
**Media-relevant skills:** 15 (the complete fal.ai suite) plus additional providers.  
**Install pattern:** `officialskills.sh/fal-ai-community/skills/<skill-name>` for fal.ai skills; varies by repo.  
**Repo:** `https://github.com/VoltAgent/awesome-agent-skills`

### fal.ai Official Suite (15 Skills)

The fal.ai team published 15 skills through this registry. These are the most production-capable media generation skills in any of the four collections. All wrap `@fal-ai/client` and require `FAL_KEY`.

#### Image Generation

| Skill | Models Routed | Output | Notes |
|---|---|---|---|
| `fal-generate` | Flux.1 Pro, Dev, Schnell, SDXL, Imagen, DALL-E, Kling, Sora, and 100+ fal.ai models | Image or video (model-dependent) | Primary routing hub — searches models, gets schema, queues job, polls result |
| `fal-realtime` | Flux.1 Schnell Turbo / Lightning | 512–1024px PNG | Sub-second streaming via WebSocket; ~0.3s per image |
| `fal-image-edit` | Flux Inpaint, Flux Fill, IP-Adapter, ControlNet | Edited PNG | Style transfer, object removal, background swap, inpainting |

#### Image Post-Processing

| Skill | Models Routed | Output | Notes |
|---|---|---|---|
| `fal-upscale` | Real-ESRGAN, SUPIR, CCSR | 2×–4× upscaled PNG/video | Image and video resolution enhancement |
| `fal-restore` | CodeFormer, GFPGAN, BOPBTSR | Restored PNG | Deblur, denoise, face fix, document restoration |
| `fal-vision` | Florence-2, GroundingDINO, EasyOCR, LLaVA | JSON / annotated image | Object segmentation, detection, OCR, visual Q&A |

#### Video Generation & Editing

| Skill | Models Routed | Output | Notes |
|---|---|---|---|
| `fal-kling-o3` | Kling O3 (image + video) | PNG / MP4 | Kling's highest-quality model family |
| `fal-video-edit` | Flux Video, AnimateDiff, RIFE | Edited MP4 | Remix style, upscale video, remove background, add audio |
| `fal-lip-sync` | SadTalker, Wav2Lip, LivePortrait | Talking-head MP4 | Audio-to-video lip synchronization |

#### Specialized

| Skill | Models Routed | Output | Notes |
|---|---|---|---|
| `fal-3d` | TripoSR, Wonder3D, InstantMesh | GLB + multi-view PNG | 3D model generation from text or single image |
| `fal-audio` | ElevenLabs, Whisper, MusicGen | MP3, transcript text | TTS, STT, music generation |
| `fal-tryon` | CatVTON, IDM-VTON | Composited PNG | Virtual clothing try-on |
| `fal-train` | Flux.1 LoRA trainer | Trained LoRA weights | Custom model fine-tuning from image set |
| `fal-workflow` | Any chained fal.ai models | JSON workflow | Compose multi-step pipelines; returns workflow definition |
| `fal-platform` | fal.ai Admin API | JSON | Model discovery, pricing, usage metrics |

### Additional Provider Skills in awesome-agent-skills

| Skill | Provider | Generates | Notes |
|---|---|---|---|
| `openai-imagegen` | OpenAI gpt-image-1 / DALL-E 3 | PNG | Official OpenAI skill; supports `background:"transparent"` on gpt-image-1 |
| `openai-sora` | OpenAI Sora | MP4 video | Text-to-video via OpenAI API |
| `openai-speech` | OpenAI TTS | MP3 | 6 voices, HD quality |
| `openai-transcribe` | OpenAI Whisper | Text transcript | STT |
| `replicate` | All Replicate models | Varies | Generic Replicate API wrapper; model-agnostic |
| `remotion` | Remotion (React→video) | MP4 | Programmatic video creation from React components |
| `google-stitch` | Google Labs Stitch | Design walkthrough video | Converts design files to annotated video walkthroughs |

### awesome-agent-skills Summary

The fal.ai suite is the single most complete generative media skill collection across all four repositories. It covers every modality (image, video, audio, 3D) under one SDK, with correct model routing. The gap: it is a thin API wrapper. No routing logic between models, no transparency matting, no safe-zone validation, no SVG output, no platform bundle export.

---

## Collection 3 — VoltAgent/awesome-openclaw-skills (46.6k stars)

**Type:** Curated OpenClaw/ClawHub skill registry. 5,211 skills filtered from 13,729 total.  
**Image & Video Generation category:** 170–171 skills.  
**Media & Streaming category:** 85 skills (audio, video streaming, social publishing).  
**Install pattern:** `clawhub install <author>-<skill-slug>` via ClawHub CLI, or copy to `~/.openclaw/skills/`.  
**Repo:** `https://github.com/VoltAgent/awesome-openclaw-skills`

### Image Generation Skills — Full Catalog

All 166 confirmed image/video generation skills from the `categories/image-and-video-generation.md` file, organized by function:

#### Pure Image Generation (Text-to-Image)

| Skill | Install Slug | Provider | Model | Free/Paid | Cost/Image | Best For |
|---|---|---|---|---|---|---|
| `afame` | `adebayoabdushaheed-a11y-afame` | OpenAI | DALL-E (3 or gpt-image-1) | Paid | ~$0.04–0.12 | Creative illustrations, diverse styles |
| `best-image` | `pharmacist9527-best-image` | Unknown | Unknown (high quality) | Paid | ~$0.12–0.20 | Highest quality output |
| `best-image-generation` | `evolinkai-best-image-generation` | Unknown | Unknown | Paid | ~$0.12–0.20 | Highest quality output (duplicate) |
| `cheapest-image` | (slug varies) | Unknown | Unknown | Paid | ~$0.0036 | Volume generation on budget |
| `cheapest-image-generation` | (slug varies) | Unknown | Unknown | Paid | ~$0.0036 | Volume generation (duplicate) |
| `bex-nano-banana-pro` | `bextuychiev-bex-nano-banana-pro` | Replicate | Gemini 3 Pro Image | Paid | Replicate pricing | Gemini image gen via Replicate |
| `nanobanana-pro-fallback` | (slug varies) | Google AI Studio | Gemini Flash Image | Free (quota) | $0 on free tier | Zero-cost image generation |
| `beauty-generation-api` | `luruibu-beauty-generation-api` | Unknown | Unknown | Free | $0 | Free image generation service |
| `fal-ai` | (slug varies) | fal.ai | Flux, SDXL, Whisper, 100+ | Paid | fal.ai pricing | Multi-model routing via fal.ai |
| `fal-text-to-image` | (slug varies) | fal.ai | Flux family | Paid | ~$0.003–0.05 | Flux-family text-to-image |
| `grok-image-cli` | (slug varies) | xAI Grok API | Grok image model | Paid | xAI pricing | Grok-powered image generation |
| `grok-imagine-image-pro` | (slug varies) | xAI + Flux | Grok + Flux | Paid | Combined pricing | High-quality xAI/Flux hybrid |
| `openai-image-cli` | (slug varies) | OpenAI | DALL-E / gpt-image-1 | Paid | $0.04–0.12 | OpenAI image gen CLI |
| `image-gen` | (slug varies) | Multiple | Midjourney, Flux, SDXL, Nano Banana | Paid/Free | Varies | Multi-model dispatcher |
| `eachlabs-image-generation` | `eftalyurtseven-eachlabs-image-generation` | EachLabs API | Flux, GPT Image, Gemini, Imagen | Paid | EachLabs pricing | Unified multi-model image gen |
| `zenmux-image-generation` | (slug varies) | ZenMux | Proprietary (Pro/Elite) | Paid | ZenMux pricing | ZenMux commercial image API |
| `zhipu-cogview-image` | (slug varies) | Zhipu AI | CogView | Paid | Zhipu pricing | Chinese AI image generation |
| `atxp` | `emilioacc-atxp` | ATXP | Paid APIs | Paid | ATXP pricing | Web search + image + music bundle |
| `kie-ai-skill` | (slug varies) | kie.ai | Multiple unified | Paid | kie.ai pricing | Unified multi-model API gateway |
| `google-gemini-media` | (slug varies) | Google | Gemini API | Paid/Free | AI Studio quota | Gemini media generation |
| `google-imagen-3-portrait-photography` | (slug varies) | Google | Imagen 3 | Paid | Google pricing | Professional portrait photography |
| `creaa-ai` | `yys2024-creaa-ai` | Creaa API | Nano Banana 2, Sora 2, Seedance 2.0, Veo 3.1 | Paid | Creaa pricing | Multi-model image + video |
| `aikek` | (slug varies) | AIKEK | AIKEK APIs | Paid | AIKEK pricing | DeFi + image generation combo |
| `ima-all-ai` | (slug varies) | IMA | IMA image API | Paid | IMA pricing | Image, video, music bundle |
| `ollama-x-z-image-turbo` | (slug varies) | Ollama | Local model | Free (local) | $0 | Local image gen → WhatsApp |
| `saa-agent` | (slug varies) | SAA backend | Character Select | Unknown | Unknown | Character-based image generation |
| `moonfunsdk` | (slug varies) | Binance Smart Chain | AI image for meme tokens | Paid | Crypto | Meme coin image generation |

#### Avatar & Portrait Generation

| Skill | Install Slug | Provider | Specialization |
|---|---|---|---|
| `ai-avatar-generation` | `eftalyurtseven-ai-avatar-generation` | EachLabs | Avatars from photos or text |
| `ai-headshot-generation` | `eftalyurtseven-ai-headshot-generation` | EachLabs | Professional headshots from casual photos |
| `age-transformation` | `eftalyurtseven-age-transformation` | EachLabs | Age face forward/backward |
| `album-cover-generation` | `eftalyurtseven-album-cover-generation` | EachLabs | Music album cover art |
| `eachlabs-face-swap` | `eftalyurtseven-eachlabs-face-swap` | EachLabs | Face swapping between images |
| `heygen-avatar-lite` | (slug varies) | HeyGen | AI digital human video creation |
| `didit-age-estimation` | (slug varies) | Didit | Age estimation from facial image |

#### Brand, Design, and Social Asset Generation

| Skill | Install Slug | Provider | What It Generates |
|---|---|---|---|
| `opengfx` | (slug varies) | ACP or x402 | AI brand design system: logos, mascots, social assets |
| `snapog` | (slug varies) | SnapOG API | Social images and OG cards from templates |
| `canva-connect` | `coolmanns-canva-connect` | Canva Connect API | Manage Canva designs, assets, folders |
| `figma` | (slug varies) | Figma REST API | Design analysis, component export, comments |
| `kai-tw-figma` | (slug varies) | Figma REST API | Figma read/export/comments |
| `gamma` | (slug varies) | Gamma.app | AI presentations, docs, social posts |
| `youtube-thumbnail-generation` | `eftalyurtseven-youtube-thumbnail-generation` | EachLabs | YouTube thumbnail generation |
| `instagram-photo-text-overlay` | (slug varies) | Local/custom | Text overlay on photos for Instagram |
| `eachlabs-fashion-ai` | `eftalyurtseven-eachlabs-fashion-ai` | EachLabs | Fashion imagery, virtual try-on, runway videos |
| `ar-filter-generation` | `eftalyurtseven-ar-filter-generation` | EachLabs | AR filters and face effects |

#### Image Editing & Post-Processing

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `eachlabs-image-edit` | `eftalyurtseven-eachlabs-image-edit` | EachLabs (200+ AI models) | Edit, transform, upscale images |
| `eachlabs-video-edit` | `eftalyurtseven-eachlabs-video-edit` | EachLabs | Video lip sync, translation, subtitles |
| `photoshop-automator` | (slug varies) | Adobe Photoshop ExtendScript | Professional Photoshop automation |
| `adobe-automator` | `abdul-karim-mia-adobe-automator` | Adobe ExtendScript | Universal Adobe app automation |
| `image-magik-resize` | (slug varies) | ImageMagick CLI | Resize images via ImageMagick |
| `color-palette` | (slug varies) | Local | Extract HEX/RGB palette from image |
| `depth-map-generation` | `eftalyurtseven-depth-map-generation` | EachLabs | Depth map generation from images |
| `vtl-image-analysis` | (slug varies) | VTL framework | Compositional structure measurement in AI images |
| `image-detection` | (slug varies) | Local/custom | Detect AI-generated images |
| `image-hosting` | (slug varies) | img402.dev | Upload image, get public URL |

#### SVG, Format Conversion, and Diagrams

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `svg-to-image` | (slug varies) | Local | Convert SVG to PNG or JPG |
| `dxf-to-image` | (slug varies) | Local | Convert DXF to PNG, JPG, or SVG |
| `Excalidraw Flowchart` | (slug varies) | Excalidraw | Create flowcharts from descriptions |
| `ascii-art-generator` | `ustc-yxw-ascii-art-generator` | Local | ASCII art and text-based visualizations |
| `algorithmic-art` | (slug varies) | p5.js | Algorithmic art with seeded randomness |
| `mindmap-generator` | (slug varies) | Local | Visual mindmap images as PNG |
| `chart-image` | (slug varies) | Local | Publication-quality chart images from data |
| `chart-splat` | (slug varies) | Chart Splat API | Charts via Chart Splat API |
| `data-viz` | (slug varies) | Local CLI | Data visualizations from command line |
| `visualization` | (slug varies) | Local/AI | AI-driven professional data visualization |
| `qr-gen` | (slug varies) | Local | QR codes from text, URLs, WiFi, vCards |
| `pr-generator` | (slug varies) | Local | QR codes from text/URLs/images |
| `coloring-page` | (slug varies) | Local | Photo to printable B&W coloring page |

#### OCR and Document Imaging

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `tesseract-ocr` | (slug varies) | Tesseract | Text extraction from images |
| `ocr-python` | (slug varies) | Tesseract | OCR — Chinese and English |
| `opencr-skill` | (slug varies) | OpenOCR | Text from images, docs, PDFs |
| `openocr-skill` | (slug varies) | OpenOCR | Text from images, docs, PDFs (duplicate) |
| `paddleocr-doc-parsing-v2` | (slug varies) | PaddleOCR | Document parsing via PaddleOCR API |
| `zerox` | (slug varies) | Zerox library | Convert PDF/DOCX/PPTX/images to Markdown |
| `pls-office-docs` | (slug varies) | Local | Generate/manipulate PDF, DOCX, XLSX |

#### Video Generation

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `ai-video-gen` | `rhanbourinajd-ai-video-gen` | Unknown | End-to-end text-to-video |
| `eachlabs-video-generation` | `eftalyurtseven-eachlabs-video-generation` | EachLabs | Video from text/images |
| `heygen-avatar-lite` | (slug varies) | HeyGen | Digital human video |
| `creaa-ai` | `yys2024-creaa-ai` | Creaa (Sora 2, Seedance 2.0, Veo 3.1) | Multi-model image + video |
| `video-editor-ai` | (slug varies) | Local | Edit MP4, add BGM/subtitles/effects |
| `ffmpeg-video-editor` | (slug varies) | FFmpeg CLI | Generate FFmpeg commands from natural language |
| `captions` | (slug varies) | YouTube | Extract captions/subtitles from YouTube |
| `instagram-reels` | (slug varies) | Instagram | Download Reels, transcribe, extract captions |
| `subtitle-translate-skill` | (slug varies) | OpenAI-compatible LLM | Translate SRT subtitle files |

#### 3D Generation

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `cad-agent` | `clawd-maf-cad-agent` | Custom | CAD work rendering server for AI agents |
| `find-stl` | (slug varies) | 3D model database | Search and download 3D model files |

#### Audio and Music Generation

| Skill | Install Slug | Provider | Capability |
|---|---|---|---|
| `ace-music` | `fspecii-ace-music` | ACE Music | AI music via ACE-Step 1.5 — free API |
| `eachlabs-music` | `eftalyurtseven-eachlabs-music` | Mureka AI | Songs, instrumentals, lyrics, podcasts |

### Media & Streaming Category (additional 85 skills)

| Skill | Provider | Capability |
|---|---|---|
| `elevenlabs-cli` | ElevenLabs | TTS, STT, voice cloning — full CLI |
| `elevenlabs-skill` | ElevenLabs | TTS, sound effects, music, voice |
| `telnyx-tts` | Telnyx | TTS via Telnyx API |
| `voice-edge-tts` | Microsoft Edge TTS | TTS with real-time streaming |
| `mm-easy-voice` | MiniMax Voice API | Voice synthesis |
| `lb-pocket-tts-skill` | Kyutai Pocket TTS | Lightweight CPU-friendly TTS |
| `qwenspeak` | Qwen3-TTS | TTS via Qwen3-TTS over SSH |
| `audio-transcribe` | faster-whisper (local) | Voice transcription — no API key |
| `free-groq-voice` | Groq Whisper | Free voice recognition |
| `telnyx-stt` | Telnyx | Audio transcription |
| `voice-to-text` | Vosk (offline) | Offline speech recognition |
| `audio-cog` | CellCog | AI audio generation |
| `music-cog` | CellCog | AI music generation |
| `cine-cog` | CellCog | Video generation from prompt |
| `insta-cog` | CellCog | Full video production from single prompt |
| `flyworks-avatar-video` | Flyworks (HiFly) | Video generation from avatar |
| `ffmpeg-master` | FFmpeg | Video/audio processing tasks |
| `gifhorse` | GIF creation | Video dialogue search → reaction GIFs |
| `macos-local-voice` | Apple (Speech.framework) | Local STT and TTS on macOS |

### Pricing Analysis — OpenClaw Image Skills

| Tier | Skills | Cost Range | Notes |
|---|---|---|---|
| **Free** | `nanobanana-pro-fallback`, `beauty-generation-api`, `ace-music`, `ascii-art-generator`, `algorithmic-art`, `audio-transcribe`, `free-groq-voice`, `macos-local-voice`, `ollama-x-z-image-turbo` | $0 | Free-tier API or fully local |
| **Ultra-cheap** | `cheapest-image`, `cheapest-image-generation` | ~$0.0036/image | Cheapest per-image option in catalog |
| **Cheap** | `fal-text-to-image` (Flux Schnell) | ~$0.003/image | Via fal.ai Flux Schnell |
| **Mid-range** | `afame`, `openai-image-cli` (DALL-E 3) | ~$0.04–0.12/image | OpenAI standard tier |
| **Premium** | `best-image`, `best-image-generation` | ~$0.12–0.20/image | Highest declared quality |
| **Platform-priced** | EachLabs suite, ZenMux, ZhipuAI, kie.ai, ATXP | Varies | Subscription or credits |

### Best-in-Class by Use Case (OpenClaw Image Skills)

| Use Case | Best Skill | Why |
|---|---|---|
| **Cheapest per image** | `cheapest-image` | ~$0.0036/image |
| **Highest quality** | `best-image` | Highest declared quality rating |
| **Zero cost** | `nanobanana-pro-fallback` | Google AI Studio free tier, ~1500/day |
| **Most models** | `eachlabs-image-generation` | Routes to Flux, GPT Image, Gemini, Imagen |
| **Brand / logo / mascot** | `opengfx` | Dedicated brand design system skill |
| **OG images / social cards** | `snapog` | Template-based OG card generation |
| **Background removal** | `eachlabs-image-edit` | 200+ model pipeline including RMBG |
| **Video (fastest)** | `creaa-ai` | Sora 2, Seedance 2.0, Veo 3.1 access |
| **Audio TTS** | `elevenlabs-cli` | Full ElevenLabs platform CLI |
| **Free TTS** | `voice-edge-tts` | Microsoft Edge TTS, no key needed |
| **Free music** | `ace-music` | ACE-Step 1.5 free API |
| **Local image** | `ollama-x-z-image-turbo` | Fully local, no API key |
| **OCR** | `paddleocr-doc-parsing-v2` | PaddleOCR — highest accuracy |
| **SVG from image** | `dxf-to-image` (limited) | DXF→SVG conversion only |
| **Diagrams** | `Excalidraw Flowchart` | Natural language → Excalidraw |

---

## Collection 4 — rohitg00/awesome-claude-code-toolkit (1.3k stars)

**Type:** Curated toolkit index. 35 skills plus plugins. More development-focused than media-focused.  
**Media-relevant skills:** 4.  
**Install pattern:** `git clone <repo> ~/.claude/skills/<name>` or `bash install.sh`.  
**Repo:** `https://github.com/rohitg00/awesome-claude-code-toolkit`

### Image / Visual Skills Found

#### 1. `StitchFlow`
- **Install:** `git clone https://github.com/yshishenya/stitchflow && bash install.sh --target all`
- **What it does:** Converts design briefs and mockups into screens, design variants, Tailwind-compatible HTML, and screenshots for cross-agent UI workflows.
- **Provider:** LLM-authored HTML/CSS, screenshots via headless browser.
- **API key:** No.
- **Gap:** Generates HTML mockups, not production image assets. No PNG/SVG output with alpha.

#### 2. `Obsidian Theme Designer`
- **Install:** `git clone https://github.com/XiangyuSu611/obsidian-theme-designer ~/.claude/skills/obsidian-theme-designer`
- **What it does:** Visual browser-based Obsidian theme creation. Style direction, color palette, font selection, dual light/dark preview. Exports theme CSS.
- **Provider:** Browser-based preview. No external image API.
- **API key:** No.
- **Gap:** Obsidian-specific. Exports CSS, not image assets.

#### 3. `D3.js Visualization`
- **Install:** `git clone` (repo not specified)
- **What it does:** Creates interactive D3.js charts and data visualizations inside Claude Code sessions.
- **Provider:** D3.js (local, no API key).
- **API key:** No.
- **Gap:** Chart SVGs only, no raster output, no asset pipeline.

#### 4. `Iteration Layer Skills` (Image Transformation & Generation)
- **Install:** `git clone https://github.com/iterationlayer/skills ~/.claude/skills/iterationlayer-skills`
- **What it does:** Document extraction, image transformation, image generation, and document generation via Iteration Layer APIs.
- **Provider:** Iteration Layer API (third-party).
- **API key:** Yes (Iteration Layer).
- **Gap:** Closed API, unknown routing, no transparency or platform packaging.

### Rohitg00 Summary

This collection is primarily a developer upskilling toolkit. The four media skills are oriented toward design tooling and prototype workflows, not production asset pipelines. No skill in this collection touches transparency matting, safe-zone validation, vectorization, or multi-format export.

---

## Cross-Collection Analysis

### Coverage Matrix

| Capability | ComposioHQ | VoltAgent/agent-skills | OpenClaw | Rohitg00 |
|---|---|---|---|---|
| Text-to-image | imagen (Gemini) | fal-generate, openai-imagegen | 27+ skills | Iteration Layer |
| Transparent PNG | None | fal-generate (gpt-image-1 route) | None | None |
| Background removal | None | fal-image-edit | eachlabs-image-edit | None |
| SVG generation | None | None | dxf-to-image (convert only) | None |
| Vectorization | None | None | None | None |
| Video generation | video-downloader (download only) | fal-kling-o3, openai-sora, remotion | ai-video-gen, creaa-ai, cine-cog | None |
| Audio TTS | None | openai-speech, fal-audio | elevenlabs-cli, voice-edge-tts | None |
| Audio music | None | fal-audio (MusicGen) | ace-music, eachlabs-music | None |
| 3D generation | None | fal-3d (TripoSR, Wonder3D) | cad-agent, find-stl | None |
| Platform bundling | None | None | None | None |
| Safe-zone validation | None | None | None | None |
| OCR/text validation | None | fal-vision (EasyOCR) | tesseract-ocr, paddleocr | None |
| Upscaling | image-enhancer | fal-upscale (ESRGAN/SUPIR) | eachlabs-image-edit | None |
| Brand design | brand-guidelines (Anthropic only) | None | opengfx | None |
| OG image | None | None | snapog | None |
| Favicon/icon pack | None | None | None | None |

### The Single Biggest Finding

Across all four collections — representing 55k + 46.6k + 16.4k + 1.3k stars of community curation — **zero skills implement production-grade transparent PNG output with alpha validation, platform-safe-zone checking, and multi-format export bundling.**

The closest: `fal-generate` in awesome-agent-skills can route to `gpt-image-1` with `background:"transparent"`, but the returned bytes are passed directly to the user without checkerboard FFT validation, alpha channel presence check, or safe-zone bbox analysis.

---

## Top 20 Most Relevant Skills for Software Asset Pipelines

Ranked by direct utility to a developer building a software asset generation pipeline (logo → app icon → favicon → OG image → illustration).

| Rank | Skill | Collection | Provider | Why Relevant |
|---|---|---|---|---|
| 1 | `fal-generate` | VoltAgent/agent-skills | fal.ai (100+ models) | Routes to any fal.ai model — covers Flux, SDXL, Kling, Sora. Central routing hub. |
| 2 | `fal-image-edit` | VoltAgent/agent-skills | fal.ai (Flux Inpaint, ControlNet, IP-Adapter) | Inpainting, background swap — foundation of transparent asset workflow. |
| 3 | `fal-upscale` | VoltAgent/agent-skills | fal.ai (Real-ESRGAN, SUPIR) | Production upscaling — matches `asset_upscale_refine` pipeline target. |
| 4 | `fal-vision` | VoltAgent/agent-skills | fal.ai (Florence-2, EasyOCR) | OCR for wordmark Levenshtein check; object detection for safe-zone bbox. |
| 5 | `eachlabs-image-generation` | OpenClaw | EachLabs (Flux, GPT Image, Gemini, Imagen) | Widest multi-model routing in a single skill; bridges 4 major providers. |
| 6 | `nanobanana-pro-fallback` | OpenClaw | Google AI Studio / Gemini Flash Image | Zero-key free-tier image generation — critical for no-API-key users. |
| 7 | `openai-image-cli` | OpenClaw | OpenAI gpt-image-1 / DALL-E 3 | `gpt-image-1` with `background:"transparent"` is the only tested transparent PNG route in any collection. |
| 8 | `fal-3d` | VoltAgent/agent-skills | fal.ai (TripoSR, Wonder3D, InstantMesh) | visionOS 3-layer icon requires multi-view PNG → Wonder3D is the canonical route. |
| 9 | `fal-audio` | VoltAgent/agent-skills | fal.ai (ElevenLabs, MusicGen, Whisper) | Brand audio assets (jingles, notification sounds) via same SDK. |
| 10 | `opengfx` | OpenClaw | ACP / x402 | Only skill in any collection explicitly positioned for logo + mascot + social asset generation. |
| 11 | `snapog` | OpenClaw | SnapOG API | Only skill explicitly for OG card / social image generation at scale. |
| 12 | `fal-kling-o3` | VoltAgent/agent-skills | fal.ai / Kling O3 | Highest declared quality image + video in fal.ai suite — for hero images and splash screens. |
| 13 | `fal-realtime` | VoltAgent/agent-skills | fal.ai (Flux Schnell Turbo) | Sub-second streaming generation — for live preview UX in a future web UI. |
| 14 | `elevenlabs-cli` | OpenClaw | ElevenLabs | Full ElevenLabs platform: TTS, STT, voice cloning, sound effects, music. |
| 15 | `eachlabs-image-edit` | OpenClaw | EachLabs (200+ models) | Covers background removal, face enhancement, upscaling in one API. |
| 16 | `ace-music` | OpenClaw | ACE Music (ACE-Step 1.5) | Free music generation API — brand audio at zero cost. |
| 17 | `fal-video-edit` | VoltAgent/agent-skills | fal.ai (AnimateDiff, RIFE) | Video post-processing — relevant for animated splash screens. |
| 18 | `canvas-design` | ComposioHQ | LLM-authored | Design philosophy generation — useful for `asset_enhance_prompt` brief enrichment pattern. |
| 19 | `theme-factory` | ComposioHQ | LLM artifact | Brand palette + font pairing workflow — maps conceptually to `BrandBundle` token export. |
| 20 | `fal-workflow` | VoltAgent/agent-skills | fal.ai | Chain multiple fal.ai models into a single pipeline — directly relevant to multi-step asset post-processing (generate → matte → upscale). |

---

## Gaps Confirmed — What No Existing Skill Does

The following capabilities are absent from all 119 media skills surveyed across the four collections:

1. **Alpha channel validation** — No skill verifies that the returned PNG has a genuine RGBA alpha channel (vs. a checkerboard rendered as RGB pixels).
2. **Checkerboard FFT detection** — No skill runs a spatial frequency test to catch fake transparency.
3. **Platform safe-zone checking** — No skill validates that the subject's tight bbox fits within iOS 824px / Android 72dp / PWA 80% maskable zones.
4. **OCR + Levenshtein wordmark check** — No skill runs OCR on the generated asset and verifies the brand name is rendered correctly.
5. **Multi-format export bundling** — No skill produces a content-addressed `AssetBundle` with all platform variants (favicon.ico + icon.svg + apple-touch-icon + AppIconSet + PWA set).
6. **SVG authoring** — No skill in any collection authors production SVG geometry. The closest is `algorithmic-art` (p5.js generative) and `Excalidraw Flowchart` (diagram only).
7. **Vectorization pipeline** — No skill runs raster → BiRefNet matte → K-means → vtracer/potrace → SVGO.
8. **Background removal with matting** — `eachlabs-image-edit` calls a background removal model, but does not implement BiRefNet or BRIA RMBG-2.0 specifically; no post-matte alpha validation.
9. **Provider routing based on transparency requirement** — No skill routes transparent requests to `gpt-image-1` or Recraft V3 and opaque requests to cheaper models.
10. **Brand bundle parsing** — No skill parses a brand's color palette, typography, and visual language into a reusable token set for downstream generation.

These ten gaps are exactly the capabilities that prompt-to-asset implements. The survey confirms the gap is real, unaddressed by any existing installable skill, and not close to being solved by incremental improvements to the skills surveyed.
