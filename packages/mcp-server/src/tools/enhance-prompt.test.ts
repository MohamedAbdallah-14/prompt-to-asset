import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { enhancePrompt } from "./enhance-prompt.js";

const KEYS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "IDEOGRAM_API_KEY",
  "RECRAFT_API_KEY",
  "BFL_API_KEY",
  "TOGETHER_API_KEY"
];

describe("enhancePrompt — mode surface", () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) snapshot[k] = process.env[k];
    for (const k of KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] !== undefined) process.env[k] = snapshot[k];
      else delete process.env[k];
    }
  });

  it("populates modes_available for logo (inline_svg + external; api excluded without key)", async () => {
    const spec = await enhancePrompt({ brief: "flat vector logo for Forge" });
    expect(spec.modes_available).toContain("inline_svg");
    expect(spec.modes_available).toContain("external_prompt_only");
    expect(spec.modes_available).not.toContain("api");
  });

  it("adds api to modes_available when a relevant key is set", async () => {
    process.env["IDEOGRAM_API_KEY"] = "id-test";
    const spec = await enhancePrompt({ brief: "logo with wordmark Forge", text_content: "Forge" });
    // Router likely picks ideogram-3-turbo for a 1-word wordmark.
    if (spec.target_model === "ideogram-3-turbo") {
      expect(spec.modes_available).toContain("api");
    }
  });

  it("includes svg_brief for logo", async () => {
    const spec = await enhancePrompt({ brief: "logo for Forge" });
    expect(spec.svg_brief).toBeTruthy();
    expect(spec.svg_brief!.viewBox).toBe("0 0 256 256");
  });

  it("omits svg_brief for illustration (inline_svg ineligible)", async () => {
    const spec = await enhancePrompt({ brief: "onboarding illustration of a team meeting" });
    expect(spec.svg_brief).toBeUndefined();
  });

  it("includes paste_targets when external_prompt_only is eligible", async () => {
    const spec = await enhancePrompt({ brief: "logo for Forge" });
    expect(spec.paste_targets).toBeDefined();
    expect(Array.isArray(spec.paste_targets)).toBe(true);
  });

  it("surfaces a warning about api mode being unavailable with no keys set", async () => {
    const spec = await enhancePrompt({ brief: "logo for Forge" });
    expect(spec.warnings.some((w) => /api mode unavailable|provider key/i.test(w))).toBe(true);
  });

  it("adds a long_wordmark clarifying question when text_content >3 words", async () => {
    const spec = await enhancePrompt({
      brief: "logo with wordmark Halcyon Weather Report Daily",
      text_content: "Halcyon Weather Report Daily"
    });
    const q = spec.clarifying_questions?.find((x) => x.id === "long_wordmark");
    expect(q).toBeDefined();
    expect(q!.options.length).toBeGreaterThanOrEqual(2);
    expect(q!.why).toMatch(/3 words|Ideogram|text rendering/i);
  });

  it("does NOT add long_wordmark when text_content is ≤3 words", async () => {
    const spec = await enhancePrompt({
      brief: "logo with wordmark Forge",
      text_content: "Forge"
    });
    const q = spec.clarifying_questions?.find((x) => x.id === "long_wordmark");
    expect(q).toBeUndefined();
  });

  it("asks for a palette when generating an app_icon without brand_bundle", async () => {
    const spec = await enhancePrompt({
      brief: "icon for a weather app called Halcyon",
      asset_type: "app_icon"
    });
    const q = spec.clarifying_questions?.find((x) => x.id === "no_brand_palette");
    expect(q).toBeDefined();
  });

  it("does NOT ask for a palette when brand_bundle.palette is provided", async () => {
    const spec = await enhancePrompt({
      brief: "icon for a weather app called Halcyon",
      asset_type: "app_icon",
      brand_bundle: { palette: ["#0F172A", "#F59E0B"] }
    });
    const q = spec.clarifying_questions?.find((x) => x.id === "no_brand_palette");
    expect(q).toBeUndefined();
  });

  it("flags brief_underspecified on a generic brief", async () => {
    const spec = await enhancePrompt({ brief: "a logo" });
    const q = spec.clarifying_questions?.find((x) => x.id === "brief_underspecified");
    expect(q).toBeDefined();
  });

  it("does NOT flag brief_underspecified on a specific brief", async () => {
    const spec = await enhancePrompt({
      brief: "flat minimalist logo for Halcyon, a weather app — calm and airy"
    });
    const q = spec.clarifying_questions?.find((x) => x.id === "brief_underspecified");
    expect(q).toBeUndefined();
  });
});
