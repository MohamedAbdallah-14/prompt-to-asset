import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { enhancePrompt } from "./enhance-prompt.js";
import { generate } from "../providers/index.js";
import { tier0 } from "../pipeline/validate.js";
import { computeCacheKey } from "../cache.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import {
  resolveMode,
  buildExternalPromptPlan,
  chooseApiTargetOrFallback
} from "./mode-runtime.js";
import type { GenerateIllustrationInputT } from "../schemas.js";
import type { AssetGenerationResult } from "../types.js";

/**
 * Tool: asset_generate_illustration
 *
 * Illustrations need complex pixel content — freehand shapes, soft
 * shading, compositional depth. inline_svg is out (path budget too small
 * for a full scene). So the mode matrix is two-way:
 *   - external_prompt_only: prompt + paste targets (Flux, Ideogram, MJ).
 *   - api: Flux-pro / Flux.2 with optional brand-LoRA / ref images / style_id.
 *
 * Research basis: docs/research/10-ui-illustrations-graphics/,
 *                docs/research/15-style-consistency-brand/.
 */
export async function generateIllustration(
  input: GenerateIllustrationInputT
): Promise<AssetGenerationResult> {
  const { width, height } = aspectToPixels(input.aspect_ratio);

  const spec = await enhancePrompt({
    brief: input.brief,
    asset_type: "illustration",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  const { mode } = resolveMode(input.mode, "illustration", spec.target_model, spec.fallback_models);

  if (mode === "inline_svg") {
    // Modes.ts doesn't list inline_svg for illustration, so resolveMode
    // will have already thrown if the caller asked for it. Belt-and-braces.
    throw new Error(
      "mode=inline_svg is not supported for asset_generate_illustration — path budget insufficient for a composed scene. Use external_prompt_only or api."
    );
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("illustration", input.brief, spec);
  }

  // api mode
  const chosen = chooseApiTargetOrFallback("illustration", input.brief, spec, {
    images: input.count
  });
  if (chosen.kind === "external") return chosen.plan;
  const apiModel = chosen.model;

  const outDir = input.output_dir ?? resolve(CONFIG.outputDir, `illustration-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  const variants: Array<{
    path: string;
    format: string;
    width?: number;
    height?: number;
    bytes?: number;
  }> = [];
  const warnings: string[] = [...spec.warnings, ...chosen.warnings];
  let modelUsed = apiModel;
  let firstSeed = 0;
  let prompt_hash = "";
  let params_hash = "";

  for (let i = 0; i < input.count; i++) {
    const seed = (typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0) + i * 1000003;
    const ck = computeCacheKey({
      model: apiModel,
      seed,
      prompt: spec.rewritten_prompt,
      params: spec.params
    });
    if (i === 0) {
      firstSeed = seed;
      prompt_hash = ck.prompt_hash;
      params_hash = ck.params_hash;
    }

    const gen = await generate(apiModel, {
      prompt: spec.rewritten_prompt,
      width,
      height,
      seed,
      ...(input.brand_bundle?.style_refs && { reference_images: input.brand_bundle.style_refs }),
      ...(input.brand_bundle?.style_id && { style_id: input.brand_bundle.style_id }),
      ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette }),
      ...(input.brand_bundle?.lora && { lora: input.brand_bundle.lora }),
      output_format: "png"
    });
    modelUsed = gen.model;

    const p = resolve(outDir, `illustration-${String(i + 1).padStart(2, "0")}.png`);
    writeFileSync(p, gen.image);
    variants.push({ path: p, format: "png", width, height, bytes: gen.image.length });
  }

  const validation = await tier0({
    image: Buffer.alloc(1),
    asset_type: "illustration",
    expected_width: width,
    expected_height: height,
    transparency_required: false,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "illustration",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: { model: modelUsed, seed: firstSeed, prompt_hash, params_hash },
    validations: validation,
    warnings
  };
}

function aspectToPixels(ar: string): { width: number; height: number } {
  switch (ar) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "4:3":
      return { width: 2048, height: 1536 };
    case "16:9":
      return { width: 1920, height: 1080 };
    case "2:1":
      return { width: 1600, height: 800 };
    case "3:2":
      return { width: 1500, height: 1000 };
    default:
      return { width: 2048, height: 1536 };
  }
}
