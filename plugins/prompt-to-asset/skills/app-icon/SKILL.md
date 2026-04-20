---
name: app-icon
description: Generate an app icon from a single 1024² master and fan out to iOS (AppIcon.appiconset with squircle-ready 1024 opaque), Android (adaptive foreground + background + Android 13 monochrome), PWA (192/512 + 512 maskable with 80% safe zone), and visionOS (3-layer parallax).
trigger_phrases: [app icon, make an app icon, ios icon, android icon, pwa icon, launcher icon]
---

# App icon generation

## Platform requirements (non-negotiable)

| Platform | Size/format | Transparency | Safe zone |
|---|---|---|---|
| **iOS App Store** | 1024×1024 PNG, **no alpha** | **opaque** | squircle mask applied by OS; keep subject in 824px center |
| iOS device | 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20 (@1x, @2x, @3x) | opaque | same |
| iOS 18 dark / tinted | Icon Composer layered source | per-layer | same |
| **Android adaptive** | 108 dp foreground + 108 dp background; 72 dp visible safe zone | FG yes / BG no | 72 dp of 108 dp |
| Android 13 monochrome | themed drawable | yes | same |
| Google Play | 512×512 PNG, no alpha | opaque | — |
| **PWA** | 192, 512 `any`; 512 `maskable` | `maskable`: opaque + 80% safe zone | 80% of 512 for maskable |
| **visionOS** | 3× 1024² PNGs (parallax layers) | per-layer | — |

## Generation — mark, then pack

**Never generate per-platform. Always: one 1024² RGBA master → deterministic fan-out.**

1. Route the *mark* generation (see `skills/logo/SKILL.md`) — no text; subject-only.
2. Matte with BiRefNet if the chosen provider returned opaque.
3. Deterministic export via `pipeline/export.ts::exportAppIconBundle` (pure `sharp` — no external CLI dependency):
   - **iOS:** `AppIcon.appiconset/Contents.json` + every required PNG (iPhone/iPad/Mac/Watch/marketing). 1024 marketing variant flattened onto brand primary color (App Store rejects alpha). iOS 18 dark/tinted `appearances` emitted when `ios_18_appearances: true`.
   - **Android:** `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` + `mipmap-anydpi-v26/ic_launcher.xml` pointing to `ic_launcher_foreground` + `ic_launcher_background` + `ic_launcher_monochrome` (foreground-derived via greyscale+threshold; the final themed-icon result should still be audited manually for complex marks).
   - **PWA:** `192.png`, `512.png`, `512-maskable.png` (80% safe-zone padding) + `manifest-snippet.json`.
   - **visionOS:** 1024² `master.png` + a README describing the 3-layer parallax split that Xcode's Reality Composer Pro or a manual Photoshop step produces.
   - **Favicon bonus:** `.ico` (16/32/48 multi-res) via optional `png-to-ico`; falls back to separate PNGs with a warning if the dep is absent.

## Prompt scaffold

```
A [flat vector | isometric 3D | glyph | soft gradient] app icon representing [SUBJECT, concrete noun phrase].
Bold, memorable silhouette. High contrast.
Subject fills 70-80% of frame, centered.
No text, no labels, no wordmark.
Palette: [#primary, #secondary, #accent].
Solid pure white background.
1:1 square, 1024x1024.
```

For platform styling: `iOS-style rounded square backdrop` or `Android-style adaptive foreground on transparent` can be added to steer, but the **mark should be subject-only** — backdrop is applied deterministically in export.

## Android 13 monochrome derivation

Heuristic (see Open Question G11 in SYNTHESIS.md): `sharp(foreground).greyscale().threshold(128).tint('#000')`. Works for bold single-subject marks; audit visually for complex marks.

## Validation

- 1024 marketing variant: opaque, dimensions exact, file <1MB.
- Android foreground: tight-bbox inside 72dp of 108dp.
- PWA maskable: subject inside 80% center circle.
- Contrast at 16×16 (renders to "favicon-ish" size): WCAG AA vs both white and dark card.
- No text detected by OCR (app icons must be text-free).

## Output
```
app-icon/
├── master.png                      # 1024² RGBA
├── ios/AppIcon.appiconset/         # Contents.json + all sizes
├── ios/AppIcon-1024-opaque.png     # App Store marketing
├── android/mipmap-*/ic_launcher.png
├── android/mipmap-anydpi-v26/ic_launcher.xml
├── android/drawable/ic_launcher_{foreground,background,monochrome}.png
├── pwa/{192,512,512-maskable}.png
├── pwa/manifest-snippet.json
├── visionos/{front,middle,back}.png   # if parallax
└── meta.json
```
