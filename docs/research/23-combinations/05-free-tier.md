---
wave: 3
role: combination-planner
slug: 05-free-tier
optimization_criterion: "Zero-cost anonymous free tier"
date: 2026-04-19
sources:
  - docs/research/SYNTHESIS.md
  - docs/research/22-repo-deep-dives/02-promptist.md
  - docs/research/22-repo-deep-dives/03-nutlope-logocreator.md
  - docs/research/22-repo-deep-dives/15-rembg.md
  - docs/research/22-repo-deep-dives/16-vtracer.md
  - docs/research/22-repo-deep-dives/20-vercel-ai-sdk-image.md
  - docs/research/21-oss-deep-dive/12-oss-og-social-card.md
  - docs/research/21-oss-deep-dive/18-serverless-comfyui-patterns.md
  - docs/research/21-oss-deep-dive/19-tri-surface-starters.md
  - docs/research/21-oss-deep-dive/04-native-rgba-generation.md
tags: [free-tier, anonymous, zero-cost, wasm, cpu, promptist, rembg, vtracer, satori, cloudflare, together, fal, replicate]
---

# Combination 05 — Zero-cost anonymous free tier

## Optimization criterion (restated)

A real anonymous user — no sign-up, no credit card, no OAuth — must be able to
generate **a logo + a full app-icon set + a favicon bundle + an OG card** for
exactly **$0**, fully funded by (a) our own compute efficiency (CPU / WASM where
possible, edge CDN everywhere) and (b) third-party free-tier windows and trial
credits that we can stitch together without paying rent. The paid tier exists
only as an upsell; the free tier must not cost more to serve than we can recover
from conversion, advertising, or the marginal zero of our own infra.

This is a different goal from MVP (ship in 2 weeks), quality-max (best outputs
regardless of cost), or license-clean (MIT-only). It explicitly accepts lower
raster quality, non-commercial watermarking, and a throttled daily quota if
that's the price of keeping anonymous usage truly free.

## Principle: do on the client what providers would charge us for

The single biggest free-tier lever is that an unauthenticated user's browser is
unmetered compute. Every step we can execute in their tab costs us $0 in egress,
$0 in GPU-seconds, $0 in storage. The provider-priced steps — raster
generation — are then the only things that touch our balance sheet, and for
those we chain **three free-tier endpoints in a fall-through so no single
vendor sees enough volume to rate-limit us out of the tier**.

The five architectural consequences:

1. **Prompt rewriting runs in-browser** (Promptist 125M + SuperPrompt 77M via
   Transformers.js WebGPU/WASM) — never our server.
2. **Background removal runs in-browser** (`rembg-webgpu` → `birefnet-general-lite`)
   — never our server.
3. **Vectorization runs in-browser** (`vtracer-wasm`, 134 KB, MIT) — never our
   server.
4. **OG-card rendering runs at the edge** on Cloudflare Workers free tier with
   Satori + resvg-wasm — $0 until 100 k req/day.
5. **Only raster generation leaves the browser**, and it is routed across three
   free-tier providers with a shared IP-addressable quota pool.

## Layer-by-layer stack

### Layer 0 — Surface: web-first, MCP/CLI optional

- **Framework:** Next.js 15 App Router on Vercel Hobby (100 GB egress, 100 GB-hr
  serverless compute, $0 up to that — matches Nutlope/logocreator's substrate
  (22/03) without Clerk/Upstash/Together Pro tier).
- **Tri-surface opt-in:** the same `/api/[transport]` MCP endpoint from
  `vercel-labs/mcp-for-next.js` (21/19) is exposed but **requires sign-in**; the
  anonymous free tier is web-only. MCP/Skills users are paying users by
  definition (they have agent budgets elsewhere). This keeps our per-request MCP
  cost in the paid plane where we can model it properly.
- **Edge runtime everywhere possible** — the OG route and every validator lives
  on Cloudflare Workers (100 k req/day free, 10 ms CPU/request) with
  `workers-og` (21/12) to avoid Vercel Pro minutes. Vercel handles only SSR and
  the thin image-provider proxy.
