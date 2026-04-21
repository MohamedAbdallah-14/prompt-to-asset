> **📅 Research snapshot as of 2026-04-21.** Provider pricing, free-tier availability, and model capabilities drift every quarter. The router reads `data/routing-table.json` and `data/model-registry.json` at runtime — treat those as source of truth. If this document disagrees with the registry, the registry wins.

# Research Note 26 — Reflection & Self-Refinement for Asset Generation

**Status**: Complete  
**Date**: 2026-04-20 (updated 2026-04-21)
**Scope**: Patterns for implementing a generate → judge → regenerate loop in the prompt-to-asset MCP server.

> **Updated 2026-04-21:** Key changes in this update:
> - **Claude 3.5 Sonnet is deprecated** (retired Jan 5, 2026). Use Claude Sonnet 4.6 or Opus 4.7 as VLM judge.
> - **`gpt-4-vision-preview` is fully deprecated** — use `gpt-4o` or `gpt-4o-mini`.
> - **MJ-Bench** (NeurIPS 2025 final) expanded from 4 to 6 evaluation dimensions.
> - **Constitutional AI:** Anthropic released an updated 23,000-word reason-based "Claude Constitution" in January 2026, shifting from rule-checklists to principled generalization.
> - **New 2025 follow-up papers** added: MAR (multi-agent Reflexion), Maestro (self-improving T2I), ImAgent (unified test-time agent), autonomous convergence study.
> - **Open-source VLM judges** Qwen2.5-VL-72B and InternVL3-78B now viable alternatives at 5–10% below GPT-4o.

---

## Files

| File | Topic | Key takeaway |
|---|---|---|
| [26a](./26a-reflexion-self-refine-patterns.md) | Reflexion & Self-Refine architecture | Use Reflexion's Actor/Evaluator/Self-Reflection split; adapt episodic memory as `critique_history[]` in AssetBundle. Self-Refine's single-model loop maps directly to the asset pipeline. |
| [26b](./26b-vlm-as-judge-rubric-design.md) | VLM-as-judge rubric design | Prometheus-Vision 1–5 Likert + rationale format. MJ-Bench (NeurIPS 2025, now 6 dimensions) confirms Likert > numeric; GPT-4o best closed-source judge overall. Keep tier-0 deterministic checks out of the VLM call. Two-critic design (perceptual + content) outperforms unified. Current judge: GPT-4o or Claude Sonnet 4.6; open-source: Qwen2.5-VL-72B / InternVL3-78B. |
| [26c](./26c-asset-specific-critique-templates.md) | Rubrics per asset type | Ready-to-use 4–5 criterion rubrics for logo, app_icon, favicon, OG image, illustration. Blocking criteria identified per type. |
| [26d](./26d-convergence-stopping-criteria.md) | Stopping criteria | Hard cap at 4 iterations. Quality gate (all ≥ 4/5). Plateau detection (improvement < 0.15 for 2 rounds). Always return best-seen, not latest. |
| [26e](./26e-critique-to-prompt-repair.md) | Critique-to-prompt repair | Repair rules per criterion failure. Routing failures (alpha, text) must re-route, not re-prompt. Repair prompt structure: finding + change + preserve. |

---

## Recommended Implementation Order

1. **Wire tier-0 checks into the loop** — existing `asset_validate()` already does dimensions, alpha, safe-zone, OCR Levenshtein. These become the evaluator signals.
2. **Add a VLM critique step** — call GPT-4o (or Claude Sonnet 4.6 / Opus 4.7 if context allows) with the rubric from 26c for the current asset type. Parse score + rationale per criterion. For self-hosted / cost-sensitive deployments, Qwen2.5-VL-72B and InternVL3-78B are open-source alternatives within 5–10% of GPT-4o on visual benchmarks as of Apr 2025.
3. **Implement the stopping logic** from 26d — blocking criterion check first, then quality gate, then plateau.
4. **Implement prompt repair** from 26e — map each failing criterion to its repair rule; produce a revised prompt or SVG brief.
5. **Store critique history** in AssetBundle metadata — enables offline analysis of which criteria fail most often per asset type and provider.

---

## Key Design Decisions

**Do not use VLM for pixel-level checks.** Alpha, safe-zone bbox, and Levenshtein are deterministic. Pass their numeric outputs as context to the VLM critique prompt.

**Separate routing failures from prompt failures.** A model that cannot produce alpha will not fix it on retry. Detect and re-route before entering the loop.

**Hard cap at 4 iterations.** Reflexion (Shinn 2023) and frontend refinement (arXiv:2604.05839) both show negligible improvement beyond 3–4 attempts. The fifth attempt is almost always budget waste.

**Score each criterion independently.** A composite average hides blocking failures.

---

## Papers / Repos Referenced

- Reflexion (Shinn et al., NeurIPS 2023): https://arxiv.org/abs/2303.11366 | https://github.com/noahshinn/reflexion
- Self-Refine (Madaan et al., NeurIPS 2023): https://arxiv.org/abs/2303.17651 | https://github.com/madaan/self-refine
- CRITIC (Gou et al., ICLR 2024): https://arxiv.org/abs/2305.11738
- Prometheus-Vision (Kim et al., ACL 2024): https://arxiv.org/abs/2401.06591 | https://github.com/prometheus-eval/prometheus-vision
- MJ-Bench (Chen et al., NeurIPS 2025): https://arxiv.org/abs/2407.04842 | https://github.com/MJ-Bench/MJ-Bench
- Tree of Thoughts (Yao et al., NeurIPS 2023): https://arxiv.org/pdf/2305.10601 | https://github.com/princeton-nlp/tree-of-thought-llm
- Idea2Img (2023): https://arxiv.org/abs/2310.08541 | https://idea2img.github.io/
- Image Generation CoT (Guo et al., CVPR 2025): https://github.com/ZiyuGuo99/Image-Generation-CoT
- Vision-Guided Iterative Refinement (2025): https://arxiv.org/html/2604.05839v1
- EMage VLM pipeline: https://github.com/sohambuilds/emage
- Constitutional AI (Anthropic, 2022): https://arxiv.org/abs/2212.08073
- Claude's New Constitution (Anthropic, Jan 2026): https://www.anthropic.com/news/claude-new-constitution — updated 23,000-word reason-based alignment framework; shifts from rule-checklist to principled generalization.
- MAR: Multi-Agent Reflexion (2025): https://arxiv.org/html/2512.20845
- Maestro: Self-Improving T2I via Agent Orchestration (2025): https://arxiv.org/abs/2509.10704
- ImAgent: Unified Multimodal Agent for Test-Time Image Generation (2025): https://arxiv.org/abs/2511.11483
- Autonomous loop convergence to generic motifs (2025): https://www.cell.com/patterns/fulltext/S2666-3899(25)00299-5
