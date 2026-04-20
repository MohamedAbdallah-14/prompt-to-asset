import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { enhancePrompt } from "./enhance-prompt.js";
import { generate } from "../providers/index.js";
import { matte } from "../pipeline/matte.js";
import { tier0 } from "../pipeline/validate.js";
import { exportAppIconBundle } from "../pipeline/export.js";
import { computeCacheKey } from "../cache.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { resolveMode, buildInlineSvgPlan, buildExternalPromptPlan } from "./mode-runtime.js";
import type { GenerateAppIconInputT } from "../schemas.js";
import type { AssetGenerationResult } from "../types.js";

/**
 * Tool: asset_generate_app_icon
 *
 * Three modes.
 *   - inline_svg: caller gets a 1024² authoring brief with the iOS 824²
 *     safe zone called out; Claude emits the master SVG. A follow-up
 *     asset_ingest_external call can run the platform fan-out.
 *   - external_prompt_only: caller gets prompt + paste targets for the
 *     master mark. After download → asset_ingest_external → platform fan-out.
 *   - api: server generates via Recraft / Ideogram / gpt-image-1 →
 *     matte → export AppIconSet / Android adaptive / PWA / visionOS.
 *
 * Research basis: docs/research/09-app-icon-generation/.
 */
export async function generateAppIcon(
  input: GenerateAppIconInputT
): Promise<AssetGenerationResult> {
  const spec = await enhancePrompt({
    brief: input.brief,
    asset_type: "app_icon",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    transparent: true
  });

  const { mode } = resolveMode(input.mode, "app_icon", spec.target_model, spec.fallback_models);

  if (mode === "inline_svg") {
    return buildInlineSvgPlan("app_icon", input.brief, spec, input.brand_bundle);
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("app_icon", input.brief, spec);
  }

  // api mode
  const outDir = input.output_dir ?? resolve(CONFIG.outputDir, `app-icon-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  const seed = typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0;
  const cacheKey = computeCacheKey({
    model: spec.target_model,
    seed,
    prompt: spec.rewritten_prompt,
    params: spec.params
  });

  const genResult = await generate(spec.target_model, {
    prompt: spec.rewritten_prompt,
    width: 1024,
    height: 1024,
    seed,
    transparency: true,
    output_format: "png"
  });

  let masterPng = genResult.image;
  if (!genResult.native_rgba) {
    const m = await matte({ image: masterPng });
    masterPng = m.image;
  }

  const exportResult = await exportAppIconBundle({
    masterPng,
    platforms: input.platforms,
    outDir,
    ios18Appearances: input.ios_18_appearances,
    ...(input.brand_bundle?.palette?.[0] && { flattenColor: input.brand_bundle.palette[0] }),
    ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette })
  });

  const validation = await tier0({
    image: masterPng,
    asset_type: "app_icon",
    expected_width: 1024,
    expected_height: 1024,
    transparency_required: true,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "app_icon",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants: exportResult.files.map((f) => ({
      path: f.path,
      format: f.kind.includes(".json") ? "json" : f.kind.includes(".xml") ? "xml" : "png",
      bytes: f.bytes
    })),
    provenance: {
      model: genResult.model,
      seed,
      prompt_hash: cacheKey.prompt_hash,
      params_hash: cacheKey.params_hash
    },
    validations: validation,
    warnings: [...spec.warnings, ...validation.warnings, ...exportResult.warnings]
  };
}
