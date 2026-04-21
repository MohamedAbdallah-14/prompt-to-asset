# Updates: 01-prompt-engineering-theory

## Files modified:

- `1c-llm-prompt-expansion.md`: Added dated update block noting DALL-E 3 deprecation (May 12 2026) and gpt-image-1/1.5 as current; added note on PaLM→Gemini/GPT-4o base model shift; added deprecation footnote to OpenAI Cookbook reference.
- `1d-prompt-weighting-syntax.md`: Added Midjourney v7 (released April 3 2025, default June 17 2025) and v8.1 Alpha (April 14 2026) to the multi-prompt version list; updated Open Question #6 with version status note.
- `1e-survey-papers.md`: Updated magic-term decay line to name MJv7 and FLUX.2; updated Open Question #3 to replace "DALL-E 3" with "gpt-image-1/1.5 [DALL-E 3 deprecated May 2026]" and added Ideogram 3 Turbo / MJv7+.
- `SYNTHESIS.md`: Updated item 13 (magic terms) to say "MJ v7" instead of "MJ v6+"; updated Recommendation #2 to replace "DALL-E 3" with "gpt-image-1/1.5"; updated Recommendation #9 model tag list (added `flux2`, replaced `dalle3` with `gpt-image-1`); added dated note on FLUX.2 release and DALL-E 3 deprecation in P5 cross-cutting pattern; added inline deprecation note to DALL-E 3 primary source entry and OpenAI Cookbook entry.

## Files not modified (already accurate or out of scope):

- `index.md`: Already has a 2026-04-21 banner; content is structural only (links to angle files), no factual model claims to update.
- `1a-cfg-and-negative-prompts.md`: Content is foundational CFG theory (Ho & Salimans, APG, CFG++, Flux guidance distillation). All claims are theory-level or correctly scoped to SD/SDXL/Flux model families without asserting any model is "current/latest." No stale patterns found.
- `1b-compositional-attention-control.md`: Content covers cross-attention control papers (P2P, A&E, SynGen, Bounded Attention). Already notes SD3/SD3.5/FLUX.1 failures per FineGRAIN 2025/2026. No stale model-version claims found.

## Outdated/false claims corrected:

| File | Old claim | Corrected to | Source |
|------|-----------|--------------|--------|
| `1c-llm-prompt-expansion.md` | Implied DALL-E 3 is the current/active OpenAI image model via "DALL-E 3 set the 'GPT-4 rewrites everything' default" with no deprecation caveat | Added dated block: DALL-E 3 deprecated Nov 14 2025, API removal May 12 2026; gpt-image-1 (Mar 25 2025) and gpt-image-1.5 (Dec 16 2025) are current | OpenAI deprecation announcement; community.openai.com thread 1378754 |
| `1c-llm-prompt-expansion.md` | SFT table showed "PaLM-family" for Google 2024 work with no note that GPT-4/PaLM are no longer the default LLM for production rewriting pipelines | Added note that GPT-4o/Gemini 2.5/o4-mini have superseded GPT-4 and PaLM as production base models | OpenAI model docs; Google AI releases |
| `1c-llm-prompt-expansion.md` | OpenAI Cookbook "What's new with DALL-E 3" linked with no deprecation signal | Added "(2026-04-21): DALL-E 3 is deprecated; gpt-image-1/1.5 succeeds it" footnote | OpenAI deprecation calendar |
| `1d-prompt-weighting-syntax.md` | Midjourney multi-prompt `::` syntax listed as available on "v4, Niji 4/5, 5, 5.1, 5.2, 6, 6.1 and v1–3" — stopped at v6.1, no mention of v7 | Added v7 (default June 17 2025) and v8.1 Alpha (April 14 2026); noted `::` weighting syntax unchanged | Midjourney docs; TechCrunch v7 release; Tom's Guide; godofprompt.ai |
| `1e-survey-papers.md` | "Magic-term decay" listed as "ignored by MJv6+ and FLUX.1" | Updated to "MJv7 (current default as of June 2025) and FLUX.1/FLUX.2" | Midjourney release timeline; BFL FLUX.2 announcement |
| `1e-survey-papers.md` | Open Question #3 listed "DALL-E 3, GPT-Image, Imagen 3, Gemini 2.5" | Updated to "gpt-image-1/1.5 [DALL-E 3 deprecated May 2026], Imagen 3/4, Gemini 2.5, Ideogram 3 Turbo, Midjourney v7+" | OpenAI deprecation; Ideogram 3.0 release Mar 26 2025 |
| `SYNTHESIS.md` item 13 | "largely ignored by MJ v6+ and Flux" | "largely ignored by MJ v7 (current default) and Flux/FLUX.2" | Midjourney v7 release Apr 3 2025 |
| `SYNTHESIS.md` Rec. #2 | "DALL·E 3" in T5/DiT target list | "gpt-image-1/1.5 [formerly DALL-E 3]" | OpenAI model lineage |
| `SYNTHESIS.md` Rec. #9 | Model tag list included `dalle3` but no `flux2`; no deprecation note | Added `flux2`; renamed `dalle3` → `gpt-image-1`; added dated note on FLUX.2 (Nov 2025) and DALL-E 3 deprecation | BFL FLUX.2 release; OpenAI deprecation |
| `SYNTHESIS.md` Primary Sources | DALL-E 3 paper listed with no deprecation signal | Added inline note "[Note 2026-04-21: DALL-E 3 deprecated; API removal May 12, 2026. Successor: gpt-image-1/1.5]" | OpenAI |

## Claims verified as still accurate (no change needed):

| File | Claim verified |
|------|---------------|
| `1a-cfg-and-negative-prompts.md` | Flux guidance distillation / `negative_prompt TypeError` — still accurate for FLUX 1.x and FLUX.2 (same architecture) |
| `1a-cfg-and-negative-prompts.md` | APG (ICLR 2025), CFG++ (ICLR 2025), Guidance Interval (NeurIPS 2024) — publication venues confirmed accurate |
| `1a-cfg-and-negative-prompts.md` | SD3/SD3.5 CFG behavior description — SD 3.5 released Oct 2024 (confirmed); descriptions still accurate |
| `1b-compositional-attention-control.md` | FineGRAIN 2025 / T2I-CompBench++ (TPAMI 2025) still show SD3/SD3.5/FLUX.1 attribute-binding failures — still accurate |
| `1b-compositional-attention-control.md` | "Prompt Forgetting in DiT" arXiv:2602.06886 (Feb 2026) — correctly dated |
| `1c-llm-prompt-expansion.md` | Promptist, BeautifulPrompt, RePrompt, PromptToAsset SFT→RL training recipe — still the field standard |
| `1c-llm-prompt-expansion.md` | CLIP 77-token truncation for SD1.5/SDXL — still accurate |
| `1d-prompt-weighting-syntax.md` | Four distinct weighting semantics (A1111 scale, ComfyUI lerp, Compel masked blend, Midjourney multi-prompt) — still accurate; syntax unchanged in current versions |
| `1e-survey-papers.md` | Promptist (NeurIPS 2023), The Prompt Report (2024), Oppenlaender taxonomy (Behaviour & IT 2024) — all correctly cited |
| `SYNTHESIS.md` | CFG equation, negative prompt mechanism, oversaturation root cause (APG) — foundational; unchanged |
| `SYNTHESIS.md` | "CLIP 77-token silent truncation is still shipping in 2026" — confirmed still true for SD1.5/SDXL pipelines |
