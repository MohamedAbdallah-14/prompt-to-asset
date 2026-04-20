---
wave: 2
role: repo-deep-dive
slug: 15-rembg
title: "Deep dive: danielgatis/rembg"
repo: "https://github.com/danielgatis/rembg"
license: "MIT (code); model weights vary"
date: 2026-04-19
sources:
  - https://github.com/danielgatis/rembg
  - https://github.com/danielgatis/rembg/blob/main/README.md
  - https://github.com/danielgatis/rembg/blob/main/rembg/bg.py
  - https://deepwiki.com/danielgatis/rembg/5.1-available-models
  - https://deepwiki.com/danielgatis/rembg/3.1-command-line-interface
  - https://deepwiki.com/danielgatis/rembg/3.2-python-api
  - https://deepwiki.com/danielgatis/rembg/3.3-http-server
  - https://github.com/danielgatis/rembg/releases/tag/v2.0.75
  - https://github.com/danielgatis/rembg/issues/75
  - https://github.com/danielgatis/rembg/issues/483
  - https://github.com/danielgatis/rembg/issues/599
  - https://github.com/danielgatis/rembg/pull/728
  - https://github.com/danielgatis/rembg/pull/742
  - https://github.com/ZhengPeng7/BiRefNet
  - https://github.com/xuebinqin/U-2-Net/blob/master/LICENSE
  - https://github.com/xuebinqin/DIS/blob/main/LICENSE.md
  - https://github.com/PramaLLC/BEN2
  - https://huggingface.co/briaai/RMBG-2.0
  - https://huggingface.co/briaai/RMBG-2.0/discussions/9
  - https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-1620
  - https://www.npmjs.com/package/@imgly/background-removal-node
  - https://github.com/Remove-Background-ai/rembg-webgpu
  - https://www.rembg.com/en/blog/remove-backgrounds-browser-rembg-webgpu
tags: [rembg, matting, u2net, birefnet, bria-rmbg, transparency, background-removal, onnx]
---

# Deep dive: danielgatis/rembg

## Repository metrics

