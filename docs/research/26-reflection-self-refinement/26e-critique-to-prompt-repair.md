# 26e — Critique-to-Prompt Repair

## The Core Problem

A VLM critique is natural language. A generation prompt is also natural language, but structured for a specific model dialect (tag-salad for SD/SDXL, flowing prose for Flux/Imagen, quoted-string style for Ideogram, `background: "transparent"` param for gpt-image-1). Translating "the mark is too complex" into the correct model-dialect repair is the non-trivial step that no existing paper solves end-to-end for image generation.

The closest published work is **EMage** (sohambuilds/emage, 2024), which classifies issues into object-level, semantic, and structural categories, then routes to different Flux conditioning models (depth ControlNet for spatial, Canny for style, inpainting for object-level). This routing-by-issue-type is the right frame, but EMage does not handle prompt text modification — it modifies the conditioning signal.

For a prompt-to-asset pipeline, the repair must modify the **text prompt** (or SVG brief), not the conditioning signal.

---

## Repair Rules by Criterion Failure

### C1 / C2 — Mark Clarity or Safe-Zone Failure

**Diagnosis**: Subject too large, too small, or too complex for the viewing size.

**Repair strategy**:
- "too complex at 32px" → append to prompt: `"simplified geometric silhouette, maximum 3 shapes, no fine detail"`. Remove any phrases like "intricate", "detailed", "ornate".
- "subject clipped by safe zone" → prepend: `"centered composition, subject within center 75% of canvas, generous padding"`.
- For SVG mode: instruct the LLM to reduce path count to ≤5 paths, merge similar shapes, eliminate strokes thinner than 2px in SVG units.

### C2 — Alpha / Transparency Failure (API mode)

**Diagnosis**: Background pixels retained; halo/fringe.

**Repair strategy**: This is a routing failure, not a prompt failure. Do not re-prompt the same model with "transparent background" if that model's VAE is RGB-only (Imagen 3, most SD variants). Re-route to gpt-image-1 with `background: "transparent"` or Ideogram 3 Turbo with `style: "transparent"`. If re-routing is not available, flag for post-processing with BiRefNet.

**Do not**: add `"transparent background"` to the prompt for a model that cannot produce alpha. This is documented in CLAUDE.md as a known failure mode.

### C3 — Palette Accuracy Failure (ΔE2000 > 10)

**Diagnosis**: Generated colors drift from brand palette.

**Repair strategy**:
- Append the exact hex values to the prompt: `"exact color palette: #1A2B3C for primary, #F5A623 for accent"`. Most modern models (gpt-image-1, Ideogram 3, Flux) respond reasonably to hex hints in the prompt.
- For SVG mode: the LLM directly controls fill/stroke values — replace incorrect hex values in the SVG brief instructions rather than re-phrasing the prompt.
- For models that ignore hex: describe the hue in relative terms — `"deep navy, not royal blue"`, `"warm amber, not yellow"`.

### C4 — Style / Concept Match Failure

**Diagnosis**: Style drifts (e.g., requested flat geometric, got painterly) or concept missed.

**Repair strategy**:
- Isolate which adjective triggered the wrong style. Common culprits: "modern" triggers photorealism in some models; "minimal" triggers over-simplification.
- Remove the offending style word. Add a concrete style anchor: `"flat vector, solid fills, no gradients, no shadows, no textures"` for flat; `"isometric illustration, hard edges, geometric primitives"` for isometric.
- Concept miss: re-state the concept more literally. Replace metaphorical descriptions with concrete nouns. "innovation and growth" → "an upward-pointing arrow made of circuit traces".

### C5 — Text-Free Mark Failure (wordmark baked in)

**Diagnosis**: The model rendered text glyphs in the raster output.

**Repair strategy**: Add a hard negative anchor to the prompt — not `"no text"` (ignored by most models) but `"abstract mark only, no letters, no numbers, no typography, no wordmark"`. For Ideogram and gpt-image-1 which render text well, this is a prompt discipline issue. For SD/Flux, the model rarely renders legible text anyway; if it does, use the inpainting ControlNet path to remove the text region.

### OG Image C2 — Text Legibility (Levenshtein > 1)

**Diagnosis**: OCR reads a garbled string.

**Repair strategy**: This is the text-in-diffusion problem. Best approaches in priority order:
1. Generate a text-free hero image; composite real text using Canvas/Skia/SVG at the application layer. This is always correct.
2. If text must be in the raster (client constraint): use `gpt-image-1`, `gpt-image-1.5`, Ideogram 3 / Ideogram 3 Turbo, or `gemini-3-pro-image-preview` (Nano Banana Pro) — all strong-text renderers that handle short wordmarks (≤3 words / ~20 chars) reliably. Limit to ≤3 words. Pass the exact target string in the prompt as a quoted literal: `'wordmark: "Acme"'`.
3. Do not retry Flux/SD/Imagen 3/Nano Banana non-Pro for text rendering. They do not fix on retry.

---

## The Repair Prompt Structure

Following Self-Refine's two-part feedback format (problem localization + improvement instruction), each repair prompt to the LLM should have this structure:

```
[CRITIQUE SUMMARY]
Criterion: <name>
Score: <1-5>
Finding: <specific observation, including tier-0 numbers if available>

[REPAIR INSTRUCTION]
Change: <what to add, remove, or replace in the prompt>
Preserve: <what must remain unchanged>
```

The LLM then produces a revised generation prompt or SVG brief. The revised output goes through the normal generation pipeline on the next iteration.

---

## Repair vs. Re-Route Decision Tree

```
critique received
    ├── is it a routing failure (alpha, text rendering)? → re-route, do not re-prompt
    ├── is it a compositing failure (text baked in)? → flag for post-processing layer
    └── is it a prompt/composition issue? → apply repair prompt → regenerate
```

This decision tree prevents wasted iteration budget on problems that prompt changes cannot fix.

---

## References

- Madaan et al. (2023). [Self-Refine feedback structure](https://arxiv.org/abs/2303.17651).
- EMage pipeline. [GitHub: sohambuilds/emage](https://github.com/sohambuilds/emage) — routing by issue type.
- CLAUDE.md (this repo) — routing rules for alpha, text, and SVG mode.
- Gou et al. (2023). [CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing](https://arxiv.org/abs/2305.11738) — tool-augmented critique as ground truth for repair decisions.
