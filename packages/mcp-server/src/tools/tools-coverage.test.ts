import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG } from "../config.js";
import { loadSharp } from "../pipeline/sharp.js";
import { brandBundleParse } from "./brand-bundle-parse.js";
import { generateLogo } from "./generate-logo.js";
import { generateAppIcon } from "./generate-app-icon.js";
import { generateFavicon } from "./generate-favicon.js";
import { generateHero } from "./generate-hero.js";
import { generateIllustration } from "./generate-illustration.js";
import { generateOgImage } from "./generate-og-image.js";
import { generateSplashScreen } from "./generate-splash-screen.js";
import {
  resolveMode,
  buildInlineSvgPlan,
  buildExternalPromptPlan,
  chooseApiTargetOrFallback
} from "./mode-runtime.js";
import { trainBrandLora } from "./train-brand-lora.js";
import { ingestExternal } from "./ingest-external.js";
import { validateAsset } from "./validate-asset.js";
import { removeBackground } from "./remove-background.js";
import { vectorizeImage } from "./vectorize.js";
import { upscaleRefine } from "./upscale-refine.js";
import type { AssetSpec, BrandBundle } from "../types.js";

// Mutable keys; reset around each test.
const ORIGINAL_KEYS = { ...CONFIG.apiKeys };
const ORIGINAL_OUT = CONFIG.outputDir;
const ORIGINAL_DRY = CONFIG.dryRun;
function setKey(k: keyof typeof CONFIG.apiKeys, v: string | undefined): void {
  (CONFIG.apiKeys as Record<string, string | undefined>)[k as string] = v;
}

const ENV_TO_RESTORE = [
  "POLLINATIONS_DISABLED",
  "HORDE_DISABLED",
  "PROMPT_TO_BUNDLE_DRY_RUN",
  "PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL",
  "PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_TOKEN",
  "PROMPT_TO_BUNDLE_OUTPUT_DIR",
  "PROMPT_TO_BUNDLE_BUDGET_MAX_USD",
  "PROMPT_TO_BUNDLE_COST_GUARD_NOTICE_ABOVE_USD",
  // Provider env vars that detectApiAvailability() reads from process.env.
  // Must be cleared so CONFIG.apiKeys resets are honored by mode detection.
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
  "REPLICATE_API_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "COMFYUI_URL",
  "COMFYUI_API_TOKEN"
];
const envSnapshot: Record<string, string | undefined> = {};

let tmpRoot: string;

beforeEach(() => {
  for (const k of ENV_TO_RESTORE) envSnapshot[k] = process.env[k];
  for (const k of ENV_TO_RESTORE) delete process.env[k];
  for (const k of Object.keys(CONFIG.apiKeys))
    setKey(k as keyof typeof CONFIG.apiKeys, undefined);
  // Pollinations is on by default and would make "no keys" behaviour misleading.
  process.env["POLLINATIONS_DISABLED"] = "1";
  process.env["HORDE_DISABLED"] = "1";
  (CONFIG as { dryRun: boolean }).dryRun = false;
  tmpRoot = mkdtempSync(join(tmpdir(), "p2a-tools-"));
  (CONFIG as { outputDir: string }).outputDir = tmpRoot;
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const k of Object.keys(CONFIG.apiKeys))
    setKey(k as keyof typeof CONFIG.apiKeys, ORIGINAL_KEYS[k as keyof typeof ORIGINAL_KEYS]);
  (CONFIG as { outputDir: string }).outputDir = ORIGINAL_OUT;
  (CONFIG as { dryRun: boolean }).dryRun = ORIGINAL_DRY;
  for (const k of ENV_TO_RESTORE) {
    if (envSnapshot[k] !== undefined) process.env[k] = envSnapshot[k];
    else delete process.env[k];
  }
  vi.restoreAllMocks();
});

// ── brand-bundle-parse ────────────────────────────────────────────────────────

describe("brandBundleParse", () => {
  it("parses an inline brand.md and returns a stable hash", async () => {
    const r = await brandBundleParse({
      source: `palette: #0077cc, #ffffff, #101010; primary color #0077cc; typography Inter`
    });
    expect(r.bundle.palette.length).toBeGreaterThan(0);
    expect(r.hash).toMatch(/^[a-f0-9]+$/);
    expect(r.warnings).toEqual([]);
  });

  it("warns on empty palette and over-stuffed palette", async () => {
    const none = await brandBundleParse({ source: "no colors here, just prose" });
    expect(none.bundle.palette).toEqual([]);
    expect(none.warnings.some((w) => w.includes("no colors"))).toBe(true);

    const manyHex = Array.from({ length: 16 }, (_, i) => `#${(0x111111 * (i + 1)).toString(16).slice(0, 6).padStart(6, "0")}`).join(", ");
    const many = await brandBundleParse({ source: manyHex });
    if (many.bundle.palette.length > 12) {
      expect(many.warnings.some((w) => w.includes("colors"))).toBe(true);
    }
  });
});

