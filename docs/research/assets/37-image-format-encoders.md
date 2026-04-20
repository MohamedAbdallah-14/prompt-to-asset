# 37 — Image Format Encoders / Decoders

Research digest covering open-source encoders/decoders for the image formats shipped by `asset_bundle`: PNG, JPEG, WebP, AVIF, ICO, SVG, and (optional) HEIC/HEIF. Licensing is called out explicitly because some popular codecs are GPL or LGPL and constrain distribution.

## TL;DR

- **sharp** (via libvips) already ships MozJPEG, libwebp, libheif, libimagequant, and libaom/libavif prebuilt. For the shipped formats we almost never need to shell out.
- Things sharp does *not* cover well that we should bolt on: **ICO multi-res** (no native libvips encoder), **oxipng** lossless PNG crush (better than libvips zlib), **SVGO** for SVG, and optionally **jpegli** if/when we chase smaller JPEGs.
- **HEIC is licensing-heavy.** libheif itself is LGPL-3 (dynamic link OK), but the HEVC encoder it wraps (`x265`) is GPL-2. If we ship HEIC encoding we inherit GPL obligations. Decoding-only via libde265 is fine. We should treat HEIC as **input-only**.
- **libimagequant / pngquant is GPL-3 or commercial** (pngquant.org). sharp's older docs called it BSD-2 but that's historical — current releases are GPL-3. Avoid using sharp's `palette: true` path in anything we redistribute unless we're already GPL-compatible.

---

## PNG

### libpng
- **License:** libpng license (MIT-style, permissive).
- **Role:** Reference PNG encoder/decoder in C. Fine correctness, mediocre compression ratio.
- **Where it shows up:** Indirectly inside libvips → sharp. We rarely call it directly.

### lodepng
- **License:** zlib (permissive, effectively MIT).
- **Role:** Single-header C/C++ PNG encoder/decoder with a built-in deflate implementation — no zlib dep.
- **Perf:** Slower than libpng on large images; compression ratio comparable. Value prop is *zero deps*, not speed.
- **When to use:** Embedding PNG encode/decode into a small native binary or WASM module where adding libpng+zlib is annoying.

### oxipng
- **License:** MIT (Rust).
- **Role:** Lossless PNG optimizer. Not an encoder from raw pixels — it rewrites existing PNGs with better filter/zlib choices; optional Zopfli backend for deeper compression.
- **Perf:** Multithreaded, very fast at default `-o 2`; `-o max` + `--zopfli` gets 5–15% further at large time cost.
- **How we use it:** Run as a post-processing step after sharp emits PNG (logos, favicons, illustrations on flat backgrounds). Strip metadata (`--strip safe`) by default.
- **CLI:** `oxipng -o 2 --strip safe input.png`.
- **Library:** `oxipng` crate; also usable from Node via `@napi-rs/image` or the `oxipng-wasm` build.

### libimagequant / pngquant
- **License:** **GPL-3 or commercial.** Dual-licensed; pngquant.org is authoritative. Older sharp notes that said "BSD-2" are out of date.
- **Role:** Lossy PNG palette quantizer. Produces 8-bit PNGs, typically 3–4× smaller than a lossless PNG at barely-visible quality loss.
- **Action:** Avoid in permissive-only distributions. If we want lossy PNG reduction, use WebP lossy or AVIF instead — we don't need palette PNG.

---

## JPEG

### mozjpeg (Mozilla / IJG)
- **License:** 3-clause BSD + IJG (both permissive).
- **Role:** libjpeg-turbo fork with progressive, trellis quantization, and perceptually tuned quant tables. Drop-in API-compatible.
- **Perf:** ~10% smaller than libjpeg-turbo at the same visual quality; slower (~3–5× encode) but irrelevant for our batch sizes.
- **Where it shows up:** **sharp bundles mozjpeg** in its prebuilt libvips (since v0.28). We get it for free when we emit `.jpeg` via sharp.

