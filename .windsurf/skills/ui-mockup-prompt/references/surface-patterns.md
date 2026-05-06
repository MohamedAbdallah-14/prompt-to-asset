# Surface patterns — what each page type must DO

The visual-craft references (`craft-rules-condensed.md`, `anti-slop-detail.md`) cover *how a UI looks*. This file covers *what a UI does*. Both have to be in the prompt, or the model produces editorially-polished UI that fails its job.

Pricing-page failure mode that surfaced this gap in iteration-1: the prompt had committed editorial typography, anti-slop colors, real microcopy — but the rendered output was a magazine cover where a tool comparison should have been. No comparison matrix. Hero ate the page. Value-prop sat below the tiers. CTA inconsistent. All visual rules clean; all UX-pattern rules broken.

The fix: encode the page's *job* alongside its aesthetic.

---

## How to use this file

When the brief lands, identify the surface type from the user's request. Look it up below. Pull the **must-have UX moves** into the prompt's `[Surface job]` slot. Then layer the `[Aesthetic]` commitment on top.

Aesthetic constrained by job. Not job ignored for aesthetic.

---

## Pricing page (marketing surface)

**Job:** A visitor must compare N plans, see what each contains, and pick. Decision in under 30 seconds.

**Must-have UX moves:**

- **Comparison matrix** — feature-per-row, ✓/—/value per column. Not three parallel bullet lists. The user has to answer "does Starter include Slack alerts?" without scanning three columns. Bullet lists fail this; matrix passes.
- **Recommended tier visually emphasized** — pick one: subtle background tint, +scale, brighter border, elevated shadow, accent column rule. The "Most chosen" eyebrow alone is not enough. The column itself must read as recommended.
- **Value-prop section ABOVE the tier grid** — "why this product, why now" goes first. Pricing comes after the why is established. Not after the tiers.
- **CTA consistency by motion** — all self-serve "Start tracking" buttons OR explicit split: self-serve tiers say "Start tracking", enterprise tier says "Talk to sales" AND prices "Custom" (not a fixed dollar amount). Mixed self-serve dollars + enterprise sales-led CTA on the same tier reads as broken.
- **FAQ teased from the tier section** — "Compare all features ↓" or "Questions? FAQ below" anchored from the CTAs, so the page promises depth.
- **Toggle for billing period** — Monthly / Yearly with savings indicator. Active state visually distinct.
- **Plan name conveys persona, not size** — "Starter / Operator / Portfolio" beats "Free / Pro / Enterprise" for indie products. Plan name should signal *who* uses it, not *how much it has*.

