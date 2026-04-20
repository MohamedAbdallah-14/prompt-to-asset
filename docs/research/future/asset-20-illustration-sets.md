# 20 — Illustration Sets & Character Libraries

External grounding digest for `prompt-to-asset`: open-source / free illustration
libraries and "open-peeps"-style character/scene sets useful as references for
brand illustration, fallback hero art, and demo content.

**Research value: high** — Several true CC0 / MIT-licensed sources exist with
good SVG coverage; the main risk is a handful of well-known libraries that
*look* free but carry attribution or "no merch / no train" clauses that are
easy to miss.

## TL;DR — safest picks and traps

- **Safest to bundle / recolor freely (CC0 or MIT-like, no attribution):**
  Open Peeps, Open Doodles, Humaaans (per creator's humaaans.com), unDraw
  (MIT, see caveats), IRA Design (MIT), Pixel True free pack, ManyPixels
  gallery, Blush free tier (PNG only), Doodle Ipsum (Blush-backed).
- **Attribution required — trap for brand UI:** Storyset (Freepik), Absurd
  Design, some DrawKit freebies, various Freepik-hosted sets.
- **"Free" but with no-merch / no-redistribute / no-AI-training clauses
  even in permissive tiers:** unDraw, DrawKit, Blush, ManyPixels, Pixel True.
  All fine for in-app UI art; none safe as merch primitives or as training
  data for models that ship in the product.

## Per-library breakdown

### 1. unDraw — Katerina Limpitsouni

- URL: https://undraw.co/ · License page: https://undraw.co/license
- License: Described as MIT; the actual wording is a **custom MIT-flavored
  license** with extra prohibitions — explicitly **no AI/ML training,
  no bulk scraping, no redistribution in packs, no building a competing
  service**. Commercial and modification use is free, no attribution.
- Format: **SVG only**.
- Recolor: Yes — single primary color is a CSS variable / swap token; the
  canonical workflow is replacing `#6c63ff` (or the chosen primary) at
  download time from the site, or doing the swap post-download.
- Count: ~ 3,000+ illustrations as of 2026.
- Verdict: **Safe for app UI, recolor-friendly.** Do NOT bundle the whole
  set as a resource in the product, do NOT feed it into any image
  generation / style-transfer training.

### 2. Humaaans — Pablo Stanley

- URL: https://www.humaaans.com/ · Source mirrors on GitHub (e.g.
  Calinou/humaaans).
- License: **humaaans.com states CC0 (Public Domain)**. Some community
  mirrors/forks re-label it CC BY 4.0 — the authoritative signal is the
  author's own site, which says CC0. Treat as CC0 if pulling from the
  official source; if pulling from a third-party mirror, check that
  mirror's LICENSE file and prefer the official download.
- Format: **SVG + Sketch / Figma source**.
- Recolor: Yes — mix-and-match vector components (heads, tops, pants,
  positions); layered for color editing.
- Count: Dozens of body parts combinable into hundreds of characters.
- Verdict: **Safe as CC0 for commercial use and recolor.** Caveat: older
  derivatives redistributed as "Humaaans" packs may have been relicensed;
  source from humaaans.com.

### 3. Open Peeps — Pablo Stanley

- URL: https://openpeeps.com/
- License: **CC0 1.0 Universal (Public Domain)**. No attribution. Commercial
  OK. Modify, remix, redistribute OK.
- Format: **SVG** (multicolor + monochromatic variants); Sketch/Figma
  plugin via Blush; PNG export available.
- Recolor: Yes — full color editing on SVG layers. Monochromatic variant is
  the cleanest starting point for brand recoloring.
- Count: Described as 584k+ possible combinations across hairstyles,
  expressions, clothes, poses, accessories.
- Verdict: **Best-in-class for CC0 character art.** Recommended default
  for brand character system.

### 4. Open Doodles — Pablo Stanley

- URL: https://opendoodles.com/
- License: **CC0 1.0 Universal**. No attribution. Any use, including
  commercial.
- Format: **SVG, PNG (transparent, 300dpi), GIF**; source files on
  Dropbox with original Illustrator/Sketch structure.
- Recolor: Yes — SVG color editable; hand-drawn line + fill style
  recolors cleanly to a brand palette.
- Count: ~50+ hand-drawn illustrations (scenes and activities).
- Verdict: **Safe CC0 pick for hero / empty-state / onboarding art.**

### 5. Blush Design — mixed

- URL: https://blush.design/ · License: https://blush.design/license
- License: **Blush's own permissive license — commercial OK, no attribution,
  unlimited modify/combine.** Prohibits: reselling the raw assets,
  merchandising (print-on-product without substantial modification),
  building a competing illustration service, claiming ownership.
