# Laws of UX — applied to UI-mockup prompt emission

A reference of 30 cognitive / perceptual / design heuristics from
[lawsofux.com](https://lawsofux.com/) (Jon Yablonski). Each entry distils
the law in our own words (no verbatim copy) and adds a `For UI mockup
prompts` line that translates the law into a concrete prompt-emission
directive.

This file is a lookup, not a checklist. When the brief touches a surface
where a specific law applies (Hick's on a pricing tier grid, Miller's on a
settings page, Postel's on a form, Peak-End on an onboarding flow), pull
the directive into the `[Surface job]` slot or the `[Soul]` slot of the
prompt skeleton. The skill's existing `surface-patterns.md` already
encodes most of the structural moves these laws imply; this file is the
underlying *why*.

Each law links back to the source page on lawsofux.com. The site's
content is © Jon Yablonski; the distillations and prompt directives below
are our work.

---

## Perception & Visual grouping (Gestalt principles)

### Law of Common Region

**Definition.** Elements sharing a clearly defined boundary tend to be perceived as a group.

**Principle.** A border, a tinted background, or a card container binds enclosed elements into one perceptual unit, even when individual items are otherwise unrelated. Use enclosure to declare grouping where pure proximity isn't enough — and reserve it, since over-bordering everything destroys the signal.

**Source.** Stephen Palmer, 1992 (Gestalt psychology lineage from the 1920s).

**For UI mockup prompts.** When you need a visible group (KPI strip, related settings, form section), wrap them in a single subtle-bordered card or shared tint — don't rely on whitespace alone if grouping is structural to the task.

Source URL: https://lawsofux.com/law-of-common-region/

### Law of Proximity

**Definition.** Objects near each other are perceived as related.

**Principle.** Spatial nearness is the cheapest grouping signal — cheaper than borders, lines, or color. Pairs of related elements should sit close; unrelated elements need visible breathing room. The most common UI mistake is uniform spacing that makes nothing read as grouped.

**Source.** Max Wertheimer, 1923 (Gestalt psychology).

**For UI mockup prompts.** Specify variable vertical rhythm — tight (8-12px) within a group, generous (32-48px) between groups. Reject the model's default uniform-spacing tendency.

Source URL: https://lawsofux.com/law-of-proximity/

### Law of Prägnanz (Simplicity / Good Figure)

**Definition.** People interpret ambiguous or complex images as the simplest possible form.

**Principle.** The visual cortex compresses what it sees into the most economical interpretation. Complicated shapes get read as overlapping simple ones; ornate compositions get read as their underlying skeleton. Designs that align with this tendency feel inevitable; designs that fight it feel arbitrary.

**Source.** Max Wertheimer, 1923 (Gestalt psychology).

**For UI mockup prompts.** Ask for layouts that resolve to a clear underlying grid (12-column, 4-quadrant, F-pattern). Reject decorative breaks in the grid that add nothing semantic.

Source URL: https://lawsofux.com/law-of-pr%C3%A4gnanz/

### Law of Similarity

**Definition.** Visually similar elements are perceived as a group.

**Principle.** Shared color, shape, size, or typographic treatment binds elements together more strongly than spatial position. Use similarity to communicate equivalence (these are all destructive actions; these are all selectable items); break similarity to communicate hierarchy (this CTA is the primary one).

**Source.** Max Wertheimer, 1923 (Gestalt psychology).

**For UI mockup prompts.** Demand consistent treatment for equivalent affordances (every list row identical, every secondary button identical) and visible deviation only on items meant to draw attention.

Source URL: https://lawsofux.com/law-of-similarity/

### Law of Uniform Connectedness

**Definition.** Elements visually connected by lines, paths, or shared region are perceived as more related than disconnected ones.

**Principle.** A connecting line, a shared toolbar, or a bracketing container ties items together more strongly than mere proximity or similarity. The strongest grouping signal in the Gestalt hierarchy.

**Source.** Stephen Palmer & Irvin Rock, 1994.

**For UI mockup prompts.** Use a shared subtle bracketing container or a thin connecting line to reinforce a critical group (steps in a wizard, a navigation flow, a comparison set).

Source URL: https://lawsofux.com/law-of-uniform-connectedness/

### Aesthetic-Usability Effect

**Definition.** Users perceive better-looking interfaces as more usable, even when measured usability is identical.

**Principle.** Visual polish biases judgment. A clean, well-typeset layout earns the benefit of the doubt: users forgive friction, ignore minor bugs, and rate the experience higher than raw task-completion data would justify. The trap: beauty buys patience, not function.

**Source.** Masaaki Kurosu and Kaori Kashimura, Hitachi Design Center, 1995.

**For UI mockup prompts.** Spend the prompt's adjective budget on visual refinement — tasteful typography, generous whitespace, calm palette, crisp hierarchy. The mockup's job is to look credible enough that stakeholders trust the underlying flow.

Source URL: https://lawsofux.com/aesthetic-usability-effect/

### Selective Attention

**Definition.** Users focus on a subset of stimuli relevant to their goals and ignore the rest.

**Principle.** Cognitive bandwidth is finite. Users filter aggressively — banner blindness and missed alerts come from this. Use contrast, motion, position, and timing to bring goal-relevant elements into the filtered set; let everything else recede.

**Source.** Donald Broadbent, 1958 (Filter Theory); Cherry, Treisman, Deutsch & Deutsch.

**For UI mockup prompts.** Reserve the strongest visual contrast for the single goal-relevant action; let supporting content recede in weight.

Source URL: https://lawsofux.com/selective-attention/

### Von Restorff Effect (Isolation Effect)

**Definition.** When multiple similar items appear, the one that differs is most likely to be remembered.

**Principle.** Memory latches onto the outlier. Make the item you want recalled — the primary CTA, the active state, the warning — visually distinct from a uniform field. Distinction must not rely on color alone (fails for color-vision deficits + screen readers).

**Source.** Hedwig von Restorff, 1933.

**For UI mockup prompts.** Render the primary CTA with one contrasting color and elevated scale against neutral secondaries; pair the contrast with a text label and an icon for accessibility.

Source URL: https://lawsofux.com/von-restorff-effect/

---

## Decision-making

### Hick's Law

**Definition.** Decision time grows with the number and complexity of options.

**Principle.** Each added choice taxes reaction time roughly logarithmically, so dense option grids stall decisions. Chunking, recommended defaults, and progressive disclosure cut perceived load without removing capability. Over-simplification that hides the path forward is the opposite failure mode.

**Source.** William Edmund Hick and Ray Hyman, 1952.

**For UI mockup prompts.** Limit any single screen to one primary path with 3-5 visible options max; collapse the rest behind a clearly labeled "More" or progressive-disclosure pattern, and visually distinguish the recommended choice.

Source URL: https://lawsofux.com/hicks-law/

### Choice Overload

**Definition.** Too many options at once degrades decision quality and satisfaction.

**Principle.** When a screen offers many roughly-equivalent options simultaneously, users stall, second-guess, or abandon. The fix is structural: progressive disclosure, sensible defaults, comparison helpers, and filters that let people prune the option set before they commit.

**Source.** Alvin Toffler, 1970 (introduced "overchoice").

**For UI mockup prompts.** Cap visible primary options — render pricing pages with three or four tiers (one marked recommended), product grids with 6–9 hero cards above the fold, settings panels with ≤5 sections. Explicitly say "feature one recommended choice" rather than asking for a wall of equivalents.

Source URL: https://lawsofux.com/choice-overload/

### Occam's Razor

**Definition.** Among options that explain the data equally well, prefer the one with the fewest assumptions.

**Principle.** Strip elements that don't pull weight rather than layering on complexity that has to be untangled later. Build lean from the start instead of pruning a baroque interface afterward.

**Source.** William of Ockham, 14th century.

**For UI mockup prompts.** Specify a minimal element inventory and forbid decorative chrome that doesn't serve a stated user task. Every visual element must answer a question the user has.

Source URL: https://lawsofux.com/occams-razor/

### Pareto Principle (80/20)

**Definition.** Roughly 80% of effects come from 20% of causes.

**Principle.** A small set of features, flows, or fixes drives most of user value. Identify that 20% from analytics and qualitative work, and pour resources there instead of spreading effort uniformly.

**Source.** Vilfredo Pareto, early 20th century.

**For UI mockup prompts.** Visually emphasize the two or three actions that drive the dominant user journey; demote the long tail to secondary surfaces.

Source URL: https://lawsofux.com/pareto-principle/

### Tesler's Law (Conservation of Complexity)

**Definition.** Every system has an irreducible amount of complexity that cannot be eliminated.

**Principle.** Push complexity away from the user and the engineering team absorbs it; push it toward the user and the interface bears it. The designer's job is deciding who carries which slice. Hiding complexity is not the same as eliminating it.

**Source.** Larry Tesler, Xerox PARC, mid-1980s.

**For UI mockup prompts.** Where unavoidable complexity surfaces, render contextual guidance — tooltips, smart defaults, progressive disclosure — at the exact step where it surfaces. Don't pretend the complexity isn't there.

Source URL: https://lawsofux.com/teslers-law/

### Cognitive Bias

**Definition.** Systematic deviations from rational judgment that shape interface perception and decisions.

**Principle.** The brain runs on heuristics — anchoring, confirmation, loss aversion. Designers can either exploit (dark patterns) or counter, but ignoring them means the UI gets misread in repeatable ways.

**Source.** Amos Tversky & Daniel Kahneman, 1972.

**For UI mockup prompts.** Build anchor signals into the mockup — recommended pricing tier larger or color-highlighted, safer default in the pre-selected radio slot, destructive actions in muted secondary styling. Visual weight should match intended decision weight.

Source URL: https://lawsofux.com/cognitive-bias/

---

## Memory & Learning

### Miller's Law

**Definition.** The average person can hold roughly 7 (±2) items in working memory.

**Principle.** Often misread as a rule about menu length — it isn't. The real takeaway is chunking: groups of related items act as one unit in memory, so an interface with 20 items in 4 labeled clusters is easier than 7 unlabeled ones.

**Source.** George Miller, 1956.

**For UI mockup prompts.** Chunk dense screens into 3–5 visually distinct groups with clear headers, instead of a flat list. Never ask for "a long list of settings" — ask for "settings grouped into Account, Notifications, Privacy, Billing, each with 3–5 rows."

Source URL: https://lawsofux.com/millers-law/

### Working Memory

**Definition.** A cognitive system that temporarily holds and manipulates information needed to complete tasks.

**Principle.** Roughly four to seven items for seconds before decay. Users recognize far better than they recall, so persisting prior context across screens, marking visited elements, and using comparison views beats forcing memorization.

**Source.** Miller, Galanter, Pribram (1960); Atkinson and Shiffrin (1968).

**For UI mockup prompts.** Keep prior selections visible on the next screen — render a sticky summary panel and mark previously-visited items distinctly.

Source URL: https://lawsofux.com/working-memory/

### Chunking

**Definition.** Grouping related information into meaningful units makes it easier to process and recall.

**Principle.** Working memory handles a small number of slots, but each slot can hold an arbitrarily large chunk if the contents are bound together. UIs that visually group related fields, cluster nav items by purpose, and use clear hierarchy trade raw item count for digestible structure.

**Source.** George A. Miller, 1956.

**For UI mockup prompts.** Tell the model to organize content into 3–5 visually distinct groups per screen with clear section headings, dividers, or card containers.

Source URL: https://lawsofux.com/chunking/

### Serial Position Effect

**Definition.** Users best remember the first and last items in a series.

**Principle.** Recall favors the extremes — primacy at the start, recency at the end — while middle items fade. Put critical navigation, primary actions, or key options at the bookends of a list or menu.

**Source.** Hermann Ebbinghaus, late 19th century.

**For UI mockup prompts.** Anchor the most important nav items at the leftmost and rightmost positions of a horizontal menu; cluster utilities in the middle.

Source URL: https://lawsofux.com/serial-position-effect/

### Peak-End Rule

**Definition.** People judge an experience by its peak moment and its ending, not the average of every moment.

**Principle.** Memory of a flow is asymmetric — the emotional high (or low) and the final beat dominate recall. Design deliberately for those two points: a satisfying confirmation, a delightful animation at completion, a recovery moment after error. Mediocre middles matter less than a strong close.

**Source.** Kahneman, Fredrickson, Schreiber, and Redelmeier, 1993.

**For UI mockup prompts.** Stage a high-effort celebratory success state and a memorable peak interaction. Let intermediate steps stay calm.

Source URL: https://lawsofux.com/peak-end-rule/

### Zeigarnik Effect

**Definition.** People remember uncompleted or interrupted tasks better than completed ones.

**Principle.** An open loop creates cognitive tension that pulls the user back to close it. Visible progress (partial bars, "3 of 5 steps", greyed-out next sections) converts that tension into completion pressure. Overuse is manipulative; reserve it for genuinely beneficial flows like onboarding or profile setup.

**Source.** Bluma Zeigarnik, 1920s.

**For UI mockup prompts.** Render onboarding progress pre-filled to ~30% with a visible "3 more steps" indicator above the fold.

Source URL: https://lawsofux.com/zeigarnik-effect/

---

## Interaction & Motor

### Fitts's Law

**Definition.** Time to acquire a target depends on its distance and size.

**Principle.** Bigger, closer targets are selected faster and more accurately than small, distant ones. Spacing between interactive elements matters as much as size, since adjacent hit zones cause mis-taps. Place high-frequency controls where the pointer or thumb already lives.

**Source.** Paul Fitts, 1954.

**For UI mockup prompts.** Show primary CTAs as oversized, well-spaced touch targets anchored in the natural pointer/thumb arc, with secondary actions visibly smaller and farther away.

Source URL: https://lawsofux.com/fittss-law/

### Doherty Threshold

**Definition.** Interactions feel productive when the system responds in under 400ms.

**Principle.** Below ~400ms the user stays in flow and treats the machine as an extension of thought; above it, attention drifts and context is lost. Skeleton loaders, optimistic updates, instant hover/press states, and progress indicators substitute for raw speed when the work itself can't finish that fast. **Note:** the user's own `craft/animation-discipline.md` flagged the "400ms" number as folklore — the original 1982 paper does not contain "400". Treat the specific number as approximate; the principle (sub-second feedback keeps users in flow) is sound.

**Source.** Walter J. Doherty and Ahrvind J. Thadani, IBM Systems Journal, 1982.

**For UI mockup prompts.** When mocking interactive surfaces, request explicit feedback states in the same frame — hover, pressed, loading-skeleton, success-toast — and for data-heavy screens render a skeleton/shimmer variant alongside the loaded variant.

Source URL: https://lawsofux.com/doherty-threshold/

### Flow

**Definition.** The state of energized, immersed focus that arises when activity matches skill.

**Principle.** Flow happens when challenge and skill are balanced — too hard breeds frustration, too easy breeds boredom. Continuous feedback and a clear sense of control keep the user inside the state. System friction and latency are the fastest ways to break it.

**Source.** Mihály Csíkszentmihályi, 1975.

**For UI mockup prompts.** Render screens with minimal chrome, immediate-feedback affordances (subtle progress, inline confirmations) and a single dominant task. The surface visibly removes friction rather than decorating it.

Source URL: https://lawsofux.com/flow/

### Goal-Gradient Effect

**Definition.** Motivation to finish a task rises as the goal gets closer.

**Principle.** Users speed up near the finish line, so visible progress acts as fuel. Even artificial or pre-credited progress (a head start on a punch card) accelerates completion. Hidden or absent progress flattens that curve and increases drop-off.

**Source.** Clark Hull, 1932.

**For UI mockup prompts.** Mock multi-step flows with a prominent progress indicator that shows the user already partway along — never starting at zero — and visually emphasize the final step over the earlier ones.

Source URL: https://lawsofux.com/goal-gradient-effect/

### Postel's Law (Robustness Principle)

**Definition.** Be liberal in what you accept, and conservative in what you send.

**Principle.** Take input in whatever shape users naturally give it (phone numbers with or without dashes, dates in mixed formats) and normalize internally. Output, however, should be strict and predictable so downstream systems and users can trust it. The interface absorbs messiness so the user doesn't have to.

**Source.** Jon Postel, network protocol design (1980s).

**For UI mockup prompts.** Show input fields that visibly accept varied formats with quiet inline normalization, and rendered output that follows one consistent format.

Source URL: https://lawsofux.com/postels-law/

---

## Behavior & Expectation

### Jakob's Law

**Definition.** Users spend most of their time on other sites, so they expect yours to work like the ones they already know.

**Principle.** Familiarity is a UX primitive. When you reuse the conventions users encountered elsewhere — nav placement, cart icon, settings gear — they spend zero cycles relearning interaction grammar. Deviation costs attention; novelty must earn its keep.

**Source.** Jakob Nielsen, 2000 (Nielsen Norman Group).

**For UI mockup prompts.** Specify category-conventional layout ("SaaS dashboard with left sidebar nav, top utility bar, primary CTA upper right") so the model anchors to the user's existing pattern library.

Source URL: https://lawsofux.com/jakobs-law/

### Mental Model

**Definition.** A user's compressed internal representation of how a system works.

**Principle.** Every user arrives with a prior — usually built from competitor products and the physical world — and they predict your interface against it. When the prediction holds, the product feels intuitive; when it breaks, friction shows up as confusion, not curiosity.

**Source.** Kenneth Craik, 1943.

**For UI mockup prompts.** Name the closest reference product the target user already knows ("feels like Linear's issue view, not Jira's") so the mockup inherits a transferable interaction grammar.

Source URL: https://lawsofux.com/mental-model/

### Paradox of the Active User

**Definition.** Users never read manuals but start using the software immediately.

**Principle.** People want to make progress on their goal right now, not study how the tool works first. They will not consult external docs even when those docs would speed them up. Bake guidance into the surface itself — tooltips, inline hints, empty-state coaching — where the action happens.

**Source.** Mary Beth Rosson and John Carroll, 1987.

**For UI mockup prompts.** Show contextual coach marks or inline tooltips next to first-use controls instead of a separate help screen.

Source URL: https://lawsofux.com/paradox-of-the-active-user/

### Parkinson's Law

**Definition.** Any task will inflate until all available time is spent.

**Principle.** Work stretches to fill the slot allotted to it, so loose interfaces let users dawdle. Cut friction and pre-fill what you can — autofill, smart defaults, saved state — so a checkout or booking finishes faster than the user expected. Beating the anticipated duration becomes the felt win.

**Source.** Cyril Northcote Parkinson, 1955.

**For UI mockup prompts.** Render forms with autofilled defaults and a visible progress meter that suggests the task ends sooner than the user assumed.

Source URL: https://lawsofux.com/parkinsons-law/

### Cognitive Load

**Definition.** The total mental effort an interface demands to be understood and operated.

**Principle.** Load splits into intrinsic (the inherent difficulty of the task and content) and extraneous (the avoidable difficulty added by poor layout, jargon, inconsistent patterns, or visual noise). The designer can't reduce intrinsic load much, but extraneous load is fully under their control.

**Source.** John Sweller, 1988.

**For UI mockup prompts.** Demand visual restraint — one accent color, one display font, max two type weights per screen, generous padding, at most one primary CTA per viewport.

Source URL: https://lawsofux.com/cognitive-load/

---

## How to use this file

The `[Surface job]` slot in the prompt skeleton already encodes most
structural moves these laws imply (comparison matrix on pricing pages,
F-pattern on dashboards, ONE primary CTA on onboarding, grouped sections
on settings). This file gives you the *why* and a directive-per-law to
pull into the `[Soul]` or `[Aesthetic]` slot when a specific brief calls
for it.

**Quick lookups by surface type:**

- **Pricing page** → Hick's, Choice Overload, Cognitive Bias (anchor on recommended tier), Von Restorff (highlight one tier)
- **Dashboard** → Pareto (emphasize 20% high-traffic actions), Selective Attention (one focal point), Working Memory (sticky filters/state)
- **Settings / form** → Miller's, Chunking, Postel's (liberal input), Cognitive Load (visual restraint)
- **Onboarding** → Goal-Gradient + Zeigarnik (pre-filled progress), Aesthetic-Usability (polish buys patience), Peak-End (memorable success state)
- **Marketing landing** → Aesthetic-Usability, Pareto, Mental Model (look like the category)
- **Search results / list** → Serial Position (anchor at extremes), Law of Proximity / Similarity (consistent row treatment)
- **Modal / dialog** → Fitts's (large action buttons, paired layout), Tesler's (acknowledge complexity), Doherty (instant feedback)

Source attribution: all laws curated by Jon Yablonski at
https://lawsofux.com/. Distillations and prompt directives in this file
are part of the prompt-to-asset project and licensed with the rest of the
plugin.
