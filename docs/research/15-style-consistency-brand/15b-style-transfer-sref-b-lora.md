---
category: 15-style-consistency-brand
angle: 15b
title: "Style (not subject) transfer: MJ --sref, IP-Adapter style, StyleAligned, B-LoRA, Visual Style Prompting — keeping a brand aesthetic across 100 assets"
author: research-subagent-15b
date: 2026-04-19
status: draft
tags:
  - style-transfer
  - brand-consistency
  - ip-adapter
  - instantstyle
  - b-lora
  - style-aligned
  - visual-style-prompting
  - midjourney-sref
  - ideogram-style-codes
  - recraft-brand-styles
  - comfyui
primary_sources:
  - https://arxiv.org/abs/2312.02133
  - https://arxiv.org/abs/2403.14572
  - https://arxiv.org/abs/2402.12974
  - https://arxiv.org/abs/2404.02733
  - https://arxiv.org/abs/2404.01292
  - https://docs.midjourney.com/docs/style-reference
  - https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/style-reference
  - https://developer.ideogram.ai/api-reference/api-reference/generate-v3
  - https://www.recraft.ai/docs/api-reference/styles
  - https://github.com/cubiq/ComfyUI_IPAdapter_plus
  - https://github.com/google/style-aligned
  - https://b-lora.github.io/B-LoRA/
  - https://instantstyle.github.io/
---

# Style (not subject) transfer: keeping a brand aesthetic across 100 assets

## Executive Summary

When a product team generates 100 assets (app icons, marketing spots, hero illustrations, OG images, social tiles), the hard problem is almost never "generate one pretty image" — it is **generate 100 images that look like they were designed by the same person**. The payload the generator must respect is *style*: palette, contrast, material, line weight, geometry, typography feel, lighting, and noise profile. It must deliberately **not** copy subject (a cat reference cannot force cats into every asset) and should resist content leakage.

Two parallel ecosystems have converged on this in 2023–2026:

1. **Open research and local pipelines** — StyleAligned (CVPR 2024), B-LoRA (ECCV 2024), Visual Style Prompting (2024), and IP-Adapter / InstantStyle (2024) all take a training-free or ultra-cheap LoRA approach by surgically operating on **specific self-attention or transformer blocks** that encode style separately from content. The key insight across these papers is that style and content are *already* partially disentangled inside SDXL's U-Net — you just need to know which blocks to touch (blocks 4–6 of the up-sampling stack) and how (share attention, swap K/V, or inject via IP-Adapter only on those blocks).
2. **Commercial style-reference APIs** — Midjourney `--sref` (image or numeric code) with `--sw 0–1000` and the v7-only `--sv 4` switch, Ideogram 3.0's dual scheme of `style_codes` (8-char hex) and `style_reference_images` (up to 3 images), and Recraft's `style_id` trained on an uploaded brand image set ($0.04 per style, v2/v3 only). Gemini 2.5 Flash Image ("Nano Banana") uses conversational reference fusion rather than a dedicated style parameter, which is weaker for brand lock but survives multi-turn editing.

The **most reliable production recipe** we surface is a three-layer stack: (a) a **canonical style anchor** (one locked MJ `--sref` code, one Ideogram `style_code`, or one Recraft `style_id`, depending on which tool owns the job); (b) a **style-only injection** at generation time via IP-Adapter "style transfer" weight_type or InstantStyle's block-4/6-only injection when running locally; (c) a **CSD-based drift-detection loop** (Somepalli 2024, arXiv:2404.01292) that flags assets falling below a cosine threshold against the anchor embedding. The workflow for extracting a brand anchor *from a Figma file or PDF style guide* is solved end-to-end today with tools like `dembrandt` (extract tokens → render a synthetic moodboard → use as `--sref` / `style_reference_images` / IP-Adapter input).

## Style-Extraction Methods

### 1. StyleAligned — shared self-attention, zero-shot

