# Nano Banana 2 (gemini-3.1-flash-image-preview) — UI mockup prompts

Faster, cheaper Flash variant. Ranked #1 on Artificial Analysis Image Arena at launch. Google's announcement explicitly ships UI mockup as the example use case. ~Pro quality at Flash speed.

**Differences from Pro:**
- 14 refs total: **10 object + 4 character** (Pro is 6 + 5). Larger object budget for widget collages.
- 131k input tokens (Pro: 65k). Relevant if the brief embeds long copy or structured data.
- "Thinking levels" knob: Minimal vs High/Dynamic. Raise for complex multi-region UI.
- Same `[Subject][Action][Location][Composition][Style][Editing]` bracket-tag format as Pro.
- New aspect ratios in 3.1: 4:1, 1:4, 8:1, 1:8, plus a 512px efficiency tier.

Use Nano Banana 2 when:
- Ref budget exceeds Pro's 6-object cap (e.g., 8 widget collages in one canvas)
- Cost matters
- Latency matters

Use Pro instead when text density is high and accuracy matters more than speed. Pollo's benchmark: gpt-image-2 wins on UI-with-labeled-components, Nano Banana 2 wins on e-commerce/brand visuals.

---

## Template 1 — Web dashboard with widget collage (uses 10-object ref budget)

```
[Subject] A high-fidelity UI mockup of an analytics dashboard for a product called "Pulse". Desktop web app screenshot, 1440×900.

[Action] The interface displays a sidebar nav, a header strip, and a main grid of 8 dashboard widgets:
- Sidebar nav (left, 240px): brand wordmark "PULSE" top, items "Dashboard" (selected, primary teal), "Sources", "Audiences", "Funnels", "Alerts", "Settings" with leading icons.
- Header: page title "Last 7 days" left, date range selector "Apr 30 – May 6" right, refresh icon button.
- Main 4×2 widget grid:
  Widget 1: number tile "Total visitors" 24,318 +8.4%
  Widget 2: number tile "Conversions" 412 +2.1%
  Widget 3: number tile "Avg session" 3m 42s -0.3%
  Widget 4: number tile "Bounce rate" 38% -1.2%
  Widget 5: line chart "Visitors over time" with 7 data points
  Widget 6: bar chart "Top sources" with bars labeled "Direct", "Google", "Twitter", "Reddit", "Newsletter"
  Widget 7: donut chart "Device split" 62% desktop, 31% mobile, 7% tablet
  Widget 8: small list "Top pages" with rows "/pricing 3,210", "/docs 2,840", "/blog/changelog 1,520", "/case-studies 1,210"

[Location/Context] Dark mode, primary teal #14B8A6, neutral text white, card surfaces #1E293B on body #0F172A, slim hairline borders #334155.

[Composition] 16:9 desktop landscape, screen-only no device chrome, all widgets visible in one screenshot.

[Style] Modern dark-mode analytics dashboard. Inter-style sans-serif. 8px corner radius on widgets, subtle inner glow on selected nav. 12px gap between widgets in the grid.

[Editing] Render all numbers and labels legibly. Pure clean rendering, no watermark.
```

## Template 2 — Mobile screen, e-commerce strength

Pollo benchmarks Nano Banana 2 specifically as strong on e-commerce/brand visuals. Use for shopping/marketplace mobile UI.

```
[Subject] A high-fidelity UI mockup of an iOS shopping app called "Threadhouse". Single mobile product detail screen.

[Action] The screen displays:
- Status bar 9:41, signal, battery
- Sticky header: back chevron, title "Product details", heart/bookmark icon right
- Hero image area: a single high-quality product photo of a dark green wool sweater on a soft beige background, taking the upper third of the screen
- Image carousel dots beneath, 4 dots, first selected
- Product info block:
  Brand "MERINO & MOSS"
  Title "Heavyweight wool crewneck"
  Price "$148"
  Sub-line "Free shipping on orders over $75"
- Color picker row: 4 circular swatches labeled "Forest" (selected with ring), "Charcoal", "Camel", "Cream"
- Size picker: 5 pill buttons "XS", "S", "M" (selected, filled), "L", "XL"
- Reviews summary: 5 stars, "4.8 — 1,247 reviews"
- Bottom CTA bar: full-width primary button "Add to cart — $148"

[Location/Context] Light mode, primary forest green #166534, neutral text #1C1C1E, white surface, accent cream #F5F1E8 for hero background.

[Composition] 9:16 portrait, single iOS screen, no device frame.

[Style] Premium e-commerce iOS aesthetic, SF Pro-style typography, 8px corner radius on image, 24px corner radius on CTA pill button, soft 1px hairline dividers between sections.

[Editing] Render all product copy legibly. No lorem ipsum, no placeholder pricing.
```

## Multi-reference recipe (10 object + 4 character)

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[
        # Up to 10 object refs — UI structure, brand, palette, components, screenshots
        types.Part.from_uri(file_uri=brand_screenshot, mime_type="image/png"),
        types.Part.from_uri(file_uri=brand_logo, mime_type="image/png"),
        types.Part.from_uri(file_uri=palette_swatch, mime_type="image/png"),
        types.Part.from_uri(file_uri=widget_1, mime_type="image/png"),
        types.Part.from_uri(file_uri=widget_2, mime_type="image/png"),
        types.Part.from_uri(file_uri=widget_3, mime_type="image/png"),
        types.Part.from_uri(file_uri=widget_4, mime_type="image/png"),
        types.Part.from_uri(file_uri=icon_set, mime_type="image/png"),
        # Up to 4 character refs (rarely used for UI; could pass user-avatar samples)
        # types.Part.from_uri(...),
        """
        Use Image 1 (brand-screenshot.png) for the overall visual signature.
        Use Image 2 (logo.png) as the literal logo in the header.
        Use Image 3 (palette.png) as the strict color palette.
        Use Images 4–7 as visual references for widget styling.
        Use Image 8 as the icon vocabulary.

        """ + dashboard_template
    ],
    config=types.GenerateContentConfig(
        # Raise thinking level for complex multi-region UI
        # (consult Google docs for current parameter name)
    ),
)
```

## Multi-screen consistency

Same single-canvas-with-N-screens pattern as Pro. With 10 object refs, you can pass widget references for each screen if needed.

## Failure modes specific to Nano Banana 2

- Text accuracy ~90% (Pro is higher). For dashboard with many labels, prefer Pro.
- "May struggle with grammar, spelling, cultural nuances, or idiomatic phrases" in non-English (Google admission).
- Same architectural cap as Pro on character/component repetition (5 chars / 6 refs identity carry).

## Negative prompts

Same as Pro: not supported. Positive framing only.

## Resolution / aspect ratio

3.1 supports more aspects than Pro: 4:1, 1:4, 8:1, 1:8 in addition to standard 1:1, 9:16, 16:9. Useful for ultra-wide hero strips above a dashboard or vertical infographics. The 512px efficiency tier is fine for thumbnail/concept previews; raise to 1K/2K for final.
