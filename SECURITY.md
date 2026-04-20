# Security Policy

Thanks for helping keep `prompt-to-asset` secure.

## Supported versions

Only the latest minor release line on `main` receives security fixes. The
project is pre-1.0 — pin to a specific version if you need stability.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability

**Do not open a public GitHub issue for a security problem.** Use one of these
private channels:

1. **Preferred — GitHub Security Advisory.** Open a private advisory on this
   repo. GitHub notifies the maintainer privately and gives us a workspace to
   coordinate a fix and a CVE if needed.
2. **Email.** If GitHub Advisories are not an option, email the maintainer
   listed in the repo profile with subject line
   `SECURITY: prompt-to-asset vulnerability report`.

### What to include

- Affected version (`npm ls prompt-to-asset` or the git SHA) and
  install method (npm, source, Docker, `/plugin install`, manual
  `mcpServers` entry).
- Exact reproduction steps. Minimal proof-of-concept if you have one.
- The impact: what an attacker can read, write, execute, or escalate.
- Your environment: OS, Node version, which provider API keys were set
  (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`,
  `BFL_API_KEY`), which MCP client (Claude Code, Cursor, etc.).
- Whether you intend to publicly disclose, and your timeline.

### Response targets

- **Acknowledgement:** within 3 business days.
- **Triage + severity assessment:** within 7 business days.
- **Fix or mitigation:** depends on severity. Critical issues get an
  out-of-band release. Lower-severity issues roll into the next normal
  release with a note in `CHANGELOG.md`.

We will coordinate disclosure with you. Credit goes in the advisory unless
you ask to stay anonymous.

## What is in scope

- The MCP server source in `packages/mcp-server/src/**` and published
  artifacts under `packages/mcp-server/dist/**`.
- The sync / verify scripts under `scripts/**` (`sync-mirrors.sh`,
  `verify-repo.sh`) and the plugin install flow.
- Skill manifests and rules under `skills/`, `rules/`, `.claude-plugin/`
  and the generated mirrors under `.cursor/`, `.windsurf/`, `.codex/`,
  `.clinerules/`, `.github/copilot-instructions.md`, `gemini-extension.json`.
- The `Dockerfile` and CI workflows under `.github/workflows/**`.

## What is out of scope

- Vulnerabilities in upstream dependencies (`@modelcontextprotocol/sdk`,
  `zod`, `sharp`, `@resvg/resvg-js`, Node core, etc.). Report upstream; we
  pull in patched versions via `dependabot.yml`.
- Issues that require an attacker to already have arbitrary code execution
  as the user running the MCP server.
- Bugs in third-party image providers (OpenAI `gpt-image-1`, Google Imagen,
  Ideogram, Recraft, Black Forest Labs Flux). Report to the provider.
- Prompts that yield unsafe or policy-violating content from an upstream
  provider — `prompt-to-asset` rewrites and routes; it does not moderate
  provider output beyond what the provider returns.

## Hardening notes

The MCP server is written defensively. Highlights:

- **No shell interpolation.** The server does not call `exec`, `spawn`, or
  `child_process` with user input. Provider requests go through typed HTTP
  clients only.
- **Zod-validated tool inputs.** Every MCP tool handler validates its input
  via a Zod schema (`packages/mcp-server/src/schemas.ts`) before touching any
  network or disk resource. Unknown fields are stripped; invalid payloads
  return structured errors instead of throwing.
- **Explicit output directories.** Every generator tool writes under an
  `output_dir` the caller supplies, never a path derived from the prompt
  text. The content-addressed layout (`assets/<hash[0:2]>/<hash>/…`) makes
  directory traversal from a prompt impossible.
- **API keys from environment only.** Provider credentials are read from
  environment variables at server startup (`packages/mcp-server/src/config.ts`)
  — never from tool arguments. A missing key disables the corresponding
  provider instead of crashing.
- **No telemetry.** The MCP server does not phone home. Every outbound
  network call is to a provider explicitly configured by the user.
- **Reproducible builds.** `packages/mcp-server` publishes with npm
  provenance (`.github/workflows/publish.yml`) so installers can verify the
  published tarball came from this repo via GitHub Actions.

## Disclosure history

None reported yet. This section will track resolved advisories with CVE
IDs when applicable.
