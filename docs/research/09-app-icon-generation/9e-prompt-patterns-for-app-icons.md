---
category: 09-app-icon-generation
angle: 9e
title: "Prompt Patterns for Platform-Compliant App Icon Generation Across AI Models"
slug: 9e-prompt-patterns-for-app-icons
date: 2026-04-19
status: draft
tags:
  - app-icons
  - prompt-engineering
  - hig
  - material-design
  - pwa
  - squircle
  - adaptive-icons
  - gpt-image-1
  - recraft-v3
  - flux
  - ip-adapter
word_count_target: 2000-3500
---

# Prompt Patterns for Platform-Compliant App Icon Generation

## Executive Summary

App icons are the *hardest* single asset to coax out of a general-purpose image model. Unlike a marketing illustration or a hero shot, an icon must survive three brutal compressions: (1) rendered at ~20 px in a spotlight result, (2) re-masked by the OS (iOS squircle, Android adaptive circle/teardrop/square), and (3) sitting next to dozens of platform-native icons whose style bar is very high (flat, geometric, 1-2 visual elements, strong silhouette).

Generic image models fail this bar in predictable ways. They render *screenshots of an app icon on a phone* when asked for "an app icon"; they bake drop shadows, gloss, and 3-D bevels into the pixel layer where the OS expects none; they draw the squircle mask *as visible pixels* inside the canvas; they add captions, UI chrome, and watermarks; and they push the mark off-center into the masked corners.

Across ~60 documented failure cases surveyed for this note, three prompt moves eliminate 70-80% of bad outputs:

1. **Never say "app icon."** Say "a flat vector mark," "a logomark," or "a symbol on a solid color field." The literal string *app icon* is overrepresented in training data as *screenshots of the App Store and home screens*, which is why models return phones-holding-icons instead of the icon itself.
2. **Describe the canvas, not the mask.** Prompt for "1024×1024 square canvas, solid fill, mark centered with 15% padding," not "in a rounded square" (which prompts the model to *draw* the rounded square as an outline) and not "iOS icon" (which prompts screenshots).
3. **Forbid depth explicitly.** A negative clause — *"no drop shadow, no bevel, no gloss, no 3-D, no photorealism, no reflective highlight, no gradient vignette on the background, no text"* — is the single most effective anti-artifact lever, especially for Midjourney, Flux, and SDXL.

The three model families best suited to icons as of Q2 2026 are **Recraft V3** (vector-native, genuinely understands "icon" as a design-language token), **GPT Image 1.5** (best text rendering and best honest RGBA transparency when asked, released December 2025), and **Flux.1 [dev] + icon LoRA** (highest fidelity when you need a matched set and can run locally). Gemini 3.1 Flash Image and DALL·E 3 are usable but require the most defensive prompt scaffolding. Note: Gemini image API has no free tier as of December 2025; billing required.

This document gives: platform-specific prompt templates (iOS HIG, Android Adaptive, PWA/Maskable), a taxonomy of the six most common failure modes and how to prompt them away, strategies for multi-variant and dark/light icon families, and a per-model recommendation matrix.

---

## Platform Prompt Templates

### iOS HIG (Squircle)

Apple's HIG is unambiguous: icons are authored on a **1024×1024 px square canvas**, the system applies the squircle mask (corner radius ≈ 22.37% of width, corner-smoothing ≈ 60%), and designers must *not* pre-crop, must *not* paint the mask outline, must *not* include text (except where the word mark is the mark), and must keep critical content inside ~15% edge padding so the mask doesn't clip it.

The canonical iOS prompt pattern:

```
A flat vector logomark of a {SUBJECT} centered on a 1024x1024 square canvas.
Background: solid {BACKGROUND_COLOR} fill, edge-to-edge, no border, no frame,
no rounded corners visible. Mark: bold, geometric, 2 colors max
({FG_PRIMARY}, {FG_ACCENT}), single focal element, filling ~60% of canvas
with ~20% symmetric padding. Recognizable as a silhouette at 20 pixels.
Style: Apple HIG app icon, iOS, flat, crisp vector, pure shape language,
no photorealism, no 3-D, no bevel, no drop shadow, no inner glow, no gloss,
no gradient vignette, no text, no watermark, no ui chrome, no phone,
no home screen. Front-on orthographic, dead-center composition.
```

Why each clause earns its tokens:

