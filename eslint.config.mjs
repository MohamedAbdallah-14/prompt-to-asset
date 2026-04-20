// ESLint 9 flat config.
// - TypeScript rules via typescript-eslint (type-aware where cheap).
// - Ignores generated mirrors and build output — those are produced from SSOTs.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.turbo/**",
      "tmp/**",
      ".asset-cache/**",
      // Generated IDE mirrors — SSOT lives under skills/, rules/, .claude-plugin/
      ".cursor/**",
      ".windsurf/**",
      ".clinerules/**",
      ".codex/**",
      ".claude/**",
      ".vscode/**",
      "plugins/**",
      "apps/web/**"
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // One-shot migration scripts. Node globals, no TS rules.
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node }
    }
  },

  {
    files: ["packages/mcp-server/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module"
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow `import("foo").Type` inline annotations — we type optional
      // deps (sharp, resvg) this way to keep them out of the import graph
      // when they're not installed.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", disallowTypeAnnotations: false }
      ],
      // The codebase uses lexical decls inside switch arms; wrap-in-braces
      // refactors add noise with no behavior change.
      "no-case-declarations": "off"
    }
  },

  {
    files: ["**/*.test.ts", "**/tests/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
