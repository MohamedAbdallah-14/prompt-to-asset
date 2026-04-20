import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { upscale } from "../pipeline/upscale.js";
import { safeReadPath, safeWritePath } from "../security/paths.js";
import type { UpscaleRefineInputT } from "../schemas.js";

export async function upscaleRefine(input: UpscaleRefineInputT): Promise<{
  output_path: string;
  method_used: string;
  target_size: number;
  warnings: string[];
}> {
  const imagePath = safeReadPath(input.image);
  const buf = readFileSync(imagePath);
  const result = await upscale({
    image: buf,
    ...(input.asset_type && { asset_type: input.asset_type }),
    target_size: input.target_size,
    mode: input.mode
  });
  const out = safeWritePath(
    resolve(input.output_dir ?? ".", `${basename(input.image)}.upscaled.png`)
  );
  writeFileSync(out, result.image);
  return {
    output_path: out,
    method_used: result.method_used,
    target_size: result.target_size,
    warnings: result.warnings
  };
}

function basename(p: string): string {
  const name = p.split(/[\\/]/).pop() ?? "out";
  return name.replace(/\.[^.]+$/, "");
}
