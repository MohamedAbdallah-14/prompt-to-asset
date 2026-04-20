import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, existsSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PollinationsProvider } from "../../packages/mcp-server/src/providers/pollinations.js";
import { ingestExternal } from "../../packages/mcp-server/src/tools/ingest-external.js";
import type { GenerateResult } from "../../packages/mcp-server/src/providers/types.js";

// Live network test against Pollinations' zero-key HTTP endpoint.
// Gated by INTEGRATION=1 so the default test run stays offline and fast.
//
// Run with: INTEGRATION=1 npm run test:run -- tests/integration
//
// Pollinations rate-limits anonymous callers to ~1 req / 15 s, so we do
// exactly ONE live generation in beforeAll and reuse its pixels across tests.
const RUN_LIVE = process.env["INTEGRATION"] === "1";
const maybe = RUN_LIVE ? describe : describe.skip;

maybe("Pollinations live (zero-key)", () => {
  let generated: GenerateResult;

  beforeAll(async () => {
    generated = await PollinationsProvider.generate("pollinations-flux", {
      prompt:
        "minimal flat vector logo mark, simple black circle, pure white background, centered, clean silhouette, no text",
      width: 512,
      height: 512,
      seed: 42
    });
  }, 60_000);

  it("returns a real image buffer with a correct magic-byte signature", () => {
    expect(generated.image).toBeInstanceOf(Buffer);
    expect(generated.image.length).toBeGreaterThan(1024);
    // Pollinations actually returns JPEG regardless of the Accept header; our
    // provider now detects the format correctly rather than claiming PNG.
    expect(["png", "jpeg", "webp"]).toContain(generated.format);
    const b = generated.image;
    if (generated.format === "png") {
      expect(b[0]).toBe(0x89);
      expect(b[1]).toBe(0x50);
      expect(b[2]).toBe(0x4e);
      expect(b[3]).toBe(0x47);
    } else if (generated.format === "jpeg") {
      expect(b[0]).toBe(0xff);
      expect(b[1]).toBe(0xd8);
      expect(b[2]).toBe(0xff);
    }
    expect(generated.native_rgba).toBe(false);
    expect(generated.native_svg).toBe(false);
  });

  it(
    "feeds the pixels through asset_ingest_external — restoration pre-pass fires on JPEG input",
    async () => {
      const outDir = mkdtempSync(join(tmpdir(), "p2a-pollinations-"));
      const inputExt = generated.format === "jpeg" ? "jpg" : generated.format;
      const imgPath = join(outDir, `input.${inputExt}`);
      writeFileSync(imgPath, generated.image);

      const bundle = await ingestExternal({
        image_path: imgPath,
        asset_type: "logo",
        output_dir: outDir,
        transparent: true,
        vector: false
      });

      expect(bundle.mode).toBe("api");
      expect(bundle.asset_type).toBe("logo");
      const master = bundle.variants.find((v) => v.format === "png");
      expect(master).toBeTruthy();
      expect(master && existsSync(master.path)).toBe(true);
      expect(master && statSync(master.path).size).toBeGreaterThan(0);

      // When the input was a JPEG, restoration pre-pass must have run.
      if (generated.format === "jpeg") {
        expect(bundle.warnings.some((w) => /restoration pre-pass/i.test(w))).toBe(true);
      }
    },
    { timeout: 60_000 }
  );
});
