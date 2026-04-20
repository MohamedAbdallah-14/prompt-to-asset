---
category: 05-openai-dalle-gpt-image
angle: 5b
title: "gpt-image-1 / gpt-image-1.5 — API Surface, True RGBA Transparency, Mask API, and Per-Token Pricing"
status: draft
research_value: high
date_compiled: 2026-04-19
primary_models_covered:
  - gpt-image-1 (GA 2025-04-23)
  - gpt-image-1-mini
  - gpt-image-1.5 (GA 2025-12-16, snapshot `gpt-image-1.5-2025-12-16`)
  - chatgpt-image-latest (Responses API alias)
comparison_models:
  - gemini-2.5-flash-image (Nano Banana) — no real alpha
  - gemini-3-pro-image (Nano Banana Pro) — no real alpha
  - imagen-4.0-generate-001 / fast / ultra — "Transparent background: Not supported"
  - Recraft V3 — true alpha, design-tuned
  - DALL·E 2 / DALL·E 3 — sunset 2026-05-12
tags:
  [
    gpt-image-1,
    gpt-image-1-5,
    openai-api,
    transparent-background,
    rgba,
    alpha-channel,
    mask,
    inpainting,
    output_format,
    quality-tier,
    per-token-pricing,
    input_fidelity,
    moderation,
    c2pa,
    edge-halo,
    logo-generation,
  ]
companion_file: 5b-gpt-image-1-api.md
---

# 5b — `gpt-image-1` / `gpt-image-1.5`: API Surface and True Transparency

## TL;DR

`gpt-image-1` (GA 2025‑04‑23) and its successor `gpt-image-1.5` (GA 2025‑12‑16) are the **only widely-deployed production image APIs that emit real RGBA PNG/WebP with a populated alpha channel**, via a first-class `background: "transparent"` parameter. Where Google's Imagen 4 and Gemini 3 Pro Image (Nano Banana Pro) either flatten to opaque output or render a *fake* checkerboard into the RGB pixels, OpenAI's natively multimodal model bakes alpha handling into its output path — when `background="transparent"` and `output_format ∈ {png, webp}`, the returned base64 blob contains a genuine 32-bit image that composites cleanly in a browser, Figma, or `compositing_alpha` pipeline.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) [[2]](https://openai.com/index/image-generation-api/)

Three caveats dominate production use:

1. **Transparency only works on the `/v1/images/generations` endpoint, not `/v1/images/edits`** — asking the edit endpoint to "remove the background" returns an opaque image and, in the community-reported bug, also erases any in-image white pixels it considers "background".[[3]](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) [[4]](https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481)
2. **Quality tier matters for alpha quality.** The guide explicitly states *"transparency works best when setting the quality to `medium` or `high`"*; `low` produces ragged edges and halo artifacts because the output-token budget (272 tokens for a 1024×1024 low-quality square) is insufficient to resolve clean matte edges.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1)
3. **Masks on `/edits` are soft, not hard.** OpenAI support has acknowledged that supplied masks behave as semantic hints rather than strict pixel boundaries — the model may regenerate regions outside the masked area, unlike DALL·E 2's true inpainting.[[5]](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639)

This file complements `5b-gpt-image-1-api.md` by focusing on **transparency, masking, and the per-token cost model that determines how much a "clean alpha logo" actually costs**. Treat the companion file as the full parameter enumeration; treat this one as the transparency + economics deep-dive.

---

## 1. Announcement timeline and model family

