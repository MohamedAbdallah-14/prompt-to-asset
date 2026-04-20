import type { CapabilitiesInputT } from "../schemas.js";
import type { AssetType } from "../types.js";
import {
  MODES_BY_ASSET_TYPE,
  detectApiAvailability,
  providerKeyForModel,
  type ApiAvailability,
  type Mode
} from "../modes.js";
import { MODEL_REGISTRY } from "../config.js";
import { allPasteTargets } from "../paste-targets.js";

/** Provider families that cost money per call — need a paid key. */
const PAID_KEYS: Array<keyof ApiAvailability> = [
  "openai",
  "google",
  "ideogram",
  "recraft",
  "flux",
  "stability",
  "leonardo",
  "fal",
  "replicate"
];

/** Provider families you can use for $0 today (free tier or zero signup). */
const FREE_KEYS: Array<keyof ApiAvailability> = [
  "huggingface",
  "pollinations",
  "horde",
  "cloudflare"
];

/**
 * Tool: asset_capabilities
 *
 * Read-only inventory of what this MCP server can actually do right now.
 * Claude (the hosting LLM) calls this before offering the user options,
 * so the "would you like inline SVG, paste-it-yourself, or server-driven
 * generation?" question is grounded in actual env state.
 *
 * No network calls. Cheap enough to call on every asset request.
 */
export interface CapabilitiesResult {
  inline_svg: { available: true; eligible_asset_types: AssetType[]; notes: string };
  external_prompt_only: {
    available: true;
    eligible_asset_types: AssetType[];
    supported_services: string[];
    notes: string;
  };
  api: {
    available: boolean;
    providers: ApiAvailability;
    unconfigured_env_vars: string[];
    notes: string;
  };
  /**
   * Zero-key and free-tier routes the user can run without paying anything.
   * `api.available` becomes true whenever at least one of these works too —
   * but this block is surfaced separately so users know what's free vs. paid.
   */
  free_api: {
    available: boolean;
    routes: Array<{
      id: string;
      how: string;
      quality: string;
      catch: string;
      url?: string;
    }>;
    notes: string;
  };
  modes_by_asset_type: Record<AssetType, Mode[]>;
  providers_registered: Array<{
    id: string;
    family: string;
    provider_key_env: string | null;
    key_set: boolean;
    native_rgba: boolean | "partial";
    native_svg: boolean;
    paste_only: boolean;
    free_tier: boolean;
  }>;
  hints: string[];
}

