---
category: 02-image-generation-models
angle: 2e
title: Imagen 1/2/3/4 Technical Reports & Gemini 2.5 Flash Image ("Nano Banana") Model Specs
date: 2026-04-19
research_value: high
primary_sources: 17
scope: >
  Google's image generation stack — Imagen 1 (2022), Imagen 2 (2023), Imagen 3
  (2024), Imagen 4 family (2025), Gemini 2.5 Flash Image / "Nano Banana" (Aug
  2025), and Nano Banana Pro / Gemini 3 Pro Image (Nov 2025). Covers technical
  architecture, capability matrices, Vertex AI surface, benchmarks, and
  policy / safety constraints relevant to commercial asset use.
---

# 2e — Imagen 2/3/4 Google technical reports & model specs

**Research value: high** — Google's image-gen family is one of the best-documented in the market. Between the Imagen 3 arXiv tech report, the Gemini 2.5 Flash model card PDF, and the Vertex AI model docs, we have near-complete specs, architectures, and policy constraints from primary sources, with minimal need for third-party interpretation.

## 1. The two stacks inside Google

Google ships image generation through **two architecturally distinct families**, and a prompt-to-asset needs to know which is which because their input/output shapes, editing semantics, and policy envelopes differ materially:

| Family | Architecture | Lineage | Primary strengths | Primary weakness |
|---|---|---|---|---|
| **Imagen** | Latent diffusion, text-conditioned | Imagen 1 → 2 → 3 → 4 | Photorealism, prompt adherence, text-in-image rendering (from Imagen 3), highest-resolution output (up to 2816×1536 on Imagen 4 Ultra) | Text-only input — no conversational editing, no reference images on pure `generate` SKUs. |
| **Gemini Native Image** ("Nano Banana") | Sparse Mixture-of-Experts multimodal transformer that emits image tokens interleaved with text tokens | Gemini 2.0 Flash Image (2025) → Gemini 2.5 Flash Image (Aug 2025, "Nano Banana") → Gemini 3 Pro Image (Nov 2025, "Nano Banana Pro") | Multi-image fusion, character/style consistency, natural-language editing, world knowledge grounding, Google Search integration (Pro) | Lower raw resolution ceiling than Imagen 4 Ultra unless you escalate to Nano Banana Pro (which unlocks 2K/4K). |

Source: Imagen 3 report [§1 "Introduction"][imagen3-arxiv]; Gemini 2.5 Flash model card [§ Architecture][gemini25-card]; Vertex AI Gemini 2.5 Flash Image docs [§ "Image generation specifications"][vertex-2.5-flash-image]; DeepMind Nano Banana Pro announcement [¶ "Built on Gemini 3 Pro"][nanobanana-pro].

## 2. Imagen 1 (2022) — the baseline architecture

The original Imagen paper (Saharia et al., NeurIPS 2022) established the architectural ancestor that Imagen 2/3/4 still evolve:

- **Text encoder.** Frozen **T5-XXL**, not a CLIP text encoder. This choice is the paper's headline finding: scaling the *language* model beats scaling the *diffusion* model for fidelity and text-image alignment.
- **Pixel-space cascade.** A 64×64 base diffusion model, then two super-resolution diffusion models lifting to 256×256 and then 1024×1024.
- **Benchmark.** State-of-the-art zero-shot FID of **7.27 on COCO** without training on COCO. Introduced **DrawBench** as a human-eval benchmark (still cited in Imagen 3 evals in 2024). [imagen1-arxiv]

Imagen 1 was **never productized** — the paper explicitly declined to release due to dataset and bias concerns. The production line starts with Imagen 2. [imagen-wikipedia]

## 3. Imagen 2 (Dec 2023) — first productized generation

Imagen 2 landed on Vertex AI in December 2023 as the first commercial Imagen. Notable **new-in-2**:

