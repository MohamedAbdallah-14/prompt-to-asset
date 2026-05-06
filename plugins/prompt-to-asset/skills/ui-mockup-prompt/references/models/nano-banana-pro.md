# Nano Banana Pro (gemini-3-pro-image-preview) — UI mockup prompts

Google's high-fidelity image model. Officially positioned for "complex graphic design, high-fidelity product mockups, and factual data visualizations." Includes a "Thinking" pre-pass useful for multi-region UI logic. Up to 14 reference images (5 high-fidelity).

**Critical syntactic rules (from Google Cloud's Ultimate Prompting Guide):**
- Format prompts as **labeled prose with bracket tags**: `[Subject] ... [Action] ... [Location] ... [Composition] ... [Style] ... [Editing]`
- **Negative prompts NOT supported** — Google's explicit rule: "use positive framing." Write `pure white background`, never `no checkerboard`.
- Reference images must have explicit roles assigned: `Use Image A for X, Image B for Y`.

---

## Template 1 — Web dashboard

```
[Subject] A high-fidelity UI mockup of a working SaaS finance dashboard for a product called "Ledger". The interface is a desktop web app, captured as a clean 1440×900 screenshot.

[Action] The screen displays:
- A left sidebar with the brand wordmark "LEDGER" at top, followed by nav items "Overview" (selected with a primary-blue accent bar), "Transactions", "Invoices", "Customers", "Reports", "Settings", each with a small leading icon.
- A header strip across the top with page title "Overview" and an account avatar showing initials "MA".
- Four KPI cards in a row: "Revenue $148,210 +12.4%", "MRR $12,400 +3.1%", "Active customers 482 +5", "Churn 2.1% -0.3%". Up-arrows are green, down-arrows are red.
- An area chart titled "Revenue — last 30 days" with a smooth blue curve, x-axis dates "Apr 1", "Apr 8", "Apr 15", "Apr 22", "Apr 29", y-axis dollar values labeled.
- A recent transactions table with columns "Customer", "Amount", "Status", "Date". Rows: "Acme Corp / $4,200 / Paid (green pill) / Apr 28", "Globex Industries / $890 / Pending (amber pill) / Apr 27", "Initech LLC / $2,150 / Paid / Apr 26", "Hooli / $675 / Failed (red pill) / Apr 25".

[Location/Context] Light mode interface, white card surfaces #FFFFFF on a body background #F8FAFC, sidebar surface white with hairline divider.

[Composition] Front-facing screen capture, 16:9 aspect ratio for desktop, center-framed, no device chrome, just the UI itself flat to the canvas.

[Style] Modern SaaS UI, Inter-style sans-serif typography, 12px corner radius on cards, 4px blur drop shadow, 16px gutter spacing. Primary color #3B82F6, neutral text #0F172A. The interface should look like a real, shipped product — not concept art, not a wireframe.

[Editing] Render all visible text legibly. Use clean, anti-aliased typography. Pure clean rendering with no watermark, no placeholder copy.
```

## Template 2 — Mobile app screen

```
[Subject] A high-fidelity UI mockup of a working iOS habit tracker app called "Streak". Single mobile screen, captured as a clean 1080×2340 screenshot in portrait orientation.

[Action] The screen shows:
- An iOS status bar at top with "9:41" time, full signal, full battery.
- A large header with title "Today" left-aligned and subtitle "Wednesday, May 6" beneath in smaller secondary weight.
- A circular progress ring centered, filled to 60%, displaying "3 of 5" inside the ring with the words "habits completed" directly beneath.
- A vertical list of 5 habit cards, each with a circular checkbox on the left and habit name + duration:
  "Morning meditation — 10 minutes" (filled green check)
  "Read — 30 pages" (filled green check)
  "Workout — 45 minutes" (filled green check)
  "Hydrate — 8 glasses" (empty grey circle)
  "Journal — 5 minutes" (empty grey circle)
- A bottom tab bar with four tabs: "Today" (selected, in primary green), "Habits", "Stats", "Profile", each with icon above label.

[Location/Context] Light mode, primary color #10B981 emerald, neutral text #18181B, card surface #FFFFFF on body #FAFAFA, iOS-native typography in SF Pro style.

[Composition] Front-facing screen capture, 9:16 portrait aspect (closest supported to 9:19.5), center-framed, screen-only without device frame.

[Style] Real shipped iOS app aesthetic. 28pt large title, 16px corner radius on the ring container, 12px on habit cards, soft 2px drop shadow on the ring. Subtle separation between sections via 24px vertical spacing.

[Editing] Render all visible text legibly. Pure clean rendering, no watermark, no placeholder logos.
```

## Multi-reference recipe (up to 11 refs: 6 object + 5 character)

Google's role-typed reference system. For UI, all refs go in the object slot (no characters):

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        types.Part.from_uri(file_uri=brand_screenshot, mime_type="image/png"),  # object 1
        types.Part.from_uri(file_uri=brand_logo, mime_type="image/png"),        # object 2
        types.Part.from_uri(file_uri=color_swatch, mime_type="image/png"),      # object 3
        types.Part.from_uri(file_uri=wireframe, mime_type="image/png"),         # object 4
        """
        Use Image A (brand-screenshot.png) for the overall visual style and surface treatment.
        Use Image B (brand-logo.png) as the literal logo to place in the header.
        Use Image C (color-swatch.png) as the exact palette to apply to all UI elements.
        Use Image D (wireframe.png) as the structural layout to follow.

        """ + dashboard_template
    ],
)
```

Per [Apiyi's reference guide](https://help.apiyi.com/en/gemini-14-reference-images-object-fidelity-character-consistency-guide-en.html), 5 of those 6 object slots receive higher-fidelity preservation. Place the most-critical refs (target style, exact logo) in the first 5.

## Multi-screen consistency

```
[Subject] A high-fidelity UI mockup showing four iOS screens of a habit tracker app called "Streak", arranged horizontally side-by-side on a single canvas at equal widths, full mobile app workflow visible at a glance.

