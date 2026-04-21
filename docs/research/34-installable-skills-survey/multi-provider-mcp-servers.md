# Multi-Provider Image Generation MCP Servers — Survey

**Date:** 2026-04-20  
**Scope:** Six named repos + awesome-mcp-servers image-gen section  
**Purpose:** Identify gap/overlap with prompt-to-asset; inform installable-skill packaging decisions

---

## 1. lansespirit/image-gen-mcp (55★)

**GitHub:** https://github.com/lansespirit/image-gen-mcp  
**Stack:** Python + UV + FastMCP  
**Install:** `git clone` → `uv sync`; Docker Compose (dev + prod configs available)

### MCP Tools (3)

| Tool | Description |
|---|---|
| `list_available_models` | Enumerate all configured providers and their parameter capabilities |
| `generate_image` | Text-to-image across OpenAI and Google providers; returns base64 + MCP resource URI |
| `edit_image` | Image-to-image edit via OpenAI `/images/edits`; accepts base64 + optional mask |

### Providers / Models

- **OpenAI:** `gpt-image-1`, `dall-e-3`, `dall-e-2`
- **Google Vertex AI / Gemini:** `imagen-4`, `imagen-4-ultra`, `imagen-3`

### Configuration

```
PROVIDERS__OPENAI__API_KEY=...
PROVIDERS__GEMINI__API_KEY=<path-to-service-account.json>
```

Both providers are independently enable/disable-able. Gemini requires a full Google Cloud service account JSON, not just an API key string.

### Architecture Highlights

- Three-tier separation: FastMCP protocol layer → provider translation layer → storage/cache layer
- Parameter translation: maps `size: "1536x1024"` → `aspectRatio` for Gemini automatically
- Dual image delivery: immediate base64 in tool response + persistent MCP resource URI
- Prompt template system with 15+ use-case presets (OG image → 1200×630, blog header → 1200×400, etc.)
- Memory + optional Redis caching; request deduplication
- Date-partitioned local storage (`storage/images/YYYY/MM/DD/`), 30-day TTL cleanup
- Rate limiter: 50 req/min default
- Prometheus/Grafana monitoring stack via Docker Compose
- Multi-transport: stdio, SSE, Streamable HTTP

> **Updated 2026-04-21:** SSE transport is deprecated in the MCP specification (2025-03-26). For new deployments of this server in remote mode, use Streamable HTTP. SSE still functions but is not recommended. Claude Code added native Streamable HTTP support for remote MCP servers (announced InfoQ June 2025); this server's Streamable HTTP mode is the correct choice for Claude Code integration.

### Limitations

- No background removal, vectorization, or validation pipeline
- Imagen models require Vertex AI project setup (not a simple API key)
- `edit_image` is OpenAI-only (Imagen does not support inpainting via this server)
- No transparent PNG routing: routes to `gpt-image-1` but the README does not document `background: "transparent"` parameter explicitly
- No Claude Code plugin wrapper; MCP-only

### Claude Code Integration

MCP-only. No SKILL.md, no slash commands. Add via standard `claude mcp add`.

---

## 2. GongRzhe/Image-Generation-MCP-Server (51★) — ARCHIVED

**GitHub:** https://github.com/GongRzhe/Image-Generation-MCP-Server  
**Status:** Archived March 2026, read-only  
**Stack:** JavaScript  
**Install:** `npx -y @smithery/cli install @GongRzhe/Image-Generation-MCP-Server` or direct NPX

### MCP Tools (1)

| Tool | Description |
|---|---|
| `generate_image` | Text-to-image via Replicate; default model `black-forest-labs/flux-schnell` |

### Providers / Models

- **Replicate:** Flux Schnell (default); any Replicate-hosted model via `MODEL` env var

### Configuration

```
REPLICATE_API_TOKEN=...
MODEL=black-forest-labs/flux-schnell   # optional override
```

### Features

- Outputs: WebP, JPG, PNG (selectable)
- Batch: 1–4 images per request
- Reproducibility: optional seed parameter
- Aspect ratios: configurable

### Limitations

- Archived — no future development
- Single provider (Replicate)
- No editing, no background removal, no vectorization
- No Claude Code plugin wrapper; MCP-only
- Replicate `negative_prompt` support depends on model — not universally safe

---

## 3. sarthakkimtani/mcp-image-gen (18★)

**GitHub:** https://github.com/sarthakkimtani/mcp-image-gen  
**Stack:** Python 3.12+  
**Install:** UV runner, configured via Claude Desktop config JSON

