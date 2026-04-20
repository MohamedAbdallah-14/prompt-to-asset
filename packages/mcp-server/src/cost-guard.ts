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
 * provider. If the estimate exceeds `P2A_MAX_SPEND_USD_PER_RUN`, the tool
 * throws `CostBudgetExceededError` with a clear message. Default: no cap
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
  // OpenAI
  "gpt-image-1": 0.19,
  "gpt-image-1.5": 0.19,
  "dall-e-3": 0.08,

  // Google
  "imagen-3": 0.03,
  "imagen-4": 0.04,
  "gemini-3-flash-image": 0, // free tier on AI Studio
  "gemini-3.1-flash-image-preview": 0,
  "gemini-3-pro-image-preview": 0.039,
  "gemini-3-pro-image": 0.039,

  // Ideogram
  "ideogram-3": 0.08,
  "ideogram-3-turbo": 0.05,

  // Recraft
  "recraft-v3": 0.04,
  "recraft-v3-svg": 0.04,

  // Flux family
  "flux-pro": 0.05,
  "flux-pro-1.1": 0.05,
  "flux-1.1-pro-ultra": 0.06,
  "flux-kontext-pro": 0.05,
  "flux-kontext-max": 0.08,
  "flux-2": 0.08,
  "flux-schnell": 0.003,

  // Stability
  "sd-3-large": 0.065,
  "sd-3-large-turbo": 0.04,
  "sdxl-1.0": 0.009,
  "playground-v3": 0.04,

  // Leonardo
  "leonardo-phoenix-1.0": 0.02,

  // fal.ai — aggregator; use flux pricing as proxy
  "fal-flux-pro": 0.05,
  "fal-flux-schnell": 0.003,

  // Free tier / zero key
  "pollinations-flux": 0,
  "pollinations-turbo": 0,
  "pollinations-majestic": 0,
  "horde-sdxl": 0,
  "horde-flux": 0,
  "hf-sd-xl": 0,
  "hf-sd-3": 0,
  "hf-flux-schnell": 0,
  "cf-flux-schnell": 0,
  "cf-sdxl-lightning": 0,
  "replicate-flux-schnell": 0.003
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
