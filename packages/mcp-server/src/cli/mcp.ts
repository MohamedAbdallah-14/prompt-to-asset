// The MCP stdio runner, factored out of the legacy src/index.ts entry point
// so that `p2a` (with no args) and `p2a mcp` both resolve here.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "../server.js";
import { CONFIG } from "../config.js";
import { providerAvailability } from "../providers/index.js";

export async function runMcp(): Promise<void> {
  const server = createServer();

  if (CONFIG.transport !== "stdio") {
    console.error(
      `[prompt-to-asset] transport=${CONFIG.transport} not yet implemented; only stdio is wired. Set PROMPT_TO_BUNDLE_TRANSPORT=stdio (default) to run.`
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP protocol channel on stdio.
  console.error(
    `[prompt-to-asset] MCP stdio server ready — providers available: ${JSON.stringify(providerAvailability())}`
  );
}