### MCP Tools (1)

| Tool | Description |
|---|---|
| `generate_image` | Text-to-image via Together AI; default `black-forest-labs/FLUX.1-schnell` |

### Providers / Models

- **Together AI:** Flux.1 Schnell (default); any Together AI model name accepted, falls back to default on invalid name

### Configuration

```
TOGETHER_AI_API_KEY=...
```

### Features

- Optional width/height parameters
- Clear error handling and input validation
- Automatic fallback to default model on bad model name

### Limitations

- Minimal — one tool, one provider, no editing/post-processing
- Python 3.12+ hard requirement
- No negative prompt support (Together AI Flux does not accept it — same risk as `negative_prompt` on vanilla Flux)
- No Claude Code plugin wrapper; MCP-only

---

## 4. shipdeckai/image-gen (9★)

**GitHub:** https://github.com/shipdeckai/image-gen  
**Stack:** TypeScript (Claude Code plugin, not a standalone MCP server)  
**Install:** Claude Code marketplace — `/plugin marketplace add shipdeckai/claude-skills` → `/plugin install image-gen@shipdeckai/claude-skills`

### Architecture Note

This is a **Claude Code plugin**, not an MCP server. The GitHub repo is now a landing page; the actual code lives in `shipdeckai/claude-skills`. It exposes no named MCP tools — it operates as a skill the LLM invokes directly.

### Supported Providers (10)

| Provider | Model | Stated Best Use |
|---|---|---|
| OpenAI | DALL-E 3 | General purpose, text rendering |
| BFL | FLUX.2 | Photorealism, product shots, 4K |
| Stability AI | SDXL | Controlled generation, img2img |
| Ideogram | v3 | Typography, logos, text in images |
| Google Gemini | Imagen | Multi-image composition, multimodal |
| FAL | Flux variants | Fast iteration |
| Leonardo | (unspecified) | Artistic renders, fantasy, characters |
| Recraft | v3 | Vector output, top ELO ranked |
| Replicate | Open source models | Flexibility |
| ClipDrop | (unspecified) | Upscaling, background removal, editing |

### Configuration

```
OPENAI_API_KEY=...
BFL_API_KEY=...
STABILITY_API_KEY=...
# Additional keys per provider (not all documented publicly)
```

### Features

- Automatic fallback between providers
- Claude-driven intelligent provider selection
- Full TypeScript type safety
- Native Claude Code plugin integration (no MCP config required)

### Limitations

- No explicit MCP tool surface — Claude Code only; cannot be added to Cursor/Windsurf/Cline via MCP config
- Actual plugin code is not in this repo; opaque implementation
- No stated validation/QA pipeline
- API keys required for all 10 providers to use all features; graceful degradation not documented
- Provider routing logic is closed (inside the skill, not inspectable)

---

## 5. BartWaardenburg/recraft-mcp-server (9★)

**GitHub:** https://github.com/BartWaardenburg/recraft-mcp-server  
**Stack:** TypeScript, NPX distribution  
**Install:** `npx recraft-mcp`; Docker; Smithery; `claude mcp add recraft-mcp -e RECRAFT_API_TOKEN=... -- npx -y recraft-mcp`

### MCP Tools (16)

**Generation (5)**

| Tool | Description |
|---|---|
| `generate_image` | Text-to-image with style, artistic controls |
| `image_to_image` | Transform image via prompt with adjustable strength |
| `inpaint_image` | Fill masked regions from text description |
| `replace_background` | Swap backgrounds while preserving subject |
| `generate_background` | Create background for masked area |

**Processing (5)**

| Tool | Description |
|---|---|
| `remove_background` | Output true RGBA transparency |
| `erase_region` | Seamlessly erase masked regions |
| `vectorize_image` | Convert raster to SVG |
| `crisp_upscale` | Upscale preserving sharp detail |
| `creative_upscale` | Upscale with creative enhancement |

**Styles & Account (6)**

| Tool | Description |
|---|---|
| `create_style` | Build custom style from 1–5 reference images |
| `get_style` | Retrieve custom style by ID |
| `list_styles` | Show all custom styles |
| `list_basic_styles` | Show curated style library |
| `delete_style` | Remove custom style |
| `get_current_user` | User info + credit balance |

### Providers / Models

Recraft only: `recraftv3` (default), `recraftv4`, `recraftv4_vector`, `recraftv2`, `recraft20b`, `refm1`

