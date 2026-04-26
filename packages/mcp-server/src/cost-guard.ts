/**
 * Best-effort cost estimator + guard for api-mode tool calls.
 *
 * Problem this solves: one bad loop or a copy-pasted `count: 20` in an
 * illustration call can spend $10-$100 against OpenAI / Flux Pro before the
 * user notices. Zero-key providers (Pollinations / Horde / HF free) don't
 * have the issue — but the moment any paid key is set, a guardrail is
 * prudent.
 *
 * Policy: each api-mode tool computes an estimate BEFORE calling the
 * provider. Free/zero-cost providers still go through the estimator with $0
 * pricing so logs stay consistent. If the estimate exceeds
 * `P2A_MAX_SPEND_USD_PER_RUN`, the tool throws `CostBudgetExceededError` with
 * a clear message. Default: no cap
 * (we don't want to break existing users), but we surface the env var
 * prominently in `p2a doctor` so it's easy to opt in.
 *
 * The per-image numbers are best-effort ceilings from public pricing as of
 * 2026-04, not contracts. When the router picks a model we don't have a
 * price for, `estimatedCostUsd` returns null and the guard is a no-op — this
 * is deliberate: we'd rather under-enforce than block legitimate calls.
 */

// Prices unknown to us → fail-open. The cost guard no-ops rather than
// blocking a legitimate call. Kept as a documented constant; not a runtime
// fallback price.
// const DEFAULT_PRICE_USD = 0.05;

// Prices in USD per image at the highest typical quality tier we route to.
// Keep updated as providers publish; easier to move in one file than in
// model-registry.json which is versioned heavily.
export const PRICE_TABLE_USD_PER_IMAGE: Record<string, number> = {
  // OpenAI — IDs must match data/model-registry.json exactly.
  // gpt-image-2: OpenAI has NOT yet listed this on api.openai.com/pricing
  // (verified 2026-04-26). Third-party aggregators report ~$0.21/img high-
  // quality 1024² mirroring gpt-image-1's ceiling. Using a conservative $0.25
  // placeholder so the budget guard errs on the side of triggering early
  // rather than under-charging. Update once OpenAI publishes the calculator.
  "gpt-image-2": 0.25,
  "gpt-image-1": 0.19,
  "gpt-image-1.5": 0.133,
  "gpt-image-1-mini": 0.008,
  "dall-e-3": 0.08,

  // Google — verified Apr 2026 at ai.google.dev/gemini-api/docs/pricing
  // No model in this family has a free API tier; all image calls cost.
  "imagen-3": 0.03,
  "imagen-4": 0.04, // Imagen 4 Standard; Fast=$0.02, Ultra=$0.06 (see model-registry)
  "gemini-3-flash-image": 0.067, // gemini-3.1-flash-image-preview (Nano Banana 2) at 1K
  "gemini-3-pro-image": 0.134, // gemini-3-pro-image-preview (Nano Banana Pro) at 1K/2K; 4K=$0.24

  // Ideogram
  "ideogram-3": 0.08,
  "ideogram-3-turbo": 0.05,

  // Recraft
  "recraft-v3": 0.04,
  "recraft-v4": 0.08,

  // Flux family — Flux 2 priced per-MP on fal: $0.03 first MP + $0.015/extra.
  // 1024² = 1MP = $0.03, but ceiling-conservative $0.06 covers landscape too.
  "flux-pro": 0.05,
  "flux-kontext-pro": 0.05,
  "flux-2": 0.06,
  "flux-2-flex": 0.05,
  "flux-2-dev": 0.012,
  "flux-2-klein": 0.005,
  "flux-schnell": 0.003,
  "flux-dev": 0.025,

  // Stability
  "sd3-large": 0.065,
  sdxl: 0.009,
  "sd-1.5": 0.002,
  "playground-v3": 0.04,

  // Leonardo
  "leonardo-phoenix": 0.02,
  "leonardo-diffusion-xl": 0.02,

  // Adobe Firefly / others
  "firefly-3": 0.04,
  "krea-image-1": 0.04,
  "midjourney-v6": 0,
  "midjourney-v7": 0,

  // fal.ai — aggregator; use flux pricing as proxy
  "fal-flux-pro": 0.05,
  "fal-flux-2": 0.08,
  "fal-sdxl": 0.01,

  // Freepik — 5 EUR (~$5.40) free trial, paid pay-as-you-go after.
  // Per-creation prices are best-effort; Freepik dashboard is the source of truth.
  // €→$ at 1.08; rounded conservatively up to avoid undercharging the guard.
  "freepik-mystic": 0.04,
  "freepik-mystic-realism": 0.04,
  "freepik-mystic-fluid": 0.04,
  "freepik-mystic-zen": 0.04,
  "freepik-flux-2-pro": 0.05,
  "freepik-flux-kontext-pro": 0.05,
  "freepik-text-to-icon": 0.04,
  "freepik-remove-bg": 0.04,
  "freepik-upscaler-creative": 0.1,
  "freepik-image-relight": 0.11,
  "freepik-image-style-transfer": 0.11,
  "freepik-image-expand-flux": 0.05,
  "freepik-image-expand-ideogram": 0.05,
  "freepik-image-expand-seedream": 0.04,

  // Pixazo — Azure APIM gateway. Free tier $0 but transfers IP ownership
  // to Appy Pie LLP (the parent company). Paid tier transfers ownership
  // back to the user. Flux Schnell paid is the cheapest in the registry.
  "pixazo-flux-schnell": 0.0012,
  "pixazo-sdxl-base": 0,
  "pixazo-sd15-inpainting": 0,

  // NVIDIA NIM — 1,000 requests/month free, no credit card. No paid tier on
  // build.nvidia.com (overage simply rejects).
  "nim-flux-1-dev": 0,
  "nim-flux-1-schnell": 0,
  "nim-flux-1-kontext-dev": 0,
  "nim-flux-2-klein": 0,
  "nim-sdxl-turbo": 0,
  "nim-sd3.5-large": 0,
  "nim-sana": 0,

  // Free tier / zero key — must match registry ids in data/model-registry.json
  "pollinations-flux": 0,
  "pollinations-turbo": 0,
  "pollinations-kontext": 0,
  "pollinations-sd": 0,
  "horde-sdxl": 0,
  "horde-flux": 0,
  "hf-sdxl": 0,
  "hf-sd3": 0,
  "hf-flux-dev": 0,
  "hf-flux-schnell": 0,
  "cf-flux-1-schnell": 0,
  "cf-flux-2-klein-4b": 0,
  "cf-flux-2-klein-9b": 0,
  "cf-flux-2-dev": 0,
  "cf-sdxl": 0,
  "cf-sdxl-lightning": 0,
  "cf-dreamshaper-8-lcm": 0,
  "cf-leonardo-phoenix": 0,
  "cf-leonardo-lucid-origin": 0,
  "replicate-flux-schnell": 0.003,
  "replicate-flux-1.1-pro": 0.04,
  "replicate-flux-dev": 0.025,
  "replicate-sdxl": 0.00125,
  "replicate-sd3": 0.035,
  "replicate-recraft-v3": 0.04,
  "replicate-ideogram-3": 0.08,
  "comfyui-sdxl": 0,
  "comfyui-flux": 0,
  "comfyui-flux-lora": 0
};

