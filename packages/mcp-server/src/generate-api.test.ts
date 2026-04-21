import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG } from "./config.js";
import { generateLogo } from "./tools/generate-logo.js";
import { generateFavicon } from "./tools/generate-favicon.js";
import { generateAppIcon } from "./tools/generate-app-icon.js";
import { generateHero } from "./tools/generate-hero.js";
import { generateIllustration } from "./tools/generate-illustration.js";
import { generateSplashScreen } from "./tools/generate-splash-screen.js";
import { ingestExternal } from "./tools/ingest-external.js";
import { loadSharp } from "./pipeline/sharp.js";

// 1x1 transparent PNG, base64.
const DUMMY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const DUMMY_PNG = Buffer.from(DUMMY_PNG_B64, "base64");

const API_ENV_KEYS = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "IDEOGRAM_API_KEY",
  "RECRAFT_API_KEY",
  "BFL_API_KEY",
  "STABILITY_API_KEY",
  "LEONARDO_API_KEY",
  "FAL_API_KEY",
  "HF_TOKEN",
  "REPLICATE_API_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "POLLINATIONS_TOKEN",
  "HORDE_API_KEY",
  "PROMPT_TO_BUNDLE_COMFYUI_URL",
  "PROMPT_TO_BUNDLE_DRY_RUN"
];

const envSnap: Record<string, string | undefined> = {};
const apiKeysSnap = { ...CONFIG.apiKeys };
const originalDryRun = CONFIG.dryRun;
let tmp: string;

