/**
 * Lazy-load sharp so the MCP server starts even without the optional native dep.
 * sharp is in optionalDependencies — install fails on musl/alpine without build tools.
 */
export async function loadSharp(): Promise<typeof import("sharp") | null> {
  try {
    const mod = await import("sharp");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export async function requireSharp(): Promise<typeof import("sharp")> {
  const s = await loadSharp();
  if (!s) {
    throw new Error(
      "sharp is not installed. Install with: npm install sharp --workspace prompt-to-asset"
    );
  }
  return s;
}
