import type { BrandBundle, AssetType } from "./types.js";
import { findModel } from "./config.js";

/**
 * Rewrite a brief into a target-model dialect-appropriate prompt.
 * This is the central prompt engineering module — it encodes the "dialect rules"
 * from docs/research/SYNTHESIS.md § Prompt Engineering Principles.
 *
 * Rules applied:
 *   - Flux / Imagen / gpt-image: prose narrative, no tag salad, no negative_prompt field
 *   - SD 1.5 / SDXL: tag-salad, negative prompt allowed
 *   - Ideogram: prose + quoted wordmark
 *   - Recraft: prose + style_id reference
 *   - MJ: prose + --flags
 *
 * For text — per-model ceiling drives the decision, not a blanket rule:
 *   - 0 words           → "no text, no labels, no wordmark"
 *   - text.length ≤ model.text_ceiling_chars → "WORDMARK" in double quotes
 *   - text.length > ceiling → drop from prompt with warning, composite later
 *
 * Per-model ceilings are verified Apr 2026 (memory: model_capabilities_apr_2026.md).
 * Strong-text models (gpt-image-2, Nano Banana Pro, gpt-image-1.5, Ideogram 3,
 * Nano Banana 2, Flux 2 family) handle multi-word and even paragraph-length text;
 * SDXL / Flux Schnell / SD 1.5 cannot render legible text at all.
 */
export interface RewriteInput {
  brief: string;
  asset_type: AssetType;
  target_model: string;
  brand_bundle?: BrandBundle;
  text_content?: string;
  transparency_required: boolean;
  vector_required: boolean;
}

export interface RewriteOutput {
  prompt: string;
  negative_prompt?: string;
  warnings: string[];
}

export function rewrite(input: RewriteInput): RewriteOutput {
  const model = findModel(input.target_model);
  const warnings: string[] = [];

  const dialect = model?.dialect ?? "prose";
  const subject = extractSubject(input.brief);
  const style = inferStyle(input.brief, input.asset_type);
  const palette = input.brand_bundle?.palette ?? [];
  const textClause = buildTextClause(input.text_content, model?.text_ceiling_chars ?? 0, warnings);
  const backgroundClause = buildBackgroundClause(
    input.transparency_required,
    model?.native_rgba ?? false,
    warnings
  );
  const aspectClause = buildAspectClause(input.asset_type);
  const doNot = input.brand_bundle?.do_not ?? [];

  let prompt: string;
  let negative_prompt: string | undefined;

  switch (dialect) {
    case "tag-salad":
      // Source: docs/research/06-stable-diffusion-flux/6a-sd-15-21-xl-prompting-fundamentals.md
      // BREAK prevents color/attribute leakage between subject and background on SDXL.
      prompt = [
        tagify(style),
        tagify(`${subject}`),
        palette.length > 0 ? `palette: ${palette.join(", ")}` : null,
        textClause ? tagify(textClause) : null,
        "masterpiece",
        "highly detailed",
        "BREAK",
        tagify(aspectClause),
        backgroundClause ? tagify(backgroundClause) : null
      ]
        .filter(Boolean)
        .join(", ");
      negative_prompt = [
        "watermark",
        "signature",
        "stock photography",
        "jpeg artifacts",
        "low quality",
        "blurry",
        ...doNot.map((d) => d.replace(/^no\s+/i, ""))
      ].join(", ");
      break;

    case "prose+quoted":
      // Ideogram — prose + literal quoted text
      prompt = [
        `A ${style} ${assetNoun(input.asset_type)} representing ${subject}.`,
        "Bold, memorable silhouette. Centered composition.",
        palette.length > 0 ? `Palette strictly limited to ${palette.join(", ")}.` : null,
        textClause || null,
        backgroundClause || null,
        aspectClause,
        positiveAnchorsFromDoNot(doNot)
      ]
        .filter(Boolean)
        .join(" ");
      break;

    case "prose+flags":
      // Midjourney — prose + --flags
      prompt = [
        `${subject}, ${style}, centered, clean silhouette, high contrast`,
        palette.length > 0 ? `palette: ${palette.join(", ")}` : null,
        textClause || null
      ]
        .filter(Boolean)
        .join(", ");
      const flags: string[] = [];
      if (input.asset_type === "logo" || input.asset_type === "app_icon") flags.push("--ar 1:1");
      if (input.asset_type === "og_image") flags.push("--ar 1200:630");
      flags.push("--style raw", "--v 7");
      if (input.brand_bundle?.sref_code) flags.push(input.brand_bundle.sref_code);
      prompt += " " + flags.join(" ");
      break;

    case "prose":
    default: {
      // Flux / Imagen / gpt-image / Recraft / others: narrative prose
      // Imagen rewriter fires for prompts <30 words — pad to ≥30 concrete words.
      const doNotAnchors = positiveAnchorsFromDoNot(doNot);
      const parts = [
        `A ${style} ${assetNoun(input.asset_type)} of ${subject}.`,
        composeContext(input.brief, input.asset_type),
        palette.length > 0
          ? `Palette strictly limited to these colors only: ${palette.join(", ")}.`
          : null,
        textClause || null,
        backgroundClause || null,
        aspectClause,
        doNotAnchors || null
      ].filter(Boolean);
      prompt = parts.join(" ");

      // Warn if the model can't accept negative_prompt — split by failure mode.
      if (model && doNot.length > 0) {
        const npSupport = model.negative_prompt_support;
        if (npSupport === "error") {
          warnings.push(
            `${model.id} rejects the negative_prompt field at the API schema; ${doNot.length} do-not clauses rewritten as positive anchors in prompt body.`
          );
        } else if (npSupport === "ignored") {
          warnings.push(
            `${model.id} silently ignores negative_prompt (officially unsupported); ${doNot.length} do-not clauses rewritten as positive anchors in prompt body.`
          );
        } else if (npSupport === "vertex_only") {
          warnings.push(
            `${model.id} accepts negativePrompt only on the Vertex AI endpoint; on the Gemini API surface it is silently ignored. ${doNot.length} do-not clauses rewritten as positive anchors as the safe default.`
          );
        }
      }
      break;
    }
  }

  // Safety net — Imagen-family length padding
  if (model?.family === "imagen" || model?.family === "gemini") {
    const wc = prompt.split(/\s+/).filter(Boolean).length;
    if (wc < 30) {
      prompt += ` Professional composition with clean negative space, balanced visual weight, subject rendered with precise edges and deliberate craft.`;
      warnings.push(
        `Imagen/Gemini default-rewriter fires for <30-word prompts; padded to avoid silent rewrite.`
      );
    }
  }

  return { prompt, ...(negative_prompt !== undefined && { negative_prompt }), warnings };
}