- **No database** in the free path. Anonymous assets are content-addressed,
  stored on Cloudflare R2 under `assets/<sha256[0:2]>/<sha256>/*` (10 GB free /
  1 M Class A ops free / zero egress). No `logos` table, no history, no user
  record — the browser holds the only reference via a downloaded ZIP.

### Layer 1 — Prompt rewriter (in-browser, always free)

The entire enhancer runs inside the user's tab. This is the biggest cost saving
in the whole stack — a server-side rewriter at 100 ms × 1 M free calls/mo is
~28 compute-hours we are not paying for.

- **Primary:** `microsoft/Promptist` (125M GPT-2, MIT code, MIT weights by
  convention per 22/02) exported to ONNX q8 and served via Transformers.js. On
  WebGPU (Chrome/Edge) it runs at ~300–800 ms warm; on WASM (Safari, Firefox)
  ~3–8 s warm, which we mask with an optimistic UI that shows the raw prompt
  first and replaces it when the rewrite arrives.
- **Fallback:** `brianfitzgerald/SuperPrompt-v1` (77M T5) for Flux/gpt-image-1
  prose dialects, same Transformers.js runtime.
- **Critical caveat from the Promptist deep dive (22/02):** Promptist's SD-1.x
  tag-salad actively hurts Imagen and gpt-image-1 quality. The free tier's
  default raster provider is Flux Schnell, for which Promptist's bias is
  tolerable. When we later route to an Imagen-style provider, we swap in
  SuperPrompt-v1's natural-sentence output. This routing decision is local to
  the browser.
- **Weights delivery:** served from R2 behind Cloudflare CDN, HTTP-cached for
  30 days; ~125 MB one-time download, cached by service worker. For repeat
  users it costs $0 to serve.
- **Graceful degradation:** if WebGPU/WASM is unavailable (old mobile browsers),
  we fall back to a 50-line heuristic JavaScript rewriter — asset-archetype
  templates + style tokens, no ML. Always cheaper than losing the user.

### Layer 2 — Intent classifier and provider router (browser + edge)

A pure function `route(asset_type, transparency, text_len, vector_required)`
encoded as JSON (SYNTHESIS.md "Model routing logic" §). Loaded statically, zero
server cost. The router's job in the free tier is to chain raster providers in
a fall-through so no single vendor throttles us out:

```
generate(promptSpec):
  try Together Schnell free          (rate-limited, ~10 req/min/IP)
  catch 429 → try fal Flux Schnell   (ephemeral free credit, ~$0.002/img)
  catch 429 → try Cloudflare Workers AI  (10 k Neurons/day free @ account, ~50/day Flux)
  catch 429 → try Replicate trial    ($1 new-account credit, Flux Schnell $0.003)
  catch 429 → serve last-cached result + "high demand, try again in 5m" banner
```

Only step 1 is reliably "$0 forever"; steps 2–4 are burn-down credits tied to
our account-holder keys and are the subsidy model. The key insight is that
**any one of these four lanes individually hits a quota within hours of viral
traffic**; rotated together, the blended cost per free asset drops to ~$0.0005
amortized.

### Layer 3 — Raster generation (free-tier lanes)

All four lanes converge on the same model family — **FLUX.1 [schnell]**,
Apache-2.0 weights — so output quality is bit-identical modulo seed. This is
deliberate: license-clean, commercially safe, text ceiling ~3 chars (we already
composite real type in layer 5), 4-step distillation → sub-second latency.

