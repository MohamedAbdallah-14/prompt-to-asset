---
wave: 2
role: repo-deep-dive
slug: 03-nutlope-logocreator
title: "Deep dive: Nutlope/logocreator"
repo: "https://github.com/Nutlope/logocreator"
license: "none — no LICENSE file, open issue 'license' filed Feb 2025, still unanswered"
date: 2026-04-19
sources:
  - https://github.com/Nutlope/logocreator
  - https://raw.githubusercontent.com/Nutlope/logocreator/main/README.md
  - https://raw.githubusercontent.com/Nutlope/logocreator/main/package.json
  - https://raw.githubusercontent.com/Nutlope/logocreator/main/app/api/generate-logo/route.ts
  - https://raw.githubusercontent.com/Nutlope/logocreator/main/app/page.tsx
  - https://api.github.com/repos/Nutlope/logocreator
  - https://api.github.com/repos/Nutlope/logocreator/contributors
  - https://api.github.com/repos/Nutlope/logocreator/commits
  - https://api.github.com/repos/Nutlope/logocreator/issues
  - https://www.together.ai/models/flux1-1-pro
  - https://www.logo-creator.io/
tags: [logocreator, nextjs, flux, together, ui-reference]
---

# Deep dive: Nutlope/logocreator

The most-starred OSS AI-logo generator on GitHub in this category, and the repo that every "I cloned Nutlope's logo creator in a weekend" Twitter thread points at.

> **Updated 2026-04-21:** Star count has declined from the 6,956 / 676 forks peak recorded at research time (2026-04-19). Cross-referencing with web sources in April 2026 returns figures closer to ~5.3k stars / ~474 forks, consistent with a repo that launched virally and has since stagnated with no meaningful human commits since January 2025. Treat all star numbers below as approximate and directional, not exact. Built by Hassan El Mghari (`@Nutlope`) — the same author
behind `llamatutor`, `napkins.dev`, `picprompt`, and the Together AI demo
portfolio. It is, correctly, the reference UI for the category. It is not, as
closer inspection shows, a reference *product* — the backend is 164 lines of
hand-written prompt template and a single `client.images.create()` call.

## Repo metrics

