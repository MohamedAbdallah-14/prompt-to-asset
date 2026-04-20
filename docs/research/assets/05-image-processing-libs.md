# Image Processing Libraries — External Research Digest

> Scope: Node.js-first image toolchain for the `prompt-to-asset` MCP server's
> platform-export stage (resize + kernel quality, format convert across
> PNG/WebP/AVIF/ICO, alpha compositing, safe-zone padding, masked crops,
> metadata stripping, ICC handling). Native/other candidates included for
> fallback paths (SVG rasterization, dedicated encoders).

**Research value: high** — The ecosystem is dominated by one clear winner
(`sharp`) for the core pipeline, with well-defined specialist companions for
SVG rasterization, Canvas-style compositing, and format niches (ICO). Prior
art, vendor patterns, and cross-domain analogies are abundant.

---

## Candidate matrix

| Library | License | Engine | Formats (in → out) | Resize kernels | Alpha/Composite | Maintained | Weekly DLs |
|---|---|---|---|---|---|---|---|
| **sharp** (`lovell/sharp`) | Apache-2.0 | libvips (C, native N-API v9) | JPEG, PNG, WebP, AVIF, HEIF, TIFF, GIF, SVG-in, raw | Lanczos3 (default), cubic, mitchell, nearest, lanczos2 | Full (`composite`, `ensureAlpha`, `removeAlpha`, `extractChannel`, `extend`) | Very active (v0.35.0-rc, libvips 1.3.0-rc.4 Apr 2026) | ~9M |
| **@resvg/resvg-js** | MIT/Apache-2.0 | Rust `resvg` via napi-rs | SVG → PNG (and raw pixels) | n/a (vector) | PNG output; use sharp to compose | Active, but watch `thx/resvg-js` font I/O issue #367 | ~700K |
| **jimp** | MIT | Pure JS, zero native deps | JPEG, PNG, BMP, GIF (no WebP/AVIF native) | Bilinear/bicubic; **no Lanczos3** | Full, but 20–50× slower than sharp | v1.6.0 (late 2024), slow cadence | ~1.5–2.2M |
| **@napi-rs/canvas** | MIT | Skia via napi-rs, prebuilt | HTML5 Canvas + PNG/JPEG/WebP export | Skia resampling | Full Canvas2D + text | Active, faster + easier install than node-canvas | ~500K |
| **node-canvas** (`Automattic`) | MIT | Cairo + Pango (system deps) | PNG/JPEG + SVG via librsvg | Cairo | Full Canvas2D | Maintained but heavier install; ~10–15% slower than napi-rs | ~800K |
| **imagescript** | Apache-2.0 | Pure JS + WASM hot paths | JPEG, PNG, WebP, TIFF, GIF, SVG-in | Basic (nearest/bilinear) | Yes | Slow cadence (last commit ~9 months pre-2026) | ~50K |
| **image-js** | MIT | Pure JS/TS + WASM | JPEG, PNG, BMP, TIFF (no WebP/AVIF out) | Yes | Yes; strong ROI / CV features | Active (v1.5.0 Mar 2026) | ~50K |
| **canvaskit-wasm** | BSD-3-Clause (Skia) | Skia via WASM | PNG/JPEG; Canvas API | Skia | Full Canvas + Skottie | Maintained with Skia cadence; heavy WASM bundle (several MB) | ~50K |
| **@jsquash/{jpeg,oxipng,webp}** | Apache-2.0 / mixed | MozJPEG / oxipng / libwebp in WASM | Re-encode only | n/a | n/a | Active, but **explicitly "limited / experimental" Node.js support** | ~20–50K |
| **imagemin** + plugins | MIT | Shells out to mozjpeg / pngquant / oxipng / libwebp binaries | Re-encode | n/a | n/a | Alive (v9.0.1 Mar 2025) but slow; plugin ecosystem partly stale | ~1M (core) |
| **@squoosh/cli** (Google) | Apache-2.0 | WASM codecs | MozJPEG / OxiPNG / WebP / AVIF / JXL | n/a | n/a | **Unmaintained**; community fork `frostoven/Squoosh-with-CLI` | low |
| **sharp-ico / icon-gen** | MIT | Wraps sharp | PNG → ICO/ICNS multi-size | n/a | n/a | Active (sharp-ico ~128K weekly) | n/a |

Verified format/license/release dates from lovell/sharp, sharp-libvips, npm
registry, and maintainer READMEs (see Sources). All numbers current as of
Apr 2026 unless otherwise marked.

---

## Prior Art

- **Next.js / `next/image`** ships sharp as its optimization pipeline. This is
  the de facto reference for multi-format, multi-size export (AVIF+WebP+PNG
  ladder) in production Node. Confirms sharp as the industry default for
  "platform exports."
