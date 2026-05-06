# 04 — Practitioner Findings: Prompting Image Models for UI Mockups

Research summary of practitioner posts (Medium, dev.to, Substack, UX Planet, blogs) on what designers and engineers actually do when generating UI mockups with image models. Scope: web dashboards and mobile screens. Cutoff favored: posts within last 12 months; older posts (Christie 2024-01, Pedro Sostre 2024-02, Emily Stevens 2024-10) included only where they document persistent failure modes.

## Sources surveyed (n=12)

| # | Author | Date | Model(s) | Source |
|---|---|---|---|---|
| S1 | Oikon | 2025-09-14 | Gemini 2.5 Flash Image (nano-banana) | dev.to |
| S2 | Philippe H. | 2026-01-30 | Nano Banana Pro | Raw.Studio blog |
| S3 | jidonglab | 2026-04-30 | gpt-image-2-2026-04-21 | dev.to |
| S4 | Edward Chechique | 2024-11-11 (rev) | Midjourney v6.1 | LogRocket |
| S5 | Pedro Sostre | 2024-02-19 | Midjourney v6.0 | Medium |
| S6 | Karen Spinner | 2025-12-06 | Nano Banana Pro | Substack (wonderingaboutai) |
| S7 | Guillaume Vernade (Google) | 2025-11-27 | Nano Banana Pro | dev.to (googleai) |
| S8 | Chase Jarvis | 2025-12 | Midjourney + Nano Banana Pro via Weavy | chasejarvis.com |
| S9 | Francesca Tabor | 2025-11-22 | Reve + Midjourney + Nano Banana 2 + Magnific | francescatabor.com |
| S10 | Daria Cupareanu | 2025-11-23 | Nano Banana Pro | Substack (aiblewmymind) |
| S11 | Nitin Sharma | 2025-12-01 | Nano Banana Pro | Substack (aimadesimple0) |
| S12 | Replicate (shridharathi et al.) | 2025-11-20 | Nano Banana Pro | replicate.com/blog |
| S13 | Emily Stevens | 2024-10-06 | Midjourney (unspecified) | UX Design Institute |
| S14 | Awesome GPT-Image-2 (curated X threads) | 2026 ongoing | gpt-image-2 | github.com/ZeroLu/awesome-gpt-image |

Sponsored / tool-promo content explicitly down-weighted: Skywork.ai, Magic Patterns, Mokkup, Uizard, UX Pilot, Sleek (all surfaced; none cited as evidence).

---

## Findings

### F1 — The dominant practitioner workflow is hybrid, not single-model

Five independent posts (S3, S8, S9, S12, plus the Adobe/Figma official integrations announced Nov 2025) describe the same shape: one model handles aesthetics/composition, another handles text/precision, a third handles upscaling, and Figma absorbs the result for dev handoff. Chase Jarvis (S8) calls Midjourney the "Director of Photography" and Nano Banana Pro the "Prop Master / Retoucher." Tabor (S9) chains Reve → Midjourney → Nano Banana 2 → Magnific via Weavy. jidonglab (S3) keeps everything inside one model (gpt-image-2) and reports iteration count dropping from 47 to 6 per asset; the gain there comes from co-locating the image model with codebase context (Tailwind config, Next.js routes, brand refs), not from the model alone.

**Implication:** treating UI generation as a single `prompt → image` problem is the minority approach. Practitioners who ship route by capability.

### F2 — "Realistic content, no lorem ipsum" is the single most repeated rule

Stated explicitly in S1, S2, S6, S7, and the Google Cloud nano-banana guide. Oikon (S1) hard-codes it into every blueprint prompt. Spinner (S6) fed actual research-paper text. Vernade (S7) — Google's own DevRel — opens with "full sentences over tag soups" and concrete content over placeholders. The reasoning is mechanical: diffusion models render the literal characters they see in the prompt, so `Dashboard, sample data, lorem ipsum` produces an output where lorem ipsum becomes the visible string.

### F3 — Structural anchors beat style adjectives, but only on strong-text models

