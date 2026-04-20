import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadSharp } from "./sharp.js";

const requireFromHere = createRequire(import.meta.url);

/**
 * OG image renderer — deterministic, no diffusion by default.
 *
 * Primary path (research 18-asset-pipeline-tools): Satori (JSX → SVG) +
 * @resvg/resvg-js (SVG → PNG). Satori requires a TTF/OTF font buffer.
 * Source: docs/research/18-asset-pipeline-tools/.
 *
 * Font resolution order:
 *   1. input.fontData (caller-provided buffer)
 *   2. input.fontPath (caller-provided path)
 *   3. env PROMPT_TO_BUNDLE_OG_FONT (filesystem path)
 *   4. @fontsource/inter (optional dep) — bundled Inter 400 and 700 weights.
 *
 * If none available or optional deps (`satori`, `@resvg/resvg-js`) missing,
 * falls back to a hand-authored SVG + sharp rasterization path. Still
 * produces a valid 1200×630 PNG.
 */
export interface OgRenderInput {
  title: string;
  subtitle?: string;
  template: "centered_hero" | "left_title" | "minimal" | "quote" | "product_card";
  palette?: string[];
  logoSvg?: string;
  backgroundImage?: Buffer;
  fontData?: Buffer;
  fontPath?: string;
  /**
   * Brand-provided font family name. Passed to Satori as the fontFamily
   * `name`. The matching font data must also be resolvable via fontData /
   * fontPath / PROMPT_TO_BUNDLE_OG_FONT; otherwise Satori falls back to the
   * bundled Inter. Satori does not fetch webfonts by name.
   */
  fontFamily?: string;
}

export interface OgRenderResult {
  png: Buffer;
  svg: string;
  renderer: "satori+resvg" | "sharp-fallback" | "svg-only";
  warnings: string[];
}

export async function renderOg(input: OgRenderInput): Promise<OgRenderResult> {
  const warnings: string[] = [];

  // Try Satori + @resvg path first.
  const fontData = resolveFontData(input);
  if (fontData) {
    try {
      const result = await renderWithSatori(input, fontData);
      if (input.backgroundImage) {
        const sharp = await loadSharp();
        if (sharp) {
          const composed = await sharp(input.backgroundImage)
            .resize(1200, 630, { fit: "cover" })
            .composite([{ input: result.png, top: 0, left: 0 }])
            .png()
            .toBuffer();
          return { png: composed, svg: result.svg, renderer: "satori+resvg", warnings };
        }
      }
      return { png: result.png, svg: result.svg, renderer: "satori+resvg", warnings };
    } catch (err) {
      warnings.push(
        `Satori/resvg render failed (${(err as Error).message}); falling back to sharp path.`
      );
    }
  } else {
    warnings.push(
      "No TTF/OTF font resolved for Satori. Set PROMPT_TO_BUNDLE_OG_FONT or pass fontData to get pixel-perfect typography. Using SVG system-font fallback."
    );
  }

  // Fallback: hand-rolled SVG + sharp.
  const svg = buildOgSvg(input);
  const sharp = await loadSharp();
  if (!sharp) {
    warnings.push("sharp not installed; returning SVG only (no rasterization).");
    return { png: Buffer.alloc(0), svg, renderer: "svg-only", warnings };
  }

  let pipeline: import("sharp").Sharp;
  if (input.backgroundImage) {
    pipeline = sharp(input.backgroundImage).resize(1200, 630, { fit: "cover" });
    pipeline = pipeline.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  } else {
    pipeline = sharp(Buffer.from(svg));
  }
  const png = await pipeline.png().toBuffer();
  return { png, svg, renderer: "sharp-fallback", warnings };
}

function resolveFontData(input: OgRenderInput): Buffer | null {
  if (input.fontData) return input.fontData;
  const path = input.fontPath ?? process.env["PROMPT_TO_BUNDLE_OG_FONT"];
  if (path) {
    try {
      return readFileSync(path);
    } catch {
      /* fall through to fontsource */
    }
  }
  return loadFontsourceInter();
}