- **Text rendering in images** across English plus Chinese, Hindi, Japanese, Korean, Portuguese, and Spanish (preview). First Imagen able to reliably produce legible words inside an image.
- **Logo generation** (emblems, lettermarks, abstract logos) and overlay onto products/clothing.
- **Image understanding mode** (caption + VQA), suggesting shared backbone between the generator and the image-to-text path.
- **Enterprise copyright indemnification** — Imagen 2 outputs on Vertex AI were the first Google image-gen outputs covered by Google Cloud's Generative AI Indemnified Services contract. [imagen2-blog] [gcp-indemnity]

Imagen 2 did not publish a formal technical report; model-card-style detail only appeared with Imagen 3.

## 4. Imagen 3 (Aug 2024, updated Dec 2024) — the first real tech report

Imagen 3 is the first Google image generator with a **full arXiv technical report** (arXiv:2408.07009, v3 updated 21 Dec 2024). [imagen3-arxiv]

### 4.1 Architecture and training

- **Latent diffusion model** (not pixel-space cascade like Imagen 1). Default generation at **1024×1024**, with optional **2×, 4×, or 8× upsampling**. [imagen3-arxiv §1]
- Training corpus uses **multi-stage filtering**: removal of unsafe/violent/low-quality images, **removal of AI-generated images** (to avoid learning generative artifacts), deduplication, and down-weighting of near-duplicates. [imagen3-arxiv §2]
- Every training image is paired with **both original captions** (alt text, human descriptions) **and synthetic captions generated by Gemini models** with diverse prompting strategies to maximize linguistic variety. [imagen3-arxiv §2]

### 4.2 Evaluation methodology — worth stealing

Imagen 3's eval is unusually rigorous and is a reusable template for any prompt-eval system:

- **Five quality axes**, each evaluated independently to avoid conflation: overall preference, prompt–image alignment, visual appeal, detailed prompt–image alignment, numerical reasoning.
- **Pairwise side-by-side** comparisons aggregated into **Elo scores** (same methodology as Chatbot Arena).
- **Prompt sets**: GenAI-Bench (1,600 prompts from professional designers), DrawBench (200), DALL·E 3 Eval (170), DOCCI-Test-Pivots (1,000 for detailed alignment), GeckoNum (numerical reasoning).
- **366,569 ratings across 5,943 submissions from 3,225 raters spanning 71 nationalities.** [imagen3-arxiv §3.1]

### 4.3 Reported results

On **GenAI-Bench overall preference** (Elo with 99% CI), the updated Dec 2024 scores were:

| Model | Elo |
|---|---|
| Imagen 3 | **1,098** |
| Stable Diffusion 3 | 1,047 |
| DALL·E 3 | 1,028 |
| Midjourney v6 | 1,027 |
| Imagen 2 | 941 |
| SDXL 1.0 | 860 |

Imagen 3 led or tied on every reported axis. On **prompt–image alignment** on GenAI-Bench the margin was largest; on DALL·E 3 Eval the four leading models had overlapping CIs, i.e. no decisive winner. [imagen3-arxiv §3.1.1–3.1.2]

### 4.4 Vertex AI SKUs for Imagen 3

| Model ID | Role | Max resolution | RPM quota |
|---|---|---|---|
| `imagen-3.0-generate-002` | Latest generation | 1408×768 | 20 |
| `imagen-3.0-generate-001` | Original generation | 1408×768 | 20 |
| `imagen-3.0-fast-generate-001` | Low-latency | 1408×768 | 200 |
| `imagen-3.0-capability-001` | **Editing + customization** (image inputs) | — | 100 |

Note: `imagen-3.0-capability-001` is the only Imagen 3 SKU that accepts image inputs. Pure `generate` SKUs are text-only — important when designing a prompt-to-asset UI. [vertex-imagen3]

## 5. Imagen 4 (Jun 2025 preview, Aug 2025 GA) — current flagship

Imagen 4 does **not** yet have a standalone arXiv tech report (as of this research pass). The authoritative primary sources are the Google Developers Blog launch posts and the Vertex AI model docs. [imagen4-blog-launch] [imagen4-blog-fast] [vertex-imagen4]

### 5.1 Three-tier SKU matrix (Vertex AI, GA 14 Aug 2025)

