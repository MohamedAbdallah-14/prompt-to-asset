---
category: 01-prompt-engineering-theory
angle: 1a
angle_title: Classifier-free guidance, CFG scaling, negative prompts
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/2207.12598
  - https://arxiv.org/abs/2105.05233
  - https://arxiv.org/abs/2404.07724
  - https://arxiv.org/abs/2410.02416
  - https://arxiv.org/abs/2406.08070
  - https://arxiv.org/abs/2305.08891
  - https://arxiv.org/abs/2210.03142
  - https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt
---

# Classifier-Free Guidance, CFG Scaling, and Negative Prompts: Theory and Practice for Asset Generation

## Executive Summary

- **CFG is a score-extrapolation trick, not a truth serum.** Ho & Salimans (2022) showed you can skip the classifier from Dhariwal & Nichol (2021) by jointly training a conditional + unconditional diffusion model and extrapolating: `ε̂ = ε_u + w · (ε_c − ε_u)`. Everything users call "CFG scale", "guidance scale", "negative prompt", or "prompt strength" is a direct consequence of this single equation.
- **Negative prompts are a hack on top of CFG, not a separate feature.** A1111's original implementation simply replaces the empty-string unconditional branch `ε_u` with `ε(neg_prompt)`. The sampler then pushes *away* from the negative prompt by exactly the same CFG weight `w`, so negative-prompt potency scales linearly with CFG.
- **The "one CFG for all steps" assumption is wrong and now widely rejected.** 2024–2025 work (guidance interval, APG, CFG++, annealing guidance, dynamic CFG via online feedback) converges on the same finding: high CFG is harmful at high noise, beneficial in the middle, and mostly useless at low noise. Schedule-aware guidance gives better FID at lower effective scales.
- **High CFG causes the "burnt/oversaturated" artifact class.** This is an off-manifold and over-exposure problem (Lin 2023; Sadat 2024; Chung 2024), not a prompt-wording problem. For logo/icon/illustration generation, CFG 10+ will oversaturate flats and crush gradients unless you use CFG-rescale, APG, or CFG++.
- **Flux.1-dev, Flux.1-schnell, SDXL-Turbo, and other distilled models do not run real CFG.** They fold the guidance scale into a learned embedding (guidance distillation, Meng et al. 2022), which is why stock Flux pipelines don't accept `negative_prompt` at all and why "CFG 7 vs 3.5" means very different things across model families. This is a major trap for a prompt-to-asset product.

## Key Findings

### The academic chain: classifier guidance → classifier-free guidance

Dhariwal & Nichol's "Diffusion Models Beat GANs on Image Synthesis" introduced **classifier guidance**: train a separate noise-aware classifier `p(y|x_t)` and steer the diffusion sampler with its gradient, `∇_x log p(y|x_t)`, trading diversity for fidelity ([Dhariwal & Nichol 2021, arXiv:2105.05233](https://arxiv.org/abs/2105.05233)). This beat BigGAN-deep in 25 forward passes but required a second model trained on noised data, and the community noted the method "might succeed through adversarial attacks against the classifier" rather than real density steering.

Ho & Salimans replaced the classifier entirely. By randomly dropping the conditioning `c` during training (typically 10–20%), a single network learns *both* the conditional score `ε_θ(x_t, c)` and the unconditional score `ε_θ(x_t, ∅)`. At inference, they extrapolate:

```
ε̂(x_t, c) = ε_θ(x_t, ∅) + w · ( ε_θ(x_t, c) − ε_θ(x_t, ∅) )
```