| Lane | Free quota | What expires | Our posture |
|---|---|---|---|
| **Together AI — FLUX.1 [schnell]** (22/20) | Free endpoint, rate-limited per IP + per key | Never — stated free-forever | Primary. Route 70% of traffic here. |
| **fal.ai — `fal-ai/flux/schnell`** (22/20, 21/04) | ~$1 sign-up credit, $0.003/img ≈ 333 free imgs/account | Credit burns down | Secondary. Rotate across 3–5 accounts per our ToS review. |
| **Cloudflare Workers AI — `@cf/black-forest-labs/flux-1-schnell`** | **10 000 Neurons/day free per account**, one Flux Schnell call ≈ 100–300 Neurons | Daily reset | Tertiary. Good for ~50 free imgs/day, and it runs *inside* our Worker so no extra hop. |
| **Replicate — `black-forest-labs/flux-schnell`** | $1 trial credit per new account, ~333 imgs | Credit burns down | Last-resort; batch refills monthly via team account. |
| **Hugging Face Spaces (ZeroGPU)** | Free `@spaces.GPU` allocation, rate-limited, cold-start 8–20 s | Never — burstable free | Embedded fallback for **transparent-mark** intent only, hosting LayerDiffuse-SDXL (21/04). Slow but $0 and native RGBA. |

Throughput math (viable with four-lane rotation): **~1 500 generations/day at
$0 marginal cost** before any lane's credits degrade, sustainable indefinitely
once we pin Together Schnell as the stable floor.

### Layer 4 — Background removal (browser-side, always free)

`rembg-webgpu` (22/15, `Remove-Background-ai/rembg-webgpu`) loaded on-demand
into a web worker, using `birefnet-general-lite` (MIT, 45 MB quantized). On an
M1 / RTX-class laptop it's 0.7 s @ 1024²; on a 3-year-old phone it's 3–5 s,
which we mask with a progress bar. WASM fallback on Safari iOS is slow but
works.

- **Fringe decontamination:** chained `pymatting.estimate_foreground_ml` is
  Python-only and not free to serve; for the free tier we instead ship a
  **pure-JS premultiplied-alpha resampler** that kills the worst halo at
  favicon sizes (16²/32²). Quality delta vs. the paid tier is visible on dense
  hair / fur, invisible on flat logos — acceptable for free.
- **Never load `bria-rmbg`** in any path; CC-BY-NC weights are license-clean
  only for the paid plane with indemnification.

### Layer 5 — Vectorization + typography (browser-side, always free)

- **`vtracer-wasm`** (22/16, 134 KB, MIT, zero deps) in a web worker. On
  1024² logos: 150–400 ms. Output: 8–30 `<path>` elements, typical for a flat
  mark. `potrace` is GPL; `autotrace` is GPL; `imagetracerjs` is lossier —
  `vtracer-wasm` is the only license-clean, mature, color-capable OSS tracer
  and it happens to be the fastest in the browser too. Ship SVGO after to
  prune ~30 % from the byte size.
- **Typography composition:** **Never render brand text in the diffusion
  sampler at all** (SYNTHESIS.md §3). The rewriter emits a `text-free mark`
  prompt; the typography layer composites the user's chosen wordmark via
  `satori` + a handful of bundled OFL-licensed fonts (Inter, Space Grotesk,
  Poppins, IBM Plex Sans/Mono, Recursive — all SIL-OFL). Free, and strictly
  better than anything Flux Schnell's 3-char text ceiling could render.

### Layer 6 — App icon & favicon pipeline (edge, always free)

Fan-out from the 1024² master → every platform spec. All resize/encode ops run
either in the browser (`@resvg/resvg-wasm`, `sharp-wasm`, jSquash) or on
Cloudflare Workers AI bindings (`env.IMAGES.resize`, free tier 5 000
transformations/day).

- **iOS `AppIcon.appiconset`** — opaque 1024 flattened onto user-chosen bg,
  plus all legacy sizes, `Contents.json`.
- **Android adaptive** — `ic_launcher_foreground.xml` + `_background.xml` +
  auto-derived monochrome (SYNTHESIS.md gap G11: heuristic `grayscale +
  threshold`, acknowledged not best-in-class, acceptable for free).
- **PWA** — 192/512 + 512 maskable with 20 % safe-zone padding.
- **Favicon bundle** — `.ico` (16/32/48) via `sharp-ico` WASM, `icon.svg` with
  `@media (prefers-color-scheme: dark)`, `apple-touch-icon.png` (180, opaque).
