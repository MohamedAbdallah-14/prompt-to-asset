# Updates: 02-image-generation-models

_Audit date: 2026-04-21_

## Files modified

- `2a-diffusion-foundations.md`: Added dated banner noting DALL·E 3 deprecation (May 2026), gpt-image-1 as successor, Midjourney v7/v8 current status; updated exec summary to replace "DALL·E 3" with "gpt-image-1" in model list.
- `2b-autoregressive-transformer-t2i.md`: Added Emu3.5 (Oct 2025) to timeline; extended 2025-2026 trajectory to include Qwen-Image-2.0 (Feb 2026); added Qwen-Image open-weights entry to Tools section with dated note.
- `2c-flow-matching-rectified-flow.md`: Added dated corrections to three locations where DALL·E 3 and Midjourney v6.0 appear as comparison benchmarks (vendor-reported BFL launch claims); added note that DALL-E 3 is deprecated and current comparators are gpt-image-1/1.5 and Midjourney v7/v8.
- `2d-dit-mmdit-architectures.md`: Updated typography claim to correctly reference gpt-image-1/1.5 instead of DALL-E 3 as the AR/hybrid text leader; expanded open-weights frontier section to include FLUX.1 Tools, FLUX.1 Kontext variants, HiDream-I1, Qwen-Image, Qwen-Image-2.0, OmniGen2; updated closed-commercial list to include Midjourney v7/v8 Alpha, gpt-image-1.5, Ideogram 3 Turbo; added dated note summarizing new open-weights releases.
- `2e-imagen-technical-reports.md`: Added dated caveat to the Imagen 3 GenAI-Bench Elo table, noting DALL·E 3 and Midjourney v6 are the paper's historical 2024 comparison targets; added "Note" column to benchmark table flagging deprecation/succession status of each model.
- `SYNTHESIS.md`: Updated model picker to add Ideogram 3 Turbo; added dated DALL-E 3 deprecation warning to the gpt-image-1 quirks entry; added DALL-E 3 routing prohibition to router point 1; added new frontier model entries to Primary Sources (OmniGen2, HiDream-I1, Qwen-Image, Qwen-Image-2.0); updated controversy entry on "AR wins text" split to include Midjourney v8 text accuracy data.

