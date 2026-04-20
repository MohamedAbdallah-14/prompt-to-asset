import { resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { loadSharp } from "../pipeline/sharp.js";
import { safeReadPath, safeWritePath } from "../security/paths.js";
import { assertSafeSvg } from "../security/svg-sanitize.js";
import type { GenerateSplashScreenInputT } from "../schemas.js";
import type { AssetGenerationResult } from "../types.js";

/**
 * Tool: asset_generate_splash_screen
 *
 * A splash screen is a centered brand mark on a flat background emitted at
 * platform-specific sizes. We do NOT diffusion-generate the splash as a whole
 * — the mark should be the same brand mark the app already uses. So:
 *
 *   - If `existing_mark_svg` is provided, raster it and center on the background.
 *   - Otherwise generate a mark via the standard illustration path and composite.
 *
 * Output bundle:
 *   - ios/LaunchScreen-2732.png (single reference PNG for LaunchScreen.storyboard)
 *   - android/splash-{m,h,xh,xxh,xxxh}dpi.png
 *   - pwa/splash-1200.png (for webmanifest "splash_screens")
 *   - README.md explaining what to do with each.
 */
export async function generateSplashScreen(
  input: GenerateSplashScreenInputT
): Promise<AssetGenerationResult> {
  const spec = await enhancePrompt({
    brief: input.brief,
    asset_type: "splash_screen",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  const { mode } = resolveMode(
    input.mode,
    "splash_screen",
    spec.target_model,
    spec.fallback_models
  );

  if (mode === "inline_svg") {
    throw new Error(
      "mode=inline_svg is not supported for asset_generate_splash_screen — splash screens are platform-specific PNG bundles. Generate a logo inline_svg first, save it, then call this tool with existing_mark_svg pointing at the saved SVG."
    );
  }

  if (mode === "external_prompt_only") {
    return buildExternalPromptPlan("splash_screen", input.brief, spec);
  }

  // api mode: produce a 1024² master mark, then fan out to platform sizes.
  const outDir = safeWritePath(
    input.output_dir ?? resolve(CONFIG.outputDir, `splash-${Date.now()}`)
  );
  mkdirSync(outDir, { recursive: true });

  const background = input.background_color ?? input.brand_bundle?.palette?.[0] ?? "#ffffff";
  const warnings: string[] = [...spec.warnings];

  const sharp = await loadSharp();
  if (!sharp) {
    throw new Error(
      "sharp is required for splash screen generation. Install the optional dep: `npm install sharp`."
    );
  }

  // 1. Get the 1024² mark.
  let markPng: Buffer;
  let modelUsed = "splash-composite";
  let seed = 0;
  let prompt_hash = "";
  let params_hash = "";

  if (input.existing_mark_svg) {
    const svgText = readFileSync(safeReadPath(input.existing_mark_svg), "utf-8");
    assertSafeSvg(svgText);
    markPng = await sharp(Buffer.from(svgText), { density: 600 })
      .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } else {
    const chosen = chooseApiTargetOrFallback("splash_screen", input.brief, spec);
    if (chosen.kind === "external") return chosen.plan;
    const apiModel = chosen.model;
    warnings.push(...chosen.warnings);

    const initialSeed = typeof spec.params["seed"] === "number" ? spec.params["seed"] : 0;
    const ck = computeCacheKey({
      model: apiModel,
      seed: initialSeed,
      prompt: spec.rewritten_prompt,
      params: spec.params
    });
    prompt_hash = ck.prompt_hash;
    params_hash = ck.params_hash;
    const gen = await generate(apiModel, {
      prompt: spec.rewritten_prompt,
      width: 1024,
      height: 1024,
      seed: initialSeed,
      ...(input.brand_bundle?.style_refs && { reference_images: input.brand_bundle.style_refs }),
      ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette }),
      ...(input.brand_bundle?.lora && { lora: input.brand_bundle.lora }),
      output_format: "png"
    });
    markPng = gen.image;
    modelUsed = gen.model;
    seed = gen.seed;
  }

  const platformSet = new Set(
    input.platforms.includes("all") ? ["ios", "android", "pwa"] : input.platforms
  );

  const variants: Array<{
    path: string;
    format: string;
    width?: number;
    height?: number;
    bytes?: number;
  }> = [];

  // Helper: composite mark centered at 40% of the canvas onto a flat background.
  async function composite(targetW: number, targetH: number): Promise<Buffer> {
    const markSize = Math.round(Math.min(targetW, targetH) * 0.4);
    const resizedMark = await sharp!(markPng)
      .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return sharp!({
      create: { width: targetW, height: targetH, channels: 3, background }
    })
      .composite([
        {
          input: resizedMark,
          left: Math.round((targetW - markSize) / 2),
          top: Math.round((targetH - markSize) / 2)
        }
      ])
      .png()
      .toBuffer();
  }

  if (platformSet.has("ios")) {
    const iosDir = resolve(outDir, "ios");
    mkdirSync(iosDir, { recursive: true });
    const buf = await composite(2732, 2732);
    const p = resolve(iosDir, "LaunchScreen-2732.png");
    writeFileSync(p, buf);
    variants.push({ path: p, format: "png", width: 2732, height: 2732, bytes: buf.length });
    warnings.push(
      "iOS: LaunchScreen.storyboard is the modern way to do a launch screen. Use LaunchScreen-2732.png as the centered image in an Image View with backgroundColor = " +
        background +
        "."
    );
  }

  if (platformSet.has("android")) {
    const andDir = resolve(outDir, "android");
    mkdirSync(andDir, { recursive: true });
    const androidDpi: Array<{ dir: string; px: number }> = [
      { dir: "mipmap-mdpi", px: 192 },
      { dir: "mipmap-hdpi", px: 288 },
      { dir: "mipmap-xhdpi", px: 384 },
      { dir: "mipmap-xxhdpi", px: 576 },
      { dir: "mipmap-xxxhdpi", px: 768 }
    ];
    for (const d of androidDpi) {
      const dir = resolve(andDir, d.dir);
      mkdirSync(dir, { recursive: true });
      const buf = await composite(d.px, d.px);
      const p = resolve(dir, "splash.png");
      writeFileSync(p, buf);
      variants.push({ path: p, format: "png", width: d.px, height: d.px, bytes: buf.length });
    }
    const themeXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App.Starting" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">${background}</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/splash</item>
        <item name="postSplashScreenTheme">@style/Theme.App</item>
    </style>
</resources>
`;
    const themePath = resolve(andDir, "themes-splash.xml");
    writeFileSync(themePath, themeXml);
    variants.push({ path: themePath, format: "xml", bytes: Buffer.byteLength(themeXml) });
  }

  if (platformSet.has("pwa")) {
    const pwaDir = resolve(outDir, "pwa");
    mkdirSync(pwaDir, { recursive: true });
    const buf = await composite(1200, 1200);
    const p = resolve(pwaDir, "splash-1200.png");
    writeFileSync(p, buf);
    variants.push({ path: p, format: "png", width: 1200, height: 1200, bytes: buf.length });
  }

  const readme = `# Splash screens

Generated by \`asset_generate_splash_screen\`.

## iOS

\`ios/LaunchScreen-2732.png\` is a square centered mark for use inside a \`LaunchScreen.storyboard\`. In Xcode:

1. Create a \`LaunchScreen.storyboard\` with a single \`UIImageView\` pinned to the safe area center.
2. Set the background color of the view controller to \`${background}\`.
3. Drop \`LaunchScreen-2732.png\` into \`Assets.xcassets\` and reference it from the image view.

## Android (API 31+)

Android 12+ uses the system \`SplashScreen\` API. Wire in \`themes-splash.xml\` — set your app's launcher theme's parent to \`Theme.App.Starting\`.

The \`mipmap-*dpi/splash.png\` files are drawables the system shows as the animated icon slot.

## PWA

Add this to your \`manifest.webmanifest\`:

\`\`\`json
"splash_screens": [
  { "src": "/pwa/splash-1200.png", "sizes": "1200x1200", "type": "image/png" }
]
\`\`\`

iOS Safari still needs individual \`apple-touch-startup-image\` link tags per device; those are a legacy footgun we do NOT generate.
`;
  const readmePath = resolve(outDir, "README.md");
  writeFileSync(readmePath, readme);
  variants.push({ path: readmePath, format: "md", bytes: Buffer.byteLength(readme) });

  const validation = await tier0({
    image: markPng,
    asset_type: "splash_screen",
    transparency_required: false,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  return {
    mode: "api",
    asset_type: "splash_screen",
    brief: input.brief,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: { model: modelUsed, seed, prompt_hash, params_hash },
    validations: validation,
    warnings
  };
}
