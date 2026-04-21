# Research Index: Agent Evaluation Frameworks (27)

**Topic:** Systematic evaluation of AI-generated assets (logos, icons, favicons, illustrations) in a prompt-to-asset MCP server context.

**Scope:** CI eval suite design, golden dataset curation, automated metrics, provider regression detection.

---

## Files

### [27a — Agent Benchmarking Frameworks](./27a-agent-benchmarking-frameworks.md)
Covers AgentBench (THUDM, ICLR 2024), RAGAS (explodinggradients), and DeepEval (confident-ai). Explains what each framework provides, what to borrow for asset eval, and what to ignore. Bottom line: use DeepEval as the test harness, borrow RAGAS's metric-decomposition pattern, ignore AgentBench's scoring primitives.

### [27b — Image Generation Eval Pipelines](./27b-image-generation-eval-pipelines.md)
Covers the four primary programmatic eval signals: VQAScore (t2v_metrics, ECCV 2024), ImageReward (NeurIPS 2023), CLIPScore, and DeepEval TextToImageMetric. Includes the full tiered CI pipeline structure — tier-0 deterministic, tier-1 embedding, tier-2 LLM-judge, tier-3 human spot check — with cost estimates.

### [27c — Golden Dataset and Regression Testing](./27c-golden-dataset-regression-testing.md)
Curating the golden dataset: what prompt categories to cover (~44 prompts minimum), the record schema per golden item (invariants as JSON, not pixel-exact reference), decontamination rules, versioning strategy, and how to add production failures back into the dataset.

### [27d — Automated Quality Metrics for CI](./27d-automated-quality-metrics-ci.md)
Concrete Python implementations of every automated check: FFT checkerboard detection, alpha channel validation, subject safe-zone bbox, OCR Levenshtein, CLIPScore smoke test, VQAScore gate, DeepEval TextToImageMetric, ImageReward delta. GitHub Actions workflow structure. Platform-specific check matrix (iOS, Android, PWA, Favicon, OG Image, transparent logo).

### [27e — Provider Update Regression Detection](./27e-provider-update-regression-detection.md)
Strategy for detecting silent provider model updates: baseline pinning, per-prompt delta scoring, canary probes (simple geometry prompts run weekly), Evidently AI for distribution drift detection, response protocol by severity tier, provider versioning map (which providers support pinned model strings vs. unversioned endpoints). Critical rule: never call a "latest" alias in production.

---

## Key Takeaways

1. **No existing framework evaluates image assets out of the box.** All general-purpose agent eval frameworks (AgentBench, RAGAS, LangSmith) need custom image metrics. The closest ready-to-use tool is DeepEval with its multimodal metrics.

2. **Tier your checks by cost.** Deterministic checks (alpha, dimensions, FFT) are free and should run on every generation. VQAScore with a local model is cheap. GPT-4V-based LLM judge costs $0.02–0.05/image — run nightly, not on every PR.

3. **The golden dataset is ~44 prompts covering all asset types.** Store invariants (not reference pixels) as JSON. Version it independently from pipeline code.

4. **Provider model updates are the primary regression source.** Pin explicit model version strings everywhere. Run a weekly canary with a trivially simple prompt to detect silent updates. Use Evidently AI for distribution drift over rolling production windows.

5. **MCP-specific testing** uses the MCP Inspector (modelcontextprotocol/inspector) for protocol conformance and L-Qun/mcp-testing-framework for tool-call accuracy across different LLM backends. These cover the MCP transport layer; they do not evaluate asset quality.

---

## External References

- AgentBench: https://github.com/THUDM/AgentBench
- RAGAS: https://github.com/explodinggradients/ragas
- DeepEval: https://github.com/confident-ai/deepeval | https://deepeval.com
- t2v_metrics (VQAScore): https://github.com/linzhiqiu/t2v_metrics
- ImageReward: https://github.com/zai-org/ImageReward
- Braintrust: https://www.braintrust.dev
- Braintrust autoevals: https://github.com/braintrustdata/autoevals
- Promptfoo: https://github.com/promptfoo/promptfoo
- Arize Phoenix: https://github.com/Arize-ai/phoenix
- MCP Inspector: https://github.com/modelcontextprotocol/inspector
- MCP Testing Framework: https://github.com/L-Qun/mcp-testing-framework
- Awesome Visual Generation Evals: https://github.com/ziqihuangg/Awesome-Evaluation-of-Visual-Generation
- Evidently AI: https://github.com/evidentlyai/evidently
- Maxim AI golden dataset guide: https://www.getmaxim.ai/articles/building-a-golden-dataset-for-ai-evaluation-a-step-by-step-guide/
