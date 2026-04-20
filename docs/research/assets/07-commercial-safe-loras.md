# Commercial-Safe Diffusion LoRAs & Style Weights

> Research brief for `prompt-to-asset` brand-lock stage (`asset_generate_illustration`).
> Scope: identify LoRA / IP-Adapter / style-weight sources that are *safe to ship in a paid product* and that `diffusers` can load at runtime.
> Last researched: 2026-04-19.

---

## TL;DR — The licensing fault line

Every "commercial-safe" claim in this document resolves to one of three upstream licenses. Get this straight before ingesting anything:

| Base model | License | Commercial OK? | Notes |
|---|---|---|---|
| **FLUX.1 [schnell]** | Apache 2.0 | Yes, unconditionally | LoRAs trained on schnell inherit Apache-2.0. Safest Flux path. |
| **FLUX.1 [dev]** | `flux-1-dev-non-commercial-license` | **No** (self-host) | Any LoRA trained on dev inherits NC. Requires BFL commercial license or hosted API (Replicate/fal/BFL) to sell outputs. |
| **SDXL 1.0 / SD 1.5** | CreativeML Open RAIL++-M / RAIL-M | Yes, with use-based restrictions | LoRA authors can attach an *addendum* that narrows this (e.g. "no selling images"). Must be verified per-LoRA, not per-platform. |

Rule of thumb the project should encode: **if the upstream base model is Flux Dev, don't ship it.** Either swap to schnell, run an SDXL fallback, or route through a licensed hosted API (Recraft, BFL, Replicate's commercial tier).

