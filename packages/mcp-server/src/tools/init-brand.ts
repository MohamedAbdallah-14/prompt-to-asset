// Tool: asset_init_brand
//
// Scaffold brand.json in the project root. The LLM-driven equivalent of the
// `brand.json` portion of `p2a init` — the interactive CLI still exists for
// humans, but this tool lets the LLM ask the user for a name + palette in
// chat and write the file without requiring a terminal round trip.
//
// Deliberately does NOT touch MCP registration (.cursor/mcp.json, claude mcp
// add, etc.). That path requires IDE-specific knowledge the user handles once
// at install time — "the one thing that needs a terminal".
//
// Also returns the detected framework so the LLM can tailor its next
// suggestion (e.g. "I see this is Next.js — want me to also emit a favicon
// into public/?").

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { InitBrandInputT } from "../schemas.js";
import { safeReadPath } from "../security/paths.js";

type ProjectKind =
  | "nextjs"
  | "astro"
  | "vite"
  | "remix"
  | "nuxt"
  | "expo"
  | "react-native"
  | "flutter"
  | "xcode"
  | "android"
  | "electron"
  | "node"
  | "unknown";

export interface DetectedProject {
  kind: ProjectKind;
  label: string;
  suggested_assets_dir: string;
  platform_hints: string[];
}

export interface InitBrandResult {
  brand_json_path: string;
  brand_json: Record<string, unknown>;
  assets_dir: string;
  detected: DetectedProject;
  written: boolean;
  already_existed: boolean;
  note: string;
}

export async function initBrand(input: InitBrandInputT): Promise<InitBrandResult> {
  const cwd = input.cwd ? safeReadPath(input.cwd) : process.cwd();
  const detected = detectProject(cwd);
  const assetsDir = input.assets_dir ?? detected.suggested_assets_dir;

  const brand = {
    name: input.app_name,
    version: "0.1.0",
    palette: input.palette ?? ["#2563eb", "#ffffff"],
    fonts: {
      display: {
        family: input.display_font ?? "Inter",
        weights: [700, 800]
      },
      body: {
        family: input.body_font ?? "Inter",
        weights: [400, 500]
      }
    },
    style_refs: [],
    do_not: input.do_not ?? ["drop shadows", "heavy gradients", "skeuomorphic bevels"],
    platform_hints: detected.platform_hints,
    notes:
      "This file is the single source of truth for brand palette + do/don't constraints. Edit freely; prompt-to-asset respects it across every asset call."
  };

  const brandPath = resolve(cwd, "brand.json");
  const already_existed = existsSync(brandPath);
  let written = false;
  let note: string;

  if (already_existed && !input.overwrite) {
    note =
      "brand.json already exists. Pass overwrite=true to replace it, or read the existing file and pass the changes you want to this tool.";
  } else {
    writeFileSync(brandPath, JSON.stringify(brand, null, 2) + "\n");
    written = true;
    note = already_existed ? "overwrote existing brand.json" : "wrote new brand.json";
  }

  // Ensure the assets dir exists so subsequent generator calls have somewhere
  // to write. mkdir -p — idempotent, safe on existing dirs.
  const resolvedAssetsDir = resolve(cwd, assetsDir);
  mkdirSync(resolvedAssetsDir, { recursive: true });

  return {
    brand_json_path: brandPath,
    brand_json: brand,
    assets_dir: resolvedAssetsDir,
    detected,
    written,
    already_existed,
    note
  };
}

