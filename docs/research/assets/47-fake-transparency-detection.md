# 47 — Detecting "Fake Transparency" in AI-Generated PNGs (Tier-0 Validator)

**Research value: high** — Multiple open-source tools (unfake.png, unfake.js/py, fmw42's DFT answer) directly solve "baked checkerboard" detection; `sharp.stats()` + raw alpha buffers cover coverage/entropy/bbox; a practical Tier-0 validator can be assembled from widely-used primitives without new research.

This doc captures the techniques, libraries, and copy-pasteable `sharp` pseudocode needed to fail AI-generated PNGs that *look* transparent but aren't — so Tier-0 can reject them before they enter the pipeline.

---

## 1. Failure modes we need to catch

| Mode | What the model does | Detection signal |
|---|---|---|
| **A. Fully opaque PNG** | RGBA buffer with alpha=255 everywhere | `stats().isOpaque === true`, or `hasAlpha === false` |
| **B. Baked checkerboard** | RGB renders a Photoshop/GIMP transparency grid into color; alpha still =255 | Two-color histogram peak + 2D periodicity + alpha fully opaque |
| **C. Single-color bleed** | Uniform off-white (#F7F7F7, #FAFAFA, pure #FFF) behind logo, alpha=255 | Edge-ring sampling: >90% of border pixels within ΔE<2 of one color |
| **D. Sparse / leaky alpha** | Real alpha exists but mostly 0 — subject chopped, or mostly 255 with a tiny cut | Alpha coverage outside `[min%, max%]` band, low alpha entropy |
| **E. Fragmented subject** | Background removed by flood-fill with holes/islands | `connectedComponents` on alpha > threshold returns many small blobs |
| **F. Content outside safe-zone** | Subject extends to canvas edge with no margin | bbox of opaque pixels / canvas area > threshold, or distance-to-edge < X% |

Tier-0 needs a fast pre-flight that flags **A–F** in <100ms per image using `sharp` + a small amount of JS.

---

## 2. Prior art & OSS references

### Dedicated tools

- **[unfake.png](https://unfakepng.com)** (web service) — specifically rescues "fake" PNGs that display a checkerboard instead of real transparency. Uses VLM to re-segment the subject and re-emit a real alpha. Confirms this is a recognized real-world failure mode; not open source, but proves the problem space. ([scriptbyai writeup](https://www.scriptbyai.com/unfake-png/))
- **[jenissimo/unfake.js](https://github.com/jenissimo/unfake.js)** (749★) and **[painebenjamin/unfake.py](https://github.com/painebenjamin/unfake.py)** — *different* tool (same name), targets AI-generated *pixel art*. Useful techniques we can borrow:
  - **Edge-based flood-fill for background removal** (single-color bleed case C).
  - **Alpha binarization + morphology** to clean soft/feathered alpha (case D).
  - **Automatic scale detection via run-length / edge analysis** — directly applicable to detecting a checkerboard's tile size.
- **[lovell/sharp#723](https://github.com/lovell/sharp/issues/723)** — the canonical issue where `isOpaque` was added to `sharp.stats()` (v0.19.0+). This is exactly the "alpha exists but isn't used" check we need for mode A.
- **[lovell/sharp#1684](https://github.com/lovell/sharp/issues/1684)**, **[#2240](https://github.com/lovell/sharp/issues/2240)**, **[#2493](https://github.com/lovell/sharp/issues/2493)** — techniques for per-pixel alpha inspection, alpha-only trimming, and thresholding the alpha channel in isolation.

### StackOverflow / academic

- **[SO 74134195 — "replace checked pattern with transparent"](https://stackoverflow.com/questions/74134195/)** — the money post. `fmw42`'s accepted answer implements **DFT-based notch filtering of a known checkerboard pattern** in OpenCV. Their simpler answer uses `cv2.inRange` on `(230,230,230)..(255,255,255)` to mask the grid — good enough as a cheap first pass.
- **[SO 63377666 — "remove chessboard-like noise"](https://stackoverflow.com/questions/63377666/)** — confirms the pattern: DFT → threshold spectrum → mask regular spikes → inverse DFT.
- **[SO 72169984 — "find repetition size in a scanned texture"](https://stackoverflow.com/questions/72169984/)** — gives an FFT + spectrum-whitening autocorrelation recipe that recovers the tile period without needing to know it in advance.
- **[Robust Fourier-Based Checkerboard Corner Detection](https://link.springer.com/chapter/10.1007/978-3-030-13469-3_63)** — formal treatment; overkill for us but confirms checkerboards have distinctive, near-impulse frequency signatures.
- **[SoyM/img-edge-color-extractor](https://github.com/SoyM/img-edge-color-extractor)** and **[autohue.js](https://medium.com/@yinhaocomeon/autohue-js-automatically-extracting-image-theme-edge-colors-cfa09568c07d)** — JS libraries for sampling dominant colors on the four edges of an image. Ready-made primitives for mode C.

### Checkerboard color/size priors (empirical)

The image generators that produce fake transparency tend to copy one of three rendering dialects. Default Photoshop transparency grid is ~**#FFFFFF/#CCCCCC** at "medium" size. Default GIMP is ~**#666666/#999999** at 16px. Macos Preview / default web demos use ~**#E0E0E0/#B0B0B0**. These are soft priors — we should *not* hard-code them as the only check, but they make the cheap color-pair test extremely fast in common cases.

---

## 3. Detection strategy (layered, cheap → expensive)

### Layer 0: PNG chunk inspection (`pngjs`, `image-size`)

Before decoding, read the IHDR + tRNS chunk. If `color_type ∉ {4, 6}` and there's no `tRNS` chunk, the PNG literally cannot be transparent — fail fast regardless of appearance.

```ts
import { PNG } from "pngjs";
import { createReadStream } from "node:fs";

async function hasTransparencyChunks(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    createReadStream(path)
      .pipe(new PNG())
      .on("metadata", (m) => resolve(Boolean(m.alpha))) // true if color_type 4/6 or tRNS
      .on("error", reject);
  });
}
```

`image-size` alone does NOT expose tRNS; it only returns width/height/type. Use `pngjs` (or a manual 8-byte-chunk reader) for this layer.

### Layer 1: `sharp.stats()` fast triage

```ts
import sharp from "sharp";

export async function tier0Triage(buf: Buffer) {
  const meta = await sharp(buf).metadata();
  if (!meta.hasAlpha) return { fail: "NO_ALPHA_CHANNEL" };

  const stats = await sharp(buf).stats();
  // stats.channels[3] is the alpha channel when image is RGBA
  const alpha = stats.channels[3];
  if (stats.isOpaque) return { fail: "ALPHA_FULLY_OPAQUE" }; // mode A

  // Entropy of the *whole image* is exposed as stats.entropy (scalar);
  // for per-channel entropy we compute from the raw alpha buffer below.
  return { ok: true, alpha, meta };
}
```

### Layer 2: Alpha coverage + entropy (modes D, E)

```ts
async function alphaProbe(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = info.width * info.height;
  let opaque = 0, transparent = 0;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) {
    const a = data[i];
    hist[a]++;
    if (a >= 250) opaque++;
    else if (a <= 5) transparent++;
  }

  const coverage = opaque / n;           // fraction of subject pixels
  const transparentFrac = transparent / n;
  // Shannon entropy of the alpha histogram (bits)
  let H = 0;
  for (let i = 0; i < 256; i++) {
    if (!hist[i]) continue;
    const p = hist[i] / n;
    H -= p * Math.log2(p);
  }

  return { coverage, transparentFrac, alphaEntropy: H };
}
```

Rules of thumb for a logo/icon on transparent bg:
- `transparentFrac > 0.15` — real alpha is doing work. If it's <0.02 and `coverage` ~1, that's mode A or C.
- `alphaEntropy < 0.05 bits` means alpha is almost constant — suspicious unless `coverage` is clearly binary (logo with sharp edges will have H > ~0.3 from aa-edges).

### Layer 3: Edge-ring uniform-color test (mode C)

Sample a `k`-pixel ring on the outer edge. If ≥90% of those pixels fall within a small color ball (ΔE or RGB L1<15), the "transparency" is painted.

```ts
async function edgeRingUniformity(buf: Buffer, ringPx = 2) {
  const { data, info } = await sharp(buf)
    .removeAlpha()           // test the RGB the model painted
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info; // channels = 3

  const samples: [number, number, number][] = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let r = 0; r < ringPx; r++) {
    for (let x = 0; x < w; x++) { push(x, r); push(x, h - 1 - r); }
    for (let y = 0; y < h; y++) { push(r, y); push(w - 1 - r, y); }
  }

  // Mean color
  const mean = samples.reduce(
    (a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as [number, number, number],
    [0, 0, 0]
  ).map((v) => v / samples.length);

  // Fraction within L1 distance <= 15 of the mean
  const near = samples.filter(
    (p) => Math.abs(p[0] - mean[0]) + Math.abs(p[1] - mean[1]) + Math.abs(p[2] - mean[2]) <= 15
  ).length;
  return { uniformity: near / samples.length, edgeMean: mean };
}
```

- `uniformity > 0.90` + `alphaProbe.transparentFrac < 0.02` ⇒ **mode C** (single-color bleed).
- If `mean` is near pure white (#FFFFFF) or soft gray (#F0..#FA), that's the classic "model forgot to remove the background" case.

### Layer 4: Checkerboard test (mode B) — the hard one

Three stacked sub-checks, any match fires "baked checkerboard":

**4a. Two-color histogram probe.** Sample a border band (e.g. outermost 20% of canvas as an L-shape mask, or a pure ring). Quantize to 3-bit/channel (512 bins). If the top-2 bins cover >80% of the band AND their colors match a known transparency-dialect pair:
- (≈#FFFFFF, ≈#CCCCCC) — Photoshop light
- (≈#666666, ≈#999999) — GIMP
- (≈#E0E0E0, ≈#B0B0B0) — web/macOS preview
... flag it. This costs ~O(pixels) and catches the common case without any DFT.

**4b. 2×2 block alternation score.** The checkerboard's defining property: neighbor tiles of size `s` differ sharply. Compute, for `s ∈ {4, 8, 16, 32}`, the mean of `|I(x,y) - I(x+s,y)|` averaged over a grid of sample points, and compare to `|I(x,y) - I(x+1,y)|`. A baked checker has high inter-tile delta with low intra-tile delta at exactly one `s`.

```ts
async function blockAlternationScore(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const get = (x: number, y: number) => data[y * w + x];

  const sizes = [4, 8, 16, 32];
  const scores: Record<number, { inter: number; intra: number; ratio: number }> = {};
  for (const s of sizes) {
    let inter = 0, intra = 0, nInter = 0, nIntra = 0;
    // sample every 4px to stay cheap
    for (let y = 0; y + s < h; y += 4) {
      for (let x = 0; x + s < w; x += 4) {
        inter += Math.abs(get(x, y) - get(x + s, y));   // across tile boundary
        nInter++;
        if (x + 1 < w) { intra += Math.abs(get(x, y) - get(x + 1, y)); nIntra++; }
      }
    }
    const I = inter / nInter, i = intra / nIntra || 1e-6;
    scores[s] = { inter: I, intra: i, ratio: I / i };
  }
  // Any size with ratio > ~6 AND inter > 40 suggests a baked checker at that tile size.
  return scores;
}
```

**4c. FFT notch-peak test (optional, expensive — only if 4a/4b ambiguous).** Port of fmw42's DFT trick: a true checkerboard has two bright impulses at `(±1/(2s), ±1/(2s))` in the shifted spectrum. Compute `cv::dft` equivalent (via `ndarray-fft`, `fftw-js`, or shell out to `python -c` if already available), take magnitude, exclude DC, and check for strong symmetric peaks on the diagonal. If the top-4 non-DC peaks are at matching distances on the diagonal and ≥5× the median spectrum energy, it's periodic.

We probably won't need 4c in practice — 4a catches >90% of real cases and 4b catches the rest.

### Layer 5: Connected-components sanity (mode E)

Binarize alpha at `a > 128`, run connected-components. Any real logo/icon is 1–5 blobs covering >95% of the opaque mass; many small islands = a cutout gone wrong.

Sharp doesn't expose CC directly. Two options: (a) re-implement 2-pass CC in JS on the alpha-mask buffer (~40 LOC, fine for Tier-0 at 1024² or smaller), or (b) shell out to `magick identify -format %[connected-components] -define connected-components:mean-color=true`. Prefer (a) to avoid the ImageMagick dep in the validator hot path.

```ts
function connectedComponentsOnMask(
  mask: Uint8Array, w: number, h: number
): { count: number; largestFrac: number } {
  const label = new Int32Array(w * h);
  let next = 1;
  const sizes: number[] = [0];
  const queue: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!mask[idx] || label[idx]) continue;
      const id = next++;
      sizes.push(0);
      queue.push(idx);
      label[idx] = id;
      while (queue.length) {
        const p = queue.pop()!;
        sizes[id]++;
        const px = p % w, py = (p - px) / w;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !label[q]) { label[q] = id; queue.push(q); }
        }
      }
    }
  }
  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  const largest = Math.max(...sizes);
  return { count: next - 1, largestFrac: largest / total };
}
```

### Layer 6: Safe-zone bbox (mode F)

Use `sharp`'s alpha-aware trim, then compare trimmed size to canvas.

```ts
async function safeZoneBbox(buf: Buffer, safeZonePct = 0.8) {
  const src = sharp(buf);
  const { width, height } = await src.metadata();
  // trim removes a rectangular border matching the top-left color
  // within a threshold. For alpha-bg images, alpha=0 border is uniform,
  // so .trim() with a small threshold gives the opaque bbox.
  const trimmed = await src
    .clone()
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });
  const bw = trimmed.info.width;
  const bh = trimmed.info.height;
  const bboxFrac = (bw * bh) / ((width ?? 1) * (height ?? 1));
  const marginX = ((width ?? bw) - bw) / 2 / (width ?? 1);
  const marginY = ((height ?? bh) - bh) / 2 / (height ?? 1);
  const minMargin = Math.min(marginX, marginY);
  return {
    bboxFrac,
    minMargin,
    ok: bboxFrac <= safeZonePct && minMargin >= (1 - safeZonePct) / 2,
  };
}
```

Caveat from [lovell/sharp#2363](https://github.com/lovell/sharp/issues/2363): libvips' `find_trim` runs a median filter designed for photographs and can shave one-pixel details off vector-like logos. For Tier-0 triage (not for actual cropping) this bias is acceptable — we only want an approximate bbox.

---

## 4. Putting it together — Tier-0 verdict function

```ts
export async function tier0FakeTransparencyCheck(buf: Buffer) {
  const triage = await tier0Triage(buf);
  if (triage.fail) return { verdict: "reject", reason: triage.fail };

  const [alpha, edge, blocks, safe] = await Promise.all([
    alphaProbe(buf),
    edgeRingUniformity(buf),
    blockAlternationScore(buf),
    safeZoneBbox(buf),
  ]);

  if (edge.uniformity > 0.9 && alpha.transparentFrac < 0.02)
    return { verdict: "reject", reason: "SINGLE_COLOR_BLEED", edge };

  const suspectTile = Object.entries(blocks).find(
    ([, s]) => s.ratio > 6 && s.inter > 40
  );
  if (suspectTile)
    return { verdict: "reject", reason: "BAKED_CHECKERBOARD", suspectTile };

  if (alpha.coverage < 0.02 || alpha.coverage > 0.95)
    return { verdict: "reject", reason: "ALPHA_COVERAGE_OUT_OF_BAND", alpha };

  if (alpha.alphaEntropy < 0.05)
    return { verdict: "reject", reason: "FLAT_ALPHA", alpha };

  if (!safe.ok)
    return { verdict: "warn", reason: "SAFE_ZONE_VIOLATED", safe };

  return { verdict: "pass", alpha, edge, blocks, safe };
}
```

Thresholds above are starting points; calibrate against a small labeled set of real-vs-fake PNGs. The `ratio > 6` and `inter > 40` cutoffs for the block alternation test are conservative — a real photograph with sharp edges rarely produces those values across multiple `s`, but a single anomaly at `s=16` is exactly the Photoshop checker signature.

---

## 5. Tool matrix

| Tool | Role in Tier-0 | Notes |
|---|---|---|
| **sharp** (`raw`, `stats`, `trim`, `extractChannel`, `ensureAlpha`) | Primary driver | `stats().isOpaque`, `stats().channels[3]`, raw alpha buffers, alpha-aware trim |
| **pngjs** | Layer-0 chunk inspection | Emits `metadata.alpha` based on IHDR color_type and tRNS |
| **image-size** | Dimension sanity | Does *not* expose tRNS; just width/height |
| **ImageMagick `identify -verbose`** | Fallback / CI diagnostics | `%[opaque]`, `%[connected-components]`, histogram; avoid in hot path |
| **ImageMagick `convert -trim`** | Cross-check safe-zone | Useful when sharp's libvips trim over-shaves |
| **OpenCV (`cv::dft`, `cv::connectedComponents`)** | Reference implementation for FFT/CC | Port logic to JS; don't ship OpenCV in the validator |
| **Pillow** | Reference for edge-ring sampling | `getcolors()` on an edge-only mask |

---

## 6. Open questions / follow-ups

- Should Tier-0 attempt to *rescue* mode C (flood-fill background removal à la unfake.js) or strictly reject and kick back to the generator? Leaning reject: rescuing alpha without a matting model corrupts soft edges.
- Calibration corpus: we need ~50 real transparent-bg PNGs and ~50 AI-generated fakes (all four dialects of baked checker + bleed) to tune the thresholds. Can mine fakes from Stable Diffusion / DALL·E "transparent" prompt failures.
- The block-alternation test's `sizes` list assumes integer pixel tiles. When the model rasterizes a vector checker at non-integer scale (e.g. zoom-aware Photoshop medium grid), the pattern drifts in phase across the canvas — FFT still catches it, block test may not. If 4a + 4b miss >5% of fakes in calibration, wire up 4c.
- `tRNS`-only PNGs (color_type 3 with a palette-index transparency chunk) are rare in AI output but technically valid; treat them as real transparency even though alpha is indirect.
