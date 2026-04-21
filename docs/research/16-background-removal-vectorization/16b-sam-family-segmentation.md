---
category: 16-background-removal-vectorization
angle: 16b
title: "SAM Family for Interactive & Text-Prompted Segmentation"
slug: 16b-sam-family-segmentation
status: draft
authors: ["research-subagent-16b"]
date: 2026-04-19
tags:
  - segmentation
  - sam
  - sam2
  - grounded-sam
  - lang-sam
  - mobile-sam
  - efficient-sam
  - fast-sam
  - matting
  - onnx
  - coreml
  - webgpu
  - asset-pipeline
primary_sources:
  - "https://arxiv.org/abs/2304.02643"
  - "https://arxiv.org/abs/2408.00714"
  - "https://arxiv.org/abs/2306.14289"  # MobileSAM
  - "https://arxiv.org/abs/2312.00863"  # EfficientSAM
  - "https://arxiv.org/abs/2306.12156"  # FastSAM
  - "https://arxiv.org/abs/2401.14159"  # Grounded SAM
  - "https://arxiv.org/abs/2303.05499"  # GroundingDINO
  - "https://github.com/IDEA-Research/Grounded-Segment-Anything"
  - "https://github.com/luca-medeiros/lang-segment-anything"
  - "https://github.com/facebookresearch/sam2"
related_angles:
  - 16a-rembg-birefnet-u2net
  - 16c-matting-trimap-alpha
  - 16d-vectorization-potrace-vtracer
  - 13-transparent-backgrounds
  - 19-agentic-mcp-skills-architectures
---

# 16b — SAM / SAM 2 / EfficientSAM / MobileSAM for Interactive + Text-Prompted Segmentation

## Executive Summary

The **Segment Anything Model (SAM)** family from Meta AI Research reframed image segmentation from a task-specific problem ("segment cars", "segment polyps") into a **promptable foundation model**: given any image and any prompt (point, box, mask, or text via an adapter), return a segmentation mask. For a prompt-enhancement system that must isolate elements from AI-generated composites — "remove the person, keep the cat", "extract just the logo", "give me only the product on transparent background" — SAM-family models are the current state of the art for **content-aware selection**, filling the gap between coarse salient-object removers (rembg, BRIA RMBG, covered in 16a) and pixel-perfect matting (covered in 16c).

Three things matter for our asset-generation pipeline:

1. **SAM alone is not text-driven.** It takes geometric prompts. To wire it to natural-language asset requests you pair it with a **text→box grounding model** (GroundingDINO, OWL-ViT, YOLO-World). The canonical stacks are **Grounded-SAM** (IDEA-Research) and **LangSAM** (luca-medeiros); these compose a detector with SAM so `"the cat"` becomes a mask.
2. **Mask quality is segmentation-good, not matting-good.** SAM masks have hard boundaries and miss hair, fur, transparency, and motion blur. For production-grade transparent PNGs you feed the SAM mask into a **matting model** (ViTMatte, MatteFormer, MatAnyone, or BRIA RMBG 1.4/2.0) as a trimap seed. This two-stage pipeline (grounding → SAM → matting) is the highest-quality open-source route to "remove everything except X, with a clean alpha channel".
3. **There is a real cost curve, and the right model depends on where the work runs.** Original SAM ViT-H is ~2.4 GB and ~4 s/image on CPU. **SAM 2 Tiny** (39 M params), **MobileSAM** (~10 MB, ~10 ms/image), **EfficientSAM**, and **FastSAM** (YOLOv8-seg backbone, ~40 ms) give 10×–100× speedups with small quality drops — enough to run in-browser via ONNX/WebGPU, on-device via CoreML, or in a cheap serverless function. Asset pipelines can pick per-tier: server (SAM 2 Hiera-L + matting), edge (MobileSAM + BRIA), browser (MobileSAM ONNX + simple feathering).

The rest of this document catalogues the model family, walks through the text-prompted pipeline end-to-end, explains where matting plugs in, and maps the edge/cost landscape.

## Model Family Comparison

### SAM (Segment Anything, Kirillov et al., Meta AI, ICCV 2023 Best Paper Honorable Mention)

