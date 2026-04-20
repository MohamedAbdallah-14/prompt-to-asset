#!/usr/bin/env bash
# examples/models-inventory.sh
#
# Print the full model registry bucketed by tier. Useful for answering
# "which free model supports transparent output?" and "cheapest Flux path?".

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$REPO_ROOT/packages/mcp-server/dist/index.js"

if [[ ! -f "$BIN" ]]; then
  (cd "$REPO_ROOT" && npm run build >/dev/null)
fi

echo "======== FREE-TIER / ZERO-KEY ========"
node "$BIN" models list --free

echo ""
echo "======== PAID DIRECT APIs ========"
node "$BIN" models list --paid

echo ""
echo "======== PASTE-ONLY SURFACES ========"
node "$BIN" models list --paste-only

echo ""
echo "======== NATIVE TRANSPARENT-PNG CAPABLE ========"
node "$BIN" models list --rgba

echo ""
echo "======== NATIVE SVG OUTPUT ========"
node "$BIN" models list --svg
