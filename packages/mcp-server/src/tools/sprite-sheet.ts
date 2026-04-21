// Tool: asset_sprite_sheet
//
// Pack a directory of PNG/WEBP/JPG frames into one sprite sheet plus a
// TexturePacker-compatible JSON atlas (works in Phaser, PixiJS, Three.js,
// Godot, Unity via a light importer).
//
// MCP equivalent of `p2a sprite-sheet <dir>`. Offline, no API key, purely
// sharp-driven rasterization.

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { resolve, basename, extname, dirname } from "node:path";
import type { SpriteSheetInputT } from "../schemas.js";
import { loadSharp } from "../pipeline/sharp.js";
import { safeReadPath } from "../security/paths.js";

interface FrameEntry {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  rotated: false;
  trimmed: false;
}

export interface SpriteSheetResult {
  sheet_path: string;
  atlas_path: string;
  frames: number;
  sheet_size: { w: number; h: number };
  cell_size: { w: number; h: number };
  columns: number;
  rows: number;
  layout: "grid" | "strip";
  padding: number;
}

export async function spriteSheet(input: SpriteSheetInputT): Promise<SpriteSheetResult> {
  const dir = safeReadPath(input.dir);
  if (!statSync(dir).isDirectory()) {
    throw new Error(`asset_sprite_sheet: not a directory: ${dir}`);
  }

  const sharp = await loadSharp();
  if (!sharp) {
    throw new Error(
      "asset_sprite_sheet: sharp is not installed. Run `npm install sharp` and retry."
    );
  }

  const entries = readdirSync(dir)
    .filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (entries.length === 0) {
    throw new Error(`asset_sprite_sheet: no PNG/WEBP/JPG frames found in ${dir}`);
  }

  // Read every frame up front so we can compute a uniform cell size.
  const loaded: Array<{ name: string; buf: Buffer; w: number; h: number }> = [];
  for (const f of entries) {
    const p = resolve(dir, f);
    if (!statSync(p).isFile()) continue;
    const buf = readFileSync(p);
    const meta = await sharp(buf).metadata();
    loaded.push({ name: f, buf, w: meta.width ?? 0, h: meta.height ?? 0 });
  }

  const cellW = Math.max(...loaded.map((e) => e.w));
  const cellH = Math.max(...loaded.map((e) => e.h));
  const layout = input.layout ?? "grid";
  const cols =
    layout === "strip" ? loaded.length : (input.columns ?? Math.ceil(Math.sqrt(loaded.length)));
  const rows = Math.ceil(loaded.length / cols);
  const pad = input.padding ?? 0;
  const sheetW = cols * cellW + (cols + 1) * pad;
  const sheetH = rows * cellH + (rows + 1) * pad;

  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  const frames: Record<string, FrameEntry> = {};
  for (let i = 0; i < loaded.length; i++) {
    const e = loaded[i];
    if (!e) continue;
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Center smaller frames inside their cell so atlas coords stay uniform.
    const offX = pad + col * (cellW + pad) + Math.floor((cellW - e.w) / 2);
    const offY = pad + row * (cellH + pad) + Math.floor((cellH - e.h) / 2);
    composites.push({ input: e.buf, left: offX, top: offY });
    const key = basename(e.name, extname(e.name));
    frames[key] = {
      filename: e.name,
      frame: { x: offX, y: offY, w: e.w, h: e.h },
      sourceSize: { w: e.w, h: e.h },
      rotated: false,
      trimmed: false
    };
  }

  const sheetBuf = await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  const outSheet = input.out ? resolve(input.out) : resolve(process.cwd(), "sprites.png");
  const outAtlas = input.atlas ? resolve(input.atlas) : outSheet.replace(/\.png$/i, ".json");

  mkdirSync(dirname(outSheet), { recursive: true });
  writeFileSync(outSheet, sheetBuf);

  const atlas = {
    frames,
    meta: {
      app: "prompt-to-asset",
      version: "0.2.1",
      image: basename(outSheet),
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
      layout,
      cell: { w: cellW, h: cellH },
      columns: cols,
      rows,
      padding: pad
    }
  };
  mkdirSync(dirname(outAtlas), { recursive: true });
  writeFileSync(outAtlas, JSON.stringify(atlas, null, 2));

  return {
    sheet_path: outSheet,
    atlas_path: outAtlas,
    frames: loaded.length,
    sheet_size: { w: sheetW, h: sheetH },
    cell_size: { w: cellW, h: cellH },
    columns: cols,
    rows,
    layout,
    padding: pad
  };
}
