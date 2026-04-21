---
category: 07-midjourney-ideogram-recraft
title: "Category Index — Midjourney / Ideogram / Recraft and the Commercial Asset-Generation Landscape"
last_updated: 2026-04-19
status: complete
angles_synthesized: [7a, 7b, 7c, 7d, 7e]
primary_question: "Which commercial image model should a prompt-enhancement agent route to for each asset type, and what is the fallback hierarchy when the primary fails?"
top_insights:
  - "Category winners are non-overlapping: Midjourney owns aesthetic/concept, Ideogram owns in-image text, Recraft owns native vector + brand-style primitives. Any single-model pipeline sacrifices at least one of these."
  - "Only two commercial APIs expose first-class transparency: Ideogram V3 has a dedicated /generate-transparent endpoint, and Leonardo Phoenix accepts transparency:foreground_only. Every other provider (Midjourney, Flux, Photon, Firefly CC) requires a rembg/BRIA/BiRefNet second pass."
  - "Only Recraft V3 ships native SVG (actual Bézier paths in logical <g> groups, ~20–30% more anchors than a hand-drawn vector). Everything else is raster-only and forces a lossy trace step (vtracer/potrace/Illustrator Image Trace)."
fallback_hierarchies:
  wordmark_logo: [ideogram-v3-transparent, recraft-v3-vector, gpt-image-1, flux-1.1-pro]
  logo_mark_vector: [recraft-v3-vector, ideogram-v3-design+vectorize, midjourney-v7+vtracer]
  app_icon_rgba: [gpt-image-1-transparent, ideogram-v3-transparent, leonardo-phoenix-transparent, recraft-v3+removeBackground]
  marketing_illustration: [midjourney-v7+sref, recraft-v3-style_id, leonardo-phoenix-elements, flux-1.1-pro]
  og_card_with_text: [ideogram-v3, gpt-image-1, satori+flux-pro-background]
  photoreal_product: [flux-1.1-pro, firefly-5-ultra, midjourney-v7-style-raw]
  bulk_drafts: [photon-flash, flux-schnell, recraft-v2]
  legal_indemnified: [firefly-5-via-creative-cloud]
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.
>
> **Updated 2026-04-21 — key changes since initial draft:**
> - Midjourney V8 Alpha launched March 17, 2026; V8.1 Alpha April 14, 2026 (alpha.midjourney.com only). V8 adds 5× speed, native 2K HD, improved text rendering, and 99% seed stability (V8.1 claim). No public API still confirmed.
> - Recraft V4 released February 2026. V4 still has no `style`/`style_id` support — confirmed by official docs. V3 remains required for brand-style pipelines.
> - Adobe Firefly Image 5 launched at Adobe MAX October 2025 (not a preview any longer); in Photoshop Beta as of March 2026.
> - Leonardo Phoenix 2.0 launched late 2025 with improved character consistency.
> - Krea Edit launched March 9, 2026 with regional editing, object movement, and relighting.

# Category 07 — Midjourney / Ideogram / Recraft (and the rest of the commercial asset-generation landscape)

## Category Executive Summary

This category covers the commercial, closed-source text-to-image providers that designers actually use for production software assets. It is the most *product-facing* of the model-family categories because these are the tools that already solve parts of the user's failure ("Gemini paints a checkerboard instead of an alpha channel") — and because their APIs, rather than their weights, are what a prompt-to-asset has to integrate against.