**Anti-patterns to call out in the prompt:**
- Hero headline taking the entire above-the-fold (it's a *pricing* page, not a landing page)
- Three columns of equal visual weight (kills tier hierarchy)
- "Talk to a human" CTA on a self-serve-priced tier ($72/mo doesn't pair with sales-led CTA)
- Serif numerals on the prices themselves (gorgeous, but pricing scanning needs monospace numerals or tabular figures)

---

## Dashboard (app-frame surface)

**Job:** Operator scans current state, spots anomalies, drills into one thing. F-pattern reading.

**Must-have UX moves:**

- **KPI strip first** — 3–6 metrics, single line each: label + big number + delta arrow. Top of the canvas.
- **Primary chart second** — the chart that answers "is the trend OK?" Below the KPI strip, full width.
- **Secondary lists / tables third** — recent activity, top items, recent transactions. Below the chart.
- **Global filters above content** — date range, segment selector, refresh button — top-right of the canvas.
- **Last-updated timestamp visible** — "Updated 2 minutes ago" near the filters. Operators need to know if they're looking at stale data.
- **Sidebar nav left, content right** — standard. Or top-bar nav for narrower app surfaces. Don't invent.
- **Drill-down affordance on every list row** — chevron or hover-state to imply "click for detail."

**Anti-patterns:**
- Equal visual weight on KPIs and chart (KPIs are scanning-bait, chart is reading-bait)
- Decorative widgets that don't answer a question
- 8+ KPIs in one strip (operators scan max 6 at a glance)

---

## Settings / preferences (app-frame surface)

**Job:** User changes one specific thing safely. Other things stay where they were.

**Must-have UX moves:**

- **Sections grouped by domain** — Account / Notifications / Billing / Privacy / Security / Danger zone. Eyebrow labels at section heads.
- **Labels above inputs** — never placeholder-as-label per `craft/accessibility-baseline.md`. Required marker on the label.
- **Dangerous actions visually quarantined** — "Delete account", "Sign out everywhere", "Revoke all sessions" in a red-bordered "Danger zone" section at the bottom. Not interleaved with normal toggles.
- **Save behavior visible** — sticky "Save" button at the bottom on dirty state, OR autosave indicator ("Saved 3s ago"), OR per-section Save buttons. Pick one. Don't mix.
- **Toggle states visually unambiguous** — On = filled accent, Off = neutral. Both states visible on the same screen so the user can compare what's on vs off.
- **Inline validation, not modal** — bad email goes red below the field, not in a popup.

**Anti-patterns:**
- One long undifferentiated form (no section grouping)
- Delete-account button next to email-update button (no danger separation)
- Save button only at the top (out of sight when user finishes editing fields below)

---

## Onboarding empty state (app-frame surface, first-use)

**Job:** New user has zero data and zero context. Get them to one specific action.

**Must-have UX moves:**

- **Single primary action** — one button. Not three. Not "Skip" + "Continue" + "Add later." If it's three, the user has decision paralysis on screen one.
- **One-line value sentence** — "Track up to 5 habits a day" (not feature list, not poetry).
- **Centered illustration / icon** — friendly, brand-aligned, not stock. Per `craft/state-coverage.md` first-use empty state: illustration + headline + value sentence + primary CTA.
- **Progress indicator if multi-step** — "1 of 3" dots or thin top bar. Shows the end is near.
- **Skip affordance, but secondary** — small text link below the primary button if skipping is allowed. Not a competing button.

**Anti-patterns:**
- Empty page with "Get started" CTA and nothing else (zero context for what they're starting)
- Tutorial overlay forcing tour through 7 features (decision paralysis, also annoying)
- Multiple primary CTAs ("Set up profile" + "Add first habit" + "Invite friends" — pick one)

---

## Marketing landing page (marketing surface)

**Job:** Visitor decides in 5 seconds whether to keep scrolling. Then if they scroll, decides in 30 seconds whether to convert.

**Must-have UX moves:**

- **Top nav** — wordmark left + 4–5 nav items center + Sign in + primary CTA (right). Don't omit.
- **Hero** — bold headline + sub + primary CTA (+ secondary CTA optional). One action above the fold.
- **Social proof** — logo strip OR specific named customer quote (NOT generic 5-star reviews) immediately after hero.
- **Three-act structure** — problem we solve, how we solve it, proof it works. Not feature dump.
- **Pricing teaser** — "Plans from $X" + link to pricing page, NOT the full pricing grid (that's the pricing page's job).
- **CTA repeated** at bottom of page — visitor who scrolled needs the action visible without scrolling back.
- **Footer** — links by category (Product / Company / Legal / Resources), social, copyright.

**Anti-patterns:**
- No nav (looks like a single-page Notion export)
- Hero with two competing primary CTAs ("Start free trial" + "Watch demo" — pick one as primary, demote the other)
- Feature dump masquerading as "How it works"
- "Trusted by 5,000+ teams" with no actual logos (lying-by-numbers)

---

## Form (auth, signup, lead capture, checkout)

**Job:** User completes a transaction. Every visible field is friction.

**Must-have UX moves:**

- **Labels above inputs** — never placeholder-as-label. Per `craft/accessibility-baseline.md` (visible label is WCAG 1.3.1 + 3.3.2).
- **Required marker on label**, not in placeholder. `* required` or `(optional)` next to optional fields.
- **Inline error below field** — red text + icon, with cause + recovery ("Email must include @ and a domain", not "Invalid input"). Per `craft/state-coverage.md` form errors.
- **Sections for >7 fields** — group related fields with eyebrow labels. Per `craft/form-validation.md` (PR #625).
- **Submit button labeled by action** — "Create account", "Save changes", "Send invite" — never "Submit."
- **Disabled submit state visible** — lower opacity, no hover affordance, when form is invalid or empty.
- **Trust signals near sensitive fields** — "We don't store your card details" near payment, "Used for receipts only" near email, etc.

**Anti-patterns:**
- Placeholder used as label (disappears on input, fails AA)
- "Submit" as the button label (verb without object)
- One long form with no sections (8 fields is OK; 15 fields needs grouping)
- Confirmation field for email or password (per `craft/form-validation.md`: confirm-email is anti-pattern)
- Modal validation popup instead of inline

---

## Detail view (product, profile, item)

**Job:** User is reading deep on one thing. Hierarchy of info matters more than scanning.

**Must-have UX moves:**

- **Hero block** — primary image / icon + title + key metadata + primary action. Above the fold.
- **Hierarchy of info** — most-important first (price for product, status for profile), supporting info second (description, history), tertiary info collapsed (versions, raw IDs).
- **Single primary action** — Buy / Edit / Activate. Secondary actions in an overflow menu.
- **Breadcrumb back to list** — "← Back to all customers" or breadcrumb trail.
- **Related / next item** — at the bottom: "Next customer →" or "Similar products" so the user can continue their flow without going back to a list.

**Anti-patterns:**
- Equal weight on all info (everything competes for attention)
- 5+ buttons in the action area (paralysis)
- No way back to the list view (dead end)

---

## Search results / list

**Job:** User scans for the thing they want. Hits it within 5 results or refines.

**Must-have UX moves:**

- **Search bar prominent** at top, query echoed back ("Showing results for 'oxblood'")
- **Filters / facets on the left or as chips** — for narrowing
- **Result row** — primary text (title) + secondary text (description excerpt) + metadata (date, type, price). Consistent across rows.
- **Result count** visible — "3,210 results" — gives the user a sense of scope
- **Empty state for no results** — echo the query, suggest alternatives. Per `craft/state-coverage.md` no-results empty state.
- **Pagination or infinite scroll** — pick one, label visibly. "Load more" buttons read as more intentional than infinite scroll for product surfaces.

**Anti-patterns:**
- 50 results crammed without dividers
- Filters that don't show selected state
- Pagination at top only or bottom only without indication of total

---

## Modal / sheet / drawer

**Job:** User performs one focused task without losing context of the underlying surface.

**Must-have UX moves:**

- **Header** — title + close button (top-right). Title says what the modal does ("Edit project name", not "Edit").
- **Body** — focused task content. Don't overload — modals are for one thing.
- **Footer with paired actions** — "Cancel" (secondary, left) + primary action (right). Primary action labeled by verb ("Save changes", "Delete project", "Confirm").
- **Backdrop dimmed, underlying surface visible** — user knows where they are.
- **Escape closes** (web), tap-outside closes (mobile sheets).
- **Focus trapped inside** the modal until dismissed (per `craft/accessibility-baseline.md` — modal trap is correct, not a violation).

**Anti-patterns:**
- Two competing primary buttons in footer
- Generic "OK" / "Cancel" instead of action-labeled buttons
- Modal opens another modal (modal-ception)

---

## Mobile app home (app-frame surface)

**Job:** User opens the app. They get to their primary task in 1 tap.

**Must-have UX moves:**

- **Top of screen: status / context** — date, greeting, current count. Not nav.
- **Primary action visually dominant** — large button OR centered illustration + CTA OR most-recent-activity card.
- **Bottom tab bar** — 4–5 tabs max. Active tab in accent color.
- **No nested top nav** — mobile doesn't have room for marketing-page nav. Bottom tab bar handles primary navigation.
- **Pull-to-refresh** affordance implied (or manual refresh icon).

**Anti-patterns:**
- Hamburger menu (use bottom tab bar)
- 6+ tabs in bottom bar (split into more / overflow)
- Marketing-style hero on app-home (it's an app, not a landing page)

---

## How this slot fits in the prompt skeleton

The prompt skeleton in `SKILL.md` gets a new slot between `[Frame]` and `[Aesthetic]`:

```
[Surface job]  <One-sentence statement of what the page must DO,
               followed by 2-4 must-have UX moves drawn from this file.>
```

Example for the pricing page brief:

```
[Surface job]  Pricing page — visitor compares 3 plans and picks one. Comparison
               matrix (feature-per-row), recommended tier visually emphasized,
               value-prop section above tiers, consistent self-serve CTAs across
               all three.
```

The aesthetic commitment then gets layered on top:

```
[Aesthetic]    Editorial-magazine. Tiempos serif on headline + numerals,
               GT America on body. Wide-tracked small-caps eyebrows. Hairline
               column dividers, no card chrome.
```

The model now knows what the page must accomplish AND how it should look. Iteration-1 only had the second.

---

## Why this matters

The user (Mohamed) merged behavioral craft modules into nexu-io/open-design covering state-coverage, animation-discipline, accessibility-baseline, rtl-and-bidi, and form-validation. Those rules teach AI agents how to build *behaviorally complete* UIs — not just visually polished ones. This file extends the same principle to the *prompt-emission* layer: the prompt the skill ships must encode behavioral / UX-pattern completeness alongside visual discipline. Otherwise the model produces editorial slop instead of generic slop, which is still slop.

The pricing-page failure case from iteration-1 is the proof. Iteration-2 fixes it.