where `w = 1` is unguided and `w > 1` is classifier-free guidance ([Ho & Salimans 2022, arXiv:2207.12598](https://arxiv.org/abs/2207.12598); [NeurIPS workshop page](https://neurips.cc/virtual/2021/48591)). This is the exact formula every "CFG scale" slider in the industry operates on. The "free" in CFG means "free of a classifier," not "free of compute" — it costs you *two* forward passes per denoising step, which is why distilled variants exist.

### Negative prompts are CFG with `ε_u` hijacked

The widely quoted mechanism — implemented by AUTOMATIC1111 in commit [757bb7c4](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt) — is textbook-simple:

```python
# Standard CFG
uc = model.get_learned_conditioning([""])  # empty string
# Negative-prompt CFG
uc = model.get_learned_conditioning(["grainy, fog, watermark, text"])
samples = sampler.sample(conditioning=c, unconditional_conditioning=uc, cfg_scale=7)
```

Because the CFG equation pushes the trajectory *away* from `ε_u` by the same weight `w`, strong negative prompts at CFG 7–9 produce strong "avoidance" pressure. At CFG 3 the pressure collapses; at CFG 12+ it turns into oversaturation (see [Stable-Diffusion-Art breakdown](https://stable-diffusion-art.com/how-negative-prompt-work); [imagetoprompt.dev 2026 guide](https://www.imagetoprompt.dev/blog/negative-prompts-stable-diffusion/)). Practically, the negative prompt does *not* act symmetrically with the positive prompt: it only engages once the positive prompt has shaped the latent enough that the negative concept is actually present to subtract, which community docs call the "delayed effect" (around the 5th denoising step for SD 1.5/SDXL at 20-step schedules — see [Grokipedia: Negative Prompts](https://grokipedia.com/page/Negative_Prompts_in_AI_Image_Generation)).

### The static-CFG assumption is broken (2024–2026 consensus)

Four independent lines of work reached the same conclusion: a constant `w` is almost never optimal.

1. **Guidance interval (Kynkäänniemi et al., NeurIPS 2024).** Guidance is *harmful at high noise*, beneficial in the middle band of σ, and mostly redundant at low noise. Applying CFG only inside a narrow σ-interval drops ImageNet-512 FID from 1.81 → 1.40 and improves SDXL qualitatively ([arXiv:2404.07724](https://arxiv.org/abs/2404.07724); [code](https://github.com/kynkaat/guidance-interval)).
2. **Adaptive Projected Guidance / APG (Sadat et al., ICLR 2025).** Decomposes the CFG update into parallel + orthogonal components vs. the conditional prediction. The *parallel* component is what causes oversaturation and contrast-burn; the *orthogonal* component carries the useful detail. Down-weighting the parallel component with a hyperparameter `η ∈ [0,1]` plus a momentum term lets you run "effective" CFG at 10–15 without burning ([arXiv:2410.02416](https://arxiv.org/abs/2410.02416); [diffusers PR #9626](https://github.com/huggingface/diffusers/pull/9626)).
3. **CFG++ (Chung et al., ICLR 2025).** Shows that standard DDIM+CFG pushes samples *off the learned data manifold*, which is why invertibility breaks and high-w mode-collapses. Their fix is one line: use the *unconditional* noise during the renoising step while still using the guided score for denoising. Gives better quality at *lower* guidance scales and fixes editability for distilled models (SDXL-Turbo, SDXL-Lightning) ([arXiv:2406.08070](https://arxiv.org/abs/2406.08070); [project page](https://cfgpp-diffusion.github.io/)).
4. **Dynamic CFG via online feedback (Google, 2025).** Rather than pick a fixed schedule, they use CLIP, a discriminator, and a human-preference RM to score intermediate samples and greedily pick per-step `w`. On Imagen 3 this reaches 53.8–55.5% human preference win rate over static CFG, with the biggest gains on hard cases like text rendering ([arXiv:2509.16131](https://arxiv.org/abs/2509.16131)).

### Guidance distillation: why Flux "CFG" is a lie

FLUX.1-dev, FLUX.1-schnell, SDXL-Turbo, SDXL-Lightning, and SD3-Turbo are **guidance-distilled** ([Meng et al., "On Distillation of Guided Diffusion Models", arXiv:2210.03142](https://arxiv.org/abs/2210.03142)). A student network is trained to reproduce the output of the full CFG teacher in *one* forward pass, with the guidance scale injected as a timestep-like conditioning embedding:

```python
# Flux transformer forward (simplified)
if guidance is not None:
    guidance = guidance.to(hidden_states.dtype) * 1000
    guidance_emb = timestep_embedding(guidance)
    temb = temb + guidance_emb
```

Consequences that matter for a prompt-to-asset product:

- The `guidance_scale` parameter in the Flux pipeline is **not** the CFG `w` — it is an input the model was trained on, with recommended inference values around 3.5 ([HF discussion #17](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17); [Civitai: Revolutionizing CFG for Flux distilled](https://civitai.com/articles/10087/revolutionizing-cfg-unlocking-flux-distilled-models-with-advanced-guidance-algorithms)).
- `FluxPipeline(...negative_prompt=...)` raises a `TypeError` in stock diffusers ([issue #9124](https://github.com/huggingface/diffusers/issues/9124)). Community "negative prompt for Flux" workflows re-introduce real two-pass CFG on top of the distilled model (e.g. [pipeline_flux_with_cfg](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/256)), doubling inference cost and only partially working.
- For our product: a prompt-to-asset targeting Flux must **encode negative intent into positive-prompt phrasing** ("isolated on white, no background, no drop shadow, no text") rather than producing a `negative_prompt` field. Targeting SDXL or SD3 *can* use a real negative prompt.

### The oversaturation failure mode (directly relevant to logos/icons)

Lin et al.'s "Common Diffusion Noise Schedules and Sample Steps are Flawed" is the most-cited explanation ([arXiv:2305.08891](https://arxiv.org/abs/2305.08891), WACV 2024, legacy but load-bearing). Because SD's noise schedule doesn't enforce zero terminal SNR, training leaks channel-mean information, which inference can't match — this interacts with CFG to produce the "everything drifts toward mid-grey then gets punched into neon" failure. Their fix list:

1. Rescale the noise schedule to zero terminal SNR.
2. Train with v-prediction.
3. Start the sampler from the final timestep.
4. **CFG-rescale**: after CFG extrapolation, rescale the predicted noise's std to match the conditional-only prediction. `x_cfg_rescaled = x_cfg · (σ_pos / σ_cfg) · φ + x_cfg · (1 − φ)` where φ ≈ 0.7.

The CFG-rescale trick is now standard in A1111/Forge/ComfyUI ([Hugging Face diffusers PR #3664](https://github.com/huggingface/diffusers/pull/3664); [sdnext issue #1186](https://github.com/vladmandic/sdnext/issues/1186)) and is a free win for any prompt-to-asset that pushes CFG above 7.

### Orthogonal guidance techniques worth knowing

- **Perturbed-Attention Guidance (PAG).** Replaces some self-attention maps with identity during an extra forward pass, then guides away from the degraded sample. Works in unconditional generation where CFG can't apply; `pag_scale ≈ 3` is the recommended starting point ([CVPR 2024, project page](https://cvlab-kaist.github.io/Perturbed-Attention-Guidance/); [diffusers docs](https://huggingface.co/docs/diffusers/using-diffusers/pag)). Useful for icon/illustration work where CFG alone produces structural artifacts.
- **Annealing guidance (2025).** Dynamically adjusts `w` based on the conditional noisy signal's magnitude instead of on step index, improving both quality and alignment ([arXiv:2506.24108](https://arxiv.org/html/2506.24108v2)).
- **Dynamic thresholding (Imagen-style clamping).** Clamps latent values between steps so higher CFG doesn't blow out pixel range; ships as an A1111 extension, often paired with CFG-rescale ([sd-dynamic-thresholding-rcfg](https://github.com/AMorporkian/sd-dynamic-thresholding-rcfg)).

## Concrete Prompt Examples

### Example 1 — SDXL app-icon generation with a structured negative prompt

```
Positive:
minimalist app icon for a note-taking app, single stylized paper sheet
with a folded corner, soft gradient from indigo to violet, centered on
a pure white square canvas, thick rounded strokes, iOS-style, flat
vector illustration, crisp edges, 1024x1024, high clarity

Negative:
photorealistic, photograph, 3d render, skeuomorphic, glossy, drop shadow,
background noise, texture, grain, gradient background, text, letters,
numbers, watermark, signature, extra icons, cluttered, busy, multiple
subjects, blurry, low contrast, (oversaturated:1.2), neon

Sampler: DPM++ 2M Karras, Steps: 28, CFG scale: 6.5, CFG-rescale φ: 0.7
Size: 1024x1024
```

Rationale: CFG 6.5 + φ=0.7 rescale keeps flats clean; the negative prompt targets the specific artifact classes ("drop shadow", "3d render", "gradient background") that SDXL loves to add to anything it calls an "icon".

### Example 2 — SD 1.5 logo with token emphasis and guidance interval

```
Positive:
(vector logo:1.3), (transparent background:1.2), single geometric leaf
mark, teal and emerald, bold outline, symmetrical, inside a white circle

Negative:
(realistic:1.3), (photo:1.2), (3d:1.2), texture, shading, background,
sky, scenery, text, watermark, (multiple logos:1.2), (cluttered:1.1),
(low quality:1.4), (worst quality:1.4)

Sampler: Euler a, Steps: 25, CFG scale: 8, guidance_interval=[0.2, 0.8]
```

Rationale: SD 1.5 needs heavier emphasis syntax than SDXL. Restricting CFG to the middle σ-interval (per Kynkäänniemi) cuts the "muddy early step" where high CFG hurts most.

### Example 3 — Flux.1-dev positive-only formulation (no negative prompt)

```
Pipeline: FluxPipeline (black-forest-labs/FLUX.1-dev)
guidance_scale: 3.5   # distilled guidance embedding, NOT CFG w
num_inference_steps: 28

Prompt:
Flat vector favicon, 512x512, isolated on a solid white background with
no transparency artifacts, single bold letter "N" in deep indigo,
centered, geometric sans-serif, crisp anti-aliased edges, no drop shadow,
no gradient, no texture, no background pattern, no secondary elements,
no text besides the letter, no watermark
```

Rationale: because Flux ignores `negative_prompt`, the exclusions have to live inside the positive prompt using natural-language negation. Keep `guidance_scale` near 3.5; anything ≥5 tends to crush mids on flat vector work.

## Known Failures & Artifacts

1. **High-CFG oversaturation / contrast-burn.** At `w ≥ 10` on SD 1.5/SDXL, colors clip, gradients banding, and whites turn cream. Root cause is the parallel component of the CFG update combined with non-zero terminal SNR schedules. *Fix:* CFG-rescale φ=0.5–0.7 ([Lin 2023](https://arxiv.org/abs/2305.08891)) or APG ([Sadat 2024](https://arxiv.org/abs/2410.02416)).

2. **Mode collapse at very high CFG.** Above `w ≈ 12` the sampler collapses to a narrow slice of the conditional distribution, which looks like "all my logos now have the same composition." CFG++ diagnoses this as an off-manifold drift and fixes it by swapping the renoising step to unconditional ([Chung 2024](https://arxiv.org/abs/2406.08070)).

3. **Negative-prompt delayed effect / non-engagement.** A negative prompt for a concept that the positive prompt never evokes has zero effect. Adding `"blurry"` to the negative on a prompt that already produces sharp images does nothing; adding `"3d render"` to a prompt asking for a flat icon *does* help because 3D is in SD's default manifold for "icon" ([stable-diffusion-art.com analysis](https://stable-diffusion-art.com/how-negative-prompt-work); [Vishal Bakshi deep dive](https://vishalbakshi.github.io/blog/posts/2024-11-20-negative-prompting/)).

4. **Negative-prompt leakage into positive semantics.** Because CFG subtracts the negative-prompt score from the positive-prompt score, tokens present in *both* prompts cancel. A negative prompt containing `"white background"` while the positive also contains `"white background"` weakens the white-background effect instead of strengthening it — a common footgun for icon/favicon workflows.

5. **Flux `negative_prompt` silently ignored or erroring.** Copying a SDXL workflow (positive + negative) into a Flux pipeline either raises `TypeError` (stock diffusers) or silently runs with no negative effect (some wrappers), producing the "my negative prompt stopped working" bug report ([diffusers issue #9124](https://github.com/huggingface/diffusers/issues/9124)).

## Tools, Libraries, Code

- **Hugging Face `diffusers`.** Native support for CFG via `guidance_scale=`, CFG-rescale via `guidance_rescale=`, APG via the PR landed in late 2024 ([#9626](https://github.com/huggingface/diffusers/pull/9626)), PAG via `enable_pag=True` on SDXL and PixArt-Sigma pipelines ([docs](https://huggingface.co/docs/diffusers/using-diffusers/pag)). Zero-terminal-SNR + CFG-rescale from Lin 2023 landed in [PR #3664](https://github.com/huggingface/diffusers/pull/3664).
- **AUTOMATIC1111 / Forge / ComfyUI.** Built-in `CFG Scale` and `Negative prompt` fields; `sd-dynamic-thresholding` extension wraps CFG-rescale + latent clamping ([repo](https://github.com/AMorporkian/sd-dynamic-thresholding-rcfg)).
- **Guidance-interval reference implementation.** [`kynkaat/guidance-interval`](https://github.com/kynkaat/guidance-interval) — minimal patch showing how to apply CFG only inside `[σ_lo, σ_hi]`.
- **CFG++ reference implementation.** [`cfgpp-diffusion.github.io`](https://cfgpp-diffusion.github.io/) — drop-in replacement for DDIM+CFG in about 5 lines.
- **AUTOMATIC1111 wiki page on negative prompts.** [Canonical explanation and the original commit diff](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt).
- **A1111-style conditioning in ComfyUI.** [`Enferlain/ComfyUI-A1111-cond`](https://github.com/Enferlain/ComfyUI-A1111-cond) — needed if you want prompts authored in A1111 syntax to behave identically in ComfyUI, critical for reproducibility in a prompt-to-asset product.

## Open Questions

1. **How should a prompt-to-asset pick CFG per-model and per-asset-type?** There is no empirical meta-study spanning SD1.5/SDXL/SD3/Flux across "logo vs icon vs illustration vs OG image". The `7.5` folk value is SD 1.5 Lore; SDXL often wants 5–7, Flux wants 3.5, SD3 wants different values again. A published lookup table does not exist (the closest is [neurocanvas SDXL best-practices post](https://neurocanvas.net/blog/sdxl-best-practices-guide/)).
2. **Does guidance-interval or APG help more on flat/vector content than on photographs?** Published FID is reported on photographic benchmarks (ImageNet, COCO). Logo/icon generation is arguably *more* sensitive to CFG because oversaturation destroys flats faster than it destroys textures — but we have no benchmark proving it.
3. **How should "transparent background" be guided?** Real alpha requires a model that outputs RGBA (e.g., [LayerDiffuse](https://github.com/layerdiffusion/sd-forge-layerdiffuse)) or a post-hoc matting pipeline. CFG alone does *not* produce real transparency, which is the exact failure mode this project is trying to fix. Worth its own research note.
4. **Are negative prompts obsolete once all models go guidance-distilled?** If Flux/SDXL-Turbo/SD3-Turbo become default, the industry loses the two-pass CFG that negative prompts require. Prompt-enhancers may need to re-architect around RAG-style positive-prompt exclusion templates.
5. **What is the interaction between LoRA weights and CFG scale?** LoRAs are trained against a specific CFG, and pushing CFG at inference amplifies the LoRA effect non-linearly; no public study quantifies this.

## Citations

1. [Ho & Salimans, *Classifier-Free Diffusion Guidance*, arXiv:2207.12598 (2022)](https://arxiv.org/abs/2207.12598) — foundational CFG paper; introduces the joint-training trick and the extrapolation equation every "CFG scale" slider implements.
2. [Dhariwal & Nichol, *Diffusion Models Beat GANs on Image Synthesis*, arXiv:2105.05233 (NeurIPS 2021)](https://arxiv.org/abs/2105.05233) — the classifier-guidance paper CFG was designed to replace; establishes the quality/diversity tradeoff framing.
3. [Kynkäänniemi et al., *Applying Guidance in a Limited Interval Improves Sample and Distribution Quality*, arXiv:2404.07724 (NeurIPS 2024)](https://arxiv.org/abs/2404.07724) — proves guidance is harmful at high noise and unnecessary at low noise; proposes guidance-interval as a hyperparameter.
4. [Sadat, Hilliges & Weber, *Eliminating Oversaturation and Artifacts of High Guidance Scales* (APG), arXiv:2410.02416 (ICLR 2025)](https://arxiv.org/abs/2410.02416) — decomposes CFG into parallel + orthogonal components; the parallel component is the oversaturation culprit.
5. [Chung et al., *CFG++: Manifold-Constrained Classifier-Free Guidance*, arXiv:2406.08070 (ICLR 2025)](https://arxiv.org/abs/2406.08070) — shows standard DDIM+CFG is off-manifold; fixes invertibility and mode collapse at lower effective scales.
6. [Lin et al., *Common Diffusion Noise Schedules and Sample Steps are Flawed*, arXiv:2305.08891 (WACV 2024, **legacy**)](https://arxiv.org/abs/2305.08891) — origin of CFG-rescale; explains the "medium-brightness only" bias and how high CFG amplifies it.
7. [Meng et al., *On Distillation of Guided Diffusion Models*, arXiv:2210.03142 (CVPR 2023, **legacy**)](https://arxiv.org/abs/2210.03142) — guidance distillation paper that underpins Flux/SDXL-Turbo/SD3-Turbo; explains why `guidance_scale` in those models is a learned embedding, not CFG.
8. [Dynamic Classifier-Free Diffusion Guidance via Online Feedback, arXiv:2509.16131 (2025)](https://arxiv.org/abs/2509.16131) — per-step CFG selection using CLIP + discriminator + human-preference RMs; 53.8–55.5% human preference win rate on Imagen 3.
9. [Annealing Guidance Scale in Diffusion Space, arXiv:2506.24108 (2025)](https://arxiv.org/html/2506.24108v2) — dynamic CFG based on conditional-signal magnitude.
10. [Ahn et al., *Perturbed-Attention Guidance*, arXiv:2403.17377 (CVPR 2024)](https://arxiv.org/pdf/2403.17377v1) — guidance technique that works even without a text condition; complementary to CFG.
11. [AUTOMATIC1111 stable-diffusion-webui wiki, *Negative prompt*](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt) — canonical description of how negative prompts are implemented (replacing the `unconditional_conditioning` branch).
12. [Hugging Face diffusers PR #3664: *Fix schedulers zero SNR and rescale classifier-free guidance*](https://github.com/huggingface/diffusers/pull/3664) — reference implementation of Lin 2023's CFG-rescale in the most-used diffusion library.
13. [Hugging Face diffusers PR #9626: *Adaptive Projected Guidance*](https://github.com/huggingface/diffusers/pull/9626) — APG (Sadat 2024) landing in diffusers for SD/SDXL pipelines.
14. [`kynkaat/guidance-interval` reference code](https://github.com/kynkaat/guidance-interval) — minimal patch demonstrating limited-interval CFG on SDXL.
15. [CFG++ project page](https://cfgpp-diffusion.github.io/) — drop-in replacement for DDIM+CFG; shows how to use unconditional noise during renoising.
16. [`black-forest-labs/FLUX.1-dev` discussion #17 — "What is guidance-distilled?"](https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17) — confirms Flux uses distilled CFG embedded as a parameter, not two-pass CFG.
17. [Hugging Face diffusers issue #9124 — Flux `negative_prompt` not supported](https://github.com/huggingface/diffusers/issues/9124) — documents that stock Flux pipelines raise `TypeError` on negative prompts; primary trap for a prompt-to-asset product.
18. [stable-diffusion-art.com, *How does negative prompt work?*](https://stable-diffusion-art.com/how-negative-prompt-work) — clearest practitioner-level explanation of the CFG + negative-prompt interaction; corroborates the delayed-effect and cancellation failure modes.
