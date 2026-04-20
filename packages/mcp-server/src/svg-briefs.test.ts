import { describe, it, expect } from "vitest";
import { buildSvgBrief } from "./svg-briefs.js";

describe("buildSvgBrief", () => {
  it("returns a logo brief with viewBox 0 0 256 256 and path_budget ≤ 40", () => {
    const b = buildSvgBrief({ asset_type: "logo" });
    expect(b.viewBox).toBe("0 0 256 256");
    expect(b.path_budget).toBeLessThanOrEqual(40);
    expect(b.skeleton).toContain("<svg");
    expect(b.skeleton).toContain("0 0 256 256");
  });

  it("favicon brief caps viewBox at 32 and palette slots at 2", () => {
    const b = buildSvgBrief({ asset_type: "favicon" });
    expect(b.viewBox).toBe("0 0 32 32");
    expect(b.palette.slots).toBeLessThanOrEqual(2);
    expect(b.path_budget).toBeLessThanOrEqual(8);
    expect(b.do_not.join(" ")).toMatch(/no <text>|no text/i);
  });

  it("icon_pack uses currentColor and 24×24 grid", () => {
    const b = buildSvgBrief({ asset_type: "icon_pack" });
    expect(b.viewBox).toBe("0 0 24 24");
    expect(b.palette.hex).toContain("currentColor");
    expect(b.stroke.default_width_px).toBe(2);
    expect(b.skeleton).toContain('stroke="currentColor"');
  });

  it("app_icon brief has an opaque background rect and 1024 canvas", () => {
    const b = buildSvgBrief({ asset_type: "app_icon" });
    expect(b.viewBox).toBe("0 0 1024 1024");
    expect(b.skeleton).toMatch(/<rect width="1024" height="1024"/);
    expect(b.do_not.some((d) => /transparent/i.test(d))).toBe(true);
  });

  it("respects a caller-supplied brand palette", () => {
    const b = buildSvgBrief({
      asset_type: "logo",
      brand_bundle: {
        palette: ["#FF0000", "#00FF00", "#0000FF"]
      }
    });
    expect(b.palette.hex).toEqual(["#FF0000", "#00FF00", "#0000FF"]);
  });

  it("falls back to a default palette when none provided", () => {
    const b = buildSvgBrief({ asset_type: "logo" });
    expect(b.palette.hex.length).toBeGreaterThanOrEqual(1);
    for (const hex of b.palette.hex) {
      expect(hex).toMatch(/^(#[0-9A-Fa-f]{6}|currentColor)$/);
    }
  });

  it("cites research angles", () => {
    const b = buildSvgBrief({ asset_type: "logo" });
    expect(b.research_refs.length).toBeGreaterThan(0);
    expect(b.research_refs.some((r) => r.includes("docs/research/"))).toBe(true);
  });
});
