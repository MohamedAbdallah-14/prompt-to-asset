---
wave: 2
role: repo-deep-dive
slug: 06-arekhalpern-mcp-logo-gen
title: "Deep dive: arekhalpern/mcp-logo-gen"
repo: "https://github.com/arekhalpern/mcp-logo-gen"
license: "GPL-3.0"
date: 2026-04-19
sources:
  - https://github.com/arekhalpern/mcp-logo-gen
  - https://github.com/sshtunnelvision/MCP-LOGO-GEN
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/README.md
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/server.py
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/tools/image_gen.py
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/tools/background_removal.py
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/tools/image_scaling.py
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/tools/image_download.py
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/.cursor/rules/logo-creation.mdc
  - https://raw.githubusercontent.com/sshtunnelvision/MCP-LOGO-GEN/master/requirements.txt
  - https://playbooks.com/mcp/sshtunnelvision-fal-ai-image-generation
  - https://mcpserver.cc/server/mcp-logo-gen
tags: [mcp, logo, fal]
---

# Deep dive: arekhalpern/mcp-logo-gen

## Repo metrics & provenance

`arekhalpern/mcp-logo-gen` is the user-visible name for what is actually the
`sshtunnelvision/MCP-LOGO-GEN` codebase (same author handle, listed as
`sshtunnelvision` on BuyMeACoffee and the MCP server directory; `arekhalpern` is
the GitHub vanity alias). All meaningful source still resolves against the
`sshtunnelvision/MCP-LOGO-GEN` repo on the `master` branch — `arekhalpern/mcp-logo-gen`
is the redirected shell.

- **Stars / forks:** ~171★ / 0 forks (per GitHub repo card).
- **Language:** Python 99.4%.
- **License:** **GPL-3.0** (full COPYING text in `LICENSE`).
- **Activity:** Created 2025-03-05, last substantive commit 2025-03-16 — **~13
  months stale as of 2026-04-19**, with no open PRs and effectively no
  maintenance cadence.
- **Dependency pins:** `mcp==1.3.0`, `fal-client==0.5.9`, `fastapi==0.115.11`,
  `uvicorn==0.34.0`, `starlette==0.46.0`, `sse-starlette==2.2.1`, `Pillow` (for
  scaling, not in requirements.txt — implicit transitive). No Node, no TS, no
  frontend.

## Architecture at a glance

A single Python process exposes an MCP server over **SSE only** (no stdio, no
Streamable HTTP). `server.py` wires the low-level `mcp.server.Server` into a
FastAPI app with `SseServerTransport`, hosts it at `http://127.0.0.1:7777/sse`
with `/messages/` as the POST-back endpoint, and ships no auth, no TLS, no
multi-tenant concerns — it is a local-developer tool.

Four tools are registered directly in `handle_list_tools()`:

1. `generate_image` — wraps `fal_client.subscribe("fal-ai/ideogram/v2", …)`.
2. `remove_background` — wraps `fal_client.subscribe("fal-ai/bria/background/remove", …)`.
3. `download_image` — `aiohttp` GET + disk write to `downloads/`.
4. `scale_image` — `PIL.Image.resize(..., Image.Resampling.LANCZOS)` with a
   default of `[(32, 32), (128, 128)]`.

There is no dispatcher, no router, no capability map. Each tool is a thin
async wrapper with a tiny handler class and a synchronous-inside-executor call
to `fal_client`.

## FAL API integration

Integration is deliberately minimal: `fal_client.subscribe(model, arguments=…,
with_logs=True, on_queue_update=…)` invoked inside `loop.run_in_executor`
because `fal_client` is sync. The `on_queue_update` callback only prints FAL's
in-progress logs to stdout. There is no retry, no circuit breaker, no
timeout, no cost accounting, and no streaming back to the MCP client (the SSE
transport is used for MCP framing, not for progress events from FAL).

The model is effectively **hard-coded to `fal-ai/ideogram/v2`** — the
`inputSchema` declares `enum: ["fal-ai/ideogram/v2"]` with `default` the same
value, so the "model" parameter is a one-element enum. The six user-facing
knobs exposed are exactly Ideogram v2's native parameters: `aspect_ratio`
(11 enum values), `expand_prompt` (boolean), `style` (`auto | general |
realistic | design | render_3D | anime`), and `negative_prompt`. There is
no Flux/Imagen/`gpt-image-1` path, no capability-based routing, no fallback.

