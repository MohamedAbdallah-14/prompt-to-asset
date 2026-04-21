---
category: 20-open-source-repos-landscape
angle: 20a
title: "Prompt-Enhancement OSS Repos Specific to Image Generation"
author: research-subagent-20a
date: 2026-04-19
word_count_target: 2500-4000
sources_count: 25
primary_sources:
  - github.com/NeoVertex1/SuperPrompt
  - github.com/microsoft/LMOps (promptist)
  - github.com/Hunyuan-PromptEnhancer/PromptEnhancer
  - github.com/adieyal/sd-dynamic-prompts
  - github.com/lllyasviel/Fooocus
  - github.com/promptslab/Promptify
  - github.com/thunlp/OpenPrompt
  - huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion
  - huggingface.co/roborovski/superprompt-v1
  - huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2
  - arxiv.org/abs/2212.09611 (Promptist paper)
  - github.com/Karine-Huang/T2I-CompBench
tags:
  - open-source
  - prompt-enhancement
  - text-to-image
  - landscape-survey
  - oss-audit
---

# 20a — Prompt-Enhancement OSS Repos for Image Generation

## Executive Summary

The open-source prompt-enhancement landscape for text-to-image (T2I) models is dense but fragmented. It splits cleanly along **three axes**: (1) **delivery surface** — standalone library vs. webUI extension (AUTOMATIC1111) vs. ComfyUI custom node vs. built-in pipeline stage (Fooocus, SD.Next); (2) **method** — hand-written templates (SuperPrompt, wildcard DSLs), small fine-tuned LMs that "upsample" prompts (MagicPrompt-SD, SuperPrompt-v1, Fooocus's GPT-2, BeautifulPrompt, Promptist), and full chain-of-thought LLM rewriters driven by frontier models (Hunyuan PromptEnhancer, Vertex AI Imagen rewriter, ComfyUI-Ollama nodes); (3) **target model family** — SD/SDXL-centric (the overwhelming majority), a small group aimed at Flux/Hunyuan, and effectively **zero mature OSS projects aimed at Gemini Imagen 3/4, GPT-image-1 or DALL·E 3's "revised prompt" pipeline**.

Three findings deserve emphasis for the prompt-to-asset project:

1. **Hunyuan-PromptEnhancer (7B/32B, Apache-2.0, ~3.7k stars) is the current state-of-the-art OSS prompt rewriter** and the first widely-available model trained specifically via RL against a T2I alignment reward (AlignEvaluator, 24 failure-mode key points). It is the closest prior art to what we want to build, but it is SD/Flux-flavored, not asset-flavored (no logo/favicon/transparent-background awareness). Its reward model is the single most reusable artifact in the entire landscape.
2. **Microsoft's Promptist (arXiv:2212.09611, NeurIPS 2023) is the reference architecture** — SFT on engineered prompts, then RL with a reward mixing CLIP similarity and aesthetic score. Every serious OSS rewriter since (BeautifulPrompt, Hunyuan) is a direct descendant. Promptist itself is a 125M GPT-2 — tiny, CPU-runnable, MIT via LMOps, and a perfect "fallback rewriter" for a hosted product.
3. **No OSS project targets the software-asset regime (logos, app icons, favicons, transparent RGBA, vector-friendly compositions)** — everything in the landscape is tuned for aesthetic "cinematic photograph of a woman" SD prompts. The entire market opportunity here is unoccupied by open source. Borrowing the method stack (template DSL from sd-dynamic-prompts, RL+reward from Promptist/Hunyuan, CoT scaffolding from Hunyuan, multi-model adaptation from Promptify) while retargeting the reward/templates at **asset correctness** (platform specs, transparent alpha, text legibility in logos, safe zones) is the differentiating play.

---

## Repo Table

Stars and commit dates as observed via web search on 2026-04-19; these are necessarily approximate and should be refreshed before publication.

> **Updated 2026-04-21:** Fooocus is now in Limited Long-Term Support (LTS) mode — bug fixes only, no new features. Last feature release was v2.5.5 (August 2025). The developer explicitly recommends Forge or ComfyUI for Flux-era work. Several active community forks exist but none have become a dominant successor. The expansion.py trick remains usable (its weights are the licensing concern, not the algorithm). For the `~48k` star count: the parent repo is effectively frozen at that level — not growing.

| Repo | Stars | Last commit | Primary approach | Target model | License | Ideas we can borrow |
|---|---|---|---|---|---|---|
| [NeoVertex1/SuperPrompt](https://github.com/NeoVertex1/SuperPrompt) | ~6.4k | 2025-09 | XML-tagged system-prompt template (meta-instruction) | LLM-side (Claude primarily), used upstream of any T2I | MIT-ish (README only, no LICENSE at repo root last checked) | The "meta-instructions with XML tags" framing is a cleaner authoring surface than free-form system prompts; would map well to an asset-spec XML schema |
| [microsoft/LMOps — promptist/](https://github.com/microsoft/LMOps/tree/main/promptist) | ~4.0k (parent repo) | active | Fine-tuned GPT-2 (125M) via SFT + PPO with CLIP + aesthetic reward | SD 1.x | MIT | The full SFT→RL recipe is the canonical reference. Reward design (aesthetic + CLIP similarity, balanced to preserve intent) is directly reusable |
| [Hunyuan-PromptEnhancer/PromptEnhancer](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer) | ~3.7k | 2025 active | Chain-of-thought LLM rewrite, SFT + GRPO with AlignEvaluator reward; 7B/32B + Img2Img-Edit model | Hunyuan-DiT / SD / Flux | Apache-2.0 | CoT rewrite scaffold, 24 fine-grained failure-mode reward points, multi-level fallback parsing, Img2Img edit variant |
| [promptslab/Promptify](https://github.com/promptslab/Promptify) | ~4.6k | 2026-03 | Pydantic-structured task prompts, LiteLLM backend | Text-only NLP tasks (NER, QA, etc.), **not T2I** | Apache-2.0 | Structured output with Pydantic + LiteLLM multi-provider is a clean implementation pattern we should copy for the rewriter's API |
| [thunlp/OpenPrompt](https://github.com/thunlp/OpenPrompt) | ~4.8k | 2023 (stale) | Prompt-learning framework: templates + verbalizers | Text-only PLMs (BERT/GPT/T5), **not T2I** | Apache-2.0 | Template/Verbalizer separation is a useful mental model for "asset spec template" vs "model-family verbalizer" split |
| [adieyal/sd-dynamic-prompts](https://github.com/adieyal/sd-dynamic-prompts) | ~2.3k | 2024-07 | Rule-based template DSL: `{a|b|c}`, `__wildcards__`, `[2$$a|b]` | AUTOMATIC1111, ComfyUI (sister port) | MIT | The tiny template language is battle-tested; our asset spec (brand colors, variants, platforms) should compile to a DSL like this for deterministic expansion |
| [lllyasviel/Fooocus — extras/expansion.py](https://github.com/lllyasviel/Fooocus/blob/main/extras/expansion.py) | ~48k (parent) | 2024 (LTS only) | Offline GPT-2 prompt expander + positive-word bias + custom logits processor | SDXL | GPL-3.0 (model CC-BY-NC-4.0) | The "positive vocabulary + no-repeat logits" trick is cheap, offline, and remarkably effective; reusable as a fallback when API LLMs are unavailable |
| [Gustavosta/MagicPrompt-Stable-Diffusion](https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion) | HF-hosted (GitHub: Kaludii wrapper 17★) | 2023 | GPT-2 fine-tuned on 80k Lexica.art prompts | SD 1.x | MIT | The training-data recipe (scrape a curated prompt site, filter, fine-tune GPT-2) remains the cheapest path to a domain-tuned rewriter. We can replicate with a logo/icon dataset |
| [roborovski/superprompt-v1](https://huggingface.co/roborovski/superprompt-v1) (+ [Nick088Official/SuperPrompt-v1](https://github.com/Nick088Official/SuperPrompt-v1)) | HF 1.4M downloads; GH ~180★ | 2024 | T5-small (77M) fine-tuned for prompt upsampling with fixed task prefix | Any, ≤77 tokens | MIT | 77M params, CPU-runnable, fixed-prefix instruction is a good "always-on" background enhancer we can embed in the website |
| [alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2](https://huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2) (BeautifulPrompt, EMNLP 2023) | HF-hosted; [sd_webui wrapper](https://github.com/leeguandong/sd_webui_beautifulprompt) ~100★ | 2023 | BLOOM-1.1B, SFT + PPO on aesthetic + consistency reward, also emits `(weight:1.2)` syntax | SD 1.x | Apache-2.0 | Outputs SD weight syntax natively; training pipeline (auto-collected data via summarization + captioning + expansion) is cheaper than Promptist's |
| [Karine-Huang/T2I-CompBench](https://github.com/Karine-Huang/T2I-CompBench) | ~0.5k | 2025 (TPAMI++ release) | Evaluation benchmark (6000 compositional prompts, 6 sub-categories) | Model-agnostic evaluator | Research license (non-commercial-ish) | Use the attribute-binding / spatial-relation / complex-composition prompt templates as **eval set** for our rewriter's compositional skill |
| [AUTOMATIC1111/stable-diffusion-webui-promptgen](https://github.com/AUTOMATIC1111/stable-diffusion-webui-promptgen) | ~530 | 2023 | Webui extension wrapping GPT-2 finetunes (lexart, majinai) | SD webui | GPL-3.0 (inherits) | Pattern: ship the rewriter as an extension so power users can swap models — useful for "advanced mode" on our website |
| [imrayya/stable-diffusion-webui-Prompt_Generator](https://github.com/imrayya/stable-diffusion-webui-Prompt_Generator) | ~250 | active | distilgpt2 + MagicPrompt + blacklist/filter params | SD webui | MIT | The **blacklist** (banned-tokens) feature is a missing primitive in most rewriters; essential for brand-safety |
| [stavsap/comfyui-ollama](https://github.com/stavsap/comfyui-ollama) | ~810+ | active | ComfyUI nodes wrapping Ollama local LLMs (generate + chat + vision) | ComfyUI graph | MIT-ish | Reference for local-LLM rewriting in a node graph; our Claude Skill should expose a similar "rewrite via local model" fallback |
| [sipherxyz/comfyui-art-venture](https://github.com/sipherxyz/comfyui-art-venture) | ~340 | 2026-03 | ComfyUI node pack: URL/base64 image loading, JSON input, multi-provider LLM prompter (OpenAI/Claude/Gemini/Bedrock), LaMa inpaint | ComfyUI graph | MIT | Multi-provider LLM node is the cleanest OSS example of swapping Gemini/Claude/GPT behind one interface |
| [ScreamingHawk/comfyui-ollama-prompt-encode](https://github.com/ScreamingHawk/comfyui-ollama-prompt-encode) | low (<200) | active | Replaces CLIP Text Encode with Ollama-generated prompt that then feeds CLIP | ComfyUI / SD | MIT | Interesting primitive: the rewriter is **welded into the encoder**, so the user sees one node. Good UX pattern |
| [BigStationW/ComfyUI-Prompt-Rewriter](https://github.com/BigStationW/ComfyUI-Prompt-Rewriter) | low | 2025 | llama.cpp GGUF inference inside ComfyUI, supports VLMs (up to 5 image inputs) | ComfyUI | MIT-ish | Shows the VLM path: feed a reference image + prompt, rewrite grounded in visual context. Directly relevant for our "match brand style" feature |
| [EricRollei/Local_LLM_Prompt_Enhancer](https://github.com/EricRollei/Local_LLM_Prompt_Enhancer) | low | active | 5 specialized nodes (Flux/SDXL/Pony), 50+ aesthetic presets, LM Studio/Ollama backends | ComfyUI | MIT | Model-family-specific preset packs is a good pattern for "Gemini vs Imagen vs GPT-image-1 vs Flux" presets |
| [Limbicnation/ComfyUI-PromptGenerator](https://github.com/Limbicnation/ComfyUI-PromptGenerator) | low | active | Qwen3-8B via Ollama, 7 style presets (Cinematic/Anime/Photoreal/Fantasy/Abstract/Cyberpunk/Sci-Fi), Jinja2 templates | ComfyUI | MIT | Jinja2 template layer over local LLM prompting is a clean extensibility story |
| [vladmandic/sdnext — Prompt-Enhance wiki](https://github.com/vladmandic/sdnext/wiki/Prompt-Enhance) | ~6k parent | active | Built-in LLM enhancer supporting HF transformers + GGUF | SD.Next | AGPL-3.0 (parent) | First-class "prompt enhance" as a pipeline step (not a separate node) is the UX we want on the website |
| [Kaludii/Stable-Diffusion-Prompt-Generator](https://github.com/Kaludii/Stable-Diffusion-Prompt-Generator) | ~20 | 2023 | Streamlit app around MagicPrompt-SD | SD 1.x | MIT | Minimal Streamlit reference for a single-purpose prompt-to-asset webapp |
| [kevinmulier/prompt-generator-stable-diffusion](https://github.com/kevinmulier/prompt-generator-stable-diffusion) | ~36 | 2025-06 | Pure JS/HTML/Tailwind, customizable word lists, portrait/landscape modes, bulk generation up to 10k | SD | MIT | 100% frontend, no server, MIT — an extremely cheap path to ship a v0 "random brand prompt" page |
| Vertex AI Imagen "Prompt Rewriter" (proprietary, cited for completeness) | n/a | active | LLM-based auto-rewrite when prompt < 30 words, default-on | Imagen 3 | proprietary | Confirms that Google itself believes the rewrite step is necessary for Imagen; validates the product thesis |
| DALL·E 3 "revised_prompt" (proprietary) | n/a | shipped 2023 | Server-side LLM rewrite, returned in response | DALL·E 3 / gpt-image-1 | proprietary | Existence of `revised_prompt` field confirms API contract we should mirror in our own output |
| [pavank-code/RePRo](https://github.com/pavank-code/RePRo) | low | 2025 | Chrome extension, auto-detects prompt type, CoT templates for DALL-E/MJ/SD | browser overlay | MIT-ish | Browser-side prompt enhancement is a viable distribution channel we haven't considered |

---

## Method Classification

### 1. Rule-based / template DSLs

**Examples:** `sd-dynamic-prompts`, `kevinmulier/prompt-generator-stable-diffusion`, DJZ-Nodes `PromptInject`/`PromptSwap`/`PromptCleaner`, large parts of SuperPrompt (its XML meta-instructions are templates, not learned behavior).

Rule-based systems are **deterministic, cheap, and offline**, which is their whole appeal. The `sd-dynamic-prompts` DSL (`{a|b|c}`, `__seasons__`, `[2$$red|blue|green]`) has been stable for 3 years and is still the most copied DSL in the space — the ComfyUI community has at least three ports. The limitation is that they don't actually *enhance* a prompt; they *expand a slot-filled template*. You still need a human to have written a good template.

For our project, template DSLs are the right **bottom layer**: any prompt enhancer needs a deterministic way to inject brand colors, platform sizes, transparency directives, and negative-prompt boilerplate. The DSL is not the product, but it is the substrate on top of which an LLM rewriter operates.

### 2. Small fine-tuned LMs ("prompt upsamplers")

**Examples:** MagicPrompt-SD (GPT-2, 124M), Fooocus's `FooocusExpansion` (GPT-2 + positive-word filter + custom logits), Promptist (GPT-2, 125M), SuperPrompt-v1 (T5, 77M), BeautifulPrompt (BLOOM-1.1B).

This class dominates the pre-2024 landscape. Recipe:
- Collect 10k–200k high-quality prompts (Lexica, community SD sites, vendor exports).
- SFT a small open LM (GPT-2, T5-small, BLOOM-560M/1.1B) on `short_input → long_polished_output` pairs.
- Optionally add an RL stage (Promptist, BeautifulPrompt) with a reward combining CLIP/text-image similarity and an aesthetic score (LAION-Aesthetic or a fine-tuned variant).
- Optionally add constrained decoding: Fooocus biases toward a whitelist of "positive" tokens and blocks repeats; `imrayya/..._Prompt_Generator` supports a blacklist.

Strengths: **CPU/edge-runnable**, ~77M–1.1B params, MIT/Apache, deterministic at temperature 0, fast, no API costs. Weaknesses: they drift toward a single aesthetic (LAION-Aesthetic photograph look), are hard to steer ("less anime, more minimalist brand logo"), and they don't reason about asset correctness at all.

For us, these are the **always-on background enhancer** for the free tier: a ~100M-parameter model running in the browser or on a single CPU box, doing the Fooocus-style "house in garden → cinematic detailed photograph of a charming rural cottage…" bulk expansion.

### 3. LLM-rewrite (frontier model or 7B+ fine-tune)

**Examples:** Hunyuan-PromptEnhancer-7B/32B, Google Vertex Imagen prompt rewriter, DALL·E 3's revised_prompt, ComfyUI-Ollama, ComfyUI-Prompt-Rewriter (llama.cpp + VLMs), EricRollei's Local_LLM_Prompt_Enhancer, comfyui-art-venture's multi-provider LLM nodes, BigStationW's VLM-capable rewriter, Limbicnation's Qwen3-8B generator.

This is the 2024–2026 frontier. Differences from the prior class:
- Uses a general-purpose instruction-tuned LLM (GPT-4o, Claude, Gemini, Qwen3-8B, Llama-3) and steers it with a **system prompt + CoT scaffold** rather than fine-tuning weights.
- Can reason compositionally: "the user wants a transparent PNG logo; don't describe a background" is a prompt the model actually understands.
- Supports VLM mode (BigStationW, art-venture): pass a reference image and rewrite grounded in visual features.
- Multi-provider by default: a single abstraction (LiteLLM — used by Promptify, comfyui-art-venture, many others) routes to OpenAI/Anthropic/Google/Ollama.

Hunyuan's contribution is to **combine the LLM-rewrite approach with Promptist-style RL**: start from a 7B/32B instruction-tuned base, SFT on CoT rewrite traces, then GRPO with a 24-key-point alignment reward (the AlignEvaluator). This closes the last gap where LLM rewriters underperformed dedicated small models on T2I-CompBench-style compositional tasks.

### 4. Hybrid (template + LLM + learned verbalizer)

**Examples (partial / emerging):** Limbicnation's Jinja2-templated Qwen3 node, EricRollei's platform-specific preset packs (Flux/SDXL/Pony), OpenPrompt's Template+Verbalizer framework (text tasks, but conceptually transferable).

The hybrid pattern is where our asset-generation product naturally lives: a deterministic template that encodes *what must be true* about the asset (platform = iOS 1024×1024, transparency = true, brand = X palette, negative = "no text, no watermark"), filled by an LLM rewriter that expresses *how the image should look* in the model-specific dialect (SD tag-salad, DALL·E full-sentence English, Imagen "photorealistic, studio lighting, …"). The template is the **verbalizer-per-model**, the LLM is the **content generator**, and a small reward model scores the result for alignment with both the user's intent and asset-correctness constraints.

---

## Gaps in the Landscape

1. **Nothing is aimed at software assets.** Every library in the table targets "a cinematic photograph / anime illustration / fantasy concept art." Logos, app icons, favicons, OG images, and transparent PNG assets — which is our entire product — are not covered by any curated dataset, any reward model, any system prompt. The aesthetic reward used by Promptist and BeautifulPrompt (LAION-Aesthetic) actively *harms* logo generation because it biases toward rich photographic imagery.

2. **Nothing handles transparency / alpha correctly.** Every prompt expander adds "beautiful background, bokeh, professional lighting" because that's what the training data looks like. For the "transparent PNG" use case, a rewriter must learn to *suppress* all background description and emit negative prompts like `white background, checkered pattern, solid backdrop`. No OSS dataset targets this.

3. **No OSS rewriter is tuned for Gemini Imagen 3/4 or GPT-image-1.** Vertex AI ships an in-product rewriter, but it's closed-source. DALL·E 3 has `revised_prompt`, closed-source. Every OSS rewriter is trained on SD/SDXL prompt distributions — the tag-dense "masterpiece, 8k, studio lighting, trending on artstation" dialect — which is actively *wrong* for Imagen and GPT-image-1, both of which prefer natural-sentence prompts. There is a clear wedge for an Imagen-flavored and GPT-image-flavored rewriter.

4. **Asset-spec correctness is not rewarded anywhere.** Hunyuan's AlignEvaluator rewards image-text alignment across 24 generic failure modes (object count, color binding, spatial relation, text rendering, etc.). None of its reward heads check "is this a valid favicon?" / "does this logo have legible text?" / "is the alpha channel actually empty outside the mark?" Building an asset-correctness reward is an open problem nobody has tackled.

5. **No repo joins "prompt enhance" to "post-processing pipeline."** Fooocus ships an expander but not a vectorizer. rembg/BiRefNet do background removal but don't feed back into prompt improvement. A loop like *generate → measure alpha coverage → if wrong, rewrite prompt with "pure transparent background, no backdrop whatsoever" → regenerate* is unbuilt in open source.

6. **No structured output contract.** Every rewriter returns a string. None of them return a structured `{positive_prompt, negative_prompt, weights, aspect_ratio, model_family, seed_hint, post_processing: ["rembg", "upscale_2x"]}` JSON — which is what an agent or a downstream pipeline actually needs. Promptify shows structured Pydantic outputs are feasible for NLP tasks; nobody has ported that to T2I enhancement.

7. **No per-model-family dispatch.** EricRollei's pack is the closest OSS attempt ("SDXL preset, Flux preset, Pony preset"), but it's a set of static prompts, not learned verbalizers. Our product needs a real dispatcher: "given intent I and target model M, produce the idiomatic prompt for M."

8. **License fragmentation.** Fooocus's expansion model is CC-BY-NC-4.0 outside Fooocus — legally blocks us from shipping it behind a paid API. Promptist (MIT), Hunyuan (Apache-2.0), SuperPrompt-v1 (MIT), MagicPrompt (MIT), BeautifulPrompt (Apache-2.0) are all commercially usable. SD.Next is AGPL-3.0 and viral — avoid copying code into a hosted service. Any reward model we train should be Apache-2.0 from day one.

9. **Evaluation is weak.** T2I-CompBench is the only mature public benchmark, and it's compositional/aesthetic, not asset-focused. We need a new eval set: ~500 asset prompts ("transparent logo for fintech startup with lowercase wordmark", "iOS app icon for a meditation app, flat, 1024×1024, no background") with paired human judgments of asset-correctness.

10. **No Claude Skill / MCP surface exists.** Every rewriter ships as a Python library, HF model, webui extension, or ComfyUI node. There is no first-class coding-agent integration — no MCP tool, no Claude Skill, no Codex custom tool that exposes "enhance_image_prompt(intent, target_model, constraints) → structured_prompt". That's the surface our product is being built for, and the OSS landscape is empty.

---

## Concrete Takeaways for the Prompt-Enhancer Project

Priority order for what to borrow, build, and avoid:

**Borrow directly:**
- **Hunyuan's CoT rewrite scaffold and the 24-key-point reward formulation** (Apache-2.0, citable). Retarget the reward from "photographic alignment" to "asset correctness" and add 3–6 asset-specific heads (transparency-correctness, text-legibility, platform-spec-compliance).
- **Promptist's SFT→PPO recipe** as the canonical training loop reference (MIT).
- **Fooocus's positive-word + no-repeat logits processor** as a free-tier fallback that runs offline (but re-implement; do not copy the CC-BY-NC model weights).
- **sd-dynamic-prompts DSL syntax** for the template layer (MIT, stable, community-familiar).
- **Promptify's Pydantic + LiteLLM pattern** for the structured-output rewriter API (Apache-2.0).
- **comfyui-art-venture's multi-provider LLM node pattern** (OpenAI/Claude/Gemini/Bedrock behind one interface) for our model router (MIT).

**Build (no OSS equivalent exists):**
- Asset-aware dataset of ~5–20k (intent, ideal_prompt, target_model, asset_type) tuples, covering logos, app icons, favicons, OG images, illustrations, transparent PNGs.
- Asset-correctness reward model with heads for transparency, text legibility, platform compliance, and brand consistency.
- Per-model-family verbalizers for Imagen 3/4, GPT-image-1, Flux.1, SDXL — each a short fine-tune or a retrieval-augmented system prompt, benchmarked on the asset eval set.
- MCP / Claude Skill wrapper exposing `enhance_prompt` and `critique_asset` tools.
- Post-generation feedback loop: after `rembg`/BiRefNet reports alpha coverage, feed the delta back into the rewriter.

**Avoid:**
- Copying Fooocus's GPT-2 weights or positive.txt (CC-BY-NC).
- Forking SD.Next code (AGPL-3.0 viral into a hosted service).
- Assuming SD-dialect tag-salad prompts work for Imagen or GPT-image-1 — measure first, rewrite per-family.

---

## References

1. NeoVertex1/SuperPrompt — https://github.com/NeoVertex1/SuperPrompt (~6.4k ★, last updated 2025-09)
2. Microsoft LMOps Promptist — https://github.com/microsoft/LMOps/tree/main/promptist
3. Promptist paper (arXiv:2212.09611, NeurIPS 2023 Spotlight) — https://arxiv.org/abs/2212.09611
4. Microsoft Promptist on HF Spaces — https://huggingface.co/spaces/microsoft/Promptist
5. Hunyuan-PromptEnhancer — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer (~3.7k ★, Apache-2.0)
6. Hunyuan-PromptEnhancer project page / paper — https://hunyuan-promptenhancer.github.io/
7. PromptEnhancer-32B on HF — https://huggingface.co/PromptEnhancer/PromptEnhancer-32B
8. promptslab/Promptify — https://github.com/promptslab/Promptify (~4.6k ★, Apache-2.0)
9. thunlp/OpenPrompt — https://github.com/thunlp/OpenPrompt (~4.8k ★, Apache-2.0, ACL 2022 Best Demo)
10. adieyal/sd-dynamic-prompts — https://github.com/adieyal/sd-dynamic-prompts (~2.3k ★, MIT)
11. Fooocus — https://github.com/lllyasviel/Fooocus (~48k ★, GPL-3.0) — **LTS-only as of 2025; last feature release v2.5.5 Aug 2025; dev recommends Forge/ComfyUI for new work**
12. Fooocus expansion.py (exact implementation of the built-in GPT-2 rewriter) — https://github.com/lllyasviel/Fooocus/blob/main/extras/expansion.py
13. Gustavosta MagicPrompt-Stable-Diffusion on HF — https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion
14. Gustavosta Stable-Diffusion-Prompts dataset (81,910 prompts) — https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts
15. roborovski/superprompt-v1 (T5-small, 77M) — https://huggingface.co/roborovski/superprompt-v1
16. Nick088Official/SuperPrompt-v1 (GitHub wrapper) — https://github.com/Nick088Official/SuperPrompt-v1
17. alibaba-pai BeautifulPrompt v2 on HF — https://huggingface.co/alibaba-pai/pai-bloom-1b1-text2prompt-sd-v2
18. BeautifulPrompt EMNLP 2023 writeup (Alibaba Cloud blog) — https://developer.aliyun.com/article/1390710
19. leeguandong/sd_webui_beautifulprompt (webui wrapper) — https://github.com/leeguandong/sd_webui_beautifulprompt
20. Karine-Huang/T2I-CompBench (NeurIPS 2023, TPAMI 2025) — https://github.com/Karine-Huang/T2I-CompBench
21. AUTOMATIC1111/stable-diffusion-webui-promptgen — https://github.com/AUTOMATIC1111/stable-diffusion-webui-promptgen (~530 ★, GPL-3.0)
22. imrayya/stable-diffusion-webui-Prompt_Generator — https://github.com/imrayya/stable-diffusion-webui-Prompt_Generator (~250 ★)
23. stavsap/comfyui-ollama — https://github.com/stavsap/comfyui-ollama (~810+ ★, MIT)
24. sipherxyz/comfyui-art-venture — https://github.com/sipherxyz/comfyui-art-venture (~340 ★, MIT)
25. ScreamingHawk/comfyui-ollama-prompt-encode — https://github.com/ScreamingHawk/comfyui-ollama-prompt-encode
26. BigStationW/ComfyUI-Prompt-Rewriter (llama.cpp + VLM) — https://github.com/BigStationW/ComfyUI-Prompt-Rewriter
27. EricRollei/Local_LLM_Prompt_Enhancer — https://github.com/EricRollei/Local_LLM_Prompt_Enhancer
28. Limbicnation/ComfyUI-PromptGenerator (Qwen3-8B) — https://github.com/Limbicnation/ComfyUI-PromptGenerator
29. SD.Next Prompt-Enhance wiki — https://github.com/vladmandic/sdnext/wiki/Prompt-Enhance
30. Kaludii/Stable-Diffusion-Prompt-Generator (Streamlit wrapper) — https://github.com/Kaludii/Stable-Diffusion-Prompt-Generator
31. kevinmulier/prompt-generator-stable-diffusion (JS/HTML/Tailwind) — https://github.com/kevinmulier/prompt-generator-stable-diffusion
32. Vertex AI Imagen Prompt Rewriter docs — https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/use-prompt-rewriter
33. IPGO (Indirect Prompt Gradient Optimization, arXiv:2503.21812) — https://arxiv.org/html/2503.21812v2
34. PAE / Dynamic Prompt Optimizing (arXiv:2404.04095) — https://arxiv.org/abs/2404.04095
35. pavank-code/RePRo (Chrome extension) — https://github.com/pavank-code/RePRo
