import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { CONFIG } from "../config.js";
import { hashBundle } from "../brand.js";
import { buildSvgBrief } from "../svg-briefs.js";
import { tier0 } from "../pipeline/validate.js";
import { loadSharp } from "../pipeline/sharp.js";
import { exportFaviconBundle, exportAppIconBundle } from "../pipeline/export.js";
import { safeWritePath } from "../security/paths.js";
import { assertSafeSvg } from "../security/svg-sanitize.js";
import type { SaveInlineSvgInputT } from "../schemas.js";
import type { AssetBundle } from "../types.js";

/**
 * Tool: asset_save_inline_svg
 *
 * Round-trip endpoint for inline_svg mode. The hosting LLM (Claude)
 * emitted the SVG inline in chat — this tool takes that SVG back,
 * validates it against the brief it was given, writes a master.svg
 * file, and runs the platform export where it applies.
 *
 * Without this tool the user gets a code block in chat and has to
 * copy/paste it into a file themselves. With it the user gets a
 * real file path they can open, plus favicon.ico / AppIcon.appiconset /
 * PWA bundle where appropriate.
 *
 * Validation rules mirror svg_brief contract (viewBox, <path> count,
 * palette) plus the existing tier-0 pipeline.
 */
export async function saveInlineSvg(input: SaveInlineSvgInputT): Promise<AssetBundle> {
  const assetType = input.asset_type;
  const brief = buildSvgBrief({
    asset_type: assetType,
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle })
  });

  const outDir = safeWritePath(
    input.output_dir ?? resolve(CONFIG.outputDir, `${assetType}-${Date.now()}`)
  );
  mkdirSync(outDir, { recursive: true });

  const rawSvg = input.svg.trim();

  // Unconditional XSS/SSRF guard. Runs BEFORE we persist or rasterize, so a
  // caller can't smuggle <script>, event handlers, javascript: URIs, or
  // external resource refs. This check does not depend on SVGO (optional
  // dep), so the server remains safe even in a minimal install. See
  // src/security/svg-sanitize.ts for the full policy.
  assertSafeSvg(rawSvg);

  const validationWarnings = validateAgainstBrief(rawSvg, brief);
  const looksLikeSvg = /^\s*<svg[\s>]/i.test(rawSvg);

  // Persist the SVG text verbatim — the caller should see exactly what they
  // submitted. Downstream rasterization is skipped if the input is not SVG.
  const svgPath = resolve(outDir, fileName(assetType, "svg"));
  writeFileSync(svgPath, rawSvg);

  const variants: AssetBundle["variants"] = [
    {
      path: svgPath,
      format: "svg",
      paths: countPaths(rawSvg),
      bytes: Buffer.byteLength(rawSvg, "utf-8")
    }
  ];

  const warnings: string[] = [...validationWarnings];

  // Rasterize to PNG (useful for logos / stickers / marks). Skip when the
  // asset is favicon/app_icon because their exporters rasterize themselves.
  const sharp = await loadSharp();
  const needsRasterMaster =
    assetType === "logo" ||
    assetType === "sticker" ||
    assetType === "transparent_mark" ||
    assetType === "icon_pack";
  let masterPng = Buffer.alloc(0);
  if (sharp && needsRasterMaster && looksLikeSvg) {
    const size = assetType === "icon_pack" ? 512 : 1024;
    masterPng = Buffer.from(await sharp(Buffer.from(rawSvg)).resize(size, size).png().toBuffer());
    const pngPath = resolve(outDir, fileName(assetType, "png"));
    writeFileSync(pngPath, masterPng);
    variants.push({
      path: pngPath,
      format: "png",
      width: size,
      height: size,
      rgba: true,
      bytes: masterPng.length
    });
  } else if (!sharp && needsRasterMaster) {
    warnings.push(
      "sharp not installed — skipped PNG rasterization. SVG saved; install sharp for master.png + platform exports."
    );
  }

  // Platform fan-out.
  if (sharp && assetType === "favicon" && looksLikeSvg) {
    const masterBuf = Buffer.from(
      await sharp(Buffer.from(rawSvg)).resize(1024, 1024).png().toBuffer()
    );
    const masterSvgDark = input.dark_mode ? deriveDarkSvg(rawSvg) : undefined;
    const flattenColor = input.brand_bundle?.palette?.[0];
    const result = await exportFaviconBundle({
      masterPng: masterBuf,
      masterSvg: rawSvg,
      ...(masterSvgDark && { masterSvgDark }),
      outDir,
      ...(flattenColor && { flattenColor }),
      ...(input.app_name && { appName: input.app_name }),
      ...(input.theme_color && { themeColor: input.theme_color }),
      ...(input.background_color && { backgroundColor: input.background_color })
    });
    for (const f of result.files) {
      if (variants.some((v) => v.path === f.path)) continue;
      variants.push({
        path: f.path,
        format: formatForPath(f.path),
        bytes: f.bytes
      });
    }
    warnings.push(...result.warnings);
    masterPng = masterBuf;
  } else if (sharp && assetType === "app_icon" && looksLikeSvg) {
    const platforms = input.platforms ?? ["all"];
    const masterBuf = Buffer.from(
      await sharp(Buffer.from(rawSvg)).resize(1024, 1024).png().toBuffer()
    );
    const result = await exportAppIconBundle({
      masterPng: masterBuf,
      platforms,
      outDir,
      ...(input.brand_bundle?.palette?.[0] && { flattenColor: input.brand_bundle.palette[0] }),
      ...(input.brand_bundle?.palette && { palette: input.brand_bundle.palette })
    });
    for (const f of result.files) {
      if (variants.some((v) => v.path === f.path)) continue;
      variants.push({
        path: f.path,
        format: formatForPath(f.path),
        bytes: f.bytes
      });
    }
    warnings.push(...result.warnings);
    masterPng = masterBuf;
  }

  // Tier-0 validation on the raster master if we have one; otherwise use
  // the SVG bytes so file-size checks still run.
  const validation = await tier0({
    image: masterPng.length > 0 ? masterPng : Buffer.from(rawSvg),
    asset_type: assetType,
    transparency_required: needsRasterMaster || assetType === "favicon",
    ...(input.brand_bundle && { brand_bundle: input.brand_bundle }),
    ...(input.expected_text && { intended_text: input.expected_text })
  });

  return {
    mode: "api",
    asset_type: assetType,
    brief: `inline_svg:${assetType}`,
    brand_bundle_hash: hashBundle(input.brand_bundle ?? null),
    variants,
    provenance: {
      model: "inline_svg",
      seed: 0,
      prompt_hash: "",
      params_hash: ""
    },
    validations: validation,
    warnings: [
      `saved inline SVG to ${svgPath} (${variants.length} file${variants.length === 1 ? "" : "s"} written).`,
      ...warnings,
      ...validation.warnings
    ]
  };
}

