# Prompt Corpora & Style/Aesthetic Vocabularies

External grounding for the `prompt-to-asset` project's dialect rewriters. Evaluates open datasets of prompts, categorized style/modifier packs, and specialized vocabulary sources (artists, photography, negative prompts) for ingestion as tokenized modifier libraries or example-based few-shot corpora.

**Scope filter.** Each entry records URL, license, size, schema shape (flat list vs. tagged vs. paired prompt/negative), and fit for the rewriter pipeline (vocabulary fixture, example corpus, or taxonomy source).

---

## 1. Large prompt corpora (for example mining & MagicPrompt-style fine-tuning)

### 1.1 DiffusionDB — **primary corpus, CC0**
- **URL:** https://huggingface.co/datasets/poloclub/diffusiondb · https://github.com/poloclub/diffusiondb
- **License:** CC0 1.0 (public domain) — safe for any ingestion, including commercial redistribution of derived fixtures.
- **Size:**
  - *DiffusionDB 2M*: 2M images / **1.5M unique prompts** / ~1.6 TB (PNG).
  - *DiffusionDB Large*: 14M images / **1.8M unique prompts** / ~6.5 TB (WebP lossless).
  - Metadata alone is available as `metadata.parquet` / `metadata-large.parquet` (can be fetched without images — small, fast).
- **Schema (paired, richly-tagged):** per-prompt records with `p` (prompt), `se` (seed), `c` (CFG), `st` (steps), `sa` (sampler), plus image UUID. Parquet table is directly ingestable.
- **Fit:** **Excellent.** The canonical CC0 prompt corpus. Use metadata parquet for: (a) modifier frequency mining (extract n-grams like `trending on artstation`, `octane render`, `8k`), (b) fine-tuning a MagicPrompt-style rewriter, (c) example retrieval. Caveat: heavily SD-1.x flavored — expect over-representation of "masterpiece, best quality, 8k" legacy boilerplate that SDXL explicitly discourages.

### 1.2 Gustavosta/Stable-Diffusion-Prompts — **smallest useful fine-tune set**
- **URL:** https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts (paired with model `Gustavosta/MagicPrompt-Stable-Diffusion`)
- **License:** MIT.
- **Size:** ~80 000 filtered prompts scraped from Lexica.art. Also sibling datasets for DALL-E 2 and Midjourney dialects in the same org.
- **Schema:** flat newline-separated prompt strings (no hyperparams).
- **Fit:** **Excellent** as a drop-in fine-tune corpus for a small prompt-expander LM (GPT-2-base trained for 150k steps is the reference setup, 3.3M+ model downloads). Perfect for dialect-specific MagicPrompt variants: `MagicPrompt-Midjourney`, `MagicPrompt-Dalle`, `MagicPrompt-Stable-Diffusion` each give us separate dialects for free.

### 1.3 LexicaDataset (verazuo) — **prompt/image pairs with extracted modifiers**
- **URL:** https://huggingface.co/datasets/vera365/lexica_dataset (from `verazuo/prompt-stealing-attack`)
- **License:** research-oriented; underlying Lexica content is CC-licensed-per-image but the dataset repackaging is not CC0 — treat as **research-only** unless each image's base license is verified.
- **Size:** 61 467 prompt–image pairs.
- **Schema (tagged):** prompt, image, dimensions, seed, model, NSFW flag, **plus pre-extracted modifier tags** — this is the rare pre-tokenized field relevant to our taxonomy.
- **Fit:** **High for taxonomy mining**, low for redistribution. Mine the `modifiers` field to bootstrap our categorized vocabulary; do **not** republish raw rows.

### 1.4 Krea AI `open-prompts` — **10M-row historical dump**
- **URL:** https://github.com/krea-ai/open-prompts (archived Sep 2022)
- **License:** **Not specified** in the repo. Images hotlink to Discord CDN (Stability AI beta, SD v1.3). Treat as **unknown license** — usable for private research/modifier mining, not safe to redistribute derivatives.
- **Size:** >10M generations, ~3 GB CSV; also a `1k.csv` lite sampler.
- **Schema:** two-column CSV `{prompt, raw_data}` (raw_data embeds Discord URL + metadata).
- **Fit:** **Mining only.** Useful as a second independent frequency source to cross-check DiffusionDB's modifier distributions; avoid as a redistributed fixture.

