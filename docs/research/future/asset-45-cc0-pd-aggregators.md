# CC0 / Public-Domain / Permissive Asset Aggregators

Research digest for the `prompt-to-asset` project: APIs that index CC0, public-domain, or permissively-licensed visual and audio assets, and a proposed thin abstraction layer for unified access.

## Executive summary

- **Openverse is the only true multi-source aggregator** and should be the default backend. It already federates ~600M images + 800k+ audio from Flickr, Wikimedia, Europeana, Smithsonian, museums, etc., and exposes first-class `license` and `license_type` filters (`license_type=public` or `license=cc0,pdm`). Everything else is a single-collection source.
- **For guaranteed-CC0, registration-free access, the Met and NASA are uniquely convenient** — no key, wide coverage, all-CC0/PD by default. Use them directly instead of via Openverse when you want a 1-call path with no auth.
- **Museum and institution APIs vary sharply in license filter ergonomics.** Met, NGA, Smithsonian, Cleveland, and Rijksmuseum (~PD image set) are reliably free-to-reuse; Europeana and Wikimedia require you to read the per-item rights statement because the corpus is mixed.
- **"Video" is the weakest category.** No major CC0 video aggregator API exists; practical options are NASA (PD video), Internet Archive advanced search (`licenseurl:*creativecommons.org*`), and Wikimedia Commons. Stock-video sites (Pexels, Pixabay, Coverr) are permissive but not CC0.
- **3D is similarly thin.** Openverse has a proposal but not full production support as of 2025; Smithsonian Open Access has a small 3D subset; otherwise Sketchfab CC/CC0 filter (requires OAuth) is the pragmatic answer.

## Sources

### 1. Openverse (primary aggregator)

