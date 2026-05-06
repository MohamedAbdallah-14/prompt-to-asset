# Multi-Image Reference Compositing for UI Mockups

Research summary, dated 2026-05-06. Scope: which models accept reference images, what each ref can do, and a per-model recipe for combining structure refs (wireframe / sketch) + style refs (target app screenshot) + content refs (logo / brand mark) in one generation pass.

## TL;DR

- For UI mockups in 2026, three model families are credible at multi-ref: **Flux 2 (Pro/Flex)**, **Gemini 3 Pro Image / 3.1 Flash Image**, and **gpt-image-1.5 / gpt-image-1**. They all accept ≥4 images per request, indexed by ordinal (image 1 / image 2 / ...).
- Flux 2 is the only model with **explicit ordinal indexing in the prompt** ("from image 2") documented as a supported pattern (BFL docs, Together AI). Best fit for "wireframe + style screenshot + logo" three-ref UI workflows.
- Gemini 3 Pro Image splits its ref budget into **objects (high-fidelity reproduction)** vs **characters (consistency)** — there is no formal "structure" or "style" role. You smuggle structure in as an object ref and rely on the prompt.
- gpt-image-1.5 / gpt-image-1 take up to 16 input images on `/edits`, with `input_fidelity:"high"` controlling preservation. **Only the first ref gets "extra rich" texture preservation** — load the wireframe there.
- Midjourney v7 has the cleanest **role-typed** primitives (`--sref` style, `--cref` character, `--oref` omni) but is paste-only for most P2A flows. `--sref` + `--oref` is the pattern for "lock the look of the screenshot, lock the brand mark."
- Ideogram 3 Turbo accepts style refs (≤10MB total, JPEG/PNG/WebP) **OR** style codes — mutually exclusive — and is built around text fidelity, not layout fidelity. Use as a wordmark / labeled-button render pass, not as the structural pass.
- Recraft V4 is the SVG-native option; styles are built from 1-5 reference images upfront via `RecraftCreateStyleNode`, then a `style_id` is reused across generations. Different mental model: ref images are **training inputs**, not per-request prompts.
- The gold-standard *layout-faithful* path is still **SDXL + ControlNet (MLSD or Lineart) + IP-Adapter** in ComfyUI. ControlNet locks the wireframe geometry; IP-Adapter pulls style from a screenshot. No hosted API ships this combo end-to-end.
- **LayerDiffuse** is alive but mostly stalled — `huchenlei/ComfyUI-layerdiffuse` is the only active fork; it only supports SDXL/SD1.5 (no Flux 2, no SD3.5 official port). Useful for transparent UI elements (modals, drop shadows), not full screens.

## Per-model findings

### 1. gpt-image-1.5 / gpt-image-1 (OpenAI)

- **Refs supported:** up to **16** images on `/edits`. ([OpenAI cookbook][1], [AI/ML API docs][2], [DataCamp][3])
- **Asymmetry:** all 16 are preserved at high fidelity, but **only the first** keeps "extra richness in texture" ([OpenAI cookbook input_fidelity guide][1]). For UI: place the wireframe / target-screenshot first.
- **Roles:** no role-typed slots. Roles are described in the prompt. Can mix structure + style + brand in one call.
- **Knob:** `input_fidelity:"high"` on the edits endpoint, intended for "faces, logos, or any other details that require high fidelity" ([OpenAI community thread][4]). For UI the same knob preserves chart geometry and text.
- **Multi-edit pitfall:** chained high-fidelity edits accumulate grain ([OpenAI feedback thread][5]). Generate-once, refine-once, stop.
- **gpt-image-2 caveat:** `background:"transparent"` 400s on gpt-image-2 (verified regression vs 1.5 — see project memory). For UI screens with translucent panels, stay on 1.5.

### 2. Gemini 3 Pro Image Preview / 3.1 Flash Image Preview (Google)

