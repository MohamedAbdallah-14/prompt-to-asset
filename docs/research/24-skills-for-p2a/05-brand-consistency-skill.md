---
title: "Brand consistency skill design for P2A asset sets"
category: skills-for-p2a
date: 2026-04-21
---

# Brand Consistency Skill Design for P2A Asset Sets

## Executive Summary

P2A's `asset-enhancer` skill currently routes a single brief through the asset pipeline. The missing layer is a **brand-consistency skill** that teaches Claude how to maintain visual coherence when generating an *entire asset set* — a logo, app icon, favicon, OG image, 20 illustrations, and 100 UI icons, all for the same product. 

A brand is not one asset. A shipping product requires coordinated generation of an entire artifact family, conditioned on a shared identity: a canonical color palette, typography, a locked visual style, and a set of hard constraints ("no photorealism", "flat geometric only", "2px stroke weight on icons"). The research in angles 15a–15e and category 06 has identified the mechanisms that work per model (Recraft `style_id` + `controls.colors`, Midjourney `--sref` + `--cw`, Flux + IP-Adapter + LoRA, SDXL B-LoRA style-only). This skill document specifies:

1. **BrandBundle construction** — extracting and encoding palette, typography, style signals into a reusable `BrandBundle` JSON
2. **Per-model dialect rules** — which techniques work where (Recraft colors, Ideogram style codes, Midjourney sref, local IP-Adapter)
3. **Asset-type adaptation** — how the same brand is expressed differently for a 1024px app icon vs a 16px favicon vs a 100-icon set
4. **Style reference management** — pinning canonical anchors, versioning, drift detection
5. **Consistency validation** — color ΔE2000, CLIP style similarity (CSD), what passes and fails per asset type

This skill is **not** intended to replace `asset-enhancer`. Instead, it is a **meta-skill** that enhances `asset-enhancer` by teaching Claude to think in terms of brand tokens and consistency gates rather than one-off prompts.

---

## BrandBundle: Structure and Extraction

### Why BrandBundle Matters

When generating a 5–100 asset set, the user does not want to write 100 different prompts. They want to hand P2A a brand identity once, and have every downstream asset generation respect it. A `BrandBundle` is that identity, portable across models, versionable, and durable across changes.

Current state: P2A's `asset_brand_bundle_parse` tool can ingest:
- Native `brand.json` (custom format)
- DTCG tokens (W3C Design Token Community Group format, `$value` + `$type`)
- AdCP spec (color array, typography, restrictions)
- Markdown `brand.md` (hex colors, do-not lists)
- Raw text (extract hex + negatives)

**Gap:** the tool does **not** extract or encode:
- Semantic meaning of colors (which is "primary"? which is "accent"?)
- Style reference images
- LoRA trigger tokens
- IP-Adapter weights
- Aspect ratio constraints per asset type
- Typography fallback descriptions for models that can't read font names

### Proposed BrandBundle Shape

```json
{
  "$schema": "https://prompt-to-asset.dev/schemas/brand-bundle/v1.json",
  "metadata": {
    "name": "Acme Notes",
    "version": "1.0.0",
    "created": "2026-04-21T00:00:00Z",
    "hash": "bt_1a2b3c4d…"
  },
  "palette": {
    "primary": "#FF6A00",
    "secondary": "#0B1220",
    "accent": "#7C3AED",
    "surface": "#FAFAF7",
    "ink": "#0B1220"
  },
  "typography": {
    "display": {
      "family": "Söhne",
      "weight": 700,
      "description": "geometric sans-serif, slightly condensed, bold"
    },
    "body": {
      "family": "Inter",
      "weight": 400,
      "description": "clean humanist sans-serif"
    }
  },
  "style": {
    "descriptors": [
      "flat geometric",
      "high contrast",
      "generous negative space",
      "2px uniform stroke",
      "no gradients"
    ],
    "prose": "Minimal editorial illustration with flat geometric shapes, limited palette, subtle offset-overlap instead of drop shadows.",
    "anchors": {
      "primary_ref": {
        "uri": "s3://brand/style-anchor-01.png",
        "weight": 1.0,
        "recraft_style_id": "sty_acme_v1",
        "midjourney_sref": "3827461029",
        "ip_adapter_model": "ip-adapter-plus_sdxl"
      }
    },
    "lora": {
      "trigger": "acme illustration style",
      "uri": "s3://brand/lora/acme_v1.safetensors",
      "base_model": "flux.1-dev",
      "recommended_weight": 0.75
    }
  },
  "constraints": {
    "do_not": [
      "drop shadows",
      "gradients",
      "serif typography",
      "photorealism",
      "AI-typical glossy plastic"
    ],
    "required": [
      "flat geometric",
      "high contrast"
    ]
  },
  "logo_mark": {
    "svg_uri": "s3://brand/mark.svg",
    "png_uri": "s3://brand/mark-1024.png",
    "transparent": true,
    "never_regenerate": true,
    "usage": "composite_post_generation"
  },
  "asset_type_overrides": {
    "ui_icon": {
      "stroke_weight_px": 2.0,
      "grid": "24x24",
      "transparent": true,
      "monochrome": false,
      "palette_subset": ["ink", "primary"]
    },
    "app_icon": {
      "safe_zone_pct": 0.80,
      "corner_radius_px": 224,
      "transparent": false,
      "background": "surface"
    },
    "favicon": {
      "size": 32,
      "legibility_min": 0.85,
      "contrast_min_wcag": "AA"
    },
    "og_image": {
      "aspect": "1200x630",
      "typography_allowed": true,
      "composite_logo": "required"
    }
  }
}
```

