---
category: 02-image-generation-models
angle: 2a
angle_title: Diffusion model foundations
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/1503.03585     # Sohl-Dickstein et al. 2015, nonequilibrium thermodynamics
  - https://arxiv.org/abs/1907.05600     # Song & Ermon 2019, NCSN (score matching)
  - https://arxiv.org/abs/2006.11239     # Ho, Jain, Abbeel 2020, DDPM
  - https://arxiv.org/abs/2010.02502     # Song, Meng, Ermon 2021, DDIM
  - https://arxiv.org/abs/2011.13456     # Song et al. 2021, Score-based SDEs
  - https://arxiv.org/abs/2112.10752     # Rombach et al. 2022, Latent Diffusion / Stable Diffusion
  - https://arxiv.org/abs/2206.00364     # Karras et al. 2022, EDM
  - https://arxiv.org/abs/2207.12598     # Ho & Salimans 2022, Classifier-Free Guidance
  - https://arxiv.org/abs/2206.00927     # Lu et al. 2022, DPM-Solver
  - https://arxiv.org/abs/2307.01952     # Podell et al. 2023, SDXL
  - https://github.com/CompVis/latent-diffusion
  - https://github.com/CompVis/stable-diffusion
  - https://github.com/NVlabs/edm
  - https://github.com/yang-song/score_sde_pytorch
  - https://github.com/ermongroup/ddim
  - https://github.com/hojonathanho/diffusion
  - https://huggingface.co/CompVis/stable-diffusion-v1-4
  - https://huggingface.co/docs/diffusers/en/api/schedulers/overview
---

# 2a — Diffusion model foundations

## Executive Summary

> **Updated 2026-04-21:** DALL·E 3 is scheduled for API deprecation on May 12, 2026; OpenAI’s current image model is **gpt-image-1** / **gpt-image-1.5** (released March–December 2025). Midjourney’s current default is **v7** (April 2025), with **v8 Alpha** in preview since March 2026. References to "DALL·E 3" and "Midjourney v6" throughout this document are accurate for the historical benchmarks cited but should not be read as "current flagship."

Diffusion models generate images by learning to reverse a gradual noising process. Four papers define the modern theoretical and practical stack that every text-to-image system (Stable Diffusion, SDXL, FLUX, Imagen, gpt-image-1, Midjourney’s internals) inherits from:

1. **DDPM** (Ho, Jain, Abbeel 2020) reframed 2015-era thermodynamic diffusion models ([Sohl-Dickstein et al.][sohl2015]) as a variational denoising objective — predict the Gaussian noise added to a latent — and showed it matched or beat GANs on CIFAR-10 (FID 3.17) and LSUN 256×256.[^ddpm]
2. **DDIM** (Song, Meng, Ermon 2021) generalized the DDPM forward process to a non-Markovian family whose reverse step can be deterministic, enabling **10×–50× faster sampling** from an unchanged DDPM checkpoint plus meaningful latent-space interpolation.[^ddim]
3. **Score-based SDEs** (Song et al. 2021) unified DDPM and Noise-Conditional Score Networks ([Song & Ermon 2019][ncsn]) under a single continuous-time SDE view, giving a principled toolbox (probability-flow ODE, predictor-corrector samplers, exact likelihood).[^sde]
4. **Latent Diffusion / Stable Diffusion** (Rombach et al. 2022) moved the diffusion process into the 8×-downsampled latent space of a pretrained VAE, cutting compute ≈50× while retaining perceptual quality — the reason consumer GPUs can run text-to-image at all.[^ldm][^sdcard]
5. **EDM** (Karras et al. 2022, NeurIPS Outstanding Paper) cleaned up the design space: a single σ-parameterized preconditioning scheme, a Heun-based ODE sampler, and a noise schedule that reach **FID 1.79 on CIFAR-10 in 35 NFE**.[^edm]

