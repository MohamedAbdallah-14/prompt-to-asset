import { z } from "zod";

export const AssetTypeSchema = z.enum([
  "logo",
  "app_icon",
  "favicon",
  "og_image",
  "splash_screen",
  "illustration",
  "icon_pack",
  "hero",
  "sticker",
  "transparent_mark"
]);

/**
 * Execution mode for generator tools. See src/modes.ts for semantics.
 * Optional on every generator — when omitted, the server auto-selects
 * (inline_svg > api > external_prompt_only).
 */
export const ModeSchema = z.enum(["inline_svg", "external_prompt_only", "api"]);

export const BrandBundleSchema = z.object({
  palette: z.array(z.string()).default([]),
  style_refs: z.array(z.string()).optional(),
  lora: z.string().optional(),
  sref_code: z.string().optional(),
  style_id: z.string().optional(),
  do_not: z.array(z.string()).optional(),
  logo_mark: z.string().optional(),
  typography: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional()
    })
    .optional()
});

export const EnhancePromptInput = z.object({
  brief: z.string().min(3).describe("Plain-English description of the desired asset"),
  asset_type: AssetTypeSchema.optional().describe(
    "Hint at the asset type; will be inferred if omitted"
  ),
  target_model: z
    .string()
    .optional()
    .describe("Force a specific model; otherwise selected by router"),
  brand_bundle: BrandBundleSchema.optional(),
  transparent: z.boolean().optional(),
  vector: z.boolean().optional(),
  text_content: z
    .string()
    .optional()
    .describe("Literal text to render in the asset (≤3 words recommended)")
});

export const GenerateLogoInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional().describe(
    "Execution mode. inline_svg = Claude authors the SVG (zero key). external_prompt_only = paste into Ideogram/Nano Banana/etc. then call asset_ingest_external. api = server-driven generation (requires provider key). Omit for auto-select."
  ),
  brand_bundle: BrandBundleSchema.optional(),
  text_content: z.string().optional(),
  vector: z.boolean().optional().default(true),
  output_dir: z.string().optional()
});

export const GenerateAppIconInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  platforms: z.array(z.enum(["ios", "android", "pwa", "visionos", "all"])).default(["all"]),
  ios_18_appearances: z
    .boolean()
    .default(false)
    .describe(
      "Emit iOS 18 dark + tinted 1024² variants plus Contents.json `appearances` entries. Dark variant is derived by flattening onto #000 unless you supply a hand-tuned dark master; tinted is a greyscale luminance map recolored by the system."
    ),
  output_dir: z.string().optional()
});

export const GenerateFaviconInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  existing_mark_svg: z
    .string()
    .optional()
    .describe("Path to an existing brand mark SVG to base the favicon on"),
  dark_mode: z.boolean().default(true),
  output_dir: z.string().optional()
});

export const GenerateOgImageInput = z.object({
  title: z.string().min(1),
  mode: ModeSchema.optional(),
  subtitle: z.string().optional(),
  template: z
    .enum(["centered_hero", "left_title", "minimal", "quote", "product_card"])
    .default("centered_hero"),
  brand_bundle: BrandBundleSchema.optional(),
  with_background_image: z.boolean().default(false),
  background_brief: z.string().optional(),
  output_dir: z.string().optional()
});

export const GenerateIllustrationInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  count: z.number().int().min(1).max(20).default(1),
  aspect_ratio: z.enum(["1:1", "4:3", "16:9", "2:1", "3:2"]).default("4:3"),
  output_dir: z.string().optional()
});

export const GenerateSplashScreenInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  existing_mark_svg: z
    .string()
    .optional()
    .describe(
      "Path to an existing brand mark SVG to center on the splash. If omitted, the brief is used to generate a mark first."
    ),
  platforms: z
    .array(z.enum(["ios", "android", "pwa", "all"]))
    .default(["all"])
    .describe(
      "Splash screens are platform-specific. iOS = LaunchScreen.storyboard hint + reference PNG at 2732×2732. Android = splash at 512×512 per mipmap (API 31+). PWA = 1200×1200 in manifest."
    ),
  background_color: z
    .string()
    .optional()
    .describe(
      "Splash background hex. Defaults to brand palette[0] or #ffffff. iOS uses this as the LaunchScreen backgroundColor; Android uses it as windowSplashScreenBackground."
    ),
  output_dir: z.string().optional()
});

export const GenerateHeroInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  aspect_ratio: z.enum(["16:9", "21:9", "3:2", "2:1"]).default("16:9"),
  count: z.number().int().min(1).max(8).default(1),
  output_dir: z.string().optional()
});

export const RemoveBackgroundInput = z.object({
  image: z.string().describe("Path or URL to the input image"),
  mode: z.enum(["auto", "birefnet", "rmbg", "layerdiffuse", "difference", "u2net"]).default("auto"),
  output_dir: z.string().optional()
});

