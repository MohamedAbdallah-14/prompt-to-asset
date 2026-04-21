---
category: 15-style-consistency-brand
category_title: "Style Consistency & Brand — keeping a set of assets on-brand"
indexer: category-indexer-15
date: 2026-04-19
angles_indexed:
  - 15a-consistent-character-and-mascot
  - 15b-style-transfer-sref-b-lora
  - 15c-brand-color-palette-enforcement
  - 15d-machine-readable-brand-bundle
  - 15e-full-asset-set-consistency
word_count_target: 2000-3500
primary_concept: brand-bundle
downstream_consumers:
  - docs/research/SYNTHESIS.md
  - plugin-enhancer MCP server
  - skills/brand-bundle
primary_sources_aggregated: 60+
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 15 — Style Consistency & Brand

## Category Executive Summary

Across five angles this category answers a single product question: **how does the prompt-to-asset take a user's "generate a logo / icon / OG image for my app" request and guarantee that every artifact it produces belongs to the same brand?** The five angles converge on one answer — a versioned, machine-readable *brand bundle* that the enhancer injects on every downstream call — but each angle supplies a different layer of that bundle. The 15 insights below are the operative conclusions.

1. **Brand consistency is a bundle problem, not a prompt problem.** All five angles independently converge on the same architecture: a versioned artifact combining structured tokens, semantic roles, prose descriptors, binary style anchors, and a model-specific injection protocol. No single prompt string can carry this payload ([15d §Schema Proposal](./15d-machine-readable-brand-bundle.md), [15e §Propagation Architecture](./15e-full-asset-set-consistency.md)).
2. **Subject consistency and style consistency are separate problems with separate tooling.** Subject consistency (a mascot appearing in 30 scenes) is solved with DreamBooth-LoRA, IP-Adapter-FaceID, PuLID, or MJ `--oref` (V7+) / `--cref` (V6) ([15a](./15a-consistent-character-and-mascot.md)). Style consistency (100 assets reading as one brand) is solved with MJ `--sref`, B-LoRA, InstantStyle, or StyleAligned ([15b](./15b-style-transfer-sref-b-lora.md)). Mixing the two — e.g. using IP-Adapter-FaceID to enforce a brand aesthetic — causes content leakage and is a recurring failure mode.

