import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Pixazo provider — Azure APIM gateway in front of a curated catalogue.
 *
 * Auth: `Ocp-Apim-Subscription-Key: <key>` header.
 * Sign-up: https://accounts.pixazo.ai/register (no card for free tier).
 * Get key: https://api-console.pixazo.ai/api_keys
 *
 * Endpoint shape is bespoke per model. There is no model-list discovery API
 * on the gateway, and per-model docs are client-rendered (uncrawlable). The
 * URL+body table here covers only the three confirmed free-tier models plus
 * Flux 1 Schnell paid. To add more variants, scrape the rendered docs page
 * for each model and append to ROUTES.
 *
 * IMPORTANT — free-tier IP clawback (verified at /terms-of-use, Apr 2026):
 * outputs generated on the free tier are OWNED BY APPY PIE LLP (Pixazo's
 * parent), licensed back to the user under attribution-required terms. They
 * may be displayed in Pixazo's public gallery. This makes Pixazo's free tier
 * unsuitable for production assets (logos, app icons, brand marks) where
 * the user needs full ownership.
 *   - For free zero-key generation with NO ownership clawback, prefer
 *     Cloudflare Workers AI (10k neurons/day, no IP clause) or Pollinations
 *     (zero-signup HTTP GET).
 *   - The PAID tier transfers ownership to the user, retained after
 *     cancellation. Use Pixazo paid only when its $0.0012/img Flux Schnell
 *     beats the alternatives meaningfully.
 *
 * Docs: https://www.pixazo.ai/api/free, https://www.pixazo.ai/api
 */
export const PixazoProvider: Provider = {
  name: "pixazo",

  supportsModel(modelId: string): boolean {
    return modelId.startsWith("pixazo-");
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.pixazo);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.pixazo) {
      if (CONFIG.dryRun) return dryRun(modelId, req);
      throw new ProviderError(
        "pixazo",
        modelId,
        "PIXAZO_API_KEY not set; sign up at https://accounts.pixazo.ai/register (no card needed for free tier)"
      );
    }

    const route = ROUTES[modelId];
    if (!route) {
      throw new ProviderError(
        "pixazo",
        modelId,
        `unknown pixazo model id; supported: ${Object.keys(ROUTES).join(", ")}`
      );
    }

    const body = route.buildBody(req);
    const url = `https://gateway.pixazo.ai${route.path}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": CONFIG.apiKeys.pixazo,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Azure APIM error envelope: {statusCode, message}
      throw new ProviderError("pixazo", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as { output?: string; url?: string; image?: string };
    const imageUrl = json.output ?? json.url ?? json.image;
    if (!imageUrl) {
      throw new ProviderError(
        "pixazo",
        modelId,
        `no output url in response: ${JSON.stringify(json).slice(0, 300)}`
      );
    }

    // Pixazo returns an R2-hosted URL; download immediately because R2
    // public buckets often serve time-limited links.
    const fileResp = await fetch(imageUrl);
    if (!fileResp.ok) {
      throw new ProviderError(
        "pixazo",
        modelId,
        `download HTTP ${fileResp.status} for ${imageUrl}`
      );
    }
    const image = Buffer.from(await fileResp.arrayBuffer());
    const lower = imageUrl.toLowerCase();
    const format: GenerateResult["format"] =
      lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "jpeg"
        : lower.endsWith(".webp")
          ? "webp"
          : "png";

    return {
      image,
      format,
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: false,
      native_svg: false
    };
  }
};

/* ----------------------------- routes ----------------------------- */

interface PixazoRoute {
  path: string;
  buildBody(req: GenerateRequest): Record<string, unknown>;
}

function clampSize(req: GenerateRequest, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(req.width, req.height));
  return {
    width: Math.round(req.width * scale),
    height: Math.round(req.height * scale)
  };
}

const ROUTES: Record<string, PixazoRoute> = {
  // Flux 1 Schnell — confirmed shape from user-shared docs screenshot.
  // Free tier + cheapest paid tier on Pixazo ($0.0012/img).
  "pixazo-flux-schnell": {
    path: "/flux-1-schnell/v1/get-image",
    buildBody: (req) => {
      const { width, height } = clampSize(req, 1024);
      return {
        prompt: req.prompt,
        num_steps: 4,
        seed: req.seed || 0,
        height,
        width
      };
    }
  },

  // SDXL Base 1.0 — endpoint pattern surfaced via search snippet:
  // POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage
  // Note the slug position is non-standard ("getImage" is the model-slug).
  "pixazo-sdxl-base": {
    path: "/getImage/v1/getSDXLImage",
    buildBody: (req) => {
      const { width, height } = clampSize(req, 1024);
      const body: Record<string, unknown> = {
        prompt: req.prompt,
        height,
        width,
        num_steps: 30,
        guidance_scale: 7.5,
        seed: req.seed || 0
      };
      if (req.negative_prompt) body["negative_prompt"] = req.negative_prompt;
      return body;
    }
  },

  // SD 1.5 Inpainting — URL inferred from the operation pattern reported
  // for the SD family ("get-data" operation slug). May 404 on first call;
  // if so, scrape the rendered docs at:
  //   https://www.pixazo.ai/models/text-to-image/stable-diffusion-api
  // and update the path here.
  "pixazo-sd15-inpainting": {
    path: "/stable-diffusion-v1-5-inpainting/v1/get-data",
    buildBody: (req) => {
      const source = req.reference_images?.[0];
      if (!source) {
        throw new ProviderError(
          "pixazo",
          "pixazo-sd15-inpainting",
          "inpainting requires reference_images[0] (source image URL or base64)"
        );
      }
      const mask = req["mask"] as string | undefined;
      if (!mask) {
        throw new ProviderError(
          "pixazo",
          "pixazo-sd15-inpainting",
          "inpainting requires `mask` field (URL or base64) on the request"
        );
      }
      const { width, height } = clampSize(req, 512);
      const body: Record<string, unknown> = {
        prompt: req.prompt,
        image: source,
        mask,
        height,
        width,
        num_steps: 30,
        guidance_scale: 7.5,
        seed: req.seed || 0
      };
      if (req.negative_prompt) body["negative_prompt"] = req.negative_prompt;
      return body;
    }
  }
};

function dryRun(modelId: string, req: GenerateRequest): GenerateResult {
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
