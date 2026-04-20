import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { vectorize as vec } from "../pipeline/vectorize.js";
import { safeReadPath, safeWritePath } from "../security/paths.js";
import { assertSafeSvg } from "../security/svg-sanitize.js";
import type { VectorizeInputT } from "../schemas.js";

export async function vectorizeImage(input: VectorizeInputT): Promise<{
  output_path: string;
  paths_count: number;
  colors_used: number;
  method_used: string;
  warnings: string[];
}> {
  const imagePath = safeReadPath(input.image);
  const buf = readFileSync(imagePath);
  const result = await vec({
    image: buf,
    mode: input.mode,
    palette_size: input.palette_size,
    max_paths: input.max_paths
  });
  // Defense-in-depth: vtracer/potrace output is deterministic and shouldn't
  // contain scripts, but the pipeline also accepts third-party "recraft"
  // traced SVGs. Sanitize before write regardless of source.
  assertSafeSvg(result.svg);
  const out = safeWritePath(resolve(input.output_dir ?? ".", `${basename(input.image)}.svg`));
  writeFileSync(out, result.svg);
  return {
    output_path: out,
    paths_count: result.paths_count,
    colors_used: result.colors_used,
    method_used: result.method_used,
    warnings: result.warnings
  };
}

function basename(p: string): string {
  const name = p.split(/[\\/]/).pop() ?? "out";
  return name.replace(/\.[^.]+$/, "");
}