### jpegli (Google)
- **License:** BSD-3 (same repo style as libjxl).
- **Role:** Newer JPEG encoder derived from libjxl's JPEG path. ~20–35% smaller than libjpeg-turbo at matched perceptual quality; benchmarks show users prefer jpegli over MozJPEG at the same file size.
- **Status in 2026:** Stable, API-compatible with libjpeg62, but **not integrated into libvips/sharp** yet. Used via its own CLI or Rust/Node bindings (`@jsquash/jpeg` uses it experimentally).
- **Action:** Optional bolt-on for photos once we care about last 20% savings. Not needed for v1.

### libjpeg-turbo
- **License:** BSD-style (IJG + 3-clause BSD).
- **Role:** Fast SIMD JPEG codec. We use it transitively for decoding everywhere; we should not prefer it for encoding (mozjpeg/jpegli win).

---

## WebP

### libwebp (Google)
- **License:** BSD-3.
- **Role:** Reference encoder+decoder. Ships the `cwebp` and `dwebp` CLIs plus `libwebp.so`.
- **Perf:** Fast; `-m 6` is slow but still well under a second per image for our sizes.
- **Presets:** `-preset photo`, `-preset picture`, `-preset drawing`, `-preset icon`, `-preset text`. These preseed method/psychovisual/segment settings.
- **Lossless / near-lossless:** `-lossless` and `-near_lossless 60` are meaningful differentiators — WebP lossless beats PNG on many logos.
- **Where it shows up:** sharp → libvips → libwebp. We get `.toFormat('webp', { ... })` out of the box with the same quality knobs.

---

## AVIF

### libavif (AOMedia)
- **License:** BSD-2.
- **Role:** C library + `avifenc` / `avifdec` CLIs. Wraps pluggable encoders: libaom (reference), SVT-AV1, rav1e.
- **Perf vs encoder choice (2025 benchmarks on real images):**
  - **SVT-AV1**: best compression in recent benchmarks, fast. Good production default.
  - **libaom**: slower, good quality, reference.
  - **rav1e**: Rust, safe, middle ground on quality; pairs with cavif-rs.
- **Where it shows up:** sharp bundles libheif+libaom, so `sharp().avif({ quality, effort })` works without extra binaries. `effort` maps roughly to `-speed` inverted (higher effort = slower encoder).

### rav1e
- **License:** BSD-2. Rust.
- **Role:** AV1 still-image encoder. Used directly or through `ravif`/`cavif-rs`.
- **Perf:** Slower than SVT-AV1 in current benchmarks, but safer (memory-safe, pure Rust build). Good for WASM.

### cavif-rs / ravif (Kornel Lesiński)
- **License:** BSD-3 (cavif-rs), with ravif (library) same.
- **Role:** Pure-Rust AVIF creator tuned for still images. Ships tighter defaults than stock rav1e for photographs.
- **Perf:** Noticeably smaller files than a naive `avifenc` on photos at matched quality, because of still-image-specific rate control.
- **Action:** Alternative to sharp's AVIF when we want a no-C-deps path (e.g. strict sandbox) or a Rust native build.

---

## ICO

### png-to-ico (Node, MIT)
- **License:** MIT. Pure JS, zero native deps.
- **Role:** Wraps pre-sized PNGs (or a single PNG auto-resized) into a Windows `.ico` multi-resolution container.
- **Action:** Use when we want a dependency-light path (e.g. from a serverless function).

### sharp-ico (Node, MIT)
- **License:** MIT.
- **Role:** ICO encode/decode built on top of sharp. Default sizes `[256, 128, 64, 48, 32, 24, 16]`. Also decodes.
- **Action:** This is our preferred path — we already have sharp in the pipeline, and sharp-ico composes a multi-size ICO in one call.

### @fiahfy/ico
- **License:** MIT. Pure JS.
- **Role:** Lower-level ICO container encode/decode. Useful if we want full control (custom sizes, cursor files, PNG vs. BMP payload per entry).

Note: the ICO spec allows either BMP or PNG-compressed payload per entry. For sizes ≥ 64 prefer PNG payload; for 16/24/32 either works but PNG is smaller.

---

## SVG

Covered in depth in [04-svg-optimization.md](./04-svg-optimization.md). Short version: **SVGO** is the only production-grade open-source SVG minifier we need. Run after any diffusion → vectorize step or after hand-authored SVGs.

