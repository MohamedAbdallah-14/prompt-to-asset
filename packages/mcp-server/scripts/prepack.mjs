// Stage runtime dependencies into the published tarball.
//
// The monorepo keeps `data/`, `README.md`, `LICENSE`, and `CHANGELOG.md` at
// the repo root so they're shared with the docs/ site and other packages.
// When `npm pack` or `npm publish` runs inside this package, only the files
// under `packages/mcp-server/` are included. This script copies the shared
// files into the package directory right before packing; the `files` array
// in package.json then picks them up.
//
// Idempotent. Clobbers whatever was there so the copy always matches the
// current repo state, never a stale cache.

import { cpSync, copyFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "..", "..");

function copy(src, dst, opts = { recursive: true }) {
  const absSrc = resolve(repoRoot, src);
  const absDst = resolve(packageRoot, dst);
  if (!existsSync(absSrc)) {
    process.stderr.write(`[prepack] missing ${absSrc}, skipping\n`);
    return;
  }
  if (opts.recursive) {
    if (existsSync(absDst)) rmSync(absDst, { recursive: true, force: true });
    mkdirSync(absDst, { recursive: true });
    cpSync(absSrc, absDst, { recursive: true });
  } else {
    copyFileSync(absSrc, absDst);
  }
  process.stderr.write(`[prepack] staged ${src} → ${dst}\n`);
}

copy("data", "data", { recursive: true });
// README / LICENSE / CHANGELOG live at the repo root; copy the top-level
// CHANGELOG + LICENSE if present, but the README will be the package-facing
// one authored specifically for npm (see packages/mcp-server/README.md).
if (existsSync(resolve(repoRoot, "CHANGELOG.md"))) {
  copy("CHANGELOG.md", "CHANGELOG.md", { recursive: false });
}
if (existsSync(resolve(repoRoot, "LICENSE"))) {
  copy("LICENSE", "LICENSE", { recursive: false });
}

process.stderr.write(`[prepack] done\n`);
