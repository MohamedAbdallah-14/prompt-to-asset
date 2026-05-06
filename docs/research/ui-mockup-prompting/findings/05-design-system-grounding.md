# 05 — Design System Grounding in Image-Model Prompts

Research summary on injecting a named design system (Tailwind, Material 3, Apple HIG, shadcn/ui, Radix, Fluent 2, Carbon, Polaris) into a text-to-image prompt to constrain spacing, typography, and component vocabulary.

Headline: **naming the system pulls the model toward a *vibe*, not a spec**. Material 3 produces "Material-ish" (rounded corners, FAB circles, elevation). Apple HIG produces "Apple-ish" (SF-Pro-shaped sans, blue accents, squircles). Tailwind / shadcn / Radix / Fluent 2 / Polaris are mostly invisible to current image models. No major raster model (gpt-image-2, Nano Banana Pro, Imagen 4, Flux 2, Midjourney v7/v8) treats a design system as a hard constraint the way it treats "studio ghibli" or a known logo. Reference images do more lifting than prompt strings; code/screenshot tools (v0, Aura, Banani) outclass diffusion for actual fidelity.

## 1. Does naming a design system pull the model toward its visual signature?

Partially, and unevenly.

- Babich (UX Planet, LogRocket cite) recommends UI words — *interface, layout, component, Figma, design system, Material 3, HIG* — over art words. He claims naming a system "drastically improves structure." [^logrocket][^uxplanet]
- NN/g's controlled test: given a Material Design 3 reference, AI-prototyping tools produced "designs with similar tone but more saturated colors than the reference." Tone yes, spec no. The same article documents "Frankenstein layouts" — extra components, low information density, broken hierarchy — even when a system is named. [^nng]
- Design+Code frames Midjourney/DALL·E as good for "visual mood and inspiration, not suitable for production UI"; they recommend v0.dev for component-level output because it generates shadcn/ui code directly. [^designcode]

The model knows the *name* and produces a recognizable mood. It does not produce specifications. That gap is the central failure mode.

## 2. Which design systems are well-represented in training data?

Approximate ranking based on cross-source mentions, model behavior reports, and where named-system prompts produce visually consistent output:

- **Strongly recognized (mood-locks reliably):** Material Design / Material 3, Apple HIG / iOS, "flat design" (not a system but a dominant visual prior).
- **Weakly recognized (the model produces the *idea* but with heavy hallucination):** IBM Carbon, Microsoft Fluent 2.
- **Effectively unknown (name does nothing visible):** Tailwind UI, shadcn/ui, Radix, Polaris, Chakra, Mantine, Linear-style. These are *code-first* — visual signature lives in HTML/CSS, not in screenshots Midjourney/Flux/Imagen scraped at scale. Civitai/HuggingFace searches for shadcn or Tailwind UI LoRAs return zero matches; both names appear only as the *output stack* of code-gen tools (v0, Banani), never as a learned visual prior. [^civitai][^hf-mobile]
- **One published UI LoRA:** `ayrisdev/mobile-ui-design` (Flux.1-dev, trigger `mobiluidesign`, ~1k Dribbble samples per the LearnOpenCV SD3.5 sibling project). Generic mobile UI; not a Material/HIG enforcer. [^hf-mobile][^learnopencv]

## 3. Do system tokens help or confuse the model?

No published controlled study, but the evidence converges:

- Concrete, *visually-grounded* tokens help: "blue gradient, rounded corners, white background, 12-column grid, sans-serif" all show up in Recraft V4 fidelity tests. [^recraft-v4]
- Internal token names (`--color-primary`, `--color-blue-500`, `Material elevation 2 surface`, `shadcn rounded-md border-input`, `iOS 17 SF Pro`) are noise to the diffusion model. Tailwind v4 / AI-coded-projects guides note semantic-vs-numeric tokens matter for *Claude generating CSS*, not for image models. [^matchkit][^mavik]
- Translate the token into a visual phrase. `Material elevation 2` → `subtle drop shadow, 4px blur`. `Tailwind blue-500` → `#3B82F6 primary buttons`. The model responds to the second form.

Net: design-system token *names* are ignored. Their *resolved visual values* (hex, radius px, font name, shadow blur) help.

## 4. Reference-image grounding

This is where actual fidelity lives.

