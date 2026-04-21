---
angle: 7a
category: 07-midjourney-ideogram-recraft
title: "Midjourney v6 / v6.1 / v7: Prompt Syntax, Parameters, and Workflow for Software Assets"
research_value: medium
last_updated: 2026-04-19
status: complete
primary_sources: official-midjourney + community
---

# 7a — Midjourney v6 / v6.1 / v7: Prompt Syntax, All Parameters, and Prompt Structure

**Research value: medium** — Midjourney produces some of the best-looking raster output in the industry and its parameter surface (especially `--sref`, `--cref`, `--oref`, `--stylize`, `--chaos`, `--weird`, `--style raw`, personalization) is the most battle-tested "style control" vocabulary in text-to-image. But it is a **poor fit for most software-asset work** because (a) there is no official API, (b) there is no alpha channel / transparent background, and (c) the workflow is Discord + web-UI only. We still need to understand its prompt grammar deeply, because (i) Midjourney's style vocabulary is what designers speak, and (ii) many prompt conventions we learn here transfer to Ideogram, Recraft, and Flux-based tools.

## Executive Summary

> **Updated 2026-04-21:** V8 Alpha launched March 17, 2026; V8.1 Alpha launched April 14, 2026. See the *Model timeline* bullet below.

- **Model timeline.** V6 shipped Dec 2023; V6.1 shipped Jul 2024 with sharper text rendering and ~25% faster generation ([Midjourney Updates — Version 6.1](https://updates.midjourney.com/version-6-1/)). V7 entered alpha on **April 3–4, 2025** and became the default on **June 17, 2025**. **V8 Alpha launched March 17, 2026** and V8.1 Alpha launched April 14, 2026 on alpha.midjourney.com (not yet on the main site or Discord as of 2026-04-21). V8 is ~5× faster than V7, adds native 2K HD generation (`--hd`), improved seed stability (V8.1 claims 99% identical output on same seed), and better in-prompt text rendering. See [V8 Alpha post](https://updates.midjourney.com/v8-alpha/) and [V8.1 Alpha post](https://updates.midjourney.com/v8-1-alpha/).
- **Prompt grammar.** A Midjourney prompt is a free-form natural-language string ending in zero-or-more `--parameter value` flags. The engine also understands **multi-prompts** (`concept A:: concept B` with optional `::weight`) and **permutations** (`{a, b, c}` expanded into parallel jobs) ([Multi-Prompts & Weights](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights); [Permutations](https://docs.midjourney.com/docs/permutations)).
- **Reference family.** Three reference systems cover the "anchor an image to something" use cases: `--sref` for style, `--cref` for characters (v6+), and `--oref` for omni-reference of any object/character/vehicle/creature (v7 only) ([Omni-Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)).
- **Style control axes.** `--stylize` (0–1000) controls creative license, `--chaos` (0–100) controls variety across the four grid tiles, `--weird` (0–3000) pushes into unusual aesthetics, and `--style raw` disables Midjourney's automatic "prettification" so prompts read more literally (best for photo + product work) ([Stylize](https://docs.midjourney.com/docs/stylize); [Weird](https://docs.midjourney.com/docs/weird-1); [Raw Mode / Style Raw](https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw-Mode-Style-Raw)).
- **Software-asset fit.** Midjourney is great for: **marketing illustrations, hero banners, OG images, mood concepts, brand-style exploration**. It is poor for: **logos (no vector output, no transparency), app icons (no safe-zone control), favicons (no true alpha), anything requiring programmatic generation (no API)** ([Transparify workaround writeup](https://transparify.app/blog/midjourney-transparent-background); [Midjourney API guide](https://www.aifreeapi.com/en/posts/midjourney-api-guide)).

## Parameter Reference Table

All parameters are suffix flags appended to the end of the prompt, separated by whitespace, no punctuation. Decimal weights require model v4+ ([Parameter List](https://docs.midjourney.com/docs/parameter-list); [Multi-Prompts & Weights](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights)).

| Parameter | Alias | Range / Values | Default | What it does | Works in |
|---|---|---|---|---|---|
| `--version N` | `--v N` | `5.2`, `6`, `6.1`, `7`, `8` | current default | Selects base model. V7 became default 2025-06-17; V8 Alpha available on alpha.midjourney.com as of 2026-03-17. | all |
| `--niji N` | — | `4`, `5`, `6`, `7` | — | Selects the anime-specialist Niji model; mutually exclusive with `--v`. Niji 7 launched Jan 2026 ([Niji V7 guide](https://niji-v7.com/)). | all |
| `--aspect W:H` | `--ar W:H` | integers only, no decimals | `1:1` | Aspect ratio. Common: `1:1`, `3:2`, `16:9`, `9:16`, `4:5`, `2:3` ([Aspect Ratio](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio)). | all |
| `--stylize N` | `--s N` | `0`–`1000` | `100` | Higher = more creative license, less literal. `--s 0` gives the most prompt-faithful, near-photo result. | all |
| `--chaos N` | `--c N` | `0`–`100` | `0` | Variety across the 4-up grid. `--c 50` gives genuinely different variants, `--c 100` can break structure. | all |
| `--weird N` | `--w N` | `0`–`3000` | `0` | Off-kilter / avant-garde aesthetic; not seed-stable. Useful for generating moodboard oddities, not brand work. | v5+, v6, v7 |
| `--tile` | — | flag | off | Forces seamless edge continuity so the output tiles as a pattern. Avoid upscaling — it breaks the seam. ([Tile](https://docs.midjourney.com/docs/tile)) | all |
| `--no X, Y` | — | list | — | Negative prompt. Equivalent to adding `X::-0.5 Y::-0.5` via multi-prompt weights. | all |
| `--seed N` | — | 0–4,294,967,295 | random | Re-run with same seed for near-identical composition. V8.1 Alpha claims 99% seed stability; V7 is close but not byte-identical. | all |
| `--quality N` | `--q N` | v7: `1`, `2`, `4`; v8: `1`, `4` | `1` | Multiplies GPU spend on initial 4-up. Does not affect variations/upscales/inpaint. ([Quality](https://docs.midjourney.com/docs/quality)) | all |
| `--style raw` | `--raw` | flag | off | Turns off Midjourney's automatic aesthetic "boosters". Best for photorealism, product shots, and literal prompt interpretation. v5.1+. | v5.1+, v6, v7 |
| `--style <preset>` | — | e.g. `--niji --style expressive/cute/original/scenic`; v7 has fewer presets than v6 | — | Predefined style flavors (mostly on Niji). | varies |
| `--sref URL…` / `--sref CODE` / `--sref random` | — | one or more URLs, numeric style codes, or `random` | — | Style reference (v6+). Anchor the look/palette/brushwork. `--sref random` returns a numeric style code you can save. | v6, v6.1, v7 |
| `--sw N` | — | `0`–`1000` | `100` | Style-reference weight. `--sw 0` disables the style-ref; `--sw 1000` is maximum adherence. | v6, v6.1, v7 |
| `--cref URL` | — | one URL | — | Character reference — keeps a character identity stable across generations. v6+. | v6, v6.1, v7 |
| `--cw N` | — | `0`–`100` | `100` | Character weight. `100` locks face + hair + clothing; `0` keeps only the face, lets outfit/pose vary freely. | v6, v6.1, v7 |
| `--oref URL` | — | one URL | — | **Omni-Reference** (v7 only). "Put THIS in my image" for any character, object, vehicle, or creature. ([Omni-Reference docs](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)) | v7 |
| `--ow N` | — | `1`–`1000` | `100` | Omni-weight. 1–25 for style transfer with strong reinterpretation; 400+ for near-identical fidelity. Costs 2× GPU time. | v7 |
| `--iw N` | — | `0`–`3` (v7) | `1` | Image-prompt weight. How much an image URL passed as a prompt influences the output. `0` = ignore the image; `3` = follow it tightly. ([Image Prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts)) | all |
| `--draft` | — | flag | off | **Draft Mode** (v7). 10× faster, 50% cheaper, same aesthetic behavior at roughly q 0.25. Good for brainstorming; incompatible with `--oref`. | v7 |
| `--exp N` | — | 0–100+ (experimental) | — | Experimental aesthetic booster introduced in v7 update — adds dynamic range and richness. Expect behavior to churn. ([V7 update, editor, --exp](https://updates.midjourney.com/v7-update-editor-and-exp/)) | v7 |
| `--p <profile_id>` | — | personalization profile code | user's default | Applies a personalization profile built from user ratings / moodboards. V7 has personalization **on by default**. ([Personalization](https://docs.midjourney.com/hc/en-us/articles/32433330574221-Personalization)) | v6+, v7 |
| `--stop N` | — | 10–100 | 100 | Stops the diffusion early; yields softer, less-detailed results. | all |
| `--repeat N` | `--r N` | plan-dependent | 1 | Runs the same prompt N times in parallel. Basic: up to 4; Pro/Mega: up to 40. | all |

**Multi-prompt weights** (`::`): `space::2 ship` makes "space" twice as important as "ship"; `vibrant tulip fields --no red` is equivalent to `vibrant tulip fields:: red::-0.5`. Total weight sum must be positive or the prompt errors. ([Multi-Prompts & Weights](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights))

**Permutations** (`{}`): `a {red, green, yellow} bird` fans out into three jobs; `--ar {1:1, 16:9}` fans out into two aspect ratios; nested braces work. Caps by plan: Basic 4, Standard 10, Pro/Mega 40, and only in Fast/Turbo (not Relax). ([Permutations](https://docs.midjourney.com/docs/permutations))

## Prompt Structure Patterns

Midjourney is more forgiving than Imagen about prompt grammar — it accepts comma-salad, but the **ordering of clauses still matters** because the model pays more attention to tokens near the start. Over 2024–2026 a consensus structure has crystallized in the Show-and-Tell and community-blog corpus.

### Recommended scaffold (v6.1 / v7)

```text
<medium / form>, <subject + subject detail>, <environment / context>,
<composition / camera>, <lighting>, <mood>, <style anchors>
 --ar <ratio> --v 7 --style raw --s <N> --sref <…> --no <…>
```

Worked examples:

```text
cinematic product photograph of a minimalist stainless-steel water bottle,
on a dewy basalt rock, shallow sunrise light rim-lighting the handle,
soft mist, volumetric, clean commercial look, Pentax 67 85mm f/2.4
 --ar 4:5 --v 7 --style raw --s 50 --no text, logo, watermark
```

```text
flat vector illustration of an empty-state for a tasks app,
friendly character hugging an oversized checkmark, pastel mint + peach palette,
soft rounded shapes, minimalist geometric, editorial illustration
 --ar 3:2 --v 7 --s 250 --sref 3521476892 --no gradient, dropshadow, photographic
```

### The "five-block modular" pattern

A pattern popularized on the MJ v7 prompting blogs treats references as **sticky anchors** and text as the variable layer, so you can iterate without drifting ([Rephrase — cref / sref stability](https://rephrase-it.com/blog/midjourney-v7-prompting-that-actually-sticks-using-cref-sref)):

1. **Identity anchor** — `--cref <url>` (or `--oref` in v7)
2. **Style anchor** — `--sref <code or url>` + `--sw N`
3. **Subject + shot** — "woman in red coat, mid-shot, turning toward camera"
4. **Constraints** — `--no text, logo, extra fingers`
5. **Parameters** — `--ar`, `--v`, `--s`, `--style raw`, `--q`

Because MJ does not accept system prompts, this "every prompt is self-contained" pattern is the closest thing to brand-consistent templating.

### Stylize as a lever, not a default

Cookbook guidance across 2024–2026 converges on:

- `--s 0` … `--s 50` — photography, product shots, strict prompt adherence, `--style raw` recommended.
- `--s 100` — Midjourney's default; balanced.
- `--s 250` … `--s 500` — editorial illustration, posters, "stylized" work.
- `--s 750` … `--s 1000` — Midjourney takes over; use only when you want "surprise me" moodboards.

`--chaos` and `--stylize` are **independent axes** — chaos changes the four tiles' variety for the same prompt; stylize changes how literal the interpretation is. You can hold one fixed and sweep the other with a permutation: `foo --s {0,50,250,750} --c 10`.

### Niji vs main model

Niji 7 is the anime-oriented sibling; v7 main model now handles anime decently but Niji still wins on linework and eye detail ([Niji V7 guide](https://niji-v7.com/)). Use `--niji 7` for clean manga / 2D animation; use `--v 7` + an sref for stylized-but-not-anime illustration.

## Style-Reference Workflows

`--sref` is the single most important Midjourney feature for building **brand-consistent asset sets**. Three workflows matter for a prompt-to-asset product:

### A. Anchor-image `sref`

Pass 1–3 URLs that exemplify the look. MJ extracts a **style fingerprint** (palette, brushwork, lighting, texture) and applies it, ignoring the images' subject content:

```text
friendly monster mascot, front view, waving
 --sref https://cdn.example.com/brand/hero1.jpg https://cdn.example.com/brand/hero2.jpg
 --sw 250 --v 7
```

Relative weights for multiple refs use `::`: `--sref urlA::2 urlB::3 urlC::5` ([Style Reference docs](https://docs.midjourney.com/docs/style-reference)).

### B. Numeric `sref` codes

Every style reference Midjourney ever computes is backed by a **numeric code**, billions in the address space. Users discover codes two ways:

1. **`--sref random`** — MJ substitutes `random` with a newly-generated numeric code and shows it in the job metadata. Save the ones you like.
2. **Community libraries** — Gumroad, Midlibrary, and sref-focused blogs catalog curated code collections (e.g. [Midlibrary deep-dive](https://midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes), [Woollyfern SREF Random Library](https://www.woollyferncreative.com/blog/2024/05/28/midjourney-sref-random-styles-library/)).

You can then build a brand system like this:

```text
/imagine logo mark of a fox head, geometric --sref 2934811076 --sw 300 --v 6.1 --ar 1:1
/imagine illustration of two people reviewing a dashboard --sref 2934811076 --sw 300 --v 6.1 --ar 16:9
/imagine social card banner, abstract shapes --sref 2934811076 --sw 200 --v 6.1 --ar 1200:630
```

Because the `sref` code is a compact integer, it can be **persisted as a brand-style token** in an asset-pipeline database — this is how we would let an enhancer remember "the brand look" across generations.

### C. Moodboards (v6.1+, native in v7)

Moodboards upgrade the `sref` workflow to a **named bag of reference images** managed in midjourney.com. You upload images, Midjourney stabilizes them into a personalization profile (~40 ratings, stabilizes at ~200), and then every prompt uses that profile unless you opt out. Moodboards can also be combined with a separate `--sref` for the job ([Profiles and Moodboards](https://updates.midjourney.com/profiles-and-moodboards/)). v7 ships with personalization on by default, which is why many users report v7 prompts "just look different" than the same prompt on v6.

### Stacking references in v7

v7 is the first version where `--sref`, `--cref`/`--oref`, moodboard, and `--p` profile can all be active simultaneously. Practical recipe for a repeatable asset set:

```text
<prompt> --sref <brand code> --sw 200 --oref <product.png> --ow 150 --ar 3:2 --v 7 --style raw --s 100
```

The `ow` / `sw` / `cw` weights are interdependent — community guidance says set one at a time, sweep it, lock the preferred value, then sweep the next ([Reference parameters deep dive](https://readmedium.com/midjourney-v6-1-i-wish-i-had-figured-this-out-earlier-the-art-of-reference-parameters-9b2c4d08142a)).

## Asset-Specific Use Cases

### Logos

Midjourney produces beautiful **brand-concept boards** but the output is always a raster image with an opaque background. Good prompting pattern:

```text
minimalist logo mark of a <symbol>, flat vector style, negative space,
two-color palette navy #0B1F3B and coral #FF5A5F, clean sans-serif wordmark "JOURNEY",
centered composition, white background
 --v 7 --style raw --s 50 --ar 1:1 --no gradient, shading, drop shadow, 3d, photographic
```

Why it often fails:
- **Wordmark letters drift** — even v6.1/v7 misspell words longer than ~10 chars. Keep text short; regenerate many variants (permutation on chaos); use an Ideogram or GPT-Image pass for precise lettering.
- **"Centered on white" is not transparent** — run background removal (rembg/BiRefNet) or the two-tone alpha-recovery trick (generate same seed on pure white + pure black, diff to compute alpha — see [Transparify writeup](https://transparify.app/blog/midjourney-transparent-background)).
- **Not vector** — raster→SVG via vtracer/potrace after BG removal. Fine lines, gradients, and organic shapes vectorize poorly.

Rule of thumb: **use MJ for logo ideation, not logo delivery.** Delivery should go through Recraft or a vector-native step (covered in 7c / 12).

### Illustrations, empty states, onboarding art

MJ v7 is arguably the best-in-class generator for **editorial-style illustrations** — exactly the kind of empty-state / onboarding / marketing graphics a SaaS needs. Pattern:

```text
editorial illustration of <scene>, flat shapes, subtle grain, soft ambient occlusion,
limited palette <3 colors>, modern friendly characters with simple facial features
 --sref <brand code> --sw 250 --v 7 --s 250 --ar 3:2 --no photorealistic, gradient mesh, 3d render
```

Empty-state convention: leave copy-space on one side; `--ar 4:3` or `16:9` works for in-app hero regions.

### Hero images / OG / social cards

MJ's strength. `--style raw` + `--s 0..50` for photorealistic; otherwise stylized. For OG cards use `--ar 1200:630`; MJ will simplify to `40:21` or similar.

### App icons

Do **not** generate directly with MJ for final delivery. The iOS HIG safe-zone, corner radius, and @1x/@2x/@3x export all require a vector/raster pipeline (see 09, 18). MJ is only useful for **icon concepting**, and even then results usually need the `--tile` patterns disabled and `--style raw --s 50` to keep things geometric.

### Favicons

MJ is the wrong tool — 16×16 / 32×32 sizing, pixel hinting, and transparency are all outside its competence. Covered properly in 11.

### Patterns / backgrounds / textures

`--tile` plus `--ar 1:1` produces seamless repeats. This is a real MJ strength for **login-screen patterns, email headers, hero-background textures**. Example: `subtle geometric navy grid pattern, low contrast --tile --ar 1:1 --v 7 --s 50`.

## Limitations for Software Assets

- **No alpha channel.** Midjourney emits RGB JPEG/PNG only. "Transparent background" in the prompt yields a **checkerboard texture painted into the image** — exactly the failure mode this product must avoid. Treat MJ output as "needs BG-removal pass" by default. ([Dupple — can MJ make transparent photos?](https://www.dupple.com/blog/can-midjourney-make-transparent-photos); [Transparify — alpha recovery](https://transparify.app/blog/midjourney-transparent-background))
- **No vector / SVG output.** Raster only. Vector must come from downstream tracing or by routing logo/icon work to Recraft.
- **Text rendering patchy.** v6.1 was a major step forward, v7 better still, but >10–15 characters, decorative fonts, or long wordmarks routinely corrupt. For guaranteed text, use Ideogram (covered in 7b) or `gpt-image-1` with a specific font family.
- **No official public API.** As of 2026-04, Midjourney has no publicly available API. Enterprise customers can negotiate custom API access through Midjourney's sales team (pricing starts ~$500/month per reports), but there is no self-serve API key, REST endpoint, or SDK for standard plans. Third-party wrappers (Legnext, ImagineAPI, useapi, GoAPI) reverse-engineer the Discord bot protocol and violate ToS in spirit. A production prompt-to-asset cannot cleanly integrate MJ server-side. ([AIFreeAPI — MJ API truth](https://www.aifreeapi.com/en/posts/midjourney-api-guide); [Legnext MJ API](https://legnext.ai/blog/how-to-use-midjourney-api-without-discord))
- **Discord- and web-only workflows.** Batch generation, consistent seeds across hundreds of assets, and automated A/B pipelines all require the Alpha website at [midjourney.com](https://midjourney.com) (requires 1,000+ images generated to unlock) and still sit behind a Discord login.
- **Personalization on by default (v7).** Great for individual creatives, hostile to deterministic brand pipelines: two accounts running the same prompt get different results. Turn off profiles (`/settings`) when building a reproducible brand style, or commit to one account per brand.
- **`--oref` incompatibilities.** Omni-Reference (v7) is **not compatible with Draft Mode, Fast Mode, inpainting, or outpainting**, and costs 2× GPU time ([Omni-Reference docs](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)). This limits agentic workflows that want to iterate cheaply.
- **Permutation caps.** Basic plan only gets 4 permutations per prompt; Standard 10; Pro/Mega 40. Relax Mode disables permutations entirely. Agentic fan-out is therefore plan-gated.
- **Content filters.** Midjourney is stricter than SD/Flux and less deterministic than OpenAI's moderation — prompts with brand names, celebrities, and sensitive topics silently degrade or refuse. Brand-safe prompt enhancement must pre-filter.

## Takeaways for the Prompt Enhancer

1. **Ship an `sref` catalog.** If the user says "here is my brand", store a numeric `--sref` code plus an `--sw` default. Any MJ-targeted prompt the enhancer emits should inject those automatically. This is the single highest-leverage pattern MJ offers.
2. **Enforce the scaffold.** For v6.1/v7 the enhancer should always emit `<medium>, <subject>, <environment>, <composition>, <lighting>, <mood>, <style anchors> --ar … --v 7 --style raw --s N`. This format empirically beats free-form English on both fidelity and reproducibility.
3. **Route by asset type.** Enhancer should classify the request before picking the model: **illustration/hero/pattern → Midjourney ok; logo/icon/favicon → Recraft/Ideogram/GPT-Image**; and explicitly warn users that MJ output will need background removal.
4. **Don't expose MJ as a server-side generator.** Without an API, MJ is a human-in-the-loop tool; the enhancer should emit ready-to-paste Midjourney prompts rather than attempt to call a third-party bridge.
5. **Default `--style raw --s 50`** for any product/photography request; default `--s 250` for illustrations; never emit `--s 750+` unless the user explicitly asks for surreal / moodboard / "surprise me".

## References

### Official Midjourney docs
- [Parameter List](https://docs.midjourney.com/docs/parameter-list)
- [Aspect Ratio](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio)
- [Stylize](https://docs.midjourney.com/docs/stylize)
- [Weird](https://docs.midjourney.com/docs/weird-1)
- [Tile](https://docs.midjourney.com/docs/tile)
- [Quality](https://docs.midjourney.com/docs/quality)
- [Raw Mode / Style Raw](https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw-Mode-Style-Raw)
- [Style Reference](https://docs.midjourney.com/docs/style-reference)
- [Character Reference](https://docs.midjourney.com/hc/en-us/articles/32162917505293-Character-Reference)
- [Omni-Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)
- [Personalization](https://docs.midjourney.com/hc/en-us/articles/32433330574221-Personalization)
- [Draft & Conversational Modes](https://docs.midjourney.com/hc/en-us/articles/35577175650957-Draft-Mode)
- [Multi-Prompts & Weights](https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights)
- [Permutations](https://docs.midjourney.com/docs/permutations)
- [Image Prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts)

### Midjourney release / update posts
- [Version 6.1](https://updates.midjourney.com/version-6-1/)
- [V7 Alpha](https://updates.midjourney.com/v7-alpha/)
- [V7 update, editor, and --exp](https://updates.midjourney.com/v7-update-editor-and-exp/)
- [V8 Alpha (Mar 17, 2026)](https://updates.midjourney.com/v8-alpha/)
- [V8.1 Alpha (Apr 14, 2026)](https://updates.midjourney.com/v8-1-alpha/)
- [Profiles and Moodboards](https://updates.midjourney.com/profiles-and-moodboards/)
- [Omni-Reference --oref announcement](https://updates.midjourney.com/omni-reference-oref/)

### Press coverage
- [TechCrunch — Midjourney releases V7 (Apr 3, 2025)](https://techcrunch.com/2025/04/03/midjourney-releases-its-first-new-ai-image-model-in-nearly-a-year)
- [Engadget — V7 launch coverage](https://www.engadget.com/ai/midjourney-launches-its-new-v7-ai-image-model-that-can-process-text-prompts-better-134546883.html)
- [ITC.ua — V7 draft mode](https://itc.ua/en/news/midjourney-updated-to-v7-cheap-draft-mode-and-10x-faster-image-generation/)

### Community / how-to
- [Rephrase — v7 --cref/--sref that sticks](https://rephrase-it.com/blog/midjourney-v7-prompting-that-actually-sticks-using-cref-sref)
- [JourneyAIArt — V6.1 vs V6 detailed comparison](https://journeyaiart.com/blog-advanced-midjourney-v61-guide-a-detailed-comparison-with-v6-45113)
- [Midlibrary — SREF codes deep dive](https://midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes)
- [Woollyfern — SREF Random Library](https://www.woollyferncreative.com/blog/2024/05/28/midjourney-sref-random-styles-library/)
- [Readmedium — reference parameters (sw/cw/ow interaction)](https://readmedium.com/midjourney-v6-1-i-wish-i-had-figured-this-out-earlier-the-art-of-reference-parameters-9b2c4d08142a)
- [Niji V7 guide](https://niji-v7.com/)
- [MJSplitter — image weight (--iw)](https://www.mjsplitter.com/blog/how-to-adjust-image-weight-midjourney-iw)
- [RuntheprompTs — V7 parameter cheat sheet](https://runtheprompts.com/resources/midjourney-info/midjourney-parameter-cheat-sheet-v7/)

### Limitations & workarounds
- [Transparify — MJ → transparent PNG alpha-recovery technique](https://transparify.app/blog/midjourney-transparent-background)
- [Dupple — Can Midjourney make transparent photos?](https://www.dupple.com/blog/can-midjourney-make-transparent-photos)
- [AIFreeAPI — the truth about MJ API access](https://www.aifreeapi.com/en/posts/midjourney-api-guide)
- [Legnext — how to use MJ "API" without Discord](https://legnext.ai/blog/how-to-use-midjourney-api-without-discord)
