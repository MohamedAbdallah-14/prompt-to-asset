# Ideogram 3 Turbo — UI mockup prompts

Best for: short-text marketing screens, onboarding, splash screens, hero CTAs. Wireframe-fidelity, not pixel-perfect production UI.

**Strengths:**
- **Native `negative_prompt` field** — only one of the strong models that has it.
- Sharp text rendering on short strings (3–6 words reliable, ~10 with seed retry).
- `style_type: "DESIGN"` preset is built for graphic-design-with-text.

**Limits:**
- Hard ceiling ~150-160 words / ~200 tokens per prompt
- Text ceiling 3–6 words per element. Dashboards with 10+ rows of varied text break.
- Don't use for tables, dense forms, charts with axis labels — composite text post-render or use another model.

**Settings to lock in:**
- `style_type: "DESIGN"` for UI mockups
- `magic_prompt: "OFF"` for already-detailed prompts (prevents rewrite drift)
- `rendering_speed: "TURBO"` for fast, slightly lower text fidelity than non-turbo

---

## Template 1 — Mobile onboarding screen

Ideogram's sweet spot. Single screen, hero copy + CTA, brand-locked.

```
[Summary] A clean iOS app onboarding screen mockup for a habit tracker named "Streak".

[Main Subject] A modern mobile phone screen with a centered illustration of a stylized green flame icon, prominent at the upper-third of the screen.

[Action] Below the flame, large bold headline reads "Build streaks." in 36pt sans-serif. Beneath it, smaller subtitle "One habit at a time." in 18pt regular weight.

[Secondary Elements] At the bottom of the screen, a primary full-width pill button labeled "Get started" in white text on emerald green fill. Below the button, smaller text link "I already have an account".

[Setting] Pure white background, very minimal decoration. iPhone screen aspect ratio.

[Lighting] Soft, even, flat — UI screenshot style, no rendering shadows or photographic lighting.

[Framing] Centered, mobile portrait 9:16, screen-only no device frame.

[Enhancers] Sharp typography, crisp edges, real-product polish, SF Pro-style sans-serif. Modern minimalist iOS aesthetic.

negative_prompt: "lorem ipsum, garbled text, placeholder copy, blurry, sketch, wireframe lines, watermark, design mockup labels, checkerboard, transparent background"
```

## Template 2 — Marketing screen / landing page hero

Single hero section above the fold of a marketing site. Short headline + sub + CTA.

```
[Summary] A clean marketing website hero section mockup for a SaaS analytics product named "Pulse".

[Main Subject] A horizontal hero strip taking the full width of a desktop browser viewport. Centered text content with no imagery to the left, just typography.

[Action] Large bold headline in 64pt: "See what works." Beneath it, sub-headline in 22pt: "Real-time analytics for product teams." Below that, two side-by-side buttons: a primary teal-filled "Start free trial" and a secondary outlined "Watch demo".

[Secondary Elements] Above the headline, a small navigation bar with logo wordmark "PULSE" left, nav links "Product", "Pricing", "Docs", "Blog" center, and a "Sign in" link plus "Sign up" pill button right. Below the buttons, small grey text "No credit card required. 14-day trial."

[Setting] White background, very minimal decoration, no decorative shapes or gradients.

[Lighting] Flat UI lighting, no shadows other than 1px hairline beneath the nav bar.

[Framing] 16:9 desktop landscape aspect, screen-only no browser chrome.

[Enhancers] Sharp Inter-style sans-serif typography, generous whitespace, premium SaaS aesthetic, real shipped product.

negative_prompt: "lorem ipsum, garbled text, placeholder copy, blurry, sketch, wireframe, watermark, design mockup label, checkerboard"
```

## Style reference recipe

Up to ~10MB total of style refs (JPEG/PNG/WebP). Useful for brand lock:

```python
import requests

response = requests.post(
    "https://api.ideogram.ai/v1/ideogram-v3/generate",
    headers={"Api-Key": IDEOGRAM_API_KEY},
    files={
        "style_reference_images[0]": open("brand-screenshot.png", "rb"),
        "style_reference_images[1]": open("brand-logo.png", "rb"),
    },
    data={
        "prompt": onboarding_template,
        "style_type": "DESIGN",
        "magic_prompt": "OFF",
        "rendering_speed": "TURBO",
        "aspect_ratio": "9x16",
        "negative_prompt": "lorem ipsum, garbled text, blurry, sketch, watermark",
    }
)
```

Note: `style_reference_images` and `style_codes` are **mutually exclusive**. Pick one.

## Negative prompts that work

Ideogram is the only strong-text model with native negatives. Useful set for UI mockups:

```
lorem ipsum, garbled text, placeholder copy, blurry, sketch, wireframe lines,
watermark, design mockup labels, checkerboard pattern, transparent background,
photographic lighting, dramatic shadows, rendered 3d, illustration style
```

Per Ideogram docs: "descriptions in the prompt take precedence to descriptions in the negative prompt." Anchor positives first.

## What NOT to ask Ideogram for

- Dashboard with 10+ data rows. Will hallucinate or garble.
- Multi-region screen with 6+ labeled regions. Hits the 150-word prompt ceiling fast.
- Pixel-precise typography spec. Wireframe-fidelity ceiling — close but never exact.
- Long body copy. Past 10 words per element, errors compound.

For those cases, route to gpt-image-2 or Nano Banana Pro.

## Transparency

For transparent UI elements (modals, sticker overlays), use the **dedicated** endpoint:

```
POST https://api.ideogram.ai/v1/ideogram-v3/generate-transparent
rendering_speed: "TURBO"
```

There is no `style: "transparent"` parameter — it's a separate endpoint entirely.

## Iteration discipline

Same 6-iteration cap. If text won't render at 3 retries, add seed sweep (Ideogram supports `seed`); if 6 fail, drop to a smaller wordmark or composite real text in code.
