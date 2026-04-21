# Updates applied to research/33-model-routing-ensembling — 2026-04-21

## Files edited

- `33a-llm-routing-frameworks.md`
- `33b-confidence-based-escalation.md`
- `33c-best-of-n-parallel-generation.md`
- `33d-elo-ab-testing-model-selection.md`
- `33e-async-race-with-validation.md`
- `SYNTHESIS.md`

`index.md` — no changes needed (already dated 2026-04-21, table of contents accurate).

---

## Summary of changes by file

### 33a — LLM Routing Frameworks

- Header update block added covering status of all four frameworks.
- RouteLLM: confirmed ICLR 2025 publication (UC Berkeley / Anyscale / Canva); GitHub active (last commit June 2025). Cost-quality figures annotated as paper benchmarks against GPT-4 / Mixtral pair.
- Martian: URL corrected from `route.withmartian.com` to `work.withmartian.com`; valuation ($1.3B, Apr 2026) and 300+ enterprise customers added. Compliance feature and Apart Research interpretability hackathon (May 2025) noted.
- Not Diamond: OpenRouter Auto Router integration documented — Not Diamond powers OpenRouter's auto-routing at no extra fee. Custom router training path via logged (query, chosen_model) pairs noted.
- RouterArena: paper updated to v2 (November 27, 2025). Evaluated routers corrected to the 6 in the actual paper (CARROT, RouterDC, GraphRouter, MIRT-BERT, NIRT-BERT, RouteLLM). CARROT leads Arena + Latency; RouterDC leads Cost-ratio. VL-RouterBench (arXiv:2512.23562, December 2025) added as companion benchmark for vision-language model routing.
- Sources updated: added VL-RouterBench, RouteLLM OpenReview ICLR link, updated Martian URL.

### 33b — Confidence-Based Escalation

- Header update block added covering all cascade tier changes.
- Cascade tier table completely revised:
  - Tier 1: `flux-schnell` supplemented with `flux.2-klein` (Apache 2.0, Jan 2026, ~13GB VRAM, sub-second local inference).
  - Tier 2 (new): `gpt-image-1-mini` (Oct 2025, ~80% cheaper than gpt-image-1, RGBA-capable, token-based pricing ~$0.008/image at 1024² medium).
  - Tier 3: `recraft-v4` ($0.08 standard vector / $0.30 pro vector, Feb 2026 SOTA SVG) and `ideogram-3-turbo` at $0.03/image via `/ideogram-v3/generate-transparent` endpoint.
  - Tier 4: `gpt-image-1` / `gpt-image-1.5` (terminal tier).
  - DALL-E 3 removed (EOL May 12, 2026). Imagen 4.0 removed (EOL June 24–30, 2026).
- Pre-routing section updated: `gpt-image-1-mini` added as valid transparent candidate; wordmark >3 words + transparent → skip directly to tier 4.
- Schema example corrected: Ideogram tier now uses `endpoint: "/ideogram-v3/generate-transparent"` with `params.rendering_speed: "TURBO"`.

### 33c — Best-of-N Parallel Generation

- Header update block added.
- Cross-model BoN example updated:
  - Variant B: `ideogram-3-turbo` endpoint corrected from `style: "transparent"` to `/ideogram-v3/generate-transparent` with `rendering_speed: "TURBO"`.
  - Variant C: `recraft-v3` updated to `recraft-v4` (Feb 2026 SOTA SVG; note: no `style_id` — V3 retained for brand-style pipelines).
  - Variant D added: `gpt-image-1-mini` (~$0.008/image) as a budget cross-model BoN candidate.
- Recraft V4 Pro Vector pricing noted ($0.30/image) as highest-cost leg in cross-model set.
- Note on `recraft-v4` vs `recraft-v3` for `style_id` usage clarified.

### 33d — ELO and A/B Testing for Model Selection

