# Prompting image models for frontend UI mockups

Synthesis of 7 parallel research streams (academic, OSS, model-dialect, practitioners, design-system, multi-ref, failure-modes). Dated 2026-05-06.

Scope: dashboards + mobile screens. Image-only — code-gen tools (v0, Aura, Pencil) deliberately excluded.

---

## Executive summary

The brutal frame first. **Across academic benchmarks, official model docs, and 30+ practitioner reports, raw text-to-image diffusion is the wrong tool for production UI mockups.** Every credible academic system stacks structural conditioning (wireframe, DSL, layout boxes via ControlNet) on top of the diffusion model.[^acad] Every practitioner who ships uses a hybrid pipeline: aesthetics model + precision model + Figma cleanup.[^prac] No publicly-shipped open-source repo wraps an image model with UI-aware post-processing — the white space is real.[^oss]

The gentler frame second. **A small set of techniques makes image-model UI generation usable for the early-iteration phase the user wants.** Strong-text models (gpt-image-2, Nano Banana Pro, Ideogram 3 Turbo) hit OCR ≤0.10 NED on short labels, converge in ≤6 iterations, and produce pixel mockups good enough for stakeholder review when paired with structural-slot prompting + reference images + a single canvas with all screens side-by-side.[^prac][^model][^fail] The output is concept-stage, not production. Validate every label against the brand bundle (OCR + ΔE2000) before declaring done.

The user's original ask — "prompt → image → quick iteration" — is achievable for a narrow band: single-screen hero shots, ≤6 labels, ≤3 charts. Outside that band the literature is unanimous: fall back to code or composite.

---

## The brutal truth — what doesn't work

Numbered for citation. Each one is triangulated across ≥2 of the 7 findings streams.

1. **Naming a design system locks vibe, not spec.**[^ds] Material 3 / Apple HIG produce recognizable "Material-ish" / "iOS-ish" output. Tailwind UI / shadcn / Radix / Fluent 2 / Polaris are invisible to every major raster model — they're code-first systems with no learned visual prior. No public LoRA exists for any of them.

2. **Token names are noise.** `bg-blue-500` is invisible. `Material elevation 2 surface` does nothing. `iOS 17 large title` does nothing. Resolved hex (`#3B82F6`) and resolved px specs (`4px blur drop shadow`, `34pt bold sans-serif left aligned`) are what the models respond to.[^ds][^model]

3. **Raw "in the style of Linear" / "Stripe-style" prompts don't work.** No practitioner post in the surveyed corpus uses brand-name design-system anchors successfully. The working substitute is reference image upload — 14 refs on Nano Banana Pro, 16 on gpt-image-2, `--sref` on Midjourney.[^prac][^ds][^ref]

4. **Pixel-precise CSS terminology underperforms.** "8pt grid", "12-column", "240px sidebar" — zero documented support across all 5 primary models. The diffusion model parses it as a vague hint and ignores it.[^model][^ds][^fail]

5. **Multi-screen consistency without reference images is unreliable.** Independent diffusion runs share no state. Color drifts screen 1 → screen 2; layout drifts further. The working pattern is single canvas with 4 screens side-by-side.[^prac][^ref][^fail]

6. **Tables, charts, dense forms, modal stacks: unfixable by prompting.** ImagenWorld benchmark documents numerical inconsistencies (>100% percentages), broken axes, hallucinated data points across all 14 evaluated models.[^fail] Diffusion models have no z-order representation — modal stacks render as a single surface, no separation.

7. **8pt grid alignment cannot be enforced from a prompt.** LACE benchmark (arXiv 2402.04754): diffusion models hit SOTA FID but worse alignment than transformer-based layout models. There is no token in any prompt that maps to "snap to 8px multiples."[^acad][^fail]

8. **Weak-text models (SDXL, SD 3.5, Flux Schnell) cannot render UI text legibly.** STRICT NED@50 chars: SD 3.5 = 0.87 (90% character error). Hugging Face model card admits the limitation. Composite real text always.[^fail]