[Action] Left to right:
Screen 1 — Onboarding: a centered green flame icon, headline "Build streaks. One habit at a time.", subtitle "Track up to 5 habits a day.", primary button "Get started" full-width at the bottom.

Screen 2 — Today: <use Template 2 content>

Screen 3 — Stats: header "Stats", segmented control "Week" selected with "Month" and "Year" alternates, a 7-bar chart for Mon through Sun, three KPI tiles "12 day streak", "94% completion", "152 habits done".

Screen 4 — Profile: large avatar circle with initials "MA" centered top, name "Mohamed A." beneath, "Member since Jan 2025", a settings list with rows "Notifications", "Theme", "Export data", "Help", "Sign out".

[Location/Context] All four screens share the same light mode, primary color #10B981, neutral #18181B, white card surfaces on #FAFAFA body, SF Pro-style sans-serif, identical iOS device chrome and status bar.

[Composition] Wide canvas, four 9:16 mobile screens side-by-side at equal widths.

[Style] Real shipped iOS aesthetic, consistent typography and spacing across all four screens.

[Editing] Render all text legibly. No lorem ipsum.
```

## What to NOT do

- Do not write `negative_prompt` — silently ignored. Use positive framing.
- Do not name design systems ("Material 3 style", "shadcn", "Tailwind") — only Material/HIG names produce a recognizable vibe; the rest are no-ops.
- Do not use `bg-blue-500` or other token names — write `#3B82F6`.
- Do not request ≥6 instances of the same UI component in one render — Nano Banana Pro caps at 5 characters / 6 references by architecture; ≥6 instances drift.
- Do not chain hi-fidelity edits — start fresh each generation.

## Failure modes specific to Nano Banana Pro

- "Bristor", "Fecilitators", "neuse resiguation" — Spinner Substack documented garbled wordmark text on Nano Banana Pro even with explicit short-copy prompts. Quote brand names letter-by-letter and validate via OCR.
- Color-fill ripples / blotchy textures — unfixable by reprompting per Spinner. If output has them, switch model.
- White-space rules ignored. Don't trust gutter spec — composite if pixel-exact.
- Slower than the Flash variant; "Thinking" stage adds latency.