For asset-generation engineers, the operational takeaway is: you almost never train a diffusion model from scratch — you pick a **latent** backbone (SD 1.5 / SDXL / SD3 / FLUX), a **sampler/scheduler** (DDIM, DPM-Solver++, Euler-Karras, EDM-Heun), and a **guidance strength** (classifier-free guidance, CFG). The foundational papers below tell you which knob does what and why.

## Key Findings

### 1. The DDPM objective is “predict the noise, not the image”

DDPM defines a forward Markov chain $q(x_t \mid x_{t-1}) = \mathcal{N}(\sqrt{1-\beta_t}\,x_{t-1}, \beta_t I)$ that turns any image $x_0$ into near-Gaussian noise over $T$ steps. Ho et al. show that training to minimize the variational lower bound reduces, with a reweighting trick, to the simple loss:

$$
\mathcal{L}_{\text{simple}} = \mathbb{E}_{t, x_0, \epsilon}\bigl[\lVert \epsilon - \epsilon_\theta(x_t, t) \rVert^2\bigr]
$$

i.e. a neural net $\epsilon_\theta$ is trained to predict the noise $\epsilon \sim \mathcal{N}(0,I)$ that was added at step $t$. This is exactly the form implemented in [`hojonathanho/diffusion`][ho-repo] and mirrored in HF Diffusers’ `DDPMScheduler`.[^ddpm]

The connection to **denoising score matching** ([Song & Ermon 2019][ncsn]) is direct: $\epsilon_\theta(x_t, t) \approx -\sigma_t \nabla_{x_t}\log p_t(x_t)$. So “predict noise” and “estimate the score of the noisy distribution” are the same thing up to sign and scaling.[^sde]

### 2. DDIM: same weights, fewer steps, deterministic trajectories

DDIM keeps the DDPM marginals $q(x_t \mid x_0)$ identical but replaces the reverse process with a parameterized non-Markov family whose variance hyperparameter $\eta$ interpolates between DDPM ($\eta=1$) and a **deterministic** ODE-like sampler ($\eta=0$). Consequences engineers care about:

- You can take a model trained with the DDPM loss and sample it in 25–50 steps instead of 1000, with negligible FID loss — the ICLR 2021 paper reports **10×–50× wall-clock speedup** on CIFAR-10.[^ddim]
- With $\eta=0$ the mapping $\epsilon \leftrightarrow x_0$ is deterministic, enabling **DDIM inversion**: encode a real image to noise and edit it by re-denoising under a new prompt. This is the mechanism behind prompt-to-prompt, null-text inversion, and many img2img / ControlNet editing workflows.
- DDIM latents interpolate semantically; linear SLERP between two noise seeds produces a smooth morph, not a fade.

HF Diffusers exposes this as `DDIMScheduler`; setting `eta=0.0` is standard for reproducible generation.[^schedulers]

### 3. Score-based SDEs unify the landscape

Song et al. 2021 show DDPM is the discretization of a **variance-preserving SDE** $dx = -\tfrac{1}{2}\beta(t)\,x\,dt + \sqrt{\beta(t)}\,dw$ and NCSN is the **variance-exploding SDE** $dx = \sqrt{d[\sigma^2]/dt}\,dw$. The reverse-time SDE (Anderson 1982) is:

$$
dx = \bigl[f(x,t) - g(t)^2 \nabla_x \log p_t(x)\bigr] dt + g(t)\,d\bar w
$$

Training a score network $s_\theta(x,t) \approx \nabla_x\log p_t(x)$ with denoising score matching lets you integrate this SDE backward to sample. The same paper derives the **probability-flow ODE**, a deterministic ODE whose marginals match the SDE — enabling exact likelihoods, invertibility, and black-box ODE solvers. This is the theoretical umbrella under which EDM, DPM-Solver, and every Karras-style sampler sit.[^sde]

### 4. EDM: a cleaner parameterization that actually wins

