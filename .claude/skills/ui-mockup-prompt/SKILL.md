---
name: ui-mockup-prompt
description: Translate a UI brief (a page, a screen, a single component, a feature) into a paste-ready prompt for Nano Banana Pro / gpt-image-2 / Ideogram / Flux 2 / Midjourney that produces a designer-grade mockup as visual inspiration — not pixel-spec UI, not AI slop. Use whenever the user asks for "imagine the X page", "mock up the Y screen", "give me a prompt for nano banana / gpt image 2 to design", "describe this UI for an image model", "draft a prompt for the designer to take inspiration from", or any time the agent needs to produce a UI image-gen prompt for a real product surface (pricing page, dashboard, settings, onboarding, mobile screen, marketing hero, single component). Be pushy — trigger even when the user says "design" without "prompt", or "show me what X could look like" — the agent should reach for this skill before hand-rolling a brief.
---

# ui-mockup-prompt

This skill turns a UI brief into a single paste-ready prompt for a strong-text image model (gpt-image-2, Nano Banana Pro, Ideogram 3 Turbo, Flux 2 Pro, Midjourney v7) that produces designer-quality mockups for **inspiration**, not pixel-exact production UI.

The output is for a working designer to riff on. They will redo the spacing, the radius, the font, the exact palette. What they need from the image is a **visual direction with soul** — one that isn't AI-default purple-gradient-on-white-Inter-rounded-card slop.

## Four things this skill must do, in order

1. **Identify the surface and its job.** A pricing page, a dashboard, a settings screen, an onboarding flow — each has a different job. Aesthetic commitment is constrained by what the surface must *do*, not chosen freely. Look the surface up in `references/surface-patterns.md`.
2. **Pick the right model.** Text density, transparency need, available references, and budget all flow into a routing decision the calling agent should not have to think about.
3. **Compose a slot-labeled prompt** in that model's specific dialect, with the universal anti-slop rules, craft-grounded design intelligence, and the surface's UX-pattern requirements baked in.
4. **Return the bundle:** chosen model + reasoning + paste-ready prompt + multi-ref recipe (if the user has refs) + validation reminder (with surface-specific UX checks).

The prompt should resist AI defaults *by construction*. The model still has freedom — the skill commits to one bold aesthetic direction *constrained by the surface's job* and writes the prompt around it, instead of letting the model fall back to indigo + Inter + rounded cards OR to editorially-polished output that violates the page's UX fundamentals.

**Why both halves matter.** Visual-craft rules alone (no Inter, no purple gradient, no rounded card chrome) produce non-slop pixels. UX-pattern rules alone (comparison matrix on pricing, F-pattern on dashboards) produce functional layout. Without both, the output is either slop OR editorial slop — still slop. Iteration-1 of this skill caught the first; iteration-2 added the second after a pricing-page output rendered with magazine-grade typography but no comparison matrix, hero eating the page, and value-prop below the tiers.

## When the agent invokes this skill

The calling agent has context. The user has been talking about their product, their brand, the page they're working on. The agent already knows:

- Product name, tone, and what the user is building
- Brand palette if any (often partial — "we use a deep green" is enough to start)
- The specific surface to imagine (pricing page, dashboard, mobile habit-tracker home, etc.)
- Whether the user has reference images on hand

If any of those are missing and material to the output (no idea what the product *does*; no clue about palette direction; ambiguous "design something"), ask **one** clarifying question before generating. Not three. The user wants a prompt, not an interview.

## Routing decision

Walk this top-down. First match wins.

