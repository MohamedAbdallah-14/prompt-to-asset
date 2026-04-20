# 27a — Agent Benchmarking Frameworks

## What Exists

### AgentBench (THUDM/AgentBench, ICLR 2024)
**Repo:** https://github.com/THUDM/AgentBench

The most cited multi-environment agent benchmark. Evaluates LLMs across 8 task domains: OS interaction, database queries, knowledge graphs, web shopping, web browsing, card games, house-holding (ALFWorld), and lateral thinking puzzles. Architecture is controller + distributed task workers, each in a Docker container. Scoring is binary task completion or multi-step success rate.

**Applicability to prompt-to-asset:** Near zero for core asset generation. AgentBench measures goal-oriented, deterministic task completion — "did the agent book the right flight" — not "is this logo visually coherent." The framework provides the scaffolding pattern (task workers, assigner, YAML agent config) worth borrowing structurally: each asset type becomes a task worker that defines success criteria. But the metrics themselves don't transfer; you must author custom scorers.

**What to borrow:** The controller/worker architecture where a test harness dispatches asset-generation tasks across providers and collects structured results. The idea of a Dev/Test split of prompts — run cheap checks on Dev, full pipeline on Test.

**Caveats:** AgentBench was last substantially updated for ICLR 2024. The function-calling version adds AgentRL, but the evaluation loop assumes discrete correct/incorrect outcomes, not the continuous perceptual scores asset evaluation requires. Docker overhead is significant (webshop needs ~15 GB RAM).

---

### RAGAS (explodinggradients/ragas)
**Repo:** https://github.com/explodinggradients/ragas  
**Docs:** https://docs.ragas.io

RAGAS is a reference-free evaluation framework for RAG and LLM pipelines. Core metrics: Faithfulness, Answer Relevancy, Context Precision, Context Recall. All metrics decompose into LLM-as-a-judge sub-questions, scored 0–1.

**Applicability to prompt-to-asset:** Indirect but meaningful. RAGAS's design pattern — decompose a complex quality criterion into a set of yes/no VQA questions and aggregate — is directly applicable to image eval. Instead of "is this answer faithful to the context," ask "does the icon contain exactly one recognizable subject?", "is there visible text rendering?", "is the background transparent?". The framework provides the scaffolding to define custom metrics as Python classes with `async_score` methods.

**What to borrow:** The metric decomposition pattern. Define `LogoCoherence`, `AlphaPresence`, `TextAbsence` as RAGAS-style metric classes. RAGAS 0.2+ supports custom metrics and integrates with LangSmith and Langfuse for dataset management.

**Caveats:** RAGAS is text-first. Its built-in metrics are irrelevant. The value is the evaluation loop, not the metrics. Requires GPT-4o or equivalent as the judge for image sub-questions, adding per-eval cost (~$0.002–0.01 per image depending on model).

---

### DeepEval (confident-ai/deepeval)
**Repo:** https://github.com/confident-ai/deepeval  
**Docs:** https://deepeval.com

Open-source eval framework with pytest-style test cases. Includes multimodal metrics: `TextToImageMetric` (semantic consistency + perceptual quality via GPT-4V), `ImageCoherence`, `ImageHelpfulness`. Integrates with CI via `deepeval test run` CLI.

**Applicability to prompt-to-asset:** The most directly usable framework found. `TextToImageMetric` accepts an image URL and the generation prompt, scores 0–1 using the formula `O = sqrt(min(SC) * min(PQ))`. This is a working baseline for automated asset eval in CI without writing metric classes from scratch.

**Setup:**
```python
from deepeval.metrics import TextToImageMetric
from deepeval.test_case import LLMTestCase, MLLMImage

metric = TextToImageMetric(threshold=0.7, include_reason=True)
case = LLMTestCase(
    input="A minimalist compass logo, flat vector, no text",
    actual_output=f"{MLLMImage(url='./output/logo.png', local=True)}"
)
```

**Caveats:** GPT-4V as judge means non-deterministic scoring with ~5–10% variance across runs. The `threshold=0.7` value needs calibration against human-reviewed baseline assets — do not ship the default. No built-in alpha-channel or safe-zone checks; those remain custom code.

---

## Recommended Stack for prompt-to-asset

Use DeepEval as the test harness (pytest integration, CI-ready CLI). Author RAGAS-style metric decomposition for domain-specific checks (alpha presence, text bleed, subject tight-crop). Use AgentBench's task-worker pattern for parallelizing multi-provider generation runs. Skip AgentBench's scoring primitives entirely.