Karras et al. argue previous diffusion formulations tangled noise schedule, network parameterization, weighting, and sampler. They propose σ-preconditioning — the network predicts a linear combination rather than raw noise:

$$
D_\theta(x,\sigma) = c_{\text{skip}}(\sigma)\,x + c_{\text{out}}(\sigma)\,F_\theta\bigl(c_{\text{in}}(\sigma)\,x;\,c_{\text{noise}}(\sigma)\bigr)
$$

with the coefficients chosen so the network input, output, and target all stay order-unit regardless of σ:[^edm-pre]

- $c_{\text{skip}}(\sigma) = \sigma_{\text{data}}^2 / (\sigma^2 + \sigma_{\text{data}}^2)$
- $c_{\text{out}}(\sigma) = \sigma\,\sigma_{\text{data}} / \sqrt{\sigma_{\text{data}}^2 + \sigma^2}$
- $c_{\text{in}}(\sigma) = 1/\sqrt{\sigma^2 + \sigma_{\text{data}}^2}$
- $c_{\text{noise}}(\sigma) = \tfrac14 \ln \sigma$

Combined with (a) a σ-schedule $\sigma_i = (\sigma_{\max}^{1/\rho} + \tfrac{i}{N-1}(\sigma_{\min}^{1/\rho} - \sigma_{\max}^{1/\rho}))^\rho$ with $\rho{=}7$, (b) a 2nd-order Heun ODE step, and (c) optional stochastic churn, EDM hits **FID 1.79 (class-conditional) / 1.97 (unconditional) on CIFAR-10 in 35 NFE** — state of the art at the time and still the standard against which new samplers are measured. The “Karras sigmas” option in HF Diffusers (`use_karras_sigmas=True`) is exactly this schedule.[^edm][^schedulers]

### 5. Latent diffusion is why text-to-image fits on a consumer GPU

Pixel-space diffusion of a 512×512×3 image operates on 786,432 values per step. Training Imagen- or GLIDE-class pixel diffusion took “hundreds of GPU days” per Rombach et al.[^ldm] Latent Diffusion (LDM) inserts a pretrained VAE with downsampling factor $f{=}8$ and latent channels $c{=}4$:

- A 512×512×3 image becomes a **64×64×4** latent (16,384 values) — a 48× reduction in spatial tokens the UNet has to denoise.[^sdcard]
- The paper reports roughly **order-of-magnitude reductions in compute vs. pixel diffusion of comparable FID**; community benchmarks put the practical multiplier at ≈50× for SD 1.x.[^ldm]
- Cross-attention layers in the UNet accept arbitrary conditioning $\tau_\theta(y)$ (text via CLIP ViT-L/14 for SD 1.x, text + pooled CLIP-G for SDXL, T5-XXL + CLIP for SD3 / FLUX), making the same backbone text-, class-, depth-, or layout-conditional.[^sdcard][^sdxl]

The tradeoff: the VAE is lossy. The SD 1.5 VAE (f8, c4) visibly degrades fine detail, text, and small faces; SDXL uses a retrained VAE; FLUX uses f8/c16 to preserve more detail. “Latent artifacts” (shimmer, color casts, texture smearing on reconstruction) are VAE failures, not diffusion failures.

### 6. Classifier-Free Guidance: the knob users actually move

Ho & Salimans 2022 replace classifier-gradient guidance (which required an extra noise-robust classifier) with a trick: during training, randomly drop the condition $c$ with probability ~10–20% so a single network learns both $\epsilon_\theta(x_t, t, c)$ and $\epsilon_\theta(x_t, t, \varnothing)$. At sampling time, extrapolate:

$$
\tilde\epsilon = \epsilon_\theta(x_t,t,\varnothing) + w \cdot \bigl(\epsilon_\theta(x_t,t,c) - \epsilon_\theta(x_t,t,\varnothing)\bigr)
$$

