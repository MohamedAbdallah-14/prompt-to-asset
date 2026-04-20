# OSS "Brand in a Box" Prior Art

Survey of open-source / semi-open logo, identity, and brand-bundle generation projects and the interchange formats they rely on. Goal: don't reinvent, cite prior art, interop where useful.

Closed commercial tools (Looka, Brandmark, Hatchful, Tailor Brands, LogoMaker.com) are skipped by request.

**Research value: high** — several active OSS projects directly overlap the target design space, plus one real candidate interchange format (AdCP `brand.json`) and a mature W3C format for the token layer (DTCG).

---

## 1. Direct prior art: logo + brand-kit generators

### LogoCreator — `Nutlope/logocreator`
- URL: <https://github.com/Nutlope/logocreator>
- License: MIT (Vercel-hosted reference app).
- Stars: ~6.9k — by far the most prominent OSS logo generator.
- Approach: **diffusion-only**. Next.js + TypeScript app wrapping Flux Pro 1.1 on Together AI. User picks style/color/layout, the app builds a prompt, and returns a raster PNG.
- Strengths: Clean reference implementation of "prompt-form → Flux → image". Shows a minimal product surface (style chips, primary color, background) that real users engage with.
- Weaknesses: PNG only (no SVG path). No brand kit, no tokens, no dark/mono variants, no favicon/OG fan-out. One-shot generation, no critique loop. Wordmarks come out as whatever Flux hallucinates.
- Lessons to steal: the **"style chip + color + primary object"** UI is a good minimum viable brief; users don't want to write freeform prompts.

### LogoLoom — `mcpware/logoloom`
- URL: <https://github.com/mcpware/logoloom>
- License: MIT. Small (single-digit stars) but architecturally the closest to what `prompt-to-asset` is aiming at.
- Approach: **LLM-authors-SVG, not diffusion**. The LLM writes SVG code directly; the app then fans it out into a 31-file brand kit: SVG (light/dark/mono), 10 PNG sizes, ICO, WebP, social assets (OG, Twitter header), plus a `BRAND.md`.
- MCP-native — exposes the pipeline as tools to Claude/Cursor. Runs locally, zero API cost beyond the LLM call.
- Strengths: The **fan-out spec** is effectively the same bundle shape we want (vector master → ICO/PNG ladder → social → readme). Proves the pipeline is small and boring once the vector exists.
- Weaknesses: LLM-authored SVG is brittle — fine for geometric marks, weak for anything pictorial. No palette/typography system; no tokens export. No critique/regeneration loop.
- Lessons to steal: the **brand-kit manifest as the unit of output** (not "a logo"), the MCP-native surface, and the separation of "design SVG once" from "fan out deterministically."

### LOGORA / LOGOMATE — `eurekabot123/LOGORA-Logo-Toolkit`
- URL: <https://github.com/eurekabot123/LOGORA-Logo-Toolkit>
- License: MIT.
- Approach: Parametric/template — industry-specific templates with AI-driven customization from `{brand_name, tagline}`, exports SVG + PNG.
- Lessons: **Industry templates** as a starting point materially shorten the brief. Same pattern Looka/Hatchful use commercially — picking "SaaS" vs "coffee shop" vs "law firm" prunes the style space more than any text prompt does.

### Branding MCP — `Forge-Space/branding-mcp`
- URL: <https://github.com/Forge-Space/branding-mcp>
- License: MIT.
- Approach: MCP server exposing ~58 tools for design-system generation: color palettes with WCAG validation, typography systems, spacing/shadow/motion scales, multi-variant logos, favicons, OG images. Exports CSS, Tailwind, Figma tokens, React themes.
- Lessons: Shows that **"brand" decomposes cleanly into ~50 deterministic tool calls** once the creative seed is set. Color + typography + spacing + motion are separately validatable; don't let an LLM redo work that a color-science function does correctly.

### Brand Forge — `iamdanwi/brand-forge`
- URL: <https://github.com/iamdanwi/brand-forge>
- License: MIT. Prototyping-oriented: logo generator, palette engine with accessibility checks, typography scales, exports to SVG/PNG/CSS vars/JSON design tokens.
- Lessons: Confirms the **"JSON design tokens as the canonical export"** consensus. Every OSS entrant in this space lands on DTCG-shaped JSON as the handoff format.

