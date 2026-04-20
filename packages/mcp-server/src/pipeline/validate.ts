import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSharp } from "./sharp.js";
import type { AssetType, BrandBundle, ValidationResult } from "../types.js";

const CONTRAST_ASSETS = new Set<AssetType>(["favicon", "app_icon", "logo", "icon_pack"]);

export interface ValidateInput {
  image: Buffer;
  format?: string;
  asset_type: AssetType;
  brand_bundle?: BrandBundle;
  intended_text?: string;
  expected_width?: number;
  expected_height?: number;
  transparency_required?: boolean;
}

/**
 * Tier-0 deterministic validator. No network, no VLM. Never mutates the buffer.
 *
 * Checks (from SYNTHESIS.md § Evaluation — Tier 0):
 *   - Dimensions exact
 *   - Alpha channel presence
 *   - Checkerboard pattern detection (tile-luma heuristic on the RGB-checkerboard
 *     artifact produced by non-RGBA diffusion models like Imagen/Gemini; requires
 *     alternation between light/dark tiles to fire)
 *   - Subject tight-bbox inside safe zone (for app_icon, favicon, icon_pack)
 *   - File-size budget per asset type
 *   - Palette ΔE2000 against brand palette (if provided)
 *   - WCAG contrast of brand primary vs #FFFFFF and #0F172A (for favicon, app_icon, logo)
 *   - OCR Levenshtein against intended_text (if provided and tesseract.js installed)
 */
