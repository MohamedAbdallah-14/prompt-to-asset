---
agent: 10b
category: 10-ui-illustrations-graphics
angle: "Hero images, marketing graphics, landing-page banners, feature announcement cards (the above-the-fold asset class)"
status: complete
date: 2026-04-19
word_count_target: 2000-3500
primary_models_covered:
  - midjourney-v7
  - flux-1.1-pro
  - flux-1-pro-ultra
  - gpt-image-1
  - imagen-4
  - ideogram-3
  - recraft-v3
deliverables:
  - aspect_ratio_table
  - composition_ruleset
  - 2024_2026_style_taxonomy
  - prompt_templates_per_style
  - model_selection_matrix
  - negative_prompt_library
  - failure_mode_catalog
---

# 10b — Hero Images & Marketing Banners

> The above-the-fold asset class: landing-page heroes, feature announcement cards, OG/social share banners, release graphics, newsletter headers, and "what we shipped" cards. These are the assets that live at the top of a page in the first 600–900 px of vertical space, compete with bold headline typography, and must read correctly at 2560 px on desktop *and* 390 px on mobile.

## Executive Summary

Hero/banner generation is a distinct problem from general illustration. Three constraints dominate and should drive the entire prompt template:

1. **Aspect ratio is non-negotiable.** A "great" illustration at 1:1 becomes a useless hero at 16:9 because the focal point is trapped in a slice of the crop. The prompt must encode the ratio *and* a composition that survives it. The default modern SaaS hero is **16:9 (1920×1080)** for desktop, with a **3:1 slim banner (1800×600)** and **21:9 cinematic (2560×1097)** as secondary variants; social/OG banners are **1.91:1 (1200×630)**.

2. **Negative space is a first-class requirement, not a stylistic preference.** The headline, subheadline, and primary CTA will be laid over the image on the left or right third. Prompts must explicitly reserve 35–45% of the canvas as low-contrast, low-detail "text safe zone." Generators left to their own devices will center the subject and destroy any overlay plan.

3. **The 2024-26 SaaS aesthetic has fragmented into a small number of named styles.** The dominant dialects are: *Linear-style dark product-first*, *Vercel/Frame monochrome-grain*, *Stripe iridescent mesh*, *Supabase "developer green" low-poly 3D*, *claymorphism*, *glassmorphism over gradient mesh*, *brutalist Swiss-grid*, and *holographic chrome*. Each has a reproducible recipe of lighting, material, color palette, and texture that a prompt template can target. Generic prompts ("modern SaaS hero image, gradient, abstract") produce the "AI generic blob" aesthetic that looks stale in 2026.

**Top 3 findings:**

- **Finding 1 — The aspect ratio must be paired with a composition directive.** Just setting `--ar 16:9` or `size=1792x1024` is insufficient. You must explicitly name the focal region ("subject in right third, 65% of frame"), the safe zone ("left 45% of canvas reserved for headline, solid low-contrast field, no detail"), and the horizon/bleed ("content safely inside 90% center-crop for mobile"). Models that can honor this are Flux Pro and Imagen 4; MJ v7 honors it partially via `--ar` plus prompt, and gpt-image-1 is the most literal via explicit compositional language.

