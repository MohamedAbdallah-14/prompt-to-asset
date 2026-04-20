import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * Adobe Firefly provider — paste-only out of the box.
 *
 * Adobe's Firefly API requires an Adobe Creative Cloud enterprise entitlement
 * plus an IMS OAuth exchange; we do not ship that flow in the core package to
 * keep the install footprint tiny and avoid leaking enterprise credentials.
 * Fallback chains can still reference `firefly-3` for paste routing — this
 * adapter just surfaces that clearly.
 *
 * Research basis: docs/research/21-oss-deep-dive/, docs/research/22-repo-deep-dives/
 */
export const AdobeProvider: Provider = {
  name: "adobe",

  supportsModel(modelId: string): boolean {
    return ["firefly-3", "firefly-image-3"].includes(modelId);
  },

  isAvailable(): boolean {
    return false;
  },

  async generate(modelId: string, _req: GenerateRequest): Promise<GenerateResult> {
    throw new ProviderError(
      "adobe",
      modelId,
      "Adobe Firefly API requires enterprise IMS OAuth and is not wired in the core package. Re-run with mode=external_prompt_only to paste into https://firefly.adobe.com, save the image, and call asset_ingest_external."
    );
  }
};
