---
title: "P2A complementary skills — synthesis and recommendations"
category: skills-for-p2a
date: 2026-04-21
research_files: [01, 02, 03, 04, 05, 06, 07, 08]
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

> **Key corrections applied 2026-04-21 (across all angle files in this category):**
>
> | Item | Old (stale) | New (correct) |
> |---|---|---|
> | DALL-E 3 | Active model | **Retiring May 12, 2026.** Migrate to `gpt-image-1.5` (current, 20% cheaper, stronger brand logo preservation) |
> | Recraft V3 | Current native SVG model | **V3 superseded by V4** (February 2026). Use V4 Vector / V4 Pro Vector for all new work |
> | Ideogram v3 transparency | `style: "transparent"` param on standard endpoint | **Dedicated endpoint `/ideogram-v3/generate-transparent`** — separate from standard generate |
> | Midjourney | V7, no API | **V8 Alpha** launched March 17, 2026 (5× faster, native 2K, improved text). Still no official public API |
> | Claude model references | claude-2/3.x era naming | **Claude 4.0-series** (claude-sonnet-4-20250514, claude-opus-4-20250514) **retires June 15, 2026** → migrate to claude-sonnet-4-6 / claude-opus-4-6 |
> | Gemini image free tier | "~1,500 images/day free" | **No free image API tier** since Dec 2025. AI Studio web UI is free (interactive); API requires billing. $0.039/img Nano Banana |
> | MCP spec version | Unspecified | **2025-11-25 is Latest Stable** (released Nov 25, 2025). Adds async Tasks, OpenID Connect Discovery, extension framework |
> | SKILL.md portability | Claude Code only | **Open cross-IDE standard**: Claude Code, Cursor, Windsurf, Gemini CLI, Codex CLI. Same format, different destination folder |

# P2A Complementary Skills — Synthesis and Recommendations

---

## 1. Executive Summary

P2A's 8 existing skills can generate a single asset. They cannot reliably produce a coordinated brand kit, recover from validation failures without guesswork, explain routing decisions, or author SVG without producing broken geometry. Three gaps are production-blocking: (1) no SVG authoring grammar for `inline_svg` mode — users see code blocks but get no guidance on path budgets, viewBox semantics, or failure recovery; (2) the prompt-dialect knowledge is scattered across four skills with no decision tree, so users cannot reason about routing or know why Flux errors on `negative_prompt`; (3) validation failures get one-sentence repair hints, not a decision tree, so every failure turns into blind regeneration that burns API credits.

**3 most impactful actions:**
1. Activate `frontend-design` (already installed) for aesthetic direction on every primary-brand-asset request — zero build cost.
2. Build `svg-authoring` skill — unblocks every `inline_svg` user; highest ratio of user impact to build effort.
3. Build `asset-validation-debug` skill — stops wasted API spend on every failure; second-highest ratio.

**Immediate (activate existing skills):** `frontend-design`, `context7`, `brainstorming` — all installed, all reference-able from CLAUDE.md today.

**Must build (4–12 days total):** `svg-authoring`, `t2i-prompt-dialect`, `asset-validation-debug`, `brand-consistency` — in that priority order.

---

## 2. Existing Skills to Activate Now

These skills are installed and require only a CLAUDE.md reference to activate.

### `frontend-design`

- **Location:** `/Users/mohamedabdallah/.claude/plugins/cache/claude-plugins-official/frontend-design/`
- **When to invoke in P2A workflow:** Before `asset_enhance_prompt()` for any primary brand asset (logo, app icon). Triggers the aesthetic-direction step — commits to a bold, specific direction (brutalist, minimalist, luxury, organic) before entering the generation pipeline. Skip for derivative assets (favicon derived from logo, OG image with established brand).
- **CLAUDE.md instruction:** `For logo and app-icon requests with no stated aesthetic direction, invoke the frontend-design skill to commit to a bold, specific visual style before calling asset_enhance_prompt().`

### `context7`

