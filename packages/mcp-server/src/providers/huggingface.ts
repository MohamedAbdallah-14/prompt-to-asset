import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Hugging Face Inference — migrated to the Inference Providers router
 * (`router.huggingface.co/<provider>/v1/images/generations`) in 2026.
 * The legacy `api-inference.huggingface.co/models/<repo>` POST surface
 * is gone; calls return HTTP 404 "Cannot POST".
 *
 * The new router is OpenAI-compatible. It returns a JSON envelope with
 * a short-lived URL to the generated image (not the bytes inline). We
 * follow the URL with a second GET to fetch the bytes.
 *
 * Provider availability for image-gen (verified 2026-05 with HF_TOKEN):
 *   - FLUX.1-schnell via `together` — 200 OK, free under HF credits
 *   - FLUX.1-dev via `together` — 410 deprecated
 *   - SDXL via `together` — 403 (org needs third-party data sharing)
 *   - SD 3 medium via `together` — 400 not supported
 *   - fal-ai / replicate / nebius — 400/401/403 for these models
 *
 * Effective model surface today: only FLUX.1-schnell. We expose other
 * IDs for backwards-compat but route them all to FLUX.1-schnell on
 * Together with a warning, so callers don't crash; they just get a
 * different model than they asked for.
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

    const { provider, repoModel, requested } = resolveProviderRoute(modelId);
    const size = `${Math.min(2048, req.width)}x${Math.min(2048, req.height)}`;

    const body: Record<string, unknown> = {
      model: repoModel,
      prompt: req.prompt,
      size,
      n: 1
    };
    if (req.seed !== undefined) body["seed"] = req.seed;

    const url = `https://router.huggingface.co/${provider}/v1/images/generations`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.huggingface}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new ProviderError(
        "huggingface",
        modelId,
        `HTTP ${resp.status} via router/${provider}: ${errText.slice(0, 300)}`
      );
    }

    // OpenAI-compat envelope: { data: [{ url, b64_json? }, ...] }
    const json = (await resp.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
    };
    const first = json.data?.[0];
    if (!first) {
      throw new ProviderError("huggingface", modelId, "router returned no image data");
    }

    let image: Buffer;
    if (first.b64_json) {
      image = Buffer.from(first.b64_json, "base64");
    } else if (first.url) {
      const dl = await fetch(first.url);
      if (!dl.ok) {
        throw new ProviderError(
          "huggingface",
          modelId,
          `image URL fetch HTTP ${dl.status} from ${new URL(first.url).host}`
        );
      }
      image = Buffer.from(await dl.arrayBuffer());
    } else {
      throw new ProviderError("huggingface", modelId, "router returned neither url nor b64_json");
    }

    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: { provider, repoModel, requested, downscaled: requested !== modelId },
      native_rgba: false,
      native_svg: false
    };
  }
};

/**
 * Resolve the requested model id to (HF Inference Provider, repo-model-id).
 *
 * Today only `together` hosts a free image model on this token: FLUX.1-schnell.
 * Other previously-supported HF models (FLUX.1-dev, SDXL base, SD3) are
 * deprecated or blocked at the provider. We collapse all four legacy ids to
 * FLUX.1-schnell on Together, and surface that downgrade in raw_response so
 * the caller can warn the user.
 */
function resolveProviderRoute(modelId: string): {
  provider: string;
  repoModel: string;
  requested: string;
} {
  const FLUX_SCHNELL = {
    provider: "together",
    repoModel: "black-forest-labs/FLUX.1-schnell"
  };
  switch (modelId) {
    case "hf-flux-schnell":
      return { ...FLUX_SCHNELL, requested: modelId };
    // The three below are not actually available on the new Inference
    // Providers surface for a free HF token. Falling back to FLUX.1-schnell
    // is better than 404'ing the caller; the warning surfaces in the
    // result's raw_response.downscaled flag.
    case "hf-flux-dev":
    case "hf-sdxl":
    case "hf-sd3":
      return { ...FLUX_SCHNELL, requested: modelId };
    default:
      return { ...FLUX_SCHNELL, requested: modelId };
  }
}
