# Nano Banana Installable Skills Survey

**Date:** 2026-04-20  
**Scope:** GitHub repos implementing Gemini image generation as installable skills for Claude Code, Codex, Cursor, or similar AI coding assistants  
**Method:** Direct file fetching via GitHub API — no fabricated content

---

## Repo 1: kingbootoshi/nano-banana-2-skill

**Stars:** 347 | **Language:** TypeScript (Bun) | **License:** MIT  
**Description:** AI image generation CLI powered by Gemini 3.1 Flash Image Preview (default) with support for Gemini 3 Pro and any Gemini model.  
**GitHub:** https://github.com/kingbootoshi/nano-banana-2-skill

### Model(s) Used

| Alias | Model ID | Notes |
|-------|----------|-------|
| `flash`, `nb2` (default) | `gemini-3.1-flash-image-preview` | Nano Banana 2 — fast, cheap |
| `pro`, `nb-pro` | `gemini-3-pro-image-preview` | **Deprecated March 9, 2026 — the README has not been updated to reflect this** |
| Any model ID | pass-through | e.g. `gemini-2.5-flash-image` |

The CLI uses `@google/genai` SDK v1.34.0. The default model resolves to `gemini-3.1-flash-image-preview`.

### Install Instructions

**Requirements:** Bun runtime, FFmpeg + ImageMagick (for transparent mode only)

```bash
git clone https://github.com/kingbootoshi/nano-banana-2-skill.git ~/tools/nano-banana-2
cd ~/tools/nano-banana-2
bun install
bun link
mkdir -p ~/.nano-banana
echo "GEMINI_API_KEY=your_key_here" > ~/.nano-banana/.env
```

As a Claude Code plugin: repository ships a `.claude-plugin/` directory with `plugin.json` and a `SKILL.md` at `plugins/nano-banana/skills/nano-banana/SKILL.md`. The skill's `/init` command automates the clone/install/link sequence.

Claude Code plugin install path: `/plugin install kingbootoshi/nano-banana-2-skill` (assumed — no marketplace.json present in plugin directory; plugin.json exists).

### What the Skill Can Do

- **Text-to-image:** Yes — core use case
- **Image-to-image (style transfer / editing):** Yes — via `--ref` flag, multiple refs supported
- **Transparent background:** Yes — green screen pipeline: prompt gets `#00FF00` background injected, then FFmpeg `colorkey` + `despill` + ImageMagick trim. Auto-detects key color from corner pixels.
- **Resolution control:** 512, 1K, 2K, 4K
- **Aspect ratios:** 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 4:5, 5:4, 21:9, 1:4, 1:8, 4:1, 8:1
- **Cost tracking:** Every generation logged to `~/.nano-banana/costs.json`; `--costs` flag prints summary

### API Key Requirements

`GEMINI_API_KEY`. Resolution order: `--api-key` flag → `GEMINI_API_KEY` env → `.env` in cwd → `.env` in repo root → `~/.nano-banana/.env`.

### Output Format

PNG (from API response MIME type). Written to disk at specified path or `nano-gen-{timestamp}.png` in cwd. No base64 returned to caller — files only.

### Trigger Phrases / Invocation

SKILL.md triggers on: "generate an image", "create a sprite", "make an asset", "generate artwork". Claude constructs and runs the `nano-banana` CLI command.

### Pricing (from code)

| Size | Flash | Pro |
|------|-------|-----|
| 512 | ~$0.045 | Flash only |
| 1K | ~$0.067 | ~$0.134 |
| 2K | ~$0.101 | ~$0.201 |
| 4K | ~$0.151 | ~$0.302 |

Cost rates hardcoded in CLI: Flash input $0.25/M tokens, image output $60/M tokens; Pro $2.0/M input, $120/M image output.

### Code Quality Assessment

**Score: 7/10**

Strengths:
- Complete, working TypeScript CLI with proper arg parsing
- Green screen pipeline is the best-documented transparency approach of all surveyed repos: auto-detects key color from corner pixels, uses FFmpeg colorkey + despill (handles color spill correctly), ImageMagick trim
- Cost tracking is real (logs to JSON, reads usageMetadata from API response)
- API key resolution chain is correct and well-ordered
- Handles multi-reference images for style transfer
- Exact dimension control via blank reference image trick

Weaknesses:
- SKILL.md still references `pro`/`nb-pro` alias that maps to `gemini-3-pro-image-preview` — that model was shut down March 9, 2026; the CLI will fail at runtime for that alias
- No input validation on prompt length
- No error recovery in the main path (throws on network failure, no retry)
- `--transparent` flag does not handle the case where FFmpeg/ImageMagick are absent gracefully enough for skill context
- Plugin ships no `marketplace.json` at the plugin root level (only inside `plugins/nano-banana/.claude-plugin/`) — install ergonomics unclear

