import { describe, it, expect, beforeAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, existsSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

// Live CLI smoke — runs the real compiled binary against a real 1024² PNG
// master and asserts the platform bundles land on disk with valid sizes.
// No network. Requires `sharp` (optional dep) to be installed.

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN = resolve(__dirname, "../../packages/mcp-server/dist/index.js");

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const r = await execFileAsync("node", [BIN, ...args], { maxBuffer: 10 * 1024 * 1024 });
    return { stdout: r.stdout.toString(), stderr: r.stderr.toString(), code: 0 };
  } catch (e) {
    const err = e as { stdout?: Buffer | string; stderr?: Buffer | string; code?: number };
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      code: typeof err.code === "number" ? err.code : 1
    };
  }
}

describe("p2a CLI (built binary)", () => {
  it("p2a --help prints the usage block with every subcommand", async () => {
    const r = await runCli(["--help"]);
    expect(r.code).toBe(0);
    for (const s of ["export", "init", "doctor", "models list", "sprite-sheet", "nine-slice"]) {
      expect(r.stdout).toContain(s);
    }
  });

  it("p2a doctor reports free-tier + paid buckets", async () => {
    const r = await runCli(["doctor"]);
    expect(r.code).toBe(0);
    const out = r.stdout;
    expect(out).toContain("Free-tier / zero-key routes");
    expect(out).toContain("Paid direct APIs");
    expect(out).toContain("Paste-only providers");
    expect(out).toContain("pollinations");
    expect(out).toContain("cloudflare");
    expect(out).toContain("huggingface");
  });

  it("p2a models list prints a table with every registered model", async () => {
    const r = await runCli(["models", "list"]);
    expect(r.code).toBe(0);
    for (const id of [
      "gpt-image-1",
      "recraft-v3",
      "flux-2",
      "pollinations-flux",
      "cf-flux-1-schnell",
      "midjourney-v7"
    ]) {
      expect(r.stdout).toContain(id);
    }
  });

  it("p2a models list --free narrows to free-tier only", async () => {
    const r = await runCli(["models", "list", "--free"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("pollinations-flux");
    expect(r.stdout).toContain("cf-flux-1-schnell");
    expect(r.stdout).not.toContain("gpt-image-1");
  });

  it("p2a models inspect <id> prints full capability dump + paste targets", async () => {
    const r = await runCli(["models", "inspect", "gpt-image-1"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("model: gpt-image-1");
    expect(r.stdout).toContain("native_rgba");
    expect(r.stdout).toContain("Paste targets");
  });
});

describe("p2a export (real sharp pipeline)", () => {
  let outDir: string;
  let masterPath: string;

  beforeAll(async () => {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;

    const bg = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 10, g: 120, b: 150, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    outDir = mkdtempSync(join(tmpdir(), "p2a-export-"));
    masterPath = join(outDir, "master.png");
    writeFileSync(masterPath, bg);
  }, 30_000);

  it("p2a export writes iOS + Android + PWA + favicon + Flutter + visionOS bundles", async () => {
    const bundleDir = join(outDir, "bundle");
    const r = await runCli([
      "export",
      masterPath,
      "--platforms",
      "ios,android,pwa,favicon,flutter,visionos",
      "--out",
      bundleDir,
      "--app-name",
      "TestApp",
      "--theme",
      "#0a7896",
      "--bg",
      "#ffffff"
    ]);
    expect(r.code).toBe(0);

    const expected = [
      "master.png",
      "ios/AppIcon.appiconset/Contents.json",
      "ios/AppIcon.appiconset/Icon-iphone-60@3x.png",
      "android/mipmap-xxxhdpi/ic_launcher.png",
      "android/drawable/ic_launcher_foreground.png",
      "android/drawable/ic_launcher_background.png",
      "android/drawable/ic_launcher_monochrome.png",
      "android/mipmap-anydpi-v26/ic_launcher.xml",
      "pwa/192.png",
      "pwa/512.png",
      "pwa/512-maskable.png",
      "pwa/manifest-snippet.json",
      "visionos/master.png",
      "visionos/README.md",
      "flutter/icon-1024.png",
      "flutter/icon-1024-adaptive.png",
      "flutter/flutter_launcher_icons.yaml",
      "favicon/favicon-16.png",
      "favicon/favicon-32.png",
      "favicon/favicon-48.png",
      "favicon/apple-touch-icon.png",
      "favicon/pwa-192.png",
      "favicon/pwa-512.png",
      "favicon/pwa-512-maskable.png",
      "favicon/manifest.webmanifest",
      "favicon/head-snippet.html"
    ];

    for (const rel of expected) {
      const p = join(bundleDir, rel);
      expect(existsSync(p), `missing ${rel}`).toBe(true);
      expect(statSync(p).size).toBeGreaterThan(0);
    }

    const contents = JSON.parse(
      readFileSync(join(bundleDir, "ios/AppIcon.appiconset/Contents.json"), "utf-8")
    ) as { images?: unknown[] };
    expect(Array.isArray(contents.images)).toBe(true);
    expect((contents.images ?? []).length).toBeGreaterThan(10);

    const pwaManifest = JSON.parse(
      readFileSync(join(bundleDir, "pwa/manifest-snippet.json"), "utf-8")
    ) as { icons?: Array<{ purpose?: string }> };
    expect(pwaManifest.icons?.some((i) => i.purpose === "maskable")).toBe(true);

    const flutterYaml = readFileSync(
      join(bundleDir, "flutter/flutter_launcher_icons.yaml"),
      "utf-8"
    );
    expect(flutterYaml).toContain("flutter_launcher_icons:");
    expect(flutterYaml).toContain("icon-1024.png");
    expect(flutterYaml).toContain("icon-1024-adaptive.png");

    const snippet = readFileSync(join(bundleDir, "favicon/head-snippet.html"), "utf-8");
    expect(snippet).toContain('rel="icon"');
    expect(snippet).toContain('rel="manifest"');
    expect(snippet).toContain("theme-color");
    expect(snippet).toContain("#0a7896");
  }, 60_000);
});