---

## HEIC / HEIF

### libheif (strukturag)
- **License:** **LGPL-3** for the library; sample apps MIT. LGPL permits linking into proprietary code, but static linking requires providing relinkable object files.
- **Important:** libheif is only a *container + metadata* layer. The actual pixel codec is HEVC (x265 encoder, libde265 decoder) or AV1 for AVIF.
  - **x265 (HEVC encoder): GPL-2 or commercial.** Shipping HEIC *encode* pulls in GPL.
  - **libde265 (HEVC decoder): LGPL-3.** Shipping HEIC *decode* is fine.
- **Action:** We should treat HEIC as **decode-only / input-only**. Any ingest path (user upload from iPhone) decodes HEIC → PNG/WebP. We do **not** emit `.heic` unless the project is GPL.

---

## Squoosh ecosystem

### squoosh-cli (Google Chrome Labs)
- **Status: deprecated.** CLI and `libsquoosh` were removed from the official repo in Jan 2023.
- **Fork:** `@frostoven/squoosh-cli` — maintained fork, fixes >500 MB crash and Node 18+ support. Not actively developed; usable but not a foundation.

### jSquash
- **License:** Apache-2 (jSquash itself) + upstream codec licenses.
- **Role:** WASM builds of MozJPEG, oxipng, libwebp, libavif, jpegli, JPEG XL — exported as ES modules (`@jsquash/jpeg`, `@jsquash/webp`, `@jsquash/avif`, `@jsquash/png`, `@jsquash/oxipng`, etc.).
- **Target:** Browser / Web Worker / Cloudflare Workers. **Node is secondary** — their own README points server-side users to sharp.
- **Action:** Use in any edge-function / Workers path where we can't ship native binaries. Otherwise stay on sharp + oxipng.

### @squoosh/lib
- **License:** Apache-2.
- **Status:** Deprecated along with squoosh-cli. Mentioned here only so we don't reach for it accidentally.

---

## How sharp fits in

Prebuilt sharp (via `sharp-libvips`) bundles:

- **libvips** (LGPL-2.1) — the orchestrator
- **libjpeg-turbo** (BSD) replaced by **mozjpeg** (BSD/IJG) since 0.28 — JPEG
- **libpng** + **libspng** (libpng / BSD) — PNG
- **libwebp** (BSD-3) — WebP
- **libheif** (LGPL-3) + **libaom** (BSD-2) — AVIF (and HEIF decode)
- **libimagequant** (GPL-3 or commercial) — optional, only engaged via `palette: true`

So: **for PNG/JPEG/WebP/AVIF encode we do not add binaries beyond sharp.** What we add on top:

1. **oxipng** (post-process PNGs after sharp)
2. **SVGO** (SVG)
3. **sharp-ico** (ICO, using sharp itself)
4. Optionally **jpegli** later, as a separate encoder, for photos only.
5. Never **libimagequant** (license) and never **HEIC encode** (license).

---

## Recommended settings table

| Format | Content type | Preferred encoder | Recommended settings |
|---|---|---|---|
| **PNG** | Logos / UI icons / flat art | sharp → `png()` then **oxipng** | `sharp().png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })` then `oxipng -o 2 --strip safe` |
| **PNG** | Photos | don't — use WebP or AVIF | — |
| **JPEG** | Photos | sharp (**mozjpeg** backend) | `sharp().jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0', progressive: true })` |
| **JPEG** | Logos / text | don't — use PNG or WebP lossless | — |
| **WebP** | Logos / icons / drawings | sharp `webp` or `cwebp -preset icon -lossless` | `sharp().webp({ lossless: true, nearLossless: true, effort: 6, alphaQuality: 100 })` — equivalent to `cwebp -preset icon -z 9 -near_lossless 60` |
| **WebP** | Photos | sharp `webp` or `cwebp -preset photo` | `sharp().webp({ quality: 80, effort: 6, smartSubsample: true })` — equivalent to `cwebp -preset photo -q 80 -m 6` |
| **AVIF** | Logos / graphics with text | sharp `avif` or `avifenc` | `sharp().avif({ quality: 82, effort: 6, chromaSubsampling: '4:4:4' })` — full-chroma is critical for crisp edges |
| **AVIF** | Photos | sharp `avif` or `cavif-rs` | `sharp().avif({ quality: 72, effort: 6, chromaSubsampling: '4:2:0' })` — speed/effort inverse on CLI (`--speed 4`) |
| **ICO** | Favicons | **sharp-ico** | sizes `[16, 32, 48, 64, 128, 256]`; PNG payload per entry for sizes ≥ 64; feed a pre-rendered 256×256 master |
| **SVG** | All vector output | **SVGO** v3 | default preset + `removeViewBox: false`, `cleanupIds: { preservePrefixes: [...] }` — see [04](./04-svg-optimization.md) |
| **HEIC** | Input only | **libheif + libde265** (LGPL-only path) | decode to sRGB PNG/WebP; never emit |
| **JPEG XL** | Experimental | **libjxl** / `@jsquash/jxl` | out of scope for v1; browser support still partial in 2026 |