---

## Repo 2: shinpr/mcp-image

**Stars:** 100 | **Language:** TypeScript (Node.js) | **License:** MIT  
**NPM:** `mcp-image`  
**Description:** MCP server for AI image generation and editing with automatic prompt optimization and quality presets.  
**GitHub:** https://github.com/shinpr/mcp-image

### Model(s) Used

Two-stage pipeline with separate models per stage:

| Stage | Model | Purpose |
|-------|-------|---------|
| Prompt optimization | `gemini-2.5-flash` (text-only) | Subject-Context-Style enhancement |
| Image generation (fast) | `gemini-3.1-flash-image-preview` | Default / balanced presets |
| Image generation (quality) | `gemini-3-pro-image-preview` | Quality preset — **DEPRECATED March 9 2026** |

The `GEMINI_MODELS` constants are defined in `src/types/mcp.ts`. The `quality` preset will fail at runtime because `gemini-3-pro-image-preview` is shut down.

### Install Instructions

**For Codex** (`~/.codex/config.toml`):
```toml
[mcp_servers.mcp-image]
command = "npx"
args = ["-y", "mcp-image"]
[mcp_servers.mcp-image.env]
GEMINI_API_KEY = "your_key"
IMAGE_OUTPUT_DIR = "/absolute/path/to/images"
```

**For Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "mcp-image": {
      "command": "npx",
      "args": ["-y", "mcp-image"],
      "env": {
        "GEMINI_API_KEY": "your_key",
        "IMAGE_OUTPUT_DIR": "/absolute/path/to/images"
      }
    }
  }
}
```

**For Claude Code:**
```bash
claude mcp add mcp-image --env GEMINI_API_KEY=your-key --env IMAGE_OUTPUT_DIR=/path -- npx -y mcp-image
```

**Standalone skill (no API key needed):**
```bash
npx mcp-image skills install --path ~/.claude/skills
# or ~/.cursor/skills, ~/.codex/skills
```

### What the Skill Can Do

- **Text-to-image:** Yes
- **Image-to-image editing:** Yes — `inputImagePath` param (absolute path required)
- **Transparent background:** No — not supported
- **Prompt auto-optimization:** Yes — Gemini 2.5 Flash rewrites prompts using Subject-Context-Style framework before sending to image model. Skippable via `SKIP_PROMPT_ENHANCEMENT=true`.
- **Character consistency:** Via `maintainCharacterConsistency` bool param (injects consistency markers into prompt)
- **Image blending:** Via `blendImages` bool param
- **World knowledge grounding:** Via `useWorldKnowledge` bool param
- **Google Search grounding:** Via `useGoogleSearch` bool param
- **Resolution:** 1K, 2K, 4K
- **Aspect ratios:** 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, 1:4, 1:8, 4:1, 8:1
- **Quality presets:** `fast` (Flash only), `balanced` (Flash + thinking:high), `quality` (Pro — broken as of March 2026)
- **Purpose-aware generation:** `purpose` param ("cookbook cover", "social media post") biases prompt optimizer
- **Standalone skill mode:** SKILL.md teaches prompt writing without MCP — works with any image generation tool

### API Key Requirements

`GEMINI_API_KEY` (env var or MCP config). Required — no fallback. `IMAGE_OUTPUT_DIR` (optional, defaults to `./output`).

### Output Format

PNG (or JPEG/WebP depending on API response MIME type). Files saved to `IMAGE_OUTPUT_DIR`. MCP tool returns resource URI (`file:///path/to/image.png`) plus metadata (model, processingTime, timestamp).

### Trigger Phrases / Invocation

MCP tool name: `generate_image`. Called by AI assistant when user requests image generation. SKILL.md is triggered by any image generation request. The standalone SKILL.md triggers on image prompt optimization tasks.

### Code Quality Assessment

**Score: 9/10**

Strengths:
- Highest code quality of all surveyed repos — well-structured TypeScript with proper separation of concerns (api/, business/, server/, utils/ layers)
- Comprehensive test suite: unit tests for geminiClient, structuredPromptGenerator, inputValidator, responseBuilder, errorHandler, security, config, logger, mimeUtils
- Result<T, E> monadic error handling pattern — explicit error types, no uncaught exceptions
- Security layer: sanitizes file paths, validates image file extensions, sanitizes filenames
- Two-stage prompt optimization is genuinely novel — the Subject-Context-Style system prompt is detailed and well-designed
- `analyzeResponseStructure` helper sanitizes API response for debugging without leaking base64 data
- Proper rate limit handling (429), safety filter handling (IMAGE_SAFETY, MAX_TOKENS), billing error detection (FAILED_PRECONDITION)
- Published on npm — `npx -y mcp-image` works without cloning
- SKILL.md is model-agnostic (teaches prompting, not a wrapper) — works even without the MCP server
- `purpose` param is a smart ergonomic addition

