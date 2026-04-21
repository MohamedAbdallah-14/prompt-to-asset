---
wave: 2
role: repo-deep-dive
slug: 05-logoloom
title: "Deep dive: mcpware/logoloom"
repo: "https://github.com/mcpware/logoloom"
license: "MIT"
date: 2026-04-19
sources:
  - https://github.com/mcpware/logoloom
  - https://registry.npmjs.org/@mcpware/logoloom
  - https://raw.githubusercontent.com/mcpware/logoloom/main/src/server.mjs
  - https://raw.githubusercontent.com/mcpware/logoloom/main/skills/design-logo/SKILL.md
  - https://lobehub.com/mcp/mcpware-logoloom
tags: [mcp, logo, logoloom]
---

# Deep dive: mcpware/logoloom

## Repo metrics

- **License:** MIT (confirmed in `LICENSE`, 1 KB).
- **Version / cadence:** `@mcpware/logoloom` v1.0.1, published to npm **2026-03-22**; first release 2026-03-21. Two versions total, both within one day — the repo is effectively brand new.
- **Popularity:** 7 GitHub stars, 0 forks, 13 weekly npm downloads, 4 installs on Lobehub (at time of research). No issues, no PRs, no contributors beyond the author.

> **Updated 2026-04-21:** Web search confirms the repo exists and is listed on Glama MCP directory. No evidence of additional releases beyond v1.0.1. Very early-stage, negligible community. Status: **experimental, watch for updates**. Decision unchanged.
- **Maintainer:** `ithiria894` under the `mcpware` org, which also ships `instagram-mcp`, `claude-code-organizer`, `ui-annotator-mcp`, and `pagecast` — a personal portfolio of MCP utilities rather than a team.
- **Footprint:** 17 files, 378 KB unpacked. The largest single file is the bundled `Inter-Bold.ttf` (334 KB) — i.e. roughly 88% of the package is a font.
- **Runtime deps (four total):** `@modelcontextprotocol/sdk ^1.12.0`, `opentype.js ^1.3.4`, `svgo ^3.3.0`, `sharp ^0.33.0`.

## Tools exposed, schemas, transports

All four tools are registered in `src/server.mjs` via `McpServer.tool(...)` with `zod` schemas and returned as `{ content: [{ type: 'text', text: <string> }] }`. The server binds a single `StdioServerTransport` — there is **no HTTP, SSE, or Streamable-HTTP path**.

| Tool | Inputs | Behavior |
|---|---|---|
| `text_to_path` | `svg: string`, `fontPath?: string` | Parses SVG with `opentype.js`, replaces `<text>` elements with `<path>` outlines. Falls back to the bundled Inter-Bold. |
| `optimize_svg` | `svg: string`, `aggressive?: boolean` | Runs SVGO; author claims 30–60% size reduction. |
| `export_brand_kit` | `svg`, `outputDir`, `name`, `colors?: { primary, secondary, textLight, textDark, bgLight, bgDark }`, `darkSvg?: string` | Writes ~14+ files: `logo-full-{light,dark}.svg`, `icon-{light,dark,mono-black,mono-white}.svg`, PNGs at 256/512/1024 via `sharp`, ICO + 16/48 favicons, WebP, `og-image.png` (1200×630), and a generated `BRAND.md` with colour/typography/usage tables. |
| `image_to_svg` | `imagePath`, `colorMode: 'color'\|'binary'`, `precision: 1-10` | Shells out to `vtracer` (optional `cargo install`) or `potrace` (`apt install`). |

Distribution artifacts: `.claude-plugin/plugin.json` + `settings.json` (Claude Desktop plugin manifest), `server.json` (MCP registry manifest), `glama.json`, a one-line `Dockerfile`, and a `skills/design-logo/SKILL.md` skill that tells the LLM the **full 4-phase logo workflow** (understand → concept → iterate → package).

## Provider(s) wired in

**None.** This is the most important architectural fact about LogoLoom, and it separates it cleanly from every other MCP in this category.

