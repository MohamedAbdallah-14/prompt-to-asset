#!/usr/bin/env bash
# verify-repo.sh
# Verify every IDE mirror matches what sync-mirrors.sh would produce.
# CI fails on drift. Run after editing any SSOT (skills/*/SKILL.md, rules/*).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# Snapshot current mirror state
for f in \
  .claude-plugin/plugin.json \
  .claude/skills \
  .cursor/rules/prompt-to-asset.mdc \
  .cursor/skills \
  .cursor/mcp.json \
  .windsurf/rules/prompt-to-asset.md \
  .windsurf/skills \
  .clinerules/01-prompt-to-asset.md \
  AGENTS.md \
  .codex/config.toml \
  plugins/prompt-to-asset \
  gemini-extension.json \
  GEMINI.md \
  CLAUDE.md \
  .github/copilot-instructions.md \
  .github/copilot-skillset.json \
  .vscode/mcp.json
do
  if [ -e "$f" ]; then
    cp -R "$f" "$TMPDIR/$(echo "$f" | tr '/' '_')"
  fi
done

# Regenerate into current tree
bash scripts/sync-mirrors.sh >/dev/null

# Diff against the snapshot
DRIFT=0
for f in \
  .claude-plugin/plugin.json \
  .cursor/rules/prompt-to-asset.mdc \
  .cursor/mcp.json \
  .windsurf/rules/prompt-to-asset.md \
  .clinerules/01-prompt-to-asset.md \
  AGENTS.md \
  .codex/config.toml \
  gemini-extension.json \
  GEMINI.md \
  CLAUDE.md \
  .github/copilot-instructions.md \
  .github/copilot-skillset.json \
  .vscode/mcp.json
do
  snap="$TMPDIR/$(echo "$f" | tr '/' '_')"
  if [ -e "$snap" ]; then
    if ! diff -q "$snap" "$f" >/dev/null 2>&1; then
      echo "DRIFT: $f differs from sync-mirrors output"
      DRIFT=1
    fi
  elif [ -e "$f" ]; then
    echo "NEW: $f was created; previous snapshot didn't exist"
  fi
done

# Skill directory verification
for sk in asset-enhancer logo app-icon favicon og-image illustration transparent-bg vectorize svg-authoring t2i-prompt-dialect asset-validation-debug brand-consistency; do
  for dest in .claude/skills .cursor/skills .windsurf/skills plugins/prompt-to-asset/skills; do
    if [ -e "$dest/$sk/SKILL.md" ]; then
      if ! diff -q "skills/$sk/SKILL.md" "$dest/$sk/SKILL.md" >/dev/null 2>&1; then
        echo "DRIFT: $dest/$sk/SKILL.md differs from SSOT skills/$sk/SKILL.md"
        DRIFT=1
      fi
    fi
  done
done

if [ $DRIFT -ne 0 ]; then
  echo "verify-repo: FAILED (drift detected)" >&2
  exit 1
fi
echo "verify-repo: OK (mirrors match SSOTs byte-for-byte)"
