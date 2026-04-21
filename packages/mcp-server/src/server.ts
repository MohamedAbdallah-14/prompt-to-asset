import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool
} from "@modelcontextprotocol/sdk/types.js";

import {
  EnhancePromptInput,
  GenerateLogoInput,
  GenerateAppIconInput,
  GenerateFaviconInput,
  GenerateOgImageInput,
  GenerateIllustrationInput,
  GenerateSplashScreenInput,
  GenerateHeroInput,
  RemoveBackgroundInput,
  VectorizeInput,
  UpscaleRefineInput,
  ValidateAssetInput,
  BrandBundleParseInput,
  CapabilitiesInput,
  IngestExternalInput,
  SaveInlineSvgInput,
  TrainBrandLoraInput,
  DoctorInput,
  ModelsListInput,
  ModelsInspectInput,
  ExportBundleInput,
  SpriteSheetInput,
  NineSliceInput,
  InitBrandInput
} from "./schemas.js";

import { enhancePrompt } from "./tools/enhance-prompt.js";
import { generateLogo } from "./tools/generate-logo.js";
import { generateAppIcon } from "./tools/generate-app-icon.js";
import { generateFavicon } from "./tools/generate-favicon.js";
import { generateOgImage } from "./tools/generate-og-image.js";
import { generateIllustration } from "./tools/generate-illustration.js";
import { generateSplashScreen } from "./tools/generate-splash-screen.js";
import { generateHero } from "./tools/generate-hero.js";
import { removeBackground } from "./tools/remove-background.js";
import { vectorizeImage } from "./tools/vectorize.js";
import { upscaleRefine } from "./tools/upscale-refine.js";
import { validateAsset } from "./tools/validate-asset.js";
import { brandBundleParse } from "./tools/brand-bundle-parse.js";
import { capabilities } from "./tools/capabilities.js";
import { ingestExternal } from "./tools/ingest-external.js";
import { saveInlineSvg } from "./tools/save-inline-svg.js";
import { trainBrandLora } from "./tools/train-brand-lora.js";
import { doctor } from "./tools/doctor.js";
import { modelsList, modelsInspect } from "./tools/models.js";
import { exportBundle } from "./tools/export-bundle.js";
import { spriteSheet } from "./tools/sprite-sheet.js";
import { nineSlice } from "./tools/nine-slice.js";
import { initBrand } from "./tools/init-brand.js";

