import { parseBrandSource, hashBundle } from "../brand.js";
import type { BrandBundleParseInputT } from "../schemas.js";
import type { BrandBundle } from "../types.js";

export async function brandBundleParse(input: BrandBundleParseInputT): Promise<{
  bundle: BrandBundle;
  hash: string;
  warnings: string[];
}> {
  const bundle = parseBrandSource(input.source);
  const warnings: string[] = [];
  if (bundle.palette.length === 0) {
    warnings.push(
      "no colors detected in source. Supported formats: brand.json, DTCG tokens, AdCP spec, brand.md, or raw text containing hex colors."
    );
  }
  if (bundle.palette.length > 12) {
    warnings.push(
      `palette has ${bundle.palette.length} colors; brand bundles usually converge on 3-6. Consider pruning for tighter consistency.`
    );
  }
  return {
    bundle,
    hash: hashBundle(bundle) ?? "",
    warnings
  };
}