| SKU | Target | Max resolution | Aspect ratios | RPM | Gemini API price / image |
|---|---|---|---|---|---|
| `imagen-4.0-ultra-generate-001` | Precision prompt adherence | **2816×1536** | 1:1, 3:4, 4:3, 9:16, 16:9 | 30 | $0.06 |
| `imagen-4.0-generate-001` | General quality | **2816×1536** | 1:1, 3:4, 4:3, 9:16, 16:9 | 75 | $0.04 |
| `imagen-4.0-fast-generate-001` | High-throughput | 1408×768 | same | 150 | $0.02 |

All three are **text-in / image-out only** (no reference-image editing — those capabilities remain on the `imagen-3.0-capability-001` SKU or move to the Gemini native-image models). All three are GA through **30 June 2026** (scheduled discontinuation date, post which versions are typically rolled forward). [vertex-imagen4]

### 5.2 Capability deltas vs. Imagen 3 (per Google's own launch claims)

- **Up to 10× faster** processing than Imagen 3. [deepmind-imagen]
- **"Significantly improved"** in-image text rendering and typography — this is the headline positioning of Imagen 4. [imagen4-blog-fast]
- **Up to 2K resolution** (2048×2048) directly supported; Ultra extends to 2816×1536 for wide aspect ratios. [vertex-imagen4]
- **Prompt languages**: English plus Chinese simplified/traditional, Hindi, Japanese, Korean, Portuguese, Spanish (non-English still in preview). [vertex-imagen4]

### 5.3 What's still missing in Imagen 4

No conversational editing, no character consistency across generations, no multi-image fusion, no reference-image conditioning on the `generate` SKUs. Those use cases are the explicit territory of the Gemini native-image line — see §6.

## 6. Gemini 2.5 Flash Image ("Nano Banana") — Aug 2025

### 6.1 Architecture — **not a diffusion model**

This is the most important clarification for anyone building on Google's image stack:

**Gemini 2.5 Flash Image is a sparse Mixture-of-Experts (MoE) transformer that autoregressively emits image tokens interleaved with text tokens**, not a diffusion model. From the Gemini 2.5 Flash model card (DeepMind):

> "Gemini 2.5 models use a sparse mixture-of-experts (MoE) transformer-based architecture with native multimodal support for text, vision, and audio inputs. The sparse MoE design activates a subset of model parameters per input token by dynamically routing tokens to expert subsets, allowing the model to decouple total model capacity from computation and serving cost per token."
> — [gemini25-card]

Serving and tokenization details:

- **Image output cost**: each generated image consumes **1,290 output tokens**. With Gemini API pricing at $30 per 1M output tokens, that's **~$0.039 per image**. [gemini25-intro]
- **Token context window**: 1M input tokens, 32K output tokens. [gemini25-card] [vertex-2.5-flash-image]
- **Knowledge cutoff**: June 2024 (Vertex AI doc) / June 2025 (AI Studio page — likely reflects a later eval cutoff). [vertex-2.5-flash-image]
- **Training infrastructure**: Google TPU pods, JAX + ML Pathways. [gemini25-card]

Architectural consequence for prompt engineering: because images are generated as token sequences conditioned on the full context (text + prior images), **the same conversational state that drives Gemini text reasoning drives image edits**. That is the mechanism behind multi-turn character consistency and prompt-based editing — it isn't a separate diffusion conditioning trick, it's just context reuse.

### 6.2 Capability matrix (Vertex AI, model ID `gemini-2.5-flash-image`)

| Feature | Value |
|---|---|
| Model ID | `gemini-2.5-flash-image` |
| Launch stage | GA, release 2 Oct 2025; discontinuation 2 Oct 2026 |
| Inputs | Text, images (PNG/JPEG/WebP/HEIC/HEIF), PDFs, plain text |
| Outputs | Text **and** images |
| Max input images per prompt | 3 |
| Max output images per prompt | **10** |
| Aspect ratios | 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |
| Temperature / topP / topK | 0.0–2.0 (def 1.0) / 0.0–1.0 (def 0.95) / 64 fixed |
| Consumption | Standard PayGo, Provisioned Throughput, Batch prediction |
| Security | Data residency, CMEK, VPC-SC, AXT |

Source: [vertex-2.5-flash-image]

