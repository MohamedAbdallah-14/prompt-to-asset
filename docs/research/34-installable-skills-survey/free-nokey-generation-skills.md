---
wave: 2
role: free-nokey-generation-survey
slug: 34-installable-skills-survey/free-nokey-generation-skills
title: "Free / No-Key Generation Skills and MCPs — Survey for external_prompt_only and zero-key api Mode"
date: 2026-04-20
scope: "Claude Code, MCP, prompt-to-asset external_prompt_only, api mode without keys"
---

# Free / No-Key Generation Skills and MCPs

This document surveys every installable skill and MCP server that can generate images without requiring the user to supply an API key. It also covers services with genuinely free tiers and their Claude Code skill/MCP integrations.

**Why this matters for prompt-to-asset:**
- `external_prompt_only` mode needs concrete paste-target URLs where users can generate for free, right now.
- `api` mode must have at least one zero-key path so the pipeline works end-to-end without any env var configuration.

---

## 1. Pollinations.ai

### API — no key required (anonymous tier)

Pollinations.ai exposes a public HTTP GET image endpoint with no signup, no API key, and no cookie:

```
GET https://image.pollinations.ai/prompt/{url-encoded-prompt}
```

Query parameters: `width`, `height`, `seed`, `model`, `nologo=true`, `enhance`, `private`, `safe`.

**Available models (anonymous):** `flux`, `turbo`, `stable-diffusion`, `kontext` (image-to-image).

**Rate limits by tier:**

| Tier | Request rate | Auth |
|------|-------------|------|
| Anonymous | 1 req / 15 s | None |
| Seed (free registration) | 1 req / 5 s | Bearer token via auth.pollinations.ai |
| Flower (paid) | 1 req / 3 s | Bearer token |
| Nectar (enterprise) | Unlimited | Bearer token |

**Watermarks:** Starting March 31, 2025 free-tier images may carry a watermark. Registering a free Seed account removes it.

**Output format:** JPEG by default; PNG available via `model=turbo` with explicit format flag. No native alpha/transparent output. Background removal must happen post-generation (BiRefNet/BRIA pipeline).

**Quality assessment:** `flux` model at 1024×1024 produces competent raster output comparable to Flux.1 Schnell. Not suitable for text-in-image (degrades past 3 words). Not suitable for transparent marks (no alpha channel from any Pollinations endpoint).

**External paste target (external_prompt_only):** https://pollinations.ai (web UI for Flux, turbo, Kontext).

**Use in prompt-to-asset routing table:**
- Zero-key concept drafts: yes (anonymous tier)
- Transparent logo/icon: no — requires post-matte
- Text wordmark rendering: no
- SVG output: no

### 1a. MCPollinations MCP Server

**Repo:** https://github.com/pinkpixel-dev/MCPollinations (40 stars)

**Install:**
```bash
# Via Smithery (writes Claude Desktop config automatically)
npx -y @smithery/cli install @pinkpixel-dev/mcpollinations --client claude

# Or direct npx (no install required)
npx @pinkpixel/mcpollinations
```

**MCP config block:**
```json
{
  "mcpServers": {
    "mcpollinations": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/mcpollinations"]
    }
  }
}
```

**Tools exposed:**

| Tool | Description |
|------|-------------|
| `generateImageUrl` | Returns a URL string (no file write) |
| `generateImage` | Downloads and saves image to disk |
| `editImage` | Image-to-image via `kontext` model |
| `generateImageFromReference` | Style-matched generation from reference image |
| `listImageModels` | Enumerate available image models |
| `respondText` | Text generation via Pollinations text API |
| `respondAudio` | Text-to-speech, MP3 output |
| `listTextModels` | Enumerate available text models |
| `listAudioVoices` | Enumerate TTS voices |

**API key:** Optional. Works fully without one (anonymous rate limits apply). Token from auth.pollinations.ai upgrades to Seed tier (1 req/5s).

**Models available without key:** `flux`, `turbo`, `kontext`, `nanobanana`, `seedream`.