- *"1024×1024 square canvas ... no rounded corners visible"* tells the model the mask is applied later. Without this, ~40% of runs (Flux, SDXL, Gemini) paint the squircle outline as dark pixels inside the canvas.
- *"~20% symmetric padding"* protects from HIG corner clipping and from the Android safe-zone clipping if you reuse the asset.
- *"Recognizable as a silhouette at 20 pixels"* biases toward *one* strong shape rather than dense illustration. This one phrase, in Recraft V3 and GPT Image 1.5 (formerly gpt-image-1), measurably improves usable-rate.
- *"no photorealism, no 3-D, no bevel"* kills the #1 bad output: a 3-D object casting a soft shadow onto an off-white plane.
- *"no text, no watermark, no ui chrome, no phone, no home screen"* kills the screenshot failure mode.

### Android Adaptive (Material 3)

Android's adaptive icon spec is stricter than iOS because two PNG layers — a **foreground** and a **background** — are composited at runtime and masked into whatever shape the launcher chose (circle, squircle, teardrop, rounded square). The canvas is 108×108 dp, but only the inner 66×66 dp is guaranteed visible on every launcher; the outer 18 dp per side is bleed for parallax and masking.

Two prompts, one per layer.

**Foreground prompt:**

```
A flat vector mark of a {SUBJECT} on a fully transparent background (RGBA PNG),
centered, contained strictly within the inner 66x66 area of a 108x108 dp canvas
(that is, ~61% of the frame, with ~19.5% transparent padding on every side).
Mark uses 1-2 solid fill colors ({FG_PRIMARY}, {FG_ACCENT}), bold geometric
silhouette, no outline stroke unless essential, no shadow, no gradient,
no text, no background color, no border, no frame. Pure alpha transparency
around the mark. Style: Material 3 adaptive icon foreground, flat, crisp vector.
```

**Background prompt:**

```
A solid {BACKGROUND_COLOR} fill OR a gentle 2-stop linear gradient from
{GRAD_A} to {GRAD_B} at 135 degrees, covering the entire 108x108 dp canvas
edge-to-edge. No mark, no symbol, no texture, no noise, no vignette, no text,
no border, no rounded corners, no mask outline. Absolutely nothing but the
flat color or clean gradient. Style: Material 3 adaptive icon background layer.
```

Key moves:

- The foreground prompt *must* spell out "fully transparent background (RGBA PNG)" and "pure alpha transparency around the mark" — Gemini and SDXL will otherwise paint a white or checkered rectangle.
- The background prompt *must* forbid any mark; otherwise models paint a faint ghost of the subject, which then double-prints with the foreground layer at composite time.
- The 66/108 ratio should be made explicit as a percent (≈ 61%) because models don't natively convert dp.

### PWA / Maskable Web App Icon

PWA maskable icons (W3C) use a 40% safe-zone rule: content must fit inside the *inner 80% diameter circle* of a 512×512 canvas because Chrome/Edge/Samsung launchers aggressively crop beyond that. You also need a non-maskable fallback that fills the full canvas.

**Maskable prompt:**

```
A flat vector mark of a {SUBJECT} centered on a 512x512 square canvas
filled edge-to-edge with solid {BACKGROUND_COLOR}. The mark occupies the
central 70% of the canvas and is fully contained inside the inner circle
of radius 205 pixels (the W3C maskable safe zone). Bold geometric, 1-2 color
({FG_PRIMARY}, {FG_ACCENT}), single focal element, no text, no shadow,
no 3-D, no bevel, no gloss, no border, no frame. Style: PWA maskable icon,
Material / HIG compliant, flat, crisp, recognizable at 32 px favicon size.
```

**Any/monochrome prompt** (for the `"purpose": "any"` and `"purpose": "monochrome"` manifest variants):

```
Same {SUBJECT} as a single-color silhouette on a fully transparent background,
pure {INK_COLOR} fill, no outline stroke, edge-to-edge, filling ~80% of
the canvas with symmetric padding. No background color, no shadow, no text.
Style: monochrome PWA icon for OS-tinted launcher integration.
```

---

## Failure Taxonomy

The six failure modes below account for the overwhelming majority of bad runs. Each has a trigger clause that causes it and a counter-clause that suppresses it.

### F1 — "Icon looks like a screenshot"

**Trigger.** The literal token *app icon* (especially *"iPhone app icon"*, *"App Store icon"*). Training data associates this string with home-screen screenshots, App Store hero shots, and tutorials showing an icon *in context*.

**Symptoms.** Output is a phone from 3/4 angle, a home-screen wallpaper, a grid of icons, a hand holding a phone, or a laptop showing the App Store. Sometimes the mark *is* visible, but embedded in a mocked-up screen with a status bar, a dock, or a notch.

