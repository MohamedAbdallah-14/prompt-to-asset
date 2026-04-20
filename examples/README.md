# Examples

Runnable recipes. Every script in this folder writes real files to disk and works with **zero API keys** unless noted.

| File                                                     | What it does                                                                                                                             | Needs                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [`brand.json`](./brand.json)                             | Reference BrandBundle for a fictional Halcyon weather app. Drop in any project root.                                                     | —                                            |
| [`pollinations-zero-key.sh`](./pollinations-zero-key.sh) | One-liner: curl Pollinations → p2a export → full iOS/Android/PWA/favicon/Flutter bundle                                                  | `curl`, `node` (and `sharp` as optional dep) |
| [`web-favicon.sh`](./web-favicon.sh)                     | Generate a complete favicon bundle (ICO + SVG + apple-touch + PWA manifest + `<link>` snippet) from a 1024² master                       | `node`, `sharp`                              |
| [`flutter-icons.sh`](./flutter-icons.sh)                 | Drop-in `flutter_launcher_icons.yaml` + source PNGs for iOS + Android + web + macOS + Windows                                            | `node`, `sharp`, optional `dart`             |
| [`inline-svg-readme.md`](./inline-svg-readme.md)         | Copy-paste chat template for asking your AI assistant (Claude Code / Cursor / Windsurf) to generate a logo via inline SVG — zero network | an MCP-capable AI assistant                  |
| [`models-inventory.sh`](./models-inventory.sh)           | Print the full model registry bucketed by tier (free / paid / paste-only) as JSON for pipe/filter                                        | `node`, `jq` (optional)                      |

All scripts assume they're run from the repo root after `npm install && npm run build`. A freshly-cloned repo:

```bash
git clone https://github.com/yourorg/prompt-to-asset.git
cd prompt-to-asset
npm install
npm run build

# Pick any recipe:
bash examples/pollinations-zero-key.sh
bash examples/web-favicon.sh ./path/to/master.png
bash examples/flutter-icons.sh ./path/to/master.png
```

## Scripts deliberately do not

- Require an API key. Every recipe here uses either offline sharp-based export, or the Pollinations zero-key endpoint. Recipes that need a paid key live as inline snippets in [`GETTING_STARTED.md`](../GETTING_STARTED.md) instead.
- Mutate the repo. Output lands in `./out/` or `/tmp/`; delete when you're done.
- Install packages silently. Every recipe lists what it needs at the top.