1. **Three specialists, not a single winner.** The market has resolved into three clearly-delineated specialists, each best-in-class at one axis — and each mediocre at the others. Midjourney v7 dominates aesthetic/concept quality (angle [7a](./7a-midjourney-v6-v7-prompting.md)); Ideogram 3.0 dominates in-image text fidelity (~90% short-English accuracy vs ~55–65% for Midjourney) (angle [7b](./7b-ideogram-text-rendering-for-logos.md)); Recraft V3 dominates native vector SVG and reusable brand-style primitives (angle [7c](./7c-recraft-v3-vector-and-brand-styles.md)).
2. **Transparency is a solved problem — but only at two vendors.** As of 2026-04, only **Ideogram V3's dedicated `/v1/ideogram-v3/generate-transparent` endpoint** and **Leonardo Phoenix's `transparency: "foreground_only"` flag** produce true alpha-channel output natively ([7b](./7b-ideogram-text-rendering-for-logos.md), [7d](./7d-leonardo-playground-krea-firefly.md)). `gpt-image-1`'s `background: "transparent"` parameter is a third option covered in category 05. Every other provider requires a post-processing matte (BRIA RMBG 2.0 is the current open-source SOTA — see angle [7e](./7e-commercial-tool-asset-workflows.md) and category 16).
3. **Only one commercial model emits real SVG.** Recraft V3 Vector (`recraftv3_vector`) is still the only foundation model on any hosted platform that outputs editable Bézier paths with logical `<g>` groupings, rather than a raster passed through a tracer ([7c](./7c-recraft-v3-vector-and-brand-styles.md)). Every MJ/Ideogram/Flux/`gpt-image-1`/Photon/Firefly output that needs to be SVG has to go through vtracer, potrace, or Recraft's `/images/vectorize` endpoint — all of which are lossy.
4. **Midjourney is great and almost useless for automation.** V7/V8's aesthetic, `--sref` style catalog, and `--oref` omni-reference are unmatched for concept boards — but Midjourney still has no official public API as of April 2026; only Discord/web UIs and ToS-violating third-party bridges (Apify, useapi, ImagineAPI, Legnext, GoAPI). Enterprise customers may negotiate custom API access (~$500/month per reports) but there is no self-serve endpoint. A production prompt-to-asset cannot cleanly integrate MJ server-side ([7a](./7a-midjourney-v6-v7-prompting.md)). Treat it as a human-in-the-loop surface that the enhancer *emits prompts for*, not *calls*.
5. **Magic Prompt is Ideogram's #1 footgun.** `magic_prompt: AUTO` (the default) silently rewrites a short logo prompt into a 200-word photoreal scene description, which is the single biggest reason Ideogram "adds a wooden desk and bokeh" to what should be a clean wordmark. Every logo/icon call should hard-force `magic_prompt: OFF` ([7b](./7b-ideogram-text-rendering-for-logos.md)).
6. **Recraft V4 (released February 2026) removed styles; V3 is the architectural default.** `recraftv4` / `recraftv4_vector` / `recraftv4_pro` does **not** support `style` or `style_id` — confirmed by Recraft's official docs as of April 2026: *"Styles are not yet supported for V4 models."* Any brand-style pipeline must pin to `recraftv3` / `recraftv3_vector` / `recraftv2` and opt into V4 only for tasks that don't need a brand token ([7c](./7c-recraft-v3-vector-and-brand-styles.md)).
7. **Brand-memory primitives are converging on UUIDs and style codes.** Recraft's `style_id` (UUID from 5 uploaded reference images), Ideogram V3's 8-char hex `style_codes`, and Midjourney's numeric `--sref` codes are independently reinventing the same abstraction: a short, opaque string that captures "the brand look" and can be reused across infinite generations without retraining. Our enhancer should treat these as a first-class data type per brand record ([7a](./7a-midjourney-v6-v7-prompting.md), [7b](./7b-ideogram-text-rendering-for-logos.md), [7c](./7c-recraft-v3-vector-and-brand-styles.md)).
8. **Text rendering is a sharp benchmarked gradient.** On short English strings (≤30 chars): **Ideogram 3.0 ~90% → gpt-image-1 ~85% → Recraft V3 ~80% → Flux 2 Pro ~80% → Flux 1.1 Pro ~75% → Imagen 4 ~75% → Midjourney v7 ~55–65% → Luma Photon ~SDXL-tier**. Past 200 characters every model collapses; Ideogram collapses most gracefully ([7b](./7b-ideogram-text-rendering-for-logos.md), [7d](./7d-leonardo-playground-krea-firefly.md)).
9. **Playground v3 is the biggest latent capability.** PGv3's 24B DiT with Deep-Fusion Llama-3 scores **88.62 on DPG-Bench Hard** (vs Ideogram 2.0 80.12, Flux Pro 78.69, MJ v6.0 64.63) and 82% text-synthesis accuracy, and human raters prefer its graphic-design outputs over human designers 60–80% of the time. But the API is partner-gated at 1M+ images/month, so it is aspirational ([7d](./7d-leonardo-playground-krea-firefly.md)).
10. **Firefly is the only game in town for legal indemnity.** Adobe Firefly 5 is trained on licensed-only data and ships enforceable IP indemnification on Creative Cloud plans — critically, **that indemnity does not automatically extend to the Firefly Services API**, which is enterprise-only at ~$1,000/month ([7d](./7d-leonardo-playground-krea-firefly.md)). If a client requires "indemnified AI art" the only current answer is Firefly-via-CC (human-driven).
11. **The dominant production pattern is a three-stage chain.** Concept → clean → vector. Concept models (MJ v7, Flux 1.1 Pro, Ideogram V3) maximize quality but output raster. Matting (BRIA RMBG 2.0, gpt-image-1 inpaint, Recraft `/removeBackground`) isolates the subject. Vectorizers (Recraft native vector, vtracer color, potrace B/W) produce scalable SVG ([7e](./7e-commercial-tool-asset-workflows.md)).
12. **Pricing has converged inside one order of magnitude.** Recraft V3 raster $0.04 / vector $0.08 ([7c](./7c-recraft-v3-vector-and-brand-styles.md)); Ideogram V3 ≈ $0.03–0.09 depending on speed ([7b](./7b-ideogram-text-rendering-for-logos.md)); FLUX 1.1 Pro $0.04/MP on Together; Luma Photon Flash $0.002/1080p (outlier cheap); gpt-image-1 $0.019–0.19 depending on quality; Firefly ~$0.02–0.10 but enterprise-gated ([7d](./7d-leonardo-playground-krea-firefly.md), [7e](./7e-commercial-tool-asset-workflows.md)). Cost is no longer the differentiator — capability matching is.
13. **Permutations and batching are plan-gated everywhere.** MJ's permutation cap is 4 on Basic, 40 on Pro/Mega and disabled in Relax ([7a](./7a-midjourney-v6-v7-prompting.md)); Ideogram defaults to 10 in-flight requests and requires partnership contact for more ([7b](./7b-ideogram-text-rendering-for-logos.md)); Together requires Build Tier 2 ($50 lifetime spend) for all `pro` Flux variants ([7d](./7d-leonardo-playground-krea-firefly.md)). An agent that wants to fan out across options must implement concurrency throttles per vendor.
14. **Non-Latin text is still broken across the board.** Glyph-ByT5-v2 (arXiv 2406.10208) shows Ideogram 1.0 and DALL-E 3 had "nearly zero" visual spelling accuracy on CJK; 3.0 closes part of the gap but CJK/Arabic/Devanagari still fail at roughly the rate of Flux. The correct pattern for non-Latin is: generate composition with a Latin placeholder, overlay real glyphs in SVG or Satori ([7b](./7b-ideogram-text-rendering-for-logos.md)).
15. **API ergonomics rank: Leonardo > Together > Krea > Ideogram > Recraft > Firefly > Playground > Midjourney (none).** Leonardo's documented model IDs, PAYG, async+polling, webhooks, Elements enumeration, and transparency flag make it the closest one-stop-shop, even though its model quality trails the specialists on any single axis ([7d](./7d-leonardo-playground-krea-firefly.md)).

