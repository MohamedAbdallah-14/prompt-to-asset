---
title: "MCP + API integration skill design for P2A"
category: skills-for-p2a
date: 2026-04-21
---

# MCP + API integration skill design for P2A

## Executive Summary

The `prompt-to-asset` MCP server exposes 24 tools spanning three execution modes (inline_svg, external_prompt_only, api), eight asset types, and fifteen image-generation providers. Claude often skips orchestration steps or calls tools in the wrong order, producing incomplete or invalid results. This spec defines a dedicated Claude Code skill (`mcp-image-api`) that enforces the correct call sequence, handles branching logic, and ensures round-trip completion — turning the current ad-hoc tool use into a reliable, auditable pipeline.

## Problem Statement: Five Cardinal Failure Modes

1. **Missing capabilities check.** Claude calls `asset_generate_logo` without first checking what's available via `asset_capabilities()`. Result: mode selection fails or returns "api unavailable" when inline_svg was actually viable.

2. **Skipped enhance → generation gap.** Claude skips `asset_enhance_prompt` and calls a generator directly with a user brief. Result: missing clarifying questions, wrong model routing, prompt not rewritten to target dialect.

3. **Incomplete clarifying-questions loop.** `asset_enhance_prompt` returns `clarifying_questions[]`, but Claude ignores them and proceeds anyway. Result: generation assumes wrong asset dimensions, text length, or brand intent.

4. **Orphaned SVG mode.** Claude emits `<svg>…</svg>` in inline_svg mode but never calls `asset_save_inline_svg`. Result: the user sees the code block but no persisted files, no variant exports, no PWA manifest.

5. **Wrong mode preselection.** Claude picks `api` mode immediately (requires API key) without trying `inline_svg` (zero key) or `external_prompt_only` (web UI paste, zero key). Result: unnecessary API costs, user friction, slow UX.

## The 24 Tools: Role Summary

| Phase | Count | Tools | Gating |
|---|---|---|---|
| **Reconnaissance** | 6 | `asset_capabilities`, `asset_enhance_prompt`, `asset_brand_bundle_parse`, `asset_models_list`, `asset_models_inspect`, `asset_doctor` | Call first; read-only |
| **Generation (3 modes)** | 8 | `asset_generate_logo`, `asset_generate_app_icon`, `asset_generate_favicon`, `asset_generate_og_image`, `asset_generate_illustration`, `asset_generate_splash_screen`, `asset_generate_hero`, + implicit mode picker | One per asset type; mode-driven |
| **Persist (Round-trip)** | 2 | `asset_save_inline_svg`, `asset_ingest_external` | MUST call after inline_svg or external_prompt |
| **Post-gen Repair** | 3 | `asset_remove_background`, `asset_vectorize`, `asset_upscale_refine` | Optional; triggered by validation failure |
| **Optional Post-gen** | 1 | `asset_validate` | If user asks "check quality"; tier-1 metrics |
| **Optional Export** | 1 | `asset_export_bundle` | If user wants platform fan-out from a master |
| **One-time Setup** | 1 | `asset_init_brand` | Call once per project |
| **Utility** | 1 | `asset_train_brand_lora` | Advanced; requires user-owned endpoint |
| **Utility** | 1 | `asset_sprite_sheet` | Post-icon-pack; frame packing |
| **Utility** | 1 | `asset_nine_slice` | Post-UI-element; scalable slicing |

**Total: 25 tools** (1 generator per asset type × 8 types). The skill orchestrates them in a DAG with three entry paths: inline_svg, external_prompt_only, api.

## Orchestration Flow — Correct Sequence

