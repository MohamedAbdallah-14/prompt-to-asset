# Anti-slop detail

Long-form expansion of the seven cardinal sins (P0) and soft tells (P1, P2) from `SKILL.md`. Each sin includes the AI default to avoid, the replacement to write into the prompt, and the open-design `lint-artifact` rule mapping where one exists.

The user (Mohamed Abdallah) merged the anti-AI-slop rule set into nexu-io/open-design's `craft/anti-ai-slop.md` plus the underlying `lint-artifact` rules in `apps/daemon/src/lint-artifact.ts`. This file mirrors that surface for prompt-emission purposes.

---

## P0: hard sins the prompt must never include

### 1. Tailwind indigo as accent

**The AI default:** Models trained on millions of v0/Bolt/Tailwind-template screenshots default to indigo `#6366f1` (Tailwind `indigo-500`) as the "trustworthy SaaS" accent. The full forbidden list:

```
#6366f1  indigo-500
#4f46e5  indigo-600
#4338ca  indigo-700
#3730a3  indigo-800
#8b5cf6  violet-500
#7c3aed  violet-600
#a855f7  purple-500
```

**Why it's slop:** Every AI demo uses this. It signals "AI generated" before any user reads a word.

**What to write:** Specify the actual brand color in resolved hex. If the user's brand is unknown, pick a less-traveled accent space:
- Forest greens: `#166534`, `#14532D`, `#0F4C2A`
- Oxblood / brick: `#7F1D1D`, `#991B1B`
- Sand / cream-on-warm: `#A16207`, `#854D0E`
- Cyan / teal: `#0891B2`, `#0E7490`, `#155E75`
- Coral / rust: `#C2410C`, `#9A3412`
- Cobalt (NOT indigo): `#1E40AF`, `#1D4ED8` — verify hex doesn't fall in the forbidden list

**Open-design lint rule:** `AI_DEFAULT_INDIGO` in `apps/daemon/src/lint-artifact.ts`. Auto-blocks at P0.

---

### 2. Two-stop "trust" gradient on the hero

**The AI default:** purple → blue, blue → cyan, indigo → pink, magenta → orange. The "I tried" gradient.

**Why it's slop:** Equal-weight on the hero means the gradient is doing decoration, not function. AI demos use gradients to fill empty hero space they can't otherwise design.