export const VectorizeInput = z.object({
  image: z.string(),
  mode: z.enum(["auto", "recraft", "vtracer", "potrace", "posterize"]).default("auto"),
  palette_size: z.number().int().min(2).max(32).default(6),
  max_paths: z.number().int().min(1).default(200),
  output_dir: z.string().optional()
});

export const UpscaleRefineInput = z.object({
  image: z.string(),
  asset_type: AssetTypeSchema.optional(),
  target_size: z.number().int().min(64).max(8192).default(2048),
  mode: z.enum(["auto", "dat2", "real-esrgan", "supir", "img2img"]).default("auto"),
  output_dir: z.string().optional()
});

export const ValidateAssetInput = z.object({
  image: z.string(),
  asset_type: AssetTypeSchema,
  brand_bundle: BrandBundleSchema.optional(),
  intended_text: z.string().optional(),
  run_vlm: z.boolean().default(false)
});

export const BrandBundleParseInput = z.object({
  source: z
    .string()
    .describe("Path to brand.md, brand.json, DTCG tokens, or AdCP spec; or raw text to parse")
});

export const CapabilitiesInput = z
  .object({
    asset_type: AssetTypeSchema.optional().describe(
      "If provided, narrow the report to modes valid for this asset type."
    )
  })
  .default({});

export const SaveInlineSvgInput = z.object({
  svg: z
    .string()
    .min(10)
    .describe(
      "The full <svg>...</svg> text the hosting LLM wrote in response to an inline_svg brief."
    ),
  asset_type: AssetTypeSchema,
  brand_bundle: BrandBundleSchema.optional(),
  expected_text: z.string().optional(),
  platforms: z
    .array(z.enum(["ios", "android", "pwa", "visionos", "all"]))
    .optional()
    .describe("For asset_type=app_icon, which platform bundles to fan out. Defaults to ['all']."),
  dark_mode: z
    .boolean()
    .default(true)
    .describe(
      "For asset_type=favicon, derive and emit icon-dark.svg alongside icon.svg (for prefers-color-scheme: dark)."
    ),
  app_name: z
    .string()
    .optional()
    .describe("For asset_type=favicon, the name/short_name to write into manifest.webmanifest."),
  theme_color: z
    .string()
    .optional()
    .describe(
      "For asset_type=favicon, the theme_color hex for manifest.webmanifest + <meta name=theme-color>. Defaults to brand palette[0] or flattenColor."
    ),
  background_color: z
    .string()
    .optional()
    .describe(
      "For asset_type=favicon, the background_color hex for manifest.webmanifest (PWA splash). Defaults to #ffffff."
    ),
  output_dir: z
    .string()
    .optional()
    .describe(
      "Where to write master.svg and platform variants. Defaults to the server's asset output dir."
    )
});

export const IngestExternalInput = z.object({
  image_path: z
    .string()
    .describe(
      "Local filesystem path to an image the user generated in an external tool (Midjourney, Nano Banana, Ideogram web, etc.). The server re-enters the pipeline: matte → vectorize (if requested) → validate → bundle."
    ),
  asset_type: AssetTypeSchema,
  brand_bundle: BrandBundleSchema.optional(),
  expected_text: z
    .string()
    .optional()
    .describe(
      "If the asset should contain a wordmark, pass the intended text for OCR Levenshtein validation."
    ),
  vector: z
    .boolean()
    .optional()
    .describe(
      "If true, run the raster-to-SVG vectorization stage. Defaults to true for logo / favicon / icon_pack, false otherwise."
    ),
  transparent: z
    .boolean()
    .optional()
    .describe(
      "If true, run the matte stage. Defaults to true for logo / app_icon / sticker / transparent_mark / icon_pack."
    ),
  output_dir: z.string().optional()
});

export type EnhancePromptInputT = z.infer<typeof EnhancePromptInput>;
export type GenerateLogoInputT = z.infer<typeof GenerateLogoInput>;
export type GenerateAppIconInputT = z.infer<typeof GenerateAppIconInput>;
export type GenerateFaviconInputT = z.infer<typeof GenerateFaviconInput>;
export type GenerateOgImageInputT = z.infer<typeof GenerateOgImageInput>;
export type GenerateIllustrationInputT = z.infer<typeof GenerateIllustrationInput>;
export type GenerateSplashScreenInputT = z.infer<typeof GenerateSplashScreenInput>;
export type GenerateHeroInputT = z.infer<typeof GenerateHeroInput>;
export type RemoveBackgroundInputT = z.infer<typeof RemoveBackgroundInput>;
export type VectorizeInputT = z.infer<typeof VectorizeInput>;
export type UpscaleRefineInputT = z.infer<typeof UpscaleRefineInput>;
export type ValidateAssetInputT = z.infer<typeof ValidateAssetInput>;
export type BrandBundleParseInputT = z.infer<typeof BrandBundleParseInput>;
export type CapabilitiesInputT = z.infer<typeof CapabilitiesInput>;
export type IngestExternalInputT = z.infer<typeof IngestExternalInput>;
export type SaveInlineSvgInputT = z.infer<typeof SaveInlineSvgInput>;
export type ModeT = z.infer<typeof ModeSchema>;
