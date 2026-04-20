import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Replicate — universal hosted-model catalog.
 *
 * Replicate fronts basically every production open-weight image model: Flux
 * (BFL), SDXL, SD3, Recraft, Ideogram, community fine-tunes. New users get a
 * small one-time credit grant; beyond that it's metered ($ per run). We mark
 * it free_tier=true only in the "covers zero-key onboarding" sense — treat
 * it as a paid route for ongoing use.
 *
 * API shape is async: POST /v1/predictions → poll until status=succeeded.
 * See: https://replicate.com/docs/reference/http
 */
export const ReplicateProvider: Provider = {
  name: "replicate",

  supportsModel(modelId: string): boolean {
    return [
      "replicate-flux-1.1-pro",
      "replicate-flux-schnell",
      "replicate-flux-dev",
      "replicate-sdxl",
      "replicate-sd3",
      "replicate-recraft-v3",
      "replicate-ideogram-3"
    ].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.replicate);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.replicate) {
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
        "replicate",
        modelId,
        "REPLICATE_API_TOKEN not set. Get one at https://replicate.com/account/api-tokens (signup trial credit available). Or re-run with mode=external_prompt_only."
      );
    }

    const ref = replicateModelRef(modelId);
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      seed: req.seed,
      width: req.width,
      height: req.height
    };
    if (supportsNegativePrompt(modelId) && req.negative_prompt) {
      input["negative_prompt"] = req.negative_prompt;
    }
    if (modelId === "replicate-ideogram-3" && req.transparency) {
      input["style"] = "transparent";
    }
    if (modelId === "replicate-recraft-v3") {
      input["size"] = `${req.width}x${req.height}`;
    }

    // Use the "run a model by ref" shortcut for official models; otherwise POST
    // to /v1/predictions with the version id. The canonical refs below do both.
    const url = ref.version
      ? "https://api.replicate.com/v1/predictions"
      : `https://api.replicate.com/v1/models/${ref.owner}/${ref.name}/predictions`;
    const body = ref.version ? { version: ref.version, input } : { input };

    const createResp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.replicate}`,
        "Content-Type": "application/json",
        Prefer: "wait=30"
      },
      body: JSON.stringify(body)
    });

    if (!createResp.ok) {
      const errText = await createResp.text().catch(() => "");
      throw new ProviderError(
        "replicate",
        modelId,
        `HTTP ${createResp.status}: ${errText.slice(0, 300)}`
      );
    }

    let pred = (await createResp.json()) as {
      id?: string;
      status?: string;
      output?: string | string[];
      error?: string;
      urls?: { get?: string };
    };

    // Prefer=wait=30 returns the finished prediction inline when it's fast;
    // otherwise we poll the urls.get endpoint.
    for (let i = 0; i < 60 && pred.status !== "succeeded" && pred.status !== "failed"; i++) {
      const pollUrl = pred.urls?.get;
      if (!pollUrl) break;
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${CONFIG.apiKeys.replicate}` }
      });
      if (!poll.ok) continue;
      pred = (await poll.json()) as typeof pred;
    }

    if (pred.status !== "succeeded") {
      throw new ProviderError(
        "replicate",
        modelId,
        `prediction ${pred.status ?? "unknown"}: ${pred.error ?? "no output"}`
      );
    }

    const imgUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    if (!imgUrl) {
      throw new ProviderError("replicate", modelId, "succeeded but no output URL");
    }

    const imgResp = await fetch(imgUrl);
    const image = Buffer.from(await imgResp.arrayBuffer());
    return {
      image,
      format: imgUrl.endsWith(".svg") ? "svg" : "png",
      model: modelId,
      seed: req.seed,
      raw_response: { prediction_id: pred.id },
      native_rgba: modelId === "replicate-ideogram-3" && Boolean(req.transparency),
      native_svg: modelId === "replicate-recraft-v3"
    };
  }
};

interface ReplicateRef {
  owner: string;
  name: string;
  /** Optional version hash — when set, route via /predictions with `version`. */
  version?: string;
}

function replicateModelRef(modelId: string): ReplicateRef {
  // Official-model shortcut URLs use owner/name with no pinned version, which
  // auto-resolves to the latest public deployment.
  const map: Record<string, ReplicateRef> = {
    "replicate-flux-1.1-pro": { owner: "black-forest-labs", name: "flux-1.1-pro" },
    "replicate-flux-schnell": { owner: "black-forest-labs", name: "flux-schnell" },
    "replicate-flux-dev": { owner: "black-forest-labs", name: "flux-dev" },
    "replicate-sdxl": { owner: "stability-ai", name: "sdxl" },
    "replicate-sd3": { owner: "stability-ai", name: "stable-diffusion-3" },
    "replicate-recraft-v3": { owner: "recraft-ai", name: "recraft-v3" },
    "replicate-ideogram-3": { owner: "ideogram-ai", name: "ideogram-v3" }
  };
  return map[modelId] ?? map["replicate-flux-schnell"]!;
}

function supportsNegativePrompt(modelId: string): boolean {
  // Flux rejects negative_prompt; SDXL / SD3 / Recraft / Ideogram accept it.
  return !modelId.startsWith("replicate-flux");
}