9. **gpt-image-2 transparency 400s.** Project-memory verified regression vs 1.5. For UI screens needing translucent panels (modals, glassmorphism backdrops), use gpt-image-1.5.[^ref]

10. **Nano Banana Pro caps at 5 characters / 6 refs by architecture.** ≥6 instances of the same UI component within one render drifts in radius/padding/typography. Architectural limit, not promptable.[^fail]

11. **9:19.5 mobile aspect is OOD for every model.** Generate at 9:16 and crop, or composite. Trying to force 9:19.5 produces duplication and cropping artifacts.[^fail]

12. **The "5-paragraph adjective stack" pattern is dead.** Pre-2025 Midjourney guides ("clean futuristic minimalist neon...") show no before/after evidence. Practitioner consensus on Nano Banana Pro and gpt-image-2: structural slots beat adjectives.[^prac][^model]

---

## What actually works — the synthesized playbook

### Rule 1: Use a structural slot prompt, not adjectives

Triangulated across model-dialect docs (OpenAI cookbook 1.5: "short labeled segments or line breaks"), Google's Nano Banana guide ("[Subject][Action][Location]" bracket tags), and 5+ practitioner posts.[^model][^prac]

The slot order that converges:

```
[Asset]      realistic <platform> UI mockup
[Frame]      <device chassis | browser chrome>
[Header]     <logo, page title, account avatar>
[Sidebar]    <nav items with exact labels in quotes>
[Main]       <region 1 with concrete content>
             <region 2 with concrete content>
             <region 3 with concrete content>
[Footer]     <optional>
[Style]      <light|dark> mode, accent #HEX, sans-serif, minimal decoration
[Quality]    high. Render all text legibly. No lorem ipsum, no placeholder logos.
```

Slot labels are literal text in the prompt. The model parses them.

### Rule 2: Realistic content. No lorem ipsum.

Single most-repeated rule across the practitioner corpus (5+ independent sources). Diffusion models render the literal characters they see — `lorem ipsum` becomes the visible text. Write actual transaction names, real metric values, real chart labels. The Spinner Substack tests confirm: even on Nano Banana Pro, abstract content produces garbled output.[^prac]

### Rule 3: Quote exact text. Spell brand names letter-by-letter.

OpenAI: "put literal text in quotes or ALL CAPS." Google: quoted strings. Ideogram: quoted strings. For brand names, OpenAI cookbook recommends letter-by-letter ("L-I-N-E-A-R") for tricky words.[^model]

### Rule 4: Reference images do the design-system work, not the prompt

For brand fidelity / design-system lock:
- **Nano Banana Pro**: 14 refs (5 high-fidelity), object vs character split. Pass brand screenshot as object[0].
- **gpt-image-1.5/-1**: 16 refs on `/edits`. **First ref preserved at extra-rich texture** — load the wireframe or target screenshot first.
- **Flux 2 Pro/Flex**: 8 (API) / 10 (Playground) refs, **only model with explicit ordinal indexing in prompt** ("from image 2"). Best for "wireframe + style + logo" three-ref UI workflows.
- **Midjourney v7**: `--sref` (style) + `--oref <logo>` (1 image, weight 0–1000, sweet spot ~400) + prompt for layout.
- **Recraft V4**: build `style_id` from 1–5 brand screens once, reuse on every call. Inverted workflow.

The full per-model recipe table is in `findings/06-multi-ref-workflows.md`.[^ref]

### Rule 5: Single canvas with multiple screens beats multiple calls

