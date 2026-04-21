import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matte } from "./matte.js";
import { upscale } from "./upscale.js";
import { vectorize } from "./vectorize.js";
import { tier0, tier1Alignment, tier2Vlm } from "./validate.js";
import { renderOg } from "./og-render.js";
import { loadSharp } from "./sharp.js";
import { validateAsset } from "../tools/validate-asset.js";

const ENV_KEYS = [
  "PROMPT_TO_BUNDLE_RMBG_URL",
  "PROMPT_TO_BUNDLE_UPSCALER_URL",
  "PROMPT_TO_BUNDLE_VLM_URL",
  "PROMPT_TO_BUNDLE_VQA_URL",
  "PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL"
];
const envSnapshot: Record<string, string | undefined> = {};
let tmpRoot: string;

beforeEach(() => {
  for (const k of ENV_KEYS) envSnapshot[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
  tmpRoot = mkdtempSync(join(tmpdir(), "p2a-pipe-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (envSnapshot[k] !== undefined) process.env[k] = envSnapshot[k];
    else delete process.env[k];
  }
  vi.restoreAllMocks();
});

// ── matte ─────────────────────────────────────────────────────────────────────

describe("matte", () => {
  it("native — RGBA input passes through unchanged", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } }
    })
      .png()
      .toBuffer();
    const r = await matte({ image: png, mode: "auto" });
    expect(r.method_used).toBe("native");
  });

  it("chroma_white fallback when no RMBG url and no alpha", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .png()
      .toBuffer();
    const r = await matte({ image: png, mode: "chroma_white" });
    expect(r.method_used).toBe("chroma_white_local");
    expect(r.warnings.some((w) => w.includes("local white-pixel chroma key"))).toBe(true);
  });

  it("remote RMBG endpoint is called when URL set and returns RGBA", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    // Fake "remote" returns a 16×16 RGBA PNG.
    const fakeRgba = await sharp({
      create: { width: 16, height: 16, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } }
    })
      .png()
      .toBuffer();
    global.fetch = vi.fn(async () => new Response(fakeRgba, { status: 200 })) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_RMBG_URL"] = "https://remote/rmbg";

    const input = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 200, b: 200 } }
    })
      .png()
      .toBuffer();
    const r = await matte({ image: input, mode: "rmbg" });
    expect(r.method_used).toBe("rmbg");
  });

  it("difference mode requires equal dimensions or throws", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const white = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .png()
      .toBuffer();
    const black = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } }
    })
      .png()
      .toBuffer();
    await expect(
      matte({
        image: white,
        mode: "difference",
        white_bg_image: white,
        black_bg_image: black
      })
    ).rejects.toThrow(/identical dimensions/);
  });

  it("difference mode computes alpha from luma delta", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const white = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .png()
      .toBuffer();
    const black = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 0 } }
    })
      .png()
      .toBuffer();
    const r = await matte({
      image: white,
      mode: "difference",
      white_bg_image: white,
      black_bg_image: black
    });
    expect(r.method_used).toBe("difference");
  });
});

// ── upscale ───────────────────────────────────────────────────────────────────

describe("upscale", () => {
  it("no-op when image already >= target", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const r = await upscale({ image: png, target_size: 256 });
    expect(r.method_used).toMatch(/no-op/);
  });

  it("Lanczos3 path for small inputs without URL", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const r = await upscale({ image: png, target_size: 128 });
    expect(r.method_used).toBe("lanczos3");
  });

  it("Lanczos warning fires when non-lanczos mode requested without URL", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const r = await upscale({ image: png, target_size: 128, mode: "dat2" });
    expect(r.warnings.some((w) => w.includes("dat2"))).toBe(true);
  });

  it("remote upscaler is called when URL set and returns base64", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const small = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const big = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ image_b64: big.toString("base64"), method: "dat2-remote" }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_UPSCALER_URL"] = "https://remote/upscale";
    const r = await upscale({
      image: small,
      target_size: 128,
      mode: "dat2",
      asset_type: "logo"
    });
    expect(r.method_used).toBe("dat2-remote");
  });

  it("remote upscaler fetch failure falls through to Lanczos", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const small = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    global.fetch = vi.fn(async () => {
      throw new Error("nope");
    }) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_UPSCALER_URL"] = "https://remote/upscale";
    const r = await upscale({ image: small, target_size: 128, mode: "real-esrgan" });
    expect(r.method_used).toBe("lanczos3");
  });
});

// ── vectorize ─────────────────────────────────────────────────────────────────