- Header update block added.
- Arena ELO table updated to April 2026 standings with notes column:
  - GPT Image 1.5 (1274) — Dec 2025, RGBA, 4× faster, ~20% cheaper than gpt-image-1.
  - Nano Banana 2 (1264) — GA Feb 26, 2026 (gemini-3.1-flash-image-preview).
  - Nano Banana Pro (1215), FLUX.2 [max] (1204), Seedream 4.0 (1201), FLUX.2 [dev] Turbo (1165).
  - DALL-E 3 removed from Arena listing.
- `routing-table.json` schema example updated: `gpt-image-1` → `gpt-image-1.5`; `recraft-v3` → `recraft-v4`; `gpt-image-1-mini` added; Ideogram transparent endpoint corrected.
- Non-stationarity caveat strengthened with concrete example: Google deprecated `gemini-2.5-flash-image-preview` January 15, 2026 (only 3 months after GA), silently breaking routing tables that targeted the preview variant.
- New models with limited Arena data listed: gpt-image-1-mini, hidream-i1, qwen-image-2.0, flux1-kontext-pro, flux.2-klein.
- `gemini-2.5-flash-image` (~$0.039/img, GA Oct 2 2025, EOL Oct 2 2026) noted as cost-constrained Gemini routing candidate.

### 33e — Async Race with Validation

- Header update block added.
- OpenRouter clarification: Auto Exacto is provider-level load balancing (not model-level parallel racing); Auto Router (Not Diamond) selects a single model. Parallel race requires explicit concurrent HTTP requests.
- Mixture-of-Experts section updated:
  - `recraft-v3` → `recraft-v4` as vector specialist.
  - `flux-pro` → `flux.2-dev` / `flux.2-max` as photorealistic scene specialist.
  - FLUX.1 Kontext [pro] (May 29, 2025) and [dev] (June 26, 2025, open-weights 12B) added as race candidates for instruction-based editing tasks (local edit, global edit, character preservation, style reference, text editing).
  - Flux.2 [klein] (Jan 2026, Apache 2.0, sub-second local) noted as a compelling local race leg that can race against remote API calls.
- Sources updated: added fal.ai async inference docs URL, FLUX.1 Kontext release pages, Flux.2 repo/blog.

### SYNTHESIS.md

- Date corrected from 2026-04-20 to 2026-04-21.
- Files table updated with April 2026 model notes per row.
- Conclusion #5 (ELO) updated with April 2026 Arena top-6 and annotated model list including new entrants.
- New section "April 2026 Model Landscape Update" added before Priority Implementation Order:
  - Deprecations table: DALL-E 3 (EOL May 12, 2026), Imagen 4.0 (EOL June 24–30, 2026), gemini-2.5-flash-image-preview (discontinued Jan 15, 2026).
  - New models table: gpt-image-1.5, gpt-image-1-mini, recraft-v4, flux.2-klein, flux1-kontext-pro, flux1-kontext-dev, hidream-i1, qwen-image-2.0, gemini-2.5-flash-image, midjourney-v7/v8-alpha/v8.1-alpha.
  - Corrected API parameters table: Ideogram transparent endpoint fix.
- Existing routing-table.json compatibility note updated: suggested `deprecated_after` field for lifecycle-removed models.

---

## Key facts verified by web search

