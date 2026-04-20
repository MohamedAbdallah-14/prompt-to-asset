---
category: 15-style-consistency-brand
angle: 15d
title: "Encoding a Brand/Design System into a Machine-Usable Bundle for Prompt Enhancement"
author: research-subagent-15d
date: 2026-04-19
tags:
  - design-tokens
  - brand-bundle
  - prompt-enhancement
  - dtcg
  - style-dictionary
  - figma-variables
  - mcp
  - lora
  - ip-adapter
status: draft
word_count_target: 2500-4000
---

# Encoding a Brand/Design System into a Machine-Usable Bundle for Prompt Enhancement

## Executive Summary

The failure mode the prompt-to-asset most needs to eliminate in Category 15 is **style drift** — each generation looks plausible in isolation but the set does not read as a single brand. Human design systems solved an analogous problem with **design tokens** (Figma Variables, the W3C Design Tokens Community Group (DTCG) format, Style Dictionary, `@atlaskit/tokens`, `@shopify/polaris-tokens`, `@primer/primitives`), and the same discipline now needs to be extended to AI asset generation. A **machine-usable brand bundle** is the missing primitive: a single versioned artifact that combines (1) structured tokens a computer can read (palette, typography, spacing), (2) semantic roles (what `color.brand.primary` *means*, not just its hex), (3) prose descriptors for generative models (voice, visual register, prohibited elements), (4) binary style anchors (logo PNGs, style-reference images, optional LoRA/IP-Adapter weights), and (5) an injection protocol the prompt-to-asset uses on every call.