Oikon's "Master Blueprint" (S1) is the cleanest practitioner artifact: explicit `[Application Type] / [Core Screen] / [Features 1-4] / [Theme] / [Audience]` slots, fixed four-screen horizontal arrangement, named device chassis ("iPhone 15/16 Pro Max with Dynamic Island"), 8pt grid + SF Pro typography. Philippe H. (S2) replicates the pattern: product type → layout hierarchy → visual style → resolution. jidonglab (S3) does it via codebase reads (Tailwind tokens become the implicit color/spacing block).

Christie C. (S4-era, 2024-01) and Emily Stevens (S13) — both pre-Nano-Banana — list adjective-heavy prompts ("futuristic, clean, neon," "sleek and modern logo") with no structural anchors. None of those posts include before/after evidence.

**Triangulated rule:** structural-anchor prompting works on Nano Banana Pro, gpt-image-2, and (with mixed success) Midjourney v6.1+. On older Midjourney and SDXL-class models, no structural anchor saves the output — practitioners who tried it (S5, the rabbitcommunity thread surfaced in search) report failure.

### F4 — Negative results: legible UI text and pixel-perfect layout still break, even on the best 2025/2026 models

Three sources document specific text failures with screenshots or quoted output:

- **Spinner (S6)** ran six controlled tests on Nano Banana Pro. Final test produced "Bristor," "Fecilitators," "neuse resiguation" — garbled tokens despite explicit short-copy + style-guide prompting. Color-fill consistency ("odd ripples and blotchy textures") was unresolvable across 2-3 regen attempts per test. White-space rules ignored.
- **Pedro Sostre (S5)** shows Midjourney v6.0 failing on `/imagine Six modern website mockup screens side by side --ar 3:1 --v 6.0` — the v6 update demonstrably lost the v5 ability to render coherent screen grids. v7 partially restored it (S4) but text is still "misformed making the interface unusable the way it is."
- **Chase Jarvis (S8)** explicitly says Midjourney alone produced "gibberish on the shirt" and required Nano Banana Pro to overlay legible branding.

Spinner's verdict — output is "~80% of the way there, suitable for solopreneurs needing quick assets, not polished deliverables, always proofread carefully" — is the most honest practitioner statement in the corpus and matches the failure mode the project's CLAUDE.md already documents (text ceiling, palette drift, OCR validation).

### F5 — Iteration loops are short for strong-text models, long for everything else

Quantified iteration counts found:

- jidonglab (S3): **47 → 6** iterations per asset on gpt-image-2 vs predecessor; ship time 4.5 h → 38 min.
- Tabor (S9): node-based Weavy graph, ~5 stages per asset, branching at each.
- Spinner (S6): 2-3 regenerations per test, 6 tests, ~2 hours per design (vs "a full day" in traditional tools).
- Chechique (S4) on Midjourney v6.1: "generate 4-image set → refine prompt → use Editor erase tool → submit again → save → import to Figma." Four+ rounds typical, no count given.

**Pattern:** when the model handles brand text natively (gpt-image-2, Nano Banana Pro), iteration converges fast. When it doesn't (Midjourney, SDXL), the loop terminates only when the practitioner moves to Figma/Photoshop and manually rebuilds the text layer.

### F6 — Cleanup tools are universal — nobody ships raw output

Every post that reaches "what next" names the same three:

- **Figma** — primary refinement / dev-handoff tool (S2, S3, S4, S6, S9; explicit Nano Banana Pro Figma plugin exists)
- **Vectorizer.ai** — raster→SVG conversion (S4 explicitly)
- **Photoshop** — manual touch-up after upscaling (S9)

Spinner (S6) adds Adobe Express / Canva for fixing the residual color-fill ripples Nano Banana leaves behind. Chechique (S4) is unambiguous: "Midjourney won't give you a complete design, it will give you inspiration."

### F7 — Named-design-system prompting ("Linear style", "Stripe style") is rare in the literature

Despite the question being asked directly, no practitioner post in the surveyed sample uses brand-name design-system anchors ("in the style of Linear's dashboard"). The closest substitutes are:

