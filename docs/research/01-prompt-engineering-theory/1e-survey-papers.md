---
category: 01-prompt-engineering-theory
angle: 1e
angle_title: "Survey & review papers on T2I prompt engineering (2023-2026)"
last_updated: 2026-04-19
primary_sources:
  - "Schulhoff et al. 2024 — The Prompt Report (arXiv:2406.06608)"
  - "Sahoo et al. 2024 — A Systematic Survey of Prompt Engineering in LLMs (arXiv:2402.07927)"
  - "Gu et al. 2023 — Prompt Engineering on Vision-Language Foundation Models (arXiv:2307.12980)"
  - "Cao et al. 2024/2026 — Controllable Generation with T2I Diffusion Models: A Survey (arXiv:2403.04279, TPAMI 2026)"
  - "Yang, Cheung & Ma 2025 — Text to Image Generation and Editing: A Survey (arXiv:2505.02527)"
  - "Hartwig et al. 2024 — A Survey on Quality Metrics for T2I Generation (arXiv:2403.11821)"
  - "Oppenlaender 2022/2024 — A Taxonomy of Prompt Modifiers for T2I Generation (arXiv:2204.13988; Behaviour & IT 43(15))"
  - "Liu & Chilton 2022 — Design Guidelines for Prompt Engineering T2I Generative Models (CHI 2022)"
  - "White et al. 2023 — A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT (arXiv:2302.11382)"
  - "Cao et al. 2024 — A Survey on Personalized Content Synthesis with Diffusion Models (arXiv:2405.05538)"
  - "Hao et al. 2023 — Optimizing Prompts for T2I Generation / Promptist (arXiv:2212.09611, NeurIPS 2023)"
---

# 1e — Survey & Review Papers on T2I Prompt Engineering (2023–2026)

## Executive Summary

Across 2023–2026 the literature has converged on four survey "lenses" for prompt engineering in text-to-image (T2I) systems, and an asset-generation pipeline should treat them as complementary rather than redundant:

