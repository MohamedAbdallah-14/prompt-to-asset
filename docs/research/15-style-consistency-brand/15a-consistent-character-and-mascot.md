---
category: 15-style-consistency-brand
angle: 15a
angle_title: Consistent character / mascot / product across images — DreamBooth, Textual Inversion, LoRA, IP-Adapter, InstantID, PhotoMaker, MJ --cref, Ideogram character ref, Flux Redux, gpt-image-1, Gemini 2.5 Flash
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/2208.12242
  - https://arxiv.org/abs/2208.01618
  - https://arxiv.org/abs/2106.09685
  - https://arxiv.org/abs/2308.06721
  - https://arxiv.org/abs/2401.07519
  - https://arxiv.org/abs/2312.04461
  - https://arxiv.org/abs/2404.16022
  - https://github.com/tencent-ailab/IP-Adapter
  - https://github.com/InstantID/InstantID
  - https://github.com/TencentARC/PhotoMaker
  - https://github.com/ToTheBeginning/PuLID
  - https://docs.midjourney.com/docs/character-reference
  - https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/character-reference
  - https://blackforestlabs.ai/flux-1-tools/
  - https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/
  - https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/
---

# Consistent Character, Mascot, and Product Across Many Images

## Executive Summary

- **Subject consistency is a spectrum, not a binary.** The cheapest techniques (MJ `--cref`, Ideogram Character Reference, Gemini 2.5 Flash "Nano Banana" conversational edits, gpt-image-1 multi-image prompting) require **zero training** and work in seconds, but leak 10–30% identity drift per image. Mid-tier techniques (IP-Adapter-Plus, IP-Adapter-FaceID, InstantID, PhotoMaker, PuLID) are **training-free adapters** that run at inference time and hold face/product identity tighter. The top tier — **DreamBooth, LoRA, Textual Inversion** — actually teaches the base model a new proper noun, giving the strongest fidelity at the cost of 15–60 minutes of training per concept.
- **DreamBooth's prior-preservation loss is what separates it from naive fine-tuning.** Ruiz et al. (CVPR 2023, [arXiv:2208.12242](https://arxiv.org/abs/2208.12242)) pair a rare-token instance prompt (`a [V] dog`) with a class prompt (`a dog`) and generate 200+ regularization images before training, so the model learns "[V] dog" without forgetting the general concept "dog." Skipping this step collapses the class: every "dog" the model generates afterwards looks like the subject. For a **mascot LoRA**, the regularization images should be of the *class* (e.g. "a cartoon fox mascot"), not of random imagery.
- **LoRA is the practical default.** For mascots, products, and stylized characters, train a **rank-16 to rank-32 LoRA on 10–30 images** with prior-preservation, a rare trigger token (`ohwx`, `sks`, `zkz`), and captions that describe *everything except the subject's identity* (so the identity collapses onto the token). This beats full DreamBooth on disk size (≈40 MB vs 2–7 GB), composes with other LoRAs, and is the file format every downstream platform (Civitai, Replicate, fal, ComfyUI, Forge) already supports.
- **IP-Adapter-FaceID / InstantID / PhotoMaker / PuLID are the 2024 identity-adapter lineage.** All four bolt an extra cross-attention path into SD 1.5 / SDXL that injects a face embedding (ArcFace / CurricularFace). In order of release: IP-Adapter-FaceID (Aug 2023), PhotoMaker (Dec 2023), InstantID (Jan 2024), PuLID (Apr 2024). PuLID is the current state-of-the-art for identity + editability ([Guo et al. NeurIPS 2024, arXiv:2404.16022](https://arxiv.org/abs/2404.16022)) because it uses a contrastive alignment loss that preserves the base model's prompt-following ability, which InstantID and IP-Adapter-FaceID explicitly degrade.
- **Closed platforms converged on "reference images as conditioning."** Midjourney `--cref <url> --cw 0..100`, Ideogram Character Reference, Gemini 2.5 Flash Image multi-turn edits, and gpt-image-1 multi-image prompting (OpenAI cookbook) all expose the same product surface: upload 1–4 images, describe the new scene, get a variation. They are all closed-source black boxes, so you can't know if they are running IP-Adapter, LoRA-on-the-fly, or something else. For mascots and products (as opposed to faces) these platforms are often *better* than the open-source identity adapters because the adapters are trained on face datasets.
- **For a brand mascot appearing in 30 images, you almost never want a face adapter.** Use a LoRA (Flux or SDXL) + a locked seed + strong caption + `--cref`/Ideogram character ref only for quick variations. For a **single product in 20 lifestyle scenes**, use a LoRA *or* Flux Redux (image prompting) + Flux Fill for inpainting the product into scenes. Pure text-prompt consistency ("the same red backpack") without any reference mechanism is almost always inadequate past 3–4 images.

## Technique Comparison

| Technique | Training needed | Reference budget | Quality (identity) | Editability | Cost per concept | Best for |
|---|---|---|---|---|---|---|
| **DreamBooth (full)** | 800–1500 steps, 15–30 min on A100 | 3–5 images | ★★★★★ | ★★★ | 2–7 GB checkpoint | Face / product, max fidelity |
| **DreamBooth-LoRA** | 500–2000 steps, 10–25 min | 10–30 images | ★★★★ | ★★★★ | 20–150 MB | **Default for mascots, brand characters** |
| **Textual Inversion** | 3–5k steps, 20–60 min | 3–5 images | ★★ | ★★★★★ | 3–8 KB | Style-only; poor for faces |
| **IP-Adapter-Plus** | None | 1 image | ★★★ | ★★★★ | Free | Style / composition transfer |
| **IP-Adapter-FaceID** | None | 1 face image | ★★★★ | ★★ | Free | Human faces, SD/SDXL |
| **InstantID** | None | 1 face image | ★★★★ | ★★ | Free | Fast face ID with landmark control |
| **PhotoMaker v2** | None | 1–4 face images | ★★★★ | ★★★ | Free | Stacked-ID, multi-ref fusion |
| **PuLID** | None | 1 face image | ★★★★★ | ★★★★ | Free | **Best tuning-free face method (2024)** |
| **MJ `--cref`** | None | 1 image | ★★★ | ★★★ | $10–60/mo | Quick consistency in MJ V6 |
| **Ideogram Char-Ref** | None | 1–4 images | ★★★ | ★★★★ | $8–20/mo | Consistent characters w/ text |
| **gpt-image-1 multi-image** | None | 1–10 images | ★★★ | ★★★★★ | $0.04–0.19 / image | Storyboards, multi-scene |
| **Gemini 2.5 Flash Image** | None | conversation state | ★★★ | ★★★★★ | $0.039 / image | Conversational edits |
| **Flux Redux** | None | 1 image | ★★★ | ★★ | Free (weights) | Image-prompting in Flux |

Ease-of-use ranking (fastest to slowest time-to-first-image): Gemini 2.5 Flash ≈ gpt-image-1 ≈ MJ `--cref` ≈ Ideogram < IP-Adapter / InstantID / PuLID < LoRA < DreamBooth < Textual Inversion.

### Training-based methods (the deep end)

**DreamBooth** ([Ruiz et al., CVPR 2023, arXiv:2208.12242](https://arxiv.org/abs/2208.12242)) fine-tunes a diffusion model on 3–5 images of a subject, using a unique identifier token + class noun prompt (`a [V] dog`). The key technical contribution is the **class-specific prior preservation loss**: during training, half the batch is the subject pair (instance image, instance prompt), and the other half is synthesized class samples (class image generated by the frozen base model, class prompt). The loss jointly minimizes reconstruction on both pairs:

```
L_total = L_recon(x_instance, "a [V] dog")
        + λ · L_recon(x_class_prior,  "a dog")
```

Without this, the model collapses: "a dog in a forest" starts rendering the specific subject. The original paper uses Imagen; the community ports (diffusers `train_dreambooth.py`, [huggingface/diffusers](https://github.com/huggingface/diffusers/tree/main/examples/dreambooth)) target SD 1.5 / SDXL / Flux.

**Textual Inversion** ([Gal et al., ICLR 2023, arXiv:2208.01618](https://arxiv.org/abs/2208.01618), [NVIDIA page](https://research.nvidia.com/labs/par/publication/textual-inversion/)) takes the opposite approach: freeze the model entirely, and learn a single new token embedding `S*` in the text encoder's vocabulary such that `"a photo of S*"` reconstructs the training images. Because nothing is fine-tuned except 768 (SD 1.5) or 1280 (SDXL) floating-point values per token, the artifact is tiny (≈ 4 KB) and composable. The trade-off is weak fidelity — TI captures *style* and broad silhouette, but face details and fine textures escape a single embedding. Modern practice is **pivotal tuning** (TI + UNet LoRA together, as in the [huggingface SDXL LoRA advanced script](https://github.com/huggingface/blog/blob/main/sdxl_lora_advanced_script.md)), which outperforms either on its own.

**LoRA for subjects** ([Hu et al., arXiv:2106.09685](https://arxiv.org/abs/2106.09685), originally for LLMs) injects low-rank `B·A` matrices into the UNet's linear layers. For subject consistency, the community consensus for SD 1.5 / SDXL is **rank 16–32, alpha = rank, learning rate ≈ 1e-4 for UNet and 5e-5 for text encoder, 10–30 training images, 800–2000 steps, and prior-preservation** ([Segmind parameters guide](https://blog.segmind.com/dreambooth-lora-understanding-fine-tuning-parameters/), [huggingface PEFT DreamBooth LoRA](https://huggingface.co/docs/peft/v0.8.0/en/task_guides/dreambooth_lora)). For Flux, rank-16 is usually enough because Flux's MMDiT is much larger and richer than SDXL's UNet, so each parameter carries more weight ([ostris/ai-toolkit](https://github.com/ostris/ai-toolkit) is the de-facto Flux LoRA trainer in 2024–2025).

### Training-free identity adapters

**IP-Adapter** ([Ye et al., arXiv:2308.06721](https://arxiv.org/abs/2308.06721), [tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter)) adds a separate cross-attention path for image features (from CLIP ViT-H/14 or CLIP ViT-L/14), decoupled from the text cross-attention. The base model stays frozen; only the 22M-parameter adapter trains. Two variants matter for consistency:

- **IP-Adapter-Plus** uses a perceiver resampler and more image tokens, giving tighter composition transfer. Good for "render this mascot silhouette in a new scene."
- **IP-Adapter-FaceID / FaceID-Plus / FaceID-Portrait** replace CLIP with ArcFace face-recognition embeddings, dramatically improving identity for human faces but destroying general-image compatibility. `FaceID-Portrait` takes up to 5 images and averages the ID embeddings.

**InstantID** ([Wang et al., arXiv:2401.07519](https://arxiv.org/abs/2401.07519), [github.com/InstantID/InstantID](https://github.com/InstantID/InstantID)) combines three tricks:
1. A face embedding (from a frozen face-recognition backbone, typically insightface antelopev2).
2. An **IdentityNet** — a lightweight ControlNet branch conditioned on face landmarks, giving strong spatial control.
3. An image prompt adapter (like IP-Adapter) that injects the face embedding into the UNet.

InstantID's identity fidelity exceeds IP-Adapter-FaceID but — critically for brand work — its landmark ControlNet forces the output face to match the input pose, which is often *not* what you want for a mascot that needs to appear in diverse poses. You can disable the landmark ControlNet at inference to recover pose flexibility.

**PhotoMaker v1/v2** ([Li et al., CVPR 2024, arXiv:2312.04461](https://arxiv.org/abs/2312.04461), [TencentARC/PhotoMaker](https://github.com/TencentARC/PhotoMaker)) encodes **multiple** input ID images into a single "stacked ID embedding." It replaces the text class token (e.g. "man") in your prompt with the fused ID embedding. The clever bit: because the ID embedding *is* a token, it composes naturally with text. PhotoMaker v2 (July 2024) adds a dedicated ID encoder that significantly closes the gap with InstantID on face fidelity while preserving text editability better.

**PuLID** ([Guo et al., NeurIPS 2024, arXiv:2404.16022](https://arxiv.org/abs/2404.16022), [ToTheBeginning/PuLID](https://github.com/ToTheBeginning/PuLID)) is the current champion of tuning-free identity adapters. Its contribution is a **contrastive alignment loss** that forces ID insertion to *not* disrupt the base model's native generation path. Practically: InstantID and IP-Adapter-FaceID trade prompt-following for identity (your "samurai in the rain" prompt gets flattened as you crank up the ID weight), whereas PuLID preserves the base model's behavior. Benchmarks in the paper and the [Neurips 2024 comparison](https://proceedings.neurips.cc/paper_files/paper/2024/file/409fcc9d24b549969b8b9be68b56a7be-Paper-Conference.pdf) show PuLID beating all three predecessors on both ID fidelity *and* editability. A Flux port exists ([PuLID-Flux](https://github.com/ToTheBeginning/PuLID/tree/main)).

A practitioner's shootout ([8PixLabs, 2024](https://8pixlabs.com/which-ai-face-swap-is-the-best-pulid-vs-instantid-vs-faceid/)) ranks PuLID > InstantID > IP-Adapter-FaceID on both fidelity and "didn't nuke my style" — matching the paper claims.

### Closed-platform reference systems

**Midjourney `--cref` + `--cw`.** Introduced for MJ V6 in March 2024 ([updates.midjourney.com/character-refs](https://updates.midjourney.com/character-refs/), [docs.midjourney.com/docs/character-reference](https://docs.midjourney.com/docs/character-reference)). Usage: `/imagine prompt: a pirate in a tavern --cref <url> --cw 100`. The character weight `--cw` ranges 0–100: `--cw 100` (default) applies face + hair + clothing; `--cw 50` keeps face + hair; `--cw 0` keeps face only. Multiple `--cref` images blend traits. Critically, **`--cref` is V6/Niji-6 only**; V7 replaces it with **Omni Reference** (`--oref`), which also handles objects, products, and animals, not just characters ([ImaginePro guide, 2025](https://imaginepro.ai/blog/2025/7/midjourney-character-reference-guide)). Best practice: use a clean, front-facing, MJ-generated reference image; non-MJ photos work but yield weaker consistency.

**Ideogram Character Reference** ([docs.ideogram.ai/…/character-reference](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/character-reference)). Launched with Ideogram 3.0. Upload a portrait (or pick a prior generation), and Ideogram fuses the identity into the new prompt. Because Ideogram 3.0 also excels at in-image text, this is the default platform when a character needs to hold a sign or appear in a logo. The UI supports multiple character slots; the public API (`POST https://api.ideogram.ai/v1/ideogram-v3/generate`, [developer.ideogram.ai](https://developer.ideogram.ai/api-reference/api-reference/generate-v3)) exposes character reference programmatically.

**gpt-image-1 / gpt-image-1.5 multi-image prompting** ([OpenAI cookbook guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)). The canonical pattern is to index images explicitly in text:

```
Image 1: our mascot (the red fox holding a pencil).
Image 2: a pastel watercolor style reference.
Task: redraw Image 1 in the style of Image 2, seated at a wooden desk.
Keep the mascot's fur color, ear shape, and collar identical to Image 1.
```

gpt-image-1.5 is specifically called out for "robust identity preservation for edits and character consistency across multi-step workflows" and for "building multi-page illustrations where characters look the same across different scenes" — i.e., storyboards and brand work.

**Gemini 2.5 Flash Image ("Nano Banana")** ([Google Developers Blog, Aug 2025](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)). The headline is *conversational consistency*: the model holds the subject across a chat session, so you iterate with "change the jacket to navy," "now put him on a beach," "add a golden-hour sunset." The natively-multimodal architecture processes text + image in a unified step, which is why consistency across turns is better than stateless Imagen calls. For brand mascots this is extremely fast to iterate but weaker than a LoRA for strict canonical appearance.

**Flux Redux / Fill / Depth** ([blackforestlabs.ai/flux-1-tools](https://blackforestlabs.ai/flux-1-tools/), [stable-diffusion-art.com/flux-redux](https://stable-diffusion-art.com/flux-redux/)). BFL shipped Flux Redux as their official IP-Adapter-equivalent for Flux.1 in November 2024. Redux is *aggressively* reference-dominant — it overrides your text prompt more than IP-Adapter does. Useful for "render this product silhouette in a new scene," less useful when you want a specific creative direction. Flux Fill is BFL's inpainting model, which you can combine with Redux: place the mascot via Fill into an existing background, then refine with Redux. Flux Depth provides structure control. Community workflows ([Civitai: "Flux Redux + PuLID"](https://civitai.com/models/989680)) combine PuLID-Flux for face ID with Redux for the rest of the image — a poor man's LoRA-less portrait pipeline.

## Recipes per Use Case

### Use case A: A mascot that appears in 30 marketing images

**Profile.** Stylized character (cartoon fox, isometric robot, flat vector owl, etc.), needs to appear in product screens, hero banners, social ads, email headers. Must be canonical — the fox's ears, collar, tail brush, and muzzle shape must be the same every time.

**Recommended stack: DreamBooth-LoRA + seed control.**

1. **Source assets.** 15–25 images of the mascot at varied angles/expressions. Generate synthetic training images if needed (ask MJ/Ideogram/Flux for variations, then hand-pick the on-model ones). All must match the final target art style — do not mix photorealistic and vector.
2. **Captioning.** Caption every image identically for the *subject* ("ohwx fox mascot, orange fur, red bowtie, holding a blue pencil") and variably for the *scene* ("standing in a forest clearing," "sitting at a desk," etc.). The identity collapses onto `ohwx`.
3. **Class regularization.** Generate 200 images of "a cartoon fox mascot" with the base model (Flux-dev or SDXL-base). These are the prior-preservation class samples.
4. **Training.** Rank-16 LoRA on Flux-dev for 1500 steps, LR 1e-4, AdamW8bit, batch 1, 1024×1024. Use [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit) or [huggingface/diffusers train_dreambooth_lora_flux.py](https://github.com/huggingface/diffusers/tree/main/examples/dreambooth). Expect 30–50 minutes on an A100 or ≈ 15 minutes on an H100.
5. **Inference.** Always invoke the trigger: `a photo of ohwx fox mascot, waving at a laptop screen, vector art, flat colors, brand palette (#FF5A1F, #1F2937, #F5F5F5)`. Lock the seed per asset family (all 5 hero banners use seed 12345) so that minor re-renders don't drift.
6. **Checkpoint.** Ship the LoRA file (≈ 40 MB) + a canonical `seed_library.json` mapping each marketing asset to its seed. This is the brand's image-generation lockbox.

**Fallback if training is not available:** MJ V6 with `--cref <canonical_reference_render>.png --cw 80 --style raw`. Generate a canonical reference once, pin it, and reuse for every subsequent render. Expect 1–2 out of 10 generations to drift enough to be rejected.

### Use case B: One product in 20 lifestyle scenes

**Profile.** Physical product (a red water bottle, a wireless earbud case, a candle with a specific label) shot in 20 different lifestyle contexts: on a picnic table, in a gym bag, on a bathroom shelf, etc. The label, shape, and color must be accurate.

**Recommended stack: product LoRA (SDXL or Flux) + inpainting**, OR **Flux Redux + Flux Fill**, OR **gpt-image-1.5 with reference image**.

1. **LoRA route (highest fidelity).** 10–20 product photos at varied angles. Caption each with the trigger and a description of everything *except* the product ("ohwx bottle on a white seamless backdrop, studio lighting"). Train rank-16 Flux LoRA for 1000 steps. Inference: `ohwx bottle on a mossy log at golden hour, shallow depth of field, realistic photograph`. Use seed control + ControlNet depth or canny if you need specific compositions.
2. **Redux-only route (no training).** Use Flux Redux with the canonical product photo as the image prompt and describe the scene in text. This works well when you can accept minor label drift and the background dominates the composition. Combine with Flux Depth if you need the product placed in a specific region.
3. **gpt-image-1.5 route (fastest, licensed output).** Upload the product photo as Image 1 with the prompt `"Place the exact product shown in Image 1 into a new scene: morning kitchen counter with coffee steam and a window behind. Keep the product's label, cap color, and shape identical."` gpt-image-1.5 has strong instruction following for "keep X identical" constraints. If label text distorts, explicitly quote the text in the prompt.
4. **Post-process.** For e-commerce, regenerate the exact label via inpainting (mask the label region, regenerate with a separate text-rendering model like Ideogram 3.0 or Recraft V3, then composite back). Product-photography-grade label accuracy is still beyond single-shot gen as of 2026-Q1.

### Use case C: One character across an explainer illustration series

**Profile.** A friendly human character (the "guide") appears in 8–12 illustrations of an explainer article or onboarding flow. The character has a specific face, hair, and clothing. Style is flat vector illustration.

**Recommended stack: style-consistent base + character LoRA** or **Ideogram Character Reference + fixed style prompt**.

1. **LoRA route.** Train two LoRAs: one for the character's identity (trigger `ohwx person`), one for the illustration style (trigger `flat vector style, thick outlines, pastel palette`). Apply both at inference with weight ≈ 0.8 each: `ohwx person walking into an office, flat vector style, pastel palette, thick black outlines`. This two-LoRA pattern ([huggingface/diffusers LoRA composition docs](https://huggingface.co/docs/diffusers/main/en/using-diffusers/loading_adapters)) is the production pattern.
2. **No-training route — Ideogram.** Upload the canonical character render to Ideogram Character Reference. For each new illustration, prompt `"the character walking into an office, flat vector illustration, pastel palette"`. Ideogram is particularly strong here because explainer illustrations frequently need UI text (button labels, tooltips, dialog text) and Ideogram 3.0 is currently the leader in in-image text rendering.
3. **No-training route — Gemini 2.5 Flash.** Start with a canonical portrait. In the same session, prompt `"Same character as before, now sitting at a kitchen table holding a phone, same art style."` Iterate conversationally. This is the fastest workflow but produces the most variance.
4. **Hybrid.** Use gpt-image-1.5 to *generate* the canonical character reference from a detailed text description (it tends to produce cleaner vector-like outputs than open-source base models), then feed that reference into Ideogram Character Reference for the series.

## Drift Mitigation

Even with LoRAs and identity adapters, you will see drift. The practical mitigations:

1. **Lock the seed.** For SD/SDXL/Flux, the same seed + same prompt + same model + same sampler produces bit-identical outputs. Build a `seed_library.json` per brand and reuse.
2. **Canonicalize the reference image.** Generate *one* canonical reference per character/mascot/product and pin it as the source of truth for all downstream `--cref` / Ideogram / gpt-image-1 calls. Do **not** chain generations (i.e., feed gen-N into gen-N+1 as reference), because drift accumulates ([Google devblog on Gemini consistency, 2025](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)).
3. **Use a rare trigger token.** For LoRAs, never use real words (`fox`, `rocket`, `nova`). Use `ohwx`, `sks`, `zkz`, or a 3-character hash. Real words compete with the pre-trained vocabulary and leak identity across prompts.
4. **Keep prompts tight.** Every additional descriptor increases drift variance. For canonical renders, the prompt should describe the *scene* only, with the subject described entirely by the trigger.
5. **Prior preservation (for LoRAs).** Always train with class-regularization images. Without them, the base model's understanding of the class collapses, and every subsequent "fox" looks like your mascot.
6. **CFG discipline.** High CFG (>7 for SDXL, >4 for Flux) crushes LoRA subtlety and saturates identity adapters. Stick to CFG 3.5–6 for SDXL and 3–4 for Flux.
7. **Weight identity adapters carefully.** For IP-Adapter-FaceID / InstantID / PuLID, identity weight 0.6–0.8 preserves editability; 1.0+ locks identity at the cost of prompt compliance. PuLID tolerates higher weights than InstantID without editability collapse.
8. **Avoid over-stylizing training data.** A LoRA trained on 20 images in one exact lighting setup will refuse to generate the subject in other lighting. Diversify lighting, angle, and background in the training set.
9. **Regenerate, don't edit.** Small inpainting edits on a mascot's face tend to drift the identity subtly. It's usually safer to regenerate the whole image with the same seed + a tweaked prompt.
10. **Golden-image QA.** Maintain a 5–10 image "golden set" per brand asset. Any new pipeline change (new base model, new LoRA version, new adapter weight) must first regenerate the golden set and be diffed (pixel + perceptual via DreamSim or DINO similarity) before shipping. This is the same pattern shop-floor brand teams use with physical color-matching swatches.

## References

- Ruiz, N. et al. "DreamBooth: Fine Tuning Text-to-Image Diffusion Models for Subject-Driven Generation." CVPR 2023. [arXiv:2208.12242](https://arxiv.org/abs/2208.12242). [Project page](https://dreambooth.github.io/).
- Gal, R. et al. "An Image is Worth One Word: Personalizing Text-to-Image Generation using Textual Inversion." ICLR 2023 (Spotlight). [arXiv:2208.01618](https://arxiv.org/abs/2208.01618). [Code](https://github.com/rinongal/textual_inversion). [NVIDIA page](https://research.nvidia.com/labs/par/publication/textual-inversion/).
- Hu, E. et al. "LoRA: Low-Rank Adaptation of Large Language Models." ICLR 2022. [arXiv:2106.09685](https://arxiv.org/abs/2106.09685). (Diffusion adaptation by Ryu et al. 2023 via [cloneofsimo/lora](https://github.com/cloneofsimo/lora).)
- Ye, H. et al. "IP-Adapter: Text Compatible Image Prompt Adapter for Text-to-Image Diffusion Models." [arXiv:2308.06721](https://arxiv.org/abs/2308.06721). [github.com/tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter) (5k+ stars).
- Wang, Q. et al. "InstantID: Zero-shot Identity-Preserving Generation in Seconds." [arXiv:2401.07519](https://arxiv.org/abs/2401.07519). [github.com/InstantID/InstantID](https://github.com/InstantID/InstantID). [Project page](https://instantid.github.io/).
- Li, Z. et al. "PhotoMaker: Customizing Realistic Human Photos via Stacked ID Embedding." CVPR 2024. [arXiv:2312.04461](https://arxiv.org/abs/2312.04461). [github.com/TencentARC/PhotoMaker](https://github.com/TencentARC/PhotoMaker). [Project page](https://photo-maker.github.io/).
- Guo, Z. et al. "PuLID: Pure and Lightning ID Customization via Contrastive Alignment." NeurIPS 2024. [arXiv:2404.16022](https://arxiv.org/abs/2404.16022). [github.com/ToTheBeginning/PuLID](https://github.com/ToTheBeginning/PuLID). [NeurIPS paper](https://proceedings.neurips.cc/paper_files/paper/2024/file/409fcc9d24b549969b8b9be68b56a7be-Paper-Conference.pdf).
- Midjourney. "Character References." Updates, Mar 2024. [updates.midjourney.com/character-refs](https://updates.midjourney.com/character-refs/). [Docs: Character Reference](https://docs.midjourney.com/docs/character-reference).
- Ideogram. "Character Reference." [docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/character-reference](https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features/character-reference). [API reference](https://developer.ideogram.ai/api-reference/api-reference/generate-v3).
- OpenAI. "gpt-image-1.5 Prompting Guide." [developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/). [Model card](https://platform.openai.com/docs/models/gpt-image-1.5).
- Google. "How to prompt Gemini 2.5 Flash Image Generation for the best results." Developers Blog, Aug 2025. [developers.googleblog.com](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/).
- Black Forest Labs. "Flux.1 Tools: Redux, Fill, Depth, Canny." [blackforestlabs.ai/flux-1-tools](https://blackforestlabs.ai/flux-1-tools/). Stable-Diffusion-Art walkthrough: [stable-diffusion-art.com/flux-redux](https://stable-diffusion-art.com/flux-redux/).
- Hugging Face. "DreamBooth fine-tuning with LoRA." [huggingface.co/docs/peft/v0.8.0/en/task_guides/dreambooth_lora](https://huggingface.co/docs/peft/v0.8.0/en/task_guides/dreambooth_lora). SDXL advanced script: [huggingface/blog sdxl_lora_advanced_script.md](https://github.com/huggingface/blog/blob/main/sdxl_lora_advanced_script.md).
- Ostris. "AI Toolkit" (Flux LoRA trainer). [github.com/ostris/ai-toolkit](https://github.com/ostris/ai-toolkit).
- Segmind. "Understanding DreamBooth LoRA Fine-tuning Parameters." [blog.segmind.com/dreambooth-lora-understanding-fine-tuning-parameters](https://blog.segmind.com/dreambooth-lora-understanding-fine-tuning-parameters/).
- 8PixLabs. "Which AI Face Swap is the best? PuLID vs InstantID vs FaceID." 2024. [8pixlabs.com/which-ai-face-swap-is-the-best-pulid-vs-instantid-vs-faceid](https://8pixlabs.com/which-ai-face-swap-is-the-best-pulid-vs-instantid-vs-faceid/).
- Civitai workflows: ["Flux Redux + PuLID Consistent Character"](https://civitai.com/models/989680/flux-redux-pulid-image-to-image-face-swap-consistent-character); ["Flux Redux kinda-sorta IP-Adapter"](https://civitai.com/models/969812/flux-redux-workflow-kinda-sorta-ip-adapter).