### BrandSpec — `brandspec/brandspec`
- URL: <https://github.com/brandspec/brandspec>
- License: MIT.
- Approach: **Brand identity as code** — a single YAML defines the brand; generators emit CSS, Tailwind v4, Figma tokens, Style Dictionary. Includes an "AI workshop" flow (Discovery → Concept → Visual Identity → Documentation) that's LLM-agnostic.
- Lessons: The **YAML-first, generator-per-target** shape is the cleanest interchange story in the space. Worth cribbing the schema as a starting point for `prompt-to-asset`'s brand descriptor.

### brandOS — `amadad/brandOS`
- URL: <https://github.com/amadad/brandOS>
- License: MIT.
- Approach: CLI-first "brand as code" — unified config, content pipeline with quality evaluation, competitive intelligence, social publishing. Broader than logo generation; more like a brand ops runtime.
- Lessons: The **CLI + config file + pipeline** shape scales better than a GUI for agent-driven workflows. Relevant if `prompt-to-asset` wants to be callable from other agents.

### BrandKit — `fabriziosalmi/brandkit`
- URL: <https://github.com/fabriziosalmi/brandkit>
- License: MIT. Flask + Pillow + Alpine.
- Approach: **Image fan-out**, not generation. Takes an input image, removes background (person/object/anime modes), applies effects, exports to 25+ web/mobile/social formats.
- Lessons: Solid prior art for the **raster fan-out stage** of the pipeline. If `prompt-to-asset` needs "user brings their own mark, we make the kit," this is the shape.

---

## 2. Diffusion seeds: Flux LoRAs + HF Spaces

### Flux LoRAs for logo design
- `Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design` — <https://huggingface.co/Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design>. Trigger: `wablogo, logo, Minimalist`. Recommended scale 0.8. Handles dual-combinations (e.g. cat+coffee), font+shape, text-below-graphic. License per model card; Flux.1-dev base is non-commercial by default.
- `prithivMLmods/Logo-Design-Flux-LoRA` — <https://huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA>. Small (14 images), still training, minimalist bias.
- Lessons: Off-the-shelf LoRAs get us **"minimalist modern logo" out of the box**; don't burn cycles training our own for this common style. The base-model license is the real constraint, not the LoRA.

### HF Spaces
- `Kvikontent/Logo-Generator`, `MatteoScript/LogoGeneratorAI`, `Omnibus/logo-generator` — active.
- `ml6team/logo-generator`, `sammyview80/ai-logo-maker` — broken/GPU-quota.
- Lessons: Most are thin Gradio wrappers over a single model. None approach a "brand bundle." Space as distribution target is easy; Space as production surface is not serious.

### Glif
- URL: <https://glif.app/use-cases/logo-generator>, workflows at <https://glif.app/workflows>.
- Semi-open: workflows are composable blocks and many are forkable/public, though the platform itself is closed. Block-graph model (input → prompt → tool → styling → output) is a useful mental model.
- Lessons: The **forkable pipeline** social pattern matters — users don't just want a logo, they want to remix someone else's recipe. An OSS analogue would expose pipelines as versioned, shareable YAML/JSON.

---

## 3. Academic prior art

- **LoGAN / LoGANv2** (Oeldorf & Spanakis, 2018–19) — conditional StyleGAN for logos, color-conditioned. arXiv <https://arxiv.org/abs/1909.09974>. Established that logos are a hard GAN domain: non-continuous latent space, high multi-modality, no aesthetic guarantee on samples.
- **Clustered GAN logo synthesis** (Sage et al., 2017) — <https://arxiv.org/abs/1712.04407>. Introduced the **LLD (Large Logo Dataset)** — 600k+ scraped logos, 548k favicon-size + 122k hi-res. Still the main open dataset: <https://data.vision.ee.ethz.ch/sagea/lld/>.
- **DeepVecFont / DeepVecFont-v2** (SIGGRAPH Asia 2021 / CVPR 2023) — <https://github.com/yizhiwang96/deepvecfont>. Dual-modality (raster + vector sequence) transformer that synthesizes vector glyphs directly. Not a logo generator, but the **vector-native generation** architecture is the right shape for a real SVG-first logo model; diffusion → tracer pipelines lose too much.
- Lessons: The field's repeated finding is that **one-shot "generate a logo"** is not a well-defined problem. What works is constrained generation (class-conditional, style-conditional, vector-native) plus human curation. `prompt-to-asset` should treat the model as a proposer, not a closer.

