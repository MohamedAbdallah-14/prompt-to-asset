import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * Krea provider — paste-only.
 *
 * Krea's image-1 model is a first-party model with a proprietary API surface
 * that is not publicly documented. The web UI is the canonical surface.
 * Exposed here so routing / paste-targets resolution keeps working.
 *
 * Research basis: docs/research/21-oss-deep-dive/7d-leonardo-playground-krea-firefly.md
 */
export const KreaProvider: Provider = {
  name: "krea",

  supportsModel(modelId: string): boolean {
    return ["krea-image-1"].includes(modelId);
  },

  isAvailable(): boolean {
    return false;
  },

  async generate(modelId: string, _req: GenerateRequest): Promise<GenerateResult> {
    throw new ProviderError(
      "krea",
      modelId,
      "Krea has no stable public API. Re-run with mode=external_prompt_only to paste into https://www.krea.ai, save the image, and call asset_ingest_external."
    );
  }
};
