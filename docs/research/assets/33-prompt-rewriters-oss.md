# 33 · OSS Prompt Enhancers / Rewriters for Image Generation

External grounding for `asset_enhance_prompt` (classify → rewrite in target-model dialect).

**Research value: high** — the space has a well-defined spine (short, curated small-LM rewriters → instruction-tuned LLM rewriters with RL against T2I-alignment reward models), plus two large public datasets of (brief → refined-prompt) pairs usable for training.

---

## Summary matrix

| Project | URL | License | Approach | Training data | Notes / lessons |
|---|---|---|---|---|---|
| **Hunyuan PromptEnhancer** (Tencent, CVPR 2026) | [github.com/Hunyuan-PromptEnhancer/PromptEnhancer](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer) · [arXiv 2509.04545](https://arxiv.org/html/2509.04545v1) | Custom (NOASSERTION) — check for redistribution | Instruction-tuned LLM (7B / 32B, GGUF) doing **CoT rewrite**, trained with RL against an "AlignEvaluator" reward model over **24 T2I failure-mode key points** (6 supercategories). Dual mode: T2I + I2I edit. | Prompts + generated images scored by AlignEvaluator; intent-preservation loss on (subject, action, style, layout, attributes). | **Most directly on-target** prior art. Key idea: define a taxonomy of T2I failure modes (negation, attribute binding, counting, spatial, typography, …) and rewrite explicitly against them. Supports multi-level parsing fallback — useful for robustness. |
| **Fooocus `FooocusExpansion`** (lllyasviel) | [github.com/lllyasviel/Fooocus/blob/main/extras/expansion.py](https://github.com/lllyasviel/Fooocus/blob/main/extras/expansion.py) | Within Fooocus: permissive; stand-alone: **CC-BY-NC 4.0** (non-commercial only) | Small fine-tuned **GPT-2** + custom **LogitsProcessor** that restricts generation to a curated `positive.txt` vocabulary; seeded for reproducibility. | SD prompt corpora filtered to "positive" modifier vocabulary. | Cheap, local, deterministic "SDXL-dialect booster." Lesson: **vocabulary-constrained decoding** is a simple, powerful trick for staying inside a target model's dialect without hallucinating subjects. License blocks us for commercial use — re-derive, don't copy. |
| **MagicPrompt-Stable-Diffusion** (Gustavosta) | [hf.co/Gustavosta/MagicPrompt-Stable-Diffusion](https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion) | **MIT** | GPT-2 (0.1B) fine-tuned as a prompt **auto-completer**. Siblings exist for DALL·E 2 and Midjourney. | ~80k prompts scraped from Lexica.art ([Gustavosta/Stable-Diffusion-Prompts](https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts)). | Demonstrates the "one tiny model per dialect" pattern. Very low inference cost. Output is keyword-stuffed SD 1.5 era — not ideal for DALL·E 3 / Imagen (which want prose). |
| **succinctly/text2image-prompt-generator** | [hf.co/succinctly/text2image-prompt-generator](https://huggingface.co/succinctly/text2image-prompt-generator) | Model card: free use w/ attribution (no explicit OSS license) | GPT-2 fine-tuned on Midjourney prompts; auto-completes to MJ-style including `--ar`, weights. | [succinctly/midjourney-prompts](https://huggingface.co/datasets/succinctly/midjourney-prompts) (~250k scraped MJ prompts, 1 month of Discord). | Confirms: **separate small model per target dialect** (MJ vs SD vs DALL·E) beats one-size-fits-all small model. 1.6M+ downloads. |
| **OneButtonPrompt** | [github.com/AIrjen/OneButtonPrompt](https://github.com/AIrjen/OneButtonPrompt) | MIT | **Rule-based combinatorial template engine** (subject × style × artist × lighting × …) with presets, anime/pony modes, LoRA awareness, prompt compounding. Works as A1111 script and ComfyUI nodes. | Hand-curated word lists / artist lists. | Lesson: a surprisingly strong baseline for SD-style models can be built with **no ML at all** — just a good grammar and curated corpora. Useful as a fallback branch or for "surprise me" mode. |
| **sd-dynamic-prompts** / `dynamicprompts` library | [github.com/adieyal/sd-dynamic-prompts](https://github.com/adieyal/sd-dynamic-prompts) · [adieyal/dynamicprompts](https://github.com/adieyal/dynamicprompts) | MIT | Template language: `{a\|b\|c}` variants, weighted `{0.5::a\|…}`, `__wildcards__` from `.txt`/`.yaml`/`.json`, variables, Jinja2 escape hatch with `choice()` / `weighted_choice()` / `wildcard()`. | User-supplied wildcards. | The **de-facto grammar** for deterministic, expandable prompts. If we expose any user-facing template syntax, adopt these conventions — already in users' muscle memory. `dynamicprompts` is a clean pure-Python lib we can embed. |
| **InvokeAI prompt expansion** | [PR #8140](https://github.com/invoke-ai/InvokeAI/pull/8140) | Apache-2.0 (repo) | UI-integrated prompt expansion via LLM, and image-conditioned expansion (expand *from* an image). | N/A (uses user-configured LLM). | Reference for UX: treat "expand" as a non-destructive suggestion step, not an automatic rewrite. |
| **k0r0pt/aiImagePromptGenerator** | [github.com/k0r0pt/aiImagePromptGenerator](https://github.com/k0r0pt/aiImagePromptGenerator) | MIT | Three-pane UI: settings / rule-based base prompt / **Ollama-backed LLM polish** (default Llama 3.1). | N/A. | Confirms the "two-stage: seed + LLM polish" pattern that Fooocus also uses. Author explicitly warns: "not all image models like prose — some prefer keywords." Matches our need to **classify the target model and pick a dialect**. |
| **DSPy** (Stanford) — image-gen tutorial | [dspy.ai/tutorials/image_generation_prompting](https://dspy.ai/tutorials/image_generation_prompting/) · [Signatures](https://dspy.ai/learn/programming/signatures) · [Optimizers](https://dspy.ai/learn/optimization/optimizers) | Apache-2.0 | Declarative signatures (`desired_prompt, current_image, current_prompt -> feedback, matches: bool, revised_prompt`) + optimizers (`BootstrapRS`, `MIPROv2`, `GEPA`, `BootstrapFinetune`). | Optimizer needs 5–10 labeled examples + metric. | Framework of choice if we want the rewriter **self-optimizing** against a CLIP/VLM-judged metric. Notable: their own tutorial only does inference-time loops; they flag "future upgrade: train on (initial, final) dataset" — exactly our opening. |

---

## Host-side rewrite dynamics of closed models (what we actually know)

- **DALL·E 3 / `gpt-image-1`** — OpenAI documents that every prompt is rewritten by GPT-4 before hitting the image model; the model was trained on long descriptive captions, which is why rewriting helps. It cannot be disabled, but you can steer it with instructions in the prompt. The API returns the revised prompt as `revised_prompt`. Sources: [OpenAI Cookbook: What's new with DALL·E 3](https://cookbook.openai.com/articles/what_is_new_with_dalle_3), [DALL·E 3 API help](https://help.openai.com/en/articles/8555480-dalle-3-api). New GPT Image prompting guide: [cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide](https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide) — canonical order: background/scene → subject → details → constraints; use labeled segments for complex prompts; explicit text in quotes/ALL CAPS; put literal preservation lists ("no watermark", "keep everything else the same") on every iteration for edits.
- **Gemini / Imagen 3** — Google's prompt guide emphasizes **natural language**, no special syntax, three pillars: subject / context / style. Short and long prompts both work; longer = more control. Imagen 3 has improved text rendering. Source: [cloud.google.com/vertex-ai/.../img-gen-prompt-guide](https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide), [ai.google.dev/gemini-api/docs/imagen](https://ai.google.dev/gemini-api/docs/imagen). English-only at the moment.
- **Anthropic** — no first-party image-prompt style guide (Claude isn't a T2I model), but [prompt engineering best practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices) apply when Claude is used as the *rewriter*: explicit instructions, few-shot examples (3–5), structured tags.

**Implication for us:** classify target-model family into three dialect buckets — (a) **SD/SDXL/FLUX** (keyword-weighted, booru/booru-adjacent, artist tags, negative prompt separate), (b) **DALL·E 3 / GPT Image / Imagen / Gemini** (natural-language, structured sentence with explicit preservation/exclusion lists), (c) **Midjourney** (sentence + `--ar --s --v` params). These map cleanly onto existing small-model prior art (MagicPrompt for SD, succinctly for MJ, LLM-rewriter for DALL·E/Imagen).

---

## Open datasets of (brief → refined-prompt) pairs

| Dataset | URL | License | Size | Notes |
|---|---|---|---|---|
| **Fine-T2I** | [ma-xu/fine-t2i](https://huggingface.co/datasets/ma-xu/fine-t2i) · [paper](https://arxiv.org/html/2602.09439v1) | Check card | ~6M text-image pairs, ~2TB | **Has dual prompt annotations per image: original + enhanced.** Closest thing to a direct training set for brief→refined. |
| **Pick-High-Dataset** | [8y/Pick-High-Dataset](https://huggingface.co/datasets/8y/Pick-High-Dataset) | Check card | 360k triplets | Fields: `easy_prompt` + `refine_prompt` + win/lose images. Refinement done with **GPT-2 PromptExtend + Claude-3.5-Sonnet CoT**, then SD3.5-Large rendering. Built on Pick-a-Pic v2. |
| **Kamran-56/prompt-refinement-dataset** | [hf.co/datasets/Kamran-56/prompt-refinement-dataset](https://huggingface.co/datasets/Kamran-56/prompt-refinement-dataset) | Check card | 4,349 pairs | Small but explicitly (basic → structured refined). Useful for few-shot / validation set. |
| **DiffusionDB** (PoloClub) | [hf.co/datasets/poloclub/diffusiondb](https://huggingface.co/datasets/poloclub/diffusiondb) · [github](https://github.com/poloclub/diffusiondb) | Dataset: **CC0 1.0**; code: MIT | 14M images / 1.8M unique prompts / 6.5TB (2M subset: 1.6TB) | Raw real-user SD prompts + hyperparameters. Not a pairs dataset, but the canonical corpus for *what real users type* — useful as the "brief" side if we pair with an LLM-rewriter to synthesize the "refined" side. |
| **Gustavosta/Stable-Diffusion-Prompts** | [hf.co/datasets/Gustavosta/Stable-Diffusion-Prompts](https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts) | Check card | ~80k Lexica prompts | Source for MagicPrompt. Good small clean corpus for SD-style target vocabulary. |
| **succinctly/midjourney-prompts** | [hf.co/datasets/succinctly/midjourney-prompts](https://huggingface.co/datasets/succinctly/midjourney-prompts) | Check card | ~250k MJ prompts | MJ-dialect corpus. |

**For training**: Fine-T2I and Pick-High-Dataset are the only two with native (brief → refined) supervision. A minimum viable recipe: start with Pick-High-Dataset's `(easy_prompt, refine_prompt)` columns (360k pairs), fine-tune a small instruction-tuned model (Qwen2.5-0.5B/3B, Phi-3-mini, Gemma-2-2B) as a **per-dialect LoRA**, evaluate with AlignEvaluator-style VLM rubric or CLIPScore/PickScore, and optionally add RL (DPO on win/lose pairs — the same dataset ships those).

**On open-source prompt-rewriter LoRAs**: there's no widely distributed "official" LoRA pack for prompt rewriting; most teams train their own (see [nbeerbower/Qwen-Image-Edit-LoRA-Trainer](https://github.com/nbeerbower/Qwen-Image-Edit-LoRA-Trainer) for a ready-made DPO-format LoRA training pipeline — 24GB VRAM, configurable rank 16–128). PromptToAsset's GGUF variants are the nearest drop-in.

---

## Cross-domain analogies (earned)

- **Query rewriters in search (e.g., expansion via BM25 / learned query2doc)** — same structural setup: short user query → longer model-dialect query → downstream scoring model. Same pitfalls too (query drift, over-specification, hallucinated facets). The classifier → dialect-specific rewriter split is exactly how modern hybrid search stacks work.
- **Compiler IR lowering** — "classify target → rewrite in target dialect" is target-specific code generation. Treating the T2I model as the hardware and the dialect as the ISA is a useful frame: keep a stable portable IR (canonicalized scene description: subject / action / style / composition / lighting / constraints), and emit SD-keywords / DALL·E-prose / MJ-params from it. Hunyuan PromptEnhancer's 24-point taxonomy is essentially a well-specified portable IR.

---

## Lessons extractable to `asset_enhance_prompt`

1. **Two-stage pipeline: classifier → dialect-specific rewriter** is the dominant working pattern (k0r0pt, Fooocus's "expand-then-base-prompt," effectively OpenAI's own GPT-4 rewriter for DALL·E 3). Don't try one rewriter for all targets.
2. **Canonicalize before rewriting.** Adopt a portable IR (subject, action, style, composition, lighting, negative, constraints, text-in-image) and rewrite *from* the IR *to* the target dialect. Maps cleanly to Google's subject/context/style, OpenAI's scene→subject→details→constraints, and Hunyuan's 24-point taxonomy.
3. **Taxonomy of T2I failure modes as the rewrite objective.** Steal Hunyuan PromptEnhancer's 24-key-point framework (attribute binding, negation, counting, spatial, typography, …) as the rubric for "is this rewrite actually better?" Use it for both prompt engineering (checklist the rewriter runs through) and eval (VLM-as-judge scoring).
4. **Small models are enough for the SD/MJ dialects, LLMs only for the prose dialects.** A 0.1B GPT-2-class model (MagicPrompt pattern) with vocabulary-constrained decoding (Fooocus pattern) is cheap, local, and deterministic for SD/SDXL/FLUX/MJ. Reserve the instruction-tuned LLM rewriter for DALL·E/Imagen/Gemini where natural-language quality matters.
5. **Adopt `dynamicprompts` syntax** (`{a|b}`, `__wildcard__`, weighted variants, Jinja escape) for any user-facing templating. It's already muscle memory for the A1111/Comfy audience, and [`adieyal/dynamicprompts`](https://github.com/adieyal/dynamicprompts) is an MIT pure-Python lib we can embed.
6. **Training path is viable.** Pick-High-Dataset (360k brief→refined pairs with win/lose images) + Fine-T2I (6M pairs with dual annotations) give us enough signal to train per-dialect LoRAs on a 1–3B base. Pair with DSPy's `MIPROv2` / `GEPA` for instruction-level optimization and DPO on Pick-High-Dataset's win/lose pairs for preference fine-tuning. No label collection needed to get started.
7. **Respect licenses.** Fooocus expansion is **CC-BY-NC 4.0** outside Fooocus — re-derive the vocabulary-constrained-decoding idea, don't copy weights. Hunyuan's NOASSERTION license needs a direct check before shipping their weights. DiffusionDB dataset is **CC0**, safe as training data. MagicPrompt is **MIT**, safe to wrap or fine-tune from.
8. **Expose the rewritten prompt.** OpenAI surfaces `revised_prompt`; users have come to expect transparency. Our API should always return both the original and the enhanced prompt so downstream tools can log, diff, and let users override.

---

## Sources

- Hunyuan PromptEnhancer — <https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer>, <https://arxiv.org/html/2509.04545v1>, <https://hunyuan-promptenhancer.github.io/>
- Fooocus prompt expansion — <https://github.com/lllyasviel/Fooocus/blob/main/extras/expansion.py>
- MagicPrompt-Stable-Diffusion — <https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion>, dataset: <https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts>
- succinctly/text2image-prompt-generator — <https://huggingface.co/succinctly/text2image-prompt-generator>, dataset: <https://huggingface.co/datasets/succinctly/midjourney-prompts>
- OneButtonPrompt — <https://github.com/AIrjen/OneButtonPrompt>
- sd-dynamic-prompts / dynamicprompts — <https://github.com/adieyal/sd-dynamic-prompts>, <https://github.com/adieyal/dynamicprompts>
- InvokeAI prompt expansion — <https://github.com/invoke-ai/InvokeAI/pull/8140>
- k0r0pt/aiImagePromptGenerator — <https://github.com/k0r0pt/aiImagePromptGenerator>
- DSPy image-gen tutorial & optimizers — <https://dspy.ai/tutorials/image_generation_prompting/>, <https://dspy.ai/learn/optimization/optimizers>
- OpenAI GPT Image 1.5 prompting guide — <https://cookbook.openai.com/examples/multimodal/image-gen-1.5-prompting_guide>
- DALL·E 3 prompt rewriting — <https://cookbook.openai.com/articles/what_is_new_with_dalle_3>, <https://help.openai.com/en/articles/8555480-dalle-3-api>
- Google Imagen 3 prompt guide — <https://cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide>, <https://ai.google.dev/gemini-api/docs/imagen>
- Anthropic prompting best practices — <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices>
- Fine-T2I dataset — <https://huggingface.co/datasets/ma-xu/fine-t2i>, <https://arxiv.org/html/2602.09439v1>
- Pick-High-Dataset — <https://huggingface.co/datasets/8y/Pick-High-Dataset>
- Kamran-56/prompt-refinement-dataset — <https://huggingface.co/datasets/Kamran-56/prompt-refinement-dataset>
- DiffusionDB — <https://huggingface.co/datasets/poloclub/diffusiondb>, <https://github.com/poloclub/diffusiondb>
- Qwen-Image-Edit-LoRA-Trainer — <https://github.com/nbeerbower/Qwen-Image-Edit-LoRA-Trainer>