Practitioner pattern (Oikon's blueprint, Vernade's Google DevRel guide, Replicate's character-lock case): generate 4 screens horizontally on one canvas. Multi-image generation across separate calls drifts in palette and layout — one wide canvas does not.[^prac][^ref]

### Rule 6: Pick the model by text density

- ≤6 words per screen → Ideogram 3 Turbo is fine, has native `negative_prompt`, cheap.
- 6–30 words / multi-region UI → gpt-image-2 ≈ gpt-image-1.5 ≈ Nano Banana Pro.
- Paragraph-length copy on screen → gpt-image-2 first, Nano Banana Pro second.
- Hero/marketing only (no real labels) → Midjourney v7, Flux 2 Pro acceptable.
- Production-grade dashboards with real labels/forms/tables → **fall back to code.** Nothing in the survey supports this from diffusion alone.[^model][^fail]

### Rule 7: Composite real text post-render for anything <18pt

Academic literature, failure-mode catalog, and practitioner playbook converge: diffusion models can't render <18pt text reliably. Render the surrounding scene, then composite real type via Satori/Skia/Canvas in the application layer. CLAUDE.md already documents this rule for weak-text models — the research extends it to mid-text models for small UI labels.[^acad][^fail][^ds]

### Rule 8: Iteration cap = 6 on strong-text models. If it doesn't converge, change tactic, not prompt.

jidonglab reports 47 → 6 iterations on gpt-image-2 with codebase context. Spinner used 2-3 regens per test on Nano Banana Pro. Strong-text models converge in ≤6 if they're going to converge. Beyond that the issue is structural (Spinner's color-fill ripples were unfixable by reprompting). Rotate model or move to manual cleanup.[^prac]

### Rule 9: Always finish in code or in Figma. Never ship raw output.

Universal across every practitioner post. Figma plugin exists for Nano Banana Pro. vectorizer.ai for raster→SVG. Adobe Express / Photoshop for color-fill touchup. Image model output is inspiration + composition reference, not shippable UI.[^prac]

### Rule 10: Validate before declaring done

Every output through the project's existing tier-0/1/2 stack:
- OCR Levenshtein ≤1 against intended labels
- Palette ΔE2000 ≤10 vs brand bundle
- Aspect ratio exact (or crop-after policy)
- No checkerboard FFT signature

CLAUDE.md already has this rule for assets generally. The research confirms it applies fully to UI mockups — Spinner's "always proofread carefully" is the practitioner version of OCR validation.[^prac][^fail]

---

## Routing decision tree

```
What are you generating?
│
├─ Production-ready dashboard with real data/forms/tables
│  └─ FALL BACK TO CODE (v0 / Aura / Banani / hand-write Tailwind)
│     Image gen will not get you there. Stop.
│
├─ Concept-stage dashboard mockup, ≤6 labels, ≤3 charts
│  ├─ Have brand reference screenshots?
│  │  ├─ Yes → Flux 2 Pro (3-ref ordinal: wireframe + screenshot + logo)
│  │  │       OR Nano Banana Pro (object refs: screenshot + logo)
│  │  │       OR gpt-image-1.5 /edits (16 refs, wireframe first)
│  │  └─ No  → gpt-image-2 with structural slot prompt + real content
│  │           OR Nano Banana Pro with [Subject][Action][Location] tags
│  └─ Validate: OCR ≤1, ΔE ≤10, aspect exact
│
├─ Mobile app screen, single, hero context (onboarding, splash, empty state)
│  ├─ Text-heavy (≥6 words) → gpt-image-2 / Nano Banana Pro
│  ├─ Text-light (≤6 words, 1 CTA) → Ideogram 3 Turbo with style_type:"DESIGN", magic_prompt:"OFF"
│  └─ Hero illustration only, no labels → Flux 2 Pro / Midjourney v7
│
├─ Multi-screen consistent set (4+ screens, brand-locked)
│  ├─ Single canvas, 4 screens side-by-side → gpt-image-2 or Nano Banana Pro
│  │   (proven pattern: Oikon, Vernade, Replicate)
│  └─ Or build a Recraft style_id once, generate per screen
│
├─ Hero art / empty state / onboarding scene (no UI structure)
│  └─ Any model. This is what diffusion is actually good at.
│
└─ Brand mark / app icon / favicon
   └─ Use the existing P2A inline_svg or asset_generate_logo pipeline.
      Not in scope of this research.
```