**Verdict for prompt-to-asset:** Best zero-key MCP option for raster concept generation. Wire as primary fallback in `api` mode when no `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, or `BFL_API_KEY` is set. Post-processing (BiRefNet matte) still required for transparent outputs.

### 1b. PromptPilot MCP Server

**Repo:** https://github.com/doctorm333/promptpilot-mcp-server (npm: `promptpilot-mcp`)

**Install:**
```json
{
  "mcpServers": {
    "promptpilot": {
      "command": "npx",
      "args": ["-y", "promptpilot-mcp"]
    }
  }
}
```

**Key requirement:** None for free models. `POLLINATIONS_API_KEY` (Pollinations secret key, `sk_*`) unlocks premium models.

**Claims:** 20+ models including Flux, GPT-Image-1, Imagen 4, Grok Imagine, Seedance, and ElevenLabs TTS. Free models unspecified in docs — use `list_models` tool to enumerate at runtime.

**Tools:** image generation, video generation, audio generation, model listing, prompt optimization, batch generation (up to 10 images).

**Verdict:** Slightly higher breadth than raw MCPollinations but same underlying Pollinations backend for free tier. Batch generation useful for prompt-to-asset's variant export.

### 1c. Tolerable/pollinations-claude-code Plugin

**Repo:** https://github.com/Tolerable/pollinations-claude-code (4 stars)

**Type:** Claude Code plugin (not SKILL.md; uses `--plugin-dir` flag).

**Auth model:** BYOP (Bring Your Own Pollen). Requires a Pollinations account with credits. **Not truly zero-key** — user must have funded Pollen balance.

**Claims:** 50+ models, 20+ image models, 35+ TTS voices, video generation (Veo, Seedance, Wan).

**Verdict:** Skip as a "zero-key" option. Deceptively labeled as free; actual usage requires Pollen credits. Useful only if user already has a Pollinations account.

---

## 2. Anthropic Official Skills — Algorithmic Art and Canvas Design

Both skills are in the official Anthropic skills repository at https://github.com/anthropics/skills.

### 2a. algorithmic-art

**Path:** `skills/algorithmic-art/SKILL.md`

**Technology:** p5.js loaded from CDN. Generates a single self-contained HTML artifact. No external API. No API key.

**Install:**
```bash
npx skills i anthropics/skills/skills/algorithmic-art
```

**What it generates:**
- An interactive p5.js generative art sketch in a self-contained HTML file
- Seed navigation controls (Previous/Next/Random/Jump) for reproducibility
- Parameter sidebar (sliders, color pickers) for real-time tuning
- PNG export button (downloads current canvas frame)

**Workflow:**
1. Two-phase: first write a "computational aesthetic manifesto" (`.md` file), then implement it as the p5.js algorithm replacing the marked variable sections in `templates/viewer.html`
2. Output is an `.html` artifact — not a PNG or SVG until the user exports from the browser

**Relevance to prompt-to-asset:**
- Zero-key algorithmic marks: viable for `inline_svg`-adjacent mode where the output is a browser artifact rather than a file
- Not directly usable for `asset_save_inline_svg` since output is HTML/canvas, not `<svg>`
- PNG export only (no transparency)
- Use case: concept visualization before routing to a real generation pipeline

**Verdict:** Useful for rapid, free, visual exploration. Not a production asset path — canvas raster output lacks alpha, no safe-zone guarantee, no platform packaging.

### 2b. canvas-design

**Path:** `skills/canvas-design/SKILL.md` in ComposioHQ/awesome-claude-skills AND anthropics/skills

**Technology:** Claude's native code generation; outputs PDF and PNG artifacts. No API key.

**What it generates:**
- Visual posters, design pieces, static art in `.pdf` and `.png` formats
- Font resources from local `canvas-fonts/` directory

**Workflow:** Two-phase (manifesto → artifact), same pattern as `algorithmic-art` but outputs are static documents rather than interactive sketches.

**Relevance to prompt-to-asset:**
- No alpha channel, no SVG, no platform packaging
- PDF output useful only for print/editorial context
- Weaker than `algorithmic-art` for icon/logo work

**Verdict:** Low priority. Not a generation API; it is instructing Claude's text-to-artifact capability. Useful only as last resort when no other path is available.

---

## 3. Nakkas — Zero-Key SVG Animation MCP

**Repo:** https://github.com/arikusi/nakkas (punkpeye/awesome-mcp-servers listed)

**Install:**
```json
{
  "mcpServers": {
    "nakkas": {
      "command": "npx",
      "args": ["-y", "nakkas@latest"]
    }
  }
}
```

**API key:** None. Runs entirely locally. Zero external deps.

**Technology:** The MCP server accepts a `SVGConfig` JSON object and renders it to SVG/PNG. The JSON schema has `.describe()` annotations so Claude can author valid configs without examples.

**Tools:**

| Tool | Description |
|------|-------------|
| `render_svg` | JSON config → SVG string |
| `preview` | SVG config → PNG (for visual inspection) |
| `save` | Persists output as SVG or PNG to disk |

**Capabilities:**
- CSS @keyframes and SMIL animations (no JavaScript runtime needed)
- 20+ filter presets: glow, neon, blur, drop-shadow, glitch, chromatic-aberration
- Parametric mathematical curves: rose, heart, star, spiral, wave, lissajous
- Pattern distribution groups: radial, grid, scatter, path-based
- Custom and system fonts
- Gradients, masks, clip paths, symbols

**What it cannot do:** Raster-quality photorealism, text rendering beyond simple SVG `<text>`, complex multi-color gradients that require an image model.

**Relevance to prompt-to-asset:**

This is the highest-value zero-key option for SVG mark generation aside from Claude's native inline SVG mode. It closes the gap between `inline_svg` (Claude directly authors `<svg>`) and the Recraft/vtracer vectorization path:

- Nakkas gives Claude a structured JSON-to-SVG API rather than requiring freehand SVG authoring
- The `render_svg` tool validates the config before emitting output — no malformed `<path>` bugs
- `preview` returns PNG so Claude can inspect before calling `save`
- Output is clean SVG suitable for `asset_save_inline_svg` post-processing (SVGO, viewBox normalization)

**Verdict:** Wire as an optional MCP in the prompt-to-asset plugin manifest. When Nakkas MCP is detected in `asset_capabilities()`, offer it as an alternative to freehand Claude inline SVG for `logo`, `icon_pack`, and `transparent_mark` generation.

---

## 4. YouMind-OpenLab/ai-image-prompts-skill

**Repo:** https://github.com/YouMind-OpenLab/ai-image-prompts-skill (84 stars)

**Install:**
```bash
npx skills i YouMind-OpenLab/ai-image-prompts-skill
# or
npx openskills install YouMind-OpenLab/ai-image-prompts-skill
```

**API key:** None. The skill downloads a prompt library from GitHub via `postinstall` and does keyword search locally. Sample images are fetched from YouMind's CDN (`cms-assets.youmind.com`) — requires network but no auth.

**What it does:** On request, searches a library of 10,000+ curated image generation prompts organized into 11 categories. Returns up to 3 recommended prompts with sample images. Prompts are model-agnostic but tagged for: Nano Banana Pro/2, Seedream 5.0, GPT Image 1.5, Midjourney, DALL-E 3, Flux, Stable Diffusion.

**Workflow:**
1. User asks for prompt inspiration ("show me prompts for a SaaS logo")
2. Skill keyword-searches category JSON files (never fully loads them — token-efficient)
3. Returns 3 recommendations with preview images and truncated prompt text
4. Claude customizes the selected prompt for the user's brand/content

**Relevance to prompt-to-asset:**

This is a **prompt-enhancement companion**, not a generation tool. It pairs with `external_prompt_only` mode:
- User has no API key → `external_prompt_only` mode activated
- ai-image-prompts-skill surfaces dialect-correct prompts for whichever paste target the user selects (Ideogram web, Midjourney, fal.ai playground)
- `asset_enhance_prompt` handles our own enhancement; this skill provides a curated reference library on top

**Gap:** The skill returns prompts, not images. Users still need to paste into an external tool. No generation capability, no matte, no validation.

**Verdict:** Install as a companion skill for `external_prompt_only` mode. Especially useful for users who want to explore prompt styles before committing to a generation target.

---

## 5. fal.ai Claude Code Skills (require FAL_KEY, but free $10 credit)

fal.ai is not zero-key, but new accounts receive $10 credit and the per-image cost is low enough that it functions as near-free for early exploration:

| Model | Cost | Notes |
|-------|------|-------|
| Flux.1 Schnell | ~$0.003/image | Fastest; lowest quality |
| Flux.1 Dev | ~$0.025/image | Best Flux quality |
| Flux.1 Pro | ~$0.05/image | Highest Flux quality |
| Seedream V4 | $0.03/image | Strong for portraits |
| Nanobanana | $0.04/image | Google Nano Banana 2 |
| Qwen | $0.02/megapixel | Budget raster |

**analyticalmonk/fal-ai-skill:**
- **Repo:** https://github.com/analyticalmonk/fal-ai-skill (7 stars)
- **Install:** `/plugin marketplace add analyticalmonk/fal-ai-skill` then `/plugin install fal@fal-ai-skill`
- **Models:** Flux, NanoBanana, Ideogram, Veo, Kling, ElevenLabs TTS, Whisper STT
- **Key:** `FAL_KEY` required
- **Capabilities:** Image gen, video gen (text-to-video + image-to-video), audio TTS/STT, image manipulation (inpaint, style transfer, background removal, upscale)
- **Verdict:** Most complete fal.ai skill for Claude Code. Covers image + video + audio in one plugin. The image-editing and background-removal tools are directly relevant to post-generation pipeline.

**art-direct skill (nraford7/art-direct):**
- **Repo:** https://github.com/nraford7/art-direct (3 stars)
- **Models:** Flux 2 Pro, Recraft V3, Ideogram V2
- **Key:** `FAL_API_KEY` for generation; prompt-only mode works without key
- **Unique:** Five-Lens Framework (Literal, Human, Environmental, Metaphorical, Oblique) for visual direction — useful as a complementary analysis step before generation
- **Verdict:** Useful for `external_prompt_only` mode — can generate prompt direction without a key, then hand off to user for generation.

---

## 6. D3.js and Code-Native Visualization Skills

These are zero-key code-generation skills (no image model), but they produce visual artifacts.

**chrisvoncsefalvay/claude-d3js-skill:**
- **Repo:** https://github.com/chrisvoncsefalvay/claude-d3js-skill
- **Type:** SKILL.md; teaches Claude to write D3.js visualizations
- **API key:** None
- **Output:** Interactive SVG-based charts and data visualizations rendered in browser
- **Relevance:** Out of scope for prompt-to-asset (data visualization, not asset generation)

---

## 7. IcoGenie MCP — Near-Free SVG Icon Generation

**Repo:** https://github.com/albertnahas/icogenie-mcp

**API key:** No traditional API key. Requires browser auth (saved token). Free tier via daily credit claim.

**Free tier:** `claim_daily_credits()` gives 2 free credits/day. Generating a single icon costs 1–5 credits. Effectively 0–2 free icons/day.

**Technology:** Hosted service (icogenie.xyz). Generates production-ready SVG icons from text descriptions.

**Tools:** generate single icon, generate bundle, regenerate with refinement prompt, library management.

**Styles:** `solid` or `outline`.

**Verdict:** Low free allowance (2 credits/day) makes it unsuitable as a primary path. Viable as a "last resort" icon generation option when a user wants a real SVG icon and has no other key. Not useful for batch/icon_pack generation.

---

## 8. Pollinations via PromptPilot — Free Model List Detail

PromptPilot (`npx promptpilot-mcp`) wraps Pollinations and claims 20+ models, some free. The exact free vs. paid split is not documented; it requires calling `list_models` at runtime. Based on Pollinations' own tiering:

**Confirmed free (no key):** `flux`, `turbo`, `stable-diffusion`, `kontext`

**Likely free (Seed-tier only):** `nanobanana`, `seedream`, `grok` (requires free registration at auth.pollinations.ai)

**Paid (Flower/Nectar):** `gpt-image-1`, `imagen-4` (requires paid Pollinations account)

---

## Summary Table — Free / No-Key Generation Options

| Option | Type | Key required | Image quality | Transparent output | SVG output | Install |
|--------|------|-------------|---------------|-------------------|-----------|---------|
| Pollinations anonymous (GET) | HTTP API | None | Medium (Flux/turbo) | No | No | URL only |
| MCPollinations MCP | MCP server | None (optional Seed token) | Medium | No | No | `npx @pinkpixel/mcpollinations` |
| PromptPilot MCP | MCP server | None for free models | Medium | No | No | `npx promptpilot-mcp` |
| Nakkas MCP | MCP server | None | N/A (SVG, not raster) | Yes (SVG native) | Yes | `npx nakkas@latest` |
| algorithmic-art skill | Claude skill | None | N/A (p5.js canvas) | No (PNG export only) | No | `npx skills i anthropics/skills/skills/algorithmic-art` |
| canvas-design skill | Claude skill | None | N/A (PDF/PNG artifact) | No | No | `npx skills i ComposioHQ/awesome-claude-skills/canvas-design` |
| ai-image-prompts-skill | Claude skill | None | N/A (prompts only) | N/A | N/A | `npx skills i YouMind-OpenLab/ai-image-prompts-skill` |
| IcoGenie MCP | MCP server | Browser auth + 2 credits/day free | High (hosted SVG) | Yes (SVG) | Yes | npm install per icogenie-mcp docs |
| fal-ai-skill (analyticalmonk) | Claude plugin | FAL_KEY ($10 free credit) | High | No (needs post-matte) | No | `/plugin install fal@fal-ai-skill` |
| art-direct skill | Claude skill | FAL_API_KEY (optional) | High | No | No | `git clone + cp` |

---

## Recommendations for prompt-to-asset Integration

### external_prompt_only mode — new paste targets

Add these to the `paste_targets` list returned by `asset_enhance_prompt`:

| Target | URL | Free | Best for |
|--------|-----|------|---------|
| Pollinations web (Flux) | https://pollinations.ai | Yes, anonymous | Concept raster, hero images |
| Pollinations web (Kontext) | https://pollinations.ai/?model=kontext | Yes, anonymous | Image-to-image edits |
| Pollinations text | https://text.pollinations.ai | Yes, anonymous | Not asset generation |

### api mode — zero-key fallback chain

When `asset_capabilities()` finds no `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, or `BFL_API_KEY`, apply this fallback chain:

