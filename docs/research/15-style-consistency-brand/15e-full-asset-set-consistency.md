---
category: 15-style-consistency-brand
angle: 15e
title: "Full Asset Set Consistency — One Brand, Many Artifacts"
slug: 15e-full-asset-set-consistency
scope: >
  Propagating a single approved brand identity (logo) into an entire asset set —
  app icon, favicon, OG image, ~20 illustrations, ~100 UI icons — so every
  artifact visibly belongs to the same brand.
date: 2026-04-19
status: draft
word_count_target: 2500-4000
primary_question: >
  How do you generate a full, visibly-coherent asset set from one approved
  master logo, with manual-QA only at the logo stage and automated style
  propagation for everything else?
---

# 15e — Full Asset Set Consistency

## Executive Summary

A brand is not a single logo. A shipping product needs, at minimum: a **master
wordmark/lockup**, a **monogram/app-icon mark**, a **favicon** (≤32 px,
high-contrast), an **OG/Twitter card** (1200×630, typographic + mark), ~**20
marketing/onboarding illustrations**, and ~**100 UI icons** (outline, fixed
stroke). Generating these one-by-one with free-form prompts produces
"sibling-drift": each asset is plausible, but put them side-by-side and they
don't read as one brand — different palettes, different stroke weights,
inconsistent corner radii, competing illustration styles.

The production pattern that actually works is a **pinned-pipeline with one
human gate**:

1. **Generate + human-approve the master mark.** This is the only step a human
   QAs. Everything downstream is conditioned on it.
2. **Derive a `BrandSpec`** (palette, typography, stroke weight, corner radius,
   shape vocabulary, "do-not" rules) from the approved mark — partly by
   extraction (k-means on the logo pixels, vector analysis), partly by LLM
   structuring.
3. **Build a style anchor set** — 3-6 curated reference images that together
   define the brand's visual vocabulary (flat vs. gradient, geometric vs.
   organic, filled vs. outline).
4. **Loop every remaining asset** through a prompt template that injects the
   `BrandSpec` as text *and* the anchors as IP-Adapter / `--sref` / Recraft
   `style_id` conditioning — with a **fixed seed per asset slot** and a
   **pinned model version**.
5. **Deterministic post-processing** — background removal, vectorization,
   platform-size fan-out, atlas packing — all content-addressed and cached.

This file documents the architecture, the invariants that must hold across
assets, what the commercial AI-first brand studios (Brandmark, LogoAI, Looka,
Tailor Brands, Namelix) actually do under the hood based on public
information, and a reference pipeline with runnable code sketches.

**Top 3 findings:**

1. **Brandmark.io does not generate logos with a diffusion model.** It uses
   ~1M vector illustrations from The Noun Project, a conv-net legibility
   scorer, word-embedding search, and a GAN only for color-palette
   generation. Cross-asset "consistency" is therefore trivial for them —
   they already have vector source files, and brand-kit assets are
   *compositions* of the same mark + palette + typography triplet. This is
   the most important lesson: **for 100-icon sets, do not regenerate; reuse
   a vector mark and procedurally compose.**
2. **Two-layer style contract (Style Spec + Style Anchors) outperforms
   seeds alone** for cross-model and cross-asset consistency. Seeds give
   pixel-determinism on one model + one prompt; they do not survive a
   prompt change. For a 121-asset set the prompts are all different, so
   the invariant has to live in a structured text spec plus an image
   anchor set, not in the seed.
3. **Recraft's style-id and Midjourney's `--sref` are the closest
   commercial equivalents to a reusable "brand token"** — upload a set of
   images, get back an opaque style identifier you can attach to any
   future generation. Recraft exposes this over an API and is the only
   major T2I vendor that treats "brand style" as a first-class,
   shareable, versionable object.

## Propagation Architecture

The target pipeline is a DAG rooted at the approved logo:

