---
wave: 3
role: combination-planner
slug: 08-edge-browser-first
optimization_criterion: "Edge/browser-first — WASM + edge + WebMCP"
date: 2026-04-19
---

> **Updated 2026-04-21:** (1) `gpt-image-1.5` is the current primary OpenAI image model; `gpt-image-1` is "previous." `gpt-image-1.5` supports native streaming: `stream: true` + `partial_images: 0–3`. (2) DALL-E 3 API shuts down May 12, 2026 — remove any DALL-E 3 router slots. (3) Recraft V4 (Feb 2026) is SOTA for native SVG; V3 stays only for existing `style_id` portability. V4 pricing: $0.04 raster / $0.08 vector. (4) Ideogram transparency uses the `/ideogram-v3/generate-transparent` dedicated POST endpoint — `style:"transparent"` does not exist as a parameter. (5) MCP spec 2025-11-25 is Latest Stable as of April 2026. (6) Flux `negative_prompt` raises TypeError on ALL Flux variants — use affirmative positive-prompt framing.

# Combination #8 — Edge / browser-first (WASM + edge + WebMCP)

## Criterion

Do as much work as possible **in the user's browser** via WebAssembly, push
everything else to **edge runtimes** (Vercel Edge, Cloudflare Workers), and
minimize long-lived Node or Python origin servers. The hosted remote MCP
endpoint is the *minimum* backend; WebMCP is a first-class agent surface the
moment Chrome 146 or the `@mcp-b/webmcp-polyfill` is present. The win is
latency, privacy, cost, and agent-reach: a flat 50–150 ms p95 on cold
requests, zero GPU origin, zero image-bytes leaving the device for the
happy-path (rewrite + validate + vectorize + export), and an agent surface
that works *inside the user's tab* without a round-trip to our datacentre.

## Pillars and honest limits

Four things have to be true for this stack to carry the product:

1. **An asset-aware prompt rewriter must run in the browser.** Gated by
   model size and CPU/GPU availability, but plausible for short rewrites.
2. **Background removal must run in the browser** for preview, and on the
   edge for authoritative output. No Python/ONNX origin.
3. **Vectorization and favicon/OG packaging must run in the browser** — no
   server-side `sharp`/`libvips` is allowed on the fast path.
4. **Image *generation* cannot run in the browser.** We accept this and
   route to hosted APIs (OpenAI, Gemini, Ideogram, Recraft, fal, Together,
   Cloudflare Workers AI). The browser is the runtime for everything *around*
   the generation.

The last bullet is the pragmatic truth. Anything that claims a "fully
client-side" pipeline today is doing text-to-SVG via an LLM or small
raster via WebSD; neither produces production brand assets. We are honest
about where the hosted API boundary is.

### What does not work in this regime (call out explicitly)

- **ComfyUI does not run in the browser.** It is a Python process graph
  with CUDA; there is no WASM port and none is plausible. Any workflow
  that depends on LayerDiffuse, IP-Adapter, or custom Flux LoRAs (i.e.
  most of the "self-sovereign" and "ComfyUI-native" stacks) *must* sit
  behind a GPU somewhere (fal, Replicate, RunPod, Modal). We proxy it
  through an edge route; we do not host it.
- **BRIA RMBG 2.0 weights are CC-BY-NC-4.0.** Even if we could squeeze
  the 176 MB ONNX into a Worker asset bundle (we cannot — Cloudflare's
  10 MB paid script cap and dynamic `WebAssembly.instantiate` ban kill
  it; see 22/15), the licence forbids the commercial deployment we are
  planning. Browser-side matting uses **BiRefNet-general-lite (MIT, ~45
  MB)** via `rembg-webgpu` / `@imgly/background-removal` (22/15) and
  never routes through `bria-rmbg`.
- **Flux.1 [dev] is non-commercial** under BFL NC v2.0 (21/04). The
  license-clean WASM/edge image path is Flux schnell on Workers AI
  (`@cf/black-forest-labs/flux-1-schnell`, Apache-2.0 weights), SDXL
  where needed, or gpt-image-1.5 / Ideogram / Recraft on the hosted side.