With $w{=}1$ you get vanilla conditional sampling; $w{>}1$ amplifies prompt adherence at the cost of diversity and (above $w \approx 7{-}12$) saturation, burn-in, and anatomy artifacts. The Stable Diffusion v1-4 model card explicitly cites CFG dropout at 10% during fine-tuning as the reason v1-4 beats v1-2 on prompt adherence.[^cfg][^sdcard] Every modern t2i UI exposes this as “CFG scale” or “guidance”.

### 7. Fast solvers: DPM-Solver and friends

Once you accept the probability-flow ODE view, sampling is an ODE integration problem and you can throw better numerical methods at it. **DPM-Solver** (Lu et al. 2022, NeurIPS) exploits the semi-linear structure of the diffusion ODE to derive a high-order exponential integrator that hits **FID 4.70 on CIFAR-10 in 10 NFE and 2.87 in 20 NFE**, a 4–16× speedup over previous training-free samplers.[^dpmsolver] **DPM-Solver++** (2022) stabilizes the high-CFG regime where DPM-Solver would otherwise blow up. These are the `DPMSolverMultistepScheduler` / `DPMSolverSinglestepScheduler` in Diffusers and the ubiquitous “DPM++ 2M Karras” / “DPM++ SDE Karras” options in A1111 / ComfyUI.[^schedulers]

Rough 2026 default-sampler table (from the Diffusers mapping table and community consensus):

| Scheduler (Diffusers)                  | A1111 / k-diffusion name | Typical NFE | When to use |
|---------------------------------------|--------------------------|------------:|-------------|
| `DDIMScheduler`                        | DDIM                     | 25–50       | Inversion, reproducibility |
| `EulerDiscreteScheduler`               | Euler                    | 20–30       | Fast, stable, good default |
| `EulerAncestralDiscreteScheduler`      | Euler a                  | 20–30       | More variety, less determinism |
| `DPMSolverMultistepScheduler` (+Karras)| DPM++ 2M Karras          | 15–25       | SDXL / FLUX default |
| `DPMSolverSinglestepScheduler`         | DPM++ SDE (Karras)       | 20–30       | High-CFG, better detail |
| `HeunDiscreteScheduler`                | Heun / EDM               | 20–40       | Best quality per NFE, slowest |

Source: HF Diffusers scheduler docs and the k-diffusion mapping table.[^schedulers]

### 8. Scaling the LDM recipe: SDXL and beyond

SDXL (Podell et al. 2023, ICLR 2024 spotlight) keeps the LDM formula but scales it: a 3× larger UNet (2.6B params), **two** text encoders (CLIP ViT-L + OpenCLIP ViT-bigG) with their outputs concatenated, multi-aspect-ratio training, and a separate refinement model that does a small img2img pass on near-final latents.[^sdxl] The lineage SD 1.5 → SDXL → SD3 (rectified flow) → FLUX.1 (rectified flow + DiT backbone) is a direct continuation of the LDM + EDM + CFG foundation; every node in that chain is still training a score/velocity network in a compressed latent space.

## Concrete Prompt Examples

These are not prompts for the end user; they are **sampler configurations** that exercise the foundational knobs for an asset-generation agent.

```python
# Baseline DDIM, deterministic, reproducible — good for A/B and regression tests
from diffusers import StableDiffusionPipeline, DDIMScheduler
import torch

pipe = StableDiffusionPipeline.from_pretrained(
    "CompVis/stable-diffusion-v1-4", torch_dtype=torch.float16
).to("cuda")
pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)

image = pipe(
    prompt="a flat vector app icon of a navy-blue fox, minimal, centered, 1024x1024",
    negative_prompt="photo, 3d, gradient mesh, text, watermark",
    num_inference_steps=30,
    guidance_scale=7.5,
    eta=0.0,
    generator=torch.Generator("cuda").manual_seed(42),
).images[0]
```