```
                      [ user brief ]
                            │
                            ▼
                  ┌──────────────────────┐
                  │  1. Logo Generator   │  ← only human-gated step
                  │  (candidates × 12)   │
                  └──────────┬───────────┘
                             │  human picks 1
                             ▼
                  ┌──────────────────────┐
                  │  2. Master Logo      │  (vector, approved)
                  └──────────┬───────────┘
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
      ┌────────────┐  ┌────────────┐   ┌──────────────┐
      │ Palette    │  │ Style      │   │ BrandSpec    │
      │ extractor  │  │ anchors    │   │ (LLM writes  │
      │ (k-means)  │  │ (3–6 imgs) │   │  structured  │
      └─────┬──────┘  └─────┬──────┘   │  JSON)       │
            │               │           └──────┬───────┘
            └───────────────┴──────────────────┤
                                               ▼
                                 ┌──────────────────────┐
                                 │  3. Brand Token      │
                                 │  (hash → cacheable)  │
                                 └──────────┬───────────┘
                                            │
         ┌──────────────┬─────────────┬─────┴──────┬──────────────┬───────────────┐
         ▼              ▼             ▼            ▼              ▼               ▼
   [app icon]     [favicon]    [OG card]    [20 illos]     [100 UI icons]   [splash/1024]
         │              │             │            │              │               │
         ▼              ▼             ▼            ▼              ▼               ▼
   platform fan-out, bg-removal, raster→SVG, atlas-pack (all deterministic, content-addressed)
```

Every node under the **Brand Token** is independently parallelizable and
deterministic given `(brand_token, asset_slot, seed)`. A re-run with the
same inputs returns a cache hit; no generation API is called twice for the
same asset.

### The Brand Token

A brand token is the minimal payload that, together with an asset-slot
prompt template, reproduces every downstream asset. Concretely:

```json
{
  "token_id": "bt_01hzq9m2…",
  "logo": {
    "svg_sha256": "a1b2…",
    "raster_1024_sha256": "c3d4…"
  },
  "palette": {
    "primary":   "#0A84FF",
    "secondary": "#1C1C1E",
    "accent":    "#30D158",
    "surface":   "#F2F2F7",
    "ink":       "#111111"
  },
  "typography": {
    "heading": "Inter 700",
    "body":    "Inter 400",
    "mono":    "JetBrains Mono 500"
  },
  "geometry": {
    "corner_radius_px_at_1024": 224,
    "stroke_weight_px_at_1024": 48,
    "icon_grid": "24x24 @ 2px stroke"
  },
  "style": {
    "anchors": ["ref_01.png", "ref_02.png", "ref_03.png"],
    "recraft_style_id": "sty_abc123",
    "mj_sref": "--sref 3142857 --sw 250",
    "descriptors": [
      "flat geometric", "soft shadow", "2px uniform stroke",
      "no gradients", "no text inside icons"
    ],
    "do_not": [
      "no photorealism", "no drop shadows on icons",
      "no isometric perspective on UI icons"
    ]
  },
  "provenance": {
    "model_logo":  "imagen-4-ultra@2026-02",
    "model_assets":"flux.1-pro@2025-11 + ip-adapter-sdxl-plus@v1.1",
    "seed_base":   8675309
  },
  "version": 3
}
```

The token is **content-addressed** (`token_id` is a hash of the payload),
**versioned** (a `version: 4` is a new object, never a mutation), and
**pinned** — it records model SHAs so that re-running 6 months later with a
newer Flux version is an explicit opt-in, not an accident.

### Per-Slot Prompt Templates

Each asset slot (favicon, app-icon, ui-icon, illo, og-card, etc.) owns a
prompt template that interpolates the brand token. Slots are not
interchangeable: a favicon template hard-codes `square, high-contrast,
≤32px legibility, no fine detail`, a UI-icon template hard-codes
`monochrome line, 2px stroke at 24x24, no fill, centered in 20px safe
area`, etc.

Templates live in the repo, not in prompts the user writes. The user only
writes the *concept* ("search", "settings", "empty inbox"), the template
supplies everything else.

## Invariant List

These are the attributes that must be constant across the entire asset
set. If any of these drift, the set stops reading as one brand.

