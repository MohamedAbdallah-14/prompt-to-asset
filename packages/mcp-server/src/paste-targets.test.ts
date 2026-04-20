import { describe, it, expect } from "vitest";
import { resolvePasteTargets, allPasteTargets } from "./paste-targets.js";

describe("resolvePasteTargets", () => {
  it("returns targets for a concrete model id", () => {
    const r = resolvePasteTargets("ideogram-3-turbo");
    expect(r.primary_targets.length).toBeGreaterThan(0);
    expect(r.primary_targets.some((t) => /ideogram/i.test(t.name))).toBe(true);
  });

  it("returns targets for strategy ids like llm_author_svg", () => {
    const r = resolvePasteTargets("llm_author_svg");
    expect(r.primary_targets.length).toBeGreaterThan(0);
    expect(r.primary_targets[0]?.url).toBe("inline");
  });

  it("dedupes fallback targets against primary", () => {
    const r = resolvePasteTargets("gpt-image-1", ["gpt-image-1.5"]);
    const primaryUrls = r.primary_targets.map((t) => t.url);
    for (const t of r.fallback_targets) {
      expect(primaryUrls).not.toContain(t.url);
    }
  });

  it("emits a warning when no targets are registered for a model", () => {
    const r = resolvePasteTargets("definitely-not-a-real-model");
    expect(r.primary_targets.length).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("every target has name + url + notes", () => {
    const all = allPasteTargets();
    for (const [model, targets] of Object.entries(all)) {
      for (const t of targets) {
        expect(t.name, `target.name for ${model}`).toBeTruthy();
        expect(t.url, `target.url for ${model}`).toBeTruthy();
        expect(t.notes, `target.notes for ${model}`).toBeTruthy();
      }
    }
  });
});
