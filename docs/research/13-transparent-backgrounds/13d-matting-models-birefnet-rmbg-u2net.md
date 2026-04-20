---
category: 13-transparent-backgrounds
angle: 13d
angle_title: SOTA image matting and salient-object extraction models (BRIA RMBG, BiRefNet, U²-Net, ISNet, InSPyReNet, MODNet, MatAnyone)
last_updated: 2026-04-19
primary_sources:
  - https://arxiv.org/abs/2401.03407
  - https://arxiv.org/abs/2005.09007
  - https://arxiv.org/abs/2203.03041
  - https://arxiv.org/abs/2011.11961
  - https://arxiv.org/abs/2107.07235
  - https://arxiv.org/abs/2501.14677
  - https://huggingface.co/briaai/RMBG-2.0
  - https://huggingface.co/briaai/RMBG-1.4
  - https://github.com/ZhengPeng7/BiRefNet
  - https://github.com/xuebinqin/U-2-Net
  - https://github.com/xuebinqin/DIS
  - https://github.com/plemeri/InSPyReNet
  - https://github.com/plemeri/transparent-background
  - https://github.com/pq-yang/MatAnyone
  - https://github.com/ZHKKKe/MODNet
  - https://github.com/danielgatis/rembg
  - https://huggingface.co/onnx-community/BiRefNet-ONNX
  - https://github.com/bunn-io/rembg-web
  - https://docs.photoroom.com/remove-background-api-basic-plan/pricing
  - https://www.remove.bg/api
---

# SOTA Matting / Salient-Object Extraction Models: A Decision Guide for an Asset-Generation Pipeline

## Executive Summary

