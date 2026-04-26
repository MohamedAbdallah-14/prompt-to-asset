import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Freepik provider — Mystic, Flux 2 Pro, Flux Kontext Pro, AI Icon Generator
 * (PNG or SVG), and the AI editing surface (relight, style-transfer, expand,
 * upscaler-creative, remove-background).
 *
 * Auth: `x-freepik-api-key` header.
 * Pattern: nearly every endpoint is async — POST returns `{ data: { task_id } }`,
 * caller polls `GET <endpoint>/{task_id}` until status is COMPLETED or FAILED.
 *
 * Free trial: 5 EUR cap, no credit card. Daily per-model creation limits apply
 * (see dashboard). Treated as a paid provider for routing — the trial is too
 * small to support sustained use.
 *
 * Notable capability: `text-to-icon` is the only Freepik path that returns
 * native SVG, joining Recraft V4 + LLM-author inline_svg as the third real
 * vector route in the registry.
 *
 * Docs: https://docs.freepik.com/api-reference
 */
export const FreepikProvider: Provider = {
  name: "freepik",

  supportsModel(modelId: string): boolean {
    return modelId.startsWith("freepik-");
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.freepik);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.freepik) {
      if (CONFIG.dryRun) return dryRun(modelId, req);
      throw new ProviderError("freepik", modelId, "FREEPIK_API_KEY not set");
    }

    const route = ROUTES[modelId];
    if (!route) {
      throw new ProviderError(
        "freepik",
        modelId,
        `unknown freepik model id; supported: ${Object.keys(ROUTES).join(", ")}`
      );
    }

    const body = route.buildBody(req);
    const submitUrl = `https://api.freepik.com${route.path}`;
    const submitResp = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "x-freepik-api-key": CONFIG.apiKeys.freepik,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!submitResp.ok) {
      const errText = await submitResp.text();
      throw new ProviderError("freepik", modelId, `submit HTTP ${submitResp.status}: ${errText}`);
    }

    const submitJson = (await submitResp.json()) as FreepikTaskResponse;
    const taskId = submitJson.data?.task_id;
    if (!taskId) {
      throw new ProviderError("freepik", modelId, "no task_id in submit response");
    }

    // Most endpoints are async even when the work is fast. Poll until done.
    const finalJson = await pollTask(modelId, route.path, taskId);
    const imageUrl = pickImageUrl(finalJson);
    if (!imageUrl) {
      throw new ProviderError(
        "freepik",
        modelId,
        `task ${taskId} completed but no image url in response: ${JSON.stringify(finalJson).slice(0, 300)}`
      );
    }

    const fileResp = await fetch(imageUrl);
    if (!fileResp.ok) {
      throw new ProviderError(
        "freepik",
        modelId,
        `download HTTP ${fileResp.status} for ${imageUrl}`
      );
    }
    const image = Buffer.from(await fileResp.arrayBuffer());

    const isSvg = imageUrl.toLowerCase().endsWith(".svg") || sniffSvg(image);
    const format: GenerateResult["format"] = isSvg
      ? "svg"
      : imageUrl.toLowerCase().endsWith(".jpg") || imageUrl.toLowerCase().endsWith(".jpeg")
        ? "jpeg"
        : imageUrl.toLowerCase().endsWith(".webp")
          ? "webp"
          : "png";

    return {
      image,
      format,
      model: modelId,
      seed: req.seed,
      raw_response: finalJson,
      native_rgba: route.native_rgba ?? false,
      native_svg: isSvg
    };
  }
};

/* ----------------------------- routes ----------------------------- */

interface FreepikRoute {
  /** POST submit path (without host). Polling uses `${path}/{task_id}`. */
  path: string;
  /** Whether the endpoint produces RGBA-transparent output. */
  native_rgba?: boolean;
  /** Build the JSON body from the generic GenerateRequest. */
  buildBody(req: GenerateRequest): Record<string, unknown>;
}

