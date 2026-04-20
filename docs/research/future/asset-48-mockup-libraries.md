# 48 — Mockup Libraries & Composition Engines

Research digest for composing prompt-to-asset outputs (logos, app icons, screenshots) onto device frames, browser chrome, t-shirts, business cards, and 3D product scenes. Focus: redistribution safety for an open/self-host pipeline, and "mockup-as-code" composition engines.

**Research value: moderate-to-high** — Multiple MIT/Apache asset libraries and composition engines exist, but device-bezel imagery is a persistent trademark minefield; truly "CC0/MIT + redistributable + brand-safe" device frames are rare and must be hand-picked.

---

## TL;DR safety matrix

| Resource | License | Redistribute? | Trademark risk |
|---|---|---|---|
| `pixelsign/html5-device-mockups` | MIT | Yes (code) | Contains Apple bezels/logos — Apple IP guidelines apply |
| `zachleat/browser-window` | MIT | Yes | Safari-style chrome, no logos — safe |
| `@magnit-ce/browser-mockup` | MIT | Yes | Generic Chrome chrome, no logos — safe |
| `marcbouchenoire/dimmmensions` | MIT | Yes (data) | Data only (no imagery) |
| `rmenon1008/mockupgen` (engine) | MIT | Yes (code) | Default templates are Anthony Boyd PSDs — check license |
| Anthony Boyd Graphics templates | "free personal + commercial" (proprietary) | Not as redistributable bundle | Shows real device bezels |
| Android Asset Studio (`romannurik/AndroidAssetStudio`) | Apache-2.0 | Yes (code) | Generic Android/Nexus frames, Google owns marks |
| Google Device Art Generator (the Play tool) | Unspecified T&Cs | No | Do not repackage |
| Meta / Facebook Design "Devices" | Proprietary, no commercial use, no repackage | **No** | Explicitly forbidden |
| Apple Design Resources | Apple Developer Agreement, no redistribution | **No** | Explicitly forbidden |
| Smartmockups / Kittl / deviceframes.com / Magic Mockups | Commercial SaaS | No | — |
| Shots.so | Free tool; user retains output rights | Output usable, not the bezel assets | Uses real devices visually |
| BrowserFrame.com | Free web tool, no stated open license | Outputs only | — |
| Pixeltrue mockups | Royalty-free personal/commercial, **no redistribution, no merch, no template repackaging** | **No** as assets | OK for end-product use |
| Freebbble | Aggregator, per-post license (MIT/CC/custom/"personal only") | Case-by-case | Case-by-case |
| MakerBook | Link aggregator to third-party sites | Follow each upstream | — |

Rule of thumb: **redistribute code + generic chrome, never redistribute bezel imagery of Apple/Samsung/Google physical devices** unless the upstream file is explicitly MIT/CC0 and the trademark risk is documented separately.

---

## 1. Device frame asset libraries

### 1a. Safe to redistribute (code/SVG/CSS, no bezel photography)

- **`zachleat/browser-window`** — MIT. Safari/Windows-style browser chrome web component, no vendor logos. URL bar, traffic lights, theme toggle. Ideal default for website screenshot framing. https://github.com/zachleat/browser-window
- **`@magnit-ce/browser-mockup`** — MIT. Chrome-style tabbed browser as a custom element with `::part()` CSS styling; no Google logos embedded. Good pairing with `browser-window` for multi-browser output. https://www.npmjs.com/package/@magnit-ce/browser-mockup
- **`pulipulichen/Responsive-Frame-Mockup`** — MIT. Browser/phone/tablet frame that responds to content size. Simpler geometry, low-trademark.
- **Android Asset Studio** (`romannurik/AndroidAssetStudio`) — Apache-2.0. Source of the older "Device Art Generator." Frames are generic Android/Nexus shapes (not branded Galaxy/Pixel photos). Apache license means the SVG/PNG frames shipped in-repo *are* redistributable, but Google trademark on the word "Android"/"Nexus" is a separate concern.
- **`marcbouchenoire/dimmmensions`** — MIT. Not imagery — TypeScript data on iOS/iPadOS screen dimensions, corner radii, safe areas. Essential for programmatically positioning a screenshot inside *your own* drawn bezel.

