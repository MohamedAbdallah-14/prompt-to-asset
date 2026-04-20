---
wave: 2
role: repo-deep-dive
slug: 07-niels-oz-icon-mcp
title: "Deep dive: niels-oz/icon-generator-mcp"
repo: "https://github.com/niels-oz/icon-generator-mcp"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/niels-oz/icon-generator-mcp
  - https://www.npmjs.com/package/icon-generator-mcp
  - https://lobehub.com/mcp/niels-oz-icon-generator-mcp
  - https://raw.githubusercontent.com/niels-oz/icon-generator-mcp/main/package.json
  - https://raw.githubusercontent.com/niels-oz/icon-generator-mcp/main/CHANGELOG.md
  - https://raw.githubusercontent.com/niels-oz/icon-generator-mcp/main/src/server.ts
  - https://raw.githubusercontent.com/niels-oz/icon-generator-mcp/main/src/context-builder.ts
  - https://raw.githubusercontent.com/niels-oz/icon-generator-mcp/main/src/styles/few-shot-examples.ts
tags:
  - mcp
  - icon
---

# Deep dive: `niels-oz/icon-generator-mcp`

## Metrics and provenance

TypeScript MCP server that generates SVG icons from natural-language
prompts with optional PNG/SVG reference files. Pre-1.0 beta: **1 GitHub
star, 0 forks**, 1 weekly npm download on `icon-generator-mcp`, **49
installs** on LobeHub. Seven versions shipped in a nine-day burst
(v0.2 → v0.5.0, Aug 7 → Aug 16 2025) then silence. License **MIT**, Node
18+, Jest suite (51 tests per v0.4 notes, regression tests pinned to "code
review icon generation"). Unpacked size 107.7 KB / 45 files — tiny by
MCP-server standards.

## Transport and distribution

**stdio-only**, `bin/mcp-server.js` invoked via `npm install -g
icon-generator-mcp` or `npx -y niels-oz-icon-generator-mcp`. No HTTP/SSE,
no OAuth, no hosted remote endpoint, no Docker, no one-command installer
for Claude Code / Cursor / Windsurf / Codex. No website. LobeHub listing
is the only advertised surface. Strictly a local developer tool.

## Tools

v0.5.0 deliberately **replaced the single monolithic `generate_icon` tool
with a two-tool host-driven workflow** — this is the most architecturally
interesting choice in the repo:

1. `prepare_icon_context({ prompt, reference_paths?, style? })` — builds an
   expert prompt with few-shot examples, validates PNG/SVG references,
   detects whether the host LLM is multimodal, returns
   `{ expert_prompt, metadata: { suggested_filename, style,
   references_processed }, instructions }`.
2. `save_icon({ svg, filename, output_name?, output_path? })` — writes the
   SVG returned by the host LLM to disk with kebab-case naming and conflict
   resolution via numeric suffixes.

Earlier versions (v0.2–v0.4) exposed a single `generate_icon` that
shell-spawned the `claude` or `gemini` CLI as a subprocess to do the actual
SVG generation. v0.5 rips that out entirely: **the server no longer calls an
LLM**. It assembles a prompt; the host MCP client's own model generates the
SVG; the server then persists it.

## Provider architecture — the key divergence

`icon-generator-mcp` is the cleanest public instance of the **"MCP as
prompt-builder, host LLM as renderer"** pattern for image-like assets. The
provider isn't Gemini, OpenAI, Flux, Recraft, or Fal — it is *whichever
model is already running the MCP client session*. Concretely, `MCPServer`
has no HTTP client, no API key handling, and no SDK beyond
`@modelcontextprotocol/sdk` ^0.4.0 and `chalk`. The two runtime dependencies
total <100 KB.

Consequences:

- **Cost and auth are someone else's problem.** The user already pays for
  the host LLM; no second bill, no API key ceremony.
- **Output quality tracks the host.** Claude Sonnet writes decent SVGs from
  instructions; a small local model writes garbage, and the server has no
  fallback pixel model.
- **PNG visual context is delegated.** `MultimodalDetector` checks whether
  the host supports image input (Claude Code, Gemini Pro Vision, GPT-4V)
  and **fails closed with a helpful error** otherwise. The server never
  decodes the PNG — it passes the path through and lets the client attach
  the image.
- **No pixel output path.** v0.2–v0.3 had a Potrace PNG→SVG step; v0.4
  removed it ("zero-dependency, cross-platform"), v0.5 removed any
  possibility of pixel output. Icons emerge only as SVG text.

This is the opposite trade-off from `mcpware/logoloom`, `arekhalpern/mcp-logo-gen`,
and `Nutlope/logocreator`, which all own the pixel pipeline and talk
directly to Together / Fal / Flux.

## Prompt internals

The expert prompt is assembled in `src/context-builder.ts` from three parts:

1. **System role** — `You are an expert SVG icon designer. Given SVG
   references and a user request, generate a clean, optimized SVG icon.`
2. **Style block (optional)** — when `style` is provided, the server looks
   the name up in `STYLE_CONFIGS`, appends the style's natural-language
   description, then inlines up to four few-shot `{prompt, svg,
   description}` triples and tells the model *"Follow the exact same style,
   structure, and visual approach as these examples."*
3. **Reference SVGs (optional)** — raw SVG source of any `.svg`
   `reference_paths` is inlined verbatim. (PNGs do not appear in the prompt
   text; they are attached by the host as multimodal content.)

The prompt ends with a fixed output contract:

```
FILENAME: [suggested-filename]
SVG: [complete SVG code]
```

…plus six hard requirements (SVG namespace, `viewBox`, optimized code, no
`<script>`, kebab-case filename, and — when style is set — a "CRITICALLY
IMPORTANT" instruction to match stroke-width, color scheme, and visual
approach).

**Style coverage is a single preset**: `black-white-flat` (four hand-written
few-shot SVGs: code-review document, magnifying-glass-over-code, two
overlapping docs, add-user). `STYLE_CONFIGS` is exported as a
`Record<string, StyleConfig>` with exactly one key, and `getAllStyleNames()`
returns a list of length one. Everything else the user types into the
`style` field silently falls back to the no-style path (generic SVG prompt
with no exemplars).

Filename synthesis is a hardcoded 19-item stopword filter (`create`, `make`,
`icon`, `modern`, `beautiful`, `minimalist`, …) over the lowercased prompt,
keeping the first two content words joined by a hyphen, defaulting to
`generated-icon`.

## Platform-spec coverage

**None.** The tool emits a single SVG and nothing else. There is no PNG
rasterizer, no iOS `AppIcon.appiconset` generator, no Android adaptive-icon
pair, no favicon `.ico` packer, no `manifest.json` splash set, no
1024/512/192/16 resize fanout. `save_icon` writes one file. This is a
strictly upstream artifact-production tool — everything downstream
(`npm-icon-gen`, `pwa-asset-generator`, `capacitor-assets`, `ionicons`) is
left to the user or agent.

## Gaps (vs. the bar this product needs to clear)

- **Zero platform-spec output (G5, G11).** A user who asks for "an app icon
  for my trading app" gets a 24×24-ish SVG — no iOS/Android/PWA bundle,
  no resize ladder, no Xcode-ready zip.
- **Single style preset (G1, G3).** One hand-picked style, no Imagen /
  `gpt-image-1` / Flux verbalizer variants, no brand-bundle input.
- **No evaluation / validation (G7, G8).** No CLIPScore, no SVG linter
  beyond "no `<script>` tags," no alpha-coverage check, no text-legibility
  gate, no regenerate-on-fail loop. The server trusts whatever SVG the host
  LLM returns.
- **No brand context (G10).** No `brand.md` / brandspec / AdCP `brand.json`
  parsing; no palette, typography, or `do_not[]` injection; no persisted
  session memory across generations.
- **No web surface, no hosted MCP (G9).** stdio only, no website, no
  Streamable HTTP + OAuth. Users cannot try the tool without installing
  Node and editing a JSON config.
- **Single-author, single-week, pre-1.0.** Seven releases in nine days then
  silence since 2025-08-16; 1 star; effectively unmaintained.

## Comparison to the other icon/logo MCPs

| Repo | Provider | Output | Tools | Transport | Distinguishing bet |
|---|---|---|---|---|---|
| `niels-oz/icon-generator-mcp` | **Host LLM (via MCP client)** | SVG text | `prepare_icon_context`, `save_icon` | stdio | Zero-dep; delegate generation to the host |
| `mcpware/logoloom` | Together FLUX | PNG (logo) | `generate_logo`, variants | stdio | Direct Together SDK; pixel-native |
| `arekhalpern/mcp-logo-gen` | Fal (Flux) | PNG | `generate_logo` | stdio | Fal-only, tight scope |
| `Nutlope/logocreator` | Together FLUX + OpenAI | PNG (logo) | — (web UI, no MCP) | N/A | UI gold standard |
| `shinpr/mcp-image` | OpenAI `gpt-image-1` | PNG | Subject–Context–Style rewriter + generator | stdio | Internal prompt optimizer; generic images |
| `recraft-ai/mcp-recraft-server` | Recraft v3 | SVG/PNG | Recraft API surface | stdio | Vendor-owned, vector-native |

`niels-oz` is the only one that ships no provider. LogoLoom and
`mcp-logo-gen` and `shinpr/mcp-image` compete on pixel quality; Recraft's
official server competes on vector fidelity; Nutlope competes on UX.
`niels-oz`'s bet is "the MCP client already has a frontier multimodal LLM,
so just hand it a great prompt" — novel, but it caps ceiling output at
whatever SVG the host model can write from text, with no fallback when that
isn't enough.

## Decision

**Do not depend on or fork this package.** The v0.5 two-tool
*prompt-context → host-renders → save* pattern is, however, a **borrowable
idea**, not a dependency: it is the right shape for an SVG-icon sub-flow
when (a) we know the caller is running a strong multimodal LLM and (b) we
want to avoid burning a paid image-model call for a trivial glyph that a
text LLM can SVG directly. We should steal the pattern as *one* branch of
our `enhance_prompt` → route decision — specifically for the "iconic
single-glyph" intent class already identified as composition-territory in
Controversy 3 of the 20-landscape index. In that branch our server returns
few-shot-augmented expert prompts for the host LLM to render, then pipes
the returned SVG into `validate_asset`, `vectorize`/`svgo`, and the
`resize_icon_set` platform-spec stack (`npm-icon-gen` + `pwa-asset-generator`
+ `capacitor-assets`) — closing the correctness loop this repo omits.
Everything else — the single style preset, stopword-based filename
synthesis, no website, no hosted transport, no brand bundle, no eval — is
below our bar and should not ship.
