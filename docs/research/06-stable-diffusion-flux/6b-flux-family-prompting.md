---
category: 06-stable-diffusion-flux
angle: 6b
title: "Flux Family Prompting: Guidance Distillation, T5 Semantics, Kontext Editing, Flux.2"
subject: "Black Forest Labs Flux.1 [dev/schnell/pro], Flux.1 Tools, Flux Kontext, and Flux.2 for production asset workflows"
status: research-digest
research_value: very-high
last_updated: 2026-04-19
primary_sources: 14
tags: [flux, black-forest-labs, guidance-distillation, t5-xxl, mistral-vlm, flux-kontext, flux-2, text-rendering, logo-generation, rectified-flow]
---

# Flux Family Prompting: Guidance Distillation, T5 Semantics, Kontext Editing, Flux.2

**Research value: very-high** — Flux is the dominant open-weights image-generation family of 2024–2026, backs most commercial asset APIs (fal.ai, Replicate, Runware, Together, Cloudflare), and has primary-source documentation for every variant (BFL blog, HuggingFace model cards, BFL API docs, and the `black-forest-labs/flux` + `flux2` GitHub repos).

## Executive Summary

Black Forest Labs (BFL) is the ex-Stability-AI group (SD3 / rectified-flow authors) that shipped **Flux.1** in August 2024 and reset the open-weights frontier. The family has four axes: a **base generator** (Flux.1 `[pro]` / `[dev]` / `[schnell]`, 12B MM-DiT[^1][^2]), a **tools suite** (Flux.1 Fill / Depth / Canny / Redux[^3]), an **instruction-editing branch** (Flux.1 Kontext `[pro/max/dev]`[^4][^5]), and — as of November 25, 2025 — **Flux.2** (`pro` / `flex` / `dev` 32B / `klein` forthcoming)[^6][^7] which replaces the T5-XXL+CLIP text stack with a **Mistral-3 24B vision-language model** and adds multi-reference conditioning (up to 10 images) and 4 MP output.

For asset generation this matters for five concrete reasons:

