---
name: brand-consistency
description: Maintain visual coherence across a multi-asset brand set (logo + app icon + favicon + illustrations). Builds BrandBundle (palette, typography, style refs, do-not list), enforces palette per model (Recraft `controls.colors`, Midjourney `--sref`, IP-Adapter, LoRA), validates style similarity with CSD and palette ΔE2000, and promotes accepted assets into the reference set so each new generation tightens the lock.
trigger_phrases: [brand bundle, brand consistency, brand kit, consistent style, style reference, brand palette, multi-asset brand, asset set]
---

# Brand consistency

Engaged when a user is generating more than one asset for the same brand, or when an existing `brand.json` / `brand.md` is in play. Wraps `asset_brand_bundle_parse`, `asset_generate_*`, and validation.

## BrandBundle shape

```yaml
palette:
  - { name: primary,   hex: "#0A1F44", usage: mark }
  - { name: accent,    hex: "#FF6B6B", usage: highlight }
  - { name: neutral,   hex: "#FAFAFA", usage: background }
typography:
  primary:   { family: "Geist Sans", fallback: "geometric sans-serif, bold" }
  secondary: { family: "Geist Mono", fallback: "monospace" }
style_refs: ["assets/brand/ref-1.png", "assets/brand/ref-2.png"]
lora:       "assets/brand/brand.safetensors"       # optional Flux/SDXL
sref_code:  "--sref 1234567890"                    # optional Midjourney
style_id:   "uuid-of-recraft-style"                # optional Recraft
do_not:     ["drop shadows", "gradients", "photorealism"]
logo_mark:  "assets/brand/mark.svg"                # canonical mark for composition
```

Call `asset_brand_bundle_parse({ source })` to build this from a `brand.md`, `brand.json`, DTCG `tokens.json`, or AdCP spec.

## Palette enforcement per model (strongest → weakest)

| Provider | Mechanism | ΔE2000 typical |
|---|---|---|
| Recraft V3/V4 | `controls.colors: ["#hex", …]` (hard enforcement) | 1–5 |
| Flux.2 | JSON `color_palette: ["#hex", …]` | 3–7 |
| Ideogram 3 | `style_reference_images` (palette swatch PNG) or `style_codes` | 5–10 |
| Midjourney | prose color words + `--sref <id> --sw 250–400` | 5–12 |
| gpt-image-1 | hex codes in prose, reinforced 2–3× | 5–15 |
| SDXL / Flux.1 | hex in prose + IP-Adapter palette swatch | 5–15 |
| Imagen / Gemini | prose + post-process recolor | 10–20 (post-fix required) |

**Fallback that always works:** K-means remap in LAB space + ΔE2000 validation. `asset_validate` flags drift; post-process recolors nearest palette entries.

## Style reference management

- **Canonical anchor** — one `.png` or `.svg` that defines the brand look. Required for consistency across >3 assets.
- **Accepted-asset promotion** — after an asset passes validation + user acceptance, add it to `style_refs[]` so subsequent generations see richer brand context.
- **CSD similarity score** — Contrastive Style Descriptor embedding comparison. Threshold: ≥0.72 pass, 0.60–0.72 review, <0.60 fail. Tier-2 validation.
- **Model-specific handles:**
  - Midjourney: `--sref <image>` (loose) vs `--cref <image>` (character lock) vs `--mref <image>` (object lock). Use `--sw 250` for tight style, `--sw 100` for loose brand.
  - Recraft: `style_id` is a persistent UUID bound to a trained brand style.
  - Flux + IP-Adapter: pass reference image; set `ip_adapter_weight: 0.7–0.9` for style, lower for just color.
  - SDXL + LoRA: trigger word in prompt + `lora_scale: 0.7–1.0`.

## LoRA training workflow (≥20-asset sets)

ROI breaks even at ~20 assets. For smaller sets, IP-Adapter or `--sref` is cheaper.

