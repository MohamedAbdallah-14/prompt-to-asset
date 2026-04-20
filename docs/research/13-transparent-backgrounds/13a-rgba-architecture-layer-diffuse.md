---
category: 13-transparent-backgrounds
angle: 13a
title: "Alpha at the Model-Architecture Level — LayerDiffuse, Latent Transparency, and RGBA-Aware VAEs"
status: draft
research_value: critical
date_compiled: 2026-04-19
primary_papers:
  - arXiv:2402.17113 (LayerDiffuse — Zhang & Agrawala, SIGGRAPH 2024)
  - arXiv:2403.11929 (LayerDiff — Huang et al., ECCV 2024)
  - arXiv:2412.04460 (LayerFusion — Dalva et al., 2024)
  - arXiv:2505.11468 (ART / multi-layer transparent extensions, 2025)
models_with_native_alpha:
  - gpt-image-1 / gpt-image-1-mini / gpt-image-1.5 (OpenAI — first-class `background: transparent`)
  - Recraft V3 (advertised native transparent-style output; community reports degraded since launch — background-remove path is the reliable fallback)
  - LayerDiffuse finetunes on SD 1.5 and SDXL (OSS)
  - LayerDiffuse-Flux (OSS, RedAIGC, Dec 2024)
models_without_native_alpha:
  - Imagen 3 / Imagen 4 (4.0-generate / 4.0-fast / 4.0-ultra)
  - Gemini 2.5 Flash Image (Nano Banana)
  - Gemini 3 Pro Image / Flash Image (Nano Banana Pro / Nano Banana 2)
  - Midjourney v6 / v7
  - Ideogram v2 / v3
  - SDXL base, Flux.1 [dev]/[pro] base (no transparency LoRA applied)
  - DALL·E 3
tags: [alpha-channel, rgba, layerdiffuse, latent-transparency, vae, premultiplied-alpha, difference-matting, model-architecture, diffusion-models]
---

# 13a — Alpha at the Model-Architecture Level

## Executive Summary

The "checker-pattern" failure the user hits with Gemini is not a prompt-engineering bug. It is an **architecture-level** bug in every latent diffusion model whose VAE was trained only on RGB. This report digs below the API surface — into the latent space itself — to explain *why* so few generators emit real alpha, and what it takes to fix it.

The three findings that matter for the product:

