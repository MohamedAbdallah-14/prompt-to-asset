# 26b — VLM-as-Judge Rubric Design

## Relevant Work

**Prometheus-Vision** (ACL 2024 Findings) — arXiv:2401.06591  
GitHub: https://github.com/prometheus-eval/prometheus-vision

**MJ-Bench** (NeurIPS 2025) — arXiv:2407.04842  
GitHub: https://github.com/MJ-Bench/MJ-Bench

**Vision-Guided Iterative Refinement for Frontend Code** (2025) — arXiv:2604.05839v1

---

## Prometheus-Vision: Rubric Structure

Prometheus-Vision is the most directly applicable framework. It trains an open-source VLM to evaluate images against user-defined score rubrics. The rubric format is:

```
Criterion: <name>
Score 1: <description of worst case>
Score 2: <description>
Score 3: <description>
Score 4: <description>
Score 5: <description of best case>
```

Output format: `Feedback: <rationale pinpointing what is good and bad> [RESULT] <integer 1-5>`

This two-part output (rationale + score) is the key design choice — the rationale is what feeds back into prompt repair, not just the number. Prometheus-Vision achieves Pearson r=0.786 with human evaluators on LLaVA-Bench.

The model requires: instruction, image, response-under-evaluation, reference answer, and score rubric as inputs. At inference you can use GPT-4V/GPT-4o as the judge with the same rubric format (no fine-tuning needed); Prometheus-Vision is an open-source alternative if API cost matters.

## MJ-Bench: Four Evaluation Dimensions for Text-to-Image

MJ-Bench defines four assessment axes for image generation judges:

1. **Alignment** — does the image match the text prompt?
2. **Safety** — is the content appropriate?
3. **Image Quality** — perceptual quality, sharpness, coherence.
4. **Bias** — representation and demographic fairness.

Key finding: closed-source VLMs (GPT-4o best overall) outperform open-source on safety and bias. Smaller CLIP-based scorers outperform VLMs on alignment and image quality. **Likert-scale natural language feedback is more accurate and stable than numeric-only scales for VLM judges.**

## Vision-Guided Iterative Refinement: Two-Critic Design

The frontend code generation paper demonstrates a design relevant to assets: separate a **visual critic** (assesses rendered output perceptually) from a **code/content critic** (translates visual issues into actionable generation instructions). This separation outperforms unified critique.

For asset generation, the equivalent split is:

- **Tier-0 critic** (deterministic): dimensions, alpha presence, safe-zone bbox, OCR Levenshtein — produces binary pass/fail with exact error data.
- **Tier-1 critic** (VLM): style match, mark clarity, palette accuracy, visual complexity — produces Likert + rationale.

The Tier-0 results should be passed as structured context to the VLM critic prompt (e.g., "OCR read 'Acme Crp'; target was 'Acme Corp'") so the VLM does not waste context on facts it cannot reliably detect.

## Judge Model Selection

Based on MJ-Bench findings:

| Task | Recommended judge |
|---|---|
| Alignment (does image match brief?) | GPT-4o or CLIP scoring model |
| Image quality (sharpness, composition) | CLIP scoring model or IQA model |
| Style fidelity, complexity, palette | GPT-4o / Claude 3.5 Sonnet (with image) |
| Text legibility in mark | Deterministic OCR + Levenshtein, not VLM |
| Alpha / safe-zone | Deterministic pixel check, not VLM |

## Rubric Design Principles

From the Prometheus-Vision training data methodology:

1. Write criteria at a single dimension — do not combine "clarity and palette" in one criterion.
2. Anchor score 1 and score 5 descriptions to concrete observable properties, not subjective adjectives.
3. Always provide a reference answer (what the ideal asset looks like in words) so the VLM has a calibration point.
4. Use Likert scale (1–5 per criterion), not a single composite score — individual dimension scores make repair actionable.

## Caveats

- GPT-4V and GPT-4o can hallucinate structural properties (e.g., claim alpha is present when it is not). Never trust a VLM for pixel-level checks. Tier-0 deterministic checks are non-negotiable.
- Prometheus-Vision requires a reference answer. For novel logos there is no ground-truth image; the reference must be a textual description of the target properties.
- Likert scales are subject to positional bias: VLMs tend to rate mid-scale (3) when uncertain. Include few-shot examples with 1s and 5s in the judge prompt to calibrate.

## References

- Kim et al. (2024). [Prometheus-Vision: Vision-Language Model as a Judge for Fine-Grained Evaluation](https://arxiv.org/abs/2401.06591). ACL 2024.
- Chen et al. (2024). [MJ-Bench: Is Your Multimodal Reward Model Really a Good Judge for Text-to-Image Generation?](https://arxiv.org/abs/2407.04842). NeurIPS 2025.
- Vision-Guided Iterative Refinement for Frontend Code. [arXiv:2604.05839](https://arxiv.org/html/2604.05839v1).
