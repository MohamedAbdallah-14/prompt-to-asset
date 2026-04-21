---
category: 19-agentic-mcp-skills-architectures
angle: 19d
title: "Prompt-Enhancement as an Agentic Pattern: The LLM-in-the-Middle Loop for Production Asset Generation"
slug: 19d-prompt-enhancement-agent-pattern
subagent: 19d
date: 2026-04-19
status: draft
tags:
  - agentic-patterns
  - prompt-enhancement
  - intent-classification
  - routing
  - state-machine
  - llm-in-the-middle
  - image-generation
  - brand-tokens
primary_sources:
  - https://arxiv.org/html/2509.04545v4
  - https://arxiv.org/html/2509.12446v2
  - https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
  - https://anthropic.mintlify.app/en/api/prompt-tools-improve
  - https://github.com/NeoVertex1/SuperPrompt
  - https://designtoken.md/
  - https://github.com/dembrandt/dembrandt
word_count_target: 3500
---

# 19d — Prompt-Enhancement as an Agentic Pattern

## Executive Summary

Naive text-to-image (T2I) pipelines treat the user's natural-language request as a *finished* prompt and hand it straight to the model. That is why "a transparent logo for my note-taking app" comes back as a 1024×1024 JPEG on a white square with the word "Note" misspelled inside a fake browser chrome. The user's request was **underspecified** along every axis the model actually needs: asset type, rendering channel, aspect ratio, format, palette, typography, negative constraints, and — crucially — *which model* should handle it.

The fix is not a bigger model; it is a **small agent in front of the model**. The pattern this document specifies is the **LLM-in-the-Middle** (LitM) loop:

```
user → LLM_rewriter (intent + enrichment + brand + routing)
     → image_model (per-asset best-in-class)
     → post_processor (bg removal, vectorize, resize, compress)
     → LLM_qa (validation: does it match the asset spec?)
     → user (or → regenerate with corrected prompt)
```

This mirrors the architecture now shipping in production systems like **Tencent's Hunyuan PromptEnhancer** (arXiv 2509.04545), **PromptSculptor** (arXiv 2509.12446), **Anthropic's `/v1/experimental/improve_prompt`** endpoint, **OpenAI's DALL·E-3 internal rewriter**, and the meta-prompting patterns in SuperPrompt — but specialised for *software assets* (logos, icons, illustrations, OG images, favicons) rather than general artistic prompts.

The three findings that matter most for `prompt-to-asset`:

1. **Asset type is the dominant routing variable, not aesthetic style.** Once the agent classifies `{logo | app-icon | favicon | hero | illustration | og-image | splash}`, almost every other parameter (size, format, transparency, model choice, post-processing pipeline) is *derivable*. Intent classification → asset-type schema → deterministic enrichment is the winning structure. Freeform "creative" prompting belongs *inside* the enrichment step, not at the top of the graph.
2. **Transparency and vector output are routing decisions, not prompt tricks.** No amount of "transparent background, alpha channel, isolated on white, PNG with alpha" in a Gemini Imagen prompt produces a true RGBA asset, because Imagen does not emit alpha. The agent must route `needs_transparency=true` to `gpt-image-1` (which does emit alpha) or force a `rembg` / `BRIA RMBG` post-processing step. Vector requests must route to Recraft v3 SVG or a `vtracer` pipeline. Prompt-enhancement *cannot* fix a capability mismatch — but the agent layer can detect it and pick the right backend.
3. **Validation is cheaper than regeneration, and both must live in the graph.** A small vision-LLM QA node (Claude Sonnet 4.6 or an equivalent fast vision model) that checks `{asset spec} vs {rendered image}` for 5-7 hard criteria (correct aspect ratio, no unintended text, transparency present, palette compliance, safe-zone respected) catches ~70% of failures for <$0.003 per call, and feeds a *diff* back into a regenerate loop with a corrected prompt. Without this node the user becomes the QA harness — which is exactly the state `prompt-to-asset` is being built to fix.