- Free tier: **PNG only** + limited catalog. **SVG + print-res PNG + full
  catalog is paid Blush Pro.**
- Format: Curated collections from many artists (including Pablo Stanley
  sets). Remember: the Blush platform license is the Blush license;
  the underlying sets (Open Peeps, Humaaans, Open Doodles) still carry
  their own CC0 / CC BY terms when downloaded from the source.
- Recolor: Yes — in-browser editor for body parts / color / pose.
- Verdict: **Convenient for mix-and-match; pay attention to free vs Pro
  for SVG.** For maximum clarity of rights, prefer pulling CC0 sets
  from their authoritative source instead of from Blush.

### 6. Storyset — Freepik ⚠️

- URL: https://storyset.com/ · Terms: https://storyset.com/terms
- License: **Free use requires attribution / credit to Storyset/Freepik.**
  Without attribution → requires Flaticon/Freepik Premium subscription.
  Client work is allowed only under strict conditions (tailor-made,
  not the main element of a resold item, the user — not the client —
  chooses which assets). Cannot redistribute, cannot use as a trademark,
  cannot be used as the main element in merchandise.
- Format: **SVG and PNG** via in-browser editor; animation export as
  HTML/GIF/MP4.
- Recolor: Yes — colors, backgrounds, elements editable in-browser
  before download.
- Count: Large (tens of thousands).
- Verdict: **TRAP.** Highly visible and tempting, but the attribution
  requirement is an in-product-UI credit obligation. Use only if you're
  willing to either show a Storyset credit or buy Premium; otherwise
  avoid for any bundled brand art.

### 7. DrawKit — James Daly

- URL: https://drawkit.com/ · License: https://drawkit.com/license
- License: **Custom "non-exclusive, non-transferable, royalty-free,
  worldwide" license** — not MIT and not CC BY (despite some older
  third-party sources saying so). Commercial OK, no attribution.
  Prohibits: reselling/relicensing the files, merch (t-shirts, mugs,
  posters), redistribution as packs, **use to train AI/ML models**.
- Format: **SVG + PNG**; free section vs paid Pro.
- Recolor: Yes — layered SVGs, color-swappable.
- Count: Free section is limited; Pro is the large library.
- Verdict: **Safe for app UI art, not for merch, not for training data.**

### 8. Absurd Design — Nice Illustrations SL ⚠️

- URL: https://absurd.design/ · License: https://absurd.design/freelicense
- License: **Free commercial use WITH mandatory attribution:** must credit
  `Illustration(s) from absurd.design` with an active link in every
  project that uses them. Cannot resell or redistribute.
- Format: **PNG with transparent backgrounds** (primary distribution;
  SVG for paid tier).
- Recolor: Limited — PNG-based; transparency helps compositing but
  color editing is pixel-level, not vector-clean.
- Count: Hundreds, surreal hand-drawn style.
- Verdict: **TRAP for brand UI** — attribution-in-project is easy to
  forget and unlikely to be acceptable in polished product UI. Use
  selectively and only where a visible credit is fine.

### 9. IRA Design — Creative Tim

- URL: https://iradesign.io/ · Source:
  https://github.com/ira-design/ira-illustrations
- License: **MIT** (confirmed on GitHub repo). Commercial OK, no
  attribution. The caller's note of "CC BY 4.0" is not accurate for
  the upstream repo — it is MIT.
- Format: **PNG, SVG, AI**.
- Recolor: Yes — built around mixing 5 gradient color sets; gradient +
  outline variants of every object.
- Count: ~36 characters + 52 objects + 15 backgrounds (gradient + outline
  mix), assembled from modular parts.
- Verdict: **Safe MIT, gradient-heavy style — good if brand accepts a
  gradient aesthetic.**

### 10. Pixel True — Pixel True Studio

- URL: https://www.pixeltrue.com/ · License:
  https://www.pixeltrue.com/license
- License: **Royalty-free commercial + personal use, no attribution
  required.** Some sources describe the free pack as "MIT-like." Prohibits
  redistribution, resale, templates-for-sale, and merchandising.
- Format: **SVG, PNG, GIF, Lottie JSON** (for animations).
- Recolor: Yes — SVG layers are color-editable; Lottie animations
  support color variables.
- Count: 500+ free illustrations and animations in the free collection;
  much larger paid catalog.
- Verdict: **Safe for app UI; animations are a differentiator.** Don't
  redistribute as a pack.

### 11. ManyPixels — ManyPixels Pte Ltd