export async function tier0(input: ValidateInput): Promise<ValidationResult> {
  const sharp = await loadSharp();
  const tier0Results: Record<string, boolean | number | string> = {};
  const warnings: string[] = [];

  if (!sharp) {
    warnings.push(
      "sharp not installed; tier-0 validation will be minimal (header inspection only)."
    );
    tier0Results["sharp_available"] = false;
    tier0Results["bytes"] = input.image.byteLength;
    return { pass: true, tier0: tier0Results, warnings };
  }

  try {
    const img = sharp(input.image);
    const meta = await img.metadata();

    tier0Results["width"] = meta.width ?? 0;
    tier0Results["height"] = meta.height ?? 0;
    tier0Results["format"] = meta.format ?? "unknown";
    tier0Results["has_alpha"] = Boolean(meta.hasAlpha);
    tier0Results["bytes"] = input.image.byteLength;

    if (input.expected_width && meta.width !== input.expected_width) {
      warnings.push(`dimensions: expected width ${input.expected_width}, got ${meta.width}`);
    }
    if (input.expected_height && meta.height !== input.expected_height) {
      warnings.push(`dimensions: expected height ${input.expected_height}, got ${meta.height}`);
    }

    if (input.transparency_required && !meta.hasAlpha) {
      tier0Results["alpha_required_but_missing"] = true;
      warnings.push("alpha channel required but not present in image");
    }

    if (input.transparency_required && meta.width && meta.height) {
      const checker = await detectCheckerboardPattern(sharp, input.image, meta.width, meta.height);
      tier0Results["checkerboard_pattern_ratio"] = checker.ratio;
      if (checker.ratio > 0.05) {
        tier0Results["checkerboard_detected"] = true;
        warnings.push(
          `checkerboard pattern detected in ${(checker.ratio * 100).toFixed(1)}% of analyzed pixels; reject and route to native-RGBA provider`
        );
      }
    }

    const budget = fileSizeBudget(input.asset_type);
    if (budget && input.image.byteLength > budget) {
      tier0Results["file_size_over_budget"] = true;
      warnings.push(
        `file size ${input.image.byteLength} > budget ${budget} for ${input.asset_type}`
      );
    }

    // Source: docs/research/03-evaluation-metrics/3e-asset-specific-evaluation.md
    // Safe-zone bbox: tight alpha bbox must fit inside platform safe zone.
    const safeZone = safeZoneForAssetType(input.asset_type);
    if (safeZone && meta.width && meta.height && meta.hasAlpha) {
      const bbox = await subjectBbox(sharp, input.image, meta.width, meta.height);
      if (bbox) {
        tier0Results["subject_bbox_x"] = bbox.x;
        tier0Results["subject_bbox_y"] = bbox.y;
        tier0Results["subject_bbox_width"] = bbox.width;
        tier0Results["subject_bbox_height"] = bbox.height;

        // Scale safe zone to image dimensions (safeZone is expressed vs canonical size).
        const canonical = canonicalSizeForAssetType(input.asset_type);
        const sx = meta.width / canonical.width;
        const sy = meta.height / canonical.height;
        const expectedW = safeZone.width * sx;
        const expectedH = safeZone.height * sy;
        const marginX = (meta.width - expectedW) / 2;
        const marginY = (meta.height - expectedH) / 2;

        const insideX = bbox.x >= marginX - 1 && bbox.x + bbox.width <= meta.width - marginX + 1;
        const insideY = bbox.y >= marginY - 1 && bbox.y + bbox.height <= meta.height - marginY + 1;
        if (!insideX || !insideY) {
          tier0Results["safe_zone_violation"] = true;
          warnings.push(
            `subject bbox ${bbox.width}×${bbox.height} @ (${bbox.x},${bbox.y}) exceeds ${input.asset_type} safe zone ${Math.round(expectedW)}×${Math.round(expectedH)}`
          );
        } else {
          tier0Results["safe_zone_ok"] = true;
        }
      }
    }

    // Source: docs/research/15-style-consistency-brand/ + 03-evaluation-metrics/3e
    // Palette ΔE2000: dominant colors of image vs brand palette.
    if (input.brand_bundle?.palette && input.brand_bundle.palette.length > 0) {
      const dominant = await dominantColors(sharp, input.image);
      const avgDe = averageMinDeltaE2000(dominant, input.brand_bundle.palette);
      tier0Results["palette_delta_e2000_avg"] = Number(avgDe.toFixed(2));
      if (avgDe > 10) {
        tier0Results["palette_drift"] = true;
        warnings.push(
          `dominant colors drift from brand palette (avg ΔE2000 ${avgDe.toFixed(1)} > 10)`
        );
      }
    }

    // Source: docs/research/assets/25-wcag-contrast-libs.md
    // WCAG contrast: brand primary must be legible on light AND dark browser tabs.
    // Favicons ship at 16×16 — low-contrast primaries become invisible.
    if (
      input.brand_bundle?.palette &&
      input.brand_bundle.palette.length > 0 &&
      CONTRAST_ASSETS.has(input.asset_type)
    ) {
      const primary = input.brand_bundle.palette[0]!;
      const onWhite = contrastRatio(primary, "#FFFFFF");
      const onDark = contrastRatio(primary, "#0F172A");
      tier0Results["contrast_on_white"] = Number(onWhite.toFixed(2));
      tier0Results["contrast_on_dark"] = Number(onDark.toFixed(2));
      const minContrast = Math.min(onWhite, onDark);
      if (minContrast < 3.0) {
        tier0Results["contrast_low"] = true;
        warnings.push(
          `brand primary ${primary} has contrast ${onWhite.toFixed(2)}:1 on white and ${onDark.toFixed(2)}:1 on #0F172A. At least one side is below WCAG AA non-text 3:1 — a ${input.asset_type} will be hard to see on that background.`
        );
      }
    }

    // Source: docs/research/03-evaluation-metrics/ + 08-logo-generation/8c
    // OCR Levenshtein: recognized text must be ≤1 edit from intended_text.
    if (input.intended_text && input.intended_text.trim().length > 0) {
      const ocr = await runOcr(input.image);
      if (ocr.available) {
        tier0Results["ocr_text"] = ocr.text;
        const dist = levenshtein(
          ocr.text.trim().toLowerCase(),
          input.intended_text.trim().toLowerCase()
        );
        tier0Results["ocr_levenshtein"] = dist;
        if (dist > 1) {
          tier0Results["ocr_mismatch"] = true;
          warnings.push(
            `OCR read "${ocr.text.trim()}" vs intended "${input.intended_text.trim()}" (Levenshtein ${dist} > 1). Diffusion samplers mis-render text past ~3 words — regenerate text-free mark + composite real typography.`
          );
        }
      } else {
        tier0Results["ocr_available"] = false;
        warnings.push(
          "intended_text provided but OCR engine not installed. Install tesseract.js to enable text validation (optional dep)."
        );
      }
    }
  } catch (err) {
    warnings.push(`sharp metadata read failed: ${(err as Error).message}`);
    tier0Results["metadata_error"] = true;
  }

  return {
    pass: warnings.length === 0,
    tier0: tier0Results,
    warnings
  };
}

