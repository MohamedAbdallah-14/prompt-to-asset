---
title: "Adjacent Web Assets — Email, Chat Apps, README/Badges, 404 & Status Pages"
category: 11-favicon-web-assets
angle: 11c
slug: adjacent-web-assets-email-chat-readme
tags:
  - email-design
  - slack-icon
  - discord-avatar
  - github-social-preview
  - readme-dark-mode
  - shields-io
  - og-image
  - edge-generation
  - 404-illustration
  - status-page
last_updated: 2026-04-19
word_count_target: 2500-3500
---

# Adjacent Web Assets: Email, Chat Apps, README, Badges & Status/Error Pages

## Executive Summary

Favicons and OG cards are only the *front door* of a product's visual surface. Every shipped app also accretes a long tail of **adjacent web assets** that most AI-generation workflows ignore: transactional email headers, Slack/Discord integration icons, GitHub repo social previews, README hero banners and badge art, status-page avatars, and 404/maintenance illustrations. Each of these has its own size, aspect-ratio, colour-space and *rendering-context* constraints, and getting them wrong produces failures that are immediately visible to users and fellow developers (stretched Slack icons in a workspace sidebar, clipped Outlook email headers, dark-mode README banners invisible on white, OG images cropped mid-logo on LinkedIn).

The three constraints that dominate this category:

1. **Rendering environments are hostile and non-uniform.** Outlook's Word-based rendering engine ignores CSS `background-image`, Gmail clips HTML over ~102 KB, Slack masks avatars to rounded squares, Discord masks to circles, GitHub crops OG images to 1200×600 presentation even when they're stored at 1280×640.
2. **Dark mode is now first-class.** GitHub READMEs, Slack, Discord, Notion embeds and most email clients ship dark UI. Assets that look crisp on white often *disappear* on charcoal. The `<picture><source media="(prefers-color-scheme: dark)">` pattern is the canonical fix for READMEs; email has no equivalent and needs a transparent PNG with a mid-grey stroke instead.
3. **Edge-generated images are the new default.** `@vercel/og`, `workers-og` and Satori have made HTML/CSS → PNG generation a commodity. For adjacent assets (especially OG/social-share/status-page imagery) the "right" prompt-to-asset output is frequently *code* (a JSX template) rather than a raster prompt to a diffusion model.

This brief catalogs the spec-per-asset, the email-specific pitfalls, the README dark-mode trick, and a per-asset assessment of where generative AI is actually the best tool versus where code-gen or template systems dominate.

## Asset Type Catalog

### 1. Transactional / marketing email header & signature images

