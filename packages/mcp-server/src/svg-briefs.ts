// Per-asset-type authoring contracts for inline_svg mode.
//
// When a caller picks mode="inline_svg", the server does NOT emit an SVG
// itself. Instead it returns one of these briefs. The hosting LLM (Claude
// via the MCP client) reads the brief and writes the <svg>...</svg> inline
// in its response to the user.
//
// Why this split: diffusion models cannot emit SVG; Recraft can but requires
// a key; LLM-authored SVG is the zero-friction third path (research angle
// docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md path (b),
// and the routing table already names `llm_author_svg` as the strategy
// for favicons and icon packs). The brief gives the LLM hard constraints
// so the output is production-quality and not freestyle.
//
// Every field is load-bearing:
//   - viewBox → exact integer canvas; never ask the LLM to "pick a good size"
//   - path_budget → caps complexity; ≤40 paths is the documented ceiling
//   - palette_slots → caps color count; matches brand bundle when provided
//   - require / do_not → positive and negative anchors the LLM must respect
//   - skeleton → minimal starter so the LLM copies correct boilerplate
//   - style_hints → direction for subject treatment
//   - research_refs → provenance; every rule in this file is traceable.

import type { AssetType, BrandBundle } from "./types.js";

export interface SvgBrief {
  asset_type: AssetType;
  viewBox: string;
  canvas: { width: number; height: number };
  palette: { hex: string[]; slots: number };
  path_budget: number;
  stroke: { default_width_px: number | null; linecap: "round" | "butt" | "square" };
  require: string[];
  do_not: string[];
  skeleton: string;
  style_hints: string[];
  validation_hints: string[];
  research_refs: string[];
}

interface BuildInput {
  asset_type: AssetType;
  brand_bundle?: BrandBundle;
  text_content?: string | null;
}

/**
 * Produce an SVG-authoring brief the LLM can follow to emit a production
 * SVG. Caller-supplied brand palette is respected; if none given, fall
 * back to a neutral two-color palette so the LLM still has a concrete
 * hex list to anchor on.
 */
export function buildSvgBrief(input: BuildInput): SvgBrief {
  switch (input.asset_type) {
    case "logo":
      return logoBrief(input);
    case "favicon":
      return faviconBrief(input);
    case "icon_pack":
      return iconPackBrief(input);
    case "sticker":
      return stickerBrief(input);
    case "transparent_mark":
      return transparentMarkBrief(input);
    case "app_icon":
      return appIconBrief(input);
    default:
      // Caller shouldn't invoke inline_svg for these asset types; modes.ts
      // gates it. Return a defensible default so nothing crashes if someone
      // bypasses the gate.
      return logoBrief(input);
  }
}

// ───────────────────────────── per-asset briefs ────────────────────────────

function logoBrief({ brand_bundle, text_content }: BuildInput): SvgBrief {
  const palette = resolvePalette(brand_bundle, ["#0F172A", "#F59E0B"]);
  return {
    asset_type: "logo",
    viewBox: "0 0 256 256",
    canvas: { width: 256, height: 256 },
    palette: { hex: palette, slots: Math.min(palette.length, 3) },
    path_budget: 40,
    stroke: { default_width_px: 0, linecap: "round" },
    require: [
      "Single recognizable silhouette that reads at 32×32 px.",
      "Subject occupies 70–80% of the viewBox, centered.",
      'Transparent background (no <rect width="100%"> fill). Use fill="none" on the root.',
      text_content
        ? `If a wordmark is present, render it as <text> using a web-safe font stack; the literal word is ${JSON.stringify(text_content)}.`
        : "No text, no labels, no wordmark — pure mark only."
    ],
    do_not: [
      "No <image> element. No raster fallbacks.",
      "No <filter> chains, no drop shadows, no gradients unless explicitly in palette.",
      "No xlink:href external references.",
      "No inline style= beyond fill / stroke / stroke-width.",
      "No more than 40 <path> elements."
    ],
    skeleton: buildSkeleton("0 0 256 256", { width: 256, height: 256 }),
    style_hints: [
      "Flat vector. Two-tone treatment. Bold, deliberate curves.",
      "Favor geometric primitives (circle, rect, polygon) over freehand paths where possible."
    ],
    validation_hints: [
      "Check: viewBox is exactly '0 0 256 256'.",
      "Check: <path> count ≤ 40.",
      "Check: only colors from the palette appear as fill/stroke values."
    ],
    research_refs: [
      "docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md",
      "docs/research/12-vector-svg-generation/",
      "docs/research/08-logo-generation/8d-monograms-and-color-palette-control.md"
    ]
  };
}

