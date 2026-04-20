---
wave: 1
role: niche-discovery
slug: 01-logo-brand-loras
title: "OSS LoRAs & fine-tunes for logo/brand/icon generation"
date: 2026-04-19
sources:
  - https://civitai.com/models/124609
  - https://huggingface.co/artificialguybr/LogoRedmond-LogoLoraForSDXL
  - https://huggingface.co/artificialguybr/LogoRedmond-LogoLoraForSDXL-V2
  - https://civitai.com/models/436281/logo-maker-9000-sdxl-concept
  - https://civitai.com/models/60132
  - https://civitai.com/models/449818/minimalist-flat-icons-xl
  - https://huggingface.co/ReservedNoName/sdxl-simple-icons-lora
  - https://civitai.com/models/358538
  - https://tensorart.me/models/734213535556447296
  - https://civitai.com/models/149101/app-icons-sdxl
  - https://civitai.com/models/151008/isometric-style-xl
  - https://civitai.com/models/118775/stylized-setting-isometric-sdxl-and-sd15
  - https://civitai.com/models/134955/line-art-flat-colors-sdxl
  - https://civitai.com/models/261433/line-art-sdxl
  - https://civitai.com/models/50944/logogotypes
  - https://civitai.com/models/241153
  - https://civitai.com/models/99284
  - https://civitai.com/models/76413/stickers-lora
  - https://huggingface.co/Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design
  - https://huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA
  - https://civitai.com/models/757432/logomaker1024-classic-and-cartoon-logotypes-or-flux1-d-lora
  - https://huggingface.co/strangerzonehf/Flux-Icon-Kit-LoRA
  - https://huggingface.co/strangerzonehf/Flux-Ultimate-LoRA-Collection
  - https://huggingface.co/EEEric/3d-icon-Flux-LoRA
  - https://huggingface.co/derekl35/3dicon-qlora-flux
  - https://huggingface.co/Sologo-AI/Monochrome-line-logo
  - https://huggingface.co/logologolab/cute_playful_logo_lora
  - https://civitai.com/models/817337/vintage-logo-design-flux
  - https://civitai.com/models/715975/cute-logo-maker-psiclones-artforge-masterkit
  - https://civitai.com/models/720442/isometrica
  - https://civitai.com/models/791384/isometric
  - https://civitai.com/models/479363/sports-mascots
  - https://civitai.com/models/899403/smug-wendy-the-wendys-mascot
  - https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev
  - https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell
  - https://github.com/bmaltais/kohya_ss
  - https://github.com/kohya-ss/sd-scripts
  - https://github.com/ostris/ai-toolkit
  - https://neurocanvas.net/blog/ai-toolkit-vs-onetrainer-zimage-guide/
  - https://education.civitai.com/guide-to-licensing-options-on-civitai/
  - https://apatero.com/blog/flux-lora-training-comfyui-complete-guide-2025
  - https://kgabeci.medium.com/best-lora-training-settings-for-flux-in-2026-14bf0c786bdf
tags: [lora, fine-tune, logo, brand, sdxl, flux]
---

# OSS LoRAs & fine-tunes for logo/brand/icon generation

**Research value: high** — dozens of usable LoRAs exist across SDXL and Flux for every sub-niche (flat, isometric, app icon, line art, emblem, mascot, sticker), but the license picture is messy, the quality is uneven, and almost nothing is curated for production bundling. This digest names 25+ concrete artifacts, flags the traps, and recommends a safe bundle.

Category-20 covered the *pipeline* layer (ComfyUI, rewriters, wrappers, MCPs). This niche is the **weights layer immediately underneath**: the small adapters that turn a general-purpose SDXL or Flux checkpoint into something that actually draws a logo. Without a style LoRA, SDXL reliably outputs "stock-photo-of-a-sign-that-says-TEXT" and Flux outputs a photorealistic 3D mockup of a logo on a physical surface. LoRAs are the cheap fix.

## The license landscape (read before bundling)

Two license facts dominate every decision:

