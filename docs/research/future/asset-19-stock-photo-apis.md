# Free Stock Photo / Media APIs — for `prompt-to-asset`

Scope: APIs usable as reference inputs (IP-Adapter style refs), OG image backgrounds, hero mockups, demo assets. Focus on auth, free-tier limits, license/attribution, search parameters, URL stability (hotlink vs. cache), and Node.js SDKs.

Research date: 2026-04. Current year notes are called out where policies are known to shift.

---

## 1. Unsplash API

- **Base URL:** `https://api.unsplash.com/`
- **Docs:** https://unsplash.com/documentation
- **Auth:** Access Key via header `Authorization: Client-ID <ACCESS_KEY>` (OAuth also available for user-scoped actions). Register an app at unsplash.com/developers.
- **Free tier / rate limits:**
  - **Demo mode (default):** 50 req/hour.
  - **Production mode:** 5,000 req/hour after submitting app for review (requires showing proper attribution + compliance).
- **License (for API consumers):** Unsplash License allows commercial use, but API guidelines **require attribution** (photographer + Unsplash link with UTM params `?utm_source=<app>&utm_medium=referral`) — this is stricter than the website's no-attribution-required license. Unsplash+ paid tier content has additional restrictions (no AI training, no template resale); free tier is fine for demo/hero usage but **AI/ML training is discouraged**.
- **Download tracking:** When a user effectively "uses" an image (embed, download, render into final output), you MUST fire a GET to `photo.links.download_location` (auth'd). Not optional.
- **Search params:** `/search/photos?query=&page=&per_page=&orientation=(landscape|portrait|squarish)&color=&content_filter=(low|high)&order_by=(relevant|latest)`.
- **URL stability / hotlinking:** **Hotlinking is REQUIRED.** Must use returned `photo.urls.{raw,full,regular,small,thumb}` URLs directly (served via imgix CDN `images.unsplash.com/...?ixid=...`). URLs are stable; caching on your own origin is not permitted for original images (exception: derivative/remixed works). For companies needing own-infra hosting, Unsplash offers a view-beacon alternative — contact required.
- **Node SDK:** [`unsplash-js`](https://www.npmjs.com/package/unsplash-js) v7.x (~109k weekly downloads). **Archived** — still functional, fetch polyfill needed for Node; TS types included. For new code, a thin `fetch` wrapper is equally viable.

## 2. Pexels API

- **Base URL:** `https://api.pexels.com/v1/` (photos), `https://api.pexels.com/videos/` (videos)
- **Docs:** https://www.pexels.com/api/documentation/
- **Auth:** API key in `Authorization` header. Free signup.
- **Free tier / rate limits:** **200 req/hour, 20,000 req/month** by default. Can be raised to **unlimited free** on request by emailing `api@pexels.com` with attribution proof.
- **License:** Pexels License — free for commercial + personal. Attribution not legally required for end-users, but **API usage requires prominent Pexels link** ("Photos provided by Pexels") + photographer credit where possible.
- **Key restrictions:** No unaltered redistribution, no clones of Pexels' core functionality, **no AI/ML training or dataset collection** without permission. (Relevant if used as IP-Adapter refs at scale.)
- **Search params:** `/search?query=&orientation=(landscape|portrait|square)&size=(large|medium|small)&color=&locale=&page=&per_page=` (max 80/page). Curated: `/curated`. Videos: `/videos/search` with same structure.
- **URL stability:** Returned `src.{original,large2x,large,medium,small,portrait,landscape,tiny}` URLs point to Pexels CDN and are stable; hotlinking is allowed and expected. No explicit "must hotlink" mandate like Unsplash — caching is practically fine.
- **Node SDK:** `node-pexels` v2.x (unofficial, TS types, `got`-based, low weekly downloads but simple).

## 3. Pixabay API

- **Base URL:** `https://pixabay.com/api/` (images), `https://pixabay.com/api/videos/`
- **Docs:** https://pixabay.com/api/docs/
- **Auth:** API key as `?key=` query parameter. Free signup.
- **Free tier / rate limits:** **100 req / 60 seconds** per key. Rate-limit headers (`X-RateLimit-Limit/Remaining/Reset`) returned. 429 on overage. Limit can be increased for well-behaved integrations.
- **License:** **Pixabay Content License** — effectively CC0-equivalent for most use: commercial use OK, no attribution required. Some restrictions: can't sell unmodified copies, can't use identifiable people/brands/logos/artworks in sensitive contexts. Cleaner legal story than Unsplash/Pexels for default use.
- **Search params:** `?key=&q=&lang=&image_type=(all|photo|illustration|vector)&orientation=(all|horizontal|vertical)&category=&min_width=&min_height=&colors=&editors_choice=&safesearch=true&order=(popular|latest)&page=&per_page=` (3–200).
- **URL stability:** Returns `previewURL`, `webformatURL`, `largeImageURL`. Pixabay's terms **require that returned URLs not be used as permanent hotlinks** — you're expected to cache/download the image to your own infra for any sustained serving. This is the opposite of Unsplash. Direct hotlinking of `webformatURL` for temporary display is generally tolerated but not guaranteed stable.
- **Node SDK:** `dderevjanik/pixabay-api` on GitHub (light TS wrapper); many small community wrappers — thin enough that direct `fetch` is usually cleaner.

## 4. Openverse API (successor to CC Search)

- **Base URL:** `https://api.openverse.org/v1/`
- **Docs:** https://api.openverse.org/ (OpenAPI) and https://docs.openverse.org/api/
- **Auth:** OAuth2 client credentials flow. Register app via `POST /auth_tokens/register`, receive `client_id` + `client_secret`, exchange for bearer token at `/auth_tokens/token`. **Anonymous access works but at lower rate.**
- **Free tier / rate limits:** Tiered — **Anonymous**, **Standard** (authenticated), **Enhanced** (requested). Concrete numbers are not published in a stable public doc, but community-observed defaults are ~5 req/hour unauthenticated "burst" + small sustained rate, and on the order of **tens of req/sec** once authenticated. Treat as "generous for demo, request Enhanced for production."
- **License:** Openverse aggregates from Wikimedia, Flickr (CC-licensed), Nappy, Museum collections, etc. Every result carries explicit `license` + `license_version` (CC-BY, CC-BY-SA, CC0, PDM, etc.). **Attribution handling varies per result** — API returns HTML + plain-text attribution strings (`attribution` field). Crucial: downstream code must branch on license. Mixed-license corpus is the main operational cost.
- **Search params:** `/images/?q=&license=(cc0,pdm,by,by-sa,...)&license_type=(commercial,modification,all)&source=(flickr,wikimedia,...)&category=&aspect_ratio=(tall|wide|square)&size=(small|medium|large)&page=&page_size=` (max 20). `/audio/` endpoint also available.
- **URL stability:** Returns `url` (full-size) and `thumbnail`. Thumbnail is served from Openverse's own proxy (`api.openverse.org/v1/images/<id>/thumb/`) and is stable. Full-size `url` points at **source provider** (Flickr CDN, Wikimedia, etc.) and can rot — **cache locally for anything user-facing**.
- **Node SDK:** [`@openverse/api-client`](https://www.npmjs.com/package/@openverse/api-client) — official, actively maintained by the Openverse team (WordPress Foundation), TypeScript-first, generated from OpenAPI spec. Recommended over hand-rolled fetch.

## 5. Wikimedia Commons API

- **Base URL:** `https://commons.wikimedia.org/w/api.php` (MediaWiki Action API) + Commons REST at `https://api.wikimedia.org/core/v1/commons/`
- **Auth:** Not required for read. Optional OAuth for higher limits / user actions. Must set a descriptive `User-Agent` (e.g. `prompt-to-asset/0.1 (contact@example.com)`) — unattributed requests may be blocked.
- **Free tier / rate limits:** No hard per-key limit for anonymous reads; Wikimedia asks for "reasonable" load (~200 req/sec aggregated is way too much; stay under ~10 req/sec sustained, batch where possible). No cost.
- **License:** Mixed — per-file. Mostly CC-BY-SA, CC-BY, CC0, PDM, GFDL. **Attribution almost always required** (author + license + link). License metadata is returned via `prop=imageinfo&iiprop=extmetadata`.
- **Search params (MediaWiki Action API):**
  - Search: `?action=query&list=search&srnamespace=6&srsearch=<query>&format=json`
  - Image info: `?action=query&titles=File:X.jpg&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1024`
- **URL stability:** Direct `upload.wikimedia.org/...` URLs are stable (content-addressed by filename). Hotlinking is permitted but polite practice is to cache for high-traffic uses. Thumbnails via `iiurlwidth` param get pre-generated and cached.
- **Node SDK:** Several community wrappers (`mwn`, `nodemw`, `wikijs`) — general MediaWiki clients, not Commons-specific. Direct `fetch` against the Action API is simplest for this scope.

## 6. StockSnap.io

- **Official API:** **None.** FAQ explicitly says "no API at the moment; contact us for early access list."
- **Unofficial/internal endpoints (observed, unstable, no contract):**
  - `https://stocksnap.io/api/load-photos/date/{asc|desc}/{page}` — returns 40 records with `img_id`, tags, keywords, views, downloads, dimensions.
  - CDN: `https://cdn.stocksnap.io/img-thumbs/{960w|280h}/{img_id}.jpg`
  - Landing page: `https://stocksnap.io/photo/{img_id}`
- **License:** All StockSnap photos are **CC0** — no attribution required, commercial OK. Legally cleanest source in this list.
- **Recommendation:** Do not build production integration against undocumented endpoints. Use as manual asset pull or wait for official API. Openverse indexes StockSnap content anyway.

## 7. CC0 aggregators

### pxhere
- **API:** No public API. ~1M CC0 photos. Scraping is the only path; not recommended for a shipped product.

### rawpixel (free tier)
- **API:** `https://api.rawpixel.com/api/v1/search?freecc0=1&html=0&page=N` — documented by Openverse's integration handbook (they pull rawpixel CC0 content this way). Not a formal public API with terms; use cautiously.
- **License (free-tier only):** CC0. Paid tier is separate and **not** to be hit through this endpoint.

### burst.shopify.com
- **API:** No public/developer API. Offers "Burst Business API" that is a Shopify business application pipeline, not a photo API. Dead end for our use.

## Node.js ecosystem summary

| Package | Provider(s) | Status | Notes |
|---|---|---|---|
| `unsplash-js` | Unsplash | Official but archived | Still works; TS; fetch polyfill needed in Node |
| `node-pexels` | Pexels | Unofficial, maintained | `got`-based, TS types |
| `@openverse/api-client` | Openverse | **Official, actively maintained** | OpenAPI-generated, TS-first |
| `@framers/agentos-ext-image-search` | Unsplash+Pexels+Pixabay | Community | Unified interface w/ provider fallback |
| `@rubixstudios/payload-images` | Same 3 | Payload CMS plugin | Not directly useful unless using Payload |
| `dderevjanik/pixabay-api` | Pixabay | Community, light | Simple wrapper |

No single "meta-SDK" is production-grade. The right shape for `prompt-to-asset` is a small internal `packages/stock-refs/` adapter with one module per provider, standard `fetch`, and a unified result type carrying `{ id, url, thumbUrl, width, height, license, attribution, sourceProvider }`.

---

## Recommendation for `prompt-to-asset`

**Default: Pexels + Pixabay, with Openverse as optional "CC-licensed broader" toggle.**

Rationale:

1. **Pexels as primary hero/demo source.** 200 req/hr (upgradable to unlimited for free) easily covers demo/IP-Adapter ref usage. Large curated corpus of modern, OG-friendly photography. Attribution requirement is simple (one link + photographer credit), URLs are stable for hotlinking, and it offers both photos and videos from one key.
2. **Pixabay as fallback / CC0-clean source.** When the app needs genuinely attribution-free imagery (e.g., generated OG images where we don't want to bake in a "Photo by X on Pexels" credit), Pixabay's CC0-equivalent license is the cleanest. 100 req/min is plenty. Note Pixabay's "cache, don't permalink" policy — plan for local caching.
3. **Skip Unsplash as the *default*.** It has the most polished corpus, but (a) the API requires mandatory attribution + download-tracking pings, (b) hotlinking is mandated (no local caching of originals), and (c) license is actively drifting around AI/ML usage — risky for a tool that feeds images to diffusion models. Keep it behind an optional `UNSPLASH_ACCESS_KEY` env for users who opt in.
4. **Openverse as an advanced option** when cross-source + mixed-license metadata is useful (e.g., users who want Wikimedia/Flickr content). Its official Node client is a strong pick when we do wire it up.
5. **Don't build against:** StockSnap (no API), pxhere (no API), Burst (no API), rawpixel's undocumented endpoint.

Implementation sketch: ship `packages/stock-refs/` with `pexels.ts` and `pixabay.ts` first, each exposing `search(query, opts)` and `getById(id)` returning the unified record. Normalize license + attribution fields so the OG/hero renderer can unconditionally stamp credits when required.