1. **General prompt-engineering surveys** (Schulhoff et al.'s *Prompt Report*, Sahoo et al.) establish a shared vocabulary (zero-/few-shot, chain-of-thought, in-context, self-consistency, etc.) and dedicate a distinct "multimodal / image" branch — 40 of Schulhoff's 98 techniques live outside text-only prompting. These are the papers that legitimize "prompt engineering" as a PRISMA-reviewable research object.
2. **Vision-language foundation-model surveys** (Gu et al. 2023 and follow-ups) explicitly split prompt engineering into three regimes — multimodal-to-text (Flamingo), image-text matching (CLIP), and **text-to-image (Stable Diffusion)** — and show that the three regimes need different prompt mechanics. For asset generation only the third branch matters, but its prompt techniques (hard, soft, template, class-conditioned, subject-token, negative) are all catalogued there.
3. **T2I-specific generation surveys** (Yang/Cheung/Ma 2025; Cao et al. 2024/2026 on controllable generation; Cao et al. 2024 on personalization) treat the **text prompt as one of several conditioning signals** (layout, depth, edges, reference image, subject token). The core framing: "raw text prompts are necessary but insufficient," which is exactly why a prompt-to-asset layer is valuable.
4. **Empirical / HCI studies** (Liu & Chilton 2022, Oppenlaender's modifier taxonomy 2022/2024, White et al.'s prompt-pattern catalog 2023) are the most directly actionable for a prompt-to-asset product: they codify *which modifier categories* measurably change outputs and *which structural patterns* (templates) generalize across models.

The convergent signal across all four lenses: **the user-supplied prompt is not the prompt the model wants.** Every survey published after 2024 frames automatic prompt rewriting, modifier injection, or side-channel conditioning (ControlNet, IP-Adapter, LoRA) as first-class solutions — not optional polish. For an asset-generation tool, this means the "enhancer" surface is not a cosmetic feature; it is the ergonomic layer the surveys identify as the field's dominant failure mode.

## Key Findings

### Taxonomies that generalize

- **Schulhoff et al. ("The Prompt Report", arXiv:2406.06608, PRISMA over 4,247 records → 1,565 papers)**: 33 vocabulary terms, **58 text techniques in 6 categories**, plus **40 techniques for other modalities** covering image, audio, video, 3D. The image sub-taxonomy includes prompt modifiers, negative prompts, chain-of-images, multimodal CoT, prompt-to-prompt editing, and compositional prompting. Use this paper as the authoritative vocabulary baseline.
- **Sahoo et al. (arXiv:2402.07927)**: Organizes prompt engineering by **application area** rather than by technique, giving explicit coverage of VLMs alongside LLMs. Strength: methodology + dataset + model tables per technique; weakness: light on T2I specifics compared to Gu et al.
- **Gu et al. (arXiv:2307.12980)**: The canonical VLM survey. Cleanest decomposition of prompting across **(i) multimodal-to-text, (ii) image-text matching, (iii) text-to-image**. Distinguishes **hard prompts** (task instruction, ICL, retrieval, CoT) from **soft prompts** (prompt tuning, prefix tokens), and explicitly flags responsibility/integrity concerns per model class.
- **Oppenlaender (arXiv:2204.13988, published in *Behaviour & Information Technology* 43(15), 2024)**: Six-class ethnographic taxonomy of **prompt modifiers** — *subject terms, style modifiers, image prompts, quality boosters, repetitions, and magic terms*. This is the single most useful reference for designing a modifier-injection layer.
- **White et al. (arXiv:2302.11382)**: 16 prompt **patterns** (Persona, Template, Recipe, Meta-language Creation, Output Automater, Question Refinement, Reflection, Game Play, etc.) expressed as *"when to apply / problem / contextual statement"* triples analogous to software design patterns. Originally LLM-focused, but Persona, Template, Recipe, and Output Automater are directly reusable for T2I prompt templating.

### Empirical design guidelines (CHI / user-studies track)

- **Liu & Chilton (CHI 2022, 5000+ generations, 51 subjects × 51 styles)**: Established the *"SUBJECT in the style of STYLE"* template as a reliable baseline; found that style modifiers produce higher quality-variance than subject words, and that abstract subjects benefit more from concrete style anchors than vice-versa. First paper to put empirical numbers behind "prompt engineering works."
- **Oppenlaender's 3-month ethnography**: Documented that modifiers are **learned socially** (shared in Discord/Reddit/Midjourney galleries) and that "magic terms" (e.g., *trending on artstation, 8k, unreal engine*) function as *community passwords* whose effect is model-version-specific and degrades as models update.

### T2I-specific surveys (generation / editing / control)

- **Yang, Cheung & Ma 2025 (arXiv:2505.02527, 141 works 2021–2024)**: Organizes T2I around **four architecture families** — autoregressive, non-autoregressive, GAN, diffusion — plus common building blocks (autoencoder, attention, classifier-free guidance). Confirms that diffusion + CFG is the dominant substrate for prompt-driven generation in the surveyed window, with emerging Mamba and multimodal variants.
- **Cao et al. 2024/2026 (arXiv:2403.04279, accepted IEEE TPAMI 2026)**: "Controllable Generation" survey. Groups methods by condition type: **specific conditions** (pose, depth, edge, layout, identity, segmentation), **multiple conditions** (compositional / stacked), **universal controllable generation** (unified adapters). The central claim: *text alone underspecifies almost every real application*; ControlNet-family, T2I-Adapter, IP-Adapter, and LoRA-based personalization are the de-facto solutions. Ships with a curated GitHub catalog (Awesome-Controllable-T2I-Diffusion-Models).
- **Cao et al. 2024 (arXiv:2405.05538, Personalized Content Synthesis)**: Surveys ~150 personalization methods across two frameworks — **test-time fine-tuning** (DreamBooth, Textual Inversion, Custom Diffusion) and **pre-trained adaptation** (IP-Adapter, ELITE, Subject-Diffusion). Core unresolved tension: **subject fidelity vs. text editability** — the more a model learns a subject, the less it listens to the prompt.
- **Hartwig et al. 2024 (arXiv:2403.11821, v5 Jan 2025)**: Taxonomy of **T2I quality metrics** split into (i) **compositional quality** — how well the image matches the prompt (CLIPScore, ImageReward, TIFA, VQA-based, DSG) and (ii) **general quality** (FID, aesthetic predictors, IS, HPS). Critical for prompt-to-asset evaluation: use a *compositional* metric (DSG or TIFA-style) when measuring whether prompt rewriting preserves user intent.

### Automatic prompt optimization as a survey-recognized sub-field

- **Hao et al., "Promptist" (arXiv:2212.09611, NeurIPS 2023)**: Two-stage SFT + PPO pipeline that rewrites user prompts into "model-preferred" prompts using a reward combining CLIP-relevance and aesthetic-predictor score. The first widely cited paper to frame prompt rewriting as a learned policy, and the reference implementation every subsequent survey cites.
- **Downstream surveyed methods**: OPT2I (up to 24.9 % DSG improvement on MSCOCO/PartiPrompts via LLM-iterative rewriting), VisualPrompter (training-free self-reflection), TIPO (lightweight LLM-free expansion), DialPrompt (EMNLP 2025 — 15-dimension multi-turn guided prompt generation for novices, +46.5 % user-centricity score in N=19 study).

### Consensus on failure modes

Across surveys, four failure modes are repeatedly flagged:

1. **Compositional collapse** — attribute binding, counting, negation, spatial relations break as constraints stack (Yang et al. 2025; Hartwig et al. 2024).
2. **Modifier brittleness** — "magic terms" stop working across model versions (Oppenlaender; Liu & Chilton).
3. **Subject–text trade-off** — personalization methods lose prompt adherence (Cao 2024 personalization survey).
4. **Distribution mismatch** between user prompts and training captions — the raison d'être of prompt rewriting (Hao et al. 2023; Sahoo et al. 2024).

## Concrete Prompt Examples

Examples are lifted from or directly derived from the surveyed taxonomies. They are illustrative of the *shape* of techniques the surveys catalog — not recommendations for any specific model version.

### From Liu & Chilton's SUBJECT-in-style-of-STYLE template (CHI 2022)
```
A lighthouse in the style of Studio Ghibli
```

### From Oppenlaender's six-class modifier taxonomy (Behaviour & IT 2024)
Expand a plain user prompt by appending one modifier from each of the six categories:
```
a dragon                                            # [subject]
, oil painting, baroque lighting                    # [style modifier]
, highly detailed, sharp focus, 8k                  # [quality booster]
, trending on artstation                            # [magic term]
, in the style of Frazetta                          # [image prompt / artist anchor]
, intricate, intricate, intricate                   # [repetition]
```
Observed behavior across the ethnography: each category contributes a roughly orthogonal effect; stacking more than ~3 modifiers per category yields diminishing returns and can destabilize composition.

### From White et al.'s prompt-pattern catalog (arXiv:2302.11382)
**Persona + Template** pattern adapted to T2I prompt-to-asset LLM:
```
You are an expert Stable Diffusion prompt engineer.
Rewrite the user's prompt into the following template and fill every slot:
[MEDIUM] of [SUBJECT], [COMPOSITION], [LIGHTING], [STYLE], [QUALITY].
Only output the filled template.
User prompt: "a cozy cabin at night"
```

### From Schulhoff et al.'s multimodal prompting section (arXiv:2406.06608)
**Negative prompting** (catalogued as a first-class T2I technique):
```
Prompt:    a photorealistic portrait of a woman, natural window light
Negative:  blurry, deformed hands, extra fingers, watermark, text, low-res
```

### From Promptist (Hao et al., arXiv:2212.09611, user prompt → optimized prompt)
```
User:       A rabbit is wearing a space suit.
Promptist:  A rabbit is wearing a space suit, digital art, artstation,
            concept art, smooth, sharp focus, illustration
```

## Known Failures & Artifacts

Documented by the surveyed papers:

- **Attribute-binding failures** (Hartwig et al. 2024; Yang et al. 2025): "a red cube on a blue sphere" may yield a blue cube on a red sphere. Structured Diffusion Guidance and Attend-and-Excite are catalogued fixes.
- **Numeracy failures** (Gu et al. 2023; Yang et al. 2025): "four dogs" frequently produces 2–6 dogs; no survey reports a reliable purely-prompt fix short of layout conditioning.
- **Negation failures** (Gu et al. 2023; Yang et al. 2025): "a street without cars" often generates cars. Negative-prompt channel is the community workaround; Schulhoff et al. flag it as an open research problem.
- **Spatial-relation failures**: "to the left of" / "above" / "behind" fail above ~2 objects (Hartwig et al. 2024 compositional metrics taxonomy).
- **Magic-term decay** (Oppenlaender 2024): Tokens like *unreal engine, trending on artstation* worked on SD 1.x but weakened on SDXL / SD3 and are largely ignored by MJv6+ and FLUX.1.
- **Subject–text trade-off in personalization** (Cao et al. 2024, arXiv:2405.05538): DreamBooth subject LoRAs at high weights override the text prompt; surveyed mitigations include lower LoRA α, prior-preservation loss, and SID (Selectively Informative Description).
- **Metric gaming** (Hartwig et al. 2024): CLIPScore saturates and rewards surface similarity; DSG/TIFA/ImageReward are recommended as complementary signals when tuning a prompt-rewriter.
- **Safety / IP leakage** (Gu et al. 2023; Schulhoff et al. 2024): Style modifiers naming living artists, memorized training data, and NSFW jailbreaks are catalogued as responsibility concerns that a prompt-to-asset should filter.

## Tools, Libraries, Code

Curated artifacts maintained alongside the surveyed papers:

- **Prompt Report companion site** — https://trigaten.github.io/Prompt_Survey_Site (Schulhoff et al.) — browsable taxonomy with links to each technique's origin paper.
- **Prompt Systematic Review dataset** — `PromptSystematicReview/ThePromptReport` on Hugging Face — 4,247-row arXiv CSV with tagging per technique.
- **Awesome-Prompting-on-Vision-Language-Model** — https://github.com/JindongGu/Awesome-Prompting-on-Vision-Language-Model — Gu et al.'s maintained catalog.
- **Awesome-Controllable-T2I-Diffusion-Models** — https://github.com/PRIV-Creation/Awesome-Controllable-T2I-Diffusion-Models — Cao et al.'s living bibliography of ControlNet-family, T2I-Adapter, IP-Adapter, and universal-control work.
- **Promptist (Microsoft LMOps)** — checkpoints and demo for the Hao et al. RL-based prompt rewriter; still the reference baseline for learned prompt optimization.
- **DiffusionDB** (Wang et al., arXiv:2210.14896) — 14M real user prompts from Stable Diffusion Discord; cited by nearly every T2I prompt-engineering survey as the empirical substrate for modifier-frequency analysis.
- **Evaluation metrics referenced by Hartwig et al. 2024**: CLIPScore, BLIPScore, ImageReward, HPS v2, TIFA, DSG, Pick-a-Pic, Gecko — the compositional-quality side of the taxonomy.

## Open Questions

Lifted from the "future directions" sections of the surveyed papers:

1. **Can prompt rewriting generalize across model versions?** Every survey notes that modifier effectiveness is version-specific (SD 1.5 ≠ SDXL ≠ SD3 ≠ FLUX.1 ≠ MJv7). No surveyed method produces a portable rewriting policy.
2. **What is the right primitive unit of a prompt?** Token, concept, modifier category, or structural slot? Schulhoff et al. use "techniques"; Oppenlaender uses "modifiers"; Cao et al. use "conditions." No unified ontology.
3. **Is prompt engineering a transient skill?** Sahoo et al. and Schulhoff et al. both raise this — as models get better at instruction following (DALL-E 3, GPT-Image, Imagen 3, Gemini 2.5 native image), does the modifier stack become obsolete?
4. **How should a prompt-to-asset evaluate itself?** Hartwig et al.'s compositional-vs-general split is widely cited but no survey endorses a single metric; DSG, TIFA, VQA-based scoring, and human preference (HPS/ImageReward) are all partial.
5. **Where does the enhancer sit in the stack — LLM rewriter, retrieval over modifier DB, learned RL policy, or multi-turn dialogue with the user?** All four are surveyed; none dominates.
6. **Safety for creative generation**: Gu et al. and Schulhoff et al. both flag that prompt rewriters can *insert* problematic content (artist-name injection, copyrighted franchises, NSFW drift) that the user never asked for. This is an underexplored review topic.
7. **Compositional reasoning ceiling**: Both Yang et al. 2025 and the 2025 "Intricate Dance" empirical study (arXiv:2510.19557) suggest a fundamental architectural limit — continuous cross-attention vs. discrete logic — that no amount of prompt engineering can fully work around. Survey authors flag this as the most important open question for the next generation of models.

## Citations

Primary survey & taxonomy sources (live URLs verified 2026-04-19):

- Schulhoff, S., Ilie, M., et al. (2024). *The Prompt Report: A Systematic Survey of Prompting Techniques.* arXiv:2406.06608. https://arxiv.org/abs/2406.06608 — companion site: https://trigaten.github.io/Prompt_Survey_Site
- Sahoo, P., Singh, A. K., et al. (2024). *A Systematic Survey of Prompt Engineering in Large Language Models: Techniques and Applications.* arXiv:2402.07927. https://arxiv.org/abs/2402.07927
- Gu, J., et al. (2023). *A Systematic Survey of Prompt Engineering on Vision-Language Foundation Models.* arXiv:2307.12980. https://arxiv.org/abs/2307.12980 — repo: https://github.com/JindongGu/Awesome-Prompting-on-Vision-Language-Model
- Cao, P., Zhou, F., Song, Q., Yang, L. (2024/2026). *Controllable Generation with Text-to-Image Diffusion Models: A Survey.* arXiv:2403.04279; accepted IEEE TPAMI 2026. https://arxiv.org/abs/2403.04279 — repo: https://github.com/PRIV-Creation/Awesome-Controllable-T2I-Diffusion-Models
- Yang, P., Cheung, N.-M., Ma, X. (2025). *Text to Image Generation and Editing: A Survey.* arXiv:2505.02527. https://arxiv.org/abs/2505.02527
- Hartwig, S., et al. (2024, rev. Jan 2025). *A Survey on Quality Metrics for Text-to-Image Generation.* arXiv:2403.11821v5. https://arxiv.org/abs/2403.11821
- Cao, P., et al. (2024). *A Survey on Personalized Content Synthesis with Diffusion Models.* arXiv:2405.05538. https://arxiv.org/abs/2405.05538
- Oppenlaender, J. (2022, published 2024). *A Taxonomy of Prompt Modifiers for Text-to-Image Generation.* arXiv:2204.13988; *Behaviour & Information Technology*, 43(15), 3763–3776. https://arxiv.org/abs/2204.13988 · https://www.tandfonline.com/doi/full/10.1080/0144929X.2023.2286532
- Liu, V., Chilton, L. B. (2022). *Design Guidelines for Prompt Engineering Text-to-Image Generative Models.* CHI 2022. https://www.cs.columbia.edu/~chilton/web/my_publications/LiuPromptsAIGenArt_CHI2022.pdf
- White, J., Fu, Q., Hays, S., Sandborn, M., Olea, C., Gilbert, H., Elnashar, A., Spencer-Smith, J., Schmidt, D. C. (2023). *A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT.* arXiv:2302.11382. https://arxiv.org/abs/2302.11382
- Hao, Y., Chi, Z., Dong, L., Wei, F. (2023). *Optimizing Prompts for Text-to-Image Generation* (Promptist). arXiv:2212.09611; NeurIPS 2023. https://arxiv.org/abs/2212.09611

Supporting / adjacent sources referenced above:

- Wang, Z. J., et al. (2022). *DiffusionDB: A Large-scale Prompt Gallery Dataset for Text-to-Image Generative Models.* arXiv:2210.14896.
- *The Intricate Dance of Prompt Complexity, Quality, Diversity, and Consistency in T2I Models* (2025). arXiv:2510.19557.
- *Taming Text-to-Image Synthesis for Novices: User-centric Prompt Generation via Multi-turn Guidance* (DialPrompt). EMNLP 2025. https://aclanthology.org/2025.emnlp-main.444/
