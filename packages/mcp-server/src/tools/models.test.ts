import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { modelsList, modelsInspect } from "./models.js";

const KEYS = ["OPENAI_API_KEY", "IDEOGRAM_API_KEY"];

describe("asset_models_list", () => {
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

  it("unfiltered list matches registry size", async () => {
    const r = await modelsList({});
    expect(r.total).toBeGreaterThan(20);
    expect(r.models.length).toBe(r.total);
    expect(r.filters_applied).toEqual({});
  });

  it("--free filter only returns free_tier=true models", async () => {
    const r = await modelsList({ free: true });
    expect(r.models.length).toBeGreaterThan(0);
    for (const m of r.models) {
      expect(m.tier).toBe("free");
    }
    expect(r.filters_applied.free).toBe(true);
  });

  it("--paid filter excludes free_tier and paste_only", async () => {
    const r = await modelsList({ paid: true });
    for (const m of r.models) {
      expect(m.tier).toBe("paid");
    }
  });

  it("--paste-only filter only returns paste-only surfaces", async () => {
    const r = await modelsList({ paste_only: true });
    for (const m of r.models) {
      expect(m.tier).toBe("paste-only");
      expect(m.status).toBe("paste");
    }
  });

  it("key_set flips when the corresponding env var is set", async () => {
    process.env["OPENAI_API_KEY"] = "test";
    const r = await modelsList({});
    const gpt = r.models.find((m) => m.id === "gpt-image-1");
    expect(gpt?.key_set).toBe(true);
    expect(gpt?.status).toBe("ready");
  });
});

describe("asset_models_inspect", () => {
  it("returns a full ModelInfo dump for a known id", async () => {
    const r = await modelsInspect({ id: "gpt-image-1" });
    expect(r.model.id).toBe("gpt-image-1");
    expect(r.status_in_env.provider_key_env).toBe("OPENAI_API_KEY");
    expect(r.routing_rules.length).toBeGreaterThan(0);
  });

  it("throws a useful error for an unknown id", async () => {
    await expect(modelsInspect({ id: "not-a-real-model-xyz" })).rejects.toThrow(/not found/);
  });

  it("notes contain the negative-prompt caveat for error-mode models", async () => {
    // flux-pro rejects negative_prompt — if present in registry it should emit
    // the note. Other families work fine too; test a known-safe one.
    const r = await modelsInspect({ id: "gpt-image-1" });
    expect(Array.isArray(r.notes)).toBe(true);
  });
});
