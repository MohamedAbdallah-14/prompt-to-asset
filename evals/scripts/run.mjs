#!/usr/bin/env node
// Deterministic eval harness.
//
// Runs the router + rewriter + validator pipeline against the golden brief
// set in `evals/briefs/golden-set.json` and writes a snapshot to
// `evals/snapshots/<YYYY-MM-DD>/measure.json`. The next invocation compares
// that snapshot against the prior-best baseline and fails if measurable
// quality regressed.
//
// This does NOT call any image provider — every check is pure-function.
// The whole point is to gate the *routing* and *clarifying-question*
// logic, which is what drives first-shot quality. Image generation is
// tested via integration tests + VLM scorers separately.
//
// Usage:
//   node evals/scripts/run.mjs                 # run, write snapshot
//   node evals/scripts/run.mjs --baseline      # (re)set the baseline
//   node evals/scripts/run.mjs --check         # compare against baseline and exit 1 on regression (CI)
//   node evals/scripts/run.mjs --out <path>    # custom snapshot path

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { enhancePrompt } from "../../packages/mcp-server/dist/tools/enhance-prompt.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const briefsPath = resolve(repoRoot, "evals", "briefs", "golden-set.json");
const snapshotsRoot = resolve(repoRoot, "evals", "snapshots");
const baselinePath = resolve(snapshotsRoot, "baseline.json");

const args = process.argv.slice(2);
const mode = args.includes("--check")
  ? "check"
  : args.includes("--baseline")
    ? "baseline"
    : "snapshot";
const outArgIdx = args.indexOf("--out");
const outOverride = outArgIdx >= 0 ? args[outArgIdx + 1] : null;

const { briefs, version } = JSON.parse(readFileSync(briefsPath, "utf-8"));

const results = [];
let pass = 0;
let fail = 0;

for (const b of briefs) {
  const spec = await enhancePrompt({
    brief: b.brief,
    ...(b.asset_type && { asset_type: b.asset_type }),
    ...(b.text_content && { text_content: b.text_content }),
    ...(b.transparent !== undefined && { transparent: b.transparent }),
    ...(b.vector !== undefined && { vector: b.vector }),
    ...(b.brand_bundle && { brand_bundle: b.brand_bundle })
  });

  const checks = [];
  const expect = b.expect ?? {};

  if (expect.route_matches) {
    const re = new RegExp(expect.route_matches);
    checks.push({
      name: "route_matches",
      expected: expect.route_matches,
      actual: spec.target_model,
      pass: re.test(spec.target_model)
    });
  }
  if (Array.isArray(expect.never_routes_to_any)) {
    const hit = expect.never_routes_to_any.find((m) => spec.target_model === m);
    checks.push({
      name: "never_routes_to_any",
      expected: expect.never_routes_to_any,
      actual: spec.target_model,
      pass: !hit
    });
  }
  if (Array.isArray(expect.modes_include)) {
    const missing = expect.modes_include.filter((m) => !spec.modes_available.includes(m));
    checks.push({
      name: "modes_include",
      expected: expect.modes_include,
      actual: spec.modes_available,
      pass: missing.length === 0
    });
  }
  if (Array.isArray(expect.modes_exclude)) {
    const leaked = expect.modes_exclude.filter((m) => spec.modes_available.includes(m));
    checks.push({
      name: "modes_exclude",
      expected: expect.modes_exclude,
      actual: spec.modes_available,
      pass: leaked.length === 0
    });
  }
  if (expect.clarifying_question_id) {
    const q = spec.clarifying_questions?.find((x) => x.id === expect.clarifying_question_id);
    checks.push({
      name: "clarifying_question_id",
      expected: expect.clarifying_question_id,
      actual: (spec.clarifying_questions ?? []).map((x) => x.id),
      pass: Boolean(q)
    });
  }
  if (expect.safe_zone) {
    const sz = spec.safe_zone;
    checks.push({
      name: "safe_zone",
      expected: expect.safe_zone,
      actual: sz,
      pass: Boolean(sz && sz.width === expect.safe_zone.width && sz.height === expect.safe_zone.height)
    });
  }
  if (expect.transparency_required !== undefined) {
    checks.push({
      name: "transparency_required",
      expected: expect.transparency_required,
      actual: spec.transparency_required,
      pass: spec.transparency_required === expect.transparency_required
    });
  }

  const briefPass = checks.every((c) => c.pass);
  if (briefPass) pass++;
  else fail++;

  results.push({
    id: b.id,
    target_model: spec.target_model,
    modes_available: spec.modes_available,
    clarifying_question_ids: (spec.clarifying_questions ?? []).map((x) => x.id),
    transparency_required: spec.transparency_required,
    vector_required: spec.vector_required,
    checks,
    pass: briefPass
  });
}

const summary = {
  version,
  run_at: new Date().toISOString(),
  total: briefs.length,
  pass,
  fail,
  results
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadBaseline() {
  if (!existsSync(baselinePath)) return null;
  try {
    return JSON.parse(readFileSync(baselinePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeSnapshot(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(summary, null, 2) + "\n");
  process.stdout.write(`wrote ${path}\n`);
}

if (mode === "baseline") {
  writeSnapshot(baselinePath);
  process.stdout.write(`pass=${pass}/${briefs.length} → saved as new baseline\n`);
  process.exit(pass === briefs.length ? 0 : 1);
}

const dayDir = resolve(snapshotsRoot, today());
const snapshotPath = outOverride ? resolve(repoRoot, outOverride) : resolve(dayDir, "measure.json");

if (mode === "snapshot") {
  writeSnapshot(snapshotPath);
  process.stdout.write(`pass=${pass}/${briefs.length}\n`);
  process.exit(0);
}

// mode === "check"
const baseline = loadBaseline();
if (!baseline) {
  process.stdout.write(
    "no baseline at evals/snapshots/baseline.json — run `node evals/scripts/run.mjs --baseline` first.\n"
  );
  process.exit(1);
}

writeSnapshot(snapshotPath);

// Regression gate. Current run must not do worse than baseline on the two
// metrics that matter: total pass count, and per-brief pass status (so we
// catch "same count, different brief broke").
const baselinePass = baseline.pass;
const regressed = summary.pass < baselinePass;
const brokeBriefs = [];
for (const current of summary.results) {
  const prior = baseline.results.find((r) => r.id === current.id);
  if (prior && prior.pass && !current.pass) brokeBriefs.push(current.id);
}

const lines = [];
lines.push(`baseline: pass=${baselinePass}/${baseline.total}`);
lines.push(`current:  pass=${summary.pass}/${summary.total}`);
if (brokeBriefs.length > 0) {
  lines.push(`regressions: ${brokeBriefs.join(", ")}`);
  for (const id of brokeBriefs) {
    const r = summary.results.find((x) => x.id === id);
    for (const c of r.checks) {
      if (!c.pass) {
        lines.push(`  ${id} · ${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`);
      }
    }
  }
}
process.stdout.write(lines.join("\n") + "\n");

if (regressed || brokeBriefs.length > 0) {
  process.stdout.write(
    "\nRegression detected. Either fix the change that broke these briefs, or if the new behavior is correct, re-run with `--baseline` to update the snapshot.\n"
  );
  process.exit(1);
}

process.stdout.write("\nno regression.\n");
process.exit(0);
