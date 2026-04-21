---
category: 01-prompt-engineering-theory
date: 2026-04-19
angles_indexed:
  - 1a-cfg-and-negative-prompts.md
  - 1b-compositional-attention-control.md
  - 1c-llm-prompt-expansion.md
  - 1d-prompt-weighting-syntax.md
  - 1e-survey-papers.md
---

> **📅 Research snapshot as of 2026-04-19.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category 01 — Prompt Engineering Theory: Synthesis

## Category Executive Summary

1. **The user's prompt is never the prompt the model was trained on.** Every surveyed line of work — Betker et al.'s DALL·E 3 upsampler, Promptist, BeautifulPrompt, PromptToAsset, the Hao et al. line cited across surveys — starts from the same premise: short human inputs are out-of-distribution for models trained on 15–80-word synthetic captions, so rewriting is load-bearing, not cosmetic (see 1c §1; 1e §"Consensus on failure modes").
2. **Guidance (CFG) is a single score-extrapolation equation with many knobs.** Every industry slider called "CFG scale," "guidance scale," "negative prompt," "prompt strength," or "prompt weight" is a direct or indirect consequence of Ho & Salimans' `ε̂ = ε_u + w·(ε_c − ε_u)` — and 2024–2025 work (guidance interval, APG, CFG++, annealing, dynamic CFG) unanimously rejects the "one CFG for all steps and all models" assumption (see 1a §"The static-CFG assumption is broken").
3. **Negative prompts are a CFG hack, not a feature.** A1111's implementation simply replaces `ε_u` with `ε(neg_prompt)`; potency scales linearly with CFG, tokens cancel when they appear in both prompts, and the effect is *delayed* until the positive prompt has evoked the negative concept (see 1a §"Negative prompts are CFG with ε_u hijacked", §"Known Failures" #3–4).
4. **Oversaturation at high guidance or high per-token weight is the same bug, twice.** Sadat 2024's APG shows the parallel component of the CFG update is what burns contrast; the same parallel-signal inflation explains why attention-weighted tokens past ~2.0 also collapse images. Both 1a and 1d cite arXiv:2410.02416 to name the failure (see 1a §"oversaturation failure mode"; 1d §F1).
5. **Guidance-distilled models (Flux, SDXL-Turbo, SD3-Turbo) do not run real CFG.** Their `guidance_scale` is a learned embedding; stock Flux pipelines raise `TypeError` on `negative_prompt`. Any enhancer must detect this and encode exclusions into positive-prompt phrasing instead (see 1a §"Guidance distillation"; 1d §6 "Flux and long-context encoders break the old syntax").
6. **Cross-attention is the layout-to-word wire, and it routinely mis-routes.** "Catastrophic neglect" (subject missing) and "incorrect attribute binding" (colors swap between subjects) are named, reproducible failure modes on SD 1.x through Flux/SD3 as of the 2025–2026 FineGRAIN and T2I-CompBench++ benchmarks — surveys corroborate that newer models did not fix them (see 1b §F1–F2, §F7; 1e §"Consensus on failure modes" #1).
7. **Training-free attention control is still the dominant fix.** Prompt-to-Prompt, Attend-and-Excite, Structured Diffusion Guidance, SynGen, Divide & Bind, Bounded Attention, and R-Bind all edit cross-attention at inference and run without weight changes at ~10–30% overhead; multi-subject prompts specifically benefit from *bounded* attention, not just excited attention (see 1b §F3–F5).
8. **The "77-token silent truncation" is still shipping in 2026.** CLIP's hard cap drops trailing modifiers with no error on SD 1.5/SDXL; Flux's T5-XXL path effectively removes the cap but changes what weighting means. An enhancer that emits a long-weighted prompt without knowing the target encoder is systematically losing its tail (see 1c §4; 1d §6, §F4).
9. **Linguistic structure beats bag-of-tokens.** Structured Diffusion Guidance (constituency parse) and SynGen (dependency parse) both show that pairing each modifier with its head noun at the attention level recovers binding that a flat string cannot. For an enhancer this argues for emitting *structured* output (subject tokens, attribute pairs, bboxes) when the backend can consume it (see 1b §F3; 1c §3 re LayoutGPT).
10. **Prompt weighting is not portable.** `(red:1.5)` means four different things in A1111 (scale the hidden-state slice), ComfyUI default (lerp against empty embedding), Compel (asymmetric masked blend on down-weight), and Midjourney (no per-word weight exists — must rewrite as `::` multi-prompt). Any enhancer that emits weights must track `(ecosystem, model family, parser)` as a triple (see 1d §1, §"Example 1").
11. **SFT → RL against image-level rewards is the standard training recipe for rewriters.** Promptist, BeautifulPrompt, Datta et al., RePrompt, and PromptToAsset all replace hand-engineered style suffixes ("trending on artstation, 8k") with learned, image-grounded rewrites; all report cross-backbone transfer (see 1c §2; 1e §"Automatic prompt optimization").
12. **Chain-of-thought decomposition beats monolithic expansion on hard prompts.** PromptToAsset's CoT trace + 24-point AlignEvaluator, DeCoT's two-stage decomposition, LayerCraft's agentic loop, and LayoutGPT's CSS-style emission all outperform single-pass rewrites on attribute binding, counting, and spatial relations (see 1c §3).
13. **"Magic terms" decay across model versions.** Oppenlaender's ethnography documents that community-password tokens (*unreal engine, trending on artstation, 8k*) weaken on SDXL/SD3 and are largely ignored by MJ v7 (current default) and Flux/FLUX.2; modifier lists must be versioned per target (see 1e §"Consensus on failure modes" #2; 1d §6).
14. **User-intent preservation through rewriters is unsolved.** DALL·E 3 silently converts `"a logo of OpenAI on a green background"` into `"an emblem that depicts the concept of openness…"` — the rewriter's aesthetic prior clobbers literal intent, with no API opt-out (see 1c §5, §"Known Failures" #1).
15. **True transparency is not a CFG or attention problem.** No training-free method in any angle produces real alpha; it requires a fine-tuned RGBA model (LayerDiffuse) or post-hoc matting. Emit a transparency *flag*, not a transparency *prompt token* (see 1a §"Open Questions" #3; 1b §"Open Questions").

## Map of the Angles

| Angle | File | One-line summary |
|---|---|---|
| 1a | [`1a-cfg-and-negative-prompts.md`](./1a-cfg-and-negative-prompts.md) | CFG is one equation; negative prompts are a CFG hack; static CFG is wrong; guidance distillation (Flux) breaks the old mental model. |
| 1b | [`1b-compositional-attention-control.md`](./1b-compositional-attention-control.md) | Cross-attention carries token→region binding; P2P, Attend-and-Excite, SynGen, and Bounded Attention fix the catastrophic-neglect and attribute-leakage failure modes training-free. |
| 1c | [`1c-llm-prompt-expansion.md`](./1c-llm-prompt-expansion.md) | Every post-DALL·E 3 stack sits behind an LLM rewriter trained SFT→RL; CoT decomposition beats monolithic expansion; intent preservation is unsolved. |
| 1d | [`1d-prompt-weighting-syntax.md`](./1d-prompt-weighting-syntax.md) | Four distinct "what does weight mean" models (A1111 scale, Comfy lerp, Compel blend, MJ multi-prompt); syntax is portable in form but not in meaning; T5/DiT encoders change the game. |
| 1e | [`1e-survey-papers.md`](./1e-survey-papers.md) | Four survey lenses (general PE, VLM PE, controllable generation, HCI modifiers) converge on "raw text prompts are necessary but insufficient" and legitimize the enhancer as a first-class layer. |

## Cross-Cutting Patterns

### P1 — "The user's prompt is not the model's prompt" (1c, 1e, 1b)
Distribution mismatch between short human queries and training-caption style is the *named* motivation for DALL·E 3's upsampler (1c §1), for the Promptist RL pipeline (1c §2; 1e §"Automatic prompt optimization"), and is corroborated by every T2I and controllable-generation survey (1e §"Consensus on failure modes" #4). This is the raison d'être of a prompt-to-asset product.

### P2 — Guidance is non-uniform across steps, models, and tokens (1a, 1b, 1d)
Three independent families reach the same "don't apply a fixed push" conclusion. 1a documents per-step CFG scheduling (guidance interval, APG, CFG++, annealing, dynamic CFG); 1b documents per-token attention steering (A&E excites neglected tokens, Bounded Attention clips leakage regions); 1d documents per-concept weighting (A1111 scale vs Comfy lerp vs Compel masked blend). All three reject the uniform knob.

### P3 — Oversaturation and mode collapse are a shared failure across guidance *and* weighting (1a, 1d)
Both 1a §"oversaturation failure mode" and 1d §F1 cite Sadat et al. arXiv:2410.02416 (APG) as the theoretical explanation: the parallel component of the CFG update with respect to the conditional prediction is what burns contrast; any mechanism that inflates the conditional signal (CFG scale, prompt weighting, or both) drives along that axis. The practical mitigation — CFG-rescale φ ≈ 0.7, keep weights in 0.7–2.0, prefer masked down-weighting — is the same lever in two disguises.

### P4 — Attribute binding failures recur in every angle (1b, 1c, 1e)
1b names catastrophic neglect and incorrect attribute binding and cites FineGRAIN + T2I-CompBench++ 2025 showing Flux/SD3/SD3.5 still fail; 1c cites PromptToAsset's 24-point AlignEvaluator taxonomy built around exactly these failures; 1e lists "compositional collapse" first in its consensus-failure-modes section. The agreement is total: one-shot text is not enough to bind "yellow" to "bench" when "brown bowl" is also in the prompt.

### P5 — Model-family-specific plumbing (1a, 1c, 1d)
Every angle forces the reader to branch on model family. 1a: SD 1.5/SDXL/SD3 use two-pass CFG; Flux/*-Turbo don't, and `negative_prompt` is a hard error. 1c: CLIP encoders hard-truncate at 77 tokens; T5-XXL and Qwen-Image do not. 1d: the same `(word:1.5)` syntax produces four different conditioning outcomes. For an enhancer targeting heterogeneous backends, *model detection and routing is the architecture*, not an afterthought.

> **Updated 2026-04-21:** FLUX.2 (released Nov 2025, [dev] open-weight Dec 2025) is the current Black Forest Labs generation. It shares the same T5-XXL + CLIP-L architecture and guidance-distillation behavior as FLUX 1.x; the `negative_prompt` restriction carries over. Multi-reference support (up to 10 images) is the key new capability. `gpt-image-1` / `gpt-image-1.5` replace DALL-E 3 in the "black-box API, text-only, no negative prompt channel" family.

## Controversies / Disagreements

### C1 — Long, descriptive prompts vs "stop using styles and attention-modifiers"
1c §1 makes DALL·E 3's 15–80 word upsample the default pattern; Betker et al. deliberately push long, descriptive, natural-language captions. 1d §6, citing SD.Next's wiki, advises the opposite for SD3 and Flux: "use very descriptive language and completely stop using styles, keywords and attention-modifiers," because SD3's training replaced rather than augmented its captions. The resolution is model-family-specific: descriptive natural language is right for T5-XXL pipelines (DALL·E 3 class, Flux, SD3), stacked comma-separated modifiers are still right for CLIP-only pipelines (SD 1.5, SDXL), and the enhancer needs to switch styles, not pick one.

### C2 — Ban-list modifiers vs learned aesthetic rewards
Promptist and BeautifulPrompt (1e §"Automatic prompt optimization") reward "magic term" injection via PickScore + aesthetic predictors. Oppenlaender flags those same tokens as *community passwords* that decay across model versions. A rewriter optimizing against a 2024 aesthetic reward may be training itself to emit decaying 2023 tokens.

### C3 — Will negative prompts survive guidance distillation?
1a §"Open Questions" #4 and 1d §"Open Questions" #4 both ask this: if Flux/SDXL-Turbo/SD3-Turbo become default, two-pass CFG disappears, and the negative-prompt channel with it. 1a recommends re-architecting around positive-prompt exclusion templates (natural-language "no drop shadow, no gradient background"); 1e's survey lens flags "negation" as an open research problem that prompt-level fixes never solved cleanly. The field has not decided whether negative prompts are a transient workaround or a permanent affordance.

### C4 — Structured vs flat output from the rewriter
1b §"Open Questions" #3 asks whether emitting JSON bboxes/token indices is worth it when third-party APIs (OpenAI Images, Gemini, Vertex Imagen) only accept text. 1c's LayoutGPT and PromptToAsset assume structure is the unlock. Right answer is dual-path: flat text for black-box APIs, structured JSON for diffusers/ComfyUI/Bounded-Attention runtimes.

## Gaps & Unanswered Questions

1. **No published per-model, per-asset-type CFG lookup table.** `7.5` is SD 1.5 lore; SDXL wants 5–7; Flux wants ~3.5; SD3 wants something else; logo vs icon vs illustration vs OG image may all have different optima. The closest artifact is practitioner blog posts (see 1a §"Open Questions" #1).
2. **No empirical benchmark for guidance-interval/APG/CFG++ on flat vector content.** Published FID lives on ImageNet and COCO photography. Logo/icon work is arguably *more* sensitive to CFG because oversaturation destroys flats faster than it destroys textures (see 1a §"Open Questions" #2; 1b §"Open Questions" #5).
3. **No clean portability mapping between weighting parsers.** ComfyUI_ADV_CLIP_emb's existence proves the modes are not equivalent, but no one has published a calibrated table ("A1111 weight 1.5 ≈ Compel ×1.35 ≈ Comfy default 1.7") (see 1d §"Open Questions" #2).
4. **No solved anchor for "inviolable" user tokens through an LLM rewriter.** Logit biasing, post-hoc verification, and structured `{locked, expanded}` output are all proposed; none is published (see 1c §"Open Questions" #1).
5. **DiT/joint-attention portability of cross-attention control is undetermined.** Every P2P / A&E / SynGen / Bounded Attention result was derived on U-Net cross-attention. SD3 / Flux.1 use joint attention over image + text tokens; a Feb 2026 paper (arXiv:2602.06886, "Prompt Forgetting") shows prompt signal decays through DiT depth, pointing to mid-block re-injection as an opening (see 1b §F4, §"Open Questions" #1).
6. **Negative weights on Flux / SD3 are untested.** With no real CFG and a T5-XXL stream, what a Compel-style masked down-weight actually does inside the T5 conditioning is not characterized (see 1d §"Open Questions" #4).
7. **LoRA × CFG × prompt-weight interactions are un-specced.** LoRAs are trained against a specific CFG; pushing CFG amplifies LoRA effect non-linearly; adding `(trigger_word:1.3)` on top interacts unpredictably (see 1a §"Open Questions" #5; 1d §"Open Questions" #5).
8. **No shared humanness-of-output / compositional-correctness metric** for prompt-to-asset A/B tests. DSG, TIFA, ImageReward, HPS v2, Pick-a-Pic, Gecko each measure overlapping-but-distinct constructs; Hartwig et al. 2024 catalog them but don't recommend one (see 1e §"T2I-specific surveys"; §"Open Questions" #4).

## Actionable Recommendations for the prompt-to-asset Plugin

1. **Route by `(ecosystem, model family, parser)` triple, not by "model name."** The same Flux.1-dev reached via the stock diffusers pipeline, a CFG-injected wrapper, SwarmUI, or a ComfyUI `CLIPTextEncodeFlux` node has *different* prompt semantics. Detect and dispatch — don't assume a single canonical form (1a §"Guidance distillation"; 1d §1).
2. **For CLIP-only targets (SD 1.5, SDXL), emit comma-separated keyword lists with measured weighting; for T5/DiT targets (Flux/FLUX.2, SD3, gpt-image-1/1.5 [formerly DALL-E 3], Imagen 3), emit full-sentence descriptive prose and avoid `(:w)` syntax** (1c §4; 1d §6; SD.Next wiki guidance cited in 1d §6).
3. **Never emit `negative_prompt` for Flux/*-Turbo pipelines. Encode exclusions as natural-language negation inside the positive prompt** ("isolated on white, no drop shadow, no gradient background, no text beyond the letter, no watermark"). Detect the pipeline class and switch (1a §"Guidance distillation"; §"Known Failures" #5).
4. **When the target supports CFG ≥ 7, emit `guidance_rescale ≈ 0.5–0.7` or APG parameters.** Ship a model-aware CFG default (SD 1.5: 7.0 + rescale 0.7; SDXL: 6.0 + rescale 0.7; Flux: 3.5 raw; SD3: ~4.5) as a lookup rather than a user-facing slider (1a §"oversaturation failure mode"; 1a §"Tools").
5. **Preserve literal noun phrases and type qualifiers verbatim through any rewrite pass.** "Logo," "icon," "favicon," "wireframe," hex color codes, and any single-quoted phrase should be copy-with-high-probability constraints. The DALL·E 3 intent-override failure is the canonical warning (1c §5; §"Known Failures" #1).
6. **Decompose complex multi-subject prompts before expansion, not after.** Emit a LayoutGPT-style or DeCoT-style intermediate representation (`{subjects: [{tokens, bbox}], attribute_pairs: [{modifier, head}]}`) when the backend understands it; fall back to a Structured-Diffusion-Guidance-style noun-phrase isolation for text-only APIs (1b §F3, §"Example 2"; 1c §3).
7. **Budget and chunk against the downstream text encoder.** For CLIP-only pipelines, detect ≤77 tokens and either emit `compel`-style long-weighted embeddings, A1111 `BREAK`-separated chunks, or `lpw_stable_diffusion`. For T5-XXL, allow ~512 tokens of natural language. Never silently ship a 200-token LLM rewrite to SD 1.5 (1c §4, §"Known Failures" #2; 1d §"F4").
8. **Do not expect the diffusion model to produce alpha.** Emit a `{transparent: true}` flag that the asset pipeline consumes via a separate route — LayerDiffuse for fine-tuned RGBA output, or post-hoc matting (SAM/rembg/BiRefNet). Do *not* rely on prompt tokens like "transparent background" to produce real alpha (1a §"Open Questions" #3; 1b §"Open Questions" — transparency out of scope).
9. **Version modifier vocabularies per target model.** Ship modifier sets tagged `sd15`, `sdxl`, `sd3`, `flux`, `flux2`, `gpt-image-1`, `imagen3`, `mjv6`, `mjv7` (v7 is the current stable default as of June 2025; v8.1 alpha is in testing as of April 2026). Oppenlaender's decay finding means a single shared "magic terms" list silently degrades quality on newer targets (1e §"Consensus on failure modes" #2).

> **Updated 2026-04-21:** `dalle3` tag is now legacy — DALL-E 3 API is deprecated (removal May 12, 2026). Use `gpt-image-1` or `gpt-image-1.5` for current OpenAI image generation. FLUX.2 was released November 2025 (multi-reference, improved text rendering) and should be treated as a distinct target from FLUX 1.x.
10. **Instrument with a compositional evaluator, not aesthetic score alone.** DSG or TIFA-style VQA scoring on attribute binding, counting, and spatial relations should be a first-class metric alongside CLIPScore and human preference; use it to gate self-rewrites in an LLM-iterative-rewrite loop (OPT2I pattern) before shipping prompts to users (1e §"Automatic prompt optimization"; §"Tools"; 1c §2).

## Primary Sources Aggregated (De-duplicated)

### Foundational papers (guidance, attention, diffusion)
- Ho & Salimans 2022, Classifier-Free Diffusion Guidance — https://arxiv.org/abs/2207.12598 (1a)
- Dhariwal & Nichol 2021, Diffusion Models Beat GANs — https://arxiv.org/abs/2105.05233 (1a)
- Meng et al. 2022, On Distillation of Guided Diffusion Models — https://arxiv.org/abs/2210.03142 (1a)
- Lin et al. 2023, Common Diffusion Noise Schedules are Flawed (CFG-rescale) — https://arxiv.org/abs/2305.08891 (1a)

### CFG scheduling / variants
- Kynkäänniemi et al. NeurIPS 2024, Guidance Interval — https://arxiv.org/abs/2404.07724 (1a)
- Sadat et al. ICLR 2025, Adaptive Projected Guidance (APG) — https://arxiv.org/abs/2410.02416 (1a, 1d)
- Chung et al. ICLR 2025, CFG++ — https://arxiv.org/abs/2406.08070 (1a)
- Dynamic CFG via Online Feedback 2025 — https://arxiv.org/abs/2509.16131 (1a)
- Annealing Guidance Scale 2025 — https://arxiv.org/html/2506.24108v2 (1a)
- Perturbed-Attention Guidance CVPR 2024 — https://arxiv.org/pdf/2403.17377v1 (1a)

### Cross-attention / compositional control
- Hertz et al. 2022, Prompt-to-Prompt — https://arxiv.org/abs/2208.01626 (1b)
- Chefer et al. SIGGRAPH 2023, Attend-and-Excite — https://arxiv.org/abs/2301.13826 (1b)
- Feng et al. ICLR 2023, Structured Diffusion Guidance — https://arxiv.org/abs/2212.05032 (1b)
- Mokady et al. CVPR 2023, Null-Text Inversion — https://arxiv.org/abs/2211.09794 (1b)
- Rassin et al. NeurIPS 2023, SynGen — https://arxiv.org/abs/2306.08877 (1b)
- Li et al. BMVC 2023, Divide & Bind — https://arxiv.org/abs/2307.10864 (1b)
- Dahary et al. ECCV 2024, Bounded Attention — https://arxiv.org/abs/2403.16990 (1b)
- Gani et al. 2024, Box It to Bind It — https://arxiv.org/abs/2402.17910 (1b)
- Zhang et al. EMNLP 2024, Patcher — https://arxiv.org/abs/2406.16272 (1b)
- R-Bind, EMNLP 2025 — https://aclanthology.org/2025.emnlp-main.349/ (1b)
- Huang et al. NeurIPS 2023, T2I-CompBench — https://github.com/Karine-Huang/T2I-CompBench (1b)
- FineGRAIN 2025 — https://arxiv.org/html/2512.02161v1 (1b)
- Prompt Forgetting in DiT 2026 — https://arxiv.org/pdf/2602.06886 (1b)

### LLM prompt expansion / decomposition
- Betker et al. 2023, DALL·E 3 (Improving Image Generation with Better Captions) — https://cdn.openai.com/papers/dall-e-3.pdf (1c) [**Note 2026-04-21:** DALL-E 3 deprecated; API removal May 12, 2026. Successor: `gpt-image-1` / `gpt-image-1.5`.]
- Hao et al. NeurIPS 2023, Promptist — https://arxiv.org/abs/2212.09611 (1c, 1e)
- Cao et al. EMNLP 2023, BeautifulPrompt — https://arxiv.org/abs/2311.06752 (1c)
- Datta et al. ACL 2024, Prompt Expansion — https://aclanthology.org/2024.acl-long.189/ (1c)
- Wu et al. ICLR 2026, RePrompt — https://arxiv.org/abs/2505.17540 (1c)
- Tencent Hunyuan 2025, PromptToAsset — https://arxiv.org/abs/2509.04545 (1c)
- Feng et al. NeurIPS 2023, LayoutGPT — https://arxiv.org/abs/2305.15393 (1c)
- DeCoT 2025 — https://huggingface.co/papers/2508.12396 (1c)
- LayerCraft 2025 — https://arxiv.org/abs/2504.00010 (1c)
- DialPrompt EMNLP 2025 — https://aclanthology.org/2025.emnlp-main.444/ (1e)

### Surveys
- Schulhoff et al. 2024, The Prompt Report — https://arxiv.org/abs/2406.06608 (1e)
- Sahoo et al. 2024, A Systematic Survey of Prompt Engineering — https://arxiv.org/abs/2402.07927 (1e)
- Gu et al. 2023, Prompt Engineering on Vision-Language Foundation Models — https://arxiv.org/abs/2307.12980 (1e)
- Cao et al. TPAMI 2026, Controllable Generation with T2I Diffusion — https://arxiv.org/abs/2403.04279 (1e)
- Yang, Cheung & Ma 2025, T2I Generation and Editing Survey — https://arxiv.org/abs/2505.02527 (1e)
- Hartwig et al. 2024, Quality Metrics for T2I — https://arxiv.org/abs/2403.11821 (1e)
- Cao et al. 2024, Personalized Content Synthesis — https://arxiv.org/abs/2405.05538 (1e)
- Oppenlaender 2022/2024, Prompt Modifier Taxonomy — https://arxiv.org/abs/2204.13988 (1e)
- Liu & Chilton CHI 2022, Design Guidelines for Prompt Engineering — https://www.cs.columbia.edu/~chilton/web/my_publications/LiuPromptsAIGenArt_CHI2022.pdf (1e)
- White et al. 2023, Prompt Pattern Catalog — https://arxiv.org/abs/2302.11382 (1e)
- Wang et al. 2022, DiffusionDB — https://arxiv.org/abs/2210.14896 (1e)
- The Intricate Dance (2025) — https://arxiv.org/abs/2510.19557 (1e)

### Tools, docs, code references
- A1111 wiki — Negative Prompt — https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt (1a)
- A1111 discussion #2905 — prompt emphasis — https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/2905 (1d)
- A1111 `prompt_parser.py` — https://github.com/AUTOMATIC1111/stable-diffusion-webui/blob/master/modules/prompt_parser.py (1d)
- A1111 issue #2305 — BREAK / token-chunking — https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/2305 (1d)
- diffusers PR #3664 — zero-SNR + CFG-rescale — https://github.com/huggingface/diffusers/pull/3664 (1a)
- diffusers PR #9626 — APG landing — https://github.com/huggingface/diffusers/pull/9626 (1a)
- diffusers PR #1639 — custom cross-attention — https://github.com/huggingface/diffusers/pull/1639 (1b)
- diffusers issue #9124 — Flux `negative_prompt` unsupported — https://github.com/huggingface/diffusers/issues/9124 (1a)
- diffusers issue #2136 — 77-token truncation — https://github.com/huggingface/diffusers/issues/2136 (1c)
- diffusers PAG docs — https://huggingface.co/docs/diffusers/using-diffusers/pag (1a)
- diffusers weighted_prompts docs — https://huggingface.co/docs/diffusers/v0.22.1/en/using-diffusers/weighted_prompts (1d)
- diffusers Prompt2Prompt notebook — https://github.com/huggingface/notebooks/blob/main/diffusers/prompt_2_prompt_pipeline.ipynb (1b)
- kynkaat/guidance-interval — https://github.com/kynkaat/guidance-interval (1a)
- CFG++ project page — https://cfgpp-diffusion.github.io/ (1a)
- Perturbed-Attention Guidance project — https://cvlab-kaist.github.io/Perturbed-Attention-Guidance/ (1a)
- google/prompt-to-prompt — https://github.com/google/prompt-to-prompt (1b)
- prompt-to-prompt.github.io — https://prompt-to-prompt.github.io/ (1b)
- Null-Text Inversion project — https://null-text-inversion.github.io/ (1b)
- yuval-alaluf/Attend-and-Excite — https://github.com/yuval-alaluf/Attend-and-Excite (1b)
- weixi-feng/Structured-Diffusion-Guidance — https://github.com/weixi-feng/Structured-Diffusion-Guidance (1b)
- RoyiRa/Syntax-Guided-Generation (SynGen) — https://github.com/RoyiRa/Syntax-Guided-Generation (1b)
- boschresearch/Divide-and-Bind — https://github.com/boschresearch/Divide-and-Bind (1b)
- Karine-Huang/T2I-CompBench — https://github.com/Karine-Huang/T2I-CompBench (1b)
- microsoft/LMOps Promptist — https://github.com/microsoft/LMOps/tree/main/promptist (1c, 1e)
- Gustavosta/MagicPrompt-Stable-Diffusion — https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion (1c)
- Hunyuan-PromptEnhancer — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer (1c)
- LayoutGPT project — https://layoutgpt.github.io/ (1c)
- damian0815/compel — https://github.com/damian0815/compel (1c, 1d)
- compel syntax doc — https://github.com/damian0815/compel/blob/main/doc/syntax.md (1d)
- BlenderNeko/ComfyUI_ADV_CLIP_emb — https://github.com/BlenderNeko/ComfyUI_ADV_CLIP_emb (1d)
- ComfyUI CLIPTextEncode docs — https://docs.comfy.org/built-in-nodes/ClipTextEncode (1d)
- ComfyUI CLIPTextEncodeFlux docs — https://docs.comfy.org/built-in-nodes/ClipTextEncodeFlux (1d)
- ComfyUI DeepWiki — embeddings/weighting — https://deepwiki.com/comfyanonymous/ComfyUI/6.3-embeddings-and-prompt-weighting (1d)
- vladmandic/sdnext Prompting wiki — https://github.com/vladmandic/sdnext/wiki/Prompting (1d)
- asagi4/comfyui-prompt-control — https://github.com/asagi4/comfyui-prompt-control (1d)
- Midjourney Multi-Prompts & Weights — https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights (1d)
- Midjourney Stylize docs — https://docs.midjourney.com/docs/stylize (1d)
- InvokeAI advanced prompting — https://support.invoke.ai/support/solutions/articles/151000096723-advanced-prompting-syntax (1d)
- OpenAI Cookbook — What's new with DALL·E 3 — https://cookbook.openai.com/articles/what_is_new_with_dalle_3 (1c) [**legacy** — DALL-E 3 deprecated; see `gpt-image-1` / `gpt-image-1.5` documentation for current behavior]
- DALL·E 3 system prompt leak 2023-10-07 — https://leaked-system-prompts.com/prompts/openai/openai-dall-e-3_20231007-2 (1c)
- OpenAI community — rewriter-without-permission (thread 476355) — https://community.openai.com/t/api-image-generation-in-dall-e-3-changes-my-original-prompt-without-my-permission/476355 (1c)
- Flux.1-dev HF discussion #17 — guidance distillation — https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17 (1a)
- Flux.1-dev HF discussion #256 — CFG pipeline — https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256 (1a)
- Civitai — CFG for Flux distilled — https://civitai.com/articles/10087/revolutionizing-cfg-unlocking-flux-distilled-models-with-advanced-guidance-algorithms (1a)
- LayerDiffuse — https://github.com/layerdiffusion/sd-forge-layerdiffuse (1a)
- AMorporkian/sd-dynamic-thresholding-rcfg — https://github.com/AMorporkian/sd-dynamic-thresholding-rcfg (1a)
- Enferlain/ComfyUI-A1111-cond — https://github.com/Enferlain/ComfyUI-A1111-cond (1a)
- stable-diffusion-art — how negative prompt works — https://stable-diffusion-art.com/how-negative-prompt-work (1a)
- Vishal Bakshi — negative prompting deep dive — https://vishalbakshi.github.io/blog/posts/2024-11-20-negative-prompting/ (1a)
- imagetoprompt.dev — negative-prompts guide — https://www.imagetoprompt.dev/blog/negative-prompts-stable-diffusion/ (1a)
- Grokipedia — Negative Prompts — https://grokipedia.com/page/Negative_Prompts_in_AI_Image_Generation (1a)
- neurocanvas SDXL best-practices — https://neurocanvas.net/blog/sdxl-best-practices-guide/ (1a)
- The Prompt Report companion site — https://trigaten.github.io/Prompt_Survey_Site (1e)
- Awesome-Prompting-on-Vision-Language-Model — https://github.com/JindongGu/Awesome-Prompting-on-Vision-Language-Model (1e)
- Awesome-Controllable-T2I-Diffusion-Models — https://github.com/PRIV-Creation/Awesome-Controllable-T2I-Diffusion-Models (1e)
- Oppenlaender (published) — https://www.tandfonline.com/doi/full/10.1080/0144929X.2023.2286532 (1e)

## Status

Index synthesized 2026-04-19 across all five angle files (1a–1e). All primary-source URLs cited in at least one angle are aggregated above. Cross-references use the `(see 1X §section)` convention; every claim in the Executive Summary, Cross-Cutting Patterns, Controversies, and Recommendations sections is grounded in a specific angle section rather than external material.
