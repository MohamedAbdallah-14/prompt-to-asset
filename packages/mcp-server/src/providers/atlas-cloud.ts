import { CONFIG } from "../config.js";
import { redact } from "../security/redact.js";
import { dummyPng } from "./openai.js";
import type { GenerateRequest, GenerateResult, Provider } from "./types.js";
import { ProviderError } from "./types.js";

const MODEL_MAP: Record<string, string> = {
  "atlas-nano-banana-2-lite": "google/nano-banana-2-lite/text-to-image-developer"
};

const TERMINAL_SUCCESS = new Set(["completed", "succeeded"]);
const TERMINAL_FAILURE = new Set(["failed", "cancelled", "canceled"]);

export const AtlasCloudProvider: Provider = {
  name: "atlas-cloud",

  supportsModel(modelId: string): boolean {
    return modelId in MODEL_MAP;
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.atlasCloud);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    const apiKey = CONFIG.apiKeys.atlasCloud;
    if (!apiKey) {
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
        "atlas-cloud",
        modelId,
        "ATLASCLOUD_API_KEY / ATLAS_CLOUD_API_KEY not set"
      );
    }

    const atlasModel = MODEL_MAP[modelId];
    if (!atlasModel) {
      throw new ProviderError("atlas-cloud", modelId, `unsupported model ${modelId}`);
    }

    const submit = await fetch(`${CONFIG.atlasCloudBaseUrl}/api/v1/model/generateImage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "prompt-to-asset/atlas-cloud-provider"
      },
      body: JSON.stringify({
        model: atlasModel,
        prompt: req.prompt,
        aspect_ratio: aspectRatioOf(req.width, req.height),
        resolution: "1k",
        seed: req.seed
      })
    });

    if (!submit.ok) {
      const detail = redact(await submit.text()).slice(0, 500);
      throw new ProviderError("atlas-cloud", modelId, `submit HTTP ${submit.status}: ${detail}`);
    }

    const submitted = (await submit.json()) as AtlasResponse;
    const predictionId = submitted.data?.id;
    if (!predictionId) {
      throw new ProviderError("atlas-cloud", modelId, "submit response did not include data.id");
    }

    let prediction = submitted;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const status = prediction.data?.status?.toLowerCase();
      if (status && TERMINAL_SUCCESS.has(status)) break;
      if (status && TERMINAL_FAILURE.has(status)) {
        throw new ProviderError(
          "atlas-cloud",
          modelId,
          `prediction ${predictionId} ended with status ${status}`
        );
      }
      if (attempt > 0) await sleep(3000);

      const poll = await fetch(
        `${CONFIG.atlasCloudBaseUrl}/api/v1/model/prediction/${encodeURIComponent(predictionId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "prompt-to-asset/atlas-cloud-provider"
          }
        }
      );
      if (!poll.ok) {
        const detail = redact(await poll.text()).slice(0, 500);
        throw new ProviderError("atlas-cloud", modelId, `poll HTTP ${poll.status}: ${detail}`);
      }
      prediction = (await poll.json()) as AtlasResponse;
    }

    const status = prediction.data?.status?.toLowerCase();
    if (!status || !TERMINAL_SUCCESS.has(status)) {
      throw new ProviderError("atlas-cloud", modelId, `prediction ${predictionId} timed out`);
    }
    const outputUrl = prediction.data?.outputs?.[0];
    if (!outputUrl) {
      throw new ProviderError("atlas-cloud", modelId, "completed prediction has no output URL");
    }

    const output = await fetch(outputUrl);
    if (!output.ok) {
      throw new ProviderError("atlas-cloud", modelId, `output download HTTP ${output.status}`);
    }

    return {
      image: Buffer.from(await output.arrayBuffer()),
      format: formatOf(output.headers.get("content-type"), req.output_format),
      model: modelId,
      seed: req.seed,
      raw_response: prediction,
      native_rgba: false,
      native_svg: false
    };
  }
};

interface AtlasResponse {
  data?: {
    id?: string;
    status?: string;
    outputs?: string[];
  };
}

function aspectRatioOf(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.15) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4 / 3) < 0.12) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
  return "1:1";
}

function formatOf(
  contentType: string | null,
  requested: GenerateRequest["output_format"]
): GenerateResult["format"] {
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpeg";
  if (requested === "webp") return "webp";
  return "png";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