// ── mode-runtime ──────────────────────────────────────────────────────────────

function makeSpec(overrides: Partial<AssetSpec> = {}): AssetSpec {
  return {
    asset_type: "logo",
    brief: "a minimal logo",
    rewritten_prompt: "a minimal logo, vector, flat",
    target_model: "gpt-image-1",
    fallback_models: ["ideogram-3", "recraft-v4"],
    params: { seed: 42, negative_prompt: "blurry" },
    postprocess: [],
    safe_zone: null,
    dimensions: { width: 1024, height: 1024 },
    transparency_required: true,
    vector_required: true,
    text_content: null,
    modes_available: ["inline_svg", "external_prompt_only", "api"],
    paste_targets: [],
    warnings: [],
    ...overrides
  };
}

describe("mode-runtime", () => {
  it("resolveMode returns the asked-for mode if possible", () => {
    const r = resolveMode("inline_svg", "logo", "gpt-image-1", ["ideogram-3"]);
    expect(r.mode).toBe("inline_svg");
  });

  it("buildInlineSvgPlan produces a complete host-LLM instruction", () => {
    const spec = makeSpec();
    const plan = buildInlineSvgPlan("logo", "a minimal logo", spec);
    expect(plan.mode).toBe("inline_svg");
    expect(plan.svg_brief.viewBox).toBeTruthy();
    expect(plan.instructions_to_host_llm).toContain("asset_save_inline_svg");
    expect(plan.instructions_to_host_llm).toContain("viewBox");
    // With a brand bundle + text
    const bundle: BrandBundle = {
      palette: ["#ff0000", "#00ff00"],
      style_refs: [],
      do_not: []
    };
    const withBundle = buildInlineSvgPlan("app_icon", "a+ app", spec, bundle, "A+");
    expect(withBundle.instructions_to_host_llm).toContain("brand_bundle");
    expect(withBundle.instructions_to_host_llm).toContain("expected_text");
  });

  it("buildExternalPromptPlan returns paste targets + ingest hint", () => {
    const spec = makeSpec();
    const plan = buildExternalPromptPlan("logo", "a minimal logo", spec, {
      expected_text: "ACME"
    });
    expect(plan.mode).toBe("external_prompt_only");
    expect(plan.enhanced_prompt).toBe(spec.rewritten_prompt);
    expect(plan.ingest_hint.tool).toBe("asset_ingest_external");
    expect(plan.negative_prompt).toBe("blurry");
    expect(plan.paste_targets.length + plan.fallback_paste_targets.length).toBeGreaterThan(0);
  });

  it("chooseApiTargetOrFallback: api path when key present, external when none", () => {
    setKey("openai", "sk");
    const api = chooseApiTargetOrFallback("logo", "brief", makeSpec());
    expect(api.kind).toBe("api");
    if (api.kind === "api") {
      expect(api.model).toBe("gpt-image-1");
    }
    setKey("openai", undefined);
    const ext = chooseApiTargetOrFallback("logo", "brief", makeSpec());
    expect(ext.kind).toBe("external");
  });
});

// ── generate-logo ─────────────────────────────────────────────────────────────

describe("generateLogo (non-api modes)", () => {
  it("inline_svg mode returns a plan with instructions", async () => {
    const r = (await generateLogo({
      brief: "a minimal circle mark in blue",
      mode: "inline_svg",
      max_retries: 0
    })) as { mode: string; svg_brief: { viewBox: string } };
    expect(r.mode).toBe("inline_svg");
    expect(r.svg_brief.viewBox).toBeTruthy();
  });

  it("external_prompt_only mode returns the rewritten prompt", async () => {
    const r = (await generateLogo({
      brief: "a minimal mountain logo",
      mode: "external_prompt_only",
      text_content: "ACME",
      max_retries: 0
    })) as { mode: string; enhanced_prompt: string; ingest_hint: { tool: string } };
    expect(r.mode).toBe("external_prompt_only");
    expect(r.enhanced_prompt.length).toBeGreaterThan(0);
    expect(r.ingest_hint.tool).toBe("asset_ingest_external");
  });

  it("mode=api without keys throws a clear error", async () => {
    await expect(
      generateLogo({
        brief: "a monogram logo",
        mode: "api",
        max_retries: 0
      })
    ).rejects.toThrow(/no provider API key/);
  });

  it("mode=undefined (auto) falls back to external_prompt_only when no keys", async () => {
    const r = (await generateLogo({
      brief: "a monogram logo",
      max_retries: 0
    })) as { mode: string };
    // Auto resolution with no keys → external_prompt_only is first in preference.
    expect(["external_prompt_only", "inline_svg"]).toContain(r.mode);
  });
});

