---
wave: 2
role: synthesis
slug: 34-installable-skills-survey-synthesis
title: "Installable Skills Survey — Synthesis"
date: 2026-04-20
---

# Installable Skills Survey — Synthesis

## The Dominant Pattern: SKILL.md → CLI/SDK → Hosted API

Every media-generation skill across every collection follows one pattern with negligible variation:

```
SKILL.md
  frontmatter:
    name: flux
    description: Generate photo-realistic images using Flux.1 Pro
    trigger_phrases: [hero image, product photo, lifestyle shot]
  body:
    1. Check FAL_KEY
    2. Format prompt in Flux dialect (prose, no negative_prompt)
    3. Call fal.ai endpoint: fal-ai/flux-pro
    4. Save returned URL / bytes to disk
    5. Report file path to user
```

The skill file is a routing declaration and a dialect instruction. The actual computation happens in a hosted API. No skill in any of the surveyed collections does anything in-process beyond formatting a prompt and writing a file. This means **the quality ceiling of any skill is the quality ceiling of its backing API**. A skill that routes to Flux.1 Schnell produces draft-quality outputs; a skill that routes to Flux.1 Pro produces production-quality outputs. The SKILL.md wrapper is identical either way.

This pattern has one critical implication for prompt-to-asset: the existing skills stop at "file saved." They do not matte, vectorize, validate, package for platforms, or repair failures. That post-generation layer is prompt-to-asset's entire value proposition and is unaddressed in any surveyed collection.

---

## Why Nano Banana Dominates the "Free Tier" Category

The `kingbootoshi/nano-banana-2-skill` (347 stars for a single skill file) is the most-copied single skill pattern in the Claude Code ecosystem as of April 2026. The reason is structural, not quality-based.

**The free tier math.** Google AI Studio's free tier covers approximately 1,500 image generations per day at zero cost with `GEMINI_API_KEY`. The key is trivially obtained — Google account, no credit card, no waitlist. By contrast:

| Provider | Key acquisition | Free quota | Cost after quota |
|---|---|---|---|
| Google AI Studio (Gemini Flash Image) | Google account, instant | ~1,500 images/day | $0.039/image |
| OpenAI (gpt-image-1) | Credit card required | None | $0.04–$0.19/image |
| fal.ai (Flux.1 Pro) | Email, credit card | $1 trial credit (~5 images) | ~$0.05/image |
| Ideogram 3 | Email | 25 free/month | Paid plan |
| Recraft V3 | Email | 50 free/month | Paid plan |

For a developer exploring prompt-to-asset for the first time, Gemini Flash Image is the only option that works immediately without a credit card. This is why skills that use it are disproportionately starred relative to their code complexity.

**Quality position.** Gemini 2.5 Flash Image ("Nano Banana") held the #1 position on both the Image Edit and Text-to-Image leaderboards on LMArena with a +171 Elo lead — the largest in Arena history — on 2.5 million votes during its preview period. It is not a consolation-prize free tier model. It is one of the two best T2I models as of mid-2025, behind only Flux.1 Pro on pure photorealism and ahead of `gpt-image-1` on multi-turn editing and character consistency.

**The limitation for prompt-to-asset.** Gemini Flash Image does not produce true RGBA output. It renders the classic grey-and-white checkerboard as RGB pixels — the same architectural limit as Imagen 3/4. For logos, transparent marks, stickers, and app icons, Nano Banana is a concept/draft model only. The production path for transparent assets remains `gpt-image-1` with `background:"transparent"` or Ideogram 3 Turbo with `style:"transparent"`. The `nano-banana` skill should be presented as instant/free concept generation, not final asset output.

**Recommended positioning in prompt-to-asset.** Offer `nano-banana` as the first option when the user has no API keys at all, with an explicit "concept draft — not production-ready for transparent or vector assets" label. When `OPENAI_API_KEY` or `FAL_KEY` is present, offer it in parallel as a fast preview lane.

---

## Why fal.ai Is the Most Versatile Provider