- **Finding 2 — Choose the model by *what the hero must carry*, not by general quality.** If the banner contains legible text (product name, version, feature label): **gpt-image-1** (OpenAI's model, ~99% text accuracy on short strings) or **Ideogram 3** are the only correct picks. If the banner is pure aesthetic with no text: **Midjourney v7** for cinematic polish and material soul, **Flux 1.1 Pro / Pro Ultra** for prompt adherence and commercial realism. For brand-consistent multi-hero sets (one product → 10 audience variants): Flux with a style reference image via `--sref` equivalent, or Recraft v3 with a saved style.

- **Finding 3 — The "2026 look" is textured, not smooth.** The biggest shift from 2023 to 2026 is that AI-smooth gradients and glossy 3D blobs now read as dated and "AI slop." The current dominant treatments are **film grain + stipple texture over gradient**, **hand-drawn imperfection over technical precision**, **dark backgrounds with product UI as hero**, and **monochrome with a single accent color** (Vercel/Frame aesthetic). Prompts that ask for "clean, smooth, polished gradient" in 2026 produce work that looks 2-3 years old. Prompts should explicitly request "subtle film grain," "halftone stipple overlay," "imperfect hand-placed noise," or "tactile tech" texture language.

## Aspect Ratio & Composition Table

| Use case | Aspect | Native px | Prompt flag | Composition rule | Text-safe zone |
|---|---|---|---|---|---|
| Desktop hero (standard) | 16:9 | 1920×1080 | `--ar 16:9` / `size=1792x1024` | Subject right-third; horizon on lower third line | Left 45%, flat or gradient |
| Desktop hero (cinematic) | 21:9 | 2560×1097 | `--ar 21:9` | Subject far-right; negative third on left dominates | Left 50–55% |
| Slim section banner | 3:1 | 1800×600 | `--ar 3:1` | Horizontal flow, no hard focal point; repeated motif | Entire band at 40% opacity |
| OG / social share | 1.91:1 | 1200×630 | `--ar 1.91:1` / `size=1200x630` | Single centered focal point; safe area 1080×540 centered | Outer 60px ring avoids platform crops |
| Twitter/X large card | 2:1 | 1200×600 | `--ar 2:1` | Logo-right, product-left OR headline-left, product-right | Edge-safe 40px |
| LinkedIn post | 1.91:1 | 1200×627 | same as OG | Busier allowed; LinkedIn crops less aggressively | 60px |
| Instagram feed (portrait) | 4:5 | 1080×1350 | `--ar 4:5` | Stacked: brand top, hero middle, CTA bottom | Top 15% + bottom 15% |
| Instagram Reels/Stories | 9:16 | 1080×1920 | `--ar 9:16` | Subject in center-safe 1080×1350 box, extreme top/bottom ignored | Top 220px + bottom 310px |
| Blog card / thumbnail | 1:1 | 1080×1080 | `--ar 1:1` | Single icon/object center; minimal detail | Full-image subtle vignette |
| Feature announcement card | 16:10 or 4:3 | 1600×1000 | `--ar 16:10` | Product UI screenshot + floating elements | Lower-right CTA overlay |
| Email header | 2:1 or 3:1 | 1200×600 / 1800×600 | `--ar 2:1` | Logo left, tagline + product right | Mobile dark-mode compatible |
| Release notes banner | 5:2 | 2000×800 | `--ar 5:2` | Version badge + abstract motif | Right 40% |

**Composition rules that should appear in every hero prompt:**

- **Rule of thirds**: "primary subject positioned at the [right/left] third gridline intersection"
- **Focal point lock**: "single clear focal point, other elements recede to support it"
- **Negative space directive**: "left 45% of the canvas is a smooth low-detail field suitable for large headline typography in white/black"
- **Edge safety**: "critical subject matter contained within the center 85% of the frame to survive responsive cropping"
- **Depth order**: "foreground object sharp, midground soft, background blurred mesh gradient"
- **Horizon placement**: "if applicable, horizon on lower-third gridline, not centered"

Generators without these directives default to centered, fully-rendered, no-margin compositions that break the moment a designer adds an `<h1>` on top.

## 2024–2026 Style Taxonomy

Eight named styles dominate modern SaaS/product landing pages. Each can be described in a prompt without copying any specific brand.

### 1. Dark Product-First (Linear / Vercel dashboard family)

- **Visual signature**: Near-black background (#08080B–#0A0A0F), a real-looking product UI screenshot as the hero object, floating at a slight 3D perspective tilt, with a subtle colored glow (cyan, violet, or magenta) spilling behind it. Inter/Geist-style type implied by the mocked UI.
- **Materials**: Matte glass for UI chrome; crisp 1px borders; monochromatic product with a single accent color; soft ambient floor shadow under the floating UI panel.
- **Lighting**: Single top-left key light, gentle rim light from accent color.
- **Use when**: The product IS the hero (dashboards, dev tools, analytics).

### 2. Vercel/Frame Monochrome-Grain

- **Visual signature**: Pure white or pure black background, a single high-contrast graphic object (a geometric primitive, a letter, a shape), overlaid with *visible film grain* and a subtle halftone stipple. No color, or exactly one accent.
- **Materials**: Paper-matte with grain; no gradients, no glossy 3D.
- **Lighting**: Flat, evenly lit, almost print-like.
- **Use when**: Brand voice is "serious/editorial"; developer-focused; technical announcements.

### 3. Stripe Iridescent Mesh

- **Visual signature**: Smooth rainbow mesh gradient (violet→pink→peach→cyan) behaving like a slow wave, sometimes wrapped around a translucent 3D object. Soft bokeh. Very saturated but soft.
- **Materials**: Iridescent glass; subsurface-scattering lavender chrome.
- **Lighting**: Diffused, omnidirectional, no hard shadows.
- **Use when**: Fintech, API, infra products wanting "premium, effortless" feel.

### 4. Supabase-style Developer Low-Poly 3D

- **Visual signature**: Matte low-poly geometry in brand green/teal + gray, isometric or 3/4 perspective, flat ambient shadow. Readable even at thumbnail size.
- **Materials**: Plastic-matte, no reflections.
- **Lighting**: 3-point studio, soft shadows, high key.
- **Use when**: Open-source / developer products with a strong single brand color.

### 5. Claymorphism

- **Visual signature**: Everything looks sculpted from soft clay. Rounded extrusions, pastel palette (peach, sage, lavender, cream), slightly waxy surface, chunky ambient occlusion in every concave corner.
- **Materials**: Matte clay with subtle subsurface scattering; no metal, no glass.
- **Lighting**: Soft diffused, 45° from upper-left, gentle contact shadows.
- **Use when**: Consumer apps, productivity tools, friendly/approachable brand voice.

### 6. Glassmorphism Over Gradient Mesh

- **Visual signature**: Frosted-glass cards or shapes floating over a vibrant blurred gradient mesh background. Backdrop-blur aesthetic. Thin 1px border on each glass element.
- **Materials**: Frosted glass (20% opacity, 16–24px blur); saturated gradient beneath.
- **Lighting**: Backlit — light source behind the glass.
- **Use when**: Apple-adjacent brands, design tools, creative SaaS.

### 7. Neo-Brutalist / Swiss-Grid

- **Visual signature**: Raw hex color blocks (yellow, red, black), thick black 2–4px borders, chunky type as graphic element, hard drop-shadows offset 6px right/down, no gradients.
- **Materials**: Flat; ink-on-paper feel.
- **Lighting**: None — fully flat.
- **Use when**: Indie dev tools, editorial products, deliberately anti-polish brands.

### 8. Holographic Chrome / Y2K Revival

- **Visual signature**: Liquid-chrome 3D letterforms or objects, reflecting pink/cyan/gold. Often paired with grid floors and light-trail backgrounds. Over the top and maximalist.
- **Materials**: Polished chrome, holofoil, iridescent metal; strong specular highlights.
- **Lighting**: Studio HDRI with colored reflections.
- **Use when**: Consumer/creator products, music/AI art launches, announcements.

### Secondary / supporting styles

- **Isometric illustration** (Supabase / Stripe docs style): clean 30°/60° grid, flat color + subtle shading.
- **Hand-drawn sketch** (Basecamp/Linear changelogs): imperfect inked lines over off-white.
- **Editorial collage**: cut-paper, scan textures, arrow annotations; narrative/story-driven heroes.
- **ASCII / terminal aesthetic**: monospace on dark, for pure developer products.

## Prompt Templates Per Style

Each template is written as a single block you can interpolate `{product_name}`, `{subject_noun}`, `{accent_color_hex}`, and `{aspect}` into. Flags use Midjourney syntax; translate `--ar` to OpenAI `size=`, Flux API `aspect_ratio=`, or Gemini Imagen `aspectRatio=`.

### Template A — Dark Product-First

```
Hero banner for a SaaS {product_category} product, {aspect} aspect ratio. Near-black
background (#0A0A0F) with subtle noise. Floating glass-panel product UI in the right
two-thirds, tilted 8 degrees on the Y-axis, with a soft {accent_color_hex} rim glow spilling
behind it onto the background. UI shows mocked dashboard with chart and sidebar, Inter-style
typography, one-pixel borders, matte finish. Left 40% of canvas is a clean low-detail dark
field reserved for large white headline typography. Subtle film grain across the whole image.
Single top-left key light, gentle accent rim light. Premium developer-tool aesthetic. No
stock-photo gloss. --ar {aspect} --style raw --v 7
```

### Template B — Vercel/Frame Monochrome-Grain

```
Editorial hero banner, {aspect}. Pure off-white background (#F8F8F6). A single large matte
{subject_noun} rendered in deep black, centered in the right third of the frame. Heavy visible
35mm film grain across entire image. Subtle halftone stipple shading on the subject. Sharp
crisp silhouette. Hand-placed imperfection. Minimum two-thirds of canvas is empty low-contrast
field for large serif headline overlay. Print-quality editorial feel. No gradient, no gloss,
no 3D render look. --ar {aspect} --style raw --v 7
```

### Template C — Stripe Iridescent Mesh

```
Iridescent hero graphic, {aspect}. Smooth mesh gradient flowing from deep violet (#6B2EFF)
through pink (#FF4EAD) to peach (#FFB28A) and cyan (#5EE1FF). A single translucent 3D object,
soft-edged organic curved form, centered-right, catching iridescent light with subsurface
scattering. Gentle bokeh, no hard edges. Left 45% of canvas remains a soft low-contrast
gradient field for headline typography. Subtle film grain overlay. Premium fintech aesthetic.
--ar {aspect} --style raw --v 7
```

### Template D — Claymorphism

```
Claymorphism hero illustration, {aspect}. A cluster of sculpted-clay {subject_noun} objects in
pastel palette (#FFC5A8 peach, #B8D8B4 sage, #D7C4F0 lavender, #FDF6EC cream). Matte clay
surface with faint subsurface scattering. Chunky contact shadows where objects meet the ground
plane. 45-degree soft key light from upper-left. Cream background. Subject cluster positioned
in the right third, left 40% is clean cream negative space for headline. Slight film grain.
Warm, friendly, handcrafted feeling. No glossy plastic, no metal. --ar {aspect} --v 7
```

### Template E — Glassmorphism Over Mesh

```
Glassmorphism hero banner, {aspect}. Background: saturated blurred gradient mesh (electric
blue #2E5BFF → magenta #E94BE0 → gold #FFC948). Three frosted glass cards floating at staggered
depths, each with 1px white border at 30% opacity, 20px backdrop blur. Sharp highlight along
top edge of each card. Cards contain implied UI elements, not legible text. Subject cluster in
right half, left 40% soft gradient for headline overlay. Subtle grain. --ar {aspect} --v 7
```

### Template F — Neo-Brutalist

```
Neo-brutalist hero banner, {aspect}. Flat blocks of raw color: canary yellow (#FFD60A), hot
red (#FF3B30), and pure black (#000000), arranged as large geometric shapes. Chunky black
3px outlines on every element. Hard 8px drop shadow offset down-right, no blur. Chunky
monospace or display type implied as a graphic element (no legible words). White background.
Right half dominated by a single large geometric {subject_noun}, left half reserved for
large black headline. Intentionally raw, anti-polish, Swiss-poster energy. No gradient, no
3D render. --ar {aspect} --style raw --v 7
```

### Template G — Holographic Chrome

```
Holographic chrome hero, {aspect}. Liquid chrome 3D {subject_noun} with iridescent holofoil
reflections in pink, cyan, and gold. Mirror-polish surface with strong specular highlights.
Dark gradient background (deep navy to black) with subtle grid floor fading to infinity. Soft
light trails. Subject centered-right, substantial negative space on left for headline. Subtle
film grain. Y2K revival energy, maximalist but not chaotic. --ar {aspect} --v 7
```

### Template H — Supabase-style Low-Poly 3D

```
Isometric low-poly 3D hero, {aspect}. Matte-plastic geometric {subject_noun} composed of
simple polygons. Brand palette: primary {accent_color_hex}, secondary dark charcoal, cream
background. 3/4 isometric perspective. Soft ambient occlusion, no glossy reflections. Flat
contact shadows. Subject in right third, left 40% cream negative space. Developer-tool
aesthetic, readable at thumbnail size. --ar {aspect} --v 7
```

### Universal suffix (append to every hero prompt)

```
High editorial quality, print-ready, no watermark, no logo, no caption text, no UI chrome,
no photographic cliches, no cheesy stock-photo composition. Visible craft and intentional
texture. Subject clearly distinct from background.
```

## Model Picks

| Requirement | Primary pick | Backup | Why |
|---|---|---|---|
| Concept polish, cinematic hero, no text needed | **Midjourney v7** | Flux 1.1 Pro Ultra | Best lighting/composition "soul"; strongest for painterly and cinematic |
| Banner with legible short text ("Launch Week", "v2.0", product name) | **gpt-image-1** | Ideogram 3 | ~99% text accuracy on ≤6-word strings; Ideogram close second |
| Maximum prompt adherence (respects negative space / composition directives) | **Flux 1.1 Pro** | Imagen 4 | Best at honoring complex spatial language |
| Brand-consistent multi-hero series (10 variants, one style) | **Flux Pro + sref image** | Recraft v3 w/ saved style | `sref` / style refs are the most reliable consistency tool |
| Photoreal product mockup hero | **Flux 1.1 Pro Ultra** | Imagen 4 | Commercial realism without "AI shine" |
| Iridescent / mesh gradient / 3D blob aesthetic | **Midjourney v7** | Flux Pro | MJ renders these exceptionally well |
| Isometric / low-poly 3D illustration | **Flux Pro** or **Recraft v3** | MJ v7 | Cleaner geometry, less "rendered" look |
| Vector/SVG output (if brand system needs SVG) | **Recraft v3** | — | Only commercial model outputting true editable SVG |
| Social OG card with heavy text (≥10 words) | **gpt-image-1** | Ideogram 3 | Accept that anything >6 words must be composited in Figma/code |

### Brand-consistent multi-hero workflow

For "one product, 10 hero variants for different audiences":

1. Generate a **master hero** at high quality with detailed style prompt (MJ v7 or Flux Pro).
2. Export it; use as a **style reference image** for 9 subsequent generations (`--sref <url>` in MJ, `image_prompt` in Flux, or Recraft saved-style).
3. Vary only the **subject / metaphor** per audience ("for finance teams" → calculator/graph motif; "for marketers" → campaign/chart motif) while keeping the style ref constant.
4. Keep aspect ratio, palette, lighting, and texture fields *identical* in the prompt across all 10 variants. Only change the noun.
5. Run all 10 through a final **upscale + color-match pass** in the same tool to normalize exposure.

## Negative Prompts / What to Exclude

The AI-generic hero aesthetic has a signature. Kill it explicitly.

**Global negative prompt suffix:**

```
--no stock photo, corporate handshake, diverse people looking at laptop, generic business
meeting, cheesy smiling, floating data particles, cliche glowing orb, 3D rendered blob, AI
slop gradient, overbaked HDR, oversaturated magic hour, lens flare abuse, watermark,
getty images, shutterstock logo, extra limbs, warped hands, garbled text, gibberish text,
fake latin, nonsense letters, plastic shine, waxy skin, uncanny face
```

Style-specific additions:

- For **brutalist**: `--no gradient, no soft shadow, no 3D render, no glow`
- For **monochrome-grain**: `--no color, no gradient, no saturation, no gloss`
- For **dark product-first**: `--no bright background, no white background, no rainbow, no generic abstract shapes`
- For **claymorphism**: `--no glossy plastic, no chrome, no metal, no neon glow`

## Common Failures and How to Fix Them

1. **Centered subject kills the overlay plan.**
   *Fix:* Explicit composition directive: "subject positioned in right third, left 45% is clean negative space at <color> for headline." Re-roll if ignored.

2. **AI-generic abstract blob aesthetic ("2022 SaaS").**
   *Fix:* Name a specific named style from the taxonomy. Add `tactile tech`, `film grain`, `editorial quality`. Negative-prompt `abstract blob, generic gradient, AI slop`.

3. **Text renders as gibberish.**
   *Fix:* Switch to gpt-image-1 or Ideogram 3. If using MJ/Flux, don't ask for text at all — composite text in Figma/code. Explicitly negative-prompt `text, letters, typography, gibberish text`.

4. **Aspect ratio honored but composition squeezed.**
   *Fix:* Include the target aspect in the prompt body ("designed for 16:9 widescreen layout with left-third text safe zone") in addition to the `--ar` flag. Models sometimes treat the flag as post-crop rather than composition guidance.

5. **Mobile crop destroys focal point.**
   *Fix:* Add "critical subject contained within center 60% of frame, edges decorative and safe to crop." Test the generated asset at 390 px wide before shipping.

6. **Color-drift across a hero set.**
   *Fix:* Use a style reference image, not just a style description. Lock exact hex values in the prompt. Run all variants through the same post-process (LUT/curve) in Photoshop or Pillow.

7. **Product UI in the hero looks fake/uncanny.**
   *Fix:* Don't ask the model to render the real UI. Generate a background + lighting environment, then composite an actual screenshot of the product in Figma. The model handles atmosphere; you handle the truth.

8. **Over-rendered, "RTX showroom" shine.**
   *Fix:* Add `matte finish, no glossy highlights, subtle film grain, editorial restraint`. Negative `--no glossy shine, overbaked HDR, chrome reflection, showroom render`.

9. **"Smiling diverse team" stock-photo vibe.**
   *Fix:* Never prompt for people in B2B SaaS heroes unless the product is literally about people (HR, hiring). Replace with abstract, product-centric, or metaphor-driven imagery.

10. **Feature announcement card (release graphic) has no visual anchor.**
   *Fix:* Ask for a single hero metaphor (one "thing") plus a small version tag area in the corner. Don't try to communicate the feature *through the illustration itself* — that's a losing game. The illustration sets mood; the overlay copy communicates.

## Quick Decision Tree

- Needs legible text? → **gpt-image-1** (or Ideogram 3), ≤6 words only.
- Cinematic/painterly "soul" priority? → **Midjourney v7**.
- Commercial realism, photo-mockup, strict prompt adherence? → **Flux 1.1 Pro / Pro Ultra**.
- Isometric / low-poly / developer-illustration style? → **Flux Pro** or **Recraft v3**.
- Need editable vector output? → **Recraft v3** (only commercial option).

## References

- [SaaSFrame — 10 SaaS Landing Page Trends for 2026](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- [Framiq — What Makes a Great SaaS Landing Page in 2026 (20+ Examples)](https://framiq.app/blog/best-saas-landing-pages-2026)
- [getillustrations — The 2026 SaaS Illustration Playbook](https://new.getillustrations.com/blog/saas-illustration-styles-that-convert/)
- [PxlPeak — 12 Best SaaS Website Designs 2026 (4%+ Conversion)](https://www.pxlpeak.com/blog/web-design/best-saas-website-designs-2026)
- [TurboSEO — Web Design Trends 2026: What's Working for Conversion](https://turboseo.tools/blog/web-design-trends-2026)
- [Linear Changelog — 2026 UI Refresh](https://www.linear.app/changelog/2026-03-12-ui-refresh)
- [elkapi — Midjourney v7 vs Flux 1.1 Pro: 500-Image Comparison](https://elkapi.com/midjourney-v7-vs-flux-1-1-pro-we-generated-500-images-to-find-the-best-ai-art-model-in-2025/)
- [Like2Byte — Midjourney v7 vs Flux.1: Why Choosing the Wrong One Is Killing Your Clicks](https://like2byte.com/midjourney-v7-vs-flux-1-2026/)
- [BananaThumbnail — Prompt Secrets: Midjourney v7 vs Flux Pro](https://blog.bananathumbnail.com/midjourney-v7-vs-flux-2/)
- [story321 — Nano Banana Pro vs Midjourney vs gpt-image-1 vs Flux (2025)](https://story321.com/blog/nano-banana-pro-vs-midjourney-vs-gpt-image-1-vs-flux)
- [AIVidPipeline — Best AI Image Generators 2026](https://www.aividpipeline.com/blog/best-ai-image-generators-2026)
- [RatioSize — Website Hero Image Aspect Ratios](https://ratiosize.com/blog/website-hero-image-aspect-ratio.html)
- [Crazy Egg — Every Hero Image Size You Need to Know](https://www.crazyegg.com/blog/hero-image-size/)
- [Cropink — What Is a Hero Image? Definition + Best Practices](https://cropink.com/hero-image)
- [Canada Design — Rule of Thirds and Composition in Website Hero Sections](https://canada-design.com/design-guides/rule-of-thirds-hero-composition/)
- [Piksart — The Web Designer's Guide to Cropping and Framing Stock Photos](https://piksart.one/the-web-designers-guide-to-cropping-and-framing-stock/)
- [Midjourney v7 Docs](https://docs.midjourney.com/) · [Flux API Docs](https://docs.bfl.ml/) · [OpenAI images API (gpt-image-1)](https://platform.openai.com/docs/guides/images) · [Ideogram](https://about.ideogram.ai/) · [Recraft](https://www.recraft.ai/) · [Imagen on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)

*Cross-reference angles in this category: `10a` (in-app illustrations/empty states), `10c` (onboarding illustrations), `10d` (icon-in-context marketing spots), `10e` (data-viz hero compositions). See also: `04-gemini-imagen-prompting`, `05-openai-dalle-gpt-image`, `07-midjourney-ideogram-recraft`, `15-style-consistency-brand`.*
