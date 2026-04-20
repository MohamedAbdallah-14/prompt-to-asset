# 29 — Perceptual Hashing & Image-Similarity Libraries

Research digest for `prompt-to-asset`. Use cases:

1. **Dedup** — don't regenerate an asset we already produced.
2. **"Already generated this" cache lookup** — near-identical hits across minor re-encodes / re-sizes.
3. **Brand-similarity / logo-collision checks** — flag outputs that visually resemble a known brand mark.

Research value: **high** — the space has mature, well-understood primitives (pHash/dHash/block-mean), a production Python package (`imagededup`), well-maintained Node wrappers, and documented limits for flat / logo imagery that push us toward a hybrid stack.

---

## 1. Library landscape

### 1.1 pHash — `phash.org` / `aetilius/pHash`

- **Lang / bindings**: C++ core, C API, Java/PHP/C# bindings. No first-party Node or Python binding (Python users typically go through `imagehash` or `imagededup` reimplementations; Ruby via `phashion`).
- **License**: **GPLv3** (commercial relicensing available). This is the sharpest gotcha — linking GPLv3 into a closed-source SaaS backend is a problem. Prefer Apache-2.0 / MIT reimplementations unless we intentionally GPL the service.
- **Algorithms**: DCT-based pHash, Marr/Mexican-hat wavelet hash, radial-variance hash, MH hash; also audio/video hashing.
- **Hash length**: 64-bit (standard pHash); 72-bit (radial).
- **Status**: last stable 0.9.6 (2013), repo touched Jan 2023. "Done" rather than dead, but not evolving.

### 1.2 `imagededup` (idealo) — production Python

- **License**: **Apache-2.0** — safe for commercial use.
- **Algorithms**: PHash, DHash, AHash, WHash (all 64-bit hex strings), plus a **CNN** method (MobileNet-derived 576-dim embedding).
- **Thresholds**: `max_distance_threshold` 0–64 for hashes (default 10); `min_similarity_threshold` 0.0–1.0 for CNN (default 0.9).
- **Benchmarks** (UKBench 10,200 imgs, r5.xlarge CPU, from their docs):
  - Hashing methods: ~35–112 s end-to-end.
  - CNN: ~377–397 s on CPU (much faster with GPU).
  - **Exact-dup dataset**: dhash@0 is best and fastest. pHash@0 also 1.0/1.0.
  - **Near-dup dataset**: hashing methods underperform (class-1 recall under 0.2 at default threshold); CNN@0.9 gets 0.127 recall / 0.995 precision — i.e. you have to drop the threshold to ~0.7 to catch real near-dups. Headline finding: **perceptual hashes are a precision tool, CNN embeddings are a recall tool.**
  - **Transformed dataset** (crop/rotate/flip/resize): hashing methods collapse. CNN@0.9 is the only method with usable recall (0.384).
- **Pragmatic read**: this is the best all-in-one Python package, and the benchmark table is the single most useful design document in the space.

### 1.3 `blockhash-js` / `blockhash-core` / `commonsmachinery/blockhash`

- **License**: **MIT**.
- **Algorithm**: Block-mean-value perceptual hash (Yang/Gu/Niu). Two modes: fast non-overlap vs. precise overlapping blocks.
- **Hash length**: configurable `bits` rows (16 bits/row → 256-bit; `bits=8` → 64-bit). Outputs hex.
- **Notes**: Browser + Node. `blockhash-core` (25k weekly on npm) is the maintained core with zero deps; `blockhash-js` itself last released 2017. Weaker than pHash on contrast changes but very fast and portable.

### 1.4 `image-hash` (npm)

- **License**: MIT.
- Wrapper around blockhash-core. Signature `imageHash(location, bits, precise, cb)`. Accepts URL / path / Buffer; supports JPG/PNG/WebP. Weekly DL ~9k.
- Algorithm: **block-mean only**. Not pHash.

### 1.5 `imghash` (npm)

- **License**: MIT.
- Promise-based. Uses `blockhash-core` + canvas. `.hash(path, bits, format)` → hex/binary. ~11k weekly DL, TypeScript.
- Algorithm: **block-mean**.

### 1.6 `sharp-phash` (npm)

- **License**: MIT.
- Sharp-based re-implementation of **DCT pHash** (returns 64-char binary string, ships a `distance` helper).
- ~65k weekly DL — the most used pHash-flavoured library in Node today, and the closest Node-native equivalent to `imagehash.phash`.
- Requires `sharp` as a peer dep (which we already use for other pipelines).

