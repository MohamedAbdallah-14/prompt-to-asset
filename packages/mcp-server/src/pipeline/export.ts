import { loadSharp } from "./sharp.js";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Platform fan-out from a single 1024² RGBA master.
 *
 * Spec references (from docs/research/SYNTHESIS.md § Asset Generation Landscape
 * and skills/app-icon/SKILL.md):
 *   - iOS: AppIcon.appiconset/Contents.json + sizes 20-1024; 1024 marketing variant OPAQUE.
 *   - Android adaptive: 108dp foreground + background; 72dp safe zone; monochrome drawable.
 *   - PWA: 192, 512, 512 maskable (80% safe zone).
 *   - visionOS: 1024² master + placeholder 3-layer split + README explaining the hand-split workflow.
 *   - Favicon: .ico (16/32/48 packed) + icon.svg + apple-touch-icon 180 opaque.
 */
export interface ExportAppIconInput {
  masterPng: Buffer;
  platforms: Array<"ios" | "android" | "pwa" | "visionos" | "flutter" | "all">;
  outDir: string;
  flattenColor?: string; // hex for iOS 1024 opaque; defaults to first palette color or white
  palette?: string[];
  /** Optional app name used in Flutter's flutter_launcher_icons.yaml scaffold. */
  appName?: string;
  /**
   * When true, the iOS fan-out emits dark and tinted variants of the 1024
   * marketing icon in addition to the default (light) variant, and adds
   * `appearances` entries to `Contents.json` for iOS 18's tintable icons.
   * The dark variant is flattened onto #000000; the tinted variant is a
   * luminance map that the system recolors per the user's accent.
   */
  ios18Appearances?: boolean;
  /**
   * Optional caller-supplied dark master. When `ios18Appearances` is true
   * and this is omitted, the dark variant is derived by flattening the
   * master onto #000 — usually acceptable for logos on solid backgrounds.
   */
  masterPngDark?: Buffer;
}

export interface ExportResult {
  files: Array<{ path: string; kind: string; bytes: number }>;
  warnings: string[];
}

const IOS_SIZES: Array<{
  size: number;
  idiom: "iphone" | "ipad" | "ios-marketing";
  scale: 1 | 2 | 3;
}> = [
  { size: 20, idiom: "iphone", scale: 2 },
  { size: 20, idiom: "iphone", scale: 3 },
  { size: 29, idiom: "iphone", scale: 2 },
  { size: 29, idiom: "iphone", scale: 3 },
  { size: 40, idiom: "iphone", scale: 2 },
  { size: 40, idiom: "iphone", scale: 3 },
  { size: 60, idiom: "iphone", scale: 2 },
  { size: 60, idiom: "iphone", scale: 3 },
  { size: 20, idiom: "ipad", scale: 1 },
  { size: 20, idiom: "ipad", scale: 2 },
  { size: 29, idiom: "ipad", scale: 1 },
  { size: 29, idiom: "ipad", scale: 2 },
  { size: 40, idiom: "ipad", scale: 1 },
  { size: 40, idiom: "ipad", scale: 2 },
  { size: 76, idiom: "ipad", scale: 2 },
  { size: 83.5, idiom: "ipad", scale: 2 },
  { size: 1024, idiom: "ios-marketing", scale: 1 }
];

const ANDROID_DPI: Array<{ dir: string; px: number }> = [
  { dir: "mipmap-mdpi", px: 48 },
  { dir: "mipmap-hdpi", px: 72 },
  { dir: "mipmap-xhdpi", px: 96 },
  { dir: "mipmap-xxhdpi", px: 144 },
  { dir: "mipmap-xxxhdpi", px: 192 }
];

const ANDROID_ADAPTIVE_PX = 432; // 108dp at xxxhdpi

