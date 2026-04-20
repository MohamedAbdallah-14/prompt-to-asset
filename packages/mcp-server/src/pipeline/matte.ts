import { loadSharp } from "./sharp.js";
import { CONFIG } from "../config.js";

/**
 * Matte (background removal).
 *
 * Real implementations:
 *   - BiRefNet: hosted via Replicate / HuggingFace Spaces API.
 *   - BRIA RMBG-2.0: hosted API (commercial) or self-hosted ONNX.
 *   - rembg: Python microservice.
 *   - LayerDiffuse: done pre-generation, not post — doesn't belong here.
 *   - "native": already RGBA from the provider; just validate.
 *   - "difference": user supplies two versions (white bg + black bg); we compute alpha.
 *
 * This implementation:
 *   1. If input already has alpha, returns it unchanged ("native" mode).
 *   2. If `PROMPT_TO_BUNDLE_RMBG_URL` env is set → POST there and return the result.
 *   3. Otherwise, simple local fallback: chroma-key the pure white background with
 *      sharp's alpha pipeline. Works for solid-white marks; not production quality
 *      for soft edges (hair, glass). Warn the caller.
 */
export interface MatteInput {
  image: Buffer;
  mode?: "auto" | "birefnet" | "rmbg" | "layerdiffuse" | "difference" | "u2net" | "chroma_white";
  white_bg_image?: Buffer;
  black_bg_image?: Buffer;
}

export interface MatteResult {
  image: Buffer;
  alpha_coverage: number;
  method_used: string;
  warnings: string[];
}

export async function matte(input: MatteInput): Promise<MatteResult> {
  const sharp = await loadSharp();
  if (!sharp) {
    return {
      image: input.image,
      alpha_coverage: 0,
      method_used: "passthrough",
      warnings: ["sharp not installed; matte returned input unchanged"]
    };
  }

  const mode = input.mode ?? "auto";
  const meta = await sharp(input.image).metadata();

  if (mode === "difference" && input.white_bg_image && input.black_bg_image) {
    return differenceMatte(input.white_bg_image, input.black_bg_image, sharp);
  }

  if (meta.hasAlpha && mode === "auto") {
    return {
      image: input.image,
      alpha_coverage: await approxAlphaCoverage(input.image, sharp),
      method_used: "native",
      warnings: []
    };
  }

  // Remote RMBG service
  const rmbgUrl = process.env["PROMPT_TO_BUNDLE_RMBG_URL"];
  if (rmbgUrl && (mode === "auto" || mode === "rmbg" || mode === "birefnet")) {
    try {
      const resp = await fetch(rmbgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: input.image as unknown as ArrayBuffer
      });
      if (resp.ok) {
        const out = Buffer.from(await resp.arrayBuffer());
        return {
          image: out,
          alpha_coverage: await approxAlphaCoverage(out, sharp),
          method_used: mode === "auto" ? "rmbg_remote" : mode,
          warnings: []
        };
      }
    } catch (_err) {
      // fall through to local chroma key
    }
  }

  // Local fallback: white-pixel chroma key. Not great for soft edges.
  const result = await chromaKeyWhite(input.image, sharp);
  return {
    image: result,
    alpha_coverage: await approxAlphaCoverage(result, sharp),
    method_used: "chroma_white_local",
    warnings: CONFIG.dryRun
      ? []
      : [
          "used local white-pixel chroma key (no PROMPT_TO_BUNDLE_RMBG_URL set). Soft edges (hair, glow, anti-aliasing) will be lossy. Configure a BiRefNet or BRIA RMBG-2.0 endpoint for production quality."
        ]
  };
}

async function differenceMatte(
  white: Buffer,
  black: Buffer,
  sharp: typeof import("sharp")
): Promise<MatteResult> {
  // Porter-Duff difference-matting: alpha = 1 - (white_luma - black_luma) / 255
  // Reference: research 13b, 13e.
  const [wMeta, bMeta] = await Promise.all([sharp(white).metadata(), sharp(black).metadata()]);
  const w = wMeta.width ?? 0;
  const h = wMeta.height ?? 0;
  if (w !== bMeta.width || h !== bMeta.height) {
    throw new Error("difference matte: white and black inputs must have identical dimensions");
  }
  const [wRaw, bRaw] = await Promise.all([
    sharp(white).removeAlpha().raw().toBuffer(),
    sharp(black).removeAlpha().raw().toBuffer()
  ]);

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const wi = i * 3;
    const ri = i * 4;
    const rW = wRaw[wi] ?? 255;
    const gW = wRaw[wi + 1] ?? 255;
    const bW = wRaw[wi + 2] ?? 255;
    const rB = bRaw[wi] ?? 0;
    const gB = bRaw[wi + 1] ?? 0;
    const bB = bRaw[wi + 2] ?? 0;
    // alpha from luminance difference
    const wLum = 0.2126 * rW + 0.7152 * gW + 0.0722 * bW;
    const bLum = 0.2126 * rB + 0.7152 * gB + 0.0722 * bB;
    const alpha = Math.max(0, Math.min(255, 255 - Math.round(wLum - bLum)));
    // color taken from black-background version (best estimate of subject color)
    rgba[ri] = rB;
    rgba[ri + 1] = gB;
    rgba[ri + 2] = bB;
    rgba[ri + 3] = alpha;
  }

  const out = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
  return {
    image: out,
    alpha_coverage: approxCoverageFromRaw(rgba),
    method_used: "difference",
    warnings: []
  };
}

async function chromaKeyWhite(buf: Buffer, sharp: typeof import("sharp")): Promise<Buffer> {
  // Treat pixels near pure white (#FFFFFF) as transparent.
  // Soft threshold: alpha = clamp((255 - white_distance) / 255)
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const raw = await sharp(buf).removeAlpha().raw().toBuffer();

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const ri3 = i * 3;
    const ri4 = i * 4;
    const r = raw[ri3] ?? 0;
    const g = raw[ri3 + 1] ?? 0;
    const b = raw[ri3 + 2] ?? 0;
    const minChan = Math.min(r, g, b);
    // Distance from white in R/G/B — pure white = 0 distance = transparent
    const whiteDist = 255 - minChan;
    // Narrow band: if all channels >=245, mostly transparent; <=200, fully opaque.
    let alpha = 255;
    if (whiteDist < 10) alpha = 0;
    else if (whiteDist < 55) alpha = Math.round((whiteDist - 10) * (255 / 45));
    rgba[ri4] = r;
    rgba[ri4 + 1] = g;
    rgba[ri4 + 2] = b;
    rgba[ri4 + 3] = alpha;
  }

  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}

async function approxAlphaCoverage(buf: Buffer, sharp: typeof import("sharp")): Promise<number> {
  const meta = await sharp(buf).metadata();
  if (!meta.hasAlpha) return 1;
  const raw = await sharp(buf).ensureAlpha().raw().toBuffer();
  return approxCoverageFromRaw(raw);
}

function approxCoverageFromRaw(rgba: Buffer): number {
  let opaque = 0;
  const n = rgba.length / 4;
  for (let i = 0; i < n; i++) {
    if ((rgba[i * 4 + 3] ?? 0) > 128) opaque++;
  }
  return n === 0 ? 0 : opaque / n;
}