### Phase 1: Reconnaissance (Mandatory)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: asset_capabilities(asset_type?)                         │
│   Input:  asset_type ∈ {logo, app_icon, favicon, ...} (optional)│
│   Output: {                                                      │
│     modes_available: ["inline_svg", "external_prompt_only", ...], │
│     free_api: { routes: [{provider, url, description}, ...] },  │
│     paid_providers_available: ["openai", "ideogram", ...],       │
│     svg_brief_available: boolean,                               │
│     native_dependencies: { sharp, vtracer, potrace, ... }       │
│   }                                                              │
│   Read-only; no network; O(1)                                    │
│   Gate: Call before every generation                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: asset_brand_bundle_parse(source?) [OPTIONAL]            │
│   Input:  brand.json path or DTCG/AdCP text                     │
│   Output: BrandBundle { palette, style_refs, lora, style_id, ...}│
│   Read-only; no network; O(1)                                    │
│   Gate: Only if user has brand file                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: asset_enhance_prompt(brief, asset_type?, brand_bundle?)│
│   Input:  Plain-English brief (user or refined)                 │
│   Output: AssetSpec {                                            │
│     asset_type,                                                  │
│     rewritten_prompt,                                            │
│     target_model,                                                │
│     fallback_models: ["model2", "model3"],                       │
│     params: { seed, ...model-specific },                         │
│     modes_available: ["inline_svg", "api", ...],                 │
│     svg_brief?: { viewBox, palette, path_budget, skeleton },    │
│     paste_targets?: [{ name, url, notes }],                      │
│     clarifying_questions?: [{ id, header, question, options[] }], │
│     warnings: ["classification: ...", "routing: ..."]            │
│   }                                                              │
│   Read-only; no network; idempotent                              │
│   Gate: MUST call before mode selection or generation            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────────────┐
        │ BRANCH: Clarifying questions present?                │
        └─────────────────────────────────────────────────────┘
              │                                    │
            YES                                   NO
              ↓                                    ↓
    ┌──────────────────────┐         ┌──────────────────────────────┐
    │ BLOCK GENERATION     │         │ PROCEED TO MODE SELECTION    │
    │ Ask user via AskUser │         │                              │
    │ (1-per-question)     │         │ (brief is unambiguous)       │
    │ Update brief/flags   │         └──────────────────────────────┘
    │ with answers         │                      ↓
    │ Loop back to Step 3  │ ┌────────────────────────────────────┐
    │ with refined brief   │ │ Rank modes by cost:                │
    │ (Qs usually vanish   │ │   1. inline_svg (zero key)         │
    │  on 2nd call)        │ │   2. external_prompt (zero key)    │
    │                      │ │   3. api (requires $ key)         │
    └──────────────────────┘ │                                     │
                             │ Offer user the three options        │
                             │ (all are in modes_available)        │
                             │ User picks one                      │
                             └────────────────────────────────────┘
```

### Phase 2: Generation (Mode-Specific)

#### Path A: Inline SVG (User Writes)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 4a: asset_generate_{logo|favicon|...}(brief, mode="inline_svg") │
│   Input:  brief, mode="inline_svg"                               │
│   Output: InlineSvgPlan {                                         │
│     svg_brief: {                                                  │
│       viewBox: "0 0 100 100",                                    │
│       palette: ["#hex", ...],                                    │
│       path_budget: 40,                                            │
│       require: ["fill", "stroke"],                                │
│       do_not: ["drop-shadow", "gradient"],                        │
│       skeleton: "<path d=\"…\" />" (template)                    │
│     },                                                            │
│     instructions_to_host_llm: "You are Claude..."                │
│   }                                                              │
│   Read-only; synchronous; O(1)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5a: Claude EMITS <svg>…</svg> as ```svg code block         │
│   Following svg_brief contract (viewBox, ≤40 paths, palette)     │
│   User sees the shape immediately in chat                        │
│   SVG text is captured for Step 6a                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6a: asset_save_inline_svg(svg, asset_type, brand_bundle?)  │
│   Input:  The <svg>…</svg> text from Step 5a                    │
│   Output: AssetBundle {                                          │
│     asset_type: "logo",                                          │
│     variants: [                                                   │
│       { path: "master.svg", format: "svg", rgba: false },       │
│       { path: "master.png", format: "png", rgba: true },        │
│       { path: "favicon-16.png", ... },                           │
│       { path: "favicon.ico", ... },                              │
│       { path: "apple-touch-icon.png", ... },                     │
│       { path: "pwa-192.png", ... },                              │
│       { path: "pwa-512-maskable.png", ... }                      │
│     ],                                                            │
│     validations: { tier0: { ... } }                              │
│   }                                                              │
│   Read/write; synchronous                                        │
│   CRITICAL: This MUST be called immediately after Step 5a        │
│   Missing this is the #1 failure mode across all asset types     │
│   Validates: viewBox, path count, palette, forbidden elements   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 7a: Report files to user                                    │
│   "✓ Saved logo:"                                                │
│   "  - /assets/.../master.svg"                                   │
│   "  - /assets/.../master.png"                                   │
│   "  - /assets/.../favicon-16.png"                               │
│   "  - ... (+ 5 more)"                                           │
│   User now has files on disk; can open, commit, deploy           │
└─────────────────────────────────────────────────────────────────┘
              [END INLINE_SVG PATH — ROUND TRIP COMPLETE]
