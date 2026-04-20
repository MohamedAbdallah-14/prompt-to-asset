/**
 * Conservative SVGO wrapper.
 *
 * Runs `svgo` if the optional dep is installed; returns the input unchanged
 * otherwise. The preset keeps viewBox, keeps IDs referenced by url(#id),
 * merges paths only when safe, and strips XML prolog / comments / editor metadata.
 */

export interface OptimizeResult {
  svg: string;
  warnings: string[];
  ran: boolean;
}

type OptimizeFn = (
  svg: string,
  opts: {
    multipass: boolean;
    plugins: Array<
      | string
      | {
          name: string;
          params?: Record<string, unknown>;
        }
    >;
  }
) => { data: string };

export async function optimizeSvg(svg: string): Promise<OptimizeResult> {
  try {
    // svgo is an optional dependency; when installed it resolves, when not
    // the import throws and we fall through to the no-op branch.
    const mod = (await import("svgo")) as { optimize: OptimizeFn };
    const result = mod.optimize(svg, {
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              // Keep viewBox — strips break inline sizing / responsive SVGs.
              removeViewBox: false,
              // Keep IDs; gradients/clipPaths/masks reference them.
              cleanupIds: false,
              // Leave as-is; merging sometimes corrupts fill-rule boundaries.
              mergePaths: false,
              // Keep human-readable but still shrink.
              convertPathData: { floatPrecision: 2 }
            }
          }
        },
        // Strip the XML prolog and any <title>/<desc> author fluff.
        "removeXMLProcInst",
        "removeMetadata",
        "removeTitle",
        "removeDesc"
      ]
    });
    return { svg: result.data, warnings: [], ran: true };
  } catch {
    return {
      svg,
      warnings: ["svgo not installed; skipping SVG optimization. Install with `npm i -D svgo`."],
      ran: false
    };
  }
}