## Map of the Angles

| Angle | Scope | Core Deliverable |
|---|---|---|
| [7a — Midjourney v6/v6.1/v7 prompting](./7a-midjourney-v6-v7-prompting.md) | Full MJ parameter surface, prompt grammar, `--sref` / `--cref` / `--oref` workflows, Draft Mode, Niji, personalization, asset-specific use cases, the no-API limitation. | Complete MJ parameter reference table + "five-block modular" prompt scaffold + sref-as-brand-token pattern. |
| [7b — Ideogram 2.0/2a/3.0 for logos and text](./7b-ideogram-text-rendering-for-logos.md) | V3 API (generate, generate-transparent, remix, edit, reframe, replace-background, describe, upscale), Magic Prompt footgun, style codes + reference images, benchmarked text accuracy, logo-specific prompt patterns. | OpenAPI-documented V3 request schema, five worked logo prompt recipes, independent text-accuracy benchmark table. |
| [7c — Recraft V3 vector + brand styles](./7c-recraft-v3-vector-and-brand-styles.md) | V3 vs V2 vs V4 model family, native SVG characteristics, `style_id` UUID workflow, text_layout positional control, OpenAI-SDK-compatible API, transparency gap. | End-to-end brand-style pipeline with `createStyle` → `style_id` → generate, vector-quality analysis vs tracers, V4-has-no-styles architectural warning. |
| [7d — Leonardo / Playground v3 / Krea / Firefly / Flux (Together) / Luma Photon / Bing](./7d-leonardo-playground-krea-firefly.md) | The "second tier" of commercial providers: who has which capability, pricing, indemnity status, API readiness ranking, transparency support, text-rendering quality. | Cross-vendor capability matrix + licensing matrix + API-readiness ranking for pipeline integration. |
| [7e — End-to-end asset workflows across tools](./7e-commercial-tool-asset-workflows.md) | Five production recipes chaining MJ+Ideogram+Recraft+Illustrator, Flux+BRIA+vtracer+Figma, gpt-image-1+Affinity icon sets, MJ sref illustration libraries, Claude-orchestrated OG factories. Tool-strengths matrix, cost/time/quality comparison, three working code examples (Python, Bash, Node). | Concrete, cost-estimated recipes + runnable orchestration code for each recipe. |

## Cross-Cutting Patterns

### Pattern 1 — Recraft wins for real vector + brand identity systems

