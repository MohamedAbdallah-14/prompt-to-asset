import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { safePath, safeReadPath, safeWritePath, PathAccessError } from "./paths.js";

const ORIG_ENV = process.env["P2A_ALLOWED_PATHS"];

afterEach(() => {
  if (ORIG_ENV === undefined) delete process.env["P2A_ALLOWED_PATHS"];
  else process.env["P2A_ALLOWED_PATHS"] = ORIG_ENV;
});

function tmp() {
  return mkdtempSync(resolve(tmpdir(), "prompt-to-asset-paths-"));
}

describe("safePath", () => {
  it("accepts a path inside the current working directory", () => {
    const p = safePath("./package.json", { mustExist: true });
    expect(p.endsWith("package.json")).toBe(true);
  });

  it("rejects a traversal outside the allow-list", () => {
    // /etc is never in the allow-list by default.
    expect(() => safeReadPath("/etc/passwd")).toThrow(PathAccessError);
  });

  it("rejects empty and non-string input", () => {
    expect(() => safePath("")).toThrow(PathAccessError);
    expect(() => safePath(undefined as unknown as string)).toThrow(PathAccessError);
    expect(() => safePath(null as unknown as string)).toThrow(PathAccessError);
  });

  it("rejects paths containing NUL bytes", () => {
    expect(() => safePath("foo\0bar")).toThrow(/NUL/);
  });

  it("widens the allow-list via P2A_ALLOWED_PATHS", () => {
    const dir = tmp();
    const file = resolve(dir, "x.txt");
    writeFileSync(file, "hello");
    process.env["P2A_ALLOWED_PATHS"] = dir;
    expect(safeReadPath(file)).toBe(realpathSync(file));
  });

  it("supports multiple roots separated by ':' or ';'", () => {
    const dirA = tmp();
    const dirB = tmp();
    const f = resolve(dirB, "f.txt");
    writeFileSync(f, "hi");
    process.env["P2A_ALLOWED_PATHS"] = `${dirA}:${dirB}`;
    // safePath canonicalises through realpath, which on macOS rewrites
    // /var/folders/... → /private/var/folders/.... Compare against realpath.
    expect(safeReadPath(f)).toBe(realpathSync(f));
  });

  it("mustExist=true raises when the file is absent", () => {
    const dir = tmp();
    process.env["P2A_ALLOWED_PATHS"] = dir;
    expect(() => safeReadPath(resolve(dir, "does-not-exist.txt"))).toThrow(/does not exist/);
  });

  it("mustExist=false (writes) accepts a not-yet-created path", () => {
    const dir = tmp();
    process.env["P2A_ALLOWED_PATHS"] = dir;
    const p = safeWritePath(resolve(dir, "new.png"));
    expect(p.endsWith("new.png")).toBe(true);
  });

  it("rejects a symlink whose target escapes the allow-list", () => {
    const sandbox = tmp();
    process.env["P2A_ALLOWED_PATHS"] = sandbox;
    const target = "/etc/hosts"; // outside the sandbox
    const link = resolve(sandbox, "evil-link");
    try {
      symlinkSync(target, link);
    } catch {
      // Symlink creation may fail on some CI sandboxes; skip the assertion.
      return;
    }
    expect(() => safeReadPath(link)).toThrow(PathAccessError);
  });
});
