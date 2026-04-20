import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { enhancePrompt } from "./enhance-prompt.js";
import { generate } from "../providers/index.js";
import { matte } from "../pipeline/matte.js";
import { vectorize } from "../pipeline/vectorize.js";
import { tier0 } from "../pipeline/validate.js";
import { deriveRepair, repairIsNoop } from "../pipeline/repair.js";
import { computeCacheKey } from "../cache.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import {
  resolveMode,
  buildInlineSvgPlan,
  buildExternalPromptPlan,
  chooseApiTargetOrFallback
} from "./mode-runtime.js";
import type { GenerateLogoInputT } from "../schemas.js";
import type { AssetGenerationResult, AssetBundle, ValidationResult } from "../types.js";

/**
 * Tool: asset_generate_logo
 *
 * Three modes (see src/modes.ts):
 *   - inline_svg           — Claude emits the SVG in-chat. Zero key. Best for
 *                            flat/geometric marks. ≤40 paths.
 *   - external_prompt_only — Returns the prompt + paste targets (Ideogram
 *                            web, Recraft web, ChatGPT). User generates,
 *                            saves, calls asset_ingest_external.
 *   - api                  — Server calls the routed provider (gpt-image-1 /
 *                            Ideogram / Recraft) → matte → vectorize → validate.
 *                            Requires a provider key.
 *
 * Research basis: docs/research/08-logo-generation/ (all angles).
 */