1. **No negative prompts.** Every shipping Flux variant is **guidance-distilled**: the CFG behavior of the unreleased Flux.1 base model is trained into the student weights as a conditioning input, so the inference pipeline takes one forward pass with a `guidance_scale` scalar and **does not accept a `negative_prompt`**[^8][^9]. "No negative prompts" is a BFL-documented constraint, not a missing feature — ask for what you want, not what you don't[^10].
2. **Long, natural-language prompts work.** T5-XXL on Flux.1 and Mistral-3 on Flux.2 both carry **512 tokens** of conditioning (vs. CLIP's 77), and the models are trained on detailed captions, so paragraph-length prompts with camera, material, and typography specs outperform terse tag soup[^1][^10].
3. **Typography is SOTA among open weights.** Flux.1 [pro] sits at ~1068 ELO on the Artificial Analysis typography benchmark, second only to Ideogram 3[^11]; Flux.2 adds legible infographic and UI-mockup text at 4 MP and supports hex-code brand colors natively[^6][^10].
4. **Kontext collapses the edit loop.** Flux.1 Kontext takes an input image + instruction prompt and edits in-place while preserving identity — no inpainting mask, no ControlNet, no LoRA. This is the primitive that makes iterative asset generation (logo → favicon → OG card → splash) economically viable without a human Photoshop step[^4][^5].
5. **Finetuning with 1–5 images.** The BFL Flux Pro Finetuning API trains a persistent style/subject in minutes from a handful of examples and is portable across Flux.1 [pro] / 1.1 [pro] / Tools without re-training[^12]. Community LoRAs fill the logo/icon niche on open weights (LogoMaker1024, Logo Design V2, etc.)[^13].

The rest of this document covers the model family table, prompt semantics (including the guidance-distillation subtlety that trips up practitioners coming from SDXL), text-rendering benchmarks, asset-specific prompting patterns, and the ecosystem integrations that matter in production.

## Model Family Table

| Model                          | Released  | Params | License               | Text encoder(s)                  | Steps (typ.) | Guidance   | Negative prompt | Primary use                                   |
| ------------------------------ | --------- | ------ | --------------------- | -------------------------------- | ------------ | ---------- | --------------- | --------------------------------------------- |
| Flux.1 [pro]                   | 2024-08-01| 12B    | API-only              | T5-XXL + CLIP-L                  | ~50 (server) | distilled  | no              | Top-quality T2I, API only[^1]                 |
| Flux.1 [dev]                   | 2024-08-01| 12B    | FLUX-1 Non-Commercial | T5-XXL + CLIP-L                  | 28–50        | 3.5 (def.) | no              | Open-weights reference T2I[^2][^9]            |
| Flux.1 [schnell]               | 2024-08-01| 12B    | Apache 2.0            | T5-XXL + CLIP-L                  | 1–4          | 0 (baked)  | no              | Local/fast; step-distilled (ADD)[^14]         |
| Flux.1.1 [pro]                 | 2024-10-02| 12B    | API-only              | T5-XXL + CLIP-L                  | ~30 (server) | distilled  | no              | 6× faster than 1 [pro], highest ELO in '24[^15]|
| Flux.1.1 [pro] Ultra (+ Raw)   | 2024-11   | 12B    | API-only              | T5-XXL + CLIP-L                  | server       | distilled  | no              | 4 MP output, photographic "raw" mode[^16]     |
| Flux.1 Fill [pro/dev]          | 2024-11-21| 12B    | API / Non-Commercial  | T5-XXL + CLIP-L                  | 28–50        | distilled  | no              | Mask-based inpaint + outpaint[^3]             |
| Flux.1 Depth [pro/dev]         | 2024-11-21| 12B    | API / Non-Commercial  | T5-XXL + CLIP-L                  | 28–50        | distilled  | no              | Depth-conditioned retexture[^3]               |
| Flux.1 Canny [pro/dev]         | 2024-11-21| 12B    | API / Non-Commercial  | T5-XXL + CLIP-L                  | 28–50        | distilled  | no              | Edge-preserving retexture[^3]                 |
| Flux.1 Redux                   | 2024-11-21| adapter| API / Non-Commercial  | —                                | n/a          | n/a        | no              | Image-variation / style transfer adapter[^3]  |
| Flux Pro Finetuning            | 2025-01-16| LoRA   | API-only              | inherits from base               | 28–50        | distilled  | no              | 1–5-shot persons / brands / stickers[^12]     |
| Flux.1 Kontext [pro/max]       | 2025-05   | 12B    | API-only              | T5-XXL + CLIP-L                  | server       | distilled  | no              | Instruction-based image editing[^4][^5]       |
| Flux.1 Kontext [dev]           | 2025-06   | 12B    | FLUX-1 Non-Commercial | T5-XXL + CLIP-L                  | 28–50        | distilled  | no              | Open-weights Kontext[^4]                      |
| **Flux.2 [pro]**               | 2025-11-25| —      | API-only              | **Mistral-3 24B VLM**            | server       | distilled  | no              | Frontier quality, 4 MP, 10-ref edit[^6]       |
| **Flux.2 [flex]**              | 2025-11-25| —      | API-only              | Mistral-3 24B VLM                | 6–50 (user)  | 1.5–10     | no              | Dev-tunable steps + guidance[^6][^10]         |
| **Flux.2 [dev]**               | 2025-11-25| **32B**| FLUX-2 Non-Commercial | Mistral-3 24B VLM                | 28–50        | distilled  | no              | Open-weights frontier; ~80 GB VRAM bf16[^6][^7]|
| **Flux.2 [klein]**             | 2026 (beta)| 4B/9B | Apache 2.0            | Mistral-3 24B VLM (distilled)    | 4–8          | distilled  | no              | Size-distilled sub-second consumer-GPU[^6]    |
| Flux.2-VAE                     | 2025-11-25| VAE    | Apache 2.0            | —                                | n/a          | n/a        | —               | New latent space for all Flux.2 checkpoints[^6]|

**Architecture recap.** Flux.1's 12B generator is a hybrid MM-DiT with 19 `DoubleStreamBlock` layers (SD3-style joint attention between image and text streams) and 38 `SingleStreamBlock` layers (concatenated-sequence parallel-attention blocks), trained with rectified flow and 2D RoPE[^2]. Flux.2 keeps the rectified-flow backbone but swaps the text stack entirely for Mistral-3 24B VLM and retrains the VAE for better learnability/quality/compression[^6].

## Prompt Semantics

### Guidance distillation: what `guidance_scale` actually is

This is the most frequently mis-modeled part of Flux and it has direct consequences for any enhancement layer built on top.

Classifier-free guidance (CFG) in diffusion is the linear extrapolation
\[ \epsilon_{\text{CFG}} = \epsilon(x_t, \emptyset) + w\cdot(\epsilon(x_t, c) - \epsilon(x_t, \emptyset)) \]
between the unconditional and conditional noise predictions. It requires **two forward passes per step** (with and without the prompt) and, critically, it's where `negative_prompt` plugs in — the unconditional branch is swapped for a branch conditioned on the negative prompt.

Flux.1 [dev] is **guidance-distilled** from the unreleased Flux.1 base[^8][^9]. During distillation the student learns to predict, in one forward pass, what the teacher produced with classical CFG at a **randomly sampled** `w` that is then fed to the student as a conditioning scalar[^8]. The HuggingFace model card documents this as the "Trained using guidance distillation, making Flux.1 [dev] more efficient" line item[^2]. Concretely:

- There is **no unconditional branch left to hijack**. There is no second forward pass, so there is nowhere to inject a negative prompt[^9][^10].
- `guidance_scale` is now a **conditioning input to the model**, not an extrapolation coefficient. The diffusers `FluxPipeline` default is `3.5`; BFL's reference repo documents the useful range roughly as 2.5–4.5 for photorealism and 3.5–7 for stylized work[^2][^17].
- Flux.1 [schnell] goes one further: it's **timestep-distilled** (adversarial diffusion distillation, ADD-style) to 1–4 steps, with guidance = 0 baked in. Passing a `guidance_scale` has no effect[^14].
- Every downstream checkpoint — Flux.1 Fill/Depth/Canny/Redux, Kontext, Flux.2 — inherits this property. BFL's Flux.2 prompting guide makes it explicit: *"No negative prompts: FLUX.2 does not support negative prompts. Focus on describing what you want, not what you don't want."*[^10]

**Practical implication for a prompt enhancer:** `negative_prompt` must be rewritten into **affirmative descriptions** before hitting a Flux endpoint. `"no blur, no watermark, no extra fingers"` becomes `"sharp focus throughout, clean un-watermarked composition, anatomically correct hands"`. Enhancement layers that silently pass a `negative_prompt` field (common in SDXL-era tooling) will either 400 or silently drop it[^10].

**Workaround research.** Community work ("CFG-distillation Forge experiment," semi-de-distillation, "true CFG" with inverse-cosine timestep remapping[^18]) shows that negative prompts can be partially re-enabled by re-introducing a second forward pass and perturbing the distilled schedule. These are research curiosities; no production endpoint (BFL API, fal.ai, Replicate, Runware, Together) exposes them. Treat them as out of scope.

### Text encoders and length

Flux.1 uses **dual text encoders**: CLIP-L (77 tokens, contributes to pooled aesthetic/style signal) and **T5-XXL** (512 tokens, contributes to the per-token cross-attention that the MM-DiT joint attention consumes)[^2]. The CLIP path is frozen and relatively weak; the T5 path is where long-prompt comprehension lives. Consequences:

- Prompts beyond 77 tokens are **fine** — they route into T5-XXL — so "SDXL truncation at 77" intuition does not apply.
- Natural-language sentences outperform comma-separated tag lists. T5 was trained on prose; CLIP tolerates tags but T5 cares about grammar and structure. BFL's Flux.2 guide recommends a **Subject + Action + Style + Context** scaffold and notes that word order matters, with early tokens weighted more heavily[^10].
- Multilingual prompts work out of the box on Flux.2 because Mistral-3 is a multilingual VLM; BFL recommends prompting in the language of the target cultural context[^10]. On Flux.1 multilingual performance is weaker (T5-XXL is English-biased).

Flux.2's **Mistral-3 24B VLM** replaces the whole T5+CLIP stack[^6][^7]. The VLM is trained for tool-using assistant behavior, which is what enables:

- **JSON-structured prompts** with `scene` / `subjects[]` / `style` / `color_palette` / `camera` fields being interpreted semantically rather than as literal strings[^10].
- **Hex color codes** associated with specific subjects (`"Apple: #0047AB"`, `"Sleeves: strictly in color #86E04A lime green"`) being honored with surprising fidelity[^10].
- **Multi-reference editing** (up to 10 input images) with described roles — Mistral is doing genuine cross-modal reasoning over the reference stack, not just averaging adapter features[^6].
- **~32K effective context** for the prompt via the VLM, against Flux.1's 512-token T5 ceiling[^7].

### Guidance value cheatsheet (empirical consensus)

| Model         | Low guidance (loose, painterly) | Balanced (default) | High guidance (literal, saturated) |
| ------------- | ------------------------------- | ------------------ | ---------------------------------- |
| Flux.1 [dev]  | 2.0–2.5                         | **3.5**            | 4.5–6.0                            |
| Flux.1 [schnell] | n/a (baked guidance = 0)     | n/a                | n/a                                |
| Flux.1 [pro] / 1.1 [pro] | server-tuned         | server-tuned       | server-tuned                       |
| Flux Kontext  | server-tuned                    | server-tuned       | server-tuned                       |
| Flux.2 [flex] | 1.5–2.5                         | 3.5–4.5            | 5.5–10                             |

Higher guidance ≠ "better." On Flux.1 [dev], values above ~6 produce over-saturation, plastic skin, and hand/finger distortion; the model's training distribution is centered on 3.5[^2][^17].

## Text Rendering Benchmarks

Flux is the first open-weights family to make in-image text generation reliable enough for asset work. Relative standing (as of late 2025 / early 2026):

- **Ideogram 3** leads at ~90% correct-text accuracy on the Artificial Analysis typography benchmark; **Flux.1 [pro]** is second at ~1068 ELO, clearly above DALL-E 3, Midjourney v6, and SD3 Ultra[^11][^19]. The gap between Ideogram and Flux narrowed with Flux.1.1 [pro] and is closing on Flux.2.
- On the WaveSpeed reproducible "Qwen-Image-2512 vs SDXL vs Flux" text-in-image benchmark (Nov 2025), Flux produces correct text in every test image while SDXL reliably hallucinates characters; Qwen-Image (28.85B MM-DiT) edges out Flux.1 on *long* text spans[^20].
- **Flux.2** specifically targets production typography — the BFL launch post headlines "infographics, memes, and UI mockups with legible fine text now work reliably in production"[^6]. The JSON-prompt affordance with hex colors is designed for brand-consistent typography work[^10].
- Community testing by ndurner[^19] shows Flux.1 handles short slogans and logo wordmarks cleanly at 1024² but degrades on paragraph-length text (kerning collapses, letter substitution increases). For asset generation this means: wordmarks and short ≤5-word slogans are viable; poster copy is still fragile on Flux.1 and only becomes reliable on Flux.2 / Kontext's text-editing mode.

### Text-prompting syntax that works

From BFL's Kontext and Flux.2 guides, corroborated by community practice:

1. **Quote the exact string.** `Replace 'joy' with 'BFL'` on Kontext, or `The text "OPEN" appears in red neon letters above the door` on Flux.2[^5][^10].
2. **Specify style, size, and placement separately.** "Large headline text," "small body copy," "elegant serif typography," "bold industrial lettering." Vague words like "fancy font" underspecify.
3. **Bind colors to specific text objects with hex.** `The logo text 'ACME' in color #FF5733`[^10].
4. **Keep replacement length similar** in Kontext edits — dramatically longer or shorter strings reflow the layout and can break image composition[^5].
5. **Use clear fonts in source material** when doing text editing; Kontext struggles to preserve heavily stylized fonts across an edit[^5].

## Asset-Specific Patterns

### Logos and wordmarks (Flux.1 / Flux.2)

Flux is SOTA for open-weights logo generation because it combines T5/VLM semantic comprehension with strong typography. Production prompt patterns that consistently work:

- **Isolate the subject.** `"A minimalist vector logo for a note-taking app, centered on a pure white background, clean flat design, no photorealistic elements, strong negative space, scalable geometry."` Describe the background you want (white, transparent-looking) rather than asking for "no background."
- **Name the logo archetype.** "Monogram logo," "wordmark," "combination mark," "mascot logo," "abstract geometric mark." These terms survive T5 semantics cleanly.
- **Constrain palette explicitly.** On Flux.2, `color_palette` with 2–3 hex codes; on Flux.1, natural-language `"palette limited to deep navy #0A1F44 and warm coral #FF6B6B, no other colors."`
- **For true transparency**, Flux does not natively output RGBA; downstream matting (RMBG-1.4, BiRefNet) is still required. Prompting for "on a pure white background" then alpha-matting is the reliable pipeline — see category 13 and 16 for details.
- **Iterate with Kontext.** Once a logomark is acceptable, Kontext handles "same logo in black," "flip to horizontal lockup," "replace 'ACME' with 'ZENO'" without re-rolling the generation[^5].

### App icons

Flux has no built-in notion of iOS/Android icon specs (no safe-zone, no squircle mask), so prompt-side constraints carry the load:

- `"A square 1024×1024 iOS app icon for a meditation app, rounded-square flat illustration, single central glyph with heavy padding (~15% margin on all sides), no text, no UI chrome, vibrant gradient from #7BB7F5 to #B589D6, clean Apple HIG aesthetic."`
- Generate at 1024² (or 2048² on Flux.2 for 4 MP headroom), then downsample + mask-apply in post. See category 09 for platform-specific pipeline detail.
- Community LoRAs (LogoMaker1024, Logo Design V2) pin a consistent icon aesthetic — useful if you want "our brand's icon family" rather than a one-off[^13].

### Illustrations, OG cards, hero images

- **Flux.2's JSON prompts are the best tool** for multi-element marketing graphics because you can assign hex colors to each element and keep them stable across regeneration[^10].
- **Kontext's iterative-edit loop** is the right primitive for producing a family of assets (1200×630 OG card → 1080×1080 Instagram → 512×512 favicon source) from one canonical generation, preserving type and palette[^4][^5].
- For "empty state" illustrations and onboarding art, Flux.1 [dev] + a style-enhancing LoRA (e.g. Best of Flux v3[^13]) at guidance 3–3.5 produces more polished results than Flux.1.1 [pro] out of the box, which leans photographic.

### Brand-consistent generation (1–5-shot)

- **Flux Pro Finetuning API** takes 1–5 example images and returns a finetune ID applicable across Flux.1 [pro] / 1.1 [pro] / Fill / Depth / Canny / Redux without retraining[^12]. BFL's user-study claims 68.9% preference over competing finetuning services[^12]. `finetune_strength` parameter (0–2, default 1.0) trades off identity vs. prompt following[^21].
- **Kontext + reference image** is the no-training path: pass the brand reference + instruction ("same visual style, now as an error-state illustration with a broken pencil") and let Kontext do identity preservation in-context[^5].
- **Flux.2 multi-reference** (up to 10 images, subject to a 9 MP input+output budget on [pro]) is the production-grade version of the same idea and eliminates the LoRA training step for most brand-consistency work[^6][^10].

### The "no negative prompt" survival guide

Because the entire family rejects `negative_prompt`, common artifact-avoidance recipes need translation:

| Negative-prompt phrase (SDXL)              | Flux affirmative rewrite                                          |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `blurry, low quality, jpeg artifacts`      | "tack-sharp, high-resolution, lossless detail"                    |
| `watermark, signature, text`               | "clean unmarked composition, no signature or text overlay" (describing absence as presence of cleanness works) |
| `extra limbs, deformed hands, bad anatomy` | "anatomically correct, five fingers per hand, natural proportions"|
| `cartoon, anime, painting`                 | "photorealistic, shot on Sony A7 IV, 50mm f/1.8"                  |
| `text, letters, words`                     | Rarely needed on Flux (it doesn't hallucinate text unless prompted); if necessary, describe "no embedded text, no typography, purely visual composition" |

## Ecosystem Integrations

Flux is deployed across essentially every commercial T2I API and every major local inference stack. Knowing the schema differences matters for any enhancement layer that has to target them.

### fal.ai

- Canonical endpoints: `fal-ai/flux/schnell`, `fal-ai/flux/dev`, `fal-ai/flux-pro/v1.1`, `fal-ai/flux-pro/v1.1-ultra`, `fal-ai/flux-pro/kontext`, `fal-ai/flux-2` (dev/pro/flex)[^22][^23].
- Schema is consistent: `prompt`, `image_size` (enum: `square_hd`, `portrait_16_9`, etc.), `num_inference_steps` (1–12 for schnell, 1–50 for dev), `guidance_scale` (1–20, default 3.5), `seed`, `num_images`, `enable_safety_checker`, `output_format` (jpeg/png), `acceleration` (none/regular/high)[^22][^23].
- Notably absent: `negative_prompt`. This is deliberate and matches BFL's model semantics[^10].

### Replicate

- Canonical endpoints: `black-forest-labs/flux-schnell`, `flux-dev`, `flux-pro`, `flux-1.1-pro`, `flux-1.1-pro-ultra`, `flux-kontext-pro`, `flux-2-dev`[^16][^24].
- Flux 1.1 [pro] Ultra adds `raw` (boolean) for less-processed photographic output, `image_prompt` + `image_prompt_strength` for Redux-style variation, `safety_tolerance` (1–6)[^16].
- Replicate's flux-pro-finetuned schema exposes `finetune_id` and `finetune_strength` per the BFL Finetuning API[^21].

### Runware / Together / Cloudflare / DeepInfra / Verda

All listed as Flux.2 launch partners by BFL[^6]; schemas mirror BFL's API (`guidance`, `steps`, `aspect_ratio`, `prompt_upsampling` boolean that auto-enriches short prompts into Mistral-friendly long form[^10]).

### Local inference

- **diffusers**: `FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-dev", torch_dtype=torch.bfloat16)`; requires ~24 GB VRAM at bf16, ~12 GB with `enable_model_cpu_offload()`, ~8 GB with 4-bit quantization[^2].
- **ComfyUI**: native nodes since 2024-08; Flux.2 [dev] support landed at launch with an NVIDIA-collaborated fp8 path that runs on RTX 4090-class GPUs at ~14–18 GB VRAM[^6][^7].
- **Forge / sd-webui-forge**: full Flux.1 + Tools support, including community CFG-distillation experiments[^3][^18].
- **GGUF quantizations** (second-state, unsloth, city96): Flux.1 [dev] at Q4–Q8 runs on 16 GB VRAM GPUs with modest quality loss; T5-XXL Q4_1 is 3.06 GB, Q5_1 is 3.67 GB[^25].

## Practical Takeaways for a Prompt Enhancer

1. **Strip or rewrite any `negative_prompt`** before dispatch; convert to affirmative descriptions[^10].
2. **Normalize `guidance_scale` to 3.5** as a default for Flux.1 [dev] / Flux.2 [flex]; omit for schnell and for pro/ultra endpoints that don't expose it[^2][^10][^14].
3. **Prefer prose** (Subject + Action + Style + Context) over comma tags; set `max_sequence_length=512` on diffusers to unlock the full T5 context[^2][^10].
4. **On Flux.2, emit JSON prompts with hex-coded subjects** rather than natural-language color descriptions[^10].
5. **Route edits through Kontext or Flux.2 multi-reference** rather than re-rolling from text — identity preservation is the whole point of those checkpoints[^4][^5][^6].
6. **Offer `prompt_upsampling=true` as a caller option on Flux.2** for short user prompts; it's the BFL-blessed way to turn "a logo for my app" into a rich prompt[^10].

## Sources

[^1]: Black Forest Labs. **Announcing Black Forest Labs & FLUX.1.** Official launch post, 2024-08-01. Documents the 12B rectified-flow transformer, three variants (Pro / Dev / Schnell), guidance distillation for [dev], and ADD step-distillation for [schnell]. https://blackforestlabs.ai/announcing-black-forest-labs/ (mirror: https://bfl.ai/blog/24-08-01-bfl)

[^2]: Black Forest Labs. **FLUX.1 [dev] model card.** HuggingFace, `black-forest-labs/FLUX.1-dev`. Canonical source for `guidance_scale=3.5`, `max_sequence_length=512`, `num_inference_steps=50` defaults and the "trained using guidance distillation" language. https://huggingface.co/black-forest-labs/FLUX.1-dev

[^3]: Black Forest Labs. **Introducing FLUX.1 Tools.** Official announcement, 2024-11-21. Documents Flux.1 Fill, Depth, Canny, and Redux as guidance-distilled [dev]/[pro] variants for inpainting/outpainting, depth-guided retexture, edge-guided retexture, and image-variation. https://blackforestlabs.ai/flux-1-tools/ (mirror: https://bfl.ai/blog/24-11-21-tools)

[^4]: Black Forest Labs. **Introducing FLUX.1 Kontext and the BFL Playground.** Official announcement, 2025-05. Documents Kontext [pro/max/dev] — in-context image generation, character consistency, local editing, text editing, iterative edits with minimal latency. https://blackforestlabs.ai/blog/flux-1-kontext (product page: https://bfl.ai/models/flux-kontext)

[^5]: Black Forest Labs. **Prompting Guide — Image-to-Image (Flux.1 Kontext).** BFL docs. Authoritative source for quotation-mark text editing (`Replace 'joy' with 'BFL'`), character-consistency framework ("This person…"), identity-preservation language, and visual-cue annotation boxes. Documents 512-token prompt limit. https://docs.bfl.ai/guides/prompting_guide_kontext_i2i

[^6]: Black Forest Labs. **FLUX.2: Frontier Visual Intelligence.** Official announcement, 2025-11-25. Introduces Flux.2 [pro/flex/dev 32B/klein], Mistral-3 24B VLM text encoder, multi-reference support (10 images), 4 MP output, retrained VAE, and launch partners (fal, Replicate, Runware, Verda, TogetherAI, Cloudflare, DeepInfra). https://bfl.ai/blog/flux-2

[^7]: Black Forest Labs. **flux2 reference inference repository.** GitHub. Canonical source for Flux.2 [dev] 32B architecture, inference code, and fp8 implementation for consumer GPUs. https://github.com/black-forest-labs/flux2

[^8]: HuggingFace community. **"What is guidance-distilled?"** Discussion on `black-forest-labs/FLUX.1-dev`. Explains that Flux.1 [dev] was trained to reproduce Flux.1 [pro]'s CFG output in a single forward pass, with the guidance scale fed as a conditioning input. https://huggingface.co/black-forest-labs/FLUX.1-dev/discussions/17

[^9]: HuggingFace Diffusers. **Flux pipeline documentation.** Documents `FluxPipeline` API, lack of `negative_prompt` argument, `guidance_scale` semantics on a distilled model, and usage of the dual CLIP-L + T5-XXL encoders. https://huggingface.co/docs/diffusers/main/en/api/pipelines/flux

[^10]: Black Forest Labs. **Prompting Guide — FLUX.2 [pro] & [max].** BFL docs. Authoritative source for "No negative prompts", Subject + Action + Style + Context scaffold, JSON structured prompts with `color_palette` / `camera` fields, hex-code color binding, `prompt_upsampling` parameter, guidance 1.5–10 range on [flex], and multi-language prompting. https://docs.bfl.ai/guides/prompting_guide_flux2

[^11]: NestContent. **Text to Image AI: 15 Generators Tested and Ranked (2026).** Reports Artificial Analysis typography ELO: Ideogram 3 ~90% accuracy, Flux.1 [pro] ~1068 ELO second place, ahead of DALL-E 3, Midjourney v6, and SD3 Ultra. http://www.nestcontent.com/blog/text-to-image-ai

[^12]: Black Forest Labs. **Announcing the FLUX Pro Finetuning API.** Official announcement, 2025-01-16. Documents 1–5-image finetuning, 68.9% user-study preference over competitors, and portability across Flux.1 [pro] / 1.1 [pro] / Tools. https://blackforestlabs.ai/blog/25-01-16-finetuning

[^13]: Civitai. **Flux logo/icon LoRAs — LogoMaker1024, Logo Design V2, Best of Flux v3.** Community finetunes targeting icon/logo style on Flux.1 [dev]; documents trigger words, recommended weights (0.4–1.0), and training recipes (9K–15K steps, 8 epochs at 1024²). https://civitai.com/models/757432/logomaker1024-classic-and-cartoon-logotypes-or-flux1-d-lora , https://civitai.com/models/1929020/logo-design-v2 , https://civitai.com/models/821668

[^14]: Black Forest Labs. **FLUX.1 [schnell] model card and Apache 2.0 license.** HuggingFace / GitHub. Documents latent adversarial diffusion distillation to 1–4 steps and the Apache 2.0 license enabling commercial use. https://huggingface.co/black-forest-labs/FLUX.1-schnell , https://github.com/black-forest-labs/flux/blob/main/model_licenses/LICENSE-FLUX1-schnell

[^15]: Black Forest Labs. **Announcing FLUX1.1 [pro] and the BFL API.** Official announcement, 2024-10-02. Documents 6× speedup vs. Flux.1 [pro], highest Artificial Analysis ELO at launch, native 2K resolution, and BFL API pricing (Flux.1 [dev] 2.5¢, Flux.1 [pro] 5¢, Flux 1.1 [pro] 4¢ per image). https://blackforestlabs.ai/announcing-flux-1-1-pro-and-the-bfl-api/

[^16]: Replicate. **`black-forest-labs/flux-1.1-pro-ultra` API schema.** Documents `raw` (boolean, default false), `image_prompt`, `image_prompt_strength` (default 0.1), `aspect_ratio`, `safety_tolerance` (1–6). https://replicate.com/black-forest-labs/flux-1.1-pro-ultra/api

[^17]: Black Forest Labs. **FLUX reference inference repository.** GitHub. Canonical source for the `DoubleStreamBlock`/`SingleStreamBlock` architecture, `FluxGuidance` head, and recommended guidance ranges. https://github.com/black-forest-labs/flux

[^18]: Civitai Articles. **Success. Semi-DeDistilling all Flux models at once; Flux1D Distillation CFG Forge Experiment.** Community research on re-enabling true CFG and negative prompts on distilled Flux via inverse-cosine timestep remapping. https://civitai.com/articles/9984

[^19]: ndurner. **FLUX.1: Examining Text Rendering Capabilities in AI Image Generation.** Empirical testing of Flux.1 typography across wordmarks, slogans, and paragraph-length copy; documents kerning and multi-sentence failure modes. https://ndurner.github.io/flux-text

[^20]: WaveSpeedAI Blog. **Reproducible Benchmark: Qwen Image 2512 vs SDXL vs Flux for Text-in-Image.** 2025-11. Documents per-image correctness on a shared test set; Flux produces correct text in every test image while SDXL hallucinates characters. https://wavespeed.ai/blog/posts/qwen-2512-vs-sdxl-flux-text-benchmark

[^21]: Replicate. **`black-forest-labs/flux-pro-finetuned` README.** Documents `finetune_id` and `finetune_strength` (0–2, default 1.0) semantics for deploying BFL Finetuning API outputs. https://replicate.com/black-forest-labs/flux-pro-finetuned/readme

[^22]: fal.ai. **Flux Schnell API reference.** Documents endpoint `fal-ai/flux/schnell`, `num_inference_steps` 1–12 default 4, `guidance_scale` 1–20 default 3.5, `image_size` enum, `acceleration` none/regular/high. https://fal.ai/docs/model-api-reference/image-generation-api/flux-schnell

[^23]: fal.ai. **Flux Dev API reference.** Documents endpoint `fal-ai/flux/dev`, `num_inference_steps` 1–50 default 28, `guidance_scale` 1–20 default 3.5, consistent schema with Schnell minus `acceleration`. https://fal.ai/docs/model-api-reference/image-generation-api/flux-dev

[^24]: Replicate. **FLUX.1 [schnell] README.** Replicate-side schema for the Apache-licensed Flux variant; 1–4 steps, no guidance, aspect ratio presets. https://replicate.com/black-forest-labs/flux-schnell/readme

[^25]: HuggingFace. **second-state / FLUX.1-dev-GGUF** and **unsloth / FLUX.1-dev-GGUF.** Quantized Flux.1 [dev] weights for consumer-GPU inference; T5-XXL Q4_1 ≈ 3.06 GB, Q5_1 ≈ 3.67 GB. https://huggingface.co/second-state/FLUX.1-dev-GGUF , https://huggingface.co/unsloth/FLUX.1-dev-GGUF
