import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveGenerateTarget, isPasteOnlyModel } from "../providers/index.js";

/**
 * These tests verify the soft-fallback decision logic that lives in
 * `resolveGenerateTarget`. They use Pollinations + Stable Horde as the
 * api-available "real" providers because those are zero-key (env-gated
 * only), which avoids needing to mutate `CONFIG` — CONFIG snapshots env
 * at module load, which is intentional for paid-key handling.
 */
describe("resolveGenerateTarget — paste-only soft fallback", () => {
  const envBackup: Record<string, string | undefined> = {};
  const keysToSnapshot = ["POLLINATIONS_DISABLED", "HORDE_DISABLED"];

  beforeEach(() => {
    for (const k of keysToSnapshot) envBackup[k] = process.env[k];
    for (const k of keysToSnapshot) delete process.env[k];
  });

  afterEach(() => {
    for (const k of keysToSnapshot) {
      if (envBackup[k] === undefined) delete process.env[k];
      else process.env[k] = envBackup[k];
    }
  });

  it("reports midjourney as paste-only", () => {
    expect(isPasteOnlyModel("midjourney-v6")).toBe(true);
    expect(isPasteOnlyModel("midjourney-v7")).toBe(true);
  });

  it("reports firefly-3 as paste-only", () => {
    expect(isPasteOnlyModel("firefly-3")).toBe(true);
  });

  it("does not report gpt-image-1 as paste-only", () => {
    expect(isPasteOnlyModel("gpt-image-1")).toBe(false);
  });

  it("substitutes primary=midjourney with zero-key fallback", () => {
    const r = resolveGenerateTarget("midjourney-v6", ["pollinations-flux"]);
    expect(r).not.toBeNull();
    expect(r!.model).toBe("pollinations-flux");
    expect(r!.substituted).toBe(true);
    expect(r!.note).toContain("paste-only");
  });

  it("returns null when the whole chain is paste-only (soft-fallback trigger)", () => {
    const r = resolveGenerateTarget("midjourney-v6", ["firefly-3", "krea-image-1"]);
    expect(r).toBeNull();
  });

  it("does not substitute when primary is already zero-key and available", () => {
    const r = resolveGenerateTarget("pollinations-flux", ["horde-sdxl"]);
    expect(r).not.toBeNull();
    expect(r!.model).toBe("pollinations-flux");
    expect(r!.substituted).toBe(false);
    expect(r!.note).toBeUndefined();
  });

  it("skips a disabled zero-key provider and walks further down the chain", () => {
    process.env["POLLINATIONS_DISABLED"] = "1";
    const r = resolveGenerateTarget("midjourney-v6", ["pollinations-flux", "horde-sdxl"]);
    expect(r).not.toBeNull();
    expect(r!.model).toBe("horde-sdxl");
    expect(r!.substituted).toBe(true);
  });
});