```

#### Path B: External Prompt Only (User Pastes into Web UI)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 4b: asset_generate_*(..., mode="external_prompt_only")      │
│   Input:  brief                                                  │
│   Output: ExternalPromptPlan {                                   │
│     enhanced_prompt: "A minimalist SaaS logo for...",            │
│     target_model: "ideogram-3-turbo",                            │
│     paste_targets: [                                              │
│       {                                                           │
│         name: "Pollinations (free, HTTP)",                       │
│         url: "https://image.pollinations.ai/generate",           │
│         notes: "Zero signup. Paste URL + prompt = image."        │
│       },                                                          │
│       {                                                           │
│         name: "Stable Horde (free, anon queue)",                 │
│         url: "https://aihorde.net/",                             │
│         notes: "No account needed."                              │
│       },                                                          │
│       { name: "HF Inference (free token)", url: "...", ... },   │
│       { name: "Ideogram web", url: "...", ... },                │
│       { name: "Recraft web", url: "...", ... }                  │
│     ],                                                            │
│     ingest_hint: {                                                │
│       tool: "asset_ingest_external",                             │
│       args: { asset_type: "logo" }                               │
│     }                                                             │
│   }                                                              │
│   Read-only; no network; O(1)                                    │
│   paste_targets[] sorted: Pollinations > Horde > HF > Gemini     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5b: Report to user                                          │
│   "Prompt:\n{enhanced_prompt}\n\nGenerate at top-ranked UI:"     │
│   {paste_targets[0].name}: {paste_targets[0].url}                │
│   "Other options: {paste_targets[1..].name}"                     │
│   User copy-pastes prompt into browser UI                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6b: User generates in external UI (Midjourney, Ideogram)    │
│   User downloads PNG to local disk: ~/Downloads/logo.png         │
│   User reports back: "Done. Saved to ~/Downloads/logo.png"       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 7b: asset_ingest_external(image_path, asset_type,          │
│                                brand_bundle?, expected_text?)    │
│   Input:  image_path, asset_type                                 │
│   Output: AssetBundle (matte → vectorize → validate applied)     │
│   Read/write; synchronous; ~10-30s                                │
│   Injects: matte (BiRefNet/RMBG), vectorize (Recraft/vtracer),   │
│            tier-0 validation                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 8b: Report files + optionally run asset_validate           │
│   "✓ Ingested and processed:"                                    │
│   "  - /assets/.../ingested-0.svg"                               │
│   "  - /assets/.../ingested-0.png"                               │
│   (Optional) "Run validation to check palette/text/contrast?"    │
└─────────────────────────────────────────────────────────────────┘
      [END EXTERNAL_PROMPT_ONLY PATH — ROUND TRIP COMPLETE]
```

#### Path C: API Mode (Server Generates)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 4c: asset_generate_*(..., mode="api")                       │
│   Input:  brief, mode="api"                                      │
│   Output: AssetBundle {                                          │
│     asset_type: "logo",                                          │
│     variants: [                                                   │
│       { path: "master.png", format: "png", rgba: true },        │
│       { path: "master.svg", format: "svg", paths: 18 },         │
│       { path: "favicon-16.png", ... },                           │
│       { path: "favicon.ico", ... },                              │
│       ...                                                         │
│     ],                                                            │
│     provenance: {                                                 │
│       model: "recraft-v3",                                       │
│       seed: 1234,                                                 │
│       prompt_hash: "sha256:...",                                  │
│       params_hash: "sha256:..."                                   │
│     },                                                            │
│     validations: {                                                │
│       tier0: {                                                    │
│         dimensions: true,                                        │
│         alpha: true,                                             │
│         checkerboard: false,                                     │
│         safe_zone: true                                          │
│       }                                                           │
│     },                                                            │
│     warnings: [                                                   │
│       "palette ΔE max 15 (threshold 20)",                        │
│       "WCAG AA contrast ✓"                                       │
│     ]                                                             │
│   } OR ProviderError                                             │
│   Read/write; async (10s–5m); requires API key                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
            ┌─────────────────┴───────────────────┐
            ↓                                     ↓
        AssetBundle                         ProviderError
        (Success)                        (Needs Fallback)
            ↓                                     ↓
    ┌──────────────────┐         ┌──────────────────────────────┐
    │ Step 5c:         │         │ Step 5c-alt: Soft Fallback   │
    │ Report variants  │         │ (CRITICAL — Do NOT skip)     │
    │ + warnings       │         │                              │
    │                  │         │ if error.type === "checkerboard": │
    │ "✓ Generated     │         │   // Imagen/Gemini transparency bug │
    │ logo:"           │         │   // Try next fallback_model:        │
    │ /assets/.../...  │         │   retry with fallback_models[i+1]    │
    │                  │         │                              │
    │ (tier0 ✓,        │         │ elif error.type === "quota_exceeded": │
    │  palette ✓)"     │         │   // API account full                 │
    │                  │         │   offer free_api.routes:             │
    └──────────────────┘         │   "Ideogram quota full. Try           │
                                │    Pollinations (free, no signup)"    │
                                │                              │
                                │ elif error.type === "model_unsupported": │
                                │   // Routing stale or env wrong        │
                                │   retry with fallback_models[i+1]     │
                                │                              │
                                │ If all fallback_models tried:         │
                                │   → Surface error                     │
                                │   → Suggest external_prompt or        │
                                │      inline_svg fallback              │
                                │   → Offer asset_doctor() for diagnosis │
                                └──────────────────────────────────────┘
        [END API MODE PATH — ROUND TRIP COMPLETE]
