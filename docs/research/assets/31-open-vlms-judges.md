# Open VLMs as Judges — Survey for Tier-2 Validator

Scope: open-source / open-weight Vision-Language Models usable as the Tier-2 "VLM-as-judge" in `prompt-to-asset`. Judge input = generated image + textual rubric. Judge output = structured JSON scores over {composition, fidelity to prompt, text/typography correctness, brand-match}. Priority: **graphic/design/typography understanding** (not only natural-photo captioning), reasonable VRAM, and clean inference surface for an MCP server.

Research window: late-2024 through early-2026. Where a 2026 successor exists (e.g. Qwen3-VL) it is noted but not scored; the user asked about the currently-stable Qwen2/2.5 generation.

---

## Model-by-model

### 1. LLaVA-1.6 / LLaVA-NeXT / LLaVA-OneVision
- **License:** Apache-2.0 for weights / code; the underlying LLM backbone varies (Mistral, Qwen2, Llama), so Llama-backed variants inherit the Llama community license. LLaVA-OneVision-1.5 is fully open (Apache-2).
- **Sizes:** 7B / 13B / 34B (NeXT), 0.5B / 4B / 7B / 8B / 72B (OneVision, OneVision-1.5).
- **VRAM:** 7B ≈ 15–17 GB FP16, ~6 GB 4-bit; 34B ≈ 70 GB FP16, ~20 GB 4-bit; 72B needs multi-GPU or 4-bit on a single 48 GB card.
- **Benchmarks:** OneVision-1.5-8B beats Qwen2.5-VL-7B on 18/27 benchmarks; 4B beats Qwen2.5-VL-3B on all 27. Strong MMMU, MMBench, DocVQA, ChartQA. Trained on $16k budget.
- **Design/typography:** Decent OCR but not the strongest on dense posters/logos; older LLaVA-NeXT lags Qwen/InternVL on ChartQA.
- **Inference:** `transformers`, `vLLM`, partial `llama.cpp` / `ollama`.

### 2. Qwen2-VL & Qwen2.5-VL (Alibaba)
- **License:** Apache-2.0 for 2B/3B/7B; Qwen license (research + commercial with thresholds) for 72B.
- **Sizes:** 2B, 3B, 7B, 72B (+ AWQ 4-bit flavors for all three).
- **VRAM:** 2B ≈ 6 GB FP16 / ~3 GB 4-bit; 7B ≈ 18 GB FP16 / ~9 GB 4-bit (Q4_K_M at 8k context uses ~15 GB due to high KV-cache overhead in current implementations); 72B ≈ 145 GB FP16 / ~40 GB 4-bit.
- **Benchmarks:** DocVQA 90+, ChartQA ≥ 83, OCRBench ~850. 72B matches GPT-4o on document/diagram understanding. Native bounding-box + structured JSON output.
- **Design/typography:** Best-in-class among open models for **structured extraction from invoices, forms, charts, posters**; robust dynamic-resolution handling preserves small type. Some "modality laziness" (text-on-image extraction lags text-as-prompt by ~12%).
- **Inference:** `transformers`, `vLLM` (first-class), `ollama` (`qwen2.5vl`), `llama.cpp` GGUF. JSON / tool-calling supported natively on vLLM.

### 3. MiniCPM-V 2.6 (OpenBMB)
- **License:** Apache-2.0 (code); weights under OpenBMB model license — free for research and commercial use after registration/agreement (not strictly Apache-2).
- **Sizes:** 8B (SigLip-400M vision + Qwen2-7B LLM).
- **VRAM:** ~18 GB FP16, ~7–8 GB Q4_K_M, runs on a single 3060 12 GB in 4-bit.
- **Benchmarks:** OpenCompass avg > GPT-4V for an 8B model; leads on complex table/Chinese OCR — beats Qwen2-VL-7B on messy tables per independent testing.
- **Design/typography:** Excellent table/poster OCR, good enough for typography correctness scoring.
- **Inference:** `transformers`, `vLLM`, **first-class `llama.cpp` GGUF** (Q2 → f16), LM Studio, ollama community builds. Best local-deploy story among 7–8B-class models.

