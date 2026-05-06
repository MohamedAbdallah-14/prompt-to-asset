import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportBundle } from "./export-bundle.js";
import { loadSharp } from "../pipeline/sharp.js";

describe("asset_export_bundle", () => {
  let dir: string;
  const origCwd = process.cwd();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "p2a-export-"));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a missing master", async () => {
    await expect(
      exportBundle({ master_path: join(dir, "nope.png"), ios18: false })
    ).rejects.toThrow(/not found|does not exist/i);
  });

  it("emits favicon bundle from a small master", async () => {
    const sharp = await loadSharp();
    if (!sharp) return; // Skip when sharp isn't installed.
    const master = await sharp({
      create: { width: 128, height: 128, channels: 4, background: "#2563eb" }
    })
      .png()
      .toBuffer();
    const masterPath = join(dir, "master.png");
    writeFileSync(masterPath, master);

    const r = await exportBundle({
      master_path: masterPath,
      platforms: ["favicon"],
      out_dir: join(dir, "out"),
      ios18: false
    });

    expect(r.platforms).toEqual(["favicon"]);
    expect(r.files.length).toBeGreaterThan(0);
    // Favicon bundle lands under out/favicon/ per the CLI convention.
    const favDir = join(dir, "out", "favicon");
    expect(existsSync(favDir)).toBe(true);
    const filesInDir = readdirSync(favDir);
    expect(filesInDir.some((f) => f.endsWith(".ico") || f.endsWith(".png"))).toBe(true);
  });

  it("'all' expands to every platform", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const master = await sharp({
      create: { width: 128, height: 128, channels: 4, background: "#111" }
    })
      .png()
      .toBuffer();
    const masterPath = join(dir, "m.png");
    writeFileSync(masterPath, master);

    const r = await exportBundle({
      master_path: masterPath,
      platforms: ["all"],
      out_dir: join(dir, "out"),
      ios18: false
    });

    expect(r.platforms).toContain("ios");
    expect(r.platforms).toContain("android");
    expect(r.platforms).toContain("pwa");
    expect(r.platforms).toContain("favicon");
    expect(r.platforms).toContain("visionos");
    expect(r.platforms).toContain("flutter");
  }, 20_000);
});