```

### Phase 3: Optional Post-Generation

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 9 (optional): Validation Deep Dive                          │
│   asset_validate(image_path, asset_type, brand_bundle?,         │
│                  intended_text?, run_vlm=false)                  │
│   → Tier-1 metrics: palette ΔE2000, WCAG AA contrast, OCR       │
│      Levenshtein                                                 │
│   → Tier-2 VLM-as-judge (optional, slow): Claude Sonnet vs      │
│      asset-type rubric                                           │
│   "User asks: 'Check if the logo looks right'"                   │
│   Read-only; ~5s (OCR) + 30s (VLM if enabled)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 10 (optional): Platform Fan-Out                             │
│   asset_export_bundle(master_path, platforms=["ios", "android"]) │
│   → iOS: AppIconSet/Contents.json + 1024 marketing               │
│   → Android: adaptive icon (foreground+background+monochrome)    │
│   → PWA: 192.png, 512.png, 512-maskable.png                      │
│   → visionOS: parallax layers                                     │
│   Read/write; ~10s                                                │
│   "Do you want the full platform bundle (iOS/Android/PWA)?"      │
└─────────────────────────────────────────────────────────────────┘
              [END OPTIONAL POST-GENERATION PHASE]
```

## Clarifying Questions — The Gate Mechanism

**Pattern from `asset_enhance_prompt()` output:**

```json
{
  "clarifying_questions": [
    {
      "id": "color_count",
      "header": "Color Depth",
      "question": "Is this a 1-color mark, duochrome, or multicolor?",
      "options": ["monochrome", "duochrome", "multicolor"],
      "required": true,
      "why": "Determines whether vectorization will produce clean color separations"
    },
    {
      "id": "text_length",
      "header": "Text Content",
      "question": "Should the logo include text, and if so, how many words?",
      "options": ["no text", "1 word", "2-3 words", "full tagline"],
      "required": false,
      "why": "Text > 3 words requires composite SVG; best-in-class models only"
    }
  ]
}
```

**Decision Logic:**

```
if (spec.clarifying_questions.length > 0) {
  // BLOCK GENERATION — do NOT call asset_generate_*() yet
  
  for each question in spec.clarifying_questions:
    show user the question + options
    collect answer
    
  refinedBrief = updateBriefWithAnswers(userBrief, answers)
  
  // Retry enhance_prompt with refined brief
  spec2 = await asset_enhance_prompt({
    brief: refinedBrief,
    asset_type: spec.asset_type
  })
  
  // Usually clarifying_questions are now empty
  if (spec2.clarifying_questions.length > 0) {
    // Rare: loop again
  } else {
    // Proceed to mode selection with refined spec
  }
}
```

**Common Clarifying Questions:**

