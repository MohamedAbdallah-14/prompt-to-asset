# 03 — Model Dialect for UI Mockups

**Scope.** Per-model prompt dialect for frontend UI mockups (web dashboards + mobile screens with real cards, tables, charts, nav, forms). Five primary models: gpt-image-2, gpt-image-1.5, gemini-3-pro-image-preview (Nano Banana Pro), gemini-3.1-flash-image-preview (Nano Banana 2), ideogram-3-turbo. Notes on flux-2-flex/pro at the end.

**Method.** Official prompting guides first (OpenAI Cookbook, ai.google.dev, blog.google, cloud.google.com, BFL docs, Ideogram docs). Community + benchmark posts second.

## TL;DR

| Model | Dialect | Refs | Negative prompt | Text ceiling | UI verdict |
|---|---|---|---|---|---|
| gpt-image-2 | Flexible — prose, JSON-ish, labeled segments, tag-soup all work; pick whichever is maintainable | Multi-image accepted; reference each "by index and description" | Silently ignored; use exclusion language inline | ~99% accuracy across Latin/CJK/Hindi/Bengali per third-party tests; no published cap | Best for UI; LMArena #1 +242 over Nano Banana Pro |
| gpt-image-1.5 | Same flexibility; Cookbook explicitly recommends "short labeled segments or line breaks" for complex UI | Multi-image; first 5 preserved at higher fidelity in `input_fidelity: high` | Inline exclusions only ("no watermark, no logos") | Dense text reliable; set `quality:"high"` for dense layouts | Strong; the cookbook's flagship UI example targets 1.5 |
| gemini-3-pro-image | Six-element prose framework: Subject, Composition, Action, Location, Style, Editing | Up to 14 refs (5 high-fidelity); roles must be explicitly assigned | Not supported — explicit "use positive framing" rule | ~200 chars / paragraph length reliable | Strong text + reasoning; Google pitches it for "high-fidelity product mockups" |
| gemini-3.1-flash-image | Same Nano Banana framework; 131k input tokens vs Pro's 65k | Up to 14 refs (10 object + 4 character split) | Not supported | ~90% accuracy, multi-constraint adherence | Faster, ~Pro-quality at Flash speed; UI mockups explicitly listed as use-case |
| ideogram-3-turbo | 8-section prose template (summary → subject → pose → secondary → setting → lighting → framing → enhancers); ~150-160 words / ~200 tokens hard ceiling | `style_reference_images` array; 1 character ref | **Yes — native `negative_prompt` field** | ~3-6 words reliable, ~10 with seed retry | Fits short-text marketing screens; weak for dense dashboard copy |

The single biggest UI-specific decision: text density. If the screen needs >10 distinct text strings (typical dashboard), only OpenAI's gpt-image-2/1.5 and Nano Banana Pro hit the accuracy bar. Ideogram is for marketing/onboarding screens with hero copy + CTA, not data tables.

## Details

### 1. gpt-image-2 (OpenAI)

**Official UI guidance.** The OpenAI Cookbook UI mockup section says to "describe the product as if it already exists, focusing on layout, hierarchy, spacing, and real interface elements" and avoid concept-art language so output looks like a "shipped interface rather than a design sketch." Quality setting matters: `quality: "high"` for dense / multi-font layouts.

**Syntactic conventions.** The Cookbook is explicit: "Use the format that is easiest to maintain. Minimal prompts, descriptive paragraphs, JSON-like structures, instruction-style prompts, and tag-based prompts can all work well." For production: "prioritize a skimmable template over clever prompt syntax." This is the most permissive dialect of the five — the model parses structure regardless of surface form.

**Layout cues.** The official example uses descriptive prose ("simple header, a short list of vendors with small photos and categories, a small 'Today's specials' section") rather than 8pt-grid / 12-column technical specs. Community-tested SaaS dashboard prompts that work cite "left sidebar navigation, main canvas with three project kanban columns each with cards, light mode, clean grid spacing" — semantic regions, not pixel widths. No evidence that "240px sidebar" specifically helps; it's parsed as a vague hint, not a constraint.

**Negative prompts.** No `negative_prompt` parameter. Inline exclusions work: the cookbook explicitly recommends stating "exclusions and invariants" like "no watermark, no extra text, no logos/trademarks" inside the prompt.

**Reference images.** Multi-image input supported. The cookbook says to "Reference each input by index and description" and "describe how they interact." Demonstrated for compositing/style transfer; less documented for UI.

