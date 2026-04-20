# 27 — Open Design Systems with Published Token Files

Reference bundles for the `prompt-to-asset` project. Useful as (a) style-transfer fixtures, (b) anchor brands for evaluating token extraction, and (c) examples of how real-world teams structure tokens (seed → alias → component).

All entries verified Apr 2026. "DTCG" = W3C Design Tokens Community Group draft spec (`$value` / `$type` / `$description`).

---

## Summary table

| System | License | Repo | Token format | Color | Typography | Motion |
|---|---|---|---|---|---|---|
| Radix Colors | MIT (WorkOS) | `radix-ui/colors` | TS + generated CSS vars | 30 scales × 12 steps, light/dark/alpha/P3 | — (colors only) | — |
| Radix Themes | MIT (WorkOS) | `radix-ui/themes` → `packages/radix-ui-themes/src/styles/tokens/*.css` | CSS custom properties | consumes Radix Colors | 9-step type scale | ease/duration vars |
| Material Design 3 | Apache-2.0 | `material-foundation/material-tokens` (archived 2023) | JSON (pre-DTCG "DSP" format), Style-Dictionary-ready | 5 palettes (primary/secondary/tertiary/neutral/neutral-variant) × 13 tones (0–100) | type scale (display/headline/title/body/label × sm/md/lg) | easing + duration tokens |
| IBM Carbon | Apache-2.0 | `carbon-design-system/carbon` → `packages/themes`, `packages/type`, `packages/elements`, `packages/motion` | JS + Sass + Style Dictionary outputs | White/Gray-10/Gray-90/Gray-100 themes, 10-step gray + interactive/support/UI tokens | "Productive" + "Expressive" ramps (IBM Plex) | dedicated `@carbon/motion` (productive/expressive durations + easings) |
| GitHub Primer | MIT | `primer/primitives` → `src/tokens/**` | **DTCG JSON** (W3C format as of v11) | light/dark/high-contrast/colorblind variants | `text-{role}-shorthand-{size}` | `--duration-*` + reduced-motion aware |
| Shopify Polaris | MIT | `Shopify/polaris-tokens` (active on npm, GitHub repo archived — tokens now live in the Polaris monorepo under `polaris-tokens`) | JSON (Style Dictionary) | surface/text/border/interactive semantic tokens | base + display ramp | `motion-duration-*`, `motion-keyframes-*` |
| Microsoft Fluent 2 | MIT | `microsoft/fluentui` + `microsoft/fluentui-token-pipeline` | Migrating to **DTCG JSON** (pipeline still supports legacy proprietary format) | Global + Alias layers; 16-step neutral + brand ramp | caption/body/subtitle/title/display ramp | duration + curve tokens |
| Adobe Spectrum | Apache-2.0 | `adobe/spectrum-design-data` (renamed from `adobe/spectrum-tokens`, npm name unchanged) | Custom JSON today, **DTCG output RFC landing 2026** (`dist/dtcg/color-palette.json`, `typography.json`, `layout.json`, `resolver.json`) | 17 hue families × 14 steps + gray × 2 backgrounds × 2 color spaces (sRGB + P3) | type + layout tokens | animation tokens (global/alias) |
| Ant Design | MIT | `ant-design/ant-design` → `components/theme/themes/**` + generated `token-meta.json` | TypeScript seed/map/alias (not DTCG), but full metadata dump is JSON | 13 preset palettes × 10 tints, seed→map derivation | 6-step `fontSize*` ramp + heights | `motionDurationFast/Mid/Slow` + easing seeds |
| Chakra UI v3 | MIT | `chakra-ui/chakra-ui` | TS config → generated `--chakra-*` CSS vars; 7 semantic variants per palette (solid/muted/subtle/emphasized/contrast/fg/focusRing) | ~20 palettes × 10 shades | `textStyles` + `fontSizes` | `durations`, `easings` |
| USWDS | Public Domain (US Gov) | `uswds/uswds` | Sass variables + generated CSS | ~30 color families × 10 grades ("vivid" variants marked `v`) | Source Sans / Public Sans ramps | limited (transition duration) |
| daisyUI | MIT | `saadeghi/daisyui` | CSS custom properties via Tailwind `@plugin "daisyui/theme"` | 5 semantic roles (primary/secondary/accent/neutral/base) × 3 base shades, ~35 prebuilt themes | inherits Tailwind | radius tokens (`--radius-box/field/selector`), limited motion |
| shadcn/ui | MIT | `shadcn-ui/ui` | CSS custom properties (HSL by default, OKLCH option); distributed via CLI, not a package | semantic only (background/foreground/primary/secondary/muted/accent/destructive/border/input/ring + chart-1..5 + sidebar) | inherits Tailwind + user font | `--radius` only; no motion tokens |

