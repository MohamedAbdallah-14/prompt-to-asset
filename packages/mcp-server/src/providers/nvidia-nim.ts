import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * NVIDIA NIM provider — free tier image generation via build.nvidia.com.
 *
 * Free quota: 1,000 requests/month (resets on the 1st), no credit card.
 * Sign up: https://build.nvidia.com → generate a key prefixed `nvapi-`.
 *
 * Auth: `Authorization: Bearer <NVIDIA_API_KEY>` header.
 * Endpoint: POST https://ai.api.nvidia.com/v1/genai/<vendor>/<model>
 * Response: { artifacts: [{ base64, finishReason, seed }] } — sync.
 *
 * Notable: hosts Flux.1-dev (meaningful detail step up over Flux.1-schnell),
 * Flux.2-klein (4B), SANA (4K resolution). The 1k/month cap is small for
 * bulk work but plenty for production-quality single calls. Pair with
 * Cloudflare Workers AI (10k neurons/day, hosts Flux.1-schnell + SDXL
 * Lightning) for high-volume iteration.
 *
 * Docs: https://docs.api.nvidia.com/nim/reference/black-forest-labs-flux_1-dev-infer
 */
export const NvidiaNimProvider: Provider = {
  name: "nvidia-nim",

  supportsModel(modelId: string): boolean {
    return modelId.startsWith("nim-");
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.nvidia);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.nvidia) {
      if (CONFIG.dryRun) return dryRun(modelId, req);
      throw new ProviderError(
        "nvidia-nim",
        modelId,
        "NVIDIA_API_KEY not set; sign up at https://build.nvidia.com (free, no card, key prefixed nvapi-)"
      );
    }

    const route = ROUTES[modelId];
    if (!route) {
      throw new ProviderError(
        "nvidia-nim",
        modelId,
        `unknown nim model id; supported: ${Object.keys(ROUTES).join(", ")}`
      );
    }

    const body = route.buildBody(req);
    const url = `https://ai.api.nvidia.com/v1/genai/${route.path}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.nvidia}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("nvidia-nim", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as NimResponse;
    const b64 = pickBase64(json);
    if (!b64) {
      throw new ProviderError(
        "nvidia-nim",
        modelId,
        `no image data in response: ${JSON.stringify(json).slice(0, 300)}`
      );
    }

    const image = Buffer.from(b64, "base64");
    return {
      image,
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: false,
      native_svg: false
    };
  }
};

/* ----------------------------- routes ----------------------------- */

interface NimRoute {
  /** Path after `/v1/genai/`. e.g. `black-forest-labs/flux.1-dev`. */
  path: string;
  buildBody(req: GenerateRequest): Record<string, unknown>;
}

// Flux.1-dev / Flux.1-kontext-dev only accept these enum sizes per the
// docs.api.nvidia.com schema. Snap to the closest one to avoid 422s.
const FLUX_VALID_SIZES = [
  768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280, 1344, 1408, 1472, 1536, 1568
];

function snapToValid(n: number, valid: number[]): number {
  let best = valid[0]!;
  let bestDelta = Math.abs(best - n);
  for (const v of valid) {
    const d = Math.abs(v - n);
    if (d < bestDelta) {
      best = v;
      bestDelta = d;
    }
  }
  return best;
}

function buildFluxBody(req: GenerateRequest, defaultSteps = 50): Record<string, unknown> {
  return {
    prompt: req.prompt.slice(0, 10000),
    width: snapToValid(req.width, FLUX_VALID_SIZES),
    height: snapToValid(req.height, FLUX_VALID_SIZES),
    cfg_scale: 5,
    mode: "base",
    samples: 1,
    seed: Math.max(0, req.seed | 0),
    steps: defaultSteps
  };
}

function buildSdxlBody(req: GenerateRequest): Record<string, unknown> {
  // SDXL turbo: smaller step counts, broader size acceptance. Keep cfg low.
  const body: Record<string, unknown> = {
    text_prompts: [{ text: req.prompt, weight: 1 }],
    width: clamp(req.width, 512, 1024),
    height: clamp(req.height, 512, 1024),
    cfg_scale: 1,
    sampler: "K_EULER_ANCESTRAL",
    samples: 1,
    seed: Math.max(0, req.seed | 0),
    steps: 4
  };
  if (req.negative_prompt) {
    (body["text_prompts"] as Array<{ text: string; weight: number }>).push({
      text: req.negative_prompt,
      weight: -1
    });
  }
  return body;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const ROUTES: Record<string, NimRoute> = {
  // Flux family — primary recommended models on NIM.
  "nim-flux-1-dev": {
    path: "black-forest-labs/flux.1-dev",
    buildBody: (req) => buildFluxBody(req, 50)
  },
  "nim-flux-1-schnell": {
    path: "black-forest-labs/flux.1-schnell",
    buildBody: (req) => buildFluxBody(req, 4)
  },
  "nim-flux-1-kontext-dev": {
    path: "black-forest-labs/flux.1-kontext-dev",
    buildBody: (req) => buildFluxBody(req, 30)
  },
  "nim-flux-2-klein": {
    path: "black-forest-labs/flux.2-klein-4b",
    buildBody: (req) => buildFluxBody(req, 30)
  },

  // Stability
  "nim-sdxl-turbo": {
    path: "stabilityai/sdxl-turbo",
    buildBody: buildSdxlBody
  },
  "nim-sd3.5-large": {
    path: "stabilityai/stable-diffusion-3-5-large",
    buildBody: (req) => ({
      prompt: req.prompt,
      width: clamp(req.width, 512, 1536),
      height: clamp(req.height, 512, 1536),
      cfg_scale: 4.5,
      seed: Math.max(0, req.seed | 0),
      steps: 28
    })
  },

  // NVIDIA's own SANA — tiny model, fast, up to 4K.
  "nim-sana": {
    path: "nvidia/sana",
    buildBody: (req) => ({
      prompt: req.prompt,
      width: clamp(req.width, 512, 4096),
      height: clamp(req.height, 512, 4096),
      cfg_scale: 4,
      seed: Math.max(0, req.seed | 0),
      steps: 20
    })
  }
};

/* --------------------------- response shape --------------------------- */

interface NimArtifact {
  base64?: string;
  finishReason?: string;
  seed?: number;
}

interface NimResponse {
  artifacts?: NimArtifact[];
  // Some NIM models return the OpenAI-compatible shape instead.
  data?: Array<{ b64_json?: string; url?: string }>;
  image?: string;
}

function pickBase64(json: NimResponse): string | null {
  const fromArtifacts = json.artifacts?.[0]?.base64;
  if (fromArtifacts) return fromArtifacts;
  const fromOpenAi = json.data?.[0]?.b64_json;
  if (fromOpenAi) return fromOpenAi;
  // `image` field as a data URI fallback.
  if (typeof json.image === "string") {
    const m = json.image.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (m && m[1]) return m[1];
    return json.image;
  }
  return null;
}

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