// ───────────────────────────── validation ─────────────────────────────

function validateAgainstBrief(svg: string, brief: ReturnType<typeof buildSvgBrief>): string[] {
  const warnings: string[] = [];

  if (!/^\s*<svg[\s>]/i.test(svg)) {
    warnings.push("svg input does not start with <svg>.");
    return warnings;
  }

  const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!viewBoxMatch) {
    warnings.push(`svg has no viewBox; brief requires viewBox="${brief.viewBox}".`);
  } else if (viewBoxMatch[1]!.trim() !== brief.viewBox) {
    warnings.push(
      `svg viewBox="${viewBoxMatch[1]}" does not match brief ("${brief.viewBox}"). Asset may not scale cleanly.`
    );
  }

  const paths = countPaths(svg);
  if (paths > brief.path_budget) {
    warnings.push(
      `svg uses ${paths} paths; path_budget is ${brief.path_budget}. Consider simplifying — keeps the file small and rasterization fast.`
    );
  }

  if (/<image\b/i.test(svg)) {
    warnings.push("svg contains <image> element — raster inside vector defeats the purpose.");
  }
  if (/<filter\b/i.test(svg)) {
    warnings.push("svg contains <filter> — blurs + shadows render unpredictably at small sizes.");
  }
  if (/xlink:href/.test(svg)) {
    warnings.push("svg contains xlink:href external reference — inline the shape instead.");
  }

  // Palette check — every hex in fill/stroke must appear in brief.palette.hex
  // (unless palette uses currentColor, in which case no check).
  if (!brief.palette.hex.includes("currentColor")) {
    const allowed = new Set(brief.palette.hex.map((h) => h.toLowerCase()));
    const hexesInSvg = Array.from(svg.matchAll(/(?:fill|stroke)\s*=\s*"(#[0-9a-fA-F]{3,8})"/g)).map(
      (m) => m[1]!.toLowerCase()
    );
    const expanded = new Set(hexesInSvg.map(expandHex));
    const unknown = Array.from(expanded).filter(
      (h) => !allowed.has(h) && h !== "none" && h !== "transparent"
    );
    if (unknown.length > 0) {
      warnings.push(
        `svg uses colors not in the palette: ${unknown.join(", ")}. Brief palette: ${brief.palette.hex.join(", ")}.`
      );
    }
  }

  return warnings;
}

function countPaths(svg: string): number {
  const m = svg.match(/<path\b/gi);
  return m ? m.length : 0;
}

function expandHex(h: string): string {
  // #abc → #aabbcc
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [, a, b, c] = h;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return h.toLowerCase();
}

function formatForPath(p: string): string {
  const ext = (p.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  if (ext === "svg") return "svg";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "json" || ext === "webmanifest") return "json";
  if (ext === "xml") return "xml";
  if (ext === "ico") return "ico";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp")
    return ext === "jpg" ? "jpeg" : ext;
  return "binary";
}

function fileName(type: string, ext: string): string {
  switch (type) {
    case "favicon":
      return `icon.${ext}`;
    case "app_icon":
      return `app-icon.${ext}`;
    case "icon_pack":
      return `icon.${ext}`;
    default:
      return `mark.${ext}`;
  }
}

/**
 * Derive a dark-mode variant of a light-mode SVG by inverting #RRGGBB fills.
 * Not a perfect recoloring — a proper brand palette has an explicit dark
 * variant — but a sensible default when the caller didn't supply one.
 */
function deriveDarkSvg(light: string): string {
  return light.replace(/fill="#([0-9a-fA-F]{6})"/g, (_, hex) => {
    const r = 255 - parseInt(hex.slice(0, 2), 16);
    const g = 255 - parseInt(hex.slice(2, 4), 16);
    const b = 255 - parseInt(hex.slice(4, 6), 16);
    const inv =
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0");
    return `fill="${inv}"`;
  });
}