| # | Invariant | Why it matters | How it's enforced |
|---|-----------|----------------|-------------------|
| 1 | **Core mark geometry** (the monogram/icon) | Appears inside app-icon, favicon, splash, OG card, 404 page. If the mark changes shape, the brand fractures. | Vector source file baked into the brand token; composed, not regenerated. |
| 2 | **Palette (5–7 HEX codes)** | Palette is the fastest visual signal of "same brand". | Extracted once from approved logo, frozen in token, injected as text in every prompt *and* locked at post-processing time (re-quantization to palette). |
| 3 | **Stroke weight** for UI icons | 100 icons at 1.5px vs 2px vs 2.5px look chaotic side-by-side. | Fixed in geometry spec; enforced with an SVG post-pass that re-normalizes all strokes. |
| 4 | **Corner radius** | Square vs rounded-24 vs squircle across app-icon + favicon + UI chrome is an instant brand break. | Single `corner_radius_px_at_1024` field; asset slots scale it proportionally. |
| 5 | **Shape vocabulary** (geometric / organic / hand-drawn) | An organic illustration style next to a hard-edged geometric logo reads as two brands. | Encoded as descriptor tokens + style anchors; QA'd by a CLIPScore-style style-similarity gate against anchors. |
| 6 | **Lighting model** (flat / soft-shadow / gradient / skeuomorphic) | Mixing flat UI icons with gradient illustrations is the #1 sibling-drift failure. | `style.descriptors` pins it; negative prompts forbid the wrong mode. |
| 7 | **Typography** | Wordmark font must equal OG-card heading font must equal product UI heading font. | Not generated — fonts are licensed files referenced by name. |
| 8 | **Background treatment** (transparent / color-surface) | A set where half the icons have transparent backgrounds and half have the brand surface color looks broken. | Post-processing pass enforces per-slot rules; see 13-transparent-backgrounds. |
| 9 | **Iconographic metaphor density** | If the logo is minimal-abstract but illustrations are busy-literal, they don't match. | Encoded in style anchors; enforced by the illustration prompt template's complexity descriptors. |
| 10 | **Pixel grid & safe area** | Icons that don't snap to the same grid look hand-placed. | Output size table + safe-area percentages per slot; enforced in post. |

A useful check: **line up all assets at 64 px on one canvas**. If the eye
doesn't flag any outlier in 3 seconds, the set is coherent.

## Commercial Tool Teardown

What the AI-first brand studios actually do under the hood — as much as is
publicly documented. The short version: **almost none of them generate
the full asset set with a diffusion model**. They generate or retrieve the
logo, then *compose* the rest procedurally.

### Brandmark.io — Retrieval + GAN palette + compositing

From their "Deep learning for logo design" post:

- **Icon source:** ~1,000,000 vector illustrations from The Noun Project.
- **Icon selection:** a convolutional net scores each icon for
  *legibility* (how readable it stays when scaled); word embeddings
  project the user's keywords into a space where nearest-neighbour search
  over icon metadata returns semantically-matched marks.
- **Color:** a GAN generates candidate palettes; palettes are sorted by
  lightness and vibrancy and associated with brand-personality words
  ("extreme" → saturated, "solemn" → desaturated).
- **Typography:** fonts are paired with icons using neural embeddings +
  heuristics (weight-matching).
- **Brand kit:** business cards, social templates, style guide — these
  are **template-filling**, not generation. The mark, the palette, and
  the typography are the same objects re-used.

Implication: their cross-asset consistency problem is trivially solved
because the mark is a vector file and everything else is a template. No
diffusion drift, no prompt tuning, no seed pinning. The trade-off is
**limited novelty** — you can only get icons that already exist in the
Noun Project corpus.

### Looka — Curated-template engine with auto-regenerating Brand Kit

From Looka's public "How it works" page and Brand Kit docs:

- User picks industry + style preferences + palette inspiration.
- Looka composes logo candidates from a curated symbol library + font
  pairings + palettes. The library is smaller and more brand-oriented
  than Noun Project.
- **Brand Kit: 300+ assets** (social posts, letterheads, invoices,
  business cards, email signatures). Takes ~10 seconds per category.
- **Auto-regeneration:** when the user updates their logo, palette, or
  contact info, every brand-kit asset re-renders. This is the strongest
  public hint that their pipeline is template-based with parametric fills
  rather than T2I generation.

Implication: Looka shows that **regenerating a 300-asset kit in under a
minute is possible if the kit is template-driven.** For our use case,
templates + a T2I-generated icon/illo set is the hybrid worth considering.

### LogoAI / Tailor Brands / Namelix — Variations on the same theme

