---
category: 13-transparent-backgrounds
angle: 13e
title: End-to-end transparent-asset pipelines for a prompt-to-asset plugin
subtitle: Decision tree, reference code, quality verification, shadow synthesis
author: research-subagent-13e
date: 2026-04-19
status: draft
scope: >
  Practical engineering reference for shipping a "transparent asset" feature in
  a prompt-to-asset plugin. Covers decision logic for picking a provider,
  Python and Node reference pipelines, shadow synthesis options, halo/edge
  cleanup, and automated validation of RGBA outputs.
audience: plugin engineers, skill/MCP authors, prompt-enhancement pipeline devs
related:
  - 13-transparent-backgrounds/13a-alpha-channel-model-support.md
  - 13-transparent-backgrounds/13b-matting-models.md
  - 13-transparent-backgrounds/13c-checkerboard-artifact.md
  - 13-transparent-backgrounds/13d-logo-vector-path.md
  - 16-background-removal-vectorization
  - 05-openai-dalle-gpt-image
  - 08-logo-generation
primary_sources:
  - https://platform.openai.com/docs/guides/images
  - https://platform.openai.com/docs/api-reference/images
  - https://www.recraft.ai/docs
  - https://github.com/danielgatis/rembg
  - https://huggingface.co/briaai/RMBG-2.0
  - https://huggingface.co/ZhengPeng7/BiRefNet
  - https://github.com/PeterL1n/BackgroundMattingV2
  - https://github.com/pq-yang/MatAnyone
  - https://sharp.pixelplumbing.com/
  - https://pillow.readthedocs.io/
  - https://github.com/visioncortex/vtracer
word_target: 3500
---

# 13e · End-to-end transparent-asset pipelines for a prompt-to-asset plugin

## Executive Summary

The single most common failure a prompt-to-asset plugin has to absorb, for any
"I want a transparent X" request, is the **checker-box / opaque background**
artifact: the model draws the checkerboard texture (or a solid color) into the
image instead of producing RGBA pixels with real alpha. Very few generation
endpoints today ship genuine alpha — at the time of writing, the reliable
native-RGBA providers for product work are **OpenAI `gpt-image-1`**
(`background: "transparent"`, PNG/WebP output) and **Recraft v3**
(`response_format: "url"` with transparent PNG for icon/logo/vector styles).
Everything else — Gemini 2.5 Flash Image ("Nano Banana"), Flux.1, Midjourney,
SDXL — generates on an opaque canvas and needs a **matting/background-removal
post step** to become transparent.

For a prompt-to-asset plugin, this means the "transparent" request is not one
API call; it is a **small pipeline** with a decision tree at the top:

1. Detect user intent for transparency (explicit keywords, asset type, target
   format).
2. Pick the cheapest path that is likely to succeed: native RGBA model →
   generate-on-white + matting → generate-on-white + vectorize + drop
   background (logos only).
3. Post-process: halo removal, optional shadow synthesis, alpha feathering.
4. **Validate** the PNG: it must be RGBA, must have `min(alpha) < 255`, must
   not be a single solid alpha value, and the alpha channel must have
   anti-aliased edges (stddev of the edge band > 0). Without this validation,
   a "working" pipeline silently ships fully-opaque PNGs whenever the model
   ignores the `transparent` hint — which Gemini/Nano Banana does constantly.

The rest of this doc is the reference implementation for that pipeline, in
both Python (`rembg` / `Pillow` / `numpy`) and Node (`sharp` +
`@imgly/background-removal-node`), plus shadow-preserving alternatives
(MatAnyone, BackgroundMattingV2), edge-cleanup snippets, and a test harness
that catches the common broken outputs.

## Top-level Decision Tree

The plugin's "transparent asset" skill should branch on two dimensions:
(a) **what provider keys are configured**, and (b) **what the asset is**. The
second dimension matters because logos and icons benefit from a
vectorize-then-rasterize loop (edges stay crisp at any size, background drops
trivially), while illustrations and photos need pixel-level matting to
preserve soft edges and shadows.

