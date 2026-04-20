---
wave: 2
role: repo-deep-dive
slug: 04-shinpr-mcp-image
title: "Deep dive: shinpr/mcp-image"
repo: "https://github.com/shinpr/mcp-image"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/shinpr/mcp-image
  - https://raw.githubusercontent.com/shinpr/mcp-image/main/README.md
  - https://raw.githubusercontent.com/shinpr/mcp-image/main/src/index.ts
  - https://raw.githubusercontent.com/shinpr/mcp-image/main/src/server-main.ts
  - https://raw.githubusercontent.com/shinpr/mcp-image/main/src/business/structuredPromptGenerator.ts
  - https://dev.to/shinpr/from-49-to-95-how-prompt-engineering-boosted-gemini-mcp-image-generation-19n8
  - https://dev.to/shinpr/how-i-built-an-image-generation-mcp-server-with-gemini-25-flash-image-aka-nano-banana-17aa
  - https://mcpservers.org/servers/shinpr/mcp-image
  - https://playbooks.com/mcp/shinpr/mcp-image
  - https://www.npmjs.com/package/mcp-image
tags: [mcp, image, prompt-optimizer, subject-context-style]
---

# Deep dive: `shinpr/mcp-image`

## 1. Repo metrics and license

TypeScript MCP server, ~100★, 0 forks, 24 tagged releases (latest `v0.10.0` as of 2026). Node 22+. **MIT** license (commercially clean). Published to npm as [`mcp-image`](https://www.npmjs.com/package/mcp-image), invoked via `npx -y mcp-image`. Top dependencies: `@modelcontextprotocol/sdk` (stdio transport + server primitives), `@google/generative-ai`, Zod. Notable shape: one npm package ships **both** a stdio MCP server **and** an installable Agent Skill (`npx mcp-image skills install --path <dir>` drops a `SKILL.md` into `~/.cursor/skills` / `~/.codex/skills` / `~/.claude/skills`) — the only repo in the image-MCP cohort doing this.

## 2. Transport, tool schema, tools exposed

**Transport: stdio only.** `src/server-main.ts` connects `StdioServerTransport` directly — no Streamable HTTP / SSE, no auth. Install recipes for Cursor/Codex/Claude Code all configure `command: "npx", args: ["-y", "mcp-image"]`. Same shape as LogoLoom, `mcp-logo-gen`, `niels-oz/icon-generator-mcp`: local spawn, env-var API key, no HTTP, no OAuth. This is the "existing logo-MCP" pattern from [20e](../20-open-source-repos-landscape/20e-agent-native-webapps-and-gap-analysis.md), not the Figma/Linear/Gamma hosted one.

**Tool surface: a single tool, `generate_image`.** README: "Single tool that handles all image operations." It covers text-to-image, image-to-image editing, and implicit prompt optimization from the same call. Parameters (from the README API reference):

- `prompt` (string, required), `quality` (`fast` / `balanced` / `quality`), `inputImagePath` (absolute; triggers edit mode; PNG/JPEG/WebP ≤10 MB), `fileName`, `aspectRatio` (14 presets from `1:1` to `1:8` / `8:1`), `imageSize` (`1K`/`2K`/`4K`).
- Four semantic flags that also feed the optimizer: `blendImages`, `maintainCharacterConsistency`, `useWorldKnowledge`, `useGoogleSearch`.
- `purpose` — free-text intended-use string ("cookbook cover", "social media post").

Response is a standard MCP `resource` block with a `file://` URI to the saved PNG/JPEG/WebP plus `metadata` (`model`, `processingTime`, `timestamp`). **No in-band base64**; every output is a file on disk at `IMAGE_OUTPUT_DIR`. Env-only config: `GEMINI_API_KEY`, `IMAGE_OUTPUT_DIR`, `IMAGE_QUALITY`, `SKIP_PROMPT_ENHANCEMENT` (optimizer kill switch). No config file, no runtime reconfig tool.

## 3. The Subject–Context–Style prompt optimizer (enumerated)

This is the part that earned the repo its reputation — and the part we should read carefully. The optimizer lives in `src/business/structuredPromptGenerator.ts` and runs as stage 1 of the two-stage pipeline (Gemini 2.5 / 2.0 Flash for rewriting → Nano Banana 2 or Pro for generation). The `dev.to` writeup reports the upgrade from ad-hoc rewriting to this framework moved their internal score from **49/100 to 95/100**, driven by Spatial Logic (2→20) and Scene Consistency (1→10) — a measurable, not vibes-based, +94% gain.

### 3a. The system prompt

The `SYSTEM_PROMPT` constant in `structuredPromptGenerator.ts` is the canonical artifact. Compressed:

> Transform user requests into rich, detailed prompts. Structure around three elements: **SUBJECT (What)** — physical characteristics, textures, materials, scale, actions, distinctive features; **CONTEXT (Where/When)** — setting, spatial relationships (foreground/midground/background), time, weather, mood; **STYLE (How)** — artistic approach (specific artists, movements, styles), lighting design (direction, quality, color temperature, shadows), camera/lens (focal length, aperture, angle).
>
> Core principles: **Add visual details only in areas the user left unspecified; keep all user-specified elements unchanged.** Focus on what should be present, not absent. Include photographic/artistic terminology. Output as a single flowing description, not a list.

This is Google's own Imagen prompt guide ("subject, context, style" from the Vertex AI docs) welded to Phil Schmid's 7 best practices. It is not novel — it is a careful, opinionated transcription of vendor guidance.

### 3b. Editing mode — image-aware rewriter

When `inputImagePath` is set, the optimizer **appends** `IMAGE_EDITING_CONTEXT` ("Analyze visual context… preserve original characteristics… use phrases like 'maintain the existing…', 'preserve the original…'") to the system prompt **and passes the base64-encoded input image into the Gemini Flash rewriter call itself** (`inputImage` in the config). This is the key multimodal detail the dev.to post calls out: the optimizer sees the image, not just the instruction, so "edit the anime girl to face right" doesn't flatten into a photorealistic rewrite.

### 3c. Slot-fill logic — `FeatureFlags`

`buildEnhancedFeatureContext` conditionally injects mandatory `MUST`-blocks into the user turn based on flags piped through from the tool parameters:

- `maintainCharacterConsistency` → "MUST include at least 3 recognizable visual markers… use 'signature', 'distinctive', 'always wears/has'".
- `blendImages` → "MUST describe spatial and visual integration: overlap, reflection, shared lighting, color echo… define foreground (X% of frame), midground, background with relative scales".
- `useWorldKnowledge` → "MUST incorporate authentic details — 'traditional [culture] style', 'authentic [location] architecture', 'historically accurate [period]'".
- `purpose` (free text) → a separate `INTENDED USE: …\nTailor the visual style, quality level, and details to match this purpose.` line is prepended.

Each flag is a **slot-toggled hard constraint**, not a soft hint. Call runs at `temperature: 0.7, maxTokens: 1000`.

### 3d. "Selected practices" — inferred telemetry

`inferSelectedPractices` does a post-hoc lowercase substring scan of the *rewritten* prompt for keyword buckets ("lighting/texture" → Hyper-Specific Details; "lens/aperture/mm/angle" → Camera Control Terminology; "mood/emotion/ambiance" → Atmospheric Enhancement; etc.) and returns the list in `selectedPractices`. It is telemetry, **not** control flow — the model's behavior is not gated on it.

### 3e. Pipeline cost (author's own measurements)

Rewriter ~2.4 s, 187 → 821 chars (~4.4× expansion); kept under 500 tokens because Gemini 2.5 Flash Image "starts struggling past 1000". Generator 5–10 s base, ~30–40 s end-to-end on `fast`. `SKIP_PROMPT_ENHANCEMENT=true` bypasses stage 1 entirely.

## 4. Provider support

**Gemini only.** Every model in the stack is a Google model: `gemini-2.5-flash` / `gemini-2.0-flash` for rewriting; `gemini-3.1-flash-image-preview` ("Nano Banana 2") with optional thinking tokens for `fast`/`balanced`; `gemini-3-pro-image` ("Nano Banana Pro") for `quality`. No OpenAI (`gpt-image-1`), no Google Imagen-4 REST endpoint, no fal, no Replicate, no Together, no Recraft, no Ideogram. A user who wants Imagen 4, Flux, or SDXL has to pick a different MCP.

This is a **deliberate narrowing**, not an oversight: the README is explicit that the product is a wrapper around Nano Banana with its own opinionated prompt discipline. The comparable OSS servers split cleanly on this axis — `mcp-logo-gen` is fal-only, Recraft's server is Recraft-only, LogoLoom is OpenAI/Flux-via-OpenAI, `niels-oz/icon-generator-mcp` is OpenAI `gpt-image-1`. None of them route.

## 5. Asset-awareness

**None, by design.** `mcp-image` is a photorealism-first generalist with no concept of asset-type beyond the free-text `purpose` string.

- **Transparency**: no RGBA. No `transparent` flag, no alpha contract, no `rembg`/matting step. The rewriter's "focus on what should be present, not absent" rule actively discourages transparency framing. Nano Banana has no first-class alpha at the API level today.
- **Platform specs**: `aspectRatio` + `imageSize` (1K/2K/4K) are the only sizing knobs. No iOS `AppIcon.appiconset`, favicon pack, or PWA splash generator; always a single file. No `capacitor-assets`, `pwa-asset-generator`, `npm-icon-gen` anywhere in the tree.
- **Text rendering**: acknowledged, not enforced. The entire README guidance is "use `imageSize: "4K"` when text clarity matters" — buy quality by tier, don't lint the output.
- **Brand**: no brand-bundle input (`brand.md`, `brandspec`, AdCP `brand.json`), no palette or font tokens, no reference-image style lock. `blendImages` is a compositional hint, not IP-Adapter-style injection.

For the gaps we care about — transparency (INDEX #2), platform-spec bridge (G5), asset-type surgery (G3), brand-bundle consumer (G10) — `mcp-image` does nothing.

## 6. Comparison to LogoLoom, `mcp-logo-gen`, `niels-oz/icon-generator-mcp`, `recraft-ai/mcp-recraft-server`

| Axis | `shinpr/mcp-image` | LogoLoom | `mcp-logo-gen` | `niels-oz/icon-generator-mcp` | `mcp-recraft-server` |
|---|---|---|---|---|---|
| Providers | Gemini only | OpenAI + Flux | fal (Flux) | OpenAI `gpt-image-1` | Recraft (vendor) |
| Tools | 1 (`generate_image`) | ~3 | ~2 | ~1–2 | 5+ (gen, vectorize, remove_bg, replace_bg, style) |
| Rewriter | **S–C–S LLM, +94% measured** | string-template | string-template | string-template | none (vendor-internal) |
| Asset-type aware | no (photoreal generalist) | "logo" only | "logo" only | "icon" only | vector-native |
| Transparency | no native alpha | post-hoc | post-hoc | post-hoc | vector = native alpha |
| Platform specs | none | none | none | none | none |
| Agent Skill pack | **yes** | no | no | no | no |
| Transport / auth | stdio / env var API key (all five identical) | | | | |
| License | MIT (all five) | | | | |

`shinpr/mcp-image` is the **only** one in the cohort doing genuine LLM-based prompt surgery, and the **only** one that ships a reusable Skill alongside the MCP. LogoLoom, `mcp-logo-gen`, and `niels-oz/icon-generator-mcp` are thin-wrapper clones; Recraft's server is a vendor-official multi-tool with no rewriter. The tri-surface ([20e](../20-open-source-repos-landscape/20e-agent-native-webapps-and-gap-analysis.md)) is occupied here on one axis — the cross-IDE Skill — but not the website or Streamable HTTP ones.

## 7. What we can learn, copy, and improve on

**Copy.**

1. **The Subject–Context–Style system prompt and the "only fill unspecified slots" principle.** The clause *"Add visual details only in areas the user left unspecified; keep all user-specified elements unchanged"* is the single most reusable line in the repo — MIT-licensed, measured at +94% quality, and transport-agnostic. This is copy-paste into our `enhance_prompt` tool, not R&D.
2. **The slot-flag mandatory-block pattern, generalized to asset-type.** Their flags each inject a `MUST` block into the user turn. Generalize to `asset_type` (`logo` / `app_icon` / `favicon` / `og_card` / `sticker` / `illustration`) and to `transparency_required`, `platform_constraints`, `brand_bundle`, `target_model_family` — each toggle injects its own mandatory block.
3. **The image-aware editing branch.** Passing the base64 input image into the rewriter (not just the generator) fixes the style-drift they documented. Our `edit_image` and brand-reference paths need the same trick.
4. **The dual-packaging (MCP + Agent Skill).** `npx mcp-image skills install --path <dir>` installs a portable Skill alongside the MCP from one npm package — the cleanest cross-IDE parity move in the cohort.
5. **Their operational discipline.** Token budget (<500), temperature (0.7), and the explicit cost tradeoff (+2.4 s for +94% quality) are the kind of numeric defaults our rewriter should publish — not "we use an LLM".

**Improve.**

6. **Route, don't pin Gemini.** Layer Subject-Context-Style over a Vercel AI SDK v5 router ([20c](../20-open-source-repos-landscape/20c-image-gen-sdk-wrappers.md)) with per-model verbalizers (Imagen → natural sentence; SDXL → tag salad; Flux → structural).
7. **Split the one-god-tool into composable primitives.** Expose `enhance_prompt`, `generate_image`, and `validate_asset` as separate tools the agent composes — Figma's "context bridge, not code generator" pattern.
8. **Close the validate-regenerate loop.** No output checking exists in the repo; their 49→95 is measured after the fact by a human. Our `validate_asset` (alpha coverage, palette, text legibility, platform spec, safe zone) is the missing layer.
9. **Ship Streamable HTTP + OAuth alongside stdio.** Same `lib/tools/` handlers behind both transports ([20e](../20-open-source-repos-landscape/20e-agent-native-webapps-and-gap-analysis.md)).
10. **Turn their keyword-scan "selected practices" telemetry into a real hard-requirements validator** that rejects rewrites lacking alpha-request, palette-injection, or aspect-ratio tokens when the slot flags demand them.

## 8. Compatibility with `vercel/mcp-adapter` conventions

Mechanically low, conceptually high. `vercel/mcp-adapter` exposes `createMcpHandler` at `app/api/[transport]/route.ts` over HTTP/SSE/Streamable HTTP; `mcp-image` is stdio-only. Porting the **server shell** requires rewriting `server-main.ts` against `createMcpHandler`, splitting the one-god-`generate_image` into one Zod-schemaed tool per capability, replacing `IMAGE_OUTPUT_DIR` local-disk storage with Blob/R2 + signed URLs, and adding the OAuth 2.1 layer that the repo has no surface for. Porting the **prompt optimizer** is trivial: `StructuredPromptGeneratorImpl` depends only on a `GeminiTextClient` interface; swap for an abstract `TextClient` routed through Vercel AI SDK v5 (`generateText({ model: provider.chat(...) })`) and the rewriter is adapter-native. The Subject-Context-Style system prompt is a pure string constant and does not care what transport the server speaks. **Re-host the optimizer; toss the transport and tool-shape.**

## Decision

**Adopt `shinpr/mcp-image` as the canonical reference for our prompt-rewriter layer; do not adopt it as the server.** Specifically: (a) port the Subject–Context–Style system prompt, the "only fill unspecified slots" principle, the image-aware editing branch, and the slot-flag mandatory-block injection pattern into our `enhance_prompt` MCP tool, generalized from `maintainCharacterConsistency`/`blendImages`/`useWorldKnowledge` to our asset-type-aware slot set (`asset_type`, `transparency_required`, `platform_constraints`, `brand_bundle`, `target_model_family`). MIT license makes this a lift-and-rename operation. (b) Copy the dual-packaging trick (`npx <pkg> skills install --path <dir>`) so our one npm package installs both the stdio MCP **and** a portable Skill. (c) Do **not** inherit their one-god-tool surface, their Gemini-only provider pinning, their stdio-only transport, or their missing validation loop — each of those is a direct [INDEX](../20-open-source-repos-landscape/INDEX.md) gap (G3, G5, G7, G9, G11) we already planned to close. The net is: `shinpr/mcp-image` gives us the rewriter's proven inside, and `vercel/mcp-adapter` + our asset-correctness validators + our multi-model router wrap the proven outside.