- **Namelix** (from Igor Kromin / the team behind NameMesh) uses an LLM
  for brand-name generation and then hands off to a templated logo
  composer. Logo styles are curated presets.
- **Tailor Brands** asks for 3 font style preferences, icon category, and
  initials; composes from a symbol + typography library. Heavy user
  customization inside an editor.
- **LogoAI** generates logos, then a brand identity pack (business cards,
  social banners, posters) by filling templates with the chosen mark and
  palette — same pattern as Looka.

None of these are public about using IP-Adapter or LoRA or image-to-image
diffusion. The publicly-disclosed architecture is consistently
**retrieval + templates**.

### Recraft — The one that does expose a "brand style token"

Recraft is the outlier in the commercial landscape because it explicitly
sells "brand style" as a first-class API object.

- **Style creation:** upload a set of reference images, get back a
  `style_id`. Two flavors — "Style essentials" (textures, lines, colors,
  atmosphere) and "Style and composition" (also locks composition and
  camera angle).
- **Style sharing:** styles are shareable across a team (via email
  invite) — the equivalent of committing a brand token to a shared repo.
- **API:** POST a style (multipart image upload), then attach its id to
  every generation call. Supports both raster and native vector output
  (their bet is T2I-SVG).
- **Style remixing:** blend two styles with weights — useful for
  sub-brands.

For our pipeline, Recraft is the closest off-the-shelf analogue to the
"Brand Token" concept in §1. If you don't want to run your own
IP-Adapter, the Recraft style-id is a usable building block.

### Midjourney — `--sref` + `--sw` as a brand handle

Midjourney has no official API but is heavily used by brand studios via
unofficial wrappers. Mechanism:

- `--sref <url-or-code>` applies the style of a reference image (or a
  previously-saved style code).
- `--sw 0..1000` controls weight (default 100; 250-400 is typical for
  brand work).
- Style codes are **opaque integers** you can save, version, and reuse.

Numonic and other studios document a "governed --sref library" pattern:
approved codes, version names, per-client access control, audit trails.
For our own pipeline this maps directly to the brand-token idea — the
`--sref` code is one of the anchors baked into the token.

> **Updated 2026-04-21:** Always record the `--sv` (style-reference version) alongside the sref code in the brand token. MJ V7 has six `--sv` sub-algorithms; `--sv 6` is the current default (changed June 16, 2025). MJ V8 Alpha (March 2026) keeps `--sref` but renders differently — regenerate canonical golden sets after V8 reaches stable. Store as: `"mj_sref": "--sref 3142857 --sw 250 --sv 6"`. Midjourney V8 also introduces **Style Creator** (web UI) for browsing built-in style handles without uploading external reference images. MJ V8.1 Alpha drops `--oref`/`--ow` — if you relied on Omni Reference for character consistency in V7, revert to V7 until V8 final is released.

## Reference Pipeline (code sketches)

Below is a sketch of what the end-to-end pipeline looks like in Python. It
is deliberately minimal — production code would wrap this in a job queue,
retry logic, and a proper cache.

### Step 1: Generate and approve the master logo

```python
from pydantic import BaseModel
from typing import Literal

class LogoBrief(BaseModel):
    name: str
    category: str              # e.g. "developer tool"
    vibe: list[str]            # e.g. ["minimal", "geometric", "trustworthy"]
    primary_mark: Literal["monogram", "wordmark", "combination"]
    hard_constraints: list[str] = []  # e.g. ["no gradient", "no sans-serif"]

def generate_logo_candidates(brief: LogoBrief, n: int = 12) -> list[LogoCandidate]:
    prompt = build_logo_prompt(brief)      # see 08-logo-generation
    seeds = [hash((brief.name, i)) & 0xFFFFFF for i in range(n)]
    return [
        t2i(prompt=prompt, seed=s, model="imagen-4-ultra",
            negative=DEFAULT_LOGO_NEGATIVES, aspect="1:1", transparent=True)
        for s in seeds
    ]

# Human picks one; that one becomes the master.
master = human_approve(generate_logo_candidates(brief))
```

### Step 2: Derive palette, geometry, and descriptors

