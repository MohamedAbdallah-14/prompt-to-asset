---
wave: 3
role: combination-planner
slug: 07-hybrid
optimization_criterion: "Hybrid — commercial APIs for hot paths + OSS for long tail"
date: 2026-04-19
---

# Hybrid Stack — Commercial APIs on Hot Paths, OSS on the Long Tail

## Central Thesis

**The `prompt-to-asset` product should be a capability router, not a provider wrapper.** A single pure function

```
route(intent, asset_type, budget, tier, brand_bundle) →
    (primary_provider, primary_model,
     fallback_provider, fallback_model,
     post_processing_chain[])
```

maps every user request to the cheapest competent stack that actually satisfies the asset's *capability contract* (transparency validity, text legibility, SVG truthfulness, brand-palette adherence, platform-spec compliance). Commercial APIs own the hot paths — any request whose success depends on low latency, reliable text rendering, or native RGBA — because there the SLA, model quality, and throughput differentials are worth $0.04–$0.19 per image. OSS owns the long tail — bespoke brand LoRAs, niche styles, transparent-sticker batches, deterministic SVG, reproducibility, free-tier users, and offline environments — because there the *per-capability* unit economics invert: a fine-tuned SDXL LoRA rendered on a serverless L40S is $0.003/image; the equivalent Recraft V3 call is $0.04. Route per capability, never per vendor. (Synthesis §"Model routing logic"; 20-index Controversies #1, #4.)

This is the only combination that beats both the pure-API stack (locked into one text-rendering ceiling, one transparency story, and a permanent 10–40× markup) and the pure-OSS stack (GPU babysitting, cold starts, and brand-text quality worse than Ideogram 3). The hybrid is the **default shape for a serious 2026 asset product**.

## Capabilities Matrix

Only this many models deserve router slots. "Capability" ratings: ✅ strong / ⚠️ partial / ❌ absent. $/image is the vendor list price for the typical 1024² call at default quality as of 2026-04 (commercial) or amortized compute on Modal A10G / L40S (OSS). "License" is the *weights* license for OSS and the commercial-use posture for APIs. Sources: Synthesis §"Model Capability Matrix"; Category 04, 05, 06, 07; 20c; Together/fal/Replicate pricing pages.