Across [7c](./7c-recraft-v3-vector-and-brand-styles.md) and [7e](./7e-commercial-tool-asset-workflows.md) the same finding recurs: if the deliverable is SVG that a designer will open in Figma/Illustrator and edit, Recraft V3 Vector is the only commercial model that doesn't immediately require a tracer. Its `style_id` UUID is also the strongest brand-memory primitive in the market — 5 upload images, receive a UUID, reuse forever across `generateImage`, `imageToImage`, `inpaint`, `replaceBackground`, `generateBackground`. No training, no hosting, no LoRA gymnastics. The [7e](./7e-commercial-tool-asset-workflows.md) Recipe 4 (MJ sref → Recraft style transfer → Figma library) shows how Recraft normalizes a batch that Midjourney *generated*, giving Recraft a second role as the *end-of-pipeline cohesion pass* even when it isn't the primary generator.

### Pattern 2 — Ideogram wins for any asset where the text is load-bearing

[7b](./7b-ideogram-text-rendering-for-logos.md) documents the benchmarked gap between Ideogram 3.0 (~90% accuracy on short English) and everything else (Flux 1.1 Pro ~75%, Midjourney v7 ~55–65%). [7e](./7e-commercial-tool-asset-workflows.md)'s Recipe 1 operationalizes this: **generate the mark in Midjourney, but generate the wordmark in Ideogram**, then compose them in a vector editor. [7b](./7b-ideogram-text-rendering-for-logos.md) also identifies Ideogram's dedicated `/generate-transparent` endpoint — the only commercial text-to-image model purpose-built for logo export, combining typography + transparency in one call.

### Pattern 3 — Midjourney wins for concept polish and aesthetic ceiling

Every angle that discusses "aesthetic quality" ([7a](./7a-midjourney-v6-v7-prompting.md), [7d](./7d-leonardo-playground-krea-firefly.md), [7e](./7e-commercial-tool-asset-workflows.md)) treats Midjourney v7 as the ceiling for editorial illustration, hero banners, and moodboards. v7's `--sref` + numeric style codes + moodboards + personalization (on by default) give designers a control surface that no one else has matched — but all of it lives inside Discord/web. The cross-cutting advice is uniform: use MJ for **ideation and concept boards**, never for **final delivery**, because MJ has no API, no alpha channel, no SVG, and patchy text rendering.

### Pattern 4 — The concept-clean-vector pipeline is universal

[7e](./7e-commercial-tool-asset-workflows.md)'s five recipes and [7c](./7c-recraft-v3-vector-and-brand-styles.md)'s pricing analysis converge on the same three-stage decomposition:

1. **Concept.** Aesthetically strongest model (MJ v7 or Flux 1.1 Pro via Together); output is raster + noisy background.
2. **Clean.** BRIA RMBG 2.0 for 256-level alpha mattes, `gpt-image-1`'s `background: "transparent"`, Ideogram `/generate-transparent`, Leonardo's `foreground_only` flag, or Recraft `/removeBackground`.
3. **Vector (when needed).** Recraft `recraftv3_vector` as the native option; vtracer for color raster→SVG; potrace for B/W silhouettes; Illustrator Image Trace or vectorizer.ai for human-in-the-loop.

This is what the prompt-to-asset's asset-routing layer should encode as its default DAG, not a single-model call.

### Pattern 5 — Brand-style tokens: three vendors, one abstraction

- Midjourney: `--sref <numeric-code>` + `--sw N` ([7a](./7a-midjourney-v6-v7-prompting.md))
- Ideogram: `style_codes: ["ABCD1234"]` (8-char hex) or `style_reference_images` ([7b](./7b-ideogram-text-rendering-for-logos.md))
- Recraft: `style_id: "<uuid>"` from `POST /styles` with 5 reference images ([7c](./7c-recraft-v3-vector-and-brand-styles.md))
- Leonardo: Elements + Style/Content/Character Reference ([7d](./7d-leonardo-playground-krea-firefly.md))

A prompt-to-asset that stores each brand as `{brand_id, mj_sref?, ideogram_style_code?, recraft_style_id?, leonardo_element_id?}` can route the same brand to whichever specialist the current asset needs — without re-describing the brand in prose each time.

### Pattern 6 — Transparency has three tiers

1. **Native alpha at generation time**: `gpt-image-1 background:"transparent"`, Ideogram V3 `/generate-transparent`, Leonardo Phoenix `transparency:"foreground_only"`. Preferred — no extra latency, no edge artifacts on hair/antialiasing.
2. **Post-process matting**: BRIA RMBG 2.0 (256-level matte, subject-of-the-art), Recraft `/removeBackground`, BiRefNet, U²-Net. Works on any model's raster output; slight edge quality loss.
3. **Vector-native** (transparency is free): Recraft V3 Vector SVG. Zero-cost transparency by definition because SVG has no implicit background.

Angle [7a](./7a-midjourney-v6-v7-prompting.md) documents the classic failure: prompting MJ for "transparent background" paints a literal checkerboard *into* the image, which is the user's original complaint about Gemini. The enhancer must never emit the phrase "transparent background" to a model that can't honor it at generation time.

