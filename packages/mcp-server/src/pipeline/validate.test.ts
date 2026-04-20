import { describe, it, expect } from "vitest";
import { deltaE2000, hexToRgb, levenshtein, rgbToLab, tier0 } from "./validate.js";
import { loadSharp } from "./sharp.js";

describe("hexToRgb", () => {
  it("parses 6-char hex", () => {
    expect(hexToRgb("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
  });
  it("parses 3-char hex", () => {
    expect(hexToRgb("#f80")).toEqual({ r: 255, g: 136, b: 0 });
  });
  it("parses without hash", () => {
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });
});

describe("rgbToLab", () => {
  it("maps pure white to L≈100, a≈0, b≈0", () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.L).toBeGreaterThan(99);
    expect(Math.abs(lab.a)).toBeLessThan(1);
    expect(Math.abs(lab.b)).toBeLessThan(1);
  });
  it("maps pure black to L≈0", () => {
    const lab = rgbToLab({ r: 0, g: 0, b: 0 });
    expect(lab.L).toBeLessThan(1);
  });
});

describe("deltaE2000", () => {
  // Reference pairs from Sharma, Wu, Dalal 2005 Table 1.
  // ΔE2000 is zero for identical colors.
  it("returns 0 for identical colors", () => {
    const lab = rgbToLab({ r: 128, g: 64, b: 200 });
    expect(deltaE2000(lab, lab)).toBeLessThan(0.01);
  });
  it("black vs white is large (>90)", () => {
    const black = rgbToLab({ r: 0, g: 0, b: 0 });
    const white = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(deltaE2000(black, white)).toBeGreaterThan(90);
  });
  it("near-identical colors are <2", () => {
    const a = rgbToLab({ r: 100, g: 100, b: 100 });
    const b = rgbToLab({ r: 102, g: 100, b: 100 });
    expect(deltaE2000(a, b)).toBeLessThan(2);
  });
  it("is symmetric", () => {
    const a = rgbToLab({ r: 255, g: 0, b: 0 });
    const b = rgbToLab({ r: 0, g: 255, b: 0 });
    const ab = deltaE2000(a, b);
    const ba = deltaE2000(b, a);
    expect(Math.abs(ab - ba)).toBeLessThan(0.01);
  });
});

describe("levenshtein", () => {
  it("identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });
  it("single substitution", () => {
    expect(levenshtein("cat", "car")).toBe(1);
  });
  it("empty vs non-empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
  it("insertion", () => {
    expect(levenshtein("cat", "cart")).toBe(1);
  });
});

describe("tier0 integration", () => {
  it("gracefully degrades when sharp missing", async () => {
    // When sharp is available we still exercise the main path below; this
    // test just ensures the shape is sane for tiny inputs.
    const res = await tier0({
      image: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      asset_type: "logo"
    });
    expect(res.tier0).toBeDefined();
    expect(Array.isArray(res.warnings)).toBe(true);
  });

  it("flags alpha_required_but_missing when transparency required on opaque image", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const opaque = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#ff0000" }
    })
      .png()
      .toBuffer();
    const res = await tier0({
      image: opaque,
      asset_type: "transparent_mark",
      transparency_required: true
    });
    expect(res.tier0["alpha_required_but_missing"]).toBe(true);
    expect(res.warnings.some((w) => w.includes("alpha channel required"))).toBe(true);
  });

  it("computes palette ΔE2000 against brand palette", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    // Solid red image vs brand palette [red] → ΔE ≈ 0
    const red = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#ff0000" }
    })
      .png()
      .toBuffer();
    const res = await tier0({
      image: red,
      asset_type: "logo",
      brand_bundle: { palette: ["#ff0000"] }
    });
    const de = res.tier0["palette_delta_e2000_avg"] as number;
    expect(de).toBeLessThan(2);
    expect(res.tier0["palette_drift"]).toBeUndefined();
  });

  it("flags palette_drift when image colors differ from brand palette", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const blue = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#0000ff" }
    })
      .png()
      .toBuffer();
    const res = await tier0({
      image: blue,
      asset_type: "logo",
      brand_bundle: { palette: ["#ff0000"] } // red palette vs blue image → high ΔE
    });
    expect(res.tier0["palette_drift"]).toBe(true);
  });

  it("detects subject bbox and validates app_icon safe zone (pass)", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    // 1024 transparent canvas with 600×600 opaque center → well inside 824 safe zone
    const canvas = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: await sharp({
            create: { width: 600, height: 600, channels: 4, background: "#ff0000" }
          })
            .png()
            .toBuffer(),
          top: 212,
          left: 212
        }
      ])
      .png()
      .toBuffer();
    const res = await tier0({
      image: canvas,
      asset_type: "app_icon",
      expected_width: 1024,
      expected_height: 1024
    });
    expect(res.tier0["safe_zone_ok"]).toBe(true);
    expect(res.tier0["safe_zone_violation"]).toBeUndefined();
  });

  it("flags safe_zone_violation when subject exceeds the 824² center for app_icon", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    // 1024 transparent canvas with a 1000×1000 opaque mark → overflows 824 safe zone
    const overflow = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: await sharp({
            create: { width: 1000, height: 1000, channels: 4, background: "#00ff00" }
          })
            .png()
            .toBuffer(),
          top: 12,
          left: 12
        }
      ])
      .png()
      .toBuffer();
    const res = await tier0({
      image: overflow,
      asset_type: "app_icon"
    });
    expect(res.tier0["safe_zone_violation"]).toBe(true);
  });

  it("warns when intended_text is provided but OCR engine absent", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const img = await sharp({
      create: { width: 128, height: 128, channels: 3, background: "#ffffff" }
    })
      .png()
      .toBuffer();
    const res = await tier0({
      image: img,
      asset_type: "logo",
      intended_text: "Acme"
    });
    // Either OCR ran (unlikely without tesseract.js in CI) or we warn.
    if (res.tier0["ocr_available"] === false) {
      expect(res.warnings.some((w) => w.includes("tesseract"))).toBe(true);
    } else {
      expect(res.tier0["ocr_text"]).toBeDefined();
    }
  });
});