1. **MCPollinations MCP detected** → use `generateImage` tool with model `flux` or `turbo`. Works anonymously at 1 req/15s. Post-processing required for alpha.
2. **MCPollinations not detected, Nakkas MCP detected** → for `logo`, `favicon`, `icon_pack`, `transparent_mark`: route to Nakkas `render_svg`. For raster asset types: cannot proceed, fall back to inline_svg.
3. **Neither MCP detected** → fall back to `inline_svg` mode (Claude authors `<svg>` directly). Report to user that no generation API is available.

### New skill to build: `pollinations-mcp` wrapper skill

A lightweight SKILL.md that:
- Detects MCPollinations in the MCP environment
- Accepts a brief and asset_type
- Routes `logo`, `transparent_mark`, `favicon`, `icon_pack` to Nakkas (if available) or inline SVG
- Routes `illustration`, `og_image`, `hero`, `splash_screen` to MCPollinations `generateImage` with `model: "flux"`
- Returns asset path

This closes the zero-key `api` mode gap without requiring any env var from the user.

### New skill to build: `ai-image-prompts` companion integration

Integrate `YouMind-OpenLab/ai-image-prompts-skill` into the `external_prompt_only` workflow:
- After `asset_enhance_prompt` generates the enhanced prompt, call the prompts skill to surface 1–2 reference prompts from the 10k library for the same asset_type
- Present both (our enhanced prompt + curated reference) so the user can compare before pasting into Ideogram/Midjourney/Pollinations

