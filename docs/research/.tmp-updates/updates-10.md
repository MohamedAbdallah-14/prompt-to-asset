# Research Update Log — Category 10 (UI Illustrations & Graphics)

**Audited:** 2026-04-21  
**Files audited:** 7 (index.md, SYNTHESIS.md, 10a, 10b, 10c, 10d, 10e)

---

## Summary of changes

### SYNTHESIS.md

| Location | Change |
|---|---|
| Frontmatter `date` | 2026-04-19 → 2026-04-21 |
| Frontmatter `primary_models_referenced` | Added `midjourney-v8-alpha`, `flux-2-pro`, `gpt-image-1.5`, `ideogram-3-turbo`, `recraft-v4`; removed `flux-1-dev-pro-ultra`, `recraft-v2-v3`, `gpt-image-1` (singular) |
| Insight #11 | Updated model routing: `gpt-image-1` → `gpt-image-1.5`; `Recraft v3` → `Recraft V4/V4 Pro SVG`; `Flux 1.1 Pro` → `FLUX.2 Pro`; Ideogram transparency endpoint corrected from `style: "transparent"` to `/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"`. Added note that Recraft V4 has NO `style_id` param (V3 stays for existing brand-style pipelines only). |
| Insight #11 (new block) | Added `> **Updated 2026-04-21:**` block summarising: V4 style_id removal, gpt-image-1.5 streaming support (`stream: true` + `partial_images: 0–3`), Flux TypeError on `negative_prompt`, InstantX IP-Adapter for Flux. |
| Skill 2 renderer defaults | `gpt-image-1` → `gpt-image-1.5`; `Flux 1.1 Pro` → `FLUX.2 Pro`; `Flux Pro + --sref` → `FLUX.2 Pro (native ≤10 refs)`; `Recraft v3` → `Recraft V4 / V4 Pro SVG`; MJ v7 annotated with V8 Alpha caveat. |
| Cross-cutting pattern #1 | Updated IP-Adapter list to include InstantX FLUX.1-dev IP-Adapter for Flux; updated FLUX.2 native multi-ref mention; Recraft V4 `style` object vs. `style_id`; `gpt-image-1` → `gpt-image-1.5`. |
| Cross-cutting pattern #3 | `Flux 1.1 Pro` → `FLUX.2 Pro`; `gpt-image-1` → `gpt-image-1.5`. |
| Cross-cutting pattern #5 | Added updated block: Flux `negative_prompt` raises TypeError — translate to affirmative anchors; SD/SDXL/SD3 are unaffected. |
| Controversy #3 (transparency) | Added Ideogram correct endpoint note + new BiRefNet June 2025 update block (8× speedup for `refine_foreground`, SDPA upgrade, FP16 ~60–80 ms on RTX 4080). |
| Controversy #5 (text-in-illustration) | `gpt-image-1` → `gpt-image-1.5`; `Ideogram 3` → `Ideogram 3 Turbo`. |
| Skill 1 — emit durable anchor | Recraft V3 `style_id` → V4 `style` API object; added InstantX IP-Adapter for Flux; `gpt-image-1` → `gpt-image-1.5`. |
| Primary sources (Commercial AI generation) | Updated to `Recraft V4`, `Midjourney v7/v8 Alpha`, `Ideogram 3 Turbo`, `gpt-image-1.5`, `FLUX.2`. |
| Primary sources (Style-control) | `tencent-ailab/IP-Adapter` annotated as unmaintained since Jan 2024; added `InstantX/FLUX.1-dev-IP-Adapter` as current Flux path. |

---

### 10a — Empty States & Onboarding

| Location | Change |
|---|---|
| §2 IP-Adapter body | Added `> **Updated 2026-04-21:**` block: `tencent-ailab/IP-Adapter` last commit Jan 2024 / unmaintained; ComfyUI IPAdapter Plus maintenance-only since April 2025; for Flux use `InstantX/FLUX.1-dev-IP-Adapter`; FLUX.2 native multi-ref preferred over external adapter. |
| §2 IP-Adapter strengths | Updated "Flux (via XLabs-AI/flux-ip-adapter)" → "Flux, use InstantX FLUX.1-dev IP-Adapter". |
| §2 IP-Adapter recipe | Added note to use `InstantX/FLUX.1-dev-IP-Adapter` for Flux. |
| Prompt-template meta-rule #6 (negative boilerplate) | Added `> **Updated 2026-04-21:**` block: Flux all variants → TypeError on `negative_prompt`; use affirmative anchors for Flux; SD/SDXL/SD3 unaffected. |
| Reference tooling | `tencent-ailab/IP-Adapter` annotated as unmaintained + InstantX link added. |

---

### 10b — Hero Images & Marketing Banners