// ── generate-app-icon ─────────────────────────────────────────────────────────

describe("generateAppIcon (non-api modes)", () => {
  it("inline_svg + external + soft-fallback", async () => {
    const inline = (await generateAppIcon({
      brief: "fintech app icon",
      mode: "inline_svg",
      platforms: ["ios"],
      ios_18_appearances: false
    })) as { mode: string };
    expect(inline.mode).toBe("inline_svg");
    const ext = (await generateAppIcon({
      brief: "fintech app icon",
      mode: "external_prompt_only",
      platforms: ["ios", "android"],
      ios_18_appearances: false
    })) as { mode: string };
    expect(ext.mode).toBe("external_prompt_only");
    await expect(
      generateAppIcon({
        brief: "fintech app icon",
        mode: "api",
        platforms: ["ios"],
        ios_18_appearances: false
      })
    ).rejects.toThrow(/no provider API key/);
  });
});

// ── generate-favicon ──────────────────────────────────────────────────────────

describe("generateFavicon (non-api modes)", () => {
  it("inline_svg mode", async () => {
    const r = (await generateFavicon({
      brief: "a minimal letter F favicon",
      mode: "inline_svg",
      dark_mode: false
    })) as { mode: string };
    expect(r.mode).toBe("inline_svg");
  });

  it("external_prompt_only mode", async () => {
    const r = (await generateFavicon({
      brief: "a minimal letter F favicon",
      mode: "external_prompt_only",
      dark_mode: false
    })) as { mode: string };
    expect(r.mode).toBe("external_prompt_only");
  });

  it("api mode without keys throws a clear error", async () => {
    await expect(
      generateFavicon({
        brief: "a minimal letter F favicon",
        mode: "api",
        dark_mode: false
      })
    ).rejects.toThrow(/no provider API key/);
  });

  it("existing_mark_svg path runs the export bundle", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0077cc"/></svg>`;
    const svgPath = join(tmpRoot, "mark.svg");
    writeFileSync(svgPath, svg);
    const r = (await generateFavicon({
      brief: "from-svg",
      existing_mark_svg: svgPath,
      output_dir: join(tmpRoot, "fav-out"),
      dark_mode: true
    })) as { mode: string; variants: Array<{ path: string }> };
    expect(r.mode).toBe("api");
    expect(r.variants.length).toBeGreaterThan(0);
  });
});

// ── generate-hero ─────────────────────────────────────────────────────────────

describe("generateHero", () => {
  it("inline_svg mode is not valid → throws", async () => {
    await expect(
      generateHero({
        brief: "landing hero",
        mode: "inline_svg",
        aspect_ratio: "16:9",
        count: 1
      })
    ).rejects.toThrow(/not valid/);
  });

  it("external_prompt_only mode works for each aspect ratio", async () => {
    for (const ar of ["16:9", "21:9", "3:2", "2:1"] as const) {
      const r = (await generateHero({
        brief: "landing hero",
        mode: "external_prompt_only",
        aspect_ratio: ar,
        count: 1
      })) as { mode: string };
      expect(r.mode).toBe("external_prompt_only");
    }
  });

  it("mode=api without keys throws a clear error", async () => {
    await expect(
      generateHero({
        brief: "landing hero",
        mode: "api",
        aspect_ratio: "16:9",
        count: 1
      })
    ).rejects.toThrow(/no provider API key/);
  });
});

// ── generate-illustration ─────────────────────────────────────────────────────

describe("generateIllustration", () => {
  it("external_prompt_only across aspect ratios", async () => {
    for (const ar of ["1:1", "4:3", "16:9", "2:1", "3:2", "unknown"] as const) {
      const r = (await generateIllustration({
        brief: "empty state illustration",
        mode: "external_prompt_only",
        aspect_ratio: ar as "1:1",
        count: 1
      })) as { mode: string };
      expect(r.mode).toBe("external_prompt_only");
    }
  });

  it("mode=api without keys throws", async () => {
    await expect(
      generateIllustration({
        brief: "empty state",
        mode: "api",
        aspect_ratio: "16:9",
        count: 1
      })
    ).rejects.toThrow(/no provider API key/);
  });
});

