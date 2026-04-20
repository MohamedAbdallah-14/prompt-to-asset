# Open-Source Font Collections for `prompt-to-asset`

Research grounding for typographic assets: OG images, wordmarks, composed marks, and Satori-templated artwork. Scope is restricted to permissive licenses suitable for unrestricted bundling and redistribution: **SIL Open Font License 1.1 (OFL)**, **Apache License 2.0**, and **Ubuntu Font License (UFL)**.

---

## 1. Why license matters here

For OG-image and wordmark workflows, font files are *bundled into the artifact* (embedded in SVG/PNG via Satori, or shipped inside `/public` for self-hosting). The practical constraints:

| License | Bundle into app? | Modify? | Redistribute? | Restrictions |
|---|---|---|---|---|
| **OFL 1.1** | Yes | Yes | Yes | Cannot sell font files standalone; derivatives must stay OFL; Reserved Font Name rules |
| **Apache 2.0** | Yes | Yes | Yes | Attribution notice in distribution; most permissive for font derivatives |
| **Ubuntu Font License 1.0** | Yes | Yes (with RFN rules) | Yes | Similar spirit to OFL; Canonical-centric |

All three are compatible with commercial SaaS, self-hosting, and static asset inclusion. None require end-user attribution in the rendered image.

> **Fontshare caveat.** Fontshare (Indian Type Foundry) markets "free for commercial use" but fonts are licensed under an **ITF EULA**, **not OFL**. Some ITF families (notably **Poppins**) are *separately* released as OFL on GitHub (`itfoundry/Poppins`). For this project, prefer the OFL GitHub releases over Fontshare downloads when available, so we retain modify/redistribute rights.

---

## 2. Satori rendering constraints (load-bearing)

