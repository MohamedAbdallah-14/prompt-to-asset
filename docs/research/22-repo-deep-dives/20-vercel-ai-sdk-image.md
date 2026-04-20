---
wave: 2
role: repo-deep-dive
slug: 20-vercel-ai-sdk-image
title: "Deep dive: Vercel AI SDK v5 generateImage + providers"
repo: "https://github.com/vercel/ai"
license: "Apache-2.0"
date: 2026-04-19
sources:
  - https://github.com/vercel/ai
  - https://github.com/vercel/ai/pull/4056
  - https://github.com/vercel/ai/pull/5977
  - https://github.com/vercel/ai/pull/6180
  - https://github.com/vercel/ai/pull/4395
  - https://github.com/vercel/ai/issues/6077
  - https://github.com/vercel/ai/issues/11149
  - https://github.com/vercel/ai/issues/12439
  - https://github.com/vercel/ai/releases/tag/ai%405.0.167
  - https://v5.ai-sdk.dev/docs/reference/ai-sdk-core/generate-image
  - https://v5.ai-sdk.dev/docs/ai-sdk-core/image-generation
  - https://v5.ai-sdk.dev/docs/migration-guides/migration-guide-5-0
  - https://ai-sdk.dev/providers/ai-sdk-providers/openai
  - https://ai-sdk.dev/v5/providers/ai-sdk-providers/fal
  - https://ai-sdk.dev/v5/providers/ai-sdk-providers/luma
  - https://sdk.vercel.ai/providers/ai-sdk-providers/fireworks
  - https://sdk.vercel.ai/providers/community-providers/openrouter
  - https://sdk.vercel.ai/docs/reference/ai-sdk-errors/ai-no-image-generated-error
  - https://vercel.com/blog/ai-sdk-5
  - https://vercel.com/docs/ai-gateway/image-generation/ai-sdk
  - https://vercel.com/docs/ai-gateway/byok
  - https://platform.openai.com/docs/guides/image-generation
  - https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity
  - https://cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001
  - https://cloud.google.com/vertex-ai/generative-ai/docs/image/configure-aspect-ratio
  - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/omit-content-using-a-negative-prompt
  - https://docs.lumalabs.ai/docs/image-generation
  - https://fal.ai/docs/api-reference/client-libraries/javascript/realtime
  - https://fal.ai/models/fal-ai/flux-2-pro/edit/api
  - https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai
  - https://docs.together.ai/docs/quickstart-flux-2
  - https://openrouter.ai/docs/community/vercel-ai-sdk
  - https://github.com/OpenRouterTeam/ai-sdk-provider/issues/386
tags: [vercel-ai-sdk, generateImage, providers, openai, google, fal, replicate, together]
---

# Deep dive: Vercel AI SDK v5 `generateImage` + providers

## Repo metrics

- **License:** Apache-2.0 on core `ai` and every first-party `@ai-sdk/*` provider.
- **Version:** `ai@5.0.0` shipped **2025-07-31**; latest stable **`ai@5.0.167`** (2026-04-05). Nine months of weekly patch releases, no `5.1` or `6.0` on the horizon. `zod@^4.1.8` is a hard peer requirement.
- **Footprint:** `ai` core ~600 KB unpacked; each provider package 50–150 KB. Pure TypeScript, no native deps. Runs in Node ≥ 18, Edge, Deno, Bun, browser-with-proxy.
- **Popularity:** ~2M weekly npm downloads, ~20k stars, Vercel-team-maintained.
- **Image-relevant packages (Apr 2026):** `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/google-vertex`, `@ai-sdk/replicate@2.0.27`, `@ai-sdk/fal`, `@ai-sdk/luma`, `@ai-sdk/fireworks`, `@ai-sdk/togetherai`, `@ai-sdk/openai-compatible`, `@ai-sdk/gateway`. Community `@openrouter/ai-sdk-provider` rides alongside.

## `generateImage` — the surface as of v5.0.167

`generateImage` is still formally **experimental** nine months into v5 — the label reflects provider API churn, not wrapper instability. Idiomatic import:

```ts
import { experimental_generateImage as generateImage } from 'ai';
```

Signature stable since `ai@5.0.30`. PR #5977 (`providerMetadata.images[]` on `ImageModelV2`) and PR #6180 (settings moved from model constructor into call-level `maxImagesPerCall`/`providerOptions`) are the only material interface changes in v5.

### Call signature

