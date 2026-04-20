---
category: 18-asset-pipeline-tools
role: category-index
title: "Asset Pipeline Tools — Category Synthesis for an appicon.co-killer OSS Pipeline"
indexer: category-indexer-18
date: 2026-04-19
status: complete
angles:
  - 18a-appicon-co-teardown-and-oss-replacement
  - 18b-framework-native-asset-generators
  - 18c-splash-screen-generators
  - 18d-image-processing-libraries
  - 18e-production-pipeline-architecture
product_recommendation:
  stack: "sharp + @capacitor/assets + custom iOS/Android emitters + BullMQ/R2/Cloudflare queue arch"
  browser_mode: "jSquash (WASM) + JSZip for zero-upload drag-drop"
  svg: "@resvg/resvg-js (deterministic, no system fonts)"
  icns_ico: "icon-gen or sharp-ico + @shockpkg/icon-encoder"
  queue: "BullMQ (self-host) or Cloudflare Queues (serverless)"
  storage_cdn: "Cloudflare R2 + Cloudflare CDN (egress-free)"
tags:
  - app-icons
  - splash-screens
  - adaptive-icons
  - sharp
  - libvips
  - capacitor-assets
  - pwa-asset-generator
  - bullmq
  - cloudflare-r2
  - prompt-hash-cache
word_count_target: 2500-3500
---

# 18 — Asset Pipeline Tools: Category Synthesis

> Goal: everything a *prompt-to-asset* skill needs to turn "an icon for my note app" into a **platform-correct, production-grade asset bundle** — matching or exceeding what `appicon.co`, `icon.kitchen`, and `pwa-asset-generator` produce today, but as an **open-source, zero-upload, agent-native pipeline** we own end-to-end.

---

## Category Executive Summary

Fifteen insights synthesized from the five angles ([18a](./18a-appicon-co-teardown-and-oss-replacement.md), [18b](./18b-framework-native-asset-generators.md), [18c](./18c-splash-screen-generators.md), [18d](./18d-image-processing-libraries.md), [18e](./18e-production-pipeline-architecture.md)):

1. **`appicon.co` is trivially reproducible.** It is a closed-source, client-side web app whose entire "value" is emitting Apple's `AppIcon.appiconset/Contents.json` manifest and Android's `mipmap-<density>/ic_launcher*.png` + `mipmap-anydpi-v26/ic_launcher.xml` — both formats are **fully specified in public Apple/Google docs**. A ~160-line `generate-iconset.ts` using `sharp` replicates the full ZIP (see [18a §4.1](./18a-appicon-co-teardown-and-oss-replacement.md)). There is nothing proprietary to reverse-engineer.

2. **One 1024×1024 RGBA PNG is the universal feed format.** Every modern framework generator (`@capacitor/assets`, Expo, `flutter_launcher_icons`, `tauri icon`, `icon-set-creator`, NativeScript, the KMP plugins) converges on a 1024² transparent PNG as input. Electron is the sole outlier, needing pre-built `.icns`/`.ico` (which `electron-icon-builder` or `tauri icon` produce from the same 1024²). This makes 1024² RGBA the **single interchange artifact** the prompt-to-asset must guarantee ([18b §Recommended Feed Format](./18b-framework-native-asset-generators.md)).

3. **Android adaptive icons are the most-violated contract.** The Android 108 dp canvas reserves its outer 18 dp for system parallax + mask clipping, meaning brand marks must live inside the inner 72 dp (≈66 %) safe zone. `appicon.co` and most AI outputs fill the whole canvas and get clipped on Pixel launchers. `@capacitor/assets` enforces separate `icon-foreground.png` + `icon-background.png`; `flutter_launcher_icons` silently skips adaptive icons if either `adaptive_icon_background` or `adaptive_icon_foreground` is missing ([18b](./18b-framework-native-asset-generators.md), referencing [Android Adaptive Icons docs](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)).

