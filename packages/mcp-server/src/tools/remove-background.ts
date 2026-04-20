import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { matte } from "../pipeline/matte.js";
import type { RemoveBackgroundInputT } from "../schemas.js";

export async function removeBackground(input: RemoveBackgroundInputT): Promise<{
  output_path: string;
  alpha_coverage: number;
  method_used: string;
  warnings: string[];
}> {
  const buf = readFileSync(resolve(input.image));
  const result = await matte({ image: buf, mode: input.mode });
  const out = resolve(input.output_dir ?? ".", `${basename(input.image)}.rgba.png`);
  writeFileSync(out, result.image);
  return {
    output_path: out,
    alpha_coverage: result.alpha_coverage,
    method_used: result.method_used,
    warnings: result.warnings
  };
}

function basename(p: string): string {
  const name = p.split(/[\\/]/).pop() ?? "out";
  return name.replace(/\.[^.]+$/, "");
}
