# Craft rules condensed (for prompt-emission only)

These are the rules from `nexu-io/open-design`'s `craft/*` modules — the citation-grounded design intelligence the user (Mohamed Abdallah) merged across PRs #502, #515, #587, #595, and #625 (open). Distilled here as the *deltas the prompt must encode*. The full files live on the open-design `main` branch and are linked at the bottom of each section.

The craft files are written for code-generating agents. This skill writes prompts for image-generating models. The mapping below converts each craft rule into prompt-language.

---

## color (from `craft/color.md`)

Open-design rule: 70–90% neutrals, 5–10% accent (single, max 2 visible uses per screen), 0–5% semantic, <1% effect. Avoid pure black / pure white.

In the prompt, write:

- Dominant neutral expressed as resolved hex (`#0F0F0F`, `#FAFAFA`, `#1C1C1E`, `#F8FAFC`, `#18181B`, etc.)
- Single accent expressed as resolved hex
- Body background and surface explicitly differentiated (`body #F8FAFC, card surface #FFFFFF` — not just "light mode")
- Hard rule for the prompt: NEVER request indigo `#6366f1` family. Never request a two-stop hero gradient (purple→blue, blue→cyan).
- For dark mode: `#0F0F0F` background, `#F0F0F0` foreground. Pure black is wrong.

Source: https://github.com/nexu-io/open-design/blob/main/craft/color.md

---

## typography (from `craft/typography.md`)

Open-design rule: max 2 typefaces; 1.2 or 1.25 multiplicative scale; ALL CAPS requires `0.06em–0.1em` letter-spacing; display ≥32px requires `-0.01em` to `-0.02em` (tight); 50–75 character body line length.

In the prompt, write:

- One named distinctive display typeface — never Inter, Roboto, Arial, or "system-ui." Preferred picks for non-design-token-locked briefs: **Söhne, Geist, Clash Display, GT America, Suisse Int'l, Public Sans, Tiempos, Authentic Sans, IBM Plex Sans, Inter Display only if branded** (Display variant differs from regular Inter). Pair with one neutral body face if needed.
- Headline framing: "tight letter-spacing on the headline (-0.02em), in [named display face]"
- Small caps / labels: "wide letter-spacing on the small caps label (0.08em)"
- Body framing: "comfortable reading column, 65 characters per line"
- Three-weight rhythm: 400 body, 510 UI labels, 590 headlines / buttons

The image model can't enforce exact letter-spacing values, but specifying them in the prompt steers the model toward typographic discipline rather than its default flat sans-serif rendering.

Source: https://github.com/nexu-io/open-design/blob/main/craft/typography.md

---

## state-coverage (from `craft/state-coverage.md`)

Open-design rule: every interactive surface must render five states (loading, empty, error, populated, edge). The single most reliable AI-design failure is shipping only the populated state.

In the prompt, the default ask is the populated state with realistic content. Branch like this:

| Brief mentions | Ask the model for |
|---|---|
| "The dashboard" (default) | Populated state with real customer rows, real numbers, real chart data |
| "What if the dashboard is empty?" / new user | First-use empty state: illustration + headline + one-line value sentence + primary CTA |
| "Error path" / "what if it fails" | Error state: plain-language cause ("Your card was declined"), recovery action ("Update payment method"), preserved input visible |
| "Loading" / "skeleton" | Skeleton screen matched to expected layout, labelled spinner ("Loading transactions…") |
| "Edge case" / "extreme volume" / "long strings" | Edge state: 200-char title, missing avatar, RTL embed inside LTR — layout that does not break |

For a 4-screen mockup, an excellent move: ask for **populated + empty + loading + error as the four screens** instead of four populated variants. The artifact lands as a richer story for the designer.

Source: https://github.com/nexu-io/open-design/blob/main/craft/state-coverage.md

---

## accessibility-baseline (from `craft/accessibility-baseline.md`)