- Aesthetic-style anchors: "glassmorphism SaaS dashboard" (S2), "skeuomorphism icon" (S4), "isometric exploded view" (S11)
- Reference-image anchors: 14-image identity lock on Nano Banana Pro (S7, S12), 16-image brand folder on gpt-image-2 (S3), Midjourney `--sref` (S8)
- Magazine/genre anchors: "IBM-style enterprise infographic," "McKinsey consulting diagram" (S10) — these *do* work on Nano Banana Pro

The X-curated GPT-Image-2 prompt collection (S14) confirms the same pattern at scale: prompts cite *platform* surfaces (Douyin, Xiaohongshu, WeChat) and *content type* (live-stream chrome, e-commerce homepage), not named design systems.

**Triangulated conclusion:** practitioners who want Linear/Stripe fidelity supply screenshots as references rather than naming the brand.

### F8 — Aspect ratio / device framing is non-negotiable, set first

Universal across S1, S2, S6, S7, S11, S14. Oikon hard-codes "iPhone 15/16 Pro Max with Dynamic Island"; Chechique uses `--ar 9:16` for mobile and `--ar 1:2` for full-page web; Nano Banana Pro supports an explicit ratio set (1:1, 9:16, 16:9, 4:5, 3:2, 2:3, 21:9, 9:21) and Spinner sets it in every test. Where it's omitted the output drifts to square or 4:3 and crops the layout.

---

## Practitioner playbook (triangulated, n≥3 per item)

Distilled from convergent advice across the n=12 corpus. Not invented — each rule is supported by 3+ independent posts.

1. **Pick a strong-text model for any UI with copy.** Nano Banana Pro or gpt-image-2 first; Midjourney only when the brief is mood/lighting and a separate compositing step will own the text. (S3, S6, S7, S8)

2. **Write the prompt as structural slots, not adjectives.** App type → device chassis → screen-by-screen content → grid + typography token → theme + palette. Adjective-stacked prompts ("clean futuristic minimalist") underperform on every model where someone showed evidence. (S1, S2, S3, S7)

3. **Fill every text slot with realistic content. No lorem ipsum, no placeholders.** This is the single most-repeated rule in the corpus. (S1, S2, S6, S7)

4. **Set aspect ratio and device frame in the first sentence.** (S1, S2, S6, S7, S14)

5. **Generate 4 screens horizontally on one canvas to lock cross-screen consistency.** Multi-image generation across separate calls drifts; one wide canvas with 4 screens does not. Oikon's blueprint, Vernade's storyboarding pattern, Replicate's character-lock case all converge on this. (S1, S7, S12)

6. **Supply reference images for brand lock — don't name the brand.** Up to 14 refs on Nano Banana Pro, 16 on gpt-image-2, `--sref` on Midjourney. Naming "Linear" or "Stripe" is not a documented working technique. (S3, S7, S8, S12)

7. **Plan for two-tool composition.** Aesthetic model + precision model. Even practitioners who prefer a single model run a second pass for text fixup. (S3, S8, S9)

8. **Cap iterations at ~6 before changing tactic.** Strong-text models converge inside that budget. If they don't, the issue is the prompt structure (Spinner's color-fill ripples were *unfixable* by reprompting). Rotate model or move to manual cleanup. (S3, S6)

9. **Always finish in Figma.** Vectorize raster output if needed (vectorizer.ai), rebuild text layers, run the actual accessibility pass. Image model output is inspiration + composition reference, not shippable UI. (S4, S6, S9, S13)

10. **Validate text and color before declaring done.** Spinner's failure modes (misspellings, color blotches, white-space ignored) all survive review-by-eye and only show up on close inspection. OCR / palette-ΔE checks are not yet practitioner-standard, but Spinner's "always proofread carefully" is unanimous. (S5, S6, S8)

---

## Gaps and caveats

- **Designer-led Substack content is thin.** Most surveyed posts are engineer-authored or DevRel-authored. Spinner (S6) and Tabor (S9) are the only designer-eye sources with depth. Recommend more searching on UX Collective, Smashing Magazine, and individual designer Substacks for round 2.
- **X (Twitter) threads are aggregated through GitHub repos** rather than retrieved directly; the curated collection (S14) is the cleanest proxy. Direct X-thread retrieval was not feasible inside this research pass.
- **YouTube transcripts not pulled** in this round — would add another 2-3 sources.
- **No post examined the validation/QA loop in detail.** The "always proofread carefully" advice is unanimous but no practitioner has published an OCR-Levenshtein workflow. This is an open gap and a fit for the project's tier-0/1/2 validation tooling.

