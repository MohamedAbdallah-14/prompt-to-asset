# Research update log — Category 18 (Asset Pipeline Tools)
Updated: 2026-04-21

## Files modified

- `18d-image-processing-libraries.md`
- `18a-appicon-co-teardown-and-oss-replacement.md`
- `18b-framework-native-asset-generators.md`
- `18c-splash-screen-generators.md`
- `18e-production-pipeline-architecture.md`
- `SYNTHESIS.md`
- `index.md` — no changes needed (already dated 2026-04-21, no factual claims)

---

## Changes by topic

### sharp (Node.js)

- **Old:** "Node.js ≥18"; no version number stated; "~19–20M wk downloads".
- **New:** Current stable is **v0.34.5**; v0.35.0-rc.2 available. Minimum Node changed to `^18.17.0 or >=20.3.0` (Node 16 dropped in v0.34). Experimental RISC-V 64-bit prebuilt added. `--build-from-source` flag deprecated in v0.34+. Updated in: `18d` Library Matrix row, `18d` Packaging section, `SYNTHESIS.md` R1 and insight #7.

### Pillow (Python)

- **Old:** "CPython ≥3.9"; "Pillow ≥10.2 w/ libavif" with plugin fallback; no version number.
- **New:** Current stable **v12.1.1** (Jan 2026). Python minimum raised to 3.10 (3.8/3.9 dropped in v12). AVIF is built-in since 10.2 — `pillow-avif-plugin` is legacy only. Updated in: `18d` Library Matrix row and Python Packaging section.

### ImageMagick 7 / Wand

- **Old:** "Apache-2.0 (rebranded 2025)" with no version.
- **New:** Current **v7.1.2-19** (Apr 2026). Wand (Python binding) current: **v0.7.0** (Feb 2026). Updated in: `18d` Library Matrix row and License table.

### @squoosh/lib / @squoosh/cli

- **Old:** Benchmark table listed `@squoosh/lib ~2.6 ops/sec` without deprecation warning. Text in `18a` §3.1 called it "unlike `@squoosh/lib`, which is Node-only and unmaintained" (partial mention only).
- **New:** Explicitly flagged as **abandoned**: Google removed CLI source from squoosh repo; package breaks on Node 18/20. Maintenance note added as a `> Updated` callout after the benchmark row in `18d`. `18a` §3.1 updated to explicitly state jSquash is the maintained successor with current versions (`@jsquash/png` v3.1.1, `@jsquash/avif` v2.1.1). SYNTHESIS insight #10 updated.
- **Assessment:** This was the clearest stale-recommendation risk in the original research.

### jSquash

- **Old:** Referenced without version numbers.
- **New:** Current versions confirmed: `@jsquash/png` v3.1.1, `@jsquash/avif` v2.1.1, `@jsquash/jpeg` v1.6.0, `@jsquash/jxl` v1.3.0. Project is active. Updated in `18a` and `SYNTHESIS.md`.

### @resvg/resvg-js

- **Old:** No version stated in `18d`, v2.6.0 only mentioned in benchmark table.
- **New:** Stable: **v2.6.2**; alpha: v2.7.0-alpha.0 (Jan 2026). Updated in `SYNTHESIS.md` R1.

### pwa-asset-generator

- **Old:** "v8.1.4, Mar 2026" — accurate but noted as if recent; no confirmation for Apr 2026.
- **New:** Confirmed still v8.1.4 as of Apr 2026; open issues filed Mar 2026 confirm active maintenance. Matrix noted as 26–30 PNGs (not fixed 26). Updated in `SYNTHESIS.md`, `18b`, `18c`.

### @capacitor/assets

- **Old:** "closely" described as current with no version.
- **New:** Current: **v3.0.5**, last published ~2 years ago. Functionally stable but Ionic's active development focus has shifted. Noted in `18b` version table callout.

### flutter_launcher_icons

- **Old:** "v0.14.4 shipped June 2025" — accurate.
- **New:** v0.14.4 confirmed as still current as of Apr 2026. No change needed beyond confirmation note in `18b`.

### BullMQ

- **Old:** No version number stated.
- **New:** Current: **v5.75.2** (Apr 2026, extremely active). Added to `18e` executive summary callout.

### FFmpeg

