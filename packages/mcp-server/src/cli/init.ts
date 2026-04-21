// `p2a init` — interactive project setup.
//
// Detects the surrounding project (Next.js, Expo, Flutter, Xcode, Astro, Vite,
// plain Node, …), offers a brand.json scaffold tuned to that framework, and
// prints the exact MCP-registration command for the IDE in use. Intentionally
// dependency-free: uses node:readline so installing p2a does not pull inquirer.

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

interface Detected {
  kind:
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
  /** A short human description. */
  label: string;
  /** Where a generated bundle should be dropped for best ergonomics. */
  suggestedAssetsDir: string;
}

export async function initCommand(argv: string[]): Promise<void> {
  const yes = argv.includes("--yes") || argv.includes("-y");
  const register = argv.includes("--register");
  const noRegister = argv.includes("--no-register");
  const cwd = process.cwd();
  const detected = detectProject(cwd);

  process.stdout.write(`prompt-to-asset init\n`);
  process.stdout.write(`  detected: ${detected.label}\n`);
  process.stdout.write(`  cwd:      ${cwd}\n\n`);

  const rl = createInterface({ input, output });
  const ask = async (q: string, def: string): Promise<string> => {
    if (yes) return def;
    const v = (await rl.question(`${q} [${def}]: `)).trim();
    return v.length === 0 ? def : v;
  };

  const appName = await ask("App name", inferAppName(cwd, detected));
  const primary = await ask("Primary brand color (#hex)", "#2563eb");
  const secondary = await ask("Secondary brand color (#hex)", "#ffffff");
  const assetsDir = await ask("Where should generated assets live?", detected.suggestedAssetsDir);

  const brand = {
    name: appName,
    version: "0.1.0",
    palette: [primary, secondary],
    fonts: {
      display: { family: "Inter", weights: [700, 800] },
      body: { family: "Inter", weights: [400, 500] }
    },
    style_refs: [],
    do_not: ["drop shadows", "heavy gradients", "skeuomorphic bevels"],
    platform_hints: hintsFor(detected.kind),
    notes:
      "This file is the single source of truth for brand palette + do/don't constraints. Edit freely; p2a respects it across every asset call."
  };

  const brandPath = resolve(cwd, "brand.json");
  if (existsSync(brandPath) && !yes) {
    const ow = (await rl.question(`brand.json already exists — overwrite? [y/N]: `)).trim();
    if (ow.toLowerCase() !== "y") {
      process.stdout.write(`  skipped brand.json\n`);
    } else {
      writeFileSync(brandPath, JSON.stringify(brand, null, 2));
      process.stdout.write(`  wrote ${brandPath}\n`);
    }
  } else {
    writeFileSync(brandPath, JSON.stringify(brand, null, 2));
    process.stdout.write(`  wrote ${brandPath}\n`);
  }

  // Ensure the suggested assets dir exists so the next p2a run has somewhere
  // to write — mkdir -p equivalent, safe if already present.
  mkdirSync(resolve(cwd, assetsDir), { recursive: true });
  process.stdout.write(`  ensured ${resolve(cwd, assetsDir)}\n\n`);

  // MCP auto-registration. Writes project-local files only
  // (.cursor/mcp.json, .vscode/mcp.json, .windsurf/mcp.json) — safe blast
  // radius. For Claude Code, offer to run `claude mcp add` (user-global).
  //
  // Flags:
  //   --register     auto-register without asking (for scripts / CI)
  //   --no-register  skip entirely without asking
  //   (default)      ask interactively unless --yes
  let shouldRegister = register;
  if (!register && !noRegister) {
    if (yes) {
      shouldRegister = true;
    } else {
      const ans = (
        await rl.question(
          "\nAuto-register prompt-to-asset with your IDE? Writes project-local .cursor/mcp.json / .vscode/mcp.json / .windsurf/mcp.json (and optionally runs `claude mcp add`). [Y/n]: "
        )
      )
        .trim()
        .toLowerCase();
      shouldRegister = ans.length === 0 || ans === "y" || ans === "yes";
    }
  }

  let claudeAnswer: "skip" | "run" = "skip";
  if (shouldRegister && !yes && !register) {
    const ans = (await rl.question("  also run `claude mcp add prompt-to-asset -- p2a`? [y/N]: "))
      .trim()
      .toLowerCase();
    claudeAnswer = ans === "y" || ans === "yes" ? "run" : "skip";
  } else if (shouldRegister && (yes || register)) {
    claudeAnswer = "run";
  }

  rl.close();

  const registrationLog = shouldRegister
    ? registerMcp(cwd, claudeAnswer)
    : { wrote: [], skipped: [], notes: ["skipped by user"] };

  if (shouldRegister) {
    process.stdout.write("\nMCP registration\n");
    for (const w of registrationLog.wrote) process.stdout.write(`  wrote   ${w}\n`);
    for (const s of registrationLog.skipped) process.stdout.write(`  kept    ${s}\n`);
    for (const n of registrationLog.notes) process.stdout.write(`  note    ${n}\n`);
    process.stdout.write("\n");
  }

  printIdeRegistrationHints(detected, shouldRegister);
  printNextSteps(detected, assetsDir);
}

