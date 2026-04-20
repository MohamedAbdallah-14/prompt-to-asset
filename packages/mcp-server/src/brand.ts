import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { BrandBundle } from "./types.js";

/**
 * Parse brand sources into a canonical BrandBundle.
 * Supported:
 *   - `brand.json` (native format)
 *   - DTCG tokens (`$value` / `$type` structure)
 *   - AdCP spec (color, typography, references)
 *   - `brand.md` (markdown tables with known headers)
 *   - raw text (extract hex colors + "do not" lines)
 */
export function parseBrandSource(source: string): BrandBundle {
  let raw: string;
  let isPath = false;
  try {
    raw = readFileSync(resolve(source), "utf-8");
    isPath = true;
  } catch {
    raw = source;
  }

  // JSON first
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (isDtcg(parsed)) return fromDtcg(parsed);
      if (isAdcp(parsed)) return fromAdcp(parsed);
      return coerceBundle(parsed);
    } catch {
      // fall through
    }
  }

  // Markdown brand.md
  if (isPath && /\.md$/i.test(source)) {
    return fromMarkdown(raw);
  }

  // Raw text fallback
  return fromRawText(raw);
}

function isDtcg(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const json = JSON.stringify(obj);
  return /"\$value"\s*:/.test(json) && /"\$type"\s*:\s*"color"/.test(json);
}

function isAdcp(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return "brand" in o && typeof o["brand"] === "object";
}

function fromDtcg(obj: unknown): BrandBundle {
  const palette: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n["$type"] === "color" && typeof n["$value"] === "string") {
      palette.push(String(n["$value"]));
    }
    for (const k of Object.keys(n)) {
      if (!k.startsWith("$")) visit(n[k]);
    }
  };
  visit(obj);
  return { palette: dedupe(palette) };
}

interface AdcpShape {
  brand?: {
    colors?: Array<string | { hex?: string; value?: string }>;
    typography?: { primary?: string; secondary?: string };
    do_not?: string[];
    restrictions?: string[];
    logo?: string;
    mark?: string;
  };
}

function fromAdcp(obj: unknown): BrandBundle {
  const o = obj as AdcpShape;
  const brand = o.brand ?? {};
  const colors = brand.colors ?? [];
  const palette = dedupe(
    colors
      .map((c): string | undefined => {
        if (typeof c === "string") return c;
        return c.hex ?? c.value;
      })
      .filter((v): v is string => Boolean(v))
  );
  const typography = brand.typography
    ? {
        ...(brand.typography.primary !== undefined && { primary: brand.typography.primary }),
        ...(brand.typography.secondary !== undefined && { secondary: brand.typography.secondary })
      }
    : undefined;
  return {
    palette,
    ...(typography && { typography }),
    do_not: brand.do_not ?? brand.restrictions ?? [],
    ...(brand.logo !== undefined
      ? { logo_mark: brand.logo }
      : brand.mark !== undefined
        ? { logo_mark: brand.mark }
        : {})
  };
}

interface CoerceShape {
  palette?: string[];
  colors?: string[];
  style_refs?: string[];
  styleRefs?: string[];
  lora?: string;
  sref_code?: string;
  srefCode?: string;
  style_id?: string;
  styleId?: string;
  do_not?: string[];
  doNot?: string[];
  restrictions?: string[];
  logo_mark?: string;
  logoMark?: string;
  mark?: string;
  typography?: { primary?: string; secondary?: string };
}

function coerceBundle(obj: unknown): BrandBundle {
  const o = obj as CoerceShape;
  const styleRefs = o.style_refs ?? o.styleRefs;
  const srefCode = o.sref_code ?? o.srefCode;
  const styleId = o.style_id ?? o.styleId;
  const doNot = o.do_not ?? o.doNot ?? o.restrictions;
  const logoMark = o.logo_mark ?? o.logoMark ?? o.mark;
  return {
    palette: dedupe(o.palette ?? o.colors ?? []),
    ...(styleRefs !== undefined && { style_refs: styleRefs }),
    ...(o.lora !== undefined && { lora: o.lora }),
    ...(srefCode !== undefined && { sref_code: srefCode }),
    ...(styleId !== undefined && { style_id: styleId }),
    ...(doNot !== undefined && { do_not: doNot }),
    ...(logoMark !== undefined && { logo_mark: logoMark }),
    ...(o.typography !== undefined && { typography: o.typography })
  };
}

function fromMarkdown(md: string): BrandBundle {
  const palette = extractHexColors(md);
  const doNot: string[] = [];
  const sectionMatch = md.match(/## +(?:do ?not|don'?t|restrictions)\b[\s\S]*?(?=\n##|\n$)/i);
  if (sectionMatch) {
    const items = sectionMatch[0].match(/^\s*[-*]\s+(.+)$/gm) ?? [];
    for (const item of items) doNot.push(item.replace(/^\s*[-*]\s+/, "").trim());
  }
  const typoMatch = md.match(/typography[:\s]+\*?\*?(.+?)(?:\*\*|\n)/i);
  const primary = typoMatch?.[1]?.trim();
  const typography = primary ? { primary } : undefined;
  return { palette, do_not: doNot, ...(typography && { typography }) };
}

function fromRawText(txt: string): BrandBundle {
  return {
    palette: extractHexColors(txt),
    do_not: extractDoNotLines(txt)
  };
}

function extractHexColors(s: string): string[] {
  const matches = s.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
  return dedupe(matches.map((m) => m.toLowerCase()));
}

function extractDoNotLines(s: string): string[] {
  const lines = s.split(/\n/);
  return lines
    .map((l) => l.trim())
    .filter((l) => /^(do ?not|don'?t|avoid|no\s)/i.test(l))
    .map((l) => l.replace(/^(do not|don'?t|avoid)\s*:?\s*/i, "").trim())
    .filter(Boolean);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function hashBundle(bundle: BrandBundle | null | undefined): string | null {
  if (!bundle) return null;
  const canonical = JSON.stringify(sortKeys(bundle));
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function sortKeys(obj: unknown): Json {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    const src = obj as Record<string, unknown>;
    const out: Record<string, Json> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  if (obj === undefined) return null;
  return obj as Json;
}
