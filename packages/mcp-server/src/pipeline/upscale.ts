import { loadSharp } from "./sharp.js";
import type { AssetType } from "../types.js";

/**
 * Upscale / refine — asset-type-aware.
 *
 * Routing (from SYNTHESIS.md § Recommendation 19):
 *   - Flat logo/icon/favicon    → DAT2 (4x-UltraSharpV2 / 4x-IllustrationJaNai-DAT2)
 *   - Photoreal hero            → SUPIR (A100-class) or Real-ESRGAN
 *   - Diffusion polish          → Flux img2img 0.12-0.20 denoise
 *   - Typography/text-in-image  → DAT2 fine-tunes only; NEVER diffusion (hallucinates letters)
 *
 * Local fallback: sharp Lanczos resize. Good for logo-like flat content, acceptable for modest upscales.
 */
export interface UpscaleInput {
  image: Buffer;
  asset_type?: AssetType;
  target_size: number; // longest side in pixels
  mode?: "auto" | "dat2" | "real-esrgan" | "supir" | "img2img" | "lanczos";
}

export interface UpscaleResult {
  image: Buffer;
  method_used: string;
  target_size: number;
  warnings: string[];
}

export async function upscale(input: UpscaleInput): Promise<UpscaleResult> {
  const sharp = await loadSharp();
  if (!sharp) {
    return {
      image: input.image,
      method_used: "passthrough",
      target_size: input.target_size,
      warnings: ["sharp not installed; upscale returned input unchanged"]
    };
  }

  const mode = input.mode ?? "auto";

  // Remote upscaler hook
  const upscalerUrl = process.env["PROMPT_TO_BUNDLE_UPSCALER_URL"];
  if (upscalerUrl && mode !== "lanczos") {
    try {
      const resp = await fetch(upscalerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_b64: input.image.toString("base64"),
          target_size: input.target_size,
          mode: resolveMode(mode, input.asset_type)
        })
      });
      if (resp.ok) {
        const json = (await resp.json()) as { image_b64?: string; method?: string };
        if (json.image_b64) {
          return {
            image: Buffer.from(json.image_b64, "base64"),
            method_used: json.method ?? "remote",
            target_size: input.target_size,
            warnings: []
          };
        }
      }
    } catch {
      /* fall through to local */
    }
  }

  // Local Lanczos fallback — fine for logos and vector-like content up to 4x;
  // for photoreal upscales beyond 2x, a neural upscaler is required for production quality.
  const meta = await sharp(input.image).metadata();
  const w = meta.width ?? input.target_size;
  const h = meta.height ?? input.target_size;
  const longest = Math.max(w, h);
  if (longest >= input.target_size) {
    return {
      image: input.image,
      method_used: "no-op (already at or above target size)",
      target_size: input.target_size,
      warnings: []
    };
  }

  const scale = input.target_size / longest;
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);
  const resized = await sharp(input.image)
    .resize(newW, newH, { kernel: "lanczos3", fit: "inside" })
    .toBuffer();

  return {
    image: resized,
    method_used: "lanczos3",
    target_size: input.target_size,
    warnings:
      mode !== "lanczos" && mode !== "auto"
        ? [
            `requested mode "${mode}" unavailable locally; used Lanczos fallback. Configure PROMPT_TO_BUNDLE_UPSCALER_URL for DAT2/ESRGAN/SUPIR.`
          ]
        : []
  };
}

function resolveMode(mode: string, assetType?: AssetType): string {
  if (mode !== "auto") return mode;
  switch (assetType) {
    case "logo":
    case "favicon":
    case "app_icon":
    case "icon_pack":
    case "transparent_mark":
    case "sticker":
      return "dat2"; // flat assets
    case "illustration":
      return "dat2";
    case "hero":
      return "supir"; // photoreal hero
    case "og_image":
      return "lanczos"; // template-rendered, lossless
    default:
      return "real-esrgan";
  }
}