Satori (Vercel's HTML → SVG engine behind `@vercel/og`) has **known bugs parsing TTF variable fonts** ([vercel/satori#162](https://github.com/vercel/satori/issues/162), #712). Symptoms: `Cannot read properties of undefined (reading '256')` in `parseFvarAxis`. WOFF variable fonts parse but often don't render the correct instance.

**Implication for this project:** do not rely on `*-Variable.ttf` inside Satori. Ship **static TTF/OTF weights** (400/600/700/900 typically) as `ArrayBuffer` per the Satori font config. Reserve `@fontsource-variable/*` packages for browser-side rendering only (regular web pages, Tailwind `font-family`).

---

## 3. Distribution surfaces

| Surface | What it is | When to use |
|---|---|---|
| **Google Fonts** ([fonts.google.com](https://fonts.google.com), [google/fonts](https://github.com/google/fonts)) | Largest OFL-dominant catalog, Apache for Roboto core | Default browse/preview surface; copy font files from GitHub rather than the CDN when self-hosting |
| **Fontsource** ([fontsource.org](https://fontsource.org), `@fontsource/*` npm) | Individual npm packages per family, static weights | Self-hosting Google Fonts + some extras via npm; zero-dep |
| **Fontsource Variable** (`@fontsource-variable/*`) | Variable-axis versions of the same families | Browser CSS only; **not** for Satori |
| **Open Foundry** ([open-foundry.com](https://open-foundry.com)) | Hand-curated open-source type showcase (no downloads hosted) | Discovery surface for quality filter; follow links to upstream repos |
| **The League of Moveable Type** ([theleagueofmovabletype.com](https://www.theleagueofmovabletype.com/)) | First OSS font foundry, entire catalog OFL | Display/branding fonts with curated identity (League Spartan, League Mono, Raleway, Orbitron) |
| **SIL** ([software.sil.org](https://software.sil.org)) | Linguistic/academic OFL families | Deep Unicode + IPA + Cyrillic/Greek coverage |
| **Upstream GitHub repos** (e.g., `rsms/inter`, `vercel/geist-font`, `IBM/plex`, `JetBrains/JetBrainsMono`) | Canonical source of truth | Preferred when pinning versions or auditing licenses |

---

## 4. Family-by-family reference

### Sans-serif / UI

| Family | Source | License | Weights | Variable? | Unicode notes | Suggested use |
|---|---|---|---|---|---|---|
| **Inter** | [rsms/inter](https://github.com/rsms/inter) | OFL 1.1 | 100–900 + italics | Yes (`InterVariable.ttf`) | Extended Latin, Cyrillic, Greek, Vietnamese | Primary UI body + wordmark workhorse |
| **Geist Sans** | [vercel/geist-font](https://github.com/vercel/geist-font) | OFL 1.1 | 100–900 | Yes | Latin-focused, minimal Cyrillic | Modern product/tech wordmark; pairs with Geist Mono |
| **IBM Plex Sans** | [IBM/plex](https://github.com/IBM/plex) | OFL 1.1 (RFN: "Plex") | Thin…Bold + italics | Partial (Serif variant has variable; Sans largely static) | Broad Latin + many Plex script variants (Arabic, Devanagari, Thai, etc.) | Enterprise/serious tone; multi-script needs |
| **Source Sans 3** | [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) | OFL 1.1 | 200–900 + italics | Yes (200–900 axis) | Latin, Greek, Cyrillic | Neutral UI body alternative to Inter |
| **Roboto** | [googlefonts/roboto](https://github.com/googlefonts/roboto) | **Apache 2.0** (core); OFL for Condensed/Flex/Mono/Serif | 100–900 + italics | Yes (wght + wdth axes) | Wide Latin, Cyrillic, Greek, Vietnamese | Fallback UI; Apache makes derivatives trivial |
| **Space Grotesk** | [floriankarsten/space-grotesk](https://github.com/floriankarsten/space-grotesk) | OFL 1.1 | 300–700 | Yes | Latin + Latin Extended | Editorial/product wordmark with slight geometric character |
| **Ubuntu** | [design.ubuntu.com/font](https://design.ubuntu.com/font) | **Ubuntu Font License 1.0** | Light…Bold + italics | No | Latin, Cyrillic, Greek, Hebrew, Arabic | Distinctive humanist voice; check UFL terms for any modification |
| **League Spartan** | [theleagueof/league-spartan](https://github.com/theleagueof/league-spartan) | OFL 1.1 | 100–900 | Yes | Latin | Geometric display/wordmark |
| **Raleway** | Google Fonts / League of Moveable Type | OFL 1.1 | 100–900 + italics | Yes | Latin, Latin Extended, Cyrillic, Vietnamese | Elegant display; avoid at very small body sizes |

### Serif / display

| Family | Source | License | Weights | Variable? | Unicode notes | Suggested use |
|---|---|---|---|---|---|---|
| **IBM Plex Serif** | [IBM/plex](https://github.com/IBM/plex) | OFL 1.1 | Thin…Bold + italics | Yes (v1.0+) | Latin, Greek, Cyrillic | Editorial OG images; long-form headings |
| **Source Serif 4** | [adobe-fonts/source-serif](https://github.com/adobe-fonts/source-serif) | OFL 1.1 | 200–900 + italics | Yes | Latin, Greek, Cyrillic | Classical serif body/display |
| **Playfair Display** | Google Fonts / [fontsource-variable/playfair-display](https://www.npmjs.com/package/@fontsource-variable/playfair-display) | OFL 1.1 | 400–900 + italics | Yes | Latin, Cyrillic, Vietnamese | High-contrast editorial headline / wordmark |
| **Gentium Plus** | [software.sil.org/gentium](https://software.sil.org/gentium/) | OFL 1.1 | Regular, Italic, Bold, Bold Italic | No | **~2,750+ chars**: Latin Ext-A/B, Greek+Coptic, Cyrillic+Ext, IPA, combining diacritics, math | Linguistics, multi-script literary text |
| **Charis SIL** | [software.sil.org/charis](https://software.sil.org/charis/) | OFL 1.1 | Regular, Italic, Bold, Bold Italic | No | **~3,800+ glyphs**; Roman + Cyrillic writing systems | Long-form body with heavy diacritic needs |

### Monospace / code

| Family | Source | License | Weights | Variable? | Notes | Suggested use |
|---|---|---|---|---|---|---|
| **JetBrains Mono** | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) | OFL 1.1 | 100–800 + italics | Yes (weight axis) | Programming ligatures; "NL" variant strips ligatures | Code samples in OG images, terminal-style wordmarks |
| **Geist Mono** | [vercel/geist-font](https://github.com/vercel/geist-font) | OFL 1.1 | 100–900 | Yes | Pairs with Geist Sans | Tech/product mono when matching Geist Sans |
| **IBM Plex Mono** | [IBM/plex](https://github.com/IBM/plex) | OFL 1.1 | Thin…Bold + italics | Static only | Broad Latin | Mono body with serifed character |
| **Space Mono** | Google Fonts | OFL 1.1 | Regular, Italic, Bold, Bold Italic | No | Latin Ext | Display-weight mono; quirky, branding-friendly |
| **League Mono** | [theleagueof/league-mono](https://github.com/theleagueof/league-mono) | OFL 1.1 | 8 static weights | No | Latin | Editorial mono; narrow/wide variants available |
| **Source Code Pro** | [adobe-fonts/source-code-pro](https://github.com/adobe-fonts/source-code-pro) | OFL 1.1 | 200–900 + italics | Yes | Latin, Greek, Cyrillic | Reliable mono body |

### Linguistic / literacy (broad Unicode)

| Family | Source | License | Coverage | Suggested use |
|---|---|---|---|---|
| **Andika** | [software.sil.org/andika](https://software.sil.org/andika/) | OFL 1.1 | Literacy-tuned Latin + Cyrillic; 240+ new glyphs in v6.200 (Unicode 14/15) | Educational content, low-literacy audiences |
| **Gentium Plus / Book Plus** | SIL | OFL 1.1 | Latin + Greek + Cyrillic + IPA | Academic/multi-script prose |
| **Charis SIL** | SIL | OFL 1.1 | Comprehensive Roman/Cyrillic | Long-form multi-script body |
| **Noto** family | [notofonts.github.io](https://notofonts.github.io/) | OFL 1.1 | Virtually all living scripts | Fallback for non-Latin OG images (Arabic, CJK, Devanagari, etc.) |

---

## 5. Use-case → recommended OFL fonts

| Use case | Primary | Alt 1 | Alt 2 |
|---|---|---|---|
| **Product wordmark (clean, modern)** | Geist Sans (OFL) | Inter (OFL) | Space Grotesk (OFL) |
| **Editorial OG image headline** | Playfair Display (OFL) | IBM Plex Serif (OFL) | Source Serif 4 (OFL) |
| **Body text on OG cards** | Inter (OFL) | Source Sans 3 (OFL) | Roboto (Apache 2.0) |
| **Monospace / code snippets in OG** | JetBrains Mono (OFL) | Geist Mono (OFL) | IBM Plex Mono (OFL) |
| **Display / distinctive wordmark** | League Spartan (OFL) | Space Grotesk (OFL) | Playfair Display (OFL) |
| **Multi-script / broad Unicode** | Noto Sans (OFL) | IBM Plex Sans (OFL) | Gentium Plus (OFL) |
| **Permissive-max (Apache) for heavy derivation** | Roboto (Apache 2.0) | Roboto Flex (OFL) | Ubuntu (UFL) |

---

## 6. Recommended starter bundle for `prompt-to-asset`

For Satori + self-hosted web, ship **static TTF** for rendering and **variable WOFF2** for browser CSS:

1. **Inter** — primary UI + OG body. Self-host via `@fontsource/inter` (static) + `@fontsource-variable/inter` (browser only).
2. **Geist Sans + Geist Mono** — product/branding pair; pull directly from [vercel/geist-font](https://github.com/vercel/geist-font) releases.
3. **JetBrains Mono** — code rendering in OG images; `@fontsource/jetbrains-mono` with weights `[400, 700]`.
4. **Playfair Display** — editorial accent for composed OG marks; static 700/900 only.
5. **Noto Sans (Latin subset)** — universal fallback inside Satori for CJK/Cyrillic/Arabic if content ever renders non-Latin.

Pin exact versions in `package.json` — Fontsource publishes semver and tracks upstream Google Fonts updates, so version-locking prevents silent metric drift across OG renders.

---

## 7. Sources

- [Google Fonts FAQ — licensing](https://developers.google.com/fonts/faq)
- [google/fonts GitHub](https://github.com/google/fonts) — canonical OFL/Apache font files
- [Fontsource](https://fontsource.org/) + [github.com/fontsource/fontsource](https://github.com/fontsource/fontsource)
- [Open Foundry](https://open-foundry.com/) — curated OSS type directory
- [The League of Moveable Type](https://www.theleagueofmovabletype.com/) + [theleagueof on GitHub](https://github.com/theleagueof/)
- [rsms/inter](https://github.com/rsms/inter) — Inter OFL repo
- [vercel/geist-font LICENSE.txt](https://github.com/vercel/geist-font/blob/main/LICENSE.txt) — OFL 1.1
- [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) — OFL 1.1, 8 weights + italics
- [IBM/plex LICENSE.txt](https://github.com/IBM/plex/blob/master/LICENSE.txt) — OFL 1.1 (Plex as RFN)
- [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) — Source Sans 3, OFL
- [googlefonts/roboto LICENSE](https://github.com/googlefonts/roboto/blob/main/LICENSE) — Apache 2.0
- [floriankarsten/space-grotesk OFL.txt](https://github.com/floriankarsten/space-grotesk/blob/master/OFL.txt)
- [software.sil.org/gentium](https://software.sil.org/gentium/), [charis](https://software.sil.org/charis/), [andika](https://software.sil.org/andika/)
- [Indian Type Foundry licensing](https://www.indiantypefoundry.com/licensing) — Fontshare is ITF EULA, not OFL
- [itfoundry/Poppins OFL.txt](https://github.com/itfoundry/Poppins/blob/master/OFL.txt) — OFL 1.1 (the OSS release path)
- [vercel/satori#162 — variable font bug](https://github.com/vercel/satori/issues/162)
- [vercel/satori font.ts](https://github.com/vercel/satori/blob/main/src/font.ts) — font config contract
