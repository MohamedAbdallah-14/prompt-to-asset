import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initBrand } from "./init-brand.js";

describe("asset_init_brand", () => {
  let dir: string;
  const origCwd = process.cwd();

  beforeEach(() => {
    // tmpdir() is on the path allow-list by default (see security/paths.ts),
    // so we don't need to touch P2A_ALLOWED_PATHS.
    dir = mkdtempSync(join(tmpdir(), "p2a-init-"));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes brand.json with the app name + default palette", async () => {
    const r = await initBrand({ app_name: "forge", overwrite: false });
    expect(r.written).toBe(true);
    expect(r.already_existed).toBe(false);
    expect(existsSync(r.brand_json_path)).toBe(true);
    const parsed = JSON.parse(readFileSync(r.brand_json_path, "utf-8")) as {
      name: string;
      palette: string[];
    };
    expect(parsed.name).toBe("forge");
    expect(parsed.palette).toEqual(["#2563eb", "#ffffff"]);
  });

  it("accepts a custom palette", async () => {
    const r = await initBrand({
      app_name: "acme",
      palette: ["#ff6a00", "#111111", "#eeeeee"],
      overwrite: false
    });
    expect((r.brand_json as { palette: string[] }).palette).toEqual([
      "#ff6a00",
      "#111111",
      "#eeeeee"
    ]);
  });

  it("detects a Next.js project when next.config exists", async () => {
    writeFileSync(join(dir, "next.config.js"), "module.exports = {};");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "site", dependencies: { next: "^14.0.0" } })
    );
    const r = await initBrand({ app_name: "site", overwrite: false });
    expect(r.detected.kind).toBe("nextjs");
    // Normalize for Windows (path.join returns backslashes on win32).
    expect(r.assets_dir.replace(/\\/g, "/")).toMatch(/public\/branding$/);
  });

  it("refuses to overwrite without overwrite=true", async () => {
    await initBrand({ app_name: "first", overwrite: false });
    const r2 = await initBrand({ app_name: "second", overwrite: false });
    expect(r2.written).toBe(false);
    expect(r2.already_existed).toBe(true);
    const parsed = JSON.parse(readFileSync(r2.brand_json_path, "utf-8")) as { name: string };
    expect(parsed.name).toBe("first");
  });

  it("overwrites when overwrite=true", async () => {
    await initBrand({ app_name: "first", overwrite: false });
    const r2 = await initBrand({ app_name: "second", overwrite: true });
    expect(r2.written).toBe(true);
    expect(r2.already_existed).toBe(true);
    const parsed = JSON.parse(readFileSync(r2.brand_json_path, "utf-8")) as { name: string };
    expect(parsed.name).toBe("second");
  });

  it("ensures the assets dir exists", async () => {
    const r = await initBrand({ app_name: "app", assets_dir: "custom/branding", overwrite: false });
    expect(existsSync(r.assets_dir)).toBe(true);
  });

  it("unknown project kind is reported without erroring", async () => {
    const r = await initBrand({ app_name: "bare", overwrite: false });
    expect(r.detected.kind).toBe("unknown");
  });
});
