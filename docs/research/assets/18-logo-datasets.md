# 18 · Logo, Brand, and Icon Datasets

External grounding for building eval/retrieval/training corpora for the
`prompt-to-asset` project. Use cases in scope:

- **Eval fixture** — "does our generated logo look like a real logo?"
  (distributional realism, FID, CLIP-score vs. a logo-like reference set).
- **Style classifier / retrieval** — nearest-neighbor lookup from generated
  output to the "closest real mark" for style, deduplication, or
  trademark-risk flagging.
- **Training / fine-tuning** — LoRA or classifier-head fine-tunes. This is the
  most legally dangerous use; see caveats below.

---

## 0. Legal caveats — read first

These apply to **every** entry in this doc. Do not skip.

1. **Dataset license ≠ trademark rights.** A CC0 or CC-BY *file* does not give
   you the right to use a brand mark. Even if you can legally redistribute the
   PNG, depicting (say) the Coca-Cola logo on a product, in a promo, or as
   generated output that a user would mistake for the real mark is a
   trademark problem, not a copyright problem. These regimes are independent.
2. **"For research only" means what it says.** LLD, WebLogo-2M, BelgaLogos,
   Logo-2K+, FlickrLogos-32/47, QMUL-OpenLogo, and LogoDet-3K are all
   non-commercial or "academic use only" in practice. Using them to train or
   fine-tune a model you ship commercially is almost certainly a license
   violation, and the derivative-rights question on top of that is unsettled.
