---
category: 08-logo-generation
angle: 8c
title: "Rendering text reliably inside logos: models, prompt syntax, non-Latin scripts, and post-processing"
status: draft
last_updated: 2026-04-19
audience: prompt-to-asset knowledge base
models_covered:
  - ideogram-3
  - flux-1-dev
  - flux-1-pro
  - flux-2-pro
  - gpt-image-1
  - gpt-image-1.5
  - recraft-v3
  - midjourney-v7
  - imagen-4
  - gemini-3-pro-image
  - anytext
  - textdiffuser-2
  - glyphcontrol
primary_failure_modes:
  - misspellings
  - ghost_glyphs
  - extra_characters
  - broken_ligatures
  - non_latin_script_collapse
  - font_style_drift
---

# Rendering Text Reliably Inside Logos

## Executive Summary

Text inside logos is still the single hardest test for a general text-to-image (T2I)
model. A logo is both a tight composition and a piece of typography — a
wordmark must be spelled correctly, kerned consistently, sit on a baseline,
and survive at 16 px favicon size. Diffusion models, which learned from pixels,
not glyphs, were catastrophically bad at this until roughly 2023 and are now
merely bad-by-default and good-under-narrow-conditions.

Three threads define the 2024–2026 landscape:

1. A **research lineage** — GlyphControl (2023), TextDiffuser-1/2 (ICLR/ECCV
   2024), AnyText (ICLR 2024 Spotlight) — that established the recipe:
   condition diffusion on explicit glyph/layout images and enforce OCR- or
   character-level losses. This is the technique that made modern text
   rendering work.
2. A **product lineage** — Ideogram, Recraft V3, Midjourney v7, GPT-Image-1.5,
   Gemini 3 Pro Image ("Nano Banana Pro"), Flux 2 Pro — that shipped
   increasingly strong Latin text rendering. By 2025/2026, "readable Latin
   text in a logo" is a solved product problem; **exact typography**
   (specific font, pixel-perfect kerning, multi-script, long phrases) is
   not.
3. A **production workflow** where AI outputs are treated as *sketches*:
   designers pipe the raster through vectorization (VTracer, Adobe Image
   Trace, potrace) and **swap AI-rendered text for real typography** in
   Figma or Illustrator. This is the dominant way shipping brand identities
   actually use these models.

For a prompt-to-asset the operational implication is clear: choose the model
by the **type of logo** (wordmark vs mixed mark vs icon), **script**
(Latin vs non-Latin), and **downstream step** (final raster vs vectorize vs
retype). Ideogram 3 or Gemini 3 Pro Image for text-forward mockups;
Recraft V3 for brand-consistent wordmarks with native vector output;
GPT-Image-1.5 for mixed-content logos with long phrases; Flux-family for
iconography where text is replaced later.

## Model Comparison Benchmark

The following matrix consolidates published benchmarks, vendor claims, and
community reports through early 2026. Scores reflect Latin-script wordmarks
of 1–5 words at logo scales; numbers are directional, not a single-source
leaderboard.