Sources: [Flux Schnell model card](https://huggingface.co/black-forest-labs/FLUX.1-schnell/), [Ostris schnell training adapter](https://huggingface.co/ostris/FLUX.1-schnell-training-adapter), [SDXL LICENSE.md](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md), [Civitai licensing guide](https://education.civitai.com/guide-to-licensing-options-on-civitai/).

---

## 1. Source registries

### 1.1 Civitai

- URL: <https://civitai.com>
- Commercial filter UI: on any model page, the "Permissions" block shows four icons; the relevant ones are **"Sell generated images"** and **"Sell this model or merges"**. When a creator *unchecks* a permission, an icon appears on the card.
- Mechanism: for SD 1.5 / SDXL models, Civitai auto-generates an **addendum to the CreativeML Open RAIL license** reflecting the creator's permission choices ([guide](https://education.civitai.com/guide-to-licensing-options-on-civitai/)). That addendum is the binding document — not the default OpenRAIL text.
- Gotcha: some creators leave the toggles default (commercial allowed) but write in the description "contact me on WeChat for commercial use" (e.g. `Zavy's Cute Flat Drawings`, Yamer's Pixel Fusion). The prose overrides the toggles in practice; treat these as **not safe** without written consent.
- Search filter URL pattern: `?tag=style&baseModels=SDXL 1.0&allowCommercialUse=Image,Rent,Sell` (approximate; the UI-exposed filter is the most reliable).

### 1.2 Hugging Face Hub

- URL: <https://huggingface.co/models?other=lora>
- License facet filter: `?license=apache-2.0`, `?license=mit`, `?license=creativeml-openrail-m`, `?license=openrail++`.
- Strong preference order for us: **apache-2.0 > mit > openrail++/openrail-m > cc-by-4.0**. Anything `cc-by-nc-*`, `flux-1-dev-non-commercial-license`, or unlabeled → reject.
- Diffusers first-class loader support for `.safetensors` via `StableDiffusionXLLoraLoaderMixin.load_lora_weights()` and `FluxLoraLoaderMixin.load_lora_weights()` ([loaders/lora.md](https://github.com/huggingface/diffusers/blob/main/docs/source/en/api/loaders/lora.md)).

### 1.3 OpenModelDB

- URL: <https://openmodeldb.info>
- Scope: **upscalers, not style LoRAs.** This is where the "illustration-output → 4× clean upscale" step belongs, not the brand-lock stage.
- Commercial filter: `?license=commercial` ([example](https://openmodeldb.info/?t=faces+photo+input%3Aimage+license%3Acommercial)). Recommended license types: CC0-1.0, CC-BY-4.0, MIT, Apache-2.0.
- Important carve-out ([licenses doc](https://openmodeldb.info/docs/licenses)): **the upscaler's license does not propagate to upscaled images.** Even a `CC-BY-NC` upscaler can be used to upscale images you intend to sell — the output's copyright inherits from the input image, not the model. This relaxes the filter for this stage, but we'll keep the `license:commercial` rule for defensibility.

### 1.4 Glif (`glif-loradex-trainer` + `glif/loradex-flux-dev`)

- URL: <https://huggingface.co/glif-loradex-trainer>, <https://huggingface.co/glif/loradex-flux-dev>
- **Status: REJECT for brand-lock stage.** The entire Loradex program trains on Flux Dev and inherits the `flux-1-dev-non-commercial-license`. Examples like `glif-loradex-trainer/araminta_k_flux_dev_illustration_art` are beautiful but legally off-limits unless we're paying BFL or using a hosted API that carries commercial rights.
- Exception: anything in Glif's ecosystem trained via the **Ostris schnell training adapter** is Apache-2.0 and would be fine. These exist but are not the majority of Loradex output today; verify the model card explicitly says schnell.

### 1.5 Diffusers built-in loaders (reference)

```python
from diffusers import AutoPipelineForText2Image
import torch

pipe = AutoPipelineForText2Image.from_pretrained(
    "black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16
).to("cuda")
pipe.load_lora_weights("Octree/flux-schnell-lora")
# IP-Adapter variant:
pipe.load_ip_adapter("h94/IP-Adapter", subfolder="sdxl_models", weight_name="ip-adapter_sdxl.bin")
```

Loader mixins actually used: `FluxLoraLoaderMixin`, `StableDiffusionXLLoraLoaderMixin`, `SD3LoraLoaderMixin`, `IPAdapterMixin` ([loaders/lora.md](https://github.com/huggingface/diffusers/blob/main/docs/source/en/api/loaders/lora.md), [ip_adapter.py](https://github.com/huggingface/diffusers/blob/main/src/diffusers/loaders/ip_adapter.py)). All accept `.safetensors` via `safe_open`.

---

## 2. Concrete candidates (shortlist)

Each row is a LoRA or style weight the project could plausibly ingest. **License column is the verdict as of the date checked; re-verify before each ingest.**

| # | Resource | URL | Author | License | Commercial verdict | Base | Recommended strength | Integration |
|---|---|---|---|---|---|---|---|---|
| 1 | `Octree/flux-schnell-lora` | <https://huggingface.co/Octree/flux-schnell-lora> | Octree | inherits Apache-2.0 from Flux Schnell; repo card does not narrow it | **Safe** (verify repo-level license tag before pinning) | Flux Schnell | 0.7–1.0 | `pipe.load_lora_weights(...)` |
| 2 | `hugovntr/flux-schnell-realism` | <https://huggingface.co/hugovntr/flux-schnell-realism> | hugovntr | inherits Apache-2.0 | Safe | Flux Schnell | 0.7–1.0 | `load_lora_weights` |
| 3 | `ostris/FLUX.1-schnell-training-adapter` | <https://huggingface.co/ostris/FLUX.1-schnell-training-adapter> | ostris | Apache-2.0 (explicit on model card) | Safe (for *training* our own brand LoRA) | Flux Schnell | n/a training-only | ai-toolkit |
| 4 | `h94/IP-Adapter` (all SDXL variants) | <https://huggingface.co/h94/IP-Adapter> | Tencent AILab | Apache-2.0 | Safe | SDXL / SD1.5 | scale 0.4–0.8 | `pipe.load_ip_adapter(...)` |
| 5 | `ByteDance/SDXL-Lightning` LoRA (2/4/8-step) | <https://huggingface.co/ByteDance/SDXL-Lightning> | ByteDance | CreativeML Open RAIL++-M | Safe (same terms as SDXL base; no author addendum) | SDXL | 1.0 (official recipe) | `load_lora_weights` |
| 6 | `imagepipeline/Flat-Style` | <https://huggingface.co/imagepipeline/Flat-Style> | imagepipeline | CreativeML Open RAIL-M | Safe pending addendum review | SDXL | 0.7–0.9 | `load_lora_weights` |
| 7 | `ramel2/emotional-flat-illustration-sdxl-lora` | <https://huggingface.co/ramel2/emotional-flat-illustration-sdxl-lora> | ramel2 | per card (check tag) — SDXL RAIL++ derivative | Probably safe; verify addendum | SDXL 1.0 | 0.7 | `load_lora_weights` |
| 8 | Civitai: `flat_sdxl` | <https://civitai.com/models/358538> | nerijs/unknown | SDXL RAIL++ + Civitai addendum | **Verify** "Sell generated images" icon on model page before use | SDXL 1.0 | 0.6–0.9 (negative strength for detail) | `load_lora_weights` |
| 9 | Civitai: `Flat style v1.0` | <https://civitai.com/models/188798/flat-style> | — | SDXL RAIL++ + addendum | **Verify** permissions block | SDXL 1.0 | 0.8 (trigger `Flat style`) | `load_lora_weights` |
| 10 | Civitai: `Flat Illustration` (trigger `chatu`) | <https://civitai.com/models/195625/flat-illustration> | Hansen1098 | SDXL RAIL++ + addendum | **Verify** — description suggests commercial orientation but not explicit | SDXL 1.0 | 0.8, CFG 7, 1024×1536 | `load_lora_weights` |
| 11 | Civitai: `Hand drawn flat art illustration` | <https://civitai.com/models/510594> | — | SDXL RAIL++ + addendum | **Verify** | SDXL 1.0 | 0.7–0.9 | `load_lora_weights` |

**Explicitly rejected** (included so future reviewers don't re-research):

- `XLabs-AI/flux-lora-collection` — `flux-1-dev-non-commercial-license` ([model card](https://huggingface.co/XLabs-AI/flux-lora-collection/blob/main/README.md)). The training *code* in `XLabs-AI/x-flux` is Apache-2.0, but the weights are not.
- `black-forest-labs/FLUX.1-Depth-dev-lora` and siblings — Flux Dev NC.
- Glif `loradex-flux-dev/*` — Flux Dev NC by construction.
- Civitai Yamer pixel-art models — prose addendum forbids selling images without written consent.

---

## 3. Hosted fallback: Recraft (not a LoRA, but the same role)

For customers where we cannot self-host, Recraft's Style API plays the same brand-lock role as a LoRA and carries a clean commercial license on paid tiers.

- Create-style endpoint: `POST https://external.api.recraft.ai/v1/styles` — upload 5–10 references, receive a `style_id` UUID.
- Generation: pass `style_id` to the image endpoint; Recraft locks line weight, color application, geometric tendency, visual density, and abstraction level across icons/illustrations/patterns.
- Commercial rights: **Pro plan and Team plan grant full commercial ownership of outputs** ([Recraft commercial rights doc](https://recraft.ai/docs/plans-and-billing/commercial-rights-ownership-and-copyright)). Free plan does not.
- API pricing (verify at ingest time): ~$0.04 raster / $0.08 vector per image; $1 per 1,000 API units.

Treat Recraft as an *alternative backend* behind the same `BrandStyle` abstraction the LoRA path uses. This lets us flip between self-host (SDXL+LoRA, Flux Schnell+LoRA) and hosted (Recraft) without touching callers.

---

## 4. Compliance checklist — ingesting a LoRA into `prompt-to-asset`

Run this list **before** a LoRA lands in `configs/brand_styles/*.yaml` or is downloaded at build time. Store the completed checklist as `docs/compliance/<lora-id>.md` so there's a paper trail.

1. **Identify the base model.** Check the model card's `base_model:` tag and the author's README. If base is `FLUX.1-dev`, stop. If base is `FLUX.1-schnell`, SDXL 1.0, or SD 1.5, continue.
2. **Read the repo-level license tag.** On HF, the yellow license badge in the top-right of the model page. On Civitai, the permissions icons in the info block. Record the exact string (e.g. `apache-2.0`, `creativeml-openrail-m`, `cc-by-4.0`).
3. **Read any addendum or prose license.** Civitai auto-generates an addendum PDF when creators toggle permissions — click the license name on the model page. On HF, read the full README, not just the card header. Look specifically for:
   - "Sell generated images: ✓" (Civitai icon) or equivalent language.
   - "Contact me for commercial use" → **treat as NO** unless written consent is obtained.
   - "Merges must keep these permissions" → record this; affects future brand-LoRA training.
4. **Verify the weights file format.** Must be `.safetensors` (not `.ckpt`). Diffusers loads `.safetensors` via `safe_open`; `.ckpt` is unsafe at load time.
5. **Pin by commit hash / version id.** Always pin to a specific HF revision SHA or Civitai `modelVersionId`. License terms can change between versions; pinning freezes the contract we agreed to.
6. **Record author + source + date.** Capture author handle, URL, SHA / version ID, and verification date in the compliance file.
7. **Cache the weights under our own storage.** Mirror to our S3/R2 bucket rather than hotlinking HF/Civitai. Protects against upstream deletion and against silent license changes to that revision.
8. **Test prompts don't regenerate copyrighted material.** Run a 20-prompt smoke test; spot-check for celebrity likenesses, studio-specific IP (e.g. Ghibli, Pixar), and logos. A LoRA with a clean license but IP-contaminated training data is still a liability. The OpenRAIL use-based restrictions explicitly prohibit this downstream.
9. **Document the strength default.** Record the model card's recommended LoRA scale and CFG. The brand-lock pipeline should use the documented value as default and let operators override.
10. **Re-run this checklist on every version bump.** Pinning doesn't help if we later upgrade to a revision with a narrower license.

---

## 5. Sources

- [Civitai licensing guide](https://education.civitai.com/guide-to-licensing-options-on-civitai/) — how the "Sell generated images" toggle works and how addendums are generated.
- [FLUX.1 [schnell] model card](https://huggingface.co/black-forest-labs/FLUX.1-schnell/) — Apache 2.0 grant for commercial use.
- [ostris/FLUX.1-schnell-training-adapter](https://huggingface.co/ostris/FLUX.1-schnell-training-adapter) — the only supported path to train a new LoRA that stays Apache 2.0.
- [XLabs-AI/flux-lora-collection](https://huggingface.co/XLabs-AI/flux-lora-collection/blob/main/README.md) — example of the Flux Dev NC trap.
- [SDXL 1.0 LICENSE.md](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md) — CreativeML Open RAIL++-M full text.
- [ByteDance/SDXL-Lightning LICENSE](https://huggingface.co/ByteDance/SDXL-Lightning/blob/main/LICENSE.md) — confirms OpenRAIL++ for the Lightning LoRAs.
- [h94/IP-Adapter README](https://huggingface.co/h94/IP-Adapter/blob/main/README.md) — Apache-2.0 for all SDXL / SD1.5 variants.
- [OpenModelDB licenses doc](https://openmodeldb.info/docs/licenses) — the upscaler-output carve-out.
- [Diffusers LoRA loaders reference](https://github.com/huggingface/diffusers/blob/main/docs/source/en/api/loaders/lora.md) and [IP-Adapter loader](https://github.com/huggingface/diffusers/blob/main/src/diffusers/loaders/ip_adapter.py).
- [Recraft commercial rights doc](https://recraft.ai/docs/plans-and-billing/commercial-rights-ownership-and-copyright) and [Recraft styles API](https://www.recraft.ai/docs/api-reference/styles).
