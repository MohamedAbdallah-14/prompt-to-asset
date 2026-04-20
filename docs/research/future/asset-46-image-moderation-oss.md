# 46 — Image Moderation / NSFW / Safety Classifiers (OSS survey)

Research grounding for the Tier-0 bundle validator. Project requirement: refuse to ship outputs
that are NSFW, violent, or contain hateful imagery. Deployment target is a Node pipeline with
ONNX Runtime; everything below is judged against that constraint plus the "flat brand / logo /
illustration" false-positive risk that dominates our output distribution.

Scope: **open-source, self-hostable, bundleable**. Cloud APIs (Google SafeSearch, AWS
Rekognition, Perspective) are explicitly out of scope and not covered.

## Candidate matrix

| Model | License | Size | Accuracy (self-reported) | Node / ONNX story | Coverage | Brand/flat FP risk |
|---|---|---|---|---|---|---|
| **Falconsai/nsfw_image_detection** (ViT-base) | **Apache-2.0** | safetensors 343 MB; **YOLOv9 ONNX ~87 MB**; INT8 quantized ONNX smaller | eval_accuracy **0.9804** on proprietary 80k eval split | Official ONNX + quantized ONNX published; runs cleanly under `onnxruntime-node`. 36M+ monthly downloads on HF. | Binary `normal` / `nsfw` only. No violence, no hate. | Not documented; binary ViT — risk of flagging skin-toned flat illustrations. Needs our own calibration set. |
| **nsfwjs** (InfiniteRed) | **MIT** | MobileNetV2 2.6 MB / Mid 4.2 MB / InceptionV3 "huge" | ~90% small, ~93% mid/large | **Native TF.js Node package**, no ONNX needed. Most frictionless Node story. | 5 classes: neutral / drawing / hentai / porn / sexy. | **Documented high FP on cartoons, manga, drawings, flat art** (issues #459, #520, #588). Maintainers intentionally bias toward FP. High risk for our illustration/logo outputs. |
| **OpenNSFW2** (bhky port of Yahoo Open-NSFW) | **MIT** | ~24 MB ResNet-50 weights | No published accuracy; legacy model | **No first-party Node or ONNX**. TF2/JAX/Python only; PyTorch path is slower and numerically different. ONNX export is possible but unofficial. | Binary "porn" only. | Legacy 2016-era model; known to be over-sensitive to skin tone. Not competitive vs Falconsai. |
| **CompVis/stable-diffusion-safety-checker** (CLIP ViT-L/14) | **CreativeML Open RAIL-M** (not OSI; has use restrictions) | ~1.2 GB | None published | Bundled for `diffusers`. ONNX export non-trivial; no maintained Node path. | Checks 17 **obfuscated** "sensitive concepts" via CLIP cosine similarity. | **Notoriously bad.** Documented FPs on prompts like "star", "riding horse", and swimsuits; blacks out fp16 artifacts on GTX 1660/1650. Arxiv 2210.04610 shows it ignores violence/gore and is trivially bypassable. **Do not use.** |
| **LAION-SAFETY** (EfficientNet V2 + Detoxify ensemble) | MIT (repo) | ~50 MB EfficientNet V2-S class | Self-reported FP 5.33%, FN 2.22% (ensemble); FP 7.96%, FN 3.55% (image-only) | Python; ONNX export possible but no published artifact. No Node SDK. | 5 classes + text toxicity. | Research-grade; known **context-shift failures** (OpenReview zhDO3F35Uc) — a subject in one scene detected, same subject in a crowd missed, up to 6× evasion rate. |
| **NudeNet** (notAI-tech) / vladmandic fork | **AGPL-3.0** (repo) — PyPI metadata says MIT (conflicting). Uses **Ultralytics YOLOv8** which is also **AGPL-3.0**. | 320n (nano) default; 640m optional; vladmandic fork has f16/f32/i16/i8 variants | Not published | Ships ONNX directly; vladmandic fork has quantized variants. Good Node story *if licensing fits*. | Object detection of body parts (not binary) — useful for targeted blur. | **License is a blocker for a bundled closed-source tool.** AGPL forces our whole distribution to AGPL or requires Ultralytics Enterprise License. Skip. |
| **jaranohaal/vit-base-violence-detection** | Apache-2.0 (ViT base) | ~345 MB safetensors; ~87 MB quantized ONNX achievable | 98.8% on Real-Life Violence Situations test split | ONNX exportable via `optimum`. No first-party Node SDK; same pattern as Falconsai. | Binary violent / non-violent. | Trained on a narrow Kaggle set — risk of surveillance-footage bias; unvalidated on stylized art. |
| **locih/violence_classification** | Apache-2.0 | ViT-base class | 94.8% | Same ONNX export path. | Binary. | Similar bias caveats; weaker than jaranohaal. |
| **abhi099k/image-multi-detect** | Apache-2.0 | ResNet-50, 224×224, sigmoid multi-label | Not independently verified | PyTorch + ONNX published. | 8 labels (violence, weapons, NSFW, hate symbols, etc.) in one head. | Single-author model, no independent eval. Treat as signal, not ground truth. |
| **moderate-hate-symbols** (Roboflow Universe) | CC BY 4.0 | YOLO object detector | Unknown | Exportable to ONNX via Roboflow. | Confederate flag + swastika only. | **Trained on 55 images** — far too small for production. Useful as inspiration, not as a classifier. |
| **Google Perspective API** | Managed service | — | — | Text-only; out of scope for image moderation. | — | — |

## Why the CLIP safety-checker path is a trap

`StableDiffusionPipeline.safety_checker` looks superficially attractive (already a dependency
of the ecosystem, covers "concepts" rather than pixel patterns), but every serious analysis of
it points the same direction:

- License is **CreativeML Open RAIL-M**, which carries behavioral use restrictions and is not
  OSI-approved — awkward for a tool that *distributes* bundled assets.
- Concept list is **obfuscated**; we cannot tell users why a refusal fired, which breaks the
  agent-native debuggability contract.
- Only covers **sexual** concepts; ignores violence and hate entirely (arxiv 2210.04610).
- **Well-documented FPs on benign prompts** ("star", swimsuits, fp16 green frames on consumer
  GPUs). Our output mix — flat brand marks, pastel illustrations, stylized OG images — is
  exactly the failure mode this filter exhibits.
- Trivially bypassable by prompt engineering (same paper), so it is also a weak *positive*
  filter.

Upstream `diffusers` now ships with the safety checker disabled by default for these reasons.

## NSFW-classifier bias on brand / flat imagery

This is the dominant risk for us. Signals from the literature and issue trackers:

- **nsfwjs**: maintainers explicitly say they bias toward false positives; manga and
  black-ink illustrations flag as `hentai` at 90%+ (issue #588). MobileNetV2 checkpoints were
  "not properly represented" on drawn content.
- **Falconsai ViT**: no public audit. Trained on a *proprietary* 80k set with unknown
  composition — we must treat its brand/illustration behavior as unknown until we run our own
  eval on a sample of our real outputs.
- **OpenNSFW / Yahoo**: 2016-era ResNet-50, trained pre-diffusion; known to over-trigger on
  skin tone and warm palettes. Functionally obsolete.
- **LAION SAFETY**: context-shift vulnerability — same subject evaluated 6× differently
  depending on surrounding scene composition.

The structural lesson across all of them: **every pixel-level NSFW classifier has a FP rate
in the 5–10% band on adversarial distributions**, and flat illustration is an adversarial
distribution relative to their training sets.

## Recommendation for the Tier-0 validator

**Primary:** Falconsai/nsfw_image_detection (ViT-base) via its published quantized ONNX
(~87 MB) running under `onnxruntime-node`. Apache-2.0, by far the most-downloaded OSS NSFW
classifier (36M+ monthly pulls), actively maintained, ships its own ONNX artifacts. Best
legal + operational fit.

**Thresholds (two-band):**
- `P(nsfw) >= 0.85` → hard block, do not bundle.
- `0.50 <= P(nsfw) < 0.85` → soft warn, route to secondary check (below).
- `P(nsfw) < 0.50` → pass.

The 0.85 cutoff is chosen because ViT NSFW classifiers exhibit a bimodal output on clean test
sets but a fatter mid-band on stylized content; empirically most benign brand imagery from
similar pipelines scores below 0.5, while actual NSFW scores above 0.9. We will validate on
our own sample before shipping.

**Secondary (runs only in the warn band):** nsfwjs InceptionV3 (MIT, 93%). Independent
training data, different backbone — ensembling two orthogonal models is the standard trick to
collapse single-model FPs. Block only if **both** agree (`nsfwjs P(porn|hentai|sexy) >= 0.7`).

**Violence:** jaranohaal/vit-base-violence-detection, exported to ONNX via `optimum`, same
onnxruntime-node runner. `P(violent) >= 0.80` blocks. Acknowledge narrow training distribution
(surveillance footage) and keep the threshold conservative.

**Hate symbols:** OSS coverage is genuinely thin — no model in the survey is production-grade.
Plan: (a) ship **without** a dedicated hate-symbol classifier in Tier-0; (b) rely on the
generator-side prompt filter plus a Tier-1 VLM caption check (e.g., a small vision LLM asked
"does this image contain hate symbols, extremist iconography, or known hate group imagery?")
for the specific asset types where the risk is real (user-supplied references, illustration
generation with open prompts). Document this gap explicitly in the validator contract.

**Explicitly rejected:**
- **NudeNet** — AGPL-3.0 + Ultralytics YOLOv8 AGPL. Blocks commercial/proprietary bundling.
- **stable-diffusion-safety-checker** — RAIL-M license, obfuscated concept list, documented
  benign-prompt FPs, no violence coverage, easily bypassed.
- **OpenNSFW / OpenNSFW2** — legacy, binary, Python-only, superseded by Falconsai on every
  axis we care about.
- **LAION SAFETY** — research code, no Node story, context-shift failure mode.

## Calibration plan (before we lock thresholds)

1. Assemble a held-out eval set of ~500 of our own generated assets (logos, OG images, flat
   illustrations, favicons, icons) — all known-safe.
2. Assemble ~100 known-unsafe NSFW images from a public eval set (not training data).
3. Score all of them through Falconsai ONNX and nsfwjs InceptionV3.
4. Plot score distributions; confirm the 0.85 / 0.50 bands cleanly separate our real
   benign distribution from the unsafe distribution. Adjust if not.
5. Record FP rate on our benign set; target < 1%. If > 1%, raise the primary threshold and
   widen the warn band.

## Sources

- [Falconsai/nsfw_image_detection model card](https://huggingface.co/Falconsai/nsfw_image_detection) — Apache-2.0, ViT-base, 98.04% eval, 36M+ monthly downloads, ONNX + YOLOv9 variants.
- [Falconsai/nsfw_image_detection_26](https://huggingface.co/Falconsai/nsfw_image_detection_26) — 2026 edition, 1.2M training images, published `onnx_model` and `quantized_onnx` folders.
- [infinitered/nsfwjs](https://github.com/infinitered/nsfwjs) — MIT, 5-class, MobileNetV2 (2.6 MB, ~90%), Mid (4.2 MB, ~93%), InceptionV3 (~93%).
- [nsfwjs issues #459, #520, #588](https://github.com/infinitered/nsfwjs/issues/588) — documented false positives on cartoons/drawings/manga; intentional FP bias.
- [bhky/opennsfw2](https://github.com/bhky/opennsfw2) — MIT, TF2/Keras port of Yahoo Open-NSFW, no first-party ONNX/Node.
- [CompVis/stable-diffusion-safety-checker](https://huggingface.co/CompVis/stable-diffusion-safety-checker) — CreativeML Open RAIL-M.
- [CompVis/stable-diffusion issue #239](https://github.com/CompVis/stable-diffusion/issues/239) — safety-checker FP examples and fp16 blackout bug.
- [arxiv 2210.04610](https://arxiv.org/pdf/2210.04610v5) — audit of SD safety filter: 17 obfuscated concepts, sexual-only, trivially bypassable.
- [LAION-AI/LAION-SAFETY](https://github.com/LAION-AI/LAION-SAFETY) — EfficientNet V2 + Detoxify ensemble; published FP/FN rates.
- [notAI-tech/NudeNet](https://github.com/notAI-tech/NudeNet) and [vladmandic/nudenet](https://github.com/vladmandic/nudenet) — YOLOv8-based (AGPL-3.0), ONNX precision variants.
- [ultralytics/ultralytics issue #14297](https://github.com/ultralytics/ultralytics/issues/14297) — YOLOv8 AGPL-3.0 commercial-use constraints.
- [jaranohaal/vit-base-violence-detection](https://huggingface.co/jaranohaal/vit-base-violence-detection) — ViT violence classifier, 98.8% on Real-Life Violence Situations.
- [abhi099k/image-multi-detect](https://huggingface.co/abhi099k/image-multi-detect) — ResNet-50 multi-label (violence, weapons, NSFW, hate symbols).
- [moderate-hate-symbols (Roboflow Universe)](https://universe.roboflow.com/roboflow-s8kjj/moderate-hate-symbols) — CC BY 4.0, 55-image training set (insufficient).