Weaknesses:
- `quality` preset maps to `gemini-3-pro-image-preview` which is dead as of March 9 2026
- `balanced` preset uses `thinkingLevel: 'high'` but the Gemini image API's thinking support for image generation is not well-documented — may silently fall back to no-thinking
- No transparent background support
- No cost tracking
- `IMAGE_OUTPUT_DIR` must be absolute — confusing error if relative path is passed

---

## Repo 3: feedtailor/ccskill-nanobanana

**Stars:** 24 | **Language:** Python | **License:** MIT  
**Description:** Claude Code skill for AI image generation using Nano Banana Pro.  
**GitHub:** https://github.com/feedtailor/ccskill-nanobanana

### Model(s) Used

Single model: `gemini-3-pro-image-preview` (Nano Banana Pro) — **DEPRECATED March 9, 2026.** The README explicitly states "Nano Banana Pro has no free tier, so billing setup is required." This repo will fail at runtime.

### Install Instructions

**Requirements:** Python 3.10+, `google-genai>=1.52.0`, `Pillow>=10.0.0`, `python-dotenv>=1.0.0`

```bash
git clone https://github.com/feedtailor/ccskill-nanobanana.git
cd ccskill-nanobanana
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY
```

Set env var for skill use:
```bash
export CCSKILL_NANOBANANA_DIR="/path/to/ccskill-nanobanana"
```

Link to a project:
```bash
mkdir -p /path/to/project/.claude/skills
ln -s $CCSKILL_NANOBANANA_DIR/.claude/skills/nano-banana-pro \
      /path/to/project/.claude/skills/nano-banana-pro
```

### What the Skill Can Do

- **Text-to-image:** Yes
- **Image-to-image (reference editing):** Yes — up to 14 reference images via `--reference` flag
- **Transparent background:** No
- **Resolution:** 1K, 2K (default), 4K
- **Aspect ratios:** 1:1, 16:9 (default), 9:16, 4:3, and others
- **Reference use cases documented:** background change, style transfer, character consistency, compositing

### API Key Requirements

`GEMINI_API_KEY` (env var or `.env` file in repo directory).

### Output Format

Auto-detected from API response MIME type (PNG/JPEG/WebP). Filename: `YYYYMMDD_HHMMSS.{ext}`. Output dir: `./generated_images` (default) or `--output` flag.

### Trigger Phrases / Invocation

SKILL.md `description` field: "Skill for image generation. Uses Google Nano Banana Pro API." Triggered when Claude Code detects an image generation need.

Command pattern: `$CCSKILL_NANOBANANA_DIR/venv/bin/python $CCSKILL_NANOBANANA_DIR/generate_image.py "prompt" [--resolution 2K] [--aspect 16:9] [--output ./dir] [--reference img.png]`

### Code Quality Assessment

**Score: 5/10**

Strengths:
- Clean Python with proper argparse
- Uses `part.as_image()` helper from Pillow integration in google-genai SDK — cleaner than raw base64 decode
- Bilingual SKILL.md (English + Japanese), shows thought for i18n
- Symlink install pattern is elegant for multi-project use

Weaknesses:
- Hardcoded to `gemini-3-pro-image-preview` which is dead as of March 9, 2026 — entire repo is non-functional
- No model fallback
- No retry logic
- SKILL.md documents the `venv/bin/python` path pattern which breaks if venv is moved
- `$CCSKILL_NANOBANANA_DIR` env var approach is fragile — if the env var is not set in the shell that Claude Code spawns, the skill silently fails
- No cost tracking
- No test for environment completeness before generation

---

## Repo 4: guinacio/claude-image-gen

**Stars:** 32 | **Language:** TypeScript (Node.js, bundled) | **License:** MIT  
**Description:** AI-powered image generation using Google Gemini, integrated with Claude Code via Skills or Claude.ai via MCP.  
**GitHub:** https://github.com/guinacio/claude-image-gen

### Model(s) Used

Default: `gemini-3-pro-image-preview` (env: `GEMINI_DEFAULT_MODEL`) — **DEPRECATED March 9, 2026.** The `CLAUDE.md` in banana-claude (same author community) notes this model is dead, but this repo is not updated.

Available image models are fetched dynamically at runtime via `fetchImageModels()` — iterates the full model list from the Gemini API, filters for names containing "image" with `generateContent` support. So the default may fail, but the dynamic list will return currently-alive models.

### Install Instructions

**Claude Code plugin (recommended):**
```bash
/plugin marketplace add guinacio/claude-image-gen
/plugin install media-pipeline@media-pipeline-marketplace
```

