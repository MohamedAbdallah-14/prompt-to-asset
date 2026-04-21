import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { doctor } from "./doctor.js";

const KEYS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "IDEOGRAM_API_KEY",
  "RECRAFT_API_KEY",
  "BFL_API_KEY",
  "TOGETHER_API_KEY",
  "STABILITY_API_KEY",
  "LEONARDO_API_KEY",
  "FAL_API_KEY",
  "FAL_KEY",
  "HF_TOKEN",
  "HUGGINGFACE_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY"
];

describe("asset_doctor", () => {
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

  it("reports runtime + native deps + all four mode flags", async () => {
    const r = await doctor({});
    expect(r.runtime.node).toBe(process.version);
    expect(r.runtime.platform).toBe(process.platform);
    expect(r.native_dependencies).toHaveProperty("sharp");
    expect(r.native_dependencies).toHaveProperty("vtracer");
    expect(r.native_dependencies).toHaveProperty("svgo");
    expect(r.modes_available.inline_svg).toBe(true);
    expect(r.modes_available.external_prompt_only).toBe(true);
    expect(typeof r.modes_available.api_free).toBe("boolean");
    expect(typeof r.modes_available.api_paid).toBe("boolean");
  });

  it("free-tier routes are ranked best-first (cloudflare first, stable-horde last)", async () => {
    const r = await doctor({});
    expect(r.free_tier_routes[0]?.id).toBe("cloudflare");
    expect(r.free_tier_routes.at(-1)?.id).toBe("stable-horde");
    for (let i = 0; i < r.free_tier_routes.length; i++) {
      expect(r.free_tier_routes[i]?.rank).toBe(i + 1);
    }
  });

  it("cloudflare route flips to live when CLOUDFLARE_API_TOKEN is set", async () => {
    process.env["CLOUDFLARE_API_TOKEN"] = "test-token";
    process.env["CLOUDFLARE_ACCOUNT_ID"] = "test-acct";
    const r = await doctor({});
    const cf = r.free_tier_routes.find((x) => x.id === "cloudflare");
    expect(cf?.live).toBe(true);
    expect(r.modes_available.api_free).toBe(true);
  });

  it("api_paid is true when any paid key is set", async () => {
    process.env["IDEOGRAM_API_KEY"] = "test";
    const r = await doctor({});
    expect(r.modes_available.api_paid).toBe(true);
    expect(r.paid_providers.find((p) => p.id === "ideogram")?.key_set).toBe(true);
  });

  it("check_data=true adds a data_integrity block", async () => {
    const r = await doctor({ check_data: true });
    expect(r.data_integrity).toBeTruthy();
    expect(r.data_integrity).toHaveProperty("ok");
    expect(r.data_integrity).toHaveProperty("stats");
  });

  it("what_to_try_next suggests CLOUDFLARE when nothing is configured", async () => {
    process.env["POLLINATIONS_DISABLED"] = "1";
    process.env["HORDE_DISABLED"] = "1";
    const r = await doctor({});
    expect(r.what_to_try_next.some((s) => /CLOUDFLARE_API_TOKEN/.test(s))).toBe(true);
    delete process.env["POLLINATIONS_DISABLED"];
    delete process.env["HORDE_DISABLED"];
  });

  it("paste_only_providers always lists midjourney/adobe/krea", async () => {
    const r = await doctor({});
    const ids = r.paste_only_providers.map((p) => p.id);
    expect(ids).toContain("midjourney");
    expect(ids).toContain("adobe");
    expect(ids).toContain("krea");
  });
});