fal.ai is the only hosted API that covers all five media modalities — image, video, audio, 3D, and realtime streaming — behind a single SDK and a single API key. This is architecturally decisive for a multi-skill system.

### Coverage comparison

| Modality | fal.ai | OpenAI | Google AI Studio | Replicate | Ideogram | Recraft |
|---|---|---|---|---|---|---|
| Text-to-image | Flux Pro/Dev/Schnell, SDXL, SD3, Recraft V3, Ideogram 3, gpt-image-1 relay | gpt-image-1 | Gemini Flash Image, Imagen 4 | Many models | Ideogram only | Recraft only |
| Image editing | Flux Kontext, IP-Adapter, ControlNet | gpt-image-1 inpaint | Gemini Flash Image | Many | Limited | Limited |
| Video | Kling 1.6, Veo 2, Sora, AnimateDiff, Wan, Hunyuan | Sora (direct) | Veo 2 (direct) | Some | None | None |
| Audio | ElevenLabs, CSM-1B, Stable Audio | TTS, Whisper | None | Some | None | None |
| 3D | TripoSR, Wonder3D, Zero123++ | None | None | Some | None | None |
| Realtime streaming | WebSocket diffusion API (Flux-schnell realtime) | None | None | None | None | None |
| Background removal | BiRefNet, BRIA RMBG-2.0 | None | None | Some | None | None |
| Upscaling | RealESRGAN, SUPIR, AuraSR | None | None | Some | None | None |

**Single key, all modalities.** A user who sets `FAL_KEY` gets: Flux.1 Pro for photorealistic hero images; Kling 1.6 for video; ElevenLabs for audio; TripoSR for 3D; BiRefNet for background removal; SUPIR for upscaling. None of the other providers come close to this breadth. OpenAI covers image only. Google covers image and video but not audio, 3D, upscaling, or matting. Replicate covers many models but has no SDK-level media pipeline — each model is a raw prediction call.

**fal.ai SDK ergonomics.** The `@fal-ai/client` npm package (and `fal-client` Python) uses a unified queue/subscribe pattern:

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/flux-pro", {
  input: { prompt, image_size: "landscape_16_9" },
  logs: true,
  onQueueUpdate: (update) => { /* progress */ },
});