- **Google Squoosh** (web app + deprecated CLI) established the codec UX
  vocabulary: per-format encoder options, quality ladders, AVIF/JXL first.
  The CLI is stale; the `frostoven/Squoosh-with-CLI` fork keeps it usable.
  Team takeaways: treat individual encoders (MozJPEG / OxiPNG / libwebp /
  libaom-av1) as separable, not as a single pipeline.
- **Cloudinary / imgix / Vercel Image** are the SaaS reference shape: a
  single URL → `{format, size, dpr, crop, bg, pad}` transform. Their public
  transform vocabularies are a strong template for MCP tool inputs.
- **sharp's libvips 8.15 "keep" feature** (wrapped as `keepIccProfile()`,
  `keepMetadata()`, `withIccProfile()` in sharp ≥ 0.33) is the first
  mainstream Node API that cleanly separates "strip EXIF/XMP/IPTC" from
  "preserve ICC." Before 0.33, strip-but-keep-ICC was a common pain point.

## Adjacent Solutions

- **Skia-based server canvases** (`@napi-rs/canvas`, `skia-canvas`,
  `canvaskit-wasm`) are the adjacent ecosystem when the job becomes "lay out
  text + shapes + images on a poster" rather than "transcode one asset."
  `@napi-rs/canvas` is the modern default: prebuilt Skia via napi, no Cairo
  install, ~10–15% faster than node-canvas in samizdat's 2025 benchmarks.
- **SVG-first pipelines**: render vector poster in SVG, rasterize with
  `@resvg/resvg-js`, post-process pixels with sharp. This is the pattern
  Vercel OG Image (`@vercel/og` → satori → resvg) uses and is the cleanest
  way to get crisp text + vector shapes without shipping a browser.
- **Dedicated encoder wrappers** (`imagemin-mozjpeg`, `imagemin-pngquant`,
  `@jsquash/*`) matter only if sharp's libvips-built encoders are not
  hitting the byte-size target. In practice libvips + mozjpeg/spng is
  competitive; reach for these only as a final squeeze pass.

## Market and Competitor Signals

- **Consolidation around sharp.** ~9M weekly downloads, Next.js adoption,
  ongoing major releases (0.33 → 0.35-rc in 2026), Apache-2.0 licensing on
  both `sharp` and `sharp-libvips`. No credible challenger for the core
  server pipeline role.
- **Jimp's niche is survival in hostile runtimes** (AWS Lambda layers you
  can't prebuild, edge runtimes that reject native binaries, Deno/Bun with
  broken N-API). Worth keeping as a documented fallback, not a default.
- **Imagemin is winding down functionally.** Active but low-signal commits,
  plugin ecosystem partly stale. Most teams have moved to sharp-native
  quality tuning or to Squoosh-fork/jSquash for format-specific squeeze.
