# Structural slot skeleton (cross-model)

Apply this shape before reaching for any model-specific template. It encodes the rules the research triangulated:

- Slot-labeled prose beats adjective stacks.
- Realistic content. No lorem ipsum.
- Quote exact text. Brand names letter-by-letter.
- Resolved hex/px values. Not token names.
- Set aspect + frame in the first sentence.

## The slot pattern

```
[Asset]      realistic <web|mobile> UI mockup
[Frame]      <iPhone 15 Pro Max with Dynamic Island | desktop browser chrome 1440×900 | Pixel 8 Pro>
[Header]     <logo "BRAND_NAME", page title "Exact Title", account avatar>
[Sidebar]    <if applicable> nav items "Dashboard", "Projects", "Reports", "Settings" with leading icons
[Main]
  Region 1   <e.g., 4 KPI cards: "Revenue $48,210" / "MRR $12,400" / "Churn 2.1%" / "ARR $148,920">
  Region 2   <e.g., area chart titled "Revenue (last 30 days)" with realistic curve, axis labels visible>
  Region 3   <e.g., recent transactions table: "Acme Corp $4,200 paid", "Globex $890 pending">
[Footer]     <optional>
[Style]      <light|dark> mode, primary #3B82F6, neutral #0F172A, sans-serif (Inter-style),
             4px blur drop shadow on cards, 12px corner radius, 16px gutters
[Aspect]     <16:9 desktop | 9:16 mobile | 4:3 tablet>
[Quality]    high. Render all text legibly. No lorem ipsum, no placeholder logos, no watermark.
```

## Universal rules baked into every template here

1. Real content, not placeholders. Diffusion renders the literal characters in the prompt.
2. Hex codes and px values, never `bg-blue-500` / `Material elevation 2` / `iOS 17 large title`.
3. Quote exact label text with double quotes.
4. Aspect ratio in the first sentence — never trust the model to pick.
5. End with: `Render all text legibly. No lorem ipsum, no placeholder logos.`

## What to drop per-model

- **Nano Banana Pro / 2**: drop "negative prompt" entirely. Use positive framing ("white background" not "no checkerboard"). Convert slot labels to `[Subject][Action][Location][Composition][Style][Editing]` bracket-tag form.
- **Flux 2 Pro/Flex**: ordinal-index references ("layout from image 1, palette from image 2"). Drop negatives.
- **gpt-image-1.5/-2**: keep slot labels with line breaks. Cookbook explicitly recommends this for complex UI.
- **Ideogram 3 Turbo**: collapse slots to 8-section structured prose. Hard cap ~150 words. Keep the `negative_prompt` — only model that respects it.
- **Midjourney v7**: don't use this skeleton — use mood/composition/`--ar`/`--sref` flags instead. Don't expect legible text.

## Validation gate before declaring done

```
- OCR Levenshtein ≤ 1 against intended labels
- Palette ΔE2000 ≤ 10 against brand bundle
- Aspect ratio exact (or crop policy applied)
- No checkerboard FFT signature
```

If any fails, regenerate (cap 6 iterations) or composite real type post-render.
