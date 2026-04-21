---
category: 04-gemini-imagen-prompting
angle: 4d
title: Community-documented Gemini/Imagen quirks & artifacts
summary: Catalog of weird behaviors, safety-filter false positives, output-layer bugs, and style biases in Imagen 3/4 and Gemini 2.5/3 Flash Image ("Nano Banana" / "Nano Banana Pro") as reported by developers on Google's own forums, GitHub, Reddit, HN, and independent technical blogs between late 2024 and early 2026.
research_value: high
sources_primary: 14
date_range: 2024-08 to 2026-04
---

> **Updated 2026-04-21:** The quirks catalog below covers behaviors through early 2026. Key status changes since original compilation: (1) All Imagen 4.0 variants deprecated, EOL June 30, 2026 — migrate to `gemini-2.5-flash-image`; (2) programmatic image-gen via the Gemini Developer API free tier now returns HTTP 429 with `limit: 0` — billing required for all image endpoints; (3) `google-generativeai` and `vertexai.generative_models` Python packages are deprecated (removed June 24, 2026) — use `google-genai`. The SDK hang (#8, futex deadlock on `IMAGE_SAFETY` enum) and MIME-type lie (#9) remain open as of April 2026.

**Research value: high** — External signal is dense: Google's own AI Developers Forum, first-party GitHub issue trackers (`googleapis/python-genai`, `google-gemini/cookbook`), and a small group of technical writers (Max Woolf, Yael Walker) have catalogued reproducible, still-open quirks well beyond the usual marketing narrative.

## Overview

"Nano Banana" is Google's internal nickname for Gemini 2.5 Flash Image (GA Oct 2025); "Nano Banana Pro" / "Nano Banana 2" is the Gemini 3 Pro Image preview (Nov–Dec 2025). Both are marketed as SOTA for editing and character consistency, but community testing has surfaced a persistent set of output-layer, policy-layer, and SDK-layer quirks. Imagen 3 and Imagen 4 (Vertex AI) share some of them and have a few of their own. The list below is restricted to behaviors that multiple independent users have reproduced — not one-off prompt failures.

## Catalog of Quirks

### 1. Aspect-ratio parameter silently ignored — outputs default to square
Until native `imageConfig.aspectRatio` shipped, Gemini 2.5 Flash Image defaulted to 1:1 regardless of textual requests for 16:9 / 9:16. Even after native support, the **Batch API** still ignored the parameter while single calls honored it, and third-party integrations (Pollinations, pydantic-ai, Vercel AI SDK) inherited the same bug. Community workaround: pass a blank PNG in the desired aspect ratio as the **last** reference image so Gemini matches the reference dimensions. ([google-gemini/cookbook #1018](https://github.com/google-gemini/cookbook/issues/1018), [pollinations #6070](https://github.com/pollinations/pollinations/issues/6070), [pydantic-ai #3119](https://github.com/pydantic/pydantic-ai/issues/3119), [Yael Walker](https://yaelwalker.com/blog/nano-banana/), [aipure.ai workaround doc](https://aipure.ai/articles/how-to-fix-gemini-nano-banana-aspect-ratio-problems-when-creating-images))

### 2. No true transparent backgrounds — checker pattern or flattened white
Despite explicit "transparent background / PNG with alpha" prompts, Gemini flattens output to PNG-without-alpha or JPG. Users report receiving either a solid background or a **fake checkerboard rendered into RGB pixels**. The community workaround is a two-pass "alpha-recovery" trick: generate the same image on a white background and on a black background, then mathematically recover alpha from the pair (Transparify and similar tools). ([Gemini Apps Community feature request](https://support.google.com/gemini/thread/388691969/feature-request-ability-to-generate-images-with-transparent-backgrounds-png-with-alpha-channel), [iprompto.com](https://iprompto.com/can-gemini-generate-images-with-transparent-background-complete-2025-in-depth-guide/), [Transparify blog](https://transparify.app/blog/ai-image-transparent-background))

### 3. Long prompts rendered as literal text inside Imagen 4 output
Imagen 4's text-rendering upgrade comes with a quirk: **if your prompt is long and descriptive, Imagen 4 will sometimes typeset the prompt text into the image** rather than treating it as creative guidance. Reported on Google's own AI Developers Forum; the workaround is to pre-summarize the prompt (multimodal Gemini call → Imagen) before generation. ([Google AI Developers Forum #86828](https://discuss.ai.google.dev/t/imagen-4-0-api-issue-long-contextual-prompts-rendered-as-text-instead-of-creative-guidance-multimodal-alternative-needed/86828))

### 4. Hidden prompt rewriter (`enhancePrompt=true` by default)
Imagen 3/4 silently runs an LLM-based prompt rewriter on any prompt under ~30 words. This changes the image you get from the one you prompted, is disabled by a buried `enhancePrompt: false` flag, and has no equivalent in the Gemini app UI — making reproducibility harder and explaining why the same short prompt produces wildly different outputs on repeat calls. ([Vertex AI — Use prompt rewriter](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/use-prompt-rewriter))

### 5. Nano Banana Pro "thinks away" surreal intent — realism bias
Max Woolf (BuzzFeed senior data scientist) documented that Gemini 3 Pro's mandatory thinking step causes Nano Banana Pro to **correct prompts toward the median** interpretation. Concrete failure: "Ugly Sonic" reference images are overridden and the model outputs canonical Sonic instead, even with 17 reference images. Trade-off: great for photoreal portraits; actively harmful for deliberately surreal or off-model prompts. ([minimaxir.com 2025-12](https://minimaxir.com/2025/12/nano-banana-pro/))

### 6. Over-smoothed "plastic skin" on portraits
A widely reported failure mode of Gemini 2.5 Flash Image is faces that look vinyl/waxy rather than photographic. Community remedies: explicitly add "natural skin texture", specify a lens (50mm / 85mm), and avoid extreme close-ups, which tend to amplify the smoothing. ([blog.bananathumbnail.com](https://blog.bananathumbnail.com/gemini-nano-banana-3/), [skywork.ai guide](https://skywork.ai/blog/how-to-fix-soft-faces-hands-eyes-nano-banana-guide/), [CNET hands-on](https://www.cnet.com/tech/services-and-software/geminis-nano-bananas-ai-image-editing-is-fun-but-I-ran-into-too-many-slipups/))

### 7. `IMAGE_SAFETY` silent failure — HTTP 200 with no image
A non-configurable "Layer 2" safety filter can return `finishReason: "IMAGE_SAFETY"` (or `NO_IMAGE`, `IMAGE_PROHIBITED_CONTENT`, `IMAGE_RECITATION`) with a 200 OK but no `content` part. Even setting every `HarmBlockThreshold` to `BLOCK_NONE` does **not** disable these — they live behind the user-configurable layer. Developers who only log "image generation failed" miss the distinction between prompt-side block, output-side block, and non-policy `NO_IMAGE`. ([AI Free API troubleshooting guide](https://aifreeapi.com/en/posts/gemini-image-silent-failure-image-safety-fix), [Gemini safety settings docs](https://ai.google.dev/gemini-api/docs/safety-settings))

### 8. SDK hangs indefinitely on unknown `finish_reason` enum
`google-genai` Python SDK's enum validator hits `UserWarning: IMAGE_SAFETY is not a valid FinishReason` and then **deadlocks in `futex_wait_queue`** when code accesses `response.candidates[0].finish_reason`. Open bug, p2, still under investigation as of Feb 2026. The bug makes "hung request" look identical to "slow generation" in production. ([googleapis/python-genai #2024](https://github.com/googleapis/python-genai/issues/2024))

### 9. Declared `mime_type` lies — claims PNG, bytes are JPEG
Gemini 3 Pro Image preview returns `inline_data.mime_type = "image/png"` while the actual bytes begin with `\xFF\xD8` (JPEG). Breaks downstream pipelines — notably Anthropic's Claude API, which validates declared MIME against the magic bytes and rejects the image. Closed as "stale" without a fix. ([googleapis/python-genai #1824](https://github.com/googleapis/python-genai/issues/1824))

### 10. Overcautious refusals of benign prompts ("dog", "cereal", "kettle", "pillow")
Google itself acknowledged, in a 2024 blog post, that Gemini "became way more cautious than we intended". Community examples still surface in 2025–2026: "Generate an image of a dog" rejected because the output "could resemble an identifiable pet"; "a cartoon dog with a red collar" rejected for "promoting violence against animals"; kettles flagged as weapons; pillows flagged as suffocation hazards. Typical fix: add art-style/scene context ("realistic digital illustration of X in Y"). ([google-gemini/cookbook #568](https://github.com/google-gemini/cookbook/issues/568), [Google blog 2024-02](https://blog.google/products/gemini/gemini-image-generation-issue), [AI Free API refusal guide](https://aifreeapi.com/en/posts/nano-banana-pro-image-generation-refused))

### 11. Geolocation-gated person restrictions (GDPR compliance)
The "no images of identifiable people" restriction is **enforced at the API-output layer based on your IP's geolocation**, not in the model. Requests made from the EU get replaced with a "prohibited content" icon; flipping to a US VPN and reloading reveals the original image. The block covers deceased historical and mythological figures (Einstein, Elvis, Shakespeare, Jesus, Tutankhamun, King Arthur). Face detection is lossy: statues of Michelangelo's David are sometimes refused, actual celebrity photos sometimes pass. ([Yael Walker blog](https://yaelwalker.com/blog/nano-banana/), [HN #45035312](https://news.ycombinator.com/item?id=45035312), [ZDNET 2024-02](https://www.zdnet.com/article/why-google-just-banned-gemini-from-generating-images-of-people/))

### 12. Anime/manga style disproportionately blocked
The exact same subject ("cat resting") passes with `realistic digital illustration` but fails with `anime style`. Pattern confirmed across Google Developers Forum threads and community testing: the safety classifier evidently correlates anime aesthetics with higher-risk content. Mitigation is a style swap rather than prompt rewording. ([AI Free API refusal guide](https://aifreeapi.com/en/posts/nano-banana-pro-image-generation-refused))

### 13. Visible sparkle watermark (✦) — deterministic, removable
All Gemini app free/Pro outputs get a four-pointed sparkle glyph in the bottom-right corner (~48×48 px ≤1024 px; ~96×96 px above). It is applied via constant-alpha blending (`watermarked = α·logo + (1-α)·original`), which means it can be **losslessly reversed** mathematically rather than inpainted. Multiple open-source tools (Gemini Watermark Tool, pilio.ai, aiwatermarkcleaner) ship reverse-alpha-blending implementations. Cropping does not remove the invisible SynthID layer. ([Allen Kuo Medium](https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f), [pilio.ai blog](https://pilio.ai/blog/gemini-watermark-how-it-works), [allenk/GeminiWatermarkTool research](https://github.com/allenk/GeminiWatermarkTool/blob/main/report/synthid_research.md))

### 14. SynthID is baked into sampling, not stamped on top
Unlike the visible sparkle, SynthID is not a post-hoc watermark — as independent analysis puts it, "SynthID is not added to an image. It **is** the image": it is encoded via biased sampling during diffusion, survives JPEG compression / resize / crop / color adjustments, and can only be stripped at the cost of substantial quality loss. Undocumented implication: any attempt to "denoise" SynthID out will visibly degrade the image. ([SynthID / DeepMind](https://deepmind.google/science/synthid), [allenk research report](https://github.com/allenk/GeminiWatermarkTool/blob/main/report/synthid_research.md))

### 15. Multi-turn editing drift — quality decays over 5–10 rounds
Iterative edits in the same conversation accumulate imperceptible artifacts that compound into visible blur, color shift, or identity drift after ~5–10 rounds; starting a new session resets but also causes identity drift from the first reference. Worse for diagnosis: 21 of 23 common NR-IQA metrics **rate the degraded images as higher quality**, so automated pipelines do not catch the decay. Community mitigation: re-inject the full character description every turn instead of relying on conversation memory. ([arXiv 2604.03400 "Banana100"](https://arxiv.org/html/2604.03400v1), [juheapi.com multi-turn test](https://www.juheapi.com/blog/nano-banana-2-multi-turn-editing-test-iterating-on-single-image-5-rounds), [nanobananas.ai help docs](https://nanobananas.ai/en/help/common-issues))

### 16. Gemini-app quality regression (file-size crash, added compression)
A Reddit thread titled *"Enshittification of Nano Banana Pro"* and multiple corroborating posts report that around mid-March 2026, images served by the consumer **Gemini app** dropped from 5–7 MB to ~1 MB via heavier compression, producing pixelated/muddy output while the API returns full-quality images for the same prompt. Google also moved the "Pro" toggle behind a three-dot menu. Signal: if you need the advertised fidelity, use the API, not the app. ([r/GeminiAI — Enshittification](https://www.reddit.com/r/GeminiAI/comments/1rs58vz/), [r/GeminiAI — quality fluctuating](https://www.reddit.com/r/GeminiAI/comments/1pose22/gemini_nano_banana_pro_image_quality_fluctuating/), [r/GeminiAI — Nano Banana Pro refusal only on app](https://www.reddit.com/r/GeminiAI/comments/1r5h1hq/))

### 17. Spurious "2023" date watermarks inside Pro outputs
Max Woolf observed a consistent tic where Nano Banana Pro stamps a diegetic date — almost always in 2023 — into photo-like generations of events, news, and product scenes, even when nothing in the prompt asks for one. Likely a training-data hangover (large corpora of dated news photography from 2023). Noteworthy because "clean" image prompts still come back with an in-frame timestamp. ([minimaxir.com 2025-12](https://minimaxir.com/2025/12/nano-banana-pro/))

### 18. System prompts silently ignored in base Nano Banana
Gemini 2.5 Flash Image accepts a `system_instruction` without error but **does not apply it** to the image generation pass — confirmed by Woolf using a system prompt saying "MUST be black and white, supersedes user instructions", which base Nano Banana ignored and Nano Banana Pro honored. Net effect: any prompt-engineering library that relies on system-level style guards silently degrades on the cheaper model. ([minimaxir.com 2025-12](https://minimaxir.com/2025/12/nano-banana-pro/))

## Cross-cutting Patterns

Three structural observations the individual quirks point at:

- **Separation of gate from model.** Most policy-layer quirks (IMAGE_SAFETY, geolocation gating, celebrity refusals, kettle/pillow paranoia) live in an output-side filter that the underlying model does not know about. That explains the frequent "API works, app doesn't" and "US works, EU doesn't" reports.
- **"Default-on" black boxes.** Two of the most confusing behaviors — `enhancePrompt=true` on Imagen 3/4, and the Gemini 3 Pro mandatory thinking step — silently rewrite intent before the pixels hit the decoder. Reproducibility suffers and there is no parity flag in the Gemini app UI.
- **SDK / transport as a source of phantom bugs.** MIME-type lies, futex hangs on unknown enums, Batch API ignoring aspect ratio, `fileData` vs `inlineData` producing text-only replies — a large share of "model is broken" reports are actually plumbing bugs in `google-genai` or the Batch API, not the model.

## Implications for a Prompt Enhancer

- Never trust a short or ambiguous user prompt to stay literal — Imagen rewrites it under 30 words by default (#4). If reproducibility matters, set `enhancePrompt: false` or pre-expand the prompt yourself.
- Plan for `IMAGE_SAFETY` / `NO_IMAGE` / `STOP` / `IMAGE_PROHIBITED_CONTENT` as **distinct** error classes in the response parser, and guard enum-access with a timeout to avoid SDK deadlocks (#7, #8).
- For identity-critical edits (brand logos, surreal characters, minor celebs, statues), assume Nano Banana Pro will pull toward the median and plan reference-image strategy plus anti-realism clauses accordingly (#5, #11).
- If the product needs transparent PNGs, do the white/black two-pass alpha trick at the output stage (#2).
- Prefer `realistic digital illustration` style cues over `anime` to reduce safety-filter false positives when the subject matter is otherwise benign (#12).
- Validate `inline_data` bytes against magic numbers before forwarding to other APIs (#9).

## Sources

Primary / high-signal (used in synthesis):

1. Max Woolf — *Nano Banana Pro is the best AI image generator, with caveats* (Dec 2025). https://minimaxir.com/2025/12/nano-banana-pro/
2. Yael Walker — *Unexpected Effects of GDPR on Image Generation* (Sep 2025). https://yaelwalker.com/blog/nano-banana/
3. googleapis/python-genai #2024 — *Indefinite hang accessing finish_reason when API returns IMAGE_SAFETY or NO_IMAGE* (Feb 2026). https://github.com/googleapis/python-genai/issues/2024
4. googleapis/python-genai #1824 — *Image generation returns incorrect mime_type* (Dec 2025). https://github.com/googleapis/python-genai/issues/1824
5. google-gemini/cookbook #1018 — *aspectRatio parameter is not supported in Nanobanana Batch API* (Oct–Nov 2025). https://github.com/google-gemini/cookbook/issues/1018
6. google-gemini/cookbook #568 — *Image Generation API Rejects Generic Prompts Due to Content Policy*. https://github.com/google-gemini/cookbook/issues/568
7. pollinations/pollinations #6070 — *Nanobanana outputting square images with ref_image*. https://github.com/pollinations/pollinations/issues/6070
8. pydantic/pydantic-ai #3119 — *Support for aspect ratio control in nano-banana*. https://github.com/pydantic/pydantic-ai/issues/3119
9. Google AI Developers Forum #86828 — *Imagen 4.0: Long Contextual Prompts Rendered as Text*. https://discuss.ai.google.dev/t/imagen-4-0-api-issue-long-contextual-prompts-rendered-as-text-instead-of-creative-guidance-multimodal-alternative-needed/86828
10. Google AI Developers Forum #114965 — *Nano Banana Pattern Extraction Fails*. https://discuss.ai.google.dev/t/gemini-2-5-flash-image-nano-banana-api-image-pattern-extraction-fails-always-returns-original-image/114965
11. Gemini Apps Community — *Feature request: transparent backgrounds*. https://support.google.com/gemini/thread/388691969/
12. r/GeminiAI — *Enshittification of Nano Banana Pro*. https://www.reddit.com/r/GeminiAI/comments/1rs58vz/
13. r/GeminiAI — *Nano Banana Pro: "I'm having a hard time fulfilling your request" only on Gemini app (API works)*. https://www.reddit.com/r/GeminiAI/comments/1r5h1hq/
14. Allen Kuo — *Removing Gemini AI Watermarks: Reverse Alpha Blending* (Medium). https://allenkuo.medium.com/removing-gemini-ai-watermarks-a-deep-dive-into-reverse-alpha-blending-bbbd83af2a3f
15. allenk/GeminiWatermarkTool — SynthID research report. https://github.com/allenk/GeminiWatermarkTool/blob/main/report/synthid_research.md
16. pilio.ai — *How Gemini image watermarks are added, and how to remove them losslessly*. https://pilio.ai/blog/gemini-watermark-how-it-works
17. Google DeepMind — *SynthID*. https://deepmind.google/science/synthid
18. Google — *What happened with Gemini image generation* (Feb 2024). https://blog.google/products/gemini/gemini-image-generation-issue
19. Vertex AI docs — *Use prompt rewriter*. https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/use-prompt-rewriter
20. AI Free API — *Gemini No Image / IMAGE_SAFETY Troubleshooting Guide* (Mar 2026). https://aifreeapi.com/en/posts/gemini-image-silent-failure-image-safety-fix
21. AI Free API — *Why Nano Banana Pro Refuses Your Image Prompt*. https://aifreeapi.com/en/posts/nano-banana-pro-image-generation-refused
22. juheapi.com — *Nano Banana 2 Multi-Turn Editing Test*. https://www.juheapi.com/blog/nano-banana-2-multi-turn-editing-test-iterating-on-single-image-5-rounds
23. CNET — *I Tried Gemini's "Nano Banana" for Image Editing*. https://www.cnet.com/tech/services-and-software/geminis-nano-bananas-ai-image-editing-is-fun-but-I-ran-into-too-many-slipups/
24. bananathumbnail.com — *7 Gemini Nano Banana Mistakes Killing Your Edits*. https://blog.bananathumbnail.com/gemini-nano-banana-3/