function loadFontsourceInter(): Buffer | null {
  // @fontsource/inter ships TTF weights in `files/inter-latin-400-normal.woff`
  // et al., but the TTF copy used to live at `files/inter-latin-<wt>-normal.woff`
  // up through v5. Newer versions also ship the full TTF under `/files/*.ttf`.
  // We check a handful of known paths.
  const candidates = [
    "@fontsource/inter/files/inter-latin-700-normal.ttf",
    "@fontsource/inter/files/inter-latin-400-normal.ttf"
  ];
  for (const spec of candidates) {
    try {
      const p = requireFromHere.resolve(spec);
      if (existsSync(p)) return readFileSync(p);
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function renderWithSatori(
  input: OgRenderInput,
  fontData: Buffer
): Promise<{ png: Buffer; svg: string }> {
  const satoriMod = (await import("satori")) as unknown as {
    default: (node: SatoriNode, opts: SatoriOptions) => Promise<string>;
  };
  const resvgMod = (await import("@resvg/resvg-js")) as unknown as {
    Resvg: new (
      svg: string | Buffer,
      opts?: ResvgOptions
    ) => { render: () => { asPng: () => Buffer } };
  };

  const fontName = input.fontFamily ?? "Inter";
  const node = buildSatoriNode(input, fontName);
  const svg = await satoriMod.default(node, {
    width: 1200,
    height: 630,
    fonts: [
      { name: fontName, data: fontData, weight: 700, style: "normal" },
      { name: fontName, data: fontData, weight: 400, style: "normal" }
    ]
  });
  const resvg = new resvgMod.Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();
  return { png: Buffer.from(png), svg };
}

// Minimal Satori JSX-compatible node shape (avoids react dep).
interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: SatoriNode | SatoriNode[] | string | null;
    // Allow arbitrary extra props (src, width, height, etc.) for tags that need them.
    [k: string]: unknown;
  };
}

interface SatoriOptions {
  width: number;
  height: number;
  fonts: Array<{ name: string; data: Buffer; weight: number; style: "normal" | "italic" }>;
}

interface ResvgOptions {
  fitTo?: { mode: "width" | "height" | "zoom"; value: number };
}

function el(
  type: string,
  style: Record<string, unknown>,
  children: SatoriNode | SatoriNode[] | string | null = null
): SatoriNode {
  return { type, props: { style, children } };
}

function buildLogoImage(svgSource: string): SatoriNode {
  // Satori renders <img src="data:image/svg+xml;base64,..."> by decoding the
  // data URL and calling satori-html/resvg to rasterize. Pass the SVG as a
  // base64 data URL; fix the height and let width auto-scale.
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgSource, "utf8").toString("base64")}`;
  return {
    type: "img",
    props: {
      src: dataUrl,
      width: 128,
      height: 128,
      style: { width: 128, height: 128, objectFit: "contain" }
    }
  };
}

function buildSatoriNode(input: OgRenderInput, fontFamily: string): SatoriNode {
  const bg = input.palette?.[0] ?? "#0f172a";
  const fg = input.palette?.[1] ?? "#ffffff";
  const accent = input.palette?.[2] ?? "#38bdf8";

  const title = input.title;
  const subtitle = input.subtitle ?? null;
  // Satori accepts a base64 data URL for raster images. Inline SVG isn't
  // supported by Satori's JSX tree, so we leave logoSvg rendered into the
  // top-left corner as data: URL only when the caller encodes it externally.
  // For now we compose by wrapping the node inside a flex container and
  // letting the skill call provide a `<img src="data:image/svg+xml;...">`
  // block via buildLogoImage below when available.
  const logoImage = input.logoSvg ? buildLogoImage(input.logoSvg) : null;

  switch (input.template) {
    case "centered_hero": {
      const children: SatoriNode[] = [];
      if (logoImage) children.push(logoImage);
      children.push(
        el(
          "div",
          {
            fontSize: 72,
            fontWeight: 800,
            color: fg,
            textAlign: "center",
            lineHeight: 1.1,
            marginTop: logoImage ? 32 : 0
          },
          title
        )
      );
      if (subtitle) {
        children.push(
          el(
            "div",
            {
              fontSize: 28,
              fontWeight: 400,
              color: fg,
              opacity: 0.75,
              textAlign: "center",
              marginTop: 24
            },
            subtitle
          )
        );
      }
      return el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          borderTop: `6px solid ${accent}`,
          justifyContent: "center",
          alignItems: "center",
          padding: "80px",
          fontFamily
        },
        children
      );
    }

    case "left_title":
      return el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          justifyContent: "center",
          padding: "80px",
          fontFamily
        },
        [
          el("div", { width: 80, height: 8, backgroundColor: accent, marginBottom: 32 }, null),
          el("div", { fontSize: 72, fontWeight: 800, color: fg, lineHeight: 1.1 }, title),
          subtitle
            ? el("div", { fontSize: 28, color: fg, opacity: 0.75, marginTop: 20 }, subtitle)
            : el("div", {}, null)
        ]
      );

    case "minimal":
      return el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: fg,
          fontFamily
        },
        [
          el("div", { width: "100%", height: 210, backgroundColor: accent }, null),
          el(
            "div",
            {
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px",
              fontSize: 64,
              fontWeight: 800,
              color: bg,
              textAlign: "center"
            },
            title
          )
        ]
      );

    case "quote":
      return el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          justifyContent: "center",
          padding: "80px",
          fontFamily
        },
        [
          el(
            "div",
            { fontSize: 56, fontWeight: 400, fontStyle: "italic", color: fg },
            `“${title}”`
          ),
          subtitle
            ? el("div", { fontSize: 28, color: fg, opacity: 0.75, marginTop: 40 }, `— ${subtitle}`)
            : el("div", {}, null)
        ]
      );

    case "product_card":
      return el(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: bg,
          borderBottom: `16px solid ${accent}`,
          justifyContent: "center",
          alignItems: "center",
          padding: "80px",
          fontFamily
        },
        [
          el(
            "div",
            {
              fontSize: 96,
              fontWeight: 900,
              color: fg,
              textAlign: "center",
              lineHeight: 1.05
            },
            title
          ),
          subtitle
            ? el(
                "div",
                {
                  fontSize: 32,
                  color: fg,
                  opacity: 0.6,
                  marginTop: 32,
                  textAlign: "center"
                },
                subtitle
              )
            : el("div", {}, null)
        ]
      );
  }
}

function buildOgSvg(input: OgRenderInput): string {
  const W = 1200,
    H = 630;
  const bg = input.palette?.[0] ?? "#0f172a";
  const fg = input.palette?.[1] ?? "#ffffff";
  const accent = input.palette?.[2] ?? "#38bdf8";

  const title = escape(input.title);
  const subtitle = input.subtitle ? escape(input.subtitle) : null;

  switch (input.template) {
    case "centered_hero":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${accent}"/>
  <text x="${W / 2}" y="${H / 2 - (subtitle ? 20 : 0)}" fill="${fg}" font-size="72" font-weight="800" text-anchor="middle" dominant-baseline="middle">${title}</text>
  ${subtitle ? `<text x="${W / 2}" y="${H / 2 + 50}" fill="${fg}" opacity="0.75" font-size="28" text-anchor="middle" dominant-baseline="middle">${subtitle}</text>` : ""}
</svg>`;

    case "left_title":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="80" y="140" width="80" height="8" fill="${accent}"/>
  <text x="80" y="210" fill="${fg}" font-size="72" font-weight="800">${title}</text>
  ${subtitle ? `<text x="80" y="280" fill="${fg}" opacity="0.75" font-size="28">${subtitle}</text>` : ""}
</svg>`;

    case "minimal":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${W}" height="${H}" fill="${fg}"/>
  <rect x="0" y="0" width="${W}" height="${H / 3}" fill="${accent}"/>
  <text x="${W / 2}" y="${H / 2 + 40}" fill="${bg}" font-size="64" font-weight="800" text-anchor="middle">${title}</text>
</svg>`;

    case "quote":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, 'Times New Roman', serif">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <text x="80" y="220" fill="${fg}" font-size="56" font-weight="500" font-style="italic">&#8220;${title}&#8221;</text>
  ${subtitle ? `<text x="80" y="320" fill="${fg}" opacity="0.75" font-size="28">&#8212; ${subtitle}</text>` : ""}
</svg>`;

    case "product_card":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="${H - 16}" width="${W}" height="16" fill="${accent}"/>
  <text x="${W / 2}" y="${H / 2 - 40}" fill="${fg}" font-size="96" font-weight="900" text-anchor="middle">${title}</text>
  ${subtitle ? `<text x="${W / 2}" y="${H / 2 + 40}" fill="${fg}" opacity="0.6" font-size="32" text-anchor="middle">${subtitle}</text>` : ""}
</svg>`;
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
