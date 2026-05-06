# UI mockup prompting — research bundle

Multi-agent research deliverable, dated 2026-05-06. Synthesizes 7 parallel investigations into how to prompt image diffusion models for frontend UI mockups (web dashboards + mobile screens).

## Quick start — "I want to generate a dashboard right now"

1. Read [REPORT.md § Routing decision tree](./REPORT.md#routing-decision-tree) — picks the right model in 30 seconds.
2. Open the matching template in [`prompts/`](./prompts/).
3. Replace the bracketed placeholders with real content (real customer names, real metric values — never lorem ipsum).
4. Send to the model.
5. Validate: OCR Levenshtein ≤1 against intended labels, palette ΔE2000 ≤10 vs brand bundle, aspect exact.
6. Cap iterations at 6. If it doesn't converge, change tactic, not prompt.

## What's in this bundle

```
docs/research/ui-mockup-prompting/
├── README.md                         # this file
├── REPORT.md                         # master synthesis: brutal truth + playbook + decision tree
├── findings/                         # raw research (7 files, evidence base)
│   ├── 01-academic.md                # arXiv: UI-Diffuser, ControlGUI, Sketch2Code, WireGen
│   ├── 02-github-oss.md              # Civitai LoRAs, RICO/wave-ui datasets, OSS gaps
│   ├── 03-model-dialect.md           # per-model prompt syntax: gpt-image-2/1.5, NBP, NB2, Ideogram
│   ├── 04-practitioners.md           # Medium/dev.to/Substack n=12 corpus, Spinner controlled tests
│   ├── 05-design-system-grounding.md # Material/HIG/Tailwind/shadcn — what locks, what doesn't
│   ├── 06-multi-ref-workflows.md     # Flux 2 ordinal, Nano Banana 14-ref, IP-Adapter recipes
│   └── 07-failure-modes.md           # STRICT/ImagenWorld/LACE quantified failures
└── prompts/                          # paste-ready per-model templates
    ├── _skeleton.md                  # cross-model structural slot pattern + universal rules
    ├── gpt-image-2.md                # default for any UI with real labels (LMArena #1)
    ├── gpt-image-1.5.md              # use when transparency / dense forms matter
    ├── nano-banana-pro.md            # bracket-tag dialect, Google's "high-fidelity mockups"
    ├── nano-banana-2.md              # Flash variant, more object refs, faster, cheaper
    ├── ideogram-3-turbo.md           # short-text marketing/onboarding, native negative_prompt
    ├── flux-2-pro.md                 # only model with prompt-level ordinal indexing
    ├── midjourney-v7.md              # hero/mood ONLY — text is gibberish
    └── sdxl-controlnet-ipadapter.md  # local stack with structure/style/content as 3 knobs
```

## The single most important takeaway

**Image diffusion is the wrong tool for production UI.** Both the academic literature (Sketch2Code: even Claude 3.5 + GPT-4o cap at ~22% layout-IoU on UI sketches) and the failure-mode benchmark stack (STRICT, ImagenWorld) confirm this. Use it for:

- Single-screen hero shots with ≤6 labels and ≤3 charts → concept-stage usable
- Multi-screen brand-locked sets on a single canvas (≤4 screens) → onboarding stories work
- Hero illustration above a real-coded dashboard → exactly what diffusion is for
- Brand mark / app icon → covered by the existing P2A `inline_svg` and `asset_generate_logo` paths

For real production dashboards with data, forms, tables, charts — **fall back to code.** v0 / Aura / Banani / hand-write Tailwind. The user's framing of "diffusion → quick UI iteration loop" is correct for the first three categories and wrong for the fourth. This bundle is honest about which is which.

## Routing cheat sheet

| Need | Model | Template |
|---|---|---|
| Dashboard with labels (default) | gpt-image-2 | [`gpt-image-2.md`](./prompts/gpt-image-2.md) |
| UI with translucent/glassmorphism panels | gpt-image-1.5 | [`gpt-image-1.5.md`](./prompts/gpt-image-1.5.md) |
| Dashboard via bracket-tag dialect | Nano Banana Pro | [`nano-banana-pro.md`](./prompts/nano-banana-pro.md) |
| Widget collage, 8+ ref budget | Nano Banana 2 | [`nano-banana-2.md`](./prompts/nano-banana-2.md) |
| Onboarding / splash / hero CTA, ≤6 words | Ideogram 3 Turbo | [`ideogram-3-turbo.md`](./prompts/ideogram-3-turbo.md) |
| Wireframe + style + logo (3 refs by ordinal) | Flux 2 Pro/Flex | [`flux-2-pro.md`](./prompts/flux-2-pro.md) |
| Hero art behind a real-coded dashboard | Midjourney v7 | [`midjourney-v7.md`](./prompts/midjourney-v7.md) |
| Local / self-hosted, strict wireframe lock | SDXL + CN + IPA | [`sdxl-controlnet-ipadapter.md`](./prompts/sdxl-controlnet-ipadapter.md) |

## Universal rules (apply to all templates)

1. Slot-labeled structure beats adjective stacks.
2. Realistic content. No lorem ipsum.
3. Quote exact label text. Spell brand names letter-by-letter.
4. Hex codes and px values. Never `bg-blue-500` / `Material elevation 2`.
5. Reference images for design-system / brand fidelity. Naming "Linear" / "Stripe" doesn't work.
6. Set aspect ratio in the first sentence.
7. Single canvas with multiple screens for cross-screen consistency (cap ~4 screens).
8. Validate every output (OCR + ΔE + safe-zone) before declaring done.
9. Cap at 6 iterations. After that, change tactic.
10. Composite real text post-render for anything <18pt.

## Whitespace this research surfaced

Concrete OSS gaps the prompt-to-asset project could fill:

1. **Public ControlNet → wireframe → Flux + UI-LoRA workflow.** None packaged. Cheapest demonstrable "better than raw prompting." Rated 9/10 deliverable.
2. **Design-system-specific LoRA** (Material 3, HIG, Tailwind, shadcn). None exist publicly as of 2026-04. Train on official component galleries.
3. **OCR-Levenshtein validation loop for UI labels.** Already in P2A's tier-0/1/2 stack — extend explicitly to UI mockup outputs.
4. **UI-specific benchmark with diffusion targets** (typed-IoU + OCR + ΔE on a held-out screenshot set). No published equivalent.

## Methodology

7 parallel research subagents, each with isolated context, single problem domain, investigator persona, ≥3 sources per claim, citations required. Lead-agent synthesis in [REPORT.md](./REPORT.md). This shape follows the multi-agent research pattern Anthropic published (lead + isolated subagent contexts + distilled findings) and avoids the Cognition "Don't Build Multi-Agents" failure mode (shared scratchpad → conflicting assumptions). Cost: ~7× a single research call plus synthesis.

The 7 streams, each in `findings/`:
1. Academic / arXiv
2. GitHub OSS / HuggingFace / Civitai
3. Per-model prompt dialect (5 models)
4. Practitioner blogs (n=12 corpus)
5. Design-system grounding
6. Multi-image reference workflows
7. Failure-mode catalog