---

## Detail notes

### Radix Colors — `radix-ui/colors` (MIT, © WorkOS)
- 30 named scales (gray/mauve/slate/sage/olive/sand + 24 hues), each 12 steps, with matched `*A` (alpha), `*Dark`, `*DarkA`, and `*P3` variants.
- Source is TypeScript objects in `src/*.ts`; ships CSS custom properties at runtime.
- **Strongest prior art for accessible perceptual color ramps.** Color-only — no typography, spacing, or motion.

### Radix Themes — `radix-ui/themes`
- Token CSS lives at `packages/radix-ui-themes/src/styles/tokens/` (`base.css`, `color.css`, `layout.css`, `typography.css`, …).
- 9-step type scale, 9-step space scale (4px–64px), `--scaling` global multiplier, easing + duration vars.
- Consumes Radix Colors. Good example of "tokens as CSS custom properties, nothing else."

### Material Design 3 — `material-foundation/material-tokens`
- Apache-2.0, JSON "DSP" format (pre-DTCG); archived Aug 2023 but still the canonical M3 token dump.
- Reference tokens: 5 tonal palettes × 13 tones. System tokens: semantic color roles (`md.sys.color.primary`, `on-primary`, `surface-container-*`, …).
- Full type scale, elevation, shape, and motion (`md.sys.motion.easing-*`, `duration-*`).

### IBM Carbon — `carbon-design-system/carbon`
- Tokens split across `@carbon/themes` (color), `@carbon/type`, `@carbon/layout`, `@carbon/motion`, `@carbon/elements`.
- Four built-in themes (White, Gray 10, Gray 90, Gray 100). Motion tokens are **exceptionally well-documented** (separate productive vs expressive easings).

### GitHub Primer — `primer/primitives`
- **DTCG W3C format** (v11+, breaking change from legacy shorthand).
- Token domains: color (light, dark, dark-dimmed, high-contrast, colorblind), typography (`text-{role}-shorthand-{size}`), size, z-index, motion.
- WCAG AA enforced in the token guide; motion tokens respect `prefers-reduced-motion` and cap UI interactions at ≤300ms.
- **Best DTCG reference** in the list — copy their folder layout.

### Shopify Polaris — `@shopify/polaris-tokens`
- MIT. Old standalone repo archived Apr 2022; tokens are active on npm (9.x series) and in the Polaris monorepo.
- Style Dictionary JSON. Semantic-only color model (no raw palette exposed). Includes `motion-duration-*` and `motion-keyframes-*`.

### Microsoft Fluent 2 — `microsoft/fluentui-token-pipeline`
- MIT. Pipeline is public; the canonical `microsoft/fluentui-design-tokens` repo is private.
- Two-layer model (Global + Alias). Migrating from a proprietary JSON format to **DTCG draft**.
- Token categories: color, typography, stroke, radius, animation.

### Adobe Spectrum — `adobe/spectrum-design-data`
- Apache-2.0. Repo renamed from `adobe/spectrum-tokens`; npm stays `@adobe/spectrum-tokens`.
- Custom JSON schema today; open RFC to emit `dist/dtcg/` alongside existing `dist/json/` with `color-palette.json`, `typography.json`, `layout.json`, plus a `resolver.json` demonstrating multi-platform theming (iOS/Android/Web/Qt).
- Rare example with explicit **sRGB and P3** outputs per token.

### Ant Design — `ant-design/ant-design`
- MIT. `components/theme/themes/default/index.ts` + `compact/index.ts` define seed tokens; `derivative` function generates map tokens (including preset color palettes with 10 tints each).
- `scripts/generate-token-meta.ts` dumps `token-meta.json` with EN/CN names, source classification (seed/map/alias/component), and types — a useful **metadata companion** pattern.