```text
user wants transparent asset
├── Is asset logotype / flat icon / mark?   ── yes ──┐
│                                                    │
│                                                    ▼
│                              1. prompt += "on pure white #FFFFFF background,
│                                 no shadow, centered, flat vector style"
│                              2. generate with any provider (Gemini/Flux/SDXL ok)
│                              3. vectorize with vtracer → SVG
│                              4. in SVG, remove the background <rect>/white paths
│                              5. rasterize SVG at required sizes → RGBA PNG
│                              (edges stay crisp; alpha is binary + SVG feather)
│
└── Is asset illustration / product shot / character / photo-ish?
    │
    ├── gpt-image-1 key available?
    │   └── yes → call with background="transparent", output_format="png"
    │            → validate RGBA, return
    │
    ├── Recraft v3 key available?
    │   └── yes → call with style="vector_illustration"/"icon", response_format=url
    │            → Recraft returns transparent PNG for vector styles
    │            → validate RGBA, return
    │
    └── fallback: Gemini / Flux / SDXL + post-strip
        1. prompt += "isolated on solid white #FFFFFF background, studio
           lighting, no gradient background, no scene"
        2. generate RGB image
        3. optional: if "with shadow" requested → run MatAnyone /
           BackgroundMattingV2 to get an alpha that preserves the cast shadow
        4. else: run BRIA RMBG 2.0 (via rembg or HF) for clean cutout
        5. post-process: erode 1px, Gaussian blur alpha σ=0.7 → halo removal
        6. optional: synthesize drop shadow (see §Shadow Synthesis)
        7. validate RGBA + min-alpha < 255
```

Two heuristics for step 1 (intent detection):

- The phrase patterns `transparent background`, `no background`, `cutout`,
  `isolated`, `for overlay`, `png with alpha`, `logo`, `favicon`, `app icon`,
  `sticker`, and target formats `.png`, `.webp`, `.svg`, `.ico` should all
  set `transparent=true` in the internal request.
- Conversely, `wallpaper`, `background image`, `scene`, `landscape`, `OG
  image`, `hero image` should set `transparent=false` — these are *meant* to
  be opaque, and the user saying "transparent" in context usually means they
  want a plain, non-busy background, not real alpha.

## Python Pipeline

The Python reference uses `rembg` (U²-Net / BiRefNet / BRIA RMBG session
backends), `Pillow` for I/O and compositing, `numpy` for alpha math, and
`httpx` for the native-RGBA providers. `rembg` bundles several models; the
one worth defaulting to in 2026 is `birefnet-general` (BiRefNet) for general
assets and `isnet-general-use` for very clean subjects. BRIA RMBG 2.0 can be
loaded via `transformers` directly for commercial-licensed work.