- **Location:** `/Users/mohamedabdallah/.claude/plugins/cache/claude-plugins-official/context7/`
- **When to invoke:** When the current SVG spec, image-model API parameter list, or any library P2A depends on (Sharp, @resvg/resvg-js, HuggingFace Inference, Recraft, fal.ai) may have changed since training cutoff. Specifically: "What are the current Recraft V4 controls.colors parameters?", "Does the current HF Inference API still accept negative_prompt for Flux?" P2A's static research docs go stale; context7 does not.
- **CLAUDE.md instruction:** `For current SVG specs, image-model API parameters, or any P2A dependency (Sharp, @resvg/resvg-js, Recraft, fal.ai, HuggingFace Inference), call context7 before relying on built-in research docs.`

### `brainstorming`

- **Location:** `/Users/mohamedabdallah/.claude/plugins/cache/superpowers-marketplace/superpowers/4.3.1/skills/brainstorming/`
- **When to invoke:** When a brief for a primary brand asset is vague (no style, no palette, no direction) AND the user has not expressed a speed preference. Explore 2–3 design directions, get user approval, then proceed to `asset_enhance_prompt()`. Skip for secondary assets (favicon, OG image with existing brand) or when brief is specific.
- **CLAUDE.md instruction:** `For vague primary brand asset briefs (no style or palette stated), invoke the brainstorming skill to explore 2–3 design directions before proceeding to asset_enhance_prompt().`

### `systematic-debugging` (medium priority — consider importing)

- **Location:** `/Users/mohamedabdallah/.claude/plugins/cache/superpowers-marketplace/superpowers/4.3.1/skills/systematic-debugging/`
- **When to invoke:** When a validation failure requires structured diagnosis — gather evidence at each pipeline boundary, classify failure, pick repair primitive, verify. Maps directly to P2A's validation failure recovery.
- **CLAUDE.md instruction:** `For validation failures that require structured diagnosis (cascading failures, repeated same failure code), apply the systematic-debugging skill's 4-phase structure before retrying generation.`

---

## 3. New Skills to Build: Priority-Ordered Spec Summaries

### Priority 1: `svg-authoring`

SVG-authored assets are P2A's only zero-cost, zero-key, fully-editable output path. The current `inline_svg` mode gives Claude a `svg_brief` (viewBox, palette, path_budget) but zero guidance on how to honor it. The result: gigantic coordinates, open paths, mixed stroke styles, text misspellings, broken boolean operations — all documented failure modes in research file 02. This skill provides the constraint system prompt (path grammar, style taxonomy with implementation patterns, per-asset-type technical specs), 10 documented failure patterns with remediation recipes, typography strategy (mark-only vs composite), and multi-turn iteration support.

**Key capabilities:**
- Style taxonomy (flat/geometric, outlined, filled, duotone, isometric, minimal/brutalist) with SVG code patterns
- Per-asset-type technical constraints: viewBox, path budget, safe zone, stroke rules (logo/favicon/icon/sticker/app-icon)
- 10 failure patterns with detection criteria and remediation (gigantic coords, open paths, overlapping order, text misspelling, sub-pixel rendering)
- Integration with `asset_save_inline_svg` round-trip: emit `<svg>` then save
- Decision tree for when to escalate from LLM-SVG to Recraft or raster+vtracer

**Build effort:** 3 days
**Impact score:** 5/5
**Full spec:** `/docs/research/24-skills-for-p2a/02-svg-authoring-skill-design.md`

---

### Priority 2: `asset-validation-debug`

Every P2A user who hits a validation failure currently gets a 1–2 sentence repair hint. The reality: each failure code has a specific repair primitive, a cost tradeoff (post-process is 0.05× the cost of regeneration), and a retry budget. This skill formalizes the 13-failure-code taxonomy (6 Tier 0 deterministic, 4 Tier 1 metric, 2 Tier 2 VLM), the repair primitive selection matrix, and a Mermaid diagnosis tree. It integrates with `superpowers:systematic-debugging`'s 4-phase structure and surfaces proactive pre-generation checks that catch routing errors before any API spend occurs.