export const TOOLS: Tool[] = [
  {
    name: "asset_capabilities",
    description:
      "Report which of the three execution modes this server can run RIGHT NOW given the current env: inline_svg (zero key — hosting LLM authors the SVG), external_prompt_only (zero key — paste prompt into Ideogram/Nano Banana/Midjourney/Recraft/Flux UIs, then asset_ingest_external), api (requires provider key). Read-only; no network. Call before offering the user options.",
    inputSchema: {
      type: "object",
      properties: {
        asset_type: {
          type: "string",
          enum: [
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
          ],
          description: "Narrow the modes-by-asset-type section to one type."
        }
      },
      required: []
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "asset_enhance_prompt",
    description:
      "Classify an asset brief, route to the right model, rewrite the prompt in that model's dialect, and report which execution modes are available (inline_svg / external_prompt_only / api). Returns an AssetSpec JSON including modes_available, optional svg_brief (for inline_svg), optional paste_targets (for external_prompt_only), and — when the brief leaves a material ambiguity — a `clarifying_questions[]` array the host LLM should surface via AskUserQuestion (or the equivalent) BEFORE calling a generator. Each entry has {id, header, question, options[], required, why}. Read-only; idempotent; no network.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string", description: "Plain-English description of the desired asset" },
        asset_type: {
          type: "string",
          enum: [
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
          ]
        },
        target_model: {
          type: "string",
          description: "Force a specific model; otherwise selected by router"
        },
        brand_bundle: { type: "object" },
        transparent: { type: "boolean" },
        vector: { type: "boolean" },
        text_content: { type: "string", description: "Literal text to render in the asset" }
      },
      required: ["brief"]
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "asset_generate_logo",
    description:
      "Generate a logo. Three modes: inline_svg (Claude emits SVG — zero key), external_prompt_only (returns prompt + paste targets — zero key), api (server runs the provider pipeline — requires key). Omit mode to auto-select. Returns an AssetBundle / InlineSvgPlan / ExternalPromptPlan discriminated by the mode field.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["inline_svg", "external_prompt_only", "api"],
          description:
            "Execution mode. Omit for auto-select (prefers inline_svg → api → external_prompt_only)."
        },
        brand_bundle: { type: "object" },
        text_content: { type: "string" },
        vector: { type: "boolean", default: true },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_app_icon",
    description:
      "Generate an app icon (iOS AppIconSet, Android adaptive, PWA maskable, visionOS 1024² master + placeholder parallax layers). Three modes (inline_svg / external_prompt_only / api). In non-api modes only the master mark is produced; call asset_ingest_external afterwards to run the platform fan-out. Set ios_18_appearances=true to also emit dark and tinted 1024² variants for iOS 18 tintable icons.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["inline_svg", "external_prompt_only", "api"]
        },
        brand_bundle: { type: "object" },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["ios", "android", "pwa", "visionos", "all"] },
          default: ["all"]
        },
        ios_18_appearances: {
          type: "boolean",
          default: false,
          description:
            "Also emit iOS 18 dark (flattened on #000) and tinted (greyscale luminance map) 1024² variants and add `appearances` to Contents.json."
        },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_favicon",
    description:
      "Generate a favicon bundle (favicon-{16,32,48}.png + icon.svg + icon-dark.svg + apple-touch + PWA 192/512/512-maskable + <link> snippet). Three modes — inline_svg is the best fit for simple glyph marks (legible at 16×16).",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["inline_svg", "external_prompt_only", "api"]
        },
        brand_bundle: { type: "object" },
        existing_mark_svg: { type: "string" },
        dark_mode: { type: "boolean", default: true },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_og_image",
    description:
      "Render a 1200×630 OG image via Satori template (deterministic typography, no diffusion). Default mode=api renders server-side without any API key. external_prompt_only is only meaningful when with_background_image is set. inline_svg is not supported (web-font loading + precise text layout beyond LLM reach).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        mode: {
          type: "string",
          enum: ["inline_svg", "external_prompt_only", "api"]
        },
        subtitle: { type: "string" },
        template: {
          type: "string",
          enum: ["centered_hero", "left_title", "minimal", "quote", "product_card"],
          default: "centered_hero"
        },
        brand_bundle: { type: "object" },
        with_background_image: { type: "boolean", default: false },
        background_brief: { type: "string" },
        output_dir: { type: "string" }
      },
      required: ["title"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_illustration",
    description:
      "Generate one or more brand-locked illustrations. Two modes (external_prompt_only / api); inline_svg is not supported — path budget too small for a composed scene. Injects brand bundle (palette, style_refs, LoRA, style_id) where supported.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["external_prompt_only", "api"]
        },
        brand_bundle: { type: "object" },
        count: { type: "integer", minimum: 1, maximum: 20, default: 1 },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "4:3", "16:9", "2:1", "3:2"],
          default: "4:3"
        },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_splash_screen",
    description:
      "Generate a cross-platform splash-screen bundle from a brand mark. Two modes (external_prompt_only / api); inline_svg is not supported (splash screens are PNG bundles — generate a logo inline_svg first, then call this with existing_mark_svg). api mode composites the mark onto background_color and emits ios/LaunchScreen-2732.png, android/mipmap-*dpi/splash.png, android/themes-splash.xml, pwa/splash-1200.png, and a README describing how to wire each.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["external_prompt_only", "api"]
        },
        brand_bundle: { type: "object" },
        existing_mark_svg: {
          type: "string",
          description:
            "Path to an existing brand-mark SVG to center on the splash. Preferred over regenerating."
        },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["ios", "android", "pwa", "all"] },
          default: ["all"]
        },
        background_color: { type: "string" },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_generate_hero",
    description:
      "Generate marketing-hero / landing-page banner art. Two modes (external_prompt_only / api); inline_svg is not supported. Accepts aspect_ratio (16:9 / 21:9 / 3:2 / 2:1). Injects brand bundle where supported. Returns N variants if count>1.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string" },
        mode: {
          type: "string",
          enum: ["external_prompt_only", "api"]
        },
        brand_bundle: { type: "object" },
        aspect_ratio: {
          type: "string",
          enum: ["16:9", "21:9", "3:2", "2:1"],
          default: "16:9"
        },
        count: { type: "integer", minimum: 1, maximum: 8, default: 1 },
        output_dir: { type: "string" }
      },
      required: ["brief"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_remove_background",
    description:
      "Matte an image to transparent background (BiRefNet / BRIA RMBG / U²-Net via remote endpoint; local white-chroma fallback). Returns RGBA PNG path.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string", description: "Path or URL to input image" },
        mode: {
          type: "string",
          enum: ["auto", "birefnet", "rmbg", "layerdiffuse", "difference", "u2net"],
          default: "auto"
        },
        output_dir: { type: "string" }
      },
      required: ["image"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "asset_vectorize",
    description:
      "Convert a raster image to SVG. Tries in order: Recraft /vectorize (if PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL is set), vtracer on PATH, potrace on PATH, then a built-in posterize run-length fallback. Passes all output through SVGO when installed.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string" },
        mode: {
          type: "string",
          enum: ["auto", "recraft", "vtracer", "potrace", "posterize"],
          default: "auto"
        },
        palette_size: { type: "integer", default: 6 },
        max_paths: { type: "integer", default: 200 },
        output_dir: { type: "string" }
      },
      required: ["image"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "asset_upscale_refine",
    description:
      "Upscale / refine an image, asset-type-aware. DAT2 for flat logos/icons, Real-ESRGAN/SUPIR for photoreal, img2img for diffusion polish. Lanczos fallback.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string" },
        asset_type: { type: "string" },
        target_size: { type: "integer", default: 2048 },
        mode: {
          type: "string",
          enum: ["auto", "dat2", "real-esrgan", "supir", "img2img", "lanczos"],
          default: "auto"
        },
        output_dir: { type: "string" }
      },
      required: ["image"]
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: "asset_validate",
    description:
      "Run tier-0 deterministic validators on an asset (dimensions, alpha presence, checkerboard-pattern heuristic on tile-luma alternation, safe-zone bbox, palette ΔE2000 against brand, WCAG contrast of brand primary vs light and dark tabs, OCR Levenshtein against intended_text). Optional tier-2 VLM-as-judge via PROMPT_TO_BUNDLE_VLM_URL.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string" },
        asset_type: { type: "string" },
        brand_bundle: { type: "object" },
        intended_text: { type: "string" },
        run_vlm: { type: "boolean", default: false }
      },
      required: ["image", "asset_type"]
    },
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  {
    name: "asset_brand_bundle_parse",
    description:
      "Parse a brand source (brand.json, DTCG tokens, AdCP spec, brand.md, or raw text) into the canonical BrandBundle schema.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Path to file or raw text" }
      },
      required: ["source"]
    },
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  {
    name: "asset_save_inline_svg",
    description:
      "Round-trip endpoint for inline_svg mode. After you (the LLM) emit the <svg>…</svg> in chat, immediately call this tool with that SVG text so the server writes a complete asset bundle to disk: master.svg + (for favicon) icon.svg + icon-dark.svg + favicon-{16,32,48}.png + favicon.ico + apple-touch-icon.png (opaque) + pwa-192.png + pwa-512.png + pwa-512-maskable.png + manifest.webmanifest + head-snippet.html + (for app_icon) the full iOS AppIconSet + Android adaptive (foreground+background+monochrome) + PWA maskable + visionOS. Returns an AssetBundle with file paths the user can open. Validates the SVG against the original svg_brief (viewBox, path count, palette, forbidden elements).",
    inputSchema: {
      type: "object",
      properties: {
        svg: {
          type: "string",
          description: "The full <svg>...</svg> text you just emitted in chat."
        },
        asset_type: {
          type: "string",
          enum: [
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
          ]
        },
        brand_bundle: { type: "object" },
        expected_text: { type: "string" },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["ios", "android", "pwa", "visionos", "all"] },
          description: "For asset_type=app_icon. Defaults to ['all']."
        },
        dark_mode: {
          type: "boolean",
          description:
            "For asset_type=favicon: also emit icon-dark.svg (prefers-color-scheme: dark). Default true."
        },
        app_name: {
          type: "string",
          description: "For asset_type=favicon: name/short_name written into manifest.webmanifest."
        },
        theme_color: {
          type: "string",
          description: "For asset_type=favicon: theme_color hex for manifest + <meta>."
        },
        background_color: {
          type: "string",
          description: "For asset_type=favicon: PWA splash background_color hex."
        },
        output_dir: { type: "string" }
      },
      required: ["svg", "asset_type"]
    },
    annotations: { openWorldHint: false }
  },
  {
    name: "asset_ingest_external",
    description:
      "Ingest an image the user generated in an external tool (Midjourney, Nano Banana, Ideogram web, Recraft, Flux Playground, etc.) and run the matte → vectorize (where applicable) → tier-0 validation pipeline. The round-trip endpoint for external_prompt_only mode.",
    inputSchema: {
      type: "object",
      properties: {
        image_path: {
          type: "string",
          description: "Absolute path to the locally-saved image."
        },
        asset_type: {
          type: "string",
          enum: [
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
          ]
        },
        brand_bundle: { type: "object" },
        expected_text: { type: "string" },
        vector: { type: "boolean" },
        transparent: { type: "boolean" },
        output_dir: { type: "string" }
      },
      required: ["image_path", "asset_type"]
    },
    annotations: { openWorldHint: false }
  },
  {
    name: "asset_train_brand_lora",
    description:
      "Train a brand-consistent LoRA from 20-50 sample images, returning a `lora_id` the `comfyui-*` and SDXL-family providers can reference. Requires a user-owned training endpoint (Modal / Runpod / self-host) at PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL. Phase-4 scaffold: the MCP tool does the packaging, validation, and HTTP; the user owns the deployment and pricing. See docs/research/06-stable-diffusion-flux/6d-lora-training-for-brand-style.md.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Brand slug. Becomes the LoRA trigger token." },
        base_model: {
          type: "string",
          description: "Base model to fine-tune (sdxl-1.0 / flux-1-dev / sd-1.5).",
          default: "sdxl-1.0"
        },
        training_images: {
          type: "array",
          items: { type: "string" },
          description:
            "Local filesystem paths (5-200). 20-50 is the sweet spot. Paths go through the safeReadPath allow-list."
        },
        captions: {
          type: "array",
          items: { type: "string" },
          description: "Per-image caption overrides. Auto-captioned if omitted."
        },
        rank: { type: "number", default: 16 },
        steps: { type: "number", default: 1200 }
      },
      required: ["name", "training_images"]
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_doctor",
    description:
      "Structured environment inventory — MCP equivalent of `p2a doctor`. Returns native-dependency status (sharp, vtracer, potrace, png-to-ico, satori, resvg-js, tesseract.js, svgo), free-tier routes ranked best-first, paid-provider keys, paste-only providers, pipeline extension URLs, which modes are available right now, and a concrete 'what to try next' suggestion list. Read-only by default. Pass check_data=true to also run the model-registry/routing-table integrity check. Pass auto_fix=true to install missing native binaries (Homebrew / cargo / scoop — never sudo); pair with auto_fix_dry_run=true to preview without executing.",
    inputSchema: {
      type: "object",
      properties: {
        check_data: {
          type: "boolean",
          default: false,
          description:
            "Also run data-integrity check (equivalent to `p2a doctor --data`). Useful in CI after data edits."
        },
        auto_fix: {
          type: "boolean",
          default: false,
          description:
            "Run the auto-installer for missing native binaries (vtracer, potrace). Homebrew on macOS, cargo as fallback, scoop on Windows. Linux distro installs and npm optional deps are surfaced as manual hints instead of executed. Response gains an `auto_fix` field."
        },
        auto_fix_dry_run: {
          type: "boolean",
          default: false,
          description:
            "Only meaningful when auto_fix=true. Plan steps without executing. Defaults to false."
        }
      },
      required: []
    },
    annotations: { openWorldHint: true }
  },
  {
    name: "asset_models_list",
    description:
      "List the model registry (60+ entries) with optional filters. MCP equivalent of `p2a models list`. Returns id, family, provider, dialect, native_rgba/svg flags, text ceiling, tier (free/paid/paste-only), key_set status. Filter flags: free, paid, paste_only, rgba, svg. Read-only; no network.",
    inputSchema: {
      type: "object",
      properties: {
        free: { type: "boolean", description: "Only zero-key / free-tier models." },
        paid: { type: "boolean", description: "Only paid direct-API models." },
        paste_only: {
          type: "boolean",
          description: "Only paste-only surfaces (Midjourney, Firefly, Krea)."
        },
        rgba: { type: "boolean", description: "Only models with native transparent-PNG output." },
        svg: { type: "boolean", description: "Only models with native SVG output." }
      },
      required: []
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "asset_models_inspect",
    description:
      "Full capability dump for one model. MCP equivalent of `p2a models inspect <id>`. Accepts a model id or an `aka` alias. Returns the full ModelInfo record, env status, paste targets, routing rules that reference this model (as PRIMARY / fallback / NEVER), and usage notes. Read-only; no network.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Model id or aka alias (e.g. 'gpt-image-1', 'nano-banana', 'ideogram-3-turbo')."
        }
      },
      required: ["id"]
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
  },
  {
    name: "asset_export_bundle",
    description:
      "Fan out a 1024² master PNG into the full platform bundle (iOS AppIconSet, Android adaptive, PWA maskable, visionOS parallax, Flutter launcher, favicon set). MCP equivalent of `p2a export master.png`. No API key required; runs entirely on sharp. Use when the LLM has a master (inline_svg saved, api-mode result, or user-supplied hand-authored PNG) and needs the platform fan-out.",
    inputSchema: {
      type: "object",
      properties: {
        master_path: {
          type: "string",
          description: "Absolute path to the 1024² master PNG. Resized up front to RGBA 1024²."
        },
        platforms: {
          type: "array",
          items: {
            type: "string",
            enum: ["ios", "android", "pwa", "favicon", "visionos", "flutter", "all"]
          },
          description: "Which platform bundles to emit. Defaults to all."
        },
        out_dir: {
          type: "string",
          description:
            "Output directory. Defaults to ./assets/bundle-<stem>-<timestamp> so repeated runs don't clobber."
        },
        bg: {
          type: "string",
          description:
            "Background color hex for iOS 1024 marketing (opaque), Android adaptive BG, favicon apple-touch. Defaults white."
        },
        app_name: { type: "string", description: "Short name for the PWA manifest." },
        theme: { type: "string", description: "theme_color hex for the PWA manifest." },
        ios18: {
          type: "boolean",
          default: false,
          description: "When true, also emit iOS 18 dark + tinted 1024² appearance variants."
        }
      },
      required: ["master_path"]
    },
    annotations: { openWorldHint: false }
  },
  {
    name: "asset_sprite_sheet",
    description:
      "Pack a directory of PNG/WEBP/JPG frames into one sprite sheet + TexturePacker-compatible JSON atlas (works in Phaser, PixiJS, Three.js, Godot, Unity via a light importer). MCP equivalent of `p2a sprite-sheet <dir>`. Offline, no API key.",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Directory containing frames. Sorted by natural filename order."
        },
        layout: { type: "string", enum: ["grid", "strip"], default: "grid" },
        columns: {
          type: "integer",
          minimum: 1,
          description: "Columns (grid only). Defaults to ceil(sqrt(n))."
        },
        padding: { type: "integer", minimum: 0, default: 0 },
        out: { type: "string", description: "Output PNG path. Defaults to ./sprites.png." },
        atlas: {
          type: "string",
          description: "Output atlas JSON path. Defaults to the sheet path with .json extension."
        }
      },
      required: ["dir"]
    },
    annotations: { openWorldHint: false }
  },
  {
    name: "asset_nine_slice",
    description:
      "Emit a 9-slice config + CSS border-image snippet + Unity/Godot/Phaser/PixiJS-ready numbers from one image and 4 pixel offsets. Optionally also emit an Android .9.png with the 1px stretchable-region encoding. MCP equivalent of `p2a nine-slice <image>`.",
    inputSchema: {
      type: "object",
      properties: {
        image: { type: "string", description: "Path to the source image." },
        guides: {
          type: "object",
          properties: {
            left: { type: "integer", minimum: 0 },
            top: { type: "integer", minimum: 0 },
            right: { type: "integer", minimum: 0 },
            bottom: { type: "integer", minimum: 0 }
          },
          required: ["left", "top", "right", "bottom"],
          description: "Pixel offsets from each edge marking the fixed regions."
        },
        out: {
          type: "string",
          description: "Output directory. Defaults to the directory of the input image."
        },
        android_9patch: {
          type: "boolean",
          default: false,
          description: "Also emit <name>.9.png with Android 9-patch 1px-border encoding."
        }
      },
      required: ["image", "guides"]
    },
    annotations: { openWorldHint: false }
  },
  {
    name: "asset_init_brand",
    description:
      "Scaffold brand.json in the project root + ensure the assets dir exists. MCP equivalent of the `brand.json` portion of `p2a init`. Auto-detects the framework (Next.js, Expo, Flutter, Xcode, Astro, Vite, Remix, Nuxt, React Native, Electron, Node) and returns platform hints. Deliberately does NOT do IDE MCP registration — that's the one piece the user handles once at install time via a terminal. Call this at the start of a new project so subsequent generator calls have a brand source-of-truth and a known output dir.",
    inputSchema: {
      type: "object",
      properties: {
        app_name: {
          type: "string",
          description: "App / brand name. Goes into brand.json and any PWA manifest."
        },
        palette: {
          type: "array",
          items: { type: "string" },
          description: "Brand palette as hex strings. Defaults to ['#2563eb', '#ffffff']."
        },
        assets_dir: {
          type: "string",
          description:
            "Where generated assets should live. Defaults to the framework's conventional dir."
        },
        display_font: { type: "string", description: "Display font family. Defaults to Inter." },
        body_font: { type: "string", description: "Body font family. Defaults to Inter." },
        do_not: {
          type: "array",
          items: { type: "string" },
          description:
            "Brand constraints to inject as negative anchors. Defaults to drop-shadows / heavy-gradients / skeuomorphic-bevels."
        },
        overwrite: {
          type: "boolean",
          default: false,
          description: "When true, overwrites an existing brand.json."
        },
        cwd: {
          type: "string",
          description: "Project root. Defaults to process.cwd()."
        }
      },
      required: ["app_name"]
    },
    annotations: { openWorldHint: false }
  }
];

