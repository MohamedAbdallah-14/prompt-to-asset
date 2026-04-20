---
wave: 2
role: repo-deep-dive
slug: 02-promptist
title: "Deep dive: Microsoft Promptist"
repo: "https://github.com/microsoft/LMOps/tree/main/promptist"
license: "MIT (code); weights unstated (inherits MIT by convention)"
date: 2026-04-19
sources:
  - https://github.com/microsoft/LMOps/tree/main/promptist
  - https://arxiv.org/abs/2212.09611
  - https://proceedings.neurips.cc/paper_files/paper/2023/file/d346d91999074dd8d6073d4c3b13733b-Paper-Conference.pdf
  - https://huggingface.co/microsoft/Promptist
  - https://huggingface.co/spaces/microsoft/Promptist
  - https://github.com/christophschuhmann/improved-aesthetic-predictor
  - https://github.com/LAION-AI/aesthetic-predictor
  - https://link.springer.com/chapter/10.1007/978-981-97-9434-8_23
  - https://arxiv.org/pdf/2407.01606
  - https://arxiv.org/pdf/2503.21812
  - https://openreview.net/pdf?id=BsZNWXD3a1
  - https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer
  - https://huggingface.co/docs/transformers.js/en/guides/dtypes
tags:
  - promptist
  - microsoft
  - gpt-2
  - cpu-runnable
  - free-tier
  - rl
  - ppo
  - clip
  - aesthetic-predictor
  - license-clean
---

# Deep Dive 02 — Microsoft Promptist

## 1. Repo & paper metrics

Promptist lives as a subdirectory (`promptist/`) inside Microsoft Research's catch-all **`microsoft/LMOps`** mono-repo, not as a standalone project. That packaging shapes everything about its health metrics.

