---
slug: future
date: 2026-04-21
angles_indexed:
  - asset-19-stock-photo-apis.md
  - asset-20-illustration-sets.md
  - asset-21-3d-assets-mockups.md
  - asset-22-patterns-gradients.md
  - asset-28-visual-diff-testing.md
  - asset-29-perceptual-hashing.md
  - asset-42-svg-motion-animation-libs.md
  - asset-43-lottie-rive-ecosystem.md
  - asset-44-open-audio-sfx.md
  - asset-45-cc0-pd-aggregators.md
  - asset-46-image-moderation-oss.md
  - asset-48-mockup-libraries.md
---

> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Category "future" — Out-of-Scope Tracks: Synthesis

## Category Executive Summary

1. **Every "future" track is a content-routing + metadata problem sitting on top of the same matte/vectorize/validate pipeline the core product already owns.** Stock-photo integration (`asset-19` §Recommendation), illustration-set ingestion (`asset-20` §Recommendation), CC0 aggregator federation (`asset-45` §Proposed abstraction layer), and mockup composition (`asset-48` §Composition engines) all resolve to: discover asset → attach license metadata → composite into the bundle via `sharp` or the existing vectorizer. None of them require a new generator; they require a source registry and a license normalizer.

2. **Licensing is the binding constraint, not the technology.** Eight of the twelve tracks (`19, 20, 43, 44, 45, 46, 48`, and partly `42`) explicitly warn that the *most tempting* source in each category is the one that is legally unsafe to bundle — Unsplash's mandatory hotlink + attribution + anti-AI drift (`asset-19` §Unsplash), Storyset / Absurd Design / DrawKit attribution traps (`asset-20` §Per-library breakdown), LottieFiles Simple License's no-"competing service" clause (`asset-43` §5), Apple / Meta device bezels (`asset-48` §1c), NudeNet's AGPL-3.0 + Ultralytics dual-license (`asset-46` §Candidate matrix). A unified `LicenseCode` enum plus per-asset SPDX sidecar is the first thing that needs to land before any of these tracks become tractable (`asset-45` §Proposed abstraction layer).

3. **CC0 coverage is deep for images, thin for audio and video, almost nonexistent for modern device bezels.** Openverse + Met + Smithsonian + Rijksmuseum + Cleveland + NGA + NASA span ~600M images under first-class `license_type=public` filters (`asset-45` §Sources). Audio drops to Pixabay + Freesound's CC0 subset (`asset-44` §TL;DR). Video is NASA plus Internet Archive `licenseurl:*publicdomain*zero*` queries (`asset-45` §Executive summary). Modern device bezels (2023+ iPhone / Galaxy / Pixel) have **no** CC0 library — the defensible path is `dimmmensions` geometry + hand-drawn generic frames (`asset-48` §1d).

4. **`sharp` + small custom probes beats every "checkerboard detection" library because none exists.** `asset-28` §3 documents that no OSS package ships a fake-transparency detector. The three-probe composition (alpha-mass, periodic-pattern palette check with `#FFFFFF`/`#CCCCCC` parity test, FFT spike at `(w/8, w/8)`) is ~40 lines on top of `sharp` and already implicitly required by the Tier-0 validator's `T0_CHECKERBOARD` code. This is not research — it is code the core product should be running today.

5. **Perceptual hashing needs a two-tier index; single-hash stacks fail on flat brand imagery.** `asset-29` §3 documents the empirical consensus: pHash / dHash are near-useless on large solid-color regions because DCT coefficients beyond the DC term are near zero, and tiny padding changes flip the hash. The published multi-stage pipeline (`0.7·DINO + 0.2·CLIP + 0.1·Fourier` from Ghafadaryan) combines pHash for exact-re-encode dedup, DINOv2 cosine for near-dup recall, and Fourier descriptors on vectorized outlines for traced-copy detection.

6. **GPL and AGPL contamination is the recurring trap in "free" visual-asset tooling.** `libphash` / `phashion` are GPLv3 (`asset-29` §1.1 / §1.9). NudeNet + Ultralytics YOLOv8 are AGPL-3.0 (`asset-46`). `device-frames-core` on PyPI is AGPL-3.0 (`asset-48` §1b). `audiowaveform` is GPL-3.0 and must be invoked as a subprocess (`asset-44` §OSS audio processing tools). Blender's `mockup-screenshoter` add-on is GPL and can't be embedded in a non-GPL product (`asset-48` §3D). Every `future` track needs an explicit license-allowlist gate before ingestion.

7. **Authoring-format ecosystems diverge sharply on OSS authoring tools.** Lottie has a real OSS authoring path — Synfig Studio (GPL) with a built-in Lottie Exporter since v1.4.0 (`asset-42` §Lottie). Rive does not — the editor is closed-source SaaS with no OSS alternative that emits `.riv` (`asset-42` §Rive, `asset-43` §1). This asymmetry forces prompt-to-asset toward Lottie as the target motion format and restricts Rive to "consume pre-authored files only."