| Model | Text accuracy (Latin, 1–3 words) | Long-phrase / paragraph | Font control | Non-Latin | Best for |
|---|---|---|---|---|---|
| **Recraft V3** | Very high (~90%+) | **Best-in-class**; only model reliable at multi-line paragraphs in raster logos | Style presets + brand refs; no named fonts | Limited | Wordmarks, brand systems, native vector |
| **Ideogram 3.0** | ~90% perfectly readable | Good up to 6 words per quoted string | Descriptive styles ("bold serif", "art deco") | Partial (CJK, Arabic, Devanagari in 3.0, but docs warn) | Text-forward posters, logo mockups |
| **Gemini 3 Pro Image** ("Nano Banana Pro") | Very high; marketed as "industry-leading text rendering" | Strong at 4K (up to 4096²) | Prose descriptions | **Best multilingual** (en/zh + others) | Multilingual logos, high-res |
| **GPT-Image-1.5** | Very high; "consistent spelling on complex phrases" | Strong; handles dense UI text | Named fonts (Helvetica, Times) work *somewhat* | 48+ languages (GPT-4o native) | Mixed marks with long phrases, UI mockups |
| **GPT-Image-1 / DALL·E 3** | Moderate; doubled letters, substitutions ("hAllo") | Weak | Minimal | Moderate | Ideation, not final |
| **Flux.1 Pro** | Good — dual CLIP+T5 encoders help | Moderate | Weak; describe style instead | Weak | Icon-heavy logos; retype text later |
| **Flux.1 [dev]** | Moderate | Weak | None | Weak | Local / LoRA workflows |
| **Flux 2 Pro** | Strong; high text quality/$ | Improved vs 1.x | Descriptive only | Moderate | Budget wordmarks |
| **Midjourney v7** | 89% readable (vs 23% on v6) | Short phrases only | "Bold sans-serif" style terms only | 27+ languages claimed; mixed in practice | Artistic / stylized logos |
| **AnyText / TextDiffuser-2** | Near-OCR-accurate in-domain (research) | Yes, line-level | Font image conditioning | CJK via AnyText | Research; niche self-hosted |
| **Imagen 4** | Good for Latin; CJK/Hindi in preview | Moderate | Prose | Supported, preview quality | General GCP pipelines |

Notes on benchmark sources:

- Recraft V3 held the #1 spot on the Hugging Face Text-to-Image Arena
  (ELO ~1172) for five consecutive months in 2025 and is explicitly the
  only model designed to *place long text at specified positions* in a
  logo/poster.
- Midjourney's v6→v7 jump ("23% → 89% readable") is Midjourney's own
  marketing figure but is consistent with third-party retests.
- 2026 "VibeDex" broad benchmarks rank GPT-Image-1.5 #1 overall and Flux 2
  Pro above Ideogram 3 on overall quality-per-dollar; Ideogram still wins
  on **typography-focused** prompts specifically.

## Prompt Syntax by Model

There is no universal prompt syntax. What works is model-specific; an
enhancer that emits the *wrong* syntax (e.g., `text: "FOO"` into Midjourney)
will degrade rather than help.

### Ideogram 3.0

- **Canonical form:** enclose the exact string in single quotes inside
  a descriptive sentence. Double quotes also parse.
  - `A modern café logo with the text 'Sunrise Coffee' in bold geometric sans-serif, terracotta letters on cream background`
- Keep each quoted string ≤ 6 words for highest accuracy.
- Put quoted text **early** in the prompt.
- Describe where the text sits ("centered below the icon", "at the top")
  and how it looks ("bold serif", "art-deco typography", "calligraphy").
- Multiple quoted strings in one prompt are supported.
- Named fonts generally do **not** work as font selection; they bias style
  only.

### Midjourney v7

- **Canonical form:** `text: "FOO"` or `the word "FOO"` with double quotes.
  - `minimalist café logo, flat vector design, text: "Coffee Shop", clean sans-serif font --v 7`
- Docs explicitly ask for double quotes, not single quotes.
- Use descriptors ("with the words", "that reads", "written").
- Keep strings short; production-ready for "logo drafts", not
  pixel-perfect wordmarks.

### Recraft V3

- **Canonical form:** natural-language description, no syntactic wrapper.
  Text is specified inline.
  - `Geometric mountain logo with the company name "Altitude Labs" centered
     below the icon, flat vector, corporate blue #003366, minimal`
- Style is chosen via the `style` parameter (e.g., `vector_illustration`,
  `digital_illustration`, `realistic_image`) — this is the closest thing
  to a "font knob" in any product today because `vector_illustration/*`
  subvariants bias toward clean geometric letterforms.
- Brand consistency is achieved via **style reference images** rather than
  named fonts.