### Configuration

```
RECRAFT_API_TOKEN=...
RECRAFT_TOOLSETS=...        # filter enabled tool groups
RECRAFT_CACHE_TTL=...       # seconds
RECRAFT_MAX_RETRIES=...     # rate-limit retries
```

### Features

- 16 tools — most comprehensive single-provider MCP server in this survey
- Native SVG output via `vectorize_image` (Recraft V3/V4 native vector, not tracing)
- True background removal (`remove_background`) returns RGBA transparency
- Custom style training from reference images
- Tool annotations: `readOnlyHint`, open-world hints for client auto-approve
- URL and base64 image inputs both accepted
- Configurable toolset filtering (can expose only generation tools, skip account tools, etc.)

### Limitations

- Recraft API only — no fallback, no other providers
- V4 models do not support the `style` parameter
- Max 5MB input images, <16MP, ≤4096px per side
- Prompt length: ≤1000 chars (V2/V3), ≤10,000 chars (V4)
- 1–6 concurrent images per request
- Unofficial community project — not Recraft-endorsed
- No Claude Code plugin wrapper; no slash commands; MCP-only

---

## 6. artokun/comfyui-mcp (44★)

**GitHub:** https://github.com/artokun/comfyui-mcp  
**Stack:** TypeScript (Node.js ≥22), SQLite  
**Install:** `npx -y comfyui-mcp`; `claude plugin install comfyui-mcp`

### MCP Tools (31, across 13 service categories)

**Workflow Execution**
- `enqueue_workflow`, `get_job_status`, `get_queue`, `cancel_job`, `get_system_stats`

**Composition & Validation**
- `create_workflow`, `modify_workflow`, `get_node_info`, `validate_workflow`

**Management**
- Workflow library tools, image upload/extraction, model search/download, VRAM control, custom node discovery

**Diagnostics**
- `get_logs`, `get_history`, process control (`stop`/`start`/`restart`)

### Providers / Models

Local ComfyUI only. Model families supported via ComfyUI: SD1.5, SDXL, Flux, SD3, Turbo, Lightning variants. Model search/download via HuggingFace and CivitAI APIs.

### Configuration

```
COMFYUI_PORT=...        # auto-detected if omitted
COMFYUI_HOST=...        # auto-detected if omitted
COMFYUI_PATH=...        # auto-detected if omitted
CIVITAI_API_TOKEN=...   # optional, for CivitAI downloads
HUGGINGFACE_TOKEN=...   # optional, for gated models
GITHUB_TOKEN=...        # optional, avoids rate limits for skill generation
```

No image-model API keys required — this runs against a local ComfyUI instance.

### Claude Code Plugin Layer (on top of MCP)

This is the most Claude Code-native server in the survey. It has a full `.claude-plugin/` directory with:

**10 Slash Commands**

| Command | Purpose |
|---|---|
| `/comfy:gen` | Auto-select checkpoint, build workflow, return image |
| `/comfy:viz` | Visualize workflow as Mermaid diagram |
| `/comfy:node-skill` | Generate Claude skill docs for custom node packs |
| `/comfy:debug` | Diagnose workflow failures with root-cause analysis |
| `/comfy:batch` | Parameter sweep (cfg, sampler, steps, seed) |
| `/comfy:convert` | Convert between UI and API workflow formats |
| `/comfy:install` | Install custom node pack (git clone + pip) |
| `/comfy:gallery` | Browse generated outputs with metadata |
| `/comfy:compare` | Diff two workflows side by side |
| `/comfy:recipe` | Multi-step pipelines: portrait, hires-fix, style-transfer, product-shot |

**3 Autonomous Agents** (all Claude Sonnet)
- `comfy-explorer` — researches custom node packs, generates skill docs
- `comfy-debugger` — diagnoses workflow failures, proposes fixes
- `comfy-optimizer` — analyzes workflows for performance improvements

**Hooks**
- `vram-check.mjs` — pre-execution VRAM warning
- `save-warning.mjs` — workflow preservation guard
- `job-complete-notify.mjs` — execution completion notification

**Knowledge Skills**
- ComfyUI core, prompt engineering (CLIP syntax), troubleshooting patterns, model compatibility matrices

**Background Scripts**
- `monitor-progress.mjs` — real-time WebSocket progress tracking

**Generation Tracking**
- SQLite database logs all generation parameters; surfaces popular configurations

### Limitations

