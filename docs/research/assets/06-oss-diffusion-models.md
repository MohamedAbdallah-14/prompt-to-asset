# OSS / Open-Weight Diffusion Models for Self-Hosted Asset Generation

Scope: models suitable for **offline, self-hosted image generation** to back the `prompt-to-asset` asset-type router. Routing requirements:

- **Transparent marks** — need native RGBA / alpha output (no post-hoc matting).
- **Text-in-image** (logos, wordmarks) — accurate glyph rendering.
- **SVG** — no diffusion model outputs SVG natively; vectorization is a separate post-processing step (raster → SVG via `vtracer` / `potrace` / LLM SVG). All diffusion candidates here are raster-only.
- **Photoreal hero art** — high-fidelity 1024+ resolution, strong prompt adherence.

License terms and product statuses below were valid as of **April 2026**; re-verify before shipping because community licenses (especially Stability AI's and BFL's) have shifted multiple times.

---

## 1. Quick verdict per family

| Family | Best candidate for us | Commercial-OK | Why |
|---|---|---|---|
| SD 1.x | SD 1.5 | Yes (Open RAIL-M) | Only for LayerDiffuse / legacy LoRA ecosystem. |
| SDXL | SDXL base 1.0 | Yes (Open RAIL++-M) | LayerDiffuse-SDXL, huge LoRA library, cheap VRAM. |
| SD 3.x | SD 3.5 Large | Yes if revenue < $1M/yr | Strong text, but Community License has revenue cap + Stability AI registration. |
| FLUX.1 | **FLUX.1 [schnell]** | **Yes (Apache-2.0)** | Best fully-open photoreal + text; our default hero model. |
| FLUX.1 | FLUX.1 [dev] | **No** (non-commercial) | Higher fidelity but unusable in production without a BFL license. |
| FLUX.2 | **FLUX.2 [klein] 4B** | **Yes (Apache-2.0)** | Sub-second on 13 GB VRAM, best-in-class text, our new default. |
| FLUX.2 | FLUX.2 [klein] 9B / [dev] | No (non-commercial) | Quality king; API-only or requires BFL enterprise deal. |
| Playground v2.5 | Playground-v2.5-1024 | Yes (Playground Community License) | Best aesthetic SDXL-compatible; weak text. |
| Kolors (Kwai) | Kolors | **No by default** | Requires Kwai approval for commercial use. |
| Kandinsky 3 | Kandinsky 3.0/3.1 | Yes (Apache-2.0) | Nice bilingual (EN/RU) but weaker than FLUX/SDXL. |
| HunyuanDiT | Tencent-Hunyuan/HunyuanDiT | **Yes outside EU** | Tencent Community License excludes EU users. Pass for us. |
| PixArt-Σ | PixArt-alpha/PixArt-Sigma | **Yes (Apache-2.0)** | Efficient 2K DiT, decent fallback. |
| AuraFlow | fal/AuraFlow v0.3 | **Yes (Apache-2.0)** | 6.8B rectified-flow, experimental but liberal license. |
| Stable Cascade (Würstchen) | stabilityai/stable-cascade | **No** (NC community license) | Not usable in production. |
| Text specialists | AnyText, GlyphControl | Apache-2.0 (code) | Niche adjuncts, not base models. |
| Transparent | **LayerDiffuse (SDXL attn-LoRA)** | Depends on base SDXL license (OK) + LoRA (Apache-2.0 fork available) | Only real native-alpha option. |

---

## 2. Per-model cards

### 2.1 Stable Diffusion 1.5 (SD 1.5)

- **HF Hub**: `runwayml/stable-diffusion-v1-5` (primary mirror; original repo has been flaky — community mirrors like `Jiali/stable-diffusion-1.5` and `stablediffusiontutorials/stable-diffusion-v1.5` are widely used).
- **License**: CreativeML **Open RAIL-M** (Aug 22, 2022).
- **Commercial use**: **Yes**, subject to use-based restrictions (no illegal use, no disinformation, etc.); derivatives must propagate those same restrictions.
- **Strengths**: Enormous LoRA/ControlNet/IP-Adapter ecosystem; cheapest to fine-tune; anchor for LayerDiffuse v1 transparent models; runs on 4 GB VRAM.
- **Weaknesses**: 512 px native; **poor text rendering**; weaker photorealism vs. SDXL/FLUX; aging base.
- **VRAM**: 4–6 GB fp16; 2–3 GB int8.
- **Sampler**: `DPM++ 2M Karras` (steps 20–30, CFG 6–8) is the community default; `Euler a` for stylized.
- **Fine-tunes worth noting**: RealisticVision, DreamShaper, epiCRealism, AbyssOrangeMix (anime). All Open RAIL-M derivatives.