/**
 * Detects the RGB-checkerboard artifact emitted by non-RGBA models when asked
 * for a transparent background (Imagen, Gemini Flash Image, SDXL without
 * LayerDiffuse). The artifact is a regular 8-px grid of light-grey (~204) and
 * white (~240) tiles.
 *
 * Heuristic:
 *   1. Extract a centered 64×64 greyscale patch; split into 8 rows × 8 cols
 *      of 8-px tiles.
 *   2. Classify each tile as LIGHT (mean 195-215) or WHITE (mean 240-255) or
 *      OTHER.
 *   3. Require that >=80% of tiles are LIGHT or WHITE, AND that the neighbor
 *      alternation rate is >=50% (i.e. each LIGHT is neighbored by a WHITE
 *      more often than chance). Plain white backgrounds don't alternate.
 */
async function detectCheckerboardPattern(
  sharp: typeof import("sharp"),
  buf: Buffer,
  w: number,
  h: number
): Promise<{ ratio: number }> {
  try {
    const patchSize = Math.min(64, w, h);
    const left = Math.max(0, Math.floor((w - patchSize) / 2));
    const top = Math.max(0, Math.floor((h - patchSize) / 2));
    const raw = await sharp(buf)
      .extract({ left, top, width: patchSize, height: patchSize })
      .removeAlpha()
      .greyscale()
      .raw()
      .toBuffer();

    const tile = 8;
    const rows = Math.floor(patchSize / tile);
    const cols = Math.floor(patchSize / tile);
    if (rows < 2 || cols < 2) return { ratio: 0 };

    // 0 = other, 1 = light (~204), 2 = white (~245)
    const grid: number[] = new Array(rows * cols).fill(0);
    let lightOrWhite = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        let sum = 0;
        for (let yy = 0; yy < tile; yy++) {
          for (let xx = 0; xx < tile; xx++) {
            sum += raw[(ty * tile + yy) * patchSize + (tx * tile + xx)] ?? 0;
          }
        }
        const mean = sum / (tile * tile);
        let label = 0;
        if (mean > 195 && mean < 215) label = 1;
        else if (mean > 240) label = 2;
        grid[ty * cols + tx] = label;
        if (label !== 0) lightOrWhite++;
      }
    }

    const fill = lightOrWhite / (rows * cols);
    if (fill < 0.8) return { ratio: 0 };

    // Count alternation between adjacent non-OTHER tiles.
    let altEdges = 0;
    let totalEdges = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const me = grid[ty * cols + tx]!;
        if (me === 0) continue;
        if (tx + 1 < cols) {
          const r = grid[ty * cols + tx + 1]!;
          if (r !== 0) {
            totalEdges++;
            if (r !== me) altEdges++;
          }
        }
        if (ty + 1 < rows) {
          const d = grid[(ty + 1) * cols + tx]!;
          if (d !== 0) {
            totalEdges++;
            if (d !== me) altEdges++;
          }
        }
      }
    }
    if (totalEdges === 0) return { ratio: 0 };
    const altRate = altEdges / totalEdges;
    if (altRate < 0.5) return { ratio: 0 };
    // Scale: 0.5 alt → 0.25 ratio; 1.0 alt → 1.0.
    return { ratio: Math.min(1, (altRate - 0.25) * 1.5) };
  } catch {
    return { ratio: 0 };
  }
}

async function subjectBbox(
  sharp: typeof import("sharp"),
  buf: Buffer,
  w: number,
  h: number
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    // Downsample to 256 max dim for a fast scan, then scale coords back.
    const scanMax = 256;
    const scale = Math.min(1, scanMax / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));

    const raw = await sharp(buf)
      .resize(sw, sh, { fit: "fill", kernel: "nearest" })
      .ensureAlpha()
      .raw()
      .toBuffer();

    let minX = sw,
      minY = sh,
      maxX = -1,
      maxY = -1;
    const alphaThreshold = 16;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = (y * sw + x) * 4 + 3;
        const a = raw[idx] ?? 0;
        if (a > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null; // fully transparent

    const inv = 1 / scale;
    return {
      x: Math.round(minX * inv),
      y: Math.round(minY * inv),
      width: Math.round((maxX - minX + 1) * inv),
      height: Math.round((maxY - minY + 1) * inv)
    };
  } catch {
    return null;
  }
}