4. **Android 12+ splash is an *icon* API, not a splash-image API.** `Theme.SplashScreen` renders only `windowSplashScreenBackground` (solid color) + `windowSplashScreenAnimatedIcon` (vector drawable) + optional 200×80 dp branding image. Everything outside a 192 dp / 288 dp circular mask vanishes. Full-bleed splash PNGs — the thing AI models love to produce — are a pre-Android-12 legacy code path ([18c](./18c-splash-screen-generators.md), [Android splash docs](https://developer.android.com/develop/ui/views/launch/splash-screen)).

5. **iOS forbids alpha on the 1024 App Store marketing icon.** App Store Connect rejects PNGs with alpha channels. `flutter_launcher_icons`'s `remove_alpha_ios: true` exists for this; `@capacitor/assets` flattens onto the configured background. The enhancer must always emit an `icon-opaque.png` variant pre-flattened onto a user-picked background color ([18a §1.3](./18a-appicon-co-teardown-and-oss-replacement.md), [18b](./18b-framework-native-asset-generators.md)).

6. **PWA iOS splash is a 26-file matrix with no fallback.** Unlike Chrome Android (which auto-composes from `manifest.webmanifest`), Safari requires one `<link rel="apple-touch-startup-image">` per device × orientation × pixel-ratio. Missing a size → black/white blank. `pwa-asset-generator` (3k★, v8.1.4, active) is the de-facto tool — it uses Puppeteer to rasterize a single SVG/HTML source into the full matrix plus the `<link>` tags ([18c](./18c-splash-screen-generators.md), [elegantapp/pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator)).

7. **`sharp` is the correct engine for the server path.** libvips (sharp's backend) is **~7.7× faster and ~16× more memory-efficient than ImageMagick 7** (0.57 s / 94 MB vs 4.4 s / 1.5 GB on a resize-crop-sharpen pipeline), and sharp's 64 ops/sec throughput is **~27× jimp's 2.4 ops/sec** on equivalent JPEG resizes. Sharp ships prebuilt libvips binaries for all major platforms — no `node-gyp`, no system installs ([18d](./18d-image-processing-libraries.md), [sharp performance](https://sharp.pixelplumbing.com/performance/), [libvips speed-and-memory wiki](https://github.com/libvips/libvips/wiki/Speed-and-memory-use)).

8. **`sharp` does not write `.ico` or `.icns`.** Icon-pack writers are a separate concern: `icon-gen` (MIT, 23.8k weekly downloads), `sharp-ico` (used by `@vite-pwa/assets-generator`), and `@shockpkg/icon-encoder` (MPL-2.0, most control over ICNS OSType tags) all compose PNG tiles from sharp into multi-resolution containers. Pillow's `Image.save("x.ico", sizes=[...])` is the native Python equivalent ([18d §Library Matrix](./18d-image-processing-libraries.md)).

9. **SVG rasterization should be a separate tool from bitmap processing.** `@resvg/resvg-js` (Rust/NAPI, MPL-2.0) is deterministic across OS, needs no system fonts, and is **115× faster than its own pre-v0.34 release** (290 ms vs 33.7 s on paris-30k.svg). Sharp's built-in librsvg path inherits LGPL constraints and system font dependencies; resvg-js produces identical output in CI and in browser-wasm ([18d](./18d-image-processing-libraries.md)).

10. **Browser-side generation preserves `appicon.co`'s "nothing uploaded" privacy property.** `jSquash` (WASM fork of Squoosh codecs) + `JSZip` + `@resvg/resvg-wasm` assemble a full iconset ZIP client-side in ~4 MB of WASM. Server path (sharp + `@capacitor/assets`) is the fallback for large SVGs, `.icns`/`.ico` emission, and the MCP/API path coding agents use ([18a §3.1–§3.2](./18a-appicon-co-teardown-and-oss-replacement.md)).

11. **`@capacitor/assets` is the closest off-the-shelf 1:1 replacement for `appicon.co` in Node.** One command (`npx capacitor-assets generate`) emits iOS `AppIcon.appiconset`, Android `mipmap-*` with adaptive XML, and PWA icons + splash. MIT. Gaps: monochrome (Android 13) icons are not first-class, and several adaptive-bg bugs were active through 2024–2025 ([18b](./18b-framework-native-asset-generators.md)).

12. **`react-native-make` is dead (archived 7 Oct 2021).** The RN CLI world has no single successor; `icon-set-creator`, community forks, Expo's prebuild flow, and running `@capacitor/assets` against RN projects all exist as workarounds. The enhancer should emit a canonical bundle + *multiple* RN snippets rather than pick a tool for the user ([18b](./18b-framework-native-asset-generators.md)).

13. **Prompt-hash caching is the single highest-leverage engineering investment.** SHA-256 over a canonicalized prompt (NFC, trimmed, sorted params, model + aspect_ratio + seed) collapses 20–40 % of consumer traffic into one model call. At 1 M assets/month × 25 % hit rate × $0.02 blended model cost = **~$5,000/mo saved** — ~5× the entire infra line. Using the hash as BullMQ `jobId` also deduplicates concurrent identical requests for free ([18e](./18e-production-pipeline-architecture.md)).

14. **Cloudflare R2 + Cloudflare CDN is a ~25× cost lever over S3 + CloudFront at scale.** 1 M assets/mo × 8 MB × 50 views ≈ 300 TB egress; on CloudFront **~$25,400/mo**, on R2+Cloudflare **$0** (egress-free). Backblaze B2 + Bunny CDN is the cheapest cold-heavy alternative. For any public-asset pipeline, egress-free storage is non-negotiable ([18e §Cost Model](./18e-production-pipeline-architecture.md)).

15. **Content-addressed storage makes workers idempotent by construction.** Workers write to `assets/<hash[0:2]>/<hash>/<variant>.<ext>`. Re-execution after a crash overwrites identical bytes, so `at-least-once` queues become effectively `exactly-once` at the storage layer. Combined with `Idempotency-Key` headers (Stripe-style) and HMAC-signed webhooks (`X-Signature` + `X-Timestamp`, 5-minute replay window), this delivers the reliability budget the rest of the pipeline needs ([18e](./18e-production-pipeline-architecture.md)).

---

## Map of the Angles

| Angle | Focus | Scope | Primary Artifact |
|---|---|---|---|
| [18a](./18a-appicon-co-teardown-and-oss-replacement.md) | `appicon.co` teardown + direct OSS replacement | What the site emits (legacy iOS `Contents.json`, Android adaptive XML, iTunesArtwork, PWA icons); license posture; ~160 LOC sharp reproduction | Reference implementation — `generate-iconset.ts` |
| [18b](./18b-framework-native-asset-generators.md) | Framework-integrated generators | `@capacitor/assets`, Expo, `flutter_launcher_icons`, `icon-set-creator`, `tauri icon`, Electron Forge + `electron-icon-builder`, NativeScript CLI, KMP Gradle plugins | Universal "feed" spec: 4-file bundle + `metadata.json` |
| [18c](./18c-splash-screen-generators.md) | Splash/launch screens across platforms | Android 12+ `Theme.SplashScreen` (circular mask), iOS `LaunchScreen.storyboard` + `UILaunchScreen`, PWA Chrome auto-splash, PWA iOS `apple-touch-startup-image` matrix, dark/light patterns | `pwa-asset-generator` deep dive + prompt templates |
| [18d](./18d-image-processing-libraries.md) | Embeddable image libraries | sharp / libvips, `@napi-rs/image`, jimp, Pillow / Pillow-SIMD / pyvips, ImageMagick, resvg, rust `image`, Go `bimg` + `disintegration/imaging`, icon-gen, sharp-ico | Benchmarks + license decision matrix + recommended stack per runtime |
| [18e](./18e-production-pipeline-architecture.md) | Production pipeline architecture | Queue substrate (BullMQ / Cloudflare Queues / SQS / Inngest / Temporal), storage (R2 / S3 / B2 / Bunny), CDN, prompt-hash cache, idempotency keys, webhooks, DLQ, observability, cost model | Concrete BullMQ + R2 skeleton, cost tables at 10k and 1M assets/mo |

The angles compose cleanly: 18a = *what* to emit; 18b = *what downstream tools expect*; 18c = *splash contracts*; 18d = *library to compose with*; 18e = *how to run it at scale*.

---

## Cross-Cutting Patterns

Five patterns surface in at least three of the five angles:

### 1. The "square 1024² RGBA, subject inside 66 % safe zone" invariant

Every angle that touches an emitter converges on the same source contract: a 1024×1024 PNG with alpha, subject centered inside ~66 % of the frame. 18a (Apple/Android specs), 18b (Capacitor/Expo/Flutter/Tauri all want this), 18c (Android 12 splash circular mask ≈ 66 %), and 18d (bitmap libraries resample best from at least this size). An enhancer that doesn't produce this artifact will generate downstream errors in all three surfaces.

### 2. Emit once, fan out deterministically

The economically rational architecture is to call the expensive model *once* and fan out to every variant via deterministic CPU work. 18a and 18b endorse a pre-fanout master (`icon.png`, `icon-foreground.png`, `icon-monochrome.png`, `splash-icon.png`); 18c uses one `pwa-asset-generator` run to emit the full PWA matrix from one SVG; 18d recommends `resvg-js → sharp → icon-gen` as a single pipeline; 18e caches the fan-out result by `prompt_hash`.

### 3. Prebuilt native binaries OK; system installs not OK

Sharp, `@resvg/resvg-js`, `@napi-rs/image`, Pillow all ship prebuilts for every mainstream target. The consistent failure mode avoided is *system-installed* deps (libvips on Windows, Ghostscript, libheif for HEIC). For a Claude Skill / MCP server / Codex tool that must run on arbitrary user hardware, "prebuilt `.node` or wheel" is OK; "run `brew install vips` first" is not ([18d](./18d-image-processing-libraries.md)).

### 4. Dual-source dark mode is the path of least pain

Ship a `light.png` and a `dark.png` source and let the tool fan out paired variants — endorsed by 18b (Expo `dark`), 18c (`@capacitor/assets --splashBackgroundColorDark`, bootsplash), and 18e (content-addressed storage caches both under one logical `hash`). Algorithmically derived dark variants *almost never* produce acceptable contrast.

### 5. Permissive licensing across the whole stack

The recommended pipeline (sharp Apache-2.0, `@resvg/resvg-js` MPL-2.0, `icon-gen` MIT, `@capacitor/assets` MIT, `pwa-asset-generator` MIT, jSquash MIT, JSZip MIT) carries zero copyleft risk provided libvips/librsvg are dynamically linked (sharp's default). Avoid *statically* linking libvips/librsvg — that would make the combined work LGPL ([18d](./18d-image-processing-libraries.md)).

---

## Controversies

Four places where the angles disagree or where the industry has not settled:

### A. Browser vs server for generation

[18a](./18a-appicon-co-teardown-and-oss-replacement.md) recommends browser-default (jSquash + JSZip, matching `appicon.co`'s privacy story). [18d](./18d-image-processing-libraries.md) / [18e](./18e-production-pipeline-architecture.md) recommend server-first because sharp is ~10× faster, SVG ingestion is more reliable headless, and agentic MCP access needs an API anyway. **Resolution:** dual-path — browser for drag-drop UI, server for API/SVG/large inputs.

### B. Framework's generator vs universal bundle

[18b](./18b-framework-native-asset-generators.md) argues for emitting the universal 4-file bundle + per-framework snippets, letting the user invoke their own tool. [18a](./18a-appicon-co-teardown-and-oss-replacement.md) argues for emitting the fully-assembled ZIP directly. **Resolution:** emit **both** — a pre-assembled `AppIcons.zip` that mirrors `appicon.co` for casual users, plus the master bundle + framework snippets for pro users, branching on `target_frameworks`.

### C. `@capacitor/assets` vs custom emitters

[18b](./18b-framework-native-asset-generators.md) recommends `@capacitor/assets` as the off-the-shelf replacement; [18a §4.1](./18a-appicon-co-teardown-and-oss-replacement.md) recommends a ~160-line custom `generate-iconset.ts`. **Resolution:** use `@capacitor/assets` as the default iOS+Android+PWA path, and write custom emitters for its gaps — legacy `Contents.json` (CI-linter friendly), iTunesArtwork (no-extension), `<monochrome>` drawable (Android 13), cross-platform `.icns` via `icnsutil`, visionOS/tvOS.

### D. Queue substrate: BullMQ vs Cloudflare Queues vs Inngest

[18e](./18e-production-pipeline-architecture.md) enumerates tradeoffs without picking. BullMQ wins on priority queues, per-vendor rate limits, flow producers; Cloudflare Queues wins on zero-ops + R2/Worker colocation; Inngest wins on durable-execution. **Resolution:** **BullMQ by default** — per-vendor rate limiting (Imagen vs gpt-image-1 vs Flux) is a day-one requirement and Cloudflare Queues has no priority.

---

## Gaps

Six places where primary sources are thin or where custom work is needed:

1. **Android 13 monochrome themed icons.** Web generators don't emit the `<monochrome>` drawable; `@capacitor/assets` has partial support; `flutter_launcher_icons` added `adaptive_icon_monochrome` in 0.14.0. Auto-derive via `sharp(foreground).greyscale().threshold(128).tint('#000')` with an override slot.
2. **iOS 18 tinted / dark appearance variants.** Apple's asset catalog now supports `appearances: [{ appearance: "luminosity", value: "dark" }]` and tinted variants; OSS coverage is partial. Requires custom emitter work.
3. **visionOS / tvOS layered images.** Apple's `AssetTypes.html` specifies these idioms; no surveyed tool emits them. Low-priority, trivial to add.
4. **Dark-mode PWA iOS splash.** `pwa-asset-generator` has no `--dark-mode` flag; two-pass run + media-query merge is the workaround — opportunity for us to do it in one pass.
5. **Realistic cache-hit-rate data.** [18e](./18e-production-pipeline-architecture.md) cites 20–40 % from adjacent ecosystems (URL shorteners, avatar generators); no direct-competitor data. Must measure + tune.
6. **Agent-native invocation surface.** No surveyed tool exposes an MCP or tool-schema API — all are CLIs or npm modules. Wrapping our pipeline behind an MCP tool is net-new work and the main differentiator vs. `appicon.co`.

---

## Actionable Recommendations for the `appicon.co`-killer OSS pipeline

Concrete directives, ordered by impact, for the stack stated in the prompt: **sharp + `@capacitor/assets` + custom iOS/Android emitters + production queue arch**.

### R1. Core engine: `sharp` + `@resvg/resvg-js` + `icon-gen` / `sharp-ico` / `@shockpkg/icon-encoder`

- **Bitmap ops:** `sharp` for all resize, composite, flatten, alpha, metadata-strip, AVIF/WebP/PNG encode ([18d §Library Matrix](./18d-image-processing-libraries.md), [sharp API](https://sharp.pixelplumbing.com/api-operation)).
- **SVG input:** `@resvg/resvg-js` (not sharp's librsvg path) for deterministic cross-OS rasterization; feed raw RGBA buffer into `sharp(buf, { raw: { width, height, channels: 4 } })`.
- **ICO / ICNS:** `icon-gen` for the common case (Windows `.ico`, macOS `.icns` with standard sizes); `@shockpkg/icon-encoder` when we need to match Xcode's exact OSType tags.
- **Concurrency:** pin `UV_THREADPOOL_SIZE` and `VIPS_CONCURRENCY` to `min(4, cores - 1)` inside workers.

### R2. Framework path: `@capacitor/assets` as the default "fan-out" tool, wrapped by custom emitters

- Invoke `npx @capacitor/assets generate` for the Capacitor/iOS/Android/PWA common path, using the user's chosen background colors. This single command covers ~85 % of the `appicon.co` surface for free ([18b](./18b-framework-native-asset-generators.md)).
- Write **custom emitters** for everything it misses:
  - iOS **legacy-format** `Contents.json` (`--modern` flag to toggle) — mirrors `appicon.co` and satisfies CI linters.
  - **iTunesArtwork / iTunesArtwork@2x** (no extension, for ad-hoc IPA distribution).
  - Android **`<monochrome>`** drawable (Android 13 themed icons) auto-derived from the foreground.
  - Android **`playstore-icon.png`** (512², required by Play Store).
  - **Cross-platform `.icns`** via `relikd/icnsutil` (avoids requiring macOS in CI).
  - **visionOS / tvOS** layered-image stubs (low priority, add in v2).
- Emit `flutter_launcher_icons` YAML, Expo `app.json` fragment, and `tauri icon` invocation snippets when the corresponding framework is detected in the user's workspace ([18b §Integration](./18b-framework-native-asset-generators.md)).

### R3. Universal bundle: one master, deterministic fan-out

Every generation run produces this canonical bundle, *before* any framework-specific fan-out:

```
bundle/
├── icon.png                 # 1024² RGBA, full artwork incl. background
├── icon-foreground.png      # 1024² RGBA, subject only on transparent canvas
│                            #   inside 676×676 safe zone (≈66%)
├── icon-background.png      # 1024² RGB solid color (or user-supplied)
├── icon-opaque.png          # 1024² RGB, flattened for App Store 1024 marketing
├── icon-monochrome.png      # 1024² RGBA silhouette (Android 13 + iOS 18 tinted)
├── splash-icon.png          # 400² RGBA, subject-only for Android 12+/Expo splash
├── splash-light.png         # 2732² RGBA light-mode splash source
├── splash-dark.png          # 2732² RGBA dark-mode splash source
└── metadata.json            # prompt, model, colors, alpha_verified, safe_zone_verified
```

Rationale: satisfies every downstream generator surveyed in [18b](./18b-framework-native-asset-generators.md), lets the cache key (see R7) address the master bundle rather than each variant, and produces *one* content-addressed artifact to store.

### R4. Splash screens: `pwa-asset-generator` + custom Android 12 / iOS emitters

- **Android 12+:** emit `values-v31/themes.xml` referencing a vector drawable (generated via `resvg-js` → SVG round-trip) + `windowSplashScreenBackground` color from `metadata.json`. Also emit the AndroidX-compat `Theme.SplashScreen.Common` parent fallback for API 23–30 ([18c §Android](./18c-splash-screen-generators.md)).
- **iOS:** emit `UILaunchScreen` dictionary for `Info.plist` (preferred over `.storyboard` for new projects per [Apple HIG](https://developer.apple.com/documentation/uikit/responding-to-the-launch-of-your-app)); populate asset-catalog color + image with `Any, Dark` appearance variants.
- **PWA:** shell out to `pwa-asset-generator` v8.1.4 for the full iOS `apple-touch-startup-image` matrix + manifest patch; dual-run for dark mode and splice media queries per [18c](./18c-splash-screen-generators.md).

### R5. Validation gate before fan-out

Every master bundle must pass a hard gate:

- `icon.png` dimensions exactly 1024×1024.
- `icon-foreground.png` tight-bbox of non-transparent pixels fits within 676×676 centered square (safe-zone verified).
- `icon-opaque.png` has no alpha channel (App Store requirement).
- Alpha quality check: no >5 % of pixels at alpha ∈ [0.05, 0.95] (catches Gemini's "checker box" transparency artifact per category [13](../13-transparent-backgrounds)).
- `splash-light.png` / `splash-dark.png` subject centered inside circle of diameter ≤ 0.66 × canvas (Android 12 mask).

Failure → regenerate with stronger prompt language or re-matte via rembg/BRIA RMBG (see category [13](../13-transparent-backgrounds) and [16](../16-background-removal-vectorization)). This is the concrete value of a research-driven enhancer: *the model never sees tool errors, only content errors it can fix by reprompting.*

### R6. Queue architecture: BullMQ + Redis, per-vendor lanes

- **BullMQ** on self-hosted Redis (or Upstash $10/mo) with separate queue names per vendor (`imagen`, `gpt-image-1`, `flux`, `recraft`) each with their own `limiter` (e.g. `{ max: 50, duration: 1000 }` for Imagen's documented rate) and `concurrency` ([18e §Queue Tradeoffs](./18e-production-pipeline-architecture.md)).
- `jobId: prompt_hash` for automatic dedup of concurrent identical prompts.
- `attempts: 3, backoff: { type: 'exponential', delay: 1000 }` for vendor retries; **never retry 4xx** (content-policy rejections), **always retry 5xx/network**.
- DLQ: BullMQ `failed` queue with `removeOnFail: { count: 50000 }` retained for inspection; subscribed by an alerting consumer + a nightly re-drive worker for transient-looking failures.

### R7. Storage + CDN: Cloudflare R2 + Cloudflare CDN, content-addressed

- **Key layout:** `assets/<hash[0:2]>/<hash>/<variant>.<ext>` where `hash = sha256(canonicalize(prompt + params))`. Content-addressed ⇒ re-execution overwrites identical bytes ⇒ workers are idempotent by construction.
- **R2:** zero egress, ~$0.015/GB-mo. At 1 M assets/mo this totals ~$120/mo new + ~$720/mo cumulative over year 1, vs ~$26,700/mo on S3+CloudFront ([18e §Cost Model](./18e-production-pipeline-architecture.md)).
- **Cloudflare CDN:** cache signed-URL responses at the edge; Workers at edge validate signatures + rate-limit per API key.
- **Signed URLs:** presigned R2 URLs with 1 h expiry; embed `prompt_hash` in the path so clients can debug cache hits directly.

### R8. Prompt-hash cache, idempotency, webhooks

- **Canonicalize → SHA-256** the `(prompt, model, aspect_ratio, seed, guidance_scale, style_preset, negative_prompt)` tuple before hashing. NFC + whitespace collapse + sorted JSON keys ([18e §Prompt-Hash Caching](./18e-production-pipeline-architecture.md)).
- **Cache lookup** in Cloudflare KV or Redis before enqueue; expected 20–40 % hit rate → ~$5 k/mo model-spend savings at 1 M/mo scale.
- **Client `Idempotency-Key` header** (Stripe-style, 24 h TTL) collapses replayed requests to the same `job_id`.
- **Webhooks** on completion with `X-Signature: sha256=hmac(secret, body)` + `X-Timestamp`; reject stale (>5 min) to kill replay attacks. Use *per-customer* secrets.

### R9. Agent-native MCP surface

Expose the pipeline as an MCP tool so Claude/Codex/Gemini skills can call it directly:

```
generate_app_icons(
  source_url | prompt,
  target_platforms: [ios, android, pwa, macos, windows, watchos, visionos],
  background_color, background_color_dark,
  target_frameworks: [capacitor, expo, flutter, tauri, electron, native],
  idempotency_key,
  webhook_url
) → { job_id, bundle_url, variants: {...}, snippets: {...} }
```

This is the main differentiator vs. `appicon.co` — they have a browser UI only; we have an agentic API that coding agents can invoke inside a chat turn (see category [19](../19-agentic-mcp-skills-architectures)).

### R10. Observability + cost ceilings

- **OpenTelemetry traces** with attributes `prompt_hash`, `model`, `cost_usd`, `cache_hit`, `attempt_count`; backend Honeycomb or SigNoz (OSS).
- **Per-customer token-bucket rate limits** via `unkeyed/unkey` in front of the API ([18e §OSS Reference Repos](./18e-production-pipeline-architecture.md)).
- **Never log raw prompts at INFO** — only `prompt_hash` + first 80 chars (PII/copyright).

---

## Primary Sources Aggregated

### Platform specifications

- Apple — [Asset Catalog Format Reference: App Icon Type](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AppIconType.html)
- Apple — [Asset Catalog Format Reference: `Contents.json`](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Contents.html)
- Apple — [Asset Catalog Types Overview (visionOS/tvOS idioms)](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/AssetTypes.html)
- Apple — [Responding to the launch of your app (`UILaunchScreen`)](https://developer.apple.com/documentation/uikit/responding-to-the-launch-of-your-app)
- Apple — [Human Interface Guidelines: App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- Android Developers — [Adaptive icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- Android Developers — [Pixel densities / mipmap buckets](https://developer.android.com/training/multiscreen/screendensities)
- Android Developers — [`AdaptiveIconDrawable` reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable)
- Android Developers — [SplashScreen API (Android 12+)](https://developer.android.com/develop/ui/views/launch/splash-screen)
- AndroidX — [`core-splashscreen` compat](https://developer.android.com/reference/androidx/core/splashscreen/SplashScreen)
- web.dev / Chrome — [Lighthouse PWA splash screen](https://developer.chrome.com/docs/lighthouse/pwa/splash-screen)

### Closed-source targets of the teardown

- [appicon.co](https://www.appicon.co) · [appiconmaker.co ToS](https://appiconmaker.co/terms-of-service) · [Privacy Policy](https://appiconmaker.co/privacy-policy)
- `icon.kitchen` (Google, closed-source)

### OSS generators

- Ionic — [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) · [Capacitor splash+icons guide](https://capacitorjs.com/docs/guides/splash-screens-and-icons)
- Flutter Community — [`flutter_launcher_icons`](https://pub.dev/packages/flutter_launcher_icons) · [GitHub](https://github.com/fluttercommunity/flutter_launcher_icons)
- Expo — [Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/) · [`expo-splash-screen`](https://www.npmjs.com/package/expo-splash-screen)
- elegantapp — [`pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator) · [v8.1.4 release](https://github.com/elegantapp/pwa-asset-generator/releases/tag/v8.1.4)
- [`@vite-pwa/assets-generator`](https://vite-pwa-org.netlify.app/assets-generator/)
- Tauri — [App Icons guide (v2)](https://v2.tauri.app/develop/icons) · [PR #12204 default 64×64](https://github.com/tauri-apps/tauri/pull/12204)
- Electron Forge — [Custom App Icons](https://www.electronforge.io/guides/create-and-add-icons) · [`electron-icon-builder`](https://www.npmjs.com/package/electron-icon-builder)
- NativeScript CLI — [`ns resources generate icons`](https://github.com/NativeScript/nativescript-cli/blob/master/docs/man_pages/project/configuration/resources/resources-generate-icons.md)
- [`react-native-bootsplash`](https://github.com/zoontek/react-native-bootsplash) · [`react-native-make` (archived)](https://github.com/bamlab/react-native-make) · [`icon-set-creator`](https://www.npmjs.com/package/icon-set-creator)
- KMP — [`qamarelsafadi/KMPAppIconGeneratorPlugin`](https://github.com/qamarelsafadi/KMPAppIconGeneratorPlugin) · [`ansgrb/iconsync`](https://github.com/ansgrb/iconsync)
- `appicon.co`-style OSS clones: [`xcodeBn/app-icon-formatter`](https://github.com/xcodeBn/app-icon-formatter) · [`zhangyu1818/appicon-forge`](https://github.com/zhangyu1818/appicon-forge) · [`Nonchalant/AppIcon`](https://github.com/Nonchalant/AppIcon)
- ICNS cross-platform: [`relikd/icnsutil`](https://github.com/relikd/icnsutil)

### Image processing libraries

- [sharp — docs + install](https://sharp.pixelplumbing.com/install/) · [Performance](https://sharp.pixelplumbing.com/performance/) · [API](https://sharp.pixelplumbing.com/api-operation) · [GitHub](https://github.com/lovell/sharp)
- [libvips — Speed and Memory Use wiki](https://github.com/libvips/libvips/wiki/Speed-and-memory-use) · [`vips-bench`](https://github.com/libvips/vips-bench)
- [`@napi-rs/image`](https://image.napi.rs/)
- [jimp](https://jimp-dev.github.io/jimp) · benchmarks: [pkgpulse sharp-vs-jimp-2026](https://www.pkgpulse.com/blog/sharp-vs-jimp-2026)
- [Pillow](https://python-pillow.github.io/) · [Pillow-perf](https://python-pillow.github.io/pillow-perf/) · [pyvips](https://github.com/libvips/pyvips)
- [`@resvg/resvg-js`](https://www.npmjs.com/package/@resvg/resvg-js) · [CHANGELOG (115× speedup)](https://github.com/yisibl/resvg-js/blob/main/CHANGELOG.md)
- [rust `image` crate](https://github.com/image-rs/image) · [`disintegration/imaging`](https://github.com/disintegration/imaging) · [`h2non/bimg`](https://github.com/h2non/bimg/)
- [`icon-gen`](https://www.npmjs.com/package/icon-gen) · [`sharp-ico`](https://github.com/ssnangua/sharp-ico) · [`@shockpkg/icon-encoder`](https://www.npmjs.com/package/@shockpkg/icon-encoder)
- Browser: [`jamsinclair/jSquash`](https://github.com/jamsinclair/jSquash) · [JSZip](https://stuk.github.io/jszip/)

### Production pipeline

- [BullMQ docs](https://docs.bullmq.io/) · [patterns/idempotent-jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/) · [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [AWS S3 pricing](https://aws.amazon.com/s3/pricing/) · [SQS DLQs](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html) · [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Backblaze B2 pricing](https://www.backblaze.com/b2/cloud-storage-pricing.html) · [Bandwidth Alliance](https://www.cloudflare.com/bandwidth-alliance/) · [Bunny CDN pricing](https://bunny.net/pricing/)
- [Google Cloud Tasks](https://cloud.google.com/tasks/docs) · [Inngest docs](https://www.inngest.com/docs) · [Temporal docs](https://docs.temporal.io/)
- [Stripe idempotency](https://stripe.com/docs/api/idempotent_requests) · [Stripe webhook best practices](https://stripe.com/docs/webhooks/best-practices) · [Replicate webhooks](https://replicate.com/docs/reference/webhooks) · [fal.ai queue API](https://fal.ai/docs/model-endpoints/queue)
- [OpenTelemetry spec](https://opentelemetry.io/docs/specs/otel/)
- Reference implementations: [`replicate/cog`](https://github.com/replicate/cog) · [`BennyKok/comfyui-deploy`](https://github.com/BennyKok/comfyui-deploy) · [`expo/eas-build`](https://github.com/expo/eas-build) · [`langgenius/dify`](https://github.com/langgenius/dify) · [`unkeyed/unkey`](https://github.com/unkeyed/unkey) · [`cloudflare/workers-sdk` templates/queues](https://github.com/cloudflare/workers-sdk/tree/main/templates)

---

*Composed 2026-04-19 from five angles (~152 KB). Feeds master `docs/research/SYNTHESIS.md` and the prompt-to-asset's `app_icon`/`splash_screen` skill intents + MCP surface.*
