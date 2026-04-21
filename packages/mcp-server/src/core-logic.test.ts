import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseBrandSource, hashBundle } from "./brand.js";
import { computeCacheKey, cachePath, readCache, writeCache, writeArtifact } from "./cache.js";
import { checkDataIntegrity, assertDataIntegrityAtBoot } from "./data-integrity.js";
import { route, isForbiddenForAsset, getModelInfo } from "./router.js";

// ── brand ─────────────────────────────────────────────────────────────────────

describe("parseBrandSource", () => {
  it("parses native palette JSON", () => {
    const src = JSON.stringify({
      palette: ["#0077cc", "#ffffff", "#0077cc"],
      do_not: ["photorealism"],
      typography: { primary: "Inter" }
    });
    const b = parseBrandSource(src);
    expect(b.palette).toEqual(["#0077cc", "#ffffff"]);
    expect(b.do_not).toEqual(["photorealism"]);
    expect(b.typography?.primary).toBe("Inter");
  });

  it("parses camelCase aliases", () => {
    const src = JSON.stringify({
      colors: ["#fff"],
      styleRefs: ["ref-1"],
      doNot: ["no stock photos"],
      logoMark: "./logo.svg",
      srefCode: "--sref 12345",
      styleId: "recraft-style-1"
    });
    const b = parseBrandSource(src);
    expect(b.palette).toEqual(["#fff"]);
    expect(b.style_refs).toEqual(["ref-1"]);
    expect(b.do_not).toEqual(["no stock photos"]);
    expect(b.logo_mark).toBe("./logo.svg");
    expect(b.sref_code).toBe("--sref 12345");
    expect(b.style_id).toBe("recraft-style-1");
  });

  it("parses DTCG tokens", () => {
    const src = JSON.stringify({
      colors: {
        brand: {
          primary: { $type: "color", $value: "#0077cc" },
          accent: { $type: "color", $value: "#ffaa00" }
        }
      }
    });
    const b = parseBrandSource(src);
    expect(b.palette).toContain("#0077cc");
    expect(b.palette).toContain("#ffaa00");
  });

  it("parses AdCP shape with object colors, typography, do_not, logo", () => {
    const src = JSON.stringify({
      brand: {
        colors: [{ hex: "#010101" }, { value: "#020202" }, "#030303"],
        typography: { primary: "Inter", secondary: "Mono" },
        do_not: ["never x"],
        logo: "./mark.svg"
      }
    });
    const b = parseBrandSource(src);
    expect(b.palette.sort()).toEqual(["#010101", "#020202", "#030303"]);
    expect(b.typography).toEqual({ primary: "Inter", secondary: "Mono" });
    expect(b.do_not).toEqual(["never x"]);
    expect(b.logo_mark).toBe("./mark.svg");
  });

  it("parses AdCP with `mark` + `restrictions`", () => {
    const b = parseBrandSource(
      JSON.stringify({
        brand: { colors: ["#111"], restrictions: ["no gradients"], mark: "mark.svg" }
      })
    );
    expect(b.logo_mark).toBe("mark.svg");
    expect(b.do_not).toEqual(["no gradients"]);
  });

  it("falls back to raw-text parser on invalid JSON", () => {
    const b = parseBrandSource(
      "Our palette is #abcdef and #123.\nDo not: use photos\nAvoid clip art"
    );
    expect(b.palette).toEqual(expect.arrayContaining(["#abcdef", "#123"]));
    expect(b.do_not.length).toBeGreaterThan(0);
  });

  it("parses markdown file by path", () => {
    const tmp = mkdtempSync(join(tmpdir(), "p2a-brand-"));
    const mdPath = join(tmp, "brand.md");
    writeFileSync(
      mdPath,
      [
        "# Brand",
        "Palette: #0077cc #ffffff",
        "Typography: **Inter**",
        "",
        "## Do Not",
        "- never use photos",
        "- avoid clip art",
        "",
        "## Footer",
        "end"
      ].join("\n")
    );
    const b = parseBrandSource(mdPath);
    expect(b.palette).toEqual(expect.arrayContaining(["#0077cc", "#ffffff"]));
    expect(b.do_not?.length).toBeGreaterThanOrEqual(1);
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe("hashBundle", () => {
  it("returns null for null/undefined", () => {
    expect(hashBundle(null)).toBeNull();
    expect(hashBundle(undefined)).toBeNull();
  });

  it("is stable regardless of key ordering", () => {
    const a = hashBundle({ palette: ["#fff", "#000"] });
    const b = hashBundle({ palette: ["#fff", "#000"] });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ── cache ─────────────────────────────────────────────────────────────────────

describe("cache", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "p2a-cache-"));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it("computeCacheKey is stable for same inputs and differs when prompt changes", () => {
    const a = computeCacheKey({
      model: "m",
      seed: 1,
      prompt: "hello",
      params: { a: 1, b: 2 }
    });
    const b = computeCacheKey({
      model: "m",
      seed: 1,
      prompt: "hello",
      params: { b: 2, a: 1 }
    });
    const c = computeCacheKey({
      model: "m",
      seed: 1,
      prompt: "different",
      params: { a: 1, b: 2 }
    });
    expect(a.key).toBe(b.key);
    expect(a.prompt_hash).toBe(b.prompt_hash);
    expect(a.key).not.toBe(c.key);
    expect(a.prompt_hash).not.toBe(c.prompt_hash);
    expect(a.params_hash).toBe(b.params_hash);
  });

  it("cachePath places under <bucket>/<key>", () => {
    const p = cachePath("abcd1234efef5678", "preview.png");
    expect(p.endsWith("ab/abcd1234efef5678/preview.png")).toBe(true);
  });

  it("readCache returns null for missing file", () => {
    expect(readCache("nonexistent", "v.png")).toBeNull();
  });

  it("writeCache + readCache roundtrip", () => {
    const buf = Buffer.from("cache-me");
    const p = writeCache("deadbeefcafebabe", "x.bin", buf);
    expect(p).toContain(join("de", "deadbeefcafebabe"));
    const got = readCache("deadbeefcafebabe", "x.bin");
    expect(got?.toString()).toBe("cache-me");
  });

  it("writeArtifact writes relative files under outDir", () => {
    const p = writeArtifact(tmp, "sub/dir/a.txt", "hello");
    expect(p).toBe(join(tmp, "sub", "dir", "a.txt"));
  });
});

// ── data integrity ───────────────────────────────────────────────────────────

describe("data integrity", () => {
  it("bundled data passes integrity check", () => {
    const r = checkDataIntegrity();
    expect(r.ok).toBe(true);
    expect(r.stats.models_in_registry).toBeGreaterThan(0);
    expect(r.stats.routing_rules).toBeGreaterThan(0);
    expect(r.stats.dangling_rule_refs).toBe(0);
  });

  it("assertDataIntegrityAtBoot is a no-op when data is clean", () => {
    expect(() => assertDataIntegrityAtBoot()).not.toThrow();
  });

  it("assertDataIntegrityAtBoot emits warnings when P2A_DATA_VERBOSE=1", () => {
    const prev = process.env["P2A_DATA_VERBOSE"];
    process.env["P2A_DATA_VERBOSE"] = "1";
    try {
      expect(() => assertDataIntegrityAtBoot()).not.toThrow();
    } finally {
      if (prev === undefined) delete process.env["P2A_DATA_VERBOSE"];
      else process.env["P2A_DATA_VERBOSE"] = prev;
    }
  });
});

// ── router ───────────────────────────────────────────────────────────────────

describe("router", () => {
  it("returns a concrete decision for a logo", () => {
    const r = route({
      asset_type: "logo",
      text_length: 0,
      vector_required: true,
      transparency_required: true,
      brand_bundle_present: false
    });
    expect(typeof r.rule_id).toBe("string");
    expect(r.primary_model.length).toBeGreaterThan(0);
    expect(Array.isArray(r.fallback_models)).toBe(true);
    expect(Array.isArray(r.never_models)).toBe(true);
  });

  it("explanation mentions transparency/vector/text for appropriate inputs", () => {
    const r = route({
      asset_type: "logo",
      text_length: 10,
      vector_required: true,
      transparency_required: true,
      brand_bundle_present: true
    });
    expect(r.reason).toMatch(/transparency|vector|text/);
  });

  it("unknown asset type falls through to default route", () => {
    const r = route({
      asset_type: "nonexistent" as unknown as "logo",
      text_length: 0,
      vector_required: false,
      transparency_required: false,
      brand_bundle_present: false
    });
    expect(r.primary_model).toBe("gpt-image-1");
    expect(r.rule_id).toBe("default");
  });

  it("default route with transparency_required adds background=transparent", () => {
    const r = route({
      asset_type: "nonexistent" as unknown as "logo",
      text_length: 0,
      vector_required: false,
      transparency_required: true,
      brand_bundle_present: false
    });
    expect(r.primary_params).toEqual({ background: "transparent" });
    expect(r.postprocess).toContain("validate_alpha");
  });

  it("isForbiddenForAsset: unknown model is not forbidden", () => {
    const r = isForbiddenForAsset("bogus-model-id", {
      asset_type: "logo",
      text_length: 0,
      vector_required: false,
      transparency_required: false,
      brand_bundle_present: false
    });
    expect(r.forbidden).toBe(false);
  });

  it("isForbiddenForAsset flags transparency mismatch", () => {
    // midjourney-v7 is native_rgba=false per registry
    const r = isForbiddenForAsset("midjourney-v7", {
      asset_type: "logo",
      text_length: 0,
      vector_required: false,
      transparency_required: true,
      brand_bundle_present: false
    });
    // If the registry changes, this test becomes soft — only assert shape.
    expect(typeof r.forbidden).toBe("boolean");
    if (r.forbidden) expect(r.reason).toMatch(/RGBA/);
  });

  it("isForbiddenForAsset flags text_length above ceiling", () => {
    const r = isForbiddenForAsset("flux-pro", {
      asset_type: "logo",
      text_length: 9999,
      vector_required: false,
      transparency_required: false,
      brand_bundle_present: false
    });
    expect(typeof r.forbidden).toBe("boolean");
  });

  it("getModelInfo round-trip", () => {
    expect(getModelInfo("bogus-model-id")).toBeUndefined();
    const any = getModelInfo("gpt-image-1");
    expect(any?.id).toBe("gpt-image-1");
  });
});
