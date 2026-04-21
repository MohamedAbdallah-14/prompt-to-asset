---
name: svg-authoring
description: Author production-grade inline SVG (logos, favicons, icon packs, stickers, transparent marks) when the P2A `inline_svg` execution mode is selected. Enforces viewBox, path-budget, palette, optical balance, and small-scale legibility rules so the emitted `<svg>` survives `asset_save_inline_svg` validation and renders crisp from 16×16 through 1024×1024.
trigger_phrases: [author svg, inline svg, write svg, svg logo, svg favicon, svg icon pack, svg sticker, svg mark]
---

# SVG authoring (inline_svg mode)

Engaged when `asset_generate_*` returns an `InlineSvgPlan`. Read `svg_brief` (viewBox, palette, path_budget, require[], do_not[], skeleton) and emit one `<svg>…</svg>` code block that honors every constraint. Then call `asset_save_inline_svg({ svg, asset_type })` so the file lands on disk.

## Hard constraints (non-negotiable)

| Asset type | viewBox | Path budget | Colors | Safe-zone | Notes |
|---|---|---|---|---|---|
| `logo` | `0 0 120 120` (or brief-specified) | ≤40 | 2–4 hex | subject fits inside 80% center box | Flat, geometric, closed shapes |
| `favicon` (master SVG) | `0 0 64 64` | ≤30 | 2–3 hex | legible at 16×16 after downsampling | ≥2px stroke equivalent at 16² |
| `icon_pack` (per icon) | `0 0 24 24` | ≤8 | monocolor (`currentColor`) OR 2 tones | 2px grid, 1.5–2px strokes | All icons share grid + stroke weight |
| `sticker` | `0 0 240 240` | ≤60 | up to 6 hex | bleed allowed; no hard edge requirement | Chunkier line weights OK |
| `transparent_mark` | `0 0 200 200` | ≤40 | 2–3 hex | 80% center | Never emit `<rect fill="white">` as "background" |
| `app_icon` master | `0 0 1024 1024` | ≤60 | 3–5 hex | iOS HIG 824² center | Opaque bg allowed; no alpha needed on this one |

**Never emit:** `<image>` tags, external refs, `<script>`, inline Base64, fonts with unverified family names, CSS animations in a favicon master, gradients in an icon-pack icon.

## Design principles (from frontend-design, adapted for SVG)

1. **Aesthetic commitment** — pick one direction from the brief and execute it precisely. Brutalist, minimal, geometric, organic — not a blend. Do not hedge.
2. **Silhouette clarity** — the shape must read as a single-color fill. Squint test: does it hold together when all paths collapse to black?
3. **Optical balance over mathematical centering** — curves/triangles need ~2–4% shift to *feel* centered. Use the viewBox midpoint as a starting reference, not a law.
4. **Proportional stroke weights** — strokes authored as a ratio of viewBox, not absolute pixels. A 1px stroke at viewBox 120 becomes invisible at 16×16. Use 2–4px for icons, 4–8px for logos.
5. **Negative space as structure** — gaps between paths carry meaning. Don't fill every cell.
6. **Every path earns its place** — if a path can be removed without changing the silhouette, remove it. Path count is a quality signal.

## SVG grammar cheatsheet

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <!-- primitives beat paths for circles/rects -->
  <circle cx="60" cy="60" r="40" />
  <rect x="30" y="30" width="60" height="60" rx="8" />
  <!-- paths: M (moveto), L (lineto), C (cubic), Z (close) -->
  <path d="M40 80 L60 40 L80 80 Z" fill="#0A1F44" />
  <!-- groups scope styles; use currentColor for theming -->
  <g fill="#FF6B6B"><path d="…"/><path d="…"/></g>