- **Midjourney `--sref` (URL or numeric code).** Steals "the aesthetic without the content" — lighting, color, texture. Useful for matching a Linear/Notion/Stripe color world. Numeric sref libraries (srefcodes.com 4,800+, promptsref.com, midlibrary.io, sref-midjourney.com) publish *no* design-system-specific codes. No canonical "Material 3 sref" or "iOS sref"; users hand-curate. Strength tuneable via `--sw 0–1000`. [^mj-sref][^srefcodes]
- **Recraft V4 / V3 `style_id`.** Upload 1–5 references, Recraft trains a reusable style. Documented for SaaS dashboard mockups; vector output. Best programmatic option for locking a brand-specific UI look. V4 dropped prebuilt brand presets but kept the upload-and-create flow. [^recraft-style][^recraft-v4]
- **Flux 2 multi-reference (up to 10 images).** BFL markets multi-ref for "consistent characters and products across scenes" plus hex-code color matching for brand compliance. UI dashboards are a documented use case. [^flux2-bfl][^flux2-together]
- **Flux IP-Adapter (XLabs, InstantX).** 512² and 1024², SigLIP-so400m encoder. Style transfer from a UI screenshot is decent but lossy on small-text components. [^xlabs][^instantx]
- **Nano Banana Pro.** Max Woolf: "too resistant to changing styles" when asked to convert *into* a named style; accepts reference images for "in the style of" prompts. Renders full HTML/CSS pages reasonably with code-as-context. [^minimaxir]

Verdict: reference images outperform prompt strings on every model. Recraft V4 + Flux 2 multi-ref are the cleanest paid routes; `--sref` works for vibes; IP-Adapter Flux works locally if quality is secondary.

## 5. Component vocabulary — does saying "FAB", "drawer", "snackbar", "tab bar" produce structurally correct components?

Partially. Material vocabulary (FAB, snackbar, app bar, navigation drawer) hits — these are the most-photographed Android terms in the corpus. iOS terms (tab bar, navigation bar, share sheet, action sheet) hit. Cross into shadcn/Radix (Dialog, Popover, Combobox, Command Menu, Sheet), the model produces a *generic shape matching the word* but not the system's component. NN/g's Frankenstein finding applies — the model invents and duplicates. [^nng]

When component fidelity matters: name the component AND describe it visually ("navigation drawer — vertical sidebar, 280dp wide, white surface, hairline divider, list items with leading icon and label").

## 6. What concretely fails when you say "in the style of <design system>"?

- **Saturation drift.** Material 3 references → more saturated than the spec. [^nng]
- **Typography drift.** SF Pro / Roboto Flex / Inter / IBM Plex are not rendered faithfully. Models substitute a generic geometric or humanist sans. Imagen 4 comes closest on Latin sans but still won't ship pixel-correct SF Pro.
- **Spacing-grid drift.** No model honors an 8pt or 4pt grid. NN/g's "low information density containers" is the specific symptom.
- **Component hallucination.** Buttons grow extra icons; tabs sprout glows; cards get gratuitous gradients. [^aiarty][^logrocket]
- **Tailwind / shadcn name = no-op.** "Tailwind UI dashboard, shadcn components" produces generic flat-design dashboards indistinguishable from the same prompt without those words. The absence of any LoRA, sref code, or recognized signature in public catalogues is the evidence — these names did not enter the visual training corpus at scale.
- **Code-as-context partial win.** Nano Banana Pro renders a webpage when fed full HTML/CSS, with typography/proportions degraded but layout and colors preserved. [^minimaxir]

## 7. Public LoRAs / style packs trained explicitly on a design system

Searches across HuggingFace (Aug 2024 → Apr 2026) and Civitai surface no Material-3-, HIG-, Tailwind-, or shadcn-specific LoRA. Closest hits:

- `ayrisdev/mobile-ui-design` — Flux.1-dev LoRA on Dribbble mobile UI. Generic mobile, not Material. [^hf-mobile]
- LearnOpenCV's SD3.5-medium UI fine-tune on a 1k-row Dribbble dataset. Same shape — generic, no system enforcement. [^learnopencv]
- XLabs flux-lora-collection, Ktiseos-Nyx-Trainer — infrastructure, not UI styles. [^civitai]

Market gap. A purpose-built Material 3 or HIG LoRA trained on the official component galleries plus screenshots would be a meaningful artifact. None exists publicly.

## Recommendations — per-system grounding strategy

| Design system | Locks via text alone? | Best route | Notes |
|---|---|---|---|
| Material 3 / Material Design | Partial — vibe only | Text + reference screenshot via Flux 2 multi-ref or Recraft V4 style_id | Saturation drift; never trust the spec. Compositing typography post-render is mandatory. |
| Apple HIG / iOS | Partial — vibe only | Reference image via Midjourney `--sref` (URL upload) or Recraft V4 | SF Pro will not render correctly; substitute a geometric sans and composite text. |
| Carbon (IBM) | Weak | Reference image required (Flux 2 / Recraft) | Name lands ~50% — gets the cool grey + sans flavor, misses the grid. |
| Fluent 2 (Microsoft) | Weak | Reference image required | Acrylic / mica effects do not survive any text-only prompt. |
| Tailwind UI | No | v0.dev or Aura for code path; reference-image-only for visuals | Image models do not know "Tailwind UI" as a visual signature. |
| shadcn/ui | No | v0.dev (it generates shadcn natively); image models are hopeless | Same as Tailwind. |
| Radix | No | Code-gen tools | Radix is structural/headless — there is *no* visual signature to learn. |
| Polaris (Shopify) | No | Reference image only | Not in the public visual corpus at scale. |