3. **Scraped-from-web logos carry third-party copyright.** Most of the
   academic datasets above were built by crawling Google/Twitter/Flickr and
   never cleared rights. The dataset author's license only covers the
   *annotations*, not the underlying images. Takedown clauses ("if this is
   yours, email us") are the rule.
4. **Threshold of originality (TOO) is jurisdiction-specific.** Many simple
   wordmarks (FedEx, IBM, Microsoft wordmark) are below the US copyright
   threshold and live as PD in Wikimedia Commons. They are still trademarks.
5. **Eval use is the safest use.** A small, non-redistributable,
   internally-held eval set of scraped marks is on firmer ground than a
   redistributed or training corpus — but you still should not ship it in the
   repo.

If the project ever distributes a logo corpus (e.g., as test fixtures in the
git repo, on HF Hub, or in releases), the redistribution itself needs to be
license-clean. That rules out most of the academic canon.

---

## 1. Dataset inventory

### LLD — Large Logo Dataset (Sage et al., ETH Zürich)

- **URL**: <https://data.vision.ee.ethz.ch/sagea/lld/>
- **Size**: 600k+ logos in two halves:
  - `LLD-icon` — 548,210 favicons at 32×32 (486,377 in "clean" GAN subset).
  - `LLD-logo` — 122,920 Twitter-profile logos, mostly 400×400.
- **License**: **Academic research only**. Copyright remains with original
  owners; ETH hosts under a takedown policy.
- **Label schema**: No semantic labels. Provides *synthetic cluster labels*
  from ResNet features (32/64/128 clusters) plus AE-grayscale clusters,
  designed for conditional GAN training. Metadata includes domain name /
  Twitter user id.
- **Caveats**: The `LLD-logo` raw set was flagged by the authors as
  containing non-logo and NSFW content. Favicons skew toward low-quality
  upscales (54% are upscaled from sub-32px). Good for generative *realism*
  priors; not for class recognition.

### WebLogo-2M (Hang Su, QMUL, ICCV 2017)

- **URL**: <https://weblogo2m.github.io/>
- **Size**: ~2.19M weakly-labelled web images, 194 logo classes, 6,569
  manually labelled test images.
- **License**: **Academic research only.** Explicit takedown policy.
- **Label schema**: 194 brand names, weak labels (noisy) for train, clean
  for test.
- **Caveats**: Weak-label noise is ~30%+; this was the whole point of the
  paper. Not a clean benchmark.

### Logo-2K+ (Wang et al., AAAI 2020)

- **URL**: <https://github.com/msn199959/Logo-2k-plus-Dataset>,
  paper <https://arxiv.org/abs/1911.07924>
- **Size**: 167,140 images, 2,341 brand classes, 10 root categories (Food,
  Clothes, Institution, Accessories, Transportation, Electronic,
  Necessities, Cosmetic, Leisure, Medical).
- **License**: **Non-commercial** (explicitly stated on the FMI data
  index mirror).
- **Label schema**: Two-level taxonomy (root category → brand). Good for
  scalable classification benchmarks.
- **Caveats**: Long tail — many classes have <50 examples. Source: web
  scrape, so per-image copyright is not cleared.

### FlickrLogos-32 / FlickrLogos-47 (U. Augsburg)

- **URL**: <https://www.uni-augsburg.de/en/fakultaet/fai/informatik/prof/mmc/research/datensatze/flickrlogos/>
- **Size**: 32 brands × 70 images (2,240 images) for FL-32; FL-47 adds
  splits and corrects multi-logo-per-image labels, ~8.2k logos over 47
  classes.
- **License**: Research use; redistribution discouraged. Individual Flickr
  images retain their original Flickr license.
- **Label schema**: Per-image brand class + pixel-level segmentation masks
  and bounding boxes. Historically the standard detection benchmark.
- **Caveats**: Small — obsolete for modern detector training but still
  cited as a retrieval benchmark.

### QMUL-OpenLogo (Su et al.)

- **URL**: <https://hangsu0730.github.io/qmul-openlogo/>
- **Size**: 27,083 images, 352 classes, aggregated from 7 existing
  datasets (FlickrLogos, BelgaLogos, WebLogo, etc.).
- **License**: **Inherits the licenses of its sources**, all of which are
  research-only. Treat as research-only.
- **Label schema**: 352 brand classes with bounding boxes; designed for
  open-set detection (classes without training data).
- **Caveats**: Because it is an aggregation, the license story is the
  weakest of the bunch. Don't redistribute.

### BelgaLogos / FlickrBelgaLogos (INRIA, Joly et al.)

- **URL**: <https://www-sop.inria.fr/members/Alexis.Joly/BelgaLogos/BelgaLogos.html>
- **Size**: 10,000 press photos, 26–37 logo classes with bounding-box
  ground truth.
- **License**: **Research only**, images copyright BELGA press agency.
- **Label schema**: Brand + bounding box; the companion FlickrBelgaLogos
  set composites Belga logos into Flickr scenes as synthetic training
  data.
- **Caveats**: Press-photo domain is distinct from web logos; expect
  distribution shift if you mix it with favicon-style data.

### LogoDet-3K (Wang et al., 2020)

- **URL**: <https://github.com/Wangjing1551/LogoDet-3K-Dataset>,
  paper <https://arxiv.org/abs/2008.05359>
- **Size**: 158,652 images, 3,000 logo categories, ~200k annotated logo
  objects, 9 super-categories.
- **License**: Paper is CC-BY 4.0; **dataset itself has no explicit
  license file**. Images were web-scraped, so per-image rights are
  uncleared. Treat as research-only in practice.
- **Label schema**: Bounding boxes per logo, flat 3k-class label, plus a
  9-class super-category taxonomy.
- **Caveats**: Currently the largest fully-annotated detection dataset.
  Download is via Baidu / a Chinese research server; mirror reliability
  is iffy.

### L3D — Large Labelled Logo Dataset (Gutiérrez-Fandiño et al., 2021)

- **URL**: <https://lhf-labs.github.io/tm-dataset/>,
  data on Zenodo <https://doi.org/10.5281/zenodo.5771006>,
  code <https://github.com/lhf-labs/tm-dataset>
- **Size**: ~770,000 hand-labelled 256×256 RGB images.
- **License**: **CC-BY 4.0** on the dataset (this is the standout here —
  derived from the EUIPO open trademark registry, which the EU publishes
  openly).
- **Label schema**: **Vienna classification** — a hierarchical taxonomy of
  figurative elements (e.g., "animals / felines / lion / standing")
  applied by EUIPO examiners. Multi-label per image. Also suitable for
  OCR, conditional generation, segmentation, retrieval.
- **Caveats**: These are *registered trademarks*. CC-BY lets you
  redistribute the PNGs with attribution, but **every image is a
  someone-else's trademark** — training a generative model on L3D still
  produces trademark-risk outputs. Label semantics are figurative-element
  taxonomies, not brand identity.

### Other notable mentions

- **METU Trademark Dataset** — 923,343 trademark images from around the
  world, research-on-request only. <https://github.com/neouyghur/METU-TRADEMARK-DATASET>
- **WiRLD (Wikidata Reference Logo Dataset)** — paper-stage corpus of
  ~100k brand logos harvested from Wikidata; not a stable public
  distribution.
- **"logo-images-dataset" (revanks)** — 556k images, 625 brands scraped
  from search engines; no license, do not use.

---

## 2. Brand-extractor scripts and registry sources

These are *pipelines*, not finished corpora. They matter because you can
usually produce a cleaner custom set than any of the academic datasets.

- **Wikidata brand logos** — Query Wikidata for `wdt:P154` (logo image) on
  items of instance type company/brand/product. Images resolve to
  Wikimedia Commons; per-file license is on the Commons page (CC0,
  CC-BY-SA, PD-textlogo for below-TOO wordmarks, or "trademarked"). A
  SPARQL query + per-file license check is the cleanest path. About 100k
  business brands are reachable this way.
- **Wikimedia Commons PD-textlogo / PD-shape** — Category of marks that
  are below the US threshold of originality. These are PD for copyright
  purposes but still trademarks.
- **OpenCorporates** — Company-registry data (not logos). Useful for
  building the *brand-name taxonomy* you attach logos to, not for image
  retrieval. Terms: bulk data is CC-BY-SA but the API is rate-limited
  and commercial redistribution of bulk dumps requires a paid tier.
- **EUIPO open registry** — The upstream source of L3D. You can query it
  directly via their eSearch plus API and get Vienna-classified
  trademark images. Same trademark caveat as L3D.
- **USPTO TESS / bulk trademark data** — US equivalent, also open.
  Vienna-coded. No generative-use grant.
- **Apify `wikimedia-logos` actor** — Paid helper ($5 per 1k results)
  that resolves Commons file pages to image URLs. Not worth it unless you
  are already on Apify.

---

## 3. Icon and brand-mark libraries (distinct from "logos in the wild")

These are *vector* libraries of clean brand marks. They occupy a different
niche: good for UI, not for training a realism classifier because the
distribution is too clean.

### SimpleIcons

- **URL**: <https://simpleicons.org>
- **Size**: ~3,300 brand marks as single-color SVG paths.
- **License**: Repository / path data is **CC0 1.0**. But: each icon's
  per-brand metadata file lists a `license` field (some brands override
  to CC-BY, Apache-2.0, etc.) and a `guidelines` URL. Read
  `DISCLAIMER.md` — the project explicitly says CC0 on the paths does
  **not** grant trademark permission.
- **Caveats**: This is the single biggest legal trap people walk into.
  The SVG is CC0; the *brand* is not. You can ship the path. You cannot
  imply endorsement, put it on merch, or use it in a way that causes
  confusion. For an eval set this is ideal; for generative training data
  it's an attractive nuisance.

### Iconfinder (free tier)

- **URL**: <https://www.iconfinder.com>, API
  <https://developer.iconfinder.com/>
- **Model**: Per-icon license chosen by each uploader. "Free" usually
  means "Free with attribution" — commercial use is allowed but
  attribution is mandatory. The Basic (paid) license drops attribution
  and adds merch/app-store redistribution rights but still forbids
  reselling the icons themselves.
- **API**: Free tier ~5k req/month (v4); commercial terms require a
  paid plan for redistribution.
- **Caveats**: Because license is per-icon, a bulk download from the
  free tier is a mixed bag — you have to filter by license field. Brand
  icons carry the same trademark caveat as SimpleIcons.

### Font-logo / typography datasets

These are adjacent: useful if you care about *wordmark realism* rather
than pictorial marks.

- **TMNIST (Typography-MNIST)** — 565,292 glyphs × 1,812 unique chars ×
  1,355 Google Fonts styles. Google Fonts are mostly **OFL 1.1**, so
  derivatives and commercial use are fine. Great for wordmark FID.
- **FontUse (2026)** — ~70k images annotated with font style, use case,
  text region, OCR string. Paper-stage, license TBD. Worth tracking.
- **Google Fonts corpus directly** — ~1.5k OFL families you can render
  synthetic wordmarks from. This is the cleanest path for wordmark eval.

---

## 4. Recommendation — a curated, commercially redistributable eval set

Given the legal constraints, here is what the project can actually ship as
eval fixtures in this repo without creating a trademark or license problem.
Target size: ~1-2k images, mixed vector and raster, under clean licenses.

**Primary build (recommended)**

1. **~500 SimpleIcons SVGs** rendered to PNG at 256×256 and 512×512.
   Filter to icons whose per-icon `license` field is CC0 or CC-BY; skip
   any whose `guidelines` URL forbids derivative use. Ship the CC-BY
   subset with attribution metadata. This gives you clean pictorial +
   wordmark brand marks.
2. **~500 synthetic wordmarks** generated from Google Fonts (OFL).
   Render random 1–3 word brand names in varied families, weights, and
   colors. This is 100% yours, no trademark attached (pick names from a
   random-string generator, not a real-company list).
3. **~200 L3D samples** selected for diversity across Vienna classes,
   redistributed under CC-BY 4.0 with attribution. Use these as the
   "real-world trademark distribution" anchor — clearly label in the
   fixture README that these are registered marks and the CC-BY grant is
   copyright-only.
4. **~200 CC0 Wikimedia Commons PD-textlogo marks** — easy to harvest
   via SPARQL + Commons API. Copyright-clean but still trademarks;
   document this.

**Do not ship**

- Any subset of LLD, WebLogo-2M, Logo-2K+, FlickrLogos, QMUL-OpenLogo,
  BelgaLogos, or LogoDet-3K. Research-only.
- Any Iconfinder free-tier bulk download — license varies per icon and
  the download itself is not a redistribution grant.
- Any scraped "logos of the Fortune 500" set.

**For internal evaluation only (not distributed)**

If the team wants a "realism vs. the actual web" benchmark that is never
redistributed and only runs inside CI, LLD-logo (cleaned) is the least
objectionable. Keep it on a private bucket, document the research-only
license, and never check it into git.

**For training / fine-tuning**

Best legal footing: L3D (CC-BY 4.0) + Google Fonts wordmarks. Everything
else has meaningful downstream risk for a shipped commercial product.

---

## 5. Sources

- LLD homepage and license — <https://data.vision.ee.ethz.ch/sagea/lld/>
- WebLogo-2M — <https://weblogo2m.github.io/>
- Logo-2K+ GitHub — <https://github.com/msn199959/Logo-2k-plus-Dataset>,
  FMI license note — <https://fmi-data-index.github.io/logo2k.html>
- QMUL-OpenLogo — <https://hangsu0730.github.io/qmul-openlogo/>
- BelgaLogos — <https://www-sop.inria.fr/members/Alexis.Joly/BelgaLogos/>
- LogoDet-3K — <https://github.com/Wangjing1551/LogoDet-3K-Dataset>,
  <https://arxiv.org/abs/2008.05359>
- L3D — <https://lhf-labs.github.io/tm-dataset/>,
  <https://arxiv.org/abs/2112.05404>, Zenodo DOI 10.5281/zenodo.5771006
- SimpleIcons disclaimer —
  <https://github.com/simple-icons/simple-icons/blob/master/DISCLAIMER.md>
- Iconfinder license docs —
  <https://support.iconfinder.com/en/articles/2184390-introduction-to-licenses-on-iconfinder>
- TMNIST — <https://arxiv.org/abs/2202.08112>
- FontUse — <https://arxiv.org/html/2603.06038v1>
- FlickrLogos — <https://www.uni-augsburg.de/en/fakultaet/fai/informatik/prof/mmc/research/datensatze/flickrlogos/>
