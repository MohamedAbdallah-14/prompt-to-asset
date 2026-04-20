import { describe, it, expect } from "vitest";
import { analyseValidation, deriveRepair, repairIsNoop } from "./repair.js";
import type { AssetSpec, ValidationResult } from "../types.js";

function mkValidation(tier0: Record<string, boolean | number | string>): ValidationResult {
  return { pass: false, tier0, warnings: [] };
}

const baseSpec: AssetSpec = {
  asset_type: "logo",
  brief: "logo for Forge",
  rewritten_prompt: "flat vector logo mark, pure white bg",
  target_model: "imagen-4",
  fallback_models: ["gpt-image-1"],
  params: {},
  postprocess: [],
  safe_zone: null,
  dimensions: { width: 1024, height: 1024 },
  transparency_required: true,
  vector_required: true,
  text_content: null,
  modes_available: ["inline_svg", "api"],
  warnings: []
};

describe("analyseValidation", () => {
  it("detects alpha failure when transparency required + no alpha", () => {
    const r = analyseValidation(
      mkValidation({ transparency_required: true, alpha_present: false })
    );
    expect(r.alpha_failed).toBe(true);
  });

  it("detects checkerboard signature", () => {
    const r = analyseValidation(mkValidation({ checkerboard_detected: true }));
    expect(r.checkerboard_detected).toBe(true);
  });

  it("detects palette drift over threshold", () => {
    expect(analyseValidation(mkValidation({ palette_max_delta_e_2000: 15 })).palette_drift).toBe(
      true
    );
    expect(analyseValidation(mkValidation({ palette_max_delta_e_2000: 3 })).palette_drift).toBe(
      false
    );
  });

  it("detects text failure past Levenshtein 1", () => {
    expect(analyseValidation(mkValidation({ ocr_levenshtein: 4 })).text_fail).toBe(true);
    expect(analyseValidation(mkValidation({ ocr_levenshtein: 0 })).text_fail).toBe(false);
  });
});

describe("deriveRepair", () => {
  it("re-routes away from Imagen on alpha fail", () => {
    const plan = deriveRepair({
      spec: baseSpec,
      validation: mkValidation({ transparency_required: true, alpha_present: false }),
      tried_models: new Set()
    });
    expect(plan).not.toBeNull();
    expect(plan!.new_target_model).toBe("gpt-image-1");
    expect(plan!.reason).toMatch(/alpha|RGBA/i);
  });

  it("skips models we already tried", () => {
    const plan = deriveRepair({
      spec: baseSpec,
      validation: mkValidation({ checkerboard_detected: true }),
      tried_models: new Set(["gpt-image-1"])
    });
    expect(plan!.new_target_model).toBe("ideogram-3-turbo");
  });

  it("pins hex when palette drifts and a brand bundle is present", () => {
    const plan = deriveRepair({
      spec: baseSpec,
      validation: mkValidation({ palette_max_delta_e_2000: 20 }),
      tried_models: new Set(),
      brand_bundle: { palette: ["#0F172A", "#F59E0B"] }
    });
    expect(plan!.prompt_additions.join(" ")).toContain("#0F172A");
    expect(plan!.prompt_additions.join(" ")).toContain("#F59E0B");
  });

  it("drops text on OCR failure", () => {
    const plan = deriveRepair({
      spec: baseSpec,
      validation: mkValidation({ ocr_levenshtein: 4 }),
      tried_models: new Set()
    });
    expect(plan!.drop_text).toBe(true);
  });

  it("returns null when nothing is repairable", () => {
    const plan = deriveRepair({
      spec: baseSpec,
      validation: mkValidation({}),
      tried_models: new Set()
    });
    expect(plan).toBeNull();
  });

  it("produces the same diagnostic_key for identical failures (convergence hint)", () => {
    const v = mkValidation({ transparency_required: true, alpha_present: false });
    const a = deriveRepair({ spec: baseSpec, validation: v, tried_models: new Set() });
    const b = deriveRepair({ spec: baseSpec, validation: v, tried_models: new Set() });
    expect(a!.diagnostic_key).toBe(b!.diagnostic_key);
  });

  it("repairIsNoop is true for an empty repair plan", () => {
    expect(
      repairIsNoop({
        reason: "",
        new_target_model: null,
        prompt_additions: [],
        drop_text: false,
        diagnostic_key: ""
      })
    ).toBe(true);
  });
});
