---
title: "Transformer & Autoregressive Text-to-Image Models"
category: 02-image-generation-models
angle: 2b
slug: 2b-autoregressive-transformer-t2i
summary: >
  Deep dive on token-based / autoregressive text-to-image families
  (Parti, Muse, MAGVIT-v2, Emu3, CogView, VAR, Infinity, LlamaGen,
  gpt-image-1). Covers architecture, text-rendering advantages,
  tradeoffs vs diffusion, and 2024-2026 progress.
research_value: high
last_updated: 2026-04-19
---

## Executive Summary

Between 2022 and 2026 the “image = sequence of tokens” branch of
text-to-image went from a second-class alternative to diffusion to a
first-class paradigm. Three shifts drive this: (1) better visual
tokenizers (ViT-VQGAN, MAGVIT-v2’s lookup-free quantization, bitwise
tokens in Infinity); (2) new autoregressive formulations beyond
raster-scan next-token prediction (Muse’s parallel masked decoding,
VAR’s coarse-to-fine next-scale prediction); and (3) unification with
LLM stacks, culminating in models that are literally one transformer
over interleaved text and image tokens (Emu3, gpt-image-1).

The practical payoff is strongest where diffusion historically
struggled: **in-image text rendering, typography, tight layout
control, long-prompt instruction following, and tool-like editing
flows**. gpt-image-1 and hybrids like GLM-Image now reach 85-98% word
accuracy on short in-image text where FLUX.1-Dev sits near 50%.
Diffusion still wins on photoreal texture, painterly rendering, and
raw perceptual quality per compute for mid-resolution single-shot
generation — which is exactly why 2025-2026 production systems tend
to be hybrid (autoregressive planner + diffusion refiner).

## Key Findings

### 1. Architecture taxonomy of the AR/transformer T2I family

Four structurally different approaches now all get called
“autoregressive / transformer T2I”. They differ in what is predicted
and in what order.

| Family | Prediction target | Order | Representative models |
|---|---|---|---|
| Raster-scan next-token | Discrete image token | Left-to-right, top-to-bottom over flattened VQ grid | Parti, CogView, LlamaGen, Emu3 |
| Masked parallel decoding | Masked image tokens | Iterative, all positions in parallel | Muse, MaskGIT, MAGVIT-v2 (LM mode) |
| Next-scale / coarse-to-fine | Full lower-resolution map of tokens | Scale-by-scale (1×1 → 2×2 → … → 16×16) | VAR, Infinity |
| Unified multimodal token stream | Any modality token | Causal over interleaved text/image/video | Emu3, gpt-image-1 (native multimodal), Transfusion (hybrid AR+diffusion) |

All four share a common substrate: a **discrete visual tokenizer**
(VQ-VAE / ViT-VQGAN / LFQ / bitwise) that collapses an image into a
vocabulary the transformer can learn. The tokenizer, not the
transformer, has repeatedly been the bottleneck — MAGVIT-v2 makes this
explicit in its title (“Language Model Beats Diffusion: *Tokenizer is
Key*”).

### 2. Model-by-model specifics

**Parti (Google, 2022).** Encoder-decoder transformer treating T2I as
sequence-to-sequence. Text encoder produces embeddings; decoder
autoregressively emits ViT-VQGAN image tokens, which are then detok’d
to pixels. Scales cleanly from 350M → 750M → 3B → 20B. At 20B, zero-shot
FID 7.23 and finetuned FID 3.22 on MS-COCO; human raters preferred 20B
over 3B 63.2% on realism and 75.9% on text-image match. Weights were
never released. Introduced **PartiPrompts (P2)**, 1600+ prompts that
stayed a standard benchmark into 2026.

**Muse (Google, 2023).** Masked generative transformer over VQGAN
tokens, conditioned on T5-XXL embeddings, with a separate super-res
transformer. Parallel decoding makes it dramatically faster: 1.3s for
512×512 and 0.5s for 256×256 on TPUv4, vs 6.4s for Parti-3B at 256×256
and 9.1s for Imagen. 900M model: FID 6.06 on CC3M; 3B model: FID 7.88
zero-shot COCO, CLIP 0.32. Native zero-shot inpainting, outpainting,
and mask-free editing fall out of the masked-token formulation.