- Requires local ComfyUI installation — not a cloud service
- Missing custom nodes require `/comfy:install` before workflows using them work
- No built-in background removal or vectorization (can be done via ComfyUI nodes but not as named tools)
- No asset validation pipeline (no dimension checking, no alpha channel verification)
- gated HuggingFace models require token

---

## 7. Awesome-MCP-Servers Image Generation Section

**Source:** https://github.com/punkpeye/awesome-mcp-servers

### Notable servers beyond the six above

| Repo | Provider | Description |
|---|---|---|
| AceDataCloud/FluxMCP | Black Forest Labs Flux via Ace Data Cloud | Image generation and editing |
| AceDataCloud/MCPNanoBanana | NanoBanana (Gemini Nano Banana 2) | Generation + virtual try-on + product placement |
| AceDataCloud/SeedreamMCP | ByteDance Seedream | Generation and editing via Ace Data Cloud |
| doctorm333/promptpilot-mcp-server | Flux, GPT-Image-1, Imagen 4, Grok, Seedance, ElevenLabs | 20+ models; image + video + audio |
| raveenb/fal-mcp-server | fal.ai (Flux, Stable Diffusion, MusicGen) | Images, video, music |
| tasopen/mcp-alphabanana | Google Gemini (Nano Banana 2 / Pro) | Local MCP for Gemini image assets |
| ConstantineB6/comfy-pilot | Local ComfyUI | View, edit, and run node-based workflows via agent |
| jau123/MeiGen-AI-Design-MCP | Local ComfyUI + MeiGen Cloud + OpenAI-compatible | 1,500+ curated prompt library |
| codex-curator/studiomcphub | SD 3.5, GPT-Image-1, Imagen 4, Grok, Seedance | 32 creative AI tools |

### PiAPI (Midjourney / Flux / Kling)

PiAPI-1 maintains separate API wrappers for Midjourney (`MidjourneyAPI`), Kling (`KlingAPI`), Suno, Faceswap, and Dream Machine — but no unified MCP server repo was found under the `PiAPI-1` org during this survey. The org does not appear to publish an MCP server; their product is a REST API proxy to these services, which would require a custom MCP wrapper.

### Pollinations AI (free, no auth)

No dedicated MCP server repo was found under `pollinations/` or common variants. Pollinations exposes a free image generation HTTP API at `https://image.pollinations.ai/prompt/{prompt}` with no authentication — any MCP server could wrap it trivially. No community MCP wrapper with significant stars was found in this survey.

### AWS Nova Canvas

