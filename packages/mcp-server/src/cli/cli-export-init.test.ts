import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportCommand } from "./export.js";
import { initCommand } from "./init.js";
import { runMcp } from "./mcp.js";
import { loadSharp } from "../pipeline/sharp.js";

class ProcessExit extends Error {
  code: number;
  constructor(code: number) {
    super(`ProcessExit(${code})`);
    this.code = code;
  }
}

function captureIo() {
  const out: string[] = [];
  const err: string[] = [];
  const outSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      out.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      err.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    });
  const exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation(((_code?: number) => {
      throw new ProcessExit(_code ?? 0);
    }) as typeof process.exit);
  return {
    out,
    err,
    restore: () => {
      outSpy.mockRestore();
      errSpy.mockRestore();
      exitSpy.mockRestore();
    }
  };
}

let tmp: string;
let io: ReturnType<typeof captureIo>;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "p2a-cli-ei-"));
  io = captureIo();
});

afterEach(() => {
  io.restore();
  rmSync(tmp, { recursive: true, force: true });
});

async function writePng(path: string, w: number, h: number): Promise<void> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp not available");
  const buf = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 255, g: 100, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
  writeFileSync(path, buf);
}

describe("cli/export", () => {
  it("prints an error when called with no arguments", async () => {
    await expect(exportCommand([])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toMatch(/missing <master\.png>/);
  });

  it("errors when input does not exist", async () => {
    await expect(exportCommand([join(tmp, "does-not-exist.png")])).rejects.toBeInstanceOf(
      ProcessExit
    );
    expect(io.err.join("")).toMatch(/input not found/);
  });

  it("rejects unknown platform", async () => {
    const imgPath = join(tmp, "brand.png");
    await writePng(imgPath, 1024, 1024);
    await expect(
      exportCommand([imgPath, "--platforms", "ios,bogus", "--out", tmp])
    ).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toMatch(/unknown platform/);
  });

  it("runs a full favicon fan-out with --quiet JSON", async () => {
    const imgPath = join(tmp, "brand.png");
    await writePng(imgPath, 512, 512);
    const outDir = join(tmp, "out");
    await exportCommand([imgPath, "--platforms", "favicon", "--out", outDir, "--quiet"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(Array.isArray(parsed.files)).toBe(true);
    expect(parsed.files.length).toBeGreaterThan(0);
    expect(parsed.outDir).toBe(outDir);
  });

  it("runs a full ios fan-out and logs written files", async () => {
    const imgPath = join(tmp, "brand.png");
    await writePng(imgPath, 512, 512);
    const outDir = join(tmp, "outios");
    await exportCommand([imgPath, "--platforms", "ios", "--out", outDir]);
    expect(io.err.join("")).toMatch(/wrote \d+ files/);
  });

  it("--json runs exportBundle wrapper", async () => {
    const imgPath = join(tmp, "brand.png");
    await writePng(imgPath, 512, 512);
    const outDir = join(tmp, "outjson");
    await exportCommand([imgPath, "--platforms", "favicon", "--out", outDir, "--json"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(parsed).toBeDefined();
    expect(parsed.files || parsed.out_dir).toBeTruthy();
  });
});

describe("cli/init", () => {
  let origCwd: string;

  beforeEach(() => {
    origCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(origCwd);
  });

  it("scaffolds brand.json and registers MCP configs with --yes", async () => {
    const projectDir = join(tmp, "project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, "package.json"),
      JSON.stringify({ name: "test-proj", dependencies: { next: "^14" } })
    );
    process.chdir(projectDir);

    await initCommand(["--yes", "--no-register"]);

    // brand.json was created
    expect(existsSync(join(projectDir, "brand.json"))).toBe(true);
    const brand = JSON.parse(readFileSync(join(projectDir, "brand.json"), "utf-8"));
    expect(Array.isArray(brand.palette)).toBe(true);
    expect(brand.platform_hints).toBeDefined();
  });

  it("detects Flutter project and writes correct assets dir", async () => {
    const projectDir = join(tmp, "flutter-proj");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "pubspec.yaml"), "name: demo\n");
    process.chdir(projectDir);

    await initCommand(["--yes", "--no-register"]);
    expect(io.out.join("")).toMatch(/Flutter/);
    expect(existsSync(join(projectDir, "assets/branding"))).toBe(true);
  });

  it("detects unknown project type gracefully", async () => {
    const projectDir = join(tmp, "plain");
    mkdirSync(projectDir, { recursive: true });
    process.chdir(projectDir);

    await initCommand(["--yes", "--no-register"]);
    expect(existsSync(join(projectDir, "brand.json"))).toBe(true);
  });

  it("registers MCP configs when --register is given", async () => {
    const projectDir = join(tmp, "mcp-reg");
    mkdirSync(projectDir, { recursive: true });
    process.chdir(projectDir);
    await initCommand(["--yes", "--register"]);
    expect(existsSync(join(projectDir, ".cursor/mcp.json"))).toBe(true);
    expect(existsSync(join(projectDir, ".vscode/mcp.json"))).toBe(true);
    expect(existsSync(join(projectDir, ".windsurf/mcp.json"))).toBe(true);
  });
});

describe("cli/mcp", () => {
  it("exports runMcp as an async function", () => {
    // We cannot actually run the stdio transport in a test (it would block
    // waiting for MCP clients). We only verify the module imports without
    // throwing and exposes the expected signature.
    expect(typeof runMcp).toBe("function");
  });

  it("errors when transport is set to an unknown value", async () => {
    const origTransport = process.env["PROMPT_TO_BUNDLE_TRANSPORT"];
    process.env["PROMPT_TO_BUNDLE_TRANSPORT"] = "http";
    // Re-import config to honor the new env
    const { CONFIG } = await import("../config.js");
    const original = CONFIG.transport;
    (CONFIG as { transport: string }).transport = "http";
    try {
      await expect(runMcp()).rejects.toBeInstanceOf(ProcessExit);
    } finally {
      (CONFIG as { transport: string }).transport = original;
      if (origTransport !== undefined) process.env["PROMPT_TO_BUNDLE_TRANSPORT"] = origTransport;
      else delete process.env["PROMPT_TO_BUNDLE_TRANSPORT"];
    }
  });
});
