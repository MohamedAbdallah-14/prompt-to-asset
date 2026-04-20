---
category: 29-rag-brand-knowledge
angle: 29e
title: "Brand Consistency Across Sessions — Persistent Memory, Auto-Completion, and Machine-Readable Formats"
date: 2026-04-20
tags:
  - brand-consistency
  - persistent-memory
  - mcp
  - brand-md
  - design-md
  - cross-session
  - brand-bundle
  - auto-completion
  - rag
status: research
---

# Brand Consistency Across Sessions

## The core problem

An MCP server that generates assets in session A has no memory of those assets in session B. If the user runs `asset_generate_logo` today and `asset_generate_app_icon` next week, the server starts from zero. The results share nothing — different palette interpretation, different style choices, different aspect ratios. This is the primary consistency failure mode for production asset generation.

Three mechanisms address this: (1) a persistent brand bundle written after every approved generation, (2) machine-readable brand format files that AI tools can read directly, and (3) auto-completion of partial bundles from prior session outputs.

---

## Mechanism 1 — Persistent brand bundle with content addressing

The `BrandBundle` should be written to disk (or git) after each approved generation and loaded at the start of each session. The bundle's `token_id = sha256(canonical_json)` makes it content-addressed: the server can detect whether the bundle has changed since the last generation and invalidate the relevant cache entries.

The generation cache key from 29c (`H(brand_token_id ‖ slot ‖ concept ‖ seed ‖ model_sha ‖ template_version)`) gives the session resumption guarantee: the same concept with the same bundle produces the same output deterministically, assuming the model version is pinned.

**What the server must write after each approved generation:**

```json
{
  "provenance": {
    "approved_generations": [
      {
        "slot": "logo",
        "path": "output/acme-logo-master.png",
        "sha256": "a1b2...",
        "model": "gpt-image-1",
        "model_sha": "2025-11-01",
        "seed": 8675309,
        "prompt_hash": "c3d4...",
        "approved_at": "2026-04-20T10:00:00Z"
      }
    ]
  }
}
```

In subsequent sessions, the server loads this provenance block and treats the approved logo PNG as the canonical style reference for all derived assets. The logo's CLIP embedding is stored in the vector table alongside the bundle, so "find the most on-brand icon" queries the logo embedding as the anchor.

---

## Mechanism 2 — Machine-readable brand format files

### brand.md ([thebrand.md](https://thebrand.md))

`brand.md` is an emerging open standard (MIT, ~4 GitHub stars as of April 2026, created by Caio Pizzol) for brand identity files. Like `AGENTS.md` for coding agents, it gives AI tools structured brand context without requiring repeated prompt injection.

Structure: a markdown file with YAML frontmatter. Three layers:
- **Strategy** — positioning, audience, personality, promise, guardrails
- **Voice** — taglines, message pillars, tonal rules, social bios
- **Visual** — colors, typography, photography direction, design style

The file lives in the project root. Any AI tool reads it at session start. The Claude Code plugin installs via `/install-plugin thebrandmd/brand.md`.

**Applicability to prompt-to-asset:** `brand.md` covers strategy, voice, and visual register well — exactly the fields that populate `$extensions.ai.generation.style_prose` and `voice.visual_register`. It does not cover generative-AI-specific fields: `model_bindings`, `loras`, `ip_adapter`, `style_references` (image URIs), or `validation` thresholds. Use `brand.md` as the human-readable companion to `brand-bundle.json`, auto-generated from the bundle's prose fields.

### DESIGN.md / awesome-design-md

**VoltAgent/awesome-design-md** ([github.com/VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)) is a collection of `DESIGN.md` files inspired by popular brand design systems — a more code-focused variant of `brand.md`. Drop one into a project and coding agents generate matching UI. More relevant to code generation than asset generation, but the pattern of project-root brand context files is the same.

---

## Mechanism 3 — Auto-completing partial brand bundles

Most users will not have a complete `BrandBundle`. They will have: a logo PNG, a website URL, or a rough description. The server must auto-complete the rest.

### Auto-completion pipeline

