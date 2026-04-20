#!/usr/bin/env bash
# examples/pollinations-zero-key.sh
#
# The entire prompt-to-asset promise in one script. Zero signup, zero API key.
#   1. curl Pollinations (free Flux backend) for a 1024² mark.
#   2. Run `p2a export` to fan out iOS AppIconSet + Android adaptive + PWA
#      maskable + favicon bundle + Flutter launcher_icons config + visionOS
#      parallax scaffold.
#   3. Print where everything landed.
#
# Rate limit: Pollinations allows ~1 req / 15 s anonymous.
# RGB only: no alpha — matte post-hoc if you need transparency.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO_ROOT/packages/mcp-server/dist/index.js"
OUT_DIR="${P2A_OUT:-./out/pollinations-demo}"
PROMPT="${1:-minimal flat vector logo mark, abstract geometric, two-tone warm orange, pure white background, centered, clean silhouette, no text}"

if [[ ! -f "$BIN" ]]; then
  echo "build missing — running npm run build first"
  (cd "$REPO_ROOT" && npm run build >/dev/null)
fi

mkdir -p "$OUT_DIR"
MASTER="$OUT_DIR/master.png"

echo "1/2 curling Pollinations (free Flux backend)…"
# URL-encode the prompt with node — portable across macOS / Linux / BSD.
URL_PROMPT=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$PROMPT")
curl -sSfL \
  -o "$MASTER" \
  "https://image.pollinations.ai/prompt/$URL_PROMPT?model=flux&width=1024&height=1024&nologo=true&seed=42"

size=$(wc -c < "$MASTER" | tr -d ' ')
if [[ "$size" -lt 1024 ]]; then
  echo "Pollinations returned ${size} bytes — likely rate-limited. Wait 15s and retry."
  exit 1
fi
echo "    → $MASTER ($size bytes)"

echo "2/2 fanning out platform bundles via p2a export…"
node "$BIN" export "$MASTER" \
  --platforms ios,android,pwa,favicon,flutter,visionos \
  --out "$OUT_DIR/bundle" \
  --app-name "Halcyon" \
  --theme "#2563eb" \
  --bg "#ffffff"

echo ""
echo "Done. Output tree:"
ls -1 "$OUT_DIR/bundle" | sed 's/^/  /'
echo ""
echo "Drop the iOS dir into Xcode, the android dir into app/src/main/res/,"
echo "the favicon dir into /public, and the flutter dir next to your pubspec.yaml."
