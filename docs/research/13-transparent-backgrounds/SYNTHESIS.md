---
category: 13-transparent-backgrounds
role: category-index
status: final
date_compiled: 2026-04-19
pain_rank: 1
pain_description: >
  Gemini (and most frontier T2I) outputs a baked-in gray-white checkerboard
  pattern, a solid white fill, or an invented scene when asked for a
  "transparent logo" / "transparent background" — producing a fully-opaque
  RGB PNG that looks transparent at a glance and is useless for compositing.
angles_indexed:
  - 13a-rgba-architecture-layer-diffuse.md
  - 13b-difference-matting-and-chroma-keying.md
  - 13c-checkerboard-pixel-drawing-failure.md
  - 13d-matting-models-birefnet-rmbg-u2net.md
  - 13e-end-to-end-transparent-pipelines.md
native_rgba_models:
  - gpt-image-1 / gpt-image-1-mini / gpt-image-1.5  (OpenAI, `background:"transparent"`; quality must be "medium" or "high")
  - Ideogram 3.0 (dedicated `/ideogram-v3/generate-transparent` endpoint; speed tiers: FLASH/TURBO/BALANCED/QUALITY)
  - Adobe Firefly (UI/API transparent-PNG toggle)
  - LayerDiffuse on SD 1.5 / SDXL (OSS, arXiv:2402.17113)
  - LayerDiffuse-Flux (OSS, RedAIGC, AFL-3.0; NOTE: base Flux.1-dev is BFL Non-Commercial — commercial hosting needs BFL license)
native_rgba_post_hoc_only:
  - Recraft v3 (in-generation transparent-style flag unreliable as of 2025; use the Remove Background post-processor instead)
no_alpha_models:
  - Gemini 2.5 Flash Image ("Nano Banana")
  - Gemini 3 Pro / Flash Image ("Nano Banana Pro / 2")
  - Imagen 3, Imagen 4 (generate / fast / ultra)
  - Midjourney v6, v7
  - DALL·E 3
  - SDXL base, Flux.1 [dev] / [pro] base (without LayerDiffuse)
trigger_phrases_to_rewrite:
  - "transparent background"
  - "transparent"
  - "PNG with alpha"
  - "alpha channel"
  - "no background" / "no backdrop"
  - "cutout" (alone)
  - "isolated" (alone)
safe_rewrite_skeleton: >
  "isolated on a pure solid #FFFFFF white seamless studio background,
  edges crisp, no floor, no gradient, no vignette"
default_matter_stack:
  - BiRefNet (MIT, best quality, SOTA on DIS5K; use session="birefnet-general" or "birefnet-matting" for hair/glass)
  - BRIA RMBG 2.0 (quality peer, BUT CC-BY-NC-4.0 — commercial license required)
  - rembg (wrapper, Apache-2.0; default model is U²-Net — must explicitly specify birefnet-general)
  - InSPyReNet via `transparent-background` (MIT, nicest CLI)
  - Difference matting via edit endpoint (for semi-transparency)
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# 13 · Transparent Backgrounds — Category Index

> **Category pain rank: #1.** This is the failure mode that triggered the
> entire research project — the user typed *"a transparent logo for my
> note-taking app"* into Gemini and got back a PNG with "weird boxes in the
> background." That PNG is the Photoshop transparency checkerboard **drawn
> into RGB pixels**. There is no alpha channel. This index pulls together
> five angles of research (13a–13e) and turns them into the surgical
> recommendations a prompt-to-asset must implement.

## Category Executive Summary

The fifteen insights below are the "alpha-channel truth" — what every
downstream component (router, rewriter, orchestrator, validator) must
internalize.

1. **The checker is not a rendering bug, it's a grounding failure.** Web-scale
   training corpora (LAION, CommonPool, WebLI, DataComp) scraped *screenshots*
   of Photoshop/Figma/GIMP where transparent PNGs are *displayed* over a
   checker. The joint distribution `P(checker-like-RGB | "transparent
   background")` is dominant, so diffusion models paint the *picture of
   transparency* instead of emitting an alpha plane ([13c](./13c-checkerboard-pixel-drawing-failure.md)).

2. **VAEs are RGB-only by construction.** SD 1.x/2.x/SDXL, Flux, Imagen, and
   Gemini all encode 3-channel pixels into a 4- or 16-channel *feature-space*
   latent; no plane in that tensor carries alpha. Adding an alpha channel
   requires retraining the VAE **plus** the U-Net/DiT **plus** the text-
   alignment model on billions of RGBA images that don't publicly exist
   ([13a §1](./13a-rgba-architecture-layer-diffuse.md)). This is why prompts
   cannot unlock transparency — there is no weight in the decoder that
   produces alpha.

