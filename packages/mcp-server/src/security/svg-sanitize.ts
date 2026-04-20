/**
 * Unconditional SVG safety check.
 *
 * Runs BEFORE the SVG is written to disk, independent of whether SVGO is
 * installed. SVGO is an optional dependency; if it's missing and we skipped
 * this step, a caller could smuggle <script>, on-handlers, javascript: URIs,
 * or external <image href="http://attacker.example/…"> into the file. Since
 * the output SVG is usually embedded in an app, browser, or README preview,
 * that's a real XSS / SSRF vector.
 *
 * Policy: reject the whole SVG when any of these patterns matches. We do NOT
 * try to strip-and-continue — that's a losing game against mutation-XSS.
 */

const BLOCKED_ELEMENT = /<\s*(script|foreignObject|iframe|embed|object)\b/i;
const EVENT_HANDLER = /\son[a-z][a-z0-9]*\s*=\s*["']/i;
const JS_URI = /(?:^|\s)(?:href|xlink:href|src|to|from|values|data)\s*=\s*["']\s*javascript:/i;
// External reference in <image>/<use>/<script src> etc. HTTP(S), protocol-relative,
// or file://. data: is allowed since it's self-contained (checked separately).
const EXTERNAL_REF =
  /<\s*(image|use|script|link)\b[^>]*(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|\/\/|file:|ftp:)/i;
const DATA_URI_SCRIPT = /data:[^"'\s]*(?:script|javascript)[^"'\s]*/i;
// CSS @import can fetch remote stylesheets; <style> is fine when inline.
const CSS_AT_IMPORT = /@import\s+(?:url\s*\()?\s*["']?\s*(?:https?:|\/\/|file:)/i;

export class SvgRejectedError extends Error {
  readonly code = "SVG_REJECTED";
  constructor(reason: string) {
    super(`svg rejected by safety check: ${reason}`);
    this.name = "SvgRejectedError";
  }
}

export interface SvgSafetyReport {
  ok: boolean;
  reason?: string;
}

export function checkSvgSafety(svg: string): SvgSafetyReport {
  if (BLOCKED_ELEMENT.test(svg)) {
    return {
      ok: false,
      reason:
        "contains <script>, <foreignObject>, <iframe>, <embed>, or <object> — these enable script execution or arbitrary HTML injection when the SVG is rendered inline."
    };
  }
  if (EVENT_HANDLER.test(svg)) {
    return {
      ok: false,
      reason:
        'contains an "on*=" event-handler attribute (onclick, onload, onmouseover, …) — these run JavaScript when the SVG is rendered inline.'
    };
  }
  if (JS_URI.test(svg)) {
    return {
      ok: false,
      reason:
        'contains a "javascript:" URI in a href / src / animation attribute — this executes script when the SVG is navigated or animated.'
    };
  }
  if (EXTERNAL_REF.test(svg)) {
    return {
      ok: false,
      reason:
        "references an external resource over http/https/file/ftp — pulls uncontrolled content at render time (SSRF + tracking + XSS risk)."
    };
  }
  if (DATA_URI_SCRIPT.test(svg)) {
    return {
      ok: false,
      reason: "contains a data: URI whose media type mentions script/javascript."
    };
  }
  if (CSS_AT_IMPORT.test(svg)) {
    return {
      ok: false,
      reason: "contains CSS @import referencing an external stylesheet."
    };
  }
  return { ok: true };
}

export function assertSafeSvg(svg: string): void {
  const r = checkSvgSafety(svg);
  if (!r.ok) throw new SvgRejectedError(r.reason!);
}
