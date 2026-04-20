# OCR Engines for `asset_validate` (Wordmark Levenshtein Check)

**Context.** The `asset_validate` step needs to read rendered wordmark text off a generated logo/image and Levenshtein-compare it to the expected string (e.g. detect "Acnie" vs "Acme"). This is a very narrow OCR problem — short strings, one or two lines, potentially stylized display typography — but with an important wrinkle: **all mainstream OCR engines are trained on document text, not logo/signage text**, so raw accuracy on wordmarks is the real decision criterion, not document-benchmark leaderboards.

Runtime target: Node.js service. Prefer a JS/WASM or ONNX-Runtime-Node path over spawning Python.

---

## Engine-by-engine comparison

| Engine | License | Languages | Stylized/display-font accuracy | Node runtime | Model size |
|---|---|---|---|---|---|
| **Tesseract** (`tesseract.js`) | Apache-2.0 | 100+ | Weak. Strong only on clean high-contrast horizontal document text; struggles with rotated or display fonts (~18% CER on rotated mixed data). Best-in-class on scanned books, not logos. | **Native JS/WASM** (`tesseract.js` v7, `relaxedsimd` 15–35% faster than v6). 2–5 s/page in Node. | ~4–12 MB per language pack (`eng.traineddata`) |
| **EasyOCR** (Jaided AI) | Apache-2.0 (code); model weights Apache-2.0 | 80+ | Moderate. Advertises "scene text" (street signs, billboards) because of its CRAFT detector + CRNN recognizer, but recognizer is still trained largely on document/benchmark corpora. Weak on heavy script/display fonts. Known systematic errors on symbols (e.g. `$`). | PyTorch only — no first-class Node path. Must shell out to Python or re-export. | ~64 MB detector + ~25–50 MB recognizer per language group |
| **PaddleOCR** (PP-OCRv5) | Apache-2.0 | 100+ | **Strongest accuracy in 2026 benchmarks on document text** (100% on 24-item invoice test), and the underlying recognizer family (SVTR / PP-OCRv5) is the backbone used for scene text on ICDAR/SVT (SVTR: ~91–93% SVT, 80–86% IC15). In practice the best off-the-shelf choice for short stylized strings too. | Python native. Node via ONNX-exported weights (see RapidOCR row). | PP-OCRv5 mobile: ~3.8 MB / 5M params. PP-OCRv4 server rec: 173 MB |
| **RapidOCR** (ONNX port of Paddle) | Apache-2.0 | Paddle's set (100+) | Same model family as PaddleOCR → same accuracy envelope for short stylized text. **This is the practical way to run Paddle from Node.** Reports ~4–5× faster than PaddleOCR on CPU; slightly slower at detection than PaddlePaddle-native on equivalent models. | **ONNX Runtime Node** via `paddleocr.js`, `paddleocr-js`, or `@gutenye/ocr-node`. No Python. Cross-platform (Linux/macOS/Windows, x64/arm64). | Det+Rec+Cls bundle ~10–15 MB (mobile) to ~200 MB (server) |
| **docTR** (Mindee) | Apache-2.0 | Primarily Latin + CJK | Good on documents (~92% on 2026 invoice benchmark). Detection-then-recognition architecture with PyTorch/TF backends. Not tuned for display typography. | Python only. | ~400 MB installed |
| **surya-ocr** | **GPL-3.0 (code) + OPEN RAIL-M modified (weights)** | 90+ | Best layout-aware engine (~96% on 2026 invoice benchmark) with strong multilingual coverage. **But license is a blocker for most commercial/closed-source use** — GPL-3 on code and a restricted, non-standard license on weights. | Python only. | ~500 MB installed |
| **kraken** | Apache-2.0 | Multi-script (historical/handwritten focus, RTL, BiDi, vertical) | Purpose-built for historical & handwritten manuscripts, not stylized modern display type. Actively maintained (v7 beta, 2026). | Python only (Linux/macOS). | Varies; models are small (~10–30 MB) |
| **MMOCR** (OpenMMLab) | Apache-2.0 | Multi | Research toolbox; strong SVTR/ABINet implementations for scene text, but basically a **training framework**, not a drop-in runtime. Low release cadence (last tag v1.0.1, Jul 2023). | Python only. | Per-model, typically 30–200 MB |

### Notes worth carrying forward
- Real-world benchmarks show **no OCR engine is universally best**; Tesseract wins only on clean horizontal document text. For the wordmark problem, prior art (SVTR, used by PaddleOCR/RapidOCR/MMOCR) is the component actually trained on scene/stylized text.
- **No mainstream OSS OCR ships a weights release explicitly fine-tuned on logo wordmarks / signage.** Research on logo recognition (e.g. CLIP-style image-text pre-training on LogoDet-3K and similar) reaches 98.6% recall@1 — but that is logo *matching/recognition*, not character-level wordmark reading. For character-level, SVTR on scene-text datasets (ICDAR13/15, SVT, COCO-Text) is the closest available specialization.
- `surya-ocr`'s license stack (GPL-3 code + RAIL-M modified weights) is a real commercial risk; treat as disqualified unless the project is GPL-compatible.

---

## Logo/wordmark-specific OCR — sub-question