```python
# DPM-Solver++ 2M Karras — the 2026 community default for SDXL-class models
from diffusers import DPMSolverMultistepScheduler

pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config,
    algorithm_type="dpmsolver++",
    use_karras_sigmas=True,
    solver_order=2,
)
# 20 steps is usually enough; higher CFG works because ++ is stable
image = pipe(prompt=..., num_inference_steps=20, guidance_scale=8.0).images[0]
```

```python
# Euler-Heun EDM-style: expose the σ schedule directly (k-diffusion)
import k_diffusion as K
sigmas = K.sampling.get_sigmas_karras(n=30, sigma_min=0.02, sigma_max=80.0, rho=7.0, device="cuda")
# sigmas now follow the EDM schedule; pass to K.sampling.sample_heun
```

## Known Failures & Artifacts

Failures engineers will actually see, traced back to the foundations that cause them:

- **Oversaturation / burn-in** at CFG ≥ 10. CFG extrapolates the conditional direction linearly; past a point the predicted noise leaves the manifold the denoiser was trained on. Mitigation: lower CFG, use DPM-Solver++ (designed for high CFG), or dynamic-thresholding à la Imagen.[^cfg][^dpmsolver]
- **Checkerboard / ringing at low NFE with DDIM.** DDIM is 1st-order; at 10–15 NFE the truncation error is visible as grid artifacts. Switch to DPM-Solver++ 2M Karras or Heun (EDM).[^dpmsolver][^edm]
- **VAE smear on small text and fine geometry** (logos, UI icons, favicons, letterforms). Latent diffusion compresses 8× spatially; a 64×64 latent cannot encode a crisp 16-px glyph. Mitigation: generate at 1024+, use SDXL / FLUX VAEs, or post-refine in pixel space.[^ldm][^sdcard]
- **Mode collapse with deterministic samplers.** DDIM $\eta{=}0$ and EDM without churn are ODEs; they map each seed to exactly one image per prompt. Expected behavior, not a bug, but surprising if you expect ancestral variety.
- **Training/inference σ mismatch** after fine-tuning. If you LoRA a base trained with EDM preconditioning and sample with a non-EDM σ schedule (or vice versa), images look desaturated or overnoised. Match the sampler schedule to the training σ distribution.[^edm-pre]
- **Memorization of LAION duplicates.** The SD v1-4 model card explicitly warns the training data was not deduplicated and verbatim memorization is observable — a correctness and legal concern for any asset pipeline.[^sdcard]
- **Seed drift across diffusers versions.** Scheduler refactors (e.g. `DPMSolverMultistepScheduler` API changes, `use_karras_sigmas` default flips) change pixel output even for identical seeds. Pin `diffusers` version in any reproducibility-critical pipeline.[^schedulers]

## Tools, Libraries, Code

Primary reference implementations (all open source, verified live 2026-04):