No dedicated AWS Nova Canvas MCP server was identified in the awesome-mcp-servers listing or by direct repo search. Nova Canvas would require `boto3` + Bedrock credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`). Not yet wrapped as a community MCP server.

---

## Gap / Overlap Analysis vs prompt-to-asset

### What prompt-to-asset already covers

| Capability | prompt-to-asset coverage |
|---|---|
| Transparent PNG routing | Yes — `gpt-image-1` with `background: "transparent"`, Ideogram 3 Turbo, BiRefNet matte fallback |
| Background removal | Yes — `asset_remove_background` (BiRefNet / BRIA RMBG-2.0) |
| Vectorization | Yes — `asset_vectorize` (Recraft native, vtracer/potrace, LLM SVG authoring) |
| Validation pipeline | Yes — tier-0/1/2: dimensions, alpha, FFT checkerboard, safe-zone bbox, OCR Levenshtein |
| Inline SVG authoring (no key) | Yes — `inline_svg` mode |
| External prompt + paste targets | Yes — `external_prompt_only` mode |
| Multi-provider routing | Yes — OpenAI, Ideogram, Recraft, BFL, Gemini |
| Asset-type-aware prompt enhancing | Yes — `asset_enhance_prompt` with asset_type context |
| Platform bundle export | Yes — iOS AppIconSet, PWA maskable, favicon.ico multi-res |

### Gaps prompt-to-asset does not cover

| Capability | Best candidate to fill it |
|---|---|
| **Local ComfyUI workflows** | `artokun/comfyui-mcp` — 31 tools, slash commands, agents, hooks; most complete local solution |
| **Midjourney access** | No suitable MCP server found; PiAPI is REST-only; would need custom wrapper |
| **Kling video generation** | No suitable MCP server found; PiAPI/KlingAPI is REST-only |
| **Recraft custom style training** from reference images | `BartWaardenburg/recraft-mcp-server` — `create_style` / `list_styles` / `get_style` not exposed in prompt-to-asset |
| **Recraft inpainting + background replacement** | `BartWaardenburg/recraft-mcp-server` — `inpaint_image`, `replace_background`, `generate_background` |
| **Recraft creative upscale** | `BartWaardenburg/recraft-mcp-server` — `creative_upscale` with enhancement |
| **Free / no-auth generation** | Pollinations (no MCP wrapper exists yet; trivial to add) |
| **Together AI Flux** | `sarthakkimtani/mcp-image-gen` covers it but is minimal |
| **Replicate model zoo** | `GongRzhe/Image-Generation-MCP-Server` covers it (archived but functional) |
| **Prompt template presets by use case** | `lansespirit/image-gen-mcp` has 15+ presets (social media, blog, drawing reference, etc.) |
| **Redis-backed caching + monitoring** | `lansespirit/image-gen-mcp` has Prometheus/Grafana stack |
| **Virtual try-on / product placement** | AceDataCloud/MCPNanoBanana (niche; not core to prompt-to-asset) |

### What overlaps with prompt-to-asset (redundant if prompt-to-asset is installed)

| Server | Overlapping capability |
|---|---|
| `lansespirit/image-gen-mcp` | generate_image via gpt-image-1, DALL-E, Imagen — all covered by prompt-to-asset's api mode |
| `GongRzhe/Image-Generation-MCP-Server` | Replicate Flux schnell — prompt-to-asset routes to BFL directly; Replicate is an indirect path to same models |
| `sarthakkimtani/mcp-image-gen` | Together AI Flux — same model family as BFL direct; marginal differentiation |
| `shipdeckai/image-gen` | Recraft, Ideogram, OpenAI, BFL — all in prompt-to-asset's routing table already |
| `BartWaardenburg/recraft-mcp-server` | `generate_image`, `remove_background`, `vectorize_image` — covered; the *unique* tools are `inpaint_image`, `replace_background`, custom style management |

### Priority recommendations

1. **Integrate `artokun/comfyui-mcp` as a peer dependency / optional MCP target** — local ComfyUI is the only truly free, no-API-key raster generation path for users who have GPU hardware. The 31-tool surface + slash command layer is mature enough to reference.

2. **Adopt `BartWaardenburg/recraft-mcp-server` for the 11 tools prompt-to-asset does not expose** — specifically: `inpaint_image`, `replace_background`, `generate_background`, `erase_region`, custom style training (5 tools), and `creative_upscale`. These are legitimate additions to the asset editing surface that prompt-to-asset currently skips.

3. **Wrap Pollinations for the zero-key path** — Pollinations offers `https://image.pollinations.ai/prompt/{encoded_prompt}` with no auth. A 20-line MCP tool wrapper would give `inline_svg`-class zero-barrier access for raster images. No community wrapper currently has meaningful adoption — this is a gap worth owning.

4. **Do not adopt the others as direct dependencies** — `lansespirit/image-gen-mcp` (Python, Docker overhead, overlapping providers), `GongRzhe` (archived), `sarthakkimtani` (minimal, single-provider), `shipdeckai/image-gen` (Claude Code-only, opaque) all overlap with existing prompt-to-asset capabilities without adding net-new model access.

---

## Server Comparison Matrix

| Server | Stars | Tools | Providers | Free Tier | Transparent PNG | Vectorize | Validation | Claude Code Plugin |
|---|---|---|---|---|---|---|---|---|
| lansespirit/image-gen-mcp | 55 | 3 | OpenAI, Google | No | Partial (gpt-image-1 only) | No | No | No |
| GongRzhe/Image-Gen-MCP | 51 | 1 | Replicate | No | No | No | No | No |
| sarthakkimtani/mcp-image-gen | 18 | 1 | Together AI | No | No | No | No | No |
| shipdeckai/image-gen | 9 | N/A (skill) | 10 providers | No | Unclear | Recraft path | No | Yes (CC only) |
| BartWaardenburg/recraft-mcp | 9 | 16 | Recraft | No | Yes (remove_bg) | Yes (native SVG) | No | No |
| artokun/comfyui-mcp | 44 | 31 | Local ComfyUI | Yes (local GPU) | Via nodes | Via nodes | No | Yes (full) |
| prompt-to-asset | — | 16 | 5+ (routed) | inline_svg mode | Yes (BiRefNet) | Yes (3 paths) | Yes (tier-0/1/2) | Yes (full) |
