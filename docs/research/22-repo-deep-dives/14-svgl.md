---
wave: 2
role: repo-deep-dive
slug: 14-svgl
title: "Deep dive: pheralb/svgl"
repo: "https://github.com/pheralb/svgl"
license: "MIT (code) — brand marks under nominative fair use, trademarks belong to owners"
date: 2026-04-19
sources:
  - https://github.com/pheralb/svgl
  - https://raw.githubusercontent.com/pheralb/svgl/main/README.md
  - https://raw.githubusercontent.com/pheralb/svgl/main/LICENSE
  - https://svgl.app/docs/api
  - https://github.com/pheralb/svgl/tree/main/api-routes
  - https://github.com/pheralb/svgl/blob/main/src/types/categories.ts
  - https://github.com/simple-icons/simple-icons/blob/master/DISCLAIMER.md
  - https://thesvg.org/legal
  - https://bizarro.dev.to/thegdsks/i-tested-every-open-source-brand-svg-library-so-you-dont-have-to-2026-edition-3jcc
tags: [svgl, brand-logos, trademark, svg, iconify-alternative, rest-api, nominative-fair-use]
---

# Deep dive: pheralb/svgl

## What it is

`pheralb/svgl` ([GitHub](https://github.com/pheralb/svgl), ~5.7k★, MIT) is a
community-maintained library of 400+ hand-optimized brand SVG logos with a public
REST API at `api.svgl.app`.

> **Updated 2026-04-21:** SVGL remains actively maintained as of April 2026
> (issue #930 opened March 20, 2026; issue #927 opened March 19, 2026). Star
> count is stable at ~5.7k. Logo count has grown beyond 400 with ongoing
> community PR contributions; the exact total is best confirmed via the API
> index at `api.svgl.app` (returns the full array). No breaking API changes
> reported. The Hono + Upstash backend and the Svelte 5 + SvelteKit frontend
> stack remain unchanged. The "don't clone the product" API clause is still
> in force and unchanged. The website at [svgl.app](https://svgl.app) is a
SvelteKit browse-and-copy UI; the API is a Hono worker on Cloudflare backed by
Upstash Redis for rate limiting. The project occupies the same niche as
`simple-icons` (CC0, ~17k★) and Iconify's "Logos" collection, but curates fewer
logos more carefully — each mark is hand-drawn or hand-optimized, theme-aware
(light/dark), and frequently paired with a "wordmark" variant. A large third-party
plugin ecosystem (CLI, React, Vue, Svelte, Figma, VSCode, Raycast, PowerToys,
Framer, PowerShell, Flow Launcher) rides on top of the API.

## Repo anatomy

- **Stack.** SvelteKit + Svelte 5 + Tailwind + bits-ui + Content-Collections for
  the site; Hono + Upstash Redis + `@upstash/ratelimit` for the API
  (`api-routes/`); Shiki for code highlighting; svgo for SVG optimization.
- **Data.** SVGs live in `static/library/*.svg` (21 KB size cap, must be SVGO-cleaned
  with `viewBox` preserved). Metadata lives in `src/data/svgs.ts` as a
  hand-edited TypeScript array; categories are enumerated in
  `src/types/categories.ts`.
- **Schema per logo:**

```ts
{
  title: string;
  category: string | string[];            // e.g. "Software" or ["Social","Design"]
  route: string | { light: string; dark: string };
  wordmark?: string | { light: string; dark: string };
  url: string;                            // brand homepage
  brandUrl?: string;                      // optional link to official brand guidelines
  loftlyyUrl?: string;                    // optional link to loftlyy.com brand reference
}
```

`id` is assigned by the API. `route` holds the primary mark; `wordmark` holds
the logotype variant; either can be a theme-paired object. `brandUrl` is the
structurally important field — many entries point to the brand's official press
kit / brand guidelines, which matters for downstream legal hygiene.

## License split (the thing that actually matters)

The `LICENSE` file at the repo root is a standard MIT license, © 2022 Pablo Hdez
— it covers **the SvelteKit app, the API code, and the curation/metadata work**.
It does **not** license the brand marks themselves. This is the same posture as
`simple-icons/simple-icons`, Font Awesome's Brand Icons, and Devicon: the repo
relies on [nominative fair use of trademarks](https://thesvg.org/legal) — the
doctrine that lets you refer to a brand using its mark for identification.
Contributors are told explicitly in the README:

> Before submitting an SVG, ensure you have the right to use it and that its
> license permits adding it to svgl. If you are uncertain, please contact the
> author or the company.

And the author actively maintains a removal process for brand owners who object.
In practice: distributing and rendering brand logos for *identification* is
almost always defensible (same as a news site writing "Microsoft"); using them
in a way that suggests *endorsement, affiliation, or origin* is not. The risky
moves — embedding a FedEx logo on a shipping product you sell, using Twitter/X's
bird in your own bird-shaped UI, recoloring an Apple mark — remain risky
regardless of which icon library you fetched them from.

## REST API

Documented at [svgl.app/docs/api](https://svgl.app/docs/api). No auth, rate-limited
by IP at the edge.

| Endpoint | Purpose |
|---|---|
| `GET api.svgl.app` | All logos as JSON array |
| `GET api.svgl.app?limit=N` | Capped list |
| `GET api.svgl.app?search=<q>` | Title search (returns array) |
| `GET api.svgl.app/category/<slug>` | Filter by category slug |
| `GET api.svgl.app/categories` | Category index with per-category `total` counts |
| `GET api.svgl.app/svg/<name>.svg` | Raw SVG bytes, SVGO-optimized by default |
| `GET api.svgl.app/svg/<name>.svg?no-optimize` | Raw SVG bytes, unoptimized |

Example search response:

```json
[
  {
    "id": 267,
    "title": "Axiom",
    "category": "Software",
    "route": { "light": "https://svgl.app/axiom-light.svg",
               "dark":  "https://svgl.app/axiom-dark.svg" },
    "url": "https://axiom.co/"
  }
]
```

Search capability is **title-only** (substring against `title`). It does not
span categories, aliases, or alternative names (`GitHub` matches; `Twitter/X`
matches `X` but not `Twitter`). For a prompt-to-asset tool this is a real gap
— an agent asking for "the old Twitter bird" or "Meta's logo" may miss on
vocabulary. Category browsing plus fuzzy matching on the full index
(~400 entries fits in a single request) works around it.

## The explicit API usage constraint

Buried in the API docs is a one-line terms clause that every integrator should
read carefully:

> Don't use the API for create the same product as SVGL. The API is intended to
> be used for extensions, plugins, or other tools that can help the community.

This is narrower than it looks. The prohibited shape is a rival *logo-library
product* (a competing "browse-and-copy SVGs" site). A prompt-to-asset that
surfaces a logo as a *step inside a broader asset-generation pipeline* —
"here's the official FedEx mark, do you want to use it as the brand reference
for the hero illustration?" — is exactly the "extensions, plugins, or other
tools" case the author explicitly blesses. The existing SVGL Figma plugin,
Raycast extension, and VSCode extension occupy the same conceptual slot.

## Relevance to our prompt-to-asset

Directly useful in two places in our stack:

1. **Inside `enhance_prompt`, as a composition-vs-generation disambiguator.**
   When the user says "put a Stripe logo on the card", the right action is *not*
   to ask a diffusion model to hallucinate a Stripe mark (it will be wrong, and
   the trademark risk is the user's, not the model's). It is to call
   `find_brand_logo(query="stripe")` and return the canonical SVG URL plus the
   brand-guidelines link. This is a perfect fit for [20b controversy 3 (compose
   vs. generate)](../20-open-source-repos-landscape/20b-asset-generator-fullstack-repos.md)'s
   resolution.
2. **As a brand-reference ingestion point.** Together FLUX.2 accepts up to 8
   reference images per call (per [20c](../20-open-source-repos-landscape/20c-image-gen-sdk-wrappers.md));
   IP-Adapter workflows in [20d](../20-open-source-repos-landscape/20d-comfyui-workflow-ecosystem.md)
   take reference images as style anchors. When a user says "design a trading
   dashboard that feels like Robinhood", `find_brand_logo(query="robinhood")` is
   a one-call way to get a clean reference mark into the pipeline.

The MCP tool shape should be:

```ts
find_brand_logo(query, options?: { theme?: "light"|"dark", prefer?: "mark"|"wordmark" })
 → {
     title, category, mark_url, wordmark_url?, theme_variants?: {light,dark},
     brand_url, brand_guidelines_url?, source: "svgl" | "simple-icons" | ...,
     trademark_notice: "Trademarks belong to their respective owners. ..."
   }
```

## Operational guardrails (non-negotiable)

1. **Don't redistribute bytes from our server.** Return `mark_url` pointing to
   `svgl.app/<name>.svg` or `api.svgl.app/svg/<name>.svg`; let the user's agent
   or browser fetch directly. This keeps us as a discovery/context tool, never a
   mirror, and aligns with the API's stated purpose.
2. **Surface `brand_guidelines_url`.** When SVGL has a `brandUrl`, pass it
   through verbatim with guidance to read before use.
3. **Attach a trademark notice to every response.** One sentence, pointing at
   the brand owner, not us.
4. **Cache responsibly.** The full `/` index is ~400 entries; cache for 24h with
   a conditional refresh against `ETag` to avoid hammering the rate limiter.
5. **Fall back to `simple-icons` (CC0) first where possible.** Same fair-use
   posture on marks but a permissive license on the SVG bytes themselves,
   removing one layer of ambiguity. Use SVGL only when simple-icons lacks the
   brand or a theme-paired variant is needed.
6. **Credit SVGL in tool output** and link to svgl.app, matching the ethical
   expectations of every other integrator in the ecosystem.

## Decision

**Integrate SVGL as a secondary source behind a `find_brand_logo` MCP tool;
never as the primary.** The trademark posture is sound *for identification-style
use*, same as simple-icons, but the delta in license hygiene is real: SVGL's MIT
covers code, not marks, whereas simple-icons is explicitly CC0 on the SVG bytes.
Primary source should be **simple-icons** (CC0 + larger catalog of ~3k brands);
SVGL is the fallback when we need a theme-paired variant, a wordmark, or a
brand that simple-icons lacks. Both return URLs, never redistributed bytes; both
are accompanied by a trademark disclaimer in the tool response and — when
available — a pointer to the brand's official guidelines. We will *not* build a
"logo search UI" on our website: that would collide with SVGL's explicit "don't
recreate the product" clause. Logo discovery lives inside the broader
`enhance_prompt` and `generate_logo` flows as a context-provisioning step, not a
destination page. If a brand owner ever objects to inclusion, we honor the
takedown immediately, mirroring SVGL's and simple-icons' own policies. The
prompt-to-asset's value here is not owning a logo library; it is knowing when
*not* to generate a logo at all.