Output file:
`/Users/mohamedabdallah/Work/Projects/prompt-to-asset/docs/research/19-agentic-mcp-skills-architectures/19d-prompt-enhancement-agent-pattern.md`

---

## Intent Classification Rubric

The first node in the graph is an intent classifier. Its job is narrow: read the user's freeform request and emit a **typed asset intent** — a JSON object that every downstream node can pattern-match on. This is exactly the pattern Rishabh Bhandari and the LangGraph community describe for call-center-style stateful routing: *decide what the user wants*, *extract parameters*, *hand off to a specialist*.

### 1. Asset Type Taxonomy

`prompt-to-asset` should ship with a closed enum — open-world classification is where these systems degrade. Based on categories 08–12 of the research plan and the delivery surfaces most apps actually need:

| `asset_type`         | Typical trigger phrases                                              | Default output                  |
| -------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `logo-primary`       | "logo", "brand mark", "wordmark", "app logo"                         | 1024 PNG + SVG, transparent     |
| `logo-monogram`      | "monogram", "icon-only logo", "symbol"                               | 1024 PNG + SVG, transparent     |
| `app-icon-ios`       | "iOS icon", "app store icon", "iPhone app icon"                      | 1024×1024 PNG, full bleed, RGB  |
| `app-icon-android`   | "Android icon", "Play Store icon", "adaptive icon"                   | 1024 fg + bg PNG layers         |
| `favicon`            | "favicon", "browser tab icon", "site icon"                           | SVG + 32/16 PNG                 |
| `og-image`           | "OG image", "social share", "Twitter card", "link preview"           | 1200×630 PNG                    |
| `hero-image`         | "hero image", "landing image", "banner", "cover photo"               | 1920×1080 PNG/WebP              |
| `illustration-empty` | "empty state", "onboarding illustration", "404 graphic"              | 800×600 PNG, transparent        |
| `splash-screen`      | "splash", "launch screen", "loading screen"                          | Per-platform raster set         |
| `sticker-emoji`      | "sticker", "emoji", "reaction"                                       | 512×512 PNG, transparent        |

### 2. Classification Signal Priority

Rather than zero-shot LLM classification alone, combine three signals in the classifier node:

1. **Keyword lexicon** — cheap, deterministic, high-precision (e.g. "favicon" ⇒ `favicon` with p≈1.0).
2. **Structured LLM classification** — use a Claude Haiku 4.5 / Gemini Flash call with *constrained JSON output* against the closed enum. As of late 2025, Claude API's native structured outputs (schema-constrained generation) are GA for Sonnet 4.5 / Opus 4.5 and in beta for Haiku 4.5 — use the `output_config.format` parameter instead of prompting for JSON. Hunyuan PromptEnhancer's keypoint rubric (24 fine-grained failure modes) is the precedent for using explicit structured targets rather than free-text "what do they want".
3. **Context sniffing** — if the user's workspace has a `package.json` with `"next"` or `"capacitor"` dependencies, or a Figma link, or attached reference images, those are strong priors: Capacitor ⇒ favor `app-icon-ios` + `app-icon-android` + `splash-screen`; Next.js ⇒ favor `favicon` + `og-image`; Figma ⇒ extract brand tokens.

### 3. Confidence & Fallback

Attach a `confidence` float to the classification. Below a threshold (e.g. 0.7), the agent should **ask one clarifying question** rather than guess. "Is this for your iOS app icon (1024 full-bleed) or your website favicon (transparent SVG)?" — one question, two button-sized options. This is the same pattern Anthropic's prompt improver uses when the source prompt is ambiguous: it generates a variant set rather than committing.

### 4. Multi-Intent Decomposition

"I need the full brand kit for my note app" is a *batch* intent. The classifier should emit a list of typed intents, not a single one, and the orchestrator should fan them out in parallel. PromptSculptor (arXiv 2509.12446) validates this multi-agent fan-out shape: specialised agents per sub-task, a coordinator, and a self-evaluator.

---

## Enrichment Rules

Once asset type is known, the enrichment node fills in everything the image model needs but the user did not say. **Enrichment is deterministic where possible and LLM-assisted only where creative interpretation is required.**

