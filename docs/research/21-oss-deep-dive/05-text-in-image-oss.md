---
wave: 1
role: niche-discovery
slug: 05-text-in-image-oss
title: "OSS text-in-image rendering (logos, OG, favicons)"
date: 2026-04-19
sources:
  - https://github.com/tyxsspa/AnyText2
  - https://github.com/tyxsspa/AnyText
  - https://arxiv.org/abs/2411.15245
  - https://github.com/microsoft/unilm/tree/master/textdiffuser-2
  - https://jingyechen.github.io/textdiffuser2/
  - https://arxiv.org/html/2311.16465
  - https://github.com/AIGText/Glyph-ByT5
  - https://glyph-byt5-v2.github.io/
  - https://huggingface.co/papers/2406.10208
  - https://github.com/aigtext/glyphcontrol-release
  - https://arxiv.org/abs/2305.18259
  - https://github.com/deep-floyd/IF
  - https://github.com/deep-floyd/IF/blob/main/LICENSE
  - https://github.com/QwenLM/Qwen-Image
  - https://huggingface.co/Qwen/Qwen-Image
  - https://arxiv.org/pdf/2508.02324
  - https://wavespeed.ai/blog/posts/qwen-2512-vs-sdxl-flux-text-benchmark
  - https://github.com/black-forest-labs/flux
  - https://ndurner.github.io/flux-text
  - https://about.ideogram.ai/3.0
  - https://developer.ideogram.ai/api-reference/api-reference/generate-v3
  - https://www.recraft.ai/docs/recraft-models/recraft-V3
  - https://replicate.com/recraft-ai/recraft-v3/api
  - https://github.com/vercel/satori
  - https://og-image.org/docs/dynamic-og
  - https://ogmagic.dev/blog/og-image-generator-comparison
  - https://arxiv.org/html/2410.18823v2
  - https://arxiv.org/abs/2505.06543
  - https://arxiv.org/abs/2601.00535
  - https://arxiv.org/abs/2410.01738
tags: [text-rendering, logo, anytext, textdiffuser, glyph-byt5, satori]
---

# OSS Text-in-Image Rendering (Logos, OG Cards, Favicons)

**Research value: high** — Two mature OSS diffusion families (AnyText2, Qwen-Image) now achieve production-grade text legibility, and a deterministic compositing rail (Satori, Pillow, Playwright) already guarantees pixel-perfect typography for the pathological cases.

Correct text inside a generated image is one of the hardest subproblems in T2I and the one most critical to this plugin: a logo with a misspelled wordmark, a favicon where the letter breaks at 16×16, or an OG card with garbled sub-headline is a hard product failure, not a cosmetic blemish. The OSS landscape splits cleanly into three tiers — specialized diffusion, strong-text foundation models, and deterministic HTML/text compositing — each with different legibility guarantees, licensing stories, and operational profiles.

## Tier A — Specialized text-rendering diffusion (add-ons over SDXL/SD1.5)