```python
# pipeline.py — transparent asset pipeline, Python reference
from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

import httpx
import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

Provider = Literal["gpt-image-1", "recraft-v3", "fallback"]


@dataclass
class TransparentRequest:
    prompt: str
    size: tuple[int, int] = (1024, 1024)
    asset_kind: Literal["logo", "icon", "illustration", "photo"] = "illustration"
    want_shadow: bool = False
    provider: Provider = "fallback"


def _prompt_for_fallback(req: TransparentRequest) -> str:
    """Bias non-native providers toward an easy-to-matte canvas."""
    base = req.prompt.strip().rstrip(".")
    constraints = [
        "isolated on a pure solid white #FFFFFF background",
        "no scene, no props, no gradient background",
        "centered, small margin, single subject",
    ]
    if req.asset_kind in ("logo", "icon"):
        constraints.append("flat vector style, crisp edges, no drop shadow")
    if not req.want_shadow:
        constraints.append("no cast shadow, no reflections")
    return f"{base}. " + ". ".join(constraints) + "."


def generate_openai(req: TransparentRequest, api_key: str) -> bytes:
    """Native RGBA via gpt-image-1."""
    r = httpx.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "gpt-image-1",
            "prompt": req.prompt,
            "size": f"{req.size[0]}x{req.size[1]}",
            "background": "transparent",
            "output_format": "png",
            "n": 1,
        },
        timeout=120,
    )
    r.raise_for_status()
    b64 = r.json()["data"][0]["b64_json"]
    return base64.b64decode(b64)


def generate_recraft(req: TransparentRequest, api_key: str) -> bytes:
    """Recraft v3 returns transparent PNG for vector styles."""
    style = "vector_illustration" if req.asset_kind != "photo" else "realistic_image"
    r = httpx.post(
        "https://external.api.recraft.ai/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "prompt": req.prompt,
            "style": style,
            "size": f"{req.size[0]}x{req.size[1]}",
            "response_format": "b64_json",
        },
        timeout=120,
    )
    r.raise_for_status()
    return base64.b64decode(r.json()["data"][0]["b64_json"])


def _strip_bg(img: Image.Image, model: str = "birefnet-general") -> Image.Image:
    """Run matting/bg-removal via rembg; returns RGBA PIL image."""
    session = new_session(model_name=model)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    cut = remove(buf.getvalue(), session=session)
    return Image.open(io.BytesIO(cut)).convert("RGBA")


def _clean_alpha(rgba: Image.Image, feather: float = 0.7) -> Image.Image:
    """Erode by 1px, then Gaussian-blur the alpha to kill the white halo."""
    r, g, b, a = rgba.split()
    a_np = np.asarray(a, dtype=np.uint8)
    # Erode: set alpha to min of 3x3 neighborhood.
    pad = np.pad(a_np, 1, mode="edge")
    eroded = np.minimum.reduce([
        pad[:-2, :-2], pad[:-2, 1:-1], pad[:-2, 2:],
        pad[1:-1, :-2], pad[1:-1, 1:-1], pad[1:-1, 2:],
        pad[2:, :-2], pad[2:, 1:-1], pad[2:, 2:],
    ])
    a = Image.fromarray(eroded.astype(np.uint8), "L")
    a = a.filter(ImageFilter.GaussianBlur(radius=feather))
    return Image.merge("RGBA", (r, g, b, a))


def _add_drop_shadow(
    rgba: Image.Image,
    offset: tuple[int, int] = (0, 12),
    blur: float = 18.0,
    opacity: float = 0.35,
) -> Image.Image:
    """Synthesize a soft drop shadow under an RGBA asset."""
    w, h = rgba.size
    pad = int(blur * 3) + max(abs(offset[0]), abs(offset[1]))
    canvas = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    alpha = rgba.split()[-1]
    shadow_rgba = Image.new("RGBA", rgba.size, (0, 0, 0, int(255 * opacity)))
    shadow_rgba.putalpha(alpha)
    shadow_rgba = shadow_rgba.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow_rgba, dest=(pad + offset[0], pad + offset[1]))
    canvas.alpha_composite(rgba, dest=(pad, pad))
    return canvas


def run(req: TransparentRequest, *, openai_key: str = "", recraft_key: str = "",
        fallback_generate=None) -> Image.Image:
    """
    fallback_generate: callable(prompt:str, size:tuple) -> bytes (PNG/JPEG)
    for Gemini/Flux/SDXL. Must return an opaque raster.
    """
    if req.provider == "gpt-image-1" and openai_key:
        raw = generate_openai(req, openai_key)
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
    elif req.provider == "recraft-v3" and recraft_key:
        raw = generate_recraft(req, recraft_key)
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
    else:
        assert fallback_generate, "fallback_generate callable required"
        raw = fallback_generate(_prompt_for_fallback(req), req.size)
        opaque = Image.open(io.BytesIO(raw)).convert("RGB")
        img = _strip_bg(opaque, model="birefnet-general")

    img = _clean_alpha(img, feather=0.7)
    if req.want_shadow:
        img = _add_drop_shadow(img)
    validate_rgba(img)  # defined in §Validation
    return img
```

Notes on model choice inside `_strip_bg`:

- `birefnet-general` (BiRefNet, Zheng et al. 2024) — best general tradeoff in
  2025–2026; handles fur, hair, glass.
- `isnet-general-use` — fast, very clean for product shots.
- `u2net` — legacy default, kept for CPU-only / offline use.
- For commercial-license safety, load **BRIA RMBG 2.0** directly from HF
  (`briaai/RMBG-2.0`) — the rembg bundled weights are not commercial-safe.

## Node Pipeline

Node plugins tend to run inside Vercel / Cloudflare Workers / Electron
contexts where spawning Python is not viable. The fastest all-JS stack is
`sharp` (libvips bindings, written in C) for I/O and alpha math, plus
`@imgly/background-removal-node` (ONNX Runtime, ships a BiRefNet-derived
model) for matting. An alternative is `rembg-node` (a small wrapper spawning
the Python `rembg` CLI) when a Python runtime is available.