**MAGVIT / MAGVIT-v2 (Google + CMU, 2023-2024).** MAGVIT-v2’s central
claim is that with a **lookup-free quantization (LFQ)** tokenizer
producing a large, expressive vocabulary, a plain LM (no diffusion)
beats diffusion on ImageNet and Kinetics. Tokenizer is video-first but
shares vocabulary with images. MAGVIT-v2’s tokenizer is the substrate
under **VideoPoet** and influenced the tokenizers in many later AR
stacks.

**Meta “Emu” family — naming caveat.** The original *Emu: Enhancing
Image Generation Models Using Photogenic Needles in a Haystack* (Meta,
2023) is actually a **latent diffusion model**, not autoregressive —
Meta’s own paper describes a 4→16-channel LDM quality-tuned on a
2,000-image curated set. The autoregressive “Emu” is **Emu3 (BAAI,
Sept 2024)**, not Meta’s. Emu3 tokenizes images, text, and video into a
single discrete space and trains one transformer from scratch with
pure next-token prediction, beating SDXL on image generation and
LLaVA-1.6 on vision-language understanding. Treat “Emu = AR” claims
carefully: only Emu3 qualifies.

**CogView / CogVLM family (Tsinghua, ZhipuAI, 2021-2025).** The
original CogView (2021) and CogView2 (2022) are VQ-VAE + autoregressive
transformers, directly in the Parti lineage but trained on
Chinese-English data. CogView3 (2024) pivoted to cascaded *relay
diffusion*. CogView3-Plus and **CogView4 (2025)** are diffusion
transformers with flow matching, using a GLM-4-9B text encoder; they
are not autoregressive despite the family name. CogView4 is notable as
the first open-source model with strong Chinese character rendering
inside images. CogVLM is a different product line — a vision-language
*understanding* model, not generation; it is frequently cited
alongside CogView only because they share a lab.

**VAR (ByteDance, NeurIPS 2024 Best Paper).** Reformulates AR image
generation as **next-scale prediction**: predict the full token map at
scale *k+1* given all scales up to *k*, starting from 1×1. On
ImageNet 256×256, pushes AR FID from 18.65 → 1.73 and IS 80.4 → 350.2
with ~20× faster inference, and beats DiT on image quality, speed,
data efficiency, and scaling. Exhibits LLM-like power-law scaling
(correlation −0.998) and zero-shot in/outpainting and editing.

**Infinity (ByteDance, CVPR 2025 Oral).** Scales VAR with **bitwise
tokens**, an Infinite-Vocabulary Classifier, and Bitwise
Self-Correction. GenEval 0.73 vs SD3-Medium 0.62; 1024×1024 in 0.8s
(2.6× faster than SD3-Medium); 66% human win rate vs SD3-Medium.
Checkpoints released at 2B and 8B.

**LlamaGen (HKU + ByteDance, June 2024).** A direct bet that *nothing
image-specific is needed*: use a vanilla LLaMA-style decoder on VQ
tokens. Class-conditional 111M-3.1B models reach FID 2.18 on
ImageNet 256×256 (beating LDM and DiT); 775M text-conditional variant
trained on LAION-COCO. Benefits from LLM serving infra —
326-414% speedup with vLLM.

**gpt-image-1 (OpenAI, April 23, 2025).** The ChatGPT-side “4o image
generation” model exposed in the API. OpenAI’s own description calls
it “natively multimodal” and emphasizes capabilities diffusion
historically failed at: faithfully following custom guidelines,
leveraging world knowledge, and **accurately rendering text**. OpenAI
has not published a paper, but their announcement and third-party
teardowns describe it as a single transformer consuming interleaved
text and image tokens and emitting image tokens autoregressively,
with a separate decoder producing pixels. Pricing is per-token ($5 /
1M text-in, $10 / 1M image-in, $40 / 1M image-out; ~$0.02-$0.19 per
image at low/medium/high quality). **gpt-image-1.5** (Dec 16, 2025)
delivered ~4× faster generation, tighter edit locality, and better
instruction following. On community benchmarks, GPT-4o (which shares
the stack) leads GenEval at 0.84.

