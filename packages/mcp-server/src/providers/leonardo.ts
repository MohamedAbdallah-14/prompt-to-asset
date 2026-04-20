import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Leonardo.Ai provider — Phoenix 1.0 and SDXL-based presets.
 * Uses the Leonardo REST API (generations endpoint + polling).
 * See: https://docs.leonardo.ai/reference/creategeneration
 */
export const LeonardoProvider: Provider = {
  name: "leonardo",

  supportsModel(modelId: string): boolean {
    return ["leonardo-phoenix", "leonardo-diffusion-xl"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.leonardo);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.leonardo) {
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
        "leonardo",
        modelId,
        "LEONARDO_API_KEY not set. Either export LEONARDO_API_KEY, or re-run with mode=external_prompt_only to paste into https://app.leonardo.ai."
      );
    }

    const modelPresetId = leonardoPresetId(modelId);
    const createBody = {
      prompt: req.prompt,
      ...(req.negative_prompt && { negative_prompt: req.negative_prompt }),
      modelId: modelPresetId,
      width: req.width,
      height: req.height,
      num_images: 1,
      seed: req.seed,
      public: false
    };

    const createResp = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.leonardo}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(createBody)
    });
    if (!createResp.ok) {
      const errText = await createResp.text();
      throw new ProviderError("leonardo", modelId, `HTTP ${createResp.status}: ${errText}`);
    }

    const createJson = (await createResp.json()) as {
      sdGenerationJob?: { generationId?: string };
    };
    const genId = createJson.sdGenerationJob?.generationId;
    if (!genId) {
      throw new ProviderError("leonardo", modelId, "no generationId in create response");
    }

    // Poll for completion
    let imageUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(
        `https://cloud.leonardo.ai/api/rest/v1/generations/${encodeURIComponent(genId)}`,
        {
          headers: {
            Authorization: `Bearer ${CONFIG.apiKeys.leonardo}`,
            Accept: "application/json"
          }
        }
      );
      if (!poll.ok) continue;
      const pj = (await poll.json()) as {
        generations_by_pk?: {
          status?: string;
          generated_images?: Array<{ url?: string }>;
        };
      };
      const status = pj.generations_by_pk?.status;
      if (status === "COMPLETE") {
        imageUrl = pj.generations_by_pk?.generated_images?.[0]?.url ?? null;
        break;
      }
      if (status === "FAILED") {
        throw new ProviderError("leonardo", modelId, `generation failed`);
      }
    }
    if (!imageUrl) throw new ProviderError("leonardo", modelId, "timed out waiting for result");

    const imgResp = await fetch(imageUrl);
    const image = Buffer.from(await imgResp.arrayBuffer());
    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: { generationId: genId },
      native_rgba: false,
      native_svg: false
    };
  }
};

function leonardoPresetId(modelId: string): string {
  // Leonardo publishes their preset IDs; defaults here are the public Phoenix / SDXL snapshots.
  // Users can override via environment, but out-of-the-box we hit the canonical public IDs.
  const map: Record<string, string> = {
    "leonardo-phoenix": "6b645e3a-d64f-4341-a6d8-7a3690fbf042",
    "leonardo-diffusion-xl": "1e60896f-3c26-4296-8ecc-53e2afecc132"
  };
  return map[modelId] ?? map["leonardo-phoenix"]!;
}