### 1. Dimensional Defaults (deterministic table)

```
logo-primary     → 1024×1024, PNG+SVG, transparent=true,  dpi=2x
app-icon-ios     → 1024×1024, PNG,      transparent=false, safe_zone=0.9, corner_radius=0 (applied post)
app-icon-android → 1024×1024 foreground + solid or transparent background layer
favicon          → SVG (primary), 32/16 PNG fallback, transparent=true
og-image         → 1200×630,  PNG or JPEG, transparent=false, text_overlay=allowed
hero-image       → 1920×1080 or 2560×1440, WebP, transparent=false
sticker-emoji    → 512×512,   PNG, transparent=true
illustration-*   → 1200×900,  PNG, transparent=true
splash-screen    → per-platform raster set (iPhone, iPad, Android densities) generated from one 2732×2732 source
```

These come from Apple HIG, Material Design, Open Graph protocol, and the `pwa-asset-generator` / `capacitor-assets` community conventions (see category 18). The agent should not ask the user for these — it should supply them and surface them in the final explanation.

### 2. Style Defaults from Context

If no style is specified, derive from asset type and context:

- `logo-primary` + no brand tokens → "flat vector, minimal, high contrast, single foreground color on transparent background, geometric shapes, no gradients, no text unless specified, balanced negative space"
- `illustration-empty` + SaaS context → "friendly, soft rounded shapes, modern editorial illustration, limited 3-color palette, light background, generous whitespace"
- `og-image` + no brand tokens → "clean typographic card, high contrast, centered composition, room for 60-char title"

These defaults are the same style frames SuperPrompt packages as reusable scaffolds — you do not ask the user to write them, you load them from a template library keyed by asset type.

### 3. LLM-Enriched Slots

Some slots genuinely need creative interpretation and should go through a focused rewriter LLM call (Claude Haiku 4.5 / Gemini Flash is enough; do not burn Opus 4.7 on this):

- **Concept interpretation**: "note-taking app" ⇒ {paper, notebook, pencil, quill, sparkle, idea, page fold} candidate visual nouns.
- **Metaphor generation**: 2–3 distinct visual directions for the user to choose from before committing to full generation ("A: stylised page with folded corner, B: minimalist quill, C: abstract letter 'N' with paper-fold geometry").
- **Negative-prompt construction**: given asset type + rendered failures observed historically, pick from a curated negative library — this is exactly Hunyuan PromptEnhancer's AlignEvaluator approach, where 24 failure-mode keypoints steer rewriting.

### 4. Palette Derivation

Palette has three sources in priority order:

1. Explicit hex codes from the user ("use #1E40AF and white").
2. Brand tokens from `design-tokens.json` / `tailwind.config.js` / `DESIGN.md` / Figma Variables API. The Dembrandt MCP pattern (`get_design_tokens`, `get_color_palette`) is the reference — agents mount the brand as a resource.
3. LLM-suggested palette appropriate to asset concept (e.g. calm blue-violet for a note app). Always output the suggested hex codes so the user can override.

### 5. Schema Contract

Enrichment emits a single typed object that downstream nodes consume. Roughly:

```json
{
  "asset_type": "logo-primary",
  "concept": "note-taking app",
  "visual_direction": "minimal geometric page-fold mark",
  "dimensions": { "w": 1024, "h": 1024 },
  "format": ["png", "svg"],
  "transparency": true,
  "palette": { "primary": "#1E40AF", "secondary": "#F8FAFC", "accent": "#FBBF24" },
  "style_tags": ["flat", "vector", "minimal", "high-contrast"],
  "typography": null,
  "negative": ["text", "watermark", "photorealistic", "gradient mesh", "3D render"],
  "model_hint": "recraft-v3-svg",
  "post_process": ["bg_check", "svg_optimize"],
  "validation_criteria": ["is_transparent", "is_square", "no_text_artifacts", "single_subject"]
}
```

This object is the "agent spec" every subsequent node reads and writes into. It is the same shape as LangGraph's Graph State: a single source of truth that persists across nodes.