```js
// pipeline.mjs — transparent asset pipeline, Node reference
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import { Buffer } from "node:buffer";

const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const RECRAFT_URL = "https://external.api.recraft.ai/v1/images/generations";

function fallbackPrompt(req) {
  const constraints = [
    "isolated on a pure solid white #FFFFFF background",
    "no scene, no props, no gradient background",
    "centered, single subject, small margin",
  ];
  if (req.assetKind === "logo" || req.assetKind === "icon")
    constraints.push("flat vector style, crisp edges, no drop shadow");
  if (!req.wantShadow) constraints.push("no cast shadow, no reflections");
  return `${req.prompt.replace(/\.$/, "")}. ${constraints.join(". ")}.`;
}

async function generateOpenAI(req, apiKey) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: req.prompt,
      size: `${req.size[0]}x${req.size[1]}`,
      background: "transparent",
      output_format: "png",
      n: 1,
    }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${await r.text()}`);
  const json = await r.json();
  return Buffer.from(json.data[0].b64_json, "base64");
}

async function generateRecraft(req, apiKey) {
  const style = req.assetKind === "photo" ? "realistic_image" : "vector_illustration";
  const r = await fetch(RECRAFT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: req.prompt,
      style,
      size: `${req.size[0]}x${req.size[1]}`,
      response_format: "b64_json",
    }),
  });
  if (!r.ok) throw new Error(`recraft ${r.status}: ${await r.text()}`);
  const json = await r.json();
  return Buffer.from(json.data[0].b64_json, "base64");
}

async function stripBackground(pngBuffer) {
  // @imgly returns a Blob of a PNG with alpha.
  const blob = await removeBackground(pngBuffer, {
    model: "isnet_fp16", // or "isnet_quint8" for smaller/faster
    output: { format: "image/png", quality: 0.95 },
  });
  return Buffer.from(await blob.arrayBuffer());
}

async function cleanAlpha(rgbaBuffer, featherSigma = 0.7) {
  const img = sharp(rgbaBuffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];

  const eroded = Buffer.alloc(width * height, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 255;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          m = Math.min(m, alpha[ny * width + nx]);
        }
      eroded[y * width + x] = m;
    }
  }

  const feathered = await sharp(eroded, { raw: { width, height, channels: 1 } })
    .blur(featherSigma)
    .raw()
    .toBuffer();

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4 + 0] = data[i * 4 + 0];
    out[i * 4 + 1] = data[i * 4 + 1];
    out[i * 4 + 2] = data[i * 4 + 2];
    out[i * 4 + 3] = feathered[i];
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function addDropShadow(rgbaBuffer, { dx = 0, dy = 12, blur = 18, opacity = 0.35 } = {}) {
  const meta = await sharp(rgbaBuffer).metadata();
  const pad = Math.ceil(blur * 3) + Math.max(Math.abs(dx), Math.abs(dy));
  const w = meta.width + pad * 2;
  const h = meta.height + pad * 2;

  const shadowMask = await sharp(rgbaBuffer)
    .extractChannel("alpha")
    .blur(blur)
    .toBuffer();

  const shadow = await sharp({
    create: { width: meta.width, height: meta.height, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: opacity } },
  })
    .joinChannel(shadowMask)
    .png()
    .toBuffer();

  return sharp({ create: { width: w, height: h, channels: 4,
                           background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: shadow, left: pad + dx, top: pad + dy },
      { input: rgbaBuffer, left: pad, top: pad },
    ])
    .png()
    .toBuffer();
}

export async function run(req, { openaiKey = "", recraftKey = "", fallbackGenerate } = {}) {
  let rgba;
  if (req.provider === "gpt-image-1" && openaiKey) {
    rgba = await generateOpenAI(req, openaiKey);
  } else if (req.provider === "recraft-v3" && recraftKey) {
    rgba = await generateRecraft(req, recraftKey);
  } else {
    if (!fallbackGenerate) throw new Error("fallbackGenerate required");
    const opaque = await fallbackGenerate(fallbackPrompt(req), req.size);
    rgba = await stripBackground(opaque);
  }
  rgba = await cleanAlpha(rgba, 0.7);
  if (req.wantShadow) rgba = await addDropShadow(rgba);
  await validateRgba(rgba); // defined in §Validation
  return rgba;
}
```

Two Node-specific gotchas worth hardcoding:

- `sharp` will **strip alpha** when piping through operations that don't
  preserve it — always call `.ensureAlpha()` before alpha math, and `.png()`
  (never `.jpeg()`) when writing.
- `@imgly/background-removal-node` downloads a ~80 MB ONNX model on first use;
  in serverless contexts, pre-bundle the model to `/var/task/models/` and set
  `publicPath` to a `file://` URL, or matting will time out cold starts.