8. **Server-side motion rendering is a narrow, single-maintainer dependency.** `ed-asriyan/lottie-converter` (Docker) and `puppeteer-lottie` (headless Chrome + lottie-web) are the only two viable paths for Lottie → GIF/MP4/APNG (`asset-42` §Server export, `asset-43` §4). `lottie-node` is archived and redirects to `puppeteer-lottie`. Both live projects are single-maintainer; vendoring or a Skottie / `canvaskit-wasm` fallback is prudent before depending on them in a shipped pipeline (`asset-43` §6).

9. **Mockup composition is a "code MIT, bezel imagery trademark-poisoned" split.** `html5-device-mockups`, `mockupgen`, `Android Asset Studio`, `rive-runtime`, `browser-window`, `dimmmensions` all carry MIT/Apache code, but every library that ships photorealistic Apple / Samsung / Google bezels inherits Apple Developer Agreement or Meta Design License constraints on the imagery separately (`asset-48` §TL;DR safety matrix). The composable primitive — sharp for flat composites, `perspective.js` or raw OpenCV `warpPerspective` for angled screens, three.js + CC0 GLB for 3D — is legally clean. The art is not.

10. **NSFW moderation on flat brand output is a false-positive nightmare.** `nsfwjs` intentionally biases toward FP and hits 90%+ `hentai` on black-ink illustrations and manga (`asset-46` §Why CLIP safety-checker is a trap, issue #588). `stable-diffusion-safety-checker` FPs on "star", swimsuits, and fp16 green frames. LAION-SAFETY has 6× context-shift evasion. The only defensible OSS pick is Falconsai's ViT (Apache-2.0, 87 MB ONNX, two-band thresholds at 0.85 hard / 0.50 warn), and it still needs calibration against a ~500-asset held-out eval set before thresholds can lock (`asset-46` §Calibration plan). This is deferred-to-hosted-tier for good reason.

11. **Pattern / gradient generation is cleanly solvable inside the existing inline_svg mode.** `asset-22` §4 shows every pattern style prompt-to-asset would ever need — stripes, dots, halftone, grid, stacked waves, low-poly/Voronoi — fits in <200 LOC each, deterministic with a `seed` parameter, and emits under the 40-path budget already enforced by `svg-authoring`. The only external dep worth pulling is `svg-patterns` (ISC, 19 KB) or `delaunator` (MIT, tiny). Third-party generator sites (Haikei, BGJar, MagicPattern, Shapes.so) should stay as *designer-time* tools whose output lands frozen in the repo, never runtime dependencies (`asset-22` §Recommendation at a glance).

12. **3D mockups are a separate product, but a curated CC0 starter bundle is cheap.** `asset-21` §Concrete Starter Bundle estimates ~20 Poly Haven HDRIs + ~40 ambientCG materials + Kenney + Quaternius + 3dicons at "low single-digit GB" — all CC0, all with public REST APIs (Poly Haven, ambientCG) or bulk downloads (others). The rendering toolchain (Blender headless + gltf-pipeline + three.js / drei) is fully OSS. The scope gap between "ship a curated bundle" and "build a 3D asset generator" is wide; stopping at the bundle defers the expensive half.

## Tracks Surveyed

| # | Track | File | Why deferred | Cost of adding later | Value if added |
|---|---|---|---|---|---|
| 19 | Stock-photo APIs | `asset-19-stock-photo-apis.md` | Discovery, not generation; orthogonal to the core pipeline | Low — single adapter module per provider with unified result schema | Medium — enables IP-Adapter style refs + OG/hero backgrounds |
| 20 | Illustration sets | `asset-20-illustration-sets.md` | "Pick from existing" is a sibling tool; license traps dense | Low-medium — CC0 subset (Open Peeps, Open Doodles, Humaaans) is trivial; avoiding Storyset/Absurd/DrawKit requires vigilance | High — brand character systems are a common user ask, CC0 coverage is excellent |
| 21 | 3D assets + mockups | `asset-21-3d-assets-mockups.md` | Separate product; Blender + three.js toolchain is heavy | High — curated bundle is cheap (low-GB); rendering pipeline is engineering-dense | High for marketing/hero renders; medium for app-icon mockups |
| 22 | Patterns + gradients | `asset-22-patterns-gradients.md` | Nice-to-have for backgrounds; not blocking any asset type | Low — fits under existing inline_svg mode, <200 LOC per generator | Medium — OG backgrounds, brand wallpapers, hero decoration |
| 28 | Visual-diff / screenshot testing | `asset-28-visual-diff-testing.md` | Regression testing needs a brand history to compare against | Low — `pixelmatch` + `sharp` stack, zero heavy deps | High at v2 — gates regressions on brand-asset updates in CI |
| 29 | Perceptual hashing | `asset-29-perceptual-hashing.md` | Dedup / "already generated this" cache needs asset history | Low-medium — `sharp-phash` + pgvector; DINOv2 adds a model dep | High — dedup + brand-collision detection is a core SaaS feature |
| 42 | SVG/motion animation libs | `asset-42-svg-motion-animation-libs.md` | Motion graphics are a separate asset class | Medium — Lottie JSON emit + `puppeteer-lottie` / `lottie-converter` | Medium — animated favicons, logo reveals, reel stings |
| 43 | Lottie + Rive ecosystem | `asset-43-lottie-rive-ecosystem.md` | Consumption-side; requires authoring UX we don't have | Medium — runtime bundling is legally clean; asset libraries have licensing footguns | Medium-high — multi-platform (iOS/Android/web) motion is a differentiator |
| 44 | Open audio + SFX | `asset-44-open-audio-sfx.md` | Not an image asset; different skill surface | Medium — ffmpeg LGPL build + Pixabay/Freesound ingestion | Low-medium — useful only for "brand reel/sting" pipeline if/when built |
| 45 | CC0 / PD aggregators | `asset-45-cc0-pd-aggregators.md` | Sibling to `asset-19`; covered once stock-photo lands | Low — Openverse + Met + NASA are zero-auth, registration-free | High — widest legally-clean corpus at zero cost |
| 46 | Image moderation OSS | `asset-46-image-moderation-oss.md` | Matters for hosted SaaS, not zero-key local CLI | High — needs calibration set + FP-rate validation per asset class | High at hosted tier — regulatory + trust-and-safety blocker |
| 48 | Mockup libraries | `asset-48-mockup-libraries.md` | Device/paper/billboard mockups are a separate skill | Medium — engine stack is MIT (sharp / perspective.js / three.js); bezel imagery is trademark-poisoned | Medium-high — "logo on a MacBook" is a common marketing-site ask |

## Cross-Cutting Patterns

### FP1 — Every track terminates in the existing matte → vectorize → validate pipeline (`19, 20, 21, 22, 48`)
Stock photos become IP-Adapter refs (`asset-19` §1), illustration sets get recolored via `currentColor` / `fill` find-replace (`asset-20` §Per-library breakdown, repeatedly), 3D renders are PNG exports from Blender / three.js that need matte + safe-zone validation exactly like diffusion output (`asset-21` §4), pattern SVGs slot into the same inline_svg author flow (`asset-22` §Recipe), mockups are `sharp.composite()` + perspective warp (`asset-48` §Composition engines). None of these require a new validator or a new exporter. The core plugin already owns the terminal pipeline; these tracks own the *source*.

### FP2 — "Licensing is the first-class feature" (`19, 20, 43, 44, 45, 46, 48`)
Every track surfaces an `AttributionText` / `LicenseCode` requirement. `asset-45` §Proposed abstraction layer proposes the canonical enum (`cc0, pdm, us-gov, by, by-sa, by-nc, by-nd, by-nc-sa, by-nc-nd, permissive-stock`). `asset-43` §5 proposes a `LICENSES/` + `NOTICE.md` + `ATTRIBUTIONS.md` sidecar shape. `asset-44` §Recommended default stack requires SPDX-tagging every audio asset. `asset-20` flags eight libraries with attribution traps that look free. A `LicenseNormalizer` + SPDX-aware bundle exporter is a prerequisite for all of these, not a per-track effort.

### FP3 — "Paid / SaaS generator + free tool-output bake-in" is the dominant third-party pattern (`20, 22, 42, 43, 48`)
Haikei / MagicPattern / BGJar / Shapes.so (patterns), Lottielab / LottieFiles Creator (motion), Shots.so / BrowserFrame.com / Pixeltrue (mockups), Blush / Storyset / DrawKit (illustrations) all share the same posture: the *tool* is free-with-permission and the *output* is usable, but redistribution / gallery-building / API scraping is forbidden. Prompt-to-asset's correct stance across these is identical: **treat third-party generator outputs as one-off assets that land frozen in the repo, never as live runtime dependencies** (`asset-22` §Recommendation, corroborated in `asset-48` §1c).

### FP4 — Node / Python asymmetry recurs (`28, 29, 43, 44, 46`)
Visual-diff (`pixelmatch`, `odiff`, `ssim.js`) and pHash (`sharp-phash`, `blockhash-core`, `imghash`) have mature Node stories. NSFW classification (`Falconsai` / `jaranohaal` via `onnxruntime-node` + `optimum` export), perceptual embeddings (DINOv2/CLIP via `@xenova/transformers`), and server-side Lottie (`puppeteer-lottie` + `gifski` + `ffmpeg`) are Node-viable but less mature than their Python equivalents (`imagededup`, `open_clip_torch`, Skottie via Python). Python-worker offload is the escape hatch; the `future` tracks should plan for that boundary rather than forcing Node-only.

### FP5 — "The top-downloaded library is often not the right pick" (`29, 42, 46`)
`nsfwjs` dominates by weekly downloads but is catastrophically FP-prone on flat art (`asset-46`); Falconsai's ViT is the defensible pick. `framer-motion` dominates React animation but was superseded by `motion` in Dec 2024 (`asset-42` §motion). `phashion` is the best-known pHash Ruby gem but is GPLv3 via `libphash`; `dhash-vips` is the MIT-compatible replacement (`asset-29` §1.9). Every `future` track's recommendation explicitly inverts popularity → licensing / FP-rate / maintenance rankings.

### FP6 — "Deterministic seed + cache key" is the correct render-time interface (`22, 28, 29`)
`asset-22` §Recipe mandates seed + full-querystring caching on pattern generators. `asset-28` §3 relies on FFT spike detection at fixed `(w/8, w/8)` frequencies — deterministic input = deterministic signature. `asset-29` §4.3 builds its cache hierarchy on `SHA-256 → pHash(Hamming ≤ 5) → dHash(Hamming ≤ 5)` as a BK-tree / bit-sliced index. All three converge on the same design: byte-identical output for identical inputs, content-addressed by hash, cached at CDN / filesystem / vector-index tier.

## Prioritization

| # | Track | Priority (1–10) | Rationale |
|---|---|---|---|
| 28 | Visual-diff testing | **8** | `pixelmatch` + `sharp` is already half-implemented in Tier-0 validation; pulling forward plugs the `T0_CHECKERBOARD` gap with 40 LOC of FFT probe |
| 29 | Perceptual hashing | **8** | Dedup + "already generated this" cache is a cost-and-UX multiplier; `sharp-phash` slot-in is days, not weeks |
| 22 | Patterns + gradients | **7** | Fits cleanly under existing `inline_svg` mode; extends OG-image and hero backgrounds without new infrastructure |
| 20 | Illustration sets (CC0 subset only) | **7** | Open Peeps + Open Doodles + Humaaans are a drop-in for empty-state / onboarding illustrations; brand character system is a common ask |
| 45 | CC0 / PD aggregators | **6** | Openverse + Met + NASA are zero-auth; enables "real photo reference" without paid keys; shares license-normalizer work with 19 |
| 19 | Stock-photo APIs | **5** | Pexels + Pixabay adapter is small; primarily benefits OG/hero backgrounds that `asset-22` already covers procedurally |
| 48 | Mockup libraries (engine only) | **5** | `sharp` composite + `perspective.js` is valuable; bezel imagery is a product-design question not a research one |
| 42 | SVG motion / animation libs | **4** | Animated favicons are a nice-to-have; Lottie JSON programmatic emit is tractable but orthogonal to v1 asset types |
| 43 | Lottie + Rive ecosystem | **4** | Follows 42; consumption-side runtimes are legally clean; asset libraries need license-gating work first |
| 46 | Image moderation OSS | **3** | Only matters when going hosted-SaaS; Falconsai calibration requires a 500-asset held-out set we don't yet have |
| 21 | 3D assets + mockups | **3** | Pipeline is heavy; "3D logo plate" is niche; Blender headless + three.js is a separate product |
| 44 | Open audio + SFX | **2** | Not an image asset; only relevant if brand-reel/sting pipeline is ever built |

## Dependencies on Current Stack

Before any `future` track becomes tractable, the core product must land:

1. **SPDX-aware license metadata on every ingested asset.** `AssetBundle` needs `license: LicenseCode`, `licenseUrl`, `attributionText` fields; `brand.json` needs a `licenses/` directory writer. Unblocks 19, 20, 43, 44, 45, 48.
2. **`asset_ingest_external` already runs matte + vectorize + validate; generalize its input to accept "ingested CC0 / stock / illustration" alongside diffusion output.** Unblocks 19, 20, 21, 45.
3. **Tier-0 validator needs to grow the `fakeTransparency` probe described in `asset-28` §3.** Not a future track — a current bug. Blocks 28's full CI story and closes `T0_CHECKERBOARD` gap.
4. **Content-addressed cache keyed on SHA-256 of canonical bytes.** Precondition for 28, 29, and deterministic pattern generation (22).
5. **Python worker boundary with ONNX Runtime.** Unblocks DINOv2 embeddings (29), Falconsai NSFW (46), `imagededup` CNN tier (29). Node-only options exist but are weaker (see FP4).
6. **Postgres / pgvector (or LanceDB) for vector search.** Precondition for 29's semantic tier and any brand-collision detection.
7. **SVG-authoring budget needs a `<pattern>` primitive slot.** Precondition for 22 — current `svg-authoring` skill enforces a 40-path budget; `<pattern>` tiles need to count as one path, not per-child.
8. **`sharp.composite()` + perspective-warp adapter.** Unblocks 48's flat + angled mockup engine. Zero new heavy deps.
9. **Bundle exporter needs a `NOTICE.md` + `LICENSES/` writer.** Required by 43 §5, 44 §Bundle manifest, 20 (CC-BY subset).
10. **Lottie JSON schema validator if we want to emit deterministic motion.** Precondition for 42's programmatic-Lottie path; not required for consumption-only (43).

## Actionable Recommendations for the prompt-to-asset Plugin

1. **Pull the fake-transparency probe forward from `asset-28` §3 into the current Tier-0 validator this quarter.** It is 40 LOC on top of existing `sharp` I/O, closes `T0_CHECKERBOARD` against real failure modes, and is the only "future" research that addresses a bug the core product already has. Not a future track — a missing current check.

2. **Prototype the perceptual-dedup tier from `asset-29` §4.3 behind a feature flag.** Minimum viable: `SHA-256 → sharp-phash Hamming ≤ 5 → dHash Hamming ≤ 5`, stored in Postgres with `pg_bktree` or a bit-sliced index. Defer the DINOv2 semantic tier until asset-history volume justifies the model dep. This is a cost multiplier and a UX unlock ("we already made this").

3. **Extend the `svg-authoring` skill with seeded pattern primitives from `asset-22` §4 (stripes, dots, grid, stacked waves, `feTurbulence` noise).** Each is <100 LOC, deterministic on `seed`, byte-identical for cache hits. Slots under existing `inline_svg` mode without new deps. Unlocks OG-image backgrounds and brand wallpapers natively.

4. **Land the `LicenseCode` enum + `AssetBundle.license` field + `NOTICE.md` writer described in `asset-45` §Proposed abstraction layer before any source-ingestion track.** This is the single prerequisite that unblocks 19, 20, 43, 44, 45, 48. Design it once, use it across.

5. **Ship a CC0-only illustration ingestion adapter (Open Peeps + Open Doodles + Humaaans from `asset-20` §Recommendation) as the first "pick-from-existing" integration.** These three are CC0, SVG, recolorable via `currentColor` swap, and have no attribution burden. Skip Storyset / Absurd / DrawKit / Blush raw assets entirely for bundled use.

6. **For stock photos (`asset-19`), start with Pexels + Pixabay. Skip Unsplash until the user explicitly opts in.** Unsplash's mandatory hotlink + download-tracking + anti-AI license drift is disproportionate operational cost for the default path. Openverse as a tertiary "CC-licensed broader" toggle once 45 lands.

7. **Defer audio (`asset-44`) indefinitely unless a reel/sting pipeline is on the roadmap.** Not an image asset. The skill surface is different. Research is preserved; activation is scope creep.

8. **Defer NSFW moderation (`asset-46`) to the hosted SaaS tier; ship the zero-key CLI without it.** The FP rate on flat brand output is a product-experience bug in local mode. When hosted lands, start with Falconsai ViT ONNX + the two-band threshold from `asset-46` §Recommendation, and commit to the 500-asset calibration plan before locking.

9. **For mockups (`asset-48`), ship the engine (MIT `sharp` + `perspective.js` + three.js + `dimmmensions`) without any photorealistic bezels.** Draw generic device-inspired frames from `dimmmensions` geometry. This is the only trademark-defensible posture and it scales with the rest of the `inline_svg` flow.

10. **For motion (`asset-42` / `asset-43`), target Lottie JSON as the distribution format.** Programmatic emission from a template is cleaner than authoring; Synfig Studio (GPL, CLI-boundaried) is the fallback authoring path. Use `puppeteer-lottie` for PNG/GIF/MP4 export with `canvaskit-wasm` + Skottie as a throughput fallback. Do not adopt Rive until the editor ships an OSS alternative.

11. **Defer 3D (`asset-21`) unless a marketing-hero asset type is added.** If it is: ship the curated bundle (Poly Haven HDRIs + ambientCG + Kenney + Quaternius + 3dicons) locally — CC0, low-single-digit-GB, cache-friendly — and keep Blender headless behind a feature flag for the "hero render" path while three.js + drei handles the live preview.

12. **Standardize on deterministic `(input_bytes, options) → SHA-256` caching across pattern generation (22), Tier-0 validation (28), and perceptual hashing (29).** Same cache key, same storage layer, three free benefits. Don't build three parallel caching systems.

## Primary Sources Aggregated

### Stock photo / CC0 / public-domain aggregator APIs
- Unsplash API docs — https://unsplash.com/documentation (asset-19)
- Pexels API docs — https://www.pexels.com/api/documentation/ (asset-19)
- Pixabay API docs — https://pixabay.com/api/docs/ (asset-19, asset-44)
- Openverse API reference — https://docs.openverse.org/api/reference/ (asset-19, asset-45)
- Openverse OpenAPI — https://api.openverse.org/ (asset-19)
- `@openverse/api-client` npm — https://www.npmjs.com/package/@openverse/api-client (asset-19)
- `unsplash-js` npm — https://www.npmjs.com/package/unsplash-js (asset-19)
- Wikimedia Commons Action API — https://commons.wikimedia.org/w/api.php (asset-19, asset-45)
- Met Open Access API — https://metmuseum.github.io/ (asset-45)
- Smithsonian Open Access API — https://edan.si.edu/openaccess/apidocs/ (asset-45)
- Europeana Search API — https://europeana.atlassian.net/wiki/spaces/EF/pages/2385739812/Search+API+Documentation (asset-45)
- Rijksmuseum API — https://data.rijksmuseum.nl/docs/ (asset-45)
- Cleveland Museum of Art Open Access — https://openaccess-api.clevelandart.org/ (asset-45)
- NGA open data GitHub — https://github.com/NationalGalleryOfArt/opendata (asset-45)
- NASA images API docs — https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf (asset-45)
- Library of Congress APIs — https://www.loc.gov/apis/ (asset-45)
- Internet Archive advanced search — https://archive.org/services/search/v1/scrape (asset-45)

### Illustration sets
- unDraw license — https://undraw.co/license (asset-20)
- Open Peeps — https://openpeeps.com/ (asset-20)
- Open Doodles — https://opendoodles.com/about (asset-20)
- Humaaans — https://www.humaaans.com/ (asset-20)
- Blush license + plans — https://blush.design/license, https://blush.design/plans (asset-20)
- Storyset terms — https://storyset.com/terms (asset-20)
- DrawKit license — https://drawkit.com/license (asset-20)
- Absurd Design free license — https://absurd.design/freelicense (asset-20)
- IRA Design repo — https://github.com/ira-design/ira-illustrations (asset-20)
- Pixel True license — https://www.pixeltrue.com/license (asset-20, asset-48)
- ManyPixels license — https://www.manypixels.co/gallery/license (asset-20)
- Doodle Ipsum — https://doodleipsum.com/ (asset-20)
- fffuel dddoodle — https://www.fffuel.co/dddoodle/ (asset-20)

### 3D assets + mockups
- Kenney assets — https://www.kenney.nl/assets (asset-21)
- Poly Haven API — https://polyhaven.com/our-api (asset-21)
- Quaternius packs — https://quaternius.com/packs/ (asset-21)
- Sketchfab Download API — https://sketchfab.com/developers/download-api (asset-21)
- ambientCG API v3 — https://docs.ambientcg.com/api/v3/assets/ (asset-21)
- Fab licensing — https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab (asset-21)
- CGTrader Royalty Free — https://help.cgtrader.com/hc/en-us/articles/360015124437-Royalty-Free-License (asset-21)
- 3dicons.co + GitHub — https://old.3dicons.co/, https://github.com/realvjy/3dicons (asset-21)
- Blender CLI reference — https://renderday.com/blog/mastering-the-blender-cli (asset-21)
- CesiumGS/gltf-pipeline — https://github.com/CesiumGS/gltf-pipeline (asset-21)
- glTF Transform CLI — https://gltf-transform.dev/cli.html (asset-21)
- Three.js ExtrudeGeometry — https://threejs.org/docs/pages/ExtrudeGeometry.html (asset-21)
- drei docs — https://drei.docs.pmnd.rs/ (asset-21)
- Threlte docs — https://threlte.xyz/docs/learn/getting-started/your-first-scene (asset-21)

### Patterns, gradients, SVG decoration
- Hero Patterns — https://heropatterns.com/ (asset-22)
- Pattern Monster — https://pattern.monster/features (asset-22)
- SVGBackgrounds license — https://www.svgbackgrounds.com/license (asset-22)
- Haikei — https://haikei.app/ (asset-22)
- BGJar — https://bgjar.com/ (asset-22)
- MagicPattern tools — https://www.magicpattern.design/tools (asset-22)
- uiGradients MIT — https://github.com/ghosh/uiGradients/blob/master/LICENSE.md (asset-22)
- `svg-patterns` npm — https://www.npmjs.com/package/svg-patterns (asset-22)
- textures.js — http://riccardoscalco.github.io/textures/ (asset-22)
- `@mesh-gradient/core` — https://www.npmjs.com/package/@mesh-gradient/core (asset-22)
- MDN feTurbulence — https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence (asset-22)

### Visual diff / screenshot testing
- mapbox/pixelmatch — https://github.com/mapbox/pixelmatch (asset-28)
- dmtrKovalenko/odiff — https://github.com/dmtrKovalenko/odiff (asset-28)
- Vizzly honeydiff benchmark — https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/ (asset-28)
- gemini-testing/looks-same benchmarks — https://github.com/gemini-testing/looks-same/blob/master/benchmark/results.md (asset-28)
- obartra/ssim — https://github.com/obartra/ssim (asset-28)
- garris/BackstopJS — https://github.com/garris/BackstopJS (asset-28)
- Playwright docs — https://playwright.dev/ (asset-28)
- Sharp channel API — https://sharp.pixelplumbing.com/api-channel (asset-28)
- Stack Overflow 74399905 — https://stackoverflow.com/questions/74399905 (asset-28)
- Stack Overflow 77083558 — https://stackoverflow.com/questions/77083558 (asset-28)

### Perceptual hashing
- phash.org — https://phash.org/ (asset-29)
- aetilius/pHash — https://github.com/aetilius/pHash (asset-29)
- idealo/imagededup + benchmarks — https://github.com/idealo/imagededup, https://idealo.github.io/imagededup/user_guide/benchmarks/ (asset-29)
- commonsmachinery/blockhash-js — https://github.com/commonsmachinery/blockhash-js (asset-29)
- blockhash-core npm — https://www.npmjs.com/package/blockhash-core (asset-29)
- sharp-phash npm — https://www.npmjs.com/package/sharp-phash (asset-29)
- OpenCV img_hash — https://docs.opencv.org/4.x/d4/d93/group__img__hash.html (asset-29)
- Jimp compareHashes — https://jimp-dev.github.io/jimp/api/jimp/functions/comparehashes/ (asset-29)
- phashion — https://github.com/westonplatter/phashion (asset-29)
- dhash-vips — https://github.com/Nakilon/dhash-vips (asset-29)
- Ghafadaryan logo similarity — https://dev.to/ruben_ghafadaryan/detecting-logo-similarity-combining-ai-embeddings-with-fourier-descriptors-5eoc (asset-29)
- CLIP vs DINOv2 — https://medium.com/aimonks/clip-vs-dinov2-in-image-similarity-6fa5aa7ed8c6 (asset-29)
- josephrocca/openai-clip-js — https://github.com/josephrocca/openai-clip-js (asset-29)

### Motion / animation libraries
- Webflow GSAP announcement — https://webflow.com/updates/gsap-becomes-free (asset-42)
- GSAP Standard License — https://gsap.com/licensing/ (asset-42)
- anime.js v4.0.0 — https://github.com/juliangarnier/anime/releases/tag/v4.0.0 (asset-42)
- Motion (Framer Motion merger) — https://motion.dev/blog/should-i-use-framer-motion-or-motion-one (asset-42)
- SMIL not dead — https://smashingmagazine.com/2025/05/smashing-animations-part-3-smil-not-dead (asset-42)
- caniuse SMIL — https://caniuse.com/svg-smil (asset-42)
- caniuse CSS Paint — https://caniuse.com/css-paint-api (asset-42)
- svg.js — https://github.com/svgdotjs/svg.js (asset-42)

### Lottie + Rive runtime ecosystem
- Lottie Simple License FL 9.13.21 — https://lottiefiles.com/page/license (asset-42, asset-43)
- LottieFiles Premium rules — https://help.lottiefiles.com/hc/en-us/articles/24484503354137-premium-animations (asset-43)
- dotLottie v1.0 + v2.0 specs — https://dotlottie.io/spec/1.0/, https://dotlottie.io/spec/2.0/ (asset-43)
- airbnb/lottie-web — https://github.com/airbnb/lottie-web (asset-42, asset-43)
- LottieFiles/dotlottie-web — https://github.com/LottieFiles/dotlottie-web (asset-43)
- airbnb/lottie-ios — https://github.com/airbnb/lottie-ios (asset-43)
- airbnb/lottie-android — https://github.com/airbnb/lottie-android (asset-43)
- lottie-react-native — https://github.com/lottie-react-native/lottie-react-native (asset-43)
- Skottie docs — https://skia.org/docs/user/modules/skottie/ (asset-43)
- rive-app/rive-wasm — https://github.com/rive-app/rive-wasm (asset-42, asset-43)
- rive-ios — https://github.com/rive-app/rive-ios (asset-43)
- rive-android — https://github.com/rive-app/rive-android (asset-43)
- Rive Marketplace Overview — https://rive.app/docs/community/marketplace-overview (asset-43)
- transitive-bullshit/puppeteer-lottie — https://github.com/transitive-bullshit/puppeteer-lottie (asset-42, asset-43)
- ed-asriyan/lottie-converter — https://github.com/ed-asriyan/lottie-converter (asset-42)
- Synfig Lottie export — https://synfig.readthedocs.io/en/stable/export/export_for_web_lottie.html (asset-42)
- Lottie Docs — https://lottiefiles.github.io/lottie-docs/ (asset-42)
- LottieFiles/lottie-interactivity — https://github.com/LottieFiles/lottie-interactivity (asset-43)
- friday/lottie-node (archived) — https://github.com/friday/lottie-node (asset-43)

### Open audio + SFX
- Freesound API docs — https://freesound.org/docs/api/ (asset-44)
- ffmpeg legal — https://ffmpeg.org/legal.html (asset-44)
- bbc/audiowaveform — https://github.com/bbc/audiowaveform (asset-44)
- bbc/waveform-data.js — https://github.com/bbc/waveform-data.js (asset-44)
- librosa — https://github.com/librosa/librosa (asset-44)
- Open Opus — https://openopus.org/ (asset-44)

### Image moderation OSS
- Falconsai/nsfw_image_detection — https://huggingface.co/Falconsai/nsfw_image_detection (asset-46)
- Falconsai nsfw_image_detection_26 — https://huggingface.co/Falconsai/nsfw_image_detection_26 (asset-46)
- infinitered/nsfwjs — https://github.com/infinitered/nsfwjs (asset-46)
- nsfwjs issue #588 — https://github.com/infinitered/nsfwjs/issues/588 (asset-46)
- bhky/opennsfw2 — https://github.com/bhky/opennsfw2 (asset-46)
- CompVis/stable-diffusion-safety-checker — https://huggingface.co/CompVis/stable-diffusion-safety-checker (asset-46)
- SD issue #239 (safety-checker FPs) — https://github.com/CompVis/stable-diffusion/issues/239 (asset-46)
- arxiv 2210.04610 (SD safety filter audit) — https://arxiv.org/pdf/2210.04610v5 (asset-46)
- LAION-AI/LAION-SAFETY — https://github.com/LAION-AI/LAION-SAFETY (asset-46)
- notAI-tech/NudeNet — https://github.com/notAI-tech/NudeNet (asset-46)
- vladmandic/nudenet — https://github.com/vladmandic/nudenet (asset-46)
- Ultralytics AGPL issue #14297 — https://github.com/ultralytics/ultralytics/issues/14297 (asset-46)
- jaranohaal/vit-base-violence-detection — https://huggingface.co/jaranohaal/vit-base-violence-detection (asset-46)
- abhi099k/image-multi-detect — https://huggingface.co/abhi099k/image-multi-detect (asset-46)

### Mockup libraries + composition engines
- pixelsign/html5-device-mockups — https://github.com/pixelsign/html5-device-mockups (asset-48)
- zachleat/browser-window — https://github.com/zachleat/browser-window (asset-48)
- @magnit-ce/browser-mockup — https://www.npmjs.com/package/@magnit-ce/browser-mockup (asset-48)
- pulipulichen/Responsive-Frame-Mockup — https://github.com/pulipulichen/Responsive-Frame-Mockup (asset-48)
- romannurik/AndroidAssetStudio — https://github.com/romannurik/AndroidAssetStudio (asset-48)
- marcbouchenoire/dimmmensions — https://github.com/marcbouchenoire/dimmmensions (asset-48)
- rmenon1008/mockupgen — https://github.com/rmenon1008/mockupgen (asset-48)
- wanadev/perspective.js — https://github.com/wanadev/perspective.js (asset-48)
- adonmo/perspective.ts (implied from perspective.js fork) (asset-48)
- sharp composite API — https://sharp.pixelplumbing.com/api-composite (asset-48)
- Meta Design license — https://design.facebook.com/license/ (asset-48)
- Apple Design Resources — https://developer.apple.com/design/resources/ (asset-48)
- Google Device Art Generator — https://developer.android.com/distribute/marketing-tools/device-art-generator (asset-48)
- Anthony Boyd Graphics license — https://www.anthonyboyd.graphics/license/ (asset-48)
- Freebbble — https://freebbble.com/ (asset-48)

## Status

Synthesized 2026-04-21 across 12 angle files + README. Twelve tracks deferred from v1; prioritization ranks 28 (visual-diff), 29 (perceptual hashing), 22 (patterns/gradients), and the CC0 subset of 20 (illustration sets) as the highest-value pull-forwards. Audio (44), 3D (21), and image moderation (46) remain scoped out. All primary-source URLs cited in at least one angle are aggregated above; cross-references use `(see asset-NN §section)` convention.
