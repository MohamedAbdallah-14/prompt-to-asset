import { OpenAIProvider } from "./openai.js";
import { GoogleProvider } from "./google.js";
import { IdeogramProvider } from "./ideogram.js";
import { RecraftProvider } from "./recraft.js";
import { BflProvider } from "./bfl.js";
import { StabilityProvider } from "./stability.js";
import { LeonardoProvider } from "./leonardo.js";
import { FalProvider } from "./fal.js";
import { HuggingFaceProvider } from "./huggingface.js";
import { PollinationsProvider } from "./pollinations.js";
import { StableHordeProvider } from "./stable-horde.js";
import { CloudflareProvider } from "./cloudflare.js";
import { ReplicateProvider } from "./replicate.js";
import { MidjourneyProvider } from "./midjourney.js";
import { AdobeProvider } from "./adobe.js";
import { KreaProvider } from "./krea.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * Providers fall into four buckets:
 *   1. Paid direct-API adapters: openai, google, ideogram, recraft, bfl,
 *      stability, leonardo, fal.
 *   2. Free-tier / zero-key adapters: pollinations (truly zero-key,
 *      HTTP GET), stable-horde (anonymous queue), huggingface (free
 *      read token, no credit card).
 *   3. Paste-only surfaces: midjourney, adobe, krea — these throw clear
 *      errors in `generate()` so callers fall back to external_prompt_only.
 *   4. Internal strategies: llm_author_svg, satori_template, composite —
 *      not providers.
 *
 * Order matters: `findProvider` picks the FIRST provider whose
 * `supportsModel` returns true. Paid adapters come first so explicit keys
 * are honored; free-tier adapters come next; paste-only last.
 */
const PROVIDERS: Provider[] = [
  // Paid direct APIs
  OpenAIProvider,
  GoogleProvider,
  IdeogramProvider,
  RecraftProvider,
  BflProvider,
  StabilityProvider,
  LeonardoProvider,
  FalProvider,
  ReplicateProvider,
  // Free-tier paths
  HuggingFaceProvider,
  PollinationsProvider,
  StableHordeProvider,
  CloudflareProvider,
  // Paste-only (registered so findProvider returns a useful error rather
  // than a generic "no provider" when the router lands on their id)
  MidjourneyProvider,
  AdobeProvider,
  KreaProvider
];

export function findProvider(modelId: string): Provider | undefined {
  return PROVIDERS.find((p) => p.supportsModel(modelId));
}

export async function generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
  const provider = findProvider(modelId);
  if (!provider) {
    throw new ProviderError("unknown", modelId, `no provider registered for model ${modelId}`);
  }
  return provider.generate(modelId, req);
}

export function providerAvailability(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of PROVIDERS) out[p.name] = p.isAvailable();
  return out;
}

/**
 * Paste-only providers have no programmatic API — doctor/capabilities
 * should explain this rather than reporting "misconfigured".
 */
export const PASTE_ONLY_PROVIDERS: readonly string[] = ["midjourney", "adobe", "krea"];

/**
 * Free-tier providers — no paid key required. Surfaced prominently by
 * doctor / capabilities / init so users know they have real options
 * before spending a cent.
 */
export const FREE_TIER_PROVIDERS: readonly string[] = [
  "pollinations",
  "stable-horde",
  "huggingface",
  "cloudflare"
];

export { ProviderError } from "./types.js";
export type { GenerateRequest, GenerateResult, Provider } from "./types.js";