### 2.2 SDXL 1.0

- **HF Hub**: `stabilityai/stable-diffusion-xl-base-1.0` (+ `stabilityai/stable-diffusion-xl-refiner-1.0`).
- **License**: CreativeML **Open RAIL++-M** (Jul 26, 2023).
- **Commercial use**: **Yes**, with same use-based restrictions as Open RAIL-M.
- **Strengths**: 1024 px native, best open ecosystem (ControlNet, IP-Adapter, LayerDiffuse-SDXL), strong photoreal.
- **Weaknesses**: Text rendering is OK for 1–3 words, unreliable for longer typography; prompt adherence weaker than FLUX.
- **VRAM**: 10–12 GB comfortable; 6–8 GB with GGUF/NF4; 16 GB+ for base+refiner simultaneously.
- **Sampler**: `DPM++ 2M SDE Karras` or `Euler a`, steps 25–40, CFG 5–7.
- **Fine-tunes worth noting**: Juggernaut XL, RealVisXL, Pony Diffusion XL, DreamShaper XL Lightning, ZavyChromaXL.

### 2.3 Stable Diffusion 3 / 3.5

- **HF Hub**: `stabilityai/stable-diffusion-3-medium`, `stabilityai/stable-diffusion-3.5-medium`, `stabilityai/stable-diffusion-3.5-large`, `-large-turbo`.
- **License**: **Stability AI Community License** (updated Jul 5, 2024). Free non-commercial for everyone. Free commercial **only if entity's annual revenue < USD $1M**; above that, Enterprise License required. Requires a self-report form at stability.ai.
- **Commercial use**: **Conditional** (revenue-gated). For our SaaS, the revenue cap creates a painful cliff; FLUX.1-schnell or FLUX.2-klein are friendlier defaults.
- **Strengths**: MMDiT architecture with separate weights for text vs. image representations → **notably better typography than SDXL**. 3.5 Large fixes anatomy regressions from SD3 Medium.
- **Weaknesses**: License ambiguity + revenue cliff; 3.5 Large is heavy; community ecosystem is thinner than SDXL/FLUX.
- **VRAM**: 3.5 Medium ~12 GB; 3.5 Large ~24 GB fp16, ~16 GB fp8.
- **Sampler**: rectified-flow scheduler (`FlowMatchEulerDiscrete` in Diffusers), 28–40 steps, guidance 3.5–5.
- **Fine-tunes worth noting**: LoRA ecosystem is still small; official `stable-diffusion-3.5-large-turbo` for 4-step generation.

### 2.4 FLUX.1 family (Black Forest Labs)

- **HF Hub**: `black-forest-labs/FLUX.1-schnell`, `black-forest-labs/FLUX.1-dev`, `black-forest-labs/FLUX.1-pro` (API-only).
- **Licenses**:
  - FLUX.1 [schnell] — **Apache-2.0**. Personal, research, **and commercial use permitted**.
  - FLUX.1 [dev] — **FLUX.1-dev Non-Commercial License**. Research / non-production only.
  - FLUX.1 [pro] — closed, BFL API.
- **Commercial use**: **Yes for schnell**, **No for dev**.
- **Strengths**: 12B rectified-flow transformer with double-stream DiT blocks; **state-of-the-art prompt adherence and text rendering among fully-open models**; excellent hands/anatomy.
- **Weaknesses**: VRAM hungry at fp16; schnell is a 1–4 step distillation — slightly lower peak fidelity than dev.
- **VRAM**: fp16 24 GB; fp8 12–16 GB; GGUF Q5 ~10 GB; NF4/Q4 6–8 GB; Nunchaku INT4 4–8 GB with CPU offload.
- **Sampler**: Diffusers `FlowMatchEulerDiscrete`; in ComfyUI, `euler` + `simple` or `beta`, steps 4 (schnell) or 20–30 (dev), guidance 3.5.
- **Fine-tunes worth noting**: `prithivMLmods/Logo-Design-Flux-LoRA` (trigger: "Logo Design"), `XLabs-AI/flux-RealismLora`, `alimama-creative/FLUX.1-Turbo-Alpha`, Civitai LogoMaker1024.

