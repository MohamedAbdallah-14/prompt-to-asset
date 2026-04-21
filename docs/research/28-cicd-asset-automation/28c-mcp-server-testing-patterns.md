# 28c — MCP Server Testing Patterns

## Context

The project uses Vitest (`^2.1.0`) for unit tests across `packages/mcp-server/src/**/*.test.ts`
(see `vitest.config.ts`). Existing tests cover classify, modes, paste-targets, rewriter,
router, and svg-briefs — all pure logic. There are no integration tests that exercise the
MCP tool layer end-to-end. This is the gap to close.

## Two proven patterns for MCP server E2E testing

### Pattern 1: Spawn + stdio (raw)

`mkusaka/mcp-server-e2e-testing-example` demonstrates spawning the compiled server as a
child process using `npx tsx` or `node dist/index.js`, then communicating via stdin/stdout
using JSON-RPC messages. This simulates real-world MCP client behavior.

Pros: tests the full binary path including CLI argument parsing. Catches issues that only
appear when the server is run as a subprocess.
Cons: slow (process spawn per test), hard to set breakpoints, flaky if port or stdio
buffering issues arise.

### Pattern 2: In-memory SDK transport

The MCP TypeScript SDK (`@modelcontextprotocol/sdk`) exposes `InMemoryTransport` and
`Client`, which allow connecting a test client directly to a server instance without
process boundaries. This is the faster path for the majority of tool tests.

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

test("asset_enhance_prompt returns modes_available", async () => {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0" }, { capabilities: {} });
  await client.connect(clientTransport);
  const result = await client.callTool("asset_enhance_prompt", { brief: "simple red logo" });
  expect(result.content[0].type).toBe("text");
});
```

### mcp-testing-kit

`thoughtspot/mcp-testing-kit` wraps the above SDK pattern into a simpler API:

```typescript
import { connect, close } from "mcp-testing-kit";
import server from "../src/index.js";

it("asset_capabilities lists modes", async () => {
  const client = await connect(server);
  const result = await client.callTool("asset_capabilities");
  expect(result.content[0].text).toContain("inline_svg");
  await close(server);
});
```

Available methods: `listTools()`, `callTool(name, params?)`, `listResources()`,
`listPrompts()`. No custom assertions — pair with vitest's `expect`.

## Image output validation with vitest

For tests that generate PNG/SVG files, vitest's built-in `toMatchFileSnapshot` can store
the baseline as a binary file:

```typescript
import { readFileSync } from "node:fs";

test("favicon ICO dimensions", async () => {
  // run the pipeline, get path to output ICO
  const buf = readFileSync(outputPath);
  expect(buf.byteLength).toBeGreaterThan(0);
  // dimension check via sharp:
  const meta = await sharp(buf).metadata();
  expect(meta.width).toBe(48);
});
```

For pixel-level visual regression, `vitest-image-snapshot` (`fdendorfer/vitest-image-snapshot`)
ports jest-image-snapshot's `toMatchImageSnapshot()` to Vitest. It stores PNG baselines in
`__image_snapshots__/` and diffs on subsequent runs with a configurable threshold. The
`storeReceivedOnFailure` option is useful in CI to collect actual outputs alongside diffs.

Caveat: Vitest does not write snapshots in CI when `process.env.CI` is truthy unless you
pass `--update-snapshots`. Baseline images must be committed to the repo or fetched from
artifact storage before tests run.

## Handling provider API keys in CI tests

Tools like `asset_generate_logo` with `mode: "api"` require real API keys. Three strategies:

1. **Skip in unit tier**: annotate with `skipIf(!process.env.OPENAI_API_KEY)`. The test
   runs locally with keys and skips in CI unless secrets are injected.
2. **Mock at the HTTP boundary**: `chihebnabil/openai-api-mock` and `zerob13/mock-openai-api`
   provide OpenAI-compatible mock servers. Wire them via `OPENAI_BASE_URL` env override.
3. **Restricted secrets in CI**: for integration tiers, inject the real key as a GitHub
   Secret (see 28e) and mark those jobs `environment: integration` with mandatory reviewer
   approval to prevent free-running on every PR.

## GitHub Actions workflow for testing

> **Updated 2026-04-21:** Example updated to `actions/setup-node@v6` (latest major, v4 is two major versions behind) and `node-version: 22` (Node 20 EOL is April 30, 2026; Node 22 is LTS through Apr 2027).

```yaml
name: test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm run test:run -- --reporter=dot
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-${{ github.sha }}
          path: coverage/
          retention-days: 14
```

## Caveats

- `server.ts` is excluded from coverage in `vitest.config.ts` because it registers MCP tools
  at module load time. The in-memory SDK pattern bypasses this exclusion cleanly.
- Sharp's optional dependency status means tests that call sharp will silently succeed but
  skip image manipulation if sharp is not installed. Always assert `sharp` is available in
  the CI environment before running pipeline tests.
- The smoke script (`smoke.ts`) is not a test runner — it does not report failures in vitest
  format. Wire it as a separate CI step, not inside the vitest suite.
