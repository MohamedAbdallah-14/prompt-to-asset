---
wave: 1
role: niche-discovery
slug: 04-native-rgba-generation
title: "Native RGBA generation — LayerDiffuse and successors"
date: 2026-04-19
sources:
  - https://github.com/lllyasviel/LayerDiffuse
  - https://github.com/lllyasviel/LayerDiffuse_DiffusersCLI
  - https://github.com/lllyasviel/sd-forge-layerdiffuse
  - https://github.com/diffus-me/sd-forge-layerdiffuse
  - https://github.com/huchenlei/ComfyUI-layerdiffuse
  - https://github.com/huchenlei/ComfyUI-layerdiffuse/blob/main/layered_diffusion.py
  - https://github.com/yolain/ComfyUI-Easy-Use
  - https://github.com/yolain/ComfyUI-Easy-Use/blob/070001b3/py/modules/layer_diffuse/__init__.py
  - https://www.runcomfy.com/comfyui-nodes/ComfyUI-Easy-Use/easy-preSamplingLayerDiffusion
  - https://www.runcomfy.com/comfyui-nodes/ComfyUI-Easy-Use/easy-kSamplerLayerDiffusion
  - https://github.com/RedAIGC/Flux-version-LayerDiffuse
  - https://github.com/FireRedTeam/LayerDiffuse-Flux
  - https://huggingface.co/RedAIGC/Flux-version-LayerDiffuse
  - https://github.com/rootonchair/diffuser_layerdiffuse
  - https://huggingface.co/rootonchair/diffuser_layerdiffuse
  - https://huggingface.co/LayerDiffusion/layerdiffusion-v1
  - https://huggingface.co/lllyasviel/LayerDiffuse_Diffusers/tree/main
  - https://arxiv.org/abs/2402.17113
  - https://lllyasviel.github.io/pages/layerdiffuse/
  - https://arxiv.org/abs/2403.11929
  - https://arxiv.org/abs/2412.04460
  - https://arxiv.org/abs/2502.18364
  - https://arxiv.org/abs/2505.11468
  - https://wacv.thecvf.com/virtual/2026/poster/156
  - https://openaccess.thecvf.com/content/CVPR2025/papers/Pu_ART_Anonymous_Region_Transformer_for_Variable_Multi-Layer_Transparent_Image_Generation_CVPR_2025_paper.pdf
  - https://fal.ai/models/fal-ai/layer-diffusion
  - https://fal.ai/models/fal-ai/layer-diffusion/api
  - https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1
  - https://developers.openai.com/api/docs/models/gpt-image-1
  - https://developers.openai.com/api/reference/resources/images
  - https://nanoeditor.app/blog/gpt-image-1-5-review
  - https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481/6
  - https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577
  - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001
  - https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate
  - https://ai.google.dev/gemini-api/docs/image-generation
  - https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/
  - https://bfl.ai/legal/non-commercial-license-terms
  - https://aifreeapi.com/en/posts/gpt-image-1-5-pricing
tags: [layerdiffuse, rgba, transparency, alpha, flux, sdxl]
---

# Native RGBA generation — LayerDiffuse and successors

The entire transparency failure mode surveyed in `docs/research/13-transparent-backgrounds/INDEX.md`
exists because frontier VAEs encode three channels. An alpha plane cannot be prompted
into existence; it has to be *taught* into the decoder. LayerDiffuse is the only public
architecture that has done this for open weights, and the corpus of ports, successors,
and hosted APIs around it is now big enough to support a real product. This deep-dive
enumerates every variant that matters, catalogs their RGBA quality, soft-edge behavior,
and failure modes, and ranks the integration options.

## The original: lllyasviel / LayerDiffuse (SDXL + SD 1.5)

