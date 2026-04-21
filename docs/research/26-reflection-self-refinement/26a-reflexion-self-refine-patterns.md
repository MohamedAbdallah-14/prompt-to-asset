# 26a — Reflexion & Self-Refine Patterns

## Papers

**Reflexion** (Shinn et al., NeurIPS 2023) — arXiv:2303.11366  
GitHub: https://github.com/noahshinn/reflexion

**Self-Refine** (Madaan et al., NeurIPS 2023) — arXiv:2303.17651  
GitHub: https://github.com/madaan/self-refine  
Project: https://selfrefine.info/

> **Updated 2026-04-21:** Several significant follow-up works have appeared since the original Reflexion and Self-Refine papers. These are covered in the section "2025–2026 Follow-Up Work" below.

---

## Reflexion: Architecture

Reflexion has three interacting components:

- **Actor (Ma)**: generates an output (text, action, code) given current state and past memory.
- **Evaluator (Me)**: scores the output — exact match, heuristics, or LLM-based grading.
- **Self-Reflection (Msr)**: converts `{trajectory, reward}` into a verbal summary that is written to an episodic memory buffer.

Memory is split: short-term holds the current trajectory; long-term holds `sr_t` outputs from past trials, bounded to 1–3 recent entries due to context limits. On each new trial the actor reads the long-term buffer before generating, so past mistakes directly condition the next attempt.

Reflexion supports scalar rewards (binary pass/fail), heuristic signals (repeated action detection), self-generated unit tests, and free-form language feedback. The loop terminates when the evaluator deems the output correct or a maximum trial count is reached (12 trials in AlfWorld experiments).

## Self-Refine: Architecture

Self-Refine uses a single LLM for all three roles — generator, critic, and refiner. The loop is:

```
output₀ = generate(prompt)
while not is_refinement_sufficient(output_t):
    feedback_t  = critique(output_t)
    output_t+1  = refine(output_t, feedback_t)
```

Feedback is structured: it localizes the problem ("the sentiment is neutral due to phrases like 'good'") and then provides an improvement directive ("rewrite to convey strong enthusiasm"). The `is_refinement_sufficient()` check is task-dependent — in practice it is either a quality threshold, a max-iteration cap, or a stop token the model emits. Self-Refine showed 5–40% improvement over one-shot GPT-3.5/GPT-4 across seven diverse tasks with no additional training.

## Applicability to Asset Generation

Both patterns map directly onto the generate → judge → regenerate cycle needed here:

| Reflexion concept | Asset pipeline equivalent |
|---|---|
| Actor | `asset_generate_*` call |
| Evaluator | `asset_validate()` + VLM critique |
| Self-Reflection verbal summary | Structured critique JSON → prompt repair instructions |
| Episodic memory buffer | `critique_history[]` field in AssetBundle metadata |

The key adaptation is that the evaluator in asset generation has **deterministic tier-0 checks** (dimensions, alpha, safe-zone bbox, OCR Levenshtein) that produce scalar pass/fail signals, plus a **VLM layer** that produces free-form critique. Reflexion handles both signal types natively.

## Caveats

- Reflexion was tested on text/code tasks. There is no established benchmark for image-generation loops; reported improvement numbers do not transfer.
- Memory-bounded to 1–3 entries — if three iterations haven't converged, the fourth gets the same context and may loop. Add a hard exit after 4 attempts.
- Self-Refine has no guarantee of monotonic improvement. Madaan et al. acknowledge the refiner can degrade output. Score gating (only keep output_t+1 if score > score_t) prevents regression.
- Neither paper addresses multi-modal feedback. The feedback is always text; translating VLM image critique back into prompt changes is the non-trivial engineering step.

## 2025–2026 Follow-Up Work

The self-refinement research landscape expanded significantly in 2025. Key papers relevant to the asset pipeline:

**MAR: Multi-Agent Reflexion** (arXiv:2512.20845, Dec 2025) — extends Reflexion to a multi-agent setup where diverse critic personas debate and produce the episodic summary. Reduces shared blind spots vs. single-agent loops. Trade-off: roughly 3× the API call budget of single-agent Reflexion. For the asset pipeline, single-agent Reflexion with a hard 4-iteration cap remains the practical default; MAR is worth considering for high-stakes brand-identity work where cost is less constrained.

**Maestro: Self-Improving T2I via Agent Orchestration** (arXiv:2509.10704, Sep 2025) — applies self-critique and MLLM-as-judge head-to-head comparison directly to text-to-image models. Demonstrates that specialized critic agents (one per visual dimension) outperform a single unified critic. Directly validates the two-critic split in 26b. Published experiments use black-box T2I models; results scale with MLLM quality.

**ImAgent: Unified Multimodal Agent for Test-Time Scalable Image Generation** (arXiv:2511.11483, Nov 2025) — training-free; integrates reasoning, generation, and self-evaluation in a single model, using a policy controller that decides whether refinement is needed and which action to invoke. Relevant because it collapses the "call VLM separately" overhead — worth monitoring for the asset pipeline's cost budget.

**Autonomous convergence finding** (Patterns journal, 2025) — empirical study of 700 autonomous text→image→text→image loops with SDXL+LLaVA across 100 iterations. All runs converged to a small set of conventional visual motifs (lighthouses, cathedrals). This is a critical caution: uncapped refinement loops homogenize output. The hard 4-iteration cap in 26d is supported by this finding.

**Self-Reflection in LLM Agents: Effects on Problem-Solving Performance** (arXiv:2405.06682, 2024/2025) — confirms that self-reflection improves accuracy on constrained reasoning tasks but shows mixed results on open-ended creative tasks. Consistent with the asset pipeline's decision to use VLM critique + deterministic tier-0 checks rather than pure self-critique.

## References

- Shinn et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366). NeurIPS 2023.
- Madaan et al. (2023). [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651). NeurIPS 2023.
- Idea2Img (2023). [Iterative Self-Refinement with GPT-4V for Image Design](https://arxiv.org/abs/2310.08541) — direct image-gen application of Self-Refine ideas.
- MAR (2025). [Multi-Agent Reflexion Improves Reasoning Abilities in LLMs](https://arxiv.org/html/2512.20845). arXiv:2512.20845.
- Maestro (2025). [Self-Improving Text-to-Image Generation via Agent Orchestration](https://arxiv.org/abs/2509.10704). arXiv:2509.10704.
- ImAgent (2025). [A Unified Multimodal Agent Framework for Test-Time Scalable Image Generation](https://arxiv.org/abs/2511.11483). arXiv:2511.11483.
- Autonomous convergence (2025). [Autonomous language-image generation loops converge to generic visual motifs](https://www.cell.com/patterns/fulltext/S2666-3899(25)00299-5). Cell Patterns.