**Manual MCP:**
```bash
claude mcp add --transport stdio media-pipeline \
  --env GEMINI_API_KEY=your-key \
  -- node /path/to/claude-image-gen/mcp-server/build/bundle.js
```

**Manual skill copy:**
```bash
cp -r skills/image-generation ~/.claude/skills/
```

**Claude Desktop extension:** Pre-built `.mcpb` file available in releases. Install via Settings → Extensions → Advanced settings.

### What the Skill Can Do

- **Text-to-image:** Yes — MCP tool `create_asset` or CLI `cli.bundle.js`
- **Image-to-image:** No — API wrapper only sends text prompt
- **Transparent background:** No
- **Aspect ratios:** 1:1, 16:9, 9:16, 4:3, 3:2 (limited set)
- **Resolution:** No `imageSize` param — uses API default
- **Proactive invocation:** SKILL.md instructs Claude to auto-invoke when it detects placeholder images in code, empty `<section class="hero">` tags, `placeholder.jpg` references
- **Abstract tool naming:** MCP server named `media-pipeline`, tool named `create_asset` — intentionally non-obvious to force skill layer to be chosen over direct tool call
- **Model dynamic discovery:** `fetchImageModels()` uses AbortController with timeout, paginates full model list

### API Key Requirements

`GEMINI_API_KEY` (env var or MCP config). Optional: `GEMINI_DEFAULT_MODEL`, `IMAGE_OUTPUT_DIR`, `GEMINI_REQUEST_TIMEOUT_MS`, `MEDIA_PIPELINE_LOG_LEVEL`.

### Output Format

PNG (or JPEG/WebP from API). Files saved to `IMAGE_OUTPUT_DIR` (default: `./generated-images`). CLI returns structured JSON: `{"success": true, "filePath": "/abs/path/image.png"}`. MCP tool returns resource URI + structured content.

### Trigger Phrases / Invocation

SKILL.md description: "ALWAYS invoke this skill when building websites, landing pages, slide decks... Invoke IMMEDIATELY when you detect image needs." Pattern detection list in SKILL.md covers HTML placeholder patterns, CSS stock-image references. Skill uses `node "${CLAUDE_PLUGIN_ROOT}/mcp-server/build/cli.bundle.js"` — hardcoded path into plugin root.

### Code Quality Assessment

**Score: 7/10**

Strengths:
- Pre-built bundled distribution (no build step for users) — `cli.bundle.js` and `bundle.js` checked in
- `.mcpb` extension format for Claude Desktop — broadest client support
- Dynamic model discovery via API list — survives model deprecations without code changes
- AbortController timeout pattern is correct
- Intentional abstract naming (media-pipeline / create_asset) to ensure skill layer is used — thoughtful UX design
- Proactive skill invocation pattern (detect placeholder images in code) is a useful pattern
- Prompt crafting reference docs shipped with skill

Weaknesses:
- Default model hardcoded to dead `gemini-3-pro-image-preview` — will fail until env var is set to a live model
- No image-to-image support
- No `imageSize` parameter — no resolution control
- Aspect ratio set is limited (only 5 ratios)
- `${CLAUDE_PLUGIN_ROOT}` path in SKILL.md means the skill only works when installed as a plugin, not when manually copied to `~/.claude/skills/`
- No prompt optimization (unlike shinpr/mcp-image)

---

## Repo 5: dennisonbertram/claude-media-skills

**Stars:** 4 | **Language:** Bash + Python (via curl) | **License:** MIT  
**Description:** Claude Code skills for AI-powered image and video generation (Gemini + Kling).  
**GitHub:** https://github.com/dennisonbertram/claude-media-skills

### Model(s) Used

| Alias | Model ID | Notes |
|-------|----------|-------|
| `--pro` (default for 2K/4K) | `gemini-3-pro-image-preview` | **DEPRECATED March 9, 2026** |
| `--flash` | `gemini-2.5-flash-image` | Correct, still active |

The bash script hardcodes: pro → `gemini-3-pro-image-preview`, flash → `gemini-2.5-flash-image`. The flash alias is correct. Pro is dead.

### Install Instructions

```bash
cp -r nano-banana ~/.claude/skills/
cp -r realistic-ugc-video ~/.claude/skills/
```

Requires `SEGMIND_API_KEY` for Kling video, `GEMINI_API_KEY` for image generation. API key lookup: env var first, then macOS Keychain (`security find-generic-password`).

### What the Skill Can Do