interface RegistrationResult {
  wrote: string[];
  skipped: string[];
  notes: string[];
}

/**
 * Write project-local MCP config files for Cursor / VS Code / Windsurf so
 * the user doesn't have to hand-edit JSON. All three formats converge on
 * "run the `p2a` binary" — we don't assume a clone path.
 *
 * For Claude Code, shell out to `claude mcp add` if requested and available.
 * This writes to ~/.claude.json (user-global) — only do it on explicit yes.
 */
function registerMcp(cwd: string, claudeAnswer: "skip" | "run"): RegistrationResult {
  const wrote: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];

  const cursorConfig = {
    mcpServers: {
      "prompt-to-asset": { command: "p2a" }
    }
  };
  const vscodeConfig = {
    servers: {
      "prompt-to-asset": { type: "stdio", command: "p2a" }
    }
  };
  const windsurfConfig = {
    mcpServers: {
      "prompt-to-asset": { command: "p2a" }
    }
  };

  const writeIfAbsent = (relPath: string, contents: string) => {
    const full = resolve(cwd, relPath);
    if (existsSync(full)) {
      skipped.push(`${relPath} (already exists — edit manually or delete to re-scaffold)`);
      return;
    }
    mkdirSync(resolve(cwd, relPath.replace(/\/[^/]+$/, "")), { recursive: true });
    writeFileSync(full, contents);
    wrote.push(relPath);
  };

  writeIfAbsent(".cursor/mcp.json", JSON.stringify(cursorConfig, null, 2) + "\n");
  writeIfAbsent(".vscode/mcp.json", JSON.stringify(vscodeConfig, null, 2) + "\n");
  writeIfAbsent(".windsurf/mcp.json", JSON.stringify(windsurfConfig, null, 2) + "\n");

  if (claudeAnswer === "run") {
    try {
      // `claude mcp add` is non-destructive: it fails if the name already
      // exists, so this is safe on repeated runs. No user input reaches the
      // argv other than the binary name.
      execFileSync("claude", ["mcp", "add", "prompt-to-asset", "--", "p2a"], {
        stdio: ["ignore", "pipe", "pipe"]
      });
      notes.push("ran `claude mcp add prompt-to-asset -- p2a`");
    } catch (e) {
      const err = e as NodeJS.ErrnoException & { stderr?: Buffer };
      const reason = err.stderr?.toString("utf-8").trim() || err.message;
      if (err.code === "ENOENT") {
        notes.push(
          "`claude` CLI not found on PATH — install Claude Code or run manually: claude mcp add prompt-to-asset -- p2a"
        );
      } else if (/already exists|already registered/i.test(reason)) {
        notes.push("Claude Code registration already present");
      } else {
        notes.push(`claude mcp add failed: ${reason.slice(0, 160)}`);
      }
    }
  } else {
    notes.push(
      "Claude Code (user-global): run `claude mcp add prompt-to-asset -- p2a` yourself when ready"
    );
  }

  return { wrote, skipped, notes };
}