Open-design rule: target WCAG 2.2 AA. Touch target AA = **24×24 CSS px** (NOT 44×44 — that's AAA per SC 2.5.5). Body text contrast ≥4.5:1, large text ≥3:1, focus indicator ≥3:1 against unfocused state. ARIA last resort.

In the prompt, write:

- "High-contrast typography against the background" — let the palette itself clear 4.5:1
- For touch targets, the prompt does not enforce pixel sizes, but it should imply tap-comfortable sizing: "generous tap targets on the bottom navigation, comfortably sized buttons"
- For a focus-state mockup: "visible 2px focus outline at high contrast against the unfocused state on the active tab"
- Form fields: visible labels above the input (NOT placeholder-as-label); inline error message with red text + icon below the field; required marker on the label
- Do not request "ARIA-attribute X" in the prompt — the model can't render attributes, only visual affordances

Folklore busts the prompt should respect:
- "EAA = WCAG 2.2 AA" is wrong. EN 301 549 v3.2.1 references WCAG 2.1. Don't claim compliance the law doesn't actually require.
- "Target Size 44×44" cited as the AA bar is wrong — that's AAA.
- "Adding ARIA improves accessibility" is wrong empirically — WebAIM Million 2026: ARIA pages average 59.1 errors vs 42 on non-ARIA. Restraint over reach.

Source: https://github.com/nexu-io/open-design/blob/main/craft/accessibility-baseline.md

---

## rtl-and-bidi (from `craft/rtl-and-bidi.md`)

Open-design rule: RTL flips inline-axis layout but NOT clocks, refresh icons, media playback controls, charts, or photos. Logical CSS properties resolve correctly. Use `<bdi>` for mixed-script content.

In the prompt, when the brief specifies Arabic / Hebrew / Persian / Urdu:

- First sentence: "right-to-left layout, [Arabic / Hebrew / Persian / Urdu] body text"
- Navigation drawer position: right side (mirrored)
- Primary CTA: right-aligned (mirrored)
- Sliders, progress bars, nav arrows: mirrored
- DO NOT mirror: clock face, refresh / sync / reload icons, media play / pause / scrubber, chart x-axis, photos, brand logos
- Mixed scripts (English brand name in Arabic paragraph): "use embedded LTR run for the brand name; surrounding paragraph stays RTL"
- Body text: 14–18 px Arabic with line-height 1.5–1.75 for harakat clearance
- Never apply CSS letter-spacing to Arabic — breaks cursive joining

Folklore the prompt should respect:
- "Tailwind v4.2 logical-utility rename is `inline-s-*`" — wrong. Those are size utilities. The inset rename is `inset-s-*` / `inset-e-*`.
- "WebKit doesn't support U+2066–U+2069" — wrong; interoperable across modern browsers.

For an RTL pricing page in Arabic: pass real Arabic copy to the model. Lorem ipsum substitutes don't trigger correct shaping behavior; the model paints mathematically-Latin shapes.

Source: https://github.com/nexu-io/open-design/blob/main/craft/rtl-and-bidi.md

---

## animation-discipline (from `craft/animation-discipline.md`)

Mostly irrelevant to a static image mockup — animation is dynamic. But two implications survive into the still image:

- **What state to depict.** If the brief is for a "transition" or "interaction state," ask for a single frame that implies motion: a sheet at 80% reveal with motion-blur cue, a button at the moment of press with the focus ring expanded.
- **Don't request decorative motion as a static element.** Don't ask for "particles drifting upward" or "subtle background animation" in a static prompt — those rendering as still images creates noise without function.

Folklore busts (do not write any of these into the prompt):
- "Skeleton screens feel 11% faster" — Harrison/Yeo/Hudson 2010 measured progress bars, not skeletons.
- "Doherty Threshold = 400 ms" — the 1982 paper does not contain "400 ms."
- "M3 standard easing = `cubic-bezier(0.4, 0, 0.2, 1)`" — that's M2 (kept in M3 as `legacy`). M3 standard is `cubic-bezier(0.2, 0, 0, 1)`.
- "Apple `.snappy = 0.25s, .smooth = 0.35s`" — wrong. All three SwiftUI presets are 0.5s base, differing in bounce.

Source: https://github.com/nexu-io/open-design/blob/main/craft/animation-discipline.md

---

## form-validation (from `craft/form-validation.md`, PR #625, OPEN)

Not yet merged but relevant for any prompt that includes a form (sign-up, lead capture, settings, checkout). When briefed:

- Visible label above each input (not placeholder-as-label)
- Required marker on the label, not in the placeholder
- Inline error: red text + icon below the field, with the cause and the recovery (not "Invalid input" — "Email must include @ and a domain")
- For a populated form mockup: show one valid filled field + one with an inline validation error to imply the visual contract
- Submit button disabled state visibly distinct (lower opacity, no hover affordance)

`:user-invalid`, `aria-describedby`, `aria-invalid`, Standard Schema, Server Actions — all code concerns, not pixel concerns. Skip from the prompt.

Source: https://github.com/nexu-io/open-design/pull/625

---

## anti-ai-slop (from `craft/anti-ai-slop.md`)

The seven cardinal sins are restated in `SKILL.md`. The expansion below covers the soft tells.

**Soft tells the prompt should resist:**

- The cliché Hero → Features → Pricing → FAQ → CTA template skeleton. For a marketing page mockup, ask for **at least one unconventional section**: testimonial wall as full-bleed quote; pricing as a comparison-against-status-quo; an inline mini-product-demo block; a press strip in an unusual position.
- More than ~12 distinct hex values in the prompt. Cap the palette commitment.
- Equi-weighted color usage. Specify dominant + accent.
- Decorative blob / wave SVG backgrounds — meaningless geometry.
- Perfect symmetric layout with no visual tension. Alternating density (one tight section, one breathing section) reads as intentional. Specify "breathing whitespace in the upper region, dense data grid in the lower" rather than uniform spacing.

**The 80/20 rule.** Aim for ~80% proven patterns + ~20% distinctive choice. The 20% lives in:
- One bold visual move (a typography choice, a single color decision, an unexpected proportion).
- Voice and microcopy: "Start tracking" beats "Get started." "Drop a note for the team" beats "Send message." Prompt should ask for a specific voice register.
- One micro-interaction the user will remember (a button press that moves 2px, a number that counts up).
- One detail that proves a real product person made it (a kbd shortcut hint, a status badge with product-specific phrasing, a quiet celebratory cue when a state lands).

If a designer screenshots the mockup and someone outside the project can identify which product it's from, the prompt did its job. If not, the prompt produced a template.

Source: https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md
