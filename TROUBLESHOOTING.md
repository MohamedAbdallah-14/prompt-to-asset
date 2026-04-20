# Troubleshooting

The fastest triage is always:

```bash
p2a doctor              # what's on, what's off, ranked best → worst
p2a doctor --data       # registry ↔ routing-table consistency
```

If that doesn't surface the issue, scan this list. Each entry is one concrete symptom + the fix.

---

## 1. My IDE shows 0 prompt-to-asset tools

**Symptom.** Claude Code / Cursor / Windsurf lists the MCP server as "connected" but no `asset_*` tools appear.

**Likely cause.** Stale build, or the host is launching a different binary than the one you just built.

**Fix.**

```bash
# 1. Rebuild
npm run build

# 2. Confirm p2a is on PATH and points where you think
which p2a && p2a --version

# 3. Check the registration. Each host reads a different file:
cat ~/.claude.json             | grep -A3 prompt-to-asset   # Claude Code (global)
cat .cursor/mcp.json                                         # Cursor (project-local)
cat .vscode/mcp.json                                         # VS Code (project-local)
cat gemini-extension.json                                    # Gemini CLI
cat .codex/config.toml                                       # Codex CLI

# 4. Re-register via the CLI (removes then adds):
claude mcp remove prompt-to-asset
claude mcp add prompt-to-asset -- p2a
```

If `p2a --version` works but no tools show up, tail the host's MCP log (Cmd-Shift-P → "Developer: Show MCP Logs" in Cursor; `~/Library/Logs/Claude/*.log` in Claude Code on macOS). A startup exception is the usual culprit.

## 2. `p2a doctor --data` says "dangling rule reference"

**Symptom.** Exits 1, prints one or more "routing rule X references model Y, which is not in data/model-registry.json" lines.

**Cause.** You (or we) added a routing rule that points at a model id not in the registry. This is a packaging bug in prompt-to-asset. Please file an issue with the output; meanwhile, the server refuses to start until it's fixed — this is deliberate, otherwise `enhance-prompt` fails opaquely at generate time.

**Workaround while pinned to the broken version.** Edit `data/routing-table.json` and remove or correct the offending rule.

## 3. `mode=api` request throws for paste-only providers

**Symptom (0.1.x).** `asset_generate_logo` with `target_model: "midjourney-v6"` throws `ProviderError: Midjourney has no official API…`.

**Fix.** Upgrade to ≥0.2.0. In 0.2+, paste-only primaries are soft-falled-back to the first api-reachable model in the fallback chain. If the whole chain is paste-only, the tool returns an `ExternalPromptPlan` with paste-target URLs instead of throwing.

## 4. Generator times out mid-call

**Symptom.** Flux Pro, SDXL, or Leonardo request hangs past the provider's typical response time; eventually fails with a fetch timeout.

**Triage.**

1. Provider status page (BFL, Stability, Leonardo). Cloud image-gen has bad days.
2. `P2A_MAX_SPEND_USD_PER_RUN` set too tight? Re-run with `P2A_MAX_SPEND_USD_PER_RUN=100` temporarily to confirm.
3. Free-tier fallback: re-run with `target_model: pollinations-flux` — proves the pipeline is fine and it's the provider.

**Fix if recurring.** Edit `data/routing-table.json` and promote a different provider to primary for that asset type.

## 5. Vectorize output is garbage

**Symptom.** `asset_vectorize` emits an SVG with thousands of slivers, or nearly-empty paths.

**Cause.** Either `vtracer` / `potrace` is not installed (falls back to a naive posterize tracer), or the input raster has heavy antialiasing and the color palette is too large.

**Fix.**

```bash
# Recommended: install vtracer (fast, Rust, polygon-color)
brew install vtracer             # macOS
cargo install vtracer            # anywhere

# Lower the palette for cleaner output
p2a vectorize input.png --palette-size 4 --max-paths 30
```

In MCP, pass `palette_size: 4` (marks) or `2` (monochrome icons).

## 6. `sharp` fails to install on Alpine / musl / Docker

**Symptom.** `npm install sharp` errors with "Something went wrong installing the sharp module" on Alpine Linux (or a musl-based base image).

**Fix.** Sharp ships prebuilt binaries only for glibc. Two options:

```Dockerfile
# Option A (easiest): switch to glibc
FROM node:20-slim                # not :alpine

# Option B: keep alpine, install build tools + libvips-dev
RUN apk add --no-cache vips-dev libc6-compat build-base python3
```

Or skip raster fan-out entirely — `inline_svg` mode works without sharp.

## 7. `favicon.ico` is missing from the bundle

**Symptom.** `asset_save_inline_svg({ asset_type: "favicon" })` writes `icon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, but no `.ico`.

**Cause.** The `png-to-ico` module is an optional dep. When it's not installed, the server emits the PNGs and warns — browsers prefer the SVG anyway.

**Fix.**

```bash
npm install png-to-ico           # 30 kB, no native code
```

## 8. "Path access denied" on `image_path` or `output_dir`

**Symptom.**

```
PathAccessError: path access denied: "/some/abs/path" — outside the allow-list.
```

**Cause.** By default, paths are constrained to the project cwd, the configured output dir, the cache dir, and the OS tempdir. This is a security guard — MCP clients run over stdio or HTTP and are treated as untrusted for filesystem access.

**Fix.** Widen the allow-list:

```bash
export P2A_ALLOWED_PATHS="$HOME/Design:/Volumes/BrandDisk"
```

Multiple roots are colon-separated (`:` or `;`).

## 9. `Svg rejected by safety check`

**Symptom.** `asset_save_inline_svg` throws `SvgRejectedError: svg rejected by safety check: contains <script>…`.

**Cause.** The sanitizer refuses unsafe SVGs before they touch disk. Any of:

- `<script>` / `<foreignObject>` / `<iframe>` / `<embed>` / `<object>`
- `on*=` event handlers (onclick, onload, …)
- `javascript:` URIs
- `<image href="http://…">` / `<use href="https://…">` external refs
- `@import` in `<style>` pointing at an external stylesheet

**Fix.** Rewrite the SVG with plain `<path>`, `<rect>`, `<circle>`, `<polygon>`, `<g>`, `<defs>`, and a local `<symbol>` / `<use href="#id">`. The server does not strip-and-continue on unsafe input — that's a known-losing pattern against mutation XSS.

## 10. `COST_BUDGET_EXCEEDED` on an expected-cheap call

**Symptom.**

```
CostBudgetExceededError: Estimated cost $0.95 for 5 images at flux-pro
exceeds P2A_MAX_SPEND_USD_PER_RUN=$0.50.
```

**Cause.** You (or your CI secret) set `P2A_MAX_SPEND_USD_PER_RUN` and the call went over. Prices in `src/cost-guard.ts` are conservative ceilings; real spend may be lower.

**Fix.**

```bash
# Raise the cap
export P2A_MAX_SPEND_USD_PER_RUN=5

