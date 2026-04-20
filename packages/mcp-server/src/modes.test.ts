import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MODES_BY_ASSET_TYPE,
  detectApiAvailability,
  providerKeyForModel,
  isApiAvailableFor,
  anyApiAvailable,
  availableModes,
  selectMode
} from "./modes.js";

const KEYS = [
  "OPENAI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
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
  "POLLINATIONS_DISABLED",
  "HORDE_DISABLED",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY"
];

describe("MODES_BY_ASSET_TYPE", () => {
  it("always includes external_prompt_only for every asset type", () => {
    for (const t of Object.keys(MODES_BY_ASSET_TYPE) as Array<keyof typeof MODES_BY_ASSET_TYPE>) {
      expect(MODES_BY_ASSET_TYPE[t]).toContain("external_prompt_only");
    }
  });

  it("always includes api for every asset type (api is a fallback that always works)", () => {
    for (const t of Object.keys(MODES_BY_ASSET_TYPE) as Array<keyof typeof MODES_BY_ASSET_TYPE>) {
      expect(MODES_BY_ASSET_TYPE[t]).toContain("api");
    }
  });

  it("offers inline_svg for simple flat marks", () => {
    expect(MODES_BY_ASSET_TYPE["logo"]).toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["favicon"]).toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["icon_pack"]).toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["sticker"]).toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["transparent_mark"]).toContain("inline_svg");
  });

  it("refuses inline_svg for og_image, illustration, hero, splash (path budget / layout too hard)", () => {
    expect(MODES_BY_ASSET_TYPE["og_image"]).not.toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["illustration"]).not.toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["hero"]).not.toContain("inline_svg");
    expect(MODES_BY_ASSET_TYPE["splash_screen"]).not.toContain("inline_svg");
  });
});

describe("providerKeyForModel", () => {
  it.each([
    ["gpt-image-1", "openai"],
    ["gpt-image-1.5", "openai"],
    ["dall-e-3", "openai"],
    ["imagen-4", "google"],
    ["gemini-3-flash-image", "google"],
    ["ideogram-3-turbo", "ideogram"],
    ["recraft-v3", "recraft"],
    ["flux-pro", "flux"],
    ["flux-2", "flux"]
  ])("routes %s → %s", (model, expected) => {
    expect(providerKeyForModel(model)).toBe(expected);
  });

  it.each([
    ["sdxl", "stability"],
    ["sd-1.5", "stability"],
    ["sd3-large", "stability"],
    ["playground-v3", "stability"],
    ["leonardo-phoenix", "leonardo"],
    ["fal-flux-pro", "fal"],
    ["hf-sdxl", "huggingface"],
    ["hf-flux-schnell", "huggingface"],
    ["pollinations-flux", "pollinations"],
    ["horde-sdxl", "horde"],
    ["cf-flux-1-schnell", "cloudflare"],
    ["cf-sdxl-lightning", "cloudflare"],
    ["replicate-flux-1.1-pro", "replicate"],
    ["replicate-recraft-v3", "replicate"]
  ])("routes %s → %s", (model, expected) => {
    expect(providerKeyForModel(model)).toBe(expected);
  });

  it("returns null for paste-only models (midjourney, firefly, krea)", () => {
    expect(providerKeyForModel("midjourney-v7")).toBeNull();
    expect(providerKeyForModel("firefly-3")).toBeNull();
    expect(providerKeyForModel("krea-image-1")).toBeNull();
  });
});

describe("availability + selectMode", () => {
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

  it("detectApiAvailability returns all paid keys false with no keys, but zero-key routes stay true", () => {
    const a = detectApiAvailability();
    expect(a).toEqual({
      openai: false,
      google: false,
      ideogram: false,
      recraft: false,
      flux: false,
      stability: false,
      leonardo: false,
      fal: false,
      huggingface: false,
      // Pollinations + Stable Horde are zero-key — on by default.
      pollinations: true,
      horde: true,
      // Cloudflare needs both CLOUDFLARE_API_TOKEN AND CLOUDFLARE_ACCOUNT_ID.
      cloudflare: false,
      replicate: false,
      // User-owned ComfyUI endpoint — opt-in via PROMPT_TO_BUNDLE_MODAL_COMFYUI_URL.
      comfyui: false
    });
  });

  it("isApiAvailableFor reflects env", () => {
    process.env["OPENAI_API_KEY"] = "sk-test";
    const a = detectApiAvailability();
    expect(isApiAvailableFor("gpt-image-1", a)).toBe(true);
    expect(isApiAvailableFor("recraft-v3", a)).toBe(false);
  });

  it("anyApiAvailable checks both primary and fallback", () => {
    process.env["IDEOGRAM_API_KEY"] = "id-test";
    const a = detectApiAvailability();
    expect(anyApiAvailable("recraft-v3", ["ideogram-3-turbo"], a)).toBe(true);
    expect(anyApiAvailable("recraft-v3", ["flux-pro"], a)).toBe(false);
  });

  it("availableModes drops 'api' when no keys set", () => {
    const a = detectApiAvailability();
    const modes = availableModes("logo", "recraft-v3", ["gpt-image-1"], a);
    expect(modes).toContain("inline_svg");
    expect(modes).toContain("external_prompt_only");
    expect(modes).not.toContain("api");
  });

  it("selectMode auto picks inline_svg when eligible", () => {
    const a = detectApiAvailability();
    const { mode } = selectMode("auto", {
      asset_type: "logo",
      primary_model: "recraft-v3",
      fallback_models: [],
      availability: a
    });
    expect(mode).toBe("inline_svg");
  });

  it("selectMode auto falls back to external_prompt_only when neither inline_svg nor api fit", () => {
    const a = detectApiAvailability();
    const { mode } = selectMode("auto", {
      asset_type: "illustration",
      primary_model: "flux-pro",
      fallback_models: [],
      availability: a
    });
    expect(mode).toBe("external_prompt_only");
  });

  it("selectMode auto picks api when inline_svg not eligible but a key is set", () => {
    process.env["BFL_API_KEY"] = "bfl-test";
    const a = detectApiAvailability();
    const { mode } = selectMode("auto", {
      asset_type: "hero",
      primary_model: "flux-pro",
      fallback_models: [],
      availability: a
    });
    expect(mode).toBe("api");
  });

  it("selectMode refuses a mode that is not valid for the asset type", () => {
    const a = detectApiAvailability();
    expect(() =>
      selectMode("inline_svg", {
        asset_type: "hero",
        primary_model: "flux-pro",
        fallback_models: [],
        availability: a
      })
    ).toThrowError(/not valid for asset_type=hero/);
  });

  it("selectMode refuses api when no key is configured and reports which env vars to set", () => {
    const a = detectApiAvailability();
    expect(() =>
      selectMode("api", {
        asset_type: "logo",
        primary_model: "gpt-image-1",
        fallback_models: ["ideogram-3-turbo"],
        availability: a
      })
    ).toThrowError(/OPENAI_API_KEY|IDEOGRAM_API_KEY|provider|key/);
  });
});