### 1.7 `node-image-hash` (npm)

- MIT, ~80 weekly DL. Sync + async API, multiple output encodings. Low adoption — not recommended unless we specifically want its sync mode.

### 1.8 `hash-images` (npm)

- Essentially unmaintained; the de facto replacement in the ecosystem is `sharp-phash` + `imghash`. Do not adopt.

### 1.9 `phashion` (Ruby)

- Ruby wrapper around GPLv3 pHash (so it inherits GPLv3 — same licensing caveat as 1.1). 64-bit DCT hash. Default Hamming threshold **15**.
- Deps: libjpeg, libpng, imagemagick.
- Alternative: **`dhash-vips`** (MIT-ish, libvips-backed) implements dHash + IDHash, dramatically faster than phashion and no GPL.

### 1.10 OpenCV `img_hash` (contrib module)

- **License**: Apache-2.0 (contrib) — safe.
- **Algorithms**: `PHash`, `AverageHash`, `BlockMeanHash` (modes 0/1), `RadialVarianceHash`, `ColorMomentHash`, `MarrHildrethHash`.
- Uniform API: `compute()` + `compare()` (Hamming or algorithm-specific metric).
- **Notable**: `ColorMomentHash` is the only rotation-invariant option in mainstream OSS (-90°…+90°). `MarrHildrethHash` is the most discriminative / slowest. `RadialVarianceHash` is best for rotation within a narrow band.
- **When to use**: when we already have OpenCV in the pipeline (e.g., Python workers doing vectorization/upscaling), `img_hash` gives us every classic hash behind one interface.

### 1.11 Jimp — `pHash()` / `compareHashes()`

- **License**: MIT.
- Pure-JS. `image.pHash()` returns a 64-bit hash; `compareHashes(a, b)` returns Hamming distance normalized to `[0,1]`.
- Jimp docs recommend combining hash-distance with a pixel `distance()` diff; either metric `< 0.15` → call identical (their quoted 99% precision / 1% FP). Useful when we don't want a native dep like Sharp.
- Algorithm: **DCT pHash only**.

---

## 2. Algorithm-level summary

| Algorithm | Idea | Strengths | Weaknesses | Typical length |
|---|---|---|---|---|
| **aHash** (average) | mean-luma threshold on 8×8 | fastest, dead simple | brittle to contrast/color shifts | 64 bits |
| **dHash** (difference) | adjacent-pixel gradient sign | very fast, surprisingly robust to gamma | fails on rotation/flip | 64 bits |
| **pHash** (DCT) | low-freq DCT sign vs mean | best all-round for photos; robust to resize/recompress | weaker on flat / 2-tone images | 64 bits |
| **wHash** (wavelet) | Haar wavelet sign | slightly better on textures than pHash | slower, marginal gain | 64 bits |
| **Block-mean (blockhash)** | mean per grid block | portable, browser-friendly, configurable length | less robust than DCT pHash | 64–256 bits |
| **Radial-variance** | Radon transform variance | rotation-robust within range | photo-biased, bigger hashes | ~40 bytes |
| **Color-moment (OpenCV)** | color moments | true rotation-invariant | coarse, can over-merge | ~42 floats |
| **Marr–Hildreth** | LoG edge hash | most discriminative classic hash | slowest | 72 bytes |
| **CNN embedding (MobileNet)** | learned features | robust to real transforms (crop/flip/rotate) | needs model, bigger vectors, GPU for speed | 576-dim |
| **CLIP / SigLIP / DINOv2** | semantic/SSL embeddings | robust to heavy edits; semantic retrieval | semantic bias → false positives on "different logos that mean similar things" | 512–1024-dim |

### Hamming-distance thresholds for 64-bit hashes (pHash/dHash)

- **0–5**: near-certain duplicate.
- **≤10**: `imagededup` default; good balance for "same asset, re-encoded/resized".
- **≤15**: `phashion` default; catches more minor edits, more FPs.
- **≥20**: getting into "similar feel", not "same image".
- **32**: random — half the bits differ; above this is noise.

For **CNN/CLIP/DINO** use **cosine distance** (or 1 − cos), not Hamming. `imagededup` CNN default cosine-similarity ≥ 0.9; drop to ~0.7 for aggressive near-dup recall.

---

## 3. The logo / flat-design problem