- **ICO support is a solved but external problem.** Sharp declines to add
  ICO natively (lovell/sharp#1118). `sharp-ico` (~128K weekly) and
  `icon-gen` are the community-blessed composition layers.

## Cross-Domain Analogies

- **Video transcoding (ffmpeg + NLE overlay).** The platform-export stage
  has the same shape as a video transcode ladder: one master asset → many
  outputs differing by resolution, container, codec, and metadata policy.
  The strong lesson from ffmpeg tooling is "make the transform spec
  declarative and the encoder settings per-format"—a good template for the
  MCP tool's input schema.
- **Font subsetting / `fonttools pyftsubset`.** Same structural problem as
  metadata stripping: the asset ships a pile of optional sidecar data (EXIF
  / XMP / IPTC / ICC), most of it noise for delivery, one piece (ICC)
  load-bearing for color correctness. The `keep` vocabulary in libvips 8.15
  mirrors fontTools' "preserve this table" flags and should be modeled the
  same way: an allowlist, not a denylist.

---

## Gotchas (load-bearing)

1. **sharp ↔ libvips version coupling.** sharp pins to a specific
   `sharp-libvips` release; upgrading sharp may change bundled libvips (and
   therefore AVIF encoder behavior, `keep` metadata semantics, HEIF
   availability). Pin sharp exactly, document the libvips version in
   release notes, and re-run golden-file tests on bumps. AVIF in bundled
   builds is **8-bit only** — if 10-bit AVIF is ever a target, a custom
   libvips build with libheif+libaom is required.
2. **resvg-js font loading is the hot path.** Default behavior scans system
   fonts on every call; issue thx/resvg-js#367 documents 300ms–1500ms cost
   on text-heavy SVGs. For any SVG route, set
   `font: { loadSystemFonts: false, fontFiles: [...] }` at init, and
   (once available) use the `preloadFonts` option. Plan for a
   module-scoped Resvg factory, not a per-request one.
3. **`extend()` and alpha.** `sharp().extend()` does **not** auto-add an
   alpha channel — passing a transparent background on a JPEG-like image
   silently fills with opaque black. Always `ensureAlpha()` before
   `extend()` when the target is "transparent safe-zone padding," and
   output PNG/WebP/AVIF. JPEG has no transparency.
4. **Metadata defaults flipped historically.** Sharp strips all metadata by
   default. If color fidelity matters (brand exports, HDR workflows), call
   `keepIccProfile()` explicitly. `withMetadata()` without arguments does
   **not** add an sRGB profile to untagged inputs (#734). Be explicit.
5. **Serverless footprint.** Sharp's native binaries are 20–40 MB per
   platform triple. AWS Lambda's 50 MB zipped / 250 MB unzipped limits are
   reachable if you bundle sharp for both x64 and arm64 into one package.
   Use Lambda layers, container images, or architecture-specific builds;
   don't ship all triples.
6. **node-canvas install tax.** Cairo + Pango + libjpeg + giflib system
   packages. On alpine/musl this is a frequent CI break. Prefer
   `@napi-rs/canvas` unless a specific Cairo feature is required.
7. **jSquash is not a Node.js product.** The README calls Node support
   "experimental" and "not the primary focus." Fine as an optional re-encode
   pass, not fine as a load-bearing dependency.
8. **ICO multi-size semantics.** ICO is a multi-image container. Generate
   the full ladder (256/128/64/48/32/24/16) and let `sharp-ico` or
   `icon-gen` pack them; don't ship a single 256px frame.

---

## Recommended primary stack for platform-export

1. **sharp** — pipeline core: decode, Lanczos3 resize, format convert
   (PNG / WebP / AVIF), alpha composite, `extend()` for safe-zone padding,
   masked crops via `composite({ blend: 'dest-in' })`, metadata control via
   `keepMetadata` / `keepIccProfile` / `withIccProfile`.
2. **@resvg/resvg-js** — rasterize vector poster layers (logo marks,
   badges, templated SVG layouts) to PNG buffers, then hand to sharp for
   compositing. Construct a module-scoped Resvg instance with preloaded
   fonts; never let it touch system fonts at request time.
3. **sharp-ico** — only where `.ico` output is required (favicons, Windows
   app icons). Otherwise skip.
4. **jimp** — documented fallback for runtimes where sharp cannot be
   installed (specific edge/serverless profiles). Not wired by default.
5. **Optional squeeze pass**: shell-wrapped `oxipng` / `mozjpeg` (or the
   Squoosh community fork) behind a feature flag, only if sharp-native
   encoder output misses a byte-size budget on a specific format. Do not
   adopt `imagemin-*` as a default; treat external encoders as opt-in
   polish, not part of the hot path.
6. **Not recommended as primary**: `jimp`, `imagescript`, `image-js`,
   `node-canvas`, `canvaskit-wasm`, `@jsquash/*`. Each has a real niche
   (portability, CV, browser parity, WASM-only environments) but none is
   the right default for this server.

---

## Sources

- `sharp` performance + format matrix — https://sharp.pixelplumbing.com/performance/
- `lovell/sharp` repository (release cadence, star count) — https://github.com/lovell/sharp
- `lovell/sharp-libvips` license + v1.3.0-rc (Apr 2026) — https://github.com/lovell/sharp-libvips
- Sharp ICC / metadata `keep` feature PR — https://github.com/lovell/sharp/pull/3856 ; issues #2111, #3824, #734
- Sharp `extend()` + alpha gotchas — https://github.com/lovell/sharp/issues/437, #1555, #2858
- Sharp ICO support discussion — https://github.com/lovell/sharp/issues/1118
- `@resvg/resvg-js` README + font I/O issue — https://www.npmjs.com/package/@resvg/resvg-js ; https://github.com/thx/resvg-js/issues/367 ; PR #366
- `@napi-rs/canvas` vs `node-canvas` benchmarks — https://github.com/samizdatco/canvas-benchmarks ; PkgPulse comparison 2026
- `canvaskit-wasm` npm + Skia docs — https://www.npmjs.com/package/canvaskit-wasm
- `imagescript` vs `jimp` — https://nodejs.libhunt.com/compare-jimp-vs-imagescript ; https://imagescript.matmen.dev/
- `image-js` v1.5.0 — https://www.npmjs.com/package/image-js ; https://github.com/image-js/image-js
- `jSquash` Node.js support caveat — https://github.com/jamsinclair/jSquash ; https://www.npmjs.com/package/@jsquash/oxipng
- Squoosh CLI status + community fork — https://www.npmjs.com/package/@squoosh/cli ; https://github.com/frostoven/Squoosh-with-CLI
- `imagemin` latest release — https://github.com/imagemin/imagemin
- `sharp-ico`, `icon-gen`, `create-ico` — https://www.npmjs.com/package/sharp-ico ; https://www.npmjs.com/package/icon-gen
- Lambda bundle-size constraints for native modules — serverless sharp guidance (codegive.com, oneuptime.com)