Background removal uses **BRIA's FAL endpoint** (`fal-ai/bria/background/remove`)
with `sync_mode=true` and optional `crop_to_bbox`. The response is returned as
a FAL-hosted URL, never inlined or validated. Because BRIA RMBG 2.0 produces
hard masks, there is no native-RGBA path and no fringing/erosion check — this
is the exact post-hoc matting anti-pattern that `huchenlei/ComfyUI-layerdiffuse`
and `gpt-image-1`'s `background: "transparent"` were designed to displace.

## Prompt internals

There is **no prompt rewriter**. The repo offloads all semantic prompt work to
two places:

1. **The tool description string.** `generate_image.description` tells the
   calling agent: *"For best results with logos and icons, use the format:
   '[subject], 2D flat design, [optional style details], white background'"*
   and exposes three `examples` in the JSON-Schema. This is prompt guidance
   by JSON-Schema convention — the agent that reads `tools/list` sees the
   template and patterns its output after it.
2. **Ideogram's server-side MagicPrompt.** `expand_prompt=True` (default)
   defers prompt expansion to Ideogram's own model rather than doing
   CLIP-aware or asset-aware rewriting locally.

Notably, the recommended template is **wrong for transparent logos**:
prompting *"white background"* then running BRIA matting gives the classic
"halo + mark erosion" failure mode on coloured outlines. This mirrors the
20b/20d finding that post-hoc matting is the wrong default.

There is no negative-prompt library, no per-model verbalizer, no
asset-type classifier, no aspect-ratio auto-selection, no IP-Adapter / style
reference input, and no palette constraint injection.

## Post-processing pipeline

Sequential, deterministic, orchestrated by the Cursor agent — not the server.
`.cursor/rules/logo-creation.mdc` is the operational contract: a four-step
Cursor rule (`generate_image → remove_background → download_image →
scale_image`) that the agent follows when the user references `@logo-creation.mdc`
in Composer. The server itself has no state machine and no guarantees that
the four tools are called in order.

Scaling is fixed at `[(32, 32), (128, 128)]` with LANCZOS resampling,
forced `RGBA` mode, and filename-suffixed PNG outputs. There is **no
`.ico` emission, no `AppIcon.appiconset`, no Android adaptive icon, no
favicon.ico bundle, no PWA manifest, no `apple-touch-icon` variants** —
i.e., none of the platform-correctness that `onderceylan/pwa-asset-generator`,
`ionic-team/capacitor-assets`, `guillempuche/appicons`, or
`akabekobeko/npm-icon-gen` already solve.

No vectorization (no `vtracer`, no `potrace`), no upscaling, no safe-zone
check, no contrast/legibility validator, no regeneration loop. Output is a
raster PNG trio.

## Transports & installer UX

- **Transport:** SSE only, `127.0.0.1:7777`, no auth, no OAuth, no Streamable
  HTTP (which is now the 2025-2026 reference per Figma/Linear/Gamma per 20e).
- **Installer:** zero. The README walks the user through seven manual steps
  — install `uv`, `uv venv`, activate, `uv pip install -r requirements.txt`,
  create `.env`, set `FAL_KEY`, `python run_server.py`. No `npx` one-liner,
  no `pipx`/`uvx`, no DXT, no `cursor://` deep-link, no Claude Desktop
  config snippet beyond a hand-copied JSON fragment in the playbooks.com
  mirror.
- **Cross-IDE support:** Cursor is the only first-class target (the MCP
  Cursor rule is literally shipped in-tree); Claude Desktop, Windsurf, Zed,
  Gemini CLI, Codex, and VS Code are not mentioned anywhere.
- **Windows story:** known-flaky. The README carries a dedicated
  "Troubleshooting for Windows" section about `FileNotFoundError` when the
  server isn't launched from the project root — a smell of unresolved
  path-handling bugs.

## Comparison