| Metric | Value |
|---|---|
| Stars | **~5,300** (peak ~6,956 at launch; declining as of Apr 2026) |
| Forks | ~474 (peak ~676) |
| Open issues | 17 |
| Watchers / subscribers | 34 |
| Created | 2024-11-06 |
| Last push | **2025-12-12** (automated Vercel bot: React Server Components CVE patch) |
| Last *human* commit | 2025-01-17 ("Update dub links", samselikoff) |
| Default branch | `main` |
| Language | TypeScript (100%) |
| Repo size | 4.1 MB |
| Contributors | 5 total: samselikoff (30), Nutlope (23), Reda-Darbal (19), ryanto (3), vercel[bot] (1) |
| License | **none** — no LICENSE file in repo; GitHub API returns `"license": null`; an open issue literally titled [`license`](https://github.com/Nutlope/logocreator/issues) filed by `nnWhisperer` on 2025-02-20 has gone unanswered for 14 months |
| Homepage | <https://www.logo-creator.io/> |

The commit graph tells the real story: ~30 commits in Nov–Dec 2024, trickle of
maintenance through Jan 2025, silence for eleven months, then one Vercel-bot
CVE bump in Dec 2025. **This is a viral-launch-then-maintenance-mode repo**, not
an actively evolving product — which matters for how we use it.

Active issues are a mix of bot-spam ("Rayo Sanse", Mar 2026), one thoughtful
Next.js 16 migration PR from `riccardogiorato` (Dec 2025, unmerged), one "Custom
Color Picker / Model Selector / Reference Image Upload / Feature Flag" meta-issue
from `jacorbello` (Feb 2025, unaddressed), a Docker request, and the license
request. The author has clearly moved on to other projects.

## Stack

From `package.json` (`next: 14.2.35`, `react: ^18`):

- **Framework**: Next.js **14.2.35** (one major behind current Next 16), App
  Router, `runtime = "edge"` on the `/api/generate-logo` handler.
- **UI**: `shadcn` + `shadcn-ui` (both pinned, slightly redundant) on top of
  `@radix-ui/react-{dialog,radio-group,select,slot,toast,tooltip}`, Tailwind
  3.4, `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate`,
  `lucide-react` icons, `framer-motion@11` for entrance animations.
- **Auth**: **Clerk** (`@clerk/nextjs@^6.3.2`) — required to generate anything,
  sign-in wall on submit.
- **Rate limiting**: **Upstash Redis + `@upstash/ratelimit`** using
  `Ratelimit.fixedWindow(3, "60 d")` — three generations per user every sixty
  days. Extremely tight, explicitly designed to push users to BYOK.
- **Image provider**: **Together AI** (`together-ai@^0.9.0`), model
  `black-forest-labs/FLUX.1.1-pro`. *Not* Flux Schnell as the category index
  assumed — Pro 1.1 is deliberately chosen for text-rendering quality and
  requires Together "Build Tier 2" ($50 credit pack) to unlock.
- **Observability**: optional **Helicone** proxy (via `baseURL:
  "https://together.helicone.ai/v1"`) when `HELICONE_API_KEY` is set.
- **Analytics**: **Plausible** (`next-plausible`).
- **Database**: none. Clerk stores user records; Upstash stores rate-limit
  counters; user remaining-count is written to Clerk's `unsafeMetadata`. There
  is no logos table, no history, no persistence of generated images.
- **Validation**: `zod` on the request body.
- **Prompt template**: `dedent` tag for readable multi-line strings.

That is the entire stack. No database, no queue, no storage, no vector DB,
no moderation, no multi-model router. The whole app is ~5 files of substance.

## UX flow

From `app/page.tsx`:

The UI is a split-panel layout — left sidebar is the form, right panel shows the
generated logo (or a placeholder "Generate your dream logo in 10 seconds!"
headline before the first generation).

Form fields, top to bottom:

1. **Together API Key** (optional, `[OPTIONAL]` badge, persisted to
   `localStorage` — the BYOK escape hatch).
2. **Company Name** (required text, placeholder "Sam's Burgers").
3. **Layout** — *commented out in source*. `// { name: "Solo", ... Side, Stack }`.
   Never shipped.
4. **Style** — radio group of six preset cards with hand-drawn SVG thumbnails:
   **Tech, Flashy, Modern, Playful, Abstract, Minimal**.
5. **Primary color** — four-option select with color swatches: Blue (#0F6FFF),
   Red (#FF0000), Green (#00FF00), Yellow (#FFFF00).
6. **Background color** — three-option select: White (#FFFFFF), Gray (#CCCCCC),
   Black (#000000).
7. **Additional Info** — free-text textarea, optional.

Submit → POST `/api/generate-logo` → server returns a single base64 PNG →
client renders `data:image/png;base64,${json.b64_json}` → **Download** and
**Refresh** (regenerate with same params) buttons appear.

**The prompt is never shown to the user.** Generation takes ~10 seconds on
FLUX 1.1 Pro. No candidate gallery, no seed control, no variation grid, no
progress indicator beyond a spinner, no history. Each refresh costs one credit
and replaces the previous image.

## Prompt construction (the part that matters)

The entire "AI" of the app is `app/api/generate-logo/route.ts`:

```ts
const prompt = dedent`A single logo, high-quality, award-winning professional design,
made for both digital and print media, only contains a few vector shapes, ${styleLookup[data.selectedStyle]}

Primary color is ${data.selectedPrimaryColor.toLowerCase()} and background color is
${data.selectedBackgroundColor.toLowerCase()}. The company name is ${data.companyName},
make sure to include the company name in the logo. ${data.additionalInfo ? `Additional info: ${data.additionalInfo}` : ""}`;
```

Where `styleLookup` is a six-entry hand-written object:

- **Tech** → *"highly detailed, sharp focus, cinematic, **photorealistic**, Minimalist, clean, sleek, neutral color pallete with subtle accents, clean lines, shadows, and flat."*
- **Flashy** → *"Flashy, attention grabbing, bold, futuristic, and eye-catching. Use vibrant neon colors with metallic, shiny, and glossy accents."*
- **Modern** → *"modern, forward-thinking, flat design, geometric shapes, clean lines, natural colors with subtle accents, use strategic negative space to create visual interest."*
- **Playful** → *"playful, lighthearted, bright bold colors, rounded shapes, lively."*
- **Abstract** → *"abstract, artistic, creative, unique shapes, patterns, and textures to create a visually interesting and wild logo."*
- **Minimal** → *"minimal, simple, timeless, versatile, single color logo, use negative space, flat design with minimal details, Light, soft, and subtle."*

Key observations about the prompt strategy:

- **No LLM rewriting.** Nothing is sent through Claude/GPT/Gemini to verbalize
  the user's intent. It is literal template interpolation.
- **No negative prompt.** FLUX Pro doesn't accept one via Together's API, but
  no substitute avoidance language is added either (e.g. "no text artifacts, no
  watermark, no realistic photography").
- **The "Tech" style prompt is actively wrong for its stated goal.** It contains
  *"cinematic, photorealistic"* — terms that pull FLUX toward 3D/photographic
  outputs, which is the opposite of what a tech logo needs (flat vector with
  text). This is a real quality bug that ships in production today at
  logo-creator.io.
- **No model-family dispatch.** The template is written in SD/Flux-style tag
  salad ("highly detailed, sharp focus, cinematic"); it would perform worse if
  you swapped the model for Imagen-4 or `gpt-image-1`, both of which prefer
  natural-sentence prompts.
- **No structured output contract.** The prompt returns a string; the API
  returns a base64 blob. Nothing flows downstream.

Fixed generation params: `width: 768, height: 768, response_format: "base64"`.
Not user-configurable.

## Asset-correctness

This is where the gap opens widest versus our product:

- **Transparency**: *not supported*. The API always renders against a
  user-chosen opaque background (White/Gray/Black). FLUX 1.1 Pro cannot
  output RGBA via Together's endpoint, and there's no post-hoc background
  removal. Users who want a transparent PNG have to generate on white and
  then `rembg` it themselves — exactly the lossy path we've already
  diagnosed in 20b and 20d as the wrong default.
- **Text rendering**: delegated entirely to FLUX 1.1 Pro, which is genuinely
  better than SDXL/Flux Schnell at spelling short brand names but still
  routinely botches 8+ character wordmarks, letter spacing, and
  ampersands. No verification loop catches the misspells.
- **Multi-size output**: *none*. 768 × 768 PNG only. No favicon, no
  `AppIcon.appiconset`, no OG card, no splash screens — the entire
  `pwa-asset-generator` / `capacitor-assets` / `npm-icon-gen` downstream
  layer is missing.
- **Download format**: *PNG only* via a `data:image/png;base64,...` anchor.
  SVG export is in the README's "Future Tasks" checklist and hasn't been
  implemented. No ICO / ICNS / WebP.
- **Safe zone / clear space / legibility checks**: none.
- **Brand consistency across a set**: not a concept — each generation is
  a standalone call with no shared seed, palette store, or brand bundle.

## Gaps versus our product

Every differentiator called out in the category INDEX maps cleanly onto
something this repo does not do:

1. **Research-backed rewriter** — no rewriter at all; a 6-string lookup
   table vs. our 121-subagent compendium feeding Hunyuan/Claude/GPT.
2. **Multi-model routing** — FLUX-1.1-pro only. Our capability-map router
   picks Imagen-4 for flat vectors, `gpt-image-1` for alpha,
   Recraft V3 for SVG, FLUX for photoreal.
3. **Platform-spec bridge** — absent. We wrap `npm-icon-gen` +
   `pwa-asset-generator` + `capacitor-assets` behind `resize_icon_set`.
4. **MCP surface** — **none**. No `@modelcontextprotocol/sdk` dep, no
   `/api/[transport]` route, no `mcp.json` manifest, no stdio entrypoint.
   Confirmed by package-inspection; the README does not mention MCP.
5. **CLI / skills** — **none**. `package.json` scripts are only
   `dev/build/start/lint`; no `bin` entry. No `claude-skill.md`, no
   `.cursorrules`.
6. **Validation loop** — no `validate_asset`, no alpha-coverage check,
   no palette-adherence score, no re-prompt on failure.
7. **Brand bundle consumer** — no `brand.md` / brandspec / AdCP
   `brand.json` parsing. User choices are four colors and six styles.
8. **Negative prompt** — not present.
9. **Reference-image / IP-Adapter** — in the README's Future Tasks;
   not implemented.
10. **History / dashboard** — in the README's Future Tasks; not implemented.
11. **Candidate-grid selection** — no batch generation, user sees one
    image at a time.

## Deployability

**Easy to fork and rebrand — with a caveat.** Total required env vars:

- `TOGETHER_API_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `HELICONE_API_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

Deploy target is Vercel (edge runtime, no special config). A rebrand involves
swapping favicon assets, `app/components/Header.tsx`/`Footer.tsx` copy,
Clerk application keys, Plausible domain, the `domain` lib constant, and the
hardcoded "Sam's Burgers" placeholder. Realistic fork-to-live time: 30
minutes.

**The caveat is the license.** GitHub reports `"license": null`; there is no
`LICENSE` file; the open `license` issue has sat unanswered for 14 months.
Default copyright applies — meaning the 676 existing forks are all in a
legally gray area, and we cannot lift code verbatim for a commercial product
without written permission. We can study the repo freely; we cannot copy-paste
it into our app. The README's "free + OSS" language is aspirational, not
binding.

**Costs at 1k logos/day on this exact stack.** FLUX 1.1 Pro on Together costs
$0.04/MP ($0.04 for a 768×768 image since 768² ≈ 0.59 MP → call it ~$0.024/image,
[Together pricing, 2026](https://www.together.ai/models/flux1-1-pro)). At 1k/day
that's **~$24/day image cost**, plus Vercel (free–$20/mo), Clerk (free up to
10k MAU), Upstash (free tier 10k cmd/day is plenty at this load), Plausible
($9/mo), Helicone (optional). Ballpark **$25–30/day all-in at 1k logos/day**,
dominated by FLUX inference.

## MCP / CLI / skills surface

**Confirmed: none.** There is no MCP adapter, no skill manifest, no CLI
binary. This is a pure web product. The category's tri-surface slot (website +
hosted MCP + cross-IDE skill pack) is exactly what LogoCreator does not
occupy, and — per the 20e angle — that whitespace is still unclaimed as of
2026-04-19.

## Decision: **INSPIRE-UI-ONLY**

Do not fork this repo. Do copy, in spirit only (never verbatim), the
following:

1. **The split-panel UX**. Left-sidebar form → right-panel canvas with
   Download/Refresh buttons. This is the shape users already understand from
   logo-creator.io; our web UI at `/` should feel immediately familiar. We
   add: prompt preview pane, candidate grid, validation badges, brand-bundle
   sidebar.
2. **Six style presets with SVG thumbnail cards**. Preserve the visual
   vocabulary (Tech / Flashy / Modern / Playful / Abstract / Minimal) so our
   product docks onto user muscle memory. *Replace the string contents* with
   our research-backed, model-family-aware prompt fragments from categories
   13–15 of the compendium — and in particular fix the "Tech" bug by
   removing "photorealistic, cinematic".
3. **The Clerk + Upstash rate-limit + BYOK escape-hatch pattern**. `3 free
   generations → enter your own API key` is a well-proven way to convert
   viral traffic into sustainable spend without building a billing pipeline
   on day one. Upstash `fixedWindow(N, "60 d")` keyed on `user.id`, writing
   remaining count to Clerk `unsafeMetadata` — a clean, copyable shape that
   we can re-implement without touching their code.
4. **The shadcn + Radix + Tailwind + Framer Motion component baseline**.
   Matches the wider 20b/20e consensus stack and is what Vercel's own
   templates now ship. No reason to deviate.
5. **Edge-runtime route handlers + base64 response**. For a thin image
   generation endpoint this is the right default; keep it for our
   `generate_logo` route.
6. **Helicone pass-through via `baseURL`**. One-liner observability hook;
   worth cloning.

Do **not** copy:

- The prompt template (wrong shape, actively bad "Tech" entry, no
  negative prompt, no model-family dispatch — our rewriter replaces it
  outright).
- The 4-color / 3-background hardcoded palette (we accept a `brand.md`).
- The single 768×768 output (we fan out to a platform-spec set).
- The hardcoded FLUX-only provider (we route by capability).
- The absence of transparency, validation, SVG, history, MCP, skills.

In one line: **logo-creator.io is the UI our users have already been
trained on; our product is what that UI *would have been* if the author
had kept shipping for another twelve months, plugged in a research-grounded
rewriter, closed the validation loop, added the MCP/skill/CLI surface, and
picked a license**.