export function estimatedCostUsd(modelId: string, images: number = 1): number | null {
  const per = PRICE_TABLE_USD_PER_IMAGE[modelId];
  if (per === undefined) return null;
  return per * images;
}

export class CostBudgetExceededError extends Error {
  readonly code = "COST_BUDGET_EXCEEDED";
  constructor(
    public modelId: string,
    public images: number,
    public estimate_usd: number,
    public budget_usd: number
  ) {
    super(
      `Estimated cost $${estimate_usd.toFixed(2)} for ${images} image${images === 1 ? "" : "s"} ` +
        `at ${modelId} exceeds P2A_MAX_SPEND_USD_PER_RUN=$${budget_usd.toFixed(2)}. ` +
        `Raise the cap, lower the count, switch to a free-tier model (pollinations-flux / hf-flux-schnell / horde-sdxl), ` +
        `or use mode=inline_svg (zero cost).`
    );
    this.name = "CostBudgetExceededError";
  }
}

export function parseBudgetFromEnv(): number | null {
  const raw = process.env["P2A_MAX_SPEND_USD_PER_RUN"];
  if (!raw || raw.trim().length === 0) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export interface CostGuardArgs {
  modelId: string;
  images?: number;
}

/**
 * Throws when the estimated spend exceeds `P2A_MAX_SPEND_USD_PER_RUN`.
 * No-op when the budget isn't set, when the model isn't priced, or when
 * the per-image estimate is zero (free tier / zero-key).
 */
export function assertWithinBudget(args: CostGuardArgs): void {
  const budget = parseBudgetFromEnv();
  if (budget === null) return;
  const images = Math.max(1, args.images ?? 1);
  const est = estimatedCostUsd(args.modelId, images);
  if (est === null) return; // unknown — fail-open
  if (est > budget) {
    throw new CostBudgetExceededError(args.modelId, images, est, budget);
  }
}

/**
 * Returns a summary string for use in tool-response warnings. Reveals the
 * estimate + budget so the caller knows how close they were.
 */
export function costSummary(args: CostGuardArgs): string | null {
  const budget = parseBudgetFromEnv();
  const images = Math.max(1, args.images ?? 1);
  const est = estimatedCostUsd(args.modelId, images);
  if (est === null) return null;
  if (est === 0) return `cost: $0.00 (free-tier / zero-key route)`;
  const budgetClause = budget !== null ? ` (cap: $${budget.toFixed(2)})` : " (no cap set)";
  return `cost: ~$${est.toFixed(3)} for ${images} image${images === 1 ? "" : "s"} at ${args.modelId}${budgetClause}`;
}
