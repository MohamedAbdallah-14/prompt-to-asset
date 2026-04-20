---
category: 10-ui-illustrations-graphics
angle: 10e
title: "Illustration → Production Pipeline: Animation, Responsive Formats, Framework Wrappers, Accessibility"
subagent: 10e
date: 2026-04-19
status: draft
tags:
  - lottie
  - rive
  - dotlottie
  - webp
  - avif
  - svgr
  - next-image
  - sveltekit-enhanced-img
  - astro-image
  - accessibility
  - prefers-reduced-motion
  - cloudinary
  - imgix
  - imagekit
primary_sources:
  - https://airbnb.io/lottie/
  - https://github.com/airbnb/lottie-web
  - https://developers.lottiefiles.com/
  - https://dotlottie.io/spec/2.0/
  - https://github.com/LottieFiles/dotlottie-web
  - https://rive.app/docs/runtimes/react
  - https://github.com/rive-app/rive-react
  - https://react-svgr.com/
  - https://nextjs.org/docs/app/api-reference/components/image
  - https://docs.astro.build/en/guides/images/
  - https://github.com/sveltejs/kit/tree/main/packages/enhanced-img
  - https://sharp.pixelplumbing.com/
  - https://developers.google.com/speed/webp
  - https://github.com/AOMediaCodec/libavif
  - https://www.w3.org/WAI/tutorials/images/decorative/
  - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
  - https://cloudinary.com/documentation
  - https://docs.imgix.com/
  - https://imagekit.io/docs/
---

# Illustration → Production Pipeline (Angle 10e)

## Executive Summary

A generated illustration (from Recraft, Midjourney, Flux, Imagen, or any other T2I/T2V model) is only *half* the work. Between "I have a PNG/SVG that looks good" and "it renders fast, animates gracefully, and passes a11y review in production" lies a pipeline that most prompt-engineering guides ignore. This angle maps that pipeline for the prompt-to-asset system.

**Top findings:**

1. **Format choice is a decision tree, not a default.** Static vector → SVG (inlined or via SVGR). Static raster (hero/marketing) → AVIF with WebP fallback and a JPEG/PNG baseline, served responsively. Motion with looping/branded feel → Lottie (`.json`) or dotLottie (`.lottie`, up to ~80% smaller and now the LottieFiles default in v2.0). Interactive / state-driven motion → Rive (`.riv`) via the WebGL2 runtime. Each format has distinct tooling, bundle cost, and accessibility implications.
2. **`prefers-reduced-motion` is not optional.** Both Lottie and Rive auto-play by default. A production-grade wrapper MUST read `window.matchMedia('(prefers-reduced-motion: reduce)')`, pause or swap to a static poster frame, and re-subscribe on the `change` event. Framework wrappers (rive-react's `useRive`, lottie-web's `loadAnimation`, `@lottiefiles/dotlottie-web`) do *not* honor the OS setting unless you wire it yourself.
3. **The cheapest optimization is the build step, not the CDN.** Sharp + `cwebp` + `libavif`/`avifenc` at build time, combined with framework-native responsive wrappers (`next/image`, `<Image />` in Astro, `<enhanced:img>` in SvelteKit), removes 50–80% of bytes before a single request hits the edge. CDN transforms (Cloudinary / imgix / ImageKit) are additive: use them for user-uploaded or AI-generated content where a build step cannot know the asset in advance.

The prompt-to-asset skill should therefore *not* stop at "here is a prompt that produces a good PNG." It should emit a **delivery recipe** alongside every generated asset: target format set, recommended component wrapper, alt text, and motion-sensitivity behavior.

---

## Format Decision Matrix