- Mainstream OCR is **trained on document corpora**, so accuracy degrades with: heavy letterforms, kerned/overlapped glyphs, custom ligatures, low contrast with brand colors, curved baselines, monograms, and decorative serifs.
- **No ready-made OSS checkpoint is fine-tuned for logo wordmarks.** The closest transferable choices:
  - **SVTR / SVTRv2 / PP-OCRv5** (via PaddleOCR or RapidOCR) — trained on scene-text benchmarks (ICDAR, SVT, COCO-Text), which contain storefront signage, posters, and billboards. These are the most "logo-adjacent" weights publicly available.
  - **TrOCR** (Microsoft, MIT) — transformer OCR, easy to fine-tune on a small custom wordmark dataset; a realistic future step if off-the-shelf accuracy is insufficient.
- Strong fallback when confidence is low: a **VLM read** (Qwen2-VL or GPT-4o). Qwen2-VL-72B scores 877 on OCRBench vs GPT-4o 736, and VLMs are much more robust to stylized/display typography than CNN/CRNN OCR. This is the right escape hatch for the 5–15% of wordmarks that stylized OCR cannot parse character-perfect.

---

## Recommendation summary

- **Primary engine: RapidOCR (PP-OCRv5 weights via ONNX Runtime Node).** Apache-2.0 on both code and weights, runs in pure Node through `onnxruntime-node`, uses the SVTR-family recognizer that is the closest thing OSS has to a "scene / stylized text" model, and has the best 2026 accuracy numbers of any CPU-friendly engine. Use one of the existing JS wrappers (`paddleocr.js`, `paddleocr-js`, or `@gutenye/ocr-node`) rather than rolling a new pipeline.
- **Why not tesseract.js first:** easiest integration, but materially worse on stylized/display type — exactly the failure mode `asset_validate` exists to catch. Keep it only as an optional cross-check, not the primary.
- **Disqualified for this use:** `surya-ocr` (GPL-3 + restricted RAIL-M weights), `EasyOCR`/`docTR`/`kraken`/`MMOCR` (no clean Node runtime; would require Python sidecar).
- **Confidence threshold:** run RapidOCR, take the top candidate string, compute (a) engine-reported per-token confidence and (b) Levenshtein ratio against the expected wordmark. Treat `confidence < ~0.75` **or** `lev_ratio < ~0.85` as "low confidence".
- **Fallback on low confidence:** (1) normalize (uppercase, strip whitespace, collapse visually similar glyphs like `I/l/1`, `O/0`, `rn/m`) and re-score before escalating; (2) rerun on an upscaled / contrast-normalized crop of the text region; (3) escalate to a VLM pass (Qwen2-VL preferred for self-hosted, else GPT-4o) asking specifically "What exact text is rendered in this image? Respond with the literal string only."; (4) final tie-break: compare VLM output's Levenshtein to expected — if it still fails, surface as a hard validation failure to the caller.
- **Future upgrade path if accuracy is insufficient on real traffic:** collect failing wordmark crops and fine-tune **TrOCR** (MIT, easy LoRA/full fine-tune) on a few thousand synthetic + real samples. No OSS engine ships a logo-wordmark checkpoint today, so this is where the ceiling moves if needed.

---

## Sources

- Unstract, "Comparing the Best Open Source OCR Tools in 2026" — https://unstract.com/blog/best-opensource-ocr-tools/
- CodeSOTA, "Best Python OCR Library in 2026: 6 Libraries Tested with Real Code" — https://www.codesota.com/ocr/best-for-python
- TildAlice, "PaddleOCR vs EasyOCR vs Tesseract: Why PaddleOCR Is Slower" — https://tildalice.io/ocr-tesseract-easyocr-paddleocr-benchmark/
- AI Advances, "I Tested 5 OCR Models on 6 Real-World Datasets" — https://medium.com/ai-advances/i-tested-5-ocr-models-on-6-real-world-datasets-heres-which-one-you-should-actually-use-50badae3c16d
- `naptha/tesseract.js` v7 release notes and performance docs — https://github.com/naptha/tesseract.js
- `RapidAI/RapidOCR` README and PaddleOCR comparison discussion — https://github.com/RapidAI/RapidOCR
- `X3ZvaWQ/paddleocr.js`, `paddleocr-js` on npm, `@gutenye/ocr-node` — Node wrappers over PaddleOCR/ONNX
- PaddleOCR SVTR algorithm docs — http://www.paddleocr.ai/main/en/version2.x/algorithm/text_recognition/algorithm_rec_svtr.html
- PaddlePaddle PP-OCRv5 algorithm docs — https://github.com/PaddlePaddle/PaddleOCR (`docs/version3.x/algorithm/PP-OCRv5/PP-OCRv5.md`)
- `datalab-to/surya` license files (GPL-3 + RAIL-M modified) — https://github.com/datalab-to/surya
- `mindee/doctr` metrics discussion — https://github.com/mindee/doctr/discussions/1576
- `mittagessen/kraken` (v7.0.0b7, March 2026) — https://github.com/mittagessen/kraken
- `open-mmlab/mmocr` repo and LICENSE — https://github.com/open-mmlab/mmocr
- Qwen2-VL paper / OCRBench numbers — https://arxiv.org/abs/2409.12191
- TrOCR model docs (for fine-tune upgrade path) — https://huggingface.co/docs/transformers/main/model_doc/trocr
- "Image-Text Pre-Training for Logo Recognition" — https://arxiv.org/html/2309.10206v1