- **WebMCP is not universal.** Chrome 146 flag, Firefox/Safari deferred
  (21/14). We ship WebMCP as *progressive enhancement* on top of a
  stdio + Streamable HTTP MCP server. It is not a substitute for the
  remote MCP; it is a surface that *also* lights up for Chromium users.
- **SuperPrompt-v1 is not a frontier rewriter.** 77M T5-small trained on
  generic SD prompts (21/03). It is the *fallback* — the always-on
  in-browser enhancer — not the primary. The primary remains a
  system-prompted frontier LLM (Claude Haiku / Gemini Flash / GPT-5
  mini) called from the edge.

These constraints are non-negotiable and shape every component choice below.

## Stack

### Surface 0: the browser (where most work happens)

**Runtime targets:** modern Chromium/Firefox/Safari with WebGPU (Safari 18
shipped WebGPU), fallback to WebAssembly SIMD + threads (requires
cross-origin isolation; we set `COOP`/`COEP` headers on the Next.js Edge
route so `SharedArrayBuffer` is available).

**In-browser enhancer (free tier + offline):**
`roborovski/superprompt-v1` (T5-small, 77M params, MIT) served via
**`transformers.js v3`** (21/03). Loaded lazy from a CDN-cached
`model.safetensors`, ~100 MB on first visit, ~20 MB after 8-bit quant.
Runs CPU-only in ~300–900 ms on an M2-class laptop, WebGPU-accelerated
where present. Used for: fast rewrites with no network, offline drafts,
and the "you don't need an API key to try this" landing-page demo.

**Edge-hosted enhancer (primary):** `enhance_prompt` tool dispatches to
Claude Haiku 4 / Gemini 3 Flash / GPT-5 mini via **Vercel AI SDK v5
`generateText`** (22/20) running on Vercel Edge Runtime or Cloudflare
Workers. The route is stateless, <5 ms cold-start, and returns a typed
`AssetSpec` JSON. Client falls back to in-browser SuperPrompt if the
edge call fails or the user is offline.