**Default flow:**

1. Production code → route to v0.dev / Aura / Banani. They output shadcn/Tailwind/Material directly. Diffusion is the wrong tool. [^designcode][^banani]
2. Visual mockup or hero → accept that no text-only prompt locks the system. Grab a reference screenshot (Material 3 Components page, HIG showcase, Linear dashboard) and feed it to **Recraft V4** (`style_id`) or **Flux 2** (multi-reference, up to 10 images) — the only models with documented brand-fidelity workflows in 2026.
3. Convert tokens to visual phrases before they enter the prompt. `bg-blue-500` → `#3B82F6`. `Material elevation 2` → `4px blur drop shadow`. `iOS 17 large title` → `34pt bold sans serif left aligned`.
4. Composite typography in the application layer for text smaller than ~18pt. No model renders SF Pro / Inter / IBM Plex / Roboto Flex pixel-correct at small sizes.
5. Validate with the P2A tier-1 stack plus palette ΔE2000 vs the design system's published color tokens. If ΔE > 10 on any role color, regenerate or composite over.

**Hopeless cases:** pixel-correct shadcn / Radix / Tailwind UI / Polaris from text alone; pixel-correct Material 3 spacing or HIG glyphs from any diffusion model; multi-screen consistency without reference images.

[^logrocket]: LogRocket — "How to generate stunning UI designs with Midjourney AI". https://blog.logrocket.com/ux-design/using-midjourney-generate-ui-designs/
[^uxplanet]: Nick Babich, UX Planet — "UI Design with Midjourney". https://uxplanet.org/ui-design-with-midjourney-df78eaa2d292
[^nng]: Nielsen Norman Group — "Prompt to Design Interfaces: Why Vague Prompts Fail and How to Fix Them". https://www.nngroup.com/articles/vague-prototyping/
[^designcode]: Design+Code — "A Practical Guide to Prompting for UI". https://designcode.io/prompt-ui-intro/
[^hf-mobile]: HuggingFace — `ayrisdev/mobile-ui-design`. https://huggingface.co/ayrisdev/mobile-ui-design
[^learnopencv]: LearnOpenCV — "Fine-tuning Stable Diffusion 3.5: UI images". https://learnopencv.com/fine-tuning-stable-diffusion-3-5m/
[^civitai]: Ktiseos-Nyx-Trainer + Civitai LoRA browsing (no Material/HIG/Tailwind/shadcn LoRA found). https://github.com/Ktiseos-Nyx/Ktiseos-Nyx-Trainer
[^matchkit]: MatchKit — "Design Tokens for Tailwind v4". https://www.matchkit.io/blog/design-tokens-tailwind-v4
[^mavik]: Mavik Labs — "Design Tokens That Scale in 2026". https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/
[^recraft-v4]: MindStudio — "What Is Recraft V4?" and Recraft V4 docs. https://www.mindstudio.ai/blog/what-is-recraft-v4-design-forward-image-model , https://www.recraft.ai/docs/recraft-models/recraft-V4
[^recraft-style]: Recraft — "Style Sharing" + "Create Sets of Consistent Images". https://www.recraft.ai/blog/introducing-style-sharing-maintain-design-consistency-across-teams , https://www.recraft.ai/blog/how-to-create-image-sets
[^mj-sref]: Midjourney — Style Reference docs. https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference
[^srefcodes]: Midjourney sref code libraries — srefcodes.com, promptsref.com, midlibrary.io, sref-midjourney.com.
[^flux2-bfl]: Black Forest Labs — Flux 2 model page. https://bfl.ai/models/flux-2
[^flux2-together]: Together AI — "FLUX.2: Multi-reference image generation now available". https://www.together.ai/blog/flux-2-multi-reference-image-generation-now-available-on-together-ai
[^xlabs]: XLabs-AI — `flux-ip-adapter`. https://huggingface.co/XLabs-AI/flux-ip-adapter
[^instantx]: InstantX — `FLUX.1-dev-IP-Adapter`. https://huggingface.co/InstantX/FLUX.1-dev-IP-Adapter
[^minimaxir]: Max Woolf — "Nano Banana can be prompt engineered for extremely nuanced AI image generation". https://minimaxir.com/2025/11/nano-banana-prompts/
[^aiarty]: Aiarty — "Midjourney Website Design Prompts". https://www.aiarty.com/midjourney-prompts/midjourney-website-design-prompts.htm
[^banani]: Banani — "11 Best v0 Alternatives (2026)". https://www.banani.co/blog/11-best-vercel-v0-alternatives
