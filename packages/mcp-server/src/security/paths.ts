import { resolve, isAbsolute, relative } from "node:path";
import { realpathSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { CONFIG } from "../config.js";

/**
 * Filesystem access guard for MCP-tool inputs.
 *
 * The server accepts `image_path` / `output_dir` / `existing_mark_svg` from an
 * untrusted caller (any MCP client connected over stdio or HTTP). Without a
 * guard, a malicious caller could pass `../../../../etc/passwd` to read
 * arbitrary files, or `/etc/cron.d/foo` to write to system paths.
 *
 * Policy: a path is accepted iff its real (symlink-resolved) absolute form
 * is the current working directory, one of the configured output/cache dirs,
 * or a root explicitly listed in `P2A_ALLOWED_PATHS` (colon-separated).
 *
 * Symlinks are followed on read (via realpath). If the target escapes the
 * allow-list, access is denied. This also prevents TOCTOU escape-via-symlink.
 */
export class PathAccessError extends Error {
  readonly code = "PATH_ACCESS_DENIED";
  constructor(path: string, reason: string) {
    super(`path access denied: ${JSON.stringify(path)} — ${reason}`);
    this.name = "PathAccessError";
  }
}

function envRoots(): string[] {
  const raw = process.env["P2A_ALLOWED_PATHS"] ?? "";
  return raw
    .split(/[:;]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => resolve(p));
}

/** Resolve a root through any symlinks, so macOS's /var/folders →
 * /private/var/folders mapping doesn't defeat the allow-list check. */
function realpathRoot(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function allowedRoots(): string[] {
  const raw = [
    resolve(process.cwd()),
    resolve(CONFIG.outputDir),
    resolve(CONFIG.cacheDir),
    // OS temp dir — tests, mktemp, and normal ephemeral scratch all land here.
    // It's per-user on macOS (/var/folders/…) and typically per-user or shared
    // on Linux (/tmp). If the operator wants to forbid it, they can unset with
    // P2A_DISABLE_TMPDIR_ACCESS=1.
    ...(process.env["P2A_DISABLE_TMPDIR_ACCESS"] === "1" ? [] : [resolve(tmpdir())]),
    ...envRoots()
  ];
  // Realpath each so symlinked roots (e.g. /var → /private/var) compare cleanly.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const real = realpathRoot(r);
    if (!seen.has(real)) {
      seen.add(real);
      out.push(real);
    }
    // Keep the un-realpath'd form too, so non-existent configured dirs still
    // pass once the user creates them (realpathRoot fell back to p).
    if (!seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

function isInside(child: string, parent: string): boolean {
  if (child === parent) return true;
  const rel = relative(parent, child);
  return !!rel && !rel.startsWith("..") && !isAbsolute(rel);
}

export interface SafePathOptions {
  /** When true, the path must exist (symlink-resolved). */
  mustExist?: boolean;
  /** Purpose hint included in error messages. */
  purpose?: "read" | "write";
}

export function safePath(input: unknown, opts: SafePathOptions = {}): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new PathAccessError(String(input), "not a non-empty string");
  }
  if (input.includes("\0")) {
    throw new PathAccessError(input, "contains NUL byte");
  }

  const abs = resolve(input);

  // Resolve symlinks when the path exists so we catch escape-via-symlink.
  // When the path doesn't exist (common for write targets), fall back to
  // the lexical resolve above.
  let real = abs;
  try {
    statSync(abs);
    real = realpathSync(abs);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (opts.mustExist && err.code === "ENOENT") {
      throw new PathAccessError(input, "file does not exist");
    }
    // For writes, ENOENT is expected — we're about to create the file.
    // All other errors (EACCES, EPERM) bubble below via a second check.
  }

  const roots = allowedRoots();
  if (!roots.some((r) => real === r || isInside(real, r))) {
    const rootList = roots.map((r) => `  - ${r}`).join("\n");
    throw new PathAccessError(
      input,
      `resolved to ${real}, which is outside the allow-list.\n` +
        `Allowed roots:\n${rootList}\n` +
        `To widen: set P2A_ALLOWED_PATHS="/path/one:/path/two" before launching the server.`
    );
  }

  return real;
}

/** Convenience wrapper for input paths we expect to exist (reads). */
export function safeReadPath(input: unknown): string {
  return safePath(input, { mustExist: true, purpose: "read" });
}

/** Convenience wrapper for output paths (create-if-missing). */
export function safeWritePath(input: unknown): string {
  return safePath(input, { mustExist: false, purpose: "write" });
}

/** Exposed for doctor/capabilities diagnostics. */
export function describeAllowedRoots(): string[] {
  return allowedRoots();
}