| Model | Transparency (native RGBA) | Text rendering (ceiling) | Reference-image conditioning | SVG-native | Speed (p50, 1024²) | $/image | License / commercial posture |
|---|---|---|---|---|---|---|---|
| **Imagen 4 (Vertex)** | ❌ (draws checker as RGB) | ⚠️ ≤10 chars | ⚠️ style-ref param | ❌ | ~3.5 s | ~$0.04 | Commercial OK; Google SynthID watermark on all outputs |
| **Gemini 3 Flash Image / Pro ("Nano Banana")** | ❌ same checker failure | ⚠️ ~20 chars, edit flow | ✅ multimodal in-context (up to 3 refs) | ❌ | ~4 s | $0.02 preview / $0.04 pro | Commercial OK; SynthID |
| **gpt-image-1 / 1.5 (OpenAI)** | ✅ `background:"transparent"` + PNG | ✅ best-in-class photoreal, ~30–50 chars | ✅ `input_image[]` | ❌ | ~6–10 s | $0.02 low / $0.07 med / $0.19 high | Commercial OK; mandatory moderation + prompt rewriter |
| **Flux Pro 1.1 / Flux.2 Pro (BFL / fal / Together)** | ❌ native (needs LayerDiffuse) | ⚠️ ~15–25 chars, strongest open-weight-derived | ✅ Kontext edit; **Flux.2 accepts up to 8 brand refs** | ❌ | ~4 s | $0.04 (Flux Pro) / $0.04–$0.08 (Flux.2 via Together) | Commercial OK via hosted API; model weights non-commercial |
| **Flux Schnell (fal realtime / Replicate)** | ❌ (LayerDiffuse variant exists) | ⚠️ ~10 chars | ⚠️ limited | ❌ | ~0.5–1.2 s (fal realtime ~5 fps) | $0.003 | **Apache-2.0 weights** — commercial-clean self-host |
| **Ideogram 3 Turbo / Quality** | ✅ `style:"transparent"` (Turbo) | ✅ ~30–60 chars, spells reliably | ⚠️ remix/ref image | ❌ | ~3 s | $0.02–$0.06 | Commercial OK; Magic Prompt rewriter (disableable) |
| **Recraft V3 / V4** | ✅ | ⚠️ ~20–30 chars | ✅ style refs + `style_id` | **✅ native SVG API endpoint** | ~4–8 s (raster), ~6–10 s (vector) | $0.04 (raster) / $0.08 (vector) | Commercial OK |
| **FLUX.2 via Together (8-ref brand mode)** | ❌ | ⚠️ ~20 chars | ✅ **up to 8 brand refs/call** | ❌ | ~5–8 s | ~$0.06 | Commercial OK |
| **Seedream 3 / 4 (ByteDance via fal/Replicate)** | ❌ | ✅ strong non-Latin incl. CJK | ⚠️ ref image | ❌ | ~3 s | $0.03 | Commercial OK; notable for CJK text (covers G13) |
| **Firefly 3 (Adobe)** | ⚠️ partial | ⚠️ ~15 chars | ✅ | ❌ | ~4 s | ~$0.035 | Commercial OK + enterprise indemnity |
| **SDXL-local + brand LoRA (ComfyUI / Modal L40S)** | ❌ native (✅ via LayerDiffuse node) | ❌ ~5–8 chars | ✅ IP-Adapter / ControlNet | ❌ | ~3–6 s warm; 20–45 s cold | ~$0.003 amortized (Modal L40S $0.000583/s × 5 s) | **OpenRAIL-M** — commercial-clean |
| **Flux.1 [schnell]-local + LayerDiffuse (Modal L40S)** | ✅ (LayerDiffuse in-loop) | ⚠️ ~10 chars | ⚠️ | ❌ | ~4–8 s warm | ~$0.004 | **Apache-2.0** |
| **LLM-authored SVG (Claude Sonnet / GPT-5 via text API)** | ✅ (SVG is vector; alpha trivial) | ✅ (real text glyphs) | ❌ prompt only | ✅ path-exact | ~2–5 s | ~$0.01 (text-only tokens) | Commercial OK |
| **Satori + resvg (deterministic JSX → SVG → PNG)** | ✅ | ✅ (real fonts, WCAG-verifiable) | ✅ layout refs | ✅ | ~100–400 ms | ~$0 (compute only) | MIT / Apache |
| **Iconify composition (275k+ marks + gradient tokens)** | ✅ | ✅ | n/a | ✅ | <50 ms | $0 | MIT (marks carry own licenses) |

Three rows dominate the ratings: `gpt-image-1` on transparency + text, Ideogram 3 on text-dense wordmarks, Recraft V3 on native SVG. One row wins on speed (Flux Schnell on fal realtime). One row wins on cost-at-scale (SDXL-local). One row wins on brand consistency across a set (Together FLUX.2 with 8 refs). The router's job is to reach for the single row that beats everything else on the *specific capability the request actually needs* — not to average them.

## The Hot Path / Long Tail Split

**Hot paths (commercial, ~90% of traffic, ~$0.02–$0.07/image).**

