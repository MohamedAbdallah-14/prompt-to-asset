// Tools: asset_models_list, asset_models_inspect
//
// MCP-callable equivalents of `p2a models list` and `p2a models inspect`.
// Lets the LLM browse the 60+ model registry and answer "which model for X?"
// without the user typing anything in a shell.
//
// Read-only. No network. Both tools hit the shipped JSON registries only.

import type { ModelsListInputT, ModelsInspectInputT } from "../schemas.js";
import type { ModelInfo, RoutingRule } from "../types.js";
import { MODEL_REGISTRY, ROUTING_TABLE } from "../config.js";
import { providerKeyForModel, detectApiAvailability } from "../modes.js";
import { allPasteTargets, type PasteTarget } from "../paste-targets.js";

export interface ModelListEntry {
  id: string;
  aka?: string[];
  family: string;
  provider: string;
  dialect: string;
  native_rgba: boolean | "partial";
  native_svg: boolean;
  text_ceiling_chars: number;
  tier: "free" | "paid" | "paste-only";
  status: "ready" | "unset" | "paste";
  cost_hint?: string;
  provider_key_env: string | null;
  key_set: boolean;
}

export interface ModelsListResult {
  total: number;
  filters_applied: {
    free?: boolean;
    paid?: boolean;
    paste_only?: boolean;
    rgba?: boolean;
    svg?: boolean;
  };
  models: ModelListEntry[];
}

export async function modelsList(input: ModelsListInputT): Promise<ModelsListResult> {
  const avail = detectApiAvailability();
  let models = MODEL_REGISTRY.models;

  if (input.free) models = models.filter((m) => m.free_tier);
  if (input.paid) models = models.filter((m) => !m.free_tier && !m.paste_only);
  if (input.paste_only) models = models.filter((m) => m.paste_only);
  if (input.rgba) models = models.filter((m) => m.native_rgba === true);
  if (input.svg) models = models.filter((m) => m.native_svg === true);

  const entries: ModelListEntry[] = models.map((m) => {
    const pkey = providerKeyForModel(m.id);
    const keySet = pkey ? avail[pkey] : false;
    const tier: ModelListEntry["tier"] = m.paste_only
      ? "paste-only"
      : m.free_tier
        ? "free"
        : "paid";
    const status: ModelListEntry["status"] = m.paste_only ? "paste" : keySet ? "ready" : "unset";
    const entry: ModelListEntry = {
      id: m.id,
      family: String(m.family),
      provider: m.provider,
      dialect: String(m.dialect),
      native_rgba: m.native_rgba,
      native_svg: m.native_svg,
      text_ceiling_chars: m.text_ceiling_chars,
      tier,
      status,
      provider_key_env: pkey ? envForKey(pkey) : null,
      key_set: keySet
    };
    if (m.aka?.length) entry.aka = m.aka;
    if (m.cost_hint) entry.cost_hint = m.cost_hint;
    return entry;
  });

  return {
    total: entries.length,
    filters_applied: {
      ...(input.free !== undefined && { free: input.free }),
      ...(input.paid !== undefined && { paid: input.paid }),
      ...(input.paste_only !== undefined && { paste_only: input.paste_only }),
      ...(input.rgba !== undefined && { rgba: input.rgba }),
      ...(input.svg !== undefined && { svg: input.svg })
    },
    models: entries
  };
}

export interface ModelInspectResult {
  model: ModelInfo;
  status_in_env: {
    provider_key_env: string | null;
    key_set: boolean;
    paste_only: boolean;
    free_tier: boolean;
  };
  paste_targets: PasteTarget[];
  routing_rules: Array<{
    id: string;
    position: Array<"PRIMARY" | "fallback" | "NEVER">;
    rule: RoutingRule;
  }>;
  notes: string[];
}

export async function modelsInspect(input: ModelsInspectInputT): Promise<ModelInspectResult> {
  const m = MODEL_REGISTRY.models.find((x) => x.id === input.id || x.aka?.includes(input.id));
  if (!m) {
    throw new Error(
      `model "${input.id}" not found in data/model-registry.json. Call asset_models_list to see the available ids.`
    );
  }
  const avail = detectApiAvailability();
  const pkey = providerKeyForModel(m.id);
  const paste_targets = allPasteTargets()[m.id] ?? [];

  const routing_rules = ROUTING_TABLE.rules
    .filter(
      (r) =>
        r.primary.model === m.id ||
        r.fallback.some((f) => f.model === m.id) ||
        r.never?.includes(m.id)
    )
    .map((rule) => {
      const position: Array<"PRIMARY" | "fallback" | "NEVER"> = [];
      if (rule.primary.model === m.id) position.push("PRIMARY");
      if (rule.fallback.some((f) => f.model === m.id)) position.push("fallback");
      if (rule.never?.includes(m.id)) position.push("NEVER");
      return { id: rule.id, position, rule };
    });

  const notes: string[] = [];
  if (m.negative_prompt_support === "error") {
    notes.push(
      "This model rejects `negative_prompt` (it errors). The rewriter encodes do-not constraints as positive anchors in the main prompt instead."
    );
  }
  if (m.free_tier) {
    notes.push(
      "Free-tier model. Great starting point; read rate limits before leaning on it in production."
    );
  }
  if (m.paste_only) {
    notes.push(
      "Paste-only model. No programmatic API; call asset_enhance_prompt with mode=external_prompt_only to get the rewritten prompt + paste target(s)."
    );
  }

  return {
    model: m,
    status_in_env: {
      provider_key_env: pkey ? envForKey(pkey) : null,
      key_set: pkey ? avail[pkey] : false,
      paste_only: Boolean(m.paste_only),
      free_tier: Boolean(m.free_tier)
    },
    paste_targets,
    routing_rules,
    notes
  };
}

function envForKey(k: ReturnType<typeof providerKeyForModel>): string {
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
    case "comfyui":
      return "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL";
    default:
      return "—";
  }
}