- **Container width:** 600 px (historically) to 640 px maximum body width. Any wider triggers horizontal scroll in smaller Outlook preview panes and on some mobile clients. Gmail additionally *clips* messages whose HTML exceeds ~102 KB, which affects header artwork encoded as inline SVG or long data URIs.([Markaplugin 2026](https://markaplugin.com/blog/html-email-best-practices-2026))
- **Header image:** typically 600×200 px (3:1) at 2× (so export 1200×400 PNG) with `style="width:100%;max-width:600px;height:auto;display:block"`. Always include `alt`, `width`, `height` attributes — Outlook *requires* integer `width`/`height` attributes to reserve space before image download.
- **Signature image:** 400–500 px wide at 2× (800–1000 px exported), PNG-24 on white, under ~40 KB to survive corporate mail gateways that reject attachments > 50 KB.
- **Format:** PNG or JPG. **GIF is tolerated** but animated GIFs do not play in Outlook 2013+ (first frame only). **WebP** is unsupported in Outlook, Yahoo Mail desktop, and several mobile clients; avoid. **SVG in email is effectively unsupported** in Outlook Windows and Gmail webmail.
- **No `srcset`**: major email clients strip or ignore `srcset`/`sizes`; deliver a single, pre-optimised 2× PNG and let `max-width:100%` handle the mobile step-down.([Mailtrap 2026](https://mailtrap.io/blog/responsive-email-design/))
- **No CSS `background-image`** in Outlook Windows. If you need a hero with text over imagery, either flatten the whole hero into a single PNG with baked-in text, or use VML fallback (`<!--[if gte mso 9]>…<v:rect>…`) — a notorious pain point.([Email on Acid](https://emailonacid.com/blog/article/email-development/html-background-images-in-email))
- **Alt text** is mandatory because many clients block remote images by default; set a readable alt and consider `style="color:#111;font-family:…;font-size:18px;"` on the `<img>` so the alt renders as styled text when the image fails.

### 2. Slack app icon

- **Size:** 512×512 px minimum for the App Directory submission; many developers upload 1024×1024 for Retina clarity. Slack's submission checklist explicitly states "high quality, distinctive" and that the icon **must not** resemble Slackbot or contain the Slack mark.([slackhq/slack-api-docs checklist](https://github.com/slackhq/slack-api-docs/blob/master/page_slack_apps_checklist.md))
- **Shape:** Slack crops app icons into a **rounded square** in the sidebar/integration list. Keep the subject inside an ~88% central safe zone.
- **Background:** Transparent PNG is accepted, but Slack recommends a filled, high-contrast background because the sidebar switches between light and dark themes and transparent icons can "vanish" on dark. Either ship a solid-fill version, or supply two variants (light/dark-aware) and upload whichever matches your brand against both themes.
- **Format:** PNG-24 with alpha. No SVG upload (as of 2026).

### 3. Discord bot / app avatar

- **Size:** **128×128 px minimum, 512×512 px recommended**; max file size 8 MB.([Pixotter Discord size guide 2026](https://pixotter.com/blog/discord-image-size/))
- **Shape:** Discord always **masks to a circle** in the client UI. Keep the subject within a 90% diameter circle; avoid corner details.
- **Format:** PNG/JPG/GIF. **Animated GIF avatars require Nitro**, so for a bot's default identity prefer static PNG-24 with alpha.
- **Server (guild) icon:** distinct asset, 512×512 recommended, also circle-masked. Server banner is 960×540, not circle-masked.

### 4. GitHub repository social preview

- **Size:** **1280×640 px recommended, 640×320 minimum, 2:1 aspect ratio, <1 MB**, PNG/JPG/GIF.([GitHub Docs — Customizing your repository's social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview))
- **Presentation:** GitHub's own OG card renders at roughly 1200×600, and downstream consumers (Twitter, LinkedIn, Slack, Discord) crop further. Keep important text/logo inside a central ~1040×520 safe area.
- **Transparency:** PNG alpha is accepted but consumers composite against unpredictable backgrounds — GitHub's docs recommend a solid background unless the asset has been tested on white, dark, and brand accent contexts.
- **Upload path:** Repo *Settings → General → Social preview*. The same asset is reused by Twitter/LinkedIn via `og:image` when the repo is shared.

### 5. README hero banner / inline art

- **Width:** Render at **800–1280 px** wide. GitHub's main column caps around 1012 px on desktop, so 1200 px renders 1:1 on Retina with no layout overflow.
- **Embed form:** prefer `<img src="…" width="720" alt="…">` with an explicit `width` so Retina sources downscale crisply rather than the default "natural" rendering.
- **Dark-mode toggle:** use `<picture>` with `prefers-color-scheme` media sources (see *Dark-Mode Tricks* below).
- **Format:** PNG for flat UI / screenshots, SVG for diagrams (GitHub sanitises SVG so JS/foreignObject are stripped — keep it to plain shapes + text). AVIF is not yet rendered reliably on github.com's `camo` image proxy as of early 2026; stick to PNG/JPG/SVG/GIF.

### 6. Badges (shields.io + custom)

- **Default shields.io badges** are SVGs served with aggressive caching from `img.shields.io`. They come in several `style=` variants: `flat` (default), `flat-square`, `plastic`, `for-the-badge`, `social`.
- **Custom endpoint badges:** shields.io will render any JSON endpoint that matches the schema `{ schemaVersion: 1, label, message, color, labelColor, namedLogo, logoSvg, style, cacheSeconds }` with `cacheSeconds` ≥ 300.([shields.io endpoint docs](https://shields.io/endpoint))
- **Logo integration:** `namedLogo` accepts any [simple-icons](https://simpleicons.org/) slug; for a proprietary brand mark, supply `logoSvg` as a URI-encoded SVG under ~8 KB.
- **Self-hosted badge art:** a small Cloudflare Worker (~30 lines) that returns SVG with `Content-Type: image/svg+xml; charset=utf-8` and `Cache-Control: public, max-age=300, s-maxage=3600` is the idiomatic pattern and is documented in community tutorials.([Zenn — Creating custom badges with Shields.io and Cloudflare Workers](https://zenn.dev/mnonamer/articles/cf-workers-badge?locale=en))

### 7. Status-page assets

- **Provider logo** for statuspage.io / Instatus / BetterStack: 400×100 px (4:1) at 2×, transparent PNG. Displayed at top-left above component list.
- **Favicon for the status page**: usually reused from main app (32×32 ICO + 180×180 apple-touch), served from the provider's CDN.
- **Component / service icons:** not always supported, but BetterStack and custom status pages allow 48×48 px PNG per service; keep them monochrome so they match both incident (red/yellow) and healthy (green) tinting.
- **Incident illustration / OG image:** 1200×630 OG card with incident title overlay is an increasingly common pattern — this is the prime use case for edge generators (`@vercel/og`/`workers-og`).

### 8. 404 and maintenance-page illustrations

- **Aspect & width:** Typically rendered at 400–600 px wide, centred in a viewport. Export at 1200×900 px (4:3) or 1600×1000 px (16:10) at 2× for Retina, then constrain via CSS.
- **Format:** SVG is preferred — 404 illustrations are usually flat-vector character scenes and SVG is infinitely scalable + themeable (`currentColor`, CSS variables).
- **Dark-mode behaviour:** bake palette into CSS variables or export twin SVGs and swap with `prefers-color-scheme`.
- **Accessibility:** decorative illustrations should carry `role="img"` and a short `<title>` inside the SVG; pair with a textual headline ("We can't find that page") so screen-reader users get meaningful content even when the graphic is decorative.

## Email-Specific Constraints (the landmines)

Email remains the single most brutal rendering target for generated imagery. A practical checklist the prompt-to-asset should encode:

- **Width ≤ 600 px** (or 640 px if the template is known Hotmail/Outlook-free). Export at 2× (1200 px) and scale down with `max-width:100%;height:auto` inside a `<table>` cell with `width="600"`.([Textmagic 2025 HTML email best practices](https://textmagic.com/blog/html-email-best-practices))
- **Table-based layout is mandatory.** Divs plus flexbox collapse in Outlook. This means any AI-generated "email hero" should be a single flattened PNG, not a composition of layered elements.
- **No CSS `background-image` in Outlook Windows.** If the request is "email header with a gradient and white overlaid logo," flatten to a single PNG. If a live text overlay is required, generate the gradient as PNG *and* provide VML fallback in the HTML.
- **No `srcset`/`picture`/`@media` art direction in Gmail & Outlook.** Deliver a single 2× PNG; do not expect a second art-directed asset to be picked up for mobile.
- **`alt` is a first-class citizen.** Roughly 40% of corporate inboxes block remote images by default. Always supply `alt`, and for header branding also style the `img` so the alt text renders as readable, brand-coloured text.
- **File size discipline.** Stay under 40 KB per image and under 102 KB total HTML to avoid Gmail clipping — when the Gmail "[Message clipped]" link appears, OG preview generators and reply threading both break.
- **Avoid transparent PNG against unknown backgrounds.** Dark-mode Outlook 365 inverts some colours; a transparent dark-navy logo can end up dark-on-dark. Use a solid background or a "outlined" variant with a thin mid-grey stroke to stay legible on both white and dark.
- **Animated GIF:** first frame only in Outlook 2007+; design the first frame to convey the whole message.
- **Retina:** export at 2× the rendered dimension; the `width`/`height` HTML attributes should be the *displayed* size, while the actual image pixels are 2× that.

## Dark-Mode Tricks for README & GitHub Surfaces

### The canonical `<picture>` pattern

GitHub's own blog documents this as the recommended pattern for README art direction.([GitHub Blog — dark/light mode images in Markdown](https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/))

```html
<picture>
  <source media="(prefers-color-scheme: dark)"  srcset="./docs/hero-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="./docs/hero-light.png">
  <img alt="Product hero — a dashboard screenshot" src="./docs/hero-light.png" width="720">
</picture>
```

Notes:

- GitHub's Markdown renderer allows raw `<picture>`, `<source>`, `<img>` tags. `<img>` inside `<picture>` **must** carry an `alt` for accessibility and for the Markdown sanitiser to keep it.
- Image widths use the `width` HTML attribute on `<img>`, not CSS (GitHub strips inline `style`).
- For single-image READMEs that still need to adapt, a hacky alternative uses URL fragment `#gh-dark-mode-only` / `#gh-light-mode-only`, but this is GitHub-specific and breaks when the README is mirrored on npm/crates.io/GitLab; the `<picture>` approach is portable.

### Dark-mode-safe monochrome art

For logos shown inside READMEs:

- Prefer SVG with `fill="currentColor"` and embed inside `<svg>` blocks via HTML. GitHub CSS sets `color` based on theme, so `currentColor` flips automatically.
- For raster logos, export a **light mode** variant with dark ink on transparent and a **dark mode** variant with light ink on transparent. Do not rely on browser-side "invert" filters — they desaturate brand colour.

### Badge + logo hygiene

- Badges rendered via shields.io pick up the requested `style=flat` automatically; they have no dark-mode awareness but their built-in palette is tuned to be legible on both backgrounds.
- When composing a badge row, insert a single space between badges in the Markdown source so GitHub doesn't collapse them into one OG-card-unfriendly wide image.

## AI-Generation Fit Per Asset Type

| Asset | Good AI fit? | Best generator tier | Why |
|---|---|---|---|
| Email header illustration | ✅ for the illustration itself | Imagen / gpt-image / MJ → flatten to PNG | Single PNG, wide-aspect, no transparency issues if emitted as flat PNG |
| Email signature headshot / avatar | ⚠️ variable | Photo retouch tools or photoreal models | Photoreal + sharp small text is hard; cropping to 256×256 circle simplifies |
| Slack app icon | ✅ | Any logo-capable model (Recraft, Ideogram, MJ v7) | 512×512 flat mark with strong silhouette |
| Discord bot avatar | ✅ | Same as Slack, but test circle crop | Circle-safe composition; centre the subject |
| GitHub social preview (1280×640) | ⚠️ mixed | **Code-gen preferred** (`@vercel/og`/Satori) | Needs exact typography (repo name, tagline). Use JSX template; optionally AI-generate the background illustration only |
| README hero banner | ✅ for illustrative; ⚠️ for screenshots | Hybrid: AI art behind, real screenshot composited | Screenshots must be real; AI is best for decorative frames |
| Badge art (logo slug / custom logo) | ✅ | Vector/SVG generator (Recraft v3 SVG) | Needs clean SVG under ~8 KB; raster diffusion is wrong tier |
| Status-page logo | ✅ | Same as brand logo generator | 4:1 aspect, transparent PNG |
| Status-page incident OG | ❌ | Code-gen (Satori template) | Dynamic text over static background |
| 404 illustration | ✅✅ | SVG-capable model (Recraft) or raster → auto-trace | Hero use case: single illustration, brand-adjacent, reused for months |
| Maintenance page illustration | ✅ | Same as 404 | Often paired with a short headline + CTA |

**Heuristic for the enhancer:** when the prompt is "make me an OG card for X", prefer **emitting Satori/`@vercel/og` JSX** rather than a diffusion prompt. When the prompt is "make me a 404 illustration", prefer an **SVG-native model** and fall back to raster-plus-vectorize. When it is "email header art", emit a raster prompt with explicit "single flattened PNG, baked-in lighting, safe on both white and #0b0b0b backgrounds, no transparency" guardrails.

## Edge-Generation Primer (Vercel OG, workers-og, Satori)

Since an estimated majority of adjacent-asset traffic (OG cards, status incidents, shareable dashboards) is now generated on demand at the edge, the prompt-to-asset's "code" track should know these primitives:

- **`@vercel/og`** wraps Satori + resvg in a Vercel Edge / Node runtime. Input is React JSX + a subset of CSS Flexbox; output is a PNG at any size (commonly 1200×630 for OG, 1280×640 for GitHub, 800×418 for Twitter summary-large-image).([Vercel — Introducing OG Image Generation](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images))
- **Cost/perf:** Vercel measured P99 TTFB of ~0.99 s and ~160× lower cost vs Chromium+Puppeteer; the library is ~500 KB versus 50+ MB for a headless-browser pipeline.
- **`workers-og`** (326★) and the newer `cf-workers-og` (Satori 0.18.3 + Yoga 3.2.1) replicate the same API on Cloudflare Workers, with WASM preloading to avoid Workers' dynamic-compilation restrictions.([kvnang/workers-og](https://github.com/kvnang/workers-og))
- **Common pitfalls** when running Satori on Workers: external images cannot be auto-fetched — you must pre-fetch and embed as base64 data URLs; large base64 blobs can break `satori-html` parsing; static WASM imports must go through wrangler's bundler.([DEV — 6 Pitfalls of Dynamic OG on Cloudflare Workers](https://dev.to/devoresyah/6-pitfalls-of-dynamic-og-image-generation-on-cloudflare-workers-satori-resvg-wasm-1kle))
- **Font pipeline:** Satori supports custom fonts loaded from ArrayBuffer. Ship the minimal subset (Latin-1 + whichever symbols you render) to stay under the Workers 1 MB (free) / 10 MB (paid) script-size limit.

## References

- GitHub Docs — *Customizing your repository's social media preview* — <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview>
- The GitHub Blog — *How to make your images in Markdown adjust for dark/light mode* — <https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/>
- Slack — *Upload a Slack icon* — <https://slack.com/help/articles/204379773>
- slackhq/slack-api-docs — *App Directory checklist* — <https://github.com/slackhq/slack-api-docs/blob/master/page_slack_apps_checklist.md>
- Pixotter — *Discord Image Size: every dimension (2026)* — <https://pixotter.com/blog/discord-image-size/>
- Linearity — *Discord size guide 2026* — <https://linearity.io/blog/discord-size-guide>
- Markaplugin — *HTML Email Best Practices 2026* — <https://markaplugin.com/blog/html-email-best-practices-2026>
- Mailtrap — *Responsive Email Design (2026)* — <https://mailtrap.io/blog/responsive-email-design/>
- Textmagic — *HTML Email Checklist: 2025 Best Practices* — <https://textmagic.com/blog/html-email-best-practices>
- Email on Acid — *HTML Email Background Image Optimization* — <https://emailonacid.com/blog/article/email-development/html-background-images-in-email>
- Stack Overflow Design — *Email: Images* — <https://stackoverflow.design/email/components/images/>
- Shields.io — *Endpoint Badge schema* — <https://shields.io/endpoint>
- Zenn / mnonamer — *Creating Custom Badges with Shields.io and Cloudflare Workers* — <https://zenn.dev/mnonamer/articles/cf-workers-badge?locale=en>
- Simple Icons — brand icon catalog used by shields.io `namedLogo` — <https://simpleicons.org/>
- Vercel — *Introducing OG Image Generation* — <https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images>
- Vercel Docs — *Open Graph (OG) Image Generation* — <https://vercel.com/docs/functions/og-image-generation>
- vercel/satori — <https://github.com/vercel/satori>
- kvnang/workers-og — <https://github.com/kvnang/workers-og>
- jillesme/cf-workers-og — <https://github.com/jillesme/cf-workers-og>
- DEV Community — *6 Pitfalls of Dynamic OG Image Generation on Cloudflare Workers* — <https://dev.to/devoresyah/6-pitfalls-of-dynamic-og-image-generation-on-cloudflare-workers-satori-resvg-wasm-1kle>
- Sam Sycamore — *Add light and dark mode images to your GitHub readme* — <https://blog.sycamore.garden/github-light-dark-mode-images>
- Kera Cudmore — *GitHub README images based on prefers-color-scheme* — <https://www.keracudmore.dev/posts/2025-07-21/>