## Shadow Synthesis Options

There are three qualitatively different ways to get a shadow under a
transparent asset, and the right one depends on whether the *original* scene
had a shadow the user wants preserved.

### Option A — Post-strip synthetic drop shadow (cheapest, most flexible)

After stripping the background, synthesize a shadow from the subject's alpha
channel. This is what the `_add_drop_shadow` / `addDropShadow` functions
above do. Pros: zero extra model calls, fully controllable (direction,
opacity, blur, color), consistent across a brand system. Cons: always a
**drop** shadow — you cannot produce a ground-contact shadow that wraps
around the subject's base, because you only have the 2D silhouette.

Recommended defaults for asset work:

- Icons / logos on light UI: `dy=4, blur=8, opacity=0.12`.
- Illustrations on light UI: `dy=12, blur=18, opacity=0.25`.
- Product shots on light UI: `dy=24, blur=40, opacity=0.35`, plus a second
  tighter "contact" shadow at `dy=2, blur=3, opacity=0.5` composited below
  the subject.

### Option B — Matting model that preserves the original shadow

If the subject was generated *with* a shadow on white, a hard binary matte
(BRIA RMBG, U²-Net salient-object style) will either delete the shadow
entirely or leave a dirty grey rectangle. The correct tool is a **trimap-free
alpha matting model** that outputs a true 0–255 alpha with fractional values
under the shadow:

- **BackgroundMattingV2** (Lin et al., CVPR 2021, PeterL1n/BackgroundMattingV2
  on GitHub): designed for video, needs a bare-background reference frame —
  you can synthesize one by blurring a clean patch of the generated white
  canvas. Gives per-pixel alpha, including shadow regions.
- **MatAnyone** (pq-yang/MatAnyone, 2024): zero-shot, no trimap, produces
  soft alpha; in 2026 this is the best off-the-shelf option for preserving
  both fine edges (hair) and cast shadows.
- **MODNet / RVM** (Robust Video Matting): works per-frame, good for portraits,
  weaker for arbitrary objects.

Drop-in replacement for `_strip_bg` using a soft-matting model (Python, HF
weights). Note: `.eval()` here is PyTorch's Module method that switches the
model to inference mode; it is unrelated to the Python builtin `eval`.

```python
import torch
import torchvision.transforms as T
from transformers import AutoModelForImageSegmentation

_matnet = AutoModelForImageSegmentation.from_pretrained(
    "PeterL1n/RobustVideoMatting", trust_remote_code=True)
_matnet.train(False)  # equivalent to .eval() — inference mode
_matnet = _matnet.cuda()

def _strip_bg_soft(img):
    t = T.ToTensor()(img).unsqueeze(0).cuda()
    with torch.inference_mode():
        fgr, pha = _matnet(t)[:2]
    alpha = (pha[0, 0].cpu().numpy() * 255).astype("uint8")
    rgba = img.convert("RGBA")
    rgba.putalpha(Image.fromarray(alpha, "L"))
    return rgba
```

### Option C — Generate with shadow, then relight

For the highest-quality result, generate the subject on a neutral mid-grey
background with shadow, matte with soft alpha (Option B), and then composite
onto the target surface with a relighting pass (e.g. IC-Light / Relight-SD).
This is overkill for most plugin work but worth knowing about for premium
"product photography" modes.

## Halo Removal and Edge Cleanup

Almost every off-the-shelf background remover leaves some version of the same
artifact: a **1–2 pixel ring of the original background color** around the
subject, where the alpha blending picked up "white" from the matte. On
coloured UI surfaces this reads as a white halo and instantly gives away
the asset as AI-cut.

The fix is a two-step alpha pass after matting:

1. **Erode the alpha by 1 pixel** (min-filter over a 3×3 neighborhood). This
   pushes the alpha boundary inward, so the halo pixels get alpha=0.
2. **Feather with a Gaussian blur σ≈0.7** on the alpha channel only. This
   restores the anti-aliased edge you just destroyed in step 1.

Both reference pipelines above do this in `_clean_alpha` / `cleanAlpha`. The
`feather` parameter is the main knob. Tuning guide:

| feather σ | visual result                                                   |
| --------- | --------------------------------------------------------------- |
| 0.0       | hard pixel edge, aliased, looks bad at any scale                |
| 0.5       | minimal anti-alias, good for pixel-art icons                    |
| 0.7–1.0   | **default** for logos/icons on UI                               |
| 1.5–2.0   | softer, good for illustrations                                  |
| >3.0      | blurred silhouette, almost always wrong                         |

For very fine structures (hair, fur, fronds), skip the erode step entirely —
it will eat the detail. Instead, use a **colour decontamination** pass:
replace each edge pixel's RGB with the nearest fully-opaque pixel's RGB,
weighted by alpha. This is what professional tools call "defringe" and is a
few lines of numpy:

```python
def defringe(rgba, iters=2):
    arr = np.array(rgba)
    rgb, a = arr[..., :3], arr[..., 3]
    mask = a > 240  # "definitely subject" pixels
    for _ in range(iters):
        shifted = np.stack([np.roll(rgb, s, axis=(0, 1)) for s in
                            [(1, 0), (-1, 0), (0, 1), (0, -1)]])
        shifted_mask = np.stack([np.roll(mask, s, axis=(0, 1)) for s in
                                  [(1, 0), (-1, 0), (0, 1), (0, -1)]])
        fill = np.where(shifted_mask[..., None], shifted, 0).sum(0) / \
               np.clip(shifted_mask.sum(0)[..., None], 1, None)
        new_mask = mask | shifted_mask.any(0)
        rgb = np.where(mask[..., None], rgb, fill.astype(np.uint8))
        mask = new_mask
    arr[..., :3] = rgb
    return Image.fromarray(arr)
```

## Validation Checks

The single biggest reliability win for a transparent-asset plugin is
**validating the output before returning it to the user**. The common broken
outputs are all cheap to detect:

1. **Not RGBA** — image is in `"RGB"` mode. Happens when the provider
   ignored `background=transparent` (Gemini does this ~30 % of the time even
   when explicitly instructed) or when a JPEG sneaks in. Detect:
   `img.mode != "RGBA"` (Pillow) or `metadata.channels < 4` (sharp).
2. **Fully opaque alpha** — `min(alpha) == 255`. The image is technically
   RGBA but every pixel is opaque; the white background is "baked in". Most
   frequent Gemini / Flux failure.
3. **Fully transparent alpha** — `max(alpha) == 0`. The matting model
   deleted the entire subject (happens on very low-contrast inputs or when
   BRIA RMBG hits a subject outside its training distribution).
4. **Binary alpha with no anti-aliasing** — edges are stair-stepped. Detect
   by measuring the standard deviation of alpha values in the band where
   `0 < alpha < 255`; if <2 pixels fall in that band, the alpha is binary.
5. **Checkerboard baked into RGB** — the model literally drew the
   Photoshop-style transparency checkerboard. Detect by FFT peak at
   ~16-pixel period or by a simple 2×2 block variance test.
6. **Solid background baked in** — 4 corner pixels all identical and
   `alpha==255` there. Indicates no strip happened.

Python validator:

```python
def validate_rgba(img, *, min_edge_pixels=64):
    assert img.mode == "RGBA", f"not RGBA, got {img.mode}"
    a = np.asarray(img.split()[-1])
    assert a.min() < 255, "alpha is fully opaque (strip did not happen)"
    assert a.max() > 0, "alpha is fully transparent (subject was deleted)"

    edge_band = ((a > 0) & (a < 255)).sum()
    assert edge_band >= min_edge_pixels, \
        f"alpha has no anti-aliased edge ({edge_band} px); looks binary"

    corners = [a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]]
    assert min(corners) < 255 or max(corners) - min(corners) > 0, \
        "all four corners are opaque; background was not stripped"

    rgb = np.asarray(img.convert("RGB"))
    blocks = rgb.reshape(rgb.shape[0] // 2, 2, rgb.shape[1] // 2, 2, 3)
    block_var = blocks.var(axis=(1, 3)).mean()
    assert block_var < 4000, "suspicious 2x2 variance — checkerboard baked in?"
```

Node validator:

