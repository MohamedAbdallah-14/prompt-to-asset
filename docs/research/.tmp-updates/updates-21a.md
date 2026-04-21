# Partial update log — files 01–11 (21a scope)
# Audit date: 2026-04-21

## Summary
Reviewed 11 files in `docs/research/21-oss-deep-dive/`. Most content was accurate
(written 2026-04-19, just two days before this audit). Key corrections are below.

---

## 01-logo-brand-loras.md

**Change 1 — FLUX.1 [dev] license section (license landscape)**
- Added dated note: BFL now has a self-serve commercial license portal at `bfl.ai/licensing`
  ($999/month base, 100k images/month, $0.01/image above).
- The prior claim that "serving to paying end users is prohibited" is now incomplete
  (it omits the self-serve commercial license path).

**Change 2 — Integration recommendations (bottom)**
- Added dated note explaining BFL self-serve commercial license economics vs
  fal/Replicate per-image pricing (viable above ~30k images/month).

---

## 02-vector-svg-diffusion-oss.md

**Change 1 — vtracer star count**
- Updated 5.7k★ → 5.8k★ (as of 2026-04) to reflect current count from search.

---

## 03-prompt-rewriter-training.md

**Change 1 — TRL v1.0 release date**
- File said "shipped early 2026"; confirmed actual release date is April 12, 2026.
- Added dated note: GRPOTrainer is now stable API (not experimental) in v1.0.
  ORPO/KTO moved to experimental. CLI and config system formalized.

---

## 04-native-rgba-generation.md

**Change 1 — ComfyUI-layerdiffuse maintenance status**
- Updated star count (1,769 → ~1,800) and last-update date (February 2025 → December 2024).
- Clarified project is in maintenance mode: no new Flux integration in 2025 or early 2026;
  Flux support remains an unresolved open issue.

**Change 2 — OpenAI model family (gpt-image-1.5 section)**
- Added `gpt-image-1-mini` (released October 2025, 80% cheaper than gpt-image-1).
- Added dated note: DALL-E 2 and DALL-E 3 deprecated (shutdown May 12, 2026).
  Current family: gpt-image-1.5 (flagship), gpt-image-1 (stable), gpt-image-1-mini (budget).
  gpt-image-2 reportedly nearing release as of April 2026.
- Added note on batch API pricing (50% discount across all tiers).
- Added gpt-image-1-mini to fallback chain.

**Change 3 — Ideogram 3.0 transparency mechanism**
- Corrected: CLAUDE.md and the original file incorrectly described Ideogram 3.0 as using
  `style: "transparent"`. The actual mechanism is a dedicated `/generate-transparent-v3`
  endpoint, not a `style_type` parameter value. Clarified that the endpoint supports
  style presets like FLAT_VECTOR, MINIMAL_ILLUSTRATION, ICONIC.
- Corrected fallback chain entry to reference the endpoint, not a style parameter.

---

## 05-text-in-image-oss.md

**Change 1 — Glyph-ByT5-v2 weights status**
- Added clarification: weights still unavailable from official sources as of April 2026.
  Microsoft RAI review has not resulted in a public re-release. Issue tracker shows
  ongoing user inquiries with no resolution. Project remains blocked for practical adoption.

**Change 2 — Qwen-Image-2512 release confirmation**
- Added dated note: weights released December 31, 2025. Available on HF and ModelScope.
  Also accessible as `qwen-image-max` via Alibaba Cloud ($0.075/image).
  Lightning-quantized variant and community LoRAs confirm active adoption.

---

## 06-t2i-eval-harnesses.md

**Change 1 — DeepEval star count**
- Added "(as of 2026-04)" date qualifier and "actively maintained" note to the 14k★ claim.
  Search confirmed ~14k stars currently. No numeric correction needed.

---

## 07-brand-dna-extractors.md

**Change 1 — OpenBrand star count**
- Updated 673★ → ~633★ (as of 2026-04) based on search.
- Updated npm weekly downloads: 2.8k → ~8.9k (MCP server adoption driving growth).

---

## 08-mcp-registries.md

**Change 1 — Smithery server count**
- Updated table note: registry now lists 7,000+ servers (up from ~6k referenced in
  the table's "Popular one-click install marketplace" description).

---

## 09-cross-ide-installers.md

**Change 1 — Smithery CLI server count**
- Updated "~6k servers in the registry" to "7k+ servers in the registry (as of 2026-04)".

---

## 10-oss-appicon-replacements.md

**Change 1 — itgalaxy/favicons version and star count**
- Updated 1,234★ → ~1,231★ (as of 2026-04); minor delta but removes the falsely precise figure.
- Added: current version v7.1.3 (April 2026); actively maintained.

---

## 11-oss-favicon-generators.md

This file appears to have been partially updated by a prior session (the file
had already received some `> **Updated 2026-04-21:**` blocks). Corrections made:

**Change 1 — RFG core star count claim**
- Corrected an erroneous "~4,986 GitHub stars" claim (this was an npm download count,
  not GitHub stars). Replaced with a note that the exact star count is unconfirmed
  and should be verified directly on GitHub. Latest confirmed release: v0.8.0 (April 2026).

**Change 2 — itgalaxy/favicons star count and weekly downloads**
- Updated 1,234★ → ~1,231★ (as of 2026-04).
- Updated ~331k weekly downloads → ~131k–220k/week (npm stats vary by tracking window;
  the 331k figure appears to be outdated or sourced from a period of higher traffic).
- Updated version reference to v7.1.3 (April 2026) for consistency with file 10.

**Change 3 — Cross-cutting observations note about RFG being "not discovered"**
- Updated observation #1 to remove the stale "hasn't been discovered" framing;
  replaced with a note that current traction should be verified.

---

## Files with no edits needed
- `06-t2i-eval-harnesses.md` — Only the DeepEval star count qualifier was added;
  no substantive factual errors found.
- `07-brand-dna-extractors.md` — Only OpenBrand star/download update.

## Files explicitly out of scope (not edited)
- `SYNTHESIS.md` — deferred to second agent (21b)
- `index.md` — deferred to second agent (21b)
- Files 12–20 — deferred to second agent (21b)