function detectProject(cwd: string): Detected {
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
      suggestedAssetsDir: "assets/branding"
    };
  }
  if (has("Podfile") || has("ios/Podfile")) {
    return {
      kind: "xcode",
      label: "iOS / Xcode (Podfile detected)",
      suggestedAssetsDir: "Assets.xcassets"
    };
  }
  if (has("app/build.gradle") || has("build.gradle") || has("app/build.gradle.kts")) {
    return {
      kind: "android",
      label: "Android (Gradle detected)",
      suggestedAssetsDir: "app/src/main/res"
    };
  }
  if (has("app.json") && (deps["expo"] || deps["expo-router"])) {
    return {
      kind: "expo",
      label: "Expo (app.json + expo dep)",
      suggestedAssetsDir: "assets/branding"
    };
  }
  if (has("next.config.js") || has("next.config.mjs") || has("next.config.ts") || deps["next"]) {
    return {
      kind: "nextjs",
      label: "Next.js",
      suggestedAssetsDir: "public/branding"
    };
  }
  if (has("astro.config.mjs") || has("astro.config.ts") || deps["astro"]) {
    return {
      kind: "astro",
      label: "Astro",
      suggestedAssetsDir: "public/branding"
    };
  }
  if (deps["nuxt"] || deps["nuxt3"]) {
    return { kind: "nuxt", label: "Nuxt", suggestedAssetsDir: "public/branding" };
  }
  if (deps["@remix-run/react"]) {
    return { kind: "remix", label: "Remix", suggestedAssetsDir: "public/branding" };
  }
  if (has("vite.config.js") || has("vite.config.ts") || deps["vite"]) {
    return { kind: "vite", label: "Vite", suggestedAssetsDir: "public/branding" };
  }
  if (deps["react-native"]) {
    return {
      kind: "react-native",
      label: "React Native",
      suggestedAssetsDir: "assets/branding"
    };
  }
  if (deps["electron"]) {
    return { kind: "electron", label: "Electron", suggestedAssetsDir: "build/icons" };
  }
  if (pkg) {
    return { kind: "node", label: "Node.js", suggestedAssetsDir: "assets/branding" };
  }
  return {
    kind: "unknown",
    label: "unknown (no manifest found)",
    suggestedAssetsDir: "assets/branding"
  };
}