export async function generateLogo(input: GenerateLogoInputT): Promise<AssetGenerationResult> {
  const spec = await enhancePrompt({
    brief: input.brief,
    asset_type: "logo",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    ...(input.text_content !== undefined && { text_content: input.text_content }),
    ...(input.vector !== undefined && { vector: input.vector })
  });

  const { mode } = resolveMode(input.mode, "logo", spec.target_model, spec.fallback_models);

  if (mode === "inline_svg") {
    return buildInlineSvgPlan("logo", input.brief, spec, input.brand_bundle, input.text_content);
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("logo", input.brief, spec, {
      ...(input.text_content && { expected_text: input.text_content })
    });
  }

  // ─── api mode ──────────────────────────────────────────────────────────
  // Soft-fall-back if the routed primary is paste-only and no fallback has a key.
  const chosen = chooseApiTargetOrFallback("logo", input.brief, spec, {
    ...(input.text_content && { expected_text: input.text_content })
  });
  if (chosen.kind === "external") return chosen.plan;

  const outDir = input.output_dir ?? resolve(CONFIG.outputDir, `logo-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  const retries = Math.min(4, Math.max(0, input.max_retries ?? 0));
  const triedModels = new Set<string>();
  const attemptLog: string[] = [];
  let lastDiagnosticKey = "";

  let currentModel = chosen.model;
  let currentPrompt = spec.rewritten_prompt;
  let currentText: string | undefined = input.text_content;
  let best: (AssetBundle & { _score: number }) | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    triedModels.add(currentModel);
    const outcome = await runOnce({
      input,
      spec,
      outDir,
      apiModel: currentModel,
      rewrittenPrompt: currentPrompt,
      textContent: currentText
    });

    const scored = outcome.validation.pass ? 2 : outcome.validation.warnings.length < 3 ? 1 : 0;
    if (!best || scored > best._score) best = { ...outcome.bundle, _score: scored };

    if (outcome.validation.pass) {
      if (attempt > 0) {
        attemptLog.push(`attempt ${attempt + 1}/${retries + 1}: passed after repair.`);
      }
      break;
    }

    if (attempt === retries) {
      attemptLog.push(
        `retry budget exhausted (${retries + 1}/${retries + 1}); returning best-seen result.`
      );
      break;
    }

    const repair = deriveRepair({
      spec,
      validation: outcome.validation,
      tried_models: triedModels,
      ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
    });
    if (!repair || repairIsNoop(repair) || repair.diagnostic_key === lastDiagnosticKey) {
      attemptLog.push(
        `attempt ${attempt + 1}/${retries + 1}: validation failed, no usable repair (convergence). Stopping.`
      );
      break;
    }

    lastDiagnosticKey = repair.diagnostic_key;
    attemptLog.push(
      `attempt ${attempt + 1}/${retries + 1}: ${repair.reason} (diagnostic=${repair.diagnostic_key}).`
    );
    if (repair.new_target_model) currentModel = repair.new_target_model;
    if (repair.drop_text) currentText = undefined;
    if (repair.prompt_additions.length > 0) {
      currentPrompt = [currentPrompt, ...repair.prompt_additions].join(" ");
    }
  }

  const { _score: _discard, ...finalBundle } = best!;
  void _discard;
  return {
    ...finalBundle,
    warnings: [
      ...chosen.warnings,
      ...finalBundle.warnings,
      ...(attemptLog.length > 0 ? ["Regenerate loop:", ...attemptLog.map((l) => `  • ${l}`)] : [])
    ]
  };
}

interface RunOnceArgs {
  input: GenerateLogoInputT;
  spec: Awaited<ReturnType<typeof enhancePrompt>>;
  outDir: string;
  apiModel: string;
  rewrittenPrompt: string;
  textContent: string | undefined;
}

/**
 * Single api-mode pass: generate → matte → vectorize → tier-0 validate.
 * Returns the bundle + validation so the outer loop can decide whether to
 * repair + retry. Keeps all prior behaviour — safe to call once (retry=0).
 */
async function runOnce(
  args: RunOnceArgs
): Promise<{ bundle: AssetBundle; validation: ValidationResult }> {
  const { input, spec, outDir, apiModel, rewrittenPrompt, textContent } = args;

  const seed = typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0;
  const cacheKey = computeCacheKey({
    model: apiModel,
    seed,
    prompt: rewrittenPrompt,
    params: spec.params
  });

  const genResult = await generate(apiModel, {
    prompt: rewrittenPrompt,
    width: spec.dimensions.width,
    height: spec.dimensions.height,
    seed,
    transparency: spec.transparency_required,
    output_format: spec.vector_required && apiModel.startsWith("recraft") ? "svg" : "png",
    ...(spec.params["negative_prompt"] !== undefined && {
      negative_prompt: String(spec.params["negative_prompt"])
    })
  });

  const variants: Array<{
    path: string;
    format: string;
    width?: number;
    height?: number;
    rgba?: boolean;
    paths?: number;
    bytes?: number;
  }> = [];
  let masterPng: Buffer;
  let masterSvg: string | undefined;

  if (genResult.format === "svg") {
    masterSvg = genResult.image.toString("utf-8");
    const svgPath = resolve(outDir, "mark.svg");
    writeFileSync(svgPath, masterSvg);
    variants.push({ path: svgPath, format: "svg", paths: countSvgPaths(masterSvg) });
    const sharpMod = await import("../pipeline/sharp.js");
    const sharp = await sharpMod.loadSharp();
    if (sharp) {
      masterPng = await sharp(Buffer.from(masterSvg)).resize(1024, 1024).png().toBuffer();
      const png = resolve(outDir, "master.png");
      writeFileSync(png, masterPng);
      variants.push({
        path: png,
        format: "png",
        width: 1024,
        height: 1024,
        rgba: true,
        bytes: masterPng.length
      });
    } else {
      masterPng = Buffer.alloc(0);
    }
  } else {
    masterPng = genResult.image;
  }

  if (spec.transparency_required && !genResult.native_rgba && masterPng.length > 0) {
    const matted = await matte({ image: masterPng });
    masterPng = matted.image;
  }

  if (masterPng.length > 0 && !masterSvg) {
    const png = resolve(outDir, "master.png");
    writeFileSync(png, masterPng);
    variants.push({
      path: png,
      format: "png",
      width: spec.dimensions.width,
      height: spec.dimensions.height,
      rgba: true,
      bytes: masterPng.length
    });
  }

  if (spec.vector_required && !masterSvg && masterPng.length > 0) {
    const vec = await vectorize({ image: masterPng, palette_size: 6 });
    const p = resolve(outDir, "mark.svg");
    writeFileSync(p, vec.svg);
    variants.push({ path: p, format: "svg", paths: vec.paths_count });
    // masterSvg is captured on disk; no further use in this scope.
  }

  const validation = await tier0({
    image: masterPng.length > 0 ? masterPng : Buffer.alloc(1),
    asset_type: "logo",
    expected_width: spec.dimensions.width,
    expected_height: spec.dimensions.height,
    transparency_required: spec.transparency_required,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    ...(textContent && { intended_text: textContent })
  });

  const bundle: AssetBundle = {
    mode: "api",
    asset_type: "logo",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: {
      model: genResult.model,
      seed,
      prompt_hash: cacheKey.prompt_hash,
      params_hash: cacheKey.params_hash
    },
    validations: validation,
    warnings: [...spec.warnings, ...validation.warnings]
  };

  return { bundle, validation };
}

function countSvgPaths(svg: string): number {
  const m = svg.match(/<path\b/g);
  return m ? m.length : 0;
}
