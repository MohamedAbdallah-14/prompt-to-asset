# Visual-Diff / Screenshot Testing Tools for Tier-0 Asset Validation

Research compiled for `prompt-to-asset`'s deterministic (Tier-0) asset validation:
checkerboard / fake-transparency detection, alpha-channel probes, and
generated-vs-expected image diffing. Current year: 2026.

**Research value: high** — mature OSS stack exists for pixel and SSIM diffing;
`fake-transparency checkerboard` detection is niche and must be assembled from
`sharp` + small custom probes, not a turnkey library.

---

## 1. Library Matrix

| Library | License | API surface | Algorithm | Perf (1000×1000) | Notes |
|---|---|---|---|---|---|
| **pixelmatch** (mapbox) | ISC | `pixelmatch(img1, img2, diff, w, h, {threshold})` on raw typed arrays | YIQ color distance + anti-alias detector (Vyšniauskas 2009) | ~30 ms equal, ~100 ms 1% diff | ~150 LOC, zero deps, Node + browser, in-memory buffers. Default `threshold=0.1`. |
| **odiff** (dmtrKovalenko) | MIT | `compare(a, b, diffPath, opts)` + `ODiffServer` (file paths, OCaml/Rust-ish SIMD binary) | YIQ + anti-alias, SIMD (SSE2/AVX2/AVX512/NEON) | Fastest OSS engine (≈5–10× pixelmatch on large images) | Node binding via `odiff-bin`. File-path based (writes diff PNG). PNG/JPEG/WebP/TIFF. |
| **ssim.js** (obartra) | MIT | `ssim(img1, img2) → {mssim, performance}` | Wang et al. Structural Similarity Index | ~1M weekly dl, actively maintained | Luminance/contrast/structure. Good for perceptual "looks close enough" gate, not pixel-exact. |
| **image-ssim** (darosh) | MIT | Similar scalar SSIM | SSIM | — | **Unmaintained since 2015.** Skip. |
| **looks-same** (gemini-testing / Yandex) | MIT | `looksSame(a, b, {tolerance, antialiasingTolerance, ignoreCaret})` | CIEDE2000 (perceptual ΔE) + antialias tolerance | Fastest on equal images (~0.04 ms no-diff via libvips) | Node-only (libvips). `ignoreCaret` for blinking-cursor in screenshots. |
| **resemblejs** (Huddle) | MIT | `resemble(a).compareTo(b).onComplete(cb)` | Color-tolerance per channel + ignore options | Middle-ground (~55–100 ms) | Browser-friendly, returns % mismatch + diff canvas. Configurable ignore zones. |
| **BackstopJS** | MIT | CLI `backstop init/test/approve`, `backstop.json` scenarios | Uses resemblejs under the hood; Chrome Headless via Playwright/Puppeteer | N/A (framework) | Full viewport-matrix regression framework with HTML report. Overkill for Tier-0 asset checks; suited for *page-level* regression. |
| **reg-suit** | MIT | CLI plugin framework (S3/GCS storage, notifier, comparator) | Delegates to `x-img-diff-js` (WASM) or pixelmatch | N/A (framework) | CI-oriented: stores baselines in cloud, auto-comments on PRs. Pairs with storycap/Storybook. |
| **Playwright** `expect(...).toHaveScreenshot()` | Apache-2.0 | `toHaveScreenshot({threshold, maxDiffPixels, maxDiffPixelRatio})` | pixelmatch internally | Integrated in test runner | Great for *rendered* UI; for raw-asset validation it is heavyweight (requires a Page). Known bugs (#30112, #31592) where ratio thresholds sometimes ignored. |

---

## 2. Algorithm Classes

- **Per-pixel tolerance (YIQ / CIEDE2000)** — `pixelmatch`, `odiff`, `looks-same`,
  `resemblejs`. Fast, deterministic, ideal for "did the expected asset render
  byte-for-byte similar enough."
- **SSIM** — `ssim.js`. Returns a single 0..1 score sensitive to structural
  degradation (blur, compression, slight geometric shift) but lenient on uniform
  color shifts. Useful as a *secondary* gate against perceptual drift.
- **Perceptual hash (pHash / dHash)** — not in this list but worth mentioning:
  `sharp` + `blockhash-core` or `imghash` if you need a 64-bit fingerprint for
  dedupe/near-duplicate detection. Overkill for Tier-0.

---

## 3. Fake-Transparency / Checkerboard Detection

### Problem

Image-generation models (SD-family, some API providers) frequently return a PNG
with an **opaque RGB checkerboard baked into the pixels** instead of real alpha.
Viewers paint transparent pixels over a checkerboard, so the model has learned
to *draw* the checkerboard. This passes naive "hasAlpha" metadata checks.

### Detection strategy (no OSS turnkey library — compose it)

No mature OSS library ships a "detect fake-transparency checkerboard" primitive.
Viable compositions, all implementable in ~40 lines on top of `sharp`:

1. **Alpha-mass probe.** Load PNG with `sharp(path).ensureAlpha().raw()`;
   compute `sum(alpha) / (w*h*255)`. If the user asked for a logo/sticker and
   alpha mass ≈ 1.0 (fully opaque), the model almost certainly returned a flat
   PNG. This is the cheapest first-pass filter.

2. **Periodic-pattern probe on "should-be-transparent" pixels.** When alpha *is*
   present but suspicious (e.g. alpha is a perfect rectangle), sample the pixels
   *outside* the opaque bbox and check:
   - pixels collapse to exactly two dominant colors within a narrow palette
     (classic Photoshop checker: `#FFFFFF` and `#CCCCCC`; GIMP: `#666666` /
     `#999999`; many viewers: `#FFFFFF` / `#E0E0E0`).
   - those two colors alternate on an 8×8 or 16×16 grid. A simple FFT on a
     binarized 32×32 tile, or a direct parity test
     `sample(x,y) == sample(x+8,y+8) != sample(x+8,y)`, is enough.
   - Reference: the Stack Overflow thread *"Removing only checkerboard pattern
     while reading a PNG file in OpenCV"* (Nov 2022) documents the exact color
     ranges and a `cv2.inRange` + `cv2.matchTemplate` approach that ports
     cleanly to JS with `sharp`. There is no packaged library; this is the
     canonical informal reference.

3. **Edge-of-RGB probe.** Real photos / renders have gradient edges. A baked
   checkerboard produces perfectly axis-aligned 8-px-period high-frequency
   energy. A 2-D DFT of the alpha-0 region showing strong spikes at
   `(f_x, f_y) = (w/8, w/8)` is a very specific signature.

4. **Research cross-reference.** The GAN literature on "checkerboard artifacts"
   (IEICE ken-system, arXiv 1907.06515) uses frequency-domain spikes to detect
   *transposed-convolution* artifacts. The math is the same; the artifact is
   different (sub-pixel vs 8-px blocks). Don't confuse the two — but the FFT
   tooling is reusable.

### Recommended implementation

Wrap the three probes above behind a single `isFakeTransparency(buffer)` util
that returns `{ verdict, confidence, reason }`. Use `sharp` for I/O and raw
pixel access; no extra dependency needed.

---

## 4. Alpha-Channel Statistical Probes

For all of these, `sharp` is the right I/O layer (libvips-backed, streaming,
handles PNG/WebP/AVIF uniformly). Additional helpers:

- **Total alpha mass / histogram.** `sharp(buf).extractChannel('alpha').raw()`
  → typed array → reduce. Tracks "how much of the canvas is actually opaque."
- **`sharp.stats()`** returns min/max/mean/stdev per channel — use on the alpha
  channel directly for a one-liner opacity profile.
- **Opaque bounding box.** `sharp(buf).trim({ background: {r:0,g:0,b:0,alpha:0}, threshold: N })`
  returns the crop rectangle via `info.trimOffsetLeft/Top`. Use this to assert
  the subject fits inside a product-defined safe zone (e.g. "logo must sit in
  central 80% with ≥10 px padding").
- **Connected-component analysis of the opaque mask.** No pure-JS library is
  strong here. Options:
  - Threshold alpha → 0/1 mask → ship to OpenCV.js `connectedComponentsWithStats`
    (WASM, ~2 MB, fast).
  - Port the two-pass union-find CCL in ~60 lines of TS if OpenCV.js weight is
    unacceptable.
  - Python-side: `scipy.ndimage.label` (already widely referenced in
    SO answers on PNG multi-part detection).
  Useful to assert: "logo is one connected blob," "cutout isn't shattered into
  islands," or "exactly N icons on canvas."
- **Safe-zone bbox checks.** Pure geometry on the trim result; no library
  needed.
- **Alpha-edge softness.** Histogram of alpha values: a healthy cutout has a
  long tail of partial-alpha pixels at edges. A 0-or-255-only histogram is a
  red flag for aliased / thresholded alpha (common in naive bg removal).

---

## 5. Recommended Tier-0 Stack for `prompt-to-asset`

- **Pixel diff engine:** `pixelmatch` for in-memory buffers in Node unit tests
  (zero deps, ISC, tiny, works on typed arrays — matches a pipeline that already
  has `sharp` producing raw RGBA). Escape hatch: swap to `odiff-bin` when a test
  corpus exceeds ~200 images and wallclock matters.
- **Perceptual gate:** `ssim.js` as a *secondary* assertion (MSSIM ≥ threshold)
  to catch blur/compression drift without false-positiving on subpixel
  rendering jitter.
- **Alpha / transparency primitives:** `sharp` (`extractChannel`, `stats`,
  `trim`, `raw`) is sufficient for alpha-mass, bbox, and raw-pixel access.
  Add an in-repo `assets/validators/fakeTransparency.ts` that implements the
  3-probe approach in §3. Do **not** pull BackstopJS, reg-suit, or Playwright
  visual assertions into Tier-0 — those are page-level regression tools, not
  asset validators.
- **Connected components (optional):** if/when needed, depend on `opencv-wasm`
  lazily inside the validator, behind a feature flag, to keep Tier-0 cold-start
  cheap.
- **Don't use:** `image-ssim` (dead since 2015), BackstopJS (framework, not a
  library — belongs in a separate page-regression tier), reg-suit (CI infra,
  not a validator), Playwright screenshot assertions (require a browser Page;
  wrong abstraction for raw-asset Tier-0).

---

## 6. Sources

- mapbox/pixelmatch — README, ISC license, algorithm references (Kotsarenko &
  Ramos 2010; Vyšniauskas 2009). <https://github.com/mapbox/pixelmatch>
- dmtrKovalenko/odiff — README, Node API, SIMD claims.
  <https://github.com/dmtrKovalenko/odiff>
- Vizzly benchmark *"The Fastest Image Diffing Engine You've Never Heard Of"*
  (honeydiff vs odiff vs pixelmatch).
  <https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/>
- gemini-testing/looks-same — benchmark tables and CIEDE2000 note.
  <https://github.com/gemini-testing/looks-same/blob/master/benchmark/results.md>
- obartra/ssim (ssim.js) — MIT, MSSIM implementation, active.
  <https://github.com/obartra/ssim>
- BackstopJS — garris/BackstopJS, v6.3.25 (Node 20).
  <https://github.com/garris/BackstopJS>
- Playwright docs — `toHaveScreenshot` options; bug threads #30112, #31592 on
  threshold handling. <https://playwright.dev/>
- Sharp — channel manipulation and stats APIs.
  <https://sharp.pixelplumbing.com/api-channel>
- Stack Overflow, *"Removing only checkerboard pattern while reading a PNG file
  in OpenCV"* (Nov 2022) — canonical informal reference for the fake-transparency
  color-range + template-match approach.
  <https://stackoverflow.com/questions/74399905>
- Stack Overflow, *"Python How to check if my PNG files contain 1 parts or
  multiple parts"* — `scipy.ndimage.label` on alpha mask pattern.
  <https://stackoverflow.com/questions/77083558>
- IEICE *"A universal detector of CNN-generated images based on properties of
  checkerboard artifacts"* — adjacent (GAN upsampling) prior art on
  frequency-domain checkerboard detection.
