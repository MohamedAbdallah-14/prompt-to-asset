import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { saveInlineSvg } from "./save-inline-svg.js";

function tmp() {
  return mkdtempSync(resolve(tmpdir(), "prompt-to-asset-save-"));
}

describe("asset_save_inline_svg", () => {
  it("writes master.svg for a logo and returns the path", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
      <path d="M64 64h128v128H64z" fill="#0F172A"/>
    </svg>`;
    const r = await saveInlineSvg({
      svg,
      asset_type: "logo",
      output_dir: outDir
    });
    expect(r.mode).toBe("api");
    expect(r.asset_type).toBe("logo");
    const svgVariant = r.variants.find((v) => v.format === "svg");
    expect(svgVariant).toBeDefined();
    expect(existsSync(svgVariant!.path)).toBe(true);
    expect(readFileSync(svgVariant!.path, "utf-8")).toContain("viewBox");
  });

  it("warns when viewBox does not match the brief", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 999 999" width="256" height="256" fill="none">
      <rect x="10" y="10" width="200" height="200" fill="#0F172A"/>
    </svg>`;
    const r = await saveInlineSvg({ svg, asset_type: "logo", output_dir: outDir });
    expect(r.warnings.some((w) => /viewBox/i.test(w))).toBe(true);
  });

  it("warns when path count exceeds the budget", async () => {
    const outDir = tmp();
    // 50 paths, favicon budget is 8
    const paths = Array.from({ length: 50 }, () => '<path d="M0 0L1 1" fill="#0F172A"/>').join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">${paths}</svg>`;
    const r = await saveInlineSvg({ svg, asset_type: "favicon", output_dir: outDir });
    expect(r.warnings.some((w) => /path.*budget|paths/i.test(w))).toBe(true);
  });

  it("flags <image> and <filter> elements", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
      <image href="foo.png" width="256" height="256"/>
      <filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>
    </svg>`;
    const r = await saveInlineSvg({ svg, asset_type: "logo", output_dir: outDir });
    expect(r.warnings.some((w) => /<image>/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /<filter>/i.test(w))).toBe(true);
  });

  it("flags colors outside the brand palette", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
      <path d="M0 0L1 1" fill="#ABC123"/>
    </svg>`;
    const r = await saveInlineSvg({
      svg,
      asset_type: "logo",
      brand_bundle: { palette: ["#0F172A", "#F59E0B"] },
      output_dir: outDir
    });
    expect(r.warnings.some((w) => /palette|not in/i.test(w))).toBe(true);
  });

  it("accepts currentColor in icon_pack without complaining about palette", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 12h18"/>
    </svg>`;
    const r = await saveInlineSvg({ svg, asset_type: "icon_pack", output_dir: outDir });
    expect(r.warnings.some((w) => /palette/i.test(w))).toBe(false);
  });

  it("rejects input that does not start with <svg>", async () => {
    const outDir = tmp();
    const r = await saveInlineSvg({
      svg: "<html><body>oops</body></html>",
      asset_type: "logo",
      output_dir: outDir
    });
    expect(r.warnings.some((w) => /does not start with <svg>/i.test(w))).toBe(true);
  });

  it("favicon bundle writes the complete set (ico, dark svg, pwa maskable, manifest, head snippet)", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">
      <rect width="32" height="32" rx="6" fill="#EA580C"/>
      <rect x="9" y="7" width="5" height="18" fill="#FDBA74"/>
      <rect x="9" y="7" width="14" height="5" fill="#FDBA74"/>
    </svg>`;
    const r = await saveInlineSvg({
      svg,
      asset_type: "favicon",
      dark_mode: true,
      app_name: "Forge",
      theme_color: "#EA580C",
      background_color: "#FFFFFF",
      brand_bundle: { palette: ["#EA580C", "#FDBA74"] },
      output_dir: outDir
    });

    const kinds = r.variants.map((v) => basename(v.path));
    for (const required of [
      "icon.svg",
      "icon-dark.svg",
      "favicon-16.png",
      "favicon-32.png",
      "favicon-48.png",
      "favicon.ico",
      "apple-touch-icon.png",
      "pwa-192.png",
      "pwa-512.png",
      "pwa-512-maskable.png",
      "manifest.webmanifest",
      "head-snippet.html"
    ]) {
      expect(kinds, `missing ${required}`).toContain(required);
    }

    // All files exist on disk
    for (const v of r.variants) expect(existsSync(v.path)).toBe(true);

    // Manifest is valid JSON with app_name + maskable + theme_color
    const mfPath = r.variants.find((v) => v.path.endsWith("manifest.webmanifest"))!.path;
    const mf = JSON.parse(readFileSync(mfPath, "utf-8"));
    expect(mf.name).toBe("Forge");
    expect(mf.theme_color).toBe("#EA580C");
    expect(mf.background_color).toBe("#FFFFFF");
    expect(mf.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

    // Head snippet references manifest + theme-color meta
    const snippetPath = r.variants.find((v) => v.path.endsWith("head-snippet.html"))!.path;
    const snippet = readFileSync(snippetPath, "utf-8");
    expect(snippet).toContain('rel="manifest"');
    expect(snippet).toMatch(/theme-color/);
    expect(snippet).toContain("icon-dark.svg");

    // icon-dark.svg actually differs from icon.svg
    const darkPath = r.variants.find((v) => v.path.endsWith("icon-dark.svg"))!.path;
    // Windows paths use backslash; compare on basename to be cross-platform.
    const lightPath = r.variants.find((v) => basename(v.path) === "icon.svg")!.path;
    expect(readFileSync(darkPath, "utf-8")).not.toBe(readFileSync(lightPath, "utf-8"));
  });

  it("app_icon bundle defaults platforms to ['all'] when omitted", async () => {
    const outDir = tmp();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <rect width="1024" height="1024" fill="#0F172A"/>
      <rect x="200" y="200" width="624" height="624" fill="#F59E0B"/>
    </svg>`;
    const r = await saveInlineSvg({
      svg,
      asset_type: "app_icon",
      brand_bundle: { palette: ["#0F172A", "#F59E0B"] },
      output_dir: outDir
    });
    const paths = r.variants.map((v) => v.path);
    // iOS AppIconSet
    expect(paths.some((p) => p.includes("AppIcon.appiconset") && p.endsWith(".png"))).toBe(true);
    expect(
      paths.some((p) => p.includes("AppIcon.appiconset") && basename(p) === "Contents.json")
    ).toBe(true);
    // Android adaptive xml + monochrome
    expect(paths.some((p) => p.endsWith("ic_launcher.xml"))).toBe(true);
    expect(paths.some((p) => p.endsWith("ic_launcher_monochrome.png"))).toBe(true);
    // PWA maskable
    expect(paths.some((p) => p.endsWith("512-maskable.png"))).toBe(true);
  });
});