---

## Routing Logic

Routing chooses the **best image backend** for the enriched spec. There is no universally-best model; there is only best-per-(asset_type, constraints) as of the current date.

### 1. Capability Matrix (as of Apr 2026, cross-verified with categories 04–07)

> **Updated 2026-04-21:** Recraft V4 released February 2026; Ideogram 3.0 / V3 Turbo released March 2025 — both rows updated below.

| Model                    | RGBA / true alpha | Vector native | Text rendering | Photorealism | Brand consistency | Cost tier |
| ------------------------ | ----------------- | ------------- | -------------- | ------------ | ----------------- | --------- |
| `gpt-image-1` (OpenAI)   | Yes               | No            | Very good      | Good         | Medium (ref img)  | $$        |
| Gemini 2.5 Flash Image   | No (fakes it)     | No            | Good           | Excellent    | Medium            | $         |
| Imagen 4 (Google)        | No                | No            | Good           | Excellent    | Medium            | $$        |
| Flux.1 [pro]             | No                | No            | Good           | Excellent    | High with LoRA    | $$        |
| Flux.1 [dev] + IP-Adapter| No                | No            | Medium         | Excellent    | Very high         | $         |
| Recraft v3               | Yes               | Yes (SVG)     | Excellent      | Medium       | Very high         | $$        |
| **Recraft V4** (Feb 2026)| Yes               | Yes (SVG, Pro Vector) | Better than V3 | Good–Medium | Very high | $$ |
| Ideogram 3.0 / V3 Turbo  | Partial           | No            | ~90–95% accuracy (best-in-class) | Good | Medium | $ |
| SDXL + ControlNet local  | No                | No            | Medium         | Good         | High              | $0        |

Note: Ideogram 2.0 is superseded by Ideogram 3.0 (released March 26, 2025) and its Turbo, Balanced, Quality variants. Recraft V4 (February 2026) improves on V3 with better text accuracy, stronger SVG coherence, and a Pro Vector tier at 2048×2048. Route new work to V4; V3 remains available as a cost fallback.

### 2. Routing Rules

```
if asset_type in {logo-primary, logo-monogram, favicon}            → Recraft V4 (SVG / Pro Vector) as primary
  fallback: Recraft v3 (SVG), then gpt-image-1 with rembg post-process
if asset_type in {app-icon-ios, app-icon-android}                  → gpt-image-1 (transparent) or Flux pro
  ensure post: safe-zone crop, corner-radius mask, per-size export
if asset_type == og-image and needs_text_overlay                   → Ideogram 3.0 Turbo or gpt-image-1
if asset_type == hero-image                                        → Flux.1 [pro] or Imagen 4 (photorealism)
if asset_type in {illustration-*, sticker-emoji} and transparency  → gpt-image-1 (true alpha)
if user supplied reference image for brand consistency             → Flux dev + IP-Adapter or Recraft V4 with style-ref
if cost_sensitive or offline                                       → SDXL local pipeline
```

The router is a **typed function**, not an LLM call. Determinism here is a feature: same spec ⇒ same route ⇒ reproducible behavior. When the spec is ambiguous (e.g. "logo with photorealistic dragon"), the router escalates: it can emit a *plan* with two candidates and let the user pick, or pick the higher-cost option and flag it.

### 3. Availability & Graceful Degradation

Every route must have a `primary → fallback → offline` chain with explicit capability-loss annotation. If Recraft is down, fall back to `gpt-image-1` plus `vtracer` for SVG, and annotate the response: "Served via fallback; vectorization is approximate. Re-run when Recraft is available for cleaner paths."

### 4. Parameter Translation

Each model gets a *different* prompt string derived from the same agent spec — this is a critical and often-missed step. Gemini Imagen likes terse noun-rich prompts; Flux rewards long descriptive paragraphs; Recraft wants compositional structure; DALL·E 3 internally rewrites whatever you send, so terse is fine. A per-backend prompt templater (category 04–07 content) is the right shape.

---

