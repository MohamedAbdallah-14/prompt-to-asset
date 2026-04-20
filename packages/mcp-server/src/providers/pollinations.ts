import { CONFIG } from "../config.js";
import type { Provider, GenerateRequest, GenerateResult } from "./types.js";
import { ProviderError } from "./types.js";
import { dummyPng } from "./openai.js";

/**
 * Pollinations.ai — the zero-key HTTP GET image endpoint.
 *
 * This is the one surface in the ecosystem that works without any signup
 * or token at all. URL-encoded prompt → PNG. Pollinations routes to Flux,
 * Turbo (a fast SD variant), Kontext (edit), or Stable Diffusion upstream.
 *
 * Real-world ceilings:
 *   - Anonymous rate limit: ~1 request / 15 seconds.
 *   - RGB only — no alpha channel from the VAE. We run the matte step
 *     post-generation when transparency is requested, same as Imagen.
 *   - ~1024² typical; Pollinations silently clamps larger requests.
 *   - Text rendering: poor (it's Flux / SD under the hood). Use Ideogram
 *     or gpt-image-1 for wordmarks.
 *
 * We register this provider AFTER the paid direct-API providers, so if
 * the user has an OpenAI / Ideogram / Recraft key, those take precedence.
 * Pollinations is the "at-least-something-works" default for the $0 case.
 *
 * See: https://pollinations.ai and https://image.pollinations.ai/
 */
export const PollinationsProvider: Provider = {
  name: "pollinations",

  supportsModel(modelId: string): boolean {
    return [
      "pollinations-flux",
      "pollinations-turbo",
      "pollinations-kontext",
      "pollinations-sd"
    ].includes(modelId);
  },

  /**
   * Pollinations is always "available" in the sense that it needs no key.
   * However, it's rate-limited, so we treat it as available by default
   * unless the user explicitly opts out via POLLINATIONS_DISABLED=1.
   */
  isAvailable(): boolean {
    return process.env["POLLINATIONS_DISABLED"] !== "1";
  },

  async generate(modelId: string, req: GenerateRequest): Promise<GenerateResult> {
    if (process.env["POLLINATIONS_DISABLED"] === "1") {
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
        "pollinations",
        modelId,
        "Pollinations is disabled via POLLINATIONS_DISABLED=1. Unset that env var or pick a different model."
      );
    }

    const model = pollinationsModelCode(modelId);
    const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(req.prompt)}`);
    url.searchParams.set("model", model);
    url.searchParams.set("width", String(req.width));
    url.searchParams.set("height", String(req.height));
    url.searchParams.set("seed", String(req.seed));
    url.searchParams.set("nologo", "true");
    url.searchParams.set("safe", "true");

    // Pollinations has an optional POLLINATIONS_TOKEN for users who have
    // subscribed and want higher rate limits — pass-through if set.
    const headers: Record<string, string> = { Accept: "image/png" };
    if (process.env["POLLINATIONS_TOKEN"]) {
      headers["Authorization"] = `Bearer ${process.env["POLLINATIONS_TOKEN"]}`;
    }

    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new ProviderError(
        "pollinations",
        modelId,
        `HTTP ${resp.status}: ${errText.slice(0, 200)} — Pollinations is rate-limited to ~1 req / 15 s anonymous; retry later or set POLLINATIONS_TOKEN.`
      );
    }

    const image = Buffer.from(await resp.arrayBuffer());

    // Pollinations ignores the Accept header and returns JPEG regardless of
    // our Accept request. Detect the real format from magic bytes and surface
    // it honestly so downstream code (restoration pre-pass, matte, export)
    // can decide whether to re-encode.
    const detected = detectImageFormat(image);
    return {
      image,
      format: detected,
      model: modelId,
      seed: req.seed,
      raw_response: { url: url.toString(), content_type: resp.headers.get("content-type") },
      // Pollinations is RGB-only — the VAE has no alpha channel. Callers
      // requiring transparency rely on downstream BiRefNet matting.
      native_rgba: false,
      native_svg: false
    };
  }
};

function detectImageFormat(buf: Buffer): "png" | "jpeg" | "webp" {
  if (buf.length < 12) return "png"; // best-effort default
  // PNG:  89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "webp";
  return "png";
}

function pollinationsModelCode(modelId: string): string {
  const map: Record<string, string> = {
    "pollinations-flux": "flux",
    "pollinations-turbo": "turbo",
    "pollinations-kontext": "kontext",
    "pollinations-sd": "stable-diffusion"
  };
  return map[modelId] ?? "flux";
}
