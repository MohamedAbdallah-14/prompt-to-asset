import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: "default",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/mcp-server/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "packages/mcp-server/src/smoke.ts",
        "packages/mcp-server/src/index.ts",
        "packages/mcp-server/src/server.ts"
      ]
    }
  }
});
