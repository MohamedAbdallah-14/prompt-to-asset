# IP-Adapter, ControlNet & T2I-Adapter — External Grounding

> Scope: external grounding only. Maps open-source reference-image / structural
> conditioning adapters to the `prompt-to-asset` brand-lock use cases
> (maskable icon safe-zones, logo mark placement, illustration-style refs).
>
> Research date: 2026-04. Licenses and model availability move fast — re-verify
> before pinning dependencies.

**Research value: high** — The IP-Adapter / ControlNet / T2I-Adapter ecosystem
is mature, with well-matched adapters for each brand-lock sub-problem. Gaps
are mainly on the SD3 / Flux side, where BFL's in-house "Flux Tools" and
InstantX/Shakker "Union Pro" now substitute for classic ControlNets.

---

## 1. Image-prompt / style adapters (reference-image conditioning)

| Project | Repo | License | Base models | Role in brand lock |
|---|---|---|---|---|
| **IP-Adapter** (tencent-ailab) | [`tencent-ailab/IP-Adapter`](https://github.com/tencent-ailab/IP-Adapter) | Apache-2.0 | SD1.5, SDXL (official); Flux via community `XLabs-AI/flux-ip-adapter` | Core reference-image conditioner. 22M-param decoupled cross-attn adapter; text + image prompt simultaneously. |
| **IP-Adapter Plus** (h94 weights + `cubiq/ComfyUI_IPAdapter_plus`) | [HF `h94/IP-Adapter`](https://huggingface.co/h94/IP-Adapter), [ComfyUI](https://github.com/cubiq/ComfyUI_IPAdapter_plus) | Apache-2.0 (weights), MIT (ComfyUI nodes) | SD1.5, SDXL | Higher-fidelity "Plus" weights + `plus-face` and `plus_sdxl_vit-h`. Has **style-only / composition-only** transformer modes (Precise Style Transfer, `style_boost`) — the closest thing to a "brand look" encoder without finetuning. ComfyUI repo went maintenance-only 2025-04. |
| **IP-Adapter-FaceID / FaceID Plus / Plus-v2** | [HF `h94/IP-Adapter-FaceID`](https://huggingface.co/h94/IP-Adapter-FaceID) | Non-commercial (depends on InsightFace embeddings) | SD1.5, SDXL | Identity lock; not directly relevant to logo/app-icon brand lock, but applicable if "brand" includes a spokesperson/mascot face. |
| **IP-Adapter-Art** | [`aihao2000/IP-Adapter-Art`](https://github.com/aihao2000/IP-Adapter-Art) | Apache-2.0 | SD1.5 / SDXL-class | Dedicated style encoder (CSD + IP-Adapter). Reports 67.0 CLIP-Style / 65.0 CSD on StyleBench — useful for illustration-style refs. |
| **InstantID** | [`instantX-research/InstantID`](https://github.com/instantX-research/InstantID) | Apache-2.0 code, **non-commercial in practice** (InsightFace antelopev2) | SDXL | Single-image identity lock with text editability retained. Commercial risk — treat as research-only. |
| **PhotoMaker v1 / v2** | [`TencentARC/PhotoMaker`](https://github.com/TencentARC/PhotoMaker) | Apache-2.0 (commercially usable, 3rd-party excepted) | SDXL | Stackable with ControlNet / T2I-Adapter / IP-Adapter; the safest "identity/style lock" option for commercial shipping. |
| **Flux Redux** (BFL) | [BFL Flux Tools](https://blackforestlabs.ai/flux-1-tools/) | FLUX.1 [dev] non-commercial / [pro] API-only | Flux.1 | Closest Flux-native analogue to IP-Adapter: image→image remix adapter. No official Flux IP-Adapter from Tencent as of 2026-04. |

**Use-case hits:**
- *Illustration-style ref for a brand set* → **IP-Adapter Plus (SDXL, style/composition-only modes)** or **IP-Adapter-Art**. Stack with a style LoRA if reference set is ≥ 20 images.
- *Flux pipeline instead* → **Flux Redux** (BFL-native) or community `XLabs-AI/flux-ip-adapter`.

---

## 2. Structural ControlNets (layout, edges, depth, pose, seg)

### SD 1.5 — mature, widest coverage
- **ControlNet v1.1** ([`lllyasviel/ControlNet-v1-1-nightly`](https://github.com/lllyasviel/ControlNet-v1-1-nightly), Apache-2.0) — canonical canny / depth / openpose / scribble / softedge / seg / lineart / mlsd / normal / shuffle / tile / inpaint / ip2p. Still the reference implementation.
- **ControlNet QR Code Monster** ([`monster-labs/control_v1p_sd15_qrcode_monster`](https://huggingface.co/monster-labs/control_v1p_sd15_qrcode_monster), OpenRAIL-M) — trained on QR patterns but the community-adopted tool for **embedding logos and hidden marks** into compositions. Weight 1.0–2.0 controls how literally the mark shows.
- **ControlNet-XS** ([HF `UmerHA/ConrolNetXS`](https://huggingface.co/UmerHA/ConrolNetXS), MIT) — ~20× smaller; comparable quality on canny/depth, nice for latency-sensitive inference.
- **Uni-ControlNet** ([`ShihaoZhaoZSH/Uni-ControlNet`](https://github.com/ShihaoZhaoZSH/Uni-ControlNet), MIT, NeurIPS '23) — two adapters (local + global CLIP-image) instead of one-per-condition. Good research baseline; less ComfyUI traction than Union-SDXL.
- **UniControl** (Salesforce) — similar idea, unified model over 9 tasks; lower adoption.
- **GLIGEN** ([`gligen/GLIGEN`](https://github.com/gligen/gligen), MIT) — **bbox-grounded generation** via gated self-attention. Native in `diffusers` as `StableDiffusionGLIGENPipeline`. This is the right tool for "place the logo mark in *this* bbox."

### SDXL — Union models dominate
- **xinsir ControlNet-Union / Union-ProMax** ([`xinsir/controlnet-union-sdxl-1.0`](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0), Apache-2.0) — one model, 12 control conditions (openpose, depth, canny, lineart, anime-lineart, mlsd, scribble, hed, pidi, teed, seg, normal) + tile-SR, tile-deblur, tile-variation, **inpaint, outpaint**. De-facto best SDXL ControlNet in 2025–26.
- **diffusers SDXL ControlNets** (canny, depth, openpose from `diffusers/controlnet-*-sdxl-1.0`) — stable, but superseded by Union-ProMax for most uses.
- **Stability Control-LoRAs** (canny, depth) — lightweight alternative but weaker than xinsir Union.
- **ControlNeXt-SDXL** ([`dvlab-research/ControlNeXt`](https://github.com/dvlab-research/ControlNeXt), Apache-2.0) — up to **90% fewer trainable params** vs ControlNet, LoRA-stackable; good when we want to train our own brand-specific control.
- **T2I-Adapter-SDXL** ([`TencentARC/T2I-Adapter`](https://github.com/TencentARC/T2I-Adapter), Apache-2.0) — sketch, canny, lineart, openpose, depth-zoe, depth-midas; 77M params, single forward pass (cheaper than ControlNet at inference). Native in `diffusers`.

### SD 3 / 3.5 Large
- **Stability SD3.5 ControlNets** ([`stabilityai/stable-diffusion-3.5-controlnets`](https://huggingface.co/stabilityai/stable-diffusion-3.5-controlnets), Stability Community license) — canny, depth, blur released; limited set vs SDXL.

### Flux.1
- **BFL Flux Tools**: Flux.1 Fill (inpaint/outpaint), Flux.1 Depth, Flux.1 Canny, Flux.1 Redux — **not ControlNets but LoRA-style adapters** released by BFL (Flux [dev] non-commercial).
- **InstantX / Shakker-Labs Flux ControlNet-Union-Pro / Pro 2.0** ([`Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro`](https://huggingface.co/Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro), FLUX.1 [dev] license) — canny, tile, depth, blur, pose, grayscale, low-quality in a single model. Recommended scale 0.3–0.8.
- **XLabs-AI Flux ControlNets** (canny, depth, hed; Apache-2.0-ish but inherits Flux [dev] weights license) — earliest Flux ControlNets, still widely used.

---

## 3. Use-case → adapter mapping for `prompt-to-asset`

### (a) Enforcing a logo's mark into a composition
1. **SD1.5**: **ControlNet QR-Code-Monster** on the black-and-white logo silhouette, weight ~1.0–1.8, Pixel-Perfect on. This is the community-validated trick for logo-into-image.
2. **SDXL**: **xinsir ControlNet-Union-ProMax** in scribble / softedge / canny mode on the logo silhouette, **+ IP-Adapter Plus** feeding a style reference. No QR-monster-SDXL parity yet; Union-ProMax + a strong prompt is the usable path.
3. **Flux**: **Flux.1 Canny** (BFL) or **Union-Pro 2.0 / canny** on the logo edge map; scale 0.5–0.8. For literal mark embedding the quality is below QR-monster-SD1.5 but closer every release.

### (b) Maskable app-icon safe-zones (preserve circular safe region; allow edits outside)
1. **Primary**: `StableDiffusionXLControlNetInpaintPipeline` (diffusers) + **xinsir Union-ProMax inpaint mode**, with the mask = "everything outside the 108/192 px maskable safe region". ControlNet keeps layout; inpaint mask keeps the safe zone pixel-exact.
2. **Layout-aware variant**: **GLIGEN** bbox for "icon content here", combined with an inpaint pass for the mask shape. GLIGEN is SD1.5-only in `diffusers`, so this is SD1.5 territory unless you port.
3. **Flux**: **Flux.1 Fill** for the masked region, optionally conditioned with **Flux Redux** for style — no GLIGEN equivalent, so bbox-level placement is prompt/latent-mask driven.

### (c) Style transfer for brand-illustration sets
1. **Primary**: **IP-Adapter Plus SDXL (style-only / "Precise Style Transfer")** with 3–10 curated reference illustrations, scale 0.6–0.9. If the brand set is ≥ 20 samples, stack with a **DreamBooth-style LoRA** for the "look" and let IP-Adapter carry composition.
2. **Cross-subject consistency**: **ICAS pipeline pattern** (IP-Adapter + ControlNet, arXiv 2504.13224) — IP-Adapter for style, ControlNet-Union for structure of each asset.
3. **Flux**: **Flux Redux** + a Flux style LoRA; no production-grade IP-Adapter yet.

---

## 4. Sources

- [tencent-ailab/IP-Adapter (GitHub)](https://github.com/tencent-ailab/IP-Adapter) — canonical IP-Adapter implementation, Apache-2.0, 22M params.
- [h94/IP-Adapter (Hugging Face)](https://huggingface.co/h94/IP-Adapter) — Plus / Plus-Face / Plus-SDXL weights.
- [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) — ComfyUI nodes, Precise Style Transfer, `style_boost`; maintenance-only since 2025-04.
- [aihao2000/IP-Adapter-Art](https://github.com/aihao2000/IP-Adapter-Art) — style-focused IP-Adapter variant with StyleBench numbers.
- [InstantID GitHub + HF discussion on InsightFace license](https://huggingface.co/InstantX/InstantID/discussions/2) — confirms practical non-commercial status.
- [TencentARC/PhotoMaker (GitHub)](https://github.com/TencentARC/PhotoMaker) — Apache-2.0, stackable with ControlNet / IP-Adapter.
- [lllyasviel/ControlNet (GitHub)](https://github.com/lllyasviel/ControlNet) — original ControlNet + v1.1 nightly.
- [xinsir/controlnet-union-sdxl-1.0 (HF)](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0) — Union-ProMax, 12 conditions + tile/inpaint/outpaint.
- [TencentARC/T2I-Adapter (GitHub)](https://github.com/TencentARC/T2I-Adapter) — SDXL T2I-Adapters, 77M params.
- [ShihaoZhaoZSH/Uni-ControlNet (GitHub)](https://github.com/ShihaoZhaoZSH/Uni-ControlNet) — NeurIPS '23, MIT.
- [dvlab-research/ControlNeXt (GitHub)](https://github.com/dvlab-research/ControlNeXt) — -90% trainable params, SDXL + SVD variants.
- [gligen/GLIGEN (GitHub)](https://github.com/gligen/gligen) + [diffusers GLIGEN pipeline](https://huggingface.co/docs/diffusers/api/pipelines/stable_diffusion/gligen) — bbox-grounded generation.
- [monster-labs QR-Code-Monster control net](https://huggingface.co/monster-labs/control_v1p_sd15_qrcode_monster) — de-facto logo-in-image tool.
- [Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro (HF)](https://huggingface.co/Shakker-Labs/FLUX.1-dev-ControlNet-Union-Pro) — Flux Union ControlNet Pro / Pro 2.0.
- [Black Forest Labs — Flux.1 Tools (Fill / Depth / Canny / Redux)](https://blackforestlabs.ai/flux-1-tools/) — BFL-native alternatives to ControlNets.
- [ICAS (arXiv:2504.13224)](https://arxiv.org/abs/2504.13224) — IP-Adapter + ControlNet attention pattern for multi-subject style transfer.
- [stabilityai/stable-diffusion-3.5-controlnets (HF)](https://huggingface.co/stabilityai/stable-diffusion-3.5-controlnets) — SD3.5 canny / depth / blur.