const MYSTIC_ASPECTS: Array<[number, string]> = [
  // longest_aspect_ratio (>1 = landscape, <1 = portrait), code
  [16 / 9, "widescreen_16_9"],
  [4 / 3, "classic_4_3"],
  [3 / 2, "standard_3_2"],
  [2 / 1, "horizontal_2_1"],
  [1 / 1, "square_1_1"],
  [3 / 4, "traditional_3_4"],
  [2 / 3, "portrait_2_3"],
  [9 / 16, "social_story_9_16"],
  [1 / 2, "vertical_1_2"]
];

function pickMysticAspect(w: number, h: number): string {
  const target = w / h;
  let best = MYSTIC_ASPECTS[0]!;
  let bestDelta = Math.abs(best[0] - target);
  for (const candidate of MYSTIC_ASPECTS) {
    const delta = Math.abs(candidate[0] - target);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best[1];
}

function pickMysticResolution(w: number, h: number): "1k" | "2k" | "4k" {
  const longest = Math.max(w, h);
  if (longest > 2500) return "4k";
  if (longest > 1200) return "2k";
  return "1k";
}

function buildMysticBody(model: string) {
  return (req: GenerateRequest): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      model,
      resolution: pickMysticResolution(req.width, req.height),
      aspect_ratio: pickMysticAspect(req.width, req.height),
      filter_nsfw: true
    };
    if (req.seed) body["seed"] = req.seed;
    if (req.style_id) body["style_reference"] = req.style_id;
    return body;
  };
}

function buildFluxBody(req: GenerateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: req.prompt,
    aspect_ratio: pickMysticAspect(req.width, req.height)
  };
  if (req.seed) body["seed"] = req.seed;
  if (req.negative_prompt) body["negative_prompt"] = req.negative_prompt;
  return body;
}

function buildIconBody(req: GenerateRequest): Record<string, unknown> {
  // Style is a soft hint; if the caller didn't ask for one, default to "flat"
  // which matches what most app icons / favicons want.
  const style = (req["style"] as string) ?? "flat";
  return {
    prompt: req.prompt,
    style,
    format: req.output_format === "svg" ? "svg" : "png",
    num_inference_steps: 30,
    guidance_scale: 7.5
  };
}

function buildEditBody(extra: Record<string, unknown> = {}) {
  return (req: GenerateRequest): Record<string, unknown> => {
    const source = req.reference_images?.[0];
    if (!source) {
      throw new ProviderError(
        "freepik",
        "(edit)",
        "edit endpoints require reference_images[0] (URL or base64) as source"
      );
    }
    const body: Record<string, unknown> = { image: source, ...extra };
    if (req.prompt) body["prompt"] = req.prompt;
    if (req.seed) body["seed"] = req.seed;
    return body;
  };
}

function buildExpandBody(req: GenerateRequest): Record<string, unknown> {
  // Expand needs explicit per-side pixel deltas. Without explicit input we
  // expand symmetrically by 256px, which is a sane default for outpaint.
  const source = req.reference_images?.[0];
  if (!source) {
    throw new ProviderError(
      "freepik",
      "(expand)",
      "expand endpoints require reference_images[0] (URL or base64) as source"
    );
  }
  const pad = (req["expand_px"] as number) ?? 256;
  const body: Record<string, unknown> = {
    image: source,
    left: pad,
    right: pad,
    top: pad,
    bottom: pad
  };
  if (req.prompt) body["prompt"] = req.prompt;
  if (req.seed) body["seed"] = req.seed;
  return body;
}

