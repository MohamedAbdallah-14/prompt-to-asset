import { describe, it, expect } from "vitest";
import { classify, inferFlags } from "./classify.js";

describe("classify", () => {
  it.each([
    ["make me an iOS app icon for a dev tool", "app_icon"],
    ["generate a favicon that looks good at 16x16", "favicon"],
    ["OG image for a blog post about rust", "og_image"],
    ["splash screen for our onboarding flow", "splash_screen"],
    ["icon pack with 24 toolbar icons", "icon_pack"],
    ["sticker pack of a sleepy cat", "sticker"],
    ["hero banner for our landing page", "hero"],
    ["empty-state illustration for a settings screen", "illustration"],
    ["logo for a developer-tools company called Forge", "logo"],
    ["isolated mark with no background", "transparent_mark"]
  ])("maps %j to %s", (brief, expected) => {
    expect(classify(brief).asset_type).toBe(expected);
  });

  it("falls back to illustration with low confidence when nothing matches", () => {
    const out = classify("something vaguely visual");
    expect(out.asset_type).toBe("illustration");
    expect(out.confidence).toBeLessThan(0.5);
    expect(out.reason.toLowerCase()).toContain("defaulting");
  });

  it("prefers app_icon over logo when both patterns are present", () => {
    // app_icon rule fires first and short-circuits — protects against
    // the caller asking for an iOS app icon that happens to mention a logo.
    expect(classify("iOS app icon for my logo company").asset_type).toBe("app_icon");
  });
});

describe("inferFlags", () => {
  it("forces transparency for logo / sticker / icon_pack regardless of brief", () => {
    expect(inferFlags("any brief", "logo").transparency_required).toBe(true);
    expect(inferFlags("any brief", "sticker").transparency_required).toBe(true);
    expect(inferFlags("any brief", "icon_pack").transparency_required).toBe(true);
    expect(inferFlags("any brief", "transparent_mark").transparency_required).toBe(true);
  });

  it("defaults hero and og_image to non-transparent", () => {
    expect(inferFlags("cinematic hero", "hero").transparency_required).toBe(false);
    expect(inferFlags("social card", "og_image").transparency_required).toBe(false);
  });

  it("keeps app_icon master transparent so export can flatten", () => {
    expect(inferFlags("iOS app icon", "app_icon").transparency_required).toBe(true);
  });

  it("forces vector for logo / favicon / icon_pack", () => {
    expect(inferFlags("any brief", "logo").vector_required).toBe(true);
    expect(inferFlags("any brief", "favicon").vector_required).toBe(true);
    expect(inferFlags("any brief", "icon_pack").vector_required).toBe(true);
  });

  it("extracts quoted wordmark text", () => {
    expect(inferFlags('logo with the word "Forge"', "logo").text_content).toBe("Forge");
  });

  it("extracts wordmark from 'with the text X'", () => {
    expect(inferFlags("logo with the text Forge", "logo").text_content).toBe("Forge");
  });

  it("returns null text when no wordmark is specified", () => {
    expect(inferFlags("clean minimal logo", "logo").text_content).toBeNull();
  });
});
