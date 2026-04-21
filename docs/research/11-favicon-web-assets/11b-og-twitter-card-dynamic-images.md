---
category: 11-favicon-web-assets
angle: 11b
title: Open Graph & Twitter Card Images — 1200×630, Dynamic OG with Satori / @vercel/og, Hybrid AI + Template Patterns, and Unfurl Debugging
status: draft
audience: asset-generation agents, prompt-to-asset pipeline
last_updated: 2026-04-19
primary_sources:
  - https://ogp.me/
  - https://developers.facebook.com/docs/sharing/webmasters/images/
  - https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image
  - https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
  - https://vercel.com/docs/functions/edge-functions/og-image-generation
  - https://github.com/vercel/satori
  - https://github.com/thx/resvg-js
  - https://developers.facebook.com/tools/debug/sharing
tags: [open-graph, twitter-cards, og-image, satori, vercel-og, resvg, social-sharing, unfurl]
---

## Executive Summary

Open Graph (OG) and Twitter Card images are the single highest-leverage branded asset most web products produce: one 1200×630 PNG is rendered billions of times across Slack, iMessage, Discord, Facebook, LinkedIn, X/Twitter, WhatsApp, Telegram, and every RSS reader that resolves link previews. Unlike favicons, the OG image is a full marketing surface — title, subtitle, author, product mark, and a hero visual — that must load fast, cache aggressively, and look correct on first share. "Correct on first share" is the critical property, because all major unfurlers cache for 7–30 days and will happily burn a broken preview into their CDN.

For the prompt-to-asset pipeline, OG/Twitter card generation splits cleanly into two problems: (1) a **layout shell** (title, meta, brand chrome) that must be deterministic, pixel-accurate, text-safe, and trivially re-renderable per URL, and (2) an optional **hero visual** (illustration, photo, abstract art) where generative models add value. The industry has converged on a hybrid pattern: render the shell with Satori/@vercel/og (JSX → SVG → PNG) and slot an AI-generated or curated hero image as a background layer. This gives you on-demand per-page OG images at edge latency with immutable CDN caching, while letting the illustration system be swapped independently.

This document covers the spec (ogp.me + Twitter Cards), the 1200×630 pixel/aspect-ratio consensus, framework integrations (Next.js `opengraph-image.tsx`, Astro `astro-og-canvas`, SvelteKit `+server.ts`), the Satori/resvg-js internals and constraints, cache and runtime tradeoffs (edge vs. node, static vs. on-demand), the hybrid template+AI hero pattern, accessibility via `og:image:alt`, and the debugging loop (Facebook Sharing Debugger, LinkedIn Post Inspector, X Card Validator, opengraph.xyz).

## Spec Reference

### Open Graph Protocol (ogp.me)