- **Refs supported:** **3 Pro Image** = up to 11 (6 object + 5 character). **3.1 Flash Image** = up to 14 (10 object + 4 character). ([Google AI image generation docs][6])
- **Roles:** Google formalizes only **object fidelity** and **character consistency**. There is no structure / layout slot — you describe the wireframe in prose and pass it as an "object" image.
- **API surface:** Files API + `parts[]` with `Image.open(...)` entries; the prompt and images coexist in `contents` ([Google AI Gemini-3 dev guide][7], [fal docs for gemini-3-pro-image-preview][8], [AI/ML API docs][9]).
- **Verified UI strength:** Google docs explicitly call out "high-fidelity product mockups" as a target use case for 3 Pro Image ([model card][10]).
- **Limit gotcha:** the 6-object cap on 3 Pro Image is tighter than 3.1 Flash. For dashboard collages with many widgets, Flash actually has the larger ref budget — counter-intuitive but documented.

### 3. Midjourney v7

- **`--sref <url|code>`:** style reference, transfers palette + composition + brushwork ([MJ Style Reference docs][11]).
- **`--cref`:** character reference; designed for faces / persistent identity, not screens ([MJ Character Reference docs][12]).
- **`--oref`:** **Omni-Reference**, launched 2025-05-03. **One image only.** `--ow` weight 0–1000, default 100, sweet spot ~400 for "dominant" ([MJ Omni-Reference update][13], [TitanXT guide][14], [ImaginePro guide][15]).
- **Stacking:** docs confirm `--oref` "should work with personalization, stylization, style references, and moodboards" ([MJ update post][13]). The community pattern: same image as `--oref` AND `--sref` to lock both content and look ([ImaginePro][15]).
- **UI pitfall:** Midjourney does not render fine UI text reliably; treat MJ output as wallpaper / hero, not as a complete UI mockup. `--oref` is incompatible with Fast / Draft / Conversational modes and costs 2× GPU.

### 4. Flux 2 Pro / Flex / Klein / Dev (Black Forest Labs)

- **Refs supported:** API = **8**, Playground = **10**, all variants ([BFL docs][16], [Together AI multi-ref blog][17], [Microsoft Foundry post][18]).
- **Indexing:** parameters are `input_image`, `input_image_2`, ..., `input_image_8`. Prompt addresses them by ordinal: *"Replace the top of the person from image 1 with the one from image 2"* ([BFL Flux 2 image-editing docs][16]).
- **No explicit weights** — influence is steered by prompt language. Flex variant exposes steps / guidance for finer control ([Together AI][17]).
- **UI evidence:** BFL's own multi-ref page demos brand consistency: *"the same logo applied to mobile app splash screen"* with hex-locked colors `#00D9FF`, `#6B0FB3` preserved across two refs ([Together AI quote of BFL examples][17]).
- **Flux 2 has no `negative_prompt`** — silently no-op (see project memory). Use positive anchors.

### 5. Ideogram 3 / 3 Turbo

- **Refs supported:** multiple `style_reference_images`, **≤10MB total** across all of them, JPEG/PNG/WebP ([Ideogram generate-v3 docs][19], [Ideogram edit-v3 docs][20]).
- **Style codes:** 8-char hex identifiers; **mutually exclusive** with `style_reference_images` and `style_type` ([Ideogram docs][19]).
- **Fit for UI:** Ideogram's strength is rendered text. Use it for the wordmark / button-label / chart-axis pass, not the structural pass. Typical recipe: render layout in another model, pass into Ideogram `/edit-v3` with mask + `style_reference_images` to inject readable copy.
- **Transparency:** dedicated endpoint `/ideogram-v3/generate-transparent`, `rendering_speed:"TURBO"` (project memory). Useful for transparent UI components.

### 6. Recraft V4

- **Workflow is inverted:** styles are built **once** from 1–5 reference images via `RecraftCreateStyleNode`; the resulting `style_id` is then reused on every text-to-image call ([Recraft style-set blog][21], [ComfyUI Recraft Style Reference workflow][22], [MindStudio Recraft V4 explainer][23]).
- **V4 dropped `style_id`** for some flows — use V3 if you need the prebuilt brand-style preset library; V4 for the new SVG path (project memory).
- **UI-specific:** Recraft markets a "free AI mockup generator" and explicitly handles UI/dashboard layouts ([Recraft mockup generator][24], [MindStudio UI explainer][23]).
- **Per-request refs:** also supports image-to-image with a single reference; multi-ref is via the saved style.

### 7. SDXL + ControlNet + IP-Adapter (ComfyUI / A1111)

The canonical, most-controllable path — and the only one where the three roles (structure / style / content) map to three distinct adapters.

