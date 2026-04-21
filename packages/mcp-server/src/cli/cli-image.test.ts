import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spriteSheetCommand } from "./sprite-sheet.js";
import { nineSliceCommand } from "./nine-slice.js";
import { loadSharp } from "../pipeline/sharp.js";

class ProcessExit extends Error {
  code: number;
  constructor(code: number) {
    super(`ProcessExit(${code})`);
    this.code = code;
  }
}

function captureIo() {
  const out: string[] = [];
  const err: string[] = [];
  const outSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      out.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      err.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  const exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation(((_code?: number) => {
      throw new ProcessExit(_code ?? 0);
    }) as typeof process.exit);
  return {
    out,
    err,
    restore: () => {
      outSpy.mockRestore();
      errSpy.mockRestore();
      exitSpy.mockRestore();
    }
  };
}

let tmp: string;
let io: ReturnType<typeof captureIo>;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "p2a-cli-img-"));
  io = captureIo();
});
afterEach(() => {
  io.restore();
  rmSync(tmp, { recursive: true, force: true });
});

async function writePng(path: string, w: number, h: number): Promise<void> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp unavailable");
  const buf = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .png()
    .toBuffer();
  writeFileSync(path, buf);
}

describe("cli/sprite-sheet", () => {
  it("missing dir exits with 2", async () => {
    await expect(spriteSheetCommand([])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("missing <dir>");
  });

  it("empty dir exits with 1", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    await expect(spriteSheetCommand([tmp])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toMatch(/no PNG\/WEBP\/JPG frames found/);
  });

  it("packs frames into a grid sheet + atlas", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    await writePng(join(tmp, "a.png"), 16, 16);
    await writePng(join(tmp, "b.png"), 16, 16);
    await writePng(join(tmp, "c.png"), 16, 16);

    const out = join(tmp, "out", "sheet.png");
    const atlas = join(tmp, "out", "sheet.json");
    await spriteSheetCommand([tmp, "--out", out, "--atlas", atlas, "--padding", "2", "--columns", "2"]);
    expect(existsSync(out)).toBe(true);
    const parsed = JSON.parse(readFileSync(atlas, "utf-8"));
    expect(Object.keys(parsed.frames).length).toBe(3);
    expect(parsed.meta.columns).toBe(2);
    expect(parsed.meta.layout).toBe("grid");
  });

  it("strip layout and --quiet JSON output", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    await writePng(join(tmp, "a.png"), 8, 8);
    await writePng(join(tmp, "b.png"), 8, 8);
    const out = join(tmp, "strip.png");
    const atlas = join(tmp, "strip.json");
    await spriteSheetCommand([tmp, "--layout", "strip", "--out", out, "--atlas", atlas, "--quiet"]);
    const line = io.out.join("");
    const parsed = JSON.parse(line);
    expect(parsed.frames).toBe(2);
    const a = JSON.parse(readFileSync(atlas, "utf-8"));
    expect(a.meta.layout).toBe("strip");
  });

  it("non-directory path exits with 2", async () => {
    const f = join(tmp, "not-a-dir.txt");
    writeFileSync(f, "x");
    await expect(spriteSheetCommand([f])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toMatch(/not a directory/);
  });
});

describe("cli/nine-slice", () => {
  it("missing image exits with 2", async () => {
    await expect(nineSliceCommand([])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("missing <image>");
  });

  it("non-existent image exits with 1", async () => {
    await expect(
      nineSliceCommand([resolve(tmp, "missing.png"), "--guides", "1,2,3,4"])
    ).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("not found");
  });

  it("emits json/css/txt for a valid image + guides", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const img = join(tmp, "panel.png");
    await writePng(img, 64, 64);
    const outDir = join(tmp, "out");
    await nineSliceCommand([img, "--guides", "8,8,8,8", "--out", outDir]);
    expect(existsSync(join(outDir, "panel.9slice.json"))).toBe(true);
    expect(existsSync(join(outDir, "panel.9slice.css"))).toBe(true);
    expect(existsSync(join(outDir, "panel.9slice.txt"))).toBe(true);
    const cfg = JSON.parse(readFileSync(join(outDir, "panel.9slice.json"), "utf-8"));
    expect(cfg.size.w).toBe(64);
    expect(cfg.guides.left).toBe(8);
  });

  it("with --android-9patch emits a .9.png", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const img = join(tmp, "panel.png");
    await writePng(img, 64, 64);
    const outDir = join(tmp, "out2");
    await nineSliceCommand([
      img,
      "--guides",
      "8,8,8,8",
      "--out",
      outDir,
      "--android-9patch"
    ]);
    expect(existsSync(join(outDir, "panel.9.png"))).toBe(true);
  });

  it("supports individual --left/--top/--right/--bottom flags", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const img = join(tmp, "panel.png");
    await writePng(img, 32, 32);
    const outDir = join(tmp, "out3");
    await nineSliceCommand([
      img,
      "--left",
      "4",
      "--top",
      "4",
      "--right",
      "4",
      "--bottom",
      "4",
      "--out",
      outDir
    ]);
    const cfg = JSON.parse(readFileSync(join(outDir, "panel.9slice.json"), "utf-8"));
    expect(cfg.guides.left).toBe(4);
  });

  it("bad --guides format returns null (exit 2)", async () => {
    const sharp = await loadSharp();
    if (!sharp) return;
    const img = join(tmp, "panel.png");
    await writePng(img, 32, 32);
    await expect(
      nineSliceCommand([img, "--guides", "1,2,3"])
    ).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toMatch(/--guides/);
  });
});