Plain pHash (and aHash/dHash) perform poorly on brand marks because:

- Large solid-color regions → DCT coefficients beyond the DC term are near zero → most bits are determined by tiny accidents.
- Small colored logos on white background → changing the background or padding flips many bits.
- Reflow/re-anchoring (centered vs. left-aligned logo in a square canvas) shifts energy enough to change the hash significantly.
- Two visually identical logos rendered on different platforms (Google vs. Apple emoji style, flat vs. gradient) get large Hamming distances.

### What actually works for logo similarity (empirical consensus from 2024–2026 writeups)

Single-method options:

- **DINOv2 / DINOv3** (self-supervised ViT, Meta): strong on shape/texture similarity. **Best single embedding for logos** in the Ghafadaryan logo-similarity study, but can false-negative when gradients/background differ.
- **CLIP / SigLIP 2**: strong semantic similarity, but **over-merges on semantic intent** — two different logos with similar themes score falsely high.
- **Fourier descriptors of vectorized outlines** (vtracer → sample Bézier → DFT): color/scale/rotation invariant; good for "outline copycat", but noisy alone.
- **pHash**: only useful as the first-pass "is this literally the same PNG re-encoded?" stage.

Multi-stage that performs well (per Ghafadaryan / rghafadaryan and corroborated by image-similarity reviews):

1. **SHA-256** exact match → instant cache hit.
2. **pHash / dHash** Hamming ≤ 5 → near-exact cache hit (resize / re-encode / light recolor).
3. **DINOv2 cosine top-K retrieval** → candidate brand collisions.
4. **CLIP re-rank** for semantic plausibility filter.
5. **Fourier descriptor / Chamfer on vectorized paths** → optional geometric re-rank to catch "traced copies".

Weighted combination reported to work: `0.7·DINO + 0.2·CLIP + 0.1·Fourier` (empirical).

### JS / Node reality for embeddings

- **`@xenova/transformers` (Transformers.js)** runs CLIP and DINOv2 via ONNX in Node with WASM/WebGPU — this is the currently recommended path over `openai-clip-js`. Quantized models are small (tens of MB).
- **`onnxruntime-node`** for raw ONNX inference if we want to bring our own model (e.g., SigLIP 2 ViT-B, DINOv2 small).
- No mature first-class Node DINOv2 package — we'd load a Meta-published ONNX export through transformers.js or onnxruntime-node.
- For server-side Python workers (if we already have them for background-removal / vectorization), use `sentence-transformers`, `open_clip_torch`, or HuggingFace `transformers` directly.

---

## 4. Recommendation for `prompt-to-asset`

### 4.1 Avoid GPL

Skip `libphash` / `phashion` unless we license commercially. Use `sharp-phash` (Node) and/or `imagededup` / OpenCV `img_hash` (Python) instead — both Apache/MIT-safe and give us DCT pHash.

### 4.2 Hybrid stack (recommended)

Two-tier index per asset:

1. **Cheap tier — perceptual hashes (fast, local, tiny):**
   - SHA-256 of the canonical bytes (exact cache).
   - 64-bit pHash via `sharp-phash` (Node) or `imagededup.PHash` (Python).
   - 64-bit dHash as a second hash; different failure modes, costs nothing extra.
   - Store both; dedup/cache query = `pHash_hamming ≤ 5 OR dHash_hamming ≤ 5`.
   - Indexable with a simple BK-tree or `pg_bktree` / bit-sliced index in Postgres.