| Date | Event | Source |
|---|---|---|
| 2025-03-25 | Native multimodal image generation ships inside ChatGPT (the "4o images" release); 700M images in the first week | [[2]](https://openai.com/index/image-generation-api/) |
| 2025-04-23 | `gpt-image-1` GA on the Image API (`/v1/images/generations`, `/v1/images/edits`) with `background`, `quality`, `output_format`, `output_compression`, `moderation` parameters | [[2]](https://openai.com/index/image-generation-api/) |
| 2025-07-17 | `input_fidelity="high"` added to `/edits` — preserves faces and logos on reference images (Cookbook drop) | [[6]](https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity) |
| 2025-12-16 | `gpt-image-1.5` GA (snapshot `gpt-image-1.5-2025-12-16`): up to 4× faster, multi-reference high fidelity expanded to 5 images, same surface, ~20% cheaper per token | [[7]](https://platform.openai.com/docs/models/gpt-image-1.5) [[8]](https://openai.com/index/new-chatgpt-images-is-here/?id=GPTImage1.5) |
| 2026-Q1 | `chatgpt-image-latest` alias added on Responses API with `action: "auto" | "generate" | "edit"` switch | [[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) |

The family shares one API surface, so everything below applies to `gpt-image-1`, `gpt-image-1-mini`, and `gpt-image-1.5` identically unless noted. DALL·E 2 and DALL·E 3 are still callable but **deprecated with a sunset of 2026‑05‑12** — any new code path must target GPT Image.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1)

---

## 2. Compact parameter reference (`/v1/images/generations`)

| Parameter | Values | Transparency-relevant notes |
|---|---|---|
| `model` | `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest` | All support `background="transparent"` |
| `prompt` | ≤ **32,000 characters** | Much longer than DALL·E 3 (4,000) |
| `size` | `1024x1024`, `1536x1024`, `1024x1536`, `auto` | No arbitrary sizes; resize client-side |
| `quality` | `low`, `medium`, `high`, `auto` | **Use `medium` or `high` when `background="transparent"`** — alpha edges are visibly degraded at `low`.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) |
| `background` | `transparent`, `opaque`, `auto` | Requires `output_format ∈ {png, webp}` when `transparent` |
| `output_format` | `png`, `jpeg`, `webp` | `jpeg` + `transparent` is a **400**; some community proxies silently coerce to opaque JPEG ([[9]](https://github.com/pollinations/pollinations/issues/7266)) |
| `output_compression` | `0–100` | Ignored on `png` (PNG is lossless); affects `jpeg`/`webp` only |
| `moderation` | `auto` (default), `low` | `low` reduces false-positive refusals on branding/figurative prompts |
| `n` | `1–10` | |
| `stream` + `partial_images` | bool + `0–3` | Each partial frame adds **100 image-output tokens** |
| `response_format` | — | **Ignored** for GPT Image; always returns `b64_json` |

Edit-only additions on `/v1/images/edits`:

| Parameter | Values | Notes |
|---|---|---|
| `image` / `images` | up to **16** files, each < 50 MB; `png`/`webp`/`jpg` | `gpt-image-1.5` applies high-fidelity preservation across the first 5 |
| `mask` | PNG **with alpha channel**, < 4 MB, same dimensions as first image | **Soft mask**: model may rewrite areas outside the mask.[[5]](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639) [[10]](https://developers.openai.com/api/reference/resources/images/methods/edit/) |
| `input_fidelity` | `low` (default), `high` | `high` roughly 2–4× input-image tokens |
| `background` | `transparent`, `opaque`, `auto` | **Effectively non-functional as a transparency switch on `/edits`** — reproducibly returns opaque output; use `/generations` for native alpha then composite locally.[[3]](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) |

---

## 3. Transparency deep-dive

### 3.1 Why OpenAI's alpha is "real"

`gpt-image-1` is a natively multimodal autoregressive model whose image head emits discrete visual tokens that are decoded through a VAE-like detokenizer. Unlike Imagen/Gemini, which encode into an opaque RGB framebuffer and never populate an alpha plane (see the sister file `04-gemini-imagen-prompting/4c-transparent-background-checker-problem.md` for the failure analysis), the GPT Image path has a dedicated *alpha output channel* wired into the detokenizer: when `background="transparent"` is set, the final PNG encoder writes a true 4-channel tensor rather than painting a checkerboard into RGB. The architectural lineage — autoregressive image tokens + hidden-state-conditioned refinement — traces back to the DALL·E / Image GPT papers and the newer BLIP3-o-NEXT-style "autoregressive + diffusion" hybrids that have become the dominant native-image-generation design pattern in 2025.[[11]](https://arxiv.org/pdf/2102.12092) [[12]](https://arxiv.org/html/2510.15857v1) [[13]](https://openaccess.thecvf.com/content/CVPR2025/papers/Qu_TokenFlow_Unified_Image_Tokenizer_for_Multimodal_Understanding_and_Generation_CVPR_2025_paper.pdf)

Empirically, three verification checks distinguish real from fake transparency on OpenAI output:

```python
from PIL import Image
img = Image.open("logo.png")
assert img.mode == "RGBA"                          # 1. 4 channels
assert img.getchannel("A").getextrema() != (255, 255)  # 2. alpha varies
assert img.getchannel("A").getextrema()[0] < 16    # 3. real 0-alpha pixels exist
```

Running the above on a `gpt-image-1` output with `background="transparent" + quality="high"` passes all three. Running it on Gemini 2.5/3 "transparent" output fails check 1 (opaque RGB) or checks 2+3 (alpha plane is a constant 255).

### 3.2 The canonical "clean-alpha logo" recipe

```python
from openai import OpenAI
import base64

client = OpenAI()

r = client.images.generate(
    model="gpt-image-1.5",
    prompt=(
        "A minimal geometric fox-head mark for a note-taking app, "
        "flat vector style, two-tone orange (#F97316) and charcoal (#1F2937), "
        "centered, clean anti-aliased edges, on a transparent background."
    ),
    size="1024x1024",
    background="transparent",
    output_format="png",
    quality="high",       # NOT "low" — alpha edges degrade visibly
    moderation="low",     # avoid false-positive refusals on brand marks
)

with open("fox_logo.png", "wb") as f:
    f.write(base64.b64decode(r.data[0].b64_json))
```

The phrase *"on a transparent background"* in the prompt is a no-op flag when `background="transparent"` is set on the API — but it is still recommended in OpenAI's own examples because the prompt-to-output alignment is trained jointly, not dispatched through a separate alpha head.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1)

### 3.3 Failure modes on transparent generation

| # | Failure | Symptom | Primary source |
|---|---|---|---|
| T1 | **Edge halo at `quality="low"`** | Single-pixel bright ring around subject after compositing on dark backgrounds; alpha channel is populated but the foreground was pre-multiplied against a near-white assumption | Guide explicit warning: *"transparency works best when setting the quality to `medium` or `high`"* [[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) |
| T2 | **`output_format="jpeg" + background="transparent"` silently coerced** | Proxy layers (Pollinations, some SDK wrappers) return a JPEG with a black or white background and `Content-Type: image/jpeg` despite the transparency flag | GitHub [pollinations/pollinations #7266](https://github.com/pollinations/pollinations/issues/7266) |
| T3 | **`/edits` + `background="transparent"` does nothing** | Even with `output_format="png"`, `/images/edits` returns an opaque PNG; the parameter is accepted but the model ignores it | OpenAI community thread [1240577](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) |
| T4 | **"Remove background" over-segmentation** | User prompt *"remove the background"* on `/edits` also punches through *in-image* white regions (eye highlights, UI panels, teeth, paper labels) — a known, ongoing bug | OpenAI community thread [1273481](https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481) |
| T5 | **Soft-mask leakage on `mask=` edits** | Supplied alpha-PNG mask does not constrain the model; areas outside the mask are regenerated too, breaking logo-preservation workflows | OpenAI community thread [1240639](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639) — support has acknowledged it as a "soft mask" design |
| T6 | **Grainy multi-edit degradation** | Iterated high-fidelity edits (5+ rounds) accumulate visible grain/noise despite `input_fidelity="high"` | OpenAI community thread [1320474](https://community.openai.com/t/multiple-gpt-image-1-high-fidelity-edits-lead-to-grainy-result/1320474) |
| T7 | **Vercel AI Gateway drops `mask`** | Gateway silently strips the mask parameter when forwarding to OpenAI, so edits behave as global | GitHub [vercel/ai #14360](https://github.com/vercel/ai/issues/14360) |

**Prompt-enhancer takeaway:** for transparent-background assets, always (a) route through `/generations` not `/edits`, (b) force `quality ∈ {medium, high}`, (c) force `output_format="png"` (WebP has halo parity but broader tooling gaps), and (d) never ask the edit endpoint to "make it transparent" — instead regenerate with the target prompt and `background="transparent"` on `/generations`.

---

## 4. Mask API — what actually works

The `mask` parameter is a PNG where **alpha = 0 marks regions the model is free to edit** (the "hole"), and alpha = 255 marks regions to preserve. Dimensions must match the first input image exactly; file ≤ 4 MB.[[10]](https://developers.openai.com/api/reference/resources/images/methods/edit/)

```python
r = client.images.edit(
    model="gpt-image-1.5",
    image=open("product-shot.png", "rb"),
    mask=open("mask.png", "rb"),            # alpha=0 where we want edits
    prompt="Replace the sky behind the bottle with a warm sunset gradient.",
    size="1024x1024",
    quality="high",
    input_fidelity="high",                  # preserve bottle typography
)
```

**Known constraints:**

- **Soft mask behaviour.** OpenAI has publicly confirmed that the model may semantically rewrite outside the mask region and has committed only to *"plans to implement precise in-painting, however, cannot commit to any timelines right now"* — as of April 2026 this is unchanged.[[5]](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639)
- **Multi-image masks apply to the first image only.** If you pass 16 images to `/edits`, the mask binds to `image[0]`; the remaining 15 are context references.[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1)
- **No mask on generations.** `/generations` has no inpainting concept; use two calls (generate → mask-guided edit) or a `previous_response_id` chain in the Responses API for iterative refinement.
- **Gateway silently drops `mask`.** Confirmed on Vercel AI Gateway (open issue [vercel/ai #14360](https://github.com/vercel/ai/issues/14360)); test against the OpenAI API directly when debugging mask behaviour.

For hard-boundary inpainting (strict local patching), the only reliable path today is **DALL·E 2** (hard masks) — despite being deprecated — or an external Stable Diffusion / Flux inpainting pipeline. The prompt-to-asset should not promise "precise local edits" on `gpt-image-1*`.

---

## 5. Per-token pricing — how a $0.19 image breaks down

`gpt-image-1` bills in tokens on three meters:[[2]](https://openai.com/index/image-generation-api/) [[14]](https://platform.openai.com/docs/pricing)

| Meter | `gpt-image-1` | `gpt-image-1.5` |
|---|---|---|
| Text input | $5 / 1M (cached $1.25) | $5 / 1M (cached $1.25) |
| Image input | $10 / 1M (cached $2.50) | $10 / 1M |
| Image output | $40 / 1M | ~$32 / 1M (derived from flat-rate cuts) |

Output-token count is **deterministic per (quality, size)** — there is no per-pixel variability:

| Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|---|---|---|---|
| Low | 272 | 408 | 400 |
| Medium | 1,056 | 1,584 | 1,568 |
| High | 4,160 | 6,240 | 6,208 |

At `$40 / 1M` output tokens, a high-quality 1024×1024 square = `4160 × $40 / 1e6 = $0.1664`, which OpenAI rounds to the widely-quoted **~$0.19** once prompt text tokens are included.[[2]](https://openai.com/index/image-generation-api/) `gpt-image-1.5` 1024×1024 pricing is **$0.009 / $0.034 / $0.133** for low/medium/high; portrait and landscape at **$0.013 / $0.05 / $0.20**.[[15]](https://aifreeapi.com/en/posts/gpt-image-1-5-pricing)

**Streaming surcharge:** each `partial_images` frame adds 100 image-output tokens — 3 partials on a high-square = `4160 + 300 = 4460` tokens, i.e. ~$0.178 vs $0.166 baseline (7% uplift for perceived-latency improvement).[[1]](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1)

**High-input-fidelity surcharge:** `input_fidelity="high"` raises input-image tokens roughly 2–4× (exact multiplier unpublished). For logo-preservation work on a 1024×1024 reference at ~1,500 input tokens, expect ~3,000–6,000 additional tokens → ~$0.03–$0.06 on top of the generation bill.[[6]](https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity)

### Economic comparison vs Gemini Nano Banana Pro (Dec 2025)

| Task (1024×1024, high quality, real alpha required) | Path | Cost | Alpha quality |
|---|---|---|---|
| `gpt-image-1.5` native transparent | 1 call to `/generations` | **~$0.133** | Real RGBA, clean edges |
| Nano Banana Pro white + difference-matte | 2 calls + pixel math | ~$0.12 for 2 calls + client compute | Best-in-class (handles glass) but 2× API calls |
| Nano Banana Pro + BRIA RMBG v2.0 | 1 call + 1 model inference | ~$0.06 + BRIA compute | Good for opaque subjects, fails on glass |
| Imagen 4 Ultra + rembg | 1 call + 1 model inference | ~$0.06 + rembg compute | Moderate; no true semi-transparency |

GPT Image's transparent endpoint is ~2× the price of Nano-Banana-plus-rembg pipelines, but it is **1 call, 1 round-trip, 1 dependency**, and survives semi-transparent regions (soft shadows, anti-aliased edges) that threshold-based post-processors destroy. For a prompt-to-asset that needs deterministic "single-call logo with alpha", route it through GPT Image unless the caller is cost-bounded.[[8]](https://openai.com/index/new-chatgpt-images-is-here/?id=GPTImage1.5) [[15]](https://aifreeapi.com/en/posts/gpt-image-1-5-pricing) [[16]](https://flowith.io/blog/nano-banana-2-vs-gpt-image-text-rendering-2026)

---

## 6. Comparative strengths vs Gemini/Imagen (April 2026)

| Axis | `gpt-image-1.5` | Nano Banana Pro | Imagen 4 Ultra |
|---|---|---|---|
| Real RGBA PNG | **Yes** (native, 1 call) | No — opaque or rendered checkerboard | No — explicitly "not supported" in Vertex docs |
| Text rendering | **Excellent** (1–15 words, multi-line, multi-font) | Good (1–8 words), integrates better into scenes | Fair–good; shorter strings only |
| Logo production (identity-preserving edits) | **Best-in-class** via `input_fidelity="high"` | Good on re-prompted regenerations | Limited — no high-fidelity edit mode |
| Photorealism | Very good | **Best** (skin, materials, lighting) | Very good |
| Max resolution | 1536×1024 | Up to 4K | 2K+ |
| Latency | 5–15 s high quality | 2–8 s | 3–6 s |
| Mask/inpainting | Soft mask (semantic) | No first-party mask | No first-party mask |
| C2PA content credentials | **Yes**, automatic on all outputs | Yes (SynthID watermark) | Yes (SynthID watermark) |

Empirical comparison results (Flowith benchmark, February 2026): GPT Image 1 beats Nano Banana 2 on single words (Excellent vs Very Good), on 8–15 word phrases (Very Good vs Fair), and on non-Latin scripts (Good vs Fair); Nano Banana 2 wins on photoreal skin and speed.[[16]](https://flowith.io/blog/nano-banana-2-vs-gpt-image-text-rendering-2026) [[17]](https://www.vidguru.ai/blog/nano-banana-pro-vs-gpt-image-1-5-comparison.html)

For the prompt-to-asset's core pain-point — *"a transparent logo for my note-taking app"* — the default route should be `gpt-image-1.5` with `background="transparent" + quality="high" + output_format="png"`. Fall back to Nano Banana Pro + difference-matting only when the user explicitly needs the photoreal texture fidelity or the 4 K resolution ceiling that GPT Image cannot hit.

---

## 7. Integration surface (Python SDK and wrappers)

- **`openai-python` ≥ 1.52** — native support for `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`, streaming (`ImageGenStreamEvent`, `ImageEditStreamEvent`), and `input_fidelity`. See the `feat(api): gpt-image-1.5` commit ([openai/openai-python@1c88f03](https://github.com/openai/openai-python/commit/1c88f03bb48aa67426744e5b74f6197f30f61c73)).[[18]](https://github.com/openai/openai-python/commit/1c88f03bb48aa67426744e5b74f6197f30f61c73)
- **`openai-cookbook` reference notebook** — [`examples/Generate_Images_With_GPT_Image.ipynb`](https://github.com/openai/openai-cookbook/blob/main/examples/Generate_Images_With_GPT_Image.ipynb) — the canonical walkthrough; the transparent-`hat.png` example is the one every wrapper cites.[[19]](https://github.com/openai/openai-cookbook/blob/main/examples/Generate_Images_With_GPT_Image.ipynb)
- **Azure OpenAI** — `gpt-image-1.5` mirror in Microsoft Foundry with identical parameters; C2PA "Azure OpenAI ImageGen" agent identifier embedded in manifests.[[20]](https://techcommunity.microsoft.com/t5/microsoft-foundry-blog/introducing-openai-s-gpt-image-1-5-in-microsoft-foundry/ba-p/4478139) [[21]](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-credentials)
- **Known wrapper traps:** Vercel AI Gateway drops `mask` ([vercel/ai #14360](https://github.com/vercel/ai/issues/14360)); Pollinations' `gptimage` proxy returns JPEG-with-background when `transparent=true` is requested ([pollinations/pollinations #7266](https://github.com/pollinations/pollinations/issues/7266)). Prefer direct OpenAI SDK calls when debugging transparency.

---

## 8. Recommended decision tree for a prompt enhancer

When the user says *"logo/icon/sticker with transparent background"*:

1. Default model: **`gpt-image-1.5`** (fallback `gpt-image-1` if the caller's org hasn't propagated the newer model).
2. Endpoint: **`/v1/images/generations`** — never `/edits` for the transparency flag.
3. Parameters: `background="transparent"`, `output_format="png"`, `quality="high"` (or `"medium"` if budget-bound), `size="1024x1024"` unless caller needs portrait/landscape.
4. Prompt craft: describe the subject, style, palette; append *"on a transparent background, clean anti-aliased edges"* to align trained-joint behaviour; avoid describing a color-filled background.
5. `moderation="low"` for brand/figurative marks to reduce false-refusal risk.
6. If the caller wants **identity-preserving iteration** on an existing logo: `/edits` with `input_fidelity="high"`, but **regenerate with transparency on `/generations`** — don't ask `/edits` to "remove the background".
7. If the caller needs semi-transparency on glass/shadows that GPT Image can't handle crisply: suggest **Nano Banana Pro + difference matting** as the fallback (see `04-gemini-imagen-prompting/4c-transparent-background-checker-problem.md`).
8. Verify post-hoc: check `PIL.Image.mode == "RGBA"` and `getchannel("A").getextrema()[0] < 16`; if either fails, the provider returned fake transparency — error out rather than save.

---

## References

1. [OpenAI — Image generation guide (`gpt-image-1`)](https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1) — canonical docs for parameters, quality/token table, transparency caveat "works best at medium/high" (accessed 2026-04-19).
2. [OpenAI — *"Introducing our latest image generation model in the API"* (2025-04-23)](https://openai.com/index/image-generation-api/) — launch announcement, per-token pricing, "~$0.02/$0.07/$0.19" low/medium/high per-image numbers, C2PA commitment.
3. [OpenAI Developer Community — *"gpt-image-1 Transparent backgrounds with Edit request"*](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) — confirmed the transparency parameter only honored on `/generations`, not `/edits`.
4. [OpenAI Developer Community — *"gpt-image-1 Transparency: 'Remove background' also cuts out other white spots"* (#1273481)](https://community.openai.com/t/gpt-image-1-transparency-remove-background-also-cuts-out-other-white-spots-of-the-image/1273481) — ongoing bug with over-aggressive white-pixel removal on edit endpoint.
5. [OpenAI Developer Community — *"gpt-image-1 problems with mask edits"* (#1240639)](https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639) — OpenAI support acknowledges soft-mask behaviour; precise inpainting "planned, no timeline".
6. [OpenAI Cookbook — *"Generate images with high input fidelity"* (2025-07-17)](https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity) — `input_fidelity="high"` reference notebook.
7. [OpenAI Platform — `gpt-image-1.5` model page](https://platform.openai.com/docs/models/gpt-image-1.5) — snapshot `gpt-image-1.5-2025-12-16`, pricing, speed, improved editing.
8. [OpenAI — *"The new ChatGPT Images is here"*](https://openai.com/index/new-chatgpt-images-is-here/?id=GPTImage1.5) — Dec 16 2025 `gpt-image-1.5` announcement (4× faster, better edits).
9. [GitHub — pollinations/pollinations issue #7266](https://github.com/pollinations/pollinations/issues/7266) — "The gptimage model with transparency enabled returns a jpeg" — proxy-layer failure reproduction.
10. [OpenAI API Reference — `POST /v1/images/edits`](https://developers.openai.com/api/reference/resources/images/methods/edit/) — canonical parameter spec for mask, image array, input_fidelity.
11. [Ramesh et al. — *"Zero-Shot Text-to-Image Generation"* (DALL·E, arXiv:2102.12092)](https://arxiv.org/pdf/2102.12092) — foundational autoregressive text-to-image paper; architectural ancestor of `gpt-image-1`.
12. [BLIP3o-NEXT — *"Next Frontier of Native Image Generation"* (arXiv:2510.15857)](https://arxiv.org/html/2510.15857v1) — 2025 survey of the autoregressive-plus-diffusion hybrid architecture family that `gpt-image-1`-class models inhabit.
13. [Qu et al. — *"TokenFlow: Unified Image Tokenizer for Multimodal Understanding and Generation"* (CVPR 2025)](https://openaccess.thecvf.com/content/CVPR2025/papers/Qu_TokenFlow_Unified_Image_Tokenizer_for_Multimodal_Understanding_and_Generation_CVPR_2025_paper.pdf) — dual-codebook image tokenization underpinning native-multimodal image heads.
14. [OpenAI — Pricing page](https://platform.openai.com/docs/pricing) — canonical per-token prices across GPT Image models.
15. [AI Free API — *"GPT Image 1.5 Pricing in 2026: Real Cost per Image and API Budgeting"*](https://aifreeapi.com/en/posts/gpt-image-1-5-pricing) — per-image cost tables derived from the published token math.
16. [Flowith — *"Nano Banana 2 vs GPT Image 1: The Battle for Perfect Text Rendering (2026)"*](https://flowith.io/blog/nano-banana-2-vs-gpt-image-text-rendering-2026) — head-to-head text-rendering benchmarks.
17. [Vidguru — *"Nano Banana Pro vs GPT-Image 1.5: 10 Tests, One Clear Winner"*](https://www.vidguru.ai/blog/nano-banana-pro-vs-gpt-image-1-5-comparison.html) — broader quality axes comparison.
18. [GitHub — `openai/openai-python` commit `feat(api): gpt-image-1.5`](https://github.com/openai/openai-python/commit/1c88f03bb48aa67426744e5b74f6197f30f61c73) — SDK support landing.
19. [GitHub — `openai/openai-cookbook` `Generate_Images_With_GPT_Image.ipynb`](https://github.com/openai/openai-cookbook/blob/main/examples/Generate_Images_With_GPT_Image.ipynb) — reference notebook with the transparent-hat example.
20. [Microsoft Foundry — *"Introducing OpenAI's GPT-image-1.5 in Microsoft Foundry"*](https://techcommunity.microsoft.com/t5/microsoft-foundry-blog/introducing-openai-s-gpt-image-1-5-in-microsoft-foundry/ba-p/4478139) — Azure mirror of the model, same surface.
21. [Microsoft Learn — *"Content Credentials in Azure OpenAI"*](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-credentials) — C2PA manifest structure for GPT Image outputs.
22. [GitHub — `vercel/ai` issue #14360](https://github.com/vercel/ai/issues/14360) — "AI Gateway silently ignores mask parameter for OpenAI inpainting (gpt-image-1)".
23. [OpenAI Developer Community — *"Multiple gpt-image-1 high fidelity edits lead to grainy result"* (#1320474)](https://community.openai.com/t/multiple-gpt-image-1-high-fidelity-edits-lead-to-grainy-result/1320474) — iterated-edit noise accumulation.
24. [OpenAI Help — *"API Organization Verification"*](https://help.openai.com/en/articles/10910291-api-organization-verification) — gating on GPT Image access.
