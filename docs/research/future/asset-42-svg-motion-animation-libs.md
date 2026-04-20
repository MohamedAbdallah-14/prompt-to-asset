# 42 - SVG / Vector / Motion Animation Libraries

External research digest for the `prompt-to-asset` project's optional "animated variant" outputs (logo motion, animated favicons, Lottie / Rive export, server-side GIF / WebP / MP4 rendering).

**Research value: high** — licenses verified, two major 2024–2025 shifts (GSAP free under Webflow, Framer Motion → Motion) are confirmed, and there is a clear OSS authoring path for Lottie via Synfig.

---

## TL;DR recommendation for this project

For a prompt-to-asset project that wants a *deterministic server-side animated-variant pipeline*, the sane target stack is:

| Layer | Pick | Why |
|---|---|---|
| Author / keyframes | **anime.js v4** or **GSAP 3** (both MIT-ish, free) | Programmatic JS keyframes, easy to drive from a template |
| Portable format | **Lottie JSON** | Pure JSON, playable on web/iOS/Android, server-renderable |
| OSS author tool (non-AE) | **Synfig Studio** (GPL) + Lottie Exporter plugin | Real OSS path, no After Effects required |
| Web runtime | **lottie-web** (MIT) | Canvas/SVG/HTML renderer, de-facto standard |
| Server export (GIF/WebP/MP4) | **ed-asriyan/lottie-converter** (headless, no browser) or **puppeteer-lottie** (uses lottie-web) | Both OSS; lottie-converter is Docker-friendly |
| Interactive / state-machine | **Rive** (`.riv`) via `rive-runtime` (MIT) | Only if you need state machines / interactivity |
| Avoid | velocity.js, vivus.js (niche), mo.js (stale), SMIL (alive but not server-exportable cleanly), CSS Houdini Paint (no Firefox/Safari) |

---

## 1. JavaScript animation libraries

### anime.js v4 (Julian Garnier)
- **License:** MIT
- **Status:** v4.0.0 released 2025-04-03; v4.3.6 published Feb 2026. Full rewrite: ESM-first, native TypeScript, zero deps.
- **Input:** JS API — `Timer`, `Animation`, `Timeline`, `Animatable` classes. Four keyframe syntaxes (tween value, tween params, duration-based, percentage-based). New: physics easing (spring, bounce), `createLayout()` for animating between layout states, CSS variable + hex-alpha support, `from`/`to` syntax, composition modes.
- **Output targets:** DOM/CSS transforms, SVG attributes, JS objects (anything numeric).
- **Server export:** Indirect — needs Puppeteer/headless browser to capture frames → ffmpeg. No first-class server exporter.
- **Fit for this project:** **Strong** — small, MIT, modern, easy to drive from a template renderer for logo/favicon motion.

### motion (formerly Framer Motion) — `motiondivision/motion`
- **License:** MIT
- **Status:** In **December 2024**, Framer Motion and Motion One merged into a single project called **Motion**, published as `motion` on npm (from v11.11.12). The old `motiondivision/motionone` repo is archived; `framer-motion` package still published for compat.
- **Input:** JS / React declarative API; built on Web Animations API (WAAPI) where possible.
- **Output:** DOM/CSS, WAAPI (hardware-accelerated in browsers that support it), React component props.
- **Server export:** None native. React-only binding is heavy for a server-side asset pipeline.
- **Fit:** **Moderate** — great if the prompt-to-asset UI is React and needs interactive motion; overkill for producing static animated asset files.