There is no OpenAI key, no Imagen, no Flux, no fal, no Replicate, no Recraft. The README framing — "AI designs your logo" — refers to **the host LLM (Claude) authoring SVG source code directly**. LogoLoom is, strictly, a deterministic SVG post-processing toolbox plus a Skill prompt that nudges Claude into a concept-iteration loop. The image generation step is the LLM's own text-generation capability, applied to SVG markup.

Consequently LogoLoom cannot generate photoreal art, cannot produce raster-first assets (stickers, mascots, hero illustrations), and is fundamentally single-style (flat vector geometry). It trades the entire diffusion stack for zero API cost and 100% local execution.

## Prompt construction internals

There is **no programmatic rewriter** — no `enhance_prompt` tool, no template DSL, no verbalizer layer, no model-family branching. The "prompt construction" lives in the Skill file, not the server code:

1. Phase 1: the Skill instructs the LLM to read `README.md`, `package.json`, and (if a GitHub org) `gh api orgs/{org}` metadata, then ask three fixed brand questions (audience, feeling, colour preference).
2. Phase 2: "generate 6–8 SVG concepts … vary icon style, palette, typography weight, corner radius; include at least 1 geometric, 1 abstract, 1 text-heavy."
3. Phase 3: iterate 4 variations after user picks a direction.
4. Phase 4: package into a `/tmp/{project}-logo-final.html` preview then call `export_brand_kit`.

The Skill also encodes hard SVG rules ("use `system-ui, -apple-system, sans-serif`", "viewBox `0 0 400 120` for full logo", "don't use `<image>` tags", "max 3 gradient colours") and three post-mortem "Lessons Learned" from the author's own mcpware logo build — notably, _don't_ run `text_to_path` unless the user needs print use, because it loses gradient fills on `<tspan>` and kerning.

In other words, LogoLoom's rewriter is a **Markdown playbook**, not a model. It is legible, patchable, and free — but it is static, single-model (Claude-flavored), and cannot be A/B tested or RL-trained.

## Post-processing surfaces

Strong on the vector side, absent on the raster/correctness side:

- **Font independence:** `text_to_path` via opentype.js — clean solution to the "fonts don't render" problem.
- **Size compression:** SVGO behind `optimize_svg`.
- **Rasterization:** `sharp` for PNG/WebP/ICO at fixed sizes (16, 48, 256, 512, 1024, 1200×630).
- **Raster → vector:** `image_to_svg` via vtracer/potrace, but only if the user installs them separately.
- **Transparency:** not applicable — SVG is natively transparent; no alpha-matting step exists because it's never needed.
- **Platform-spec generation:** **none**. No iOS `AppIcon.appiconset`, no Android adaptive icon (foreground + background + monochrome), no PWA manifest, no watchOS/tvOS/visionOS sizes. "Brand kit" here means 14 generic files, not a platform-compliant bundle. This is the single biggest post-processing gap versus `pwa-asset-generator` / `capacitor-assets` / `guillempuche/appicons`.
- **Validation:** none. No alpha check, no contrast check, no legibility eval, no brand-palette verification. If Claude emits an off-brand SVG, LogoLoom happily exports it.

## Distribution

- **npm:** `@mcpware/logoloom` (scoped), invoked via `npx @mcpware/logoloom` as a stdio MCP server.
- **Claude Desktop / Claude Code / Cursor:** documented `.mcp.json` snippet, plus a `.claude-plugin/plugin.json` manifest (219 B) that registers the `design-logo` Skill into the Claude Plugins store. Cursor gets the same stdio entry; no Cursor-specific rules file, no Windsurf/Gemini-CLI/Codex/Zed instructions.
- **Docker:** a 129 B `Dockerfile` is present but is essentially a placeholder.
- **Marketplaces:** listed on Lobehub MCP Marketplace (`mcpware-logoloom`, installs: 4), category `media-generate`; a `server.json` targets the modelcontextprotocol.io server registry.
- **Website:** none. README-only surface.

## Comparison to adjacent MCPs