## Controversies / Disagreements

- **Is Playground v3 actually better than Ideogram 3.0?** [7d](./7d-leonardo-playground-krea-firefly.md) cites the published PGv3 technical report: DPG-Bench Hard **88.62** for PGv3 vs ~**80.12** for Ideogram 2.0, and 82% text synthesis — numbers that would make PGv3 the category leader. But [7b](./7b-ideogram-text-rendering-for-logos.md) cites independent LM Arena human-preference ELO data placing Ideogram 3.0 at the top for design prompts. The honest reconciliation: PGv3 was benchmarked against Ideogram 2.0, not 3.0 (which shipped six months later), and PGv3's API gate means no one can reproduce the numbers at scale. Treat PGv3 as "paper-SOTA, practically unavailable" until partner access opens.

- **Does `--sref` in MJ v7 beat Recraft `style_id`?** [7a](./7a-midjourney-v6-v7-prompting.md) treats `--sref` as the highest-leverage MJ feature; [7c](./7c-recraft-v3-vector-and-brand-styles.md) treats `style_id` as a superior primitive because it's a true server-side object (UUID, immutable, no prompt pollution). Both can be right: `--sref` gives you discoverable *community* styles via numeric codes, which Recraft doesn't; `style_id` gives you a *persistent brand* object, which MJ doesn't. A brand pipeline should probably keep both.

- **Is Luma Photon's "class-leading text" claim real?** [7d](./7d-leonardo-playground-krea-firefly.md) cites Luma's own double-blind 60%+ preference claim, but also cites adam.holter.com's independent review calling Photon "roughly on par with SDXL" with "weak typography." Field evidence in [7e](./7e-commercial-tool-asset-workflows.md) routes all text/typography work to Ideogram or `gpt-image-1`, implicitly agreeing with Holter. The enhancer should not route typography-heavy work to Photon.

- **Does V4 supersede V3 at Recraft?** Recraft's marketing implies V4 is the default; [7c](./7c-recraft-v3-vector-and-brand-styles.md) discovers that V4 does not support styles or style_id. This is an unadvertised regression for any brand-consistent pipeline. Disagreement: Recraft's docs vs Recraft's UX.

- **Can Firefly's indemnity be trusted?** [7d](./7d-leonardo-playground-krea-firefly.md) surfaces that Adobe's own GenAI supplemental terms exclude Firefly Services API by default from the CC indemnity — but Adobe's marketing positions indemnity as a blanket safety guarantee. An agency that routes to Firefly *via API* without an enterprise-verified indemnity clause is exposed.

## Gaps

- **No systematic multi-vendor text-accuracy benchmark.** [7b](./7b-ideogram-text-rendering-for-logos.md) aggregates 2026 head-to-heads from blog.picassoia.com, comparegen.ai, vibedex.ai, cliprise.app, nestcontent.com, LM Arena — but there is no canonical, reproducible benchmark the way GLUE/SuperGLUE exists for NLP. The enhancer should eventually fund or run a private benchmark on the assets it most often generates (brand wordmarks, UI button labels, OG titles).
- **Transparency quality is not benchmarked.** "Has a transparent endpoint" is binary across angles [7b](./7b-ideogram-text-rendering-for-logos.md), [7c](./7c-recraft-v3-vector-and-brand-styles.md), [7d](./7d-leonardo-playground-krea-firefly.md) — but how clean are the edges on fine hair/antialiased detail? No angle provides a comparison. Partial answers come from BRIA RMBG docs (256-level matte) and from Recraft's community reports ([7c](./7c-recraft-v3-vector-and-brand-styles.md)) that the raster-transparent path "sometimes stopped working."
- **Cost comparison mixes per-image and per-megapixel.** MJ is subscription-only (no per-image), Ideogram is per-image, Flux is per-MP, Photon is per-1080p. [7d](./7d-leonardo-playground-krea-firefly.md) and [7e](./7e-commercial-tool-asset-workflows.md) normalize to "per image at default resolution" but this hides the sensitivity to higher resolutions.
- **No production latency data.** Every angle quotes dollars; none quotes wall-clock p50/p95 for the endpoints. Operationally this matters — Ideogram TURBO (~5s) vs QUALITY (~15s) is a user-facing choice the enhancer has to make.
- **MJ Draft Mode + Conversational Mode integration with `--oref` is documented as incompatible** ([7a](./7a-midjourney-v6-v7-prompting.md)) but no alternative fast iteration path is shown for omni-reference workflows.
- **Non-Latin text** is flagged as broken everywhere; no angle documents the best workaround pipeline (likely: Ideogram generate with Latin placeholder → Satori overlay CJK glyphs at composite time — covered in category 10/11 but not here).