function extractSubject(brief: string): string {
  // Minimal extraction — the full version could use an LLM. For now, strip common filler.
  return brief
    .replace(
      /^(please|can you|i want|generate|make|create|produce|design)\s+(me\s+)?(a|an)?\s*/i,
      ""
    )
    .replace(/^(logo|icon|favicon|og image|illustration|splash|sticker|image)\s+(of|for)\s+/i, "")
    .replace(/\s*(with|for)\s+transparent\s+background.*$/i, "")
    .replace(/\s*on\s+white\s+background.*$/i, "")
    .trim();
}

function inferStyle(brief: string, assetType: AssetType): string {
  const lower = brief.toLowerCase();
  if (/flat\s+vector|minimal|minimalist/.test(lower)) return "flat vector minimalist";
  if (/isometric|3d|three-dimensional/.test(lower)) return "isometric 3D";
  if (/line\s+art|outline/.test(lower)) return "clean line-art";
  if (/soft\s+gradient|pastel/.test(lower)) return "soft gradient";
  if (/brutalist/.test(lower)) return "brutalist";
  if (/photoreal/.test(lower)) return "photorealistic";
  // default by asset type
  switch (assetType) {
    case "logo":
    case "app_icon":
    case "favicon":
      return "flat vector minimalist";
    case "icon_pack":
      return "clean 2px-stroke line-art";
    case "illustration":
      return "modern flat illustration with soft gradients";
    case "hero":
      return "cinematic photorealistic";
    case "sticker":
      return "bold cartoon";
    default:
      return "clean modern";
  }
}

function assetNoun(type: AssetType): string {
  const map: Record<AssetType, string> = {
    logo: "logo mark",
    app_icon: "app icon",
    favicon: "favicon glyph",
    og_image: "social media card",
    splash_screen: "app splash screen illustration",
    illustration: "spot illustration",
    icon_pack: "UI icon",
    hero: "marketing hero image",
    sticker: "sticker",
    transparent_mark: "isolated mark"
  };
  return map[type];
}

