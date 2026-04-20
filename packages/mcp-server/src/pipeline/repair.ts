import type { AssetSpec, BrandBundle, ValidationResult } from "../types.js";

/**
 * Diagnostic-to-repair mapping for the regenerate-until-validated loop.
 *
 * Research basis:
 *   - docs/research/24-agentic-orchestration-patterns/24a-multi-agent-handoff-patterns.md
 *   - docs/research/26-reflection-self-refinement/26a-reflexion-self-refine-patterns.md
 *   - docs/research/26-reflection-self-refinement/26e-critique-to-prompt-repair.md
 *   - docs/research/26-reflection-self-refinement/26d-convergence-stopping-criteria.md
 *
 * Policy:
 *   - Each tier-0 failure type has a canonical repair. Alpha fail → re-route
 *     away from Imagen/Gemini. ΔE2000 palette drift → inject hex into prompt.
 *     Safe-zone bbox fail → increase subject padding guidance. Text OCR fail
 *     → drop text from prompt and note mark-only.
 *   - Repair is layered: swap model FIRST (cheapest lever), then modify
 *     prompt. Both together when both help.
 *   - Stop-when-no-improvement: if the *diagnostic* doesn't change after a
 *     retry (same failure, same magnitude), bail — we've converged on bad.
 *   - Hard cap enforced by the caller (default 0, max 4). Keeps cost bounded.
 */

export interface RepairPlan {
  /** Short rationale surfaced in warnings. */
  reason: string;
  /** Replacement target model id. Null = keep current. */
  new_target_model: string | null;
  /** Positive additions appended to the prompt. */
  prompt_additions: string[];
  /** If true, drop `text_content` — ask for a mark only. */
  drop_text: boolean;
  /** The diagnostic signature (for convergence detection). */
  diagnostic_key: string;
}

export interface RepairContext {
  /** The AssetSpec used for the last call. */
  spec: AssetSpec;
  /** Outcome of validating the last call. */
  validation: ValidationResult;
  /** Models we've already exhausted this run, to avoid revisiting. */
  tried_models: Set<string>;
  /** Optional brand bundle — drives palette injection. */
  brand_bundle?: BrandBundle;
}

export function analyseValidation(v: ValidationResult): {
  alpha_failed: boolean;
  checkerboard_detected: boolean;
  palette_drift: boolean;
  safe_zone_fail: boolean;
  text_fail: boolean;
  contrast_fail: boolean;
} {
  const t0 = v.tier0;
  const get = (k: string) => t0[k];
  // Fields use mixed types. "alpha_present" false → alpha failed. The
  // palette ΔE writes a numeric key; > 10 is our threshold.
  const alpha_failed = get("transparency_required") === true && get("alpha_present") === false;
  const checkerboard_detected = get("checkerboard_detected") === true;
  const palette = Number(get("palette_max_delta_e_2000") ?? 0);
  const palette_drift = palette > 10;
  const safe_zone_fail = get("safe_zone_fits") === false;
  const textDist = Number(get("ocr_levenshtein") ?? -1);
  const text_fail = textDist > 1;
  const contrast = Number(get("min_contrast_ratio") ?? 999);
  const contrast_fail = contrast < 3;
  return {
    alpha_failed,
    checkerboard_detected,
    palette_drift,
    safe_zone_fail,
    text_fail,
    contrast_fail
  };
}

/**
 * Produce a repair for the given failure, or null when either (a) nothing
 * repairable fired or (b) we've exhausted the routing options.
 */
export function deriveRepair(ctx: RepairContext): RepairPlan | null {
  const a = analyseValidation(ctx.validation);
  const additions: string[] = [];
  let newTarget: string | null = null;
  let dropText = false;
  const reasons: string[] = [];

  // 1) Alpha / checkerboard — the most common and most routable failure.
  //    Imagen and Gemini 3 Flash Image can't produce RGBA. Swap to a native-
  //    RGBA model if we haven't already.
  if (a.alpha_failed || a.checkerboard_detected) {
    const rgbaModels = ["gpt-image-1", "ideogram-3-turbo", "recraft-v3"];
    const next = rgbaModels.find((m) => !ctx.tried_models.has(m));
    if (next) {
      newTarget = next;
      reasons.push(
        a.checkerboard_detected
          ? "checkerboard pattern detected — re-routing to a native-RGBA model"
          : "alpha channel missing — re-routing to a native-RGBA model"
      );
    }
  }

  // 2) Palette drift — inject the exact hex values into the prompt. Research
  //    26e: diffusion models respond to explicit hex when other tricks fail.
  if (a.palette_drift && ctx.brand_bundle?.palette?.length) {
    const hex = ctx.brand_bundle.palette.slice(0, 3).join(", ");
    additions.push(
      `Palette constrained to these exact hex values: ${hex}. Do not introduce any other hues.`
    );
    reasons.push(`palette ΔE2000 > 10 — pinning exact hex ${hex}`);
  }

  // 3) Safe-zone fail — subject ran off the canvas or touched the edge.
  //    Explicit padding guidance + centred composition.
  if (a.safe_zone_fail) {
    additions.push(
      "Subject fills 65-75% of the canvas, centered, with generous padding around every edge so the icon passes the platform safe-zone check (iOS 80% of 1024; Android 72dp of 108dp)."
    );
    reasons.push("safe-zone bbox fail — tightening composition");
  }

  // 4) Text OCR fail — last resort is to drop the wordmark and composite
  //    typography in the app layer. Research 07b.
  if (a.text_fail) {
    dropText = true;
    additions.push("No text, no labels, no wordmark — emit a mark-only composition.");
    reasons.push("OCR Levenshtein > 1 — dropping text from prompt; typeset in app layer instead");
  }

  // 5) Contrast fail — widen tonal range explicitly.
  if (a.contrast_fail) {
    additions.push(
      "High tonal contrast between foreground and background (WCAG non-text ≥3:1). Use deep fills paired with light accents."
    );
    reasons.push("WCAG contrast < 3 — requesting higher tonal range");
  }

  if (!newTarget && additions.length === 0 && !dropText) return null;

  const diagnostic_key = [
    a.alpha_failed ? "A" : "",
    a.checkerboard_detected ? "C" : "",
    a.palette_drift ? "P" : "",
    a.safe_zone_fail ? "S" : "",
    a.text_fail ? "T" : "",
    a.contrast_fail ? "W" : ""
  ].join("");

  return {
    reason: reasons.join(" + "),
    new_target_model: newTarget,
    prompt_additions: additions,
    drop_text: dropText,
    diagnostic_key
  };
}

/** True when the repair plan would not materially change the input. */
export function repairIsNoop(plan: RepairPlan): boolean {
  return (
    plan.new_target_model === null && plan.prompt_additions.length === 0 && plan.drop_text === false
  );
}