### 2.5 FLUX.2 family (Black Forest Labs)

- **HF Hub**: `black-forest-labs/FLUX.2-klein-4B`, `-klein-base-4B`, `-klein-4b-fp8`, `FLUX.2-klein-9B`, `FLUX.2-klein-9B-KV`, `FLUX.2-klein-9B-base`, `FLUX.2-dev`.
- **Licenses**:
  - FLUX.2 [klein] 4B + 4B Base — **Apache-2.0**.
  - FLUX.2 [klein] 9B / 9B-KV / 9B-base — **Non-Commercial License**.
  - FLUX.2 [dev] — **Non-Commercial License**.
- **Commercial use**: **Yes only for the 4B klein checkpoints.**
- **Strengths**: 4B klein does **sub-second inference on a 3090/4070-class GPU (~13 GB VRAM)**, unified generation+editing, best-in-class text rendering among fully-open models (rivaling DALL·E 3 for UI mockups and wordmarks). Base checkpoint available for fine-tuning.
- **Weaknesses**: Ecosystem still young (LoRAs emerging but sparse vs. FLUX.1); 9B and dev are off-limits without a BFL commercial agreement.
- **VRAM**: klein 4B ~13 GB bf16, ~8 GB fp8; dev ≥24 GB.
- **Sampler**: `FlowMatchEulerDiscrete`, 4–8 steps for klein (distilled), 25–30 for dev; guidance 3.5.
- **Fine-tunes worth noting**: WaveSpeedAI FLUX.2-dev text-to-image LoRA (non-commercial base); community klein LoRAs for logos are appearing on Civitai.

### 2.6 Playground v2.5

- **HF Hub**: `playgroundai/playground-v2.5-1024px-aesthetic`.
- **License**: **Playground v2.5 Community License** — royalty-free, non-exclusive, grants research and commercial use, including derivatives and redistribution.
- **Commercial use**: **Yes**.
- **Strengths**: Tops user-preference studies vs. SDXL, Playground v2, PixArt-α, DALL·E 3, Midjourney 5.2 at launch; same arch as SDXL so it plugs into existing pipelines (OpenCLIP-ViT/G + CLIP-ViT/L encoders); strong color/contrast and aspect-ratio handling.
- **Weaknesses**: Aesthetic-leaning rather than literal; **text rendering is no better than SDXL**; no native alpha.
- **VRAM**: ~10–12 GB (same class as SDXL).
- **Sampler**: `EDMDPMSolverMultistep` is their recommendation; `DPM++ 2M Karras` works well in Diffusers, steps 25–35, guidance 3.

### 2.7 Kolors (Kuaishou / Kwai)

- **HF Hub**: `Kwai-Kolors/Kolors`.
- **License**: Code Apache-2.0; **weights under a custom Kolors license**. Fully open for academic research; commercial use **requires application and approval** from `kwai-kolors@kuaishou.com`. Restrictions on using outputs to train competing models; attribution required.
- **Commercial use**: **No by default** — assume blocked unless we negotiate.
- **Strengths**: Excellent Chinese-native prompt understanding, strong photoreal; integrated into Diffusers.
- **Weaknesses**: Licensing friction rules it out for our router.

### 2.8 Kandinsky 3

- **HF Hub**: `ai-forever/Kandinsky3.0`, `ai-forever/Kandinsky3.1`.
- **License**: **Apache-2.0**.
- **Commercial use**: **Yes**.
- **Strengths**: Bilingual (English and Russian) prompts, permissive license, ControlNet variants.
- **Weaknesses**: Quality below SDXL / FLUX on English prompts; LoRA ecosystem is thin; no native alpha.
- **VRAM**: ~16 GB fp16 for 1024 px.
- **Sampler**: `FlowMatchEulerDiscrete` (3.1) / standard DDIM/DPM++ (3.0), 25–30 steps.

