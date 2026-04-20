import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Cloudflare Workers AI — free tier hosts a real image-gen stack.
 *
 * Free allowance: 10,000 neurons / day (different models cost different
 * neurons — Flux Schnell is ~11 neurons per image, SDXL Lightning is ~2).
 * Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN to use. Both are free
 * with a Cloudflare account; no paid plan required for Workers AI.
 *
 * Surface covered:
 *   - Flux family: flux-1-schnell, flux-2-klein-4b, flux-2-klein-9b, flux-2-dev
 *   - SDXL: stable-diffusion-xl-base-1.0, stable-diffusion-xl-lightning (ByteDance)
 *   - Community: dreamshaper-8-lcm
 *   - Leonardo: phoenix-1.0, lucid-origin
 *
 * See: https://developers.cloudflare.com/workers-ai/models/ (filter: Text-to-Image)
 */
export const CloudflareProvider: Provider = {
  name: "cloudflare",

  supportsModel(modelId: string): boolean {
    return [
      "cf-flux-1-schnell",
      "cf-flux-2-klein-4b",
      "cf-flux-2-klein-9b",
      "cf-flux-2-dev",
      "cf-sdxl",
      "cf-sdxl-lightning",
      "cf-dreamshaper-8-lcm",
      "cf-leonardo-phoenix",
      "cf-leonardo-lucid-origin"
    ].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.cloudflare && CONFIG.cloudflareAccountId);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.cloudflare || !CONFIG.cloudflareAccountId) {
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
        "cloudflare",
        modelId,
        "CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN not set. Both are free with a Cloudflare account (no paid plan required). Workers AI free tier: 10,000 neurons/day. Get them at https://dash.cloudflare.com/profile/api-tokens + the account ID on your dashboard sidebar. Or re-run with mode=external_prompt_only."
      );
    }

    const cfModel = cloudflareModelPath(modelId);
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      width: Math.min(2048, req.width),
      height: Math.min(2048, req.height),
      seed: req.seed,
      num_steps: stepsFor(modelId)
    };
    if (req.negative_prompt && supportsNegativePrompt(modelId)) {
      body["negative_prompt"] = req.negative_prompt;
    }
    if (req.reference_images?.length && supportsRefs(modelId)) {
      body["image_b64"] = req.reference_images;
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      CONFIG.cloudflareAccountId
    )}/ai/run/${cfModel}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.cloudflare}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new ProviderError(
        "cloudflare",
        modelId,
        `HTTP ${resp.status}: ${errText.slice(0, 300)}`
      );
    }

    // Most CF image models return raw image bytes; some (Flux.2 multi-output)
    // wrap in JSON with a base64 image array. Detect by content-type.
    const ct = resp.headers.get("content-type") ?? "";
    let image: Buffer;
    if (ct.includes("application/json")) {
      const json = (await resp.json()) as {
        result?: { image?: string; images?: string[] };
      };
      const b64 = json.result?.image ?? json.result?.images?.[0];
      if (!b64) {
        throw new ProviderError("cloudflare", modelId, "no image/b64 in JSON response");
      }
      image = Buffer.from(b64, "base64");
    } else {
      image = Buffer.from(await resp.arrayBuffer());
    }

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: { cf_model: cfModel },
      native_rgba: false,
      native_svg: false
    };
  }
};

function cloudflareModelPath(modelId: string): string {
  const map: Record<string, string> = {
    "cf-flux-1-schnell": "@cf/black-forest-labs/flux-1-schnell",
    "cf-flux-2-klein-4b": "@cf/black-forest-labs/flux-2-klein-4b",
    "cf-flux-2-klein-9b": "@cf/black-forest-labs/flux-2-klein-9b",
    "cf-flux-2-dev": "@cf/black-forest-labs/flux-2-dev",
    "cf-sdxl": "@cf/stability-ai/stable-diffusion-xl-base-1.0",
    "cf-sdxl-lightning": "@cf/bytedance/stable-diffusion-xl-lightning",
    "cf-dreamshaper-8-lcm": "@cf/lykon/dreamshaper-8-lcm",
    "cf-leonardo-phoenix": "@cf/leonardo/phoenix-1.0",
    "cf-leonardo-lucid-origin": "@cf/leonardo/lucid-origin"
  };
  return map[modelId] ?? map["cf-flux-1-schnell"]!;
}

function stepsFor(modelId: string): number {
  // Lightning / LCM variants run at 4 steps; full Flux/SDXL at 20–30.
  if (modelId.includes("lightning") || modelId.includes("lcm")) return 4;
  if (modelId.includes("schnell")) return 4;
  if (modelId.includes("klein")) return 8;
  return 20;
}

function supportsNegativePrompt(modelId: string): boolean {
  // Flux errors on negative_prompt; SDXL / DreamShaper / Leonardo accept it.
  return !modelId.startsWith("cf-flux-");
}

function supportsRefs(modelId: string): boolean {
  // Flux.2 dev is the one CF model that accepts reference images at the time
  // of writing. Klein variants are T2I-only.
  return modelId === "cf-flux-2-dev";
}