**Transfusion (Meta, Aug 2024) — honorable mention.** Not a pure AR
model: one transformer is trained with *both* next-token loss on text
and diffusion loss on images, over a mixed-modality sequence.
Architecturally closest to how many people now speculate gpt-image-1
actually works. Included here because the line between “AR
transformer” and “transformer with a diffusion head” is blurring
fast.

### 3. Strengths for text rendering, icons, and layout

Autoregressive / token-based models dominate in-image text because:

- **Per-character supervision.** A VQ token corresponds to a small
  patch (8×8 or 16×16 px); the transformer emits tokens conditionally
  on the whole prompt, so a glyph’s shape is committed *once* per
  patch rather than re-denoised from noise per step. The model can
  literally plan a line of text token-by-token.
- **Long-context text encoders.** Muse, CogView4, and gpt-image-1 use
  T5-XXL / GLM-4-9B / GPT-class text encoders with 512-1024+ tokens,
  vs Stable Diffusion’s 77-token CLIP context. Long prompts that
  specify exact strings, colors, and positions survive intact.
- **Discrete sequence = native layout.** Scale-by-scale (VAR) or
  raster (Parti) prediction produces hard spatial boundaries that are
  kind to glyphs, logos, UI elements, and icons — exactly the things
  diffusion smears.

Concrete 2025-2026 numbers:

- gpt-image-1.5 reports ~98% word accuracy on 1-5-word headlines and
  ~95% on 6-15-word subheads; falls to ~85% on 50+-word body copy.
- GLM-Image (AR 9B planner + 7B diffusion decoder, 2026) reports
  91.16% multi-region word accuracy, vs gpt-image-1 85.69% and
  FLUX.1-Dev 49.65%.
- Ideogram 3.0 sits near 90% with a dedicated typography module and
  is the go-to for poster / logo work where exact spelling matters.

### 4. Tradeoffs vs diffusion

| Axis | AR / token-based | Diffusion |
|---|---|---|
| In-image text, logos, UI | Strong — often decisive | Historically weak; improving via hybrid / LLM encoders |
| Photoreal texture, skin, hair | Usually behind best diffusion (FLUX.1, SD3.5) | Strong; painterly effects still class-leading |
| Controllable editing via masks | Native (Muse, VAR) | Requires inpainting heads |
| Long-prompt compliance | Strong — full transformer attention to prompt | Weaker at long tail without re-captioning |
| Sampling speed at 1024² | 0.5-2s (Muse, VAR, Infinity) | 1-5s typical; 10s+ for high-step diffusion |
| Training stability & LLM infra reuse | High — same kernels, schedulers, vLLM | Separate DDPM/flow-matching stacks |
| Diversity / variability per prompt | Somewhat lower (sampling collapses more) | Higher out of the box |
| Open-weights ecosystem (2026) | Infinity, LlamaGen, Emu3, CogView (diffusion) | FLUX.1, SD3.5, SDXL still dominant |

### 5. 2024-2026 trajectory

- **2024 Q2**: VAR reframes AR as next-scale; LlamaGen shows LLaMA-style
  decoders work for images.
- **2024 Q3-Q4**: Emu3 publishes “next-token prediction is all you
  need”, proving one transformer can cover text + image + video via
  tokens. MAGVIT-v2 cements LFQ-style tokenizers.
- **2024 Dec**: Infinity scales VAR with bitwise tokens.
- **2025 Apr**: gpt-image-1 lands in the API; AR-leaning multimodal
  becomes the default for “products that need text inside images”
  (Adobe, Canva, GoDaddy, HubSpot integrations on day one).
- **2025 Dec**: gpt-image-1.5 ships 4× speedup + edit-locality fixes.
- **2025-2026**: Hybrid stacks (AR planner + diffusion decoder, e.g.
  Transfusion, GLM-Image) become the default *architecture family* in
  new labs. Pure-AR still dominates on text-heavy outputs; pure
  diffusion still dominates on photoreal aesthetics.

## Concrete Prompt Examples (Strength Areas)

Prompt patterns where AR / token-based models clearly outperform
diffusion as of 2026:

1. **Posters with exact copy**
   - `Retro travel poster: top headline "VISIT PATAGONIA", subhead
     "Established 1872", bottom-right price "from $1,299", muted blues
     and cream, Swiss design grid.`
   - gpt-image-1.5 / GLM-Image: strings come through verbatim; FLUX.1
     typically corrupts one of the three.