- URL: https://www.manypixels.co/gallery · License:
  https://www.manypixels.co/gallery/license
- License: **Permissive custom license** — commercial and non-commercial,
  no attribution, no cost. Prohibits: replicating a similar/competing
  service, redistributing illustrations in packs, automated embed/link
  scraping.
- Format: **SVG + PNG** across multiple style families (Playstroke,
  Birdview, Chromablue, Colossalflat, Azureline).
- Recolor: Yes — color filter in gallery; SVG layers editable.
- Count: **20,000+** illustrations in the gallery.
- Verdict: **Best volume-to-freedom ratio among non-CC0 options.** Treat
  like Blush: don't ship a pack; do use for UI and demos.

### 12. Doodle Ipsum — Blush

- URL: https://doodleipsum.com/
- License: **Blush license** (see #5). Free commercial use, no
  attribution. Same restrictions as Blush.
- Format: **Embed URL / PNG / SVG** — designed as a placeholder-doodle
  generator with size/color/style parameters (Flat, Hand drawn, Outline,
  Abstract, Avatar, etc.).
- Recolor: Yes — color and style are URL parameters.
- Count: Generator over the Blush catalog.
- Verdict: **Safe for demo content and prototyping.** Be aware that the
  underlying catalog is Blush's, so production UI should treat this
  the same way as Blush.

### 13. "Duotone Doodles" / dddoodle

- URL: https://www.fffuel.co/dddoodle/
- License: **Creative Commons Attribution (CC BY)** — attribution required
  for commercial use.
- Format: **SVG**, 120+ hand-drawn doodles.
- Recolor: Yes — single-color SVGs, trivial to duotone.
- Verdict: **Attribution required — trap unless you're willing to credit
  fffuel.co.** The caller's "Duotone Doodles" likely refers to this or
  similar fffuel sets — not CC0.

## Traps — quick reference

| Library      | Trap                                                                    |
|--------------|-------------------------------------------------------------------------|
| Storyset     | Free tier requires attribution in every project using the assets.       |
| Absurd Design| Requires attribution with link in every project, even commercial.       |
| DrawKit      | Not MIT / not CC — looks open but forbids merch and AI/ML training.     |
| Blush free   | PNG only; SVG and full catalog are paid.                                |
| unDraw       | MIT-named but forbids AI training and bulk pack redistribution.         |
| Pixel True   | Free pack OK, but no redistribution and no templates-for-sale.          |
| fffuel sets  | Several are CC BY, not CC0 — double-check per set.                      |
| Freepik at   | Most Freepik-hosted sets require attribution in the free tier.          |
| large        |                                                                         |

## Recommendation for `prompt-to-asset`

- **Primary brand character system:** Open Peeps (CC0) + Humaaans (CC0
  from humaaans.com) — both from Pablo Stanley, visually adjacent,
  no attribution, SVG, fully recolorable.
- **Hero / empty-state / onboarding scenes:** Open Doodles (CC0),
  unDraw (MIT-with-caveats) with primary-color swap.
- **Gradient-flavored variant (if brand needs it):** IRA Design (MIT).
- **Volume fallback for demo content only:** ManyPixels gallery,
  Pixel True free pack — don't bundle as a redistributable set.
- **Avoid bundling in the product:** Storyset, Absurd Design, DrawKit,
  Blush raw assets — each has attribution or redistribution clauses
  that make them risky for brand UI at scale.

## Sources

- https://undraw.co/license — unDraw license, custom MIT-flavor with
  AI-training and pack-redistribution prohibitions.
- https://openpeeps.com/ — Open Peeps CC0 confirmation, formats, counts.
- https://opendoodles.com/about — Open Doodles CC0 confirmation, formats.
- https://www.humaaans.com/ — Humaaans CC0 stated on official site.
- https://blush.design/license — Blush custom commercial license terms.
- https://blush.design/plans — Free (PNG) vs Pro (SVG) distinction.
- https://storyset.com/terms — Storyset attribution/credit requirement
  and client-work conditions.
- https://drawkit.com/license — DrawKit custom license, AI-training and
  merch prohibitions.
- https://absurd.design/freelicense — Absurd Design mandatory attribution
  with active link.
- https://github.com/ira-design/ira-illustrations — IRA Design MIT
  license, source of truth.
- https://www.pixeltrue.com/license — Pixel True royalty-free terms.
- https://www.manypixels.co/gallery/license — ManyPixels permissive
  custom license, no attribution.
- https://doodleipsum.com/ — Doodle Ipsum (Blush-backed) licensing.
- https://www.fffuel.co/dddoodle/ — dddoodle, CC BY doodle set.
