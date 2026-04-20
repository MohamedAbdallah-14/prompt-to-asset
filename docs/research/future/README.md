# Research — deferred

Each file here was researched as part of the 104-angle primary-source sweep but is not wired into the current implementation. They sit here rather than in `docs/research/assets/` so readers don't assume there's a code path backing them today.

If you want to implement one of these and push it out of "future" and into the production path, great — open an issue first so we can agree on the scope, then move the file back into `docs/research/assets/` and add a wiring row to `docs/RESEARCH_MAP.md`.

## What's deferred and why

| File | Status | Notes |
|---|---|---|
| `asset-19-stock-photo-apis.md` | Out of scope for v1. | Unsplash / Pexels integration is useful for OG background fill but orthogonal to asset generation. |
| `asset-20-illustration-sets.md` | Out of scope for v1. | Catalog of CC-BY illustration packs (Undraw, Humaaans, etc.). Would belong in a "pick from existing" sibling tool. |
| `asset-21-3d-assets-mockups.md` | Out of scope for v1. | 3D / mockup generation is a separate product. |
| `asset-22-patterns-gradients.md` | Out of scope for v1. | Procedural patterns / mesh gradients; nice-to-have for backgrounds. |
| `asset-28-visual-diff-testing.md` | Deferred to v2 QA. | Regression testing of generated assets. Valuable once a brand has history. |
| `asset-29-perceptual-hashing.md` | Deferred to v2 QA. | pHash for dedup of near-duplicates within a batch. |
| `asset-42-svg-motion-animation-libs.md` | Out of scope for v1. | CSS/SMIL/GSAP is asset-consumption, not generation. |
| `asset-43-lottie-rive-ecosystem.md` | Out of scope for v1. | Motion graphics are a separate asset class. |
| `asset-44-open-audio-sfx.md` | Out of scope — not an image asset. | Ships under a different skill surface if ever built. |
| `asset-45-cc0-pd-aggregators.md` | Out of scope for v1. | Covered by `asset-19` sibling once that lands. |
| `asset-46-image-moderation-oss.md` | Deferred to hosted tier. | NSFW/CSAM moderation matters for hosted SaaS, not zero-key local CLI. |
| `asset-48-mockup-libraries.md` | Out of scope for v1. | Device/paper/billboard mockups are a separate skill. |

## Large reference-only branches

Two whole research categories are reference-only — consulted during design, never meant to be "wired":

- `docs/research/21-oss-deep-dive/` — 20 files surveying open-source imagegen projects. Purpose: pattern library.
- `docs/research/22-repo-deep-dives/` — 20 files reading specific codebases (ComfyUI, Forge, DiffusionBee, etc.). Purpose: prior art.

`RESEARCH_MAP.md` lists both under "reference reading; not directly wired." That's deliberate. Don't expect any `src/**` file to cite these.