**Text ceiling.** OpenAI has not published an official number. Third-party tests (PixVerse, Pollo, JXP, Atlas Cloud benchmarks) cite ~99% character accuracy across Latin/CJK/Hindi/Bengali. LMArena Image: 1512 Elo, +242 over Nano Banana Pro at launch, 12 hours after release. Treat the 99% number as third-party until OpenAI publishes.

**Failure modes.** Per dev community: "AI mockups can look impressively finished while containing structural errors" — visual polish without coherent IA. Tendency to invent vendor names / numbers / chart data. No documented checkerboard issue. Transparency: `gpt-image-2` does NOT support `background:"transparent"` (regression vs 1.5; param 400s) — irrelevant for UI mockups, which are opaque.

**UI prompt template skeleton (distilled from OpenAI Cookbook):**
```
Create a realistic [platform] UI [mockup|screenshot] for [product description].
Show [primary content area: list / grid / chart / form] with [element 1, element 2, element 3].
Include [secondary regions: header, nav, sidebar, footer].
Design constraints: [background], [accent colors], [typography style], [decoration level].
It should look like a real, well-designed, beautiful [app type].
[Optional: Place inside an iPhone frame / browser chrome / desktop window.]
Quality: high. No watermark, no logos, no placeholder lorem ipsum.
```

### 2. gpt-image-1.5 (OpenAI)

**Official UI guidance.** Same cookbook structure as gpt-image-2; the canonical UI mockup example targets 1.5 ("Create a realistic mobile app UI mockup for a local farmers market…"). Critical extra: "For dense layouts or heavy in-image text, it's recommended to set output generation quality to 'high'."

**Syntactic conventions.** Cookbook adds a 1.5-specific note: **"For complex requests, use short labeled segments or line breaks instead of one long paragraph."** This is the strongest official endorsement of structured-segment prompting in the entire OpenAI surface. For dashboard prompts with 6+ regions, this matters — labeled "Header:", "Sidebar:", "Main:", "Footer:" sections beat one long paragraph.

**Typography spec.** "Put literal text in quotes or ALL CAPS" and specify "font style, size, color, and placement as constraints." For tricky words (brand names), spell out letter-by-letter. The model is LMArena #1 for dense text.

**Negative prompts.** No native param. Cookbook recommends inline negatives.

**Reference images.** Multi-image accepted; with `input_fidelity: "high"`, the first 5 images preserved at higher fidelity. Reference-by-index pattern same as gpt-image-2.

**Text ceiling.** Officially "dense text, small lettering, complex layouts like infographics, UI mockups, marketing materials." No published cap. Roughly equivalent to gpt-image-2 in reliability for short labels; gpt-image-2 wins on long copy.

**Failure modes.** Same as gpt-image-2 family: structural plausibility issues, invented data. The community-cited workflow is text-free generation + composite for >50-char strings, but that contradicts the cookbook's claim — the cookbook says to render text in-model. Reconcile: render in-model when ≤30 chars per element, composite when paragraph-length and pixel-exact.

**UI prompt template skeleton (distilled from Cookbook line-break recommendation):**
```
Asset: realistic [platform] UI mockup
Header: [logo, page title, account avatar]
Sidebar: [nav items with icon labels: "Dashboard", "Projects", "Reports", "Settings"]
Main:
  - [region 1: e.g., 4 KPI cards with metric name + value + delta arrow]
  - [region 2: e.g., area chart titled "Revenue (last 30 days)"]
  - [region 3: e.g., recent activity table with columns "Name", "Status", "Date"]
Footer: [optional]
Style: [light|dark] mode, [accent color], [typography], minimal decoration
Quality: high. Render all text legibly. No lorem ipsum, no placeholder logos.
```

### 3. gemini-3-pro-image-preview (Nano Banana Pro)

**Official UI guidance.** Google DeepMind's product page positions the Pro model for "complex graphic design, high-fidelity product mockups, and factual data visualizations." Google blog cites Antigravity's coding agents using it to "generate detailed UI mockups for user review." The model has a "Thinking" stage that reasons over the prompt — useful for multi-region UI logic.

**Syntactic conventions.** Six-element prose framework: `[Subject + Adjectives] doing [Action] in [Location/Context], [Composition/Camera Angle], [Lighting/Atmosphere], [Style/Media]`. Google Cloud's "Ultimate Prompting Guide for Nano Banana" recommends labeled-prose style: literally write `[Subject] ...`, `[Action] ...`, `[Location] ...` as labeled segments. Not JSON, not tag-soup — structured prose with bracket labels.

