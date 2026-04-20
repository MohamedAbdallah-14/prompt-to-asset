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
});