### 6.3 Headline capabilities (from the Aug 26, 2025 launch post)

1. **Multi-image fusion** — understand and merge multiple input images (put object into scene, restyle room, fuse images).
2. **Character/style consistency** — same character across prompts/edits, same product across angles, consistent brand assets.
3. **Prompt-based editing** — blur backgrounds, remove stains, remove people, alter pose, colorize black-and-white, all via natural language.
4. **Native world knowledge** — Gemini's world knowledge is used at generation time (follow hand-drawn diagrams, answer real-world questions as visuals).

Source: [gemini25-intro]

### 6.4 Benchmarks — LMArena

Gemini 2.5 Flash Image (under its codename `nano-banana`) set records on LMArena when it was tested pre-release:

- **Largest Elo lead in Arena history**: 171 points.
- **2.5M+ votes** cast for `nano-banana` alone during the preview period; 5M+ total community votes.
- **Ranked #1** on the text-to-image leaderboard at launch. [lmarena-nanobanana]

On the current (2026) Image Edit leaderboard, Gemini 2.5 Flash Image has settled at **#9 with Elo ~1,308**, with Gemini 3 Pro Image (Nano Banana Pro) now occupying the top slots at Elo ~1,391–1,392. [lmarena-image-edit]

## 7. Nano Banana Pro / Gemini 3 Pro Image (Nov 20, 2025) — current SOTA

From DeepMind's launch post [nanobanana-pro]:

- **Built on Gemini 3 Pro** — inherits Gemini 3's reasoning and real-world knowledge. Can **ground via Google Search** to incorporate real-time data (weather, sports) or factual content (recipes, educational diagrams).
- **In-image text rendering**: "best model for creating images with correctly rendered and legible text," including multilingual localization (demonstrates English→Korean translation inside branded mockups).
- **Multi-reference composition**: up to **14 reference images** total, of which up to **5 can be character references** with identity preservation. Enables storyboards, comic books, multi-product mockups.
- **Resolutions**: 1K, 2K, **and 4K**.
- **Studio-grade controls**: localized edits on arbitrary regions, camera angle/focus/aspect-ratio changes, color grading, lighting transforms (day→night, chiaroscuro, bokeh).

Distribution surface: Gemini app (free users get limited quota, then fall back to Nano Banana; Pro/Ultra subscribers get more), AI Mode in Search (US, Pro/Ultra), NotebookLM, Google Ads, Workspace (Slides, Vids), **Vertex AI for enterprises**, Flow for filmmakers, Google Antigravity. [nanobanana-pro]

## 8. SynthID and provenance — what actually travels with an image

**Every** image emitted by Google's image models (Imagen 2/3/4, Gemini 2.0/2.5 Flash Image, Nano Banana Pro) carries an **imperceptible SynthID watermark** in its pixels. Key properties Google claims:

- **Invisible to humans**, machine-detectable.
- **Survives compression, resizing, and minor modifications** (so a prompt-to-asset pipeline can safely resize/compress without losing provenance).
- **Detectable via the Gemini app** — users can upload an image and ask whether it was generated by Google AI. [nanobanana-pro ¶"How to identify AI-generated images"]

In parallel, Imagen on Vertex AI supports **C2PA Content Credentials** on Imagen 3 models, giving a second, open-standard provenance trail. [vertex-imagen3-002]

### 8.1 Visible watermark policy (Nano Banana Pro, Nov 2025)

- **Free + Google AI Pro tier** images: visible Gemini "sparkle" watermark in addition to SynthID.
- **Google AI Ultra subscribers + Google AI Studio developer tool**: visible watermark **removed** (SynthID still present).
- **Vertex AI enterprise**: follows the enterprise terms; no Gemini sparkle is imposed on API outputs.

Source: [nanobanana-pro]

## 9. Policy & commercial-use envelope

### 9.1 Filter surface (Imagen on Vertex AI)

Built-in safety filters run on **both the text prompt and the generated/uploaded images**, scoring against harmful-content categories: `violence`, `sexual`, `derogatory`, `toxic`, plus categories exposed via `includeSafetyAttributes`: *Death/Harm/Tragedy, Firearms & Weapons, Hate, Health, Illicit Drugs, Politics, Porn, Religion & Belief, Toxic, Violence*. [imagen-responsible-ai]