- **DDPM** — reference TF/JAX: [`hojonathanho/diffusion`][ho-repo]; PyTorch ports in HF Diffusers (`DDPMScheduler`).[^ddpm]
- **DDIM** — reference PyTorch: [`ermongroup/ddim`][ddim-repo]; HF Diffusers `DDIMScheduler`, `DDIMInverseScheduler`.[^ddim]
- **Score SDE** — reference JAX/PyTorch: [`yang-song/score_sde_pytorch`][sde-repo]; covers VP-SDE, VE-SDE, sub-VP-SDE, predictor-corrector, probability-flow ODE.[^sde]
- **EDM** — reference PyTorch: [`NVlabs/edm`][edm-repo]; Karsten Crowson’s [`crowsonkb/k-diffusion`][kdiff] ports the EDM samplers and σ schedules that every modern UI uses.[^edm]
- **Latent Diffusion / Stable Diffusion** — reference: [`CompVis/latent-diffusion`][ldm-repo], [`CompVis/stable-diffusion`][sd-repo]; production path: HF Diffusers [`StableDiffusionPipeline`][sdpipe] with model card at [`CompVis/stable-diffusion-v1-4`][sdcard-hf].[^ldm][^sdcard]
- **SDXL** — [`Stability-AI/generative-models`](https://github.com/Stability-AI/generative-models); Diffusers `StableDiffusionXLPipeline`.[^sdxl]
- **DPM-Solver / DPM-Solver++** — reference: [`LuChengTHU/dpm-solver`](https://github.com/LuChengTHU/dpm-solver); integrated in Diffusers as `DPMSolverMultistepScheduler` / `DPMSolverSinglestepScheduler`.[^dpmsolver][^schedulers]
- **Schedulers overview** — the HF Diffusers scheduler docs provide a canonical mapping table from A1111 / k-diffusion names to Diffusers classes; use it when porting prompts between UIs.[^schedulers]

## Open Questions

1. **Rectified flow vs. diffusion.** SD3 and FLUX replaced the DDPM-style noise schedule with rectified-flow / flow-matching objectives (Liu et al. 2023; Lipman et al. 2023). Does CFG generalize cleanly, and do the EDM preconditioning insights transfer? Early reports say yes with modification; this is the live research front and deserves its own angle (see angle 2b if planned).
2. **Consistency models and 1-step sampling.** Song et al. 2023 consistency models and LCM / LCM-LoRA (Luo et al. 2023) distill diffusion into 1–4 NFE. Quality now approaches multi-step CFG for many prompts but still regresses on fine detail — when is distilled sampling “good enough” for asset pipelines vs. multi-step?
3. **How much of SDXL / FLUX quality is VAE vs. UNet/DiT vs. text encoder?** Ablations across SD 1.5 → SDXL → SD3 / FLUX suggest the text encoder (T5-XXL) and VAE upgrades account for much of the perceived quality jump, not the denoiser backbone alone. Relevant when choosing a base model for an agent.
4. **Deterministic asset reproducibility across stacks.** Same prompt + seed yields different pixels across A1111, ComfyUI, Diffusers, and InvokeAI because of scheduler implementation details and σ-schedule rounding. Is there a canonical “reference sampler” worth pinning?
5. **EDM2 (Karras 2024).** The follow-up paper (arXiv:2312.02696) adds post-hoc EMA and magnitude-preserving layers and reports further FID gains on ImageNet. Has it propagated into production t2i stacks yet, or is it still ImageNet-benchmark-only?

## Citations

[^ddpm]: Ho, Jain, Abbeel. *Denoising Diffusion Probabilistic Models.* arXiv:2006.11239 (NeurIPS 2020). <https://arxiv.org/abs/2006.11239>. Code: <https://github.com/hojonathanho/diffusion>.
[^ddim]: Song, Meng, Ermon. *Denoising Diffusion Implicit Models.* arXiv:2010.02502 (ICLR 2021). <https://arxiv.org/abs/2010.02502>. Code: <https://github.com/ermongroup/ddim>. Reports 10×–50× speedup over DDPM at comparable FID on CIFAR-10 / CelebA.
[^sde]: Song, Sohl-Dickstein, Kingma, Kumar, Ermon, Poole. *Score-Based Generative Modeling through Stochastic Differential Equations.* arXiv:2011.13456 (ICLR 2021, Oral). <https://arxiv.org/abs/2011.13456>. Code: <https://github.com/yang-song/score_sde_pytorch>. CIFAR-10 FID 2.20, IS 9.89; first 1024² score-based synthesis.
[^ldm]: Rombach, Blattmann, Lorenz, Esser, Ommer. *High-Resolution Image Synthesis with Latent Diffusion Models.* arXiv:2112.10752 (CVPR 2022). <https://arxiv.org/abs/2112.10752>. Code: <https://github.com/CompVis/latent-diffusion>.
[^sdcard]: CompVis. *Stable Diffusion v1-4 Model Card.* Hugging Face. <https://huggingface.co/CompVis/stable-diffusion-v1-4>. Documents f=8, c=4 VAE, CLIP ViT-L/14 text encoder, 10% CFG dropout during fine-tuning, 225k steps @ 512², 32×8 A100 training, LAION-aesthetics v2 5+. Retrieved 2026-04-19.
[^edm]: Karras, Aittala, Aila, Laine. *Elucidating the Design Space of Diffusion-Based Generative Models.* arXiv:2206.00364 (NeurIPS 2022, Outstanding Paper). <https://arxiv.org/abs/2206.00364>. Code: <https://github.com/NVlabs/edm>. CIFAR-10 FID 1.79 (class-cond) / 1.97 (uncond) at 35 NFE; ImageNet-64 FID 1.36.
[^edm-pre]: Karras et al., EDM §5 and Appendix B, preconditioning coefficients $c_{\text{skip}}$, $c_{\text{out}}$, $c_{\text{in}}$, $c_{\text{noise}}$ and loss weighting $\lambda(\sigma) = (\sigma^2 + \sigma_{\text{data}}^2)/(\sigma\sigma_{\text{data}})^2$.
[^cfg]: Ho, Salimans. *Classifier-Free Diffusion Guidance.* arXiv:2207.12598 (NeurIPS 2021 workshop). <https://arxiv.org/abs/2207.12598>. Introduces conditioning dropout + score extrapolation trick now ubiquitous as “CFG scale.”
[^dpmsolver]: Lu, Zhou, Bao, Chen, Li, Zhu. *DPM-Solver: A Fast ODE Solver for Diffusion Probabilistic Model Sampling in Around 10 Steps.* arXiv:2206.00927 (NeurIPS 2022). <https://arxiv.org/abs/2206.00927>. Follow-up *DPM-Solver++* arXiv:2211.01095 for guided sampling stability.
[^sdxl]: Podell, English, Lacey, Blattmann, Dockhorn, Müller, Penna, Rombach. *SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis.* arXiv:2307.01952 (ICLR 2024 spotlight). <https://arxiv.org/abs/2307.01952>. 3× larger UNet, dual text encoders, multi-aspect training, refinement model.
[^schedulers]: Hugging Face Diffusers. *Schedulers overview.* <https://huggingface.co/docs/diffusers/en/api/schedulers/overview>. Canonical mapping from k-diffusion / A1111 sampler names to `diffusers` scheduler classes, including Karras σ variants. Retrieved 2026-04-19.

[sohl2015]: https://arxiv.org/abs/1503.03585
[ncsn]: https://arxiv.org/abs/1907.05600
[ho-repo]: https://github.com/hojonathanho/diffusion
[ddim-repo]: https://github.com/ermongroup/ddim
[sde-repo]: https://github.com/yang-song/score_sde_pytorch
[edm-repo]: https://github.com/NVlabs/edm
[kdiff]: https://github.com/crowsonkb/k-diffusion
[ldm-repo]: https://github.com/CompVis/latent-diffusion
[sd-repo]: https://github.com/CompVis/stable-diffusion
[sdpipe]: https://huggingface.co/docs/diffusers/en/api/pipelines/stable_diffusion/text2img
[sdcard-hf]: https://huggingface.co/CompVis/stable-diffusion-v1-4

Additional foundational references (not inline-footnoted but in `primary_sources`):

- Sohl-Dickstein, Weiss, Maheswaranathan, Ganguli. *Deep Unsupervised Learning using Nonequilibrium Thermodynamics.* arXiv:1503.03585 (ICML 2015). <https://arxiv.org/abs/1503.03585>. Original diffusion-probabilistic-model paper.
- Song, Ermon. *Generative Modeling by Estimating Gradients of the Data Distribution.* arXiv:1907.05600 (NeurIPS 2019, Oral). <https://arxiv.org/abs/1907.05600>. NCSN / annealed Langevin sampling — the score-matching root of the tree.