```ts
const { image, images, warnings, providerMetadata, responses } = await generateImage({
  model,                      // ImageModelV2 — e.g. openai.image('gpt-image-1.5')
  prompt,                     // string | { text: string; images?: Buffer[]; mask?: Buffer }
  n?, size?, aspectRatio?,    // size and aspectRatio are mutually exclusive
  seed?, maxImagesPerCall?,   // SDK fans out n across maxImagesPerCall requests
  maxRetries?,                // default 2
  providerOptions?,           // { [providerId]: { ...untyped passthrough } }
  abortSignal?, headers?,
});
```

`GeneratedFile = { base64, uint8Array, mediaType }`. No streaming on this surface — single-shot, matching how every provider bills.

### `ImageModelV2` contract

Providers implement a tiny interface; the SDK does the rest.

```ts
interface ImageModelV2 {
  readonly specificationVersion: 'v2';
  readonly provider: string;               // 'openai', 'fal', ...
  readonly modelId: string;
  readonly maxImagesPerCall: number | undefined;
  doGenerate(options: {
    prompt: string | { text: string; images?: Uint8Array[]; mask?: Uint8Array };
    n, size, aspectRatio, seed, providerOptions, abortSignal, headers
  }): Promise<{
    images: Array<{ base64: string } | { uint8Array: Uint8Array }>;
    warnings: ImageGenerationWarning[];
    providerMetadata?: ImageModelProviderMetadata;  // images[] always present
    response: { timestamp, modelId, headers? };
  }>;
}
```

The SDK handles batching (`n > maxImagesPerCall` fans out), retries, abort propagation, warnings aggregation. **Providers never throw on unsupported settings** — they push into `warnings[]` and carry on. The single most important design choice for agent loops.

### Breaking changes from v4

