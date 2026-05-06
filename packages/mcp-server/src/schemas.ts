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
  "transparent_mark",
  "ui_mockup"
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
  output_dir: z.string().optional(),
  max_retries: z
    .number()
    .int()
    .min(0)
    .max(4)
    .optional()
    .describe(
      "api mode only. Up to N regeneration attempts if tier-0 validation fails. On each attempt the server inspects the failure (alpha missing / checkerboard / palette drift / safe-zone / OCR / contrast) and applies a repair (re-route, palette hex pin, mark-only fallback). Default 0 (no retry). Cap 4 to bound cost."
    )
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

/**
 * Surface types the UI-mockup generator knows how to constrain.
 * These map 1:1 to the catalog in
 * skills/ui-mockup-prompt/references/surface-patterns.md.
 * If omitted, the generator classifies the surface from the brief.
 */
export const UiMockupSurfaceSchema = z.enum([
  "pricing_page",
  "dashboard",
  "settings",
  "onboarding",
  "marketing_landing",
  "form",
  "detail_view",
  "search_results",
  "modal",
  "mobile_home",
  "single_component"
]);

export const GenerateUiMockupInput = z.object({
  brief: z.string().min(3),
  mode: ModeSchema.optional(),
  brand_bundle: BrandBundleSchema.optional(),
  surface_type: UiMockupSurfaceSchema.optional().describe(
    "What kind of UI surface this is. Drives the [Surface job] slot in the prompt — pricing pages need a comparison matrix, dashboards need a KPI strip + F-pattern, settings need grouped sections, onboarding needs ONE primary CTA. If omitted, classified from the brief."
  ),
  aspect_ratio: z
    .enum(["16:9", "9:16", "4:3", "3:2", "1:1", "21:9"])
    .default("16:9")
    .describe(
      "Desktop UI = 16:9, mobile = 9:16, tablet = 4:3 or 3:2. 21:9 for ultra-wide marketing heros only."
    ),
  count: z.number().int().min(1).max(8).default(1),
  reference_images: z
    .array(z.string())
    .max(10)
    .optional()
    .describe(
      "File paths or URLs to brand-reference images. Up to 10. With 3+ refs the router prefers Flux 2 Pro (only model with documented prompt-level ordinal indexing)."
    ),
  aesthetic_direction: z
    .string()
    .optional()
    .describe(
      "Optional override for the [Aesthetic] slot — e.g. 'editorial-magazine', 'brutalist', 'refined-minimal', 'soft-organic', 'industrial', 'archival', 'playful-precision', 'quiet-luxury'. Otherwise inferred from the brief or rotated by surface type to avoid AI-default flatness."
    ),
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
  prompt: z
    .string()
    .optional()
    .describe(
      "The generation prompt, used for tier-1 VQAScore alignment when PROMPT_TO_BUNDLE_VQA_URL is set. If omitted and intended_text is present, we use that. Tier-1 is skipped entirely when neither is available."
    ),
  run_vqa: z
    .boolean()
    .default(false)
    .describe(
      "When true, POST the image + prompt to PROMPT_TO_BUNDLE_VQA_URL for a 0..1 alignment score (VQAScore/Qwen-VL/CLIP-FlanT5). Graceful no-op if the URL isn't set."
    ),
  run_vlm: z.boolean().default(false)
});

export const BrandBundleParseInput = z.object({
  source: z
    .string()
    .describe("Path to brand.md, brand.json, DTCG tokens, or AdCP spec; or raw text to parse")
});