---

## Per-model quick reference

| Model | UI verdict | Refs | Negatives | Text ceiling | Use for |
|---|---|---|---|---|---|
| **gpt-image-2** | Best for UI; LMArena +242 Elo over Nano Banana Pro on text-heavy[^model] | 16 (`/edits`) | Inline only | ~99% (third-party benchmarks) | Default for dashboards with labels, forms, multi-region. **No transparency.** |
| **gpt-image-1.5** | Strong; cookbook flagship UI example | 16 (`/edits`), first preserved at high fidelity | Inline only | Dense text reliable with `quality:"high"` | UI with translucent panels (gpt-image-2 transparency broken) |
| **nano-banana-pro** (gemini-3-pro-image) | Strong text + reasoning; Google pitches as "high-fidelity product mockups" | 11 (6 obj + 5 char) | **Not supported — positive framing only** | ~200 chars / paragraph | Dashboards when bracket-tag prompt format fits |
| **nano-banana-2** (gemini-3.1-flash-image) | Faster, near-Pro; Google ships UI example in announcement | 14 (10 obj + 4 char) | Not supported | ~90% accuracy | Dashboards when ref budget > Pro is needed |
| **ideogram-3-turbo** | Wireframe-fidelity; weak for dense copy | ≤10MB style refs | **Yes, native `negative_prompt`** | ~3-6 words / element | Onboarding, splash, marketing screens with hero copy + 1-2 CTAs |
| **flux-2-pro / -flex** | "Text-heavy design and UI prototyping" per BFL; only model with ordinal indexing | 8 (API) / 10 (playground) | Not supported | 5-10 words / 1 tagline | Multi-ref UI when "wireframe + screenshot + logo" workflow needed |
| **midjourney-v7** | Hero/mood only; text gibberish | 1 oref + sref + cref | Not supported | ~15 chars with `--text` | Hero shots, mood pieces; never UI with real labels |
| **imagen-4-ultra** | Photoreal leader, not text leader; Google caps text at ~25 chars | Vertex multi-ref | Vertex only | ~3-4 short words | Hero illustration above the dashboard, not the dashboard |
| **recraft-v4** | SVG-native; best for icons/marks, not full UI screens | 1-5 (style build) + 1 (i2i) | Native | Small wordmarks | Logo/icon/brand-mark; SVG output |
| **SDXL + ControlNet (MLSD) + IP-Adapter** | Only stack with structure/style/content as 3 distinct knobs | 2-3 adapters | Native | Cannot render UI text | Wireframe-locked dashboards in ComfyUI; composite text |

Per-model prompt templates: see `prompts/` directory.

---

## Cross-model rules that always apply

1. Describe the screen as if it already exists ("a working SaaS dashboard"), not as a design ("a mockup of...").[^model][^prac]
2. Quote exact label text. Spell brand names letter-by-letter on OpenAI.[^model]
3. Translate design tokens to resolved values: hex codes, px shadows, pt typography. Token names are noise.[^ds]
4. Pass brand fidelity via reference images, not via brand-name strings.[^ds][^ref][^prac]
5. Set aspect ratio in the first sentence. Generate at the closest supported aspect, crop to target.[^prac][^fail]
6. Generate 4 screens on one canvas for cross-screen consistency.[^prac][^ref]
7. Validate every output. OCR + palette + safe-zone before ship.[^fail]

---

## Open gaps and whitespace

Real opportunities the OSS ecosystem has not filled. Each is a candidate for prompt-to-asset to occupy.

