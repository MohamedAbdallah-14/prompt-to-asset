---
category: 05-openai-dalle-gpt-image
angle: 5d
title: DALL·E 3 / gpt-image failure modes, text quirks, and moderation traps for software assets
summary: Catalog of reproducible failure classes across DALL·E 3, gpt-image-1, gpt-image-1-mini, and gpt-image-1.5 that matter for generating logos, icons, UI mockups, and other software assets. Covers text rendering behavior (where the 2025 `gpt-image` line leap-frogged DALL·E 3 but still trails Ideogram), anatomical artifacts, moderation false positives (trademarks, "in the style of", celebrities, pop-culture references blocked on `gpt-image-1` but allowed on DALL·E 3), prompt-rewriter tampering (`revised_prompt`), aspect-ratio cropping behavior, the "piss filter" warm-color bias, and multi-edit quality decay. Sources span OpenAI Developer Community threads, GitHub issues, OpenAI's own API reference, and the GPT-ImgEval benchmark paper (arXiv 2504.02782).
research_value: high
sources_primary: 18
date_range: 2023-10 to 2026-04
---

> **Updated 2026-04-21:** OpenAI relaxed content moderation policies for public figures in early 2026; see Failure #5 (celebrity/public-figure refusal) update below. The blanket named-person refusal is no longer universal — context-sensitive filtering now applies. DALL·E 3 remains accessible but sunsets **2026-05-12**; cross-routing to DALL·E 3 as a moderation workaround (Failure #18) will become unavailable after that date.

**Research value: high** — OpenAI's image surface has two very different models still in production (DALL·E 3, `gpt-image-1` family) and at least four distinct control paths (`/v1/images/generations`, `/v1/images/edits`, Responses API image-generation tool, ChatGPT UI). Each has its own refusal pattern, prompt-rewriter behavior, and artifact class. For software-asset generation — where text fidelity, brand neutrality, and predictable framing matter — ignoring these differences produces silently broken pipelines.

## Executive Summary

Three things should drive prompt-to-asset behavior for OpenAI image models:

1. **Text rendering is a stratified capability, not a binary one.** DALL·E 3 reliably mangles anything past a short word. `gpt-image-1` (Mar 2025) clears single-line headings and simple signage but still garbles small/dense text. `gpt-image-1.5` (Dec 2025) closes most of that gap for UI-mockup-style text but still loses to Ideogram 3.0 on multi-line and stylized typography. For a logo or icon pipeline, the only defensible approach is to *not rely on the model to spell*: vectorize separately, or add text in post.
2. **Moderation is non-uniform across OpenAI's own endpoints.** Pop-culture prompts that DALL·E 3 accepted are being rejected by `gpt-image-1` with `moderation_blocked` (documented in the OpenAI Developer Community, May 2025). The `moderation: "low"` parameter only exists on `gpt-image-*` models, not DALL·E 3, and does not disable the C2PA watermark or the prompt-level safety classifier — only the output-side filter.
3. **There is no way to fully opt out of the prompt rewriter.** DALL·E 3 returns the applied rewrite in `revised_prompt`; OpenAI staff have explicitly said it cannot be disabled "for precisely the reason of…trying to generate an image of a specific individual". The community workaround — prefixing prompts with "I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS:" — is a softener, not a kill-switch, and must be paired with reading `revised_prompt` back on every call to detect drift.

The rest of the document is the failure taxonomy and the mitigations that fall out of it.

## Failure Taxonomy