/**
 * Loads the published package version from package.json at runtime so the MCP
 * server handshake (and `p2a --version`) always matches what npm actually
 * published. Avoids the drift that happened at 0.3.0 → 0.4.0 where the server
 * kept reporting an old number.
 */
function loadPackageVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const candidates = [
    resolve(__dirname, "..", "package.json"),
    resolve(__dirname, "..", "..", "package.json")
  ];
  for (const c of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(c, "utf-8")) as { name?: string; version?: string };
      if (pkg.name === "prompt-to-asset" && typeof pkg.version === "string") return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return "0.0.0";
}

export const SERVER_VERSION = loadPackageVersion();

export function createServer(): Server {
  const server = new Server(
    {
      name: "prompt-to-asset",
      version: SERVER_VERSION
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    try {
      let result: unknown;
      switch (name) {
        case "asset_capabilities":
          result = await capabilities(CapabilitiesInput.parse(args ?? {}));
          break;
        case "asset_enhance_prompt":
          result = await enhancePrompt(EnhancePromptInput.parse(args ?? {}));
          break;
        case "asset_generate_logo":
          result = await generateLogo(GenerateLogoInput.parse(args ?? {}));
          break;
        case "asset_generate_app_icon":
          result = await generateAppIcon(GenerateAppIconInput.parse(args ?? {}));
          break;
        case "asset_generate_favicon":
          result = await generateFavicon(GenerateFaviconInput.parse(args ?? {}));
          break;
        case "asset_generate_og_image":
          result = await generateOgImage(GenerateOgImageInput.parse(args ?? {}));
          break;
        case "asset_generate_illustration":
          result = await generateIllustration(GenerateIllustrationInput.parse(args ?? {}));
          break;
        case "asset_generate_splash_screen":
          result = await generateSplashScreen(GenerateSplashScreenInput.parse(args ?? {}));
          break;
        case "asset_generate_hero":
          result = await generateHero(GenerateHeroInput.parse(args ?? {}));
          break;
        case "asset_remove_background":
          result = await removeBackground(RemoveBackgroundInput.parse(args ?? {}));
          break;
        case "asset_vectorize":
          result = await vectorizeImage(VectorizeInput.parse(args ?? {}));
          break;
        case "asset_upscale_refine":
          result = await upscaleRefine(UpscaleRefineInput.parse(args ?? {}));
          break;
        case "asset_validate":
          result = await validateAsset(ValidateAssetInput.parse(args ?? {}));
          break;
        case "asset_brand_bundle_parse":
          result = await brandBundleParse(BrandBundleParseInput.parse(args ?? {}));
          break;
        case "asset_ingest_external":
          result = await ingestExternal(IngestExternalInput.parse(args ?? {}));
          break;
        case "asset_save_inline_svg":
          result = await saveInlineSvg(SaveInlineSvgInput.parse(args ?? {}));
          break;
        case "asset_train_brand_lora":
          result = await trainBrandLora(TrainBrandLoraInput.parse(args ?? {}));
          break;
        case "asset_doctor":
          result = await doctor(DoctorInput.parse(args ?? {}));
          break;
        case "asset_models_list":
          result = await modelsList(ModelsListInput.parse(args ?? {}));
          break;
        case "asset_models_inspect":
          result = await modelsInspect(ModelsInspectInput.parse(args ?? {}));
          break;
        case "asset_export_bundle":
          result = await exportBundle(ExportBundleInput.parse(args ?? {}));
          break;
        case "asset_sprite_sheet":
          result = await spriteSheet(SpriteSheetInput.parse(args ?? {}));
          break;
        case "asset_nine_slice":
          result = await nineSlice(NineSliceInput.parse(args ?? {}));
          break;
        case "asset_init_brand":
          result = await initBrand(InitBrandInput.parse(args ?? {}));
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err) {
      const error = err as Error;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error calling ${name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
          }
        ]
      };
    }
  });

  return server;
}