### Extraction Strategy: From Brief to Bundle

The ideal workflow is **semi-manual**: Claude extracts structure where possible, but asks for clarification on semantic intent.

**Step 1: Palette extraction**
- Input: approved logo mark (PNG/SVG)
- Method: K-means clustering (k=5) in LAB space on opaque pixels
- Dedupe via ΔE2000 distance threshold (ΔE < 5 → merge)
- Validate: >2 colors, <12 colors (warn if outside)

**Step 2: Typography from brief/Figma**
- If Figma file: use Figma Variables API to extract text styles
- If brand.md: parse "Typography" section for font names
- If neither: ask user directly ("What fonts does the brand use?")
- Always add a `description` field — models cannot read "Söhne" but can read "geometric sans-serif, bold, crisp"

**Step 3: Style anchors from brief**
- User provides 1–3 reference images ("here's a hero illustration in brand style")
- Upload to Recraft, get back `style_id`
- Record the image URL for `--sref` + IP-Adapter
- Compute CLIP embedding for downstream CSD-based validation

**Step 4: Constraints and voice from brief**
- Parse "do not" list from brand guidelines (often a Figma doc)
- Ask: "Describe the visual voice in 2–3 words" (e.g., "calm, confident, minimal")
- Map voice to descriptors that will go into prompts

**Step 5: Asset-type overrides**
- Ask: "Are there asset-specific rules?" (e.g., "UI icons must be 2px stroke")
- Bake into the bundle's `asset_type_overrides` map

### BrandBundle Versioning

A bundle is immutable once committed:
- On any change (palette update, new style anchor), increment `version`
- Old versions are kept; the manifest records which version was used for each asset
- Critical: **do not silently update a bundle**. Pin the version in the prompt or the cache key.

---

## Palette Enforcement: Per-Model Dialect

No text-to-image model honors hex codes natively. The strategy is **layered enforcement**: generation-time nudging + post-process correction + validation.

### Recraft V4 (Current — V3 superseded)

> **Updated 2026-04-21:** Recraft V3 is superseded by V4 (released February 2026). Use V4 or V4 Vector for all new work. The `controls.colors` API is compatible with V4; verify exact parameter names via context7. V4 Pro Vector is the highest-fidelity native SVG option.

**Generation time:**
```python
controls = {
  "colors": [
    {"rgb": [255, 106, 0]},      # primary
    {"rgb": [11, 18, 32]},        # secondary
    {"rgb": [124, 58, 237]}       # accent
  ]
}
```
- Pass 2–5 colors, ordered by importance
- Combine with `style_id` (from BrandBundle) for dual-layer control
- Typical ΔE2000 result: 1–5 on dominant colors

**Post-process:** K-means remap in LAB space if drift detected

### Ideogram 3.0

**Generation time:**
- Use `style_codes` (8-char hex) if derived from reference images (fast)
- Alternately, pass `style_reference_images` (up to 3)
- Note: palette is **not** exposed as a first-class parameter; relay via prompt text ("primary brand color #FF6A00")

**Post-process:** CSD cosine similarity check + palette remap

### Midjourney V7 / V8

> **Updated 2026-04-21:** Midjourney V8 Alpha launched March 17, 2026. V8 sref numeric codes differ from V6/V7 codes — regenerate style codes against V8 for any bundle that captured codes under earlier versions. V8 has no official public API (no REST endpoint, SDK, or API key system); all generation is via web UI. `external_prompt_only` mode is the only valid P2A path for Midjourney.

**Generation time:**
- `--sref <numeric_code>` or `--sref <url>` pins the style
- `--sw 0..1000` controls weight (100 default; 250–400 for brand lock)
- Palette is **not** explicit; encode in prompt prose ("orange (#FF6A00) and deep charcoal (#0B1220)")
- Optional: `--cref` for character/object consistency if generating branded mascots

**Best practice:** Create one canonical reference image, upload to MJ, save the numeric code. Record in the bundle with the MJ version it was generated under (V7 vs V8). Codes are not interchangeable across major versions.

### SDXL / Flux + IP-Adapter

**Generation time:**
```python
# Create a horizontal palette swatch
swatch = create_palette_swatch(brand.palette.values(), height=128)

# Load IP-Adapter with style-transfer weight type
pipe.set_ip_adapter_scale(0.6, weight_type="style transfer precise")
image = pipe(
    prompt="...",
    ip_adapter_image=swatch,
    ip_adapter_scale=0.6
)
```
- swatch image biases color distribution
- `weight_type="style transfer precise"` (via ComfyUI) limits IP-Adapter to style blocks (4–6), not content
- Typical ΔE2000 result: 5–15 on top colors