```
1. Collect 20+ accepted assets (logo, icons, illustrations) in the brand style.
2. Call trainBrandLora MCP tool (Replicate/Modal endpoint, ~$50–$200, ~2 hours).
3. Store the returned .safetensors path in BrandBundle.lora.
4. Set trigger word (e.g. "acme_brand") + lora_scale: 0.8–1.0 in subsequent Flux/SDXL generations.
5. Re-validate style similarity — should jump to CSD ≥0.85 vs references.
```

## Asset-type adaptation

Same brand expresses differently per asset. Honor the brand, but respect the medium:

| Asset type | Palette strictness | Composition | Transparency | Legibility target |
|---|---|---|---|---|
| `logo` | primary + 1 accent | centered, 80% safe zone | required RGBA | 32×32 minimum |
| `app_icon` | primary bg + 1–2 glyph colors | single central glyph, ~15% padding | opaque 1024² | 27×27 |
| `favicon` | 2–3 colors max | monogram/mark | SVG + ICO multi-res | 16×16 |
| `og_image` | full palette, brand typography | hero layout, headline area | opaque | 1200×630 at 1:1 scale |
| `illustration` | full palette | scene composition | often transparent | hero or empty-state |
| `icon_pack` | monocolor (currentColor) OR 2-tone | 24×24 grid, uniform stroke | SVG + alpha | consistent weight |

## Do-not list encoding

`BrandBundle.do_not[]` should never be forwarded as literal "no X" to Flux/Ideogram/Recraft. Translate per dialect:

```
do_not: ["drop shadows"]       → affirmative: "flat design, crisp edges"
do_not: ["gradients"]          → affirmative: "solid fills, flat colors"
do_not: ["photorealism"]       → affirmative: "flat vector illustration style"
do_not: ["rounded corners"]    → affirmative: "sharp geometric corners"
```

SDXL and Midjourney get literal negatives. Everyone else gets positive anchors.

## Typography consistency

Composite, don't generate. Web fonts via Satori for OG images; SVG `<text>` with font stack for favicons (if required); brand-font text in Figma/Illustrator for logo wordmarks.

- `typography.primary.fallback` is what the model sees in the prompt ("geometric sans-serif, bold") — not the font file name. Diffusion samplers cannot read Geist.
- For Flux.2: `typography: { font_class: "geometric sans-serif", weight: "bold" }` can be passed in the JSON schema.

## Validation across the set

After each generation, run in addition to normal tier-0/1:

```
tier_1 (set-aware):
  - palette ΔE2000 vs brand palette ≤ 10
  - CSD style similarity vs canonical anchor ≥ 0.72
  - stroke-width histogram consistent within set (σ ≤ 20%)

tier_2 (VLM-as-judge, if enabled):
  - "does this asset look like it comes from the same brand as [ref]?"
  - score 1–5; require ≥ 4 for acceptance
```

## Convergence detection

When to stop regenerating:

- 3 of the last 4 generated assets cleared ΔE ≤ 10 AND CSD ≥ 0.72 on the first try → brand bundle is tight.
- 2 of the last 3 required post-process recolor → bundle is loose; consider LoRA training or add more refs.
- Any asset required 3+ regenerations after acceptance → brand brief is ambiguous; ask user to clarify.

## Common mistakes

- Passing `do_not[]` literally to Flux (errors or weakens generation)
- Relying on prose color description alone for Ideogram (ΔE drifts >15)
- Skipping `style_id` on Recraft when brand lock is available (loses 50% of the value)
- Training a LoRA on <15 assets (overfits; produces artifacts)
- Never updating `style_refs[]` after accepted assets (lose compounding consistency)

## Research

- `docs/research/15-style-consistency-brand/15a-consistent-character-and-mascot.md` — character/mascot consistency
- `docs/research/15-style-consistency-brand/15b-style-transfer-sref-b-lora.md` — `--sref`, IP-Adapter, LoRA
- `docs/research/15-style-consistency-brand/15e-full-asset-set-consistency.md` — full-set propagation
- `docs/research/24-skills-for-p2a/05-brand-consistency-skill.md` — full design spec