### GSAP (GreenSock)
- **License:** **As of Sept 2024, 100% free for all use (including commercial).** Webflow acquired GSAP in Fall 2024; all previously paid "Club" plugins (SplitText, MorphSVG, DrawSVG, MotionPath, etc.) are now free. Distributed under a "Standard No-Charge License." The GSAP team continues full-time development at Webflow.
- **Restriction to note:** License forbids using GSAP inside tools that let end-users build visual animations *without code* that would compete with Webflow's own visual animation product. For a prompt-to-asset producing asset files, this is not a blocker.
- **Input:** JS — tweens, timelines, MorphSVG, DrawSVGPlugin (line-draw, covers vivus.js's use case), MotionPathPlugin, etc.
- **Output:** DOM, SVG, Canvas, WebGL (via plugins).
- **Server export:** Indirect (Puppeteer + ffmpeg). No first-class exporter.
- **Fit:** **Strong** — license change removes the historical blocker; DrawSVGPlugin + MorphSVGPlugin cover SVG logo motion very well.

### velocity.js (julianshapiro/velocity)
- **License:** MIT.
- **Status:** **Effectively stalled.** v2 never officially shipped; v3 restructuring (`@velocityjs/*` packages) was announced but has seen sporadic activity. Community treats it as unmaintained; anime.js / GSAP have taken its niche.
- **Fit:** **Avoid for new work.**

### mo.js (mojs)
- **License:** MIT.
- **Status:** GitHub repo alive (recent pushes through early 2026), but last stable release v1.7.1 (Oct 2023). Niche motion-graphics toolbelt (shapes, bursts, swirls). Companion editor tools exist but are small-community.
- **Fit:** **Niche** — pick only if you want its built-in "burst/swirl" primitives; not a general animation engine.

### vivus.js (maxwellito)
- **License:** MIT.
- **Status:** v0.4.6, **last published ~4 years ago**. ~15k stars, ~6k weekly downloads. Single-purpose (SVG line-draw).
- **Fit:** **Avoid** — GSAP's now-free `DrawSVGPlugin` and anime.js v4's built-in `strokeDashoffset` path animation do the same thing with more control.

### SVG.js (svgdotjs)
- **License:** MIT.
- **Status:** Actively maintained — v3.2.5 released Sept 2025. Bundled animation API (`.animate()`) is part of core now (the old `svg.animate.js` split no longer applies).
- **Input:** JS — build/manipulate SVG DOM, chained `.animate()` calls.
- **Output:** SVG (DOM).
- **Fit:** **Good for SVG-only use cases** — if the output is an interactive embeddable SVG, SVG.js keeps you within the SVG DOM without bringing in a general-purpose engine. For server-side raster export, same Puppeteer story.

### SMIL (native SVG animation: `<animate>`, `<animateTransform>`, etc.)
- **License:** Part of the SVG spec (no license concern).
- **Status:** **Not deprecated.** Chromium announced intent-to-deprecate in 2015 but never executed; Firefox and WebKit never committed. As of 2025, supported in Chrome, Edge, Firefox, Safari (desktop + iOS). Not hardware-accelerated in WebKit, SVG-only.
- **Input:** Declarative XML inside SVG.
- **Output:** Self-playing SVG file — this is its killer feature: **one file, no runtime JS, no external dependency.**
- **Server export:** Headless browsers *do* render SMIL, but frame-stepping SMIL deterministically is awkward. For GIF/MP4 you usually re-author in Lottie.
- **Fit:** **Excellent for animated favicons and simple static embeds** (ship a single SVG; no JS). Not great when you need GIF/MP4 export.

### css-doodle, CSS Houdini Paint API
- **css-doodle:** MIT web component for generative CSS grids. Cool for background patterns, not a general animation layer.
- **CSS Painting API (Houdini):** Chrome/Edge/Opera only. **Firefox and Safari still do not support it as of 2025.** Not viable for cross-browser assets.
- **Fit:** **Don't rely on these for portable animated assets.**

---

## 2. Portable animation formats

### Lottie (airbnb/lottie-web)
- **License:** MIT (lottie-web).
- **Format:** Lottie JSON — a JSON serialization of After Effects-style vector animations. Renderer-agnostic; plays on web, iOS, Android, Flutter, desktop.
- **Web runtime:** `lottie-web` (canvas, SVG, or HTML renderer).
- **Server export:**
  - **`ed-asriyan/lottie-converter`** (OSS, Docker) — converts `.json` / `.lottie` / `.tgs` → GIF / PNG / APNG / WEBP / WEBM. **No browser required.** Best pick for a server pipeline.
  - **`transitive-bullshit/puppeteer-lottie`** — uses Puppeteer + lottie-web, renders to PNG / GIF (via gifski) / MP4 (via ffmpeg). Heavier (needs Chromium) but highest fidelity since it runs the reference renderer.
  - `lottie-node` — node-canvas based; historically flaky, not recommended.
- **Authoring (OSS, no AE):**
  - **Synfig Studio** (GPL) has built-in Lottie export via the "Export to Lottie" plugin since v1.4.0. Real OSS path. Limitations: bones not exported, some layers get frame-by-frame rasterized, splines with add/remove point changes not supported.
  - **Lottielab / LottieFiles Lottie Creator** — web-based, but **proprietary SaaS, not OSS.** Useful for designers but not a free/OSS toolchain.
  - Programmatic generation: you can emit Lottie JSON directly from a template (the schema is documented at `lottiefiles.github.io/lottie-docs`) — this is the cleanest path for a prompt-to-asset that wants to *generate* animated variants deterministically.
- **Fit:** **This is the format to target.** It's the only vector animation format with both (a) broad runtime support and (b) a clean headless server-side rasterizer.

### Rive (`.riv` / rive-runtime)
- **License:** **MIT** — both `rive-app/rive-runtime` (C++ runtime + renderer) and `rive-app/rive-wasm` (JS/Wasm bindings) are MIT.
- **Format:** `.riv` — binary format produced by the Rive editor. Richer than Lottie: supports **state machines** (interactive animations that respond to inputs), more efficient on mobile.
- **Authoring:** The Rive editor itself is **closed-source SaaS** (free tier exists). There is **no OSS authoring tool** that emits `.riv` files — this is the main asymmetry vs. Lottie.
- **Server export:** rive-runtime is C++/Wasm and can be embedded in a headless renderer, but there is no off-the-shelf `rive → GIF` converter comparable to lottie-converter. Expect to build Puppeteer + rive-wasm + frame capture.
- **Fit:** **Only pick Rive if you need state machines / interactivity.** For static animated asset export, Lottie is the easier target.

---

## 3. Server-side export pipeline (summary)

For `prompt-to-asset`'s "animated variant" output the recommended pipeline is:

1. **Author** as Lottie JSON — either (a) via Synfig Studio for designer-authored assets, or (b) by emitting Lottie JSON directly from a template when the animation is parametric (e.g., "logo draws in, then pulses").
2. **Preview / embed** using `lottie-web` (MIT) in the browser.
3. **Raster export** via `ed-asriyan/lottie-converter` (Docker, no browser) for GIF / WebP / APNG / WebM. Fall back to `puppeteer-lottie` for edge cases where the Skottie/DOM renderer differs.
4. For JS-authored motion (anime.js / GSAP), use Puppeteer + ffmpeg to frame-capture; or if deterministic, precompute keyframes and emit Lottie JSON directly.

---

## 4. License summary table

| Library | License | Free for commercial | Server-export path |
|---|---|---|---|
| anime.js v4 | MIT | Yes | Puppeteer + ffmpeg |
| Motion (ex-Framer Motion) | MIT | Yes | Puppeteer + ffmpeg (React-heavy) |
| GSAP 3 | "Standard No-Charge" (2024) | **Yes** (Webflow acquisition, Club plugins included) | Puppeteer + ffmpeg |
| velocity.js | MIT | Yes | Stalled — avoid |
| vivus.js | MIT | Yes | Avoid (stale) |
| mo.js | MIT | Yes | Niche |
| SVG.js | MIT | Yes | SVG only |
| lottie-web | MIT | Yes | lottie-converter / puppeteer-lottie |
| rive-runtime / rive-wasm | MIT | Yes | DIY (no off-the-shelf exporter) |
| SMIL | Part of SVG spec | Yes | Awkward; re-author in Lottie for GIF/MP4 |
| css-doodle | MIT | Yes | CSS only |
| CSS Houdini Paint API | Part of CSS spec | Yes | **Firefox/Safari unsupported** |

---

## Sources

- Webflow — "Webflow makes GSAP 100% free" — <https://webflow.com/updates/gsap-becomes-free>
- GSAP Standard License — <https://gsap.com/licensing/>
- anime.js v4.0.0 release notes — <https://github.com/juliangarnier/anime/releases/tag/v4.0.0>
- Motion (merger of Framer Motion + Motion One) — <https://motion.dev/blog/should-i-use-framer-motion-or-motion-one>
- motiondivision/motionone (archived) — <https://github.com/motiondivision/motionone>
- rive-runtime LICENSE (MIT) — <https://github.com/rive-app/rive-runtime/blob/main/LICENSE>
- rive-wasm LICENSE (MIT) — <https://github.com/rive-app/rive-wasm/blob/master/LICENSE>
- puppeteer-lottie — <https://github.com/transitive-bullshit/puppeteer-lottie>
- ed-asriyan/lottie-converter — <https://github.com/ed-asriyan/lottie-converter>
- Synfig "Export for Web (Lottie)" docs — <https://synfig.readthedocs.io/en/stable/export/export_for_web_lottie.html>
- svg.js (MIT, v3.2.5 2025) — <https://github.com/svgdotjs/svg.js>
- mo.js LICENSE — <https://github.com/mojs/mojs/blob/main/LICENSE.md>
- vivus npm — <https://www.npmjs.com/package/vivus>
- Smashing Magazine — "SMIL's Not Dead Baby" (2025) — <https://smashingmagazine.com/2025/05/smashing-animations-part-3-smil-not-dead>
- caniuse — SVG SMIL — <https://caniuse.com/svg-smil>
- caniuse — CSS Painting API — <https://caniuse.com/css-paint-api>
- Lottie Docs — <https://lottiefiles.github.io/lottie-docs/>