**Layout cues.** Google's guidance is photographic, not technical: aspect ratio, framing ("medium-full shot, center-framed"), camera angle, lighting. There is no documented support for "8pt grid" or "240px sidebar" terminology — write semantic regions instead. Spelling out grid math has not been shown to help in any official example.

**Negative prompts.** **Not supported.** Google Cloud's guide is explicit: "Use positive framing: Describe what you want, not what you don't want (e.g., 'empty street' instead of 'no cars')." Negatives are silently ignored on the Gemini API endpoint.

**Reference images.** Up to **14** total; 5 with high fidelity per Pro. Pattern: `Use Image A for [character pose], Image B for [art style], Image C for [background]`. For UI: pass a brand style ref + an existing screen ref + a logo ref. Vertex docs corroborate the 14-image limit; Apiyi's blog breaks down the "5 high-fidelity" sub-cap.

**Text ceiling.** ~200 chars / paragraph-length reliable; "state-of-the-art text rendering in multiple languages." Google acknowledges: "Rendering small text, fine details, and producing accurate spellings may not work perfectly." 1K/2K/4K resolution outputs.

**Failure modes.** Slower than Flash variant. The "Thinking" stage adds latency. Bind AI's benchmark calls the gap to gpt-image-2 "astonishing" on text-heavy UI.