> **Updated 2026-04-21:** MJ `--cref` is deprecated in V7+ — replaced by `--oref` (Omni Reference, `--ow` for weight). `--oref` also works for non-human subjects (objects, mascots, products). MJ V8.1 Alpha drops `--oref` — use V7 for character/object consistency until V8 final ships. See [15a](./15a-consistent-character-and-mascot.md) for full detail.
3. **PuLID is the 2024 state-of-the-art for tuning-free identity** ([Guo et al., NeurIPS 2024, arXiv:2404.16022](https://arxiv.org/abs/2404.16022)), beating InstantID and IP-Adapter-FaceID on both identity fidelity *and* editability because of a contrastive alignment loss that preserves the base model's prompt-following. The lineage — IP-Adapter-FaceID (Aug 2023) → PhotoMaker (Dec 2023) → InstantID (Jan 2024) → PuLID (Apr 2024) — is the canonical face-identity stack and has a Flux port ([15a §Training-free identity adapters](./15a-consistent-character-and-mascot.md)).
4. **For mascots and products (not faces), rank-16 DreamBooth-LoRA with prior preservation is still the default.** 10–30 images, rare trigger token (`ohwx`, `sks`), captions that describe *everything except* the subject, 1500 steps on Flux-dev or SDXL, ships as a ≈40 MB file ([15a §Use case A](./15a-consistent-character-and-mascot.md), [Ostris AI-Toolkit](https://github.com/ostris/ai-toolkit)).
5. **Style and content are already partially disentangled inside SDXL.** B-LoRA ([Frenkel et al. ECCV 2024, arXiv:2403.14572](https://arxiv.org/abs/2403.14572)) proves that block 4 encodes content and block 5 encodes style; InstantStyle ([arXiv:2404.02733](https://arxiv.org/abs/2404.02733)) exploits the same taxonomy by injecting IP-Adapter features only into blocks 4 and 6. The practical upshot for the enhancer: "style only" reference mechanisms now exist at zero extra training cost, and the community consensus in `ComfyUI_IPAdapter_plus` is `weight_type="style transfer precise"` with `weight=0.6–0.8`, `end_at=0.7` ([15b §InstantStyle, §IP-Adapter weight_type](./15b-style-transfer-sref-b-lora.md)).
6. **T2I models do not natively honor hex codes.** "Primary color #1E6FFF" in a Gemini/Imagen/DALL·E/SDXL prompt routinely lands 10–40 ΔE2000 away from the target in CIELAB — unacceptable for any brand system whose tolerance is ΔE ≤ 2 on primary marks. Prompt-only hex enforcement is ranked dead last on fidelity ([15c Table §Enforcement Options](./15c-brand-color-palette-enforcement.md)).
7. **Recraft V3 and V4 are the only major hosted APIs with first-class palette input.** `controls.colors` accepts 2–5 RGB triplets and is the strongest single generation-time signal for palette compliance ([15c §1.1](./15c-brand-color-palette-enforcement.md)). Every other model requires either IP-Adapter swatch conditioning (SDXL/Flux, ΔE ≈ 5–15) or pure post-process remap. **Caveat (updated 2026-04-21):** Custom brand `style_id` (trained from reference images) is supported in V3/V3 Vector only — **not in V4**. V4 supports `controls.colors` for palette enforcement but lacks the trained style-anchor feature. Combine V3 with `style_id` + `controls.colors` for the full brand-lock stack; use V4 when palette enforcement alone (without a custom style reference) is sufficient and better generation quality is preferred. Source: [Recraft styles API docs](https://www.recraft.ai/docs/api-reference/styles).
8. **Enforcement is a validation problem, not a generation problem.** The reliable gate is: K-means in LAB space → ΔE2000 nearest-palette lookup → hard remap if vector-friendly, 3-D LUT bake if gradient/photographic, Reinhard transfer for backgrounds. With that gate, the cheapest generator that passes it can be used instead of fighting the model ([15c §4, §5](./15c-brand-color-palette-enforcement.md)).
9. **DTCG 2025.10 is the correct base layer for the bundle.** The W3C Design Tokens Community Group Format Module reached v1 on 2025-10-28 ([designtokens.org/tr/2025.10/format](https://www.designtokens.org/tr/2025.10/format)). All generative extensions must live under `$extensions.ai.generation` per DTCG §9 so existing Style Dictionary v4 + `@tokens-studio/sd-transforms` pipelines round-trip unchanged ([15d §Schema notes](./15d-machine-readable-brand-bundle.md)).
10. **"Tokens for AI agents" is already a proven pattern — but only for code, not for assets.** IBM Carbon MCP (Feb 2026), Atlassian's `llms-tokens.txt` ("you must ONLY use tokens listed in this document"), `dembrandt-mcp`, and Brandfetch MCP all expose design tokens to coding agents. None of them expose logo PNGs, `--sref` codes, LoRA weights, or a `generate_asset` tool. The asset-generation layer is green-field ([15d §Existing Standards Survey](./15d-machine-readable-brand-bundle.md)).
11. **Style injection must be layered, not concatenated.** Naive prefix/suffix stuffing burns diffusion context windows and is often ignored (diffusion attention is front-weighted). The emerging practice is three layers: (a) natural-language prose in the prompt body, (b) structured flags via model-specific channels (`--sref`, `--cref`, IP-Adapter image, LoRA `<lora:brand_v3:0.8>`), (c) post-hoc validation with retry. The bundle must carry each layer as a separable field ([15d §Prompt-Injection Strategy](./15d-machine-readable-brand-bundle.md)).
12. **Commercial AI brand studios do not generate full asset sets with diffusion.** Brandmark retrieves from ~1M Noun Project vectors + GAN palettes + templated kits; Looka regenerates 300 assets in under a minute via parametric template fills; LogoAI, Tailor Brands, Namelix follow the same retrieval + template pattern. Recraft is the outlier — its `style_id` is the only first-class "brand token" API in the commercial landscape ([15e §Commercial Tool Teardown](./15e-full-asset-set-consistency.md)).
13. **For full asset sets, use one human gate (the master logo) and deterministic propagation for everything else.** Derive a `BrandSpec` (palette, geometry, descriptors, do-not) from the approved mark, mint a content-addressed brand token, loop slot-specific prompt templates over 20 illustrations and 100 UI icons with per-slot fixed seeds and pinned model versions ([15e §Propagation Architecture, §Reference Pipeline](./15e-full-asset-set-consistency.md)).
14. **CSD (Contrastive Style Descriptor, [Somepalli et al., arXiv:2404.01292](https://arxiv.org/abs/2404.01292)) is the missing measurement tool** for brand drift. ViT-L trained on LAION-Styles with a contrastive objective that preserves style and suppresses content. Empirical thresholds against a brand anchor: cosine ≥ 0.72 "on-brand", 0.60–0.72 "ambiguous", < 0.60 "off-brand" ([15b §Drift Management](./15b-style-transfer-sref-b-lora.md)).
15. **Drift has three channels, each with its own mitigation.** (a) Model version drift (MJ sref codes change across versions) — pin versions and the style-reference sub-version (`--sv 6` is the V7 default since June 16, 2025; V8 Alpha launched March 2026 and renders sref codes differently); diff golden sets per release. (b) Operator drift (different strengths applied by different people) — centralize `--sw` / `--sv` / IP-Adapter weight / LoRA scale in `model_bindings`. (c) Content leakage (reference subject in outputs) — use InstantStyle / VSP / B-LoRA style-only, subject-light moodboards, explicit subject negatives ([15b §Failure modes](./15b-style-transfer-sref-b-lora.md), [15a §Drift Mitigation](./15a-consistent-character-and-mascot.md)).

> **Updated 2026-04-21:** MJ V7 now has six `--sv` style-reference sub-algorithms; `--sv 6` is default. V6 legacy codes require `--sv 4`. V8 Alpha (March 2026) keeps `--sref` but drops `--oref`/`--ow` in V8.1. Record `--sv` values in provenance alongside sref codes. See [15b §Updated 2026-04-21 note](./15b-style-transfer-sref-b-lora.md) for full detail.

## Map of the Angles

| Angle | Scope | Key primitive | Where it sits in the bundle |
|---|---|---|---|
| **15a** — Consistent character/mascot | Subject identity across scenes (people, mascots, products) | DreamBooth-LoRA, IP-Adapter-FaceID, InstantID, PhotoMaker, PuLID, MJ `--oref` (V7) / `--cref` (V6), Ideogram char-ref, gpt-image-1 multi-image, Gemini 2.5 Flash conversational | `$extensions.ai.generation.loras[]`, `character_references[]`, `seed_library.json` |
| **15b** — Style transfer (not subject) | Aesthetic / palette / material lock across 100+ assets | MJ `--sref` + `--sw`, Ideogram `style_codes`, Recraft `style_id`, StyleAligned, B-LoRA, Visual Style Prompting, InstantStyle, CSD | `$extensions.ai.generation.style_references[]`, `model_bindings.*.sref` |
| **15c** — Brand color enforcement | Exact hex compliance, ΔE2000-gated output | Recraft `controls.colors`, IP-Adapter palette swatch, K-means+LAB+ΔE2000 remap, 3-D LUT, Reinhard transfer, HSV hue-shift | `color.*`, `validation.palette_check`, post-process pipeline |
| **15d** — Machine-readable brand bundle | The *schema* that binds everything together | DTCG 2025.10, Style Dictionary v4, `$extensions.ai.generation`, MCP tool surface | The entire `brand-bundle.json` + `prompt-to-asset-brand-mcp` server |
| **15e** — Full asset set consistency | One approved logo → 121 asset slots | Brand token (content-addressed), slot templates, per-slot seeds, pinned model SHAs, deterministic post-processing | `$metadata`, `provenance`, `prompt_templates.*`, slot registry |

These angles are layered, not parallel. 15e is the pipeline; 15d is its data model; 15b + 15c are the style + color enforcement mechanisms 15d's `model_bindings` routes to; 15a is the subject-identity specialization when the asset is a mascot or product.

## Cross-Cutting Patterns

### The **brand bundle** as first-class concept

Every angle describes the same object from a different angle: 15a's "seed library + LoRA file + canonical reference"; 15b's "style anchor + `style_code` + B-LoRA"; 15c's "palette + validation tolerance + post-process pipeline"; 15d's formal `brand-bundle.json` with DTCG `color.*`, `typography.*`, and an `$extensions.ai.generation` namespace; 15e's content-addressed "brand token" with `logo`, `palette`, `geometry`, `style.anchors`, `style.recraft_style_id`, `style.mj_sref`, `provenance`. **These are the same object viewed five ways.** The canonical name going forward is **brand bundle**, implementing 15d's schema with 15e's `token_id` semantics.

### Layered injection

All five angles reject single-channel injection. The consensus stack is:

1. **Prose layer** — natural-language paragraph assembled from `style_prose` + slot-specific template, front-loading the subject (not the brand), hexes inline, negative clause as `"Avoid: ..."` for closed models that don't support negative prompts. Max ≈ 70 tokens of brand descriptors before composition degrades.
2. **Structured-parameter layer** — model-specific flags routed by `model_bindings.<model>`: MJ gets `--sref <code> --sw 250..400 --sv 6 --ar 1:1` (for V7 new codes; use `--sv 4` for V7 legacy codes, `--v 6` for V6 codes), Flux/SDXL get `<lora:brand_v3:0.75>` + IP-Adapter reference at weight 0.6 (use XLabs `flux-ip-adapter-v2` for Flux.1-dev), Ideogram gets `style_codes` OR `style_reference_images` (they are mutually exclusive per the API), Recraft gets `style_id` (V3/V3 Vector only) plus `controls.colors` (V3 and V4), Gemini/GPT-Image have no structured channel so Layer 2 folds back into Layer 1.
3. **Validation layer** — ΔE2000 palette check, CSD style similarity against anchors, CLIP classifier for prohibited elements, OCR for forbidden strings. On failure: retry with tightened knobs (raise `--sw`, raise IP-Adapter weight, switch to `"strong style transfer"` weight type, or fall back to hard palette remap).

### Determinism by construction

Every angle pushes determinism as the answer to "why did this asset drift?":

- **Seed discipline.** Derive per-slot seeds from `H(brand.seed_base ‖ slot ‖ concept)` so the same concept always produces the same seed; SD/SDXL/Flux + ODE schedulers (DPM-Solver++, Euler) give bit-identical outputs ([15e §Determinism](./15e-full-asset-set-consistency.md), [15a §Drift Mitigation](./15a-consistent-character-and-mascot.md)).
- **Model pinning.** Record model/checkpoint SHA in `provenance.model_assets`. Re-runs 6 months later with a newer base are an explicit bump, not an accident.
- **Content-addressed caching.** Cache key is `(brand_token_id, slot, concept, seed, model_sha, template_version)`. Hit rate in iterative work is ≈ 95%.
- **Canonicalization of references.** Never chain generations — do not feed gen-N into gen-N+1 as a reference; drift accumulates per Google's own Gemini consistency guidance. Always go back to the pinned canonical reference.

### "Tokens, not values" wherever the consumer supports it

DTCG aliases (`{color.brand.primary}`) are fine for Style Dictionary consumers (CSS, Swift, Kotlin, Tailwind). T2I models don't resolve aliases — they want strings. The bundle ships **both**: an aliased source of truth for design tooling, and a resolved `brand-bundle.resolved.json` emitted by Style Dictionary for the enhancer at inject time.

### Hybrid generate + compose

For full asset sets, don't regenerate what you can composite. 15e reads the commercial-studio teardown as a lesson: Brandmark, Looka, LogoAI all use retrieval + template fan-out. Our pipeline should mirror this — **T2I is in the loop for the master logo and the ~120 icons/illustrations; favicons, app-icon platform sizes, OG cards, splash screens, social banners are all deterministic post-processing from the master mark** ([15e §Reference Repos](./15e-full-asset-set-consistency.md)).

## Controversies

- **Does typography-in-the-bundle make sense at all?** No T2I model can be forced into a specific font; Ideogram v3 and Recraft are closest. 15d's answer is yes, because `typography.*.$extensions.ai.generation.fallback_description` ("geometric sans-serif, slightly condensed, crisp bold") means something to a diffusion model even when "Söhne" doesn't, and because for OG images the headline should be rendered as SVG over the generated background rather than by the generator. 15e sidesteps by not generating typography at all (fonts are licensed files referenced by name). This gap between "generator must obey font" and "generator should never generate typography" is real and unresolved.
- **LoRA vs. training-free for brand style.** 15a / 15b / 15e treat LoRA as the gold standard; 15d treats it as optional ("must degrade gracefully if `loras: []`") because LoRAs work only on open-weights models. The honest answer depends on ownership: if the product is a closed-model pipeline (Gemini, GPT-Image, MJ, Ideogram), LoRA is unreachable and the style anchor + `--sref` / `style_id` are the ceiling. If the product is open-weights, a per-brand LoRA is worth it somewhere around the 200-asset mark ([15e §Open questions](./15e-full-asset-set-consistency.md)).
- **Hard palette remap vs. generation-time enforcement.** 15c ranks post-process remap at #1 for fidelity (guarantees exact hex) but warns it destroys anti-aliasing on rasters; Recraft `controls.colors` is #3 with ΔE 1–5 in most runs but preserves edges. Consensus: remap for vector/flat icons (edges don't matter or can be re-aliased); LUT for gradient illustrations; Recraft `controls.colors` as the upstream bias for both.
- **MJ `--sref` governance.** 15b cites Numonic's claim that teams lose track around 200+ codes without versioning and approval workflow. 15e cites the same pattern positively — an `--sref` code is a valid shareable brand handle. The controversy is about scale, not about whether the handle exists: at <20 codes you version by memory, at 200+ you need a registry, which is exactly what `brand-bundle.json` provides.
- **Is `$extensions.ai.generation` the right spec path?** 15d flags this as an open question — propose to DTCG as a formal vendor extension, or ship as a prompt-to-asset-specific schema and hope the industry converges? Atlassian's `llms-tokens.txt` and IBM Carbon MCP are precedents that the pattern is real; no spec body owns it yet.

## Gaps

- **No benchmark for "Recraft `style_id` holds for 100+ icons"** — 15e flags an empirical test is needed (cross-ref category 07). Until measured, `style_id` is a plausible brand-token primitive but not a validated one.
- **Break-even for per-brand LoRA vs. IP-Adapter + descriptors is unmeasured.** 15e estimates ~200 assets; no published A/B.
- **Brand-refresh UX is undesigned.** Changing a bundle palette correctly invalidates cache entries whose templates have `uses_palette: true`, but the user-facing flow ("only UI icons changed, illustrations didn't") is open.
- **Prohibited-element detection needs a classifier, not a prompt.** 15d flags this but does not specify one. Gap: a small CLIP-based prohibited-visual classifier trained per brand on `prohibited_elements.visual`.
- **Typography-in-asset is largely unsolved outside Ideogram/Recraft.** 15d's fallback (render SVG over generated background) shifts generation → composition, but there's no schema slot for "where on the image should the headline go" (safe area, baseline, max-width-%).
- **No cross-asset brand drift metric.** CSD + ΔE2000 are per-asset; a set-level "has the brand drifted since last release?" aggregate is unimplemented.
- **No WCAG contrast tie-in.** `systembridge-mcp` exposes WCAG for code; no equivalent for asset generation, though OG-image and icon-on-background contrast are obviously in scope.

## Actionable Recommendations

### The machine-readable brand bundle schema for our plugin

Adopt the 15d schema verbatim as `brand-bundle.v1.json`, with 15e's content-addressed `token_id` semantics layered in. The minimum-viable shape is:

```json
{
  "$schema": "https://prompt-to-asset.dev/schemas/brand-bundle/v1.json",
  "$version": "1.0.0",
  "$metadata": {
    "brand_id": "acme-notes",
    "version": "2026.04.19",
    "token_id": "bt_sha256:a1b2…",
    "source": { "figma_file": "...", "git": "...", "commit": "..." }
  },
  "color":      { "brand": {...}, "neutral": {...}, "semantic": {...} },
  "typography": { "display": {...}, "body": {...}, "mono": {...} },
  "$extensions": { "ai.generation": {
    "voice":             { "visual_register": [...], "mood": [...], "avoid_register": [...] },
    "style_prose":       "≤70-token paragraph describing the house style",
    "style_references":  [{ "role": "primary_style_ref", "uri": "...",
                            "midjourney_sref": "3827461029", "weight": 0.8 }],
    "loras":             [{ "name": "acme_v3", "base": "flux.1-dev",
                            "uri": "...", "trigger": "acmebrand illustration style",
                            "recommended_weight": 0.75 }],
    "ip_adapter":        { "enabled": true, "reference_image": "...",
                            "weight": 0.6, "model": "ip-adapter-plus_sdxl" },
    "negative_prompt":   [...],
    "prohibited_elements": { "visual": [...], "semantic": [...] },
    "output_constraints":  { "aspect_ratios": [...], "min_resolution": "1024x1024",
                              "prefer_transparent_bg_for": ["logo","app_icon","favicon"],
                              "color_profile": "sRGB" },
    "prompt_templates":  { "logo": {...}, "illustration": {...}, "og_image": {...},
                           "app_icon": {...}, "favicon": {...}, "ui_icon": {...} },
    "model_bindings":    { "gemini-2.5-flash-image": {...}, "gpt-image-1": {...},
                            "flux.1-dev": {...}, "midjourney-v7": {...},
                            "ideogram-v3": {...}, "recraft-v3": {...} },
    "validation":        { "palette_check": { "tolerance_delta_e": 3.0,
                                               "min_coverage_pct": 40 },
                            "csd_against_refs": { "min_cosine": 0.72 },
                            "clip_classifier_against_prohibited": true }
  }},
  "provenance": { "model_logo": "...", "model_assets": "...",
                  "seed_base": 8675309 }
}
```

Rules: DTCG-compatible at the top level (Style Dictionary v4 + `@tokens-studio/sd-transforms` pass through unchanged); all novel fields under `$extensions.ai.generation`; binary artifacts by URI (S3 or Git LFS); content-addressed (`token_id = sha256(canonical_json)`) and immutable per version.

### How the prompt-to-asset ingests a design token file

Three ingestion paths, auto-selected by source:

1. **DTCG / Style-Dictionary JSON** — pass through `@tokens-studio/sd-transforms` v2 with a preset mapping common token names (`color.brand.primary`, `typography.display`) into the bundle's canonical slots, emit `brand-bundle.resolved.json`. Missing fields (style refs, negative prompt) are filled from per-brand defaults or a first-run interview.
2. **Figma Variables** — call the Figma Variables REST API (`GET /v1/files/:file_key/variables/local`) or accept a manual JSON export, convert via `@serendie/figma-utils` to DTCG, then path #1.
3. **Cold-start from URL / PDF / screenshot** — `dembrandt` against a live URL for palette/typography/spacing, or Brandfetch MCP for logo + colors + fonts by domain. For PDFs, `pdfplumber` + vision-LLM over rendered pages per the [Firecrawl brand-style-guide cookbook](https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook). Always route through human approval before promoting to shipping `brand-bundle.json`.

Expose over MCP as `prompt-to-asset-brand-mcp` with tools `list_brands`, `get_bundle`, `get_palette`, `get_typography`, `get_style_refs`, `get_negative_prompt`, `get_prompt_template`, `enhance_prompt`, `validate_asset`, `list_loras`. `enhance_prompt(brand_id, user_prompt, kind, target_model)` is the primary product surface — agents remain model-agnostic; the server applies `model_bindings` per call.

### How the enhancer enforces palette + style ref on every downstream generation

The enforcement loop runs on every `enhance_prompt` → generate → ship pipeline, per 15c §5 and 15e §QA gate:

1. **Compile.** `enhance_prompt` returns `{ prompt, negative_prompt, model_params }`. `prompt` carries Layer 1 (prose, hexes inline). `model_params` carries Layer 2 (`sref`, `sw`, LoRA name + weight, IP-Adapter image + weight, Recraft `style_id` + `controls.colors`, Ideogram `style_codes` OR `style_reference_images` — respecting per-model mutual-exclusion). `negative_prompt` is used where supported, else folded into prose as `"Avoid: ..."`.
2. **Generate.** The agent calls the target model with the compiled payload.
3. **Validate** via `validate_asset(brand_id, image)`:
   - **Palette.** K-means in LAB (`k=6–12`), ΔE2000 nearest-palette lookup, fail if worst-cluster ΔE > `validation.palette_check.tolerance_delta_e` or coverage < `min_coverage_pct`.
   - **Style.** CSD cosine against `style_references[0]`, fail if < `min_cosine`.
   - **Prohibited.** CLIP classifier over `prohibited_elements.visual`, OCR over generated text for forbidden terms.
4. **Retry or remap.** On failure: vector-friendly asset → hard palette remap (15c `remap_to_palette`); gradient/illustration → 3-D LUT bake (`size=33`, `strength=0.6`, Pillow-LUT); photographic background → Reinhard transfer against a brand-labeled reference. Style-similarity failures retry generation with bumped `--sw` / IP-Adapter weight / LoRA scale; after three retries, escalate to human.
5. **Ship.** Write to the asset manifest (15e §manifest) with `brand_token`, `version`, `sha256`, `seed`, `model`, `path` per asset — the auditable record that outputs belong to the stated bundle version.

Key tolerances to ship with (configurable per brand):

| Asset kind | ΔE2000 on primary cluster | CSD cosine vs anchor | Stroke width drift |
|---|---|---|---|
| Logo / app-icon primary fill | ≤ 1.0 | ≥ 0.80 | ≤ ±0.25 px at 1024 |
| UI icon | ≤ 2.0 | ≥ 0.75 | ≤ ±0.25 px at 24 |
| Secondary illustration fill | ≤ 2.5 | ≥ 0.68 | n/a |
| Marketing hero background | ≤ 5.0 | ≥ 0.62 | n/a |
| OG image background | ≤ 5.0 (foreground text ≤ 1.0) | ≥ 0.62 | n/a |

These are the 15b + 15c + 15e thresholds reconciled into a single table; the enhancer ships them as defaults in `validation` and the brand can override.

## Primary Sources Aggregated

**Papers (arXiv):** Ruiz et al., *DreamBooth*, CVPR 2023, [2208.12242](https://arxiv.org/abs/2208.12242); Gal et al., *Textual Inversion*, ICLR 2023, [2208.01618](https://arxiv.org/abs/2208.01618); Hu et al., *LoRA*, ICLR 2022, [2106.09685](https://arxiv.org/abs/2106.09685); Ye et al., *IP-Adapter*, [2308.06721](https://arxiv.org/abs/2308.06721); Wang et al., *InstantID*, [2401.07519](https://arxiv.org/abs/2401.07519); Li et al., *PhotoMaker*, CVPR 2024, [2312.04461](https://arxiv.org/abs/2312.04461); Guo et al., *PuLID*, NeurIPS 2024, [2404.16022](https://arxiv.org/abs/2404.16022); Hertz et al., *StyleAligned*, CVPR 2024, [2312.02133](https://arxiv.org/abs/2312.02133); Frenkel et al., *B-LoRA*, ECCV 2024, [2403.14572](https://arxiv.org/abs/2403.14572); Jeong et al., *Visual Style Prompting*, [2402.12974](https://arxiv.org/abs/2402.12974); Wang et al., *InstantStyle*, [2404.02733](https://arxiv.org/abs/2404.02733); Somepalli et al., *CSD*, [2404.01292](https://arxiv.org/abs/2404.01292).

**Vendor documentation:**

- Midjourney — [Character Reference](https://docs.midjourney.com/docs/character-reference), [Style Reference](https://docs.midjourney.com/docs/style-reference), [V7 sref upgrade](https://updates.midjourney.com/style-references-for-v7/).
- Ideogram — [Character Reference](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/character-reference), [Style Reference](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/style-reference), [Generate v3 API](https://developer.ideogram.ai/api-reference/api-reference/generate-v3).
- Recraft — [API endpoints](https://www.recraft.ai/docs/api-reference/endpoints), [Styles API](https://www.recraft.ai/docs/api-reference/styles), [Color palettes in generation](https://recraft.ai/docs/using-recraft/color-palettes/using-color-palettes-in-generation), [Brand style consistency blog](https://recraft.ai/blog/new-tools-for-brand-style-consistency-and-control).
- OpenAI — [gpt-image-1.5 Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/).
- Google — [How to prompt Gemini 2.5 Flash Image](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/), [Gemini 2.5 Flash Image model card](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image).
- Black Forest Labs — [Flux.1 Tools (Redux, Fill, Depth, Canny)](https://blackforestlabs.ai/flux-1-tools/).

**Standards & tooling:**

- W3C DTCG Format Module 2025.10 — [designtokens.org/tr/2025.10/format](https://www.designtokens.org/tr/2025.10/format), [Final CG Report 2025-10-28](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/).
- Style Dictionary v4 — [styledictionary.com](https://styledictionary.com/).
- `@tokens-studio/sd-transforms` v2.0.3 — [npm](https://www.npmjs.com/package/@tokens-studio/sd-transforms), [GitHub](https://github.com/tokens-studio/sd-transforms).
- Figma Variables REST API — [developers.figma.com/docs/rest-api/variables-endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/).
- IBM Carbon — [`carbon-mcp`](https://github.com/carbon-design-system/carbon-mcp), [Feb 2026 launch post](https://medium.com/carbondesign/bringing-ibm-carbon-design-system-knowledge-into-ai-workflows-with-carbon-mcp-62c58162d160).
- Atlassian Design Tokens — [tokens overview](https://atlassian.design/tokens/design-tokens), [llms-tokens.txt](https://atlassian.design/llms-tokens.txt).
- GitHub Primer Primitives — [github.com/primer/primitives](https://github.com/primer/primitives).
- Shopify Polaris Tokens — [npm](https://www.npmjs.com/package/@shopify/polaris-tokens).

**Code / community:**

- tencent-ailab/IP-Adapter — [github.com/tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter).
- cubiq/ComfyUI_IPAdapter_plus — [github.com/cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus); [DeepWiki §5.1 style transfer workflows](https://deepwiki.com/cubiq/ComfyUI_IPAdapter_plus/5.1-style-transfer-workflows).
- InstantID/InstantID — [github.com/InstantID/InstantID](https://github.com/InstantID/InstantID).
- TencentARC/PhotoMaker — [github.com/TencentARC/PhotoMaker](https://github.com/TencentARC/PhotoMaker).
- ToTheBeginning/PuLID — [github.com/ToTheBeginning/PuLID](https://github.com/ToTheBeginning/PuLID).
- google/style-aligned — [github.com/google/style-aligned](https://github.com/google/style-aligned/).
- yardenfren1996/B-LoRA — [github.com/yardenfren1996/B-LoRA](https://github.com/yardenfren1996/B-LoRA); [b-lora.github.io](https://b-lora.github.io/B-LoRA/).
- InstantStyle project — [instantstyle.github.io](https://instantstyle.github.io/).
- learn2phoenix/CSD — [github.com/learn2phoenix/CSD](https://github.com/learn2phoenix/CSD).
- ostris/ai-toolkit (Flux LoRA trainer) — [github.com/ostris/ai-toolkit](https://github.com/ostris/ai-toolkit).
- HuggingFace — [DreamBooth LoRA PEFT docs](https://huggingface.co/docs/peft/v0.8.0/en/task_guides/dreambooth_lora), [IP-Adapter in diffusers](https://huggingface.co/docs/diffusers/main/en/using-diffusers/ip_adapter).
- jrosebr1/color_transfer (Reinhard) — [github.com/jrosebr1/color_transfer](https://github.com/jrosebr1/color_transfer).
- Pillow-LUT-tools — [pillow-lut-tools.readthedocs.io](https://pillow-lut-tools.readthedocs.io/).
- scikit-image `deltaE_ciede2000` — [scikit-image.org](https://scikit-image.org/docs/stable/api/skimage.color.html#skimage.color.deltaE_ciede2000).
- dembrandt/dembrandt — [github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt).
- Brandfetch MCP — [composio.dev/toolkits/brandfetch](https://composio.dev/toolkits/brandfetch/framework/claude-agents-sdk).
- fabriziosalmi/brandkit, mcpware/logoloom, ogimg/ogimg, xsukax/xsukax-Favicon-Generator, ionic-team/capacitor-assets, elegantapp/pwa-asset-generator — reference "one master → N assets" pipelines (see [15e §Reference Repos](./15e-full-asset-set-consistency.md)).

**Community guides:**

- Numonic — [MJ brand consistency guide](https://numonic.ai/blog/midjourney-brand-consistency-guide), [sref library](https://www.numonic.ai/blog/midjourney-style-reference-library).
- Midlibrary — [sref code deep dive](https://midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes); srefcodes.com catalog (4,800 v7 + 16,000 v6).
- Firecrawl — [brand style guide generator cookbook](https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook).
- CIEDE2000 — [Wikipedia](https://en.wikipedia.org/wiki/Color_difference#CIEDE2000); Reinhard et al., *Color Transfer between Images*, IEEE CG&A 2001 — [PDF](https://www.cs.tau.ac.il/~turkel/imagepapers/ColorTransfer.pdf).