---

## Citations

- [S1] [Oikon — nano-banana special prompt achieved rapid Mobile UI Mockups](https://dev.to/oikon/nano-banana-special-prompt-achieved-rapid-mobile-ui-mockups-1mif) — dev.to, 2025-09-14
- [S2] [Philippe H. — UI Design with Nano Banana Pro: Practical Use Cases, Workflow, and Sample Prompts](https://raw.studio/blog/ui-design-with-nano-banana-pro-practical-use-cases-workflow-and-sample-prompts/) — Raw.Studio, 2026-01-30
- [S3] [jidonglab — GPT Image 2 Inside Codex: My New Frontend Workflow](https://dev.to/ji_ai/gpt-image-2-inside-codex-my-new-frontend-workflow-4d7n) — dev.to, 2026-04-30
- [S4] [Edward Chechique — How to generate stunning UI designs with Midjourney AI](https://blog.logrocket.com/ux-design/using-midjourney-generate-ui-designs/) — LogRocket, updated 2024-11-11
- [S5] [Pedro Sostre — Midjourney v6 Removes the Ability to Create UX/UI and Website Designs](https://psostre.medium.com/midjourney-v6-removes-the-ability-to-create-ux-ui-and-website-designs-12823d1c1d91) — Medium, 2024-02-19 (negative result)
- [S6] [Karen Spinner — I tried using Nano Banana Pro to create complex infographics](https://wonderingaboutai.substack.com/p/i-tried-using-nano-banana-pro-to) — Substack, 2025-12-06 (negative result + 6 controlled tests)
- [S7] [Guillaume Vernade — Nano-Banana Pro: Prompting Guide & Strategies](https://dev.to/googleai/nano-banana-pro-prompting-guide-strategies-1h9n) — dev.to (Google AI), 2025-11-27
- [S8] [Chase Jarvis — How to Use Midjourney and Nano Banana Pro for perfect images](https://chasejarvis.com/blog/how-to-use-midjourney-and-nano-banana-pro-for-perfect-images/) — chasejarvis.com, 2025-12
- [S9] [Francesca Tabor — AI-Enhanced Product Design Workflow](https://www.francescatabor.com/articles/2025/11/22/ai-enhanced-product-design-workflow) — francescatabor.com, 2025-11-22
- [S10] [Daria Cupareanu — 7 Real Tests of Google's Nano Banana Pro (With Master Prompt)](https://aiblewmymind.substack.com/p/i-cant-believe-ai-can-do-this-now) — Substack, 2025-11-23 (master prompt paywalled — partial signal)
- [S11] [Nitin Sharma — 7 Nano Banana Pro Workflows That Actually Save You Hours](https://aimadesimple0.substack.com/p/7-nano-banana-pro-workflows-that) — Substack, 2025-12-01
- [S12] [shridharathi et al. — How to prompt Nano Banana Pro](https://replicate.com/blog/how-to-prompt-nano-banana-pro) — replicate.com, 2025-11-20 (sponsored/tool-vendor — signal usable, claims marked)
- [S13] [Emily Stevens — How To Use Midjourney AI in UI Design](https://www.uxdesigninstitute.com/blog/midjourney-ai-in-ui-design/) — UX Design Institute, 2024-10-06 (older, no before/after)
- [S14] [ZeroLu — awesome-gpt-image (X-thread curated GPT-Image-2 prompts)](https://github.com/ZeroLu/awesome-gpt-image) — GitHub, ongoing 2026
- [Christie C. — 40+ Midjourney Prompts to Create Outstanding UI Design](https://medium.com/design-bootcamp/40-midjourney-prompts-to-create-outstanding-ui-design-c59bba7ad0d6) — Medium, 2024-01-29 (referenced as pre-MJv6 baseline only)

Word count: ~1750.