const ROUTES: Record<string, FreepikRoute> = {
  // text-to-image
  "freepik-mystic": { path: "/v1/ai/mystic", buildBody: buildMysticBody("realism") },
  "freepik-mystic-realism": { path: "/v1/ai/mystic", buildBody: buildMysticBody("realism") },
  "freepik-mystic-fluid": { path: "/v1/ai/mystic", buildBody: buildMysticBody("fluid") },
  "freepik-mystic-zen": { path: "/v1/ai/mystic", buildBody: buildMysticBody("zen") },
  "freepik-flux-2-pro": {
    path: "/v1/ai/text-to-image/flux-2-pro",
    buildBody: buildFluxBody
  },
  "freepik-flux-kontext-pro": {
    path: "/v1/ai/text-to-image/flux-kontext-pro",
    buildBody: buildFluxBody
  },

  // icon — only Freepik route that returns native SVG
  "freepik-text-to-icon": {
    path: "/v1/ai/text-to-icon",
    native_rgba: true,
    buildBody: buildIconBody
  },

  // editing — all need reference_images[0]
  "freepik-remove-bg": {
    path: "/v1/ai/remove-background",
    native_rgba: true,
    buildBody: buildEditBody()
  },
  "freepik-upscaler-creative": {
    path: "/v1/ai/image-upscaler-creative",
    buildBody: buildEditBody()
  },
  "freepik-image-relight": {
    path: "/v1/ai/image-relight",
    buildBody: buildEditBody()
  },
  "freepik-image-style-transfer": {
    path: "/v1/ai/image-style-transfer",
    buildBody: buildEditBody()
  },
  "freepik-image-expand-flux": {
    path: "/v1/ai/image-expand/flux-pro",
    buildBody: buildExpandBody
  },
  "freepik-image-expand-ideogram": {
    path: "/v1/ai/image-expand/ideogram",
    buildBody: buildExpandBody
  },
  "freepik-image-expand-seedream": {
    path: "/v1/ai/image-expand/seedream-v4-5",
    buildBody: buildExpandBody
  }
};

/* ----------------------------- polling ----------------------------- */

interface FreepikTaskResponse {
  data?: {
    task_id?: string;
    status?: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    generated?: Array<string | { url?: string; image?: string }>;
    result?: { url?: string };
  };
}

async function pollTask(
  modelId: string,
  path: string,
  taskId: string
): Promise<FreepikTaskResponse> {
  const url = `https://api.freepik.com${path}/${taskId}`;
  // Cap at ~3 min. Most jobs finish in under 30s; expand/upscaler can take longer.
  const deadlineMs = Date.now() + 180_000;
  let delay = 1500;

  while (Date.now() < deadlineMs) {
    await sleep(delay);
    const resp = await fetch(url, {
      headers: { "x-freepik-api-key": CONFIG.apiKeys.freepik! }
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new ProviderError("freepik", modelId, `poll HTTP ${resp.status}: ${txt}`);
    }
    const json = (await resp.json()) as FreepikTaskResponse;
    const status = json.data?.status;
    if (status === "COMPLETED") return json;
    if (status === "FAILED") {
      throw new ProviderError(
        "freepik",
        modelId,
        `task ${taskId} FAILED: ${JSON.stringify(json).slice(0, 300)}`
      );
    }
    // Exponential-ish backoff capped at 5s.
    delay = Math.min(delay * 1.4, 5000);
  }

  throw new ProviderError("freepik", modelId, `task ${taskId} timed out after 180s`);
}

function pickImageUrl(json: FreepikTaskResponse): string | null {
  const generated = json.data?.generated;
  if (Array.isArray(generated) && generated.length > 0) {
    const first = generated[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      return first.url ?? first.image ?? null;
    }
  }
  if (json.data?.result?.url) return json.data.result.url;
  return null;
}

function sniffSvg(buf: Buffer): boolean {
  const head = buf.subarray(0, 256).toString("utf-8").trimStart();
  return head.startsWith("<?xml") || head.startsWith("<svg");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dryRun(modelId: string, req: GenerateRequest): GenerateResult {
  const wantsSvg = modelId === "freepik-text-to-icon" && req.output_format === "svg";
  if (wantsSvg) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${req.width} ${req.height}"><rect width="100%" height="100%" fill="transparent"/></svg>`;
    return {
      image: Buffer.from(svg, "utf-8"),
      format: "svg",
      model: modelId,
      seed: req.seed,
      native_rgba: true,
      native_svg: true,
      raw_response: { dry_run: true, prompt: req.prompt }
    };
  }
  return {
    image: dummyPng(req.width, req.height),
    format: "png",
    model: modelId,
    seed: req.seed,
    native_rgba: ROUTES[modelId]?.native_rgba ?? false,
    native_svg: false,
    raw_response: { dry_run: true, prompt: req.prompt }
  };
}
