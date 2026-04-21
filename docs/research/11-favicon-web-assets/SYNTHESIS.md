---
category: 11-favicon-web-assets
title: "Category Index — Favicons, OG/Twitter Cards, PWA Icons, and Adjacent Web Assets"
role: category-indexer
date: 2026-04-19
status: synthesis
audience: prompt-to-asset skill authors, web-asset pipeline implementers, master synthesis agent
angles_indexed:
  - 11a — Modern favicon complete spec (SVG-first, .ico fallback, Apple touch, Android manifest, Safari pinned tab, MS tile)
  - 11b — Open Graph & Twitter card images (1200×630, Satori / @vercel/og, hybrid AI + template, unfurl debugging)
  - 11c — Adjacent web assets (email, Slack/Discord, GitHub social preview, README dark-mode, shields.io badges, 404 illustrations)
  - 11d — Open-source favicon / web-asset generator landscape (itgalaxy/favicons, RealFaviconGenerator/core, satori, sharp, resvg)
  - 11e — Performance, SEO, accessibility (Core Web Vitals, compression pipeline, WCAG 2.2, schema.org Organization.logo)
downstream_skills:
  - web-asset-bundle-generator (favicon + OG + social + manifest + HTML head)
  - html-head-snippet-emitter (canonical <link>/<meta> block with cache-busting)
  - og-image-template (Satori JSX shells with optional AI hero layer)
---

# 11 — Favicons, OG/Social, PWA Icons & Adjacent Web Assets — Category Index

## Executive Summary

Across five research angles this category converges on a single, confident answer: **the modern web-asset bundle is small, SVG-first, deterministically generable, and hybridized between template code and generative AI — not a 30-file photoshop ritual**. The era of shipping a 30-icon "I can haz favicon" package is over; so is the era of rendering social cards with headless Chrome. Both have been replaced by tight, code-first pipelines where AI contributes the *illustrative* layer and deterministic rasterizers contribute everything text-, size-, and compatibility-critical.

The fifteen highest-value insights the prompt-to-asset should encode:

1. **The modern favicon set is five files plus a manifest, not thirty.** `favicon.svg` (adaptive dark/light), `favicon.ico` (multi-image 16/32/48 for crawlers and legacy), `apple-touch-icon.png` (single 180×180 opaque), `icon-192.png` + `icon-512.png` + `icon-maskable-512.png` referenced from `manifest.webmanifest`. Everything beyond that is legacy polish. ([Evil Martians — How to Favicon in 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs); [RealFaviconGenerator "Less is More"](https://realfavicongenerator.net/blog/new-favicon-package-less-is-more/))
2. **`sizes="32x32"` on the `.ico` link is load-bearing.** Without it, Chrome has historically downloaded both the `.ico` and the `.svg`, preferring the `.ico` and wasting a round-trip. Evil Martians changed from `sizes="any"` to `sizes="32x32"` specifically for this Chrome bug in 2023.
3. **Microsoft Tile `browserconfig.xml` and Safari `mask-icon` are effectively dead.** IE11 hit EOL June 2022; Chromium Edge reads the web app manifest. Safari 12+ falls back gracefully to the regular favicon for pinned tabs; even `apple.com` has dropped its pinned-tab SVG. Ship-once legacy: skip it unless your analytics say otherwise.
4. **Dark-mode favicons are a single SVG with an embedded `<style>` `@media (prefers-color-scheme: dark)` block** — but Safari up through 17 ignores that media query inside favicons, iOS caches aggressively, and the query reads OS theme, not per-site theme. It is free on Chromium/Firefox and harmless elsewhere. ([Adam Argyle — Building an adaptive favicon](https://web.dev/articles/building/an-adaptive-favicon))
5. **`apple-touch-icon.png` must be a single 180×180 opaque PNG** — iOS paints transparent pixels **black**, auto-rounds corners (so don't pre-round), and down-samples to every other size with production-quality filtering. The old size matrix (57/60/72/76/114/120/144/152/167) is pure bloat. ([RealFaviconGenerator — how iOS scales](https://realfavicongenerator.net/blog/how-ios-scales-the-apple-touch-icon))
6. **Maskable icons need their own entry with `purpose: "maskable"`**, not a combined `"any maskable"` asset. The safe zone is a circle of radius 0.4 × width; outer ~10% will be cropped by launcher masks. Test against every mask (Pixel, OnePlus, Samsung, teardrop, squircle) via [maskable.app](https://maskable.app/). ([web.dev/maskable-icon](https://web.dev/articles/maskable-icon))
7. **For OG/Twitter cards, the universal spec is 1200×630 (1.91:1), PNG or JPEG under 5 MB, sRGB, absolute HTTPS URL, no SVG ever.** LinkedIn silently degrades to a small thumbnail below 1200 px wide; X caches for 7 days; Facebook for ~30 days. Keep content inside the center 80% safe box. ([ogp.me](https://ogp.me/); [dev.x.com summary_large_image](https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image))
8. **Satori + resvg (`@vercel/og`) is the canonical on-demand OG engine** — ~500 KB payload vs. ~50 MB for headless Chromium, P99 ~1 s vs. ~5 s, and roughly 160× cheaper at the edge. It accepts a strict flex-only CSS subset (`display: flex` or `display: none`; no grid, no `::before`, no media queries, no CSS variables, no keyframes) and requires fonts embedded as subset TTF ArrayBuffers. ([vercel/satori](https://github.com/vercel/satori); [Vercel launch post](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images))
9. **The winning OG composition pattern is a two-layer hybrid: deterministic Satori JSX shell + optional AI-generated hero background.** All text (title, author, logo) lives in the shell because AI text rendering is still unreliable; the hero is abstract/illustrative at 1200×630 with the bottom half reserved for a gradient scrim and typography. Swap the hero engine (Imagen, Flux, DALL·E, gradient fallback) without touching the shell.
10. **Unfurlers are hostile and non-uniform.** Slackbot truncates HTML at 32 KB and demands absolute URLs; Discord caches for ~24 h; Facebook for ~30 d keyed on URL; X's Card Validator was retired in 2024 so you debug via a private test tweet. Every dynamic OG endpoint needs a 4-level fallback chain with a 500 ms hero-fetch timeout before a slow OG becomes a missing OG.
11. **RSS readers and crawlers bypass `<link rel="icon">` entirely and fetch `/favicon.ico` at the root** (Feedly, Inoreader, Slackbot's fallback, generic SEO bots). `favicon.ico` MUST live at the document root — never behind a hashed path — regardless of how modern the rest of your build pipeline is.
12. **The open-source generator landscape finally has a SaaS-equivalent engine.** `RealFaviconGenerator/core` (MIT, TypeScript) is the freshly OSS-ified engine behind realfavicongenerator.net; it ships `generate-favicon`, `generate-logo`, `check-favicon`, `inject-markups`, and Node image adapters. Combined with the proven `itgalaxy/favicons` (~1.2 k ⭐, 330 k weekly downloads) as a fallback, the prompt-to-asset needs no network calls to produce a modern set.
13. **Avoid Chromium, ImageMagick, Inkscape, and `pngquant` in the bundle.** Chromium pulls ~200 MB (`pwa-asset-generator`, `svgexport`); ImageMagick/Inkscape are system deps with painful install matrices; `libimagequant` is GPL-3 / commercial-dual and a real redistribution hazard. Use `sharp` (Apache-2.0, libvips), `resvg`/`@resvg/resvg-js` (MPL-2.0, Rust), `svgo` (MIT), and `png-to-ico` / `to-ico` (MIT) instead. ([Wikimedia T243893](https://phabricator.wikimedia.org/T243893) benchmarks resvg ~7× faster and more spec-correct than Inkscape CLI.)
14. **Dark mode is a first-class citizen across adjacent surfaces, not just favicons.** GitHub READMEs need `<picture><source media="(prefers-color-scheme: dark)">` twin PNGs (the `#gh-dark-mode-only` URL hack is GitHub-only and breaks on npm/crates.io). Slack icons need solid fills to survive sidebar theme switching. Email has **no** `prefers-color-scheme` support — ship a transparent PNG with a mid-grey stroke outline so it's legible on both white and Outlook's dark-mode charcoal.
15. **Asset generation is only half the job — shipping them correctly is the other half.** Every asset emitted must carry: explicit `width`/`height` HTML attributes (CLS prevention — images cause 60%+ of CLS in the wild), `fetchpriority="high"` on the LCP image, `loading="lazy" decoding="async"` below the fold, a budget-enforced compression pass (pngquant 65–85 → oxipng `-o max` → cwebp `-q 80 -sharp_yuv`), a WCAG 2.2-aware alt (decorative `alt=""`, functional → action verb, logo-as-link → "Home" not "Acme logo"), and an `Organization.logo` JSON-LD at ≥112×112 rendering correctly on pure white. A "good" logo that ships without these is a net liability.

## Map of the Angles

The category was researched along five orthogonal cuts, each with a distinct primary deliverable:

| Angle | File | Focus | What the prompt-to-asset reuses from it |
|---|---|---|---|
| **11a** | `11a-modern-favicon-complete-spec.md` | The canonical modern favicon set; retired files; dark-mode SVG recipe; edge cases (iOS black-matte, Chrome favicon cache, `sizes="any"` footgun) | The exact 5-line `<head>` snippet; the retired-files blacklist; the "don't pre-round, don't make transparent" `apple-touch-icon` rule |
| **11b** | `11b-og-twitter-card-dynamic-images.md` | OG/Twitter card spec; 1200×630 consensus; Satori/@vercel/og internals + constraints; framework recipes (Next.js `opengraph-image.tsx`, Astro, SvelteKit); AI-hero + shell hybrid; unfurl debuggers | The JSX OG template; the hero-prompt guardrails ("no text, no logos, abstract, upper-left subject"); the 4-level fallback chain; the pre-flight unfurl checklist |
| **11c** | `11c-adjacent-web-assets-email-chat-readme.md` | Email (600 px wide, Outlook `background-image` gotcha, 102 KB Gmail clip), Slack 512² rounded square, Discord 512² circle, GitHub 1280×640 repo preview, README `<picture>` dark-mode, shields.io custom endpoint, 404 illustration | The "where AI fits vs. where code fits" per-asset matrix; the email flatten-to-single-PNG rule; the `<picture>` README snippet |
| **11d** | `11d-open-source-favicon-generators.md` | Repo-by-repo evaluation of every favicon/PWA/OG generator; license & bundling risk; Node vs. Python stack; why not call RealFaviconGenerator's SaaS | The actual dependency list; the risk register; the canonical `buildAssetBundle()` pseudocode |
| **11e** | `11e-performance-seo-accessibility.md` | Size budgets (bytes, not pixels); two-stage compression DAG; CWV impact (LCP preload + `fetchpriority`, CLS `width`/`height`); WCAG 2.2 alt decision tree; `schema.org/Organization.logo` at ≥112×112 white-bg; Google/Bing favicon rules | The compression flags; the alt-text decision tree; the JSON-LD template; the CWV-aware `<picture>` snippet |

Two axes dominate the map:

- **Static vs. dynamic.** Favicons, PWA icons, apple-touch — generated once per brand, shipped as files. OG cards, status incidents, per-URL share images — generated on demand at the edge, cached immutably. The pipeline must treat these as separate engines (11a+11d drive the icon engine, 11b+11c drive the social/dynamic engine).
- **Template vs. generative.** Text-bearing, brand-chrome surfaces (OG shell, badges, email headers with live text, GitHub repo preview) belong to deterministic code (Satori/@vercel/og, shields.io endpoint schema). Illustrative, atmospheric surfaces (hero backgrounds, 404 illustrations, README banners) are a good AI fit. Confusing the two is the category's single most common failure mode.

## Cross-Cutting Patterns

Five patterns recur across all five angles:

**1. The "less is more" migration.** 11a, 11b, 11d, and 11e all independently arrive at the same conclusion: the canonical output is small and highly standardized. Five favicon files, one 1200×630 OG, one 192+512+maskable trio, one JSON-LD logo. RealFaviconGenerator's own "less is more" blog post is the earliest statement of this trend (2016, kept current); Evil Martians codified it for developers; the OSS generator landscape (itgalaxy/favicons 7.x, RealFaviconGenerator/core) now matches it; and Google/Bing SEO guidance converges on the same minimal set. The prompt-to-asset should default to minimal and require the caller to opt *in* to legacy files.

**2. Absolute HTTPS URLs, always.** Social unfurlers reject relative URLs (11b, 11c); GitHub's OG card generator reuses `og:image`; `Organization.logo` JSON-LD must be HTTPS-crawlable (11e); iOS fetches `/favicon.ico` and `/apple-touch-icon.png` at the root unconditionally (11a). The generator should emit absolute URLs by default and accept a `baseUrl` parameter for environments where the root isn't yet fixed.

**3. Cache-busting via URL, not `Cache-Control`.** 11b and 11c both recommend a content hash or `updated_at` timestamp in the OG URL (`/og/blog/my-post?v=abc123`) because social caches (Facebook 30 d, X 7 d, Slack ~1 h, iMessage per-device) invalidate on URL change but not on re-deploy. 11a's `favicon.svg?v=2` trick solves the same problem for Chromium's aggressive favicon cache. The pipeline should bake a hash into every generated asset's URL.

**4. The font / emoji / wasm cold-start trap.** 11b's Satori deep-dive flags that full Inter is ~800 KB and blows edge cold-start budgets; 11c notes that Cloudflare Workers' 1 MB (free) / 10 MB (paid) script-size cap is real; 11d's risk register flags MPL-2.0 copyleft and native-binary install matrices. All three point to the same mitigation: **subset fonts, embed emoji glyphs per codepoint, use resvg-wasm static imports, ship prebuilt binaries**. The prompt-to-asset's build step should include a font subsetting pass tied to the languages actually used in the OG title.

**5. Transparency is context-dependent.** 11a: `favicon.svg` and `icon-192.png` can be transparent; `apple-touch-icon.png` must be opaque (iOS blacks transparent pixels). 11c: email logos need mid-grey strokes for Outlook dark-mode; Slack icons need solid fills for sidebar theme switching; GitHub OG benefits from solid backgrounds across consumers. 11e: Twitter/X re-encodes transparent PNG with a black/white matte; `Organization.logo` must render correctly on pure white (Google, Nov 2021+). The generator must carry **per-asset transparency policy** and refuse to emit transparent outputs into surfaces that forbid them.

## Controversies

The category is unusually well-settled, but real disagreements exist:

**How much to chase legacy targets.** RealFaviconGenerator defaults toward a defensive ~15-file package; Evil Martians, Mathias Bynens, and Andy Bell's CUBE-CSS camp argue for the 5-file minimum. 11a comes down on the side of minimal (Microsoft Tile + Safari `mask-icon` are effectively retired); 11d notes that `itgalaxy/favicons` still emits the full matrix for defensiveness. **Verdict for the skill:** default minimal, expose a `legacy: true` flag that turns on `mstile-*`, `browserconfig.xml`, and the Safari pinned-tab monochrome SVG for callers with confirmed legacy traffic.

**Apple splash screens.** The iPhone/iPad matrix has ~30 sizes that change yearly. `pwa-asset-generator` (Puppeteer-based) tracks Apple's matrix best but pulls ~200 MB of Chromium; `itgalaxy/favicons` 7.2.0 added the iPhone 14/15 set but may lag newer hardware; `capacitor-assets` is mobile-first but less prompt-to-asset friendly. **Verdict:** skip splash by default (most web apps don't need it), expose a `pwaSplash: true` flag that spawns `pwa-asset-generator` as an optional local-only dev-time tool, never bundled.

**Edge vs. Node runtime for OG.** 11b is explicit: Edge wins on cost/cold-start unless you need DB access; but resvg-wasm on Cloudflare Workers has dynamic-instantiation quirks, and external image fetches require pre-embedding. 11c echoes the same pitfalls. **Verdict:** emit Node runtime by default (broader library support, sharp works, DB-friendly), document Edge with explicit caveats and test fixtures when callers opt in.

**AVIF vs. WebP vs. JPEG for OG.** 11e recommends AVIF → WebP → JPEG laddering for hero images, but 11b flags that X/Slack reject WebP inconsistently and SVG is unsupported across all social. **Verdict for OG specifically:** ship PNG or JPEG (PNG if the shell has sharp text edges; JPEG q≈82 if the hero dominates). Ladder into AVIF/WebP only for in-page hero/LCP elements, never for OG.

**`@realfavicongenerator/core` vs. `itgalaxy/favicons`.** 11d identifies RealFaviconGenerator/core as the highest-leverage find and the strongest match for SaaS output parity, but also notes it is young (~34 ⭐) and low-traffic; itgalaxy/favicons is proven (330 k weekly) but quiet since March 2024. **Verdict:** pin `@realfavicongenerator/generate-favicon` as primary with `itgalaxy/favicons` as fallback; add a CI test that diffs outputs across both to catch regressions.

**Do agents generate JSX or just describe it?** For OG cards, 11b and 11c both argue the prompt-to-asset's "correct" output for `"OG card for X"` is **code** (a Satori JSX template) rather than a diffusion prompt. 11d's pseudocode reinforces this. A minority view would have the skill emit a pre-rendered PNG for every post — simpler but wasteful. **Verdict:** emit JSX templates by default; pre-render only for top-level pages (home, pricing) where cache behavior is predictable.

## Gaps

Five gaps the five angles collectively leave open:

1. **Non-Latin typography and RTL.** Satori's font subset examples assume Latin-1 + Inter; neither 11b nor 11d covers CJK, Arabic/RTL, or Devanagari subsetting. The skill needs a language-aware font pipeline.
2. **Video/animated OG.** 11b is image-only. Twitter, LinkedIn, and Facebook all support OG video (`og:video`, `twitter:player`), but the category did not research it. Likely out-of-scope for v1; flag for v2.
3. **AI hero-prompt library.** 11b describes the hero-prompt guardrails in prose but doesn't ship a reusable prompt library keyed on article topic, brand palette, and composition. Category 04–07 (model-specific prompting) and 10 (UI illustrations) need to cross-reference here; the indexer should flag the join.
4. **A/B and analytics on OG CTR.** No angle covers measuring whether an OG image is actually converting shares into clicks. `og:image` choice meaningfully affects CTR; the skill could emit multiple variants and let the caller wire up UTM-tagged A/B.
5. **Compliance-specific logos.** `Organization.logo`, Apple App Store icons, Google Play feature graphics — 11e mentions the Knowledge Panel case; the App/Play store icons (which have their own per-store rules) are covered in category 09. Cross-link, don't duplicate.

## Actionable Recommendations for Our Web-Asset Skills

The category should produce **two user-facing skills** with a shared core library:

### Skill A — `web-asset-bundle-generator`

**Input:** an SVG (preferred) or ≥1024×1024 transparent PNG master, plus a `brand` config:

```json
{
  "name": "Prompt Enhancer",
  "shortName": "Enhancer",
  "themeColor": "#0b0b0b",
  "backgroundColor": "#ffffff",
  "darkVariant": "#ffffff",
  "baseUrl": "https://enhancer.example"
}
```

**Output (the modern 5+1 minimal set):**

- `/favicon.svg` — SVG with embedded `@media (prefers-color-scheme: dark)` dark variant.
- `/favicon.ico` — multi-image 16/32/48 PNG-compressed ICO at document root.
- `/apple-touch-icon.png` — single 180×180 opaque PNG, no pre-rounded corners.
- `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` — PNGs referenced from the manifest; maskable is a separate `purpose: "maskable"` entry with safe-zone padding.
- `/manifest.webmanifest` — served `application/manifest+json`.
- `/og-image.png` — pre-rendered 1200×630 default OG card, referenced in site-wide `<meta property="og:image">`.

**Engine:** `@realfavicongenerator/generate-favicon` primary, `itgalaxy/favicons` fallback, with `sharp` (Apache-2.0) for resize, `@resvg/resvg-js` (MPL-2.0) for SVG rasterization, `svgo` for SVG normalization, `png-to-ico` for ICO assembly, `sharp.png({ palette: true })` + `oxipng` (MIT) for lossless compression. **Never bundle `pngquant`, Chromium, ImageMagick, or Inkscape.**

**Opt-in flags:**
- `legacy: true` → emit `mstile-*.png` + `browserconfig.xml` + Safari `safari-pinned-tab.svg`.
- `pwaSplash: true` → spawn `pwa-asset-generator` for the Apple splash matrix (dev-time only).
- `ogVariants: ["default", "square", "twitter"]` → emit multiple pre-rendered OG sizes.

**Guardrails baked in:**
- Apple-touch-icon input is passed through a "flatten against background color" pass before emission (fixes the iOS black-matte problem).
- Maskable source gets 20% inner padding and is verified against a 0.4×width safe-circle.
- ICO is built from three *separate* downsamples (Lanczos3) at 16/32/48, never a single 48→16 cascade.
- All outputs get deterministic content-hash filenames, with one non-hashed symlink at `/favicon.ico` for the root-crawler fallback.

### Skill B — `html-head-snippet-emitter`

**Output:** a single, canonical, copy-paste-ready `<head>` block with:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)">

<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="https://{host}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{ogAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://{host}/og-image.png">
<meta name="twitter:image:alt" content="{ogAlt}">

<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Organization",
  "name": "{name}", "url": "{baseUrl}",
  "logo": { "@type": "ImageObject", "url": "{baseUrl}/logo-512.png",
            "width": 512, "height": 512 } }
</script>
```

Guardrails: no `rel="shortcut icon"`, no `apple-touch-icon-precomposed`, no per-size `apple-touch-icon-*`, no `msapplication-*` unless `legacy: true`, `sizes="32x32"` (not `any`) on the `.ico`, absolute HTTPS on every social URL, `theme-color` paired with `prefers-color-scheme` media variants.

### Cross-skill: OG card template

A separate `og-image-template.tsx` file authored in Satori-compatible JSX (`display: flex` only), with:

- **Shell layer** — deterministic: title (max 72 px, 2-line cap with ellipsis), author avatar + name, brand mark, gradient scrim bottom 40%.
- **Hero layer** — optional AI-generated background; prompt template enforces `1200×630, abstract, no text, no logos, subject biased upper-left, bottom reserved for scrim, brand-palette harmony`.
- **Fallback chain** — cached PNG → live Satori with hero → live Satori with gradient → static `/og-default.png`, 500 ms timeout on hero fetch.

## Primary Sources Aggregated

Specs and canonical docs:
- Open Graph Protocol — <https://ogp.me/>
- W3C Web Application Manifest — <https://www.w3.org/TR/appmanifest/>
- MDN `<link rel="icon">` — <https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/icon>
- MDN Web app manifest — icons — <https://developer.mozilla.org/en-US/docs/Web/Manifest/icons>
- W3C WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- W3C WAI Images Tutorial — <https://www.w3.org/WAI/tutorials/images/decision-tree/>
- Can I Use — SVG favicons — <https://caniuse.com/link-icon-svg>
- Apple Developer — Creating Pinned Tab Icons (archived) — <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html>
- Apple HIG — App icons — <https://developer.apple.com/design/human-interface-guidelines/app-icons>
- X / Twitter `summary_large_image` — <https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image>
- Facebook Sharing / Webmasters Images — <https://developers.facebook.com/docs/sharing/webmasters/images/>
- Microsoft Learn — Edge PWA icon & theme color — <https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/icon-theme-color>
- GitHub Docs — Social preview — <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview>
- GitHub Blog — Dark/light mode images in Markdown — <https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/>

Authoritative practitioner guides:
- Evil Martians — How to Favicon in 2026 — <https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs>
- RealFaviconGenerator — "Less is more" — <https://realfavicongenerator.net/blog/new-favicon-package-less-is-more/>
- RealFaviconGenerator — How iOS scales apple-touch — <https://realfavicongenerator.net/blog/how-ios-scales-the-apple-touch-icon>
- web.dev — Building an adaptive favicon (Adam Argyle) — <https://web.dev/articles/building/an-adaptive-favicon>
- web.dev — Maskable icons (Pete Paluzzi) — <https://web.dev/articles/maskable-icon>
- web.dev — Optimize LCP — <https://web.dev/articles/optimize-lcp>
- web.dev — Optimize CLS — <https://web.dev/optimize-cls/>
- web.dev — Fetch Priority — <https://web.dev/fetch-priority/>
- Google Search Central — Favicon in Search — <https://developers.google.com/search/docs/appearance/favicon-in-search>
- Google Search Central — Logo structured data — <https://developers.google.com/search/docs/appearance/structured-data/logo>
- Vercel — Introducing OG Image Generation — <https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images>
- Vercel docs — OG Image generation — <https://vercel.com/docs/functions/edge-functions/og-image-generation>
- Next.js — `opengraph-image.tsx` convention — <https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image>

Open-source engine repos (the bundleable stack):
- RealFaviconGenerator/core (MIT, TS) — <https://github.com/RealFaviconGenerator/core>
- itgalaxy/favicons (MIT, Node) — <https://github.com/itgalaxy/favicons>
- vercel/satori (MPL-2.0) — <https://github.com/vercel/satori>
- `@vercel/og` on npm (MPL-2.0) — <https://www.npmjs.com/package/@vercel/og>
- lovell/sharp (Apache-2.0) — <https://github.com/lovell/sharp>
- linebender/resvg (MPL-2.0) — <https://github.com/linebender/resvg>
- yisibl/resvg-js (MPL-2.0) — <https://github.com/yisibl/resvg-js>
- svg/svgo (MIT) — <https://github.com/svg/svgo>
- oxipng/oxipng (MIT) — <https://github.com/oxipng/oxipng>
- steambap/png-to-ico (MIT) — <https://github.com/steambap/png-to-ico>
- onderceylan/pwa-asset-generator (MIT) — <https://github.com/onderceylan/pwa-asset-generator>
- ionic-team/capacitor-assets (MIT) — <https://github.com/ionic-team/capacitor-assets>
- kvnang/workers-og — <https://github.com/kvnang/workers-og>

Debuggers and preview tools:
- RealFaviconGenerator Favicon Checker — <https://realfavicongenerator.net/favicon_checker>
- maskable.app — <https://maskable.app/>
- icon.kitchen — <https://icon.kitchen/>
- opengraph.xyz — <https://www.opengraph.xyz/>
- Facebook Sharing Debugger — <https://developers.facebook.com/tools/debug/sharing>
- LinkedIn Post Inspector — <https://www.linkedin.com/post-inspector/>
- Schema Markup Validator — <https://validator.schema.org/>
- Rich Results Test — <https://search.google.com/test/rich-results>

Benchmarks and deep references:
- Wikimedia T243893 — resvg vs librsvg vs Inkscape — <https://phabricator.wikimedia.org/T243893>
- HTTPArchive Web Almanac (media) — <https://almanac.httparchive.org/en/latest/media/>
- Mathias Bynens — `rel="shortcut icon"` is useless — <https://mathiasbynens.be/notes/rel-shortcut-icon>
- Thomas Steiner — `prefers-color-scheme` in SVG favicons — <https://blog.tomayac.com/2019/09/21/prefers-color-scheme-in-svg-favicons-for-dark-mode-icons/>
- Dave Allie — Debugging Slack link unfurling — <https://blog.daveallie.com/slack-link-unfurling/>
- DEV — 6 Pitfalls of Dynamic OG on Cloudflare Workers — <https://dev.to/devoresyah/6-pitfalls-of-dynamic-og-image-generation-on-cloudflare-workers-satori-resvg-wasm-1kle>
- Email on Acid — HTML email background images — <https://emailonacid.com/blog/article/email-development/html-background-images-in-email>
- Shields.io — Endpoint Badge schema — <https://shields.io/endpoint>
