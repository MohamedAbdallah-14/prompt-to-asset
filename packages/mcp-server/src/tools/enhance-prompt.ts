import type { EnhancePromptInputT } from "../schemas.js";
import type { AssetSpec, AssetType, ClarifyingQuestion } from "../types.js";
import { classify, inferFlags } from "../classify.js";
import { route } from "../router.js";
import { rewrite } from "../rewriter.js";
import {
  MODES_BY_ASSET_TYPE,
  availableModes,
  detectApiAvailability,
  anyApiAvailable
} from "../modes.js";
import { buildSvgBrief } from "../svg-briefs.js";
import { resolvePasteTargets } from "../paste-targets.js";

/**
 * Tool: asset_enhance_prompt
 * readOnlyHint=true, idempotentHint=true — Cursor auto-approves.
 *
 * Given a brief (and optional brand bundle), return a fully-formed AssetSpec:
 *   - classifier + router + rewriter output (asset_type, target_model, rewritten_prompt, etc.)
 *   - modes_available[] — which of the three execution modes work RIGHT NOW
 *   - svg_brief — authoring contract if inline_svg is available
 *   - paste_targets — human-facing UIs if external_prompt_only is available
 *
 * This is the "planner" of the plugin. No network calls; read-only.
 */
export async function enhancePrompt(input: EnhancePromptInputT): Promise<AssetSpec> {
  const { brief, brand_bundle, target_model: forced } = input;

  const classification = input.asset_type
    ? { asset_type: input.asset_type, confidence: 1, reason: "user-specified" }
    : classify(brief);

  const flags = inferFlags(brief, classification.asset_type);
  if (input.transparent !== undefined) flags.transparency_required = input.transparent;
  if (input.vector !== undefined) flags.vector_required = input.vector;
  if (input.text_content !== undefined) flags.text_content = input.text_content;

  const textLength = flags.text_content ? flags.text_content.trim().split(/\s+/).length : 0;

  const decision = route({
    asset_type: classification.asset_type,
    text_length: textLength,
    vector_required: flags.vector_required,
    transparency_required: flags.transparency_required,
    brand_bundle_present: Boolean(brand_bundle && brand_bundle.palette.length > 0)
  });

  const targetModel = forced ?? decision.primary_model;

  const rewritten = rewrite({
    brief,
    asset_type: classification.asset_type,
    target_model: targetModel,
    ...(brand_bundle && { brand_bundle }),
    ...(flags.text_content !== null && { text_content: flags.text_content }),
    transparency_required: flags.transparency_required,
    vector_required: flags.vector_required
  });

  const dimensions = dimensionsForAssetType(classification.asset_type);

  // Three-mode surface: which are eligible, which are actually usable right now.
  const avail = detectApiAvailability();
  const modes_available = availableModes(
    classification.asset_type,
    targetModel,
    decision.fallback_models,
    avail
  );

  const extraWarnings: string[] = [];

  // Build the inline_svg authoring brief when that mode is eligible.
  const svg_brief = MODES_BY_ASSET_TYPE[classification.asset_type].includes("inline_svg")
    ? buildSvgBrief({
        asset_type: classification.asset_type,
        ...(brand_bundle && { brand_bundle }),
        ...(flags.text_content !== null && { text_content: flags.text_content })
      })
    : undefined;

  // Build paste_targets when external_prompt_only is eligible.
  let paste_targets: AssetSpec["paste_targets"];
  let fallback_paste_targets: AssetSpec["fallback_paste_targets"];
  if (MODES_BY_ASSET_TYPE[classification.asset_type].includes("external_prompt_only")) {
    const resolved = resolvePasteTargets(targetModel, decision.fallback_models);
    paste_targets = resolved.primary_targets;
    fallback_paste_targets = resolved.fallback_targets;
    extraWarnings.push(...resolved.warnings);
  }

  // Surface the api-mode status explicitly so the caller knows WHY api
  // might be missing from modes_available.
  if (!anyApiAvailable(targetModel, decision.fallback_models, avail)) {
    extraWarnings.push(
      "api mode unavailable — no provider key detected for the routed model chain. " +
        "Use inline_svg (zero key) or external_prompt_only (paste into a web UI), " +
        "or set OPENAI_API_KEY / IDEOGRAM_API_KEY / RECRAFT_API_KEY / BFL_API_KEY / GEMINI_API_KEY."
    );
  }

  const clarifying_questions = deriveClarifyingQuestions({
    brief,
    assetType: classification.asset_type,
    targetModel,
    textContent: flags.text_content,
    hasBrandBundle: Boolean(brand_bundle && brand_bundle.palette.length > 0)
  });

  const spec: AssetSpec = {
    asset_type: classification.asset_type,
    brief,
    rewritten_prompt: rewritten.prompt,
    target_model: targetModel,
    fallback_models: decision.fallback_models,
    params: {
      ...decision.primary_params,
      ...(rewritten.negative_prompt !== undefined && {
        negative_prompt: rewritten.negative_prompt
      }),
      seed: deriveSeed(brief, brand_bundle)
    },
    postprocess: decision.postprocess,
    safe_zone: safeZoneForAssetType(classification.asset_type),
    dimensions,
    transparency_required: flags.transparency_required,
    vector_required: flags.vector_required,
    text_content: flags.text_content,
    modes_available,
    ...(svg_brief && { svg_brief }),
    ...(paste_targets && { paste_targets }),
    ...(fallback_paste_targets && { fallback_paste_targets }),
    routing_trace: {
      rule_id: decision.rule_id,
      reason: decision.reason,
      research_sources: decision.research_sources,
      never_models: decision.never_models,
      fallback_chain: decision.fallback_models
    },
    warnings: [
      `classification: ${classification.reason} (confidence ${classification.confidence.toFixed(2)})`,
      `routing: ${decision.reason}`,
      `modes_available: ${modes_available.join(", ") || "(none — unusual; check asset type)"}`,
      ...rewritten.warnings,
      ...extraWarnings
    ],
    ...(clarifying_questions.length > 0 && { clarifying_questions })
  };

  return spec;
}

