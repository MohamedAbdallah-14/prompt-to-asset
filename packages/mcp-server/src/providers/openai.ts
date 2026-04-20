import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * OpenAI provider — gpt-image-1, gpt-image-1.5, dall-e-3.
 * Uses fetch; no OpenAI SDK dependency (keeps install footprint tiny).
 *
 * API reference: https://platform.openai.com/docs/api-reference/images
 * Key fact: `background: "transparent"` on gpt-image-1 returns true RGBA PNG.
 */
export const OpenAIProvider: Provider = {
  name: "openai",

  supportsModel(modelId: string): boolean {
    return ["gpt-image-1", "gpt-image-1.5", "dall-e-3"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.openai);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.openai) {
      if (CONFIG.dryRun) return dryRun(modelId, req);
      throw new ProviderError("openai", modelId, "OPENAI_API_KEY not set");
    }

    const body: Record<string, unknown> = {
      model: modelId,
      prompt: req.prompt,
      n: 1,
      size: sizeFor(req.width, req.height, modelId),
      response_format: "b64_json"
    };

    if (modelId.startsWith("gpt-image")) {
      if (req.transparency) {
        body["background"] = "transparent";
        body["output_format"] = req.output_format ?? "png";
      } else {
        body["output_format"] = req.output_format ?? "png";
      }
      if (req.reference_images && req.reference_images.length > 0) {
        body["input_image"] = req.reference_images;
      }
    }

    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.openai}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("openai", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as {
      data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    };
    const first = json.data?.[0];
    if (!first?.b64_json) {
      throw new ProviderError("openai", modelId, "no b64_json in response");
    }

    const image = Buffer.from(first.b64_json, "base64");
    return {
      image,
      format: (body["output_format"] as "png" | "webp") ?? "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      ...(first.revised_prompt && { provider_revised_prompt: first.revised_prompt }),
      native_rgba: Boolean(req.transparency),
      native_svg: false
    };
  }
};

function sizeFor(w: number, h: number, modelId: string): string {
  // gpt-image-1: 1024x1024, 1024x1536, 1536x1024, auto
  // dall-e-3: 1024x1024, 1024x1792, 1792x1024
  const aspect = w / h;
  if (modelId.startsWith("gpt-image")) {
    if (aspect > 1.2) return "1536x1024";
    if (aspect < 0.83) return "1024x1536";
    return "1024x1024";
  }
  if (aspect > 1.2) return "1792x1024";
  if (aspect < 0.83) return "1024x1792";
  return "1024x1024";
}

function dryRun(modelId: string, req: GenerateRequest): GenerateResult {
  return {
    image: dummyPng(req.width, req.height),
    format: "png",
    model: modelId,
    seed: req.seed,
    native_rgba: Boolean(req.transparency),
    native_svg: false,
    raw_response: { dry_run: true, prompt: req.prompt }
  };
}

/**
 * Return a 1x1 transparent PNG header — enough to satisfy downstream readers in dry-run mode.
 */
export function dummyPng(_w: number, _h: number): Buffer {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return Buffer.from(b64, "base64");
}