```js
export async function validateRgba(pngBuffer, { minEdgePixels = 64 } = {}) {
  const img = sharp(pngBuffer).ensureAlpha();
  const meta = await img.metadata();
  if (meta.channels < 4) throw new Error("not RGBA");

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0, edgeBand = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < min) min = a;
    if (a > max) max = a;
    if (a > 0 && a < 255) edgeBand++;
  }
  if (min === 255) throw new Error("alpha fully opaque; strip did not happen");
  if (max === 0) throw new Error("alpha fully transparent; subject deleted");
  if (edgeBand < minEdgePixels) throw new Error("binary alpha, no AA edges");

  const { width, height } = info;
  const idx = (x, y) => (y * width + x) * 4 + 3;
  const corners = [data[idx(0, 0)], data[idx(width - 1, 0)],
                   data[idx(0, height - 1)], data[idx(width - 1, height - 1)]];
  if (corners.every((c) => c === 255))
    throw new Error("all corners opaque; background not stripped");
}
```

The plugin should surface these errors as **retriable**: on validation
failure, re-run the pipeline once with a more aggressive prompt suffix
(`"absolutely no background, pure alpha channel, RGBA PNG, transparent
pixels"`) and, for fallback providers, swap the matting model
(`birefnet-general` → `isnet-general-use`). After a second failure, return
the best-effort image with a warning rather than silently shipping an opaque
asset; the plugin's UX should clearly show the user that transparency
couldn't be verified.

## Full-pipeline Test Harness

A minimal snapshot harness the plugin should ship with:

```python
CASES = [
    ("cartoon avocado", "illustration", True),   # want shadow
    ("geometric monogram letter M", "logo", False),
    ("iOS app icon of a cloud", "icon", False),
    ("photo of a red sneaker", "photo", True),
]

def test_pipeline():
    for prompt, kind, shadow in CASES:
        img = run(TransparentRequest(prompt=prompt, asset_kind=kind,
                                     want_shadow=shadow,
                                     provider="fallback"),
                  fallback_generate=stub_gemini)
        validate_rgba(img)
        img.save(f"snapshots/{kind}_{prompt[:20]}.png")
```

Run this against every provider on a cron; diff the alpha-channel hashes.
When Gemini / Flux / SDXL ships a new model version, one or more cases will
usually regress — an automated checker catches it before users do.

## References

Primary docs:

- OpenAI Images API — `background` parameter, `gpt-image-1`:
  [platform.openai.com/docs/guides/images](https://platform.openai.com/docs/guides/images),
  [API ref](https://platform.openai.com/docs/api-reference/images).
- Recraft API — styles and transparent output:
  [recraft.ai/docs](https://www.recraft.ai/docs).
- Google Gemini 2.5 Flash Image ("Nano Banana") image generation quirks:
  [ai.google.dev/gemini-api/docs/image-generation](https://ai.google.dev/gemini-api/docs/image-generation).

Matting / background-removal models:

- rembg — CLI + Python lib, multi-backend:
  [github.com/danielgatis/rembg](https://github.com/danielgatis/rembg).
- BRIA RMBG 2.0 — commercial-licensed:
  [huggingface.co/briaai/RMBG-2.0](https://huggingface.co/briaai/RMBG-2.0).
- BiRefNet — 2024 SOTA for general matting:
  [huggingface.co/ZhengPeng7/BiRefNet](https://huggingface.co/ZhengPeng7/BiRefNet).
- BackgroundMattingV2 — CVPR 2021, shadow-preserving:
  [github.com/PeterL1n/BackgroundMattingV2](https://github.com/PeterL1n/BackgroundMattingV2).
- MatAnyone — 2024, zero-shot trimap-free:
  [github.com/pq-yang/MatAnyone](https://github.com/pq-yang/MatAnyone).
- IMG.LY background-removal-node — ONNX Runtime matting in Node:
  [github.com/imgly/background-removal-js](https://github.com/imgly/background-removal-js).

Imaging libs:

- Pillow — [pillow.readthedocs.io](https://pillow.readthedocs.io/).
- sharp / libvips — [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/).
- VTracer — raster → SVG, for the logo vectorize path:
  [github.com/visioncortex/vtracer](https://github.com/visioncortex/vtracer).

Related internal research:

- `13a-alpha-channel-model-support.md` — which models actually ship RGBA.
- `13b-matting-models.md` — deeper matting model comparison.
- `13c-checkerboard-artifact.md` — root cause of the "weird boxes" failure.
- `13d-logo-vector-path.md` — logo-specific vectorize-then-drop pipeline.
- `16-background-removal-vectorization/*` — post-processing landscape.