3. **Alpha is silently dropped on BOTH sides of Gemini.** GitHub issue
   [google-gemini/generative-ai-python #567](https://github.com/google-gemini/generative-ai-python/issues/567)
   (internal bug `b/369593779`) confirms transparent-PNG *inputs* are
   flattened to RGB before the model sees them. Vertex AI's Imagen 4 model
   card explicitly reads: *"Transparent background: Not supported"*
   ([13a §3, 13c §1](./13a-rgba-architecture-layer-diffuse.md)).

4. **Three commercial model families emit real RGBA in April 2026.**
   OpenAI's `gpt-image-1` lineage (`background:"transparent"` is a first-
   class API parameter, not a prompt hint); Ideogram 3.0's dedicated
   `/ideogram-v3/generate-transparent` endpoint (supports FLASH/TURBO/
   BALANCED/QUALITY speed tiers, clean RGBA PNG, no post-processing); and
   Recraft v3 — but only via the post-hoc "Remove Background" tool, as the
   in-generation transparent-style flag has degraded since launch.
   ([13a §3 matrix](./13a-rgba-architecture-layer-diffuse.md);
   [Recraft Canny thread](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background);
   [Ideogram API docs](https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3)).

> **Updated 2026-04-21:** Ideogram 3.0 `generate-transparent-v3` is confirmed active and production-ready. Route logo/icon/typography transparent requests here as a primary native-RGBA option alongside `gpt-image-1`.

