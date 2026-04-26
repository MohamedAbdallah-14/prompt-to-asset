// Execution modes for asset generators.
//
// This module encodes the research conclusion that prompt-to-asset is
// useless without a delivery channel for the actual pixels. There are three
// such channels, each suited to a different user situation:
//
//   1. inline_svg — Claude (the LLM hosting this MCP client) writes the SVG
//      directly as code in its response. Zero keys. Works only for simple,
//      geometric marks; see svg-briefs.ts for the contract.
//      Research basis: docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md
//      (path (b): "LLM-author SVG for simple geometry").
//
//   2. external_prompt_only — The server returns a dialect-correct prompt and
//      a list of human-facing UIs the user can paste it into (Ideogram web,
//      Nano Banana in Google AI Studio, Recraft, Midjourney, fal.ai, etc.).
//      The user generates elsewhere and calls asset_ingest_external with
//      the resulting file to re-enter the matte/vectorize/validate pipeline.
//      Research basis: docs/research/07-midjourney-ideogram-recraft/ (every
//      angle notes the web UI as the primary surface for these providers).
//
//   3. api — The existing server-driven pipeline. Requires a provider API
//      key. Routes → generates → mattes → vectorizes → validates → writes
//      a content-addressed bundle. Authoritative output.
//      Research basis: docs/research/19-agentic-mcp-skills-architectures/.

import type { AssetType } from "./types.js";

export const MODES = ["inline_svg", "external_prompt_only", "api"] as const;
export type Mode = (typeof MODES)[number];

/**
 * Which modes are valid for which asset type. Derived from research + the
 * routing table. Keep in lockstep with docs/RESEARCH_MAP.md.
 */
export const MODES_BY_ASSET_TYPE: Record<AssetType, Mode[]> = {
  // Flat, geometric marks — LLM-author-SVG is viable (path budget ≤40).
  logo: ["inline_svg", "external_prompt_only", "api"],
  favicon: ["inline_svg", "external_prompt_only", "api"],
  icon_pack: ["inline_svg", "external_prompt_only", "api"],
  sticker: ["inline_svg", "external_prompt_only", "api"],
  transparent_mark: ["inline_svg", "external_prompt_only", "api"],

  // App icon master is simple-geometric enough for inline SVG; the fan-out
  // (AppIconSet, Android adaptive, PWA maskable) still needs sharp/resvg
  // — so inline_svg here returns the mark-only SVG and documents that the
  // packaging step requires api mode for a full set.
  app_icon: ["inline_svg", "external_prompt_only", "api"],

  // OG cards are Satori-templated typography, not diffusion. api mode here
  // means "render the template server-side"; external_prompt_only is a
  // degraded mode that returns the template JSON for a user to render
  // elsewhere. inline_svg is impractical (web-font loading, text layout).
  og_image: ["external_prompt_only", "api"],

  // Illustrations, hero art, splash screens — complex pixel content.
  // inline SVG can't reach the detail budget. External or API only.
  illustration: ["external_prompt_only", "api"],
  hero: ["external_prompt_only", "api"],
  splash_screen: ["external_prompt_only", "api"]
};

/**
 * Provider API-key availability, detected from process.env.
 * One flag per provider family; asset generators pick the one(s) they need.
 */
export interface ApiAvailability {
  openai: boolean;
  google: boolean;
  ideogram: boolean;
  recraft: boolean;
  flux: boolean;
  stability: boolean;
  leonardo: boolean;
  fal: boolean;
  /** Freepik — Mystic, Flux 2 Pro, AI Icon (SVG), editing surface. 5 EUR free trial. */
  freepik: boolean;
  /** Pixazo — Azure APIM gateway. Free tier is real but transfers IP ownership to Appy Pie LLP. */
  pixazo: boolean;
  /** NVIDIA NIM — 1,000 requests/month free, no card. Hosts Flux.1-dev, Flux.2-klein, SANA, SDXL. */
  nvidia: boolean;
  huggingface: boolean;
  /** Pollinations is zero-key; true unless explicitly disabled. */
  pollinations: boolean;
  /** Stable Horde is anonymous-queue; true unless explicitly disabled. */
  horde: boolean;
  /** Cloudflare Workers AI — free 10k neurons/day; needs token + account id. */
  cloudflare: boolean;
  /** Replicate — universal catalog; signup credit then paid. */
  replicate: boolean;
  /** User-owned ComfyUI endpoint (Modal / self-host) for Phase-4 brand LoRA. */
  comfyui: boolean;
}

