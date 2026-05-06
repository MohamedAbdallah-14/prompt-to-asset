# gpt-image-1.5 — UI mockup prompts

OpenAI's prior flagship. LMArena #1 for dense text. Use it for any UI screen with translucent panels (gpt-image-2's `background:"transparent"` is broken). Cookbook calls UI mockups out as a flagship use case for 1.5 specifically.

**Critical knobs:**
- `quality: "high"` — required for dense layouts
- `input_fidelity: "high"` — first 5 refs preserved at higher fidelity
- The Cookbook's 1.5-specific note: **"For complex requests, use short labeled segments or line breaks instead of one long paragraph."** Use slot-labeled format.
- `background: "transparent"` works on 1.5 (broken on 2)

---

## Template 1 — Web dashboard with glassmorphism / translucent surfaces

When the UI calls for translucent panels, glassmorphism, or backdrop blur — use 1.5, not 2.

```
Asset: realistic web app dashboard UI mockup, dark-mode glassmorphism aesthetic
Frame: desktop browser chrome 1440×900, dark wallpaper with subtle blue/purple gradient behind UI

Header: brand wordmark "AURORA" upper-left in white, page title "Workspace" center, account avatar circle "MA" upper-right

Sidebar (translucent glass surface, 240px wide, backdrop-blur ~20px, white text, 1px white-with-10%-alpha border):
- "Workspace" (selected, primary cyan glow)
- "Projects"
- "Calendar"
- "Inbox"
- "Settings"

Main:
  Region 1 (4 translucent KPI cards, each glass surface with white text):
    "Open issues" 24
    "Resolved this week" 18
    "Active members" 7
    "Sprint velocity" 32 pts
  Region 2 (translucent line chart card titled "Velocity — last 6 sprints" with cyan curve and white grid lines)
  Region 3 (translucent activity feed: "Lana opened PR #482 — 2h ago", "Marcus deployed staging — 4h ago", "Yusuf merged PR #481 — 6h ago")

Style: dark mode, primary cyan #06B6D4, accent purple #A855F7, surfaces are translucent glass with backdrop blur, text in Inter-style sans-serif, 16px corner radius on glass cards, soft outer glow on selected nav item

Aspect: 16:9 desktop landscape
Quality: high. Render all text legibly. No lorem ipsum, no placeholder logos. background: transparent.
```

## Template 2 — Mobile screen, dense form

1.5 handles dense forms slightly better than 2 in some practitioner reports because of its "short labeled segments" guidance. Use when many fields with labels matter.

```
Asset: realistic iOS app UI mockup, settings/profile edit screen
Frame: iPhone 15 Pro screen, portrait, light mode, 9:19.5 (or 9:16 closest)

Status bar: 9:41 time, signal, battery — top
Navigation bar: back chevron + label "Profile" left, large title "Edit profile" beneath, "Save" button right (primary blue, disabled grey if no change)

Main (scrollable form):
  Section 1 — Avatar:
    Circular avatar "MA", "Change photo" button beneath
  Section 2 — Personal info (each row: label above, input field below):
    "Full name"      [Mohamed Abdallah]
    "Display name"   [@mabdallah]
    "Email"          [mohamed@example.com]
    "Phone"          [+1 (555) 234-5678]
    "Date of birth"  [June 14, 1992]
  Section 3 — Address:
    "Street"         [1234 Market Street]
    "City"           [San Francisco]
    "State"          [California]
    "ZIP"            [94103]
  Section 4 — Preferences (toggle rows):
    "Email notifications"   [toggle on, primary blue]
    "Push notifications"    [toggle on]
    "Marketing emails"      [toggle off, neutral grey]

Style: light mode, primary #007AFF (iOS system blue), neutral text #1C1C1E, input field background #F2F2F7, white card sections separated by 16px gaps, SF Pro-style sans-serif, 10px corner radius on input fields, 14px on section cards.

Quality: high. Render all text legibly. No lorem ipsum, no placeholder logos.
```

## Multi-image edit recipe

The Cookbook flagship UI example targets 1.5. Order matters — first image gets extra-rich preservation:

```python
client.images.edit(
    model="gpt-image-1.5",
    image=[
        open("target-app-screenshot.png", "rb"),  # ref 1: extra-rich, the look to match
        open("brand-logo.png", "rb"),             # ref 2: logo
        open("color-swatch.png", "rb"),           # ref 3: palette
        open("wireframe.png", "rb"),              # ref 4: structure
        open("typography-sample.png", "rb"),      # ref 5: type spec
    ],
    prompt="Generate a dashboard in the visual style of image 1 (target app), using the logo from image 2 in the header, the palette from image 3, the layout from image 4, and the typography from image 5. " + dashboard_template,
    quality="high",
    input_fidelity="high",
)
```

The "first 5 preserved at higher fidelity" carve-out is documented in the OpenAI Cookbook. Refs 6–16 are still accepted but with reduced texture preservation.

## Negative prompts

No native field. Inline exclusions only. End every prompt with:
`No lorem ipsum, no placeholder logos, no watermark.`

## When to use 1.5 over 2

- UI needs `background: "transparent"` (translucent panels, glassmorphism, modals)
- Dense form with many labeled fields — 1.5's "short labeled segments" guidance maps cleanly
- You already have an `input_fidelity:"high"` workflow with 5+ refs
- Batch cost matters — 1.5 is cheaper per call

Otherwise, prefer gpt-image-2 for new work. The +242 Elo gap on text-heavy UI is real.

## Iteration discipline

Same as gpt-image-2: cap at 6 iterations, generate-once-refine-once on `/edits` to avoid grain accumulation. The OpenAI feedback thread documents grain build-up on chained high-fidelity edits.