function inferAppName(cwd: string, d: Detected): string {
  try {
    if (d.kind === "flutter") {
      const yml = readFileSync(join(cwd, "pubspec.yaml"), "utf-8");
      const m = yml.match(/^name:\s*([\w_-]+)/m);
      if (m?.[1]) return m[1];
    }
    const pkgPath = join(cwd, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { name?: string };
      if (pkg.name) return pkg.name.replace(/^@[^/]+\//, "");
    }
  } catch {
    /* fall through */
  }
  const base = cwd.split(/[/\\]/).pop() ?? "app";
  return base;
}

function hintsFor(kind: Detected["kind"]): string[] {
  switch (kind) {
    case "flutter":
      return [
        "Run `p2a export master.png --platforms flutter` to emit flutter_launcher_icons.yaml + the 1024 masters.",
        "Then `dart run flutter_launcher_icons` fans the rest out (iOS, Android, adaptive, web, macOS, Windows).",
        "Reference assets from pubspec.yaml under `flutter.assets:`."
      ];
    case "xcode":
      return [
        "Drop the emitted AppIcon.appiconset into your Xcode project.",
        "Remember: the 1024 marketing image must be opaque (App Store rejects alpha)."
      ];
    case "android":
      return [
        "Copy mipmap-*/ into app/src/main/res/.",
        "Android 13+ ships a monochrome drawable — audit the auto-derived one for contrast."
      ];
    case "nextjs":
    case "astro":
    case "vite":
    case "nuxt":
    case "remix":
      return [
        "Emit favicon / icon.svg / manifest.webmanifest under /public.",
        "Use OG image from a dedicated route or a generate-at-build-time step."
      ];
    case "expo":
    case "react-native":
      return [
        "Expo prebuild regenerates app icons — keep the master under ./assets/.",
        "iOS + Android both need adaptive icons."
      ];
    case "electron":
      return [
        "electron-builder reads icons from ./build/icons/.",
        "Windows wants .ico; macOS wants .icns; favicons are irrelevant here."
      ];
    default:
      return [];
  }
}

function printIdeRegistrationHints(d: Detected, alreadyRegistered: boolean): void {
  const lines: string[] = [];
  if (alreadyRegistered) {
    lines.push("Other IDEs (not auto-registered — edit manually):");
    lines.push('  Codex CLI:    .codex/config.toml  ([mcp_servers.prompt-to-asset] command="p2a")');
    lines.push("  Gemini CLI:   gemini-extension.json — see docs/install.md");
    lines.push("  Cline:        .clinerules/ auto-picks up SSOT rules from npm run sync");
  } else {
    lines.push("Register the MCP server:");
    lines.push("");
    lines.push("  Claude Code:  claude mcp add prompt-to-asset -- p2a");
    lines.push(
      '  Cursor:       .cursor/mcp.json      { "mcpServers": { "prompt-to-asset": { "command": "p2a" } } }'
    );
    lines.push(
      '  VS Code:      .vscode/mcp.json      { "servers": { "prompt-to-asset": { "type": "stdio", "command": "p2a" } } }'
    );
    lines.push(
      '  Windsurf:     .windsurf/mcp.json   { "mcpServers": { "prompt-to-asset": { "command": "p2a" } } }'
    );
    lines.push('  Codex CLI:    .codex/config.toml    [mcp_servers.prompt-to-asset] command="p2a"');
    lines.push("  Gemini CLI:   gemini-extension.json — see docs/install.md");
    lines.push("  Cline:        .clinerules/ auto-picks up");
    lines.push("");
    lines.push("Or re-run with --register to auto-write the project-local files.");
  }
  lines.push("");
  process.stdout.write(lines.join("\n"));
  void d;
}

function printNextSteps(d: Detected, assetsDir: string): void {
  const lines: string[] = [];
  lines.push("Zero-key ways to make an image RIGHT NOW (no signup):");
  lines.push("");
  lines.push(
    `  curl -o logo.png "https://image.pollinations.ai/prompt/minimal+flat+vector+logo+mark+for+a+tech+startup+pure+white+background?model=flux&width=1024&height=1024&nologo=true"`
  );
  lines.push(
    `  # Pollinations rate-limits to ~1 req/15s anonymous, RGB only (matte with asset_remove_background).`
  );
  lines.push("");
  lines.push("Free-tier upgrades (still $0, but need a one-time free token):");
  lines.push(
    `  export CLOUDFLARE_API_TOKEN=...   # https://dash.cloudflare.com — Workers AI, Flux-1-Schnell, 10k neurons/day free`
  );
  lines.push(`  export CLOUDFLARE_ACCOUNT_ID=...  # same dashboard, account sidebar`);
  lines.push(
    `  export HF_TOKEN=...               # https://huggingface.co/settings/tokens — SDXL / SD3 / Flux dev+schnell`
  );
  lines.push(
    `  # Gemini / Imagen image API is NOT free since 2025-12. GEMINI_API_KEY is still free for`
  );
  lines.push(
    `  # text/multimodal; for image-gen you need billing enabled on the GCP project (Nano Banana`
  );
  lines.push(
    `  # $0.039/img, Imagen 4 Fast $0.02/img). Free interactive path: https://aistudio.google.com`
  );
  lines.push(`  # → download the PNG → asset_ingest_external.`);
  lines.push("");
  if (d.kind === "flutter") {
    lines.push("Flutter launcher icons (parity with pub.dev/packages/flutter_launcher_icons):");
    lines.push(
      `  p2a export path/to/master.png --platforms flutter --out ${assetsDir} --app-name "YourApp"`
    );
  } else if (d.kind === "xcode" || d.kind === "android" || d.kind === "expo") {
    lines.push(`  p2a export path/to/master.png --out ${assetsDir} --ios18`);
  } else {
    lines.push(
      `  p2a export path/to/master.png --platforms favicon,pwa --out ${assetsDir} --app-name "YourApp"`
    );
  }
  lines.push(`  p2a doctor              # shows which modes + providers are live`);
  lines.push(`  p2a models list --free  # zero-key / free-tier options`);
  lines.push("");
  lines.push("Or ask your AI assistant:");
  lines.push(`  "Generate a favicon for ${assetsDir}/. Use brand.json."`);
  lines.push("");
  process.stdout.write(lines.join("\n"));
}