**nano-banana skill:**
- **Text-to-image:** Yes
- **Image-to-image (reference):** Yes — `--reference IMAGE` flag; base64-encodes and includes in request
- **Transparent background:** No
- **Resolution:** 1K (default), 2K, 4K (auto-forces pro model — broken)
- **Aspect ratios:** 1:1, 16:9, 9:16, 4:3, 3:4
- **macOS notifications:** Yes — `osascript` notification on completion
- **Auto-opens image:** Yes — `open $OUTPUT` at end
- **Background execution:** Yes — runs in `( ... ) &` subshell
- **Keychain integration:** Reads API key from macOS Keychain as fallback

**realistic-ugc-video skill:** Separate skill for Kling video generation — out of scope for this survey.

### API Key Requirements

`GEMINI_API_KEY` (env var or macOS Keychain entry named `GEMINI_API_KEY`).

### Output Format

PNG. Saved to `~/Pictures/nano-banana/<timestamp>.png` by default. Uses `curl` + `jq` to call REST API directly, then `base64 -d` to decode.

### Trigger Phrases / Invocation

SKILL.md: "generate image", "create picture", "make illustration". SKILL.md includes a detailed prompting guide (PROMPTING.md) with Subject-Context-Style formula, lighting keywords, camera terminology, template table.

### Code Quality Assessment

**Score: 5/10**

Strengths:
- macOS UX polish: background execution + system notification + auto-open is a genuinely good user experience pattern
- Keychain integration for API key is more secure than env var / .env file
- PROMPTING.md is detailed and practical — covers hex color precision, markdown lists for requirements, negative prompt phrasing, use-case templates
- No external dependencies beyond bash, curl, jq, base64 — zero install besides `cp`
- Reference image implementation via base64 inline data in curl body

Weaknesses:
- Pro model is dead — 2K and 4K will fail (they auto-switch to pro)
- REST API call uses raw `generationConfig` without `imageConfig.imageSize` or `imageConfig.aspectRatio` — the aspect ratio and size flags are parsed but never sent to the API (they are unused in the curl body)
- `jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data'` — assumes jq is installed, no graceful fallback
- macOS-only (osascript, `open`, Keychain)
- No retry logic
- The entire skill is macOS-specific despite no platform declaration in SKILL.md

---

## Repo 6: AgriciDaniel/banana-claude

**Stars:** 308 | **Language:** Python (stdlib only for fallback) + MCP (via npx) | **License:** MIT  
**Description:** AI image generation skill for Claude Code — Creative Director powered by Gemini.  
**GitHub:** https://github.com/AgriciDaniel/banana-claude

### Model(s) Used

| Model | ID | Status |
|-------|----|--------|
| Flash 3.1 (default) | `gemini-3.1-flash-image-preview` | Active — Nano Banana 2 |
| Flash 2.5 (fallback/budget) | `gemini-2.5-flash-image` | Active |
| Pro | `gemini-3-pro-image-preview` | **DEPRECATED March 9, 2026** — CLAUDE.md explicitly notes this |

CLAUDE.md (checked in, current as of 2026-03-19) documents: "gemini-3-pro-image-preview — DEAD. Shut down March 9, 2026. Do not use." This is the only repo of the six that has been updated to reflect the model deprecation. MCP package: `@ycse/nanobanana-mcp` (third-party).

### Install Instructions

**Plugin (recommended):**
```bash
/plugin marketplace add AgriciDaniel/banana-claude
/plugin install banana-claude@banana-claude-marketplace
```

**Local test:**
```bash
git clone --depth 1 https://github.com/AgriciDaniel/banana-claude.git
claude --plugin-dir ./banana-claude
```

**Standalone:**
```bash
git clone --depth 1 https://github.com/AgriciDaniel/banana-claude.git
bash banana-claude/install.sh
# With MCP:
cd banana-claude && ./install.sh --with-mcp YOUR_API_KEY
```

**One-liner:**
```bash
curl -fsSL https://raw.githubusercontent.com/AgriciDaniel/banana-claude/main/install.sh | bash
```

### What the Skill Can Do

- **Text-to-image:** Yes — core use case
- **Image-to-image editing:** Yes — `/banana edit <path> <instructions>` via `edit.py` fallback
- **Transparent background:** Yes — green screen pipeline (prompt injection + ImageMagick chromakey) documented in `references/post-processing.md`
- **Resolution:** 512 (draft), 1K, 2K (default), 4K
- **Aspect ratios:** All 14 including extreme: 1:4, 4:1, 1:8, 8:1, 21:9 (3.1 Flash only)
- **Multi-turn creative sessions:** `/banana chat` using `gemini_chat` MCP tool
- **Batch variations:** `/banana batch <idea> [N]` — generates N variations rotating lighting/composition/style components
- **Prompt inspiration:** `/banana inspire [category]` — 2,500+ curated prompt database
- **Domain modes:** Cinema, Product, Portrait, Editorial, UI/Web, Logo, Landscape, Infographic, Abstract — each with distinct prompt emphasis
- **5-Component Formula:** Subject → Action → Location/Context → Composition → Style (including lighting)
- **Brand presets:** `~/.banana/presets/` — save brand colors, style notes; loaded before generation
- **Cost tracking:** `cost_tracker.py` logs every generation with model, resolution, prompt summary
- **Google Search grounding:** Via MCP tool parameter
- **Thinking levels:** `minimal`, `low`, `medium`, `high` via `--thinking` arg in fallback script
- **Image-only output mode:** `responseModalities: ["IMAGE"]` option
- **Post-processing:** ImageMagick recipes for platform resizing, background removal, format conversion, compositing
- **Error handling with retry:** 429 exponential backoff (max 3 retries), IMAGE_SAFETY rephrasing (user approval required), PROHIBITED_CONTENT detection (non-retryable), FAILED_PRECONDITION billing error detection
- **Fallback scripts:** `generate.py` and `edit.py` use Python stdlib only — no pip dependencies — work without MCP