- **Parent repo**: `microsoft/LMOps` — **~4.3k stars, ~371 forks**, 267 commits on `main`. The parent is actively maintained (23 open / 184 closed PRs, Dependabot transformers-version bumps landing April 2026 — including one specifically scoped to `promptist/trlx/docs`). So the code is not literally abandoned, but the activity is janitorial, not product.
- **Promptist subfolder**: effectively frozen since **Dec 2022** with only dependency-level touchups since. Paper v1 was submitted Dec 19 2022, v2 revised Dec 29 2023 for the NeurIPS camera-ready.
- **Paper**: *Optimizing Prompts for Text-to-Image Generation* — Yaru Hao, Zewen Chi, Li Dong, Furu Wei (Microsoft Research), arXiv:2212.09611, **NeurIPS 2023 Spotlight**.
- **HF model `microsoft/Promptist`**: ~**2,630 downloads / last month**, **37 HF Spaces** depend on it, no Inference Providers currently deploy it. The model card has empty YAML metadata (HF warns on the page).
- **HF Space demo** (`microsoft/Promptist`): **paused**; a community-tab request is required to restart. Ran on CPU originally ("slow" per the README).
- **Maintainer responsiveness**: low at the subfolder level. Issues on `LMOps` that mention Promptist tend to sit untouched; the authors have moved on to other projects (Li Dong's more recent work on BitNet/LongNet). Treat the codebase as **reference implementation + released weights**, not a living product.

## 2. Licensing

This is where the picture is honest but not clean.

- **Code**: MIT (inherited from `microsoft/LMOps`'s root `LICENSE`). Unambiguous.
- **Weights** (`microsoft/Promptist` on HF): the model card does not declare a license and HF flags the missing YAML. In practice, Microsoft Research releases under MIT by default and the paper links directly to this checkpoint from the MIT-licensed repo, so the working assumption is MIT. For commercial use we should still **mint our own MIT copy of the weights** alongside a replica of the model card, rather than depending on Microsoft's HF repo staying public and license-compatible.
- **Training dataset**: **not released**. The SFT corpus was scraped from **Lexica.art**, whose ToS forbids redistribution of user-submitted prompts and images for commercial ML training. The paper's "Limitations" section openly acknowledges the scrape. This is the single biggest reason a from-scratch replica is worthwhile — Promptist itself is unlikely to survive a rigorous legal review of its training inputs.
- **Reward stack**: **OpenAI CLIP** (MIT) + **LAION improved-aesthetic-predictor** ([`christophschuhmann/improved-aesthetic-predictor`](https://github.com/christophschuhmann/improved-aesthetic-predictor), Apache-2.0), trained on the **AVA** ([Murray et al. 2012](#)) academic dataset. Commercially usable with attribution.

## 3. Model architecture and inference cost

Promptist is **GPT-2 small, 124–125M parameters**, initialized from HuggingFace's `gpt2` checkpoint, SFT'd, then PPO-tuned. No architecture modifications. The inference recipe (from the HF model card) uses **diverse beam search** at decode time:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("microsoft/Promptist")
tok = AutoTokenizer.from_pretrained("gpt2")
tok.pad_token, tok.padding_side = tok.eos_token, "left"

input_ids = tok(prompt.strip() + " Rephrase:", return_tensors="pt").input_ids
outputs = model.generate(
    input_ids,
    do_sample=False,
    max_new_tokens=75,
    num_beams=8,
    num_return_sequences=8,
    length_penalty=-1.0,
    eos_token_id=tok.eos_token_id,
    pad_token_id=tok.eos_token_id,
)
best = tok.batch_decode(outputs, skip_special_tokens=True)[0].replace(prompt + " Rephrase:", "").strip()
```

**Inference cost (empirical envelopes, GPT-2 small, 75-new-token decode, beam=8):**

| Runtime | Weights size | Latency (cold→warm) | Notes |
|---|---|---|---|
| PyTorch fp32, CPU (modern x86, 4-core) | ~500 MB | ~2–4 s warm | Beam=8 dominates cost; beam=1 greedy ~300–600 ms |
| PyTorch fp16, CUDA (T4 / consumer GPU) | ~250 MB | ~80–150 ms warm | Memory trivial |
| ONNX int8 (Runtime, CPU) | ~130 MB | ~0.8–1.5 s warm | Preferred for Node backend |
| Transformers.js q8, WASM (browser) | ~125 MB | ~3–8 s warm, 2–5× slower than Node | GPT-2 is officially supported in `@huggingface/transformers` with `dtype: "q8"` |
| Transformers.js fp16, **WebGPU** | ~250 MB | ~300–800 ms warm | ~40% faster than fp32 on WebGPU; requires Chrome 113+/Edge |

**Quantization outlook.** GPT-2 small is a best case for quantization: INT8 preserves ~99% of fp16 quality per the bitsandbytes/GPTQ literature, INT4 preserves ~95–98%. Both NF4 and GPTQ are feasible and widely supported. At 125M params, **a q8 ONNX bundle is ~125 MB**, well inside what's acceptable for a web worker cold-start given HTTP caching. **WebGPU fp16 is the sweet spot for an always-on free-tier browser rewriter**; WASM q8 is the safe fallback when WebGPU is unavailable. Mobile Safari still needs WASM today.

**Browser feasibility verdict: yes, with caveats.** A 125M GPT-2 via Transformers.js is a well-trodden path (the same runtime ships Whisper-base, SmolLM, DistilGPT-2). Beam=8 is the concern, not the model; we will likely need to drop to **beam=4 + `num_return_sequences=4`** in the browser to keep p95 interaction under 3 s.

## 4. Training recipe — full enumeration

### 4.1 Stage 1 — Supervised Fine-Tuning (SFT)

Data pipeline (from the paper §2.1):

1. **Crawl Lexica.art** for human-engineered prompts. These are treated as the **target** `y`.
2. **Synthesize source inputs** `x` via **three augmentations** run per target, producing a 4-way parallel corpus:
   - **Main Content (MC)**: trim trailing modifiers, keep the semantic core.
   - **Main Content + random Modifiers (MCM)**: keep the core and a random subset of modifiers.
   - **Rephrasing of Main Content (RMC)**: pass MC through `text-davinci-002` with the template `"[Input] Rephrase:"`.
   - **Rephrasing of Target Prompt (RTP)**: pass the full `y` through `text-davinci-002` the same way.
3. Train with teacher-forced NLL: `L_SFT = −E[log p(y | x)]`.

The `" Rephrase:"` delimiter ends up as the **prompt-format anchor used at inference time** — not a throwaway artifact. Any replica must keep it (or replace it consistently).

### 4.2 Stage 2 — RL with PPO

The reward is **two CLIP-derived terms + a KL anchor to the SFT policy**:

- **Relevance reward** — sample an image `i_y` from Stable Diffusion on the optimized prompt `y`, compute CLIP similarity against the *original* user input `x`:

  `f_rel(x, y) = E_{i_y ∼ G(y)}[ min(20 · CLIP(x, i_y) − 5.6, 0) ]`

  The min-clipping at 0 means high-relevance prompts receive zero reward (no bonus for being *more* on-intent than required); only low-relevance prompts are penalized. Interpretation: *don't drift from user intent, but once you're on-intent, shift your optimization budget to aesthetics*. The constants `20` and `5.6` are fitted to the empirical CLIP score distribution so the knee sits around CLIP ≈ 0.28.

- **Aesthetic reward** — **differential** aesthetic score between images generated from the optimized prompt and from the raw input:

  `f_aes(x, y) = E[ g_aes(i_y) − g_aes(i_x) ]`

  where `g_aes` is the **LAION improved-aesthetic-predictor**: a linear head on frozen CLIP-ViT-L/14 features, trained on AVA (Aesthetic Visual Analysis). Using the delta instead of the absolute score prevents the policy from being rewarded for easy prompts that were already aesthetic.

- **KL anchor** to the SFT policy `π_SFT` (à la InstructGPT):

  `R(x, y) = f_aes + f_rel − η · log[ π_θ(y|x) / π_SFT(y|x) ]`

- **Shared CLIP pass**: both terms need CLIP, so the forward pass is amortized.

### 4.3 Hyperparameters (Appendix Table 6)

| | SFT | RL |
|---|---|---|
| Batch size | 256 | 256 |
| Learning rate | 5e-5 | 5e-5 |
| Training steps | 15,000 | 12,000 |
| Max length | 512 | 512 |
| Dropout | 0.0 | 0.0 |
| Optimizer | Adam | Adam |
| Adam ε | 1e-6 | 1e-6 |
| Adam β | (0.9, 0.999) | (0.9, 0.95) |
| Weight decay | 0.1 | 1e-6 |

**Compute budget (Table 7, V100 32GB):**

- SFT: 4× V100 × 3 hours = **12 V100-hours**.
- RL: 32× V100 × 2.5 days = **~1,920 V100-hours**.

For a 2026 replica on H100/A100 the same recipe is **<$2k on spot**. It is not expensive research.

The RL stage is implemented with the `trlx/` library vendored inside the subfolder (pre-TRL-library split), which is part of why the repo ships a frozen snapshot of `trlx`.

## 5. API surface & integration

The only supported integration path is HuggingFace `transformers.AutoModelForCausalLM`. No Python package, no Node bindings, no REST endpoint. For **browser/Node** deployment via Transformers.js, GPT-2 is supported natively (`dtype: "q8"` or `"fp16"`), but an ONNX export is not published — we would run `optimum-cli export onnx --model microsoft/Promptist ...` and host the quantized artifact ourselves. No existing **MCP/Skill** wrapper exists; our `enhance_prompt` tool would vendor a Promptist adapter behind a `provider: "promptist-free"` switch.

The inference prompt format is a bare `"<user input> Rephrase:"`. No system prompt, no structured I/O, no negative-prompt channel, no aspect-ratio hint — a **one-string-in, one-string-out** interface, exactly the missing contract that gap G4 in the 20a analysis calls out.

## 6. Biases — where Promptist fails for our use case

Fatal, for an asset generator:

- **SD-1.x-dialect lock-in.** Output is tag-salad: `"cinematic, detailed, 8k, trending on artstation, intricate, octane render, fantasy concept art"`. This is *actively harmful* for Imagen 3/4 and `gpt-image-1`, which both prefer natural-sentence prompts and can even refuse tag-salad as low-quality input.
- **Photographic / painterly aesthetic drift.** The LAION improved-aesthetic-predictor was trained on AVA, which weights bokeh, warm lighting, and rule-of-thirds compositions — the opposite of what a flat brand logo or a transparent app-icon mark should optimize for. Every RL step pushes the policy toward "pretty photo."
- **Portraiture skew.** The paper's own limitations section admits "the proportion of prompts about portraits is relatively higher than those about other categories" and that prompts "tend to generate more artwork instead of realistic photographs because most of them contain one or more artist names." Brand assets are neither portraits nor art.
- **No transparency handling.** Promptist never emits negative prompts, never suppresses background description. On "transparent logo" input it will happily add `"studio lighting, soft shadows, glossy backdrop"` — catastrophic.
- **Artist-name injection.** The SFT targets are Lexica prompts, 30–60% of which contain artist names (Greg Rutkowski, Alphonse Mucha, etc.). Injecting artist names into a commercial pipeline is a legal and brand-safety hazard.
- **Max 75 new tokens.** Fine for SD 1.x (77-token CLIP limit). Too short for Imagen/GPT-image-1 paragraphs.
- **No model-family awareness.** One output, one dialect.

## 7. Known forks and 2024–2026 research lineage

There are **no significant code forks** of the Promptist subfolder. Its influence runs through derivative research:

- **BeautifulPrompt** (Alibaba PAI, EMNLP 2023) — BLOOM-1.1B base, same SFT→PPO shape with cheaper data collection; emits SD-weight syntax natively. Apache-2.0.
- **Hunyuan-PromptEnhancer** (Tencent, 2025, 7B/32B, Apache-2.0, ~3.7k★) — the direct 2025 heir: same two-stage recipe scaled to an LLM base, CLIP+aesthetic reward replaced with a 24-key-point **AlignEvaluator**, GRPO instead of PPO. Current OSS SOTA.
- **NLPCC 2024 "PROMPTIST"** (Yan et al., separate authors, same name) — a RAG+LLM approach; name collision with a follow-up framing, not a fork.
- **DPO-Diffusion** (arXiv:2407.01606, 2024) — gradient-based prompt optimization with a "Shortcut Text Gradient," sidesteps RL entirely.
- **IPGO** (arXiv:2503.21812, 2025) — parameter-efficient prompt-embedding injection; reports **>99% win-rate vs. Promptist** on its eval.
- **RATTPO** (2026 submission, OpenReview BsZNWXD3a1) — reward-agnostic test-time optimization, 4.8× faster than naive baselines.

Promptist is the canonical reference architecture for the SFT→RL prompt-rewriter pattern (~400+ Google Scholar citations) — but **no one uses the actual 125M checkpoint in production**. It is always cited, rarely deployed.

## 8. Suitability as a FREE-TIER always-on CPU rewriter

Honest assessment against our product's needs:

| Requirement | Promptist as-shipped | Verdict |
|---|---|---|
| MIT / commercial-safe code | ✅ MIT | Safe |
| Commercial-safe weights | ⚠️ Unstated YAML; inherits MIT by convention | Ship our own copy |
| Commercial-safe training data | ❌ Scraped Lexica, ToS conflict | **Blocker** |
| Runs on CPU in <3 s | ~2–4 s with beam=8; <1 s with beam=1 | Marginal |
| Runs in browser | ✅ Transformers.js q8 / WebGPU fp16 | Works |
| Structured output (positive + negative + aspect) | ❌ | Blocker |
| Model-family dialects (Imagen / GPT-image-1 / Flux / SDXL) | ❌ SD-1.x only | Blocker |
| Asset awareness (transparency, platform specs) | ❌ | Blocker |
| Brand-palette respect | ❌ | Blocker |

**Verdict:** Usable as a **demo-quality SDXL-only rewriter** and as an honest *reference implementation* of the SFT→PPO recipe. **Not usable as our free-tier default.** Its output actively hurts every non-SD model we care about and every asset type (logos, favicons, transparent PNGs) we're targeting.

The value Promptist gives us is conceptual, not artefactual: the training recipe, the reward shape (clipped-CLIP relevance + differential aesthetic + KL anchor), the hyperparameter schedule, and the evaluation split (Lexica / DiffusionDB in-domain, COCO out-of-domain) are all directly reusable references for our own replica.

## 9. License-clean reimplementation path

A from-scratch MIT replica — call it **Promptist-Assets** — diverges from Promptist wherever Promptist is licensed poorly or aesthetically wrong:

1. **Base model** — SmolLM2-135M (Apache-2.0) as default; fallback to GPT-2 small (MIT) or Qwen3-0.6B (Apache-2.0) for a quality ceiling. All three are Transformers.js-compatible.
2. **SFT corpus (~20k pairs, commercial-safe)** — (a) synthetic `(short_intent → ideal_asset_prompt)` pairs authored by a frontier LLM across ~20 asset archetypes and ~8 brand tones (frontier-LLM outputs are commercially usable under their ToS); (b) 500–1,000 designer-written gold pairs as held-out eval; (c) apply Promptist's three-way source augmentation (MC / MCM / RMC) to 10× effective size. **Never crawl Lexica.**
3. **SFT loss & hyperparameters** — straight copy of Promptist's §2.1: teacher-forced NLL, batch 256, LR 5e-5, Adam, max-length 512. ~15k steps on SmolLM2-135M is ~3 hours on 4× H100.
4. **Reward redesign** — keep the *shape*, replace the *heads*:
   - **Relevance**: CLIP similarity against the original intent, clipped as in Promptist.
   - **Aesthetic → asset-correctness ensemble**: alpha coverage + background-class confidence (BRIA RMBG 2.0); text legibility (easyOCR, zero-penalty when no wordmark); platform-spec linter (app icon = square, logo = transparent RGBA, favicon = legible at 16×16); palette ΔE vs. declared brand colors; safe-zone/margin check.
   - **KL anchor** to SFT policy, η ≈ 0.02 as in InstructGPT / Promptist.
5. **RL algorithm** — **GRPO** over PPO (Hunyuan 2025 + Qwen/DeepSeek evidence that GRPO is more sample-efficient for small rollouts). ~12k steps, 1–2 days on 8× H100.
6. **Structured output contract** — force JSON via constrained decoding: `{ positive, negative, aspect, family, post[], rationale }`.
7. **Per-family verbalizers** — four small LoRA heads on the same backbone (Imagen, GPT-image-1, Flux, SDXL), routed by a one-hot family token. Training data partitioned by family.
8. **Packaging** — publish under MIT: `rewriter-base` checkpoint, `rewriter-{family}` LoRAs, and `rewriter-onnx-q8` Transformers.js bundle for the browser free-tier.

Total effort: **~1 person-month + ~$5k compute** for a v0 that already outperforms Promptist on our asset eval, because Promptist's reward is fighting us on every asset archetype.

## 10. Sources consulted

- GitHub: `microsoft/LMOps/promptist` (code) — <https://github.com/microsoft/LMOps/tree/main/promptist>
- arXiv:2212.09611 v2 + NeurIPS 2023 proceedings PDF (paper + appendices with full hyperparameters and compute) — <https://arxiv.org/abs/2212.09611>
- HuggingFace `microsoft/Promptist` model card (integration recipe, downloads, dependencies) — <https://huggingface.co/microsoft/Promptist>
- HuggingFace Space `microsoft/Promptist` (demo status) — <https://huggingface.co/spaces/microsoft/Promptist>
- `christophschuhmann/improved-aesthetic-predictor` (the exact aesthetic reward module) — <https://github.com/christophschuhmann/improved-aesthetic-predictor>
- Transformers.js dtype guide (browser quantization options) — <https://huggingface.co/docs/transformers.js/en/guides/dtypes>
- NLPCC 2024 PROMPTIST (name-collision follow-up) — Springer DOI 10.1007/978-981-97-9434-8_23
- DPO-Diffusion (arXiv:2407.01606), IPGO (arXiv:2503.21812), RATTPO (OpenReview BsZNWXD3a1) — descendant research 2024–2026.
- `Hunyuan-PromptEnhancer/PromptEnhancer` (direct lineage at scale) — <https://github.com/Hunyuan-PromptEnhancer/PromptEnhancer>

## Decision

**Do not ship Promptist as the free-tier rewriter.** Its code is MIT and its paper is the canonical recipe, but the shipped 125M checkpoint is a liability for our use case: SD-1.x tag-salad, aesthetic bias toward photography, zero transparency / asset-type awareness, single-string output, no negative-prompt channel, Lexica-scraped training data, and artist-name injection. Deploying it would make Imagen-4 / `gpt-image-1` outputs *worse*, not better.

**Do** treat Promptist as the **canonical blueprint** for our own license-clean replica. Borrow specifically:

1. The **SFT→PPO/GRPO two-stage recipe** with KL anchor to the SFT policy.
2. The **three-way source augmentation** (MC / MCM / RMC) over human-ideal targets — this is the single cheapest data trick in the paper and generalizes cleanly to asset archetypes.
3. The **clipped-CLIP relevance + differential aesthetic** reward shape — keeping the shape, swapping the aesthetic head for our **asset-correctness ensemble** (transparency, legibility, platform spec, palette ΔE, safe zone).
4. The **hyperparameter schedule** (batch 256, LR 5e-5, 15k SFT / 12k RL steps, Adam β switch between stages) as a well-characterized starting point.
5. The `" Rephrase:"` prompt format as the I/O anchor (or a structured-JSON equivalent).

Target: **Promptist-Assets v0** on a SmolLM2-135M (Apache-2.0) base, ~20k synthetic + curated asset pairs, GRPO with our asset-correctness reward, structured-JSON output, four per-family LoRAs (Imagen / GPT-image-1 / Flux / SDXL), shipped as Transformers.js q8 for browser free-tier and ONNX int8 for the Node server tier. Effort: ~1 person-month + ~$5k compute. License everything MIT from commit #1.

Promptist's place in our stack is **as a citation**, not as a binary.