**Post-process:** Always apply K-means remap in LAB + ΔE2000 validation

### Flux + LoRA (Brand-specific)

If a brand LoRA exists (via `brand.lora` in the bundle):
```python
# At inference:
prompt = f"a photo of {trigger} {concept}, {scene}. Brand palette: {palette_prose}."
# Load LoRA with weight 0.75
```
- LoRA was trained with prior-preservation, so the class concept ("illustration", "icon") is not collapsed
- Combine with text-based palette descriptions for reinforcement

### Post-Process Palette Remap (Fallback for all)

When any model still drifts:

```python
def remap_palette(image, brand_palette, tolerance_de=10):
    """Quantize image pixels to nearest brand color via ΔE2000."""
    # Convert image to LAB
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    pixels = lab.reshape(-1, 3)
    
    # K-means on the image
    kmeans = KMeans(n_clusters=8).fit(pixels)
    labels = kmeans.labels_.reshape(image.shape[:2])
    
    # Remap each cluster to nearest brand color
    remapped = np.zeros_like(pixels)
    for i in range(8):
        cluster_color = kmeans.cluster_centers_[i]
        best_brand_color = min(
            brand_palette,
            key=lambda c: delta_e_2000(cluster_color, c)
        )
        remapped[labels.flatten() == i] = best_brand_color
    
    # Convert back to RGB
    result = cv2.cvtColor(remapped.reshape(image.shape), cv2.COLOR_LAB2RGB)
    return result
```

**Validation:** after remap, measure ΔE2000 from each dominant cluster to the nearest brand hex. If all ≤ 5, pass. Otherwise, regenerate with a different seed.

---

## Style Reference Management

### Canonical Style Anchor

A **style anchor** is 1–4 curated images that define "the visual register of this brand." Not the subject (the logo), but the *feeling*: flat vs gradient, geometric vs organic, minimal vs busy.

**What makes a good anchor:**
- Mostly color swatches, texture samples, typography examples
- Minimal subject detail (avoid specific objects that will leak into generations)
- 1024×1024 PNG, representative of final assets
- Tagged with version (`halcyon-style-v1.0.0`)

**Workflow:**
1. User provides existing branded assets (illustrations, UI screens, marketing mockups)
2. Claude manually curates 3–5 that best represent the core visual identity
3. Upload to Recraft → get `style_id`
4. Generate test images with `--sref <anchor_url>` in Midjourney → record numeric code
5. Bake both into the bundle under `style.anchors.primary_ref`
6. Lock it: this reference now gates every downstream generation

### CSD Drift Detection

**Contrastive Style Descriptor** (angle 15b, Somepalli et al. 2024) is a CLIP-space embedding trained to preserve style and suppress content. Use it to validate that a generated asset is on-brand:

```python
from learn2phoenix.csd import StyleDescriptorModel

# Load anchor embedding once
anchor = load_image("style_anchor.png")
anchor_embedding = csd_model.encode_image(anchor)

# After each generation:
generated = load_generated_asset()
gen_embedding = csd_model.encode_image(generated)

similarity = cosine(anchor_embedding, gen_embedding)
if similarity < 0.72:  # empirically tuned threshold
    logger.warn(f"Asset below brand threshold: {similarity:.2f}")
    # Regenerate with bumped style weight or different seed
```

Thresholds (empirical, brand-dependent):
- `cos ≥ 0.72` → clearly on-brand
- `cos ∈ [0.60, 0.72]` → ambiguous, human review
- `cos < 0.60` → off-brand, regenerate

### Style Anchor Versioning

Anchors drift with model updates (MJ V6 → V7, Ideogram 3.0 → 3.1). Operational discipline:

1. **Pin model versions** in `bundle.provenance`: `"model_logo": "imagen-4-ultra@2026-02"`
2. **After every model update**, regenerate the golden-image set with the old bundle version
3. **Diff via CSD + manual review** before committing the new version
4. **Keep both** — the old anchor (bytes) and the old `sref` code (strings) — so you can rollback

---

## Asset-Type Adaptation Rules

The same brand expressed across 5–100 different artifacts. Adaptation is **not** a prompt change; it is a **slot template**.

### Slot Template Pattern

Each asset type owns a template that interpolates the BrandBundle:

```yaml
slot: ui_icon
asset_type: icon_pack
size: 24x24
grid_safe_area_px: 20
transparent: true
stroke_weight_px: 2.0
palette_subset: ["ink", "primary"]
template_prompt: |
  A monochrome icon representing {concept}, on transparent background.
  Two-pixel uniform stroke, crisp geometry, {brand.descriptors_join}.
  Brand colors: only {brand.palette.ink} and {brand.palette.primary}.
  Negative: {brand.do_not.join}
execution_model: ["flux.1-pro", "recraft-v3"]
validation:
  clip_score_min: 0.70  # icon legibility at 16px
  style_similarity_min: 0.72  # CSD to anchor
  palette_adherence: 0.90  # >90% of opaque pixels within ΔE < 10
  stroke_variance_max_px: 0.25  # within 0.25px of target
```

### Per-Type Rules