- **ZIP packaging** in-browser via JSZip; the user downloads a single
  `brand-assets.zip`, and our R2 storage is ephemeral (7-day TTL on the free
  plane).

### Layer 7 — OG card (edge, always free within 100 k/day)

`workers-og` (21/12) at a Cloudflare Worker endpoint. Free tier: 100 k req/day.
Satori + resvg-wasm, template JSX, composited logo from layer 6, headline from
user. **Zero AI cost** — this is a layout engine, not a generator, and every
OG benchmark confirms template-based beats diffusion for this format
(SYNTHESIS.md §Plugin architecture, 21/12). For "generate me a whole OG
artwork" — paid tier only, routed to Flux Schnell with a watermark.

## Anti-abuse: keeping the free tier free

Everything above collapses the moment a scraper discovers it. Six layers of
defense, all additive, none requiring sign-in:

1. **reCAPTCHA v3 (invisible)** — free, unlimited. Scored 0.0–1.0; below 0.3
   the request is short-circuited to a slower lane (Spaces ZeroGPU) or rejected
   outright. No user friction; we never show a challenge in the free happy
   path. Covers the 80 % of abuse that's unsophisticated bots.
2. **Cloudflare Turnstile** as reCAPTCHA backup — also free — we A/B between
   them to avoid single-vendor takedown risk.
3. **IP-address rate-limiting** at the Cloudflare Worker edge: Workers KV free
   tier (100 k reads/day) is plenty for counters. Limit: **5 full bundles
   (logo + icons + favicon + OG) per IP per 24 h**. A full bundle ≈ 1 raster
   gen + all post-processing. Matches Nutlope's `3 per 60 days` posture (22/03)
   but way more generous so we don't push users off before they convert.
4. **Prompt-content rate-limit** — the same prompt from the same IP twice in
   60 s returns the cached R2 result; zero provider cost and zero storage
   growth (content-addressed). This is pure win.
5. **Free-tier watermark policy.** Every raster generated via the free lanes
   gets a 4 % opacity `prompt-to-asset.dev` corner mark baked in at the
   browser-side compositor step. Removed the instant the user upgrades (paid
   tier re-runs from the cached seed). The watermark is both attribution
   marketing *and* an anti-abuse signal — it discourages commercial scraping
   because the assets aren't clean enough to resell.
6. **Provider-key rotation pool.** 3–5 accounts per lane (compliant with each
   vendor's ToS — no sockpuppetry, every account owned by a real entity in our
   org), round-robined by the router. When one 429s we drop it to the back of
   the queue for an hour. This is the mechanical guard against a single lane
   going dark mid-burn.
7. **Hard ceiling:** if *all four* generation lanes return 429 within 5 s, the
   UI shows "High demand — free tier is at capacity, try again in 15 min, or
   sign up for instant access." This converts abuse bursts into sign-ups.

## Unit economics

Per-free-user-day cost breakdown (amortized, assuming steady-state traffic of
10 000 DAU with a 2 % conversion to paid @ $9/mo):

| Cost line | Qty per free user/day | Unit cost | Daily $/user | Notes |
|---|---|---|---|---|
| Prompt rewrite | ~8 rewrites | $0 (browser WebGPU) | $0.0000 | User's compute |
| Raster generation | 2.3 imgs (3–4 attempts incl. regen-on-validate) | $0.0005 blended (Together free 70% / fal $0.003 × 20% / Cloudflare free 8% / Replicate $0.003 × 2%) | $0.00115 | |
| Background removal | 1.5 imgs | $0 (browser BiRefNet-lite) | $0.0000 | |
| Vectorization | 1.0 logo | $0 (vtracer-wasm) | $0.0000 | |
| OG render | 0.8 req | $0 within 100k/day CF Workers | $0.0000 | |
| Icon resize (30 variants) | ~30 ops | $0 in-browser / CF Images free | $0.0000 | |
| R2 storage | ~500 KB × 7d TTL | $0.015/GB-mo ÷ 30 | $0.0000175 | |
| R2 Class A ops | ~8 PUTs | $4.50/M | $0.000036 | |
| Bandwidth (CDN) | ~3 MB down | $0 (Cloudflare free egress) | $0.0000 | |
| Vercel SSR | ~15 req | $0 within Hobby | $0.0000 | |
| reCAPTCHA v3 | ~1 check | $0 | $0.0000 | |
| **Subtotal (marginal)** | | | **~$0.00122** | |