```python
from PIL import Image
from sklearn.cluster import KMeans

def extract_palette(logo_png: Image.Image, k: int = 5) -> list[str]:
    px = np.array(logo_png.convert("RGBA")).reshape(-1, 4)
    px = px[px[:, 3] > 200][:, :3]                # opaque pixels only
    km = KMeans(n_clusters=k, n_init=10).fit(px)
    return [rgb_to_hex(c) for c in km.cluster_centers_]

def derive_geometry(logo_svg: str) -> Geometry:
    # parse paths, measure mean stroke-width, detect corner radii from
    # rounded rects, infer an icon grid.
    ...

def llm_describe(logo_png: Image.Image) -> StyleDescriptors:
    """Ask a VLM (Gemini / GPT-4V) to emit: descriptors, do-not rules,
    corner style, fill style, geometric vs organic, 1-sentence summary."""
    ...
```

### Step 3: Build style anchors

Take the approved logo + 2-5 retrieved reference images that *match* the
logo's style (from a curated in-house library tagged by descriptors), then
mint the style handle:

```python
def build_anchors(master: LogoCandidate, descriptors: StyleDescriptors,
                  library: AnchorLibrary) -> list[Image.Image]:
    candidates = library.search(descriptors, top_k=20)
    # Rank candidates by style similarity to master using a CLIP image
    # encoder; pick 3-5 that maximise within-set diversity.
    return rank_and_select(candidates, master, k=4)

def mint_brand_token(master, palette, geometry, anchors, descriptors) -> BrandToken:
    recraft_style_id = recraft.create_style(images=anchors,
                                            style_type="style_essentials")
    mj_sref          = midjourney.save_style(anchors)  # or an existing --sref code
    return BrandToken(
        logo=master.as_vector(),
        palette=palette,
        geometry=geometry,
        style=Style(anchors=anchors,
                    recraft_style_id=recraft_style_id,
                    mj_sref=mj_sref,
                    descriptors=descriptors.descriptors,
                    do_not=descriptors.do_not),
        provenance=pin_models(),
    )
```

### Step 4: Loop every asset slot

```python
SLOTS: dict[str, SlotTemplate] = {
    "app_icon_1024":   AppIconTemplate(size=1024, transparent=False,
                                       safe_area_pct=0.80),
    "favicon_32":      FaviconTemplate(size=32, transparent=True,
                                       legibility_min=0.85),
    "og_card":         OgTemplate(size=(1200, 630), includes_wordmark=True),
    "ui_icon":         UiIconTemplate(grid=24, stroke_px=2, monochrome=True),
    "illustration":    IlloTemplate(aspect="4:3", transparent=False),
    # …
}

def render_asset(slot: str, concept: str, brand: BrandToken, seed: int) -> Asset:
    tpl = SLOTS[slot]
    prompt = tpl.render_prompt(concept=concept, brand=brand)
    cache_key = hash_content(brand.token_id, slot, concept, seed, tpl.version)
    if cached := cache.get(cache_key):
        return cached

    raw = t2i(
        prompt=prompt,
        negative=tpl.negatives + brand.style.do_not,
        seed=seed,
        style_id=brand.style.recraft_style_id,        # Recraft path
        ip_adapter_images=brand.style.anchors,         # local-SD path
        ip_adapter_scale=0.6,
        model=brand.provenance.model_assets,
        transparent=tpl.transparent,
        size=tpl.size,
    )
    img = post_process(raw, tpl, brand)               # bg-removal, palette
                                                       # quantize, stroke
                                                       # normalize, snap-to-grid
    cache.put(cache_key, img)
    return img

# Fan out — all independent.
with thread_pool(workers=32) as pool:
    ui_icons = pool.map(
        lambda c: render_asset("ui_icon", c, brand, seed_for("ui_icon", c)),
        UI_ICON_CONCEPTS  # list of 100 strings
    )
    illos = pool.map(
        lambda c: render_asset("illustration", c, brand, seed_for("illo", c)),
        ILLO_CONCEPTS
    )
    favicon  = render_asset("favicon_32",   brand.name, brand, seed_for("favicon"))
    app_icon = render_asset("app_icon_1024",brand.name, brand, seed_for("app_icon"))
    og_card  = render_asset("og_card",      brand.tagline, brand, seed_for("og"))
```

