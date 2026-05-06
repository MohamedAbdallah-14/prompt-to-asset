# Midjourney v7 — UI hero / mood prompts ONLY

**Critical:** Midjourney does not render legible UI text. Practitioners (Chase Jarvis, Pedro Sostre, UX Planet stress test) confirm: 37 iterations to converge a single label, kerning still drifts. **Do not use Midjourney for any UI screen with real labels, forms, tables, or data.**

Use Midjourney for:
- Hero illustration above the dashboard
- Marketing imagery composited *behind* a real UI rendered in code
- Mood/vibe pieces for stakeholder buy-in (where text is fake-by-design)
- Empty-state spot art
- App store screenshots that are stylized, not functional

Don't use for:
- Single dashboard screens with real text
- Mobile screens with real labels
- Anything where OCR Levenshtein matters

**Reference primitives:**
- `--sref <url|code>` — style reference, transfers palette + composition + brushwork
- `--cref <url>` — character reference (faces, persistent identity)
- `--oref <url>` — Omni-Reference (1 image, weight 0–1000, default 100, sweet spot ~400)
- `--sw 0–1000` — style weight
- `--ow 0–1000` — omni weight
- `--ar` — aspect ratio
- `--text "..."` — explicit text (~15 char ceiling, still unreliable)

`--oref` is incompatible with Fast / Draft / Conversational modes and costs 2× GPU.

---

## Template 1 — Hero illustration above a dashboard

Generate an illustration that sits above your real-coded dashboard.

```
/imagine prompt:
abstract isometric illustration of a control room with floating data panels,
soft ambient teal and cyan lighting, clean modern flat-vector style,
generous negative space at the bottom for UI to overlay,
muted dark navy background --ar 16:5 --sref <BRAND_PALETTE_URL>
--style raw --v 7 --stylize 200
```

Notes:
- `--ar 16:5` — wide hero strip that sits above a 16:9 dashboard
- `--sref` — pin the palette via a brand-style image URL (not a code unless you've found one that works for your brand)
- `--style raw` — less stylized, more controllable
- `--stylize 200` — middle ground; raise for more flair, lower for more literal

## Template 2 — App store hero screenshot (stylized)

The faux-UI shot for marketing, where text doesn't have to be real:

```
/imagine prompt:
mobile app screenshot mockup of a habit tracker, clean light mode aesthetic,
emerald green accent, large circular progress indicator centered,
list of habit cards beneath, soft drop shadows, real product feel,
SF Pro-style typography (will composite real text later),
iPhone 15 Pro Max with Dynamic Island visible, wood desk background slightly blurred
--ar 9:16 --oref <REAL_DASHBOARD_SCREENSHOT_URL> --ow 400
--sref <BRAND_STYLE_URL> --sw 300 --style raw --v 7
```

Notes:
- `--oref` with the real screenshot at weight 400 — locks layout and palette without trying to copy text
- `--sref` at weight 300 — softer style influence
- After generation: composite all real text in Figma/Photoshop. Midjourney's text will be gibberish; ignore it.

## Template 3 — Empty-state spot art

```
/imagine prompt:
single isometric illustration of a tiny figure standing next to an empty cardboard box,
emerald green and cream palette, flat vector style, generous whitespace,
friendly inviting feel, no text in the image
--ar 1:1 --style raw --v 7 --stylize 250
```

## Stacking `--oref` and `--sref`

Midjourney docs state `--oref` "should work with personalization, stylization, style references, and moodboards." Practitioner pattern (TitanXT, ImaginePro):

```
--oref <CONTENT_REF_URL> --ow 400 --sref <STYLE_REF_URL> --sw 300
```

Same image as both `--oref` and `--sref` locks both content and look. Different images split the roles.

## What NOT to write in a Midjourney prompt for UI

- `--text "Dashboard"` — works for ≤15 chars but inconsistent. Don't rely on it.
- `--ar 9:19.5` — out of distribution. Use `--ar 9:16` and crop.
- `negative prompt: ...` — Midjourney has no negative prompt syntax. Use `--no <thing>` flag if anything.
- Long literal label lists. The model will produce gibberish-resembling-those-labels.

## Failure modes specific to Midjourney v7

- Text is always gibberish past ~15 chars. Practitioners universally composite real text post-generation.
- Component drift across image grid (4-image set produces 4 different aesthetics). Use `--seed` to lock.
- v6 regressed on UI screen grids vs v5 per Pedro Sostre; v7 partially restored but text still misformed.

## Workflow with code-coded UI

The right pattern when you want a Midjourney aesthetic on a real dashboard:

1. Build the dashboard in code (Tailwind / shadcn / SwiftUI / Flutter)
2. Generate hero/background art in Midjourney (`--ar` matched to layout)
3. Composite Midjourney output behind the real UI as a hero strip or background
4. Real text stays crisp because it's HTML/native; aesthetic stays Midjourney

This is Chase Jarvis's documented "Midjourney as Director of Photography" pattern.

## When to skip Midjourney entirely

- The brief includes any real label, form, table, or data row → use gpt-image-2 or Nano Banana Pro instead
- The brief is a single mobile screen with a CTA → use Ideogram 3 Turbo or gpt-image-2
- You need API automation → Midjourney is paste-only via Discord/web; route to a model with native API
