import { describe, it, expect } from "vitest";
import { rewrite } from "../rewriter.js";
import { buildSvgBrief } from "../svg-briefs.js";
import { modelsList, modelsInspect } from "./models.js";
import { capabilities } from "./capabilities.js";
import { doctor } from "./doctor.js";
import type { AssetType, BrandBundle } from "../types.js";

// ── rewriter ──────────────────────────────────────────────────────────────────

describe("rewriter.rewrite", () => {
  const bundle: BrandBundle = {
    palette: ["#0077cc", "#ffffff"],
    style_refs: [],
    do_not: ["no drop shadows", "no gradients"],
    sref_code: "--sref 123456"
  };

  it("prose dialect (gpt-image-1) produces structured prose", () => {
    const r = rewrite({
      brief: "a modern minimal mountain logo",
      asset_type: "logo",
      target_model: "gpt-image-1",
      brand_bundle: bundle,
      text_content: "ACME",
      transparency_required: true,
      vector_required: true
    });
    expect(r.prompt).toMatch(/logo mark/);
    expect(r.prompt).toMatch(/0077cc/i);
    expect(r.negative_prompt).toBeUndefined();
  });

  it("tag-salad dialect (sdxl-1.0) uses BREAK and negative_prompt", () => {
    const r = rewrite({
      brief: "a fintech illustration",
      asset_type: "illustration",
      target_model: "sdxl",
      brand_bundle: bundle,
      transparency_required: false,
      vector_required: false
    });
    expect(r.prompt).toMatch(/BREAK/);
    expect(r.negative_prompt).toBeTruthy();
    expect(r.negative_prompt).toMatch(/watermark/);
  });

  it("prose+quoted (ideogram-3) quotes wordmark", () => {
    const r = rewrite({
      brief: "a minimalist logo",
      asset_type: "logo",
      target_model: "ideogram-3",
      text_content: "HI",
      transparency_required: true,
      vector_required: true
    });
    expect(r.prompt).toMatch(/"HI"/);
  });

  it("prose+flags (midjourney) appends --ar/--style flags", () => {
    const r = rewrite({
      brief: "a minimalist logo",
      asset_type: "logo",
      target_model: "midjourney-v7",
      brand_bundle: bundle,
      transparency_required: false,
      vector_required: false
    });
    expect(r.prompt).toMatch(/--ar 1:1/);
    expect(r.prompt).toMatch(/--v 7/);
    expect(r.prompt).toMatch(/--sref/);
  });

  it("imagen-4 pads short prompts and emits a padded prompt", () => {
    const r = rewrite({
      brief: "a circle",
      asset_type: "logo",
      target_model: "imagen-4",
      transparency_required: false,
      vector_required: false
    });
    // Either the warning fires, or the prompt is already ≥30 words.
    const wc = r.prompt.split(/\s+/).filter(Boolean).length;
    expect(wc).toBeGreaterThanOrEqual(30);
  });

  it("text >3 words drops to no-text and warns", () => {
    const r = rewrite({
      brief: "logo",
      asset_type: "logo",
      target_model: "gpt-image-1",
      text_content: "this is too many words for a mark",
      transparency_required: true,
      vector_required: true
    });
    expect(r.prompt).toMatch(/No text/);
    expect(r.warnings.some((w) => w.includes("Wordmark has been dropped"))).toBe(true);
  });

  it("flux-pro family emits negative_prompt rejection warning when do_not present", () => {
    const r = rewrite({
      brief: "a logo",
      asset_type: "logo",
      target_model: "flux-pro",
      brand_bundle: { palette: [], style_refs: [], do_not: ["no gradients"] },
      transparency_required: true,
      vector_required: false
    });
    expect(r.warnings.some((w) => w.includes("rejects negative_prompt"))).toBe(true);
  });

  it("transparency on non-native RGBA model warns + mattes later", () => {
    const r = rewrite({
      brief: "logo",
      asset_type: "logo",
      target_model: "sdxl",
      transparency_required: true,
      vector_required: false
    });
    expect(r.warnings.some((w) => w.includes("Transparency"))).toBe(true);
  });

  it("all asset types produce non-empty prose prompts", () => {
    const types: AssetType[] = [
      "logo",
      "app_icon",
      "favicon",
      "og_image",
      "splash_screen",
      "illustration",
      "icon_pack",
      "hero",
      "sticker",
      "transparent_mark"
    ];
    for (const t of types) {
      const r = rewrite({
        brief: "a modern minimal geometric concept for " + t,
        asset_type: t,
        target_model: "gpt-image-1",
        transparency_required: false,
        vector_required: false
      });
      expect(r.prompt.length).toBeGreaterThan(20);
    }
  });
});

// ── svg-briefs ────────────────────────────────────────────────────────────────