### API Key Requirements

`GOOGLE_AI_API_KEY` or `GOOGLE_API_KEY` (fallback scripts). MCP package may use different env var — see `references/mcp-tools.md`. Free tier: ~5-15 RPM / ~20-500 RPD.

### Output Format

PNG (API default). Resolution depends on `imageSize` param. Files saved to `~/Documents/nanobanana_generated/banana_YYYYMMDD_HHMMSS_microseconds.png` (fallback scripts).

### Trigger Phrases / Invocation

Triggers: `/banana generate <idea>`, `/banana edit <path> <instructions>`, `/banana chat`, `/banana inspire`, `/banana batch`, `/banana setup`, `/banana preset`, `/banana cost`. Also triggers on bare `/banana` for interactive mode.

SKILL.md `description`: "Use this skill for ANY request involving image creation, editing, visual asset production, or creative direction."

### Prompt Engineering Details

SKILL.md mandates reading `references/prompt-engineering.md` and `references/gemini-models.md` before every generation. Key rules documented:
- **Banned keywords:** "8K", "masterpiece", "ultra-realistic", "high resolution" — degrade output quality; use prestigious context anchors instead
- **`imageSize` must be UPPERCASE** — lowercase silently rejected by API
- **No negative prompt param** — use semantic reframing
- **One image per call** — no batch parameter
- **`responseModalities` must include "IMAGE"** — or API returns text only

### Code Quality Assessment

**Score: 9/10**

Strengths:
- Best overall architecture of all surveyed repos for Claude Code skill use case
- CLAUDE.md is up-to-date with model deprecations as of 2026-03-19 — the only repo that has done this
- `generate.py` and `edit.py` use Python stdlib only (`urllib.request`, `base64`, `json`) — zero external dependencies for fallback path
- Domain mode routing table with specific prompt emphasis per domain
- 5-Component Formula is well-specified with concrete templates per domain
- Banned keyword list (degrade quality) and prestigious context anchor pattern are actionable
- Error handling matrix is comprehensive and explicit about retry vs non-retry behavior
- Versioning discipline: bump 4 files (plugin.json, SKILL.md, README, CITATION.cff), CHANGELOG maintained
- Post-processing reference covers green screen transparency, format conversion, platform resizing, compositing
- `imageSize` UPPERCASE requirement documented as a known API gotcha
- Brand presets are a meaningful differentiator for repeat use
- Community footer is somewhat promotional but acceptable

Weaknesses:
- Depends on third-party MCP package `@ycse/nanobanana-mcp` — not self-contained; if that package breaks, the primary execution path fails
- Fallback to direct API scripts adds complexity — two parallel code paths to maintain
- Community footer appended to every generation output adds noise to Claude's responses
- The 2,500+ prompt database referenced by `/banana inspire` is not in the repo — requires external `prompt-engine` or `prompt-library` skill
- `${CLAUDE_SKILL_DIR}` is a semantic marker Claude interprets, not a real env var — fragile in non-Claude-Code contexts

---

## Additional Repos Found (Brief Survey)

### ShinChven/nano-banana-skills (58 stars)

Not a generation wrapper. A collection of specialized domain-specific SKILL.md files for the Gemini App (not Claude Code): anime-to-life, character-reference-sheet, figure-to-life, imax-portrait, j-cover, j-idol, j-poses, photo-restoration, real-mecha. Uses the repo as "Knowledge" in a Gemini Gem. Not relevant to Claude Code/Cursor/Codex integration pattern.

### dennisonbertram (already covered above)

### yahavf6/claude-code-nano-banana-skill (6 stars)

Not fetched — likely a simple wrapper. Stars too low to prioritize over the main six.

### MADMAXITY/nano-banana-skill (3 stars)

Described as "Nano banana image generation skill and script for Claude Code." Not fetched — too minimal to add value over main six.

