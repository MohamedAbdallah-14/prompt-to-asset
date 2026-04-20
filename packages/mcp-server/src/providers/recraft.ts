import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Recraft provider — V2, V3, V4.
 * The only production model family with NATIVE SVG output.
 * See: https://www.recraft.ai/docs/api
 */
export const RecraftProvider: Provider = {
  name: "recraft",

  supportsModel(modelId: string): boolean {
    return ["recraft-v2", "recraft-v3", "recraft-v4"].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.recraft);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.recraft) {
      if (CONFIG.dryRun) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${req.width} ${req.height}"><rect width="100%" height="100%" fill="transparent"/></svg>`;
        return {
          image:
            req.output_format === "svg"
              ? Buffer.from(svg, "utf-8")
              : dummyPng(req.width, req.height),
          format: req.output_format === "svg" ? "svg" : "png",
          model: modelId,
          seed: req.seed,
          native_rgba: true,
          native_svg: req.output_format === "svg",
          raw_response: { dry_run: true, prompt: req.prompt }
        };
      }
      throw new ProviderError("recraft", modelId, "RECRAFT_API_KEY not set");
    }

    const body: Record<string, unknown> = {
      prompt: req.prompt,
      model: recraftModelCode(modelId),
      size: `${req.width}x${req.height}`,
      n: 1,
      response_format: "b64_json"
    };
    if (req.output_format === "svg") {
      body["substyle"] = "vector_illustration";
      body["style"] = "vector_illustration";
    }
    if (req.style_id) body["style_id"] = req.style_id;
    if (req.palette && req.palette.length > 0) {
      body["controls"] = { colors: req.palette.map((hex) => ({ rgb: hexToRgb(hex) })) };
    }

    const resp = await fetch("https://external.api.recraft.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.apiKeys.recraft}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("recraft", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const first = json.data?.[0];
    let image: Buffer;
    if (first?.b64_json) {
      image = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const r = await fetch(first.url);
      image = Buffer.from(await r.arrayBuffer());
    } else {
      throw new ProviderError("recraft", modelId, "no image in response");
    }

    const isSvg =
      req.output_format === "svg" ||
      image.subarray(0, 5).toString("utf-8").trim().startsWith("<?xml") ||
      image.subarray(0, 5).toString("utf-8").trim().startsWith("<svg");

    return {
      image,
      format: isSvg ? "svg" : "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: true,
      native_svg: isSvg
    };
  }
};

function recraftModelCode(id: string): string {
  if (id === "recraft-v4") return "recraftv4";
  if (id === "recraft-v3") return "recraftv3";
  return "recraftv2";
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}
