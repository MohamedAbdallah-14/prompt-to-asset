import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Hugging Face Inference API — free tier with a free HF account + read token.
 *
 * HF's serverless inference surface hosts many open-weight image models
 * (SDXL, SD3, Flux dev, community fine-tunes). The free tier rate-limits
 * to a few requests per minute; `HF_TOKEN` is a free-to-obtain read token
 * — users set it once at hf.co/settings/tokens.
 *
 * We expose three canonical models. Users can add more by setting
 * `HF_MODEL_ID` at call time via the model routing layer.
 */
export const HuggingFaceProvider: Provider = {
  name: "huggingface",

  supportsModel(modelId: string): boolean {
    return ["hf-sdxl", "hf-sd3", "hf-flux-dev", "hf-flux-schnell"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.huggingface);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.huggingface) {
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
        "huggingface",
        modelId,
        "HF_TOKEN not set. Get a free read token at https://huggingface.co/settings/tokens (no credit card) and export HF_TOKEN=hf_..."
      );
    }

    const modelPath = huggingFaceModelPath(modelId);
    const body: Record<string, unknown> = {
      inputs: req.prompt,
      parameters: {
        width: req.width,
        height: req.height,
        seed: req.seed,
        ...(req.negative_prompt && { negative_prompt: req.negative_prompt })
      }
    };

    const resp = await fetch(`https://api-inference.huggingface.co/models/${modelPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.huggingface}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("huggingface", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const image = Buffer.from(await resp.arrayBuffer());
    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: { modelPath },
      native_rgba: false,
      native_svg: false
    };
  }
};

function huggingFaceModelPath(modelId: string): string {
  const map: Record<string, string> = {
    "hf-sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    "hf-sd3": "stabilityai/stable-diffusion-3-medium-diffusers",
    "hf-flux-dev": "black-forest-labs/FLUX.1-dev",
    "hf-flux-schnell": "black-forest-labs/FLUX.1-schnell"
  };
  return map[modelId] ?? map["hf-sdxl"]!;
}