### vishalx360/nano-banana-skill (0 stars)

Description: "Generate, edit, and restore images using Google Gemini — from any AI agent." Not fetched.

---

## Cross-Repo Synthesis

### Model Status as of April 2026

**Critical finding:** `gemini-3-pro-image-preview` (Nano Banana Pro) was shut down by Google on March 9, 2026. Five of the six primary repos are broken or partially broken as of the survey date:

| Repo | Status |
|------|--------|
| kingbootoshi/nano-banana-2-skill | Flash works; Pro alias broken |
| shinpr/mcp-image | fast/balanced work; quality preset broken |
| feedtailor/ccskill-nanobanana | Completely broken (hardcoded to dead Pro model) |
| guinacio/claude-image-gen | Default broken; dynamic discovery may recover |
| dennisonbertram/claude-media-skills | flash alias works; pro alias broken; 2K/4K auto-selects broken pro |
| AgriciDaniel/banana-claude | Updated — uses 3.1 Flash as default, Pro listed as deprecated |

**Active models (April 2026):**
- `gemini-3.1-flash-image-preview` — Nano Banana 2, active default
- `gemini-2.5-flash-image` — Nano Banana original, active, budget option

### Transparency Approaches Compared

| Repo | Approach | Quality |
|------|----------|---------|
| kingbootoshi | Green screen → FFmpeg colorkey + despill + IM trim | Best: despill removes color spill from edges |
| banana-claude | Green screen → ImageMagick `-fuzz 20% -transparent "#00FF00"` | Good: simpler, loses edge detail |
| shinpr/mcp-image | Not supported | N/A |
| feedtailor | Not supported | N/A |
| guinacio | Not supported | N/A |
| dennisonbertram | Not supported | N/A |

The kingbootoshi green screen pipeline is the most technically correct: auto-detecting key color from corner pixels and using FFmpeg despill (reconstructs edge RGB channels by mathematically removing green contamination) produces cleaner alpha edges than ImageMagick's fuzz-based approach.

### Prompt Engineering Approaches Compared

