# gpt-image-2 — UI mockup prompts

OpenAI's flagship image model, released 2026-04-21. LMArena #1 for image generation, +242 Elo over Nano Banana Pro on text-heavy UI at launch. Default choice for any UI mockup with real labels.

**Knobs:**
- `quality: "high"` — required for dense / multi-region layouts
- No `negative_prompt` — use inline exclusions
- `/edits` accepts up to 16 images; first ref preserved at extra-rich texture
- **`background: "transparent"` does NOT work on gpt-image-2** (regression vs 1.5; 400s). For translucent UI, use gpt-image-1.5.

---

## Template 1 — Web dashboard (single screen)

```
Create a realistic web app dashboard UI mockup for a SaaS finance product called "Ledger".
Show a desktop browser screenshot, 1440×900 light-mode.

Header: small brand wordmark "LEDGER" upper-left, page title "Overview" centered, account avatar with initials "MA" upper-right.

Sidebar (240px wide, white surface, hairline divider):
- "Overview" (selected, primary blue accent bar)
- "Transactions"
- "Invoices"
- "Customers"
- "Reports"
- "Settings"
Each item has a 20px leading icon (line-style, neutral grey).

Main content area:
- 4 KPI cards in a row, each with a label, large number, and percent delta arrow:
  "Revenue" $148,210 +12.4% (green up-arrow)
  "MRR" $12,400 +3.1%
  "Active customers" 482 +5
  "Churn" 2.1% -0.3% (red down-arrow)
- An area chart titled "Revenue — last 30 days" with a smooth curve, x-axis dates "Apr 1", "Apr 8", "Apr 15", "Apr 22", "Apr 29", y-axis dollar values
- A recent transactions table with columns "Customer", "Amount", "Status", "Date":
  Row 1: "Acme Corp" / $4,200 / Paid (green pill) / Apr 28
  Row 2: "Globex Industries" / $890 / Pending (amber pill) / Apr 27
  Row 3: "Initech LLC" / $2,150 / Paid / Apr 26
  Row 4: "Hooli" / $675 / Failed (red pill) / Apr 25

Style: light mode, primary #3B82F6, neutral text #0F172A, card backgrounds #FFFFFF on body #F8FAFC, sans-serif typography in the Inter family, 12px corner radius on cards, 4px blur drop shadow.

It should look like a real shipped product, not concept art. Quality: high. Render all text legibly. No lorem ipsum, no watermark, no placeholder logos.
```

## Template 2 — Mobile app screen

```
Create a realistic iOS app UI mockup for a habit tracker app called "Streak".
Show a single iPhone 15 Pro Max screen with Dynamic Island visible, portrait 9:19.5 (or closest 9:16, will crop).

Status bar: 9:41 time, full signal, full battery, at the very top.

Header: large title "Today" left-aligned, sub-label "Wednesday, May 6" beneath in a smaller secondary weight.

Main:
- A circular progress ring centered, 60% complete, with "3 of 5" text inside and "habits completed" beneath
- A list of 5 habit cards stacked vertically, each card 12px corner radius, white surface on neutral background:
  Card 1: green check filled circle, "Morning meditation" — "10 minutes" — done
  Card 2: green check filled circle, "Read" — "30 pages" — done
  Card 3: green check filled circle, "Workout" — "45 minutes" — done
  Card 4: empty grey circle, "Hydrate" — "8 glasses" — pending
  Card 5: empty grey circle, "Journal" — "5 minutes" — pending

Bottom tab bar: 4 tabs with icons + labels
"Today" (selected, primary color) | "Habits" | "Stats" | "Profile"

Style: light mode, primary #10B981 (emerald), neutral #18181B, card surface #FFFFFF on body #FAFAFA, SF Pro-style sans-serif, 16px corner radius on the ring container, 12px on cards, large 28pt page title.

Real shipped iOS app aesthetic. Quality: high. Render all text legibly. No lorem ipsum, no placeholder logos.
```

## Variant — multi-screen consistency (single canvas, 4 screens)

When you need 4 mobile screens to share palette and brand:

```
Create a realistic iOS app UI mockup for "Streak", a habit tracker. Four screens side-by-side on one canvas, equal width, 4:3 overall aspect (landscape canvas, four 9:16 screens internally).

Screen 1 — Onboarding:
- Center hero icon (flame, primary green)
- Title "Build streaks. One habit at a time."
- Subtitle "Track up to 5 habits a day."
- Primary button "Get started" full-width

Screen 2 — Today (use Template 2 main content)

Screen 3 — Stats:
- Header "Stats", segmented control "Week" (selected) / "Month" / "Year"
- Bar chart with 7 bars Mon–Sun, values 4,5,3,5,5,4,3
- 3 KPI tiles below: "12 day streak" / "94% completion" / "152 habits done"

Screen 4 — Profile:
- Avatar circle with initials "MA" centered top
- Name "Mohamed A." beneath
- Stat row: "Member since Jan 2025"
- Settings list: "Notifications", "Theme", "Export data", "Help", "Sign out"

All four screens share: primary #10B981, neutral #18181B, white card surfaces on #FAFAFA body, SF Pro-style sans-serif, identical iOS device chrome with Dynamic Island.

Quality: high. Render all text legibly. No lorem ipsum.
```

## When to reach for `/edits` instead of `/generate`

Pass references when you need brand fidelity. Order matters — first image gets extra-rich preservation:

```python
client.images.edit(
    model="gpt-image-2",
    image=[
        open("brand-screenshot.png", "rb"),   # ref 1: target style (extra-rich preserved)
        open("brand-logo.png", "rb"),         # ref 2: logo
        open("wireframe.png", "rb"),          # ref 3: structure
    ],
    prompt="Apply the visual style of image 1 (brand screenshot) to a dashboard with the structure of image 3 (wireframe). Use the logo from image 2 in the header. " + dashboard_template,
    quality="high",
    input_fidelity="high",
)
```

## Negative prompts on gpt-image-2

There is no `negative_prompt` parameter. Inline exclusions only. End every prompt with:
`No lorem ipsum, no placeholder logos, no watermark, no concept-art look, no design-mockup labels.`

## Failure modes specific to gpt-image-2

- High visual polish, structural errors. Always verify component count, label correctness, and number coherence before ship.
- Invents vendor names and chart numbers. Fix by quoting every label literally.
- Multi-edit chains accumulate grain. Generate-once, refine-once, stop. Cap at 6 iterations.
- No transparency. For glassmorphism / translucent panels, use gpt-image-1.5 instead.

## Iteration discipline

1. First call → check OCR + ΔE + safe-zone.
2. If labels wrong → regenerate with stricter quoting, max 2 retries.
3. If palette drift → add explicit hex anchors to every region.
4. If layout wrong → switch to `/edits` with a wireframe reference.
5. After 6 iterations → stop. Move to Figma cleanup or change model.
