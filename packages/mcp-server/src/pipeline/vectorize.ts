import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSharp } from "./sharp.js";
import { optimizeSvg } from "./svgo.js";

/**
 * Vectorize — raster to SVG.
 *
 * Source: docs/research/12-vector-svg-generation/12b-raster-to-svg-tracers.md
 * Source: docs/research/08-logo-generation/8e-svg-vector-logo-pipeline.md
 * Source: docs/research/16-background-removal-vectorization/16c-vectorization-tooling-production.md
 *
 * Four paths, tried in priority:
 *   1. Recraft /vectorize (hosted) — best quality, needs PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL.
 *   2. vtracer (CLI on PATH) — multi-color polygon/spline. `brew install vtracer` or `cargo install vtracer`.
 *   3. potrace (CLI on PATH) — 1-bit only, high-quality curves. `brew install potrace`.
 *   4. Built-in posterize run-length fallback — ships with zero dependencies.
 *      Warns the caller; paths count will blow the ≤40 budget for complex images.
 *
 * SVGO cleanup runs on all outputs when the `svgo` optional dep is installed.
 */
export interface VectorizeInput {
  image: Buffer;
  mode?: "auto" | "recraft" | "vtracer" | "potrace" | "posterize";
  palette_size?: number;
  max_paths?: number;
}

export interface VectorizeResult {
  svg: string;
  paths_count: number;
  colors_used: number;
  method_used: string;
  warnings: string[];
}