| Claim | Status |
|---|---|
| RouteLLM published ICLR 2025 | Confirmed |
| Martian nearing $1.3B valuation April 2026 | Confirmed (Medium / PitchBook) |
| Not Diamond powers OpenRouter Auto Router at no extra fee | Confirmed |
| RouterArena v2 updated November 2025; 6 evaluated routers (not 12) | Confirmed |
| VL-RouterBench arXiv:2512.23562 December 2025 | Confirmed |
| Recraft V4 released February 2026; $0.08 standard vector, $0.30 pro vector; no style_id | Confirmed |
| DALL-E 3 EOL May 12, 2026 | Confirmed (OpenAI developer forum official deprecation notice) |
| gpt-image-1.5 December 2025; 4× faster, ~20% cheaper, same RGBA | Confirmed |
| gpt-image-1-mini October 2025; ~80% cheaper; token-based pricing $8/M output image tokens | Confirmed |
| Ideogram V3 transparent: endpoint `/ideogram-v3/generate-transparent`, `rendering_speed: "TURBO"`, $0.03/image | Confirmed (WaveSpeedAI docs, multiple aggregators) |
| Imagen 4.0 family deprecated; EOL June 24–30, 2026; migrate to gemini-2.5-flash-image | Confirmed |
| gemini-2.5-flash-image GA Oct 2, 2025; ~$0.039/img; EOL Oct 2, 2026; successor is gemini-3.1-flash-image-preview (Nano Banana 2) | Confirmed |
| gemini-2.5-flash-image-preview discontinued January 15, 2026 | Confirmed |
| Flux.2 [klein] 4B, Apache 2.0, released January 15, 2026, ~13GB VRAM, sub-second on RTX 3090 | Confirmed |
| FLUX.1 Kontext [pro] May 29, 2025; [dev] June 26, 2025 (open-weights 12B) | Confirmed |
| HiDream-I1: 17B sparse MoE DiT, HF Space April 8, 2025, paper May 28, 2025 | Confirmed |
| Qwen-Image-2.0: 7B, Feb 2026, #1 AI Arena text-to-image + editing | Confirmed |
| Midjourney v7 default June 2025; v8 Alpha March 2026; v8.1 Alpha April 14, 2026 | Confirmed |
| fal.ai Queue API: no material API changes since original research | Confirmed (docs structure unchanged) |
| OpenRouter: parallel race requires explicit concurrent HTTP requests; `models[]` is sequential fallback only | Confirmed |

---

## routing-table.json / model-registry.json action items (not applied in this research update — apply separately)

1. Remove `dall-e-3` entries; set `deprecated_after: "2026-05-12"` in any remaining references.
2. Remove `imagen-4.0`, `imagen-4.0-ultra`, `imagen-4.0-fast` entries; set `deprecated_after: "2026-06-30"`.
3. Remove `gemini-2.5-flash-image-preview` (discontinued January 15, 2026).
4. Add `gpt-image-1.5` with `rgba: true`, `pricing: { per_image_medium_1024: 0.034 }`.
5. Add `gpt-image-1-mini` with `rgba: true`, `pricing: { per_1m_output_tokens: 8.00, approx_per_image_medium_1024: 0.008 }`.
6. Update `recraft-v3` to add `eol_note: "keep for style_id brand pipelines; V4 preferred for fresh generation"`.
7. Add `recraft-v4` with `native_svg: true`, `style_id: false`, `pricing: { vector: 0.08, pro_vector: 0.30 }`.
8. Add `flux.2-klein` with `license: "apache-2.0"`, `params: 4e9`, `vram_gb: 13`, `latency_note: "sub-second on RTX 3090"`.
9. Add `flux1-kontext-pro` and `flux1-kontext-dev` with `capability: ["local_edit", "global_edit", "character_reference", "style_reference", "text_edit"]`.
10. Add `hidream-i1` with `params: 17e9`, `architecture: "sparse_moe_dit"`.
11. Add `qwen-image-2.0` with `params: 7e9`, `max_resolution: "2048x2048"`, `unified_gen_edit: true`.
12. Add `gemini-2.5-flash-image` with `pricing: { per_image: 0.039 }`, `eol_date: "2026-10-02"`, `successor: "gemini-3.1-flash-image-preview"`.
13. Update `midjourney` entry to v7 (default); add `midjourney-v8-alpha` and `midjourney-v8.1-alpha` as alpha-tier paste-only entries.
14. Correct all `ideogram-3-turbo` transparent routing: replace `style: "transparent"` with `endpoint: "/ideogram-v3/generate-transparent"`, `rendering_speed: "TURBO"`.
