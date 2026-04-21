import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { initBrand } from "./init-brand.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "p2a-init-brand-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("tools/init-brand", () => {
  it("writes brand.json with defaults on a bare project", async () => {
    const r = await initBrand({ app_name: "TestApp", cwd: tmp });
    expect(r.written).toBe(true);
    expect(r.already_existed).toBe(false);
    expect(existsSync(r.brand_json_path)).toBe(true);
    const parsed = JSON.parse(readFileSync(r.brand_json_path, "utf-8"));
    expect(parsed.name).toBe("TestApp");
    expect(parsed.palette).toEqual(["#2563eb", "#ffffff"]);
  });

  it("respects provided palette / fonts / do_not", async () => {
    const r = await initBrand({
      app_name: "Sunrise",
      cwd: tmp,
      palette: ["#ff6a00", "#000000"],
      display_font: "Sora",
      body_font: "Inter",
      do_not: ["emoji", "neon"]
    });
    const parsed = JSON.parse(readFileSync(r.brand_json_path, "utf-8"));
    expect(parsed.palette).toEqual(["#ff6a00", "#000000"]);
    expect(parsed.fonts.display.family).toBe("Sora");
    expect(parsed.do_not).toContain("emoji");
  });

  it("refuses to overwrite without the flag", async () => {
    await initBrand({ app_name: "Initial", cwd: tmp });
    const second = await initBrand({ app_name: "Secondary", cwd: tmp });
    expect(second.written).toBe(false);
    expect(second.already_existed).toBe(true);
    expect(second.note).toMatch(/overwrite=true/);
  });

  it("overwrites when overwrite=true", async () => {
    await initBrand({ app_name: "Initial", cwd: tmp });
    const second = await initBrand({ app_name: "Secondary", cwd: tmp, overwrite: true });
    expect(second.written).toBe(true);
    expect(second.already_existed).toBe(true);
    const parsed = JSON.parse(readFileSync(second.brand_json_path, "utf-8"));
    expect(parsed.name).toBe("Secondary");
  });

  it("detects Next.js via next.config.js", async () => {
    writeFileSync(join(tmp, "next.config.js"), "module.exports = {};");
    const r = await initBrand({ app_name: "NextApp", cwd: tmp });
    expect(r.detected.kind).toBe("nextjs");
    expect(r.assets_dir).toContain(join("public", "branding"));
  });

  it("detects Flutter via pubspec.yaml", async () => {
    writeFileSync(join(tmp, "pubspec.yaml"), "name: demo");
    const r = await initBrand({ app_name: "FlutterApp", cwd: tmp });
    expect(r.detected.kind).toBe("flutter");
  });

  it("detects Xcode via Podfile", async () => {
    writeFileSync(join(tmp, "Podfile"), "platform :ios, '15.0'");
    const r = await initBrand({ app_name: "iOSApp", cwd: tmp });
    expect(r.detected.kind).toBe("xcode");
  });

  it("detects Android via build.gradle", async () => {
    writeFileSync(join(tmp, "build.gradle"), "// android");
    const r = await initBrand({ app_name: "AndroidApp", cwd: tmp });
    expect(r.detected.kind).toBe("android");
  });

  it("detects Astro via astro.config.mjs", async () => {
    writeFileSync(join(tmp, "astro.config.mjs"), "export default {};");
    const r = await initBrand({ app_name: "AstroApp", cwd: tmp });
    expect(r.detected.kind).toBe("astro");
  });

  it("detects Vite via vite.config.ts", async () => {
    writeFileSync(join(tmp, "vite.config.ts"), "export default {};");
    const r = await initBrand({ app_name: "ViteApp", cwd: tmp });
    expect(r.detected.kind).toBe("vite");
  });

  it("detects Remix via @remix-run/react dep", async () => {
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        name: "x",
        dependencies: { "@remix-run/react": "*" }
      })
    );
    const r = await initBrand({ app_name: "RemixApp", cwd: tmp });
    expect(r.detected.kind).toBe("remix");
  });

  it("detects Electron via electron dep", async () => {
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", dependencies: { electron: "*" } })
    );
    const r = await initBrand({ app_name: "ElectronApp", cwd: tmp });
    expect(r.detected.kind).toBe("electron");
  });

  it("detects Expo via app.json + expo dep", async () => {
    writeFileSync(join(tmp, "app.json"), "{}");
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", dependencies: { expo: "*" } })
    );
    const r = await initBrand({ app_name: "ExpoApp", cwd: tmp });
    expect(r.detected.kind).toBe("expo");
  });

  it("detects Nuxt via nuxt dep", async () => {
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", dependencies: { nuxt: "*" } })
    );
    const r = await initBrand({ app_name: "NuxtApp", cwd: tmp });
    expect(r.detected.kind).toBe("nuxt");
  });

  it("detects React Native via react-native dep", async () => {
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ name: "x", dependencies: { "react-native": "*" } })
    );
    const r = await initBrand({ app_name: "RNApp", cwd: tmp });
    expect(r.detected.kind).toBe("react-native");
  });

  it("detects plain Node.js as a fallback", async () => {
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ name: "x" }));
    const r = await initBrand({ app_name: "NodeApp", cwd: tmp });
    expect(r.detected.kind).toBe("node");
  });

  it("falls back to 'unknown' when there is no package manifest", async () => {
    // tmp is empty except for brand.json after init
    const r = await initBrand({ app_name: "Mystery", cwd: tmp });
    expect(r.detected.kind).toBe("unknown");
  });

  it("creates the assets_dir even if not present", async () => {
    const r = await initBrand({
      app_name: "AssetTest",
      cwd: tmp,
      assets_dir: "custom/my-assets"
    });
    expect(existsSync(r.assets_dir)).toBe(true);
    expect(r.assets_dir.endsWith(`custom${sep}my-assets`)).toBe(true);
  });
});