| Location | Change |
|---|---|
| Frontmatter `primary_models_covered` | Updated list: old Flux 1.x / gpt-image-1 / recraft-v3 → `flux-2-pro`, `gpt-image-1.5`, `midjourney-v8-alpha`, `ideogram-3-turbo`, `recraft-v4`. |
| Finding 1 | `gpt-image-1` → `gpt-image-1.5`; `Flux Pro` → `FLUX.2 Pro`; added gpt-image-1.5 native streaming note (`stream: true` + `partial_images: 0–3`). |
| Common failure #3 (gibberish text) | Updated fix to reference `gpt-image-1.5`; added Ideogram correct transparency endpoint (`/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"`); added Flux TypeError note on `negative_prompt`. |
| Files already had `> Updated 2026-04-21:` blocks from prior pass for: model picks, Finding 2, Finding 3, Model Picks table, Quick Decision Tree — confirmed current. |

---

### 10c — Spot Illustrations & Icon Packs

| Location | Change |
|---|---|
| §Pack consistency — IP-Adapter-Art | Already had `> **Updated 2026-04-21:**` block (tencent-ailab unmaintained, ComfyUI IPAdapter Plus maintenance-only, FLUX.2 native multi-ref preferred) — no further change needed. |
| §Recraft vector-native path | Already had `> **Updated 2026-04-21:**` block (V4 four tiers, V4 Pro SVG recommended) — confirmed current. |
| §References — Recraft | Already had `> **Updated 2026-04-21:**` inline note (V2 stale, current is V4) — confirmed current. |

No additional edits needed; prior pass covered all claims.

---

### 10d — 3D, Isometric, Claymorphism & Glassmorphism

| Location | Change |
|---|---|
| §3.7 Transparent background (BiRefNet/BRIA) | Added Ideogram transparency endpoint note (correct endpoint vs. `style: "transparent"`). Added `> **Updated 2026-04-21:**` block: BiRefNet June 2025 8× speedup for `refine_foreground`, SDPA, FP16 ~60–80 ms. |
| §1.1 SDXL negative prompt kernel | Added `> **Updated 2026-04-21:**` block: Flux TypeError on `negative_prompt`; SDXL/SD3 support it natively; translate to positive anchor for Flux. |
| Files already had `> Updated 2026-04-21:` blocks for: top-level model landscape (V8 Alpha, FLUX.2, Recraft V4), §1.1 FLUX.2 Pro note, §1.2 FLUX.2 dev/pro note, §1.3 FLUX.2 Pro note, §2.4 FLUX.2 multi-ref note — confirmed current. |

---

### 10e — Illustration → Production Pipeline

No outdated claims requiring correction found. File does not reference DALL-E 3, Recraft V3 by name, tencent-ailab IP-Adapter, Flux negative_prompt, or BiRefNet. The pipeline/format/framework content is model-agnostic and still current.

---

### index.md

No updates needed. Content is a table of file links with a snapshot disclaimer — all current.

---

## Key facts applied (from audit spec)

| Fact | Applied where |
|---|---|
| Recraft V3 → V4 (Feb 2026); V4 has NO `style_id` | SYNTHESIS insight #11, SYNTHESIS Skill 2 defaults, 10b frontmatter |
| V4 pricing: $0.08/img vector, $0.30/img pro vector | Not yet added to files (pricing not present in any current file — consistent omission) |
| DALL-E 3 shutting down May 12, 2026 → gpt-image-1.5 current | Not referenced in this category at all (no DALL-E 3 mentions found) |
| MJ v6 → v7 (default June 2025) → v8 Alpha (March 2026) → v8.1 Alpha (April 2026) | All files already had v7/v8 Alpha references; confirmed current |
| Ideogram transparency: `/ideogram-v3/generate-transparent` + `rendering_speed: "TURBO"` | SYNTHESIS Controversy #3, 10b failure #3, 10d §3.7 |
| tencent-ailab IP-Adapter unmaintained (last commit Jan 2024); InstantX is current for Flux | SYNTHESIS sources, 10a §2, 10a references |
| ComfyUI IPAdapter Plus maintenance-only April 2025 | SYNTHESIS sources, 10a §2 (confirmed already in 10c) |
| Flux `negative_prompt` raises TypeError on ALL variants | SYNTHESIS #5, 10a meta-rule #6, 10b failure #3, 10d §1.1 SDXL kernel |
| Gemini/Imagen free API: needs billing; AI Studio web UI free | Already present across all files; confirmed current |
| gpt-image-1.5 (4× faster, 20% cheaper); native streaming `stream: true` + `partial_images: 0–3` | SYNTHESIS #11, 10b Finding 1, 10b frontmatter |
| BiRefNet June 2025: 8× speedup `refine_foreground`, SDPA, FP16 ~60–80ms RTX 4080 | SYNTHESIS Controversy #3, 10d §3.7 |
| Adobe Firefly Image 5 (announced MAX 2025, Photoshop Beta March 2026) | Not referenced in this category — no Firefly mentions found; no correction needed |
