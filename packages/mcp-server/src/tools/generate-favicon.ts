import { resolve } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";
import { enhancePrompt } from "./enhance-prompt.js";
import { generate } from "../providers/index.js";
import { matte } from "../pipeline/matte.js";
import { vectorize } from "../pipeline/vectorize.js";
import { tier0 } from "../pipeline/validate.js";
import { exportFaviconBundle } from "../pipeline/export.js";
import { computeCacheKey } from "../cache.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { loadSharp } from "../pipeline/sharp.js";
import {
  resolveMode,
  buildInlineSvgPlan,
  buildExternalPromptPlan,
  chooseApiTargetOrFallback
} from "./mode-runtime.js";
import { safeReadPath, safeWritePath } from "../security/paths.js";
import { assertSafeSvg } from "../security/svg-sanitize.js";
import type { GenerateFaviconInputT } from "../schemas.js";
import type { AssetGenerationResult } from "../types.js";

/**
 * Tool: asset_generate_favicon
 *
 * Three modes. See src/modes.ts.
 * Research basis: docs/research/11-favicon-web-assets/.
 *
 * In api mode: produces favicon-{16,32,48}.png + icon.svg (+ icon-dark.svg)
 * + apple-touch-icon.png + PWA 192/512/512-maskable + <link> snippet.
 * In inline_svg mode: caller gets a 32×32 authoring brief, emits icon.svg.
 * In external mode: caller gets prompt + paste targets; after generating
 * the mark, call asset_ingest_external with asset_type="favicon" to run
 * the vectorize + export bundle.
 */
export async function generateFavicon(
  input: GenerateFaviconInputT
): Promise<AssetGenerationResult> {
  // Fast path: user already has an SVG mark. No routing needed; skip straight
  // to api-mode pipeline (export bundle).
  if (input.existing_mark_svg) {
    return runApiFromExistingSvg(input);
  }

  const spec = await enhancePrompt({
    brief: input.brief,
    asset_type: "favicon",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    transparent: true,
    vector: true
  });

  const { mode } = resolveMode(input.mode, "favicon", spec.target_model, spec.fallback_models);

  if (mode === "inline_svg") {
    return buildInlineSvgPlan("favicon", input.brief, spec, input.brand_bundle);
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("favicon", input.brief, spec);
  }

  return runApi(input, spec);
}

// ─── api-mode helpers (preserve existing behavior) ─────────────────────────

async function runApi(
  input: GenerateFaviconInputT,
  spec: Awaited<ReturnType<typeof enhancePrompt>>
): Promise<AssetGenerationResult> {
  const chosen = chooseApiTargetOrFallback("favicon", input.brief, spec);
  if (chosen.kind === "external") return chosen.plan;
  const apiModel = chosen.model;

  const outDir = safeWritePath(
    input.output_dir ?? resolve(CONFIG.outputDir, `favicon-${Date.now()}`)
  );
  mkdirSync(outDir, { recursive: true });

  const warnings: string[] = [...spec.warnings, ...chosen.warnings];
  let masterPng: Buffer;
  let masterSvg: string | undefined;

  const seed = typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0;
  const ck = computeCacheKey({
    model: apiModel,
    seed,
    prompt: spec.rewritten_prompt,
    params: spec.params
  });
  const prompt_hash = ck.prompt_hash;
  const params_hash = ck.params_hash;

  const gen = await generate(apiModel, {
    prompt: spec.rewritten_prompt,
    width: 1024,
    height: 1024,
    seed,
    transparency: true,
    output_format: apiModel.startsWith("recraft") ? "svg" : "png"
  });
  const model = gen.model;

  if (gen.format === "svg") {
    masterSvg = gen.image.toString("utf-8");
    const sharp = await loadSharp();
    masterPng = sharp
      ? await sharp(Buffer.from(masterSvg)).resize(1024, 1024).png().toBuffer()
      : Buffer.alloc(0);
  } else {
    masterPng = gen.image;
    if (!gen.native_rgba) {
      const m = await matte({ image: masterPng });
      masterPng = m.image;
    }
    const vec = await vectorize({ image: masterPng, palette_size: 4, max_paths: 40 });
    masterSvg = vec.svg;
    warnings.push(...vec.warnings);
  }

  const masterSvgDark = input.dark_mode && masterSvg ? deriveDarkSvg(masterSvg) : undefined;

  const result = await exportFaviconBundle({
    masterPng,
    ...(masterSvg && { masterSvg }),
    ...(masterSvgDark && { masterSvgDark }),
    outDir,
    ...(input.brand_bundle?.palette?.[0] && { flattenColor: input.brand_bundle.palette[0] })
  });

  const validation = await tier0({
    image: masterPng.length > 0 ? masterPng : Buffer.alloc(1),
    asset_type: "favicon",
    transparency_required: true,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "favicon",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants: result.files.map((f) => ({
      path: f.path,
      format: f.kind.includes("svg") ? "svg" : f.kind.includes("html") ? "html" : "png",
      bytes: f.bytes
    })),
    provenance: { model, seed, prompt_hash, params_hash },
    validations: validation,
    warnings: [...warnings, ...validation.warnings, ...result.warnings]
  };
}

async function runApiFromExistingSvg(input: GenerateFaviconInputT): Promise<AssetGenerationResult> {
  const outDir = safeWritePath(
    input.output_dir ?? resolve(CONFIG.outputDir, `favicon-${Date.now()}`)
  );
  mkdirSync(outDir, { recursive: true });
  const markPath = safeReadPath(input.existing_mark_svg!);
  const masterSvg = readFileSync(markPath, "utf-8");
  assertSafeSvg(masterSvg);
  const sharp = await loadSharp();
  const masterPng = sharp
    ? await sharp(Buffer.from(masterSvg)).resize(1024, 1024).png().toBuffer()
    : Buffer.alloc(0);
  const masterSvgDark = input.dark_mode ? deriveDarkSvg(masterSvg) : undefined;
  const result = await exportFaviconBundle({
    masterPng,
    masterSvg,
    ...(masterSvgDark && { masterSvgDark }),
    outDir,
    ...(input.brand_bundle?.palette?.[0] && { flattenColor: input.brand_bundle.palette[0] })
  });
  const validation = await tier0({
    image: masterPng.length > 0 ? masterPng : Buffer.alloc(1),
    asset_type: "favicon",
    transparency_required: true,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });
  return {
    mode: "api",
    asset_type: "favicon",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants: result.files.map((f) => ({
      path: f.path,
      format: f.kind.includes("svg") ? "svg" : f.kind.includes("html") ? "html" : "png",
      bytes: f.bytes
    })),
    provenance: { model: "existing-svg", seed: 0, prompt_hash: "", params_hash: "" },
    validations: validation,
    warnings: [...validation.warnings, ...result.warnings]
  };
}

function deriveDarkSvg(light: string): string {
  return light.replace(/fill="#([0-9a-fA-F]{6})"/g, (_, hex) => {
    const r = 255 - parseInt(hex.slice(0, 2), 16);
    const g = 255 - parseInt(hex.slice(2, 4), 16);
    const b = 255 - parseInt(hex.slice(4, 6), 16);
    const inv = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return `fill="${inv}"`;
  });
}
