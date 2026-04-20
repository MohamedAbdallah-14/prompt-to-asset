import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * ComfyUI provider — talks to a user-owned Modal / Runpod / fly.io / self-host
 * deployment over HTTP. We intentionally don't bundle the workflow JSON: the
 * user picks a workflow that matches their routing needs (SDXL, Flux, Flux+LoRA)
 * and exposes it at a stable URL.
 *
 * Endpoint contract:
 *   POST $PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL
 *     body: { prompt, negative_prompt?, width, height, seed, model, lora?,
 *             lora_strength?, reference_images?, sampler_steps? }
 *     response 200: { image_base64, format: "png"|"webp"|"jpeg", seed,
 *                     native_rgba?: boolean, raw_response?: any }
 *     response !200: plain text error body (will be surfaced as ProviderError)
 *
 * Why this exists: Phase-4 research
 *   (docs/research/23-combinations/09-comfyui-native.md,
 *    docs/research/21-oss-deep-dive/18-serverless-comfyui-patterns.md).
 *   ComfyUI is the only route that unlocks brand LoRA / full-custom workflows
 *   without paying per-image. Break-even vs. Flux Pro API is ~200 images/day.
 */
export const ComfyUiProvider: Provider = {
  name: "comfyui",

  supportsModel(modelId: string): boolean {
    return modelId.startsWith("comfyui-");
  },

  isAvailable(): boolean {
    return Boolean(process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"]);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    const url = process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"];
    if (!url) {
      throw new ProviderError(
        "comfyui",
        modelId,
        "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL not set. Point it at your ComfyUI endpoint (Modal recommended — see docs/research/21-oss-deep-dive/18-serverless-comfyui-patterns.md)."
      );
    }
    const token = process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_TOKEN"];

    const body: Record<string, unknown> = {
      model: modelId.replace(/^comfyui-/, ""),
      prompt: req.prompt,
      width: req.width,
      height: req.height,
      seed: req.seed
    };
    if (req.negative_prompt) body["negative_prompt"] = req.negative_prompt;
    if (req.lora) {
      body["lora"] = req.lora;
      body["lora_strength"] = req.lora_strength ?? 1.0;
    }
    if (req.reference_images && req.reference_images.length > 0) {
      body["reference_images"] = req.reference_images;
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000)
      });
    } catch (err) {
      throw new ProviderError("comfyui", modelId, `fetch failed: ${(err as Error).message}`);
    }

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError(
        "comfyui",
        modelId,
        `HTTP ${resp.status}: ${errText.slice(0, 400)}`
      );
    }

    const json = (await resp.json()) as {
      image_base64?: string;
      format?: string;
      seed?: number;
      native_rgba?: boolean;
      raw_response?: unknown;
    };
    if (!json.image_base64) {
      throw new ProviderError("comfyui", modelId, "response missing image_base64");
    }
    return {
      image: Buffer.from(json.image_base64, "base64"),
      format: (json.format as "png" | "webp" | "jpeg") ?? "png",
      model: modelId,
      seed: typeof json.seed === "number" ? json.seed : req.seed,
      native_rgba: json.native_rgba ?? false,
      native_svg: false,
      ...(json.raw_response !== undefined && { raw_response: json.raw_response })
    };
  }
};