**Key capabilities:**
- 13-code failure taxonomy with tier classification and origin signatures
- Repair primitive selection matrix: which primitive, what cost ratio, when to fallback
- Retry budget table: max retries per failure code before escalating to user
- Proactive pre-generation checklist (text length, transparency routing, safe zone, path budget)
- Evidence logging schema per pipeline boundary (generation → matte → vectorize → export → validate)

**Build effort:** 2 days
**Impact score:** 4/5
**Full spec:** `/docs/research/24-skills-for-p2a/06-validation-debug-skill.md`

---

### Priority 3: `t2i-prompt-dialect`

Prompt-dialect knowledge is currently spread across `asset-enhancer` (most complete), `logo`, `illustration`, and `og-image` skills with no decision tree. Users cannot reason about why Flux errors on `negative_prompt`, why Imagen needs ≥30 words, or how to encode brand palette for each model. This skill moves the 7-provider rewriting rules into a deterministic pipeline: normalize brief → rewrite for target model grammar/token budget → inject brand bundle per-provider → validate pre-generation checklist → emit `{dialect_prompt, model_params, warnings[]}`. It sits between `asset_enhance_prompt()` and `asset_generate_*()`.

**Key capabilities:**
- Per-model rewriting rules for 7 providers: gpt-image-1.5 (gpt-image-1 still valid; DALL-E 3 retiring May 12, 2026), Imagen/Gemini, SDXL, Flux.1/2, Midjourney v8, Ideogram, Recraft V4
- Negative-prompt handling table: which models accept, which error, which ignore silently
- Brand bundle injection per model: Recraft `controls.colors`, Flux.2 `color_palette` JSON, Midjourney `--sref`, SDXL IP-Adapter
- Text-in-image ceiling table per model (≤3 words for SDXL/MJ; ≤5 for Ideogram/gpt-image-1)
- Pre-generation quality checklist with per-model gating conditions

**Build effort:** 2 days
**Impact score:** 4/5
**Full spec:** `/docs/research/24-skills-for-p2a/03-t2i-prompt-dialect-skill.md`

---

### Priority 4: `brand-consistency`

P2A can produce a good single asset. It cannot produce 30 cohesive assets without drift — style creep, palette shift, and inconsistent stroke weights are common at scale. This skill adds a pre/post-processing layer (not a replacement for `asset-enhancer`) that extracts a structured `BrandBundle` from logo marks or brief, adapts it per asset type via slot templates, enforces palette via per-model dialect (Recraft `controls.colors`, Midjourney `--sref`, SDXL IP-Adapter swatch), and validates via ΔE2000 + CSD style similarity after each generation. Includes LoRA training workflow, style anchor versioning, and drift detection for sets of 20+ assets.

**Key capabilities:**
- `BrandBundle` schema v1: palette semantics, style anchors, LoRA paths, per-asset-type overrides
- Per-model palette enforcement with code samples (Recraft controls, MJ --sref, SDXL IP-Adapter swatch)
- Slot template pattern for asset-type adaptation (UI icon vs app icon vs illustration)
- CSD drift detection with empirical thresholds (cosine ≥ 0.72 on-brand; < 0.60 regenerate)
- Post-process palette remap (K-means in LAB space + ΔE2000 nearest-neighbor)

**Build effort:** 5 days
**Impact score:** 3/5
**Full spec:** `/docs/research/24-skills-for-p2a/05-brand-consistency-skill.md`

---

## 4. Skill Dependency Map

```
                    User brief
                        │
          ┌─────────────┼─────────────────┐
          │             │                 │
          ▼             ▼                 ▼
   frontend-design  brainstorming    context7
   (aesthetic         (direction     (live docs)
   direction)         exploration)
          │
          └──────────┐
                     ▼
          ┌── brand-consistency ──┐
          │  (bundle extraction,  │
          │   slot adaptation)    │
          │                       │
          ▼                       ▼
   asset-enhancer ◄───── t2i-prompt-dialect
   (classifier,         (per-model rewrite,
    router, mode         negative handling,
    selector)            brand injection)
          │
          ▼
   asset_generate_*
   (3 modes)
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  inline_svg   api / external
    │
    ▼
  svg-authoring ◄──────────────────────────┐
  (geometry constraints,                   │
   style patterns, failure                 │
   recovery)                               │
    │                                      │
    ▼                                      │
  asset_save_inline_svg                    │
    │                                      │
    └──────────────┐                       │
                   ▼                       │
          asset-validation-debug ──────────┘
          (failure taxonomy,
           repair primitives,
           retry budget)
                   │
                   ▼
           brand-consistency
           (post-gen: CSD drift,
            palette ΔE2000,
            manifest tracking)
```