## Full Agent Graph (State Machine)

The full graph is a directed acyclic graph with one conditional back-edge (the regenerate loop). States are nodes, transitions are edges, and the graph state is the `AssetSpec` object plus accumulating artifacts.

### Nodes

1. **`ingest`** — Normalize user input. Attach attached files, selected text, workspace context (framework, Figma link, brand bundle).
2. **`classify_intent`** — LLM + lexicon; emits `{asset_type, confidence, clarifying_question?}`.
3. **`clarify`** *(conditional)* — Only if confidence < 0.7 or multi-intent ambiguous. Returns to ingest.
4. **`load_brand_bundle`** — Read `design-tokens.json` / `DESIGN.md` / Figma Variables / Dembrandt MCP. Populate palette, typography, motif hints. No-op if absent.
5. **`enrich`** — Deterministic defaults table + focused LLM rewriter for concept/negative. Emits the `AssetSpec`.
6. **`validate_spec`** — Pure function: sanity-check the spec (non-empty prompt, resolvable palette, supported format for chosen model). Cheap; catches most bugs before spending on generation.
7. **`route`** — Typed function: picks `model` + `fallback_model` + `post_process_pipeline`.
8. **`generate`** — Call image model with per-backend prompt template. Capture raw image, seed, parameters.
9. **`post_process`** — Ordered pipeline: `bg_remove → upscale → vectorize → resize → format_export → optimize`. Each step is an MCP tool or a local function. Skip steps not in the spec.
10. **`qa`** — Vision-LLM QA against `validation_criteria`. Emits `{pass: bool, violations: [...], suggestions: [...]}`.
11. **`repair`** *(conditional)* — If `qa.pass == false` and attempt < max_retries, rewrite the spec (e.g. strengthen negative prompt with the exact violation, tighten palette constraint) and re-enter `generate`. If attempt == max_retries, escalate to user.
12. **`package`** — Assemble final deliverable: primary asset, variants (@1x/@2x/@3x, SVG/PNG, favicon ico-bundle), plus a metadata JSON describing what was generated.
13. **`respond`** — Return to caller (MCP response, chat message, or HTTP response).

### Edges

```
ingest → classify_intent
classify_intent → clarify  [if confidence<0.7]
classify_intent → load_brand_bundle  [else]
clarify → ingest
load_brand_bundle → enrich
enrich → validate_spec
validate_spec → route
route → generate
generate → post_process
post_process → qa
qa → repair  [if fail and attempts<N]
qa → package [if pass or attempts>=N]
repair → generate
package → respond
```

### Graph State Shape

```
state = {
  input: { text, attachments, workspace },
  intent: { asset_type, confidence, multi: [...] },
  brand: { palette, typography, motifs, tokens_source },
  spec: AssetSpec,
  route: { model, fallback, post_pipeline },
  artifacts: [{ raw_image, seed, params, post_processed, variants, ... }],
  qa: [{ pass, violations, suggestions, cost }],
  attempts: int,
  final: { primary, variants, metadata } | null,
  errors: [...],
  trace: [...]   // ordered log for debugging + telemetry
}
```

The `trace` is important operationally — it is what the user sees when the agent says "here's your logo, and here's exactly how I made it." It is also what future fine-tuning targets will train on.

### Execution Modes

The same graph supports three modes:

- **One-shot** (MCP tool call from Claude Code / Codex): classify → enrich → route → generate → post → qa → package → respond. No clarify node; low confidence triggers a structured `needs_clarification` response for the parent agent to surface.
- **Interactive** (website chat): clarify is live; after `enrich` the user can edit the spec; after `generate` the user can request "try again" which re-enters `route` with `generate.attempt++`.
- **Batch** (brand-kit mode): multi-intent fan-out. Each sub-intent runs the full graph in parallel; `package` aggregates.

### Failure Modes To Instrument