The research below surveys the standards that already exist (DTCG 2025.10, style-dictionary.json, Tokens Studio, Figma Variables REST API), the design-system vendors now exposing machine-readable tokens specifically for AI agents (IBM Carbon MCP, Atlassian's `llms-tokens.txt`, Shopify Polaris tokens, GitHub Primer Primitives), and the generative-side primitives a bundle must bind to (Midjourney `--sref` codes, Flux/SDXL LoRAs, IP-Adapter reference images). It then proposes a concrete `brand-bundle.json` schema, a prefix/suffix prompt-injection strategy, and an MCP server surface (`get_palette`, `get_style_refs`, `enhance_prompt`) that coding agents can call on every generation.

**Three key findings:**

1. **DTCG-compatible tokens are a solved problem for colors/typography/spacing, but no standard extends them to generative AI.** Palette, typography, and spacing now ship as DTCG JSON (`@primer/primitives`, `@shopify/polaris-tokens`, `@atlaskit/tokens`), but none of these packages carry the fields a T2I model needs: style-reference URLs, negative-prompt banks, LoRA trigger phrases, voice descriptors, or aspect-ratio/output constraints. A brand bundle for AI generation must **extend DTCG**, not replace it, by adding a namespaced `$extensions.ai.generation` group.
2. **IBM Carbon MCP and Atlassian's `llms-tokens.txt` are the first real precedents for "brand bundles as MCP" — and both stop short of generative assets.** Carbon MCP (Feb 2026) exposes Carbon components, tokens, icons, and charts to AI agents for *code* generation; Atlassian publishes a plain-text `llms-tokens.txt` explicitly instructing LLMs "you must ONLY use tokens listed in this document." Neither system exposes logo PNGs, `--sref` codes, LoRA weights, or a `generate_asset` tool. The design pattern is validated; the asset-generation layer is green-field.
3. **Prompt injection must be layered, not concatenated.** Naive prefix/suffix stuffing ("A logo for X. Use brand colors #FF6A00 and #0B1220. Negative prompt: watermark, text.") burns context and is regularly ignored by diffusion models that weight later tokens more heavily. The emerging practice is a **three-layer injection**: (a) natural-language style prose in the prompt body, (b) structured parameters via model-specific flags (`--sref`, `--cref`, IP-Adapter image, LoRA `<lora:brand_v3:0.8>`), and (c) post-hoc validation (palette extraction, CLIP score against brand anchors) with an enhancer-level retry loop. The bundle must carry all three layers as separable fields so the enhancer can route each to the right channel per model.

---

## Schema Proposal — `brand-bundle.json`

The proposed schema is DTCG-compatible (so existing token tooling like Style Dictionary, Tokens Studio, and Figma Variables Import works unchanged) and places all AI-generation extensions under `$extensions.ai.generation` per DTCG §9 (vendor extensions).

### Top-level structure

```json
{
  "$schema": "https://prompt-to-asset.dev/schemas/brand-bundle/v1.json",
  "$version": "1.0.0",
  "$metadata": {
    "brand": "Acme Notes",
    "brand_id": "acme-notes",
    "version": "2026.04.19",
    "created": "2026-04-19T10:00:00Z",
    "license": "proprietary",
    "source": {
      "figma_file": "https://figma.com/file/abc123/Acme-Notes-DS",
      "git": "git@github.com:acme/brand-bundle.git",
      "commit": "a1b2c3d"
    }
  },

  "color": {
    "brand": {
      "primary":   { "$type": "color", "$value": "#FF6A00",
                     "$description": "Primary action, CTAs, logomark accent" },
      "secondary": { "$type": "color", "$value": "#0B1220" },
      "accent":    { "$type": "color", "$value": "#7C3AED" }
    },
    "neutral": {
      "ink":    { "$type": "color", "$value": "#0B1220" },
      "paper":  { "$type": "color", "$value": "#FAFAF7" },
      "muted":  { "$type": "color", "$value": "#8A8A8A" }
    },
    "semantic": {
      "success": { "$type": "color", "$value": "#10B981" },
      "warning": { "$type": "color", "$value": "#F59E0B" },
      "danger":  { "$type": "color", "$value": "#EF4444" }
    }
  },

  "typography": {
    "display": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Söhne",
        "fontWeight": 700,
        "letterSpacing": "-0.02em"
      },
      "$extensions": {
        "ai.generation": {
          "fallback_description": "geometric sans-serif, slightly condensed, crisp bold weight reminiscent of Söhne or Neue Haas Grotesk",
          "google_fonts_substitute": "Inter",
          "avoid": ["serif", "handwritten", "pixel", "display swash"]
        }
      }
    },
    "body": { "$type": "typography", "$value": {
      "fontFamily": "Inter", "fontWeight": 400 } }
  },

  "$extensions": {
    "ai.generation": {
      "voice": {
        "visual_register": ["modern", "editorial", "quiet confidence", "high-contrast"],
        "mood": ["calm", "focused", "premium"],
        "avoid_register": ["playful cartoon", "corporate memphis",
                            "gradient mesh 3D", "Y2K", "AI-slop glossy"]
      },
      "style_prose": "Minimal editorial illustration with flat geometric shapes, 2px strokes, limited palette, generous negative space, subtle offset-overlap instead of drop shadows. Soft paper background (#FAFAF7), ink (#0B1220) and a single accent of brand orange (#FF6A00).",
      "style_references": [
        { "role": "primary_style_ref",
          "uri": "s3://acme-brand/style/hero-01.png",
          "midjourney_sref": "3827461029",
          "weight": 0.8 },
        { "role": "logo_ref",
          "uri": "s3://acme-brand/logo/mark-transparent.png",
          "usage": "never_regenerate",
          "placement": "composite_post_generation" }
      ],
      "loras": [
        { "name": "acme_brand_v3",
          "base": "flux.1-dev",
          "uri": "s3://acme-brand/loras/acme_v3.safetensors",
          "trigger": "acmebrand illustration style",
          "recommended_weight": 0.75 }
      ],
      "ip_adapter": {
        "enabled": true,
        "reference_image": "s3://acme-brand/style/hero-01.png",
        "weight": 0.6,
        "model": "ip-adapter-plus_sdxl"
      },
      "negative_prompt": [
        "watermark", "signature", "blurry", "lowres", "extra fingers",
        "gradient mesh 3D", "glossy plastic render", "AI-typical bokeh",
        "corporate memphis", "checkered transparency", "fake alpha",
        "serif text", "comic sans"
      ],
      "prohibited_elements": {
        "visual":  ["competitor logos", "photorealistic human faces",
                     "stock-photo aesthetics", "drop shadows > 4px"],
        "semantic": ["violence", "politics", "religion", "brand_primary on brand_primary"]
      },
      "output_constraints": {
        "aspect_ratios": ["1:1", "16:9", "3:2"],
        "min_resolution": "1024x1024",
        "prefer_transparent_bg_for": ["logo", "app_icon", "favicon"],
        "color_profile": "sRGB"
      },
      "prompt_templates": {
        "logo": {
          "prefix": "A flat vector logo mark for {subject}, ",
          "suffix": ", centered on transparent background, using brand palette {color.brand.primary} and {color.neutral.ink}, minimal geometric construction, 2px stroke weight, negative space composition, {voice.visual_register}",
          "negative_suffix": "{negative_prompt}"
        },
        "illustration": {
          "prefix": "Editorial spot illustration of {subject}, ",
          "suffix": ", in Acme Notes house style: {style_prose}"
        },
        "og_image": {
          "prefix": "A 1200x630 social share image for {subject}, ",
          "suffix": ", {voice.visual_register}, prominent {typography.display.$value.fontFamily}-style heading reading '{headline}', {color.neutral.paper} background with {color.brand.primary} accent bar"
        }
      },
      "model_bindings": {
        "gemini-2.5-flash-image": {
          "use_prose_only": true,
          "inject": ["style_prose", "palette_hexes", "negative_prompt_as_avoid"]
        },
        "gpt-image-1": {
          "use_prose_only": true,
          "inject": ["style_prose", "palette_hexes", "prohibited_elements.visual"]
        },
        "flux.1-dev": {
          "use_prose": true,
          "use_lora": "acme_brand_v3",
          "use_ip_adapter": true,
          "inject_negative": true
        },
        "midjourney-v7": {
          "use_prose": true,
          "sref": "3827461029",
          "sw": 300,
          "ar": "from_output_constraints"
        },
        "ideogram-v3": {
          "use_prose": true,
          "inject": ["style_prose", "negative_prompt_as_avoid"]
        }
      },
      "validation": {
        "palette_check": { "tolerance_delta_e": 6.0, "min_coverage_pct": 40 },
        "clip_similarity_against_refs": { "min": 0.62 },
        "forbidden_terms_in_output_text": ["lorem ipsum"]
      }
    }
  }
}
```

### Schema notes

- **DTCG-compatibility:** `color.*`, `typography.*`, and any future `spacing`/`radius`/`shadow` groups are pure DTCG 2025.10 and can round-trip through Style Dictionary v4 + `@tokens-studio/sd-transforms` v2 without loss.
- **Extension namespace:** Everything novel lives under `$extensions.ai.generation`, which is the DTCG-blessed pattern for vendor extensions (§9 of the 2025.10 spec). Tokens-consuming build pipelines will ignore it cleanly; the prompt-to-asset consumes it explicitly.
- **Resolved values vs. aliases:** Palette hexes are stored as resolved values, because generative models want strings, not references. For human tools, the bundle can ship a second file `brand-bundle.aliased.json` that keeps `{color.brand.primary}` aliases and resolves via Style Dictionary at build time.
- **Binary artifacts** (style refs, logos, LoRAs) are referenced by URI so the JSON remains diffable and the blobs can live in S3 / LFS / a component library.

---

## Existing Standards Survey

### W3C Design Tokens Community Group (DTCG) — 2025.10

The DTCG Format Module [2025.10](https://www.designtokens.org/tr/2025.10/format) became the first stable version (v1) of the format on October 28, 2025, published as a Final Community Group Report ([W3C archive](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)). Key primitives:

- Tokens are JSON with `$type`, `$value`, `$description`, and `$extensions`.
- Token types: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, plus composite types `typography`, `shadow`, `gradient`, `transition`, `border`.
- Aliases use `{group.token.name}` curly-brace syntax.
- Formal JSON Schema support was in-flight as of late 2025 ([community group log, Dec 2025](https://lists.w3.org/Archives/Public/public-design-tokens-log/2025Dec/0011.html)).

Adopters include Adobe, Figma, Framer, plus most major design systems. **DTCG is the correct base layer** for the brand bundle — re-using it means the bundle composes with every existing tokens tool.

### Style Dictionary + Tokens Studio

[Style Dictionary v4](https://styledictionary.com/) is the de-facto transform pipeline (token JSON → CSS custom properties, Swift, Kotlin, Tailwind config, iOS Color Assets, etc.). [`@tokens-studio/sd-transforms`](https://github.com/tokens-studio/sd-transforms) v2.0.3 (December 2025) adds the extra transforms Figma-origin tokens need (math resolution, description-to-comment, hex→rgba, shadow flattening, typography compose shorthand for Android). [Tokens Studio for Figma](https://docs.tokens.studio/) is the dominant authoring tool on the Figma side and exports both DTCG and legacy Tokens Studio JSON.

Implication for the brand bundle: the prompt-to-asset can be shipped with a Style Dictionary preset that emits `brand-bundle.resolved.json` from whatever the team actually authors in Figma, so no new authoring tool is needed.

### Figma Variables REST API

Figma's Variables REST API ([developer docs](https://developers.figma.com/docs/rest-api/variables-endpoints/)) exposes three endpoints on Enterprise plans with the `file_variables:read` scope:

- `GET /v1/files/:file_key/variables/local`
- `GET /v1/files/:file_key/variables/published`
- `POST /v1/files/:file_key/variables` (bulk create/update/delete)

The API returns variables with `valuesByMode` so light/dark/brand modes survive export. Community tooling like [`@serendie/figma-utils`](https://github.com/serendie/figma-utils) and [`@figma-vars/hooks`](https://github.com/marklearst/figma-vars-hooks) converts the Figma shape into W3C DTCG JSON out-of-the-box. For teams without Enterprise, the manual "Variables panel → three-dot menu → Export as JSON" workflow produces equivalent data ([Designilo walkthrough, July 2025](https://designilo.com/2025/07/19/how-to-export-figma-variables/)).

### Vendor design systems now shipping machine-readable tokens

- **IBM Carbon** — tokens live in [`@carbon/colors`](https://github.com/carbon-design-system/carbon/blob/main/docs/guides/colors.md) and `@carbon/themes` as JavaScript files, with semantic roles like `$layer`, `$border-subtle`, `$support-error`. Carbon now ships [**Carbon MCP**](https://github.com/carbon-design-system/carbon-mcp) ([launch post, Feb 2026](https://medium.com/carbondesign/bringing-ibm-carbon-design-system-knowledge-into-ai-workflows-with-carbon-mcp-62c58162d160)) exposing components, icons, pictograms, charts, and Carbon-for-IBM-Products to AI agents — the first major-vendor precedent for brand-bundle-as-MCP.
- **GitHub Primer** — [`@primer/primitives`](https://github.com/primer/primitives) ships DTCG-shaped JSON compiled through Style Dictionary; Figma variables cover color + size, with typography/shadow still as Figma styles pending variable-type support ([Primer getting-started guide](https://primer.github.io/design/guides/figma/getting-started/)).
- **Shopify Polaris** — [`@shopify/polaris-tokens`](https://www.npmjs.com/package/@shopify/polaris-tokens) v9.x ships `json/*.json` files with metadata (description + value) alongside the JS surface; 157K weekly npm downloads, making it the most-consumed tokens package in the wild.
- **Atlassian** — publishes [`atlassian.design/llms-tokens.txt`](https://atlassian.design/llms-tokens.txt), a plain-text, AI-addressed document that literally begins: *"You must ONLY use tokens listed in this document, do not make up values."* This is the **closest existing analog** to the proposed brand bundle — and proves the pattern works in production.

None of these, however, bind their tokens to generative image assets. They stop at tokens for *code* generation.

### Generative-side primitives the bundle must wrap

- **Midjourney `--sref`** — captures palette, texture, composition, lighting of a reference image without copying content ([official docs](https://docs.midjourney.com/docs/style-reference)). Style weight via `--sw 0–1000` (default 100). Multiple refs compose: `--sref URL1 URL2 URL3`. Teams already accumulate `--sref` codes without governance, leading to drift ([Numonic write-up, 2026](https://numonic.ai/blog/midjourney-brand-consistency-guide)) — exactly the problem a bundle solves.
- **IP-Adapter** ([arXiv 2308.06721](https://arxiv.org/abs/2308.06721), cubiq's [ComfyUI implementation](https://github.com/cubiq/ComfyUI_IPAdapter_plus)) — ~100 MB decoupled cross-attention adapter, often called a "one-image LoRA." Plus variants (`ip-adapter-plus_sdxl`, `ip-adapter-plus-face_sdxl`) give stronger conditioning; pairs with CLIP Vision encoder.
- **LoRA on Flux/SDXL** — 25–200 images, consistent trigger phrase (e.g., `acmebrand illustration style`), Style Dictionary-like pipelines on [fal.ai](https://blog.fal.ai/training-flux-2-loras) / [AI Toolkit](https://blog.segmind.com/training-flux-lora-ai-toolkit/). For a brand, 100–200 curated assets + a distinctive trigger token is the current sweet spot.

---

## Prompt-Injection Strategy

The enhancer must transform a user request like *"a transparent logo for my note-taking app"* into **three output channels** per generation call, driven by `model_bindings.<model>` in the bundle:

### Layer 1 — Prose injection (all models)

A single natural-language paragraph is assembled from `style_prose` + the resolved `prompt_templates.<asset_kind>` with variables interpolated. Example for a logo on Gemini Imagen:

> A flat vector logo mark for a note-taking app called "Acme Notes," centered on a transparent background, using brand palette #FF6A00 and #0B1220, minimal geometric construction with 2px stroke weight, generous negative space, modern editorial, quiet confidence, high-contrast. Avoid: watermark, gradient mesh 3D, glossy plastic render, corporate memphis, checkered transparency patterns, serif text.

Key rules:

- **Front-load the subject**, not the brand metadata. Diffusion attention is front-weighted; generic brand prose before the subject dilutes composition.
- **Hexes inline**, not as tokens. T2I models do not resolve `{color.brand.primary}`.
- **"Avoid:" clause instead of `--no`** for models that don't support negative prompts (Gemini, GPT-Image-1, Ideogram older than v3).
- **Cap at ~70 tokens of style prose.** Beyond that, composition degrades on Gemini/GPT-Image.

### Layer 2 — Structured parameter injection (model-specific)

Driven by `model_bindings`:

- Midjourney: append `--sref 3827461029 --sw 300 --ar 1:1 --no text,watermark`.
- Flux (ComfyUI / diffusers): LoRA node `<lora:acme_brand_v3:0.75>`, IP-Adapter node with `reference_image` at weight 0.6, negative prompt into the unconditional branch.
- SDXL: same pattern as Flux.
- GPT-Image-1 / Gemini: no structured channel — fold Layer-2 content back into Layer-1 prose.

### Layer 3 — Post-generation validation + retry

The enhancer runs a cheap validator on the returned image:

- **Palette coverage check** — extract dominant colors via k-means, measure ΔE76 or ΔE2000 against `color.brand.*`; fail if coverage < `validation.palette_check.min_coverage_pct` or closest-brand ΔE > tolerance.
- **CLIP similarity** against `style_references[].uri` — fail if below `validation.clip_similarity_against_refs.min`.
- **Prohibited-element check** — OCR + CLIP classifier for `prohibited_elements.visual`.

On failure, the enhancer retries with tightened knobs: higher `--sw`, higher IP-Adapter weight, stronger LoRA weight, or an explicit correction in the prose ("previous attempt used too much blue; constrain palette strictly to #FF6A00 and #0B1220 on #FAFAF7 background").

### Prefix vs. suffix choice

For **logos and icons**, brand prose goes in the **suffix** — the subject must lead for composition. For **illustrations and OG images**, brand prose goes in the **prefix** ("In the Acme Notes house style of flat editorial illustration, show …") because the scene can subordinate to the register. The bundle encodes this per-asset via `prompt_templates.<asset_kind>.prefix` / `.suffix`.

---

## MCP / Tool Exposure Design

The bundle is most powerful when an agent (Claude, Codex, Gemini CLI) can fetch live fields instead of receiving a 200 kB JSON in-context on every turn. This calls for an **MCP server** analogous to Carbon MCP but specialized for asset generation.

### Server identity

`prompt-to-asset-brand-mcp` — one server instance per brand, or a multi-tenant server with `brand_id` required on every call. Bundle source can be local filesystem, git repo, or S3; versions pinned via `brand_id@version`.

### Tool surface

```text
list_brands() -> [{ brand_id, version, name }]

get_bundle(brand_id, version?="latest") -> brand-bundle.json

get_palette(brand_id, role?) -> { role: hex, ... }
  # role in {"brand.primary","neutral.ink","semantic.success",...}

get_typography(brand_id) -> { display, body, mono, fallback_description }

get_style_refs(brand_id, kind?) -> [{ uri, role, midjourney_sref, weight }]
  # kind in {"style","logo","illustration","icon"}

get_negative_prompt(brand_id, kind?) -> string
  # merges global + kind-specific avoid lists

get_prompt_template(brand_id, kind) -> { prefix, suffix, negative_suffix }
  # kind in {"logo","app_icon","illustration","og_image","favicon",...}

enhance_prompt(brand_id, user_prompt, kind, target_model)
  -> { prompt, negative_prompt?, model_params: { sref?, sw?, ar?,
         lora?, ip_adapter?, ... } }
  # server-side applies model_bindings so agents stay model-agnostic

validate_asset(brand_id, image_url_or_base64) ->
  { palette_pass, clip_similarity, prohibited_matches, suggestions }

list_loras(brand_id) -> [{ name, base, trigger, recommended_weight, uri }]
```

### Transport

Standard MCP `stdio` for local agents (Claude Desktop, Cursor, Codex), `sse` or `streamable-http` for the web product. All binary artifacts are returned as signed URLs (not base64) except when the caller explicitly asks for inline bytes.

### Security

- Bundles can be marked `license: proprietary`, in which case the MCP server enforces auth (OAuth + per-`brand_id` scopes).
- `style_references[].usage: "never_regenerate"` (e.g., the logo PNG) means `enhance_prompt` never passes the URL to an image-to-image endpoint — it only returns it as a composite asset the client will overlay post-generation. This prevents model regeneration of the actual mark.

### Versioning & storage

- **Git** for the JSON bundle (Small, diffable, reviewable PRs) + semver on `$metadata.version`.
- **Git LFS or S3** for PNG/SVG style references and the ~100 MB IP-Adapter/LoRA weights, referenced by URI.
- **Component library integration:** publish the resolved bundle as an npm tarball `@acme/brand-bundle` so non-MCP consumers (Node scripts, CI, website generators) can `require('@acme/brand-bundle')` the same source of truth.
- **Cache key:** `brand_id + version + model` — once `enhance_prompt` produces a resolved payload for a given (brand, version, model, kind), subsequent identical calls are free.

### Prior-art for MCP shape

- [`carbon-mcp`](https://github.com/carbon-design-system/carbon-mcp) (IBM, Feb 2026) — components, tokens, icons, charts.
- [`systembridge-mcp`](https://github.com/teyepe/systembridge-mcp) — tokens, component planning, WCAG contrast, screenshot-to-token matching.
- [`dembrandt-mcp`](https://github.com/dembrandt/dembrandt) — extracts design systems from live websites; tools `get_color_palette`, `get_typography`, `get_spacing`, `get_brand_identity`.
- [Brandfetch MCP](https://composio.dev/toolkits/brandfetch/framework/claude-agents-sdk) — logos/colors/fonts by domain, useful as a cold-start source for brands without an authored bundle.

The proposed `prompt-to-asset-brand-mcp` differs from all of these by being the only server whose primary job is feeding **generative** image calls, not code generation.

---

## Implementation Notes & Open Questions

- **Bundle bootstrapping:** For teams without a design system, the enhancer should ship a `derive_bundle_from(url | figma_file | pdf)` flow that runs Brandfetch/dembrandt-style extraction plus a round of human approval (Tokens Studio Configurator is a natural UI for review).
- **LoRA optional:** LoRAs are powerful but expensive to train and only work on open-weights models (Flux, SDXL). The bundle must degrade gracefully: if `loras: []`, the enhancer falls back to style-ref-only binding, which covers every closed model (Gemini, GPT-Image, Midjourney, Ideogram, Recraft).
- **Typography is hardest to honor.** Neither Gemini nor GPT-Image can be reliably forced into a specific font; Ideogram v3 and Recraft get closer. The bundle's `typography.*.$extensions.ai.generation.fallback_description` exists precisely because "Söhne" means nothing to a diffusion model — "geometric sans-serif, slightly condensed, crisp bold" means a lot. For OG images where the headline must be a specific font, the enhancer should render the text in SVG post-hoc over the generated background.
- **Prohibited elements need a classifier, not a prompt.** Asking a T2I model "do not generate competitor logos" is unreliable; validate with CLIP + a small classifier instead and retry.
- **Mode support (light/dark/brand-B):** Figma Variables already express modes via `valuesByMode`. The bundle should mirror this: `$extensions.ai.generation.modes: { dark: { style_prose, palette_overrides } }`. The enhancer picks mode per-asset.
- **Open question — standardization path.** Is there appetite to propose this as a DTCG extension (`$extensions.ai.generation`) or a sibling CG? Atlassian's `llms-tokens.txt` suggests the industry is converging on "machine-readable tokens for AI"; a shared spec would prevent every prompt-to-asset vendor from inventing its own.

---

## References

**Standards & tooling**

- W3C Design Tokens Community Group, *Design Tokens Format Module 2025.10* — https://www.designtokens.org/tr/2025.10/format ; Final CG Report — https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/
- Style Dictionary v4 — https://styledictionary.com/
- `@tokens-studio/sd-transforms` v2.0.3 (Dec 2025) — https://www.npmjs.com/package/@tokens-studio/sd-transforms ; https://github.com/tokens-studio/sd-transforms
- Tokens Studio for Figma — https://docs.tokens.studio/transform-tokens/style-dictionary ; https://docs.tokens.studio/figma/export/options
- Figma Variables REST API — https://developers.figma.com/docs/rest-api/variables-endpoints/
- `@serendie/figma-utils` — https://github.com/serendie/figma-utils
- Designilo, *How to Export Figma Variables* (July 2025) — https://designilo.com/2025/07/19/how-to-export-figma-variables/

**Vendor design systems**

- IBM Carbon — https://carbondesignsystem.com/ ; Carbon MCP — https://github.com/carbon-design-system/carbon-mcp ; launch post (Feb 2026) — https://medium.com/carbondesign/bringing-ibm-carbon-design-system-knowledge-into-ai-workflows-with-carbon-mcp-62c58162d160
- GitHub Primer Primitives — https://github.com/primer/primitives ; Figma guide — https://primer.github.io/design/guides/figma/getting-started/
- Shopify Polaris tokens — https://github.com/Shopify/polaris-tokens ; npm — https://www.npmjs.com/package/@shopify/polaris-tokens
- Atlassian Design tokens — https://atlassian.design/tokens/design-tokens ; LLM-addressed tokens — https://atlassian.design/llms-tokens.txt

**Generative primitives**

- Midjourney Style Reference — https://docs.midjourney.com/docs/style-reference ; Numonic governance write-up — https://numonic.ai/blog/midjourney-brand-consistency-guide
- Ye et al., *IP-Adapter: Text Compatible Image Prompt Adapter for T2I Diffusion Models*, arXiv:2308.06721 — https://arxiv.org/abs/2308.06721 ; cubiq/ComfyUI_IPAdapter_plus — https://github.com/cubiq/ComfyUI_IPAdapter_plus
- Flux LoRA training: fal.ai — https://blog.fal.ai/training-flux-2-loras ; Segmind AI Toolkit — https://blog.segmind.com/training-flux-lora-ai-toolkit/ ; Reticulated guide — https://reticulated.net/dailyai/creating-a-flux-dev-lora-full-guide/

**MCP precedents**

- systembridge-mcp — https://github.com/teyepe/systembridge-mcp
- dembrandt-mcp — https://github.com/dembrandt/dembrandt
- Brandfetch MCP (Composio) — https://composio.dev/toolkits/brandfetch/framework/claude-agents-sdk
- *Build your own MCP server for design tokens* — https://learn.thedesignsystem.guide/p/build-your-own-mcp-server-for-design
