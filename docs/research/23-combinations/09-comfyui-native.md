---
wave: 3
role: combination-planner
slug: 09-comfyui-native
optimization_criterion: "ComfyUI-native execution backbone"
date: 2026-04-19
---

# Combination #9 — ComfyUI-native execution backbone

## The decision up front

ComfyUI is our generation engine. Every asset tool (`asset_generate_logo`,
`asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`,
`asset_generate_illustration`, `asset_generate_sticker`) compiles a
user-facing brief into one of six parameterized workflow-JSON templates,
submits it to a **serverless ComfyUI fleet (Modal primary, RunPod
`worker-comfyui` fallback, Replicate `cog-comfyui` escape hatch)**, and
receives either a master PNG or an RGBA master PNG back. Our prompt
enhancer, capability router, brand-bundle injector, and tier-0/1/2
validators sit *in front* of that backbone; closed APIs (`gpt-image-1`,
Ideogram 3, Recraft V3) become a **fallback lane** that the router uses
only when (a) a workflow needs a capability no OSS stack has today
(e.g., non-Latin wordmarks, gpt-image-style photoreal copy) or (b) the
serverless plane is degraded. The product is the pipeline in front of
ComfyUI and the discipline of how we ship workflows to it — not the
sampler.

The criterion pays off by collapsing almost all of SYNTHESIS.md's model
matrix into a single execution surface: SDXL + LayerDiffuse for native
RGBA, SDXL + brand LoRA for marks and illustrations, Flux.1-dev for
text-bearing hero art, Stable Cascade for photoreal fallback. One
runtime, one JSON shape, one lockfile, one cost curve. The closed-API
lane stays narrow and well-defined instead of becoming the default.

## The six shipped workflow templates

Each template lives in the repo at
`lib/workflows/<slug>.api.json` plus a human-readable
`lib/workflows/<slug>.md` that documents the parameter slots and the
validator each exit produces. Templates are stored in ComfyUI **API
format only** (see 20d §"UI vs. API JSON") and mutated by a tiny
`apply_slots(template, slots)` helper that does `dict`-level updates —
never string templating of JSON.

### 1. `logo-flat` — flat-vector brand mark (SVG-bound)

- **Intent:** single-color or 2–4 color flat mark, geometry-first, destined
  for SVG via the raster→vector post-pipeline in 16/17d.
- **Base model:** `sd_xl_base_1.0.safetensors` + `sdxl_vae.safetensors`
  (stock SDXL, CreativeML OpenRAIL++-M, commercial clean).
- **LoRA stack:** `flat_vector_xl_v2.safetensors` (weight 0.9) +
  optional tenant brand LoRA at 0.4–0.6.
- **Custom nodes:** `rgthree-comfy` (Power Lora Loader, Context),
  `ComfyUI-Easy-Use` (v1.3.6) for `easy fullLoader` +
  `easy stylesSelector` with the `Flat Vector Logo` preset,
  `ComfyUI-Impact-Pack` (FaceDetailer swapped for a mask-guided
  detailer on the letterform region when `text_length > 0`, otherwise
  unused), `Comfyroll` (aspect-ratio preset `square_1024`).
- **Shape:** 8 nodes in API JSON. `easy fullLoader` → `easy positive` →
  `easy negative` → `easy preSampling` (dpmpp_2m / karras / 28 steps /
  cfg 7.5) → `easy fullkSampler` → `VAEDecode` → (optional) Impact
  `SEGSDetailer` on a text bbox → `SaveImage`.
- **Exit:** 1024×1024 RGB PNG. Passes to `asset_remove_background`
  (BiRefNet default) → `asset_vectorize` (`vtracer` up to 6 colors,
  SVGO conservative). Tier-0 validator: ≤200 SVG paths, no raster
  `<image>` fallback, text-free OCR check.
- **Never render brand text here** — composite the wordmark in the
  application layer per SYNTHESIS rec #4.

### 2. `logo-3d-emblem` — glossy 3D/emblem mark

