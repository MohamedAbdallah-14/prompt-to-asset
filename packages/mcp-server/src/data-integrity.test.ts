import { describe, it, expect } from "vitest";
import { checkDataIntegrity } from "./data-integrity.js";

describe("data integrity (model-registry ↔ routing-table)", () => {
  const report = checkDataIntegrity();

  it("has zero dangling routing-rule references", () => {
    if (!report.ok) {
      // Fail with the full list so the breakage is obvious in CI.
      throw new Error(
        `${report.errors.length} broken references:\n` +
          report.errors.map((e) => `  - ${e}`).join("\n")
      );
    }
    expect(report.ok).toBe(true);
  });

  it("registry has at least one model", () => {
    expect(report.stats.models_in_registry).toBeGreaterThan(0);
  });

  it("routing table has at least one rule", () => {
    expect(report.stats.routing_rules).toBeGreaterThan(0);
  });
});