Configurable controls (this is the set a prompt-to-asset must know to surface correctly to users):

| Parameter | Values | Effect |
|---|---|---|
| `safetySetting` | `block_most`, `block_some` (default), `block_few` | Confidence-score threshold for blocking |
| `personGeneration` | `allow_all` (incl. minors), `allow_adult` (adults + celebrities only), `dont_allow` | Explicit control over people/face generation; supersedes deprecated `disablePersonFace` |
| `includeRaiReason` | bool | Returns per-image `raiFilteredReason` for blocked outputs |
| `includeSafetyAttributes` | bool | Returns category scores for input prompt and each unfiltered image |

- **Filtered input returns HTTP 400** with `INVALID_ARGUMENT`. Filtered *outputs* return successfully but with blocked slots replaced by `raiFilteredReason` strings — and **blocked images are not billed**.
- **Lower thresholds (`block_few`) require Google Cloud account-team approval**, not just an API flag. [imagen-responsible-ai]

### 9.2 Commercial use and indemnification

- **Imagen on Vertex AI was the first Google image-gen line to ship with copyright indemnification** (Imagen 2, Dec 2023). The full current scope is in the Google Cloud **Generative AI Indemnified Services** terms — which enumerate which model IDs and which versions are covered; Imagen 3 and Imagen 4 GA SKUs are in scope when accessed through Vertex AI on supported regions. [imagen2-blog] [gcp-indemnity]
- **Gemini API Additional Terms** state that Google doesn't claim ownership of generated content and permits API clients in production (subject to rate limits). [gemini-api-terms]
- **Training-data replication**: Imagen models are "intended to generate original content and not replicate existing content," with systems designed to limit verbatim replication. Imagen 3's own filtering pipeline explicitly removes AI-generated images from training to prevent artifact propagation. [imagen-responsible-ai] [imagen3-arxiv §2]

### 9.3 Text-in-image rules (Imagen-specific quirk)

Imagen models at `imagegeneration@004` or lower **do not support adding text to images via prompt**. Imagen 2 onward do. The Gemini native-image models (Nano Banana / Pro) also support in-image text, with Nano Banana Pro positioned as the strongest in-image text renderer Google has shipped. [imagen-responsible-ai] [nanobanana-pro]

## 10. Practical implications for a prompt-to-asset

Given the above, the decision tree a prompt-to-asset should encode looks like:

1. **Needs reference images, edits, or character consistency?** → Gemini 2.5 Flash Image (good-enough, cheap) or Gemini 3 Pro Image / Nano Banana Pro (high-quality, 4K, multi-char). Don't route to Imagen `generate` SKUs — they won't accept reference images.
2. **Pure text-to-image, photorealism priority, highest-resolution single shot?** → Imagen 4 Ultra (up to 2816×1536) or Imagen 4 (same resolution ceiling, faster). Imagen 4 Fast for ideation.
3. **Pure text-to-image, legacy pipelines or image-editing-with-image-inputs?** → Imagen 3 (`imagen-3.0-capability-001` for editing workflows — currently the only Imagen with image-input support and C2PA).
4. **Policy surface the enhancer must expose**:
   - `personGeneration` is the highest-consequence toggle; default `allow_adult` is often what commercial users want.
   - `safetySetting` thresholds other than defaults require account-team approval — don't let users toggle these from the UI without a backend gate.
   - SynthID is always on; expose this as a feature (provenance verification) rather than a limitation.
5. **Commercial-asset confidence**: route through Vertex AI (indemnified) rather than consumer Gemini app endpoints for anything that will be monetized.

---

## Sources

Primary (Google / DeepMind / arXiv):

