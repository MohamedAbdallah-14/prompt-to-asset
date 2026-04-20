// Smoke tests for the CLI dispatcher and subcommands. These focus on the
// pure pieces (argv parsing, dispatch, dynamic imports) — end-to-end
// sharp/tesseract flows are covered by the MCP pipeline tests + smoke.ts.

import { describe, it, expect } from "vitest";
import { main } from "./index.js";

describe("CLI dispatcher", () => {
  it("--help prints usage and exits 0", async () => {
    const writes: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      await main(["--help"]);
    } finally {
      process.stdout.write = origWrite;
    }

    const out = writes.join("");
    expect(out).toMatch(/prompt-to-asset \(p2a\)/);
    expect(out).toMatch(/p2a export/);
    expect(out).toMatch(/p2a sprite-sheet/);
    expect(out).toMatch(/p2a nine-slice/);
    expect(out).toMatch(/p2a doctor/);
  });

  it("unknown subcommand writes to stderr and exits with code 2", async () => {
    const errs: string[] = [];
    const origErr = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errs.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stderr.write;
    const origExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((n?: number) => {
      exitCode = n;
      throw new Error("__exit__");
    }) as typeof process.exit;

    try {
      await main(["not-a-real-subcommand"]);
    } catch {
      /* thrown by our stubbed exit */
    } finally {
      process.stderr.write = origErr;
      process.exit = origExit;
    }

    expect(exitCode).toBe(2);
    expect(errs.join("")).toMatch(/Unknown command/);
  });
});
