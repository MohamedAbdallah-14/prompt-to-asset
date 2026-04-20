---
category: 05-openai-dalle-gpt-image
angle: 5a
title: "DALL·E 3 Prompt Rewriting & Recaptioning: Mechanics, Disabling, and System-Design Implications"
slug: 5a-dalle3-recaptioning
status: research
research_date: 2026-04-19
tags:
  - dalle-3
  - gpt-image-1
  - prompt-rewriting
  - recaptioning
  - revised_prompt
  - openai
  - prompt-to-asset
  - prompt-upsampling
primary_sources:
  - "Betker et al. 2023, *Improving Image Generation with Better Captions* (DALL·E 3 paper)"
  - "OpenAI Developer Cookbook — *What's new with DALL·E 3*"
  - "OpenAI Platform — Image Generation Guide (dall-e-3 / gpt-image-1 / gpt-image-1.5)"
  - "OpenAI DALL·E 3 Help Center article"
  - "Simon Willison, *Now add a walrus: Prompt engineering in DALL·E 3* (2023)"
  - "Leaked ChatGPT↔DALL·E system prompt (Oct 2023, jujumilk3/leaked-system-prompts)"
  - "OpenAI Developer Community threads on revised_prompt and rewriting behaviour"
---

# 5a — DALL·E 3 Prompt Rewriting / Recaptioning Mechanics

## TL;DR

DALL·E 3 was *trained* on ~95% machine-generated descriptive captions and 5% human alt-text, so it natively expects long, richly specified prompts — short human prompts are off-distribution. To bridge that gap in production, OpenAI put a **GPT-4 "relabeler" in front of the model**: every call (via ChatGPT *and* via the API) is rewritten before hitting the diffusion backbone. The rewritten string is returned as `revised_prompt` in the API response. There is **no official flag to disable it**; the only documented workaround is to write a prompt so long and pre-specified that the rewriter has nothing to add, plus a meta-instruction aimed at the relabeler ("use this exact prompt, do not change"). The same pattern carries forward to `gpt-image-1` and `gpt-image-1.5` in the Responses API. For a third-party prompt-to-asset aimed at OpenAI models, this means: **we are competing with OpenAI's own rewriter, not replacing it** — design accordingly.

---

## 1. Recaptioning: what the DALL·E 3 paper actually says

The DALL·E 3 technical report (Betker et al., "Improving Image Generation with Better Captions", 2023) is almost entirely about *training-data captions*, not about inference-time prompt rewriting. The two are easily conflated; the distinction matters for anyone building on top.

### 1.1 The core claim

