---
wave: 3
role: combination-planner
slug: 03-quality-max
optimization_criterion: "Asset correctness above all — best possible quality"
date: 2026-04-19
---

# Quality-max combination — best-in-class asset correctness by day 90

## Thesis

The OSS landscape survey (20a–20e), the twenty wave-1 deep dives, and the twenty
wave-2 repo dives agree on one uncomfortable fact: nobody in open source is
optimizing for asset *correctness*, because doing so is expensive. Every shipped
system that the user can touch today — LogoCreator, LogoLoom, shinpr/mcp-image,
Fooocus, Hunyuan-PromptEnhancer, appicon-forge — makes at least one compromise
that a quality-obsessed product should refuse: a single-provider ceiling, a
tag-salad rewriter, post-hoc matting instead of native alpha, no validator loop,
no OCR on the wordmark, no ΔE2000 on the palette. This plan refuses each of
those compromises in turn.

The organizing principle: **every output that ships through the plugin has
passed a closed-loop validator at least once, and has won a tournament against
at least eight alternatives produced by at least three model families.**
Closed-source APIs are preferred over open weights whenever they win on an
asset-correctness head. Open weights are used where they are genuinely
state-of-the-art (LayerDiffuse for native RGBA, AnyText2 for bounded-box
multilingual text, Long-CLIP for long-prompt alignment) or where a commercial
option does not exist (a bespoke brand LoRA trained from the user's approved
assets). Cost and latency are budgeted as the dependent variable; if a 30-second,
$0.40 generation produces a correct asset and a 3-second, $0.04 one does not,
we always ship the former.

## Layer-by-layer picks (decisive)

### Layer 1 — Rewriter (ensemble, best-of-N)

Run **three** rewriters per call and score the resulting prompts against the
validator's predicted-reward head, keeping the top two for downstream fanout:

1. **Frontier LLM rewriter** — Claude 3.7 Opus as primary, GPT-5 as cross-check,
   Gemini 2.5 Pro as Imagen-dialect specialist. System prompt encodes the
   24-point AlignEvaluator taxonomy from Hunyuan ([arXiv:2509.04545](https://arxiv.org/abs/2509.04545))
   extended with six asset-specific heads: transparency-correctness,
   text-legibility-at-scale, platform-spec-compliance, brand-palette-adherence,
   safe-zone-respect, typography-consistency. Emits the full structured JSON
   contract `{positive, negative, weights, aspect_ratio, model_family,
   post_processing[], rationale}` called for in G4 of the INDEX.
2. **Hunyuan-PromptEnhancer-32B** (Qwen2.5-VL-32B-Instruct fine-tune,
   Apache-2.0 via HF card) self-hosted on H100 with vLLM + prefix caching as a
   license-clean, locally-auditable second opinion — the only public rewriter
   trained end-to-end with RL against a T2I-alignment reward. Exactly the
   architecture whose failure modes we understand best, so its disagreements
   with the frontier LLM are signal.
3. **Per-family verbalizer pass** — deterministic template rewriter that takes
   the top candidate and emits a dialect-tuned variant for each target
   generator: Imagen 4 / Nano Banana Pro (natural sentences, no tag salad),
   gpt-image-1 (natural sentences + `background: "transparent"` side channel),
   Flux/FLUX.2 (short declarative + negative prompt), SDXL (CLIP-weighted tags
   plus BREAK blocks), Qwen-Image (EN + ZH dual-prompt), Ideogram (explicit
   text-region markup), Recraft (style preset enum + palette slot). This solves
   G3 (per-family verbalizers); no competitor does it.

The ensemble is redundant on purpose: quality-max means we pay 3× rewrite cost
and ~2× latency to eliminate the single-rewriter mode collapse that hobbles
every OSS competitor.

### Layer 2 — Generator fan-out (multi-provider, multi-seed)

For each approved verbalizer variant we fan out across the highest-quality
generator for each asset dialect, then score and keep the winner. The routing
table is capability-based, not vendor-based — matching the resolution of
controversy 4 in the INDEX:

| Asset class                          | Primary                                       | Secondary                                  | OSS ground truth                             |
|---|---|---|---|
| Photoreal/3D brand hero              | **FLUX.2-pro** (Together, 8 reference imgs)   | Imagen 4 Ultra                             | FLUX.1-dev + Redux IP-Adapter (self-hosted)  |
| Flat / minimalist logo mark          | **Imagen 4 Ultra**                            | Ideogram 3.0                               | SDXL + LogoRedmond + Flux-Logo-Design LoRA  |
| Logo with wordmark                   | **Ideogram 3.0**                              | AnyText2 (SDXL, Apache-2.0)               | Glyph-ByT5 on SDXL once weights return       |
| Native transparent PNG / sticker     | **`gpt-image-1` `background:"transparent"`**  | LayerDiffuse over SDXL + FLUX              | LayerDiffuse (huchenlei port, Apache-2.0)    |
| Editable vector / SVG                | **Recraft V3 SVG**                            | StarVector 8B (MIT)                        | SVGDreamer + vtracer fallback                |
| OG / social card (text-heavy)        | **Satori + `@vercel/og` deterministic**       | Ideogram 3.0 compose-then-overlay          | Polotno templates                            |
| App icon single-glyph                | **Iconify/SVGL deterministic compose**        | appicon-forge 275k Iconify marks           | —                                            |
| Multilingual text in image           | **AnyText2** (Apache-2.0)                     | Qwen-Image                                 | GlyphControl                                 |

Every call issues a tournament: **n=3 seeds × top-2 verbalizer variants × top-2
candidate generators = 12 candidates minimum** on the paid tier, 4 on the free
tier. We keep the winner of a validator scoreboard (next layer). The user sees
the top 4 in the UI so they can override our ranking; the MCP returns the full
ranked list with diagnostics.

### Layer 3 — Text-in-image (specialist stack, never the default T2I output)

Correctness on the wordmark is the single most public failure mode a logo
generator can have. We stop treating it as a sub-case of generation:

- **Guaranteed-text assets (OG cards, favicons ≥ 32×32 with glyphs,
  text-only marks).** Composite deterministically with **Satori + `@vercel/og`**
  or Polotno over a generated background. Pixel-perfect typography, zero
  hallucination risk; this is the only path for any asset where the exact
  character sequence matters legally (e.g. a registered trademark).
- **Logo wordmarks.** Generate with Ideogram 3.0 (primary) and AnyText2
  (Apache-2.0 fallback). Run OCR validation (next layer) — fail → re-prompt
  with the corrupted region highlighted using Kontext / BFL Playground edit,
  or retry with a per-glyph bbox mask in AnyText2 (BBOX_MAX_NUM=8, sufficient
  for all wordmarks ≤ 20 characters).
- **Small-favicon legibility.** Render vector at 512×512, downsample through
  Lanczos3 with manual hinting to 16×16 / 32×32, re-run OCR at every
  downsample to confirm a non-latin-1 substring is still recognizable.

### Layer 4 — Brand / mascot consistency (compounding)

From call 2 onward the user's asset has history and we treat that as a
first-class constraint:

- **Reference injection** via IP-Adapter (SDXL path) and FLUX Redux / FLUX.2
  multi-ref-image (closed paths). Up to 8 approved prior assets are attached
  to every generation to stabilize the style.
- **Brand-bundle ingest.** `brand.md`, `brandspec`, and AdCP `brand.json`
  are normalized by `brand_bundle_parse` into a single `brand_dna` object
  injected into every downstream rewrite — colors as positive constraints,
  "do_not" entries as negative prompts, typography as verbalizer slot,
  voice/personality fed to the rewriter's system prompt.
- **Auto-LoRA training at 20 approved assets.** Once the user has 20 assets
  marked "on-brand" we fire an ai-toolkit (FLUX) or kohya_ss (SDXL) training
  job on modal.com; the resulting brand LoRA becomes the default reference
  on every subsequent generation. This is a moat no closed API can match —
  quality compounds per user.

### Layer 5 — Native RGBA above everything else

The "weird boxes in the background" failure mode that originated this project
is structural: a generator emitting RGB cannot paint transparency. We refuse
post-hoc matting as the default path — the resolution of controversy 2:

1. **First choice: native RGBA.** `gpt-image-1 background:"transparent"` on
   hosted, **LayerDiffuse** ([huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse),
   SIGGRAPH 2024 [arXiv:2402.17113](https://arxiv.org/abs/2402.17113)) on
   self-hosted SDXL, and **Flux-version-LayerDiffuse** (RedAIGC) for FLUX.
   These emit genuine fractional alpha — correct soft edges on hair, glass,
   partial fog — the 97% user-study preference over U²-Net in the paper.
2. **Second choice: premium matting.** BRIA RMBG 2.0 via the fal or Replicate
   endpoint (the model itself is CC-BY-NC-4.0 — so we **never** self-host;
   we pay for commercial inference).
3. **Never: the free `rembg` default** as the primary path. It ships as an
   optional free-tier fallback only, with a loud banner explaining the
   fringing / edge-erosion tradeoff.

Every generated asset, regardless of path, is scored by the alpha-coverage gate
(below). If it fails the fringing, halo, or stray-pixel test we regenerate,
never post-process with a morphological cleanup.

### Layer 6 — Upscale / refinement

Final assets pass through the best upscaler we can afford per class: **Magnific**
or **Topaz Gigapixel** via API for photoreal brand hero (they beat OSS on
texture preservation by ≥ 10% in side-by-side user studies); **Real-ESRGAN x4
Anime** on logo/icon classes for edge clarity; **SDXL Refiner stage-2** on
generations that came from an SDXL path. For vector assets we skip raster
upscale entirely and re-export from SVG at the target DPI.

### Layer 7 — Post-process and platform spec

Platform-spec enforcement is solved; we stitch but do not rebuild. Bundled into
a single `export_platform_bundle` tool:

- **`npm-icon-gen`** (ICO/ICNS with manual anti-alias tuning)
- **`pwa-asset-generator`** (PWA icon + splash matrix, Lighthouse-audited)
- **`ionic-team/capacitor-assets`** (iOS `AppIcon.appiconset` + Android adaptive)
- **`guillempuche/appicons`** (iOS 18 + visionOS + watchOS + tvOS + RN + Expo
  + Flutter — the only OSS library covering 2025/2026 Apple shapes)

Every platform export is re-linted by `validate_asset` for corner-radius
tolerance, safe-area respect, and ≥ 4.5:1 contrast ratio at each size; fail →
regenerate from the source with the specific geometry constraint added.

## Layer 8 — Regenerate-until-validated (first-class)

This is the layer competitors do not have, and it is the only reason
quality-max is plausible in 90 days. It is a separate subsystem with its own
`validate_asset` MCP tool, its own Zod schema, its own telemetry, and its own
budget knobs. It runs on **every** generation before the agent or UI ever sees
the bytes.

### 8.1 — Validator scoreboard (six independent gates)

Each gate emits a numeric score and a boolean pass/fail against a gate-specific
threshold. Thresholds are per-asset-class and per-tier:

1. **Text-alignment (compositional)** — **Long-CLIP** (`beichenzbc/Long-CLIP`,
   fixes the 77-token CLIP ceiling) against the enhanced prompt, scored by
   PickScore + HPSv3 + ImageReward + CLIP-FlanT5 VQA (T2V-Metrics). Any
   single model score < 0.25 or VQAScore < 0.7 → fail. Paid-tier also runs
   T2I-CompBench's BLIP-VQA + UniDet graders for attribute binding and object
   count.
2. **Alpha-coverage** — foreground area percentage, max-connected-component
   size for stray pixels, edge-alpha histogram shape (bimodal = binary alpha
   = fail on LayerDiffuse path), per-channel halo detection at alpha
   boundaries via erosion/dilation delta. Thresholds per asset class: logos
   [40%, 75%] foreground; favicons [60%, 95%]; photos any.
3. **OCR / wordmark correctness** — **PaddleOCR** (multilingual) and
   **Tesseract 5** (latin-only, faster) both run. We require exact match on
   the user-supplied wordmark string (case-insensitive), Levenshtein ≤ 1 for
   tagline, and confidence ≥ 0.85. Fail → re-prompt with the bbox of the
   corrupted glyph highlighted.
4. **Palette adherence** — **color-thief** top-8 dominant colors + pixel
   histogram; compute ΔE2000 between each sampled color and the nearest
   `brand.md` palette entry. Paid tier: ΔE2000 ≤ 5 on every dominant color;
   free tier: ≤ 10. Any color outside tolerance → fail with the offending
   hex for targeted re-prompt.
5. **Safe-zone / contrast / geometry** — bounding-box analysis, min-contrast
   ratio between foreground centroid and background (WCAG AA = 4.5:1 for
   text-bearing marks), corner-radius tolerance for icons at each platform
   size.
6. **LLM rubric** — Claude 3.7 Opus judge (Promptfoo `llm-rubric` or DeepEval
   multimodal evaluator) scoring subjective design quality 1–10 against a
   10-point asset-correctness rubric. Below 7 → fail.

Each failure emits a structured `diagnostic` blob the rewriter can consume —
the one thing every competitor omits. The loop is not "regenerate with same
prompt"; it is "read the failure mode, mutate the rewrite, try again".

### 8.2 — Tree-search regeneration

On any failure we do not retry the same model with the same seed. The
regenerator spawns a tree:

- **Level 1 — prompt mutation.** Re-call the rewriter with the diagnostic
  injected (Hunyuan-style: "increase weight on `safe-zone-respect`, specify
  exact hex `#1B4E8F`, add negative `blurry text`, re-run"). Generate three
  new prompts.
- **Level 2 — model swap.** If the first path was Flux-dominant and OCR
  failed, fan out the next retry on Ideogram and AnyText2.
- **Level 3 — parameter sweep.** Three seeds, two CFG values, two sampler
  choices for the open-weight paths.

Budget cap: **12 iterations** (paid tier) or **4** (free tier) per asset,
emitting an SSE progress stream so the agent / UI sees each attempt and can
short-circuit. If we exhaust the budget without a pass, we return the best
scoring attempt **plus** the diagnostic — a hard product guarantee that every
returned asset either validates or comes with an explicit failure card.

### 8.3 — Eval golden set (reliability over time)

We maintain a fixed, versioned corpus of 500 asset briefs (logos/icons/
favicons/OG cards/transparent PNGs/brand bundles) × 5 seeds each = 2500
regression trials. Nightly CI runs the full validator scoreboard and posts
deltas against the previous week. A ship-blocking regression is any
per-brief drop ≥ 0.15 in any gate. This is how quality stops being a
launch property and becomes a ratchet.

## The stitched tri-surface

`vercel/mcp-adapter` backed `/api/[transport]` route exposing
`enhance_prompt`, `generate_asset`, `validate_asset`, `regenerate`,
`export_platform_bundle`, `brand_bundle_parse`, `compose_from_iconify`, and
`list_history`. Same handlers drive the Next.js UI and the stdio fallback.
OAuth 2.1 + Streamable HTTP for production, stdio for local dev. WebMCP
progressive enhancement once Chrome 146+ stabilizes. Published to the v0
registry on day 80.

## 90-day order

### Days 1–14 — Foundation and router

Vercel AI SDK v5 `generateImage` as the typed polyglot. First-party providers:
`@ai-sdk/openai` (`gpt-image-1`), `@ai-sdk/google` (Imagen 4 Ultra / Nano
Banana Pro), `@ai-sdk/togetherai` (FLUX.2 pro, 8-ref), `@ai-sdk/fal`
(LayerDiffuse endpoint, BRIA RMBG 2.0), `@ai-sdk/replicate` (Recraft V3 SVG,
Ideogram 3.0). Direct provider SDKs alongside for latency-critical paths and
provider-specific features (fal realtime, Together 8-reference, Replicate
model chaining). Capability matrix and capability-based router (not
vendor-based). Hunyuan-32B self-hosted on H100 via vLLM with prefix caching
and truncated CoT. Claude 3.7 Opus + GPT-5 as smart-tier rewriter targets.

### Days 15–30 — Validator v1

Integrate Long-CLIP, PickScore, HPSv3, ImageReward, CLIP-FlanT5, T2I-CompBench
BLIP-VQA + UniDet, PaddleOCR, Tesseract 5, color-thief + ΔE2000. Package
all six gates behind `validate_asset(asset_ref, asset_class, brand_dna,
expected_text)`. Stand up the eval golden set with 100 briefs first; expand
to 500 by day 30.

### Days 31–45 — Regenerate loop and tree-search

Implement the diagnostic-aware re-prompt path (rewriter reads validator JSON,
mutates). Model-swap policy on repeated failure. Budgeted SSE streaming.
Per-asset-class thresholds pinned from the golden-set calibration.

### Days 46–60 — Text, consistency, and brand LoRA

Ideogram + AnyText2 + Satori/Polotno path for guaranteed-text assets.
IP-Adapter + FLUX Redux + FLUX.2 multi-reference for mascot/brand consistency.
Auto-trigger ai-toolkit brand-LoRA training at 20 approved assets; bake the
LoRA into the SDXL/Flux self-hosted paths and use as an IP-Adapter fallback.

### Days 61–75 — Native RGBA and platform bundle

Default-on `gpt-image-1 background:"transparent"` and LayerDiffuse paths.
BRIA RMBG 2.0 as premium fallback. Platform bundle exporter combining
`npm-icon-gen`, `pwa-asset-generator`, `capacitor-assets`, and `appicons` into
`export_platform_bundle` with per-platform lint. Iconify/SVGL compose rail
for iconic single-glyph intents (the resolution of controversy 3).

### Days 76–90 — MCP, parity, benchmarks

`vercel/mcp-adapter` hosted remote MCP with OAuth 2.1, parity with the web
UI tool-by-tool. Cross-IDE single-command installer (Claude Code / Cursor /
Windsurf / Gemini CLI / Codex / VS Code / Zed / v0). WebMCP
`navigator.registerTool()` progressive layer. Publish the regression
dashboard comparing win-rate against LogoCreator, LogoLoom, shinpr/mcp-image,
and appicon-forge on 500 briefs × 5 seeds with every gate reported. Ship.

## What we explicitly refuse

- **Single-provider defaults.** Nothing is Flux-only, nothing is OpenAI-only.
  Every asset is chosen from a tournament of at least three families.
- **Post-hoc matting as default.** Native RGBA first or we regenerate.
- **Unvalidated outputs.** No asset ships without a validator verdict;
  every failure returns a diagnostic, not a silent retry.
- **License contamination.** `Hunyuan-7B` is gated off in EU/UK/KR; Flux.1
  [dev] weights are commercial-licensed; CC-BY-NC-4.0 models (BRIA, Fooocus
  expansion weights, Midjourney outputs) live exclusively behind commercial
  APIs we pay for. The self-hosted stack stays MIT / Apache / OpenRAIL-M.
- **Text hallucination on legally-sensitive marks.** Anything with a
  registered wordmark or trademark goes through Satori/Polotno deterministic
  compositing; the T2I path is blocked by policy.

The day-90 bar is concrete: on the 500-brief golden set, **≥ 90 % of returned
assets pass every gate on the first validated attempt** (i.e. within the
12-iteration budget) and **≥ 50 % pass on the first generation**. Every
competitor surveyed in wave 1 and 2 would fail every one of these gates on
every brief because they do not run any of them. That is the whitespace, and
this plan occupies it by day 90.