export function detectApiAvailability(): ApiAvailability {
  return {
    openai: Boolean(process.env["OPENAI_API_KEY"]),
    google: Boolean(process.env["GOOGLE_API_KEY"] || process.env["GEMINI_API_KEY"]),
    ideogram: Boolean(process.env["IDEOGRAM_API_KEY"]),
    recraft: Boolean(process.env["RECRAFT_API_KEY"]),
    flux: Boolean(process.env["BFL_API_KEY"] || process.env["TOGETHER_API_KEY"]),
    stability: Boolean(process.env["STABILITY_API_KEY"]),
    leonardo: Boolean(process.env["LEONARDO_API_KEY"]),
    fal: Boolean(process.env["FAL_API_KEY"] || process.env["FAL_KEY"]),
    freepik: Boolean(process.env["FREEPIK_API_KEY"]),
    pixazo: Boolean(process.env["PIXAZO_API_KEY"] || process.env["PIXAZO_SUBSCRIPTION_KEY"]),
    nvidia: Boolean(process.env["NVIDIA_API_KEY"] || process.env["NIM_API_KEY"]),
    huggingface: Boolean(process.env["HF_TOKEN"] || process.env["HUGGINGFACE_API_KEY"]),
    pollinations: process.env["POLLINATIONS_DISABLED"] !== "1",
    horde: process.env["HORDE_DISABLED"] !== "1",
    cloudflare: Boolean(
      process.env["CLOUDFLARE_API_TOKEN"] && process.env["CLOUDFLARE_ACCOUNT_ID"]
    ),
    replicate: Boolean(process.env["REPLICATE_API_TOKEN"] || process.env["REPLICATE_API_KEY"]),
    comfyui: Boolean(process.env["PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"])
  };
}

/**
 * Map a model id (from data/model-registry.json) to the provider-key flag
 * that enables it. Used to pre-flight api-mode calls and to decide whether
 * "api" should appear in modes_available for a given routing decision.
 *
 * Returns null for paste-only providers (midjourney / adobe / krea) and any
 * strategy id — those families never report api-mode availability.
 */
export function providerKeyForModel(modelId: string): keyof ApiAvailability | null {
  if (modelId.startsWith("gpt-image") || modelId.startsWith("dall-e")) return "openai";
  if (modelId.startsWith("imagen") || modelId.startsWith("gemini")) return "google";
  if (modelId.startsWith("ideogram")) return "ideogram";
  if (modelId.startsWith("recraft")) return "recraft";
  if (modelId.startsWith("flux")) return "flux";
  if (modelId.startsWith("sd") || modelId.startsWith("playground")) return "stability";
  if (modelId.startsWith("leonardo")) return "leonardo";
  if (modelId.startsWith("fal-")) return "fal";
  if (modelId.startsWith("freepik-")) return "freepik";
  if (modelId.startsWith("pixazo-")) return "pixazo";
  if (modelId.startsWith("nim-")) return "nvidia";
  if (modelId.startsWith("hf-")) return "huggingface";
  if (modelId.startsWith("pollinations-")) return "pollinations";
  if (modelId.startsWith("horde-")) return "horde";
  if (modelId.startsWith("cf-")) return "cloudflare";
  if (modelId.startsWith("replicate-")) return "replicate";
  if (modelId.startsWith("comfyui-")) return "comfyui";
  // midjourney, firefly-*, krea-* and strategy ids resolve to null on purpose —
  // there is no first-class API for them. external_prompt_only is the path.
  return null;
}