### Nakkas wiring in asset_capabilities

Add a Nakkas detection check to `asset_capabilities()`:
```
nakkas_mcp: boolean — true if "nakkas" key found in MCP server list
```

When `nakkas_mcp: true`, add `inline_svg_structured` as a fourth mode option for `logo`, `favicon`, `icon_pack`, `transparent_mark`. The structured mode calls Nakkas `render_svg` with an LLM-authored SVGConfig JSON rather than freehand `<svg>` authoring. Quality bar is higher because the schema enforces valid geometry.

---

## What Does Not Exist (Confirmed Gaps)

After this survey, the following combinations have no installable skill or MCP:

1. **Free Hugging Face Inference API → Claude Code skill:** Zero public repositories found. HF Inference API has a free tier but no one has wrapped it in a SKILL.md or MCP for Claude Code.

2. **Together AI → Claude Code skill:** Together AI's GitHub org has no public repos. No SKILL.md found in any collection that uses Together AI's image generation (which does have a free $1 starter credit and supports Flux Schnell/SDXL).

3. **p5.js Claude Code skill (standalone):** No repository found on GitHub combining `p5.js` + `claude code` + `skill`. The Anthropic `algorithmic-art` skill is the only p5.js-based option, and it is template-bound to Anthropic's viewer.html.

