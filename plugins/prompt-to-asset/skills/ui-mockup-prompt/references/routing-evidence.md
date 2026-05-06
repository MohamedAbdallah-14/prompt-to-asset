# Routing evidence

The numbers behind the routing decision in `SKILL.md`. Sourced from the parallel research bundle in `docs/research/ui-mockup-prompting/REPORT.md` (and its `findings/` directory).

## Text accuracy benchmarks

**STRICT (CVPR/EMNLP 2025)** measures normalized edit distance after OCR. Lower NED = better. At the **50-character** length (a UI nav row):

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

Strong-text frontier (GPT-4o family, Gemini 2.0+) holds to ~800 chars. Everything else degrades at 50 chars.

**Practitioner-tested, post-STRICT:**
- Nano Banana 2: 87% legible-text accuracy on 100-prompt mixed test (nanowow benchmark).
- gpt-image-2: vendor + third-party claim ~99% across Latin/CJK/Hindi/Bengali (PixVerse, Pollo, JXP, Atlas Cloud).
- LMArena Image: gpt-image-2 = 1512 Elo, **+242 over Nano Banana Pro** at launch.

**Implication for routing:** UI mockups with real labels need NED ≤0.10. Only gpt-image-2 / gpt-image-1.5 / Nano Banana Pro hit that. Everything else, composite text or use for hero-only.

## Failure-mode benchmark (ImagenWorld)

ImagenWorld (May 2025) puts "information graphics + screenshots" at **~0.55 human rating vs ~0.78 for art/photoreal** across 14 evaluated models — UI is the worst category for every image model tested.

Specific failures documented:
- Numerical inconsistencies (>100% percentages, misaligned sums)
- Broken chart axes, hallucinated data points
- Component drift across repeated instances
- Misalignment in dense layouts

Source: https://blog.comfy.org/p/introducing-imagenworld

## Layout fidelity ceiling (Sketch2Code)

Sketch2Code (NAACL 2025) tests VLM → HTML. Even Claude 3.5 Sonnet and GPT-4o cap at **~21–22% layout-IoU** on UI sketches. Open-source VLMs sit below 10%.

**Implication:** even the best models can't faithfully translate a sketch to a layout. The skill makes no promise of layout fidelity — it produces inspiration, not pixel-spec.

Source: https://arxiv.org/abs/2410.16232

## Multi-reference budgets (per model)

| Model | Refs | Indexing |
|---|---|---|
| gpt-image-1.5 / -1 | 16 (`/edits`) | First ref preserved at extra-rich texture; subsequent refs normal high fidelity |
| gpt-image-2 | 16 (`/edits`) | Same as 1.5; transparency (`background:"transparent"`) regression |
| Nano Banana Pro | 11 (6 obj + 5 char) | Object-fidelity vs character-consistency split |
| Nano Banana 2 (Flash) | 14 (10 obj + 4 char) | Larger object budget than Pro |
| Flux 2 Pro / Flex | 8 (API) / 10 (Playground) | **Only model with documented prompt-level ordinal indexing** ("from image 2") |
| Midjourney v7 | 1 oref + N sref + N cref | Role-typed: omni / style / character |
| Ideogram 3 Turbo | ≤10MB style refs total | OR style codes (mutually exclusive) |
| Recraft V4 | 1–5 (style build) + 1 (i2i) | Inverted: pre-build style_id once, reuse |

## Model-specific limits (architecture, not promptable)

- **Nano Banana Pro / 2:** caps at 5 character refs / 6 object refs. Past 6 instances of the same UI component in one render, drift wins. Architectural — no prompt fixes it.
- **gpt-image-2:** `background: "transparent"` regression vs 1.5. Use 1.5 for any glassmorphism / translucent UI.
- **Flux 2 family:** `negative_prompt` silently no-op. Use positive anchors only.
- **Nano Banana family:** `negative_prompt` silently ignored. Google's explicit rule: positive framing only.
- **Ideogram 3 Turbo:** only model with native `negative_prompt`. Hard ceiling ~150 words / ~200 tokens per prompt.
- **Midjourney v7:** text past ~15 chars is gibberish. Hero / mood / mood-with-faux-text only.

## Practitioner iteration data

- **jidonglab (gpt-image-2 inside codex):** 47 → 6 iterations per asset; ship time 4.5h → 38min.
- **Spinner Substack (Nano Banana Pro, 6 controlled tests):** 2–3 regens per test, 2h per design, "~80% of the way there."
- **Chechique (Midjourney v6.1):** 4+ rounds typical, no count given.

**Iteration cap:** 6 on strong-text models. Beyond that, the issue is structural (Spinner's color-fill ripples were unfixable by reprompting). Rotate model or move to manual cleanup.

## Why these numbers matter for the skill

The routing decision in `SKILL.md` isn't taste. It's data:

- "≥6 real labels → gpt-image-2 / Nano Banana Pro" comes from STRICT NED@50.
- "Glassmorphism → gpt-image-1.5" comes from the gpt-image-2 transparency regression.
- "3+ refs → Flux 2" comes from Flux 2 being the only model with documented ordinal indexing in the prompt.
- "≤6 words → Ideogram" comes from its hard text ceiling.
- "Hero only → Midjourney" comes from its text-gibberish failure mode.

Skip the routing and you waste iterations on the wrong model.

## Cross-references

- Full data: `docs/research/ui-mockup-prompting/findings/07-failure-modes.md`
- Per-model dialect deep-dives: `docs/research/ui-mockup-prompting/findings/03-model-dialect.md`
- Multi-ref recipes: `docs/research/ui-mockup-prompting/findings/06-multi-ref-workflows.md`
- Master synthesis: `docs/research/ui-mockup-prompting/REPORT.md`