// Mock every outbound provider request with a deterministic success response.
function installProviderFetchMock() {
  global.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // OpenAI images — returns b64_json directly
    if (url.startsWith("https://api.openai.com/v1/images/generations")) {
      return new Response(
        JSON.stringify({ data: [{ b64_json: DUMMY_PNG_B64 }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    // Ideogram — returns a URL; subsequent fetch returns the binary
    if (url.startsWith("https://api.ideogram.ai/")) {
      return new Response(
        JSON.stringify({ data: [{ url: "https://mock-cdn/ideogram/out.png" }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    if (url === "https://mock-cdn/ideogram/out.png") {
      return new Response(DUMMY_PNG, {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    }
    // Recraft — returns b64_json with a tiny inline SVG so the downstream
    // rasterizer in generate-favicon/generate-app-icon gets a valid SVG.
    if (url.startsWith("https://external.api.recraft.ai/")) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0077cc"/></svg>`;
      return new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from(svg, "utf-8").toString("base64") }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    // Google Gemini / Imagen — simplified
    if (url.includes("generativelanguage.googleapis.com")) {
      return new Response(
        JSON.stringify({
          predictions: [{ bytesBase64Encoded: DUMMY_PNG_B64 }],
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data: DUMMY_PNG_B64 } }]
              }
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    // BFL flux polling
    if (url.includes("api.bfl.ai") || url.includes("api.bfl.ml")) {
      return new Response(
        JSON.stringify({ id: "x", polling_url: "https://api.bfl.ai/v1/get_result?id=x" }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    // Generic fallback
    return new Response(DUMMY_PNG, {
      status: 200,
      headers: { "content-type": "image/png" }
    });
  }) as typeof fetch;
}

beforeEach(() => {
  for (const k of API_ENV_KEYS) envSnap[k] = process.env[k];
  for (const k of API_ENV_KEYS) delete process.env[k];
  for (const k of Object.keys(CONFIG.apiKeys) as Array<keyof typeof CONFIG.apiKeys>) {
    CONFIG.apiKeys[k] = undefined;
  }
  // Enable real API simulation: set keys + mock fetch so providers call the
  // mocked endpoints and get deterministic dummy responses.
  process.env["OPENAI_API_KEY"] = "sk-test";
  CONFIG.apiKeys.openai = "sk-test";
  process.env["IDEOGRAM_API_KEY"] = "i-test";
  CONFIG.apiKeys.ideogram = "i-test";
  process.env["RECRAFT_API_KEY"] = "r-test";
  CONFIG.apiKeys.recraft = "r-test";
  process.env["GEMINI_API_KEY"] = "g-test";
  CONFIG.apiKeys.google = "g-test";
  installProviderFetchMock();
  tmp = mkdtempSync(join(tmpdir(), "p2a-gen-api-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  for (const k of Object.keys(CONFIG.apiKeys) as Array<keyof typeof CONFIG.apiKeys>) {
    CONFIG.apiKeys[k] = apiKeysSnap[k];
  }
  CONFIG.dryRun = originalDryRun;
  for (const k of API_ENV_KEYS) {
    if (envSnap[k] !== undefined) process.env[k] = envSnap[k];
    else delete process.env[k];
  }
  vi.restoreAllMocks();
});

describe("generateLogo api mode (dryRun)", () => {
  it("routes through the full api pipeline and returns an AssetBundle", async () => {
    const r = await generateLogo({
      brief: "minimal geometric mountain mark, indigo",
      mode: "api",
      output_dir: tmp,
      brand_bundle: { palette: ["#0f0f23", "#ffffff"] }
    });
    expect(r.mode).toBe("api");
    expect("provenance" in r && r.provenance?.model).toBeTruthy();
    if ("variants" in r) {
      expect(r.variants.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("honors max_retries=0 and returns even on validation failure", async () => {
    const r = await generateLogo({
      brief: "geometric mark",
      mode: "api",
      max_retries: 0,
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
  });

  it("skips api when no keys and returns external plan (soft fallback)", async () => {
    CONFIG.apiKeys.openai = undefined;
    CONFIG.apiKeys.ideogram = undefined;
    CONFIG.apiKeys.recraft = undefined;
    delete process.env["OPENAI_API_KEY"];
    delete process.env["IDEOGRAM_API_KEY"];
    delete process.env["RECRAFT_API_KEY"];
    const r = await generateLogo({ brief: "wordless glyph", output_dir: tmp });
    // Auto-mode falls back to external_prompt_only when nothing has a key.
    expect(["external_prompt_only", "inline_svg"]).toContain(r.mode);
  });
});

describe("generateFavicon api mode (dryRun)", () => {
  it("produces a favicon bundle", async () => {
    const r = await generateFavicon({
      brief: "letter-F monogram in indigo",
      mode: "api",
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
    if ("variants" in r) {
      expect(r.variants.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("generateAppIcon api mode (dryRun)", () => {
  it("fans out an app-icon bundle", async () => {
    const r = await generateAppIcon({
      brief: "rounded squircle with star glyph",
      mode: "api",
      platforms: ["all"],
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
  });
});

describe("generateHero api mode (dryRun)", () => {
  it("produces a hero bundle", async () => {
    const r = await generateHero({
      brief: "cinematic product shot on deep navy",
      mode: "api",
      aspect_ratio: "16:9",
      count: 1,
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
    if ("variants" in r) {
      expect(r.variants.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("generateIllustration api mode (dryRun)", () => {
  it("produces an illustration bundle", async () => {
    const r = await generateIllustration({
      brief: "empty-state, soft and minimal",
      mode: "api",
      count: 1,
      aspect_ratio: "4:3",
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
    if ("variants" in r) {
      expect(r.variants.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// generateOgImage relies on Satori WASM which cannot load in the vitest sandbox
// (CompileError on fonts). Covered indirectly by generate-og-image tests in tools-coverage.

describe("generateSplashScreen api mode", () => {
  it("produces a splash bundle with an existing mark file (no diffusion needed)", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const markPath = join(tmp, "mark.svg");
    writeFileSync(
      markPath,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" fill="#0077cc"/></svg>`
    );
    const r = await generateSplashScreen({
      brief: "splash: indigo background, centered mark",
      mode: "api",
      existing_mark_svg: markPath,
      platforms: ["ios", "android", "pwa"],
      output_dir: tmp
    });
    expect(r.mode).toBe("api");
  });
});

describe("ingestExternal", () => {
  it("ingests a user-supplied PNG and returns an AssetBundle", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const { join } = await import("node:path");
    const { writeFileSync } = await import("node:fs");
    const p = join(tmp, "mark.png");
    writeFileSync(p, png);
    const r = await ingestExternal({
      image_path: p,
      asset_type: "logo",
      output_dir: join(tmp, "out")
    });
    expect(r.mode).toBe("api");
    expect(r.variants.length).toBeGreaterThanOrEqual(1);
  });

  it("runs vectorize when asset_type is logo and vector output is wanted", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const { join } = await import("node:path");
    const { writeFileSync } = await import("node:fs");
    const p = join(tmp, "mark2.png");
    writeFileSync(p, png);
    const r = await ingestExternal({
      image_path: p,
      asset_type: "logo",
      run_vectorize: true,
      output_dir: join(tmp, "out2")
    });
    expect(r.variants.some((v) => v.format === "svg")).toBe(true);
  });
});
