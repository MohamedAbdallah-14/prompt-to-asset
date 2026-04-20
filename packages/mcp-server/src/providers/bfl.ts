import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Black Forest Labs (Flux) provider — Flux Pro, Flux.1, Flux.2, Kontext.
 * CRITICAL: Flux rejects `negative_prompt` field — we DO NOT send it.
 * See: https://docs.bfl.ai/
 */
export const BflProvider: Provider = {
  name: "bfl",

  supportsModel(modelId: string): boolean {
    return ["flux-pro", "flux-1", "flux-2", "flux-kontext", "flux-schnell", "flux-dev"].includes(
      modelId
    );
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.flux);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.flux) {
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
      throw new ProviderError("bfl", modelId, "BFL_API_KEY / TOGETHER_API_KEY not set");
    }

    // IMPORTANT: never send negative_prompt — Flux errors on it.
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      width: req.width,
      height: req.height,
      seed: req.seed,
      output_format: req.output_format ?? "png"
    };

    if (req.reference_images && req.reference_images.length > 0) {
      body["reference_images"] = req.reference_images;
    }

    // Flux.2 and Flux-Kontext accept a brand LoRA / finetune by id; Flux Pro 1.x
    // and schnell/dev do not. Only forward when the endpoint supports it.
    if (req.lora && (modelId === "flux-2" || modelId === "flux-kontext")) {
      body["finetune_id"] = req.lora;
      body["finetune_strength"] = req.lora_strength ?? 1.0;
    }

    const endpoint = bflEndpoint(modelId);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-key": CONFIG.apiKeys.flux,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("bfl", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    // BFL async: POST returns job id; poll until `ready`
    const submitJson = (await resp.json()) as { id?: string; polling_url?: string };
    const pollUrl = submitJson.polling_url;
    if (!pollUrl) throw new ProviderError("bfl", modelId, "no polling_url in response");

    let imageUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const p = await fetch(pollUrl, { headers: { "x-key": CONFIG.apiKeys.flux } });
      const pj = (await p.json()) as { status?: string; result?: { sample?: string } };
      if (pj.status === "Ready" && pj.result?.sample) {
        imageUrl = pj.result.sample;
        break;
      }
      if (pj.status === "Error" || pj.status === "Failed") {
        throw new ProviderError("bfl", modelId, `job failed: ${JSON.stringify(pj)}`);
      }
    }
    if (!imageUrl) throw new ProviderError("bfl", modelId, "timed out waiting for result");

    const imgResp = await fetch(imageUrl);
    const image = Buffer.from(await imgResp.arrayBuffer());

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: submitJson,
      native_rgba: false,
      native_svg: false
    };
  }
};

function bflEndpoint(modelId: string): string {
  const map: Record<string, string> = {
    "flux-pro": "https://api.bfl.ai/v1/flux-pro-1.1",
    "flux-1": "https://api.bfl.ai/v1/flux-pro",
    "flux-2": "https://api.bfl.ai/v1/flux-pro-2",
    "flux-kontext": "https://api.bfl.ai/v1/flux-kontext-pro",
    "flux-schnell": "https://api.bfl.ai/v1/flux-schnell",
    "flux-dev": "https://api.bfl.ai/v1/flux-dev"
  };
  return map[modelId] ?? map["flux-pro"]!;
}