| Asset Type | Palette Strictness | Typography | Transparency | Composition | Validation Focus |
|---|---|---|---|---|---|
| **Logo Mark** | Strict (exact hex) | SVG composite, no raster type | Optional (usually yes) | Centered, safe zone 824px @ 1024 | Legibility, palette ΔE < 2 |
| **App Icon** | Strict | None (no text) | **No** (solid background) | Safe zone 80%, corner radius constant | 16×16 legibility after downscale |
| **Favicon** | Strict (≤3 colors) | None | Yes | Center + padding, extreme legibility | WCAG AA 18pt minimum contrast |
| **OG Image** | Moderate (5–7 colors OK) | SVG composite headline + tagline | No | Logo + scene composition | Text rendering fidelity, no watermark |
| **UI Icon** (24×24) | Strict (2–3 colors) | None | Yes | Center, 2px stroke uniform | Stroke histogram, all pixels on grid |
| **Illustration** (20–50 assets) | Moderate | Optional (typography only in scene) | Varies | Full scene composition | Style similarity (CSD), palette ≤ 5 dominant |

### Implementation: Cascade Rules

```typescript
function adaptBrandToAssetType(
  bundle: BrandBundle,
  assetType: "logo" | "app_icon" | "favicon" | "og_image" | "ui_icon" | "illustration"
): AdaptedBrand {
  const overrides = bundle.asset_type_overrides[assetType];
  return {
    ...bundle,
    palette: overrides.palette_subset
      ? Object.fromEntries(
          overrides.palette_subset.map(k => [k, bundle.palette[k]])
        )
      : bundle.palette,
    style: {
      ...bundle.style,
      descriptors: [
        ...bundle.style.descriptors,
        ...(overrides.style_additions || [])
      ].filter(d => !(overrides.style_removals || []).includes(d))
    },
    constraints: {
      ...bundle.constraints,
      do_not: [
        ...bundle.constraints.do_not,
        ...(overrides.do_not_additions || [])
      ]
    }
  };
}
```

---

## Typography Consistency

### The Problem

Wordmarks must use the brand font. But image models:
1. Cannot reliably render text (especially long strings)
2. Do not know proprietary fonts ("Söhne" → confusion)
3. Drift the text kerning across generations

### The Solution: Composite, Don't Generate

For any asset with required text (logo, OG card, social tiles):

1. **Generate the graphic** (mark, background scene) without text
2. **Composite the text layer separately** using a web-font renderer (Satori, Playwright, Canvas API, headless Chrome)
3. **Use the exact brand font** at exact weight/size
4. **Stack onto the generated base**

Example for OG image:

```typescript
// 1. Generate just the background + hero illustration
const heroBg = await t2i({
  prompt: "minimal illustration of {concept}, brand style",
  aspect: "1200x630",
  style_id: bundle.style.recraft_style_id,
  controls: { colors: brand.palette.slice(0, 3) }
});

// 2. Render typography in brand font via Satori
const textLayer = await satori({
  element: (
    <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "Söhne" }}>
      {productName}
    </div>
  ),
  width: 1200,
  height: 630,
  fonts: [
    { name: "Söhne", weight: 700, data: await loadFont("Söhne") }
  ]
});

// 3. Composite
const final = composite(heroBg, textLayer, { x: 100, y: 500, blend: "normal" });
```

### Bundle Typography Fields

```json
{
  "typography": {
    "display": {
      "family": "Söhne",
      "weight": 700,
      "size": 48,
      "line_height": 1.2,
      "description": "geometric sans-serif, slightly condensed, bold",
      "fallback": "Inter",
      "web_font_url": "https://fonts.googleapis.com/css2?family=Inter:wght@700"
    }
  }
}
```

The `description` field is what goes into prompts (e.g., "headline in a crisp geometric sans-serif, Inter or Söhne, bold"). The `web_font_url` + `fallback` are for post-generation compositing.

---

## Do-Not List: From Restriction to Positive Anchor

A do-not list ("no drop shadows", "no photorealism") needs to be **rewritten as positive constraints** for each model dialect.

### Mapping: Do-Not → Positive Anchors

| Do-Not Restriction | Positive Anchor (Recraft) | Positive Anchor (Midjourney) | Positive Anchor (SDXL) | Positive Anchor (Prompt Text) |
|---|---|---|---|---|
| "no drop shadows" | Implicit (flat style) | No shadow effects | no drop shadow, flat lighting | "flat geometric, no shadows" |
| "no gradients" | Implicit (fill style) | Flat color fill | flat solid colors, no gradients | "solid flat colors" |
| "no photorealism" | style="vector_illustration" | `--style raw` or ref to flat anchor | style "vector illustration" | "flat illustration, not photorealistic" |
| "no serif" | Implicit (style anchor) | negative: "serif" in prompt | negative_prompt: "serif, serif font" | "sans-serif typography only" |
| "no AI glossy plastic" | style_id trained without it | `--style raw` + style anchor | explicit negative prompt | "natural matte finish, not glossy 3D render" |

### Do-Not Encoding in BrandBundle