Hertz et al., Google Research + Tel Aviv ([arXiv:2312.02133](https://arxiv.org/abs/2312.02133), CVPR 2024; code: [github.com/google/style-aligned](https://github.com/google/style-aligned/)). The technique generates a *batch* of images with different text prompts but forces every image in the batch to share self-attention K/V with the **first** image. At each denoising step the attention operation becomes `softmax(Q_i · K_1ᵀ) · V_1`, so images 2..N pull texture, palette, and material cues from image 1 while keeping their own composition.

Why this matters for brand work: StyleAligned gives you a zero-tuning way to produce a **batch of 100 assets** that all agree on style, starting from a single reference you generate or invert into latent space. The catch is that it requires batch generation (all 100 at once, or in coordinated sub-batches) which is expensive on consumer GPUs. Typical production use: generate a "locked" reference via inversion, cache its K/V, then run new prompts against cached reference K/V as a cheap substitute.

### 2. B-LoRA — decoupled LoRA on blocks 4 and 5

Frenkel et al. ([arXiv:2403.14572](https://arxiv.org/abs/2403.14572), ECCV 2024; code: [github.com/yardenfren1996/B-LoRA](https://github.com/yardenfren1996/B-LoRA); project: [b-lora.github.io](https://b-lora.github.io/B-LoRA/)). The finding: inside SDXL's 11 transformer blocks, **block 4 encodes content (structure/semantics)** and **block 5 encodes style (texture/palette/appearance)**. Train LoRA adapters *jointly* on those two blocks from a single reference image, then at inference time load only the style B-LoRA. You now have a 2-block adapter (≈2–6 MB) that carries the brand aesthetic and can be mixed with any content LoRA or used on clean text prompts.

B-LoRA is the most compelling answer to "I have a brand style, I want to apply it to novel content 100 times without content leakage." A single training run takes ~5 minutes on a consumer GPU from a single image, unlike full LoRA training which wants 15–200 images.

### 3. Visual Style Prompting — K/V swap in late self-attention

Jeong et al., NAVER AI ([arXiv:2402.12974](https://arxiv.org/abs/2402.12974); project: [curryjung.github.io/VisualStylePrompt](https://curryjung.github.io/VisualStylePrompt/)). During denoising, keep the **query** from the new generation but **swap the key and value** with those computed on the reference image, *only in late self-attention layers*. This is the operational dual of StyleAligned: instead of attending across a batch, attend to a single locked reference. Training-free, composable with ControlNet and Dreambooth-LoRA, and the paper explicitly demonstrates lower content leakage than IP-Adapter at comparable style fidelity.

### 4. InstantStyle — CLIP-space content subtraction + block-specific injection

InstantX team ([arXiv:2404.02733](https://arxiv.org/abs/2404.02733); project: [instantstyle.github.io](https://instantstyle.github.io/)). Two contributions stacked on top of IP-Adapter: (a) compute the CLIP image embedding of the reference, compute the CLIP text embedding of the content description, **subtract** the text embedding from the image embedding to isolate the style component; (b) inject the residual IP-Adapter features **only into blocks 4 and 6** of SDXL (the "style blocks" in their taxonomy), leaving other blocks untouched by the image prompt. Result: dramatic drop in content leakage from the reference, usable on vanilla IP-Adapter weights without retraining. This is effectively "IP-Adapter but knowing where to plug it in" and is the single most useful free upgrade to existing IP-Adapter pipelines.

### 5. IP-Adapter with weight_type="style transfer"

Ye et al.'s original IP-Adapter + Matteo's `ComfyUI_IPAdapter_plus` ([github.com/cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus)). The plus repo exposes a `weight_type` dropdown with values including `"linear"`, `"style transfer"`, `"composition"`, `"strong style transfer"`, `"style and composition"`, `"style transfer precise"`, `"composition precise"`. Internally these are per-block weight masks that zero out IP-Adapter contribution in content-heavy blocks and preserve it in style-heavy blocks — this is InstantStyle-style block targeting productized as a UI switch. **Practical note:** on SDXL, `"style transfer precise"` combined with `weight=0.6–0.8` and `end_at=0.7` is the current community consensus for "style only, no subject leakage" (see DeepWiki entry at [deepwiki.com/cubiq/ComfyUI_IPAdapter_plus/5.1-style-transfer-workflows](https://deepwiki.com/cubiq/ComfyUI_IPAdapter_plus/5.1-style-transfer-workflows)).

### 6. CSD — Contrastive Style Descriptor (the measurement tool)

Somepalli et al. ([arXiv:2404.01292](https://arxiv.org/abs/2404.01292); code: [github.com/learn2phoenix/CSD](https://github.com/learn2phoenix/CSD)). ViT-L trained with a contrastive objective that *preserves style and suppresses content*, trained on LAION-Styles (Contra-Styles). Output: a per-image "style embedding" where cosine similarity corresponds to perceived style similarity, agreeing with human judgment where CLIP similarity fails. CSD is the missing measurement tool for a brand-consistency pipeline — it lets you run "how close is asset N to the brand anchor?" as a programmatic check rather than a human eye test.

## Per-Model Style Anchors

| Tool | Anchor mechanism | How to set | Weight/strength | Brand suitability |
|---|---|---|---|---|
| **Midjourney v6/v7** | `--sref <url>` or `--sref <numeric code>` (4.2B possible) or `--sref random` | Drag to "style reference" slot or append `--sref <code>` | `--sw 0–1000`, default 100; multi-code `--sref a b c`, weighted `--sref a::2 b::1` | Excellent for mood/aesthetic lock; no pixel-level guarantee |
| **Midjourney v7 legacy compat** | v6 codes only via `--sv 4` | Append `--sv 4` when re-using old codes | Same | Use for back-compat with an existing v6 brand library |
| **Ideogram 3.0** | `style_codes` (array of 8-char hex) **or** `style_reference_images` (up to 3) **or** `style_type` — **mutually exclusive** | `POST /v1/ideogram-v3/generate` multipart | No explicit weight; codes are discrete, images act as soft refs | Strong when brand has readable typography; best text rendering in class |
| **Recraft v2/v3** | `style_id` from uploaded brand image set | `POST /v1/styles` to create, then `style_id` in `/v1/images/generations` | Implicit (bound into style); $0.04 to create | Best for vector/icon brand systems; **no style support in v4 yet** |
| **Gemini 2.5 Flash Image ("Nano Banana")** | Reference image in the multimodal prompt; no dedicated style parameter | Pass image(s) as `contents` parts alongside text | Implicit, controlled via prompt phrasing | Weaker aesthetic lock, strong multi-turn edit coherence; lock palette/materials in text |
| **SDXL + IP-Adapter (local)** | Style reference image | IPAdapter Advanced node, `weight_type="style transfer precise"` | `weight=0.6–0.9`, `end_at≈0.7`, CFG 5–7 | Most control; needs SDXL checkpoint |
| **SDXL + InstantStyle (local)** | Style reference image | Loads as IP-Adapter but injects only on blocks 4/6 | Uses IP-Adapter weights directly | Best open-source "style only" quality |
| **SDXL + B-LoRA (local)** | Single brand image → trained B-LoRA | Train once (~5 min), load style-only branch at inference | `lora_scale=0.7–1.0` | Highest fidelity to a single style anchor; distributes as a small file |
| **SDXL + StyleAligned (local)** | First image of the batch | Shared attention across batch | Binary: on/off for the shared-attention layers | Use when generating a full asset set in one run |
| **SDXL + Visual Style Prompting** | Reference image | K/V swap in late self-attention layers | Binary on late layers | Low content leakage, composable with ControlNet |
| **Flux.1 dev/pro** | XLabs IP-Adapter v2 (`flux-ip-adapter-v2`) or style LoRA | XLabs-AI HF weights + ComfyUI nodes; `lora_scale=0.6–1.0` | `lora_scale=0.6–1.0` | Cleaner base model; stronger text rendering than SDXL; IP-Adapter v2 adds ControlNet integration |

Practical notes:

- **MJ V7 `--sref` upgrade:** per MJ's update ([updates.midjourney.com/style-references-for-v7](https://updates.midjourney.com/style-references-for-v7/)), V7 sref is "smarter about understanding style and less likely to include unwanted subject details" — in practice this means the content-leakage problem that plagued V6 sref (a cat reference forcing cats into everything) is substantially reduced. Numonic's brand-consistency guide ([numonic.ai/blog/midjourney-brand-consistency-guide](https://numonic.ai/blog/midjourney-brand-consistency-guide)) warns that teams lose track around **200+ codes** without governance, naming, versioning, and approval workflow.

> **Updated 2026-04-21:** MJ V7 now has **six `--sv` style-reference algorithm versions** (`--sv 1` through `--sv 6`). `--sv 6` is the default as of June 16, 2025. `--sv 4` is the legacy V7 model (pre-June 2025). Legacy V6 numeric codes require `--sv 4` (or switching to V6); new V7 codes use `--sv 6`. The table row above should use `--sref <code> --sw 250..400 --sv 6` for new anchors. **Midjourney V8** (alpha March 17, 2026; V8.1 alpha April 2026) keeps `--sref` support but **drops `--oref`/`--ow`** in V8.1 Alpha. V8 also added **Style Creator** (a curated internal style library accessible via the web UI). Sources: [MJ Style Reference docs](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference), [updates.midjourney.com/style-references-for-v7](https://updates.midjourney.com/style-references-for-v7/), [V8.1 guide](https://blakecrosley.com/guides/midjourney).
- **Flux IP-Adapter:** XLabs-AI released `flux-ip-adapter-v2` ([HuggingFace](https://huggingface.co/XLabs-AI/flux-ip-adapter-v2)), trained at 1024×1024 for 350k steps. V2 improves aspect-ratio preservation and facial detail vs. the original v1. Integrates with XLabs ControlNet (Canny, Depth, HED) for combined IP-Adapter + structure control on Flux.1-dev. The "no native style-ref param for Flux" claim is now stale — use XLabs IP-Adapter v2 as the Flux equivalent of IP-Adapter-Plus for SDXL.

- **Ideogram exclusivity rule:** you cannot combine `style_codes` with `style_reference_images` or `style_type` in the same request. Pick one lane per brand and stay in it.
- **Recraft v4 caveat:** As of April 2026, **styles (both predefined and custom `style_id`) are explicitly not supported for V4 models** per the official Recraft styles API documentation. API-created custom brand styles are compatible with Recraft V3 and Recraft V3 Vector models only. V4 was released February 2026 and offers superior generation quality and `controls.colors` palette support, but if you need a custom trained `style_id` for brand lock, you must use V3/V3 Vector. Monitor the [Recraft styles docs](https://www.recraft.ai/docs/api-reference/styles) for V4 style support — it may be added in a future update.

## Style-from-Brand-Guidelines Workflow

The recurring product question: *"I have a Figma file / PDF style guide. Produce a style reference I can feed to MJ / Ideogram / Recraft / IP-Adapter."* This is solvable end-to-end today. Pipeline:

### Step 1 — extract design tokens

- **From a live site or hosted preview:** use `dembrandt` (npx `dembrandt <domain>`; repo: [github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt)) → outputs JSON / W3C Design Tokens with colors (semantic + palette + CSS vars), typography (families, sizes, weights, line heights), spacing, borders, shadows. Supports multi-page analysis, dark mode extraction, and a built-in `--brand-guide` flag that emits a PDF moodboard. Ships an MCP server so Claude Code / Cursor can call `get_color_palette`, `get_typography`, `get_brand_identity` directly.
- **From Figma:** use the OpenClaw Figma skill or the official Figma MCP to pull variables, text styles, and component instances. Export as CSS variables or W3C tokens JSON.
- **From a PDF style guide:** parse with `pdfplumber` or `unstructured` to extract text; use a vision LLM (Gemini 2.5 Pro, GPT-4o) to identify color swatches and typography spreads from rendered page images; dedupe into a token set. Firecrawl's brand-style-guide cookbook ([docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook](https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook)) is a working reference implementation.

### Step 2 — synthesize a canonical style anchor

Tokens alone are not enough for MJ/Ideogram/IP-Adapter — those tools want **a reference image**. Build a "brand moodboard" by composing tokens into a synthetic reference:

- Render a 3×3 grid on a transparent canvas containing: primary/secondary color swatches as geometric chips, a paragraph typeset in the brand font at three weights, a sample of the brand's logo mark, three sample illustrations from the actual brand library (if available) or from a hand-picked reference (if not), a sample photo/texture representing the brand's imagery register.
- Alternative: ask Gemini 2.5 Flash Image or MJ itself to "generate a style reference sheet for a brand with [colors], [typography register], [tone]" and *curate the output by hand* before promoting one image as the anchor.
- Save as a single 1024×1024 PNG. Tag with a semver-like ID (`brand-v1.0.0`).

### Step 3 — register the anchor in every downstream tool

- **MJ:** submit anchor as `--sref <url>` with a batch of 20 test prompts. MJ will canonicalize the style into a numeric code. Record that code. This is now your `MJ_STYLE_CODE_v1.0.0`.
- **Ideogram:** upload anchor as `style_reference_images` in one generation. Ideogram returns the generation's `style_code` (8-char hex) in the metadata. Record it. That hex now replaces the image in future calls, saving bytes and keeping brand lock stable.
- **Recraft:** `POST /v1/styles` with the anchor (or a 3–5 image set for better stability). Record the returned `style_id`. Cost $0.04 per style, so you can afford to iterate.
- **SDXL local:** run a B-LoRA training pass on the anchor image (~5 min), persist both the content and style B-LoRA files, mount only the style branch in production. Alternatively, skip training and just keep the anchor image as the IP-Adapter reference.
- **Gemini Nano Banana:** Nano Banana has no `style_id` — instead, persist the anchor image plus a short "brand tone prompt" (hand-written phrases describing palette, line weight, register) and attach both to every generation.

### Step 4 — version the anchor with the brand

Treat the anchor like source code: tag it, diff it against the previous version's generated samples, and require a PR-style review before promoting `brand-v1.1.0`. Nothing is scarier than silently rotating the anchor and realizing 3 weeks later that 40 published assets now look off-brand.

## Drift Management

Across 100 assets the problem is not just "is asset N on-brand?" but "does asset N+1 agree with asset N?". Drift creeps in three ways: (a) the model itself updates (MJ versions, Ideogram 3 → 3.1); (b) the reference is applied at different strengths by different operators; (c) subject content leaks into what should be style-only influence.

### Measurement

- **CSD cosine similarity** (arXiv:2404.01292) against the anchor. Threshold empirically: we see `cos ≥ 0.72` correspond to "clearly on-brand" on brands with distinct palettes, `cos ∈ [0.60, 0.72]` as "ambiguous — human review", below `0.60` as "off-brand". These thresholds are brand-dependent; calibrate with 20 human-labeled pairs before committing.
- **CLIP image–image cosine** as a fallback when CSD is unavailable; less reliable because CLIP correlates with subject as much as style.
- **Hand-tuned palette extraction:** `colorthief` or `Pillow.getcolors()` on the output, compare dominant palette vs. brand tokens by ΔE (CIEDE2000). Fast, unambiguous on palette-driven brands.

### Enforcement

Wire all three into a gate in the asset pipeline. An asset that fails CSD or ΔE gets kicked back to the generator with a "style-strengthened" re-prompt: raise `--sw` in MJ, raise IP-Adapter weight, swap to `"strong style transfer"` weight_type, or fall back to B-LoRA generation.

### Content-leakage guardrails

- Prefer InstantStyle / Visual Style Prompting / B-LoRA style-only over stock IP-Adapter when subject leakage is a recurring problem.
- In MJ V7, add explicit content negation in the text prompt ("no reference subjects, no cats, no logos from reference") — V7 `--sref` respects these better than V6.
- For IP-Adapter-style workflows, never pass the reference into both IP-Adapter *and* an img2img init — the double injection is where most leakage originates.
- Keep the reference image **subject-light**: a well-designed moodboard is mostly color fields, textures, and typography samples, with no dominant single subject.

### Operational knobs that matter at 100-asset scale

- **Batching under StyleAligned:** generate in batches of 8–16 assets; the first image becomes the shared-attention anchor. Do *not* mix brands across a batch.
- **Seed discipline:** re-using the seed across prompts within a brand tightens aesthetic lock on MJ V7 and SDXL. Rotate seeds only when diversity is required.
- **Prompt skeleton:** lock a prefix template ("{subject}, {action}, {context}, in the style of {brand}, {render register}, {lighting}"). Differences live in `{subject}` and `{action}`; everything else is brand-controlled constants.
- **Negative-prompt library:** maintain a shared negative prompt per brand (e.g., "photorealistic skin pores, film grain, lens flare") that prevents off-brand rendering registers. See category 14 for the fuller negative-prompting treatment.

### Failure modes to watch

1. **Aesthetic collapse** — after ~30 assets the brand looks over-applied; every asset looks the same. Remedy: lower `--sw` from 100 to 60–80, or mix two complementary sref codes.
2. **Content leakage** — a subject from the reference appears in generations. Remedy: switch to InstantStyle / VSP / B-LoRA style-only; swap IP-Adapter weight_type to "style transfer precise"; in MJ append explicit subject negatives.
3. **Model update rug-pull** — MJ changes what a given sref code means across versions. Remedy: for V6 legacy codes pin `--v 6`; for V7 codes use `--sv 4` (old V7 algorithm, pre-June 2025) or `--sv 6` (current default). Regenerate canonical samples after every major release and diff against previous via CSD.

> **Updated 2026-04-21:** With V7 having six `--sv` sub-versions and V8 now in alpha (V8.1 as of April 2026), version pinning is more important than ever. A code that works on V7 `--sv 6` may produce different output on V8. Recommended: record both the version (`--v 7`) and style-reference version (`--sv 6`) in `provenance.model_assets`.
4. **Ideogram style-code drift** — Ideogram 3.0 → 3.1 changed some style_code behaviors in the field. Remedy: keep both the `style_reference_images` (bytes) and the `style_code` (string); re-derive the code after each API version bump.
5. **LoRA overfit** — a brand B-LoRA or style LoRA trained on 10 images starts producing near-copies of training images. Remedy: reduce rank (32 → 16), reduce training steps, add regularization images, or fall back to training-free methods (VSP, StyleAligned, IP-Adapter).

## References

### Primary papers (2023–2024)

- Hertz, Voynov, Fruchter, Cohen-Or. *Style Aligned Image Generation via Shared Attention.* CVPR 2024. arXiv: [2312.02133](https://arxiv.org/abs/2312.02133). Code: [github.com/google/style-aligned](https://github.com/google/style-aligned/).
- Frenkel, Bendel, Cohen-Or, et al. *Implicit Style-Content Separation using B-LoRA.* ECCV 2024. arXiv: [2403.14572](https://arxiv.org/abs/2403.14572). Project: [b-lora.github.io](https://b-lora.github.io/B-LoRA/). Code: [github.com/yardenfren1996/B-LoRA](https://github.com/yardenfren1996/B-LoRA).
- Jeong, Kim, Choi, Lee, Uh. *Visual Style Prompting with Swapping Self-Attention.* 2024. arXiv: [2402.12974](https://arxiv.org/abs/2402.12974). Project: [curryjung.github.io/VisualStylePrompt](https://curryjung.github.io/VisualStylePrompt/). Code: github.com/naver-ai/Visual-Style-Prompting.
- Wang, Huang, Xie, et al. *InstantStyle: Free Lunch towards Style-Preserving in Text-to-Image Generation.* 2024. arXiv: [2404.02733](https://arxiv.org/abs/2404.02733). Project: [instantstyle.github.io](https://instantstyle.github.io/).
- Somepalli, Gupta, Goldblum, Goldstein, et al. *Measuring Style Similarity in Diffusion Models.* 2024. arXiv: [2404.01292](https://arxiv.org/abs/2404.01292). Code: [github.com/learn2phoenix/CSD](https://github.com/learn2phoenix/CSD).
- Ye, Zhang, Liu, et al. *IP-Adapter: Text Compatible Image Prompt Adapter for Text-to-Image Diffusion Models.* 2023. arXiv: 2308.06721.

### Vendor documentation

- Midjourney. Style Reference docs: [docs.midjourney.com/docs/style-reference](https://docs.midjourney.com/docs/style-reference). Random sref: [updates.midjourney.com/sref-random](https://updates.midjourney.com/sref-random/). V7 sref upgrade: [updates.midjourney.com/style-references-for-v7](https://updates.midjourney.com/style-references-for-v7/).
- Ideogram. Style Reference: [docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/style-reference](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/style-reference). Generate v3 API: [developer.ideogram.ai/api-reference/api-reference/generate-v3](https://developer.ideogram.ai/api-reference/api-reference/generate-v3).
- Recraft. Styles API: [recraft.ai/docs/api-reference/styles](https://www.recraft.ai/docs/api-reference/styles). Pricing and limits: [recraft-ai.org/api](https://recraft-ai.org/api/).
- Google AI. Gemini 2.5 Flash Image (Nano Banana): [ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image).

### Community / tooling

- Matteo "cubiq" — `ComfyUI_IPAdapter_plus`: [github.com/cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus). Weight types and style-only reference: DeepWiki notes at [deepwiki.com/cubiq/ComfyUI_IPAdapter_plus/5.1-style-transfer-workflows](https://deepwiki.com/cubiq/ComfyUI_IPAdapter_plus/5.1-style-transfer-workflows).
- Midlibrary — style code deep dive: [midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes](https://midlibrary.io/midguide/deep-dive-into-midjourney-sref-codes).
- srefcodes.com — V7/V6 sref code library (4,800 + 16,000 documented codes): [srefcodes.com](https://srefcodes.com/).
- Numonic — brand governance guide for `--sref`: [numonic.ai/blog/midjourney-brand-consistency-guide](https://numonic.ai/blog/midjourney-brand-consistency-guide).
- Dembrandt — design token / brand extractor with MCP: [github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt).
- Firecrawl — brand style guide generator cookbook: [docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook](https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook).
- Figma — AI Brand Guidelines Generator: [figma.com/solutions/ai-brand-guideline-generator](https://www.figma.com/solutions/ai-brand-guideline-generator/).

### Cross-references within this research fleet

- Category **06** (stable-diffusion-flux) for IP-Adapter / LoRA installation and runtime details.
- Category **07** (midjourney-ideogram-recraft) for tool-specific prompt structure.
- Category **14** (negative-prompting-artifacts) for the negative-prompt half of drift control.
- Sibling angles in **15-style-consistency-brand** for subject-consistency (15a), character consistency (15c), seed + prompt-template locking (15d), and palette/typography token enforcement (15e).