1. **Transparent PNG mark, ≤3 words of text** → `gpt-image-1` with `background:"transparent"`. Ideogram 3 Turbo `style:"transparent"` as fallback. Nothing self-hosted beats the wall-clock latency + alpha fidelity, and this is the single most common request (category 13 names it "the #1 pain").
2. **Logo or wordmark with 1–5 words of text** → Ideogram 3 Quality as primary, `gpt-image-1` as fallback. Spells reliably; Magic Prompt gets disabled via the request parameter; the plugin does its *own* rewrite first (principle #7 in the Synthesis).
3. **Native SVG** → Recraft V3 `/v3/images/vectorize` endpoint. There is no open-weight equivalent of production quality, period. Do not simulate it with raster→vectorize on this path — that pipeline is reserved for the long-tail branch.
4. **Photoreal hero, OG background, marketing art** → Flux Pro 1.1 via fal or Flux.2 Pro via Together as primary, `gpt-image-1` as fallback. Together's 8-ref-image mode is the single strongest brand-consistency feature on any hosted API; if the brand bundle has ≥3 reference images and the asset is photoreal, Together wins outright.
5. **Iterative refinement (user clicking "not quite, more X")** → Flux Schnell on fal realtime WebSocket. ~5 fps interactive rate. This is the sole place we pay for latency over quality; the user then picks a frame and we re-render once at Flux Pro quality.
6. **OG images, README banners, social cards** → Satori + `@resvg/resvg-js` *with* a commercial API only for the background hero (if requested). Typography, headline, and layout are deterministic JSX; the hero is a `gpt-image-1` call marked as optional. OG is not a diffusion problem (Synthesis §"Favicon/web assets").
7. **CJK / Arabic / Devanagari text** → Seedream 4 on fal or Replicate. Ideogram and `gpt-image-1` are Latin-centric (Synthesis §G13); Seedream measurably closes the gap.

**Long tail (OSS, ~10% of traffic, ~$0.003–$0.01/image).**

1. **Brand LoRA + character / mascot consistency across a set of 10+ assets** → SDXL + trained LoRA + IP-Adapter on a serverless L40S (Modal warm pool or RunPod `worker-comfyui`). Over a set of 50 assets, the per-call cost drops 10–15× vs. any hosted API, and the LoRA travels with the brand bundle forever. (20d; 21/01 LoRA niche.)
2. **Transparent stickers, icon sets, large batches** → Flux Schnell + LayerDiffuse on Modal. Apache-2.0 weights, native RGBA in-loop (not post-hoc matte), ~$0.004/image. For 500-sticker batches this dominates any hosted API on cost and on edge quality (LayerDiffuse > BiRefNet on soft edges — 20d controversy #2).
3. **Deterministic / reproducible brand art** → SDXL-local with pinned seed + pinned model hash. Hosted APIs silently update; even with `seed` set, Imagen/gpt-image-1 regress across weeks. For a company that needs the *same* favicon to regenerate byte-identically in 6 months, only a pinned-weight local inference satisfies the contract.
4. **Offline / air-gapped / free-tier** → Promptist (125M GPT-2, MIT) + Flux Schnell-local (Apache-2.0) + rembg (MIT) + vtracer (Rust/MIT) + `@resvg/resvg-js`. Entire stack runs on a single CPU box for the rewriter and a single consumer GPU for the render; zero egress.
5. **Vectorize-and-clean fallback (when Recraft refuses or style is off)** → `gpt-image-1` raster → BiRefNet matte → K-means 6-color → `vtracer` → SVGO. Synthesis §"Vector/SVG output" path 3.
6. **Background removal / matting / upscaling / icon packaging** → BiRefNet, rembg, BRIA RMBG-2.0 (hosted endpoint only), DAT2 upscalers, `sharp`, `@resvg/resvg-js`, `@capacitor/assets`, `npm-icon-gen`, `pwa-asset-generator`. Every one of these is strictly better than any commercial equivalent and commercially free; there is no reason to pay for them. (22-repo-deep-dives 10/11/12/15/16; Synthesis §"Real Asset Pipeline".)
7. **Prompt rewriter (paid-tier CoT variant)** → Claude Sonnet or GPT-5-mini via the Vercel AI SDK; the *free-tier* rewriter is a self-hosted Promptist or `superprompt-v1` (77M) fine-tuned on our asset-aware dataset once Gap G1 is filled. Model selection is by user tier, not by quality ceiling — the asset-specific verbalizer compensates for the tiny rewriter on free tier.

**The invariant**: every OSS path has a commercial fallback and every commercial path has an OSS fallback. No single vendor outage takes the product down, and no single license change (Flux [dev] becoming stricter, BRIA revoking weights, Ideogram raising prices) changes the router by more than a single table entry.

## Dispatch Layer: How the Hybrid is Wired

**Vercel AI SDK v5 `generateImage` is the typed foundation; direct provider SDKs are first-class `ImageProvider` implementations on hot paths; Modal + RunPod worker-comfyui is the first-class OSS lane.** The router never depends on one abstraction. (20c primary rec; 20e validated by Figma/Linear/Gamma.)

Concretely, three dispatch adapters behind one `ImageProvider` interface:

1. **`VercelAiSdkProvider`** — default for `gpt-image-1`, Imagen 4, Gemini 3 Flash Image, Replicate-hosted models, fal-hosted models, Together-hosted models via the typed `@ai-sdk/*` packages. Solves 80% of hot-path calls with zero bespoke plumbing.
2. **`DirectSdkProvider`** — wraps `@fal-ai/client` (for realtime WebSocket on Flux Schnell), `together-ai` (for FLUX.2's 8-ref brand-reference mode which the AI SDK does not expose), and `replicate` (for model chaining on bespoke pipelines). These are latency- or feature-critical paths the generic abstraction cannot reach.
3. **`ModalComfyuiProvider`** — POSTs a parameterized ComfyUI workflow JSON to a Modal endpoint (`runpod-workers/worker-comfyui` compatible), polls the `/prompt` + `/ws` stream, retrieves PNG from R2. Workflows are stored as templates keyed by `(asset_type, transparency, style_variant)` and parameterized per-call. (22-repo-deep-dives 17/18; 20d.)

The same `lib/tools/generate_*` handlers back the MCP, the website route handlers, and the CLI skill shims — one code path, three surfaces (Synthesis §"Plugin & Agent Architecture"). The ROI on this uniformity is 1) a 30% cache hit rate on `(prompt_hash, model, seed, params_hash)` because the hash is generated in one place, and 2) a straightforward A/B lane where we ship 5% of traffic through a candidate new model and compare VLM-as-judge scores before promoting it in the router.

## Routing Rules — TypeScript Pseudocode

The router is **data**, not code. The TS below is the reference implementation of `route()`; the rule table is a JSON file patchable without redeploy (Synthesis §"Model routing logic"). The capability contract always wins over vendor preference; ties broken by `(tier.budget_cents_per_image, license_requirement)`.

```typescript
type Intent =
  | "logo" | "app_icon" | "favicon" | "og_image" | "splash"
  | "illustration" | "icon_pack" | "hero" | "sticker" | "transparent_mark";

type Tier = "free" | "plus" | "team" | "self_hosted";

interface Capability {
  transparency:     "required" | "nice" | "irrelevant";
  svg:              "required" | "nice" | "irrelevant";
  text_chars:       0 | 1 | 2 | 3 | 4 | 5 | 6;   // 6 = >20 chars
  reference_images: number;  // count attached by brand bundle
  cjk_or_arabic:    boolean;
  reproducibility:  "byte_exact" | "stable" | "best_effort";
  batch_size:       number;  // drives long-tail routing on N > 20
}

interface Route {
  primary:    ProviderCall;      // { provider, model, params }
  fallback:   ProviderCall[];    // ordered
  postproc:   PostProcStep[];    // deterministic chain
  validator:  ValidatorStep[];   // tier-0/1/2
  cache_key:  string;            // prompt_hash|model|seed|params_hash
  tier_cost:  number;            // cents, used for quota
}

function route(
  intent: Intent,
  cap: Capability,
  tier: Tier,
  bundle: BrandBundle | null,
): Route {
  // 1. Absolute routing floors (capability > vendor, always).
  if (intent === "og_image" && cap.text_chars >= 2)
    return SATORI_RESVG_ROUTE(bundle);            // deterministic; cheapest; 0 hallucination

  if (intent === "icon_pack" || (intent === "favicon" && cap.text_chars <= 1 && bundle?.has_mark_svg))
    return ICONIFY_COMPOSITION_ROUTE(bundle);     // compose > generate when mark exists

  if (cap.svg === "required")
    return tier === "self_hosted"
      ? RASTER_TO_SVG_LOCAL_ROUTE()               // gpt-image-1 → BiRefNet → vtracer → SVGO
      : RECRAFT_V3_ROUTE(bundle);                 // hot path: native SVG

  // 2. Transparent marks — the #1 user pain.
  if (cap.transparency === "required") {
    if (cap.batch_size >= 20 && tier !== "free")
      return FLUX_SCHNELL_LAYERDIFFUSE_LOCAL_ROUTE(); // $0.004/img wins at batch
    if (cap.text_chars >= 3)
      return GPT_IMAGE_1_TRANSPARENT_ROUTE();         // best text + alpha
    return IDEOGRAM_V3_TRANSPARENT_ROUTE();           // slightly cheaper, still ✅ alpha
  }

  // 3. Text-heavy logos and wordmarks.
  if (intent === "logo" && cap.text_chars >= 3) {
    if (cap.cjk_or_arabic) return SEEDREAM_4_ROUTE();  // G13
    if (cap.text_chars >= 5) return GPT_IMAGE_1_ROUTE(); // highest ceiling
    return IDEOGRAM_V3_QUALITY_ROUTE();                 // cheapest competent text
  }

  // 4. Brand consistency across a set (≥3 reference images in bundle).
  if ((intent === "illustration" || intent === "hero") && (bundle?.style_refs.length ?? 0) >= 3)
    return TOGETHER_FLUX2_8REF_ROUTE(bundle);           // 8-ref mode, not reachable via AI SDK

  // 5. Custom-character / mascot / long-running series → SDXL+LoRA on Modal.
  if (bundle?.lora && cap.batch_size >= 5 && tier !== "free")
    return SDXL_LOCAL_LORA_ROUTE(bundle);

  // 6. Interactive iteration (user clicked "refine" within 30 s of last call).
  if (isRealtimeSession()) return FAL_FLUX_SCHNELL_REALTIME_ROUTE();

  // 7. Photoreal hero fallback path.
  if (intent === "hero" || intent === "illustration")
    return tier === "free"
      ? FLUX_SCHNELL_LOCAL_ROUTE()
      : FLUX_PRO_11_ROUTE();

  // 8. Byte-reproducibility requirement → force self-host.
  if (cap.reproducibility === "byte_exact")
    return SDXL_LOCAL_PINNED_ROUTE({ seed: derived(bundle), model_hash: PINNED });

  // 9. Default — lowest competent cost, commercial.
  return GPT_IMAGE_1_ROUTE();
}

function postProcFor(intent: Intent, cap: Capability): PostProcStep[] {
  return [
    cap.transparency === "required" && !route.primary.native_rgba
      ? BIREFNET_MATTE : NOOP,
    cap.svg === "required" && !route.primary.native_svg
      ? [KMEANS_6, VTRACER_FULLCOLOR, SVGO_CONSERVATIVE] : NOOP,
    intent === "app_icon" ? EXPORT_APPICONSET : NOOP,
    intent === "favicon"  ? EXPORT_FAVICON_BUNDLE : NOOP,
    intent === "og_image" ? RESIZE_1200_630 : NOOP,
    VALIDATE_TIER_0,    // dimensions, alpha probe, checkerboard FFT
    VALIDATE_TIER_1,    // OCR Levenshtein, ΔE2000 palette, VQAScore
    isHighStakes(intent) ? VALIDATE_TIER_2_VLM : NOOP,
  ];
}
```

A few non-obvious router decisions worth calling out:

- **Rule #1 (Satori for OG).** The Synthesis is explicit: OG is not a diffusion problem. Headline text, template layout, and the brand logo are composed in JSX, rasterized by Satori + `@resvg/resvg-js`, optionally *backed* by a `gpt-image-1` hero image. This saves ~$0.04 per OG image and eliminates the "diffused headline typo" failure mode entirely.
- **Rule #2 (Iconify composition for favicons when a mark already exists).** If the brand bundle contains `logo-mark.svg`, the 16²/32²/192²/512² favicon set is a deterministic `sharp(svg).resize().toFile()` pipeline that takes 20 ms and costs $0. Diffusion for favicons with an existing mark is pure waste.
- **Rule #4 (Together FLUX.2 8-ref).** Category 20c identifies this as the strongest brand-consistency feature on any API. The Vercel AI SDK does not expose it. We reach through the abstraction with the direct `together-ai` SDK, documented as a single exception and kept behind the same `ImageProvider` interface for router uniformity.
- **Rule #5 (SDXL-LoRA long tail).** This is where the hybrid earns its keep. A brand with a trained LoRA has zero marginal cost per image at scale; the L40S warm pool on Modal (~$0.000583/s) + a ~5 s inference + 20% idle-pool amortization averages ~$0.004/image. Over a brand's first 1,000 assets, the LoRA + OSS path is $4 against $40 (Recraft) or $70 (`gpt-image-1` medium). The product bundles LoRA training ($5–$15 on a one-time L40S training job) into the onboarding flow.
- **Rule #6 (Flux Schnell realtime).** The sole case where we explicitly choose latency over quality. The "refine" UI loop is 5 fps on fal; the user ends the session by selecting a frame that is then re-rendered once at Flux Pro quality with the exact same prompt. Net cost: ~$0.045, net UX: interactive.
- **Rule #8 (byte-reproducibility → self-host).** Any paid customer who clicks "lock this asset forever" triggers the SDXL-local lane. Hosted API outputs are not reproducible across model-version rollovers, as Synthesis Open Question G6 documents.

## Post-Processing Chain Is Always OSS

The post-processing pipeline (matte, vectorize, upscale, export, validate) is **entirely open-source in every route**. `sharp` (libvips) for bitmap, `@resvg/resvg-js` for SVG rasterization, BiRefNet / rembg / BRIA for matting, `vtracer` / `potrace` for raster-to-SVG, SVGO for cleanup, `@capacitor/assets` / `npm-icon-gen` / `pwa-asset-generator` for platform-spec export, `@vercel/og` / Satori for OG and README banners. (22-repo-deep-dives 10/11/12/15/16/20.) No commercial matting or upscaling API deserves a router slot — every one we evaluated is strictly worse than BiRefNet + DAT2 at any price point, and they add egress latency the self-hosted equivalents do not.

The two exceptions where a post-processing step escapes to a commercial API:

- **BRIA RMBG-2.0**: weights are CC-BY-NC-4.0, so we call BRIA's hosted endpoint (or Replicate's, or fal's) rather than embed. Used only when BiRefNet fails alpha validation on soft-edge subjects (hair, glass, fine lines).
- **VLM-as-judge (tier-2 validation)**: Claude Sonnet vision or GPT-5.2 vision at ~$0.003/call for the 5–7 criteria rubric. This is the single highest-ROI commercial step in the whole pipeline (Synthesis recommendation #6) and the one place we will not self-host in v1.

## Why This Wins

**Against pure-commercial.** A `gpt-image-1`-only stack caps at ~40-char text, $0.07–$0.19/image, and has no SVG story. `Flux Pro`-only has no transparency. `Recraft`-only has no photoreal. Per-capability routing converts each model's weakness into another's strength at ~25–40% blended cost reduction vs. any dominant single-vendor choice.

**Against pure-OSS.** Flux Schnell-local cannot match Ideogram 3 on ≥5-word text, `gpt-image-1` on transparency fidelity, or Recraft V3 on native SVG. Cold starts add 20–40 s on every idle pool. Commercial hot paths preserve sub-5-s p50 for interactive UX; OSS long tail preserves the cost floor for batch jobs and the reproducibility floor for long-lived brand contracts.

**Against wrapper stacks (LangChain, LlamaIndex, aisuite).** All three are OpenAI-only on images (20c). Vercel AI SDK v5 + direct-SDK + Modal-ComfyUI is the thinnest dispatch layer that actually exposes Ideogram, Recraft, Together FLUX.2 8-ref, fal realtime, and LayerDiffuse at once.

**Against ComfyUI-native (planner #9).** Pure ComfyUI has brutal ops surface: custom-node drift, Manager pinning, CUDA/torch mismatches, GPL-3.0 contamination risk. The hybrid keeps ComfyUI as *one* execution lane, called via `runpod-workers/worker-comfyui` or Modal, with ComfyUI itself never in our repo.

**Against the free-tier stack (planner #5).** The hybrid *contains* the free tier as its long-tail branch — same `route()` function, same 10-tool MCP surface. Paid tier layers commercial hot paths on top. The router is the upsell mechanism.

## Build Order (90 Days)

1. **Weeks 1–2.** `VercelAiSdkProvider` + `gpt-image-1`, Ideogram 3, Recraft V3. Satori + `@resvg/resvg-js` for OG. `sharp` + `@capacitor/assets` for packaging. Three MCP tools; ship the `resize_icon_set` gateway drug.
2. **Weeks 3–5.** `DirectSdkProvider` (fal realtime + Together FLUX.2 8-ref). BiRefNet + vtracer + SVGO chain. Full `route()` table in JSON. Tier-0/1 validators on every route.
3. **Weeks 6–8.** `ModalComfyuiProvider` with three workflow templates (SDXL+LoRA, Flux Schnell+LayerDiffuse, SDXL byte-reproducible). `asset_train_brand_lora` MCP tool. Tier-2 VLM-as-judge on high-stakes assets.
4. **Weeks 9–13.** Tri-surface parity, OAuth 2.1 + PKCE, R2 prompt-hash cache, byte-reproducibility paid lane, 5% router A/B shadow. Ship.

The 10-tool MCP surface is identical to every sibling planner. **Only the router table differs.** That is the point: agent-facing API is stable, vendor matrix is data, capabilities — not providers — are the product.