| Condition | Pick |
|---|---|
| User explicitly named a model | That one. Skip routing. |
| Single-screen mockup, ≥6 real labels, no transparency | **gpt-image-2** (default; LMArena #1, +242 Elo over Nano Banana Pro on text-heavy UI) |
| Same as above, but UI has glassmorphism / translucent panels / modal stacks | **gpt-image-1.5** (gpt-image-2 transparency is broken — `background:"transparent"` 400s) |
| User has 3+ reference images and wants explicit ordinal control ("layout from image 1, palette from image 2") | **Flux 2 Pro / Flex** (only model with documented prompt-level ordinal indexing) |
| Onboarding / splash / marketing hero with ≤6 words of in-image text and a CTA | **Ideogram 3 Turbo** (`style_type:"DESIGN"`, `magic_prompt:"OFF"`; only model with native `negative_prompt`) |
| Hero illustration / mood / brand vibe — no real labels, will composite text post-render | **Midjourney v7** (Discord/web only — paste-ready, not API) |
| Multi-screen brand-locked set | Single canvas, 4 screens side-by-side on **gpt-image-2** or **Nano Banana Pro**. Cap at 4 — past that, drift wins. |
| User wants Google's "Thinking" pre-pass for multi-region reasoning | **Nano Banana Pro** with `[Subject][Action][Location][Composition][Style][Editing]` bracket-tag dialect |

If none match cleanly, default to **gpt-image-2**.

For deep dives on each model's quirks, dialect rules, and full per-template examples, read the matching file in `references/models/` (loaded only when needed). For the routing evidence base — STRICT NED, ImagenWorld, LMArena, practitioner failure data — read `references/routing-evidence.md`.

## The cardinal anti-slop rules

These are the failure modes that make AI mockups instantly recognizable as AI mockups. The prompt the skill emits must violate none of them. Several of these are auto-linted by the open-design daemon's `lint-artifact` (the user has merged the rules into nexu-io/open-design as P0); we hold the same line.

**Hard P0s (the prompt must never include these):**

1. **Tailwind indigo as accent** — never request `#6366f1`, `#4f46e5`, `#4338ca`, `#3730a3`, `#8b5cf6`, `#7c3aed`, `#a855f7`. These are the textbook AI tell. If the user's brand happens to be indigo, say so explicitly with their hex, not with a Tailwind name.
2. **Two-stop "trust" gradient on a hero** — purple→blue, blue→cyan, indigo→pink. Replace with a flat surface + intentional type, or a single restrained gradient with a real reason.
3. **Emoji as feature icons** — `✨`, `🚀`, `🎯`, `⚡`, `🔥`, `💡` inside headings, buttons, or feature lists. Use 1.6–1.8 px stroke monoline SVG icons or omit icons entirely.
4. **Inter / Roboto / Arial / `system-ui` as the headline typeface.** This is the second-most-reliable AI tell. Pick a distinctive display face that fits the brand (Söhne, Geist, Clash Display, Suisse, Söhne Mono, Public Sans, Tiempos, GT America, Authentic Sans — pick one that fits, name it in the prompt, don't default).
5. **Rounded card + colored left-border accent stripe** — the canonical "AI dashboard tile" shape. Drop either the radius or the left border, not both.
6. **Invented metrics** — never write "10× faster", "99.9% uptime", "3× more productive" in the prompt. Either use real numbers from the user or write a plain-English placeholder ("monthly recurring revenue (real value)").
7. **Filler copy** — never write `lorem ipsum`, `feature one`, `placeholder`, `sample content`, `your text here` in the prompt. Realistic content drives the model's typography choices and composition.

**Soft tells the prompt should avoid:**

- The cliché `Hero → Features → Pricing → FAQ → CTA` template skeleton with no variation.
- More than ~12 distinct hex values in the prompt (signal: tokens weren't honored — pick a palette and commit).
- Equi-weighted color usage. Specify dominant + accent, not 6 colors of equal saturation.
- Pure black `#000000` or pure white `#FFFFFF`. Use `#0F0F0F` / `#FAFAFA`. Vibration on screen is real.

**Why this matters.** The model writes pixels for the literal characters in the prompt. If the prompt says "modern minimalist SaaS dashboard with Inter typography and a purple-to-cyan gradient on the hero", the model produces exactly that AI-default. If the prompt says "a working dashboard for a forensic accounting team, deep oxblood accent on warm off-white, GT America Mono for numerals, Söhne for the headlines, no gradient anywhere", the model has new vocabulary to draw on.

## What "design intelligence" means in the prompt

Beyond the anti-slop list, the prompt should encode the craft rules the user merged into nexu-io/open-design. The image model can't enforce all of them — pixels aren't code — but specifying them shapes what the model paints.

**Color hierarchy** (from `craft/color.md`):
- 70–90% neutrals (background, surface, foreground, muted, border)
- 5–10% accent — at most **2 visible uses per screen**. Typical pair: one chip/eyebrow + one primary CTA.
- 0–5% semantic (success/warn/danger)
- <1% effect (gradients, glows — usually skip)

When you write the prompt, name the dominant neutrals and the **single** accent in resolved hex. Don't describe a flood of color.

**Typography commitments** (from `craft/typography.md`):
- Maximum 2 typefaces in the artifact.
- Display ≥32 px gets negative tracking (`-0.01em` to `-0.02em`) — describe it as "tight letter-spacing on the headline."
- ALL CAPS labels need positive tracking (`0.06em` to `0.1em`) — describe as "wide letter-spacing on the small caps label."
- 50–75 character line length on body copy. The prompt can request "comfortable reading column."
- Three-weight rhythm: Read (400) for body, Emphasize (510) for UI/labels, Announce (590) for headlines/buttons.

**State to depict** (from `craft/state-coverage.md`):
- Default ask: depict the **populated** state with realistic content.
- If the brief explicitly mentions a flow, ask for the relevant state: empty, error, loading, or edge.
- For a multi-screen mockup, the four screens can show four states (populated + empty + loading + error) — that lands as a much richer artifact than four populated variants.

**Touch targets and accessibility** (from `craft/accessibility-baseline.md`):
- AA legal floor for touch target = **24×24 CSS px** (NOT the often-cited 44×44 — that's AAA per SC 2.5.5).
- Body text contrast ≥4.5:1, large text ≥3:1. The prompt should say "high-contrast typography" rather than spec ratios — but the *palette* you pick must clear them.
- Focus indicator visible. For a mockup showing focus state, describe a 2px outline at 3:1 contrast against the unfocused state.

**RTL** (from `craft/rtl-and-bidi.md`):
- If the brief is RTL (Arabic/Hebrew/Persian/Urdu), the prompt must say so up front: "right-to-left layout, Arabic body text, navigation drawer on the right, primary CTA right-aligned."
- Don't ask the model to mirror clocks, refresh icons, media playback controls, charts, or photos. Do ask it to mirror nav arrows, sliders, and progress bars.

**Animation** is irrelevant to a static image mockup. Skip.

## The slot-labeled prompt skeleton

Compose every prompt in this shape, regardless of model. The skeleton is the same; the dialect (bracket tags, ordinal indexing, prose, flags) is per-model.

```
[Asset]        A working <surface> for <real product>, captured as a clean <viewport> screenshot.
[Frame]        <device chassis or browser chrome>, <aspect ratio>
[Surface job]  <One sentence on what this page must DO + 2-4 must-have UX moves drawn from references/surface-patterns.md.
                Pricing page → comparison matrix, recommended tier emphasized, value-prop above tiers, consistent CTAs.
                Dashboard → KPI strip → primary chart → secondary lists, F-pattern, last-updated timestamp.
                Settings → grouped sections, dangerous actions quarantined, save behavior visible.
                Onboarding → single primary action, no decision paralysis.
                Marketing landing → nav, hero, social proof, three-act structure, CTA repeated at bottom.
                Form → labels above, inline error below, required marker, sectioned for >7 fields.
                Detail view → hero block, hierarchy of info, single primary action, breadcrumb back.
                Modal/sheet → focused task, paired action footer, action-labeled buttons, escape closes.>
[Aesthetic]    Pick ONE direction CONSTRAINED by the surface job: <editorial / brutalist / refined-minimal / soft-organic / industrial / archival / playful-precision / quiet-luxury / etc.>. Commit. No fence-sitting.
[Nav / Header] For marketing pages: top nav with wordmark + 4-5 nav items + Sign in + primary CTA.
                For app surfaces: app-frame header with logo + page title + account avatar.
                Don't omit nav on full-page marketing surfaces. Don't add marketing nav to app screens.
[Sidebar]      <if applicable, app-frame surfaces only> nav items in quotes with leading icons described as "1.6px stroke monoline"
[Main]
  Region 1     <concrete content with real values, real customer names, real metrics>
  Region 2     <concrete content with real values>
  Region 3     <concrete content with real values>
[Footer]       <if applicable> — for marketing pages: 4-column links by category + social + copyright. For app surfaces: rarely needed.
[Palette]      Dominant neutral <#HEX>, accent <#HEX, single>. NOT indigo (#6366f1 family). NOT purple-to-cyan gradient. NOT pure black or pure white.
[Typography]   <named display face — not Inter, not Roboto, not system-ui>. Negative tracking on the headline (-0.02em). Wide letter-spacing on small caps if any (0.06em). 65ch reading column on body. For surfaces with numerical scanning (pricing, dashboard) consider monospace numerals (Söhne Mono, GT America Mono) over serif numerals — editorial-pretty serif numerals scan slower than tabular figures.
[Density]      <generous whitespace OR controlled density — pick one, don't waver>
[State]        <populated default, OR empty / loading / error / edge if briefed>
[Voice]        <one specific microcopy commitment: e.g., "Start tracking", not "Get started"; "Drop a note for the team", not "Send message">
[Soul]         <one detail that proves a real product person designed this — a kbd shortcut hint, a status badge with product-specific phrasing, an unexpected proportion, a quiet celebratory cue>
[Quality]      high. Render all visible text legibly. Real shipped product, not concept art. No watermark, no design-mockup labels, no AI-default aesthetic.
```

**Aim for ~80% proven patterns + ~20% one-of-a-kind choices.** The 20% lives in the `[Aesthetic]`, `[Voice]`, and `[Soul]` slots. The 80% lives in `[Surface job]` adherence. Without `[Surface job]` constraint, the 20% bold-aesthetic move overwhelms the 80% proven-pattern foundation, and the page reads as "magazine cover" instead of "working pricing tool."

## Output contract

Return four (or five) blocks in this order. The agent calling the skill pastes the third one into the image tool.

```
## Recommended model

<gpt-image-2 / nano-banana-pro / ideogram-3-turbo / flux-2-pro / midjourney-v7 / gpt-image-1.5>

## Why

<2–3 sentences explaining the routing decision. Mention text density, refs, transparency, surface type, the specific cap that ruled out alternatives.>

## Prompt

<paste-ready prompt in the chosen model's exact dialect — bracket tags for Nano Banana, slot labels for OpenAI, ordinal indexing for Flux 2, 8-section prose for Ideogram, --flags for Midjourney. Includes the [Surface job] slot from references/surface-patterns.md. End with the universal anti-watermark close-out.>

## Multi-ref recipe (only if user has refs)

<image-by-image role assignments + the API call shape if relevant. Skip the section entirely if the user has no refs.>

## Validation before declaring it done

Universal:
- OCR Levenshtein ≤1 against intended copy
- Palette ΔE2000 ≤10 vs brand bundle
- Aspect exact (or crop policy applied)
- No checkerboard FFT signature
- Cap at 6 iterations; rotate model if not converging

Surface-specific (the page MUST do its job, not just look pretty):

For PRICING PAGES:
- Comparison matrix is used (feature-per-row, ✓/—/value per column) — not three parallel bullet lists
- Recommended tier is visually emphasized (tint, scale, border, OR shadow) — "Most chosen" eyebrow alone is not enough
- Value-prop section precedes the tier grid (not after)
- CTA consistency: all self-serve OR explicit split (self-serve tiers + enterprise tier with "Talk to sales" + "Custom" pricing)

For DASHBOARDS:
- KPI strip → primary chart → secondary lists, in that vertical order
- Last-updated timestamp visible
- ≤6 KPIs in the strip
- Drill-down affordance on every list row

For SETTINGS:
- Sections grouped with eyebrow labels
- Dangerous actions quarantined in a "Danger zone" section, not interleaved
- Save behavior unambiguous (sticky save OR autosave indicator OR per-section save — pick one)
- Labels above inputs, never placeholder-as-label

For ONBOARDING:
- Exactly ONE primary CTA on the screen
- One-line value sentence + headline + illustration + CTA pattern
- Progress indicator if multi-step

For MARKETING LANDING:
- Top nav present (don't omit on full-page surfaces)
- Hero has ONE primary CTA (secondary may be present, demoted)
- Social proof immediately after hero (logos OR named customer quote — not generic stars)
- CTA repeated at bottom of page
- Footer with 4-column link categories

For FORMS:
- Labels above inputs (NOT placeholder-as-label)
- Required marker on label, not in placeholder
- Inline error below field with cause + recovery (not "Invalid input")
- Submit button labeled by action (NOT "Submit")
- Sections for >7 fields
```

## Defaults the skill assumes silently

When the agent calls the skill without overriding these, behave as follows. They are quiet because they should be wrong roughly never; flip them only when the brief contradicts them.

| Default | Why |
|---|---|
| Light mode unless brand or surface implies dark | Light mode reads as the production-default for most SaaS / consumer apps |
| 16:9 desktop or 9:16 mobile aspect | Matches what designers actually screenshot into Figma |
| Single populated state | Designers want to see the busy state first; empty / error / loading come on request |
| One distinctive display typeface + one neutral body face | Two faces is the maximum craft commitment |
| Realistic content sourced from the user's product brief | The prompt should never invent metrics; pull from context or use plain-English placeholders |
| Real-shipped-product framing, not concept-art framing | All five strong-text models reward "as if it exists" over "design exploration" |
| English LTR unless the brief says otherwise | Switching to RTL changes a third of the prompt; flag it explicitly when needed |

## When NOT to use this skill

- The user wants a logo / favicon / app icon / OG image. Use the existing `asset-enhancer`, `logo`, `favicon`, `app-icon`, or `og-image` skills.
- The user wants real production code (a working Next.js page, a SwiftUI screen). Route to `frontend-design` skill or to v0/Aura/Banani — diffusion models are the wrong tool for production UI per the research bundle in `docs/research/ui-mockup-prompting/REPORT.md`.
- The user wants the agent to *generate* the image directly via API call. That's `asset_generate_*`. This skill produces the prompt; the asset-enhancer skill runs the generation.

## Reference files in this skill

- `references/surface-patterns.md` — **read this first.** UX-pattern requirements per surface type (pricing, dashboard, settings, onboarding, marketing, form, detail, modal, mobile home). Constrains aesthetic by job.
- `references/laws-of-ux.md` — 30 cognitive / perceptual / design heuristics from lawsofux.com, each with a `For UI mockup prompts` directive. Pull into `[Surface job]` or `[Soul]` when the brief calls for it (Hick's on pricing, Miller's on settings, Postel's on forms, Peak-End on onboarding, Von Restorff for the recommended tier, etc.). Quick lookups by surface type at the bottom of the file.
- `references/routing-evidence.md` — STRICT NED data, ImagenWorld, LMArena, why we route the way we do
- `references/anti-slop-detail.md` — long-form expansion of every cardinal sin with examples and the open-design `lint-artifact` rule mappings
- `references/craft-rules-condensed.md` — the open-design `craft/*` modules (color, typography, state, accessibility, RTL, form-validation) condensed into prompt-relevant deltas
- `references/models/gpt-image-2.md` — full per-model template + multi-ref recipe + iteration discipline
- `references/models/gpt-image-1.5.md` — same, with transparency / glassmorphism focus
- `references/models/nano-banana-pro.md` — bracket-tag dialect, 14-ref allocation
- `references/models/ideogram-3-turbo.md` — 8-section structured prose, native `negative_prompt`
- `references/models/flux-2-pro.md` — ordinal indexing, hex-color compliance
- `references/models/midjourney-v7.md` — `--sref`/`--oref`/`--cref` stack, hero-only use cases

**Order of reading for each call:**
1. `surface-patterns.md` to identify the surface's job and pull UX-pattern requirements
2. The matching model file in `models/` for dialect specifics
3. `craft-rules-condensed.md` and `anti-slop-detail.md` only if the brief edges into RTL, dense forms, or unusual anti-slop territory
4. `routing-evidence.md` only if the routing decision is contested

Don't load all of them. The skill picks the relevant ones based on the brief.