### 1b. Code MIT, but shipped bezel imagery has trademark residue

- **`pixelsign/html5-device-mockups`** — MIT code, 86 device variants (iPhone 5–X, iPad, MacBook, iMac, Galaxy). Maintainers explicitly defer Apple-logo legality to Apple's third-party IP guidelines. Use the *rendering framework*; consider replacing the bundled Apple-branded bitmaps with your own generic frames.
- **`jamesjingyi/mockup-device-frames`** — SVG/PNG of iPhone 16 Pro, iPad Pro, MacBook Pro etc. Sourced from Apple Design Resources and Meta — license on the *repo* does not override the *asset* source licenses. Treat as reference only.
- **`jonnyjackson26/device-frames-media`** — companion to `device-frames-core` on PyPI, which ships under **AGPL-3.0**. AGPL is poisonous for a SaaS like prompt-to-asset; avoid or isolate.

### 1c. Do NOT redistribute (use only as end-product render)

- **Apple Design Resources** — Apple Developer Agreement. You may mock up *your own* app; you may not repackage the device SVGs/PSDs into a tool or library.
- **Meta/Facebook Design "Devices"** — license explicitly states: mockups only, no use in software products, no repackaging and redistributing. Full stop for a composition engine.
- **Smartmockups, Kittl, deviceframes.com, Magic Mockups, MockupScene, Mockoops** — commercial SaaS. Outputs are licensed, assets are not.
- **Shots.so, BrowserFrame.com** — free web tools; they don't grant you a redistributable asset license for the frames themselves. Output usage only.
- **Pixeltrue mockups** — royalty-free for end use, but explicitly forbid redistribution, reselling, sub-licensing, inclusion in redistributable templates, or merchandise. Can't ship their bezels inside a product.
- **Freebbble** — per-post license, ranges from MIT/OFL through "personal only" and "custom." Must audit each individual download; site itself warns license metadata may be wrong.
- **MakerBook** — purely an index pointing to third-party sites (GraphicBurger, Pixelbuddha, Pixeden, MediaLoot). Follow upstream licenses.
- **Anthony Boyd Graphics** — "free for personal and commercial use" but not an open-source license and not framed as redistributable-in-bundle. His PSDs *are* the default templates for `mockupgen`, which is a licensing grey area worth double-checking before shipping.

### 1d. Gap worth noting

There is **no widely-adopted CC0 SVG library of modern device bezels** (2023+). The closest clean option is: start from `dimmmensions` measurements + hand-drawn generic bezels (rounded rectangle + notch geometry), keeping the art "device-inspired" but non-branded. This is the same path that `browser-window` takes for browsers and is the only defensible position for commercial redistribution.

---

## 2. Composition engines (mockup-as-code)

The strong story here. Several MIT/Apache libraries exist that take an input image and a template and produce a composited mockup — pick by runtime.

### Python

- **`rmenon1008/mockupgen`** — MIT. CLI + Python API. Uses OpenCV `warpPerspective` to mask and warp a screenshot onto a template defined by 4 screen corner points in JSON. Ships with Anthony Boyd–derived templates (verify license before redistribution; the *code* is clean). Fastest path to "logo → laptop screen photo."
- **OpenCV (`cv2.getPerspectiveTransform` + `cv2.warpPerspective`)** — BSD-3. The primitive under `mockupgen`. Build your own: define 4 destination points on a bezel photo, compute homography, warp. Perfect for flat/planar targets (laptop screens, phone screens, frames on a wall, t-shirt when roughly flat).
- **Pillow / Wand** — composite + mask + `Image.transform(PERSPECTIVE)` for the same warp without OpenCV. Slower but zero native deps.

### Node.js / web