- **Paper:** [arXiv:2304.02643](https://arxiv.org/abs/2304.02643) (April 2023)
- **Code:** [facebookresearch/segment-anything](https://github.com/facebookresearch/segment-anything), ~48k+ stars
- **Architecture:** ViT image encoder (B/L/H, 91M / 308M / 636M params) + lightweight prompt encoder + transformer-based mask decoder. Produces three mask hypotheses per prompt (to handle ambiguity: a click on a person's shirt can mean shirt / torso / whole person) with predicted IoU scores.
- **Training data:** SA-1B — 11 M images, 1.1 B masks, auto-generated via a data engine bootstrapping SAM itself. This dataset is the real moat.
- **Prompts:** point (positive/negative), box, mask, "segment everything" grid. Text prompts are shown as research teaser only (never shipped in the released checkpoint).
- **Strengths:** zero-shot across domains — microscopy, satellite, medical, anime, photos — without fine-tuning. Box prompts are extremely reliable; a bounding box covering an object almost always yields a clean mask.
- **Weaknesses:** hard-edged masks, no semantic labels, heavy encoder (1–4 s per image on CPU, ~50 ms on A100). Struggles with very small objects, translucency, and wiry/hairy edges.

### SAM 2 (Ravi et al., Meta FAIR, 2024)

- **Paper:** [arXiv:2408.00714](https://arxiv.org/abs/2408.00714) (August 2024)
- **Code:** [facebookresearch/sam2](https://github.com/facebookresearch/sam2)
- **Key upgrade:** unifies **image and video** segmentation with a memory attention module that propagates masks across frames. For still images it is also the best image-SAM: the Hiera backbone (Tiny/Small/Base+/Large) replaces ViT and is faster per-param.
- **Sizes:** Hiera-T (39 M), Hiera-S (46 M), Hiera-B+ (81 M), Hiera-L (224 M). Large is roughly **6× faster and slightly more accurate than SAM ViT-H**.
- **License:** Apache 2.0 (better than SAM 1's Apache 2.0 code / non-commercial weights originally; SAM 1 weights are now also Apache 2.0).
- **Training data:** SA-V for video + SA-1B for images.
- **Why it matters for us:** with Hiera-L we get ~50 ms/image masking quality that previously required ViT-H. The Tiny checkpoint (~39 M) is a legitimate server-side default now.

> **Updated 2026-04-21:** **SAM 2.1** was released on September 29–30, 2024 — improved checkpoints (Tiny/Small/Base+/Large variants), training code released publicly for the first time, and web demo front-end/back-end code released. SAM 2.1 improves on visually similar objects, small objects, and occlusion handling. The Hugging Face models are at `facebook/sam2.1-hiera-{tiny,small,base-plus,large}`. December 2024 updates added full model compilation for a major VOS speedup and a new `SAM2VideoPredictor` for per-object independent inference. **Use SAM 2.1 checkpoints rather than the original SAM 2 for any new pipeline.** The PyPI package `sam2` tracks these releases.

### MobileSAM (Zhang et al., 2023)

- **Paper:** [arXiv:2306.14289](https://arxiv.org/abs/2306.14289) (June 2023)
- **Code:** [ChaoningZhang/MobileSAM](https://github.com/ChaoningZhang/MobileSAM) (~5k stars)
- **Trick:** decoupled knowledge distillation — keep SAM's prompt encoder and mask decoder frozen, distill only the image encoder from ViT-H to TinyViT (5M params). Total model is **~10 MB**, encoder runs in ~10 ms on a laptop CPU and <1 ms on a GPU.
- **Quality:** very close to SAM-B on most benchmarks; noticeably worse on fine detail.
- **Use case for us:** browser-side segmentation, mobile apps, "live" interactive masking where a user clicks to select. This is the model behind most open-source in-browser "magic eraser" demos.

### EfficientSAM (Xiong et al., Meta Reality Labs, CVPR 2024)

- **Paper:** [arXiv:2312.00863](https://arxiv.org/abs/2312.00863) (Dec 2023)
- **Code:** [yformer/EfficientSAM](https://github.com/yformer/EfficientSAM)
- **Trick:** SAMI — masked image pretraining that uses SAM's ViT-H features as the reconstruction target. Produces ViT-Tiny (~10 M) and ViT-Small (~26 M) encoders that significantly outperform MobileSAM at similar size.
- **Quality:** ~1–2 mIoU points behind SAM ViT-H on LVIS, with ~20× parameter reduction.
- **Use case:** best quality/size tradeoff for mid-tier deployments — a lambda function, a desktop Electron app.

### FastSAM (Zhao et al., CASIA, 2023)

- **Paper:** [arXiv:2306.12156](https://arxiv.org/abs/2306.12156)
- **Code:** [CASIA-IVA-Lab/FastSAM](https://github.com/CASIA-IVA-Lab/FastSAM)
- **Architecture:** it is *not* a SAM distillation — it is **YOLOv8-seg** trained on 2% of SA-1B, reinterpreted as a promptable model. All-mask generation is 50× faster than SAM because it's a single-shot CNN rather than a ViT + prompt-per-object decoder.
- **Quality:** good for "segment everything" mode; noticeably weaker on single-object box/point prompts at boundaries.
- **Tradeoff:** faster, simpler to deploy, but the masks are coarser and less faithful to prompts. Reasonable default if you only need coarse subject selection.

### Others worth knowing

- **HQ-SAM** ([arXiv:2306.01567](https://arxiv.org/abs/2306.01567)) — adds a learnable high-quality output token; materially better on thin structures (insect legs, text, hair). Drop-in for SAM weights.
- **SAM-HQ / SlimSAM / RepViT-SAM** — further distillation variants.
- **Segment Anything in High Quality / PerSAM / Matcher** — one-shot personalization variants (give one example → segment that concept).
- **SAM 3 / SAM 3D** — Meta has teased successors; as of April 2026 SAM 2.1 remains the published production SOTA.

> **Updated 2026-04-21:** The practical default as of April 2026 is **SAM 2.1** (September 2024), not the original SAM 2. New deployments should pin `sam2>=1.0` from PyPI and use the `sam2.1-hiera-*` HuggingFace checkpoints. The table below reflects SAM 2.1 performance numbers which are slightly better than the original SAM 2 release, particularly on small and occluded objects.

### Practical picks

| Tier                        | Model                 | Params | Latency (ref)          | Where to run            |
| --------------------------- | --------------------- | ------ | ---------------------- | ----------------------- |
| Server — best quality       | SAM 2 Hiera-L + HQ-SAM| 224 M  | ~80 ms A10             | GPU container           |
| Server — default            | SAM 2 Hiera-B+        | 81 M   | ~40 ms A10             | GPU container           |
| Serverless / CPU            | EfficientSAM-S        | 26 M   | ~300 ms CPU            | Lambda, Cloud Run       |
| Edge / desktop              | MobileSAM             | 10 M   | ~50 ms CPU, 5 ms GPU   | Electron, CoreML        |
| Browser                     | MobileSAM ONNX / WebGPU| 10 M  | ~60 ms WebGPU          | In-browser tool         |
| "Segment-everything" coarse | FastSAM               | 68 M   | ~40 ms                 | Batch pre-processing    |

## Text-Prompted Segmentation Pipeline

SAM's released checkpoints don't consume text. To get `"remove the person, keep the cat"` working you compose detectors.

### Stack 1 — Grounded-SAM (the default)

**Repo:** [IDEA-Research/Grounded-Segment-Anything](https://github.com/IDEA-Research/Grounded-Segment-Anything), ~16k+ stars. Paper: [arXiv:2401.14159](https://arxiv.org/abs/2401.14159).

Pipeline:

1. **GroundingDINO** ([arXiv:2303.05499](https://arxiv.org/abs/2303.05499)) takes the image and a free-form text query (e.g. `"a cat . a person . a sofa ."`) and returns labelled bounding boxes with confidence scores. GroundingDINO was specifically designed as an open-set detector — it understands phrases, not just a fixed label list.
2. **SAM / SAM 2** takes each box as a prompt and returns a tight mask.
3. Optional: **RAM (Recognize Anything Model)** or **Tag2Text** auto-tags the image first, so the system can say "I see: cat, plant, window, sofa" and let the user pick without typing.

For a prompt-to-asset, the call sequence is roughly:

```python
# pseudocode
boxes, phrases, scores = grounding_dino(image, text="cat . person")
keep_boxes = [b for b, p in zip(boxes, phrases) if p == "cat"]
remove_boxes = [b for b, p in zip(boxes, phrases) if p == "person"]
keep_mask   = sam2.predict(image, boxes=keep_boxes).union()
remove_mask = sam2.predict(image, boxes=remove_boxes).union()
final_mask  = keep_mask & ~remove_mask  # boolean ops on masks
```

**Strengths:** open vocabulary, high quality, actively maintained, has Gradio demos. Handles conjunctions like "the red car on the left" by relying on GroundingDINO's phrase grounding.

**Weaknesses:** GroundingDINO is heavier than you'd expect (~170 M params for the Swin-T variant, ~3 GB of VRAM end-to-end with SAM ViT-H). License of GroundingDINO is Apache 2.0 but it was trained on datasets with mixed licenses — check before shipping. Fails on rare concepts and spatial relations ("the second cat from the left" often selects wrong box).

### Stack 2 — LangSAM

**Repo:** [luca-medeiros/lang-segment-anything](https://github.com/luca-medeiros/lang-segment-anything)

A thinner wrapper around GroundingDINO + SAM with a cleaner Python API and Lightning packaging. Same idea as Grounded-SAM but easier to install (`pip install lang-sam`) and a simpler single-call interface:

```python
from lang_sam import LangSAM
model = LangSAM()  # downloads GroundingDINO + SAM
masks, boxes, phrases, logits = model.predict(pil_image, "the cat")
```

For a skill/MCP tool this is the lowest-friction integration. Trade-off: updates lag behind Grounded-SAM; doesn't yet default to SAM 2.

### Stack 3 — OWL-ViT / OWLv2 + SAM

Google's [OWLv2](https://arxiv.org/abs/2306.09683) is an alternative open-vocabulary detector. It supports **image-conditioned detection** (one example image → detect similar objects) which is useful when the concept is hard to name ("this specific brand mark"). Pair with SAM exactly like Grounded-SAM.

### Stack 4 — YOLO-World + SAM

[YOLO-World](https://arxiv.org/abs/2401.17270) (Tencent AI Lab, CVPR 2024) is a real-time open-vocabulary YOLOv8. It's ~50× faster than GroundingDINO with comparable zero-shot mAP on LVIS. For live preview UX (drag-a-slider, watch the selection update) YOLO-World + MobileSAM is the most responsive pairing available.

### Stack 5 — CLIP-based post-ranking

For concepts that resist detection ("the most aesthetic one", "the happiest face"), generate many candidate masks via SAM's "segment everything" mode, then rank with CLIP similarity to the text. This is the trick behind **Semantic-SAM** and **CLIP-SAM** demos. Slower but more flexible.

### Prompt engineering for Grounded-SAM

- Use **period-separated phrases**: `"cat . person . sofa ."` — GroundingDINO expects this format and performs better than comma-separated.
- Lowercase generally helps.
- Be redundant on the "keep" side: if you want the cat, say `"cat . kitten . feline ."` to catch breed-specific detections.
- For asset generation, pre-expand synonyms via an LLM: `"laptop"` → `"laptop . notebook . computer . macbook ."`.
- If no object is found, drop the box threshold (default 0.35 → try 0.25) before falling back to whole-image.

## Matting Integration — Turning a Mask into a Clean Alpha

SAM masks are **binary** (or soft-sigmoid logits clipped to 0–1). They cut through hair, fur, smoke, glass, and motion blur with straight lines. For an asset pipeline this produces the classic "cardboard cutout" look — acceptable for UI thumbnails, unacceptable for logos, product renders, or hero illustrations with wispy detail.

The fix: treat the SAM mask as a **trimap seed** for a dedicated matting model.

### Trimap concept

A trimap has three regions: **foreground** (alpha=1, certain), **background** (alpha=0, certain), **unknown** (the model estimates alpha in 0..1). Classical matting models need the user to paint trimaps; modern learned matters can consume a coarse trimap or even just the image.

From a SAM mask, you synthesize a trimap by:

```python
import cv2, numpy as np
mask = sam_mask.astype(np.uint8) * 255
erode  = cv2.erode(mask,  np.ones((15,15), np.uint8))   # inner core -> FG
dilate = cv2.dilate(mask, np.ones((15,15), np.uint8))   # outer ring -> unknown
trimap = np.full_like(mask, 0)       # BG
trimap[dilate > 0] = 128             # unknown
trimap[erode  > 0] = 255             # FG
```

Kernel size controls how much alpha refinement can happen — too small and you keep SAM's hard edge, too large and the matter goes out of its depth. 10–25 px is usually right for 1024-px images.

### Matting models to pair with SAM

- **ViTMatte** ([arXiv:2305.15272](https://arxiv.org/abs/2305.15272), 2023) — ViT-based image matting, consumes image + trimap. Currently one of the strongest open matters. Code: [hustvl/ViTMatte](https://github.com/hustvl/ViTMatte).
- **MatteFormer** (CVPR 2022) — transformer-based, slightly older but fast.
- **MatAnyone** (CVPR 2025) — SAM-2-aware matting; designed from the ground up to consume SAM masks as guidance without a hand-built trimap. This is the emerging 2025 SOTA and the natural pairing for SAM 2.
- **BRIA RMBG 1.4 / 2.0** ([huggingface.co/briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0)) — a proprietary-trained IS-Net/BiRefNet-style end-to-end matter. Doesn't take a trimap; it produces its own alpha. Good for single-subject images but it can't target a specific instance. Often used as a **refinement** step by re-running it on a crop defined by the SAM mask bbox.
- **BiRefNet** ([ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)) — strong open-source salient-object matting, covered in 16a. Pair with SAM by cropping.

### The canonical "remove X, keep Y, clean alpha" pipeline

```
text prompt ──► GroundingDINO ──► boxes
                                     │
                              ┌──────┴──────┐
                              ▼             ▼
                        keep boxes    remove boxes
                              │             │
                              ▼             ▼
                         SAM 2 ─────► SAM 2
                              │             │
                              ▼             ▼
                         keep_mask    remove_mask
                              │
                              ▼
                    final_mask = keep - remove
                              │
                              ▼
                 trimap from erode/dilate
                              │
                              ▼
                   ViTMatte / MatAnyone
                              │
                              ▼
                   refined alpha (0..1)
                              │
                              ▼
                   composite onto transparent
                              │
                              ▼
                       RGBA PNG export
```

For crisp, graphic assets (logos, icons) you can **skip matting** — SAM 2's mask is already cleaner than the source asset deserves. For photographic composites with hair, fur, or translucency, matting is mandatory.

### Alpha edge polishing

After matting, common touch-ups before shipping the PNG:

- **Defringe / decontaminate:** subtract the background color bleed from semi-transparent edges (OpenCV's `cv2.ximgproc.guidedFilter` or the decontamination in Adobe Photoshop's Select & Mask). Libraries: [pymatting](https://github.com/pymatting/pymatting) provides `estimate_foreground_ml` specifically for this.
- **Feather / anti-alias control:** a 0.5–1.0 px Gaussian on the alpha removes remaining stair-step artifacts.
- **Color cast removal** on semi-transparent regions — important when compositing onto a differently-colored background later.

## Edge-Cost Considerations

For a prompt-enhancement product, "where does inference run" determines the UX and the economics.

### Browser (WebGPU / WebAssembly / ONNX.js)

- **Segment Anything ONNX export** is officially supported — the SAM repo includes a script to split the model into an image-encoder ONNX and a mask-decoder ONNX. In practice only the decoder runs in the browser at interactive rates (it's ~4 MB and takes ~10 ms). The encoder (hundreds of MB) either runs once server-side per image or via WebGPU if the user has a capable GPU.
- **MobileSAM ONNX / WebGPU:** full pipeline in-browser is feasible. The TinyViT encoder is ~10 MB and runs at ~60 ms per image via transformers.js + ONNX Runtime Web's WebGPU EP.
- **transformers.js** (Xenova) ships MobileSAM and SAM decoder models as demos; see [huggingface.co/Xenova](https://huggingface.co/Xenova) for prebuilt ONNX variants.
- **WebGL fallback:** slower (2–5×) but runs everywhere. For a Cursor-style skill that wants to work offline, this matters.

### On-device (CoreML / CoreML Tools / Metal)

- **apple/ml-mobileclip** lineage + community exports have produced CoreML versions of SAM and MobileSAM. Apple's own [ml-fastvit](https://github.com/apple/ml-fastvit) encoder family is a strong CoreML drop-in for a SAM encoder, though retraining is needed.
- On an M-series Mac the official SAM ViT-B converts to CoreML and runs ~200 ms/image on ANE + GPU hybrid.
- **SAM 2** has community CoreML exports as of late 2024 and runs Hiera-T in ~80 ms on M3.

### Mobile (iOS / Android)

- **Ultralytics** ships MobileSAM and FastSAM as part of the `ultralytics` Python package with CoreML and TFLite export — `yolo export format=coreml model=MobileSAM.pt`. This is the shortest path to a shippable mobile model.

### Serverless / CPU

- SAM 2 Hiera-T on AVX-512 CPU is ~600 ms/image; EfficientSAM-Ti is ~250 ms. Both fit in a 1 GB Lambda.
- Keep the **image encoder call cached**: the encoder is the expensive part, and you can reuse its output across many prompts on the same image (repeated box/point clicks). The SAM API explicitly separates `set_image` (encoder, expensive) from `predict` (decoder, cheap).

### GPU serving

- For a website backend, the economical default is **SAM 2 Hiera-B+ on a T4 or L4** via vLLM-style batch, or a single A10. Batch the encoder across concurrent users; the mask decoder trivially parallelizes.
- Grounded-SAM adds GroundingDINO overhead (~80 ms on A10). Total text-prompted pipeline lands at ~120–200 ms/image end-to-end — snappy enough for an interactive UI without streaming tricks.

### Cost vs friction summary

| Scenario                             | Recommendation                                        |
| ------------------------------------ | ----------------------------------------------------- |
| "Works everywhere, no infra"         | MobileSAM ONNX in browser; skip matting, feather alpha|
| "Good enough, cheap backend"         | EfficientSAM-S + BRIA RMBG on a Lambda                |
| "Best OSS quality, has GPU"          | GroundingDINO + SAM 2 Hiera-L + ViTMatte on A10       |
| "Desktop app, offline"               | MobileSAM CoreML + BiRefNet CoreML                    |
| "Batch pipeline, cost-optimized"     | FastSAM (segment-everything) → CLIP ranking           |
| "Agent tool for Claude/Codex"        | LangSAM in a Modal/Replicate endpoint; stream mask PNG|

## Use Cases for Asset Generation

In a prompt-enhancement product that generates icons, logos, illustrations, and OG images, SAM-family models show up in five concrete places:

1. **Post-hoc background removal of AI-generated raster images.** User generates a logo with Imagen/DALL-E, gets a white background. Instead of the coarse `rembg` cutout, Grounded-SAM with `"the logo"` as prompt gives a tighter mask, and the matting step preserves glow/shadow edges if the style called for them.
2. **Element isolation from AI-generated composites.** "Here is a scene with a character and a background. Extract the character on transparent." Grounded-SAM is the only open-source route that handles this at high quality without a human trimap.
3. **Subject preservation for inpainting.** When the user asks to regenerate only the background ("keep the product, change the scene"), a SAM mask is the inpainting exclusion mask. SAM 2 masks plug directly into SDXL inpainting, Flux Fill, and Gemini 2.5 Flash Image's edit API.
4. **Compositional editing.** "Make the cat bigger, move it to the left." Grounded-SAM isolates the cat, a transform + matting-aware compositor moves it, the hole is inpainted. This is the backbone of most AI photo editors.
5. **Vector preparation.** Before passing an AI-generated image to `vtracer` or `potrace` (covered in 16d), you want a clean mask of *just* the logo shape. SAM-as-preprocessor reduces vectorization noise enormously.

## Failure Modes & Mitigations

- **Semantic confusion.** GroundingDINO returns the wrong object for polysemous prompts ("mouse" → computer vs rodent). Mitigation: expand with LLM-generated disambiguators; show users a confidence-ranked box overlay.
- **Thin structures.** Antennae, wires, hair strands vanish in SAM and in salient-object matters. Use HQ-SAM for the segmentation stage; use ViTMatte rather than BRIA; consider MatAnyone for SAM-2-aware guidance.
- **Semi-transparent objects.** Glass, smoke, flames. SAM will give you an opaque mask; only real matting recovers alpha. Warn the user; fall back to rembg-with-matting (16a+16c).
- **Very small objects.** SAM under-segments; boxes from GroundingDINO may be unreliable. Crop around the box, re-run at higher resolution, re-composite (SAHI-style tiling).
- **Nested selections.** "Keep the eyes, remove the face" requires hierarchical masking. Use Semantic-SAM or run SAM twice with different prompts and set-difference the masks.
- **Performance cliff on large images.** SAM's ViT encoder has O(n²) attention on patch count. At >2048 px resize first, run SAM at 1024, upsample the mask with a guided filter back to original resolution.

## References

Primary papers:

- Kirillov, A., et al. "Segment Anything." ICCV 2023. [arXiv:2304.02643](https://arxiv.org/abs/2304.02643)
- Ravi, N., et al. "SAM 2: Segment Anything in Images and Videos." 2024. [arXiv:2408.00714](https://arxiv.org/abs/2408.00714)
- Meta FAIR. "SAM 2.1" — improved checkpoints released September 29–30, 2024. HuggingFace: `facebook/sam2.1-hiera-{tiny,small,base-plus,large}`. Training code and web demo code also released. [facebookresearch/sam2](https://github.com/facebookresearch/sam2)
- Zhang, C., et al. "Faster Segment Anything: Towards Lightweight SAM for Mobile Applications" (MobileSAM). [arXiv:2306.14289](https://arxiv.org/abs/2306.14289)
- Xiong, Y., et al. "EfficientSAM: Leveraged Masked Image Pretraining for Efficient Segment Anything." CVPR 2024. [arXiv:2312.00863](https://arxiv.org/abs/2312.00863)
- Zhao, X., et al. "Fast Segment Anything" (FastSAM). [arXiv:2306.12156](https://arxiv.org/abs/2306.12156)
- Ke, L., et al. "Segment Anything in High Quality" (HQ-SAM). NeurIPS 2023. [arXiv:2306.01567](https://arxiv.org/abs/2306.01567)
- Liu, S., et al. "Grounding DINO: Marrying DINO with Grounded Pre-Training for Open-Set Object Detection." [arXiv:2303.05499](https://arxiv.org/abs/2303.05499)
- Ren, T., et al. "Grounded SAM: Assembling Open-World Models for Diverse Visual Tasks." [arXiv:2401.14159](https://arxiv.org/abs/2401.14159)
- Cheng, Y., et al. "YOLO-World: Real-Time Open-Vocabulary Object Detection." CVPR 2024. [arXiv:2401.17270](https://arxiv.org/abs/2401.17270)
- Yao, J., et al. "ViTMatte: Boosting Image Matting with Pretrained Plain Vision Transformers." [arXiv:2305.15272](https://arxiv.org/abs/2305.15272)

Repositories:

- [facebookresearch/segment-anything](https://github.com/facebookresearch/segment-anything)
- [facebookresearch/sam2](https://github.com/facebookresearch/sam2)
- [ChaoningZhang/MobileSAM](https://github.com/ChaoningZhang/MobileSAM)
- [yformer/EfficientSAM](https://github.com/yformer/EfficientSAM)
- [CASIA-IVA-Lab/FastSAM](https://github.com/CASIA-IVA-Lab/FastSAM)
- [IDEA-Research/Grounded-Segment-Anything](https://github.com/IDEA-Research/Grounded-Segment-Anything)
- [IDEA-Research/GroundingDINO](https://github.com/IDEA-Research/GroundingDINO)
- [luca-medeiros/lang-segment-anything](https://github.com/luca-medeiros/lang-segment-anything)
- [hustvl/ViTMatte](https://github.com/hustvl/ViTMatte)
- [pymatting/pymatting](https://github.com/pymatting/pymatting)
- [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- [ultralytics/ultralytics](https://github.com/ultralytics/ultralytics) (MobileSAM / FastSAM exports)

Deployment / ports:

- [Xenova on Hugging Face](https://huggingface.co/Xenova) — ONNX conversions for transformers.js
- ONNX Runtime Web WebGPU EP: [onnxruntime.ai/docs/tutorials/web/ep-webgpu.html](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)
- CoreML community exports: search "sam coreml" on Hugging Face; Apple's ml-fastvit as encoder alternative.

Related internal angles: `16a-rembg-birefnet-u2net` (salient-object cutout baseline), `16c-matting-trimap-alpha` (matting deep-dive), `13-transparent-backgrounds` (end-to-end RGBA story), `19-agentic-mcp-skills-architectures` (exposing SAM as an agent tool).