### 1.5 Lexica.art (live site)
- **URL:** https://lexica.art/license
- **License:** **Not open.** Free for personal use; commercial use requires Pro/Max plan. No CC release. Apify scraper exists ($0.30/1k results) — legally grey.
- **Fit:** **Reject for ingestion.** Use only via pre-existing derivatives (Gustavosta, LexicaDataset) that predate current terms. Mention but do not scrape.

### 1.6 Public Prompt Project
- **URL:** https://publicpromptproject.ai/data
- **License:** **ODC-BY 1.0** — attribution-only, permissive for commercial use.
- **Size:** unclear at research time; presented as "Open Data" umbrella project. Smaller than DiffusionDB.
- **Fit:** **Worth a follow-up fetch** if size justifies it. ODC-BY is compatible with our pipeline (attribution in `NOTICE` / docs).

### 1.7 PromptHero
- **License:** perpetual license to PromptHero for user-contributed content; no open redistribution clause. **Reject.**
- **Fit:** Reference/inspiration only.

### 1.8 PartiPrompts & DrawBench — **benchmark, not corpus**
- **URL:** https://huggingface.co/datasets/nirmalendu01/parti-prompts-attributes · https://huggingface.co/datasets/shunk031/DrawBench
- **License:** research-permissive (Apache / Google Research release).
- **Size:** PartiPrompts ~1 600 prompts; DrawBench 200 prompts / 11 categories.
- **Schema (tagged):** PartiPrompts = `{prompt, category, challenge}`. DrawBench = `{prompt, category}` with 11 classes (Colors, Conflicting, Counting, DALL-E, …).
- **Fit:** **Test harness, not vocabulary.** Keep for eval of the rewriter (cover the challenge categories), not as a modifier source. Covered briefly here; see `32-t2i-datasets-benchmarks.md` for deeper treatment.

---

## 2. Categorized style packs (the highest-leverage fixtures)

These are the most directly ingestable. Each is a hand-curated JSON/CSV of `{name, prompt, negative_prompt}` triples — exactly the shape our dialect rewriters need.

### 2.1 Fooocus `sdxl_styles/` — **best-in-class categorized pack**
- **URL:** https://github.com/lllyasviel/Fooocus/tree/main/sdxl_styles
- **License:** GPL-3.0 (repo). Style JSONs are data — we embed the content as a vocabulary source with attribution; GPL concerns apply to shipping the *code*, not quoting the style names/strings as reference data. For safety, cite each style's origin sub-pack.
- **Size:** ~280+ styles across 6 sub-packs.
- **Schema (paired, categorized by sub-file):** array of `{name: string, prompt: "{prompt} , cinematic, dramatic lighting, …", negative_prompt: "ugly, deformed, …"}`.
  - `sdxl_styles_sai.json` — Stability AI's own 16-ish official SDXL style presets (enhance, anime, cinematic, digital-art, comic-book, fantasy-art, line-art, analog-film, neon-punk, isometric, low-poly, origami, photographic, pixel-art, texture, craft-clay, 3d-model).
  - `sdxl_styles_fooocus.json` — Fooocus-curated aesthetic styles.
  - `sdxl_styles_mre.json` — MRE's photographic/cinematic pack.
  - `sdxl_styles_twri.json`, `sdxl_styles_diva.json`, `sdxl_styles_marc_k3nt3l.json` — contributor packs.
- **Fit:** **Ingest as the seed vocabulary.** The SAI sub-pack in particular is as close to "official" SDXL style tokens as exists publicly. Convergence check: the same style names appear across Fooocus, twri, and A1111-styles repos — strong signal they work.