### Step 5: Post-processing and manifest

```python
def post_process(img, tpl, brand):
    if tpl.transparent:
        img = rembg(img, model="birefnet-portrait-v2")
    img = quantize_to_palette(img, brand.palette,
                              tolerance=tpl.palette_tolerance)
    if tpl.kind == "ui_icon":
        svg = raster_to_svg(img, vtracer_opts(color_mode="binary"))
        svg = normalize_strokes(svg, target_px=brand.geometry.stroke_weight_px)
        return Asset(svg=svg, raster=img)
    return Asset(raster=img)

def manifest(brand: BrandToken, assets: dict[str, Asset]) -> dict:
    """Write a JSON manifest so every downstream consumer knows which model,
    which seed, and which brand-token version produced each asset."""
    return {
        "brand_token": brand.token_id,
        "version": brand.version,
        "assets": {
            slot: {
                "sha256": a.sha256,
                "seed":   a.seed,
                "model":  a.model,
                "path":   a.path,
            } for slot, a in assets.items()
        }
    }
```

## Reference Repos That Ship "One Brand → N Assets"

- **fabriziosalmi/brandkit** (Flask + Pillow). Takes one input image, fans
  out to 25+ predefined formats for web, mobile, social. No T2I
  generation — it's a *post-processing* pipeline. Useful as the final
  stage of the architecture above.
- **mcpware/logoloom** (Node/MCP). Uses Claude to author SVG logos by
  reading the codebase, then generates a full 31-file brand kit locally
  (SVG light/dark/mono, PNG sizes, ICO, OG image, GitHub preview, Twitter
  header). Most interesting public implementation of the "LLM drafts
  logo, pipeline explodes it into a kit" pattern.
- **ogimg/ogimg** (Next.js). Open-source OG-image generator with a
  template system; a good reference for the OG-card slot.
- **xsukax/xsukax-Favicon-Generator** — client-side favicon pipeline. A
  sanity-check reference for favicon generation rules (≤32px legibility,
  ICO packaging).
- **Capacitor Assets / pwa-asset-generator / appicon.co / icon.kitchen** —
  commercial/OSS tools in category 18 that take one master image and
  produce platform-size packs (iOS, Android, Watch, PWA, Windows tiles).

The pattern across all of these: **one master input → many outputs via
deterministic, non-AI post-processing.** For the *icon and illustration
set* specifically, AI must be in the loop; for everything else, the cheap
and correct path is templated post-processing.

## Scaling: Caching, Versioning, Re-Run Determinism

### Caching

Every generation call is keyed by
`(brand_token_id, slot, concept, seed, model_sha, template_version)`.
Cache hit rate in normal iteration is ~95% because the user typically
only changes one asset at a time. The brand token is immutable per
version, so changing the palette produces a new `token_id` and
invalidates exactly the assets that depend on the palette via the
template's `uses_palette: true` field.

### Versioning

- `BrandToken.version` increments on every change. Old versions are kept;
  they're what the manifest points to.
- Slot templates are versioned (`ui_icon.v3.yaml`); a template change
  invalidates the cache for that slot only.
- Model SHAs are pinned in `provenance`. An upgrade to a newer model
  version is explicit: bump the pin, review the diff on a small subset,
  then re-render the full set.

### Determinism

- **Seed derivation:** `seed_for(slot, concept) = H(brand.seed_base ‖
  slot ‖ concept)` — stable across runs, different across slots so that
  e.g. the "search" UI icon and the "search" illustration don't collide.
- **Model pinning:** record the exact model version/checkpoint SHA in
  `provenance.model_assets`. Vendors like Replicate and fal.ai expose
  pinned versions; OpenAI/Google don't always, which is a known
  determinism hazard — mitigate by snapshotting the output and running a
  drift-detection job on each release.
- **Scheduler / solver choice:** for SD/Flux, ODE-based (deterministic)
  schedulers (e.g., DPM-Solver++, Euler) produce bit-identical outputs
  for fixed seeds; SDE schedulers don't. Pin the scheduler.
- **Post-processing determinism:** rembg/BiRefNet is deterministic;
  vectorization (vtracer) is deterministic given parameters. Quantize to
  palette with a fixed algorithm (ordered dithering or
  nearest-neighbour).

