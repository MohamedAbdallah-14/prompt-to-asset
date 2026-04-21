import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nineSlice } from "./nine-slice.js";
import { loadSharp } from "../pipeline/sharp.js";

describe("asset_nine_slice", () => {
  let dir: string;
  const origCwd = process.cwd();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "p2a-nineslice-"));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("emits json + css + txt for a simple image", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const buf = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    const imgPath = join(dir, "panel.png");
    writeFileSync(imgPath, buf);

    const r = await nineSlice({
      image: imgPath,
      guides: { left: 20, top: 20, right: 20, bottom: 20 },
      android_9patch: false
    });
    expect(r.artifacts.length).toBe(3);
    expect(r.artifacts.some((a) => a.endsWith(".9slice.json"))).toBe(true);
    expect(r.artifacts.some((a) => a.endsWith(".9slice.css"))).toBe(true);
    expect(r.artifacts.some((a) => a.endsWith(".9slice.txt"))).toBe(true);
    for (const a of r.artifacts) expect(existsSync(a)).toBe(true);

    const cfg = JSON.parse(
      readFileSync(r.artifacts.find((a) => a.endsWith(".json"))!, "utf-8")
    ) as {
      size: { w: number; h: number };
      guides: { left: number };
    };
    expect(cfg.size.w).toBe(128);
    expect(cfg.guides.left).toBe(20);
  });

  it("android_9patch=true emits a .9.png with 1px padding", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const buf = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } }
    })
      .png()
      .toBuffer();
    const imgPath = join(dir, "btn.png");
    writeFileSync(imgPath, buf);

    const r = await nineSlice({
      image: imgPath,
      guides: { left: 8, top: 8, right: 8, bottom: 8 },
      android_9patch: true
    });
    expect(r.android_nine_patch).toBeTruthy();
    expect(existsSync(r.android_nine_patch!)).toBe(true);
    // .9.png is source + 2px (1 border each side).
    const meta = await sharp(readFileSync(r.android_nine_patch!)).metadata();
    expect(meta.width).toBe(66);
    expect(meta.height).toBe(66);
  });
});
