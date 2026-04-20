import { CONFIG } from "../config.js";
import { redact } from "../security/redact.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Google provider — Imagen 3/4 + Gemini 2.5/3 Flash Image.
 * See: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * WARNING: neither Imagen nor Gemini produces real RGBA; the router should not
 * send transparency-required requests here. If asked, we still generate on white
 * and let the pipeline matte post-hoc.
 */
export const GoogleProvider: Provider = {
  name: "google",

  supportsModel(modelId: string): boolean {
    return [
      "imagen-3",
      "imagen-4",
      "gemini-3-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image-preview",
      "gemini-3-pro-image"
    ].includes(modelId);
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.google);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.google) {
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
      throw new ProviderError("google", modelId, "GOOGLE_API_KEY / GEMINI_API_KEY not set");
    }

    const modelPath = geminiModelPath(modelId);
    // Auth via `x-goog-api-key` header, NOT the `?key=` query string.
    // Query-string keys leak into error bodies, proxy logs, browser history,
    // and anywhere a URL gets echoed back (including prior provider code that
    // would concatenate the URL into a thrown error message).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent`;

    const body = {
      contents: [{ parts: [{ text: req.prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: aspectRatioOf(req.width, req.height) }
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": CONFIG.apiKeys.google
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // Redact defensively in case Google echoes back anything key-shaped
      // (older deployments that still accept ?key= would echo the URL).
      throw new ProviderError(
        "google",
        modelId,
        `HTTP ${resp.status}: ${redact(errText).slice(0, 500)}`
      );
    }

    const json = (await resp.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) {
      throw new ProviderError("google", modelId, "no inline image data in response");
    }

    return {
      image: Buffer.from(part.inlineData.data, "base64"),
      format: "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      native_rgba: false,
      native_svg: false
    };
  }
};

function geminiModelPath(id: string): string {
  // Gemini 3 Flash Image (Nano Banana 2) — current canonical preview ID.
  // "gemini-3-flash-image" is the legacy label we kept in the registry; map it
  // forward so callers don't break as Google rotates preview tags.
  if (id === "gemini-3-flash-image" || id === "gemini-3.1-flash-image-preview")
    return "gemini-3.1-flash-image-preview";
  // Gemini 3 Pro Image (Nano Banana Pro) — higher-quality preview.
  if (id === "gemini-3-pro-image" || id === "gemini-3-pro-image-preview")
    return "gemini-3-pro-image-preview";
  if (id === "imagen-3") return "imagen-3.0-generate-002";
  if (id === "imagen-4") return "imagen-4.0-generate-001";
  return id;
}

function aspectRatioOf(w: number, h: number): string {
  const a = w / h;
  if (Math.abs(a - 1) < 0.1) return "1:1";
  if (Math.abs(a - 1.91) < 0.2) return "16:9";
  if (Math.abs(a - 1.33) < 0.15) return "4:3";
  if (Math.abs(a - 0.75) < 0.15) return "3:4";
  return "1:1";
}
