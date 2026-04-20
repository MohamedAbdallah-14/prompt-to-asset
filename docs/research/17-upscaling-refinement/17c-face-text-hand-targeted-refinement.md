---
category: 17-upscaling-refinement
angle: 17c
title: "Targeted Refinement: Face, Text, and Hand Fixers for Generated Assets"
agent: "research-subagent-17c"
date: 2026-04-19
status: draft
tags:
  - face-restoration
  - gfpgan
  - codeformer
  - restoreformer
  - handrefiner
  - meshgraphormer
  - textdiffuser
  - adetailer
  - inpainting
  - post-processing
primary_sources:
  - "https://arxiv.org/abs/2101.04061" # GFPGAN
  - "https://arxiv.org/abs/2206.11253" # CodeFormer
  - "https://arxiv.org/abs/2201.06374" # RestoreFormer
  - "https://arxiv.org/abs/2311.17957" # HandRefiner
  - "https://arxiv.org/abs/2305.10855" # TextDiffuser
  - "https://arxiv.org/abs/2311.16465" # TextDiffuser-2
  - "https://github.com/Bing-su/adetailer"
  - "https://github.com/TencentARC/GFPGAN"
  - "https://github.com/sczhou/CodeFormer"
  - "https://github.com/wenquanlu/HandRefiner"
---

# 17c — Targeted Refinement: Face, Text, and Hand Fixers

## Executive Summary

Even the best modern text-to-image models (SDXL, Flux, Imagen 4, GPT-Image-1) produce *local* defects on objects humans are exquisitely sensitive to: faces, hands, and rendered text. For the asset-generation product we are building — logos, app icons, mascots, onboarding illustrations, OG images — these defects are the top reason users say "this looks AI-generated" or reject an asset. This document surveys the state of the art in *targeted*, *region-level* refinement that sits **after** the primary generation pass and **before** (or interleaved with) global upscaling (Real-ESRGAN / SUPIR, covered in 17a/17b).

Three families of fixers are production-ready in 2024–2026:

1. **Face restoration.** `GFPGAN` (Wang et al. 2021, arXiv:2101.04061) and `CodeFormer` (Zhou et al. 2022, arXiv:2206.11253) use a pretrained face GAN prior (StyleGAN2) or a discrete codebook prior to hallucinate plausible facial detail in low-quality or AI-mangled faces. `RestoreFormer++` (Wang et al. 2022/2023) uses multi-head cross-attention over a high-quality dictionary. For AI-generated mascot faces in logos (the "weird eyes" problem that users actually hit with Gemini and SD), CodeFormer's fidelity knob (`w`) is the single most useful parameter in the whole post-processing stack.
2. **Hand restoration.** `HandRefiner` (Lu et al. 2023, arXiv:2311.17957) and `MeshGraphormer-ControlNet` fit a parametric 3D hand mesh (MANO) to the detected hand, rasterize a depth map, and do a ControlNet-conditioned inpaint pass — turning "six-fingered horrors" into anatomically correct hands without regenerating the whole image.
3. **Text restoration.** `TextDiffuser` / `TextDiffuser-2` (Chen et al. 2023) and manual overlay pipelines fix garbled captions: OCR detects bad glyph regions, a character-aware diffusion model inpaints the region with correct glyphs, or the pipeline simply composites real vector typography on top. For logos and icons where brand text must be pixel-correct, manual overlay is almost always the right answer.

The glue that makes these usable in practice is **adetailer** (Bing Su, github.com/Bing-su/adetailer) in Automatic1111/Forge/ComfyUI: a YOLO-based auto-detector that crops faces/hands/eyes/person regions and runs a per-region inpaint with the user-chosen refiner. For Diffusers-based pipelines, the equivalent is a hand-rolled detect → crop → inpaint → paste-back loop, or ComfyUI's `Impact Pack` / `Detailer` nodes.

The central decision heuristic: **repair when the composition, pose, and color are right and only a small region is broken; regenerate when global structure is wrong.** Repair is ~5–30× cheaper than regeneration and preserves the good parts of the image; regeneration loses the hit but fixes global errors.

## Fixer Table

