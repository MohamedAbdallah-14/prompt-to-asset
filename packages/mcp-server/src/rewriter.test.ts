import { describe, it, expect } from "vitest";
import { rewrite } from "./rewriter.js";

describe("rewrite", () => {
  it("produces a non-empty prompt for a bare logo brief", () => {
    const out = rewrite({
      brief: "logo for a dev tools startup called Forge",
      asset_type: "logo",
      target_model: "gpt-image-1",
      transparency_required: true,
      vector_required: false
    });
    expect(out.prompt).toBeTruthy();
    expect(out.prompt.length).toBeGreaterThan(20);
  });

  it("drops wordmark text that exceeds the model's text_ceiling_chars", () => {
    // ideogram-3-turbo has text_ceiling_chars=40 (verified Apr 2026, not the
    // older 80-char claim). Use a string above the ceiling.
    const longText = "This Wordmark Is Definitely Longer Than The Ideogram Turbo Ceiling";
    const out = rewrite({
      brief: "logo",
      asset_type: "logo",
      target_model: "ideogram-3-turbo",
      text_content: longText,
      transparency_required: true,
      vector_required: false
    });
    expect(out.prompt.toLowerCase()).toContain("no text");
    expect(out.warnings.some((w) => /text_ceiling_chars|exceeds/i.test(w))).toBe(true);
  });

  it("keeps a 1–3 word wordmark in quoted form", () => {
    const out = rewrite({
      brief: "logo for Forge",
      asset_type: "logo",
      target_model: "ideogram-3-turbo",
      text_content: "Forge",
      transparency_required: true,
      vector_required: false
    });
    expect(out.prompt).toContain('"Forge"');
  });

  it("asks for transparent background when model supports native RGBA", () => {
    const out = rewrite({
      brief: "logo",
      asset_type: "logo",
      target_model: "gpt-image-1",
      transparency_required: true,
      vector_required: false
    });
    // gpt-image-1 is native-rgba: expect a transparent-background clause,
    // not a white-background one.
    expect(out.prompt.toLowerCase()).toContain("transparent");
  });

  it("warns and pads when Imagen/Gemini prompts are under 30 words", () => {
    const out = rewrite({
      brief: "logo",
      asset_type: "logo",
      target_model: "imagen-4",
      transparency_required: false,
      vector_required: false
    });
    // Either the rewriter lands above 30 words naturally, or it padded and warned.
    const words = out.prompt.split(/\s+/).filter(Boolean).length;
    if (words < 30) {
      throw new Error(`Imagen prompt did not meet 30-word floor: ${words} words`);
    }
    // If padding fired, one of the warnings should reference the rewriter.
    if (out.warnings.length > 0) {
      expect(out.warnings.some((w) => /rewriter|padded|30/i.test(w))).toBe(true);
    }
  });

  it("emits a tag-salad prompt for SD-family models", () => {
    const out = rewrite({
      brief: "a wise owl",
      asset_type: "illustration",
      target_model: "sdxl",
      transparency_required: false,
      vector_required: false
    });
    // A tag-salad prompt is comma-separated and lowercased — it will
    // include the "masterpiece" / "highly detailed" boilerplate anchors.
    expect(out.prompt).toMatch(/masterpiece/);
    expect(out.prompt).toMatch(/highly detailed/);
    expect(out.negative_prompt).toBeTruthy();
  });
});
