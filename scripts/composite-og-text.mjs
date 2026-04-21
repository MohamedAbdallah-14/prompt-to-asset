import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";

const base = "assets/og-nano-banana-pro.png";
const out = "assets/og-nano-banana-pro-titled.png";

// Text-only SVG overlay, 1200x630, transparent background.
// Composition: headline + tagline in the upper-left negative space.
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect x="80" y="70" width="56" height="4" rx="2" fill="#3B82F6"/>
  <text x="80" y="136" fill="#E6EDF3" font-family="Inter" font-weight="700" font-size="64" letter-spacing="-2">prompt-to-asset</text>
  <text x="80" y="178" fill="#B3C1D1" font-family="Inter" font-weight="500" font-size="22" letter-spacing="0.3">Route <tspan fill="#3B82F6">·</tspan> Generate <tspan fill="#3B82F6">·</tspan> Matte <tspan fill="#3B82F6">·</tspan> Vectorize <tspan fill="#F59E0B">·</tspan> Validate</text>
  <text x="80" y="206" fill="#64748B" font-family="Inter" font-weight="400" font-size="18" letter-spacing="0.2">Open-source MCP server + 12 skills for production-grade software assets.</text>
</svg>`;

const resvg = new Resvg(overlay, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontDirs: ["assets/fonts"],
    loadSystemFonts: false,
    defaultFontFamily: "Inter"
  }
});
const overlayPng = resvg.render().asPng();

await sharp(base)
  .composite([{ input: overlayPng, top: 0, left: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(out);

const meta = await sharp(out).metadata();
console.log("wrote", out, meta.width, "x", meta.height);

// Also a JPEG for unfurlers
await sharp(out)
  .jpeg({ quality: 88, progressive: true, mozjpeg: true })
  .toFile(out.replace(".png", ".jpg"));
console.log("wrote", out.replace(".png", ".jpg"));
