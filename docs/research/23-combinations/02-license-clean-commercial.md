---
wave: 3
role: combination-planner
slug: 02-license-clean-commercial
optimization_criterion: "License-clean commercial stack — MIT/Apache/OpenRAIL-M/BSD only"
date: 2026-04-19
---

> **Updated 2026-04-21:** Several model references in this document have drifted. (1) `gpt-image-1` is now labeled "previous" by OpenAI; `gpt-image-1.5` is the current primary. (2) Recraft V3 has been superseded by **Recraft V4** (released Feb 2026), which ships four variants: V4 raster, V4 Vector, V4 Pro raster (2048²), V4 Pro Vector — all available via API. (3) Seedream 4.5 is the current stable CJK model on fal/Replicate; Seedream 5.0 Lite is available via BytePlus enterprise. (4) Ideogram 3 Turbo pricing is $0.03/image; Quality tier is $0.09/image — not $0.02–$0.06 as older references imply. (5) Vercel AI SDK `experimental_generateImage` was promoted to stable `generateImage` in AI SDK v6; update import patterns accordingly. (6) Imagen 4 Fast is $0.02/image on Vertex AI (confirmed).

# Combination 2 — License-Clean Commercial Stack

## TL;DR

A closed-source paid SaaS for asset-correctness prompting can be assembled entirely from
**permissive** (MIT / Apache-2.0 / BSD / MPL-2.0) code and **OpenRAIL-M / Apache-2.0**
weights, plus hosted commercial APIs where no weight redistribution occurs. The stack:
Vercel AI SDK v5 (Apache) as dispatch spine; a hand-trained `Promptist-Assets` rewriter
on SmolLM2-135M (Apache) for the free tier; hosted frontier APIs (`gpt-image-1.5`,
Imagen 4 / Nano Banana, Recraft v3, Ideogram 3, Together FLUX.2) for paid tier; SDXL +
Flux Schnell (Apache) + LayerDiffuse (Apache code + OpenRAIL-M weights) behind a
**separate-process** ComfyUI sidecar so ComfyUI's GPL stays off our binary; `rembg` (MIT)
with BiRefNet MIT weights for matting; `vtracer` (MIT) for vectorization; `npm-icon-gen`
/ `pwa-asset-generator` / `capacitor-assets` / `guillempuche/appicons` / `itgalaxy/favicons`
(MIT) for platform resizers; Satori + `@vercel/og` (MPL-2.0 / MIT) for OG cards; and
`vercel/mcp-adapter` (Apache) for the agent surface. Banned outright: Fooocus weights
(CC-BY-NC-4.0), Flux.1 [dev] and every [dev]-trained LoRA (BFL non-commercial), BRIA
RMBG-2.0 ONNX (CC-BY-NC-4.0), SD.Next (AGPL-3.0), Openinary (AGPL-3.0), `ComfyUI-Easy-Use`
as a vendored dep (GPL-3.0; kept at HTTP arm's length for local dev only), potrace and
autotrace (GPL-2), Hunyuan-PromptEnhancer 7B (Tencent license with EU/UK/KR exclusion),
`Nutlope/logocreator` (unlicensed), and every Civitai LoRA toggled "No commercial use."
One NOTICE file, OpenRAIL use restrictions mirrored into our EULA, and a CI-checked
`third_party_manifest.json` that breaks the build on SPDX drift.

## The ten-layer stack

### Layer 1 — Dispatch & typed routing

**Vercel AI SDK v5** (`ai` + `@ai-sdk/openai` + `@ai-sdk/google` + `@ai-sdk/replicate` +
`@ai-sdk/fal` + `@ai-sdk/togetherai` + `@ai-sdk/luma`) is the typed spine; direct
`@fal-ai/client`, `replicate`, and `together-ai` SDKs are used on hot paths where
provider-specific knobs matter (fal realtime WebSocket, Together FLUX.2 8-ref-image
endpoint, Replicate `replicate.use()` chaining). OpenRouter is wired as a second
implementation of the same `ImageProvider` interface for long-tail models.

**License audit.** Every first-party `@ai-sdk/*` package is **Apache-2.0**
(`22-repo-deep-dives/20-vercel-ai-sdk-image.md`). `replicate-javascript`, `@fal-ai/client`,
`together-ai`: Apache-2.0 or MIT. OpenRouter is pure HTTP — no code dependency. No
copyleft, no field-of-use restrictions; commercial closed-source redistribution clean
with a standard Apache NOTICE. Cleanest layer in the stack.

### Layer 2 — Prompt-enhancement (free tier)

Ship a MIT-licensed, from-scratch rewriter — working name **`Promptist-Assets v0`**:
**SmolLM2-135M** (Apache-2.0) base, ~20k synthetic + curated asset pairs, GRPO with our
own asset-correctness reward (transparency-validity, text-legibility, platform-compliance,
brand-palette-adherence), structured-JSON output, four per-family LoRAs
(Imagen / `gpt-image-1` / Flux / SDXL), ONNX int8 for the Node server tier and
Transformers.js q8 for the in-browser tier.

**License audit.** SmolLM2-135M: **Apache-2.0**. Reward stack: OpenAI CLIP (MIT) +
LAION improved-aesthetic-predictor (Apache-2.0). All our code, checkpoints, LoRAs: MIT
from commit #1. We deliberately **re-implement** rather than fork Microsoft's `Promptist`
(MIT code; weights have missing license YAML, per `22-repo-deep-dives/02-promptist.md`
§4) to eliminate "MIT-by-convention" risk. `roborovski/superprompt-v1` (MIT) and
`alibaba-pai/BeautifulPrompt` (Apache-2.0) are kept as browser fallbacks, re-hosted in
our HF org with verified model cards.

### Layer 3 — Prompt-enhancement (paid tier)

For the paid tier, prompt rewriting routes to a hosted frontier LLM via AI SDK
(`anthropic.messages`, `openai.chat`, `google.generative` — pay-per-call, no weight
redistribution). For a self-hosted LLM option we offer **Hunyuan-PromptEnhancer 32B**
(Qwen2.5-VL-32B base, Apache-2.0) on vLLM.

**License audit.** Hosted LLM APIs: commercial terms, no redistribution — out of scope
for OSS contamination. Hunyuan **32B**: Qwen2.5-VL-32B-Instruct base is Apache-2.0; HF
card text says Apache-2.0 though GitHub shows NOASSERTION
(`22-repo-deep-dives/01-hunyuan-prompt-to-asset.md` §4) — we ship with both the Qwen and
Hunyuan notices and treat the weights as Apache-2.0. **Explicit skip: Hunyuan-PromptEnhancer
7B** — the Tencent Hunyuan Community License excludes the EU, UK, and South Korea; using
it as a default engine for a global SaaS is unsafe. **Explicit skip: Fooocus expansion
model** — CC-BY-NC-4.0. We lift only the *logits-processor idea* from `expansion.py`
into clean-room MIT code; we never bundle the weights.

### Layer 4 — Hosted commercial image APIs (primary paid tier)

`gpt-image-1.5` (default for transparent subjects, hero art, photographic), Imagen 4 /
Nano Banana 2 (flat logos, text-heavy wordmarks, subject consistency), Ideogram 3.0
(`generate-transparent-v3` for typographic logos), Recraft v3 (`vector_illustration` /
`icon` styles, native SVG), Together FLUX.2 Pro (brand reference images, up to 8 refs).
All called via Vercel AI SDK typed providers.

> **Updated 2026-04-21:** Recraft V3 has been succeeded by **Recraft V4** (Feb 2026). Route `svg === "required"` to `Recraft V4 Vector` or `Recraft V4 Pro Vector` (higher resolution). Ideogram 3 Turbo is $0.03/image; Quality is $0.09/image. Seedream 4 has been superseded by Seedream 4.5 (available on fal/Replicate at $0.04/image) for CJK text generation; Seedream 5.0 Lite is available via BytePlus enterprise API with 14-ref support. Vercel AI SDK `experimental_generateImage` is stable `generateImage` as of AI SDK v6.

**License audit.** These are pay-per-call APIs; we never redistribute weights. OpenAI
`gpt-image-1`, Imagen / Nano Banana, Ideogram 3, Recraft v3, and Together FLUX.2 all
grant commercial-use rights to generated outputs under their standard Terms; we pass
those through unchanged and expose an `output_license` field on every response. No
copyleft or field-of-use ingress into our code.

### Layer 5 — Open-weight image models (self-hosted paid tier / premium)

**SDXL 1.0** (CreativeML OpenRAIL++-M) + **FLUX.1 [schnell]** (Apache-2.0) + **SD 1.5**
(CreativeML OpenRAIL-M) are the only base checkpoints we self-host. Z-Image-Turbo is a
candidate for a future drop if its license clears.

**License audit.** OpenRAIL++-M and OpenRAIL-M are **use-based, not non-commercial** —
paid SaaS and closed-source hosting permitted provided the enumerated harmful-use
restrictions propagate via our EULA. FLUX.1 [schnell] is straight **Apache-2.0**,
commercial-safe unconditionally (`21-oss-deep-dive/01-logo-brand-loras.md`).
**Explicit skips:** **FLUX.1 [dev]** (BFL non-commercial v2.0 forbids paying users —
route premium Flux to hosted `flux-pro` on Together/fal/Replicate, each with their own
BFL commercial grant), **FLUX.2 [dev]** (same BFL terms), **SD 3 / 3.5 Large** (Stability
AI Community License revenue gates — defer until 1M users / $1M revenue and negotiate).

### Layer 6 — LoRAs / style adapters

Ship five curated adapters, all license-clean: **Logo.Redmond v2**
(artificialguybr, SDXL, OpenRAIL-M, "allow commercial" on Civitai) as the zero-config
default, **Minimalist Flat Icons XL** (Civitai commercial-OK), **Line Art + Flat Colors
SDXL**, **APP ICONS — SDXL**, and **Vector Illustration — SDXL**. All target SDXL +
OpenRAIL-M base, so every inference is license-clean end-to-end.

**License audit.** Every LoRA's Civitai/HF metadata is checked per-upload; SHA-256
hashes and license-toggle screenshots live in `third_party_manifest.json` so silent
upstream relicensing cannot contaminate us. **Explicit skips:** all Flux [dev]-trained
adapters — `Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design`, `prithivMLmods/Logo-Design-Flux-LoRA`,
`strangerzonehf/Flux-Icon-Kit-LoRA`, `multimodalart/isometric-skeumorphic-3d-bnb`,
`EEEric/3d-icon-Flux-LoRA`, `Sports Mascots Flux1-Dev`, `LogoMaker1024`, `Cute Logo Maker`,
etc. The LoRA tag may say `openrail-m` but **inference inherits the base-model license**;
serving the combined model is non-commercial. Route "3D isometric app icon" premium
requests to hosted FLUX.2 Pro on Together rather than self-host the adapter.

### Layer 7 — Native RGBA generation

`huchenlei/ComfyUI-layerdiffuse` with SDXL (Conv injection default per issue #127).
Graph runs inside a **separate-process** ComfyUI sidecar (see Layer 8). For hosted paid
tier, `gpt-image-1.5` with `background: "transparent"` and Ideogram 3.0
`generate-transparent-v3` cover the same surface without any self-hosting.

**License audit.** `ComfyUI-layerdiffuse` code is **Apache-2.0** (verified from repo
`LICENSE`, `22-repo-deep-dives/17-comfyui-layerdiffuse.md` §License). Weights on
`LayerDiffusion/layerdiffusion-v1` are **CreativeML OpenRAIL-M** — commercial-OK with
use-based restrictions. Apache code + OpenRAIL-M weights + OpenRAIL++-M SDXL base is a
clean commercial stack.

**Explicit skip: `RedAIGC/Flux-version-LayerDiffuse`** — it requires Flux.1 [dev] as
base, so the combined inference is non-commercial. **Explicit skip: ART / PSDiffusion**
research-only weights. We monitor for a Flux-schnell-based or Apache-relicensed port
every 60 days; the hosted `gpt-image-1.5 transparent` path covers the gap today.

### Layer 8 — Execution runtime (ComfyUI, at arm's length)

ComfyUI is **GPL-3.0**. Forking or statically linking it into our Node/Next.js binary
would contaminate the whole binary. Our posture: treat ComfyUI as a **separate network
service**, deployed as a `runpod-workers/worker-comfyui` container on RunPod or a
`@app.cls()` Modal app, called exclusively over HTTP/WebSocket (`/prompt`, `/ws`). Our
Next.js backend never `imports` or links any ComfyUI code. We build ComfyUI container
images from the upstream source without modification; our pinned custom-node manifest
(Manager, rgthree, Impact-Pack, LayerDiffuse) ships as a JSON file read by ComfyUI at
boot, not as vendored code.

**License audit.** Under GPL-3.0, "running the Program" is not creating a derivative;
calling a separate-process GPL server over a network API is an **aggregate**, not a
combined work, per FSF guidance. We do not vendor, link, or ship ComfyUI inside our
product container — we ship the upstream GPL container and call it over HTTP.

**Explicit skips:** `yolain/ComfyUI-Easy-Use` as a vendored dep — GPL-3.0
(`22-repo-deep-dives/18-comfyui-easy-use.md`), kept at the same HTTP arm's length for
local-dev only, never imported. **SD.Next** — AGPL-3.0; the network-use clause would
require open-sourcing our SaaS backend per-request. **Krita-ai-diffusion** — GPL-3.0
client, same HTTP-only posture.

### Layer 9 — Post-processing

Background removal: **`danielgatis/rembg`** (MIT code) with **`birefnet-general-lite`**
(MIT, ~45 MB) as the default checkpoint, escalating to `birefnet-general` (MIT),
`isnet-general-use` (Apache-2.0), `u2net` (Apache-2.0), `ben2-base` (MIT), and
`u2net_cloth_seg` (MIT) by asset class. Always chain `pymatting.estimate_foreground_ml`
for fringe decontamination.

Vectorization: **`visioncortex/vtracer`** (MIT) as the only bundled vectorizer — the
`vtracer-wasm` build ships in the browser preview, the native crate powers the server
tool.

Platform resizers: **`akabekobeko/npm-icon-gen`** (MIT), **`onderceylan/pwa-asset-generator`**
(MIT), **`ionic-team/capacitor-assets`** (MIT, 251k weekly npm), **`guillempuche/appicons`**
(MIT per README + `package.json` — we pin a specific commit and mirror the license text
since GitHub's license detector returns null, per
`22-repo-deep-dives/09-guillempuche-appicons.md`), **`itgalaxy/favicons`** (MIT, sharp-backed),
**`@realfavicongenerator/generate-favicon`** (MIT).

**License audit.** `rembg` code: **MIT**. Weights per-model, per
`22-repo-deep-dives/15-rembg.md`: `u2net*` / `silueta` / `isnet-*` / `sam` **Apache-2.0**;
`u2net_cloth_seg`, all `birefnet-*`, `ben2-base` **MIT**. Platform resizers all MIT on
top of `sharp` (Apache-2.0) + `opentype.js` (MIT). **Explicit skips:** `bria-rmbg`
(CC-BY-NC-4.0) — the code path is gated behind `REMBG_ALLOW_BRIA=1` never set in
production; the indemnified alternative is BRIA's hosted API metered through our
billing. **potrace, autotrace** — GPL-2; vtracer covers color vector. Potrace only via
optional user-triggered `shell_out=true` advanced server-side, never bundled.

### Layer 10 — Agent surface (tri-surface)

Website + hosted remote MCP + cross-IDE skills pack. Built on
**`vercel/mcp-adapter`** (`mcp-handler`, Apache-2.0), **`@modelcontextprotocol/sdk`**
(MIT), **`zod`** (MIT), **Next.js** (MIT) route at `/api/[transport]`. OG cards via
**Satori** (MPL-2.0) + **`@vercel/og`** (MIT wrapper). OAuth via **`@auth/nextjs`** (ISC)
or Clerk (commercial SaaS — no code redistribution). Skills pack bundles a SKILL.md for
Claude Code / Cursor / Windsurf / Gemini CLI / Codex / VS Code / Zed / v0.

**License audit.** `mcp-adapter` + `mcp-handler` Apache-2.0; `mcp-for-next.js` and
`run-llama/mcp-nextjs` MIT (`22-repo-deep-dives/19-vercel-mcp-stack.md`). Satori is
**MPL-2.0** — file-level weak copyleft that does not extend to our React/TSX; we import
unmodified. **Explicit skips:** Openinary (AGPL-3.0, banned with SD.Next);
`Nutlope/logocreator` as a source of code (no LICENSE file, license issue unanswered for
14+ months per `22-repo-deep-dives/03-nutlope-logocreator.md`) — inspiration only, every
line clean-room.

---

## Dependency list (commit-pinned, SPDX-annotated)

**Code dependencies** (top of `package.json` / `pyproject.toml`):

| Package | License | Role |
|---|---|---|
| `ai` + `@ai-sdk/{openai,google,replicate,fal,togetherai,luma}` | Apache-2.0 | Dispatch |
| `@fal-ai/client`, `replicate`, `together-ai` | Apache-2.0 / MIT | Hot-path SDKs |
| `@modelcontextprotocol/sdk`, `mcp-handler`, `zod` | MIT / Apache-2.0 / MIT | MCP |
| `next`, `react`, `react-dom` | MIT | Web |
| `sharp`, `opentype.js`, `effect` | Apache-2.0 / MIT / MIT | Imaging |
| `@vercel/og`, `satori` | MIT / MPL-2.0 | OG cards |
| `npm-icon-gen`, `pwa-asset-generator`, `@capacitor/assets`, `@realfavicongenerator/*`, `itgalaxy/favicons`, `guillempuche/appicons` | MIT | Resizers |
| `vtracer`, `vtracer-wasm` | MIT | Vectorization |
| `rembg[cpu]`, `pymatting`, `onnxruntime`, `@imgly/background-removal-node` | MIT / MIT / MIT / MIT | Matting |
| `transformers`, `vllm`, `diffusers` | Apache-2.0 | Model runtime |
| SmolLM2-135M, CLIP ViT-L/14, aesthetic-predictor, ImageReward | Apache / MIT / Apache / Apache | Training |

**Weight dependencies** (pinned by SHA-256, mirrored to our HF org):

| Weight | License | Use |
|---|---|---|
| `stabilityai/stable-diffusion-xl-base-1.0` | OpenRAIL++-M | Default SDXL base |
| `black-forest-labs/FLUX.1-schnell` | Apache-2.0 | Fast Flux base |
| `runwayml/stable-diffusion-v1-5` | OpenRAIL-M | SD 1.5 base |
| `LayerDiffusion/layerdiffusion-v1` | OpenRAIL-M | Native RGBA |
| `Tencent-Hunyuan/PromptEnhancer-32B` | Apache-2.0 (Qwen2.5-VL-32B inherited) | Paid rewriter |
| `artificialguybr/LogoRedmond-LogoLoraForSDXL-V2` | OpenRAIL-M | Logo LoRA |
| `Minimalist Flat Icons XL`, `APP ICONS SDXL`, `Vector Illustration SDXL`, `Line Art + Flat Colors SDXL` | Civitai commercial-OK (per-upload audited) | Style LoRAs |
| `ZhengPeng7/BiRefNet` (`birefnet-general`, `-lite`, `-portrait`) | MIT | Matting |
| `xuebinqin/U-2-Net` (`u2net`, `u2netp`, `isnet-general-use`, `isnet-anime`) | Apache-2.0 | Matting |
| `PramaLLC/BEN2` base | MIT | Matting |

**NOTICE propagation.** One `NOTICE` aggregating Apache-required notices; a `LICENSES/`
directory with verbatim OpenRAIL / OpenRAIL++ / MPL / ISC texts; `third_party_manifest.json`
generated from `package.json` + the weight manifest and CI-checked. Any new dep without
an SPDX identifier breaks the build.

---

## 90-day build order

**Weeks 1–2 — Layers 1 + 10 skeleton.** Scaffold Next.js on `vercel/mcp-adapter` +
`mcp-for-next.js`. Wire AI SDK v5 typed providers for `gpt-image-1`, Imagen 4, Recraft v3,
Ideogram 3, Together FLUX.2. Ship `enhance_prompt` as a hosted-LLM call with the
Subject–Context–Style system prompt. CI gate: license manifest generator.

**Weeks 3–4 — Layer 9 resizers + vectorizer.** Ship `resize_icon_set`, `make_favicon`,
`vectorize`, `remove_background` over rembg + BiRefNet-lite + vtracer. Our free OSS
`appicon.co` replacement, self-contained launch surface.

**Weeks 5–7 — Layer 4 paid tier.** Capability router, per-model verbalizers,
`validate_asset` (alpha coverage, palette adherence, text legibility, platform-spec
linter). Paid beta opens.

**Weeks 8–10 — Layers 7 + 8.** Deploy `worker-comfyui` on RunPod with pinned
custom-node manifest (Manager, rgthree, Impact-Pack, LayerDiffuse). Ship
`generate_transparent_asset` (nine-node SDXL + LayerDiffuse graph) and `generate_with_style`
(Flux Schnell + our five SDXL LoRAs).

**Weeks 11–13 — Layer 2 training.** 20k (intent, prompt, target_model, asset_type) pairs
from beta + ImageReward (Apache) + HPSv2 (Apache) + T2I-CompBench (MIT). SFT + GRPO on
SmolLM2-135M. Publish `Promptist-Assets v0` under MIT; swap in as the free-tier rewriter.

---

## Risks

- **R1 — Weight relicense.** An OpenRAIL checkpoint silently bumps to a stricter
  license. *Mitigation:* SHA-256 pinning + our HF mirror + monthly legal audit; the
  build breaks on manifest drift.
- **R2 — GPL bleed from ComfyUI custom-nodes.** *Mitigation:* our hosted sidecar whitelists
  Apache/MIT/OpenRAIL nodes only; "BYO workflow JSON" runs in the customer's own
  RunPod account, never ours.
- **R3 — BFL relicenses Flux Schnell.** *Mitigation:* Flux traffic defaults to hosted
  APIs (Together, fal, Replicate); self-hosted Schnell is a cost optimization, not a
  dependency.
- **R4 — OpenRAIL use-restriction propagation suit.** *Mitigation:* EULA mirrors the
  restrictions verbatim, customer acceptance gates API access, responsibility flows
  through.
- **R5 — SDXL / SD 1.5 training-data suit.** *Mitigation:* offer a BRIA-indemnified tier
  (hosted API, $0.018/image) for enterprise customers requiring IP indemnification.

---

## Dropped scope (and why)

- **Fooocus expansion weights** — CC-BY-NC-4.0. Re-implement the logits-processor idea
  clean-room; never bundle the weights.
- **Hunyuan-PromptEnhancer 7B** — Tencent license excludes EU/UK/KR; unsafe as global
  default.
- **Flux.1 [dev] and every [dev]-trained LoRA** — BFL non-commercial. Route to hosted
  `flux-pro` for premium quality.
- **BRIA RMBG-2.0 ONNX weights** — CC-BY-NC-4.0. Use BiRefNet (MIT, ~95% quality) or
  BRIA's hosted API (paid, indemnified).
- **SD.Next** — AGPL-3.0, contagious via network use.
- **Openinary** — AGPL-3.0.
- **`ComfyUI-Easy-Use` as a vendored dep** — GPL-3.0; HTTP arm's length only.
- **potrace, autotrace** — GPL-2; vtracer (MIT) replaces.
- **`Nutlope/logocreator`** — no LICENSE file; clean-room only.
- **SD 3 / 3.5 Large** — Stability AI Community License revenue gates; defer.
- **Civitai LoRAs with "No commercial use" toggle** — per-upload auditing.
- **Lexica / Midjourney / Krea scraped prompt datasets** — platform ToS blocks reuse;
  we use ImageReward + HPSv2 + T2I-CompBench + DiffusionDB + synthetic + consented beta.
- **ART / PSDiffusion** — research-only; monitor for Apache ports.

## Scorecard

| Criterion | Rating | Evidence |
|---|---|---|
| MIT/Apache/OpenRAIL-M-only code surface | **A+** | Every top-level dep in the manifest is MIT, Apache-2.0, BSD, MPL-2.0, or ISC. |
| No copyleft contamination in shipped binary | **A** | ComfyUI and Easy-Use run over HTTP in a separate container; Satori (MPL-2.0) is imported unmodified; no GPL/AGPL in our Node process. |
| No CC-BY-NC weights in default paths | **A+** | Bria, Fooocus, ART, PSDiffusion, every Flux [dev] LoRA explicitly skipped. |
| Commercial-safe weight stack | **A** | SDXL (OpenRAIL++-M) + Flux Schnell (Apache) + LayerDiffuse (OpenRAIL-M) + BiRefNet (MIT) + U²-Net / ISNet (Apache) + Logo.Redmond v2 (OpenRAIL-M). |
| Global SaaS legal coverage | **A-** | EU/UK/KR safe (Hunyuan-7B excluded). OpenRAIL use-restrictions propagate via EULA. BRIA hosted API available as indemnified upgrade. |
| Training-data license cleanliness | **A** | ImageReward (Apache), HPSv2 (Apache), T2I-CompBench (MIT), DiffusionDB (CC0), synthetic; no Lexica, no Midjourney scrape. |
| Manifest auditability | **A+** | SHA-256-pinned weights mirrored to our HF org; generated `third_party_manifest.json`; CI breaks on SPDX drift. |
| Long-tail model access | **B+** | OpenRouter as secondary `ImageProvider`; long-tail models reached via commercial APIs (no weight redistribution risk). |
| Premium quality ceiling | **A-** | Hosted `gpt-image-1.5` + Imagen 4 + Recraft v3 + Ideogram 3 + FLUX.2 Pro covers everything Flux [dev] could; we lose self-hosted Flux [dev] quality but gain license safety. |
| Ops discipline | **A** | Pinned lockfile for ComfyUI + custom-nodes; scheduled rebuild cadence; weight manifest in CI. |

**Aggregate: A.** The stack is decisively license-clean, commercially defensible, and
complete. The single trade-off is self-hosted Flux [dev]-class quality — which we cede
to hosted `flux-pro` on Together / fal / Replicate in exchange for never touching a
non-commercial weight. That is the right trade for a closed-source paid SaaS.
