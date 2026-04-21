import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pickCommand } from "./pick.js";

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
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
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

let io: ReturnType<typeof captureIo>;

beforeEach(() => {
  io = captureIo();
});

afterEach(() => {
  io.restore();
});

describe("cli/pick", () => {
  it("runs end-to-end in --yes mode and prints a ranked route", async () => {
    await pickCommand(["--yes"]);
    const all = io.out.join("");
    expect(all).toMatch(/prompt-to-asset pick/);
    expect(all).toMatch(/route/);
    expect(all).toMatch(/asset_type/);
    expect(all).toMatch(/target_model/);
    expect(all).toMatch(/enhanced_prompt/);
    expect(all).toMatch(/paste_targets/);
    expect(all).toMatch(/next step/);
  });

  it("supports the -y short flag too", async () => {
    await pickCommand(["-y"]);
    expect(io.out.join("")).toMatch(/asset_type/);
  });
});