### 2.9 HunyuanDiT (Tencent)

- **HF Hub**: `Tencent-Hunyuan/HunyuanDiT`.
- **License**: **Tencent Hunyuan Community License**. Royalty-free but **territory excludes the EU**. Broad "Model Derivative" definition covers distillation and transfer learning; outputs themselves are not considered derivatives. Acceptable Use Policy applies.
- **Commercial use**: **Conditional** — only if we never serve EU users, which makes it a non-starter for a SaaS.
- **Strengths**: Strong bilingual (EN/CN) DiT, competitive 1024 px quality, ControlNet available.
- **Weaknesses**: EU carve-out, which is the hard blocker for us.

### 2.10 PixArt-Σ (Sigma)

- **HF Hub**: `PixArt-alpha/PixArt-Sigma` (and 256/512/1024/2K variants).
- **License**: **Apache-2.0** (on GitHub and model card).
- **Commercial use**: **Yes**.
- **Strengths**: Efficient DiT, **native 2K generation**, lightweight (~0.6B parameters) → low VRAM, strong prompt adherence via T5-XXL text encoder.
- **Weaknesses**: Below SDXL/FLUX for photoreal detail and hands; text rendering average; smaller community than SDXL.
- **VRAM**: 8–10 GB at 1024 px, 14–16 GB at 2K.
- **Sampler**: `DPM-Solver++` (default in their repo), 14–20 steps, CFG 4.5.

### 2.11 AuraFlow v0.3

- **HF Hub**: `fal/AuraFlow` (v0.3).
- **License**: **Apache-2.0**.
- **Commercial use**: **Yes**.
- **Strengths**: 6.8B parameter rectified-flow transformer; strong GenEval (~0.7); fully open; Diffusers support.
- **Weaknesses**: Beta-quality; aesthetic output can be flat vs. FLUX; small LoRA ecosystem; text rendering not a strong point.
- **VRAM**: ~16 GB fp16, ~9 GB fp8.
- **Sampler**: flow-matching Euler, 25–35 steps, guidance 3.5–5.

### 2.12 Stable Cascade (Würstchen v3)

- **HF Hub**: `stabilityai/stable-cascade`.
- **License**: **`stable-cascade-nc-community`** — non-commercial. Stage code on GitHub is MIT, but model weights disallow any production or hosted-service use.
- **Commercial use**: **No**.
- **Strengths**: 42× latent compression (1024² encodes to 24×24) → very fast, low-VRAM 1024 px generation; high aesthetic quality.
- **Weaknesses**: License kills it for us. Mostly interesting as a research datapoint.

### 2.13 Text-in-image specialists

- **AnyText** (ArXiv 2311.03054, code on ModelScope; Diffusers integration under discussion in `huggingface/diffusers#6407`).
  - Multilingual visual text generation + editing. Uses auxiliary latent module (glyph + position + masked-image) plus OCR-based stroke encoder and a text perceptual loss.
  - License: Apache-2.0 on code; weights distributed via ModelScope — re-verify weight terms.
  - Role for us: **wordmark specialist** layered on top of an SDXL/FLUX base via their pipeline.

- **GlyphControl** (`AIGText/GlyphControl-release`, NeurIPS 2023, ArXiv 2305.18259).
  - ControlNet-style conditioning on rendered glyph images to steer SD1.5/2.1 toward readable text. Outperforms DeepFloyd IF in OCR accuracy with ~3× fewer parameters.
  - License: Apache-2.0 on code; weights released on Hugging Face.
  - Role for us: **cheap guardrail for SD-1.x logo work**; less relevant now that FLUX.2-klein handles text natively.

