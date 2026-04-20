import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { matte } from "../pipeline/matte.js";
import { vectorize } from "../pipeline/vectorize.js";
import { tier0 } from "../pipeline/validate.js";
import { loadSharp } from "../pipeline/sharp.js";
import { computeCacheKey } from "../cache.js";
import { safeReadPath, safeWritePath } from "../security/paths.js";
import type { IngestExternalInputT } from "../schemas.js";
import type { AssetBundle, AssetType } from "../types.js";

/**
 * Tool: asset_ingest_external
 *
 * Entry point for the external_prompt_only mode's round trip. The user
 * generated the pixels in Midjourney / Nano Banana / Ideogram web / Recraft /
 * Flux Playground / wherever, saved them locally, and hands the file back
 * to us. From here the pipeline is identical to api-mode post-generation:
 * matte (if transparency expected) → vectorize (if vector expected) →
 * tier-0 validation → content-addressed bundle.
 *
 * We do NOT re-run the provider; the user's chosen tool already made the
 * pixels. We just finish the job.
 *
 * Research basis:
 *   - docs/research/13-transparent-backgrounds/   (matte stage)
 *   - docs/research/16-background-removal-vectorization/
 *   - docs/research/12-vector-svg-generation/
 *   - docs/research/03-evaluation-metrics/3e-asset-specific-eval.md (validation)
 */
export async function ingestExternal(input: IngestExternalInputT): Promise<AssetBundle> {
  // Path-guard both the input (read) and the output (write) surface. These
  // come straight from an untrusted MCP caller; without the guard, a crafted
  // image_path lets the tool read arbitrary files, and a crafted output_dir
  // lets it write anywhere on disk. See src/security/paths.ts.
  const imagePath = safeReadPath(input.image_path);
  const outDir = safeWritePath(
    input.output_dir ?? resolve(CONFIG.outputDir, `ingest-${Date.now()}`)
  );
  mkdirSync(outDir, { recursive: true });

  const buf = Buffer.from(readFileSync(imagePath));
  const assetType = input.asset_type;

  const transparencyExpected = input.transparent ?? defaultTransparency(assetType);
  const vectorExpected = input.vector ?? defaultVector(assetType);

  const warnings: string[] = [];
  let masterPng: Buffer = buf;

  // Stage 0 — restoration pre-pass.
  // Users commonly paste JPEGs saved from Midjourney / Ideogram web /
  // Nano Banana. JPEG's 8×8 DCT blocks produce edge ringing + chroma
  // subsampling fringes that wreck matting (visible as halo rings around
  // the subject in the output alpha). We re-encode to lossless PNG and
  // apply a mild unsharp-mask to restore edge contrast before matte.
  // Skip when the file is already a lossless PNG/WebP/TIFF.
  const ext = extname(imagePath).toLowerCase();
  const lossy = [".jpg", ".jpeg", ".heic", ".heif", ".avif"].includes(ext);
  if (lossy) {
    const sharp = await loadSharp();
    if (sharp) {
      try {
        masterPng = await sharp(masterPng)
          .sharpen({ sigma: 0.6 })
          .png({ compressionLevel: 9 })
          .toBuffer();
        warnings.push(
          `restoration pre-pass: re-encoded ${ext} → PNG with mild sharpen to reduce JPEG edge ringing before matte`
        );
      } catch (e) {
        warnings.push(`restoration pre-pass skipped: ${(e as Error).message}`);
      }
    } else {
      warnings.push(
        `restoration pre-pass skipped: sharp not installed; JPEG compression fringes may produce halos around the matte subject`
      );
    }
  }

  // Stage 1 — matte.
  // We always run matte when transparency is expected; even if the input
  // already has an alpha channel, the matte pipeline's auto-mode no-ops
  // on already-alpha images and returns coverage stats.
  if (transparencyExpected) {
    const matted = await matte({ image: masterPng, mode: "auto" });
    masterPng = Buffer.from(matted.image);
    warnings.push(...matted.warnings);
  }

  // Persist the (possibly mattéd) raster.
  const masterPath = resolve(outDir, "master.png");
  writeFileSync(masterPath, masterPng);

  const variants: AssetBundle["variants"] = [
    {
      path: masterPath,
      format: "png",
      rgba: transparencyExpected,
      bytes: masterPng.length
    }
  ];

  // Stage 2 — vectorize.
  if (vectorExpected) {
    const paletteSize = vectorPaletteBudget(assetType);
    const maxPaths = vectorPathBudget(assetType);
    const vec = await vectorize({
      image: masterPng,
      palette_size: paletteSize,
      max_paths: maxPaths
    });
    const svgPath = resolve(outDir, "mark.svg");
    writeFileSync(svgPath, vec.svg);
    variants.push({
      path: svgPath,
      format: "svg",
      paths: vec.paths_count,
      bytes: vec.svg.length
    });
    warnings.push(...vec.warnings);
  }

  // Stage 3 — tier-0 validation.
  const validation = await tier0({
    image: masterPng,
    asset_type: assetType,
    transparency_required: transparencyExpected,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    ...(input.expected_text && { intended_text: input.expected_text })
  });

  // Stage 4 — provenance. We don't have a prompt here (the user generated
  // the image externally) so the prompt hash is over the ingest params.
  const ck = computeCacheKey({
    model: "external",
    seed: 0,
    prompt: `external-ingest:${imagePath}`,
    params: {
      asset_type: assetType,
      transparent: transparencyExpected,
      vector: vectorExpected
    }
  });

  return {
    mode: "api",
    asset_type: assetType,
    brief: `external:${imagePath}`,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: {
      model: "external",
      seed: 0,
      prompt_hash: ck.prompt_hash,
      params_hash: ck.params_hash
    },
    validations: validation,
    warnings: [
      `ingested external image from ${imagePath}`,
      `matte: ${transparencyExpected ? "applied" : "skipped"}, vectorize: ${vectorExpected ? "applied" : "skipped"}`,
      ...warnings,
      ...validation.warnings
    ]
  };
}

function defaultTransparency(t: AssetType): boolean {
  // Source: rules/asset-enhancer-activate.md (transparency defaults by asset type)
  switch (t) {
    case "logo":
    case "app_icon":
    case "sticker":
    case "transparent_mark":
    case "icon_pack":
    case "favicon":
      return true;
    default:
      return false;
  }
}

function defaultVector(t: AssetType): boolean {
  switch (t) {
    case "logo":
    case "favicon":
    case "icon_pack":
      return true;
    default:
      return false;
  }
}

function vectorPaletteBudget(t: AssetType): number {
  // Source: docs/research/12-vector-svg-generation/ — fewer colors → cleaner SVG.
  switch (t) {
    case "favicon":
      return 3;
    case "icon_pack":
      return 2;
    case "logo":
      return 6;
    default:
      return 6;
  }
}

function vectorPathBudget(t: AssetType): number {
  // Source: rules/asset-enhancer-activate.md fact #3 (≤40 paths for a clean mark).
  switch (t) {
    case "favicon":
      return 8;
    case "icon_pack":
      return 12;
    case "logo":
      return 40;
    default:
      return 80;
  }
}