export function isApiAvailableFor(modelId: string, avail: ApiAvailability): boolean {
  const key = providerKeyForModel(modelId);
  if (key === null) return false;
  return avail[key];
}

/**
 * True if AT LEAST ONE model in the chain (primary + fallback) has an
 * available provider key. This is the condition for "api" to appear in
 * modes_available; if false, api is reported as unavailable and the user
 * gets a hint about which env var to set.
 */
export function anyApiAvailable(
  primary: string,
  fallback: string[],
  avail: ApiAvailability
): boolean {
  if (isApiAvailableFor(primary, avail)) return true;
  return fallback.some((m) => isApiAvailableFor(m, avail));
}

/**
 * Given the asset type, the routing decision, and the current env, return
 * the concrete set of modes the caller can actually use RIGHT NOW. Used
 * by asset_enhance_prompt and asset_capabilities so Claude knows what to
 * offer the user.
 */
export function availableModes(
  assetType: AssetType,
  primary: string,
  fallback: string[],
  avail: ApiAvailability
): Mode[] {
  const eligible = MODES_BY_ASSET_TYPE[assetType];
  return eligible.filter((mode) => {
    if (mode === "api") return anyApiAvailable(primary, fallback, avail);
    return true;
  });
}

export interface SelectContext {
  asset_type: AssetType;
  primary_model: string;
  fallback_models: string[];
  availability: ApiAvailability;
}

/**
 * Auto-selector. When the caller does not specify a mode, pick one.
 * Preference order encodes the "zero friction wins" principle:
 *   1. inline_svg (zero network, zero key)
 *   2. api (server-driven pipeline with validation)
 *   3. external_prompt_only (manual paste)
 * If the caller specifies a mode, it is validated and returned.
 * Throws if the request is incompatible with the asset type or env.
 */
export function selectMode(
  requested: Mode | "auto" | undefined,
  ctx: SelectContext
): { mode: Mode; reason: string } {
  const avail = availableModes(
    ctx.asset_type,
    ctx.primary_model,
    ctx.fallback_models,
    ctx.availability
  );

  if (requested && requested !== "auto") {
    if (!MODES_BY_ASSET_TYPE[ctx.asset_type].includes(requested)) {
      throw new Error(
        `mode=${requested} is not valid for asset_type=${ctx.asset_type}. ` +
          `Valid modes: ${MODES_BY_ASSET_TYPE[ctx.asset_type].join(", ")}.`
      );
    }
    if (requested === "api" && !avail.includes("api")) {
      throw new Error(
        `mode=api requested but no provider API key is configured for the routed models ` +
          `(primary=${ctx.primary_model}, fallback=${ctx.fallback_models.join(",") || "—"}). ` +
          `Set the free or paid key for one routed provider (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, ` +
          `NVIDIA_API_KEY, HF_TOKEN, OPENAI_API_KEY, IDEOGRAM_API_KEY, RECRAFT_API_KEY, BFL_API_KEY, ` +
          `GEMINI_API_KEY, STABILITY_API_KEY, LEONARDO_API_KEY, FAL_API_KEY, FREEPIK_API_KEY, ` +
          `PIXAZO_API_KEY, or REPLICATE_API_TOKEN), or pick inline_svg / external_prompt_only.`
      );
    }
    return { mode: requested, reason: `user requested ${requested}` };
  }

  if (avail.includes("inline_svg")) {
    return {
      mode: "inline_svg",
      reason: "auto: inline_svg is zero-key and eligible for this asset type"
    };
  }
  if (avail.includes("api")) {
    return {
      mode: "api",
      reason: `auto: inline_svg not eligible, api available (provider key detected)`
    };
  }
  return {
    mode: "external_prompt_only",
    reason: "auto: no provider key set and inline_svg not eligible; degraded to paste-it-yourself"
  };
}