- **Stars:** ~22.5k (2,268 forks, ~80 contributors)
- **Latest release:** `v2.0.75`, April 8, 2026 (62 total releases; active)
- **PyPI pulls:** ~2 M/month, ~79 k/day — the de-facto default background-remover for Python
- **Top-level license:** **MIT** on the codebase (`LICENSE` at repo root)
- **Primary language:** Python (>=3.9), wraps [`onnxruntime`](https://onnxruntime.ai/) and [`pymatting`](https://github.com/pymatting/pymatting)
- **Distribution:** PyPI (`rembg`, `rembg[cpu]`, `rembg[gpu]`, `rembg[cli]`), Docker (`danielgatis/rembg:latest` — slimmed from ~17 GB to ~3 GB in PR [#742](https://github.com/danielgatis/rembg/pull/742), March 2025, by shipping only `u2net` by default), and a Windows installer

Rembg's architecture is a thin, model-agnostic wrapper: a `Session` base class per model family exposes `predict(img) -> List[mask]`, `new_session("<model>")` handles lazy download to `~/.u2net/`, and `remove(img, session=…, **kwargs)` does the compositing. Adding a new model is a ~80-line `SessionXyz` subclass plus a download URL — which is why the catalog has grown to 17 models.

## License per model weight (the footgun)

The code is MIT; **model weights are not**. Rembg distributes URLs, not weights, but for production deployments the weight licenses are what you actually ship. A complete enumeration:

| Model | Upstream repo | Weight license | Ships with rembg? | Commercial use? |
|---|---|---|---|---|
| `u2net` (~176 MB) | [`xuebinqin/U-2-Net`](https://github.com/xuebinqin/U-2-Net) | **Apache-2.0** | default download | ✅ yes |
| `u2netp` (~4 MB) | `xuebinqin/U-2-Net` | **Apache-2.0** | on-demand | ✅ yes |
| `u2net_human_seg` (~176 MB) | `xuebinqin/U-2-Net` | Apache-2.0 (code) / derived | on-demand | ✅ yes (check source dataset) |
| `u2net_cloth_seg` (~176 MB) | `levindabhi/cloth-segmentation` | **MIT** | on-demand | ✅ yes |
| `silueta` (~43 MB) | distilled U²-Net variant | Apache-2.0 / community | on-demand | ✅ yes |
| `isnet-general-use` (~43 MB) | [`xuebinqin/DIS`](https://github.com/xuebinqin/DIS) | **Apache-2.0** | on-demand | ✅ yes |
| `isnet-anime` (~176 MB) | [`SkyTNT/anime-segmentation`](https://github.com/SkyTNT/anime-segmentation) | **Apache-2.0** | on-demand | ✅ yes |
| `sam` (vit_b, ~374 MB encoder+decoder) | [`facebookresearch/segment-anything`](https://github.com/facebookresearch/segment-anything) | **Apache-2.0** | on-demand | ✅ yes |
| `birefnet-general` (~424 MB fp32 / ~43 MB quantized) | [`ZhengPeng7/BiRefNet`](https://github.com/ZhengPeng7/BiRefNet) | **MIT** | on-demand | ✅ yes |
| `birefnet-general-lite` (~45 MB, Swin-Tiny backbone) | `ZhengPeng7/BiRefNet` | MIT | on-demand | ✅ yes |
| `birefnet-portrait` | `ZhengPeng7/BiRefNet` | MIT | on-demand | ✅ yes |
| `birefnet-dis` / `-hrsod` / `-cod` / `-massive` | `ZhengPeng7/BiRefNet` | MIT | on-demand | ✅ yes |
| `bria-rmbg` (RMBG-2.0, ~176 MB) | [`briaai/RMBG-2.0`](https://huggingface.co/briaai/RMBG-2.0) | **CC BY-NC 4.0** | on-demand | ❌ **non-commercial only** |
| `ben2-base` (BEN2) | [`PramaLLC/BEN2`](https://github.com/PramaLLC/BEN2) | **MIT** (base) / commercial tier separate | on-demand | ✅ yes for base |

Three notes that matter for our plugin:

1. **`bria-rmbg` is a commercial-use landmine.** The weights are CC BY-NC 4.0; the rembg loader will happily pull them. Any public/hosted endpoint that routes user images through `bria-rmbg` without a BRIA commercial license violates the weight license. Our posture: **the `bria-rmbg` code path is locally gated behind an env-var (`REMBG_ALLOW_BRIA=1`) and never wired to the hosted MCP without a paid license.** The IP-indemnified path to Bria is their [hosted API](https://docs.bria.ai/image-editing/v2-endpoints/background-remove), not the ONNX file.
2. **BiRefNet is the best-quality MIT option in the catalog.** `RMBG-2.0` is, per BRIA's own statements on HF discussions, a BiRefNet architecture [retrained from scratch on BRIA's curated dataset](https://huggingface.co/briaai/RMBG-2.0/discussions/9). With the MIT-licensed public `birefnet-general` checkpoint we get 90–95 % of RMBG-2.0's quality without the license problem.
3. **`u2net_cloth_seg` has a distinct MIT license** (from `levindabhi/cloth-segmentation`) even though it's inside the U²-Net family — license inheritance is per-checkpoint, not per-architecture, so every entry gets audited individually.

## CLI, Python API, HTTP server

Rembg ships three surfaces on top of the same core (`rembg/bg.py` → `remove()`):

**CLI** (`rembg --help`) with five subcommands: `i` single file, `p` folder batch, `s` HTTP server, `b` stdin/stdout pixel stream (FFmpeg-friendly), `d` model download. Typical pattern:

```bash
rembg i -m birefnet-general-lite -a -af 240 -ab 10 -ae 3 input.png out.png
rembg p -m isnet-general-use ./raw ./transparent
rembg s --host 0.0.0.0 --port 7000 --no-ui
```

**Python API** — two functions are all you usually need:

```python
from rembg import remove, new_session

session = new_session("birefnet-general-lite")  # reuse across calls
rgba = remove(
    input_bytes,
    session=session,
    alpha_matting=True,
    alpha_matting_foreground_threshold=240,
    alpha_matting_background_threshold=10,
    alpha_matting_erode_size=3,
    post_process_mask=True,
    only_mask=False,
    bgcolor=None,  # or (r,g,b,a) to flatten
)
```

Two footguns: `alpha_matting=True` without a reasonable `erode_size` over-erodes logos and thin strokes; `post_process_mask=True` (added in [PR #268](https://github.com/danielgatis/rembg/pull/268)) is effectively free and materially improves HD/4K masks — we always turn it on.

**HTTP server** — `rembg s` stands up a FastAPI + Gradio app at `:7000`. Endpoints of interest:

- `GET /api/remove?url=…` — URL-in, PNG-out
- `POST /api/remove` — multipart upload, same shape
- `GET /api/` — OpenAPI spec (drop this into a Codex/Claude tool schema directly)
- `/?` — Gradio UI; disable with `--no-ui` to drop idle CPU (relevant for long-running replicas)

The HTTP server reuses a warm `Session`, which is the single most important performance knob: ONNX cold-start is 1–3 s, warm inference is 50–500 ms.

## Performance: CPU vs GPU

Across three issues ([#75](https://github.com/danielgatis/rembg/issues/75), [#483](https://github.com/danielgatis/rembg/issues/483), [#599](https://github.com/danielgatis/rembg/issues/599)) the recurring finding is that **rembg's GPU speedup is underwhelming, sometimes negative**. Measured datapoints:

- Colab T4: CPU 3.29 s vs T4 3.79 s vs A100 2.85 s per `u2net` inference
- GTX 1050 Ti: CPU 1.71 s vs `onnxruntime-gpu` **1 min 51 s** (due to INT64→INT32 weight casting on every run)

Three structural reasons: (a) `u2net.onnx` uses INT64 weights TensorRT doesn't natively support, forcing silent CPU fallback or per-call casting; (b) single-image, no-batching inference leaves the GPU idle during preprocess/postprocess; (c) `onnxruntime-gpu` 1.19+ [defaults to CPU EP unless `CUDAExecutionProvider` is explicitly listed](https://github.com/danielgatis/rembg/pull/728), silently hiding GPU availability.

**What actually moves the needle in production:** pick the right model (`birefnet-general-lite` at ~43 MB is ~2× faster than `u2net` at equal quality on logos/icons), warm the session, batch through the HTTP server with uvicorn workers, and stop expecting GPU magic below ~100 concurrent requests.

For Apple Silicon specifically: `onnxruntime-silicon` + CoreML EP gives 2–4× speedup on U²Net-class models but **falls back to CPU on BiRefNet** due to unsupported ops (as of April 2026). On an M2 Pro, `birefnet-general-lite` runs ~1.2 s/image CPU, which is fast enough for interactive use.

## Alpha quality vs BRIA RMBG 2.0, and the fringing story

The dev.to production benchmark on 500 real product images gives the clearest comparison ([source](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-1620)):

| Model | Hair accuracy | Glass / transparent | Wall-clock |
|---|---|---|---|
| U²-Net (default rembg) | 71 % | 46 % | 1.1 s |
| ISNet (`isnet-general-use`) | 81 % | 59 % | 1.2 s |
| BiRefNet (`birefnet-general`) | 94 % | 78 % | 1.4 s |
| BRIA RMBG 2.0 (`bria-rmbg`) | ~95 % | ~80 % | 1.4 s |

RMBG 2.0 edges BiRefNet by 1–2 pp on average but loses on specific sub-cases (2D anime, similar-colored backgrounds) per community discussions on HF. Given the CC BY-NC license of RMBG 2.0, **we cannot ship it in the default path**, and the quality delta vs MIT-licensed `birefnet-general` is not large enough to justify the legal risk.

**Fringing is where rembg earns a "post-process mandatory" reputation.** Every salient-object model, rembg or otherwise, produces a 1–3 px colored halo at object edges — the implicit composite `C = α·FG + (1−α)·BG` has not been inverted, so background color still bleeds into the "foreground" colors on soft edges. Rembg's three dials against this:

1. `post_process_mask=True` — smooths the mask with small-area morphological cleanup; cheap, universally-on.
2. `alpha_matting=True` + `pymatting` — real closed-form matting on the trimap `(FG=240+, BG=10-, unknown)`; adds ~200–500 ms and dramatically improves hair/fur/smoke.
3. `estimate_foreground_ml` — the **decontamination** step that removes the colored fringe by solving for the "true" foreground color in the unknown band. This is what moves output from "obviously rembg-stripped" to "Photoshop-grade."

What rembg does **not** do and we must add: anti-alias-safe micro-erosion (1 px on the extreme edge to kill JPEG ringing without eating strokes), premultiplied-alpha resampling on downscale (halo killer at favicon sizes), and alpha-coverage validation (reject outputs with < 1 % or > 99 % α as likely failures). These belong in our `remove_background` post-processor, not in rembg.

## Bindings we need — for `remove_background`

Our tool needs to run in three contexts: a Node.js/Next.js server, a browser preview, and a Python skill runtime. Rembg itself is Python-only, so the binding strategy is:

- **Python skill + hosted server:** call rembg directly, spoken as `new_session("birefnet-general-lite")` + `remove(...)` with `post_process_mask=True`. For server deployments, run `rembg s --no-ui` as a sidecar with a shared `~/.u2net` volume.
- **Node.js backend (Next.js route):** two options. Preferred is **`@imgly/background-removal-node`** (onnxruntime-node + sharp, ships ISNet/BiRefNet ONNX, MIT-licensed code, **uses IMG.LY-hosted weights** — licensing of hosted weights needs an explicit check but their on-device API allows commercial use in the paid tier). Fallback: a thin `fetch()` call to a local `rembg s` sidecar — lets the Python process own ONNX and the Node process own nothing.
- **Browser preview:** **`rembg-webgpu`** (`@huggingface/transformers` + WebGPU FP16→FP32→WASM fallback chain, published 2025 by Remove-Background-ai) benchmarks at 0.73 s for 1024² and 1.40 s for 3000² on M1 — fast enough to show a "before / after" preview before committing to a server call. Bundle size is higher than `@imgly/background-removal` (~1.1 MB) but the cascading fallback is production-grade.

### Fallback chain for `remove_background`

Organized from most to least preferred, with a named trigger for each escalation:

1. **Native RGBA at generation time** — if the upstream generator supports it (`gpt-image-1 background: "transparent"`, LayerDiffuse via ComfyUI), we **never call rembg at all**. `alpha_coverage ∈ [0.05, 0.95]` → skip.
2. **`rembg` + `birefnet-general-lite`** (MIT, ~45 MB) — default for server jobs. `post_process_mask=True`, `alpha_matting=False`. Budget: ~1.2 s CPU / ~0.5 s GPU per 1024² image.
3. **`rembg` + `birefnet-general`** (MIT, ~424 MB quantizable to ~43 MB) — quality upgrade when the lite checkpoint fails alpha-entropy threshold. Budget: ~1.8 s CPU.
4. **`rembg` + `isnet-general-use`** (Apache-2.0, ~43 MB) — fallback when BiRefNet ops unsupported (Apple Silicon CoreML). Materially worse on hair, fine on logos.
5. **`rembg` + `isnet-anime`** (Apache-2.0) — auto-selected when the brand personality is "illustration / anime / comic" per the brand bundle.
6. **`rembg` + `birefnet-portrait`** — auto-selected for headshots / avatars.
7. **`rembg` + `ben2-base`** (MIT) — optional Confidence-Guided-Matting stage when long-hair / fur detector trips.
8. **`pymatting.estimate_foreground_ml`** — always runs after any rembg result to decontaminate the fringe. This is the single biggest perceived-quality lever.
9. **Photoroom `/v1/segment`** ($0.02/image) — commercial escape hatch for the ~5 % hard tail (glass, smoke, hair-over-similar-color). Triggered by user "premium quality" flag or `alpha_entropy > threshold`.
10. **BRIA hosted API** ($0.018/image, IP-indemnified) — B2B/brand customers needing training-data indemnification. Never the on-device `bria-rmbg` ONNX.

`rembg` occupies steps 2–7 and 9's `pymatting` glue — the meaty middle. Steps 1 and 9–10 are the escape hatches in both directions.

## Decision

**Adopt rembg as the default on-device matting engine**, with `birefnet-general-lite` as the default model (MIT, small, fast, near-SOTA on the classes we care about — logos, icons, product shots), `post_process_mask=True` permanent, and `pymatting.estimate_foreground_ml` always chained for fringe decontamination. Gate `bria-rmbg` behind an env-var and keep it out of the hosted MCP; prefer BRIA's hosted API when indemnification is a customer requirement. Expose rembg as a long-running `rembg s --no-ui` sidecar behind our Python tools; call `@imgly/background-removal-node` from Node.js code paths; ship `rembg-webgpu` for in-browser previews. Prefer native-RGBA generation (LayerDiffuse, `gpt-image-1 transparent`) over rembg whenever the generator supports it, and reserve the commercial Photoroom/BRIA fallback for the ~5 % hard tail our alpha-entropy detector flags. The MIT code + Apache/MIT-only default weights give us a license-clean stack that survives commercial distribution without further negotiation.