| Asset intent | Best format | Fallback chain | Rationale | Tooling |
| --- | --- | --- | --- | --- |
| Logo / icon, flat vector | Inline SVG or SVGR component | PNG 2x @ retina | Scales losslessly, themable via CSS `currentColor`, zero decode cost | SVGR, SVGO |
| Hero / marketing illustration, photorealistic | AVIF | WebP → JPEG | 30–50% smaller than WebP, 50–70% smaller than JPEG; 96%+ browser support in 2026 | sharp, `avifenc`, `cwebp` |
| UI illustration with flat palette (onboarding, empty states) | SVG (raster→vector via `vtracer`) | AVIF+WebP if vectorization fails | Crisp on all DPRs, themable, tiny | Recraft / `vtracer` / `potrace` |
| Looping motion (success, loader, empty-state flourish) | dotLottie v2.0 (`.lottie`) | Lottie JSON → static SVG/PNG poster | Branded vector motion at a fraction of GIF/MP4 size; themable in v2.0 | Bodymovin (AE), `@lottiefiles/dotlottie-web` |
| Interactive animation (state-driven, hover, scroll) | Rive (`.riv`) with state machine | MP4 or static SVG poster | First-class state machines, smaller than JS-driven SVG | Rive editor, `@rive-app/react-webgl2` |
| Large photo / AI-generated hero | AVIF (q=60–70) | WebP (q=80) → JPEG (q=85) | AVIF advantage grows at large sizes and low bitrates | sharp + CDN |
| User-generated / dynamic AI asset | CDN-transformed (Cloudinary, imgix, ImageKit) | format=auto, fetch format negotiation | Build step unavailable; let CDN pick per UA | `f_auto,q_auto` / `auto=format,compress` |
| Splash / OG / social share card | PNG baseline (1200×630), optional WebP | — | Many scrapers still mis-handle AVIF/WebP | sharp, `@vercel/og` |
| Favicon | SVG + ICO fallback | PNG 32/192/512 | Modern browsers use SVG; `favicon.ico` stays for legacy | `real-favicon-generator`, `pwa-asset-generator` |

Key tradeoffs:

- **AVIF encode time is significantly higher than WebP.** Acceptable for a CI/build job; problematic for request-time transformation unless cached. Cloudinary and imgix mitigate this by caching derivative URLs.
- **Lottie JSON is text-heavy.** A single complex Lottie can exceed 500 KB. dotLottie v2.0 compresses via ZIP and can reach <100 KB for equivalent animations. Prefer dotLottie for any new work; the spec is at [`dotlottie.io/spec/2.0/`](https://dotlottie.io/spec/2.0/).
- **Rive's advantage disappears for single-state loops.** If you don't need states, transitions, or inputs, Lottie is simpler, smaller in runtime (~60 KB `dotlottie-web` vs. ~200 KB for `@rive-app/canvas` and ~400 KB for the WebGL2 variant).

---

## SVG → Lottie Recipe (Designer + Developer Handoff)

The canonical pipeline, from Airbnb's [Lottie docs](https://airbnb.io/lottie/) and [LottieFiles developer portal](https://developers.lottiefiles.com/):

1. **Design in After Effects.** Keep shapes as AE shape layers, not imported raster. Nested comps are fine; expressions should be limited to those supported by Bodymovin (position, scale, rotation; avoid `wiggle()`, `time`, `loopOut` in complex forms — validate with the plugin's "JS expressions" warning list).
2. **Export with Bodymovin** (`github.com/airbnb/lottie-web` → `/extension`). Install the `.zxp`, then from AE: Window → Extensions → Bodymovin. Select the comp, choose "Standard" JSON (or dotLottie if on LottieFiles' official Bodymovin fork). Turn on "Glyphs" to convert text to shapes (text rendering across platforms is unreliable).
3. **Optimize JSON.** Run `lottie-json-optimizer` or LottieFiles' web optimizer. Typical wins: 20–40% via decimal precision reduction, 10–20% via stripping hidden layers and trimmed keyframes.
4. **Convert to dotLottie (recommended for 2026+).** Use `@lottiefiles/dotlottie-js` or the LottieFiles web converter. v2.0 adds theming tokens (for light/dark adaptation) and optional state machines that can be triggered without JS.
5. **Sanity-check on-device.** Open on an older Android (Chromium 110-ish) and a recent Safari. Complex masks and `merge paths` nodes can silently degrade on iOS WebKit; if the animation judders, flatten masks in AE and re-export.
6. **Generate a poster frame.** For `prefers-reduced-motion` users and `<noscript>` contexts, export frame 0 as SVG or PNG at the same dimensions. Store it alongside the `.lottie`.

Runtime wiring (web):

```ts
import { DotLottie } from '@lottiefiles/dotlottie-web';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

const player = new DotLottie({
  canvas: canvasEl,
  src: '/anim/onboarding.lottie',
  loop: true,
  autoplay: !prefersReduced.matches,
});

prefersReduced.addEventListener('change', e => {
  e.matches ? player.pause() : player.play();
});
```

If `prefersReduced.matches` is true *and* the animation is decorative, prefer skipping the fetch entirely and rendering the poster `<img>` — this saves the ~60 KB runtime too.

---

## Framework Integration Table

| Framework | Static image component | SVG-as-component | Lottie wrapper | Rive wrapper |
| --- | --- | --- | --- | --- |
| **Next.js (App Router)** | `next/image` (auto-WebP; AVIF via `images.formats`) | `@svgr/webpack` + `next.config.js` `webpack` override, or import as `.svg?url` for `<img>` | `@lottiefiles/dotlottie-react` or `lottie-react` | `@rive-app/react-webgl2` (recommended) or `@rive-app/react-canvas` |
| **Astro** | `<Image />` / `<Picture />` from `astro:assets` (sharp backend; `format={['avif','webp']}`) | `astro-icon` or raw SVG import; SVGR available via integration | `@lottiefiles/dotlottie-web` inside `client:only` island | `@rive-app/canvas` inside `client:visible` island |
| **SvelteKit** | `<enhanced:img>` (Vite plugin `@sveltejs/enhanced-img`, sharp under the hood) | Raw SVG `<Component>` via vite's `?component` or `svelte-preprocess` | `@lottiefiles/dotlottie-svelte` | `@rive-app/canvas` + custom action/store |
| **Vue (Nuxt 3)** | `<NuxtImg>` / `<NuxtPicture>` via `@nuxt/image` (ipx, sharp, or CDN providers) | `vite-svg-loader` or `vue-svg-loader` | `@lottiefiles/dotlottie-vue` | `rive-vue` (community) or `@rive-app/canvas` |
| **SolidStart** | `solid-start-image` / native `<img>` + Vite | `vite-plugin-solid-svg` | `@lottiefiles/dotlottie-solid` | `@rive-app/canvas` |
| **Plain HTML** | `<picture>` with AVIF → WebP → fallback | Inline `<svg>` | `@lottiefiles/dotlottie-web` (UMD bundle) | `@rive-app/canvas-lite` (UMD) |

### Next.js: AVIF + WebP configuration

```js
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 828, 1080, 1280, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};
```

Place AVIF before WebP — `next/image` iterates the array and picks the first format the client `Accept` header supports. The built-in optimizer uses sharp; for large production workloads, front it with a CDN loader (`loader: 'custom'` + `loaderFile`) pointing at Cloudinary/imgix to avoid hot-loop AVIF encoding on the origin.

### SVGR recipe (Next.js / Vite)

`@svgr/webpack` v8.1.0 ([npm](https://www.npmjs.com/package/@svgr/webpack)) is the de-facto standard for importing SVGs as React components. Pair with the query suffix trick so the same file can be used both as a URL and as a component:

```js
webpack(config) {
  config.module.rules.push({
    test: /\.svg$/,
    resourceQuery: { not: [/url/] },
    use: ['@svgr/webpack'],
  });
  config.module.rules.push({
    test: /\.svg$/,
    resourceQuery: /url/,
    type: 'asset/resource',
  });
  return config;
}
```

Usage:

```tsx
import Logo from './logo.svg'; // React component
import logoUrl from './logo.svg?url'; // URL string for <img>
```

Enable SVGO via `svgoConfig` to strip IDs, comments, and hidden layers — otherwise AI-generated SVGs from Recraft/Ideogram routinely carry 20–40% dead weight.

### SvelteKit `<enhanced:img>`

`@sveltejs/enhanced-img` (currently 0.10.x, still pre-1.0 per the [CHANGELOG](https://github.com/sveltejs/kit/blob/main/packages/enhanced-img/CHANGELOG.md)) auto-generates AVIF + WebP variants at build time, strips EXIF, and emits width/height to prevent CLS:

```svelte
<enhanced:img
  src="./hero.jpg?w=320;640;1024;1920"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="Team collaborating around a whiteboard"
/>
```

Caveat: it's still experimental; avoid for user-generated content. Stick to build-time, bundled assets.

---

## Accessibility Checklist

The majority of a11y defects in AI-generated illustration pipelines fall into five buckets. Treat this as a required pre-merge checklist.

### 1. Alt text semantics

- **Informative illustrations** (convey content, e.g. an empty-state showing "no orders yet"): use meaningful `alt` text.
  ```html
  <img src="empty-orders.avif" alt="An empty shopping cart, no orders yet" />
  ```
- **Decorative illustrations** (pure flourish): mark as presentational so screen readers skip them.
  ```html
  <img src="sparkle.svg" alt="" role="presentation" />
  ```
- **Inline SVG informative**: SVG needs explicit wiring. WCAG-compliant pattern:
  ```html
  <svg role="img" aria-labelledby="t1 d1" focusable="false">
    <title id="t1">Empty inbox</title>
    <desc id="d1">A mailbox with a spider web, indicating no new messages.</desc>
    …
  </svg>
  ```
- **Inline SVG decorative**: `aria-hidden="true"` *and* `focusable="false"` (IE/Edge legacy, still worth keeping).

See the W3C WAI tutorial on [decorative images](https://www.w3.org/WAI/tutorials/images/decorative/).

### 2. `prefers-reduced-motion` behavior

Every animated asset MUST:

- Not autoplay when `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true`.
- Respond to the media query's `change` event (users toggle the OS setting mid-session, particularly on iOS).
- Provide a static poster fallback with the same dimensions (to avoid CLS).

Minimal React hook:

```tsx
export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduce;
}
```

For Rive specifically, use the `useRive` hook's `autoplay: false` and then `rive.play()` only if motion is allowed. Rive's `rive-react` ([v4.21.x](https://github.com/rive-app/rive-react)) does not auto-respect the OS setting.

CSS-only fallback for hover/scroll animations:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-hero { animation: none; }
}
```

### 3. Contrast and color independence

- AI-generated illustrations often fail WCAG 1.4.11 (Non-text Contrast) when placed on white backgrounds with pastel palettes. Check all meaningful strokes/fills against their adjacent background at ≥3:1.
- Never rely on color alone to convey meaning in icon sets (e.g. green-check / red-cross without a shape cue).

### 4. Focus and keyboard interaction (Rive only)

If a Rive illustration accepts inputs (hover, click to advance state machine), it becomes an interactive element:

- Wrap in a `<button>` with an accessible name, or add `role="button" tabindex="0"` and handle `keydown` for `Enter` and `Space`.
- Announce state changes via `aria-live="polite"` regions if the animation conveys state.

### 5. Reduced data / `prefers-reduced-data`

Newer media query (widely supported via Chromium, Safari 17+). Use it to skip auto-play animations on metered connections:

```css
@media (prefers-reduced-data: reduce) {
  .hero-lottie { display: none; }
  .hero-poster { display: block; }
}
```

---

## CDN Patterns for AI-Generated Assets

When the asset is known at build time, skip the CDN and bundle. When it's user-generated or produced by an AI model on demand, a transformation CDN is the right tool. The three major options converge on a similar feature set; pick based on pricing, ergonomics, and existing stack.

### Cloudinary

- **URL grammar**: `https://res.cloudinary.com/<cloud>/image/upload/<transformations>/<public_id>.<ext>`.
- **Killer transform**: `f_auto,q_auto` — picks AVIF/WebP/JPEG by `Accept` header and picks quality by content analysis. For AI-generated illustrations with flat palettes, `q_auto:good` is usually sufficient; use `q_auto:best` for photorealistic hero art.
- **Responsive**: `w_auto,dpr_auto,c_scale` with the client hints header or `w_<n>` explicit breakpoints.
- **Motion**: Cloudinary hosts Lottie as a raw asset but does not transcode `.lottie`. Use `l_lottie:my_anim` overlays on video, or deliver `.lottie` via a separate static path.
- **Docs**: [cloudinary.com/documentation/image_optimization](https://cloudinary.com/documentation/image_optimization).

### imgix

- **URL grammar**: `https://<source>.imgix.net/<path>?auto=format,compress&w=800&dpr=2`.
- **Defaults**: `auto=format,compress` is the baseline AVIF/WebP negotiation + mozjpeg-style compression.
- **Rendering API**: `mark=`, `txt=`, `blend=` for watermarks and overlays; less opinionated than Cloudinary.
- **Strong point**: Byte-exact reproducibility and a predictable URL grammar — useful when the prompt-to-asset wants to pre-sign derivative URLs.
- **Docs**: [docs.imgix.com/apis/rendering](https://docs.imgix.com/apis/rendering).

### ImageKit

- **URL grammar**: `https://ik.imagekit.io/<id>/<path>?tr=w-800,f-auto,q-80`.
- **AI features**: Built-in `ik-magic-crop` and `ik-bg-remove` endpoints — useful when the upstream generator left a checkered or solid background that needs stripping. Pairs well with `13-transparent-backgrounds` angle.
- **Free tier**: More generous than Cloudinary/imgix at the time of writing (20 GB bandwidth).
- **Docs**: [imagekit.io/docs/image-transformation](https://imagekit.io/docs/image-transformation).

### Edge alternatives

- **Vercel Image Optimization** ([`/_next/image`](https://vercel.com/docs/image-optimization)): sharp-based, built into Next.js deployments, billed by transformed source image. Acceptable for small-scale, becomes expensive at >10K uniques/mo.
- **Cloudflare Images** / **Cloudflare Polish**: Cloudflare's offering; Images product includes upload+variant storage, Polish does on-the-fly format negotiation for Cloudflare-proxied origins.
- **Self-host with `imgproxy`**: Open-source (Go, libvips), deployable next to origin. Best for privacy-sensitive or high-volume cases where per-image CDN pricing doesn't scale.

### Pattern for the prompt-to-asset's output contract

Whatever the generator, emit a JSON manifest alongside the asset:

```json
{
  "id": "empty-state-inbox-v2",
  "intent": "empty-state-illustration",
  "formats": {
    "avif": "/cdn/empty-inbox.avif",
    "webp": "/cdn/empty-inbox.webp",
    "png": "/cdn/empty-inbox.png",
    "lottie": "/cdn/empty-inbox.lottie"
  },
  "poster": "/cdn/empty-inbox-poster.avif",
  "width": 800,
  "height": 600,
  "alt": "An empty mailbox with a friendly spider web",
  "decorative": false,
  "reducedMotionBehavior": "swap-poster"
}
```

Downstream framework wrappers (React/Vue/Svelte) consume this manifest and render the correct markup, with alt text, poster fallback, and motion policy baked in. That is the "production" part of "illustration-to-production pipeline."

---

## Pragmatic Defaults for the Prompt-Enhancer

When the user says "make me an illustration for an empty state," the skill should emit:

1. **A prompt** tuned for vector-friendly output (angle 10a/10b content).
2. **A delivery plan** from this angle: target format = SVG + AVIF fallback; component wrapper = framework-appropriate (`<Image />` / `<enhanced:img>` / `<NuxtImg>` / SVGR); alt text = derived from the request noun phrase; motion = none unless explicitly requested; `reducedMotionBehavior = "none"` default.
3. **A post-processing step list**: SVGO pass if SVG; sharp AVIF+WebP variants at `[420, 828, 1920]` widths if raster; optional Lottie export path if animation requested.

The minimum that separates a prompt-to-asset from a *pipeline*-aware prompt-to-asset is this delivery plan. Categories 16 (background removal / vectorization), 17 (upscaling), and 18 (asset-pipeline tools) feed into this angle; categories 11 (favicon/web assets) and 13 (transparency) consume its output patterns.

---

## References

### Animation runtimes

- Airbnb Lottie landing — [`airbnb.io/lottie/`](https://airbnb.io/lottie/)
- `lottie-web` GitHub — [`github.com/airbnb/lottie-web`](https://github.com/airbnb/lottie-web) (~31K stars)
- dotLottie v2.0 spec — [`dotlottie.io/spec/2.0/`](https://dotlottie.io/spec/2.0/)
- `@lottiefiles/dotlottie-web` — [`github.com/LottieFiles/dotlottie-web`](https://github.com/LottieFiles/dotlottie-web)
- LottieFiles developer portal — [`developers.lottiefiles.com`](https://developers.lottiefiles.com/)
- Rive runtimes overview — [`rive.app/docs/runtimes`](https://rive.app/docs/runtimes)
- `rive-react` — [`github.com/rive-app/rive-react`](https://github.com/rive-app/rive-react) (v4.21.x as of mid-2025)

### Format & encoder references

- WebP — [`developers.google.com/speed/webp`](https://developers.google.com/speed/webp)
- libavif — [`github.com/AOMediaCodec/libavif`](https://github.com/AOMediaCodec/libavif)
- `avifenc` / `avifdec` CLI — bundled with libavif
- `cwebp` / `dwebp` — bundled with libwebp
- sharp — [`sharp.pixelplumbing.com`](https://sharp.pixelplumbing.com/), [`github.com/lovell/sharp`](https://github.com/lovell/sharp)
- Squoosh CLI (Google) — [`github.com/GoogleChromeLabs/squoosh`](https://github.com/GoogleChromeLabs/squoosh)

### Framework integration

- Next.js Image component — [`nextjs.org/docs/app/api-reference/components/image`](https://nextjs.org/docs/app/api-reference/components/image)
- Astro image guide — [`docs.astro.build/en/guides/images/`](https://docs.astro.build/en/guides/images/)
- `@sveltejs/enhanced-img` — [`github.com/sveltejs/kit/tree/main/packages/enhanced-img`](https://github.com/sveltejs/kit/tree/main/packages/enhanced-img)
- `@nuxt/image` — [`image.nuxt.com`](https://image.nuxt.com/)
- SVGR — [`react-svgr.com`](https://react-svgr.com/), [`@svgr/webpack`](https://www.npmjs.com/package/@svgr/webpack)
- SVGO — [`github.com/svg/svgo`](https://github.com/svg/svgo)

### Accessibility

- W3C WAI decorative images — [`w3.org/WAI/tutorials/images/decorative/`](https://www.w3.org/WAI/tutorials/images/decorative/)
- MDN `prefers-reduced-motion` — [`developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- MDN `prefers-reduced-data` — [`developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-data`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-data)
- WebAIM alt text guidance — [`webaim.org/techniques/alttext/`](https://webaim.org/techniques/alttext/)

### CDN / delivery

- Cloudinary image docs — [`cloudinary.com/documentation`](https://cloudinary.com/documentation)
- imgix rendering API — [`docs.imgix.com`](https://docs.imgix.com/)
- ImageKit docs — [`imagekit.io/docs`](https://imagekit.io/docs/)
- Vercel Image Optimization — [`vercel.com/docs/image-optimization`](https://vercel.com/docs/image-optimization)
- imgproxy (self-host) — [`imgproxy.net`](https://imgproxy.net/)