| Problem | Tool | Mechanism | License | Strengths | Weaknesses | When to use |
|---|---|---|---|---|---|---|
| Low-quality / AI-mangled face | **GFPGAN v1.4** ([github](https://github.com/TencentARC/GFPGAN)) | StyleGAN2 prior + U-Net encoder with CS-SFT layers | Apache-2.0 (code); weights non-commercial | Fast (~150ms/face on A100), sharp results, drop-in CLI | Over-smoothes, tends toward "beauty filter," identity drift | Photoreal human faces, quick cleanup, batch pipelines |
| Low-quality / AI-mangled face | **CodeFormer** ([github](https://github.com/sczhou/CodeFormer)) | Discrete codebook (VQ) + Transformer; fidelity weight `w`∈[0,1] | Non-commercial research license (S-Lab) | Tunable quality↔fidelity, robust to extreme degradation, great on AI weirdness | Commercial use requires separate license; slightly slower | Mascot/illustrated faces with "weird eyes," heavy restoration |
| Low-quality face | **RestoreFormer++** ([arXiv:2308.07228](https://arxiv.org/abs/2308.07228)) | Multi-head cross-attention over HQ dictionary; extending degradation model | Non-commercial | Better identity preservation than CodeFormer on real photos | Less community tooling, fewer integrations | Identity-sensitive photo restoration |
| Broken hands (extra/missing fingers, fused digits) | **HandRefiner** ([arXiv:2311.17957](https://arxiv.org/abs/2311.17957)) | MANO mesh fit → depth map → ControlNet-depth inpaint | Apache-2.0 | Targeted, anatomically grounded, preserves pose | Needs reasonable hand detection; fails on heavy occlusion | Any photoreal or stylized human illustration with visible hands |
| Broken hands | **MeshGraphormer-ControlNet** ([MeshGraphormer repo](https://github.com/microsoft/MeshGraphormer)) | Transformer-based hand mesh → ControlNet-depth/normal | MIT (Graphormer); varies for CN | More accurate mesh than HandRefiner base, strong on complex poses | Heavier dependency stack | High-end product shots / editorial illustrations |
| Garbled text in image | **TextDiffuser / TextDiffuser-2** ([arXiv:2305.10855](https://arxiv.org/abs/2305.10855), [arXiv:2311.16465](https://arxiv.org/abs/2311.16465)) | Character-aware latent diffusion, layout planner + glyph conditioning | MIT (Microsoft) | Renders specified strings correctly at character level, inpaint mode | Quality below vector typography; limited fonts/languages | Short captions on illustrations, where overlay is inappropriate |
| Garbled text | **AnyText / AnyText2** ([arXiv:2311.03054](https://arxiv.org/abs/2311.03054)) | Multi-language glyph + position control, auxiliary OCR loss | Apache-2.0 | Strong multilingual (CN/JP/KR) text rendering | Same quality ceiling as TextDiffuser | Multilingual product assets |
| Brand / logo text | **Manual vector overlay** (SVG/Figma composite) | Generate logo without text → composite real typography | — | Pixel-perfect, trademark-safe, infinitely editable | Requires tooling + layout heuristics | Every logo/wordmark/app icon with brand type |
| Eye artifacts specifically | **adetailer `mediapipe_face_mesh_eyes_only`** ([github](https://github.com/Bing-su/adetailer)) | MediaPipe eye landmarks → tight bbox → small-area inpaint | AGPL-3.0 | Fixes only eyes without moving face features | Needs face first; can change gaze | "Weird AI eyes" on mascots/portraits |
| Auto-detect + auto-inpaint | **adetailer** (A1111/Forge/SD.Next extension) | YOLOv8 detectors (face_yolov8n, hand_yolov8n, person_yolov8s-seg) + per-region img2img | AGPL-3.0 | One-click fix, composable, model-list for face/hand/person | A1111/Forge only; Diffusers needs manual port | Default fixer pass in SD pipelines |
| Auto-detect + inpaint (ComfyUI) | **Impact Pack Detailer / FaceDetailer / SEGS** ([github](https://github.com/ltdrdata/ComfyUI-Impact-Pack)) | SEGS (segment + mask) nodes, bbox/segm detectors, FaceDetailer | GPL-3.0 | Graph-native, highly composable, ships ultralytics + YOLO-World | Graph complexity; many knobs | ComfyUI production graphs |
| General inpaint backbone | **SDXL Inpainting / Flux.1 Fill** | Base model in inpaint mode | Varies | Model-agnostic, reuses existing stack | Requires good mask | Backbone for all of the above |

## Auto-Fix Pipelines

### Pipeline A — Automatic1111 / Forge (adetailer default)

This is the reference implementation most of the SD community uses. It runs automatically at the end of txt2img or img2img, per-region.

Minimal `adetailer` config for a portrait/mascot asset, expressed as the JSON that A1111 serializes to PNG info:

```json
{
  "ad_model_list": ["face_yolov8n.pt", "hand_yolov8n.pt"],
  "ad_prompt": "detailed face, clean eyes, symmetrical pupils",
  "ad_negative_prompt": "blurry, deformed, extra eyes",
  "ad_confidence": 0.3,
  "ad_mask_blur": 4,
  "ad_denoising_strength": 0.4,
  "ad_inpaint_only_masked": true,
  "ad_inpaint_only_masked_padding": 32,
  "ad_use_steps": true,
  "ad_steps": 28,
  "ad_use_cfg_scale": true,
  "ad_cfg_scale": 6.5,
  "ad_restore_face": false
}
```

Notes:
- `face_yolov8n.pt` and `hand_yolov8n.pt` are the YOLO checkpoints that ship with the extension's model list.
- `ad_denoising_strength` 0.3–0.5 is the sweet spot: low enough to keep the character's identity/style, high enough to fix AI defects.
- `ad_inpaint_only_masked: true` crops to the mask region and upscales it to the model's native resolution (1024² for SDXL), which is why adetailer can fix tiny faces in wide compositions — it effectively super-resolves the region before inpainting.
- For *mascot* or *flat-illustration* faces (logos), don't stack GFPGAN on top; it will photorealize the style. Prefer CodeFormer at low `w` (0.3) or skip identity restoration entirely and let the inpaint do the work.

### Pipeline B — ComfyUI (Impact Pack Detailer)

Canonical graph, described in prose:

1. `KSampler` produces the base image.
2. `UltralyticsDetectorProvider(face_yolov8m)` → `SAMLoader(sam_vit_b)` → `BBoxDetectorCombined` produces `SEGS` (segmented regions).
3. `FaceDetailer` node takes `SEGS` + the base image + the base model + a positive/negative prompt pair, and for each segment does: crop → upscale → img2img → blend back.
4. Optional: `HandDetectorProvider(hand_yolov8s)` → second `FaceDetailer` with hand-specific prompts.
5. Optional: `CodeFormer` / `GFPGAN` node over faces as a final cleanup.
6. Optional: `Eyes detailer` via `mediapipe_face_mesh_eyes_only`.
7. Global upscaler (Real-ESRGAN / 4x-UltraSharp) *after* detailing, not before — upscaling before detailing locks in the defects.

### Pipeline C — Diffusers (hand-rolled, production backend)

For a programmatic API backend (our likely runtime), the detect-crop-inpaint-paste loop in Python:

```python
# pseudocode — not exhaustive
from ultralytics import YOLO
from diffusers import StableDiffusionXLInpaintPipeline
from gfpgan import GFPGANer  # optional identity-restore post
import numpy as np, cv2

face_det = YOLO("face_yolov8n.pt")
hand_det = YOLO("hand_yolov8n.pt")
pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-1.0-inpainting-0.1", torch_dtype="float16"
).to("cuda")

def refine(img, detector, prompt, neg, denoise=0.4, pad=32):
    dets = detector(img)[0].boxes.xyxy.cpu().numpy()
    for (x1, y1, x2, y2) in dets:
        x1, y1 = max(0, int(x1 - pad)), max(0, int(y1 - pad))
        x2, y2 = min(img.shape[1], int(x2 + pad)), min(img.shape[0], int(y2 + pad))
        crop = img[y1:y2, x1:x2]
        crop_up = cv2.resize(crop, (1024, 1024), cv2.INTER_CUBIC)
        mask = np.ones(crop_up.shape[:2], np.uint8) * 255
        out = pipe(prompt=prompt, negative_prompt=neg, image=crop_up,
                   mask_image=mask, strength=denoise, num_inference_steps=28).images[0]
        out = cv2.resize(np.array(out), (x2 - x1, y2 - y1))
        img[y1:y2, x1:x2] = out
    return img

img = refine(img, face_det, "clean face, sharp eyes", "extra eyes, blurry")
img = refine(img, hand_det, "anatomically correct hand, five fingers",
             "extra fingers, fused fingers, deformed", denoise=0.55)
```

For hands specifically, wrap this with HandRefiner:

1. Detect hand with `hand_yolov8n`.
2. Run MANO mesh fit (HandRefiner ships a preprocessor based on `mmpose` + MANO).
3. Rasterize the mesh to a depth map at crop resolution.
4. Run SDXL Inpaint **conditioned by ControlNet-depth** on that crop using the rendered depth.
5. Paste back.

The ControlNet-depth conditioning is what gives HandRefiner its anatomical correctness — the diffusion model is no longer guessing "how many fingers" because the depth map already encodes it.

### Pipeline D — Text fix pipeline

For generated assets with glyphs (OG images with a tagline, UI illustrations with UI chrome), the text fixer decision tree:

```
generated image with text
    │
    ├─ OCR the image (PaddleOCR / EasyOCR / Tesseract)
    │
    ├─ Does the detected text equal the target string?
    │     ├─ yes → ship
    │     └─ no  → route:
    │
    ├─ Is this brand text (logo, wordmark, product name)?
    │     └─ YES → mask region, regenerate image **without** text,
    │              composite target text as real typography
    │              (SVG / PIL / Skia) using the brand font.
    │              STOP. Do not trust diffusion with trademarks.
    │
    ├─ Is this a short caption (≤4 words, non-brand)?
    │     └─ YES → TextDiffuser-2 inpaint with target string and
    │              bounding box from the OCR detection.
    │
    └─ Is this a paragraph of body copy?
          └─ YES → you are using the wrong tool. Render text at
                   the application layer (HTML/CSS) and composite
                   the generated image underneath.
```

Key insight for a *prompt-to-asset product*: the single biggest lever for text correctness isn't a better model, it's **refusing to let the model render brand text at all.** Enhance prompts to generate *text-free* logos/icons/OG-image backgrounds, then composite brand typography in post.

### Pipeline E — Eyes-only micro-fix

AI-generated faces often have correct face shape but "broken eyes" (asymmetric pupils, misaligned iris, different eye colors). The cheapest fix:

1. Run MediaPipe FaceMesh → landmarks 33–133 (left eye) + 263–362 (right eye).
2. Dilate the convex hull of each eye by ~4px.
3. Inpaint only those two small masks at strength 0.5–0.7 with prompt `"clean symmetrical eyes, matching pupils, sharp iris detail"`.

In adetailer this is literally one dropdown: `mediapipe_face_mesh_eyes_only`. It is one of the most useful options for logo mascots.

## Decision Heuristics

### Repair vs. regenerate

Repair when **all** are true:

- Global composition, pose, lighting, and palette are acceptable.
- Defect is localized (< ~25 % of image area).
- Defect is on a well-understood category: face, eyes, hand, short text.
- You care about seed stability (e.g. generating a set of on-brand assets from the same seed).

Regenerate when **any** is true:

- Anatomy is wrong at the skeleton level (two heads, arms fused into torso, hand attached to elbow).
- Composition violates the brief (subject is off-center, wrong colors globally).
- The defect is repeated across many regions (both hands + face + text all broken → the model didn't understand the prompt; refiners will not rescue it).
- Budget allows ≥3 regenerations and the base call is cheap (< $0.02).

### Rule of thumb for cost

Assume an A100 reference:

| Operation | Time | Relative cost |
|---|---|---|
| SDXL 1024² base generation, 30 steps | ~4 s | 1× |
| Flux.1 [dev] 1024² base, 28 steps | ~6 s | 1.5× |
| Face inpaint (1 face, 28 steps, 768² crop) | ~1.5 s | 0.4× |
| Hand inpaint with ControlNet-depth | ~2 s | 0.5× |
| GFPGAN / CodeFormer pass (1 face) | ~0.15 s | 0.04× |
| MediaPipe face mesh | ~0.02 s | 0.005× |
| TextDiffuser-2 inpaint | ~3 s | 0.75× |
| OCR (PaddleOCR) | ~0.3 s | 0.08× |

The "detect → crop → inpaint → paste → CodeFormer" pass for one face + two hands costs ~0.5× of a fresh generation but preserves everything else in the image. Regeneration is a full 1×, with a non-trivial probability the new seed breaks something *else*.

### Style-specific routing

- **Photoreal portraits / mascots with skin detail** → GFPGAN (fast path) or CodeFormer `w=0.7` (quality path). Stack adetailer eyes-only on top for pupil symmetry.
- **Flat-illustration / vector-style logos** → NEVER GFPGAN. Use adetailer with a *style-matched* inpaint prompt and CodeFormer `w=0.1–0.3` if you must. Identity restoration in photoreal space *destroys* flat illustrations.
- **Anime / stylized** → specialized forks: `GFPGAN-Anime` / `CodeFormer-Anime` (community) or just adetailer with anime-tuned face detectors (`face_yolov8n-seg`).
- **Illustrative hands holding props** (coffee mug, phone, pencil) → HandRefiner + an IP-Adapter conditioning on the prop to keep it from disappearing in the inpaint.
- **Single-character logo with brand text** → text-free generation + vector overlay. Always.
- **OG image with headline** → text-free background + HTML/CSS text at render time. The product should *never* ask the diffusion model to render a headline.

### Order of operations

For the backend, the canonical refinement order is:

1. Optional: run a *fast* quality gate (aesthetic score, HPSv2, CLIPScore against prompt). If below threshold, regenerate instead of repair.
2. Detect-inpaint hands first (HandRefiner). Hands are the most likely to look wrong and are least affected by later face work.
3. Detect-inpaint face (adetailer face_yolov8n).
4. Optionally CodeFormer / GFPGAN pass over detected face bboxes for final skin/eye cleanup.
5. Detect-inpaint eyes only (adetailer mediapipe eyes).
6. Text handling (OCR → decide repair/overlay/text-free strategy above).
7. Global upscaling (Real-ESRGAN / SUPIR / Flux.1 Tools) **last**, so we upscale fixed pixels, not broken ones.

This ordering is the opposite of the intuitive "upscale then touch up" order; doing the upscaling last is the single highest-leverage change most pipelines should make.

### When to surrender

Surrender and regenerate when any of:

- Face/hand defect spans multiple adjacent regions (hand + forearm + sleeve all wrong).
- The subject is too small (< 64² in the final image) for a meaningful inpaint crop, even after upscaling.
- Prompt-compliance failure, not a local defect (generated a dog when asked for a cat).
- Brand integrity risk: wrong logo colors, wrong wordmark, trademark violation. Do not attempt inpainting — regenerate with a stricter prompt and/or an IP-Adapter reference.

## Integration Notes for a Prompt-Enhancer Product

For a product that turns *"a transparent logo for my note-taking app"* into a production asset, the refinement layer should be **implicit** and **budgeted**:

- Every generation should go through a server-side refinement pass. The user never picks "detail my face" — the orchestrator runs the pipeline above by default on any asset that contains a face/hand/text region.
- Expose a single knob: `fidelity` ∈ {fast, balanced, max}. `fast` = CodeFormer-only, no inpaint. `balanced` = adetailer face + hand + eyes. `max` = full pipeline + HandRefiner + SUPIR upscale.
- For logos specifically, the default should be **text-free generation + overlay**. The product takes the brand string at input time and composites it in SVG/Canvas after generation. This eliminates the #1 source of user disappointment in this category.
- For mascot logos with eyes (Duolingo-style characters), the default should include the eyes-only micro-fix. This is the single highest-ROI post-processing step for this asset category.
- Licensing caveat: **CodeFormer weights are non-commercial.** For a commercial SaaS, either (a) use GFPGAN + RestoreFormer++ (Apache / permissive), (b) license CodeFormer commercially from S-Lab / SenseTime, or (c) train an in-house equivalent. adetailer itself is AGPL-3.0 — running it server-side as a hosted service may trigger AGPL obligations; mirror this decision with counsel.

## References

### Primary papers

- Wang, X., Li, Y., Zhang, H., & Shan, Y. (2021). *Towards Real-World Blind Face Restoration with Generative Facial Prior*. CVPR 2021. arXiv:[2101.04061](https://arxiv.org/abs/2101.04061). GFPGAN.
- Zhou, S., Chan, K. C. K., Li, C., & Loy, C. C. (2022). *Towards Robust Blind Face Restoration with Codebook Lookup Transformer*. NeurIPS 2022. arXiv:[2206.11253](https://arxiv.org/abs/2206.11253). CodeFormer.
- Wang, Z., Zhang, J., Chen, R., Wang, W., & Luo, P. (2022). *RestoreFormer: High-Quality Blind Face Restoration from Undegraded Key-Value Pairs*. CVPR 2022. arXiv:[2201.06374](https://arxiv.org/abs/2201.06374).
- Wang, Z. et al. (2023). *RestoreFormer++: Towards Real-World Blind Face Restoration from Undegraded Key-Value Pairs*. TPAMI. arXiv:[2308.07228](https://arxiv.org/abs/2308.07228).
- Lu, W., Xu, Y., Zhang, J., Wang, C., & Tao, D. (2023). *HandRefiner: Refining Malformed Hands in Generated Images by Diffusion-based Conditional Inpainting*. arXiv:[2311.17957](https://arxiv.org/abs/2311.17957).
- Lin, K., Wang, L., & Liu, Z. (2021). *Mesh Graphormer*. ICCV 2021. arXiv:[2104.00272](https://arxiv.org/abs/2104.00272). MeshGraphormer — used for hand mesh estimation in many refinement stacks.
- Chen, J., Huang, Y., Lv, T., Cui, L., Chen, Q., & Wei, F. (2023). *TextDiffuser: Diffusion Models as Text Painters*. NeurIPS 2023. arXiv:[2305.10855](https://arxiv.org/abs/2305.10855).
- Chen, J. et al. (2023). *TextDiffuser-2: Unleashing the Power of Language Models for Text Rendering*. arXiv:[2311.16465](https://arxiv.org/abs/2311.16465).
- Tuo, Y., Xiang, W., He, J.-Y., Geng, Y., & Xie, X. (2023). *AnyText: Multilingual Visual Text Generation and Editing*. arXiv:[2311.03054](https://arxiv.org/abs/2311.03054).
- Romero, J., Tzionas, D., & Black, M. J. (2017). *Embodied Hands: Modeling and Capturing Hands and Bodies Together*. SIGGRAPH Asia. MANO hand model, used throughout HandRefiner-style pipelines. [Project page](https://mano.is.tue.mpg.de/).

### Reference implementations

- TencentARC. *GFPGAN*. [github.com/TencentARC/GFPGAN](https://github.com/TencentARC/GFPGAN). ~35k★.
- Zhou, S. *CodeFormer*. [github.com/sczhou/CodeFormer](https://github.com/sczhou/CodeFormer). ~15k★.
- Bing Su. *adetailer*. [github.com/Bing-su/adetailer](https://github.com/Bing-su/adetailer). A1111/Forge/SD.Next extension, the de-facto auto-fix tool in the SD community.
- ltdrdata. *ComfyUI-Impact-Pack*. [github.com/ltdrdata/ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack). FaceDetailer, SEGS, and detailer nodes for ComfyUI.
- wenquanlu. *HandRefiner*. [github.com/wenquanlu/HandRefiner](https://github.com/wenquanlu/HandRefiner). Reference implementation.
- Microsoft. *MeshGraphormer*. [github.com/microsoft/MeshGraphormer](https://github.com/microsoft/MeshGraphormer).
- Microsoft. *TextDiffuser*. [github.com/microsoft/unilm/tree/master/textdiffuser](https://github.com/microsoft/unilm/tree/master/textdiffuser).
- tyxsspa. *AnyText*. [github.com/tyxsspa/AnyText](https://github.com/tyxsspa/AnyText).
- Ultralytics. *YOLOv8*. [github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics). Detectors used by adetailer and Impact Pack (`face_yolov8n`, `hand_yolov8n`, `person_yolov8s-seg`).
- Google. *MediaPipe Face Mesh*. [github.com/google/mediapipe](https://github.com/google/mediapipe). Eye-only masking.
- PaddlePaddle. *PaddleOCR*. [github.com/PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR). OCR for the text-fix pipeline.

### Community corroboration

- r/StableDiffusion discussions of adetailer as the "single most important extension" for portrait generation (2023–2025).
- Civitai model pages for `face_yolov8n`, `hand_yolov8n`, `person_yolov8s-seg` — community-trained detectors used by adetailer.
- Hugging Face Space: *CodeFormer* demo ([huggingface.co/spaces/sczhou/CodeFormer](https://huggingface.co/spaces/sczhou/CodeFormer)) — reference UX for fidelity weight `w`.
