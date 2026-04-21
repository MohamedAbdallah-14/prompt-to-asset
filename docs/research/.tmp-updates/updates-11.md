# Research update log — Category 11 (Favicon Web Assets)
Updated: 2026-04-21

## Summary

Audited all 7 files in `/docs/research/11-favicon-web-assets/`. Six files had edits; `index.md` had no stale claims. The research was generally accurate and well-sourced — most corrections are precision fixes rather than outright reversals. No major claim was completely wrong; the gaps were specific factual inaccuracies around Safari behaviour, AVIF OG support, X Card Validator status, and library maintenance metadata.

---

## File-by-file changes

### 11a-modern-favicon-complete-spec.md

**Issue 1: Safari SVG favicon dark-mode claim was imprecise.**
- Old: "Safari ignores media queries inside favicon SVGs on desktop up through Safari 17"
- Safari 17 introduced SVG favicon support, but the phrasing "up through Safari 17" implied the problem was fixed in Safari 18+. It is not.
- Fix: Replaced with explicit statement that Safari 17/18/19 all support SVG favicons for tabs but none honour the embedded `prefers-color-scheme` media query. Added dated note.

**Issue 2: Executive summary SVG favicon browser support paragraph understated Safari limitation.**
- Old: Listed Safari 17+ as supporting adaptive dark mode.
- Fix: Clarified that Safari 17+ supports the `<link rel="icon" type="image/svg+xml">` tag (tab icon) but ignores the embedded `@media (prefers-color-scheme: dark)` block. iOS Safari does not use SVG favicons at all.

**Issue 3: File Catalog entry repeated the old imprecise phrasing.**
- Fixed to match the corrected executive summary.

**No changes needed:** The `sizes="32x32"` guidance, ICO spec, `apple-touch-icon` spec, mask-icon retirement, MS Tile retirement, generator comparison, and dark-mode SVG recipe (minus the Safari note) are all accurate.

---

### 11b-og-twitter-card-dynamic-images.md

**Issue 1: X/Twitter Card Validator status.**
- The file said "Card Validator (deprecated 2024)". The official tool was actually retired earlier; the file's description of the workaround (post a private test tweet) was correct but third-party validators now exist.
- Fix: Updated the debugger table row to name the specific third-party alternatives (socialrails.com, opentweet.io). Added those tools to the Third-Party Tools list.

**Issue 2: `og:image:type` / format guidance.**
- The file listed WebP as broadly supported and said nothing about AVIF for OG.
- Verified: AVIF is not safe for OG (only Facebook accepts it; LinkedIn, Slack, X, iMessage do not as of late 2025). WebP has wider support than before but is still inconsistent on LinkedIn.
- Fix: Added explicit AVIF-unsafe note, WebP caveat, and a dated update block.

**Issue 3: Pre-flight checklist format line.**
- "not WebP for max compat" was a blunt blanket statement that needed nuance.
- Fix: Replaced with an accurate statement distinguishing AVIF (still unsafe) from WebP (partial support, inconsistent on LinkedIn).

**Issue 4: astro-og-canvas weekly download count.**
- The file claimed ~15K weekly downloads. Verified current count is ~12K (Socket.dev data, Apr 2026).
- Fix: Updated to ~12K.

**No changes needed:** 1200×630 spec, Satori internals and constraints, Next.js `opengraph-image.tsx` recipe, SvelteKit recipe, Nuxt/Remix/Hono patterns, hybrid AI+template pattern, static/edge/on-demand tradeoffs, fallback chain, LinkedIn minimum size, Facebook 30d cache, the bulk of the debugger section.

---

### 11c-adjacent-web-assets-email-chat-readme.md

**No changes.** All claims verified:
- Email width, Outlook constraints, Gmail 102 KB clip — current.
- Slack 512×512 rounded-square, Discord 512×512 circle — current.
- GitHub 1280×640 social preview spec — current.
- README `<picture>` dark-mode pattern — current.
- Shields.io custom badge endpoint — current.
- `workers-og` / Cloudflare Workers Satori pitfalls — current.
- `@vercel/og` performance figures (P99 ~0.99s, ~160× cheaper) — originated from the Vercel launch post and remain the canonical benchmark.

---

### 11d-open-source-favicon-generators.md

**Issue 1: `RealFaviconGenerator/core` described as "young and low-traffic" with ~34 ⭐.**
- Star count is not a maintenance indicator here. Verified the packages are actively maintained with frequent npm releases as of April 2026: `generate-favicon` v0.6.3, `check-favicon` v0.8.0, `realfavicon` CLI v0.4.6.
- Fix: Removed "young project, low-traffic" caveat. Updated star count note. Added dated block with version numbers.

**Issue 2: Same `~34 ⭐` and "Active 2024–2026" in the comparison table.**
- Fix: Updated table row to reflect active frequent releases and specific version numbers.

**Issue 3: References section star count for `RealFaviconGenerator/core`.**
- Fix: Replaced `~34 ⭐` with version numbers.

**Issue 4: `resvg-js` table entry.**
- The entry said "Active" without noting that the last *stable* npm release (2.6.2) is ~2 years old.
- Fix: Noted latest stable (2.6.2), the active alpha pre-releases (2.6.3-alpha, 2.7.0-alpha.0 as of Jan 2026), and the recommendation to pin 2.6.2 for stability.

**Issue 5: `pwa-asset-generator` download count.**
- The entry had no download count. Verified ~22K weekly downloads (March 2026).
- Fix: Added download count to the table row.

**No changes needed:** `itgalaxy/favicons` (v7.2.0 Mar 2024 confirmed stable, 330K weekly confirmed), satori version (0.26.0 Mar 2026), `@vercel/og` (0.11.1), `sharp`, SVGO, license analysis (pngquant GPL warning remains correct), risk register, recommended stack pseudocode.