</svg>
```

Rules: always close shapes with `Z`; round coordinates to 2 decimals; prefer primitives (`<circle>`, `<rect>`) over equivalent `<path>`; use `<g>` to deduplicate fill/stroke.

## Style taxonomy

**Flat-geometric** — primitives + straight paths, fills only, 2–3 hex. Default for logos/favicons.
**Outlined (stroke-only)** — `fill="none"`, uniform `stroke-width`, round caps/joins. Default for icon packs (Lucide/Heroicons pattern).
**Filled (solid)** — single-color fills, `currentColor` for theming. Compact file size.
**Duotone** — two layered `<g>` groups, contrasting hex codes. Good for logos with depth.
**Minimal/brutalist** — 1–3 shapes, monocolor, asymmetric composition. Highest failure rate if executed carelessly.
**Gradient** — `<linearGradient>` or `<radialGradient>` in `<defs>`. Avoid in favicons (collapses at 16²).

## Small-scale survivability check

Before emitting, picture the mark at 16×16:
- Strokes ≥2px at final render size? (A 2px stroke at viewBox 120 → renders as `2 × 16/120 = 0.27px` at 16×16. Too thin. Use 6–8px at viewBox 120 for favicons.)
- ≤3 perceptual shapes? (More collapses into mush.)
- ≥4.5:1 contrast between foreground and expected background (white browser chrome AND dark chrome)?
- Single visual idea? (No secondary glyphs, no borders, no flourishes.)

## Text inside SVG

**Default: no text.** Composite brand typography in the application layer using real fonts.

If the brief requires `<text>`:
- Use a web-safe stack: `font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"` — never a single exotic font.
- Never embed actual font files.
- Run OCR validation post-render; reject Levenshtein >1 vs. intended wordmark.
- For >3 words: generate text-free mark, composite type post-render. Do not emit SVG text at that length.

## Color application

- Palette comes from `svg_brief.palette`. Use it strictly. No new hex codes.
- If brief expects dark-mode variant: emit two SVGs (light + dark), do not algorithmically invert (loses contrast).
- Use `currentColor` for icon-pack icons so consumers can theme via CSS.
- Validate ΔE2000 ≤10 vs brand palette (handled post-save by `asset_save_inline_svg`).

## Failure patterns to avoid

| Mistake | Symptom | Fix |
|---|---|---|
| Coordinates > viewBox | Subject clipped / off-canvas | Keep all coordinates within `[0, viewBox_size]` |
| Open paths (missing `Z`) | Fill leaks, unpredictable stroke | Always `Z` before starting new subpath |
| Sub-pixel coordinates (e.g. `60.000001`) | Blurry rasterization | Round to 2 decimals |
| Stroke sized for 1024 canvas in a favicon viewBox | Invisible at 16² | Size strokes as ratio of viewBox |
| Over-detail / literal interpretation | Cannot read at small scale | Reduce to silhouette; cut paths |
| Mixed stroke/fill conventions | Inconsistent icons in a pack | Pick one and declare at `<svg>` root |
| Gradient in favicon | Muddy at 16² | Flat fills only below 64×64 viewBox |
| Drop shadows / filters | Broken in most renderers | Do not use `<filter>` in brand assets |

## Round-trip contract

The `asset_save_inline_svg` tool validates your SVG against the brief. If it returns an error:
- `viewBox mismatch` — you used a different viewBox than the brief specified
- `path count > budget` — reduce via primitives, merging, or deletion of decorative paths
- `unknown palette color` — swap rogue hex for nearest palette entry
- `external reference` — remove `<image href>`, `<use href>`, etc.

Regenerate the SVG with the correction; call `asset_save_inline_svg` again. Max 2 retries, then report back to user.

## Research

- `docs/research/12-vector-svg-generation/12d-llm-direct-svg-code-generation.md` — LLM-author SVG patterns, StarVector, path budgets
- `docs/research/12-vector-svg-generation/12e-hybrid-vector-pipeline-architectures.md` — fallback paths when inline fails
- `docs/research/24-skills-for-p2a/02-svg-authoring-skill-design.md` — full spec (this file is the shipping distillation)
