import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Ideogram provider — Ideogram 2 / 3 / 3 Turbo.
 * Best-in-class in-image typography. v3 supports native RGBA via the
 * dedicated `/ideogram-v3/generate-transparent` endpoint.
 *
 * Source: docs/research/07-midjourney-ideogram-recraft/7b-ideogram-text-rendering-for-logos.md
 * See: https://developer.ideogram.ai/
 */
export const IdeogramProvider: Provider = {
  name: "ideogram",

  supportsModel(modelId: string): boolean {
    return ["ideogram-2", "ideogram-2a", "ideogram-3", "ideogram-3-turbo"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.ideogram);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.ideogram) {
      if (CONFIG.dryRun) {
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
      throw new ProviderError("ideogram", modelId, "IDEOGRAM_API_KEY not set");
    }

    const useTransparentEndpoint =
      req.transparency && (modelId === "ideogram-3-turbo" || modelId === "ideogram-3");

    const body: Record<string, unknown> = {
      image_request: {
        prompt: req.prompt,
        aspect_ratio: aspectFor(req.width, req.height),
        model: ideogramModelCode(modelId),
        magic_prompt_option: "OFF",
        seed: req.seed,
        ...(useTransparentEndpoint && {
          rendering_speed: modelId === "ideogram-3-turbo" ? "TURBO" : "BALANCED"
        })
      }
    };

    if (req.negative_prompt) {
      (body["image_request"] as Record<string, unknown>)["negative_prompt"] = req.negative_prompt;
    }

    const endpoint = useTransparentEndpoint
      ? "https://api.ideogram.ai/ideogram-v3/generate-transparent"
      : "https://api.ideogram.ai/generate";

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Api-Key": CONFIG.apiKeys.ideogram,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("ideogram", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as { data?: Array<{ url: string }> };
    const imageUrl = json.data?.[0]?.url;
    if (!imageUrl) {
      throw new ProviderError("ideogram", modelId, "no image URL in response");
    }
    const imgResp = await fetch(imageUrl);
    const image = Buffer.from(await imgResp.arrayBuffer());

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: Boolean(useTransparentEndpoint),
      native_svg: false
    };
  }
};

function aspectFor(w: number, h: number): string {
  const a = w / h;
  if (Math.abs(a - 1) < 0.08) return "ASPECT_1_1";
  if (Math.abs(a - 16 / 9) < 0.1) return "ASPECT_16_9";
  if (Math.abs(a - 3 / 2) < 0.1) return "ASPECT_3_2";
  if (Math.abs(a - 9 / 16) < 0.1) return "ASPECT_9_16";
  return "ASPECT_1_1";
}

function ideogramModelCode(id: string): string {
  if (id === "ideogram-3-turbo") return "V_3_TURBO";
  if (id === "ideogram-3") return "V_3";
  if (id === "ideogram-2a") return "V_2A";
  return "V_2";
}