- **Old:** Not mentioned in 18e or other files despite animation being a pipeline use case.
- **New:** FFmpeg **v8.1** released March 2026. Noted in `18e` update callout for relevance to animated asset (APNG, animated WebP) generation paths.

### oxipng (previously missing)

- **Old:** Not mentioned in any file.
- **New:** Added as a recommended PNG post-processing step in `18d` (new "PNG Optimization Post-Processing" section) and `SYNTHESIS.md` R1. Current: **v9.1.1**. Recommended two-pass pipeline: `pngquant → oxipng --opt 4 --strip all`.
- **Assessment:** This was a gap in the original research. The task brief explicitly flagged it.

### pngquant (previously missing from 18d)

- **Old:** Not in the `18d` library matrix despite being referenced implicitly in other category research.
- **New:** Added alongside oxipng in new PNG Optimization section in `18d` and `SYNTHESIS.md` R1.

### Text Compositing / Canvas API / Skia (previously missing)

- **Old:** Not mentioned in 18d or SYNTHESIS despite being a critical path for the brand-text compositing flow described in CLAUDE.md.
- **New:** Added "Text Compositing / Canvas API" section in `18d` covering three libraries:
  - `@napi-rs/canvas` v0.1.98 (Skia, recommended — zero system deps, very active)
  - `skia-canvas` v3.0.8 (Skia, multi-threaded, GPU)
  - `node-canvas` (Cairo, system-dep heavy, not recommended for MCP servers)
  Added recommendation to SYNTHESIS R1.

### Fonttools

- **Status:** Active as of March 2026 release. No factual errors found in the original files. No changes needed.

### SYNTHESIS.md — Gaps section

- Gap #6 updated to note partial closure (MCP server implements the agent-native surface).

---

## What was verified accurate and left unchanged

- libvips vs ImageMagick benchmark ratios (7.7× speed, 16× memory) — confirmed still valid from primary source.
- `@napi-rs/image` WASM target details — no contradictory information found.
- iOS App Store alpha rejection rule — unchanged Apple policy.
- Android 108dp / 72dp safe zone specs — unchanged Google spec.
- Android 12+ SplashScreen API constraints — unchanged.
- PWA iOS splash media-query matrix requirement — unchanged.
- R2 vs S3 egress pricing comparison — pricing structure confirmed still holds (R2 = $0 egress).
- BullMQ `jobId` dedup pattern — still valid per current docs.
- `react-native-make` archived Oct 2021 — unchanged.
- resvg-js 115× speedup on paris-30k.svg — unchanged benchmark.

---

## Sources used for verification

- https://www.npmjs.com/package/sharp (v0.34.5, rc 0.35.0)
- https://sharp.pixelplumbing.com/install/ (Node ≥18.17.0 requirement)
- https://github.com/lovell/sharp/releases
- https://pypi.org/project/Pillow (v12.1.1)
- https://pillow.readthedocs.io/en/stable/releasenotes/index.html
- https://community.chocolatey.org/packages/imagemagick (v7.1.2-19)
- https://pypi.org/project/Wand (v0.7.0)
- https://github.com/oxipng/oxipng (v9.1.1)
- https://til.simonwillison.net/macos/shrinking-pngs-with-pngquant-and-oxipng
- https://github.com/GoogleChromeLabs/squoosh/issues/1365 (Node 20 breakage)
- https://github.com/jamsinclair/jSquash/releases
- https://www.npmjs.com/package/@jsquash/png (v3.1.1)
- https://www.npmjs.com/package/@resvg/resvg-js (v2.6.2 stable)
- https://github.com/thx/resvg-js/releases (v2.7.0-alpha.0)
- https://github.com/elegantapp/pwa-asset-generator/releases (v8.1.4 confirmed)
- https://www.npmjs.com/package/@capacitor/assets (v3.0.5)
- https://pub.dev/packages/flutter_launcher_icons (v0.14.4)
- https://api.docs.bullmq.io/ (v5.74.2 / 5.75.2)
- https://ffmpeg.org/ (v8.1, Mar 2026)
- https://www.npmjs.com/package/@napi-rs/canvas (v0.1.98)
- https://skia-canvas.org/releases (v3.0.8)
- https://www.pkgpulse.com/blog/node-canvas-vs-napi-rs-canvas-vs-skia-canvas-server-side-canvas-nodejs-2026
- https://pypi.org/project/fonttools (active, Mar 2026 release)