describe("svg-briefs.buildSvgBrief", () => {
  const bundle: BrandBundle = { palette: ["#112233", "#AABBCC"], style_refs: [], do_not: [] };

  it("produces distinct briefs for each supported asset type", () => {
    const types: AssetType[] = [
      "logo",
      "favicon",
      "icon_pack",
      "sticker",
      "transparent_mark",
      "app_icon"
    ];
    const seen = new Set<string>();
    for (const t of types) {
      const brief = buildSvgBrief({ asset_type: t, brand_bundle: bundle });
      expect(brief.viewBox).toMatch(/^0 0 \d+ \d+$/);
      expect(brief.palette.hex.length).toBeGreaterThan(0);
      expect(brief.skeleton).toContain("<svg");
      seen.add(brief.viewBox);
    }
    // Should have at least a few distinct viewBoxes (logo=256, favicon=32, etc.)
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it("logo brief honors text_content in requirements", () => {
    const brief = buildSvgBrief({
      asset_type: "logo",
      brand_bundle: bundle,
      text_content: "ACME"
    });
    expect(brief.require.join(" ")).toMatch(/ACME/);
  });

  it("logo brief without text adds 'No text' clause", () => {
    const brief = buildSvgBrief({ asset_type: "logo", brand_bundle: bundle });
    expect(brief.require.join(" ")).toMatch(/No text/);
  });

  it("unknown asset type falls through to logoBrief without crashing", () => {
    const brief = buildSvgBrief({
      asset_type: "og_image" as AssetType,
      brand_bundle: bundle
    });
    expect(brief.viewBox).toBeTruthy();
  });

  it("uses fallback palette when brand_bundle is missing", () => {
    const brief = buildSvgBrief({ asset_type: "favicon" });
    expect(brief.palette.hex.length).toBeGreaterThan(0);
    expect(brief.palette.hex[0]).toMatch(/^#/);
  });

  it("icon_pack uses currentColor fallback and stroke skeleton", () => {
    const brief = buildSvgBrief({ asset_type: "icon_pack" });
    expect(brief.palette.hex).toContain("currentColor");
    expect(brief.skeleton).toContain('stroke-width="2"');
  });

  it("app_icon authoring opens with an opaque background <rect>", () => {
    const brief = buildSvgBrief({ asset_type: "app_icon", brand_bundle: bundle });
    expect(brief.skeleton).toContain("<rect");
  });
});

// ── tools/models ─────────────────────────────────────────────────────────────

describe("tools/models", () => {
  it("modelsList returns entries with structural fields", async () => {
    const r = await modelsList({});
    expect(Array.isArray(r.models)).toBe(true);
    expect(r.models.length).toBeGreaterThan(0);
    for (const m of r.models.slice(0, 3)) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.family).toBe("string");
      expect(typeof m.dialect).toBe("string");
    }
  });

  it("modelsList --free filter restricts to free-tier", async () => {
    const all = await modelsList({});
    const free = await modelsList({ free: true });
    expect(free.models.length).toBeLessThanOrEqual(all.models.length);
  });

  it("modelsList --paste-only, --rgba, --svg filters all narrow the set", async () => {
    const base = (await modelsList({})).models.length;
    for (const filter of [
      { paste_only: true },
      { rgba: true },
      { svg: true },
      { paid: true }
    ] as const) {
      const r = await modelsList(filter);
      expect(r.models.length).toBeLessThanOrEqual(base);
    }
  });

  it("modelsInspect returns a full detail payload for a known model", async () => {
    const r = await modelsInspect({ id: "gpt-image-1" });
    expect(r.model.id).toBe("gpt-image-1");
    expect(Array.isArray(r.paste_targets)).toBe(true);
    expect(Array.isArray(r.routing_rules)).toBe(true);
    expect(r.status_in_env).toBeDefined();
  });

  it("modelsInspect on unknown id throws with a clear error", async () => {
    await expect(modelsInspect({ id: "no-such-model" })).rejects.toThrow(
      /not found in data\/model-registry/
    );
  });
});

// ── tools/capabilities ────────────────────────────────────────────────────────

describe("tools/capabilities", () => {
  it("reports per-asset availability and modes-by-asset-type", async () => {
    const r = await capabilities({});
    expect(r.inline_svg.available).toBe(true);
    expect(r.external_prompt_only.available).toBe(true);
    expect(typeof r.api.available).toBe("boolean");
    expect(Array.isArray(r.api.unconfigured_env_vars)).toBe(true);
    expect(r.modes_by_asset_type["logo"]).toBeDefined();
    expect(Array.isArray(r.providers_registered)).toBe(true);
    expect(r.providers_registered.length).toBeGreaterThan(0);
    expect(Array.isArray(r.hints)).toBe(true);
  });
});

// ── tools/doctor ──────────────────────────────────────────────────────────────

describe("tools/doctor", () => {
  it("doctor returns a structured report with runtime + modes + providers", async () => {
    const r = await doctor({});
    expect(r.runtime.node).toMatch(/^v\d+/);
    expect(typeof r.native_dependencies.sharp.installed).toBe("boolean");
    expect(typeof r.modes_available.inline_svg).toBe("boolean");
    expect(Array.isArray(r.free_tier_routes)).toBe(true);
    expect(Array.isArray(r.paid_providers)).toBe(true);
    expect(Array.isArray(r.what_to_try_next)).toBe(true);
  });

  it("doctor with check_data includes the data_integrity section", async () => {
    const r = await doctor({ check_data: true });
    expect(r.data_integrity).toBeDefined();
  });
});