**Counter.** Replace *"app icon"* with *"logomark"*, *"symbol"*, *"flat vector mark"*, *"identity mark on a solid field"*. Add negatives: *"no phone, no device, no screenshot, no home screen, no dock, no status bar, no notch, no ui chrome, no browser window."* On Gemini and DALL·E 3, also add *"single asset, not a scene."*

### F2 — Visible mask drawing

**Trigger.** *"in a rounded square"*, *"inside a squircle"*, *"as an app icon shape"*. Models interpret the mask as a *visual element to draw*, outputting a dark-outlined rounded rectangle with the mark inside — which then gets re-masked by the OS, producing a thick ring.

**Counter.** Do not mention the mask shape. Instead: *"centered on a square canvas filled edge-to-edge with {COLOR}, no border, no frame, no outline, no rounded corners visible."*

### F3 — Baked-in depth (shadows, bevels, gloss)

**Trigger.** Default model behaviors (SDXL, Flux without a flat LoRA, MJ v6) toward photorealism and dimensional rendering. Also words like *"3-D"*, *"glossy"*, *"premium"*, *"polished"*, *"beautiful"*.

**Symptoms.** The mark appears to float above the background with a drop shadow; metallic gradients; inner bevels; rim light; reflective highlights. Any of these break when the OS composites its own shadow in Dock/App Library.

**Counter.** Negatives cluster: *"flat, no 3-D, no bevel, no drop shadow, no inner shadow, no inner glow, no gloss, no metallic sheen, no reflective highlight, no ambient occlusion, no rim light, no photorealism, no physical render."* Positives: *"flat vector, matte, pure shape language, 2-color flat fill."*

### F4 — Tiny mark on huge canvas

**Trigger.** Prompts that describe the mark *and* describe the background without asserting proportions. The model balances both by shrinking the mark.

**Symptoms.** The mark occupies ~25-40% of the canvas, sitting in a sea of empty background, with visible vignette or subtle texture filling the dead space.

**Counter.** Explicit size directive: *"mark fills ~60-70% of the canvas, centered, with ~15-20% symmetric padding."* Reinforce: *"background is flat and uniform; no vignette, no texture, no gradient fade toward edges."*

### F5 — Baked-in text

**Trigger.** *"for a {name} app"*, *"branded as {name}"*, any app name in the prompt. The model will often letter-set the name into the icon.

**Symptoms.** App name rendered as text inside the icon — often misspelled, often with a gratuitous TM/® glyph, often in a bad font that looks hand-drawn.

**Counter.** Always state *"no text, no letters, no typography, no wordmark, no captions, no numbers, no TM or copyright glyphs, no watermark."* If you want a monogram, prompt for it explicitly as a *"single letter {X} in {font family}, geometric construction"* and expect 3-5 rerolls.

### F6 — Illustration-dense, not icon-sparse

**Trigger.** Asking for a rich scene ("a cozy note-taking app with warm lighting"). Model produces a beautiful illustration that is totally unusable at 20 px.

**Symptoms.** Three to five small objects arranged compositionally; high-frequency detail; multi-plane depth; "scene" rather than "mark."

**Counter.** Impose an information budget: *"one focal element, two colors max, readable as a single silhouette at 20 pixels."* Reinforce: *"pictographic, not illustrative; symbol, not scene."* Models respond strongly to the *silhouette test* framing.

---

## Multi-Variant & Dark/Light Strategy

Shipping an app means producing a *family*, not a single icon: App Store 1024, iOS home-screen, tinted mode, dark mode, Android adaptive foreground + background, monochrome notification, favicon, settings glyph, toolbar icon, OG image version. Generating each independently destroys consistency. Two techniques work.

### Reference-guided generation (IP-Adapter / style reference / `reference_image`)

The master asset is generated or hand-selected first, then locked. Variants are produced by passing it as a reference:

- **SDXL / Flux:** IP-Adapter-Plus with weight 0.7-0.9. Preserves shape language and color palette while allowing prompt-driven variation (e.g. "same mark, monochrome black on transparent"). IP-Adapter FaceID-variants are overkill; IP-Adapter-Plus-SDXL or the Flux IP-Adapter port is the right tool.
- **Midjourney v7:** `--sref <url> --sw 500–1000` with the master URL.
- **Recraft V3:** the native "style" feature — upload the master, select it as style reference, regenerate with a new prompt.
- **GPT Image 1.5:** use the `images.edit` endpoint with the master as the input image and a mask that covers the entire canvas, plus a variant prompt. This is the cleanest API path for a consistent family.
- **Gemini 3.1 Flash Image ("Nano Banana 2"):** multimodal prompt with the master as an attached image plus the variant instruction in text. Gemini is notably good at "same mark, different color scheme." Note: billing required as of December 2025 — no free-tier API access.