2. **Semantic tier — CLIP/DINO embeddings (for brand similarity & near-dup recall):**
   - One embedding per asset: DINOv2-small (≈384-dim) or SigLIP-2 ViT-B/16 (≈768-dim).
   - Store in a vector index (pgvector / Qdrant / LanceDB — pgvector is simplest if we're already on Postgres).
   - Retrieval: cosine top-K, then re-rank with CLIP if needed.
   - Thresholds (starting points, tune on your data):
     - cos ≥ 0.95 → treat as near-duplicate ("we already made this").
     - 0.85 ≤ cos < 0.95 → candidate brand collision; surface for review.
     - cos < 0.85 → unrelated.

3. **Logo / icon path — add geometric re-rank (optional, later):**
   - For flat-design assets specifically, vectorize with `vtracer`, sample Bézier paths, DFT → Fourier descriptors; use only as a re-ranker over DINO top-K to catch traced/outline copies where embeddings flatter each other.

### 4.3 Concrete usage map

| Use case | Primary | Secondary | Threshold |
|---|---|---|---|
| Exact cache hit | SHA-256 | — | equality |
| "We already generated this" (re-encode/resize) | pHash | dHash | Hamming ≤ 5 (both) |
| Near-dup recall (crop/rotate/flip) | DINOv2 cosine | pHash ≤ 10 | cos ≥ 0.92 |
| Brand similarity / logo collision | DINOv2 top-K | CLIP re-rank + Fourier re-rank | cos ≥ 0.85 → review |
| Photo dedup (stock / generated photo) | pHash | CNN (imagededup) | Hamming ≤ 10 |

### 4.4 Libraries to actually adopt

- **Node side**: `sharp-phash` (DCT pHash) + `blockhash-core` (portable block-mean fallback / browser) + `@xenova/transformers` (CLIP/DINOv2 inference).
- **Python side** (if/when we add a worker): `imagededup` (Apache-2.0, hash + CNN in one API) + `open_clip_torch` or `transformers` for DINOv2/SigLIP + optional `opencv-contrib-python` for `img_hash` when we need exotic hashes (radial / color-moment for rotation-invariance).
- **Avoid**: `phash.org` / `phashion` (GPL), `hash-images` (unmaintained), `node-image-hash` (low adoption).

---

## 5. Open questions

- Which vector store? If we're already on Postgres → `pgvector` is the default; if we want on-disk portable indexes per tenant → LanceDB.
- Do we need rotation-invariance? Only if users upload user-rotated variants; generation outputs are usually canonically oriented. If yes → add OpenCV `RadialVarianceHash` on the hash tier.
- Model size vs. latency: DINOv2-small (ONNX, INT8) is ~60 MB and runs on CPU in Node in ~50–150 ms/image; SigLIP-2 ViT-B is larger but better semantic quality. Start with DINOv2-small and measure.

---

## Sources

- `phash.org` — canonical pHash library, GPLv3 status, algorithm docs: <https://phash.org/>
- `aetilius/pHash` repo / COPYING — license confirmation: <https://github.com/aetilius/pHash>
- idealo `imagededup` repo + benchmarks — Apache-2.0, PHash/DHash/AHash/WHash + CNN, performance tables: <https://github.com/idealo/imagededup>, <https://idealo.github.io/imagededup/user_guide/benchmarks/>
- `commonsmachinery/blockhash-js` — MIT block-mean algorithm + Yang/Gu/Niu reference: <https://github.com/commonsmachinery/blockhash-js>
- `blockhash-core` on npm: <https://www.npmjs.com/package/blockhash-core>
- `image-hash` on npm — blockhash wrapper: <https://www.npmjs.com/package/image-hash>
- `imghash` on npm — TS blockhash-based library: <https://www.npmjs.com/package/imghash>
- `sharp-phash` on npm — Sharp-backed DCT pHash for Node: <https://www.npmjs.com/package/sharp-phash>
- OpenCV `img_hash` module docs — algorithms + base API: <https://docs.opencv.org/4.x/d4/d93/group__img__hash.html>
- OpenCV `PHash` class: <https://docs.opencv.org/4.x/df/d4e/classcv_1_1img__hash_1_1PHash.html>
- Jimp `compareHashes` + pHash method: <https://jimp-dev.github.io/jimp/api/jimp/functions/comparehashes/>
- `phashion` Ruby gem — default Hamming threshold 15, pHash wrapper: <https://github.com/westonplatter/phashion>, <http://www.mikeperham.com/2010/05/21/detecting-duplicate-images-with-phashion/>
- `dhash-vips` Ruby gem — non-GPL alternative: <https://github.com/Nakilon/dhash-vips>
- Ghafadaryan, "Detecting Logo Similarity: Combining AI Embeddings with Fourier Descriptors" — DINO + CLIP + Fourier multi-stage pipeline, weighting, failure modes: <https://dev.to/ruben_ghafadaryan/detecting-logo-similarity-combining-ai-embeddings-with-fourier-descriptors-5eoc>
- "CLIP vs DINOv2 in image similarity" — comparative behavior on visual vs semantic similarity: <https://medium.com/aimonks/clip-vs-dinov2-in-image-similarity-6fa5aa7ed8c6>
- `josephrocca/openai-clip-js` + Transformers.js recommendation — CLIP in Node via ONNX: <https://github.com/josephrocca/openai-clip-js>