**What to write:** Replace with one of:
- A flat surface + intentional typography (the 80% case — most products don't need gradients)
- A single restrained gradient with a real function: separating header from body, fading from primary CTA into the section below
- A textural background: subtle noise overlay, monochromatic photographic plate, off-axis abstract shape with low-contrast palette

**Prompt phrasing:** "Flat hero surface, no gradient. The visual energy comes from typography and one strong photographic detail at the right." Or: "Single subtle vertical gradient from `#FAFAFA` to `#F4F4F5` in the upper section, fading into a flat surface below for the feature grid."

---

### 3. Emoji as feature icons

**The AI default:** `✨`, `🚀`, `🎯`, `⚡`, `🔥`, `💡`, `📊`, `🛡️`, `🔐` inside `<h*>`, `<button>`, `<li>`, or `class*="icon"`.

**Why it's slop:** Emoji are a fallback for when the designer didn't choose. They scale badly, render differently per OS, and signal "I didn't think about icons."

**What to write:** "1.6–1.8 px stroke monoline SVG icons in `currentColor`, lined up to the cap-height of the heading." Or specifically named icon family: "Lucide icons", "Phosphor (Regular weight)", "Heroicons (outline)", "Feather (1.5px stroke)".

**Open-design lint rule:** `EMOJI_AS_ICON` checker, P0.

---

### 4. Inter / Roboto / Arial / system-ui as headline typeface

**The AI default:** When asked for a "modern" or "minimalist" or "clean" UI, the model defaults to Inter (or its visual neighbors) for both display and body. Often the prompt explicitly says "Inter typography" because that's what the asker has been trained to write.

**Why it's slop:** Inter shipped in 2017 and is now the dominant SaaS body face. As the *display* face, it's invisibly generic. Roboto, Arial, and system-ui are the same problem.

**What to write:** Pick one distinctive display face. Ranked by current relevance for non-branded mockups:

- **Söhne** (Klim Type Foundry) — neutral grotesque with character; common in editorial-leaning SaaS.
- **Geist** — Vercel-built grotesque; modern and free.
- **Clash Display** — geometric display, free; reads bold without being bombastic.
- **GT America** — distinctive gridded grotesque; used by editorial brands.
- **Suisse Int'l** — Swiss-style precision sans.
- **Authentic Sans** / **Authentic Stencil** — distinctive, mood-shifting.
- **Söhne Mono** / **GT America Mono** — for numerical-heavy dashboards.
- **IBM Plex Sans** — corporate-distinctive, free, well-shaped.
- **Inter Display** (different from Inter regular) — if Inter must be present, use the Display variant for headlines only.
- **Public Sans** — free, distinctive enough to escape Inter-flatness.
- **Tiempos** / **Tiempos Headline** — when serif fits the brand.
- **Lyon** / **Lyon Display** — editorial serif.

For body, pair with one neutral face: Inter (yes, here it's fine), Söhne Buch, GT America Standard, Geist Sans body weight.

**Prompt phrasing:** "Display typography: Söhne Halbfett at 56pt with -0.02em letter-spacing on the headline. Body: Söhne Buch at 16pt at 1.55 line-height." Or: "Clash Display Bold for the H1. GT America Standard 400 for body."

**Open-design lint rule:** Hardcoded `Inter` / `Roboto` / `system-ui` in display contexts is flagged at P0.

---

### 5. Rounded card with colored left-border accent stripe

**The AI default:** A white card with `border-radius: 12px` and a 4px-wide accent-colored stripe on the left edge ("info / warning / error" callouts that look like Tailwind UI's notification components).

**Why it's slop:** This shape is the most-copied AI-template card. It signals "I asked an LLM for a UI."

**What to write:** Drop one of the two: either flat-edge cards (no radius, sharp corners, hairline border) OR rounded cards without the left-stripe accent. Prompt phrasing: "Cards: 16px corner radius, 1px hairline border at `#E4E4E7`, no colored edge stripes." Or: "Cards: zero radius, generous internal padding, no border — separated by 1px dividers between sections."

**Open-design lint rule:** Heuristic check on `border-radius` + `border-left` + accent-color combination, P1.

---

### 6. Invented metrics

**The AI default:** "10× faster", "99.9% uptime", "3× more productive", "Save 4 hours a week", "5,000+ teams trust us." Generic numbers no one verifies.

**Why it's slop:** Real products quote real numbers from real customer studies. AI-generated copy invents.

**What to write:** Either pull from the user's actual product data (the agent has context — ask) or use plain-English placeholders the user fills in: "Headline metric area, value to be filled (real customer-derived number)." For mockup purposes, you can write a *believable specific* placeholder: "$148,210 monthly recurring revenue." Specificity reads as real.

**Prompt phrasing for placeholder:** "Hero stat: `[real metric]` placeholder positioned at the right of the headline, paired with a one-line explanation."

---

### 7. Filler copy

**The AI default:** `lorem ipsum`, `feature one / two / three`, `placeholder text`, `sample content`, `your text here`, `Lorem ipsum dolor sit amet...`

**Why it's slop:** The model paints whatever literal characters it sees. `lorem ipsum` becomes the visible string in the rendered mockup. Designers can't tell whether the model produced bad typography or whether the prompt asked for fake Latin.

**What to write:** Realistic content that fits the product. For a forensic-accounting dashboard: "Alameda Capital Holdings", "$4,212.40", "Apr 28, 2026", "Status: Disputed", "Reviewer: Maya Chen". For a habit-tracking mobile app: "Morning meditation", "10 minutes", "3 of 5 habits completed", "12 day streak".

The agent has product context. Use it. If the agent doesn't have specifics, write the prompt with one round of plausible placeholders that *look like* real product copy — never lorem ipsum, never "feature one."

---

## P1 / P2: soft tells (avoid where possible)

### Cliché page sequence

Hero → Features (3-card grid) → Pricing → FAQ → CTA. The default AI marketing-page template.

**Replacement:** Ask for at least one unconventional section:
- Testimonial wall as a full-bleed editorial quote (1 quote, large, no avatar grid)
- Pricing as a comparison-against-status-quo table
- Inline mini-product-demo block (animated GIF or sequence-of-screenshots inset)
- A press strip in an unusual position (top of features, not header)
- A "what we cut" section (negative space about features the product deliberately doesn't have)

### More than ~12 distinct hex values

Signal that tokens weren't honored. Cap the prompt's color commitment at: 1 dominant neutral, 1 alt neutral (surface vs body), 1 foreground text, 1 muted text, 1 border, 1 accent, 0–3 semantic. That's 5–9 values, well under 12.

### Equi-weighted color usage

Six colors of equal saturation and equal coverage flatten the hierarchy. Specify dominant + accent in the prompt. The accent appears at most twice on the screen.

### Pure black / pure white

`#000000` and `#FFFFFF` cause vibration on screen. Use:
- Light: body `#FAFAFA`, surface `#FFFFFF`, foreground `#0F0F0F` or `#18181B`, muted `#71717A`.
- Dark: body `#0A0A0A`, surface `#171717`, foreground `#F4F4F5`, muted `#A1A1AA`.

### Decorative blob / wave SVG backgrounds

Meaningless geometry filling space. AI-template default. Replace with an intentional photographic plate, monochromatic abstract texture with low contrast, or just whitespace.

### Perfect symmetric layout with no visual tension

Alternating density reads as intentional. Specify: "Generous breathing whitespace in the upper hero region; dense, information-rich data grid in the dashboard middle." Don't ask for uniform spacing throughout.

---

## How to add soul without breaking the rules

The 80/20 split: ~80% proven patterns + ~20% distinctive choice. The 20% lives in:

**Aesthetic commitment slot.** Pick one direction in the prompt and commit:
- Editorial — magazine-style typography, photo-driven, generous gutters
- Brutalist — heavy weights, exposed grid, raw geometry, monospace numerals
- Refined-minimal — Swiss precision, 65ch reading column, restrained palette
- Soft-organic — irregular radii, off-balance compositions, hand-drawn touches
- Industrial — dark surfaces, accent ochre/safety-orange, mechanical typography
- Archival — warm off-white, high contrast text, period-specific type pairing
- Playful-precision — distinctive display face, vibrant accent, tight grid for contrast
- Quiet-luxury — restrained palette, expensive typography, generous negative space, no decoration

**Voice commitment slot.** One specific microcopy commitment that proves a real product person designed this:
- "Start tracking" beats "Get started"
- "Drop a note for the team" beats "Send message"
- "We don't store your card details" beats "Secure"
- "It's quiet here" beats "No notifications"

**Soul detail slot.** One detail that reveals lived product knowledge:
- A keyboard shortcut hint next to a power-user action
- A status badge with product-specific phrasing
- A quiet celebratory cue when a state lands
- An empty-state illustration that's a specific physical object, not a generic figure
- A micro-interaction implication in the still frame (button appears mid-press, sheet at 80% reveal)

If a designer screenshots the mockup and someone outside the project can identify the product from it, the prompt did its job. If not, the prompt produced a template.