// ── generate-og-image ─────────────────────────────────────────────────────────

describe("generateOgImage", () => {
  it("inline_svg is rejected with a clear error", async () => {
    await expect(
      generateOgImage({
        title: "hello",
        template: "minimal-light",
        mode: "inline_svg",
        with_background_image: false
      } as Parameters<typeof generateOgImage>[0])
    ).rejects.toThrow(/not supported/);
  });

  it("external_prompt_only requires background", async () => {
    await expect(
      generateOgImage({
        title: "hello",
        template: "minimal-light",
        mode: "external_prompt_only",
        with_background_image: false
      } as Parameters<typeof generateOgImage>[0])
    ).rejects.toThrow(/with_background_image=true/);

    const r = (await generateOgImage({
      title: "hello",
      template: "minimal-light",
      mode: "external_prompt_only",
      with_background_image: true,
      background_brief: "abstract gradient mesh"
    } as Parameters<typeof generateOgImage>[0])) as { mode: string };
    expect(r.mode).toBe("external_prompt_only");
  });

  it("api mode (no background) renders the Satori template end-to-end", async () => {
    const r = (await generateOgImage({
      title: "OG Render Test",
      subtitle: "rendered by satori+resvg",
      template: "minimal-light",
      mode: "api",
      with_background_image: false,
      output_dir: join(tmpRoot, "og-out")
    } as Parameters<typeof generateOgImage>[0])) as {
      mode: string;
      variants: Array<{ path: string; format: string }>;
    };
    expect(r.mode).toBe("api");
    expect(r.variants.some((v) => v.format === "svg")).toBe(true);
  });
});

// ── generate-splash-screen ────────────────────────────────────────────────────

describe("generateSplashScreen", () => {
  it("inline_svg rejected with a clear message", async () => {
    await expect(
      generateSplashScreen({
        brief: "splash",
        mode: "inline_svg",
        platforms: ["ios"]
      } as Parameters<typeof generateSplashScreen>[0])
    ).rejects.toThrow(/(not valid|not supported)/);
  });

  it("external_prompt_only returns a plan", async () => {
    const r = (await generateSplashScreen({
      brief: "splash",
      mode: "external_prompt_only",
      platforms: ["ios", "android"]
    } as Parameters<typeof generateSplashScreen>[0])) as { mode: string };
    expect(r.mode).toBe("external_prompt_only");
  });

  it("api mode with existing_mark_svg produces platform bundles", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    // resolveMode needs api-capable keys even if existing_mark_svg bypasses diffusion.
    // detectApiAvailability reads process.env, not CONFIG.apiKeys.
    process.env["OPENAI_API_KEY"] = "sk-test";
    setKey("openai", "sk-test");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#0077cc"/></svg>`;
    const svgPath = join(tmpRoot, "mark.svg");
    writeFileSync(svgPath, svg);
    const r = (await generateSplashScreen({
      brief: "splash",
      existing_mark_svg: svgPath,
      mode: "api",
      background_color: "#ffffff",
      platforms: ["ios", "android", "pwa"],
      output_dir: join(tmpRoot, "splash-out")
    } as Parameters<typeof generateSplashScreen>[0])) as {
      mode: string;
      variants: Array<{ path: string }>;
    };
    expect(r.mode).toBe("api");
    expect(r.variants.length).toBeGreaterThan(0);
  });
});

// ── validate-asset ────────────────────────────────────────────────────────────

describe("validateAsset", () => {
  it("runs tier-0 on a real PNG", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 119, b: 204, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "logo.png");
    writeFileSync(p, png);
    const r = await validateAsset({
      image: p,
      asset_type: "logo",
      run_vqa: false,
      run_vlm: false
    });
    expect(typeof r.pass).toBe("boolean");
    expect(Array.isArray(r.failures)).toBe(true);
  });

  it("run_vqa without prompt produces a skip warning", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "tiny.png");
    writeFileSync(p, png);
    const r = await validateAsset({
      image: p,
      asset_type: "illustration",
      run_vqa: true,
      run_vlm: true
    });
    expect(r.warnings.some((w) => w.includes("VQAScore skipped") || w.includes("VLM"))).toBe(
      true
    );
  });
});

// ── ingest-external ───────────────────────────────────────────────────────────