async function dominantColors(
  sharp: typeof import("sharp"),
  buf: Buffer,
  k = 6
): Promise<Array<{ r: number; g: number; b: number; weight: number }>> {
  const size = 64;
  const raw = await sharp(buf).resize(size, size, { fit: "inside" }).removeAlpha().raw().toBuffer();

  const pixels: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < raw.length; i += 3) {
    pixels.push([raw[i] ?? 0, raw[i + 1] ?? 0, raw[i + 2] ?? 0]);
  }
  if (pixels.length === 0) return [];

  // Deterministic seed init: evenly-spaced indices.
  const centroids: Array<[number, number, number]> = [];
  for (let i = 0; i < k; i++) {
    const px = pixels[Math.floor((i * pixels.length) / k)];
    if (px) centroids.push([...px]);
  }
  const counts = new Array(centroids.length).fill(0);

  for (let iter = 0; iter < 8; iter++) {
    const sums: Array<[number, number, number]> = centroids.map(() => [0, 0, 0]);
    counts.fill(0);
    for (const px of pixels) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const ct = centroids[c]!;
        const dr = px[0] - ct[0];
        const dg = px[1] - ct[1];
        const db = px[2] - ct[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const s = sums[best]!;
      s[0] += px[0];
      s[1] += px[1];
      s[2] += px[2];
      counts[best]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      const cnt = counts[c] ?? 0;
      if (cnt > 0) {
        const s = sums[c]!;
        centroids[c] = [Math.round(s[0] / cnt), Math.round(s[1] / cnt), Math.round(s[2] / cnt)];
      }
    }
  }

  const total = counts.reduce((a: number, b: number) => a + b, 0) || 1;
  return centroids
    .map((c, i) => ({ r: c[0], g: c[1], b: c[2], weight: (counts[i] ?? 0) / total }))
    .filter((c) => c.weight > 0.02)
    .sort((a, b) => b.weight - a.weight);
}

function averageMinDeltaE2000(
  dominant: Array<{ r: number; g: number; b: number; weight: number }>,
  palette: string[]
): number {
  if (dominant.length === 0 || palette.length === 0) return 0;
  const paletteLab = palette.map((hex) => rgbToLab(hexToRgb(hex)));
  let weightedSum = 0;
  let totalWeight = 0;
  for (const d of dominant) {
    const lab = rgbToLab({ r: d.r, g: d.g, b: d.b });
    let minDe = Infinity;
    for (const pLab of paletteLab) {
      const de = deltaE2000(lab, pLab);
      if (de < minDe) minDe = de;
    }
    weightedSum += minDe * d.weight;
    totalWeight += d.weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = hex.replace(/^#/, "");
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export function rgbToLab({ r, g, b }: { r: number; g: number; b: number }): {
  L: number;
  a: number;
  b: number;
} {
  // sRGB → linear
  const srgbToLin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const rl = srgbToLin(r),
    gl = srgbToLin(g),
    bl = srgbToLin(b);
  // D65
  const X = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const Y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const Z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X),
    fy = f(Y),
    fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// CIEDE2000. Reference: Sharma, Wu, Dalal 2005.
export function deltaE2000(
  l1: { L: number; a: number; b: number },
  l2: { L: number; a: number; b: number }
): number {
  const avgL = (l1.L + l2.L) / 2;
  const C1 = Math.hypot(l1.a, l1.b);
  const C2 = Math.hypot(l2.a, l2.b);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = l1.a * (1 + G);
  const a2p = l2.a * (1 + G);
  const C1p = Math.hypot(a1p, l1.b);
  const C2p = Math.hypot(a2p, l2.b);
  const avgCp = (C1p + C2p) / 2;
  const h1p = Math.atan2(l1.b, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(l2.b, a2p) * (180 / Math.PI);
  const h1 = h1p < 0 ? h1p + 360 : h1p;
  const h2 = h2p < 0 ? h2p + 360 : h2p;
  let dhp = h2 - h1;
  if (C1p * C2p === 0) dhp = 0;
  else if (dhp > 180) dhp -= 360;
  else if (dhp < -180) dhp += 360;
  const dLp = l2.L - l1.L;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);
  let avgHp: number;
  if (C1p * C2p === 0) avgHp = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) avgHp = (h1 + h2) / 2;
  else avgHp = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T =
    1 -
    0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);
  const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -Math.sin((2 * dTheta * Math.PI) / 180) * Rc;
  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh)
  );
}