## Outdated/false claims corrected

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `2a-diffusion-foundations.md` | Executive summary lists "DALL·E 3" as a live frontier system | DALL·E 3 deprecated May 12, 2026; current model is gpt-image-1 / gpt-image-1.5 | OpenAI deprecation announcement Nov 2025; OpenAI community forum |
| `2a-diffusion-foundations.md` | "Midjourney's internals" with no version context | Midjourney v7 is current default (Apr 2025); v8 Alpha in preview (Mar 2026) | TechCrunch, Midjourney updates page |
| `2c-flow-matching-rectified-flow.md` | BFL launch claim: FLUX.1 surpasses "Midjourney v6.0, DALL·E 3 (HD)" (presented as current comparison) | Those were the 2024 launch-time comparison targets; current comparators are MJ v7/v8 and gpt-image-1.5. Added dated caveat. | Web search: Midjourney v7 (Apr 2025 default), DALL-E 3 deprecation (May 2026) |
| `2c-flow-matching-rectified-flow.md` | Open questions name "DALL·E 3" as a closed holdout model | Corrected to gpt-image-1/1.5 with dated note | OpenAI model deprecation docs |
| `2c-flow-matching-rectified-flow.md` | Market signals cite "Midjourney v6.1 post-mortems" without noting v7/v8 exist | Added dated caveat noting MJ v7 (Apr 2025) and v8 Alpha (Mar 2026) | TechCrunch, Midjourney updates |
| `2d-dit-mmdit-architectures.md` | "SD3, FLUX.1, and Qwen-Image all substantially outperform SDXL and even DALL-E 3 on typography benchmarks" | Added clarification that gpt-image-1/1.5 is the current OpenAI reference and actually *leads* on short-headline word accuracy (~98%) | 2b §3 in this same document; web search on gpt-image-1.5 accuracy |
| `2d-dit-mmdit-architectures.md` | Open-weights frontier listed only through late 2024 (no HiDream-I1, Qwen-Image, OmniGen2) | Added HiDream-I1 (Apr 2025), Qwen-Image (Aug 2025), Qwen-Image-2.0 (Feb 2026), OmniGen2 (Jun 2025), FLUX.1 Kontext [dev] (Jun 2025) | Web searches; arXiv 2505.22705, 2508.02324, 2506.18871, 2506.15742 |
| `2d-dit-mmdit-architectures.md` | Closed commercial list: "GPT-Image (OpenAI), Midjourney v7" with no note that DALL-E 3 is being deprecated or that v8 exists | Updated to "GPT-Image / gpt-image-1.5 (DALL-E 3 deprecated May 2026), Midjourney v7 (default Jun 2025) / v8 Alpha (Mar 2026 preview), Ideogram 3 / 3 Turbo (Mar 2025)" | OpenAI deprecation, Midjourney updates, Ideogram release notes |
| `2e-imagen-technical-reports.md` | Imagen 3 benchmark table presents DALL·E 3 (Elo 1,028) and Midjourney v6 (Elo 1,027) with no caveat that these are now superseded | Added column "Note" and dated banner explaining these are the 2024 paper's comparison targets; DALL-E 3 deprecated May 2026, Midjourney v6 superseded Apr 2025 | Imagen 3 tech report context; OpenAI/Midjourney announcements |
| `SYNTHESIS.md` | Model picker §1 lists "Ideogram 3" without Turbo variant | Added "Ideogram 3 / 3 Turbo" (Turbo is the cheapest/fastest tier at $0.04/image, released Mar–May 2025) | Ideogram docs, Replicate model page |
| `SYNTHESIS.md` | Primary Sources missing OmniGen2, HiDream-I1, Qwen-Image, Qwen-Image-2.0 | Added all four with arXiv IDs and release dates | Web searches; arXiv |
| `SYNTHESIS.md` | Controversy "AR wins text" doesn't mention Midjourney v8's text accuracy improvement | Added: "Midjourney v8 Alpha (March 2026) improved text accuracy from ~52% (v7) to ~78% but FLUX still leads at 88–92% for multi-word text" | WaveSpeedAI blog, comparison articles |
| `2b-autoregressive-transformer-t2i.md` | 2025-2026 trajectory ends at gpt-image-1.5 Dec 2025 with no 2026 entries | Added Emu3.5 (Oct 2025) and Qwen-Image-2.0 (Feb 2026) | BAAI/Medium; Alibaba Qwen blog |

## Claims verified as still accurate (no change needed)

- `2e`: Imagen 4 has no standalone arXiv tech report as of 2026-04 — confirmed via web search.
- `2e`: Imagen 4 pricing ($0.06 Ultra / $0.04 standard / $0.02 Fast) — confirmed via Vertex AI pricing docs.
- `2e`: Gemini 2.5 Flash Image pricing ~$0.039/image (1,290 output tokens × $30/1M) — confirmed accurate; note: Google AI Studio web UI offers up to 500 images/day free; paid API tier has no free image quota as of Dec 2025.
- `2c`: SANA-Sprint arXiv:2503.09641 ICCV 2025 — confirmed.
- `2c`: FLUX.1 Kontext arXiv:2506.15742 — confirmed; [pro/max] released May 29, 2025; [dev] open weights released June 26, 2025.
- `2b`: Ideogram 3.0 / 3 Turbo figures ("~90% word accuracy", Turbo pricing $0.04/image) — confirmed via Ideogram docs and Replicate.
- `2b`: gpt-image-1 released April 23, 2025; gpt-image-1.5 December 16, 2025 — confirmed.
- `2d`: OmniGen CVPR 2025 — confirmed (arXiv:2409.11340).
- `index.md` / `SYNTHESIS.md`: Gemini/Imagen free API removed Dec 2025 banners — already present and accurate.
- `2a`: SD 3.5 (Oct 2024) — still latest Stability AI open-weights release; no SD 4 as of April 2026.
- Recraft V3 (Oct 2024) — still the latest Recraft model as of April 2026 (confirmed via web search).
- Midjourney v7 as current default (became default June 17, 2025) — confirmed. v8 Alpha is preview only (March 2026), v8.1 Alpha April 14, 2026; v7 remains the production default.