**In-browser background removal:**
**`rembg-webgpu`** (22/15) loading `birefnet-general-lite` (MIT, ~45 MB)
via `@huggingface/transformers`. WebGPU FP16 → FP32 → WASM fallback
chain. Measured 0.73 s/1024² on M1, 1.4 s/3000². Used for: the live
preview, user "matte on device" flag, and any path where the image
already lives in the browser (drag-drop, webcam). Fringe decontamination
uses a small pure-JS `estimate_foreground_ml` port (or we ship
`pymatting`'s algorithm via a WASM wrapper; ~30 KB of code, no model).
**Not routed to `bria-rmbg` at any point.**

**In-browser vectorization:**
**`vtracer-wasm` 0.1.0** (22/16) — 134 KB, zero dependencies, MIT,
byte-identical output to the native Rust binary. Loaded into a dedicated
**Web Worker** with lazy import. End-to-end 150–400 ms on a 1024² logo,
≤2–3 s on 4096². Presets (`logo`, `icon`, `illustration`) are curated on
top of the raw `Config` flags. **SVGO v4** runs in a sibling Worker
(`svgo/dist/svgo.browser.js`, ~100 KB) with `preset-default` — `viewBox`
is preserved by default in v4 (both `removeViewBox` and `removeTitle` are
now **disabled** in `preset-default`; the old `removeViewBox: false` override
is a no-op and should be removed from configs), float precision 2, metadata
stripped.

> **Updated 2026-04-21:** SVGO v4 changed `preset-default`: `removeViewBox` and `removeTitle` are off by default. Remove any `removeViewBox: false` overrides — they are inert in v4. To intentionally strip the viewBox add `'removeViewBox'` explicitly to the plugins array.

**In-browser bitmap codecs:** **`@jsquash/png` + `@jsquash/resize`**
(18/a) — WASM fork of Squoosh, lanczos3 resampling, works in browsers
*and* Cloudflare Workers (unlike `@squoosh/lib`, Node-only). Used for
every resize/encode on the happy path. **`sharp` is banned on the edge
routes** — it is a native binding and cannot run on Vercel Edge or
Workers; we use it only in the background queue for heavy jobs.

**In-browser SVG raster:** **`@resvg/resvg-wasm`** for SVG → PNG
conversion (subset-fonts embedded at build time, no runtime font
fetching — addresses satori#367).

**In-browser OG card render:** **`@vercel/og` in-browser mode** (Satori
+ resvg-wasm) for the preview. The Takumi Rust engine (21/12) is not
yet browser-WASM-complete; track for switchover when `@takumi-rs/wasm`
is bundleable under 1 MB.

**Icon-set packaging:** A ~300-line pure-JS module that reads the
`AssetSpec` and emits iOS `AppIcon.appiconset/Contents.json`, Android
`mipmap-anydpi-v26/ic_launcher.xml` (foreground + background + Android
13 monochrome), PWA manifest entries (192/512/512-maskable), `favicon.ico`
(via `ico-endec` WASM), and `apple-touch-icon.png`. The zip is assembled
client-side with **JSZip**. **Nothing leaves the device** on the
icon-pack path once the master PNG exists.

**WebMCP surface:**
`@mcp-b/webmcp-polyfill` (MIT) + `webmcp-react` `useMcpTool` (21/14),
registering the *read-only* tools on `navigator.modelContext` whenever
the user has an agent in their browser (Chrome 146 native, Claude for
Chrome via MCP-B extension, or any host that mounts the polyfill).
Registered tools, all `readOnlyHint: true`:

- `enhance_prompt(brief, asset_type, brand?)` — runs in-browser SuperPrompt
  for instant results; falls back to the edge route if the brief exceeds
  the small-model budget.
- `validate_asset(image_bytes, asset_type, brand?)` — tier-0 validators
  (dims, alpha probe, checkerboard FFT, bbox, palette ΔE, OCR
  Levenshtein) run entirely in the Worker pool.
- `vectorize(image_bytes, preset)` — vtracer-wasm + SVGO.
- `remove_background(image_bytes, mode)` — BiRefNet-lite via WebGPU.
- `brand_bundle_parse(markdown|dtcg)` — pure-JS parser, no network.
- `list_history()` / `get_generation(id)` — reads IndexedDB; no server
  round-trip.

Write tools (`generate_logo`, `generate_app_icon`, `generate_favicon`,
`generate_og_image`) stay *off* WebMCP until the tool-impersonation
mitigations in W3C WebMCP issues #57 and #101 land (21/14). Writes go
through the authenticated remote MCP so OAuth scopes, rate limiting, and
billing are enforced.

**Schema SSOT:** All WebMCP registrations read the same `schemas/*.json`
zod-derived definitions that the remote MCP uses (19). Zero schema drift
is a first-class invariant, enforced by a CI diff.

### Surface 1: the edge (Vercel Edge + Cloudflare Workers)

We split workloads between Vercel Edge and Cloudflare Workers by what each
runtime does best.

**Vercel Edge Runtime** hosts the Next.js app (UI + MCP transport):

- `app/page.tsx` — React 19 landing page, shadcn, Satori-rendered hero,
  server components for SEO; interactive playground is a client island.
- `app/api/[transport]/route.ts` — **`mcp-handler`** (22/19) with
  `createMcpHandler` + `withMcpAuth`, `disableSse` on the edge variant
  (Streamable HTTP only; Claude Desktop clients get a parallel Node
  route with SSE + Redis because Workers AI doesn't do long-lived SSE
  cleanly — see below). `maxDuration: 800` on Vercel Pro/Fluid.
- `app/api/enhance/route.ts` — Edge function, <5 ms cold-start, streams
  from Haiku/Flash.
- `app/api/validate/route.ts` — Edge function; delegates to WASM
  validators compiled into the Worker bundle so we don't duplicate code
  between browser and edge.
- `.well-known/oauth-*` — RFC 9728 + RFC 8414 metadata endpoints.

**Cloudflare Workers** hosts the OG render + vectorize fallback +
Workers-AI generate path:

- **`kvnang/workers-og`** (21/12) — `ImageResponse` with statically
  compiled `resvg-wasm` (Workers bans dynamic `WebAssembly.instantiate`).
  1200×630 OG cards in ~150 ms, Brotli-compressed at the Cloudflare
  edge. This is the asset that *must* render fast at crawl time; the
  Worker sits next to the user's CDN POP.
- **`vtracer-wasm` + SVGO** same modules as the browser, re-exported
  from a Worker for clients that can't run WASM locally (older iOS,
  enterprise locked-down browsers).
- **Workers AI generate path**:
  `@cf/black-forest-labs/flux-1-schnell` (1024², ~2 s, Apache-2.0
  weights, $0.011/MP at 2026 pricing) for the free-tier and
  interactive-draft path. Called via
  `env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt })`;
  returns raw bytes, we stream into R2. **Background-removal path** via
  Workers AI's hosted salient-object segmenter (BiRefNet-family) as an
  alternative to the in-browser WebGPU path for large images where the
  client is thermally constrained.
- **R2 object storage** — content-addressed assets keyed by
  `prompt_hash / seed / model / params_hash`. Egress-free, hits the
  Cloudflare CDN automatically. 20–40 % cache-hit rate expected (see
  SYNTHESIS #8).
- **D1** for lightweight metadata (history, asset index) when Postgres
  is overkill; **Durable Objects** for per-user rate-limit buckets.

**Edge boundary rules:**

- No `sharp`, no `libvips`, no native bindings — we ban the entire
  native-module class on Edge/Workers routes via a CI lint.
- No Python, no ONNX Runtime Python. `onnxruntime-web` is allowed (WASM
  backend) in Worker bundles under 10 MB; otherwise proxy to Workers AI.
- No long-lived connections on Workers routes. SSE + Redis lives on a
  single **Fluid Compute** Node function for Claude Desktop compat only.

### Surface 2: hosted API fallbacks (pay-as-you-generate)

Everything that cannot fit in the browser or the edge goes to a hosted
generation API, orchestrated through the **Vercel AI SDK v5** (22/20)
`experimental_generateImage` behind the capability router from 22/20:

| Capability | Primary hosted | Fallback | Runtime |
|---|---|---|---|
| Logo with text | Ideogram v3 (fal / OpenRouter) | gpt-image-1.5 | Edge route, streams response |
| Transparent mark | gpt-image-1.5 `background:"transparent"` (supports `stream:true` + `partial_images:0–3`) | Ideogram v3 `/ideogram-v3/generate-transparent` endpoint (NOT `style:"transparent"`) | Edge route |
| Native SVG | Recraft V4 Vector (Feb 2026, $0.08/img, SOTA) | Recraft V3 only if existing `style_id` portability needed; then LLM-authored SVG (Claude) | Edge route |
| Fast draft | **Workers AI Flux schnell** | fal Flux schnell | Worker |
| Photoreal hero | gpt-image-1.5 / FLUX.2 pro (Together) | Flux Pro (fal) | Edge route |
| Character consistency | FLUX.2 pro with 8 refs (Together) | Seedream 4.5 | Edge route |
| LayerDiffuse (SDXL alpha) | fal `layer-diffusion` | Modal-hosted ComfyUI (last resort) | Edge route queues it |

We never stand up our own GPU. If demand justifies it, we subscribe to
**fal-serverless** for dedicated warm pools behind the same router; the
call site does not change.

### Surface 3: remote MCP + WebMCP (the agent plane)

- **Remote MCP** at `https://prompt-to-asset.<tld>/api/mcp` — Streamable
  HTTP (primary), OAuth 2.1 + PKCE + RFC 7591 DCR (22/19), fork of
  `run-llama/mcp-nextjs` with `mcp-handler` upgrade. Every tool in
  `lib/tools/*` registered with `readOnlyHint`/`idempotentHint`
  annotations so agents can batch/cache appropriately.
- **stdio transport** for Claude Desktop / Cursor / Codex when a user
  wants a local-only path: a 40-line `server/index.mjs` reuses the same
  `lib/tools/*` handlers and talks to the hosted edge APIs as a client.
  This is the fallback when WebMCP is absent and HTTP MCP is blocked
  (enterprise firewalls).
- **WebMCP** (surface 0) as progressive enhancement: one module
  (`apps/web/app/webmcp.client.ts`) detects `navigator.modelContext`
  (native or polyfilled) and mirrors the read-only tools.

The invariant across all three: one `schemas/*.json` SSOT, one
`lib/tools/*` handler set, three transports. No tool logic lives in a
transport-specific file.

## What this buys us

| Dimension | Result |
|---|---|
| Cold start (p95) | <5 ms edge; <1.5 s WASM module load (cached) |
| Idle cost | ~$0 — no always-on GPU, no Postgres primary on the hot path (D1 + R2) |
| Per-generation cost | $0.011–$0.05 (Workers AI Flux → gpt-image-1.5) |
| Data gravity | Matte + vectorize + pack happen on device — user image bytes can stay out of our logs for the happy path |
| Agent reach | Remote MCP + stdio + WebMCP — three surfaces, one codebase |
| License posture | MIT/Apache/Apache-weights across the entire on-device + edge stack; NC models are gated behind hosted APIs where the vendor owns the licence |
| Offline | SuperPrompt + BiRefNet-lite + vtracer-wasm all run without a network; user gets 60 % of the value |

## Risks and open questions

- **Model-size budget on mobile.** 100 MB for SuperPrompt + 45 MB for
  BiRefNet-lite is a lot for 4G users. Mitigation: quantize to int8 at
  build time, lazy-load per-feature, cache-bust with the service worker.
  Brutal fallback: gate in-browser AI to WebGPU-capable devices only;
  others hit the edge.
- **WebMCP trust model.** Issue #101 (tool impersonation via
  `provideContext`) is unresolved (21/14). Our posture: only
  `readOnlyHint` tools on WebMCP, and every write tool requires an OAuth
  bearer that the hosted MCP issues.
- **Cloudflare Workers cold-start on Python/heavy WASM.** Not relevant
  for us — we don't host Python there. But `onnxruntime-web` in a Worker
  is slower than in the browser (no SharedArrayBuffer by default). If we
  need server-side ONNX, we move that path to a Fluid Compute Node
  function, not a Worker.
- **Service-worker ergonomics.** Caching 100 MB of weights is fine for
  return visits, disastrous for first visit. Split the enhancer into a
  small "draft" head (~20 MB) and a larger "polish" head loaded on user
  gesture.
- **The iOS Safari WebGPU ceiling.** WebGPU shipped in Safari 18 but
  with compute-shader restrictions that break some transformer kernels
  in `@huggingface/transformers`. Test matrix must include iOS 18 Safari
  every release.

## Build order (90 days, edge-first MVP)

1. **Weeks 1–2:** Fork `run-llama/mcp-nextjs`, upgrade to `mcp-handler
   1.1`, move to `app/api/[transport]`, add `lib/tools/*` with
   `enhance_prompt` + `validate_asset`. Deploy to Vercel (Fluid on).
   Cloudflare Worker stub for OG rendering with `workers-og`. R2 bucket.
2. **Weeks 3–4:** Ship in-browser SuperPrompt + BiRefNet-lite behind a
   Web Worker. Wire `/api/enhance` to call Claude Haiku as primary,
   SuperPrompt as fallback. OG card render on the Worker.
3. **Weeks 5–6:** `vtracer-wasm` + SVGO + icon-pack emitter — fully
   client-side. JSZip export. `@jsquash` for all resize.
4. **Weeks 7–8:** Capability router + Vercel AI SDK generation endpoints
   (gpt-image-1.5, Ideogram v3, Recraft v3, Workers AI Flux schnell).
5. **Weeks 9–10:** WebMCP polyfill wiring + read-only tool registration,
   shadcn UI for the dashboard, OAuth consent screen, first hosted MCP
   clients (Cursor, Claude Desktop via mcp-remote).
6. **Weeks 11–12:** Polish — service worker caching strategy for
   weights, iOS Safari WebGPU bug list, CI lint banning native modules
   on edge routes, docs + IDE-mirror sync script.

## Bottom line

The edge/browser-first combination is the cheapest to run, the fastest on
the happy path, the most private on the matte/vectorize/pack stages, and
the most agent-reachable — three surfaces (remote MCP, stdio, WebMCP)
from one `lib/tools/` SSOT. It **cannot** self-host the image generator
(ComfyUI + LayerDiffuse + BRIA NC weights do not fit), so it leans on
gpt-image-1.5, Ideogram v3, Recraft v3, and Workers AI Flux schnell for
generation. For a product whose value is the *pipeline* (classify →
rewrite → route → validate → matte → vectorize → pack), not the
generator, that trade is correct: we own the bytes that matter, rent the
bytes that don't, and put an agent surface directly in the user's tab.