```json
{
  "constraints": {
    "do_not": [
      "drop shadows",
      "photorealistic skin pores",
      "gradients",
      "serif typography"
    ],
    "do_not_translated": {
      "recraft": {
        "style": "vector_illustration",
        "prompt_additions": "flat solid colors, no shadows or gradients"
      },
      "midjourney": {
        "negative_prompt": "serif, serif font, drop shadow, gradient, photorealistic",
        "sref_weight_adjustment": 0.9
      },
      "sdxl": {
        "negative_prompt": "serif, serif font, drop shadow, gradient, shiny plastic, AI typical glossy"
      }
    }
  }
}
```

### The Prompt Rewriter's Job

The asset-enhancer's rewriter (currently in `packages/mcp-server/src/rewriter.ts`) must:

1. Read `bundle.constraints.do_not_translated[target_model]`
2. Inject those negatives into the dialect-correct field
3. For Recraft, pass `style` + `controls`
4. For Midjourney, append to the prompt and set `--sw` higher
5. For SDXL, build the `negative_prompt` and weight IP-Adapter lower

---

## Consistency Validation: What Passes, What Fails

### Three-Tier Validation

**Tier 0 (Deterministic, always):**
- Dimensions match the slot (24×24 for UI icons, 1024×1024 for app icon, etc.)
- Alpha channel is present if required
- No checkerboard pattern (FFT detection)
- File size within budget
- Palette is not all grayscale (early warning of style model failure)

**Tier 1 (Metric, on first asset or user request):**
- **Palette ΔE2000:** all opaque pixels within ΔE < 10 of nearest brand color (after K-means clustering). Fail if >20% of pixels exceed threshold.
- **Style similarity (CSD):** cosine ≥ 0.72 to brand anchor. Warn at [0.60, 0.72], fail < 0.60.
- **Stroke width (UI icons):** histogram of non-zero-alpha pixel distances from centerline. Must be within ±0.25 px of target. Fail if >5% outliers.
- **Legibility (favicon):** CLIP VQA score for the icon's concept at 16×16. Threshold ≥ 0.70.
- **OCR accuracy (OG image):** if text is overlaid, Levenshtein distance between detected text and expected. Fail if > 2 chars off.

**Tier 2 (VLM, on failure or user request):**

> **Updated 2026-04-21:** Claude model naming: use claude-sonnet-4-6 (or claude-opus-4-6) for VLM rubric calls. The claude-sonnet-4-20250514 / claude-opus-4-20250514 snapshots retire June 15, 2026.

- Call claude-sonnet-4-6 (current) against asset-type rubric: "Does this app icon look like it belongs to the same brand family as [anchor image]? Rate 1–5."
- Used to catch subtle drift (slightly off corner radius, line weight creep, composition imbalance)

### Validation Gate Example (UI Icon)

```python
def validate_ui_icon(
    image: Image,
    bundle: BrandBundle,
    concept: str
) -> ValidationResult:
    adapted = adaptBrandToAssetType(bundle, "ui_icon")
    
    # Tier 0
    checks = [
        ("dimension", image.size == (24, 24)),
        ("alpha", image.mode == "RGBA"),
        ("checkerboard", not has_checkerboard(image)),
    ]
    
    # Tier 1
    palette_colors = extract_dominant_colors(image, k=4)
    palette_deltas = [
        min(delta_e_2000(c, bc) for bc in adapted.palette.values())
        for c in palette_colors
    ]
    checks.append(("palette_delta_e", all(d < 10 for d in palette_deltas)))
    
    style_embed = csd_model.encode_image(image)
    anchor_embed = csd_model.encode_image(adapted.style.anchors.primary_ref)
    style_sim = cosine(style_embed, anchor_embed)
    checks.append(("style_similarity", style_sim >= 0.72))
    
    strokes = measure_stroke_widths(image)
    stroke_ok = abs(strokes.mean() - 2.0) < 0.25
    checks.append(("stroke_width", stroke_ok))
    
    # Legibility: CLIP score for the concept at downscaled size
    legibility_score = vqa_score(image.resize((16, 16)), concept)
    checks.append(("legibility", legibility_score >= 0.70))
    
    # Aggregate
    failures = [k for k, v in checks if not v]
    status = "pass" if not failures else ("warn" if len(failures) == 1 else "fail")
    
    return ValidationResult(
        status=status,
        checks=dict(checks),
        failures=failures,
        recommendation="regenerate with seed +1" if status == "fail" else None
    )
```

### Failure Modes and Remedies

| Failure | Cause | Remedy |
|---|---|---|
| Palette drift (ΔE > 20) | Model ignores color conditioning | Regenerate with IP-Adapter weight ↑ or post-process remap |
| Style mismatch (CSD < 0.60) | Model default style overpowers anchor | Regenerate with `--sw` ↑, IP-Adapter weight ↑, or swap to style-only adapter (B-LoRA, InstantStyle) |
| Stroke creep (24px icon becomes 2.5px) | Scaling/sampling artifact | Regenerate with same seed; if persistent, re-normalize SVG post-process |
| Legibility collapse at 16px | Too much detail | Regenerate with explicit "ultra-minimal, bold shapes, no fine detail" |
| Checkerboard (transparency fail) | Wrong model or param | Re-route to Recraft or apply BiRefNet matte |
| Character/mascot drift | Identity adapter weight too low | Swap anchor, increase LoRA weight, or use DreamBooth-LoRA instead of IP-Adapter |

