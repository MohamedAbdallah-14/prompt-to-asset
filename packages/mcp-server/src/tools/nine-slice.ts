// Tool: asset_nine_slice
//
// Emit a 9-slice config plus CSS border-image snippet plus Unity / Godot /
// Phaser / PixiJS-ready numbers from one image and 4 guide offsets (in pixels
// from the edge). Optionally also emit an Android .9.png with the 1px
// stretchable-region encoding.
//
// MCP equivalent of `p2a nine-slice <image>`. Game UI / web panels.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, basename, extname, dirname as pathDirname } from "node:path";
import type { NineSliceInputT } from "../schemas.js";
import { loadSharp } from "../pipeline/sharp.js";
import { safeReadPath } from "../security/paths.js";

export interface NineSliceResult {
  image: string;
  size: { w: number; h: number };
  guides: { left: number; top: number; right: number; bottom: number };
  artifacts: string[];
  android_nine_patch?: string;
}

export async function nineSlice(input: NineSliceInputT): Promise<NineSliceResult> {
  const imagePath = safeReadPath(input.image);
  if (!existsSync(imagePath)) {
    throw new Error(`asset_nine_slice: image not found: ${imagePath}`);
  }

  const sharp = await loadSharp();
  if (!sharp) {
    throw new Error("asset_nine_slice: sharp is not installed.");
  }

  const meta = await sharp(readFileSync(imagePath)).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const stem = basename(imagePath, extname(imagePath));
  const outDir = input.out ? resolve(input.out) : pathDirname(imagePath);
  mkdirSync(outDir, { recursive: true });

  const { left, top, right, bottom } = input.guides;

  const config = {
    image: basename(imagePath),
    size: { w, h },
    guides: { left, top, right, bottom },
    scale_regions: {
      center: { x: left, y: top, w: w - left - right, h: h - top - bottom },
      top: { x: left, y: 0, w: w - left - right, h: top },
      bottom: { x: left, y: h - bottom, w: w - left - right, h: bottom },
      left: { x: 0, y: top, w: left, h: h - top - bottom },
      right: { x: w - right, y: top, w: right, h: h - top - bottom }
    }
  };
  const jsonPath = resolve(outDir, `${stem}.9slice.json`);
  writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // CSS border-image uses top/right/bottom/left order (unlike everything else).
  const css = `.${stem} {
  border-image-source: url("${basename(imagePath)}");
  border-image-slice: ${top} ${right} ${bottom} ${left} fill;
  border-image-width: ${top}px ${right}px ${bottom}px ${left}px;
  border-image-repeat: stretch;
}`;
  const cssPath = resolve(outDir, `${stem}.9slice.css`);
  writeFileSync(cssPath, css);

  const txt = `9-slice for ${basename(imagePath)} (${w}×${h})

Guides (pixels from edge):
  left   ${left}
  top    ${top}
  right  ${right}
  bottom ${bottom}

Unity Sprite Editor (Border fields): L=${left} T=${top} R=${right} B=${bottom}
Godot AtlasTexture / NinePatchRect: patch_margin_left=${left} _top=${top} _right=${right} _bottom=${bottom}
Phaser 3 NineSlice:   leftWidth=${left}, rightWidth=${right}, topHeight=${top}, bottomHeight=${bottom}
PixiJS NineSliceSprite: leftWidth=${left} topHeight=${top} rightWidth=${right} bottomHeight=${bottom}
`;
  const txtPath = resolve(outDir, `${stem}.9slice.txt`);
  writeFileSync(txtPath, txt);

  const artifacts = [jsonPath, cssPath, txtPath];
  const result: NineSliceResult = {
    image: imagePath,
    size: { w, h },
    guides: { left, top, right, bottom },
    artifacts
  };

  if (input.android_9patch) {
    const bordered = await makeNinePatch(
      sharp,
      readFileSync(imagePath),
      w,
      h,
      left,
      top,
      right,
      bottom
    );
    const ninePath = resolve(outDir, `${stem}.9.png`);
    writeFileSync(ninePath, bordered);
    artifacts.push(ninePath);
    result.android_nine_patch = ninePath;
  }

  return result;
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
  // Android 9-patch: pad 1px on every side, then draw black strips on
  // top/left (stretchable regions) and bottom/right (content regions).
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

  const makeBlackStrip = (sw: number, sh: number): Promise<Buffer> =>
    sharp({
      create: { width: sw, height: sh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    })
      .png()
      .toBuffer();

  const [topBar, leftBar, bottomBar, rightBar] = await Promise.all([
    makeBlackStrip(stretchX, 1),
    makeBlackStrip(1, stretchY),
    makeBlackStrip(stretchX, 1),
    makeBlackStrip(1, stretchY)
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
