# 16 · Favicon Generation Tools — External Research

Research value: **high** — the modern "minimal" spec is well-documented by an authoritative community source (Evil Martians), and the Node/OSS tooling landscape is stable with a clear best-of-breed choice.

Scope: what the `asset_generate_favicon` tool in `prompt-to-asset` should emit and which OSS library to build it on. Targets:

- `favicon.ico` (multi-resolution, 16/32/48 embedded)
- `icon.svg` (SVG passthrough, dark-mode aware)
- `apple-touch-icon.png` (180×180)
- `icon-192.png`, `icon-512.png`, `icon-mask.png` (512×512 maskable) + `manifest.webmanifest`

---

## 1. The Modern Favicon Spec (2026)

Authoritative reference: Evil Martians "How to Favicon in 2026" — continuously updated since 2021, last verified 2026-01-21. It collapses the ~20-file favicon-generator sprawl into **3 HTML-referenced files + 3 manifest-referenced PNGs + 1 JSON**.

### Minimal file set

| File | Size(s) | Purpose |
| --- | --- | --- |
| `favicon.ico` | 32×32 (optionally +16×16, +48×48 embedded) | Legacy browsers, RSS readers, `/favicon.ico` fallback. Multi-resolution ICO container. |
| `icon.svg` | vector | Modern browsers (~72% support per caniuse); supports dark mode via embedded `<style>` + `prefers-color-scheme`. |
| `apple-touch-icon.png` | 180×180 | iOS home-screen shortcut. Tip: 20px inner padding + solid bg. |
| `icon-192.png` | 192×192 | PWA Android home screen. |
| `icon-512.png` | 512×512 | PWA splash / high-density. |
| `icon-mask.png` | 512×512 | PWA `purpose: "maskable"`. Safe zone is a central 409×409 circle. |
| `manifest.webmanifest` | JSON | Links the three PWA PNGs. |

### `<link>` tag order (exact, copy into `<head>`)

The ordering matters to work around a historical Chrome bug that preferred ICO over SVG when both lacked `sizes`. Evil Martians explicitly recommends `sizes="32x32"` on the ICO tag (not `sizes="any"`) as of 2023-07-11.

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

### `manifest.webmanifest` shape

```json
{
  "name": "My website",
  "icons": [
    { "src": "/icon-192.png",  "type": "image/png", "sizes": "192x192" },
    { "src": "/icon-mask.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" },
    { "src": "/icon-512.png",  "type": "image/png", "sizes": "512x512" }
  ]
}
```

### Things explicitly dropped by the modern spec

- Windows Tile icons / `browserconfig.xml` (Edge no longer requires).
- Safari `mask-icon` pinned-tab SVG (obsolete since Safari 12; Apple's own site doesn't ship one).
- `rel="shortcut icon"` — never a valid link relation; `rel="icon"` is correct.
- Opera Coast's 228×228 icon (browser dead since 2017).
- Dozens of PNG intermediates (57×57, 72×72, 114×114, etc.) — trust browser downscaling from the 512.

---

## 2. OSS / Third-Party Tool Survey

### A. `favicons` (itgalaxy/favicons) — **recommended primary**

- **Repo**: <https://github.com/itgalaxy/favicons>  (now under `haydenbleasel/favicons` fork maintenance)
- **License**: MIT
- **Package**: `favicons` on npm, latest 7.2.0 (Mar 2024). Requires Node ≥14.
- **Input**: PNG, JPEG, or SVG (string path, Buffer, or array).
- **Output**: Returns `{ images: [{name, contents}], files: [...], html: [...] }`. You choose which assets to write. Arrays of HTML `<link>` / `<meta>` strings are pre-generated.
- **Multi-res ICO**: Yes. v7 dropped the external `to-ico` dep and now ships a pure-JS ICO encoder.
- **SVG passthrough**: Accepts SVG input but rasterizes internally via Sharp; it does **not** pass the source SVG through as `icon.svg`. You must copy it yourself.
- **Configurability**: Per-platform toggles: `icons.favicons`, `icons.android`, `icons.appleIcon`, `icons.appleStartup`, `icons.windows`, `icons.yandex`. For the modern minimal spec, disable `windows`, `yandex`, and `appleStartup`; keep `favicons`, `android`, `appleIcon`.
- **Caveat**: Generates more PNG sizes than the minimal spec by default — filter the output.

### B. `cli-real-favicon`

- **Repo**: <https://github.com/RealFaviconGenerator/cli-real-favicon>
- **License**: MIT
- **Version**: 0.0.9 (May 2024), ~2.9K weekly downloads.
- **How it works**: CLI wrapper around the hosted RealFaviconGenerator API (`rfg-api`). Uploads the source icon, receives a ZIP, unpacks it.
- **Dependency on external service**: Yes — **requires network access and an RFG API key**. Not suitable for offline/isolated builds.
- **Output**: Full RFG package including HTML snippet and manifest. High quality but often over-generates (brick/tile icons etc.).
- **Verdict**: Reference only; avoid for an in-repo tool that should be deterministic and offline.

### C. `@realfavicongenerator/generate-favicon` (RFG Core, pure JS)

- **NPM**: <https://www.npmjs.com/package/@realfavicongenerator/generate-favicon>
- **License**: ISC
- **Version**: 0.6.3; ~1.2K weekly downloads.
- **API**: `generateFaviconFiles`, `generateFaviconHtml`, plus SVG helpers (`stringToSvg`, `bitmapToSvg`, `dataUrlToSvg`).
- **Runs locally**: Unlike `cli-real-favicon`, this is the RFG team's newer **offline** core library. Single dep: `@svgdotjs/svg.js`.
- **Output**: Full favicon file set + HTML markup.
- **Verdict**: Credible alternative to `favicons`; newer, smaller dependency surface, but much smaller community and less battle-tested.