### Chakra UI v3 — `chakra-ui/chakra-ui`
- MIT. Tokens are a TS config; framework generates `--chakra-*` CSS vars at build.
- v3 introduced 7 **semantic variants per color palette** (solid/muted/subtle/emphasized/contrast/fg/focusRing) that auto-adapt to dark mode.

### USWDS — `uswds/uswds`
- Public domain. Sass-first; color tokens express family + grade (e.g., `blue-60v` = grade 60, vivid).
- Grayscale family: lightest/lighter/light/base/dark/darker/darkest/ink. State families (error/warning/success/info) with `-warm`/`-cool` variants. Strongest public-sector/accessibility example.

### daisyUI — `saadeghi/daisyui`
- MIT. Tailwind plugin. Themes are pure CSS custom properties under `@plugin "daisyui/theme"`.
- 35 prebuilt themes (light, dark, cupcake, dracula, nord, corporate, retro, …). Tokens are **small and semantic** (5 color roles × 3 base tones + 3 radius vars) — excellent for LLM-friendly token emission.

### shadcn/ui — `shadcn-ui/ui`
- MIT. Not a design system — a distribution CLI for copy-pasted components. But its `globals.css` token convention (semantic-only, HSL or OKLCH, `.dark` overrides) is the **de-facto Tailwind-era contract**.
- No motion tokens; single `--radius`.

---

## Recommended reference fixtures for the repo

If we ship only 2–3 token bundles in `fixtures/` as anchor brands:

1. **Radix Colors + Radix Themes (MIT)** — the richest accessible color system + a minimal but complete CSS-variable token set (color, space, typography, radius, easing, duration). Small, tidy, modern.
2. **GitHub Primer primitives (MIT)** — best **DTCG-formatted** example, multi-theme (light/dark/dimmed/HC/colorblind), explicit motion tokens, WCAG-enforced. Use as the canonical DTCG reference.
3. **shadcn/ui default theme (MIT)** — the semantic-only Tailwind CSS-vars convention users expect today. Minimal, ubiquitous, good negative example (no motion/typography) to contrast against Primer.

(Secondary if space allows: **daisyUI** for its 35 theme variants as style-transfer corpus, and **Material 3** for tonal palette generation algorithms.)

---

## Sources

- [radix-ui/colors](https://github.com/radix-ui/colors) — README + `src/` layout.
- [radix-ui/themes — `src/styles/tokens/`](https://github.com/radix-ui/themes/tree/main/packages/radix-ui-themes/src/styles/tokens) — CSS token files.
- [material-foundation/material-tokens](https://github.com/material-foundation/material-tokens) — DSP JSON, archived 2023-08.
- [primer/primitives — DESIGN_TOKENS_GUIDE.md](https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md) + [CHANGELOG](https://github.com/primer/primitives/blob/main/CHANGELOG.md) — DTCG migration notes.
- [Shopify/polaris-tokens](https://github.com/shopify/polaris-tokens) + [npm `@shopify/polaris-tokens`](https://www.npmjs.com/package/@shopify/polaris-tokens).
- [microsoft/fluentui-token-pipeline](https://github.com/microsoft/fluentui-token-pipeline) + [Fluent 2 design-tokens docs](https://fluent2.microsoft.design/design-tokens).
- [adobe/spectrum-design-data — DTCG RFC #627](https://github.com/adobe/spectrum-design-data/discussions/627).
- [carbon-design-system/carbon](https://github.com/carbon-design-system/carbon) — `packages/themes`, `packages/motion`, `packages/type`.
- [ant-design/ant-design — components/theme/themes/default](https://github.com/ant-design/ant-design/blob/master/components/theme/themes/default/index.ts) + [generate-token-meta.ts](https://github.com/ant-design/ant-design/blob/master/scripts/generate-token-meta.ts).
- [chakra-ui/chakra-ui v3 tokens docs](https://chakra-ui.com/docs/theming/tokens).
- [uswds/uswds](https://github.com/uswds/uswds) + [designsystem.digital.gov/design-tokens](https://designsystem.digital.gov/design-tokens).
- [saadeghi/daisyui — utilities + themes docs](https://daisyui.com/docs/utilities).
- [shadcn-ui/ui — theming docs](https://ui.shadcn.com/docs/theming).