- Recraft is the only mainstream product that exposes explicit
  **text position** control in prompts ("band name at top", "date at
  bottom") and honors it.

### GPT-Image-1 / GPT-Image-1.5 (OpenAI)

- **Canonical form:** quoted text plus structured "engineering" language.
  Community-tested patterns that help:
  - `The phrase "Night Owl Books" rendered in Helvetica Neue, 95% contrast,
     centered, pixel-perfect anti-aliasing, crisp edges, optical alignment`
- Naming fonts ("Helvetica Neue", "Times New Roman") is *weakly* honored
  on 1.5 — it biases style and proportions without reproducing the exact
  typeface.
- Dense multi-line text (infographics, menus) is reliable on 1.5; a
  known regression vs earlier models is over-compliance — the model will
  literally print style directions if they are not scoped to the target
  phrase.

### Flux.1 (dev / pro) and Flux 2 Pro

- No special syntax. Use prose.
  - `Logo for "Helios Analytics", sunrise icon, single-weight geometric
     sans-serif wordmark, solid orange #ED6A2C`
- Flux's dual CLIP + T5 encoder makes long T5-style prose prompts
  effective; short "tag soup" prompts underperform.
- Font names are essentially ignored; describe weight (thin/light/regular/
  bold/black) and classification (grotesque, humanist sans, transitional
  serif, slab serif, geometric).
- For [dev] locally: ControlNet and LoRA are the realistic way to control
  letterforms (see "Academic Approaches").

### Gemini 3 Pro Image / Imagen 4

- Natural language; no explicit `text:` keyword required.
- Quote the exact string. Put the phrase early.
  - `Create a logo for a bakery. The wordmark reads "Pan & Sal" in a warm
     hand-drawn script, with a small wheat-sprig icon to the left.`
- Gemini 3 Pro Image is the 2025–2026 leader for legible text in
  **non-English scripts**; Imagen 4 lists Chinese (simplified/traditional),
  Hindi, Japanese, Korean, Portuguese, and Spanish with the non-English
  set flagged as preview.

### AnyText / TextDiffuser-2 (open research)

- These are **conditioned** models. You supply not just a prompt but a
  glyph/position spec (e.g., a mask with a PIL-rendered "Acme Corp" at a
  chosen bounding box) and the model inpaints photorealistically around
  it.
- This is why they are the benchmark leaders for Chinese/Japanese
  wordmarks: the character shapes themselves are injected, so the model
  only has to *style* glyphs, not *invent* them.

## Academic Approaches

Four papers define the state of the art; understanding them explains why
product-grade text rendering looks the way it does.

### GlyphControl (2023, arXiv 2305.18259)

GlyphControl showed you don't need to retrain a base diffusion model to
get text rendering: condition a frozen Stable Diffusion on a glyph image
(the desired text pre-rendered as pixels in a chosen font) through a
ControlNet-like branch. Users can customize content, position, and size
via the glyph input. It introduced the LAION-Glyph training set and beat
DeepFloyd IF on OCR accuracy and CLIP/FID. *Takeaway for enhancers: if
your pipeline owns a base model, the cheapest quality win is to render
text to a pilot image and condition on it rather than tuning the prompt.*

### TextDiffuser-1 / TextDiffuser-2 (Microsoft, 2023 / ECCV 2024)

TextDiffuser-2 (arXiv 2311.16465) moves layout planning into an LLM:
one fine-tuned language model decides keywords and bounding boxes,
a second encodes text position **line-by-line** (not character-by-
character) into the diffusion model. Line-level encoding is the trick
that enables *style diversity* — hand-lettering, artistic scripts — rather
than the stiff grid look of character-level conditioning. It also enables
conversational layout edits ("move the slogan below the mark").

### AnyText (Alibaba, ICLR 2024 Spotlight)

AnyText (arXiv 2311.03054) is the reference for *multilingual* text
rendering. Two modules: an auxiliary latent module conditioned on glyph,
position, and a masked image; and a text embedding module that uses an
OCR model to encode stroke information. Training uses a text-perceptual
loss plus a text-control diffusion loss. It ships a 3M-pair
multilingual dataset (AnyWord-3M) and its own benchmark. For CJK logos
today, AnyText/ControlNet-style pipelines still deliver higher raw
character accuracy than any commercial black-box model.

### TextPixs and the character-awareness thesis

Subsequent work (e.g., "TextPixs") ties the whole improvement curve to
**character-aware text encoders**. Replacing character-blind encoders
yields +30 points on text-rendering accuracy benchmarks and drives the
character error rate from ~0.21 down to ~0.08. Flux.1's inclusion of a
T5 encoder alongside CLIP is the commercial instantiation of this finding;
Ideogram 3's dedicated "typography module" is a product-layer version
of the same idea.

## Multi-Script Support Table

Quality tiers below: **A** = production-usable for that script; **B** =
usable with retries and short strings; **C** = unreliable, expect
retyping; **D** = catastrophic failure common.

| Script | Representative logos | Ideogram 3 | Gemini 3 Pro Image | GPT-Image-1.5 | Recraft V3 | Flux Pro | Midjourney v7 | AnyText (self-host) |
|---|---|---|---|---|---|---|---|---|
| Latin | any English wordmark | A | A | A | A | B | B+ | A |
| Cyrillic | Russian/Ukrainian brands | B | B | B | B | C | C | B |
| Greek | academic/pharma | B | B | B | C | C | C | B |
| Arabic (connecting, RTL) | MENA brands | C | B | C | C | D | C | B |
| Hebrew | RTL, block script | C | B | C | C | D | C | B |
| Devanagari (conjuncts, shirorekha) | Hindi/Marathi brands | C | B | C | D | D | D | B |
| Chinese (simplified) | CN brands | C | A/B | B | C | D | C | **A** |
| Chinese (traditional) | TW/HK brands | C | A/B | B | C | D | C | **A** |
| Japanese (kanji + kana) | JP brands | C | B | B | C | D | C | **A** |
| Korean (Hangul) | KR brands | C | B | B | C | D | C | A |
| Thai (tone marks, no spaces) | TH brands | D | C | C | D | D | D | C |

Headline takeaways:

- **Only Gemini 3 Pro Image and AnyText-family models are realistic for
  CJK wordmarks today.** Gemini 3 Pro Image ("Nano Banana Pro") is
  specifically tuned for cross-language text and is marketed with
  multi-language human-eval wins.
- **Arabic / Hebrew / Devanagari** are where even Ideogram stumbles: each
  requires contextual shaping (position-dependent Arabic letter forms),
  conjunct formation (Devanagari), or RTL directionality that
  pixel-space models still get wrong. The safe pattern is to generate the
  *mark/ornament* in the AI model and typeset the name in a real shaping
  engine.
- **Ideogram 3 documentation itself warns:** "text … using a non-Latin
  alphabet or accented Latin characters may have some difficulty being
  generated correctly, if at all." A prompt-to-asset should treat this as
  a hard fallback rule.

## Typical Failure Modes

Across all models, the same failure catalog recurs. A prompt-to-asset
should explicitly counter each.

- **Misspellings / letter substitution** — "COFFE SHPO", "RESTRAUNT",
  "OPENNING". Root cause: pixel-distribution training, no character model.
  Mitigations: short strings; quote marks; model choice (Ideogram / Recraft /
  Gemini 3 Pro); generate 4+ candidates and OCR-filter.
- **Doubled letters** — "HEELLO", "BOOOK". Mitigation: lower guidance
  scale where exposed, or add "clean single-weight letters" to the prompt.
- **Ghost glyphs / phantom letters** — extra characters floating near the
  wordmark (often partial letterforms inside swashes). Mitigation: ask for
  "no extra text", "no secondary text", "single wordmark only"; on Flux,
  use negative-prompt via inference configs.
- **Broken ligatures** — "fi", "fl", Devanagari conjuncts, Arabic
  connections. Especially visible in script faces. Mitigation: choose a
  non-script style, or render in real typography post-hoc.
- **Kerning collapse** — letters touch or drift apart unevenly, especially
  on longer strings. Mitigation: shorter phrases, or retype in Figma.
- **Baseline drift** — last 1–2 letters tilt or sit lower. Mitigation:
  generate at higher resolution and use Recraft/Ideogram which explicitly
  model baselines.
- **Font style drift** — you asked for bold geometric sans-serif and got
  humanist. Mitigation: describe two or three axes (weight, classification,
  personality), use style references on Recraft, avoid trademarked font
  names as primary instructions.
- **Duplicate wordmark / "reflection"** — text also appears as texture on
  background. Mitigation: add "solid background, wordmark only, no
  repeated text".
- **Readability collapse at small sizes** — looks fine at 1024 px, garbled
  at favicon size. Mitigation: design at generator's native resolution
  and downscale with a sharpening pass; better still, vectorize and
  retype.

## Post-Processing Fallback: Retyping with Real Typography

For any brand identity that will actually ship, the professional
consensus through 2026 is: **never trust the AI-rendered text to be the
final asset**. The standard recipes:

### Recipe A — "AI mark + human wordmark" (most common)

1. Generate only the **symbol/mark** with AI (no text in prompt, or prompt
   explicitly `"no text"`).
2. Vectorize with VTracer (colored), potrace (B&W), or Illustrator's
   Image Trace ("Black and White Logo" preset) — VTracer produces ~30%
   fewer nodes than Image Trace.
3. Typeset the wordmark in Figma/Illustrator using a **real licensed
   font** (Inter, Söhne, GT America, Recoleta, etc.) paired with the
   mark.
4. Apply grid/optical alignment and kerning manually.

### Recipe B — "AI wordmark draft + retype in place"

1. Generate logo including wordmark on a text-strong model (Ideogram,
   Recraft, Gemini 3 Pro Image).
2. Bring raster into Figma/Illustrator. Use the AI letterforms as a
   *visual target*.
3. Replace with actual type, match weight and proportions, adjust
   tracking so the wordmark occupies the same bounding box as the AI
   draft.
4. Re-export.

### Recipe C — "Vectorize first, clean text"

1. Pre-process: upscale (Topaz Gigapixel or Real-ESRGAN), denoise,
   flatten colors in Photoshop.
2. Vectorize the full output.
3. Delete vector text paths, replace with live text in a real typeface.
4. Keep mark vectors, regenerate wordmark.

### Recipe D — Figma "Replace content" AI for placeholders

Figma's AI text replacement is meant for *placeholder copy*, not brand
wordmarks. It is useful inside app-mockup logos ("replace 'Lorem' with
'NoteKit'") but doesn't produce branded typography.

A prompt-to-asset aimed at final logo output should assume Recipe A by
default and only attempt Recipe B when the user explicitly wants a
single-shot result.

## Practical Recommendations for the Prompt-Enhancer

1. **Detect intent:** "logo with text X" vs "icon/mark only" vs "wordmark"
   vs "mixed mark". Route the prompt to different models.
2. **Detect script:** if target string contains non-Latin codepoints,
   default to Gemini 3 Pro Image (Arabic/CJK), AnyText (CJK self-host),
   or *warn the user and generate the mark only*, then recommend
   post-processing.
3. **Emit model-specific syntax:**
   - Ideogram: `… with the text 'FOO' in <style>…`
   - Midjourney v7: `… text: "FOO", <style> --v 7`
   - Recraft V3: natural language + `style=vector_illustration`
   - GPT-Image-1.5: quoted phrase + "crisp edges, optical alignment,
     pixel-perfect anti-aliasing"
   - Flux / Gemini / Imagen: prose, quote the exact string early
4. **Cap quoted strings at 5–6 words.** Split longer phrases into
   multiple quoted strings (Ideogram) or move them to a second render.
5. **Always append an anti-hallucination fragment:** "no extra text, no
   secondary text, single wordmark only, clean single-weight letters".
6. **Never rely on trademarked font names** as the primary control.
   Translate user requests ("Helvetica-like") into classification +
   weight + personality triples.
7. **Default to a retype workflow** in the returned instructions when the
   asset is for production, and to a single-shot workflow when the user
   explicitly asks for a draft/mockup.

## References

Academic papers:

- GlyphControl: Glyph Conditional Control for Visual Text Generation,
  Yang et al., arXiv:2305.18259 — https://arxiv.org/abs/2305.18259
- AnyText: Multilingual Visual Text Generation And Editing, Tuo et al.,
  ICLR 2024 Spotlight, arXiv:2311.03054 — https://arxiv.org/abs/2311.03054
- AnyText code: https://github.com/tyxsspa/AnyText
- TextDiffuser-2: Unleashing the Power of Language Models for Text
  Rendering, Chen et al., ECCV 2024, arXiv:2311.16465 —
  https://arxiv.org/abs/2311.16465
- TextDiffuser-2 project page:
  https://jingyechen.github.io/textdiffuser2/
- TextDiffuser-2 code:
  https://github.com/microsoft/unilm/tree/master/textdiffuser-2
- Character-aware encoders for text rendering (TextPixs-style analysis),
  arXiv:2507.06033 — https://arxiv.org/pdf/2507.06033

Vendor documentation:

- Ideogram — Text and Typography:
  https://docs.ideogram.ai/using-ideogram/prompting-guide/2-prompting-fundamentals/text-and-typography
- Ideogram — Prompt Structure:
  https://docs.ideogram.ai/using-ideogram/prompting-guide/3-prompt-structure
- Ideogram v3 API reference:
  https://developer.ideogram.ai/api-reference/api-reference/generate-v3
- Recraft — Adding text to an image:
  https://recraft.ai/docs/using-recraft/image-generation/working-with-text-and-prompts/adding-text-to-an-image
- Recraft V3 model page:
  https://www.recraft.ai/docs/recraft-models/recraft-V3
- Midjourney — Text Generation:
  https://docs.midjourney.com/hc/en-us/articles/32502277092109-Text-Generation
- Flux.1-dev model card:
  https://github.com/black-forest-labs/flux/blob/802fb471/model_cards/FLUX.1-dev.md
- Gemini 3 Pro Image (Vertex AI):
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image
- Gemini 3 Pro Image model card (DeepMind):
  https://deepmind.google/models/model-cards/gemini-3-pro-image/
- Imagen 4 (Vertex AI):
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate

Benchmarks and comparisons:

- VibeDex, FLUX.2 Pro vs Ideogram 3 vs Seedream 4.5 (2026):
  https://vibedex.ai/blog/flux-2-pro-vs-ideogram-3-vs-seedream-45
- VibeDex, Ideogram 3.0 review (2026):
  https://vibedex.ai/blog/ideogram-3-review
- The Decoder, Recraft V3 tops text-to-image benchmarks:
  https://the-decoder.com/new-ai-image-model-recraft-v3-takes-top-spot-in-benchmarks
- Aura AI, Flux vs Ideogram comparison:
  https://www.auraai.app/compare/flux-vs-ideogram
- Listicler, Best typography/text-in-image generators 2026:
  https://listicler.com/best/best-ai-image-generators-typography-text

Vectorization and post-processing:

- VTracer: https://github.com/visioncortex/vtracer
- Adobe Illustrator, Image Trace docs:
  https://helpx.adobe.com/illustrator/desktop/manage-objects/traces-mockups-symbols/trace-images-to-convert-raster-into-vector-artwork.html
- AI SVG, potrace vs Image Trace vs VTracer comparison:
  https://www.aisvg.app/blog/image-to-svg-converter-guide
- Figma, Replace text content with AI:
  https://help.figma.com/hc/en-us/articles/23796390206743-Replace-text-content-with-AI
- H3sync, How to vectorise an AI generated logo:
  https://h3sync.com/blog/how-to-vectorise-ai-generated-logo/
- Design Tools Weekly, AI logo vectorization & common mistakes:
  https://www.designtoolsweekly.com/ai-logo-vectorization-how-to-fix-the-3-biggest-mistakes-ai-logo-generators-make/

Failure-mode analyses (corroboration, not primary):

- Nano Banana Studio, Why AI misspells text in images:
  https://nanobananastudio.com/blog/why-ai-misspells-text-in-images
- Nano Banana Studio, 10 AI text rendering failures:
  https://nanobananastudio.com/blog/ai-text-rendering-failures
- OpenAI Developer Community, Best prompt for precise text on DALL·E 3:
  https://community.openai.com/t/best-prompt-for-generating-precise-text-on-dall-e-3/428453
