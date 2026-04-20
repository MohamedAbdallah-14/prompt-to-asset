---
category: 01-prompt-engineering-theory
angle: 1c
angle_title: "LLM-assisted prompt expansion & decomposition"
last_updated: 2026-04-19
primary_sources:
  - "Betker et al. 2023 — Improving Image Generation with Better Captions (DALL-E 3) — https://cdn.openai.com/papers/dall-e-3.pdf"
  - "Hao et al. 2022 (NeurIPS 2023 Spotlight) — Optimizing Prompts for Text-to-Image Generation (Promptist) — https://arxiv.org/abs/2212.09611"
  - "Cao et al. EMNLP 2023 — BeautifulPrompt — https://arxiv.org/abs/2311.06752"
  - "Datta et al. ACL 2024 — Prompt Expansion for Adaptive Text-to-Image Generation — https://aclanthology.org/2024.acl-long.189/"
  - "Wu et al. 2025 (ICLR 2026) — RePrompt: Reasoning-Augmented Reprompting via RL — https://arxiv.org/abs/2505.17540"
  - "Tencent Hunyuan 2025 — PromptToAsset: Chain-of-Thought Prompt Rewriting — https://arxiv.org/abs/2509.04545"
  - "Feng et al. NeurIPS 2023 — LayoutGPT: Compositional Visual Planning — https://arxiv.org/abs/2305.15393"
  - "DeCoT 2025 — Decomposing Complex Instructions for T2I — https://huggingface.co/papers/2508.12396"
  - "LayerCraft 2025 — CoT-driven layered scene generation — https://arxiv.org/abs/2504.00010"
  - "Gustavosta — MagicPrompt-Stable-Diffusion (GPT-2, Lexica-trained) — https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion"
---

# 1c — LLM-assisted prompt expansion & decomposition

**Research value: high.** Prior art is deep, convergent across vendors and academic groups, and spans five years of production-scale deployments. Directly applicable to the prompt-to-asset module.

## Executive Summary

Every competitive text-to-image (T2I) stack built since DALL-E 3 (Oct 2023) sits behind an **LLM prompt-rewriter**, not a raw user input box. The field has converged on three stacked ideas:

1. **Upsample short prompts into long, highly descriptive captions** — because the diffusion model was trained on synthetic long captions and performs poorly out-of-distribution on terse user queries (Betker et al. 2023 is the foundational argument).
2. **Train the rewriter with RL against image-level rewards** — aesthetic score, PickScore, CLIP alignment, compositional VQA — because supervised fine-tuning alone plateaus (Promptist, BeautifulPrompt, RePrompt, PromptToAsset all use SFT→RL).
3. **Decompose complex scenes before rendering** — either into explicit layouts (LayoutGPT), semantic units (DeCoT), or chain-of-thought reasoning traces (PromptToAsset, LayerCraft) — because monolithic long prompts still fail on attribute binding, counting, and spatial relations.

For a prompt-to-asset targeting arbitrary software-asset generation, the strongest design pattern is: **CoT-structured rewriting with a fine-grained evaluator reward**, deployed as a separate LLM stage in front of the generator, with an explicit preservation constraint on the original user intent.

## Key Findings