5. **LayerDiffuse is the only OSS architectural fix.** Zhang & Agrawala's
   SIGGRAPH 2024 paper ([arXiv:2402.17113](https://arxiv.org/abs/2402.17113))
   encodes alpha as a regulated *latent offset* added to the frozen SD/Flux
   latent, trains a transparency encoder + decoder, and ships native RGBA.
   Their user study reports **97 % of participants preferred LayerDiffuse
   output over generate-then-matte**, with quality indistinguishable from
   Adobe Stock. Ports exist for SD 1.5, SDXL, and Flux.1-dev via custom
   `TransparentVAE.pth` + `layerlora.safetensors`
   ([13a §2](./13a-rgba-architecture-layer-diffuse.md)).

6. **The word "transparent" is the single biggest trigger.** Across twelve
   paraphrasings tested on fifteen models, the literal phrase *"transparent
   background"* produces a baked-in checker in Nano Banana ~30 % of the
   time. Replacing it with a **positive anchor** (`"on a pure solid
   #FFFFFF seamless studio background"`) drops checker probability to near
   zero, because the positive anchor steers the diffusion trajectory into a
   dominant, clean e-commerce/studio training cluster ([13c §Prompt Audit](./13c-checkerboard-pixel-drawing-failure.md)).

7. **Negations are almost always bad.** CLIP/T5 text encoders don't encode
   "not X" — they attend to X anyway. *"No background"*, *"no scenery"*,
   *"no floor"* frequently trigger the *theatre* failure (the model invents
   a beach, a desk, a tablecloth). Always rewrite negations as positive
   anchors ([13c §Prompt Audit](./13c-checkerboard-pixel-drawing-failure.md)).

8. **Explicit hex codes beat color names.** `#FFFFFF` lands as a rare,
   distinctive token sequence that attends to clean-plate catalog data;
   *"white"* lands on everything from snow to polar bears to dresses. Same
   effect for `#000000` vs *"black"*. The word `seamless` is also
   underrated — it tilts toward seamless-studio training distributions
   ([13c](./13c-checkerboard-pixel-drawing-failure.md)).

9. **Difference matting is Smith & Blinn (1996) revived by AI edit
   endpoints.** Generate subject on pure `#FFFFFF`, then use the model's
   edit endpoint (Nano Banana, `gpt-image-1` edit, Flux.1 Fill) to swap the
   background to `#000000` while preserving the foreground. Solve `α = 1 −
   ‖c_white − c_black‖ / √3` per pixel, unpremultiply with 70/30 black-
   weighted recovery. This is what [Julien De Luca's Replicate model
   `jide/nano-banana-2-transparent`](https://replicate.com/jide/nano-banana-2-transparent)
   productionizes ([13b §Triangulation](./13b-difference-matting-and-chroma-keying.md)).

10. **The edit-endpoint trick is the 2025 innovation.** Smith & Blinn
    required *pin-registered film stock* (physical pin registration to
    prevent sub-pixel drift). Modern image-edit endpoints are
    preservation-biased by training objective — they re-render only the
    instructed region. This accidentally satisfies all the film-era
    constraints that killed triangulation matting as a production
    technique ([13b Appendix](./13b-difference-matting-and-chroma-keying.md)).

11. **BiRefNet is the default matter in 2026.** MIT license, SOTA on DIS5K
    (S_α 0.901 vs IS-Net 0.813 vs U²-Net 0.748), handles hair/fur/glass,
    ~110 ms at 1024² on RTX 4080 via TensorRT, 4.7 MB `u2netp` variant for
    mobile/browser. [BiRefNet paper](https://arxiv.org/abs/2401.03407),
    [repo](https://github.com/ZhengPeng7/BiRefNet)
    ([13d §Benchmark Table](./13d-matting-models-birefnet-rmbg-u2net.md)).

12. **BRIA RMBG 1.4 / 2.0 is a commercial-license trap.** Both are
    **CC-BY-NC-4.0** on Hugging Face and require a paid Bria contract for
    any commercial product. Quality is peer-tier with BiRefNet; use
    BiRefNet (MIT) in production unless you've negotiated a Bria license
    ([13d §License Warnings](./13d-matting-models-birefnet-rmbg-u2net.md)).

13. **Straight-alpha vs premultiplied-alpha is where halos originate.**
    PNG files are straight-alpha; render engines (Chrome compositor,
    Skia, Cairo, Core Graphics, WebGL) work in premultiplied. Round-
    tripping through straight alpha introduces fringe at anti-aliased
    edges if the unpremultiply is done in `uint8` rather than float and
    clamped near α→0. Playwright's `omitBackground` has hit this in
    production ([13a §4 Matte Math Primer](./13a-rgba-architecture-layer-diffuse.md)).

14. **Validation is non-negotiable.** Every asset returned from a
    non-native-RGBA model must be screened. The common broken outputs
    are cheap to detect: `mode != "RGBA"`, `min(alpha) == 255`
    (baked-in opaque), `max(alpha) == 0` (subject deleted), edge-band
    pixel count < 64 (binary alpha / no AA), 2×2 block variance anomaly
    (baked checker), all four corners opaque. Plugins silently ship
    broken PNGs without this step ([13e §Validation](./13e-end-to-end-transparent-pipelines.md)).

15. **Logos deserve a vectorize-and-drop path.** Raster matting
    introduces halos at every scale. Instead: generate the logo on
    `#FFFFFF`, vectorize with
    [vtracer](https://github.com/visioncortex/vtracer), delete the
    background path in SVG, rasterize at any size. Edges stay crisp at
    every export size; alpha is binary with SVG anti-aliasing
    ([13e Decision Tree](./13e-end-to-end-transparent-pipelines.md)).

---

## Map of the Angles

| Angle | Focus | Depth | Key payload for the product |
|---|---|---|---|
| **[13a — Alpha at the Model-Architecture Level](./13a-rgba-architecture-layer-diffuse.md)** | Why VAEs can't emit alpha; LayerDiffuse's latent-transparency trick; matte-math primer (straight vs premultiplied, difference-matte derivation) | Architectural / foundational | The "why" behind the entire category; defines `native_rgba` vs `post-matte` model buckets |
| **[13b — Difference Matting, Chroma Keying, Solid-BG Removal](./13b-difference-matting-and-chroma-keying.md)** | Smith & Blinn 1996 triangulation derivation; edit-endpoint pin-registration trick; full Python reference for `difference_matte`; chroma-key with despill; seed-stability matrix across models | Algorithmic / recipe | Makes non-RGBA models (Gemini, Midjourney) produce true semi-transparent alpha at 2× generation cost |
| **[13c — Checkerboard Pixel-Drawing Failure](./13c-checkerboard-pixel-drawing-failure.md)** | Root-cause audit across 15 models × 12 prompt paraphrasings; detection heuristics (H1 border-kmeans, H2 FFT notch, H3 autocorrelation, H4 Colin-Lord phase drift); safe-rewrite catalog; plugin-intercept rules | Empirical / prompt-audit | The **rewrite rules** the enhancer ships; the **detector** it runs on every output |
| **[13d — Matting Models: BiRefNet, RMBG, U²-Net, InSPyReNet, MatAnyone](./13d-matting-models-birefnet-rmbg-u2net.md)** | SOTA benchmarks (DIS5K, AIM-500); speed/quality Pareto across CPU/CUDA/TensorRT/CoreML/WebGPU; license trap warnings; rembg model list; commercial-API pricing comparison | Model-landscape / selection | Picks **which** matting model to call for each asset kind and deployment target |
| **[13e — End-to-End Pipelines](./13e-end-to-end-transparent-pipelines.md)** | Decision tree; full Python + Node reference implementations; shadow-synthesis (drop, relight, matting-preserved); halo removal (erode+feather+defringe); six-check validation harness; test cases | Integration / reference code | The **plugin's skill implementation** — drop-in code for Python and Node contexts |

Reading order for an implementer: **13c → 13e → 13a → 13b → 13d**. 13c
defines the rewrite rules the enhancer enforces; 13e is the reference
implementation; 13a explains why the rules are needed; 13b enables the
premium "semi-transparency" path; 13d chooses matting-model defaults.

---

## Cross-Cutting Patterns

Four patterns recur across every angle:

**1. The RGBA-native / post-matte split is the only axis that matters for
routing.** Every angle arrives at the same bi-modal model taxonomy.
Native-RGBA models bypass the entire failure landscape (13c's checker
detector, 13b's difference matting, 13e's halo removal). Post-matte
models must be wrapped by a pipeline that (a) rewrites away trigger
phrases, (b) generates on a solid anchor, (c) mattes, (d) cleans edges,
(e) validates. The enhancer's *first* decision is always
`is_native_rgba(target_model)`; every subsequent branch flows from it.

**2. Positive anchors beat negative constraints — always.** 13a's matte
math, 13b's difference matting, 13c's prompt audit, and 13e's
`_prompt_for_fallback` helper all independently converge on the same
rule: substitute `"on a pure solid #FFFFFF seamless studio background"`
for any mention of "transparent", "no background", or "isolated". This
is the single highest-leverage intervention in the category.

**3. Alpha is a protocol concern, not a pixel concern.** 13a's
architecture argument, 13c's Gemini input-drop bug, and 13e's validator
all show that alpha travels through (or dies in) the **API contract**,
not the prompt text. `gpt-image-1`'s `background:"transparent"` is an
API field; Ideogram has a dedicated endpoint. Prompting alone cannot
unlock transparency on models whose protocol doesn't expose it.

**4. Edit-endpoints unlock capabilities the base model doesn't have.**
13b's difference-matting revival and 13e's shadow-preservation via
BackgroundMattingV2 both exploit image→image *editing* to sidestep
limitations of the underlying text→image generator. This is a general
prompt-to-asset pattern: when the base model lacks capability X, check
whether a two-call (generate → edit) flow can synthesize X from the
model's edit endpoint.

---

## Controversies

**Recraft v3's "native transparent" claim.** Recraft markets transparent
output, but community feedback since launch ([Canny thread](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background))
reports that the in-generation transparent-style flag no longer produces
reliable transparent backgrounds even on vector/icon styles as of 2025–2026.
13c previously listed it as native; 13e previously used it as a primary fallback.

> **Updated 2026-04-21 — Resolution:** Recraft's reliable transparency path in 2026 is the **post-hoc Remove Background API/tool**, not the in-generation transparent-style flag. The API does offer true SVG output (`response_format: "svg"`), which is intrinsically transparent; for PNG output with alpha, route through the Remove Background step regardless of style. All files in this category now classify Recraft V3 under `alpha_native_restricted` / post-hoc, not native in-generation.

**LayerDiffuse vs difference matting on semi-transparency.** 13a cites
the 97 % LayerDiffuse user-study preference as evidence that native
RGBA beats post-matting. 13b documents that difference matting via
edit endpoints produces "real" semi-transparent alpha indistinguishable
from LayerDiffuse on glass, smoke, hair. Resolution: LayerDiffuse wins
when accessible (self-hosted Flux), but for *hosted-only* model
families (Gemini, Imagen), difference matting is the best-available
path and is quality-competitive with LayerDiffuse at the cost of 2×
generation calls.

**`gpt-image-1` vs Ideogram 3.0 as default native-RGBA.** 13c ranks
them side-by-side. `gpt-image-1` wins on photographic content; Ideogram
3.0 wins on typography and flat design. Neither universally dominates.
Resolution: route by asset kind (photo/illustration → OpenAI, logo/
typography/icon → Ideogram 3.0). Recraft vector SVG is still a reliable
path for simple marks when you want a true vector format. For RGBA PNG
from Recraft, use their Remove Background post-processor, not the
transparent-style flag.

**BiRefNet vs BRIA RMBG 2.0 on hair.** 13d reports them as
"indistinguishable to the eye on most images", with RMBG 2.0
occasionally preserving thinner strands on very bright backgrounds.
Likely a training-data difference (Bria's curated commercial dataset vs
DIS5K + open web). Since BiRefNet is MIT and RMBG is CC-BY-NC-4.0, the
commercial cost/benefit decisively favors BiRefNet for production.

---

## Gaps

Things no angle fully resolved; research directions for v2:

- **No public benchmark for the "checker hallucination" rate per model
  per prompt.** 13c gives hand-measured ratios ("Nano Banana ~30 %")
  but there is no held-out test set the community can re-run.
- **LayerDiffuse-Flux commercial licensing status — partially resolved.** The `layerlora.safetensors` and `TransparentVAE.pth` weights from `RedAIGC/Flux-version-LayerDiffuse` carry an AFL-3.0 license (Academic Free License 3.0, which permits commercial use). However, the underlying base model `Flux.1-dev` is non-commercial (BFL Non-Commercial License v2). Commercial self-hosting requires switching the base to `Flux.1-pro` under a BFL commercial license, or using BFL's hosted API. See `bfl.ai/licensing` for current BFL commercial terms.

> **Updated 2026-04-21:** AFL-3.0 on the LoRA weights does not save you if the base model is non-commercial. Do not ship a hosted LayerDiffuse-Flux service without a BFL commercial agreement covering the base model.
- **No benchmarks for LayerDiffuse vs difference-matting on
  *identical* prompts.** The LayerDiffuse user study compared against
  "generate-then-matte" with U²-Net; modern difference matting via
  edit endpoints was not tested.
- **Gemini 3 Pro Image ("Nano Banana Pro / 2") capability drift.** As
  of the [De Luca Mar 2026 writeup](https://jidefr.medium.com/nano-banana-2-with-transparency-4673640bb9e6)
  the model *still* has no native alpha; we should monitor the Vertex
  AI Imagen capability matrix monthly, because one release could
  collapse a third of this category's complexity.
- **WebGPU in-browser matting stability.** `@huggingface/transformers.js`
  + BiRefNet ONNX works in recent Chrome / Safari Technology Preview
  but ships kernel-compilation failures on older GPUs. Needs a
  feature-detect + server-side fallback.
- **Checkerboard detector recall on non-grey checkers.** H1/H2 detectors
  in 13c assume `#FFFFFF` / `#CCCCCC` checker tiles. Some models
  hallucinate colored checkers; the 2-means centroid distance
  threshold would need loosening.

---

## Actionable Recommendations

> This is the surgical playbook — five rules the prompt-to-asset ships
> verbatim. Every rule traces to a cited finding.

### R1. Model routing — route by real-RGBA capability first

Maintain this capability table as the **first** gate in the pipeline:

```yaml
alpha_native_protocol:          # pass the flag/endpoint, prompt stays clean
  - gpt-image-1
  - gpt-image-1-mini
  - gpt-image-1.5                 # set `background:"transparent"`
  - ideogram-3.0                  # call `/ideogram-v3/generate-transparent`
                                   # (speed tiers: FLASH / TURBO / BALANCED / QUALITY)
alpha_native_restricted:        # reliable only via post-hoc tool, not in-generation
  - recraft-v3                    # use the "Remove Background" post-processor;
                                   # the in-generation transparent-style flag is unreliable
alpha_via_oss_self_host:        # needs LayerDiffuse stack (non-commercial base)
  - stable-diffusion-xl + layer_xl_transparent_attn.safetensors
  - flux.1-dev + TransparentVAE.pth + layerlora.safetensors
    # NOTE: flux.1-dev is BFL Non-Commercial; for commercial use, need BFL commercial license
alpha_requires_post_matte:      # generate-on-white + matter
  - gemini-2.5-flash-image        # Nano Banana
  - gemini-3-pro-image            # Nano Banana Pro / 2
  - imagen-3 / imagen-4-*         # all variants
  - midjourney-v6 / v7
  - dall-e-3
  - stable-diffusion-xl (base)
  - flux.1-dev / flux.1-pro (base)
```

> **Updated 2026-04-21:** `ideogram-3.0` moved from `alpha_native_protocol` sub-note to confirmed primary entry. `recraft-v3` reclassified to `alpha_native_restricted` (in-generation transparent flag unreliable; post-hoc Remove Background tool is the reliable path). Flux.1-dev commercial licensing caveat added.

Routing order: if the user has no model preference and transparency is
required, default to **`gpt-image-1.5` (photographic/illustration) or
`ideogram-3.0` (logo/typography/flat design) → Recraft v3 Remove Background
(vector styles via post-hoc tool) → post-matte fallback**. For self-hosted
workloads, route to **LayerDiffuse-Flux** ([RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse))
only when you have a BFL commercial license for the base model.

Key source: [13a §3 Model Capability Matrix](./13a-rgba-architecture-layer-diffuse.md),
[13c §Plugin Implications](./13c-checkerboard-pixel-drawing-failure.md).

### R2. Prompt rewriting rules — never ship the word "transparent"

When the target model is in `alpha_requires_post_matte`, apply these
rewrites **before** the call:

| Trigger input | Rewrite (skeleton) |
|---|---|
| `transparent background`, `transparency`, `alpha channel`, `PNG with alpha` | `"isolated on a pure solid #FFFFFF white seamless studio background, edges crisp, no floor, no gradient, no vignette"` |
| `cutout`, `isolated` (alone) | same as above; pair with the subject |
| `no background`, `no backdrop`, `no scenery` | **Replace negation with positive anchor** (never ship `no` to CLIP/T5) |
| Subject is light/white/glass | Use **`#000000` black anchor** instead of white |
| Subject has both bright-white and pure-black regions | Use **arbitrary two-color** anchors (e.g. cyan + magenta) for Smith-Blinn Theorem 4 matting |

Anchor-color auto-selection heuristic (zero-cost, from 13c):
adjectives `{white, ivory, crystal, glass, pale, ceramic, glossy}` →
black anchor; `{black, dark, charcoal, matte, colorful, neon,
vibrant}` → white anchor; ambiguous → emit a **difference-matting plan**.

Key source: [13c §Safe Rewrites](./13c-checkerboard-pixel-drawing-failure.md).

### R3. Post-process fallback chain

For every `alpha_requires_post_matte` generation, run this chain:

```
solid-background render (R2 rewrite)
   ↓
BiRefNet (rembg session="birefnet-general", alpha_matting=True)
   ↓ (if hair/fur/glass/semi-transparency)
soft-alpha matter: MatAnyone or BackgroundMattingV2
   ↓
alpha refine: erode 1px + Gaussian blur σ≈0.7 + defringe 2 iters
   ↓
validation (R5)
```

Model-choice ladder within the matting step:

1. **BiRefNet** (`birefnet-general`) — MIT, SOTA, default.
2. **BiRefNet-lite** — for <50 ms server latency or WebGPU.
3. **InSPyReNet** (via `transparent-background`) — CLI/ergonomics tier.
4. **U²-Net / `u2netp`** — CPU/mobile/offline fallback, Apache-2.0.
5. **BRIA RMBG 2.0** — **only** if a Bria commercial license is in place.
6. **Photoroom API** ($0.02/image basic, $0.10/image plus) or **remove.bg API** (credit-based, ~$0.05/image standard; HD varies — check `remove.bg/pricing`) — managed tier.

> **Updated 2026-04-21:** remove.bg pricing moved to a credit model (1 credit ≈ $0.01; standard removal costs ~5 credits = ~$0.05/image at list price). The old "$0.20/image HD" figure is stale. Photoroom pricing confirmed at $0.02 basic / $0.10 plus as of 2026.

Key source: [13d §Benchmark Table, §Speed vs Quality Pareto](./13d-matting-models-birefnet-rmbg-u2net.md),
[13e §Python Pipeline](./13e-end-to-end-transparent-pipelines.md).

### R4. Difference matting — premium-quality path for semi-transparent subjects

Enable difference matting when `subject ∈ {glass, smoke, hair, fur,
liquid, chrome, gemstone, translucent, soft shadow preserved}` **OR**
when the user explicitly opts into "hero quality".

Full pipeline (from [13b §End-to-end](./13b-difference-matting-and-chroma-keying.md)):

```python
white_bytes = generate(prompt + " on #FFFFFF seamless studio bg")
black_bytes = edit(white_bytes,
    "Change the background to solid pure #000000 black. "
    "Keep every pixel of the subject exactly unchanged. "
    "Do not alter lighting, pose, or proportions.")
alpha = 1.0 - np.linalg.norm(w - b, axis=2) / np.sqrt(3.0)
rgb = 0.7 * (b / max(alpha, 1e-3)) + 0.3 * ((w - (1-alpha)) / max(alpha, 1e-3))
```

Edit-endpoint preference (pin-registration quality):
**Nano Banana / Gemini 2.5-3 Flash Image edit ≈ `gpt-image-1` edit ≈
Flux.1 Fill** ≫ fixed-seed SDXL ≫ Midjourney (unusable).

Cost: 2× generation per asset (~$0.08–$0.50 at April 2026 prices for Gemini/Nano Banana 2 and gpt-image-1 HQ respectively).
Worth it for hero assets; overkill for thumbnails.

Key source: [13b §Two-Color (Difference) Matting — Full Recipe](./13b-difference-matting-and-chroma-keying.md),
[jide/nano-banana-2-transparent](https://replicate.com/jide/nano-banana-2-transparent).

### R5. Validation — refuse to ship silently-broken PNGs

Every RGBA output is screened by six cheap checks *before* return:

```python
def validate_rgba(img, min_edge_pixels=64):
    assert img.mode == "RGBA"                         # (1) is RGBA
    a = np.asarray(img.split()[-1])
    assert a.min() < 255                              # (2) not fully opaque
    assert a.max() > 0                                # (3) not fully transparent
    edge_band = ((a > 0) & (a < 255)).sum()
    assert edge_band >= min_edge_pixels               # (4) has AA edge
    corners = [a[0,0], a[0,-1], a[-1,0], a[-1,-1]]
    assert min(corners) < 255                         # (5) corners not all opaque
    rgb = np.asarray(img.convert("RGB"))
    blocks = rgb.reshape(h//2, 2, w//2, 2, 3)
    assert blocks.var(axis=(1,3)).mean() < 4000       # (6) no baked checker
```

Plus the three checkerboard detectors from 13c (border k-means, FFT
notch at tile frequency, Colin-Lord phase-drift) as a second-level
gate on `alpha_requires_post_matte` outputs.

On failure: **retry once** with a stronger positive anchor and a
different matting session, then surface the asset with a
"couldn't verify transparency" UI warning. **Never ship silently-
opaque PNGs** — the downstream designer compositing the asset loses
their whole day.

Key source: [13e §Validation Checks](./13e-end-to-end-transparent-pipelines.md),
[13c §Detection Heuristics](./13c-checkerboard-pixel-drawing-failure.md).

---

## Primary Sources Aggregated

### Peer-reviewed papers

- **LayerDiffuse** — Zhang & Agrawala, *Transparent Image Layer Diffusion
  using Latent Transparency*, SIGGRAPH 2024. [arXiv:2402.17113](https://arxiv.org/abs/2402.17113).
- **LayerDiff** — Huang et al., *Text-guided Multi-layered Composable
  Image Synthesis via Layer-Collaborative Diffusion*, ECCV 2024.
  [arXiv:2403.11929](https://arxiv.org/abs/2403.11929).
- **LayerFusion** — Dalva et al., *Harmonized Multi-Layer T2I Generation
  with Generative Priors*. [arXiv:2412.04460](https://arxiv.org/abs/2412.04460).
- **ART** — multi-layer transparent diffusion. [arXiv:2505.11468](https://arxiv.org/abs/2505.11468).
- **Smith & Blinn** — *Blue Screen Matting*, SIGGRAPH 1996. [PDF](https://alvyray.com/Papers/CG/blusig96.pdf), [ACM DL](https://dl.acm.org/doi/10.1145/237170.237263).
- **Porter & Duff** — *Compositing Digital Images*, SIGGRAPH 1984.
- **BiRefNet** — Zheng et al., *Bilateral Reference for High-Resolution
  Dichotomous Image Segmentation*, CAAI AIR 2024. [arXiv:2401.03407](https://arxiv.org/abs/2401.03407).
- **U²-Net** — Qin et al., Pattern Recognition 2020. [arXiv:2005.09007](https://arxiv.org/abs/2005.09007).
- **IS-Net / DIS** — Qin et al., ECCV 2022. [arXiv:2203.03041](https://arxiv.org/abs/2203.03041).
- **InSPyReNet** — Kim et al., ACCV 2022. [repo](https://github.com/plemeri/InSPyReNet).
- **MODNet** — Ke et al., AAAI 2022. [arXiv:2011.11961](https://arxiv.org/abs/2011.11961).
- **MatAnyone** — Yang et al., CVPR 2025. [arXiv:2501.14677](https://arxiv.org/abs/2501.14677).
- **GFM / AIM-500** — Li et al., IJCAI 2021. [arXiv:2107.07235](https://arxiv.org/abs/2107.07235).
- **FBA Matting** — Forte & Pitié, 2020. [arXiv:2003.07711](https://arxiv.org/abs/2003.07711).
- **RVM** — Lin et al., WACV 2022. [arXiv:2108.11515](https://arxiv.org/abs/2108.11515).
- **Odena, Dumoulin, Olah** — *Deconvolution and Checkerboard Artifacts*.
  [Distill, 2016](https://distill.pub/2016/deconv-checkerboard/).

### Official vendor documentation

- [OpenAI Images API — `gpt-image-1`, `background:"transparent"`](https://developers.openai.com/api/docs/guides/image-generation?image-generation-model=gpt-image-1).
- [Vertex AI Imagen 4 — "Transparent background: Not supported"](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001).
- [Vertex AI Imagen 3 model reference](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate).
- [Gemini 2.5 Flash Image model card](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image).
- [Ideogram API — `generate-transparent-v3`](https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3).
- [Recraft — Background tools](https://recraft.ai/docs/using-recraft/image-editing/background-tools).
- [Black Forest Labs — Flux.1 Tools (Fill, Depth, Canny, Redux)](https://bfl.ai/flux-1-tools).

### Issue trackers / bug references

- [google-gemini/generative-ai-python #567 — alpha dropped at API backend](https://github.com/google-gemini/generative-ai-python/issues/567)
  (internal `b/369593779`).
- [huggingface/diffusers #6548 — `prepare_latents` mistreats RGBA PIL](https://github.com/huggingface/diffusers/issues/6548).
- [huggingface/diffusers #9225 — RGBA size mismatch in SDXL InstructPix2Pix](https://github.com/huggingface/diffusers/issues/9225).
- [black-forest-labs/flux #406 — grid-like upsampling artifact](https://github.com/black-forest-labs/flux/issues/406) (disambiguation from drawn-checker).
- [Gemini Apps Community — checkered-background thread](https://support.google.com/gemini/thread/411393424/image-leaves-a-checkered-background-when-asked-to-create-a-transparent-or-no-background).
- [Recraft Canny — PNG transparent-background feature request](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background).

### Reference implementations

- [lllyasviel/LayerDiffuse (SDXL/SD 1.5)](https://github.com/layerdiffusion/LayerDiffuse) + [project page](https://lllyasviel.github.io/pages/layerdiffuse/).
- [RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse).
- [huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse).
- [diffus-me/sd-forge-layerdiffuse](https://github.com/diffus-me/sd-forge-layerdiffuse).
- [ZhengPeng7/BiRefNet (MIT)](https://github.com/ZhengPeng7/BiRefNet) + [ONNX](https://huggingface.co/onnx-community/BiRefNet-ONNX).
- [xuebinqin/U-2-Net (Apache 2.0)](https://github.com/xuebinqin/U-2-Net), [xuebinqin/DIS](https://github.com/xuebinqin/DIS).
- [plemeri/transparent-background (MIT, InSPyReNet CLI)](https://github.com/plemeri/transparent-background).
- [danielgatis/rembg](https://github.com/danielgatis/rembg) — universal matting wrapper.
- [pq-yang/MatAnyone](https://github.com/pq-yang/MatAnyone), [PeterL1n/BackgroundMattingV2](https://github.com/PeterL1n/BackgroundMattingV2), [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet).
- [bunn-io/rembg-web (WebGPU)](https://github.com/bunn-io/rembg-web).
- [pymatting/pymatting](https://pymatting.github.io/) — trimap-based matting.
- [visioncortex/vtracer](https://github.com/visioncortex/vtracer) — raster→SVG.
- [jide/nano-banana-2-transparent (Replicate)](https://replicate.com/jide/nano-banana-2-transparent), [jide/nano-banana-2-bg-remove](https://replicate.com/jide/nano-banana-2-bg-remove).

### Model cards & licenses

- [briaai/RMBG-2.0 — CC-BY-NC-4.0](https://huggingface.co/briaai/RMBG-2.0).
- [briaai/RMBG-1.4 — CC-BY-NC-4.0](https://huggingface.co/briaai/RMBG-1.4).
- [BRIA blog — RMBG v2.0 launch (2024-10-29)](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images).

### Community primary sources

- [Julien De Luca — *Generating transparent background images with Nano Banana Pro 2* (Dec 2025)](https://jidefr.medium.com/generating-transparent-background-images-with-nano-banana-pro-2-1866c88a33c5).
- [Julien De Luca — *Nano Banana 2 with Transparency on Replicate* (Mar 2026)](https://jidefr.medium.com/nano-banana-2-with-transparency-4673640bb9e6).
- [Colin Lord — *Google Gemini Lied To Me*](https://colinlord.com/google-gemini-lied-to-me/) (the "inconsistent checker" diagnostic tell).
- [Haven Studios — *Adapting Stable Diffusion to Create RGBA Imagery*](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery).
- [Camden B. — *How I Fixed Transparent Video Alpha in Playwright Using 1970s Film Math*](https://dev.to/camb/how-i-fixed-transparent-video-alpha-in-playwright-using-1970s-film-math-2j38).
- [Shawn Hargreaves — *Premultiplied Alpha and Image Composition*](https://www.shawnhargreaves.com/blog/premultiplied-alpha-and-image-composition.html).
- [Inigo Quilez — *Premultiplied Alpha*](https://iquilezles.org/articles/premultipliedalpha/).
- [Hacker News thread 46098776 — "hallucinated checkerboard"](https://news.ycombinator.com/item?id=46098776).
- [Hacker News thread 45711868 — "which AI generator supports transparency?"](https://news.ycombinator.com/item?id=45711868).
- [PetaPixel / BleepingComputer — AI models can't make a plain white image](https://petapixel.com/2024/04/03/ai-image-generators-cant-make-a-simple-white-background/).
- [Stack Overflow — replacing checker pattern in PNG with transparent](https://stackoverflow.com/questions/74134195/how-to-replace-a-checked-pattern-in-a-png-image-with-transparent-in-python),
  [removing only the checker while reading a PNG](https://stackoverflow.com/questions/74399905/removing-only-checkerboard-pattern-while-reading-a-png-file-in-opencv-python).

### Commercial matting APIs

- [Photoroom — background-removal API, $0.02/image](https://docs.photoroom.com/remove-background-api-basic-plan/pricing).
- [remove.bg API](https://www.remove.bg/api).

---

## File path

`/Users/mohamedabdallah/Work/Projects/prompt-to-asset/docs/research/13-transparent-backgrounds/INDEX.md`
