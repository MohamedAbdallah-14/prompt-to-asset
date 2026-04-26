import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";

/**
 * OpenAI provider — gpt-image-2, gpt-image-1.5, gpt-image-1, gpt-image-1-mini, dall-e-3.
 * Uses fetch; no OpenAI SDK dependency (keeps install footprint tiny).
 *
 * API reference: https://platform.openai.com/docs/api-reference/images
 * Key fact: `background: "transparent"` returns true RGBA PNG on gpt-image-1
 * and gpt-image-1.5. **gpt-image-2 dropped this param** — verified via the
 * OpenAI Community thread + Replicate's gpt-image-2 docs. Sending it 400s.
 * Route transparent requests to gpt-image-1.5 (or gpt-image-1).
 * gpt-image-2 (released 2026-04-21) supports native sizes up to 4096x4096 plus
 * the existing 1024² / 1024×1536 / 1536×1024 set.
 */
export const OpenAIProvider: Provider = {
  name: "openai",

  supportsModel(modelId: string): boolean {
    return ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", "dall-e-3"].includes(
      modelId
    );
  },

  isAvailable(): boolean {
    return Boolean(CONFIG.apiKeys.openai);
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (!CONFIG.apiKeys.openai) {
      if (CONFIG.dryRun) return dryRun(modelId, req);
      throw new ProviderError("openai", modelId, "OPENAI_API_KEY not set");
    }

    const body: Record<string, unknown> = {
      model: modelId,
      prompt: req.prompt,
      n: 1,
      size: sizeFor(req.width, req.height, modelId),
      response_format: "b64_json"
    };

    if (modelId.startsWith("gpt-image")) {
      // gpt-image-2 does not accept the `background` param — it 400s.
      // Only gpt-image-1 / gpt-image-1.5 / gpt-image-1-mini support it.
      const supportsTransparentBg = modelId !== "gpt-image-2";
      if (req.transparency && supportsTransparentBg) {
        body["background"] = "transparent";
      }
      body["output_format"] = req.output_format ?? "png";
    }

    const hasReferenceImages = modelId.startsWith("gpt-image") && req.reference_images?.length;
    const resp = hasReferenceImages
      ? await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CONFIG.apiKeys.openai}`
          },
          body: await buildEditForm(body, req.reference_images!)
        })
      : await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CONFIG.apiKeys.openai}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new ProviderError("openai", modelId, `HTTP ${resp.status}: ${errText}`);
    }

    const json = (await resp.json()) as {
      data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
    };
    const first = json.data?.[0];
    if (!first?.b64_json) {
      throw new ProviderError("openai", modelId, "no b64_json in response");
    }

    const image = Buffer.from(first.b64_json, "base64");
    return {
      image,
      format: (body["output_format"] as "png" | "webp") ?? "png",
      model: modelId,
      seed: req.seed,
      raw_response: json,
      ...(first.revised_prompt && { provider_revised_prompt: first.revised_prompt }),
      native_rgba: Boolean(req.transparency) && modelId !== "gpt-image-2",
      native_svg: false
    };
  }
};

function sizeFor(w: number, h: number, modelId: string): string {
  // gpt-image-1 / 1.5 / mini: 1024x1024, 1024x1536, 1536x1024, auto
  // gpt-image-2: flexible sizes up to 3840px edge and 8,294,400 total pixels.
  // dall-e-3: 1024x1024, 1024x1792, 1792x1024
  const aspect = w / h;
  if (modelId === "gpt-image-2") {
    const longest = Math.max(w, h);
    if (longest > 2048) {
      if (aspect > 1.2) return "3840x2160";
      if (aspect < 0.83) return "2160x3840";
      return "2048x2048";
    }
    if (longest > 1536) return "2048x2048";
    if (aspect > 1.2) return "1536x1024";
    if (aspect < 0.83) return "1024x1536";
    return "1024x1024";
  }
  if (modelId.startsWith("gpt-image")) {
    if (aspect > 1.2) return "1536x1024";
    if (aspect < 0.83) return "1024x1536";
    return "1024x1024";
  }
  if (aspect > 1.2) return "1792x1024";
  if (aspect < 0.83) return "1024x1792";
  return "1024x1024";
}

async function buildEditForm(
  body: Record<string, unknown>,
  referenceImages: string[]
): Promise<FormData> {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) form.append(key, String(value));
  }
  for (let i = 0; i < referenceImages.length; i++) {
    const image = await referenceImageToBlob(referenceImages[i]!, i);
    form.append("image[]", image.blob, image.filename);
  }
  return form;
}

async function referenceImageToBlob(
  reference: string,
  index: number
): Promise<{ blob: Blob; filename: string }> {
  if (/^https?:\/\//i.test(reference)) {
    const resp = await fetch(reference);
    if (!resp.ok) {
      throw new ProviderError(
        "openai",
        "reference_image",
        `failed to fetch reference image: HTTP ${resp.status}`
      );
    }
    const contentType = resp.headers.get("content-type") ?? "image/png";
    const arrayBuffer = await resp.arrayBuffer();
    return {
      blob: new Blob([arrayBuffer], { type: contentType }),
      filename: `reference-${index}.${extensionForMime(contentType)}`
    };
  }

  const dataUri = reference.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
  if (dataUri) {
    const contentType = dataUri[1] || "image/png";
    const bytes = dataUri[2]
      ? Buffer.from(dataUri[3]!, "base64")
      : Buffer.from(decodeURIComponent(dataUri[3]!), "utf8");
    return {
      blob: new Blob([bytes], { type: contentType }),
      filename: `reference-${index}.${extensionForMime(contentType)}`
    };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(reference) && reference.length > 64) {
    const bytes = Buffer.from(reference.replace(/\s+/g, ""), "base64");
    return {
      blob: new Blob([bytes], { type: "image/png" }),
      filename: `reference-${index}.png`
    };
  }

  const bytes = await readFile(reference);
  return {
    blob: new Blob([bytes], { type: mimeForPath(reference) }),
    filename: basename(reference)
  };
}

function extensionForMime(mime: string): string {
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  return "png";
}

function mimeForPath(path: string): string {
  if (/\.webp$/i.test(path)) return "image/webp";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  if (/\.gif$/i.test(path)) return "image/gif";
  return "image/png";
}

function dryRun(modelId: string, req: GenerateRequest): GenerateResult {
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

/**
 * Return a 1x1 transparent PNG header — enough to satisfy downstream readers in dry-run mode.
 */
export function dummyPng(_w: number, _h: number): Buffer {
  const b64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return Buffer.from(b64, "base64");
}
