// `p2a export <master.png>` — standalone platform fan-out.
//
// Parity target: appicon.co and pub.dev/packages/flutter_launcher_icons. Runs
// entirely offline; no API key required. The MCP pipeline already contains the
// iOS / Android / PWA / favicon / visionOS exporters — this CLI command wraps
// them so frontend / mobile / Flutter / game devs can run the fan-out without
// an AI assistant in the loop.
//
// Usage:
//   p2a export ./brand.png
//   p2a export ./brand.png --platforms ios,android,favicon --out ./build/icons
//   p2a export ./brand.png --bg "#ff6a00" --ios18

import { readFileSync, existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import { exportAppIconBundle, exportFaviconBundle } from "../pipeline/export.js";
import { loadSharp } from "../pipeline/sharp.js";
import { exportBundle } from "../tools/export-bundle.js";

interface ExportArgs {
  input: string;
  platforms: Array<"ios" | "android" | "pwa" | "favicon" | "visionos" | "flutter">;
  outDir: string;
  flattenColor?: string;
  appName?: string;
  themeColor?: string;
  ios18: boolean;
  quiet: boolean;
}

export async function exportCommand(argv: string[]): Promise<void> {
  const asJson = argv.includes("--json");
  const args = parseArgs(argv);
  if (!args) {
    process.exit(2);
  }

  if (!existsSync(args.input)) {
    process.stderr.write(`p2a export: input not found: ${args.input}\n`);
    process.exit(1);
  }

  // --json short-circuits through the MCP tool wrapper so the shape matches
  // exactly what an LLM calling the tool over MCP would see.
  if (asJson) {
    try {
      const result = await exportBundle({
        master_path: args.input,
        platforms: args.platforms,
        out_dir: args.outDir,
        ...(args.flattenColor !== undefined && { bg: args.flattenColor }),
        ...(args.appName !== undefined && { app_name: args.appName }),
        ...(args.themeColor !== undefined && { theme: args.themeColor }),
        ios18: args.ios18
      });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } catch (e) {
      process.stderr.write(`${(e as Error).message}\n`);
      process.exit(1);
    }
    return;
  }

  const sharp = await loadSharp();
  if (!sharp) {
    process.stderr.write(
      `p2a export: sharp is not installed. Run \`npm install sharp\` (optional dep) and retry.\n`
    );
    process.exit(1);
  }

  // Normalize master: resize to 1024² RGBA up front so every platform exporter
  // receives a consistent canvas. Preserve alpha when present.
  const raw = readFileSync(args.input);
  const master = await sharp(raw)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();

  const wantsAppIcon =
    args.platforms.includes("ios") ||
    args.platforms.includes("android") ||
    args.platforms.includes("pwa") ||
    args.platforms.includes("visionos") ||
    args.platforms.includes("flutter");
  const wantsFavicon = args.platforms.includes("favicon");

  if (!args.quiet) {
    process.stderr.write(
      `p2a export: input=${basename(args.input)} platforms=[${args.platforms.join(", ")}] out=${args.outDir}\n`
    );
  }

  const allFiles: Array<{ path: string; kind: string; bytes: number }> = [];
  const allWarnings: string[] = [];

  if (wantsAppIcon) {
    const iconPlatforms: Array<"ios" | "android" | "pwa" | "visionos" | "flutter"> =
      args.platforms.filter(
        (p): p is "ios" | "android" | "pwa" | "visionos" | "flutter" => p !== "favicon"
      );
    const res = await exportAppIconBundle({
      masterPng: master,
      platforms:
        iconPlatforms.length > 0 ? iconPlatforms : ["ios", "android", "pwa", "visionos", "flutter"],
      outDir: args.outDir,
      ...(args.flattenColor !== undefined && { flattenColor: args.flattenColor }),
      ...(args.appName !== undefined && { appName: args.appName }),
      ios18Appearances: args.ios18
    });
    allFiles.push(...res.files);
    allWarnings.push(...res.warnings);
  }

  if (wantsFavicon) {
    const res = await exportFaviconBundle({
      masterPng: master,
      outDir: resolve(args.outDir, "favicon"),
      ...(args.flattenColor !== undefined && { flattenColor: args.flattenColor }),
      ...(args.appName !== undefined && { appName: args.appName }),
      ...(args.themeColor !== undefined && { themeColor: args.themeColor })
    });
    allFiles.push(...res.files);
    allWarnings.push(...res.warnings);
  }

  if (!args.quiet) {
    for (const f of allFiles) {
      process.stdout.write(
        `  ${f.kind.padEnd(28)} ${f.path} (${f.bytes.toLocaleString()} bytes)\n`
      );
    }
    for (const w of allWarnings) {
      process.stderr.write(`  [warn] ${w}\n`);
    }
    process.stderr.write(`p2a export: wrote ${allFiles.length} files to ${args.outDir}\n`);
  } else {
    // Quiet mode: JSON summary so the output is machine-readable for build scripts.
    process.stdout.write(
      JSON.stringify({ files: allFiles, warnings: allWarnings, outDir: args.outDir }) + "\n"
    );
  }
}

function parseArgs(argv: string[]): ExportArgs | null {
  if (argv.length === 0) {
    process.stderr.write(`p2a export: missing <master.png>\n`);
    return null;
  }

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }

  const input = positional[0];
  if (!input) {
    process.stderr.write(`p2a export: missing <master.png>\n`);
    return null;
  }

  const validPlatforms = ["ios", "android", "pwa", "favicon", "visionos", "flutter"] as const;
  type Platform = (typeof validPlatforms)[number];
  const platformsRaw = typeof flags["platforms"] === "string" ? flags["platforms"] : "all";
  const platforms: Platform[] =
    platformsRaw === "all"
      ? ["ios", "android", "pwa", "favicon", "visionos", "flutter"]
      : (platformsRaw
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean) as Platform[]);
  for (const p of platforms) {
    if (!validPlatforms.includes(p)) {
      process.stderr.write(
        `p2a export: unknown platform "${p}". Valid: ${validPlatforms.join(", ")} (or "all").\n`
      );
      return null;
    }
  }

  const ts = Date.now();
  const stem = basename(input, extname(input));
  const outDir =
    typeof flags["out"] === "string"
      ? resolve(flags["out"])
      : resolve(process.cwd(), "assets", `bundle-${stem}-${ts}`);

  return {
    input: resolve(input),
    platforms,
    outDir,
    flattenColor: typeof flags["bg"] === "string" ? flags["bg"] : undefined,
    appName: typeof flags["app-name"] === "string" ? flags["app-name"] : undefined,
    themeColor: typeof flags["theme"] === "string" ? flags["theme"] : undefined,
    ios18: flags["ios18"] === true,
    quiet: flags["quiet"] === true
  };
}