/**
 * Return any clarifying questions the host LLM should surface before calling
 * a generator. Keep this short — each extra question is friction. Add one
 * only when the answer MATERIALLY changes output quality.
 */
function deriveClarifyingQuestions(ctx: {
  brief: string;
  assetType: AssetType;
  targetModel: string;
  textContent: string | null;
  hasBrandBundle: boolean;
}): ClarifyingQuestion[] {
  const out: ClarifyingQuestion[] = [];

  // 1. Long wordmark — Ideogram 3 / gpt-image-1 / Recraft all guarantee text
  //    rendering only ≤3 words. Past that, misspellings creep in. Imagen /
  //    Flux / SDXL are worse. So regardless of the routed model, when a
  //    caller tries to render >3 words directly in a diffusion sampler, the
  //    better pattern is mark-only + real SVG/Canvas/Skia typesetting after.
  //    This is the #1 source of "looks AI" output for logos.
  if (ctx.textContent) {
    const wordCount = ctx.textContent.trim().split(/\s+/).length;
    if (wordCount > 3) {
      out.push({
        id: "long_wordmark",
        header: "Wordmark",
        question: `"${ctx.textContent}" is ${wordCount} words. Even the best text-rendering models (Ideogram 3 / gpt-image-1 / Recraft) are only reliable up to 3 words; past that, misspellings become common. What would you like to do?`,
        options: [
          {
            label: `Generate mark-only, typeset "${ctx.textContent}" later`,
            description:
              "Produce a text-free mark, then composite the wordmark in SVG/Canvas/Skia with your brand font. Safest for fidelity."
          },
          {
            label: "Shorten to the strongest ≤3 words",
            description:
              "I'll pass a shortened wordmark (e.g. product initials or the primary noun) to the model."
          },
          {
            label: `Proceed anyway with "${ctx.textContent}"`,
            description:
              "Accept the risk of misspellings / letter drops. You can regenerate until it looks right."
          }
        ],
        required: false,
        why: "Ideogram / gpt-image-1 / Recraft text rendering degrades past ~3 words (docs/research/07-midjourney-ideogram-recraft/7b-ideogram-text-rendering-for-logos.md)."
      });
    }
  }

  // 2. App icon without a brand palette — the platform guidelines treat
  //    color as load-bearing (accessibility, brand recognition, iOS 18
  //    tinted variants all derive from palette). Ask before generating.
  if (ctx.assetType === "app_icon" && !ctx.hasBrandBundle) {
    out.push({
      id: "no_brand_palette",
      header: "Palette",
      question:
        "No brand palette provided. An app icon lives with the brand across iOS / Android / PWA / tinted variants for years — color is load-bearing. Proceed without one?",
      options: [
        {
          label: "Provide colors now",
          description:
            "Pass `brand_bundle.palette` as ['#RRGGBB', '#RRGGBB', …] in your next call. Or run `p2a init` to scaffold brand.json."
        },
        {
          label: "Proceed with a default palette",
          description:
            "The router will pick high-contrast defaults. You can regenerate after setting brand colors."
        }
      ],
      required: false,
      why: "App icons encode brand identity in color for 3–5 years. iOS 18 tinted variants, Android themed icons, and PWA manifest theme_color all read the palette."
    });
  }

  // 3. Brief too generic — no product noun, no visual anchor. The rewriter
  //    can still run but the output will look generic. One targeted question
  //    lifts quality a lot more than a prompt-polish tool would.
  const genericRegex = /^(?:a\s+)?(?:logo|icon|image|asset|graphic)(?:\s+for\s+(?:a|an|my)?\s*)?\s*$/i;
  if (genericRegex.test(ctx.brief.trim())) {
    out.push({
      id: "brief_underspecified",
      header: "Brief",
      question:
        "The brief is very generic — the output will be generic too. Can you add one visual anchor: product name, industry, vibe, or palette hint?",
      options: [
        {
          label: "Add product name + one-word vibe",
          description:
            'Example: "flat minimalist logo for Halcyon, a weather app — calm, airy."'
        },
        {
          label: "Proceed as-is",
          description: "Accept a generic result; regenerate after reviewing."
        }
      ],
      required: false,
      why: "Generic briefs fire the router's default rule and the rewriter's fallback dialect — both optimize for safety, not distinction."
    });
  }

  return out;
}

function dimensionsForAssetType(type: AssetType): { width: number; height: number } {
  switch (type) {
    case "og_image":
      return { width: 1200, height: 630 };
    case "hero":
      return { width: 1920, height: 1080 };
    case "icon_pack":
      return { width: 512, height: 512 };
    case "illustration":
      return { width: 2048, height: 1536 };
    case "favicon":
    case "app_icon":
    case "logo":
    case "sticker":
    case "transparent_mark":
    default:
      return { width: 1024, height: 1024 };
  }
}

function safeZoneForAssetType(type: AssetType): { width: number; height: number } | null {
  switch (type) {
    // Source: docs/research/09-app-icon-generation/9a-ios-app-icon-hig-specs.md
    // iOS 80% of 1024 = 824px center safe zone.
    case "app_icon":
      return { width: 824, height: 824 };
    // Source: docs/research/11-favicon-web-assets/ — must read at 16×16.
    case "favicon":
      return { width: 16, height: 16 };
    // Source: docs/research/10-ui-illustrations-graphics/ — standard UI grid.
    case "icon_pack":
      return { width: 24, height: 24 };
    default:
      return null;
  }
}

function deriveSeed(brief: string, bundle?: unknown): number {
  const s = JSON.stringify({ brief, bundle });
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