- **Structure ref** → ControlNet preprocessor:
  - **MLSD** for screen layouts: detects only straight lines, "ideal for images with strong architectural elements, interiors, and geometric forms" ([Stable Diffusion Art ControlNet guide][25], [comfyui-wiki][26]). Best for dashboards, table layouts, grid structures.
  - **Lineart / AnyLine** for hand-drawn wireframes: more refined than Canny, supports anime-style lines ([RunComfy mastering ControlNet][27]).
  - **Reference-only** preprocessor: no control model needed, "transfers overall resemblance to the reference image, including colors, composition, and elements of artistic style," with a Style Fidelity slider ([ThinkDiffusion][28], [Mikubill discussion #1236][29]).
- **Style ref** → IP-Adapter (`tencent-ailab/IP-Adapter`, [arXiv 2308.06721][30], [official repo][31]). The decoupled cross-attention design separates text and image conditioning. SDXL demos exist for both pure style transfer and ControlNet stacking (`ip_adapter_sdxl_controlnet_demo` notebook).
- **Content ref** → second IP-Adapter instance OR text in prompt OR composite-after.
- **Practitioner workflows:** InstaSD, OpenArt, and Civitai host SDXL+IP-Adapter+ControlNet graphs that combine all three ([InstaSD style transfer][32], [OpenArt ControlNet++ Union + IPAdapter graph][33], [Civitai all-in-one v3][34]).
- **Doc-vs-reality flag:** ControlNet MLSD docs talk about "interior design" use cases. **Practitioners use it for UI** — it's a transferable technique, not a documented one. No major repo has a UI-targeted ControlNet preset; you import a screenshot, run MLSD, and accept the result.

### 8. LayerDiffuse / multi-layer

- **Active fork:** `huchenlei/ComfyUI-layerdiffuse` ([repo][35]). The original `lllyasviel/LayerDiffuse` is research-grade, with the WebUI port `lllyasviel/sd-forge-layerdiffuse` flagged WIP ([repo][36]).
- **Status:** SDXL/SD1.5 only. **No official Flux 2 / SD3.5 port** as of 2026-05. Re-trained SDXL checkpoints (NOOBAI, animagin XL 4.0) frequently produce solid-color backgrounds instead of transparency ([issue #124][37]).
- **UI fit:** good for transparent overlay assets — modals, sheets, sticker-style UI elements. Not viable for whole-screen mockups.

## Per-model reference recipes

| Model | Refs | Recipe (3-ref UI mockup) | Roles | Format |
|---|---|---|---|---|
| **gpt-image-1.5** (`/edits`) | 16 | image 1 = wireframe (gets extra-rich preservation); image 2 = target-app screenshot for style; image 3 = brand mark/logo | Implicit, prose-described | PNG/WebP/JPG ≤50MB each, local files only |
| **gemini-3-pro-image-preview** | 11 (6 obj + 5 char) | objects[0] = wireframe; objects[1] = screenshot; objects[2] = logo | object fidelity vs character consistency | Files API or inline_data Blob |
| **gemini-3.1-flash-image-preview** | 14 (10 obj + 4 char) | same; bigger object budget for widget collages | object vs character | Files API |
| **midjourney v7** | 1 oref + N sref + N cref | `--oref <logo>` + `--sref <screenshot>` + prompt describing layout. `--ow 400`. | role-typed | URLs in prompt |
| **flux-2-pro / -flex** | 8 (10 in playground) | `input_image` = wireframe; `input_image_2` = screenshot; `input_image_3` = logo. Prompt: *"layout from image 1, visual style from image 2, brand mark from image 3"* | ordinal-indexed in prompt | URL or upload |
| **ideogram-3-turbo** | N (≤10MB total) | style_reference_images = [screenshot, brand swatch]. Use `/edit-v3` with mask for text layers. | style only | JPEG/PNG/WebP |
| **recraft-v4** | 1-5 (style build) + 1 (i2i) | Pre-build style_id from 5 brand screens once. At gen time pass style_id + single i2i ref of wireframe. | style preset + i2i | PNG/SVG |
| **SDXL + CN + IPA** | 2-3 adapters | ControlNet MLSD on wireframe (weight 0.7-1.0), IP-Adapter on screenshot (weight 0.4-0.6 for style, 0.8+ for tight match), optional second IPA on logo (weight 0.6) | structure / style / subject | PNG, ComfyUI graph |
| **layerdiffuse SDXL** | 1 | Foreground-only generation; composite layers in canvas | foreground/transparency | SDXL pipeline |

## Doc-vs-reality flags

- **Gemini docs** call out "product mockups" as a target but provide no UI-specific examples in the model card; you have to extrapolate from object-fidelity language.
- **ControlNet MLSD docs** describe interior-design use cases; UI/dashboard application is folklore from practitioners, not documented.
- **Midjourney `--oref` docs** say it works alongside `--sref` but never demonstrate the stack — practitioner posts (TitanXT, ImaginePro) confirm the combination empirically.
- **gpt-image-1 multi-image edits**: docs say all 16 images are preserved equally; cookbook contradicts this with the "first image gets extra richness" carve-out. Order matters.
- **Recraft V4** dropped style preset support that V3 had — docs are inconsistent across third-party explainers about which version supports `style_id` for brand presets.
- **LayerDiffuse**: huchenlei fork is "active" by GitHub commit count but the issue tracker shows months-old transparency regressions on common SDXL checkpoints. Treat as best-effort.

## Sources

[1]: https://cookbook.openai.com/examples/generate_images_with_high_input_fidelity
[2]: https://docs.aimlapi.com/api-references/image-models/openai/gpt-image-1
[3]: https://www.datacamp.com/tutorial/gpt-image-1
[4]: https://community.openai.com/t/gpt-image-1-input-fidelity/1317640
[5]: https://community.openai.com/t/multiple-gpt-image-1-high-fidelity-edits-lead-to-grainy-result/1320474
[6]: https://ai.google.dev/gemini-api/docs/image-generation
[7]: https://ai.google.dev/gemini-api/docs/gemini-3
[8]: https://fal.ai/docs/model-api-reference/image-generation-api/gemini-3-pro-image-preview
[9]: https://docs.aimlapi.com/api-references/image-models/google/gemini-3-pro-image-preview-edit
[10]: https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image-preview
[11]: https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference
[12]: https://docs.midjourney.com/hc/en-us/articles/32162917505293-Character-Reference
[13]: https://updates.midjourney.com/omni-reference-oref/
[14]: https://www.titanxt.io/post/control-your-midjourney-creations-a-guide-to-the-new-omnireference-v7
[15]: https://www.imaginepro.ai/blog/2025/7/midjourney-omni-reference-guide
[16]: https://docs.bfl.ml/flux_2/flux2_image_editing
[17]: https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai
[18]: https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/black-forest-labs-flux-2-visual-intelligence-for-enterprise-creative-now-on-micr/4477561
[19]: https://developer.ideogram.ai/api-reference/api-reference/generate-v3
[20]: https://developer.ideogram.ai/api-reference/api-reference/edit-v3
[21]: https://www.recraft.ai/blog/how-to-create-image-sets
[22]: https://www.comfy.org/workflows/api_recraft_style_reference-e6af724bfa83/
[23]: https://www.mindstudio.ai/blog/what-is-recraft-v4-design-forward-image-model
[24]: https://www.recraft.ai/mockup-generator
[25]: https://stable-diffusion-art.com/controlnet/
[26]: https://comfyui-wiki.com/en/tutorial/advanced/how-to-install-and-use-controlnet-models-in-comfyui
[27]: https://www.runcomfy.com/tutorials/mastering-controlnet-in-comfyui
[28]: https://learn.thinkdiffusion.com/controlnet-reference-pre-processors/
[29]: https://github.com/Mikubill/sd-webui-controlnet/discussions/1236
[30]: https://arxiv.org/pdf/2308.06721.pdf
[31]: https://github.com/tencent-ailab/IP-Adapter
[32]: https://www.instasd.com/post/sdxl-style-transfer-with-ipadapter-and-controlnet
[33]: https://openart.ai/workflows/aiguildhub/controlnet-union-sdxl-with-ipadapter-for-style-transfer/To0Oa8AI2zRW2d7CnVSH
[34]: https://civitai.com/models/1235984/comfyui-workflow-all-in-one-text-to-image-workflow-controlnet-ip-adapter-adetailer-ella
[35]: https://github.com/huchenlei/ComfyUI-layerdiffuse
[36]: https://github.com/lllyasviel/sd-forge-layerdiffuse
[37]: https://github.com/huchenlei/ComfyUI-layerdiffuse/issues/124
