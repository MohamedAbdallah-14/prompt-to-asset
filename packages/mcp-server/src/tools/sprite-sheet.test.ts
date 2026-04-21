import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spriteSheet } from "./sprite-sheet.js";
import { loadSharp } from "../pipeline/sharp.js";

describe("asset_sprite_sheet", () => {
  let dir: string;
  const origCwd = process.cwd();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "p2a-sprite-"));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("throws when the directory has no image frames", async () => {
    const empty = join(dir, "empty");
    mkdirSync(empty);
    await expect(spriteSheet({ dir: empty, layout: "grid", padding: 0 })).rejects.toThrow(
      /no PNG\/WEBP\/JPG frames/
    );
  });

  it("packs 4 frames into a 2x2 grid", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const frameDir = join(dir, "frames");
    mkdirSync(frameDir);
    for (let i = 0; i < 4; i++) {
      const buf = await sharp({
        create: {
          width: 32,
          height: 32,
          channels: 4,
          background: { r: i * 60, g: 0, b: 0, alpha: 1 }
        }
      })
        .png()
        .toBuffer();
      writeFileSync(join(frameDir, `frame-${i}.png`), buf);
    }
    const r = await spriteSheet({
      dir: frameDir,
      layout: "grid",
      padding: 0,
      out: join(dir, "sheet.png"),
      atlas: join(dir, "sheet.json")
    });
    expect(r.frames).toBe(4);
    expect(r.layout).toBe("grid");
    expect(r.columns).toBe(2);
    expect(r.rows).toBe(2);
    expect(existsSync(r.sheet_path)).toBe(true);
    expect(existsSync(r.atlas_path)).toBe(true);
    const atlas = JSON.parse(readFileSync(r.atlas_path, "utf-8")) as {
      frames: Record<string, unknown>;
    };
    expect(Object.keys(atlas.frames).length).toBe(4);
  });

  it("strip layout puts everything on one row", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const frameDir = join(dir, "frames");
    mkdirSync(frameDir);
    for (let i = 0; i < 3; i++) {
      const buf = await sharp({
        create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
      })
        .png()
        .toBuffer();
      writeFileSync(join(frameDir, `f-${i}.png`), buf);
    }
    const r = await spriteSheet({
      dir: frameDir,
      layout: "strip",
      padding: 0,
      out: join(dir, "strip.png")
    });
    expect(r.rows).toBe(1);
    expect(r.columns).toBe(3);
  });
});