export async function exportAppIconBundle(input: ExportAppIconInput): Promise<ExportResult> {
  const sharp = await loadSharp();
  if (!sharp) {
    return { files: [], warnings: ["sharp not installed; cannot export app icon bundle"] };
  }

  mkdirSync(input.outDir, { recursive: true });
  const files: Array<{ path: string; kind: string; bytes: number }> = [];
  const warnings: string[] = [];

  const platforms = new Set(
    input.platforms.includes("all")
      ? ["ios", "android", "pwa", "visionos", "flutter"]
      : input.platforms
  );

  const flattenColor = input.flattenColor ?? input.palette?.[0] ?? "#ffffff";

  // Save master
  const masterPath = join(input.outDir, "master.png");
  writeFileSync(masterPath, input.masterPng);
  files.push({ path: masterPath, kind: "master", bytes: input.masterPng.length });

  if (platforms.has("ios")) {
    const iosDir = join(input.outDir, "ios", "AppIcon.appiconset");
    mkdirSync(iosDir, { recursive: true });
    const imageEntries: Record<string, string> = {};
    for (const spec of IOS_SIZES) {
      const px = Math.round(spec.size * spec.scale);
      const filename = `Icon-${spec.idiom}-${spec.size}@${spec.scale}x.png`;
      const p = join(iosDir, filename);
      let pipeline = sharp(input.masterPng).resize(px, px, { kernel: "lanczos3" });
      if (spec.idiom === "ios-marketing") {
        // App Store rejects alpha; flatten onto brand primary color.
        pipeline = pipeline.flatten({ background: flattenColor });
      }
      const out = await pipeline.png().toBuffer();
      writeFileSync(p, out);
      files.push({
        path: p,
        kind: `ios-${spec.size}@${spec.scale}x${spec.idiom === "ios-marketing" ? "-marketing" : ""}`,
        bytes: out.length
      });
      imageEntries[`${spec.size}x${spec.size}@${spec.scale}x-${spec.idiom}`] = filename;
    }

    // iOS 18 appearances (dark + tinted) — see Apple HIG "App Icons".
    // Each appearance is a full-size 1024² universal entry; Xcode 15+ accepts
    // this unified `appearances` / `universal` layout.
    let darkMarketing: string | null = null;
    let tintedMarketing: string | null = null;
    if (input.ios18Appearances) {
      const darkSource = input.masterPngDark ?? input.masterPng;
      const darkPng = await sharp(darkSource)
        .resize(1024, 1024, { kernel: "lanczos3" })
        .flatten({ background: "#000000" })
        .png()
        .toBuffer();
      darkMarketing = "Icon-universal-1024-dark.png";
      writeFileSync(join(iosDir, darkMarketing), darkPng);
      files.push({
        path: join(iosDir, darkMarketing),
        kind: "ios-1024-dark",
        bytes: darkPng.length
      });

      // Tinted: luminance-map (greyscale preserving alpha) so the system can
      // recolor per the user's selected tint. Flattened onto black.
      const tintedPng = await sharp(input.masterPng)
        .resize(1024, 1024, { kernel: "lanczos3" })
        .greyscale()
        .flatten({ background: "#000000" })
        .png()
        .toBuffer();
      tintedMarketing = "Icon-universal-1024-tinted.png";
      writeFileSync(join(iosDir, tintedMarketing), tintedPng);
      files.push({
        path: join(iosDir, tintedMarketing),
        kind: "ios-1024-tinted",
        bytes: tintedPng.length
      });
      warnings.push(
        "iOS 18 dark variant was derived by flattening the master onto #000000; pass masterPngDark for a hand-tuned dark mark. The tinted variant is a greyscale luminance map — if your mark has multiple brand colors, the system-recolored result may surprise you."
      );
    }

    const contents = buildIosContentsJson(IOS_SIZES, imageEntries, {
      darkMarketing,
      tintedMarketing
    });
    const cp = join(iosDir, "Contents.json");
    // buildIosContentsJson already returns a stringified JSON document; writing
    // JSON.stringify(contents) here would double-encode it (reading the file
    // would return the JSON-text-as-string, not the object). Write the raw
    // string directly.
    writeFileSync(cp, contents);
    files.push({ path: cp, kind: "ios-Contents.json", bytes: Buffer.byteLength(contents) });
  }

  if (platforms.has("android")) {
    const androidDir = join(input.outDir, "android");
    mkdirSync(androidDir, { recursive: true });

    // Legacy mipmap (square)
    for (const dpi of ANDROID_DPI) {
      const dir = join(androidDir, dpi.dir);
      mkdirSync(dir, { recursive: true });
      const p = join(dir, "ic_launcher.png");
      const out = await sharp(input.masterPng)
        .resize(dpi.px, dpi.px, { kernel: "lanczos3" })
        .png()
        .toBuffer();
      writeFileSync(p, out);
      files.push({ path: p, kind: `android-${dpi.dir}`, bytes: out.length });
    }

    // Adaptive layers — we pad the master to respect the 72/108 dp safe zone.
    const drawableDir = join(androidDir, "drawable");
    mkdirSync(drawableDir, { recursive: true });
    // Foreground: master centered in 108dp canvas with ~18% padding on each side (72/108)
    const padding = Math.round((ANDROID_ADAPTIVE_PX * (108 - 72)) / 2 / 108);
    const inner = ANDROID_ADAPTIVE_PX - padding * 2;
    const foreground = await sharp({
      create: {
        width: ANDROID_ADAPTIVE_PX,
        height: ANDROID_ADAPTIVE_PX,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: await sharp(input.masterPng)
            .resize(inner, inner, { kernel: "lanczos3" })
            .png()
            .toBuffer(),
          left: padding,
          top: padding
        }
      ])
      .png()
      .toBuffer();
    const fgPath = join(drawableDir, "ic_launcher_foreground.png");
    writeFileSync(fgPath, foreground);
    files.push({ path: fgPath, kind: "android-adaptive-foreground", bytes: foreground.length });

    const bg = await sharp({
      create: {
        width: ANDROID_ADAPTIVE_PX,
        height: ANDROID_ADAPTIVE_PX,
        channels: 3,
        background: flattenColor
      }
    })
      .png()
      .toBuffer();
    const bgPath = join(drawableDir, "ic_launcher_background.png");
    writeFileSync(bgPath, bg);
    files.push({ path: bgPath, kind: "android-adaptive-background", bytes: bg.length });

    // Monochrome drawable — heuristic: greyscale, threshold, tint #000
    const mono = await sharp(foreground)
      .greyscale()
      .threshold(128)
      .toColorspace("srgb")
      .png()
      .toBuffer();
    const monoPath = join(drawableDir, "ic_launcher_monochrome.png");
    writeFileSync(monoPath, mono);
    files.push({ path: monoPath, kind: "android-adaptive-monochrome", bytes: mono.length });

    // anydpi-v26 xml
    const anydpiDir = join(androidDir, "mipmap-anydpi-v26");
    mkdirSync(anydpiDir, { recursive: true });
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
`;
    const xmlPath = join(anydpiDir, "ic_launcher.xml");
    writeFileSync(xmlPath, xml);
    files.push({ path: xmlPath, kind: "android-adaptive-xml", bytes: xml.length });

    warnings.push(
      "Android 13 monochrome drawable is auto-derived (greyscale+threshold); audit manually for complex marks."
    );
  }

  if (platforms.has("pwa")) {
    const pwaDir = join(input.outDir, "pwa");
    mkdirSync(pwaDir, { recursive: true });
    for (const sz of [192, 512]) {
      const out = await sharp(input.masterPng)
        .resize(sz, sz, { kernel: "lanczos3" })
        .png()
        .toBuffer();
      const p = join(pwaDir, `${sz}.png`);
      writeFileSync(p, out);
      files.push({ path: p, kind: `pwa-${sz}`, bytes: out.length });
    }
    // 512 maskable: flatten onto palette[0], subject inside 80% safe zone
    const maskablePad = Math.round(512 * 0.1);
    const maskableInner = 512 - maskablePad * 2;
    const maskable = await sharp({
      create: { width: 512, height: 512, channels: 4, background: flattenColor }
    })
      .composite([
        {
          input: await sharp(input.masterPng)
            .resize(maskableInner, maskableInner, { kernel: "lanczos3" })
            .png()
            .toBuffer(),
          left: maskablePad,
          top: maskablePad
        }
      ])
      .png()
      .toBuffer();
    const mp = join(pwaDir, "512-maskable.png");
    writeFileSync(mp, maskable);
    files.push({ path: mp, kind: "pwa-512-maskable", bytes: maskable.length });

    // manifest snippet
    const manifest = {
      icons: [
        { src: "/pwa/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa/512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };
    const mfPath = join(pwaDir, "manifest-snippet.json");
    writeFileSync(mfPath, JSON.stringify(manifest, null, 2));
    files.push({ path: mfPath, kind: "pwa-manifest", bytes: JSON.stringify(manifest).length });
  }

  if (platforms.has("visionos")) {
    const visionDir = join(input.outDir, "visionos");
    mkdirSync(visionDir, { recursive: true });

    // Emit a 1024² master. visionOS app icons are three 1024² layers composited
    // with parallax; producing the layer split automatically requires semantic
    // segmentation that we intentionally leave to the caller. We ship the master
    // + a README describing the Reality Composer Pro / Photoshop split.
    const master1024 = await sharp(input.masterPng)
      .resize(1024, 1024, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    const vp = join(visionDir, "master.png");
    writeFileSync(vp, master1024);
    files.push({ path: vp, kind: "visionos-master", bytes: master1024.length });

    // Also emit a naive 3-layer starter: background flatten, foreground master, duplicate
    // for middle. This is deliberately simple — real production artists still split by hand.
    const bgLayer = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: flattenColor }
    })
      .png()
      .toBuffer();
    writeFileSync(join(visionDir, "layer-back.png"), bgLayer);
    files.push({
      path: join(visionDir, "layer-back.png"),
      kind: "visionos-back",
      bytes: bgLayer.length
    });
    writeFileSync(join(visionDir, "layer-middle.png"), master1024);
    files.push({
      path: join(visionDir, "layer-middle.png"),
      kind: "visionos-middle",
      bytes: master1024.length
    });
    writeFileSync(join(visionDir, "layer-front.png"), master1024);
    files.push({
      path: join(visionDir, "layer-front.png"),
      kind: "visionos-front",
      bytes: master1024.length
    });

    const readme = `# visionOS App Icon

visionOS icons are three 1024×1024 RGBA layers composited with parallax by the system.

This bundle ships:
- \`master.png\` — flat 1024² RGBA, same as your iOS marketing image but with alpha retained.
- \`layer-back.png\` — background flat (${flattenColor}).
- \`layer-middle.png\` — master duplicated as a placeholder.
- \`layer-front.png\` — master duplicated as a placeholder.

## What you still have to do

The middle/front layers should contain *semantic subsets* of your mark (e.g. background glyph vs. foreground type). We do not run semantic segmentation, so \`layer-middle.png\` and \`layer-front.png\` are placeholders.

Open \`master.png\` in Reality Composer Pro (Xcode → Window → Reality Composer Pro → File → New → App Icon), or split manually in Sketch / Figma / Photoshop. Apple docs: https://developer.apple.com/design/human-interface-guidelines/app-icons#visionOS.
`;
    const readmePath = join(visionDir, "README.md");
    writeFileSync(readmePath, readme);
    files.push({ path: readmePath, kind: "visionos-readme", bytes: Buffer.byteLength(readme) });

    warnings.push(
      "visionOS layer-middle and layer-front are placeholder duplicates; split your mark semantically in Reality Composer Pro. See visionos/README.md."
    );
  }

  if (platforms.has("flutter")) {
    // flutter_launcher_icons parity — see https://pub.dev/packages/flutter_launcher_icons.
    // We don't run `flutter pub get` for the user; we emit:
    //   1. `flutter/icon-1024.png` — the 1024² master the plugin reads.
    //   2. `flutter/icon-1024-adaptive.png` — transparent foreground for Android 12+.
    //   3. `flutter/flutter_launcher_icons.yaml` — fully configured config to paste or
    //      reference from `pubspec.yaml` under `dev_dependencies` + `flutter_icons:`.
    //   4. `flutter/README.md` — copy-paste commands to run the plugin.
    const flutterDir = join(input.outDir, "flutter");
    mkdirSync(flutterDir, { recursive: true });

    const icon1024 = await sharp(input.masterPng)
      .resize(1024, 1024, { kernel: "lanczos3" })
      .flatten({ background: flattenColor })
      .png()
      .toBuffer();
    const icon1024Path = join(flutterDir, "icon-1024.png");
    writeFileSync(icon1024Path, icon1024);
    files.push({ path: icon1024Path, kind: "flutter-1024", bytes: icon1024.length });

    const adaptiveFg = await sharp(input.masterPng)
      .resize(1024, 1024, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    const adaptiveFgPath = join(flutterDir, "icon-1024-adaptive.png");
    writeFileSync(adaptiveFgPath, adaptiveFg);
    files.push({
      path: adaptiveFgPath,
      kind: "flutter-1024-adaptive-fg",
      bytes: adaptiveFg.length
    });

    // Emit a configured flutter_launcher_icons.yaml that references both images.
    // Users can either drop this in-place as `flutter_launcher_icons.yaml` or
    // inline the `flutter_icons:` section under their existing pubspec.yaml.
    const appName = input.appName ?? "app";
    const yaml = `# Generated by prompt-to-asset (p2a export ... --platforms flutter).
# Reference: https://pub.dev/packages/flutter_launcher_icons
#
# Usage:
#   flutter pub add dev:flutter_launcher_icons
#   dart run flutter_launcher_icons
#
# This config is a starting point — adjust remove_alpha_ios, min_sdk_android,
# and web/macOS/windows flags to match your actual targets.

flutter_launcher_icons:
  image_path: "assets/branding/flutter/icon-1024.png"

  # iOS
  ios: true
  remove_alpha_ios: true              # App Store rejects alpha; must be flat.
  # image_path_ios: "assets/branding/flutter/icon-1024.png"

  # Android legacy + adaptive (Android 8+)
  android: "launcher_icon"
  image_path_android: "assets/branding/flutter/icon-1024.png"
  adaptive_icon_background: "${flattenColor}"
  adaptive_icon_foreground: "assets/branding/flutter/icon-1024-adaptive.png"
  min_sdk_android: 21

  # Android 13+ themed monochrome (optional; flutter_launcher_icons v0.13+).
  # adaptive_icon_monochrome: "assets/branding/flutter/icon-1024-adaptive.png"

  # Web / macOS / Windows — enable as needed.
  web:
    generate: true
    image_path: "assets/branding/flutter/icon-1024.png"
    background_color: "${flattenColor}"
    theme_color: "${flattenColor}"
  windows:
    generate: true
    image_path: "assets/branding/flutter/icon-1024.png"
    icon_size: 48
  macos:
    generate: true
    image_path: "assets/branding/flutter/icon-1024.png"
`;
    const yamlPath = join(flutterDir, "flutter_launcher_icons.yaml");
    writeFileSync(yamlPath, yaml);
    files.push({ path: yamlPath, kind: "flutter-config-yaml", bytes: Buffer.byteLength(yaml) });

    const readme = `# Flutter launcher icons

prompt-to-asset emits the config — flutter_launcher_icons emits the per-platform PNGs.

\`\`\`bash
# From your Flutter project root (one-time setup):
flutter pub add dev:flutter_launcher_icons

# Copy the icon-1024.png + icon-1024-adaptive.png to assets/branding/flutter/.
# Then merge flutter_launcher_icons.yaml into your pubspec.yaml (or keep it
# as a separate file — the plugin supports both).

# Every time the mark changes, rerun:
dart run flutter_launcher_icons
\`\`\`

App name used in the config: **${appName}**
Adaptive background color: **${flattenColor}**

Reference: https://pub.dev/packages/flutter_launcher_icons
`;
    const readmePath = join(flutterDir, "README.md");
    writeFileSync(readmePath, readme);
    files.push({ path: readmePath, kind: "flutter-readme", bytes: Buffer.byteLength(readme) });
  }

  return { files, warnings };
}

function buildIosContentsJson(
  sizes: typeof IOS_SIZES,
  entries: Record<string, string>,
  appearances?: { darkMarketing: string | null; tintedMarketing: string | null }
): string {
  const images: Array<Record<string, unknown>> = sizes.map((s) => ({
    size: `${s.size}x${s.size}`,
    idiom: s.idiom,
    filename: entries[`${s.size}x${s.size}@${s.scale}x-${s.idiom}`],
    scale: `${s.scale}x`,
    platform: s.idiom === "ios-marketing" ? undefined : "ios"
  }));
  if (appearances?.darkMarketing) {
    images.push({
      size: "1024x1024",
      idiom: "universal",
      filename: appearances.darkMarketing,
      platform: "ios",
      appearances: [{ appearance: "luminosity", value: "dark" }]
    });
  }
  if (appearances?.tintedMarketing) {
    images.push({
      size: "1024x1024",
      idiom: "universal",
      filename: appearances.tintedMarketing,
      platform: "ios",
      appearances: [{ appearance: "luminosity", value: "tinted" }]
    });
  }
  return JSON.stringify({ images, info: { version: 1, author: "prompt-to-asset" } }, null, 2);
}

/**
 * Favicon bundle: .ico (16/32/48) + icon.svg + apple-touch-icon 180 opaque + PWA 192/512/512-maskable.
 * sharp can't write .ico natively — we emit a 48.png and note that the caller should pack with
 * sharp-ico or icon-gen in a postprocess step. (Installing those adds install size; keeping core tiny.)
 */
export async function exportFaviconBundle(input: {
  masterPng: Buffer;
  masterSvg?: string;
  masterSvgDark?: string;
  outDir: string;
  flattenColor?: string;
  appName?: string;
  themeColor?: string;
  backgroundColor?: string;
}): Promise<ExportResult> {
  const sharp = await loadSharp();
  if (!sharp) return { files: [], warnings: ["sharp not installed; cannot export favicon bundle"] };

  mkdirSync(input.outDir, { recursive: true });
  const files: Array<{ path: string; kind: string; bytes: number }> = [];
  const warnings: string[] = [];

  const flattenColor = input.flattenColor ?? "#ffffff";
  const appName = input.appName ?? "App";
  const themeColor = input.themeColor ?? flattenColor;
  const backgroundColor = input.backgroundColor ?? "#ffffff";

  if (input.masterSvg) {
    const p = join(input.outDir, "icon.svg");
    writeFileSync(p, input.masterSvg);
    files.push({ path: p, kind: "favicon-svg", bytes: Buffer.byteLength(input.masterSvg) });
  }
  if (input.masterSvgDark) {
    const p = join(input.outDir, "icon-dark.svg");
    writeFileSync(p, input.masterSvgDark);
    files.push({
      path: p,
      kind: "favicon-svg-dark",
      bytes: Buffer.byteLength(input.masterSvgDark)
    });
  }

  const icoSourcePngs: Buffer[] = [];
  for (const sz of [16, 32, 48]) {
    const out = await sharp(input.masterPng)
      .resize(sz, sz, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    const p = join(input.outDir, `favicon-${sz}.png`);
    writeFileSync(p, out);
    files.push({ path: p, kind: `favicon-${sz}`, bytes: out.length });
    icoSourcePngs.push(out);
  }

  // Source: docs/research/11-favicon-web-assets/ — .ico multi-res for legacy browsers.
  const icoBuf = await packIco(icoSourcePngs);
  if (icoBuf) {
    const icoPath = join(input.outDir, "favicon.ico");
    writeFileSync(icoPath, icoBuf);
    files.push({ path: icoPath, kind: "favicon-ico", bytes: icoBuf.length });
  } else {
    warnings.push(
      "png-to-ico not installed; emitted favicon-{16,32,48}.png but no favicon.ico. Install `png-to-ico` (optional dep) to pack the .ico automatically."
    );
  }

  const appleTouch = await sharp(input.masterPng)
    .resize(180, 180, { kernel: "lanczos3" })
    .flatten({ background: flattenColor })
    .png()
    .toBuffer();
  const atPath = join(input.outDir, "apple-touch-icon.png");
  writeFileSync(atPath, appleTouch);
  files.push({ path: atPath, kind: "apple-touch-icon", bytes: appleTouch.length });

  for (const sz of [192, 512]) {
    const out = await sharp(input.masterPng)
      .resize(sz, sz, { kernel: "lanczos3" })
      .png()
      .toBuffer();
    const p = join(input.outDir, `pwa-${sz}.png`);
    writeFileSync(p, out);
    files.push({ path: p, kind: `pwa-${sz}`, bytes: out.length });
  }

  // Source: docs/research/09-app-icon-generation/9c-pwa-manifest-maskable.md
  // Maskable icon: subject inside 80% safe zone, opaque background. 10% padding each side.
  const maskPad = Math.round(512 * 0.1);
  const maskInner = 512 - maskPad * 2;
  const maskableBody = await sharp(input.masterPng)
    .resize(maskInner, maskInner, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const pwaMaskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: flattenColor }
  })
    .composite([{ input: maskableBody, left: maskPad, top: maskPad }])
    .png()
    .toBuffer();
  const maskPath = join(input.outDir, "pwa-512-maskable.png");
  writeFileSync(maskPath, pwaMaskable);
  files.push({ path: maskPath, kind: "pwa-512-maskable", bytes: pwaMaskable.length });

  // Source: docs/research/11-favicon-web-assets/ + W3C Web App Manifest.
  const manifest = {
    name: appName,
    short_name: appName,
    start_url: "/",
    display: "standalone" as const,
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      { src: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestPath = join(input.outDir, "manifest.webmanifest");
  writeFileSync(manifestPath, manifestJson);
  files.push({
    path: manifestPath,
    kind: "manifest-webmanifest",
    bytes: Buffer.byteLength(manifestJson)
  });

  const snippet = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
${input.masterSvgDark ? '<link rel="icon" type="image/svg+xml" href="/icon-dark.svg" media="(prefers-color-scheme: dark)">\n' : ""}<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="${themeColor}">`;
  const snippetPath = join(input.outDir, "head-snippet.html");
  writeFileSync(snippetPath, snippet);
  files.push({ path: snippetPath, kind: "head-snippet", bytes: snippet.length });

  return { files, warnings };
}

async function packIco(pngs: Buffer[]): Promise<Buffer | null> {
  try {
    const mod = (await import("png-to-ico")) as unknown as {
      default: (input: Buffer[] | string[]) => Promise<Buffer>;
    };
    const fn = mod.default;
    return await fn(pngs);
  } catch {
    return null;
  }
}
