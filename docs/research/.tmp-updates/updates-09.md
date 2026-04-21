# Research Update Log — Category 09 (App Icon Generation)
**Updated:** 2026-04-21
**Files audited:** 7 (9a, 9b, 9c, 9d, 9e, index.md, SYNTHESIS.md)
**Files modified:** 4 (9b, 9c, 9e, SYNTHESIS.md)

---

## Summary of changes

### 9b — Android Adaptive & Themed Icons
**File:** `9b-android-adaptive-themed-icons.md`

1. **Android 16 QPR2 mandatory theming (NEW — major change).**
   Android 16 QPR2 shipped December 2025 and made auto-themed icons mandatory. Apps without a `<monochrome>` layer get a system-generated fallback via color-filtering. Google Play DDA section 5.3 was updated (effective Sep 15 2025 new devs / Oct 15 2025 existing devs) requiring devs to grant users permission to theme icons. The monochrome layer has moved from "recommended" to effectively required for Play Store apps.
   - Added new subsection "Android 16 QPR2 — mandatory auto-theming (December 2025+)" under the Gating section.
   - Added note to Pattern A split-generation section flagging monochrome as required.
   - Sources: Android Developers Blog QPR2 Beta 1, Android Developers Blog QPR2 Released, Android Police, 9to5Google.

2. **Gemini/Imagen free API stale claim corrected.**
   The AI Image Generation references section pointed to Firebase AI Logic and Gemini API docs without noting that the Gemini image API free tier dropped to 0 IPM on December 7, 2025. Added a dated caveat block explaining that unbilled keys return HTTP 429 and directing users to AI Studio web UI + `asset_ingest_external` for free Gemini image generation.

### 9c — PWA & Web App Manifest Icons
**File:** `9c-pwa-web-app-manifest-icons.md`

1. **pwa-asset-generator repo URL corrected.**
   The tooling comparison table still used the old `onderceylan/pwa-asset-generator` GitHub link. Updated to `elegantapp/pwa-asset-generator` (the canonical current repo). Also updated star count from 2.2k to ~3.0k.

### 9e — Prompt Patterns for App Icons
**File:** `9e-prompt-patterns-for-app-icons.md`

1. **Model recommendations table fully updated.**
   - `gpt-image-1` → GPT Image 1.5 as primary OpenAI model (released December 16, 2025; 4× faster, 20% cheaper, same RGBA path). `gpt-image-1` noted as legacy/still available.
   - "Midjourney v6 / v7" → "Midjourney v7" (launched April 2025); added note that v7 added near-native SVG export and improved text fidelity.
   - "Ideogram 2/3" → "Ideogram 3 / Ideogram 3 Turbo" with pricing ($0.03/image Turbo) and Style References capability.
   - "Gemini 2.5 Flash Image" → "Gemini 3.1 Flash Image" ("Nano Banana 2", current Google model as of Feb 2026) with explicit **no free API tier since Dec 7, 2025** caveat.
   - Added overall header note explaining the timeline of changes.

2. **Reference-guided generation section updated.**
   - "gpt-image-1 / GPT Image 1.5" → "GPT Image 1.5" as the current model name.
   - "Gemini 2.5 Flash Image" → "Gemini 3.1 Flash Image" with billing caveat.

### SYNTHESIS.md
**File:** `SYNTHESIS.md`

1. **Finding #6 (Android monochrome) updated** to reflect Android 16 QPR2 mandatory theming. Monochrome layer is now effectively required, not recommended, for Play Store apps targeting Android 13+.

2. **9e angle description updated** — model ranking corrected: GPT Image 1.5 replaces gpt-image-1; Midjourney v7 replaces v6/v7; Ideogram 3 replaces Ideogram 2/3; Gemini 3.1 Flash Image replaces Gemini 2.5 Flash Image. Added dated update note.

3. **Master-generation model routing updated** — GPT Image 1.5 replaces `gpt-image-1`; Gemini 3.1 Flash Image replaces 2.5 Flash Image; billing caveat added for Gemini.

4. **Android layer recommendations** — added dated note that monochrome is now required by Android 16 QPR2, not just recommended.

5. **Seed pinning text** — updated `gpt-image-1` reference to GPT Image 1.5.

6. **Models & Prompting primary sources section** — added GPT Image 1.5 model page and Gemini 3.1 Flash Image model card. Retained gpt-image-1 community thread (RGBA technique still applicable).

7. **Google/Android sources section** — added Android 16 QPR2 Beta 1 blog, QPR2 released blog, and Android Police mandatory theming coverage.

8. **Date stamps updated** — `date:` and snapshot callout updated from 2026-04-19 to 2026-04-21.

---

## Files with NO changes needed

- **9a — iOS App Icon HIG Specs:** Already up-to-date as of 2026-04-19 with iOS 26/Xcode 26, Liquid Glass, Icon Composer, visionOS parallax layers, and the three-appearance model. No claims found to be stale.
- **9c — PWA & Web App Manifest Icons:** Core spec content (W3C manifest, maskable 80% safe zone, apple-touch-icon chain, dark-mode SVG favicon, WebAPK/TWA) all current. Minor fix to pwa-asset-generator URL/star count only.
- **9d — Icon Generation Tools Survey:** Core tool inventory accurate. flutter_launcher_icons v0.14.4 (Jun 2025) already reflects iOS 18 dark/tinted support added in v0.14.0. pwa-asset-generator already uses elegantapp URL. star counts noted as "late-2025/early-2026" order-of-magnitude estimates.
- **index.md:** No substantive claims — just a table of contents. No changes needed.

---

## Verification status of key claims

| Claim | Status | Evidence |
|---|---|---|
| Gemini/Imagen image API free tier gone since Dec 2025 | CONFIRMED | Free tier has 0 IPM for image generation since Dec 7, 2025; billing enables Tier 1 |
| Android 16 QPR2 mandatory icon theming | CONFIRMED | Shipped Dec 2025; DDA 5.3 updated; auto-generates monochrome if missing |
| GPT Image 1.5 released Dec 2025 | CONFIRMED | Released Dec 16, 2025; available via API as gpt-image-1.5 |
| GPT Image 1.5 RGBA/transparent background | CONFIRMED | Same API path as gpt-image-1; documented at developers.openai.com |
| Gemini 2.5 Flash Image shut down | CONFIRMED | Model shut down January 15, 2026 |
| Gemini 3.1 Flash Image = current Google model | CONFIRMED | Nano Banana 2, available as of Feb 2026 |
| Midjourney v7 near-native SVG export | CONFIRMED (partial) | v7 launched April 2025; SVG export capability improved |
| Ideogram 3 Turbo pricing ~$0.03/image | CONFIRMED | Available on Replicate and fal.ai |
| appicon.co / makeappicon.com still active | CONFIRMED | Both accessible and operational in 2026 |
| pwa-asset-generator ~3.0k stars | CONFIRMED | Bug filed March 2026 shows active maintenance; star count confirmed ~3k |
| iOS safe zone ~820px in 1024 canvas | NOT CHANGED | 9a covers this correctly; web search confirms Apple's ~10% margin principle |
| visionOS 3-layer parallax, min 2 layers | NOT CHANGED | 9a covers correctly, no changes since 2025 |