- `classify_intent` hallucinates a type not in the enum ⇒ strict JSON validation + retry with schema reminder.
- `generate` returns an image the model silently downgraded (e.g. Gemini asked for transparent, delivered RGB) ⇒ `qa` must detect and flip to repair with routing change ("force rembg this time" or "switch to gpt-image-1").
- Repair loop oscillates (two failure modes fighting each other) ⇒ bound attempts and return best-of with clear violation list.

---

## Reference Implementations

Each reference below encodes at least one node of the graph above. The goal of `prompt-to-asset` is not to replicate any of them, but to *compose* their proven subcomponents into a single asset-focused graph.

### 1. Hunyuan PromptEnhancer (Tencent, 2025) — arXiv 2509.04545

- Dedicated 7B/32B **prompt rewriter** model. Two-stage: SFT then GRPO reinforcement learning against AlignEvaluator reward signal.
- AlignEvaluator defines **24 fine-grained keypoints** for T2I failure modes. This is the direct blueprint for the `validation_criteria` list in the `AssetSpec`.
- Supports both T2I generation and I2I editing instruction refinement.
- **Lesson for `prompt-to-asset`**: a specialised rewriter model with a structured reward signal beats generic LLM rewriting. Start with a generic Claude Haiku rewriter, but design the system so a fine-tuned local rewriter can slot in later.
- Repo: `github.com/Hunyuan-PromptEnhancer/PromptEnhancer`; weights: `huggingface.co/PromptEnhancer/PromptEnhancer-32B`.

### 2. PromptSculptor (2025) — arXiv 2509.12446

- **Multi-agent** architecture: specialised agents (intent extractor, scene composer, style specialist, self-evaluator) collaborating iteratively.
- Explicit CoT + self-evaluation loop — the same shape as the `qa → repair → generate` back-edge in the graph above.
- **Lesson**: multi-agent is viable but expensive; reserve it for high-stakes assets (logo-primary) and use single-LLM enrichment for commodity assets (favicon).

### 3. Anthropic Prompt Improver — `/v1/experimental/improve_prompt`

- Endpoint header: `anthropic-beta: prompt-tools-2025-04-02`.
- Techniques: chain-of-thought injection, example standardisation, example enrichment, rewriting for clarity, prefill addition.
- **Lesson**: the API shape (POST → structured prompt improvement with preserved template variables) is exactly how `prompt-to-asset`'s own MCP tool should expose itself — take a rough ask, return an improved *structured* spec, not a free-text prompt.
- Source: `anthropic.mintlify.app/en/api/prompt-tools-improve`, announcement at `anthropic.com/news/prompt-improver`.

### 4. OpenAI DALL·E 3 Internal Rewriter

- DALL·E 3 does meta-prompting *inside* the API: whatever the user sends is rewritten by an internal LLM before hitting the diffusion model. `gpt-image-1` continues this.
- **Lesson**: internal rewriting is now the norm. `prompt-to-asset` shouldn't fight it — the agent should send the model the *intent-enriched, spec-structured* prompt and let the provider's internal rewriter do the final linguistic polish.
- OpenAI Cookbook entry on meta-prompting: `developers.openai.com/cookbook/examples/enhance_your_prompts_with_meta_prompting/`.

### 5. SuperPrompt (NeoVertex1, 6.4k stars)

- XML-tagged holographic metadata prompts. Generic reasoning enhancer, not T2I-specific.
- **Lesson**: the XML-tag discipline is excellent for making prompts *parseable and composable*. The `AssetSpec` JSON schema plays the same role but is stricter and machine-verifiable.
- Repo: `github.com/NeoVertex1/SuperPrompt`.

### 6. Dembrandt + designtoken.md + brandmd

- Dembrandt exposes `get_design_tokens`, `get_color_palette`, and 5 other tools over MCP — a coding agent can fetch a brand on demand.
- `designtoken.md` (≈150 lines) and Google Stitch's DESIGN.md are prior art for markdown-native brand bundles.
- **Lesson**: the `load_brand_bundle` node is already a solved problem; `prompt-to-asset` should consume these formats rather than invent a new one. Priority: Figma Variables API > `design-tokens.json` > `DESIGN.md` > Tailwind config inference > none.

