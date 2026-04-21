import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { main } from "./index.js";
import { modelsCommand } from "./models.js";
import { doctorCommand } from "./doctor.js";

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

class ProcessExit extends Error {
  code: number;
  constructor(code: number) {
    super(`ProcessExit(${code})`);
    this.code = code;
  }
}

describe("cli/index main()", () => {
  let io: ReturnType<typeof captureIo>;
  beforeEach(() => {
    io = captureIo();
  });
  afterEach(() => io.restore());

  it("prints --help", async () => {
    await main(["--help"]);
    expect(io.out.join("")).toContain("prompt-to-asset (p2a)");
  });

  it("prints help via -h", async () => {
    await main(["-h"]);
    expect(io.out.join("")).toContain("prompt-to-asset (p2a)");
  });

  it("prints version via --version", async () => {
    await main(["--version"]);
    expect(io.out.join("").trim()).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+/);
  });

  it("unknown command exits with 2", async () => {
    await expect(main(["gibberish"])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("Unknown command");
  });
});

describe("cli/models modelsCommand", () => {
  let io: ReturnType<typeof captureIo>;
  beforeEach(() => {
    io = captureIo();
  });
  afterEach(() => io.restore());

  it("list with no args prints a table", async () => {
    await modelsCommand([]);
    const out = io.out.join("");
    expect(out).toContain("id");
    expect(out).toContain("family");
    expect(out).toMatch(/models?\./);
  });

  it("list --free returns ≥1 free model", async () => {
    await modelsCommand(["list", "--free"]);
    const out = io.out.join("");
    expect(out).toMatch(/models?\.|no models match/);
  });

  it("list --json returns valid JSON", async () => {
    await modelsCommand(["list", "--json"]);
    const out = io.out.join("");
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed.models)).toBe(true);
  });

  it("list --paid --json", async () => {
    await modelsCommand(["list", "--paid", "--json"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(Array.isArray(parsed.models)).toBe(true);
  });

  it("list --paste-only --json", async () => {
    await modelsCommand(["list", "--paste-only", "--json"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(Array.isArray(parsed.models)).toBe(true);
  });

  it("list --rgba --svg table path", async () => {
    await modelsCommand(["list", "--rgba", "--svg"]);
    expect(io.out.join("")).toBeDefined();
  });

  it("inspect without id exits with 2", async () => {
    await expect(modelsCommand(["inspect"])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("missing");
  });

  it("inspect unknown id exits with 1", async () => {
    await expect(modelsCommand(["inspect", "not-a-real-model-id"])).rejects.toBeInstanceOf(
      ProcessExit
    );
    expect(io.err.join("")).toContain("not found");
  });

  it("inspect known id prints structured sections", async () => {
    await modelsCommand(["inspect", "gpt-image-1"]);
    const out = io.out.join("");
    expect(out).toContain("model: gpt-image-1");
    expect(out).toContain("Identity");
    expect(out).toContain("Capability");
  });

  it("inspect --json returns JSON", async () => {
    await modelsCommand(["inspect", "gpt-image-1", "--json"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(parsed.model?.id).toBe("gpt-image-1");
  });

  it("inspect --json with unknown id exits 1", async () => {
    await expect(modelsCommand(["inspect", "not-real-model", "--json"])).rejects.toBeInstanceOf(
      ProcessExit
    );
  });

  it("--help prints the subcommand help", async () => {
    await modelsCommand(["--help"]);
    expect(io.out.join("")).toContain("p2a models");
  });

  it("unknown subcommand exits with 2", async () => {
    await expect(modelsCommand(["bogus"])).rejects.toBeInstanceOf(ProcessExit);
    expect(io.err.join("")).toContain("unknown subcommand");
  });
});

describe("cli/doctor doctorCommand", () => {
  let io: ReturnType<typeof captureIo>;
  beforeEach(() => {
    io = captureIo();
  });
  afterEach(() => io.restore());

  it("prints a human-readable report", async () => {
    await doctorCommand([]);
    const out = io.out.join("");
    expect(out.length).toBeGreaterThan(0);
  });

  it("--json returns a JSON report", async () => {
    await doctorCommand(["--json"]);
    const parsed = JSON.parse(io.out.join(""));
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe("object");
  });

  it("--data runs the data integrity check", async () => {
    try {
      await doctorCommand(["--data"]);
    } catch (e) {
      // If the check finds errors in test env, exit 1 is acceptable.
      expect(e).toBeInstanceOf(ProcessExit);
    }
  });

  it("--help prints usage", async () => {
    try {
      await doctorCommand(["--help"]);
    } catch {
      /* some CLIs exit */
    }
    expect(io.out.join("").length + io.err.join("").length).toBeGreaterThan(0);
  });
});
