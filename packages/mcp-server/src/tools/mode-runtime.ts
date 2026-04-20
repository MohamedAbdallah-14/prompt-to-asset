// Shared helpers for mode-aware generators.
//
// Every asset_generate_* tool follows the same skeleton:
//   1. Build an AssetSpec via enhancePrompt (classify + route + rewrite + modes_available).
//   2. Resolve the mode (caller's mode, or auto-select).
//   3. Dispatch:
//        inline_svg           → buildInlineSvgPlan (server returns authoring brief)
//        external_prompt_only → buildExternalPromptPlan (server returns prompt + paste targets)
//        api                  → run the provider pipeline (file-specific)
//
// Keeping the non-api branches here means the generators themselves only
// carry api-mode logic, plus a two-line dispatch.

import type {
  AssetSpec,
  AssetType,
  InlineSvgPlan,
  ExternalPromptPlan,
  BrandBundle
} from "../types.js";
import type { ModeT } from "../schemas.js";
import { selectMode, detectApiAvailability, type Mode } from "../modes.js";
import { buildSvgBrief } from "../svg-briefs.js";
import { resolvePasteTargets } from "../paste-targets.js";

/**
 * Pick the execution mode for a generator call.
 * Throws with an actionable message if the requested mode is impossible.
 */
export function resolveMode(
  requested: ModeT | undefined,
  assetType: AssetType,
  primaryModel: string,
  fallbackModels: string[]
): { mode: Mode; reason: string } {
  return selectMode(requested, {
    asset_type: assetType,
    primary_model: primaryModel,
    fallback_models: fallbackModels,
    availability: detectApiAvailability()
  });
}

/**
 * Build the inline_svg plan for a specific asset type using the asset spec
 * and optional brand bundle / text content from the caller.
 */
export function buildInlineSvgPlan(
  assetType: AssetType,
  brief: string,
  spec: AssetSpec,
  brandBundle?: BrandBundle,
  textContent?: string
): InlineSvgPlan {
  const svg_brief = buildSvgBrief({
    asset_type: assetType,
    ...(brandBundle && { brand_bundle: brandBundle }),
    ...(textContent && { text_content: textContent })
  });

  const instructions = [
    `You are acting as the pixel-producer for this asset. The MCP server has done the routing, constraint, and palette work for you — your job is to emit a single production-grade SVG inline in your reply.`,
    ``,
    `HARD RULES (each directly enforced by validation):`,
    `- viewBox MUST be exactly "${svg_brief.viewBox}".`,
    `- At most ${svg_brief.path_budget} <path> elements. Prefer primitives (rect, circle, polygon) where possible.`,
    `- Only these colors may appear as fill / stroke values: ${svg_brief.palette.hex.join(", ")}${svg_brief.palette.hex.includes("currentColor") ? " (use currentColor for icon packs so the app can recolor via CSS)" : ""}.`,
    `- No <image>. No <filter> chains. No xlink:href external refs.`,
    ``,
    `REQUIREMENTS:`,
    ...svg_brief.require.map((r) => `- ${r}`),
    ``,
    `DO NOT:`,
    ...svg_brief.do_not.map((d) => `- ${d}`),
    ``,
    `STYLE DIRECTION:`,
    ...svg_brief.style_hints.map((h) => `- ${h}`),
    ``,
    `BEFORE REPLYING, VERIFY:`,
    ...svg_brief.validation_hints.map((v) => `- ${v}`),
    ``,
    `Start from this skeleton and fill in the paths:`,
    `\`\`\`svg`,
    svg_brief.skeleton,
    `\`\`\``,
    ``,
    `STEP 1 — Emit the final SVG in a \`\`\`svg code block so the user can see it.`,
    `STEP 2 — IMMEDIATELY call the \`asset_save_inline_svg\` tool with:`,
    `  { "svg": "<the SVG text you just emitted>", "asset_type": "${assetType}"${textContent ? `, "expected_text": "${textContent}"` : ""}${brandBundle ? `, "brand_bundle": { /* pass through the bundle if one was provided */ }` : ""} }`,
    `The tool writes master.svg (+ favicon.ico / apple-touch / AppIconSet / PWA bundle where applicable) to disk and returns the file paths. Without this step the user gets a code block they have to copy-paste; with it they get a file they can open.`,
    `STEP 3 — Tell the user briefly what you drew AND show them the variants[].path list from the tool response.`,
    ``,
    `Do not apologize, do not ask for more info — the brief is complete. Do not skip step 2.`
  ].join("\n");

  return {
    mode: "inline_svg",
    asset_type: assetType,
    brief,
    svg_brief,
    instructions_to_host_llm: instructions,
    params: spec.params,
    dimensions: spec.dimensions,
    warnings: spec.warnings
  };
}

/**
 * Build the external_prompt_only plan. Returns the rewritten prompt (from
 * enhancePrompt) plus the human-facing UIs the user can paste into, plus
 * an ingest_hint that tells the caller how to feed the result back in.
 */
export function buildExternalPromptPlan(
  assetType: AssetType,
  brief: string,
  spec: AssetSpec,
  opts: { expected_text?: string } = {}
): ExternalPromptPlan {
  const {
    primary_targets,
    fallback_targets,
    warnings: targetWarnings
  } = resolvePasteTargets(spec.target_model, spec.fallback_models);

  const explanation = [
    `Paste the enhanced_prompt into one of the paste_targets below.`,
    `Save the resulting image locally (e.g. ~/Downloads/mark.png).`,
    `Then call asset_ingest_external with:`,
    `  { image_path: "<absolute path to saved image>", asset_type: "${assetType}"${opts.expected_text ? `, expected_text: "${opts.expected_text}"` : ""} }.`,
    `The server will then run matte → vectorize (where applicable) → tier-0 validation and return a content-addressed bundle, same as api mode.`
  ].join(" ");

  const ingest_hint: ExternalPromptPlan["ingest_hint"] = {
    tool: "asset_ingest_external",
    args: {
      image_path: "<path-to-your-saved-image>",
      asset_type: assetType,
      ...(opts.expected_text && { expected_text: opts.expected_text })
    },
    explanation
  };

  const plan: ExternalPromptPlan = {
    mode: "external_prompt_only",
    asset_type: assetType,
    brief,
    target_model: spec.target_model,
    fallback_models: spec.fallback_models,
    enhanced_prompt: spec.rewritten_prompt,
    paste_targets: primary_targets,
    fallback_paste_targets: fallback_targets,
    ingest_hint,
    params: spec.params,
    dimensions: spec.dimensions,
    warnings: [...spec.warnings, ...targetWarnings]
  };
  if (spec.params["negative_prompt"] !== undefined) {
    plan.negative_prompt = String(spec.params["negative_prompt"]);
  }
  return plan;
}