```
User provides: logo PNG + "dark minimal SaaS brand, primary #1A1A2E"
        │
        ├─ Extract palette from logo PNG (K-means, k=5, LAB space)
        │       → candidates: #1A1A2E (primary), #E94560 (accent), #FAFAFA (bg)
        │
        ├─ Semantic role assignment:
        │       most saturated → accent, darkest → ink, lightest → paper
        │
        ├─ CLIP embed the logo → query style_refs table for nearest brands
        │       → top-3 similar bundles → borrow style_prose from closest match
        │
        ├─ LLM prompt: "Given this brand palette and logo, write a 60-token style prose..."
        │
        └─ Produce draft BrandBundle → human approval → write to disk
```

The palette extraction step uses scikit-image or `colorthief`: `ColorThief(image).get_palette(color_count=5, quality=1)` returns dominant colors. Run ΔE2000 deduplication to merge near-identical swatches before semantic role assignment.

### Using past generations to complete the bundle

If the user has previously generated a logo through the server, the approved generation record carries: model, seed, CLIP embedding, and the prompt that produced it. The server can backfill `style_references` from the approved logo, `model_bindings` from the model used, and derive `style_prose` by prompting the LLM with the successful prompt as context: "Describe the visual style of an image generated with this prompt in 60 words."

---

## MCP persistent memory patterns

The Model Context Protocol enables persistent memory by exposing the brand bundle as a resource the agent reads at session start. The cleanest pattern:

```
MCP resource: brand://acme-notes/latest
  → returns BrandBundle JSON
  → agent injects relevant fields into system prompt or first user turn

MCP tool: enhance_prompt(brand_id, user_prompt, kind, target_model)
  → server-side pulls bundle, applies model_bindings, returns compiled prompt
  → agent never re-summarizes the bundle, just calls the tool
```

The Milvus and LanceDB MCP servers (from 29c) expose `milvus-vector-search` and equivalent LanceDB queries as MCP tools, enabling the agent to call `find_similar_brands(query_image)` without knowing the embedding space. The agent receives the result as a brand_id and uses that to call `get_bundle`.

---

## Style drift detection across sessions

Store the CLIP embedding of every approved generation in the vector table, tagged with `brand_id`, `slot`, `approved_at`, and `bundle_version`. A "drift check" tool queries the last 20 approved assets per brand and computes pairwise CSD cosine similarity. If the mean drops below 0.70, flag it: the brand's visual identity is drifting across generations.

This is the multi-session equivalent of the per-asset CSD check in category 15. Run it weekly or on every 10th approved generation.

---

## brand.md vs. brand-bundle.json

| Capability | brand.md | brand-bundle.json |
|---|---|---|
| Human-readable | Yes | Partially |
| Strategy + voice | Yes | Via `$extensions.ai.generation.voice` |
| Palette hexes | Yes (textual) | Yes (structured, validated) |
| Model bindings | No | Yes |
| Style references (image URIs) | No | Yes |
| LoRA handles | No | Yes |
| Validation thresholds | No | Yes |
| DTCG compatible | No | Yes |

The two formats are complementary: ship `brand.md` as the project-level context file for AI coding agents, `brand-bundle.json` as the asset-generation-specific structured artifact. Auto-generate `brand.md` Visual and Voice sections from the bundle fields using a template.

---

## References

- brand.md spec — [thebrand.md](https://thebrand.md/)
- thebrandmd GitHub org — [github.com/thebrandmd](https://github.com/thebrandmd)
- VoltAgent/awesome-design-md — [github.com/VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- Persistent memory for AI agents (Medium) — [medium.com/@sourabh.node/persistent-memory-for-ai-coding-agents](https://medium.com/@sourabh.node/persistent-memory-for-ai-coding-agents-an-engineering-blueprint-for-cross-session-continuity-999136960877)
- MCP + Milvus — [milvus.io/docs/milvus_and_mcp.md](https://milvus.io/docs/milvus_and_mcp.md)
- MCP Architecture — [modelcontextprotocol.io/docs/learn/architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- Somepalli et al., CSD, arXiv:2404.01292 — [arxiv.org/abs/2404.01292](https://arxiv.org/abs/2404.01292)
- Carbon MCP (IBM, Feb 2026) — [github.com/carbon-design-system/carbon-mcp](https://github.com/carbon-design-system/carbon-mcp)
- Atlassian llms-tokens.txt — [atlassian.design/llms-tokens.txt](https://atlassian.design/llms-tokens.txt)