### 2.2 twri/sdxl_prompt_styler — **second independent pack (ComfyUI)**
- **URL:** https://github.com/twri/sdxl_prompt_styler
- **License:** MIT (repo-level — cleanest of the style packs).
- **Schema:** identical `{name, prompt, negative_prompt}` JSON shape as Fooocus.
- **Categories (already taxonomized):** Art Styles (abstract, impressionist, surrealist, cubist, watercolor, …), Photography (film-noir, glamour, HDR, silhouette, tilt-shift, neon-noir), Advertising (automotive, fashion, food, luxury, real-estate), Futuristic (cyberpunk, sci-fi, steampunk, vaporwave, biomechanical), Game (Minecraft, Zelda, Pokemon, retro-arcade, RPG), Misc (gothic, horror, kawaii, monochrome, manga, minimalist), Papercraft (collage, papercut, kirigami, quilling). A sibling `SDXLPromptStylerbyLighting` isolates lighting-only presets.
- **Fit:** **Primary taxonomy source.** Its pre-existing category labels (Art / Photo / Advertising / Futuristic / Game / Misc / Papercraft / Lighting) give us a ready category tree to seed our own.

### 2.3 Douleb/SDXL-A1111-Styles
- **URL:** https://github.com/Douleb/SDXL-A1111-Styles
- **License:** not explicitly stated (repo has no LICENSE file at research time) — treat as reference unless clarified.
- **Size:** **850+ styles** in a single `styles.csv`, A1111-compatible.
- **Schema (paired):** A1111 CSV — `name, prompt, negative_prompt` with `{prompt}` placeholder.
- **Fit:** Largest raw count. Best used for *name enumeration* and cross-reference; quality per style is lower than curated Fooocus/twri packs.

### 2.4 A1111 `styles.csv` format (upstream spec)
- **URL:** https://github.com/AUTOMATIC1111/stable-diffusion-webui (styles.py)
- **Relevance:** Defines the de facto CSV schema `name,prompt,negative_prompt` with `{prompt}` placeholder. WebUI now supports loading multiple `styles*.csv` via `--styles-file` wildcard — **this is the schema we should adopt for our own fixtures** (interoperable with A1111, Fooocus, and twri tooling).

---

## 3. Specialized vocabularies (narrow, hand-tuned)

### 3.1 willwulfken/MidJourney-Styles-and-Keywords-Reference
- **URL:** https://github.com/willwulfken/MidJourney-Styles-and-Keywords-Reference (12.2k stars, updated Apr 2025)
- **License:** no LICENSE file, but content is a curated reference wiki. Treat as **reference for extraction**, cite on use.
- **Schema (free-form Markdown pages):** organized by version (V5-V6 alpha), with pages for Design Styles, Themes, Color Palettes, Artist refs, Drawing/Art Mediums, Resolution comparisons, Image Weight comparisons. Per-keyword grids show generated examples.
- **Fit:** **Midjourney-dialect vocabulary goldmine.** Extract the page titles and example tags into our `midjourney` dialect dictionary. Not directly machine-readable — needs a one-time HTML/MD scraper pass.

### 3.2 Artist lists — stable-diffusion-specific
All of these are tested-with-SD artist enumerations; converge on ~500–1500 names.

| Source | URL | License | Notes |
|---|---|---|---|
| `gnickm/stable-diffusion-artists` | https://github.com/gnickm/stable-diffusion-artists | repo (no LICENSE) | **Categorized** by applicability: `anything` / `mainly-characters` / `characters-only` / `landscapes`. Fixed test prompt, seed 0, SD 1.4. |
| `banteg/stable-diffusion-artists.csv` (gist) | https://gist.github.com/banteg/14ec83fbf51916bab7735645f6d321ab | gist (reference) | **Tagged CSV** with per-artist descriptor tags: `vibrant`, `dark`, `abstract`, `landscape`, plus biographical fields. Highest tagging density. |
| `SMUsamaShah` gist | https://gist.github.com/SMUsamaShah/218e602d508e891a123929ce7d5885d4 | gist | Flat A–Z list with linked reference sheets. |
| Rentry artist list | https://rentry.org/artists_sd-v1-4 | public paste | Tested A–C / D–I / J–N / O–Z with standardized seed sweep (seeds 0–3, Euler-a, 7.5 CFG). Good for empirical "does the model know this name" signal. |
| `jonshipman` styles.csv gist | https://gist.github.com/jonshipman/1f36e30906fd0f618fa63e35fc9578c1 | gist | A1111-format style CSV. |