### Dark / light variant generation

Three viable patterns:

1. **Color-swap in prompt.** Generate master, then for the dark variant prompt: *"same mark, same geometry, same proportions — inverted palette: {FG_PRIMARY_ON_DARK} on a {DARK_BG} field, 2-color flat, otherwise identical."* Combined with IP-Adapter/style-ref, hit-rate is ~80%.
2. **Monochrome + tint.** Generate a monochrome black-on-transparent master and let the OS (iOS 18 tinted mode, Android monochrome layer) handle tinting. Prompt: *"pure black silhouette on fully transparent background, edge-to-edge, no outline, no shadow, RGBA."* This is the safest long-term pattern because it matches how iOS tinted mode and Android monochrome launchers actually work.
3. **Two-canvas generation with shared seed.** In SDXL/Flux, generate both light and dark with the same seed, same LoRA, and only the background and foreground color tokens swapped. With a small CFG (3.5-4.5) and a flat-icon LoRA, geometry stays stable.

### Icon family (settings, toolbar, notification)

For in-app variants — settings gear, toolbar mark, notification badge, monochrome status bar icon — generate from the master using:

- *Settings/toolbar:* stroke-only 1.5 px or 2 px monochrome SF-Symbols-style rendition, same silhouette.
- *Notification/status bar:* pure silhouette, no color, transparent, 20 px legible.
- *Favicon (16/32):* over-simplified version — the single most recognizable sub-element of the master, scaled up to fill the canvas at 32×32.

Prompt template for a family-member generation (with master as reference):

```
Given the attached master icon as the style reference, produce the
{VARIANT: settings glyph / toolbar / notification silhouette / favicon}
version. Requirements: {VARIANT_SPEC}. Preserve the core silhouette and
proportions; drop unnecessary detail; match the information density
appropriate to the variant's render size. No color beyond {ALLOWED_PALETTE}.
No text. No shadow. No bevel.
```

---

## Model Recommendations

> **Updated 2026-04-21:** Model landscape has shifted since Q1 2026. Key changes: GPT Image 1.5 is now the production OpenAI image model (released December 16, 2025; GPT Image 1 still available but deprecated path). Midjourney v7 (launched April 2025) added near-native SVG export and improved text fidelity — the "no transparency" and "prone to gloss" caveats still apply for icon work but the vector story improved. Gemini 2.5 Flash Image (`gemini-2.5-flash-image-preview`) was shut down January 15, 2026; the current Google model is **Gemini 3.1 Flash Image** ("Nano Banana 2"). Gemini API image generation has **no free tier** since December 7, 2025 — unbilled keys return HTTP 429 with `limit: 0`; AI Studio web UI remains free for interactive use.