export const TrainBrandLoraInput = z.object({
  name: z.string().min(1).describe("Brand slug. Becomes the LoRA id trigger token."),
  base_model: z
    .string()
    .default("sdxl-1.0")
    .describe(
      "Base model to fine-tune. Supported by typical trainers: sdxl-1.0, flux-1-dev, sd-1.5."
    ),
  training_images: z
    .array(z.string())
    .min(5)
    .max(200)
    .describe(
      "Local filesystem paths to 5-200 brand-consistent images. 20-50 is the sweet spot. Paths go through the same safeReadPath allow-list as the other tools."
    ),
  captions: z
    .array(z.string())
    .optional()
    .describe("Per-image caption overrides. If omitted, the trainer auto-captions."),
  rank: z.number().int().min(4).max(128).default(16).describe("LoRA rank."),
  steps: z.number().int().min(100).max(8000).default(1200).describe("Training steps.")
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

export const DoctorInput = z.object({
  check_data: z
    .boolean()
    .optional()
    .describe(
      "When true, also run the model-registry ↔ routing-table integrity check (equivalent to `p2a doctor --data`). Adds a `data_integrity` field to the response."
    ),
  auto_fix: z
    .boolean()
    .optional()
    .describe(
      "When true, run the auto-installer for missing native binaries (vtracer, potrace). macOS: shells out to `brew install` / `cargo install`. Linux/Windows: returns the commands for the user to run (no sudo). Never touches npm modules — surfaces a reinstall hint instead. Response gains an `auto_fix` field with {steps, still_missing, manual_hints, ok}. Pair with auto_fix_dry_run=true to preview without executing."
    ),
  auto_fix_dry_run: z
    .boolean()
    .optional()
    .describe(
      "Only meaningful when auto_fix=true. When true, plan the steps but do not execute them. Default false."
    )
});

export const ModelsListInput = z.object({
  free: z.boolean().optional().describe("Only zero-key / free-tier models."),
  paid: z.boolean().optional().describe("Only paid direct-API models."),
  paste_only: z
    .boolean()
    .optional()
    .describe("Only paste-only surfaces (Midjourney, Firefly, Krea)."),
  rgba: z.boolean().optional().describe("Only models with native transparent-PNG output."),
  svg: z.boolean().optional().describe("Only models with native SVG output.")
});

export const ModelsInspectInput = z.object({
  id: z
    .string()
    .min(1)
    .describe(
      "Model id or an `aka` alias (e.g. 'gpt-image-1', 'nano-banana', 'ideogram-3-turbo', 'pollinations-flux')."
    )
});

export const ExportBundleInput = z.object({
  master_path: z
    .string()
    .min(1)
    .describe(
      "Absolute path to the 1024² master PNG. Will be resized to 1024² RGBA before fan-out."
    ),
  platforms: z
    .array(z.enum(["ios", "android", "pwa", "favicon", "visionos", "flutter", "all"]))
    .optional()
    .describe(
      "Which platform bundles to emit. Defaults to every platform. 'all' expands to ios+android+pwa+favicon+visionos+flutter."
    ),
  out_dir: z
    .string()
    .optional()
    .describe(
      "Output directory. Defaults to ./assets/bundle-<stem>-<timestamp> so repeated exports don't clobber."
    ),
  bg: z
    .string()
    .optional()
    .describe(
      "Background color hex for iOS 1024 marketing (must be opaque) + Android adaptive BG + favicon apple-touch. Defaults to white."
    ),
  app_name: z.string().optional().describe("Short name written into the PWA manifest."),
  theme: z.string().optional().describe("theme_color hex for the PWA manifest."),
  ios18: z
    .boolean()
    .default(false)
    .describe("When true, also emit iOS 18 dark + tinted 1024² appearance variants.")
});

export const SpriteSheetInput = z.object({
  dir: z
    .string()
    .min(1)
    .describe("Directory containing PNG / WEBP / JPG frames. Sorted by natural filename order."),
  layout: z
    .enum(["grid", "strip"])
    .default("grid")
    .describe("grid = columns x rows; strip = single row."),
  columns: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Number of columns (grid layout only). Defaults to ceil(sqrt(n))."),
  padding: z.number().int().min(0).default(0).describe("Gutter in pixels around each cell."),
  out: z.string().optional().describe("Output PNG path. Defaults to ./sprites.png."),
  atlas: z
    .string()
    .optional()
    .describe(
      "Output atlas JSON path. Defaults to the sheet path with .json extension. TexturePacker-compatible schema."
    )
});

export const NineSliceInput = z.object({
  image: z.string().min(1).describe("Path to the source image."),
  guides: z
    .object({
      left: z.number().int().min(0),
      top: z.number().int().min(0),
      right: z.number().int().min(0),
      bottom: z.number().int().min(0)
    })
    .describe("Pixel offsets from each edge marking the fixed regions."),
  out: z
    .string()
    .optional()
    .describe("Output directory. Defaults to the directory of the input image."),
  android_9patch: z
    .boolean()
    .default(false)
    .describe(
      "Also emit a <name>.9.png with Android 9-patch 1px border encoding stretchable and content regions."
    )
});

export const InitBrandInput = z.object({
  app_name: z
    .string()
    .min(1)
    .describe("The app / brand name. Used in brand.json and the PWA manifest."),
  palette: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      "Brand palette as hex strings (e.g. ['#2563eb', '#ffffff']). Defaults to blue + white if omitted."
    ),
  assets_dir: z
    .string()
    .optional()
    .describe("Where generated assets should live. Defaults to the framework's conventional dir."),
  display_font: z.string().optional().describe("Display font family. Defaults to Inter."),
  body_font: z.string().optional().describe("Body font family. Defaults to Inter."),
  do_not: z
    .array(z.string())
    .optional()
    .describe(
      "Brand constraints the rewriter should inject as negative anchors. Defaults to drop-shadows / heavy-gradients / skeuomorphic-bevels."
    ),
  overwrite: z
    .boolean()
    .default(false)
    .describe("When true, overwrites an existing brand.json. Otherwise reports and leaves it."),
  cwd: z
    .string()
    .optional()
    .describe("Project root. Defaults to process.cwd(). Must be inside the path allow-list.")
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
export type GenerateUiMockupInputT = z.infer<typeof GenerateUiMockupInput>;
export type UiMockupSurface = z.infer<typeof UiMockupSurfaceSchema>;
export type RemoveBackgroundInputT = z.infer<typeof RemoveBackgroundInput>;
export type VectorizeInputT = z.infer<typeof VectorizeInput>;
export type UpscaleRefineInputT = z.infer<typeof UpscaleRefineInput>;
export type ValidateAssetInputT = z.infer<typeof ValidateAssetInput>;
export type BrandBundleParseInputT = z.infer<typeof BrandBundleParseInput>;
export type TrainBrandLoraInputT = z.infer<typeof TrainBrandLoraInput>;
export type CapabilitiesInputT = z.infer<typeof CapabilitiesInput>;
export type IngestExternalInputT = z.infer<typeof IngestExternalInput>;
export type SaveInlineSvgInputT = z.infer<typeof SaveInlineSvgInput>;
export type DoctorInputT = z.infer<typeof DoctorInput>;
export type ModelsListInputT = z.infer<typeof ModelsListInput>;
export type ModelsInspectInputT = z.infer<typeof ModelsInspectInput>;
export type ExportBundleInputT = z.infer<typeof ExportBundleInput>;
export type SpriteSheetInputT = z.infer<typeof SpriteSheetInput>;
export type NineSliceInputT = z.infer<typeof NineSliceInput>;
export type InitBrandInputT = z.infer<typeof InitBrandInput>;
export type ModeT = z.infer<typeof ModeSchema>;