### 4. InternVL 2 / InternVL 2.5 (Shanghai AI Lab)
- **License:** MIT (weights) for most sizes; 1B–78B family.
- **Sizes:** 1B, 2B, 4B, 8B, 26B, 38B, 40B (MoE-ish), 72B, 78B.
- **VRAM:** 8B ≈ 18 GB FP16, ~9 GB 4-bit. 78B ≈ 160 GB FP16, 4-bit fits on 2×48 GB.
- **Benchmarks:** First open MLLM above 70% MMMU (70.1%). Rivals GPT-4o / Claude-3.5 Sonnet on DocVQA, ChartQA, InfographicVQA.
- **Design/typography:** Strong on infographics/charts (InfographicVQA is the family's specialty). Larger models understand brand-consistency cues reasonably well.
- **Inference:** `transformers`, `vLLM`, `lmdeploy` (official, fastest), limited `llama.cpp`.

### 5. CogVLM / CogVLM2 (THUDM)
- **License:** Apache-2.0 code; weights split — CogVLM2-Llama3 variants inherit Llama-3 Community License; non-Llama variants closer to Apache/Tsinghua-custom. Read the card per-checkpoint.
- **Sizes:** 17B (CogVLM), 19B (CogVLM2-Llama3-Chat-19B).
- **VRAM:** ~38 GB FP16, ~12 GB 4-bit.
- **Benchmarks:** Strong on TextVQA, DocVQA, ChartQA; trailed by Qwen2.5-VL and InternVL2.5 at similar or smaller size by late 2024.
- **Design/typography:** Decent, but no longer Pareto-optimal; maintenance cadence has slowed.
- **Inference:** `transformers` only in practice; vLLM support partial; not in `ollama`/`llama.cpp`.

### 6. Molmo (Ai2)
- **License:** **Apache-2.0 weights and data (PixMo).** Rare: fully open, no vendor license.
- **Sizes:** Molmo-1B-O, Molmo-7B-O (fully open), Molmo-7B-D (best 7B), Molmo-72B.
- **VRAM:** 7B ≈ 16–18 GB FP16, ~8 GB 4-bit. 72B ≈ 140 GB FP16.
- **Benchmarks:** 72B second only to GPT-4o on 11-benchmark avg + human eval; beats Claude 3.5 Sonnet and Gemini 1.5 Pro/Flash. 7B-D competitive with Qwen2-VL-7B.
- **Design/typography:** Strong on **pointing, counting, dense captioning, charts**; PixMo data includes heavy chart/doc coverage. Unique native 2-D pointing output is useful for "which element is off" rubrics.
- **Inference:** `transformers`, `vLLM` (recent), limited `llama.cpp`/`ollama`.

### 7. Pixtral 12B (Mistral)
- **License:** Apache-2.0.
- **Sizes:** 12B LLM + 400M vision encoder (ViT-H from scratch).
- **VRAM:** ~26 GB FP16, ~10 GB 4-bit.
- **Benchmarks:** MMMU-CoT 52.5, MathVista 58.0, ChartQA 81.8, DocVQA 90.7, VQAv2 78.6 — comfortably above Phi-3.5-Vision, competitive with Qwen2-VL-7B. Phi-4-multimodal edges it on DocVQA/MMMU but loses on ChartQA.
- **Design/typography:** Good chart + doc scores; handles arbitrary resolutions and aspect ratios natively (important for vertical posters, app icons, banners).
- **Inference:** `transformers`, `vLLM` (native), `mistral-inference`; GGUF exists but vision path is less mature in `llama.cpp`.

### 8. Phi-3.5-Vision (Microsoft)
- **License:** MIT.
- **Sizes:** 4.2B (Phi-3-mini LLM + image encoder + projector), 128k context.
- **VRAM:** ~9 GB FP16, ~4 GB 4-bit.
- **Benchmarks:** TextVQA 72.0, MMMU 43.0, MMBench 81.9. Weaker than Pixtral/Qwen on ChartQA/DocVQA but extremely cheap.
- **Design/typography:** Respectable OCR for its size; decent chart/table reasoning; less reliable on dense poster/logo typography.
- **Inference:** `transformers`, `vLLM`, `onnxruntime`, NVIDIA NIM.

### 9. Phi-4-Multimodal (Microsoft)
- **License:** MIT.
- **Sizes:** 5.6B unified text + vision + speech.
- **VRAM:** ~12 GB FP16, ~5 GB 4-bit.
- **Benchmarks:** Beats Pixtral-12B on DocVQA, MathVista, MMMU at half the size; loses on ChartQA.
- **Design/typography:** Strong document OCR; good rubric-friendly reasoning length.
- **Inference:** `transformers`, `vLLM`, ONNX. Structured output via standard JSON prompting (no native JSON mode in open weights).

### 10. Florence-2 (Microsoft)
- **License:** MIT.
- **Sizes:** 0.23B (base), 0.77B (large).
- **VRAM:** <2 GB FP16 — fits on CPU or integrated GPU.
- **Benchmarks:** Task-specialist (OD, grounding, OCR, region captioning). COCO OD AP 37.5–39.8; competitive zero-shot on referring expression / OCR.
- **Design/typography:** **Not a generative judge.** Florence-2 is prompt-token-driven (`<OCR>`, `<CAPTION>`, `<DENSE_REGION_CAPTION>`, `<OD>`, etc.) and does **not** reliably follow free-form rubric prompts or emit arbitrary JSON. Best used as a deterministic OCR/region feature extractor feeding a larger judge.
- **Inference:** `transformers`, `vLLM` (supported), ONNX; no GGUF.

### 11. moondream2 (vikhyatk)
- **License:** Apache-2.0.
- **Sizes:** 1.86B (SigLip vision + Phi-1.5-ish LLM).
- **VRAM:** ~4 GB FP16, <2 GB int4 — runs on CPU or a Raspberry Pi-class accelerator.
- **Benchmarks:** VQAv2 79.0 (slightly above GPT-4o's 77.2), DocVQA and ChartQA middling. Newer "superword" tokenizer gives 20–40% faster generation.
- **Design/typography:** Adequate for short-rubric scoring; follows instructions better than Florence-2 but still brittle on dense text. Known to sometimes break JSON format unless tightly templated — community guides recommend robust `extract_json()` fallbacks (direct parse → markdown-fence → bracket match).
- **Inference:** `transformers`, `onnxruntime`, `llama.cpp` (experimental), direct Python package; very popular in MCP/local-agent stacks.

---

## Inference-surface + JSON reality check

- **vLLM**: best throughput; supports tool-calling / guided JSON (via `outlines`/`xgrammar`) for Qwen2-VL, Qwen2.5-VL, InternVL, Pixtral, Molmo (recent), Florence-2, Phi-3.5-V.
- **llama.cpp / GGUF**: MiniCPM-V 2.6 and Qwen2-VL/2.5-VL have the cleanest vision-path support; LLaVA family historically. Most others are text-only in GGUF or experimental.
- **Ollama**: first-class Qwen2.5-VL, MiniCPM-V, LLaVA, moondream. No Molmo/Pixtral/InternVL yet beyond community ports.
- **JSON mode**: Strict server-side JSON mode is typically not supported by local providers. Plan on **prompt-templated JSON + schema-constrained decoding** (vLLM `guided_json`, `outlines`, `lm-format-enforcer`) plus a forgiving `extract_json()` with markdown-fence and bracket-matching fallbacks.

## Smallest reliable structured-JSON rubric judge

Ranked from least to most capable:

1. **Florence-2 (0.23B/0.77B)** — ruled out as a free-form judge. Use as an OCR/region extractor only.
2. **moondream2 (1.86B)** — cheapest generative option; works with tight templates and `guided_json`/`outlines`. Reliability on 4-field rubrics is acceptable but drops on dense typography and brand judgments. Fine as a *fast screener* before escalating.
3. **Qwen2-VL-2B / Qwen2.5-VL-3B** — the sweet spot. Native multilingual OCR, dynamic-resolution handling, ~3–6 GB VRAM in 4-bit, well-behaved under `guided_json`, first-class vLLM + ollama + llama.cpp support. Qwen2.5-VL-3B is the **smallest model that reliably produces structured 4-field rubric JSON** in our target quality band.
4. **Qwen2.5-VL-7B (AWQ-4bit)** — still cheap (~9 GB VRAM), step-change in ChartQA/DocVQA and typography fidelity; overkill only if latency/$ is critical.

## Recommendations for `prompt-to-asset` Tier-2

- **Default small judge:** **Qwen2.5-VL-3B-Instruct (AWQ-4bit)** served via vLLM with `guided_json` (or via Ollama with a strict JSON prompt + `extract_json()` fallback). ~6 GB VRAM, Apache-2, best OCR/structured-extraction among small open VLMs, native multilingual.
- **Premium judge:** **Qwen2.5-VL-72B-Instruct (AWQ-4bit)** for maximum fidelity on composition + brand-match + dense typography (rivals GPT-4o on DocVQA/ChartQA). Alternative: **InternVL2.5-78B** (MIT, first open model past 70% MMMU) or **Molmo-72B** (fully Apache-2, strongest human-eval scores among fully-open weights; uniquely good at pointing-based critique).
- **Cheap OCR pre-pass:** **Florence-2-large** as a deterministic feature extractor feeding the judge — near-zero cost, disambiguates "is the text actually there" from "is the text well-styled".
- **Ultra-cheap screener:** **moondream2** on CPU/edge for a pre-filter before spending a 7B+ call; use schema-constrained decoding and retry once on parse failure.
