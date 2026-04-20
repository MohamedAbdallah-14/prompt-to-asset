import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Stability AI provider — SD 1.5, SDXL, SD3 Large, Playground v3.
 * Uses the Stability AI REST API (v2beta/stable-image/generate/*).
 * See: https://platform.stability.ai/docs/api-reference
 *
 * Note: SD3-Large and SDXL accept a real `negative_prompt` field — unlike Flux,
 * we DO forward it here when the caller supplies one.
 */
export const StabilityProvider: Provider = {
  name: "stability",

  supportsModel(modelId: string): boolean {
    return ["sd-1.5", "sdxl", "sd3-large", "playground-v3"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.stability);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.stability) {
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
        "stability",
        modelId,
        "STABILITY_API_KEY not set. Either export STABILITY_API_KEY, or re-run with mode=external_prompt_only to paste into https://platform.stability.ai/playground."
      );
    }

    const endpoint = stabilityEndpoint(modelId);
    const form = new FormData();
    form.set("prompt", req.prompt);
    if (req.negative_prompt) form.set("negative_prompt", req.negative_prompt);
    form.set("aspect_ratio", aspectFor(req.width, req.height));
    form.set("seed", String(req.seed));
    form.set("output_format", req.output_format ?? "png");
    if (modelId === "sd3-large") form.set("model", "sd3-large");

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.stability}`,
        Accept: "image/*"
      },
      body: form
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("stability", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const image = Buffer.from(await resp.arrayBuffer());
    return {
      image,
      format: (req.output_format as "png" | "webp") ?? "png",
      model: modelId,
      seed: req.seed,
      raw_response: { endpoint },
      native_rgba: false,
      native_svg: false
    };
  }
};

function stabilityEndpoint(modelId: string): string {
  const base = "https://api.stability.ai/v2beta/stable-image/generate";
  if (modelId === "sd3-large") return `${base}/sd3`;
  if (modelId === "playground-v3") return `${base}/core`; // Stability Core as closest hosted surface
  if (modelId === "sdxl") return `${base}/core`;
  return `${base}/core`;
}

function aspectFor(w: number, h: number): string {
  const a = w / h;
  if (Math.abs(a - 1) < 0.08) return "1:1";
  if (Math.abs(a - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(a - 21 / 9) < 0.1) return "21:9";
  if (Math.abs(a - 3 / 2) < 0.1) return "3:2";
  if (Math.abs(a - 2 / 3) < 0.1) return "2:3";
  if (Math.abs(a - 4 / 5) < 0.1) return "4:5";
  if (Math.abs(a - 5 / 4) < 0.1) return "5:4";
  if (Math.abs(a - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(a - 9 / 21) < 0.1) return "9:21";
  return "1:1";
}