- **DeepFloyd IF** (worth mentioning even though it's not in the target list): strong text, but non-commercial research license → skip.

### 2.14 LayerDiffuse (native transparent)

- **Paper**: `Transparent Image Layer Diffusion using Latent Transparency` (ArXiv 2402.17113, Zhang & Agrawala).
- **Upstream**: `lllyasviel/LayerDiffuse` on GitHub.
- **SDXL HF forks** (what we actually use):
  - `Geeknasty/LayerDiffusion-SDXL-Attn-Diff` — converted diff-patch version of `layer_xl_transparent_attn`, works with ComfyUI's `LayeredDiffusionApply`; CreativeML Open RAIL-M.
  - `gxkok/layer-diffusion-xl-transparent-attn-lora` — LoRA weights for use with Diffusers' `StableDiffusionXLPipeline`; **Apache-2.0**.
  - `jnkl314/diffusers_LayerDiffuse` (GitHub) — provides `StableDiffusionXLLayerDiffusePipeline` that auto-loads the rank-256 LoRA + transparent VAE decoder.
- **Commercial use**: Apache-2.0 LoRA fork + SDXL base (Open RAIL++-M) gives a clean commercial path; double-check the transparent VAE decoder weights (released by the original authors) against their LICENSE before shipping.
- **Strengths**: **Only real option for native RGBA output.** 97% human preference vs. generate-then-matte in the original paper; quality described as comparable to Adobe Stock assets. Single-pass RGBA, no background-removal step.
- **Weaknesses**: Ties us to SDXL-class quality (or SD1.5 for legacy `layer_sd15_transparent_attn`); no FLUX port as of April 2026; fine-grained alpha on thin features (hair, glass, smoke) is hit-or-miss.
- **VRAM**: SDXL + LayerDiffuse LoRA ≈ 11–13 GB fp16.
- **Sampler**: Inherits SDXL — `DPM++ 2M Karras` or `Euler a`, 25–35 steps, CFG 5–7.

---

## 3. Recommended routing for `prompt-to-asset`

| Asset type | Primary | Fallback | Rationale |
|---|---|---|---|
| Transparent mark (RGBA) | **SDXL + LayerDiffuse (Apache-2.0 LoRA fork)** | SDXL + post-hoc matting (`RMBG-2.0` or `BiRefNet`) | Only native-alpha path; fallback preserves coverage when LayerDiffuse struggles on thin edges. |
| Text-in-image / wordmark | **FLUX.2 [klein] 4B** (Apache-2.0) | FLUX.1 [schnell] + Logo-Design-Flux-LoRA; AnyText on SD for non-Latin scripts | klein 4B has the best open-weights typography and fits on a 13 GB GPU. |
| Photoreal hero | **FLUX.1 [schnell]** (Apache-2.0) at fp8 | SDXL (Juggernaut XL / RealVisXL) for lower-VRAM nodes; PixArt-Σ as an Apache-only fallback | FLUX.1 schnell has the best realism under a truly open license; SDXL covers 8 GB tier; PixArt-Σ covers 2K. |
| SVG / vector | **Any raster model → vectorize** with `vtracer` / `potrace` (logos) or LLM-to-SVG (diagrams) | n/a | No diffusion model outputs SVG; vectorization is the contract. |

**Licenses to avoid shipping on** (unless we negotiate separately): FLUX.1-dev, FLUX.2-dev, FLUX.2-klein-9B, Stable Cascade, HunyuanDiT (EU users), Kolors, and any SD-3.5 deployment once revenue crosses $1M/yr.

---

## 4. Sampler & VRAM summary (operational cheat-sheet)

| Model | VRAM (fp16) | VRAM (fp8/NF4) | Sampler (Diffusers) | Steps | Guidance |
|---|---|---|---|---|---|
| SD 1.5 | 4–6 GB | 2–3 GB | `DPMSolverMultistep` (Karras) | 20–30 | 6–8 |
| SDXL base+refiner | 16 GB | 8 GB | `DPM++ 2M SDE Karras` | 25–40 | 5–7 |
| SD 3.5 Large | 24 GB | 16 GB | `FlowMatchEulerDiscrete` | 28–40 | 3.5–5 |
| FLUX.1 schnell | 24 GB | 6–10 GB | `FlowMatchEulerDiscrete` | 1–4 | 0 (distilled) |
| FLUX.1 dev | 24 GB | 12–16 GB | `FlowMatchEulerDiscrete` | 20–30 | 3.5 |
| FLUX.2 klein 4B | 13 GB | 8 GB | `FlowMatchEulerDiscrete` | 4–8 | 3.5 |
| Playground v2.5 | 12 GB | — | `EDMDPMSolverMultistep` | 25–35 | 3 |
| PixArt-Σ | 8–10 GB | — | `DPMSolverMultistep` | 14–20 | 4.5 |
| AuraFlow v0.3 | 16 GB | 9 GB | `FlowMatchEulerDiscrete` | 25–35 | 3.5–5 |
| Kandinsky 3.1 | 16 GB | — | `FlowMatchEulerDiscrete` | 25–30 | 4 |
| SDXL + LayerDiffuse | 11–13 GB | 7 GB | `DPM++ 2M Karras` | 25–35 | 5–7 |

---

## 5. Open questions to validate before implementation

1. **LayerDiffuse transparent VAE weights** — license text on the decoder vs. the LoRA? The Apache-2.0 LoRA fork is clear; the accompanying VAE decoder may inherit different terms.
2. **FLUX.2-klein 4B** content-safety behavior and allowed use — the Apache-2.0 release appears unrestricted, but BFL's model card may carry additional AUP language; confirm before production.
3. **SD 3.5 Community License** self-reporting — do we need to register now even at $0 revenue to maintain good standing? (Stability says yes; cheap to do.)
4. **Tencent Hunyuan EU exclusion** — worth a legal read; HunyuanDiT has a nice ControlNet stack but the EU carve-out likely disqualifies it for our SaaS.
5. **Kolors commercial application** — low priority, but if photoreal + Chinese prompts become a product need we can revisit the questionnaire path.

---

## Sources

- FLUX.1 [schnell] license — `huggingface.co/black-forest-labs/FLUX.1-schnell` (Apache-2.0).
- FLUX.1 [dev] license — `huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/LICENSE.md` (BFL Non-Commercial).
- FLUX.2 family matrix — `github.com/black-forest-labs/flux2` (Apache-2.0 for klein 4B; NC for 9B / dev); `huggingface.co/black-forest-labs/FLUX.2-klein-4B` README.
- Stability AI Community License — `stability.ai/news/license-update` (July 5, 2024 update, $1M revenue cap).
- SD 3.5 Medium/Large license — `huggingface.co/stabilityai/stable-diffusion-3.5-medium/blob/main/LICENSE.md`.
- Stable Cascade NC license — `huggingface.co/stabilityai/stable-cascade/blob/main/LICENSE`.
- SDXL Open RAIL++-M — `huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md`.
- SD 1.5 Open RAIL-M — `huggingface.co/runwayml/stable-diffusion-v1-5`.
- Playground v2.5 license — `huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic/blob/main/LICENSE.md`.
- Kolors weights license — `huggingface.co/Kwai-Kolors/Kolors/blob/main/MODEL_LICENSE`.
- Kandinsky 3 Apache-2.0 — `github.com/ai-forever/Kandinsky-3/blob/main/LICENSE`.
- HunyuanDiT Community License (EU exclusion) — `huggingface.co/Tencent-Hunyuan/HunyuanDiT/blob/main/LICENSE.txt`.
- PixArt-Σ Apache-2.0 — `github.com/PixArt-alpha/PixArt-sigma/blob/master/LICENSE`.
- AuraFlow Apache-2.0 — `huggingface.co/fal/AuraFlow/blob/main/LICENSE`; `fal.ai/models/fal-ai/aura-flow`.
- LayerDiffuse paper — arXiv 2402.17113; `lllyasviel/LayerDiffuse`; `Geeknasty/LayerDiffusion-SDXL-Attn-Diff`; `gxkok/layer-diffusion-xl-transparent-attn-lora`; `jnkl314/diffusers_LayerDiffuse`.
- AnyText — arXiv 2311.03054; integration tracker `huggingface/diffusers#6407`.
- GlyphControl — arXiv 2305.18259; `AIGText/GlyphControl-release`.
- FLUX sampler/VRAM guidance — `comfyui.dev/docs/guides/Other Resources/sampler-and-scheduler-compatibility-matrix/`; `insiderllm.com/guides/flux-locally-complete-guide/`.
- FLUX logo LoRAs — `huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA`; `civitai.com/models/757432/logomaker1024`.