2. **App icons and simple UI mockups**
   - `A minimal app icon for a task manager, rounded square 1024x1024,
     deep navy background, single white check-mark glyph centered,
     no text.`
   - VAR/Infinity and gpt-image-1 produce cleaner edge geometry than
     SDXL at equal compute.

3. **Charts / diagrams with labels**
   - `A two-column comparison table image, header row "Plan A" vs
     "Plan B", rows "Price", "Speed", "Support", with check and X
     marks; flat corporate style.`
   - AR wins on preserving label strings and row alignment.

4. **Multilingual in-image text**
   - `A Tokyo shop sign reading "コーヒー" above the English word
     "COFFEE", neon in lavender on black.`
   - CogView4 (Chinese), gpt-image-1 (48+ languages), and GLM-Image
     handle multi-script best; diffusion-only models commonly mangle
     non-Latin glyphs.

5. **Long, constraint-heavy prompts (PartiPrompts-style)**
   - `A green sign that says "Very Deep Learning" at the edge of the
     Grand Canyon, puffy white clouds in the sky, photographic.`
   - Parti 20B, Muse 3B, and gpt-image-1 all explicitly tested on this
     class; diffusion needs prompt-rewrite scaffolding to match.

## Known Failures

- **Long body text (>50 words inside the image).** Even gpt-image-1.5
  drops to ~85% word accuracy; AR models still re-spell mid-paragraph
  and drift on kerning.
- **Photoreal skin and hair.** AR + VQ decoders produce softer,
  occasionally plastic-looking portraits at 1024². FLUX.1-Dev and
  SD3.5 remain preferred for portrait/fashion work.
- **Text with unusual kerning, rotated text, or handwriting.** All
  models degrade; AR helps but does not solve.
- **Mode collapse / low diversity.** Token-level AR models tend to
  produce fewer *different* images at temp 1.0 than diffusion. Muse
  and VAR mitigate with masked / scale-wise sampling.
- **Tokenizer ceiling.** Any AR stack is upper-bounded by its
  tokenizer’s reconstruction fidelity. Old VQGAN tokenizers cap near
  rFID ~0.9-1.5; LFQ and bitwise push this down but at cost of vocab
  size.
- **“Emu = autoregressive” confusion.** The widely cited Meta *Emu*
  (2023) is LDM-based; only *Emu3* (BAAI, 2024) is AR. Treat blog
  posts conflating them as unreliable.
- **CogView3/4 mislabeled as autoregressive.** CogView3-Plus /
  CogView4 are diffusion transformers with flow matching; only the
  original CogView / CogView2 are AR.

## Tools

- **Hosted APIs.** OpenAI `gpt-image-1` and `gpt-image-1.5` (Images
  API; per-token billing; C2PA metadata).
- **Open weights, AR-native.**
  - `FoundationVision/VAR` — NeurIPS 2024 best-paper impl.
  - `FoundationVision/Infinity` — bitwise AR, 2B/8B.
  - `FoundationVision/LlamaGen` — GPT-style class-cond + T2I.
  - `baaivision/Emu3` — next-token multimodal (image, text, video).
- **Open weights, hybrid/diffusion but token-friendly.**
  - `THUDM/CogView4-6B` — flow-matching DiT, strong Chinese text.
- **Tokenizers to build on.** MAGVIT-v2 LFQ tokenizer (JAX), bitwise
  Infinity tokenizer, VQGAN / ViT-VQGAN (Parti-style).
- **Benchmarks.** PartiPrompts (P2, 1600 prompts), GenEval, DPG-Bench,
  GPT-ImgEval (`picotrex/gpt-imgeval`), and in-image-text benchmarks
  like STRICT / MARIO-Eval-style long-text evals.
- **Serving.** LlamaGen ships vLLM compatibility; AR image models
  generally plug into LLM serving stacks (FlashAttention, KV cache,
  speculative decoding) in a way diffusion models cannot.

## Open Questions

1. **Does gpt-image-1 actually emit pixel tokens, or is it a
   Transfusion-style AR+diffusion hybrid?** OpenAI has not disclosed
   the decoder. The marketing line “natively multimodal” is compatible
   with either. This matters for anyone planning to match its text
   fidelity with open weights.
