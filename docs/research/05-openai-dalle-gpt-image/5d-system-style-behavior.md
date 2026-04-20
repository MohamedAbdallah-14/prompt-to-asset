---
title: "Style & System-Instruction Behavior on gpt-image Models"
category: 05-openai-dalle-gpt-image
angle: 5d
slug: 5d-system-style-behavior
summary: >
  How gpt-image-1 / gpt-image-1-mini / gpt-image-1.5 respond to
  system-level messages, developer instructions, and layered prompts.
  Covers the Responses-API `instructions` channel vs the flat
  `/v1/images` prompt, quality-vs-adherence tradeoffs, multi-image
  consistency, moderation tiers, and whether safe-zone / transparent
  padding for app icons can be driven by prompt alone.
research_value: high
last_updated: 2026-04-19
---

## Executive Summary

`gpt-image-1` and its successors (`gpt-image-1-mini`, `gpt-image-1.5`)
have two very different control surfaces, and style-instruction
behavior depends on which one you use.

1. The **Image API** (`/v1/images/generations`, `/v1/images/edits`)
   accepts only a single `prompt` string plus structural knobs
   (`quality`, `size`, `background`, `output_format`, `input_fidelity`,
   `moderation`). There is no `system` or `developer` role here — the
   prompt is the entire linguistic channel.
2. The **Responses API** (`/v1/responses` with
   `tools:[{"type":"image_generation"}]`) routes through a mainline
   LLM (e.g. `gpt-5`/`gpt-5.4`) that *does* honor the normal OpenAI
   chain-of-command (`developer` ≻ `system` ≻ `user`). That mainline
   model **rewrites** whatever the user says into a `revised_prompt`
   before calling the image tool, and that is where "system-level style
   instructions" actually bind.

Practically this means: if you want a durable house style, brand
palette, or safety/composition rule to apply across a session, put it
in the Responses API `instructions` / developer message and let the
LLM fuse it into every image call — not in a sidecar config. If you
are calling the Image API directly, there is no hidden "system
channel," so the entire style contract has to live in the prompt
string, and consistency across a set depends on either
`previous_response_id`, reusing the `image_generation_call` ID, or
feeding prior outputs back through the edits endpoint with
`input_fidelity="high"`.

