// Resolve a routing decision into a list of human-facing UIs the user can
// paste the rewritten prompt into. Used by external_prompt_only mode.
//
// The mapping lives in data/paste-targets.json so it's patchable without
// redeploying the MCP server — same pattern as data/routing-table.json
// and data/model-registry.json. Research basis for the targets themselves:
//   - docs/research/07-midjourney-ideogram-recraft/ (Midjourney, Ideogram, Recraft UIs)
//   - docs/research/04-gemini-imagen-prompting/4b-gemini-flash-image-nano-banana.md
//   - docs/research/05-openai-dalle-gpt-image/5b-gpt-image-1-api.md
//   - docs/research/06-stable-diffusion-flux/6b-flux-family-prompting.md

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Same data-dir resolution as config.ts — supports both monorepo dev and
// published-package layouts. See config.ts for the rationale.
function resolveDataDir(): string {
  const candidates = [resolve(__dirname, "..", "data"), resolve(__dirname, "../../..", "data")];
  for (const c of candidates) {
    if (existsSync(resolve(c, "paste-targets.json"))) return c;
  }
  return candidates[0]!;
}
const DATA_DIR = resolveDataDir();

export interface PasteTarget {
  name: string;
  url: string;
  notes: string;
}

interface PasteTargetsData {
  models: Record<string, PasteTarget[]>;
  strategy_targets: Record<string, PasteTarget[]>;
}

const TARGETS: PasteTargetsData = JSON.parse(
  readFileSync(resolve(DATA_DIR, "paste-targets.json"), "utf-8")
);

/**
 * Resolve paste targets for a routing decision.
 *   - If primary is a concrete model id, return that model's paste-target list.
 *   - If primary is a strategy id (e.g. "composite", "satori_template",
 *     "llm_author_svg"), return the strategy's canonical target.
 *   - If neither matches, return an empty list and a warning.
 * Fallback models contribute their paste targets as secondary options.
 */
export function resolvePasteTargets(
  primary: string,
  fallback: string[] = []
): { primary_targets: PasteTarget[]; fallback_targets: PasteTarget[]; warnings: string[] } {
  const warnings: string[] = [];
  const primary_targets = lookup(primary);
  if (primary_targets.length === 0) {
    warnings.push(
      `No paste targets registered for model/strategy "${primary}". ` +
        `Add it to data/paste-targets.json.`
    );
  }
  const seen = new Set(primary_targets.map((t) => t.url));
  const fallback_targets: PasteTarget[] = [];
  for (const m of fallback) {
    for (const t of lookup(m)) {
      if (!seen.has(t.url)) {
        fallback_targets.push(t);
        seen.add(t.url);
      }
    }
  }
  return { primary_targets, fallback_targets, warnings };
}

function lookup(key: string): PasteTarget[] {
  return TARGETS.models[key] ?? TARGETS.strategy_targets[key] ?? [];
}

/** Flat list of every target — used by asset_capabilities for its inventory. */
export function allPasteTargets(): Record<string, PasteTarget[]> {
  return { ...TARGETS.models, ...TARGETS.strategy_targets };
}
