import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderOg } from "../pipeline/og-render.js";
import { generate } from "../providers/index.js";
import { tier0 } from "../pipeline/validate.js";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { resolveMode, buildExternalPromptPlan } from "./mode-runtime.js";
import { resolvePasteTargets } from "../paste-targets.js";
import type { GenerateOgImageInputT } from "../schemas.js";
import type { AssetGenerationResult, AssetSpec } from "../types.js";

/**
 * Tool: asset_generate_og_image
 *
 * OG cards are fundamentally a typography-layout problem, not a diffusion
 * problem — research angle: Satori + @resvg/resvg-js is the production
 * pattern. So the mode matrix is different here:
 *   - api: render server-side with Satori template. Zero external key
 *     needed for the template itself (font loading is local). If the user
 *     asks for a diffusion-generated background hero, that sub-call needs
 *     a Flux / OpenAI / similar key.
 *   - external_prompt_only: only meaningful when with_background_image is
 *     set — the user pastes the hero-background prompt into Flux/etc.
 *   - inline_svg: not offered (web-font loading + text layout beyond
 *     practical LLM reach).
 */
export async function generateOgImage(
  input: GenerateOgImageInputT
): Promise<AssetGenerationResult> {
  // If the caller explicitly chose external_prompt_only (likely because
  // they want hero-background generation but have no Flux key), return the
  // paste plan for the background brief.
  if (input.mode === "external_prompt_only") {
    if (!input.with_background_image || !input.background_brief) {
      throw new Error(
        "mode=external_prompt_only on asset_generate_og_image requires with_background_image=true and a background_brief (that's the only part of the OG pipeline that goes through diffusion; the template itself renders server-side)."
      );
    }
    const bgSpec: AssetSpec = {
      asset_type: "og_image",
      brief: input.background_brief,
      rewritten_prompt: `${input.background_brief}. Cinematic, no text, no UI, subtle, dark, leaves generous space in the center-left for a headline.`,
      target_model: "flux-pro",
      fallback_models: ["gpt-image-1", "imagen-4"],
      params: {},
      postprocess: [],
      safe_zone: null,
      dimensions: { width: 1200, height: 630 },
      transparency_required: false,
      vector_required: false,
      text_content: null,
      modes_available: ["external_prompt_only"],
      paste_targets: resolvePasteTargets("flux-pro").primary_targets,
      warnings: []
    };
    return buildExternalPromptPlan("og_image", input.background_brief, bgSpec);
  }

  // Block inline_svg explicitly with a clear reason.
  if (input.mode === "inline_svg") {
    throw new Error(
      "mode=inline_svg is not supported for asset_generate_og_image. " +
        "OG images require web-font loading and precise text layout; Satori-based api mode handles this server-side. " +
        "Use mode=api (default) or mode=external_prompt_only with a diffusion background."
    );
  }

  // api mode — Satori template, optional diffusion background.
  // modes.ts asserts api is always listed for og_image, but validate availability
  // for the diffusion sub-call when requested.
  if (input.mode === "api" || input.mode === undefined) {
    if (input.with_background_image && input.background_brief) {
      // resolveMode will throw if flux / openai / imagen aren't available.
      resolveMode("api", "hero", "flux-pro", ["gpt-image-1", "imagen-4"]);
    }
  }

  const outDir = input.output_dir ?? resolve(CONFIG.outputDir, `og-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });

  let backgroundImage: Buffer | undefined;
  if (input.with_background_image && input.background_brief) {
    const bg = await generate("flux-pro", {
      prompt: `${input.background_brief}. Cinematic, no text, no UI, subtle, dark, leaves generous space in the center-left for a headline.`,
      width: 1200,
      height: 630,
      seed: 0,
      transparency: false,
      output_format: "png"
    });
    backgroundImage = bg.image;
  }

  const result = await renderOg({
    title: input.title,
    ...(input.subtitle && { subtitle: input.subtitle }),
    template: input.template,
    ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette }),
    ...(input.brand_bundle?.logo_mark && { logoSvg: input.brand_bundle.logo_mark }),
    ...(input.brand_bundle?.typography?.primary && {
      fontFamily: input.brand_bundle.typography.primary
    }),
    ...(backgroundImage && { backgroundImage })
  });

  const pngPath = resolve(outDir, "og.png");
  const svgPath = resolve(outDir, "og.svg");
  if (result.png.length > 0) writeFileSync(pngPath, result.png);
  writeFileSync(svgPath, result.svg);

  const validation = await tier0({
    image: result.png.length > 0 ? result.png : Buffer.from(result.svg),
    asset_type: "og_image",
    expected_width: 1200,
    expected_height: 630,
    transparency_required: false,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "og_image",
    brief: `${input.template}: ${input.title}`,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants: [
      ...(result.png.length > 0
        ? [{ path: pngPath, format: "png", width: 1200, height: 630, bytes: result.png.length }]
        : []),
      { path: svgPath, format: "svg", bytes: result.svg.length }
    ],
    provenance: { model: "satori+resvg", seed: 0, prompt_hash: "", params_hash: "" },
    validations: validation,
    warnings: [...result.warnings, ...validation.warnings]
  };
}
