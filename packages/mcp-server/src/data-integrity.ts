import { MODEL_REGISTRY, ROUTING_TABLE, findModel } from "./config.js";

/**
 * Static invariants between data/model-registry.json and data/routing-table.json.
 *
 * Why this exists: the router dereferences model ids straight from the routing
 * table. If a routing rule points at a model id that isn't in the registry,
 * enhance-prompt will silently pass an unknown id to the rewriter and the
 * provider layer, and the failure mode is a surprising ProviderError at
 * generate-time rather than a clear "routing rule X is broken" at boot.
 *
 * We also check the inverse weakly: every registered model should be
 * reachable — either as a primary, a fallback, or present on `target_model`
 * overrides in a test. A model that's in the registry but NEVER routed to is
 * dead weight; flag it as a warning (not an error) so we can still ship
 * experimental entries without failing startup.
 *
 * Run this at server boot (src/server.ts) and via `p2a doctor --data`.
 */
export interface DataIntegrityReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    models_in_registry: number;
    routing_rules: number;
    models_referenced_by_rules: number;
    dangling_rule_refs: number;
    orphan_models: number;
  };
}

// A routing entry is either a straight `{ model }` reference (route to that
// image-gen model) or a `{ strategy, model? }` pipeline op (run internal
// logic; the `model` here is metadata for the strategy, not a second route).
// Only bare-`{model}` entries must exist in the registry.
type RuleChoice = { model?: string; strategy?: string };

function modelIdsToValidate(choice: RuleChoice): string[] {
  if (choice.strategy) return []; // strategy ops — `model` field is metadata
  return choice.model ? [choice.model] : [];
}

export function checkDataIntegrity(): DataIntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const referenced = new Set<string>();
  let dangling = 0;

  for (const rule of ROUTING_TABLE.rules) {
    const choices: RuleChoice[] = [rule.primary, ...rule.fallback];
    for (const c of choices) {
      // Bookkeeping — everything (strategy or model) counts as "referenced"
      // so the orphan-model check can see what's really reachable.
      if (c.model) referenced.add(c.model);
      if (c.strategy) referenced.add(c.strategy);
      for (const id of modelIdsToValidate(c)) {
        if (!findModel(id)) {
          dangling++;
          errors.push(
            `routing rule "${rule.id}" references model "${id}", which is not in data/model-registry.json.`
          );
        }
      }
    }
    for (const neverId of rule.never) {
      // never-list should be concrete model ids, not strategies
      if (!findModel(neverId)) {
        warnings.push(
          `routing rule "${rule.id}" mentions "${neverId}" in its never-list, but no such model is registered. ` +
            `Drop it or register it.`
        );
      }
    }
  }

  // Orphan models — present in registry but never referenced by any rule.
  // These may be used by paste-targets.json or by tests that force
  // target_model directly; we warn rather than error.
  const referencedIds = new Set(referenced);
  let orphans = 0;
  for (const m of MODEL_REGISTRY.models) {
    if (!referencedIds.has(m.id) && !m.paste_only) {
      orphans++;
      warnings.push(
        `model "${m.id}" is in the registry but never referenced by a routing rule; ` +
          `reachable only via explicit target_model override.`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      models_in_registry: MODEL_REGISTRY.models.length,
      routing_rules: ROUTING_TABLE.rules.length,
      models_referenced_by_rules: referenced.size,
      dangling_rule_refs: dangling,
      orphan_models: orphans
    }
  };
}

/**
 * Assert-style wrapper used at server boot. Logs warnings to stderr and
 * throws only on hard errors (dangling refs). Silent when the data is clean.
 */
export function assertDataIntegrityAtBoot(): void {
  const report = checkDataIntegrity();
  if (report.warnings.length > 0 && process.env["P2A_DATA_VERBOSE"] === "1") {
    for (const w of report.warnings) process.stderr.write(`[prompt-to-asset] warn: ${w}\n`);
  }
  if (!report.ok) {
    const msg =
      `prompt-to-asset: data integrity check failed.\n${report.errors.join("\n")}\n` +
      `This is a packaging bug. Run \`p2a doctor --data\` for details.`;
    throw new Error(msg);
  }
}