---

### 11e-performance-seo-accessibility.md

**Issue 1: `sizes="any"` on ICO in the generator-emitted HTML snippet.**
- The snippet used `<link rel="icon" href="/favicon.ico" sizes="any">`. This directly contradicts 11a's guidance (the `sizes="any"` Chrome bug — Chrome downloads both ICO and SVG, preferring ICO).
- Fix: Changed to `sizes="32x32"` and added a dated note explaining why.

**Issue 2: `msapplication-TileImage/TileColor` in the generator snippet without context.**
- These are IE11 / Windows 8 legacy meta tags. Chromium Edge reads the web app manifest instead.
- Fix: Added "Legacy only" comment in the HTML snippet.

**Issue 3: Google favicon requirements section was accurate but could be tightened.**
- Verified: Google updated guidelines (last updated 2026-02-04). Minimum is 8×8 px; strong recommendation is ≥48×48 px (multiple of 48). SVG has no size constraint.
- Fix: Added dated note clarifying the minimum vs. recommendation distinction and citing the 2026-02-04 documentation date.

**Issue 4: EN 301 549 version reference.**
- File correctly cited v3.2.1 but said it "normatively references WCAG 2.1 AA but commonly audited against 2.2". Did not mention forthcoming v4.1.1.
- Verified: EN 301 549 v4.1.1 is expected in 2026 and will incorporate WCAG 2.2. WCAG 2.2 was approved as ISO/IEC standard in 2025.
- Fix: Added dated note about v4.1.1 timeline and current legal status.

**No changes needed:** Size budget table, compression pipeline flags, CWV analysis (`fetchpriority="high"`, CLS `width`/`height` attributes, `decoding="async"`), WCAG 2.2 alt-text decision tree (correct), `Organization.logo` JSON-LD (correct), OG/Twitter meta snippet (correct — already uses absolute HTTPS URLs and includes `og:image:alt`).

---

### SYNTHESIS.md

**Issue 1: Insight #4 — Safari dark-mode SVG favicon claim imprecise.**
- Old: "Safari up through 17 ignores that media query inside favicons"
- Fix: Clarified that all current Safari versions (17, 18, 19) ignore the embedded media query. Added dated note.

**Issue 2: Insight #10 — X Card Validator.**
- Old: "X's Card Validator was retired in 2024 so you debug via a private test tweet."
- Fix: Clarified the tool is permanently retired with no official replacement; named third-party alternatives.

**Issue 3: Insight #12 — `RealFaviconGenerator/core` maturity description.**
- Old: "freshly OSS-ified engine" with implied low maturity.
- Fix: Removed "freshly" framing; added version numbers confirming active maintenance; added dated note correcting the "young project, low-traffic" characterisation.

**Issue 4: Controversies — AVIF/WebP verdict.**
- The section was accurate in its verdict but lacked an update confirming it is still current.
- Fix: Added dated note confirming AVIF remains unsafe for OG and WebP is still inconsistent on LinkedIn as of late 2025.

**No changes needed:** All other insights (1–3, 5–9, 11, 13–15), cross-cutting patterns, gaps, Skill A/B architecture recommendations, primary sources list.

---

## Non-changes confirmed by search

The following claims were cross-checked and confirmed accurate:

- `favicon.ico` must be at document root for RSS readers/crawlers — confirmed.
- `sizes="32x32"` fix for Chrome ICO-vs-SVG bug — confirmed still current workaround.
- `safari-pinned-tab.svg` / `mask-icon` — confirmed effectively dead since Safari 12; still optional-but-harmless.
- IE11 EOL June 2022 / `browserconfig.xml` dead — confirmed.
- `apple-touch-icon` single 180×180 opaque PNG, iOS blacks transparent pixels — confirmed.
- Maskable icon safe zone 0.4× radius, separate `purpose: "maskable"` entry — confirmed ("any maskable" combined value is discouraged, not deprecated).
- 1200×630 OG consensus, LinkedIn ≥1200 px hard minimum — confirmed.
- Satori CSS constraints (flex-only, no grid, no `::before`, etc.) — confirmed.
- `@vercel/og` 0.11.1 (last published ~2 months before this update) — confirmed.
- pngquant GPL-3/commercial-dual redistribute risk — confirmed.
- `itgalaxy/favicons` v7.2.0 Mar 2024, stable-but-quiet — confirmed (no new stable release as of April 2026).

---

## Search sources used

- caniuse.com/link-icon-svg (SVG favicon browser support)
- evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs (Evil Martians 2026 update)
- npmjs.com/@realfavicongenerator/generate-favicon (v0.6.3, 25 days ago)
- npmjs.com/@realfavicongenerator/check-favicon (v0.8.0, 18 days ago)
- npmjs.com/package/realfavicon (v0.4.6, very frequent updates)
- darekkay.com/blog/open-graph-image-formats/ (AVIF/WebP OG compat)
- joost.blog/use-avif-webp-share-images/ (AVIF/WebP OG safety Dec 2024)
- developers.google.com/search/docs/appearance/favicon-in-search (updated 2026-02-04)
- socket.dev/npm/package/astro-og-canvas (12K weekly downloads)
- github.com/thx/resvg-js/releases (2.6.2 stable, alphas Jan 2026)
- elegantapp/pwa-asset-generator issues (active through Apr 2026, ~22K weekly)
- socialrails.com, opentweet.io (X Card Validator alternatives)
- cerovac.com/a11y + etsi.org (EN 301 549 v4.1.1 timeline)
- browserux.com/blog/guides/web-icons/favicons-best-practices.html (Safari 18/19 SVG dark mode)
- iconmaker.studio/blog/favicon-best-practices-2025 (Safari dark mode limitations)
