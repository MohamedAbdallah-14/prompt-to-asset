#!/usr/bin/env node
// Entry point for the `p2a` CLI. No args → MCP stdio server (preserves
// existing registrations: `claude mcp add ... node dist/index.js`). With args
// → subcommand dispatch (export, init, doctor, help, version).

import { main } from "./cli/index.js";

main().catch((err) => {
  console.error("[prompt-to-asset] fatal:", err);
  process.exit(1);
});