| ID | Asset Type | Question | Why It Matters |
|---|---|---|---|
| `color_count` | logo, icon, favicon | 1-color or multicolor? | Routing: monochrome → simpler models; multicolor → Recraft/Ideogram |
| `text_length` | logo, icon | 0 words or 1–3 words? | Routing: >3 words → composite SVG (can't fit in single generation) |
| `style` | illustration, hero | Photorealistic, illustrated, or abstract? | Model selection: Flux for photo, Recraft for illustration |
| `brand_present` | All | Do you have a brand.json or palette? | Routing: brand-locked LoRA, style_id, or color controls |
| `transparency` | logo, icon, mark | Do you need a transparent background? | Routing: gpt-image-1, Recraft, or diffusion + matte |

## Mode Selection Ranking

**Always rank by cost, never by speed alone:**

```
                    ↓
        ┌───────────────────────┐
        │ User brief            │
        │ (asset type known)    │
        └───────────┬───────────┘
                    ↓
    ┌───────────────────────────────────┐
    │ Check modes_available from        │
    │ asset_capabilities() + enhance_   │
    │ prompt()                          │
    │                                   │
    │ Filter by asset_type + features:  │
    │ - logo: all 3 modes              │
    │ - illustration: only 2            │
    │   (external_prompt, api)          │
    │ - og_image: only 2 (external, api)│
    └───────────┬───────────────────────┘
                ↓
    ┌───────────────────────────────────┐
    │ RANK by cost:                     │
    │                                   │
    │ 1st: inline_svg ($0 — user writes)│
    │ 2nd: external_prompt ($0 — pastes) │
    │      [ranked sub-priority]:        │
    │        a) Pollinations HTTP        │
    │        b) Stable Horde anon       │
    │        c) HF Inference (free token)│
    │        d) Gemini 2.5 Flash Image   │
    │           (Nano Banana, ~500 RPD  │
    │            free w/ API key as of  │
    │            Feb 2026; Pro paid)    │
    │        e) Ideogram web            │
    │        f) Recraft web             │
    │        g) Midjourney v8 (paid)    │
    │           [Note: no official API; │
    │            web UI only]           │
    │ 3rd: api (costs $$)               │
    │      [ranked by API key available]:│
    │        a) gpt-image-1.5 / OpenAI │
    │           (DALL-E 3 retiring      │
    │            May 12, 2026)         │
    │        b) Ideogram API            │
    │        c) Recraft API (V4 / V4    │
    │           Vector)                 │
    │        d) Flux / BFL              │
    │        e) Gemini API (paid only;  │
    │           no free image tier)     │
    │                                   │
    └───────────┬───────────────────────┘
                ↓
    ┌───────────────────────────────────┐
    │ Present to user:                  │
    │                                   │
    │ "inline_svg (fastest, you write)" │
    │ "external_prompt (paste, free)"   │
    │ "api mode (auto, $ or free)"      │
    │                                   │
    │ User picks one                    │
    └───────────────────────────────────┘
```

## Error Handling Patterns

### Soft Fallback: Checkerboard Pattern

**Detection:** `validate_asset()` tier-0 finds checkerboard via FFT (Imagen transparency bug).

**Root cause:** User wanted transparent PNG, routed to Imagen/Gemini, which render alternating tiles.

**Repair (CRITICAL):**

```
1. asset_generate_*() returned checkerboard
2. NEVER call asset_remove_background() — architectural, not sampling
3. Instead: Soft-fallback routing
   
   if (error.type === "checkerboard" && spec.fallback_models.length > 0) {
     // Router prioritized Imagen. Try next: gpt-image-1
     nextModel = spec.fallback_models[0]
     spec2 = await asset_enhance_prompt({
       brief: userBrief,
       target_model: nextModel,
       asset_type: spec.asset_type
     })
     result = await asset_generate_*({
       brief: spec2.rewritten_prompt,
       mode: selectedMode
     })
     // Now gpt-image-1 produces true RGBA with background:"transparent"
   }

4. If all fallback_models exhausted:
   → Suggest external_prompt_only (paste into Ideogram web UI, which supports
     transparent generation via the /ideogram-v3/generate-transparent endpoint
     — NOT a style:"transparent" param on the standard endpoint)
   → Or ask user to accept "white background" and matte afterward
```

### Quota Exceeded / Rate Limited

**Detection:** `ProviderError { type: "quota_exceeded", provider: "ideogram" }`

**Repair:**

```
1. Not a bug; API account is full or rate-limited
2. DO NOT retry same provider

if (error.type === "quota_exceeded") {
  // Check free_api.routes from capabilities
  if (capabilities.free_api.routes.length > 0) {
    freeRoute = capabilities.free_api.routes[0]
    suggest to user: "Ideogram quota exceeded. Try {freeRoute.provider} instead?"
    if user agrees:
      offer external_prompt_only mode with freeRoute.url
  } else {
    suggest: "No API quota. Try inline_svg or external_prompt_only?"
  }
}
```

### Model Unsupported

**Detection:** `ProviderError { type: "model_unsupported", target_model: "gpt-image-5" }`

**Repair:**

```
if (error.type === "model_unsupported" && spec.fallback_models.length > 0) {
  // Routing table is stale. Try next fallback.
  nextModel = spec.fallback_models[0]
  retry asset_generate_*() with nextModel
}

if all fallback_models tried and still fail:
  → Run asset_doctor() to diagnose
  → Call asset_models_list() to show all 60+ available
  → Let user pick a working model manually
```

### Alpha Missing (Expected Transparency Not Delivered)

**Detection:** `validate_asset() → { tier0: { alpha_required: true, alpha_present: false } }`

**Repair:**

```
if (tier0.alpha_required && !tier0.alpha_present) {
  // Try matting as rescue
  matted = await asset_remove_background(image_path, mode="auto")
  // (RMBG, BiRefNet, LayerDiffuse, or difference fallback)
  
  revalidate(matted)
  if now passes:
    accept matted result; suggest user save it
  else:
    suggest: "Regenerate with different model?"
}
```

### Palette Drift (ΔE2000 > threshold)

**Detection:** `validate_asset(image, brand_bundle) → { tier1: { palette_delta_e2000_max: 42 } }` (threshold ≈20)

**Repair:**

```
if (delta_e > 30) {
  // Mild: inform user; accept or regenerate
  suggest: "Palette drifted by {delta_e}. Accept or regenerate with Recraft?"
  // Recraft supports controls.colors[] enforcement
  
  if user says regenerate:
    force target_model="recraft-v3"
    retry asset_generate_*()
}

if (delta_e > 40) {
  // Severe: can't accept; must regenerate
  suggest: "Palette mismatch too high. Regenerating with brand-locked model..."
}
```

### Text Misspelled or Unreadable

**Detection:** `validate_asset(image, intended_text="Acme") → { tier1: { ocr_levenshtein: 8 } }` (threshold ≤2)

**Repair:**

```
if (ocr_levenshtein > 2 && asset_type includes text) {
  // Text rendering failed; two options
  
  option A: Drop text, composite SVG type later
    brief2 = brief.replace(/\bAcme\b/, "")  // Remove text
    spec2 = await asset_enhance_prompt({ brief: brief2, ... })
    regenerate with text-free spec
    // After generation: user can composite font later
  
  option B: Retry with text-strong model
    if Ideogram not already tried:
      force target_model="ideogram-3"
      regenerate
    // Ideogram best-in-class for text rendering
}

if (asset_type === "og_image"):
  // Special case: use satori for guaranteed text
  // asset_generate_og_image() avoids diffusion text entirely
```

### Safe Zone Violation (Icon Too Close to Edge)

**Detection:** `validate_asset(image, asset_type="app_icon") → { tier0: { safe_zone_violation: true } }`

**Repair:**

```
if (safe_zone_violation && asset_type === "app_icon") {
  // iOS mandates 824² safe zone; architectural, not sampling
  
  brief2 = brief + " \n\n[IMPORTANT: Center the icon with large padding on all edges. Avoid placing elements near the borders.]"
  
  spec2 = await asset_enhance_prompt({ brief: brief2, ... })
  regenerate with padding-explicit spec
}
```

## Free-Route Prioritization

**When user has no API keys, always offer free routes first:**

```
                 ↓
         ┌───────────────┐
         │ Check env:    │
         │ $ keys set?   │
         └───────┬───────┘
                 ↓
    ┌────────────┴─────────────┐
    │ YES                      │ NO
    ↓                          ↓
 (skip free)          Free routes (pick first):
 offer api                    │
                              ├─ Pollinations? (HTTP GET, zero signup)
                              │  Rank: #1 if available
                              │
                              ├─ Stable Horde? (anon queue)
                              │  Rank: #2
                              │
                              ├─ HF Inference? (free HF_TOKEN, ~free tier)
                              │  Rank: #3
                              │
                              ├─ Gemini free tier? CAUTION: Gemini/Imagen image-gen
                              │  has NO free API tier as of Dec 2025. Free GEMINI_API_KEY
                              │  returns HTTP 429 limit:0 on image endpoints.
                              │  AI Studio web UI (https://aistudio.google.com) is free
                              │  for interactive generation; use external_prompt_only +
                              │  asset_ingest_external for that flow.
                              │  Rank: #4 (web UI only, not programmatic)
                              │
                              └─ [No free routes]
                                 ↓ offer external_prompt_only
                                   (paste into Ideogram/Midjourney v8 web)
```

**Data structure from `asset_capabilities().free_api.routes[]`:**

```json
{
  "free_api": {
    "routes": [
      {
        "provider": "pollinations",
        "description": "Pollinations (free HTTP, no signup needed)",
        "url": "https://image.pollinations.ai/prompt/{prompt}",
        "supported_asset_types": ["logo", "illustration", "hero", ...],
        "tier": "free",
        "latency_ms": 15000
      },
      {
        "provider": "stable-horde",
        "description": "Stable Horde (free anon queue, can queue ~5 images)",
        "url": "https://aihorde.net/",
        "supported_asset_types": [...],
        "tier": "free",
        "latency_ms": 60000
      },
      ...
    ]
  }
}
```

**Skill Logic:**

```typescript
if (modes_available.includes("api") && apiKeysDetected()) {
  // User has keys; offer api mode (ranked 3rd after inline/external)
} else if (modes_available.includes("external_prompt_only")) {
  // No keys; offer external_prompt_only with free routes
  
  const freeRoutes = capabilities.free_api.routes;
  if (freeRoutes.length > 0) {
    suggest = `Paste into ${freeRoutes[0].provider} (free, no signup):`;
  } else {
    suggest = "Paste into Ideogram web (paid subscription):";
  }
}
```

## Round-Trip Completion — Files End Up on Disk

### Wrong (Current Common Failure)

```
Claude: "Here's your logo SVG:"
```svg
<svg viewBox="0 0 100 100">...</svg>
```

[chat ends]

User result: 
  ✗ Code block in chat
  ✗ No files on disk
  ✗ 30 seconds of SVG text to manually copy
```

### Right (Spec-Compliant)

**Inline SVG:**
```
Claude:
  1. Emits ```svg ... ```
  2. Immediately calls asset_save_inline_svg({svg, asset_type})
  3. Reports back: "✓ Saved logo: /assets/.../master.svg + /assets/.../favicon-16.png + ..."

User result:
  ✓ Files on disk
  ✓ Variants for all platforms (favicon, AppIcon, PWA)
  ✓ Ready to commit/deploy
```

**External Prompt:**
```
Claude:
  1. Shows paste_targets and prompt
  2. User generates externally
  3. Claude calls asset_ingest_external({image_path})
  4. Reports: "✓ Ingested and processed: /assets/.../ingested-0.svg + ..."

User result:
  ✓ Files on disk
  ✓ Matte + vectorize pipeline applied
  ✓ Ready to commit/deploy
```

**API Mode:**
```
Claude:
  1. Calls asset_generate_*({..., mode="api"})
  2. Server handles everything; files already persisted
  3. Reports: "✓ Generated logo: /assets/.../master.png + ..."

User result:
  ✓ Files on disk immediately
  ✓ Pre-validated
  ✓ Ready to commit/deploy
```

## External MCP Servers — Integration Points

### HuggingFace Inference MCP

**Status:** HuggingFace may publish an MCP server exposing `hf_inference_run` as a tool.

**Impact on P2A Skill:** None (no breaking change).
- P2A's `asset_capabilities()` reports HF Inference as a free-tier route.
- Skill ranks Pollinations > Horde > HF > Gemini for external_prompt_only.
- If user picks external_prompt_only with HF paste target, they use the HF web UI.
- Alternative: Claude could call HF MCP directly; P2A would not be involved.

**Recommendation:** Keep P2A as the canonical asset-generation orchestrator. If HF MCP ships, document it as a complementary tool for advanced users (not primary flow).

### Replicate MCP (Open-Model Catalog)

**Status:** Replicate hosts open models (Flux, SDXL) with signup credit + pay-as-you-go.

**Current P2A Integration:** Replicate is already in the routing table as a paid fallback.

**If Replicate MCP ships:** Claude could call Replicate MCP directly instead of P2A's Replicate bridge.

**Impact on Skill:** None breaking. Skill still recommends P2A as the entry point for asset types (since P2A does classification, routing, prompt rewriting, post-processing). If user explicitly asks "generate on Replicate," Claude can offer P2A's flow OR Replicate MCP directly as alternatives.

### ComfyUI MCP (Local / Serverless)

**Status:** ComfyUI is P2A's Phase-4 training + inference backbone for brand LoRAs.

**Current P2A Integration:** `asset_train_brand_lora()` calls a user-owned ComfyUI endpoint.

**If ComfyUI MCP ships:** Could expose ComfyUI workflows as tools.

**Impact on Skill:** No breaking change. Skill documents that `asset_train_brand_lora()` requires a user-owned endpoint (Modal, Runpod, self-hosted). ComfyUI MCP is an alternative deployment path (not primary).

### shadcn/ui Component Registry MCP

**Status:** shadcn ships an MCP for searching components, NOT for asset generation.

**Impact on P2A Skill:** None. (Clarified in research note 21.14.)

## Skill Definition & Manifest

### What the Skill Enforces

```
1. CALL ORDER: Always call in this sequence
   - asset_capabilities(asset_type?)
   - asset_brand_bundle_parse() [optional]
   - asset_enhance_prompt()
   - [GATE: if clarifying_questions[], block until answered]
   - asset_generate_*()
   - asset_save_inline_svg() [if mode="inline_svg"]
   - asset_ingest_external() [if mode="external_prompt_only"]

2. CLARIFYING QUESTIONS: Never skip
   - If spec.clarifying_questions.length > 0:
     → Show user each question
     → Collect answers
     → Loop back to asset_enhance_prompt() with refined brief
     → Usually questions disappear on second call

3. MODE SELECTION: Always rank by cost
   - inline_svg > external_prompt_only > api
   - Within external_prompt_only: Pollinations > Horde > HF > Gemini > web UIs

4. ROUND-TRIP COMPLETION:
   - inline_svg: MUST call asset_save_inline_svg() immediately
   - external_prompt_only: MUST call asset_ingest_external() after user saves
   - api: auto-complete (files already persisted by server)

5. ERROR RECOVERY: Soft fallback
   - checkerboard → retry with fallback_models[i+1]
   - quota_exceeded → offer free_api.routes
   - model_unsupported → try next fallback_model
   - alpha_missing → try asset_remove_background()
   - All fallback exhausted → suggest alternative mode or external_prompt_only

6. FREE-ROUTE PRIORITIZATION:
   - No API keys → surface Pollinations / Horde / HF / Gemini before web UIs
   - No free routes → suggest external_prompt_only (user pastes into web)
```

### What Claude/Skill Leaves to User

- **Which asset type:** User says "logo" or "icon"; classification confirms
- **Brand details:** User provides brand.json; parsing confirms
- **Prompt refinement:** enhance_prompt suggests rewrites; user can accept or refine
- **UI/UX presentation:** Skill enforces order; Claude decides rendering
- **Regeneration decisions:** Skill catches errors; Claude decides: accept, retry, or fallback

## Testing Strategy

### Unit Tests (Skill Logic)

```
✓ asset_capabilities() called first, gates further calls
✓ Clarifying questions block generation
✓ Mode ranking: inline_svg > external > api
✓ Round-trip completion: inline_svg → save checked
✓ Round-trip completion: external → ingest checked
✓ Soft fallback: checkerboard triggers retry
✓ Soft fallback: quota suggests free routes
✓ Free-route ranking: Pollinations > Horde > HF > Gemini
```

### Integration Tests (End-to-End Paths)

```
✓ Zero-key user: capabilities() shows [inline_svg, external]
  → asset_generate() never suggests api mode
✓ Zero-key user picks inline_svg
  → asset_generate() returns svg_brief
  → Claude emits <svg>
  → asset_save_inline_svg() called and creates files
✓ Zero-key user picks external_prompt_only
  → paste_targets[0] is Pollinations (free)
  → After user generates, asset_ingest_external() called
✓ API-key user picks api
  → Fast generation, files on disk, validated
✓ API generation fails with checkerboard
  → Soft fallback retries with next model
  → User sees retry message + success
✓ Recraft quota exceeded
  → Offer Pollinations, Stable Horde, HF as fallback
```

## References

> **Updated 2026-04-21:** MCP spec version confirmed. The Latest Stable MCP specification is **2025-11-25** (released November 25, 2025, MCP's first anniversary). Key additions: OpenID Connect Discovery, async Tasks, incremental scope consent, extension framework. No breaking changes to tool schemas. Verify MCP server SDK version compatibility when referencing 2025-11-25 features.
>
> **SKILL.md cross-IDE portability:** SKILL.md is an open standard supported by Claude Code, Cursor (`.cursor/rules/`), Windsurf (`.windsurf/rules/`), Gemini CLI (`GEMINI.md`), and OpenAI Codex CLI. Only the destination folder path changes per IDE. Skills in this format work across all adopting tools.

- `SKILL.md` — Cardinal rules and three-mode execution model
- `server.ts` — The 24 tools and their schemas
- `modes.ts` — Mode availability detection and MODES_BY_ASSET_TYPE
- `enhance-prompt.ts` — Clarifying questions and AssetSpec generation
- `docs/research/21-oss-deep-dive/08-mcp-registries.md` — MCP distribution
- `docs/research/21-oss-deep-dive/14-webmcp-impls.md` — Browser-side MCP (complementary, not blocking)
