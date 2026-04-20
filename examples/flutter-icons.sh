#!/usr/bin/env bash
# examples/flutter-icons.sh
#
# Emit a fully-configured flutter_launcher_icons.yaml plus the two source PNGs
# it expects (opaque 1024² marketing + adaptive foreground). After this, the
# standard flutter_launcher_icons package handles the per-platform fan-out:
#   dart run flutter_launcher_icons
#
# Usage:
#   bash examples/flutter-icons.sh ./master.png
#   bash examples/flutter-icons.sh ./master.png --app-name MyApp --bg "#0a7896"

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <master.png> [--app-name NAME] [--bg #hex] [--out DIR]"
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO_ROOT/packages/mcp-server/dist/index.js"
MASTER="$1"; shift
OUT_DIR="${P2A_OUT:-./out/flutter}"
APP_NAME="MyApp"
BG="#ffffff"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name) APP_NAME="$2"; shift 2;;
    --bg)       BG="$2"; shift 2;;
    --out)      OUT_DIR="$2"; shift 2;;
    *) echo "unknown flag: $1"; exit 2;;
  esac
done

if [[ ! -f "$BIN" ]]; then
  (cd "$REPO_ROOT" && npm run build >/dev/null)
fi

node "$BIN" export "$MASTER" \
  --platforms flutter \
  --out "$OUT_DIR" \
  --app-name "$APP_NAME" \
  --bg "$BG"

echo ""
echo "Flutter output: $OUT_DIR/flutter/"
echo ""
echo "Next, from your Flutter project root:"
echo "  cp -r $OUT_DIR/flutter/*.png assets/branding/flutter/"
echo "  cp    $OUT_DIR/flutter/flutter_launcher_icons.yaml .   # or merge into pubspec.yaml"
echo "  flutter pub add dev:flutter_launcher_icons"
echo "  dart run flutter_launcher_icons"