# Or drop to a free-tier route
p2a pick             # asks your question, returns a ranked route
```

## 11. `asset_enhance_prompt` warns "api mode unavailable"

**Symptom.** You have an API key set but the warning fires anyway.

**Cause.** The router picked a target whose provider key you *haven't* set. With `IDEOGRAM_API_KEY` unset, the router can still pick `ideogram-3-turbo` for a wordmark logo. The warning tells you that setting a different key wouldn't help unless it's one the router would pick.

**Fix.** Look at `spec.target_model` in the `enhance_prompt` response. Set the matching env var:

| model family | env var |
|---|---|
| `gpt-image-*`, `dall-e-*` | `OPENAI_API_KEY` |
| `imagen-*`, `gemini-*` | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) |
| `ideogram-*` | `IDEOGRAM_API_KEY` |
| `recraft-*` | `RECRAFT_API_KEY` |
| `flux-*` | `BFL_API_KEY` |
| `sd-*`, `playground-*` | `STABILITY_API_KEY` |
| `leonardo-*` | `LEONARDO_API_KEY` |
| `fal-*` | `FAL_API_KEY` |
| `hf-*` | `HF_TOKEN` |
| `replicate-*` | `REPLICATE_API_TOKEN` |
| `cf-*` | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` |

Or force a cheaper/free route:

```jsonc
{ "target_model": "pollinations-flux" }   // zero-key
{ "target_model": "hf-flux-schnell" }     // free HF token
```

## 12. Gemini / Imagen produces a checkered transparent background

**Symptom.** You asked for transparency, the PNG looks transparent in a viewer, but when inspected it's a grey-and-white checkerboard rendered as real RGB pixels.

**Cause.** Neither Imagen nor Gemini 3 Flash Image emits RGBA. The VAE is RGB-only — they draw the checkerboard pattern. The router *should* refuse to send transparency-required requests to these models; see `never_models` in the `routing_trace`.

**Fix.** Force a native-RGBA model or let the pipeline matte for you:

```jsonc
{ "target_model": "gpt-image-1", "transparent": true }   // native RGBA
// or
{ "transparent": true }                                  // router avoids Imagen/Gemini
```

If you already have the checkerboard PNG, run it through:

```bash
p2a pick     # ask for transparent_mark — route will include asset_remove_background
```

## 13. OCR warning fires but the wordmark looks fine

**Symptom.** Tier-0 validation warns `OCR Levenshtein 4 against "Halcyon"` but the rendered logo reads clearly.

**Cause.** Tesseract fails hard on stylised display faces, small caps, and tracked-out letterforms. A 1-5 edit distance with otherwise-correct geometry is almost always a tesseract issue, not a misspelling.

**Fix.** Decide between tightening the check (re-render at 512² for easier OCR — often helps) or accepting it. Visual review is the final arbiter; this is a safety net, not a contract. If the check consistently misfires for your brand face, open an issue with a sample.

## 14. "Missing icon.ico" in `head-snippet.html`

**Symptom.** The generated `head-snippet.html` links `<link rel="icon" href="favicon.ico">` but the `.ico` isn't in the bundle.

**Cause.** Same as #7 — `png-to-ico` not installed.

**Fix.** `npm install png-to-ico`, then re-run. Modern browsers don't actually need `.ico` — the `icon.svg` link above it wins — but older crawlers + bookmark apps still do.

## 15. `tsc` complains about `ClarifyingQuestion` not exported

**Symptom.** Downstream TypeScript code importing `AssetSpec` fails with "Property 'clarifying_questions' does not exist on type 'AssetSpec'."

**Cause.** You're on an old package version before 0.2.0.

**Fix.**

```bash
npm i prompt-to-asset@latest
```

## 16. Everything works but output is a generic-looking logo

**Symptom.** The SVG or PNG is technically correct but looks like every other AI logo.

**Cause.** Generic brief. `asset_enhance_prompt` surfaces this as a `clarifying_questions` entry with `id: "brief_underspecified"` — if your host LLM skips the question, you get the default.

**Fix.** Before generating, answer the clarifying question. Add a product name + one visual anchor (industry, vibe, palette hint). "A logo" → 4/10 output. "Flat minimalist mark for Halcyon, a weather app, calm and airy" → 7/10 output. No prompt-engineering tool beats this.

---

## Still stuck?

```bash
# Repro, then attach:
p2a doctor > doctor.txt
p2a doctor --data > data.txt
npm ls prompt-to-asset > ls.txt
```

Open an issue at https://github.com/MohamedAbdallah-14/prompt-to-asset/issues with those three files + the command + expected vs. actual.
