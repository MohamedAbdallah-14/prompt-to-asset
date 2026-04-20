# 26c — Asset-Specific Critique Templates

Rubrics are structured using the Prometheus-Vision 1–5 Likert format (see 26b). Each criterion is scored independently. The VLM judge receives: the asset image, the original brief, the brand bundle (palette hex list, wordmark string), and these rubrics. Tier-0 pixel checks run before the VLM call; failures short-circuit to score=1 on the relevant criterion without consuming VLM tokens.

---

## Logo / Transparent Mark (5 criteria)

**C1 — Mark Clarity at Reduced Size**
- 5: Silhouette reads as a distinct recognizable shape when downscaled to 32×32.
- 4: Silhouette mostly readable; one minor element loses definition.
- 3: Shape is ambiguous at 32×32; requires full-size context.
- 2: Mark dissolves into noise at any reduced size.
- 1: No coherent shape present.

**C2 — Alpha / Transparency Correctness** *(pre-gated by tier-0 alpha check)*
- 5: Subject tightly bounded; all background pixels are fully transparent (alpha=0); no fringe/halo.
- 4: Subject well-bounded; minor fringe on ≤5% of edge pixels.
- 3: Visible halo or checkerboard artifact around 10–25% of perimeter.
- 2: Large regions of background retained as opaque.
- 1: No transparency; solid background present.

**C3 — Palette Accuracy** *(ΔE2000 values from tier-0 feed as context)*
- 5: Dominant colors match brand palette within ΔE2000 ≤ 5 for all swatches.
- 4: ΔE2000 ≤ 10 for all; slight saturation shift.
- 3: One swatch outside ΔE2000 10–20; overall hue preserved.
- 2: Two or more swatches significantly off-brand.
- 1: Colors bear no resemblance to brand palette.

**C4 — Style / Concept Match**
- 5: Visual style (geometric/organic/illustrative) and concept tightly match the brief.
- 4: Style matches; one element deviates from brief intent.
- 3: Style partially matches; concept requires interpretation to connect to brief.
- 2: Style or concept is inconsistent with brief.
- 1: Unrecognizable as the requested concept.

**C5 — Text-Free Mark Integrity**
- 5: No rendered wordmark or letterform in the raster mark (text handled by SVG layer).
- 1: Wordmark or text is baked into raster pixels.  
*(Binary — no intermediate scores; this is a routing violation.)*

---

## App Icon (5 criteria)

**C1 — Safe-Zone Containment** *(tier-0 bbox check feeds exact px values)*
- 5: Primary subject fits within iOS 824px center circle; no limb clipping at Android 72dp circle.
- 4: Subject fits iOS; minimal clipping (≤2% area) at Android.
- 3: Subject fits iOS but 5–15% clipped at Android.
- 2: Subject extends beyond iOS safe zone.
- 1: Subject bleeds to canvas edge.

**C2 — Visual Weight at 60pt / 48dp**
- 5: Icon reads as a distinct, identifiable glyph at 60pt without zooming.
- 4: Readable but requires attention.
- 3: Ambiguous; could be confused with adjacent apps.
- 2: Details completely lost at 60pt.
- 1: Unreadable blob.

**C3 — Background Appropriateness**
- 5: Background color is opaque, non-transparent, and visually appropriate for the platform context.
- 3: Background is present but a poor contrast choice against the subject.
- 1: Background is transparent (invalid for App Store submission).

**C4 — Palette Accuracy** (same scale as logo C3)

**C5 — Rounding-Safe Composition**
- 5: Key visual elements are centered; corners are empty or decorative — safe for any clip mask.
- 3: Elements near corners that will be obscured by rounded rect (iOS r=22.5% of width).
- 1: Logo mark or text sits at corner.

---

## Favicon (4 criteria)

**C1 — 16×16 Legibility** *(tier-0 dimension check)*
- 5: Dominant shape is identifiable in a 16×16 rendering; at least one distinct pixel cluster.
- 3: Shape roughly recognizable with effort.
- 1: Indistinguishable from noise at 16×16.

**C2 — SVG Scalability** *(if SVG output)*
- 5: `viewBox` set; all paths use relative coords; no hardcoded pixel values; scales cleanly to 512.
- 3: Scales but has minor precision artifacts.
- 1: Hardcoded dimensions; does not scale.

**C3 — Palette Contrast** — brand color legible against both white and dark-mode tab backgrounds.

**C4 — Simplicity Budget**
- 5: ≤3 distinct shapes; one or two colors. Reads as a clear brand mark.
- 3: 4–6 shapes; complexity slightly exceeds favicon use case.
- 1: Complex illustration that requires 16×16+ paths to render — unusable as favicon.

---

## OG Image / Hero (5 criteria)

**C1 — Composition (1200×630)**
- 5: Primary visual and any text fall within 1140×570 center safe zone; no clipping on common card previewers.
- 3: Edge elements present; some platforms will crop.
- 1: Critical content bleeds to edge.

**C2 — Text Legibility** *(OCR Levenshtein fed by tier-0)*
- 5: All rendered text OCR-matches intended string with Levenshtein ≤ 1; minimum 24px effective size.
- 4: One character substitution; text still readable.
- 3: Two errors; readable with context.
- 2: Text partially garbled.
- 1: Text unreadable or absent when required.

**C3 — Mood / Scene Match** (same as logo C4)

**C4 — Contrast Ratio** — foreground text over background achieves WCAG AA (≥ 4.5:1).

**C5 — Visual Hierarchy**
- 5: Clear primary focal point; supporting elements do not compete.
- 3: Two competing focal points.
- 1: No clear hierarchy; cluttered.

---

## Illustration (5 criteria)

**C1 — Concept Accuracy** — does the scene depict the requested subject and context?

**C2 — Style Consistency** — consistent stroke weight, rendering mode (flat/3D/line), color temperature throughout.

**C3 — Palette Accuracy** (same as logo C3)

**C4 — Subject-Background Relationship** — subject legible against background; adequate separation.

**C5 — Empty State / Use-Case Fit** — scale, orientation, and negative space appropriate for declared use case (empty state, onboarding, hero).

---

## Notes

- Score each criterion independently. Aggregate with equal weights unless the brief specifies priority (e.g., a transparent mark brief makes C2 a blocking criterion — if C2 < 3, skip all other criteria and regenerate immediately).
- Pass the tier-0 numeric outputs (bbox px, ΔE values, Levenshtein distance, alpha pixel count) as context in the VLM judge prompt. This removes ambiguity and reduces hallucination on measurable properties.