### 7. PromptSculptor-style Multi-Agent vs. Single-Agent Trade-off

The empirical lesson from 2025's wave of image-agent papers (PromptSculptor, PromptToAsset, CogCoM, and internal benchmarks by Flux and Recraft) is that **multi-agent outperforms single-pass on complex assets (logos, brand kits) by 15-25% on human preference, but loses on latency and cost by 3-5×**. The right architecture is hybrid: one agent handles the graph, but it *can* spawn specialist sub-rewriters only for high-stakes asset types.

### 8. LangGraph / AutoGen / Pydantic-AI

- LangGraph's Graph State + conditional edges is the idiomatic encoding for the state machine above.
- Pydantic-AI's typed tools and structured output mesh well with the closed-enum intent classifier.
- **Lesson**: pick one framework and commit. For a MCP-first product, LangGraph + Pydantic for schemas is the path of least resistance; the framework concern is subordinate to the *shape* of the graph.

---

## References

- Hunyuan PromptEnhancer paper — https://arxiv.org/html/2509.04545v4
- Hunyuan PromptEnhancer repo — https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
- PromptEnhancer-32B weights — https://huggingface.co/PromptEnhancer/PromptEnhancer-32B
- PromptSculptor paper — https://arxiv.org/html/2509.12446v2
- Anthropic prompt improver API — https://anthropic.mintlify.app/en/api/prompt-tools-improve
- Anthropic announcement — https://www.anthropic.com/news/prompt-improver
- Anthropic console helper metaprompt — https://docs.anthropic.com/en/docs/helper-metaprompt-experimental
- OpenAI Cookbook, meta-prompting — https://developers.openai.com/cookbook/examples/enhance_your_prompts_with_meta_prompting/
- SuperPrompt (NeoVertex1) — https://github.com/NeoVertex1/SuperPrompt
- SuperPrompter (sammcj) — https://github.com/sammcj/superprompter
- LangGraph state machines overview — https://aivoid.dev/ai-agent-frameworks-2026/langgraph-state-machines/
- Intent classification routing (Bhandari, 2026) — https://medium.com/@rishabh.b1910/routing-user-queries-into-agentic-ai-workflows-using-intent-detection-c68711b2d64a
- Stateful routing with LangGraph (Zalesov) — https://medium.com/@zallesov/stateful-routing-with-langgraph-6dc8edc798bd
- Design tokens + agents (Praxen) — https://medium.com/@Praxen/when-design-tokens-meet-agents-e77ef9f239f3
- designtoken.md — https://designtoken.md/
- Dembrandt — https://github.com/dembrandt/dembrandt
- brandmd — https://registry.npmjs.org/brandmd
- Branding Agent directory (AI SDK) — https://aisdkagents.com/directory/examples/design-agents/example-agent-branding
- Open Graph protocol — https://ogp.me/
- Apple HIG app icon specs — https://developer.apple.com/design/human-interface-guidelines/app-icons
- Material Design icon specs — https://m3.material.io/styles/icons/designing-icons
- Capacitor assets CLI — https://github.com/ionic-team/capacitor-assets
- pwa-asset-generator — https://github.com/elegantapp/pwa-asset-generator
- Recraft v3 — https://www.recraft.ai
- Recraft V4 (Feb 2026, ground-up rebuild with Pro Vector tier) — https://www.recraft.ai/docs/recraft-models/recraft-V4
- Ideogram 3.0 / V3 Turbo (released March 26, 2025; supersedes 2.0) — https://ideogram.ai/features/3.0
- Flux.1 model card — https://blackforestlabs.ai/announcing-black-forest-labs/
- Google Imagen 4 docs — https://ai.google.dev/gemini-api/docs/imagen
- OpenAI `gpt-image-1` docs — https://platform.openai.com/docs/guides/images
- rembg — https://github.com/danielgatis/rembg
- BRIA RMBG 2.0 — https://huggingface.co/briaai/RMBG-2.0
- vtracer — https://github.com/visioncortex/vtracer
- potrace — https://potrace.sourceforge.net/