Lvmin Zhang & Maneesh Agrawala, *Transparent Image Layer Diffusion using Latent Transparency*,
SIGGRAPH 2024 ([arXiv:2402.17113](https://arxiv.org/abs/2402.17113)). The repo landing
page is `lllyasviel/LayerDiffuse` (4.1k★, 353 forks); the weights live on HF under
`LayerDiffusion/layerdiffusion-v1` and `lllyasviel/LayerDiffuse_Diffusers`; a
GUI-free reference exists at `lllyasviel/LayerDiffuse_DiffusersCLI`.

- **Base models.** SD 1.5 and SDXL. No official 2.x or turbo variant.
- **Mechanism.** A transparency *encoder* maps an RGBA image to a latent offset that is
  summed onto the frozen SD latent; a *transparent VAE decoder* reconstructs RGBA. The
  base diffusion weights are frozen; only the encoder/decoder plus a rank-256 LoRA are
  trained. Shipped weights include `layer_sd15_vae_transparent_decoder.safetensors`,
  `layer_sd15_transparent_attn.safetensors`, `layer_xl_transparent_attn.safetensors`,
  `layer_xl_transparent_conv.safetensors`, plus FG/BG compositing LoRAs
  (`layer_xl_fg2ble`, `layer_xl_fgble2bg`, `layer_xl_bg2ble`, `layer_xl_bgble2fg`).
- **RGBA quality.** The paper's user study reports **97 %** of participants preferred
  LayerDiffuse's output over generate-then-matte with U²-Net, and annotators rated
  output quality indistinguishable from Adobe Stock reference transparent PNGs.
- **Soft-edge behavior.** Produces genuine fractional alpha — clean anti-aliasing on
  hard edges plus correct partial alpha on hair, glass, smoke, fur. No halo, no binary
  alpha staircasing.
- **Failure modes.** (1) Occasional "double subject" artifacts on complex multi-object
  prompts; (2) the FG/BG conditional LoRAs are less reliable than the T2I path;
  (3) SDXL weights outperform SD 1.5 on fine detail; (4) base model license is CreativeML
  OpenRAIL++-M — permissive; the LayerDiffuse weights themselves are released without an
  explicit LICENSE file in the repo but the paper's intent is open research use.
- **Integration.** `LayerDiffuse_DiffusersCLI` (Python, 8 GB VRAM, SDXL T2I + I2I +
  RGB-padding utility). WebUI-Forge extension at `lllyasviel/sd-forge-layerdiffuse`.
  The Forge fork `diffus-me/sd-forge-layerdiffuse` is maintained for the Forge ecosystem
  and was last updated August 2025.

## ComfyUI port: huchenlei / ComfyUI-layerdiffuse

> **Updated 2026-04-21:** Repository star count has grown slightly to ~1.8k★; last confirmed meaningful code push was December 2024 (v1.0.2 pyproject update). Flux support remains unresolved as an open issue. The project is effectively in maintenance mode — no new Flux integration landed in 2025 or early 2026.

The canonical ComfyUI implementation. ~1.8k★ (as of 2026-04), Apache-2.0, last updated December 2024.
Provides `LayeredDiffusionApply`, `LayeredDiffusionDecode`, `LayeredDiffusionDecodeRGBA`,
`LayeredDiffusionDecodeSplit`, and the conditional FG/BG variants. The decode node
turns the `[B, 3, H, W]` latent output into `[B, 4, H, W]` RGBA plus a separate alpha
mask. It loads `lllyasviel`'s weights directly from HF on first run.

- **Workflow modes.** (1) Generate foreground (direct RGBA); (2) Generate foreground
  with split RGB + alpha for downstream mask work; (3) FG+BG blending; (4) extract
  foreground from a blended image; (5) extract background from a blended image.
- **Known failure modes** (from the repo issue tracker): `LayeredDiffusionDecodeRGBA`
  occasionally disagrees with `LayeredDiffusionDiffApply` on tensor shapes after major
  ComfyUI upgrades (issue #66); Flux support is open and unresolved; some custom
  samplers don't interoperate with the transparent VAE path.
- **Integration API.** Native ComfyUI node pack — drives via ComfyUI's `/prompt`
  JSON endpoint. Cleanest programmatic path if you already run ComfyUI.

## Easy wrapper: yolain / ComfyUI-Easy-Use `easy layerDiffusion`

~2.4k★. Wraps `huchenlei`'s nodes into two higher-level nodes — `easy preSamplingLayerDiffusion`
(configures the method: SDXL attention-injection, SDXL conv-injection, SD 1.5
attention, FG-only, FG+BG) and `easy kSamplerLayerDiffusion` (executes sampling).
Shares the same `TransparentVAEDecoder` under `py/modules/layer_diffuse/`. No quality
delta vs the underlying implementation; the win is that the workflow graph is three
nodes instead of nine and the two nodes are discoverable via ComfyUI's search for
newcomers. **This is the shortest path to transparent PNG in self-hosted ComfyUI
and is what our Wave-0 category index (20d finding 12) flagged.**

## Diffusers port: rootonchair / diffuser_layerdiffuse

60★, MIT. A clean Python/Diffusers API port. Supports SD 1.5 and SDXL including the
conditional FG-only, joint-FG+BG, and FG-conditioned-on-BG paths. Because it plugs
into the standard `DiffusionPipeline` interface, it composes with ControlNet and
IPAdapter out of the box — which the WebUI/ComfyUI implementations only support via
custom node wiring. This is the right backend when you want to call LayerDiffuse
from a Python service without dragging in a ComfyUI runtime.

## Flux port: RedAIGC / Flux-version-LayerDiffuse (a.k.a. FireRedTeam / LayerDiffuse-Flux)

241★, last commit May 2025, 11 open issues. Ships two artifacts:
`TransparentVAE.pth` (379 MB) and `layerlora.safetensors` (1.23 GB). Supports T2I and
I2I. Requires Python 3.10 + PyTorch 2.3 + Flux.1-dev base weights.

- **Quality signal.** Community impressions match the SDXL ancestor — clean native
  alpha on hair, glass, fur; better text-rendering than SDXL-LayerDiffuse because
  Flux's T5 conditioning is stronger. No formal user study published.
- **Failure modes.** Install fragility (cv2, CLIP==1.0 pin, missing `__init__.py`
  reports), no ComfyUI node yet, no ControlNet integration, no Flux.2 support, VAE
  input range sensitivity flagged in issues.
- **License trap.** Base weights are Flux.1 [dev] under Black Forest Labs
  [Non-Commercial License v2.0](https://bfl.ai/legal/non-commercial-license-terms)
  (updated 2025-11-25): **commercial deployment is forbidden**. Commercial alpha on
  Flux must route through BFL's hosted `flux-pro` API (which does not expose
  LayerDiffuse) or rely on a future Apache-licensed Flux fork.
- **Integration API.** Python scripts only (`demo_t2i.py`, `demo_i2i.py`) — no first-
  party HTTP server, no ComfyUI node, no Diffusers pipeline class.

## Hosted / serverless

- **`fal-ai/layer-diffusion`** — SDXL LayerDiffuse exposed as `https://fal.run/fal-ai/layer-diffusion`.
  Text-to-image only. Parameters: `prompt`, `negative_prompt`, `guidance_scale` (0–20),
  `num_inference_steps` (10–40), `seed`, `enable_safety_checker`. Returns PNG with
  alpha. fal's page states "Commercial use: Supported" (the SDXL base license allows
  it). First-class clients for Python (`fal-client`), Node (`@fal-ai/client`), and
  plain HTTP. **This is the only zero-ops way to get LayerDiffuse quality behind an
  API without running a GPU.**
- **Replicate** has `cog-comfyui` workflows that embed `huchenlei/ComfyUI-layerdiffuse`;
  no first-party "layer-diffusion" model endpoint but user-published cogs exist.
- **RunPod / Modal / ComfyICU** — self-serve wrappers around ComfyUI with LayerDiffuse
  in the custom-node manifest.

## Successor papers (2024–2026)

- **LayerDiff** (ECCV 2024, [arXiv:2403.11929](https://arxiv.org/abs/2403.11929)) —
  layer-collaborative diffusion with an explicit layer-specific prompt + global prompt.
  No production code yet.
- **LayerFusion** ([arXiv:2412.04460](https://arxiv.org/abs/2412.04460)) — harmonized
  multi-layer T2I that reuses pretrained generative priors for inter-layer consistency.
- **ART** (CVPR 2025, [arXiv:2502.18364](https://arxiv.org/abs/2502.18364)) —
  *Anonymous Region Transformer*: variable multi-layer transparent generation, 50+
  layers per image, layer-wise crop attention >12× faster than full attention, ships
  a jointly-trained multi-layer transparent autoencoder. Biggest architectural step
  forward since LayerDiffuse. Reference implementation under a restricted
  research-only license.
- **PSDiffusion** (WACV 2026, [arXiv:2505.11468](https://arxiv.org/abs/2505.11468)) —
  unified framework that generates layout + appearance of multiple RGBA layers
  simultaneously with a global layer-interaction mechanism, producing shadows and
  reflections across layers. Target for our hero-asset path once weights drop.

No public training code for a new alpha-aware foundation model has shipped openly;
ART and PSDiffusion release weights but not pretraining pipelines.

## Commercial closed-source baselines

- **OpenAI `gpt-image-1` / `gpt-image-1.5` / `gpt-image-1-mini`.** First-class `background` API field
  accepting `"transparent" | "opaque" | "auto"` (default `"auto"`), returns base64
  PNG/WebP. Pricing for `gpt-image-1.5` HQ 1024² = $0.133 (low $0.009, medium $0.034;
  2026 rates); `gpt-image-1-mini` HQ = $0.005 (low), up to 80% cheaper.

  > **Updated 2026-04-21:** OpenAI has deprecated DALL-E 2 and DALL-E 3 (shutdown: May 12, 2026). The current image family is `gpt-image-1.5` (flagship), `gpt-image-1` (stable), and `gpt-image-1-mini` (cost-efficient, released October 2025). Additionally, `gpt-image-2` is reportedly nearing release as of April 2026. Batch API pricing is half the standard rate across all tiers.

  Quality evidence: NanoEditor's December 2025 review reports "glass,
  smoke, wispy hair rendered perfectly against a transparent backdrop" — consistent
  with a native alpha decoder, not a post-hoc matter. **Failure modes:** (1) the
  `/edit` endpoint ignores `background:"transparent"` and frequently returns an
  opaque JPEG; (2) bright-white pixels inside the subject (a logo's interior
  counter-space) are sometimes erased along with the background — a "select color
  range" artifact; (3) photo-realistic subjects combined with stylization prompts
  occasionally drop the transparency flag entirely.
- **Google Imagen 4 / Nano Banana 2.** Imagen 4's Vertex AI docs explicitly list
  "Transparent background: Not supported" for `generate`, `fast-generate`, and
  `ultra-generate`. Nano Banana 2 (Gemini 3.1 Flash Image, released Feb 2026) adds
  text rendering, aspect-ratio control, and subject consistency, but the docs and
  February 2026 launch blog make no mention of native alpha output. Assume the
  checker-hallucination failure mode from category 13 still applies and all
  Gemini/Imagen outputs need the post-matte fallback.
- **Ideogram 3.0** has a dedicated `generate-transparent-v3` endpoint (POST to `/ideogram/v3/generate-transparent`); transparency is controlled via this separate endpoint, not via a `style` parameter value. Supports `style_preset` values including `FLAT_VECTOR`, `MINIMAL_ILLUSTRATION`, `ICONIC` for icon/logo use. **Recraft v3**
  supports it on `vector_illustration` / `icon` styles only (see 13a/13c for
  caveats).

## Integration recommendations

**Ranked options for getting true alpha in our product, with a fallback chain:**

1. **Default: `gpt-image-1.5` with `background:"transparent"`.** The only production-
   grade, no-ops, commercially licensed path for photographic and illustrative
   subjects. Single API parameter; alpha quality comparable to LayerDiffuse; no GPU;
   pricing acceptable. Our router should pick this whenever the user's prompt maps
   to a subject class that `gpt-image-1.5` handles well (products, characters, hero
   illustrations) and the generation endpoint suffices (never the `/edit` endpoint
   for transparency).
2. **Self-hosted LayerDiffuse on SDXL via `fal-ai/layer-diffusion` or ComfyUI +
   `huchenlei/ComfyUI-layerdiffuse` (through `yolain/ComfyUI-Easy-Use`).** The
   license-clean OSS path. Use fal's hosted endpoint for prototype and MVP traffic;
   switch to self-hosted ComfyUI on RunPod/Modal when volume justifies per-GPU-second
   economics. SDXL + LayerDiffuse wins on *logos, stickers, icon-style illustrations,
   flat-design marks* where SDXL's aesthetic prior is stronger than gpt-image-1.5.
3. **Ideogram 3.0 `generate-transparent-v3` for typographic assets.** Best-in-class
   for logo wordmarks and badge-style typography with native alpha; narrower subject
   coverage than options 1–2 but decisive when text is the hero.

**Fallback chain (in order).** gpt-image-1.5 (`background:"transparent"`) →
gpt-image-1-mini (budget path, same transparency support) →
Ideogram 3.0 `/generate-transparent-v3` endpoint (typography/flat) → Recraft v3 vector/icon
style → fal `layer-diffusion` (SDXL) → self-hosted ComfyUI + LayerDiffuse (SDXL) →
Flux-LayerDiffuse (**research/personal only** — non-commercial) → generate-on-white
+ BiRefNet matter (category 13's default post-matte fallback) → difference-matting
via edit endpoint (hero quality on translucent subjects, 2× cost).

**Do not** adopt the Flux LayerDiffuse port as a production path until either BFL
relicenses Flux.1-dev or an Apache-licensed Flux-class base ships. **Do** monitor
ART and PSDiffusion weight releases every 60 days — either could collapse options
2–3 into a single multi-layer call. **Always** run the six-check validator from
`13e` before returning any RGBA asset, regardless of which path produced it; native
alpha reduces but does not eliminate the silently-opaque-PNG failure mode.
