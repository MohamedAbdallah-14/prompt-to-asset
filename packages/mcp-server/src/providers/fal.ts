import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * fal.ai aggregator — provides hosted surface for many open-weight models
 * (Flux family, SD3, SDXL fine-tunes, community LoRAs). Used as an optional
 * second path to Flux / SD when BFL / Stability keys are unavailable.
 *
 * We do not try to cover every fal model; we cover the two asset-generation
 * workhorses we already route to elsewhere (fal-flux-pro, fal-flux-2).
 * See: https://docs.fal.ai/
 */
export const FalProvider: Provider = {
  name: "fal",

  supportsModel(modelId: string): boolean {
    return ["fal-flux-pro", "fal-flux-2", "fal-sdxl"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.fal);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.fal) {
      if (CONFIG.dryRun) {
        return {
          image: dummyPng(req.width, req.height),
          format: "png",
          model: modelId,
          seed: req.seed,
          native_rgba: false,
          native_svg: false,
          raw_response: { dry_run: true, prompt: req.prompt }
        };
      }
      throw new ProviderError(
        "fal",
        modelId,
        "FAL_API_KEY not set. Either export FAL_API_KEY (also known as FAL_KEY), or re-run with mode=external_prompt_only to paste into https://fal.ai."
      );
    }

    const endpoint = falEndpoint(modelId);
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      image_size: `${req.width}x${req.height}`,
      seed: req.seed,
      num_images: 1
    };
    if (req.reference_images && req.reference_images.length > 0) {
      body["reference_images"] = req.reference_images;
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${CONFIG.apiKeys.fal}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("fal", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as { images?: Array<{ url?: string }> };
    const imageUrl = json.images?.[0]?.url;
    if (!imageUrl) throw new ProviderError("fal", modelId, "no image URL in response");

    const imgResp = await fetch(imageUrl);
    const image = Buffer.from(await imgResp.arrayBuffer());

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: false,
      native_svg: false
    };
  }
};

function falEndpoint(modelId: string): string {
  const map: Record<string, string> = {
    "fal-flux-pro": "https://fal.run/fal-ai/flux-pro/v1.1",
    "fal-flux-2": "https://fal.run/fal-ai/flux-2",
    "fal-sdxl": "https://fal.run/fal-ai/fast-sdxl"
  };
  return map[modelId] ?? map["fal-flux-pro"]!;
}