describe("ingestExternal", () => {
  it("ingests a PNG logo and returns validations", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 119, b: 204, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "mark.png");
    writeFileSync(p, png);
    const r = await ingestExternal({
      image_path: p,
      asset_type: "illustration", // illustration = no matte, no vectorize
      output_dir: join(tmpRoot, "ingest-out")
    });
    expect(r.mode).toBe("api");
    expect(r.asset_type).toBe("illustration");
    expect(r.variants[0]!.format).toBe("png");
  });

  it("JPEG restoration pre-pass runs for lossy inputs", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const jpg = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 200, g: 100, b: 50 }
      }
    })
      .jpeg()
      .toBuffer();
    const p = join(tmpRoot, "photo.jpg");
    writeFileSync(p, jpg);
    const r = await ingestExternal({
      image_path: p,
      asset_type: "illustration",
      output_dir: join(tmpRoot, "ingest-jpg-out"),
      transparent: false,
      vector: false
    });
    expect(r.warnings.some((w) => w.includes("restoration pre-pass"))).toBe(true);
  });
});

// ── train-brand-lora ──────────────────────────────────────────────────────────

describe("trainBrandLora", () => {
  it("returns ok=false with a clear error when URL is unset", async () => {
    const r = await trainBrandLora({
      name: "acme",
      base_model: "sdxl-1.0",
      training_images: [],
      rank: 16,
      steps: 100,
      captions: []
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("MODAL_LORA_TRAIN_URL");
  });

  it("warns on too-few and too-many images, then calls the endpoint", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    process.env["PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL"] = "https://modal.example/train";
    process.env["PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_TOKEN"] = "tok";
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const imgPath = join(tmpRoot, "img.png");
    writeFileSync(imgPath, png);
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ lora_id: "lora_123", status: "ready", lora_url: "https://x" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    global.fetch = fetchMock as typeof fetch;
    const r = await trainBrandLora({
      name: "acme",
      base_model: "flux-1-dev",
      training_images: [imgPath],
      rank: 16,
      steps: 100,
      captions: ["a logo"]
    });
    expect(r.ok).toBe(true);
    expect(r.lora_id).toBe("lora_123");
    expect(r.warnings.some((w) => w.includes("below ~20"))).toBe(true);
  });

  it("surfaces fetch failure, HTTP error, missing lora_id", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    process.env["PROMPT_TO_BUNDLE_MODAL_LORA_TRAIN_URL"] = "https://modal.example/train";
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const imgPath = join(tmpRoot, "img.png");
    writeFileSync(imgPath, png);

    global.fetch = vi.fn(async () => {
      throw new Error("conn refused");
    }) as typeof fetch;
    let r = await trainBrandLora({
      name: "acme",
      base_model: "sdxl-1.0",
      training_images: [imgPath]
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("fetch failed");

    global.fetch = vi.fn(async () => new Response("no", { status: 500 })) as typeof fetch;
    r = await trainBrandLora({
      name: "acme",
      base_model: "sdxl-1.0",
      training_images: [imgPath]
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("HTTP 500");

    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    ) as typeof fetch;
    r = await trainBrandLora({
      name: "acme",
      base_model: "sdxl-1.0",
      training_images: [imgPath]
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("lora_id");
  });
});

// ── thin wrappers: remove-background, vectorize, upscale-refine ────────────────

describe("thin-wrapper tools", () => {
  it("removeBackground runs matte on a real RGBA PNG", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "in.png");
    writeFileSync(p, png);
    const outDir = join(tmpRoot, "rb-out");
    mkdirSync(outDir, { recursive: true });
    const r = await removeBackground({
      image: p,
      output_dir: outDir,
      mode: "auto"
    });
    expect(existsSync(r.output_path)).toBe(true);
    expect(typeof r.alpha_coverage).toBe("number");
  });

  it("vectorizeImage writes a sanitized SVG", async () => {
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
    const p = join(tmpRoot, "mark.png");
    writeFileSync(p, png);
    const outDir = join(tmpRoot, "vec-out");
    mkdirSync(outDir, { recursive: true });
    const r = await vectorizeImage({
      image: p,
      output_dir: outDir,
      mode: "multicolor",
      palette_size: 2,
      max_paths: 4
    });
    const svg = readFileSync(r.output_path, "utf-8");
    expect(svg).toContain("<svg");
    expect(r.paths_count).toBeGreaterThanOrEqual(0);
  });

  it("upscaleRefine runs upscale on a small PNG", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const png = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const p = join(tmpRoot, "small.png");
    writeFileSync(p, png);
    const outDir = join(tmpRoot, "up-out");
    mkdirSync(outDir, { recursive: true });
    const r = await upscaleRefine({
      image: p,
      output_dir: outDir,
      target_size: 64,
      mode: "auto"
    });
    expect(existsSync(r.output_path)).toBe(true);
    expect(r.target_size).toBeGreaterThan(0);
  });
});

// Silence "unused" when certain branches don't execute because sharp is missing.
void mkdirSync;
