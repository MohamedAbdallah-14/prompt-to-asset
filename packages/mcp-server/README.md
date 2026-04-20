# prompt-to-asset

One brief → a validated, multi-platform asset bundle. Prompt enhancer + asset pipeline for developers. Works in Claude Code, Cursor, Windsurf, Codex, Gemini CLI, Cline, VS Code, and standalone.

```bash
# Zero-key, one-liner
npx prompt-to-asset init

# Or install globally
npm i -g prompt-to-asset
p2a doctor
```

## What you get

One brief + optional `brand.json` → every asset a modern app needs:

- **iOS** — `AppIcon.appiconset` (14 sizes + 1024 marketing, opaque), iOS 18 dark / tinted variants.
- **Android** — adaptive foreground + background + Android 13 monochrome, every mipmap-\*dpi.
- **PWA** — `192`, `512`, `512-maskable` (80 % safe zone) + `manifest.webmanifest` + `<head>` snippet.
- **Favicon** — multi-res `.ico`, `icon.svg` with `prefers-color-scheme: dark`, `apple-touch-icon.png`.
- **OG / Twitter** — 1200 × 630 with **real typography** via Satori (not rendered inside a diffusion sampler).
- **Flutter** — `flutter_launcher_icons.yaml` + 1024 master.
- **visionOS** — 3-layer parallax scaffold (README + master PNG; layer separation is manual).
- **Splash screens** — iOS `LaunchScreen-2732.png`, Android `mipmap-*dpi/splash.png`, PWA `splash-1200.png`.

Plus: logos, illustrations, hero banners, sticker / transparent marks, icon packs. Sprite sheets and 9-slice via the CLI for game devs.

## Three ways to run it — pick one per call

| Mode                       | Keys required                                                                                                                                               | Best for                                                                         | How                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`inline_svg`**           | **none**                                                                                                                                                    | logos, favicons, icons, simple app icons                                         | Server returns a tight SVG-authoring brief; your MCP host (Claude / Cursor) writes the `<svg>` inline, then `asset_save_inline_svg` writes it to disk and runs the platform fan-out.    |
| **`external_prompt_only`** | **none**                                                                                                                                                    | you already pay for ChatGPT / Midjourney / Ideogram / Google AI Studio / Recraft | Server returns the dialect-correct prompt + paste-target URLs. You generate in your subscription, save the file, then call `asset_ingest_external` to run matte → vectorize → validate. |
| **`api` (free)**           | **none**                                                                                                                                                    | automation, no paid key                                                          | Routes to Pollinations (zero signup), Hugging Face Inference (free `HF_TOKEN`), Cloudflare Workers AI (free 10k neurons/day), or Stable Horde (anonymous queue).                        |
| **`api` (paid)**           | **one of** `OPENAI_API_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `BFL_API_KEY`, `GEMINI_API_KEY`, `STABILITY_API_KEY`, `LEONARDO_API_KEY`, `FAL_API_KEY` | full-fidelity, rate-limit-free                                                   | Server calls the routed provider → matte → vectorize → export → tier-0 validate → content-addressed `AssetBundle`.                                                                      |

`p2a doctor` tells you which modes are live in your current environment.

## Why this exists

Devs ship apps. Apps need brand assets. Two obstacles:

1. You're not a designer. Asking Gemini "iOS app icon for a weather app called Halcyon" returns a mediocre square PNG because you don't know each model's dialect, safe zones, text ceilings, or when transparency is actually supported vs. rendered as a grey-and-white checkerboard.
2. One PNG is not an asset. A real app icon is a 1024² master + the 14-size AppIconSet + Android adaptive layers + PWA maskable + visionOS + Flutter pubspec. Doing that fan-out by hand in Figma or Photoshop after every regeneration is hours of grunt work.

This tool does for dev assets what paid prompt-enhancer tools do for designer prompts — free, scoped to dev-asset surfaces, routed across every model.

## Install

```bash
# Per project (keeps your toolchain reproducible)
npm i -D prompt-to-asset

# Global (recommended for CLI use)
npm i -g prompt-to-asset

# Zero install (every command works)
npx prompt-to-asset <cmd>
```

### Register as an MCP server

```bash
# Claude Code
claude mcp add prompt-to-asset -- p2a

# Cursor / VS Code / Windsurf — edit .cursor/mcp.json / .vscode/mcp.json
#   "prompt-to-asset": { "command": "p2a" }

# Codex / Gemini CLI
#   Already generated in .codex/config.toml / gemini-extension.json
```

`p2a init` scaffolds a `brand.json` tuned to your framework (Next.js, Expo, Flutter, Xcode, Android, Astro, …) and prints the exact registration command for your IDE.

## 60-second quickstart (zero key)

```bash
npx prompt-to-asset doctor      # what's on, what's missing, ranked best → worst
npx prompt-to-asset init        # scaffold brand.json + register MCP server
npx prompt-to-asset pick        # interactive model picker: asset type + constraints → ranked route
```

Then, in Claude Code / Cursor / Windsurf:

> Generate a favicon bundle for my app called Forge. Use `brand.json`. `inline_svg` mode.

Or standalone, from a master PNG you already have:

```bash
npx prompt-to-asset export path/to/master.png --platforms all --app-name "Forge"
# → writes iOS AppIconSet, Android adaptive, PWA, favicon.ico, OG, visionOS scaffold, Flutter yaml
```

## Security

- **API keys live in env vars only.** Never written to disk, never logged, never echoed in MCP responses. Provider error bodies are passed through a `redact()` filter that scrubs common key patterns (OpenAI `sk-…`, Google `AIza…`, Anthropic `sk-ant-…`, `Bearer …`, `?key=…`, Replicate `r8_…`, Hugging Face `hf_…`).
- **Path access is allow-listed.** `image_path` / `output_dir` inputs are resolved through symlinks and rejected if they escape the project cwd + output dir + cache dir. Widen with `P2A_ALLOWED_PATHS=/path1:/path2` if your pipeline writes elsewhere.
- **SVG is XSS-sanitized before any write.** `<script>`, `<foreignObject>`, `on*=` handlers, `javascript:` URIs, external `<image href>` / `<use href>`, CSS `@import` over the network — all rejected unconditionally. The check runs even without SVGO installed.
- **Cost guardrail.** Set `P2A_MAX_SPEND_USD_PER_RUN=5.00` to cap any single tool call. Pre-flight cost estimate (best-effort from published pricing) refuses to call if over. Free-tier routes are always $0.
- **No telemetry. No remote calls unless the routed provider explicitly requires one.**

## Docs

- **Full README + architecture**: https://github.com/MohamedAbdallah-14/prompt-to-asset#readme
- **Troubleshooting**: https://github.com/MohamedAbdallah-14/prompt-to-asset/blob/main/TROUBLESHOOTING.md
- **Security policy**: https://github.com/MohamedAbdallah-14/prompt-to-asset/blob/main/SECURITY.md

## License

MIT.