Quality settings (`low`/`medium`/`high`) trade compute per pixel, not
resolution. Text rendering, fine typography, and transparent-edge
quality all degrade noticeably at `low`, and OpenAI's own cookbook
tells you to bump to `high` for text-dense or transparency-sensitive
work. Moderation is a blunt two-tier switch (`auto` / `low`) layered
on top of standard usage-policy filtering and mandatory API org
verification; it does **not** give you the sort of category-by-category
control the text moderation endpoint does. Safe-zone / padding for app
icons can be partially steered by prompt language ("single centered
logo with generous padding," "subject centered with negative space"),
but OpenAI documents composition control as a known weakness — for
reliable icon safe zones you should render larger than target at
`transparent` `png` / `medium`-or-`high` and post-process.

## Key Findings

### 1. There are two style-instruction surfaces, and only one has a system role

OpenAI currently ships three GPT Image models (`gpt-image-1.5` as the
flagship, `gpt-image-1` as the April-2025 original, `gpt-image-1-mini`
as the cheap tier).[1][2] All three are reached through the same two
API surfaces, with meaningfully different instruction semantics.

**Image API (`/v1/images`).** The request schema is a single `prompt`
plus structural parameters (`quality`, `size`, `background`,
`output_format`, `output_compression`, `input_fidelity`, `moderation`,
`n`, and — on the edits endpoint — `image[]` and `mask`).[1][3] There
is no role field, no system message, no `instructions` parameter.
Anything that would normally live in a system prompt has to be
serialized into the prompt string itself.

**Responses API (`/v1/responses` + image tool).** Here the call is
made against a mainline LLM (any GPT-4o-era or newer model per the
current docs), with `tools:[{"type":"image_generation", ...}]`.[3][4]
The Responses API follows OpenAI's standard chain-of-command: "a
message input to the model with a role indicating instruction
following hierarchy. Instructions given with the `developer` or
`system` role take precedence over instructions given with the `user`
role."[5] There is also a top-level `instructions` parameter, and
crucially "when using along with `previous_response_id`, the
instructions from a previous response will not be carried over" — so
you can swap system prompts between turns without rebuilding the whole
history.[5]

The important implementation detail is that the mainline LLM is the
one reading your developer/system message; the image model itself
receives a **text prompt** synthesized by that LLM. OpenAI surfaces
this as `revised_prompt` in the `image_generation_call` output, and
the docs state explicitly that "the mainline model automatically
revises your prompt for improved performance."[3][4] So every "system
message" is effectively a style brief that the orchestrator LLM
translates into concrete imagery language for the image model.

Consequences for practitioners:

- A developer-role message like *"All images use our brand palette
  #0F172A / #E11D48 / #F8FAFC, vector flat style, 8-px rounded
  corners, never render human faces"* will propagate across a Responses
  session because it is preserved by the LLM and re-injected into each
  `revised_prompt`.
- The same instruction passed to `/v1/images/generations` will work
  for **one** call only and has to be re-prepended verbatim every
  request.
- Because `revised_prompt` is visible in the response, you can use it
  to audit whether a system-level rule actually landed in the image
  call — a lightweight style-guardrail loop.

### 2. "Instructions on top of prompt" — layering, override, and drift

There is no formal "system prompt / style preset" field on the image
model itself, but OpenAI's prompting guide and high-fidelity cookbook
implicitly document what stacks and how it survives layering.[6][7]
Three behaviors stand out:

**Constraint stacking works; order matters.** The 1.5 prompting guide
explicitly recommends a fixed clause order — "background/scene →
subject → key details → constraints" — and notes that for complex
requests, "use short labeled segments or line breaks instead of one
long paragraph."[6] Constraints stated last (e.g., "no watermark, no
logos, preserve geometry") tend to hold; constraints buried in the
middle of a subject description drift. Treat the prompt as a brief
whose final lines are the hard rules.

**"Change only X, keep everything else the same" is the recommended
override pattern on edits.** For multi-turn workflows, repeating the
*preserve* list on every turn is explicitly required to prevent
drift.[6] This is the cookbook's concrete answer to "how do I override
only one attribute without losing the rest."

**Prompt rewriting is non-deterministic and you cannot fully
suppress it.** Every image tool call exposes `revised_prompt` precisely
because the mainline LLM and (internally) the image model both
restructure the text.[3][4] There is no documented `prompt_rewriting:
"off"` flag, unlike DALL·E 3's public option of the same name. The
practical mitigation is to write prompts that *survive* rewriting:
quote literal text, spell brand names letter-by-letter, and restate
invariants as explicit lists.[6]

### 3. Consistency across a set of generations

OpenAI's own docs list consistency as a known limitation: "the model
may occasionally struggle to maintain visual consistency for recurring
characters or brand elements across multiple generations."[3] Four
mechanisms exist for pushing back against that:

1. **`previous_response_id` or inline `image_generation_call` IDs in
   the Responses API.** The conversation carries visual context, so
   phrasing like "same style as before" or "same character, new
   scene" works within a session.[3] This is the cheapest way to get
   a 4-panel comic or a storyboard to cohere.
2. **`input_fidelity="high"` on the edit endpoint.** Defaults to
   `low`. When set to `high`, the model preserves faces, logos, and
   distinctive textures from the input images at noticeably higher
   cost in input tokens.[7] The first image in the `image[]` list
   gets *extra* texture richness; subsequent images are preserved with
   high fidelity but less finely. For brand/logo consistency across a
   campaign, concatenating brand assets into a single composite and
   passing it as image 1 is the documented workaround.[7]
2. **Reference-image compositing.** The edit endpoint accepts up to 16
   images and the prompting guide recommends referencing them by
   index and role ("Image 1: product photo… Image 2: style
   reference… apply Image 2's style to Image 1").[3][6]
4. **Anchor-image pattern for character consistency.** The 1.5
   cookbook spells out a two-step pipeline — generate a "character
   anchor" with a tight style/outfit spec, then feed that anchor as
   an input image on every subsequent page with the instruction "do
   not redesign the character."[6] This is functionally a lightweight
   LoRA substitute driven entirely by prompting + edit-with-reference.

None of this produces bit-exact consistency. For pixel-tight brand
work (exact Pantones, exact glyph shapes), current community and
cookbook consensus is to treat gpt-image as a *first-draft* generator
and composite real brand assets on top in post.[6][7]

### 4. Prompt-adherence tradeoffs at different quality settings

`quality` controls compute-per-pixel, not output resolution. The
published token counts for a 1024×1024 square are:[3]

| Quality | Tokens (1024²) | Tokens (1024×1536) | Tokens (1536×1024) | ≈ per-image price |
|---|---|---|---|---|
| `low`    |   272 | 408  | 400  | ~$0.011 |
| `medium` | 1,056 | 1,584 | 1,568 | ~$0.050 |
| `high`   | 4,160 | 6,240 | 6,208 | ~$0.200 |

Observed behavioral differences (docs + cookbook + community):[3][6][8]

- **Text rendering** falls off a cliff at `low`. For infographics or
  in-image typography, the prompting guide explicitly says "set output
  generation quality to `high`."[6]
- **Fine detail and materials** are the other main casualty at `low`
  — skin pores, fabric weave, photoreal textures need `medium`+ to
  survive, which is why the photorealism and virtual try-on recipes
  pin `quality="high"`.[6]
- **Transparency edges** visibly degrade at `low`. OpenAI's docs state
  "Transparency works best when setting the quality to `medium` or
  `high`."[3]
- **Layout / composition-heavy prompts** (multi-panel comics, precise
  placement) also benefit from `high`, because the model has more
  tokens to spend resolving the structural constraints.[6]
- **Latency.** High quality can approach the documented 2-minute
  ceiling for complex prompts.[3] For latency-critical paths, the
  cookbook's advice is to *start* at `low` and evaluate — in many
  cases it's sufficient, and the step up to `medium`/`high` is the
  exception.[6]

Adherence to hard constraints (no text, transparent background,
specific count of objects) is more sensitive to prompt *structure*
than to quality — labeled segments and explicit `Constraints:` blocks
help far more than bumping from `low` to `high`.[6]

### 5. Moderation behavior

Moderation on GPT Image is deliberately coarse compared to the text
moderation endpoint.

- **Two-tier switch.** The `moderation` parameter (Image API and
  Responses image tool) accepts `"auto"` (default, "seeks to limit
  creating certain categories of potentially age-inappropriate
  content") and `"low"` ("less restrictive filtering").[3] There is
  no per-category dial analogous to the `omni-moderation-latest`
  endpoint, which breaks content into violence, sexual, harassment,
  self-harm, etc.[9]
- **Org verification gate.** GPT Image models require API Organization
  Verification before use, independent of the moderation setting.[3]
- **Prompt rewriting interacts with moderation.** Because the mainline
  LLM produces `revised_prompt`, the rewrite itself can soften or
  strip borderline language before the image model sees it. This is
  why prompts that pass in the Responses API sometimes fail verbatim
  on the Image API.[3]
- **`safety_identifier` isolates per-user enforcement.** Hashed user
  identifiers (send a hashed email or a session ID) let OpenAI apply
  safety actions to one end-user instead of the whole org. Recommended
  for any multi-tenant app generating on behalf of end users.[10]
- **Resource-level blocks are real.** On Azure OpenAI, repeated
  policy violations can 403 the entire deployment with a
  `FORBIDDEN — resource has been temporarily blocked` error, sometimes
  lasting days or weeks.[11] This is the main argument for
  `safety_identifier` and for filtering prompts with the text
  moderation endpoint *before* calling the image endpoint.
- **C2PA tagging is non-optional.** All gpt-image outputs ship with
  C2PA content credentials ("AI Generated Image"; software agent
  "OpenAI" or "Azure OpenAI ImageGen"), signed and tamper-evident.[12]
  Downstream pipelines that strip metadata (screenshot, re-encode via
  certain libraries) will lose this; its presence is informative, its
  absence is not.[12][13]

### 6. Safe-zone / transparent padding for app icons via prompt alone

This is the hardest ask of the six, because it is exactly where
OpenAI's own "Limitations" note "composition control: …may have
difficulty placing elements precisely in structured or layout-sensitive
compositions."[3] The realistic answer is *mostly yes, with caveats*.

**What works from the prompt:**

- `background: "transparent"` + `output_format: "png"` (or `webp`) +
  `quality: "medium"` or `"high"` reliably yields an RGBA output with
  alpha.[3] `quality: "low"` produces crunchier edges and should be
  avoided for icons.
- Padding/safe-zone language that echoes the logo cookbook example
  ("a single centered logo with generous padding," "clean vector-like
  shapes, …balanced negative space," "Plain background.") works on
  `gpt-image-1.5` in practice.[6]
- Explicit placement cues from the prompting guide: "subject centered
  with negative space on left," "logo top-right," "center-aligned"
  —call this out as a distinct line, not buried in the subject
  description.[6]
- For icon shape constraints (rounded-square, squircle, circle mask),
  state them as output-spec lines: *"Output: 1024×1024 RGBA PNG, icon
  fits inside a centered 820×820 squircle safe zone, uniform padding
  on all four sides, no cropping."*

**What does not reliably work:**

- Exact pixel padding. The model does not *measure* the canvas; "32 px
  safe zone" is interpreted as an intent, not a constraint. The
  remedy is either to generate at higher resolution and programmatically
  trim to target, or to use the edits endpoint with a mask that
  defines the safe zone explicitly.
- Transparent backgrounds on the **edits** endpoint historically
  returned a solid-white JPEG even when the prompt asked for PNG
  transparency.[14] OpenAI later exposed `background: "transparent"`
  on `/v1/images/edits` as well, which resolves the default case, but
  *prompt-only* transparency on edits remains unreliable on older
  deployments; always pass the parameter.[14]
- Preventing the model from drawing a faux background inside the
  transparent area. The model will sometimes paint a subtle tinted
  circle or drop-shadow rectangle behind the icon. Counter with
  explicit negatives ("no background shape, no drop shadow, no frame,
  no color fill outside the mark itself") plus the `background`
  parameter.

**Recommended icon recipe (prompt-alone, single call):**

```
Create a single centered app icon for <app description>.
Style: flat vector, solid shapes, <palette>, no gradients, no bevels.
Composition:
- Icon is centered in the canvas.
- Icon occupies roughly the central 70% of the frame.
- Uniform generous padding on all four sides (visual safe zone).
- No background fill, no frame, no drop shadow, no decorative elements.
Constraints:
- Transparent background.
- No text, no watermark, no logos of other brands.
- Crisp edges, scalable to 32x32 without losing recognizability.
```

Call with `model="gpt-image-1.5"`, `background="transparent"`,
`output_format="png"`, `size="1024x1024"`, `quality="high"` (or
`"medium"` for iteration). Expect ~10-20% of outputs to still ignore
one constraint (usually the "no background shape" rule), consistent
with the published composition-control limitation.[3][6]

## Tools

- **Image API** (`/v1/images/generations`, `/v1/images/edits`) —
  single-shot, no role/system hierarchy, flat `prompt`.[1][3]
- **Responses API image tool** — developer/system messages via
  `instructions`, preserved across `previous_response_id`, prompt
  rewriting surfaced as `revised_prompt`.[3][4][5]
- **`input_fidelity="high"`** — on edits, preserves first reference
  image with extra texture richness for faces/logos/brand.[7]
- **`background="transparent"`** + `png`/`webp` — the only documented
  path to alpha output; works on both generate and edits.[3][14]
- **`moderation="auto" | "low"`** — the only moderation lever on the
  image endpoint itself.[3]
- **`safety_identifier`** — hashed end-user ID; isolates enforcement
  to one user instead of the whole org.[10]
- **`omni-moderation-latest`** (free) — category-level pre-filter for
  text prompts before they hit the image endpoint.[9]
- **C2PA verifiers** — `contentcredentials.org/verify`, CAI open-source
  tools — for detecting stripped/intact provenance on outputs.[12][13]

## Open Questions

1. **Does the Responses-API mainline LLM ever block a `revised_prompt`
   before it reaches the image model, or does moderation only happen
   inside the image model?** The docs do not spell out whether
   developer-role instructions can expand the allowed surface beyond
   the image model's baseline filter, which matters for enterprise
   deployments.
2. **Is there a way to suppress prompt rewriting entirely?** DALL·E
   3 had an explicit opt-out; gpt-image does not document one. Teams
   that want deterministic output currently have no supported hook.
3. **Why does `input_fidelity="high"` only weight the first image
   extra-richly?** The cookbook footnote implies an implementation
   detail rather than a fundamental constraint; workarounds
   (composited canvases) are in active use but feel like scaffolding.
4. **How stable is cross-session style consistency when a developer
   message is reused verbatim across thousands of Responses calls?**
   Anecdotally it drifts less than cross-session Image-API calls, but
   no public benchmark separates "Responses-API style stickiness"
   from "mainline LLM creativity variance."
5. **Will OpenAI expose per-category moderation on image endpoints?**
   The current `auto` / `low` binary is coarse; enterprise use cases
   (e.g., allow medical but block sexual) currently require external
   pre-filtering plus `safety_identifier` plumbing.
6. **Does `gpt-image-1-mini` follow system instructions as faithfully
   as `gpt-image-1.5`?** OpenAI markets it as a cost tier, not a
   reduced-capability tier, but public adherence benchmarks across
   mini vs flagship gpt-image siblings are thin.

## References

1. [GPT Image 1 Model — OpenAI API](https://developers.openai.com/api/docs/models/gpt-image-1) — primary model-card, lists endpoints, parameters, and limitations.
2. [OpenAI — "Introducing our latest image generation model in the API"](https://openai.com/index/image-generation-api/) — April 23, 2025 launch announcement for gpt-image-1.
3. [Image generation — OpenAI API Guide](https://platform.openai.com/docs/guides/image-generation?api=responses&image-generation-model=gpt-image-1) — canonical guide covering Image API vs Responses API, quality tiers, transparency, moderation, composition limitations, token/price tables.
4. [Image generation tool — OpenAI API Guide](https://developers.openai.com/api/docs/guides/tools-image-generation) — Responses-API-specific behavior of `image_generation`, `revised_prompt`, `action`, and tool control.
5. [Create a model response — OpenAI API Reference (`/v1/responses`)](https://developers.openai.com/api/docs/api-reference/responses/create) — definitive reference for `instructions`, the developer/system/user role hierarchy, and `previous_response_id` semantics.
6. [gpt-image-1.5 Prompting Guide — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/) — prompt-structure conventions, multi-image referencing, logo/icon prompts, character-anchor pattern for consistency.
7. [Generate images with high input fidelity — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity) — semantics of `input_fidelity="high"`, face/logo preservation, first-image-gets-extra-richness detail.
8. [GPT-image-1 quality parameter — OpenAI Developer Community](https://community.openai.com/t/gpt-image-1-quality-parameter/1246424) — user-reported behavior of `low`/`medium`/`high`, text rendering at low.
9. [Moderation — OpenAI API Guide](https://platform.openai.com/docs/guides/moderation?example=images) — `omni-moderation-latest` as a pre-filter, category coverage.
10. [How to Incorporate a Safety Identifier — OpenAI Help Center](https://help.openai.com/en/articles/5428082-how-to-incorporate-a-userid) — `safety_identifier` parameter, hashing recommendation, per-user isolation of enforcement.
11. [Pollinations — `gptimage` resource blocked (issues #9319 / #9707)](https://github.com/pollinations/pollinations/issues/9319) — documented resource-level 403 from repeated content-policy violations.
12. [C2PA in ChatGPT Images — OpenAI Help Center](https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images) — what C2PA metadata contains, how it survives vs is stripped.
13. [Content Credentials in Azure OpenAI — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/concepts/content-credentials) — Azure's view of C2PA manifest, "Azure OpenAI ImageGen" software agent identifier.
14. [gpt-image-1 — Transparent backgrounds with Edit request — OpenAI Developer Community](https://community.openai.com/t/gpt-image-1-transparent-backgrounds-with-edit-request/1240577) — confirms edit-endpoint transparency was initially broken prompt-only and later fixed by exposing `background="transparent"` on `/v1/images/edits`.