---

## Skill API: Public Surface

### Tool: `brand_consistency_init`

Extract a BrandBundle from a brief or existing assets.

```typescript
export async function brandConsistencyInit(input: {
  brief?: string;           // brand description, design goals
  logo_mark?: { uri: string; format: "png" | "svg" };
  existing_assets?: Array<{ uri: string; role: "hero" | "icon" | "reference" }>;
  brand_json?: string;      // if already structured
}): Promise<{
  bundle: BrandBundle;
  hash: string;
  warnings: string[];
  human_review_required: boolean;
  review_prompts?: string[];  // if semantic intent unclear
}>
```

### Tool: `brand_consistency_adapt`

Specialize a BrandBundle for a specific asset type.

```typescript
export async function brandConsistencyAdapt(input: {
  bundle: BrandBundle;
  asset_type: "logo" | "app_icon" | "favicon" | "og_image" | "ui_icon" | "illustration";
  concept?: string;         // the specific thing being generated ("search icon")
}): Promise<{
  adapted_bundle: AdaptedBrand;
  prompt_prefix: string;
  prompt_suffix: string;
  model_recommendations: Array<{ model: string; confidence: number }>;
  validation_rules: ValidationRules;
}>
```

### Tool: `brand_consistency_validate`

Run a generated asset against the brand bundle.

```typescript
export async function brandConsistencyValidate(input: {
  image: { uri: string; format: string };
  asset_type: string;
  bundle: BrandBundle;
  concept?: string;
  tier?: 0 | 1 | 2;         // validation depth
}): Promise<{
  status: "pass" | "warn" | "fail";
  checks: Record<string, boolean>;
  failures: string[];
  metrics: {
    palette_delta_e: number;
    style_similarity: number;
    stroke_width_variance?: number;
    legibility_score?: number;
  };
  recommendation?: string;
}>
```

### Tool: `brand_consistency_embed`

Get the CSD embedding of an image for style-similarity computation.

```typescript
export async function brandConsistencyEmbed(input: {
  image_uri: string;
  use_cache?: boolean;
}): Promise<{
  embedding: number[];       // 512-dim CSD vector
  image_hash: string;
}>
```

---

## Example: Full Workflow

### Scenario: Generate a 5-asset set for "Halcyon" (weather app)

**Step 1: Initialize brand**

```
Claude: "I found a brand.json for Halcyon. Let me extract the bundle."

Claude calls: asset_brand_bundle_parse({ source: brand.json })
Returns: BrandBundle with palette [#2563eb, #0ea5e9, #f8fafc], style_refs, do_not list
Claude: "✓ Bundle extracted. 4 colors, minimal style confirmed."
```

**Step 2: Generate logo mark**

```
Claude: "Let's start with the logo. I'll use Recraft for the best color control."

Claude calls: asset_generate_logo({
  brief: "minimal flat weather app mark, calm confident, sunrise-through-glass",
  mode: "api",
  bundle: brand_bundle
})
Returns: 1024×1024 PNG + SVG
Claude calls: brand_consistency_validate({
  image_uri: <result>,
  asset_type: "logo",
  bundle: brand_bundle
})
Returns: pass (palette ΔE=1.2, style_sim=0.88)
Claude: "✓ Logo approved. Hash: bt_1a2b3c4d. Moving to derivatives."
```

**Step 3: Adapt bundle and generate app icon**

```
Claude calls: brand_consistency_adapt({
  bundle: brand_bundle,
  asset_type: "app_icon"
})
Returns: adapted_bundle with safe_zone_pct=0.80, corner_radius_px=224, ...
Claude calls: asset_generate_app_icon({
  brief: "Halcyon weather app icon, brand style",
  mode: "api",
  bundle: brand_bundle,
  adapted_rules: adapted_bundle
})
Returns: 1024 master + platform variants
Claude calls: brand_consistency_validate({
  image_uri: <1024 master>,
  asset_type: "app_icon",
  tier: 1
})
Returns: pass
Claude: "✓ App icon approved."
```

**Step 4: Batch generate UI icons**

```
Claude: "Now 24 UI icon concepts. Running in parallel with CSD validation gate."

Claude loops over ["search", "settings", "favorites", ...]:
  Claude calls: brand_consistency_adapt({
    bundle: brand_bundle,
    asset_type: "ui_icon",
    concept: concept
  })
  Claude calls: asset_generate_ui_icon({
    brief: f"{concept} icon, minimal 2px stroke, flat",
    bundle: brand_bundle
  })
  Claude calls: brand_consistency_validate({
    image_uri: <result>,
    asset_type: "ui_icon",
    tier: 1
  })
  If status == "fail":
    Claude: "Regenerating with seed +1..."
    Claude retries up to 5 times
  If status == "pass":
    Claude: "✓ {concept} icon approved."

Claude: "✓ Icon set complete. 24/24 on-brand."
```

**Step 5: Validate set cohesion**

