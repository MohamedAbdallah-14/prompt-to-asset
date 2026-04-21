---
category: 07-midjourney-ideogram-recraft
angle: 7d
title: "Other commercial asset-focused tools: Leonardo, Playground v3, Krea, Firefly 3+, FLUX Pro on Together, Luma Photon, Bing Image Creator"
agent: research-subagent-7d
date: 2026-04-19
status: draft
tools_covered:
  - Leonardo.ai (Phoenix, Lightning XL, Kino XL, Elements)
  - Playground v3 / v3 HD
  - Krea (Krea 1 + real-time)
  - Adobe Firefly 3 / 4 / 5
  - FLUX.1 [pro] / [1.1 pro] on Together AI
  - Luma Photon 1 / Photon Flash
  - Bing Image Creator (DALL·E 3 wrapper)
tags:
  - commercial-tools
  - api-maturity
  - asset-pipelines
  - licensing
  - ip-indemnity
  - transparent-png
  - text-rendering
---

# 7d — Other Commercial Asset-Focused Tools

Leonardo, Playground v3, Krea, Firefly, FLUX Pro (via Together), Luma Photon, and Bing Image Creator fill the gap between the headliners (Midjourney / Ideogram / Recraft / DALL·E / Imagen) and open-source pipelines. They all matter because each occupies a specific niche — programmatic asset volume, commercial-safety indemnity, real-time iteration, or cheap wholesale generation — that a production prompt-enhancement system needs to route between.

## Executive Summary