- **URL:** `https://openverse.org` · API root `https://api.openverse.org/v1/`
- **Docs:** [docs.openverse.org/api/reference/](https://docs.openverse.org/api/reference/)
- **Media types:** images (dominant), audio (GA since late 2022, 800k+ files), 3D (proposal stage, not in stable API as of 2025).
- **License filters:** first-class. `license=cc0,pdm,by,by-sa,...` (comma-separated), or `license_type=commercial,modification,all-cc,public`. `license_type=public` returns CC0 + Public Domain Mark.
- **Auth:** anonymous works for light use; OAuth2 client-credentials (free self-registration) for higher tiers (`standard`, `enhanced`). No published fixed numeric rate limit — anonymous is throttled and capped at ~240 total results per unauth query.
- **Coverage behind one endpoint:** Flickr, Wikimedia Commons, Europeana (which itself fans out to ~hundreds of GLAMs), Smithsonian, Rawpixel, NYPL, Biodiversity Heritage Library, Cleveland Museum, Brooklyn Museum, Science Museum (UK), WordPress Photo Directory, Jamendo (audio), Freesound (audio), CCMixter (audio).

### 2. Wikimedia Commons

- **URL:** `https://commons.wikimedia.org`
- **API:** MediaWiki Action API at `https://commons.wikimedia.org/w/api.php` (`action=query&list=search`, `generator=search` for metadata joins). REST helper at `https://api.wikimedia.org/core/v1/commons/`.
- **Auth:** none required for reads; `User-Agent` header mandatory per Wikimedia policy. For higher throughput, a free account + personal API token.
- **License filter:** not a first-class parameter. MediaSearch UI exposes license facets; programmatically you must parse the `{{Information}}` / license template on each file page, or filter by category (`Category:CC0`, `Category:Public domain`).
- **Media:** images, SVG, audio (ogg/opus), video (ogv/webm), PDF, 3D (STL via extension, sparse).
- **Rate limits:** no hard published limit for read API; 200 req/s total platform-wide soft cap; be polite and cache.

### 3. Metropolitan Museum of Art — Open Access

- **URL:** `https://metmuseum.org/openaccess` · API `https://collectionapi.metmuseum.org/public/collection/v1/`
- **Docs:** [metmuseum.github.io](https://metmuseum.github.io/)
- **License:** every object flagged `isPublicDomain: true` is CC0. Mixed objects exist; filter in code.
- **Auth:** **none**. No key, no registration.
- **Rate limit:** official guidance is **max 80 req/s**.
- **Corpus:** 470k+ artworks, high-res JPEG.

### 4. Smithsonian Open Access

- **URL:** `https://si.edu/openaccess` · API `https://api.si.edu/openaccess/api/v1.0/`
- **Docs:** [edan.si.edu/openaccess/apidocs/](https://edan.si.edu/openaccess/apidocs/)
- **License filter:** `q=online_media_rights:"CC0"`; metadata is always CC0 but media may be restricted.
- **Auth:** **api.data.gov key required** (free signup at `https://api.data.gov/signup/`). Same key works across federal APIs.
- **Rate limit:** api.data.gov default is **1,000 req/hour per key** (burst 30/s).
- **Corpus:** 4M+ CC0 items spanning art, science, history; includes a 3D subset.

### 5. Europeana

- **URL:** `https://europeana.eu` · API `https://api.europeana.eu/record/v2/search.json`
- **Docs:** [europeana.atlassian.net/wiki/spaces/EF](https://europeana.atlassian.net/wiki/spaces/EF/pages/2385739812/Search+API+Documentation)
- **License filter:** `reusability=open` covers CC0, PDM, CC BY, CC BY-SA. For pure CC0, additionally filter `RIGHTS:*creativecommons.org/publicdomain/zero*` or use the `REUSABILITY` facet.
- **Auth:** free API key via the Europeana dev portal; header or `wskey=` param.
- **Rate limit:** 10,000 req/day default (contact for increase).
- **Corpus:** 50M+ items across ~4,000 European cultural institutions (mixed license).

### 6. Rijksmuseum

- **URL:** `https://data.rijksmuseum.nl`
- **Docs:** [data.rijksmuseum.nl/docs/](https://data.rijksmuseum.nl/docs/)
- **License filter:** no direct "CC0 only" flag, but practically the majority of the ~350k digitized images are PD; filter via `imgonly=True&type=painting` and inspect per-item `webImage` + rights metadata. OAI-PMH feed includes rights fields.
- **Auth:** free API key (register for Rijksstudio account, key in advanced settings).
- **Rate limit:** 10,000 req/day per key (historical; check current ToS).
- **Corpus:** 650k+ objects, high-res zoom deep-zoom tiles available.

### 7. Cleveland Museum of Art

- **URL:** `https://openaccess-api.clevelandart.org/`
- **License:** CC0 across the Open Access subset (~64k records, ~37k images).
- **Auth:** **none**.
- **Rate limit:** not published; be polite. Dataset also available as CSV/JSON via GitHub.

### 8. National Gallery of Art (US)

- **URL:** `https://nga.gov/open-access-images.html`
- **Data:** CC0 CSV dumps at [github.com/NationalGalleryOfArt/opendata](https://github.com/NationalGalleryOfArt/opendata), updated daily. 130k+ artwork records, 60k+ images.
- **API:** **no official REST API.** Treat as a bulk dataset: clone and build a local index. The `published_images.csv` column gives direct IIIF URLs.
- **Auth:** n/a.

### 9. NASA Image and Video Library

- **URL:** `https://images.nasa.gov` · API `https://images-api.nasa.gov`
- **Docs:** [images.nasa.gov/docs/images.nasa.gov_api_docs.pdf](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
- **License:** US government works → public domain by default (caveats: some partner content may carry restrictions; per-asset description field notes this).
- **Auth:** **none** for the images-api endpoint. (The separate `api.nasa.gov` key gate does not apply here.)
- **Rate limit:** not publicly specified; historically generous. For `api.nasa.gov` endpoints, DEMO_KEY is 30/hr & 50/day; a free key raises to 1,000/hr.
- **Media:** image, video, audio — 140k+ assets.

### 10. Internet Archive

- **URL:** `https://archive.org` · API `https://archive.org/services/search/v1/scrape` and legacy `advancedsearch.php`
- **License filter:** query `licenseurl:*creativecommons.org*publicdomain*zero*` for CC0, or `licenseurl:*creativecommons.org*publicdomain*mark*` for PDM. `mediatype:(image|movies|audio)` narrows format.
- **Auth:** none for search/metadata/download; for write access S3-style keys are available free.
- **Rate limit:** no hard published limit; use polite concurrency, the scrape API uses cursor pagination and is built for bulk.
- **Corpus:** huge but heterogeneous and unevenly tagged — trust `licenseurl` as the source of truth per item.

### 11. US Government works (generic)

- **Principle:** 17 U.S.C. §105 → works authored by US federal employees are PD.
- **Concrete APIs worth indexing:** NASA (above), Library of Congress `https://www.loc.gov/apis/`, NOAA Photo Library, NPS gallery, data.gov datasets.
- **Caveat:** many govt sites host third-party PD/CC content mixed with contracted-work PD; per-asset rights metadata is still required.

### 12. Bonus: permissive stock (not CC0, but often treated as close)

- **Pexels, Pixabay, Unsplash** all use custom licenses that allow commercial use without attribution but are **not CC0** (Unsplash and Pixabay explicitly forbid compiling competing galleries). Keep them clearly labelled as "permissive, non-CC0" in the abstraction. See `19-stock-photo-apis.md` for API ergonomics.

## Proposed abstraction layer

Shape it as a minimal adapter registry with a unified result schema. Keep it dumb — no cross-source ranking in v1; let the caller pick the source(s).

```ts
// src/assets/types.ts
export type LicenseCode =
  | "cc0"
  | "pdm"         // Public Domain Mark
  | "us-gov"      // 17 USC §105
  | "by" | "by-sa" | "by-nc" | "by-nd" | "by-nc-sa" | "by-nc-nd"
  | "permissive-stock"; // Unsplash/Pexels/Pixabay

export type MediaType = "image" | "video" | "audio" | "3d" | "illustration";

export interface AssetSearchOptions {
  license?: LicenseCode[];    // post-filter if the source lacks a native filter
  mediaType?: MediaType[];
  limit?: number;             // default 20
  cursor?: string | number;   // adapter-specific, opaque to caller
  safeSearch?: boolean;
}

export interface AssetResult {
  id: string;                 // source-qualified: "met:436535"
  source: string;             // "openverse" | "met" | "wikimedia" | ...
  title: string;
  creator?: string;
  license: LicenseCode;
  licenseUrl?: string;
  mediaType: MediaType;
  thumbUrl: string;
  fullUrl: string;            // direct download/stream
  landingUrl: string;         // human page with attribution
  width?: number;
  height?: number;
  durationMs?: number;        // audio/video
  attributionText: string;    // pre-rendered, ready to display
  raw: unknown;               // original payload for power users
}

export interface AssetSource {
  readonly name: string;
  readonly supportedMedia: MediaType[];
  readonly nativeLicenseFilter: boolean;
  search(query: string, opts?: AssetSearchOptions): Promise<{
    results: AssetResult[];
    nextCursor?: string | number;
  }>;
}
```

```ts
// src/assets/index.ts
import { openverse } from "./adapters/openverse";
import { met } from "./adapters/met";
import { wikimedia } from "./adapters/wikimedia";
import { smithsonian } from "./adapters/smithsonian";
import { europeana } from "./adapters/europeana";
import { rijks } from "./adapters/rijksmuseum";
import { cleveland } from "./adapters/cleveland";
import { nga } from "./adapters/nga";
import { nasa } from "./adapters/nasa";
import { internetArchive } from "./adapters/internet-archive";

const registry = {
  openverse, met, wikimedia, smithsonian, europeana,
  rijks, cleveland, nga, nasa, internetArchive,
} as const;

export type AssetSourceName = keyof typeof registry;

export const asset = {
  source(name: AssetSourceName) { return registry[name]; },
  sources() { return Object.keys(registry) as AssetSourceName[]; },
  // v1 convenience: fan out to many sources in parallel, no merging logic
  async searchAll(
    query: string,
    names: AssetSourceName[],
    opts?: AssetSearchOptions,
  ) {
    return Promise.all(names.map(n => registry[n].search(query, opts)));
  },
};

// Usage:
// asset.source("openverse").search("rocket", { license: ["cc0"] });
// asset.source("met").search("sunflower");
```

Guidelines baked into adapters:

1. **Post-filter by license when the source can't filter natively.** Met, NGA, Cleveland are trivially "all CC0", so the adapter returns `license: "cc0"` unconditionally. Wikimedia and Europeana must parse per-item rights.
2. **Normalize attribution up-front.** Even CC0 carries a polite "courtesy line"; pre-render it so the prompt-to-asset can attach it to generated briefs without each caller reimplementing.
3. **Respect rate limits inside the adapter.** Token bucket per source, with backoff on 429/throttle headers. Met's 80 req/s, Smithsonian's 1000/hr, Europeana's 10k/day differ by an order of magnitude.
4. **Cache aggressively.** Hash `(source, query, opts)` → persistent cache. These corpora change slowly; TTLs of days are safe.
5. **Keep 3D / video behind capability flags** (`supportedMedia`) so the UI can disable unsupported combos rather than returning empty results.

## Top-3 recommendation (for the prompt-to-asset use case)

1. **Openverse** — one backend covers images + audio across Flickr/Wikimedia/Europeana/Smithsonian + museum partners with a first-class `license_type=public` filter. Anonymous works; register for OAuth2 once traffic grows.
2. **Metropolitan Museum Open Access** — zero-auth, 80 req/s, CC0 by default, 470k+ high-res artworks. Ideal "real-world reference" source for illustration/art-direction prompts.
3. **NASA Image and Video Library** — zero-auth, public domain by default, covers image + video + audio (the only weak link in the CC0 landscape) with 140k+ assets.

Keep Wikimedia Commons and Internet Archive as secondary fallbacks (broad coverage, messy licensing); add Smithsonian, Europeana, Rijksmuseum, Cleveland, NGA as specialized sources when vertical coverage matters.