### 1. DALL-E 3 set the "GPT-4 rewrites everything" default
Betker et al. 2023 showed a T2I model trained on 95% synthetic long captions is **unusable on short human prompts out-of-the-box**, and solved this by having GPT-4 "upsample" any user query to a 15–80 word descriptive caption at inference time (paper §3.5, Appendix C prompt). The exact upsampler system prompt is published (Appendix C) and has become the de-facto template. Production ChatGPT additionally layers safety rewrites on top: artist substitution, public-figure genericization, branded-object removal, and mandatory demographic diversification of people (per the 2023-10-07 leaked system prompt and OpenAI's DALL-E 3 system card).

### 2. Two-stage SFT → RL has become the standard training recipe
| System | Year | Base model | SFT data | RL reward |
|---|---|---|---|---|
| Promptist (Microsoft) | 2022 | GPT-2 | manually-engineered prompt pairs | CLIP sim + aesthetic score |
| MagicPrompt | 2022 | GPT-2 | 80k Lexica.art prompts | none (SFT only) |
| BeautifulPrompt (Alibaba) | 2023 | BLOOM-like | low→high quality pairs | PickScore + Aesthetic |
| Prompt Expansion (Google, Datta et al.) | 2024 | PaLM-family | query→expansion corpus | diversity + aesthetics |
| RePrompt (Microsoft) | 2025 | LLM w/ reasoning | none (RL-only) | human-pref + semantic + composition |
| PromptToAsset (Tencent Hunyuan) | 2025 | 7B/32B LLM | CoT (prompt, reprompt) pairs | AlignEvaluator over 24 failure-mode taxonomy |

Convergence is strong: all five post-2023 systems replace hand-engineered style suffixes ("trending on artstation, 8k, masterpiece") with **learned, image-grounded rewrites** and all report transferability across T2I backbones without retraining.

### 3. Chain-of-thought and decomposition beat monolithic expansion on hard prompts
PromptToAsset (arXiv:2509.04545) generates an explicit reasoning trace before emitting the final reprompt, optimized against a 24-point failure taxonomy covering attribute binding, negation, counting, and spatial relations. DeCoT (arXiv:2508.12396) formalizes a two-stage pipeline: (a) Complex Instruction Decomposition + Semantic Enhancement, (b) Multi-Stage Prompt Integration with adaptive rendering. LayerCraft (arXiv:2504.00010) treats image synthesis as step-by-step agentic reasoning with a CoT loop for object placement. LayoutGPT (Feng et al. NeurIPS 2023) takes the most structural approach, emitting **CSS-style numeric layouts** that a grounded diffusion backend (GLIGEN, etc.) consumes — 20–40% improvement on numerical reasoning and spatial-relation prompts over a plain LLM rewrite.

### 4. Expansion scales with target model's text-encoder capacity
- SD 1.5 / SDXL: CLIP encoder hard-truncates at **77 tokens**; long LLM rewrites get silently chopped unless chunked via the A1111-style weighted-embeddings trick or the `compel` library.
- DALL-E 3 / Imagen 3 / FLUX: T5-XXL encoder, effectively unbounded for practical prompts — this is why DALL-E 3's upsampler targets 15–80 words without worrying about truncation.
- Qwen-Image: 1024 tokens but with positional-encoding failures near the ceiling.

A prompt-to-asset **must know its downstream model's token budget** and format accordingly. A one-size-fits-all "make it long and flowery" rewriter fails on SDXL.

### 5. User-intent preservation is the unsolved constraint
Every paper pays lip service to "preserving original intent", but the production complaints about DALL-E 3 (OpenAI community forums, multiple threads 2023–2025) all describe the same failure: a short, stylistically specific prompt ("chibi art", "flat vector logo", "muted palette") gets rewritten into a generic photorealistic scene because the rewriter's aesthetic prior overrides the user's stylistic directive. The DALL-E 3 API exposes a `revised_prompt` output field but no opt-out, and there is no mechanism for the user to anchor specific tokens as inviolable.

## Concrete Prompt Examples

### Example 1 — DALL-E 3 upsampler (Betker et al. 2023, Appendix C)
**Before:**
```
a man holding a sword
```
**After (GPT-4 upsample, from paper):**
```
a pale figure with long white hair stands in the center of a dark forest,
holding a sword high above his head. the blade glows with a blue light,
casting a soft glow on the trees and bushes surrounding him.
```

### Example 2 — Drawbench upsample (Betker et al. 2023, Fig. 6)
**Before:**
```
A bird scaring a scarecrow.
```
**After:**
```
A large, vibrant bird with an impressive wingspan swoops down from the sky,
letting out a piercing call as it approaches a weathered scarecrow in a
sunlit field. The scarecrow, dressed in tattered clothing and a straw hat,
appears to tremble, almost as if it's coming to life in fear of the
approaching bird.
```

### Example 3 — Modification-aware rewrite (Appendix C, multi-turn)
**Turn 1 user:** `a man holding a sword` → assistant produces Example 1.
**Turn 2 user:** `make the light red`
**After (refactor, not append):**
```
a pale figure with long white hair stands in the center of a dark forest,
holding a sword high above his head. the blade glows with a red light,
casting a warm glow on the trees and bushes surrounding him.
```
Key design lesson: the DALL-E 3 upsampler prompt explicitly instructs "When modifications are requested, you should **not simply make the description longer**. You should refactor the entire description to integrate the suggestions." — i.e., diff-aware rewrites, not appends.

### Example 4 — LayoutGPT-style structural decomposition (Feng et al. 2023)
**Before:**
```
three elephants standing next to a small red car on the left side of a tree
```
**After (emitted as CSS-like layout):**
```
{canvas: 512x512}
.tree   { left: 340px; top: 120px; width: 140px; height: 380px; }
.car    { left: 40px;  top: 330px; width: 120px; height: 90px;  fill: red; }
.elephant#1 { left: 170px; top: 280px; width: 100px; height: 140px; }
.elephant#2 { left: 180px; top: 250px; width: 100px; height: 140px; }
.elephant#3 { left: 195px; top: 230px; width: 100px; height: 140px; }
```
This is then consumed by GLIGEN or a grounded SD backend. The LLM does numeric reasoning ("three") and spatial parsing ("left of tree"); the diffusion model does not have to.

## Known Failures & Artifacts

1. **Intent override / style drift.** DALL-E 3 user-reported failure (OpenAI community thread 476355): `"a logo of Open AI in a green background"` was silently rewritten to `"An emblem that depicts the concept of openness and artificial intelligence, set against a verdant..."` and produced a green coin with a dollar sign. The rewriter's "make it imaginative" prior clobbered the user's request for a literal logo. Mitigation: preserve literal noun phrases and type-qualifiers (logo, icon, diagram, wireframe) verbatim; only expand the stylistic/atmospheric slots.

2. **77-token silent truncation.** Any SD 1.5 / SDXL pipeline that accepts a 120-token LLM rewrite discards tokens past position 77 without erroring (HuggingFace diffusers issue #2136). The trailing style suffix — often the most important part — is what gets dropped. Mitigation: detect the downstream encoder budget and either (a) compress with the rewriter, or (b) use `compel` / long-prompt-weighted embeddings.

3. **Spatial-relation failures persist after expansion.** Betker et al. 2023 §5.1 explicitly admits DALL-E 3 remains unreliable on "to the left of", "underneath", "behind", because the training-set captioner itself was unreliable on placement. LLM expansion does **not** fix this; only explicit layout decomposition (LayoutGPT, LayerCraft, grounded-diffusion backends) does.

4. **Attribute-binding hallucinations.** PromptToAsset's whole motivation (§2 of arXiv:2509.04545) is that a single-pass LLM rewrite still produces "blue cat next to red dog" → a purple cat-dog hybrid on commodity T2I. Their 24-point AlignEvaluator taxonomy names this class explicitly; their CoT reasoning + RL reward is what moves the needle.

5. **Captioner hallucination cascade.** Betker et al. §5.3: the synthetic captioner invents plant genera and bird species in training captions, causing DALL-E 3 to be unreliable on specific scientific names ("Arum dioscoridis" is a Fig. 7 failure case). Any enhancer that over-specifies proper nouns risks the same downstream failure.

6. **Safety rewrite leakage.** The DALL-E 3 system prompt mandates silent substitution of artist names with "three adjectives + movement + medium" and silent demographic diversification of any person reference. This produces visible drift when users ask for, e.g., a self-portrait style — and there is no way to disable it in the public API.

## Tools, Libraries, Code

- **Promptist** — [microsoft/LMOps/promptist](https://github.com/microsoft/LMOps/tree/main/promptist). GPT-2-based RL optimizer, HF Space demo. Reference implementation for the SFT→RL recipe.
- **MagicPrompt-Stable-Diffusion** — [Gustavosta on Hugging Face](https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion). 0.1B GPT-2, trained on 80k Lexica prompts, 3M+ downloads. Simplest possible baseline; good for terse SD 1.5 targets.
- **Hunyuan PromptEnhancer** — [Hunyuan-PromptEnhancer/PromptEnhancer](https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer). Tencent's 7B / 32B CoT rewriter, GGUF-quantized variants, I2I editing mode added Sept 2025, ~3.6k stars. Most production-ready 2025/2026 open release.
- **BeautifulPrompt** — released with the paper, integrated into Alibaba Cloud PAI. Code via EMNLP 2023 Industry Track.
- **RePrompt** — code on GitHub per the ICLR 2026 acceptance; RL-only training, no human-annotated pairs required.
- **LayoutGPT** — [layoutgpt.github.io](https://layoutgpt.github.io/). CSS-style layout emitter, pairs with GLIGEN.
- **compel** — [damian0815/compel](https://github.com/damian0815/compel). Long-prompt embeddings to bypass CLIP's 77-token cap on SD 1.5 / SDXL.
- **OpenAI Cookbook — "What's new with DALL·E 3"** — [cookbook.openai.com](https://cookbook.openai.com/articles/what_is_new_with_dalle_3). Confirms the rewriter cannot be disabled; documents `revised_prompt` return field.

## Open Questions

1. **How do you anchor "inviolable" user tokens through an LLM rewriter?** Nothing in the published literature solves this cleanly. Options worth prototyping: (a) copy-with-high-probability constraints via logit biasing on specific n-grams, (b) a post-rewrite verification step that checks the reprompt contains the user's original noun phrases, (c) structured output where the rewriter emits `{locked: [...], expanded: "..."}`.
2. **Can a single rewriter serve asset generation beyond images** — code-gen prompts, 3D scene prompts, UI mocks, audio? BeautifulPrompt and PromptToAsset are T2I-specific; the CoT-decomposition pattern should generalize, but no published work tests it on heterogeneous asset types.
3. **Latency budget.** A 32B CoT rewriter adds 1–3 s before the generator even starts. For interactive UX, does a small distilled rewriter (0.5B–1B) trained on 32B traces give 80% of the quality? No public ablation.
4. **Rewriter evaluation in the absence of gold prompts.** AlignEvaluator is a 24-point taxonomy specific to T2I; for software-asset prompts, what does the evaluator look like? Likely a task-specific rubric per asset type.
5. **Conflict between safety rewrites and user intent** remains unresolved industry-wide. No published framework surfaces the rewrite diff to the user or allows selective override.

## Citations

1. Betker et al. 2023, *Improving Image Generation with Better Captions* — https://cdn.openai.com/papers/dall-e-3.pdf
2. Hao et al. 2022 (NeurIPS 2023 Spotlight), *Optimizing Prompts for Text-to-Image Generation* (Promptist) — https://arxiv.org/abs/2212.09611
3. microsoft/LMOps — Promptist checkpoints & code — https://github.com/microsoft/LMOps/tree/main/promptist
4. Cao et al. EMNLP 2023 (Industry), *BeautifulPrompt* — https://arxiv.org/abs/2311.06752 · https://aclanthology.org/2023.emnlp-industry.1/
5. Datta, Ku, Ramachandran & Anderson, ACL 2024, *Prompt Expansion for Adaptive Text-to-Image Generation* — https://aclanthology.org/2024.acl-long.189/
6. Wu et al. 2025 (ICLR 2026 poster), *RePrompt: Reasoning-Augmented Reprompting via RL* — https://arxiv.org/abs/2505.17540
7. Tencent Hunyuan 2025, *PromptEnhancer: CoT Prompt Rewriting* — https://arxiv.org/abs/2509.04545 · https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
8. Feng et al. NeurIPS 2023, *LayoutGPT: Compositional Visual Planning* — https://arxiv.org/abs/2305.15393 · https://layoutgpt.github.io/
9. *DeCoT: Decomposing Complex Instructions for T2I* (2025) — https://huggingface.co/papers/2508.12396
10. *LayerCraft: CoT-driven layered scene generation* (2025) — https://arxiv.org/abs/2504.00010
11. Gustavosta, *MagicPrompt-Stable-Diffusion* — https://huggingface.co/Gustavosta/MagicPrompt-Stable-Diffusion
12. OpenAI Cookbook, *What's new with DALL·E 3* — https://cookbook.openai.com/articles/what_is_new_with_dalle_3
13. *DALL-E 3 System Prompt leak (2023-10-07)* — https://leaked-system-prompts.com/prompts/openai/openai-dall-e-3_20231007-2
14. HuggingFace diffusers issue #2136, *77-token limit* — https://github.com/huggingface/diffusers/issues/2136
15. OpenAI Developer Forum, *API rewrites my prompt without permission* (thread 476355) — https://community.openai.com/t/api-image-generation-in-dall-e-3-changes-my-original-prompt-without-my-permission/476355
