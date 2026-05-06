# Flux 2 Pro / Flex — UI mockup prompts

BFL's flagship for text-heavy design. Microsoft Foundry markets Flex variant explicitly for "text-heavy design and UI prototyping." Only model with **explicit ordinal indexing in prompt syntax** ("from image 2") — best fit for "wireframe + style screenshot + logo" three-ref UI workflows.

**Capabilities:**
- 8 input images via API, 10 in Playground
- Parameters: `input_image`, `input_image_2`, ..., `input_image_8`
- Prompt addresses refs by ordinal: `"layout from image 1, palette from image 2, logo from image 3"`
- Flex variant: tunable `steps` and `guidance` for finer control
- Hex-color matching documented (BFL example: `#00D9FF`, `#6B0FB3` preserved across refs)

**Limits:**
- **No `negative_prompt`** — silently no-op. Use positive anchors.
- 5-10 words / 1 tagline reliable per BFL prompting guide. UI dashboards with many labels: composite text.
- Word-order priority per BFL: Main subject → Key action → Critical style → Essential context → Secondary details.

---

## Template 1 — Web dashboard, three-ref ordinal indexing

This is Flux 2's signature workflow. Three refs, addressed by ordinal in the prompt:

```
input_image:    wireframe.png   (the layout to follow)
input_image_2:  brand-style.png (the visual style to match)
input_image_3:  brand-logo.png  (the literal logo to place)

prompt:
A realistic web app dashboard UI mockup, desktop screenshot 1440×900.

Take the layout structure from image 1: left sidebar nav, top header strip,
main content area with KPI cards row above an area chart above a transactions table.

Take the visual style from image 2: light mode, white card surfaces, subtle drop shadows,
modern Inter-style sans-serif typography, 12px corner radius on cards.

Use the logo from image 3 placed in the upper-left of the sidebar header.

Content to render in the dashboard:
- Sidebar nav: "Overview" (selected), "Transactions", "Invoices", "Customers", "Reports", "Settings"
- Page title "Overview", account avatar "MA"
- KPI cards: "Revenue $148,210 +12.4%", "MRR $12,400", "Customers 482", "Churn 2.1%"
- Area chart titled "Revenue — last 30 days"
- Transactions table: "Acme Corp $4,200 Paid", "Globex $890 Pending", "Initech $2,150 Paid"

Primary color #3B82F6, neutral #0F172A, body background #F8FAFC.

Aspect ratio 16:9 desktop. Pure clean rendering. Render text legibly. No lorem ipsum.
```

## Template 2 — Mobile screen with palette lock

Use Flex variant when text density is moderate and you need precise palette match:

```
input_image:    palette-swatch.png   (the exact hex palette)
input_image_2:  brand-logo.png       (the logo)
input_image_3:  reference-screen.png (a target app screen for style)

prompt:
A realistic iOS mobile app UI mockup, single screen captured as a 1080×2340 portrait screenshot.

Match the palette strictly from image 1.
Use the brand mark from image 2 in the navigation bar.
Take the visual style and component aesthetic from image 3.

The screen is the "Today" view of a habit tracker app named "Streak", showing:
- Status bar with "9:41"
- Header "Today", subtitle "Wednesday, May 6"
- Centered circular progress ring at 60%, "3 of 5" inside
- Five habit cards listed vertically, three with green check filled, two with empty grey circle
- Bottom tab bar with "Today" selected

Real shipped iOS aesthetic, SF Pro-style sans-serif, 16px corner radius on the ring container.
Aspect ratio 9:16 portrait.

Render all text legibly. No lorem ipsum.
```

## Multi-screen consistency via ref pinning

```
input_image:    canvas-grid.png     (4-screen layout grid template)
input_image_2:  brand-style.png     (style ref)
input_image_3:  brand-logo.png      (logo)
input_image_4:  primary-color.png   (palette swatch)

prompt:
A 4-screen horizontal canvas mockup of an iOS habit tracker app called "Streak".

Use the layout grid from image 1 to position 4 screens side-by-side at equal widths.
Take the visual style from image 2.
Place the logo from image 3 in screen 1's hero area.
Match the palette from image 4 across all screens.

Screen 1 (Onboarding): centered green flame icon, headline "Build streaks.", subtitle
"One habit at a time.", bottom button "Get started".

Screen 2 (Today): circular progress ring 60%, 5 habit cards as in template 2.

Screen 3 (Stats): segmented control "Week" selected, 7-bar chart, 3 KPI tiles
"12 day streak", "94% completion", "152 habits done".

Screen 4 (Profile): avatar circle "MA", name "Mohamed A.", settings list "Notifications",
"Theme", "Export data", "Help", "Sign out".

Aspect ratio 16:9 wide canvas. Pure clean rendering. Render text legibly across all screens.
```

## API call example (Together AI surface)

```python
import requests

response = requests.post(
    "https://api.together.xyz/v1/images/generations",
    headers={"Authorization": f"Bearer {TOGETHER_API_KEY}"},
    json={
        "model": "black-forest-labs/FLUX.2-pro",
        "prompt": dashboard_prompt,
        "input_image": wireframe_url,
        "input_image_2": style_url,
        "input_image_3": logo_url,
        "aspect_ratio": "16:9",
        "n": 1,
    }
)
```

Flex variant exposes additional knobs:
- `steps` — higher = more refinement, slower, costlier
- `guidance` — higher = stricter adherence to prompt; lower = more model creativity

For UI mockups: start at default `steps`, raise `guidance` if the model wanders from the spec.

## Word-order priority (BFL guidance)

Front-load the most-important elements. BFL's order:

1. **Main subject** — "A realistic web app dashboard"
2. **Key action** — what's on screen
3. **Critical style** — "modern SaaS, Inter typography"
4. **Essential context** — "light mode, primary #3B82F6"
5. **Secondary details** — corner radius, drop shadows, spacing

Putting palette before subject confuses the model on Flux 2. Subject first.

## Negative prompts on Flux 2

Don't write them. Silently ignored. From BFL: *"FLUX.2 does not support negative prompts."* Use positive anchors instead. Replace:

| Don't write | Write |
|---|---|
| `no checkerboard` | `pure white background` |
| `no lorem ipsum` | `realistic content with real customer names and numbers` |
| `no garbled text` | `crisp, anti-aliased typography, every label clearly readable` |
| `no concept art` | `real shipped product look` |

## Failure modes specific to Flux 2

- Past 10 words / 1 tagline of in-image text, errors compound. Composite long copy.
- Models sometimes ignore brand-text-from-ref-3 if the prompt buries the logo direction late. Front-load it.
- No `negative_prompt` means no easy "no checkerboard" guard — rely on validation post-render.

## When Flux 2 beats the alternatives

- You have 3 distinct refs to combine (wireframe + style + logo). Only Flux 2 has clean ordinal indexing.
- Brand palette must match exact hex. BFL documents hex-locked color preservation.
- Need fine `steps` / `guidance` control on Flex.

## When to skip Flux 2

- Dashboard has many labeled rows. Text cap kicks in. Use gpt-image-2.
- Need a `negative_prompt`. Use Ideogram.
- Single-screen, no refs. gpt-image-2 has higher Elo on text accuracy and is faster to iterate.
