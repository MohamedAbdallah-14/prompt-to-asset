# 07 — Failure-mode catalog: image-model UI generation

**Scope.** Where prompting an image model for a frontend UI mockup (dashboards + mobile screens) reliably breaks. Use this to skip / composite / fall back to code, not to "engineer better prompts" through it.

**Headline finding.** Across the academic benchmarks (STRICT, ImagenWorld, Design2Code/WebCode2M) and practitioner reviews from 2025-2026, **information graphics and screenshots are the worst-performing category for every evaluated image model** — ImagenWorld puts text-rich/screenshot output at ~0.55 human rating vs ~0.78 for art and photoreal, and the gap is consistent across 14 models including GPT-Image-1, Imagen, Qwen-Image, Flux ([ImagenWorld](https://blog.comfy.org/p/introducing-imagenworld)). Treat UI generation as a routing-and-composite problem, not a prompt problem.

---

## Per-mode evidence

### 1. Small-text legibility (nav, table cells, form labels, footnotes)

Two evidence streams. STRICT (CVPR/EMNLP 2025) measures normalized edit distance after OCR across 5–5000 char text; lower NED = better. At the **50-character** length (roughly a nav row or 6-word label):

| Model | NED@50 chars | NED@200 chars |
|---|---|---|
| GPT-4o (gpt-image-1) | 0.07 | 0.07 |
| Gemini 2.0 | 0.20 | 0.06 |
| Recraft V3 | 0.39 | 0.27 |
| Imagen 3 | 0.41 | 0.68 |
| Seedream 3.0 | 0.75 | 0.75 |
| FLUX 1.1 pro | 0.77 | 0.86 |
| HiDream-I1-Dev | 0.85 | 0.64 |
| SD 3.5 | 0.87 | — |

Source: [STRICT, arXiv 2505.18985](https://arxiv.org/html/2505.18985v1). Strong-text frontier (GPT-4o, Gemini 2.0) holds up to ~800 chars before degrading; everything else is degraded at the **50-char** mark already, i.e. unusable for navigation rows or table headers.

Practitioner data confirms: Nano Banana 2 third-party stress test reports 87% legible-text accuracy across 100 mixed prompts ([nanowow](https://nanowow.ai/nano-banana-2-review)); GPT-Image-2 vendor-amplified claim is >95% across Latin/CJK/Arabic ([fal.ai review](https://fal.ai/learn/tools/gpt-image-2-review), [PixVerse review](https://pixverse.ai/en/blog/gpt-image-2-review-and-prompt-guide)). Midjourney v6 stress test: 37 iterations to converge a single label with kerning still drifting ([UX Planet](https://uxplanet.org/ui-design-with-midjourney-df78eaa2d292)).

**Numeric ceiling.** Reliable rendering of UI text at typical mobile-screen sampling (~14–16 px label height in 1024-wide canvas):
- gpt-image-2, Nano Banana Pro: usable down to ~12 px label height; multi-row tables stay legible.
- Ideogram 3 Turbo, gpt-image-1: reliable for headlines + 3-6 word labels; fails for footnotes.
- Flux 1.1 pro / FLUX-2 family: 5-10 words / 1 tagline reliable per BFL guide; small-label rows are not.
- SDXL / SD 1.5 / SD 3 / SD 3.5: cannot render legible UI text. HF model card admits this.

### 2. Component repetition (same button × 12)

INSUFFICIENT QUANTITATIVE EVIDENCE for a per-model number. Qualitative practitioner consensus across multiple reviews ([gendesigns](https://gendesigns.ai/blog/ai-generated-ui-mistakes-how-to-fix), [ministryofprogramming](https://ministryofprogramming.com/blog/why-ai-generated-ui-fails-in-production)): repeated components drift in corner radius, padding, and label typography even within a single generation. Nano Banana Pro multi-image consistency ceiling is **5 characters / 6 references** per [Apatero](https://apatero.com/blog/nano-banana-pro-multi-reference-14-images-5-faces-guide-2025); above that, the identity-latent mechanism degrades — by extension, ≥6 instances of the same UI component within one render is not reliable.

### 3. Alignment / grid drift (8pt, baseline, gutters)

Layout-diffusion benchmarks: "diffusion-based models have achieved state-of-the-art FID scores but tend to exhibit more pronounced misalignment compared to earlier transformer-based models" ([LACE, arXiv 2402.04754](https://arxiv.org/html/2402.04754v2)). No image model maintains an 8pt grid without ControlNet / layout guidance. ImagenWorld: "misaligned charts" listed as a common failure across all 14 evaluated models. This is not a prompting problem — there's no token in the prompt that maps to "snap to 8px multiples."

### 4. Dense forms (10+ fields)

INSUFFICIENT DIRECT BENCHMARK. Inferable from STRICT instruction-following data: as label count rises, the "ratio of not following instructions" climbs sharply for every model except gpt-image and Gemini 2.0 ([STRICT](https://arxiv.org/html/2505.18985v1)). Practitioner data: GPT-Image-2 review notes "high-fidelity mockup prompts were more variable, with some runs returning something that looked like a real product while others returned a slightly garbled imitation" ([weshop.ai](https://www.weshop.ai/blog/gpt-image-2-looks-impressive-until-you-start-testing-the-edges/)). For ≥10 fields with distinct labels, expect label-text drift, type-input mismatch (text input rendered as date picker), and column misalignment.

### 5. Tables (rows × columns × headers × numbers)

ImagenWorld documents specific failures: "numerical inconsistencies (percentages exceeding 100%, misaligned sums)," "incorrect label placement and misaligned semantic segments." No model in the evaluation handles tabular numerical content reliably ([ImagenWorld](https://blog.comfy.org/p/introducing-imagenworld)). GPT-Image-2 reviews show isolated successes ("dashboard preview includes a line chart, a top-products table at the right" — [imagine.art](https://www.imagine.art/blogs/gpt-image-2-prompt-guide)), but the same reviewers concede precision-heavy layouts hit a hard ceiling.

### 6. Charts / data viz

Same ImagenWorld failure cluster: "chart and plot errors with broken internal logic," "axes manipulation" failures. Vision-language model literature on chart deception ([arXiv 2508.09716](https://arxiv.org/html/2508.09716v1)) confirms axis-encoding errors propagate through generation. Image models hallucinate plausible-but-wrong data points; legends frequently disagree with rendered series colors. Treat charts as **always-composite**.

### 7. Modal / overlay stacks (z-order, backdrop bleed)

INSUFFICIENT EVIDENCE in benchmarks. Practitioner reports note overlay-state hallucinations are common ([gendesigns](https://gendesigns.ai/blog/ai-generated-ui-mistakes-how-to-fix) lists "missing interaction states: AI shows static screens but doesn't account for loading states, error states, empty states, hover/focus states"). Diffusion models have no explicit z-order representation; they synthesize a single rendered surface, so backdrop tint vs modal contrast is not controllable.

### 8. Iconography (cart icon for cart, etc.)

INSUFFICIENT QUANTITATIVE EVIDENCE specific to UI icons. The general image-hallucination literature documents "phantom objects, fabricated details" especially around small symbolic regions ([rewarx](https://www.rewarx.com/blogs/remove-hallucination-ai-image-generation), [I-HallA, arXiv 2409.12784](https://sgt-lim.github.io/I-HallA/)). Empirically: icon-text-semantic mismatch is high for any 16-32 px icon glyph; only large icons (≥64 px) match the labelled affordance reliably.

### 9. Dark/light mode consistency across screens

INSUFFICIENT EVIDENCE. Architecturally analogous to brand-color drift (mode #10) — same root cause: no shared state between independent diffusion runs. Use a single canvas with multiple screens side-by-side, or fall back to code.

### 10. Brand consistency across screens (color drift screen 1 vs screen 2)

Direct data: Nano Banana Pro caps at **5 character / 14 image** identity carry; even within that, "eye-shape drift is the most common failure" and the model cannot achieve 100% identity consistency by architectural design ([blog.laozhang.ai](https://blog.laozhang.ai/en/posts/nano-banana-pro-face-consistency-guide), [techyheaven](https://techyheaven.com/nano-banana-pro-character-consistency/)). The same mechanism gates brand-color carry. Designer mitigation pattern documented across multiple sources: re-anchor the hex code in every prompt block, single canvas with all screens, or fan out via Recraft `controls.colors` / Midjourney `--sref` ([dev.to/oikon](https://dev.to/oikon/nano-banana-special-prompt-achieved-rapid-mobile-ui-mockups-1mif)).

### 11. Aspect ratio quirks

GPT-Image-1 originally could not emit native 16:9 / 9:16; users had to outpaint via SD ([Sacha Dumay](https://medium.com/@dumaysacha/i-finally-fixed-chatgpt-image-ratio-with-stable-diffusion-outpainting-49225e77026b)). Stable Diffusion is trained at 1:1 base; non-square ratios produce duplicated subjects and crop artifacts ([WinXDVD](https://www.winxdvd.com/ai-tips/best-image-size-for-stable-diffusion.htm)). 9:19.5 (modern phones) is *not* in any model's training distribution — every model treats it as an extreme out-of-distribution ratio. Generate at the closest supported ratio (9:16, 9:19.5 ≈ 1080×2340) and crop, or composite.

### 12. OCR/Levenshtein on labels

Per-model data from STRICT (50-char NED) → equivalent character error rate in the table at the top of section 1. For UI work, the practical thresholds are:
- gpt-image-2 / Nano Banana Pro / Imagen 4 Ultra: NED ≤0.10 → safe for first-class UI text.
- Gemini 2.0 / gpt-image-1 / Recraft V3: NED 0.10–0.40 → safe for short labels, retry on failures.
- Imagen 3 / Seedream / FLUX 1.1 pro: NED ≥0.40 → composite text post-render.
- SDXL / SD 1.5 / SD 3 / SD 3.5: composite always; the model card admits unreadable text.

---

## Recommendations — decision matrix

For each failure mode: **skip** = don't ask the model for it; **composite** = render the surrounding scene, layer real type/icons/charts on top in code; **fall back to code** = generate React/Tailwind/Flutter directly via an LLM, skip diffusion.

| Failure mode | Strong-text models (gpt-image-2, Nano Banana Pro, Ideogram 3T) | Mid-text models (Imagen 3/4, Recraft V3, Flux 1.1) | Weak-text models (SDXL, SD 3.5, Flux Schnell) |
|---|---|---|---|
| Small text legibility | Use; OCR-validate every label | Composite type via Satori/Skia | Composite always |
| Component repetition (≥6) | Composite from a single component master | Composite | Composite |
| 8pt / baseline grid | **Fall back to code** | **Fall back to code** | **Fall back to code** |
| Dense forms (≥10 fields) | **Fall back to code**; AI for hero shot only | **Fall back to code** | **Fall back to code** |
| Tables with numeric data | **Skip**; render in HTML/SwiftUI | **Skip** | **Skip** |
| Charts / data viz | **Skip**; use Recharts/Vega-Lite, image-gen for empty-state art | **Skip** | **Skip** |
| Modal / overlay stacks | Composite — render base screen, overlay separately | Composite | Composite |
| Iconography (≤48 px) | Composite from icon font (Lucide/Phosphor) | Composite | Composite |
| Dark/light mode pair | Single canvas with both modes side-by-side, or **fall back to code** | **Fall back to code** | **Fall back to code** |
| Brand color across screens | Single canvas, re-anchor hex per block; cap at 4 screens | Recraft `controls.colors` / Midjourney `--sref` | LoRA only above 20 assets |
| Mobile aspect 9:19.5 | Generate at 9:16, crop or outpaint | Same | Same |
| Long-form labels | Use up to 200 chars (Nano Banana Pro, gpt-image-2) | Composite | Composite |

**Default routing.** For dashboards and mobile screens with real labels/forms/tables/charts, the answer is **fall back to code**. Use image generation for: hero illustration above the dashboard, empty-state spot art, onboarding scenes, marketing screenshots with stylized rather than functional content, and brand mark / app icon. The 30+ practitioner reviews surveyed are unanimous: AI-generated UI mockups are flat pixel layers without component structure, auto-layout, or states ([gendesigns](https://gendesigns.ai/blog/ai-generated-ui-mistakes-how-to-fix), [mindstudio](https://www.mindstudio.ai/blog/death-of-the-mockup-ai-design-to-code), [ministryofprogramming](https://ministryofprogramming.com/blog/why-ai-generated-ui-fails-in-production)) — they cannot be the source-of-truth artifact.

**What survived.** Single-screen hero shots with ≤6 labels and ≤3 charts on Nano Banana Pro / gpt-image-2 / Ideogram 3 Turbo are usable as concept-stage visuals if every label passes an OCR Levenshtein ≤1 check and palette ΔE2000 ≤10 against the brand bundle. Anything else — ship code.

---

## Sources

- [STRICT: Stress Test of Rendering Images Containing Text (arXiv 2505.18985)](https://arxiv.org/html/2505.18985v1)
- [ImagenWorld: A Real World Benchmark](https://blog.comfy.org/p/introducing-imagenworld)
- [LACE — Towards Aligned Layout Generation (arXiv 2402.04754)](https://arxiv.org/html/2402.04754v2)
- [I-HallA: Hallucination in Text-to-Image Generation (arXiv 2409.12784)](https://sgt-lim.github.io/I-HallA/)
- [Chart Deception in VLMs (arXiv 2508.09716)](https://arxiv.org/html/2508.09716v1)
- [Design2Code Benchmark](https://salt-nlp.github.io/Design2Code/)
- [WebCode2M Dataset](https://webcode2m.github.io/)
- [TextInVision (CVPR 2025 Workshop)](https://openaccess.thecvf.com/content/CVPR2025W/BEAM/papers/Fallah_TextInVision_Text_and_Prompt_Complexity_Driven_Visual_Text_Generation_Benchmark_CVPRW_2025_paper.pdf)
- [Nano Banana 2 Review (nanowow)](https://nanowow.ai/nano-banana-2-review)
- [Nano Banana Pro Multi-Reference (Apatero)](https://apatero.com/blog/nano-banana-pro-multi-reference-14-images-5-faces-guide-2025)
- [Nano Banana Pro Face Consistency (LaoZhang)](https://blog.laozhang.ai/en/posts/nano-banana-pro-face-consistency-guide)
- [Nano-Banana Mobile UI Mockups (dev.to/oikon)](https://dev.to/oikon/nano-banana-special-prompt-achieved-rapid-mobile-ui-mockups-1mif)
- [GPT-Image-2 Review — fal.ai](https://fal.ai/learn/tools/gpt-image-2-review)
- [GPT-Image-2 Review — PixVerse](https://pixverse.ai/en/blog/gpt-image-2-review-and-prompt-guide)
- [GPT-Image-2 Edge Cases — weshop.ai](https://www.weshop.ai/blog/gpt-image-2-looks-impressive-until-you-start-testing-the-edges/)
- [Why AI-Generated UI Looks Bad (gendesigns)](https://gendesigns.ai/blog/ai-generated-ui-mistakes-how-to-fix)
- [Why AI-Generated UI Fails in Production (ministryofprogramming)](https://ministryofprogramming.com/blog/why-ai-generated-ui-fails-in-production)
- [Death of the Mockup (MindStudio)](https://www.mindstudio.ai/blog/death-of-the-mockup-ai-design-to-code)
- [UI Design with Midjourney (UX Planet)](https://uxplanet.org/ui-design-with-midjourney-df78eaa2d292)
- [ChatGPT Image-1 Aspect Ratio Workaround (Sacha Dumay)](https://medium.com/@dumaysacha/i-finally-fixed-chatgpt-image-ratio-with-stable-diffusion-outpainting-49225e77026b)