1. **FLUX.1 [dev] is non-commercial.** The base weights ship under the `flux-1-dev-non-commercial-license` v1.1.1 / v2.0 ([LICENSE-FLUX1-dev](https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-dev), [BFL legal](https://bfl.ai/legal/non-commercial-license-terms)). Every LoRA trained on top inherits that restriction at inference time, regardless of the adapter's own license tag. Outputs are *not* restricted derivatives, but serving the combined model to paying end users is prohibited.
2. **FLUX.1 [schnell] is Apache 2.0** ([LICENSE-FLUX1-schnell](https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell)). Safe to host commercially. Most Flux LoRAs trained for [dev] work on [schnell] with degraded but usable quality; a smaller but growing set is trained explicitly on [schnell].
3. **SDXL 1.0 is CreativeML OpenRAIL++-M** — permissive for commercial inference with OpenRAIL use-restrictions.
4. **Civitai per-model toggles** ([Civitai Education — licensing](https://education.civitai.com/guide-to-licensing-options-on-civitai/)): creators tick "Sell images / Sell model / Use on generation services" boxes. The page's license badge is the source of truth; the base-model license does not override it. A permissively based LoRA can still be non-commercial if the uploader chose that.

Practical rule for a commercial bundle: **SDXL LoRAs with OpenRAIL-M or "allow commercial" toggled on** are the low-risk default; **Flux [schnell]-compatible LoRAs** are the second tier; **Flux [dev] LoRAs** are acceptable only for self-serve / personal-tier pipelines.

## Flux LoRAs for logos and brand marks

- **Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design** — trigger `wablogo, logo, Minimalist`, scale 0.8, 38.4 MB. License: flux-1-dev-non-commercial (inherits base). Supports "dual element" composition (e.g. cat + coffee), font + shape combinations, text-below-graphic layouts. Strongest general-purpose minimalist Flux logo LoRA ([HF](https://huggingface.co/Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design)).
- **prithivMLmods/Logo-Design-Flux-LoRA** — trigger `Logo Design`, 14 training images, network dim 64 / alpha 32, 2.2k steps. ~787 downloads/month. License tag `creativeml-openrail-m` on the adapter but inherits Flux [dev] non-commercial on the stack ([HF](https://huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA)).
- **strangerzonehf/Flux-Icon-Kit-LoRA** — trigger `Icon Kit`, 40 training images, 3.1k steps, rank 64, 613 MB. 56 likes, used by 45 HF Spaces, part of the 100-adapter **Flux-Ultimate-LoRA-Collection** (2,076 downloads/month on the bundle) that also ships `Logo-design.safetensors`, `Isometric-3D.safetensors`, `Typography.safetensors`, `Simple_Doodle.safetensors`, `Mockup-Texture.safetensors` — the single most useful bulk adapter pack for brand work on Flux ([HF Collection](https://huggingface.co/strangerzonehf/Flux-Ultimate-LoRA-Collection)). License: creativeml-openrail-m.
- **LogoMaker1024: Classic & Cartoon Logotypes** (Civitai 757432) — trigger `Company logo by LogoMaker1024`; trained on mid-2000s logos upscaled to 1024. Negative strength (-1) produces simpler/cartoonish variants. Flux.1 [D].
- **Vintage Logo Design - Flux V1** (Civitai 817337) — 10 epochs, 2,250 steps, strength 0.8. Badge/emblem/crest-adjacent; closest thing to a "1970s rounded sans" emblem LoRA on Flux.
- **Cute Logo Maker — PsiClone ArtForge MasterKit** (Civitai 715975) — playful, rounded, food/fashion/lifestyle/pet-care brand voice.
- **logologolab/cute_playful_logo_lora** (HF) — trigger `cute playful logo, colorful cartoon mascot, rounded sans-serif font, cheerful design`. Flux DreamBooth LoRA.
- **EEEric/3d-icon-Flux-LoRA** — pivotal-tuning DreamBooth on Flux [dev], 3D glossy-icon output (iOS-style), 185 downloads ([HF](https://huggingface.co/EEEric/3d-icon-Flux-LoRA)).
- **derekl35/3dicon-qlora-flux** — QLoRA for the same 3D-icon style, smaller and faster to load ([HF](https://huggingface.co/derekl35/3dicon-qlora-flux)).
- **multimodalart/isometric-skeumorphic-3d-bnb** — trigger `RBNBICN, icon, white background, isometric perspective`. The single best match for skeuomorphic isometric app icons on Flux.
- **Isometrica** (Civitai 720442) and **Isometric - Flux v1.0** (Civitai 791384) — both trigger `isometric`, strength 0.4–0.75, aimed at isometric scenes/buildings but useful for isometric logo backgrounds.
- **Sports Mascots - Flux1-Dev** (Civitai 479363) — trigger `a photo of a mascot` / `in the style of sport-mascot`. The reference for brand-mascot character work on Flux.

## SDXL LoRAs (the safest commercial tier)

- **Logo.Redmond v1 / v2** (artificialguybr, [Civitai 124609](https://civitai.com/models/124609) · [HF v2](https://huggingface.co/artificialguybr/LogoRedmond-LogoLoraForSDXL-V2)) — trigger `LogoRedAF` / `logo`; **license: CreativeML OpenRAIL-M** on HF, "allow commercial" on Civitai. 171 MB v2. This is the closest thing to a community default and the single safest choice for commercial bundling. A **Z-Image Turbo** retrained version also exists on Civitai.
- **Logo Maker 9000 SDXL** ([Civitai 436281](https://civitai.com/models/436281)) — trigger `logo of a {business type} vector logomkrdsxl`, strength 0.8–1.0, ~200 curated vector training images, 539 "Overwhelmingly Positive" ratings.
- **Vector Illustration — SDXL** ([Civitai 60132](https://civitai.com/models/60132)) — trigger `color icon`, weight 0.65–0.9. The go-to for flat-vector icon sets on SDXL.
- **Minimalist Flat Icons XL** ([Civitai 449818](https://civitai.com/models/449818)) — trigger `MINIMALIST ICON, FLATXL`, Clip Skip 1, ~2.7k downloads, 286 positive ratings.
- **ReservedNoName/sdxl-simple-icons-lora** (HF) — trained on 187 Simple Icons brand marks; trigger `single color, flat design, geometric shape, minimalist tech logo`. Purpose-built for software/tech logos.
- **flat_sdxl** ([Civitai 358538](https://civitai.com/models/358538)) — 13k+ downloads, 334k views; flattens shading. Negative strength enhances detail, useful as a style modulator paired with a logo LoRA.
- **Minimalist Badge Emblem — SDXL** (TensorArt 734213535556447296) — trigger `minimalistB, minimalistbadge, stickerbadge, classicminimalist`. The emblem/badge gap-filler for SDXL.
- **APP ICONS — SDXL** ([Civitai 149101](https://civitai.com/models/149101)) — trigger `In the style of TOK` / `App Icon`, 1,000 training steps, 470 positive reviews. Available as a Replicate endpoint (`fofr/sdxl-emoji` is the adjacent Apple-emoji-trained checkpoint).
- **Isometric Style XL** ([Civitai 151008](https://civitai.com/models/151008)) and **Stylized Setting — Isometric SDXL & SD1.5** (Civitai 118775, 977 reviews) — the two reference isometric SDXL LoRAs.
- **Line Art + Flat Colors SDXL** ([Civitai 134955](https://civitai.com/models/134955)) — trigger `lineart, line art, flat colors, flat color`, weight 1.0–2.0. Best general line-art LoRA; pairs with ControlNet lineart for logo generation with text outlines.
- **Line Art SDXL — ais-lineart** ([Civitai 261433](https://civitai.com/models/261433)) — color and background variants (`red ais-lineart`, `black background`).
- **Sologo-AI/Monochrome-line-logo** (HF) — trigger `line-flat-logo, monochrome`, weight 0.6–0.8. The only explicitly-named "monochrome line logo" LoRA and a strong candidate for badge/emblem outlines.
- **Art Deco Vintage Future** ([Civitai 598188](https://civitai.com/models/598188)) — cross-trained for SDXL / Pony / Flux; trigger `ArsMJStyle, ArtDecoVintageFuture`, strength 0.3–0.8. Emblem-adjacent.

## SD 1.5 (legacy but fast)

- **Logogotypes v1.0** (Civitai 50944) — SD 2.1 768, triggers `logogotypes, logo, vector-art`. Recommended with the Vectorstudio webui extension for SVG export.
- **logo||Design v2.0** ([Civitai 241153](https://civitai.com/models/241153)) — SD 1.5 logo LoRA still actively used for speed-critical generation.
- **CivitAI Mascot / Logo generator (Civet)** ([Civitai 99284](https://civitai.com/models/99284)) — SD 1.5 mascot+logo LoRA; the author explicitly recommends combining with a ControlNet lineart conditioning.
- **Stickers [LORA]** ([Civitai 76413](https://civitai.com/models/76413)) — trigger `Sticker, cute cartoon of`. Biased toward animal stickers, useful for brand-sticker packs.

## Training your own logo LoRA

Community consensus (synthesized from [kohya_ss docs](https://github.com/bmaltais/kohya_ss), [Apatero Flux guide 2025](https://apatero.com/blog/flux-lora-training-comfyui-complete-guide-2025), and [Gabeci's 2026 Flux settings post](https://kgabeci.medium.com/best-lora-training-settings-for-flux-in-2026-14bf0c786bdf)):

- **Dataset size.** Concept/subject LoRA: 5–25 images. Style LoRA: 20–100 images; logos sit at 20–40 curated marks of the target visual language. For Flux, quality >> quantity: 10–20 excellent 1024² images routinely beats 100 mediocre ones.
- **Resolution.** 1024×1024 is the target; SDXL tolerates mixed buckets (768, 1024), Flux strongly prefers full 1024.
- **Captioning.** SDXL: WD14 tags or BLIP, plus a unique trigger word. Flux: **natural-language captions** (Flux was trained on captions, not tags); one rare trigger token + a short descriptive sentence. Tag-salad hurts Flux more than it hurts SDXL.
- **Rank / alpha.** Styles: rank 32, alpha 16–32. Characters/subjects: rank 64, alpha 32. Detail-heavy styles: rank 64–128. For a logo style LoRA, **rank 32 / alpha 16 is the sweet spot**; rank 64 only if the mark has fine-line detail.
- **Repeats & epochs.** SDXL: ~10 repeats × 10 epochs for 20 images → ~2k steps total. Flux: ~2k–3k steps total regardless of schedule; `strangerzonehf/Flux-Icon-Kit-LoRA` used 20 epochs × 25 repeats on 40 images = 3.1k steps, which is a good upper bound.
- **Optimizer / LR.** SDXL: AdamW8bit @ 1e-4 (UNet), 5e-5 (text encoder). Flux: AdamW8bit @ 1e-4 with gradient checkpointing; Prodigy_Adv on OneTrainer is faster-converging.
- **Precision.** bf16 mixed precision on both.

## Tooling

- **kohya-ss/sd-scripts** ([GitHub](https://github.com/kohya-ss/sd-scripts)) — the canonical training backend. Supports SDXL, SD 1.5, SD 3.5, Flux ([DeepWiki — FLUX LoRA](https://deepwiki.com/kohya-ss/sd-scripts/6.3-flux-lora-training)). Command-line; `.toml` dataset configs.
- **bmaltais/kohya_ss** ([GitHub](https://github.com/bmaltais/kohya_ss)) — GUI on top of sd-scripts. Built-in WD14/BLIP captioners. Most production teams use this.
- **ostris/ai-toolkit** ([GitHub](https://github.com/ostris/ai-toolkit), [24GB config example](https://github.com/ostris/ai-toolkit/blob/main/config/examples/train_lora_flux_24gb.yaml)) — cleanest Flux-first trainer. Web UI at `localhost:8675`, YAML configs, MIT licensed. Best for beginners and for repeatable Flux LoRA factory pipelines (job queue is the killer feature).
- **OneTrainer** ([neurocanvas 2026 comparison](https://neurocanvas.net/blog/ai-toolkit-vs-onetrainer-zimage-guide/)) — **1.4–2× faster** than AI-Toolkit on the same hardware via `torch.compile` + int8 quantized training; exposes Prodigy_Adv and stochastic rounding; VRAM-tier presets. Best for operators who run many experiments.

Rough decision tree: **beginner or Flux-only → ai-toolkit; production SDXL + Flux + multi-model → kohya_ss; max throughput → OneTrainer; custom research → sd-scripts directly.**

## Integration recommendations

If you are bundling or first-class-recommending LoRAs from this product, ship these five. They are license-clean, well-rated, and cover the logo/icon space without overlap:

1. **Logo.Redmond v2** (SDXL, OpenRAIL-M, commercial OK) — the safe, versatile default for "make me a logo" with any base SDXL checkpoint. Ship it as the zero-configuration option.
2. **Minimalist Flat Icons XL** (SDXL, Civitai-commercial-OK) — covers the modern flat/vector brand-mark aesthetic that Logo.Redmond under-serves.
3. **Line Art + Flat Colors SDXL** (SDXL) — pairs with ControlNet lineart to do text-based / monogram / single-glyph logos deterministically. The right tool for "turn this wordmark into a vector-ready logo".
4. **APP ICONS — SDXL** (SDXL) — specialty adapter for iOS/Android app icons; feeds directly into the `resize_icon_set` tool chain (`npm-icon-gen`, `pwa-asset-generator`, `capacitor-assets`) that category 20 already named.
5. **strangerzonehf/Flux-Icon-Kit-LoRA** + **multimodalart/isometric-skeumorphic-3d-bnb** (Flux [dev], non-commercial tier) — reserve for the self-serve / personal tier where the Flux [dev] license is acceptable. These two together deliver the "3D isometric app icon" style that SDXL cannot match.

Explicitly avoid bundling Flux [dev] LoRAs into a commercial hosted endpoint until you either (a) license Flux [dev] commercially from BFL, (b) retrain the adapters on Flux [schnell] (Apache 2.0), or (c) route "premium" asset requests to a paid API (fal, Replicate, Together FLUX.2) that carries its own commercial grant. This is the single most important decision this niche forces on the product.
