#!/usr/bin/env node
// MCPB shim for prompt-to-asset. The actual server is the `prompt-to-asset`
// npm package; this file re-execs `npx prompt-to-asset` so users get auto-
// updates without re-downloading the bundle.
import { spawn } from "node:child_process";
const child = spawn("npx", ["-y", "prompt-to-asset"], {
  stdio: "inherit",
  env: process.env
});
child.on("exit", (code) => process.exit(code ?? 0));