- [imagen1-arxiv]: Saharia et al., "Photorealistic Text-to-Image Diffusion Models with Deep Language Understanding," arXiv:2205.11487, NeurIPS 2022 — the original Imagen paper. https://arxiv.org/pdf/2205.11487
- [imagen3-arxiv]: Imagen 3 Team, "Imagen 3," arXiv:2408.07009 v3 (updated 21 Dec 2024) — the canonical Imagen 3 technical report. https://storage.googleapis.com/deepmind-media/imagen/imagen_3_tech_report_update_dec2024_v3.pdf
- [imagen2-blog]: "Imagen 2 on Vertex AI is now generally available," Google Cloud Blog, Dec 2023 — first GA announcement of Imagen 2 with indemnification. https://cloud.google.com/blog/products/ai-machine-learning/imagen-2-on-vertex-ai-is-now-generally-available
- [imagen4-blog-launch]: "Imagen 4 is now available in the Gemini API and Google AI Studio," Google Developers Blog — Imagen 4 launch post. https://developers.googleblog.com/en/imagen-4-now-available-in-the-gemini-api-and-google-ai-studio
- [imagen4-blog-fast]: "Announcing Imagen 4 Fast and the general availability of the Imagen 4 family in the Gemini API," Google Developers Blog, Aug 2025. https://developers.googleblog.com/en/announcing-imagen-4-fast-and-imagen-4-family-generally-available-in-the-gemini-api
- [deepmind-imagen]: "Imagen — Google DeepMind," product hub page with capability summary. https://deepmind.google/models/imagen/
- [vertex-imagen3]: "Imagen 3," Vertex AI generative-AI model docs (all 3.0 SKUs). https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate
- [vertex-imagen3-002]: "Imagen 3 Generate 002," Vertex AI docs — C2PA and SynthID capability matrix. https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate-002
- [vertex-imagen4]: "Imagen 4," Vertex AI generative-AI model docs (all 4.0 SKUs, resolutions, quotas, GA dates). https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate
- [imagen-responsible-ai]: "Responsible AI and usage guidelines for Imagen," Vertex AI docs — safety filters, `personGeneration`, `safetySetting`, `includeRaiReason`, `includeSafetyAttributes`, filtered-input/output schemas. https://cloud.google.com/vertex-ai/generative-ai/docs/image/responsible-ai-imagen
- [gemini25-card]: "Gemini 2.5 Flash Model Card," DeepMind Model Card PDF — MoE transformer architecture, training infra, token limits. https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-2-5-Flash-Model-Card.pdf
- [gemini25-intro]: "Introducing Gemini 2.5 Flash Image, our state-of-the-art image model," Google Developers Blog, 26 Aug 2025 — nano-banana launch post with pricing, capabilities, sample code. https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/
- [vertex-2.5-flash-image]: "Gemini 2.5 Flash Image," Vertex AI generative-AI docs — full capability matrix (inputs/outputs, aspect ratios, security controls, discontinuation date). https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
- [nanobanana-pro]: "Introducing Nano Banana Pro," DeepMind blog, 20 Nov 2025 — Gemini 3 Pro Image launch, 14-image composition, 4K, SynthID visibility policy. https://deepmind.google/blog/introducing-nano-banana-pro/
- [gcp-indemnity]: "Generative AI Indemnified Services," Google Cloud terms — authoritative list of indemnified generative-AI services. https://cloud.google.com/terms/generative-ai-indemnified-services
- [gemini-api-terms]: "Gemini API Additional Terms of Service," Google AI for Developers — ownership of generated content, production-use allowances. https://ai.google.dev/gemini-api/terms-archive/terms_05_02_24

Secondary (used for benchmark Elo and cross-verification only):

- [lmarena-nanobanana]: "Nano-Banana (Gemini 2.5 Flash Image): Try it on LMArena," LMArena blog — record 171-point Elo lead during preview. https://lmarena.ai/blog/nano-banana/
- [lmarena-image-edit]: LMArena Image Edit Leaderboard — current Elo standings for Gemini image models (Gemini 3 Pro Image variants at top, Gemini 2.5 Flash Image at ~1,308). https://lmarena.ai/leaderboard/image-edit
- [imagen-wikipedia]: "Imagen (text-to-image model)," Wikipedia — historical context on Imagen 1 non-release decision. https://en.wikipedia.org/wiki/Imagen_(text-to-image_model)