function faviconBrief({ brand_bundle }: BuildInput): SvgBrief {
  const palette = resolvePalette(brand_bundle, ["#0F172A", "#F59E0B"]);
  return {
    asset_type: "favicon",
    viewBox: "0 0 32 32",
    canvas: { width: 32, height: 32 },
    palette: { hex: palette, slots: Math.min(palette.length, 2) },
    path_budget: 8,
    stroke: { default_width_px: 0, linecap: "round" },
    require: [
      "Must read unambiguously at 16×16 px. Test by squinting.",
      "At most 2 distinct colors. WCAG AA contrast against both a white AND a dark browser tab.",
      "Single bold glyph or silhouette. No fine detail below 1px.",
      'Transparent background. fill="none" on root.'
    ],
    do_not: [
      "No <text> element — system fonts render unpredictably in favicons.",
      "No more than 8 <path> elements.",
      "No gradients. No filters. No anti-alias-dependent detail.",
      "No <image>."
    ],
    skeleton: buildSkeleton("0 0 32 32", { width: 32, height: 32 }),
    style_hints: [
      "Treat it like a glyph: one recognizable shape, thick strokes or solid fills.",
      "If the mark has small detail, drop the detail here — legibility at 16² beats fidelity to the full logo."
    ],
    validation_hints: [
      "Check: downscale to 16×16, does it still read?",
      "Check: contrast ratio ≥ 4.5:1 against #FFFFFF and ≥ 4.5:1 against #0F172A."
    ],
    research_refs: [
      "docs/research/11-favicon-web-assets/",
      "docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md"
    ]
  };
}

function iconPackBrief({ brand_bundle }: BuildInput): SvgBrief {
  const palette = resolvePalette(brand_bundle, ["currentColor"]);
  return {
    asset_type: "icon_pack",
    viewBox: "0 0 24 24",
    canvas: { width: 24, height: 24 },
    palette: { hex: palette, slots: 1 },
    path_budget: 12,
    stroke: { default_width_px: 2, linecap: "round" },
    require: [
      'Draw on a 24×24 grid, aligned to integer pixels. Use stroke-width="2" stroke-linecap="round" stroke-linejoin="round".',
      'Use fill="none" on paths; let stroke="currentColor" inherit from parent color.',
      "Consistent visual weight across the set — the same stroke width, corner rounding, and proportions.",
      "Single concept per icon. If the user names multiple icons, emit one <svg> per icon."
    ],
    do_not: [
      "No hard-coded colors. Use currentColor so the app can recolor via CSS.",
      "No gradients, no shadows, no filters.",
      "No text labels.",
      "No more than 12 paths per icon."
    ],
    skeleton: buildStrokeSkeleton("0 0 24 24", { width: 24, height: 24 }),
    style_hints: [
      "Lucide / Heroicons aesthetic: 2-pixel stroke, rounded caps and joins, 24px grid.",
      "Prefer rectangles, circles, and polylines over freehand paths where the shape allows."
    ],
    validation_hints: [
      'Check: every path has fill="none" and stroke="currentColor".',
      "Check: stroke-width is 2 throughout (no mixed weights)."
    ],
    research_refs: [
      "docs/research/10-ui-illustrations-graphics/",
      "docs/research/12-vector-svg-generation/"
    ]
  };
}

function stickerBrief({ brand_bundle }: BuildInput): SvgBrief {
  const palette = resolvePalette(brand_bundle, ["#0F172A", "#F59E0B", "#FFFFFF"]);
  return {
    asset_type: "sticker",
    viewBox: "0 0 512 512",
    canvas: { width: 512, height: 512 },
    palette: { hex: palette, slots: Math.min(palette.length, 4) },
    path_budget: 30,
    stroke: { default_width_px: 8, linecap: "round" },
    require: [
      "Bold cartoon-style subject with a chunky outer stroke (the 'sticker border').",
      "Subject fills ~80% of the viewBox, centered.",
      'Transparent background. fill="none" on root.',
      "High contrast interior fills; the sticker should pop against any background."
    ],
    do_not: [
      "No <image>, no <filter>, no complex gradients.",
      "No more than 30 paths.",
      "No realistic shading — keep it flat and graphic."
    ],
    skeleton: buildSkeleton("0 0 512 512", { width: 512, height: 512 }),
    style_hints: [
      "Pop-art or kawaii aesthetic depending on the brief. Thick outer stroke is non-negotiable.",
      "Silhouette first; detail second."
    ],
    validation_hints: ["Check: outer stroke width ≥ 6 px.", "Check: subject bbox ≥ 70% of canvas."],
    research_refs: ["docs/research/10-ui-illustrations-graphics/"]
  };
}