function composeContext(brief: string, assetType: AssetType): string {
  switch (assetType) {
    case "logo":
    case "app_icon":
      return "Subject fills 70-80% of the frame, centered, with generous negative space. Bold recognizable silhouette. Strong tight outline. High contrast.";
    case "favicon":
      return "Simple shape that remains legible at 16x16 pixels. Bold silhouette, two or three colors maximum.";
    case "icon_pack":
      return "Single concept at 24x24 pixel grid. 2-pixel stroke, consistent weight, currentColor-compatible fill.";
    case "illustration":
      return "Composed scene with clear subject and supporting context. Consistent line weight and color application.";
    case "hero":
      return "Cinematic composition with atmospheric lighting, depth, and editorial framing.";
    case "sticker":
      return "Bold cartoon style with thick outline, pop-art coloring, and a tight silhouette.";
    default:
      return "Clean, deliberate composition.";
  }
}

function buildTextClause(
  text: string | undefined,
  ceiling: number,
  warnings: string[]
): string | null {
  if (!text || text.trim().length === 0) {
    return "No text, no labels, no wordmark, no typography.";
  }
  // Per-model ceiling decides — strong-text models (gpt-image-2, Nano Banana
  // Pro, gpt-image-1.5, Ideogram 3, Nano Banana 2, Flux 2) render multi-word
  // and paragraph-length text reliably. SDXL/SD 1.5/Flux Schnell cannot render
  // legible text and have ceilings ≤8 chars.
  if (text.length > ceiling) {
    const words = text.trim().split(/\s+/).length;
    warnings.push(
      `Text "${text}" (${text.length} chars / ${words} words) exceeds the target model's text_ceiling_chars=${ceiling}. ` +
        `Generating text-free mark and dropping wordmark from the prompt — composite SVG/Canvas typography in the application layer using BrandBundle.typography.`
    );
    return "No text, no labels, no wordmark, no typography.";
  }
  return `The wordmark text "${text}" in clean sans-serif typography with tight tracking.`;
}

function buildBackgroundClause(
  transparencyRequired: boolean,
  nativeRgba: boolean | "partial",
  warnings: string[]
): string | null {
  if (transparencyRequired && nativeRgba === true) {
    return "Isolated subject on pure transparent background.";
  }
  if (transparencyRequired && nativeRgba !== true) {
    warnings.push(
      "Transparency requested but target model does not natively support RGBA. Prompting for solid white; pipeline will matte post-generation."
    );
    return "Solid pure white #FFFFFF background. No checkerboard pattern, no gradient, no textured background.";
  }
  return "Solid pure white #FFFFFF background.";
}

function buildAspectClause(type: AssetType): string {
  switch (type) {
    case "og_image":
      return "Landscape 1.91:1 aspect ratio, 1200x630 pixels.";
    case "hero":
      return "Landscape 16:9 aspect ratio, 1920x1080 pixels.";
    case "icon_pack":
      return "1:1 square aspect, 512x512 pixels.";
    case "illustration":
      return "4:3 aspect ratio, 2048x1536 pixels.";
    default:
      return "1:1 square aspect ratio, 1024x1024 pixels.";
  }
}

function tagify(s: string | null): string | null {
  if (!s) return null;
  return s.replace(/\.$/, "").toLowerCase();
}

function positiveAnchorsFromDoNot(doNot: string[]): string | null {
  if (doNot.length === 0) return null;
  // Rewrite "no drop shadows" → "flat matte surfaces"; "no gradient sky" → "solid color treatment"
  const map: Record<string, string> = {
    "drop shadows": "flat matte surfaces with no cast shadows",
    shadows: "flat matte surfaces",
    gradients: "solid-color fills",
    gradient: "solid-color fills",
    glow: "crisp edges without glow or bloom",
    outline: "clean edges without additional outline strokes",
    "3d": "strictly two-dimensional flat treatment",
    skeumorphism: "flat minimal treatment"
  };
  const anchors = doNot.map((d) => {
    const key = d
      .toLowerCase()
      .replace(/^no\s+/i, "")
      .trim();
    return map[key] ?? `strictly avoid ${key.replace(/^no\s+/, "")}`;
  });
  return anchors.join(". ") + ".";
}
