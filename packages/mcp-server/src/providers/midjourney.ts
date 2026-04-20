import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * Midjourney provider — paste-only.
 *
 * Midjourney does not publish an official API; every "Midjourney API" on the
 * market today is a reseller proxy that violates the ToS. We therefore expose
 * the model id so routing keeps working (fallback chains), but `generate()`
 * always throws a clear hint to switch to `mode=external_prompt_only` and
 * paste into the Midjourney web UI or Discord /imagine.
 *
 * Research basis: docs/research/07-midjourney-ideogram-recraft/7a-midjourney-prompting.md
 */
export const MidjourneyProvider: Provider = {
  name: "midjourney",

  supportsModel(modelId: string): boolean {
    return ["midjourney-v6", "midjourney-v7"].includes(modelId);
  },

  isAvailable(): boolean {
    return false; // Never API-available; paste-only by design.
  },

  async generate(modelId: string, _req: GenerateRequest): Promise<GenerateResult> {
    throw new ProviderError(
      "midjourney",
      modelId,
      "Midjourney has no official API. Re-run with mode=external_prompt_only to get the enhanced prompt plus paste targets (https://www.midjourney.com/app or Discord /imagine), then save the image and call asset_ingest_external."
    );
  }
};