**Fit:** **High.** Use `banteg` as the tagged seed (rare — actual category tags per artist) and cross-validate names against `rentry` (empirical "works-in-SD" list). Output: a `vocab/artists.json` with `{name, tags[], works_in_sd_1x: bool, works_in_sdxl: bool}` — last column requires our own SDXL sweep.

### 3.3 Photography / camera / lens / lighting cheat sheets
Converging sources across 4+ independent authors:

- https://super3.github.io/camera-prompts/ — comprehensive camera shots reference.
- `thesephist` gist (SD modifiers) — https://gist.github.com/thesephist/376afed2cbfce35d4b37d985abe6d0a1 — highly referenced flat list.
- `ajs/7d32d278…` Midjourney cheat sheet gist — camera/lens/lighting terminology.
- ZeroSkillAI 100+ styles cheat sheet (secondary, aggregator).

**Canonical photographic categories that converge across sources** (these are the ones that appear in ≥3 of the above — use as the first-class category schema for the `photo` dialect):
- **Framing:** close-up, medium shot, wide shot, over-the-shoulder, top-down flat lay, three-quarter view.
- **Lens/DOF:** 85mm, 50mm, 35mm, 24mm wide-angle, macro 105mm; shallow/deep DOF; bokeh.
- **Lighting:** softbox, rim light, Rembrandt, volumetric / god rays, golden hour, blue hour, chiaroscuro, three-point, film lighting.
- **Atmosphere:** misty, foggy, hazy, bioluminescent, neon glow, cinematic.
- **Post / grading:** color grading, film grain, HDR, tilt-shift, motion blur.

**Fit:** **Highest leverage per byte** — this is <100 tokens of categorized vocabulary that drives a large fraction of good photo prompts. Hand-curate into `vocab/photo.json` with 4 subcategories (framing, lens, lighting, atmosphere, post).

### 3.4 Negative prompt embeddings & starter lists
These are **embeddings, not word lists** — the distinction matters. Our rewriter should emit word-list fallbacks *and* optionally reference the embedding token (`easynegative`, `badDream`, etc.) when the target stack supports TIs.

