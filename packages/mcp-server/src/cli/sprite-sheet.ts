// `p2a sprite-sheet <dir>` — pack a folder of PNG frames into one sheet + JSON
// atlas. For game devs. Offline, no API key.
//
// Layouts:
//   grid  (default)  uniform cell size = max(frameW, frameH); N columns chosen
//                    to be as square as possible unless --columns is set.
//   strip            one row. Every frame is resized onto the max-frame cell.
//
// Atlas format: TexturePacker-compatible "JSON Array" schema (works in Phaser,
// PixiJS, Three.js, Godot, Unity via a lightweight importer). See
// https://phaser.io/docs/latest/Phaser.Loader.LoaderPlugin#atlas for the shape.
//
// Usage:
//   p2a sprite-sheet ./frames --out sheet.png --atlas sheet.json
//   p2a sprite-sheet ./frames --layout strip --padding 2
//   p2a sprite-sheet ./tiles --layout grid --columns 8   # tile atlas

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { resolve, basename, extname, dirname } from "node:path";
import { loadSharp } from "../pipeline/sharp.js";

interface SpriteSheetArgs {
  dir: string;
  layout: "grid" | "strip";
  columns?: number;
  padding: number;
  out: string;
  atlas: string;
  quiet: boolean;
}

interface FrameEntry {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  rotated: false;
  trimmed: false;
}

export async function spriteSheetCommand(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!args) process.exit(2);

  const sharp = await loadSharp();
  if (!sharp) {
    process.stderr.write(
      `p2a sprite-sheet: sharp is not installed. Run \`npm install sharp\` and retry.\n`
    );
    process.exit(1);
  }

  const entries = readdirSync(args.dir)
    .filter((f) => /\.(png|webp|jpg|jpeg)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (entries.length === 0) {
    process.stderr.write(`p2a sprite-sheet: no PNG/WEBP/JPG frames found in ${args.dir}\n`);
    process.exit(1);
  }

  // First pass: read every frame's metadata to establish cell size.
  const loaded: Array<{ name: string; buf: Buffer; w: number; h: number }> = [];
  for (const f of entries) {
    const p = resolve(args.dir, f);
    if (!statSync(p).isFile()) continue;
    const buf = readFileSync(p);
    const meta = await sharp(buf).metadata();
    loaded.push({ name: f, buf, w: meta.width ?? 0, h: meta.height ?? 0 });
  }

  const cellW = Math.max(...loaded.map((e) => e.w));
  const cellH = Math.max(...loaded.map((e) => e.h));

  const cols =
    args.layout === "strip" ? loaded.length : (args.columns ?? Math.ceil(Math.sqrt(loaded.length)));
  const rows = Math.ceil(loaded.length / cols);
  const pad = args.padding;
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

  const sheet = await sharp({
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

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, sheet);

  const atlas = {
    frames,
    meta: {
      app: "prompt-to-asset",
      version: "0.1.0",
      image: basename(args.out),
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
      layout: args.layout,
      cell: { w: cellW, h: cellH },
      columns: cols,
      rows,
      padding: pad
    }
  };
  mkdirSync(dirname(args.atlas), { recursive: true });
  writeFileSync(args.atlas, JSON.stringify(atlas, null, 2));

  if (!args.quiet) {
    process.stderr.write(
      `p2a sprite-sheet: packed ${loaded.length} frames → ${args.out} (${sheetW}×${sheetH}) + ${args.atlas}\n`
    );
  } else {
    process.stdout.write(
      JSON.stringify({ sheet: args.out, atlas: args.atlas, frames: loaded.length }) + "\n"
    );
  }
}

function parseArgs(argv: string[]): SpriteSheetArgs | null {
  if (argv.length === 0) {
    process.stderr.write(`p2a sprite-sheet: missing <dir> of frames\n`);
    return null;
  }
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  const dirArg = positional[0];
  if (!dirArg) {
    process.stderr.write(`p2a sprite-sheet: missing <dir> of frames\n`);
    return null;
  }
  const dir = resolve(dirArg);
  if (!statSync(dir).isDirectory()) {
    process.stderr.write(`p2a sprite-sheet: not a directory: ${dir}\n`);
    return null;
  }
  const out = typeof flags["out"] === "string" ? resolve(flags["out"]) : resolve("sprites.png");
  const atlas =
    typeof flags["atlas"] === "string" ? resolve(flags["atlas"]) : out.replace(/\.png$/i, ".json");
  const layout = flags["layout"] === "strip" ? "strip" : "grid";
  const columns = typeof flags["columns"] === "string" ? parseInt(flags["columns"], 10) : undefined;
  const padding = typeof flags["padding"] === "string" ? parseInt(flags["padding"], 10) : 0;

  return {
    dir,
    layout,
    ...(columns !== undefined ? { columns } : {}),
    padding: Number.isFinite(padding) ? padding : 0,
    out,
    atlas,
    quiet: flags["quiet"] === true
  };
}
