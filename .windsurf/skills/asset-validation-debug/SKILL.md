---
name: asset-validation-debug
description: Diagnose and repair asset-generation failures. Maps tier-0/1/2 validation codes (checkerboard, missing alpha, safe-zone violation, palette drift, garbled wordmark, low contrast) to concrete repair primitives (matte, inpaint, route change, seed sweep, composite). Applies a retry budget so Claude does not loop on hopeless regenerations.
trigger_phrases: [validation failed, checkerboard, alpha missing, palette drift, garbled wordmark, safe zone violation, asset repair, regenerate asset]
---

# Asset validation + repair

Triggered when `asset_validate()`, `asset_generate_*`, or `asset_save_inline_svg` returns warnings or errors. Do NOT loop on the same failure; follow the tree and respect the retry budget.

## Failure code → repair table

| Code | Origin | Repair primitive | Retry budget |
|---|---|---|---|
| `T0_CHECKERBOARD` | Imagen/Gemini rendering fake transparency | **Route change** → `gpt-image-1` (`background:"transparent"`), Ideogram v3 (`style:"transparent"`), Recraft V3 | 2 |
| `T0_ALPHA_MISSING` | RGB-only output on transparency-required asset | **Matte** via `asset_remove_background` (BiRefNet preferred, RMBG fallback) | 1 |
| `T0_DIMENSIONS` | wrong `width`/`height` API params | Fix params, regenerate | 1 |
| `T0_SAFE_ZONE` | subject bleeds outside platform center | Regenerate with explicit `"centered with 20% padding on all sides"` | 1 |
| `T0_FILE_SIZE` (SVG) | path count blows budget | `asset_save_inline_svg` → SVGO → K-means color reduction → vtracer | 1 |
| `T0_DCT_ENTROPY` | solid-color / NSFW-filter hit | Regenerate same params once; if repeats, change prompt | 1 |
| `T1_PALETTE_DRIFT` | model ignored hex constraint | Recraft with `controls.colors` **or** recolor post-process (K-means remap in LAB) | 1 |
| `T1_TEXT_MISSPELL` | diffusion garbled wordmark | **Drop text, composite SVG type** (retry Ideogram 3 if text-only asset) | 0 in-diffusion / 1 on Ideogram |
| `T1_LOW_CONTRAST` | pale palette at 16×16 or over background | Regenerate with explicit contrast instruction; else post-boost luminance | 2 |
| `T1_VQASCORE` | prompt-image alignment weak | Defect area <15% → **inpaint**; else full regenerate | 2 |
| `T2_BRAND_DRIFT` | style diverges from brand refs | Seed sweep (N=4, rank by CLIPScore + HPSv2); augment brand bundle | 1 |
| `T2_COMPOSITION` | off-center, cluttered, poor whitespace | **img2img** at low denoise (0.35) — preserves layout, fixes style | 1 |

When a budget exhausts: **stop retrying, report to user with diagnostic payload**. Do not loop.

## Diagnosis tree

```
asset_validate() returns warnings[]
   └─ for each warning:
      ├─ read code + affected tier
      ├─ classify failure class:
      │    local   (<15% image area)         → inpaint / post-process
      │    global  (style/palette-wide)      → route change / regenerate
      │    compositional (safe-zone/framing) → regenerate with centering prompt
      └─ select repair primitive (table above)
         ├─ apply
         ├─ re-validate
         └─ if same code fires again:
              ├─ retry_count < budget → try next primitive in fallback chain
              └─ retry_count ≥ budget → escalate to user
```

## Repair primitives — cost / ROI

| Primitive | Cost relative to 1× generation | When to choose |
|---|---|---|
| SVGO / palette remap / recolor | 0.01–0.05× | Deterministic fix, no model call |
| Matte (BiRefNet / RMBG) | 0.05× | alpha missing, no regeneration needed |
| Inpaint (masked edit) | 0.3× | defect area <15%, composition is right |
| img2img low-denoise | 1× | global style drift, preserve layout |
| ControlNet tile reinjection | 1.5× | preserve structure, regen detail |
| Full regenerate | 4× | architectural failure (checkerboard, wrong model) |
| Seed sweep (N=4) | 4× + selection | brand drift, pick best |

Prefer cheaper primitives first when they apply.

## Route-change rules for architectural failures

| Symptom | Current route | Change to |
|---|---|---|
| Checkerboard | Imagen / Gemini | `gpt-image-1` (first), Ideogram v3, Recraft V3 |
| Wordmark garbled | any diffusion | Ideogram 3 Turbo (first), `gpt-image-1` (second), composite SVG (always works) |
| Palette drift after 2 tries | any | Recraft (hard palette lock via `controls.colors`) |
| Subject misrendered | SDXL | Flux.1 [dev], `gpt-image-1` |
| Path count >200 on SVG | Recraft SVG | inline_svg mode + strict path budget |

## Proactive (pre-generation) checks

Prevent 70% of failures by validating the brief before calling `asset_generate_*`:

```
BRIEF:
☐ asset_type in closed enum (logo|app_icon|favicon|og_image|splash_screen|
                             illustration|icon_pack|sticker|hero|transparent_mark)
☐ subject noun concrete (not just adjectives)
☐ prompt ≥ 10 words OR brand_bundle provides style refs

TEXT-IN-IMAGE:
☐ quoted string ≤ 12 chars? else composite SVG type
☐ string > 5 words? force composite, skip diffusion-text path

PALETTE:
☐ brand.palette provided?
☐ hex codes ≤ 4 (over-constraint degrades Flux/SDXL)

TRANSPARENCY:
☐ transparency required + model in [Imagen, Gemini]?   → reroute
☐ transparency required + gpt-image-1?                  → set API `background:"transparent"`
☐ transparency required + Flux/SDXL?                    → plan post-matte

ROUTING:
☐ text required + model ≠ Ideogram/gpt-image-1?         → suggest reroute
☐ native SVG needed + model ≠ Recraft?                  → suggest Recraft or inline_svg
```

## Integration with systematic debugging

Four-phase loop per failure:

1. **Gather evidence** — read `validate` output; log model, seed, guidance, prompt_hash.
2. **Pattern analysis** — match to failure code; classify local/global/compositional.
3. **Hypothesis** — pick cheapest repair primitive from the matrix.
4. **Verify** — re-validate; if same code recurs, step down the route-change ladder, not the same primitive.

**Red flags (stop, escalate):**
- Same failure code 3+ times in a row
- Two different route changes failed for the same asset
- Cascading repairs (matte → vectorize → safe-zone) — brief is structurally wrong

## Evidence to log per pipeline boundary

```
GENERATION:   model, seed, guidance_scale, num_steps, prompt_hash, latency_ms, status
MATTE:        tool (birefnet|rmbg|difference), alpha_px_before, alpha_px_after, checker_probe
VECTORIZE:    path_count_before, path_count_after, color_count, tool (recraft|vtracer|potrace)
EXPORT:       variants[].{path, format, w, h, size_bytes}
VALIDATE:     tier0{...}, tier1{palette_de: x, vqa: y, ocr_lev: z}, tier2{sim: w}
```

## Research

- `docs/research/14-negative-prompting-artifacts/14b-artifact-taxonomy.md` — taxonomy + origin points
- `docs/research/14-negative-prompting-artifacts/14c-regenerate-vs-repair-strategies.md` — primitives, cost/time tradeoffs
- `docs/research/03-evaluation-metrics/3e-asset-specific-eval.md` — VQAScore, OCR, WCAG, CSD thresholds
- `docs/research/24-skills-for-p2a/06-validation-debug-skill.md` — full design spec