### D. `png-to-ico`

- **NPM**: <https://www.npmjs.com/package/png-to-ico>  v3.0.1 (Aug 2025), ~129K weekly downloads.
- **License**: MIT
- **Scope**: PNG → ICO only. Accepts a single PNG (auto-resized to default sizes) or an array of pre-rendered PNGs for full control.
- **Multi-res ICO**: Yes — exactly its job.
- **Deps**: `pngjs`, `minimist` (tiny).
- **Verdict**: Best pick if you already render PNGs with Sharp and only need the ICO packer. Minimal, current, actively maintained.

### E. `to-ico` (kevva/to-ico)

- **Repo**: <https://github.com/kevva/to-ico>
- **License**: MIT
- **Version**: 1.1.5 — **last released Aug 2017**. Effectively unmaintained.
- **Scope**: In-memory PNG → multi-res ICO; default sizes `[16, 24, 32, 48, 64, 128, 256]`; 8-bit/channel only.
- **Verdict**: Works, but stale. `itgalaxy/favicons` deliberately removed it in v7. Prefer `png-to-ico`.

### F. `sharp-ico`

- **NPM**: <https://www.npmjs.com/package/sharp-ico>  v0.1.5, ~128K weekly downloads.
- **License**: MIT
- **Scope**: ICO encoder **and** decoder built on `sharp`. Can take a sharp instance directly and emit multi-res ICO; default sizes `[256, 128, 64, 48, 32, 24, 16]`.
- **Verdict**: Best pick if the project already depends on Sharp for other image work — avoids a second pipeline.

### G. `real-ico`, `@fiverr/ico`

- Neither exists on npm under those exact names (verified via search). Likely the prompt meant:
  - `@fiahfy/ico` — MIT; ICO parser/builder, low-level; not a favicon pipeline.
  - RFG ecosystem packages (`realfavicon`, `app-ico`, `@realfavicongenerator/generate-favicon`) — see §B/C.

### H. `@pierre/favicons-next`

- **Not found on npm**. The closest Next.js-specific options are:
  - `next-favicon-loader` (tinialabs) — webpack loader for Next; wraps `favicons`.
  - `favicons-webpack-plugin` — same library, webpack plugin form.
- Next's own App Router convention (`app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`) covers most cases without any third-party package; generation is still external.

---

## 3. Comparison Matrix

| Tool | License | Offline | Multi-res ICO | SVG passthrough | HTML tags | Maskable | Maintenance | Fit for `asset_generate_favicon` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `favicons` (itgalaxy) | MIT | yes | yes (built-in) | no (re-rasterizes) | yes (array) | yes (since v6+) | active | **Primary recommendation** (filter outputs) |
| `@realfavicongenerator/generate-favicon` | ISC | yes | yes | partial (SVG helpers) | yes | yes | newer, active | Strong alt if lower dep surface wanted |
| `cli-real-favicon` | MIT | **no (API)** | yes | yes (RFG handles) | yes | yes | active | Reference only; rejected |
| `png-to-ico` | MIT | yes | yes | n/a (no SVG) | no | n/a | active | Use **alongside** Sharp for just the ICO step |
| `sharp-ico` | MIT | yes | yes | n/a | no | n/a | active | Use if Sharp is already in use |
| `to-ico` | MIT | yes | yes | n/a | no | n/a | stale (2017) | Avoid |
| `@fiahfy/ico` | MIT | yes | low-level only | n/a | no | n/a | active | Too low-level |
| RealFaviconGenerator (web) | proprietary / paid | no | yes | yes | yes | yes | active | Reference only (gold-standard output to match) |

### Recommended build options

1. **Integrated path**: `favicons` (itgalaxy) with a curated output filter — get ICO + PWA PNGs + HTML array in one call, then write only the 6 files the modern spec needs, plus copy the source `icon.svg` through verbatim.
2. **Hand-assembled path**: Sharp + `png-to-ico` (or `sharp-ico`) — render the PNGs at the four sizes (180, 192, 512, 512-mask with 409 safe zone), pack the ICO from the 16/32/48 PNGs, copy the source SVG. Fewer transitive deps, full control over output, but you own the HTML tag emission.

For `prompt-to-asset` the hand-assembled path is usually better: it matches the minimal spec exactly, has no surplus output to filter, and keeps the dep graph tight.

---

## 4. Sources

- [Evil Martians — How to Favicon in 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) — canonical minimal-spec reference, updated annually through 2026.
- [itgalaxy/favicons on GitHub](https://github.com/itgalaxy/favicons) — MIT, v7 release notes (dropped `to-ico`, added maskable).
- [cli-real-favicon on GitHub](https://github.com/RealFaviconGenerator/cli-real-favicon) and [npm page](https://www.npmjs.com/package/cli-real-favicon) — license, deps, maintainer.
- [@realfavicongenerator/generate-favicon on npm](https://www.npmjs.com/package/@realfavicongenerator/generate-favicon) — ISC, API surface.
- [png-to-ico on npm](https://www.npmjs.com/package/png-to-ico) — v3.0.1, dep list.
- [sharp-ico on npm](https://www.npmjs.com/package/sharp-ico) — default sizes, sharp integration.
- [to-ico on GitHub](https://github.com/kevva/to-ico) — confirming 2017 stagnation.
- [Mathias Bynens — rel=shortcut icon harmful](https://mathiasbynens.be/notes/rel-shortcut-icon) — basis for dropping `rel="shortcut"`.
- [W3C Manifest — Icon masks spec](https://w3c.github.io/manifest/#icon-masks) — 409×409 safe zone.
- [caniuse — SVG favicons](https://caniuse.com/link-icon-svg) — ~72% support figure.