- **Leonardo.ai** is the most production-ready of the "second tier": Phoenix is a proprietary foundation model, Lightning XL/Kino XL are speed/cinematic variants, and the platform exposes Elements (LoRA-like style adapters), Image Guidance (ControlNet), style/character/content references, a full REST API with documented model IDs, native transparent-PNG generation (`"transparency": "foreground_only"`), and PAYG billing. For programmatic asset pipelines, Leonardo is the closest "one-stop shop" in this cohort.
- **Playground v3 (PGv3)** is the strongest pure research play: a 24B-parameter DiT with a "Deep-Fusion" LLM integration (Llama-3 based text encoder) that scores **88.62 on DPG-Bench Hard** (vs Ideogram 2.0 80.12, Flux Pro 78.69, MJ v6.0 64.63) and **82% text-synthesis accuracy**, with human raters preferring its graphic-design outputs over human designers 60–80% of the time on stickers, T-shirts, and logos ([arXiv 2409.10695](https://arxiv.org/abs/2409.10695)). But its API is partner-gated (1M+ images/month), so it is aspirational rather than usable for most builders today.
- **Adobe Firefly Image 5** entered public preview in October 2025 (announced at Adobe MAX) and is now in Photoshop (Beta) for instruction-based Generative Fill as of March 2026. It generates native 4MP images, supports intelligent layer deconstruction, and includes Instruct Edit (natural-language refinement). Custom Models remain in closed beta as of April 2026. The platform is the only option that ships **enforceable IP indemnification** for generated assets — but indemnity is scoped to Creative Cloud / Firefly web and **does not automatically extend to API usage**; Firefly Services requires an enterprise agreement (~$1,000/month minimum). Use Firefly when the legal surface matters (brand work, agency deliverables, stock replacement), not for cheap iteration.
- **Krea** wins at interactive ideation — real-time canvas, webcam/screen-capture input, image-to-image enhance, and a simple REST API over **40+ hosted models** (FLUX, Krea 1, Qwen, Ideogram, Imagen, etc.) billed from one compute-unit pool. It's effectively a meta-router, not a model vendor, which makes it a very good **fallback-and-compare** surface for a prompt-enhancement system.
- **FLUX.1 [1.1 pro] on Together AI** gives you Black Forest Labs' best hosted model at **$0.04/MP** behind a standard OpenAI-compatible endpoint, with the caveat that `[pro]` (non-1.1) is dedicated-endpoint only and anything "pro" requires Build Tier 2 ($50 lifetime spend). Free `flux-1-schnell` is available for cheap bulk work.
- **Luma Photon / Photon Flash** are cheap and fast ($0.015 / $0.002 per 1080p image) with image, style, and character references exposed via API — but independent testing finds text rendering and fine-detail consistency lag SOTA. Good for illustrated backgrounds, weak for logos or anything with typography.
- **Bing Image Creator** is a free DALL·E 3 wrapper with no API, 1024×1024 outputs, 15 fast boosts/day, and Microsoft's commercial terms — a viable manual fallback, not a pipeline component. A botched Jan 2025 "PR16" upgrade was rolled back after quality complaints, a reminder of how little control you have over this surface.

The practical punchline for a prompt-enhancement/asset-generation router: **Leonardo for programmatic volume, FLUX 1.1 Pro (Together) for quality/cost balance, Firefly for indemnified commercial deliverables, Krea for human-in-the-loop ideation, Photon Flash for bulk cheap drafts, Playground v3 when it opens up, and Bing Image Creator only as a manual last resort.**

## Tool Comparison Table

| Tool | Latest flagship | Text rendering | Transparent PNG | Style/char ref | API GA | Price anchor | Commercial license | IP indemnity |
|---|---|---|---|---|---|---|---|---|
| Leonardo Phoenix 1.0 | Phoenix | Good (not best) | **Yes (native `foreground_only`)** | Style, Content, Character, Elements | Yes (REST) | PAYG ($) | Paid plans | No |
| Leonardo Lightning XL | Lightning XL | Moderate | Yes | Via Elements | Yes | PAYG (cheap) | Paid plans | No |
| Leonardo Kino XL | Kino XL | Moderate | Yes | Via Elements | Yes | PAYG | Paid plans | No |
| Playground v3 / v3 HD | PGv3 (24B DiT) | **Best-in-class (82%)** | Unclear | Reference images (limited) | **Partner-gated** | $12–$45/mo | Yes on Pro | No |
| Krea 1 + real-time | Krea 1 (BFL collab) | Moderate (Qwen variant better) | Via background removal | Up to 3 style refs | Yes (REST) | $9–$200/mo (CU) | Yes | No |
| Firefly Image 5 | FI5 (4MP native, Oct 2025) | Strong | Yes (Photoshop) | Structure/Style/Composition ref | Yes (Firefly Services) | Enterprise from ~$1k/mo | Yes | **Yes** (CC only, not API) |
| FLUX 1.1 [pro] (Together) | FLUX 1.1 Pro | Very good | No (needs post) | No (baseline API) | Yes (serverless) | $0.04/MP | Yes (BFL terms) | No |
| FLUX.1 [pro] (Together) | FLUX Pro | Very good | No | No | Dedicated only | Contact | Yes | No |
| Luma Photon | Photon | Weak (despite marketing) | No native | Image/style/char refs | Yes | $0.015/img 1080p | Yes | No |
| Luma Photon Flash | Photon Flash | Weak | No native | Image/style/char refs | Yes | **$0.002/img 1080p** | Yes | No |
| Bing Image Creator | DALL·E 3 (Microsoft build) | Good (DALL·E 3) | No | No | **No API** | Free | Per MS terms | No |

(Sources cited inline below and in References.)

## Per-Tool Deep-Dive

### Leonardo.ai

> **Updated 2026-04-21:** Leonardo Phoenix 2.0 launched in late 2025 with improved character consistency (85–90% identity preservation across generations) and better text rendering. Phoenix 2.0 architecture shares lineage with FLUX.1.

**Model catalog** ([docs.leonardo.ai/docs/commonly-used-api-values](https://docs.leonardo.ai/docs/commonly-used-api-values)):
- **Phoenix 2.0** — latest flagship; improved character identity preservation (~85–90%), better text rendering, iterative "Edit with AI" prompting. Shares architecture lineage with FLUX.1.
- **Phoenix 1.0** (`de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3`) — earlier proprietary foundation model, retained for reproducibility.
- **Phoenix 0.9** (`6b645e3a-d64f-4341-a6d8-7a3690fbf042`) — older checkpoint retained for reproducibility.
- **Lightning XL** (`b24e16ff-06e3-43eb-8d33-4416c2d75876`) — fast SDXL fine-tune; low token cost; ideal for iteration, concepting, bulk generation.
- **Kino XL** (`aa77f04e-3eec-4034-9c07-d0f619684628`) — cinematic look, film-grade lighting.
- Plus hosted SDXL, Flux Dev/Schnell, and community fine-tunes.

**Phoenix parameters** ([docs.leonardo.ai/docs/phoenix](https://docs.leonardo.ai/docs/phoenix)): `contrast` (3/3.5/4), `alchemy` (Quality vs Fast), `styleUUID` presets ("Graphic Design Vector", "Minimalist", etc.), `enhancePrompt`. Alchemy mode noticeably lifts prompt adherence but costs more tokens.

**Image Guidance** = ControlNet-style, with **Style Reference**, **Content Reference**, and **Character Reference** (0–2 weight, Low/Mid/High `strengthType`). Omni models accept up to 6 reference images.

**Elements** are Leonardo's LoRA-like style adapters ([docs.leonardo.ai/reference/listelements](https://docs.leonardo.ai/reference/listelements)). Public Elements are enumerable via API; you can train Elements on faces/styles/content on top of Flux Dev by default, share across teams, and combine multiple Elements at weighted strengths.

**Transparency** — the big one for this project: Leonardo supports native RGBA output via `"transparency": "foreground_only"` ([docs.leonardo.ai/docs/generate-images-using-transparency](https://docs.leonardo.ai/docs/generate-images-using-transparency)). This is rare among commercial APIs and makes Leonardo a strong candidate for the "transparent logo / app icon" failure case described in the project goal.

**Pricing** — Individual tiers: Free / Essential $12 / Premium $30 / Ultimate $60 (annual discounted up to 20%). API is now **Pay-As-You-Go** in USD, no subscription minimum, with auto-top-up and free starter credit ([docs.leonardo.ai/docs/payg-guide](https://docs.leonardo.ai/docs/payg-guide)). Commercial use is allowed on paid plans; enterprise deals available for volume.

**Strength for asset generation**: Best commercial tool in this set for programmatic pipelines when you need (a) a stable REST API with documented model IDs, (b) transparent PNG output, (c) brand-consistent reference/Element workflows, (d) per-image PAYG billing. Weakness: text rendering is decent but not Ideogram/Recraft-grade.

### Playground v3 / v3 HD

Published as "Playground v3: Improving Text-to-Image Alignment with Deep-Fusion Large Language Models" ([arXiv 2409.10695](https://arxiv.org/abs/2409.10695), Sep 2024).

**Architecture** — 24B-parameter DiT diffusion model. Instead of the usual T5/CLIP text encoder, PGv3 fuses a Llama-3 LLM into the diffusion backbone using "Deep-Fusion" cross-attention at every transformer block, so the image model is doing reasoning *with* the LLM rather than consuming frozen embeddings. The paper also introduces **Argus** (a new VLM used for training-caption generation) and **CapsBench** (a new captioning benchmark).

**Benchmarks** (from the technical report):
- **DPG-Bench Hard: 88.62** — vs Ideogram 2.0 80.12, Flux Pro 78.69, Midjourney v6.0 64.63.
- **Text synthesis: 82%** — exceeds all other SOTA models reported.
- **User preference for graphic design** over human designers: stickers 80.5%, T-shirts 60.7%, with similar wins on posters and logos.
- Precise RGB color control, multilingual input, strong typography.

**API availability** — **The API is partner-gated.** Playground.com's pricing page explicitly states API access is prioritized for partners whose users will generate **>1M images/month**; others must submit a form and wait ([playground.com/pricing](https://playground.com/pricing)). Pro Plus ($36/mo annual, $45/mo monthly) "includes API access" but in practice this is still waitlisted. This is the single biggest blocker for using PGv3 in a prompt-enhancement product today.

**Consumer plans**: Pro $12/mo (75 v3 edits / 3 hours, 150 monthly mixed credits); Pro Plus $36/mo (unlimited v3, 1000 credits, API). All paid plans include a **worldwide royalty-free commercial license** and you own your images.

**Strength**: currently the strongest "design-aware" model on public benchmarks, especially for typography-heavy assets (stickers, T-shirts, logos). **Weakness**: closed API; for now you have to generate by hand, automate via browser, or wait.

### Krea

Krea's positioning has shifted since 2023 from "real-time SDXL canvas" to a full creative suite. The relevant surfaces today:

- **Real-time canvas** — text, canvas strokes, uploaded images, webcam, and screen capture all feed a diffusion model producing live previews; excellent for concepting and client-facing iteration. [aiphotolabs.com/reviews/krea-ai-review-2025](https://aiphotolabs.com/reviews/krea-ai-review-2025-real-time-creative-suite-with-multi-model-power/)
- **Krea 1** ([docs.krea.ai/user-guide/features/krea-1](https://docs.krea.ai/user-guide/features/krea-1)) — flagship built in collaboration with Black Forest Labs. Targets the "AI look": crisp textures, accurate color science, photorealistic skin, dynamic camera angles. 6 credits/gen, 1.5K native res upscalable to 4K, up to 4 images per batch, 3 style references, LoRA support. Note that Krea's own docs recommend **Qwen 2512** over Krea 1 for typography-heavy work.
- **Krea Edit** (launched Mar 9, 2026) — rebuilt editing tool with regional selection (rectangle, brush, or click-to-select), object movement with inpaint gap-fill, perspective/lighting/palette changes, and image expansion. Platform also received a major UI redesign in March 2026 with unified navigation and voice mode.
- **FLUX.1 Krea** ([krea.ai/blog/flux-krea-open-source-release](https://krea.ai/blog/flux-krea-open-source-release)) — open-weight BFL/Krea collab, useful for self-hosting similar aesthetic.
- **API** — REST endpoints, Bearer auth, 40+ hosted models with compute-unit billing shared with the web app ([docs.krea.ai/developers/api-keys-and-billing](https://docs.krea.ai/developers/api-keys-and-billing)).

**Pricing**: Free (100 CU/day), Basic $9, Pro $35 (all video models), Max from $70, Business from $200. Annual plans advertise 50% off.

**Strength**: Real-time feedback and a single API surface over many models — a good "aggregator" fallback. **Weakness**: Krea 1 text rendering is not class-leading; their own doc points users at Qwen 2512 for layout/text.

### Adobe Firefly 3 / 4 / 5

> **Updated 2026-04-21:** Firefly Image 5 launched publicly at Adobe MAX in October 2025. As of March 2026, it's in Photoshop (Beta) enabling instruction-based Generative Fill. Custom Models remain in closed beta. Layered Image Editing is in private beta.

Firefly's commercial thesis is **safety**: trained on Adobe Stock (licensed), openly-licensed material, and public-domain content, with an enforceable **IP indemnification** attached to the outputs.

**Model lineage**:
- **Firefly Image 3** (late 2024) — commercial baseline, Photoshop Generative Fill, Generative Expand.
- **Firefly Image 4 / Image 4 Ultra** (Apr 2025) — up to 2K native; Ultra variant for complex scenes, small structures, and detail; better people/animals/architecture; improved in-image text. [techcrunch.com/2025/04/24](https://www.techcrunch.com/2025/04/24/adobe-releases-new-firefly-image-generation-models-and-a-redesigned-firefly-web-app/)
- **Firefly Image 5** (announced Adobe MAX Oct 2025; Photoshop Beta Mar 2026) — **native 4MP (~2240×1792)**, intelligent layer deconstruction (scene → independent editable layers), "Instruct Edit" natural-language refinement, improved hands/anatomy, Custom Models in closed beta. [TechCrunch Oct 2025](https://techcrunch.com/2025/10/28/adobe-firefly-image-5-brings-support-for-layers-will-let-creators-make-custom-models/); [medium/CherryZhouTech](https://medium.com/@CherryZhouTech/adobe-launches-firefly-image-5-native-4mp-and-custom-models-54b4fde6903d)

**IP indemnity** ([licenseorg.com/blog/adobe-firefly-indemnification-explained](https://www.licenseorg.com/blog/adobe-firefly-indemnification-explained)):
- Full indemnity on paid CC subscriptions ($4.99/mo and up).
- Free tier: no indemnity; outputs may be watermarked.
- Enterprise: full indemnity, custom legal protection.
- **Critical**: indemnity applies to Firefly web/CC apps but **does not automatically extend to Firefly Services API usage** — API builders must confirm coverage in their enterprise agreement. Indemnity also excludes modifications, misuse, and customer-supplied inputs.

**Firefly Services API** ([developer.adobe.com/firefly-services/docs/firefly-api](https://developer.adobe.com/firefly-services/docs/firefly-api)):
- Image Generation, Generative Fill, Generative Expand, Object Composite, Upscale (beta), Custom Models.
- Image 5: 10 credits/image (standard) or 20 (Ultra); fast mode doubles credits.
- Effective cost roughly $0.02–$0.10/image at tier pricing.
- **Requires enterprise agreement from ~$1,000/month** — consumer CC plans ($9.99–$199.99) do **not** include API access.

**Strength**: only choice when a client or legal team requires IP-safe, commercially indemnified outputs; excellent Generative Fill for compositing assets into existing scenes. **Weakness**: price floor is high; API indemnity is not a given; style can feel conservative vs MJ/PGv3.

### FLUX.1 [pro] / [1.1 pro] on Together AI

Together hosts the Black Forest Labs FLUX lineup ([together.ai/models/flux1-1-pro](https://www.together.ai/models/flux1-1-pro)):

- **FLUX 1.1 [pro]** — serverless, $0.04/MP, best-in-class prompt adherence and text rendering among open/hosted models.
- **FLUX.1 [pro]** — **not** on the serverless API; only via on-demand Dedicated Endpoints ([together.ai/models/flux-1-pro](https://www.together.ai/models/flux-1-pro)).
- **FLUX.1 [schnell]** — free tier (partnership with BFL), open-source.
- Access: all `pro` variants require **Build Tier 2** (≥$50 lifetime account spend) ([docs.together.ai/docs/billing-usage-limits](https://docs.together.ai/docs/billing-usage-limits)).

**Strength**: best price/quality balance for general-purpose asset generation if you're already running a Together/OpenAI-compatible stack; excellent text rendering (better than Leonardo Phoenix, close to Ideogram). **Weakness**: no native transparency, no first-party ControlNet/style ref on the hosted endpoint (you'd add that with fal.ai/Replicate or self-hosted pipelines); licensing on output images follows BFL/Together terms — no indemnity.

### Luma Photon 1 / Photon Flash

Luma's image models are the spillover from their video work. API specs ([docs.lumalabs.ai](https://docs.lumalabs.ai/docs/image-generation)):

- **Photon**: $0.015 per 1080p image; $0.0073/megapixel.
- **Photon Flash**: $0.002 per 1080p image; $0.0019/megapixel — *extremely cheap*.
- Aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9.
- References: **image**, **style**, **character** — all first-class API parameters.

**Quality reality check**: Luma markets "state-of-the-art text rendering" but independent testing ([adam.holter.com/luma-photon-matches-sdxl-quality-bad-and-fails-at-text](https://adam.holter.com/luma-photon-matches-sdxl-quality-bad-and-fails-at-text/)) says Photon is "roughly on par with SDXL" and "falls short of the latest models in terms of consistency and detail preservation," with "heavy artifacting in fine details" and weak typography. Luma's own double-blind numbers (60%+ preference) do not reproduce independently.

**Strength**: unbeatable `$/image` for bulk drafts, illustrations, background plates; character reference works well. **Weakness**: don't use it for logos, icons with text, or anything where typography matters.

### Bing Image Creator

Free DALL·E 3 wrapper at [bing.com/images/create](https://bing.com/images/create). Key quirks:

- **No official API** — browser-only or via Copilot.
- **Prompt refinement mismatch**: ChatGPT's DALL·E 3 silently rewrites vague prompts through GPT-4 before sending to the image model; Bing sends prompts with much less refinement, so identical prompts produce worse Bing output. ([aiappgenie.com/post/dall-e-3-vs-bing-image-creator](https://aiappgenie.com/post/dall-e-3-vs-bing-image-creator))
- **Output**: 1024×1024 only.
- **15 fast "boost" credits/day**, unlimited slower queue afterward.
- **Commercial use**: allowed under Microsoft's service terms, but not production-grade volume.
- **Jan 2025 PR16 incident**: Microsoft shipped a new DALL·E 3 build ("twice as fast"), users flagged degraded quality, Microsoft rolled back. ([techcrunch.com/2025/01/08](https://techcrunch.com/2025/01/08/microsoft-rolls-back-its-bing-image-creator-model-after-users-complain-of-degraded-quality/)) Lesson: you have no model-version control here.

Treat Bing as a **free, manual, commercial-OK fallback** for one-off assets when a user has no API key and no budget. Not a pipeline component.

## Licensing Matrix

| Tool | Paid plan commercial use | Own outputs | IP indemnity | Public/private generation | Notable restrictions |
|---|---|---|---|---|---|
| Leonardo.ai | Yes (Essential+) | Yes | **No** | Private on paid | Free tier = public |
| Playground v3 | Yes (Pro, Pro Plus) | Yes (royalty-free worldwide) | **No** | Private on paid | Free tier = no commercial |
| Krea | Yes on paid | Yes | **No** | Private on paid | Compute-unit pool shared w/ web |
| Firefly 3/4/5 (CC / web) | Yes | Yes | **Yes** ($4.99+ plans) | Private | Free tier may be watermarked |
| Firefly Services (API) | Yes | Yes | **Verify per contract** | Private | Enterprise-only |
| FLUX 1.1 Pro (Together) | Yes (BFL/Together terms) | Yes | **No** | n/a | Pro tier requires $50 spend |
| Luma Photon | Yes | Yes | **No** | n/a | Per Luma API ToS |
| Bing Image Creator | Yes (MS terms) | Yes | **No** | Public by default | Not for high-volume production |

The single most important legal datapoint: **only Firefly offers enforceable IP indemnity, and even that is primarily a Creative Cloud guarantee**, not a Firefly Services API guarantee by default. If a client demands "indemnified AI art" you will negotiate an enterprise Firefly contract or use stock. Everything else disclaims.

## API Readiness

Ranking by "can I ship a production pipeline against this today?":

1. **Leonardo.ai** — stable REST, documented model IDs, PAYG billing, async generation + polling, webhooks, Elements enumeration, transparency flag, reference images. Close to a one-stop shop.
2. **Together AI (FLUX 1.1 Pro + Schnell)** — OpenAI-compatible image endpoint, serverless, per-MP pricing, multi-tier account gating; great if you already use Together for LLMs.
3. **Krea API** — 40+ models unified under one CU-billed REST, Bearer auth, good for "try many models" meta-routing. Newer, less battle-tested than Leonardo/Together.
4. **Luma Photon** — clean REST, cheap, references are first-class. Only weakness is model quality for typography.
5. **Firefly Services** — excellent API surface (Generative Fill, Composite, Upscale, Custom Models), but enterprise-only and expensive entry.
6. **Playground v3** — partner-gated; effectively unavailable to most builders until they open the waitlist.
7. **Bing Image Creator** — **no API**; scriptable only via Copilot or browser automation, which violates MS terms at scale.

For the prompt-enhancement/asset-generation router described in the project goal, I would route:
- **Transparent PNG icons/logos** → Leonardo Phoenix with `transparency: foreground_only`, falling back to FLUX 1.1 Pro + BiRefNet/rembg post-processing.
- **Typography-heavy assets** (wordmarks, poster, stickers) → FLUX 1.1 Pro or (when open) Playground v3; Ideogram/Recraft from other angles still win here.
- **Marketing/hero illustrations** → Krea 1 or Leonardo Phoenix with Style Reference.
- **Photorealistic product shots** → FLUX 1.1 Pro, Krea 1, or Firefly 5 when indemnity matters.
- **Bulk drafts / thumbnails** → Photon Flash ($0.002) or FLUX schnell (free on Together).
- **Legal-sensitive deliverables** → Firefly 5 via CC (not API) with explicit indemnity.

## Best-of-Breed Recommendations

For a concrete "who's best at what" when building an asset-generation pipeline:

- **Best transparent PNG generation (API-native)**: Leonardo Phoenix. The `"transparency": "foreground_only"` flag is the cleanest way to avoid the "checkered box in background" failure.
- **Best API ergonomics for asset pipelines**: Leonardo.ai (documented model IDs, PAYG, references, Elements) — then Together AI for raw FLUX quality.
- **Best prompt adherence + text rendering (research frontier)**: Playground v3, blocked by API gating. Today, use FLUX 1.1 Pro as the available substitute.
- **Best real-time ideation surface**: Krea's live canvas + multi-model API.
- **Best commercial-safety guarantee**: Firefly 5 via Creative Cloud; Firefly Services API with enterprise contract.
- **Cheapest per image**: Luma Photon Flash ($0.002/1080p) and FLUX schnell (free on Together during promo).
- **Best "free manual fallback"**: Bing Image Creator.
- **Best style/character consistency across a brand set**: Leonardo Elements (custom trained on Flux Dev) or Krea style references + LoRA; Firefly Custom Models when legal demands it.

## References

- Leonardo Phoenix docs: [docs.leonardo.ai/docs/phoenix](https://docs.leonardo.ai/docs/phoenix)
- Leonardo commonly-used API values: [docs.leonardo.ai/docs/commonly-used-api-values](https://docs.leonardo.ai/docs/commonly-used-api-values)
- Leonardo transparency docs: [docs.leonardo.ai/docs/generate-images-using-transparency](https://docs.leonardo.ai/docs/generate-images-using-transparency)
- Leonardo Image Guidance: [docs.leonardo.ai/docs/generate-images-using-image-to-image-guidance](https://docs.leonardo.ai/docs/generate-images-using-image-to-image-guidance)
- Leonardo Elements API: [docs.leonardo.ai/reference/listelements](https://docs.leonardo.ai/reference/listelements)
- Leonardo pricing: [leonardo.ai/pricing](https://leonardo.ai/pricing/) and PAYG guide [docs.leonardo.ai/docs/payg-guide](https://docs.leonardo.ai/docs/payg-guide)
- Playground v3 paper: [arXiv 2409.10695](https://arxiv.org/abs/2409.10695) / [huggingface.co/papers/2409.10695](https://huggingface.co/papers/2409.10695)
- Playground v3 tech report: [playground.com/pg-v3](https://www.playground.com/pg-v3)
- Playground v3 blog: [playground.com/blog/introducing-playground-v3](https://playground.com/blog/introducing-playground-v3)
- Playground API reference: [docs.playground.com/reference/image-generation](https://docs.playground.com/reference/image-generation)
- Playground pricing: [playground.com/pricing](https://playground.com/pricing)
- Krea 1 docs: [docs.krea.ai/user-guide/features/krea-1](https://docs.krea.ai/user-guide/features/krea-1)
- Krea API docs: [docs.krea.ai/developers/api-keys-and-billing](https://docs.krea.ai/developers/api-keys-and-billing) and [krea.ai/features/api](https://www.krea.ai/features/api)
- Krea pricing: [krea.ai/pricing](https://www.krea.ai/pricing)
- Krea review: [aiphotolabs.com/reviews/krea-ai-review-2025](https://aiphotolabs.com/reviews/krea-ai-review-2025-real-time-creative-suite-with-multi-model-power/)
- FLUX.1 Krea open weights: [krea.ai/blog/flux-krea-open-source-release](https://krea.ai/blog/flux-krea-open-source-release)
- Firefly indemnification: [licenseorg.com/blog/adobe-firefly-indemnification-explained](https://www.licenseorg.com/blog/adobe-firefly-indemnification-explained)
- Adobe Firefly v4 app release (Feb 2025): [news.adobe.com/news/2025/02/firefly-web-app-commercially-safe](https://news.adobe.com/news/2025/02/firefly-web-app-commercially-safe)
- Firefly Image 5 announcement: [medium/CherryZhouTech](https://medium.com/@CherryZhouTech/adobe-launches-firefly-image-5-native-4mp-and-custom-models-54b4fde6903d)
- Firefly Image 5 in Photoshop: [community.adobe.com/announcements-698/firefly-image-5-preview-in-photoshop-generative-fill-1554211](https://community.adobe.com/announcements-698/firefly-image-5-preview-in-photoshop-generative-fill-1554211)
- Firefly Image 4 / redesign: [techcrunch.com/2025/04/24](https://www.techcrunch.com/2025/04/24/adobe-releases-new-firefly-image-generation-models-and-a-redesigned-firefly-web-app/)
- Firefly Services developer docs: [developer.adobe.com/firefly-services/docs/firefly-api](https://developer.adobe.com/firefly-services/docs/firefly-api)
- Firefly Services pricing analysis: [sudomock.com/blog/adobe-firefly-api-pricing-2026](https://sudomock.com/blog/adobe-firefly-api-pricing-2026)
- Adobe GenAI supplemental terms (PDF): [adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/AEC-GenAI-Supplemental-Terms-WW-2025v2.pdf](https://www.adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/AEC-GenAI-Supplemental-Terms-WW-2025v2.pdf)
- Together FLUX 1.1 Pro: [together.ai/models/flux1-1-pro](https://www.together.ai/models/flux1-1-pro)
- Together FLUX Pro (dedicated): [together.ai/models/flux-1-pro](https://www.together.ai/models/flux-1-pro)
- Together FLUX API blog: [together.ai/blog/flux-api-is-now-available-on-together-ai-new-pro-free-access-to-flux-schnell](https://www.together.ai/blog/flux-api-is-now-available-on-together-ai-new-pro-free-access-to-flux-schnell)
- Together usage/tier docs: [docs.together.ai/docs/billing-usage-limits](https://docs.together.ai/docs/billing-usage-limits)
- Luma Photon API changelog: [docs.lumalabs.ai/changelog/luma-photon-photon-flash-api](https://docs.lumalabs.ai/changelog/luma-photon-photon-flash-api)
- Luma API pricing: [lumalabs.ai/api/pricing](https://lumalabs.ai/api/pricing)
- Luma image generation docs: [docs.lumalabs.ai/docs/image-generation](https://docs.lumalabs.ai/docs/image-generation)
- Luma Photon marketing: [lumalabs.ai/photon](https://www.lumalabs.ai/photon)
- Independent Photon review: [adam.holter.com/luma-photon-matches-sdxl-quality-bad-and-fails-at-text](https://adam.holter.com/luma-photon-matches-sdxl-quality-bad-and-fails-at-text/)
- Bing Image Creator help: [bing.com/images/create/help](https://bing.com/images/create/help)
- Bing rollback (TechCrunch Jan 2025): [techcrunch.com/2025/01/08](https://techcrunch.com/2025/01/08/microsoft-rolls-back-its-bing-image-creator-model-after-users-complain-of-degraded-quality/)
- Bing rollback (Winbuzzer): [winbuzzer.com/2025/01/09/microsoft-reverts-bing-image-creator-dall-e-update-amid-persistent-quality-issues-xcxwbn](https://winbuzzer.com/2025/01/09/microsoft-reverts-bing-image-creator-dall-e-update-amid-persistent-quality-issues-xcxwbn/)
- Bing vs ChatGPT DALL·E 3 quirks: [aiappgenie.com/post/dall-e-3-vs-bing-image-creator](https://aiappgenie.com/post/dall-e-3-vs-bing-image-creator)