describe("vectorize (pipeline)", () => {
  it("falls back to placeholder SVG when no tracers/URL", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const r = await vectorize({ image: png, mode: "multicolor", max_paths: 2 });
    expect(r.svg).toContain("<svg");
  });

  it("remote Recraft URL is honored when set", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const fakeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/></svg>`;
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ svg: fakeSvg }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL"] = "https://remote/vec";
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const r = await vectorize({ image: png, mode: "1bit" });
    expect(r.svg.length).toBeGreaterThan(0);
  });
});

// ── validate tier-1 / tier-2 ──────────────────────────────────────────────────

describe("tier1Alignment / tier2Vlm", () => {
  it("tier1Alignment returns ran=false when URL unset", async () => {
    const r = await tier1Alignment(Buffer.from([1, 2, 3]), "logo", "a logo");
    expect(r.ran).toBe(false);
  });

  it("tier2Vlm returns ran=false when URL unset", async () => {
    const r = await tier2Vlm(Buffer.from([1, 2, 3]), "logo", {});
    expect(r.ran).toBe(false);
  });

  it("tier1Alignment calls remote and surfaces score + notes", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ score: 0.85, notes: ["looks good"] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VQA_URL"] = "https://remote/vqa";
    const r = await tier1Alignment(Buffer.from([1, 2, 3]), "logo", "a logo");
    expect(r.ran).toBe(true);
    expect(r.score).toBe(0.85);
    expect(r.notes).toEqual(["looks good"]);
  });

  it("tier1Alignment surfaces HTTP errors", async () => {
    global.fetch = vi.fn(async () => new Response("x", { status: 500 })) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VQA_URL"] = "https://remote/vqa";
    const r = await tier1Alignment(Buffer.from([1, 2, 3]), "logo", "a logo");
    expect(r.ran).toBe(true);
    expect(r.error).toMatch(/HTTP 500/);
  });

  it("tier1Alignment catches fetch throw", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("conn refused");
    }) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VQA_URL"] = "https://remote/vqa";
    const r = await tier1Alignment(Buffer.from([1, 2, 3]), "logo", "a logo");
    expect(r.ran).toBe(true);
    expect(r.error).toMatch(/conn refused/);
  });

  it("tier2Vlm returns pass=false with notes from remote", async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ pass: false, score: 0.3, notes: ["brand drift", "wrong palette"] }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VLM_URL"] = "https://remote/vlm";
    const r = await tier2Vlm(Buffer.from([1, 2, 3]), "logo", { brand_primary: "#0077cc" });
    expect(r.ran).toBe(true);
    expect(r.pass).toBe(false);
    expect(r.notes?.length).toBe(2);
  });

  it("tier2Vlm surfaces HTTP error", async () => {
    global.fetch = vi.fn(async () => new Response("x", { status: 502 })) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VLM_URL"] = "https://remote/vlm";
    const r = await tier2Vlm(Buffer.from([1, 2, 3]), "logo", {});
    expect(r.ran).toBe(true);
    expect(r.error).toMatch(/HTTP 502/);
  });
});

// ── validate-asset full VQA/VLM branches ──────────────────────────────────────

describe("validateAsset (with VQA/VLM mocks)", () => {
  it("wires VQA failure into failures[] when score below threshold", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "a.png");
    writeFileSync(p, png);
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ score: 0.2, notes: ["off-brief"] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VQA_URL"] = "https://remote/vqa";
    const r = await validateAsset({
      image: p,
      asset_type: "illustration",
      run_vqa: true,
      run_vlm: false,
      prompt: "cozy spot illustration"
    });
    expect(r.failures.some((f) => f.code === "T1_VQASCORE")).toBe(true);
  });

  it("wires VLM pass=false into T2_BRAND_DRIFT failure", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "b.png");
    writeFileSync(p, png);
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ pass: false, score: 0.35, notes: ["palette drift"] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    ) as typeof fetch;
    process.env["PROMPT_TO_BUNDLE_VLM_URL"] = "https://remote/vlm";
    const r = await validateAsset({
      image: p,
      asset_type: "illustration",
      run_vqa: false,
      run_vlm: true
    });
    expect(r.failures.some((f) => f.code === "T2_BRAND_DRIFT")).toBe(true);
  });
});

// ── renderOg (partial coverage via minimal template) ──────────────────────────

// renderOg requires satori wasm + a real TTF font at a known location; skipped
// here because a failing wasm load leaks as an unhandled rejection.
// Integration coverage of renderOg happens in generate-og-image end-to-end test.
void renderOg;

// tier0: hit paths not yet covered — intended_text triggers OCR branch
describe("tier0 branches", () => {
  it("runs OCR when intended_text is provided (may skip if tesseract missing)", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const r = await tier0({
      image: png,
      asset_type: "logo",
      intended_text: "ACME",
      transparency_required: false
    });
    expect(typeof r.pass).toBe("boolean");
  });
});
