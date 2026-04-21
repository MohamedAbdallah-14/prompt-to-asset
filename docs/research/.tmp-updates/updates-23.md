# Category 23 — Stack Combinations: Update Log
**Date:** 2026-04-21  
**Agent:** research-updater (Claude Sonnet 4.6)  
**Scope:** All 12 files in `docs/research/23-combinations/`

---

## Summary of Changes

All cross-cutting corrections confirmed by prior agents were applied to every file in this directory that referenced the affected claims. Below is a per-file breakdown.

---

## Corrections Applied (All Files)

### 1. Recraft V4 (SOTA for SVG/vector, released Feb 2026)
- **Claim corrected:** Files referenced "Recraft V3" as the SVG/vector SOTA model.
- **Correction:** Recraft V4 (Feb 2026) is SOTA. V4 ships four variants: V4 raster ($0.04/img), V4 Vector ($0.08/img), V4 Pro raster ($0.25/img), V4 Pro Vector ($0.30/img). V3 is retained only as a fallback when an existing V3 `style_id` must be preserved (V4 `style_id` schema is incompatible with V3).
- **Files edited:** `03-quality-max.md`, `06-agent-native-first.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** recraft.ai/docs, replicate.com/blog/recraft-v4, fal.ai/recraft-v4

### 2. DALL-E 3 API deprecation + gpt-image-1.5 as current model
- **Claim corrected:** Several files referred to `gpt-image-1` as "current" and did not mention DALL-E 3 shutdown.
- **Correction:** DALL-E 3 API shuts down May 12, 2026 (confirmed via OpenAI developer community announcement Nov 14, 2025). `gpt-image-1.5` is the current production OpenAI image model (released Dec 16, 2025; 20% cheaper I/O vs. gpt-image-1, faster). `gpt-image-1` is labeled "previous" in OpenAI's model docs.
- **Files edited:** `03-quality-max.md`, `06-agent-native-first.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** platform.openai.com/docs/models/gpt-image-1.5, community.openai.com deprecation notice

### 3. Ideogram transparency: dedicated POST endpoint, not `style:"transparent"`
- **Claim corrected:** Multiple files stated `style:"transparent"` as the Ideogram transparency parameter.
- **Correction:** There is no `style:"transparent"` parameter on the standard Ideogram generate endpoint. Transparency uses a **dedicated POST endpoint**: `/ideogram-v3/generate-transparent` (documented at developer.ideogram.ai as "Generate with Ideogram 3.0 (Transparent Background)"). Turbo tier: $0.03/img; Quality tier: $0.09/img.
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3, wavespeed.ai/blog

### 4. Flux `negative_prompt` raises TypeError on ALL Flux variants
- **Claim corrected:** Some files implied negative_prompt was usable on Flux but just ignored or partially supported.
- **Correction:** `FluxPipeline.call()` raises `TypeError: unexpected keyword argument 'negative_prompt'` on ALL Flux variants (dev, schnell, pro, Kontext, FLUX.2). Flux uses flow matching with CFG=1 — no negative conditioning mechanism exists. Use affirmative positive-prompt framing instead (e.g., `"pure white background"` not `"no checkerboard"`).
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** github.com/huggingface/diffusers/issues/9124, github.com/mcmonkeyprojects/SwarmUI/issues/204

### 5. rembg default is u2net — must explicitly pass `session=new_session("birefnet-general")`
- **Claim corrected:** Several files stated or implied that rembg defaults to BiRefNet.
- **Correction:** `rembg`'s `remove()` function defaults to the `u2net` session. To use BiRefNet-general, callers must explicitly pass `session=new_session("birefnet-general")`. Calling `remove(input)` bare runs U²-Net — substantially lower quality on soft-edge subjects (hair, glass, fine lines). This is a silent quality bug in any code that assumes bare `remove()` gives BiRefNet quality.
- **Files edited:** `03-quality-max.md`, `04-self-hosted-sovereign.md`, `07-hybrid.md`, `09-comfyui-native.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** github.com/danielgatis/rembg (README session docs), deepwiki.com/danielgatis/rembg session management

### 6. SVGO v4: `removeViewBox`/`removeTitle` disabled by default; `removeViewBox:false` override is a no-op
- **Claim corrected:** Some files used the v3-era pattern of `removeViewBox: false` as a "conservative" override to preserve viewBox.
- **Correction:** In SVGO v4, both `removeViewBox` and `removeTitle` are **removed from `preset-default`** entirely — they are no longer enabled by default. The v3-era `removeViewBox: false` override is now a no-op (the plugin isn't running in the first place). The viewBox is preserved automatically. To intentionally remove the viewBox, explicitly add `'removeViewBox'` to the plugins array.
- **Files edited:** `04-self-hosted-sovereign.md`, `05-free-tier.md`, `07-hybrid.md`, `08-edge-browser-first.md`, `RECOMMENDED.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** svgo.dev/docs/migrations/migration-from-v3-to-v4/, github.com/svg/svgo/releases/tag/v4.0.0

