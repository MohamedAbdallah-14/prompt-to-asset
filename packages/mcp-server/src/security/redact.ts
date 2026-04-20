import { CONFIG } from "../config.js";

/**
 * Redact API keys and common bearer/query secrets from strings before they
 * end up in error messages, logs, or MCP tool responses.
 *
 * The main risk we're defending against: provider error bodies that echo the
 * request URL or headers (Google's API used to embed ?key= in the URL; the
 * response body would then contain the full URL). Even after we moved to a
 * header auth, any stack trace or debug log that touches the original URL
 * should still pass through this filter.
 */

const RAW_SECRET_PATTERNS: RegExp[] = [
  // Bearer tokens — keep "Bearer " so the shape of the message stays readable.
  /(Bearer\s+)[A-Za-z0-9._\-~+/]{12,}=*/g,
  // Anthropic (match before the bare sk- rule so the prefix isn't lost).
  /sk-ant-[A-Za-z0-9\-_]{20,}/g,
  // OpenAI-style keys
  /sk-[A-Za-z0-9]{20,}/g,
  // Google AI Studio keys
  /AIza[0-9A-Za-z\-_]{30,}/g,
  // Replicate / HF tokens
  /r8_[A-Za-z0-9]{20,}/g,
  /hf_[A-Za-z0-9]{20,}/g,
  // Common query-string secrets — keep the `key=` prefix.
  /([?&](?:api[_-]?key|key|access_token|token)=)[^&\s"']+/gi
];

function configuredKeys(): string[] {
  const vals: string[] = [];
  const bag = CONFIG.apiKeys as Record<string, string | undefined>;
  for (const v of Object.values(bag)) {
    if (typeof v === "string" && v.length >= 12) vals.push(v);
  }
  return vals;
}

export function redact(text: string): string {
  if (!text) return text;
  let out = text;
  // First: any actually-configured key gets a literal replace. This catches
  // bespoke formats we don't pattern-match below.
  for (const key of configuredKeys()) {
    while (out.includes(key)) out = out.replace(key, "***REDACTED***");
  }
  // Then: pattern-match anything that *looks* like a secret even if we don't
  // have it in CONFIG (e.g. the caller's own key leaked through a provider
  // error body).
  for (const pat of RAW_SECRET_PATTERNS) {
    out = out.replace(pat, (m, prefix) => {
      // If the pattern captured a `key=` prefix, keep it so the shape of the
      // message stays readable.
      if (typeof prefix === "string" && prefix.length > 0) return `${prefix}***REDACTED***`;
      return "***REDACTED***";
    });
  }
  return out;
}

export function redactError(err: unknown): Error {
  if (err instanceof Error) {
    const redacted = new Error(redact(err.message));
    redacted.name = err.name;
    if (err.stack) redacted.stack = redact(err.stack);
    // Preserve any well-known error code fields
    const src = err as { code?: string };
    if (src.code) (redacted as Error & { code?: string }).code = src.code;
    return redacted;
  }
  return new Error(redact(String(err)));
}