The Open Graph protocol ([ogp.me](https://ogp.me/)) defines `og:image` as one of four required properties (alongside `og:title`, `og:type`, `og:url`). The `og:image` property accepts either a bare URL or a structured object with sub-properties:

```html
<meta property="og:image" content="https://example.com/og/post-123.png" />
<meta property="og:image:secure_url" content="https://example.com/og/post-123.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Blog post cover: 'How we migrated to edge runtime'" />
```

Key rules:

- **`og:image:secure_url`** is used when the main `og:image` is served over HTTP; modern best practice is to serve only HTTPS URLs and duplicate into `secure_url` for maximally compatible unfurlers.
- **`og:image:type`** — supported MIME types are `image/jpeg`, `image/png`, `image/gif`, `image/webp`. SVG is **not** supported by any major social platform; always rasterize. **AVIF is not safe** for OG images: as of late 2025 only Facebook accepts AVIF (and internally re-encodes it to JPEG); LinkedIn, Slack, X/Twitter, iMessage, and Discord do not support AVIF for unfurl images. WebP has broader support (Facebook, Discord, Slack, Bluesky confirmed; LinkedIn support is inconsistent — test before relying on it). **Safest choice: PNG for sharp-edged content (templates, logos), JPEG q≈82 for hero-dominated images.** ([darekkay.com OG format compatibility](https://darekkay.com/blog/open-graph-image-formats/); [joost.blog WebP/AVIF share images](https://joost.blog/use-avif-webp-share-images/))

> **Updated 2026-04-21:** WebP gained broader unfurl support in 2024–2025 but remains inconsistent on LinkedIn (some crawlers skip non-JPEG/PNG images). AVIF is still not safe for OG. Stick to PNG/JPEG for maximum platform fidelity; WebP is fine for in-page hero/LCP images served via `<picture>` but keep the OG fallback as JPEG/PNG.
- **`og:image:width` / `og:image:height`** — specifying these lets crawlers reserve layout before the image bytes arrive, eliminating first-render flicker on Facebook. Mismatching declared dimensions vs. actual pixels can cause cropping or rejection. ([zhead meta docs](https://zhead.dev/meta/og-image-width))
- **`og:image:alt`** — accessibility string, used by screen readers on some platforms and by search engines for image indexing; support is **inconsistent** across platforms but cheap to include. ([swimburger writeup](https://swimburger.net/blog/web/dont-forget-to-provide-image-alt-meta-data-for-open-graph-and-twitter-cards-social-sharing))
- **Multiple `og:image` tags** are allowed — when present, Facebook lets the user flip between them in the composer.
- **Absolute URLs only.** Relative paths and `data:` URLs are rejected by every major crawler.

### 1200×630 Consensus

Across Facebook, LinkedIn, X/Twitter `summary_large_image`, Slack, iMessage, Discord, and WhatsApp, the universally safe spec is:

| Property | Value |
|----------|-------|
| Dimensions | **1200 × 630 px** |
| Aspect ratio | **1.91 : 1** |
| Format | PNG (preferred) or JPEG; WebP is widely supported but not by all |
| File size | ≤ 5 MB (X/Twitter hard limit; Facebook allows 8 MB) |
| Color space | sRGB |
| Safe zone | center ~80% (some platforms crop to 2:1 or 1:1 thumbnails) |

Facebook center-crops to 1.91:1 and accepts minimum 600×315 for "large" display; below that it falls back to the small square card. LinkedIn strictly enforces **1200×627 minimum** — anything smaller renders as a tiny side-thumbnail rather than a hero card. ([Facebook docs](https://developers.facebook.com/docs/sharing/webmasters/images/), [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/))

Keep the title, logo, and primary subject **inside the center 960×504 safe box** (80%); some clients (e.g. iMessage tapback bubbles, Slack mobile) crop harder than 1.91:1.

### Twitter Cards (X)

X supports four card types: `summary`, `summary_large_image`, `app`, `player`. For editorial/product pages, `summary_large_image` is the default. Tags sit alongside (not replacing) OG tags; X will fall back to `og:*` if `twitter:*` is missing, so you can often get away with declaring only OG tags plus `twitter:card`.

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://example.com/og/post-123.png" />
<meta name="twitter:image:alt" content="..." />
<meta name="twitter:site" content="@yourbrand" />
<meta name="twitter:creator" content="@author" />
```

Twitter spec ([developer.x.com](https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image)) — 2:1 aspect, 300×157 min, 4096×4096 max, JPG/PNG/WebP/GIF, ≤5 MB, **no SVG**, **must be absolute HTTPS**. Content is cached by X for **7 days** after first tweet.

## Framework Integration Recipes

### Next.js App Router — `opengraph-image.tsx` Convention

Next.js 13+ introduced a file-based convention that collapses everything above into one file per route. Co-locate `opengraph-image.tsx` next to `page.tsx`; Next.js auto-injects the correct `<meta>` tags at build/request time.

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';              // or 'nodejs'
export const alt = 'Blog post cover';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug);
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a', color: 'white', padding: 64, flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>{post.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, opacity: 0.8 }}>
          <img src={post.authorAvatar} width={48} height={48} style={{ borderRadius: 24 }} />
          <span>{post.authorName}</span>
          <span style={{ marginLeft: 'auto' }}>yourbrand.dev</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

Notes:
- `next/og` is Next.js's internal re-export of `@vercel/og`. Use it instead of importing `@vercel/og` directly in Next projects. ([Next.js metadata docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image))
- A twin file `twitter-image.tsx` with identical shape generates the `twitter:image` variant if you want a tighter crop or different typography for X.
- The response is automatically cached on the edge with `cache-control: public, immutable, no-transform, max-age=31536000` in production. ([Vercel `@vercel/og` package](https://www.npmjs.com/package/@vercel/og))

### Astro — `astro-og-canvas` / `@astrojs/og`

`astro-og-canvas` ([delucis/astro-og-canvas](https://github.com/delucis/astro-og-canvas), ~12K weekly downloads as of 2026-04) is the de-facto Astro solution; it uses CanvasKit-WASM rather than Satori, which trades JSX ergonomics for simpler styling primitives and bulletproof font/emoji rendering.

```ts
// src/pages/og/[...slug].ts
import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
const pages = Object.fromEntries(posts.map(p => [p.slug, p.data]));

export const { getStaticPaths, GET } = OGImageRoute({
  pages,
  param: 'slug',
  getImageOptions: (_, page) => ({
    title: page.title,
    description: page.description,
    logo: { path: './public/logo.png', size: [80] },
    bgGradient: [[0, 10, 40], [40, 0, 80]],
    border: { color: [255, 200, 0], width: 5 },
    font: { title: { families: ['Inter'], weight: 'ExtraBold' } },
  }),
});
```

The official `@astrojs/og` package exists but is experimental (3 weekly downloads, Node-only, requires `output: 'server'`) and not recommended for production. Prefer `astro-og-canvas`.

### SvelteKit — Satori in `+server.ts`

SvelteKit has no first-class convention, but the pattern is simple: a `+server.ts` endpoint that imports `satori`, `satori-html`, `@resvg/resvg-js`, and returns `image/png`. ([Geoff Rich guide](https://geoffrich.net/posts/svelte-social-image/), [The Ether tutorial](https://dev.to/theether0/dynamic-og-image-with-sveltekit-and-satori-4438))

```ts
// src/routes/og/[slug]/+server.ts
import satori from 'satori';
import { html as toReactElement } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { read } from '$app/server';
import interRegular from '$lib/fonts/Inter-Regular.ttf?url';

export const GET = async ({ params, fetch }) => {
  const fontData = await (await fetch(interRegular)).arrayBuffer();
  const markup = toReactElement(`
    <div style="display:flex;width:100%;height:100%;background:#111;color:#fff;padding:60px;font-family:Inter;">
      <h1 style="font-size:72px">${escape(params.slug)}</h1>
    </div>`);
  const svg = await satori(markup, {
    width: 1200, height: 630,
    fonts: [{ name: 'Inter', data: fontData, weight: 400, style: 'normal' }],
  });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' },
  });
};
```

For a more idiomatic Svelte API, `@ethercorps/sveltekit-og` wraps this pattern so you can author OG layouts as Svelte components. ([sveltekit-og.dev](https://sveltekit-og.dev/))

### Nuxt / Remix / Hono / Bare Node

- **Nuxt**: `nuxt-og-image` module — same Satori stack, plus a Vue component authoring API.
- **Remix**: add a `loader` that returns the PNG; use `@vercel/og` directly (Remix's Node adapter works, but edge adapters need the wasm variant).
- **Hono / bare Node**: `satori` + `@resvg/resvg-js` directly. For Cloudflare Workers/Deno, import `satori` + `@resvg/resvg-wasm` (wasm variant required).

## Satori / Vercel-OG Deep Dive

### Pipeline

```
JSX (React elements)
   │
   ▼
Satori ─── Yoga (React Native's flexbox engine) ──► SVG
   │
   ▼
resvg (Rust, via native bindings or wasm) ──► PNG bytes
   │
   ▼
ImageResponse → edge cache → social crawler
```

Satori ([vercel/satori](https://github.com/vercel/satori)) is a pure-JS layout engine that takes React elements, runs Yoga flexbox, rasterizes text via TrueType/OpenType parsing, and emits a single SVG document. `@vercel/og` wraps Satori + resvg-wasm into a single `ImageResponse(jsx, options)` API that works identically in Node and Edge runtimes. ([Vercel launch post](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images))

### Performance Envelope

Vercel's own numbers ([launch post](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images)):
- **5× faster** than previous Chromium-based OG services (P99 TTFB 4.96s → 0.99s; P90 4s → 0.75s).
- **~160× cheaper** on edge vs. running headless Chrome in a serverless function.
- **500 KB** cold start payload vs. ~50 MB for Chromium.

### Constraints (Read This Before Designing)

Satori supports a **strict subset of CSS**. The gotchas that burn teams:

- **Only `display: flex` and `display: none`.** Every parent with children must explicitly set `display: flex`. Default flex direction is `row` (unlike browser `block`). ([DeepWiki: Flexbox Layout](https://deepwiki.com/vercel/satori/4.2-flexbox-layout))
- **No CSS Grid, no floats, no `z-index`, no 3D transforms, no `::before`/`::after`, no media queries, no CSS variables, no keyframe animations, no pseudo-selectors.** ([DeepWiki: Supported Properties](https://deepwiki.com/vercel/satori/4.1-supported-properties))
- **No external stylesheets.** Styles must be inline `style={{ ... }}` or Tailwind via the `tw` prop.
- **Tailwind via `tw={"..."}` prop**, not `className`. Only a subset of utilities resolves — flexbox, spacing, colors, typography work; grid, animation, variants do not.
- **Fonts must be embedded as `ArrayBuffer`.** Default font is Noto Sans (subset bundled). Custom fonts are passed via `fonts: [{ name, data, weight, style }]`. Subset your TTFs — full Inter is ~800 KB and blows edge cold-start budgets. ([@vercel/og reference](https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-api))
- **Emoji**: pass `emoji: 'twemoji' | 'blobmoji' | 'noto' | 'openmoji' | 'fluent' | 'fluentFlat'` to `ImageResponse` options; Satori will fetch the right glyph PNG per codepoint.
- **Images must be raster** (PNG/JPEG) and embedded as URLs that the function can fetch. SVG support exists but is limited; prefer PNG.
- **`position: absolute`** works only inside a flex container; the parent must have `position: relative` and `display: flex`.

### Runtime Tradeoffs: Edge vs. Node

| | Edge Runtime (Vercel/Cloudflare) | Node.js Runtime |
|---|---|---|
| Cold start | ~50ms | 200–500ms |
| Memory cap | typically 128 MB | 1–3 GB |
| DB/ORM access | limited (fetch only) | full |
| `@resvg/resvg-js` (native) | ❌ | ✅ |
| `@resvg/resvg-wasm` | ✅ (with caveats*) | ✅ |
| Custom native image libs (sharp) | ❌ | ✅ |

*Edge wasm caveats: some runtimes (Cloudflare Workers, Vercel Edge until recently) block dynamic `WebAssembly.instantiate`. Use static wasm imports via `unwasm` or the runtime's wasm-module import syntax. ([resvg-js #307](https://github.com/thx/resvg-js/issues/307), [#382](https://github.com/thx/resvg-js/issues/382))

**Rule of thumb:** if your OG generation needs a database read, use Node runtime; if it needs only a slug → template mapping, use Edge for ~10× lower cost and ~5× faster cold start.

### Static vs. On-Demand vs. Build-Time Pre-Gen

| Strategy | When | Cost | Freshness |
|---|---|---|---|
| **Static PNG in `public/og-default.png`** | single fallback | 0 | stale |
| **Build-time pre-gen** (script writes N PNGs) | <1000 pages, rarely changes | CI time | rebuild required |
| **On-demand + immutable edge cache** (`@vercel/og` default) | dynamic, per-URL | ~$0/year at scale | auto-invalidates on deploy (URL includes build hash) |
| **On-demand + KV cache + stale-while-revalidate** | user-generated content | cheap | near-real-time |

The `@vercel/og` default — on-demand generation, `cache-control: public, immutable, max-age=31536000` — is the correct choice for >95% of sites. The URL should include a content hash or `updated_at` timestamp so that editing the post busts the cache: `/og/blog/my-post?v=1713561600`.

## AI-Hero + Template-Shell Hybrid Pattern

The prompt-to-asset's sweet spot is a **two-layer OG image**:

1. **Hero layer** (background, full 1200×630): AI-generated or curated illustration/photograph. Generated once per post, stored in blob storage, referenced by URL. Quality can be variable; the shell compensates.
2. **Shell layer** (foreground, deterministic): Satori JSX rendering title, author avatar, logo, date, category pill, gradient scrim. Pixel-perfect, on-brand, text-safe.

Why this split wins:

- **AI models are bad at rendering tight typography** — headings clip, kerning breaks, text hallucinates. Keep all text in the shell.
- **AI models are great at evocative backgrounds** — abstract, on-theme imagery that makes the card feel editorial rather than templated.
- **Brand consistency is enforced by the shell** — logo position, font, color system never drift even if the hero varies.
- **Swappable engines** — the hero can be Gemini Imagen, DALL·E, Flux, a stock photo, or a gradient; the shell doesn't care.

### Implementation Sketch

```tsx
export default async function Image({ params }) {
  const post = await fetchPost(params.slug);
  const heroUrl = post.ogHero ?? FALLBACK_GRADIENT_URL;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
        <img src={heroUrl} width={1200} height={630} style={{ position: 'absolute', inset: 0, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)' }} />
        <div style={{ position: 'absolute', left: 64, right: 64, bottom: 56, display: 'flex', flexDirection: 'column', color: 'white' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>{post.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, fontSize: 26 }}>
            <img src={LOGO_URL} width={40} height={40} />
            <span>yourbrand.dev</span>
            <span style={{ marginLeft: 'auto' }}>{post.date}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### Hero Generation Prompting (for the prompt-to-asset)

When the asset-generation agent is asked for "OG hero for blog post about X", it should:

1. **Enforce 1200×630 framing** — models that accept aspect ratio hints (Imagen, Flux, Midjourney `--ar 1200:630` or `--ar 20:11`) should be fed those.
2. **Request negative-space-biased composition** — the bottom half will be overlaid by a gradient scrim and typography, so the subject should bias to upper-left or center-top with the bottom being atmospheric.
3. **Avoid text rendering in the hero** — prompt should include `no text, no logos, no typography, no letters, no watermarks` in negative terms.
4. **Specify color harmony** — provide the brand palette hex values so the hero harmonizes with the shell.
5. **Prefer abstract/illustrative over photorealistic** with a known subject — photorealism of specific things (people, products) invites misidentification; abstract illustration unfurls more forgivingly at small sizes.

### Fallback Strategy (Critical)

Every dynamic OG pipeline needs a 4-level fallback chain:

1. **Cached pre-rendered PNG** for this exact slug/URL.
2. **Live Satori render** with the AI hero.
3. **Live Satori render** with a deterministic gradient (if hero fetch fails or times out — set a 500ms budget).
4. **Static `public/og-default.png`** referenced from `<meta property="og:image">` if the endpoint itself 5xx's.

Always fall back *fast* — social crawlers often have 5-second timeouts; a slow OG is a missing OG. Wrap the hero fetch in `Promise.race([fetchHero(), timeout(500)])` and fall to the gradient on timeout.

## Debugging Social Unfurls

### The Cache Problem

Every major platform caches `og:*` metadata for **7–30 days** keyed on URL. The first share burns a snapshot. Re-deploying a fix does not invalidate it. You must **force-rescrape** through each platform's debugger:

| Platform | Debugger URL | Cache TTL | Rescrape Mechanism |
|---|---|---|---|
| Facebook / Instagram / Threads | [developers.facebook.com/tools/debug/sharing](https://developers.facebook.com/tools/debug/sharing) | ~30 days | "Scrape Again" button (requires FB login) |
| X / Twitter | Card Validator (official tool permanently retired; no replacement from X). Third-party alternatives: [socialrails.com/free-tools/x-tools/card-validator](https://socialrails.com/free-tools/x-tools/card-validator), [opentweet.io/tools/x-card-validator](https://opentweet.io/tools/x-card-validator), or simply post the link in a private test reply and inspect. | 7 days | no official rescrape; post in a private reply or use a third-party validator |
| LinkedIn | [linkedin.com/post-inspector](https://www.linkedin.com/post-inspector/) | 7 days | Inspect URL; auto-rescrapes |
| Slack | No public debugger | ~1 hour per workspace | `/remind me to unfurl` workaround, or append `?_=1` to URL |
| Discord | No public debugger | ~24 hours | append `?v=N` query param |
| iMessage / WhatsApp / Telegram | No debugger; client-side fetch | varies (iMessage: per-device) | unique URL or query param |

### Third-Party Tools

- **[opengraph.xyz](https://www.opengraph.xyz/)** — renders previews for FB, X, LinkedIn, Slack, Discord, iMessage side-by-side without requiring login; includes an AI OG image generator for quick placeholders.
- **[socialrails.com/free-tools/x-tools/card-validator](https://socialrails.com/free-tools/x-tools/card-validator)** and **[opentweet.io/tools/x-card-validator](https://opentweet.io/tools/x-card-validator)** — third-party X/Twitter card validators that fill the gap left by the retired official Card Validator.
- **[opengraphviewer.com](https://opengraphviewer.com/)** — similar multi-platform preview, no-login.
- **[metatags.io](https://metatags.io/)** — live-edit meta tags and preview; good for prototyping tag copy.
- **[share-preview.com](https://share-preview.com/)** — browser extension + web tool, shows cropped previews per platform.
- **curl the UA** — simulate a crawler locally:
  ```
  curl -A "facebookexternalhit/1.1" https://yoursite.com/post -I
  curl -A "Twitterbot/1.0" https://yoursite.com/post
  curl -A "LinkedInBot/1.0" https://yoursite.com/post
  curl -A "Slackbot-LinkExpanding 1.0" https://yoursite.com/post
  ```

### Common Failure Modes (and Fixes)

1. **Image appears cropped / wrong aspect** → you declared `og:image:width/height` but served a different size. Fix the declared dims or the image.
2. **No large preview on LinkedIn** → image is <1200 px wide. LinkedIn silently falls back to small thumbnail.
3. **Image is blurry on Retina** → you're serving a 600×315. Always serve 1200×630 (or 2× = 2400×1260 for premium brands, within 5 MB cap).
4. **Image is missing on Slack** → URL is relative, or the image lives behind an auth cookie, or Slack's crawler (`Slackbot-LinkExpanding`) is being blocked by WAF/bot-detection. Whitelist the UA.
5. **Wrong image after content edit** → cache hasn't invalidated. Either force-rescrape via platform debugger, or include a version hash in the OG image URL (`/og/post-123?v=abc123`) so the URL itself changes.
6. **`opengraph-image.tsx` doesn't unfurl in dev** → local dev server isn't HTTPS or not publicly reachable. Use `ngrok` / Cloudflare Tunnel to expose, then test with opengraph.xyz.
7. **Emoji rendering as tofu boxes** → Satori needs an explicit `emoji` option passed to `ImageResponse`, or the default Noto Sans font subset doesn't include that codepoint.
8. **Fonts fall back to Noto** → you passed `font-family: 'Inter'` but didn't register Inter in the `fonts` array, or the registered weight doesn't match the weight in CSS.

### Pre-Flight Checklist

Before any launch, for a representative URL:

- [ ] `curl -I` returns 200 and `content-type: image/png`.
- [ ] Image is exactly 1200×630, ≤5 MB, PNG or JPEG (WebP has partial-but-inconsistent support on LinkedIn; AVIF is unsafe for OG; SVG is never supported — stick with PNG/JPEG for maximum compatibility).
- [ ] All 5 `og:*` + 4 `twitter:*` tags present with absolute HTTPS URLs.
- [ ] `og:image:alt` and `twitter:image:alt` set to a human-readable description.
- [ ] Rendered by opengraph.xyz with no warnings.
- [ ] Facebook Sharing Debugger "Scrape Again" shows correct image.
- [ ] LinkedIn Post Inspector shows large card.
- [ ] Test tweet on a private X account displays `summary_large_image`.
- [ ] Pasted into Slack, Discord, iMessage shows image within 2s.
- [ ] Cached at the edge — second request is ≤100ms.

## References

**Specifications**
- Open Graph protocol — https://ogp.me/
- Facebook Sharing / Webmasters Images — https://developers.facebook.com/docs/sharing/webmasters/images/
- X / Twitter `summary_large_image` — https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image
- X / Twitter Cards getting started — https://developer.x.com/en/docs/twitter-for-websites/cards/guides/getting-started

**Libraries**
- `@vercel/og` package — https://www.npmjs.com/package/@vercel/og
- `satori` — https://github.com/vercel/satori
- Satori supported properties (DeepWiki) — https://deepwiki.com/vercel/satori/4.1-supported-properties
- Satori flexbox layout (DeepWiki) — https://deepwiki.com/vercel/satori/4.2-flexbox-layout
- `@resvg/resvg-js` — https://www.npmjs.com/package/@resvg/resvg-js
- `@resvg/resvg-wasm` — https://www.npmjs.com/package/@resvg/resvg-wasm
- `astro-og-canvas` — https://github.com/delucis/astro-og-canvas
- `sveltekit-og` — https://sveltekit-og.dev/
- `nuxt-og-image` — https://nuxtseo.com/og-image

**Framework Docs**
- Next.js `opengraph-image` convention — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
- Next.js Metadata & OG images getting started — https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- Vercel OG Image generation docs — https://vercel.com/docs/functions/edge-functions/og-image-generation
- Vercel launch blog — https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images

**Debuggers**
- Facebook Sharing Debugger — https://developers.facebook.com/tools/debug/sharing
- LinkedIn Post Inspector — https://www.linkedin.com/post-inspector/
- opengraph.xyz — https://www.opengraph.xyz/
- opengraphviewer.com — https://opengraphviewer.com/
- metatags.io — https://metatags.io/
- share-preview.com — https://share-preview.com/

**Community writeups**
- "Dynamic OG image with SvelteKit and Satori" — https://dev.to/theether0/dynamic-og-image-with-sveltekit-and-satori-4438
- Geoff Rich — "Create dynamic social card images with Svelte components" — https://geoffrich.net/posts/svelte-social-image/
- share-preview OG guide 2026 — https://share-preview.com/blog/og-tags-complete-guide
- OGImage.io — OG image size per platform — https://ogimage.io/resources/og-image-size
- Open Graph image guide — https://og-image.org/learn
- Don't forget OG alt text — https://swimburger.net/blog/web/dont-forget-to-provide-image-alt-meta-data-for-open-graph-and-twitter-cards-social-sharing

**Issues worth knowing**
- resvg-wasm on Vercel Edge — https://github.com/thx/resvg-js/issues/382
- resvg-wasm on Cloudflare Workers — https://github.com/thx/resvg-js/issues/307
- Satori should error on unsupported CSS — https://github.com/vercel/satori/issues/41
