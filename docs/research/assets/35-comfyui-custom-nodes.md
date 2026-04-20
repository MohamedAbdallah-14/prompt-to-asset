# 35 · ComfyUI Custom Nodes for the Asset Pipeline

**Research value: high** — ComfyUI has a mature, well-indexed custom-node ecosystem covering every stage of our brief→asset pipeline (routing, reference conditioning, transparent output, detailing, vectorization, ops). A small, curated set covers ~95% of the workflows `prompt-to-asset` needs if we adopt Comfy as the self-hosted backend.

**Scope.** This note catalogues Comfy custom-node packs relevant to logo, app-icon, favicon, OG-image, illustration, and transparent-asset generation. Animation-focused packs (AnimateDiff, video ControlNets) are explicitly out of scope — see existing asset-pipeline notes #06 / #08 for model-side coverage.

---

## Pipeline stages → where Comfy nodes fit

Map to existing skill pipeline (`.claude/skills/asset-enhancer`, `/logo`, `/favicon`, `/og-image`, `/illustration`, `/transparent-bg`, `/vectorize`):

| Stage | Typical nodes needed |
| --- | --- |
| **Brief routing & control flow** | rgthree, Easy-Use, Impact Switch/Pipe |
| **Reference / brand conditioning** | IPAdapter_plus, InstantID, PhotoMaker, ControlNet Union |
| **Generation** | Native KSampler, Easy-Use loaders |
| **Transparent output** | LayerDiffuse |
| **Detail / refinement** | Impact Pack FaceDetailer / SEGS, Inspire regional prompt |
| **Image ops (crop, pad, resize, composite)** | KJNodes, WAS (legacy), Easy-Use |
| **Output fan-out (app icon / favicon sizes)** | KJNodes batch + Constrain Image (Custom-Scripts) |
| **Vectorization** | Vectorizer-API node (external) — primary vectorization still runs in our Node pipeline (Recraft / vtracer / potrace) |
| **Observability** | Crystools |

---

## Node pack catalog

### 1. ComfyUI-Manager — node installer & registry

