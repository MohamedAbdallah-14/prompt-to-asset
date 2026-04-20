import { describe, it, expect } from "vitest";
import { redact, redactError } from "./redact.js";

describe("redact", () => {
  it("replaces OpenAI-style keys", () => {
    const s = "error body contains sk-ABC123abcdefghijklmnopqrstuvwxyz0123";
    expect(redact(s)).not.toContain("sk-ABC123");
    expect(redact(s)).toContain("***REDACTED***");
  });

  it("replaces Google AI Studio keys", () => {
    const s = "AIzaSyDUMMY_KEY_abcdefghijklmnopqrstuvwxyz12";
    expect(redact(s)).not.toMatch(/AIza[0-9A-Za-z]{30,}/);
  });

  it("replaces Bearer tokens", () => {
    const s = `{"error":"unauthorized","auth":"Bearer abcdefghijklmnopqrstuv"}`;
    expect(redact(s)).toContain("Bearer ***REDACTED***");
    expect(redact(s)).not.toContain("abcdefghijkl");
  });

  it("replaces ?key= / ?api_key= in query strings while keeping shape", () => {
    const s = "GET https://api.example/endpoint?key=VERY_SECRET_VALUE&x=1";
    const r = redact(s);
    expect(r).toContain("?key=***REDACTED***");
    expect(r).toContain("x=1");
    expect(r).not.toContain("VERY_SECRET_VALUE");
  });

  it("is a no-op on already-redacted or key-free text", () => {
    const s = "hello world, all fine here";
    expect(redact(s)).toBe(s);
  });

  it("redactError preserves message/name/code while scrubbing secrets", () => {
    const err: Error & { code?: string } = new Error(
      "HTTP 401 while calling https://api/?key=sk-abcdefghijklmnopqrst"
    );
    err.code = "PROVIDER_AUTH_FAILED";
    const out = redactError(err) as Error & { code?: string };
    expect(out.message).toContain("***REDACTED***");
    expect(out.message).not.toContain("sk-abc");
    expect(out.code).toBe("PROVIDER_AUTH_FAILED");
  });
});
