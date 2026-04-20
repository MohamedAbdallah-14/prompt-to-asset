// `p2a nine-slice <image>` — emit a 9-slice config + CSS border-image snippet
// from an image and 4 guide pixel offsets. Offline. For game UI / web panels.
//
// Output:
//   <name>.9slice.json   canonical config { image, guides: {l,t,r,b}, size }
//   <name>.9slice.css    CSS border-image snippet
//   <name>.9slice.txt    Unity / Godot-friendly numbers you can paste into an importer
//
// Android 9-patch PNG is a different format (adds a 1px border encoding the
// stretchable regions as black pixels). Support for that is gated behind
// `--android-9patch`.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, basename, extname, dirname as pathDirname } from "node:path";
import { loadSharp } from "../pipeline/sharp.js";

interface NineSliceArgs {
  image: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  out: string;
  android9patch: boolean;
}

export async function nineSliceCommand(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!args) process.exit(2);

  if (!existsSync(args.image)) {
    process.stderr.write(`p2a nine-slice: image not found: ${args.image}\n`);
    process.exit(1);
  }

  const sharp = await loadSharp();
  if (!sharp) {
    process.stderr.write(`p2a nine-slice: sharp is not installed.\n`);
    process.exit(1);
  }

  const meta = await sharp(readFileSync(args.image)).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const stem = basename(args.image, extname(args.image));
  const outDir = args.out;
  mkdirSync(outDir, { recursive: true });

  const config = {
    image: basename(args.image),
    size: { w, h },
    guides: { left: args.left, top: args.top, right: args.right, bottom: args.bottom },
    scale_regions: {
      center: {
        x: args.left,
        y: args.top,
        w: w - args.left - args.right,
        h: h - args.top - args.bottom
      },
      top: { x: args.left, y: 0, w: w - args.left - args.right, h: args.top },
      bottom: {
        x: args.left,
        y: h - args.bottom,
        w: w - args.left - args.right,
        h: args.bottom
      },
      left: { x: 0, y: args.top, w: args.left, h: h - args.top - args.bottom },
      right: {
        x: w - args.right,
        y: args.top,
        w: args.right,
        h: h - args.top - args.bottom
      }
    }
  };
  const jsonPath = resolve(outDir, `${stem}.9slice.json`);
  writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // CSS border-image uses top/right/bottom/left order.
  const css = `.${stem} {
  border-image-source: url("${basename(args.image)}");
  border-image-slice: ${args.top} ${args.right} ${args.bottom} ${args.left} fill;
  border-image-width: ${args.top}px ${args.right}px ${args.bottom}px ${args.left}px;
  border-image-repeat: stretch;
}`;
  const cssPath = resolve(outDir, `${stem}.9slice.css`);
  writeFileSync(cssPath, css);

  const txt = `9-slice for ${basename(args.image)} (${w}×${h})

Guides (pixels from edge):
  left   ${args.left}
  top    ${args.top}
  right  ${args.right}
  bottom ${args.bottom}

Unity Sprite Editor (Border fields): L=${args.left} T=${args.top} R=${args.right} B=${args.bottom}
Godot AtlasTexture / NinePatchRect: patch_margin_left=${args.left} _top=${args.top} _right=${args.right} _bottom=${args.bottom}
Phaser 3 NineSlice:   leftWidth=${args.left}, rightWidth=${args.right}, topHeight=${args.top}, bottomHeight=${args.bottom}
PixiJS NineSliceSprite: leftWidth=${args.left} topHeight=${args.top} rightWidth=${args.right} bottomHeight=${args.bottom}
`;
  const txtPath = resolve(outDir, `${stem}.9slice.txt`);
  writeFileSync(txtPath, txt);

  const artifacts = [jsonPath, cssPath, txtPath];

  if (args.android9patch) {
    // Android 9-patch: add a 1px border where black pixels along top/left mark
    // stretchable regions and black pixels along bottom/right mark content.
    const bordered = await makeNinePatch(
      sharp,
      readFileSync(args.image),
      w,
      h,
      args.left,
      args.top,
      args.right,
      args.bottom
    );
    const ninePath = resolve(outDir, `${stem}.9.png`);
    writeFileSync(ninePath, bordered);
    artifacts.push(ninePath);
  }

  for (const p of artifacts) process.stdout.write(`  ${p}\n`);
  process.stderr.write(`p2a nine-slice: wrote ${artifacts.length} files\n`);
}

async function makeNinePatch(
  sharp: typeof import("sharp"),
  imageBuf: Buffer,
  w: number,
  h: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): Promise<Buffer> {
  // Pad 1px transparent border.
  const padded = await sharp(imageBuf)
    .extend({
      top: 1,
      bottom: 1,
      left: 1,
      right: 1,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const stretchX = Math.max(1, w - left - right);
  const stretchY = Math.max(1, h - top - bottom);
  const contentX = stretchX;
  const contentY = stretchY;

  const makeBlackStrip = (sw: number, sh: number): Promise<Buffer> =>
    sharp({
      create: { width: sw, height: sh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();

  const [topBar, leftBar, bottomBar, rightBar] = await Promise.all([
    makeBlackStrip(stretchX, 1),
    makeBlackStrip(1, stretchY),
    makeBlackStrip(contentX, 1),
    makeBlackStrip(1, contentY)
  ]);

  return sharp(padded)
    .composite([
      { input: topBar, left: 1 + left, top: 0 },
      { input: leftBar, left: 0, top: 1 + top },
      { input: bottomBar, left: 1 + left, top: h + 1 },
      { input: rightBar, left: w + 1, top: 1 + top }
    ])
    .png()
    .toBuffer();
}

function parseArgs(argv: string[]): NineSliceArgs | null {
  if (argv.length === 0) {
    process.stderr.write(`p2a nine-slice: missing <image>\n`);
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
  const img = positional[0];
  if (!img) {
    process.stderr.write(`p2a nine-slice: missing <image>\n`);
    return null;
  }

  // --guides L,T,R,B is the nice ergonomic form.
  let L = 0,
    T = 0,
    R = 0,
    B = 0;
  if (typeof flags["guides"] === "string") {
    const parts = flags["guides"].split(",").map((s) => parseInt(s.trim(), 10));
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      process.stderr.write(
        `p2a nine-slice: --guides must be "left,top,right,bottom" (4 ints). Got "${flags["guides"]}".\n`
      );
      return null;
    }
    [L, T, R, B] = parts as [number, number, number, number];
  } else {
    L = intFlag(flags["left"], 0);
    T = intFlag(flags["top"], 0);
    R = intFlag(flags["right"], 0);
    B = intFlag(flags["bottom"], 0);
  }

  const out =
    typeof flags["out"] === "string" ? resolve(flags["out"]) : resolve(pathDirname(resolve(img)));

  return {
    image: resolve(img),
    left: L,
    top: T,
    right: R,
    bottom: B,
    out,
    android9patch: flags["android-9patch"] === true
  };
}

function intFlag(v: unknown, def: number): number {
  if (typeof v !== "string") return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