- **Repo:** [Comfy-Org/ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager) (originally ltdrdata)
- **License:** GPL-3.0
- **Activity:** Highly active. 14k+ stars, 470+ contributors, v3.38 in 2026, now a Comfy-Org project.
- **Problem solved:** Install/update/disable other custom nodes, browse the [registry.comfy.org](https://registry.comfy.org/) hub, security-gated install.
- **Integration notes:** Bundled by default with ComfyUI Desktop. For headless containers use `comfy-cli` or pin via registry IDs, not git URLs — the migration to the official registry means pinning to commits is the only fully reproducible path. Security patch path in v3.38 changes where node metadata lives; rebuild container layers that assumed the old path.

### 2. ComfyUI Impact Pack (ltdrdata) — detailers, samplers, pipes

- **Repo:** [ltdrdata/ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack)
- **License:** GPL-3.0
- **Activity:** Very active, primary author of ComfyUI-Manager. 200+ nodes.
- **Problem solved:** `FaceDetailer` / `DetailerForEach` / `SEGSDetailer` for second-pass refinement of faces, text, icon details (critical for wordmark legibility at small sizes); `ImpactSwitch`, `ImpactWildcard`, pipe nodes for clean routing.
- **Integration notes:** `UltralyticsDetectorProvider` requires the separate `ComfyUI-Impact-Subpack`. SEGS-based detailing is where logo/icon text legibility is won — plan a detailer pass for any wordmark ≤ 3 words. License is GPL-3.0, same caution as Manager: do not statically link into proprietary code; use over HTTP only.

### 3. rgthree-comfy — flow control, power prompt

- **Repo:** [rgthree/rgthree-comfy](https://github.com/rgthree/rgthree-comfy)
- **License:** MIT
- **Activity:** Active, ~3k stars.
- **Problem solved:** `Fast Groups Muter/Bypasser` (toggle entire workflow branches by group title — great for multi-variant logo/icon workflows where we want to switch between SDXL/Flux/Recraft branches); `Power Prompt` (LoRA + embedding autocompletion, clean prompt wiring); reroute improvements.
- **Integration notes:** Muter/Bypasser use virtual nodes — they don't serialize into the API JSON the way normal nodes do. When calling Comfy headlessly from our Node backend, bypass state must be set before export. Prefer `Any Switch (rgthree)` for server-side branch selection.

### 4. ComfyUI-KJNodes (kijai) — general utility

- **Repo:** [kijai/ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes)
- **License:** GPL-3.0
- **Activity:** Very active, 2.5k+ stars. kijai also maintains many SOTA model wrappers (Flux, HunyuanVideo, Wan).
- **Problem solved:** `Set/Get` virtual variables (drastically cleans up large workflows), batch crop/image nodes, curve nodes for scheduling, constants, `ScaleBatchPromptSchedule`. Backbone for any non-trivial workflow.
- **Integration notes:** Set/Get rewrite (March 2026) added subgraph support — required if we use Comfy's new subgraph feature to package reusable sub-workflows (e.g., "icon fan-out" as a subgraph).

### 5. was-node-suite-comfyui (WASasquatch) — image ops (legacy)

- **Repo:** [WASasquatch/was-node-suite-comfyui](https://github.com/WASasquatch/was-node-suite-comfyui)
- **License:** MIT
- **Activity:** **Archived June 2025**, retired from active development since late 2023. 210+ nodes.
- **Problem solved:** Historical go-to for image ops (bounds, blend, paste face crop, color palette, BLIP analyze). Many workflows on Civitai / OpenArt still import WAS nodes.
- **Integration notes:** **Avoid as a new dependency.** KJNodes + Impact Pack + Easy-Use cover nearly every WAS node we'd need. Keep WAS installed only if we import third-party workflows that require it, and pin to the archived commit.

### 6. ComfyUI-AnimateDiff-Evolved — out of scope

Skipped. We're not generating motion. If we ever need animated OG images or Lottie-style previews, reconsider.

### 7. ComfyUI-InstantID (cubiq) — face-identity reference

- **Repo:** [cubiq/ComfyUI_InstantID](https://github.com/cubiq/ComfyUI_InstantID)
- **License:** Apache-2.0 (code); InsightFace antelopev2 is **non-commercial** — read carefully.
- **Activity:** Maintenance mode, last meaningful update April 2025. SDXL only.
- **Problem solved:** Identity-preserving generation from a face reference. **Limited relevance to our pipeline** — we don't generate faces. Possibly useful for mascot / character-logo consistency.
- **Integration notes:** antelopev2 license blocks commercial use for most SaaS scenarios — not safe for paid-tier asset generation without replacement. Skip unless a brand explicitly needs face-based marks.

### 8. ComfyUI-IPAdapter_plus (cubiq) — style/subject reference

- **Repo:** [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus)
- **License:** GPL-3.0
- **Activity:** Active, canonical IPAdapter implementation for Comfy.
- **Problem solved:** **This is the brand-consistency backbone.** Drive logo/icon/illustration style from brand reference images via `IPAdapter Advanced` with weight types `style transfer`, `style transfer precise`, `style and composition`. Exactly what the `illustration` skill calls for ("IP-Adapter / LoRA / Recraft style_id / Flux.2 brand refs for consistency across a set").
- **Integration notes:** `style transfer precise` is the right starting point for brand palettes — less bleeding into composition. Reference image should be square or auto-crop will decide for you. IPAdapter V2 API is not backward compatible with V1 workflows — pin a commit and don't auto-update across our env.

### 9. ComfyUI-PhotoMaker (ZHO-ZHO-ZHO / shiimizu Plus fork)

- **Repo:** [ZHO-ZHO-ZHO/ComfyUI-PhotoMaker-ZHO](https://github.com/ZHO-ZHO-ZHO/ComfyUI-PhotoMaker-ZHO), [shiimizu/ComfyUI-PhotoMaker-Plus](https://github.com/shiimizu/ComfyUI-PhotoMaker-Plus)
- **License:** GPL-3.0 (ZHO), Apache-2.0 fork varies
- **Activity:** ZHO repo stale since May 2024 (no commits); shiimizu Plus fork more current.
- **Problem solved:** Same space as InstantID but better for stylized outputs. Same face-only limitation.
- **Integration notes:** Skip for MVP. Our pipeline is mark/illustration-centric, not portraiture.

### 10. ComfyUI-Crystools (crystian) — system metrics

- **Repo:** [crystian/ComfyUI-Crystools](https://github.com/crystian/comfyui-crystools)
- **License:** MIT
- **Activity:** Active.
- **Problem solved:** Real-time GPU/VRAM/temp/CPU/RAM monitor in the Comfy UI. Useful during workflow development and for debugging OOM on shared self-hosted boxes. Very low overhead (0.1–0.5% CPU).
- **Integration notes:** NVIDIA-only (CUDA / pynvml). For monitor-only deployments use the `ComfyUI-Crystools-MonitorOnly` fork (uses maintained `nvidia-ml-py`). Not needed headless — Comfy already emits run metadata we can scrape into our own observability stack.

### 11. ComfyUI-Easy-Use (yolain) — opinionated mega-pack

- **Repo:** [yolain/ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use)
- **License:** AGPL-3.0
- **Activity:** Active, 2.4k+ stars.
- **Problem solved:** Collapses the 7-node SD pipeline into 2–3 nodes (`EasyLoader`, `PreSampling`, `EasyKSampler`). Built-in support for SD1.5/SDXL/SD3/Flux/Kolors, LayerDiffuse, InstantID, wildcards, A1111-style prompts.
- **Integration notes:** **AGPL-3.0 is the copyleft risk** — if we expose Comfy's UI or its nodes as a network service, AGPL obligations apply. For headless API use (our case) we only need to ship our own code's source *if it links the Easy-Use code into the same process* — which custom nodes do. Treat as a **dev-time convenience only** unless Legal clears AGPL; don't bake into the production workflow if we plan to keep source private. Alternative: build directly on native Comfy nodes + KJNodes + Impact Pack.

### 12. ComfyUI-Custom-Scripts (pythongosssss) — UX enhancements

- **Repo:** [pythongosssss/ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts)
- **License:** MIT
- **Activity:** Maintained but slow; 3k+ stars.
- **Problem solved:** Dev-time UX (auto-arrange, autocomplete, LoRA/checkpoint preview lists, image feed, `Constrain Image` node for aspect-aware resize, `Math Expression`, `Preset Text`, favicon build status).
- **Integration notes:** Mostly JS UI — essentially free overhead on a headless instance, not needed there. Install only on dev machines. `Constrain Image` is the one Python node worth using in server workflows.

### 13. ComfyUI-LayerDiffuse (huchenlei) — transparent RGBA output

- **Repo:** [huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse)
- **License:** Apache-2.0
- **Activity:** Maintained; core nodes stable.
- **Problem solved:** **Native transparent-PNG generation** via LayerDiffusion latent-transparency. Directly serves `skills/transparent-bg` and is a lower-cost alternative to "generate opaque + rembg" for many logo/icon scenarios.
- **Integration notes:** SDXL and SD1.5 only — no Flux/SD3 support yet. Key node: `LayeredDiffusionDecodeRGBA`. Combine with Impact detailer for wordmark legibility. When quality bar is high (production logo export), still run a post-matting pass (rembg / BriaAI RMBG) as insurance against halos.

### 14. ComfyUI-Inspire-Pack (ltdrdata)

- **Repo:** [ltdrdata/ComfyUI-Inspire-Pack](https://github.com/ltdrdata/ComfyUI-Inspire-Pack)
- **License:** GPL-3.0
- **Activity:** Active, 102 nodes.
- **Problem solved:** Regional prompt / regional conditioning by mask or color mask — useful for multi-element illustrations where subject vs background needs separate prompts. Also regional seed explorer for A/B'ing regions.
- **Integration notes:** Depends on Impact Pack. For simple mark/icon workflows (one subject) Inspire is overkill; reserve for illustration and hero-spot art.

### 15. Logo / icon-specific nodes

- **`cherninlab/logo-generator-comfyui`** (MIT) — deterministic text→logo using Google Fonts (text, stroke, color, rotation, transparent bg). **Not diffusion.** Matches our `og-image` skill's "Satori + template" philosophy: deterministic typography first, hand over to diffusion only for hero art. Good candidate for wordmark renderer nodes.
- **`rickrender/ComfyUI-Vectorizer-API`** (MIT, 2025) — wraps vectorizer.ai API. Less useful: our existing vectorize skill prefers in-process `vtracer` / `potrace` / Recraft. Only worth adopting if we already use vectorizer.ai elsewhere.

No first-party mature "logo mark" diffusion node pack exists — this is a **gap** we can fill with a thin custom node wrapping our own brief-aware prompter. Confirmation: the top search hits for "ComfyUI logo generation" are tutorials built from native nodes + ControlNet, not a dedicated pack.

### 16. ControlNet Union / QR-Monster

- **xinsir ControlNet Union SDXL 1.0 / ProMax** ([HF](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0), [ControlNetPlus](https://github.com/xinsir6/ControlNetPlus), Apache-2.0): **one SDXL ControlNet covering 12 modalities** (OpenPose, Depth, Canny, Lineart, Anime-lineart, MLSD, Scribble, HED, PIDI/SoftEdge, TEED, Segment, Normal). ProMax adds tile-deblur/variation/SR + inpaint/outpaint. Drop-in via native `ControlNetLoader`, no custom node pack required — but the common tutorial chain uses `comfyui-art-venture`, `comfyui_controlnet_aux` (preprocessors), and `Comfyroll Studio` for glue.
- **`comfyui_controlnet_aux`** (Fannovel16) is effectively **required** — it provides the preprocessors (Canny, HED, OpenPose, depth, lineart, scribble). Add it whenever we use any ControlNet.
- **QR-Monster ControlNet** (`monster-labs/control_v1p_sd15_qrcode_monster` + SDXL variant): use v2 (gray #808080 background) with QR error-correction level H, 16px modules, 768²+ canvas, CN strength 0.8–1.5. Relevant if we ever ship branded/artistic QR codes; otherwise skip.

---

## Recommended "prompt-to-asset" lean node set

Target: **minimum nodes to build all current asset-pipeline workflows** (logo, favicon, app icon, OG image, illustration, transparent asset) on a self-hosted Comfy backend with headless API calls from our Node pipeline. License posture: prefer MIT / Apache-2.0 in the hot path; accept GPL-3.0 for tools we call via HTTP; treat AGPL as opt-in.

**Tier 1 — core (install everywhere):**

1. **ComfyUI-Manager** — installer/registry; pin commits for reproducibility.
2. **ComfyUI Impact Pack** (+ Impact-Subpack) — FaceDetailer / SEGS detailer for wordmark and icon-detail passes; `ImpactSwitch` for headless branch selection.
3. **ComfyUI-KJNodes** — Set/Get variables, batch crop/resize, constants, curves. Backbone of any sized-output workflow (icon fan-out, favicon multi-res).
4. **rgthree-comfy** — `Any Switch` and reroute hygiene; Power Prompt for LoRA handling. (Use Muter/Bypasser for dev only — they don't serialize cleanly.)
5. **ComfyUI_IPAdapter_plus** — brand reference conditioning. Non-optional for cross-asset style consistency.
6. **comfyui_controlnet_aux** (Fannovel16) — preprocessors for ControlNet Union / QR-Monster.
7. **ComfyUI-LayerDiffuse** — transparent RGBA generation (SDXL path). Complements our rembg/BriaAI matting.

**Tier 2 — workflow-specific:**

8. **ComfyUI-Inspire-Pack** — regional conditioning for illustration skill only.
9. **ComfyUI-Custom-Scripts** — `Constrain Image` and dev UX. Dev-only install.
10. **ComfyUI-Crystools** (or MonitorOnly fork) — optional, dev-box observability.

**Explicitly excluded (for now):**

- ComfyUI-Easy-Use — AGPL-3.0 risk for a production backend whose source we keep private; native Comfy + Tier-1 packs cover the same ground.
- was-node-suite-comfyui — archived; avoid new deps.
- AnimateDiff-Evolved — out of scope.
- InstantID, PhotoMaker — face-centric, rarely used in mark/icon work, and antelopev2 is non-commercial.
- logo-generator-comfyui / Vectorizer-API — adopt only if we decide to push deterministic typography and vectorization *into* Comfy rather than keeping them in our Node pipeline (current design keeps them out).

**Operational notes:**

- **Pin by commit, not by Manager version.** The registry migration and AGPL/GPL surface changes mean we want a deterministic custom-node lockfile alongside our Python and model pins.
- **License hot-path audit:** Everything in Tier 1 is Apache-2.0 / MIT / GPL-3.0. We invoke Comfy over HTTP from our own process, which avoids GPL linking concerns; do not embed node code in-process.
- **antelopev2 (InsightFace), PhotoMaker base models, any CivitAI LoRA:** commercial-use is model-specific — separate audit from node audit (see existing note #07 on commercial-safe LoRAs).
- **Reproducibility gap:** Comfy has no first-class lockfile for custom nodes; build a script that git-clones each Tier-1 pack at a pinned SHA into `custom_nodes/` as part of the container image.

---

## Sources

- [Comfy-Org/ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager) — registry, install modes, v3.38 security patch.
- [ltdrdata/ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) — detailer taxonomy, Subpack requirement.
- [rgthree/rgthree-comfy](https://github.com/rgthree/rgthree-comfy) + [DeepWiki](https://deepwiki.com/rgthree/rgthree-comfy/4.3-fast-groups-muter-and-bypasser) — Muter/Bypasser semantics.
- [kijai/ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes) — 2026 Set/Get subgraph rewrite.
- [WASasquatch/was-node-suite-comfyui](https://github.com/WASasquatch/was-node-suite-comfyui) — archive status.
- [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) + [NODES.md](https://github.com/cubiq/ComfyUI_IPAdapter_plus/blob/main/NODES.md) — weight-type taxonomy.
- [cubiq/ComfyUI_InstantID](https://github.com/cubiq/ComfyUI_InstantID) — maintenance mode, SDXL-only, antelopev2 dep.
- [huchenlei/ComfyUI-layerdiffuse](https://github.com/huchenlei/ComfyUI-layerdiffuse) — `LayeredDiffusionDecodeRGBA`, SDXL/SD15 support matrix.
- [ltdrdata/ComfyUI-Inspire-Pack](https://github.com/ltdrdata/ComfyUI-Inspire-Pack) — regional prompt nodes, Impact dependency.
- [crystian/ComfyUI-Crystools](https://github.com/crystian/comfyui-crystools) — NVIDIA-only metrics; MonitorOnly fork uses maintained `nvidia-ml-py`.
- [yolain/ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use) — feature scope, AGPL-3.0 license.
- [pythongosssss/ComfyUI-Custom-Scripts](https://github.com/pythongosssss/ComfyUI-Custom-Scripts) — UI script inventory, `Constrain Image`.
- [xinsir6/ControlNetPlus](https://github.com/xinsir6/ControlNetPlus) + [HF model card](https://huggingface.co/xinsir/controlnet-union-sdxl-1.0) — 12-modality Union, ProMax editing features.
- [cherninlab/logo-generator-comfyui](https://github.com/cherninlab/logo-generator-comfyui), [rickrender/ComfyUI-Vectorizer-API](https://github.com/rickrender/ComfyUI-Vectorizer-API) — niche logo/vector packs.
