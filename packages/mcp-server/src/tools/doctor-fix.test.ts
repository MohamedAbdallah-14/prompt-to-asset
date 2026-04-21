import { describe, it, expect } from "vitest";
import { autoFix } from "./doctor-fix.js";

describe("tools/doctor-fix", () => {
  it("returns a dry-run report with steps/manual_hints without executing anything", async () => {
    const report = await autoFix({ dry_run: true });
    expect(report).toBeDefined();
    expect(report.dry_run).toBe(true);
    expect(Array.isArray(report.steps)).toBe(true);
    expect(Array.isArray(report.manual_hints)).toBe(true);
    expect(Array.isArray(report.still_missing)).toBe(true);
    expect(typeof report.ok).toBe("boolean");
    expect(report.platform).toBe(process.platform);
    expect(report.arch).toBe(process.arch);

    // In a dry-run, no step should have been executed.
    for (const step of report.steps) {
      expect(step.ran).toBe(false);
      expect(step.id).toBeTruthy();
      expect(step.command).toBeTruthy();
      expect(Array.isArray(step.args)).toBe(true);
    }
  });

  it("honors the skip list (skipping vtracer + potrace skips their auto-install steps)", async () => {
    const report = await autoFix({ dry_run: true, skip: ["vtracer", "potrace"] });
    const ids = report.steps.map((s) => s.id);
    expect(ids).not.toContain("vtracer");
    expect(ids).not.toContain("potrace");
  });

  it("returns steps that look well-formed", async () => {
    const report = await autoFix({ dry_run: true });
    for (const s of report.steps) {
      expect(typeof s.reason).toBe("string");
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });
});