export async function vectorize(input: VectorizeInput): Promise<VectorizeResult> {
  const sharp = await loadSharp();
  if (!sharp) {
    return {
      svg: placeholderSvg(input.image.byteLength),
      paths_count: 1,
      colors_used: 1,
      method_used: "placeholder",
      warnings: ["sharp not installed; vectorize returned a placeholder SVG"]
    };
  }

  const mode = input.mode ?? "auto";

  // 1. Recraft (hosted)
  const recraftUrl = process.env["PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL"];
  if ((mode === "recraft" || mode === "auto") && recraftUrl) {
    try {
      const resp = await fetch(recraftUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: input.image as unknown as ArrayBuffer
      });
      if (resp.ok) {
        const svg = await resp.text();
        const cleaned = await optimizeSvg(svg);
        return {
          svg: cleaned.svg,
          paths_count: countPaths(cleaned.svg),
          colors_used: countSvgColors(cleaned.svg),
          method_used: "recraft",
          warnings: cleaned.warnings
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2. vtracer via PATH
  if (mode === "vtracer" || mode === "auto") {
    const vt = await runVtracer(input.image, input.max_paths);
    if (vt) return vt;
    if (mode === "vtracer") {
      return {
        svg: placeholderSvg(input.image.byteLength),
        paths_count: 1,
        colors_used: 1,
        method_used: "vtracer_missing",
        warnings: [
          "mode=vtracer requested but `vtracer` binary not found on PATH. Install with `cargo install vtracer` or `brew install vtracer`."
        ]
      };
    }
  }

  // 3. potrace via PATH
  if (mode === "potrace" || mode === "auto") {
    const pt = await runPotrace(input.image);
    if (pt) return pt;
    if (mode === "potrace") {
      return {
        svg: placeholderSvg(input.image.byteLength),
        paths_count: 1,
        colors_used: 1,
        method_used: "potrace_missing",
        warnings: [
          "mode=potrace requested but `potrace` binary not found on PATH. Install with `brew install potrace` or your package manager."
        ]
      };
    }
  }

  // 4. built-in fallback
  return posterizeToSvg(sharp, input);
}

async function runVtracer(image: Buffer, maxPaths?: number): Promise<VectorizeResult | null> {
  const bin = await whichBinary("vtracer");
  if (!bin) return null;
  const sharp = await loadSharp();
  if (!sharp) return null;

  const dir = mkdtempSync(join(tmpdir(), "p2a-vtracer-"));
  const inPath = join(dir, "in.png");
  const outPath = join(dir, "out.svg");
  try {
    // vtracer requires PNG input; re-encode whatever we received.
    const png = await sharp(image).png().toBuffer();
    writeFileSync(inPath, png);

    const args = [
      "--input",
      inPath,
      "--output",
      outPath,
      "--mode",
      "polygon",
      "--filter_speckle",
      "4",
      "--color_precision",
      "6",
      "--gradient_step",
      "10",
      "--corner_threshold",
      "60",
      "--segment_length",
      "4",
      "--splice_threshold",
      "45"
    ];
    const { code, stderr } = await runProcess(bin, args, 30_000);
    if (code !== 0) {
      return {
        svg: placeholderSvg(image.byteLength),
        paths_count: 1,
        colors_used: 1,
        method_used: "vtracer_failed",
        warnings: [`vtracer exit ${code}: ${stderr.slice(0, 200)}`]
      };
    }
    const svg = readFileSync(outPath, "utf8");
    const cleaned = await optimizeSvg(svg);
    const pathsCount = countPaths(cleaned.svg);
    const warnings = [...cleaned.warnings];
    if (maxPaths !== undefined && pathsCount > maxPaths) {
      warnings.push(
        `vtracer emitted ${pathsCount} paths, over max_paths=${maxPaths}. Increase --filter_speckle or simplify the source.`
      );
    }
    return {
      svg: cleaned.svg,
      paths_count: pathsCount,
      colors_used: countSvgColors(cleaned.svg),
      method_used: "vtracer",
      warnings
    };
  } finally {
    cleanupDir(dir, [inPath, outPath]);
  }
}

async function runPotrace(image: Buffer): Promise<VectorizeResult | null> {
  const bin = await whichBinary("potrace");
  if (!bin) return null;
  const sharp = await loadSharp();
  if (!sharp) return null;

  const dir = mkdtempSync(join(tmpdir(), "p2a-potrace-"));
  const pbmPath = join(dir, "in.pbm");
  const outPath = join(dir, "out.svg");
  try {
    // potrace reads PBM natively; sharp can't emit PBM, so we produce raw
    // thresholded greyscale and encode the P4 header + packed bits ourselves.
    const { data: greyscale, info } = await sharp(image)
      .greyscale()
      .threshold(128)
      .raw()
      .toBuffer({ resolveWithObject: true });
    writeFileSync(pbmPath, encodePbmP4(greyscale, info.width, info.height));

    const args = ["-s", "-o", outPath, "--flat", pbmPath];
    const { code, stderr } = await runProcess(bin, args, 30_000);
    if (code !== 0) {
      return {
        svg: placeholderSvg(image.byteLength),
        paths_count: 1,
        colors_used: 1,
        method_used: "potrace_failed",
        warnings: [`potrace exit ${code}: ${stderr.slice(0, 200)}`]
      };
    }
    const svg = readFileSync(outPath, "utf8");
    const cleaned = await optimizeSvg(svg);
    const warnings = ["potrace is 1-bit only; colored detail was dropped.", ...cleaned.warnings];
    return {
      svg: cleaned.svg,
      paths_count: countPaths(cleaned.svg),
      colors_used: 1,
      method_used: "potrace",
      warnings
    };
  } finally {
    cleanupDir(dir, [pbmPath, outPath]);
  }
}

function encodePbmP4(greyscale: Buffer, w: number, h: number): Buffer {
  // PBM P4: `P4\n<w> <h>\n<packed bits>`. Each byte packs 8 pixels MSB-first;
  // 1 = black, 0 = white. Sharp's threshold-grey output is 0 (black) or 255.
  const bytesPerRow = Math.ceil(w / 8);
  const body = Buffer.alloc(bytesPerRow * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (greyscale[y * w + x] === 0) {
        body[y * bytesPerRow + (x >> 3)]! |= 1 << (7 - (x & 7));
      }
    }
  }
  return Buffer.concat([Buffer.from(`P4\n${w} ${h}\n`), body]);
}

async function whichBinary(name: string): Promise<string | null> {
  const cmd = process.platform === "win32" ? "where" : "which";
  const { code, stdout } = await runProcess(cmd, [name], 2_000).catch(() => ({
    code: 1,
    stdout: "",
    stderr: ""
  }));
  if (code !== 0) return null;
  const first = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
  return first ? first.trim() : null;
}

function runProcess(
  bin: string,
  args: string[],
  timeoutMs: number
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const to = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        reject(new Error(`process ${bin} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(to);
        reject(err);
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(to);
        resolve({ code: code ?? -1, stdout, stderr });
      }
    });
  });
}

function cleanupDir(dir: string, files: string[]): void {
  for (const f of files) {
    try {
      unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
  try {
    rmdirSync(dir);
  } catch {
    /* ignore */
  }
}

async function posterizeToSvg(
  sharp: typeof import("sharp"),
  input: VectorizeInput
): Promise<VectorizeResult> {
  const paletteSize = input.palette_size ?? 6;
  const meta = await sharp(input.image).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) {
    return {
      svg: placeholderSvg(input.image.byteLength),
      paths_count: 1,
      colors_used: 1,
      method_used: "posterize_failed",
      warnings: ["could not read image dimensions"]
    };
  }

  // Downscale for speed; real vectorize pipelines do the same.
  const scale = Math.min(128, Math.max(32, Math.round((128 * Math.max(w, h)) / Math.max(w, h))));
  const raw = await sharp(input.image)
    .resize(scale, scale, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = raw.data;
  const rw = raw.info.width;
  const rh = raw.info.height;

  // Quantize to paletteSize colors via a simple variance-cut (median cut stub)
  const palette = quantize(pixels, paletteSize);
  const assignments = assignColors(pixels, palette);

  // Emit one <path> per color consisting of a big `M/L`-composed polygon of all pixels.
  // For a real skill this is inefficient; this is a placeholder. Paths count = palette size.
  const paths: string[] = [];
  for (let c = 0; c < palette.length; c++) {
    const hex = "#" + palette[c]!.map((v) => v.toString(16).padStart(2, "0")).join("");
    const rects: string[] = [];
    for (let y = 0; y < rh; y++) {
      let runStart = -1;
      for (let x = 0; x < rw; x++) {
        const idx = y * rw + x;
        if (assignments[idx] === c) {
          if (runStart === -1) runStart = x;
        } else if (runStart !== -1) {
          rects.push(
            `M${runStart * (w / rw)} ${y * (h / rh)}h${(x - runStart) * (w / rw)}v${h / rh}H${runStart * (w / rw)}Z`
          );
          runStart = -1;
        }
      }
      if (runStart !== -1) {
        rects.push(
          `M${runStart * (w / rw)} ${y * (h / rh)}h${(rw - runStart) * (w / rw)}v${h / rh}H${runStart * (w / rw)}Z`
        );
      }
    }
    if (rects.length > 0) {
      paths.push(`<path fill="${hex}" d="${rects.join("")}"/>`);
    }
  }

  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${paths.join("")}</svg>`;
  const cleaned = await optimizeSvg(rawSvg);
  return {
    svg: cleaned.svg,
    paths_count: paths.length,
    colors_used: palette.length,
    method_used: "posterize_runlength",
    warnings: [
      "used local posterize fallback (run-length rectangles per color). Install `vtracer` (preferred) or `potrace` on PATH, or set PROMPT_TO_BUNDLE_RECRAFT_VECTORIZE_URL, for production quality.",
      ...cleaned.warnings
    ]
  };
}

function quantize(pixels: Buffer, k: number): Array<[number, number, number]> {
  // Very small k-means: random seed; 4 iterations. Good enough for posterize stub.
  const n = pixels.length / 3;
  const centers: Array<[number, number, number]> = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i / k) * n);
    centers.push([pixels[idx * 3] ?? 0, pixels[idx * 3 + 1] ?? 0, pixels[idx * 3 + 2] ?? 0]);
  }
  for (let iter = 0; iter < 4; iter++) {
    const sums: Array<[number, number, number, number]> = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const r = pixels[i * 3] ?? 0;
      const g = pixels[i * 3 + 1] ?? 0;
      const b = pixels[i * 3 + 2] ?? 0;
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const cc = centers[c]!;
        const d = (r - cc[0]) ** 2 + (g - cc[1]) ** 2 + (b - cc[2]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const s = sums[best]!;
      s[0] += r;
      s[1] += g;
      s[2] += b;
      s[3]++;
    }
    for (let c = 0; c < centers.length; c++) {
      const s = sums[c]!;
      if (s[3] > 0) {
        centers[c] = [Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3])];
      }
    }
  }
  return centers;
}

function assignColors(pixels: Buffer, palette: Array<[number, number, number]>): Uint8Array {
  const n = pixels.length / 3;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = pixels[i * 3] ?? 0;
    const g = pixels[i * 3 + 1] ?? 0;
    const b = pixels[i * 3 + 2] ?? 0;
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < palette.length; c++) {
      const cc = palette[c]!;
      const d = (r - cc[0]) ** 2 + (g - cc[1]) ** 2 + (b - cc[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    out[i] = best;
  }
  return out;
}

function countPaths(svg: string): number {
  const m = svg.match(/<path\b/g);
  return m ? m.length : 0;
}

function countSvgColors(svg: string): number {
  const m = svg.match(/fill\s*=\s*"(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)"/g);
  return m ? new Set(m).size : 1;
}

function placeholderSvg(bytes: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><!-- placeholder; ${bytes} input bytes --><rect width="100" height="100" fill="#888"/></svg>`;
}