| Dimension | arekhalpern/mcp-logo-gen | mcpware/logoloom | shinpr/mcp-image |
|---|---|---|---|
| Language / runtime | Python 3.8+ (FastAPI + uvicorn) | Node/TS (Stdio) | Node/TS |
| MCP transport | **SSE only** on localhost:7777 | stdio via `npx` | stdio |
| Provider coverage | **FAL only** (Ideogram v2 pinned) | Multi-model via OpenRouter/Replicate | OpenAI + provider routing with S-C-S optimizer |
| Prompt enhancement | None local; JSON-Schema template hint + Ideogram MagicPrompt | Provider-side only | **Built-in Subject–Context–Style optimizer** |
| Transparency path | Generate on white → BRIA post-hoc matting | Post-hoc | Native-alpha where provider supports it |
| Platform asset specs | 32×32 + 128×128 PNG only | None | None |
| Brand-bundle input | None | None | None |
| Validation loop | None | None | None |
| Installer UX | 7-step manual `uv` ritual | `npx` one-liner | `npx` one-liner |
| Maintenance | **Stale since 2025-03-16** | Active | Active |
| License | **GPL-3.0** | MIT | MIT |
| Stars | ~171 | ~low-hundreds | ~97 |

The three repos collectively prove the point from INDEX.md finding #5: each
owns one sliver of the MCP-for-logos space, none owns the stack.

## Gaps our product fills (mapped to INDEX.md)

- **G3 (per-model verbalizer)** — `mcp-logo-gen` emits one SDXL-ish
  `"2D flat design, […], white background"` template regardless of model; we
  emit Imagen-sentence, `gpt-image-1`-sentence, Flux-prose, and SDXL-tag
  dialects from an asset-type classifier.
- **G4 (structured output contract)** — their tools return bare
  `TextContent` strings like `"Generated image URL: …"`; we return
  `{positive, negative, weights, aspect_ratio, model_family, post_processing[]}`.
- **G5 + G11 (AI ↔ platform-spec bridge, OSS `appicon.co`)** — their
  32/128 PIL resize is not a platform pipeline. Our `resize_icon_set` wraps
  `npm-icon-gen` + `pwa-asset-generator` + `capacitor-assets` and emits a
  real Xcode `AppIcon.appiconset`, Android adaptive XML, and
  `favicon.ico` + `apple-touch-icon` + PWA manifest.
- **G6 (brand consistency across a set)** — no brand bundle, no style lock;
  we inject `brand.md`/brandspec/AdCP into every downstream call.
- **G7 + G8 (validation + regenerate loop)** — absent; we ship
  `validate_asset` and close the loop.
- **G2/G9/G12/G13** — no website, no hosted MCP, GPL-3.0 contamination
  risk for any commercial embedding, no cross-IDE installer. We ship all
  four.
- **Native-RGBA vs post-hoc matting (Controversy 2)** — they pick the
  wrong side by default; we pick LayerDiffuse / `gpt-image-1` transparent
  first, BRIA only as fallback, with alpha-coverage verification.
- **Transport (Controversy 5)** — their SSE-only localhost pattern is
  already out of step with Figma/Linear/Gamma Streamable HTTP + OAuth
  2.1. We ship both stdio and hosted Streamable HTTP behind the same
  `lib/tools/` handlers.

## Decision

**Do not adopt; do not fork.** `arekhalpern/mcp-logo-gen` is a ~300-LOC
proof-of-concept tied to one model (Ideogram v2), one provider (FAL), one
IDE (Cursor), one transport (SSE on localhost), and one post-processing
path (BRIA matting + PIL 32/128 resize). It has been stale for ~13 months,
has zero forks, ships no tests/CI, and is **GPL-3.0** — which alone
disqualifies it as an embedded dependency for our commercial surface.

We treat it strictly as a **negative reference specimen**: the shape of
the minimum-viable logo MCP, and a checklist of what not to do (hard-code
one model, skip prompt surgery, skip validation, skip native-alpha, skip
platform specs, ship Cursor-only, ship SSE-only, ship GPL). Our `logo`
tool must do the opposite of every one of those choices. Cite the repo in
our landscape docs under G9/G11 and Controversy 2/5 as evidence that the
MCP-for-logos slot is structurally unoccupied, and move on.
