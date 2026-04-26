import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { capabilities } from "./capabilities.js";

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
  "FREEPIK_API_KEY",
  "PIXAZO_API_KEY",
  "PIXAZO_SUBSCRIPTION_KEY",
  "NVIDIA_API_KEY",
  "NIM_API_KEY",
  "HF_TOKEN",
  "HUGGINGFACE_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY",
  "POLLINATIONS_DISABLED",
  "HORDE_DISABLED",
  "PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL"
];

describe("asset_capabilities", () => {
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

  it("inline_svg and external_prompt_only are always available", async () => {
    const caps = await capabilities({});
    expect(caps.inline_svg.available).toBe(true);
    expect(caps.external_prompt_only.available).toBe(true);
  });

  it("api.available is true even with no paid keys because zero-key routes (Pollinations, Horde) are on by default", async () => {
    const caps = await capabilities({});
    expect(caps.api.available).toBe(true);
    expect(caps.free_api.available).toBe(true);
    // There's still a list of unconfigured paid keys.
    expect(caps.api.unconfigured_env_vars.length).toBeGreaterThan(0);
  });

  it("api.available flips to true once any one paid key is set", async () => {
    process.env["IDEOGRAM_API_KEY"] = "id-test";
    const caps = await capabilities({});
    expect(caps.api.available).toBe(true);
    expect(caps.api.providers.ideogram).toBe(true);
  });

  it("api.available becomes false if every free route is disabled AND no paid keys set", async () => {
    process.env["POLLINATIONS_DISABLED"] = "1";
    process.env["HORDE_DISABLED"] = "1";
    const caps = await capabilities({});
    expect(caps.api.available).toBe(false);
    expect(caps.free_api.available).toBe(false);
  });

  it("hints nudge the caller toward zero-key and free-tier routes", async () => {
    const caps = await capabilities({});
    expect(caps.hints.some((h) => /inline_svg/i.test(h))).toBe(true);
    expect(caps.hints.some((h) => /external_prompt_only/i.test(h))).toBe(true);
    expect(caps.hints.some((h) => /pollinations|free.*api|zero-key/i.test(h))).toBe(true);
  });

  it("free_api.routes enumerates zero-key + free-tier + trial options", async () => {
    const caps = await capabilities({});
    const ids = caps.free_api.routes.map((r) => r.id);
    for (const id of [
      "pollinations",
      "stable-horde",
      "huggingface",
      "nvidia-nim",
      "google-ai-studio",
      "cloudflare",
      "local-comfyui",
      "ideogram-free-weekly",
      "leonardo-free-daily",
      "replicate-trial"
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("does not advertise Imagen 4 as a free programmatic API route", async () => {
    const caps = await capabilities({});
    const joined = [
      caps.free_api.notes,
      ...caps.hints,
      ...caps.free_api.routes.map((r) => r.how + r.catch)
    ].join("\n");
    expect(joined).not.toMatch(/Imagen 4 via GEMINI_API_KEY.*25 RPD/i);
    const studio = caps.free_api.routes.find((r) => r.id === "google-ai-studio");
    expect(studio?.how).toMatch(/paste-only/i);
    expect(studio?.catch).toMatch(/no free API tier/i);
  });

  it("treats GEMINI_API_KEY as paid image API, not a free programmatic route", async () => {
    process.env["POLLINATIONS_DISABLED"] = "1";
    process.env["HORDE_DISABLED"] = "1";
    process.env["GEMINI_API_KEY"] = "gemini-test";
    const caps = await capabilities({});
    expect(caps.api.available).toBe(true);
    expect(caps.api.providers.google).toBe(true);
    expect(caps.free_api.available).toBe(false);
    const joined = [
      caps.free_api.notes,
      ...caps.hints,
      ...caps.free_api.routes.map((r) => r.how + r.catch)
    ].join("\n");
    expect(joined).not.toMatch(/Imagen 4 via GEMINI_API_KEY.*free/i);
    expect(joined).toMatch(
      /Google image APIs.*paid-only|Programmatic image-gen via GEMINI_API_KEY requires billing/i
    );
  });

  it("providers_registered mirrors the model registry and reports key_set", async () => {
    const caps = await capabilities({});
    const gptImage = caps.providers_registered.find((p) => p.id === "gpt-image-1");
    expect(gptImage).toBeTruthy();
    expect(gptImage!.provider_key_env).toBe("OPENAI_API_KEY");
    expect(gptImage!.key_set).toBe(false);
    const nim = caps.providers_registered.find((p) => p.id === "nim-flux-1-dev");
    expect(nim).toBeTruthy();
    expect(nim!.provider_key_env).toBe("NVIDIA_API_KEY");
    expect(nim!.provider_key_env_aliases).toEqual(["NIM_API_KEY"]);
  });

  it("narrows modes_by_asset_type when asset_type is passed", async () => {
    const caps = await capabilities({ asset_type: "logo" });
    expect(Object.keys(caps.modes_by_asset_type)).toEqual(["logo"]);
  });

  it("providers_registered flags paste_only and free_tier correctly", async () => {
    const caps = await capabilities({});
    const mj = caps.providers_registered.find((p) => p.id === "midjourney-v7");
    expect(mj?.paste_only).toBe(true);
    const poll = caps.providers_registered.find((p) => p.id.startsWith("pollinations-"));
    // pollinations models may not be in model-registry.json; that's fine — we
    // just make sure the flag exists on a representative free-tier entry.
    if (poll) expect(poll.free_tier).toBe(true);
    const gpt = caps.providers_registered.find((p) => p.id === "gpt-image-1");
    expect(gpt?.paste_only).toBe(false);
    expect(gpt?.free_tier).toBe(false);
  });

  it("eligible_asset_types for inline_svg excludes illustration / hero / splash / og_image", async () => {
    const caps = await capabilities({});
    const eligible = caps.inline_svg.eligible_asset_types;
    expect(eligible).not.toContain("illustration");
    expect(eligible).not.toContain("hero");
    expect(eligible).not.toContain("og_image");
    expect(eligible).not.toContain("splash_screen");
  });
});