1. **`ImageModelV1 → V2`**: v4's `{ images: Uint8Array[] }` is now typed `GeneratedFile[]` with `mediaType`. Codemod: `npx @ai-sdk/codemod v5`.
2. **Model-constructor settings removed.** `luma.image('photon-1', { maxImagesPerCall: 5 })` → now a top-level `generateImage` arg (PR #6180).
3. **`providerMetadata.images[]` is contractually present** (PR #5977). This is how DALL·E 3's `revisedPrompt` and OpenAI's `created / quality / background` come back typed.
4. **`NoImageGeneratedError`** (PR #4395) is thrown from core when providers return zero predictions — previously surfaced as "undefined is not an object".
5. **`zod` peer bumped to v4.** `@ai-sdk/provider@2.x`, `@ai-sdk/provider-utils@3.x`. Third-party providers must target `specificationVersion: 'v2'`.

## Providers — capability teardown

All notes empirical as of 2026-04-19. "Native transparency" = the model emits RGBA, not matting afterwards.

### `@ai-sdk/openai`

Models: `gpt-image-1.5` (flagship since Feb 2026), `gpt-image-1`, `gpt-image-1-mini`, `dall-e-3`, `dall-e-2`. DALL·E requires `size` (no `aspectRatio`).

```ts
const { images, providerMetadata } = await generateImage({
  model: openai.image('gpt-image-1.5'),
  prompt: { text: 'flat vector app icon', images: [refBuffer], mask: maskBuffer },
  providerOptions: { openai: {
    background: 'transparent',        // 'transparent' | 'opaque' | 'auto'
    output_format: 'png',             // must be png|webp if transparent
    quality: 'high',                  // 'low' | 'medium' | 'high' | 'auto'
    input_fidelity: 'high',           // preserve face/logo features on edits
    moderation: 'low',
  }},
});
const revised = providerMetadata?.openai.images[0]?.revisedPrompt;
```

- **Transparency:** native on `gpt-image-1*` via `background: 'transparent'` (not DALL·E).
- **Reference images:** up to 16 via `prompt.images`; mask editing via `prompt.mask`. `input_fidelity: 'high'` is `gpt-image-1`/`1.5` only, not `-mini`.
- **Seed:** no (warning). **Negative prompt:** encode in text.
- **Max res:** 1536×1024. **Commercial:** yes.
- **Pricing (Apr 2026):** `gpt-image-1.5` high 1024² **$0.133** / 1536 **$0.20**; medium $0.034; `-mini` high $0.036; DALL·E 3 HD $0.08 / std $0.04.
- **Latency:** `gpt-image-1.5` high 12–25s; mini 4–8s; DALL·E 3 8–15s.

OpenAI also exposes a Responses-API **image tool** (`openai.tools.imageGeneration(...)`) callable from `generateText`/`streamText`, which *can* stream partial image frames — an agentic-loop affordance distinct from `generateImage`.

### `@ai-sdk/google` + `@ai-sdk/google-vertex`

Imagen 4 models (`imagen-4.0-generate-001`, `-fast-`, `-ultra-`, plus Imagen 3) go through `.image()`:

```ts
await generateImage({
  model: vertex.image('imagen-4.0-generate-001'),
  aspectRatio: '1:1',                         // '1:1'|'3:4'|'4:3'|'9:16'|'16:9'
  providerOptions: { google: {
    negativePrompt: 'text, watermark',
    personGeneration: 'dont_allow',
    addWatermark: false,                      // required to enable seed
    enhancePrompt: true,                      // Vertex's own Gemini-based rewriter
    seed: 42, safetySetting: 'block_medium_and_above',
  }},
});
```

Gemini image models (**Nano Banana 2** = `gemini-3.1-flash-image-preview`, default since 2026-02-26; **Nano Banana Pro** = `gemini-3-pro-image-preview`) have **no `.image()` surface** — they flow through `generateText`/`streamText`; files land in `result.files`. Unavoidable surface asymmetry: Imagen is `generateImage`-shaped, Gemini-image is `generateText`-shaped.

- **Transparency:** Imagen 4 none; Gemini image via prompt only.
- **Reference images:** Imagen none; Gemini via messages array.
- **Seed/neg-prompt:** Imagen yes (seed needs `addWatermark:false`); Gemini no.
- **Max res:** Imagen 4 = 2K; Nano Banana Pro = 4K (capacity-gated, 503s reported).
- **Pricing:** Imagen 4 Fast $0.02 / Std $0.04 / Ultra $0.06; Nano Banana Pro $0.134 (1K–2K) / $0.24 (4K); Batch API halves Gemini. GCP billing **must** be enabled.
- **Latency:** Imagen Fast 3–5s, Std 6–10s, Ultra 10–18s; Nano Banana Pro 8–15s / 15–30s @ 4K.

### `@ai-sdk/replicate`

Generic wrapper over any Replicate image model — Flux variants, SDXL, SD3.5, Ideogram v3 mirror, Recraft v3 mirror, Seedream 4.5, Qwen-Image, custom LoRAs. `providerOptions.replicate` is a **passthrough to Replicate `input`**; the SDK types six common knobs (`guidance_scale`, `num_inference_steps`, `negative_prompt`, `output_format`, `output_quality`, `strength`, `maxWaitTimeInSeconds`) and leaves the rest `unknown`. Transparency, reference images, seed — all model-dependent.

Pricing/latency: Flux Schnell $0.003 @ 1.2s; Flux Dev $0.03 @ 4s; Flux Pro $0.055 @ 6s; Seedream 4.5 $0.04 @ 5–10s; Recraft v3 $0.04 @ 8s.

### `@ai-sdk/fal`

Same model set, operationally **~30% faster and cheaper** than Replicate (fal owns the inference stack). `providerOptions.fal.style = 'digital_illustration'` for Recraft v3; `fal-ai/flux-2-pro/edit` accepts up to 4 reference images.

**`fal.realtime`** is a WebSocket surface orthogonal to `generateImage`: `fal.realtime.connect('fal-ai/flux-2/klein/realtime', { onResult })` streams ~5fps at 512² with sub-100ms inference. Ideal for live-preview prompt-as-you-type UX. Not reachable through `generateImage` — call `@fal-ai/client` directly; auth via short-lived JWT from backend.

Pricing: Flux Schnell $0.002 @ 0.8s; Flux Dev $0.020 @ 3.5s; Flux Pro $0.05/MP; FLUX.2 Pro $0.03 first MP + $0.015/MP; Recraft v3 $0.04.

### `@ai-sdk/togetherai`

OpenAI-compatible. Killer feature: **FLUX.2 multi-reference** — `FLUX.2 [pro]` / `[flex]` take **up to 8 reference images** per call (playground 10), `FLUX.2 [dev]` uses `reference_images` only. Min input 400×400, output up to 4 MP, 32K-token prompts, native HEX-color fidelity — the strongest brand-asset feature set of any hosted API in 2026.

```ts
await generateImage({
  model: togetherai.image('black-forest-labs/FLUX.2-pro'),
  providerOptions: { togetherai: { reference_images: [url1, url2, /* up to 8 */], steps: 30 }},
});
```

Also hosts FLUX.1 [schnell] (free tier, rate-limited), Kontext/Krea/Canny, SDXL. Pricing: FLUX.2 Pro ~$0.06; FLUX.1 Pro ~$0.05. Latency comparable to fal, slightly slower p95.

### `@ai-sdk/luma`

`photon-1`, `photon-flash-1`. Queued backend — SDK polls (`pollIntervalMillis`, `maxPollAttempts`). First-class `image_ref` (up to 4, with `weight`), `style_ref`, and `character_ref` channels. No native transparency; 1.4K max; $0.019–$0.032/img; 3–8s.

### `@ai-sdk/fireworks`

SDXL 1.0 and Flux Kontext Pro. Flux Kontext is **async by contract** — returns `request_id`; SDK polls `/workflows/{model}/get_result` transparently (issue #11149). Image-model options still **untyped** (issue #12439 open).

### `@ai-sdk/openai-compatible` + OpenRouter

`createOpenAICompatible({ baseURL, apiKey, name }).image(...)` yields a working provider. Community `@openrouter/ai-sdk-provider` (v2.x) added image generation with a `files` parameter for reference inputs (issue #386 closed Feb 2026). Caveats: **base64-only responses**, lossy provider options (Ideogram v3 `magic_prompt` doesn't surface cleanly), latency p95 20–40% higher than direct. Upside: one credential covers Nano Banana, Seedream 4.5, GPT-5 Image Mini, every Flux tier, Ideogram v3, Recraft v3. Fallback gateway, not primary.

### `@ai-sdk/gateway`

Vercel AI Gateway. `gateway('openai/gpt-image-1')`; **zero markup when BYOK**, $5/mo free credit with pass-through pricing otherwise. No image-specific knobs — HTTP-layer multiplexer, deploy-time flip.

## Capability matrix (Apr 2026)

**Y** = supported, **N** = not, **~** = partial/LoRA, **P** = prompt-only.

| Model                        | Transp. | Ref imgs | Style | Char | Seed | Neg P | Max res | Text | Commerce |
|---|---|---|---|---|---|---|---|---|---|
| OpenAI `gpt-image-1.5`       | Y       | 16       | via   | via  | N    | P     | 1536    | exc  | Y        |
| OpenAI `gpt-image-1-mini`    | Y       | 16       | via   | via  | N    | P     | 1024    | good | Y        |
| DALL·E 3                     | N       | 0        | N     | N    | N    | P     | 1792    | poor | Y        |
| Imagen 4 Std / Ultra         | N       | 0        | N     | N    | Y    | Y     | 2K      | good | Y        |
| Gemini 2.5 Flash Image       | P       | Y        | P     | Y    | N    | P     | 1024    | good | Y        |
| Gemini 3 Pro Image (NB Pro)  | P       | Y        | P     | Y    | N    | P     | 4K      | exc  | Y        |
| Flux Schnell                 | N       | 0        | N     | N    | Y    | Y     | 2K      | poor | Y (Apache) |
| Flux.1 [dev]                 | N       | 1 (Redux)| N     | N    | Y    | Y     | 2K      | poor | **N**    |
| Flux.1 [pro]                 | N       | 1        | N     | N    | Y    | Y     | 2K      | fair | Y        |
| FLUX.2 [pro] (Together)      | N       | **8**    | via   | via  | Y    | Y     | 4 MP    | good | Y        |
| FLUX.2 [pro] (fal edit)      | N       | 4        | via   | via  | Y    | Y     | 4 MP    | good | Y        |
| SDXL                         | ~ LoRA  | 1        | ~     | N    | Y    | Y     | 1024    | poor | Y        |
| Ideogram v3                  | N       | 3        | Y     | N    | Y    | Y     | 2K      | ~85% | Y        |
| Recraft v3                   | Y (vec) | 3        | Y     | N    | Y    | Y     | 2K+SVG  | exc  | Y        |
| Seedream 4.5 / 5             | N       | 4        | Y     | Y    | Y    | Y     | 4K      | 99%  | Y        |
| Luma Photon                  | N       | 4        | Y     | Y    | N    | P     | 1.4K    | fair | Y        |
| Qwen-Image                   | N       | 2        | Y     | Y    | Y    | Y     | 2K      | good | Y        |

## Pricing / latency cheatsheet (1024² standard tier)

| Regime | Models | $/img | Latency |
|---|---|---|---|
| **Interactive** (< 2s)      | Flux Schnell (fal/Replicate/Together-free), FLUX.2 Klein realtime | $0–$0.003 | 0.15–1.5s |
| **Standard** (2–8s)         | Imagen 4 Fast/Std, Gemini 2.5 Flash Image, Flux Dev, gpt-image-1-mini, Recraft v3, Seedream 4.5, Flux Pro (fal), FLUX.2 Pro (Together) | $0.02–$0.06 | 3–8s |
| **Premium** (8–30s)         | gpt-image-1.5 high, Imagen 4 Ultra, DALL·E 3 HD, Nano Banana Pro (esp. 4K) | $0.06–$0.24 | 8–30s |

For agent loops that regenerate-on-validation-failure, every model > 6s must budget for 2–3 rounds ≈ 20–60s end-to-end. This is the argument for front-loading rewrite inside `enhance_prompt` rather than re-prompting the image model.

## Streaming and realtime

`generateImage` is single-shot. Three real streaming surfaces exist outside it:

1. **Gemini 3 Pro Image via `streamText`** — emits image bytes as `file` parts. Progressive rendering, not partial-pixel updates.
2. **OpenAI Responses-API image tool via `streamText`** — `openai.tools.imageGeneration({ partial_image: 0..2 })` streams partial frames. Only on Responses API.
3. **`fal.realtime` WebSockets** — outside the AI SDK entirely. The live-preview hot path.

## Error handling norms

- **`NoImageGeneratedError`** — provider returned zero predictions. Discriminate with `NoImageGeneratedError.isInstance(e)`; `e.cause`, `e.responses` carry forensic context.
- **`APICallError`** — HTTP failures; `e.statusCode`, `e.responseBody`.
- **`AbortError`** — propagate, never swallow.
- **Unsupported settings** — never throw; land in `warnings[]` as `{ type: 'unsupported-setting', setting, details }`. A good router logs these and falls back when the missed capability is load-bearing.
- **Rate limits (429)** — surface as `APICallError` with `retry-after`. The SDK's built-in `maxRetries` handles 5xx/network but not 429; wrap with your own exponential backoff.

## Ready-to-copy `ImageProvider` interface

The narrowest surface that covers the capability variance above. Every adapter — AI SDK provider, direct fal/Together SDK, OpenRouter — implements exactly this.

```ts
export type AspectRatio = '1:1'|'3:4'|'4:3'|'9:16'|'16:9'|'3:2'|'2:3';
export type TextQuality = 'excellent'|'good'|'fair'|'poor';
export type TransparencyMode = 'native'|'via-matting'|'none';

export interface ImageProviderCapabilities {
  transparency: TransparencyMode;
  referenceImages: { supported: boolean; max: number };
  styleReference: boolean;
  characterReference: boolean;
  mask: boolean;
  seed: boolean;
  negativePrompt: boolean;
  aspectRatios: AspectRatio[];
  maxMegapixels: number;
  textRendering: TextQuality;
  vectorNative: boolean;                    // Recraft v3 SVG output
  streaming: 'none'|'partial-frames'|'realtime-ws';
  editing: boolean;
  commercialUse: boolean;
  pricingPerImage: number;                  // USD, 1024² standard tier
  typicalLatencyMs: number;
}

export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: Array<Buffer | Uint8Array | string>;   // string = URL
  styleReference?: Buffer | Uint8Array | string;
  characterReference?: Buffer | Uint8Array | string;
  mask?: Buffer | Uint8Array;
  aspectRatio?: AspectRatio;
  size?: `${number}x${number}`;
  n?: number; seed?: number;
  background?: 'transparent'|'opaque'|'auto';
  quality?: 'draft'|'standard'|'high';
  abortSignal?: AbortSignal;
}

export interface GenerateImageResult {
  images: Array<{ base64: string; mediaType: string; width: number; height: number }>;
  revisedPrompt?: string;
  warnings: Array<{ setting: string; reason: string }>;
  providerLatencyMs: number;
  providerCostUsd: number;
  providerMetadata: unknown;
}

export interface ImageProvider {
  readonly id: string;                      // 'openai:gpt-image-1.5'
  readonly vendor: 'openai'|'google'|'fal'|'replicate'|'together'|'luma'|'fireworks'|'openrouter'|'gateway';
  readonly capabilities: ImageProviderCapabilities;
  generate(input: GenerateImageInput): Promise<GenerateImageResult>;
}
```

## Decision

**Adopt Vercel AI SDK v5 `experimental_generateImage` as the typed foundation for every image call.** It is the only OSS SDK that has shipped typed polyglot image support in 2026, the only one that cleanly solves uniform-vs-provider-specific tension (`providerOptions` namespace), and the only one with a credible BYOK / Gateway pass-through story. v5.0.x cadence is healthy; `ImageModelV2` has been stable since PR #6180.

Wrap it behind the `ImageProvider` interface above so four adjacent implementations are first-class peers, not special cases:

1. **`@ai-sdk/*` providers** — default path for OpenAI, Google (Vertex + Gemini), fal, Replicate, Luma, Fireworks, Together.
2. **`fal.realtime` (direct SDK)** — implements `ImageProvider` with `streaming: 'realtime-ws'` for live-preview iteration. Does not detour the whole app onto `@fal-ai/client`.
3. **Direct Together SDK** — for the FLUX.2 8-reference-images brand-bundle endpoint, which OpenRouter cannot surface cleanly and which is the strongest hosted feature for brand consistency in 2026.
4. **OpenRouter** (`@ai-sdk/openai-compatible` + community provider) — single-credential path for Ideogram v3, Recraft v3, Seedream 4.5, GPT-5 Image Mini, and outage resilience.
5. **Vercel AI Gateway** — deploy-time switch (`@ai-sdk/gateway`) to consolidate billing without changing call sites.

### Capability router (pseudocode)

```ts
function selectProvider(
  intent: 'logo'|'app-icon'|'og-card'|'sticker'|'hero'|'svg',
  c: {
    needsTransparency: boolean;
    needsText: boolean;
    needsReferenceImages: number;     // 0..8
    needsVector: boolean;
    needsCharacterConsistency: boolean;
    budgetCents: number;
    maxLatencyMs: number;
    allowNonCommercial: boolean;
  },
  registry: Record<string, ImageProviderCapabilities>,
): string {
  const fit = Object.entries(registry).filter(([, p]) =>
    (!c.needsTransparency            || p.transparency === 'native') &&
    (!c.needsText                    || p.textRendering === 'excellent' || p.textRendering === 'good') &&
    (p.referenceImages.max           >= c.needsReferenceImages) &&
    (!c.needsVector                  || p.vectorNative) &&
    (!c.needsCharacterConsistency    || p.characterReference) &&
    (p.pricingPerImage * 100         <= c.budgetCents) &&
    (p.typicalLatencyMs              <= c.maxLatencyMs) &&
    (c.allowNonCommercial            || p.commercialUse)
  );
  if (fit.length === 0) throw new Error('no provider satisfies constraints');

  const bias: Record<string, (p: ImageProviderCapabilities) => number> = {
    logo:       p => (p.vectorNative ? 3 : 0) + (p.transparency === 'native' ? 2 : 0),
    'app-icon': p => p.transparency === 'native' ? 3 : 0,
    'og-card':  p => p.textRendering === 'excellent' ? 3 : 0,
    sticker:    p => p.transparency === 'native' ? 3 : 0,
    hero:       p => p.maxMegapixels >= 4 ? 2 : 0,
    svg:        p => p.vectorNative ? 10 : -10,
  };
  const score = (p: ImageProviderCapabilities) =>
    (bias[intent]?.(p) ?? 0)
    - Math.log(p.pricingPerImage + 0.001)     // cheaper better
    - Math.log(p.typicalLatencyMs) / 4;       // faster better

  return fit.map(([id, p]) => [id, score(p)] as const)
            .sort(([, a], [, b]) => b - a)[0][0];
}
```

Transparency, reference-image count, text-rendering quality, and cost ceiling are the four dimensions that actually discriminate. Vendor identity is never a router input — we route by capability, swap providers when economics or capability shifts, and pay the ~200 LOC abstraction cost once to avoid hard-coding a vendor decision into any feature.

**Operational discipline:** pin `ai@5.0.x`, every `@ai-sdk/*@2.0.x`, `zod@^4.1.8`, and every direct-SDK version in a lockfile. Rebuild container images on a weekly cadence, not on demand. The wrapper is stable; the underlying provider HTTP schemas are not. The lockfile is the contract; the cadence is the upgrade ritual.