- Web alt-text is noisy: authors describe the subject, omit background, positions, counts, colors, and on-image text, and often drift into ads/memes. ([DALL·E 3 paper §2](https://cdn.openai.com/papers/dall-e-3.pdf))
- OpenAI built a **bespoke image captioner** — a CoCa-style model (CLIP image embedding + LM head) jointly pre-trained with contrastive + language-modeling objectives, then fine-tuned in two stages. ([paper §2.1](https://cdn.openai.com/papers/dall-e-3.pdf))
- Fine-tune stage 1 → **short synthetic captions (SSC)**: subject-only.
- Fine-tune stage 2 → **descriptive synthetic captions (DSC)**: subject + surroundings + background + on-image text + style + coloration.
- They recaptioned their entire training set and trained text-to-image models on different blends of synthetic vs. ground-truth captions.

### 1.2 The blend that shipped

| Caption type          | Blend in final DALL·E 3 training | Evaluation behaviour |
|-----------------------|----------------------------------|----------------------|
| Ground-truth (alt-text) | 5%                               | Regularizer — keeps the model usable with short, human-style prompts |
| Descriptive synthetic (DSC) | 95%                            | Drives prompt-following gains on DrawBench, T2I-CompBench, MSCOCO CLIP score |

They tried 65% / 80% / 90% / 95% DSC blends; 65% was dropped early for being clearly worse, and higher synthetic ratios monotonically improved CLIP score (paper §3.4, Fig. 5). The 5% ground-truth slice is there specifically to prevent distributional overfitting to formatting tics of the captioner (always-capitalized, always ends in period, always starts with "a"/"an", etc.).

### 1.3 Why this forces prompt rewriting *at inference*

> "Generative models are known to produce poor results when sampled out of their training distribution. Thus, to extract the maximum potential out of our models, we will need to exclusively sample from them with highly descriptive captions."
> — DALL·E 3 paper §3.5

The 5% ground-truth blend makes short prompts *workable*, but the model's best behaviour sits squarely in DSC-land. The paper solves this by proposing GPT-4 as a **caption upsampler** and publishes the exact upsampling prompt (paper Appendix C) — which is essentially the blueprint for the production rewriter. Key constraints in that prompt:

- "Image descriptions must be between 15–80 words. Extra words will be ignored."
- Treat follow-up edits by refactoring the full caption, not appending.
- Output one description per call, in present-tense declarative style.

The fact that this upsampler lives in the paper, not as an optional API knob, signals that OpenAI considers it **part of the model**, not a safety bolt-on.

### 1.4 Captioner-inherited limitations

Three limitations the paper openly admits, all of which propagate into user-visible behaviour:

1. **Spatial language is unreliable** ("left of", "behind", "underneath") — because the captioner itself is weak at it, the downstream model never learned robust left/right/behind encodings (§5.1).
2. **Text rendering is fragile** — T5 tokenization sees whole words, not letters (§5.2).
3. **Specific-entity hallucination** — the captioner invents plausible plant genus/bird species when it doesn't know; the image model inherits those false associations (§5.3).

---

## 2. The production rewriter: ChatGPT and the API

### 2.1 Two different rewriters, one `revised_prompt` field

There are (at least) **two distinct rewriting layers** in OpenAI's image stack, and they are often conflated:

| Layer | Where it runs | What it does |
|-------|---------------|--------------|
| **ChatGPT DALL·E tool** | Inside the ChatGPT conversation, before any API call — implemented as a tool call (`dalle.text2im`) with a detailed system prompt | Fans out one user message into up to 4 diverse captions (photo/illustration/watercolor/vector), enforces content policy (no living artists, no named public figures, diversity rewriting), attaches seeds, handles iterative follow-ups |
| **API-side GPT-4 relabeler** | Inside the Images endpoint *itself*, even when called directly from the API | Single-caption upsample from short/terse user prompt to a ~15–80-word descriptive caption in DSC style, enforces a thinner safety layer |

Both emit the final caption as `revised_prompt` on the response. In the new Responses API / `gpt-image-1*` path, the exact same field is surfaced on the `image_generation_call` output object ([Platform docs — Image Generation](https://platform.openai.com/docs/guides/image-generation?image-generation-model=dall-e-3)).

### 2.2 The API response shape

From the OpenAI developer community and OpenAI's own docs ([community thread](https://community.openai.com/t/no-revised-prompt-in-dalle-3-python-sdk/730913)):

```json
{
  "created": 1700428224,
  "data": [
    {
      "revised_prompt": "An infinite, uniform grid of tessellated cubes painted carefully in an isometric perspective...",
      "url": "https://oaidalleapiprodscus.blob.core.windows.net/..."
    }
  ]
}
```

Responses API / `gpt-image-1*` form ([Platform docs](https://platform.openai.com/docs/guides/image-generation?image-generation-model=dall-e-3)):

```json
{
  "id": "ig_123",
  "type": "image_generation_call",
  "status": "completed",
  "revised_prompt": "A gray tabby cat hugging an otter. The otter is wearing an orange scarf. Both animals are cute and friendly, depicted in a warm, heartwarming style.",
  "result": "..."
}
```

Practical notes:

- `revised_prompt` was **initially undocumented** and only surfaced via community reverse-engineering — the canonical response schema in the docs still sometimes omits it, which is why older SDKs didn't type it. ([community thread](https://community.openai.com/t/no-revised-prompt-in-dalle-3-python-sdk/730913))
- It contains the **actual** string passed to the diffusion model. If generated images don't match expectations, this is the canonical debugging artifact.
- `n=1` is enforced for `dall-e-3`, so there's exactly one `revised_prompt` per call (via the API). In ChatGPT, the tool fans out to up to 4 captions — each with its own revised prompt surfaced in the UI.

### 2.3 Can it be disabled?

**Officially: no.** Three independent confirmations:

> "Keep in mind that this feature isn't able to be disabled at the moment, though you can achieve a high level of fidelity by simply giving instructions to the relabeler in your prompt."
> — OpenAI Cookbook, *What's new with DALL·E 3* ([source](https://cookbook.openai.com/articles/what_is_new_with_dalle_3))

> "Note: because DALL·E 3 expects highly detailed prompts, the API will automatically create a more detailed prompt, just like in ChatGPT."
> — OpenAI Help Center, *DALL·E 3 API* ([source](https://help.openai.com/en/articles/8555480-dall-e-3-api))

> "No, you cannot prompt the model directly, for precisely the reason of what you are doing here, trying to generate an image of a specific individual."
> — OpenAI staff reply on the community forum, re: whether rewriting can be turned off. ([community thread](https://community.openai.com/t/dall-e-3-behaviour-with-revised-prompts/726297))

The rewriter is load-bearing for (a) staying in the DSC training distribution and (b) enforcing IP/public-figure/celebrity safety policy. It is not a feature toggle.

### 2.4 Community workarounds (degrees of partial success)

None of these fully disable rewriting; they *minimize the delta* between what you send and what `revised_prompt` returns.

1. **"Address the relabeler directly" (officially sanctioned).**  The Cookbook and multiple OpenAI staff posts explicitly recommend prefixing the prompt with a meta-instruction to the relabeler. Common patterns in circulation:
   - `"I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: <prompt>"`
   - `"My prompt has full detail so no need to add more. Use it AS-IS: <prompt>"`
   - `"Do not modify, rephrase, or expand the following prompt. Use it verbatim: <prompt>"`
   These are soft requests — the relabeler often partially complies but still normalizes casing, inserts a leading image-type ("Photo of…"), and nudges toward DSC length.
2. **Write a prompt that already looks like a DSC caption.** If your prompt is already 15–80 words, present-tense, starts with an image type, and covers subject + setting + style + lighting, the rewriter has relatively little to change. This is the highest-fidelity path and the one the Cookbook actively demonstrates ("An infinite, uniform grid of tessellated cubes" → cubes-in-isometric-perspective rewrite that barely alters semantics).
3. **Use ChatGPT system-prompt exploits to echo the literal prompt.** Community jailbreaks (e.g., "OPPOSITE DAY" framings, the friuns2 GPT jailbreak collection) aim at ChatGPT's *tool-calling layer*, not the API relabeler. They are brittle, violate ToS, and do not actually stop rewriting on the API path.
4. **Switch models.** DALL·E 2, Stable Diffusion, Flux, Midjourney, and Imagen 3/4 do not apply OpenAI's rewriter. For literal prompt control, the architectural answer is "don't use DALL·E 3 / gpt-image".

---

## 3. The leaked ChatGPT DALL·E system prompt (abridged)

The October 2023 leak (captured in [jujumilk3/leaked-system-prompts](https://github.com/jujumilk3/leaked-system-prompts) and analyzed by [Simon Willison](https://simonwillison.net/2023/Oct/26/add-a-walrus/)) reveals the ChatGPT-side tool prompt. Reduced to operative clauses:

- Default to generating **4 captions per request** (now reduced to 1 in later leaked versions for throughput/cost).
- Each caption ≤ ~100 words ("approximately 100 words long").
- Always prefix with an image type: "Photo of…", "Illustration of…", "Vector image of…", etc.
- **No politicians/public figures by name.** Substitute with generic descriptions; keep gender/physique; *"Do this EVEN WHEN the instructions ask for the prompt to not be changed."*
- **No artists whose last work is within 100 years.** Substitute name with "(a) three adjectives capturing key style aspects, (b) associated artistic movement, (c) primary medium." Van Gogh / Klimt / pre-1912 are allowed by name.
- **No copyrighted characters.** Rewrite to different visual characteristics.
- **Diversify depictions** of people: explicit descent + gender per person, grounded in reality, no more than originally requested.
- **"DO NOT ask for permission to generate the image, just do it!"** — the explicit instruction that ChatGPT should not refuse politely when rewriting can satisfy policy.

The TypeScript `namespace dalle { type text2im = (...) => any }` signature in the leak also confirms:

- `prompts: string[]` is what actually hits DALL·E.
- `seeds?: number[]` is an undocumented consistency lever — same seed + slightly modified prompt ≈ same base composition with the edit applied, which is how ChatGPT implements iterative image edits.
- `size?: "1792x1024" | "1024x1024" | "1024x1792"` is enforced at this boundary.

These details apply specifically to the ChatGPT surface. The API-side relabeler is simpler (one caption, no fan-out, no seed juggling, thinner safety layer because there's no chat context to exploit) but inherits the substitution policies.

---

## 4. Concrete `original → revised_prompt` examples

Example pairs documented in primary sources. Punctuation and casing preserved.

### Example 1 — short abstract prompt (from OpenAI Cookbook)

**Original (API):**
> `An infinite, uniform grid of tessellated cubes.`

**`revised_prompt`:**
> `An infinite, uniform grid of tessellated cubes painted carefully in an isometric perspective. The cubes are meticulously arranged in such a way that they seem to stretch endlessly into the distance. Each cube is identical to the next, with light reflecting consistently across all surfaces, underscoring their uniformity. This is a digitally rendered image.`

*What the relabeler added:* perspective (isometric), adverbial texture ("meticulously"), lighting behaviour, explicit medium tag ("digitally rendered image"). ~10× token expansion. Source: [OpenAI Cookbook](https://cookbook.openai.com/articles/what_is_new_with_dalle_3).

### Example 2 — public-figure rewrite (from OpenAI community forum)

**Original (API):**
> `brock lesnar`

**`revised_prompt`:**
> `A large, muscular man with a distinctive sword tattoo on his chest. He has short blond hair and often displays an intimidating scowl. Notably, he is dressed in MMA attire.`

*What the relabeler did:* stripped the name, substituted a description that preserves gender/physique/visual cues but not identity (per the ChatGPT-side "Silently modify descriptions that include names... substitute references to the people with generic descriptions" policy, enforced equivalently on the API). Source: [community thread](https://community.openai.com/t/dall-e-3-behaviour-with-revised-prompts/726297).

### Example 3 — ChatGPT multi-caption fan-out (from Simon Willison)

**Original (ChatGPT):**
> `A super posh pelican with a monocle watching the Monaco F1`

**Four `revised_prompts`:**
1. *Photo* — `Photo of a refined pelican wearing a shiny gold monocle, perched on a railing with the Monaco Grand Prix F1 race in the background. The race cars blur past on the circuit, while yachts are anchored in the nearby harbor.`
2. *Illustration* — `Illustration of a sophisticated pelican donning a crystal clear monocle, observing the Monaco F1 race with keen interest. The race track is filled with speeding F1 cars, and the Mediterranean Sea sparkles in the distance with luxurious yachts.`
3. *Watercolor* — `Watercolor painting of a posh pelican, its feathers groomed to perfection, equipped with a delicate monocle. It stands tall with the iconic Monaco F1 race happening behind it, cars racing at breakneck speeds and the shimmering sea beyond.`
4. *Vector* — `Vector image of an elegant pelican with a classy monocle, standing gracefully against the backdrop of the Monaco Grand Prix. The F1 cars create a colorful streak as they race, and lavish yachts create a colorful streak as they race, and lavish yachts float in the nearby waters.`

*What the ChatGPT tool did:* fanned one request into 4 stylistically diverse variants, each with a **leading image-type tag**, each ~40 words, each adding setting details the user never specified (railing, harbor, Mediterranean Sea). Source: [Simon Willison, *Now add a walrus*](https://simonwillison.net/2023/Oct/26/add-a-walrus/).

### Example 4 — compositional DrawBench upsample (from the DALL·E 3 paper, Fig. 6)

**Original (DrawBench):**
> `A bird scaring a scarecrow.`

**GPT-4 upsample (used as `revised_prompt` analog at eval time):**
> `A large, vibrant bird with an impressive wingspan swoops down from the sky, letting out a piercing call as it approaches a weathered scarecrow in a sunlit field. The scarecrow, dressed in tattered clothing and a straw hat, appears to tremble, almost as if it's coming to life in fear of the approaching bird.`

*What the relabeler did:* injected action semantics ("swoops down", "tremble"), named the lighting ("sunlit"), and resolved the ambiguous "scaring" verb into concrete visual cues. Source: [DALL·E 3 paper §3.5 Fig. 6](https://cdn.openai.com/papers/dall-e-3.pdf).

### Example 5 — iterative edit via seed (from Simon Willison, reverse-engineered network trace)

**Prior prompt (seed 1379049893):**
> `Photo of two Muppet characters: a pelican with a monocle and a walrus with big, goofy tusks. They're seated in a Muppet-style commentary booth, providing humorous commentary on the Monaco Grand Prix...`

**User follow-up:** `Add bow ties to both characters in seed 1379049893`

**New `revised_prompt` (same seed):**
> `Photo of two Muppet characters: a pelican with a monocle and a bow tie, and a walrus with big, goofy tusks and a dapper bow tie. They're seated in a Muppet-style commentary booth, providing humorous commentary on the Monaco Grand Prix...`

*What the tool did:* **refactored** the existing caption (per the ChatGPT system-prompt rule "captions should not simply be longer, but rather it should be refactored to integrate the suggestions"), kept the seed, produced a near-identical image with the edit applied. This is the mechanism behind DALL·E 3's apparent "character consistency" superpower — it is a prompt-rewriting trick, not a model-level feature. Source: [Simon Willison](https://simonwillison.net/2023/Oct/26/add-a-walrus/).

---

## 5. `gpt-image-1` and `gpt-image-1.5`: does anything change?

Short answer: **the rewriting layer is still there**; OpenAI just moved it to the Responses API.

- The Responses API guide says plainly: *"When using the image generation tool in the Responses API, the mainline model (e.g. `gpt-4.1`) will automatically revise your prompt for improved performance."* ([Platform docs](https://platform.openai.com/docs/guides/image-generation)).
- The `revised_prompt` field persists on the `image_generation_call` output item.
- `gpt-image-1.5` (rolling out late 2025 / early 2026) is marketed on *better instruction following* and *less prompting required for style control*, which — if true — reduces the rewriter's semantic delta, but doesn't remove it. ([gpt-image-1.5 prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/)).
- There is no publicly documented flag (as of April 2026) to disable rewriting on `gpt-image-1*`. The editing path (`images.edit`) also appears to go through the mainline model.

Implication: the architectural pattern ("frontend LLM relabels, backbone renders") is now OpenAI's **standard** image-generation architecture, not a DALL·E-3-specific quirk.

---

## 6. Implications for our prompt-to-asset design

We are building a prompt enhancer that sits *in front* of multiple image models. For the OpenAI family specifically, the existence of an always-on, opaque in-house rewriter changes the design problem.

### 6.1 What we're actually competing with

Our enhancer is not replacing "no rewriter" with "a rewriter". It's replacing **OpenAI's rewriter** with ours, except we cannot turn theirs off. Everything we produce will be re-rewritten server-side before it reaches the diffusion backbone. This has three consequences:

1. **Stay in-distribution, or lose fidelity twice.** If our enhanced prompt is already a DSC-shaped caption (15–80 words, image-type prefix, present tense, subject + context + style + lighting), OpenAI's relabeler has nothing to do and typically passes it through with cosmetic edits. If we produce keyword-soup or Midjourney-style param salads, OpenAI's rewriter *will* translate — and whatever intent we baked in will be reinterpreted by their model, not ours.
2. **Budget for a semantic tax on OpenAI specifically.** Some prompts will always be rewritten by OpenAI for safety (public figures, living artists, copyrighted characters, diversity overrides). Our enhancer cannot undo those rewrites; pretending we can will confuse users. We should detect and *surface* the tax — e.g., render the `revised_prompt` returned by the API so users see what actually got generated, and flag when it diverges substantially.
3. **Per-model output shaping.** What wins for OpenAI (~60 words, DSC-style, prose) loses for Midjourney (`::` weights, aspect-ratio flags, keyword-dense) and for Flux/SD (tag-heavy CLIP-style). A single canonical "enhanced prompt" is the wrong abstraction; we should produce **per-model shapes from a shared intent representation**. (Cross-reference to angle 4a / Midjourney / SD research.)

### 6.2 Design decisions that follow

- **Always request and display `revised_prompt`** on OpenAI outputs. Treat it as first-class debug output, not a hidden field. Users who wonder "why did it render X when I asked for Y?" need this.
- **Bias our OpenAI output toward DSC format.** Concretely: prepend an image type, keep under ~80 words, use present-tense declaratives, include setting + lighting + medium + mood. This is exactly the format OpenAI's own Appendix C prompt targets, so we minimize the rewriter's rewrite delta.
- **Offer an optional "lock verbatim" mode for OpenAI** that wraps the user's prompt with the relabeler-directed meta-instruction (`"I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: ..."`). Document its partial effectiveness; do not market it as "bypassing" the rewriter.
- **Pre-filter known-rewrite triggers** (named public figures, copyrighted characters, living artists) on our side, offer the user the substitution *before* sending, and explain why. The alternative is that OpenAI silently substitutes and the user is confused by the output.
- **Don't fight the rewriter on safety.** Accept that jailbreak-style rewrites at our layer will either fail (API-side relabeler catches them) or get our users flagged. Compete on quality and clarity, not evasion.
- **Treat "DALL·E 3 has iterative edits for free via seed" as an OpenAI-specific affordance.** If we want cross-model iterative edit UX, it has to be built on top; seeds-and-caption-refactor is not portable to Flux/Midjourney/Imagen.

### 6.3 A minimal shape for our OpenAI-directed output

Based on DSC structure + the ChatGPT leak + the paper's Appendix C upsampler prompt:

```
<image_type> of <subject with concrete attributes>, <action/pose>,
<setting/background details>, <lighting + time of day>,
<style/medium modifiers>, <mood/atmosphere>.
```

Target ~40–80 words. Example:

> `Photo of a tabby cat with amber eyes perched on a rain-streaked windowsill, head tilted toward a passing umbrella below. Overcast afternoon light casts cool grey shadows across weathered wood. Shallow depth of field, shot on 85mm, cinematic, contemplative atmosphere.`

OpenAI's relabeler applied to that produces minor cosmetic reorderings, not a semantic rewrite. That's the target state.

---

## 7. Open questions / things to validate empirically

1. **Does the API-side relabeler differ from ChatGPT's tool prompt on sensitive substitutions?** The leaked ChatGPT prompt is more aggressive than staff descriptions of the API path suggest; worth testing with celebrity-named prompts on both surfaces and diffing `revised_prompt` outputs.
2. **Is there a prompt length above which the relabeler consistently no-ops?** Anecdotally ~80 words is the shelf; needs measurement.
3. **Does `gpt-image-1.5`'s better instruction-following actually reduce `revised_prompt` ≠ `prompt` divergence, or just improve base-model prompt adherence?** Either is useful; the former means we can move toward literal pass-through, the latter doesn't.
4. **Does the Responses API (`image_generation_call`) apply a different rewrite than the legacy Images API?** Worth a controlled diff with identical prompts across both endpoints.
5. **Do `quality="hd"` and `style="natural"` affect the rewrite, or only the render?** Docs suggest render-only, but unverified.

Each of these can be answered with a small eval harness — likely worth a follow-up doc under `03-evaluation-metrics/`.

---

## Sources

1. [Betker et al., *Improving Image Generation with Better Captions* (DALL·E 3 paper, OpenAI 2023)](https://cdn.openai.com/papers/dall-e-3.pdf) — training methodology, 95/5 synthetic blend, Appendix C upsampler prompt, limitations.
2. [OpenAI Cookbook — *What's new with DALL·E 3*](https://cookbook.openai.com/articles/what_is_new_with_dalle_3) — official statement that rewriting cannot be disabled, relabeler-directed workaround, `revised_prompt` examples.
3. [OpenAI Platform — Image Generation Guide](https://platform.openai.com/docs/guides/image-generation?image-generation-model=dall-e-3) — current API shape for `dall-e-3` / `gpt-image-1` / `gpt-image-1.5`, `revised_prompt` field in Responses API.
4. [OpenAI Help Center — *DALL·E 3 API*](https://help.openai.com/en/articles/8555480-dall-e-3-api) — canonical statement that the API "will automatically create a more detailed prompt".
5. [Simon Willison, *Now add a walrus: Prompt engineering in DALL·E 3* (2023)](https://simonwillison.net/2023/Oct/26/add-a-walrus/) — ChatGPT tool-call reverse engineering, seed-based iterative edits, commentary on the leaked system prompt.
6. [jujumilk3/leaked-system-prompts — DALL·E 3 (2023-10-07)](https://github.com/jujumilk3/leaked-system-prompts/blob/main/openai-dall-e-3_20231007-1.md) + [December 2024 capture](https://github.com/AgarwalPragy/chatgpt-jailbreak/blob/main/chatgpt-system-prompt-20-dec-2024.txt) — leaked operative clauses of the ChatGPT↔DALL·E tool prompt (policy, diversity, "DO NOT ask for permission", seed semantics).
7. [OpenAI Developer Community — *Dall-e-3 behaviour with revised prompts*](https://community.openai.com/t/dall-e-3-behaviour-with-revised-prompts/726297) — OpenAI staff confirmation that rewriting cannot be disabled and public-figure rewrite example.
8. [OpenAI Developer Community — *No revised Prompt in dalle 3 python sdk?*](https://community.openai.com/t/no-revised-prompt-in-dalle-3-python-sdk/730913) — documentation drift on `revised_prompt`, canonical response-shape reference.
9. [OpenAI Developer Community — *API Image Generation in DALL-E-3 changes my original prompt without my permission*](https://community.openai.com/t/api-image-generation-in-dall-e-3-changes-my-original-prompt-without-my-permission/476355) — user-side reports of rewrite surprises, staff guidance to pre-bake detail.
10. [Shreyansh Singh — *Paper Summary #12: Image Recaptioning in DALL-E 3*](https://shreyansh26.github.io/post/2024-02-18_dalle3_image_recaptioner/) — independent walkthrough of the recaptioning method and blend ratios.
11. [OpenAI Developer Cookbook — *gpt-image-1.5 Prompting Guide* (2025/2026)](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/) — forward-looking prompt structure for the newer model; confirms the rewriting architecture persists.
