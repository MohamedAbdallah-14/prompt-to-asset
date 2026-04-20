---
name: illustration
description: Generate an in-product illustration (empty state, onboarding, hero, spot art) that obeys a brand bundle. Uses IP-Adapter / LoRA / Recraft style_id / Flux.2 brand refs for consistency across a set; validates palette ΔE2000 and style adherence.
trigger_phrases: [illustration, empty state image, onboarding graphic, spot illustration, hero image]
---

# Illustration generation

## The consistency problem

A single illustration is easy. **A set of twelve in the same style** is the hard problem. Research 10 + 15: prompt words drift; reference images do not. Any illustration skill must inject a brand style reference at every call.

## Routing

| Model | Brand lock mechanism | Best for |
|---|---|---|
| **Flux Pro / Flux.2** | `reference_images[]` (up to 8 in Flux.2) + brand LoRA | Photoreal, stylized 3D, brand illustration sets |
| **SDXL + brand LoRA** | trained LoRA (6d recipe, ~5k steps on 20 images) | Bespoke brand style, open-weight |
| **Recraft V3** | `style_id` (brand magic) | Flat vector, editorial illustration |
| **Ideogram 3** | style codes | Loose "same vibe" — not strict lock |
| **Midjourney v6/v7** | `--sref` / `--cref` / `--mref` | Concept work; no API, community wrappers only |
| **`gpt-image-1`** | `input_image[]` | Edit / composite flows |

First illustration in a set is **human-gated**. Once approved, its style becomes the reference injected into all subsequent generations.

## Brand bundle injection

```
illustration prompt =
  [SUBJECT + SCENE from brief]
+ [style anchor: "in the style of the provided reference images"]
+ [palette: exact hex list from brand]
+ [do_not list as positive anchors: "flat matte surfaces" not "no glossy plastic"]
+ [typography reminder: "no text, no labels"]
+ [technical constraints: aspect, resolution, composition]

+ reference_images[]: [style_ref_01.png, style_ref_02.png, (prior approved illustration).png]
+ LoRA handle / style_id / --sref
```

## Prompt scaffold

```
An illustration of [SUBJECT: concrete noun phrase] in a [SCENE: clear action/context].
Composition: [centered | rule-of-thirds | off-center-left]. Subject occupies ~60% of frame.
Style: in the style of the provided reference images. Flat vector with soft gradients. 
Line weight consistent with references.
Palette strictly limited to: [#hex, #hex, #hex, #hex, #hex].
Materials: matte surfaces, soft ambient lighting, no rim lights, no lens flare.
No text, no labels, no UI elements.
[aspect ratio]. 2048x1280 resolution.
```

Drop quality modifiers on Flux (no `masterpiece, 8k` — hurts adherence). Keep them on SD.

## Post-processing

1. Background removal only if asset is spot art (use BiRefNet for soft edges).
2. Palette validation: K-means 8-color in LAB, ΔE2000 against brand palette, regenerate if max ΔE > 10.
3. Composition validation: VLM rubric check against style references.
4. Resize to target sizes (sharp premultiplied-alpha resize).

## Full-set propagation

Workflow for generating N illustrations:

1. Generate illustration #1 with the brand bundle and the brief.
2. Human gates: accept / regenerate / tweak.
3. On accept: **add illustration #1 to the style reference set.**
4. Subsequent illustrations pull the whole augmented reference set → style locks progressively tighter.
5. After 3–4 accepted illustrations, train a LoRA for even tighter lock on 20+ asset sets.

## Output
```
illustrations/
├── empty-state-projects.png
├── empty-state-tasks.png
├── onboarding-welcome.png
└── meta.json     # includes provenance + "set coherence score" across the batch
```