**Key relationships:**
- `frontend-design` and `brainstorming` are upstream of everything — they shape the brief before any P2A tool is called.
- `t2i-prompt-dialect` and `brand-consistency` both feed into `asset-enhancer` — dialect wraps the prompt, brand injects constraints.
- `svg-authoring` is downstream of `asset-enhancer` but upstream of `asset_save_inline_svg` — it governs the SVG that gets saved.
- `asset-validation-debug` is downstream of all generation paths and feeds back into `svg-authoring` (via remediation recipes) and `brand-consistency` (via drift detection).
- `context7` is available at any stage when live docs are needed.

---

## 5. Gap vs. Priority Matrix

Sorted by priority (impact ÷ effort) descending.

| Gap | Impact (1–5) | Effort (1–5) | Priority | Notes |
|---|---|---|---|---|
| SVG authoring grammar | 5 | 2 | 2.50 | Blocks every inline_svg user; effort is authoring docs only |
| Validation failure repair cookbook | 4 | 2 | 2.00 | 13 failure codes, repair matrix, retry budgets |
| Prompt dialect decision tree | 4 | 2 | 2.00 | Consolidates 4 scattered skill sections |
| Free-route ranking table | 3 | 1 | 2.00 | Speed/quality/friction table — 1 day to add to asset-enhancer |
| Typography in wordmarks | 4 | 3 | 1.33 | Composite SVG type workflow; font selection |
| Activate frontend-design (CLAUDE.md) | 3 | 1 | 1.33 | Zero build — reference in CLAUDE.md |
| Brand consistency at scale | 3 | 5 | 0.60 | LoRA training, CSD drift, versioning |
| MCP tool chaining patterns | 2 | 3 | 0.67 | Useful but asset-enhancer flow covers basics |
| Accessibility-first design (WCAG) | 2 | 3 | 0.67 | WCAG contrast selection before generation |
| Cost optimization (batch, dedup) | 1 | 3 | 0.33 | High-volume users only; not production-blocking |

---

## 6. What `frontend-design` Transfers (and What Doesn't)

### Adopt wholesale (5 principles)

1. **Bold aesthetic commitment before authoring.** P2A's `inline_svg` mode must choose a direction — brutalist, minimalist, organic, duotone — before deciding path counts. A mark that tries to be two styles fails. Apply this before `asset_enhance_prompt()` on every logo request.

2. **Color hierarchy: dominant + accent, not equi-weighted palette.** The 3-hex palette spec in the logo skill does not teach *which color dominates*. GitHub's logo succeeds because one color dominates. A 6-color equi-weighted palette reads as clip art. Add dominant/accent designation to BrandBundle.

3. **Anti-generic stance: no AI-slop defaults.** `frontend-design`'s rejection of Inter, purple gradients, and predictable patterns maps directly to SVG logo authoring. If the mark is a circle with a gradient, demand justification. Bake an "avoid AI-slop marks" instruction into the `svg-authoring` skill.

4. **Obsessive detail: every element must earn its place.** `frontend-design` demands meticulously refined components. For SVG: every path must earn its place within the path budget. A 5-path logo with precise curves beats a 40-path logo with sloppy geometry.

5. **Intentional typography for wordmarks.** `frontend-design`'s anti-generic font stance applies to SVG compositing. When a wordmark is composited post-generation, the typeface choice is a brand decision, not decoration. The brand font must be named and justified in the BrandBundle.

### Override or extend (5 gaps)