- **`sharp`** — Apache-2.0. `.composite()` with blend modes, gravity, offsets. Best for flat overlays (logo on business card PNG, logo on t-shirt flat-lay PNG with multiply/screen blending). Does not do perspective warp natively; pair with a warp step.
- **`wanadev/perspective.js`** — Apache-2.0. Canvas-based quadrilateral transform. Drop-in for browser-side warping onto a laptop-screen rectangle. Good companion to `sharp` on the server or to a client canvas.
- **`adonmo/perspective.ts`** — TypeScript fork of the above, Apache-2.0.
- **`@resvg/resvg-js` + Satori** — for template-driven text+image mockups (e.g., "logo on a business card at 45°") composed declaratively in JSX, without a headless browser. Already in the prompt-to-asset orbit via the OG-image skill.
- **Playwright / Puppeteer** — render an HTML+CSS mockup (using `browser-window`, `html5-device-mockups`, or your own bezel SVG) and screenshot. Pragmatic for 2D mockups; lets you leverage any MIT HTML/CSS frame as a "template."

### 3D / photorealistic

- **Blender + `mockup-screenshoter` add-on** (GPL) — drives a Blender scene and composites screenshots. Good for 3D angled laptop/phone renders, but GPL add-on output is fine; the *add-on itself* can't be embedded in a non-GPL product.
- **three.js** — MIT. Build a 3D device model (GLB/GLTF), map the input image as a texture on the screen mesh, render to canvas via `WebGLRenderer.domElement.toDataURL()`. Requires a GLB device model — KitBash3D/TurboSquid/Sketchfab have options; filter to CC0/CC-BY on Sketchfab for the model itself.
- **GLB device models from Sketchfab (CC0 filter)** — search `device mockup`, filter Downloadable + CC0. Quality varies; this is the pragmatic three.js route.

### Recommended stack for prompt-to-asset

For a defensible open/self-host pipeline:

1. **Browser frames:** bundle `zachleat/browser-window` + `@magnit-ce/browser-mockup` (MIT, no logos).
2. **Device frames:** draw generic bezel SVGs using `dimmmensions` geometry (MIT data) → keeps trademarks out.
3. **Flat composition:** `sharp` composite for business cards, t-shirts, flat-lays.
4. **Perspective composition:** `perspective.js` (browser) or `mockupgen`/raw OpenCV (server) for angled screens.
5. **3D composition (optional):** three.js + CC0 GLB device models, render to PNG.
6. **Template-driven mockups:** Satori + `@resvg/resvg-js` for declarative business cards, t-shirts, social cards.
7. **Do not ship:** any PSD/PNG/SVG derived from Apple Design Resources, Meta Devices, Smartmockups, Pixeltrue, or Anthony Boyd bundles as primary assets — treat as reference only.

---

## Sources

- https://github.com/pixelsign/html5-device-mockups — MIT HTML5 device mockups (Apple logo caveat)
- https://github.com/zachleat/browser-window — MIT Safari-style browser frame component
- https://www.npmjs.com/package/@magnit-ce/browser-mockup — MIT Chrome-style browser component
- https://github.com/pulipulichen/Responsive-Frame-Mockup — MIT responsive browser/phone/tablet frame
- https://github.com/romannurik/AndroidAssetStudio — Apache-2.0 Android Asset Studio source
- https://github.com/marcbouchenoire/dimmmensions — MIT iOS/iPadOS device dimensions dataset
- https://github.com/rmenon1008/mockupgen — MIT Python mockup composition engine
- https://github.com/wanadev/perspective.js — Apache-2.0 canvas perspective transform
- https://github.com/adonmo/perspective.ts — Apache-2.0 TypeScript fork
- https://sharp.pixelplumbing.com/api-composite — Apache-2.0 Node image compositing
- https://design.facebook.com/license/ — Meta Design license (no commercial redistribution)
- https://developer.apple.com/design/resources/ — Apple Design Resources (Developer Agreement, no redistribution)
- https://www.pixeltrue.com/license — Pixeltrue license (no redistribution/merch/templates)
- https://www.anthonyboyd.graphics/license/ — Anthony Boyd Graphics license
- https://freebbble.com/ — aggregator, per-post license
- https://developer.android.com/distribute/marketing-tools/device-art-generator — Google Device Art Generator
- https://shots.so/terms, https://browserframe.com — free tools, outputs only