---

## 4. Generative brand-system traditions

- **Patrik Hübner, "Generative Logo Synthesizer" and "Branding Toolkit"** — <https://www.patrik-huebner.com/generative-design/generative-logo-synthesizer/>, <https://www.patrik-huebner.com/creative-coding/branding-toolkit/>. Canonical reference for the **living-identity / generative-mark** tradition: vertex-shape synthesis, triadic color computation, generative typography, probabilistic pattern overlays. Exports JPG/PNG/SVG/4K video.
- **Visual Alchemist survey** — <https://visualalchemist.in/2024/09/15/creative-coding-for-generative-brand-identity-systems/>. Readable overview of the p5/Processing-era brand-system pattern.
- Lessons: A brand is a **rule system**, not an artifact. For an OSS project this argues for a "brand kernel" (palette-rule + shape-rule + type-rule + motion-rule) from which concrete assets are sampled — not a pile of exported PNGs.

---

## 5. Interchange formats / specs

This was the explicit ask: is there a real standard for "brand bundle" beyond AdCP?

### AdCP `brand.json` (Ad Context Protocol)
- Spec: <https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json>. Builder: <https://adcontextprotocol.org/brand/builder>.
- Hosted at `https://example.com/.well-known/brand.json` (RFC 8615 well-known URI). Four variants: Authoritative Location Redirect, House Redirect, Brand Agent (MCP-backed), House Portfolio.
- Fields: brand identity (id, names, Keller type), properties (websites, apps), visual assets (logos, colors, fonts), voice/tone, restrictions, guidelines, multi-level hierarchies.
- Two access tiers: public (basic) vs authorized (high-res assets, full guidelines).
- **Verdict: this is the de facto standard** for machine-readable brand identity in 2026 for agent-driven advertising. Worth making `prompt-to-asset` export a valid `brand.json` — it's the cheapest integration win in the space.

### W3C DTCG — Design Tokens Community Group format
- Homepage: <https://www.w3.org/community/design-tokens/>, <https://www.designtokens.org/>. Reached first stable spec (2025.10) in October 2025 — <https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/>.
- Supports multi-brand theming, Display P3 / Oklch / CSS Color Module 4, aliases/inheritance, cross-platform export (iOS/Android/web/Flutter).
- Adopted by Figma, Sketch, Framer, Adobe, Penpot, Knapsack, Supernova, zeroheight; editors from Google, Amazon, Microsoft, Meta, Salesforce, Shopify.
- **Verdict: this is the de facto standard** for the *token* layer of a brand (colors, typography, spacing, motion). Penpot's implementation — <https://help.penpot.app/user-guide/design-systems/design-tokens/> — is the cleanest OSS reference.

### Adobe Spectrum Design Data Specification
- <https://opensource.adobe.com/spectrum-design-data/spec/>. v1.0.0-draft. JSON Schema Draft 2020-12. Layered cascade (foundation → platform → product), platform manifests, semantic + conformance validation layers.
- More opinionated than DTCG (enforces a cascade model). Not widely adopted outside Adobe, but worth tracking.

### Schema.org `Organization` / `brand` / `logo`
- <https://schema.org/Organization>, <https://schema.org/brand>, <https://schema.org/logo>. `logo` is an `ImageObject` or URL. Google's Organization structured-data guidance: <https://developers.google.com/search/docs/appearance/structured-data/logo>.
- **Verdict: too thin** to be a brand bundle — it's a single-logo-per-org pointer for SEO. Useful as an *output* (`prompt-to-asset` should emit a `logo` snippet), not as a container format.