## Actionable Recommendations — Our Plugin's Commercial-Tool Routing

### Default routing by asset type

| Asset Type | Primary | Fallback 1 | Fallback 2 | Post-process |
|---|---|---|---|---|
| **Wordmark logo (transparent PNG)** | Ideogram V3 `/generate-transparent` ([7b](./7b-ideogram-text-rendering-for-logos.md)) | `gpt-image-1` `background:"transparent"` ([7e](./7e-commercial-tool-asset-workflows.md)) | Leonardo Phoenix + `foreground_only` ([7d](./7d-leonardo-playground-krea-firefly.md)) | — |
| **Logo mark (vector SVG)** | Recraft `recraftv3_vector` + `style_id` ([7c](./7c-recraft-v3-vector-and-brand-styles.md)) | Ideogram V3 `DESIGN` + Recraft `/vectorize` ([7b](./7b-ideogram-text-rendering-for-logos.md)) | MJ v7 concept + Recraft `/vectorize` ([7e](./7e-commercial-tool-asset-workflows.md)) | Simplify paths in Illustrator/Inkscape if anchor count >300 |
| **App icon (RGBA, 1024×1024 master)** | `gpt-image-1` `transparent` ([7e](./7e-commercial-tool-asset-workflows.md)) | Ideogram V3 `/generate-transparent` ([7b](./7b-ideogram-text-rendering-for-logos.md)) | Recraft V3 + `/removeBackground` ([7c](./7c-recraft-v3-vector-and-brand-styles.md)) | sharp/ImageMagick resize to platform slice grid |
| **Marketing illustration (raster, brand-consistent)** | MJ v7 `--sref <code> --sw 250` ([7a](./7a-midjourney-v6-v7-prompting.md)) (emit prompt, human in loop) | Recraft V3 + `style_id` ([7c](./7c-recraft-v3-vector-and-brand-styles.md)) | Leonardo Phoenix + Elements ([7d](./7d-leonardo-playground-krea-firefly.md)) | Optional Recraft style-transfer cohesion pass |
| **OG / Twitter card (1200×630, text embedded)** | Satori + background from Flux 1.1 Pro ([7e](./7e-commercial-tool-asset-workflows.md) Recipe 5) | Ideogram V3 + explicit positional anchors ([7b](./7b-ideogram-text-rendering-for-logos.md)) | `gpt-image-1` high-quality | Cloudflare CDN cache |
| **Photorealistic product shot** | Flux 1.1 Pro via Together ([7d](./7d-leonardo-playground-krea-firefly.md)) | MJ v7 `--style raw --s 50` ([7a](./7a-midjourney-v6-v7-prompting.md)) | Firefly 5 Ultra ([7d](./7d-leonardo-playground-krea-firefly.md)) | BRIA RMBG 2.0 if cutout needed |
| **Bulk drafts / thumbnails** | Luma Photon Flash ($0.002) ([7d](./7d-leonardo-playground-krea-firefly.md)) | FLUX schnell (free) ([7d](./7d-leonardo-playground-krea-firefly.md)) | Recraft V2 ($0.022) ([7c](./7c-recraft-v3-vector-and-brand-styles.md)) | — |
| **Legal-sensitive / indemnified** | Firefly 5 via Creative Cloud (human, not API) ([7d](./7d-leonardo-playground-krea-firefly.md)) | — | — | — |

### Universal fallback hierarchy when the primary errors

1. **422 (content policy / brand name collision)** → rewrite prompt sanitizing the brand name, retry once; if still 422, route to next vendor.
2. **429 / rate-limit** → exponential backoff; if persistent, route to next vendor with shared style-token mapping.
3. **No-alpha failure** (output has checkerboard or solid background) → post-process through BRIA RMBG 2.0 (primary) or rembg (fallback).
4. **Text corruption** (wordmark misspelled, letters drift) → re-route to Ideogram V3 with `magic_prompt: OFF`, `style_type: DESIGN`, tight negative-prompt list, and `num_images: 4` to sample.
5. **Non-Latin text** → always generate with Latin placeholder and overlay glyphs via SVG/Satori at composite time.

### Enhancer-level rules