1. **No public ControlNet (MLSD/Lineart) → wireframe → Flux + UI-LoRA workflow exists.** The textbook structure-conditioned pattern from the academic literature, packaged as a usable ComfyUI graph for UI specifically. Cheapest demonstrable "better than raw prompting." Rated 9/10 as a P2A deliverable.[^oss]

2. **No design-system-specific LoRA exists.** No public Material 3, Apple HIG, Tailwind, shadcn LoRA on Civitai or HuggingFace as of 2026-04. Training one on the official component galleries + screenshots would be the first.[^ds][^oss]

3. **No practitioner has published an OCR-Levenshtein validation loop for UI labels.** P2A's existing tier-0/1/2 stack already does this for assets — extending to UI mockups closes the "always proofread carefully" gap.[^prac][^fail]

4. **No UI-specific benchmark with diffusion targets exists.** Sketch2Code (NAACL 2025) tests VLM→HTML, not diffusion→pixels. STRICT tests text rendering generally, not UI specifically. ImagenWorld lumps "screenshots" into a single category. A UI-specific benchmark with typed-IoU + OCR-Levenshtein + ΔE on a held-out screenshot set would be foundational research.[^acad][^fail]

5. **gpt-image-2 transparency regression unfixed.** OpenAI hasn't shipped a fix for `background:"transparent"` 400s. Workaround: use gpt-image-1.5. Worth tracking as it changes.

---

## What this means for the user's original ask

The user wanted: prompt → image-model → quick UI iteration loop, faster than v0/Pencil/Open Pencil's tokens-on-design.

The honest answer:

- For **single-screen hero / onboarding / empty-state / marketing UI** with ≤6 real labels: yes, this works on gpt-image-2 or Nano Banana Pro with the structural-slot prompt. ≤6 iterations to converge.
- For **multi-screen brand-consistent sets**: yes, on a single canvas with 4 screens side-by-side, ref-image-locked. Limited to ~4 screens before drift.
- For **production dashboards with real data, forms, tables, charts**: no. The literature, the benchmarks, and 30+ practitioner posts agree. Fall back to code (v0/Aura/Banani) or hand-write.

The "really quick iteration on a starting point" the user wants is real for the first two cases. Not for the third. Hard truth, not a soft answer.

---

## Cross-references

- `findings/01-academic.md` — arXiv literature, Sketch2Code benchmark, ControlGUI
- `findings/02-github-oss.md` — Civitai LoRAs, RICO/wave-ui-25k datasets, OSS gaps
- `findings/03-model-dialect.md` — per-model prompt syntax, text ceilings
- `findings/04-practitioners.md` — Medium/dev.to/Substack practitioner playbook
- `findings/05-design-system-grounding.md` — Material/HIG/Tailwind/shadcn grounding
- `findings/06-multi-ref-workflows.md` — Flux 2 / Nano Banana / IP-Adapter recipes
- `findings/07-failure-modes.md` — STRICT/ImagenWorld/LACE quantified failures
- `prompts/` — paste-ready per-model prompt templates

---

[^acad]: `findings/01-academic.md` — UI-Diffuser, ControlGUI, Sketch2Code, WireGen, PrototypeFlow.
[^oss]: `findings/02-github-oss.md` — Civitai/HF LoRA inventory, dataset map, ComfyUI workflow gaps.
[^model]: `findings/03-model-dialect.md` — OpenAI cookbook, Google Nano Banana guide, Ideogram docs, BFL Flux 2 guide.
[^prac]: `findings/04-practitioners.md` — n=12 practitioner sources, Spinner controlled tests, jidonglab iteration data.
[^ds]: `findings/05-design-system-grounding.md` — NN/g, UX Planet, LogRocket, Recraft, BFL Flux 2 brand-fidelity.
[^ref]: `findings/06-multi-ref-workflows.md` — per-model multi-image API surfaces, Flux 2 ordinal indexing, MJ oref.
[^fail]: `findings/07-failure-modes.md` — STRICT, ImagenWorld, LACE benchmarks, 30+ practitioner failure reports.