function detectProject(cwd: string): DetectedProject {
  const has = (p: string) => existsSync(join(cwd, p));
  const pkgPath = join(cwd, "package.json");
  const pkg = has("package.json")
    ? (JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        name?: string;
      })
    : null;
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  if (has("pubspec.yaml")) {
    return {
      kind: "flutter",
      label: "Flutter (pubspec.yaml detected)",
      suggested_assets_dir: "assets/branding",
      platform_hints: [
        "Run asset_export_bundle with platforms=['flutter'] to emit flutter_launcher_icons.yaml + the 1024 masters.",
        "Then `dart run flutter_launcher_icons` fans the rest out (iOS, Android, adaptive, web, macOS, Windows)."
      ]
    };
  }
  if (has("Podfile") || has("ios/Podfile")) {
    return {
      kind: "xcode",
      label: "iOS / Xcode (Podfile detected)",
      suggested_assets_dir: "Assets.xcassets",
      platform_hints: [
        "Drop the emitted AppIcon.appiconset into your Xcode project.",
        "The 1024 marketing image must be opaque (App Store rejects alpha)."
      ]
    };
  }
  if (has("app/build.gradle") || has("build.gradle") || has("app/build.gradle.kts")) {
    return {
      kind: "android",
      label: "Android (Gradle detected)",
      suggested_assets_dir: "app/src/main/res",
      platform_hints: [
        "Copy mipmap-*/ into app/src/main/res/.",
        "Android 13+ ships a monochrome drawable — audit the auto-derived one for contrast."
      ]
    };
  }
  if (has("app.json") && (deps["expo"] || deps["expo-router"])) {
    return {
      kind: "expo",
      label: "Expo (app.json + expo dep)",
      suggested_assets_dir: "assets/branding",
      platform_hints: [
        "Expo prebuild regenerates app icons — keep the master under ./assets/.",
        "iOS + Android both need adaptive icons."
      ]
    };
  }
  if (has("next.config.js") || has("next.config.mjs") || has("next.config.ts") || deps["next"]) {
    return {
      kind: "nextjs",
      label: "Next.js",
      suggested_assets_dir: "public/branding",
      platform_hints: [
        "Emit favicon / icon.svg / manifest.webmanifest under /public.",
        "OG images work best from a dedicated route or a generate-at-build-time step."
      ]
    };
  }
  if (has("astro.config.mjs") || has("astro.config.ts") || deps["astro"]) {
    return {
      kind: "astro",
      label: "Astro",
      suggested_assets_dir: "public/branding",
      platform_hints: [
        "Emit favicon + manifest under /public.",
        "Astro's `<ViewTransitions>` doesn't change favicon handling."
      ]
    };
  }
  if (deps["nuxt"] || deps["nuxt3"]) {
    return {
      kind: "nuxt",
      label: "Nuxt",
      suggested_assets_dir: "public/branding",
      platform_hints: ["Emit favicon + manifest under /public."]
    };
  }
  if (deps["@remix-run/react"]) {
    return {
      kind: "remix",
      label: "Remix",
      suggested_assets_dir: "public/branding",
      platform_hints: ["Emit favicon + manifest under /public."]
    };
  }
  if (has("vite.config.js") || has("vite.config.ts") || deps["vite"]) {
    return {
      kind: "vite",
      label: "Vite",
      suggested_assets_dir: "public/branding",
      platform_hints: ["Emit favicon + manifest under /public."]
    };
  }
  if (deps["react-native"]) {
    return {
      kind: "react-native",
      label: "React Native",
      suggested_assets_dir: "assets/branding",
      platform_hints: [
        "iOS + Android both need adaptive icons.",
        "Use asset_export_bundle with platforms=['ios','android']."
      ]
    };
  }
  if (deps["electron"]) {
    return {
      kind: "electron",
      label: "Electron",
      suggested_assets_dir: "build/icons",
      platform_hints: [
        "electron-builder reads icons from ./build/icons/.",
        "Windows wants .ico; macOS wants .icns; favicons are irrelevant here."
      ]
    };
  }
  if (pkg) {
    return {
      kind: "node",
      label: "Node.js",
      suggested_assets_dir: "assets/branding",
      platform_hints: []
    };
  }
  return {
    kind: "unknown",
    label: "unknown (no manifest found)",
    suggested_assets_dir: "assets/branding",
    platform_hints: []
  };
}