2. **How far can next-scale prediction (VAR / Infinity) scale before
   tokenizer reconstruction caps quality?** Scaling curves are clean
   through 8B; the next cliff likely lives in the tokenizer, not the
   transformer.
3. **Will unified AR-over-tokens (Emu3) displace dual-stack
   (text-LLM + diffusion-image) architectures in production, or will
   the cost of image-token output (tens of thousands of tokens at
   1024²) keep hybrid stacks dominant?**
4. **Can AR-native models close the photoreal gap with FLUX.1-class
   diffusion, or is the “AR wins text, diffusion wins texture” split
   structural?** Early 2026 evidence (GLM-Image) suggests the split
   is real for single-stack models.
5. **What tokenizer is right for typography specifically?** Glyph-ByT5
   (GLM-Image) and character-level conditioning point toward
   specialized typographic tokenizers; nobody has published a clean
   ablation yet.
6. **Licensing and safety posture.** Parti was never released; Muse
   was never released; Emu3, VAR, Infinity, LlamaGen are open. The
   research frontier for AR T2I is now *more* open than for diffusion
   flagships (FLUX.1-Pro, Imagen 3), which inverts the 2022-2023
   pattern.

## Citations

1. Yu et al., *Scaling Autoregressive Models for Content-Rich
   Text-to-Image Generation* (Parti). arXiv:2206.10789, 2022.
   <https://arxiv.org/abs/2206.10789> — project page:
   <https://sites.research.google/parti/>.
2. Chang et al., *Muse: Text-To-Image Generation via Masked Generative
   Transformers*. ICML 2023.
   <https://muse-model.github.io/> — proceedings:
   <https://proceedings.mlr.press/v202/chang23b.html>.
3. Yu et al., *Language Model Beats Diffusion: Tokenizer is Key to
   Visual Generation* (MAGVIT-v2). arXiv:2310.05737, 2023.
   <https://magvit.cs.cmu.edu/v2/>.
4. Dai et al., *Emu: Enhancing Image Generation Models Using
   Photogenic Needles in a Haystack* (Meta, **LDM**).
   <https://ai.meta.com/research/publications/emu-enhancing-image-generation-models-using-photogenic-needles-in-a-haystack/>
   — included here to disambiguate from Emu3.
5. Wang et al., *Emu3: Next-Token Prediction is All You Need* (BAAI).
   arXiv:2409.18869, Sept 2024. <https://arxiv.org/abs/2409.18869> —
   code: <https://github.com/baaivision/Emu3>.
6. Tian et al., *Visual Autoregressive Modeling: Scalable Image
   Generation via Next-Scale Prediction* (VAR, NeurIPS 2024 Best
   Paper). arXiv:2404.02905. <https://arxiv.org/abs/2404.02905> —
   code: <https://github.com/FoundationVision/VAR>.
7. Han et al., *Infinity: Scaling Bitwise AutoRegressive Modeling for
   High-Resolution Image Synthesis* (ByteDance, CVPR 2025 Oral).
   arXiv:2412.04431. <https://huggingface.co/papers/2412.04431> —
   code: <https://github.com/FoundationVision/Infinity>.
8. Sun et al., *Autoregressive Model Beats Diffusion: Llama for
   Scalable Image Generation* (LlamaGen, HKU + ByteDance).
   arXiv:2406.06525, June 2024.
   <https://huggingface.co/papers/2406.06525> — code:
   <https://github.com/FoundationVision/LlamaGen>.
9. OpenAI, *Introducing our latest image generation model in the API*
   (gpt-image-1), April 23, 2025.
   <https://openai.com/index/image-generation-api/> — model card:
   <https://platform.openai.com/docs/models/gpt-image-1>.
10. OpenAI, *The new ChatGPT Images is here* (gpt-image-1.5),
    December 16, 2025.
    <https://openai.com/index/new-chatgpt-images-is-here/>.
11. Zhou et al., *Transfusion: Predict the Next Token and Diffuse
    Images with One Multi-Modal Model* (Meta). arXiv:2408.11039,
    2024. <https://arxiv.org/abs/2408.11039>.
12. THUDM / ZhipuAI, *CogView4-6B* model card, 2025.
    <https://huggingface.co/THUDM/CogView4-6B> — repo:
    <https://github.com/zai-org/CogView4>.