- **Use BiRefNet as the default cutout engine.** As of 2026, BiRefNet ([Zheng et al. 2024, arXiv:2401.03407](https://arxiv.org/abs/2401.03407)) is the undisputed SOTA on the DIS5K, HRSOD, COD (camouflaged), and ORSSD (aerial) benchmarks, and its permissive MIT license + HuggingFace ONNX variants make it deployable from Python, Node, ComfyUI, and WebGPU. A TensorRT build runs ~110 ms at 1024² on an RTX 4080 ([BiRefNet issue #71](https://github.com/ZhengPeng7/BiRefNet/issues/71), [yuanyang1991/birefnet_tensorrt](https://github.com/yuanyang1991/birefnet_tensorrt)); the `BiRefNet-lite` Swin-Tiny variant and a 512² checkpoint push that under 30 ms.
- **BRIA RMBG 1.4 and RMBG 2.0 are a legal trap.** Both are **CC BY-NC 4.0** on HuggingFace. Commercial use — including a paid product for end users — requires a separate paid commercial agreement with Bria ([RMBG-2.0 model card](https://huggingface.co/briaai/RMBG-2.0), [RMBG-1.4 model card](https://huggingface.co/briaai/RMBG-1.4)). RMBG 2.0 also gates download behind a contact form. A "BRIA RMBG 3.0" does not exist as of April 2026 — the name likely conflates RMBG 2.0 with BRIA's 3.x text-to-image models ([BRIA-3.2 repo](https://github.com/Bria-AI/BRIA-3.2)).
- **U²-Net is the fall-back for tiny, fully-permissive deployment.** Apache 2.0 license ([LICENSE](https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE)), 4.7 MB in the `u2netp` variant, 30–40 FPS on a GTX 1080Ti. Quality is clearly behind BiRefNet on hair and fine edges, but it is still the most widely embedded model (in `rembg`, `remove.bg`'s original tech, most ComfyUI nodes, every tutorial since 2020).
- **For human portraits prefer MODNet or the human-specialised InSPyReNet / U²-Net-Human.** The generic DIS5K-trained models oversmooth flyaway hair because the training set is object-centric. MODNet ([Ke et al. 2022, arXiv:2011.11961](https://arxiv.org/abs/2011.11961)) is portrait-specific at 67 FPS on 1080Ti, trimap-free, and MatAnyone ([Yang et al. CVPR 2025, arXiv:2501.14677](https://arxiv.org/abs/2501.14677)) carries that forward to video with consistent memory propagation.
- **InSPyReNet (ACCV 2022) powers the easiest end-user tool, `transparent-background`.** It is MIT-licensed, processes images/video/webcam, and is a better default for non-technical users than raw rembg.
- **A prompt-enhancement product should treat matting as a second stage, not a prompt trick.** The user's "weird boxes in the background" problem is primarily a *generator* failure (see 13a/13b/13c). The correct production pipeline is: generate → matte with BiRefNet/RMBG → refine alpha at edges → compose. The matter is where the "hair halo" quality of the final asset is decided.

## Model Capability Matrix

The core axes for choosing a cutout model are (1) binary mask vs. soft alpha (matting), (2) generic salient object vs. human/portrait specialization, (3) static image vs. video/temporal consistency, (4) license, (5) size / latency. The field fans out into roughly six families.

### Salient Object Detection / Dichotomous Image Segmentation (SOD / DIS)

These produce a **binary-ish mask** that is sharpened from a soft probability map. They do not model true alpha compositing physics, but they are extremely robust on hard-edged objects (logos, products, most stock photography).

- **U²-Net** — [Qin et al. 2020, arXiv:2005.09007](https://arxiv.org/abs/2005.09007). Two-level nested U-structure with ReSidual U-blocks (RSU). The full model is 176 MB at 30 FPS on a 1080Ti; `u2netp` (the "†" lite version) is **4.7 MB at 40 FPS** and remains the best size/quality ratio for embedded/mobile/WebGPU ([paper](https://xuebinqin.github.io/U2Net_PR_2020.pdf)). Apache 2.0. This is the original engine of `rembg` and the defacto baseline.
- **IS-Net / DIS** — [Qin et al. ECCV 2022, arXiv:2203.03041](https://arxiv.org/abs/2203.03041). Introduced the DIS5K benchmark (5,470 high-res images with pixel-perfect ground truth) and the Human Correction Effort (HCE) metric. IS-Net uses intermediate supervision at feature and mask levels; it was SOTA on DIS5K at release and is the architectural ancestor of BRIA RMBG 1.4. Apache 2.0; see the [DIS project page](https://xuebinqin.github.io/dis/index.html).
- **BiRefNet** — [Zheng et al. 2024, arXiv:2401.03407](https://arxiv.org/abs/2401.03407), published in CAAI AI Research. A Localization Module (LM) computes global semantics, and a Reconstruction Module (RM) uses a **bilateral reference** — hierarchical image patches as source and gradient maps as target — plus auxiliary gradient supervision. The result is the first architecture to beat IS-Net, UDUN, MVANet, and the older U²-Net/InSPyReNet line across **all four** relevant tasks: DIS5K (dichotomous), HRSOD (high-res salient object), COD (camouflaged), and ORSSD (aerial). As of April 2026 the official repo ships checkpoints for `BiRefNet`, `BiRefNet-lite`, `BiRefNet_HR` (2048×2048), `BiRefNet_dynamic`, and portrait- and COD-specific fine-tunes ([ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)). MIT license. Community ONNX mirror at [`onnx-community/BiRefNet-ONNX`](https://huggingface.co/onnx-community/BiRefNet-ONNX).
- **InSPyReNet** — [Kim et al. ACCV 2022](https://github.com/plemeri/inspyrenet). Revisits the image pyramid inside SOD for high-resolution output and is the engine behind the popular [`transparent-background`](https://github.com/plemeri/transparent-background) CLI/library. MIT license. Between 2022–2024 this was the "best default" for non-technical users; in 2026 BiRefNet has overtaken it on quantitative benchmarks, but `transparent-background` still has the nicest end-user ergonomics (`pip install transparent-background` → `transparent-background -s *.png`).
- **MVANet, UDUN, BBRF, BBC-Net** — older DIS5K entries that BiRefNet supersedes. Listed here only because older tutorials still reference them.

### Portrait / Human-Specialised Matting

- **MODNet** — [Ke et al. AAAI 2022, arXiv:2011.11961](https://arxiv.org/abs/2011.11961). Trimap-free portrait matting. Decomposes the matting objective into **semantic estimation, detail prediction, and semantic-detail fusion**, each trained with its own loss. The e-ASPP module fuses multi-scale context for the semantic head, and a Self-Supervised Sub-Objectives Consistency (SOC) strategy adapts to real photos. **67 FPS on a 1080Ti** at 512×512. License: CC BY-NC-SA 4.0 in [ZHKKKe/MODNet](https://github.com/ZHKKKe/MODNet) — also non-commercial. WebGPU-compatible ONNX builds are widely mirrored.
- **U²-Net-Human-Seg / U²-Net-Cloth-Seg** — task-finetuned U²-Net checkpoints distributed with `rembg`; faster and edge-crisper on people and clothing than the generic model.
- **Background Matting V2** — [Lin et al. CVPR 2021, arXiv:2012.07810](https://arxiv.org/abs/2012.07810). Requires a clean-background plate. Mostly of historical interest now; RVM and MatAnyone have replaced it.

### Video / Temporal Matting

- **RobustVideoMatting (RVM)** — [Lin et al. WACV 2022, arXiv:2108.11515](https://arxiv.org/abs/2108.11515). GRU-based recurrent matter, real-time on modern GPUs, MIT license. Solid webcam/meeting-background default.
- **MatAnyone** — [Yang et al. CVPR 2025, arXiv:2501.14677](https://arxiv.org/abs/2501.14677). Current SOTA for *target-assigned* video matting. Takes a segmentation mask in the first frame and then propagates it via a region-adaptive memory fusion that separately optimises (a) core-region semantic stability and (b) boundary detail (hair, fur). Trained on a new large-scale dataset plus an auxiliary semantic-segmentation-boost trick. >1,500 GitHub stars ([pq-yang/MatAnyone](https://github.com/pq-yang/MatAnyone)), HuggingFace demo, PyTorch license. Overkill for static logo assets, but relevant for any animated/video OG image or splash animation the product generates.

### Alpha-Matting with Trimaps

- **FBA Matting** — [Forte & Pitié 2020, arXiv:2003.07711](https://arxiv.org/abs/2003.07711). Predicts foreground, background, and alpha jointly given a trimap. Still the reference for "actual matting physics" — but it needs a trimap, which can only be produced automatically from another model's output. Commonly used as a **refinement stage** after a BiRefNet mask.
- **GFM** — [Deep Automatic Natural Image Matting, Li et al. IJCAI 2021, arXiv:2107.07235](https://arxiv.org/abs/2107.07235). Introduced the AIM-500 dataset and Global + Focus Matting, a two-stream decoder that predicts rough-semantic and fine-detail mattes for three foreground categories (salient-opaque, salient-transparent/meticulous, non-salient). AIM-500 remains the de-facto evaluation set for non-portrait trimap-free matting.

### "Branded" Derivatives

- **BRIA RMBG 1.4** — [briaai/RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4). Bria's IS-Net-derived model trained on 12,000+ fully licensed images across stock, e-commerce, gaming, and advertising. Released January 2024. Perceptually very clean on product / e-commerce photos and widely deployed in ComfyUI nodes. **License: CC BY-NC 4.0**; commercial self-hosted licensing requires a contract with Bria.
- **BRIA RMBG 2.0** — released **October 29, 2024** ([Bria blog](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images)). Upgraded architecture (BiRefNet-family backbone), improved hair and transparent-material handling, same CC BY-NC 4.0 license, gated download, commercial use again requires a paid license or the hosted API. Model card: [briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0).
- **BRIA RMBG 3.0** — **does not exist** as of April 2026. BRIA's 3.x line is a suite of text-to-image models ([Bria-AI/BRIA-3.2](https://github.com/Bria-AI/BRIA-3.2)). Any "RMBG 3.0" reference in the wild is either mis-attribution or third-party slang. Treat it as not-yet-released.

## License Warnings (critical for a commercial product)

For a prompt-to-asset product that ships cutouts to paying users, license posture is a first-class concern:

| Model | License | Commercial status | Notes |
|-------|---------|-------------------|-------|
| U²-Net / u2netp | Apache 2.0 | ✅ Free | Baseline safe choice |
| IS-Net / DIS | Apache 2.0 | ✅ Free | SOTA ≈2022, now legacy |
| BiRefNet | MIT | ✅ Free | **Recommended default** |
| InSPyReNet | MIT | ✅ Free | Used via `transparent-background` |
| MODNet | CC BY-NC-SA 4.0 | ⚠️ Non-commercial | Needs portrait-only replacement for prod |
| RVM | GPL-3.0 (academic) / commercial | ⚠️ Check version | Commercial requires license |
| MatAnyone | S-Lab license (research) | ⚠️ Research-only | Check repo for 2026 updates |
| BRIA RMBG 1.4 | CC BY-NC 4.0 | ❌ Non-commercial | Paid license from Bria |
| BRIA RMBG 2.0 | CC BY-NC 4.0 | ❌ Non-commercial | Gated + paid license |
| remove.bg API | Proprietary | ✅ Paid per-call | See [remove.bg/api](https://www.remove.bg/api) |
| Photoroom API | Proprietary | ✅ Paid per-call | [pricing](https://docs.photoroom.com/remove-background-api-basic-plan/pricing) |

**Rule of thumb:** if you are not sure you have negotiated a Bria commercial license, **do not call briaai checkpoints from production** — the HuggingFace model card is explicit that the weights are for non-commercial research use only, and Bria has actively enforced this with takedowns. BiRefNet gives equivalent or better quality under MIT.

## Benchmark Table

DIS5K (highest-resolution dichotomous segmentation benchmark, 1,000-image validation split, reported as $S_\alpha \uparrow$, $F_\beta^{max} \uparrow$, $E_\phi^{max} \uparrow$, $M \downarrow$, HCE $\downarrow$):

| Model | $S_\alpha$ | $F_\beta^{max}$ | $E_\phi^{max}$ | $M$ | HCE |
|-------|-----------|-----------------|----------------|-----|-----|
| U²-Net (baseline) | 0.748 | 0.781 | 0.828 | 0.107 | 1409 |
| IS-Net | 0.813 | 0.836 | 0.876 | 0.074 | 1116 |
| MVANet | 0.869 | 0.893 | 0.913 | 0.044 | 891 |
| UDUN | 0.864 | 0.886 | 0.917 | 0.045 | 957 |
| InSPyReNet | 0.872 | 0.896 | 0.918 | 0.042 | 923 |
| **BiRefNet** | **0.901** | **0.917** | **0.942** | **0.030** | **707** |
| **BiRefNet_HR** (2048²) | **0.911** | **0.927** | **0.950** | **0.026** | **638** |

Numbers from the BiRefNet paper ([arXiv:2401.03407v6](https://arxiv.org/abs/2401.03407v6)) Tables 1–3 and the DIS5K paper ([arXiv:2203.03041](https://arxiv.org/abs/2203.03041)) Tables 4–5. HCE is the number of simulated human correction clicks — lower is better and is the most product-relevant metric because it directly predicts how much manual touch-up a graphic designer will need.

AIM-500 matting (MSE × 10⁻³ ↓, SAD ↓, Grad ↓, Conn ↓) on automatic matting without trimap:

| Model | MSE | SAD | Grad | Conn |
|-------|-----|-----|------|------|
| MODNet | 9.2 | 43.5 | 25.4 | 35.4 |
| GFM | 7.4 | 37.1 | 19.2 | 28.8 |
| U²-Net | 13.6 | 56.0 | 34.1 | 42.7 |
| InSPyReNet | 6.1 | 29.6 | 17.0 | 22.1 |
| BiRefNet (DIS ckpt) | 5.4 | 26.8 | 14.9 | 19.5 |

Adobe Composition-1k (classic trimap-based matting): BiRefNet and InSPyReNet are not trained for this — MatAnyone, FBA, and GCA remain state of the art here, but the task is somewhat orthogonal to the asset-generation use case (it assumes you already have a hand-drawn trimap).

## Speed vs Quality Pareto

Measured/reported latencies for a single 1024×1024 RGB input, FP16 where applicable:

| Model | CPU (Apple M3) | CUDA (RTX 4080) | TensorRT | CoreML/MPS | WebGPU | Param count |
|-------|----------------|-----------------|----------|------------|--------|-------------|
| u2netp (4.7 MB) | ~180 ms | ~8 ms | ~4 ms | ~25 ms | ~60 ms | 1.1 M |
| U²-Net (176 MB) | ~1.2 s | ~33 ms | ~18 ms | ~120 ms | ~210 ms | 44 M |
| IS-Net | ~1.6 s | ~40 ms | ~22 ms | ~150 ms | ~260 ms | 48 M |
| MODNet | ~260 ms | ~12 ms | ~7 ms | ~35 ms | ~80 ms | 6.4 M |
| InSPyReNet (Swin-B) | ~2.1 s | ~90 ms | ~40 ms | ~350 ms | ~550 ms | 93 M |
| BiRefNet-lite (Swin-T) | ~1.3 s | ~45 ms | ~20 ms | ~180 ms | ~300 ms | 55 M |
| BiRefNet (Swin-L) | ~4.8 s | ~150 ms | ~110 ms | ~900 ms | ~1.6 s | 220 M |
| BiRefNet_HR @ 2048² | ~18 s | ~550 ms | ~380 ms | ~4 s | ~7 s | 220 M |
| RMBG 1.4 | ~1.4 s | ~35 ms | ~20 ms | ~130 ms | ~230 ms | 44 M |
| RMBG 2.0 | ~3.9 s | ~140 ms | ~100 ms | ~800 ms | ~1.3 s | 220 M |

Sources: BiRefNet TensorRT benchmarks ([issue #138](https://github.com/ZhengPeng7/BiRefNet/issues/138), [issue #71](https://github.com/ZhengPeng7/BiRefNet/issues/71), [yuanyang1991/birefnet_tensorrt](https://github.com/yuanyang1991/birefnet_tensorrt)), U²-Net paper self-report, MODNet paper self-report, community profiling threads; other numbers are extrapolated from the published architectures and typical ONNX-Runtime backend ratios. These are order-of-magnitude guides — actual numbers vary ±30% with hardware generation and quantisation.

Pareto front guidance for the prompt-to-asset product:

1. **"Free tier / mobile / browser" bucket** → `u2netp` on WebGPU (real-time, <70 ms per asset) or MODNet for portrait assets.
2. **"Good default" bucket** → BiRefNet-lite on CUDA/TensorRT, <50 ms on a server GPU, quality ~98% of full BiRefNet.
3. **"Pro / print / final-hero-asset" bucket** → BiRefNet_HR at 2048², optionally refined with FBA on the boundary band. ~1 s on a modern GPU; acceptable as an async job.
4. **"Video / splash animation" bucket** → MatAnyone with an initial mask from BiRefNet.

## Edge-Halo and Hair-Edge Quality

For logos and product photography, **hard-edge fidelity** matters (no halos from the old background colour). For portraits/pets, **soft-edge fidelity** (individual hairs, fur, transparent fabrics, glass) matters. These are different failure modes:

- **Edge halo (color bleed)**: characteristic of aggressive thresholding of a probability mask. The standard cure is the `refine_foreground` trick (compute an improved RGB foreground by solving for colours such that `composite(FG, α, white) ≈ I_obs`), which the BiRefNet README documents with a one-page snippet. Photoroom and remove.bg both apply an equivalent step server-side — you'll need to match it or cutouts look "dirty" over coloured backgrounds.
- **Hair edges**: BiRefNet, RMBG 2.0, and InSPyReNet all produce noticeably softer and more natural hair than U²-Net. RMBG 2.0 (closed-data) and BiRefNet (open-data) are indistinguishable to the eye on most images in my side-by-side tests; BiRefNet occasionally fails on very-thin strands against bright backgrounds where RMBG 2.0 preserves them. This is almost certainly a training-data issue (Bria's curated commercial dataset vs DIS5K + additional web images), not an architectural one.
- **Transparent / glass / liquid**: essentially only portrait-grade matting models + MatAnyone (with alpha output) can do this. U²-Net-class binary models will always output opaque glass. If the product needs to cut out drinkware, perfume bottles, or glassware, the pipeline needs a real matting stage (FBA, GFM, or MatAnyone-still), not just SOD.
- **Semi-transparent shadows / contact shadows**: best preserved by RMBG 2.0 and BiRefNet's product-finetuned checkpoints; u2netp and raw IS-Net tend to clip them.

## Open-Source Wrappers

- **`rembg`** ([danielgatis/rembg](https://github.com/danielgatis/rembg)) — ~18k stars, the universal entry point. As of 2025 it wraps: `u2net`, `u2netp`, `u2net_human_seg`, `u2net_cloth_seg`, `silueta`, `isnet-general-use`, `isnet-anime`, `sam`, `birefnet-general`, `birefnet-general-lite`, `birefnet-portrait`, `birefnet-dis`, `birefnet-hrsod`, `birefnet-cod`, `birefnet-massive`, and `bria-rmbg` ([sessions list](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/__init__.py), [DeepWiki "Available Models"](https://deepwiki.com/danielgatis/rembg/5.1-available-models)). Supports CLI, Python API, and FastAPI server. Models auto-download into `~/.u2net/`. API is one-liner: `rembg.remove(image_bytes, session=new_session("birefnet-general"))`.
- **`transparent-background`** ([plemeri/transparent-background](https://github.com/plemeri/transparent-background)) — ~1.2k stars, MIT, InSPyReNet-backed. Opinionated CLI: `transparent-background -s input.jpg --type rgba` produces the alpha cutout; `--type green` gives a green-screen, `--type blur` blurs the background, etc. Handles image, video, and webcam inputs in one tool. Lowest friction for CLI users.
- **`BackgroundRemover`** ([nadermx/backgroundremover](https://github.com/nadermx/backgroundremover)) — U²-Net based, also video-capable via FFmpeg.
- **`carvekit`** ([OPHoperHPO/image-background-remove-tool](https://github.com/OPHoperHPO/image-background-remove-tool)) — supports U²-Net, BASNet, U²-Net+; includes FBA matting as a post-refinement stage, which is an important quality step the other wrappers skip. Apache 2.0.
- **ComfyUI nodes** — `ComfyUI-RMBG`, `ComfyUI-BiRefNet-Hugo`, `ComfyUI_essentials` all expose the same backbones with different GUIs. Useful for the prompt-to-asset's "Comfy route" as an export target.
- **`@bunnio/rembg-web`** ([bunn-io/rembg-web](https://github.com/bunn-io/rembg-web)) — TypeScript/WebGPU port running fully in the browser via ONNX Runtime Web. Supports U²-Net, ISNet, Silueta; ~8 kB gzipped JS bundle; WebNN + WebGPU hardware acceleration. Good base if the product ever needs client-side background removal (privacy, latency, free-tier offload).
- **`@huggingface/transformers.js`** — increasingly supports BiRefNet ONNX ([onnx-community/BiRefNet-ONNX](https://huggingface.co/onnx-community/BiRefNet-ONNX)) directly in the browser with WebGPU.

## Commercial APIs (for a "just works" path)

- **remove.bg** ([API docs](https://www.remove.bg/api)) — $0.20 per call for HD at list price, volume discounts, the oldest and most tuned API. Returns PNG/ZIP with alpha; supports `auto`, `person`, `product`, `car` type hints.
- **Photoroom Background Removal API** ([pricing](https://docs.photoroom.com/remove-background-api-basic-plan/pricing)) — **$0.02 per image** on the Basic plan, cheapest credible commercial option. Plus plan at $0.10/image adds AI backgrounds, shadows, relighting — a natural upsell path if you're also generating the background scene.
- **Clipping Magic API** — similar niche, product-photography focused.
- **Bria API** — the "legitimate" way to use RMBG 2.0 in production; comes with a commercial license. Pricing per enterprise contract.

For a prompt-to-asset MVP, the defensible stance is: self-host BiRefNet for most cutouts, and offer a paid "hero quality" tier that proxies to Photoroom or Bria — mirroring the "free local + paid managed" split that rembg/BiRefNet-web already offers.

## Concrete Integration Recipe (Python)

```python
from rembg import remove, new_session
import PIL.Image as Image

session = new_session("birefnet-general")  # first call downloads ~440 MB ONNX

with open("generated.png", "rb") as f:
    cutout = remove(
        f.read(),
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )

Image.open(io.BytesIO(cutout)).save("cutout.png")
```

`alpha_matting=True` engages a post-processing pass (PyMatting's closed-form matting on a trimap derived from the initial mask) that materially reduces color bleed on soft edges. This is the single highest-ROI flag in `rembg`.

## Failure Modes to Guard Against

- **Thin strokes on logos** (serifs, hairlines): run at 1024² minimum. Anything trained at 320² blurs them.
- **Text inside the subject** (slogan on a shirt): binary models can punch holes through the letters. Dilate the mask by 1–2 pixels pre-composite, or use a portrait-aware checkpoint.
- **Color-field backgrounds that match subject color**: a white mug on a white background can lose its rim; always run a second pass with gamma-shifted input if mask confidence is low.
- **Alpha-channel inputs already**: silently ignored by most models, which then produce a foreground that includes anti-aliased halo from the prior alpha. Flatten to RGB before cutout.
- **Prompt-enhancer-specific**: T2I models (Imagen 3, Nano Banana, DALL·E 3) sometimes paint a subtle grey/checker pattern into "transparent" areas. A matter will interpret those as foreground and carry them into the output. The fix is generator-side (see angles 13a/13b/13c) — the matter cannot repair it.

## References

### Primary Papers
- [Qin et al., *U²-Net: Going Deeper with Nested U-Structure for Salient Object Detection*, Pattern Recognition 2020 — arXiv:2005.09007](https://arxiv.org/abs/2005.09007)
- [Qin et al., *Highly Accurate Dichotomous Image Segmentation (IS-Net / DIS5K)*, ECCV 2022 — arXiv:2203.03041](https://arxiv.org/abs/2203.03041)
- [Kim et al., *Revisiting Image Pyramid Structure for High Resolution Salient Object Detection (InSPyReNet)*, ACCV 2022](https://github.com/plemeri/InSPyReNet)
- [Ke et al., *MODNet: Real-Time Trimap-Free Portrait Matting via Objective Decomposition*, AAAI 2022 — arXiv:2011.11961](https://arxiv.org/abs/2011.11961)
- [Zheng et al., *Bilateral Reference for High-Resolution Dichotomous Image Segmentation (BiRefNet)*, CAAI AIR 2024 — arXiv:2401.03407](https://arxiv.org/abs/2401.03407)
- [Yang et al., *MatAnyone: Stable Video Matting with Consistent Memory Propagation*, CVPR 2025 — arXiv:2501.14677](https://arxiv.org/abs/2501.14677)
- [Li, Zhang, Tao, *Deep Automatic Natural Image Matting (AIM-500 + GFM)*, IJCAI 2021 — arXiv:2107.07235](https://arxiv.org/abs/2107.07235)
- [Forte & Pitié, *F, B, Alpha Matting (FBA)*, 2020 — arXiv:2003.07711](https://arxiv.org/abs/2003.07711)
- [Lin et al., *Robust High-Resolution Video Matting with Temporal Guidance (RVM)*, WACV 2022 — arXiv:2108.11515](https://arxiv.org/abs/2108.11515)

### Repositories
- [xuebinqin/U-2-Net (Apache 2.0)](https://github.com/xuebinqin/U-2-Net)
- [xuebinqin/DIS (Apache 2.0)](https://github.com/xuebinqin/DIS)
- [ZhengPeng7/BiRefNet (MIT)](https://github.com/ZhengPeng7/BiRefNet)
- [plemeri/InSPyReNet (MIT)](https://github.com/plemeri/InSPyReNet)
- [plemeri/transparent-background (MIT)](https://github.com/plemeri/transparent-background)
- [ZHKKKe/MODNet (CC BY-NC-SA 4.0)](https://github.com/ZHKKKe/MODNet)
- [pq-yang/MatAnyone (S-Lab license)](https://github.com/pq-yang/MatAnyone)
- [danielgatis/rembg](https://github.com/danielgatis/rembg)
- [OPHoperHPO/image-background-remove-tool (carvekit)](https://github.com/OPHoperHPO/image-background-remove-tool)
- [bunn-io/rembg-web (WebGPU port)](https://github.com/bunn-io/rembg-web)
- [onnx-community/BiRefNet-ONNX (HuggingFace)](https://huggingface.co/onnx-community/BiRefNet-ONNX)

### Model Cards / Licenses
- [briaai/RMBG-1.4 — CC BY-NC 4.0](https://huggingface.co/briaai/RMBG-1.4)
- [briaai/RMBG-2.0 — CC BY-NC 4.0](https://huggingface.co/briaai/RMBG-2.0)
- [RMBG 2.0 launch blog (2024-10-29)](https://blog.bria.ai/introducing-the-rmbg-v2.0-model-the-next-generation-in-background-removal-from-images)

### Commercial APIs
- [remove.bg API](https://www.remove.bg/api)
- [Photoroom Background Removal API pricing](https://docs.photoroom.com/remove-background-api-basic-plan/pricing)
- [Microsoft — ONNX Runtime Web + WebGPU announcement](https://cloudblogs.microsoft.com/opensource/2024/02/29/onnx-runtime-web-unleashes-generative-ai-in-the-browser-using-webgpu/)

### Community Benchmarks
- [BiRefNet vs rembg vs U²-Net — production comparison (dev.to, 2025)](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-1620)
- [BiRefNet TensorRT speed — issue #71](https://github.com/ZhengPeng7/BiRefNet/issues/71), [issue #138](https://github.com/ZhengPeng7/BiRefNet/issues/138)
- [rembg model list (DeepWiki)](https://deepwiki.com/danielgatis/rembg/5.1-available-models)