**AnyText & AnyText2** — `github.com/tyxsspa/AnyText2`, Apache-2.0 ([repo](https://github.com/tyxsspa/AnyText2)). AnyText2 (code + checkpoints + dataset released 2025-03-01, [arXiv 2411.15245](https://arxiv.org/abs/2411.15245)) is the strongest general-purpose multilingual text generator/editor in the OSS stack. It pairs a ControlNet-style auxiliary latent module with an OCR-supervised text-embedding module over SD1.5/SDXL, producing text that is both pixel-accurate and stylistically coherent. Reported deltas over AnyText v1.1: **+3.3 % Chinese accuracy, +9.3 % English accuracy, +19.8 % inference speed**, plus per-line font and color attribute control. Languages: **Chinese (Simplified/Traditional), English, Japanese, Korean, Arabic, Bengali, Hindi** (7 scripts, inherited from AnyText). Hard limits: the demo sets `BBOX_MAX_NUM = 8` — i.e., up to **8 text regions** per image, with multi-line support inside each bbox; no explicit per-bbox character cap, but legibility degrades past ~20 characters per line. Apache-2.0 makes it commercial-safe end-to-end (the rarest property in this tier).

**TextDiffuser-2** — `github.com/microsoft/unilm/tree/master/textdiffuser-2`, **CreativeML OpenRAIL-M** (restrictive — forbids harmful use, requires passing the license downstream). Architecture is genuinely novel: a language model (M1) plans the layout *and invents the words* from a high-level prompt, a second LM (M2) encodes position + text at *line level* (not character level, a deliberate reversal of the v1 design) and fuses into a LoRA-adapted SD pipeline. ECCV 2024 oral. The 95-character alphabet (digits, upper/lower, punctuation, space) is defined in the training code. Strongest feature: natural-language layout editing (“move the title up, make the subtitle bigger”) via conversational M1. Multi-line: yes, natively. Languages: **English only**. The OpenRAIL-M license is the principal integration risk — less friendly than AnyText2’s Apache-2.0.

**Glyph-ByT5 / Glyph-ByT5-v2** — `github.com/AIGText/Glyph-ByT5`, Apache-2.0 for code ([project page](https://glyph-byt5-v2.github.io/)). A *customized text encoder* (ByT5 variant) that replaces CLIP/T5 text conditioning inside SDXL, not a full pipeline. v2 hits **95.87 % spelling accuracy for English on ≤ 20-character strings**, pushes SDXL design-benchmark text rendering from < 20 % → ~90 %, and renders **paragraph-level text** with tens-to-hundreds of characters across automated multi-line layouts. Supports ~10 languages (EN/FR/ES/IT/DE/PT/RU/ZH/JA/KO). **Critical caveat**: as of 2024-06-28 the repo **removed the pre-trained weights** pending Microsoft RAI review; the encoder architecture and training recipe remain reproducible but practical adoption currently requires retraining, or using a community re-release (risky). As of 2026-04-21, weights have not been officially re-released — the repo issue tracker shows ongoing user inquiries with no resolution announced. Treat as “best-in-class on paper, not turnkey today”.

> **Updated 2026-04-21:** Glyph-ByT5-v2 weights remain unavailable from official sources as of April 2026. The Microsoft RAI review has not concluded with a public re-release. This project is effectively blocked for practical adoption.

**GlyphControl** — `github.com/AIGText/GlyphControl-release`, **MIT**, NeurIPS 2023 ([arXiv 2305.18259](https://arxiv.org/abs/2305.18259)). ControlNet-style glyph conditioning over SD 1.x/2.x. Outperforms DeepFloyd IF and vanilla SD on OCR accuracy and CLIP score with **3× fewer parameters**. English-only, good for short wordmarks (< 10 chars), native multi-line via glyph image. The cleanest license in this tier — and an excellent fallback when AnyText2’s footprint is too heavy.

**DeepFloyd IF** — `github.com/deep-floyd/IF`. **Dual license**: code is Modified MIT, weights are governed by the separate **DeepFloyd IF License** (non-commercial research / derivative terms, requires preserving the inference safety filter). Pixel-space cascaded T5-XXL pipeline; was the SD-era text-rendering champion but has been substantially eclipsed by Flux, Qwen-Image, and the SDXL-encoder approaches above. Keep on the shortlist only if the product stays non-commercial in the free tier — otherwise the weights license is disqualifying.

**SIGIL / HDGlyph / FreeText / VitaGlyph (2024–2026 research frontier)** — active but not yet productionized. SIGIL ([arXiv 2410.18823](https://arxiv.org/html/2410.18823v2)) targets cross-lingual *style transfer* using glyph latents + VAE + OCR-RL; HDGlyph ([arXiv 2505.06543](https://arxiv.org/abs/2505.06543)) disentangles glyph rendering for long-tail scripts; FreeText ([arXiv 2601.00535](https://arxiv.org/abs/2601.00535)) is a **training-free** attention-localization + spectral-glyph-injection method for diffusion *transformers* — potentially a drop-in booster over Flux/Qwen when their stock text fails. Watch-list, not build-against.

## Tier B — Foundation models with strong native text (no glyph module needed)

**Qwen-Image / Qwen-Image-2512** — `github.com/QwenLM/Qwen-Image`, **Apache-2.0**, 20 B parameter MMDiT ([paper](https://arxiv.org/pdf/2508.02324)). The first open-weight foundation model that renders **complex Chinese** correctly, handles paragraph-level English, mixed Chinese/English typography, math formulas, and multiple font styles natively. WaveSpeedAI’s reproducible benchmark has 2512 matching or beating Flux and SDXL on text-in-image tasks. Apache-2.0 weights, commercial-safe, available on HF and ModelScope. **This is the new default answer for OSS text-in-image in 2026.**

> **Updated 2026-04-21:** Qwen-Image-2512 weights were released December 31, 2025. The model is also available via Alibaba Cloud Model Studio as `qwen-image-max` at $0.075/image. A Lightning-quantized variant (`lightx2v/Qwen-Image-2512-Lightning`) and community LoRAs (Civitai) have appeared, confirming active adoption. This supersedes the earlier base Qwen-Image model released in August 2025.

**FLUX.1 dev / FLUX.1 schnell / FLUX.2** — `github.com/black-forest-labs/flux`. **FLUX.1 [dev] is non-commercial**; **FLUX.1 [schnell] is Apache-2.0**; FLUX.2 terms vary by tier. Dual CLIP + T5 text encoders give it markedly better short-phrase rendering than SDXL, but independent testing ([ndurner write-up](https://ndurner.github.io/flux-text), [WaveSpeedAI](https://wavespeed.ai/blog/posts/qwen-2512-vs-sdxl-flux-text-benchmark)) consistently finds it fails on multi-sentence passages and has weaker kerning than marketing suggests. Good for **single-line wordmarks ≤ ~25 chars**, headline text on OG cards, poster taglines. Use schnell for the commercial path; treat Flux-dev outputs as non-commercial.

**Closed-API reference points (not OSS, but the quality ceiling).** **Ideogram v3** — closed, API-only, ~90 % text accuracy, explicit “typography module”, best-in-class for logos/posters/marketing banners. **Recraft V3** — closed, API-only ($0.04/image on Replicate), the only general model that lets you **pin text to specific positions** and reliably renders long passages; topped the Hugging Face text-to-image ELO board (1172). These belong in tier-1 of the routing table as the commercial ceiling; the OSS tiers below must be chosen so a tier-down decision doesn’t tank legibility.

## Tier C — Deterministic HTML/text compositing (guaranteed legibility)

When the user says “the text must be correct” — the logo’s wordmark, the favicon’s letter, the OG card’s headline — diffusion is the wrong primitive. Render the background with T2I, render the text deterministically on top.

**Satori + `@vercel/og`** — `github.com/vercel/satori`, **MPL-2.0**. HTML/CSS/JSX → SVG → PNG via Yoga flexbox, typically 50–200 ms per image, serverless-friendly. Already battle-tested for OG cards. Supports flex, custom fonts (as ArrayBuffer), gradients, box-shadow; does **not** support CSS Grid, animations, pseudo-elements, media queries, or most transforms. Pairs with `resvg` for PNG rasterization. Ideal for: OG cards, text-bearing favicons, badge-style logos, any asset where typography is the focal point.

**Playwright / Puppeteer screenshot pipelines** — Apache-2.0 / Apache-2.0. Full browser fidelity (all CSS, web fonts, SVG filters, animations), 1–3 s/image, heavy cold-start. Right tool when Satori’s CSS subset doesn’t cover the design (complex gradients, CSS filters, SVG masks, variable fonts, bidi text). Multi-line and any language the browser supports.

**Pillow / ImageMagick** — MIT-CMU / Apache-2.0-compatible. The lowest-level rail: `ImageDraw.text()` over a PIL `Image`, or `convert -draw` for ImageMagick. Perfect for **favicons with letters** (16/32/48 px), watermarks, and compositing a diffusion-generated mark with a deterministic wordmark. No layout engine, no flexbox — you compute positions. Trivial to embed in Python backend workers.

## Integration Recommendations

Adopt a **three-tier router**, choosing per-asset based on `(textRendering: required|preferred|none, languages, legibility_tolerance)` and tier budget:

- **Tier 1 — Commercial API for text-critical assets.** Route logos with wordmarks, dense OG cards, marketing posters, and any paid-tier request with `textRendering: required` to **Ideogram v3** (default) or **Recraft V3** (when pixel-precise positioning is requested). Budget-gated; falls back to tier 2 on quota exhaustion.

- **Tier 2 — OSS diffusion with typography.** Default OSS path uses **Qwen-Image-2512** (Apache-2.0, strong CN+EN+multi-line, 20 B MMDiT) for any asset with text. When Qwen is unavailable or over-kill, fall back to **AnyText2** (Apache-2.0, 7 scripts, up to 8 text regions) on an SD1.5/SDXL backbone; **FLUX.1 schnell** (Apache-2.0) for short English wordmarks; **GlyphControl** (MIT) as the minimal-footprint backup. Skip Glyph-ByT5-v2 until Microsoft re-releases weights; skip TextDiffuser-2 unless the CreativeML-OpenRAIL-M license is acceptable; skip DeepFloyd IF for commercial paths.

- **Tier 3 — Deterministic compositing for guaranteed legibility.** For favicons with letters, text-heavy OG cards, any asset where `legibility_tolerance = 0`, and the regenerate-loop fallback when `validate_asset` flags illegible text: generate the *background/mark only* with tier 1 or 2 (`textRendering: "none"`, prompt contains no text), then composite the wordmark deterministically via **Satori / `@vercel/og`** (OG cards, badges), **Playwright** (complex CSS), or **Pillow** (favicons, simple overlays). This tier is the product’s **correctness floor**: it can always produce a legible asset, so tier 1/2 are allowed to try bolder designs without risking hard failure.

The router should also surface tier to the agent (“this was rendered deterministically because the wordmark must be legible at 32×32”) so the MCP tool output reads as an engineering decision, not a black-box fallback — consistent with the “context bridge, not code generator” principle from the category index.