1. **Always emit `magic_prompt: OFF` for any Ideogram call classified as logo/icon/wordmark.** Source: [7b](./7b-ideogram-text-rendering-for-logos.md).
2. **Always emit `--style raw --s 50` for any MJ call classified as product/photography.** Source: [7a](./7a-midjourney-v6-v7-prompting.md).
3. **Never emit "transparent background" in prose to a model that doesn't support native alpha.** Route to a transparent-endpoint vendor, or use the solid-background + post-matte pipeline.
4. **Persist brand-style tokens per brand record** with fields for each vendor's primitive (mj_sref, ideogram_style_code, recraft_style_id, leonardo_element_id). Source: [7a](./7a-midjourney-v6-v7-prompting.md), [7b](./7b-ideogram-text-rendering-for-logos.md), [7c](./7c-recraft-v3-vector-and-brand-styles.md), [7d](./7d-leonardo-playground-krea-firefly.md).
5. **Pin Recraft brand pipelines to V3.** V4 has no styles. Source: [7c](./7c-recraft-v3-vector-and-brand-styles.md).
6. **Never expose Midjourney as a server-side generator.** Emit ready-to-paste MJ prompts. Source: [7a](./7a-midjourney-v6-v7-prompting.md).
7. **Cap user-supplied wordmark text at 60 chars** in UI validation; hard-warn past 200. Source: [7b](./7b-ideogram-text-rendering-for-logos.md).

## Primary Sources Aggregated