1. **Legibility at 16×16 overrides aesthetic complexity.** `frontend-design` assumes human-readable UI scale. A favicon at 16px has no room for diagonal flows, overlapping elements, or elaborate composition. Legibility is the non-negotiable gate at small scale; aesthetics are secondary.

2. **Proportional stroke weights, not fixed pixels.** `frontend-design` uses CSS for sizing. In SVG, a 1px stroke at 1024² becomes invisible at 16². Stroke widths must be proportional to viewBox (e.g., 2% of viewBox height) or the favicon variant will be blank.

3. **Safe zone and WCAG contrast are hard requirements, not suggestions.** `frontend-design` covers accessibility for interactive states. P2A marks must pass WCAG AA contrast (4.5:1) at *every* deployed scale, on both light and dark backgrounds. This is a validation gate, not an aspiration.

4. **Raster-to-vector artifacts are a distinct design problem.** `frontend-design` assumes authoring in the target medium. P2A frequently starts from raster (diffusion output) then vectorizes. Gradients and soft shadows must be avoided in source generation or they produce 200+ paths and posterization artifacts post-vtracer. This is a constraint `frontend-design` has no concept of.

5. **Path count and file size are first-class constraints.** `frontend-design` has no concept of payload optimization. A favicon must be <1 KB; an SVG logo must be <2 KB. Path count IS file size. Design within the budget from the start, not as a post-optimization afterthought.

---

## 7. Recommended CLAUDE.md Changes

Add this section to P2A's `CLAUDE.md` immediately after the existing "Three execution modes" section:

```markdown
## Complementary Skills

**Aesthetic direction** — For logo and app-icon requests with no stated aesthetic direction,
invoke the `frontend-design` skill before calling `asset_enhance_prompt()`. Commit to a
bold, specific direction (brutalist, minimalist, luxury, organic). Feed that into the brief.

**Live documentation** — For current SVG specs, image-model API parameters, or any library
P2A depends on (Sharp, @resvg/resvg-js, Recraft, HuggingFace Inference, fal.ai), call
`context7`. P2A's built-in research docs go stale; context7 does not.

**Brief clarification** — For vague primary brand asset briefs (no style, palette, or
direction stated), invoke `brainstorming` to explore 2–3 design directions before
asset_enhance_prompt(). Skip for secondary or derivative assets.

**Validation failures** — For cascading failures or the same failure code appearing twice,
apply the `systematic-debugging` skill's 4-phase structure before retrying generation.

**New skills (build required):**
- `skills/svg-authoring/` — SVG grammar, style taxonomy, failure patterns. Spec: 02.md
- `skills/t2i-prompt-dialect/` — Per-model rewriting, negative handling. Spec: 03.md
- `skills/asset-validation-debug/` — Failure taxonomy, repair matrix. Spec: 06.md
- `skills/brand-consistency/` — BrandBundle, CSD drift, asset sets. Spec: 05.md
```

---

## 8. Next Steps

| # | Action | Owner | Deliverable | Effort |
|---|---|---|---|---|
| 1 | Add the "Complementary Skills" CLAUDE.md section above to P2A's `CLAUDE.md`. Reference `frontend-design`, `context7`, `brainstorming`, `systematic-debugging`. | P2A team | 8-line CLAUDE.md addition | 30 min |
| 2 | Write `skills/svg-authoring/SKILL.md` from spec file 02: constraint system prompt, 6 style taxonomy entries with SVG code samples, 10 failure patterns with remediation, per-asset-type constraint table. Wire into `asset_save_inline_svg` validation pipeline. | Skill author | `skills/svg-authoring/SKILL.md` + 10–15 reference SVGs in `examples/` | 3 days |
| 3 | Write `skills/asset-validation-debug/SKILL.md` from spec file 06: 13-code failure taxonomy, repair primitive selection matrix, retry budget table, pre-generation checklist, evidence logging schema. Cross-reference `superpowers:systematic-debugging` for 4-phase structure. | Skill author | `skills/asset-validation-debug/SKILL.md` | 2 days |