4. **Replicate → Claude Code skill:** `replicate-mcp` appears in punkpeye/awesome-mcp-servers as an MCP server, but no SKILL.md-format Claude Code skill for Replicate image generation exists in any surveyed collection. Replicate requires an API key (`REPLICATE_API_TOKEN`); there is no free tier.

5. **Transparent PNG via Pollinations:** No Pollinations endpoint (anonymous or authenticated) produces true RGBA output. The VAE is RGB-only. Any transparent asset from Pollinations requires BiRefNet/BRIA post-processing.

---

## Rate Limit Reference for External Paste Targets

For `external_prompt_only` mode documentation presented to users:

| Service | Free limit | Registration required |
|---------|-----------|----------------------|
| Pollinations.ai (web) | 1 req/15s (anonymous) | No |
| Pollinations.ai (web, Seed) | 1 req/5s | Free signup |
| Ideogram.ai (web) | ~10 images/day free | Yes |
| Google AI Studio (Imagen 4) | ~50 images/day free | Google account |
| fal.ai playground | $10 credit (~200–3000 images) | Yes |
| Midjourney | No free tier (was removed) | Paid only |
| Recraft.ai (web) | 50 free images/month | Yes |
| Together.ai | $1 free credit (~333 Flux Schnell images) | Yes |