### Midjourney (angle [7a](./7a-midjourney-v6-v7-prompting.md))
- [docs.midjourney.com](https://docs.midjourney.com/docs/parameter-list) — full parameter list, `--sref`, `--cref`, `--oref`, `--style raw`, `--stylize`, `--chaos`, `--weird`, `--tile`, multi-prompts, permutations, image prompts.
- [updates.midjourney.com](https://updates.midjourney.com/v7-alpha/) — V7 alpha (Apr 2025), V7 update + editor + `--exp`, profiles & moodboards, `--oref` announcement, Version 6.1.
- [TechCrunch — V7 launch](https://techcrunch.com/2025/04/03/midjourney-releases-its-first-new-ai-image-model-in-nearly-a-year), [Engadget V7 coverage](https://www.engadget.com/ai/midjourney-launches-its-new-v7-ai-image-model-that-can-process-text-prompts-better-134546883.html).
- Community: [Midlibrary SREF deep-dive](https://midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes), [Woollyfern SREF library](https://www.woollyferncreative.com/blog/2024/05/28/midjourney-sref-random-styles-library/), [Niji V7 guide](https://niji-v7.com/), [Rephrase `--cref`/`--sref` stability](https://rephrase-it.com/blog/midjourney-v7-prompting-that-actually-sticks-using-cref-sref).
- Workarounds: [Transparify alpha recovery](https://transparify.app/blog/midjourney-transparent-background), [AIFreeAPI on MJ API reality](https://www.aifreeapi.com/en/posts/midjourney-api-guide).

### Ideogram (angle [7b](./7b-ideogram-text-rendering-for-logos.md))
- [about.ideogram.ai/3.0](https://about.ideogram.ai/3.0), [about.ideogram.ai/2.0](https://about.ideogram.ai/2.0), [about.ideogram.ai/canvas](https://about.ideogram.ai/canvas).
- [developer.ideogram.ai/api-reference/api-reference/generate-v3](https://developer.ideogram.ai/api-reference/api-reference/generate-v3), [generate-transparent-v3](https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3), [replace-background-v3](https://developer.ideogram.ai/api-reference/api-reference/replace-background-v3).
- [docs.ideogram.ai](https://docs.ideogram.ai/using-ideogram/generation-settings/magic-prompt) — Magic Prompt, render speed, available models, prompting guide, canvas overview.
- Academic: [Glyph-ByT5-v2 (arXiv 2406.10208)](https://arxiv.org/html/2406.10208v1).
- Benchmarks: [picassoia](https://blog.picassoia.com/flux-1-1-pro-vs-ideogram-3-0-for-ai-art), [comparegen.ai](https://www.comparegen.ai/blog/midjourney-vs-ideogram-vs-flux-2026), [vibedex.ai](https://vibedex.ai/blog/flux-2-pro-vs-ideogram-3-vs-seedream-45), [nestcontent](https://nestcontent.com/blog/text-to-image-ai), [LM Arena](https://lmarena.ai/vi/leaderboard/text-to-image).

### Recraft (angle [7c](./7c-recraft-v3-vector-and-brand-styles.md))
- [recraft.ai/blog — Recraft V3 launch](https://www.recraft.ai/blog/recraft-introduces-a-revolutionary-ai-model-that-thinks-in-design-language) (Oct 30, 2024).
- [recraft.ai/docs/api-reference/endpoints](https://www.recraft.ai/docs/api-reference/endpoints), [styles](https://www.recraft.ai/docs/api-reference/styles), [pricing](https://www.recraft.ai/docs/api-reference/pricing), [recraft-V3 model page](https://www.recraft.ai/docs/recraft-models/recraft-V3), [llms-full.txt](https://recraft.ai/llms-full.txt).
- [replicate.com/recraft-ai/recraft-v3-svg](https://replicate.com/recraft-ai/recraft-v3-svg) + [readme](https://replicate.com/recraft-ai/recraft-v3-svg/readme).
- Benchmarks: [Artificial Analysis T2I leaderboard](https://huggingface.co/spaces/ArtificialAnalysis/Text-to-Image-Leaderboard).
- Community: [HN 41999491](https://news.ycombinator.com/item?id=41999491), [HN 43787181](https://news.ycombinator.com/item?id=43787181), [Simon Willison notes](https://simonwillison.net/2024/Nov/15/recraft-v3/), [canny feature request on transparency](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background).

### Second-tier commercial providers (angle [7d](./7d-leonardo-playground-krea-firefly.md))
- Leonardo: [docs.leonardo.ai/docs/phoenix](https://docs.leonardo.ai/docs/phoenix), [commonly-used-api-values](https://docs.leonardo.ai/docs/commonly-used-api-values), [transparency](https://docs.leonardo.ai/docs/generate-images-using-transparency), [Elements API](https://docs.leonardo.ai/reference/listelements), [PAYG guide](https://docs.leonardo.ai/docs/payg-guide).
- Playground v3: [arXiv 2409.10695](https://arxiv.org/abs/2409.10695), [playground.com/pg-v3](https://www.playground.com/pg-v3), [docs.playground.com](https://docs.playground.com/reference/image-generation), [pricing](https://playground.com/pricing).
- Krea: [docs.krea.ai/user-guide/features/krea-1](https://docs.krea.ai/user-guide/features/krea-1), [api-keys-and-billing](https://docs.krea.ai/developers/api-keys-and-billing), [flux-krea open release](https://krea.ai/blog/flux-krea-open-source-release).
- Firefly: [licenseorg indemnity explained](https://www.licenseorg.com/blog/adobe-firefly-indemnification-explained), [developer.adobe.com firefly-api](https://developer.adobe.com/firefly-services/docs/firefly-api), [Adobe GenAI Supplemental Terms PDF](https://www.adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/AEC-GenAI-Supplemental-Terms-WW-2025v2.pdf).
- Together AI Flux: [flux1-1-pro](https://www.together.ai/models/flux1-1-pro), [billing-usage-limits](https://docs.together.ai/docs/billing-usage-limits).
- Luma Photon: [docs.lumalabs.ai/docs/image-generation](https://docs.lumalabs.ai/docs/image-generation), [api pricing](https://lumalabs.ai/api/pricing), [independent Holter review](https://adam.holter.com/luma-photon-matches-sdxl-quality-bad-and-fails-at-text/).
- Bing: [techcrunch PR16 rollback (Jan 2025)](https://techcrunch.com/2025/01/08/microsoft-rolls-back-its-bing-image-creator-model-after-users-complain-of-degraded-quality/).

### Workflow & orchestration sources (angle [7e](./7e-commercial-tool-asset-workflows.md))
- BRIA RMBG 2.0: [github.com/Bria-AI/RMBG-2.0](https://github.com/Bria-AI/RMBG-2.0), [docs.bria.ai](https://docs.bria.ai/image-editing/v2-endpoints/background-remove), [Segmind RMBG 2.0](https://www.segmind.com/models/bria-remove-background).
- vtracer: [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer/), [visioncortex docs](https://www.visioncortex.org/vtracer-docs).
- OpenAI `gpt-image-1` transparency: [platform.openai.com/docs/guides/image-generation](https://platform.openai.com/docs/guides/image-generation), [AI-FLOW asset extraction](https://ai-flow.net/blog/asset-extraction-workflow-gpt-image-1/).
- OG factories: [OGImagen](https://ogimagen.com/), [OGForge](https://ogforge.dev/), [ry-ops n8n+ImageMagick+Claude](https://ry-ops.dev/amp/2026-02-11-building-an-automated-blog-content-pipeline-with-n8n-imagemagick-and-claude).
- Designer perspectives: [Numonic on --sref governance](https://numonic.ai/blog/midjourney-brand-consistency-guide), [Fadiman MJ vs Recraft library](https://medium.com/@fadimantium/illustration-library-midjourney-vs-recraft-f47df47f8706), [Nurxmedov — Recraft fits designers](https://nurxmedov.medium.com/why-recraft-is-the-first-ai-tool-that-understands-how-designers-actually-work-0294a5e5b787), [Vecsmith text-to-SVG](https://llmkube.com/blog/vecsmith-weekend-text-to-svg).

---

See sibling categories: [13-transparent-backgrounds](../13-transparent-backgrounds/) for the checker-box problem in depth, [12-vector-svg-generation](../12-vector-svg-generation/) for SVG pipelines, [16-background-removal-vectorization](../16-background-removal-vectorization/) for BRIA/rembg/vtracer details, [05-openai-dalle-gpt-image](../05-openai-dalle-gpt-image/) for `gpt-image-1` transparency, and [15-style-consistency-brand](../15-style-consistency-brand/) for brand-token patterns.