const imageUrl = result.data.images[0].url;
```

The same `fal.subscribe()` call, with different endpoint IDs, drives Flux, Kling, TripoSR, SUPIR, and BiRefNet. Skill code is nearly identical across all five modalities — only the endpoint ID and the input/output field names change. This makes fal.ai the natural hub for the multi-skill architecture described in `NEW-SKILLS-ROADMAP.md`.

**fal.ai routing table for prompt-to-asset.** The existing `data/routing-table.json` in this repo should include the following fal.ai endpoint IDs as primary options:

| Asset need | fal.ai endpoint |
|---|---|
| Photorealistic image | `fal-ai/flux-pro` |
| Fast concept image | `fal-ai/flux-schnell` |
| Transparent background removal | `fal-ai/birefnet` |
| Upscaling / refinement | `fal-ai/supir` or `fal-ai/aura-sr` |
| Video from image or text | `fal-ai/kling-video` |
| Audio from text | `fal-ai/elevenlabs/tts` |
| 3D from image | `fal-ai/triposr` |
| Multi-view 3D | `fal-ai/wonder3d` |
| Recraft V3 via fal | `fal-ai/recraft-v3` |
| Ideogram 3 via fal | `fal-ai/ideogram/v3` |

---

## The Cursor Gap: No Image Generation Rules Exist

The **PatrickJS/awesome-cursorrules** collection (48k stars) is the most-starred skill-adjacent resource in the entire ecosystem. It contains thousands of `.mdc` rule files for coding style, framework conventions, testing patterns, and language idioms. It contains zero rules for image generation, asset routing, or media pipeline logic.

The reason is architectural, not an oversight. Cursor rules are context injection — they tell the LLM how to write code. They do not give the LLM a tool call surface for external APIs. When a Cursor user asks "generate a logo," Cursor can describe how to write a logo-generation script but cannot execute the generation itself without an MCP server wired into the session.

The practical implication is that **all media generation skill action is in Claude Code** (which has a richer plugin system with hooks, skills, and first-class MCP wiring) **or in Codex** (which mirrors Claude's SKILL.md format). Cursor's path to media generation is:

1. Install an MCP server via `cursor.directory` or Cursor deeplink
2. That MCP server exposes tools the LLM can call
3. Or: the user runs a CLI script that Cursor's LLM-authored code calls

The `.cursor/skills/` directory exists (same SKILL.md format as Claude Code) but is rarely used for media generation in the wild because Cursor's in-session tool call surface is narrower than Claude Code's. The `awesome-openclaw-skills` collection is Cursor/Claude agnostic by format, but most of its media skills work best in Claude Code where the hook system can gate API calls and the MCP server can be wired directly.

**Recommendation:** Ship prompt-to-asset skills primarily as Claude Code SKILL.md + plugin.json bundles. For Cursor, ship the MCP server wiring as a Cursor deeplink badge in the README and a `.cursor/rules/prompt-to-asset.mdc` that injects the routing table as always-on context, so Cursor's LLM at minimum knows to call the right endpoint when it authors generation code.

---

## Installation Pattern Comparison Across Platforms

| Platform | Install primitive | SKILL.md support | Media skill maturity | Hooks | MCP |
|---|---|---|---|---|---|
| **Claude Code** | `claude plugin install` URL or local `--plugin-dir` | Native | High (official + community) | Full lifecycle (SessionStart, PreToolUse, PostToolUse) | `plugin.json.mcpServers` |
| **OpenAI Codex** | `.agents/plugins/marketplace.json` or `/plugins` UI | Native (same format) | Medium (official `openai/skills`) | `.codex/hooks.json` (same events) | `[mcp_servers.*]` in `config.toml` |
| **Cursor** | Deeplink badge or `.cursor/skills/` drop | `.cursor/skills/` (SKILL.md shape) | Low (rules dominate; skills underused) | Separate `hooks.json` | Settings UI |
| **Windsurf** | `.windsurf/skills/` drop | `.windsurf/skills/` (SKILL.md shape) | Low | None | Settings UI |
| **Gemini CLI** | `gemini extensions install <git-url>` | Via `contextFileName` glob in `gemini-extension.json` | Low | None | `mcpServers` in manifest |
| **Cline** | Drop `.clinerules/*.md` | None (rules only) | Low | None | VS Code MCP settings |
| **Zed** | PR to `zed-industries/extensions` or `settings.json` edit | None | None | None | `context_servers` in settings |
| **v0 (Vercel)** | UI paste or BYO MCP connection | None | None (UI instructions only) | None | Hosted MCP URL |

**The SKILL.md portability claim is partially true.** The file format is accepted by Claude Code, Codex, Cursor, and Windsurf. The execution path differs: Claude Code and Codex have the richest skill activation and hook systems; Cursor and Windsurf activate skills but without lifecycle hooks; Gemini CLI ingests the file body but without the frontmatter semantics. Zed and v0 do not consume SKILL.md at all.

**The practical install path for prompt-to-asset** (derived from `21-oss-deep-dive/09-cross-ide-installers.md` and `21-oss-deep-dive/15-skills-packaging-formats.md`):

1. Primary: `claude plugin install https://github.com/...` → writes `.claude-plugin/` + skills, hooks, MCP wiring in one step.
2. Cursor: deeplink badge `cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-to-asset&config=<base64>` installs the MCP server; `.cursor/rules/prompt-to-asset.mdc` provides always-on routing context.
3. Codex: `.codex-plugin/plugin.json` mirrors the Claude plugin manifest.
4. Gemini CLI: `gemini extensions install https://github.com/...` reads `gemini-extension.json` + vacuums SKILL.md files via glob.
5. Universal: `bash <(curl -sL https://raw.githubusercontent.com/.../install.sh)` detects which IDEs are installed and writes the per-IDE adapter. Modelled on `databricks-solutions/ai-dev-kit`.