### QA gate

Only one human gate, at the logo step. Everything else is gated by
automated checks:

1. **CLIP style similarity** between each generated asset and the
   anchors. Threshold: cosine > 0.75 against at least one anchor.
2. **Palette fidelity:** >90% of opaque pixels within ΔE < 10 of the
   brand palette (after post-processing quantization this should be
   trivial).
3. **Stroke-width histogram** (for UI icons): >95% of stroke pixels
   within ±0.25 px of target.
4. **Legibility at size:** CLIP-score of the icon against its concept
   after downscaling to 16/32/64 px; catches illegible icons before they
   ship.
5. **Visual diff at 64 px:** render all assets at 64 px on a single
   canvas; if a human flags drift the failing asset re-enters the queue
   with a different seed.

Failures re-run with a bumped seed (up to 5 retries per slot) before
escalating.

## References

- Brandmark.io — "Deep learning for logo design": <https://brandmark.io/intro/>
- Brandmark.io — Tools overview: <https://brandmark.io/tools/>
- Looka — How it works: <https://looka.com/logo-maker/how-it-works/>
- Looka — Brand Kit: <https://looka.com/brand-kit/>
- Tailor Brands — How to use the logo maker: <https://www.tailorbrands.com/blog/how-to-use-tailor-brands>
- Namelix — overview and tutorial: <https://supplyleader.com/blog/how-to-create-a-brand-name-and-logo-using-namelix-com>
- Recraft — "New Tools for Brand Style Consistency and Control": <https://recraft.ai/blog/new-tools-for-brand-style-consistency-and-control>
- Recraft — Style Sharing: <https://www.recraft.ai/blog/introducing-style-sharing-maintain-design-consistency-across-teams>
- Recraft — API reference: <https://recraft.ai/docs/api-reference/api>
- Midjourney — Style Reference docs: <https://docs.midjourney.com/docs/style-reference>
- Numonic — Governing `--sref` as an approved design system: <https://numonic.ai/blog/midjourney-brand-consistency-guide>
- Numonic — Searchable style-reference library: <https://www.numonic.ai/blog/midjourney-style-reference-library>
- IP-Adapter repo (tencent-ailab): <https://github.com/tencent-ailab/IP-Adapter>
- IP-Adapter in diffusers: <https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter>
- Rephrase — "Consistent Style Across AI Image Generators: Style Spec + Anchor Image": <https://rephrase-it.com/blog/consistent-style-across-ai-image-generators-the-style-spec-a>
- Cliprise — "Seed Values Explained: Reproducible AI Generation for Brands": <https://www.cliprise.app/learn/guides/best-practices/seed-values-explained-reproducible-generation-brands>
- SD.Next — Schedulers (ODE vs SDE determinism): <https://vladmandic.github.io/sdnext-docs/Schedulers/>
- `fabriziosalmi/brandkit` — open-source brand asset generator: <https://github.com/fabriziosalmi/brandkit>
- `mcpware/logoloom` — LLM-drafted logo + 31-file brand-kit generator with MCP: <https://github.com/mcpware/logoloom>
- `ogimg/ogimg` — open-source OG image generator: <https://github.com/ogimg/ogimg>
- `xsukax/xsukax-Favicon-Generator` — client-side favicon generator: <https://github.com/xsukax/xsukax-Favicon-Generator>
- Capacitor Assets: <https://github.com/ionic-team/capacitor-assets>
- pwa-asset-generator: <https://github.com/elegantapp/pwa-asset-generator>

## Open questions for downstream research

- How well does Recraft's style-id hold for 100+ icons in a single set —
  is there style drift within a style-id, or is it genuinely stable?
  (Empirical test needed; worth a small benchmark in category 07.)
- For illustration sets specifically, does IP-Adapter-Plus + SDXL beat
  Flux + LoRA on style adherence? (Cross-reference with 06 and 15 other
  angles.)
- Is a trained-per-brand LoRA ever worth the cost vs. IP-Adapter + text
  descriptors? Break-even point is probably around the 200-asset mark.
- How to handle a brand refresh (v2 palette) — partial invalidation in
  the cache is easy, but the user-facing story of "only UI icons
  changed, illustrations didn't" needs UX design.