**UI prompt template skeleton (distilled from Google's Nano Banana framework):**
```
[Subject] A high-fidelity UI mockup of a [product] [platform: web dashboard | iOS app screen],
showing [primary content: dashboard with KPIs / settings page / onboarding flow].

[Action] The interface displays "[exact label 1]", "[exact label 2]", "[exact label 3]"
in [layout: cards / list / two-column].

[Location/Context] [light or dark] theme, [brand palette: primary #HEX, accent #HEX],
[device frame or browser chrome].

[Composition] Front-facing screen capture, 1:1 or 9:16 aspect for mobile / 16:9 for desktop,
center-framed.

[Style] Modern SaaS UI, [iOS 18 design language | Material 3 | minimal flat], 
crisp typography, real interface (not concept art).

Render all visible copy legibly. Use [font family] style.
[If refs] Use Image A for the brand palette and logo; Image B for layout reference.
```

### 4. gemini-3.1-flash-image-preview (Nano Banana 2)

**Official UI guidance.** Google's blog: "Nano Banana 2 API helps generate UI mockups, infographics, and multilingual visuals with clear text rendering." The example shipped in Google's announcement is explicitly a UI: "A high-fidelity UI mockup for a modern, dark-mode weather application on a mobile phone featuring glassmorphism, glowing neon blue and purple accents, and a highly detailed 3D weather icon in the center." Lower latency than Pro at near-Pro quality; ranked #1 on Artificial Analysis Image Arena at launch.

**Syntactic conventions.** Same six-element framework as Pro. Google ships only natural-language narrative examples; no documented JSON / labeled-segment format. 131,072 input tokens vs Pro's 65,536 — relevant if a UI brief embeds long copy/structured data.

**Layout cues.** Same photographic vocabulary as Pro. New aspect ratios in 2: 4:1, 1:4, 8:1, 1:8, plus 512px efficiency tier. "Configurable thinking levels (Minimal vs. High/Dynamic)" — for complex UI prompts, raise thinking level.

**Negative prompts.** Not supported. Same positive-framing rule.

**Reference images.** Up to 14, split: 10 object-fidelity images + 4 character-consistency images. Each `Part.from_uri` instance attaches one ref. Document input (PDF/text up to 50MB API) is supported — relevant for "match this brand-guideline PDF" UI flows.

**Text ceiling.** ~90% accuracy per third-party benchmarks; reliable multi-constraint adherence. The CLAUDE.md note that the older "Nano Banana garbles past 3 words" rule applies to legacy `gemini-2.5-flash-image`, NOT 3.1, is correct — verified against Google's own UI mockup examples that contain readable interface labels.

**Failure modes.** Google acknowledges the model "may struggle with grammar, spelling, cultural nuances, or idiomatic phrases" in some non-English languages. Pollo's benchmark says GPT Image 2 wins on UI-with-labeled-components; Nano Banana 2 wins on e-commerce/brand visuals. For dashboards with many labels, demote 3.1 below Pro and gpt-image-2.

**UI prompt template skeleton:** Use the Pro template above. Identical surface; faster + cheaper. Lower the verbosity of any one labeled element if pushing 5+ regions.

### 5. ideogram-3-turbo

**Official UI guidance.** No documented UI mockup section. Community testing: "mobile app login screen mockup, minimalist design, soft gradients, modern UI elements" produces "wireframe-quality visuals for stakeholder reviews" — explicitly not pixel-perfect production output. Ideogram's strength is short-text marketing/branding, not data-dense UI.

**Syntactic conventions.** Eight-section structured prose: (1) Image Summary, (2) Main Subject, (3) Pose/Action, (4) Secondary Elements, (5) Setting/Background, (6) Lighting/Atmosphere, (7) Framing/Composition, (8) Technical Enhancers. Hard ceiling: ~150-160 words / ~200 tokens — beyond that, content "may be less effective or ignored entirely." Place high-priority details first.

**Style type.** `style_type: "DESIGN"` is the recommended preset for graphic-design-with-text use cases, including UI mockups. AUTO/GENERAL/REALISTIC/FICTION are alternatives. `magic_prompt: "AUTO"|"ON"|"OFF"` rewrites short prompts; for already-detailed UI prompts, set `OFF` to prevent rewrite drift.

**Layout cues.** Standard photographic vocabulary. No documented support for grid systems or column terminology. Compose UI as semantic regions in section 4 (Secondary Elements) and section 7 (Framing).

**Negative prompts.** **Yes — native `negative_prompt` field.** "Descriptions in the prompt take precedence to descriptions in the negative prompt." Use it for "no checkerboard, no lorem ipsum, no chart axis garbage."

**Reference images.** `style_reference_images` array (10MB total, JPEG/PNG/WebP). Up to 3 style refs in the web product. Character ref: 1 image. For UI: pass a brand-palette swatch as style ref.

**Text ceiling.** ~3-6 words reliable per element; ~10 with seed retries. Earlier "~80 chars" community claim was over-optimistic. Quote exact text in the prompt and place it early — the docs are explicit. For UI: use Ideogram for the wordmark/logo + headline copy + 1-2 CTAs. Anything past that, composite real text in the application layer or pick another model.

**Turbo specifics.** Cheaper credit cost (2 vs 4 vs 6). Slightly lower text fidelity than non-turbo Ideogram 3. Transparency uses a dedicated `/ideogram-v3/generate-transparent` endpoint with `rendering_speed:"TURBO"` — irrelevant for UI mockups.

**Failure modes.** Wireframe-fidelity ceiling. Dashboard tables with 10+ rows of varied text break. Don't ask Ideogram for "list of 8 transactions with merchant + amount + date" — it will hallucinate or garble.

**UI prompt template skeleton (Ideogram 8-section, with `style_type:"DESIGN"`, `magic_prompt:"OFF"`):**
```
[Summary] A clean [platform] UI mockup screen for [product type].
[Main Subject] A [device/browser frame] showing the [screen name] with the headline "[≤6 words]" 
prominently centered.
[Action] The interface presents [1-2 primary CTAs labeled "[≤3 words]" / "[≤3 words]"].
[Secondary Elements] [bottom nav OR sidebar] with [N] icons; [optional] one card displaying a 
single short stat.
[Setting] [light|dark] background, [brand color #HEX] accents.
[Lighting] Soft, even, flat — UI screenshot style.
[Framing] Centered, [mobile portrait | desktop landscape] aspect, screen-only.
[Enhancers] Sharp typography, crisp edges, real-product polish, no concept-art look.

negative_prompt: "checkerboard, transparent background, lorem ipsum, garbled text, blurry, 
sketch, wireframe lines"
```

### Secondary models (brief)

- **flux-2-flex / flux-2-pro (BFL).** BFL's official Flux 2 prompting guide explicitly markets `flex` for "text-heavy design and UI prototyping." Word-order priority: Main subject → Key action → Critical style → Essential context → Secondary details. 5-10 words / one tagline reliable per BFL. **No `negative_prompt` support** (BFL: "FLUX.2 does not support negative prompts"). Solid third option after OpenAI + Nano Banana Pro for UI; falls behind on text fidelity.
- **imagen-4-ultra.** Google's own guide caps text at ~25 chars / 3-4 short words. UI label fidelity insufficient for dashboards. Photoreal leader, not text leader. Vertex endpoint accepts `negativePrompt`; Gemini API endpoint does not.
- **recraft-v4.** Native vector + raster; `controls.colors` for brand palette injection. Can produce SVG-native simple UI elements (icons, marks) but full-screen UI mockups are out of scope.
- **midjourney-v7.** `--text` flag for ≤15 chars. Style-ref via `--sref`. Not API-accessible in the way the others are; UI work is paste-only via Discord/web.

## Key cross-model rules

1. **Describe the screen as if it already exists.** All five models reward "as-shipped" framing over "design sketch" framing. The OpenAI cookbook makes this explicit; Nano Banana examples reinforce it.
2. **Quote exact text.** OpenAI, Google Cloud, and Ideogram docs all converge on this. Brand names letter-by-letter on OpenAI; quoted strings on Ideogram and Google.
3. **Negatives are model-specific.** Native param: Ideogram only. Inline exclusions work on OpenAI. Silently ignored on Nano Banana family and Flux 2 — translate to positive framing ("white background" not "no checkerboard").
4. **Pixel-precise layout terminology underperforms.** No model has documented support for "8pt grid", "12-column", or specific px widths. Semantic regions ("left sidebar with 5 nav items") beat technical CSS-style specs in every official example.
5. **Refs work, but assign roles.** Google explicit ("Use Image A for…, Image B for…"); OpenAI ("reference each input by index and description"); Ideogram has dedicated style/character ref slots. Don't dump refs without explanation.
6. **Text density is the routing axis.** ≤6 words → Ideogram is fine. 6-30 words / multi-region UI → gpt-image-2 ≈ gpt-image-1.5 ≈ Nano Banana Pro. Paragraph-length on a UI screen → gpt-image-2 first, Nano Banana Pro second; everything else, composite real text in code.

Word count: ~2150.

Sources:
- [GPT Image Generation Models Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- [Gpt-image-1.5 Prompting Guide (Cookbook)](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide)
- [Gemini 3 Pro Image — Google DeepMind](https://deepmind.google/models/gemini-image/pro/)
- [Gemini 3 Pro Image Preview — ai.google.dev](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image-preview)
- [Nano Banana Pro prompting tips — blog.google](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/)
- [Ultimate prompting guide for Nano Banana — Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana)
- [Build with Nano Banana 2 — blog.google](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/)
- [Gemini 3.1 Flash Image — Google DeepMind](https://deepmind.google/models/gemini-image/flash/)
- [Mastering Gemini's 14 reference images — Apiyi](https://help.apiyi.com/en/gemini-14-reference-images-object-fidelity-character-consistency-guide-en.html)
- [Ideogram 3.0 API reference — generate-v3](https://developer.ideogram.ai/api-reference/api-reference/generate-v3)
- [Ideogram Prompt Structure guide](https://docs.ideogram.ai/using-ideogram/prompting-guide/3-prompt-structure)
- [Ideogram Magic Prompt docs](https://docs.ideogram.ai/using-ideogram/prompting-guide/7-creative-tools-in-ideogram/using-magic-prompt)
- [Ideogram 3 prompt adherence + API guide 2026 — UCStrategies](https://ucstrategies.com/news/ideogram-3-prompt-adherence-pricing-api-guide-2026/)
- [GPT Image 2 vs Nano Banana Pro — Apiyi](https://help.apiyi.com/en/gpt-image-2-vs-nano-banana-pro-image-model-showdown-en.html)
- [GPT Image 2 vs Nano Banana 2 — JXP](https://www.jxp.com/blog/gpt-image-2-vs-nano-banana-2)
- [Atlas Cloud 2026 Image API Benchmark](https://www.atlascloud.ai/blog/guides/2026-ai-image-api-benchmark-gpt-image-2-vs-nano-banana-2-pro-vs-seedream-5-0)
- [Bind AI: GPT Image 2 vs Nano Banana 2 Pro gap](https://blog.getbind.co/the-results-are-in-why-the-gpt-image-2-vs-nano-banana-2-pro-gap-is-astonishing/)
- [Pollo: GPT Image 2 vs Nano Banana 2](https://pollo.ai/hub/gpt-image-2-vs-nano-banana-2)
- [BFL FLUX.2 prompting guide](https://docs.bfl.ml/guides/prompting_guide_flux2)
- [FLUX.2 flex for text-heavy UI prototyping — Microsoft Foundry](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/meet-flux-2-flex-for-text%E2%80%91heavy-design-and-ui-prototyping-now-available-on-micro/4496041)
- [GPT Image 2 prompt guide — PixVerse](https://pixverse.ai/en/blog/gpt-image-2-review-and-prompt-guide)
- [Awesome GPT Image 2 prompts (UI mockups)](https://github.com/aitools12/awesome-gpt-image-2)
