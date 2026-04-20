---
category: 20-open-source-repos-landscape
angle: 20c
title: "SDK Wrappers and Unified Interfaces for Image Generation"
slug: 20c-image-gen-sdk-wrappers
author: research-subagent-20c
date: 2026-04-19
sources_primary:
  - https://sdk.vercel.ai/docs/ai-sdk-core/image-generation
  - https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-image
  - https://ai-sdk.dev/v5/providers/ai-sdk-providers/fal
  - https://github.com/vercel/ai/pull/4056
  - https://openrouter.ai/docs/guides/overview/multimodal/image-generation
  - https://openrouter.ai/collections/image-models
  - https://github.com/andrewyng/aisuite
  - https://github.com/andrewyng/aisuite/issues/90
  - https://docs.langchain.com/oss/python/integrations/tools/dalle_image_generator
  - https://reference.langchain.com/python/langchain-community/tools/openai_dalle_image_generation
  - https://docs.llamaindex.ai/en/stable/api_reference/tools/text_to_image/
  - https://next.ts.llamaindex.ai/docs/api/functions/imageGenerator
  - https://replicate.com/docs/get-started/python
  - https://github.com/replicate/replicate-javascript
  - https://docs.fal.ai/clients/python/
  - https://docs.fal.ai/clients/javascript/
  - https://docs.together.ai/docs/images-overview
  - https://github.com/simonw/llm-openai-plugin/issues/18
  - https://vercel.com/docs/ai-gateway/byok
tags: [sdk, wrappers, abstraction, vercel-ai-sdk, langchain, llamaindex, aisuite, openrouter, replicate, fal, together, llm]
---

# SDK Wrappers and Unified Interfaces for Image Generation

## Executive Summary

Building a prompt-to-asset + asset-generation product means making model-routing decisions at least as often as prompting decisions. The dominant question is not "which model is best?" but "which *abstraction* lets us change our minds cheaply?"

Today the landscape splits into four tiers:

1. **Unified SDKs with first-class image support.** The **Vercel AI SDK** (`experimental_generateImage`, now generally available in AI SDK 5 as `generateImage`) is by a wide margin the most mature polyglot abstraction for image generation. It already ships official providers for OpenAI `gpt-image-1`, Google Vertex/Gemini (Imagen 3 + Nano Banana), Replicate, fal.ai, Luma Photon, Fireworks, and Together via the OpenAI-compatible path, with a uniform `model.image()` interface, built-in retries, batching, aspect-ratio normalization, seed control, and a `providerOptions` escape hatch. It is the only SDK that has solved "one API across providers" for images in production.
2. **Aggregators that route at the HTTP layer.** **OpenRouter** now exposes image generation through the normal `/chat/completions` contract with a `modalities: ["image"]` or `["image","text"]` switch. It covers Google Nano Banana (2.5 Flash Image and Nano Banana Pro / Gemini 3 Pro Image), Flux, Seedream, GPT-5 Image Mini, and more behind one API key. Best for "one credential, many models," weaker for raw speed and streaming semantics.
3. **Framework-native tools.** **LangChain** ships `DallEAPIWrapper` + `OpenAIDALLEImageGenerationTool` and **LlamaIndex** ships `TextToImageToolSpec` / `imageGenerator`. Both are thin OpenAI-only tools designed to be *agent tools*, not to be a polyglot abstraction layer. They are convenient inside LC/LI agent graphs but poor foundations for a standalone product.
4. **Direct provider SDKs.** **Replicate** (`replicate-python`, `replicate-javascript`), **fal-client**, and **Together** are the three most important providers for open-weight image models (Flux, SDXL, SD3, Ideogram, Recraft mirrors). They ship idiomatic SDKs with `run` / `subscribe` / `stream` and file-typed outputs but each speaks a different input schema.