| # | Failure | Frequency | Scope | Workaround | Root cause |
|---|---------|-----------|-------|------------|------------|
| 1 | Text garbled / misspelled | Very high on DALL·E 3; moderate on `gpt-image-1`; low on `gpt-image-1.5` | All text in images | Keep text ≤ 3 words, use `gpt-image-1.5` or Ideogram for longer strings, add text in post | CLIP-era text encoder on DALL·E 3; newer T5-XXL / LLM encoder on `gpt-image-1.5` closes but does not eliminate the gap |
| 2 | DALL·E 3 prompt rewriter mutates intent | Always (cannot be disabled) | DALL·E 3 everywhere; `gpt-image-1` via ChatGPT UI | Read `revised_prompt` field every call; prefix short prompts with "DO NOT add any detail, just use it AS-IS:"; write long explicit prompts that leave the rewriter less to do | Safety + diversity layer injected before the image model; OpenAI staff say it is non-optional |
| 3 | `gpt-image-1` refuses prompts DALL·E 3 allowed | Moderate on pop-culture / brand-adjacent prompts | `gpt-image-1` API only | Set `moderation: "low"` where allowed; restructure prompt to describe the asset abstractly (geometry, style) without the trademark word | Newer model shipped with tighter output-side classifier than DALL·E 3; inconsistent between endpoints |
| 4 | "In the style of \<living artist\>" refusal | High when artist is post-1912 | DALL·E 3 and `gpt-image-1` | Describe the style descriptively ("thick black outlines, flat color, halftone dots") instead of naming the artist | Explicit OpenAI policy: no living-artist style, no post-1912 artists; designed-in, not a bug |
| 5 | Celebrity / public-figure refusal | **Reduced in 2026** — now moderate for named politicians/public figures; still high for Disney/Marvel/Star Wars IP | All OpenAI image models | Named politicians and public figures now generally allowed in non-harmful contexts (moderation policy relaxation, early 2026); Disney/Pixar characters remain off-limits; describe fictional characters by features | Named-entity detector now context-sensitive; likeness classifier still runs on output; Disney IP enforced separately |
| 6 | Hands / fingers / eyes distortion | High on complex scenes; lower on centered portraits | All diffusion-based image models | Use `quality: "high"`; avoid interlaced hands; regenerate with negative-space language ("hands at sides, fingers relaxed, visible thumb") | Well-known diffusion / AR artifact; the GPT-ImgEval paper (arXiv 2504.02782) explicitly calls out anatomical artifacts in GPT-4o image generation |
| 7 | Square (1024×1024) images crop subject's head/feet | Reproducible; documented by OpenAI staff response | `gpt-image-1` with `size: "1024x1024"` | Add "zoomed out, viewed from a distance, head-to-toe, 5% margin" language; or request the portrait size `1024x1536` | "Not enough separate post-training on each aspect ratio", per the OpenAI forum deep-dive; the AR head predicts image length and then truncates to fit |
| 8 | `background: "transparent"` returns JPEG with black background | Reproducible; open bug as of Mar 2026 | `gpt-image-1` via some wrappers (Pollinations #7266) | Validate `Content-Type` header after the call; fall back to background-removal (BRIA RMBG, rembg) | Provider-side header mislabeling; the underlying model can emit alpha but transport occasionally lies |
| 9 | Warm / yellow "piss filter" cast | Persistent; user-reported on every `gpt-image-1` release | `gpt-image-1`, `gpt-image-1.5`, Sora stills | Explicit neutral-grade language ("neutral white balance, 6500K, no color grading, flat lighting"); tint-correct in post (`UnYellowGPT` and similar tools) | Training-data bias toward Orange-and-Teal Hollywood grade; compounds across edits |
| 10 | Multi-edit quality decay (grain / desaturation) | Reproducible after 3–5 edit rounds with `input_fidelity: "high"` | `/v1/images/edits` | Re-insert the original reference every N edits; keep the edit chain shallow; compose edits into one prompt | Re-encode/decode cycle through the AR image tokenizer accumulates noise; documented on OpenAI forum thread 1320474 |
| 11 | `moderation_blocked` is charged even though no usable image returned | Intermittent, model-version-dependent | `gpt-image-1-2025-04-23` and peers | Catch HTTP 400 with code `content_policy_violation` and avoid retry loops; pre-screen prompts with the free `omni-moderation` endpoint | Cost is the token generation, not the final image delivery; OpenAI's billing model charges for input+output tokens regardless |
| 12 | Base `gpt-image-1` ignores `system_instruction` style guards | Model-dependent | `gpt-image-1` (not `gpt-image-1.5`) via Responses API | Put the style rules into the user-role prompt, not `instructions`; migrate to `gpt-image-1.5` where the Responses tool respects developer messages | Base `gpt-image-1` treats the image-generation tool call's prompt as the only linguistic channel |
| 13 | Spatial-relation failures ("X to the left of Y") | High across DALL·E 3, moderate on `gpt-image-1.5` | All models | Describe layout as a grid, or split the scene into halves ("square split side-by-side: left half shows…, right half shows…") | Compositional reasoning limit confirmed in arXiv 2511.10136 "Right Looks, Wrong Reasons" |
| 14 | Compositional counting errors ("exactly three apples") | High; does not scale with model size | All models | Either avoid explicit counts or constrain via reference image / grid | Same compositional-reasoning limit; scaling alone does not fix it |
| 15 | C2PA metadata leaks generator identity | Always on `gpt-image-*` | All `gpt-image-1*` outputs | Strip metadata post-generation if the end-user must not know (but OpenAI's ToS requires disclosure) | Designed feature, not a bug; mandatory per OpenAI's content provenance policy |
| 16 | Handwritten / script / decorative fonts illegible | Very high even on `gpt-image-1.5` | Logo / branding use | Generate raster with a plain sans-serif and replace the type in post (Figma, Illustrator) | Typography training skews to printed block text; cursive and calligraphic glyphs are under-represented |
| 17 | Azure deployment of `gpt-image-1.5` returns `moderation_blocked` on benign edits | Reported Feb 2026 | Azure OpenAI, `images/edits` endpoint | File an Azure support ticket; fall back to OpenAI direct endpoint; or use `moderation: "low"` if available on your deployment | Azure's safety classifier wraps OpenAI's and can double-filter; known open ticket on Microsoft Learn Q&A |
| 18 | Pop-culture prompts that DALL·E 3 allowed block on `gpt-image-1` (e.g., "a stormtrooper") | Model-and-date dependent | `gpt-image-1` only | Cross-route: if `gpt-image-1` refuses, retry on DALL·E 3 at lower quality, or rephrase to non-branded primitives | OpenAI Developer Community thread 1252701 (May 2025) shows same prompt passes on DALL·E 3, fails with `content_policy_violation` on `gpt-image-1` |

## Text Rendering Deep-Dive

Text-in-image is the single most consequential capability for software assets — logos, UI mockups, error screens, OG cards. The OpenAI lineage has three distinct tiers.

**DALL·E 3 (Oct 2023)** can emit short, simple text — one-word logos, a three-word tagline — but consistently corrupts anything longer. Community thread 923673 ("Dalle-3 Image quality is BAAAAAD specilly for vector, illustrations and logos") describes vector and logo outputs as "smudgy" with reduced edge quality. Handwritten text is near-total failure.

**`gpt-image-1` (GA Mar 2025)** was OpenAI's first image model with *usable* text rendering — single-line headings, short signage, simple code screenshots. Community thread 1259920 (late 2025) reports reliability up to about one short sentence, after which letters get added, dropped, or scrambled. Independent testing (nestcontent.com, 2026) scored Ideogram 3.0 at ~90% text accuracy, `gpt-image-1` below that, DALL·E 3 / MJ v6.1 at ~30%.

**`gpt-image-1.5` (Dec 2025)** migrated to a Diffusion Transformer with T5-XXL-scale encoders (trendytechtribe.com deep dive, 2025-12-16). First OpenAI image model that handles dense UI-mockup text, infographics, and multi-line marketing copy legibly. LM Arena ranks it #1 as of March 2026 (ELO 1264). Ideogram 3.0 still edges it on stylized typography, but for UI mockups needing plausible readable labels `gpt-image-1.5` clears the bar.

Practical rule — **model-route by text requirement**:

- No text → any model; pick on style / cost.
- 1–3 words → `gpt-image-1.5` or `gpt-image-1`.
- Longer / multi-line → `gpt-image-1.5`; escalate to Ideogram 3.0 for brand-critical.
- Handwritten / script / CJK → none of the OpenAI models. Generate without text and typeset in post.

## Moderation Deep-Dive

OpenAI image models run at least four filters, and software-asset prompts often trip the wrong one.

**(1) Prompt-text classifier** — scans the user prompt for named entities (celebrities, trademarks, post-1912 artists), CSAM indicators, weapons, self-harm, and political figures. Returns HTTP 400 with `code: "content_policy_violation"` if it fires. This is the layer that refuses "in the style of Banksy" or "a Mickey Mouse-style character".

**(2) Prompt rewriter** — *only* on DALL·E 3 (and on the ChatGPT UI's internal DALL·E call). Takes the user prompt, expands it into a much longer, often more specific description, and stores the output in `revised_prompt`. OpenAI staff confirmed on the Developer Community (thread 481664) that it cannot be disabled: *"this cannot be turned off for precisely the reason of what you are doing here, trying to generate an image of a specific individual"*. For `gpt-image-1*`, the rewriter is replaced by the Responses API's mainline LLM — which is more controllable because the developer writes the full prompt — but the ChatGPT app still injects a similar rewrite when calling the image tool.

**(3) Output-side safety classifier** (`moderation` parameter) — runs on the decoded image before return. `"auto"` is default. `"low"` is only exposed on `gpt-image-1*` (not DALL·E 3), and only softens this layer — prompt-text refusals are not affected. When this layer fires post-generation, you still pay for the tokens, and the error is `moderation_blocked`. This is the source of the "charged for a rejected image" complaints on community.openai.com thread 1245636.

**(4) Deployment wrappers** — Azure OpenAI and some third-party hosts (Replicate, Pollinations) run their own safety classifiers on top of OpenAI's. Microsoft Learn Q&A (Feb 2026) has an open ticket where `gpt-image-1.5` edits on Azure return `moderation_blocked` on prompts that work on OpenAI direct.

### Concrete false-positive patterns for software assets

- **Brand-adjacent prompts blocked asymmetrically.** Thread 1252701 (May 2025) documents generic pop-culture prompts — stormtroopers, plumbers in red caps, cartoon mice — that `gpt-image-1` rejects while DALL·E 3 renders something trademark-evasive-but-close.
- **Disney IP closed post-2025.** After Disney's Dec 2024 cease-and-desist to Google and the $1B Sora licensing deal, Disney/Marvel/Star Wars/Pixar IP is unreachable through OpenAI image models outside Sora; refusals are explicit.
- **Public-figure policy relaxation (2026).** As of early 2026, OpenAI relaxed content moderation around public figures: ChatGPT (and the API via `gpt-image-1`/`1.5` with `moderation="auto"`) can now generate images of public figures such as politicians by name in many non-harmful contexts. The 2023–2025 blanket refusal on named public figures is no longer the default; instead a context-sensitive classifier runs. Named living artists remain blocked for style-by-name requests; the broader "no named public figures" policy has been partially lifted. Update prompts-to-asset advice: warn users that named-person outputs are now possible but still require care (likeness abuse remains prohibited). (Source: TechCrunch Mar 2025, OpenAI moderation policy update Mar–Apr 2026.)
- **Metaphor false positives.** Prompts using "attack", "explosion", "gun" even metaphorically ("explosion of color", "gun-metal grey") occasionally trip the prompt-text classifier.
- **Statues vs. living likeness.** "Photorealistic statue of Einstein" passes more often than "photorealistic Einstein"; the named-entity detector is framing-sensitive.
- **Face + logo.** Fine-tuning thread 965280 traced false-positives on industrial-setting training images back to accidental human faces.

### Mitigations

- Pre-screen prompts with the free `omni-moderation` endpoint before the image call.
- Describe brands by geometric / chromatic signature, not name. "Plumber in red with a bushy mustache, overalls, red cap with an 'M'" passes where "Mario" fails.
- Translate living-artist styles to attributes. "In the style of Studio Ghibli" often refuses; "soft watercolor backgrounds, 2D cel animation, pastoral Japanese countryside" does not.
- Cross-route: if `gpt-image-1` returns `moderation_blocked`, the same prompt sometimes renders on DALL·E 3 (empirical, may close as DALL·E 3 is sunset).
- Set `moderation: "low"` on `gpt-image-1*` where end-user liability is accepted; note it only softens the output-side filter.

## Prompt Rewriter Tampering

The prompt sent to the model is often not the prompt the developer wrote. Three flavors:

1. **DALL·E 3 `revised_prompt`.** The API returns the rewritten prompt but cannot be disabled. Thread 679748 workaround: prefix with *"DO NOT add any detail, just use it AS-IS:"*. Short prompts often come back essentially unchanged with the prefix; long prompts use *"My prompt has full detail so no need to add more:"*.
2. **ChatGPT UI injects extra steering.** When DALL·E 3 is invoked via ChatGPT, the app adds diversity / safety / style nudges. Thread 1249557 documents the model admitting to out-of-prompt edits.
3. **Responses API LLM-side rewrites.** The orchestrating LLM can rewrite the prompt en route to the image tool call. You can instruct it "pass the user's prompt verbatim" — less opaque than DALL·E 3's rewriter, but still a drift source.

Stable configuration for a prompt-to-asset:

- **DALL·E 3:** always log `revised_prompt` and treat it as the canonical prompt for subsequent edits.
- **`gpt-image-1*` via `/v1/images/generations`:** no rewriter — the prompt is the prompt. Most controllable path for software assets.
- **`gpt-image-1*` via Responses API:** instruct the orchestrator *"call image_generation with the user's prompt exactly as written"* and log tool-call arguments.

## Aspect-Ratio and Framing Quirks

`gpt-image-1` has a documented "square-crop" bias: for `size: "1024x1024"`, the model predicts a taller composition than the canvas allows and then truncates the top of the head and/or the feet (community thread 1318395, July 2025). OpenAI's own staff responded on the thread attributing this to "not enough separate post-training on each aspect ratio" — the AR head estimates the length it would need for the subject and then crops to fit.

Workarounds:

- Request the portrait size (`1024x1536`) whenever the subject is tall; accept the higher cost.
- Add "5% margin on all sides, head-to-toe, zoomed out, viewed from a distance" to the prompt. This is the consensus forum mitigation.
- For edit flows, control the canvas yourself by passing a pre-padded reference image via the edits endpoint.

DALL·E 3 has a milder version of the same problem — vertical subjects in square frames often come back truncated — but the community workaround is to set the aspect-ratio modifier phrase explicitly in the prompt ("vertical composition, portrait framing") because DALL·E 3's prompt rewriter frequently drops aspect-ratio cues when expanding.

Letterboxing artifacts specifically — solid bars added to reach the requested size — appear occasionally on `gpt-image-1` when a reference image is passed to edits with a mismatched aspect ratio. The model sometimes fills the new area with a muted blur or a duplicated edge pattern rather than painting plausible new content; `input_fidelity: "high"` reduces this by keeping the reference more dominant.

## Other Systematic Artifacts

- **Warm-yellow "piss filter".** `gpt-image-1` has a persistent warm cast users describe as sepia or jaundiced (popularai.org, 2025). It compounds over edits. Explicit neutral-grade language ("6500K white balance, neutral grade, no color filter") partially corrects it; tools like UnYellowGPT post-correct.
- **Hand / finger / eye artifacts.** GPT-ImgEval (arXiv 2504.02782) explicitly flags "synthetic artifacts commonly observed" as a study dimension. Hands and eyes remain the canonical failure for mascots and avatars. `quality: "high"` plus explicit language ("hands relaxed at sides, five fingers each") helps.
- **Edit-chain decay.** 3–5 rounds of `input_fidelity: "high"` edits produce visible grain and desaturation (thread 1320474). Re-inject the original every few rounds.
- **Mask edits treated as soft.** Thread 1240639: `gpt-image-1` often regenerates the whole image despite a tight mask. Reduce prompt scope to only the masked region.
- **Compositional failures.** arXiv 2511.10136 shows DALL·E 3 and peers collapse on multi-constraint prompts ("exactly three red apples to the left of a vase with no flowers"). For UI illustrations with counted objects, use a sketch reference via edits rather than relying on text.

## Prompt Workarounds (Cheat Sheet)

- **Do-not-expand DALL·E 3:** prefix with *"DO NOT add any detail, just use it AS-IS:"*.
- **Square portrait:** append *"zoomed out, head-to-toe, 5% margin, wide framing"*.
- **Real transparency:** `background: "transparent"` on `gpt-image-1*`, validate `Content-Type`, fall back to a background-remover.
- **Text in logo:** keep word-mark ≤ 3 letters; vectorize and re-typeset in post.
- **UI mockup copy:** prefer `gpt-image-1.5`; phrase as *"placeholder text that reads exactly: '<string>'"*.
- **Yellow cast:** prepend *"neutral white balance, 6500K, no Orange-and-Teal filter"*.
- **Trademark-adjacent:** describe geometric / chromatic identity, not the name.
- **Living artist style:** translate to 3–5 concrete visual attributes.
- **Refused on `gpt-image-1`:** retry on DALL·E 3 before rephrasing.
- **Grainy edits:** re-inject original every 3 rounds or merge edits.

## References

Primary OpenAI Developer Community threads and GitHub issues (highest-signal, dated):

1. OpenAI Developer Community — *Gpt-image-1 Moderation Blocks Prompts Allowed by DALL·E 3 (Pop Culture References)* (May 2025). <https://community.openai.com/t/gpt-image-1-moderation-blocks-prompts-allowed-by-dall-e-3-pop-culture-references/1252701>
2. OpenAI Developer Community — *Gpt-image-1 bias towards cropping with 1024x1024 aspect ratio* (Jul 2025). <https://community.openai.com/t/gpt-image-1-bias-towards-cropping-with-1024x1024-aspect-ratio/1318395>
3. OpenAI Developer Community — *Multiple gpt-image-1 high fidelity edits lead to grainy result* (2025). <https://community.openai.com/t/multiple-gpt-image-1-high-fidelity-edits-lead-to-grainy-result/1320474>
4. OpenAI Developer Community — *Gpt-image-1 problems with mask edits* (2025). <https://community.openai.com/t/gpt-image-1-problems-with-mask-edits/1240639>
5. OpenAI Developer Community — *Api error 400 on image generation with gpt-image-1-2025-04-23 but still paying the cost* (2025). <https://community.openai.com/t/api-error-400-on-image-generation-with-gpt-image-1-2025-04-23-but-still-paying-the-cost-of-generation/1245636>
6. OpenAI Developer Community — *Gpt-image-1 — Transparent backgrounds with Edit request* (2025). <https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577>
7. OpenAI Developer Community — *Dalle3 API Prompt Modification* (2023–2024). <https://community.openai.com/t/dalle3-api-prompt-modification/481664>
8. OpenAI Developer Community — *When using the API and a custom function, ChatGPT is rewriting my DALL-E prompt* (2024). <https://community.openai.com/t/when-using-the-api-and-a-custom-function-chatgpt-is-rewriting-my-dall-e-prompt-is-there-a-way-to-stop-that/679748>
9. OpenAI Developer Community — *Dall-e-3 behaviour with revised prompts* (2024). <https://community.openai.com/t/dall-e-3-behaviour-with-revised-prompts/726297>
10. OpenAI Developer Community — *DallE3 Ignoring Prompts - and admitted it is doing so* (2024). <https://community.openai.com/t/dalle3-ignoring-prompts-and-admitted-it-is-doing-so/1249557>
11. OpenAI Developer Community — *Spelling errors and improper text rendering in image model* (2025). <https://community.openai.com/t/spelling-errors-and-improper-text-rendering-in-image-model/1259920>
12. OpenAI Developer Community — *Dalle-3 Image quality is BAAAAAD specilly for vector, illustrations and logos* (2024). <https://community.openai.com/t/dalle-3-image-quality-is-baaaaad-specilly-for-vector-illustrations-and-logos/923673>
13. OpenAI Developer Community — *Image fine tuning, false positive content policy violation* (2025). <https://community.openai.com/t/image-fine-tuning-false-positive-content-policy-violation/965280>
14. OpenAI Developer Community — *Why GPT image API crops original? Please support flexible aspect ratios* (2025). <https://community.openai.com/t/why-gpt-image-api-crops-original-please-support-flexible-aspect-ratios/1244785>
15. pollinations/pollinations #7266 — *The gptimage model with transparency enabled returns a jpeg* (Jan 2026). <https://github.com/pollinations/pollinations/issues/7266>
16. Microsoft Learn Q&A — *Errors with "images/edits" Endpoint for Azure AI gpt-image-1.5/1.0* (Feb 2026). <https://learn.microsoft.com/en-us/answers/questions/5698379/>

Primary OpenAI documentation:

17. OpenAI — *Image generation guide (gpt-image-1)*. <https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1>
18. OpenAI — *DALL·E 3 announcement / policy*. <https://openai.com/blog/dall-e-3>
19. OpenAI API Reference — *Create image*. <https://developers.openai.com/api/reference/resources/images/methods/generate/>

Academic / benchmark papers:

20. Yan et al. — *GPT-ImgEval: A Comprehensive Benchmark for Diagnosing GPT4o in Image Generation* (arXiv 2504.02782, Apr 2025). <https://arxiv.org/abs/2504.02782>
21. Li et al. — *Right Looks, Wrong Reasons: Compositional Fidelity in Text-to-Image Generation* (arXiv 2511.10136, Nov 2025). <https://arxiv.org/abs/2511.10136>
22. Huang et al. — *T2I-CompBench++: An Enhanced and Comprehensive Benchmark for Compositional Text-to-Image Generation* (IEEE TPAMI 2025). <https://arxiv.org/abs/2307.06350>
23. LM Arena — *Text-to-Image Leaderboard* (Mar 2026 snapshot). <https://lmarena.ai/leaderboard/text-to-image>

Independent analysis & corroboration:

24. Trendy Tech Tribe — *GPT Image 1.5 Deep Dive: Text Rendering & Architecture* (Dec 2025). <https://trendytechtribe.com/ai/2025-12-16-gpt-image-1-5-text-rendering-fix/>
25. PopularAI — *ChatGPT's "piss filter": why AI images skew yellow (and how to fix it)* (2025). <https://www.popularai.org/p/chatgpts-piss-filter-why-ai-images>
26. UnYellowGPT — *Fixing the Yellow/Brown (Sepia) Tint in ChatGPT and Sora AI Images* (2025). <https://unyellowgpt.com/blog/fix-yellow-tint-chatgpt-sora-unyellowgpt>
27. PC Gamer — *OpenAI's new DALL·E 3 AI image generator isn't allowed to copy a living artist's style by name* (Oct 2023). <https://www.pcgamer.com/openais-new-dall-e-3-ai-image-generator-isnt-allowed-to-copy-a-living-artists-style-by-name>
28. Yahoo Tech — *Disney just forced Google to stop generating AI images of its characters* (2025). <https://tech.yahoo.com/ai/gemini/articles/disney-just-forced-google-stop-010000308.html>
29. AI Free API — *Fix Sora 2 API Moderation Errors: sentinel_block and moderation_blocked* (2026). <https://www.aifreeapi.com/en/posts/sora-2-api-self-harm-error-fix>
30. Greg Robison — *State of the Art in Neural Image Synthesis: FLUX.2, Nano Banana, and GPT-Image-1* (Medium, 2026). <https://gregrobison.medium.com/state-of-the-art-in-neural-image-synthesis-a-comprehensive-technical-analysis-of-flux-2-c8c6df71512e>