```
Claude: "Final validation: do all 30 assets read as one brand?"

Claude calls: render_asset_grid({
  assets: [logo, app_icon, favicons, ui_icons],
  size_px: 64
})
Claude: "Visual inspection at 64px. All on-brand, no outliers detected."
Claude: "✓ Asset set generation complete."
```

---

## Integration with asset-enhancer

The brand-consistency skill does **not** replace `asset-enhancer`. Instead:

1. **asset-enhancer** remains the core skill for single-asset generation (prompt classification, routing, execution modes, post-processing)
2. **brand-consistency** is a **pre/post-processing layer** that:
   - **Before generation:** extracts bundle from brief, adapts to asset type, injects style/palette/constraints into the prompt
   - **After generation:** validates against bundle, flags drift, suggests regeneration
   - **Across sets:** maintains a manifest linking assets to bundle versions and seeds for reproducibility

Example enhanced flow:

```
brief
  ↓
asset_brand_consistency_init()      ← NEW: extract/confirm bundle
  ↓ (user confirms or edits)
bundle_adapted = asset_brand_consistency_adapt(asset_type)
enhanced_prompt = bundle_adapted.prompt_prefix + user_brief + bundle_adapted.prompt_suffix
  ↓
asset_enhance_prompt(enhanced_prompt)
  ↓
asset_generate_<type>(enhanced_prompt, mode)
  ↓
validation_result = asset_brand_consistency_validate(result, bundle)
  ↓
if validation_result.status == "fail":
  regenerate with bumped seed
else:
  cache with manifest entry
```

---

## Current Gaps in P2A's Implementation

### What `asset_brand_bundle_parse` Does

✓ Parse JSON, DTCG, AdCP, markdown, raw text
✓ Extract hex colors from text
✓ Deduplicate colors
✓ Extract "do not" lists from markdown
✓ Hash the bundle for caching

### What It Doesn't Do

✗ Extract palette semantics (which color is "primary"?)
✗ Ingest style references (images, URLs, LoRA paths)
✗ Encode IP-Adapter models or weights
✗ Per-asset-type constraints (stroke weight for icons, safe zone for app icon)
✗ Model-specific dialect translation (Recraft controls.colors vs Midjourney --sref)
✗ Validation gates (CSD similarity, ΔE2000, legibility scoring)
✗ Typography fallback descriptions for models
✗ LoRA trigger encoding
✗ Versioning + manifest tracking
✗ Drift detection and retry logic

### Proposed Extensions

1. **Expand `BrandBundle` type** in `packages/mcp-server/src/types.ts` to include style, lora, ip_adapter, asset_type_overrides
2. **New tool: `brand_consistency_adapt`** — apply bundle to a specific asset type
3. **New tool: `brand_consistency_validate`** — Tier 0/1/2 validation with CSD, ΔE2000, stroke histogram
4. **Extend rewriter.ts** — inject bundle fields into model-specific dialect per the mapping tables above
5. **New pipeline stage** — post-process palette remap (K-means in LAB + ΔE2000 nearest-neighbor)
6. **Manifest tracking** — record which bundle version + seed produced each asset, enable re-runs
7. **CSD model integration** — load the `learn2phoenix/CSD` ViT-L at startup, cache embeddings

---

## Example BrandBundle JSON (Complete)