- **Intent:** dimensional, shaded emblem (think Stripe, Linear, Raycast
  glyph); destined for raster use at 256/512/1024 (no SVG). This is
  where flat vectorization would destroy the rendering, so we keep it
  as raster and lean on DAT2 upscaling.
- **Base model:** `sd_xl_base_1.0.safetensors` + the `juggernaut-xl-v9`
  merge for photoreal sheen (OpenRAIL++-M inherited; validated at the
  merge card). LayerDiffuse Conv-injection on top to get RGBA in one
  pass (emblems need a real shadow, so alpha matters).
- **LoRA stack:** `3d_emblem_xl.safetensors` (0.75) +
  `glossy_render_xl.safetensors` (0.35) + optional brand LoRA.
- **Custom nodes:** `ComfyUI-layerdiffuse` (the native pack, not
  Easy-Use's wrapper — see 22/17 for the GPL-hygiene argument),
  `rgthree-comfy`, `Comfyroll`, `ComfyUI-Impact-Pack` (for the
  highlight-consistency SEGS pass), the halo-cleanup chain from
  13-INDEX R3 (erode 1px + defringe 2 iters) as three vanilla ops.
- **Shape:** 11 nodes. `CheckpointLoaderSimple` → two
  `LoraLoader`s → `CLIPTextEncode` × 2 → `EmptyLatentImage` (1024²)
  → `LayeredDiffusionApply` (config `SDXL, Conv Injection`, weight 1.0
  per 22/17 issue #127 default) → `KSampler` (dpmpp_2m / karras / 34
  steps / cfg 6.5) → `VAEDecode` → `LayeredDiffusionDecodeRGBA` →
  `SaveImage` as 4-channel PNG.
- **Exit:** 1024×1024 RGBA PNG. Passes to `asset_upscale_refine`
  (DAT2 4× if needed) → validator (alpha present, no checker FFT
  band, bbox inside safe zone).

### 3. `transparent-sticker` — silhouette sticker / emoji-style RGBA

- **Intent:** bold silhouette, white keyline optional, outside drop
  shadow baked into alpha; 512² RGBA.
- **Base model:** SDXL stock (keeps LayerDiffuse on-distribution —
  Pony/Noobai/Illustrious merges break the LoRA per 22/17 §Known
  issues).
- **LoRA stack:** `sticker_kit_xl.safetensors` (0.85) +
  `thick_outline_xl.safetensors` (0.35 if `outline=true`).
- **Custom nodes:** `ComfyUI-layerdiffuse` (primary — the reason this
  template exists), `rgthree-comfy`, `ComfyUI-Easy-Use` (only for
  `easy positive` / `easy negative` string plumbing so the enhancer
  can target named nodes).
- **Shape:** 10 nodes, identical spine to `logo-3d-emblem` minus the
  second LoRA, plus a deliberate 64-multiple snap (`H=W=512`) because
  `LayeredDiffusionDecode` asserts it (22/17 §VRAM requirements).
- **Exit:** 512×512 RGBA PNG, pure alpha-on-transparent. Tier-0
  validator runs the six-check `validate_rgba()` from 13-INDEX R5;
  failure triggers one retry with `injection` flipped `conv↔attn`
  and `weight *= 0.9` before the router escalates to `gpt-image-1`
  with `background:"transparent"` as the fallback lane.

### 4. `app-icon-mark` — 1024² opaque master for the icon fanout

- **Intent:** the **text-free mark** that feeds our
  `asset_export_app_icon_set` pipeline (iOS AppIcon, Android adaptive,
  PWA maskable, visionOS layered, favicon). This template explicitly
  **does not** do the platform fanout — that's `sharp` + `icon-gen`
  downstream. It does one job: produce a 1024² opaque PNG with the
  subject tight-bbox safely inside the iOS 824 safe zone and the
  Android 72dp safe zone.
- **Base model:** SDXL stock + `juggernaut-xl-v9` for volumetric
  subjects; fall back to `sd_xl_base_1.0` for flatter marks.
- **LoRA stack:** `app_icon_xl.safetensors` (0.8) + optional brand
  LoRA (0.4–0.6) + optional `gradient_bg_xl.safetensors` (0.5) when
  the router requests a solid-color backdrop.
- **Custom nodes:** `rgthree-comfy`, `ComfyUI-Easy-Use`,
  `ComfyUI-Impact-Pack` (SEGSDetailer on the center-crop region to
  sharpen the glyph before downscale), `Comfyroll`
  (`center_bbox_check` node used as a pre-flight).
- **Shape:** 9 nodes. No LayerDiffuse — iOS 1024 marketing **must**
  be opaque or the App Store rejects it (09a, 18b). We deliberately
  generate on a brand-derived background color passed in via
  `controls.background_hex`.
- **Exit:** 1024×1024 opaque PNG. Downstream `asset_export_app_icon_set`
  consumes it with `sharp` + `@capacitor/assets` + monochrome
  derivation. Tier-0 validator: no alpha channel, subject bbox inside
  the 72dp safe-zone, WCAG AA contrast against white *and* black cards.

### 5. `og-social-card` — 1200×630 hero frame (no diffusion-rendered text)

- **Intent:** the **background/hero plate** of an OG card. The
  headline is rendered in the application layer by Satori + `@resvg`
  with the brand font (11/18d rec #14). The diffusion job produces a
  text-free composition with the brand palette + subject, sized
  exactly to 1200×630.
- **Base model:** Flux.1-dev (`flux1-dev.safetensors`) for the
  photoreal/editorial look — this is the one place the extra VRAM and
  time are worth it, because an OG card is the most-shared surface.
  Flux schnell (`flux1-schnell.safetensors`, Apache-2.0) is the
  license-clean fallback when `legal_tier=strict` is set. License
  note: Flux.1-dev is **non-commercial**; we require `commercial=false`
  on this route and block it behind the `pro-enterprise` tier pending
  the FLUX.2 legal read (SYNTHESIS G14).
- **LoRA stack:** optional `brand_lora_<slug>` at 0.5–0.8; optional
  `editorial_gradient_flux.safetensors` at 0.4.
- **Custom nodes:** vanilla ComfyUI Flux nodes (`UNETLoader`,
  `DualCLIPLoader` for `clip_l` + `t5xxl_fp8_e4m3fn`,
  `FluxGuidance`, `BasicGuider`, `RandomNoise`, `SamplerCustom`,
  `KSamplerSelect`, `BasicScheduler`) — this is the canonical Flux
  graph, not an Easy-Use shortcut, because Easy-Use's Flux path has
  been the source of 3 of the last 6 breakage reports. `rgthree`
  for Power Lora Loader stacking. No LayerDiffuse (opaque output).
- **Shape:** 13 nodes in API JSON. Resolution 1216×640 (nearest
  64-multiple of 1200×630), cropped server-side to 1200×630 with
  `sharp` before caching. Sampler: `euler` / scheduler `simple` /
  guidance 3.5 / 28 steps — stock Flux-dev recipe from comfyanonymous's
  `flux_dev_example.json`.
- **Exit:** 1200×630 RGB PNG. Headline is composited **after** by
  `generate_og_image(template, headline, image)` using Satori +
  `@resvg`, with OCR-of-composite-result as a tier-0 check.

### 6. `illustration-empty-state` — brand-locked spot illustration set

- **Intent:** a 2–6 image set of empty-state / onboarding
  illustrations that share subject, palette, and line language
  (category 10 is the primary consumer).
- **Base model:** SDXL stock, because brand-LoRA + IP-Adapter is the
  consistency spine from SYNTHESIS §"Brand consistency". Flux
  optional when `flux_illustration=true`, gated by the same
  non-commercial license check.
- **LoRA stack:** brand LoRA (trained via 06d recipe on 20–40 ref
  images) at 0.7, `flat_illustration_xl.safetensors` at 0.4,
  `editorial_spot_xl.safetensors` at 0.3.
- **Custom nodes:** `ComfyUI_IPAdapter_plus` (`IPAdapterApply`,
  `IPAdapterUnifiedLoader`) — this is how style propagates across the
  set; `rgthree-comfy` (Power Lora Loader, Context, Seed+);
  `ComfyUI-Easy-Use` (`easy XYPlot` for N-candidate grids so the
  router can pick the best with `easy imageChooser` or VLM-as-judge);
  `ComfyUI-Impact-Pack` (detailer on body/hand regions — "no extra
  fingers" still matters here); `Comfyroll` (aspect-ratio presets).
- **Shape:** 14 nodes in the single-image path, 17 in the XY-plot
  candidate-sheet path. The candidate-sheet exit returns the grid
  image + cell coordinates for VLM pick.
- **Exit:** up to 6 × 1024×1024 RGB PNGs (or one grid PNG for the
  XY-plot candidate-sheet mode). Tier-0: palette ΔE2000 ≤ 10 vs brand
  palette; tier-1: FD-DINOv2 mean distance across the set < threshold
  from the pick (style-consistency proxy per 03/15).

## Custom node + base-model manifest (union across all six templates)

Baked into the serverless image at build time. Everything else (models
downloaded at request time, LoRAs pulled via `LoraLoaderFromURL`) is
forbidden on the primary plane — pre-bake or don't ship.

**Custom node packs, pinned by commit SHA:**

```
comfyanonymous/ComfyUI                @ v0.3.75          (GPL-3.0 — out-of-process only)
Comfy-Org/ComfyUI-Manager             @ 3.32.4           (only for build-time install)
huchenlei/ComfyUI-layerdiffuse        @ 2c1e8b4          (Apache-2.0)
yolain/ComfyUI-Easy-Use               @ v1.3.6           (GPL-3.0 — out-of-process only)
rgthree/rgthree-comfy                 @ 5e0f7a1
ltdrdata/ComfyUI-Impact-Pack          @ v8.24
Suzie1/ComfyUI_Comfyroll_CustomNodes  @ d0c37ad
cubiq/ComfyUI_IPAdapter_plus          @ 4a9e2d1
```

**Base models + weight hashes, baked into the worker image:**

```
sd_xl_base_1.0.safetensors            sha256: 31e35c80fc...  (OpenRAIL++-M)
sdxl_vae.safetensors                  sha256: 235745af8d...
juggernaut-xl-v9.safetensors          sha256: f7e4...        (OpenRAIL++-M inherited)
flux1-dev.safetensors                 sha256: 6e4...          (Flux non-commercial — tier-gated)
flux1-schnell.safetensors             sha256: 5e5...          (Apache-2.0 — default)
t5xxl_fp8_e4m3fn.safetensors          sha256: 7d33...
clip_l.safetensors                    sha256: 660c...
ae.safetensors                        (Flux VAE)
# LayerDiffuse weights (OpenRAIL-M)
layer_xl_transparent_conv.safetensors
layer_xl_transparent_attn.safetensors
vae_transparent_decoder.safetensors
# LoRAs
flat_vector_xl_v2, 3d_emblem_xl, glossy_render_xl, sticker_kit_xl,
thick_outline_xl, app_icon_xl, gradient_bg_xl, editorial_gradient_flux,
flat_illustration_xl, editorial_spot_xl
```

## Lockfile approach — `comfy-pack` `.cpack.zip` + Modal Image as dual lock

The single biggest operational risk in ComfyUI land is custom-node
drift — 20d §6 and 18/18-serverless §3 both call it out. Our lockfile
discipline is **two layers, both content-addressed**:

1. **Portable lock — `bentoml/comfy-pack` `.cpack.zip`.** Every
   template in `lib/workflows/` ships with a committed `.cpack.zip`
   (see 18/18-serverless path #6) that records: ComfyUI commit, every
   custom-node commit SHA, every Python package version, every model
   hash referenced via HF/Civitai URLs, and the I/O schema declared
   on `SaveAsOutput`/`LoadAsInput` nodes. Humans and agents can
   `comfy-pack unpack <template>.cpack.zip` to reproduce the env
   bit-for-bit on a laptop, a GH Action, or a fresh Modal image. This
   is the cross-platform ground truth.
2. **Plane-specific lock — `modal.Image` content hash on primary,
   pinned Dockerfile on fallback.** The Modal image builder reads
   from the same `.cpack.zip` manifest and emits a content-hashed
   `modal.Image`; the RunPod Dockerfile does the same via
   `comfy-cli node install <name>@<sha>`; the Replicate `cog.yaml`
   fork of `replicate/cog-comfyui` pins the same SHAs. All three
   land at the same state; CI runs `scripts/diff-locks.py` and fails
   the build on any drift between the three lanes.

Rebuild cadence: weekly on Sundays via GH Actions, regardless of
whether anything changed upstream, so drift is caught by scheduled
regeneration of 20 canary assets per template (smoke-tested against
the committed hashes of their tier-0 outputs).

## Serverless host choice

**Primary: Modal (`@app.cls()` + `@modal.enter(snap=True)`).**
Six functions, one per template, each with `min_containers=1` during
business hours and `min_containers=0` overnight, `max_containers=50`.
Memory snapshots per 18-serverless §2 deliver the <3 s cold-start that
keeps our "kickoff → SSE progress → URL" contract under 10 s end-to-end.
FastAPI async-generator endpoints stream progress from ComfyUI's
`/ws` `progress` events to the calling MCP client as SSE — a
first-class feature on Modal, absent from every other host except
RunPod.

**Fallback: RunPod `worker-comfyui` on L4 24 GB (SDXL templates) and
A100-80 (Flux templates).** Same template JSON ships unchanged;
`/runsync` for latency-critical calls, `/run` for batch. FlashBoot
absorbs ~48 % of cold starts under 200 ms; S3 save via
`BUCKET_ENDPOINT_URL` feeds directly into Cloudflare R2. Active
Workers are *not* the default — we pay per-second on Flex and let
Modal take the steady-state load.

**Escape hatch: Replicate `replicate/cog-comfyui`.** One Cog fork per
template family, kept buildable on every merge to main but deployed
only when Modal *and* RunPod are simultaneously degraded.
`LoraLoaderFromURL` means brand LoRAs don't require a redeploy, which
makes this the "boring Sunday 3 AM" option per 18-serverless §Ranked
table. Per-run cost ($0.016 L40S / $0.039 A100) beats our blended
Modal cost only at volumes below ~100 req/day, so the fallback is
also our dev-local and brand-new-tenant-bootstrap plane.

Routing precedence inside `ImageProvider.dispatch(workflow, asset_type)`:
Modal → RunPod → Replicate → hosted API (`gpt-image-1`, Ideogram 3,
Recraft V3). Hosted API is selected *only* when the router decides a
capability is out of scope for the OSS plane (wordmarks >3 words,
non-Latin scripts, photoreal typography). Every fallback transition
records a `provider_degraded` metric so we can tune `min_containers`
instead of accidentally living on Replicate.

## Cold-start strategy and warm pools

- **Modal memory snapshots** are the core lever. `@modal.enter(snap=True)`
  loads ComfyUI, imports Torch, warm-loads the SDXL base checkpoint +
  the per-template LoRA set, then snapshots. `@modal.enter()` without
  `snap=True` loads the LayerDiffuse weights (too big to snapshot
  cheaply). Combined, OpenArt's public number is ~4 s median
  end-to-end (cold); we target ≤6 s cold and ≤2 s warm per 22/17's
  SDXL+LayerDiffuse measurements on A10G.
- **Per-template warm pools.** `logo-flat`, `app-icon-mark`,
  `transparent-sticker`, `illustration-empty-state` share an SDXL
  image (warm pool = 2 during business hours, 0 overnight). `og-social-card`
  is a separate Flux image (warm pool = 1 during business hours, 0
  otherwise) because Flux weights dominate memory and we don't want
  one container shuttling between SDXL and Flux. `logo-3d-emblem`
  shares the SDXL image.
- **Predictive warm-up.** On `asset_enhance_prompt` — which always
  precedes a generation — we fire a `/modal/warmup?template=<slug>`
  request in parallel with returning the enhanced prompt to the
  caller. By the time the caller hits `asset_generate_*`, the
  container is warm. This trick turns cold→warm into the *common*
  case and costs a few cents per hour of GPU idle.
- **Spillover to RunPod Flex** when Modal's `max_containers=50` cap
  is reached — health check every 30 s, tripped automatically by the
  same `ImageProvider` abstraction.

## Cost per generation — concrete numbers

Blended, including GPU idle from warm pools (amortized across
expected volume at 1 k req/day/template):

| Template | GPU tier | Time/gen | Marginal GPU cost | All-in cost incl. idle |
|---|---|---|---|---|
| `logo-flat` (SDXL 1024²) | A10G | 6 s | $0.0033 | ~$0.006 |
| `logo-3d-emblem` (SDXL + LD 1024²) | A10G | 9 s | $0.0049 | ~$0.009 |
| `transparent-sticker` (SDXL + LD 512²) | A10G | 5 s | $0.0028 | ~$0.005 |
| `app-icon-mark` (SDXL 1024²) | A10G | 6 s | $0.0033 | ~$0.006 |
| `og-social-card` (Flux-dev 1216×640) | A100-80 | 18 s | $0.0125 | ~$0.019 |
| `illustration-empty-state` (SDXL, single) | A10G | 7 s | $0.0038 | ~$0.007 |

At the 25 % `prompt_hash` cache-hit rate from SYNTHESIS rec #8, the
**user-visible blended cost sits around $0.006 per asset call** for
the five SDXL-routed templates and ~$0.014 per OG card. That's about
**3× cheaper than the closed-API fallback lane** ($0.019 for
`gpt-image-1` 1024² transparent) and about **10× cheaper than
Replicate's per-run pricing at SDXL** once amortized over ~200
daily calls per template. RunPod and Replicate lanes are more
expensive per call but require zero steady-state idle spend, which is
why they are correctly positioned as fallback/escape rather than
primary.

## What explicitly does not go through ComfyUI

Keeping this list short is how we stay ComfyUI-native without
over-rotating:

- **OG card typography** — Satori + `@resvg` + brand font, rendered
  in Node, compositing the ComfyUI hero plate. Diffusion never
  renders the headline.
- **App-icon platform fanout** — `sharp` + `@capacitor/assets` +
  `icon-gen` + `icnsutil`. ComfyUI produces the master; deterministic
  code produces the 30+ derived sizes.
- **Vector output for flat logos** — BiRefNet matte + K-means +
  `vtracer` + SVGO, outside ComfyUI. `Recraft V3 /vectorize` is the
  API fallback per SYNTHESIS rec #3.
- **Wordmarks > 3 words or non-Latin scripts** — routed to
  `gpt-image-1` or Ideogram 3 via the closed-API lane, then
  recomposed with SVG type (or accepted as the final). This is the
  acknowledged OSS gap in SYNTHESIS G13.

## Decision

Adopt ComfyUI as the execution backbone for all six asset-generator
MCP tools. Ship the six templates as pinned API-format JSON +
`.cpack.zip` locks in `lib/workflows/`, bake the union node/model
manifest into a Modal Image rebuilt weekly, run Modal as the primary
plane with predictive warm-up, RunPod `worker-comfyui` as fallback,
Replicate `cog-comfyui` as escape hatch, and the closed APIs only as
the last-resort route selected by capability. LayerDiffuse is the
native-alpha spine (22/17); Easy-Use is called over the wire but
never vendored (22/18 GPL hygiene); `comfy-pack` is the portable lock
format regardless of deploy target (18-serverless §6). This combination
buys us one runtime to reason about, deterministic JSON mutation as
the only contract the enhancer has to produce, a blended generation
cost under a cent for the common case, and a clean escape path when
the OSS plane can't yet meet the capability.
