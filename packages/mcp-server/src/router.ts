import { ROUTING_TABLE, findModel } from "./config.js";
import type { AssetType, RoutingRule, ModelInfo } from "./types.js";

export interface RouteDecision {
  rule_id: string;
  primary_model: string;
  primary_params: Record<string, unknown>;
  primary_strategy?: string;
  fallback_models: string[];
  never_models: string[];
  postprocess: string[];
  reason: string;
  /** Repo-relative pointers to the research files that back this rule. */
  research_sources: string[];
}

export interface RouteInput {
  asset_type: AssetType;
  text_length: number;
  vector_required: boolean;
  transparency_required: boolean;
  brand_bundle_present: boolean;
  style?: string;
}

/**
 * Pure function: route an intent to a (primary, fallback, postprocess) decision.
 * Data-driven — rules come from data/routing-table.json.
 */
export function route(input: RouteInput): RouteDecision {
  const matches = ROUTING_TABLE.rules.filter((r) => matchesRule(r, input));

  // Pick the most specific matching rule (most `when` keys beyond asset_type)
  matches.sort((a, b) => Object.keys(b.when).length - Object.keys(a.when).length);
  const rule = matches[0];

  if (!rule) {
    return defaultRoute(input);
  }

  const primary = rule.primary;
  const primaryModel = primary.model ?? primary.strategy ?? "unknown";
  const fallbacks = rule.fallback
    .map((f) => f.model ?? f.strategy ?? "unknown")
    .filter((s) => s !== "unknown");
  const postprocess = [...(primary.postprocess ?? []), ...(rule.postprocess ?? [])];

  return {
    rule_id: rule.id,
    primary_model: primaryModel,
    primary_params: (primary.params as Record<string, unknown>) ?? {},
    ...(primary.strategy !== undefined && { primary_strategy: primary.strategy }),
    fallback_models: fallbacks,
    never_models: rule.never,
    postprocess,
    reason: explain(rule, input),
    research_sources: rule.research_sources ?? []
  };
}

function matchesRule(rule: RoutingRule, input: RouteInput): boolean {
  const w = rule.when;
  if (w["asset_type"] && w["asset_type"] !== input.asset_type) return false;

  if (w["text_length"] !== undefined) {
    const tl = w["text_length"];
    if (typeof tl === "number" && input.text_length !== tl) return false;
    if (typeof tl === "string" && !textLengthMatches(tl, input.text_length)) return false;
  }

  if (w["vector_required"] !== undefined && w["vector_required"] !== input.vector_required)
    return false;
  if (
    w["transparency_required"] !== undefined &&
    w["transparency_required"] !== input.transparency_required
  )
    return false;
  if (
    w["brand_bundle_present"] !== undefined &&
    w["brand_bundle_present"] !== input.brand_bundle_present
  )
    return false;
  if (w["style"] !== undefined && w["style"] !== input.style) return false;

  return true;
}

/**
 * Parse a text_length predicate string and check if `len` matches.
 * Supported forms:
 *   - "N"        exact match
 *   - "N..M"     inclusive range (e.g. "1..3", "4..10")
 *   - ">N" / ">=N" / "<N" / "<=N"
 * Anything unrecognized fails the rule. Earlier versions silently accepted
 * unknown predicates — that let new rules match every text_length.
 */
function textLengthMatches(predicate: string, len: number): boolean {
  const range = predicate.match(/^(\d+)\.\.(\d+)$/);
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    return len >= lo && len <= hi;
  }
  const cmp = predicate.match(/^(>=|<=|>|<)(\d+)$/);
  if (cmp) {
    const op = cmp[1];
    const n = Number(cmp[2]);
    if (op === ">") return len > n;
    if (op === ">=") return len >= n;
    if (op === "<") return len < n;
    if (op === "<=") return len <= n;
  }
  if (/^\d+$/.test(predicate)) return len === Number(predicate);
  return false;
}

function defaultRoute(input: RouteInput): RouteDecision {
  // Sensible fallback if nothing matches: gpt-image-1 (broadest capability)
  return {
    rule_id: "default",
    primary_model: "gpt-image-1",
    primary_params: input.transparency_required ? { background: "transparent" } : {},
    fallback_models: ["flux-pro"],
    never_models: [],
    postprocess: input.transparency_required ? ["validate_alpha"] : [],
    reason: `No specific routing rule matched (asset_type=${input.asset_type}); defaulting to gpt-image-1.`,
    research_sources: []
  };
}

function explain(rule: RoutingRule, input: RouteInput): string {
  const parts: string[] = [];
  parts.push(`Matched routing rule "${rule.id}"`);
  if (input.transparency_required)
    parts.push(`transparency required → primary chosen from RGBA-native providers`);
  if (input.vector_required)
    parts.push(`vector output required → primary is SVG-native or has vectorize fallback`);
  if (input.text_length > 3)
    parts.push(`text >3 words → composite strategy (never ask diffusion for wordmark)`);
  return parts.join(". ") + ".";
}

/**
 * Validate a candidate model against the "never" list and capability matrix.
 */
export function isForbiddenForAsset(
  modelId: string,
  input: RouteInput
): { forbidden: boolean; reason?: string } {
  const m = findModel(modelId);
  if (!m) return { forbidden: false };
  if (input.transparency_required && m.native_rgba === false) {
    return {
      forbidden: true,
      reason: `${m.id} cannot produce real RGBA (native_rgba=false in registry)`
    };
  }
  if (input.vector_required && !m.native_svg) {
    return {
      forbidden: false,
      reason: `${m.id} lacks native SVG; vectorize-pipeline postprocess required`
    };
  }
  if (input.text_length > m.text_ceiling_chars) {
    return {
      forbidden: true,
      reason: `${m.id} text_ceiling=${m.text_ceiling_chars}; requested length ${input.text_length}`
    };
  }
  return { forbidden: false };
}

export function getModelInfo(id: string): ModelInfo | undefined {
  return findModel(id);
}