### Frontify / closed SaaS brand platforms
- Frontify API exists and integrates with Microsoft Copilot Studio, but there's no public JSON schema for the brand guidelines payload. Not a viable interop target.

### Verdict on interchange
- **Pair AdCP `brand.json` (identity envelope) with DTCG tokens (system layer)** and you've covered ~95% of what external agents and tools consume. Everything else is a vendor lock-in format. Emitting both is roughly a day of work and buys real interop.

---

## 6. Figma plugin ecosystem (for the import/export seam)

- `coryetzkorn/figma-logo-layout` (MIT, TS) — auto-grid layout of logos.
- `realvjy/uilogos-figma` (TS) — insert dummy/brand logos + country flags.
- `kevinwuhoo/vector-logos-figma-plugin` — search + insert SVG logos.
- `Pictogrammers/figma-plugin-generator` — meta-plugin that generates icon-library plugins.

None do generation. All treat Figma as a sink for an existing SVG library. Lesson: the **Figma seam is commoditized**; if `prompt-to-asset` outputs a well-formed SVG + DTCG token file, integrating with Figma is a thin plugin shell, not a research problem.

---

## Cross-cutting lessons to steal

1. **Brand bundle > single logo.** Every serious project (LogoLoom, Branding MCP, Brand Forge, BrandSpec) outputs a multi-file kit with a manifest, not a PNG.
2. **Separate "design the master" from "fan out variants."** The master is a one-shot creative act (LLM-SVG or diffusion+vectorize); everything below it (sizes, masks, favicons, OG, tokens) is deterministic and cheap. Don't let a model redo what ImageMagick / a color function does correctly.
3. **YAML/JSON brand descriptor is the canonical artifact.** BrandSpec's shape plus DTCG tokens plus an AdCP `brand.json` envelope covers inputs, system, and agent-facing identity respectively.
4. **Industry/style templates beat freeform prompts.** LOGORA, Looka, Hatchful all converge on this. A 12-style × 8-industry grid prunes the space better than any text prompt.
5. **Model is a proposer, not a closer.** Academic LogoGAN/Flux-LoRA results all say the same thing: great at variations, bad at "the one." Build a critique + variant-selection loop, not a one-shot.
6. **Standards to emit (table stakes):** AdCP `brand.json` (well-known URI), DTCG tokens JSON, Schema.org `Organization` with `logo` ImageObject, plus Figma-importable SVG + Style Dictionary output. Skip Spectrum/Frontify until there's a customer.

---

## Source list

- <https://github.com/Nutlope/logocreator>
- <https://github.com/mcpware/logoloom>
- <https://github.com/eurekabot123/LOGORA-Logo-Toolkit>
- <https://github.com/Forge-Space/branding-mcp>
- <https://github.com/iamdanwi/brand-forge>
- <https://github.com/brandspec/brandspec>
- <https://github.com/amadad/brandOS>
- <https://github.com/fabriziosalmi/brandkit>
- <https://huggingface.co/Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design>
- <https://huggingface.co/prithivMLmods/Logo-Design-Flux-LoRA>
- <https://glif.app/use-cases/logo-generator>
- <https://arxiv.org/abs/1909.09974> (LoGANv2)
- <https://arxiv.org/abs/1712.04407> (Clustered GAN logo synthesis)
- <https://data.vision.ee.ethz.ch/sagea/lld/> (LLD dataset)
- <https://github.com/yizhiwang96/deepvecfont> + <https://arxiv.org/abs/2303.14585> (DeepVecFont-v2)
- <https://www.patrik-huebner.com/generative-design/generative-logo-synthesizer/>
- <https://docs.adcontextprotocol.org/docs/brand-protocol/brand-json>
- <https://www.designtokens.org/> + <https://www.w3.org/community/design-tokens/>
- <https://help.penpot.app/user-guide/design-systems/design-tokens/>
- <https://opensource.adobe.com/spectrum-design-data/spec/>
- <https://schema.org/Organization>, <https://schema.org/logo>
- <https://github.com/coryetzkorn/figma-logo-layout>, <https://github.com/realvjy/uilogos-figma>, <https://github.com/kevinwuhoo/vector-logos-figma-plugin>