async function runOcr(image: Buffer): Promise<{ available: boolean; text: string }> {
  try {
    const mod = (await import("tesseract.js")) as unknown as {
      recognize: (
        img: Buffer,
        lang: string,
        options?: Record<string, unknown>
      ) => Promise<{ data: { text: string } }>;
    };
    // If a bundled traineddata file exists in the repo root, point tesseract at
    // it to avoid a runtime download. Otherwise tesseract.js falls back to its
    // default CDN fetch — slower first run, still correct.
    const bundledLangPath = resolveBundledLangPath();
    const options = bundledLangPath ? { langPath: bundledLangPath } : undefined;
    const { data } = options
      ? await mod.recognize(image, "eng", options)
      : await mod.recognize(image, "eng");
    return { available: true, text: data.text ?? "" };
  } catch {
    return { available: false, text: "" };
  }
}

function resolveBundledLangPath(): string | null {
  try {
    // Walk up from this module until we find eng.traineddata. Source layout:
    // packages/mcp-server/src/pipeline/validate.ts → repo root is 4 levels up.
    // Dist layout: packages/mcp-server/dist/pipeline/validate.js → same.
    const here = dirname(fileURLToPath(import.meta.url));
    for (const rel of ["../../../..", "../../..", "../..", ".."]) {
      const p = resolve(here, rel);
      if (existsSync(resolve(p, "eng.traineddata"))) return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function safeZoneForAssetType(type: AssetType): { width: number; height: number } | null {
  switch (type) {
    case "app_icon":
      return { width: 824, height: 824 };
    case "favicon":
      return { width: 16, height: 16 };
    case "icon_pack":
      return { width: 24, height: 24 };
    default:
      return null;
  }
}

function canonicalSizeForAssetType(type: AssetType): { width: number; height: number } {
  switch (type) {
    case "app_icon":
    case "favicon":
    case "logo":
    case "sticker":
    case "transparent_mark":
      return { width: 1024, height: 1024 };
    case "icon_pack":
      return { width: 512, height: 512 };
    case "og_image":
      return { width: 1200, height: 630 };
    case "hero":
      return { width: 1920, height: 1080 };
    case "illustration":
      return { width: 2048, height: 1536 };
    default:
      return { width: 1024, height: 1024 };
  }
}

function fileSizeBudget(type: AssetType): number | null {
  switch (type) {
    case "favicon":
      return 15 * 1024;
    case "og_image":
      return 5 * 1024 * 1024;
    case "app_icon":
      return 1 * 1024 * 1024;
    default:
      return null;
  }
}

/**
 * WCAG 2.1 relative luminance of an sRGB color. Formula: WCAG 2.1 § 1.4.11.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgbToLin = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

/**
 * WCAG 2.1 contrast ratio. Always returns >= 1.0.
 * Range 1 (no contrast) to 21 (black on white).
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Tier-2 VLM-as-judge. Optional, network-bound. Enabled when the caller sets
 * `PROMPT_TO_BUNDLE_VLM_URL`. The endpoint is expected to accept a POST with a
 * JSON body `{ image_base64, asset_type, intended_text?, brand_primary? }` and
 * return `{ pass: boolean, score?: number, notes?: string[] }`.
 *
 * We deliberately do NOT bundle a specific VLM provider — swap your own LLaVA,
 * Qwen-VL, or Claude Vision wrapper behind the URL.
 */
export async function tier2Vlm(
  image: Buffer,
  asset_type: AssetType,
  extras: { intended_text?: string; brand_primary?: string }
): Promise<{
  ran: boolean;
  pass?: boolean;
  score?: number;
  notes?: string[];
  error?: string;
}> {
  const url = process.env["PROMPT_TO_BUNDLE_VLM_URL"];
  if (!url) return { ran: false };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: image.toString("base64"),
        asset_type,
        ...(extras.intended_text && { intended_text: extras.intended_text }),
        ...(extras.brand_primary && { brand_primary: extras.brand_primary })
      }),
      signal: AbortSignal.timeout(30_000)
    });
    if (!resp.ok) {
      return { ran: true, error: `VLM endpoint returned HTTP ${resp.status}` };
    }
    const json = (await resp.json()) as {
      pass?: boolean;
      score?: number;
      notes?: string[];
    };
    return {
      ran: true,
      ...(json.pass !== undefined && { pass: json.pass }),
      ...(json.score !== undefined && { score: json.score }),
      ...(json.notes && { notes: json.notes })
    };
  } catch (err) {
    return { ran: true, error: (err as Error).message };
  }
}