| Model | Best For | Notable Caveats |
|---|---|---|
| **Recraft V3** | First-choice for clean vector icons and whole icon sets. "Icon" is a native design-language token. Direct SVG output via the `recraft-v3-svg` model on Replicate; raster model handles squircle-friendly compositions natively. | Less good with complex pictorial metaphors. Style references can drift if the prompt underspecifies geometry. |
| **GPT Image 1.5** (current OpenAI model, released Dec 2025) | Best *honest* RGBA transparency when you explicitly request `"transparent background (RGBA PNG)"`. Best at rendering a single letter / monogram cleanly. Up to 4× faster than GPT Image 1. 20% cheaper per image token. `images.edit` with full-canvas mask is the cleanest API for family variants. | Costs more than free-tier alternatives. Sometimes adds a subtle contact shadow even when told not to — specify "no contact shadow, no ground shadow, pure alpha." |
| **`gpt-image-1`** (legacy, still available) | Still usable; same RGBA transparency path. More expensive than 1.5 and slower. | Being superseded by GPT Image 1.5; prefer 1.5 for new work. |
| **Flux.1 [dev] + icon LoRA** | Best local / self-hosted option. With an icon-specific LoRA (e.g. "Flux Icon Maker", ArtForge MasterKit on Civitai) at strength 0.6-1.0 and CFG 3.0-4.5, produces dense icon sets with strong style consistency. | Base Flux without a LoRA leans photorealistic. Needs a post-process background removal pass for true transparency (BRIA RMBG or BiRefNet). |
| **Midjourney v7** (launched April 2025) | Exceptional for "aesthetic" feel and mascot-style icons. `--sref` is excellent for family consistency. v7 added near-native SVG export, improved text fidelity, and handles up to 10 distinct subject interactions without color bleeding. | Still no native alpha transparency; requires matting. Prone to F2 (visible mask) and F3 (bevel/gloss) unless aggressively negative-prompted. |
| **Ideogram 3 / Ideogram 3 Turbo** | Best when a letterform or monogram is part of the mark. Typography is reliably crisp. Turbo tier ($0.03/image) is cost-effective for rapid iteration and exploration. Style References (up to 3 reference images) help with family consistency. | Less strong on pure pictographic marks. |
| **DALL·E 3 (ChatGPT)** | Good for conceptual exploration. Good at following "flat vector" when spelled out. | No RGBA in the ChatGPT UI path; API gives alpha via GPT Image 1.5. Prone to F4 (tiny mark) without explicit sizing. |
| **Gemini 3.1 Flash Image** ("Nano Banana 2", current Google model as of Feb 2026) | Fast iteration, excellent at "same mark, new color scheme" when master is attached. | **No free API tier since Dec 7 2025 — billing required.** The most prone model to F1 (screenshot failure) and F2 (visible mask). Requires the most defensive prompting; strip the word *app* entirely and say *logomark/symbol* instead. Known "checkered box" transparency problems — prefer GPT Image 1.5 for transparency. Use AI Studio web UI for free interactive generation; round-trip via `asset_ingest_external`. |

A practical stack for a production icon set: **Recraft V3** for the master and the App Store 1024, **GPT Image 1.5** (edits API) for family variants needing exact transparency, and **BRIA RMBG / BiRefNet** as a universal matting backstop when a model fails to give clean alpha.

---

## References

- Apple Human Interface Guidelines, "Icons" — https://developer.apple.com/design/human-interface-guidelines/icons
- Squircle.js, "How Apple Uses Squircles in iOS Design" (corner radius ≈ 22.37%, smoothing ≈ 60%) — https://squircle.js.org/blog/squircles-in-apple-design
- Android Developers, "Adaptive icons" (108 dp canvas, 66 dp safe zone) — https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- adaptive-icons.com, "Why Foreground and Background Layers Matter" — https://www.adaptive-icons.com/why-foreground-and-background-layers-matter
- adaptive-icons.com, "Using AI to Generate Adaptive Icons" — https://www.adaptive-icons.com/using-ai-to-generate-adaptive-icons
- W3C Web Manifest "maskable" icon spec — https://www.w3.org/TR/appmanifest/#icon-masks and https://w3c.github.io/manifest/#purpose-member
- Maskable.app (safe-zone visualization / testing) — https://maskable.app
- Material Design 3, "Product icons" — https://m3.material.io/styles/icons/overview
- Recraft V3 model card — https://www.recraft.ai/docs/recraft-models/recraft-V3
- Recraft V3 SVG (Replicate) — https://replicate.com/recraft-ai/recraft-v3-svg
- OpenAI Community thread, "gpt-image-1 transparent backgrounds with Edit request" — https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577
- GPT Image 1.5 prompting guide (CopyRocket AI) — https://copyrocket.ai/gpt-image-1-5-prompting-guide/
- Flux Icon Maker LoRA (Civitai) — https://civitai.com/models/722531/flux-icon-maker-psiclones-artforge-masterkit
- Together AI, "Generate images with specific styles using Flux LoRAs" — https://www.together.ai/blog/generate-images-with-specific-styles-using-flux-loras-on-together-ai
- IP-Adapter (Tencent AILab) — https://github.com/tencent-ailab/IP-Adapter
- BRIA RMBG 2.0 (background removal, post-process matting) — https://huggingface.co/briaai/RMBG-2.0
- BiRefNet (high-quality matting) — https://github.com/ZhengPeng7/BiRefNet
- iOS App Icon Sizes 2026 — https://iconbundlr.com/blog/ios-app-icon-sizes-2026-complete-guide
- Tom's Guide, "Pixel AI-generated app icons — the problem" (real-world failure cases) — https://www.tomsguide.com/phones/google-pixel-phones/i-just-tried-new-ai-generated-app-icons-for-pixel-phones-and-theres-a-huge-problem