function transparentMarkBrief({ brand_bundle }: BuildInput): SvgBrief {
  const palette = resolvePalette(brand_bundle, ["#0F172A"]);
  return {
    asset_type: "transparent_mark",
    viewBox: "0 0 512 512",
    canvas: { width: 512, height: 512 },
    palette: { hex: palette, slots: Math.min(palette.length, 2) },
    path_budget: 20,
    stroke: { default_width_px: 0, linecap: "round" },
    require: [
      "Single isolated subject on a fully transparent background.",
      'No background <rect>. fill="none" on root. Verify by checking the raw SVG text.',
      "Subject tight-bbox centered."
    ],
    do_not: ["No backing fill anywhere.", "No <image>.", "No filters."],
    skeleton: buildSkeleton("0 0 512 512", { width: 512, height: 512 }),
    style_hints: ["Flat monochrome or two-tone. Think watermark or badge."],
    validation_hints: ['Check: SVG contains no <rect fill="..."> spanning 100% of the canvas.'],
    research_refs: [
      "docs/research/13-transparent-backgrounds/",
      "docs/research/04-gemini-imagen-prompting/4c-transparent-background-checker-problem.md"
    ]
  };
}

function appIconBrief({ brand_bundle }: BuildInput): SvgBrief {
  // iOS safe-zone is 80% of the 1024² icon. We author on 1024 with a 102px
  // inset so packaging can render at every scale without clipping.
  // Source: docs/research/09-app-icon-generation/9a-ios-app-icon-hig-specs.md
  const palette = resolvePalette(brand_bundle, ["#0F172A", "#F59E0B"]);
  return {
    asset_type: "app_icon",
    viewBox: "0 0 1024 1024",
    canvas: { width: 1024, height: 1024 },
    palette: { hex: palette, slots: Math.min(palette.length, 3) },
    path_budget: 30,
    stroke: { default_width_px: 0, linecap: "round" },
    require: [
      "Subject tight-bbox fits inside the 824×824 center (iOS 80% safe zone). Leave 100px margin on all sides.",
      "Background layer: a solid-color <rect> at (0,0,1024,1024) in the brand's primary color.",
      "Foreground layer: the mark centered. No transparency on the root — this is an icon, not a logo.",
      "Export will fan out to AppIconSet, Android adaptive, PWA maskable — author once, export many."
    ],
    do_not: [
      "Do NOT make the background transparent (App Store rejects transparent app icons).",
      "No <text>. No wordmarks inside app icons.",
      "No filters, no gradients beyond what's in the palette."
    ],
    skeleton: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${palette[0]}" />
  <!-- centered mark -->
</svg>`,
    style_hints: [
      "Geometric, bold, flat. Apple rejects busy icons.",
      "If the mark has a wordmark, strip it — app icons are graphic-only."
    ],
    validation_hints: [
      'Check: root <svg> has NO fill="none" on it (icon must be opaque).',
      "Check: foreground mark bbox centered within 824×824.",
      "Check: exactly ONE full-canvas <rect> as the background."
    ],
    research_refs: [
      "docs/research/09-app-icon-generation/9a-ios-app-icon-hig-specs.md",
      "docs/research/09-app-icon-generation/9b-android-adaptive-themed-icons.md",
      "docs/research/09-app-icon-generation/9c-pwa-manifest-maskable.md"
    ]
  };
}

// ───────────────────────────── helpers ─────────────────────────────

function resolvePalette(bundle: BrandBundle | undefined, fallback: string[]): string[] {
  const p = bundle?.palette;
  if (p && p.length > 0) return p.slice(0, 8);
  return fallback;
}

function buildSkeleton(viewBox: string, size: { width: number; height: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size.width}" height="${size.height}" fill="none">
  <!-- paths go here; use only colors from the palette -->
</svg>`;
}

function buildStrokeSkeleton(viewBox: string, size: { width: number; height: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size.width}" height="${size.height}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- paths go here; all stroke, no fill -->
</svg>`;
}