1. **Latent diffusion VAEs are RGB-only by construction.** Stable Diffusion 1.5/2, SDXL, Flux, and every Imagen/Gemini descendant encode 3-channel pixels into a 4-channel *latent* tensor (the 4 is a feature-space dimension, not RGBA). Appending an alpha channel to the input requires retraining the encoder, the U-Net / DiT, and the decoder — or bolting on a separate "latent transparency" module as LayerDiffuse does. This is why a model cannot simply be *told* to produce transparency: there is no plane in its output tensor that could carry it. [[4]](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery) [[5]](https://github.com/huggingface/diffusers/issues/6548)
2. **LayerDiffuse (Zhang & Agrawala, SIGGRAPH 2024, arXiv:2402.17113) is the first published method that converts a pretrained latent diffusion model into a native RGBA generator without full retraining.** It does this by learning a *latent offset* — "latent transparency" — that encodes the alpha channel directly into the existing latent manifold with minimal disruption. In a user study, 97 % of participants preferred LayerDiffuse output to "generate-then-matte" pipelines, and the authors' blind comparison put the quality on par with Adobe Stock transparent assets. [[1]](https://arxiv.org/abs/2402.17113) [[2]](https://lllyasviel.github.io/pages/layerdiffuse/)
3. **Only two families of production models emit real alpha in 2026: OpenAI's `gpt-image-1` lineage (first-class `background:"transparent"`) and open-source LayerDiffuse finetunes ported to SD 1.5, SDXL, and Flux.** Everyone else — Google, Midjourney, Ideogram, base Flux, base SDXL, DALL·E 3 — requires a post-process matting stage. Recraft V3's advertised transparent-style path has degraded since launch and is no longer reliable; its background-remove post-processor is the actual production path there. [[3]](https://developers.openai.com/api/docs/guides/image-generation?image-generation-model=gpt-image-1) [[14]](https://github.com/RedAIGC/Flux-version-LayerDiffuse) [[6]](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background)

File path: `/Users/mohamedabdallah/Work/Projects/prompt-to-asset/docs/research/13-transparent-backgrounds/13a-rgba-architecture-layer-diffuse.md`

---

## 1. Alpha at the Model Level — Why Stock Generators Can't Emit It

### 1.1 The shape of a latent diffusion pipeline

A modern text-to-image model has three trainable networks stacked around a *latent* space:

```
pixels (RGB)  ─►  VAE encoder  ─►  latent tensor  ─►  U-Net / DiT (denoiser)  ─►  latent tensor  ─►  VAE decoder  ─►  pixels (RGB)
 3×H×W                               4×H/8×W/8                                    4×H/8×W/8                                 3×H×W
```

The **4** in the latent tensor is a learned feature-space dimension, not RGBA. SD 1.x/2.x use a 4-channel latent, SDXL uses 4, Flux uses 16, but none of those channels map to "alpha" — they are entangled features (approximately luma + two chroma-like + one texture/detail plane) discovered by the VAE during training on billions of RGB-only images. [[4]](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery)

Three consequences follow:

1. **The decoder physically cannot output a 4-channel RGBA image.** Its final convolution is `conv(64 → 3)`. There is no weight in the model that produces an alpha plane.
2. **The U-Net is trained to denoise RGB-latent distributions.** Even if you wrote an RGBA-aware decoder, the denoiser would have no reason to place "alpha" information anywhere particular in the latent.
3. **The input side has the mirror bug.** When an RGBA PNG is fed to `img2img`, the diffusers library famously mis-routes it. The `prepare_latents` function does `if image.shape[1] == 4: # assume this is already latents` — which was true for RGB images encoded to 4-channel latents, but silently mis-classifies a 4-channel RGBA PIL image as a latent and skips VAE encoding entirely, producing OOM errors or garbage output. [[5]](https://github.com/huggingface/diffusers/issues/6548) [[7]](https://github.com/huggingface/diffusers/issues/9225) This is why every production pipeline aggressively does `Image.open(...).convert("RGB")` before touching a model — and why alpha is silently thrown away everywhere on the input side, exactly mirroring the Gemini backend's silent flatten documented in google-gemini/generative-ai-python #567. [[20]](https://github.com/google-gemini/generative-ai-python/issues/567)

### 1.2 "Just retrain it with 4 channels" — why this is not done

Adding a 4th input/output channel to the VAE is mechanically trivial (swap `conv(3→64)` to `conv(4→64)` and `conv(64→3)` to `conv(64→4)`). But the VAE is a learned compressor; adding a channel changes the latent distribution, which means:

- the **U-Net / DiT must be retrained** to denoise the new distribution (billions of steps),
- the **text-to-image alignment must be re-learned** (CLIP / T5 conditioning no longer points to the same latents),
- training data must be **collected with ground-truth alpha** — ImageNet, LAION-5B, WebLI, and Google's internal Imagen corpora are overwhelmingly RGB-only; production-quality RGBA images with clean mattes are scarce.

Haven Studios' engineering team estimates the retrain cost at "billions of images to learn the alpha channel distribution — a resource-intensive process" which is why even teams with the compute to do it ship an RGB model and a separate matting model instead of one native RGBA model. [[4]](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery)

### 1.3 The two workable architectural strategies

Given the retrain cost, two strategies have emerged:

- **Bolt-on "latent transparency."** Encode alpha as an additive offset in the existing latent, preserving the frozen RGB VAE and the pretrained U-Net. A small transparency-aware encoder and decoder are trained to pack/unpack the alpha plane. This is LayerDiffuse — see §2.
- **Post-hoc matting.** Generate RGB, then run a dedicated segmentation network (U²-Net, BiRefNet / BRIA RMBG v2.0, Matte Anything, ViTMatte) to produce the alpha mask and composite. This is what every production Gemini/Imagen/Midjourney pipeline does. Quality ceiling is bounded by the matting network, not the generator. Semi-transparent regions (glass, smoke, hair, soft shadows) are the first to fail. [[9]](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images)

A third path — *true* RGBA-native training of a new foundation model from scratch — has not been publicly taken by any of the major labs as of April 2026.

---

## 2. LayerDiffuse Deep-Dive

### 2.1 The paper

**"Transparent Image Layer Diffusion using Latent Transparency"**, Lvmin Zhang & Maneesh Agrawala, Stanford. Posted 2024-02-27 to arXiv as **2402.17113**, revised to v3, accepted to **ACM Transactions on Graphics (SIGGRAPH 2024)**. Project page at `lllyasviel.github.io/pages/layerdiffuse/`. Reference code at `github.com/layerdiffusion/LayerDiffuse`. [[1]](https://arxiv.org/abs/2402.17113) [[2]](https://lllyasviel.github.io/pages/layerdiffuse/) [[10]](https://github.com/layerdiffusion/LayerDiffuse)

Zhang is best known as the author of ControlNet (SIGGRAPH 2023) and IC-Light, so LayerDiffuse arrives with immediate community credibility.

### 2.2 Core contribution — "latent transparency"

The key insight (quoting the abstract and §3 of the paper): the method encodes alpha-channel transparency **as a latent offset added to the existing pretrained latent distribution**, such that:

- the *offset* magnitude is regulated during training so that the latent with-transparency remains inside the original Stable Diffusion latent manifold,
- a dedicated **transparency encoder** `E_T : RGBA → Δz` learns to pack the alpha plane (and the premultiplied colour) into an additive delta,
- a dedicated **transparency decoder** `D_T : z + Δz → RGBA` learns to unpack RGBA from the offset latent.

Crucially, this means the pretrained U-Net's weights are **not** modified by the offset (the offset magnitude is kept small). The base generator sees something very close to the original latent distribution it was trained on, and image quality is preserved. Ablations in §4.3 of the paper show that if the transparency offset is not regulated, quality collapses as the latent drifts off-manifold. [[1]](https://arxiv.org/abs/2402.17113)

### 2.3 Training data

Zhang et al. assembled **1 million transparent image/layer pairs** using a human-in-the-loop scheme: initial rough alpha from off-the-shelf matting models, human review, iterative refinement. This is notable because curated transparent-asset datasets of this size did not previously exist publicly. The human-in-the-loop pipeline resolves the "no training data" half of the retrain problem (§1.2). [[1]](https://arxiv.org/abs/2402.17113)

### 2.4 Capabilities

The LayerDiffuse family (in the paper and the reference implementation) supports:

1. **Single-layer transparent generation** — one RGBA image from a text prompt.
2. **Foreground-conditioned background generation** — given a transparent foreground, synthesize a matching background.
3. **Background-conditioned foreground generation** — given an RGB background, synthesize a transparent foreground that composites cleanly.
4. **Joint two-layer generation** — produce foreground (RGBA) + background (RGB) simultaneously, harmonized.
5. **Structural control** — composes with ControlNet / depth / canny on either layer.

The project page shows FG-only, BG-only, FG+BG blended, and compositing-from-prompt demos. [[2]](https://lllyasviel.github.io/pages/layerdiffuse/)

### 2.5 User study

§5.1 reports: **97 % of study participants preferred LayerDiffuse native-transparent output over a generate-then-matte baseline**, and the authors' blind pair-wise comparison against Adobe Stock assets found quality statistically indistinguishable in the "matches commercial quality" rating. This is the best external evidence that native-RGBA generation beats post-hoc matting on edge quality, semi-transparency, and color fringing. [[1]](https://arxiv.org/abs/2402.17113)

### 2.6 Open-source ports

| Base model | Port | Repo | Status (April 2026) |
|---|---|---|---|
| SD 1.5, SD 2.x, SDXL | Reference `LayerDiffuse` | [layerdiffusion/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse) | Reference implementation; models on Hugging Face |
| SDXL | `sd-forge-layerdiffuse` (AUTOMATIC1111 Forge extension) | [diffus-me/sd-forge-layerdiffuse](https://github.com/diffus-me/sd-forge-layerdiffuse) | Uses `layer_xl_transparent_attn.safetensors` LoRA + `vae_transparent_encoder.safetensors` |
| SD 1.5 / SDXL | `ComfyUI-layerdiffuse` (custom nodes) | [huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse) | Exposes `LayeredDiffusionDecodeRGBA`; widely used in production ComfyUI graphs |
| Flux.1-dev / Flux.1-schnell | `LayerDiffuse-Flux` | [RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse) | Created 2024-12-11, 240+ ★, last update 2025-05-09; ships a custom `TransparentVAE.pth` + `layerlora.safetensors`; supports T2I and I2I |
| Flux + Forge | `FluxZayn` | [DrUmranAli/FluxZayn](https://github.com/DrUmranAli/FluxZayn) | WebUI Forge extension wrapping LayerDiffuse-Flux; PNG-metadata save, RGBA output |

[[8]](https://github.com/huchenlei/ComfyUI-layerdiffuse) [[11]](https://github.com/diffus-me/sd-forge-layerdiffuse) [[12]](https://www.instasd.com/comfyui/custom-nodes/comfyui-layerdiffuse/layereddiffusiondecodergba) [[13]](https://comfy.icu/node/LayeredDiffusionDecodeRGBA) [[14]](https://github.com/RedAIGC/Flux-version-LayerDiffuse)

Flux coverage matters because Flux is currently the highest-quality open-source base model. The December 2024 `LayerDiffuse-Flux` port retrained a custom `TransparentVAE` specifically adapted to Flux's 16-channel latent — a meaningful engineering effort, not a LoRA-only hack. This makes Flux + LayerDiffuse the strongest open-source path to native RGBA in 2026. [[14]](https://github.com/RedAIGC/Flux-version-LayerDiffuse)

### 2.7 Successors and related work

- **LayerDiff** (Huang et al., arXiv:2403.11929, ECCV 2024) — "text-guided multi-layered composable image synthesis." Simultaneously generates background + foreground + binary mask layers using inter-layer attention. Produces *isolated, non-overlapping* layers with hard binary masks (no semi-transparency), so it targets a different use case (layered illustrations) than LayerDiffuse (transparent assets). [[15]](https://arxiv.org/abs/2403.11929)
- **LayerFusion** (Dalva et al., Virginia Tech + Adobe Research, arXiv:2412.04460, under ICLR 2025 review) — harmonized FG-RGBA + BG-RGB + blended composite generation with attention-level blending. Uses LayerDiffuse's transparency prior as a *generative prior* rather than reimplementing it. Project page: `layerfusion.github.io`. [[16]](https://arxiv.org/abs/2412.04460)
- **ART / multi-layer transparent extensions** (arXiv:2505.11468, 2025) — extends latent-transparency to N stacked RGBA layers with inter-layer consistency losses. Bleeding-edge, not yet in production pipelines. [[17]](https://arxiv.org/abs/2505.11468)

For the prompt-to-asset product, **LayerDiffuse (on SDXL or Flux) is the relevant path today**; LayerDiff / LayerFusion / ART are directions to watch if multi-layer output becomes a product requirement.

---

## 3. Model Capability Matrix — Who Emits Real Alpha in 2026

| Model | Native RGBA? | How it gets alpha | Primary source |
|---|---|---|---|
| `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5` | **Yes (native)** | `background: "transparent"` parameter; `output_format: png` or `webp` | [OpenAI API — Create image](https://developers.openai.com/api/docs/api-reference/images/createEdit) [[3]](https://developers.openai.com/api/docs/guides/image-generation?image-generation-model=gpt-image-1) |
| Recraft V3 | **Partial / degraded** | Advertised transparent-style output; community reports checkered/white backgrounds as of 2025–2026. Reliable path is the post-hoc "Remove Background" tool in Recraft. | [Recraft Canny feedback thread](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background) [[6]](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background) |
| **LayerDiffuse on SD 1.5 / SDXL** | **Yes (native)** | Bolt-on latent transparency + transparent VAE; single-layer or FG+BG | arXiv:2402.17113 [[1]](https://arxiv.org/abs/2402.17113) |
| **LayerDiffuse-Flux** | **Yes (native)** | Custom `TransparentVAE.pth` + `layerlora.safetensors` on Flux.1-dev/schnell | RedAIGC repo [[14]](https://github.com/RedAIGC/Flux-version-LayerDiffuse) |
| Imagen 3 (`imagen-3.0-generate-001`) | **No** | Flat PNG; no alpha plane. Requires post-process matting. | [Vertex AI Imagen 3 docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate) [[18]](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate) |
| Imagen 4 (generate / fast / ultra) | **No** | Explicitly "Transparent background: Not supported" in the capability matrix. | [Vertex AI Imagen 4 docs](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001) [[19]](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001) |
| Gemini 2.5 Flash Image (Nano Banana) | **No** | Flat PNG; checkerboard failure mode on transparency prompts. | [Gemini 2.5 Flash Image docs](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image), issue #567 [[20]](https://github.com/google-gemini/generative-ai-python/issues/567) |
| Gemini 3 Pro / Flash Image (Nano Banana Pro / 2) | **No** | Same as above; no capability added in Nov 2025 launch. | [Julien De Luca Medium writeup](https://jidefr.medium.com/generating-transparent-background-images-with-nano-banana-pro-2-1866c88a33c5) (corroborating category 4c) |
| Midjourney v6 / v7 | **No** | No `--transparent` flag; export-time background-remove in the web UI is post-process only. | MJ docs |
| Ideogram v2 / v3 | **No** | No alpha output mode; users rely on external background removers. | Ideogram docs |
| SDXL base, Flux.1-dev/pro base | **No** (without a transparency LoRA + VAE) | RGB-only VAE; any alpha appears after applying a LayerDiffuse / IC-Light-style LoRA, or post-hoc matting. | [[4]](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery) |
| DALL·E 3 | **No** | RGB output only. Deprecated for asset work in favour of `gpt-image-1`. | OpenAI deprecation notes |

The **architectural reason** for the split is uniform: any model that ships with an RGB-only VAE (everyone in the "No" rows) cannot emit alpha unless the pipeline trains or bolts on a transparent-VAE replacement. `gpt-image-1` appears to have a native RGBA-aware generator (OpenAI has not published architectural details, but the first-class `background:"transparent"` parameter and clean output suggest a real alpha plane rather than an integrated background remover). The LayerDiffuse ports are the only open-source models that actually emit real alpha from the decoder.

---

## 4. Matte Math Primer

Even when a model *does* emit alpha, or when we recover it via matting, the math that glues it into a compositor matters. Most "halo" bugs downstream of AI image generation are matte math bugs, not generator bugs.

### 4.1 Straight alpha vs premultiplied alpha

Two ways to store an RGBA pixel:

| Form | Storage | Compositing formula |
|---|---|---|
| **Straight** (a.k.a. unassociated) | `(R, G, B, A)` | `out = src.RGB · src.A + dst.RGB · (1 - src.A)` |
| **Premultiplied** (a.k.a. associated) | `(R·A, G·A, B·A, A)` | `out = src.RGB' + dst.RGB · (1 - src.A)` |

PNG as a **file format** is straight alpha. But most *rendering* libraries (Cairo, Skia, Core Graphics, GPU blenders, After Effects, Playwright/Chrome's compositor) operate internally on premultiplied alpha. The round-trip — render premultiplied → export to PNG's straight alpha → re-import and re-premultiply — is where halos originate. [[21]](https://www.shawnhargreaves.com/blog/premultiplied-alpha-and-image-composition.html) [[22]](https://en.wikipedia.org/wiki/Alpha_compositing)

### 4.2 Why straight alpha creates halos

With straight alpha, semi-transparent pixels store the foreground color *independently* of the alpha. At anti-aliased edges, the stored RGB is whatever color the matting algorithm guessed for that sub-pixel. If the guess is wrong — if a rembg-style mask gave alpha = 0.5 but the RGB underneath still has the white or green background bleeding into it — the compositor does:

```
out = wrong_RGB · 0.5 + dst · 0.5
```

and the wrong_RGB ≠ foreground_RGB pollutes the composite. A white-background cutout on a dark compositor background therefore shows a faint white halo; a chroma-key green-screen cutout shows the infamous 1 px green fringe documented in the De Luca Nano-Banana writeup (category 4c, Example 3 failure mode F3).

With premultiplied alpha, there is no "independent RGB": the storage is *already* the contribution the pixel makes to the composite (`C' = C · A`). Filtering, mipmapping, and blending are mathematically associative, so edges never fringe. This is why every real-time engine (Unity, Unreal, WebGL compositor) demands premultiplied textures. [[21]](https://www.shawnhargreaves.com/blog/premultiplied-alpha-and-image-composition.html) [[23]](https://stackoverflow.com/questions/19674740/opengl-es2-premultiplied-vs-straight-alpha-blending)

### 4.3 The PNG export trap

Chrome's internal compositor works in premultiplied alpha. When Playwright / Puppeteer / Chrome calls `page.screenshot({ omitBackground: true })` to produce a transparent-background PNG, it must **unpremultiply** — divide every RGB by its alpha before writing the straight-alpha PNG file. At very low alpha values (soft glows at 2 %, 5 %, 8 % opacity), integer quantization rounds the quotient wrong or to zero, and the exported PNG loses soft-glow color entirely. Camden B's "1970s Film Math" writeup walks through a real-world case where a soft drop shadow in a transparent video rendered correctly inside the browser but exported as a hard black silhouette because of this unpremultiply rounding. [[24]](https://dev.to/camb/how-i-fixed-transparent-video-alpha-in-playwright-using-1970s-film-math-2j38) [[25]](https://realtimerendering.com/blog/png-srgb-cutoutdecal-aa-problematic)

The industry fix is the same as the LayerDiffuse / category-4c fix: **difference matting against two solid backgrounds**.

### 4.4 Difference matting — exact math

Given a subject rendered against a white background `W_rgb` and the same subject against a black background `B_rgb`:

```
alpha   = 1 - (W - B) / 255                   # per-channel, or ||W - B||_3 / (255·√3)
premul  = B                                   # "contribution on black" IS the premultiplied color
straight_fg = B / max(alpha, ε)               # unpremultiply, guard against alpha → 0
```

Proofs:

- An **opaque** pixel is unaffected by the background, so `W == B`, giving `alpha = 1` and `fg = B`.
- A **fully transparent** pixel takes the background entirely, so `W = 255` and `B = 0`, giving `alpha = 0` and undefined `fg` (correctly ignored because the pixel contributes nothing).
- A **50 % glass** pixel over a fixed RGB `fg` gives `W = 0.5·fg + 0.5·255`, `B = 0.5·fg + 0`, so `W - B = 127.5` → `alpha = 0.5`, and `fg = B / 0.5 = fg` exactly.

The recovered alpha is **mathematically exact for any pixel whose foreground color is background-independent** — which is every pixel that a deterministic generator produces. The only noise source is the generator drifting between the two calls (e.g. Nano Banana producing slightly different anti-aliasing on white vs on black). In practice, using *image editing* on the white result to produce the black result (rather than two independent generations) collapses that drift to near-zero — which is exactly what the `jide/nano-banana-2-transparent` Replicate endpoint does. See category 4c Example 5 for the full prompt pair.

This is also why LayerDiffuse's user study beat naive background-remove matting 97 %: the model's *native* alpha is effectively a learned difference-matte, with the two "views" represented internally rather than requiring two API calls.

### 4.5 Where this lives in the prompt-to-asset

For the product, the practical implications are:

1. If we have any control over the downstream compositor (a web canvas, SwiftUI, Android View, or a native toolkit), we should **produce premultiplied PNGs** and explicitly mark them so (there is no PNG chunk for this, but upstream tooling can track it via file naming or sidecar metadata). This eliminates halos forever.
2. If we must produce straight-alpha PNGs (the PNG spec default, and what every web-downloaded asset is), we must **do the unpremultiply in float, not int**, and clamp (not round) near-zero alpha before division.
3. Any time we route through a non-RGBA model (Gemini, Imagen, MJ, Ideogram, base Flux / SDXL), the prompt-to-asset should **emit a difference-matte plan** — white call + black edit — rather than a single-call prompt, and should do the matte math in float32 before PNG-encoding.
4. Any time we route through a native-RGBA model (`gpt-image-1.*`, LayerDiffuse-Flux, LayerDiffuse-SDXL, Recraft's background-remove path as a fallback), the prompt-to-asset should **treat the model's alpha as authoritative** and skip any post-hoc matting — second-pass matting degrades LayerDiffuse's superior edges.

---

## 5. Takeaways for the Prompt-Enhancer

- The user's "checker-pattern in Gemini" problem is solved architecturally in exactly one public way today — LayerDiffuse's latent-transparency trick — and commercially in exactly one product today — OpenAI's `gpt-image-1.*`. Everything else is post-hoc matting, which the LayerDiffuse user study shows is measurably inferior for anti-aliased edges, hair, glass, and soft shadows.
- If the product wants to stay cloud-hosted and closed-source, the path of least resistance is **route transparency-requiring prompts to `gpt-image-1.5` with `background:"transparent"`**, and route everything else to the user's chosen aesthetic model (Gemini for photoreal, Imagen for text rendering, etc.).
- If the product opens a self-hosted / OSS track, **Flux.1-dev + LayerDiffuse-Flux** is the state of the art for native RGBA in April 2026. Quality exceeds SDXL-LayerDiffuse and matches `gpt-image-1` for design/asset work.
- For every other model family, the prompt-to-asset should **never emit the literal words "transparent background"** into the prompt (triggers the checkerboard failure) and should instead emit a white- or black-background prompt with a downstream difference-matting plan — see category 4c, §3.

---

## References

1. Zhang, L. & Agrawala, M. *Transparent Image Layer Diffusion using Latent Transparency.* arXiv:2402.17113, SIGGRAPH 2024. [arxiv.org/abs/2402.17113](https://arxiv.org/abs/2402.17113)
2. LayerDiffuse project page — [lllyasviel.github.io/pages/layerdiffuse/](https://lllyasviel.github.io/pages/layerdiffuse/)
3. OpenAI — *Image generation guide (gpt-image-1).* [developers.openai.com/api/docs/guides/image-generation?image-generation-model=gpt-image-1](https://developers.openai.com/api/docs/guides/image-generation?image-generation-model=gpt-image-1)
4. Haven Studios — *Adapting Stable Diffusion to Create RGBA Imagery.* [havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery](https://havenstudios.com/en/blog/adapting-stable-diffusion-to-create-rgba-imagery)
5. Hugging Face diffusers — *Issue #6548: prepare_latents mistreats RGBA PIL image as latents.* [github.com/huggingface/diffusers/issues/6548](https://github.com/huggingface/diffusers/issues/6548)
6. Recraft Canny — *PNG with a transparent background (feature request, degraded status).* [recraft.canny.io/feature-requests/p/png-with-a-transparent-background](https://recraft.canny.io/feature-requests/p/png-with-a-transparent-background)
7. Hugging Face diffusers — *Issue #9225: mismatching size of latents with RGBA in SDXL InstructPix2Pix.* [github.com/huggingface/diffusers/issues/9225](https://github.com/huggingface/diffusers/issues/9225)
8. `huchenlei/ComfyUI-layerdiffuse` — ComfyUI custom nodes for LayerDiffuse. [github.com/huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse)
9. BRIA — *Introducing RMBG v2.0* (BiRefNet-based background remover used as post-matting baseline). [blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images)
10. LayerDiffuse reference code — [github.com/layerdiffusion/LayerDiffuse](https://github.com/layerdiffusion/LayerDiffuse)
11. `diffus-me/sd-forge-layerdiffuse` — WebUI Forge SDXL extension. [github.com/diffus-me/sd-forge-layerdiffuse](https://github.com/diffus-me/sd-forge-layerdiffuse)
12. InstaSD — *LayeredDiffusionDecodeRGBA node reference.* [instasd.com/comfyui/custom-nodes/comfyui-layerdiffuse/layereddiffusiondecodergba](https://www.instasd.com/comfyui/custom-nodes/comfyui-layerdiffuse/layereddiffusiondecodergba)
13. ComfyUI Cloud — *Layer Diffuse Decode (RGBA) node.* [comfy.icu/node/LayeredDiffusionDecodeRGBA](https://comfy.icu/node/LayeredDiffusionDecodeRGBA)
14. `RedAIGC/Flux-version-LayerDiffuse` (a.k.a. `FireRedTeam/LayerDiffuse-Flux`) — Flux port with custom `TransparentVAE`. [github.com/RedAIGC/Flux-version-LayerDiffuse](https://github.com/RedAIGC/Flux-version-LayerDiffuse)
15. Huang et al. *LayerDiff: Exploring Text-guided Multi-layered Composable Image Synthesis via Layer-Collaborative Diffusion Model.* arXiv:2403.11929, ECCV 2024. [arxiv.org/abs/2403.11929](https://arxiv.org/abs/2403.11929)
16. Dalva et al. *LayerFusion: Harmonized Multi-Layer Text-to-Image Generation with Generative Priors.* arXiv:2412.04460, under ICLR 2025 review. [arxiv.org/abs/2412.04460](https://arxiv.org/abs/2412.04460)
17. *ART / multi-layer transparent diffusion extension.* arXiv:2505.11468, 2025. [arxiv.org/pdf/2505.11468](https://arxiv.org/pdf/2505.11468)
18. Google Cloud — *Vertex AI Imagen 3 model reference.* [cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate)
19. Google Cloud — *Vertex AI Imagen 4 model reference* (explicit "Transparent background: Not supported"). [cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001](https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001)
20. `google-gemini/generative-ai-python` — *Issue #567: alpha channel dropped at API backend* (internal bug `b/369593779`). [github.com/google-gemini/generative-ai-python/issues/567](https://github.com/google-gemini/generative-ai-python/issues/567)
21. Shawn Hargreaves — *Premultiplied Alpha and Image Composition.* [shawnhargreaves.com/blog/premultiplied-alpha-and-image-composition.html](https://www.shawnhargreaves.com/blog/premultiplied-alpha-and-image-composition.html)
22. Wikipedia — *Alpha compositing.* [en.wikipedia.org/wiki/Alpha_compositing](https://en.wikipedia.org/wiki/Alpha_compositing)
23. StackOverflow — *OpenGL ES2 premultiplied vs straight alpha blending.* [stackoverflow.com/questions/19674740](https://stackoverflow.com/questions/19674740/opengl-es2-premultiplied-vs-straight-alpha-blending)
24. Camden B. — *How I Fixed Transparent Video Alpha in Playwright Using 1970s Film Math.* [dev.to/camb/how-i-fixed-transparent-video-alpha-in-playwright-using-1970s-film-math-2j38](https://dev.to/camb/how-i-fixed-transparent-video-alpha-in-playwright-using-1970s-film-math-2j38)
25. Real-Time Rendering — *PNG + sRGB + cutout/decal AA = problematic.* [realtimerendering.com/blog/png-srgb-cutoutdecal-aa-problematic](https://realtimerendering.com/blog/png-srgb-cutoutdecal-aa-problematic)
