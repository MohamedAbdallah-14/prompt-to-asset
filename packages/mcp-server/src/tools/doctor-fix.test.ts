import { describe, it, expect } from "vitest";
import { autoFix } from "./doctor-fix.js";

describe("autoFix (doctor --fix)", () => {
  it("dry-run never executes installers and reports a plan", async () => {
    const r = await autoFix({ dry_run: true });
    expect(r.dry_run).toBe(true);
    // Every planned step must be un-run under dry-run.
    for (const s of r.steps) {
      expect(s.ran).toBe(false);
      expect(s.success).toBeUndefined();
    }
    // Platform shape sanity.
    expect(["darwin", "linux", "win32", "freebsd", "openbsd", "sunos", "aix"]).toContain(
      r.platform
    );
    expect(typeof r.arch).toBe("string");
  });

  it("returns ok=true when nothing is missing on this host", async () => {
    // The dev host already has vtracer/potrace/sharp etc. installed (that's how
    // the rest of the suite ships green). If this ever flakes, the host is what
    // changed — not this test.
    const r = await autoFix({ dry_run: true });
    if (r.still_missing.length === 0) {
      expect(r.ok).toBe(true);
      expect(r.steps.length).toBe(0);
    } else {
      // Partial environment — at least one step or hint must address each gap.
      const addressed = new Set<string>();
      for (const s of r.steps) addressed.add(s.id);
      const hintJoined = r.manual_hints.join(" ");
      for (const m of r.still_missing) {
        if (m === "vtracer" || m === "potrace") {
          expect(addressed.has(m) || hintJoined.includes(m)).toBe(true);
        }
      }
    }
  });

  it("skip option removes a step from the plan", async () => {
    const r = await autoFix({ dry_run: true, skip: ["vtracer", "potrace"] });
    expect(r.steps.every((s) => s.id !== "vtracer" && s.id !== "potrace")).toBe(true);
  });
});
