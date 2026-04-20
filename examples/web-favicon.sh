#!/usr/bin/env bash
# examples/web-favicon.sh
#
# From a 1024² PNG master → a production-grade favicon bundle.
# Emits:
#   favicon.ico  (16/32/48 multi-res)
#   favicon-{16,32,48}.png
#   apple-touch-icon.png  (180x180 opaque)
#   pwa-192.png / pwa-512.png / pwa-512-maskable.png  (80% safe zone)
#   manifest.webmanifest
#   head-snippet.html  (copy-paste into your root layout's <head>)
#
# Usage:
#   bash examples/web-favicon.sh ./path/to/master.png
#   bash examples/web-favicon.sh ./master.png --app-name "Halcyon" --theme "#2563eb"

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <master.png> [--app-name NAME] [--theme #hex] [--out DIR]"
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO_ROOT/packages/mcp-server/dist/index.js"
MASTER="$1"; shift
OUT_DIR="${P2A_OUT:-./out/favicon}"
APP_NAME=""
THEME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name) APP_NAME="$2"; shift 2;;
    --theme)    THEME="$2"; shift 2;;
    --out)      OUT_DIR="$2"; shift 2;;
    *) echo "unknown flag: $1"; exit 2;;
  esac
done

if [[ ! -f "$BIN" ]]; then
  (cd "$REPO_ROOT" && npm run build >/dev/null)
fi

args=(export "$MASTER" --platforms favicon --out "$OUT_DIR")
[[ -n "$APP_NAME" ]] && args+=(--app-name "$APP_NAME")
[[ -n "$THEME" ]] && args+=(--theme "$THEME")

node "$BIN" "${args[@]}"

echo ""
echo "Drop \`$OUT_DIR/favicon/\` into your /public (Next.js / Astro / Vite)."
echo "Inline this into your <head>:"
echo ""
cat "$OUT_DIR/favicon/head-snippet.html"
echo ""