```json
{
  "$schema": "https://prompt-to-asset.dev/schemas/brand-bundle/v1.json",
  "metadata": {
    "name": "Acme Notes",
    "version": "1.0.0",
    "created": "2026-04-21T10:00:00Z",
    "hash": "bt_acme_01a2b3c4",
    "provenance": {
      "source": "https://figma.com/file/abc123/Acme-Brand-System",
      "extracted_by": "brand_consistency_init",
      "extracted_at": "2026-04-21T10:00:00Z"
    }
  },
  
  "palette": {
    "primary": "#FF6A00",
    "secondary": "#0B1220",
    "accent": "#7C3AED",
    "surface": "#FAFAF7",
    "ink": "#0B1220",
    "muted": "#8A8A8A"
  },
  
  "typography": {
    "display": {
      "family": "Söhne",
      "weight": 700,
      "size": 48,
      "description": "geometric sans-serif, bold, slightly condensed, crisp",
      "fallback": "Inter",
      "google_fonts_fallback": "https://fonts.googleapis.com/css2?family=Inter:wght@700"
    },
    "body": {
      "family": "Inter",
      "weight": 400,
      "size": 16,
      "description": "clean humanist sans-serif",
      "fallback": "system sans-serif"
    }
  },
  
  "style": {
    "prose": "Minimal editorial illustration with flat geometric shapes, limited palette, 2px uniform strokes, generous negative space, soft paper background, subtle offset-overlap instead of drop shadows. Calm, confident, never kitschy.",
    "descriptors": [
      "flat geometric",
      "high contrast",
      "minimal",
      "editorial",
      "2px uniform stroke",
      "generous negative space",
      "soft paper texture",
      "no gradients"
    ],
    "voice": {
      "mood": ["calm", "confident", "premium"],
      "visual_register": ["editorial", "minimal", "high-contrast"],
      "avoid_register": ["playful cartoon", "corporate memphis", "glossy 3D", "photorealism"]
    },
    "anchors": {
      "primary_ref": {
        "uri": "s3://brand-assets/acme/style-anchor-primary.png",
        "format": "png",
        "width": 1024,
        "height": 1024,
        "role": "primary_style_reference",
        "recraft_style_id": "sty_acme_01",
        "midjourney_sref_code": "3827461029",
        "weight": 1.0,
        "csd_embedding_cached": true
      }
    },
    "lora": {
      "enabled": true,
      "name": "acme_brand_v1",
      "uri": "s3://brand-assets/acme/lora/acme_v1.safetensors",
      "trigger": "acme editorial style",
      "base_model": "flux.1-dev",
      "recommended_weight": 0.75,
      "notes": "Trained with prior-preservation on 20 curated brand illustrations."
    },
    "ip_adapter": {
      "enabled": true,
      "model": "ip-adapter-plus_sdxl",
      "reference_image": "s3://brand-assets/acme/style-anchor-primary.png",
      "weight": 0.6,
      "weight_type": "style transfer precise",
      "end_at": 0.7
    }
  },
  
  "constraints": {
    "do_not": [
      "drop shadows",
      "gradients",
      "photorealism",
      "serif typography",
      "AI-typical glossy plastic",
      "competitor logos"
    ],
    "required": [
      "flat geometry",
      "high contrast",
      "minimal composition"
    ],
    "do_not_translated": {
      "recraft": {
        "style": "vector_illustration",
        "controls": {
          "prompt_additions": "flat colors, no shadows, no gradients"
        }
      },
      "midjourney": {
        "negative_prompt": "serif, serif font, drop shadow, gradient, shiny plastic, photorealistic",
        "sref_weight_suggestion": 250
      },
      "sdxl": {
        "negative_prompt": "serif, drop shadow, gradient, shiny, glossy plastic, photorealistic skin pores, AI typical"
      }
    }
  },
  
  "logo_mark": {
    "svg_uri": "s3://brand-assets/acme/logo/mark.svg",
    "png_1024_uri": "s3://brand-assets/acme/logo/mark-1024.png",
    "transparent": true,
    "safe_zone_pct": 0.80,
    "never_regenerate": true,
    "usage": ["composite_post_generation", "reference_for_style"]
  },
  
  "asset_type_overrides": {
    "logo": {
      "aspect": "1:1",
      "transparent": true,
      "safe_zone_pct": 0.80,
      "palette_tolerance_de": 2,
      "style_similarity_min": 0.80
    },
    "app_icon": {
      "size": 1024,
      "safe_zone_pct": 0.80,
      "corner_radius_px": 224,
      "transparent": false,
      "background_color": "surface",
      "legibility_min_wcag": "AA",
      "validation": {
        "clip_score_min": 0.75,
        "style_similarity_min": 0.75
      }
    },
    "favicon": {
      "size": 32,
      "transparent": true,
      "contrast_min_wcag": "AA",
      "palette_max_colors": 3,
      "validation": {
        "legibility_score_min": 0.85
      }
    },
    "og_image": {
      "aspect": "1200x630",
      "transparent": false,
      "background_color": "surface",
      "typography_allowed": true,
      "logo_placement": "top_left",
      "validation": {
        "text_rendering_fidelity": true,
        "watermark_detection": "reject_if_present"
      }
    },
    "ui_icon": {
      "grid": "24x24",
      "safe_area_px": 20,
      "transparent": true,
      "stroke_weight_px": 2.0,
      "palette_subset": ["ink", "primary"],
      "monochrome": false,
      "validation": {
        "clip_score_min": 0.70,
        "style_similarity_min": 0.72,
        "stroke_variance_max_px": 0.25,
        "palette_adherence_min_pct": 0.90
      }
    },
    "illustration": {
      "aspect": "4:3",
      "transparent": false,
      "background_color": "surface",
      "typography_allowed": true,
      "palette_subset": null,
      "validation": {
        "style_similarity_min": 0.70,
        "palette_adherence_min_pct": 0.80
      }
    }
  }
}
```

---

## References

- Angle 15a: Consistent character / mascot / product across images — DreamBooth, Textual Inversion, LoRA, IP-Adapter, InstantID, PhotoMaker, MJ --cref, Ideogram character ref, Flux Redux, gpt-image-1, Gemini 2.5 Flash
- Angle 15b: Style (not subject) transfer — MJ --sref, IP-Adapter style, StyleAligned, B-LoRA, Visual Style Prompting
- Angle 15c: Brand color palette enforcement — Recraft color API, IP-Adapter color, post-generation palette remap, LUTs
- Angle 15d: Machine-readable brand bundle — DTCG, Figma Variables, design tokens
- Angle 15e: Full asset set consistency — one brand, many artifacts
- Category 06: SDXL / Flux / Stable Horde — LoRA training, IP-Adapter, ComfyUI integration
- Category 07: Midjourney / Ideogram / Recraft — dialect rules, --sref, style_id, style codes
- `asset-enhancer` skill spec — routing, rewriting, three execution modes
- IBM Carbon MCP, Atlassian `llms-tokens.txt` — precedent for brand bundles as machine-readable structures

