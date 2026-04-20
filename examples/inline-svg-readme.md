# Inline-SVG recipe (zero key, zero network)

Your AI assistant writes the `<svg>` directly in the chat, then calls `asset_save_inline_svg` to write the file. No provider, no rate limit, no API key. Deterministic output.

## Copy-paste prompt

> Generate a flat vector logo mark for a developer-tools company called **Forge**. Two-tone, warm orange on neutral. No text — just the mark. Use `asset_enhance_prompt` first, then if `inline_svg` is in `modes_available`, emit the `<svg>` inline AND call `asset_save_inline_svg({ svg, asset_type: "logo" })` so the file lands on disk.

## What the assistant should do

1. Call `asset_capabilities()` → confirm `inline_svg` is available for `logo`.
2. Call `asset_enhance_prompt({ brief: "flat vector logo mark for Forge devtools, warm orange on neutral" })` → read `svg_brief` (viewBox, palette hex list, path budget ≤40).
3. Emit an `<svg viewBox="0 0 1024 1024">…</svg>` block in the chat, obeying every field of `svg_brief` (fixed viewBox, no `<image>` tag, palette hex strings only, path count within budget).
4. Immediately call `asset_save_inline_svg({ svg: "<full svg text>", asset_type: "logo", output_dir: "./out/forge" })`.
5. Report the returned `variants[].path` list so the user can open the files.

## What you get back

When `asset_type` is `"logo"`:

- `./out/forge/master.svg`

When `asset_type` is `"favicon"`:

- `./out/forge/icon.svg` + `./out/forge/icon-dark.svg`
- `./out/forge/favicon-{16,32,48}.png`
- `./out/forge/favicon.ico` (multi-res)
- `./out/forge/apple-touch-icon.png` (180px, opaque)
- `./out/forge/pwa-192.png` + `./out/forge/pwa-512.png` + `./out/forge/pwa-512-maskable.png`
- `./out/forge/manifest.webmanifest`
- `./out/forge/head-snippet.html`

When `asset_type` is `"app_icon"`:

- The full iOS `AppIcon.appiconset/`, Android adaptive layers (foreground/background/monochrome), PWA manifest icons, visionOS parallax scaffold.

## Why this is different from asking an LLM for "an SVG logo"

The `svg_brief` constrains what the LLM writes: a fixed viewBox, a palette you control, a path-count budget, and a list of forbidden elements (`<image>`, `<filter>` with external resources, `<script>`, etc.). When the LLM calls `asset_save_inline_svg`, the server validates the SVG against that brief before writing anything. Malformed SVGs get rejected with a specific error the assistant can fix.

The end state: a real `master.svg` you can open, drop into your Next.js `public/`, or feed into `p2a export` for the full platform bundle — without a single external network call.
