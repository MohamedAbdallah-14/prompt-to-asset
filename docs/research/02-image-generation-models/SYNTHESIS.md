---
category: 02-image-generation-models
date: 2026-04-19
angles_indexed:
  - 2a-diffusion-foundations
  - 2b-autoregressive-transformer-t2i
  - 2c-flow-matching-rectified-flow
  - 2d-dit-mmdit-architectures
  - 2e-imagen-technical-reports
---

> **⚠️ Status update 2026-04-21:** Google removed Gemini / Imagen image-gen from the universal free API tier in December 2025. Claims in this document about "~1,500 free images/day" or "Nano Banana free tier" now refer only to the AI Studio **web UI** (https://aistudio.google.com), which is still free for interactive generation. For **programmatic** free image-gen, prefer Cloudflare Workers AI (Flux-1-Schnell, 10k neurons/day), HF Inference (free HF_TOKEN), or Pollinations. Paid Gemini: $0.039/img Nano Banana; $0.02/img Imagen 4 Fast.

# Category 02 — Image Generation Models

## Scope

How the underlying *model families* that power modern text-to-image (T2I) systems — classical diffusion (DDPM / EDM / LDM), autoregressive transformers over visual tokens (Parti, Muse, VAR, Infinity, LlamaGen, Emu3, gpt-image-1), flow matching / rectified flow (SD3, FLUX.1, SANA), Diffusion Transformers and MM-DiT (PixArt, Hunyuan-DiT, SD3, FLUX, OmniGen), and Google's Imagen / Gemini-Native-Image stack — shape what prompts *work*, what assets *come out right*, and which quirks a prompt-to-asset plugin must encode per backend. Synthesizes five angles: diffusion foundations (2a), AR/transformer T2I (2b), flow matching and rectified flow (2c), DiT/MM-DiT architectures (2d), and Google's Imagen 1–4 + Nano Banana line (2e).

## Category Executive Summary

1. **The 2024–2026 backbone is MM-DiT + rectified flow, not U-Net + DDPM.** Every frontier *open-weights* T2I release since March 2024 (SD3, SD3.5, FLUX.1 dev/pro/schnell, SANA, HiDream, Qwen-Image, OmniGen) shares the same two design decisions: a multimodal Diffusion Transformer with joint bidirectional attention over text + image tokens (see `2d §MM-DiT`, see `2c §Productionization`), and a flow-matching training objective with straight-line / rectified-flow paths (see `2c §Key Concepts`). U-Net diffusion (SDXL-era) has effectively ceased at the frontier.
2. **Flow matching is a superset of diffusion, not a competitor.** Every DDPM/EDM model is a flow-matching model with a *curved* probability path; rectified flow just chooses the straight one (see `2c §Why "replacing" diffusion`). The consequence is that foundational diffusion machinery — CFG, Karras σ-schedules, Euler/Heun solvers, VAE latents — all ports over (see `2a §Classifier-Free Guidance`, `2a §EDM`).
3. **Architecture shifts, prompt-adherence bottleneck shifts with it.** MM-DiT's joint attention (SD3, FLUX) is the mechanical reason typography, long-prompt compliance, and spatial relations improved so sharply in 2024 (see `2d §Why the backbone changed`, `2d §Asset-generation quality implications`). The 77-token CLIP ceiling is dead; T5-XXL (up to 512 tokens) plus paragraph-scale prompting is now the norm.
4. **There are three structurally different T2I paradigms, not one.** A production prompt-to-asset must dispatch by paradigm: **diffusion / flow-matching DiT** (FLUX, SD3.5, Imagen, SANA), **autoregressive token / masked-parallel** (Muse, VAR, Infinity, LlamaGen, Emu3), and **hybrid multimodal transformer** (gpt-image-1, Gemini 2.5 Flash Image / Nano Banana, Transfusion, GLM-Image). They have different failure modes (see `2b §Tradeoffs vs diffusion`).
5. **"AR wins text, diffusion wins texture" is real and load-bearing.** AR/token models (gpt-image-1.5 at ~98% word accuracy on short headlines, GLM-Image at 91% multi-region text; `2b §Strengths for text rendering`) decisively beat diffusion at in-image text, logos, UI mockups, and constraint-heavy layouts. Diffusion/flow-matching still wins on photoreal texture (FLUX.1, SD3.5, Imagen 4 Ultra). Hybrid stacks (AR planner + diffusion refiner) are becoming the 2026 default (see `2b §2024-2026 trajectory`).
6. **Google ships TWO architecturally distinct image families under one brand.** Imagen 1–4 are latent *diffusion* models, text-only on the pure `generate` SKUs (see `2e §Two stacks`). Gemini 2.5 Flash Image ("Nano Banana") and Gemini 3 Pro Image ("Nano Banana Pro") are **sparse Mixture-of-Experts transformers emitting image tokens** interleaved with text — not diffusion at all (see `2e §6.1 Architecture — not a diffusion model`). They have different input shapes, editing semantics, and policy envelopes; routing wrong wastes calls.
7. **The text encoder is now a larger capability lever than the denoiser.** SD3's scaling study showed validation loss linearly predicts human preference under a fixed rectified-flow objective (see `2d §MM-DiT`). The step budget flow matching freed up got reinvested in bigger text encoders — T5-XXL (SD3/FLUX), Gemma (SANA), GLM-4-9B (CogView4), GPT-class (gpt-image-1) — not in faster generation (see `2c §Implications for Prompt Adherence`). Prompt enhancement that exploits long-context, grammatical, scene-first descriptions now generalizes across the rectified-flow family.
8. **VAE / tokenizer is a capability ceiling, independent of the backbone.** Latent-diffusion outputs are upper-bounded by the VAE's reconstruction fidelity; AR outputs are upper-bounded by the visual tokenizer's rFID (see `2a §Latent diffusion`, `2b §Known Failures — Tokenizer ceiling`). MAGVIT-v2's title — *"Tokenizer is Key"* — is the industry consensus. Small text, fine geometry, logos, and favicons are where tokenizer/VAE smear is most visible.
9. **Few-step distilled models amplify prompt specificity.** InstaFlow, FLUX-schnell, SD3.5 Turbo, and SANA-Sprint condense multi-step rectified-flow trajectories into 1–4 steps (see `2c §Productionization`). Empirically they are *more* sensitive to prompt structure — vague prompts mode-collapse where SDXL would have produced "generic acceptable" output (see `2c §Implications`). Enhancement pipelines must front-load composition, lighting, and subject anchors when routing to schnell-class models.
10. **CFG is still the knob users move, with scheduler- and model-specific sweet spots.** CFG scale ≥ 10 causes oversaturation and anatomy artifacts on diffusion (see `2a §CFG`); DPM-Solver++ stabilizes the high-CFG regime (see `2a §Fast solvers`). FLUX-dev ships a distilled-CFG head (`FluxGuidance`) that changes the knob's semantics (see `2d §FLUX.1`). SDXL, SD3, FLUX, and Imagen all want *different* default guidance values.
11. **Determinism and reproducibility are scheduler-, version-, and stack-dependent.** Same prompt + seed yields different pixels across A1111, ComfyUI, Diffusers, InvokeAI because of σ-schedule rounding and scheduler refactors (see `2a §Known Failures — Seed drift`). Pin library versions in any reproducibility-critical pipeline.
12. **Unified DiTs (OmniGen, FLUX Kontext, Qwen-Image-Edit) are replacing the ControlNet/LoRA/IP-Adapter zoo.** A single checkpoint now handles T2I, instruction editing, subject-driven generation, ControlNet-style conditioning, and classical CV tasks by changing only the input sequence (see `2d §OmniGen`). This collapses the prompt-to-asset's per-task branching.
13. **Editing is now a first-class flow-matching capability.** FLUX.1 Kontext unifies generate + edit under one rectified-flow objective via sequence concatenation; multi-turn consistency works because straight trajectories don't compound sampling error like curved diffusion paths (see `2c §2025-2026 follow-ups`). Iterative-refinement UX is newly viable.
14. **Provenance is no longer optional.** Every Google image (Imagen 2/3/4, Nano Banana line) carries a SynthID pixel watermark that survives compression and resizing; Imagen 3 adds C2PA Content Credentials (see `2e §8 SynthID and provenance`). OpenAI's gpt-image-1 carries C2PA. A prompt-to-asset should treat provenance as a feature, not a footnote.
15. **The open-vs-closed inversion has happened for AR, not yet for frontier diffusion.** Parti and Muse were never released; Emu3, VAR, Infinity, LlamaGen are open-weights (see `2b §Licensing`). Meanwhile the best diffusion flagships (FLUX.1 Pro, Imagen 4 Ultra, gpt-image-1) remain API-only. Cost-routing logic must cross this asymmetry.

## Map of the Angles

| Angle | File | Focus | Core primary sources | Research value |
|------:|------|------|----------------------|----------------|
| 2a | `2a-diffusion-foundations.md` | DDPM, DDIM, score-based SDEs, EDM, LDM/SD, CFG, DPM-Solver, SDXL — the mechanical foundation every other angle builds on | Ho+ 2020 (DDPM), Song+ 2021 (DDIM, SDE), Rombach+ 2022 (LDM), Karras+ 2022 (EDM), Ho & Salimans 2022 (CFG), Podell+ 2023 (SDXL) | High |
| 2b | `2b-autoregressive-transformer-t2i.md` | Token-based / AR / masked-parallel / next-scale T2I: Parti, Muse, MAGVIT-v2, VAR, Infinity, LlamaGen, Emu3, gpt-image-1, Transfusion | Yu+ 2022 (Parti), Chang+ 2023 (Muse), Tian+ 2024 (VAR), Han+ 2024 (Infinity), Wang+ 2024 (Emu3), OpenAI gpt-image-1 launch (Apr/Dec 2025) | High |
| 2c | `2c-flow-matching-rectified-flow.md` | Flow matching (Lipman 2022), rectified flow (Liu 2022), InstaFlow, SD3, FLUX.1, SANA, Kontext, SANA-Sprint — why flow matching replaced DDPM at the frontier | Lipman+ 2022, Liu+ 2022 (rectified flow), Esser+ 2024 (SD3), BFL 2024 (FLUX.1), Xie+ 2024 (SANA), BFL 2025 (Kontext) | High |
| 2d | `2d-dit-mmdit-architectures.md` | DiT → PixArt → Hunyuan-DiT → MM-DiT (SD3) → FLUX.1 → OmniGen: the transformer backbone evolution and its scaling/typography consequences | Peebles & Xie 2022 (DiT), Chen+ 2023 (PixArt-α/Σ), Li+ 2024 (Hunyuan-DiT), Esser+ 2024 (MM-DiT), BFL FLUX reference repo, Xiao+ 2024 (OmniGen) | High |
| 2e | `2e-imagen-technical-reports.md` | Google's image stack: Imagen 1/2/3/4 (latent diffusion) vs. Gemini Native Image (MoE transformer) — SKUs, capability matrix, SynthID, Vertex policy surface | Imagen 3 arXiv:2408.07009, Imagen 4 Vertex docs, Gemini 2.5 Flash model card, Nano Banana Pro launch post, Vertex AI responsible-AI docs | High |

## Cross-Cutting Patterns

- **"Predict the structure, not the pixels."** DDPM predicts noise (see `2a §1`), EDM predicts a σ-preconditioned blend (see `2a §EDM`), rectified flow regresses a velocity `x₁ − x₀` along a straight path (see `2c §Key Concepts`). All three are score / vector-field estimation, differing only in parameterization. The right way to reason about any 2024+ T2I model is *"what vector field is being learned, along what probability path, in what latent space, conditioned on what text encoder"*.
- **Latent space > pixel space, universally.** Every production-scale T2I system since Imagen 2 operates in a compressed latent (LDM f=8,c=4 for SD 1.x; SDXL's retrained VAE; FLUX's f=8,c=16; SANA's 32× deep-compression VAE). Pixel-space diffusion is now only seen in academic ablations (see `2a §5`).
- **Transformers > U-Nets for scaling.** DiT's monotonic Gflops→FID curve (see `2d §DiT`), SD3's validation-loss↔human-preference line (see `2d §MM-DiT`), and Amazon's controlled study (see `2d §Why the backbone changed`) independently reach the same verdict. Every frontier open model is a DiT of some flavor; the U-Net frontier is dead.
- **Joint bidirectional attention > cross-attention.** PixArt-α used cross-attention into T5-XXL; Hunyuan-DiT mixed single-stream cross and double-stream joint; SD3/FLUX/Qwen-Image went pure joint-attention (see `2d §MM-DiT`, `2d §FLUX.1`). This is *the* step-change for in-image text and long-prompt adherence.
- **Parallelism in generation is orthogonal to the training objective.** Muse (masked-parallel decoding), VAR/Infinity (next-scale), FLUX-schnell (few-step distilled rectified flow), SANA-Sprint (1-step consistency-distilled flow matching) all aim for "fewer sequential steps". Straight-path training is what makes the distillation tractable (see `2c §Market signals`).
- **Text encoder ceiling is the prompt-engineering ceiling.** CLIP-77 → T5-XXL-512 → GPT-class-in-context is the silent capability driver behind every generation jump. Anything that depends on "more than 20 words of prompt" is essentially text-encoder-bound.
- **Unified multimodal is the endgame.** OmniGen, FLUX Kontext, Qwen-Image-Edit, gpt-image-1, Nano Banana Pro, Emu3 all converge on "one transformer, one sequence of tokens, any task". The ControlNet/LoRA/IP-Adapter ecosystem is being absorbed.
- **Provenance ships with the model.** SynthID (all Google outputs), C2PA (Imagen 3 + gpt-image-1), visible sparkle watermarks (consumer Gemini tiers) are now standard (see `2e §8`). Any commercial prompt-to-asset that strips these is stepping on live policy.

## Controversies / Disagreements

- **Is gpt-image-1 a pure AR model or a Transfusion-style hybrid?** OpenAI says "natively multimodal" but has not disclosed the decoder (see `2b §Open Questions`). Externally this matters because matching its text fidelity in open weights requires knowing whether to copy Emu3 (pure-AR) or Transfusion (AR + diffusion head).
- **Does the "AR wins text, diffusion wins texture" split persist?** 2026 evidence (GLM-Image, Qwen-Image-2.0) suggests yes for single-stack models; hybrid stacks make it moot (see `2b §Open Questions`). Flow-matching DiTs (FLUX, SD3.5) have narrowed the text gap sharply but still trail gpt-image-1.5 and GLM-Image on long-headline accuracy. Midjourney v8 Alpha (March 2026) improved text accuracy from ~52% (v7) to ~78% but FLUX still leads at 88–92% for multi-word text.
- **Where is FLUX's quality advantage actually located — VAE, DiT, text encoder, or training data?** Ablation is not published; community attribution splits between (a) higher-channel VAE, (b) 12B parameter count, (c) T5-XXL + CLIP-L + rectified flow, and (d) training curation. Angle 2d leans toward "architecture plus parameters"; angle 2c toward "rectified flow straight paths". Both may be right.
- **Are closed flagships (Imagen 4, Midjourney v7) secretly rectified-flow too?** Imagen 3's report describes latent diffusion; Imagen 4 has no tech report. Several community post-mortems "hint at rectified-flow-like parameterizations without naming them" (see `2c §Market signals`). Unresolved; relevant for anyone reverse-engineering closed models.
- **Which benchmark to trust — GenEval, HRS-Bench, T2I-CompBench, LMArena, human-rated pairwise Elo?** Imagen 3's report uses Elo with 99% CI across five axes and 366k ratings (see `2e §4.2`); LMArena uses community voting; GenEval is automated. They disagree on ordering (Imagen 3 vs. FLUX vs. gpt-image-1 flip depending on axis). No canonical answer.
- **Is distillation "good enough" for production, or does the multi-step teacher always win?** FLUX-schnell vs FLUX-dev on detail-heavy prompts; SD3.5 Turbo vs SD3.5 Large; SANA-Sprint vs SANA. The consensus (see `2c §Implications`) is *distilled models amplify prompt specificity* — they're better when the prompt is strong, worse when it's weak.
- **Should prompt enhancement be the same across AR and diffusion backends?** Angle 2b documents that AR models exploit long structured prompts with exact strings; Angle 2c documents that flow-matching DiTs reward scene-first long prompts via T5. Both point toward "long, grammatical, concrete" — but AR cares about literal string preservation while DiT cares about compositional structure.

## Gaps & Unanswered Questions

- **No public ablation of "VAE vs. UNet/DiT vs. text encoder" quality contribution** across SD 1.5 → SDXL → SD3 → FLUX (see `2a §Open Questions`). Hurts routing and cost-modeling decisions.
- **No canonical reference sampler across Diffusers / A1111 / ComfyUI / InvokeAI** — σ-schedule rounding differs, and pixel output diverges for identical seeds (see `2a §Known Failures`).
- **Zero-shot prompt-enhancement transfer between multi-step and distilled siblings** (FLUX-dev ↔ FLUX-schnell, SD3.5 Large ↔ SD3.5 Turbo) is un-quantified (see `2c §Open Questions`).
- **Is there a flow-matching-specific prompt grammar?** MM-DiT's bidirectional attention might reward a different ordering than legacy SDXL templates. No public study (see `2c §Open Questions`).
- **Tokenizer choice for typography** — Glyph-ByT5 and character-level conditioning hint at specialized typographic tokenizers, no clean ablation published (see `2b §Open Questions`).
- **gpt-image-1 internals** — whether it emits pixel tokens, latent tokens, or routes to a diffusion decoder (see `2b §Open Questions`).
- **Imagen 4 has no tech report** (as of 2026-04). All capability claims come from launch blogs and Vertex docs (see `2e §5`).
- **SynthID vs. adversarial compression** — Google claims survival through resizing and compression; independent robustness data is thin (see `2e §8`).
- **Quality-diversity dilemma on flow-matching DiTs** — flow-matching improves prompt faithfulness while *reducing* diversity per seed (see `2c §Implications ¶3`). Mitigations (seed permutation, lexical variation) are ad hoc.

## Actionable Recommendations for the Prompt-Enhancer Plugin

### Model picker logic

The router should dispatch on **task shape** before **vendor preference**:

1. **Asset contains exact in-image text (headlines, UI labels, posters, logos with wordmarks)?** → AR/hybrid first: `gpt-image-1.5` > Gemini 3 Pro Image (Nano Banana Pro) > Ideogram 3 / 3 Turbo > GLM-Image > FLUX.1 Pro. Avoid pure diffusion (SDXL, SD 1.5) unless fallback-only; typography accuracy is ~50% range (see `2b §3`). > **Updated 2026-04-21:** DALL-E 3 is deprecated May 12, 2026 — do not route to it. Use `gpt-image-1` or `gpt-image-1.5`.
2. **Photoreal texture, portrait, fashion, product shot?** → Flow-matching DiT: FLUX.1 Pro ≈ Imagen 4 Ultra > SD3.5 Large > SDXL. Keep diffusion defaults (see `2d §Asset-generation quality implications`).
3. **Needs reference images, character/style consistency, multi-turn editing, or subject preservation?** → Gemini 2.5 Flash Image ("Nano Banana") for cheap iteration; Gemini 3 Pro Image or FLUX.1 Kontext for premium. **Do not route to Imagen `generate` SKUs** — they are text-in only (see `2e §5.3`, `2e §10`).
4. **Tight latency / on-device / cost-bounded (≤ $0.02/image)?** → SANA / SANA-Sprint, FLUX-schnell, SD3.5 Turbo, Imagen 4 Fast, or gpt-image-1 low-quality. All are ≤ 1s at 1024² (see `2c §Productionization`).
5. **Multilingual / non-Latin script / Chinese text?** → CogView4 (Chinese), Hunyuan-DiT (bilingual), gpt-image-1 (48+ languages), Nano Banana Pro (multilingual localization) (see `2b §Strengths`, `2e §7`).
6. **4K / large-aspect poster / print-ready?** → Imagen 4 Ultra (2816×1536), Nano Banana Pro (up to 4K), PixArt-Σ (4K). FLUX tops out lower without tiled pipelines.
7. **Commercial asset, needs indemnification?** → Route through Vertex AI Imagen 3/4 (indemnified) rather than consumer Gemini or self-hosted (see `2e §9.2`).

### Per-model quirks to encode

- **SDXL / SD 1.5.** 77-token CLIP ceiling → truncate or re-caption long prompts. CFG 5–8 typical; ≥10 burns. Default sampler: DPM++ 2M Karras, 20–25 steps. Seed is reproducible only with pinned Diffusers + `eta=0.0` (DDIM) or deterministic DPM-Solver++ (see `2a §7`, `2a §Known Failures`).
- **SD3 / SD3.5.** MM-DiT with three text encoders (CLIP-L + CLIP-G + T5-XXL). Feed the T5-XXL branch the full paragraph-scale prompt; feed CLIP branches the "short tag" version. Logit-normal timestep sampler — low-noise regions are rich in detail, high-noise in layout (see `2c §7`, `2d §MM-DiT`). SD3.5 Turbo is 4-step distilled; enhance prompts *more* aggressively.
- **FLUX.1 dev/pro/schnell.** Distilled-CFG head (`FluxGuidance`) — treat "guidance" as a scalar 2.5–5.0, not SDXL's 7.5. RoPE → robust aspect-ratio generalization, prefer non-square aspects freely. Schnell is 4-step; dev is multi-step; pro is API-only. Kontext variant for editing (see `2d §FLUX.1`, `2c §2025-2026 follow-ups`).
- **SANA / SANA-Sprint.** Gemma text encoder accepts *in-context human instructions* ("Generate an image of…"); use imperative framing. 32× VAE is aggressive — small text is especially risky (see `2c §Productionization`).
- **gpt-image-1 / gpt-image-1.5.** Per-token pricing ($0.02/$0.07/$0.19 low/medium/high). Best-in-class in-image text (~98% word accuracy on 1-5 word headlines); loses to FLUX on photoreal skin. Native world knowledge — prompts can reference real people/objects/brands without template expansion. C2PA metadata attached. No direct CFG knob (see `2b §Model specifics`). > **Updated 2026-04-21:** DALL-E 3 is deprecated by OpenAI on **May 12, 2026**; do not route to `dall-e-3` in new code. The replacement is `gpt-image-1` (API, April 2025) / `gpt-image-1.5` (December 2025).
- **Gemini 2.5 Flash Image (Nano Banana).** MoE transformer, NOT diffusion. 1 image = 1,290 output tokens = ~$0.039 (see `2e §6.1`). Max 3 input images, up to 10 output images per prompt, temperature 0.0–2.0. For editing, leverage *conversation context* — it's the same mechanism as text reasoning. Expose `safetySetting`, `personGeneration` (default `allow_adult` for commercial), `includeRaiReason`.
- **Gemini 3 Pro Image (Nano Banana Pro).** Up to 14 reference images (5 as character refs), 1K/2K/4K, multilingual localization, Google-Search grounding. Tier-dependent visible sparkle watermark: on for Free/Pro, off for Ultra / AI Studio / Vertex enterprise (see `2e §8.1`).
- **Imagen 3 / Imagen 4.** Latent diffusion, text-in-only on `generate` SKUs. Imagen 3 `capability-001` SKU is the editing/customization one (image-input capable); Imagen 4 has none — edits must go through Gemini Native Image. Imagen supports six non-English prompt languages in preview (see `2e §5.2`, `2e §9.3`).
- **Imagen (all versions).** No reliable prompt-based text-in-image on `imagegeneration@004` or lower. Imagen 2+ supports it but Imagen 4 "significantly improved"; Nano Banana Pro is still stronger. SynthID always on. Blocked outputs return successfully with `raiFilteredReason` and are **not billed** (see `2e §9.1`).
- **Ideogram 3.** Specialized typography module → 90% word accuracy; go-to for poster/logo work where exact spelling matters (see `2b §3`).
- **AR open models (VAR, Infinity, LlamaGen, Emu3).** Benefit from LLM serving infra (vLLM, FlashAttention, KV cache, speculative decoding); 326–414% speedup reported on LlamaGen with vLLM (see `2b §Tools`).

### Cross-cutting guidance

- **Always pin library and scheduler versions** in reproducibility paths (see `2a §Known Failures — Seed drift`).
- **Lengthen and structure the prompt** for T5-XXL / Gemma / GPT-class encoders; don't over-truncate for CLIP-era models but provide a *short tag list* as a fallback CLIP branch.
- **Front-load subject, composition, and lighting** for schnell / Turbo / SANA-Sprint / Imagen 4 Fast — distilled models amplify prompt specificity (see `2c §Implications ¶2`).
- **Inject explicit diversity** (seed sweep, lexical variation) on flow-matching DiTs to counter the quality-diversity dilemma (see `2c §Implications ¶3`).
- **Treat SynthID/C2PA as a feature** to surface in UI, not scrub.
- **Gate `safetySetting` overrides behind a backend** — `block_few` requires Google account-team approval, not just an API flag (see `2e §9.1`).

## Primary Sources Aggregated (De-duplicated)

### Foundational papers (diffusion + flow matching)

- Sohl-Dickstein et al. 2015, *Nonequilibrium Thermodynamics*, arXiv:1503.03585.
- Song & Ermon 2019, *NCSN*, arXiv:1907.05600.
- Ho, Jain, Abbeel 2020, *DDPM*, arXiv:2006.11239.
- Song, Meng, Ermon 2021, *DDIM*, arXiv:2010.02502.
- Song et al. 2021, *Score-based SDEs*, arXiv:2011.13456.
- Rombach et al. 2022, *Latent Diffusion / SD*, arXiv:2112.10752.
- Karras et al. 2022, *EDM*, arXiv:2206.00364.
- Ho & Salimans 2022, *CFG*, arXiv:2207.12598.
- Lu et al. 2022, *DPM-Solver* / *DPM-Solver++*, arXiv:2206.00927 / 2211.01095.
- Lipman et al. 2022, *Flow Matching*, arXiv:2210.02747; *Guide and Code* arXiv:2412.06264.
- Liu, Gong, Liu 2022, *Flow Straight and Fast (Rectified Flow)*, arXiv:2209.03003.

### Frontier models (2023–2026)

- Podell et al. 2023, *SDXL*, arXiv:2307.01952.
- Peebles & Xie 2022, *DiT*, arXiv:2212.09748.
- Chen et al. 2023/2024, *PixArt-α / PixArt-Σ*, arXiv:2310.00426 / 2403.04692.
- Li et al. 2024, *Hunyuan-DiT*, arXiv:2405.08748.
- Esser et al. 2024, *Scaling Rectified Flow Transformers (SD3 / MM-DiT)*, arXiv:2403.03206; Stability AI SD3 + SD3.5 release notes; `Stability-AI/sd3-ref`.
- Black Forest Labs 2024–2025, *FLUX.1* launch + model cards; `black-forest-labs/flux`; *FLUX.1 Kontext* arXiv:2506.15742.
- Xie et al. 2024, *SANA*, arXiv:2410.10629; Chen et al. 2025, *SANA-Sprint*, arXiv:2503.09641.
- Liu et al. 2023, *InstaFlow*, arXiv:2309.06380.
- Li et al. 2024, *On the Scalability of Diffusion-based T2I*, arXiv:2404.02883.
- Xiao et al. 2024, *OmniGen*, arXiv:2409.11340 (CVPR 2025); *OmniGen2*, arXiv:2506.18871 (June 2025).
- HiDream.ai, *HiDream-I1*, April 2025 (open-source, 17B sparse DiT, MoE); tech report arXiv:2505.22705.
- Qwen Team / Alibaba, *Qwen-Image* (20B MMDiT, arXiv:2508.02324, August 2025); *Qwen-Image-2.0* (7B, February 2026).
- ICLR 2026 Blogposts Track, *From U-Nets to DiTs*.

### Autoregressive / transformer T2I

- Yu et al. 2022, *Parti*, arXiv:2206.10789.
- Chang et al. 2023, *Muse*, ICML.
- Yu et al. 2023, *MAGVIT-v2*, arXiv:2310.05737.
- Wang et al. 2024, *Emu3*, arXiv:2409.18869; `baaivision/Emu3`.
- Tian et al. 2024, *VAR* (NeurIPS Best Paper), arXiv:2404.02905; `FoundationVision/VAR`.
- Han et al. 2024, *Infinity* (CVPR 2025 Oral), arXiv:2412.04431; `FoundationVision/Infinity`.
- Sun et al. 2024, *LlamaGen*, arXiv:2406.06525; `FoundationVision/LlamaGen`.
- Zhou et al. 2024, *Transfusion*, arXiv:2408.11039.
- OpenAI 2025, *gpt-image-1* + *gpt-image-1.5* launch posts and model card.
- THUDM/ZhipuAI, *CogView4-6B* model card.

### Google Imagen + Gemini Native Image

- Saharia et al. 2022, *Imagen 1*, arXiv:2205.11487.
- Imagen 3 Team 2024, *Imagen 3 Technical Report*, arXiv:2408.07009 v3.
- Google Cloud + Google Developers Blog 2023–2025: Imagen 2 GA, Imagen 4 launch, Imagen 4 Fast + GA, *Introducing Gemini 2.5 Flash Image* (Nano Banana), *Introducing Nano Banana Pro*.
- Vertex AI docs: Imagen 3 / 3-generate-002 (C2PA) / 4 SKUs, Gemini 2.5 Flash Image spec, Responsible AI for Imagen.
- DeepMind *Gemini 2.5 Flash Model Card* PDF.
- Google Cloud *Generative AI Indemnified Services* terms; *Gemini API Additional Terms*.
- LMArena blog + Image Edit leaderboard (secondary).

### Reference code / infra

- `hojonathanho/diffusion`, `ermongroup/ddim`, `yang-song/score_sde_pytorch`, `NVlabs/edm`, `CompVis/latent-diffusion`, `CompVis/stable-diffusion`, `Stability-AI/generative-models`, `LuChengTHU/dpm-solver`, `crowsonkb/k-diffusion`, `facebookresearch/flow_matching`, HF Diffusers docs.