| Repo | Approach |
|------|----------|
| shinpr/mcp-image | Two-stage: Gemini 2.5 Flash rewrites prompt using Subject-Context-Style system prompt before image generation |
| banana-claude | Claude itself constructs prompt using 5-Component Formula (Subject-Action-Location-Composition-Style) with domain mode routing |
| dennisonbertram | PROMPTING.md guide — Claude applies it manually |
| feedtailor | None — raw prompt forwarded |
| kingbootoshi | None — raw prompt forwarded (SKILL.md has Claude construct the command but doesn't specify prompt engineering) |
| guinacio | SKILL.md has prompt formula guidance; no automatic optimization |

### Installation Ergonomics Compared

| Repo | Install Method | Complexity |
|------|----------------|------------|
| shinpr/mcp-image | `npx -y mcp-image` (npm published) | Lowest: one command |
| guinacio | Plugin marketplace or `.mcpb` file | Low: plugin system or download |
| banana-claude | Plugin marketplace or `install.sh` | Low: one command |
| kingbootoshi | Clone → bun install → bun link | Medium: requires Bun runtime |
| feedtailor | Clone → python3 venv → pip install → set env var | High: manual venv + env var |
| dennisonbertram | `cp -r nano-banana ~/.claude/skills/` | Lowest for skill-only: but curl+jq+base64 deps |

### Feature Matrix

| Feature | kingbootoshi | shinpr | feedtailor | guinacio | dennisonbertram | banana-claude |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| Text-to-image | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Image-to-image | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Transparent BG | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Prompt optimization | ❌ | ✅ | ❌ | Partial | Partial | ✅ |
| Resolution control | ✅ | ✅ | ✅ | ❌ | Broken | ✅ |
| Aspect ratio control | ✅ | ✅ | ✅ | Partial | Broken* | ✅ |
| Cost tracking | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multi-turn session | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Batch generation | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Brand presets | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Post-processing | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Retry logic | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Works without MCP | ✅ | Partial** | ✅ | ✅ | ✅ | ✅ |
| Updated for March 2026 | Partial | ❌ | ❌ | ❌ | ❌ | ✅ |

\* dennisonbertram: aspect ratio parsed but never sent to API  
\*\* shinpr: standalone SKILL.md works; MCP required for actual generation

---

## Synthesis: What to Adopt for prompt-to-asset

prompt-to-asset is an MCP server that already handles logos, icons, favicons, OG images, and illustrations. The question is what patterns from these community repos are worth incorporating.

### Adopt: kingbootoshi's FFmpeg Green Screen Pipeline

The three-step transparent background approach (green screen prompt injection → FFmpeg colorkey + despill → ImageMagick trim with corner-pixel key color detection) is more correct than any ImageMagick-only fuzz approach. The `despill` filter mathematically reconstructs edge pixel colors rather than simply thresholding — this is the difference between a clean logo cutout and one with green fringe. Adopt this for `asset_remove_background` when FFmpeg is available, fall back to the BiRefNet/BRIA approach for API-based removal.

Specific implementation detail worth adopting: auto-detect key color from corner pixel histogram rather than hardcoding `#00FF00`. The AI generates near-green, not exact green.

### Adopt: shinpr's Two-Stage Prompt Pipeline Pattern

The pattern of using a cheap text model (Gemini 2.5 Flash at text-only rates) to optimize a prompt before sending it to an expensive image generation call is directly applicable to `asset_enhance_prompt`. The Subject-Context-Style system prompt in `structuredPromptGenerator.ts` is well-designed and could inform the prompt enhancement logic for illustration and OG image generation modes. The `purpose` parameter (e.g., "cookbook cover", "social media post") is a clean API surface for asset-type-aware prompt biasing.

### Adopt: banana-claude's Banned Keyword List

The explicit list of keywords that degrade Gemini output quality — "8K", "masterpiece", "ultra-realistic", "high resolution" — is directly actionable. These should be stripped from user briefs before sending to `asset_enhance_prompt`. The counter-approach (prestigious context anchors: "Vanity Fair editorial", "National Geographic cover") is a good positive framing pattern.

### Adopt: banana-claude's `imageSize` UPPERCASE Gotcha Documentation

`imageSize` values must be uppercase ("1K", "2K", "4K") — lowercase is silently rejected by the Gemini API. This is an undocumented API behavior that banana-claude's CLAUDE.md explicitly calls out. Add this as a validation check in the prompt-to-asset pipeline.

### Adopt: banana-claude's `responseModalities: ["IMAGE"]` Reminder

The observation that omitting `"IMAGE"` from `responseModalities` causes the API to return text only — not an error — is a subtle failure mode. The current prompt-to-asset server should validate that all Gemini image calls include `responseModalities: ["IMAGE"]` explicitly.

### Adopt: guinacio's Dynamic Model Discovery Pattern

The `fetchImageModels()` function that paginates the full Gemini model list and filters for image-capable models is a resilient approach to model deprecation. Rather than hardcoding model IDs, this ensures the pipeline discovers what is actually available. This should inform `asset_capabilities()` — dynamically list available Gemini image models rather than hardcoding the current known set.

### Adopt: dennisonbertram's macOS Keychain API Key Pattern (conditionally)

For users on macOS, reading the API key from Keychain (`security find-generic-password`) as a fallback to env var is more secure. The pattern is worth supporting as an optional key resolution path in the CLI tooling around the MCP server.

### Do Not Adopt: Raw Prompt Forwarding

Four of the six repos (kingbootoshi, feedtailor, guinacio in skill mode, dennisonbertram) forward user text directly to the image model without enhancement. The existing prompt-to-asset `asset_enhance_prompt` tool is already more sophisticated than any of these. Do not regress.

### Do Not Adopt: `gemini-3-pro-image-preview` References

All references to this model in any new code or documentation should be replaced with `gemini-3.1-flash-image-preview`. The model was shut down March 9, 2026. Banana-claude's CLAUDE.md is the correct reference for current model state.

### Do Not Adopt: Skill-Layer Architecture for prompt-to-asset's Core Path

The SKILL.md → bash/python script → REST API pattern used by kingbootoshi, feedtailor, and dennisonbertram is appropriate for simple one-shot generation tools but is architecturally weaker than the MCP server approach for a multi-mode pipeline (inline_svg, external_prompt_only, api) that needs to handle validation, matting, vectorizing, and bundling. The MCP server model (shinpr, guinacio, banana-claude) is the correct pattern for prompt-to-asset's architecture.

### Priority Actions for prompt-to-asset

1. **Verify `asset_capabilities()` returns live model IDs only** — strip `gemini-3-pro-image-preview` from any hardcoded list
2. **Add `imageSize` uppercase enforcement** to the Gemini API call layer
3. **Add `responseModalities: ["IMAGE"]` assertion** to all Gemini image generation calls
4. **Port kingbootoshi's corner-pixel key color detection** into the `asset_remove_background` green screen path
5. **Add banned keyword stripping** ("8K", "masterpiece", "ultra-realistic", "high resolution") in `asset_enhance_prompt` before forwarding to the image model
6. **Integrate purpose-aware prompt biasing** (shinpr's `purpose` param pattern) into `asset_enhance_prompt` — the asset_type already provides this context; ensure it is used in the prompt enhancement system prompt
7. **Dynamic model discovery** — implement a `fetchImageModels()` equivalent in `asset_capabilities()` to surface currently-active Gemini image models rather than a hardcoded list