**Monthly amortized cost per free user:** $0.00122 × 30 = **$0.037/mo**.

**Expected revenue per free user/mo** (conversion model):

| Cohort slice | % of DAU | Monthly ARPU contribution |
|---|---|---|
| Free, never converts | 95 % | $0 |
| Free, converts in 30 days (@$9/mo × 12 mo LTV × 0.85 margin) | 2.0 % | $9 × 12 × 0.85 × 2.0 % = **$1.836** |
| Free, converts later (60–180 d) | 3.0 % | Discounted: **$0.92** |
| **Blended monthly revenue/free-user** | | **~$2.76** |

**LTV:CAC on marginal basis:** $2.76 revenue / $0.037 cost = **74×**. Even if
we're off by 10× on either side (e.g. abuse spikes raster cost to $0.40/mo;
conversion drops to 0.5 %), the ratio stays above 1.5× — the free tier
self-funds its own infrastructure out of conversion.

**Break-even sanity-check:** at **$0.037/user/month** and Vercel Hobby + R2
free tiers covering the first ~50 k DAU, we pay literally $0 until viral
traffic takes us above the Hobby ceiling — at which point conversion has
already funded the upgrade to Vercel Pro ($20/mo) and R2 paid ($0.015/GB-mo
over 10 GB). There is no J-curve, no burn period; the product is black-box
profitable from request #1.

## Risks and escape hatches

- **Together pulls Schnell from the free endpoint.** Rotate to the Cloudflare
  Workers AI lane as primary; Schnell weights are Apache-2.0, so worst-case we
  self-host on a single L40S via Modal (22/18, ~$0.69/hr; still $0 for users
  below 1 k DAU if we keep the warm pool at 1).
- **Promptist weights disappear from HF.** We've mirrored our own copy to R2.
- **Scraper-driven abuse.** Watermark policy + Turnstile + IP rate-limit
  should hold to ~100× baseline; beyond that, lower the daily bundle cap from
  5 to 2 and add a 20-second proof-of-work puzzle (free) above score 0.2.
- **Browser-WASM regression on iOS Safari.** Ship a pure-JS fallback rewriter
  and a server-side `birefnet-general-lite` ONNX microservice (free
  Hugging-Face Space) as last-resort; latency degrades, cost stays ~$0.

## Decision

**Ship the free tier as a browser-first pipeline with edge-rendered
compositing and a four-lane free-credit rotor for raster generation.** Every
layer that can run on the user's compute does — rewriter, background removal,
vectorization, icon resize, ZIP packaging. The only metered step is raster
generation, and it is spread across Together free / fal trial / Cloudflare
Workers AI / Replicate trial so no single vendor sees enough concentration
to throttle us out. Promptist-125M WebGPU gives us a no-server enhancer,
`rembg-webgpu` + BiRefNet-lite gives us zero-egress matting, `vtracer-wasm`
gives us commercial-safe vectorization in 134 KB, Satori + `workers-og`
gives us unlimited OG cards, and content-addressed R2 converts our
`prompt_hash` into the same cache lever SYNTHESIS.md identifies at scale.
Anti-abuse leans on invisible reCAPTCHA + Turnstile + IP-KV counters + a
4 % watermark that doubles as attribution; the math gives us a ~74× LTV:CAC
ratio on marginal cost, self-funded from 2 % conversion at $9/mo. Ship this
first; every other combination plan can be layered on as a paid upgrade
without refactoring the free path.