export async function capabilities(input: CapabilitiesInputT): Promise<CapabilitiesResult> {
  const api = detectApiAvailability();
  const pasteTargets = allPasteTargets();

  const providers = MODEL_REGISTRY.models.map((m) => {
    const pkey = providerKeyForModel(m.id);
    return {
      id: m.id,
      family: m.family,
      provider_key_env: pkey ? envVarForKey(pkey) : null,
      key_set: pkey ? api[pkey] : false,
      native_rgba: m.native_rgba,
      native_svg: m.native_svg,
      paste_only: Boolean(m.paste_only),
      free_tier: pkey ? FREE_KEYS.includes(pkey) : false
    };
  });

  const unconfigured: string[] = [];
  if (!api.openai) unconfigured.push("OPENAI_API_KEY");
  if (!api.google) unconfigured.push("GEMINI_API_KEY (or GOOGLE_API_KEY)");
  if (!api.ideogram) unconfigured.push("IDEOGRAM_API_KEY");
  if (!api.recraft) unconfigured.push("RECRAFT_API_KEY");
  if (!api.flux) unconfigured.push("BFL_API_KEY (or TOGETHER_API_KEY)");
  if (!api.stability) unconfigured.push("STABILITY_API_KEY");
  if (!api.leonardo) unconfigured.push("LEONARDO_API_KEY");
  if (!api.fal) unconfigured.push("FAL_API_KEY (or FAL_KEY)");
  if (!api.replicate) unconfigured.push("REPLICATE_API_TOKEN (signup trial credit)");
  if (!api.huggingface)
    unconfigured.push("HF_TOKEN (free, https://huggingface.co/settings/tokens)");
  if (!api.cloudflare)
    unconfigured.push(
      "CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (free, 10k neurons/day, https://dash.cloudflare.com/profile/api-tokens)"
    );

  const anyPaidApi = PAID_KEYS.some((k) => api[k]);
  const anyFreeApi = FREE_KEYS.some((k) => api[k]);
  const anyApi = anyPaidApi || anyFreeApi;

  const freeRoutes = [
    {
      id: "pollinations",
      how: "HTTP GET — zero signup. curl -o out.png 'https://image.pollinations.ai/prompt/<url-encoded-prompt>?model=flux&width=1024&height=1024&nologo=true'",
      quality: "Good (Flux / Turbo / Kontext / SD backends)",
      catch: "~1 req/15s anonymous, RGB only (no alpha — matte post-generation)",
      url: "https://image.pollinations.ai/"
    },
    {
      id: "stable-horde",
      how: "REST API, anonymous kudos bucket or free account",
      quality: "Variable (community GPUs)",
      catch: "Queue-based — anonymous can wait minutes; HORDE_API_KEY gives priority",
      url: "https://aihorde.net/api/"
    },
    {
      id: "huggingface",
      how: "HF Inference API; set HF_TOKEN (free account, no credit card)",
      quality: "Model-dependent (SDXL, SD3, Flux dev/schnell hosted)",
      catch: "Free tier is rate-limited to a few req/min; cold-start latency on popular models",
      url: "https://huggingface.co/settings/tokens"
    },
    {
      id: "cloudflare",
      how: "Cloudflare Workers AI; CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (both free, no paid plan)",
      quality:
        "Strong — hosts Flux.2 klein/dev, Flux-1 Schnell, SDXL base + Lightning, DreamShaper, Leonardo Phoenix + Lucid Origin",
      catch:
        "10,000 neurons/day on free tier (Flux Schnell ~11 neurons/image, SDXL Lightning ~2); no transparent output, matte externally",
      url: "https://dash.cloudflare.com/profile/api-tokens"
    },
    {
      id: "google-ai-studio",
      how: "GEMINI_API_KEY from https://aistudio.google.com/apikey (free, no credit card)",
      quality: "Good (Gemini 3 Flash Image / Nano Banana — ~1,500 free images/day)",
      catch: "RGB only; no transparent output — matte post-generation",
      url: "https://aistudio.google.com/apikey"
    },
    {
      id: "local-comfyui",
      how: "Run ComfyUI on your own GPU; connect via the comfyui-mcp community adapter",
      quality: "Full quality — you pick the model",
      catch: "Requires your own hardware; out of scope for this package",
      url: "https://github.com/comfyanonymous/ComfyUI"
    },
    {
      id: "ideogram-free-weekly",
      how: "Existing IDEOGRAM_API_KEY works against the free weekly tier (no paid subscription needed)",
      quality: "Best-in-class typography (1-3 word wordmarks); Ideogram 3",
      catch: "10 credits/week (~40 images); watermark; wait 7 days for refill",
      url: "https://ideogram.ai"
    },
    {
      id: "leonardo-free-daily",
      how: "Existing LEONARDO_API_KEY works against the free daily token bucket",
      quality: "Phoenix 1.0 / Diffusion XL / Kontext / Lucid presets",
      catch: "150 fast tokens/day; Leonardo claims rights to output — check ToS",
      url: "https://leonardo.ai"
    },
    {
      id: "replicate-trial",
      how: "Set REPLICATE_API_TOKEN; signup comes with a small one-time credit",
      quality: "Universal — Flux 1.1 Pro, SDXL, SD3, Recraft V3, Ideogram V3 all behind one key",
      catch: "Trial credit exhausts quickly; ongoing use is paid per-run",
      url: "https://replicate.com/account/api-tokens"
    }
  ];

  const modes_by_asset_type = { ...MODES_BY_ASSET_TYPE };

  const hints: string[] = [];
  hints.push(
    "inline_svg works without any API key — the hosting LLM writes the SVG directly. " +
      "Best for logos, favicons, icon packs, stickers, transparent marks, and simple app-icon masters."
  );
  hints.push(
    "external_prompt_only returns a dialect-correct prompt and a list of web UIs to paste into " +
      "(Ideogram, Google AI Studio / Nano Banana, Recraft, Midjourney, fal.ai, BFL Playground, etc.). " +
      "After you paste, save the image locally and call asset_ingest_external to finish the pipeline."
  );
  hints.push(
    "free api routes work WITHOUT paying: Pollinations (zero signup, HTTP GET), Stable Horde " +
      "(anonymous queue), Hugging Face Inference (free token, no credit card), and the free tier of " +
      "Google AI Studio (Gemini 3 Flash Image — ~1,500 images/day). These are the recommended starting " +
      "points before you spend anything."
  );
  if (anyPaidApi) {
    const enabled = PAID_KEYS.filter((k) => api[k]).join(", ");
    hints.push(`paid api mode available for: ${enabled}.`);
  } else {
    hints.push(
      "paid api mode is not active — no paid provider key detected. Set one of: " +
        unconfigured.join(", ") +
        ". Or continue with free_api / inline_svg / external_prompt_only (recommended first)."
    );
  }
  if (anyFreeApi) {
    const fenabled = FREE_KEYS.filter((k) => api[k]).join(", ");
    hints.push(`free api mode available for: ${fenabled}.`);
  }

  const eligibleInlineSvg = (Object.keys(MODES_BY_ASSET_TYPE) as AssetType[]).filter((t) =>
    MODES_BY_ASSET_TYPE[t].includes("inline_svg")
  );
  const eligibleExternal = (Object.keys(MODES_BY_ASSET_TYPE) as AssetType[]).filter((t) =>
    MODES_BY_ASSET_TYPE[t].includes("external_prompt_only")
  );

  const supportedServices = Object.values(pasteTargets)
    .flat()
    .map((t) => t.name)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort();

  const narrowed = input.asset_type
    ? ({ [input.asset_type]: MODES_BY_ASSET_TYPE[input.asset_type] } as Record<AssetType, Mode[]>)
    : modes_by_asset_type;

  return {
    inline_svg: {
      available: true,
      eligible_asset_types: eligibleInlineSvg,
      notes:
        "No API key required. The server returns an SVG-authoring brief; the hosting LLM emits the <svg> " +
        "inline in its response. Path budget ≤40 per asset. Source: docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md."
    },
    external_prompt_only: {
      available: true,
      eligible_asset_types: eligibleExternal,
      supported_services: supportedServices,
      notes:
        "No API key required. The server returns the dialect-correct prompt and a list of web UIs. " +
        "After generating in one of those UIs, save the image locally and call asset_ingest_external."
    },
    api: {
      available: anyApi,
      providers: api,
      unconfigured_env_vars: unconfigured,
      notes: anyPaidApi
        ? "At least one paid provider key is configured."
        : anyFreeApi
          ? "No paid keys set, but zero-key/free-tier routes (Pollinations, Stable Horde, HF) are live — api mode works."
          : "No provider adapters reachable. Set one of the listed env vars to enable api mode, or stick with inline_svg / external_prompt_only."
    },
    free_api: {
      available: anyFreeApi,
      routes: freeRoutes,
      notes: anyFreeApi
        ? "Zero-key and free-tier routes are live. Pollinations needs no signup at all; HF free tier needs only a read token."
        : "Free-tier routes are currently gated (POLLINATIONS_DISABLED / HORDE_DISABLED set, or no HF_TOKEN)."
    },
    modes_by_asset_type: narrowed,
    providers_registered: providers,
    hints
  };
}

function envVarForKey(k: keyof ApiAvailability): string {
  switch (k) {
    case "openai":
      return "OPENAI_API_KEY";
    case "google":
      return "GEMINI_API_KEY";
    case "ideogram":
      return "IDEOGRAM_API_KEY";
    case "recraft":
      return "RECRAFT_API_KEY";
    case "flux":
      return "BFL_API_KEY";
    case "stability":
      return "STABILITY_API_KEY";
    case "leonardo":
      return "LEONARDO_API_KEY";
    case "fal":
      return "FAL_API_KEY";
    case "huggingface":
      return "HF_TOKEN";
    case "pollinations":
      return "POLLINATIONS_TOKEN (optional — zero-key works)";
    case "horde":
      return "HORDE_API_KEY (optional — anonymous works)";
    case "cloudflare":
      return "CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID";
    case "replicate":
      return "REPLICATE_API_TOKEN";
  }
}