### 7. gpt-image-1 native streaming: `stream: true` + `partial_images: 0–3`
- **Claim corrected:** Files did not mention streaming capability for gpt-image-1/1.5.
- **Correction:** `gpt-image-1.5` (and gpt-image-1) supports streaming via `stream: true` + `partial_images: 0–3` in the API. Events are typed `"image_generation.partial_image"` for intermediates and `"image_generation.completed"` for the final image. `partial_images: 0` returns a single image in one streaming event.
- **Files edited:** `07-hybrid.md`, `08-edge-browser-first.md`, `SYNTHESIS.md`, `index.md`
- **Source verified:** platform.openai.com/docs/api-reference/images-streaming

### 8. MCP spec 2025-11-25 is Latest Stable (not draft)
- **Claim corrected:** Some files referred to it as a draft or upcoming spec.
- **Correction:** MCP spec `2025-11-25` is the Latest Stable release as of April 2026. No new version has been cut since then (confirmed March 2026). The 2026 MCP Roadmap published by Anthropic treats 2025-11-25 as the production baseline.
- **Files edited:** `08-edge-browser-first.md`, `09-comfyui-native.md`, `index.md`
- **Source verified:** modelcontextprotocol.io/specification/2025-11-25, blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/

### 9. Gemini/Imagen: programmatic use requires billing
- **Claim corrected:** Some files still contained residual references to "free tier" for Gemini/Imagen programmatic API.
- **Correction:** Google removed Gemini/Imagen image-gen from the free programmatic API tier in Dec 2025. The web UI at aistudio.google.com remains free for interactive use; programmatic use (`GEMINI_API_KEY`) requires a billed project. Banner updates were already applied to 01, 03, 07, and RECOMMENDED by a prior pass; this run cross-checked all remaining files.
- **Files edited:** `SYNTHESIS.md` (primary sources section), `index.md`
- **Source verified:** Confirmed in CLAUDE.md project instructions and prior agent notes

---

## Per-File Edit Summary

| File | Edits Made |
|---|---|
| `index.md` | Added cross-cutting correction block to the header banner |
| `SYNTHESIS.md` | Updated insight #3 (unavoidable triad), P2, RGBA fallback ladder, primary sources model list, Status section |
| `01-mvp-2-weeks.md` | No edits — already had correct Gemini banner; does not reference Recraft/Ideogram-transparency/Flux-negative |
| `02-license-clean-commercial.md` | No edits — already had correct Recraft V4 + gpt-image-1.5 banners applied in prior pass |
| `03-quality-max.md` | Recraft V3→V4 in generator table; gpt-image-1→1.5 in build order; rembg session note; Ideogram endpoint note |
| `04-self-hosted-sovereign.md` | rembg session note; SVGO v4 note in vectorization section |
| `05-free-tier.md` | SVGO v4 note in vectorization section |
| `06-agent-native-first.md` | Layer 3 routing updated (gpt-image-1→1.5, Recraft V3→V4, Ideogram endpoint); ModelId schema updated; update banner |
| `07-hybrid.md` | Capabilities matrix (Recraft V4 row); SVG hot path (#3) Recraft V4 + update note; transparent hot path (#1) gpt-image-1.5 + Ideogram endpoint + streaming; post-processing section rembg session + SVGO v4 + Flux negative_prompt notes; routing pseudocode RECRAFT_V3→V4 |
| `08-edge-browser-first.md` | Header banner added; surface-2 table (Recraft V4, Ideogram endpoint, streaming); SVGO v4 vectorization section |
| `09-comfyui-native.md` | Header banner added; wordmarks fallback section gpt-image-1→1.5 + Ideogram endpoint correction |
| `RECOMMENDED.md` | Layer 3 hot paths (gpt-image-1.5, Recraft V4, Ideogram endpoint, streaming); Layer 4 post-processing rembg + SVGO + Flux notes; lockfile gpt-image-1.5 + Recraft V4 entries |
| `RECOMMENDED.md` (appendix) | No edits needed — rejected variants section does not name model versions specifically |

---

## Claims Verified by Web Search (Not Changed)

- **Ideogram 3 Turbo pricing $0.03/img, Quality $0.09/img**: Confirmed still current.
- **Cloudflare Workers AI 10k neurons/day free**: Confirmed still active.
- **Together AI Flux Schnell free**: Confirmed as 3-month trial (not free-forever) — already corrected in prior pass of 05-free-tier.md.
- **MCP spec 2025-11-25 Latest Stable**: Confirmed — no new version since then as of April 2026.
- **Recraft V4 four variants and pricing**: Confirmed $0.04/$0.08/$0.25/$0.30.
- **gpt-image-1.5 current model**: Confirmed released Dec 2025, labeled current in OpenAI docs.
- **DALL-E 3 shutdown May 12 2026**: Confirmed via OpenAI developer community official deprecation notice.
- **SVGO v4 removeViewBox/removeTitle disabled in preset-default**: Confirmed via svgo.dev migration docs.
- **Flux negative_prompt TypeError all variants**: Confirmed via multiple HuggingFace issues and diffusers repo.
- **rembg default session u2net**: Confirmed via github.com/danielgatis/rembg session docs.