| Dimension | **logoloom** | `arekhalpern/mcp-logo-gen` | `niels-oz/icon-generator-mcp` | `shinpr/mcp-image` |
|---|---|---|---|---|
| Provider | **none** (LLM writes SVG) | fal.ai (single) | single raster provider | multi-provider, optimizer-led |
| Output primitive | SVG (vector) | raster PNG | raster icon | raster image |
| Prompt rewriter | **Skill-only** playbook | none | none | **bundled Subject/Context/Style optimizer** |
| Post-processing | SVGO, opentype.js, sharp, vtracer | none | minor | none |
| Brand kit export | **14+ files, BRAND.md** | single image | single icon set | single image |
| Validation loop | none | none | none | none |
| Transports | stdio | stdio | stdio | stdio |
| License | MIT | MIT | MIT | MIT |
| Stars (Apr 2026) | 7 | low | low | ~97 |

Positioning: LogoLoom is the **only** one of the four that commits to SVG-as-output and treats the LLM as the designer. `arekhalpern` and `niels-oz` are thin wrappers around a single image API. `shinpr/mcp-image` is the only one with a genuine prompt optimizer, but it does no post-processing and no brand kit. None of the four route across models, consume a brand bundle, validate output correctness, or ship a hosted HTTP transport.

## Gaps our product fills

Against LogoLoom specifically, the whitespace is broad:

1. **No image models.** LogoLoom cannot produce photoreal/illustrative/sticker/mascot assets — a Flux/Imagen/`gpt-image-1` path is strictly additive. Our capability-based router makes LogoLoom-style LLM-authored SVG one of several backends, not the only one (addresses G3, G12 from the landscape index).
2. **No platform-spec bundle.** Our `resize_icon_set` (backed by `npm-icon-gen` + `pwa-asset-generator` + `capacitor-assets` + `guillempuche/appicons`) returns an iOS `AppIcon.appiconset`, Android adaptive triplet, PWA manifest, watchOS/visionOS sizes — LogoLoom stops at 14 generic files (G5, G11).
3. **No validation loop.** `validate_asset` (alpha coverage, palette adherence, text legibility, safe-zone, contrast, platform-spec linter) closes the loop LogoLoom leaves open (G7, G8).
4. **No brand-bundle consumer.** LogoLoom invents colours each run from three ad-hoc questions; our pipeline accepts `brand.md` / `brandspec` / AdCP `brand.json` and injects into every downstream call (G10).
5. **Stdio-only, single-user.** We ship a hosted Streamable-HTTP + OAuth 2.1 transport alongside stdio — required for the Figma/Linear/Gamma-style tri-surface (G9, controversy 5).
6. **Single-client packaging.** LogoLoom targets Claude ecosystem only; we deliver a single-command installer across Claude Code / Cursor / Windsurf / Gemini CLI / Codex / VS Code / Zed / v0 (G13).
7. **No programmatic rewriter.** LogoLoom's Skill is a static playbook; our `enhance_prompt` is a research-grounded rewriter with model-family verbalizers and a structured JSON contract (G3, G4).
8. **Composition-vs-generation routing.** LogoLoom always generates fresh SVG; for iconic single-glyph needs, our rewriter routes to Iconify composition first (controversy 3).

What LogoLoom **does well and we should steal**: the `export_brand_kit` shape (explicit `colors` object, explicit `darkSvg` parameter, auto-generated `BRAND.md`), the Skill-embedded "Lessons Learned" pattern (especially the "don't run text_to_path unless print" heuristic), the bundled opentype.js text-width calculator for true centering, and the HTML preview grid (`/tmp/{project}-logo-final.html`) as a reviewable artifact. These are tasteful primitives we can absorb without pulling in any GPL or vendor lock-in.

## Decision

**Treat LogoLoom as a teachable reference, not a competitor or a dependency.** It is an elegant 378 KB demonstration that for a narrow SVG-logo use case, no image model is needed — the LLM plus `opentype.js` + SVGO + sharp is enough. But its scope (one output format, one design style, one host, zero validation, zero brand-bundle input, zero platform specs, zero multi-IDE reach) is a strict subset of what an asset-correctness product must cover. We will reuse its `export_brand_kit` tool shape, its `BRAND.md` template, and its opentype-based centering trick inside our own `generate_logo` + `resize_icon_set` tools, while routing vector-logo requests through a LogoLoom-style LLM-authored-SVG path as **one branch** of a multi-model router — not as the product.
