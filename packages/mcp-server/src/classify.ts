import type { AssetType } from "./types.js";

/**
 * Classify a natural-language brief into the closed AssetType enum.
 * Rule-based first pass (fast, deterministic, no LLM cost); LLM fallback not yet wired.
 */
export function classify(brief: string): {
  asset_type: AssetType;
  confidence: number;
  reason: string;
} {
  const b = brief.toLowerCase();
  const rules: Array<{ type: AssetType; regex: RegExp; weight: number }> = [
    {
      type: "app_icon",
      regex: /\bapp\s*icon|launcher\s*icon|ios\s*icon|android\s*icon|appicon\b/,
      weight: 1.0
    },
    {
      type: "favicon",
      regex: /\bfavicon|browser\s*tab\s*icon|apple[-\s]touch[-\s]icon/,
      weight: 1.0
    },
    {
      type: "og_image",
      regex: /\bog\s*image|open\s*graph|twitter\s*card|social\s*card|link\s*preview|link\s*unfurl/,
      weight: 1.0
    },
    { type: "splash_screen", regex: /\bsplash\s*(screen)?|launch\s*screen/, weight: 1.0 },
    {
      type: "icon_pack",
      regex: /\bicon\s*pack|icon\s*set|ui\s*icons|toolbar\s*icons/,
      weight: 0.95
    },
    { type: "sticker", regex: /\bsticker|emoji[-\s]like/, weight: 0.9 },
    // UI mockup detection — runs BEFORE hero/illustration. The trigger has
    // to be a request to RENDER a UI surface, not a passing mention. So we
    // require either an explicit "mock up X" / "mockup of X" phrase, an
    // "imagine the X page/screen" phrase, an explicit prompt-for-an-image-
    // model phrasing, or a clean noun like "pricing page" / "dashboard"
    // standing on its own. Briefs like "hero banner for our landing page"
    // or "illustration for a settings screen" must NOT hit this rule —
    // they're scenes about a page, not requests for the page itself.
    {
      type: "ui_mockup",
      regex: new RegExp(
        // Trigger phrases — explicit asks to render a UI surface
        "\\bmock\\s*up\\s+(?:the|of|a|my|this)\\b" +
          "|\\bmockup\\s+of\\b" +
          "|\\bimagine\\s+the\\s+(?:pricing|dashboard|settings|onboarding|signup|login|profile|search|checkout|home|landing|marketing|hero|empty[-\\s]state|nav|footer|sidebar)\\b" +
          "|\\bimagine\\s+the\\s+\\w+\\s+(?:page|screen|section|view|surface)\\b" +
          "|\\bdescribe\\s+the\\s+\\w+\\s+(?:page|screen)\\b" +
          "|\\bdesign\\s+(?:the|a|my)\\s+\\w+\\s+(?:page|screen|view|surface)\\b" +
          "|\\bprompt\\s+for\\s+(?:nano[-\\s]?banana|gpt[-\\s]?image|ideogram|flux|midjourney)\\b" +
          "|\\bui\\s*mockup\\b" +
          "|\\bscreen\\s*mockup\\b" +
          // Bare surface nouns that read as "render me this surface" without
          // adjacent scene-language. Pricing page and dashboard are the two
          // unambiguous ones; anything else needs the trigger phrase above.
          "|\\bpricing\\s*page\\b" +
          "|^dashboard\\b|\\bdashboard\\s+(?:for|of|mockup|ui|design|page|screen)\\b" +
          // Onboarding-as-surface (NOT onboarding scene/illustration which
          // hits the illustration rule below)
          "|\\bonboarding\\s+(?:screen|flow|page)\\s+for\\s+(?:first[-\\s]time|new)\\s+users\\b"
      ),
      weight: 0.95
    },
    {
      type: "hero",
      regex: /\bhero\s*(image|banner)|marketing\s*hero|landing\s*page\s*hero|banner/,
      weight: 0.85
    },
    {
      type: "illustration",
      regex: /\billustration|empty[-\s]state|onboarding\s*(image|graphic)|spot\s*art/,
      weight: 0.85
    },
    { type: "logo", regex: /\blogo\b|brand\s*mark|wordmark|lettermark|monogram/, weight: 0.9 },
    {
      type: "transparent_mark",
      regex: /\btransparent|alpha\s*channel|cutout|isolated|no\s*background/,
      weight: 0.6
    }
  ];

  for (const r of rules) {
    if (r.regex.test(b)) {
      return {
        asset_type: r.type,
        confidence: r.weight,
        reason: `matched pattern /${r.regex.source}/ in brief`
      };
    }
  }

  return {
    asset_type: "illustration",
    confidence: 0.3,
    reason: "no specific asset type detected; defaulting to illustration (lowest-risk default)"
  };
}

/**
 * Infer ancillary flags from a brief.
 */
export function inferFlags(
  brief: string,
  assetType: AssetType
): {
  transparency_required: boolean;
  vector_required: boolean;
  text_content: string | null;
} {
  const b = brief.toLowerCase();

  // Transparency
  let transparency_required = /transparent|alpha|cutout|no\s*background|isolated\s*on/.test(b);
  // Many asset types default to requiring transparency regardless of prompt
  if (
    assetType === "logo" ||
    assetType === "transparent_mark" ||
    assetType === "sticker" ||
    assetType === "icon_pack"
  ) {
    transparency_required = true;
  }
  // App icons, favicons, OG images typically do NOT require transparency on their final output
  if (assetType === "app_icon" || assetType === "og_image" || assetType === "hero") {
    // App icon mark DOES need transparency; packaging flattens onto background.
    // We default this to true for "master" generation and let export flatten.
    transparency_required = assetType === "app_icon";
  }

  // Vector
  let vector_required = /\b(svg|vector)\b/.test(b);
  if (assetType === "icon_pack" || assetType === "favicon") vector_required = true;
  if (assetType === "logo") vector_required = true;

  // Text content — look for quoted strings in brief
  let text_content: string | null = null;
  const quoted = brief.match(/["'"\u2018\u2019]([^"'"\u2018\u2019]{1,40})["'"\u2018\u2019]/);
  if (quoted && quoted[1]) {
    text_content = quoted[1];
  } else {
    // "with the text X" / "wordmark X"
    const m = brief.match(/\b(?:with\s+the\s+text|wordmark|saying|text:)\s+([A-Za-z0-9 ]{1,40})/i);
    if (m && m[1]) text_content = m[1].trim();
  }

  return { transparency_required, vector_required, text_content };
}
