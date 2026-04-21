// Tool: asset_export_bundle
//
// Fan out a 1024² master PNG into the full platform bundle — iOS AppIconSet,
// Android adaptive, PWA maskable, visionOS parallax layers, Flutter launcher
// icons, favicon set. No provider key required; runs entirely on sharp.
//
// MCP equivalent of `p2a export master.png`. The LLM calls this after a
// generator produced a master (or when the user already has a hand-authored
// master.png they want exported). Zero prompt engineering involved — this is
// pure deterministic rasterization.

import { readFileSync, existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import type { ExportBundleInputT } from "../schemas.js";
import { exportAppIconBundle, exportFaviconBundle } from "../pipeline/export.js";
import { loadSharp } from "../pipeline/sharp.js";
import { safeReadPath } from "../security/paths.js";

export interface ExportBundleResult {
  out_dir: string;
  platforms: string[];
  files: Array<{ path: string; kind: string; bytes: number }>;
  warnings: string[];
}

const ALL_PLATFORMS = ["ios", "android", "pwa", "favicon", "visionos", "flutter"] as const;
type Platform = (typeof ALL_PLATFORMS)[number];
type InputPlatform = Platform | "all";

export async function exportBundle(input: ExportBundleInputT): Promise<ExportBundleResult> {
  const masterPath = safeReadPath(input.master_path);
  if (!existsSync(masterPath)) {
    throw new Error(`asset_export_bundle: master_path not found: ${masterPath}`);
  }

  const sharp = await loadSharp();
  if (!sharp) {
    throw new Error(
      "asset_export_bundle: sharp is not installed. Run `npm install sharp` (optional dep) and retry."
    );
  }

  // Pick out which platforms to fan out to. "all" expands to every platform.
  const requestedPlatforms: readonly InputPlatform[] =
    input.platforms && input.platforms.length > 0 ? (input.platforms as InputPlatform[]) : ["all"];
  const expanded: Platform[] = requestedPlatforms.flatMap((p) =>
    p === "all" ? [...ALL_PLATFORMS] : [p as Platform]
  );
  const platforms = Array.from(new Set(expanded));

  // Compute an out_dir if the caller didn't name one. Same scheme as the CLI:
  // ./assets/bundle-<stem>-<ts>, so repeated exports don't clobber each other.
  const stem = basename(masterPath, extname(masterPath));
  const outDir = input.out_dir
    ? resolve(input.out_dir)
    : resolve(process.cwd(), "assets", `bundle-${stem}-${Date.now()}`);

  // Normalize the master up front so every platform exporter receives a
  // consistent 1024² RGBA canvas.
  const raw = readFileSync(masterPath);
  const master = await sharp(raw)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();

  const wantsAppIcon =
    platforms.includes("ios") ||
    platforms.includes("android") ||
    platforms.includes("pwa") ||
    platforms.includes("visionos") ||
    platforms.includes("flutter");
  const wantsFavicon = platforms.includes("favicon");

  const files: Array<{ path: string; kind: string; bytes: number }> = [];
  const warnings: string[] = [];

  if (wantsAppIcon) {
    const iconPlatforms = platforms.filter(
      (p): p is "ios" | "android" | "pwa" | "visionos" | "flutter" => p !== "favicon"
    );
    const res = await exportAppIconBundle({
      masterPng: master,
      platforms:
        iconPlatforms.length > 0 ? iconPlatforms : ["ios", "android", "pwa", "visionos", "flutter"],
      outDir: outDir,
      ...(input.bg !== undefined && { flattenColor: input.bg }),
      ...(input.app_name !== undefined && { appName: input.app_name }),
      ios18Appearances: input.ios18 ?? false
    });
    files.push(...res.files);
    warnings.push(...res.warnings);
  }

  if (wantsFavicon) {
    const res = await exportFaviconBundle({
      masterPng: master,
      outDir: resolve(outDir, "favicon"),
      ...(input.bg !== undefined && { flattenColor: input.bg }),
      ...(input.app_name !== undefined && { appName: input.app_name }),
      ...(input.theme !== undefined && { themeColor: input.theme })
    });
    files.push(...res.files);
    warnings.push(...res.warnings);
  }

  return {
    out_dir: outDir,
    platforms,
    files,
    warnings
  };
}
