---
wave: 2
role: repo-deep-dive
slug: 08-appicon-forge
title: "Deep dive: zhangyu1818/appicon-forge"
repo: "https://github.com/zhangyu1818/appicon-forge"
license: "MIT (declared in README; no LICENSE file in repo)"
date: 2026-04-19
sources:
  - https://github.com/zhangyu1818/appicon-forge
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/README.md
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/package.json
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/store/interface.ts
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/store/default-value.ts
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/store/constants.ts
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/services/iconify.ts
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/components/settings/download-settings/index.tsx
  - https://raw.githubusercontent.com/zhangyu1818/appicon-forge/main/src/components/settings/import-and-export/index.tsx
  - https://zhangyu1818.github.io/appicon-forge/
  - https://api.github.com/repos/zhangyu1818/appicon-forge
  - https://iconify.design/
tags: [icon, iconify, composition, appicon-forge]
---

# Deep dive: zhangyu1818/appicon-forge

## Repo metrics

- **URL:** <https://github.com/zhangyu1818/appicon-forge>
- **Stars / forks / watchers:** 983★ / 142🍴 / 983 watchers at 2026-04-19 (GitHub API).
- **Created:** 2024-11-20.  **Last push:** 2025-07-09 (≈9 months idle at time of writing).
- **Default branch:** `main`. **Open issues:** 11. **Releases:** none tagged.
- **Language mix:** TypeScript ≈95%.  Repo size ≈3.6 MB (mostly screenshots).
- **License:** README declares **MIT**; no `LICENSE` file is committed (GitHub's license detector returns `null`). Treat as MIT but be aware of the missing SPDX marker.
- **Hosting surfaces:** live on GitHub Pages (`zhangyu1818.github.io/appicon-forge/`) and on Vercel (`appicon-forge.vercel.app`) — both are the same static bundle.

## Stack

`appicon-forge` is a **client-only Vite + React 18 + TypeScript SPA**. From `package.json`:

- **Build/runtime:** `vite@^6`, `@vitejs/plugin-react-swc`, `typescript@~5.6`, `react@18.3`.
- **UI primitives:** a full Radix UI kit (accordion/checkbox/dialog/popover/select/slider/tabs/…), `cmdk`, Tailwind + `tailwindcss-animate`, `tw-styled` + `class-variance-authority`, `lucide-react`, `motion` (Framer Motion v11), `@formkit/auto-animate`, `sonner`.
- **State:** `use-immer` (no Redux/Zustand) + `@reactils/create-context-factory`. Whole style state is one object, serialised through a JSON textarea (`ImportAndExportSettings`).
- **Data:** `@tanstack/react-query@5` against public Iconify REST endpoints; `@tanstack/react-virtual` for the icon-picker grid.
- **Icon rendering:** `@iconify/react` (on-demand SVG) + `@iconify/types`.
- **Export:** `html-to-image@^1.11` — the **only** export mechanism. The composed icon is rendered as DOM, rasterised client-side to PNG (or serialised to SVG).
- **i18n:** `i18next` + `react-i18next` (en + zh-CN).
- **No backend, no database, no auth, no API, no LLM, no MCP, no CLI.**

Deployability is trivial: `pnpm build → out/` goes to any static host; a `Dockerfile` builds an `nginx` image on port 80; `docker-compose.yml` wires it up. CI runs `pnpm lint` + `tsc` and deploys Pages on push to `main`.

## UI

The app is a three-pane designer: a **left settings sidebar** (Radix `Accordion` of collapsible panels), a **central preview canvas**, and a **right-hand icon picker** (virtualised grid over Iconify collections). Tabs at the top of the center pane let the user pick the **source** — `Tab.Icon` (browse Iconify), `Tab.Text` (a glyph or word), or `Tab.Upload` (local SVG or PNG). The settings enum is explicit (`src/store/constants.ts`):

```ts
export const enum Settings {
  Background, Border, Download, Icon,
  InsetShadow, IconShadow, Shadow, Text,
  TextShadow, ImportAndExport,
}
```

Each panel is a thin component that reads from and writes to the single `Styles` store; changes are reflected in the preview at 60 fps because everything is pure CSS on one composited DOM node.

## How it uses Iconify (275 k marks)

There is exactly **one service file** — `src/services/iconify.ts` — and it wraps three unauthenticated calls to `api.iconify.design`:

1. `queryIconCollections()` → `GET /collections` (list of ~200 icon sets).
2. `queryIcons(prefix)` → `GET /collection?prefix=<prefix>&info=true` (icon names for a given set).
3. `searchIcons({ query, limit, start, prefix, prefixes, category, style, palette })` → `GET /search?...` (full-text across all sets).

The picker is a TanStack Query + `react-virtual` grid that paginates `searchIcons` as the user scrolls — this is how a 275 k-icon catalogue fits into a static SPA without shipping any icon data in the bundle. The chosen icon is stored as a `PreviewIcon { collection, iconName, name }` tuple; the actual SVG is rendered by `@iconify/react`'s `<Icon icon={"mdi:account-circle"} />`, which resolves the SVG on demand over the same CDN. Iconify's own library is Apache-2.0; individual icon packs carry their own licences (MIT/Apache/CC-BY/OFL etc.) — this is Iconify's problem, not appicon-forge's, but any downstream product reusing the pattern inherits the per-pack licence-attribution burden.

## Gradient / shadow token system

The heart of the project is the `Styles` interface (`src/store/interface.ts`) — ~35 fields that parameterise a *pure CSS* rendering:

```ts
export type Shadow = [x: number, y: number, blur: number, spread: number, color: Color]
export type BorderRadius = [number, number, number, number]
export type Perspective = [boolean, number, number]

export interface Styles {
  backgroundColors: Color[];     backgroundGradient: Gradient;   backgroundRotation: number;
  borderColors: Color[];         borderGradient: Gradient;
  borderRadius: BorderRadius;    borderRotation: number;         borderWidth: number;
  iconColor: string;             iconOffset: Point;              iconPerspective: Perspective;
  iconRotation: number;          iconShadow: Shadow[];           iconSize: number;
  insetShadows: Shadow[];        padding: boolean;               shadows: Shadow[];
  textColors: Color[];           textColorRotation: number;      textFont: string;
  textGradient: Gradient;        textItalic: boolean;            textOffset: Point;
  textPerspective: Perspective;  textRotation: number;           textShadow: Shadow[];
  textSize: number;              textStroke: boolean;            textStrokeColor: string;
  textStrokeWidth: number;       textValue: string;              textWeight: string;
}
```

`Gradient` is a three-value enum (`Linear | Radial | Conic`); each colour list becomes the stops. Shadows are modelled as tuples that map 1:1 onto CSS `box-shadow` / `filter: drop-shadow()` / `text-shadow`. 3D `Perspective` tilts the icon/text via a `transform: perspective(...) rotateX() rotateY()` chain. The key architectural point: **nothing in this token system is generative, stochastic, or asset-pipeline-aware**. Every field maps deterministically to a CSS property on a single preview node. Because the whole style object is a plain JSON blob, the `ImportAndExportSettings` panel implements copy/paste style sharing in six lines — `JSON.stringify(style)` and `JSON.parse(text)` through a textarea.

## Output formats

- **Export mechanism:** `html-to-image` on the preview DOM node.
- **Formats:** PNG (rasterised) and SVG (serialised). That's it.
- **Sizing:** a single `imageSize` integer the user types into a number input, plus a `padding` boolean (preview-only). There is no preset list (iOS 1024×1024, Android Play Store 512×512, `AppIcon.appiconset`, `Contents.json`, `.icns`, `.ico`, favicon manifest, etc.).
- **Platform-spec output:** none. The 20b survey's characterisation — "best in class for composition … No LLM driver" — should be sharpened: also **no platform pipeline**. Users get one square bitmap and finish the job in `appicon.co`, `capacitor-assets`, or `npm-icon-gen`.

## MCP / API surface

Zero. There is no Node or Python layer, no REST endpoint, no CLI, no MCP server, no programmatic tool. The only machine-readable surface is the `JSON.stringify(styles)` blob from the import/export panel, which is designed for humans to round-trip a look via copy-paste — not for agents to drive the tool. Consequently there is no OAuth, rate limit, schema, or tool registry to study. An agent that wanted to *use* appicon-forge would have to run a browser automation against the Pages URL or reimplement the `Styles` → CSS renderer server-side.

## Deployability

Trivial. `pnpm install && pnpm build` produces a static `out/` directory. The repo ships a Dockerfile (`nginx:alpine` + built assets) and a `docker-compose.yml`. It's advertised as "no installation needed — just visit the Pages URL." For a prompt-to-asset product, the relevant takeaway is that **the entire composition model fits in a single-file Vite SPA**; we could import the `Styles` schema almost verbatim and render it inside our own `/compose` canvas with no runtime cost.

## The composition-beats-generation pattern

appicon-forge's implicit thesis, worth stating explicitly:

> For a large class of "iconic single-glyph" requests, a **parameterised deterministic composition** (Iconify glyph + gradient + border + shadow + text) produces a sharper, more legible, more copyright-safe, more reproducible, and ~10³× cheaper result than any diffusion model call. The design surface is the token set, not the prompt.

Concretely this means: (a) the glyph comes from a 275 k-mark library whose shapes are already pixel-perfect; (b) colour/gradient/shadow are CSS, so they are resolution-independent and infinitely re-tuneable; (c) the whole state is a JSON blob, so "regenerate" is a zero-latency re-render; (d) typography is just a Google-font CSS rule, so text legibility — the single worst failure mode of T2I for logos — is non-issue.

The pattern generalises beyond app icons: favicons, category pictograms, sidebar icons, dashboard tile icons, empty-state glyphs, notification badges, dock icons, sticker badges, and a significant fraction of "make me a logo for a SaaS tool" requests are *single-glyph compositions* in disguise.

## How to mirror this inside `enhance_prompt`

1. **Classify intent first.** The rewriter's first decision is not "what words go into the prompt" but **"compose or generate?"** Compose signals: single dominant subject, no scene, no photoreal texture, target is `icon | favicon | pictogram`, user named a concrete object ("calendar", "gear", "wallet", "sparkline"). Generate signals: "brand mark", "unique", "hand-drawn", "photographic", "illustration", "character", or any brief implying creative invention beyond recombination.
2. **Return a typed result.** `enhance_prompt` emits `{ mode: "compose" | "generate", compose_spec?: { icon_search, style_tokens: Styles }, generate_spec?: { positive, negative, model_family, ... } }`. The `Styles` contract is a lift of appicon-forge's interface, minus preview-only fields (`padding`, `imageSize`).
3. **Route to a deterministic composer.** `compose_icon` (MCP tool) consumes the spec, picks an Iconify glyph via `searchIcons`, renders server-side (Satori / `@resvg/resvg-js` / headless Chromium), and pipes the 1024×1024 master through `npm-icon-gen` + `pwa-asset-generator` + `capacitor-assets` — the platform pipeline appicon-forge deliberately omits.
4. **Offer both paths when unsure.** For ambiguous intents, return one composed candidate and one diffused candidate in parallel; let the ranker or the user pick.
5. **Reuse the JSON-blob share model.** `brand_bundle_parse`'s output should be assignment-compatible with `Styles`, so brand-derived tokens flow into composition for free.

## Decision

**Adopt the composition half, discard the UI shell.** appicon-forge is not a backend and not an MCP — it is a *schema plus a CSS renderer*, and that is exactly the slice we need. Port `Styles`, `Shadow`, `Perspective`, `Gradient`, and the Iconify REST wrapper (`queryIconCollections` / `queryIcons` / `searchIcons`) verbatim under MIT; re-render through Satori or headless Chromium instead of the browser DOM so the path is agent-drivable; wrap in an MCP tool `compose_icon` that sits next to `generate_logo` and is chosen by `enhance_prompt`'s intent classifier. Do **not** copy the single-PNG export pipeline — plug in `npm-icon-gen` / `pwa-asset-generator` / `capacitor-assets` instead (INDEX gaps G5/G11). 983 stars and a live public instance are prior-art validation that "~35-field token set + Iconify glyph + CSS" is rich enough for real-world icon briefs. The asset-correctness product is appicon-forge's composer wired behind an intent classifier, closed with a platform-spec pipeline, and exposed as an MCP tool — three things the original deliberately leaves undone. The missing SPDX/LICENSE file is a minor legal gotcha: either ask upstream to add it or treat the port as clean-room from the `Styles` shape rather than copying code, both are cheap.
