# 26d — Convergence & Stopping Criteria

## What the Literature Says

**Self-Refine** (Madaan et al., 2023) defines stopping via an `is_refinement_sufficient()` predicate that is explicitly task-dependent. The paper provides no universal threshold. In practice, community implementations (e.g., SimplerLLM's `LLMFeedbackLoop`) expose:
- `max_iterations` — hard cap.
- `quality_threshold` — stop if aggregate score ≥ threshold.
- `convergence_threshold` — stop if improvement across last N rounds < δ.

**Reflexion** (Shinn et al., 2023) uses a maximum trial count (12 for AlfWorld) combined with evaluator-pass detection. The paper demonstrates diminishing returns after 3–4 trials in most tasks; additional trials rarely change the outcome.

**Vision-Guided Iterative Refinement** (2025, arXiv:2604.05839) uses a fixed budget of 3 iterations with best-output retention across iterations ("keep the highest-scoring solution seen so far"). This avoids regression without requiring convergence detection.

**EMage** (GitHub: sohambuilds/emage) uses a satisfaction score ≥ 0.8 on a 0–1 scale as the primary termination condition, with a configured maximum iteration count as fallback.

**Image Generation CoT** (Guo et al., CVPR 2025, GitHub: ZiyuGuo99/Image-Generation-CoT) introduces PARM++, which adds a self-correction gate: the reward model scores the candidate, and only if the score falls below a threshold does the system invoke a reflection pass. This is a conditional loop, not an unconditional one.

---

## Recommended Stopping Policy for Asset Generation

Three orthogonal stopping signals. All are cheap to compute and should run in this order:

### 1. Hard Block (stop immediately, do not burn iteration budget)

A tier-0 deterministic failure that **routing cannot fix** within the same provider call — e.g., a model that cannot produce alpha was called for a transparent-background brief. Signal: capability mismatch. Action: switch provider, do not iterate.

### 2. Blocking Criterion Failure (iterate, up to max)

A rubric criterion marked as blocking (e.g., C2 alpha for transparent marks, C5 text-free mark for logos) scores ≤ 2. Continue iterating with a targeted repair prompt. Hard-stop at **iteration_max = 4**. Rationale: Reflexion experiments show negligible improvement beyond 4 attempts; beyond that, the model is stuck in a local failure mode.

### 3. Score Plateau (stop early)

Two conditions in AND:
- `max(score_t) - max(score_{t-1})` < 0.15 (on a 0–1 normalized scale) for the last two rounds.
- No blocking criterion failure remains.

On plateau, return the best-seen output (never the latest — scores can regress). This is the "keep highest-scoring" policy from the frontend refinement paper.

### 4. Quality Gate (stop early, success)

All criteria ≥ 4/5 and no blocking criterion ≤ 2. Return immediately.

---

## Iteration Budget by Asset Type

| Asset type | iteration_max | Rationale |
|---|---|---|
| Logo (inline_svg) | 3 | SVG edits are cheap; LLM self-edits SVG directly |
| Logo (api mode) | 4 | API call cost; diminishing return after 4 |
| App icon | 3 | Fewer criteria; safe-zone check is deterministic |
| Favicon | 2 | Simplicity is the brief; over-iteration adds complexity |
| OG image | 3 | Text legibility is the key driver |
| Illustration | 4 | Style and composition require more exploration |

---

## Score Regression Guard

Never replace the current best output with a lower-scoring variant. Maintain a `best_bundle` pointer that updates only on improvement:

```
if aggregate_score(output_t) > aggregate_score(best_bundle):
    best_bundle = output_t
```

This is the correct interpretation of "best-of-N" in a sequential refinement context — you are not sampling N in parallel (that is a separate strategy covered in 26a self-consistency), you are refining sequentially but guarding against descent.

---

## What Not To Do

- Do not use a single composite score for stopping — it hides blocking failures (a 5-criteria average of 4.0 could mask a 1 on alpha).
- Do not stop on the first success signal without checking all blocking criteria.
- Do not increase `iteration_max` beyond 4 for API modes without cost authorization logic — each extra round is a full generation call.
- Do not retry the identical prompt unchanged. If the score did not improve, the repair step in 26e must have produced a different prompt. If it did not, the loop has degenerated and should exit.

## References

- Madaan et al. (2023). [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651).
- Shinn et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366).
- Vision-Guided Iterative Refinement for Frontend Code (2025). [arXiv:2604.05839](https://arxiv.org/html/2604.05839v1).
- Guo et al. (CVPR 2025). [Image Generation CoT: Reflection in Image Generation](https://github.com/ZiyuGuo99/Image-Generation-CoT).
- EMage VLM Controlled Image Editing Pipeline. [GitHub: sohambuilds/emage](https://github.com/sohambuilds/emage).