Encoder-effort guidance: we're running in batch, not live, so always use max effort (`effort: 6` for sharp WebP/AVIF, `-m 6` for cwebp, `-o 2` or higher for oxipng, `--speed 4` for cavif-rs). The marginal extra seconds buy meaningful size wins.

---

## Licensing quick-reference (what can we ship?)

| Library | License | Ship in permissive product? |
|---|---|---|
| libwebp / cwebp | BSD-3 | yes |
| mozjpeg | BSD/IJG | yes |
| jpegli | BSD-3 | yes |
| libjpeg-turbo | BSD | yes |
| libpng | libpng (MIT-ish) | yes |
| lodepng | zlib | yes |
| oxipng | MIT | yes |
| libavif | BSD-2 | yes |
| libaom | BSD-2 | yes |
| SVT-AV1 | BSD-3-Clause-Clear | yes (with minor attribution quirks) |
| rav1e | BSD-2 | yes |
| cavif-rs / ravif | BSD-3 | yes |
| SVGO | MIT | yes |
| png-to-ico | MIT | yes |
| sharp-ico | MIT | yes |
| @fiahfy/ico | MIT | yes |
| libvips | LGPL-2.1 | yes (dynamic link / bundled .node is fine) |
| **libheif** | **LGPL-3** | yes if we don't static-link into a closed binary |
| **x265 (HEVC encode)** | **GPL-2 or commercial** | **no** — blocks HEIC encode |
| **libimagequant / pngquant** | **GPL-3 or commercial** | **no** unless we go GPL |
| @squoosh/lib | Apache-2 | yes but deprecated |
| jSquash | Apache-2 | yes (browser/edge only) |

---

## Sources

- libwebp BSD-3 + `cwebp` docs — https://github.com/webmproject/libwebp, https://developers.google.com/speed/webp/docs/cwebp
- libavif + encoder backends comparison (SVT-AV1 / rav1e / libaom) — https://github.com/AOMediaCodec/libavif, https://catskull.net/libaom-vs-svtav1-vs-rav1e-2025.html
- cavif-rs / ravif — https://github.com/kornelski/cavif-rs, https://lib.rs/crates/ravif
- oxipng — https://github.com/oxipng/oxipng
- mozjpeg vs jpegli (arXiv 2403.18589; jpegli perceptual eval) — https://github.com/google/jpegli, https://giannirosato.com/blog/post/jpegli/
- sharp dependencies and prebuilt contents — https://github.com/lovell/sharp, issue #2604 (mozjpeg + libimagequant integration)
- libheif LGPL-3 licensing clarification — https://github.com/strukturag/libheif/blob/master/COPYING, issue #87
- libimagequant GPL-3 or commercial — https://pngquant.org/lib
- Squoosh CLI removal + jSquash — https://github.com/GoogleChromeLabs/squoosh/pull/1321, https://github.com/jamsinclair/jSquash
- png-to-ico / sharp-ico — https://www.npmjs.com/package/png-to-ico, https://www.npmjs.com/package/sharp-ico
- lodepng zlib license — https://github.com/lvandeve/lodepng