- **`ffxvs/negative-prompts-pack`** — https://huggingface.co/ffxvs/negative-prompts-pack — consolidated HF pack bundling: `badDream.pt`, `ng_deepnegative_v1_75t.pt` (Deep Negative), `unrealisticDream.pt`, bad-hands / bad-artist / bad-picture / FastNegative-V2. License: per-file on Civitai, mostly CreativeML OpenRAIL-M (usable, with restrictions on harmful use) — OK to *reference*, do not redistribute the `.pt` files.
- **EasyNegative** — https://civitai.com/models/7808 — the most widely used SD 1.5 negative embedding.
- **SDXL-specific negatives.** SDXL does not use SD1.5 embeddings; canonical SDXL negative starter string is `"text, watermark, bad anatomy, blurry, low quality, cropped"` (from Stability's own guidance — see §5). Keep embeddings as an SD-1.5-only feature in the rewriter.

**Fit:** Ship a **short categorized negative word-list** (anatomy, artifacts, text/watermark, composition, quality) rather than a dumped 200-term string. The ZeroSkillAI guide explicitly calls out that long flat negative lists dilute weights — this is a real rewriter opportunity.

### 3.5 Wildcard repos (mined as categorized vocab, not shipped)
- `mattjaybe/sd-wildcards` — https://github.com/mattjaybe/sd-wildcards — 320★, ChatGPT-generated; categories: dress, fantasy, sci-fi, biome, monster, artist-horror, artist-scifi. **Quality caveat**: LLM-generated lists, expect hallucinated names — validate before use.
- `adieyal/sd-dynamic-prompts` — https://github.com/adieyal/sd-dynamic-prompts — template engine, **not a vocabulary**, but defines the `__category__` wildcard convention we may want to emit as an output format.

**Fit:** `adieyal/sd-dynamic-prompts` syntax is worth supporting as an *output dialect* — many users pipe prompts into it. `mattjaybe` is a third-tier source at best; prefer the categorized packs in §2.

---

## 4. Official / vendor guidance (for rewriter *rules*, not vocabulary)

### 4.1 Stability AI SDXL guidance
- **Sources:** Stability AI's SDXL 1.0 announcement (https://stability.ai/blog/stable-diffusion-sdxl-1-announcement); community consolidations at imgtoprompt.app, neurocanvas.net, imagetoprompt.dev.
- **Load-bearing rules the rewriter must encode:**
  1. SDXL uses **two text encoders** (CLIP ViT-L + OpenCLIP ViT-bigG). Prompts should satisfy both: a descriptive sentence (for bigG) and a tag-style list (for L).
  2. **Drop legacy boilerplate** — SDXL explicitly does *not* need "masterpiece, best quality" qualifiers. Carrying them over from SD 1.5 prompts is a common bad-migration pattern.
  3. **Recommended structural template:** `[Subject], [Scene], [Lighting], [Camera], [Style], [Details]` — directly maps to our rewriter's slot ontology.
  4. **`BREAK` keyword** resets the attention window — useful when mixing distinct concepts (e.g., subject BREAK outfit BREAK background).
  5. **Weight bounds:** `(word:1.2)` is the typical range; weights > 1.5 cause artifacts, > 1.8 is broken.
  6. **Negative prompts are mandatory** — SDXL has no built-in quality filter (unlike SD 1.5 with most community models).
  7. **Resolution buckets:** 1024×1024, 1152×896, 896×1152, etc. — off-bucket resolutions cause burning/cropping. Relevant for aspect-ratio-aware prompt rewriting.

### 4.2 Midjourney dialect rules (from willwulfken + community gists)
- MJ parses `--parameter` flags (`--ar`, `--s`, `--c`, `--style`). Rewriter output for `midjourney` dialect must emit these as structured fields, not inline.
- Artist names are **stylistic seasoning**, not primary subject anchors (MJ v5+ downweights artist names vs. MJ v4).

---

## 5. Gap: what does *not* exist openly (and we'd need to build)

- **A machine-readable, CC0, tagged-by-category modifier ontology** at the scale of Fooocus + twri + banteg *merged and deduplicated*. No single source provides this — our `prompt-to-asset` can contribute one by normalizing the above.
- **Empirically-tested "works-in-SDXL" artist list.** All artist lists are SD 1.4/1.5 era. This is a validation gap; a ~1-hour sweep of 500 names against an SDXL checkpoint would produce a novel, useful dataset.
- **DALL-E 3 / Flux / Ideogram-native style vocabularies.** No open equivalents of the Fooocus pack exist for these newer targets. MagicPrompt-Dalle is the closest for DALL-E; Flux and Ideogram have no comparable corpora as of 2026.

---

## 6. Recommended ingestion order for `prompt-to-asset`

Ranked by value-to-effort for populating `vocab/`:

1. **Fooocus `sdxl_styles_sai.json`** — 16 officially-flavored style triples, paired positive+negative, proven. (Tier-1 seed.)
2. **twri/sdxl_prompt_styler JSONs** — adds ~100 more styles with a usable category taxonomy. (Tier-1 seed.)
3. **DiffusionDB `metadata.parquet`** (2M variant, metadata only — no images) — mine for top-N n-gram modifiers, build frequency-weighted vocabulary. (Tier-1 statistical grounding.)
4. **Gustavosta/Stable-Diffusion-Prompts** — 80k prompts for fine-tuning a small MagicPrompt-style dialect expander. (Tier-1 example corpus.)
5. **banteg artists CSV + rentry SD-v1-4 list** — merge, dedupe → `vocab/artists.json` with tags and empirical-works flag. (Tier-2.)
6. **Hand-curated photography vocab** from §3.3 convergence (<100 tokens, 4 subcategories). (Tier-2.)
7. **`willwulfken/MidJourney-Styles-and-Keywords-Reference`** — scrape once for the `midjourney` dialect. (Tier-2.)
8. **Categorized negative word-lists** (anatomy / artifacts / text / composition / quality) — build from `ffxvs` pack names + SDXL-official negative seed. (Tier-3.)
9. **LexicaDataset modifier field** — mine for additional tag coverage; do not redistribute rows. (Tier-3, mining only.)
10. **Krea open-prompts** — cross-validation only; license-unsafe for shipping. (Tier-3, mining only.)

Explicitly **declined:** Lexica.art live, PromptHero, Krea redistributed rows, `mattjaybe/sd-wildcards` as primary source.

---

## Sources

- **DiffusionDB** — https://huggingface.co/datasets/poloclub/diffusiondb — CC0, 1.8M prompts, parquet metadata.
- **Gustavosta/Stable-Diffusion-Prompts** — https://huggingface.co/datasets/Gustavosta/Stable-Diffusion-Prompts — MIT, 80k prompts, flat.
- **LexicaDataset** — https://huggingface.co/datasets/vera365/lexica_dataset — research, 61k prompt-image pairs with modifier tags.
- **Krea open-prompts** — https://github.com/krea-ai/open-prompts — unspecified license, 10M CSV, archived.
- **Lexica license** — https://lexica.art/license — not open.
- **Public Prompt Project** — https://publicpromptproject.ai/data — ODC-BY 1.0.
- **PartiPrompts (HF mirror)** — https://huggingface.co/datasets/nirmalendu01/parti-prompts-attributes — 1.6k benchmark prompts, tagged.
- **DrawBench (HF mirror)** — https://huggingface.co/datasets/shunk031/DrawBench — 200 benchmark prompts, 11 categories.
- **Fooocus `sdxl_styles/`** — https://github.com/lllyasviel/Fooocus/tree/main/sdxl_styles — GPL-3 repo; style JSONs paired `{name, prompt, negative_prompt}`.
- **twri/sdxl_prompt_styler** — https://github.com/twri/sdxl_prompt_styler — MIT, categorized style JSONs for ComfyUI.
- **Douleb/SDXL-A1111-Styles** — https://github.com/Douleb/SDXL-A1111-Styles — 850+ styles in A1111 CSV.
- **A1111 styles format** — https://github.com/AUTOMATIC1111/stable-diffusion-webui — canonical CSV schema.
- **willwulfken/MidJourney-Styles-and-Keywords-Reference** — https://github.com/willwulfken/MidJourney-Styles-and-Keywords-Reference — 12k★ MJ reference wiki.
- **gnickm/stable-diffusion-artists** — https://github.com/gnickm/stable-diffusion-artists — categorized SD artist list.
- **banteg artists CSV** — https://gist.github.com/banteg/14ec83fbf51916bab7735645f6d321ab — tagged artist CSV.
- **SMUsamaShah artist gist** — https://gist.github.com/SMUsamaShah/218e602d508e891a123929ce7d5885d4 — flat artist list.
- **Rentry SD v1.4 artists** — https://rentry.org/artists_sd-v1-4 — empirically-tested artist sweep.
- **Camera prompts reference** — https://super3.github.io/camera-prompts/ — camera shot vocab.
- **thesephist modifier gist** — https://gist.github.com/thesephist/376afed2cbfce35d4b37d985abe6d0a1 — SD modifier collection.
- **ffxvs/negative-prompts-pack** — https://huggingface.co/ffxvs/negative-prompts-pack — consolidated negative embeddings.
- **EasyNegative on Civitai** — https://civitai.com/models/7808 — canonical SD 1.5 negative TI.
- **mattjaybe/sd-wildcards** — https://github.com/mattjaybe/sd-wildcards — wildcard vocab (LLM-generated).
- **adieyal/sd-dynamic-prompts** — https://github.com/adieyal/sd-dynamic-prompts — wildcard template engine.
- **Stability AI SDXL announcement** — https://stability.ai/blog/stable-diffusion-sdxl-1-announcement — official guidance.