**aisuite** (Andrew Ng) — often cited as a "LiteLLM alternative" — **does not yet support image generation**; multimodal is "in-roadmap" (issue #90, open since Nov 2024, latest release v0.1.14). It is not a viable foundation today.

**simonw/llm** has no image-gen plugin released yet; image output is tracked in issue #828 and in `llm-openai-plugin` issue #18 (an `llm openai image-generate` subcommand is designed but unshipped as of this writing).

**Recommendation.** Build on **Vercel AI SDK v5 `generateImage` as the abstraction boundary**, with **OpenRouter as a secondary fallback gateway** for models the AI SDK doesn't ship natively (e.g., Ideogram 3, Recraft v3, Seedream 4.5). Keep a thin internal `ImageProvider` interface so we can drop in direct provider SDKs (fal, Replicate) for latency-critical paths without changing upstream call sites. This gives us ~95% of the model coverage of a LiteLLM-style aggregator, with zero lock-in, TypeScript-first ergonomics, and a credible BYOK story via Vercel AI Gateway.

## SDK Comparison

### 1. Vercel AI SDK — `generateImage`

The AI SDK introduced `experimental_generateImage` in PR [#4056](https://github.com/vercel/ai/pull/4056) (Dec 2024) and promoted it to stable `generateImage` in AI SDK 5. The design is deliberately minimal:

```ts
import { generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

const { image, images, warnings, providerMetadata } = await generateImage({
  model: openai.image('gpt-image-1'),
  prompt: 'transparent logo for a note-taking app, flat vector, no background',
  size: '1024x1024',          // or aspectRatio: '1:1'
  n: 4,                        // auto-batched across provider limits
  seed: 42,
  providerOptions: {
    openai: { background: 'transparent', quality: 'high' },
  },
  maxImagesPerCall: 2,
  maxRetries: 2,
  abortSignal,
});
```

Key design properties:

- **One function, many providers.** `model: provider.image('model-id')` is the single polymorphism point. Every provider that implements the `ImageModelV2` interface plugs in identically.
- **`providerOptions` escape hatch.** Cross-provider features (size, n, seed, aspectRatio) are typed; provider-specific features (OpenAI's `background: 'transparent'`, Luma's `character_ref`, fal's `enable_safety_checker`) are passed through untyped in a namespaced object. This is the crucial trick — you get a uniform API *without* lowest-common-denominator feature loss.
- **Automatic batching.** If a model caps at `n=1` (DALL·E 3, gpt-image-1 in some modes) but you ask for `n=8`, the SDK fans out eight parallel calls and reassembles results.
- **Warnings channel.** Instead of throwing on unsupported features, the SDK returns `warnings` (e.g., "seed not supported by model"). Safer for agent loops.
- **Return shape.** `image.base64` and `image.uint8Array` are both available; `image.mediaType` is set. No streaming — image gen is treated as a single-shot operation, consistent with how every provider actually bills.

**Official image providers shipped:**

| Package | Models |
|---|---|
| `@ai-sdk/openai` | `gpt-image-1`, `dall-e-3`, `dall-e-2` |
| `@ai-sdk/google` + `@ai-sdk/google-vertex` | Imagen 3/4, Gemini 2.5 Flash Image (Nano Banana), Gemini 3 Pro Image (Nano Banana Pro) |
| `@ai-sdk/replicate` | Any Replicate image model (Flux variants, SDXL, Ideogram, Recraft mirrors, etc.) |
| `@ai-sdk/fal` | `fal-ai/flux/*`, `fal-ai/flux-pro/kontext`, `fal-ai/ideogram/v2`, `fal-ai/recraft-v3`, Qwen-Image |
| `@ai-sdk/luma` | `photon-1`, `photon-flash-1` |
| `@ai-sdk/fireworks` | Flux / SDXL hosted variants |
| `@ai-sdk/togetherai` (via OpenAI-compat) | Flux, SDXL |
| `@ai-sdk/gateway` | Vercel AI Gateway — meta-provider, unifies billing |

**Gateway + BYOK.** Vercel AI Gateway adds a single-credential layer with **zero markup**, $5/month free credit, and a BYOK mode that proxies to your own OpenAI/Google/Bedrock keys without fees. This is the most important production detail: we get one-key dev UX *and* pass-through billing for power users.

**Verdict.** This is the mature polyglot layer. The `ImageModelV2` interface is stable, provider coverage is the widest of any OSS SDK, and the `providerOptions` pattern is the cleanest solution to the "unified vs. provider-specific" tension that has sunk every prior attempt (see: LangChain's DALL·E-only `DallEAPIWrapper`).

### 2. OpenRouter — image via Chat Completions

OpenRouter solved image gen by reusing its existing `/api/v1/chat/completions` contract. A call asks for `modalities: ["image"]` (pure image out) or `["image","text"]` (interleaved, e.g., Gemini 2.5 Flash Image which can *explain* its output):

```ts
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash-image',
    modalities: ['image', 'text'],
    messages: [{ role: 'user', content: 'transparent logo, flat vector' }],
  }),
});
```

Current image models via OpenRouter include Google Nano Banana (Gemini 2.5 Flash Image, $0.30/M input, $2.50/M output tokens), Nano Banana Pro (Gemini 3 Pro Image), ByteDance Seedream 4.5 ($0.04/img), GPT-5 Image Mini, and Flux variants. The `openrouter/auto` router can even meta-select a model per prompt, though for image gen this is rarely what you want.

Strengths: one credential, OpenAI-compatible schema, excellent for covering long-tail models without writing individual SDK integrations. Weaknesses: base64-in-JSON responses only (no direct binary streams), per-provider feature parity is lossy (e.g., Ideogram 3's magic prompt control doesn't surface cleanly), and latency is slightly worse than going direct. Good as a **fallback gateway**, not as the primary path.

### 3. LangChain — `DallEAPIWrapper` + `OpenAIDALLEImageGenerationTool`

LangChain's official image integration is OpenAI-only:

- [`DallEAPIWrapper`](https://reference.langchain.com/v0.3/python/community/utilities/langchain_community.utilities.dalle_image_generator.DallEAPIWrapper.html) — a `Utility` that calls OpenAI Images API with `n`, `size`, `quality`, `model_name`. Famously returned only the first URL when `n>1` until patched ([issue #10691](https://github.com/langchain-ai/langchain/issues/10691)).
- [`OpenAIDALLEImageGenerationTool`](https://reference.langchain.com/python/langchain-community/tools/openai_dalle_image_generation) — a `BaseTool` adapter so an `AgentExecutor` can call it.

There is **no first-party LangChain tool for Stable Diffusion, Midjourney, or Flux.** Community tools exist for Hugging Face Inference API (`HuggingFaceTextToImageTool`) but coverage is shallow and unmaintained. LangChain JS has near-identical surface and the same limitations ([langchainjs issue #6151](https://github.com/langchain-ai/langchainjs/issues/6151)).

**Verdict.** Useful if we're already inside a LangChain graph; wholly inadequate as a polyglot image layer.

### 4. LlamaIndex — `TextToImageToolSpec` / `imageGenerator`

LlamaIndex Python ships [`TextToImageToolSpec`](https://docs.llamaindex.ai/en/stable/api_reference/tools/text_to_image/) with three functions: `generate_images`, `generate_image_variation`, and a Jupyter-friendly `show_images`. It wraps OpenAI's images API and nothing else. LlamaIndex.TS exposes an analogous [`imageGenerator`](https://next.ts.llamaindex.ai/docs/api/functions/imageGenerator) with the same OpenAI-only scope.

LlamaIndex's multimodal strength is in *understanding* (Gemini-based RAG, GPT-4V indexes, multimodal vector stores), not generation. Treat it the same as LangChain: fine as a drop-in agent tool, not a foundation.

### 5. aisuite (Andrew Ng)

[`andrewyng/aisuite`](https://github.com/andrewyng/aisuite) is an OpenAI-style chat-completions wrapper across Anthropic, Google, Cohere, Mistral, HuggingFace, Ollama, AWS Bedrock, Azure, etc. As of v0.1.14 (PyPI) it supports **chat only**. Multimodal is on the roadmap ([issue #90](https://github.com/andrewyng/aisuite/issues/90), "in-roadmap" label) but neither vision-in nor image-out ship today. Watch this project — its pedigree and API shape make it a likely future polyglot for Python — but do not build on it now.

### 6. simonw/llm + `llm-img`

Simon Willison's `llm` CLI does not yet have an image-generation plugin. [`llm` issue #828](https://github.com/simonw/llm/issues/828) tracks the feature; [`llm-openai-plugin` issue #18](https://github.com/simonw/llm-openai-plugin/issues/18) sketches an `llm openai image-generate` subcommand using `gpt-image-1`. Nothing has shipped. The related `llm-pdf-to-images` is a PDF→image extractor, not a generator. No `llm-img` package exists on PyPI.

For a CLI skill (Claude Skills, Codex tools), we will probably *write* our own `llm` plugin that wraps our internal unified API — but the SDK foundation is not `llm`.

### 7. Direct provider SDKs

The three SDKs we should use directly when latency, streaming, or feature fidelity matter:

**Replicate** (`replicate-python` and `replicate-javascript`).

- JS: `await replicate.run("black-forest-labs/flux-schnell", { input: {...} })` returns `FileOutput[]` — a `ReadableStream` with `.blob()`, `.pipe()`, `.url()`. URLs expire after 1 hour.
- Python: `replicate.use("black-forest-labs/flux-dev")` returns a callable; outputs are auto-downloaded as `pathlib.Path` objects. Supports model chaining (e.g., `claude = replicate.use("anthropic/claude-4.5-sonnet"); seedream = replicate.use("bytedance/seedream-4")`).
- Coverage: every open-weight model — Flux (`dev`, `schnell`, `pro`, `kontext`, `canny`, `krea`), SDXL, SD3, Ideogram mirrors, Recraft mirrors, plus LoRAs and custom deployments.

**fal-client** (`fal-client` Python, `@fal-ai/client` JS).

- Four execution modes: `run` (sync), `subscribe` (queue + log streaming), `submit` (async request id), `stream` (partial frames for some models), `realtime` (WebSocket).
- `subscribe("fal-ai/flux/dev", { input: { prompt, image_size: "landscape_4_3" }, with_logs: true })`.
- Typically **30–50% cheaper and faster than Replicate** for the same Flux model (Flux Schnell: $0.002 @ ~0.8s on fal vs $0.003 @ ~1.2s on Replicate; Flux Pro: $0.04 vs $0.055).

**Together** (`together-python`, `together-typescript`, plus full OpenAI-compatibility).

- `client.images.generate({ model: "black-forest-labs/FLUX.1-schnell-Free", prompt, width, height, steps })` — OpenAI-shaped.
- Hosts FLUX.2 [max/pro/dev/flex], FLUX.1 [schnell] (free tier), FLUX.1 Kontext/Krea/Canny.
- Notable: FLUX.2 supports up to **8 reference images** via API for character/product consistency, 32K prompt token capacity, native HEX-color accuracy, and 4 MP output — the strongest brand-asset feature set of any hosted image API right now.

### Honorable mentions

- **LiteLLM** (BerriAI). Unified proxy over 100+ providers; image gen supports OpenAI images API shape across providers that implement it. Python-first; widely deployed. Alternative to Vercel AI Gateway for self-hosted.
- **Portkey AI Gateway.** Similar to LiteLLM with richer routing and observability.
- **continuedev/llm** and **instructor/instructor-js.** Focused on structured output, not image gen.
- **Hugging Face `huggingface_hub` InferenceClient** ships `text_to_image(...)` — OK for prototyping against any HF-hosted model but rate limits are harsh outside PRO plans.

## Model Coverage Matrix

Green = first-class support (typed provider package), Yellow = works via OpenAI-compat / raw HTTP, Red = not supported.

| Model / Family                       | Vercel AI SDK | OpenRouter | LangChain (community) | LlamaIndex | Replicate SDK | fal-client | Together |
|---|---|---|---|---|---|---|---|
| OpenAI `gpt-image-1`                 | Green | Green | Green (DALL·E tool can use it) | Green | — | — | — |
| DALL·E 3 / 2                         | Green | Green | Green | Green | — | — | — |
| Google Imagen 3 / 4                  | Green (Vertex) | Yellow (some) | Red | Red | — | — | — |
| Gemini 2.5 Flash Image (Nano Banana) | Green | Green | Red | Red | — | — | — |
| Gemini 3 Pro Image (Nano Banana Pro) | Green | Green | Red | Red | — | — | — |
| Flux.1 schnell / dev / pro           | Green (Replicate, fal, Together, Fireworks) | Green | Red | Red | Green | Green | Green |
| Flux.1 Kontext (edit)                | Green (fal, Replicate) | Yellow | Red | Red | Green | Green | Green |
| Flux.2 max / pro / dev / flex        | Green (Replicate, fal, Together) | Green | Red | Red | Green | Green | Green |
| SDXL / SD3 / SD3.5                   | Green (Replicate, fal) | Yellow | Red | Red | Green | Green | Yellow |
| Ideogram v2 / v3                     | Green (fal, Replicate) | Green | Red | Red | Green | Green | Red |
| Recraft v3 (vector)                  | Green (fal, Replicate) | Green | Red | Red | Green | Green | Red |
| ByteDance Seedream 3 / 4 / 4.5       | Green (Replicate) | Green | Red | Red | Green | Green | Red |
| Luma Photon                          | Green | Red | Red | Red | — | — | — |
| Qwen-Image                           | Green (fal) | Red | Red | Red | Red | Green | Red |
| Midjourney                           | Red (no official API) | Red | Red | Red | Red | Red | Red |

**Midjourney is uniformly unsupported** — there is no official API; any integration routes through scraped Discord bots or third-party proxies, and should be flagged as high-risk.

## Recommended Foundation for Our Plugin

### Primary: Vercel AI SDK v5 `generateImage`

Reasons:

1. **Widest typed provider coverage** of any OSS image SDK — OpenAI, Google, Replicate, fal, Luma, Fireworks, Together-compat. Covers 95%+ of the models our prompt-to-asset will route to.
2. **`providerOptions` namespace** solves the "keep provider-specific knobs without sacrificing uniform surface" problem that killed LangChain as an option. We can expose, e.g., `openai: { background: "transparent" }` for the transparency use case in category 13 without polluting the shared type.
3. **TypeScript-first**, which matches our likely plugin runtime (Claude Skills run shell + Node; Codex custom tools are TS; Gemini function calls accept JSON Schema we can generate from Zod).
4. **Vercel AI Gateway + BYOK** gives us a legitimate path from hobby (`$5/mo` free credit) to enterprise (customer's own keys, zero markup) *without changing code*.
5. **Stable interface.** `ImageModelV2` shipped with AI SDK 5. The v4 → v5 migration is done.

### Secondary: OpenRouter fallback

Wire OpenRouter as a second provider under the same internal interface for three cases:

1. **Long-tail models** we haven't added first-class support for (e.g., experimental community Flux LoRAs).
2. **Single-key demo mode** — users who want to try the product without juggling 5 provider accounts.
3. **Resilience** — if OpenAI/fal have an outage, route the same request to OpenRouter's mirror.

OpenRouter is weaker for feature-fidelity (base64-only, lossy provider options), so use it as fallback not default.

### Tertiary: Direct provider SDKs for hot paths

Keep `replicate-javascript`, `@fal-ai/client`, and `together-ai` in the dependency tree behind feature flags. Reasons to drop to them:

- **fal's realtime / streaming** modes for live-preview UX (Flux Schnell + fal.realtime can update an image at ~5 fps as the user types — a killer feature for iterative logo refinement).
- **Replicate model chaining** via `replicate.use()` lets us bundle "Claude rewrites the prompt → Seedream generates → Real-ESRGAN upscales" in one file with typed outputs.
- **Together FLUX.2 reference-image endpoint** accepts up to 8 brand reference images in one call — no other hosted API matches this, and it's directly relevant to our style-consistency category (15).

### Internal abstraction

Wrap all three in a narrow `ImageProvider` interface:

```ts
interface ImageProvider {
  id: string;                                   // 'openai:gpt-image-1', 'fal:flux-pro', etc.
  capabilities: {
    transparency: boolean;
    maxN: number;
    aspectRatios: string[];
    textRendering: 'excellent' | 'good' | 'poor';
    vectorNative: boolean;
    streaming: boolean;
    editing: boolean;
  };
  generate(input: GenerateImageInput): Promise<GenerateImageResult>;
}
```

The capability map is what the **prompt enhancer routes on.** A "transparent logo with text" request maps to providers where `transparency: true && textRendering !== 'poor'` — at time of writing that's `openai:gpt-image-1`, `google:imagen-4`, `fal:recraft-v3`, `fal:ideogram-v2`.

This layer is ~200 LOC and future-proofs us: when aisuite ships image support or when someone writes a better gateway than OpenRouter, we swap one implementation of `ImageProvider`, not the whole app.

### What *not* to build on

- **LangChain / LlamaIndex as SDK foundation.** Both are useful as downstream *adapters* (we may publish a LangChain tool wrapping our API), but their native image generation is OpenAI-only and not worth inheriting.
- **aisuite.** Not yet.
- **`llm` CLI.** We can author an `llm-` plugin that wraps our API for CLI UX, but image gen itself doesn't live there yet.
- **Direct scraping of Midjourney.** Policy and reliability nightmare. If MJ matters for a specific user flow, document it as a manual-export workflow, not an API integration.

## References

Primary sources (official docs + source repos):

- Vercel AI SDK — Image Generation: <https://sdk.vercel.ai/docs/ai-sdk-core/image-generation>
- Vercel AI SDK — `generateImage` reference: <https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-image>
- Vercel AI SDK PR #4056 (experimental_generateImage merge): <https://github.com/vercel/ai/pull/4056>
- `@ai-sdk/fal` provider docs: <https://ai-sdk.dev/v5/providers/ai-sdk-providers/fal>
- `@ai-sdk/replicate` provider docs: <https://sdk.vercel.ai/providers/ai-sdk-providers/replicate>
- `@ai-sdk/luma` provider docs: <https://ai-sdk.dev/v5/providers/ai-sdk-providers/luma>
- Vercel AI Gateway BYOK: <https://vercel.com/docs/ai-gateway/byok>
- Vercel AI Gateway pricing: <https://vercel.com/docs/ai-gateway/pricing>
- OpenRouter image generation guide: <https://openrouter.ai/docs/guides/overview/multimodal/image-generation>
- OpenRouter image models catalog: <https://openrouter.ai/collections/image-models>
- OpenRouter Nano Banana quickstart: <https://openrouter.ai/google/gemini-2.5-flash-image/api>
- aisuite GitHub: <https://github.com/andrewyng/aisuite>
- aisuite issue #90 (multimodal roadmap): <https://github.com/andrewyng/aisuite/issues/90>
- aisuite PyPI (v0.1.14): <https://pypi.org/project/aisuite/>
- LangChain `DallEAPIWrapper`: <https://reference.langchain.com/v0.3/python/community/utilities/langchain_community.utilities.dalle_image_generator.DallEAPIWrapper.html>
- LangChain `OpenAIDALLEImageGenerationTool`: <https://reference.langchain.com/python/langchain-community/tools/openai_dalle_image_generation/tool/OpenAIDALLEImageGenerationTool>
- LangChain DALL·E tool docs: <https://docs.langchain.com/oss/python/integrations/tools/dalle_image_generator>
- LangChainJS issue #6151 (n>1 bug): <https://github.com/langchain-ai/langchainjs/issues/6151>
- LlamaIndex `TextToImageToolSpec`: <https://docs.llamaindex.ai/en/stable/api_reference/tools/text_to_image/>
- LlamaIndex.TS `imageGenerator`: <https://next.ts.llamaindex.ai/docs/api/functions/imageGenerator>
- LlamaIndex multimodal overview: <https://docs.llamaindex.ai/en/stable/use_cases/multimodal/>
- Replicate Python SDK docs: <https://replicate.com/docs/get-started/python>
- Replicate Python SDK (Stainless-generated): <https://github.com/replicate/replicate-python-beta>
- Replicate TypeScript SDK: <https://sdks.replicate.com/typescript/>
- Replicate JavaScript repo: <https://github.com/replicate/replicate-javascript>
- Replicate output files: <https://replicate.com/docs/topics/predictions/output-files>
- fal.ai Python client: <https://docs.fal.ai/clients/python/>
- fal.ai JS client: <https://docs.fal.ai/clients/javascript/>
- fal.ai Python reference: <https://docs.fal.ai/reference/client-libraries/python>
- Together AI images overview: <https://docs.together.ai/docs/images-overview>
- Together AI FLUX.2 quickstart: <https://docs.together.ai/docs/quickstart-flux-2>
- Together AI Black Forest Labs models: <https://www.together.ai/models-providers/black-forest-labs>
- simonw/llm issue #828 (image gen): <https://github.com/simonw/llm/issues/828>
- simonw/llm-openai-plugin issue #18: <https://github.com/simonw/llm-openai-plugin/issues/18>
- simonw/llm-pdf-to-images: <https://github.com/simonw/llm-pdf-to-images>

Corroborating secondary sources:

- Flowith — Flux pricing comparison: <https://flowith.io/blog/flux-pricing-dev-vs-pro-vs-schnell-api-quality-speed-cost>
- TeamDay — fal.ai vs Replicate 2026 comparison: <https://www.teamday.ai/blog/fal-ai-vs-replicate-comparison>
- TokenMix — Replicate alternatives 2026: <https://tokenmix.ai/blog/replicate-alternative-cheaper>
- Lumenfall — top 5 Replicate alternatives: <https://lumenfall.ai/blog/top-5-alternatives-to-replicate-for-ai-image-generation-in-2026>
- Tenten developer blog — Gemini 2.5 Flash Image via OpenRouter: <https://developer.tenten.co/unlocking-advanced-image-generation-with-gemini-25-flash-image-through-openrouter>
- Composio — Replicate + Vercel AI SDK: <https://composio.dev/toolkits/replicate/framework/ai-sdk>
