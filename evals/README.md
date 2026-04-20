# Evals

Deterministic regression-test harness for the routing + rewriter + validator pipeline.

## What this is

Golden briefs → assertions about what the pipeline *should* produce. No image providers called. No network. Pure-function checks on classify / route / rewrite / mode-selection / clarifying-question logic.

The goal is a **fail-fast gate**: a change that breaks "transparent logo → never routes to Imagen" or "brief 'a logo' → brief_underspecified question surfaces" gets caught in CI before it ships.

## Usage

```bash
# Run once, write a snapshot under evals/snapshots/YYYY-MM-DD/measure.json
node evals/scripts/run.mjs

# Lock the current state as the baseline (do this after intentional changes)
node evals/scripts/run.mjs --baseline

# CI — fail if any brief that was passing in baseline now fails
node evals/scripts/run.mjs --check
```

`--check` exits 1 on:

- any drop in total pass count vs. `evals/snapshots/baseline.json`
- any brief that was passing in baseline and is failing now (even if total stays equal)

## Adding a brief

Edit `evals/briefs/golden-set.json`. Fields:

| Field | Purpose |
|---|---|
| `id` | stable key, used in regression messages |
| `brief` | the plain-English input |
| `asset_type` | optional override of classifier |
| `text_content`, `transparent`, `vector`, `brand_bundle` | optional flags |
| `expect.route_matches` | regex the `target_model` must satisfy |
| `expect.never_routes_to_any` | list of model ids the router must NOT pick |
| `expect.modes_include` / `modes_exclude` | modes_available assertions |
| `expect.clarifying_question_id` | when the brief is deliberately ambiguous, the question id we expect |
| `expect.safe_zone` | `{width, height}` pair for platform-aware assets |
| `expect.transparency_required` | boolean |

Keep the set small. One brief per routing rule, one per dialect, one per failure-mode-we-care-about. Grow by adding a brief that **would have caught a real regression** you just fixed.

## When to update the baseline

- You fixed a router rule that was wrong → the new behavior is correct → `--baseline` to lock it.
- You added a new brief → `--baseline`.
- Never update the baseline to hide a regression. That's what the snapshot in `evals/snapshots/YYYY-MM-DD/` is for — check the diff against the baseline and decide if the new output is the intended one.

## CI wiring

Wire `node evals/scripts/run.mjs --check` into `.github/workflows/ci.yml` as its own job once the baseline is committed. Keeping it separate from `build` means a pure-docs PR doesn't get blocked on routing logic.
